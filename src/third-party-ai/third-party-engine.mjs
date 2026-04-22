// Third-party AI exposure — resolution + letter-template generation + install detection.

import os from 'node:os';
import { expandPath, statPath, formatBytes } from '../ai-history/history-engine.mjs';

/**
 * Resolve flags to tool keys.
 */
export function resolveToolKeys(flags, catalog) {
  const keys = [];
  const entries = Object.entries(catalog.tools);

  if (flags.all) {
    for (const [key] of entries) keys.push(key);
  } else {
    if (flags.use) {
      const tokens = String(flags.use).split(',').map(s => s.trim()).filter(Boolean);
      for (const token of tokens) {
        const found = entries.find(([k, t]) => k === token || t.signalAsked === token);
        if (!found) continue;
        if (!keys.includes(found[0])) keys.push(found[0]);
      }
    }
    for (const [key, tool] of entries) {
      if (flags[key] || flags[tool.signalAsked]) {
        if (!keys.includes(key)) keys.push(key);
      }
    }
  }

  // Context filters
  if (flags.context) {
    const ctx = String(flags.context);
    return keys.filter(k => catalog.tools[k].context === ctx);
  }

  return keys;
}

/**
 * Select the appropriate jurisdiction clause given the user's flags.
 * Supports workforce-monitoring-specific jurisdictions in addition to the
 * original meeting/HR/medical set.
 */
export function selectJurisdictionClause(flags) {
  // Workforce-monitoring-specific clauses (take priority if explicitly selected)
  if (flags.jurisdiction === 'US-state-NY-EMA' || flags['ny-ema']) {
    return 'Under the New York Electronic Monitoring Act (N.Y. Civil Rights Law §52-c, effective May 2022), employers must provide written notice to each employee of any electronic monitoring at hire, obtain written or electronic acknowledgment, and post notice in a conspicuous workplace location. Failure to do so is a violation enforceable by the NY Attorney General with civil penalties per violation per employee.';
  }
  if (flags.jurisdiction === 'US-state-IL-BIPA' || flags.bipa) {
    return 'Under the Illinois Biometric Information Privacy Act (740 ILCS 14/), collection of biometric identifiers — which may include keystroke-dynamics patterns, mouse-movement signatures, and similar behavioral-biometric data used for identification or profiling — requires (a) written notice of the specific purpose, (b) a written retention + destruction schedule, and (c) informed written consent. BIPA provides a private right of action with $1,000-$5,000 per violation in statutory damages, and Illinois courts have certified class actions against employers using keystroke-biometric tools without compliant consent.';
  }
  if (flags.jurisdiction === 'DE-works-council' || flags['de-br']) {
    return 'Unter §87 Absatz 1 Nr. 6 des Betriebsverfassungsgesetzes ist die Einführung und Anwendung technischer Einrichtungen, die dazu bestimmt sind, das Verhalten oder die Leistung der Arbeitnehmer zu überwachen, mitbestimmungspflichtig. Ohne Zustimmung des Betriebsrats ist der Einsatz eines solchen Systems unzulässig. Ich bitte um Vorlage der schriftlichen Betriebsvereinbarung, die den Einsatz der oben genannten Überwachungstools autorisiert.';
  }
  if (flags.jurisdiction === 'EU-GDPR-art88' || flags['gdpr-88']) {
    return 'Under GDPR Article 88 (processing in the context of employment), any processing of employee personal data must have a specific lawful basis and be governed by either (a) a collective agreement or (b) suitable safeguards proportionate to the purpose. Monitoring for AI-training purposes goes beyond the scope of ordinary employment performance — it requires explicit justification and satisfaction of the Article 5 proportionality test. I request documentation of the specific legal basis and the Article 35 Data Protection Impact Assessment.';
  }

  // Original clauses
  if (flags.jurisdiction === 'EU' || flags.eu) {
    return 'Under GDPR Article 21, I have the right to object to processing of my personal data (including voice and communication content) for purposes beyond the original meeting — including training or model-improvement use. Under Article 22, I additionally object to solely automated decision-making that produces legal effects about me.';
  }
  if (flags.jurisdiction === 'CA' || flags.ca) {
    return 'Under CCPA (Cal. Civ. Code §1798.100 et seq.) and AB-331, I have the right to opt out of automated decision-making tools applied to my employment-related data, and to request information about the logic involved.';
  }
  if (flags.jurisdiction === 'IL' || flags.il) {
    return 'Under the Illinois AI Video Interview Act (820 ILCS 42/5), employers must notify candidates + obtain consent before using AI interview analysis, and must disclose what general types of characteristics the AI evaluates.';
  }
  if (flags.jurisdiction === 'NY' || flags.ny) {
    return 'Under NYC Local Law 144, employers using automated employment decision tools must conduct bias audits + provide candidates written notice at least 10 business days before use.';
  }
  if (flags.jurisdiction === 'HIPAA' || flags.hipaa) {
    return 'Under HIPAA (45 CFR §164.506 + §164.524), I have the right to restrict certain uses and disclosures of my Protected Health Information, including AI-based processing that exceeds minimum necessary for treatment.';
  }
  return 'I am exercising my right to object to AI-based processing of my communication content under applicable privacy law.';
}

