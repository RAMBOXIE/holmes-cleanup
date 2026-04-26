# Launch Materials

Pre-written posts and response templates for launching Vanish to the
privacy / open-source community.

**Before launching, also do**:
1. (Optional) Record a 30-second asciinema or gif demo — `vanish ai-scan --all`
   has the strongest visual punch (colored banner + score + quick wins)
2. Verify GitHub Pages is live at https://ramboxie.github.io/vanish/
3. Run `npm test` one last time (expect 129 passing — 109 original + 20 ai-scan)

## Positioning (v0.3 — 7 threats, 11 subcommands)

The launch story has expanded from "DeleteMe alternative + AI scan" (v0.2)
to "open-source toolkit covering the full AI-era privacy surface" (v0.3).
Pick the angle that matches the audience:

### For HN (engineering-minded)
**Lead with the capability matrix.** HN respects honest distinction
between triage / walkthrough / live-adapter (most privacy tools blur
these). The "Capability matrix" section in the README is the strongest
artifact — it shows we know exactly what does and doesn't work.

Title candidates: "Vanish — open-source privacy toolkit for the AI era"
or "Vanish — DMCA letter generator + workforce-monitoring detector +
210 data brokers"

### For r/privacy (rights-minded, news-aware)
**Lead with the most timely sub-feature.** r/privacy has been discussing
LinkedIn's Sept 2024 AI flip, Reddit's Google deal, the Meta workforce-
monitoring memo, the Take It Down Act (2025), and BIPA class actions
against employers using keystroke biometrics. Vanish has CLI commands
that map 1:1 to these news cycles.

Title candidates: "First open-source tool to detect employer-installed
workforce-monitoring agents + generate BIPA / NY EMA / GDPR Art 88
objection letters" or "Open-source NCII takedown toolkit (StopNCII +
DMCA + Google intimate-imagery removal in one CLI)"

### For r/selfhosted, r/opensource (technical-but-pragmatic)
**Lead with the brand honesty.** Capability matrix + Non-goals + Clawhub
compliance test. "We don't kill processes, don't send notifications,
don't auto-submit. Identification + jurisdiction-cited legal-letter
generation + HMAC audit trail. That's it."

### Threat surfaces (use as tagline list)
1. 🏢 Data brokers (210, with 58 walkthrough opt-out + all 3 US credit bureaus)
2. 🤖 AI training exposure (30 platforms, 26 walkthrough opt-out)
3. 👤 Face-search (8 services including Clearview)
4. 🛡️ NCII / leak takedown (12 leak sites + StopNCII + Google intimate-imagery)
5. ⚖️ Third-party AI + workforce-monitoring (22 tools across workplace/HR/medical/agentic)
6. 🧠 LLM memorization probing + dataset membership check
7. 🧹 AI conversation history cleanup (9 tools across local + web)

### Differentiator one-liner
"DeleteMe / Optery / Incogni are still fighting the 2018 broker war.
Vanish covers the AI era — the threats privacy tools have ignored
through 18 months of industry pivot."

## Files

- [`hn-show-hn.md`](./hn-show-hn.md) — Hacker News Show HN post (title, URL, author comment, timing)
- [`reddit-privacy.md`](./reddit-privacy.md) — r/privacy post (wait 48h after HN for social proof)
- [`faq.md`](./faq.md) — 18 predicted Q&A (tech, scope, business, performance, AI training)
- [`response-templates.md`](./response-templates.md) — 12 response templates for negative / tricky comments

## Recommended launch sequence

| Day | Action | Target |
|-----|--------|--------|
| **T-1** | Final README polish, asciinema demo, enable GH Pages | Pre-launch |
| **T+0** | Submit HN Show HN (Tue/Wed 8:30 AM US ET) | Hacker News |
| **T+0** | Reply to first 10 comments within 2h | First impression |
| **T+2d** | Post to r/privacy if HN >50 upvotes | Secondary wave |
| **T+7d** | Submit to [privacyguides.org](https://www.privacyguides.org/) for inclusion | Long-term SEO |
| **T+14d** | Post technical retrospective on dev.to / Hashnode | Developer audience |
| **T+30d** | First `verify` cycle on early users; collect success stories | Social proof |

## Do not do

- **No price-drop claims** ("will be free forever!") — just state current
  facts. MIT license already implies free.
- **No "revolutionary" / "game-changer"** language. HN and r/privacy will
  tear you apart.
- **No begging for upvotes**. Reddit will shadow-ban. HN will flag.
- **No cross-posting** the same post within 24 hours. Looks spammy.
- **No arguing with mods**. If a mod removes your post, ask politely
  what would make it acceptable.

## If launch underperforms

Don't delete the repo. Don't apologize publicly. Collect feedback, iterate
for 2-3 weeks, then try a different angle:
- r/selfhosted (different framing: "privacy CLI tool for selfhost crowd")
- Dev.to technical post (focus on architecture, not product pitch)
- Ship a substantial new feature, re-launch with "v0.3"
- Partner with a privacy influencer (ProtonMail blog, RestorePrivacy, etc.)

The #1 cause of OSS launch "failure" is the author disappearing after 2
weeks. Vanish's value compounds: every new broker, every verify success,
every issue closed makes the next post stronger.
