#!/usr/bin/env node

// ━━━ EXPERIMENTAL — DO NOT USE FOR REAL SUBMISSIONS ━━━
//
// This command exercises the live HTTP submission adapter for 8 brokers
// (spokeo, thatsthem, peekyou, addresses, cocofinder, checkpeople,
// familytreenow, usphonebook). By default it submits against a test
// endpoint (postman-echo.com / configurable via --live-endpoint).
//
// Why this is experimental:
//   - Most brokers serve reCAPTCHA v2 / hCaptcha on the real opt-out form.
//     Vanish does NOT integrate captcha-solving services. Live submission
//     will fail the captcha step on production endpoints.
//   - Broker sites blacklist IPs that auto-submit. Running b1-live against
//     real sites at scale may get your IP banned + your account flagged.
//   - Success rate without captcha/proxy integration is ~0% on production.
//
// For real-world opt-out, use the documented + tested path instead:
//     vanish opt-out --broker <name> --email <email> ...
//
// b1-live exists primarily for:
//   1. Regression testing the HTTP/queue/adapter infrastructure against
//      the postman-echo closed-loop endpoint (CI runs this).
//   2. Exploration when someone integrates a captcha-solver for personal use.

import fs from 'node:fs';
import path from 'node:path';
import { runB1Pipeline } from '../src/orchestrator/b1-runner.mjs';
import { createDefaultStore } from '../src/queue/state-store.mjs';

function parseArgs(argv) {
  const out = { command: 'run' };
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token.startsWith('--')) {
      out.command = token;
      continue;
    }
    const key = token.slice(2);
    const next = argv[i + 1];
    if (!next || next.startsWith('--')) out[key] = true;
    else {
      out[key] = next;
      i += 1;
    }
  }
  return out;
}

const args = parseArgs(process.argv.slice(2));

if (args.help) {
  process.stdout.write(`
vanish b1-live — ⚠️  EXPERIMENTAL live HTTP submission (NOT for real use).

This command is infrastructure-testing only. Captchas, IP bans, and broker
ToS make it unsuitable for real opt-out submissions. Use \`vanish opt-out\`
for real-world opt-outs — it opens the browser and guides you through
captcha + email verification manually (the only reliable path).

Supported brokers (infrastructure test): spokeo, thatsthem, peekyou,
addresses, cocofinder, checkpeople, familytreenow, usphonebook (8 total)

Usage:
  vanish b1-live run --live --brokers spokeo,peekyou \\
    --full-name "Test User" --email "test@example.com" \\
    --live-endpoint "https://postman-echo.com/post"

Flags:
  --live                 Enable live mode (required; dry-run is the default)
  --brokers <csv>        Comma-separated broker list (default: all 8)
  --live-endpoint <url>  Override submission URL (default: postman-echo test)
  --simulate <mode>      Simulate a failure mode for testing
  --full-name "..."      Full name
  --email "..."          Email
  --phone "+..."         Phone
  --jurisdiction <cc>    Jurisdiction code (default: US)
  --state-file <path>    Queue state file
  --help                 This message

Recommended path for real opt-outs:
  vanish opt-out --broker spokeo --email you@example.com --full-name "..."
`);
  process.exit(0);
}

const store = createDefaultStore({ filePath: path.resolve(args['state-file'] || 'data/queue-state.json') });

if (args.command !== 'run') {
  process.stderr.write('Only run command is supported in b1-live script.\n');
  process.exit(1);
}

// Print a one-line experimental warning when actually running
if (args.live) {
  process.stderr.write('⚠️  b1-live is EXPERIMENTAL — captchas will block real submissions. Use `vanish opt-out` for real opt-out.\n\n');
}

const input = {
  requestId: args['request-id'] || `live-${Date.now()}`,
  person: {
    fullName: args['full-name'] || 'Ada Example',
    emails: args.email ? [args.email] : ['ada@example.test'],
    phones: args.phone ? [args.phone] : ['+15550101010'],
    jurisdiction: args.jurisdiction || 'US'
  },
  // Apply simulate to all requested brokers (not just spokeo). If no --brokers
  // is given (full 200-broker run), restrict to spokeo to avoid mass failures.
  simulate: args.simulate
    ? Object.fromEntries(
        (args.brokers?.split(',').map(b => b.trim()).filter(Boolean) || ['spokeo'])
          .map(b => [b, args.simulate])
      )
    : undefined,
  authToken: args['auth-token'],
  authCookie: args['auth-cookie'],
  authScopes: args['auth-scopes'],
  authExpiresAt: args['auth-expires-at'],
  authFile: args['auth-file'],
  liveEndpoint: args['live-endpoint']
};

const live = Boolean(args.live);
const brokers = args.brokers
  ? args.brokers.split(',').map(b => b.trim()).filter(Boolean)
  : undefined;
const result = await runB1Pipeline({ brokers, input, store, live });

if (args['output-json']) {
  const outPath = path.resolve(args['output-json']);
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(result, null, 2));
}

process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
process.exit(result.status === 'blocked' ? 1 : 0);