/**
 * Render an objection letter template with substitutions.
 */
export function renderObjectionLetter(templateKey, vars, catalog) {
  const tpl = catalog.objectionTemplates[templateKey];
  if (!tpl) throw new Error(`Unknown objection template: ${templateKey}`);

  let output = tpl.template;
  for (const [k, v] of Object.entries(vars || {})) {
    output = output.replace(new RegExp(`\\{\\{${k}\\}\\}`, 'g'), v);
  }
  // Replace any remaining {{x}} with [x] so the letter is still legible
  output = output.replace(/\{\{(\w+)\}\}/g, '[$1]');
  return {
    templateKey,
    displayName: tpl.displayName,
    letter: output
  };
}

/**
 * Detect which workforce-monitoring (or other install-path-aware) tools
 * have actually been installed on the user's own machine.
 *
 * Best-effort: vendors can use randomized install paths, stealth service
 * names, or custom-branded deployments. A MISSING result does NOT mean the
 * tool is not present. A FOUND result is strong evidence.
 *
 * @param {string[]} toolKeys - which tools to probe
 * @param {Object} catalog - third-party-catalog.json contents
 * @param {Object} [options] - { platform, env, homeDir } — for test injection
 * @returns {Array<{ tool, displayName, found, missing, hasAny, probedCount }>}
 */
export function detectInstalled(toolKeys, catalog, options = {}) {
  const {
    platform = process.platform,
    env = process.env,
    homeDir = os.homedir()
  } = options;

  const results = [];
  for (const key of toolKeys) {
    const tool = catalog.tools[key];
    if (!tool) continue;
    // Skip tools without installPaths (e.g., employer-internal = unknown)
    if (!tool.installPaths || typeof tool.installPaths !== 'object') {
      results.push({
        tool: key,
        displayName: tool.displayName,
        found: [],
        missing: [],
        hasAny: false,
        probedCount: 0,
        note: 'no-install-paths-documented'
      });
      continue;
    }
    const rawPaths = tool.installPaths[platform] || [];
    const found = [];
    const missing = [];
    for (const raw of rawPaths) {
      const absolute = expandPath(raw, { platform, env, homeDir });
      const stat = statPath(absolute);
      if (stat.exists) {
        found.push({
          rawPath: raw,
          path: absolute,
          bytes: stat.bytes || 0,
          items: stat.items || 0,
          isDirectory: Boolean(stat.isDirectory)
        });
      } else {
        missing.push({ rawPath: raw, path: absolute, reason: stat.error || 'not-found' });
      }
    }
    results.push({
      tool: key,
      displayName: tool.displayName,
      found,
      missing,
      hasAny: found.length > 0,
      probedCount: rawPaths.length
    });
  }
  return results;
}

/**
 * Format a detection result set as a text block suitable for embedding in
 * the {{detectedPaths}} slot of a workforce-monitoring objection letter.
 * Returns empty string when nothing was detected (the letter handles that).
 */
export function formatDetectedPathsForLetter(detectionResults) {
  const hits = detectionResults.filter(r => r.hasAny);
  if (hits.length === 0) return '';

  const lines = [];
  lines.push('EVIDENCE OF INSTALLED MONITORING AGENTS (scanned locally by the employee on the employee\'s own work device):');
  lines.push('');
  for (const r of hits) {
    lines.push(`  • ${r.displayName}`);
    for (const f of r.found) {
      const sizeHint = f.bytes > 0 ? ` [${formatBytes(f.bytes)}]` : '';
      lines.push(`      ${f.path}${sizeHint}`);
    }
  }
  lines.push('');
  lines.push('The above paths were resolved and stat()-verified on the device at the time of this request. Each path corresponds to the documented default install location for the named product per that product\'s own documentation.');
  return lines.join('\n');
}

/**
 * Plan — group tools by context + select an objection template per group.
 * When detectionResults are provided, the detected-paths exhibit is threaded
 * into the letter via {{detectedPaths}}.
 */
export function planObjections(keys, catalog, flags, detectionResults = null) {
  const byContext = {};
  for (const key of keys) {
    const tool = catalog.tools[key];
    if (!tool) continue;
    byContext[tool.context] = byContext[tool.context] || [];
    byContext[tool.context].push({ key, ...tool });
  }

  const clauseText = selectJurisdictionClause(flags);
  const detectedBlock = detectionResults
    ? formatDetectedPathsForLetter(detectionResults)
    : '';

  const plan = [];
  for (const [context, tools] of Object.entries(byContext)) {
    const templateKey = tools[0].objectionTemplate;
    if (!templateKey) continue;
    const rendered = renderObjectionLetter(templateKey, {
      toolNames: tools.map(t => t.displayName).join(', '),
      jurisdictionClause: clauseText,
      companyName: flags.company || '[employer name]',
      employerName: flags.company || flags.employer || '[employer name]',
      detectedPaths: detectedBlock
    }, catalog);
    plan.push({
      context,
      tools: tools.map(t => ({ key: t.key, displayName: t.displayName, vendor: t.vendor, notes: t.notes })),
      letter: rendered.letter,
      templateKey: rendered.templateKey
    });
  }
  return plan;
}
