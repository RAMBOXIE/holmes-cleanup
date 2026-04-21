#!/usr/bin/env node

// LLM memorization check — probes major LLMs for whether they leak your
// personal identifiers when asked doxxing-style questions.
//
// Requires API keys via env vars:
//   OPENAI_API_KEY      — OpenAI
//   ANTHROPIC_API_KEY   — Anthropic Claude
//
// Usage:
//   vanish llm-memory-check --name "Your Name"
//   vanish llm-memory-check --name "Your Name" --email you@example.com --phone "+1 555 123 4567"
//   vanish llm-memory-check --name "..." --providers openai,anthropic
//   vanish llm-memory-check --name "..." --dry-run            (no API calls; mock provider)
//   vanish llm-memory-check --name "..." --verbose            (include full responses in report)

import { createRequire } from 'node:module';
import { runMemoryCheck, createProvider, renderMemoryCheckReport } from '../src/llm-memory/memory-check-engine.mjs';

const require = createRequire(import.meta.url);
const probes = require('../src/llm-memory/probe-catalog.json');

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
LLM memorization check — is your personal info in GPT-4 / Claude / etc.?

Vanish sends 15 "stalker-style" probe prompts to each configured LLM and
checks if the response contains verbatim leaks of your email, phone,
address, or workplace. High leak rate = strong signal your data was
scraped into the model's training set.

Usage:
  vanish llm-memory-check --name "Your Name" [identifiers] [flags]

Identity (at minimum --name):
  --name "..."         Your full name (required)
  --email "..."        Your email address
  --phone "..."        Your phone number (any formatting)
  --address "..."      Your street address or key address component
  --city "..."         Your city
  --workplace "..."    Your employer or job title

Providers (at least one, or --dry-run):
  --providers <csv>    Comma-separated list: openai,anthropic (default: all with keys)
  --dry-run            Use mock provider (no API calls, no keys needed)
                       → good for testing CLI, checking catalog, CI

API keys (via env vars, not CLI args):
  OPENAI_API_KEY       OpenAI
  ANTHROPIC_API_KEY    Anthropic Claude

Output:
  --verbose            Include full response excerpts per probe in report
  --json               Emit machine-readable JSON instead of terminal report
  --help               This message

Cost estimate (API):
  ~15 probes × 2 providers ≈ 30 API calls
  GPT-4o-mini: ~\$0.003 total
  Claude 3.5 Haiku: ~\$0.005 total
  Total per check: ~ \$0.01 USD

Examples:
  # Minimum: just name
  vanish llm-memory-check --name "John Doe"

  # Full test with all identifiers
  OPENAI_API_KEY=sk-... ANTHROPIC_API_KEY=sk-ant-... \\
    vanish llm-memory-check --name "John Doe" \\
      --email john@example.com --phone "+1-555-123-4567" \\
      --city "Seattle" --workplace "Acme Corp"

  # No-API smoke test
  vanish llm-memory-check --name "Jane" --dry-run

Note: A zero leak rate does NOT mean you're safe. It only means the probe
prompts we tested with didn't trigger verbatim leaks. Paraphrased recall
and dataset membership are not detected by this test.
`);
    process.exit(0);
  }

  if (!args.name) {
    await writeAsync(process.stderr, `Error: --name is required. Use --help for usage.\n`);
    process.exit(1);
  }

  const identity = {
    name: args.name,
    email: args.email || null,
    phone: args.phone || null,
    address: args.address || null,
    city: args.city || null,
    workplace: args.workplace || null
  };

  // Resolve providers
  const providers = [];
  const dryRun = Boolean(args['dry-run']);

  if (dryRun) {
    providers.push(createProvider('mock'));
  } else {
    const requested = args.providers
      ? String(args.providers).split(',').map(s => s.trim())
      : ['openai', 'anthropic'];

    for (const name of requested) {
      if (name === 'openai') {
        if (!process.env.OPENAI_API_KEY) {
          await writeAsync(process.stderr,
            `Warning: OPENAI_API_KEY not set — skipping OpenAI provider.\n`
            + `  Set it or use --dry-run to skip API calls entirely.\n`
          );
          continue;
        }
        providers.push(createProvider('openai', { apiKey: process.env.OPENAI_API_KEY }));
      } else if (name === 'anthropic') {
        if (!process.env.ANTHROPIC_API_KEY) {
          await writeAsync(process.stderr,
            `Warning: ANTHROPIC_API_KEY not set — skipping Anthropic provider.\n`
            + `  Set it or use --dry-run to skip API calls entirely.\n`
          );
          continue;
        }
        providers.push(createProvider('anthropic', { apiKey: process.env.ANTHROPIC_API_KEY }));
      } else {
        await writeAsync(process.stderr, `Warning: unknown provider "${name}" — skipping.\n`);
      }
    }
  }

  if (providers.length === 0) {
    await writeAsync(process.stderr,
      `Error: No providers configured. Either:\n`
      + `  1. Set OPENAI_API_KEY or ANTHROPIC_API_KEY env vars, or\n`
      + `  2. Use --dry-run for API-free test\n`
    );
    process.exit(1);
  }

  if (!dryRun) {
    await writeAsync(process.stdout,
      `\nRunning ${probes.probes.length} probes against ${providers.length} provider(s)...\n`
      + `This will make real API calls and may take 30-90 seconds.\n\n`
    );
  }

  let result;
  try {
    result = await runMemoryCheck(identity, providers, {
      probes,
      verbose: Boolean(args.verbose)
    });
  } catch (err) {
    await writeAsync(process.stderr, `Error: ${err.message}\n`);
    process.exit(1);
  }

  if (args.json) {
    await writeAsync(process.stdout, JSON.stringify(result, null, 2) + '\n');
    process.exit(0);
  }

  const report = renderMemoryCheckReport(result, { color: !args['no-color'] });
  await writeAsync(process.stdout, report + '\n');

  // If verbose, show per-probe details
  if (args.verbose) {
    await writeAsync(process.stdout, '\n━━━ Verbose: Per-probe detail ━━━\n\n');
    for (const r of result.results) {
      await writeAsync(process.stdout, `\n── ${r.provider} ──\n`);
      for (const p of r.probes) {
        const indicator = p.leaksFound.length > 0 ? '🔴' : '✅';
        await writeAsync(process.stdout, `${indicator} ${p.probeId} (risk: ${p.risk})\n`);
        if (p.leaksFound.length > 0) {
          for (const leak of p.leaksFound) {
            await writeAsync(process.stdout, `   LEAKED ${leak.type}: ${leak.value}\n`);
          }
        }
        await writeAsync(process.stdout, `   Response: ${p.responseExcerpt.replace(/\n/g, ' ')}\n`);
      }
    }
  }

  process.exit(0);
}

main().catch(err => {
  process.stderr.write(`\nError: ${err.message}\n`, () => process.exit(1));
});
