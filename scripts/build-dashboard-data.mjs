#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';

const dataDir = path.resolve('dashboard', 'data');
fs.mkdirSync(dataDir, { recursive: true });

const retry = [
  {
    broker: 'whitepages',
    requestId: 'dash-demo-001',
    reason: 'transient_submit_error',
    status: 'queued',
    attempt: 1,
    nextAttemptAt: '2026-04-15T12:15:00.000Z'
  }
];

const manualReview = [
  {
    broker: 'spokeo',
    requestId: 'dash-demo-002',
    reason: 'retry_limit_reached',
    status: 'open',
    createdAt: '2026-04-15T12:00:00.000Z'
  }
];

const status = {
  generatedAt: new Date().toISOString(),
  mode: 'dry-run',
  counters: {
    retryQueued: retry.length,
    manualReviewOpen: manualReview.length,
    successful: 2,
    blocked: 1
  }
};

fs.writeFileSync(path.join(dataDir, 'retry-queue.json'), JSON.stringify(retry, null, 2));
fs.writeFileSync(path.join(dataDir, 'manual-review-queue.json'), JSON.stringify(manualReview, null, 2));
fs.writeFileSync(path.join(dataDir, 'status.json'), JSON.stringify(status, null, 2));

process.stdout.write(`Wrote dashboard demo data to ${dataDir}\n`);
