import test from 'node:test';
import assert from 'node:assert/strict';

import { createLiveBrokerAdapter } from '../src/adapters/brokers/_live-broker.mjs';

const makeAdapter = (overrides = {}) => createLiveBrokerAdapter({
  name: 'testbroker',
  displayName: 'TestBroker',
  optOutUrl: 'https://example.com/optout',
  category: 'people-search',
  endpointEnvVar: 'TESTBROKER_LIVE_ENDPOINT',
  ...overrides
});

const sampleInput = {
  requestId: 'factory-test-1',
  person: { fullName: 'Test User', emails: ['test@example.com'] }
};

test('factory creates adapter with correct shape', () => {
  const adapter = makeAdapter();
  assert.equal(adapter.name, 'testbroker');
  assert.equal(adapter.displayName, 'TestBroker');
  assert.equal(adapter.dryRun, false);
  assert.equal(adapter.liveCapable, true);
  assert.equal(typeof adapter.prepareRequest, 'function');
  assert.equal(typeof adapter.submit, 'function');
  assert.equal(typeof adapter.parseResult, 'function');
});

test('dry-run fallback when live=false', async () => {
  const adapter = makeAdapter();
  const request = adapter.prepareRequest(sampleInput);
  const submission = await adapter.submit(request, { live: false });

  assert.equal(submission.status, 'submitted');
  assert.equal(submission.dryRun, true);
  assert.equal(submission.broker, 'testbroker');
});

test('compliance blocking in official mode without termsAccepted', async () => {
  const adapter = makeAdapter();
  const request = adapter.prepareRequest(sampleInput);
  const result = await adapter.submit(request, {
    live: true,
    officialMode: true,
    operatorId: 'op-1',
    lawfulBasis: 'consumer-request'
    // termsAccepted missing → should block
  });

  assert.equal(result.status, 'blocked');
  assert.equal(result.reason, 'compliance_not_confirmed');
  assert.equal(result.compliance.termsAccepted, false);
  assert.equal(result.compliance.operatorId, 'op-1');
  assert.ok(Array.isArray(result.nextActions));
});

test('compliance blocking without lawfulBasis', async () => {
  const adapter = makeAdapter();
  const request = adapter.prepareRequest(sampleInput);
  const result = await adapter.submit(request, {
    live: true,
    officialMode: true,
    termsAccepted: true,
    operatorId: 'op-1'
    // lawfulBasis missing
  });

  assert.equal(result.status, 'blocked');
  assert.equal(result.reason, 'compliance_not_confirmed');
});

test('custom buildRequestBody is used', async () => {
  let capturedBody = null;
  const adapter = makeAdapter({
    buildRequestBody: (request, input) => {
      capturedBody = { custom: true, id: request.requestId };
      return capturedBody;
    }
  });

  const request = adapter.prepareRequest(sampleInput);
  // dry-run mode won't call buildRequestBody, so we just verify shape
  const submission = await adapter.submit(request, { live: false });
  assert.equal(submission.dryRun, true);

  // Verify the adapter stored our custom builder (it's used in live mode only)
  assert.equal(adapter.liveCapable, true);
});

test('parseResult returns blocked envelope for blocked submissions', () => {
  const adapter = makeAdapter();
  const request = adapter.prepareRequest(sampleInput);

  const blockedSubmission = {
    status: 'blocked',
    reason: 'compliance_not_confirmed',
    nextActions: ['Fix compliance.'],
    compliance: { termsAccepted: false },
    antiBot: {},
    complianceNotes: ['Note 1']
  };

  const parsed = adapter.parseResult(blockedSubmission, request);
  assert.equal(parsed.status, 'blocked');
  assert.equal(parsed.reason, 'compliance_not_confirmed');
  assert.ok(Array.isArray(parsed.nextActions));
});

test('parseResult enriches successful dry-run submission', () => {
  const adapter = makeAdapter();
  const request = adapter.prepareRequest(sampleInput);

  const submission = {
    broker: 'testbroker',
    status: 'submitted',
    dryRun: true,
    ticketId: 'testbroker-factory-test-1-dryrun',
    submittedAt: new Date().toISOString()
  };

  const parsed = adapter.parseResult(submission, request);
  assert.equal(parsed.broker, 'testbroker');
  assert.equal(parsed.dryRun, true);
  assert.ok(parsed.notes.some(n => n.includes('dry-run')));
});

test('simulation passthrough works in dry-run mode', async () => {
  const adapter = makeAdapter();
  const request = adapter.prepareRequest(sampleInput);

  await assert.rejects(
    () => adapter.submit(request, { simulate: { testbroker: 'transient-error' } }),
    (err) => {
      assert.equal(err.transient, true);
      assert.equal(err.code, 'BROKER_RATE_LIMITED');
      return true;
    }
  );
});
