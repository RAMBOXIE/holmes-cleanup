import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { checkLiveness, verifyEntries } from '../src/verifier/url-liveness.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, '..');
const VERIFY_SCRIPT = path.join(PROJECT_ROOT, 'scripts', 'verify.mjs');
const OPT_OUT_SCRIPT = path.join(PROJECT_ROOT, 'scripts', 'opt-out.mjs');

// Mock fetch that returns the status code from the URL path (e.g. /status/404 → 404)
function makeMockFetch() {
  return async (url) => {
    const match = String(url).match(/\/status\/(\d+)/);
    const status = match ? Number(match[1]) : 200;
    const finalUrl = String(url).includes('/redirect/root') ? 'https://example.com/' : url;
    return {
      status,
      url: finalUrl,
      ok: status >= 200 && status < 400
    };
  };
}

test('checkLiveness: 404 → removed', async () => {
  const result = await checkLiveness('https://mock.test/profile/status/404', { fetchImpl: makeMockFetch() });
  assert.equal(result.status, 'removed');
  assert.equal(result.httpStatus, 404);
});

test('checkLiveness: 410 → removed', async () => {
  const result = await checkLiveness('https://mock.test/profile/status/410', { fetchImpl: makeMockFetch() });
  assert.equal(result.status, 'removed');
  assert.equal(result.httpStatus, 410);
});

test('checkLiveness: 200 same URL → still-present', async () => {
  const result = await checkLiveness('https://mock.test/profile/status/200', { fetchImpl: makeMockFetch() });
  assert.equal(result.status, 'still-present');
  assert.equal(result.httpStatus, 200);
});

test('checkLiveness: 403 → unknown (captcha/ratelimit)', async () => {
  const result = await checkLiveness('https://mock.test/profile/status/403', { fetchImpl: makeMockFetch() });
  assert.equal(result.status, 'unknown');
  assert.equal(result.httpStatus, 403);
  assert.match(result.reason, /captcha-or-ratelimit/);
});

test('checkLiveness: 429 → unknown', async () => {
  const result = await checkLiveness('https://mock.test/profile/status/429', { fetchImpl: makeMockFetch() });
  assert.equal(result.status, 'unknown');
  assert.equal(result.httpStatus, 429);
});

test('checkLiveness: 500 → unknown', async () => {
  const result = await checkLiveness('https://mock.test/profile/status/500', { fetchImpl: makeMockFetch() });
  assert.equal(result.status, 'unknown');
  assert.match(result.reason, /server-error/);
});

test('checkLiveness: redirected to domain root → removed', async () => {
  const result = await checkLiveness('https://example.com/deep/profile/path/12345/redirect/root', { fetchImpl: makeMockFetch() });
  assert.equal(result.status, 'removed');
  assert.match(result.reason, /redirected-to-root/);
});

test('checkLiveness: no URL → unknown', async () => {
  const result = await checkLiveness(null);
  assert.equal(result.status, 'unknown');
  assert.equal(result.reason, 'no-url-provided');
});

test('checkLiveness: network error → unknown', async () => {
  const brokenFetch = async () => { throw new Error('ECONNREFUSED'); };
  const result = await checkLiveness('https://mock.test/profile', { fetchImpl: brokenFetch });
  assert.equal(result.status, 'unknown');
  assert.equal(result.reason, 'network-error');
});

test('verifyEntries: updates entries with verification fields', async () => {
  const entries = [
    { id: 'e1', broker: 'spokeo', profileUrl: 'https://mock.test/status/404', status: 'pending-verification' },
    { id: 'e2', broker: 'peekyou', profileUrl: 'https://mock.test/status/200', status: 'pending-verification' }
  ];

  const updated = await verifyEntries(entries, { fetchImpl: makeMockFetch(), delayMs: 0 });

  assert.equal(updated.length, 2);
  assert.equal(updated[0].verificationResult, 'removed');
  assert.equal(updated[0].status, 'verified-removed');
  assert.equal(updated[0].verificationHttpStatus, 404);
  assert.ok(updated[0].verifiedAt);

  assert.equal(updated[1].verificationResult, 'still-present');
  assert.equal(updated[1].status, 'still-present');
});

