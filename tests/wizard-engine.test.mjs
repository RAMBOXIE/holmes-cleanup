import test from 'node:test';
import assert from 'node:assert/strict';

import { createSession, handleInput, getCurrentPrompt } from '../src/wizard/engine.mjs';

test('wizard progresses through happy path', () => {
  const session = createSession();

  handleInput(session, 'start');
  assert.equal(session.currentState, 'GOAL');

  handleInput(session, 'Clean harmful mirrors');
  handleInput(session, 'google,telegram');
  handleInput(session, '2 urls and 1 screenshot');
  handleInput(session, 'oauth token via env');
  handleInput(session, 'prepare requests then submit');
  handleInput(session, 'YES');
  handleInput(session, 'YES');
  handleInput(session, 'YES');
  handleInput(session, 'yes');
  handleInput(session, 'run');
  const finalReport = handleInput(session, 'completed dry-run and queued follow-up');

  assert.equal(finalReport.currentState, 'CLOSE');
  assert.equal(finalReport.canProceed, true);
});

test('wizard supports back pause resume commands', () => {
  const session = createSession();
  handleInput(session, 'start');
  handleInput(session, 'Goal A');
  assert.equal(session.currentState, 'SCOPE');

  handleInput(session, 'pause');
  const pausedInput = handleInput(session, 'telegram');
  assert.equal(pausedInput.canProceed, false);
  assert.equal(session.currentState, 'SCOPE');

  handleInput(session, 'resume');
  handleInput(session, 'telegram');
  assert.equal(session.currentState, 'INPUT');

  handleInput(session, 'back');
  assert.equal(session.currentState, 'SCOPE');
});

test('high-risk triple confirmation gating works', () => {
  const session = createSession();
  handleInput(session, 'start');
  handleInput(session, 'Goal');
  handleInput(session, 'google');
  handleInput(session, 'sample links');
  handleInput(session, 'env only');
  handleInput(session, 'plan it');

  const wrong = handleInput(session, 'NO');
  assert.equal(wrong.currentState, 'RISK_CONFIRM_1');
  assert.equal(wrong.requiredFieldsMissing.includes('riskConfirm1'), true);
  assert.equal(wrong.canProceed, false);

  handleInput(session, 'YES');
  assert.equal(session.currentState, 'RISK_CONFIRM_2');
});

test('export-before-delete gate requires yes/no', () => {
  const session = createSession();
  handleInput(session, 'start');
  handleInput(session, 'Goal');
  handleInput(session, 'google');
  handleInput(session, 'sample links');
  handleInput(session, 'env only');
  handleInput(session, 'plan it');
  handleInput(session, 'YES');
  handleInput(session, 'YES');
  handleInput(session, 'YES');

  const blocked = handleInput(session, 'maybe');
  assert.equal(blocked.currentState, 'EXPORT_DECISION');
  assert.equal(blocked.requiredFieldsMissing.includes('exportDecision'), true);

  const prompt = getCurrentPrompt(session);
  assert.match(prompt, /missing/i);

  handleInput(session, 'no');
  assert.equal(session.currentState, 'EXECUTE');
});
