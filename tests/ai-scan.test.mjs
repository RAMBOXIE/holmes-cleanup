import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { runAiScan, buildUsageFromFlags } from '../src/ai-scanner/ai-scan-engine.mjs';
import { renderAiScanReport, renderAiScanBanner } from '../src/ai-scanner/ai-scan-report.mjs';

const require = createRequire(import.meta.url);
const catalog = require('../src/ai-scanner/ai-platforms-catalog.json');

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, '..');
const SCRIPT = path.join(PROJECT_ROOT, 'scripts', 'ai-scan.mjs');

// ─── Catalog integrity ────────────────────────────────────────

test('catalog has exactly 30 platforms', () => {
  assert.equal(Object.keys(catalog.platforms).length, 30);
});

test('every platform has required fields', () => {
  for (const [key, p] of Object.entries(catalog.platforms)) {
    assert.ok(p.displayName, `${key} missing displayName`);
    assert.ok(p.category, `${key} missing category`);
    assert.ok(['chat','content','productivity','creative','email','dev'].includes(p.category),
      `${key} invalid category: ${p.category}`);
    assert.ok(['opted-in','opted-out','licensed','unclear','impossible'].includes(p.defaultConsent),
      `${key} invalid defaultConsent: ${p.defaultConsent}`);
    assert.ok(['none','easy','medium','hard','impossible'].includes(p.optOutDifficulty),
      `${key} invalid optOutDifficulty: ${p.optOutDifficulty}`);
  }
});

test('opted-in platforms all have opt-out URLs', () => {
  for (const [key, p] of Object.entries(catalog.platforms)) {
    if (p.defaultConsent === 'opted-in') {
      assert.ok(p.optOutUrl, `${key} is opted-in but has no optOutUrl`);
    }
  }
});

// ─── Engine ───────────────────────────────────────────────────

test('runAiScan classifies opted-in as exposed', () => {
  const usage = { 'linkedin': true };
  const result = runAiScan(usage, { catalog });
  const linkedin = result.exposures.find(e => e.platform === 'linkedin');
  assert.equal(linkedin.classification, 'exposed');
});

test('runAiScan classifies opted-out as safe', () => {
  const usage = { 'anthropic-claude': true };
  const result = runAiScan(usage, { catalog });
  const claude = result.exposures.find(e => e.platform === 'anthropic-claude');
  assert.equal(claude.classification, 'safe');
});

test('runAiScan classifies licensed platforms distinctly', () => {
  const usage = { 'reddit': true };
  const result = runAiScan(usage, { catalog });
  const reddit = result.exposures.find(e => e.platform === 'reddit');
  assert.equal(reddit.classification, 'licensed');
  assert.equal(result.summary.licensed, 1);
});

test('runAiScan scores all-exposed at 100', () => {
  const usage = {
    'linkedin': true,
    'twitter-x': true,
    'openai-chatgpt': true,
    'grammarly': true
  };
  const result = runAiScan(usage, { catalog });
  assert.equal(result.exposureScore, 100);
  assert.equal(result.riskLevel, 'critical');
});

test('runAiScan scores all-safe at 0', () => {
  const usage = {
    'anthropic-claude': true,
    'notion-ai': true,
    'medium': true,
    'artstation': true
  };
  const result = runAiScan(usage, { catalog });
  assert.equal(result.exposureScore, 0);
  assert.equal(result.riskLevel, 'low');
});

test('runAiScan quickWins prioritises easy opt-outs', () => {
  const usage = { 'linkedin': true, 'openai-chatgpt': true, 'grammarly': true };
  const result = runAiScan(usage, { catalog });
  assert.ok(result.quickWins.length >= 3);
  // All quickWins should be easy or medium, never hard/impossible
  for (const e of result.quickWins) {
    assert.ok(['easy','medium'].includes(e.optOutDifficulty));
  }
});

test('runAiScan throws when catalog missing', () => {
  assert.throws(() => runAiScan({ linkedin: true }), /catalog is required/);
});

test('runAiScan throws when usage is bad', () => {
  assert.throws(() => runAiScan(null, { catalog }), /usage is required/);
});

// ─── buildUsageFromFlags ──────────────────────────────────────

test('buildUsageFromFlags resolves signalAsked shortcuts', () => {
  // signalAsked for openai-chatgpt is "chatgpt"
  const usage = buildUsageFromFlags({ chatgpt: true }, catalog);
  assert.equal(usage['openai-chatgpt'], true);
});

test('buildUsageFromFlags --use flag parses CSV', () => {
  const usage = buildUsageFromFlags({ use: 'linkedin,twitter,chatgpt' }, catalog);
  assert.equal(usage['linkedin'], true);
  assert.equal(usage['twitter-x'], true);
  assert.equal(usage['openai-chatgpt'], true);
});

// ─── Report rendering ─────────────────────────────────────────

test('renderAiScanReport produces valid Markdown', () => {
  const result = runAiScan({ 'linkedin': true, 'openai-chatgpt': true }, { catalog });
  const md = renderAiScanReport(result);
  assert.match(md, /AI Training Exposure Report/);
  assert.match(md, /AI Exposure Score/);
  assert.match(md, /LinkedIn/);
});

test('renderAiScanBanner contains score and CRITICAL/HIGH/LOW', () => {
  const result = runAiScan({ 'linkedin': true, 'twitter-x': true }, { catalog });
  const banner = renderAiScanBanner(result, { color: false });
  assert.match(banner, /\d+ \/ 100/);
  assert.match(banner, /RISK/);
});

test('renderAiScanBanner width is consistent', () => {
  const result = runAiScan({ 'linkedin': true }, { catalog });
  const banner = renderAiScanBanner(result, { color: false });
  const lines = banner.split('\n');
  const first = lines[0].length;
  for (const line of lines) {
    assert.equal(line.length, first, `width mismatch: "${line}"`);
  }
});

// ─── CLI integration ──────────────────────────────────────────

test('CLI --linkedin --twitter returns score > 0', () => {
  const result = spawnSync(process.execPath, [
    SCRIPT, '--linkedin', '--twitter', '--no-color', '--no-banner', '--json'
  ], { encoding: 'utf8' });
  assert.equal(result.status, 0, `CLI failed: ${result.stderr}`);
  const parsed = JSON.parse(result.stdout);
  assert.ok(parsed.exposureScore > 0);
  assert.equal(parsed.summary.totalPlatformsChecked, 2);
});

test('CLI --use flag works', () => {
  const result = spawnSync(process.execPath, [
    SCRIPT, '--use', 'chatgpt,claude,linkedin', '--json'
  ], { encoding: 'utf8' });
  assert.equal(result.status, 0);
  const parsed = JSON.parse(result.stdout);
  assert.equal(parsed.summary.totalPlatformsChecked, 3);
});

test('CLI --all covers every platform', () => {
  const result = spawnSync(process.execPath, [
    SCRIPT, '--all', '--json'
  ], { encoding: 'utf8' });
  assert.equal(result.status, 0);
  const parsed = JSON.parse(result.stdout);
  assert.equal(parsed.summary.totalPlatformsChecked, 30);
});

test('CLI fails cleanly when no flags given', () => {
  const result = spawnSync(process.execPath, [SCRIPT], { encoding: 'utf8' });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /No platforms specified/);
});