test('verify CLI --no-fetch lists pending without HTTP', () => {
  const tmpFile = path.join(os.tmpdir(), `verify-test-${Date.now()}.json`);

  // First create followUp entries via opt-out script
  const optOut = spawnSync(process.execPath, [
    OPT_OUT_SCRIPT,
    '--broker', 'spokeo,peekyou',
    '--email', 'test@example.com',
    '--full-name', 'Test User',
    '--profile-url', 'https://example.com/me',
    '--state-file', tmpFile,
    '--no-open'
  ], {
    env: { ...process.env, VANISH_AUDIT_HMAC_KEY: 'test-key' },
    encoding: 'utf8'
  });
  assert.equal(optOut.status, 0, `opt-out failed: ${optOut.stderr}`);

  // Now verify with --all --no-fetch
  const verify = spawnSync(process.execPath, [
    VERIFY_SCRIPT,
    '--all', '--no-fetch',
    '--state-file', tmpFile
  ], {
    env: { ...process.env, VANISH_AUDIT_HMAC_KEY: 'test-key' },
    encoding: 'utf8'
  });
  assert.equal(verify.status, 0);
  assert.match(verify.stdout, /2 follow-up entries/);
  assert.match(verify.stdout, /no-fetch/);

  fs.unlinkSync(tmpFile);
});

test('verify CLI reports "none due" when nothing past recheckAt', () => {
  const tmpFile = path.join(os.tmpdir(), `verify-test-${Date.now()}.json`);

  // Create entries — their recheckAt is in the future
  const optOut = spawnSync(process.execPath, [
    OPT_OUT_SCRIPT,
    '--broker', 'spokeo',
    '--email', 'test@example.com',
    '--full-name', 'Test User',
    '--profile-url', 'https://example.com/me',
    '--state-file', tmpFile,
    '--no-open'
  ], {
    env: { ...process.env, VANISH_AUDIT_HMAC_KEY: 'test-key' },
    encoding: 'utf8'
  });
  assert.equal(optOut.status, 0);

  // Run verify WITHOUT --all → should report nothing due
  const verify = spawnSync(process.execPath, [
    VERIFY_SCRIPT,
    '--state-file', tmpFile
  ], {
    env: { ...process.env, VANISH_AUDIT_HMAC_KEY: 'test-key' },
    encoding: 'utf8'
  });
  assert.equal(verify.status, 0);
  assert.match(verify.stdout, /none match the filter|none are due/);
  assert.match(verify.stdout, /Next scheduled/);

  fs.unlinkSync(tmpFile);
});

test('verify CLI reports empty when no followUp exists', () => {
  const tmpFile = path.join(os.tmpdir(), `verify-empty-${Date.now()}.json`);
  fs.writeFileSync(tmpFile, JSON.stringify({
    retry: [], manualReview: [], deadLetter: [], completed: [], failed: [], audit: [], followUp: []
  }));

  const verify = spawnSync(process.execPath, [
    VERIFY_SCRIPT, '--state-file', tmpFile
  ], {
    env: { ...process.env, VANISH_AUDIT_HMAC_KEY: 'test-key' },
    encoding: 'utf8'
  });
  assert.equal(verify.status, 0);
  assert.match(verify.stdout, /No follow-up entries/);

  fs.unlinkSync(tmpFile);
});

// ─── Kind dispatcher tests (v2) ─────────────────────────────────

import {
  kindOf,
  isVerifiable,
  labelFor,
  buildAiPlatformReminder,
  buildFaceServiceReminder,
  statusFromManualConfirm
} from '../src/verifier/followup-kinds.mjs';
import { createRequire as cr } from 'node:module';
const reqKinds = cr(import.meta.url);
const aiCatalogForKinds = reqKinds('../src/ai-scanner/ai-platforms-catalog.json');
const faceCatalogForKinds = reqKinds('../src/face-scanner/face-services-catalog.json');

