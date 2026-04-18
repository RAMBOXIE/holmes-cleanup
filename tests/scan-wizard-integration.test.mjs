import test from 'node:test';
import assert from 'node:assert/strict';

import { createSession, handleInput, getCurrentPrompt, STATES } from '../src/wizard/engine.mjs';

test('default session starts at SCAN_WELCOME', () => {
  const session = createSession();
  assert.equal(session.currentState, 'SCAN_WELCOME');
});

test('skipScan starts at WELCOME (backward compat)', () => {
  const session = createSession({ skipScan: true });
  assert.equal(session.currentState, 'WELCOME');
});

test('STATES array has all 18 states with scan phase prepended', () => {
  assert.equal(STATES.length, 18);
  assert.equal(STATES[0], 'SCAN_WELCOME');
  assert.equal(STATES[4], 'SCAN_HANDOFF');
  assert.equal(STATES[5], 'WELCOME');
  assert.equal(STATES[17], 'CLOSE');
});

test('scan phase progresses through all 5 states', () => {
  const session = createSession();

  // SCAN_WELCOME -> SCAN_INPUT
  handleInput(session, 'ready');
  assert.equal(session.currentState, 'SCAN_INPUT');

  // SCAN_INPUT: provide identity, scan runs synchronously
  handleInput(session, 'Name: Ada Lovelace, Email: ada@example.com, Phone: +15550101');
  assert.equal(session.currentState, 'SCAN_RUNNING');
  assert.ok(session.data.scanResult, 'scanResult should be set after SCAN_INPUT');
  assert.equal(typeof session.data.privacyScore, 'number');
  assert.equal(session.data.scanResult.summary.totalBrokers, 201);

  // SCAN_RUNNING -> SCAN_REPORT
  handleInput(session, 'next');
  assert.equal(session.currentState, 'SCAN_REPORT');

  // SCAN_REPORT: acknowledge
  handleInput(session, 'reviewed');
  assert.equal(session.currentState, 'SCAN_HANDOFF');
});

test('handoff cleanup routes to WELCOME', () => {
  const session = createSession();
  handleInput(session, 'ready');
  handleInput(session, 'Name: Ada Lovelace');
  handleInput(session, 'next');
  handleInput(session, 'reviewed');
  assert.equal(session.currentState, 'SCAN_HANDOFF');

  handleInput(session, 'cleanup');
  assert.equal(session.currentState, 'WELCOME');
});

test('handoff done routes directly to CLOSE', () => {
  const session = createSession();
  handleInput(session, 'ready');
  handleInput(session, 'Name: Ada Lovelace');
  handleInput(session, 'next');
  handleInput(session, 'reviewed');
  handleInput(session, 'done');
  assert.equal(session.currentState, 'CLOSE');
});

test('handoff export also routes to CLOSE', () => {
  const session = createSession();
  handleInput(session, 'ready');
  handleInput(session, 'Name: Ada Lovelace');
  handleInput(session, 'next');
  handleInput(session, 'reviewed');
  handleInput(session, 'export');
  assert.equal(session.currentState, 'CLOSE');
});

test('SCAN_INPUT requires valid identity (blocks on missing name)', () => {
  const session = createSession();
  handleInput(session, 'ready');
  const result = handleInput(session, 'invalid input without name');
  assert.equal(result.canProceed, false);
  assert.equal(session.currentState, 'SCAN_INPUT');
  assert.ok(result.requiredFieldsMissing.includes('scanIdentity'));
});

test('scanResult contains all expected fields', () => {
  const session = createSession();
  handleInput(session, 'ready');
  handleInput(session, 'Name: John Doe, Email: j@example.com, Phone: +15551234');

  const sr = session.data.scanResult;
  assert.ok(sr.scanId.startsWith('scan_'));
  assert.ok(sr.scannedAt);
  assert.equal(typeof sr.privacyScore, 'number');
  assert.ok(['low', 'moderate', 'high', 'critical'].includes(sr.riskLevel));
  assert.ok(Array.isArray(sr.exposures));
  assert.ok(Array.isArray(sr.recommendations));
  assert.equal(sr.summary.totalBrokers, 201);
});

test('SCAN_REPORT prompt interpolates scan variables', () => {
  const session = createSession();
  handleInput(session, 'ready');
  handleInput(session, 'Name: John Doe, Email: j@example.com');
  handleInput(session, 'next');
  // Now at SCAN_REPORT — getCurrentPrompt should show real values
  const prompt = getCurrentPrompt(session);
  assert.match(prompt, /Privacy Score:.*\/100/);
  assert.doesNotMatch(prompt, /\(not scanned\)/);
});

test('full 18-state happy path (scan + cleanup)', () => {
  const session = createSession();

  // Scan phase
  handleInput(session, 'start');
  handleInput(session, 'Name: Ada Lovelace, Email: ada@test.com');
  handleInput(session, 'next');
  handleInput(session, 'reviewed');
  handleInput(session, 'cleanup');
  assert.equal(session.currentState, 'WELCOME');

  // Cleanup phase (unchanged, same as existing wizard-engine test)
  handleInput(session, 'start');
  assert.equal(session.currentState, 'GOAL');
  handleInput(session, 'Clean harmful mirrors');
  handleInput(session, 'google,telegram');
  handleInput(session, '2 urls');
  handleInput(session, 'env token');
  handleInput(session, 'plan it');
  handleInput(session, 'YES');
  handleInput(session, 'YES');
  handleInput(session, 'YES');
  handleInput(session, 'yes');
  handleInput(session, 'run');
  const final = handleInput(session, 'done');
  assert.equal(final.currentState, 'CLOSE');
});
