import fs from 'node:fs';
import path from 'node:path';
import { loadPresetParams, mergePresetArgs } from './presets.mjs';

export function runHolmesCleanup(argv = [], options = {}) {
  const cwd = options.cwd || process.cwd();
  const parsedArgs = parseArgs(argv);
  const isQuickMode = parsedArgs.command === 'quick' || parsedArgs.quick === true;
  let args = parsedArgs;

  if (parsedArgs.preset) {
    try {
      args = mergePresetArgs(loadPresetParams(parsedArgs.preset, { cwd }), parsedArgs);
    } catch (error) {
      const payload = {
        status: 'blocked',
        session: {
          trigger: isQuickMode ? 'quick' : parsedArgs.manual ? 'manual' : 'unknown',
          notify: parsedArgs.notify || 'none',
          exportBeforeDelete: parsedArgs.exportBeforeDelete || 'ask'
        },
        checks: [{ name: 'presetLoad', pass: false, detail: String(error.message || error) }],
        nextActions: ['Use --preset with one of: spokeo, whitepages, beenverified, standard, urgent, followup.'],
        findingsPlaceholder: {
          mode: 'dry-run',
          collectedFrom: [],
          keywordCount: 0,
          sampleCount: 0,
          normalizedSamples: [],
          notes: []
        }
      };
      return jsonResult(1, payload);
    }
  }

  if (isQuickMode) {
    args = {
      ...args,
      manual: true,
      sampleFile: args.sampleFile || './examples/sample.json',
      notify: args.notify || 'none',
      exportBeforeDelete: args.exportBeforeDelete || 'ask'
    };
  }

  const checks = [];
  const nextActions = [];
  const findingsPlaceholder = {
    mode: 'dry-run',
    collectedFrom: [],
    keywordCount: 0,
    sampleCount: 0,
    normalizedSamples: [],
    notes: []
  };

  const result = {
    status: 'blocked',
    session: {
      trigger: isQuickMode ? 'quick' : args.manual ? 'manual' : 'unknown',
      notify: args.notify || 'none',
      exportBeforeDelete: args.exportBeforeDelete || 'ask',
      preset: args.preset || null
    },
    checks,
    nextActions,
    findingsPlaceholder
  };

  if (!args.manual) {
    checks.push({ name: 'manualTrigger', pass: false, detail: '必须显式传入 --manual，拒绝自动/后台触发。' });
    nextActions.push('重新运行并添加 --manual');
    return jsonResult(1, result);
  }
  checks.push({ name: 'manualTrigger', pass: true, detail: '已检测到手动触发。' });

  if (!args.keywords && !args.sampleFile) {
    checks.push({ name: 'inputSource', pass: false, detail: '至少提供一种输入来源：--keywords 或 --sample-file。' });
    nextActions.push('提供 --keywords "k1,k2" 或 --sample-file <path>');
    return jsonResult(1, result);
  }
  checks.push({ name: 'inputSource', pass: true, detail: '已提供输入来源。' });

  if (args.keywords) {
    const keywordList = args.keywords.split(',').map(s => s.trim()).filter(Boolean);
    findingsPlaceholder.collectedFrom.push('keywords');
    findingsPlaceholder.keywordCount = keywordList.length;
    checks.push({
      name: 'keywordsInput',
      pass: keywordList.length > 0,
      detail: `关键词占位收集：${keywordList.join(', ') || '空'}`
    });
  }

  if (args.sampleFile) {
    const samplePath = path.resolve(cwd, args.sampleFile);
    try {
      const raw = fs.readFileSync(samplePath, 'utf8');
      const parsed = JSON.parse(raw);
      const normalized = normalizeSamples(parsed?.samples || []);

      findingsPlaceholder.collectedFrom.push('sample-file');
      findingsPlaceholder.sampleCount = normalized.length;
      findingsPlaceholder.normalizedSamples = normalized;

      checks.push({
        name: 'sampleFileInput',
        pass: true,
        detail: `已加载样本文件（dry-run）：${samplePath}，normalizedSamples=${normalized.length}`
      });
    } catch (error) {
      checks.push({ name: 'sampleFileInput', pass: false, detail: `样本文件读取失败：${String(error.message || error)}` });
      nextActions.push('检查 --sample-file 路径和 JSON 格式');
      return jsonResult(1, result);
    }
  }

  const confirmsOk = args.confirm1 === 'YES' && args.confirm2 === 'YES' && args.confirm3 === 'YES';
  if (!confirmsOk) {
    checks.push({
      name: 'riskTripleConfirm',
      pass: false,
      detail: '高风险操作必须提供 --confirm1 YES --confirm2 YES --confirm3 YES（缺一不可）。'
    });
    nextActions.push(
      isQuickMode
        ? 'Provide --confirm1 YES --confirm2 YES --confirm3 YES to acknowledge high-risk actions.'
        : '补齐三次确认参数后重试'
    );
    return jsonResult(1, result);
  }
  checks.push({ name: 'riskTripleConfirm', pass: true, detail: '三次确认齐全。' });

  const exportBeforeDelete = args.exportBeforeDelete || 'ask';
  if (!['ask', 'yes', 'no'].includes(exportBeforeDelete)) {
    checks.push({ name: 'exportBeforeDelete', pass: false, detail: '--export-before-delete 仅支持 ask|yes|no。' });
    nextActions.push('使用 --export-before-delete ask|yes|no');
    return jsonResult(1, result);
  }

  if (exportBeforeDelete === 'ask') {
    if (!args.exportAnswer || !['yes', 'no'].includes(args.exportAnswer)) {
      checks.push({
        name: 'exportBeforeDelete',
        pass: false,
        detail: '当前为 ask 模式，必须提供 --export-answer yes|no 以继续。'
      });
      nextActions.push(
        isQuickMode
          ? 'Provide --export-answer yes or --export-answer no before any delete-capable step.'
          : '明确回答是否导出：--export-answer yes 或 --export-answer no'
      );
      return jsonResult(1, result);
    }
    checks.push({ name: 'exportBeforeDelete', pass: true, detail: `用户已回答导出决策：${args.exportAnswer}` });
  } else {
    checks.push({ name: 'exportBeforeDelete', pass: true, detail: `删除前导出策略：${exportBeforeDelete}` });
  }

  const notify = args.notify || 'none';
  if (!['none', 'telegram', 'email', 'signal'].includes(notify)) {
    checks.push({ name: 'notifyPolicy', pass: false, detail: '--notify 仅支持 none|telegram|email|signal。' });
    nextActions.push('修正 --notify 参数');
    return jsonResult(1, result);
  }
  if (notify === 'none') {
    checks.push({ name: 'notifyPolicy', pass: true, detail: '用户未启用通知，跳过推送。' });
  } else {
    checks.push({ name: 'notifyPolicy', pass: true, detail: `通知渠道占位（dry-run）：${notify}` });
  }

  const credentialPolicyText = [
    '凭据策略：仅从环境变量读取，不落盘。',
    '最小权限：仅授予完成本次任务所需权限。',
    '最短TTL：使用短时有效凭据。',
    '任务后擦除：任务结束立即清理临时凭据。'
  ].join(' ');
  checks.push({ name: 'credentialPolicy', pass: true, detail: credentialPolicyText });

  findingsPlaceholder.notes.push('自动收集/执行器仅为占位，不发外部请求。');
  findingsPlaceholder.notes.push('真实性由用户判断，工具仅提供流程与能力。');

  result.status = 'ok';
  nextActions.push('当前为 dry-run 骨架，可在 P1/P2 接入真实执行器。');

  return jsonResult(0, result);
}

