# Launch FAQ — Predicted Questions & Answers

Use this during HN/Reddit comment watching. Expect these 15 questions; have
the answers ready to paste (tweak tone per platform).

---

## Technical / Privacy

### Q1: How do I know Vanish isn't stealing my data?

```
Fair question — here's how to verify:
1. Open DevTools → Network tab
2. Scan your name in the browser app
3. Confirm ZERO network requests fire during/after the scan
4. Code is MIT, on GitHub. The scanner modules (src/scanner/*) are
   <400 lines total — auditable in ~20 minutes

The broker catalog is bundled statically. All scoring is pure function:
identity → catalog → score. No I/O besides the initial static load.

For the CLI: `node scripts/index.mjs scan ...` similarly makes zero
network calls. You can run it with no internet.
```

### Q2: What does the "heuristic" score actually mean? Is it just made up?

```
It's a 5-factor weighted estimate, not a confirmed presence check:

- dataTypeCoverage (35%): overlap between what user provided
  (name/email/phone/etc.) and what each broker's category collects
- categoryRisk (25%): fixed weights per category
  (people-search=0.95, property-records=0.35)
- jurisdictionMatch (20%): US brokers match US users 1.0, else 0.3
- brokerReach (10%): category size relative to max
- optOutComplexity (10%): harder opt-out = higher score
  (data more likely still present)

Output is intentionally called "likely exposed" / "possible" /
"unlikely" — not "confirmed on". Real confirmation needs either broker
API access (most don't offer it) or Google dorks
(site:spokeo.com "Your Name"), which is planned but not yet.

The score is useful for PRIORITIZATION not enumeration.
```

### Q3: Why not use Playwright for full automation?

```
I tried to think through this honestly:
- reCAPTCHA v2 on ~87% of brokers
- email verification loops (click link within 24h) on ~62%
- CAPTCHA-solving services (2captcha ~$2/1000) break the zero-cost
  MIT promise
- Even if solved, brokers blacklist IPs that auto-submit → needs
  proxy pool ($$$)

Commercial services (DeleteMe) have lawyers + a business model to
absorb these costs. An open-source tool can't.

Browser-assisted (opens YOUR browser, you solve the captcha in 3
seconds, then Vanish records the submission) sidesteps all these
issues and adds ZERO ToS risk since you're the one submitting.

If someone wants to contribute a Playwright adapter that still
respects ToS, PRs welcome.
```

### Q4: How is this different from Google dorks?

```
Google dorks ("site:spokeo.com 'Your Name'") tell you where you're
LISTED (confirmed). Vanish's heuristic scan tells you where you're
likely EXPOSED (estimate).

Google dorks miss:
- Brokers that block Googlebot (many)
- Non-indexed profiles
- Brokers that paywall the result pages

Vanish misses:
- Confirmed specificity (we say "likely", not "definitely")

Both together would be best. Google dork verification is planned as
layer 2 — just uses significant API budget, so not in v0.2.
```

### Q5: Why MIT and not AGPL?

```
I wanted max distribution. AGPL would have prevented commercial forks
(like a SaaS wrapper), but I'd rather someone build that ecosystem than
gate-keep. If a commercial fork emerges that's worse than Vanish, users
will come back to the open source. If it's better, everyone wins.

Plus, this way DeleteMe / Optery themselves could reference the
catalog if they want to — which would be great for accuracy across
the industry.
```

---

## AI Training Exposure

### Q5.5: What's the AI training exposure scan?

```
Run `vanish ai-scan --all` (takes no personal info — just platform names).
It checks 30 LLM-training platforms and classifies each as:

- exposed: Your data is being used to train AI, default opt-in
  (LinkedIn, Twitter/X → Grok, Meta AI, ChatGPT free tier, Copilot)
- licensed: Platform already sold your content to AI companies — 
  opt-out only affects FUTURE training (Reddit → Google, Tumblr → OpenAI,
  Medium → OpenAI, Stack Overflow → OpenAI partners)
- safe: Default opted-OUT (Anthropic Claude, Notion AI enterprise plans,
  Figma, ArtStation)
- action-needed: Policy unclear, recent changes, or hard opt-out path

For each "exposed" platform you get the opt-out URL, difficulty rating,
and estimated time. Easy ones take ~60 seconds (LinkedIn, Twitter/X).
Hard ones are GDPR/CCPA email-only (Meta EU, Gmail Smart Compose).

Unique to Vanish — DeleteMe / Optery / Incogni don't cover this at all.
```

