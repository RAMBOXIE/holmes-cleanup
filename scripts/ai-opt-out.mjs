#!/usr/bin/env node

// Browser-assisted AI training opt-out.
//
// For platforms in the AI catalog that have a defined walkthrough, this:
//   1. Opens the opt-out URL in your browser
//   2. Prints the exact steps + the target setting name
//   3. Optionally copies the target setting name to your clipboard (--clipboard)
//   4. Waits for confirmation that you've toggled it off
//   5. Records an HMAC-signed audit trail + 60-day follow-up to re-verify
//
// Usage:
//   vanish ai-opt-out --chatgpt
//   vanish ai-opt-out --linkedin --twitter --cursor        (batch)
//   vanish ai-opt-out --use chatgpt,linkedin,cursor         (alt: csv)
//   vanish ai-opt-out --all                                 (all exposed ones)
//   vanish ai-opt-out --chatgpt --no-open                   (test mode)

import path from 'node:path';
import readline from 'node:readline/promises';
import { stdin, stdout } from 'node:process';
import { spawn, spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import crypto from 'node:crypto';

import { QueueStateStore } from '../src/queue/state-store.mjs';
import { signAuditEvents } from '../src/audit/signature.mjs';

const require = createRequire(import.meta.url);
const catalog = require('../src/ai-scanner/ai-platforms-catalog.json');

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
  const platform = process.platform;
  const cmd = platform === 'win32' ? 'cmd'
            : platform === 'darwin' ? 'open'
            : 'xdg-open';
  const args = platform === 'win32' ? ['/c', 'start', '""', url]
            : [url];
  try {
    spawn(cmd, args, { stdio: 'ignore', detached: true }).unref();
    return true;
  } catch (err) {
    process.stderr.write(`Failed to open ${url}: ${err.message}\n`);
    return false;
  }
}

function copyToClipboard(text) {
  const platform = process.platform;
  try {
    if (platform === 'win32') {
      spawnSync('cmd', ['/c', `echo | set /p _=${text.replace(/"/g, '""')} | clip`], { shell: true });
    } else if (platform === 'darwin') {
      const proc = spawnSync('pbcopy', [], { input: text });
      if (proc.error) throw proc.error;
    } else {
      // Linux — try xclip first, fall back to xsel
      const xclip = spawnSync('xclip', ['-selection', 'clipboard'], { input: text });
      if (xclip.error || xclip.status !== 0) {
        const xsel = spawnSync('xsel', ['--clipboard', '--input'], { input: text });
        if (xsel.error || xsel.status !== 0) return false;
      }
    }
    return true;
  } catch {
    return false;
  }
}

// Resolve user-given flag (e.g., "chatgpt") to catalog platform key (e.g., "openai-chatgpt")
function resolvePlatformKeys(flags) {
  const keys = [];
  const entries = Object.entries(catalog.platforms);

  // --all covers everything with a walkthrough (skips safe ones)
  if (flags.all) {
    for (const [key, p] of entries) {
      if (p.walkthrough) keys.push(key);
    }
    return keys;
  }

  // --use "chatgpt,linkedin,cursor"
  if (flags.use) {
    const tokens = String(flags.use).split(',').map(s => s.trim()).filter(Boolean);
    for (const token of tokens) {
      const found = entries.find(([k, p]) => k === token || p.signalAsked === token);
      if (!found) {
        process.stderr.write(`Warning: unknown platform "${token}" — skipping\n`);
        continue;
      }
      keys.push(found[0]);
    }
  }

  // Individual flags: --chatgpt, --linkedin, etc.
  for (const [key, p] of entries) {
    if (flags[key] || flags[p.signalAsked]) {
      if (!keys.includes(key)) keys.push(key);
    }
  }

  return keys;
}

