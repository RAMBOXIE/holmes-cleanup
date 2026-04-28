// Vanish Web — main entry point.
// Pure vanilla JS; no framework. Keep this file auditable.

import './styles.css';
import {
  runScan,
  buildShareCardSvg,
  buildTripleThreatCardSvg,
  getCatalog,
  runAiExposureScan,
  runAiAllPlatformsScan,
  getAiCatalog,
  getFaceCatalog,
  getAiWalkthrough,
  getFaceWalkthrough
} from './lib/scan-runner.js';
import { svgToPngBlob, downloadBlob, svgStringToDataUrl } from './lib/svg-to-png.js';
import { renderWalkthrough } from './lib/walkthrough-renderer.js';
import {
  JURISDICTION_OPTIONS,
  getLeakSites,
  getCrisisSupport,
  getStopNciiWalkthrough,
  getGoogleIntimateWalkthrough,
  getLegalTemplates,
  generateDmcaBatch,
  generateLetter
} from './lib/takedown-letter.js';
import {
  safeParseJson,
  parseAuditArtifact,
  validateStructure,
  MAX_INPUT_BYTES
} from './lib/audit-parser.js';
import { renderArtifactView } from './lib/queue-renderer.js';

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => [...document.querySelectorAll(sel)];
const escape = (s) => String(s ?? '').replace(/[&<>"']/g, (c) =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])
);

const RISK_COLORS = {
  critical: '#ff3b30',
  high: '#ff9500',
  moderate: '#ffcc00',
  low: '#34c759'
};

// Sessional state — retained so share cards can combine scans
let state = {
  brokerResult: null,
  brokerShareSvg: null,
  aiResult: null,
  aiShareSvg: null,
  identity: null  // PR 2.5: { fullName, email } — fed into walkthrough prefill
};

// ─── Tabs ───────────────────────────────────────────────────────

$$('.tab').forEach((btn) => {
  btn.addEventListener('click', () => switchTab(btn.dataset.tab));
});

function switchTab(tabName) {
  $$('.tab').forEach((b) => {
    const active = b.dataset.tab === tabName;
    b.classList.toggle('active', active);
    b.setAttribute('aria-selected', active ? 'true' : 'false');
  });
  $$('.tab-panel').forEach((p) => {
    const match = p.dataset.panel === tabName;
    p.hidden = !match;
    p.classList.toggle('active', match);
  });
}

// ─── Broker scan ────────────────────────────────────────────────

$('#scan-form').addEventListener('submit', (e) => {
  e.preventDefault();
  const formData = new FormData(e.currentTarget);
  const identity = {
    fullName: (formData.get('fullName') || '').trim(),
    emails: formData.get('email') ? [formData.get('email').trim()] : [],
    phones: formData.get('phone') ? [formData.get('phone').trim()] : [],
    city: (formData.get('city') || '').trim() || null,
    state: (formData.get('state') || '').trim() || null,
    jurisdiction: formData.get('jurisdiction') || 'US'
  };
  if (!identity.fullName) return;
  setTimeout(() => runBrokerScanAndRender(identity), 200);
});

$('#reset-btn').addEventListener('click', () => {
  state.brokerResult = null;
  state.brokerShareSvg = null;
  $('#hero').hidden = false;
  $('#results').hidden = true;
  window.scrollTo({ top: 0, behavior: 'smooth' });
});

function runBrokerScanAndRender(identity) {
  const result = runScan(identity);
  state.brokerResult = result;
  state.brokerShareSvg = buildShareCardSvg(result);
  state.identity = {
    fullName: identity.fullName || '',
    email: (identity.emails && identity.emails[0]) || ''
  };

  $('#hero').hidden = true;
  $('#results').hidden = false;
  $('#ai-results').hidden = true;

  renderBrokerScoreCard(result);
  renderShareActions('broker');
  renderExposureSummary(result);
  renderBrokerList(result);
  renderCliUpsell(result);
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function renderBrokerScoreCard(result) {
  const color = RISK_COLORS[result.riskLevel] || RISK_COLORS.moderate;
  const fillPct = Math.round((result.privacyScore / 100) * 100);
  $('#score-card').innerHTML = `
    <div class="score-label">Your Data-Broker Exposure Score</div>
    <div class="score-number" style="color: ${color}">${result.privacyScore}<span class="score-denom">/ 100</span></div>
    <div class="score-bar-bg">
      <div class="score-bar-fill" style="width: ${fillPct}%; background: ${color}"></div>
    </div>
    <div class="score-risk" style="color: ${color}">${escape(result.riskLevel.toUpperCase())} RISK</div>
    <div class="score-stats">
      <strong>${result.summary.likelyExposed}</strong> of ${result.summary.totalBrokers} brokers likely have your data
    </div>
  `;
}

function renderExposureSummary(result) {
  const rows = Object.entries(result.summary.byCategory)
    .sort((a, b) => (b[1].likely || 0) - (a[1].likely || 0))
    .filter(([, c]) => c.likely + c.possible > 0)
    .map(([cat, c]) => `
      <tr>
        <td class="cat-name">${escape(humanizeCategory(cat))}</td>
        <td class="cat-num likely">${c.likely || 0}</td>
        <td class="cat-num possible">${c.possible || 0}</td>
        <td class="cat-num unlikely">${c.unlikely || 0}</td>
      </tr>
    `).join('');
  $('#exposure-summary').innerHTML = `
    <h2>Exposure breakdown</h2>
    <table class="cat-table">
      <thead>
        <tr><th>Category</th><th>Likely</th><th>Possible</th><th>Unlikely</th></tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  `;
}

function renderBrokerList(result) {
  const catalog = getCatalog();
  const optOutCapable = result.exposures
    .filter((exp) => catalog.brokers[exp.broker]?.optOutFlow)
    .slice(0, 80);
  const html = optOutCapable.map((exp) => {
    const entry = catalog.brokers[exp.broker];
    const flow = entry.optOutFlow;
    const likelihoodBadge = `<span class="lh lh-${exp.likelihood}">${exp.likelihood}</span>`;
    const captchaInfo = flow.captcha ? `⚠️ Has ${flow.captcha}` : '✓ No captcha';
    const emailInfo = flow.emailVerification ? '✉️ Email verification' : '';
    const minutesInfo = flow.estimatedMinutes ? `~${flow.estimatedMinutes} min` : '';
    return `
      <article class="broker-card">
        <div class="broker-head">
          <h3>${escape(entry.displayName)}</h3>
          ${likelihoodBadge}
        </div>
        <div class="broker-meta">
          <span>${escape(humanizeCategory(entry.category))}</span>
          <span>${captchaInfo}</span>
          ${emailInfo ? `<span>${emailInfo}</span>` : ''}
          ${minutesInfo ? `<span>${minutesInfo}</span>` : ''}
        </div>
        <div class="broker-actions">
          <a class="broker-link" href="${escape(flow.optOutUrl)}" target="_blank" rel="noopener">
            Opt out on ${escape(new URL(flow.optOutUrl).hostname)} ↗
          </a>
        </div>
      </article>
    `;
  }).join('');
  $('#broker-list').innerHTML = `
    <h2>Start removing yourself</h2>
    <p class="broker-list-intro">
      ${optOutCapable.length} of ${result.exposures.length} brokers have a public opt-out page.
      Click to start. You'll need to solve captchas and click email verification links yourself.
    </p>
    <div class="broker-grid">${html}</div>
  `;
}

function renderCliUpsell(result) {
  const topBroker = result.exposures.find((e) => e.likelihood === 'likely')?.broker || 'spokeo';
  $('#cli-upsell').innerHTML = `
    <h2>Want automation?</h2>
    <p>The CLI bundles scan + guided opt-out + 30-day verify in one command.</p>
    <pre class="cli-code">npx github:RAMBOXIE/vanish opt-out --broker ${escape(topBroker)} --email you@example.com</pre>
    <p class="cli-footnote">
      The CLI opens your browser to each opt-out URL, pre-fills the form data, then checks back in 30 days to prove removal.
      <a href="https://github.com/RAMBOXIE/vanish" target="_blank" rel="noopener">Learn more on GitHub →</a>
    </p>
  `;
}

// ─── AI scan ────────────────────────────────────────────────────

// Priority platforms for the checkbox grid — most common / highest-impact
const AI_GRID_ORDER = [
  'openai-chatgpt', 'anthropic-claude', 'google-gemini', 'microsoft-copilot',
  'linkedin', 'reddit', 'twitter-x', 'meta-ai',
  'cursor-ai', 'github-copilot', 'grammarly', 'perplexity-ai'
];

function populateAiGrid() {
  const catalog = getAiCatalog();
  const html = AI_GRID_ORDER.map((key) => {
    const p = catalog.platforms[key];
    if (!p) return '';
    const badge = p.defaultConsent === 'opted-out' ? '<span class="ai-pill safe">✓ safe default</span>'
                : p.defaultConsent === 'licensed' ? '<span class="ai-pill licensed">💸 data sold</span>'
                : '<span class="ai-pill exposed">⚠️ opted-in default</span>';
    return `
      <label class="ai-platform-card">
        <input type="checkbox" name="platform" value="${escape(p.signalAsked)}" />
        <span class="ai-platform-name">${escape(p.displayName)}</span>
        ${badge}
      </label>
    `;
  }).join('');
  $('#ai-platform-grid').innerHTML = html;
}

populateAiGrid();

$('#ai-scan-form').addEventListener('submit', (e) => {
  e.preventDefault();
  const form = e.currentTarget;
  const all = form.elements['ai-all']?.checked;
  let result;
  if (all) {
    result = runAiAllPlatformsScan();
  } else {
    const checked = [...form.querySelectorAll('input[name="platform"]:checked')].map((c) => c.value);
    if (checked.length === 0) {
      alert('Pick at least one platform, or check "assume all 30".');
      return;
    }
    const flags = Object.fromEntries(checked.map((k) => [k, true]));
    result = runAiExposureScan(flags);
  }
  setTimeout(() => runAiScanAndRender(result), 150);
});

$('#ai-reset-btn').addEventListener('click', () => {
  state.aiResult = null;
  state.aiShareSvg = null;
  $('#hero').hidden = false;
  $('#ai-results').hidden = true;
  window.scrollTo({ top: 0, behavior: 'smooth' });
});

function runAiScanAndRender(result) {
  state.aiResult = result;
  state.aiShareSvg = buildTripleThreatCardSvg({
    broker: state.brokerResult,  // may be null
    ai: result
  });

  $('#hero').hidden = true;
  $('#results').hidden = true;
  $('#ai-results').hidden = false;

  renderAiScoreCard(result);
  renderAiQuickWins(result);
  renderAiLicensed(result);
  renderAiSafe(result);
  renderShareActions('ai');
  renderAiCliUpsell(result);
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function renderAiScoreCard(result) {
  const color = RISK_COLORS[result.riskLevel] || RISK_COLORS.moderate;
  const fillPct = Math.max(0, Math.min(100, result.exposureScore));
  $('#ai-score-card').innerHTML = `
    <div class="score-label">🤖 AI Training Exposure Score</div>
    <div class="score-number" style="color: ${color}">${result.exposureScore}<span class="score-denom">/ 100</span></div>
    <div class="score-bar-bg">
      <div class="score-bar-fill" style="width: ${fillPct}%; background: ${color}"></div>
    </div>
    <div class="score-risk" style="color: ${color}">${escape(result.riskLevel.toUpperCase())} RISK</div>
    <div class="score-stats">
      <strong>${result.summary.exposed}</strong> of ${result.summary.totalPlatformsChecked} platforms feed your data to AI models
      ${result.summary.licensed > 0 ? `· <strong>${result.summary.licensed}</strong> already licensed to AI companies` : ''}
    </div>
  `;
}

function renderAiQuickWins(result) {
  const wins = result.quickWins || [];
  if (wins.length === 0) { $('#ai-quick-wins').innerHTML = ''; return; }
  $('#ai-quick-wins').innerHTML = `
    <h2>⚡ Quick wins — ${wins.length} easy opt-outs</h2>
    <div class="ai-card-grid">
      ${wins.map((w) => `
        <article class="ai-card ai-card-exposed">
          <div class="ai-card-head">
            <h3>${escape(w.displayName)}</h3>
            <span class="ai-card-time">~${w.estimatedSeconds || 60}s</span>
          </div>
          <p class="ai-card-setting">Look for: <strong>"${escape(w.notes?.match(/"([^"]+)"/)?.[1] || w.optOutDifficulty)}"</strong></p>
          <div class="ai-card-actions">
            ${getAiWalkthrough(w.platform) ? `<button type="button" class="ai-card-walkthrough" data-platform-key="${escape(w.platform)}">Walk me through this →</button>` : ''}
            ${w.optOutUrl ? `<a class="ai-card-link" href="${escape(w.optOutUrl)}" target="_blank" rel="noopener">Open page ↗</a>` : ''}
          </div>
        </article>
      `).join('')}
    </div>
  `;
  wireAiWalkthroughButtons('#ai-quick-wins');
}

function renderAiLicensed(result) {
  const items = result.licensedItems || [];
  if (items.length === 0) { $('#ai-licensed').innerHTML = ''; return; }
  $('#ai-licensed').innerHTML = `
    <h2>💸 Already licensed to AI companies</h2>
    <p class="section-caveat">Your data is already sold to external AI companies from these platforms. Opt-out affects future training only — past training data stays in the models.</p>
    <div class="ai-card-grid">
      ${items.map((w) => `
        <article class="ai-card ai-card-licensed">
          <div class="ai-card-head">
            <h3>${escape(w.displayName)}</h3>
          </div>
          <p class="ai-card-meta">Sold to: ${escape((w.aiModels || []).join(', '))}</p>
          <div class="ai-card-actions">
            ${getAiWalkthrough(w.platform) ? `<button type="button" class="ai-card-walkthrough" data-platform-key="${escape(w.platform)}">Walk me through this →</button>` : ''}
            ${w.optOutUrl ? `<a class="ai-card-link" href="${escape(w.optOutUrl)}" target="_blank" rel="noopener">Opt-out page ↗</a>` : ''}
          </div>
        </article>
      `).join('')}
    </div>
  `;
  wireAiWalkthroughButtons('#ai-licensed');
}

function wireAiWalkthroughButtons(scopeSelector) {
  const scope = $(scopeSelector);
  if (!scope) return;
  scope.querySelectorAll('.ai-card-walkthrough').forEach((btn) => {
    btn.addEventListener('click', () => openAiWalkthrough(btn.dataset.platformKey));
  });
}

function openAiWalkthrough(platformKey) {
  const data = getAiWalkthrough(platformKey);
  const host = $('#ai-walkthrough-host');
  if (!data || !host) return;
  host.hidden = false;
  renderWalkthrough(host, {
    flowKey: `ai:${platformKey}`,
    serviceName: data.serviceName,
    optOutUrl: data.optOutUrl,
    walkthrough: data.walkthrough,
    identity: state.identity,
    onClose: () => { host.hidden = true; }
  });
  host.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function renderAiSafe(result) {
  const items = result.safePlatforms || [];
  if (items.length === 0) { $('#ai-safe').innerHTML = ''; return; }
  $('#ai-safe').innerHTML = `
    <h2>✅ Default-safe platforms</h2>
    <p class="section-caveat">These platforms DON'T train on your data by default — no action needed.</p>
    <ul class="ai-safe-list">
      ${items.map((w) => `<li><strong>${escape(w.displayName)}</strong> — ${escape(w.notes || 'Opted-out by default')}</li>`).join('')}
    </ul>
  `;
}

function renderAiCliUpsell(_result) {
  $('#ai-cli-upsell').innerHTML = `
    <h2>Want guided opt-out with 60-day re-verify?</h2>
    <p>The CLI walks you through each platform's exact toggle + schedules a re-check (platforms silently reset your settings after policy updates).</p>
    <pre class="cli-code">npx github:RAMBOXIE/vanish ai-opt-out --all</pre>
    <p class="cli-footnote">
      26 of the 30 platforms have browser-assisted walkthroughs with tier overrides (e.g., "ChatGPT Team is already opted-out, skip").
      <a href="https://github.com/RAMBOXIE/vanish#ai-training-exposure-protection" target="_blank" rel="noopener">See README →</a>
    </p>
  `;
}

// ─── Face directory ─────────────────────────────────────────────

function populateFaceGrid() {
  const catalog = getFaceCatalog();
  const PRIORITY = ['pimeyes', 'facecheck-id', 'findclone', 'lenso', 'tineye', 'yandex-images', 'google-lens', 'clearview-ai'];
  const html = PRIORITY.map((key) => {
    const s = catalog.services[key];
    if (!s) return '';
    const accessBadge = ({
      free: '<span class="face-pill free">free</span>',
      freemium: '<span class="face-pill freemium">free tier</span>',
      paid: '<span class="face-pill paid">paid</span>',
      restricted: '<span class="face-pill restricted">not user-accessible</span>'
    })[s.accessModel] || '';

    const searchBtn = s.searchUrl
      ? `<a class="face-btn-primary" href="${escape(s.searchUrl)}" target="_blank" rel="noopener">Check yourself ↗</a>`
      : `<span class="face-btn-primary disabled">No public search</span>`;

    const hasWalkthrough = Boolean(getFaceWalkthrough(key));
    const optOutBtn = hasWalkthrough
      ? `<button type="button" class="face-btn-secondary face-btn-walkthrough" data-service-key="${escape(key)}">Walk me through opt-out →</button>`
      : s.optOutUrl
      ? `<a class="face-btn-secondary" href="${escape(s.optOutUrl)}" target="_blank" rel="noopener">Opt out ↗</a>`
      : '';

    return `
      <article class="face-service-card">
        <div class="face-card-head">
          <h3>${escape(s.displayName)}</h3>
          ${accessBadge}
        </div>
        <p class="face-card-known">${escape(s.knownFor)}</p>
        <div class="face-card-meta">
          <span>📍 ${escape(s.jurisdiction)}</span>
          ${s.pricing ? `<span>💵 ${escape(s.pricing.slice(0, 60))}${s.pricing.length > 60 ? '…' : ''}</span>` : ''}
        </div>
        <div class="face-card-actions">
          ${searchBtn}
          ${optOutBtn}
        </div>
      </article>
    `;
  }).join('');
  $('#face-services-grid').innerHTML = html;

  $('#face-services-grid').querySelectorAll('.face-btn-walkthrough').forEach((btn) => {
    btn.addEventListener('click', () => openFaceWalkthrough(btn.dataset.serviceKey));
  });
}

function openFaceWalkthrough(serviceKey) {
  const data = getFaceWalkthrough(serviceKey);
  const host = $('#face-walkthrough-host');
  if (!data || !host) return;
  host.hidden = false;
  renderWalkthrough(host, {
    flowKey: `face:${serviceKey}:opt-out`,
    serviceName: data.serviceName,
    optOutUrl: data.optOutUrl,
    walkthrough: data.walkthrough,
    identity: state.identity,
    onClose: () => { host.hidden = true; }
  });
  host.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

populateFaceGrid();

// ─── Takedown (PR 2: complete OF-creator content-removal flow) ──

// 4 legal templates exist; DMCA is driven by the batch form in step 3,
// so step 4 only surfaces the escalation templates.
const STEP_4_TEMPLATES = new Set(['cease-and-desist', 'police-report', 'civil-pre-suit']);

const LEGAL_TEMPLATE_FIELDS = {
  'cease-and-desist': [
    { id: 'recipientName', label: 'Recipient name (the person reposting)', placeholder: 'Their full name or handle' },
    { id: 'recipientEmail', label: 'Recipient email or address', placeholder: 'their@email.com — or postal address if known' }
  ],
  'police-report': [
    { id: 'incidentDate', label: 'Date you discovered the content', placeholder: '2026-04-26' },
    { id: 'channelsList', label: 'URLs / platforms where content appeared', type: 'textarea', placeholder: 'https://coomer.su/...\nhttps://thothub.tv/...' },
    { id: 'suspectInfo', label: 'Suspect info', placeholder: 'Name + contact info if known, otherwise "unknown — subpoena required"' },
    { id: 'stateStatute', label: 'Your state NCII statute', placeholder: 'Cal. Penal Code §647(j)(4) — see cybercivilrights.org/map' }
  ],
  'civil-pre-suit': [
    { id: 'recipientName', label: 'Recipient (individual or platform)', placeholder: 'Defendant name' },
    { id: 'recipientEmail', label: 'Service address (email or postal)', placeholder: 'For formal notice' }
  ]
};

function populateTakedownTab() {
  populateCrisisGrid();
  populateLeakSiteGrid();
  populateJurisdictionDropdown();
  populateLegalTemplateGrid();
  wireStopNciiButton();
  wireGoogleIntimateButton();
  wireDmcaForm();
}

function populateCrisisGrid() {
  const grid = $('#crisis-grid');
  if (!grid) return;
  const items = getCrisisSupport();
  grid.innerHTML = items.map((c) => {
    const contactHtml = c.contact ? `<div class="crisis-contact"><strong>${escape(c.contact)}</strong></div>` : '';
    const countriesHtml = c.countries?.length ? `<div class="crisis-countries">${escape(c.countries.join(' · '))}</div>` : '';
    return `
      <article class="crisis-card">
        <h4>${escape(c.displayName)}</h4>
        <p class="crisis-desc">${escape(c.description || '')}</p>
        ${contactHtml}
        ${countriesHtml}
        <a class="crisis-link" href="${escape(c.url)}" target="_blank" rel="noopener">More info ↗</a>
      </article>
    `;
  }).join('');
}

function populateLeakSiteGrid() {
  const grid = $('#leak-site-grid');
  if (!grid) return;
  const sites = getLeakSites();
  grid.innerHTML = sites.map((s) => `
    <label class="leak-site-checkbox">
      <input type="checkbox" name="leak-site" value="${escape(s.key)}" />
      <span class="leak-site-name">${escape(s.displayName)}</span>
      <span class="leak-site-difficulty leak-difficulty-${escape(s.takedownDifficulty?.split('-')[0] || 'medium')}">${escape(s.takedownDifficulty || 'medium')}</span>
    </label>
  `).join('');
}

function populateJurisdictionDropdown() {
  const sel = $('#dmca-jurisdiction');
  if (!sel) return;
  sel.innerHTML = JURISDICTION_OPTIONS.map((opt) =>
    `<option value="${escape(opt.value)}">${escape(opt.label)}</option>`
  ).join('');
}

function populateLegalTemplateGrid() {
  const grid = $('#legal-template-grid');
  if (!grid) return;
  const templates = getLegalTemplates().filter((t) => STEP_4_TEMPLATES.has(t.key));
  grid.innerHTML = templates.map((t) => `
    <button type="button" class="legal-template-card" data-template-key="${escape(t.key)}">
      <h4>${escape(t.displayName)}</h4>
      <p>${escape(t.purpose)}</p>
    </button>
  `).join('');
  grid.querySelectorAll('.legal-template-card').forEach((btn) => {
    btn.addEventListener('click', () => openLegalTemplateForm(btn.dataset.templateKey));
  });
}

function wireStopNciiButton() {
  const btn = $('#open-stopncii-walkthrough');
  if (!btn) return;
  btn.addEventListener('click', () => {
    const data = getStopNciiWalkthrough();
    const host = $('#stopncii-walkthrough-host');
    if (!data || !host) return;
    host.hidden = false;
    renderWalkthrough(host, {
      flowKey: 'takedown:stopncii',
      serviceName: data.serviceName,
      optOutUrl: data.optOutUrl,
      walkthrough: data.walkthrough,
      identity: state.identity,
      onClose: () => { host.hidden = true; }
    });
    host.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
}

function wireGoogleIntimateButton() {
  const btn = $('#open-google-intimate-walkthrough');
  if (!btn) return;
  btn.addEventListener('click', () => {
    const data = getGoogleIntimateWalkthrough();
    const host = $('#google-intimate-walkthrough-host');
    if (!data || !host) return;
    host.hidden = false;
    renderWalkthrough(host, {
      flowKey: 'takedown:google-intimate',
      serviceName: data.serviceName,
      optOutUrl: data.optOutUrl,
      walkthrough: data.walkthrough,
      identity: state.identity,
      onClose: () => { host.hidden = true; }
    });
    host.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
}

function wireDmcaForm() {
  const form = $('#dmca-form');
  if (!form) return;

  // Pre-fill from broker-scan identity if present
  if (state.identity) {
    const nameInput = $('#dmca-name');
    const emailInput = $('#dmca-email');
    if (nameInput && state.identity.fullName) nameInput.value = state.identity.fullName;
    if (emailInput && state.identity.email) emailInput.value = state.identity.email;
  }

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const siteKeys = [...form.querySelectorAll('input[name="leak-site"]:checked')].map((cb) => cb.value);
    if (siteKeys.length === 0) {
      alert('Pick at least one leak site to send to.');
      return;
    }
    const identity = {
      fullName: ($('#dmca-name')?.value || '').trim(),
      email: ($('#dmca-email')?.value || '').trim()
    };
    const infringingUrls = ($('#dmca-urls')?.value || '').trim();
    const jurisdiction = $('#dmca-jurisdiction')?.value || 'DMCA';
    const notices = generateDmcaBatch({ siteKeys, identity, infringingUrls, jurisdiction });
    renderDmcaOutput(notices);
  });
}

function renderDmcaOutput(notices) {
  const out = $('#dmca-output');
  if (!out) return;
  if (notices.length === 0) {
    out.innerHTML = '';
    return;
  }
  out.innerHTML = `
    <h3>Generated ${notices.length} DMCA letter${notices.length === 1 ? '' : 's'}</h3>
    <p class="dmca-output-hint">Review each one, then send via the abuse contact shown. Letters are not stored anywhere.</p>
    <div class="dmca-notice-list">
      ${notices.map((n, i) => renderNoticeCard(n, i)).join('')}
    </div>
  `;
  out.querySelectorAll('[data-action="copy-letter"]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const idx = Number(btn.dataset.index);
      const notice = notices[idx];
      await copyToClipboardWithFeedback(btn, notice.letter);
    });
  });
  out.querySelectorAll('[data-action="download-letter"]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const idx = Number(btn.dataset.index);
      const notice = notices[idx];
      const blob = new Blob([notice.letter], { type: 'text/plain' });
      downloadBlob(blob, `dmca-${notice.site}.txt`);
    });
  });
}

