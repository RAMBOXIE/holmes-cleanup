import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

import { createDefaultStore } from '../src/queue/state-store.mjs';
import { AuthSession } from '../src/auth/session-auth.mjs';
import { runB1Pipeline } from '../src/orchestrator/b1-runner.mjs';

function tmpState(name) {
  const base = path.resolve('tmp-test');
  fs.mkdirSync(base, { recursive: true });
  return path.join(base, `${name}-${Date.now()}.json`);
}

test('persistent queue survives store reload', async () => {
  const statePath = tmpState('persist');
  const storeA = createDefaultStore({ filePath: statePath });

  await runB1Pipeline({
    brokers: ['spokeo'],
    input: { requestId: 'persist-1', simulate: { spokeo: 'transient-error' }, person: { fullName: 'Persist User' } },
    live: false,
    store: storeA
  });

  const storeB = createDefaultStore({ filePath: statePath });
  const state = storeB.read();
  assert.equal(state.retry.length, 1);
  assert.equal(state.retry[0].payload.requestId, 'persist-1');
});

test('auth TTL validation blocks expired credentials', () => {
  const auth = AuthSession.fromSources({
    input: {
      authToken: 't',
      authScopes: 'submit:spokeo',
      authExpiresAt: new Date(Date.now() + 15 * 1000).toISOString()
    }
  });

  const verdict = auth.validate({ requiredScopes: ['submit:spokeo'], minTtlSeconds: 60 });
  assert.equal(verdict.ok, false);
  assert.equal(verdict.reason, 'ttl_too_short');
});

test('retry escalation to manual review after threshold', async () => {
  const statePath = tmpState('escalate');
  const store = createDefaultStore({ filePath: statePath });

  await runB1Pipeline({
    brokers: ['spokeo'],
    input: { requestId: 'escalate-1', simulate: { spokeo: 'transient-error' }, person: { fullName: 'Escalate User' } },
    live: false,
    store
  });

  await runB1Pipeline({
    brokers: ['spokeo'],
    input: { requestId: 'escalate-1', simulate: { spokeo: 'transient-error' }, person: { fullName: 'Escalate User' } },
    live: false,
    store
  });

  await runB1Pipeline({
    brokers: ['spokeo'],
    input: { requestId: 'escalate-1', simulate: { spokeo: 'transient-error' }, person: { fullName: 'Escalate User' } },
    live: false,
    store
  });

  const state = store.read();
  assert.equal(state.manualReview.length, 1);
  assert.equal(state.manualReview[0].reason, 'retry_limit_reached');
});
