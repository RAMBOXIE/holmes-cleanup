import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { runHolmesCleanup } from '../src/holmes-cleanup-cli.mjs';
import { loadPresetParams, mergePresetArgs } from '../src/presets.mjs';
import { generateProofReport } from '../scripts/generate-proof-report.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');

test('quick mode uses defaults but blocks at missing risk confirmations with clear nextActions', () => {
  const result = runHolmesCleanup(['quick'], { cwd: projectRoot });

  assert.notEqual(result.status, 0);
  const payload = JSON.parse(result.stderr);
  assert.equal(payload.session.trigger, 'quick');
  assert.equal(payload.findingsPlaceholder.mode, 'dry-run');
  assert.equal(payload.checks.some(check => check.name === 'inputSource' && check.pass), true);
  assert.equal(payload.checks.some(check => check.name === 'riskTripleConfirm' && !check.pass), true);
  assert.equal(payload.nextActions[0], 'Provide --confirm1 YES --confirm2 YES --confirm3 YES to acknowledge high-risk actions.');
  assert.equal(payload.nextActions[1].type, 'wizard');
  assert.equal(payload.nextActions[1].state, 'RISK_CONFIRM_1');
  assert.equal(payload.nextActions[1].command, 'npm run wizard:demo');
});

test('preset params load and merge while user input wins', () => {
  const preset = loadPresetParams('spokeo', { cwd: projectRoot });
  const merged = mergePresetArgs(preset, {
    preset: 'spokeo',
    keywords: 'user-keyword',
    notify: 'email'
  });

  assert.equal(preset.broker, 'spokeo');
  assert.equal(merged.broker, 'spokeo');
  assert.equal(merged.keywords, 'user-keyword');
  assert.equal(merged.notify, 'email');
  assert.equal(merged.preset, 'spokeo');
});

test('proof report generates markdown file from execution JSON', () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'holmes-proof-'));
  const inputPath = path.join(tempDir, 'execution.json');
  fs.writeFileSync(inputPath, JSON.stringify({
    status: 'blocked',
    session: {
      trigger: 'quick',
      exportBeforeDelete: 'ask'
    },
    checks: [
      { name: 'manualTrigger', pass: true, detail: 'manual trigger accepted' },
      { name: 'riskTripleConfirm', pass: false, detail: 'missing confirmations' }
    ],
    nextActions: ['Provide --confirm1 YES --confirm2 YES --confirm3 YES to acknowledge high-risk actions.'],
    queues: {
      retry: [{ status: 'queued' }],
      manualReview: []
    }
  }, null, 2));

  const report = generateProofReport({
    inputPath,
    outputDir: tempDir,
    timestamp: '2026-04-15T12-00-00-000Z'
  });

  assert.equal(path.basename(report.outputPath), 'proof-2026-04-15T12-00-00-000Z.md');
  const markdown = fs.readFileSync(report.outputPath, 'utf8');
  assert.match(markdown, /# Proof Report/);
  assert.match(markdown, /Status: blocked/);
  assert.match(markdown, /riskTripleConfirm/);
  assert.match(markdown, /Export decision: ask/);
  assert.match(markdown, /Retry queue: 1/);
});
