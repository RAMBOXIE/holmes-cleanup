#!/usr/bin/env node

// Holmes-Cleanup unified CLI router.
// Usage:
//   holmes-cleanup <subcommand> [args...]
//   npx github:RAMBOXIE/holmes-cleanup <subcommand> [args...]
//   npx holmes-cleanup <subcommand> [args...]  (after npm publish)
//
// Subcommands:
//   scan       Run the privacy scan across 200 data brokers
//   cleanup    Run the opt-out wizard / dry-run submission
//   wizard     Interactive conversation wizard (scan + cleanup)
//   b1-live    Live HTTP submission against configured endpoints
//   queue      Queue CLI (list / retry / resolve)
//   report     Generate a Markdown proof report
//   dashboard  Build dashboard data from queue state
//   help       Show this help (default when no subcommand given)

import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const SUBCOMMANDS = {
  scan:       'scan-demo.mjs',
  cleanup:    'holmes-cleanup.mjs',
  wizard:     'wizard-demo.mjs',
  'b1-live':  'b1-live.mjs',
  'b1-demo':  'b1-demo.mjs',
  queue:      'queue-cli.mjs',
  report:     'generate-proof-report.mjs',
  dashboard:  'build-dashboard-data.mjs',
  'dashboard:watch': 'dashboard-watch.mjs'
};

const HELP = `
Holmes-Cleanup — privacy scanner + opt-out orchestrator for 200 data brokers

Usage:
  holmes-cleanup <command> [options]

Commands:
  scan        Scan 200 brokers for your privacy exposure (0-100 score)
              Example: holmes-cleanup scan --name "John Doe" --email "j@x.com"

  cleanup     Run the opt-out submission workflow (dry-run by default)
              Example: holmes-cleanup cleanup --manual --preset spokeo \\
                       --confirm1 YES --confirm2 YES --confirm3 YES \\
                       --export-before-delete ask --export-answer no

  wizard      Full interactive wizard (scan → review → cleanup)
              Example: holmes-cleanup wizard

  b1-live     Submit live opt-out requests to configured endpoints
              Example: holmes-cleanup b1-live run --live --brokers spokeo,peekyou

  queue       Manage retry / manual-review / dead-letter queues
              Example: holmes-cleanup queue list

  report      Generate a Markdown proof report from execution JSON
              Example: holmes-cleanup report ./path/to/result.json

  dashboard   Build dashboard JSON from persisted queue state
              Example: holmes-cleanup dashboard data/queue-state.json

  help        Show this help

Quick start:
  holmes-cleanup scan --name "Your Name" --email "you@example.com"

Docs: https://github.com/RAMBOXIE/holmes-cleanup
`;

async function main() {
  const [subcommand, ...rest] = process.argv.slice(2);

  if (!subcommand || subcommand === 'help' || subcommand === '--help' || subcommand === '-h') {
    process.stdout.write(HELP);
    process.exit(0);
  }

  const script = SUBCOMMANDS[subcommand];
  if (!script) {
    process.stderr.write(`Unknown command: ${subcommand}\n`);
    process.stderr.write(HELP);
    process.exit(1);
  }

  const scriptPath = path.join(__dirname, script);
  const child = spawn(process.execPath, [scriptPath, ...rest], {
    stdio: 'inherit',
    env: process.env
  });

  child.on('exit', (code) => {
    process.exit(code ?? 0);
  });

  child.on('error', (err) => {
    process.stderr.write(`Failed to run ${subcommand}: ${err.message}\n`);
    process.exit(1);
  });
}

main();
