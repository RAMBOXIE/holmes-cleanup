import fs from 'node:fs';
import path from 'node:path';

const DEFAULT_STATE = {
  retry: [],
  manualReview: [],
  deadLetter: [],
  completed: [],
  failed: [],
  audit: []
};

const STALE_LOCK_MS = 30_000; // lock older than 30s is considered stale

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
      deadLetter: Array.isArray(parsed.deadLetter) ? parsed.deadLetter : [],
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
    let staleLockCleaned = false;

    while (Date.now() - started < this.lockTimeoutMs) {
      // Check for stale lock before retrying
      if (!staleLockCleaned && fs.existsSync(this.lockPath)) {
        try {
          const lockContent = fs.readFileSync(this.lockPath, 'utf8').trim();
          const lockData = JSON.parse(lockContent);
          const lockAge = Date.now() - lockData.createdAt;
          const lockPid = lockData.pid;

          const pidAlive = isProcessAlive(lockPid);
          if (!pidAlive || lockAge > STALE_LOCK_MS) {
            fs.unlinkSync(this.lockPath);
            staleLockCleaned = true;
            // Fall through to try acquiring
          }
        } catch {
          // Lock file is corrupt or unreadable — remove it
          try { fs.unlinkSync(this.lockPath); } catch {}
          staleLockCleaned = true;
        }
      }

      try {
        const fd = fs.openSync(this.lockPath, 'wx');
        // Write PID + timestamp so other processes can detect stale locks
        const lockInfo = JSON.stringify({ pid: process.pid, createdAt: Date.now() });
        fs.writeSync(fd, lockInfo);
        return () => {
          fs.closeSync(fd);
          try { fs.unlinkSync(this.lockPath); } catch {}
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

function isProcessAlive(pid) {
  try {
    process.kill(pid, 0); // signal 0 = existence check, does not kill
    return true;
  } catch {
    return false;
  }
}
