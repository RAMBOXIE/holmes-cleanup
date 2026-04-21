import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  resolveToolKeys,
  selectJurisdictionClause,
  renderObjectionLetter,
  planObjections
} from '../src/third-party-ai/third-party-engine.mjs';

const require = createRequire(import.meta.url);
const catalog = require('../src/third-party-ai/third-party-catalog.json');

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, '..');
const SCRIPT = path.join(PROJECT_ROOT, 'scripts', 'third-party-ai.mjs');

// ─── Catalog integrity ────────────────────────────────────────

test('catalog has >=10 tools across 3+ contexts', () => {
  const tools = Object.values(catalog.tools);
  assert.ok(tools.length >= 10);
  const contexts = new Set(tools.map(t => t.context));
  assert.ok(contexts.size >= 3, `expected >=3 contexts, got ${[...contexts]}`);
});

test('every tool has required metadata', () => {
  for (const [key, t] of Object.entries(catalog.tools)) {
    assert.ok(t.displayName, `${key} missing displayName`);
    assert.ok(['workplace', 'hr-recruiting', 'medical', 'customer-service'].includes(t.context),
      `${key} invalid context: ${t.context}`);
    assert.ok(t.vendor, `${key} missing vendor`);
    assert.ok(Array.isArray(t.dataCollected), `${key} dataCollected must be array`);
    assert.ok(t.whoDeploys, `${key} missing whoDeploys`);
    assert.ok(t.signalAsked, `${key} missing signalAsked`);
    assert.ok(t.objectionTemplate, `${key} missing objectionTemplate`);
  }
});

test('every tool references a valid objectionTemplate', () => {
  for (const [key, t] of Object.entries(catalog.tools)) {
    assert.ok(catalog.objectionTemplates[t.objectionTemplate],
      `${key} references unknown template: ${t.objectionTemplate}`);
  }
});

test('catalog has templates for workplace, sales, interview, medical contexts', () => {
  const templates = Object.keys(catalog.objectionTemplates);
  assert.ok(templates.includes('workplace-meeting'));
  assert.ok(templates.includes('sales-call-recording'));
  assert.ok(templates.includes('ai-interview'));
  assert.ok(templates.includes('medical-ai'));
});

// ─── resolveToolKeys ──────────────────────────────────────────

test('resolveToolKeys --all returns every tool', () => {
  const keys = resolveToolKeys({ all: true }, catalog);
  assert.equal(keys.length, Object.keys(catalog.tools).length);
});

test('resolveToolKeys handles signalAsked shortcuts', () => {
  const keys = resolveToolKeys({ zoom: true, hirevue: true }, catalog);
  assert.ok(keys.includes('zoom-ai-companion'));
  assert.ok(keys.includes('hirevue'));
});

test('resolveToolKeys --context filter', () => {
  const keys = resolveToolKeys({ all: true, context: 'medical' }, catalog);
  assert.ok(keys.length > 0);
  for (const k of keys) {
    assert.equal(catalog.tools[k].context, 'medical');
  }
});

test('resolveToolKeys --use csv', () => {
  const keys = resolveToolKeys({ use: 'zoom,abridge' }, catalog);
  assert.deepEqual(keys.sort(), ['abridge', 'zoom-ai-companion']);
});

// ─── selectJurisdictionClause ─────────────────────────────────

test('selectJurisdictionClause GDPR mentions Article 21', () => {
  const clause = selectJurisdictionClause({ jurisdiction: 'EU' });
  assert.match(clause, /GDPR Article 21/);
});

test('selectJurisdictionClause CA mentions CCPA', () => {
  const clause = selectJurisdictionClause({ jurisdiction: 'CA' });
  assert.match(clause, /CCPA/);
});

test('selectJurisdictionClause IL mentions Illinois AI Video Interview Act', () => {
  const clause = selectJurisdictionClause({ jurisdiction: 'IL' });
  assert.match(clause, /Illinois AI Video Interview/);
});

test('selectJurisdictionClause NY mentions Local Law 144', () => {
  const clause = selectJurisdictionClause({ jurisdiction: 'NY' });
  assert.match(clause, /Local Law 144/);
});

test('selectJurisdictionClause HIPAA mentions 45 CFR', () => {
  const clause = selectJurisdictionClause({ jurisdiction: 'HIPAA' });
  assert.match(clause, /HIPAA/);
  assert.match(clause, /45 CFR/);
});

test('selectJurisdictionClause default returns generic clause', () => {
  const clause = selectJurisdictionClause({});
  assert.match(clause, /right to object/);
});

// ─── renderObjectionLetter ────────────────────────────────────

