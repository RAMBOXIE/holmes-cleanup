# Changelog

All notable changes to Vanish will be documented here. Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

### Added
- **🧠 LLM Memorization Check** (`src/llm-memory/`, new subcommand `vanish llm-memory-check`):
  - Tests whether major LLMs (GPT-4o-mini, Claude 3.5 Haiku) output your personal identifiers verbatim when probed with 15 stalker-style prompts
  - Each probe is a realistic doxxing query ("What's X's phone number?", "Complete: X's email is..."), targeting email / phone / address / city / workplace leaks
  - Engine (`memory-check-engine.mjs`) ships with `detectLeaks()` that handles phone formatting variants, case-insensitive email matching, and skips too-short tokens that cause false positives
  - Two real providers: OpenAI + Anthropic (bring-your-own-API-key via `OPENAI_API_KEY` / `ANTHROPIC_API_KEY` env vars)
  - `--dry-run` mode uses mock provider so CI and curious users can run without API keys
  - Report shows per-provider leak rate (0-100%) + which leak types triggered + rating (safe/low/moderate/high)
  - `--verbose` flag includes per-probe response excerpts
  - `--json` for machine-readable output
  - Privacy-preserving by design: the report echoes your name (for identification) but NOT your email/phone/address — so the scan result itself doesn't become a leak vector
  - Cost: ~\$0.01/scan in API fees (gpt-4o-mini + claude-3-5-haiku are cheap)
  - This is the FIRST open-source tool to check LLM memorization of arbitrary individuals — research labs do this but don't ship a tool
- 30 new tests (`tests/llm-memory-check.test.mjs`) — probe catalog, renderProbe templating, detectLeaks fuzzy phone matching, provider creation, end-to-end mock runs, CLI integration. Total: 163 → 193

- **🧹 AI History Cleanup Guide** (`src/ai-history/`, new subcommand `vanish clean-ai-history`):
  - Catalog of 9 AI tools with documented cache paths per OS (Windows/macOS/Linux) and web-UI walkthroughs
  - Local-app targets: Cursor, VS Code + GitHub Copilot cache, Claude Desktop, ChatGPT Desktop
  - Web-UI targets: ChatGPT web, Claude web, Google Gemini/Activity, Perplexity, Grammarly
  - **Does NOT auto-delete** (by design) — instead, for each tool:
    - Discovers which cache paths actually exist on your OS
    - Reports approximate size per path
    - Prints the exact PowerShell/bash command you can copy-paste to delete
    - For web-UI tools: opens the settings page + prints 3-5 step walkthrough
  - Records HMAC-signed audit trail on user confirmation of deletion
  - `--local-only` / `--web-only` filters; `--all` for full wipe audit
  - Philosophy: destructive shell commands belong in your shell under your control, not hidden behind a tool. Vanish shows you where to look and exactly what to type.
- 24 new tests (`tests/clean-ai-history.test.mjs`) — catalog integrity, cross-platform path expansion (`%APPDATA%`, `~/`), byte formatting, filter logic, CLI integration on Windows/macOS/Linux paths. Total: 193 → 217

