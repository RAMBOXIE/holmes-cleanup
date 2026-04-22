# Changelog

All notable changes to Vanish will be documented here. Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

### Added
- **⚖️ Workforce-monitoring coverage in `vanish third-party-ai`** — addresses the
  emerging threat reported around Meta/Salesforce: employers installing desktop
  agents that capture mouse/keystroke/screen telemetry to train AI agents on
  employee workflows. Previously Vanish covered meeting-specific (Zoom AI,
  Otter) and interview-specific (HireVue) tools only. Now covers always-on
  desktop monitoring too.
  - **New `workforce-monitoring` context** in the existing `third-party-ai`
    catalog (no new subcommand — the threat fits the "AI tools OTHERS use on
    you" framing)
  - **9 new tool entries**: ActivTrak, Teramind, Hubstaff, Time Doctor,
    Insightful (Workpuls), Veriato (SpectorSoft), InterGuard (Awareness
    Technologies), Microsoft Viva Insights, plus an `employer-internal`
    entry for closed-source employer-built tooling (the Meta-memo case)
  - Each commercial tool lists per-OS `installPaths` (win32 / darwin /
    linux) documenting the vendor's default install locations
  - **4 new jurisdiction clauses** with real legal citations:
    - `US-state-NY-EMA` — NY Electronic Monitoring Act (N.Y. Civil Rights
      Law §52-c, effective May 2022): written notice + acknowledgment
      required before monitoring
    - `US-state-IL-BIPA` — Illinois Biometric Information Privacy Act
      (740 ILCS 14/): keystroke-dynamics and mouse-movement patterns as
      biometric identifiers, $1,000-$5,000 statutory damages per violation
    - `DE-works-council` — Germany Betriebsverfassungsgesetz §87(1)(6)
      requires works council (Betriebsrat) co-determination on monitoring
      tools (clause rendered in German)
    - `EU-GDPR-art88` — GDPR Article 88 employment-context processing
      proportionality
  - **New objection letter template** `workforce-monitoring-objection`:
    dual-purpose letter with (1) formal DSAR-style disclosure request and
    (2) explicit objection to AI-training use, independent of the
    monitoring's general lawfulness. Templated vars include `{{employerName}}`
    and `{{detectedPaths}}` (evidence exhibit from local scan)
  - **New `--detect-installed` CLI flag**: best-effort local scan for the
    8 commercial agents on the user's own work device. Reuses existing
    `expandPath` + `statPath` from `src/ai-history/history-engine.mjs`.
    Found paths are embedded in the objection letter as a forensic exhibit.
    Extended `expandPath` to handle `%PROGRAMFILES%`, `%PROGRAMFILES(X86)%`,
    `%PROGRAMDATA%`, `%WINDIR%`, `%SYSTEMROOT%` for system-installed services.
  - New CLI examples in `--help` cover: detection alone, detection+letter
    combined, BIPA-specific keystroke-biometric angle, generic employer-
    internal disclosure demand
  - 19 new tests (tests/third-party-ai.test.mjs → 44 total): catalog schema,
    4 new jurisdictions, workforce-template variables, detectInstalled
    correctness with mocked filesystem, evidence-block formatting, CLI
    integration across all scenarios
  - **Explicit non-goals**: Vanish does NOT kill processes, block phone-home,
    or provide anti-detection. That's anti-malware territory. Scope is limited
    to identification + jurisdiction-cited legal-request generation.

### Fixed
- **`vanish verify` now handles every follow-up kind** (not just brokers): new
  dispatcher in `src/verifier/followup-kinds.mjs` routes broker entries to the
  existing HTTP liveness check and AI-platform / face-service entries to an
  interactive "did you re-check the toggle / re-upload?" reminder flow. One-shot
  kinds (ai-history-local, ai-history-web, takedown-*) are explicitly skipped
  with a note. Previous behavior: AI/face follow-ups recorded audit entries
  but had no re-verify loop. Adds `--kind <csv>` filter and `--assume
  clean|still` for scripting. 12 new tests.
- **`vanish opt-out` help text no longer hardcodes "8 brokers"**: the help
  output now enumerates the 58 brokers with `optOutFlow` dynamically from the
  catalog, and clarifies the capability tiers in a footer (210 triage catalog
  / 58 walkthrough / 8 live-adapter).
- **`vanish b1-live` explicitly marked EXPERIMENTAL** with header warning
  + dedicated `--help`: captchas block real submissions; use `vanish opt-out`
  for real opt-outs. Added a runtime stderr warning when `--live` is set.
- **`vanish scan` help reframes wording**: it's a heuristic triage / priority-
  ordering tool (local scoring, zero HTTP), explicitly NOT a real-time broker
  lookup. Clarifies the 210/58/8 capability tiers in help output.

### Added
- **📚 Catalog source citations** (data-quality improvement):
  - AI platforms catalog: added `sources` field to top 8 platforms (ChatGPT,
    Claude, Gemini, LinkedIn, Reddit, Twitter/X, GitHub Copilot, Cursor) —
    each source entry has `url`, `label`, `verifiedAt`. Cites primary source
    (vendor's own privacy policy) + secondary regulatory reference where
    relevant (UK ICO on LinkedIn AI, Reuters on Reddit-Google deal)
  - Face-services catalog: added `sources` for PimEyes, FaceCheck.ID,
    FindClone, Clearview AI — including regulator actions (BfDI Germany
    on PimEyes, UK ICO £7.5M fine on Clearview, ACLU v. Clearview BIPA
    settlement)
  - 4 new tests enforce schema: URL format, label presence, ISO date.
    Rollout is incremental; PRs welcome to add sources for remaining entries
- **🎯 "Capability matrix" section** in README hero: explicit table showing
  for each of the 12 subcommands: coverage count, method (local /
  walkthrough / automated), and reliability. Aims to eliminate the
  "210 brokers → 210 automated" misread that privacy tools often suffer
  from. Triage vs walkthrough vs live-adapter is now the primary framing

- **🌐 Web App v2 — Tabbed Multi-Threat UI** (`web/`):
  - Hero rebuilt with 3 tabs: 🏢 Data Brokers · 🤖 AI Training · 👤 Face Search
  - **Broker tab**: existing identity-form scan (unchanged, 210 brokers)
  - **AI tab** (new): checkbox grid of 12 priority platforms (ChatGPT, Claude, Gemini, Copilot, LinkedIn, Reddit, Twitter-X, Meta, Cursor, GitHub Copilot, Grammarly, Perplexity) with pre-shown default-consent pill badges; `--all` toggle for worst-case 30-platform scan; results show quick wins / licensed-to-AI / safe platforms with direct opt-out links
  - **Face tab** (new): read-only directory of 8 face-search services (PimEyes, FaceCheck, FindClone, Lenso, TinEye, Yandex, Google Lens, Clearview AI). Vanish **NEVER uploads the photo** — each "Check yourself" button opens the service's own search page. Clearview shown with restricted-access pill. Pricing + jurisdiction surfaced per card
  - **Triple-threat share card (v2)**: new `renderTripleThreatCardSvg()` produces a 1200×630 OG-dimensioned SVG with 3 columns (broker / AI / face). Un-scanned columns render as dashed ghosts. Worst-risk color sets the top accent line. When both broker and AI are scanned in a session, the Download PNG / SVG / Copy Text buttons auto-upgrade to the combined card
  - Copy-share-text now produces multi-line summary when multiple threats have been scanned
  - Vite aliases added: `@ai-scanner`, `@face-scanner`, `@ai-catalog`, `@face-catalog`
  - Mobile-responsive breakpoints for tabs + card grids
- 6 new tests (`tests/share-card.test.mjs` — triple-threat tests): required-score validation, all-three rendering, ghost-column fallback, privacy invariant (no identity leaks), face-only scenario. Total: 293 → 299
- Bundle impact: JS 145 KB → 201 KB (27 KB → 39 KB gzipped); CSS 7 KB → 12 KB (2 KB → 3 KB gzipped). Total gzipped still <45 KB
- Deployed automatically to https://ramboxie.github.io/vanish/ on every push to main

- **⚖️ Takedown Orchestrator** (`src/takedown/`, new subcommand `vanish takedown`):
  - For anyone needing to remove non-consensual intimate imagery (NCII): OnlyFans/Patreon pirated content, revenge-posts by ex-partners, unauthorized reposts, deepfakes, content from past careers the user now regrets
  - **Leak site DMCA catalog** (12 sites): coomer.su, kemono.su, thothub.tv, bitchesgirls.com, leakgallery.com, erome.com, Pornhub (has faster non-DMCA form), XVideos, Telegram channels, Discord servers, Reddit subs, Twitter/X — each with abuse contact + takedownDifficulty + recommended approach
  - **Hash registries** (most effective free tools):
    - **StopNCII.org** (gold standard): Your images NEVER upload — hashes are generated locally in-browser, only the hash goes to the registry. Meta/TikTok/Bumble/Reddit/OnlyFans/Pornhub/Snap all scan against it and auto-block matches
    - **Meta NCII Pilot** (now integrated with StopNCII)
    - **NCMEC CyberTipline** (for anyone under 18 at time of creation)
  - **Search engine removal**: Google's dedicated intimate-imagery form (faster than general DMCA), Bing content removal, Yandex removal
  - **4 legal letter templates** with jurisdiction-aware clauses:
    - DMCA §512(c) takedown notice (sworn statement + perjury attestation)
    - Cease & Desist letter (to individual distributor)
    - Police report narrative draft (cites Shield Act, state statutes)
    - Civil pre-suit demand letter (with statutory damages table)
  - **Jurisdiction flags** cite real law: `--jurisdiction DMCA | SHIELD | TAKE-IT-DOWN | EU | UK | CA | AU`
  - **HMAC-signed audit trail** of every drafted takedown — admissible as evidence in subsequent litigation
  - **Support resources built in**: CCRI hotline (1-844-878-CCRI), Revenge Porn Helpline UK, Australia eSafety Commissioner, NCMEC — surfaced via `vanish takedown --support`
  - **Privacy-preserving by design**: Vanish never stores your content, URLs you targeted, or the sites you visited. Just drafts letters + records audit
  - Unified CLI combines hash registration / search-engine removal / DMCA letters / legal templates in one tool
- 31 new tests (`tests/takedown.test.mjs`) — catalog integrity, all 4 legal template rendering with substitutions, jurisdiction clause selection across 7 jurisdictions, leak site key resolution, DMCA notice planning, CLI smoke tests covering --stopncii / --dmca-letter / --cease-and-desist / --google-intimate / --support / --list flows. Total: 262 → 293
- This addresses one of the most underserved privacy needs in the commercial tool landscape — DeleteMe/Optery/Incogni cover ZERO of this

- **📚 Training Dataset Membership Check** (`src/dataset-check/`, new subcommand `vanish dataset-check`):
  - Checks whether your content appears in 8 major public AI training datasets: Common Crawl, LAION-5B (via Have I Been Trained), The Pile, C4, OpenAI WebText, RedPajama, Dolma, FineWeb
  - **Active query** for Common Crawl — real HTTP call against the CDX Index Server across the 5 most recent monthly snapshots, returns per-snapshot hit count + digests
  - Walkthroughs for the other 7 datasets (no public query API) — each with: what's in the dataset, how to check manually (e.g., `wimbd.apps.allenai.org` for Dolma, `c4-search.apps.allenai.org` for C4, `haveibeentrained.com` for LAION), opt-out steps where possible (mostly `robots.txt + CCBot`)
  - Classification: low / moderate / high / critical based on Common Crawl hit count
  - `--walkthrough-only` mode skips network entirely; `--json` for machine-readable output
  - First open-source tool that actively queries training dataset indexes (vs only providing docs)
- 20 new tests (`tests/dataset-check.test.mjs`) — catalog integrity, key resolution, mock fetch for Common Crawl CDX, fallback snapshot list, classification thresholds, CLI smoke

- **⚖️ Third-Party AI Exposure** (`src/third-party-ai/`, new subcommand `vanish third-party-ai`):
  - Catalog of 13 AI tools that OTHER people use on your data (you're the subject, not the user): Zoom AI Companion · Otter · Fireflies · Fathom · Gong · Chorus/ZoomInfo · Read.ai (facial analysis) · Teams Copilot · HireVue · Pymetrics/Harver · Abridge · Nuance DAX · Suki AI
  - Grouped by context: workplace / hr-recruiting / medical
  - **Jurisdiction-aware objection letter generator** — pick `--jurisdiction EU|CA|IL|NY|HIPAA` to get a legally-cited objection letter per context (GDPR Article 21, CCPA AB-331, Illinois AI Video Interview Act, NYC Local Law 144, HIPAA 45 CFR)
  - 4 letter templates: workplace-meeting, sales-call-recording (customer side), ai-interview (accommodation request), medical-ai (HIPAA decline)
  - `--output <path>` writes assembled letters to a file; `--json` for programmatic use
  - Designed to put vendors + deployers on notice — often enough to trigger accommodation without litigation
- 25 new tests (`tests/third-party-ai.test.mjs`) — catalog + template references, jurisdiction clause selection, letter rendering with substitutions, context grouping, CLI integration

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