test('renderObjectionLetter substitutes toolNames + jurisdictionClause', () => {
  const rendered = renderObjectionLetter('workplace-meeting', {
    toolNames: 'Zoom AI Companion, Otter',
    jurisdictionClause: 'Under GDPR Article 21.'
  }, catalog);
  assert.match(rendered.letter, /Zoom AI Companion, Otter/);
  assert.match(rendered.letter, /Under GDPR Article 21\./);
});

test('renderObjectionLetter leaves unfilled placeholders as [name]', () => {
  const rendered = renderObjectionLetter('workplace-meeting', {
    toolNames: 'X',
    jurisdictionClause: 'Y'
  }, catalog);
  // 'name' is not substituted — should become [name]
  assert.match(rendered.letter, /\[name\]/);
});

test('renderObjectionLetter throws on unknown template key', () => {
  assert.throws(() => renderObjectionLetter('does-not-exist', {}, catalog));
});

// ─── planObjections ──────────────────────────────────────────

test('planObjections groups tools by context + generates letters', () => {
  const keys = ['zoom-ai-companion', 'otter-ai', 'hirevue'];
  const plan = planObjections(keys, catalog, { jurisdiction: 'EU' });
  assert.ok(plan.length >= 2, `expected >=2 contexts, got ${plan.length}`);
  // Each plan entry has a letter
  for (const entry of plan) {
    assert.ok(entry.letter);
    assert.ok(entry.context);
    assert.ok(entry.tools.length > 0);
    // GDPR clause should be in each letter
    assert.match(entry.letter, /GDPR Article 21/);
  }
});

test('planObjections workplace letter mentions all selected workplace tools', () => {
  const plan = planObjections(['zoom-ai-companion', 'otter-ai', 'fireflies-ai'], catalog, {});
  const workplace = plan.find(p => p.context === 'workplace');
  assert.ok(workplace);
  assert.match(workplace.letter, /Zoom AI Companion/);
  assert.match(workplace.letter, /Otter/);
  assert.match(workplace.letter, /Fireflies/);
});

// ─── CLI integration ─────────────────────────────────────────

test('CLI --help shows usage', () => {
  const result = spawnSync(process.execPath, [SCRIPT, '--help'], { encoding: 'utf8' });
  assert.equal(result.status, 0);
  assert.match(result.stdout, /Third-party AI/);
  assert.match(result.stdout, /--zoom/);
  assert.match(result.stdout, /--hirevue/);
});

test('CLI fails cleanly when no tools specified', () => {
  const result = spawnSync(process.execPath, [SCRIPT], { encoding: 'utf8' });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /No tools specified/);
});

test('CLI --zoom --otter generates workplace letter', () => {
  const result = spawnSync(process.execPath, [
    SCRIPT, '--zoom', '--otter', '--jurisdiction', 'EU'
  ], { encoding: 'utf8', env: { ...process.env, NODE_ENV: 'test' } });

  assert.equal(result.status, 0, `failed: ${result.stderr}`);
  assert.match(result.stdout, /Context: workplace/);
  assert.match(result.stdout, /Zoom AI Companion/);
  assert.match(result.stdout, /Otter\.ai/);
  assert.match(result.stdout, /GDPR Article 21/);
});

test('CLI --abridge --jurisdiction HIPAA generates medical letter', () => {
  const result = spawnSync(process.execPath, [
    SCRIPT, '--abridge', '--jurisdiction', 'HIPAA'
  ], { encoding: 'utf8', env: { ...process.env, NODE_ENV: 'test' } });

  assert.equal(result.status, 0);
  assert.match(result.stdout, /Context: medical/);
  assert.match(result.stdout, /Abridge/);
  assert.match(result.stdout, /HIPAA/);
});

test('CLI --context filter limits to selected context', () => {
  const result = spawnSync(process.execPath, [
    SCRIPT, '--all', '--context', 'hr-recruiting'
  ], { encoding: 'utf8', env: { ...process.env, NODE_ENV: 'test' } });

  assert.equal(result.status, 0);
  // Should NOT contain workplace tool names
  const hasZoom = /Zoom AI Companion/.test(result.stdout);
  assert.equal(hasZoom, false, 'workplace tools should be excluded by --context hr-recruiting');
  // Should contain HR tools
  assert.match(result.stdout, /HireVue/);
});

test('CLI --json outputs valid structure', () => {
  const result = spawnSync(process.execPath, [
    SCRIPT, '--zoom', '--json'
  ], { encoding: 'utf8', env: { ...process.env, NODE_ENV: 'test' } });

  assert.equal(result.status, 0);
  const parsed = JSON.parse(result.stdout);
  assert.ok(parsed.generatedAt);
  assert.ok(Array.isArray(parsed.plan));
  assert.ok(parsed.plan.length > 0);
});
