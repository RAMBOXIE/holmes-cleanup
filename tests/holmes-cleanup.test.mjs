import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import path from 'node:path';

const projectRoot = 'D:/Projects/holmes-cleanup';
const scriptPath = path.join(projectRoot, 'scripts', 'holmes-cleanup.mjs');
const samplePath = path.join(projectRoot, 'examples', 'sample.json');

function run(args) {
  return spawnSync(process.execPath, [scriptPath, ...args], {
    cwd: projectRoot,
    encoding: 'utf8'
  });
}

test('should block when missing manual trigger', () => {
  const r = run(['--keywords', 'a,b', '--confirm1', 'YES', '--confirm2', 'YES', '--confirm3', 'YES', '--export-before-delete', 'yes']);
  assert.notEqual(r.status, 0);
  assert.match(r.stderr, /manualTrigger/);
});

test('should block when missing triple confirm', () => {
  const r = run(['--manual', '--keywords', 'a,b', '--export-before-delete', 'yes']);
  assert.notEqual(r.status, 0);
  assert.match(r.stderr, /riskTripleConfirm/);
});

test('should block when ask export without answer', () => {
  const r = run(['--manual', '--keywords', 'a,b', '--confirm1', 'YES', '--confirm2', 'YES', '--confirm3', 'YES', '--export-before-delete', 'ask']);
  assert.notEqual(r.status, 0);
  assert.match(r.stderr, /exportBeforeDelete/);
});

test('should pass in dry-run with sample file and dedupe samples', () => {
  const r = run([
    '--manual',
    '--sample-file', samplePath,
    '--keywords', 'mirror,reupload',
    '--confirm1', 'YES',
    '--confirm2', 'YES',
    '--confirm3', 'YES',
    '--export-before-delete', 'ask',
    '--export-answer', 'no',
    '--notify', 'none'
  ]);

  assert.equal(r.status, 0, r.stderr);
  const out = JSON.parse(r.stdout);
  assert.equal(out.status, 'ok');
  assert.equal(out.findingsPlaceholder.sampleCount, 2);
  assert.match(JSON.stringify(out.checks), /notifyPolicy/);
});
