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
[Open source] Made a free privacy scanner + opt-out tool for 210 data brokers. Got feedback on HN last week — sharing here for r/privacy input.
```

**Key phrases that help pass mod filters**:
- "Open source" in brackets = legit signal
- "Got feedback on HN" = not a spam account, has context
- "sharing here for r/privacy input" = framing as asking, not pushing

## Body (use Markdown)

```markdown
Hi r/privacy! 

I've been frustrated by the DeleteMe / Optery / Incogni pricing ($99-$129+/yr)
for what's essentially filling opt-out forms, waiting for email confirmation,
and re-checking in 30 days. So I built [Vanish](https://github.com/RAMBOXIE/vanish) —
an open-source alternative.

**What it does**:

1. **Scan**: Enter your name → get a 0-100 privacy exposure score across
   210 data brokers in 10 seconds. 100% client-side — browser and CLI both
   run the scoring heuristic locally. No data transmitted.

2. **Browser-assisted opt-out** (58 brokers): Opens your browser to the
   real opt-out URL, pre-fills form data to your clipboard. You handle the
   captcha + submit (because I refuse to hook 2captcha — breaks the zero-cost
   OSS promise).

3. **30-day verify**: After submitting, Vanish records a follow-up. On day 30,
   `vanish verify` checks each URL via HTTP — 404 = removed ✅, 200 = still
   present ❌ (time to re-submit), other = unknown.

4. **HMAC-signed audit trail** for proof of submissions (useful for
   journalists, lawyers, or anyone who needs GDPR/CCPA receipts).

**Differentiation vs commercial services**:

| | Vanish | DeleteMe | Optery | Incogni |
|--|:--:|:--:|:--:|:--:|
| Price | Free (MIT) | $129+/yr | $99+/yr | $99+/yr |
| Brokers | 210 | 750+ | 350+ | 180+ |
| Open source | ✅ | ❌ | ❌ | ❌ |
| Local-first (no data sent) | ✅ | ❌ | ❌ | ❌ |
| Covers all 3 credit bureaus | ✅ | ❌ | ❌ | ❌ |

**Honest limits** (don't want to oversell):
- Captchas + email links are your job
- 58/210 brokers have browser-assisted opt-out; rest are blueprints
- No legal review of DMCA templates (use at own risk)
- Scan is heuristic (not confirmed presence — that requires Google dorks,
  which is planned but not yet)

**HN discussion** (if useful context):
[link to your HN Show HN post — update this before submitting]

**Try it**:
- Browser: https://ramboxie.github.io/vanish/
- CLI: `npx github:RAMBOXIE/vanish scan --name "Your Name"`

Would love to hear:
- Which brokers I'm missing that r/privacy folks care about?
- Non-US brokers I should prioritize (EU/UK/JP/etc.)?
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
