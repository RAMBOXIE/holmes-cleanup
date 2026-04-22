import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { resolveServiceKeys, planFaceScan, planFaceOptOut, listServices } from '../src/face-scanner/face-scan-engine.mjs';

const require = createRequire(import.meta.url);
const catalog = require('../src/face-scanner/face-services-catalog.json');

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, '..');
const SCAN_SCRIPT = path.join(PROJECT_ROOT, 'scripts', 'face-scan.mjs');
const OPTOUT_SCRIPT = path.join(PROJECT_ROOT, 'scripts', 'face-opt-out.mjs');

// ─── Catalog integrity ────────────────────────────────────────

test('catalog has 8 services', () => {
  assert.equal(Object.keys(catalog.services).length, 8);
});

test('every service has required metadata', () => {
  for (const [key, s] of Object.entries(catalog.services)) {
    assert.ok(s.displayName, `${key} missing displayName`);
    assert.ok(['face-search', 'reverse-image', 'face-database'].includes(s.category), `${key} invalid category`);
    assert.ok(['free', 'freemium', 'paid', 'restricted'].includes(s.accessModel), `${key} invalid accessModel`);
    assert.ok(s.jurisdiction, `${key} missing jurisdiction`);
    assert.ok(s.knownFor, `${key} missing knownFor`);
    assert.ok(s.signalAsked, `${key} missing signalAsked`);
    assert.equal(typeof s.estimatedSeconds, 'number', `${key}.estimatedSeconds must be number`);
  }
});

test('scannable services have scanWalkthrough with steps', () => {
  for (const [key, s] of Object.entries(catalog.services)) {
    if (s.accessModel === 'restricted') continue; // clearview — not scannable
    assert.ok(s.scanWalkthrough, `${key} missing scanWalkthrough`);
    assert.ok(Array.isArray(s.scanWalkthrough.steps) && s.scanWalkthrough.steps.length > 0,
      `${key}.scanWalkthrough.steps must be non-empty`);
    assert.ok(s.scanWalkthrough.verification, `${key}.scanWalkthrough.verification required`);
  }
});

test('every service has an optOutWalkthrough', () => {
  for (const [key, s] of Object.entries(catalog.services)) {
    assert.ok(s.optOutWalkthrough, `${key} missing optOutWalkthrough`);
    assert.ok(Array.isArray(s.optOutWalkthrough.steps) && s.optOutWalkthrough.steps.length > 0,
      `${key}.optOutWalkthrough.steps must be non-empty`);
  }
});

test('at least 4 face services have sources citing official policy / regulatory URLs', () => {
  const withSources = Object.entries(catalog.services)
    .filter(([, s]) => Array.isArray(s.sources) && s.sources.length > 0);
  assert.ok(withSources.length >= 4,
    `Expected >=4 face services with sources, got ${withSources.length}`);
});

test('every face service source entry has url + label + verifiedAt', () => {
  for (const [key, s] of Object.entries(catalog.services)) {
    if (!s.sources) continue;
    for (const src of s.sources) {
      assert.ok(/^https?:\/\//.test(src.url), `${key}.sources has non-URL: ${src.url}`);
      assert.ok(typeof src.label === 'string' && src.label.length > 0, `${key}.sources missing label`);
      assert.ok(/^\d{4}-\d{2}-\d{2}$/.test(src.verifiedAt), `${key}.sources invalid verifiedAt: ${src.verifiedAt}`);
    }
  }
});

test('clearview is restricted-access with null scanWalkthrough', () => {
  const cv = catalog.services['clearview-ai'];
  assert.equal(cv.accessModel, 'restricted');
  assert.equal(cv.scanWalkthrough, null);
  assert.ok(cv.optOutWalkthrough, 'clearview must still have opt-out walkthrough');
});

// ─── Engine ───────────────────────────────────────────────────

test('resolveServiceKeys handles signalAsked shortcuts', () => {
  const keys = resolveServiceKeys({ pimeyes: true, facecheck: true }, catalog);
  assert.ok(keys.includes('pimeyes'));
  assert.ok(keys.includes('facecheck-id'));
});

test('resolveServiceKeys handles --use csv', () => {
  const keys = resolveServiceKeys({ use: 'pimeyes,lenso,tineye' }, catalog);
  assert.deepEqual(keys.sort(), ['lenso', 'pimeyes', 'tineye']);
});

test('resolveServiceKeys --all covers every service', () => {
  const keys = resolveServiceKeys({ all: true }, catalog);
  assert.equal(keys.length, 8);
});

test('planFaceScan excludes services without scanWalkthrough', () => {
  const keys = ['pimeyes', 'clearview-ai'];
  const { plan, unscannable } = planFaceScan(keys, catalog);
  assert.equal(plan.length, 1);
  assert.equal(plan[0].key, 'pimeyes');
  assert.equal(unscannable.length, 1);
  assert.equal(unscannable[0].key, 'clearview-ai');
});

test('planFaceOptOut includes every selected service that has opt-out', () => {
  const keys = ['pimeyes', 'clearview-ai', 'tineye'];
  const plan = planFaceOptOut(keys, catalog);
  assert.equal(plan.length, 3);
});

test('listServices filters by accessModel', () => {
  const freeServices = listServices(catalog, { accessModel: 'free' });
  assert.ok(freeServices.length >= 2); // tineye, yandex, google-lens
  for (const s of freeServices) {
    assert.equal(s.accessModel, 'free');
  }
});

// ─── face-scan CLI ────────────────────────────────────────────

test('face-scan --help shows services', () => {
  const result = spawnSync(process.execPath, [SCAN_SCRIPT, '--help'], { encoding: 'utf8' });
  assert.equal(result.status, 0);
  assert.match(result.stdout, /PimEyes/);
  assert.match(result.stdout, /Clearview/);
});

test('face-scan fails cleanly when no services selected', () => {
  const result = spawnSync(process.execPath, [SCAN_SCRIPT], { encoding: 'utf8' });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /No services specified/);
});

