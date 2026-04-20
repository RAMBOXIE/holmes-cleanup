// Share card generators — for viral distribution of scan results.
//
// Two formats:
//   renderShareBanner(scanResult)  → framed terminal banner (screenshot-friendly)
//   renderShareCardSvg(scanResult) → 1200×630 SVG (OG-image standard, shareable)
//
// Both formats are PRIVACY-PRESERVING: they contain aggregate scores and
// category stats only. No name, email, phone, or any identifying data.

const RISK_COLORS = {
  critical: '#ff3b30',
  high:     '#ff9500',
  moderate: '#ffcc00',
  low:      '#34c759'
};

const RISK_COLORS_ANSI = {
  critical: '\x1b[31m', // red
  high:     '\x1b[33m', // yellow (closest ANSI to orange)
  moderate: '\x1b[33m',
  low:      '\x1b[32m'  // green
};

const RESET = '\x1b[0m';
const BOLD = '\x1b[1m';
const DIM  = '\x1b[2m';

// ──────────────────────────────────────────────────────────────────────────
// Terminal banner — screenshot-friendly framed box
// ──────────────────────────────────────────────────────────────────────────

/**
 * @param {ScanResult} scanResult - from runHeuristicScan()
 * @param {Object} [options]
 * @param {boolean} [options.color=true] - include ANSI colors (disable for logs/tests)
 * @returns {string}
 */
export function renderShareBanner(scanResult, options = {}) {
  const color = options.color !== false;
  const { privacyScore, riskLevel, summary } = scanResult;

  const c = color ? RISK_COLORS_ANSI[riskLevel] || '' : '';
  const b = color ? BOLD : '';
  const d = color ? DIM : '';
  const r = color ? RESET : '';

  const scoreStr = `${privacyScore} / 100`;
  const bar = renderBar(privacyScore, 24);
  const topCats = topCategories(summary.byCategory, 2);

  const WIDTH = 52;
  const INNER = WIDTH - 6;   // content area: `│` + 2sp + CONTENT + 2sp + `│` = WIDTH
  const pad = (text) => {
    const visibleLen = stripAnsi(text).length;
    return text + ' '.repeat(Math.max(0, INNER - visibleLen));
  };
  const line = (text) => `│  ${pad(text)}  │`;
  const blank = `│${' '.repeat(WIDTH - 2)}│`;

  const lines = [];
  lines.push(`┌${'─'.repeat(WIDTH - 2)}┐`);
  lines.push(blank);
  lines.push(line(`${b}My Privacy Exposure${r}`));
  lines.push(blank);
  lines.push(line(`${c}${b}${centerText(scoreStr, INNER)}${r}`));
  lines.push(line(`${c}${centerText(bar, INNER)}${r}`));
  lines.push(line(`${c}${b}${centerText(riskLevel.toUpperCase() + ' RISK', INNER)}${r}`));
  lines.push(blank);
  lines.push(line(`${summary.likelyExposed} of ${summary.totalBrokers} brokers likely expose me`));
  if (topCats.length > 0) {
    const topStr = `Top: ${topCats.join(', ')}`;
    // Truncate if exceeds inner width (to preserve box borders)
    const truncated = topStr.length > INNER ? topStr.slice(0, INNER - 1) + '…' : topStr;
    lines.push(line(`${d}${truncated}${r}`));
  }
  lines.push(blank);
  lines.push(line(`${d}github.com/RAMBOXIE/holmes-cleanup${r}`));
  lines.push(blank);
  lines.push(`└${'─'.repeat(WIDTH - 2)}┘`);

  return lines.join('\n');
}

// ──────────────────────────────────────────────────────────────────────────
// SVG share card — 1200×630 (OG standard, works for Twitter/Reddit preview)
// ──────────────────────────────────────────────────────────────────────────

/**
 * @param {ScanResult} scanResult
 * @returns {string} SVG markup
 */
