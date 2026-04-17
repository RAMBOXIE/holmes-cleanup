import crypto from 'node:crypto';

const DEV_FALLBACK_SECRET = 'holmes-local-audit-development-key';

function resolveAuditSecret() {
  const envKey = process.env.HOLMES_AUDIT_HMAC_KEY;
  if (envKey) return envKey;

  const nodeEnv = (process.env.NODE_ENV || '').toLowerCase();
  if (nodeEnv === 'production') {
    throw new Error(
      'HOLMES_AUDIT_HMAC_KEY environment variable is required in production. '
      + 'Audit signatures with the default key are not trustworthy.'
    );
  }

  if (nodeEnv !== 'test') {
    console.warn(
      '[holmes-cleanup] WARNING: Using default audit HMAC key. '
      + 'Set HOLMES_AUDIT_HMAC_KEY for trustworthy signatures.'
    );
  }

  return DEV_FALLBACK_SECRET;
}

export function signAuditEvent(event, { secret = resolveAuditSecret() } = {}) {
  const unsigned = { ...event };
  delete unsigned.signature;
  delete unsigned.signatureAlgorithm;

  return {
    ...unsigned,
    signatureAlgorithm: 'HMAC-SHA256',
    signature: `sha256=${hmac(unsigned, secret)}`
  };
}

export function verifyAuditEvent(event, { secret = resolveAuditSecret() } = {}) {
  if (!event?.signature) return false;
  const expected = signAuditEvent(event, { secret }).signature;
  return timingSafeEqual(expected, event.signature);
}

export function signAuditEvents(events, options = {}) {
  return events.map(event => event.signature ? event : signAuditEvent(event, options));
}

function hmac(value, secret) {
  // Sanitize to JSON-safe types before canonicalization to ensure
  // consistent signatures across environments (handles Date, undefined, etc.)
  const safe = JSON.parse(JSON.stringify(value));
  return crypto
    .createHmac('sha256', secret)
    .update(canonicalJson(safe))
    .digest('hex');
}

function canonicalJson(value) {
  if (value === null || value === undefined) {
    return 'null';
  }
  if (Array.isArray(value)) {
    return `[${value.map(canonicalJson).join(',')}]`;
  }
  if (typeof value === 'object') {
    return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

function timingSafeEqual(left, right) {
  const leftBuffer = Buffer.from(String(left));
  const rightBuffer = Buffer.from(String(right));
  return leftBuffer.length === rightBuffer.length && crypto.timingSafeEqual(leftBuffer, rightBuffer);
}
