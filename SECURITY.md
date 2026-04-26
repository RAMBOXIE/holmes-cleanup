# Security Policy

Vanish is a privacy tool. Security bugs matter more than feature bugs.

## Reporting a Vulnerability

**Do not open a public issue for security bugs.**

Report privately via [GitHub Security Advisory](https://github.com/RAMBOXIE/vanish/security/advisories/new) (preferred — this is the authoritative channel).

Include:
- Type of issue (e.g., injection, auth bypass, data exfiltration, broken audit signature)
- Full paths of source files related to the issue
- Steps to reproduce
- Impact assessment (what can an attacker do?)

We will acknowledge within **72 hours** and aim to fix critical issues within **14 days**.

## In Scope

### Original v0.2 surface
- **Audit signature bypass** — if HMAC signing can be forged or tampered records produce valid signatures
- **Secret store breaches** — if encrypted credentials can be extracted without the master key
- **Data leakage** — if scan/opt-out data is transmitted anywhere beyond the explicit broker endpoints declared in SKILL.md "Network access"
- **Injection** — command injection via CLI args, path traversal in state file, malicious JSON in catalog
- **Privilege escalation** — if an unprivileged process can modify audit-signed queue state
- **Broken safety gates** — if triple-confirm / export-decision can be bypassed

### v0.3 additional surface
- **API-key leakage** — if `OPENAI_API_KEY` / `ANTHROPIC_API_KEY` (used by `llm-memory-check`) end up in stderr / stdout / state file / audit trail. They should NEVER be persisted.
- **Photo upload to Vanish process** — `face-scan` and `face-opt-out` MUST NEVER read or transmit user photos. Verify each invocation against the SKILL.md filesystem-scan declaration.
- **Identity leakage in share card** — `share-card.mjs` and `renderTripleThreatCardSvg` must contain ONLY aggregate scores. No `fullName`, no `emails`, no `phones`. Privacy invariant tests at `tests/share-card.test.mjs:78-105`.
- **False-positive forensic exhibit** — `third-party-ai --detect-installed` produces evidence claims about workforce-monitoring software being installed on the user's machine. If an attacker can plant decoy files at one of the catalog's `installPaths` to trigger a false positive that ends up in a legal objection letter, that's a vulnerability (could result in a perjurious filing).
- **Catalog tampering** — bundled catalogs (`*-catalog.json`) are part of the trust boundary. If a malicious dependency or post-install script can rewrite catalog entries, the user might send DMCA letters to wrong abuse contacts or generate objection letters with wrong jurisdiction citations.
- **Common Crawl CDX query SSRF** — `dataset-check --url` takes a user URL and submits it to `index.commoncrawl.org`. Should reject obviously-internal URLs (file://, localhost, RFC1918) to prevent the CDX response from being misused.
- **Browser-open injection** — `openUrl()` shells out to `cmd /c start` / `open` / `xdg-open`. URLs come from catalogs (trusted) and user `--profile-url` (untrusted). Verify no shell metacharacter injection via crafted URLs.
- **Clipboard injection via Linux fallback** — `clip` / `pbcopy` / `xclip` write the target setting name. Catalog-controlled, but verify no escape-sequence injection.

## Out of Scope

- Issues with third-party broker websites themselves (report to them)
- Social engineering attacks that require the user to manually paste malicious data
- DoS via repeatedly running heavy scans on the same machine (scan is local CPU, users control this)
- Missing best-effort features like rate-limit detection (these are bugs, not security issues)

## Our Commitments

- We will not sue or threaten legal action against researchers who follow this policy in good faith.
- Credit (if desired) in CHANGELOG.md upon patch release.
- Coordinated disclosure: we request 14 days (or agreed timeline) before public disclosure for critical issues.

## Known Security Boundaries

The project ships with these known boundaries — please audit them if contributing:

- **Audit HMAC key**: `VANISH_AUDIT_HMAC_KEY` must be set in production. Without it, the code warns but still signs with a default key (acceptable for dev/test, not production).
- **Secret store**: Windows DPAPI preferred; AES-256-GCM fallback with scrypt KDF + per-secret salt. Master key via `VANISH_SECRET_MASTER_KEY` must have sufficient entropy.
- **Queue state lock**: file-based lock with 30-second stale detection. Concurrent processes modifying the same state file may race (contributions welcome).
- **CLI input handling**: we trust CLI args are user-supplied and non-malicious. Do not pipe untrusted content to `vanish`.
- **API keys**: `OPENAI_API_KEY` / `ANTHROPIC_API_KEY` are read from env at request time, never persisted, never echoed in error output. They flow only to the SDK fetch headers; if you see them showing up anywhere else (logs, audit, stdout, share card), that's a bug.
- **Trust boundary on catalogs**: the JSON catalogs in `src/*/[a-z]*-catalog.json` are part of the trusted code base. Maintainers MUST review every catalog PR for malicious abuse-contact substitutions or jurisdiction-clause tampering — a wrong abuse email in a DMCA letter would be a real-world harm.

See `src/audit/signature.mjs`, `src/auth/secret-store.mjs`, `src/llm-memory/memory-check-engine.mjs`, and the `installPaths` arrays in `src/third-party-ai/third-party-catalog.json` for the security-critical code paths.

## Coordinated disclosure timeline (target)

| Severity | Initial response | Patch landed | Public disclosure |
|----------|-----------------|--------------|-------------------|
| Critical (remote unauth, key leak, signature bypass) | < 24h | < 7 days | 14 days post-fix or with reporter's preferred timing |
| High (auth bypass, catalog poisoning, false-evidence) | < 72h | < 14 days | 30 days post-fix |
| Medium / Low | < 7 days | next release | next release notes |

We won't sue or threaten legal action against researchers acting in good faith.