function renderNoticeCard(notice, index) {
  const contactBlock = notice.abuseContactIsEmail
    ? `<a class="notice-contact mailto" href="mailto:${escape(notice.abuseContact)}?subject=${encodeURIComponent('DMCA §512(c) takedown notice')}&body=${encodeURIComponent(notice.letter)}">📧 Open in email — ${escape(notice.abuseContact)}</a>`
    : `<a class="notice-contact" href="${escape(notice.abuseContact)}" target="_blank" rel="noopener">${escape(notice.abuseContact)} ↗</a>`;
  return `
    <article class="notice-card">
      <header class="notice-head">
        <h4>${escape(notice.displayName)}</h4>
        <span class="notice-difficulty notice-difficulty-${escape((notice.takedownDifficulty || 'medium').split('-')[0])}">${escape(notice.takedownDifficulty || 'medium')}</span>
      </header>
      <p class="notice-approach"><strong>Approach:</strong> ${escape(notice.approach || 'Send to the abuse contact below.')}</p>
      <div class="notice-contact-row">${contactBlock}</div>
      <pre class="letter-output">${escape(notice.letter)}</pre>
      <div class="notice-actions">
        <button type="button" class="walkthrough-copy-btn" data-action="copy-letter" data-index="${index}">📋 Copy letter</button>
        <button type="button" class="walkthrough-copy-btn" data-action="download-letter" data-index="${index}">💾 Download .txt</button>
      </div>
    </article>
  `;
}

