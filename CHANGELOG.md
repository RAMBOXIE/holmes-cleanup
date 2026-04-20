# Changelog

All notable changes to Holmes-Cleanup will be documented here. Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

### Added
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
- **Unified CLI router** (`scripts/index.mjs`): `holmes-cleanup scan|opt-out|verify|wizard|cleanup|queue|...` subcommands
- **Zero-install via npx**: `npx github:RAMBOXIE/holmes-cleanup scan --name "..."`
- **Clawhub publishing metadata** in `SKILL.md` frontmatter
- Follow-up queue (`followUp[]` in `data/queue-state.json`) for 30-day re-verification

### Changed
- Audit HMAC key now required in production (warns in dev, silent in test) — `HOLMES_AUDIT_HMAC_KEY` env var
- Secret store upgraded to scrypt KDF + per-secret salt (backward-compatible with legacy SHA-256)
- Queue state-store added stale-lock detection (30s timeout, PID liveness check)
- `--simulate transient-error` now works in live mode (was dry-run only)
- `b1-live.mjs --brokers` argument now accepts comma-separated list for multi-broker live submission
- README rewritten: value prop first, competitor comparison table, 3-step "how it works"
- Version bumped 0.1.0 → 0.2.0

### Fixed
- Hardcoded `D:/Projects/holmes-cleanup` paths replaced with `import.meta.url`-relative paths (wizard engine, 2 test files)
- Queue state lock no longer leaks on process crash (stale detection)
- Audit canonical JSON handles Date/undefined/circular values via pre-sanitization

### Security
- scrypt KDF with per-secret salt for secret store (replaces weaker SHA-256 derivation)
- HMAC-SHA256 signing with canonical JSON serialization + timing-safe comparison
- Fail-loud audit key requirement in production

## [0.1.0] — earlier

Initial dry-run MVP with 23 brokers and P0 safety gates (manual trigger, triple confirm, export decision). See git history for commit-level detail prior to v0.2.

[Unreleased]: https://github.com/RAMBOXIE/holmes-cleanup/compare/v0.2.0...HEAD
[0.2.0]: https://github.com/RAMBOXIE/holmes-cleanup/releases/tag/v0.2.0
