#!/usr/bin/env node

// Training dataset membership check — is your content in Common Crawl,
// LAION, The Pile, C4, RedPajama, Dolma, FineWeb?
//
// Active query for Common Crawl (real CDX API). Walkthrough for others.
//
// Usage:
//   vanish dataset-check --url https://your-site.com
//   vanish dataset-check --url https://x.com --common-crawl --c4
//   vanish dataset-check --url https://x.com --all
//   vanish dataset-check --walkthrough-only --all   (no network, just walkthroughs)

import { createRequire } from 'node:module';
import {
  resolveDatasetKeys,
  queryCommonCrawl,
  listCommonCrawlSnapshots,
  planDatasetCheck,
  classifyExposure
} from '../src/dataset-check/dataset-check-engine.mjs';

const require = createRequire(import.meta.url);
const catalog = require('../src/dataset-check/datasets-catalog.json');

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
Training-dataset membership check — is your content in AI training data?

For Common Crawl: runs a REAL query against the CDX Index Server.
For other datasets: walks you through how to check yourself.

Usage:
  vanish dataset-check [flags]

Active-query datasets (real API call):
  --common-crawl       Common Crawl (backbone of GPT/Claude/Llama) — CDX query
  --url <URL>          URL to query in Common Crawl (e.g., your site's home page)

Walkthrough datasets (manual check needed):
  --laion              LAION-5B via Have I Been Trained (images)
  --pile               The Pile (EleutherAI) — Reddit/arXiv/PubMed/etc.
  --c4                 Google's C4 (cleaned Common Crawl)
  --webtext            OpenAI WebText (Reddit-linked pages)
  --redpajama          RedPajama (Llama replication)
  --dolma              Dolma (AI2 / OLMo) — WIMBD search
  --fineweb            FineWeb (HuggingFace filtered CC)

  --use <csv>          --use common-crawl,c4,dolma
  --all                Every dataset
  --walkthrough-only   Skip network calls; print walkthroughs only

Other:
  --snapshots <n>      Common Crawl snapshots to check (default: 5 most recent)
  --json               Machine-readable JSON output
  --help               This message

Examples:
  # Real Common Crawl query + walkthroughs for everything else
  vanish dataset-check --url https://your-blog.com --all

  # Just Common Crawl (fastest, most informative)
  vanish dataset-check --url https://your-blog.com --common-crawl

  # Every walkthrough, no network (for research)
  vanish dataset-check --walkthrough-only --all

Privacy: Vanish only sends the URL you provide to index.commoncrawl.org.
No other data leaves your machine. The CDX API is public and unauthenticated.
`);
    process.exit(0);
  }

  const keys = resolveDatasetKeys(args, catalog);
  if (keys.length === 0) {
    await writeAsync(process.stderr, `
No datasets specified. Use --help, or:
  vanish dataset-check --common-crawl --url https://example.com
  vanish dataset-check --all
`);
    process.exit(1);
  }

  const plan = planDatasetCheck(keys, catalog);
  const results = {
    checkedAt: new Date().toISOString(),
    url: args.url || null,
    datasets: []
  };

  const walkthroughOnly = Boolean(args['walkthrough-only']);

  // For Common Crawl: run actual query if --url provided + not walkthrough-only
  let commonCrawlHits = null;
  if (!walkthroughOnly && keys.includes('common-crawl') && args.url) {
    await writeAsync(process.stdout, `\nQuerying Common Crawl CDX for ${args.url} ...\n`);
    try {
      const snapshots = await listCommonCrawlSnapshots();
      const snapCount = args.snapshots ? Number(args.snapshots) : 5;
      const toQuery = snapshots.slice(0, snapCount);
      commonCrawlHits = await queryCommonCrawl(args.url, { snapshots: toQuery });
    } catch (err) {
      await writeAsync(process.stderr, `Common Crawl query failed: ${err.message}\n`);
    }
  }

  // Build + render per-dataset report
  for (const entry of plan) {
    const out = {
      dataset: entry.displayName,
      usedBy: entry.usedBy,
      automated: entry.automated,
      walkthroughUrl: null,
      walkthroughSteps: [],
      hits: null
    };

    await writeAsync(process.stdout, `\n━━━ ${entry.displayName} ━━━\n`);
    await writeAsync(process.stdout, `Used by: ${entry.usedBy.slice(0, 5).join(', ') || '(none specified)'}\n`);

    if (entry.key === 'common-crawl' && commonCrawlHits) {
      out.hits = commonCrawlHits.hits;
      out.snapshotsChecked = commonCrawlHits.snapshotsChecked;
      const classification = classifyExposure(commonCrawlHits.hits.length, commonCrawlHits.snapshotsChecked);
      await writeAsync(process.stdout,
        `\nCommon Crawl query for: ${args.url}\n`
        + `Snapshots checked: ${commonCrawlHits.snapshotsChecked}\n`
        + `Direct hits: ${commonCrawlHits.hits.length} — ${classification.label}\n`
      );
      if (commonCrawlHits.hits.length > 0) {
        await writeAsync(process.stdout, `\nSample hits:\n`);
        for (const hit of commonCrawlHits.hits.slice(0, 5)) {
          await writeAsync(process.stdout, `  • ${hit.snapshot} (${hit.timestamp}) — ${hit.url}\n`);
        }
      }
      if (commonCrawlHits.errors.length > 0) {
        await writeAsync(process.stdout, `\nErrors for ${commonCrawlHits.errors.length} snapshot(s) — may be rate-limiting.\n`);
      }
    } else if (entry.key === 'common-crawl' && !args.url) {
      await writeAsync(process.stdout, `\n(Pass --url <URL> to run a real Common Crawl query)\n`);
    }

    if (entry.checkWalkthrough) {
      out.walkthroughSteps = entry.checkWalkthrough.steps;
      await writeAsync(process.stdout, `\nHow to check manually:\n`);
      for (let i = 0; i < entry.checkWalkthrough.steps.length; i++) {
        await writeAsync(process.stdout, `  ${i + 1}. ${entry.checkWalkthrough.steps[i]}\n`);
      }
      if (entry.checkWalkthrough.verification) {
        await writeAsync(process.stdout, `\n✓ Result format: ${entry.checkWalkthrough.verification}\n`);
      }
    }

    if (entry.optOutWalkthrough) {
      await writeAsync(process.stdout, `\nOpt-out steps:\n`);
      for (let i = 0; i < entry.optOutWalkthrough.steps.length; i++) {
        await writeAsync(process.stdout, `  ${i + 1}. ${entry.optOutWalkthrough.steps[i]}\n`);
      }
      if (entry.optOutWalkthrough.caveat) {
        await writeAsync(process.stdout, `\n⚠️  Caveat: ${entry.optOutWalkthrough.caveat}\n`);
      }
    } else {
      await writeAsync(process.stdout, `\n(No opt-out mechanism for this dataset — it's archival.)\n`);
    }

    if (entry.notes) {
      await writeAsync(process.stdout, `\nNotes: ${entry.notes}\n`);
    }

    results.datasets.push(out);
  }

  if (args.json) {
    await writeAsync(process.stdout, '\n' + JSON.stringify(results, null, 2) + '\n');
  }

  await writeAsync(process.stdout, `\n━━━ Summary ━━━\n`);
  await writeAsync(process.stdout, `Datasets examined: ${plan.length}\n`);
  if (commonCrawlHits) {
    await writeAsync(process.stdout, `Common Crawl direct hits for ${args.url}: ${commonCrawlHits.hits.length}\n`);
  }

  process.exit(0);
}

main().catch(err => {
  process.stderr.write(`\nError: ${err.message}\n`, () => process.exit(1));
});