function openLegalTemplateForm(templateKey) {
  const fields = LEGAL_TEMPLATE_FIELDS[templateKey] || [];
  const host = $('#legal-letter-form-host');
  if (!host) return;
  host.hidden = false;
  host.innerHTML = `
    <form id="legal-letter-form" class="takedown-form">
      <h4>${escape(getLegalTemplates().find((t) => t.key === templateKey)?.displayName || 'Letter')}</h4>
      <div class="takedown-form-row">
        <label class="field">
          <span>Your name</span>
          <input type="text" id="ll-yourName" value="${escape(state.identity?.fullName || '')}" />
        </label>
        <label class="field">
          <span>Your email</span>
          <input type="email" id="ll-yourEmail" value="${escape(state.identity?.email || '')}" />
        </label>
      </div>
      <label class="field">
        <span>Jurisdiction</span>
        <select id="ll-jurisdiction">
          ${JURISDICTION_OPTIONS.map((opt) => `<option value="${escape(opt.value)}">${escape(opt.label)}</option>`).join('')}
        </select>
      </label>
      ${fields.map((f) => `
        <label class="field">
          <span>${escape(f.label)}</span>
          ${f.type === 'textarea'
            ? `<textarea id="ll-${escape(f.id)}" rows="3" placeholder="${escape(f.placeholder || '')}"></textarea>`
            : `<input type="text" id="ll-${escape(f.id)}" placeholder="${escape(f.placeholder || '')}" />`}
        </label>
      `).join('')}
      <button type="submit" class="takedown-cta-primary">Generate letter →</button>
    </form>
  `;
  host.scrollIntoView({ behavior: 'smooth', block: 'start' });
  $('#legal-letter-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const vars = {
      yourName: $('#ll-yourName')?.value?.trim() || '',
      yourEmail: $('#ll-yourEmail')?.value?.trim() || ''
    };
    for (const f of fields) {
      vars[f.id] = $(`#ll-${f.id}`)?.value?.trim() || '';
    }
    const jurisdiction = $('#ll-jurisdiction')?.value || '';
    const result = generateLetter({ templateKey, jurisdiction, vars });
    renderLegalLetterOutput(result);
  });
}

