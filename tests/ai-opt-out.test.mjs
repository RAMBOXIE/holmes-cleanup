import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const catalog = require('../src/ai-scanner/ai-platforms-catalog.json');

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, '..');
const SCRIPT = path.join(PROJECT_ROOT, 'scripts', 'ai-opt-out.mjs');

// ─── Catalog walkthrough integrity ─────────────────────────────

test('catalog version is 2 (walkthrough schema)', () => {
  assert.equal(catalog.version, 2);
});

test('every non-safe platform has a walkthrough', () => {
  const missing = [];
  for (const [key, p] of Object.entries(catalog.platforms)) {
    // Safe ones (opted-out + no URL) don't need walkthrough
    const isAlreadySafe = p.defaultConsent === 'opted-out' && !p.optOutUrl;
    if (isAlreadySafe) continue;
    // Zoom is opted-out but has a URL for tier clarification — still OK if null
    if (p.walkthrough === null && p.defaultConsent === 'opted-out') continue;

    if (!p.walkthrough) missing.push(key);
  }
  assert.equal(missing.length, 0, `Platforms missing walkthrough: ${missing.join(', ')}`);
});

test('every walkthrough has required fields', () => {
  for (const [key, p] of Object.entries(catalog.platforms)) {
    if (!p.walkthrough) continue;
    const w = p.walkthrough;
    assert.ok(Array.isArray(w.steps) && w.steps.length > 0, `${key}.walkthrough.steps must be non-empty array`);
    assert.ok(typeof w.verification === 'string' && w.verification.length > 0, `${key}.walkthrough.verification required`);
    // targetSetting optional (some form-based flows don't have a single setting)
    for (const step of w.steps) {
      assert.equal(typeof step, 'string', `${key}.walkthrough step must be string`);
      assert.ok(step.length >= 5, `${key}.walkthrough step too short: "${step}"`);
    }
  }
});

test('safe platforms have walkthrough=null (not missing)', () => {
  const safeKeys = ['anthropic-claude', 'notion-ai', 'medium', 'artstation', 'zoom', 'microsoft-365'];
  for (const key of safeKeys) {
    assert.ok(key in catalog.platforms, `${key} missing from catalog`);
    assert.equal(catalog.platforms[key].walkthrough, null, `${key} should have walkthrough=null`);
  }
});

test('at least 20 platforms have executable walkthroughs', () => {
  const withWalkthrough = Object.entries(catalog.platforms).filter(([_, p]) => p.walkthrough);
  assert.ok(withWalkthrough.length >= 20,
    `expected >=20 walkthroughs, got ${withWalkthrough.length}`);
});

// ─── CLI integration ───────────────────────────────────────────

test('CLI --help exits 0 and mentions ai-opt-out', () => {
  const result = spawnSync(process.execPath, [SCRIPT, '--help'], { encoding: 'utf8' });
  assert.equal(result.status, 0);
  assert.match(result.stdout, /AI training opt-out/i);
  assert.match(result.stdout, /--chatgpt/);
  assert.match(result.stdout, /--linkedin/);
});

test('CLI fails cleanly when no flags given', () => {
  const result = spawnSync(process.execPath, [SCRIPT], { encoding: 'utf8' });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /No platforms specified/);
});

