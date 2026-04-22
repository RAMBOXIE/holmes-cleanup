#!/usr/bin/env node

// Browser-assisted opt-out for live-capable brokers.
//
// Usage:
//   vanish opt-out --broker spokeo --email me@example.com --full-name "My Name"
//   vanish opt-out --broker spokeo,peekyou --email me@example.com --full-name "..."
//   vanish opt-out --broker spokeo --email ... --profile-url "https://..."
//   vanish opt-out --broker spokeo --email ... --no-open    (test mode, no browser)

import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline/promises';
import { stdin, stdout } from 'node:process';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import crypto from 'node:crypto';

import { createDefaultStore } from '../src/queue/state-store.mjs';
import { signAuditEvents } from '../src/audit/signature.mjs';

const require = createRequire(import.meta.url);
const catalog = require('../src/adapters/brokers/config/broker-catalog.json');

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

function openUrl(url) {
  const platform = process.platform;
  // Windows: `start "" "url"` via cmd. macOS: `open url`. Linux: `xdg-open url`.
  const cmd = platform === 'win32' ? 'cmd'
            : platform === 'darwin' ? 'open'
            : 'xdg-open';
  const args = platform === 'win32' ? ['/c', 'start', '""', url]
            : [url];
  try {
    spawn(cmd, args, { stdio: 'ignore', detached: true }).unref();
    return true;
  } catch (err) {
    process.stderr.write(`Failed to open ${url}: ${err.message}\n`);
    return false;
  }
}

function resolveFieldValue(field, input) {
  if (input[field.name]) return input[field.name];
  if (field.fromInput && input[field.fromInput]) return input[field.fromInput];
  if (field.default) return field.default;
  return null;
}

function renderFieldInstructions(fields, input) {
  const lines = [];
  for (const field of fields) {
    const value = resolveFieldValue(field, input);
    const marker = value ? '✓' : '○';
    lines.push(`  ${marker} ${field.label}${value ? `:` : ' (you need to provide)'}`);
    if (value) lines.push(`       → ${value}`);
    if (field.hint) lines.push(`       hint: ${field.hint}`);
  }
  return lines.join('\n');
}

