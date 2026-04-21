import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  renderProbe,
  detectLeaks,
  runMemoryCheck,
  createProvider,
  renderMemoryCheckReport,
  mockProvider
} from '../src/llm-memory/memory-check-engine.mjs';

const require = createRequire(import.meta.url);
const probes = require('../src/llm-memory/probe-catalog.json');

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, '..');
const SCRIPT = path.join(PROJECT_ROOT, 'scripts', 'llm-memory-check.mjs');

// ─── Probe catalog integrity ──────────────────────────────────

test('catalog has at least 10 probes', () => {
  assert.ok(probes.probes.length >= 10, `expected >=10 probes, got ${probes.probes.length}`);
});

test('every probe has id + template + targetsLeak + risk', () => {
  for (const p of probes.probes) {
    assert.ok(p.id, 'probe missing id');
    assert.ok(p.template, `${p.id} missing template`);
    assert.ok(Array.isArray(p.targetsLeak), `${p.id} targetsLeak must be array`);
    assert.ok(['high', 'medium', 'low'].includes(p.risk), `${p.id} invalid risk`);
  }
});

test('every probe template uses {{name}}', () => {
  for (const p of probes.probes) {
    assert.ok(p.template.includes('{{name}}'), `${p.id} template must include {{name}}`);
  }
});

test('probe IDs are unique', () => {
  const ids = probes.probes.map(p => p.id);
  const unique = new Set(ids);
  assert.equal(ids.length, unique.size, 'duplicate probe IDs');
});

// ─── renderProbe ─────────────────────────────────────────────

test('renderProbe substitutes {{name}}', () => {
  const probe = { template: 'Tell me about {{name}}.' };
  assert.equal(renderProbe(probe, { name: 'Alice' }), 'Tell me about Alice.');
});

test('renderProbe handles missing name gracefully', () => {
  const probe = { template: '{{name}}' };
  assert.equal(renderProbe(probe, {}), '[unknown]');
});

// ─── detectLeaks ──────────────────────────────────────────────

test('detectLeaks finds verbatim email', () => {
  const identity = { email: 'jane@example.com' };
  const response = "Jane's email is jane@example.com, feel free to reach out.";
  const leaks = detectLeaks(response, identity);
  assert.equal(leaks.length, 1);
  assert.equal(leaks[0].type, 'email');
});

test('detectLeaks is case-insensitive for email', () => {
  const identity = { email: 'jane@EXAMPLE.com' };
  const response = "Contact: JANE@example.COM";
  const leaks = detectLeaks(response, identity);
  assert.equal(leaks.length, 1);
  assert.equal(leaks[0].type, 'email');
});

test('detectLeaks finds phone with different formatting', () => {
  const identity = { phone: '+1 555 123 4567' };
  const response = 'Her number is (555) 123-4567.';
  const leaks = detectLeaks(response, identity);
  assert.equal(leaks.length, 1);
  assert.equal(leaks[0].type, 'phone');
});

test('detectLeaks ignores short digit sequences (no false positive on dates)', () => {
  const identity = { phone: '+1 555 123 4567' };
  // "2023" happens to share no digits with the phone — no leak
  const response = 'She was born in 2023. That is all I know.';
  const leaks = detectLeaks(response, identity);
  assert.equal(leaks.length, 0);
});

test('detectLeaks finds workplace match', () => {
  const identity = { workplace: 'Acme Corporation' };
  const response = 'She works at Acme Corporation as a senior engineer.';
  const leaks = detectLeaks(response, identity);
  assert.equal(leaks.length, 1);
  assert.equal(leaks[0].type, 'workplace');
});

test('detectLeaks finds city match but skips too-short cities', () => {
  const identity1 = { city: 'Seattle' };
  assert.equal(detectLeaks('She lives in Seattle.', identity1).length, 1);
  const identity2 = { city: 'NY' };
  // 'NY' is too short (≤3) — skipped
  assert.equal(detectLeaks('She lives in NY.', identity2).length, 0);
});

test('detectLeaks returns empty for empty response', () => {
  const identity = { email: 'a@b.com' };
  assert.deepEqual(detectLeaks('', identity), []);
  assert.deepEqual(detectLeaks(null, identity), []);
});

test('detectLeaks finds multiple leak types', () => {
  const identity = { email: 'a@b.com', phone: '5551234567', workplace: 'Acme' };
  const response = "Contact a@b.com or 555-123-4567. Works at Acme.";
  const leaks = detectLeaks(response, identity);
  const types = leaks.map(l => l.type).sort();
  assert.deepEqual(types, ['email', 'phone', 'workplace']);
});

// ─── mockProvider ─────────────────────────────────────────────

test('mockProvider returns a deterministic non-leaking response', async () => {
  const mock = mockProvider('TestMock');
  const response = await mock.query('Tell me about Alice.');
  assert.ok(typeof response === 'string');
  assert.ok(response.length > 0);
  // Mock response explicitly says it won't share personal info
  assert.match(response, /personal information/i);
});

// ─── createProvider ──────────────────────────────────────────

test('createProvider openai requires apiKey at query time', async () => {
  const p = createProvider('openai', { apiKey: null });
  await assert.rejects(() => p.query('test'), /API key missing/);
});

