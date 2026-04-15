# holmes-cleanup

Privacy cleanup and anti-piracy workflow skill (manual-first, safety-gated).

> **Mission**: Help users reduce harmful digital exposure and piracy-related repost spread through a clear, auditable, user-controlled process.
>
> **使命（中文）**：通过清晰、可审计、由用户控制的流程，帮助用户减少隐私泄露与盗版扩散带来的伤害。

## Why this matters
In today’s internet environment, privacy abuse, data broker exposure, and unauthorized reposting can rapidly amplify personal harm. This project is designed to provide **practical workflow capability** while keeping final truth judgment and irreversible decisions in user hands.

在当下环境中，隐私泄露与盗版扩散会被平台和搜索快速放大。本项目提供“工具能力 + 流程安全”，但真实性与最终决策始终由用户掌握。

## Current status (2026-04-15)
- ✅ P0 complete: manual trigger gate, triple-confirm risk gate, pre-delete export prompt, notification branching, credential policy guardrails.
- ✅ P1 complete: sample intake (keywords + user sample file), sample normalization/dedup, dry-run runner, unit tests.
- ✅ Quick Mode, local Queue Dashboard, preset templates, and Proof Report generation are available.
- ✅ Conversation Wizard v1 state machine + prompt pack + CLI demo are available.
- ✅ B1 real-loop MVP available: persisted queues (JSON + file lock), auth TTL/scope guard, live-mode Spokeo adapter, queue CLI (list/retry/resolve).
- ✅ Flowchart available for review.
- 🔜 P2 next: broker-specific production integrations (official endpoints), stronger credential vaulting, richer dashboard UX.

## Core rules (must-not-break)
1. **Manual trigger only** (`--manual` required), no scheduler mode.
2. **No cooldown period**, but high-risk actions require **3 confirmations**.
3. **Ask export decision before delete**.
4. **Notification is user-selected**; no clawbot => no notification is acceptable.
5. Piracy sample authenticity is **user-judged**; tool provides workflow and capability only.
6. Credentials follow **minimum scope + shortest TTL + post-task wipe**.

## Differentiation (vs. competitors)
**Positioning**: Our functional goals are aligned with common privacy cleanup / takedown competitors (discover, prepare, submit, follow-up), but our product form is intentionally different.

- **Agent-native Skill form**: designed as a reusable Skill contract rather than a single fixed UI flow.
- **Conversational orchestration**: state-machine execution in dialogue (`goal -> scope -> auth -> evidence -> risk-confirm -> export -> execute -> notify -> close`).
- **Safety governance first**: manual trigger, triple-confirm for high-risk actions, export-before-delete, auditable logs, shortest-lifetime credentials.

竞品关系说明：功能目标可以一致，但我们在交互形态与可扩展形态上不同——强调 Agent 可编排、可审计、可插拔扩展。

## Repository structure
- `SKILL.md` — Skill definition and operating guidance.
- `IMPLEMENTATION_PLAN.md` — MVP architecture and checkpoints.
- `FLOWCHART.md` — Review-friendly process flow (Mermaid).
- `ADAPTER_SPEC.md` — Unified adapter contracts for broker/social/dmca.
- `CONVERSATION_PROTOCOL.md` — Dialogue state machine and failure handling rules.
- `DMCA_TEMPLATES.md` — Bilingual DMCA draft templates with placeholders.
- `TODO.md` — Prioritized backlog and validation records.
- `scripts/holmes-cleanup.mjs` — Dry-run orchestration entry.
- `scripts/build-dashboard-data.mjs` — Generates local dashboard demo JSON.
- `scripts/generate-proof-report.mjs` — Builds Markdown proof reports from execution JSON.
- `dashboard/` — Local static queue dashboard.
- `templates/` — Broker and DMCA preset JSON files.
- `references/` — Risk gate and input schema docs.
- `tests/` — Node test coverage for guardrails.
- `examples/sample.json` — Sample input payload.

## Quick run
```bash
cd D:\Projects\holmes-cleanup
npm run quick
npm run dry
npm run wizard:demo
npm test
```

