export class ManualReviewQueue {
  constructor(items = []) {
    this.items = [...items];
  }

  enqueue({ reason, payload, status = 'open', createdAt = new Date().toISOString() }) {
    const item = {
      id: `${payload?.broker || 'unknown'}:${payload?.requestId || 'unknown'}:${Date.now()}`,
      reason,
      payload,
      createdAt,
      status
    };

    this.items.push(item);
    return item;
  }
}
