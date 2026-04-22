#!/usr/bin/env node

// Verify follow-up queue: check if past opt-out actions held.
//
// Dispatches by follow-up kind:
//   broker         → HTTP liveness check on profile URL (automated)
//   ai-platform    → print reminder walkthrough + ask user to confirm
//                     the training toggle is still OFF (manual)
//   face-service   → print reminder to re-search your face (manual)
//   ai-history-*   → one-shot; skipped with a note
//   takedown-*     → one-shot; skipped (takedown generates letters, not
//                     re-verifiable queue entries)
//
// Usage:
//   vanish verify                        (check entries past recheckAt)
//   vanish verify --all                  (check every followUp entry)
//   vanish verify --broker spokeo,...    (filter to specific brokers)
//   vanish verify --kind ai-platform     (filter to one kind)
//   vanish verify --no-fetch             (dry-run — no HTTP/IO)
//   vanish verify --assume clean         (in --no-fetch mode, treat manual
//                                          kinds as confirmed-clean; for scripting)

import path from 'node:path';
import readline from 'node:readline/promises';
import { stdin, stdout } from 'node:process';
import { createRequire } from 'node:module';
import { createDefaultStore } from '../src/queue/state-store.mjs';
import { signAuditEvents } from '../src/audit/signature.mjs';
import { verifyEntries as verifyBrokerEntries } from '../src/verifier/url-liveness.mjs';
import {
  kindOf,
  isVerifiable,
  labelFor,
  buildAiPlatformReminder,
  buildFaceServiceReminder,
  statusFromManualConfirm
} from '../src/verifier/followup-kinds.mjs';

const require = createRequire(import.meta.url);

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    const token = argv[i];
    if (!token.startsWith('--')) continue;
    const key = token.slice(2);
    const next = argv[i + 1];
    if (!next || next.startsWith('--')) { out[key] = true; }
    else { out[key] = next; i++; }
  }
  return out;
}

function writeAsync(stream, text) {
  return new Promise((resolve, reject) => {
    stream.write(text, (err) => (err ? reject(err) : resolve()));
  });
}

function filterEntries(entries, args) {
  const now = Date.now();
  const all = Boolean(args.all);
  const brokerFilter = args.broker
    ? new Set(args.broker.split(',').map(b => b.trim()).filter(Boolean))
    : null;
  const kindFilter = args.kind
    ? new Set(String(args.kind).split(',').map(k => k.trim()).filter(Boolean))
    : null;

  return entries.filter(e => {
    if (!isVerifiable(e)) return false;
    if (brokerFilter && e.kind !== 'ai-platform' && e.kind !== 'face-service') {
      if (!brokerFilter.has(e.broker)) return false;
    }
    if (kindFilter) {
      if (!kindFilter.has(kindOf(e))) return false;
    }
    if (all) return true;
    if (!e.recheckAt) return false;
    return new Date(e.recheckAt).getTime() <= now;
  });
}

// ─── Manual-kind handlers (ai-platform, face-service) ──────────

