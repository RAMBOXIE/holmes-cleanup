// DOM renderer for the parsed audit-artifact view from audit-parser.js.
// Pure innerHTML + escape() pattern matching the rest of web/src/main.js.
// HMAC verification is structural-only — see the prominent disclaimer in
// renderHmacBanner().

const escape = (s) => String(s ?? '').replace(/[&<>"']/g, (c) =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])
);

const BUCKET_LABELS = {
  retry: 'Retry queue',
  manualReview: 'Manual review queue',
  deadLetter: 'Dead-letter queue',
  completed: 'Completed',
  failed: 'Failed',
  audit: 'Audit chain',
  followUp: 'Follow-up (verify schedule)'
};

const STATUS_BADGES = {
  ok: { label: 'OK', cls: 'status-ok' },
  needs_review: { label: 'Needs review', cls: 'status-warn' },
  blocked: { label: 'Blocked', cls: 'status-blocked' },
  null: { label: '—', cls: 'status-unknown' }
};

/**
 * Render a parsed artifact into the given container.
 *
 * @param {HTMLElement} container
 * @param {Object} parsed - output of parseAuditArtifact()
 * @param {Object} [validation] - output of validateStructure()
 */
export function renderArtifactView(container, parsed, validation) {
  if (!container) return;
  if (!parsed) {
    container.innerHTML = '';
    return;
  }
  container.innerHTML = `
    ${renderHeader(parsed, validation)}
    ${renderHmacBanner(parsed.auditSummary)}
    ${renderSummary(parsed)}
    ${renderResultsTable(parsed.results)}
    ${renderBuckets(parsed.buckets)}
    ${renderExtraBuckets(parsed.extraBuckets)}
    ${renderAuditTimeline(parsed.audit, parsed.auditSummary)}
  `;
}

function renderHeader(parsed, validation) {
  const kindLabel = parsed.kind === 'report' ? 'Report (vanish report)'
    : parsed.kind === 'queue-state' ? 'Queue state (data/queue-state.json)'
    : 'Unknown shape';
  const statusKey = parsed.status ?? 'null';
  const statusBadge = STATUS_BADGES[statusKey] ?? STATUS_BADGES.null;
  const issuesHtml = (validation && !validation.valid)
    ? `<div class="artifact-issues">⚠ ${validation.issues.map((i) => escape(i)).join('<br>')}</div>`
    : '';
  return `
    <header class="artifact-head">
      <div class="artifact-head-row">
        <h3>${escape(kindLabel)}</h3>
        <span class="status-badge ${statusBadge.cls}">${escape(statusBadge.label)}</span>
        ${parsed.mode ? `<span class="status-badge status-mode">${escape(parsed.mode)}</span>` : ''}
      </div>
      ${parsed.inputRequestId ? `<div class="artifact-meta">requestId: <code>${escape(parsed.inputRequestId)}</code></div>` : ''}
      ${issuesHtml}
    </header>
  `;
}

function renderHmacBanner(auditSummary) {
  if (!auditSummary || auditSummary.total === 0) return '';
  return `
    <div class="hmac-disclaimer">
      <strong>⚠ Structural integrity check only.</strong>
      Vanish CANNOT verify the HMAC signature in your browser without leaking
      the secret key to every visitor. The audit chain below is checked for
      <em>shape</em> (signature field present, algorithm declared, hex
      length 64) — not cryptographically.
      <br>
      To verify cryptographically, re-run the audit on the machine that holds
      <code>VANISH_AUDIT_HMAC_KEY</code> via the CLI.
      <br>
      <span class="hmac-summary">
        ${auditSummary.signed} signed · ${auditSummary.unsigned} unsigned
        · ${auditSummary.structurallyValid} structurally valid
        · ${auditSummary.structurallyInvalid} structurally invalid
      </span>
    </div>
  `;
}

function renderSummary(parsed) {
  const s = parsed.summary || {};
  const cells = [
    ['Attempted', s.attempted],
    ['Successful', s.successful],
    ['Retry queued', s.retryQueued],
    ['Manual review', s.manualReviewQueued],
    ['Dead-letter', s.deadLetterQueued],
    ['Blocked', s.blocked]
  ].filter(([, v]) => v !== null && v !== undefined);
  if (cells.length === 0) return '';
  return `
    <section class="artifact-summary">
      ${cells.map(([label, value]) => `
        <div class="summary-cell">
          <div class="summary-cell-label">${escape(label)}</div>
          <div class="summary-cell-value">${escape(String(value))}</div>
        </div>
      `).join('')}
    </section>
  `;
}

function renderResultsTable(results) {
  if (!Array.isArray(results) || results.length === 0) return '';
  return `
    <section class="artifact-section">
      <h4>Results (${results.length})</h4>
      <table class="artifact-table">
        <thead>
          <tr><th>Broker</th><th>Status</th><th>Request ID</th><th>HTTP / evidence</th></tr>
        </thead>
        <tbody>
          ${results.map((r) => `
            <tr>
              <td><strong>${escape(r.broker || '—')}</strong></td>
              <td>${renderResultStatus(r.status)}</td>
              <td><code>${escape(r.requestId || '—')}</code></td>
              <td>${escape(formatEvidence(r))}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </section>
  `;
}

function renderResultStatus(status) {
  if (!status) return '<span class="status-pill status-unknown">—</span>';
  if (status === 'success') return '<span class="status-pill status-ok">✓ success</span>';
  if (status === 'blocked') return '<span class="status-pill status-blocked">⛔ blocked</span>';
  if (status === 'transient_error') return '<span class="status-pill status-warn">↻ transient</span>';
  if (status === 'permanent_error') return '<span class="status-pill status-err">✗ permanent</span>';
  return `<span class="status-pill">${escape(status)}</span>`;
}

function formatEvidence(result) {
  if (!result) return '—';
  if (result.evidence?.httpStatus) {
    return `HTTP ${result.evidence.httpStatus}${result.evidence.endpoint ? ' · ' + result.evidence.endpoint : ''}`;
  }
  if (result.reason) return result.reason;
  return result.notes?.[0] || '—';
}

function renderBuckets(buckets) {
  if (!buckets || Object.keys(buckets).length === 0) return '';
  const sections = [];
  for (const [key, items] of Object.entries(buckets)) {
    if (key === 'audit') continue; // audit gets its own timeline section
    if (!Array.isArray(items)) continue;
    if (items.length === 0) continue;
    const label = BUCKET_LABELS[key] || key;
    sections.push(`
      <section class="artifact-section">
        <h4>${escape(label)} <span class="artifact-count">${items.length}</span></h4>
        <ul class="bucket-list">
          ${items.slice(0, 50).map((it) => `<li class="bucket-item">${renderBucketItem(it)}</li>`).join('')}
          ${items.length > 50 ? `<li class="bucket-item bucket-more">+ ${items.length - 50} more (truncated)</li>` : ''}
        </ul>
      </section>
    `);
  }
  return sections.join('');
}

function renderBucketItem(it) {
  if (!it || typeof it !== 'object') return escape(String(it));
  const broker = it.broker ? `<strong>${escape(it.broker)}</strong>` : '';
  const reason = it.reason ? ` · ${escape(it.reason)}` : '';
  const at = it.at ? ` · <span class="bucket-time">${escape(it.at)}</span>` : '';
  const requestId = it.requestId ? ` · <code>${escape(it.requestId)}</code>` : '';
  return `${broker}${reason}${at}${requestId}`;
}

function renderExtraBuckets(extraBuckets) {
  if (!extraBuckets || Object.keys(extraBuckets).length === 0) return '';
  return `
    <section class="artifact-section artifact-extra">
      <h4>Other buckets (forward-compatible)</h4>
      <p class="artifact-extra-hint">
        These keys aren't part of vanish's known schema today but the parser
        kept them so this view doesn't crash on a newer file format.
      </p>
      <ul class="bucket-list">
        ${Object.entries(extraBuckets).map(([key, items]) =>
          `<li class="bucket-item"><code>${escape(key)}</code> — ${items.length} items</li>`
        ).join('')}
      </ul>
    </section>
  `;
}

function renderAuditTimeline(audit, summary) {
  if (!Array.isArray(audit) || audit.length === 0) return '';
  return `
    <section class="artifact-section">
      <h4>Audit chain timeline <span class="artifact-count">${audit.length}</span></h4>
      <ol class="audit-timeline">
        ${audit.slice(0, 100).map((entry) => renderAuditEntry(entry)).join('')}
        ${audit.length > 100 ? `<li class="bucket-more">+ ${audit.length - 100} more (truncated)</li>` : ''}
      </ol>
      ${renderEventCounts(summary?.eventCounts)}
    </section>
  `;
}

function renderAuditEntry(entry) {
  if (!entry || typeof entry !== 'object') return '';
  const sigPill = entry.signature
    ? (/^sha256=[a-f0-9]{64}$/i.test(entry.signature)
      ? `<span class="status-pill status-ok" title="Structural shape valid; cryptographic verification requires CLI">🔒 signed</span>`
      : `<span class="status-pill status-err" title="Signature field is malformed">⚠ malformed</span>`)
    : `<span class="status-pill status-warn">unsigned</span>`;
  return `
    <li class="audit-entry">
      <div class="audit-entry-head">
        <span class="audit-event">${escape(entry.event || 'unknown')}</span>
        ${entry.broker ? `<strong>${escape(entry.broker)}</strong>` : ''}
        ${sigPill}
        ${entry.at ? `<span class="audit-at">${escape(entry.at)}</span>` : ''}
      </div>
      ${entry.reason ? `<div class="audit-reason">${escape(entry.reason)}</div>` : ''}
      ${entry.signature ? `<div class="audit-sig"><code>${escape(entry.signature)}</code></div>` : ''}
    </li>
  `;
}

function renderEventCounts(eventCounts) {
  if (!eventCounts || Object.keys(eventCounts).length === 0) return '';
  return `
    <div class="audit-event-summary">
      ${Object.entries(eventCounts).map(([event, count]) =>
        `<span class="audit-event-pill">${escape(event)}: <strong>${count}</strong></span>`
      ).join('')}
    </div>
  `;
}
