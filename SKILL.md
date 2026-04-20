---
name: vanish
description: Privacy scanner + opt-out orchestrator for 200 data brokers. Scan your exposure in 10s (0-100 score), then remove with a guided 18-step wizard. Free open-source alternative to DeleteMe / Optery / Incogni. Agent-native, audit-signed (HMAC-SHA256), local-first. Triple-confirm safety gates for high-risk actions; user-controlled export decision before any delete; shortest-TTL credentials wiped after task.
version: 0.2.0
metadata:
  openclaw:
    requires:
      env:
        - VANISH_AUDIT_HMAC_KEY
        - VANISH_SECRET_MASTER_KEY
      bins:
        - node
    primaryEnv: VANISH_AUDIT_HMAC_KEY
    emoji: "🔍"
    homepage: https://github.com/RAMBOXIE/vanish
    os:
      - macos
      - linux
      - windows
    always: false
    skillKey: vanish
---

# vanish

> Privacy scanner + opt-out orchestrator for 210 data brokers. Free open-source alternative to DeleteMe ($129+/yr), Optery ($99+/yr), Incogni ($99+/yr). Agent-native, audit-signed, local-first.

## Capabilities

### 🔍 scan — Privacy exposure assessment
Heuristic scan across 200 brokers in 10 seconds, no external API calls, no data leaves the machine. Produces a 0-100 privacy score, per-broker likelihood (`likely` / `possible` / `unlikely`) and risk tier (`critical` / `high` / `moderate` / `low`), plus prioritized category-grouped recommendations. Markdown + JSON report output.

### 🗑️ cleanup — Opt-out submission workflow
18-state conversational wizard for preparing and submitting opt-out requests. Real HTTP submission for 8 brokers via configurable endpoint (default `postman-echo.com` for verifiable closed-loop validation); other 192 brokers are dry-run blueprints with verified opt-out URLs. Triple-confirm for high-risk actions, export decision before any delete.

### ✍️ audit — HMAC-signed event trail
Every state mutation is HMAC-SHA256 signed over canonical JSON with timing-safe verification. `VANISH_AUDIT_HMAC_KEY` required in production (code warns in dev, silent in test). Proof reports render to Markdown.

### 🔁 queue — Retry / manual-review / dead-letter management
Three-level queue with SHA-256 dedup. Transient errors (HTTP 5xx/429) → retry with exponential backoff. Captchas / auth failures → manual review queue. Permanent errors or retry-limit exceeded → dead-letter. Queue CLI supports list / retry / resolve.

## Operating principles

1. Manual trigger only — `--manual` flag required, no scheduled automation
2. Triple YES confirmation for any high-risk action (3 separate states)
3. Export decision (yes/no) required before any delete
4. User-selected notification channel (none is acceptable)
5. User judges authenticity and legal truth; tool provides workflow capability only
6. Credentials: minimum scope, shortest TTL, encrypted storage, post-task wipe
7. HMAC key required in production; code fails loud without `VANISH_AUDIT_HMAC_KEY`

## Standard flow — 18 states

**Scan phase (5):**
`SCAN_WELCOME → SCAN_INPUT → SCAN_RUNNING → SCAN_REPORT → SCAN_HANDOFF`

**Cleanup phase (13):**
`WELCOME → GOAL → SCOPE → INPUT → AUTH → PLAN → RISK_CONFIRM_1 → RISK_CONFIRM_2 → RISK_CONFIRM_3 → EXPORT_DECISION → EXECUTE → REPORT → CLOSE`

From `SCAN_HANDOFF` the user chooses:
- `cleanup` → continue to the 13-state cleanup flow
- `export` → write scan report to file and exit
- `done` → exit without further action

Global commands available in every state: `status`, `back`, `pause`, `resume`.

Backward compatibility: `createSession({ skipScan: true })` skips the scan phase and starts at `WELCOME` (original 13-state flow).

## Run examples

### Scan (recommended entry point)
```bash
vanish scan --name "John Doe" --email "j@example.com" --phone "+15550101"
vanish scan --name "..." --output-md ./my-report.md
```

### Full interactive wizard (scan → review → cleanup)
```bash
vanish wizard
```

### Cleanup with preset
```bash
vanish cleanup --manual --preset spokeo \
  --confirm1 YES --confirm2 YES --confirm3 YES \
  --export-before-delete ask --export-answer no --notify none
```