function renderLegalLetterOutput(result) {
  const out = $('#legal-letter-output');
  if (!out) return;
  out.innerHTML = `
    <article class="notice-card">
      <header class="notice-head">
        <h4>${escape(result.displayName)}</h4>
      </header>
      <p class="notice-approach"><strong>Purpose:</strong> ${escape(result.purpose || '')}</p>
      <pre class="letter-output">${escape(result.letter)}</pre>
      <div class="notice-actions">
        <button type="button" class="walkthrough-copy-btn" id="ll-copy-btn">📋 Copy letter</button>
        <button type="button" class="walkthrough-copy-btn" id="ll-download-btn">💾 Download .txt</button>
      </div>
    </article>
  `;
  $('#ll-copy-btn')?.addEventListener('click', async (e) => {
    await copyToClipboardWithFeedback(e.currentTarget, result.letter);
  });
  $('#ll-download-btn')?.addEventListener('click', () => {
    const blob = new Blob([result.letter], { type: 'text/plain' });
    downloadBlob(blob, `${result.templateKey}.txt`);
  });
  out.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

async function copyToClipboardWithFeedback(btn, text) {
  const original = btn.textContent;
  try {
    await navigator.clipboard.writeText(text);
    btn.textContent = '✓ Copied';
  } catch {
    btn.textContent = '✗ Copy failed';
  }
  setTimeout(() => { btn.textContent = original; }, 1400);
}

populateTakedownTab();

// ─── Report & Verify (PR 3: drop-in audit / queue-state inspector) ───

function wireReportTab() {
  const input = $('#report-file-input');
  const dropzone = $('#report-dropzone');
  const errBox = $('#report-error');
  const outputSection = $('#report-output-section');
  const output = $('#report-output');
  const clearBtn = $('#report-clear-btn');
  if (!input || !dropzone) return;

  const showError = (msg) => {
    if (!errBox) return;
    errBox.hidden = false;
    errBox.textContent = msg;
  };
  const clearError = () => {
    if (!errBox) return;
    errBox.hidden = true;
    errBox.textContent = '';
  };

  const handleFile = (file) => {
    clearError();
    if (!file) return;
    if (file.size > MAX_INPUT_BYTES) {
      showError(`File is ${(file.size / 1024 / 1024).toFixed(1)} MB — over the 10 MB cap.`);
      return;
    }
    const reader = new FileReader();
    reader.onerror = () => showError('Could not read file.');
    reader.onload = () => {
      const text = String(reader.result || '');
      const parsed = safeParseJson(text);
      if (!parsed.ok) { showError(parsed.error); return; }
      const view = parseAuditArtifact(parsed.value);
      const validation = validateStructure(parsed.value);
      renderArtifactView(output, view, validation);
      outputSection.hidden = false;
      outputSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };
    reader.readAsText(file);
  };

  input.addEventListener('change', () => {
    const file = input.files?.[0];
    if (file) handleFile(file);
  });

  // Drag-and-drop
  dropzone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropzone.classList.add('dragover');
  });
  dropzone.addEventListener('dragleave', () => dropzone.classList.remove('dragover'));
  dropzone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropzone.classList.remove('dragover');
    const file = e.dataTransfer?.files?.[0];
    if (file) handleFile(file);
  });

  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      output.innerHTML = '';
      outputSection.hidden = true;
      input.value = '';
      clearError();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }
}