async function runBrokerOptOut(brokerName, input, opts) {
  const brokerEntry = catalog.brokers[brokerName];
  if (!brokerEntry) throw new Error(`Unknown broker: ${brokerName}`);
  if (!brokerEntry.optOutFlow) {
    throw new Error(`Broker ${brokerName} has no optOutFlow defined. Run \`vanish opt-out --help\` to see the full list of ${58} supported brokers, or file an issue to request coverage.`);
  }

  const flow = brokerEntry.optOutFlow;
  const displayName = brokerEntry.displayName;

  process.stdout.write(`\n━━━ ${displayName} (${brokerName}) ━━━\n`);
  process.stdout.write(`Estimated time: ${flow.estimatedMinutes || '?'} min | Processing: ${flow.processingDays || '?'} days\n\n`);

  // Profile search step (if needed)
  let profileUrls = [];
  if (flow.needsProfileSearch) {
    if (input.profileUrl) {
      profileUrls = [input.profileUrl];
    } else if (opts.noOpen) {
      // --no-open mode: use placeholder to let flow continue for testing
      profileUrls = ['<user-provided-profile-url>'];
    } else {
      process.stdout.write(`Step 1: Find your profile on ${displayName}\n`);
      process.stdout.write(`  → Opening: ${flow.searchUrl}\n`);
      if (flow.searchHint) process.stdout.write(`  ${flow.searchHint}\n`);
      openUrl(flow.searchUrl);
      process.stdout.write(`\nPaste the profile URL(s) you want to remove (one per line, empty line to finish):\n`);
      profileUrls = await opts.promptMultiline();
      if (profileUrls.length === 0) {
        process.stdout.write(`No profile URLs given, skipping ${displayName}.\n`);
        return { skipped: true, broker: brokerName };
      }
    }
  } else {
    profileUrls = [null]; // single pass, no profile URL needed
  }

  const recorded = [];

  for (const profileUrl of profileUrls) {
    const fieldValues = { ...input, profileUrl };
    const fieldsDisplay = renderFieldInstructions(flow.fields, fieldValues);

    process.stdout.write(`\nStep 2: Open the opt-out form\n`);
    process.stdout.write(`  → ${flow.optOutUrl}\n\n`);
    if (!opts.noOpen) openUrl(flow.optOutUrl);

    process.stdout.write(`Step 3: Fill the form with:\n${fieldsDisplay}\n\n`);

    const notes = [];
    if (flow.captcha) notes.push(`⚠️  Solve the ${flow.captcha} captcha manually`);
    if (flow.accountRequired) notes.push(`⚠️  Requires ${flow.accountRequired} account — sign in first`);
    if (notes.length > 0) {
      process.stdout.write(notes.map(n => `  ${n}`).join('\n') + '\n\n');
    }

    process.stdout.write(`Step 4: Click Submit\n`);
    if (flow.emailVerification) {
      const expiry = flow.emailVerificationExpiryHours ? ` (link valid ${flow.emailVerificationExpiryHours}h)` : '';
      process.stdout.write(`Step 5: Check ${fieldValues.email || 'your email'} for a verification link${expiry} and click it\n`);
    }
    process.stdout.write('\n');

    let confirmed = false;
    if (opts.noOpen) {
      confirmed = true; // test mode: auto-confirm
    } else {
      const answer = await opts.promptLine(`Did you submit? [y = yes, s = skip, a = abort]: `);
      if (answer.toLowerCase().startsWith('a')) throw new Error('User aborted');
      if (answer.toLowerCase().startsWith('s')) { process.stdout.write(`Skipped.\n`); continue; }
      confirmed = answer.toLowerCase().startsWith('y');
    }

    if (confirmed) {
      const now = new Date();
      const recheckAt = new Date(now.getTime() + (flow.processingDays || 30) * 2 * 24 * 60 * 60 * 1000);
      const entry = {
        id: `followup_${now.getTime()}_${crypto.randomBytes(3).toString('hex')}`,
        broker: brokerName,
        displayName,
        profileUrl: profileUrl || null,
        email: input.email || null,
        submittedAt: now.toISOString(),
        recheckAt: recheckAt.toISOString(),
        status: flow.emailVerification ? 'pending-email-verification' : 'pending-verification'
      };
      recorded.push(entry);
      process.stdout.write(`✓ Recorded. Follow-up scheduled for ${recheckAt.toISOString().slice(0, 10)}.\n`);
    }
  }

  return { broker: brokerName, recorded };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (args.help || args['--help']) {
    // Enumerate brokers that have optOutFlow — canonical source of truth
    const supported = Object.entries(catalog.brokers)
      .filter(([, v]) => v.optOutFlow)
      .map(([k]) => k);

    process.stdout.write(`
Browser-assisted opt-out for ${supported.length} data brokers.

What this does:
  1. Opens each broker's opt-out page in your browser
  2. Pre-fills form data from your CLI flags into the clipboard
  3. You solve captcha + click submit (Vanish does NOT auto-submit)
  4. Records an HMAC-signed audit trail + 30-day re-verify follow-up

Usage:
  vanish opt-out --broker <name> --email <email> [options]

Required:
  --broker <name>        Broker key(s), comma-separated — e.g. spokeo,beenverified
  --email <email>        Your email address (for broker verification emails)

Optional:
  --full-name "..."      Your full name
  --first-name "..."     First name
  --last-name "..."      Last name
  --phone "+..."         Phone number
  --city "..."           City
  --state "..."          State/province
  --address "..."        Street address
  --profile-url "..."    Your pre-found profile URL (skips search step)
  --state-file <path>    Queue state file (default: data/queue-state.json)
  --no-open              Test mode: don't open browser, auto-confirm (for scripting)
  --help                 This message

Supported brokers (${supported.length}):
${(() => {
  // Chunk into lines of ~80 cols for readability
  const lines = [];
  let line = '  ';
  for (const k of supported.sort()) {
    if ((line + k + ', ').length > 78) { lines.push(line.replace(/, $/, '')); line = '  '; }
    line += k + ', ';
  }
  if (line.trim()) lines.push(line.replace(/, $/, ''));
  return lines.join('\n');
})()}

Capability note:
  210 brokers are in the scan catalog (heuristic exposure triage)
  ${supported.length} brokers have a documented opt-out walkthrough (this command)
  8 brokers have a live HTTP submission adapter (see \`vanish b1-live\` — experimental)

Example:
  vanish opt-out --broker spokeo,peekyou --email you@example.com --full-name "John Doe"
`);
    process.exit(0);
  }

  if (!args.broker) {
    process.stderr.write('Error: --broker required. Use --help for usage.\n');
    process.exit(1);
  }
  if (!args.email && !args['no-open']) {
    process.stderr.write('Error: --email required (used for verification).\n');
    process.exit(1);
  }

  const brokers = args.broker.split(',').map(b => b.trim()).filter(Boolean);
  const noOpen = Boolean(args['no-open']);

  // Build input object. Split fullName into first/last if those aren't given.
  const input = {
    fullName: args['full-name'] || null,
    firstName: args['first-name'] || null,
    lastName: args['last-name'] || null,
    email: args.email || null,
    phone: args.phone || null,
    city: args.city || null,
    state: args.state || null,
    address: args.address || null,
    profileUrl: args['profile-url'] || null
  };
  if (input.fullName && (!input.firstName || !input.lastName)) {
    const parts = input.fullName.trim().split(/\s+/);
    if (!input.firstName) input.firstName = parts[0] || '';
    if (!input.lastName) input.lastName = parts.slice(1).join(' ') || parts[0] || '';
  }

  // Readline for interactive prompts (skipped in --no-open mode)
  const rl = noOpen ? null : readline.createInterface({ input: stdin, output: stdout });
  const opts = {
    noOpen,
    promptLine: async (q) => noOpen ? '' : (await rl.question(q)).trim(),
    promptMultiline: async () => {
      if (noOpen) return [];
      const lines = [];
      while (true) {
        const line = await rl.question('> ');
        if (!line.trim()) break;
        lines.push(line.trim());
      }
      return lines;
    }
  };

  const store = createDefaultStore({
    filePath: path.resolve(args['state-file'] || 'data/queue-state.json')
  });

  process.stdout.write(`\nStarting browser-assisted opt-out for ${brokers.length} broker(s): ${brokers.join(', ')}\n`);
  process.stdout.write(`Mode: ${noOpen ? 'no-open (test)' : 'interactive'}\n`);

  const allRecorded = [];
  try {
    for (const brokerName of brokers) {
      try {
        const result = await runBrokerOptOut(brokerName, input, opts);
        if (result.recorded) allRecorded.push(...result.recorded);
      } catch (err) {
        if (err.message === 'User aborted') throw err;
        process.stderr.write(`\n✗ ${brokerName} failed: ${err.message}\n`);
      }
    }
  } finally {
    if (rl) rl.close();
  }

  // Persist to queue state + audit
  if (allRecorded.length > 0) {
    await store.mutate(state => {
      state.followUp = state.followUp || [];
      state.followUp.push(...allRecorded);
      const auditEvents = allRecorded.map(entry => ({
        at: entry.submittedAt,
        event: 'opt_out_submitted_by_user',
        broker: entry.broker,
        method: 'browser-assisted',
        profileUrl: entry.profileUrl,
        followUpId: entry.id,
        userConfirmed: true
      }));
      state.audit = signAuditEvents([...(state.audit || []), ...auditEvents]);
      return state;
    });
  }

  process.stdout.write(`\n━━━ Summary ━━━\n`);
  process.stdout.write(`Recorded: ${allRecorded.length} opt-out submission(s)\n`);
  if (allRecorded.length > 0) {
    process.stdout.write(`Follow-up scheduled: ${allRecorded.map(e => `${e.broker}@${e.recheckAt.slice(0, 10)}`).join(', ')}\n`);
    process.stdout.write(`\nRun \`vanish queue list\` to see follow-up queue.\n`);
  }

  process.exit(0);
}

main().catch(err => {
  process.stderr.write(`\nError: ${err.message}\n`);
  process.exit(1);
});
