#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export function generateProofReport({ inputPath, outputDir = 'reports', timestamp = new Date().toISOString() } = {}) {
  if (!inputPath) {
    throw new Error('inputPath is required.');
  }

  const resolvedInput = path.resolve(inputPath);
  const execution = JSON.parse(fs.readFileSync(resolvedInput, 'utf8'));
  const safeTimestamp = timestamp.replace(/[:.]/g, '-');
  const resolvedOutputDir = path.resolve(outputDir);
  fs.mkdirSync(resolvedOutputDir, { recursive: true });

  const outputPath = path.join(resolvedOutputDir, `proof-${safeTimestamp}.md`);
  fs.writeFileSync(outputPath, renderProofReport(execution, {
    generatedAt: timestamp,
    source: resolvedInput
  }));

  return { outputPath };
}

function renderProofReport(execution, context) {
  const checks = Array.isArray(execution.checks) ? execution.checks : [];
  const confirmations = checks.filter(check => /confirm/i.test(check.name || ''));
  const queues = execution.queues || {};
  const retryQueue = Array.isArray(queues.retry) ? queues.retry : [];
  const manualReviewQueue = Array.isArray(queues.manualReview) ? queues.manualReview : [];
  const nextActions = Array.isArray(execution.nextActions) ? execution.nextActions : [];
  const failedChecks = checks.filter(check => !check.pass);
  const exportDecision = execution.session?.exportBeforeDelete || 'unknown';

  return [
    '# Proof Report',
    '',
    `Generated: ${context.generatedAt}`,
    `Source: ${context.source}`,
    `Status: ${execution.status || 'unknown'}`,
    '',
    '## Timeline',
    ...checks.map((check, index) => `${index + 1}. ${check.name || 'unnamed'}: ${check.pass ? 'pass' : 'fail'} - ${check.detail || 'no detail'}`),
    checks.length === 0 ? 'No timeline checks recorded.' : '',
    '',
    '## Success And Failure',
    `Successful checks: ${checks.filter(check => check.pass).length}`,
    `Failed checks: ${failedChecks.length}`,
    '',
    '## Reasons Not Executed',
    ...(failedChecks.length > 0 ? failedChecks.map(check => `- ${check.name || 'unnamed'}: ${check.detail || 'no detail'}`) : ['- None recorded.']),
    ...(nextActions.length > 0 ? nextActions.map(action => `- Next action: ${action}`) : []),
    '',
    '## Confirmation Records',
    ...(confirmations.length > 0 ? confirmations.map(check => `- ${check.name}: ${check.pass ? 'pass' : 'fail'} - ${check.detail || 'no detail'}`) : ['- No confirmation records found.']),
    '',
    '## Export Decision',
    `Export decision: ${exportDecision}`,
    '',
    '## Queue Status',
    `Retry queue: ${retryQueue.length}`,
    `Manual review queue: ${manualReviewQueue.length}`,
    ''
  ].filter(line => line !== null).join('\n');
}

function writeDemoInput() {
  const demoDir = path.resolve('reports');
  fs.mkdirSync(demoDir, { recursive: true });
  const demoPath = path.join(demoDir, 'proof-demo-input.json');
  fs.writeFileSync(demoPath, JSON.stringify({
    status: 'blocked',
    session: {
      trigger: 'quick',
      exportBeforeDelete: 'ask'
    },
    checks: [
      { name: 'manualTrigger', pass: true, detail: 'Quick mode is a manual command.' },
      { name: 'riskTripleConfirm', pass: false, detail: 'Missing one or more confirmation flags.' }
    ],
    nextActions: [
      'Provide --confirm1 YES --confirm2 YES --confirm3 YES to acknowledge high-risk actions.'
    ],
    queues: {
      retry: [],
      manualReview: []
    }
  }, null, 2));
  return demoPath;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const demo = args.includes('--demo');
  const inputArg = args.find(arg => !arg.startsWith('--'));
  const inputPath = demo ? writeDemoInput() : inputArg;

  try {
    const report = generateProofReport({ inputPath, outputDir: 'reports' });
    process.stdout.write(`${report.outputPath}\n`);
  } catch (error) {
    process.stderr.write(`${String(error.message || error)}\n`);
    process.exit(1);
  }
}
