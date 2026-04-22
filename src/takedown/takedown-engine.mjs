// Takedown engine — legal letter rendering + jurisdiction-aware clauses
// for NCII / unauthorized content removal.

/**
 * Select jurisdiction-specific legal clause text.
 */
export function selectJurisdictionClause(flags, catalog) {
  const j = catalog.jurisdictions || {};
  if (flags.jurisdiction === 'EU' || flags.eu) return j['EU-GDPR'];
  if (flags.jurisdiction === 'UK' || flags.uk) return j['UK-Online-Safety-Act'];
  if (flags.jurisdiction === 'CA' || flags.ca) return j['CA-Criminal-Code'];
  if (flags.jurisdiction === 'AU' || flags.au) return j['AU-Online-Safety-Act'];
  if (flags.jurisdiction === 'SHIELD' || flags.shield) return j['US-federal-SHIELD'];
  if (flags.jurisdiction === 'TAKE-IT-DOWN' || flags['take-it-down']) return j['US-federal-Take-It-Down'];
  if (flags.jurisdiction === 'DMCA' || flags.dmca) return j['US-federal-DMCA'];
  return 'applicable privacy and copyright law in your jurisdiction';
}

/**
 * Render a legal letter template with variable substitution.
 */
export function renderLegalLetter(templateKey, vars, catalog) {
  const tpl = catalog.legalTemplates[templateKey];
  if (!tpl) throw new Error(`Unknown legal template: ${templateKey}`);

  let output = tpl.template;
  const defaults = {
    today: new Date().toISOString().slice(0, 10),
    yourName: '[your name]',
    yourEmail: '[your email]',
    recipientName: '[recipient name]',
    recipientEmail: '[recipient email]',
    infringingUrls: '[list the URLs hosting the unauthorized content, one per line]',
    additionalContact: '',
    jurisdictionClause: 'applicable privacy and copyright law',
    stateStatute: '[specify your state statute — see cybercivilrights.org/map]',
    deliveryMethod: 'certified mail',
    incidentDate: '[date of discovery]',
    channelsList: '[list URLs / platforms where content appeared]',
    suspectInfo: '[name + contact info if known, otherwise state "unknown — subpoena required"]',
    federalAgency: 'FBI Internet Crime Complaint Center (IC3)',
    yourContactInfo: '[phone + email]'
  };

  const merged = { ...defaults, ...(vars || {}) };
  for (const [k, v] of Object.entries(merged)) {
    output = output.replace(new RegExp(`\\{\\{${k}\\}\\}`, 'g'), v);
  }
  // Any remaining {{x}} — expose as [x] so letter still reads cleanly
  output = output.replace(/\{\{(\w+)\}\}/g, '[$1]');

  return {
    templateKey,
    displayName: tpl.displayName,
    purpose: tpl.purpose,
    letter: output
  };
}

/**
 * Resolve user-given flags to a list of leak-site keys.
 */
export function resolveLeakSiteKeys(flags, catalog) {
  const keys = [];
  const entries = Object.entries(catalog.leakSites);
  if (flags.all || flags['all-leak-sites']) {
    for (const [key] of entries) keys.push(key);
    return keys;
  }
  if (flags.use) {
    const tokens = String(flags.use).split(',').map(s => s.trim()).filter(Boolean);
    for (const token of tokens) {
      const found = entries.find(([k, s]) => k === token || s.signalAsked === token);
      if (!found) continue;
      if (!keys.includes(found[0])) keys.push(found[0]);
    }
  }
  for (const [key, site] of entries) {
    if (flags[key] || flags[site.signalAsked]) {
      if (!keys.includes(key)) keys.push(key);
    }
  }
  return keys;
}

/**
 * Plan DMCA notices across requested leak sites.
 */
export function planDmcaNotices(siteKeys, catalog, flags) {
  const notices = [];
  const jurisdictionClause = selectJurisdictionClause(flags, catalog);

  for (const key of siteKeys) {
    const site = catalog.leakSites[key];
    if (!site) continue;
    const rendered = renderLegalLetter('dmca-takedown', {
      recipientEmail: site.abuseContact,
      yourName: flags.name || '[your name]',
      yourEmail: flags.email || '[your email]',
      jurisdictionClause
    }, catalog);
    notices.push({
      site: key,
      displayName: site.displayName,
      abuseContact: site.abuseContact,
      takedownDifficulty: site.takedownDifficulty,
      approach: site.approach,
      letter: rendered.letter
    });
  }
  return notices;
}
