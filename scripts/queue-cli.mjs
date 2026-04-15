#!/usr/bin/env node

import path from 'node:path';
import { createDefaultStore } from '../src/queue/state-store.mjs';
import { resolveManualReview, retryFromQueue } from '../src/orchestrator/b1-runner.mjs';

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token.startsWith('--')) {
      if (!out.command) out.command = token;
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
const store = createDefaultStore({ filePath: path.resolve(args['state-file'] || 'data/queue-state.json') });

if (args.command === 'list') {
  process.stdout.write(`${JSON.stringify(store.read(), null, 2)}\n`);
  process.exit(0);
}

if (args.command === 'retry') {
  if (!args.id) {
    process.stderr.write('--id is required for retry\n');
    process.exit(1);
  }
  const result = await retryFromQueue({
    store,
    id: args.id,
    live: args.live !== 'false',
    authInput: {
      authToken: args['auth-token'],
      authCookie: args['auth-cookie'],
      authScopes: args['auth-scopes'],
      authExpiresAt: args['auth-expires-at']
    }
  });
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  process.exit(result.status === 'not_found' ? 1 : 0);
}

if (args.command === 'resolve') {
  if (!args.id) {
    process.stderr.write('--id is required for resolve\n');
    process.exit(1);
  }
  const result = await resolveManualReview({ store, id: args.id, resolution: args.resolution || 'resolved' });
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  process.exit(result.status === 'not_found' ? 1 : 0);
}

process.stderr.write('Usage: queue-cli.mjs list|retry|resolve [--id ...]\n');
process.exit(1);