test('kindOf: legacy entry with broker field defaults to broker', () => {
  assert.equal(kindOf({ broker: 'spokeo', id: 'x' }), 'broker');
});

test('kindOf: explicit kind field wins', () => {
  assert.equal(kindOf({ kind: 'ai-platform', platform: 'openai-chatgpt' }), 'ai-platform');
  assert.equal(kindOf({ kind: 'face-service', service: 'pimeyes' }), 'face-service');
});

test('isVerifiable: broker, ai-platform, face-service all true', () => {
  assert.equal(isVerifiable({ kind: 'broker' }), true);
  assert.equal(isVerifiable({ kind: 'ai-platform' }), true);
  assert.equal(isVerifiable({ kind: 'face-service' }), true);
});

test('isVerifiable: one-shot kinds skipped', () => {
  assert.equal(isVerifiable({ kind: 'ai-history-local' }), false);
  assert.equal(isVerifiable({ kind: 'ai-history-web' }), false);
  assert.equal(isVerifiable({ kind: 'takedown-hash-registry' }), false);
  assert.equal(isVerifiable({ kind: 'takedown-dmca-drafted' }), false);
  assert.equal(isVerifiable({ kind: 'takedown-legal-letter' }), false);
});

test('labelFor prefers displayName, falls back through known fields', () => {
  assert.equal(labelFor({ displayName: 'PimEyes' }), 'PimEyes');
  assert.equal(labelFor({ broker: 'spokeo' }), 'spokeo');
  assert.equal(labelFor({ platform: 'openai-chatgpt' }), 'openai-chatgpt');
  assert.equal(labelFor({ service: 'pimeyes' }), 'pimeyes');
  assert.equal(labelFor({ id: 'x_123' }), 'x_123');
  assert.equal(labelFor({}), 'unknown');
});

test('buildAiPlatformReminder pulls walkthrough from catalog', () => {
  const r = buildAiPlatformReminder({ platform: 'openai-chatgpt', kind: 'ai-platform' }, aiCatalogForKinds);
  assert.equal(r.displayName, 'OpenAI ChatGPT');
  assert.ok(r.url);
  assert.ok(r.targetSetting);
  assert.ok(Array.isArray(r.steps) && r.steps.length > 0);
});

test('buildAiPlatformReminder falls back when platform missing', () => {
  const r = buildAiPlatformReminder({ platform: 'bogus', kind: 'ai-platform' }, aiCatalogForKinds);
  assert.equal(r.displayName, 'bogus');
  assert.equal(r.url, null);
  assert.ok(Array.isArray(r.steps) && r.steps.length > 0);
});

test('buildFaceServiceReminder pulls service info from catalog', () => {
  const r = buildFaceServiceReminder({ service: 'pimeyes', kind: 'face-service' }, faceCatalogForKinds);
  assert.equal(r.displayName, 'PimEyes');
  assert.ok(r.url);
  assert.ok(Array.isArray(r.steps) && r.steps.length > 0);
});

test('buildFaceServiceReminder handles clearview (no searchUrl)', () => {
  const r = buildFaceServiceReminder({ service: 'clearview-ai', kind: 'face-service' }, faceCatalogForKinds);
  assert.equal(r.displayName, 'Clearview AI');
  assert.ok(r.steps.some(s => /not user-searchable|data-access request/i.test(s)));
});

test('statusFromManualConfirm maps correctly', () => {
  assert.equal(statusFromManualConfirm('clean'), 'verified-removed');
  assert.equal(statusFromManualConfirm('still'), 'still-present');
  assert.equal(statusFromManualConfirm('pending'), 'pending-reverification');
  assert.equal(statusFromManualConfirm(undefined), 'pending-reverification');
});

// ─── verify CLI end-to-end with ai-platform + face-service ─────

