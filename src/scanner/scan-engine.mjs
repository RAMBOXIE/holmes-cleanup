// Isomorphic: works in Node (>=20) and browsers. No Node-specific imports.
// Callers MUST pass `options.catalog` (the broker-catalog.json contents).
// - CLI: import via `with { type: 'json' }`
// - Web: bundle via Vite's JSON import

import { identityFields, buildCategoryStats, buildExposureProfile } from './exposure-profile.mjs';
import { calculatePrivacyScore, overallRiskLevel, CATEGORY_RISK } from './scoring.mjs';

function randomHex(bytes) {
  // globalThis.crypto.getRandomValues exists in Node 20+ AND all modern browsers
  const buf = new Uint8Array(bytes);
  globalThis.crypto.getRandomValues(buf);
  return Array.from(buf).map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Run a heuristic privacy scan across all brokers.
 * Phase 1: pure computation, no external API calls, instant results.
 *
 * @param {Object} identity
 * @param {string}   identity.fullName
 * @param {string[]} [identity.emails]
 * @param {string[]} [identity.phones]
 * @param {string[]} [identity.usernames]
 * @param {string}   [identity.jurisdiction='US']
 * @param {string}   [identity.city]
 * @param {string}   [identity.state]
 * @param {Object}   options
 * @param {Object}   options.catalog - REQUIRED: broker-catalog.json contents
 * @param {string[]} [options.brokers] - Limit to specific broker names
 * @returns {ScanResult}
 */
export function runHeuristicScan(identity, options = {}) {
  if (!identity || !identity.fullName) {
    throw new Error('identity.fullName is required for privacy scan.');
  }
  if (!options.catalog || !options.catalog.brokers) {
    throw new Error('options.catalog is required (pass broker-catalog.json contents).');
  }

  const catalog = options.catalog;
  const brokerEntries = Object.entries(catalog.brokers);

  // Filter to requested brokers if specified
  const filtered = options.brokers
    ? brokerEntries.filter(([name]) => options.brokers.includes(name))
    : brokerEntries;

  const idFields = identityFields(identity);

  // Build broker list for category stats
  const brokerList = filtered.map(([, entry]) => entry);
  const categoryStats = buildCategoryStats(brokerList);

  // Scan each broker
  const exposures = [];
  for (const [name, entry] of filtered) {
    const profile = buildExposureProfile(name, entry, identity, idFields, categoryStats);
    exposures.push(profile);
  }

  // Sort by confidence descending
  exposures.sort((a, b) => b.confidence - a.confidence);

  // Calculate global score
  const privacyScore = calculatePrivacyScore(exposures);
  const riskLevel = overallRiskLevel(privacyScore);

  // Build summary
  const summary = buildSummary(exposures);

  // Generate recommendations
  const recommendations = buildRecommendations(exposures);

  return {
    scanId: `scan_${Date.now()}_${randomHex(4)}`,
    scannedAt: new Date().toISOString(),
    identity: redactIdentity(identity),
    privacyScore,
    riskLevel,
    summary,
    exposures,
    recommendations
  };
}

// --- Internal helpers ---

function redactIdentity(identity) {
  const redacted = {};
  if (identity.fullName) {
    const parts = identity.fullName.trim().split(/\s+/);
    redacted.name = parts.length > 1
      ? `${parts[0][0]}. ${parts[parts.length - 1]}`
      : `${parts[0][0]}.`;
  }
  if (identity.emails?.length > 0) {
    redacted.emailDomains = identity.emails.map(e => {
      const at = e.indexOf('@');
      return at > 0 ? `***@${e.slice(at + 1)}` : '***';
    });
  }
  if (identity.phones?.length > 0) {
    redacted.phoneAreaCodes = identity.phones.map(p => {
      const digits = p.replace(/\D/g, '');
      return digits.length >= 3 ? `(${digits.slice(0, 3)})***` : '***';
    });
  }
  if (identity.jurisdiction) redacted.jurisdiction = identity.jurisdiction;
  return redacted;
}

function buildSummary(exposures) {
  const byLikelihood = { likely: 0, possible: 0, unlikely: 0 };
  const byCategory = {};
  const byRisk = { critical: 0, high: 0, moderate: 0, low: 0 };

  for (const exp of exposures) {
    byLikelihood[exp.likelihood] = (byLikelihood[exp.likelihood] || 0) + 1;
    byRisk[exp.riskTier] = (byRisk[exp.riskTier] || 0) + 1;

    if (!byCategory[exp.category]) {
      byCategory[exp.category] = { likely: 0, possible: 0, unlikely: 0 };
    }
    byCategory[exp.category][exp.likelihood]++;
  }

  return {
    totalBrokers: exposures.length,
    likelyExposed: byLikelihood.likely,
    possiblyExposed: byLikelihood.possible,
    unlikelyExposed: byLikelihood.unlikely,
    byCategory,
    byRisk
  };
}

function buildRecommendations(exposures) {
  // Group likely exposures by category, sorted by category risk
  const categoryGroups = {};
  for (const exp of exposures) {
    if (exp.likelihood !== 'likely') continue;
    if (!categoryGroups[exp.category]) categoryGroups[exp.category] = [];
    categoryGroups[exp.category].push(exp);
  }

  const recs = Object.entries(categoryGroups)
    .sort(([catA], [catB]) => (CATEGORY_RISK[catB] || 0) - (CATEGORY_RISK[catA] || 0))
    .map(([category, brokers], i) => ({
      priority: i + 1,
      action: `Remove from ${brokers.length} ${category} broker${brokers.length > 1 ? 's' : ''}`,
      category,
      brokerCount: brokers.length,
      brokers: brokers.map(b => b.broker)
    }));

  return recs;
}
