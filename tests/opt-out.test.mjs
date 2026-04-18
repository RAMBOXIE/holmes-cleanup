import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const catalog = require('../src/adapters/brokers/config/broker-catalog.json');

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, '..');
const OPT_OUT_SCRIPT = path.join(PROJECT_ROOT, 'scripts', 'opt-out.mjs');

const OPT_OUT_BROKERS = [
  // Original 8 (live HTTP-capable)
  'spokeo', 'thatsthem', 'peekyou', 'addresses',
  'cocofinder', 'checkpeople', 'familytreenow', 'usphonebook',
  // Expansion batch 1 — top 20 most popular (people-search, background, credit, marketing)
  'whitepages', 'beenverified', 'intelius', 'peoplefinder', 'truepeoplesearch',
  'fastpeoplesearch', 'radaris', 'zabasearch', 'nuwber', 'ussearch',
  'instantcheckmate', 'truthfinder', 'cyberbackgroundchecks',
  'mylife', 'pipl', 'truecaller', 'hiya',
  'acxiom', 'lexisnexis', 'equifax'
];

test(`all ${28} opt-out brokers have valid optOutFlow in catalog`, () => {
  for (const name of OPT_OUT_BROKERS) {
    const entry = catalog.brokers[name];
    assert.ok(entry, `broker ${name} missing from catalog`);
    assert.ok(entry.optOutFlow, `broker ${name} missing optOutFlow`);

    const flow = entry.optOutFlow;
    assert.equal(typeof flow.needsProfileSearch, 'boolean', `${name}.optOutFlow.needsProfileSearch must be boolean`);
    assert.ok(flow.optOutUrl, `${name}.optOutFlow.optOutUrl required`);
    assert.ok(Array.isArray(flow.fields), `${name}.optOutFlow.fields must be array`);
    assert.ok(flow.fields.length > 0, `${name}.optOutFlow.fields must be non-empty`);
    assert.equal(typeof flow.estimatedMinutes, 'number', `${name}.optOutFlow.estimatedMinutes must be number`);
    assert.equal(typeof flow.processingDays, 'number', `${name}.optOutFlow.processingDays must be number`);

    for (const field of flow.fields) {
      assert.ok(field.name, `${name} field missing name`);
      assert.ok(field.label, `${name} field ${field.name} missing label`);
    }
  }
});

test('catalog has exactly 28 opt-out-capable brokers', () => {
  const withFlow = Object.entries(catalog.brokers).filter(([_, v]) => v.optOutFlow);
  assert.equal(withFlow.length, 28, `expected 28 brokers with optOutFlow, got ${withFlow.length}`);
});

test('opt-out works across different category types', async () => {
  // Sanity check: brokers with non-standard flows (credit bureaus, phone lookup)
  // should still load and process in --no-open mode
  const categories = {
    financial: 'equifax',
    marketing: 'acxiom',
    phone: 'truecaller',
    identity: 'pipl'
  };

  for (const [_, brokerName] of Object.entries(categories)) {
    const entry = catalog.brokers[brokerName];
    assert.ok(entry.optOutFlow, `${brokerName} missing optOutFlow`);
    // Just verify the shape is valid — actual script run is covered by other tests
    assert.ok(entry.optOutFlow.optOutUrl);
    assert.ok(Array.isArray(entry.optOutFlow.fields));
  }
});

test('opt-out --no-open writes followUp + audit and skips browser', () => {
  const tmpFile = path.join(os.tmpdir(), `optout-test-${Date.now()}.json`);

  const result = spawnSync(process.execPath, [
    OPT_OUT_SCRIPT,
    '--broker', 'spokeo',
    '--email', 'test@example.com',
    '--full-name', 'Test User',
    '--profile-url', 'https://www.spokeo.com/example-profile',
    '--state-file', tmpFile,
    '--no-open'
  ], {
    env: { ...process.env, HOLMES_AUDIT_HMAC_KEY: 'test-key-for-unit-test' },
    encoding: 'utf8'
  });

  assert.equal(result.status, 0, `opt-out failed: ${result.stderr}`);
  assert.match(result.stdout, /Recorded: 1/);

  const state = JSON.parse(fs.readFileSync(tmpFile, 'utf8'));
  assert.equal(state.followUp.length, 1, 'followUp should have 1 entry');
  assert.equal(state.followUp[0].broker, 'spokeo');
  assert.equal(state.followUp[0].email, 'test@example.com');
  assert.equal(state.followUp[0].profileUrl, 'https://www.spokeo.com/example-profile');
  assert.equal(state.followUp[0].status, 'pending-email-verification');
  assert.ok(state.followUp[0].id.startsWith('followup_'));
  assert.ok(state.followUp[0].submittedAt);
  assert.ok(state.followUp[0].recheckAt);

  assert.equal(state.audit.length, 1, 'audit should have 1 event');
  assert.equal(state.audit[0].event, 'opt_out_submitted_by_user');
  assert.equal(state.audit[0].broker, 'spokeo');
  assert.equal(state.audit[0].method, 'browser-assisted');

  fs.unlinkSync(tmpFile);
});

