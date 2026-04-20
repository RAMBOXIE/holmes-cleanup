# Contributing to Holmes-Cleanup

Thanks for considering contributing. This is an early-stage open-source privacy tool and we need help across: broker coverage, UX polish, cross-platform testing, and translations.

## Quick Start (Dev)

```bash
git clone https://github.com/RAMBOXIE/holmes-cleanup
cd holmes-cleanup
npm install
npm test        # runs 95 tests
```

No build step. Pure Node.js ESM. Requires Node 20+.

## Most Wanted Contributions

### 1. Add a new broker (easiest, highest impact)

Adding a broker is a single JSON edit. Open `src/adapters/brokers/config/broker-catalog.json` and add an entry:

```json
"newbroker": {
  "displayName": "NewBroker",
  "category": "people-search",
  "jurisdiction": "US",
  "optOutUrl": "https://newbroker.com/optout",
  "optOutMethod": "form",
  "adapterMode": "dry-run",
  "rateLimitPolicy": { "requestsPerMinute": 4, "jitterMsMin": 500, "jitterMsMax": 1500, "backoff": "exponential" },
  "complianceNotes": ["Standard form-based opt-out"],
  "template": { "keywords": "newbroker exposure" },
  "dataTypes": ["name", "address", "phone", "email"]
}
```

For **browser-assisted opt-out support**, also add an `optOutFlow` field (see existing brokers like `spokeo` for a reference). Research the broker's actual flow first — don't guess.

Valid categories: `people-search`, `background-check`, `phone-lookup`, `public-records`, `marketing-data`, `financial`, `location-data`, `email-data`, `social-media`, `reputation`, `identity-resolution`, `property`.

After adding, run `npm test` to verify catalog validates.

### 2. Report a broken broker flow

If a broker changed their opt-out page and our `optOutFlow` is now wrong, please [open an issue](https://github.com/RAMBOXIE/holmes-cleanup/issues/new?template=broker-broken.yml) with:
- Which broker
- What field or URL changed
- Screenshot of the new page

### 3. Cross-platform testing

The project was developed on Windows. macOS and Linux have CI but hand-testing the interactive `opt-out` and `verify` flows on those platforms is valuable. If you hit a bug, file it.

### 4. Translate the scan report

`src/scanner/scan-report.mjs` renders to English. Translations to 中文, 日本語, Español, Deutsch welcome.

## Code Style

- **Pure JS ESM (.mjs)** — no TypeScript, no transpiling
- **Node built-ins only** — no external deps unless critical
- **Prefer editing existing files** over creating new ones
- **Comment only non-obvious logic** — names should do the talking
- Windows-developed: LF line endings enforced via `.gitattributes`

## Testing

- Add a test for any new behavior. We use `node:test` + `node:assert/strict` (no frameworks).
- New test file: `tests/<feature>.test.mjs`. Wire into `package.json` `test` script.
- CI runs on Ubuntu, macOS, Windows × Node 20, Node 22.

## PR Checklist

Before opening a PR:

- [ ] `npm test` passes locally (all 95+ tests green)
- [ ] No new external dependencies without discussion
- [ ] README updated if user-facing behavior changed
- [ ] CHANGELOG.md has an entry under `[Unreleased]`
- [ ] Commit message follows convention: `feat:`, `fix:`, `docs:`, `refactor:`, `test:`

## Architecture

High-level:
- `src/adapters/` — broker catalog + dry-run/live adapter factories
- `src/scanner/` — heuristic privacy scoring (pure functions)
- `src/verifier/` — HTTP liveness checks for follow-up queue
- `src/wizard/` — 18-state conversation engine
- `src/orchestrator/` — b1 pipeline (prepare → submit → parse → queue)
- `src/queue/` — retry / manual-review / dead-letter / follow-up queues
- `src/auth/` — encrypted secret store (scrypt KDF)
- `src/audit/` — HMAC-SHA256 event signing
- `scripts/` — CLI entry points (routed by `scripts/index.mjs`)
- `prompts/wizard/` — state prompt templates

## Safety Boundaries (Do Not Cross)

These aren't style preferences — they're product commitments:

1. **No telemetry.** The tool must never phone home, even for "anonymous analytics"
2. **No paid captcha-solving services.** Keep the MIT/zero-cost promise
3. **Manual trigger only.** No scheduled background jobs
4. **Honest limits.** If something doesn't work, say so — don't silently degrade

## Questions?

Open a [discussion](https://github.com/RAMBOXIE/holmes-cleanup/discussions) before filing a large PR.
