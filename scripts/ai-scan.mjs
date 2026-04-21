#!/usr/bin/env node

// AI training exposure scanner CLI.
//
// Usage:
//   vanish ai-scan --linkedin --twitter --chatgpt
//   vanish ai-scan --use linkedin,twitter,chatgpt,reddit
//   vanish ai-scan --all              (assume you use every platform)
//   vanish ai-scan --no-banner        (quiet output)

import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { runAiScan, buildUsageFromFlags } from '../src/ai-scanner/ai-scan-engine.mjs';
import { renderAiScanReport, renderAiScanBanner } from '../src/ai-scanner/ai-scan-report.mjs';

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

const args = parseArgs(process.argv.slice(2));

if (args.help || args.h) {
  process.stdout.write(`
AI training exposure scan — check which LLM companies have your data.

Usage:
  vanish ai-scan [flags indicating platforms you use]

Quick flags (set true to indicate you use this platform):
  --chatgpt           OpenAI ChatGPT
  --claude            Anthropic Claude
  --gemini            Google Gemini
  --copilot           Microsoft Copilot (chat)
  --meta              Meta AI (Facebook/Instagram)
  --perplexity        Perplexity AI

  --linkedin          LinkedIn
  --reddit            Reddit
  --twitter           Twitter / X (Grok)
  --stackoverflow     Stack Overflow
  --tumblr            Tumblr
  --medium            Medium
  --quora             Quora
  --facebook          Facebook / Instagram
  --pinterest         Pinterest

  --grammarly         Grammarly
  --notion            Notion AI
  --otter             Otter AI
  --zoom              Zoom
  --slack             Slack

  --gmail             Gmail / Google Workspace
  --outlook           Outlook / Microsoft 365

  --copilot-code      GitHub Copilot
  --cursor            Cursor (AI IDE)

  --adobe             Adobe Creative Cloud
  --canva             Canva
  --deviantart        DeviantArt
  --shutterstock      Shutterstock
  --figma             Figma
  --artstation        ArtStation

  --use <csv>         Alt: comma-separated list of platforms
                      (e.g. --use linkedin,twitter,chatgpt)

Other:
  --all               Treat all platforms as used (worst-case overview)
  --no-banner         Hide the summary box
  --no-color          Disable ANSI colors
  --output-md <path>  Write report to file
  --json              Output raw JSON
  --help              This message

Examples:
  # Quick social media check
  vanish ai-scan --linkedin --twitter --reddit

  # Full AI chat + content audit
  vanish ai-scan --chatgpt --gemini --claude --linkedin --twitter

  # See the full landscape
  vanish ai-scan --all

Note: This scan requires NO personal data — we only need to know which
platforms you have accounts on. Nothing is transmitted anywhere.
`);
  process.exit(0);
}

// Build usage map from flags
let usage;
if (args.all) {
  usage = Object.fromEntries(Object.keys(catalog.platforms).map(k => [k, true]));
} else {
  usage = buildUsageFromFlags(args, catalog);
}

const usedCount = Object.values(usage).filter(Boolean).length;
if (usedCount === 0) {
  process.stderr.write(`
No platforms specified. Use --help to see flags, or:
  vanish ai-scan --linkedin --twitter --chatgpt
  vanish ai-scan --use linkedin,twitter,chatgpt
  vanish ai-scan --all
`);
  process.exit(1);
}

const result = runAiScan(usage, { catalog });

// Outputs
if (args['output-md']) {
  const outPath = path.resolve(args['output-md']);
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, renderAiScanReport(result));
  process.stdout.write(`Wrote Markdown report: ${outPath}\n`);
}

if (args.json) {
  process.stdout.write(JSON.stringify(result, null, 2) + '\n');
  process.exit(0);
}

// Default output: banner + markdown report
if (!args['no-banner']) {
  process.stdout.write(renderAiScanBanner(result, { color: !args['no-color'] }) + '\n\n');
}

process.stdout.write(renderAiScanReport(result) + '\n');