`npm run quick` is the minimal-input full flow. It auto-selects the local sample file, dry-run mode, no notification, and export-before-delete `ask`, then blocks at any missing safety gate. For a fresh quick run, the expected block is the high-risk confirmation gate:

```bash
npm run quick -- --confirm1 YES --confirm2 YES --confirm3 YES --export-answer no
```

## Conversation Wizard
Clawbot-style wizard is implemented under `src/wizard/engine.mjs` with full state sequence:

`WELCOME -> GOAL -> SCOPE -> INPUT -> AUTH -> PLAN -> RISK_CONFIRM_1 -> RISK_CONFIRM_2 -> RISK_CONFIRM_3 -> EXPORT_DECISION -> EXECUTE -> REPORT -> CLOSE`

Run local interactive demo:

```bash
npm run wizard:demo
```

Supported runtime commands in every state:
- `status`
- `back`
- `pause`
- `resume`

Quick mode integration: when key fields are missing (e.g., triple risk confirmation or export decision), result `nextActions` includes wizard-friendly action objects with `state`, `missingFields`, and `command`.

## Example command
```bash
npm run run -- --manual --keywords "mirror,reupload" --sample-file ./examples/sample.json \
  --confirm1 YES --confirm2 YES --confirm3 YES \
  --export-before-delete ask --export-answer no --notify none
```

## Preset templates
Use `--preset <name>` to load preset parameters from `templates/`. User-supplied CLI flags override preset values.

Broker presets:
- `spokeo`
- `whitepages`
- `beenverified`

DMCA presets:
- `standard`
- `urgent`
- `followup`

Example:
```bash
npm run run -- --manual --preset spokeo --keywords "custom search" \
  --confirm1 YES --confirm2 YES --confirm3 YES \
  --export-before-delete ask --export-answer no
```

## Real-loop commands (MVP)
```bash
# Live run (Spokeo adapter + real HTTP submit endpoint)
node scripts/b1-live.mjs run --live --request-id demo-live-001 \
  --auth-token <token> --auth-scopes submit:spokeo --auth-expires-at 2026-12-31T00:00:00.000Z

# Queue CLI
node scripts/queue-cli.mjs list
node scripts/queue-cli.mjs retry --id <retryItemId> --auth-token <token> --auth-scopes submit:spokeo --auth-expires-at 2026-12-31T00:00:00.000Z
node scripts/queue-cli.mjs resolve --id <manualReviewId> --resolution resolved
```

## Queue Dashboard
Export dashboard data from persisted queue state:

```bash
npm run dashboard:build-data -- data/queue-state.json
```

Files are written to `dashboard/data/*.json`. The dashboard reads:
- `dashboard/data/retry-queue.json`
- `dashboard/data/manual-review-queue.json`
- `dashboard/data/completed.json`
- `dashboard/data/failed.json`
- `dashboard/data/status.json`

## Proof Report
Generate a demo proof report:

```bash
npm run report:proof
```

Generate a report from an execution result JSON:

```bash
node scripts/generate-proof-report.mjs ./path/to/execution-result.json
```

Reports are written to `reports/proof-<timestamp>.md` and include timeline, pass/fail status, reasons not executed, confirmation records, export decision, and queue status.

## Scope disclaimer
Current MVP supports **real HTTP submission** in `--live` mode via the Spokeo adapter using a configurable endpoint (default `https://postman-echo.com/post`) for verifiable closed-loop validation.

- ✅ Real in MVP: authenticated request construction, live HTTP submit, persisted retry/manual queues, retry escalation and queue operations.
- ⚠️ Substitute in MVP: endpoint is a controlled/verifiable HTTP endpoint (not official Spokeo production API).
- 🔜 Next: replace with official broker endpoint + anti-bot compliant integration.

当前 MVP 在 `--live` 模式下已支持真实 HTTP 提交（默认使用可验证受控 endpoint），用于“真执行闭环”验证；但官方生产接口接入仍属于下一阶段。