test('verify CLI --no-fetch --assume clean processes manual kinds', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'vanish-verify-'));
  const stateFile = path.join(tmpDir, 'queue-state.json');
  const pastDate = new Date(Date.now() - 7 * 86400000).toISOString();

  fs.writeFileSync(stateFile, JSON.stringify({
    retry: [], manualReview: [], deadLetter: [], completed: [], failed: [], audit: [],
    followUp: [
      {
        id: 'ai_followup_test_1',
        kind: 'ai-platform',
        platform: 'openai-chatgpt',
        displayName: 'OpenAI ChatGPT',
        submittedAt: pastDate,
        recheckAt: pastDate,
        status: 'pending-reverification'
      },
      {
        id: 'face_followup_test_1',
        kind: 'face-service',
        service: 'pimeyes',
        displayName: 'PimEyes',
        submittedAt: pastDate,
        recheckAt: pastDate,
        status: 'pending-reverification'
      }
    ]
  }, null, 2));

  try {
    const result = spawnSync(process.execPath, [
      VERIFY_SCRIPT, '--all', '--no-fetch', '--assume', 'clean',
      '--state-file', stateFile
    ], { encoding: 'utf8', env: { ...process.env, NODE_ENV: 'test' } });

    assert.equal(result.status, 0, `failed: ${result.stderr}`);
    assert.match(result.stdout, /Removed\/clean: 2/);

    const state = JSON.parse(fs.readFileSync(stateFile, 'utf8'));
    const ai = state.followUp.find(e => e.id === 'ai_followup_test_1');
    const face = state.followUp.find(e => e.id === 'face_followup_test_1');
    assert.equal(ai.status, 'verified-removed');
    assert.equal(face.status, 'verified-removed');
    assert.ok(ai.verifiedAt);
    assert.ok(face.verifiedAt);

    assert.ok(state.audit.length >= 2);
    for (const e of state.audit) {
      assert.ok(e.signature);
      assert.equal(e.event, 'verify_result');
    }
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('verify CLI --kind ai-platform filters out brokers', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'vanish-verify-'));
  const stateFile = path.join(tmpDir, 'queue-state.json');
  const past = new Date(Date.now() - 7 * 86400000).toISOString();

  fs.writeFileSync(stateFile, JSON.stringify({
    retry: [], manualReview: [], deadLetter: [], completed: [], failed: [], audit: [],
    followUp: [
      { id: 'b1', broker: 'spokeo', profileUrl: 'https://example.invalid/404', submittedAt: past, recheckAt: past },
      { id: 'a1', kind: 'ai-platform', platform: 'openai-chatgpt', submittedAt: past, recheckAt: past, status: 'pending-reverification' }
    ]
  }, null, 2));

  try {
    const result = spawnSync(process.execPath, [
      VERIFY_SCRIPT, '--all', '--kind', 'ai-platform', '--no-fetch', '--assume', 'clean',
      '--state-file', stateFile
    ], { encoding: 'utf8', env: { ...process.env, NODE_ENV: 'test' } });

    assert.equal(result.status, 0);
    assert.match(result.stdout, /Total checked: 1/);
    assert.match(result.stdout, /1 AI-platform\/face-service via manual confirmation/);
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('verify CLI --all skips one-shot kinds (ai-history, takedown)', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'vanish-verify-'));
  const stateFile = path.join(tmpDir, 'queue-state.json');
  const past = new Date(Date.now() - 7 * 86400000).toISOString();

  fs.writeFileSync(stateFile, JSON.stringify({
    retry: [], manualReview: [], deadLetter: [], completed: [], failed: [], audit: [],
    followUp: [
      { id: 'h1', kind: 'ai-history-local', tool: 'cursor', submittedAt: past },
      { id: 't1', kind: 'takedown-dmca-drafted', target: 'coomer', submittedAt: past }
    ]
  }, null, 2));

  try {
    const result = spawnSync(process.execPath, [
      VERIFY_SCRIPT, '--all', '--no-fetch', '--state-file', stateFile
    ], { encoding: 'utf8', env: { ...process.env, NODE_ENV: 'test' } });

    assert.equal(result.status, 0);
    assert.match(result.stdout, /none match the filter|Total checked: 0|but none are due/i);
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});
