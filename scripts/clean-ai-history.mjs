#!/usr/bin/env node

// AI history discovery + deletion guide.
//
// Vanish does NOT auto-delete your files. For each AI tool you specify, we:
//   1. Find the cache/history paths for your OS
//   2. Check what actually exists + approximate size
//   3. Print the EXACT command you should run to delete
//   4. For web-UI tools: open the settings page + print walkthrough
//   5. Record HMAC-signed audit trail when you confirm you ran the delete
//
// This is intentional: auto-deletion of IDE/app data can destroy work.
// Copy-paste from terminal into your own shell is safer.
//
// Usage:
//   vanish clean-ai-history --cursor --claude-desktop         (local)
//   vanish clean-ai-history --chatgpt --claude --gemini       (web)
//   vanish clean-ai-history --all                              (everything)
//   vanish clean-ai-history --all --local-only                (only local paths)
//   vanish clean-ai-history --all --web-only                  (only web walkthroughs)

import path from 'node:path';
import readline from 'node:readline/promises';
import { stdin, stdout } from 'node:process';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import crypto from 'node:crypto';

import { QueueStateStore } from '../src/queue/state-store.mjs';
import { signAuditEvents } from '../src/audit/signature.mjs';
import {
  resolveToolKeys,
  planToolCleanup,
  formatBytes
} from '../src/ai-history/history-engine.mjs';

const require = createRequire(import.meta.url);
const catalog = require('../src/ai-history/history-catalog.json');

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

