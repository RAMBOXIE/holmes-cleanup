import { getBrokerAdapters, listBrokerAdapters } from '../adapters/registry.mjs';
import { RetryQueue, queueKey } from '../queue/retry-queue.mjs';
import { ManualReviewQueue } from '../queue/manual-review-queue.mjs';
import { createDefaultStore } from '../queue/state-store.mjs';
import { AuthSession } from '../auth/session-auth.mjs';

export async function runB1Pipeline({
  brokers = listBrokerAdapters(),
  input,
  retryQueue,
  manualReviewQueue,
  store = createDefaultStore(),
  live = false,
  auth = AuthSession.fromSources({ input })
} = {}) {
  const state = store.read();
  const rq = retryQueue || new RetryQueue({ items: state.retry });
  const mq = manualReviewQueue || new ManualReviewQueue(state.manualReview);
  const completed = [...state.completed];
  const failed = [...state.failed];
  const audit = [...state.audit];

  const validation = auth.validate({ requiredScopes: live ? ['submit:spokeo'] : [], minTtlSeconds: 60 });
  if (live && !validation.ok) {
    const payload = {
      status: 'blocked',
      mode: 'live',
      reason: validation.reason,
      detail: validation.detail,
      queues: { retry: rq.items, manualReview: mq.items, completed, failed }
    };
    audit.push({ at: new Date().toISOString(), event: 'auth_blocked', payload });
    await store.mutate(current => ({ ...current, retry: rq.items, manualReview: mq.items, completed, failed, audit }));
    auth.clear();
    return payload;
  }

  const results = [];
  const queued = { retry: [], manualReview: [] };

  try {
    for (const adapter of getBrokerAdapters(brokers)) {
      const request = adapter.prepareRequest(input);

      try {
        const submission = await adapter.submit(request, {
          ...input,
          live,
          authHeaders: auth.toHeaders()
        });
        const parsed = adapter.parseResult(submission, request);
        results.push(parsed);
        completed.push({
          broker: adapter.name,
          requestId: request.requestId,
          status: 'completed',
          live,
          at: new Date().toISOString(),
          evidence: parsed.evidence || null
        });
        audit.push({ at: new Date().toISOString(), event: 'completed', broker: adapter.name, requestId: request.requestId });
      } catch (error) {
        const payload = {
          broker: adapter.name,
          requestId: request.requestId,
          request,
          input,
          errorCode: error.code || 'UNKNOWN',
          queueKey: queueKey({ broker: adapter.name, requestId: request.requestId })
        };

        if (error.transient) {
          if (rq.willReachLimit(payload)) {
            const item = mq.enqueue({ reason: 'retry_limit_reached', payload });
            queued.manualReview.push(item);
            failed.push({ broker: adapter.name, requestId: request.requestId, reason: 'retry_limit_reached', at: new Date().toISOString() });
          } else {
            const item = rq.enqueue({ reason: 'transient_submit_error', payload, error });
            queued.retry.push(item);
          }
        } else {
          const item = mq.enqueue({ reason: 'submit_failed', payload });
          queued.manualReview.push(item);
          failed.push({ broker: adapter.name, requestId: request.requestId, reason: 'submit_failed', at: new Date().toISOString() });
        }

        audit.push({
          at: new Date().toISOString(),
          event: 'submit_error',
          broker: adapter.name,
          requestId: request.requestId,
          transient: Boolean(error.transient),
          code: error.code || 'UNKNOWN'
        });
      }
    }

    await store.mutate(current => ({
      ...current,
      retry: rq.items,
      manualReview: mq.items,
      completed,
      failed,
      audit
    }));

    return {
      status: queued.manualReview.length > 0 ? 'needs_review' : 'ok',
      mode: live ? 'live' : 'dry-run',
      inputRequestId: input?.requestId || null,
      brokers,
      results,
      queues: { retry: rq.items, manualReview: mq.items, completed, failed },
      summary: {
        attempted: brokers.length,
        successful: results.length,
        retryQueued: queued.retry.length,
        manualReviewQueued: queued.manualReview.length
      }
    };
  } finally {
    auth.clear();
  }
}

export async function retryFromQueue({ store = createDefaultStore(), id, live = true, authInput = {} } = {}) {
  const state = store.read();
  const item = state.retry.find(entry => entry.id === id);
  if (!item) {
    return { status: 'not_found', id };
  }

  const remainingRetry = state.retry.filter(entry => entry.id !== id);
  await store.mutate(current => ({ ...current, retry: remainingRetry }));

  const result = await runB1Pipeline({
    brokers: [item.payload.broker],
    input: { ...item.payload.input, ...authInput, requestId: item.payload.requestId },
    live,
    store,
    retryQueue: new RetryQueue({
      items: remainingRetry,
      seedAttempts: { [item.payload.queueKey || `${item.payload.broker}:${item.payload.requestId}`]: item.attempt || 0 }
    }),
    manualReviewQueue: new ManualReviewQueue(state.manualReview)
  });

  return { status: 'retried', id, result };
}

export async function resolveManualReview({ store = createDefaultStore(), id, resolution = 'resolved' } = {}) {
  let resolvedItem = null;
  const next = await store.mutate(current => {
    const manual = current.manualReview.map(item => {
      if (item.id === id) {
        resolvedItem = { ...item, status: resolution, resolvedAt: new Date().toISOString() };
        return resolvedItem;
      }
      return item;
    });
    return {
      ...current,
      manualReview: manual,
      audit: [...current.audit, { at: new Date().toISOString(), event: 'manual_resolved', id, resolution }]
    };
  });

  return resolvedItem
    ? { status: 'resolved', item: resolvedItem, queues: next }
    : { status: 'not_found', id, queues: next };
}
