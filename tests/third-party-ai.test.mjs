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
  const validContexts = ['workplace', 'hr-recruiting', 'medical', 'customer-service', 'workforce-monitoring'];
  for (const [key, t] of Object.entries(catalog.tools)) {
    assert.ok(t.displayName, `${key} missing displayName`);
    assert.ok(validContexts.includes(t.context), `${key} invalid context: ${t.context}`);
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

// ─── Workforce-monitoring extension (v2) ──────────────────────

import { detectInstalled, formatDetectedPathsForLetter } from '../src/third-party-ai/third-party-engine.mjs';

test('catalog has workforce-monitoring context', () => {
  assert.ok(catalog.contexts['workforce-monitoring']);
  assert.match(catalog.contexts['workforce-monitoring'], /desktop|monitoring|AI-agent/i);
});

test('catalog has at least 8 workforce-monitoring tools', () => {
  const wf = Object.entries(catalog.tools).filter(([, t]) => t.context === 'workforce-monitoring');
  assert.ok(wf.length >= 8, `expected >=8 workforce tools, got ${wf.length}`);
});

test('every workforce-monitoring tool has installPaths per OS + workforce-monitoring-objection template', () => {
  const wf = Object.entries(catalog.tools).filter(([, t]) => t.context === 'workforce-monitoring');
  for (const [key, tool] of wf) {
    assert.ok(tool.installPaths, `${key} missing installPaths`);
    assert.ok('win32' in tool.installPaths, `${key} missing win32 installPaths key`);
    assert.ok('darwin' in tool.installPaths, `${key} missing darwin installPaths key`);
    assert.ok('linux' in tool.installPaths, `${key} missing linux installPaths key`);
    assert.equal(tool.objectionTemplate, 'workforce-monitoring-objection',
      `${key}.objectionTemplate should be workforce-monitoring-objection`);
  }
});

test('employer-internal is a generic workforce entry with no install paths', () => {
  const ei = catalog.tools['employer-internal'];
  assert.ok(ei);
  assert.equal(ei.context, 'workforce-monitoring');
  assert.equal(ei.installPaths.win32.length, 0);
  assert.equal(ei.installPaths.darwin.length, 0);
  assert.equal(ei.installPaths.linux.length, 0);
});

test('catalog has 4 new workforce jurisdictions', () => {
  assert.ok(catalog.jurisdictions['US-state-NY-EMA']);
  assert.ok(catalog.jurisdictions['US-state-IL-BIPA']);
  assert.ok(catalog.jurisdictions['DE-works-council']);
  assert.ok(catalog.jurisdictions['EU-GDPR-art88']);
});

test('catalog has workforce-monitoring-objection template with correct variables', () => {
  const tpl = catalog.objectionTemplates['workforce-monitoring-objection'];
  assert.ok(tpl);
  assert.match(tpl.template, /\{\{toolNames\}\}/);
  assert.match(tpl.template, /\{\{jurisdictionClause\}\}/);
  assert.match(tpl.template, /\{\{employerName\}\}/);
  assert.match(tpl.template, /\{\{detectedPaths\}\}/);
});

test('selectJurisdictionClause US-state-NY-EMA cites the 2022 Electronic Monitoring Act', () => {
  const clause = selectJurisdictionClause({ jurisdiction: 'US-state-NY-EMA' });
  assert.match(clause, /Electronic Monitoring Act/);
  assert.match(clause, /52-c/);
});

test('selectJurisdictionClause US-state-IL-BIPA cites statutory damages', () => {
  const clause = selectJurisdictionClause({ jurisdiction: 'US-state-IL-BIPA' });
  assert.match(clause, /Biometric Information Privacy Act|BIPA/);
  assert.match(clause, /740 ILCS 14/);
  assert.match(clause, /\$1,000|\$5,000/);
});

test('selectJurisdictionClause DE-works-council is in German citing §87', () => {
  const clause = selectJurisdictionClause({ jurisdiction: 'DE-works-council' });
  assert.match(clause, /Betriebsverfassungsgesetz|Betriebsrat/);
  assert.match(clause, /§87/);
});

test('selectJurisdictionClause EU-GDPR-art88 cites Article 88 employment context', () => {
  const clause = selectJurisdictionClause({ jurisdiction: 'EU-GDPR-art88' });
  assert.match(clause, /Article 88/);
  assert.match(clause, /collective agreement|proportionality/i);
});

// ─── detectInstalled ──────────────────────────────────────────

test('detectInstalled returns structured results with found/missing per tool', () => {
  // Use linux platform with empty env so no tool has any path that exists
  const results = detectInstalled(['activtrak', 'teramind'], catalog, {
    platform: 'linux',
    homeDir: '/nonexistent/home',
    env: {}
  });
  assert.equal(results.length, 2);
  for (const r of results) {
    assert.ok(typeof r.tool === 'string');
    assert.ok(typeof r.displayName === 'string');
    assert.ok(Array.isArray(r.found));
    assert.ok(Array.isArray(r.missing));
    assert.equal(typeof r.hasAny, 'boolean');
  }
  // activtrak has no linux paths in catalog → probedCount 0
  const ata = results.find(r => r.tool === 'activtrak');
  assert.equal(ata.probedCount, 0);
  assert.equal(ata.found.length, 0);
});

test('detectInstalled on win32 with non-existent env paths returns all missing', () => {
  const results = detectInstalled(['teramind'], catalog, {
    platform: 'win32',
    homeDir: 'C:\\Users\\fake',
    env: {
      APPDATA: 'C:\\Users\\fake\\AppData\\Roaming',
      PROGRAMFILES: 'C:\\Program Files',
      'PROGRAMFILES(X86)': 'C:\\Program Files (x86)',
      WINDIR: 'C:\\Windows'
    }
  });
  const tm = results[0];
  assert.equal(tm.tool, 'teramind');
  assert.equal(tm.hasAny, false);
  assert.equal(tm.found.length, 0);
  assert.ok(tm.missing.length > 0);
  // Each missing entry carries resolved absolute path
  for (const m of tm.missing) {
    assert.match(m.path, /C:/);
  }
});

test('detectInstalled against the test directory itself produces a "found" hit', () => {
  // Craft a synthetic tool with installPaths pointing at the tests directory
  const fakeCatalog = {
    tools: {
      'fake-tool': {
        displayName: 'Fake Monitor',
        installPaths: {
          [process.platform]: [__dirname]  // __dirname from the test file = tests/
        }
      }
    }
  };
  const results = detectInstalled(['fake-tool'], fakeCatalog);
  assert.equal(results.length, 1);
  assert.equal(results[0].hasAny, true);
  assert.ok(results[0].found.length >= 1);
  assert.equal(results[0].found[0].isDirectory, true);
});

test('formatDetectedPathsForLetter returns empty string on no hits', () => {
  const text = formatDetectedPathsForLetter([
    { tool: 'a', displayName: 'A', found: [], missing: [], hasAny: false, probedCount: 3 }
  ]);
  assert.equal(text, '');
});

test('formatDetectedPathsForLetter produces evidence block with paths', () => {
  const text = formatDetectedPathsForLetter([
    {
      tool: 'activtrak',
      displayName: 'ActivTrak',
      found: [{ path: 'C:\\Program Files\\ActivTrak', bytes: 50000000, isDirectory: true, items: 12 }],
      missing: [],
      hasAny: true,
      probedCount: 3
    }
  ]);
  assert.match(text, /EVIDENCE OF INSTALLED/);
  assert.match(text, /ActivTrak/);
  assert.match(text, /C:\\Program Files\\ActivTrak/);
});

// ─── CLI integration for workforce-monitoring ─────────────────

test('CLI --detect-installed alone runs a scan and exits 0', () => {
  const result = spawnSync(process.execPath, [
    SCRIPT, '--detect-installed'
  ], { encoding: 'utf8', env: { ...process.env, NODE_ENV: 'test' } });
  assert.equal(result.status, 0, `failed: ${result.stderr}`);
  assert.match(result.stdout, /Local detection/i);
  assert.match(result.stdout, /Best-effort only/);
});

test('CLI --teramind --jurisdiction US-state-IL-BIPA generates BIPA-cited letter', () => {
  const result = spawnSync(process.execPath, [
    SCRIPT, '--teramind', '--jurisdiction', 'US-state-IL-BIPA',
    '--company', 'Acme Corp'
  ], { encoding: 'utf8', env: { ...process.env, NODE_ENV: 'test' } });
  assert.equal(result.status, 0);
  assert.match(result.stdout, /Context: workforce-monitoring/);
  assert.match(result.stdout, /Teramind/);
  assert.match(result.stdout, /Biometric Information Privacy Act|BIPA/);
  assert.match(result.stdout, /Acme Corp/);
});

test('CLI --context workforce-monitoring --detect-installed merges evidence into letter', () => {
  const result = spawnSync(process.execPath, [
    SCRIPT, '--context', 'workforce-monitoring', '--detect-installed',
    '--jurisdiction', 'US-state-NY-EMA', '--company', 'Acme Corp'
  ], { encoding: 'utf8', env: { ...process.env, NODE_ENV: 'test' } });
  assert.equal(result.status, 0);
  // Detection section present
  assert.match(result.stdout, /Local detection/);
  // Letter present with NY EMA clause + company name
  assert.match(result.stdout, /Electronic Monitoring Act/);
  assert.match(result.stdout, /Acme Corp/);
});

test('CLI --employer-internal flag produces a disclosure-demand letter for unknown vendors', () => {
  const result = spawnSync(process.execPath, [
    SCRIPT, '--employer-internal', '--jurisdiction', 'EU-GDPR-art88',
    '--company', 'MegaCorp'
  ], { encoding: 'utf8', env: { ...process.env, NODE_ENV: 'test' } });
  assert.equal(result.status, 0);
  assert.match(result.stdout, /MegaCorp/);
  assert.match(result.stdout, /Article 88/);
  assert.match(result.stdout, /DISCLOSURE REQUEST|disclosure/i);
});