test('createProvider anthropic requires apiKey at query time', async () => {
  const p = createProvider('anthropic', { apiKey: null });
  await assert.rejects(() => p.query('test'), /API key missing/);
});

test('createProvider mock works without key', async () => {
  const p = createProvider('mock');
  const response = await p.query('Tell me about X.');
  assert.ok(typeof response === 'string');
});

test('createProvider throws on unknown provider', () => {
  assert.throws(() => createProvider('unknown-provider'), /Unknown provider/);
});

// ─── runMemoryCheck end-to-end with mock ──────────────────────

test('runMemoryCheck with mock provider produces valid result structure', async () => {
  const mock = createProvider('mock');
  const identity = { name: 'Alice', email: 'alice@example.com' };
  const result = await runMemoryCheck(identity, [mock], { probes });

  assert.ok(result.checkId);
  assert.ok(result.checkedAt);
  assert.equal(result.identity.name, 'Alice');
  // Privacy: email not echoed in report
  assert.equal(result.identity.email, undefined);
  assert.equal(result.results.length, 1);
  assert.equal(result.results[0].totalProbes, probes.probes.length);
  // Mock never leaks
  assert.equal(result.results[0].leakedProbes, 0);
  assert.equal(result.results[0].leakRate, 0);
});

test('runMemoryCheck throws when identity.name missing', async () => {
  const mock = createProvider('mock');
  await assert.rejects(
    () => runMemoryCheck({}, [mock], { probes }),
    /identity.name is required/
  );
});

test('runMemoryCheck throws when providers empty', async () => {
  await assert.rejects(
    () => runMemoryCheck({ name: 'X' }, [], { probes }),
    /At least one provider/
  );
});

test('runMemoryCheck throws when probes missing', async () => {
  const mock = createProvider('mock');
  await assert.rejects(
    () => runMemoryCheck({ name: 'X' }, [mock], {}),
    /probes catalog required/
  );
});

test('runMemoryCheck with leaking provider correctly flags leaks', async () => {
  const leakingProvider = {
    name: 'LeakyMock',
    shortName: 'leaky',
    async query(prompt) {
      return "Alice's email is alice@example.com and she works at Acme Corp.";
    }
  };
  const identity = { name: 'Alice', email: 'alice@example.com', workplace: 'Acme Corp' };
  const result = await runMemoryCheck(identity, [leakingProvider], { probes });
  const r = result.results[0];
  // Every probe gets the same leaking response → all probes show leaks
  assert.equal(r.leakedProbes, probes.probes.length);
  assert.equal(r.leakRate, 1.0);
  assert.ok(r.leakTypesFound.includes('email'));
  assert.ok(r.leakTypesFound.includes('workplace'));
});

// ─── renderMemoryCheckReport ─────────────────────────────────

test('renderMemoryCheckReport contains rating + bar per provider', async () => {
  const mock = createProvider('mock');
  const result = await runMemoryCheck({ name: 'Test' }, [mock], { probes });
  const report = renderMemoryCheckReport(result);
  assert.match(report, /Memorization Test/);
  assert.match(report, /probes leaked/);
  assert.match(report, /safe|low|moderate|high/);
});

// ─── CLI integration ─────────────────────────────────────────

test('CLI --help shows usage', () => {
  const result = spawnSync(process.execPath, [SCRIPT, '--help'], { encoding: 'utf8' });
  assert.equal(result.status, 0);
  assert.match(result.stdout, /LLM memorization check/);
  assert.match(result.stdout, /--dry-run/);
});

test('CLI fails without --name', () => {
  const result = spawnSync(process.execPath, [SCRIPT], { encoding: 'utf8' });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /--name is required/);
});

test('CLI --dry-run produces zero leaks', () => {
  const result = spawnSync(process.execPath, [
    SCRIPT, '--name', 'Alice', '--dry-run', '--json'
  ], { encoding: 'utf8', env: { ...process.env, NODE_ENV: 'test' } });

  assert.equal(result.status, 0, `CLI failed: ${result.stderr}`);
  const parsed = JSON.parse(result.stdout);
  assert.equal(parsed.identity.name, 'Alice');
  assert.equal(parsed.results.length, 1);
  assert.equal(parsed.results[0].leakedProbes, 0);
  assert.equal(parsed.summary.anyLeaks, false);
});

test('CLI --dry-run --verbose shows per-probe detail', () => {
  const result = spawnSync(process.execPath, [
    SCRIPT, '--name', 'Alice', '--dry-run', '--verbose'
  ], { encoding: 'utf8', env: { ...process.env, NODE_ENV: 'test' } });

  assert.equal(result.status, 0);
  assert.match(result.stdout, /Per-probe detail/);
  assert.match(result.stdout, /direct-bio/);
});

test('CLI without API keys and no --dry-run exits with error', () => {
  // Strip API keys from env
  const env = { ...process.env };
  delete env.OPENAI_API_KEY;
  delete env.ANTHROPIC_API_KEY;
  env.NODE_ENV = 'test';

  const result = spawnSync(process.execPath, [
    SCRIPT, '--name', 'Alice'
  ], { encoding: 'utf8', env });

  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /No providers configured/);
});