async function runManualVerify(entry, opts) {
  const kind = kindOf(entry);
  let reminder;
  if (kind === 'ai-platform') {
    reminder = buildAiPlatformReminder(entry, opts.aiCatalog);
  } else if (kind === 'face-service') {
    reminder = buildFaceServiceReminder(entry, opts.faceCatalog);
  } else {
    return { kind, confirmation: 'pending', reason: 'unknown-kind' };
  }

  await writeAsync(process.stdout, `\n━━━ ${reminder.displayName} (${kind}) ━━━\n`);
  await writeAsync(process.stdout, `Submitted: ${entry.submittedAt?.slice(0, 10) || 'unknown'} · recheck: ${entry.recheckAt?.slice(0, 10) || 'none'}\n`);

  if (reminder.url) {
    await writeAsync(process.stdout, `URL to check: ${reminder.url}\n`);
  }
  if (reminder.targetSetting) {
    await writeAsync(process.stdout, `🎯 Setting to verify: ${JSON.stringify(reminder.targetSetting)}\n`);
  }
  if (reminder.verification) {
    await writeAsync(process.stdout, `✓ Success looks like: ${reminder.verification}\n`);
  }

  await writeAsync(process.stdout, `\nReminder steps:\n`);
  for (let i = 0; i < reminder.steps.length; i++) {
    await writeAsync(process.stdout, `  ${i + 1}. ${reminder.steps[i]}\n`);
  }

  // Resolve confirmation
  if (opts.noFetch) {
    const pre = opts.assume;
    if (pre === 'clean') return { kind, confirmation: 'clean' };
    if (pre === 'still') return { kind, confirmation: 'still' };
    return { kind, confirmation: 'pending', reason: 'no-fetch-no-assume' };
  }

  if (!opts.prompt) return { kind, confirmation: 'pending', reason: 'non-interactive' };

  const answer = await opts.prompt(
    `\nStatus? [c = confirmed still opted-out · s = still present · p = check later]: `
  );
  const first = answer.trim().toLowerCase()[0];
  if (first === 'c') return { kind, confirmation: 'clean' };
  if (first === 's') return { kind, confirmation: 'still' };
  return { kind, confirmation: 'pending' };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (args.help) {
    await writeAsync(process.stdout, `
Verify that past opt-out actions still hold.

Dispatches by follow-up kind:
  broker         → HTTP liveness check on profile URL (automated)
  ai-platform    → print reminder + ask you to confirm toggle still OFF
                    (AI platforms have no public "state" endpoint)
  face-service   → print reminder to re-search your face on the service
                    (no way to automate — you must re-upload)
  ai-history-*   → one-shot deletions (skipped, no re-verify needed)
  takedown-*     → drafted letters (skipped; they're evidence, not queue work)

Usage:
  vanish verify [options]

Filtering:
  --all                    Check every entry (ignore recheckAt schedule)
  --broker <names>         Comma-separated broker filter (broker kind only)
  --kind <kinds>           Comma-separated kind filter:
                             broker | ai-platform | face-service

Automation:
  --no-fetch               Don't make HTTP calls; don't prompt
  --assume clean|still     With --no-fetch: assume the given status for
                             manual kinds (useful in CI/scripts)
  --delay-ms <n>           Delay between HTTP checks (default: 1500)
  --state-file <path>      Queue state file (default: data/queue-state.json)
  --help                   This message

Broker kind result codes:
  ✅ verified-removed      URL returns 404/410, or redirected to domain root
  ❌ still-present         URL returns 200 with same path
  ❓ unknown               timeout, captcha, 403/429 rate-limit, or 5xx

AI-platform / face-service result codes:
  ✅ confirmed-clean       You checked and the opt-out still holds
  ❌ still-present         You checked and the data/training is back on
  ⏳ pending-reverification You skipped — will re-ask next time
`);
    process.exit(0);
  }

  const store = createDefaultStore({
    filePath: path.resolve(args['state-file'] || 'data/queue-state.json')
  });

  const state = store.read();
  const followUp = state.followUp || [];

  if (followUp.length === 0) {
    await writeAsync(process.stdout, '\nNo follow-up entries to verify. Run `vanish opt-out ...` / `ai-opt-out` / `face-opt-out` first.\n');
    process.exit(0);
  }

  const toCheck = filterEntries(followUp, args);

  if (toCheck.length === 0) {
    await writeAsync(process.stdout, `\n${followUp.length} follow-up entries exist, but none match the filter + schedule.\n`);
    await writeAsync(process.stdout, 'Use --all to check everything regardless of schedule, or --kind to widen filter.\n');
    const nextDue = followUp
      .filter(e => e.recheckAt && isVerifiable(e))
      .sort((a, b) => new Date(a.recheckAt) - new Date(b.recheckAt))[0];
    if (nextDue) {
      await writeAsync(process.stdout, `Next scheduled: ${labelFor(nextDue)} (${kindOf(nextDue)}) at ${nextDue.recheckAt.slice(0, 10)}\n`);
    }
    process.exit(0);
  }

  // Separate automated (broker) from manual (ai/face) for parallel dispatch
  const brokers = toCheck.filter(e => kindOf(e) === 'broker');
  const manual = toCheck.filter(e => kindOf(e) !== 'broker');

  await writeAsync(process.stdout,
    `\nVerifying ${toCheck.length} follow-up entr${toCheck.length === 1 ? 'y' : 'ies'}:\n`
    + `  - ${brokers.length} broker(s) via HTTP liveness\n`
    + `  - ${manual.length} AI-platform/face-service via manual confirmation\n\n`
  );

  const noFetch = Boolean(args['no-fetch']);
  const assume = args.assume; // 'clean' | 'still' | undefined
  const rl = noFetch ? null : readline.createInterface({ input: stdin, output: stdout });
  const prompt = rl ? async (q) => (await rl.question(q)) : null;

  // Lazy-load catalogs only if we have manual entries that need them
  const opts = { noFetch, assume, prompt };
  if (manual.some(e => kindOf(e) === 'ai-platform')) {
    opts.aiCatalog = require('../src/ai-scanner/ai-platforms-catalog.json');
  }
  if (manual.some(e => kindOf(e) === 'face-service')) {
    opts.faceCatalog = require('../src/face-scanner/face-services-catalog.json');
  }

  const updated = [];
  const now = () => new Date().toISOString();

  try {
    // 1) Broker automated verify
    if (brokers.length > 0) {
      if (noFetch) {
        await writeAsync(process.stdout, 'Skipping broker HTTP checks (--no-fetch)\n');
        for (const e of brokers) {
          updated.push({ ...e, verifiedAt: now(), verificationResult: 'unknown', verificationReason: 'no-fetch' });
        }
      } else {
        const delayMs = Number(args['delay-ms']) || 1500;
        const brokerUpdated = await verifyBrokerEntries(brokers, {
          delayMs,
          onProgress: (entry, result) => {
            const icon = result.status === 'removed' ? '✅' : result.status === 'still-present' ? '❌' : '❓';
            const detail = result.httpStatus ? ` (HTTP ${result.httpStatus})` : '';
            const reason = result.reason ? ` — ${result.reason}` : '';
            process.stdout.write(`  ${icon} ${labelFor(entry).padEnd(22)} ${result.status}${detail}${reason}\n`);
          }
        });
        updated.push(...brokerUpdated);
      }
    }

    // 2) Manual (AI + face)
    for (const entry of manual) {
      const result = await runManualVerify(entry, opts);
      const status = statusFromManualConfirm(result.confirmation);
      const icon = result.confirmation === 'clean' ? '✅'
                 : result.confirmation === 'still' ? '❌'
                 : '⏳';
      await writeAsync(process.stdout, `\n  ${icon} ${labelFor(entry)} → ${status}\n`);
      updated.push({
        ...entry,
        verifiedAt: now(),
        verificationResult: status === 'verified-removed' ? 'removed'
                          : status === 'still-present' ? 'still-present'
                          : 'unknown',
        verificationReason: result.reason || `manual:${result.confirmation}`,
        status
      });
    }
  } finally {
    if (rl) rl.close();
  }

  // Merge updated entries back into full followUp list
  const updatedById = new Map(updated.map(e => [e.id, e]));
  const newFollowUp = followUp.map(e => updatedById.get(e.id) || e);

  const auditEvents = updated.map(e => ({
    at: e.verifiedAt,
    event: 'verify_result',
    kind: kindOf(e),
    target: labelFor(e),
    followUpId: e.id,
    result: e.verificationResult,
    httpStatus: e.verificationHttpStatus || null,
    reason: e.verificationReason
  }));

  await store.mutate(s => {
    s.followUp = newFollowUp;
    s.audit = signAuditEvents([...(s.audit || []), ...auditEvents]);
    return s;
  });

  // Summary
  const removed = updated.filter(e => e.verificationResult === 'removed');
  const stillPresent = updated.filter(e => e.verificationResult === 'still-present');
  const unknown = updated.filter(e => e.verificationResult === 'unknown');

  await writeAsync(process.stdout, '\n━━━ Verify Summary ━━━\n');
  await writeAsync(process.stdout, `Total checked: ${updated.length}\n`);
  await writeAsync(process.stdout, `✅ Removed/clean: ${removed.length}${removed.length > 0 ? ` (${removed.map(labelFor).join(', ')})` : ''}\n`);
  await writeAsync(process.stdout, `❌ Still present: ${stillPresent.length}${stillPresent.length > 0 ? ` (${stillPresent.map(labelFor).join(', ')})` : ''}\n`);
  await writeAsync(process.stdout, `❓ Unknown/pending: ${unknown.length}\n`);

  if (stillPresent.length > 0) {
    const brokerStill = stillPresent.filter(e => kindOf(e) === 'broker');
    const aiStill = stillPresent.filter(e => kindOf(e) === 'ai-platform');
    const faceStill = stillPresent.filter(e => kindOf(e) === 'face-service');
    await writeAsync(process.stdout, '\n💡 Suggested follow-up:\n');
    if (brokerStill.length > 0) {
      await writeAsync(process.stdout, `   vanish opt-out --broker ${brokerStill.map(e => e.broker).join(',')} --email ...\n`);
    }
    if (aiStill.length > 0) {
      await writeAsync(process.stdout, `   vanish ai-opt-out --${aiStill.map(e => e.platform).join(' --')}\n`);
    }
    if (faceStill.length > 0) {
      await writeAsync(process.stdout, `   vanish face-opt-out --${faceStill.map(e => e.service).join(' --')}\n`);
    }
  }

  process.exit(0);
}

main().catch(err => {
  process.stderr.write(`\nError: ${err.message}\n`, () => process.exit(1));
});
