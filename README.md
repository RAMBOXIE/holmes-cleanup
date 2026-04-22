# Vanish

> 🔍 **Scan 210 data brokers + 30 AI platforms + 8 face-search engines.** The only open-source privacy scanner that covers **AI training exposure AND face-recognition brokers** (PimEyes, Clearview) — things DeleteMe ($129+/yr), Optery ($99+/yr), and Incogni ($99+/yr) don't offer at any price.

`210 brokers · 30 AI platforms · 8 face-search services · 58 + 26 + 8 browser-assisted opt-outs · all 3 US credit bureaus · 30/60-day verify loops · 0 data leaves your machine`

[![Tests](https://github.com/RAMBOXIE/vanish/actions/workflows/test.yml/badge.svg)](https://github.com/RAMBOXIE/vanish/actions/workflows/test.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node](https://img.shields.io/badge/node-%3E%3D20-brightgreen)](https://nodejs.org)
[![Brokers](https://img.shields.io/badge/data_brokers-210-blue)](#broker-coverage-210-brokers)
[![AI Platforms](https://img.shields.io/badge/AI_platforms-30-purple)](#ai-training-exposure-protection)
[![Face Services](https://img.shields.io/badge/face_services-8-orange)](#face-search-exposure-protection)
[![Opt-Out](https://img.shields.io/badge/browser--assisted%20opt--out-58+26+8-green)](#commands)

Vanish protects you from **three distinct privacy threats** that all exploded in the last 24 months:

🏢 **Data brokers** — 210 firms (Spokeo, Whitepages, Acxiom, LexisNexis…) collect + resell your personal data for $200-500/yr per person. DeleteMe charges $129+/yr to fight them. **Vanish does the same — free, self-hosted, and auditable.**

🤖 **AI training exposure** — In 2024-2025, every major platform silently flipped to **opted-in by default**: LinkedIn added AI training toggle ON for all users (Sept 2024), Reddit signed a ~$60M/yr Google training deal, Twitter/X auto-feeds Grok, Meta forced users to file GDPR objections. Commercial privacy services **ignore this entire category**.

👤 **Face-search exposure** — PimEyes, FaceCheck.ID, Clearview AI, FindClone: upload one selfie, get every web page where your face appears. Used for stalking, doxxing, domestic-abuse tracking, and by law enforcement without warrants. DeleteMe / Optery / Incogni don't touch this either.

**Vanish is the first open-source tool to cover all three.**

**Try it now — zero-install, covers everything:**

🌐 **In your browser**: [ramboxie.github.io/vanish](https://ramboxie.github.io/vanish/) · 100% client-side, nothing transmitted

💻 **In your terminal** (pick your concern):
```bash
# Data brokers — scan 210 firms in 10 seconds
npx github:RAMBOXIE/vanish scan --name "Your Name"

# AI training — which of 30 platforms feed your data to LLMs?
npx github:RAMBOXIE/vanish ai-scan --all

# Face search — is your selfie on PimEyes or Clearview AI?
npx github:RAMBOXIE/vanish face-scan --pimeyes --facecheck --findclone

# Opt out of AI training (26 platforms with guided walkthroughs)
npx github:RAMBOXIE/vanish ai-opt-out --chatgpt --linkedin --cursor

# Opt out of face databases (including Clearview AI under CCPA/GDPR)
npx github:RAMBOXIE/vanish face-opt-out --pimeyes --clearview
```

---

## 🎯 Capability matrix — what actually works

Vanish deliberately draws sharp lines between what's **triaged** (scored),
**walkthrough** (you execute with guidance), and **automated** (Vanish submits).
Most privacy tools blur these. We don't.

| Capability | Coverage | Method | Reliability |
|-----------|---------|--------|-------------|
| **Broker exposure triage** (`vanish scan`) | 210 brokers | Local heuristic scoring, zero HTTP | 100% (it's a local model — no network dependency) |
| **Broker opt-out walkthrough** (`vanish opt-out`) | **58 brokers** | Opens browser + pre-fills clipboard; you solve captcha | High — you're the one submitting, so broker ToS / captcha / email verify all work |
| **Broker live HTTP submission** (`vanish b1-live`) | 8 brokers | Programmatic POST to configured endpoint | ⚠️ **Experimental** — captchas block real submissions. Infrastructure test only (runs against postman-echo by default) |
| **AI training exposure scan** (`vanish ai-scan`) | 30 platforms | Local classification from catalog | 100% (local) |
| **AI opt-out walkthrough** (`vanish ai-opt-out`) | 26 platforms | Browser-assisted + exact toggle name | High — you click the toggle |
| **Face-search audit** (`vanish face-scan`) | 8 services | Opens each service's own search page | You run the search — Vanish never handles your photo |
| **Face-search opt-out** (`vanish face-opt-out`) | 8 services | Form guidance + CCPA/GDPR citations | High — you submit; Vanish records audit |
| **LLM memorization probe** (`vanish llm-memory-check`) | 2 providers (OpenAI, Anthropic) | User's own API key | Depends on model + your identity |
| **Training-dataset membership** (`vanish dataset-check`) | 8 datasets | Common Crawl CDX = live query; others = walkthrough | CC is automated + accurate; rest need you to visit |
| **Third-party AI objection letters** (`vanish third-party-ai`) | 13 tools, 4 letter templates | Jurisdiction-cited letter generator | Legal templates — you send |
| **AI history cleanup** (`vanish clean-ai-history`) | 9 tools (4 local + 5 web) | Prints paths + commands; you copy-paste | Safer than auto-delete |
| **NCII / leak takedown** (`vanish takedown`) | 12 leak sites + StopNCII + Google intimate-imagery | DMCA + legal letter drafting | You send the letters; audit is HMAC-signed evidence |
| **Re-verify any of the above** (`vanish verify`) | All kinds | HTTP liveness for brokers, manual reminder for AI/face | Automated for brokers, reminder for the rest |

**Core philosophy**: Vanish does not submit destructive actions on your behalf.
We open the right page, show you exactly what to click, and record an
HMAC-signed audit of what you confirmed. You're the one legally submitting,
so captchas, IP bans, and account-verification loops all work correctly.

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

### Advanced AI-era checks (beyond scan / opt-out)

Two deeper AI-privacy tools for power users — both unique to Vanish:

#### 🧠 `vanish llm-memory-check` — is your personal data already memorized?

Modern LLMs don't just "might use" your data — if you've been scraped into pre-training sets, they already **remember you verbatim**. Researchers have shown GPT can complete sentences containing real people's phone numbers and emails.

```bash
# Minimum: just your name
vanish llm-memory-check --name "John Doe"

# Full probe with all identifiers
OPENAI_API_KEY=sk-... ANTHROPIC_API_KEY=sk-ant-... \
  vanish llm-memory-check --name "John Doe" \
    --email john@example.com --phone "+1-555-123-4567" \
    --workplace "Acme Corp"
```

How it works: Vanish sends 15 stalker-style probe prompts to each configured LLM ("What's X's phone number?", "Complete: X's email is...") and checks if responses contain your verbatim identifiers. Output is a **leak rate** per model (0-100%) + which identifier types leaked.

```
🧠 LLM Memorization Test Results

OpenAI (gpt-4o-mini)
  [████░░░░░░░░░░░░░░░░] 3/15 probes leaked (20%) — ⚠️ moderate
  Leaked types: workplace, city

Anthropic (claude-3-5-haiku)
  [░░░░░░░░░░░░░░░░░░░░] 0/15 probes leaked (0%) — ✅ safe
```

Uses **your own API keys** (env vars) — Vanish doesn't proxy. Cost: ~\$0.01/scan. `--dry-run` mode runs without API keys for testing.

A zero leak rate doesn't prove you're safe (paraphrased knowledge slips through). A positive leak rate is damning evidence your data was scraped.

#### 📚 `vanish dataset-check` — is your content already in Common Crawl / LAION / Pile?

Even if you opted out of every platform, your content may be frozen in **training datasets that have already shipped**. Common Crawl alone is the backbone of GPT-3/4, Llama, Claude, and Gemini.

```bash
# Real Common Crawl query (actual HTTP call to CDX Index Server)
vanish dataset-check --url https://your-site.com --common-crawl

# All 8 datasets (Common Crawl + walkthroughs for the rest)
vanish dataset-check --url https://your-site.com --all

# Research mode — no network, just walkthroughs
vanish dataset-check --walkthrough-only --all
```

For Common Crawl: Vanish queries the real CDX Index Server across the 5 most recent monthly snapshots and returns per-snapshot hits for your URL.

For LAION (images), The Pile, C4, WebText, RedPajama, Dolma, FineWeb: walkthroughs with exact URLs (`wimbd.apps.allenai.org`, `haveibeentrained.com`, `c4-search.apps.allenai.org`), opt-out instructions (mostly `CCBot robots.txt`), and caveats ("existing distributions cannot be retroactively filtered").

#### ⚖️ `vanish third-party-ai` — AI that OTHER people use on you

Your data gets fed to AI not just by you, but by your employer, doctor, recruiter, and sales contacts — often without explicit consent. Zoom AI Companion, Otter, Fireflies, Gong, HireVue, Abridge, Nuance DAX.

```bash
# Workplace meeting AI objection (EU law)
vanish third-party-ai --context workplace --jurisdiction EU

# AI interview accommodation (Illinois AI Video Interview Act)
vanish third-party-ai --hirevue --jurisdiction IL --company "Acme Corp"

# Medical AI decline (HIPAA)
vanish third-party-ai --abridge --nuance --jurisdiction HIPAA
```

Generates jurisdiction-aware objection letter templates citing:
- **GDPR Article 21/22** (EU) — right to object to processing + automated decisions
- **CCPA / AB-331** (California) — automated decision tool rights in employment
- **Illinois AI Video Interview Act** — mandatory disclosure for AI interviews
- **NYC Local Law 144** — bias audit requirement for AEDTs
- **HIPAA 45 CFR §164.506** — right to restrict AI processing of PHI

Covers 13 tools across workplace / HR / medical. `--output letters.txt` writes them to a file you can email directly.

#### 🧹 `vanish clean-ai-history` — where does your AI history actually live?

Every AI tool you use caches conversations somewhere. Some are local (Cursor's workspace cache), some are cloud-only (ChatGPT web), some are both. Wiping "everything" requires knowing every location.

```bash
vanish clean-ai-history --cursor --vscode-copilot --chatgpt
vanish clean-ai-history --all                       # full wipe audit
vanish clean-ai-history --all --local-only          # just files on disk
```

For each tool, Vanish:
1. Resolves the cache paths for your OS (Windows/macOS/Linux)
2. Stats what actually exists + approximate size
3. Prints the exact shell command to delete it (**you copy-paste — Vanish never runs rm on your files**)
4. For cloud/web tools: opens settings + prints delete walkthrough
5. Records HMAC-signed audit trail when you confirm you ran the command

Covers 9 tools: Cursor · VS Code + Copilot · Claude Desktop · ChatGPT Desktop · ChatGPT web · Claude web · Gemini · Perplexity · Grammarly. Matches Vanish's safety philosophy from face-scan: we don't handle destructive actions, we show you exactly what to run.

---

## 👤 Face-Search Exposure Protection

**Upload a single selfie to PimEyes. You'll be horrified.** The site returns every public web page that contains your face — profile photos, conference group shots, articles, social tags, strangers' Instagram backgrounds, and (for unlucky people) adult sites that misidentified them. The underlying tech indexes **billions of images** and is freely available to any stranger with $5.

Real-world damage from face-search brokers:

- **Domestic abuse**: survivors tracked via PimEyes after relocating
- **Stalking**: exes finding current locations via workplace headshots in search results
- **Doxxing**: protesters identified from single photos at demonstrations
- **Warrantless policing**: Clearview AI used by 3,000+ US police departments, no judicial oversight
- **Discrimination**: recruiters reverse-searching candidates' faces to find personal life info

Commercial privacy services (DeleteMe / Optery / Incogni) **don't cover a single face-search broker**. Their entire product is text-based data deletion from people-search sites.

### What Vanish does for face exposure

**Two commands, 8 services covered:**

#### `vanish face-scan` — find where your face appears

```bash
# The essential audit
vanish face-scan --pimeyes --facecheck --findclone

# Free-tier only (skips FindClone which is paid)
vanish face-scan --pimeyes --facecheck --tineye --yandex --google-lens --free-only

# Everything
vanish face-scan --all
```

Vanish opens each service's search page in your browser and prints the walkthrough — **your photo never passes through Vanish**, you upload it yourself on each service. We just tell you:
- Which services have the best coverage for your demographic
- Free vs paid tier differences per service
- Privacy notes per service (e.g., "PimEyes retains uploads 48 hours — use their Private Search toggle or delete after")
- Which jurisdiction hosts the service (matters for your legal opt-out rights)

#### `vanish face-opt-out` — request removal, including Clearview

```bash
vanish face-opt-out --pimeyes --facecheck --clearview
```

Covers **all 8 services including Clearview AI** — the LE-only face database that you can't search yourself but do have a legal right to remove yourself from (CCPA §1798.105 or GDPR Article 17). The walkthrough includes:
- Upload 1-2 photos (front-facing, face visible)
- Government ID verification (where required — Clearview, FaceCheck)
- Exact legal citation text ("I request deletion under GDPR Article 17")
- Platform-specific gotchas (PimEyes has a paid PROtect monitoring service separate from free one-time opt-out)

Each submission recorded with **HMAC-signed audit trail + 30-day reverify** (60 days for Clearview, which is slower). The signed audit is admissible as GDPR/CCPA evidence if the service refuses to delete.

### The 8-service catalog

| Service | Category | Access | Jurisdiction | Coverage |
|---------|----------|--------|-------------|----------|
| **PimEyes** | face-search | freemium | global | Most infamous; billions of pages indexed |
| **FaceCheck.ID** | face-search | freemium | US | Growing competitor; romance-scam-detection framing |
| **FindClone** | face-search | paid | Russia | Best Slavic/Russian coverage (VK.com based) |
| **Lenso** | face-search | freemium | EU (Poland) | Newer, GDPR-compliant, smaller index |
| **TinEye** | reverse-image | free | Canada | Exact/near-duplicate image finder (67B+ images) |
| **Yandex Images** | reverse-image | free | Russia | Best general reverse-image + implicit face matching |
| **Google Lens** | reverse-image | free | US | Deliberately limited face matching; good for dupe images |
| **Clearview AI** | face-database | restricted | US | LE-only (not scannable) but has CCPA/GDPR opt-out right |

All data verified April 2026. Catalog at [`src/face-scanner/face-services-catalog.json`](src/face-scanner/face-services-catalog.json). 8-field JSON per service plus `scanWalkthrough` + `optOutWalkthrough` objects with steps/verification/tier-overrides. PRs welcome.

### Why face-search is uniquely damaging

- **Irreversible once indexed.** Removing one photo from one social network doesn't remove it from PimEyes's index. You need opt-out directly.
- **Consent asymmetry.** You never consented to be in Clearview's 40B-image database. They scraped you regardless.
- **No market solution.** The ones that charge you money (DeleteMe etc.) don't cover this. There's no "face-search DeleteMe" — Vanish is it.
- **Legal rights exist but aren't surfaced.** Most people don't know CCPA and GDPR give them deletion rights against even Clearview. Vanish generates the request for you.

---

## 🛡️ NCII / Unauthorized Content Takedown

For anyone facing **leaked, scraped, reuploaded, or non-consensually-distributed** intimate content. This covers a privacy need that is completely ignored by DeleteMe, Optery, and Incogni — but affects millions of people:

- Content from OnlyFans / Patreon / Fansly pirated onto aggregator sites (coomer.su, kemono.su, thothub, etc.)
- Intimate images posted by an ex-partner without consent (revenge porn)
- Deepfakes depicting you
- Screenshots from paid platforms redistributed on Telegram / Discord / Reddit
- Old content from past careers (sex work, modeling) that you want removed after a career change
- Minor-age content (any content created when you were under 18)

**Commercial privacy services cover zero of this.** Vanish is the first open-source toolkit.

### First thing to do (always): hash-register with StopNCII.org

```bash
vanish takedown --stopncii
```

**StopNCII.org is the single most effective free NCII tool in existence.** Your images **never upload** — hashes are generated locally in your browser, only the hash goes to the registry. Meta (Facebook/Instagram/Threads/WhatsApp), TikTok, Bumble, Reddit, OnlyFans, Pornhub, and Snap all scan uploads against the registry and auto-block matches. Used by 100K+ victims since 2021.

### Second: search engine removal (intimate-imagery form, not general DMCA)

```bash
vanish takedown --google-intimate --bing-removal
```

Google has a **dedicated** form for intimate imagery that processes in 24-72 hours — faster than general DMCA removal. Removes from Search + Image Search + Lens even if the source site refuses takedown.

### Third: DMCA the leak sites

```bash
vanish takedown --dmca-letter --coomer --kemono --thothub --erome \
  --name "Your Name" --email "legal@yourdomain.com" \
  --output dmca-letters.md
```

Vanish generates a DMCA §512(c) notice per site with:
- Proper sworn statement + perjury attestation
- Site-specific abuse contact email
- Approach notes ("Send to Cloudflare abuse@cloudflare.com if site refuses")
- Every draft HMAC-signed in audit log (admissible evidence later)

Catalog covers 12 common leak/aggregator sites with varying takedown difficulty ratings.

### Fourth: legal letters when DMCA isn't enough

```bash
# To an ex-partner or individual who won't stop
vanish takedown --cease-and-desist --name "..." --jurisdiction SHIELD

# Pre-suit demand before filing a civil lawsuit
vanish takedown --civil-pre-suit --jurisdiction UK

# Narrative draft for filing a police report
vanish takedown --police-report --state-statute "Cal. Penal Code §647(j)(4)"
```

Jurisdiction flags cite real law: US Shield Act (18 U.S.C. §2261A), Take It Down Act 2025, GDPR Article 17, UK Online Safety Act 2023, Canada Criminal Code §162.1, Australia Online Safety Act 2021. 48 US states have specific NCII statutes — see `cybercivilrights.org/map` for yours.

### Crisis support (built in)

```bash
vanish takedown --support
```

Surfaces:
- **Cyber Civil Rights Initiative** (US): 1-844-878-CCRI — 24/7 hotline + pro-bono lawyer network
- **Revenge Porn Helpline** (UK): +44 345 6000 459 — operator of StopNCII.org
- **eSafety Commissioner** (Australia): statutory regulator with 24h takedown enforcement power
- **NCMEC CyberTipline** (for minors, global): mandatory reporting to all US platforms + FBI

### Privacy guarantees

Vanish stores **nothing** sensitive:
- Your content does not pass through Vanish (ever — you upload to StopNCII / Google directly)
- The list of URLs you target does not persist anywhere
- The list of sites you visited is not logged
- Only the **audit trail** of what takedowns you drafted is persisted, HMAC-signed, and that's kept locally on your machine for YOUR evidence use

---

## vs. Competitors

| Feature | Vanish | DeleteMe | Optery | Incogni |
|---------|:---:|:---:|:---:|:---:|
| **Price** | Free (MIT) | $129+/yr | $99+/yr | $99+/yr |
| **Data brokers covered** | 210 | 750+ | 350+ | 180+ |
| **🤖 AI training exposure scan** | ✅ **30 platforms** | ❌ | ❌ | ❌ |
| **🤖 AI training opt-out walkthroughs** | ✅ **26 platforms** | ❌ | ❌ | ❌ |
| **👤 Face-search broker scan (PimEyes etc.)** | ✅ **8 services** | ❌ | ❌ | ❌ |
| **👤 Face-search opt-out (including Clearview AI)** | ✅ **8 services** | ❌ | ❌ | ❌ |
| **🛡️ NCII/leak-site DMCA + hash registry takedown** | ✅ **12 leak sites + StopNCII** | ❌ | ❌ | ❌ |
| **🛡️ Jurisdiction-aware legal letter generator** | ✅ **DMCA/SHIELD/EU/UK/CA/AU** | ❌ | ❌ | ❌ |
| **All 3 US credit bureaus** | ✅ | ❌ | ❌ | ❌ |
| **Open source** | ✅ | ❌ | ❌ | ❌ |
| **Self-hosted / local-first** | ✅ | ❌ | ❌ | ❌ |
| **Data never leaves your machine** | ✅ | ❌ | ❌ | ❌ |
| **Signed audit trail (HMAC)** | ✅ | ❌ | ❌ | ❌ |
| **Encrypted secret store (scrypt)** | ✅ | N/A | N/A | N/A |
| **Agent-native (conversational)** | ✅ | ❌ | ❌ | ❌ |

**The three commercial services all treat "data brokers" as the full privacy problem.** They haven't added AI training exposure (18 months of default-opt-in policy changes) or face-search broker opt-out (PimEyes, Clearview). Vanish is, as of April 2026, the only tool that covers all three categories.

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
- **AI Opt-Out Walkthroughs** — browser-assisted guided opt-out for 26 platforms with exact UI string, step-by-step instructions, tier overrides, and 60-day re-verify
- **LLM Memorization Check** — probe GPT-4o-mini and Claude 3.5 Haiku with 15 stalker-style prompts to detect if they leak your email/phone/address verbatim. First open-source tool in this space
- **AI History Cleanup Guide** — locate + delete conversation caches across 9 AI tools (Cursor, VS Code Copilot, ChatGPT Desktop, Claude Desktop, + 5 web services). Cross-platform paths, copy-paste commands
- **Training Dataset Membership Check** — real Common Crawl CDX query + walkthroughs for LAION / The Pile / C4 / WebText / RedPajama / Dolma / FineWeb
- **Third-Party AI Exposure** — catalog of 13 AI tools OTHER people use on you (Zoom AI, Otter, Fireflies, Gong, HireVue, Abridge, Nuance DAX) + jurisdiction-aware objection letter generator (GDPR / CCPA / Illinois AIVIA / NYC Local Law 144 / HIPAA)
- **Signed audit of AI opt-outs + history deletions** — HMAC-SHA256 receipts admissible as GDPR/CCPA evidence

### 👤 Face-search protection (unique to Vanish)

- **Face-Search Scanner** — directory of 8 face-recognition services (PimEyes, FaceCheck.ID, FindClone, Lenso, TinEye, Yandex Images, Google Lens, Clearview AI) with per-service walkthroughs for checking yourself. Vanish never handles your photo
- **Face-Search Opt-Out** — browser-assisted deletion requests for all 8 including **Clearview AI** (LE-only database, only accessible via CCPA/GDPR legal right)
- **Jurisdiction-aware** — CCPA/GDPR legal citations pre-composed per service; 60-day reverify for slow services like Clearview

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
- **315 Tests** — unit + integration + CLI + e2e against `postman-echo.com`, every commit runs on Ubuntu/macOS/Windows × Node 20/22 (6 matrix jobs)

### 🛡️ NCII / leak content takedown (unique to Vanish)

- **Takedown orchestrator** (`vanish takedown`) — unified tool for removing non-consensual intimate imagery (NCII), pirated creator content, revenge-posts, deepfakes, and career-change legacy content
- **Hash registry integration** — walkthroughs for StopNCII.org / Meta NCII / NCMEC CyberTipline (your images stay local, only hashes go to the registry)
- **12 leak-site DMCA catalog** — coomer, kemono, thothub, Pornhub, XVideos, Telegram, Discord, Reddit, Twitter/X + more with per-site abuse contact + approach
- **Google intimate-imagery form** (24-72h processing, faster than general DMCA)
- **4 legal letter templates** — DMCA §512(c), Cease & Desist, police report narrative, civil pre-suit demand — all with jurisdiction-aware citations (Shield Act, Take It Down Act, GDPR, UK Online Safety Act, Canada §162.1, Australia OSA)
- **Crisis support built in** — CCRI 24/7 hotline, Revenge Porn Helpline UK, Australia eSafety, NCMEC

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

# Face-search exposure scan — is your selfie on PimEyes, FaceCheck, etc.?
# Vanish never handles your photo — opens each service's page, tells you what to do.
vanish face-scan --pimeyes --facecheck --findclone    # the essential 3
vanish face-scan --all                                 # all 7 scannable services
vanish face-scan --free-only                           # skip paid-only services
vanish face-scan --use pimeyes,tineye,yandex          # CSV alt

# Covered (8 services): PimEyes (freemium), FaceCheck.ID (freemium), FindClone (paid),
# Lenso (freemium), TinEye (free), Yandex Images (free), Google Lens (free),
# Clearview AI (restricted — LE-only but has legal opt-out path).

# Face-search opt-out — request removal including from Clearview AI
vanish face-opt-out --pimeyes --clearview              # the two most important
vanish face-opt-out --all                              # every service including LE-only databases

# Each walkthrough handles: form upload of photos, government ID verification where
# required, CCPA/GDPR citation text pre-composed. 30-day reverify default,
# 60-day for Clearview (slower processing). HMAC-signed audit trail.

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

# ── Advanced AI-era checks (5 additional subcommands) ──

# LLM memorization probe — is your personal info already in GPT-4 / Claude?
# Requires OPENAI_API_KEY / ANTHROPIC_API_KEY env vars (or --dry-run for CI)
vanish llm-memory-check --name "Your Name" --email "you@example.com"
vanish llm-memory-check --name "Your Name" --dry-run    # no API calls

# Training-dataset membership — check if your URL is in Common Crawl / Pile / C4 / ...
vanish dataset-check --url https://your-site.com --all
vanish dataset-check --walkthrough-only --all            # no network, research mode

# Third-party AI objection letters (tools OTHERS use on you)
# Generates jurisdiction-cited objection letters (GDPR / CCPA / HIPAA / Illinois AIVIA / NYC LL144)
vanish third-party-ai --zoom --otter --jurisdiction EU    # workplace meetings
vanish third-party-ai --hirevue --jurisdiction IL         # AI interview accommodation
vanish third-party-ai --abridge --nuance --jurisdiction HIPAA  # medical AI decline

# AI conversation history cleanup across Cursor, VS Code Copilot, Claude/ChatGPT Desktop + 5 web services
vanish clean-ai-history --cursor --vscode-copilot --chatgpt
vanish clean-ai-history --all --local-only     # just the files on disk

# NCII / leaked content takedown — DMCA + StopNCII.org + Google intimate-imagery removal
vanish takedown --stopncii                     # hash-register (most effective free tool)
vanish takedown --google-intimate              # Google intimate-imagery form
vanish takedown --dmca-letter --all-leak-sites --name "..." --email "..."
vanish takedown --support                      # crisis hotlines + legal aid

# Queue management
vanish queue list
vanish queue retry --id <retryItemId>
vanish queue resolve --id <manualReviewId> --resolution resolved

# Local dashboard (static HTML, no backend)
vanish dashboard data/queue-state.json
# Open dashboard/index.html in browser

# Proof report (audit trail in Markdown)
vanish report ./path/to/execution-result.json

# All 315 tests (109 broker + 19 share-card + 22 ai-scan + 13 ai-opt-out + 23 face-scan + 30 llm-memory-check + 24 clean-ai-history + 20 dataset-check + 25 third-party-ai + 31 takedown + 26 verify incl. kind dispatch)
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
├── face-scanner/               # 👤 Face-search services engine (8 services)
│   ├── face-services-catalog.json  # PimEyes, FaceCheck, FindClone, Lenso, Yandex,
│   │                                # Google Lens, TinEye, Clearview AI
│   └── face-scan-engine.mjs    # Service directory + scan/opt-out plan builders
├── llm-memory/                 # 🧠 LLM memorization probing (15 probes × 2 providers)
│   ├── probe-catalog.json      # Stalker-style probe prompts
│   └── memory-check-engine.mjs # OpenAI + Anthropic clients + leak detection
├── ai-history/                 # 🧹 AI tool history discovery + deletion commands
│   ├── history-catalog.json    # 9 tools × per-OS paths + web walkthroughs
│   └── history-engine.mjs      # Path resolution + size reporting + filters
├── dataset-check/              # 📚 Training dataset membership
│   ├── datasets-catalog.json   # 8 datasets: CC, LAION, Pile, C4, WebText, RedPajama, Dolma, FineWeb
│   └── dataset-check-engine.mjs # Real Common Crawl CDX API query + mock fetch injection for tests
├── third-party-ai/             # ⚖️ AI tools others use on you + objection letter generator
│   ├── third-party-catalog.json # 13 tools (workplace/HR/medical) + 4 letter templates
│   └── third-party-engine.mjs  # Context grouping + jurisdiction clause selection + letter render
├── takedown/                   # 🛡️ NCII / leaked content takedown orchestrator
│   ├── takedown-catalog.json   # 12 leak sites + 4 search engines + 3 hash registries
│   │                             # + 4 legal templates + crisis support resources
│   └── takedown-engine.mjs     # Letter rendering + jurisdiction clause + DMCA planner
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
scripts/                        # CLI entry points (scan, ai-scan, face-scan, llm-memory-check,
                                #   dataset-check, third-party-ai, opt-out, ai-opt-out,
                                #   face-opt-out, clean-ai-history, takedown, verify, ...)
tests/                          # 315 tests across 26 files
web/                            # Static web app v2 (Vite + vanilla JS) — 3 tabs: broker scan,
                                #   AI training checkbox grid, face-search directory. Shares
                                #   src/scanner + src/ai-scanner + src/face-scanner catalogs.
                                #   Produces triple-threat 1200×630 share card.
```

---

## Status & Roadmap

**Shipped (v0.3-unreleased)**:
- ✅ **210-broker catalog** with verified opt-out URLs (up from 23 in v0.1)
- ✅ **58 browser-assisted broker opt-outs** including all 3 US credit bureaus
- ✅ **30 AI platforms** cataloged (ChatGPT, Claude, Gemini, LinkedIn, Reddit, Cursor, …)
- ✅ **26 AI platforms with walkthrough opt-outs** — exact toggle names + tier overrides
- ✅ **8 face-search services** cataloged (PimEyes, FaceCheck.ID, FindClone, Lenso, TinEye, Yandex, Google Lens, Clearview AI)
- ✅ **8 face-search opt-out walkthroughs** including Clearview AI CCPA/GDPR request
- ✅ **LLM memorization check** — probes GPT-4o-mini + Claude 3.5 Haiku via user's API keys, detects verbatim leaks of email/phone/workplace
- ✅ **AI history cleanup guide** — 9 tools (Cursor, VS Code Copilot, ChatGPT/Claude Desktop, + 5 web) with per-OS paths and copy-paste delete commands
- ✅ **Training dataset membership check** — real Common Crawl CDX query + walkthroughs for LAION/Pile/C4/WebText/RedPajama/Dolma/FineWeb
- ✅ **Third-party AI exposure** — 13 tools (Zoom AI/Otter/Fireflies/Gong/HireVue/Abridge/Nuance/...) with jurisdiction-aware objection letter generator (GDPR/CCPA/HIPAA/...)
- ✅ **NCII / leak-content takedown** — 12 leak sites + StopNCII hash registry + Google intimate-imagery form + 4 legal templates (DMCA/C&D/police report/civil pre-suit) with SHIELD/Take-It-Down/GDPR/UK OSA/Canada/AU citations
- ✅ **Heuristic privacy scanner** (0-100 score, 5-factor confidence, per-broker risk)
- ✅ **18-state wizard** with scan → handoff → cleanup flow
- ✅ **30-day HTTP verify loop** for brokers, **60-day reverify** for AI platforms
- ✅ **Static web app v2** at [ramboxie.github.io/vanish](https://ramboxie.github.io/vanish/) — zero-install, 100% client-side, now with 3 tabs (broker / AI training / face search)
- ✅ **Triple-threat share card (v2)** — 1200×630 SVG with 3 columns (broker + AI + face), auto-upgrades when user scans multiple threats in the same session
- ✅ **Audit, queues, secret store hardened** (HMAC-SHA256, scrypt KDF, stale-lock detection)
- ✅ **315 tests** passing across Ubuntu/macOS/Windows × Node 20/22 (6 matrix jobs)

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
