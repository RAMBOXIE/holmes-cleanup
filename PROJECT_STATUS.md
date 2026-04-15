# PROJECT STATUS — holmes-cleanup

_Last updated: 2026-04-15_

## 1) Executive summary
holmes-cleanup has completed a safe and testable foundation for manual privacy/anti-piracy cleanup operations. The current build is dry-run only, with strict guardrails for high-risk actions and clear user-control boundaries.

holmes-cleanup 已完成可测试的安全骨架：手动触发、三次确认、删除前导出询问、通知可选、凭据策略明确。当前为 dry-run 阶段。

## 2) Completed milestones
### P0 (Completed)
- Manual trigger gate (`--manual` required)
- Triple confirmation gate for high-risk actions
- Pre-delete export decision gate (`ask|yes|no`)
- Notification mode branch (`none|telegram|email|signal`)
- Credential policy statement and enforcement checkpoints

### P1 (Completed)
- Sample intake via keywords and sample file
- Sample normalization + deduplication
- Structured JSON execution result
- Unit tests for critical guardrails
- Review flowchart (Mermaid)

### B1 MVP (Completed)
- Dry-run broker adapter registry for Spokeo, Whitepages, and BeenVerified
- Unified broker adapter interface: `prepareRequest`, `submit`, `parseResult`
- Configurable retry queue with exponential backoff metadata
- Manual review queue with `reason`, `payload`, `createdAt`, `status`
- B1 runner that aggregates broker results and routes transient failures to retry/manual review
- Structured B1 demo script and focused queue tests

中文：B1 已完成 dry-run 经纪商适配器、注册表、重试队列、人工复核队列与编排器；不会发起真实网络请求。

### B2 Workflow Utilities (Completed)
- Quick Mode (`npm run quick` / `holmes quick` style subcommand) for minimal-input dry-run flow
- Local static Queue Dashboard with generated retry/manual-review/status JSON
- Broker presets for Spokeo, Whitepages, BeenVerified
- DMCA presets for standard, urgent, followup
- Proof Report generator for Markdown audit reports under `reports/proof-<timestamp>.md`

中文：B2 已完成快速模式、本地队列看板、模板预设与 proof report 生成；仍遵守手动触发、三次确认、删除前导出询问与 dry-run 默认原则。

## 3) Quality checks
- `npm run dry` ✅
- `npm run quick` ✅ (expected safety block with nextActions when confirmations are missing)
- `npm run dashboard:build-data` ✅
- `npm run report:proof` ✅
- `npm test` ✅ (10/10 pass)
- `npm run b1:demo` ✅
- `npm run test:b1` ✅ (3/3 pass)

## 4) Current limitations
- No real external API execution yet (intended at this phase)
- Notification handlers are placeholders
- B1 broker adapters are dry-run only; no real broker submissions are sent
- Platform-specific social/DMCA takedown adapters not yet implemented
- Dashboard is static and reads local JSON only; it does not poll or mutate queues.

## 5) Next phase (P2)
1. Add mock pluggable executor interfaces.
2. Add platform strategy templates in `references/`.
3. Improve multilingual review outputs (EN primary / 中文辅助).
4. Add optional webhook notification mode (if approved).
5. Prepare production integration checklist before real API wiring.

## 6) Differentiation (vs. competitors)
- **Same functional target, different delivery form**: we target equivalent outcomes (privacy cleanup + takedown workflow), but deliver through an **Agent-native Skill** instead of a monolithic interface.
- **Conversational orchestration**: process is enforced through explicit state transitions with required fields and exit conditions.
- **Safety governance as protocol**: high-risk operations are blocked unless policy gates pass (manual mode, 3x confirmation, export decision).

与竞品关系：目标一致（完成清理与下架闭环），但形态不同（Skill 化、对话执行、可扩展适配器、安全闸门）。

## 7) Governance principles (locked)
- User decides authenticity.
- Tool provides process capability and evidence organization.
- No irreversible action without triple confirmation.
- No delete action without export decision prompt.
- Least privilege credentials with shortest lifetime.
