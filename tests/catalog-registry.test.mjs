import test from 'node:test';
import assert from 'node:assert/strict';

import { listBrokerAdapters, getBrokerAdapter, getBrokerAdapters } from '../src/adapters/registry.mjs';
import { loadPresetParams } from '../src/presets.mjs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');

test('catalog registers exactly 23 brokers', () => {
  const all = listBrokerAdapters();
  assert.equal(all.length, 23);
});

test('every adapter has required shape', () => {
  const adapters = getBrokerAdapters();
  for (const a of adapters) {
    assert.equal(typeof a.name, 'string', `${a.name} missing name`);
    assert.equal(typeof a.displayName, 'string', `${a.name} missing displayName`);
    assert.equal(typeof a.prepareRequest, 'function', `${a.name} missing prepareRequest`);
    assert.equal(typeof a.submit, 'function', `${a.name} missing submit`);
    assert.equal(typeof a.parseResult, 'function', `${a.name} missing parseResult`);
    assert.ok(a.meta, `${a.name} missing meta`);
    assert.ok(['people-search', 'background-check', 'phone-lookup', 'public-records',
      'marketing-data', 'financial', 'location-data', 'email-data',
      'social-media', 'reputation', 'property', 'identity-resolution'
    ].includes(a.meta.category), `${a.name} has invalid category: ${a.meta.category}`);
  }
});

test('8 live-capable adapters preserved', () => {
  const liveNames = ['spokeo', 'thatsthem', 'peekyou', 'addresses', 'cocofinder', 'checkpeople', 'familytreenow', 'usphonebook'];
  for (const name of liveNames) {
    const adapter = getBrokerAdapter(name);
    assert.equal(adapter.liveCapable, true, `${name} should be liveCapable`);
    assert.equal(adapter.dryRun, false, `${name} should not be dryRun`);
  }
});

test('dry-run adapters return correct submissions', async () => {
  const adapter = getBrokerAdapter('whitepages');
  const request = adapter.prepareRequest({ requestId: 'cat-test-1', person: { fullName: 'Test' } });
  const submission = await adapter.submit(request, {});
  assert.equal(submission.dryRun, true);
  assert.equal(submission.status, 'submitted');
});

test('preset loads from catalog for broker', () => {
  const preset = loadPresetParams('whitepages', { cwd: projectRoot });
  assert.equal(preset.preset, 'whitepages');
  assert.equal(preset.type, 'broker');
  assert.equal(preset.broker, 'whitepages');
  assert.ok(preset.keywords.includes('whitepages'));
});

test('no duplicate broker names', () => {
  const all = listBrokerAdapters();
  const unique = new Set(all);
  assert.equal(unique.size, all.length, 'Duplicate broker names detected');
});

test('category distribution meets targets', () => {
  const adapters = getBrokerAdapters();
  const cats = {};
  for (const a of adapters) {
    const cat = a.meta?.category || 'unknown';
    cats[cat] = (cats[cat] || 0) + 1;
  }
  assert.ok(cats['people-search'] >= 10, `people-search should be >= 10, got ${cats['people-search']}`);
  assert.ok(!cats['unknown'], 'No broker should have unknown category');
});
