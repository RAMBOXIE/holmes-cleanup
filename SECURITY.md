# Security Policy

Holmes-Cleanup is a privacy tool. Security bugs matter more than feature bugs.

## Reporting a Vulnerability

**Do not open a public issue for security bugs.**

Report privately to: **security@holmescleanup.dev** (or open a [GitHub Security Advisory](https://github.com/RAMBOXIE/holmes-cleanup/security/advisories/new)).

Include:
- Type of issue (e.g., injection, auth bypass, data exfiltration, broken audit signature)
- Full paths of source files related to the issue
- Steps to reproduce
- Impact assessment (what can an attacker do?)

We will acknowledge within **72 hours** and aim to fix critical issues within **14 days**.

## In Scope

- **Audit signature bypass** — if HMAC signing can be forged or tampered records produce valid signatures
- **Secret store breaches** — if encrypted credentials can be extracted without the master key
- **Data leakage** — if scan/opt-out data is transmitted anywhere beyond the explicit broker endpoints
- **Injection** — command injection via CLI args, path traversal in state file, malicious JSON in catalog
- **Privilege escalation** — if an unprivileged process can modify audit-signed queue state
- **Broken safety gates** — if triple-confirm / export-decision can be bypassed

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

- **Audit HMAC key**: `HOLMES_AUDIT_HMAC_KEY` must be set in production. Without it, the code warns but still signs with a default key (acceptable for dev/test, not production).
- **Secret store**: Windows DPAPI preferred; AES-256-GCM fallback with scrypt KDF + per-secret salt. Master key via `HOLMES_SECRET_MASTER_KEY` must have sufficient entropy.
- **Queue state lock**: file-based lock with 30-second stale detection. Concurrent processes modifying the same state file may race (contributions welcome).
- **CLI input handling**: we trust CLI args are user-supplied and non-malicious. Do not pipe untrusted content to `holmes-cleanup`.

See `src/audit/signature.mjs` and `src/auth/secret-store.mjs` for the security-critical code paths.
