#!/usr/bin/env node

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
const store = createDefaultStore({ filePath: path.resolve(args['state-file'] || 'data/queue-state.json') });

if (args.command !== 'run') {
  process.stderr.write('Only run command is supported in b1-live script.\n');
  process.exit(1);
}

const input = {
  requestId: args['request-id'] || `live-${Date.now()}`,
  person: {
    fullName: args['full-name'] || 'Ada Example',
    emails: args.email ? [args.email] : ['ada@example.test'],
    phones: args.phone ? [args.phone] : ['+15550101010'],
    jurisdiction: args.jurisdiction || 'US'
  },
  simulate: args.simulate ? { spokeo: args.simulate } : undefined,
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
