#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { createDefaultStore } from '../src/queue/state-store.mjs';

const statePath = path.resolve(process.argv[2] || 'data/queue-state.json');
const store = createDefaultStore({ filePath: statePath });
const state = store.read();

const dataDir = path.resolve('dashboard', 'data');
fs.mkdirSync(dataDir, { recursive: true });

const status = {
  generatedAt: new Date().toISOString(),
  mode: 'live-aware',
  counters: {
    pendingRetry: state.retry.filter(item => item.status === 'queued').length,
    manualReview: state.manualReview.filter(item => item.status === 'open').length,
    completed: state.completed.length,
    failed: state.failed.length
  }
};

fs.writeFileSync(path.join(dataDir, 'retry-queue.json'), JSON.stringify(state.retry, null, 2));
fs.writeFileSync(path.join(dataDir, 'manual-review-queue.json'), JSON.stringify(state.manualReview, null, 2));
fs.writeFileSync(path.join(dataDir, 'completed.json'), JSON.stringify(state.completed, null, 2));
fs.writeFileSync(path.join(dataDir, 'failed.json'), JSON.stringify(state.failed, null, 2));
fs.writeFileSync(path.join(dataDir, 'status.json'), JSON.stringify(status, null, 2));

process.stdout.write(`Wrote dashboard data from ${statePath} to ${dataDir}\n`);
