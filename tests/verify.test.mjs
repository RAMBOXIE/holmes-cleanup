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
    env: { ...process.env, HOLMES_AUDIT_HMAC_KEY: 'test-key' },
    encoding: 'utf8'
  });
  assert.equal(optOut.status, 0, `opt-out failed: ${optOut.stderr}`);

  // Now verify with --all --no-fetch
  const verify = spawnSync(process.execPath, [
    VERIFY_SCRIPT,
    '--all', '--no-fetch',
    '--state-file', tmpFile
  ], {
    env: { ...process.env, HOLMES_AUDIT_HMAC_KEY: 'test-key' },
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
    env: { ...process.env, HOLMES_AUDIT_HMAC_KEY: 'test-key' },
    encoding: 'utf8'
  });
  assert.equal(optOut.status, 0);

  // Run verify WITHOUT --all → should report nothing due
  const verify = spawnSync(process.execPath, [
    VERIFY_SCRIPT,
    '--state-file', tmpFile
  ], {
    env: { ...process.env, HOLMES_AUDIT_HMAC_KEY: 'test-key' },
    encoding: 'utf8'
  });
  assert.equal(verify.status, 0);
  assert.match(verify.stdout, /none are due/);
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
    env: { ...process.env, HOLMES_AUDIT_HMAC_KEY: 'test-key' },
    encoding: 'utf8'
  });
  assert.equal(verify.status, 0);
  assert.match(verify.stdout, /No follow-up entries/);

  fs.unlinkSync(tmpFile);
});