- **👤 Face-Search Scanner + Opt-Out** (`src/face-scanner/`, new subcommands `vanish face-scan` + `vanish face-opt-out`):
  - New catalog: 8 face-recognition services (PimEyes, FaceCheck.ID, FindClone, Lenso, TinEye, Yandex Images, Google Lens, Clearview AI)
  - Each service has: category (face-search / reverse-image / face-database), accessModel (free / freemium / paid / restricted), jurisdiction, pricing, knownFor description
  - `vanish face-scan` — opens each service's search page in your browser and prints a step-by-step walkthrough of how to upload your selfie + what free vs paid tiers show. **Vanish never handles your photo** — you upload it yourself on each service's own page
  - `vanish face-opt-out` — browser-assisted opt-out request for all 8 services including Clearview AI (where individuals can't even search themselves but have CCPA/GDPR deletion rights)
  - Per-service opt-out walkthroughs encode the real form flow (PimEyes: upload 1-3 photos + identity verification + email confirmation; Clearview: CCPA/GDPR request with government ID; Yandex: per-URL removal via search console)
  - Clearview AI gets 60-day reverify (slower processing); others 30-day reverify
  - Follow-up entries use `kind: 'face-service'` to distinguish from broker/AI opt-outs — shared queue
  - HMAC-signed audit trail with jurisdiction field (important for GDPR/CCPA evidence)
  - `--free-only` flag filters to services without paid tier; `--all` covers every service
  - Privacy notes built into scan walkthroughs — e.g., "PimEyes retains uploads 48h — create an account and delete after"
- 21 new tests (`tests/face-scan.test.mjs`). Total test count: 142 → 163
- Catalog at [`src/face-scanner/face-services-catalog.json`](src/face-scanner/face-services-catalog.json). All 8 services verified April 2026

- **🎯 AI Training Opt-Out** (`scripts/ai-opt-out.mjs`, new subcommand `vanish ai-opt-out`):
  - Browser-assisted opt-out for 26 of the 30 AI platforms (4 are already safe by default)
  - Each platform has a `walkthrough` entry in `ai-platforms-catalog.json` (upgraded to schema v2):
    - `targetSetting` — exact UI string users search for (e.g., "Improve the model for everyone")
    - `steps[]` — step-by-step instructions (e.g., "Click profile → Settings → Data controls → toggle OFF")
    - `verification` — what success looks like ("toggle shows grey/off")
    - `tierOverrides` — when the opt-out isn't needed (e.g., "ChatGPT Team/Enterprise already opted-out")
  - Opens each platform's settings URL in your browser, prints the walkthrough, waits for your confirmation
  - `--clipboard` flag copies the exact toggle name to clipboard so you can Ctrl/Cmd+F it on the page
  - Records HMAC-signed audit trail + 60-day re-verify followUp (AI platforms silently reset settings after policy updates)
  - Follow-up entries use `kind: 'ai-platform'` to distinguish from broker opt-outs — shared queue, different reverify cadence
  - Three input modes: explicit flags (`--chatgpt --linkedin`), CSV (`--use chatgpt,linkedin`), or `--all` (every non-safe platform)
  - `--no-open` test mode skips browser open and auto-confirms (used in CI)
- 13 new tests (`tests/ai-opt-out.test.mjs`) — walkthrough integrity, safe-platform handling, CLI batching, state persistence. Total test count: 129 → 142
- Catalog `version` bumped 1 → 2 (walkthrough schema)

- **🤖 AI Training Exposure Scanner** (`src/ai-scanner/`, new subcommand `vanish ai-scan`):
  - New catalog: 30 major LLM platforms across 6 categories (chat / content / productivity / creative / email / dev)
  - Classifies each as `exposed` (opted-in by default), `licensed` (data sold to AI companies), `safe` (opted-out by default), `action-needed` (policy unclear), or `not-applicable` (you don't use it)
  - Per-platform metadata: default consent state, opt-out URL, opt-out method + difficulty, estimated time, data types used, AI models trained
  - Quick wins list (easy + medium difficulty opt-outs with URLs)
  - Licensed-content list (platforms that have sold your data — opt-out only affects future training)
  - Hard opt-outs list (GDPR/CCPA email-only paths)
  - Exposure score 0-100 with colored bar + risk level (critical/high/moderate/low)
  - Accepts explicit flags (`--linkedin --twitter`) or CSV (`--use linkedin,twitter`) or `--all` (worst-case)
  - Outputs: terminal banner + Markdown report + JSON (`--json`)
  - **Zero data transmission** — scan takes no personal information, just platform names
  - Covered platforms include ChatGPT, Claude, Gemini, Copilot, Meta AI, Perplexity, LinkedIn, Reddit, Twitter/X (Grok), Stack Overflow, Tumblr, Medium, Quora, Facebook, Pinterest, Grammarly, Notion AI, Otter, Zoom, Slack, Gmail, Outlook, GitHub Copilot, Cursor, Adobe, Canva, DeviantArt, Shutterstock, Figma, ArtStation
  - All data verified April 2026. Notes call out recent policy changes (LinkedIn 2024, Reddit deals, Meta EU objection form)
- 20 new tests (`tests/ai-scan.test.mjs`): catalog integrity, classification logic, score boundaries, CLI integration. Total test count: 109 → 129

- **Static web app** at [`web/`](./web/):
  - Zero-install browser experience for non-developers
  - Dark-themed single-page app (Vite + vanilla JS, no framework)
  - Uses the same `src/scanner/` modules as the CLI (single source of truth)
  - Share card preview + PNG/SVG download directly from browser
  - 58 broker opt-out cards with direct links, captcha warnings, processing time
  - 100% client-side — no server, no tracking, no cookies
  - Deployed via GitHub Actions to GitHub Pages on every push
  - URL: https://ramboxie.github.io/vanish/
  - Bundle size: ~145 KB (27 KB gzipped) including the 210-broker catalog
- **`scan-engine.mjs` refactored to be isomorphic** (Node + browser):
  - Dropped `node:module.createRequire` and `node:crypto`
  - Uses `globalThis.crypto.getRandomValues()` (Node 20+ and all modern browsers)
  - `options.catalog` is now required — callers explicitly pass it
  - Call sites updated: `scripts/scan-demo.mjs`, `src/wizard/engine.mjs`, and tests
- **CI**: New `.github/workflows/deploy-web.yml` — builds and deploys web app automatically when `web/`, `src/scanner/`, or the catalog changes

- **Share Card feature** (`src/scanner/share-card.mjs`):
  - Privacy-preserving SVG card generator (1200×630, OG-image standard)
  - Shareable terminal banner printed at top of `scan` output by default
  - Contains ONLY aggregate score + category stats — no name, email, or phone
  - Color-coded by risk level (red/orange/yellow/green)
  - New `--share-card <path>` flag on `scan` command
  - New `--no-banner` + `--no-color` flags for CI / quiet modes
- `.github/workflows/test.yml` — CI running tests on Ubuntu / macOS / Windows × Node 20 / 22
- `SECURITY.md`, `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`
- `CHANGELOG.md` (this file)
- Issue templates: broker-broken, bug report, feature request
- `.gitattributes` normalizing line endings across platforms

### Tests
- 13 new tests in `tests/share-card.test.mjs` — banner consistency, SVG validity, privacy-preserving content, color-by-risk-level, CLI integration
- Total test count: 95 → 108

## [0.2.0] — 2026-04-17

Major release: scan → opt-out → verify loop complete. 210 brokers cataloged, 58 with browser-assisted opt-out.

### Added
- **Privacy Scanner** (`src/scanner/`): heuristic 0-100 privacy score across 210 brokers, 5-factor confidence algorithm (dataTypeCoverage + categoryRisk + jurisdictionMatch + brokerReach + optOutComplexity), no external API calls
- **Browser-assisted opt-out** (`scripts/opt-out.mjs`): opens real opt-out URLs in user's browser, pre-fills form data, user solves captcha + submits; records HMAC-signed audit trail + 30-day follow-up queue entry
- **Verify command** (`scripts/verify.mjs`): HTTP liveness check on follow-up profile URLs. Classifies each as `removed` (404/410/redirect-to-root) / `still-present` (200 same URL) / `unknown` (403/429/timeout). Writes results back to queue state with verification fields
- **Catalog-driven architecture** (`broker-catalog.json`): 210 brokers in single JSON file; registry auto-generates adapters. Replaces 23 individual broker .mjs files + template JSONs + official-endpoints.json
- **200 → 210 broker expansion** across 12 categories: 70 people-search, 21 public-records, 20 marketing-data, 18 background-check, 15 email-data, 14 phone-lookup, 12 financial, 8 social-media, 8 location-data, 7 reputation, 7 identity-resolution, 1 property
- **58 brokers with opt-out support**, including:
  - All 3 US credit bureaus (Equifax, Experian, TransUnion) + ChexSystems + LexisNexis + CoreLogic
  - Top people-search: Spokeo, Whitepages, BeenVerified, Intelius, Radaris, TruePeopleSearch, PeekYou, etc.
  - B2B marketing: Acxiom, LiveRamp, Oracle BlueKai, Epsilon, ZoomInfo, Clearbit, Neustar
  - Phone lookup: Truecaller, Hiya, USPhoneBook, SpyDialer, RoboKiller, etc.
- **18-state wizard** (was 13) with scan phase prepended: SCAN_WELCOME → SCAN_INPUT → SCAN_RUNNING → SCAN_REPORT → SCAN_HANDOFF → [existing 13-state cleanup]
- **Live broker factory** (`_live-broker.mjs`): reusable factory for brokers that support real HTTP submission (currently 8: spokeo, thatsthem, peekyou, addresses, cocofinder, checkpeople, familytreenow, usphonebook)
- **Unified CLI router** (`scripts/index.mjs`): `vanish scan|opt-out|verify|wizard|cleanup|queue|...` subcommands
- **Zero-install via npx**: `npx github:RAMBOXIE/vanish scan --name "..."`
- **Clawhub publishing metadata** in `SKILL.md` frontmatter
- Follow-up queue (`followUp[]` in `data/queue-state.json`) for 30-day re-verification

### Changed
- Audit HMAC key now required in production (warns in dev, silent in test) — `VANISH_AUDIT_HMAC_KEY` env var
- Secret store upgraded to scrypt KDF + per-secret salt (backward-compatible with legacy SHA-256)
- Queue state-store added stale-lock detection (30s timeout, PID liveness check)
- `--simulate transient-error` now works in live mode (was dry-run only)
- `b1-live.mjs --brokers` argument now accepts comma-separated list for multi-broker live submission
- README rewritten: value prop first, competitor comparison table, 3-step "how it works"
- Version bumped 0.1.0 → 0.2.0

### Fixed
- Hardcoded `D:/Projects/vanish` paths replaced with `import.meta.url`-relative paths (wizard engine, 2 test files)
- Queue state lock no longer leaks on process crash (stale detection)
- Audit canonical JSON handles Date/undefined/circular values via pre-sanitization

### Security
- scrypt KDF with per-secret salt for secret store (replaces weaker SHA-256 derivation)
- HMAC-SHA256 signing with canonical JSON serialization + timing-safe comparison
- Fail-loud audit key requirement in production

## [0.1.0] — earlier

Initial dry-run MVP with 23 brokers and P0 safety gates (manual trigger, triple confirm, export decision). See git history for commit-level detail prior to v0.2.

[Unreleased]: https://github.com/RAMBOXIE/vanish/compare/v0.2.0...HEAD
[0.2.0]: https://github.com/RAMBOXIE/vanish/releases/tag/v0.2.0
