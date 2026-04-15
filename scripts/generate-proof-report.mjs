#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export function generateProofReport({ inputPath, outputDir = 'reports', timestamp = new Date().toISOString() } = {}) {
  if (!inputPath) throw new Error('inputPath is required.');

  const resolvedInput = path.resolve(inputPath);
  const execution = JSON.parse(fs.readFileSync(resolvedInput, 'utf8'));
  const safeTimestamp = timestamp.replace(/[:.]/g, '-');
  const resolvedOutputDir = path.resolve(outputDir);
  fs.mkdirSync(resolvedOutputDir, { recursive: true });

  const outputPath = path.join(resolvedOutputDir, `proof-${safeTimestamp}.md`);
  fs.writeFileSync(outputPath, renderProofReport(execution, { generatedAt: timestamp, source: resolvedInput }));

  return { outputPath };
}

function renderProofReport(execution, context) {
  const summary = execution.summary || {};
  const checks = Array.isArray(execution.checks) ? execution.checks : [];
  const queues = execution.queues || {};
  const retryQueue = Array.isArray(queues.retry) ? queues.retry : [];
  const manualReviewQueue = Array.isArray(queues.manualReview) ? queues.manualReview : [];
  const completed = Array.isArray(queues.completed) ? queues.completed : [];
  const failed = Array.isArray(queues.failed) ? queues.failed : [];
  const results = Array.isArray(execution.results) ? execution.results : [];
  const exportDecision = execution.session?.exportBeforeDelete || 'unknown';

  return [
    '# Proof Report',
    '',
    `Generated: ${context.generatedAt}`,
    `Source: ${context.source}`,
    `Status: ${execution.status || 'unknown'}`,
    `Mode: ${execution.mode || 'unknown'}`,
    '',
    '## Summary',
    `Attempted: ${summary.attempted ?? 'n/a'}`,
    `Successful: ${summary.successful ?? 'n/a'}`,
    `Retry queued: ${summary.retryQueued ?? retryQueue.length}`,
    `Manual review queued: ${summary.manualReviewQueued ?? manualReviewQueue.length}`,
    '',
    '## Timeline',
    ...(checks.length > 0 ? checks.map((check, index) => `${index + 1}. ${check.name || 'unnamed'}: ${check.pass ? 'pass' : 'fail'} - ${check.detail || 'no detail'}`) : ['No timeline checks recorded.']),
    '',
    '## Live Submission Evidence',
    ...(results.length > 0
      ? results.map((r, i) => `- [${i + 1}] broker=${r.broker}, requestId=${r.requestId}, endpoint=${r.evidence?.endpoint || 'n/a'}, httpStatus=${r.evidence?.httpStatus || 'n/a'}, echoRequestId=${r.evidence?.echoRequestId || 'n/a'}`)
      : ['- No successful submissions captured.']),
    '',
    '## Export Decision',
    `Export decision: ${exportDecision}`,
    '',
    '## Queue Status',
    `Retry queue: ${retryQueue.length}`,
    `Manual review queue: ${manualReviewQueue.length}`,
    `Retry pending: ${retryQueue.length}`,
    `Manual review pending: ${manualReviewQueue.length}`,
    `Completed: ${completed.length}`,
    `Failed: ${failed.length}`,
    '',
    '## Retry Items',
    ...(retryQueue.length > 0 ? retryQueue.map(item => `- ${item.id} ${item.payload?.broker}/${item.payload?.requestId} attempt=${item.attempt}`) : ['- none']),
    '',
    '## Manual Review Items',
    ...(manualReviewQueue.length > 0 ? manualReviewQueue.map(item => `- ${item.id} ${item.payload?.broker}/${item.payload?.requestId} reason=${item.reason} status=${item.status}`) : ['- none']),
    ''
  ].join('\n');
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const inputArg = process.argv.slice(2).find(arg => !arg.startsWith('--'));
  try {
    const report = generateProofReport({ inputPath: inputArg, outputDir: 'reports' });
    process.stdout.write(`${report.outputPath}\n`);
  } catch (error) {
    process.stderr.write(`${String(error.message || error)}\n`);
    process.exit(1);
  }
}