async function runToolCleanup(key, plan, opts) {
  await writeAsync(process.stdout,
    `\n━━━ ${plan.displayName} (${key}) ━━━\n`
    + `Category: ${plan.category}\n`
  );

  if (plan.category === 'local-app') {
    if (plan.existingPaths.length === 0) {
      await writeAsync(process.stdout, `Could not check paths — this tool may not be installed.\n`);
      return { skipped: true, key };
    }

    const existing = plan.existingPaths.filter(p => p.exists);
    const missing = plan.existingPaths.filter(p => !p.exists);

    if (existing.length === 0) {
      await writeAsync(process.stdout,
        `No cache found on this machine (${missing.length} paths checked, all missing).\n`
        + `Likely: ${plan.displayName} not installed, or caches already clean.\n`
      );
      return { skipped: true, key, reason: 'no-cache' };
    }

    await writeAsync(process.stdout,
      `Total local cache: ${formatBytes(plan.totalBytes)} across ${existing.length} path(s)\n\n`
    );

    for (const entry of plan.existingPaths) {
      const marker = entry.exists ? '✓' : '—';
      const suffix = entry.exists
        ? ` (${formatBytes(entry.bytes)}${entry.isDirectory ? `, ${entry.items} items` : ''})`
        : ' (not present)';
      await writeAsync(process.stdout, `  ${marker} ${entry.path}${suffix}\n`);
    }

    if (plan.preCheck && plan.preCheck.length > 0) {
      await writeAsync(process.stdout, `\nBefore deleting:\n`);
      for (const check of plan.preCheck) {
        await writeAsync(process.stdout, `  • ${check}\n`);
      }
    }

    if (plan.deleteCommand) {
      await writeAsync(process.stdout,
        `\nDeletion command for your OS (copy-paste into your shell):\n`
        + `\n  ${plan.deleteCommand}\n\n`
      );
    } else {
      await writeAsync(process.stdout, `\n(No pre-baked command for this OS — delete the paths above manually.)\n\n`);
    }

    if (plan.notes) {
      await writeAsync(process.stdout, `Notes: ${plan.notes}\n\n`);
    }

    if (opts.noOpen) return { key, recorded: [] }; // test mode — no user prompt

    const answer = await opts.promptLine(`Did you run the command? [y = yes, s = skip, a = abort]: `);
    if (answer.toLowerCase().startsWith('a')) throw new Error('User aborted');
    if (answer.toLowerCase().startsWith('s')) return { skipped: true, key };
    if (!answer.toLowerCase().startsWith('y')) return { skipped: true, key };

    const now = new Date();
    return {
      key,
      recorded: [{
        id: `ai_history_${now.getTime()}_${crypto.randomBytes(3).toString('hex')}`,
        kind: 'ai-history-local',
        tool: key,
        displayName: plan.displayName,
        bytesReported: plan.totalBytes,
        pathCount: existing.length,
        deletedAt: now.toISOString()
      }]
    };
  }

  // web-ui category
  if (plan.url) {
    await writeAsync(process.stdout, `URL: ${plan.url}\n`);
    if (!opts.noOpen) {
      openUrl(plan.url);
    }
  }

  if (plan.walkthrough && plan.walkthrough.length > 0) {
    await writeAsync(process.stdout, `\nSteps:\n`);
    for (let i = 0; i < plan.walkthrough.length; i++) {
      await writeAsync(process.stdout, `  ${i + 1}. ${plan.walkthrough[i]}\n`);
    }
  }

  if (plan.verification) {
    await writeAsync(process.stdout, `\n✓ Success looks like: ${plan.verification}\n`);
  }

  if (plan.notes) {
    await writeAsync(process.stdout, `\nNotes: ${plan.notes}\n`);
  }

  if (opts.noOpen) return { key, recorded: [] };

  const answer = await opts.promptLine(`\nDid you complete the deletion? [y = yes, s = skip, a = abort]: `);
  if (answer.toLowerCase().startsWith('a')) throw new Error('User aborted');
  if (answer.toLowerCase().startsWith('s')) return { skipped: true, key };
  if (!answer.toLowerCase().startsWith('y')) return { skipped: true, key };

  const now = new Date();
  return {
    key,
    recorded: [{
      id: `ai_history_${now.getTime()}_${crypto.randomBytes(3).toString('hex')}`,
      kind: 'ai-history-web',
      tool: key,
      displayName: plan.displayName,
      deletedAt: now.toISOString()
    }]
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (args.help || args.h) {
    await writeAsync(process.stdout, `
Discover where your AI tools store conversation history and get the
exact commands to delete it. Vanish NEVER auto-deletes your files — you
copy-paste commands into your own shell. Audit trail recorded on confirm.

Usage:
  vanish clean-ai-history [flags]

Local apps (caches on your disk):
  --cursor              Cursor IDE
  --vscode-copilot      VS Code + GitHub Copilot cache
  --claude-desktop      Claude Desktop app
  --chatgpt-desktop     ChatGPT Desktop app

Web services (settings walkthrough):
  --chatgpt             ChatGPT web — delete conversations/account
  --claude              Claude web
  --gemini              Google Gemini / Activity
  --perplexity          Perplexity
  --grammarly           Grammarly document history

  --use <csv>           CSV alt: --use cursor,chatgpt,claude
  --all                 Every tool
  --local-only          Only local-app tools (skip web UI)
  --web-only            Only web-UI tools (skip local)

Other:
  --no-open             Test mode — no browser, no prompts
  --state-file <path>   Queue state file (default: data/queue-state.json)
  --help                This message

Examples:
  # Common dev cleanup
  vanish clean-ai-history --cursor --vscode-copilot --chatgpt

  # Full wipe audit
  vanish clean-ai-history --all

  # Just check what's on disk, don't do anything destructive
  vanish clean-ai-history --all --local-only --no-open

Philosophy: Vanish prints WHERE your AI history lives and the EXACT
command to delete it on your OS. It does not run rm for you. This avoids
accidentally wiping important data and keeps you in control.
`);
    process.exit(0);
  }

  const keys = resolveToolKeys(args, catalog);

  if (keys.length === 0) {
    await writeAsync(process.stderr, `
No tools specified. Use --help, or:
  vanish clean-ai-history --cursor --chatgpt
  vanish clean-ai-history --use cursor,chatgpt
  vanish clean-ai-history --all
`);
    process.exit(1);
  }

  const noOpen = Boolean(args['no-open']);
  const rl = noOpen ? null : readline.createInterface({ input: stdin, output: stdout });
  const opts = {
    noOpen,
    promptLine: async (q) => noOpen ? '' : (await rl.question(q)).trim()
  };

  await writeAsync(process.stdout,
    `\nAI history cleanup: ${keys.length} tool(s)\n`
    + `Platform: ${process.platform}\n`
    + `Mode: ${noOpen ? 'no-open (test)' : 'interactive'}\n`
  );

  const allRecorded = [];
  const allSkipped = [];

  try {
    for (const key of keys) {
      const tool = catalog.tools[key];
      if (!tool) continue;
      const plan = planToolCleanup(tool);
      try {
        const result = await runToolCleanup(key, plan, opts);
        if (result.recorded && result.recorded.length > 0) {
          allRecorded.push(...result.recorded);
        } else if (result.skipped) {
          allSkipped.push({ key, reason: result.reason });
        }
      } catch (err) {
        if (err.message === 'User aborted') throw err;
        await writeAsync(process.stderr, `\n✗ ${key} failed: ${err.message}\n`);
      }
    }
  } finally {
    if (rl) rl.close();
  }

  if (allRecorded.length > 0) {
    const store = new QueueStateStore({
      filePath: path.resolve(args['state-file'] || 'data/queue-state.json')
    });
    await store.mutate(state => {
      state.followUp = state.followUp || [];
      // History deletions don't need recheck — they're one-and-done.
      // But we log them in the audit trail.
      const auditEvents = allRecorded.map(entry => ({
        at: entry.deletedAt,
        event: 'ai_history_deleted_by_user',
        tool: entry.tool,
        kind: entry.kind,
        entryId: entry.id,
        bytesReported: entry.bytesReported || 0,
        userConfirmed: true
      }));
      state.audit = signAuditEvents([...(state.audit || []), ...auditEvents]);
      return state;
    });
  }

  await writeAsync(process.stdout, `\n━━━ Summary ━━━\n`);
  await writeAsync(process.stdout, `Deletions confirmed: ${allRecorded.length}\n`);
  if (allSkipped.length > 0) {
    const noCache = allSkipped.filter(s => s.reason === 'no-cache').length;
    await writeAsync(process.stdout, `Skipped: ${allSkipped.length}${noCache > 0 ? ` (${noCache} with no cache found)` : ''}\n`);
  }
  const totalBytes = allRecorded.reduce((sum, e) => sum + (e.bytesReported || 0), 0);
  if (totalBytes > 0) {
    await writeAsync(process.stdout, `Local disk reclaimed (estimated): ${formatBytes(totalBytes)}\n`);
  }
  if (allRecorded.length > 0) {
    await writeAsync(process.stdout, `Audit trail updated with ${allRecorded.length} entries.\n`);
  }

  process.exit(0);
}

main().catch(err => {
  process.stderr.write(`\nError: ${err.message}\n`, () => process.exit(1));
});
