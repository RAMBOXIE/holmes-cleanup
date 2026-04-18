#!/usr/bin/env node

// Verify follow-up queue: check if opted-out profiles are actually gone.
//
// Usage:
//   holmes-cleanup verify                       (check entries past recheckAt)
//   holmes-cleanup verify --all                 (check every followUp entry)
//   holmes-cleanup verify --broker spokeo,...   (check only specific brokers)
//   holmes-cleanup verify --no-fetch            (dry-run — no HTTP, just list)
//   holmes-cleanup verify --state-file <path>

import fs from 'node:fs';
import path from 'node:path';
import { createDefaultStore } from '../src/queue/state-store.mjs';
import { signAuditEvents } from '../src/audit/signature.mjs';
import { verifyEntries, checkLiveness } from '../src/verifier/url-liveness.mjs';

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

function filterEntries(entries, args) {
  const now = Date.now();
  const all = Boolean(args.all);
  const brokerFilter = args.broker
    ? new Set(args.broker.split(',').map(b => b.trim()).filter(Boolean))
    : null;

  return entries.filter(e => {
    if (brokerFilter && !brokerFilter.has(e.broker)) return false;
    if (all) return true;
    if (!e.recheckAt) return false;
    return new Date(e.recheckAt).getTime() <= now;
  });
}

function formatTable(entries) {
  if (entries.length === 0) return '(no entries)';
  const icon = { 'verified-removed': '✅', 'still-present': '❌', 'pending-verification': '⏳' };
  const lines = [];
  for (const e of entries) {
    const mark = icon[e.status] || '❓';
    const age = e.submittedAt ? Math.floor((Date.now() - new Date(e.submittedAt).getTime()) / 86400000) : '?';
    const reason = e.verificationReason ? ` (${e.verificationReason})` : '';
    lines.push(`  ${mark} ${e.broker.padEnd(22)} submitted ${age}d ago${reason}`);
  }
  return lines.join('\n');
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (args.help) {
    process.stdout.write(`
Verify that opt-out submissions actually worked.

Usage:
  holmes-cleanup verify [options]

Options:
  --all                    Check every followUp entry (ignore recheckAt)
  --broker <name,...>      Limit to specific broker(s)
  --no-fetch               Don't make HTTP requests — just list pending entries
  --state-file <path>      Queue state file (default: data/queue-state.json)
  --delay-ms <n>           Delay between HTTP checks (default: 1500)
  --help                   This message

Result status:
  ✅ verified-removed      — URL returns 404/410, or redirected to domain root
  ❌ still-present         — URL returns 200 with same path
  ❓ unknown               — timeout, captcha, 403/429 rate-limit, or 5xx
`);
    process.exit(0);
  }

  const store = createDefaultStore({
    filePath: path.resolve(args['state-file'] || 'data/queue-state.json')
  });

  const state = store.read();
  const followUp = state.followUp || [];

  if (followUp.length === 0) {
    process.stdout.write('\nNo follow-up entries to verify. Run `holmes-cleanup opt-out ...` first.\n');
    process.exit(0);
  }

  const toCheck = filterEntries(followUp, args);

  if (toCheck.length === 0) {
    process.stdout.write(`\n${followUp.length} follow-up entries exist, but none are due for verification yet.\n`);
    process.stdout.write('Use --all to check everything regardless of schedule.\n');
    const nextDue = followUp
      .filter(e => e.recheckAt)
      .sort((a, b) => new Date(a.recheckAt) - new Date(b.recheckAt))[0];
    if (nextDue) {
      process.stdout.write(`Next scheduled verification: ${nextDue.broker} at ${nextDue.recheckAt.slice(0, 10)}\n`);
    }
    process.exit(0);
  }

  process.stdout.write(`\nVerifying ${toCheck.length} follow-up entr${toCheck.length === 1 ? 'y' : 'ies'}...\n`);
  if (args['no-fetch']) {
    process.stdout.write('Mode: --no-fetch (not making HTTP requests)\n\n');
    process.stdout.write(formatTable(toCheck) + '\n');
    process.exit(0);
  }

  const delayMs = Number(args['delay-ms']) || 1500;
  const updated = await verifyEntries(toCheck, {
    delayMs,
    onProgress: (entry, result) => {
      const icon = result.status === 'removed' ? '✅'
                 : result.status === 'still-present' ? '❌'
                 : '❓';
      const detail = result.httpStatus ? ` (HTTP ${result.httpStatus})` : '';
      process.stdout.write(`  ${icon} ${entry.broker.padEnd(22)} ${result.status}${detail}\n`);
    }
  });

  // Merge updated entries back into full followUp list
  const updatedById = new Map(updated.map(e => [e.id, e]));
  const newFollowUp = followUp.map(e => updatedById.get(e.id) || e);

  // Persist and audit
  const auditEvents = updated.map(e => ({
    at: e.verifiedAt,
    event: 'verify_result',
    broker: e.broker,
    followUpId: e.id,
    result: e.verificationResult,
    httpStatus: e.verificationHttpStatus,
    reason: e.verificationReason
  }));

  await store.mutate(s => {
    s.followUp = newFollowUp;
    s.audit = signAuditEvents([...(s.audit || []), ...auditEvents]);
    return s;
  });

  // Summary
  const byStatus = updated.reduce((acc, e) => {
    acc[e.verificationResult] = (acc[e.verificationResult] || 0) + 1;
    return acc;
  }, {});
  const removed = updated.filter(e => e.verificationResult === 'removed');
  const stillPresent = updated.filter(e => e.verificationResult === 'still-present');
  const unknown = updated.filter(e => e.verificationResult === 'unknown');

  process.stdout.write('\n━━━ Verify Summary ━━━\n');
  process.stdout.write(`Total checked: ${updated.length}\n`);
  process.stdout.write(`✅ Removed: ${removed.length}${removed.length > 0 ? ` (${removed.map(e => e.broker).join(', ')})` : ''}\n`);
  process.stdout.write(`❌ Still present: ${stillPresent.length}${stillPresent.length > 0 ? ` (${stillPresent.map(e => e.broker).join(', ')})` : ''}\n`);
  process.stdout.write(`❓ Unknown: ${unknown.length}${unknown.length > 0 ? ` (${unknown.map(e => `${e.broker}: ${e.verificationReason}`).join(', ')})` : ''}\n`);

  if (stillPresent.length > 0) {
    process.stdout.write(`\n💡 Next: re-submit opt-out for still-present brokers:\n`);
    process.stdout.write(`   holmes-cleanup opt-out --broker ${stillPresent.map(e => e.broker).join(',')} --email ...\n`);
  }
  if (unknown.length > 0) {
    process.stdout.write(`\n💡 Unknown entries can be re-checked later (broker may have been rate-limiting or showing captcha).\n`);
  }

  process.exit(0);
}

main().catch(err => {
  process.stderr.write(`\nError: ${err.message}\n`);
  process.exit(1);
});
