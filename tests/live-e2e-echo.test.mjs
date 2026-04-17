import test from 'node:test';
import assert from 'node:assert/strict';

import { thasthemAdapter } from '../src/adapters/brokers/thatsthem.mjs';
import { spokeoAdapter } from '../src/adapters/brokers/spokeo.mjs';
import { peekyouAdapter } from '../src/adapters/brokers/peekyou.mjs';

const sampleInput = {
  requestId: 'e2e-echo-1',
  person: { fullName: 'Echo Test User', emails: ['echo@example.test'] }
};

test('thatsthem live submit to postman-echo returns submitted', async () => {
  const request = thasthemAdapter.prepareRequest(sampleInput);
  const result = await thasthemAdapter.submit(request, { live: true });

  assert.equal(result.status, 'submitted');
  assert.equal(result.dryRun, false);
  assert.equal(result.broker, 'thatsthem');
  assert.equal(result.httpStatus, 200);
  assert.ok(result.endpoint.includes('postman-echo'));
  assert.ok(result.responseBody?.json?.broker === 'thatsthem');
});

test('spokeo live submit to postman-echo returns submitted', async () => {
  const request = spokeoAdapter.prepareRequest(sampleInput);
  const result = await spokeoAdapter.submit(request, { live: true });

  assert.equal(result.status, 'submitted');
  assert.equal(result.dryRun, false);
  assert.equal(result.broker, 'spokeo');
  assert.equal(result.httpStatus, 200);
  assert.ok(result.endpoint.includes('postman-echo'));
});

test('peekyou live submit to postman-echo returns submitted', async () => {
  const request = peekyouAdapter.prepareRequest(sampleInput);
  const result = await peekyouAdapter.submit(request, { live: true });

  assert.equal(result.status, 'submitted');
  assert.equal(result.dryRun, false);
  assert.equal(result.broker, 'peekyou');
  assert.equal(result.httpStatus, 200);
});

test('thatsthem parseResult with live submission includes evidence', async () => {
  const request = thasthemAdapter.prepareRequest(sampleInput);
  const submission = await thasthemAdapter.submit(request, { live: true });
  const parsed = thasthemAdapter.parseResult(submission, request);

  assert.equal(parsed.dryRun, false);
  assert.ok(parsed.evidence);
  assert.ok(parsed.notes.some(n => n.includes('Live HTTP')));
});

test('all upgraded adapters are liveCapable', () => {
  for (const adapter of [thasthemAdapter, spokeoAdapter, peekyouAdapter]) {
    assert.equal(adapter.liveCapable, true, `${adapter.name} should be liveCapable`);
    assert.equal(adapter.dryRun, false, `${adapter.name} should not be dryRun`);
  }
});
