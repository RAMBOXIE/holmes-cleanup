# B1 STATUS

_Last updated: 2026-04-15_

## Summary
B1 now ships a **real execution loop MVP** (not dry-run only):
- input ingestion
- auth loading + validation
- live HTTP submit path (Spokeo adapter)
- persistent retry/manual-review queues
- retry escalation + resolve operations
- proof report generation

## Implemented
- `src/auth/session-auth.mjs`
  - read credentials from env/session/auth-file
  - TTL check + scope check
  - cleanup credentials after run (memory + temp file wipe)
- `src/queue/state-store.mjs`
  - persistent queue state (`data/queue-state.json`)
  - lock file for safe writes
  - restart recovery
- `src/orchestrator/b1-runner.mjs`
  - `live` mode execution and audit
  - transient error -> retry queue
  - retry threshold exceeded -> manual review queue
  - queue item retry/resolve helpers
- `src/adapters/brokers/spokeo.mjs`
  - `prepareRequest/submit/parseResult`
  - live submit performs real HTTP POST (default endpoint: `https://postman-echo.com/post`)
- `scripts/b1-live.mjs`
  - CLI entry for `run --live`
- `scripts/queue-cli.mjs`
  - `list`, `retry`, `resolve`
- `scripts/build-dashboard-data.mjs`
  - exports latest persisted queue state for dashboard
- `scripts/generate-proof-report.mjs`
  - includes live evidence + queue status

## Validation
- Unit tests:
  - persistence recovery
  - auth TTL check
  - retry escalation to manual review
- `npm run test:b1`

## Limits
- Spokeo path uses verifiable substitute endpoint in MVP (not official production endpoint yet).
- Whitepages/BeenVerified remain dry-run.
- Dashboard is local export-based, not streaming updates.