test('face-scan --pimeyes --no-open prints walkthrough', () => {
  const result = spawnSync(process.execPath, [
    SCAN_SCRIPT, '--pimeyes', '--no-open'
  ], { encoding: 'utf8', env: { ...process.env, NODE_ENV: 'test' } });

  assert.equal(result.status, 0, `failed: ${result.stderr}`);
  assert.match(result.stdout, /PimEyes/);
  assert.match(result.stdout, /Upload your photo/);
  assert.match(result.stdout, /Scanned: 1/);
});

test('face-scan --all surfaces unscannable clearview', () => {
  const result = spawnSync(process.execPath, [
    SCAN_SCRIPT, '--all', '--no-open'
  ], { encoding: 'utf8', env: { ...process.env, NODE_ENV: 'test' } });

  assert.equal(result.status, 0);
  assert.match(result.stdout, /no public search/);
  assert.match(result.stdout, /Clearview AI/);
  // 8 total services, 7 scannable (clearview excluded)
  assert.match(result.stdout, /Scanned: 7/);
});

test('face-scan --free-only filters out paid-only services', () => {
  const result = spawnSync(process.execPath, [
    SCAN_SCRIPT, '--all', '--free-only', '--no-open'
  ], { encoding: 'utf8', env: { ...process.env, NODE_ENV: 'test' } });

  assert.equal(result.status, 0);
  // findclone is paid-only, should be filtered
  const lines = result.stdout.split('\n');
  const hasFindclone = lines.some(l => l.includes('FindClone') && l.includes('━━━'));
  assert.equal(hasFindclone, false, '--free-only should exclude FindClone (paid)');
});

// ─── face-opt-out CLI ─────────────────────────────────────────

test('face-opt-out --help lists services', () => {
  const result = spawnSync(process.execPath, [OPTOUT_SCRIPT, '--help'], { encoding: 'utf8' });
  assert.equal(result.status, 0);
  assert.match(result.stdout, /PimEyes/);
  assert.match(result.stdout, /Clearview/);
});

test('face-opt-out fails cleanly when no services selected', () => {
  const result = spawnSync(process.execPath, [OPTOUT_SCRIPT], { encoding: 'utf8' });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /No services specified/);
});

test('face-opt-out records follow-up entry for pimeyes', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'vanish-face-optout-'));
  const stateFile = path.join(tmpDir, 'queue-state.json');

  try {
    const result = spawnSync(process.execPath, [
      OPTOUT_SCRIPT, '--pimeyes', '--no-open', '--state-file', stateFile
    ], { encoding: 'utf8', env: { ...process.env, NODE_ENV: 'test' } });

    assert.equal(result.status, 0, `failed: ${result.stderr}`);
    assert.match(result.stdout, /Recorded: 1/);

    const state = JSON.parse(fs.readFileSync(stateFile, 'utf8'));
    assert.equal(state.followUp.length, 1);
    const entry = state.followUp[0];
    assert.equal(entry.kind, 'face-service');
    assert.equal(entry.service, 'pimeyes');
    assert.ok(entry.id.startsWith('face_followup_'));

    const auditEntry = state.audit.find(e => e.event === 'face_opt_out_submitted_by_user');
    assert.ok(auditEntry, 'audit entry missing');
    assert.ok(auditEntry.signature, 'audit entry not signed');
    assert.equal(auditEntry.service, 'pimeyes');
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('face-opt-out clearview schedules 60-day reverify (vs 30 for others)', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'vanish-face-optout-'));
  const stateFile = path.join(tmpDir, 'queue-state.json');

  try {
    const result = spawnSync(process.execPath, [
      OPTOUT_SCRIPT, '--clearview', '--pimeyes', '--no-open', '--state-file', stateFile
    ], { encoding: 'utf8', env: { ...process.env, NODE_ENV: 'test' } });

    assert.equal(result.status, 0);
    const state = JSON.parse(fs.readFileSync(stateFile, 'utf8'));
    assert.equal(state.followUp.length, 2);

    const clearview = state.followUp.find(e => e.service === 'clearview-ai');
    const pimeyes = state.followUp.find(e => e.service === 'pimeyes');

    const cvDays = (new Date(clearview.recheckAt) - new Date(clearview.submittedAt)) / (24 * 60 * 60 * 1000);
    const peDays = (new Date(pimeyes.recheckAt) - new Date(pimeyes.submittedAt)) / (24 * 60 * 60 * 1000);

    assert.ok(Math.abs(cvDays - 60) < 1, `clearview reverify should be ~60 days, got ${cvDays}`);
    assert.ok(Math.abs(peDays - 30) < 1, `pimeyes reverify should be ~30 days, got ${peDays}`);
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('face-opt-out --all covers all 8 services', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'vanish-face-optout-'));
  const stateFile = path.join(tmpDir, 'queue-state.json');

  try {
    const result = spawnSync(process.execPath, [
      OPTOUT_SCRIPT, '--all', '--no-open', '--state-file', stateFile
    ], { encoding: 'utf8', env: { ...process.env, NODE_ENV: 'test' } });

    assert.equal(result.status, 0);
    assert.match(result.stdout, /Recorded: 8/);
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});
