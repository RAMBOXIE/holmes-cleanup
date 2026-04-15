import { createDryRunBrokerAdapter } from './_dry-run-broker.mjs';

const dry = createDryRunBrokerAdapter({ name: 'spokeo', displayName: 'Spokeo' });

export const spokeoAdapter = {
  ...dry,
  dryRun: false,
  liveCapable: true,

  async submit(request, input = {}) {
    if (!input.live) {
      return dry.submit(request, input);
    }

    if (input.simulate?.spokeo === 'transient-error') {
      const error = new Error('Spokeo live endpoint temporary unavailable');
      error.code = 'BROKER_RATE_LIMITED';
      error.transient = true;
      throw error;
    }

    const endpoint = process.env.SPOKEO_LIVE_ENDPOINT || input.liveEndpoint || 'https://postman-echo.com/post';
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        ...(input.authHeaders || {})
      },
      body: JSON.stringify({
        broker: 'spokeo',
        requestId: request.requestId,
        action: request.action,
        identityHints: request.identityHints
      })
    });

    if (response.status >= 500 || response.status === 429) {
      const error = new Error(`Spokeo live transient status ${response.status}`);
      error.code = `HTTP_${response.status}`;
      error.transient = true;
      throw error;
    }

    if (!response.ok) {
      const error = new Error(`Spokeo live rejected status ${response.status}`);
      error.code = `HTTP_${response.status}`;
      error.transient = false;
      throw error;
    }

    const body = await response.json();
    return {
      broker: 'spokeo',
      status: 'submitted',
      dryRun: false,
      ticketId: `spokeo-${request.requestId}-${Date.now()}`,
      submittedAt: new Date().toISOString(),
      endpoint,
      httpStatus: response.status,
      responseBody: body
    };
  },

  parseResult(submission, request) {
    const parsed = dry.parseResult(submission, request);
    return {
      ...parsed,
      dryRun: Boolean(submission.dryRun),
      evidence: {
        endpoint: submission.endpoint || null,
        httpStatus: submission.httpStatus || null,
        echoRequestId: submission.responseBody?.json?.requestId || null
      },
      notes: submission.dryRun
        ? parsed.notes
        : ['Live HTTP submission executed against configured endpoint.']
    };
  }
};

export default spokeoAdapter;