wireReportTab();

// ─── Share card actions (shared broker + AI) ────────────────────

function renderShareActions(kind) {
  // kind is 'broker' or 'ai'
  const container = kind === 'broker' ? $('#share-actions') : $('#ai-share-actions');
  const hasBoth = state.brokerResult && state.aiResult;

  const label = hasBoth
    ? 'Share your triple-threat scorecard (broker + AI combined)'
    : kind === 'broker'
    ? 'Share your broker score (anonymous card, no personal info)'
    : 'Share your AI exposure (anonymous card, no personal info)';

  container.innerHTML = `
    <h3>${label}</h3>
    <div class="share-buttons">
      <button type="button" class="share-btn" data-share-action="png">📥 Download PNG</button>
      <button type="button" class="share-btn" data-share-action="svg">📥 Download SVG</button>
      <button type="button" class="share-btn" data-share-action="copy">📋 Copy share text</button>
    </div>
    <div class="share-preview">
      <img alt="Share card preview" src="${svgStringToDataUrl(currentActiveShareSvg(kind))}" />
    </div>
  `;

  container.querySelectorAll('[data-share-action]').forEach((btn) => {
    btn.addEventListener('click', () => handleShareAction(btn.dataset.shareAction, kind, btn));
  });
}

function currentActiveShareSvg(kind) {
  const hasBoth = state.brokerResult && state.aiResult;
  if (hasBoth) {
    // Rebuild the combined card each time we render (results may have updated)
    return buildTripleThreatCardSvg({
      broker: state.brokerResult,
      ai: state.aiResult
    });
  }
  if (kind === 'broker') return state.brokerShareSvg;
  return state.aiShareSvg;
}

