import { dedupeKey, payloadIdentity } from './dedupe.mjs';
import { serializeError } from './utils.mjs';

export class RetryQueue {
  constructor(options = {}) {
    this.maxAttempts = Number.isInteger(options.maxAttempts) ? options.maxAttempts : 3;
    this.baseDelayMs = Number.isInteger(options.baseDelayMs) ? options.baseDelayMs : 1000;
    this.factor = Number.isFinite(options.factor) ? options.factor : 2;
    this.maxDelayMs = Number.isInteger(options.maxDelayMs) ? options.maxDelayMs : 60000;
    this.items = Array.isArray(options.items) ? [...options.items] : [];
    this.keys = new Map();
    this.attemptCounts = new Map();
    for (const item of this.items) {
      const key = queueKey(item.payload);
      const prev = this.attemptCounts.get(key) || 0;
      this.attemptCounts.set(key, Math.max(prev, item.attempt || 0));
      if (item.dedupeKey) this.keys.set(item.dedupeKey, item);
    }
    if (options.seedAttempts && typeof options.seedAttempts === 'object') {
      for (const [key, value] of Object.entries(options.seedAttempts)) {
        const prev = this.attemptCounts.get(key) || 0;
        this.attemptCounts.set(key, Math.max(prev, Number(value) || 0));
      }
    }
  }

  getAttemptCount(payload) {
    return this.attemptCounts.get(queueKey(payload)) || 0;
  }

  willReachLimit(payload) {
    return this.getAttemptCount(payload) + 1 >= this.maxAttempts;
  }

  enqueue({ reason, payload, error, createdAt = new Date().toISOString() }) {
    const uniqueKey = dedupeKey(payloadIdentity(payload, reason));
    const existing = this.keys.get(uniqueKey);
    if (existing) {
      const key = queueKey(payload);
      const attempt = this.getAttemptCount(payload) + 1;
      this.attemptCounts.set(key, attempt);
      existing.lastSeenAt = createdAt;
      existing.seenCount = (existing.seenCount || 1) + 1;
      existing.attempt = Math.max(existing.attempt || 0, attempt);
      existing.nextAttemptAt = new Date(Date.parse(createdAt) + existing.backoffMs).toISOString();
      return { ...existing, deduped: true };
    }

    const key = queueKey(payload);
    const attempt = this.getAttemptCount(payload) + 1;
    this.attemptCounts.set(key, attempt);

    const backoffMs = Math.min(
      this.baseDelayMs * Math.pow(this.factor, attempt - 1),
      this.maxDelayMs
    );

    const item = {
      id: `retry:${uniqueKey}`,
      dedupeKey: uniqueKey,
      reason,
      payload,
      error: serializeError(error),
      createdAt,
      status: 'queued',
      attempt,
      seenCount: 1,
      backoffMs,
      nextAttemptAt: new Date(Date.parse(createdAt) + backoffMs).toISOString()
    };

    this.items.push(item);
    this.keys.set(uniqueKey, item);
    return item;
  }
}

export function queueKey(payload = {}) {
  return payload.queueKey || `${payload.broker || 'unknown'}:${payload.requestId || 'unknown'}`;
}

