// Browser-side parser for vanish audit artifacts:
//   - report JSON  (output of `vanish report` and the runB1Pipeline result):
//       { status, mode, results[], queues{}, summary{} }
//   - queue-state JSON (data/queue-state.json):
//       { retry[], manualReview[], deadLetter[], completed[], failed[],
//         audit[], followUp[] }
//
// The two shapes overlap heavily; this parser auto-detects and produces a
// normalised view. **HMAC verification is intentionally NOT done in the
// browser** — the secret would have to ship in the JS bundle. The parser
// only does structural integrity checks (signature field shape, presence,
// algorithm declared) and the UI must label the result accordingly.

export const MAX_INPUT_BYTES = 10 * 1024 * 1024; // 10 MB

const KNOWN_BUCKETS = new Set([
  'retry', 'manualReview', 'deadLetter', 'completed',
  'failed', 'audit', 'followUp'
]);

/**
 * Safely parse JSON text. Enforces size cap and strips prototype-pollution shapes.
 * @returns { ok: true, value } | { ok: false, error }
 */
export function safeParseJson(text) {
  if (typeof text !== 'string') {
    return { ok: false, error: 'Input is not a string.' };
  }
  if (text.length > MAX_INPUT_BYTES) {
    return { ok: false, error: `Input larger than ${MAX_INPUT_BYTES / (1024 * 1024)} MB cap.` };
  }
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch (err) {
    return { ok: false, error: `Not valid JSON: ${err.message}` };
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return { ok: false, error: 'Top-level JSON value must be an object.' };
  }
  // Defence in depth: strip any __proto__ keys at any depth.
  stripProtoKeys(parsed);
  return { ok: true, value: parsed };
}

function stripProtoKeys(obj) {
  if (!obj || typeof obj !== 'object') return;
  if (Object.prototype.hasOwnProperty.call(obj, '__proto__')) {
    delete obj.__proto__;
  }
  for (const v of Object.values(obj)) {
    if (v && typeof v === 'object') stripProtoKeys(v);
  }
}

/**
 * Detect which artifact shape this JSON is.
 *   - 'report' if it has summary/results/brokers
 *   - 'queue-state' if it has audit/followUp at top level
 *   - 'unknown' otherwise (still parseable but no known shape)
 */
export function detectKind(parsed) {
  if (!parsed || typeof parsed !== 'object') return 'unknown';
  // Queue-state files always have a top-level audit[]; report files (full
  // or partial) have queues{} or any of summary/results/brokers.
  const hasStateFields = ('audit' in parsed) && Array.isArray(parsed.audit);
  if (hasStateFields) return 'queue-state';
  const hasReportFields = ('queues' in parsed)
    || ('results' in parsed)
    || ('summary' in parsed)
    || ('brokers' in parsed);
  if (hasReportFields) return 'report';
  return 'unknown';
}

/**
 * Normalise either artifact shape into a single view used by queue-renderer.
 * Forward-compatible: any top-level array key not in KNOWN_BUCKETS is preserved
 * under `extraBuckets` so the renderer can show it tolerantly.
 *
 * @returns {Object} normalised view (see shape below)
 */
