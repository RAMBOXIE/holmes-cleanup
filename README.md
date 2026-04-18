# Holmes-Cleanup

> 🔍 **Scan 200 data brokers in 10 seconds.** Open source alternative to DeleteMe, Optery, and Incogni. MIT-licensed, local-first, no data leaves your machine.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node](https://img.shields.io/badge/node-%3E%3D20-brightgreen)](https://nodejs.org)
[![Tests](https://img.shields.io/badge/tests-64%20passing-brightgreen)](#testing)
[![Brokers](https://img.shields.io/badge/brokers-201-blue)](#broker-coverage)
[![Opt-Out](https://img.shields.io/badge/opt--out%20supported-28%20brokers-green)](#commands)

Your personal data is collected by hundreds of data brokers (Spokeo, Whitepages, Acxiom, LexisNexis…) and resold for $200-500/yr per person. DeleteMe charges $129/yr to remove it. **Holmes-Cleanup does the same — free, self-hosted, and auditable.**

---

## Quick Start

**Zero-install — one line from any terminal:**

```bash
npx github:RAMBOXIE/holmes-cleanup scan --name "Your Name" --email "you@example.com"
```

That's it. No clone, no install, runs anywhere with Node 20+.

### Other ways to run

<details>
<summary>Install via Clawhub (AI agent marketplace)</summary>

```bash
# Install as a skill for AI agents
npx clawhub@latest install holmes-cleanup
```

[Clawhub](https://clawhub.ai/) is the npm-like registry for AI agent skills. Once installed, any Clawhub-compatible agent can use Holmes-Cleanup's scan and cleanup capabilities.
</details>

<details>
<summary>Clone locally</summary>

```bash
git clone https://github.com/RAMBOXIE/holmes-cleanup
cd holmes-cleanup
node scripts/index.mjs scan --name "..." --email "..."
```
</details>

<details>
<summary>Install globally (npm link)</summary>

```bash
git clone https://github.com/RAMBOXIE/holmes-cleanup
cd holmes-cleanup && npm link
holmes-cleanup scan --name "..." --email "..."
```
</details>

### Sample output

```
# Privacy Scan Report
Scan ID: scan_1776429838547_9dd0ef7b
Identity: A. Lovelace

## Privacy Score: 63/100 (HIGH RISK)

[█████████████░░░░░░░] 63/100

## Exposure Summary
- Total brokers scanned: 200
- Likely exposed: 115
- Possibly exposed: 85

## Risk Distribution
- Critical: 95
- High: 20
- Moderate: 65

## Priority Recommendations
1. [CRITICAL] Remove from 70 people-search brokers
2. [CRITICAL] Remove from 18 background-check brokers
3. [HIGH] Remove from 7 identity-resolution brokers
4. [HIGH] Remove from 21 public-records brokers
```

---

## How it works

### 1. Scan (10 seconds, zero API calls)

Heuristic scanner estimates your exposure across 200 brokers using a 5-factor confidence algorithm:
- **Data-type coverage**: does the broker collect what you have?
- **Category risk**: people-search = critical, property-records = low
- **Jurisdiction match**: US brokers for US users, etc.
- **Broker reach**: category penetration
- **Opt-out complexity**: mail-only brokers likely still have your data

All computation is local. Nothing leaves your machine.

### 2. Review

Privacy score (0-100), per-broker risk tiers (`critical` / `high` / `moderate` / `low`), and prioritized recommendations grouped by category.

### 3. Remove

18-step conversational wizard submits opt-out requests:

```
SCAN_WELCOME → SCAN_INPUT → SCAN_RUNNING → SCAN_REPORT → SCAN_HANDOFF
  ↓ (cleanup branch)
WELCOME → GOAL → SCOPE → INPUT → AUTH → PLAN
  → RISK×3 (triple confirmation for high-risk actions)
  → EXPORT_DECISION → EXECUTE → REPORT → CLOSE
```

Persistent retry/manual-review/dead-letter queues, HMAC-signed audit trail, transparent error classification (transient vs. permanent).

---

## vs. Competitors

| Feature | Holmes-Cleanup | DeleteMe | Optery | Incogni |
|---------|:---:|:---:|:---:|:---:|
| **Price** | Free (MIT) | $129/yr | $99-249/yr | $99/yr |
| **Brokers covered** | 200 | 750+ | 350+ | 180+ |
| **Open source** | ✅ | ❌ | ❌ | ❌ |
| **Self-hosted** | ✅ | ❌ | ❌ | ❌ |
| **Data never leaves your machine** | ✅ | ❌ | ❌ | ❌ |
| **Signed audit trail (HMAC)** | ✅ | ❌ | ❌ | ❌ |
| **Encrypted secret store (scrypt)** | ✅ | N/A | N/A | N/A |
| **Agent-native (conversational)** | ✅ | ❌ | ❌ | ❌ |

---

## Broker Coverage (200 brokers)

| Category | Count | Examples |
|----------|------|----------|
| **People Search** | 70 | Spokeo, Whitepages, BeenVerified, Intelius, Radaris, Truecaller, InfoTracer |
| **Public Records** | 21 | FamilySearch, Archives, CourtListener, PropertyShark, Zillow, CityData |
| **Marketing Data** | 20 | Acxiom, LiveRamp, Oracle/BlueKai, ZoomInfo, Clearbit, Epsilon |
| **Background Check** | 18 | Checkr, GoodHire, Sterling, AccurateBackground, HireRight |
| **Email Data** | 15 | Hunter, Lusha, Apollo, RocketReach, LeadIQ, ContactOut |
| **Phone Lookup** | 14 | Truecaller, Hiya, RoboKiller, Sync.me, CallerSmart |
| **Financial** | 12 | LexisNexis, Equifax, Experian, TransUnion, ChexSystems, CoreLogic |
| **Social Media** | 8 | Lullar, SocialSearcher, Webmii, UserSearch, KnowEm |
| **Location Data** | 8 | SafeGraph, Foursquare, PlaceIQ, GravyAnalytics, X-Mode |
| **Reputation** | 7 | BrandYourself, Reputation.com, RepDigger, NetReputation |
| **Identity Resolution** | 7 | FullContact, Throtle, Infutor, Tapad, LiveIntent |

**Browser-assisted opt-out**: 28 brokers support guided removal via `holmes-cleanup opt-out`. Holmes opens your browser to the real opt-out URL, pre-fills the data to paste, and guides you through captchas + email verification. Includes the big names (Spokeo, Whitepages, BeenVerified, Intelius, Radaris), background check (InstantCheckmate, TruthFinder), credit bureaus (LexisNexis, Equifax), and more. See `holmes-cleanup opt-out --help` for the full list.

**Live HTTP submission**: 8 brokers have adapters for real HTTP submission via configurable endpoints (default `postman-echo.com` for closed-loop validation). The other 173 are dry-run blueprints with verified opt-out URLs — future batches can extend browser-assisted support to more.

---

## Features

- 🔍 **Privacy Scanner** — 200 brokers, 0-100 score, instant heuristic
- 🗑️ **18-state Wizard** — conversational opt-out flow, back/pause/resume commands
- 🏦 **Encrypted Secret Store** — scrypt KDF + per-secret salt, Windows DPAPI preferred, AES-GCM fallback
- ✍️ **Signed Audit Trail** — HMAC-SHA256 over canonical JSON, timing-safe verification
- 🔁 **Persistent Queues** — retry (exponential backoff) / manual-review / dead-letter with SHA-256 dedupe
- 📊 **Local Dashboard** — static HTML, watches queue state, zero backend
- 🛡️ **Safety Gates** — manual trigger only, triple-confirm for high-risk, export-before-delete, compliance snapshot
- 🧪 **64 Tests** — unit + e2e against `postman-echo.com`, every commit tested

---

## Core Safety Rules (never skipped)

1. **Manual trigger only** — `--manual` flag required, no scheduled mode
2. **Triple confirmation** for any high-risk action
3. **Ask before delete** — export decision gate
4. **User-selected notifications** — no opt-out pressure
5. **Minimum credential scope + shortest TTL + post-task wipe**
6. **HMAC key required in production** — fails loud in dev without `HOLMES_AUDIT_HMAC_KEY`

---

## Commands

All subcommands work via `holmes-cleanup <cmd>` (after `npm link` or publish) or `node scripts/index.mjs <cmd>` (local) or `npx -p github:RAMBOXIE/holmes-cleanup holmes-cleanup <cmd>` (zero-install).

```bash
# Privacy scan (no removal, no API calls, 10 seconds)
holmes-cleanup scan --name "John Doe" --email "j@x.com"
holmes-cleanup scan --name "..." --output-md ./my-report.md
holmes-cleanup scan --name "..." --output-json ./my-report.json --json

# Browser-assisted opt-out (opens browser + guides you through 28 real brokers)
holmes-cleanup opt-out --broker spokeo --email you@example.com --full-name "Your Name"
holmes-cleanup opt-out --broker spokeo,whitepages,beenverified --email you@example.com --full-name "Your Name"

# Supported brokers (28 total, covering top-visibility targets):
#   People search (17): spokeo, whitepages, beenverified, intelius, peoplefinder,
#     truepeoplesearch, fastpeoplesearch, radaris, zabasearch, thatsthem, nuwber,
#     peekyou, ussearch, addresses, cocofinder, checkpeople, truecaller
#   Background check (3): instantcheckmate, truthfinder, cyberbackgroundchecks
#   Public records (1): familytreenow
#   Phone lookup (2): usphonebook, hiya
#   Reputation (1): mylife
#   Identity resolution (1): pipl
#   Marketing data (1): acxiom
#   Financial (2): lexisnexis, equifax
#
# Tool opens your browser to the opt-out page, shows which fields to fill,
# tells you what captcha/email verification to expect, then records a
# follow-up for 30-day re-verification.

# Full interactive wizard (scan → review → cleanup)
holmes-cleanup wizard

# Dry-run cleanup with presets
holmes-cleanup cleanup --manual --preset spokeo \
  --confirm1 YES --confirm2 YES --confirm3 YES \
  --export-before-delete ask --export-answer no

# Live submission (real HTTP against test endpoint)
holmes-cleanup b1-live run --live --brokers spokeo,thatsthem,peekyou \
  --full-name "Test User"

# Queue management
holmes-cleanup queue list
holmes-cleanup queue retry --id <retryItemId>
holmes-cleanup queue resolve --id <manualReviewId> --resolution resolved

# Local dashboard (static HTML, no backend)
holmes-cleanup dashboard data/queue-state.json
# Open dashboard/index.html in browser

# Proof report (audit trail in Markdown)
holmes-cleanup report ./path/to/execution-result.json

# All 64 tests
npm test
```

Subcommand shortcut: `holmes-scan` is an alias for `holmes-cleanup scan`.

---

## Architecture

```
src/
├── scanner/                    # Privacy scan engine
│   ├── scoring.mjs             # 5-factor confidence + privacy score
│   ├── exposure-profile.mjs    # Per-broker exposure estimation
│   ├── scan-engine.mjs         # Orchestrates 200-broker scan
│   └── scan-report.mjs         # Markdown report renderer
├── adapters/
│   ├── registry.mjs            # Catalog-driven adapter registry
│   └── brokers/
│       ├── config/
│       │   └── broker-catalog.json   # Single source of truth (200 brokers)
│       ├── _dry-run-broker.mjs       # Base factory
│       └── _live-broker.mjs          # Live HTTP submission factory
├── wizard/
│   └── engine.mjs              # 18-state finite state machine
├── orchestrator/
│   └── b1-runner.mjs           # Pipeline: prepare → submit → parse → queue
├── queue/                      # Retry + manual-review + dead-letter queues
├── auth/
│   └── secret-store.mjs        # scrypt + per-secret salt
└── audit/
    └── signature.mjs           # HMAC-SHA256 audit signing

prompts/wizard/                 # 18 .md prompt templates per state
scripts/                        # CLI entry points
tests/                          # 64 tests across 15 files
```

---

## Status & Roadmap

**Current MVP**:
- ✅ 200-broker catalog with verified opt-out URLs
- ✅ Heuristic privacy scanner (0-100 score, per-broker risk)
- ✅ 18-state wizard with scan → handoff → cleanup flow
- ✅ Real HTTP submission for 8 brokers via test endpoint
- ✅ Audit, queues, secret store hardened
- ✅ 64 tests passing

**Next (P2)**:
- 🔜 Production endpoint configuration for people-search brokers
- 🔜 Browser-based scan (no install) via static JS port
- 🔜 Shareable scan card (image) for social distribution
- 🔜 Notification handlers (Telegram, email, Signal)
- 🔜 Dashboard queue operations UI

**Future**:
- 📬 Email removal flow (CCPA/GDPR requests)
- 🔎 Search-engine verification (Google `site:spokeo.com "John Doe"`)
- 📈 Before/after scan comparison ("privacy score went from 72 → 31")

---

## Docs

- [`SKILL.md`](SKILL.md) — Skill definition and operating guidance
- [`IMPLEMENTATION_PLAN.md`](IMPLEMENTATION_PLAN.md) — MVP architecture
- [`FLOWCHART.md`](FLOWCHART.md) — Mermaid process flow
- [`ADAPTER_SPEC.md`](ADAPTER_SPEC.md) — Unified adapter contracts
- [`CONVERSATION_PROTOCOL.md`](CONVERSATION_PROTOCOL.md) — Wizard state machine
- [`DMCA_TEMPLATES.md`](DMCA_TEMPLATES.md) — Bilingual DMCA drafts
- [`TODO.md`](TODO.md) — Backlog and validation records

---

## License

MIT — see [LICENSE](LICENSE).

## Contributing

Early-stage open source project. Issues, PRs, and new broker entries welcome.

Add a new broker in ~8 lines by appending to `src/adapters/brokers/config/broker-catalog.json`:

```json
"newbroker": {
  "displayName": "NewBroker",
  "category": "people-search",
  "jurisdiction": "US",
  "optOutUrl": "https://newbroker.com/optout",
  "optOutMethod": "form",
  "adapterMode": "dry-run",
  "rateLimitPolicy": { "requestsPerMinute": 4, "jitterMsMin": 500, "jitterMsMax": 1500, "backoff": "exponential" },
  "complianceNotes": [],
  "template": { "keywords": "newbroker exposure" }
}
```

No new `.mjs` file, no registry import. Registry auto-loads from catalog.

---

**If Holmes-Cleanup helps you, star ⭐ the repo** — it helps others discover a free alternative to $100+/yr privacy services.
