# TODO — holmes-cleanup

## P0 (Critical) — ✅ Done
- [x] Define unified session structure (trigger/scope/risk/notify/export/credential policy)
- [x] Enforce manual-only trigger validation
- [x] Enforce triple-confirmation gate for high-risk actions
- [x] Enforce pre-delete export decision gate
- [x] Implement notification mode branch
- [x] Pin credential safety policy checkpoints
- [x] Emit minimum structured execution report

## P1 (High Priority) — ✅ Done
- [x] Intake adapter: keywords + user sample file
- [x] Sample normalization and deduplication (`sample_id/source_type/evidence_refs`)
- [x] User authenticity responsibility notice
- [x] Dry-run mode for safe rehearsal
- [x] Unit tests for guardrails

## P2 (Next)
- [ ] Platform strategy templates (no real creds)
- [ ] Mock pluggable executor (still dry-run by default)
- [ ] Better review summary format (human audit-friendly)
- [ ] Bilingual prompt packs (EN primary, 中文辅助)
- [ ] Future adapter interface for real platform integrations
- [ ] 竞品覆盖清单（按 broker/social/dmca 三类映射：能力项、缺口项、替代策略）

---

## Validation log / 验证记录
1. Block without `--manual` ✅
2. Block without triple confirmations ✅
3. Block when `ask` export has no answer ✅
4. Pass full dry-run with sample deduplication ✅
5. Unit tests passed: 4/4 ✅
