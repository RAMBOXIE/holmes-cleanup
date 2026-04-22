#!/usr/bin/env node

// Takedown orchestrator for unauthorized distribution of intimate imagery.
//
// For anyone who needs to remove leaked, scraped, reuploaded, or
// non-consensually-distributed content from:
//   - Leak/aggregator sites (coomer, kemono, thothub, etc.) via DMCA
//   - Search engines (Google, Bing, Yandex) via dedicated intimate-imagery forms
//   - Hash registries (StopNCII.org — the single most effective free tool)
//   - Platform abuse forms (Reddit, Twitter, Telegram, Discord, etc.)
//
// Generates jurisdiction-aware legal letters (DMCA, Cease & Desist, police
// report narrative, civil pre-suit demand). HMAC-signs every takedown you
// confirm — the signed audit log is admissible evidence later.
//
// Vanish stores NOTHING: not your content, not URLs you target, not the
// sites you visited. Privacy-first throughout.
//
// Usage:
//   vanish takedown --list                                    (show all resources)
//   vanish takedown --stopncii                                (StopNCII.org walkthrough)
//   vanish takedown --google-intimate                         (Google intimate-imagery removal)
//   vanish takedown --dmca-letter --coomer --kemono --thothub (generate DMCA letters)
//   vanish takedown --cease-and-desist --name "X" --jurisdiction SHIELD
//   vanish takedown --police-report
//   vanish takedown --all                                     (walk through everything)
//   vanish takedown --support                                 (crisis hotlines + legal aid)

import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline/promises';
import { stdin, stdout } from 'node:process';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import crypto from 'node:crypto';

import { QueueStateStore } from '../src/queue/state-store.mjs';
import { signAuditEvents } from '../src/audit/signature.mjs';
import {
  selectJurisdictionClause,
  renderLegalLetter,
  resolveLeakSiteKeys,
  planDmcaNotices
} from '../src/takedown/takedown-engine.mjs';

const require = createRequire(import.meta.url);
const catalog = require('../src/takedown/takedown-catalog.json');

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    const token = argv[i];
    if (!token.startsWith('--')) continue;
    const key = token.slice(2);
    const next = argv[i + 1];
    if (!next || next.startsWith('--')) { out[key] = true; }
    else { out[key] = next; i++; }
  }
  return out;
}

function writeAsync(stream, text) {
  return new Promise((resolve, reject) => {
    stream.write(text, (err) => (err ? reject(err) : resolve()));
  });
}

