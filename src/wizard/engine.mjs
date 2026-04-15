import fs from 'node:fs';
import path from 'node:path';

export const STATES = Object.freeze([
  'WELCOME',
  'GOAL',
  'SCOPE',
  'INPUT',
  'AUTH',
  'PLAN',
  'RISK_CONFIRM_1',
  'RISK_CONFIRM_2',
  'RISK_CONFIRM_3',
  'EXPORT_DECISION',
  'EXECUTE',
  'REPORT',
  'CLOSE'
]);

const TRANSITIONS = Object.freeze({
  WELCOME: 'GOAL',
  GOAL: 'SCOPE',
  SCOPE: 'INPUT',
  INPUT: 'AUTH',
  AUTH: 'PLAN',
  PLAN: 'RISK_CONFIRM_1',
  RISK_CONFIRM_1: 'RISK_CONFIRM_2',
  RISK_CONFIRM_2: 'RISK_CONFIRM_3',
  RISK_CONFIRM_3: 'EXPORT_DECISION',
  EXPORT_DECISION: 'EXECUTE',
  EXECUTE: 'REPORT',
  REPORT: 'CLOSE',
  CLOSE: 'CLOSE'
});

const REQUIRED_BY_STATE = Object.freeze({
  GOAL: ['goal'],
  SCOPE: ['platforms'],
  INPUT: ['inputSummary'],
  AUTH: ['authMethod'],
  PLAN: ['planSummary'],
  RISK_CONFIRM_1: ['riskConfirm1'],
  RISK_CONFIRM_2: ['riskConfirm2'],
  RISK_CONFIRM_3: ['riskConfirm3'],
  EXPORT_DECISION: ['exportDecision'],
  EXECUTE: ['executeApproved'],
  REPORT: ['reportSummary']
});

const PROMPT_DIR = path.resolve('D:/Projects/holmes-cleanup/prompts/wizard');

export function createSession(seed = {}) {
  return {
    currentState: 'WELCOME',
    paused: false,
    history: [],
    data: {
      goal: seed.goal || '',
      platforms: seed.platforms || [],
      inputSummary: seed.inputSummary || '',
      authMethod: seed.authMethod || '',
      planSummary: seed.planSummary || '',
      riskConfirm1: '',
      riskConfirm2: '',
      riskConfirm3: '',
      exportDecision: '',
      executeApproved: '',
      reportSummary: ''
    }
  };
}

export function handleInput(session, userInput = '') {
  if (!session || typeof session !== 'object') {
    throw new Error('Session is required.');
  }

  const trimmed = String(userInput || '').trim();
  const command = trimmed.toLowerCase();

  if (command === 'status') {
    return toResult(session, false, ['Provide input for current state or use back/pause/resume.']);
  }

  if (command === 'pause') {
    session.paused = true;
    return toResult(session, false, ['Session paused. Use resume to continue.']);
  }

  if (command === 'resume') {
    session.paused = false;
    return toResult(session, false, ['Session resumed. Continue with current state input.']);
  }

  if (command === 'back') {
    if (session.history.length === 0) {
      return toResult(session, false, ['Already at initial state; cannot go back.']);
    }
    session.currentState = session.history.pop();
    return toResult(session, false, ['Moved back one state.']);
  }

  if (session.paused) {
    return toResult(session, false, ['Session is paused. Use resume first.']);
  }

  applyStateInput(session, trimmed);

  const missing = getRequiredFieldsMissing(session);
  if (missing.length > 0) {
    return toResult(session, false, [`Missing required fields: ${missing.join(', ')}`]);
  }

  if (session.currentState !== 'CLOSE') {
    const previous = session.currentState;
    session.history.push(previous);
    session.currentState = TRANSITIONS[previous] || previous;
  }

  return toResult(session, true, nextActionHints(session));
}

export function getCurrentPrompt(session) {
  const state = session?.currentState || 'WELCOME';
  const promptPath = path.join(PROMPT_DIR, `${state}.md`);
  let tpl = `State ${state}: provide required information.`;

  if (fs.existsSync(promptPath)) {
    tpl = fs.readFileSync(promptPath, 'utf8');
  }

  const missing = getRequiredFieldsMissing(session);
  const vars = {
    state,
    goal: session?.data?.goal || '(not set)',
    platforms: Array.isArray(session?.data?.platforms) ? session.data.platforms.join(', ') : '(not set)',
    missing_fields: missing.join(', ') || 'none',
    export_decision: session?.data?.exportDecision || '(not decided)',
    plan: session?.data?.planSummary || '(not set)'
  };

  return Object.entries(vars).reduce(
    (out, [k, v]) => out.replaceAll(`{{${k}}}`, String(v)),
    tpl
  );
}

function applyStateInput(session, text) {
  const state = session.currentState;
  if (!text && state !== 'WELCOME') return;

  switch (state) {
    case 'WELCOME':
      break;
    case 'GOAL':
      session.data.goal = text;
      break;
    case 'SCOPE':
      session.data.platforms = text.split(',').map(s => s.trim()).filter(Boolean);
      break;
    case 'INPUT':
      session.data.inputSummary = text;
      break;
    case 'AUTH':
      session.data.authMethod = text;
      break;
    case 'PLAN':
      session.data.planSummary = text;
      break;
    case 'RISK_CONFIRM_1':
      if (text.toUpperCase() === 'YES') session.data.riskConfirm1 = 'YES';
      break;
    case 'RISK_CONFIRM_2':
      if (text.toUpperCase() === 'YES') session.data.riskConfirm2 = 'YES';
      break;
    case 'RISK_CONFIRM_3':
      if (text.toUpperCase() === 'YES') session.data.riskConfirm3 = 'YES';
      break;
    case 'EXPORT_DECISION':
      if (['yes', 'no'].includes(text.toLowerCase())) {
        session.data.exportDecision = text.toLowerCase();
      }
      break;
    case 'EXECUTE':
      if (['run', 'execute', 'go'].includes(text.toLowerCase())) {
        session.data.executeApproved = 'YES';
      }
      break;
    case 'REPORT':
      session.data.reportSummary = text;
      break;
    default:
      break;
  }
}

function getRequiredFieldsMissing(session) {
  const state = session.currentState;
  const required = REQUIRED_BY_STATE[state] || [];
  const out = [];

  for (const field of required) {
    const value = session?.data?.[field];
    const emptyArray = Array.isArray(value) && value.length === 0;
    if (value === '' || value == null || emptyArray) out.push(field);
  }
  return out;
}

function nextActionHints(session) {
  const state = session.currentState;
  if (state === 'CLOSE') return ['Wizard is complete.'];
  return [`Continue to ${state}`, 'Commands: status/back/pause/resume'];
}

function toResult(session, canProceed, nextActions) {
  return {
    currentState: session.currentState,
    requiredFieldsMissing: getRequiredFieldsMissing(session),
    nextActions,
    canProceed
  };
}
