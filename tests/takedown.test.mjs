import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  selectJurisdictionClause,
  renderLegalLetter,
  resolveLeakSiteKeys,
  planDmcaNotices
} from '../src/takedown/takedown-engine.mjs';

const require = createRequire(import.meta.url);
const catalog = require('../src/takedown/takedown-catalog.json');

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, '..');
const SCRIPT = path.join(PROJECT_ROOT, 'scripts', 'takedown.mjs');

// ─── Catalog integrity ────────────────────────────────────────

test('catalog has required top-level sections', () => {
  assert.ok(catalog.jurisdictions);
  assert.ok(catalog.leakSites);
  assert.ok(catalog.searchEngines);
  assert.ok(catalog.hashRegistries);
  assert.ok(catalog.legalTemplates);
  assert.ok(catalog.support);
});

test('catalog has at least 10 leak sites', () => {
  assert.ok(Object.keys(catalog.leakSites).length >= 10);
});

test('every leak site has required fields', () => {
  for (const [key, s] of Object.entries(catalog.leakSites)) {
    assert.ok(s.displayName, `${key} missing displayName`);
    assert.ok(s.abuseContact, `${key} missing abuseContact`);
    assert.ok(['easy', 'easy-to-medium', 'medium', 'hard'].includes(s.takedownDifficulty),
      `${key} invalid takedownDifficulty`);
    assert.ok(s.approach, `${key} missing approach`);
    assert.ok(s.signalAsked, `${key} missing signalAsked`);
  }
});

test('catalog has all 4 legal templates', () => {
  assert.ok(catalog.legalTemplates['dmca-takedown']);
  assert.ok(catalog.legalTemplates['cease-and-desist']);
  assert.ok(catalog.legalTemplates['police-report']);
  assert.ok(catalog.legalTemplates['civil-pre-suit']);
});

test('catalog has hashRegistries including stopncii', () => {
  assert.ok(catalog.hashRegistries.stopncii);
  assert.ok(catalog.hashRegistries.stopncii.walkthrough);
  // StopNCII privacy note is critical — must say hashes, not images
  assert.match(catalog.hashRegistries.stopncii.privacyNote, /hashes/i);
  assert.match(catalog.hashRegistries.stopncii.privacyNote, /do not leave your device|never.*upload/i);
});

test('search engines include google-intimate (NOT just general Google)', () => {
  assert.ok(catalog.searchEngines['google-intimate']);
  assert.match(catalog.searchEngines['google-intimate'].displayName, /intimate/i);
});

test('support resources include CCRI hotline', () => {
  assert.ok(catalog.support['ccri-hotline']);
  assert.match(catalog.support['ccri-hotline'].contact, /1-844-878/);
});

// ─── selectJurisdictionClause ─────────────────────────────────

test('selectJurisdictionClause EU returns GDPR Article 17', () => {
  const clause = selectJurisdictionClause({ jurisdiction: 'EU' }, catalog);
  assert.match(clause, /GDPR Article 17/);
});

test('selectJurisdictionClause UK mentions Online Safety Act', () => {
  const clause = selectJurisdictionClause({ jurisdiction: 'UK' }, catalog);
  assert.match(clause, /Online Safety Act/);
});

test('selectJurisdictionClause SHIELD cites Shield Act', () => {
  const clause = selectJurisdictionClause({ jurisdiction: 'SHIELD' }, catalog);
  assert.match(clause, /Shield Act|2261A/);
});

test('selectJurisdictionClause CA cites Canadian Criminal Code', () => {
  const clause = selectJurisdictionClause({ jurisdiction: 'CA' }, catalog);
  assert.match(clause, /Canada.*Criminal Code|162\.1/);
});

test('selectJurisdictionClause default returns generic text', () => {
  const clause = selectJurisdictionClause({}, catalog);
  assert.match(clause, /applicable/i);
});

// ─── renderLegalLetter ────────────────────────────────────────

