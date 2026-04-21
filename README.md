# Vanish

> 🔍 **Scan 210 data brokers in 10 seconds.** Open-source alternative to DeleteMe ($129+/yr), Optery ($99+/yr), Incogni ($99+/yr). MIT-licensed, local-first, zero telemetry.

`210 brokers scanned · 58 with semi-automated opt-out · all 3 US credit bureaus · 30-day verify loop · 0 data leaves your machine`

[![Tests](https://github.com/RAMBOXIE/vanish/actions/workflows/test.yml/badge.svg)](https://github.com/RAMBOXIE/vanish/actions/workflows/test.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node](https://img.shields.io/badge/node-%3E%3D20-brightgreen)](https://nodejs.org)
[![Brokers](https://img.shields.io/badge/brokers-210-blue)](#broker-coverage)
[![Opt-Out](https://img.shields.io/badge/opt--out%20supported-58%20brokers-green)](#commands)

Your personal data is collected by hundreds of data brokers (Spokeo, Whitepages, Acxiom, LexisNexis…) and resold for $200-500/yr per person. DeleteMe charges from $129/yr to remove it. **Vanish does the same — free, self-hosted, and auditable.**

**Try it now — two zero-install options:**

🌐 **In your browser**: [ramboxie.github.io/vanish](https://ramboxie.github.io/vanish/) · 100% client-side, nothing transmitted

💻 **In your terminal** (10 seconds):
```bash
npx github:RAMBOXIE/vanish scan --name "Your Name"
```

---

## Quick Start

**Zero-install — one line from any terminal:**

```bash
npx github:RAMBOXIE/vanish scan --name "Your Name" --email "you@example.com"
```

That's it. No clone, no install, runs anywhere with Node 20+.

### Other ways to run

<details>
<summary>Install via Clawhub (AI agent marketplace)</summary>

```bash
# Install as a skill for AI agents
npx clawhub@latest install vanish
```

[Clawhub](https://clawhub.ai/) is the npm-like registry for AI agent skills. Once installed, any Clawhub-compatible agent can use Vanish's scan and cleanup capabilities.
</details>

<details>
<summary>Clone locally</summary>

```bash
git clone https://github.com/RAMBOXIE/vanish
cd vanish
node scripts/index.mjs scan --name "..." --email "..."
```
</details>

<details>
<summary>Install globally (npm link)</summary>

```bash
git clone https://github.com/RAMBOXIE/vanish
cd vanish && npm link
vanish scan --name "..." --email "..."
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
- Total brokers scanned: 210
- Likely exposed: 115
- Possibly exposed: 95

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

Heuristic scanner estimates your exposure across 210 brokers using a 5-factor confidence algorithm:
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

| Feature | Vanish | DeleteMe | Optery | Incogni |
|---------|:---:|:---:|:---:|:---:|
| **Price** | Free (MIT) | $129+/yr | $99+/yr | $99+/yr |
| **Brokers covered** | 210 | 750+ | 350+ | 180+ |
| **Open source** | ✅ | ❌ | ❌ | ❌ |
| **Self-hosted** | ✅ | ❌ | ❌ | ❌ |
| **Data never leaves your machine** | ✅ | ❌ | ❌ | ❌ |
| **Signed audit trail (HMAC)** | ✅ | ❌ | ❌ | ❌ |
| **Encrypted secret store (scrypt)** | ✅ | N/A | N/A | N/A |
| **Agent-native (conversational)** | ✅ | ❌ | ❌ | ❌ |

---

## Broker Coverage (210 brokers)

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

**Browser-assisted opt-out**: 58 brokers support guided removal via `vanish opt-out`. Vanish opens your browser to the real opt-out URL, pre-fills the data to paste, and guides you through captchas + email verification. Includes the big names (Spokeo, Whitepages, BeenVerified, Intelius, Radaris), background check (InstantCheckmate, TruthFinder), credit bureaus (LexisNexis, Equifax, Experian, TransUnion), and more. See `vanish opt-out --help` for the full list.

**Live HTTP submission**: 8 brokers have adapters for real HTTP submission via configurable endpoints (default `postman-echo.com` for closed-loop validation). The other 202 are dry-run blueprints with verified opt-out URLs — future batches can extend browser-assisted support to more.

---

## Features

- 🔍 **Privacy Scanner** — 210 brokers, 0-100 score, instant heuristic
- 🗑️ **18-state Wizard** — conversational opt-out flow, back/pause/resume commands
- 🔁 **Verify Loop** — 30-day re-check with HTTP liveness; proves "actually removed" vs "still present"
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
6. **HMAC key required in production** — fails loud in dev without `VANISH_AUDIT_HMAC_KEY`

---

## Commands

All subcommands work via `vanish <cmd>` (after `npm link` or publish) or `node scripts/index.mjs <cmd>` (local) or `npx -p github:RAMBOXIE/vanish vanish <cmd>` (zero-install).

```bash
# Privacy scan (no removal, no API calls, 10 seconds)
vanish scan --name "John Doe" --email "j@x.com"
vanish scan --name "..." --output-md ./my-report.md
vanish scan --name "..." --output-json ./my-report.json --json

# Generate a privacy-preserving share card (1200x630 SVG)
# Safe to post publicly — contains ONLY aggregate score + category stats,
# no name, email, or phone.
vanish scan --name "..." --share-card ./my-privacy-card.svg

# Quieter output (for CI / scripting):
vanish scan --name "..." --no-banner --no-color

# Browser-assisted opt-out (opens browser + guides you through 58 real brokers)
vanish opt-out --broker spokeo --email you@example.com --full-name "Your Name"
vanish opt-out --broker spokeo,whitepages,beenverified --email you@example.com --full-name "Your Name"

# Verify whether past opt-out submissions actually worked (30-day re-check loop)
vanish verify                  # check entries past recheckAt date
vanish verify --all            # check every followUp entry (ignore schedule)
vanish verify --broker spokeo  # check specific broker(s)
vanish verify --no-fetch       # dry-run, just list pending

# Verify output: ✅ removed / ❌ still-present / ❓ unknown (captcha/timeout/etc)
# Updates queue state with verification results + writes HMAC-signed audit events.
# Suggests re-submitting opt-out for still-present brokers.

# Supported brokers (58 total — now covering all 3 credit bureaus + top B2B data firms):
#   People search (27): spokeo, whitepages, beenverified, intelius, peoplefinder,
#     truepeoplesearch, fastpeoplesearch, radaris, zabasearch, thatsthem, nuwber,
#     peekyou, ussearch, addresses, cocofinder, checkpeople, peoplelooker,
#     publicrecordsnow, searchpeoplefree, smartbackgroundchecks,
#     advancedbackgroundchecks, clustrmaps, 411com, anywho, infotracer, peoplewhiz, truecaller
#   Background check (5): instantcheckmate, truthfinder, cyberbackgroundchecks,
#     checkpast, backgroundreport, governmentregistry
#   Phone lookup (7): usphonebook, hiya, spydialer, numberguru, reversephonelookup,
#     syncme, robokiller
#   Public records (1): familytreenow
#   Reputation (2): mylife, brandyourself
#   Identity resolution (2): pipl, fullcontact
#   Marketing data (7): acxiom, liveramp, oraclebluekai, epsilon, zoominfo,
#     clearbit, neustar
#   Financial (5): lexisnexis, equifax, experian, transunion, chexsystems, corelogic
#     ← all 3 credit bureaus covered
#
# Tool opens your browser to the opt-out page, shows which fields to fill,
# tells you what captcha/email verification to expect, then records a
# follow-up for 30-day re-verification.

# Full interactive wizard (scan → review → cleanup)
vanish wizard

# Dry-run cleanup with presets
vanish cleanup --manual --preset spokeo \
  --confirm1 YES --confirm2 YES --confirm3 YES \
  --export-before-delete ask --export-answer no

# Live submission (real HTTP against test endpoint)
vanish b1-live run --live --brokers spokeo,thatsthem,peekyou \
  --full-name "Test User"

# Queue management
vanish queue list
vanish queue retry --id <retryItemId>
vanish queue resolve --id <manualReviewId> --resolution resolved

# Local dashboard (static HTML, no backend)
vanish dashboard data/queue-state.json
# Open dashboard/index.html in browser

# Proof report (audit trail in Markdown)
vanish report ./path/to/execution-result.json

# All 109 tests
npm test
```

Subcommand shortcut: `vanish-scan` is an alias for `vanish scan`.

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
│       │   └── broker-catalog.json   # Single source of truth (210 brokers)
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
tests/                          # 109 tests across 15 files
```

---

## Status & Roadmap

**Current MVP**:
- ✅ 200-broker catalog with verified opt-out URLs
- ✅ Heuristic privacy scanner (0-100 score, per-broker risk)
- ✅ 18-state wizard with scan → handoff → cleanup flow
- ✅ Real HTTP submission for 8 brokers via test endpoint
- ✅ Audit, queues, secret store hardened
- ✅ 109 tests passing across 3 OSes × 2 Node versions (CI)

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

**If Vanish helps you, star ⭐ the repo** — it helps others discover a free alternative to $100+/yr privacy services.

---

## Legal & Trademark Notice

**DeleteMe®**, **Optery®**, and **Incogni®** are trademarks of their respective owners (Abine, Inc.; Optery, Inc.; Surfshark B.V.). **Vanish is not affiliated with, endorsed by, or sponsored by any of these services.**

References to competitor products exist solely for **factual comparison** (truthful comparative advertising, permitted under US Lanham Act §43(a), EU Directive 2006/114/EC, and similar frameworks).

Pricing referenced ($129+/yr, $99+/yr, etc.) is **approximate and current as of April 2026**. These services use tiered pricing — the figures shown are entry-level. Check each service's official website for current and complete pricing.

Vanish is a community-maintained, MIT-licensed open-source project. It does not offer a commercial service. It does not warrant any particular outcome of opt-out submissions; each broker's response is governed by their own policies and applicable privacy laws (CCPA, GDPR, etc.).
