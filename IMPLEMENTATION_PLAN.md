# holmes-cleanup IMPLEMENTATION PLAN (MVP)

## 0. 目标与边界
- 目标：构建一个“手动触发”的福尔摩斯清理 Skill，用于辅助识别与处理盗版样本、执行分级清理流程、并在高风险动作前进行严格确认。
- 边界：
  - 仅手动触发，不做定时巡检。
  - 不接入真实账号凭据，不发外部请求（当前阶段仅初始化设计与结构）。

---

## 1. MVP 模块拆分

### M1. Trigger & Session Control（触发与会话控制）
**职责**
- 接收用户手动指令启动一次 cleanup 会话。
- 明确本次会话范围（目标平台/目标集合/操作类型）。

**MVP 输出**
- 会话上下文对象（内存态）：`session_id`, `scope`, `risk_level`, `notify_preference`。

---

### M2. Sample Intake（样本输入）
**职责**
- 支持两种盗版样本来源：
  1) 关键词自动收集（工具能力层，仅采集候选）
  2) 用户自提供样本（URL/ID/文本描述/截图索引）
- 标注“真实性由用户判断”，工具只做辅助收集与整理。

**MVP 输出**
- 统一样本结构（占位）：
  - `sample_id`
  - `source_type` (`keyword_collect` | `user_provided`)
  - `evidence_refs`
  - `authenticity_status` (`unverified` 默认)

---

### M3. Risk Gate（三次确认闸门）
**职责**
- 无冷静期（cooldown=0）。
- 对高风险动作启用 3 次确认（明确、连续、可审计）。

**高风险动作定义（MVP）**
- 删除/下架/封禁等不可逆或高影响操作。

**确认流程（MVP）**
1) 第一次确认：展示动作摘要与影响范围。
2) 第二次确认：再次确认对象清单与不可逆后果。
3) 第三次确认：最终口令式确认（如“确认执行”）。

**MVP 输出**
- `risk_confirmations: [true/false, true/false, true/false]`
- 仅三次均通过才可进入执行阶段。

---

### M4. Pre-Delete Export Prompt（删除前导出询问）
**职责**
- 在任何删除动作前，强制询问用户是否导出数据。

**MVP 分支**
- `export_before_delete = yes`：进入导出步骤（目前仅接口占位，不实际接外部）。
- `export_before_delete = no`：记录用户放弃导出并继续。

**MVP 输出**
- `export_decision`, `export_artifact_ref (optional placeholder)`

---

### M5. Notification Preference（通知偏好）
**职责**
- 通知方式由用户选择。
- 若用户无 clawbot，可选择“不通知”。

**MVP 输出**
- `notify_mode`: `clawbot` | `none` | `custom_placeholder`

---

### M6. Credential Safety Policy（凭据安全策略）
**职责**
- 仅定义策略，不接入真实凭据：
  - 最短 TTL
  - 最小权限
  - 任务后擦除

**MVP 输出**
- `credential_policy` 配置占位（文档化），并在流程中强制校验。

---

## 2. MVP 端到端流程
1. 用户手动触发 cleanup。  
2. 收集样本（关键词自动收集 + 用户自提供）。  
3. 生成候选处理列表，提示“真实性由用户判断”。  
4. 用户选择处理动作。  
5. 若为高风险动作，执行三次确认。  
6. 若包含删除动作，先询问是否导出。  
7. 执行动作（当前阶段仅流程占位，不连外部）。  
8. 按用户选择执行通知（或不通知）。  
9. 会话结束，执行凭据擦除策略（占位）。

---

## 3. 关键确认点（Checkpoints）
- C1：手动触发确认（禁止后台/定时）。
- C2：样本来源确认（关键词采集 + 用户样本）。
- C3：真实性责任确认（由用户最终判断）。
- C4：高风险动作 3 次确认。
- C5：删除前导出决策确认。
- C6：通知方式确认（可 none）。
- C7：凭据策略确认（TTL/权限/擦除）。

---

## 4. 接口占位（不落地真实凭据/外部请求）

## 4.1 输入接口（占位）
- `start_cleanup(scope, notify_mode)`
- `ingest_samples(keyword_list, user_samples)`
- `set_action_plan(actions)`
- `confirm_risk(step_index, confirmation_text)`
- `set_export_decision(yes_or_no)`

## 4.2 输出接口（占位）
- `preview_candidates()`
- `preview_risk_summary()`
- `execution_report()`
- `notification_payload()`

## 4.3 安全接口（占位）
- `issue_ephemeral_credential(ttl, permissions)`
- `wipe_credentials(session_id)`

---

## 5. 验收标准（MVP）
- 可以通过手动命令启动完整流程。
- 高风险动作无法绕过“三次确认”。
- 删除动作前必出现“是否导出数据”询问。
- 通知支持用户选择，并允许无 clawbot 时不通知。
- 样本输入支持“关键词自动收集 + 用户提供”。
- 文档中明确“真实性由用户判断”。
- 凭据策略清晰写明：最短 TTL + 最小权限 + 任务后擦除。