async function runAiOptOut(platformKey, opts) {
  const platform = catalog.platforms[platformKey];
  if (!platform) throw new Error(`Unknown platform: ${platformKey}`);

  const { walkthrough, displayName, optOutUrl, defaultConsent, optOutDifficulty, estimatedSeconds } = platform;

  // No walkthrough = already safe (Claude, Notion, Medium, ArtStation, Zoom, M365)
  if (!walkthrough) {
    await writeAsync(process.stdout,
      `\n━━━ ${displayName} (${platformKey}) ━━━\n`
      + `Status: ✅ ${defaultConsent} by default — no opt-out needed.\n`
      + `${platform.notes || ''}\n`
    );
    return { skipped: true, platform: platformKey, reason: 'already-safe' };
  }

  await writeAsync(process.stdout,
    `\n━━━ ${displayName} (${platformKey}) ━━━\n`
    + `Default consent: ${defaultConsent} | Difficulty: ${optOutDifficulty} | Est. ${estimatedSeconds}s\n`
    + `Opt-out page: ${optOutUrl || '(no direct URL — see steps)'}\n\n`
  );

  if (walkthrough.targetSetting) {
    await writeAsync(process.stdout, `🎯 Look for this exact setting: ${JSON.stringify(walkthrough.targetSetting)}\n\n`);
  }

  // 1. Open browser
  if (!opts.noOpen && optOutUrl) {
    await writeAsync(process.stdout, `Opening: ${optOutUrl}\n`);
    openUrl(optOutUrl);
  }

  // 2. Optionally copy target setting to clipboard
  if (opts.clipboard && walkthrough.targetSetting && !opts.noOpen) {
    const copied = copyToClipboard(walkthrough.targetSetting);
    if (copied) {
      await writeAsync(process.stdout, `📋 Copied setting name to clipboard — paste into Ctrl/Cmd+F on the page\n`);
    }
  }

  // 3. Print steps
  await writeAsync(process.stdout, `\nSteps:\n`);
  for (let i = 0; i < walkthrough.steps.length; i++) {
    await writeAsync(process.stdout, `  ${i + 1}. ${walkthrough.steps[i]}\n`);
  }

  if (walkthrough.verification) {
    await writeAsync(process.stdout, `\n✓ Success looks like: ${walkthrough.verification}\n`);
  }

  if (walkthrough.tierOverrides) {
    await writeAsync(process.stdout, `\n💡 Tier note: ${walkthrough.tierOverrides}\n`);
  }

  // 4. Wait for confirmation
  let confirmed = false;
  if (opts.noOpen) {
    confirmed = true;
  } else {
    const answer = await opts.promptLine(`\nDid you complete the opt-out? [y = yes, s = skip, a = abort]: `);
    if (answer.toLowerCase().startsWith('a')) throw new Error('User aborted');
    if (answer.toLowerCase().startsWith('s')) {
      await writeAsync(process.stdout, `Skipped.\n`);
      return { skipped: true, platform: platformKey, reason: 'user-skipped' };
    }
    confirmed = answer.toLowerCase().startsWith('y');
  }

  if (!confirmed) {
    return { skipped: true, platform: platformKey, reason: 'not-confirmed' };
  }

  // 5. Record follow-up entry
  const now = new Date();
  // Re-verify in 60 days — AI platform settings sometimes silently reset after policy updates
  const recheckAt = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000);
  const entry = {
    id: `ai_followup_${now.getTime()}_${crypto.randomBytes(3).toString('hex')}`,
    kind: 'ai-platform',
    platform: platformKey,
    displayName,
    optOutMethod: platform.optOutMethod,
    submittedAt: now.toISOString(),
    recheckAt: recheckAt.toISOString(),
    status: 'pending-reverification'
  };

  await writeAsync(process.stdout, `✓ Recorded. Re-verify scheduled for ${recheckAt.toISOString().slice(0, 10)}.\n`);
  return { platform: platformKey, recorded: [entry] };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (args.help || args.h) {
    await writeAsync(process.stdout, `
Browser-assisted AI training opt-out for 26 platforms.

Usage:
  vanish ai-opt-out [flags]

Quick flags (pick platforms to opt out of):
  --chatgpt          OpenAI ChatGPT (Data controls → Improve the model for everyone → OFF)
  --gemini           Google Gemini (myactivity.google.com → Gemini Apps Activity → OFF)
  --copilot          Microsoft Copilot (account.microsoft.com → Model training on text → OFF)
  --perplexity       Perplexity AI (Settings → AI Data Retention → OFF)
  --meta             Meta AI (objection form — 30-90 day processing)

  --linkedin         LinkedIn (Data for Generative AI Improvement → OFF)
  --twitter          Twitter/X (Grok toggle → OFF)
  --reddit           Reddit (DPO email request — 30-45 day processing)
  --tumblr           Tumblr (per-blog: Prevent third-party sharing → ON)
  --quora            Quora (Privacy → LLM training → OFF)
  --pinterest        Pinterest (Privacy → use data for AI → OFF)
  --facebook         Facebook/Instagram posts (Meta objection form)
  --stackoverflow    Stack Overflow (GDPR/CCPA email)

  --grammarly        Grammarly (Product Improvement toggle → OFF)
  --otter            Otter AI (Privacy → speech recognition → OFF)
  --slack            Slack (admin-only email request)

  --gmail            Gmail (myaccount.google.com → Smart features → OFF)

  --copilot-code     GitHub Copilot (settings/copilot → code snippets → OFF)
  --cursor           Cursor (Privacy Mode → ON)

  --adobe            Adobe Creative Cloud (Content Analysis → OFF)
  --canva            Canva (Privacy → use content for AI → OFF)
  --deviantart       DeviantArt (Protect from AI scrapers → ON)
  --shutterstock     Shutterstock (contributor email — loses royalty)
  --figma            Figma (AI features → content training → OFF)

Alt input:
  --use <csv>        Comma-separated list: --use chatgpt,linkedin,cursor
  --all              Run through every opt-out-able platform (skips already-safe ones)

Other:
  --clipboard        Copy the target setting name to clipboard (helps with Ctrl+F)
  --no-open          Test mode — don't open browser, auto-confirm (for scripting)
  --state-file <p>   Queue state file (default: data/queue-state.json)
  --help             This message

Examples:
  # Full chat AI audit in one session
  vanish ai-opt-out --chatgpt --gemini --copilot --perplexity

  # Social media AI opt-out
  vanish ai-opt-out --linkedin --twitter --reddit --tumblr

  # Dev tools
  vanish ai-opt-out --copilot-code --cursor

  # Nuclear option
  vanish ai-opt-out --all

Note: This does NOT automate form submission. Captchas, logins, and
the final "click" are your job — Vanish just opens the right page and
tells you exactly what to click. The 60-day re-verify catches cases
where platforms silently reset your settings after policy changes.
`);
    process.exit(0);
  }

  const platformKeys = resolvePlatformKeys(args);
  if (platformKeys.length === 0) {
    await writeAsync(process.stderr, `
No platforms specified. Use --help to see available flags, or:
  vanish ai-opt-out --chatgpt --linkedin
  vanish ai-opt-out --use chatgpt,linkedin,cursor
  vanish ai-opt-out --all
`);
    process.exit(1);
  }

  const noOpen = Boolean(args['no-open']);
  const rl = noOpen ? null : readline.createInterface({ input: stdin, output: stdout });
  const opts = {
    noOpen,
    clipboard: Boolean(args.clipboard),
    promptLine: async (q) => noOpen ? '' : (await rl.question(q)).trim()
  };

  await writeAsync(process.stdout,
    `\nStarting AI training opt-out for ${platformKeys.length} platform(s): ${platformKeys.join(', ')}\n`
    + `Mode: ${noOpen ? 'no-open (test)' : 'interactive'}\n`
  );

  const allRecorded = [];
  const allSkipped = [];
  try {
    for (const key of platformKeys) {
      try {
        const result = await runAiOptOut(key, opts);
        if (result.recorded) allRecorded.push(...result.recorded);
        if (result.skipped) allSkipped.push({ platform: key, reason: result.reason });
      } catch (err) {
        if (err.message === 'User aborted') throw err;
        await writeAsync(process.stderr, `\n✗ ${key} failed: ${err.message}\n`);
      }
    }
  } finally {
    if (rl) rl.close();
  }

  // Persist audit + followUp
  if (allRecorded.length > 0) {
    const store = new QueueStateStore({
      filePath: path.resolve(args['state-file'] || 'data/queue-state.json')
    });
    await store.mutate(state => {
      state.followUp = state.followUp || [];
      state.followUp.push(...allRecorded);
      const auditEvents = allRecorded.map(entry => ({
        at: entry.submittedAt,
        event: 'ai_opt_out_submitted_by_user',
        platform: entry.platform,
        method: entry.optOutMethod,
        followUpId: entry.id,
        userConfirmed: true
      }));
      state.audit = signAuditEvents([...(state.audit || []), ...auditEvents]);
      return state;
    });
  }

  // Summary
  await writeAsync(process.stdout, `\n━━━ Summary ━━━\n`);
  await writeAsync(process.stdout, `Recorded: ${allRecorded.length} opt-out(s)\n`);
  if (allSkipped.length > 0) {
    const bySafe = allSkipped.filter(s => s.reason === 'already-safe').length;
    const byUser = allSkipped.filter(s => s.reason !== 'already-safe').length;
    await writeAsync(process.stdout, `Skipped: ${allSkipped.length} (${bySafe} already safe, ${byUser} by you)\n`);
  }
  if (allRecorded.length > 0) {
    await writeAsync(process.stdout,
      `Re-verify scheduled: ${allRecorded.map(e => `${e.platform}@${e.recheckAt.slice(0, 10)}`).join(', ')}\n`
      + `\nRun \`vanish queue list\` to see the follow-up queue.\n`
    );
  }

  process.exit(0);
}

main().catch(err => {
  process.stderr.write(`\nError: ${err.message}\n`, () => process.exit(1));
});
