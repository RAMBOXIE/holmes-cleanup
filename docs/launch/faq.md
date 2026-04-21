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
All three are covered in CI (6 matrix combinations × 109 tests).
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
CI runs all 109 on every commit × Ubuntu/macOS/Windows × Node 20/22
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
