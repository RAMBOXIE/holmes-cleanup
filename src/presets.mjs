import fs from 'node:fs';
import path from 'node:path';

const PRESET_GROUPS = ['brokers', 'dmca'];

export function loadPresetParams(name, options = {}) {
  const cwd = options.cwd || process.cwd();
  const presetName = String(name || '').trim();
  if (!presetName) {
    throw new Error('Preset name is required.');
  }

  const presetPath = findPresetPath(cwd, presetName);
  if (!presetPath) {
    throw new Error(`Preset not found: ${presetName}`);
  }

  const parsed = JSON.parse(fs.readFileSync(presetPath, 'utf8'));
  return {
    ...parsed,
    preset: parsed.preset || path.basename(presetPath, '.json')
  };
}

export function mergePresetArgs(presetParams = {}, userArgs = {}) {
  return {
    ...presetParams,
    ...userArgs
  };
}

function findPresetPath(cwd, name) {
  const normalized = name.replace(/\\/g, '/');
  const candidates = [];

  if (normalized.includes('/')) {
    candidates.push(path.join(cwd, 'templates', `${normalized}.json`));
  }

  for (const group of PRESET_GROUPS) {
    candidates.push(path.join(cwd, 'templates', group, `${normalized}.json`));
  }

  return candidates.find(candidate => fs.existsSync(candidate)) || null;
}
