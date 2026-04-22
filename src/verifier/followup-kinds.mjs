// Follow-up kind dispatcher for `vanish verify`.
//
// Different follow-up kinds need different verification strategies:
//
//   broker         → URL liveness check via HTTP (existing behavior)
//   ai-platform    → user must log in and check the toggle manually; we print
//                     a reminder walkthrough and optionally mark as "confirmed by user"
//   face-service   → user must re-upload to the service and confirm photo
//                     no longer appears; same interactive-confirm model as AI
//   ai-history-*   → one-shot deletion; no re-verify needed (skip entirely)
//   takedown-*     → user must manually check the target URL (interactive-confirm)
//
// This module centralizes the dispatch so verify.mjs stays thin and tests
// can drive each handler independently.

/**
 * Infer the kind of a followUp entry.
 * Backward-compatible: legacy entries without `kind` are treated as 'broker'.
 */
export function kindOf(entry) {
  if (!entry) return 'unknown';
  if (entry.kind) return entry.kind;
  // Legacy entries from v0.2 had no `kind` field — they are always brokers
  if (entry.broker) return 'broker';
  return 'unknown';
}

/**
 * Should verify engage with this entry at all? Some kinds are one-shot
 * (deletion events, drafted letters) and don't need a re-check.
 */
export function isVerifiable(entry) {
  const kind = kindOf(entry);
  switch (kind) {
    case 'broker':
    case 'ai-platform':
    case 'face-service':
      return true;
    case 'ai-history-local':
    case 'ai-history-web':
    case 'takedown-hash-registry':
    case 'takedown-search-engine':
    case 'takedown-dmca-drafted':
    case 'takedown-legal-letter':
      return false; // one-shot — not subject to re-verify
    default:
      return true;  // unknown kinds default to verifiable to avoid silently skipping
  }
}

/**
 * Short label for a follow-up entry, used in progress output.
 */
export function labelFor(entry) {
  return entry.displayName
    || entry.broker
    || entry.platform
    || entry.service
    || entry.tool
    || entry.id
    || 'unknown';
}

/**
 * Build a human-readable reminder to help the user verify an AI-platform
 * opt-out manually. AI platforms don't expose a public "is this still off"
 * endpoint — the user has to log in and look.
 *
 * @param {Object} entry - followUp entry with kind: 'ai-platform'
 * @param {Object} catalog - ai-platforms-catalog.json (for walkthrough lookup)
 * @returns {{ url, targetSetting, steps }}
 */
export function buildAiPlatformReminder(entry, catalog) {
  const platform = catalog?.platforms?.[entry.platform] || null;
  const walkthrough = platform?.walkthrough || null;
  return {
    displayName: entry.displayName || platform?.displayName || entry.platform,
    url: platform?.optOutUrl || null,
    targetSetting: walkthrough?.targetSetting || null,
    verification: walkthrough?.verification || null,
    steps: walkthrough?.steps || [
      'Log in to the platform',
      'Navigate to privacy / data controls',
      'Confirm the training opt-out toggle is still OFF',
      'Platforms sometimes reset toggles after policy updates — recheck is important'
    ]
  };
}

/**
 * Build a human-readable reminder for face-search reverification. The only
 * reliable way to check is to re-upload your photo and see the results.
 */
export function buildFaceServiceReminder(entry, catalog) {
  const service = catalog?.services?.[entry.service] || null;
  return {
    displayName: entry.displayName || service?.displayName || entry.service,
    url: service?.searchUrl || null,
    optOutUrl: service?.optOutUrl || null,
    jurisdiction: entry.jurisdiction || service?.jurisdiction || null,
    steps: [
      service?.searchUrl
        ? `Re-search your face on ${service.displayName} using the same photo you originally opted out with`
        : 'This service is not user-searchable (e.g. Clearview) — verification requires a separate data-access request',
      'Compare the results count with your original scan',
      'If results still include you, re-submit opt-out OR escalate to a jurisdiction-specific regulator',
      service?.privacyNote || 'Delete any photo you upload from the service afterwards if they retain uploads'
    ]
  };
}

/**
 * Decide the next status after a manual-confirmation verify.
 */
export function statusFromManualConfirm(confirmation) {
  // 'confirmed-clean' — user checked and is satisfied the opt-out held
  // 'still-present'   — user checked and the data is still there
  // 'pending'         — user skipped; try again on next run
  if (confirmation === 'clean') return 'verified-removed';
  if (confirmation === 'still') return 'still-present';
  return 'pending-reverification';
}
