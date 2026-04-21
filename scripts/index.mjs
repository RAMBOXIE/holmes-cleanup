#!/usr/bin/env node

// Vanish unified CLI router.
// Usage:
//   vanish <subcommand> [args...]
//   npx github:RAMBOXIE/vanish <subcommand> [args...]
//   npx vanish <subcommand> [args...]  (after npm publish)
//
// Subcommands:
//   scan       Run the privacy scan across 210 data brokers
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
  scan:                'scan-demo.mjs',
  'ai-scan':           'ai-scan.mjs',
  'face-scan':         'face-scan.mjs',
  'llm-memory-check':  'llm-memory-check.mjs',
  'opt-out':           'opt-out.mjs',
  'ai-opt-out':        'ai-opt-out.mjs',
  'face-opt-out':      'face-opt-out.mjs',
  'clean-ai-history':  'clean-ai-history.mjs',
  verify:              'verify.mjs',
  cleanup:             'vanish.mjs',
  wizard:              'wizard-demo.mjs',
  'b1-live':           'b1-live.mjs',
  'b1-demo':           'b1-demo.mjs',
  queue:               'queue-cli.mjs',
  report:              'generate-proof-report.mjs',
  dashboard:           'build-dashboard-data.mjs',
  'dashboard:watch':   'dashboard-watch.mjs'
};

const HELP = `
Vanish — privacy scanner + opt-out orchestrator for 210 data brokers

Usage:
  vanish <command> [options]

Commands:
  scan        Scan 210 brokers for your privacy exposure (0-100 score)
              Example: vanish scan --name "John Doe" --email "j@x.com"

  ai-scan     Check which LLM companies train on your data (30 platforms)
              Example: vanish ai-scan --linkedin --twitter --chatgpt

  ai-opt-out  Browser-assisted AI training opt-out (26 platforms with walkthroughs)
              Example: vanish ai-opt-out --chatgpt --linkedin --cursor

  face-scan   Check if your face appears on PimEyes, FaceCheck, FindClone, etc. (7 services)
              Example: vanish face-scan --pimeyes --facecheck --findclone

  face-opt-out  Request removal from face-search services + Clearview AI (8 services)
              Example: vanish face-opt-out --pimeyes --clearview

  llm-memory-check  Test whether GPT-4/Claude/Gemini memorized your personal info
              Example: vanish llm-memory-check --name "Your Name" --email "you@ex.com"

  clean-ai-history  Discover where AI tools store your history + exact delete commands
              Example: vanish clean-ai-history --cursor --chatgpt --claude

  opt-out     Browser-assisted opt-out for 58 supported brokers
              Example: vanish opt-out --broker spokeo --email you@example.com

  verify      Check if past opt-out submissions actually removed your data
              Example: vanish verify          (check entries past recheckAt)
                       vanish verify --all    (check everything)

  cleanup     Run the opt-out submission workflow (dry-run by default)
              Example: vanish cleanup --manual --preset spokeo \\
                       --confirm1 YES --confirm2 YES --confirm3 YES \\
                       --export-before-delete ask --export-answer no

  wizard      Full interactive wizard (scan → review → cleanup)
              Example: vanish wizard

  b1-live     Submit live opt-out requests to configured endpoints
              Example: vanish b1-live run --live --brokers spokeo,peekyou

  queue       Manage retry / manual-review / dead-letter queues
              Example: vanish queue list

  report      Generate a Markdown proof report from execution JSON
              Example: vanish report ./path/to/result.json

  dashboard   Build dashboard JSON from persisted queue state
              Example: vanish dashboard data/queue-state.json

  help        Show this help

Quick start:
  vanish scan --name "Your Name" --email "you@example.com"

Docs: https://github.com/RAMBOXIE/vanish
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
