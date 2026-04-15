# CONVERSATION_PROTOCOL — Agent-Orchestrated State Machine

_Last updated: 2026-04-15_

## 0) Principle / 原则
This protocol defines a strict conversational flow for execution safety and auditability.

**Critical rule**: Authenticity and factual truth are judged by the user. The agent provides process structure, evidence organization, and controlled execution only.

关键原则：真实性由用户判断；Agent 只负责流程编排与能力执行，不替代用户做事实认定。

---

## 1) State Machine

`goal -> platform-scope -> auth -> evidence -> risk-confirm(3x) -> export-decision -> execute -> notify -> close`

---

## 2) Per-State Specification

## State A: goal
- **User prompt**: “What outcome do you want to achieve in this cleanup session?”
- **Required fields**: `goal_type`, `intent_summary`
- **Exit condition**: Goal is specific and actionable
- **Failure handling**: If vague, ask narrowing questions with examples

中文：先明确目标（删除/下架/投诉/提醒），目标不清则继续澄清。

## State B: platform-scope
- **User prompt**: “Which platforms/targets are in scope? Please list URLs, IDs, or channels.”
- **Required fields**: `platforms[]`, `targets[]`
- **Exit condition**: At least one normalized target exists
- **Failure handling**: URL parse/dedup; unresolved targets go to manual review queue

中文：平台与范围必须落地到可执行目标（URL/ID）。

## State C: auth
- **User prompt**: “Please authorize access using the minimum required scope and short-lived credentials.”
- **Required fields**: `auth_mode`, `credential_ref|session_proof`, `consent_ack`
- **Exit condition**: Valid auth present or explicit `none` if channel doesn’t require auth
- **Failure handling**: Auth expired/invalid => re-auth request, no silent fallback

中文：凭据遵循最小权限和短时效，认证失败必须显式重试。

## State D: evidence
- **User prompt**: “Provide evidence and explain why each target is in scope.”
- **Required fields**: `evidence_refs[]`, `user_statement_authenticity_ack`
- **Exit condition**: Evidence package passes minimum completeness checks
- **Failure handling**: Missing evidence => request supplementation; do not auto-fabricate

中文：证据不足就补证，不允许系统自行捏造事实。

## State E: risk-confirm (3x)
- **User prompt**:
  1) “This may be high-impact. Confirm #1 (YES).”
  2) “Please reconfirm #2 (YES).”
  3) “Final confirmation #3 (YES).”
- **Required fields**: `confirm1`, `confirm2`, `confirm3` (all exact YES)
- **Exit condition**: Three valid confirmations received
- **Failure handling**: Any mismatch => block execution and return to review

中文：高风险动作必须三次确认，任一失败即中断。

## State F: export-decision
- **User prompt**: “Before irreversible delete actions, do you want to export records first? (yes/no/ask)”
- **Required fields**: `export_before_delete`, and `export_answer` when `ask`
- **Exit condition**: Export choice is explicit
- **Failure handling**: Missing answer when required => hard block

中文：删除前必须完成导出决策，避免不可逆损失。

## State G: execute
- **User prompt**: “Ready to execute now under manual mode. Proceed?”
- **Required fields**: `manual_trigger=true`, `execution_plan_ref`
- **Exit condition**: Adapter returns `success|partial|failed`
- **Failure handling**: Capture structured error, provide retry or manual fallback path

中文：仅手动触发执行，禁止后台静默自动跑。

## State H: notify
- **User prompt**: “How should I notify results? (none/telegram/email/signal)”
- **Required fields**: `notify_mode`
- **Exit condition**: Notification branch resolved
- **Failure handling**: Unsupported mode => default to `none` with explicit notice

中文：通知是可选分支，用户可选不通知。

## State I: close
- **User prompt**: “Session complete. Do you want an audit export and follow-up reminder?”
- **Required fields**: `close_ack`, optional `followup_preference`
- **Exit condition**: Audit summary persisted and session closed
- **Failure handling**: If persistence fails, mark as `close_pending` and retry save

中文：收尾阶段输出审计摘要，确保可复盘。

---

## 3) Minimal Session Object

```json
{
  "session_id": "sess_abc123",
  "state": "execute",
  "goal": { "goal_type": "dmca_takedown", "intent_summary": "Remove infringing reposts" },
  "scope": { "platforms": ["x"], "targets": ["https://x.com/.../"] },
  "auth": { "auth_mode": "oauth", "credential_ref": "vault://..." },
  "evidence": { "evidence_refs": ["ev1"], "user_statement_authenticity_ack": true },
  "risk_confirm": { "confirm1": "YES", "confirm2": "YES", "confirm3": "YES" },
  "export": { "export_before_delete": "ask", "export_answer": "yes" },
  "notify": { "notify_mode": "telegram" }
}
```