### Q5.6: Can I actually opt out of AI training, or is it theater?

```
Partial honesty is: it depends on the platform.

REAL opt-out (takes effect going forward):
- LinkedIn, Twitter/X, Meta AI, Google Gemini, ChatGPT settings
- These respect the toggle and don't train on your future data

SEMI-REAL opt-out (future-only, past is already sold):
- Reddit (your old posts are already in Google's training set — you
  can only prevent future harvesting)
- Tumblr, Medium, Stack Overflow (same story, data license already
  executed)

NEAR-IMPOSSIBLE opt-out:
- Data already scraped pre-2024 by Common Crawl, The Pile, LAION — 
  those datasets are copied thousands of times. Your 2020 Reddit
  comment is not coming out of GPT-4.

Vanish is explicit about this — each platform has a `notes` field
explaining whether opt-out is "prospective only" or actually effective.
```

### Q5.7: Why just 30 platforms? What about [platform X]?

```
30 is the launch set, covering the platforms most likely to appear
in a typical user's life:

- Chat AI: ChatGPT, Claude, Gemini, Copilot, Meta AI, Perplexity
- Social → AI: LinkedIn, Reddit, Twitter/X, Facebook, Pinterest, Quora
- Content → AI: Tumblr, Medium, Stack Overflow
- Productivity: Grammarly, Notion AI, Otter, Zoom, Slack, Gmail, Outlook
- Dev tools: GitHub Copilot, Cursor
- Creative: Adobe Firefly, Canva, DeviantArt, Shutterstock, Figma, ArtStation

Catalog is `src/ai-scanner/ai-platforms-catalog.json` — same 8-line
JSON structure per platform as brokers. PRs for additions welcome.

Next batch I'm planning: Discord (recent AI policy), Slack AI,
Perplexity Pro, Sora, Runway, Midjourney training corpus.
```

---

## Face-search (PimEyes / Clearview / etc.)

### Q5.8: Does Vanish actually upload my face anywhere?

```
NO. Vanish never sees your photo. `vanish face-scan` opens each service's
own search page in your browser — you're the one who uploads to PimEyes /
FaceCheck / etc. Vanish just maintains the service catalog (pricing,
jurisdiction, what to expect) and walks you through it.

Same with `face-opt-out` — we open the opt-out form, tell you what to
upload (your photos go to the service for identity verification, NOT
to Vanish), and record an HMAC-signed audit when you confirm submission.
```

### Q5.9: Why include Clearview AI if I can't search myself?

```
Because you have a legal right to delete yourself from Clearview's index
even though only law enforcement can search it. Under California CCPA
§1798.105 + GDPR Article 17, Clearview must delete your biometric data
on request — and they comply, despite being a closed-to-public LE-only
database. Vanish's `face-opt-out --clearview` walkthrough generates the
exact CCPA/GDPR-citing request with government-ID verification template.

Illinois residents have stronger BIPA rights — Clearview was banned from
collecting biometric data of IL residents and ordered to delete past
collections (2022 ACLU settlement).
```

---

## NCII / leak content takedown

### Q5.10: My intimate photos got leaked — what should I do FIRST?

```
StopNCII.org. Hash-register your images there before anything else.
`vanish takedown --stopncii` walks you through it.

StopNCII is operated by the Revenge Porn Helpline UK in partnership with
Meta, TikTok, Bumble, Reddit, OnlyFans, Pornhub, Snap, and others. Your
images are processed LOCALLY in your browser — only cryptographic hashes
upload. The participating platforms then auto-block matching uploads
going forward. ~100K victims have used it since 2021. Free.

Then run `vanish takedown --google-intimate` for Google's dedicated
intimate-imagery removal form (24-72h processing — faster than general
DMCA). Then `vanish takedown --dmca-letter --all-leak-sites` to draft
DMCA notices for the 12 leak/aggregator sites we have catalogued.

If you're in immediate crisis: `vanish takedown --support` prints
hotlines (CCRI 1-844-878-CCRI in the US, Revenge Porn Helpline UK,
Australia eSafety Commissioner).
```

### Q5.11: Is Vanish for OnlyFans regret specifically?

```
No — it's for ANY non-consensual or unwanted intimate imagery situation:
- Ex-partner posting revenge porn
- Deepfakes depicting you
- Pirated paid creator content (OnlyFans / Patreon / Fansly)
- Career-change legacy content (sex work, modeling)
- Minor-age content (any content from when you were under 18 — separate
  CyberTipline path via NCMEC)

Catalog terminology is deliberately neutral. The toolkit doesn't judge
why you need takedown support — it just gives you the most effective
free tools (StopNCII first), the dedicated search-engine forms, the
DMCA letter generator with proper §512(c) sworn-statement format, and
jurisdiction-aware C&D / police report / civil pre-suit demand templates.
```

