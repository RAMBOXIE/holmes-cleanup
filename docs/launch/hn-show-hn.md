# Hacker News Show HN — Launch Post

## Target submission page
https://news.ycombinator.com/submit

## Title (copy exactly, < 80 chars)

```
Show HN: Vanish – open-source privacy toolkit for the AI era
```

**Strong alternative titles** (pick whichever feels best given current news cycle):
- `Show HN: Vanish – scan brokers, AI training, face-search, dataset membership`
- `Show HN: Vanish – DMCA letter generator + workforce-monitoring detector + 210 data brokers`
- `Show HN: Vanish – privacy toolkit covering 7 AI-era threats (NCII, BIPA, GDPR Art 88)`
- `Show HN: Vanish – check if GPT-4 has memorized your phone number (and 10 other things)`

**Older v0.2-style fallback** (if you want to lead with the broker comparison):
- `Show HN: Vanish – open-source DeleteMe alternative + AI training opt-out`

## URL field

```
https://github.com/RAMBOXIE/vanish
```

**Do not fill the Text field** when submitting. HN convention: Show HN posts
that have both a URL and Text are split oddly. Submit URL-only.

## Author comment (post as the FIRST comment yourself, immediately after)

```
Hi HN! Author here. Quick context on why this exists:

I started this as a free DeleteMe-alternative for data brokers. What it
became (v0.3, just shipped): an open-source toolkit that covers SEVEN
AI-era privacy threats most commercial services don't touch.

== The 11 subcommands across 5 threat surfaces ==

🏢 DATA BROKERS (the original DeleteMe-style scope)
• `vanish scan` — local heuristic across 210 brokers, 0-100 score, zero
  HTTP. Pure local computation. Browser version at
  ramboxie.github.io/vanish/
• `vanish opt-out --broker X` — browser-assisted walkthrough for 58
  brokers including all 3 US credit bureaus. Vanish opens the real
  opt-out URL, pre-fills data into your clipboard, you solve captcha
  and click submit. (Captchas are YOUR job — refusing 2captcha keeps
  the zero-cost promise.)
• `vanish verify` — 30-day HTTP liveness check on submitted profile
  URLs. Removed / still-present / unknown classification.

🤖 AI TRAINING EXPOSURE (every platform flipped to opted-in 2024-2025)
• `vanish ai-scan` — classify 30 LLM platforms as exposed / licensed /
  safe / action-needed. Zero personal data collected; takes only
  platform names.
• `vanish ai-opt-out --chatgpt --linkedin --cursor` — browser-assisted
  walkthrough with EXACT toggle name + tier overrides
  ("ChatGPT Team is already opted-out, skip"). 60-day reverify because
  platforms silently reset settings.

👤 FACE-SEARCH (PimEyes / Clearview / FindClone / etc.)
• `vanish face-scan` + `vanish face-opt-out` — directory of 8 services
  including Clearview AI (you can't search yourself but have CCPA/GDPR
  deletion rights). Vanish never uploads your photo — opens each
  service's own page.

🛡️ NCII / LEAK TAKEDOWN (the gap nobody fills)
• `vanish takedown --stopncii --google-intimate --dmca-letter
  --all-leak-sites` — hash-register with StopNCII.org (your images
  stay LOCAL, only hashes upload), Google's intimate-imagery
  removal form, plus DMCA §512(c) notices for 12 leak/aggregator
  sites (coomer / kemono / thothub / etc.). 4 legal letter
  templates with jurisdiction-cited clauses (DMCA, Shield Act,
  Take It Down Act 2025, GDPR Art 17, UK OSA, Canada §162.1, AU OSA).

⚖️ THIRD-PARTY AI (tools OTHERS use on you, including the Meta-memo case)
• `vanish third-party-ai --teramind --activtrak --detect-installed
  --jurisdiction US-state-IL-BIPA` — local scan for 8 commercial
  workforce-monitoring agents (ActivTrak / Teramind / Hubstaff / Time
  Doctor / Insightful / Veriato / InterGuard / MS Viva Insights), then
  generates a BIPA-cited objection letter with detected install paths
  embedded as forensic evidence. Cites real law: NY Electronic
  Monitoring Act §52-c, Illinois BIPA 740 ILCS 14/, German BetrVG §87,
  GDPR Art 88. Also covers meeting AI (Zoom / Otter / Fireflies / Gong)
  and HR/medical AI (HireVue / Pymetrics / Abridge / Nuance DAX).

🧠 DEEP CHECKS (research-grade)
• `vanish llm-memory-check --name "X" --email X@Y` — sends 15 stalker-
  style probe prompts to GPT-4o-mini + Claude 3.5 Haiku via your own
  API keys, reports verbatim-leak rate. First open-source tool to do
  this for arbitrary individuals. ~$0.01/scan.
• `vanish dataset-check --url X --all` — REAL Common Crawl CDX query
  + walkthroughs for The Pile / C4 / LAION (HIBT) / RedPajama / Dolma /
  FineWeb / WebText.
• `vanish clean-ai-history --cursor --chatgpt --claude` — locate AI
  conversation caches across 9 tools (Cursor, VS Code Copilot, ChatGPT
  Desktop, Claude Desktop, web services). Prints exact shell command;
  Vanish never runs `rm` for you.

== Things deliberately NOT done ==

No background daemons. No notification emails. No process killing.
No anti-detection. No auto-submit of legal documents. No upload of
your photos / emails / identity anywhere.

Capability matrix in the README distinguishes triage / walkthrough /
live-adapter clearly — the "210 brokers" is a triage catalog (local
scoring), 58 have walkthrough opt-out, 8 have an EXPERIMENTAL live
adapter that mostly fails on real broker captchas. The brand
honesty is the point.

== What's HMAC-signed ==

Every confirmed opt-out / takedown / objection is recorded as an
HMAC-SHA256 audit event in your local queue state. Admissible as
evidence later. Three-tier secret store with scrypt KDF if you
need credential persistence.

== Stack ==

Pure Node 20+ stdlib (zero npm deps in CLI; vite as devDep for the
web app). 346 tests / 6-matrix CI / Ubuntu/macOS/Windows × Node 20/22.
All catalogs are JSON; PRs adding a broker / AI platform / leak site
are ~10 lines.

Honest limits:
• Captchas are YOUR job (no 2captcha integration).
• Workforce-monitoring detection paths are based on vendor docs,
  not live-verified on real installs (PRs welcome).
• Letters cite real law but I'm not a lawyer; consult one for
  jurisdiction-specific enforcement.
• OpenAI/Anthropic API keys are bring-your-own; --dry-run uses a
  mock provider for testing without keys.

Would love feedback from anyone who's:
- Tried DeleteMe/Optery/Incogni and can compare
- Has experience with NY EMA / IL BIPA enforcement against employers
- Has Teramind/ActivTrak installed and wants to verify our detection
  paths against the real install (would take a 10-min PR)

https://github.com/RAMBOXIE/vanish
```

