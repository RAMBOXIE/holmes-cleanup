# Vanish

> 🔍 **Scan 210 data brokers + 30 AI-training platforms in 10 seconds.** The only open-source privacy scanner that also checks **AI training exposure** — something DeleteMe ($129+/yr), Optery ($99+/yr), and Incogni ($99+/yr) don't offer at any price.

`210 brokers · 30 AI platforms · 58 + 26 browser-assisted opt-outs · all 3 US credit bureaus · 30/60-day verify loops · 0 data leaves your machine`

[![Tests](https://github.com/RAMBOXIE/vanish/actions/workflows/test.yml/badge.svg)](https://github.com/RAMBOXIE/vanish/actions/workflows/test.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node](https://img.shields.io/badge/node-%3E%3D20-brightgreen)](https://nodejs.org)
[![Brokers](https://img.shields.io/badge/data_brokers-210-blue)](#broker-coverage)
[![AI Platforms](https://img.shields.io/badge/AI_platforms-30-purple)](#ai-training-exposure-protection)
[![Opt-Out](https://img.shields.io/badge/browser--assisted%20opt--out-58+26-green)](#commands)

Vanish protects you from **two distinct privacy threats** that both exploded in the last 18 months:

🏢 **Data brokers** — 210 firms (Spokeo, Whitepages, Acxiom, LexisNexis…) collect + resell your personal data for $200-500/yr per person. DeleteMe charges $129+/yr to fight them. **Vanish does the same — free, self-hosted, and auditable.**

🤖 **AI training exposure** — In 2024-2025, every major platform silently flipped to **opted-in by default**: LinkedIn added AI training toggle ON for all users (Sept 2024), Reddit signed a ~$60M/yr Google training deal, Twitter/X auto-feeds Grok, Meta forced users to file GDPR objections. Commercial privacy services **ignore this entire category**. **Vanish is the first tool to cover it.**

**Try it now — zero-install, covers brokers AND AI:**

🌐 **In your browser**: [ramboxie.github.io/vanish](https://ramboxie.github.io/vanish/) · 100% client-side, nothing transmitted

💻 **In your terminal** (pick your concern):
```bash
# Data brokers — scan 210 firms in 10 seconds
npx github:RAMBOXIE/vanish scan --name "Your Name"

# AI training — which of 30 platforms feed your data to LLMs?
npx github:RAMBOXIE/vanish ai-scan --all

# Bonus: walkthrough opt-out for any of 26 AI platforms
npx github:RAMBOXIE/vanish ai-opt-out --chatgpt --linkedin --cursor
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

## 🤖 AI Training Exposure Protection

**In the last 18 months, the AI training landscape silently inverted.** Most users still think "my data might be used for AI someday" — but the policies already flipped. Every major platform you use is, by default, feeding your content to an LLM right now.

| Platform | What changed | When |
|----------|-------------|------|
| **LinkedIn** | Added a default-ON AI-training toggle for all users globally (later rolled back for EU/UK/Swiss/HK/Canada under regulator pressure) | Sept 2024 |
| **Reddit** | Signed a reported $60M/yr data licensing deal with Google; added OpenAI + Anthropic deals | 2024 |
| **Twitter/X** | Every tweet, reply, and like feeds Grok by default. No retroactive opt-out | 2023-2024 |
| **Meta (FB/IG/WhatsApp)** | Used "legitimate interest" to train Llama on all public posts. EU/UK users must file GDPR objection form; US users mostly stuck | 2024 |
| **ChatGPT** | Free/Plus/Pro conversations train future GPT models by default. Team/Enterprise is opt-out | Since launch |
| **Stack Overflow, Tumblr, Medium, Quora, Pinterest** | Varying licensing + per-platform toggles, none surfaced in normal settings flow | 2024-2025 |
| **GitHub Copilot, Cursor, Grammarly, Otter, Notion** | Your code/writing/meetings used for product improvement by default | 2023-2025 |

Commercial privacy services (DeleteMe, Optery, Incogni) **check zero of these**. They're still fighting the 2018 data-broker war.

### What Vanish does for AI

**Two commands, full coverage of 30 platforms:**

#### `vanish ai-scan` — classify your exposure

```bash
# Just list the platforms you use. No personal data transmitted.
vanish ai-scan --chatgpt --linkedin --cursor --gemini
```

Output (truncated):

```
🤖 AI Training Exposure: 100/100 (CRITICAL)

[████████████████████] 4 of 4 likely feed AI models

⚡ Quick wins — 3 easy opt-outs (~2 min total):
  • OpenAI ChatGPT (30s) — https://chat.openai.com/#settings/DataControls
    → Setting: "Improve the model for everyone" → OFF
  • LinkedIn (30s) — https://www.linkedin.com/mypreferences/d/settings/data-for-generative-ai
    → Setting: "Data for Generative AI Improvement" → OFF
  • Cursor (30s) — https://www.cursor.com/settings
    → Setting: "Privacy Mode" → ON
  • Google Gemini (120s) — myactivity.google.com/product/gemini
    → Setting: "Gemini Apps Activity" → OFF
```

Classification per platform: `exposed` (opted-in) · `licensed` (data already sold to AI — opt-out only affects future) · `safe` (opted-out by default — Claude, Notion AI, Medium, ArtStation) · `action-needed` (policy unclear).

#### `vanish ai-opt-out` — guided walkthrough for each

```bash
vanish ai-opt-out --chatgpt --linkedin --cursor
```

For each platform:
1. Opens the settings page in your browser
2. Prints the **exact UI string** to search for (`Ctrl/Cmd+F` friendly)
3. Step-by-step walkthrough (max 5 steps, verified against current UI as of 2026-04)
4. **Tier overrides** tell you when opt-out isn't needed (e.g., "Copilot Business already opted-out — skip")
5. Records HMAC-signed audit event + schedules **60-day re-verify** (AI platforms silently reset settings after policy updates)

`--clipboard` flag copies the toggle name so you can paste it into the page's find-in-page. `--all` runs through every non-safe platform in one session. `--no-open` for headless/scripting mode.

### The 30-platform catalog

| Category | Count | Platforms |
|----------|------:|-----------|
| 💬 **Chat AI** | 6 | ChatGPT · **Claude** ✅ · Gemini · Copilot · Meta AI · Perplexity |
| 📝 **Social/Content** | 9 | LinkedIn · Reddit 💸 · Twitter/X · Stack Overflow 💸 · Tumblr 💸 · **Medium** ✅ · Quora · Facebook/IG · Pinterest |
| ⚙️ **Productivity** | 5 | Grammarly · **Notion AI** ✅ · Otter · **Zoom** ✅ · Slack |
| 📧 **Email** | 2 | Gmail/Workspace · **M365/Outlook** ✅ |
| 💻 **Dev tools** | 2 | GitHub Copilot · Cursor |
| 🎨 **Creative** | 6 | Adobe · Canva · DeviantArt · Shutterstock 💸 · Figma · **ArtStation** ✅ |

✅ = default opted-out (no action needed) · 💸 = already licensed to AI companies (opt-out affects future training only) · others default opted-in and need manual opt-out.

All data manually verified April 2026. Catalog at [`src/ai-scanner/ai-platforms-catalog.json`](src/ai-scanner/ai-platforms-catalog.json) — each entry is a ~20-line JSON with `defaultConsent`, `optOutUrl`, `walkthrough`, `tierOverrides`, and source notes. PRs welcome for new platforms.

### Why this matters beyond "don't be tracked"

- **Your 2020 Reddit comment is already in GPT-4.** Licensed data doesn't unlearn. Opt-out only prevents FUTURE training rounds.
- **Enterprise plans differ.** ChatGPT Team, Copilot Business, Grammarly Business, Figma Enterprise are all opted-out by default — Vanish's `tierOverrides` field tells you when you don't need to worry.
- **Platforms reset settings after policy updates.** LinkedIn toggled millions of users back ON in Sept 2024. 60-day re-verify catches this before another training cycle.
- **Legal leverage.** The HMAC-signed audit trail is admissible evidence of your opt-out request (relevant for GDPR Article 21 objections, CCPA "Do Not Sell" disputes).

---

## vs. Competitors

| Feature | Vanish | DeleteMe | Optery | Incogni |
|---------|:---:|:---:|:---:|:---:|
| **Price** | Free (MIT) | $129+/yr | $99+/yr | $99+/yr |
| **Data brokers covered** | 210 | 750+ | 350+ | 180+ |
| **🤖 AI training exposure scan** | ✅ **30 platforms** | ❌ | ❌ | ❌ |
| **🤖 AI training opt-out walkthroughs** | ✅ **26 platforms** | ❌ | ❌ | ❌ |
| **All 3 US credit bureaus** | ✅ | ❌ | ❌ | ❌ |
| **Open source** | ✅ | ❌ | ❌ | ❌ |
| **Self-hosted / local-first** | ✅ | ❌ | ❌ | ❌ |
| **Data never leaves your machine** | ✅ | ❌ | ❌ | ❌ |
| **Signed audit trail (HMAC)** | ✅ | ❌ | ❌ | ❌ |
| **Encrypted secret store (scrypt)** | ✅ | N/A | N/A | N/A |
| **Agent-native (conversational)** | ✅ | ❌ | ❌ | ❌ |

**The three commercial services all treat "data brokers" as the full privacy problem.** They haven't added AI training exposure after 18 months of it being the biggest story in digital privacy. Vanish is, as of April 2026, the only tool that covers both.

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

### 🤖 AI training protection (unique to Vanish)

- **AI Exposure Scanner** — classify 30 LLM platforms as exposed / licensed / safe / action-needed in one command. No personal data transmitted
- **AI Opt-Out Walkthroughs** — browser-assisted guided opt-out for 26 platforms with exact UI string, step-by-step instructions, tier overrides (e.g. "Team plan already safe — skip"), and 60-day re-verify
- **Signed audit of AI opt-outs** — HMAC-SHA256 receipts admissible as GDPR/CCPA evidence

### 🏢 Data broker protection

- **Privacy Scanner** — 210 brokers, 0-100 score, instant heuristic (5-factor confidence algorithm)
- **18-state Wizard** — conversational opt-out flow with back/pause/resume
- **Browser-Assisted Opt-Out** — 58 brokers including all 3 US credit bureaus (Equifax/Experian/TransUnion) + top people-search + B2B marketing
- **30-day Verify Loop** — HTTP liveness check proves "actually removed" vs "still present"

### 🔒 Infrastructure (shared across both)

- **Encrypted Secret Store** — scrypt KDF + per-secret salt, Windows DPAPI preferred, AES-GCM fallback
- **Persistent Queues** — retry (exponential backoff) / manual-review / dead-letter with SHA-256 dedupe
- **Local Dashboard** — static HTML, watches queue state, zero backend
- **Safety Gates** — manual trigger only, triple-confirm for high-risk, export-before-delete, compliance snapshot
- **142 Tests** — unit + integration + CLI + e2e against `postman-echo.com`, every commit runs on Ubuntu/macOS/Windows × Node 20/22 (6 matrix jobs)

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

# AI training exposure scan — which LLM companies train on your data?
# No personal data sent. We just need to know which platforms you use.
vanish ai-scan --linkedin --twitter --chatgpt --reddit
vanish ai-scan --use linkedin,twitter,chatgpt,reddit      # CSV alt
vanish ai-scan --all                                      # all 30 platforms
vanish ai-scan --all --output-md ./ai-report.md

# Covered (30 platforms): ChatGPT, Claude, Gemini, Copilot, Meta AI, Perplexity,
# LinkedIn, Reddit, Twitter/X (Grok), Stack Overflow, Tumblr, Medium, Quora,
# Facebook, Pinterest, Grammarly, Notion AI, Otter, Zoom, Slack, Gmail, Outlook,
# GitHub Copilot, Cursor, Adobe, Canva, DeviantArt, Shutterstock, Figma, ArtStation
# Each entry shows: default consent (opted-in/opted-out/licensed), opt-out URL,
# estimated time, and difficulty.

# Browser-assisted AI training opt-out (opens each settings page + walkthrough)
# For 26 platforms with known UI walkthroughs — prints exact toggle name,
# opens the URL, waits for confirmation, records HMAC-signed audit trail.
vanish ai-opt-out --chatgpt                      # single platform
vanish ai-opt-out --chatgpt --linkedin --cursor  # batch
vanish ai-opt-out --use chatgpt,linkedin,cursor  # CSV alt
vanish ai-opt-out --all                          # all 26 non-safe platforms
vanish ai-opt-out --chatgpt --clipboard          # also copies target setting name
                                                 #   → paste into Ctrl/Cmd+F on page

# Each walkthrough includes: exact UI string to find, step-by-step instructions,
# tier overrides (e.g., "ChatGPT Team/Enterprise already opted-out"), verification
# hint ("toggle shows grey/off"). 60-day re-verify because platforms silently
# reset settings after policy updates.

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

# All 142 tests (109 broker + 20 ai-scan + 13 ai-opt-out)
npm test
```

Subcommand shortcut: `vanish-scan` is an alias for `vanish scan`.

---

## Architecture

```
src/
├── scanner/                    # 🏢 Data broker scan engine (210 firms)
│   ├── scoring.mjs             # 5-factor confidence + privacy score
│   ├── exposure-profile.mjs    # Per-broker exposure estimation
│   ├── scan-engine.mjs         # Orchestrates the 210-broker scan (isomorphic: Node + browser)
│   └── scan-report.mjs         # Markdown report + share card
├── ai-scanner/                 # 🤖 AI training exposure engine (30 platforms)
│   ├── ai-platforms-catalog.json   # Single source of truth (30 platforms × walkthroughs)
│   ├── ai-scan-engine.mjs      # Classifier: exposed / licensed / safe / action-needed
│   └── ai-scan-report.mjs      # Banner + Markdown renderer
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
├── queue/                      # Shared: retry + manual-review + dead-letter + followUp
├── auth/
│   └── secret-store.mjs        # scrypt + per-secret salt
└── audit/
    └── signature.mjs           # HMAC-SHA256 audit signing

prompts/wizard/                 # 18 .md prompt templates per state
scripts/                        # CLI entry points (scan, ai-scan, opt-out, ai-opt-out, verify, ...)
tests/                          # 142 tests across 20 files
web/                            # Static web app (Vite + vanilla JS, shares src/scanner)
```

---

## Status & Roadmap

**Shipped (v0.3-unreleased)**:
- ✅ **210-broker catalog** with verified opt-out URLs (up from 23 in v0.1)
- ✅ **58 browser-assisted broker opt-outs** including all 3 US credit bureaus
- ✅ **30 AI platforms** cataloged (ChatGPT, Claude, Gemini, LinkedIn, Reddit, Cursor, …)
- ✅ **26 AI platforms with walkthrough opt-outs** — exact toggle names + tier overrides
- ✅ **Heuristic privacy scanner** (0-100 score, 5-factor confidence, per-broker risk)
- ✅ **18-state wizard** with scan → handoff → cleanup flow
- ✅ **30-day HTTP verify loop** for brokers, **60-day reverify** for AI platforms
- ✅ **Static web app** at [ramboxie.github.io/vanish](https://ramboxie.github.io/vanish/) — zero-install, 100% client-side
- ✅ **Share card** (1200×630 SVG) — privacy-preserving public boast
- ✅ **Audit, queues, secret store hardened** (HMAC-SHA256, scrypt KDF, stale-lock detection)
- ✅ **142 tests** passing across Ubuntu/macOS/Windows × Node 20/22 (6 matrix jobs)

**Next (P2, retention-focused)**:
- 🔜 **Scan history** (`~/.vanish/history.jsonl` + `vanish history`) — show score drop 72 → 31 over time
- 🔜 **AI platform expansion** — Discord, Slack AI, Midjourney, Runway, Sora (targeting 50 total)
- 🔜 Notification handlers (Telegram, email, Signal) — for 30/60-day reverify reminders
- 🔜 Dashboard queue operations UI
- 🔜 `npm publish` + Clawhub publish

**Future**:
- 🔎 **Google Dork verification** — `site:spokeo.com "John Doe"` confirms presence beyond heuristic
- 🎭 **Playwright broker automation** — Top-5 broker full automation (competitive with DeleteMe)
- 🌐 **i18n broker/AI catalogs** — EU (SCHUFA, CRIF), UK (Experian UK), China broker ecosystem
- 📬 Email removal flow templates (CCPA/GDPR requests, bilingual)

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