### Q5.12: Are the legal templates actually legally sound?

```
They cite real law (DMCA §512(c), Shield Act 18 U.S.C. §2261A, Take It
Down Act 2025, GDPR Art 17, UK Online Safety Act 2023, Canada §162.1,
Australia OSA 2021, 48 US state NCII statutes via cybercivilrights.org/map),
include the standard sworn-statement + perjury attestation language for
DMCA, and follow the structure that reasonable people sending these
letters use.

That said: I'm not a lawyer, the templates aren't legal representation,
and jurisdiction-specific enforcement varies. They're starting points —
consult a privacy attorney for high-stakes situations. Cyber Civil Rights
Initiative (cybercivilrights.org) has a pro-bono lawyer network that
Vanish surfaces via `--support`.
```

---

## Workforce-monitoring (Meta-memo case)

### Q5.13: Can Vanish detect Teramind / ActivTrak on my work computer?

```
Best-effort yes. `vanish third-party-ai --detect-installed` scans your
machine for the documented default install paths of 8 commercial
workforce-monitoring vendors: ActivTrak, Teramind, Hubstaff, Time
Doctor, Insightful, Veriato, InterGuard, Microsoft Viva Insights.

A POSITIVE detection is strong forensic evidence — install paths get
embedded in the objection letter as an exhibit. A NEGATIVE detection
does NOT prove you aren't being monitored: vendors can use stealth
installs at randomized paths, or your employer might have built
internal tooling (the Meta-memo case). Use `--employer-internal`
flag in that case to generate a generic disclosure-demand letter.
```

### Q5.14: Will Vanish kill the monitoring process or block its phone-home?

```
NO. That's anti-malware territory and explicitly out of scope. Vanish
does:
  ✓ Identify what's installed
  ✓ Print the path so you can document it
  ✓ Generate a jurisdiction-cited objection letter (NY EMA / IL BIPA /
    German BetrVG §87 / GDPR Art 88)
  ✓ Embed detected paths into the letter as forensic evidence

Vanish does NOT:
  ✗ Kill processes
  ✗ Block network traffic
  ✗ Provide anti-detection
  ✗ Tamper with the monitoring agent

Going beyond identification + legal-request would (a) likely violate
employer ToS and possibly CFAA, (b) blur Vanish's "open-source privacy
toolkit" identity into "employee anti-surveillance SaaS" territory.
```

### Q5.15: I'm in Illinois. Is keystroke logging actually a BIPA violation?

```
Plausibly yes, and there are pending class actions on this exact theory.
Illinois BIPA (740 ILCS 14/) defines "biometric identifier" to include
identifying patterns derived from physiological behavior. Keystroke
dynamics (typing rhythm, hold-times, flight-times) and mouse-movement
signatures are increasingly used by monitoring tools as user
authentication / identification — which courts have begun treating as
biometric collection requiring written informed consent + retention
schedules + $1,000-$5,000 per-violation statutory damages.

`vanish third-party-ai --teramind --jurisdiction US-state-IL-BIPA`
generates the demand letter citing BIPA + statutory damages
calculation. Standing for class action requires actual collection
without proper consent — your detected install paths help establish
that.

Not legal advice. Talk to an Illinois employment-rights attorney before
filing.
```

---

## Scope / Roadmap

### Q6: Why only 58 browser-assisted out of 210?

```
Each browser-assisted broker required research to document:
- The exact opt-out URL
- Required form fields (name / email / profile URL / etc.)
- Captcha type (reCAPTCHA v2 / hCaptcha / display code / none)
- Whether email verification is required
- Processing time (for the 30-day verify timing)

I did 58 (including all 3 credit bureaus + top people-search + B2B
marketing data firms). The remaining 152 have verified opt-out URLs
in the catalog but haven't been researched yet. PRs welcome — each
one is an 8-line JSON entry.

The 58 are prioritized by: (a) real-world impact, (b) search
visibility, (c) known fluency in their opt-out processes.
```

### Q7: What about [broker X]? Why isn't it included?

```
Good catch. Can you open an issue with the broker's name + opt-out
URL? Each broker is a ~8-line JSON entry in
src/adapters/brokers/config/broker-catalog.json — I'll add it or
welcome a PR.

Priority for next batch is:
- US: Checkr, Sterling, HireRight (background check gap)
- EU: SCHUFA, CRIF, Experian UK (GDPR-specific)
- Paid-only: Melissa, BlueKai advanced tiers
```

