// AI history discovery + deletion planning.
//
// Vanish does NOT auto-delete user files — too risky and OS-specific. Instead:
//   1. Resolves each tool's cache paths for the current OS
//   2. stats each path to see what exists + approximate size
//   3. Prints the exact command users can copy-paste to delete
//   4. Records audit trail only when user confirms they ran the delete
//
// This matches the face-scan philosophy: discovery + documentation, not
// automation of destructive actions.

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

/**
 * Expand OS-specific path placeholders:
 *   %APPDATA% / %USERPROFILE% (Windows)
 *   ~/ (Unix home)
 *   Also resolves glob suffixes like 'github.copilot-*' (kept as-is, user shell expands).
 */
export function expandPath(rawPath, { platform = process.platform, env = process.env, homeDir = os.homedir() } = {}) {
  let expanded = rawPath;
  const pathMod = platform === 'win32' ? path.win32 : path.posix;

  if (platform === 'win32') {
    // User-profile-rooted paths
    expanded = expanded.replace(/%APPDATA%/g, env.APPDATA || pathMod.join(homeDir, 'AppData', 'Roaming'));
    expanded = expanded.replace(/%USERPROFILE%/g, env.USERPROFILE || homeDir);
    expanded = expanded.replace(/%LOCALAPPDATA%/g, env.LOCALAPPDATA || pathMod.join(homeDir, 'AppData', 'Local'));

    // System-wide paths — common for workforce-monitoring agents that install
    // as a service under Program Files or system directories.
    // Note: PROGRAMFILES(X86) must be handled before PROGRAMFILES so the
    // (X86) suffix isn't swallowed by the greedy match.
    expanded = expanded.replace(/%PROGRAMFILES\(X86\)%/gi, env['PROGRAMFILES(X86)'] || 'C:\\Program Files (x86)');
    expanded = expanded.replace(/%PROGRAMFILES%/gi, env.PROGRAMFILES || 'C:\\Program Files');
    expanded = expanded.replace(/%PROGRAMDATA%/gi, env.PROGRAMDATA || 'C:\\ProgramData');
    expanded = expanded.replace(/%WINDIR%/gi, env.WINDIR || env.SYSTEMROOT || 'C:\\Windows');
    expanded = expanded.replace(/%SYSTEMROOT%/gi, env.SYSTEMROOT || 'C:\\Windows');
  }

  if (expanded.startsWith('~/') || expanded === '~') {
    expanded = pathMod.join(homeDir, expanded.slice(2) || '');
  }

  return expanded;
}

/**
 * Resolve all paths for a tool on the current OS.
 * Returns the list with absolute paths resolved.
 */
export function resolveToolPaths(tool, { platform = process.platform, env = process.env, homeDir = os.homedir() } = {}) {
  if (!tool.paths) return [];
  const osPaths = tool.paths[platform] || [];
  return osPaths.map(p => expandPath(p, { platform, env, homeDir }));
}

/**
 * Check if a path exists + return approximate size in bytes.
 * Handles both files and directories. Returns { exists, bytes, items } or null.
 */
export function statPath(absPath) {
  try {
    const stat = fs.statSync(absPath);
    if (stat.isFile()) {
      return { exists: true, bytes: stat.size, items: 1, isDirectory: false };
    }
    if (stat.isDirectory()) {
      // Walk directory (one level deep approximation to avoid slow deep walks)
      let bytes = 0;
      let items = 0;
      try {
        const entries = fs.readdirSync(absPath, { withFileTypes: true });
        for (const entry of entries) {
          const sub = path.join(absPath, entry.name);
          try {
            const subStat = fs.statSync(sub);
            if (subStat.isFile()) {
              bytes += subStat.size;
              items++;
            } else if (subStat.isDirectory()) {
              items++;
              // Don't recurse — keep it fast; bytes will be approximate
            }
          } catch { /* ignore per-entry errors */ }
        }
      } catch { /* permission errors etc. */ }
      return { exists: true, bytes, items, isDirectory: true };
    }
    return { exists: true, bytes: 0, items: 0, isDirectory: false };
  } catch (err) {
    if (err.code === 'ENOENT') return { exists: false, bytes: 0, items: 0 };
    // Permission denied or glob-like path — treat as not-found for safety
    return { exists: false, bytes: 0, items: 0, error: err.code };
  }
}

/**
 * Format bytes for human display.
 */
export function formatBytes(bytes) {
  if (!bytes || bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  let v = bytes;
  let u = 0;
  while (v >= 1024 && u < units.length - 1) { v /= 1024; u++; }
  return `${v.toFixed(v < 10 ? 1 : 0)} ${units[u]}`;
}

/**
 * Build a delete-plan for a single tool.
 * Returns: { tool, category, resolvedPaths, existingPaths, deleteCommand, totalBytes, walkthrough }
 */
export function planToolCleanup(tool, { platform = process.platform, env = process.env, homeDir = os.homedir() } = {}) {
  const plan = {
    displayName: tool.displayName,
    category: tool.category,
    notes: tool.notes,
    preCheck: tool.preCheck || [],
    existingPaths: [],
    totalBytes: 0,
    deleteCommand: null,
    walkthrough: null,
    url: tool.url || null
  };

  if (tool.category === 'local-app') {
    const resolved = resolveToolPaths(tool, { platform, env, homeDir });
    for (const absPath of resolved) {
      const stat = statPath(absPath);
      plan.existingPaths.push({ path: absPath, ...stat });
      if (stat.exists) plan.totalBytes += stat.bytes;
    }
    plan.deleteCommand = tool.deleteCommands?.[platform] || null;
  } else if (tool.category === 'web-ui') {
    plan.walkthrough = tool.walkthrough || [];
    plan.verification = tool.verification;
  }

  return plan;
}

/**
 * Resolve user-given flags to catalog tool keys.
 */
export function resolveToolKeys(flags, catalog) {
  let keys = [];
  const entries = Object.entries(catalog.tools);

  if (flags.all) {
    for (const [key] of entries) keys.push(key);
  } else {
    if (flags.use) {
      const tokens = String(flags.use).split(',').map(s => s.trim()).filter(Boolean);
      for (const token of tokens) {
        const found = entries.find(([k, t]) => k === token || t.signalAsked === token);
        if (!found) continue;
        if (!keys.includes(found[0])) keys.push(found[0]);
      }
    }

    for (const [key, tool] of entries) {
      if (flags[key] || flags[tool.signalAsked]) {
        if (!keys.includes(key)) keys.push(key);
      }
    }
  }

  // Category filters apply after selection
  if (flags['local-only']) {
    keys = keys.filter(k => catalog.tools[k].category === 'local-app');
  }
  if (flags['web-only']) {
    keys = keys.filter(k => catalog.tools[k].category === 'web-ui');
  }

  return keys;
}
