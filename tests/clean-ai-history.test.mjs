import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  expandPath,
  resolveToolPaths,
  statPath,
  formatBytes,
  planToolCleanup,
  resolveToolKeys
} from '../src/ai-history/history-engine.mjs';

const require = createRequire(import.meta.url);
const catalog = require('../src/ai-history/history-catalog.json');

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, '..');
const SCRIPT = path.join(PROJECT_ROOT, 'scripts', 'clean-ai-history.mjs');

// ─── Catalog integrity ────────────────────────────────────────

test('catalog has >=8 tools', () => {
  assert.ok(Object.keys(catalog.tools).length >= 8);
});

test('every tool has required metadata', () => {
  for (const [key, t] of Object.entries(catalog.tools)) {
    assert.ok(t.displayName, `${key} missing displayName`);
    assert.ok(['local-app', 'web-ui'].includes(t.category), `${key} invalid category`);
    assert.ok(t.signalAsked, `${key} missing signalAsked`);
    assert.ok(t.notes, `${key} missing notes`);
  }
});

test('local-app tools have paths for all 3 OSes', () => {
  for (const [key, t] of Object.entries(catalog.tools)) {
    if (t.category !== 'local-app') continue;
    assert.ok(t.paths, `${key} missing paths`);
    for (const os of ['win32', 'darwin', 'linux']) {
      assert.ok(Array.isArray(t.paths[os]) && t.paths[os].length > 0,
        `${key} missing ${os} paths`);
    }
    assert.ok(t.deleteCommands, `${key} missing deleteCommands`);
  }
});

test('web-ui tools have url + walkthrough', () => {
  for (const [key, t] of Object.entries(catalog.tools)) {
    if (t.category !== 'web-ui') continue;
    assert.ok(t.url, `${key} missing url`);
    assert.ok(Array.isArray(t.walkthrough) && t.walkthrough.length > 0,
      `${key} missing walkthrough`);
  }
});

// ─── expandPath ──────────────────────────────────────────────

test('expandPath resolves ~/ on Unix-style paths', () => {
  const home = '/home/test';
  assert.equal(expandPath('~/Library', { platform: 'darwin', homeDir: home }), '/home/test/Library');
});

test('expandPath resolves %APPDATA% on Windows', () => {
  const result = expandPath('%APPDATA%\\Cursor', {
    platform: 'win32',
    env: { APPDATA: 'C:\\Users\\test\\AppData\\Roaming' },
    homeDir: 'C:\\Users\\test'
  });
  assert.equal(result, 'C:\\Users\\test\\AppData\\Roaming\\Cursor');
});

test('expandPath falls back when APPDATA missing', () => {
  const result = expandPath('%APPDATA%\\X', {
    platform: 'win32',
    env: {},
    homeDir: 'C:\\Users\\test'
  });
  // Should fall back to HOME\AppData\Roaming
  assert.match(result, /AppData[\\/]Roaming[\\/]X/);
});

// ─── resolveToolPaths ────────────────────────────────────────

test('resolveToolPaths returns platform-specific paths', () => {
  const tool = catalog.tools['cursor'];
  const paths = resolveToolPaths(tool, {
    platform: 'linux',
    env: {},
    homeDir: '/home/x'
  });
  assert.ok(paths.length > 0);
  for (const p of paths) {
    assert.ok(p.startsWith('/home/x/'), `${p} should start with home dir`);
  }
});

// ─── statPath ────────────────────────────────────────────────

test('statPath returns exists=false for non-existent path', () => {
  const result = statPath('/this/path/definitely/does/not/exist/xyz-' + Date.now());
  assert.equal(result.exists, false);
  assert.equal(result.bytes, 0);
});

test('statPath handles real directory', () => {
  // Use the tests directory itself
  const result = statPath(__dirname);
  assert.equal(result.exists, true);
  assert.equal(result.isDirectory, true);
  assert.ok(result.items > 0);
});

// ─── formatBytes ─────────────────────────────────────────────

test('formatBytes formats units correctly', () => {
  assert.equal(formatBytes(0), '0 B');
  assert.equal(formatBytes(500), '500 B');
  assert.equal(formatBytes(2048), '2.0 KB');
  assert.equal(formatBytes(1024 * 1024 * 5), '5.0 MB');
  assert.equal(formatBytes(1024 * 1024 * 1024 * 3), '3.0 GB');
});

// ─── resolveToolKeys ────────────────────────────────────────

test('resolveToolKeys --all returns every tool', () => {
  const keys = resolveToolKeys({ all: true }, catalog);
  assert.equal(keys.length, Object.keys(catalog.tools).length);
});