test('renderLegalLetter dmca-takedown substitutes core vars', () => {
  const rendered = renderLegalLetter('dmca-takedown', {
    yourName: 'Jane Doe',
    yourEmail: 'jane@example.com',
    recipientEmail: 'abuse@site.com',
    infringingUrls: 'https://site.com/abc\nhttps://site.com/def'
  }, catalog);
  assert.match(rendered.letter, /Jane Doe/);
  assert.match(rendered.letter, /jane@example\.com/);
  assert.match(rendered.letter, /abuse@site\.com/);
  assert.match(rendered.letter, /site\.com\/abc/);
  assert.match(rendered.letter, /17 U\.S\.C\./);
});

test('renderLegalLetter cease-and-desist uses jurisdictionClause', () => {
  const rendered = renderLegalLetter('cease-and-desist', {
    recipientName: 'John Smith',
    jurisdictionClause: 'GDPR Article 17 right to erasure'
  }, catalog);
  assert.match(rendered.letter, /John Smith/);
  assert.match(rendered.letter, /GDPR Article 17 right to erasure/);
});

test('renderLegalLetter fills today automatically', () => {
  const rendered = renderLegalLetter('dmca-takedown', {}, catalog);
  const today = new Date().toISOString().slice(0, 10);
  assert.match(rendered.letter, new RegExp(today));
});

test('renderLegalLetter throws on unknown template key', () => {
  assert.throws(() => renderLegalLetter('does-not-exist', {}, catalog));
});

test('renderLegalLetter leaves unfilled placeholders readable', () => {
  // Without providing yourName, it should default to "[your name]"
  const rendered = renderLegalLetter('dmca-takedown', {}, catalog);
  assert.match(rendered.letter, /\[your name\]/);
});

// ─── resolveLeakSiteKeys ──────────────────────────────────────

test('resolveLeakSiteKeys --all-leak-sites returns every site', () => {
  const keys = resolveLeakSiteKeys({ 'all-leak-sites': true }, catalog);
  assert.equal(keys.length, Object.keys(catalog.leakSites).length);
});

test('resolveLeakSiteKeys handles signalAsked shortcuts', () => {
  const keys = resolveLeakSiteKeys({ coomer: true, kemono: true }, catalog);
  assert.ok(keys.includes('coomer'));
  assert.ok(keys.includes('kemono'));
});

test('resolveLeakSiteKeys --use csv', () => {
  const keys = resolveLeakSiteKeys({ use: 'coomer,thothub,erome' }, catalog);
  assert.deepEqual(keys.sort(), ['coomer', 'erome', 'thothub']);
});

// ─── planDmcaNotices ──────────────────────────────────────────

test('planDmcaNotices generates one notice per site', () => {
  const notices = planDmcaNotices(['coomer', 'thothub'], catalog, {
    name: 'Alice',
    email: 'alice@example.com'
  });
  assert.equal(notices.length, 2);
  for (const n of notices) {
    assert.ok(n.letter);
    assert.match(n.letter, /Alice/);
    assert.match(n.letter, /DMCA/);
  }
});

test('planDmcaNotices includes site-specific abuse contact', () => {
  const notices = planDmcaNotices(['thothub'], catalog, {});
  assert.match(notices[0].letter, /dmca@thothub\.tv/);
});

// ─── CLI integration ─────────────────────────────────────────

test('CLI --help lists hash registries and legal templates', () => {
  const result = spawnSync(process.execPath, [SCRIPT, '--help'], { encoding: 'utf8' });
  assert.equal(result.status, 0);
  assert.match(result.stdout, /StopNCII\.org/);
  assert.match(result.stdout, /--dmca-letter/);
  assert.match(result.stdout, /--cease-and-desist/);
});

test('CLI --help includes crisis-line phone numbers', () => {
  const result = spawnSync(process.execPath, [SCRIPT, '--help'], { encoding: 'utf8' });
  assert.equal(result.status, 0);
  assert.match(result.stdout, /1-844-878/);
});

