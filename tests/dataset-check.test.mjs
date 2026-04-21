import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  resolveDatasetKeys,
  planDatasetCheck,
  classifyExposure,
  listCommonCrawlSnapshots,
  queryCommonCrawl
} from '../src/dataset-check/dataset-check-engine.mjs';

const require = createRequire(import.meta.url);
const catalog = require('../src/dataset-check/datasets-catalog.json');

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, '..');
const SCRIPT = path.join(PROJECT_ROOT, 'scripts', 'dataset-check.mjs');

// ─── Catalog integrity ────────────────────────────────────────

test('catalog has at least 8 datasets', () => {
  assert.ok(Object.keys(catalog.datasets).length >= 8);
});

test('every dataset has required metadata', () => {
  for (const [key, d] of Object.entries(catalog.datasets)) {
    assert.ok(d.displayName, `${key} missing displayName`);
    assert.ok(d.curator, `${key} missing curator`);
    assert.ok(d.contentType, `${key} missing contentType`);
    assert.ok(d.url, `${key} missing url`);
    assert.ok(d.signalAsked, `${key} missing signalAsked`);
    assert.ok(Array.isArray(d.usedBy), `${key} usedBy must be array`);
    assert.ok(d.notes, `${key} missing notes`);
  }
});

test('common-crawl is flagged as automated', () => {
  assert.equal(catalog.datasets['common-crawl'].howToCheck.automated, true);
});

// ─── resolveDatasetKeys ───────────────────────────────────────

test('resolveDatasetKeys --all returns every dataset', () => {
  const keys = resolveDatasetKeys({ all: true }, catalog);
  assert.equal(keys.length, Object.keys(catalog.datasets).length);
});

test('resolveDatasetKeys handles signalAsked shortcuts', () => {
  const keys = resolveDatasetKeys({ 'common-crawl': true, c4: true }, catalog);
  assert.ok(keys.includes('common-crawl'));
  assert.ok(keys.includes('c4'));
});

test('resolveDatasetKeys --use csv works', () => {
  const keys = resolveDatasetKeys({ use: 'common-crawl,laion,pile' }, catalog);
  assert.deepEqual(keys.sort(), ['common-crawl', 'have-i-been-trained', 'the-pile']);
});

// ─── planDatasetCheck ─────────────────────────────────────────

test('planDatasetCheck returns dataset entries', () => {
  const plan = planDatasetCheck(['common-crawl', 'the-pile'], catalog);
  assert.equal(plan.length, 2);
  assert.equal(plan[0].key, 'common-crawl');
  assert.ok(plan[0].automated, 'common-crawl should be flagged automated');
});

// ─── classifyExposure ─────────────────────────────────────────

test('classifyExposure 0 hits → low', () => {
  assert.equal(classifyExposure(0, 5).level, 'low');
});

test('classifyExposure 3 hits → moderate', () => {
  assert.equal(classifyExposure(3, 5).level, 'moderate');
});

test('classifyExposure 20 hits → high', () => {
  assert.equal(classifyExposure(20, 5).level, 'high');
});

test('classifyExposure 100 hits → critical', () => {
  assert.equal(classifyExposure(100, 5).level, 'critical');
});

// ─── listCommonCrawlSnapshots fallback ───────────────────────

test('listCommonCrawlSnapshots falls back when fetch rejects', async () => {
  const fakeFetch = () => Promise.reject(new Error('network down'));
  const snaps = await listCommonCrawlSnapshots({ fetchImpl: fakeFetch });
  assert.ok(Array.isArray(snaps));
  assert.ok(snaps.length > 0);
  // Each snapshot has id + cdxApi
  for (const s of snaps) {
    assert.ok(s.id, 'snapshot missing id');
    assert.ok(s.cdxApi, 'snapshot missing cdxApi');
  }
});

