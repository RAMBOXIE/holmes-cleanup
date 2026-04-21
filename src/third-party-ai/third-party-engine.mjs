// Third-party AI exposure — resolution + letter-template generation.

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
 */
export function selectJurisdictionClause(flags) {
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
 * Plan — group tools by context + select an objection template per group.
 */
export function planObjections(keys, catalog, flags) {
  const byContext = {};
  for (const key of keys) {
    const tool = catalog.tools[key];
    if (!tool) continue;
    byContext[tool.context] = byContext[tool.context] || [];
    byContext[tool.context].push({ key, ...tool });
  }

  const clauseText = selectJurisdictionClause(flags);
  const plan = [];
  for (const [context, tools] of Object.entries(byContext)) {
    const templateKey = tools[0].objectionTemplate;
    if (!templateKey) continue;
    const rendered = renderObjectionLetter(templateKey, {
      toolNames: tools.map(t => t.displayName).join(', '),
      jurisdictionClause: clauseText,
      companyName: flags.company || '[employer name]'
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