test('CLI --list shows leak-site abuse contacts', () => {
  const result = spawnSync(process.execPath, [SCRIPT, '--list'], { encoding: 'utf8' });
  assert.equal(result.status, 0);
  assert.match(result.stdout, /coomer/);
  assert.match(result.stdout, /dmca@thothub/);
});

test('CLI --support shows crisis resources', () => {
  const result = spawnSync(process.execPath, [SCRIPT, '--support'], { encoding: 'utf8' });
  assert.equal(result.status, 0);
  assert.match(result.stdout, /Cyber Civil Rights/);
  assert.match(result.stdout, /Revenge Porn Helpline/);
});

test('CLI --stopncii --no-open shows StopNCII walkthrough', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'vanish-takedown-'));
  const stateFile = path.join(tmpDir, 'queue-state.json');
  try {
    const result = spawnSync(process.execPath, [
      SCRIPT, '--stopncii', '--no-open', '--state-file', stateFile
    ], { encoding: 'utf8', env: { ...process.env, NODE_ENV: 'test' } });
    assert.equal(result.status, 0, `failed: ${result.stderr}`);
    assert.match(result.stdout, /StopNCII\.org/);
    assert.match(result.stdout, /hashes/i);
    assert.match(result.stdout, /Actions drafted: 1/);

    const state = JSON.parse(fs.readFileSync(stateFile, 'utf8'));
    const audit = state.audit.find(e => e.event === 'takedown_action_drafted' && e.kind === 'takedown-hash-registry');
    assert.ok(audit);
    assert.equal(audit.target, 'stopncii');
    assert.ok(audit.signature);
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('CLI --dmca-letter --coomer --kemono --no-open writes to output file', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'vanish-takedown-'));
  const stateFile = path.join(tmpDir, 'queue-state.json');
  const outFile = path.join(tmpDir, 'dmca.md');
  try {
    const result = spawnSync(process.execPath, [
      SCRIPT, '--dmca-letter', '--coomer', '--kemono',
      '--name', 'Test User', '--email', 'test@x.com',
      '--no-open', '--state-file', stateFile, '--output', outFile
    ], { encoding: 'utf8', env: { ...process.env, NODE_ENV: 'test' } });
    assert.equal(result.status, 0);
    assert.ok(fs.existsSync(outFile));
    const content = fs.readFileSync(outFile, 'utf8');
    assert.match(content, /coomer/i);
    assert.match(content, /kemono/i);
    assert.match(content, /Test User/);
    assert.match(content, /DMCA/);
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('CLI with no actions exits with help message', () => {
  const result = spawnSync(process.execPath, [SCRIPT], { encoding: 'utf8' });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /No actions specified/);
});

test('CLI --google-intimate --no-open records audit + shows form URL', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'vanish-takedown-'));
  const stateFile = path.join(tmpDir, 'queue-state.json');
  try {
    const result = spawnSync(process.execPath, [
      SCRIPT, '--google-intimate', '--no-open', '--state-file', stateFile
    ], { encoding: 'utf8', env: { ...process.env, NODE_ENV: 'test' } });
    assert.equal(result.status, 0);
    assert.match(result.stdout, /Google.*intimate/i);
    assert.match(result.stdout, /support\.google\.com/);

    const state = JSON.parse(fs.readFileSync(stateFile, 'utf8'));
    const audit = state.audit.find(e => e.kind === 'takedown-search-engine' && e.target === 'google-intimate');
    assert.ok(audit);
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('CLI --cease-and-desist --jurisdiction SHIELD cites Shield Act', () => {
  const result = spawnSync(process.execPath, [
    SCRIPT, '--cease-and-desist', '--jurisdiction', 'SHIELD',
    '--name', 'Alice', '--no-open'
  ], { encoding: 'utf8', env: { ...process.env, NODE_ENV: 'test' } });
  assert.equal(result.status, 0);
  // Either Shield Act or 2261A — selectJurisdictionClause returns one of them
  assert.match(result.stdout, /Shield Act|2261A/);
});
