// AI training exposure scanner.
//
// Given a list of platforms the user says they use, classify exposure:
//   - "exposed"       : user uses + platform's default is opted-in or licensed
//   - "safe"          : user uses + platform's default is opted-out
//   - "action-needed" : user uses + platform has explicit training toggle they should check
//   - "not-applicable": user doesn't use this platform
//
// Isomorphic: works in Node and browser. No Node-specific imports.

const EXPOSURE_WEIGHT = {
  'exposed': 1.0,
  'licensed': 1.0,
  'action-needed': 0.5,
  'safe': 0.0,
  'not-applicable': 0.0
};

const DIFFICULTY_WEIGHT = {
  'none': 0,
  'easy': 1,
  'medium': 2,
  'hard': 4,
  'impossible': 10
};

function classifyPlatform(platform, userUsesIt) {
  if (!userUsesIt) return 'not-applicable';

  switch (platform.defaultConsent) {
    case 'opted-in':
      return 'exposed';
    case 'licensed':
      return 'licensed';       // data was sold/licensed to AI companies
    case 'opted-out':
      return 'safe';
    case 'unclear':
      return 'action-needed';
    default:
      return 'action-needed';
  }
}

function randomHex(bytes) {
  const buf = new Uint8Array(bytes);
  globalThis.crypto.getRandomValues(buf);
  return Array.from(buf).map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Run an AI training exposure scan.
 *
 * @param {Object} usage - { platformKey: true } map of platforms user says they use
 * @param {Object} options
 * @param {Object} options.catalog - REQUIRED: ai-platforms-catalog.json contents
 * @returns {AiScanResult}
 */
export function runAiScan(usage, options = {}) {
  if (!options.catalog || !options.catalog.platforms) {
    throw new Error('options.catalog is required (pass ai-platforms-catalog.json).');
  }
  if (!usage || typeof usage !== 'object') {
    throw new Error('usage is required (map of platformKey → boolean).');
  }

  const catalog = options.catalog;
  const entries = Object.entries(catalog.platforms);

  const exposures = [];
  for (const [key, platform] of entries) {
    const userUsesIt = Boolean(usage[key] || usage[platform.signalAsked]);
    const classification = classifyPlatform(platform, userUsesIt);

    exposures.push({
      platform: key,
      displayName: platform.displayName,
      category: platform.category,
      userUses: userUsesIt,
      classification,
      defaultConsent: platform.defaultConsent,
      optOutDifficulty: platform.optOutDifficulty,
      optOutUrl: platform.optOutUrl,
      optOutMethod: platform.optOutMethod,
      estimatedSeconds: platform.estimatedSeconds,
      dataUsed: platform.dataUsed || [],
      aiModels: platform.aiModels || [],
      region: platform.region,
      notes: platform.notes
    });
  }

  // Compute exposure score: among platforms user says they use, what fraction are exposed?
  const usedPlatforms = exposures.filter(e => e.userUses);
  const exposedCount = usedPlatforms.filter(e =>
    e.classification === 'exposed' || e.classification === 'licensed'
  ).length;
  const actionNeededCount = usedPlatforms.filter(e => e.classification === 'action-needed').length;
  const safeCount = usedPlatforms.filter(e => e.classification === 'safe').length;

  // Raw score: weighted exposure as percentage
  let weightedExposure = 0;
  for (const e of usedPlatforms) {
    weightedExposure += EXPOSURE_WEIGHT[e.classification] || 0;
  }
  const score = usedPlatforms.length > 0
    ? Math.round((weightedExposure / usedPlatforms.length) * 100)
    : 0;

  // Quick actions (easy opt-outs, high impact)
  const quickWins = usedPlatforms
    .filter(e =>
      (e.classification === 'exposed' || e.classification === 'action-needed') &&
      (e.optOutDifficulty === 'easy' || e.optOutDifficulty === 'medium') &&
      e.optOutUrl
    )
    .sort((a, b) =>
      (DIFFICULTY_WEIGHT[a.optOutDifficulty] || 999) -
      (DIFFICULTY_WEIGHT[b.optOutDifficulty] || 999)
    );

  // Hard-path items
  const hardItems = usedPlatforms.filter(e =>
    (e.classification === 'exposed' || e.classification === 'licensed') &&
    (e.optOutDifficulty === 'hard' || e.optOutDifficulty === 'impossible')
  );

  // Licensed = data already sold, can't fully undo
  const licensedItems = usedPlatforms.filter(e => e.classification === 'licensed');

  // Good news
  const safePlatforms = usedPlatforms.filter(e => e.classification === 'safe');

  return {
    scanId: `aiscan_${Date.now()}_${randomHex(4)}`,
    scannedAt: new Date().toISOString(),
    exposureScore: score,
    riskLevel: riskLevelFromScore(score),
    summary: {
      totalPlatformsChecked: usedPlatforms.length,
      totalPlatformsInCatalog: exposures.length,
      exposed: exposedCount,
      actionNeeded: actionNeededCount,
      safe: safeCount,
      licensed: licensedItems.length
    },
    exposures,
    quickWins,
    hardItems,
    licensedItems,
    safePlatforms
  };
}

function riskLevelFromScore(score) {
  if (score >= 75) return 'critical';
  if (score >= 50) return 'high';
  if (score >= 25) return 'moderate';
  return 'low';
}

/**
 * Build usage map from CLI flags / input object.
 * Accepts either explicit platformKey or the shorter signalAsked from catalog.
 */
export function buildUsageFromFlags(flags, catalog) {
  const usage = {};
  const entries = Object.entries(catalog.platforms);

  for (const [key, platform] of entries) {
    // Accept both full key and short signal
    if (flags[key] || flags[platform.signalAsked]) {
      usage[key] = true;
    }
  }

  // Also accept --use "linkedin,twitter,chatgpt" shorthand
  if (flags.use) {
    const tokens = String(flags.use).split(',').map(s => s.trim()).filter(Boolean);
    for (const token of tokens) {
      // Match by signalAsked or key
      for (const [key, platform] of entries) {
        if (platform.signalAsked === token || key === token) {
          usage[key] = true;
        }
      }
    }
  }

  return usage;
}
