import fs from 'node:fs';
import path from 'node:path';

const DEFAULT_STATE = {
  retry: [],
  manualReview: [],
  completed: [],
  failed: [],
  audit: []
};

export class QueueStateStore {
  constructor({ filePath = path.resolve('data', 'queue-state.json'), lockTimeoutMs = 3000 } = {}) {
    this.filePath = filePath;
    this.lockPath = `${filePath}.lock`;
    this.lockTimeoutMs = lockTimeoutMs;
    fs.mkdirSync(path.dirname(this.filePath), { recursive: true });
    if (!fs.existsSync(this.filePath)) {
      fs.writeFileSync(this.filePath, JSON.stringify(DEFAULT_STATE, null, 2));
    }
  }

  read() {
    const raw = fs.readFileSync(this.filePath, 'utf8');
    const parsed = JSON.parse(raw);
    return {
      ...DEFAULT_STATE,
      ...parsed,
      retry: Array.isArray(parsed.retry) ? parsed.retry : [],
      manualReview: Array.isArray(parsed.manualReview) ? parsed.manualReview : [],
      completed: Array.isArray(parsed.completed) ? parsed.completed : [],
      failed: Array.isArray(parsed.failed) ? parsed.failed : [],
      audit: Array.isArray(parsed.audit) ? parsed.audit : []
    };
  }

  async mutate(mutator) {
    const release = await this.acquireLock();
    try {
      const current = this.read();
      const next = mutator(structuredClone(current)) || current;
      fs.writeFileSync(this.filePath, JSON.stringify(next, null, 2));
      return next;
    } finally {
      release();
    }
  }

  async acquireLock() {
    const started = Date.now();
    while (Date.now() - started < this.lockTimeoutMs) {
      try {
        const fd = fs.openSync(this.lockPath, 'wx');
        return () => {
          fs.closeSync(fd);
          if (fs.existsSync(this.lockPath)) fs.unlinkSync(this.lockPath);
        };
      } catch (error) {
        if (error.code !== 'EEXIST') throw error;
      }
      await new Promise(resolve => setTimeout(resolve, 30));
    }
    throw new Error(`Queue state lock timeout: ${this.lockPath}`);
  }
}

export function createDefaultStore(options = {}) {
  return new QueueStateStore(options);
}
