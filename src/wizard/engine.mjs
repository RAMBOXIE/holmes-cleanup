import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { runHeuristicScan } from '../scanner/scan-engine.mjs';
import catalog from '../adapters/brokers/config/broker-catalog.json' with { type: 'json' };

export const STATES = Object.freeze([
  // Scan phase (new)
  'SCAN_WELCOME',
  'SCAN_INPUT',
  'SCAN_RUNNING',
  'SCAN_REPORT',
  'SCAN_HANDOFF',
  // Cleanup phase (unchanged)
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
  // Scan phase
  SCAN_WELCOME: 'SCAN_INPUT',
  SCAN_INPUT: 'SCAN_RUNNING',
  SCAN_RUNNING: 'SCAN_REPORT',
  SCAN_REPORT: 'SCAN_HANDOFF',
  SCAN_HANDOFF: 'WELCOME',
  // Cleanup phase (unchanged)
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
  SCAN_INPUT: ['scanIdentity'],
  SCAN_REPORT: ['scanReviewed'],
  SCAN_HANDOFF: ['handoffDecision'],
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

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, '..', '..');
const PROMPT_DIR = path.join(PROJECT_ROOT, 'prompts', 'wizard');

export function createSession(seed = {}) {
  return {
    currentState: seed.skipScan ? 'WELCOME' : 'SCAN_WELCOME',
    paused: false,
    history: [],
    data: {
      // Scan phase data
      scanIdentity: seed.scanIdentity || null,
      scanResult: seed.scanResult || null,
      scanReviewed: '',
      handoffDecision: '',
      privacyScore: null,
      // Cleanup phase data (unchanged)
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

    // SCAN_HANDOFF: early-exit for 'done' decision
    if (previous === 'SCAN_HANDOFF' && session.data.handoffDecision === 'done') {
      session.currentState = 'CLOSE';
    } else if (previous === 'SCAN_HANDOFF' && session.data.handoffDecision === 'export') {
      session.currentState = 'CLOSE';
    } else {
      session.currentState = TRANSITIONS[previous] || previous;
    }
  }

  return toResult(session, true, nextActionHints(session));
}

export function getCurrentPrompt(session) {
  const state = session?.currentState || 'SCAN_WELCOME';
  const promptPath = path.join(PROMPT_DIR, `${state}.md`);
  let tpl = `State ${state}: provide required information.`;

  if (fs.existsSync(promptPath)) {
    tpl = fs.readFileSync(promptPath, 'utf8');
  }

  const missing = getRequiredFieldsMissing(session);
  const scanResult = session?.data?.scanResult;
  const vars = {
    state,
    // Cleanup phase vars
    goal: session?.data?.goal || '(not set)',
    platforms: Array.isArray(session?.data?.platforms) ? session.data.platforms.join(', ') : '(not set)',
    missing_fields: missing.join(', ') || 'none',
    export_decision: session?.data?.exportDecision || '(not decided)',
    plan: session?.data?.planSummary || '(not set)',
    // Scan phase vars
    privacy_score: scanResult?.privacyScore ?? '(not scanned)',
    risk_level: scanResult?.riskLevel ?? '(not scanned)',
    likely_count: scanResult?.summary?.likelyExposed ?? 0,
    top_recommendation: scanResult?.recommendations?.[0]?.action ?? '(none yet)'
  };

  return Object.entries(vars).reduce(
    (out, [k, v]) => out.replaceAll(`{{${k}}}`, String(v)),
    tpl
  );
}

function applyStateInput(session, text) {
  const state = session.currentState;
  if (!text && state !== 'WELCOME' && state !== 'SCAN_WELCOME' && state !== 'SCAN_RUNNING') return;

  switch (state) {
    case 'SCAN_WELCOME':
      break;
    case 'SCAN_INPUT': {
      const identity = parseIdentityInput(text);
      if (identity && identity.fullName) {
        session.data.scanIdentity = identity;
        // Run scan synchronously (pure computation, no external calls)
        try {
          const result = runHeuristicScan(identity, { catalog });
          session.data.scanResult = result;
          session.data.privacyScore = result.privacyScore;
        } catch (err) {
          // If scan fails, clear scanIdentity so state stays blocked
          session.data.scanIdentity = null;
        }
      }
      break;
    }
    case 'SCAN_RUNNING':
      break;
    case 'SCAN_REPORT':
      if (['reviewed', 'yes'].includes(text.toLowerCase())) {
        session.data.scanReviewed = 'YES';
      }
      break;
    case 'SCAN_HANDOFF':
      if (['cleanup', 'export', 'done'].includes(text.toLowerCase())) {
        session.data.handoffDecision = text.toLowerCase();
      }
      break;
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

/**
 * Parse identity input string like:
 *   "Name: John Doe, Email: john@example.com, Phone: +15551234567, City: NYC, State: NY"
 * Returns an identity object, or null if no name found.
 */
function parseIdentityInput(text) {
  if (!text) return null;
  const identity = {
    fullName: '',
    emails: [],
    phones: [],
    usernames: [],
    jurisdiction: 'US',
    city: null,
    state: null
  };

  const pairs = text.split(/[,;]\s*/);
  for (const pair of pairs) {
    const [rawKey, ...rest] = pair.split(':');
    if (!rawKey || rest.length === 0) continue;
    const key = rawKey.trim().toLowerCase();
    const value = rest.join(':').trim();
    if (!value) continue;

    switch (key) {
      case 'name':
      case 'fullname':
      case 'full name':
        identity.fullName = value;
        break;
      case 'email':
      case 'emails':
        identity.emails.push(value);
        break;
      case 'phone':
      case 'phones':
        identity.phones.push(value);
        break;
      case 'username':
      case 'usernames':
      case 'handle':
        identity.usernames.push(value);
        break;
      case 'city':
        identity.city = value;
        break;
      case 'state':
        identity.state = value;
        break;
      case 'jurisdiction':
        identity.jurisdiction = value;
        break;
      default:
        break;
    }
  }

  return identity.fullName ? identity : null;
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