async function handleShareAction(action, kind, btn) {
  const svg = currentActiveShareSvg(kind);
  const original = btn.textContent;
  try {
    if (action === 'png') {
      btn.textContent = '⏳ Rendering…';
      btn.disabled = true;
      const blob = await svgToPngBlob(svg);
      downloadBlob(blob, kind === 'ai' ? 'ai-exposure.png' : 'privacy-scorecard.png');
      btn.textContent = '✓ Downloaded';
    } else if (action === 'svg') {
      const blob = new Blob([svg], { type: 'image/svg+xml' });
      downloadBlob(blob, kind === 'ai' ? 'ai-exposure.svg' : 'privacy-scorecard.svg');
      btn.textContent = '✓ Downloaded';
    } else if (action === 'copy') {
      const text = buildShareText();
      await navigator.clipboard.writeText(text);
      btn.textContent = '✓ Copied';
    }
  } catch (err) {
    console.error(err);
    btn.textContent = '✗ Failed';
  }
  setTimeout(() => { btn.textContent = original; btn.disabled = false; }, 1800);
}

function buildShareText() {
  const parts = ['My Vanish privacy scorecard:'];
  if (state.brokerResult) {
    parts.push(`• Data brokers: ${state.brokerResult.privacyScore}/100 (${state.brokerResult.riskLevel.toUpperCase()}) — ${state.brokerResult.summary.likelyExposed} of ${state.brokerResult.summary.totalBrokers} likely expose me`);
  }
  if (state.aiResult) {
    parts.push(`• AI training exposure: ${state.aiResult.exposureScore}/100 (${state.aiResult.riskLevel.toUpperCase()}) — ${state.aiResult.summary.exposed} of ${state.aiResult.summary.totalPlatformsChecked} platforms feed my data to AI`);
  }
  parts.push('Check yours: https://ramboxie.github.io/vanish/');
  return parts.join('\n');
}

// ─── Helpers ────────────────────────────────────────────────────

function humanizeCategory(cat) {
  return ({
    'people-search': 'People Search',
    'background-check': 'Background Check',
    'phone-lookup': 'Phone Lookup',
    'public-records': 'Public Records',
    'marketing-data': 'Marketing Data',
    'financial': 'Financial',
    'location-data': 'Location Data',
    'email-data': 'Email Data',
    'social-media': 'Social Media',
    'reputation': 'Reputation',
    'identity-resolution': 'Identity Resolution',
    'property': 'Property'
  }[cat] || cat);
}
