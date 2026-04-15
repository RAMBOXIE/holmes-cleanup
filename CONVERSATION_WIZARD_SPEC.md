# CONVERSATION_WIZARD_SPEC

English-first, 中文辅说明。This document defines v1 Clawbot-style conversation wizard for holmes-cleanup.

## 1. State machine

`WELCOME -> GOAL -> SCOPE -> INPUT -> AUTH -> PLAN -> RISK_CONFIRM_1 -> RISK_CONFIRM_2 -> RISK_CONFIRM_3 -> EXPORT_DECISION -> EXECUTE -> REPORT -> CLOSE`

Global commands for every state:
- `status`: return current state, missing required fields, next actions
- `back`: move to previous state when available
- `pause`: freeze progression; reject non-command inputs
- `resume`: unfreeze progression

## 2. State definitions

### WELCOME
- Prompt template: welcome user + explain full flow and safety gates.
- Required fields: none.
- Pass condition: any non-command input to begin.
- Failure handling: if paused, only allow `resume`/`status`.
- Commands: status/back/pause/resume.

### GOAL
- Prompt template: “What is your primary cleanup/takedown goal?”
- Required fields: `goal`.
- Pass condition: non-empty goal text.
- Failure handling: keep asking with missing field list.
- Commands: status/back/pause/resume.

### SCOPE
- Prompt template: ask platforms/channels list.
- Required fields: `platforms`.
- Pass condition: at least one platform parsed from CSV.
- Failure handling: explain expected CSV format.
- Commands: status/back/pause/resume.

### INPUT
- Prompt template: ask evidence/input summary and sources.
- Required fields: `inputSummary`.
- Pass condition: non-empty summary.
- Failure handling: provide examples (URLs, text snippets, sample file refs).
- Commands: status/back/pause/resume.

### AUTH
- Prompt template: ask authorization method (env token/OAuth/manual).
- Required fields: `authMethod`.
- Pass condition: non-empty auth method.
- Failure handling: remind least-privilege + shortest TTL.
- Commands: status/back/pause/resume.

### PLAN
- Prompt template: summarize proposed actions and ask for plan confirmation details.
- Required fields: `planSummary`.
- Pass condition: non-empty plan summary.
- Failure handling: request concrete plan language.
- Commands: status/back/pause/resume.

### RISK_CONFIRM_1
- Prompt template: first high-risk confirmation (“Reply YES”).
- Required fields: `riskConfirm1`.
- Pass condition: exact semantic YES.
- Failure handling: block and repeat first confirmation requirement.
- Commands: status/back/pause/resume.

### RISK_CONFIRM_2
- Prompt template: second high-risk confirmation (“Reply YES”).
- Required fields: `riskConfirm2`.
- Pass condition: YES.
- Failure handling: block and repeat second confirmation requirement.
- Commands: status/back/pause/resume.

### RISK_CONFIRM_3
- Prompt template: third high-risk confirmation (“Reply YES”).
- Required fields: `riskConfirm3`.
- Pass condition: YES.
- Failure handling: block and repeat third confirmation requirement.
- Commands: status/back/pause/resume.

### EXPORT_DECISION
- Prompt template: ask export-before-delete decision (`yes`/`no`).
- Required fields: `exportDecision`.
- Pass condition: answer is `yes` or `no`.
- Failure handling: reject other values and re-prompt.
- Commands: status/back/pause/resume.

### EXECUTE
- Prompt template: final execution approval (`run|execute|go`).
- Required fields: `executeApproved`.
- Pass condition: accepted execution keyword.
- Failure handling: block and show allowed keywords.
- Commands: status/back/pause/resume.

### REPORT
- Prompt template: request post-run report summary.
- Required fields: `reportSummary`.
- Pass condition: non-empty report summary.
- Failure handling: prompt for concise outcome + evidence references.
- Commands: status/back/pause/resume.

### CLOSE
- Prompt template: completion + optional follow-up recommendations.
- Required fields: none.
- Pass condition: terminal state.
- Failure handling: none (idempotent terminal).
- Commands: status/back/pause/resume.

## 3. Output contract (minimum)
Every `handleInput()` returns:
- `currentState`
- `requiredFieldsMissing`
- `nextActions`
- `canProceed`

## 4. Quick mode compatibility
When quick mode fails due to missing key information/safety gates, it should return wizard-friendly next action objects, for example:
- target wizard state
- missing fields
- command suggestion (`npm run wizard:demo`)

## 5. 中文补充
- 本规范用于第一版可运行向导，不追求 NLP 智能，只保证流程稳定和安全闸门完整。
- 三次确认与导出决策是强门控，任何缺失都必须阻断。
- quick mode 与 wizard 共用“缺字段 -> 下一步动作”语义，便于后续接入真实对话层。