### Live submission (real HTTP against test endpoint)
```bash
vanish b1-live run --live --brokers spokeo,thatsthem,peekyou \
  --full-name "Test User"
```

### Queue management
```bash
vanish queue list
vanish queue retry --id <retryItemId>
vanish queue resolve --id <manualReviewId> --resolution resolved
```

### Zero-install via npx
```bash
npx github:RAMBOXIE/vanish scan --name "..." --email "..."
```

## Safety gates enforced by code

| Gate | Enforcement |
|------|-------------|
| Manual trigger | `--manual` flag required; missing flag returns `blocked` with clear `nextActions` |
| Triple confirmation | Three separate states each require exact `YES`; any mismatch blocks |
| Export decision | Must be `yes` or `no` before EXECUTE; `ask` without answer = hard block |
| HMAC signing | Every persisted state mutation signed with `VANISH_AUDIT_HMAC_KEY` |
| Credential lifetime | TTL enforced by `AuthSession.validate({ minTtlSeconds })` |
| Secret storage | scrypt KDF + per-secret salt; Windows DPAPI preferred, AES-GCM fallback |
| Compliance block | Live official mode requires `termsAccepted`, `lawfulBasis`, `operatorId` |

## Broker coverage — 200 brokers / 12 categories

| Category | Count | Examples |
|----------|------|----------|
| People Search | 70 | Spokeo, Whitepages, BeenVerified, Intelius, Radaris, Truecaller, InfoTracer |
| Public Records | 21 | FamilySearch, Archives, CourtListener, PropertyShark, CityData |
| Marketing Data | 20 | Acxiom, LiveRamp, Oracle/BlueKai, ZoomInfo, Clearbit, Epsilon |
| Background Check | 18 | Checkr, GoodHire, Sterling, AccurateBackground, HireRight |
| Email Data | 15 | Hunter, Lusha, Apollo, RocketReach, LeadIQ |
| Phone Lookup | 14 | Truecaller, Hiya, RoboKiller, Sync.me |
| Financial | 12 | LexisNexis, Equifax, Experian, TransUnion, CoreLogic |
| Social Media | 8 | Lullar, SocialSearcher, Webmii, UserSearch |
| Location Data | 8 | SafeGraph, Foursquare, PlaceIQ, X-Mode |
| Reputation | 7 | BrandYourself, Reputation.com, NetReputation |
| Identity Resolution | 7 | FullContact, Throtle, Tapad, LiveIntent |

**Live HTTP submission (8)**: Spokeo, Thatsthem, Peekyou, Addresses, CocoFinder, Checkpeople, FamilyTreeNow, USPhoneBook.
**Dry-run blueprints (192)**: verified opt-out URLs in catalog; add endpoint config per broker to enable live submission.

## Environment variables

| Var | When needed | Purpose |
|-----|-------------|---------|
| `VANISH_AUDIT_HMAC_KEY` | Production | Audit event signing. Required in production; warns in dev. |
| `VANISH_SECRET_MASTER_KEY` | When using encrypted secrets | AES-GCM fallback when Windows DPAPI unavailable |
| `<BROKER>_LIVE_ENDPOINT` | Live submission | Per-broker HTTP endpoint override (default: `postman-echo.com`) |
| `<BROKER>_OFFICIAL_*_ENDPOINT` | Official mode | Real broker endpoints (default blocked by compliance gate) |

Scan mode requires zero env vars — pure local computation.

## Boundaries / 边界

- **Authenticity and legal judgment**: belong to the user, not the tool. Tool provides process capability only.
- **Live official broker mode**: compliance-gated by default; requires `termsAccepted`, `lawfulBasis`, `operatorId` before submission. Without configured endpoints, defaults to test/echo mode.
- **No background automation**: every run requires explicit manual trigger.
- **Credential persistence**: only via the encrypted secret store with TTL enforcement; no plaintext storage.
- **Dry-run by default**: 192 of 200 brokers remain dry-run until endpoint config is added.

## Tests

64 tests across 15 files covering: safety gates, queue state persistence, retry/dead-letter routing, secret encryption, audit signing, wizard state transitions, scan scoring, 200-broker registration, live HTTP round-trip against postman-echo.

Run: `npm test`