test('CLI --chatgpt --no-open records follow-up entry', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'vanish-ai-optout-'));
  const stateFile = path.join(tmpDir, 'queue-state.json');

  try {
    const result = spawnSync(process.execPath, [
      SCRIPT, '--chatgpt', '--no-open', '--state-file', stateFile
    ], { encoding: 'utf8', env: { ...process.env, NODE_ENV: 'test' } });

    assert.equal(result.status, 0, `CLI failed: ${result.stderr}`);
    assert.match(result.stdout, /Improve the model for everyone/);
    assert.match(result.stdout, /Recorded: 1/);

    // Verify state file written
    assert.ok(fs.existsSync(stateFile), 'state file not written');
    const state = JSON.parse(fs.readFileSync(stateFile, 'utf8'));
    assert.ok(Array.isArray(state.followUp) && state.followUp.length === 1);
    const entry = state.followUp[0];
    assert.equal(entry.kind, 'ai-platform');
    assert.equal(entry.platform, 'openai-chatgpt');
    assert.ok(entry.recheckAt, 'recheckAt missing');

    // Verify audit trail signed
    assert.ok(Array.isArray(state.audit) && state.audit.length >= 1);
    const auditEntry = state.audit.find(e => e.event === 'ai_opt_out_submitted_by_user');
    assert.ok(auditEntry, 'audit entry missing');
    assert.ok(auditEntry.signature, 'audit entry not signed');
    assert.equal(auditEntry.platform, 'openai-chatgpt');
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('CLI multi-platform --use batches correctly', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'vanish-ai-optout-'));
  const stateFile = path.join(tmpDir, 'queue-state.json');

  try {
    const result = spawnSync(process.execPath, [
      SCRIPT, '--use', 'chatgpt,linkedin,cursor', '--no-open', '--state-file', stateFile
    ], { encoding: 'utf8', env: { ...process.env, NODE_ENV: 'test' } });

    assert.equal(result.status, 0);
    assert.match(result.stdout, /Recorded: 3/);

    const state = JSON.parse(fs.readFileSync(stateFile, 'utf8'));
    assert.equal(state.followUp.length, 3);
    const platforms = state.followUp.map(e => e.platform).sort();
    assert.deepEqual(platforms, ['cursor-ai', 'linkedin', 'openai-chatgpt']);
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('CLI skips safe platforms with explanation', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'vanish-ai-optout-'));
  const stateFile = path.join(tmpDir, 'queue-state.json');

  try {
    const result = spawnSync(process.execPath, [
      SCRIPT, '--claude', '--no-open', '--state-file', stateFile
    ], { encoding: 'utf8', env: { ...process.env, NODE_ENV: 'test' } });

    assert.equal(result.status, 0);
    assert.match(result.stdout, /no opt-out needed/i);
    assert.match(result.stdout, /Recorded: 0/);
    assert.match(result.stdout, /1 already safe/);
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('CLI --all covers all non-safe platforms', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'vanish-ai-optout-'));
  const stateFile = path.join(tmpDir, 'queue-state.json');
  const nonSafeCount = Object.values(catalog.platforms).filter(p => p.walkthrough).length;

  try {
    const result = spawnSync(process.execPath, [
      SCRIPT, '--all', '--no-open', '--state-file', stateFile
    ], { encoding: 'utf8', env: { ...process.env, NODE_ENV: 'test' } });

    assert.equal(result.status, 0);
    assert.match(result.stdout, new RegExp(`Recorded: ${nonSafeCount}`));

    const state = JSON.parse(fs.readFileSync(stateFile, 'utf8'));
    assert.equal(state.followUp.length, nonSafeCount);
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('CLI warns on unknown platform in --use list', () => {
  const result = spawnSync(process.execPath, [
    SCRIPT, '--use', 'chatgpt,does-not-exist,linkedin', '--no-open'
  ], { encoding: 'utf8', env: { ...process.env, NODE_ENV: 'test' } });

  assert.equal(result.status, 0);
  assert.match(result.stderr, /unknown platform "does-not-exist"/);
  // The two valid ones should still be processed
  assert.match(result.stdout, /Recorded: 2/);
});

// ─── Follow-up entry shape ─────────────────────────────────────

test('follow-up entries use kind=ai-platform to distinguish from broker', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'vanish-ai-optout-'));
  const stateFile = path.join(tmpDir, 'queue-state.json');

  try {
    const result = spawnSync(process.execPath, [
      SCRIPT, '--perplexity', '--no-open', '--state-file', stateFile
    ], { encoding: 'utf8', env: { ...process.env, NODE_ENV: 'test' } });

    assert.equal(result.status, 0);
    const state = JSON.parse(fs.readFileSync(stateFile, 'utf8'));
    const entry = state.followUp[0];
    assert.equal(entry.kind, 'ai-platform');
    assert.ok(entry.id.startsWith('ai_followup_'));
    assert.ok(entry.optOutMethod); // method from catalog copied
    assert.equal(entry.status, 'pending-reverification');
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});