### Q8: Does this work outside the US?

```
Mostly no — and I'm honest about it in the README. The algorithm
defaults to US jurisdiction, and 208/210 brokers in the catalog are
US-based.

For EU users: scan will work but the score will be artificially low
(US brokers don't apply to you). I plan to add EU GDPR-focused
brokers (SCHUFA, CRIF, etc.) in the next batch — happy to take
contributions from EU users who know the local ecosystem.

For Chinese users: completely different broker landscape (几乎无参考
价值). If anyone wants to build a China-focused version, the catalog
format is clean enough to extend.
```

### Q9: Windows / macOS / Linux support?

```
All three are covered in CI (6 matrix combinations × 346 tests).
Developed primarily on Windows, tested via GitHub Actions on Ubuntu,
macOS, Windows × Node 20, Node 22.

Hand-testing the interactive opt-out flow across all 3 OSes would be
valuable — if you hit an issue, please open a ticket.
```

### Q10: Mobile? Browser extension?

```
Neither yet. Both are in my idea list but not committed:
- Browser extension: autofill opt-out forms on broker sites directly
- Mobile: probably a React Native wrapper around the web app

Browser extension is probably more impactful — injects directly where
the user is (the broker page). But Chrome Web Store has a >6 week
review process for anything touching personal data, and I haven't
budget for that yet.
```

---

## Business / Ethics

### Q11: Are you going to monetize this later?

```
Not planning to. If the project gets significant traction and there's
a clear demand for hosted/automated version, I'd consider:
- A commercial fork with Playwright automation (the hard 20% I refuse
  to do in the free version)
- Paid priority support
- Enterprise features (multi-user / team dashboards)

But the MIT-licensed open-source Vanish will always exist and be
feature-complete for the "do it yourself" path. No bait-and-switch.
```

### Q12: Isn't comparing yourself to DeleteMe legally risky?

```
Truthful comparative advertising is protected under US Lanham Act
§43(a), EU Directive 2006/114/EC, and similar frameworks. Bitwarden
("1Password alternative"), Signal ("WhatsApp privacy"), ProtonMail
("Gmail alternative") all do this routinely.

Pricing shown ($129+/yr) uses entry-level figures with a "+" to
indicate tiered pricing. Full trademark notice in the repo footer.
No affiliation claimed.

If DeleteMe sends a cease-and-desist (probability ~0.1% for an
open-source tool), the response is to thank them and verify all
factual claims are still accurate.
```

### Q13: What happens when brokers change their opt-out forms?

```
They will. Happens every 3-6 months. Solutions:
1. Community reports via the "broker-broken" issue template
2. Updated flow shipped in a 15-minute PR per broker
3. `vanish verify` will flag profiles that return unusual statuses,
   which is an early signal something changed

For launch readiness: every broker's flow was verified within the
last 30 days. I'll do re-verification sprints quarterly.
```

---

## Performance / Quality

### Q14: How large is the bundle?

```
Web app:
- HTML: 4.92 KB (1.82 KB gzipped)
- CSS: 7.13 KB (2.04 KB gzipped)
- JS: 145 KB (23 KB gzipped, includes the full 210-broker catalog)
- Total gzipped: ~27 KB

Loads in <1 second on 4G. Zero external dependencies (no CDN, no
fonts, no analytics).

CLI: pure Node 20+ stdlib. Zero npm dependencies (besides vite as a
devDep for the web app). `npx github:...` pulls ~500 KB.
```

### Q15: How confident are you in the 109 test count?

```
CI runs all 346 on every commit × Ubuntu/macOS/Windows × Node 20/22
= effectively 654 test executions per push. Failure in any matrix
blocks merge.

Coverage is guardrails-first:
- Safety gates (triple confirm, export decision, manual trigger)
- Queue state persistence + stale-lock detection
- HMAC signing + timing-safe verification
- 210-broker catalog validation
- 58 optOutFlow entries validated
- Share card privacy (no identity fields leak)
- Live HTTP submission against postman-echo

What's NOT tested: real broker sites (ethically, we don't hit them
from CI). Integration testing happens via the verify command's
30-day loop against real URLs.
```

---

## Use for response templates

When answering, DON'T paste entire sections verbatim — that looks
robotic. Take the core answer and rephrase in 1-2 sentences with
a link to the full explanation on GitHub.