## Timing

- **Best time to submit**: Tuesday or Wednesday, 8:30–9:30 AM US Eastern
  (= Beijing 9:30 PM–10:30 PM)
- **Avoid**: Monday mornings (everyone's on email catch-up), Friday afternoons
  (crowd already checking out), weekends (front page moves slower)

## What to do in the first 2 hours (critical window)

- Check https://news.ycombinator.com/show every 10-15 min for your post
- **Reply to every single comment**, even just "thanks, that's a great point"
- If a bug is reported, don't argue — acknowledge, say "I'll fix it today"
- If negative (design critique, scope concern, legal worry), stay calm and
  respond with facts. See `response-templates.md`.

## What "success" looks like

- **>100 upvotes in 2 hours** → you're on front page; expect 5k-20k repo visits
- **>50 upvotes in 2 hours** → healthy discussion, maybe late front page
- **20-50 upvotes** → meh but useful feedback
- **<20 upvotes** → too late to worry; collect feedback, iterate, retry in 2-3 weeks

## Day-after actions (if successful)

1. Write down top 3 criticisms from comments
2. Fix the easiest one within 24h, tweet/post "updated"
3. Post to r/privacy with HN discussion URL as social proof (see `reddit-privacy.md`)
4. Submit to privacyguides.org for inclusion review