test('listCommonCrawlSnapshots uses live data when fetch succeeds', async () => {
  const fakeFetch = () => Promise.resolve({
    ok: true,
    async json() {
      return [
        { id: 'CC-MAIN-2026-01', 'cdx-api': 'https://index.commoncrawl.org/CC-MAIN-2026-01-index' },
        { id: 'CC-MAIN-2025-52' }  // intentionally missing cdx-api — engine should synthesize
      ];
    }
  });
  const snaps = await listCommonCrawlSnapshots({ fetchImpl: fakeFetch });
  assert.equal(snaps[0].id, 'CC-MAIN-2026-01');
  assert.ok(snaps[1].cdxApi.includes('CC-MAIN-2025-52-index'));
});

// ─── queryCommonCrawl with mocked fetch ──────────────────────

test('queryCommonCrawl parses JSON lines + collects hits', async () => {
  const fakeFetch = (url) => {
    if (url.includes('CC-MAIN-2024-42-index')) {
      return Promise.resolve({
        ok: true,
        async text() {
          return [
            JSON.stringify({ timestamp: '20240801000000', url: 'https://x.com/', length: '1234', digest: 'ABC' }),
            JSON.stringify({ timestamp: '20240815000000', url: 'https://x.com/', length: '2345', digest: 'DEF' })
          ].join('\n');
        }
      });
    }
    return Promise.resolve({ ok: false, status: 404 });
  };
  const result = await queryCommonCrawl('https://x.com/', {
    snapshots: [
      { id: 'CC-MAIN-2024-42', cdxApi: 'https://index.commoncrawl.org/CC-MAIN-2024-42-index' },
      { id: 'CC-MAIN-2024-30', cdxApi: 'https://index.commoncrawl.org/CC-MAIN-2024-30-index' }
    ],
    fetchImpl: fakeFetch
  });
  assert.equal(result.hits.length, 2);
  assert.equal(result.hits[0].snapshot, 'CC-MAIN-2024-42');
  assert.equal(result.hits[0].digest, 'ABC');
  assert.equal(result.snapshotsChecked, 2);
});

test('queryCommonCrawl handles errors gracefully', async () => {
  const fakeFetch = () => Promise.reject(new Error('timeout'));
  const result = await queryCommonCrawl('https://x.com', {
    snapshots: [{ id: 'CC-MAIN-2024-42', cdxApi: 'https://x.invalid' }],
    fetchImpl: fakeFetch
  });
  assert.equal(result.hits.length, 0);
  assert.equal(result.errors.length, 1);
});

// ─── CLI integration ─────────────────────────────────────────

test('CLI --help shows usage', () => {
  const result = spawnSync(process.execPath, [SCRIPT, '--help'], { encoding: 'utf8' });
  assert.equal(result.status, 0);
  assert.match(result.stdout, /training-dataset membership/i);
  assert.match(result.stdout, /Common Crawl/);
});

test('CLI fails cleanly when no datasets specified', () => {
  const result = spawnSync(process.execPath, [SCRIPT], { encoding: 'utf8' });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /No datasets specified/);
});

test('CLI --walkthrough-only --all runs without network', () => {
  const result = spawnSync(process.execPath, [
    SCRIPT, '--walkthrough-only', '--all'
  ], { encoding: 'utf8', env: { ...process.env, NODE_ENV: 'test' }, timeout: 15000 });

  assert.equal(result.status, 0, `failed: ${result.stderr}`);
  assert.match(result.stdout, /Common Crawl/);
  assert.match(result.stdout, /How to check manually|No opt-out mechanism/);
});

test('CLI --pile shows walkthrough without network', () => {
  const result = spawnSync(process.execPath, [
    SCRIPT, '--pile', '--walkthrough-only'
  ], { encoding: 'utf8', env: { ...process.env, NODE_ENV: 'test' }, timeout: 15000 });

  assert.equal(result.status, 0);
  assert.match(result.stdout, /The Pile/);
  assert.match(result.stdout, /pushshift|Pushshift/);
});

test('CLI --laion walkthrough mentions Have I Been Trained', () => {
  const result = spawnSync(process.execPath, [
    SCRIPT, '--laion', '--walkthrough-only'
  ], { encoding: 'utf8', env: { ...process.env, NODE_ENV: 'test' }, timeout: 15000 });

  assert.equal(result.status, 0);
  assert.match(result.stdout, /LAION/);
  assert.match(result.stdout, /haveibeentrained/);
});
