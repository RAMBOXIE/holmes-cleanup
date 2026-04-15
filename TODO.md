# holmes-cleanup TODO

## P0（必须先完成）
- [x] 定义统一会话数据结构（session/scope/risk/notify/export/credential_policy）。
- [x] 实现“仅手动触发”入口校验（拒绝定时/后台触发参数）。
- [x] 实现高风险动作三次确认状态机（不可跳步、可审计）。
- [x] 实现删除前导出询问拦截器（删除动作前强制分支）。
- [x] 实现通知偏好分支（clawbot / none / custom placeholder）。
- [x] 固化凭据策略占位：最短TTL、最小权限、任务后擦除。
- [x] 生成最小执行报告模板（动作、结果、失败原因、确认记录）。

## P1（应尽快完成）
- [x] 实现样本输入适配层：关键词自动收集入口 + 用户样本入口。
- [x] 样本去重与标准化（sample_id/source_type/evidence_refs）。
- [x] 增加“真实性由用户判断”的标准提示模板与确认记录。
- [x] 增加 dry-run 模式，便于先演练流程不执行动作。
- [x] 为关键流程补充单元测试（确认闸门、导出询问、通知分支）。

## P2（增强项）
- [ ] 在 references/ 增加平台策略模板（占位文档，不含真实凭据）。
- [ ] 在 scripts/ 增加本地模拟执行器（仍默认 dry-run，可切换 mock action）。
- [ ] 增加可读性更高的会话总结格式（给用户快速复核）。
- [ ] 增加多语言提示模板（中文/英文）。
- [ ] 设计后续可插拔执行器接口（便于未来接不同平台）。

## 验证记录
1. 失败用例（缺少 --manual）
   - 命令：`npm run run -- --keywords "a,b" --confirm1 YES --confirm2 YES --confirm3 YES --export-before-delete yes`
   - 结果：退出码 1，`status=blocked`，命中 `manualTrigger` 失败。

2. 失败用例（缺少三次确认）
   - 命令：`npm run run -- --manual --keywords "a,b" --export-before-delete yes`
   - 结果：退出码 1，`status=blocked`，命中 `riskTripleConfirm` 失败。

3. 失败用例（ask 但未回答导出）
   - 命令：`npm run run -- --manual --keywords "a,b" --confirm1 YES --confirm2 YES --confirm3 YES --export-before-delete ask`
   - 结果：退出码 1，`status=blocked`，命中 `exportBeforeDelete` 失败。

4. 成功用例（完整 dry-run + sample）
   - 命令：`npm run dry`
   - 结果：退出码 0，`status=ok`，样本去重后 `sampleCount=2`。

5. 单元测试
   - 命令：`npm test`
   - 结果：4/4 通过。
