import { createDryRunBrokerAdapter } from './_dry-run-broker.mjs';

const BLOCK_NEXT_ACTIONS = [
  'Confirm termsAccepted=true before live official submission.',
  'Confirm lawfulBasis and operatorId are present.',
  'Configure the official endpoint before enabling execution.'
];

const BODY_STRATEGIES = {
  'phone-centric': (name) => (request) => ({
    broker: name,
    requestId: request.requestId,
    action: request.action,
    identityHints: request.identityHints,
    phones: request.identityHints?.phones || []
  })
};

export function createLiveBrokerAdapter({
  name,
  displayName,
  optOutUrl = null,
  optOutMethod = 'form',
  category = 'people-search',
  jurisdiction = 'US',
  endpointEnvVar = null,
  defaultTestEndpoint = 'https://postman-echo.com/post',
  buildRequestBody = null,
  extractEvidence = null,
  officialEndpointMode = 'form',
  officialEndpointConfig = null,
  bodyStrategy = null
}) {
  const dry = createDryRunBrokerAdapter({ name, displayName, optOutUrl, optOutMethod, category, jurisdiction });

  const defaultBuildBody = (request) => ({
    broker: name,
    requestId: request.requestId,
    action: request.action,
    identityHints: request.identityHints
  });

  const defaultExtractEvidence = (responseBody, submission) => ({
    endpoint: submission.endpoint || null,
    httpStatus: submission.httpStatus || null,
    echoRequestId: responseBody?.json?.requestId || null
  });

  const bodyBuilder = buildRequestBody
    || (bodyStrategy && BODY_STRATEGIES[bodyStrategy] ? BODY_STRATEGIES[bodyStrategy](name) : null)
    || defaultBuildBody;
  const evidenceExtractor = extractEvidence || defaultExtractEvidence;

  // Resolve official endpoint config: prefer passed-in config, no global JSON dependency
  const officialConfig = officialEndpointConfig || {};

  return {
    ...dry,
    dryRun: false,
    liveCapable: true,

    async submit(request, input = {}) {
      if (!input.live) {
        return dry.submit(request, input);
      }

      // Official mode: full compliance gates
      if (input.officialMode || input.useOfficialEndpoint) {
        const compliance = complianceSnapshot(input);
        const endpointConfig = resolveOfficialEndpoint(input, officialConfig, officialEndpointMode);

        if (!endpointConfig.configured || !compliance.termsAccepted || !compliance.lawfulBasis || !compliance.operatorId) {
          return {
            broker: name,
            status: 'blocked',
            reason: (!compliance.termsAccepted || !compliance.lawfulBasis || !compliance.operatorId)
              ? 'compliance_not_confirmed'
              : 'official_endpoint_not_configured',
            dryRun: false,
            nextActions: BLOCK_NEXT_ACTIONS,
            compliance,
            antiBot: antiBotPlaceholders(endpointConfig.config),
            complianceNotes: endpointConfig.config?.complianceNotes || []
          };
        }

        await waitWithJitter(endpointConfig.config.rateLimitPolicy);
        const response = await fetch(endpointConfig.endpoint, {
          method: endpointConfig.method,
          headers: {
            'content-type': 'application/json',
            'user-agent': endpointConfig.config.userAgentStrategy?.defaultUserAgent || 'HolmesCleanup/0.1',
            ...(input.authHeaders || {})
          },
          body: JSON.stringify({ ...bodyBuilder(request, input), compliance })
        });

        if (response.status === 403 && input.captchaDetected) {
          return {
            broker: name,
            status: 'blocked',
            reason: 'captcha_requires_human',
            nextActions: ['Send the request to the captcha-to-human queue for operator handling.'],
            compliance,
            antiBot: antiBotPlaceholders(endpointConfig.config)
          };
        }

        classifyHttpError(response, name, 'official');

        return {
          broker: name,
          status: 'submitted',
          dryRun: false,
          ticketId: `${name}-${request.requestId}-${Date.now()}`,
          submittedAt: new Date().toISOString(),
          endpoint: endpointConfig.endpoint,
          httpStatus: response.status,
          responseBody: await safeJson(response),
          compliance,
          antiBot: antiBotPlaceholders(endpointConfig.config)
        };
      }

      // Test/echo live mode
      const endpoint = (endpointEnvVar && process.env[endpointEnvVar])
        || input.liveEndpoint
        || defaultTestEndpoint;

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          ...(input.authHeaders || {})
        },
        body: JSON.stringify(bodyBuilder(request, input))
      });

      classifyHttpError(response, name, 'live');

      const body = await response.json();
      return {
        broker: name,
        status: 'submitted',
        dryRun: false,
        ticketId: `${name}-${request.requestId}-${Date.now()}`,
        submittedAt: new Date().toISOString(),
        endpoint,
        httpStatus: response.status,
        responseBody: body
      };
    },

    parseResult(submission, request) {
      if (submission.status === 'blocked') {
        return {
          broker: name,
          status: 'blocked',
          requestId: request.requestId,
          reason: submission.reason,
          nextActions: submission.nextActions,
          compliance: submission.compliance,
          antiBot: submission.antiBot,
          notes: submission.complianceNotes || []
        };
      }

      const parsed = dry.parseResult(submission, request);
      return {
        ...parsed,
        dryRun: Boolean(submission.dryRun),
        evidence: evidenceExtractor(submission.responseBody, submission),
        notes: submission.dryRun
          ? parsed.notes
          : ['Live HTTP submission executed against configured endpoint.']
      };
    }
  };
}

// --- Generic helpers ---

function complianceSnapshot(input = {}) {
  return {
    termsAccepted: input.termsAccepted === true,
    lawfulBasis: input.lawfulBasis || null,
    operatorId: input.operatorId || null
  };
}

function resolveOfficialEndpoint(input, config = {}, defaultMode = 'form') {
  const mode = input.officialEndpointMode || defaultMode;
  const selected = config[mode] || config.form || config.api || {};
  const endpoint = input.officialEndpoint || (selected.endpointEnv && process.env[selected.endpointEnv]) || selected.endpoint;
  return {
    config,
    endpoint,
    method: selected.method || 'POST',
    configured: Boolean(config.enabled && endpoint)
  };
}

function antiBotPlaceholders(config = {}) {
  const rateLimit = config.rateLimitPolicy || {};
  return {
    rateLimiting: rateLimit,
    jitter: {
      enabled: true,
      minMs: rateLimit.jitterMsMin || 0,
      maxMs: rateLimit.jitterMsMax || 0
    },
    userAgentStrategy: config.userAgentStrategy || null,
    captchaToHumanQueue: config.captchaToHumanQueue || null
  };
}

function classifyHttpError(response, brokerName, mode) {
  if (response.status >= 500 || response.status === 429) {
    const error = new Error(`${brokerName} ${mode} endpoint transient status ${response.status}`);
    error.code = `HTTP_${response.status}`;
    error.transient = true;
    throw error;
  }
  if (!response.ok) {
    const error = new Error(`${brokerName} ${mode} endpoint rejected status ${response.status}`);
    error.code = `HTTP_${response.status}`;
    error.transient = false;
    throw error;
  }
}

async function waitWithJitter(policy = {}) {
  const min = Number(policy.jitterMsMin) || 0;
  const max = Number(policy.jitterMsMax) || min;
  const delay = Math.floor(min + Math.random() * Math.max(0, max - min));
  if (delay > 0) await new Promise(resolve => setTimeout(resolve, delay));
}

async function safeJson(response) {
  try { return await response.json(); } catch { return null; }
}