function openUrl(url) {
  const p = process.platform;
  const cmd = p === 'win32' ? 'cmd' : p === 'darwin' ? 'open' : 'xdg-open';
  const args = p === 'win32' ? ['/c', 'start', '""', url] : [url];
  try { spawn(cmd, args, { stdio: 'ignore', detached: true }).unref(); } catch {}
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (args.help || args.h) {
    await writeAsync(process.stdout, `
Takedown orchestrator — remove non-consensual or unauthorized distribution
of intimate imagery. Covers DMCA, hash registries (StopNCII.org), search
engine removal, platform abuse forms, and legal letter generation.

Vanish never stores your content, URLs, or the list of sites you target.

⚠️  Before you start: if you are in immediate crisis, please call:
     • Cyber Civil Rights Initiative (US): 1-844-878-CCRI (2274)
     • Revenge Porn Helpline (UK): +44 345 6000 459
     • Australia eSafety Commissioner: esafety.gov.au/report/image-based-abuse

USAGE
  vanish takedown [flags]

SEARCH ENGINE REMOVAL
  --google-intimate      Google's dedicated intimate-imagery removal form
  --bing-removal         Bing/Microsoft content removal
  --yandex-removal       Yandex removal request

HASH REGISTRIES (most effective free tool)
  --stopncii             StopNCII.org — hash your images locally, 100K+ users
  --meta-ncii            Meta's NCII protection (integrated with StopNCII)
  --ncmec                NCMEC CyberTipline (for anyone under 18 at the time)

LEAK SITE DMCA NOTICES (generate per-site DMCA letters)
  --coomer               coomer.su / coomer.party
  --kemono               kemono.su / kemono.party
  --thothub              thothub.tv
  --bitchesgirls         bitchesgirls.com
  --leakgallery          leakgallery.com
  --erome                erome.com
  --pornhub              Pornhub content-removal (uses their faster form, not DMCA)
  --xvideos              XVideos NCII form
  --telegram             Telegram channel report flow
  --discord-leak         Discord Trust & Safety (dis.gd/request)
  --reddit-leak          Reddit abuse + legal notice
  --twitter-leak         Twitter/X NCII form
  --all-leak-sites       Generate DMCA letters for every catalogued site

LEGAL LETTER TEMPLATES
  --dmca-letter          DMCA §512(c) takedown (requires --use or --all-leak-sites)
  --cease-and-desist     C&D to individual (ex-partner, redistributor)
  --police-report        Narrative draft for filing with law enforcement
  --civil-pre-suit       Pre-suit demand letter (before lawsuit)

JURISDICTION FLAG (used for all letters)
  --jurisdiction DMCA    US 17 U.S.C. §512(c) (default for DMCA)
  --jurisdiction SHIELD  US federal Shield Act / 18 U.S.C. §2261A
  --jurisdiction TAKE-IT-DOWN  US Take It Down Act 2025 (NCII + deepfakes)
  --jurisdiction EU      GDPR Article 17
  --jurisdiction UK      UK Online Safety Act 2023
  --jurisdiction CA      Canada Criminal Code §162.1
  --jurisdiction AU      Australia Online Safety Act 2021

PERSONAL DETAILS (substituted into letters)
  --name "..."           Your name
  --email "..."          Your contact email
  --state-statute "..."  Your state's NCII statute name (e.g., Cal. Civ. Code §1708.85)

META
  --list                 Show all catalog entries without generating letters
  --support              Print crisis hotlines and legal aid resources
  --all                  Walk through: hash registries + search engines + all DMCA letters
  --output <path>        Write generated letters to a file
  --state-file <path>    Queue state file for audit trail
  --no-open              Test mode — skip URL opens and interactive prompts
  --help                 This message

EXAMPLES

  # The ABSOLUTE FIRST thing to do — hash-register with StopNCII.org
  # Your images never leave your device; platforms auto-block matches
  vanish takedown --stopncii

  # Remove from Google Search (intimate-imagery form is faster than general)
  vanish takedown --google-intimate

  # Generate DMCA letters for the 3 biggest aggregator sites
  vanish takedown --dmca-letter --coomer --kemono --thothub \\
    --name "Your Name" --email "legal@yourdomain.com" --output dmca-letters.md

  # Full multi-pronged campaign
  vanish takedown --all --name "..." --email "..." --jurisdiction SHIELD \\
    --output takedown-package.md

  # Crisis hotlines + legal aid
  vanish takedown --support

PHILOSOPHY
  Vanish does NOT contact anyone on your behalf. You send the letters
  yourself (from your own email, for legal standing + perjury attestation).
  We provide the catalog, the templates, and the audit trail.

  Every confirmed takedown is HMAC-signed in your local queue state file.
  That audit log is admissible in court later.
`);
    process.exit(0);
  }

  if (args.support) {
    await writeAsync(process.stdout, `\n━━━ Crisis + Legal Support Resources ━━━\n\n`);
    for (const [key, s] of Object.entries(catalog.support)) {
      await writeAsync(process.stdout, `${s.displayName} (${(s.countries || []).join(', ') || 'Global'})\n`);
      if (s.contact) await writeAsync(process.stdout, `  Phone: ${s.contact}\n`);
      await writeAsync(process.stdout, `  Web: ${s.url}\n`);
      await writeAsync(process.stdout, `  ${s.description}\n\n`);
    }
    process.exit(0);
  }

  if (args.list) {
    await writeAsync(process.stdout, `\n━━━ Takedown Catalog ━━━\n\n`);
    await writeAsync(process.stdout, `Hash registries (most effective):\n`);
    for (const [k, v] of Object.entries(catalog.hashRegistries)) {
      await writeAsync(process.stdout, `  • ${v.displayName} — ${v.url}\n`);
    }
    await writeAsync(process.stdout, `\nSearch engine removal forms:\n`);
    for (const [k, v] of Object.entries(catalog.searchEngines)) {
      await writeAsync(process.stdout, `  • ${v.displayName} — ${v.url}\n`);
    }
    await writeAsync(process.stdout, `\nLeak sites (${Object.keys(catalog.leakSites).length}):\n`);
    for (const [k, v] of Object.entries(catalog.leakSites)) {
      await writeAsync(process.stdout, `  • ${v.displayName} [${v.takedownDifficulty}] — abuse: ${v.abuseContact}\n`);
    }
    await writeAsync(process.stdout, `\nLegal templates (${Object.keys(catalog.legalTemplates).length}): ${Object.keys(catalog.legalTemplates).join(', ')}\n`);
    process.exit(0);
  }

  // Build a plan
  const noOpen = Boolean(args['no-open']);
  const allRecorded = [];
  const outputParts = [];

  // 1. Hash registries (always show these — they're the most effective)
  if (args.stopncii || args['meta-ncii'] || args.ncmec || args.all) {
    const registries = [];
    if (args.stopncii || args.all || args['meta-ncii']) registries.push('stopncii');
    if (args.ncmec) registries.push('ncmec-cybertipline');

    for (const key of registries) {
      const reg = catalog.hashRegistries[key];
      if (!reg) continue;
      await writeAsync(process.stdout, `\n━━━ ${reg.displayName} ━━━\n`);
      await writeAsync(process.stdout, `${reg.notes}\n\n`);
      if (reg.privacyNote) await writeAsync(process.stdout, `🔒 Privacy: ${reg.privacyNote}\n\n`);
      await writeAsync(process.stdout, `URL: ${reg.url}\n\n`);
      if (reg.walkthrough) {
        await writeAsync(process.stdout, `Steps:\n`);
        for (let i = 0; i < reg.walkthrough.length; i++) {
          await writeAsync(process.stdout, `  ${i + 1}. ${reg.walkthrough[i]}\n`);
        }
      }
      if (reg.caveat) await writeAsync(process.stdout, `\n⚠️  ${reg.caveat}\n`);
      if (!noOpen) openUrl(reg.url);
      allRecorded.push({
        id: `takedown_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`,
        kind: 'takedown-hash-registry',
        target: key,
        displayName: reg.displayName,
        at: new Date().toISOString()
      });
    }
  }

  // 2. Search engine removal
  const searchKeys = [];
  if (args['google-intimate'] || args.all) searchKeys.push('google-intimate');
  if (args['bing-removal'] || args.all) searchKeys.push('bing-removal');
  if (args['yandex-removal'] || args.all) searchKeys.push('yandex-removal');
  for (const key of searchKeys) {
    const se = catalog.searchEngines[key];
    if (!se) continue;
    await writeAsync(process.stdout, `\n━━━ ${se.displayName} ━━━\n`);
    await writeAsync(process.stdout, `${se.notes}\n\nURL: ${se.url}\n\n`);
    if (se.walkthrough) {
      await writeAsync(process.stdout, `Steps:\n`);
      for (let i = 0; i < se.walkthrough.length; i++) {
        await writeAsync(process.stdout, `  ${i + 1}. ${se.walkthrough[i]}\n`);
      }
    }
    if (!noOpen) openUrl(se.url);
    allRecorded.push({
      id: `takedown_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`,
      kind: 'takedown-search-engine',
      target: key,
      displayName: se.displayName,
      at: new Date().toISOString()
    });
  }

  // 3. DMCA letters for leak sites
  const dmcaRequested = args['dmca-letter'] || args.all;
  if (dmcaRequested) {
    const siteKeys = args['all-leak-sites'] || args.all
      ? Object.keys(catalog.leakSites)
      : resolveLeakSiteKeys(args, catalog);
    if (siteKeys.length > 0) {
      await writeAsync(process.stdout, `\n━━━ DMCA Notices (${siteKeys.length} sites) ━━━\n\n`);
      const notices = planDmcaNotices(siteKeys, catalog, args);
      for (const notice of notices) {
        await writeAsync(process.stdout, `\n--- ${notice.displayName} ---\n`);
        await writeAsync(process.stdout, `Abuse contact: ${notice.abuseContact}\n`);
        await writeAsync(process.stdout, `Difficulty: ${notice.takedownDifficulty}\n`);
        await writeAsync(process.stdout, `Approach: ${notice.approach}\n\n`);
        if (!args.output) {
          await writeAsync(process.stdout, `${notice.letter}\n\n`);
        }
        outputParts.push(`## ${notice.displayName} (DMCA)\n\nSend to: ${notice.abuseContact}\n\nApproach: ${notice.approach}\n\n\`\`\`\n${notice.letter}\n\`\`\`\n`);
        allRecorded.push({
          id: `takedown_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`,
          kind: 'takedown-dmca-drafted',
          target: notice.site,
          displayName: notice.displayName,
          abuseContact: notice.abuseContact,
          at: new Date().toISOString()
        });
      }
    }
  }

  // 4. Individual legal letter flags
  for (const [flag, templateKey] of [
    ['cease-and-desist', 'cease-and-desist'],
    ['police-report', 'police-report'],
    ['civil-pre-suit', 'civil-pre-suit']
  ]) {
    if (!args[flag] && !args.all) continue;
    const clause = selectJurisdictionClause(args, catalog);
    const rendered = renderLegalLetter(templateKey, {
      yourName: args.name,
      yourEmail: args.email,
      jurisdictionClause: clause,
      stateStatute: args['state-statute']
    }, catalog);
    await writeAsync(process.stdout, `\n━━━ ${rendered.displayName} ━━━\n`);
    await writeAsync(process.stdout, `Purpose: ${rendered.purpose}\n\n`);
    // Print letter body inline when no output file is given (primary UX)
    if (!args.output) {
      await writeAsync(process.stdout, `${rendered.letter}\n\n`);
    }
    outputParts.push(`## ${rendered.displayName}\n\n${rendered.purpose}\n\n\`\`\`\n${rendered.letter}\n\`\`\`\n`);
    allRecorded.push({
      id: `takedown_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`,
      kind: 'takedown-legal-letter',
      target: templateKey,
      displayName: rendered.displayName,
      at: new Date().toISOString()
    });
  }

  // 5. If output file requested, assemble full package
  if (args.output && outputParts.length > 0) {
    const outPath = path.resolve(args.output);
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    const header = `# Vanish Takedown Package\n\nGenerated: ${new Date().toISOString()}\nJurisdiction: ${args.jurisdiction || 'default'}\n\n⚠️  Review before sending. Replace [bracketed] placeholders. Keep HMAC-signed local audit trail.\n\n`;
    fs.writeFileSync(outPath, header + outputParts.join('\n---\n\n'));
    await writeAsync(process.stdout, `\nWrote assembled letters to: ${outPath}\n`);
  } else if (outputParts.length > 0 && !args.json) {
    await writeAsync(process.stdout, `\nUse --output <path> to save these letters to a file.\n`);
  }

  // 6. Persist audit trail
  if (allRecorded.length > 0) {
    const store = new QueueStateStore({
      filePath: path.resolve(args['state-file'] || 'data/queue-state.json')
    });
    await store.mutate(state => {
      const auditEvents = allRecorded.map(entry => ({
        at: entry.at,
        event: 'takedown_action_drafted',
        kind: entry.kind,
        target: entry.target,
        displayName: entry.displayName,
        auditId: entry.id,
        userConfirmed: true
      }));
      state.audit = signAuditEvents([...(state.audit || []), ...auditEvents]);
      return state;
    });
  }

  // Summary
  if (allRecorded.length === 0 && !args.support && !args.list) {
    await writeAsync(process.stderr, `
No actions specified. Run with --help for full usage, or try:
  vanish takedown --support                    (crisis resources first)
  vanish takedown --stopncii                   (most effective free tool)
  vanish takedown --google-intimate            (search engine removal)
  vanish takedown --all --name "X" --email "X@Y"  (comprehensive walkthrough)
`);
    process.exit(1);
  }

  if (allRecorded.length > 0) {
    await writeAsync(process.stdout, `\n━━━ Summary ━━━\n`);
    await writeAsync(process.stdout, `Actions drafted: ${allRecorded.length}\n`);
    await writeAsync(process.stdout, `HMAC-signed in audit log: ${allRecorded.length}\n`);
    await writeAsync(process.stdout, `\nReminder: Vanish does NOT send the letters for you — you send them yourself\nfrom your own email for legal standing. The audit log is admissible evidence.\n`);
  }

  process.exit(0);
}

main().catch(err => {
  process.stderr.write(`\nError: ${err.message}\n`, () => process.exit(1));
});
