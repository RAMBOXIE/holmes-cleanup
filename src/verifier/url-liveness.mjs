// URL liveness checker — tells us if a broker profile URL is still present,
// removed, or in an unknown state.

const DEFAULT_USER_AGENT = 'HolmesCleanup-Verify/1.0 (opt-out verification; https://github.com/RAMBOXIE/holmes-cleanup)';

const TIMEOUT_MS = 15_000;

/**
 * Classify what we think happened with a broker profile URL.
 *
 * @param {string} profileUrl
 * @param {Object} [options]
 * @param {number} [options.timeoutMs=15000]
 * @param {string} [options.userAgent]
 * @param {Function} [options.fetchImpl]   - override for testing
 * @returns {Promise<{ status, httpStatus, finalUrl, redirected, reason }>}
 */
export async function checkLiveness(profileUrl, options = {}) {
  if (!profileUrl) {
    return { status: 'unknown', reason: 'no-url-provided' };
  }

  const fetchImpl = options.fetchImpl || fetch;
  const timeoutMs = options.timeoutMs ?? TIMEOUT_MS;
  const userAgent = options.userAgent || DEFAULT_USER_AGENT;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  let response;
  try {
    response = await fetchImpl(profileUrl, {
      method: 'GET',
      redirect: 'follow',
      headers: { 'user-agent': userAgent, accept: 'text/html' },
      signal: controller.signal
    });
  } catch (err) {
    clearTimeout(timeout);
    if (err.name === 'AbortError') {
      return { status: 'unknown', reason: 'timeout', error: 'timeout' };
    }
    return { status: 'unknown', reason: 'network-error', error: err.message };
  }
  clearTimeout(timeout);

  const httpStatus = response.status;
  const finalUrl = response.url || profileUrl;
  const redirected = finalUrl !== profileUrl;

  // 404 / 410 → removed
  if (httpStatus === 404 || httpStatus === 410) {
    return { status: 'removed', httpStatus, finalUrl, redirected, reason: `http-${httpStatus}` };
  }

  // Redirected to domain root or very short path → likely removed
  if (redirected && isRootLikeUrl(finalUrl, profileUrl)) {
    return { status: 'removed', httpStatus, finalUrl, redirected, reason: 'redirected-to-root' };
  }

  // 403 / 429 → probably rate-limit or captcha, not dispositive
  if (httpStatus === 403 || httpStatus === 429) {
    return { status: 'unknown', httpStatus, finalUrl, redirected, reason: `http-${httpStatus}-captcha-or-ratelimit` };
  }

  // 5xx → broker server issue, unknown
  if (httpStatus >= 500) {
    return { status: 'unknown', httpStatus, finalUrl, redirected, reason: `http-${httpStatus}-server-error` };
  }

  // 200 on same path → conservative: still present
  if (httpStatus === 200 && !redirected) {
    return { status: 'still-present', httpStatus, finalUrl, redirected, reason: 'http-200-same-url' };
  }

  // 200 after redirect to different path (but not root) → unknown
  if (httpStatus === 200 && redirected) {
    return { status: 'unknown', httpStatus, finalUrl, redirected, reason: 'http-200-redirected-to-different-path' };
  }

  // Other status codes
  return { status: 'unknown', httpStatus, finalUrl, redirected, reason: `http-${httpStatus}-other` };
}

function isRootLikeUrl(finalUrl, originalUrl) {
  try {
    const final = new URL(finalUrl);
    const orig = new URL(originalUrl);

    // Different host = weird, treat as removed (broker deprecated)
    if (final.host !== orig.host) return true;

    // Root or near-root paths
    const path = final.pathname.replace(/\/$/, '');
    if (path === '' || path === '/') return true;
    if (['/home', '/index', '/index.html', '/search'].includes(path)) return true;

    // Significantly shorter path (original had deep profile URL, final is short)
    const origPath = orig.pathname.replace(/\/$/, '');
    if (origPath.length > 20 && path.length < origPath.length / 3) return true;

    return false;
  } catch {
    return false;
  }
}

/**
 * Batch verify multiple followUp entries.
 *
 * @param {Array} entries - followUp array from state-store
 * @param {Object} options
 * @param {Function} [options.onProgress]   - (entry, result) => void
 * @param {number} [options.delayMs=1500]   - jitter delay between checks
 * @returns {Promise<Array>} — updated entries with verification fields
 */
export async function verifyEntries(entries, options = {}) {
  const delayMs = options.delayMs ?? 1500;
  const fetchImpl = options.fetchImpl;
  const updated = [];

  for (const entry of entries) {
    const result = await checkLiveness(entry.profileUrl, { fetchImpl });

    const now = new Date().toISOString();
    const nextEntry = {
      ...entry,
      verifiedAt: now,
      verificationResult: result.status,
      verificationReason: result.reason || null,
      verificationHttpStatus: result.httpStatus ?? null,
      verificationFinalUrl: result.finalUrl ?? null,
      status: statusFromResult(entry.status, result.status)
    };

    updated.push(nextEntry);
    if (options.onProgress) options.onProgress(entry, result);

    // Jitter between checks to be polite to broker servers
    if (delayMs > 0 && entries.indexOf(entry) < entries.length - 1) {
      await new Promise(r => setTimeout(r, delayMs + Math.floor(Math.random() * 500)));
    }
  }

  return updated;
}

function statusFromResult(currentStatus, verificationResult) {
  // Map URL-level result to queue-level status
  if (verificationResult === 'removed') return 'verified-removed';
  if (verificationResult === 'still-present') return 'still-present';
  return currentStatus || 'pending-verification';
}
