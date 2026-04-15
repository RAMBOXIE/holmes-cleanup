# ADAPTER_SPEC — Agent-Friendly Adapter Specification

_Last updated: 2026-04-15_

## 0) Purpose / 目的
Define a unified adapter contract for three integration domains:
- **broker** (data broker/privacy records)
- **social** (social/content platform cleanup)
- **dmca** (copyright takedown process)

目标是保证：功能目标可对齐竞品，但执行形态采用 Agent-friendly（Skill + 对话编排 + 安全闸门 + 审计日志）。

---

## 1) Unified Contract (JSON)

```json
{
  "adapter_type": "broker|social|dmca",
  "action": "discover|submit|followup|verify|export",
  "request_id": "req_20260415_001",
  "session_id": "sess_abc123",
  "operator": {
    "user_id": "u_001",
    "channel": "telegram",
    "manual_trigger": true
  },
  "scope": {
    "platform": "example-platform",
    "targets": ["https://example.com/item/123"],
    "jurisdiction": "US"
  },
  "auth": {
    "mode": "oauth|api_key|cookie|none",
    "credential_ref": "vault://holmes/session/req_20260415_001",
    "ttl_minutes": 30,
    "least_privilege": true
  },
  "payload": {
    "rights_owner": "ACME Studio",
    "infringing_url": "https://bad.example/video/abc",
    "evidence_refs": ["ev_1", "ev_2"],
    "notes": "User supplied evidence"
  },
  "risk": {
    "risk_level": "low|medium|high",
    "requires_triple_confirm": true,
    "confirmations": ["YES", "YES", "YES"]
  },
  "result": {
    "status": "success|partial|failed",
    "adapter_job_id": "job_001",
    "output": {},
    "errors": []
  },
  "audit": {
    "started_at": "2026-04-15T09:00:00Z",
    "ended_at": "2026-04-15T09:01:20Z",
    "event_log_refs": ["log://..."],
    "export_snapshot_ref": "file://exports/sess_abc123.json"
  }
}
```

中文说明：上面是统一接口骨架，三类适配器在同一 envelope 下扩展各自 `payload` 与 `result.output`。

---

## 2) Broker Adapter

### Inputs
- Identity hints: name aliases, emails, phone, known usernames
- Jurisdiction and residency context (for lawful request phrasing)
- Optional broker account identifiers

中文：输入主要是可验证身份线索与法域范围，不要求一次性完整。

### Auth
- Prefer OAuth/session cookie with user-approved manual login
- Fallback: API key if broker supports machine API
- Credential TTL must be short-lived; no persistent plaintext storage

### Steps
1. Validate scope + manual trigger
2. Discover matching broker records
3. Build removal request package
4. Submit request (or generate prefilled form if API unavailable)
5. Capture receipt / ticket id
6. Schedule follow-up checkpoint (manual approval required)

### Output
- Match summary (`candidate_records`)
- Submission receipts (`ticket_id`, timestamp)
- Required follow-up date

### Errors
- `BROKER_AUTH_FAILED`
- `BROKER_SCOPE_INVALID`
- `BROKER_SUBMISSION_REJECTED`
- `BROKER_RATE_LIMITED`

### Retry
- Auth error: re-auth once after explicit user confirmation
- Rate limit: exponential backoff (max 3 attempts)
- Rejected request: switch to manual-form mode with user review

### Audit
- Keep evidence hash of matched records
- Store request payload snapshot before submit
- Record who approved each retry

---

## 3) Social Adapter

### Inputs
- Platform name + content URLs/post IDs
- Violation category (privacy leak, impersonation, repost, etc.)
- Evidence references and optional narrative

### Auth
- User session authorization (OAuth/cookie relay)
- No background login automation without user presence

### Steps
1. Normalize URLs and deduplicate targets
2. Resolve platform reporting path (API/form/email)
3. Prepare report payload from conversation artifacts
4. Submit and capture case ID
5. Poll status only when user requests or policy allows

### Output
- `submitted_targets`
- `case_ids`
- `platform_acknowledgement`

### Errors
- `SOCIAL_TARGET_NOT_FOUND`
- `SOCIAL_AUTH_EXPIRED`
- `SOCIAL_POLICY_MISMATCH`
- `SOCIAL_SUBMIT_BLOCKED`

### Retry
- URL normalization retries automatically once
- Auth expiry requires user re-consent
- Policy mismatch triggers template reclassification and resubmit (max 2)

### Audit
- Keep per-target action trace
- Store policy category decision rationale
- Log user-approved edits before final submit

---

## 4) DMCA Adapter

### Inputs
- Rights holder info, authorized agent info
- Original work reference
- Infringing URLs and evidence package
- Good-faith and accuracy declarations

### Auth
- Usually no API auth; identity assertion + signed statement
- For platform API channels: scoped token + legal profile id

### Steps
1. Validate mandatory legal fields
2. Generate DMCA notice from template
3. Require explicit user authenticity acknowledgement
4. Send through channel (API/form/email)
5. Capture delivery proof and response SLA

### Output
- Notice document (`notice_id`, channel)
- Delivery proof (`message_id`/submission receipt)
- Expected response window

### Errors
- `DMCA_MISSING_LEGAL_FIELD`
- `DMCA_DELIVERY_FAILED`
- `DMCA_PLATFORM_REJECTED`
- `DMCA_NEEDS_MANUAL_REVIEW`

### Retry
- Missing field: block and request user completion
- Delivery failure: switch channel (API -> email/form)
- Rejected notice: produce revision checklist before re-send

### Audit
- Immutable copy of final notice content
- Signature/consent evidence
- Full submission metadata for legal traceability

---

## 5) Safety & Governance Notes / 安全治理补充
- Authenticity judgment belongs to the user.
- Adapter executes capability; it does not declare legal truth.
- High-risk actions require triple confirmation before execution.
- Export decision must be collected before irreversible delete actions.
