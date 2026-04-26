# r/privacy — Launch Post (T+48h, after HN)

## Why wait

r/privacy has strict posting rules (account karma + age). If your account is
new/low-karma, launch here AFTER HN so you can use the HN discussion URL as a
social-proof anchor. Mods are more lenient when there's existing community
validation.

## Target subreddit
https://www.reddit.com/r/privacy/submit

Secondary:
- r/PrivacyGuides (more strict, has banned self-promo; wait until someone
  else mentions Vanish first)
- r/selfhosted (welcoming to OSS tools, less privacy-specific)
- r/opensource (goodwill, broader audience)

## Title

```
[Open source] Vanish v0.3 — privacy toolkit covering 7 AI-era threats: data brokers, AI training, face-search (PimEyes/Clearview), NCII takedown, workforce monitoring, dataset membership, LLM memorization. Free, local-first, MIT.
```

**Alternative titles** (pick by current news cycle):
- `[Open source] First open-source tool to detect employer-installed workforce-monitoring agents (ActivTrak/Teramind/etc) + generates BIPA + NY EMA + GDPR Art 88 objection letters`
- `[Open source] Open-source NCII takedown toolkit — StopNCII hash registry + DMCA letters for 12 leak sites + Google intimate-imagery removal in one CLI`
- `[Open source] Made a privacy scanner that also checks which AI companies have memorized your phone number (yes, GPT-4 might know it)`

**Key phrases that help pass mod filters**:
- "Open source" in brackets = legit signal
- "Free, local-first, MIT" = matches r/privacy values
- Link to specific sub-feature (workforce monitoring / NCII / LLM memorization) in alt titles — different angles draw different commenters

## Body (use Markdown)

```markdown
Hi r/privacy! 

I've been frustrated by the DeleteMe / Optery / Incogni pricing ($99-$129+/yr)
for what's essentially filling opt-out forms, waiting for email confirmation,
and re-checking in 30 days. So I built [Vanish](https://github.com/RAMBOXIE/vanish) —
an open-source alternative.

**What it does (v0.3, just shipped)**:

Vanish covers **7 distinct privacy threats** across 11 CLI subcommands. The
first three are the "DeleteMe-alternative" core; the next four are AI-era
threats commercial services don't touch.

🏢 **Data brokers (210)** — `vanish scan` (local heuristic, 0-100 score, zero
network), `vanish opt-out --broker X` (browser-assisted for 58 incl. all 3
credit bureaus), `vanish verify` (30-day HTTP liveness re-check)

🤖 **AI training exposure (30 platforms)** — `vanish ai-scan` classifies
ChatGPT, Claude, Gemini, Copilot, LinkedIn, Reddit, Twitter/X, Meta AI,
Cursor, GitHub Copilot, Grammarly + 19 others. LinkedIn flipped to ON in
Sept 2024, Reddit signed a $60M/yr Google deal, Twitter feeds Grok, Meta
forced GDPR objections — Vanish maps each platform's tier rules
(Team/Enterprise often opted-out by default).

👤 **Face-search (8 services incl. Clearview AI)** — `vanish face-scan`
+ `vanish face-opt-out` for PimEyes / FaceCheck.ID / FindClone / Lenso /
TinEye / Yandex / Google Lens / Clearview. Vanish never uploads your
photo — opens each service's own page. Clearview AI is LE-only but you
have CCPA/GDPR deletion rights.

🛡️ **NCII / leak content takedown** — `vanish takedown` covers StopNCII.org
hash registration (your images stay LOCAL, only hashes upload), Google's
intimate-imagery removal form (faster than general DMCA), DMCA §512(c)
letters for 12 leak/aggregator sites (coomer / kemono / thothub / etc.),
plus Cease & Desist + police report + civil pre-suit demand templates.
Jurisdictions: US Shield Act + Take It Down Act 2025, GDPR Art 17, UK
Online Safety Act, Canada §162.1, Australia OSA. Crisis hotlines (CCRI,
Revenge Porn Helpline UK) built in via `vanish takedown --support`.

⚖️ **Third-party AI + workforce-monitoring** — `vanish third-party-ai` covers
22 tools: meeting AI (Zoom / Otter / Fireflies / Gong / Read.ai), HR/medical
(HireVue / Pymetrics / Abridge / Nuance DAX), AND **8 commercial workforce-
monitoring agents** (ActivTrak / Teramind / Hubstaff / Time Doctor /
Insightful / Veriato / InterGuard / MS Viva Insights). The flag
`--detect-installed` scans your machine for any of the 8 and embeds the
found install paths into the objection letter as forensic evidence. Cites
real law per jurisdiction: NY Electronic Monitoring Act §52-c (2022),
Illinois BIPA 740 ILCS 14/ ($1k-$5k stat damages for keystroke biometric
collection), German BetrVG §87 (works council co-determination), GDPR Art 88
(employment-context proportionality).

🧠 **Deep checks (research-grade)**:
- `vanish llm-memory-check` — 15 stalker-style probes against GPT-4o-mini
  + Claude 3.5 Haiku via your own API key. Detects verbatim leaks of
  email/phone/workplace. **First open-source tool to do this for arbitrary
  individuals.** Cost ~$0.01.
- `vanish dataset-check --url X` — REAL Common Crawl CDX query + walkthroughs
  for The Pile / C4 / LAION / RedPajama / Dolma / FineWeb / WebText.
- `vanish clean-ai-history` — locate AI conversation caches across 9 tools
  (Cursor, VS Code Copilot, ChatGPT/Claude Desktop, web services). Prints
  exact shell command. Vanish never runs `rm` for you.

**Audit trail**: Every confirmed action is HMAC-SHA256 signed in the local
queue state. Admissible as evidence later (relevant for GDPR Art 21
objections, CCPA "Do Not Sell" disputes).

**Differentiation vs commercial services**:

| | Vanish | DeleteMe | Optery | Incogni |
|--|:--:|:--:|:--:|:--:|
| Price | Free (MIT) | $129+/yr | $99+/yr | $99+/yr |
| Data brokers | 210 | 750+ | 350+ | 180+ |
| All 3 US credit bureaus | ✅ | ❌ | ❌ | ❌ |
| AI training exposure (30 platforms) | ✅ | ❌ | ❌ | ❌ |
| Face-search (PimEyes / Clearview) | ✅ | ❌ | ❌ | ❌ |
| NCII / leak-site DMCA + StopNCII | ✅ | ❌ | ❌ | ❌ |
| Workforce-monitoring detection | ✅ | ❌ | ❌ | ❌ |
| LLM memorization probe | ✅ | ❌ | ❌ | ❌ |
| Training-dataset membership check | ✅ | ❌ | ❌ | ❌ |
| Open source | ✅ | ❌ | ❌ | ❌ |
| Local-first (no data sent) | ✅ | ❌ | ❌ | ❌ |

**Honest limits** (don't want to oversell):
- Captchas + email links are your job (no 2captcha integration)
- Workforce-monitoring detection is **best-effort** — paths are based on
  vendor docs, not live-verified on real installs (PRs welcome)
- Letters cite real law but I'm not a lawyer; consult one for enforcement
- LLM memory check requires your own OpenAI / Anthropic API key (`--dry-run`
  uses a mock provider for testing without keys)
- 58/210 brokers for browser-assisted opt-out; rest are scan-only triage
  blueprints with verified opt-out URLs

**HN discussion** (if useful context):
[link to your HN Show HN post — update this before submitting]

**Try it**:
```bash
# Browser (broker scan + AI scan + face directory)
https://ramboxie.github.io/vanish/