export function renderShareCardSvg(scanResult) {
  const { privacyScore, riskLevel, summary } = scanResult;
  const color = RISK_COLORS[riskLevel] || RISK_COLORS.moderate;
  const topCats = topCategories(summary.byCategory, 3);

  // Bar geometry
  const barX = 300;
  const barY = 350;
  const barWidth = 600;
  const barHeight = 30;
  const fillWidth = Math.round(barWidth * (privacyScore / 100));

  const riskUpper = riskLevel.toUpperCase();
  const categoryLine = topCats.length > 0
    ? `Top exposure: ${topCats.join(' · ')}`
    : 'Categories analysed across 12 broker types';

  // SVG escape helper (safe inputs — but defense in depth)
  const esc = (s) => String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <!-- Background -->
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0a0a0f"/>
      <stop offset="100%" stop-color="#1a1a28"/>
    </linearGradient>
    <filter id="glow">
      <feGaussianBlur stdDeviation="8" result="b"/>
      <feMerge>
        <feMergeNode in="b"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
  </defs>
  <rect width="1200" height="630" fill="url(#bg)"/>

  <!-- Top accent line -->
  <rect x="0" y="0" width="1200" height="4" fill="${color}" opacity="0.8"/>

  <!-- Brand + eyebrow -->
  <text x="60" y="80" font-family="system-ui, -apple-system, Segoe UI, Helvetica, Arial, sans-serif"
    font-size="22" font-weight="500" fill="#8b8ba7" letter-spacing="2">
    🔍 HOLMES-CLEANUP · PRIVACY SCAN
  </text>

  <!-- Title -->
  <text x="60" y="160" font-family="system-ui, -apple-system, Segoe UI, Helvetica, Arial, sans-serif"
    font-size="44" font-weight="300" fill="#ffffff">
    My Privacy Exposure Score
  </text>

  <!-- Giant score -->
  <text x="600" y="310" text-anchor="middle"
    font-family="system-ui, -apple-system, Segoe UI, Helvetica, Arial, sans-serif"
    font-size="180" font-weight="800" fill="${color}" filter="url(#glow)">
    ${privacyScore}
  </text>
  <text x="720" y="310" text-anchor="start"
    font-family="system-ui, -apple-system, Segoe UI, Helvetica, Arial, sans-serif"
    font-size="64" font-weight="300" fill="#8b8ba7">
    / 100
  </text>

  <!-- Progress bar bg -->
  <rect x="${barX}" y="${barY}" width="${barWidth}" height="${barHeight}"
    rx="15" fill="#2a2a3f"/>
  <!-- Progress bar fill -->
  <rect x="${barX}" y="${barY}" width="${fillWidth}" height="${barHeight}"
    rx="15" fill="${color}"/>

  <!-- Risk level label -->
  <text x="600" y="430" text-anchor="middle"
    font-family="system-ui, -apple-system, Segoe UI, Helvetica, Arial, sans-serif"
    font-size="32" font-weight="700" fill="${color}" letter-spacing="4">
    ${esc(riskUpper)} RISK
  </text>

  <!-- Stats line -->
  <text x="600" y="485" text-anchor="middle"
    font-family="system-ui, -apple-system, Segoe UI, Helvetica, Arial, sans-serif"
    font-size="24" font-weight="400" fill="#c4c4d6">
    ${summary.likelyExposed} of ${summary.totalBrokers} data brokers likely expose me
  </text>

  <!-- Categories -->
  <text x="600" y="520" text-anchor="middle"
    font-family="system-ui, -apple-system, Segoe UI, Helvetica, Arial, sans-serif"
    font-size="18" font-weight="400" fill="#8b8ba7">
    ${esc(categoryLine)}
  </text>

  <!-- CTA bar -->
  <rect x="0" y="580" width="1200" height="50" fill="#0a0a0f" opacity="0.7"/>
  <text x="600" y="612" text-anchor="middle"
    font-family="ui-monospace, SFMono-Regular, Consolas, monospace"
    font-size="20" font-weight="500" fill="#ffffff">
    npx github:RAMBOXIE/holmes-cleanup scan --name "Your Name"
  </text>
</svg>`;
}

// ──────────────────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────────────────

function renderBar(score, width) {
  const filled = Math.round((score / 100) * width);
  const empty = width - filled;
  return '[' + '█'.repeat(filled) + '░'.repeat(empty) + ']';
}

function topCategories(byCategory, limit = 2) {
  if (!byCategory) return [];
  return Object.entries(byCategory)
    .map(([cat, counts]) => ({ cat, likely: counts.likely || 0 }))
    .filter(x => x.likely > 0)
    .sort((a, b) => b.likely - a.likely)
    .slice(0, limit)
    .map(x => `${humanizeCategory(x.cat)} (${x.likely})`);
}

function humanizeCategory(cat) {
  const map = {
    'people-search':       'People Search',
    'background-check':    'Background Check',
    'phone-lookup':        'Phone Lookup',
    'public-records':      'Public Records',
    'marketing-data':      'Marketing Data',
    'financial':           'Financial',
    'location-data':       'Location Data',
    'email-data':          'Email Data',
    'social-media':        'Social Media',
    'reputation':          'Reputation',
    'identity-resolution': 'Identity Resolution',
    'property':            'Property'
  };
  return map[cat] || cat;
}

function centerText(text, width) {
  const len = stripAnsi(text).length;
  if (len >= width) return text;
  const total = width - len;
  const left = Math.floor(total / 2);
  const right = total - left;
  return ' '.repeat(left) + text + ' '.repeat(right);
}

function stripAnsi(s) {
  // eslint-disable-next-line no-control-regex
  return String(s).replace(/\x1b\[[0-9;]*m/g, '');
}
