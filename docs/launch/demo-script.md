# Demo Recording Script — pick one of three for the launch

You need **one ~60 second demo** in the README hero. Three good options ranked
by viscerality + uniqueness; pick whichever matches your audience.

## Tools

- **Windows + WSL**: install asciinema in WSL → record → `asciinema upload`
- **macOS / Linux**: `brew install asciinema` (mac) or `apt install asciinema` (linux) → record → upload
- **Native Windows fallback**: ScreenToGif (https://www.screentogif.com/) → export to .gif → upload to README via GitHub asset
- **Render to gif from .cast**: `agg demo.cast demo.gif --speed 1.2` (https://github.com/asciinema/agg)

After recording, embed in README hero:
```markdown
[![asciinema demo](https://asciinema.org/a/XXXXXX.svg)](https://asciinema.org/a/XXXXXX)
```

---

## Option A — `vanish takedown --stopncii` (highest emotional viscerality)

**Audience**: r/privacy, NCII victims, anyone who has had content leaked

**Story arc**: from "I have a leak crisis" → "Vanish gives me the most effective free tool first" → "and 12 DMCA letters drafted" → "and crisis hotlines" — in 60 seconds.

**Script**:
```bash
# Slide 0 (3s): blank prompt
clear

# Slide 1 (10s): Show the support resources — establishes "this is a crisis tool, not a toy"
vanish takedown --support

# Slide 2 (15s): Hash-register with StopNCII first
vanish takedown --stopncii --no-open

# Slide 3 (15s): Generate DMCA letters for top 3 leak sites
vanish takedown --dmca-letter --coomer --kemono --thothub \
  --name "[Your Name]" --email "legal@yourdomain.com" \
  --no-open --output dmca.md
ls -la dmca.md
head -30 dmca.md

# Slide 4 (10s): Show the audit trail — "evidence for later"
vanish queue list 2>/dev/null | head -10
```

**Why this works**: opens with crisis resources, demonstrates StopNCII (the actual most-effective free tool, not Vanish's invention), shows the DMCA letter output, ends on auditability. The three-act structure is "crisis → action → evidence" which lands viscerally.

---

## Option B — `vanish third-party-ai --detect-installed` (workforce-monitoring angle)

**Audience**: HN engineers, employees worried about Meta-memo-style monitoring, BIPA discussion

**Story arc**: "I'm an employee" → "let me check what's on my work laptop" → "and generate a BIPA-cited objection letter with the detected paths as evidence" — in 60 seconds.

**Script**:
```bash
clear

# Slide 1 (15s): Run detection — most viewers will see 0 hits, which is honest
vanish third-party-ai --detect-installed
# (Output will say "0 of 8 tools detected" on your dev machine. That's fine —
#  shows the detection runs without false positives. If you do have one of
#  these installed, even better demo.)

# Slide 2 (15s): Generate the BIPA objection letter for Teramind
vanish third-party-ai --teramind --jurisdiction US-state-IL-BIPA \
  --company "Acme Corp" 2>/dev/null | head -50

# Slide 3 (20s): Combined flow — detection + letter with evidence embedded
vanish third-party-ai --context workforce-monitoring \
  --detect-installed \
  --jurisdiction US-state-NY-EMA \
  --company "Acme Corp" \
  --output workforce-objection.md \
  --no-open
echo "---"
head -50 workforce-objection.md

# Slide 4 (10s): Show the help to demonstrate scope
vanish third-party-ai --help 2>/dev/null | grep -A 1 "Workforce monitoring" | head -25
```

**Why this works**: detection + legal letter combination is the strongest novel feature — no other tool does this. BIPA + NY EMA citations land with the legally-aware crowd. The "Acme Corp" placeholder makes it generic enough to not need a real employer.

---

## Option C — `vanish ai-scan --all` (broadest appeal, easiest to follow)

**Audience**: general HN, broad r/privacy, anyone who's ever asked "is LinkedIn training AI on me"

**Story arc**: "I use 5-10 platforms daily" → "Vanish classifies them all" → "and tells me exactly what to opt out of and how" — in 60 seconds.

**Script**:
```bash
clear

# Slide 1 (15s): Quick scan — the visual banner is the strongest single moment
vanish ai-scan --linkedin --chatgpt --reddit --cursor --gemini

# Slide 2 (20s): Full --all scan
vanish ai-scan --all

# Slide 3 (15s): Generate guided opt-out walkthroughs
vanish ai-opt-out --linkedin --chatgpt --cursor --no-open

# Slide 4 (10s): Show the catalog source citations (proves the data is real)
node -e "const c = require('./src/ai-scanner/ai-platforms-catalog.json'); console.log(JSON.stringify(c.platforms.linkedin.sources, null, 2))"
```

**Why this works**: viewers can immediately see themselves in it ("I use these too"). The `--all` mode produces a satisfying long output that shows breadth. The source citation at the end is the "this isn't made up" proof point.

---

## Recommendations by audience

| Audience | Recommendation |
|----------|---------------|
| HN front page | **Option B** (workforce-monitoring) — engineers respect the BIPA angle + the detection flow is novel |
| r/privacy | **Option A** (takedown) — most viscerally relevant to the community's stated mission |
| Twitter / general tech | **Option C** (ai-scan) — broadest appeal, easiest to grasp in a quick scroll |
| All of the above | Record all 3, embed Option B in README hero, link A + C in launch docs |

---

## Practical recording tips

1. **Use a clean shell prompt** — `PS1="$ "` or equivalent. Long usernames + paths kill the demo aesthetic.
2. **Set terminal width to 80-90 cols** — wider wraps badly in asciinema embeds.
3. **Speed-throttle output**: asciinema records real time, but `agg --speed 1.2` on render is fine. Beyond 1.5x looks frantic.
4. **Don't paste real personal data** — use "Test User" / "test@example.com" / "555-555-1234". The point is to show the tool works, not to demo doxxing yourself.
5. **End on a clean state** — don't leave files lying around at the end of the recording. `rm dmca.md` as the last command if Option A.
6. **Test the recording** before uploading — play it back at 1x to see if the pacing is right.

---

## Where the demo lives after recording

1. Upload `.cast` to https://asciinema.org/ → get a public URL
2. Embed in README hero immediately under the tagline:
   ```markdown
   [![asciinema demo](https://asciinema.org/a/XXXXXX.svg)](https://asciinema.org/a/XXXXXX)
   ```
3. Link in `docs/launch/hn-show-hn.md` author comment as the lede for the
   `What's in the repo:` section
4. Upload to YouTube as private/unlisted as a backup (asciinema.org has had
   outages historically)