test('resolveToolKeys handles signalAsked shortcuts', () => {
  const keys = resolveToolKeys({ cursor: true, chatgpt: true }, catalog);
  assert.ok(keys.includes('cursor'));
  assert.ok(keys.includes('chatgpt-web'));
});

test('resolveToolKeys --local-only filters to local-app tools', () => {
  const keys = resolveToolKeys({ all: true, 'local-only': true }, catalog);
  for (const k of keys) {
    assert.equal(catalog.tools[k].category, 'local-app');
  }
});

test('resolveToolKeys --web-only filters to web-ui tools', () => {
  const keys = resolveToolKeys({ all: true, 'web-only': true }, catalog);
  for (const k of keys) {
    assert.equal(catalog.tools[k].category, 'web-ui');
  }
});

test('resolveToolKeys --use csv resolves shortcuts', () => {
  const keys = resolveToolKeys({ use: 'cursor,chatgpt,claude' }, catalog);
  assert.ok(keys.includes('cursor'));
  assert.ok(keys.includes('chatgpt-web'));
  assert.ok(keys.includes('claude-web'));
});

// ─── planToolCleanup ──────────────────────────────────────────

test('planToolCleanup for local-app returns path stats', () => {
  const tool = catalog.tools['cursor'];
  const plan = planToolCleanup(tool);
  assert.equal(plan.category, 'local-app');
  assert.ok(Array.isArray(plan.existingPaths));
  assert.ok(plan.deleteCommand); // should have one for current OS
});

test('planToolCleanup for web-ui returns walkthrough', () => {
  const tool = catalog.tools['chatgpt-web'];
  const plan = planToolCleanup(tool);
  assert.equal(plan.category, 'web-ui');
  assert.ok(Array.isArray(plan.walkthrough) && plan.walkthrough.length > 0);
  assert.ok(plan.url);
});

// ─── CLI integration ─────────────────────────────────────────

test('CLI --help shows usage', () => {
  const result = spawnSync(process.execPath, [SCRIPT, '--help'], { encoding: 'utf8' });
  assert.equal(result.status, 0);
  assert.match(result.stdout, /clean-ai-history|AI history|cleanup/i);
  assert.match(result.stdout, /--cursor/);
  assert.match(result.stdout, /--chatgpt/);
});

test('CLI fails cleanly when no tools selected', () => {
  const result = spawnSync(process.execPath, [SCRIPT], { encoding: 'utf8' });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /No tools specified/);
});

test('CLI --cursor --no-open shows paths + delete command', () => {
  const result = spawnSync(process.execPath, [
    SCRIPT, '--cursor', '--no-open'
  ], { encoding: 'utf8', env: { ...process.env, NODE_ENV: 'test' } });

  assert.equal(result.status, 0, `failed: ${result.stderr}`);
  assert.match(result.stdout, /Cursor/);
  // Either shows paths with sizes, OR "no cache found" — both are valid depending on whether Cursor is installed on CI
  const hasPathsOrNoCache = /Total local cache:|No cache found/.test(result.stdout);
  assert.ok(hasPathsOrNoCache, 'should show either cache details or "no cache found"');
});

test('CLI --chatgpt --no-open shows web walkthrough', () => {
  const result = spawnSync(process.execPath, [
    SCRIPT, '--chatgpt', '--no-open'
  ], { encoding: 'utf8', env: { ...process.env, NODE_ENV: 'test' } });

  assert.equal(result.status, 0);
  assert.match(result.stdout, /ChatGPT \(web\)/);
  assert.match(result.stdout, /Steps:/);
  assert.match(result.stdout, /Export data/);
});

test('CLI --all --local-only filters to local tools', () => {
  const result = spawnSync(process.execPath, [
    SCRIPT, '--all', '--local-only', '--no-open'
  ], { encoding: 'utf8', env: { ...process.env, NODE_ENV: 'test' } });

  assert.equal(result.status, 0);
  // ChatGPT web (category: web-ui) should NOT appear in --local-only
  const hasWebChatGPT = /ChatGPT \(web\)/.test(result.stdout);
  assert.equal(hasWebChatGPT, false, 'web-ui tools should be excluded by --local-only');
});

test('CLI --all --web-only filters to web tools', () => {
  const result = spawnSync(process.execPath, [
    SCRIPT, '--all', '--web-only', '--no-open'
  ], { encoding: 'utf8', env: { ...process.env, NODE_ENV: 'test' } });

  assert.equal(result.status, 0);
  // Cursor (category: local-app) should NOT appear in --web-only
  const hasCursor = /━━━ Cursor \(cursor\) ━━━/.test(result.stdout);
  assert.equal(hasCursor, false, 'local-app tools should be excluded by --web-only');
});