function normalizeSamples(samples) {
  const list = Array.isArray(samples) ? samples : [];
  const seen = new Set();
  const out = [];

  for (let i = 0; i < list.length; i += 1) {
    const s = list[i] || {};
    const url = typeof s.url === 'string' ? s.url.trim() : '';
    const text = typeof s.text === 'string' ? s.text.trim() : '';
    const platform = typeof s.platform === 'string' ? s.platform.trim().toLowerCase() : 'unknown';

    const key = `${platform}|${url || text}`;
    if (!url && !text) continue;
    if (seen.has(key)) continue;
    seen.add(key);

    out.push({
      sample_id: s.sample_id || `sample-${i + 1}`,
      source_type: url ? 'url' : 'text',
      platform,
      content: url || text,
      evidence_refs: Array.isArray(s.evidence_refs) ? s.evidence_refs : []
    });
  }

  return out;
}

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token.startsWith('--')) {
      if (!out.command) out.command = token;
      continue;
    }

    const key = token.slice(2);
    const next = argv[i + 1];
    if (!next || next.startsWith('--')) {
      out[toCamelCase(key)] = true;
      continue;
    }

    out[toCamelCase(key)] = next;
    i += 1;
  }
  return out;
}

function toCamelCase(input) {
  return input.replace(/-([a-z])/g, (_, char) => char.toUpperCase());
}

function jsonResult(status, payload) {
  const json = `${JSON.stringify(payload, null, 2)}\n`;
  return {
    status,
    stdout: status === 0 ? json : '',
    stderr: status === 0 ? '' : json,
    payload
  };
}