export function parseAuditArtifact(parsed) {
  const kind = detectKind(parsed);

  const buckets = {};
  for (const key of Object.keys(parsed || {})) {
    if (KNOWN_BUCKETS.has(key) && Array.isArray(parsed[key])) {
      buckets[key] = parsed[key];
    }
  }

  const extraBuckets = {};
  for (const [key, value] of Object.entries(parsed || {})) {
    if (!KNOWN_BUCKETS.has(key) && Array.isArray(value) && value.length > 0
        && (key.endsWith('Queue') || key.endsWith('Items') || /[A-Za-z]+List$/.test(key))) {
      extraBuckets[key] = value;
    }
  }

  const summary = {
    attempted: parsed?.summary?.attempted ?? null,
    successful: parsed?.summary?.successful ?? null,
    retryQueued: parsed?.summary?.retryQueued ?? buckets.retry?.length ?? null,
    manualReviewQueued: parsed?.summary?.manualReviewQueued ?? buckets.manualReview?.length ?? null,
    deadLetterQueued: parsed?.summary?.deadLetterQueued ?? buckets.deadLetter?.length ?? null,
    blocked: parsed?.summary?.blocked ?? null
  };

  const audit = Array.isArray(parsed?.audit) ? parsed.audit : (parsed?.queues?.audit || []);
  const auditSummary = summariseAuditChain(audit);

  const results = Array.isArray(parsed?.results) ? parsed.results : [];

  return {
    kind,
    status: parsed?.status ?? null,
    mode: parsed?.mode ?? null,
    inputRequestId: parsed?.inputRequestId ?? null,
    brokers: Array.isArray(parsed?.brokers) ? parsed.brokers : [],
    results,
    buckets,
    extraBuckets,
    summary,
    audit,
    auditSummary,
    raw: parsed
  };
}

/**
 * Summarise an audit chain. Returns counts of signed vs unsigned entries,
 * event-type histogram, and the time span. Signature is checked structurally
 * only (presence + format), NEVER cryptographically.
 */
export function summariseAuditChain(auditArr) {
  if (!Array.isArray(auditArr)) {
    return {
      total: 0, signed: 0, unsigned: 0,
      eventCounts: {}, oldestAt: null, newestAt: null,
      structurallyValid: 0, structurallyInvalid: 0
    };
  }
  let signed = 0;
  let unsigned = 0;
  let structurallyValid = 0;
  let structurallyInvalid = 0;
  const eventCounts = {};
  let oldestAt = null;
  let newestAt = null;

  for (const entry of auditArr) {
    if (!entry || typeof entry !== 'object') continue;
    const event = String(entry.event ?? 'unknown');
    eventCounts[event] = (eventCounts[event] ?? 0) + 1;

    const at = entry.at;
    if (typeof at === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(at)) {
      if (!oldestAt || at < oldestAt) oldestAt = at;
      if (!newestAt || at > newestAt) newestAt = at;
    }

    const hasSig = typeof entry.signature === 'string' && entry.signature.length > 0;
    const hasAlg = typeof entry.signatureAlgorithm === 'string' && entry.signatureAlgorithm.length > 0;
    if (hasSig) {
      signed += 1;
      // Structural validity: HMAC-SHA256 declared, sha256= prefix, hex body length 64.
      const algOk = hasAlg && entry.signatureAlgorithm === 'HMAC-SHA256';
      const sigShape = /^sha256=[a-f0-9]{64}$/i.test(entry.signature);
      if (algOk && sigShape) structurallyValid += 1;
      else structurallyInvalid += 1;
    } else {
      unsigned += 1;
    }
  }

  return {
    total: auditArr.length,
    signed,
    unsigned,
    structurallyValid,
    structurallyInvalid,
    eventCounts,
    oldestAt,
    newestAt
  };
}

/**
 * Quick liveness/structural check for the entire artifact. Used to surface
 * issues at a glance before we render details.
 */
export function validateStructure(parsed) {
  const issues = [];
  if (!parsed || typeof parsed !== 'object') {
    issues.push('Top-level value is not an object.');
    return { valid: false, issues };
  }
  const kind = detectKind(parsed);
  if (kind === 'unknown') {
    issues.push('Could not detect whether this is a report or queue-state JSON.');
  }
  if (kind === 'report') {
    if (parsed.summary && typeof parsed.summary === 'object') {
      const expected = (parsed.summary.successful ?? 0)
        + (parsed.summary.retryQueued ?? 0)
        + (parsed.summary.manualReviewQueued ?? 0)
        + (parsed.summary.deadLetterQueued ?? 0)
        + (parsed.summary.blocked ?? 0);
      const attempted = parsed.summary.attempted;
      if (typeof attempted === 'number' && expected > attempted) {
        issues.push(`summary counts add to more than attempted (${expected} > ${attempted}) — file may be corrupt.`);
      }
    }
  }
  return { valid: issues.length === 0, issues };
}