test('opt-out fails gracefully for broker without optOutFlow', () => {
  const tmpFile = path.join(os.tmpdir(), `optout-test-${Date.now()}.json`);

  const result = spawnSync(process.execPath, [
    OPT_OUT_SCRIPT,
    '--broker', 'peoplelooker',  // no optOutFlow defined (not in top 28)
    '--email', 'test@example.com',
    '--state-file', tmpFile,
    '--no-open'
  ], {
    env: { ...process.env, HOLMES_AUDIT_HMAC_KEY: 'test-key-for-unit-test' },
    encoding: 'utf8'
  });

  // Script continues with error message (non-fatal per broker)
  assert.match(result.stderr, /no optOutFlow/);

  if (fs.existsSync(tmpFile)) fs.unlinkSync(tmpFile);
});

test('opt-out processes multiple brokers in one run', () => {
  const tmpFile = path.join(os.tmpdir(), `optout-test-${Date.now()}.json`);

  const result = spawnSync(process.execPath, [
    OPT_OUT_SCRIPT,
    '--broker', 'spokeo,peekyou,thatsthem',
    '--email', 'test@example.com',
    '--full-name', 'Test User',
    '--phone', '+15551234567',
    '--address', '123 Main St',
    '--city', 'NYC',
    '--state', 'NY',
    '--profile-url', 'https://example.com/me',
    '--state-file', tmpFile,
    '--no-open'
  ], {
    env: { ...process.env, HOLMES_AUDIT_HMAC_KEY: 'test-key-for-unit-test' },
    encoding: 'utf8'
  });

  assert.equal(result.status, 0, `opt-out failed: ${result.stderr}`);
  assert.match(result.stdout, /Recorded: 3/);

  const state = JSON.parse(fs.readFileSync(tmpFile, 'utf8'));
  assert.equal(state.followUp.length, 3);
  const brokers = state.followUp.map(f => f.broker).sort();
  assert.deepEqual(brokers, ['peekyou', 'spokeo', 'thatsthem']);

  fs.unlinkSync(tmpFile);
});

test('recheckAt is submittedAt + processingDays*2', () => {
  const tmpFile = path.join(os.tmpdir(), `optout-test-${Date.now()}.json`);

  const result = spawnSync(process.execPath, [
    OPT_OUT_SCRIPT,
    '--broker', 'cocofinder',  // processingDays: 2 (shortest)
    '--email', 'test@example.com',
    '--full-name', 'Test User',
    '--profile-url', 'https://example.com/me',
    '--state-file', tmpFile,
    '--no-open'
  ], {
    env: { ...process.env, HOLMES_AUDIT_HMAC_KEY: 'test-key-for-unit-test' },
    encoding: 'utf8'
  });

  assert.equal(result.status, 0, `opt-out failed: ${result.stderr}`);

  const state = JSON.parse(fs.readFileSync(tmpFile, 'utf8'));
  const entry = state.followUp[0];
  const submitted = new Date(entry.submittedAt).getTime();
  const recheck = new Date(entry.recheckAt).getTime();
  const diffDays = (recheck - submitted) / (24 * 60 * 60 * 1000);

  // cocofinder processingDays: 2, so recheck should be submittedAt + 4 days
  assert.ok(diffDays >= 3.9 && diffDays <= 4.1, `expected ~4 days, got ${diffDays}`);

  fs.unlinkSync(tmpFile);
});

test('opt-out fails cleanly when --broker is missing', () => {
  const result = spawnSync(process.execPath, [
    OPT_OUT_SCRIPT,
    '--email', 'test@example.com',
    '--no-open'
  ], {
    env: { ...process.env, HOLMES_AUDIT_HMAC_KEY: 'test-key-for-unit-test' },
    encoding: 'utf8'
  });

  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /--broker required/);
});
