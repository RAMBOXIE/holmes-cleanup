#!/usr/bin/env node

// Third-party AI exposure tool — catalog of AI tools YOUR employer / doctor /
// HR / sales contacts use on YOU (you are the data, not the user). Generates
// jurisdiction-aware objection letter templates you can send them.
//
// Usage:
//   vanish third-party-ai --zoom --otter --fireflies
//   vanish third-party-ai --context workplace
//   vanish third-party-ai --hirevue --pymetrics --jurisdiction IL
//   vanish third-party-ai --abridge --nuance --jurisdiction HIPAA
//   vanish third-party-ai --all
//   vanish third-party-ai --all --output letters.txt

import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import {
  resolveToolKeys,
  planObjections,
  detectInstalled,
  formatDetectedPathsForLetter
} from '../src/third-party-ai/third-party-engine.mjs';

const require = createRequire(import.meta.url);
const catalog = require('../src/third-party-ai/third-party-catalog.json');

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

async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (args.help || args.h) {
    await writeAsync(process.stdout, `
Third-party AI exposure — what AI tools are OTHER people using on you?

Generates jurisdiction-aware objection letter templates you can send
to employers, recruiters, sales reps, and healthcare providers who use
AI on your data without your explicit consent.

Usage:
  vanish third-party-ai [flags]

Workplace tools:
  --zoom           Zoom AI Companion (meetings)
  --otter          Otter.ai (meeting transcription bot)
  --fireflies      Fireflies.ai (meeting bot)
  --fathom         Fathom (Zoom extension)
  --gong           Gong (sales-call analytics)
  --chorus         Chorus / ZoomInfo
  --read           Read.ai (includes facial analysis)
  --teams-copilot  Microsoft Teams Copilot

HR / recruiting:
  --hirevue        HireVue (AI video interviews)
  --pymetrics      Pymetrics / Harver (gamified AI assessment)

Medical:
  --abridge        Abridge (doctor-patient AI scribe)
  --nuance         Nuance DAX / Microsoft (ambient AI)
  --suki           Suki AI

Workforce monitoring (employer-installed agents training AI on your workflow):
  --activtrak          ActivTrak (productivity analytics + 'Coach AI')
  --teramind           Teramind (full-stack endpoint monitoring, stealth mode)
  --hubstaff           Hubstaff (screenshots + keystroke-rate)
  --time-doctor        Time Doctor (similar; has silent-mode option)
  --insightful         Insightful / Workpuls (stealth-install supported)
  --veriato            Veriato / SpectorSoft (historically 'insider threat')
  --interguard         InterGuard / Awareness Technologies
  --viva-insights      Microsoft Viva Insights / M365 Productivity Analytics
  --employer-internal  Your employer's own closed-source tool (Meta-memo case)
  --detect-installed   Scan this machine for which of the above are installed
                        (best-effort; found paths become exhibit in letter)

Context + jurisdiction:
  --context <c>    Filter by context: workplace | hr-recruiting | medical
                    | workforce-monitoring
  --jurisdiction X Select jurisdiction clause:
                    EU | CA | IL | NY | HIPAA  (original meeting/HR/medical)
                    US-state-NY-EMA  (NY Electronic Monitoring Act 2022)
                    US-state-IL-BIPA (Illinois biometric — keystroke patterns)
                    DE-works-council (Germany §87 Betriebsverfassungsgesetz)
                    EU-GDPR-art88    (GDPR employment-context processing)
  --company "..."  Company/employer name (interview + workforce letters)

Scope:
  --use <csv>      --use zoom,otter,fireflies
  --all            Every tool

Output:
  --output <path>  Write letters to a file instead of stdout
  --json           Machine-readable JSON
  --help           This message

Examples:
  # Workplace meeting objection (EU law)
  vanish third-party-ai --context workplace --jurisdiction EU

  # AI interview accommodation request (Illinois law)
  vanish third-party-ai --hirevue --jurisdiction IL --company "Acme Corp"

  # Medical AI decline (HIPAA)
  vanish third-party-ai --context medical --jurisdiction HIPAA

  # Sales-call consent letter (Gong customer side, CA)
  vanish third-party-ai --gong --chorus --jurisdiction CA

  # Workforce monitoring — scan this machine first, then generate evidence-
  # backed objection letter citing NY Electronic Monitoring Act (2022)
  vanish third-party-ai --context workforce-monitoring \\
    --detect-installed \\
    --jurisdiction US-state-NY-EMA \\
    --company "Acme Corp" \\
    --output workforce-objection.md

  # BIPA-specific angle for keystroke-biometric tools (Illinois)
  vanish third-party-ai --teramind --veriato \\
    --jurisdiction US-state-IL-BIPA \\
    --company "Acme Corp"

  # Detection only (no letter, just "what's on this machine")
  vanish third-party-ai --context workforce-monitoring --detect-installed

Note: These templates are NOT legal advice. Consult a lawyer for
jurisdiction-specific enforcement. Letters are designed to put vendors
+ deployers on notice, which often suffices to trigger accommodation.

Workforce-monitoring detection is BEST-EFFORT: vendors can randomize
install paths or use stealth installs. A negative detection does NOT
mean you aren't being monitored. A positive detection is strong
documentary evidence.
`);
    process.exit(0);
  }

  // Default key resolution — but if user gave ONLY --detect-installed with no
  // other flags, default to scanning all workforce-monitoring tools.
  let keys = resolveToolKeys(args, catalog);
  const detectRequested = Boolean(args['detect-installed']);

  if (keys.length === 0 && detectRequested) {
    // Implicit: --detect-installed alone means "scan workforce-monitoring tools"
    keys = Object.entries(catalog.tools)
      .filter(([, t]) => t.context === 'workforce-monitoring')
      .map(([k]) => k);
  }

  if (keys.length === 0) {
    await writeAsync(process.stderr, `
No tools specified. Use --help, or:
  vanish third-party-ai --zoom --otter
  vanish third-party-ai --context workplace
  vanish third-party-ai --all
  vanish third-party-ai --detect-installed        (workforce-monitoring scan)
`);
    process.exit(1);
  }

  // ─── Detection (workforce-monitoring only) ───────────────────
  let detectionResults = null;
  if (detectRequested) {
    detectionResults = detectInstalled(keys, catalog);
    const hits = detectionResults.filter(r => r.hasAny);
    const probed = detectionResults.filter(r => r.probedCount > 0);
    await writeAsync(process.stdout, `\n━━━ Local detection (best-effort) ━━━\n`);
    await writeAsync(process.stdout, `Platform: ${process.platform}\n`);
    await writeAsync(process.stdout, `Probed: ${probed.length} tools with documented install paths on this OS\n`);
    await writeAsync(process.stdout, `Found installed: ${hits.length} tool(s)\n\n`);
    for (const r of detectionResults) {
      if (r.probedCount === 0) {
        await writeAsync(process.stdout, `  —  ${r.displayName.padEnd(40)} (no install-paths catalogued for ${process.platform}, or generic entry)\n`);
        continue;
      }
      if (r.hasAny) {
        await writeAsync(process.stdout, `  ✓  ${r.displayName.padEnd(40)} INSTALLED (${r.found.length}/${r.probedCount} paths matched)\n`);
        for (const f of r.found) {
          await writeAsync(process.stdout, `       ${f.path}${f.bytes > 0 ? ` [${f.isDirectory ? 'dir' : 'file'}]` : ''}\n`);
        }
      } else {
        await writeAsync(process.stdout, `  ·  ${r.displayName.padEnd(40)} not detected (probed ${r.probedCount} path${r.probedCount > 1 ? 's' : ''})\n`);
      }
    }
    await writeAsync(process.stdout,
      `\n⚠️  Best-effort only: stealth installs or custom-branded deployments\n`
      + `   may sit at non-default paths. A negative result does NOT prove\n`
      + `   you aren't being monitored — only a positive result is evidence.\n`
    );

    // If the user ONLY asked for detection (no other output flags AND no
    // jurisdiction AND no context), print summary and exit.
    const letterRequested = args.jurisdiction || args.context || args.output || args.json
      || args.company || args.employer;
    if (!letterRequested) {
      process.exit(0);
    }
  }

  const plan = planObjections(keys, catalog, args, detectionResults);
  if (plan.length === 0) {
    await writeAsync(process.stderr, `No objection templates apply to the selected tools.\n`);
    process.exit(1);
  }

  if (args.json) {
    const output = {
      generatedAt: new Date().toISOString(),
      jurisdiction: args.jurisdiction || 'default',
      plan
    };
    await writeAsync(process.stdout, JSON.stringify(output, null, 2) + '\n');
    process.exit(0);
  }

  // Assemble full output
  const allText = [];
  allText.push(`# Third-Party AI Objection Letters`);
  allText.push(``);
  allText.push(`Generated: ${new Date().toISOString()}`);
  allText.push(`Jurisdiction: ${args.jurisdiction || 'default (no specific law cited)'}`);
  allText.push(``);
  allText.push(`This file contains objection letter templates you can adapt + send.`);
  allText.push(`Replace bracketed placeholders like [your name] before sending.`);
  allText.push(``);

  for (const entry of plan) {
    allText.push('---');
    allText.push(``);
    allText.push(`## Context: ${entry.context}`);
    allText.push(``);
    allText.push(`Tools covered in this letter:`);
    for (const t of entry.tools) {
      allText.push(`  - **${t.displayName}** (${t.vendor})`);
      if (t.notes) allText.push(`    _${t.notes}_`);
    }
    allText.push(``);
    allText.push('### Letter template:');
    allText.push('```');
    allText.push(entry.letter);
    allText.push('```');
    allText.push(``);
  }

  const fullText = allText.join('\n');

  if (args.output) {
    const outPath = path.resolve(args.output);
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    fs.writeFileSync(outPath, fullText);
    await writeAsync(process.stdout, `Wrote ${plan.length} letter(s) to: ${outPath}\n`);
  } else {
    await writeAsync(process.stdout, fullText + '\n');
  }

  await writeAsync(process.stdout, `\n━━━ Summary ━━━\n`);
  await writeAsync(process.stdout, `Tools covered: ${keys.length}\n`);
  await writeAsync(process.stdout, `Objection letters generated: ${plan.length}\n`);
  await writeAsync(process.stdout, `Jurisdiction clause: ${args.jurisdiction || 'default (generic privacy)'}\n`);

  process.exit(0);
}

main().catch(err => {
  process.stderr.write(`\nError: ${err.message}\n`, () => process.exit(1));
});