# Broker scan (10s, zero network)
npx github:RAMBOXIE/vanish scan --name "Your Name"

# AI training exposure (no personal info, just platform names)
npx github:RAMBOXIE/vanish ai-scan --all

# Face-search audit (Vanish never uploads your photo)
npx github:RAMBOXIE/vanish face-scan --pimeyes --facecheck

# Workforce-monitoring detect on your work device
npx github:RAMBOXIE/vanish third-party-ai --detect-installed

# NCII takedown — start with StopNCII.org hash registration
npx github:RAMBOXIE/vanish takedown --stopncii

# Any concerns? See crisis hotlines + legal aid:
npx github:RAMBOXIE/vanish takedown --support
```

Would love to hear:
- Which brokers I'm missing that r/privacy folks care about?
- Non-US brokers I should prioritize (EU/UK/JP/etc.)?
- Which AI platforms should I add next? (current list leans US/EN)
- Anyone with Teramind / ActivTrak installed who can verify our detection
  paths against the real install? (would take ~10 min — just run
  `--detect-installed` and report whether install paths match)
- Anyone tried the commercial services — what did they do well that I
  should emulate?

Happy to answer any questions about the architecture, security model, or
why I made specific design choices.
```

## Rules to follow

1. **No link in the title** (Reddit penalizes self-promo)
2. **Answer every comment** for first 24 hours
3. **Never argue with criticism** — acknowledge and iterate
4. **Don't ask for upvotes** — Reddit will remove your post
5. **Respond to mods quickly** if they request clarification

## Karma farming (if account is too new)

Before posting:
- Answer 5-10 genuine questions in r/privacy (spread over a week)
- Avoid promoting yourself in those answers
- Get to 50+ comment karma before self-promoting

If your account is <30 days old, wait — or ask a trusted collaborator with
established karma to post for you (but be transparent about authorship).
