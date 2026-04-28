// Tests for audit-parser.js. Uses the real fixture artifacts already in
// the repo at vanish/reports/*.json and vanish/data/queue-state.json so
// the test stays grounded in actual CLI output shape.

import { describe, test, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  safeParseJson,
  detectKind,
  parseAuditArtifact,
  summariseAuditChain,
  validateStructure,
  MAX_INPUT_BYTES
} from '../src/lib/audit-parser.js';
import { renderArtifactView } from '../src/lib/queue-renderer.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..', '..');

function loadFixture(relPath) {
  const fullPath = path.join(REPO_ROOT, relPath);
  return fs.readFileSync(fullPath, 'utf8');
}

describe('safeParseJson', () => {
  test('parses a valid JSON object', () => {
    const r = safeParseJson('{"a": 1, "b": [2, 3]}');
    expect(r.ok).toBe(true);
    expect(r.value).toEqual({ a: 1, b: [2, 3] });
  });

  test('rejects non-string input', () => {
    expect(safeParseJson(null).ok).toBe(false);
    expect(safeParseJson(undefined).ok).toBe(false);
    expect(safeParseJson(42).ok).toBe(false);
  });

  test('rejects malformed JSON with descriptive error', () => {
    const r = safeParseJson('{this is not json}');
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/Not valid JSON/);
  });

  test('rejects top-level non-object (array)', () => {
    const r = safeParseJson('[1,2,3]');
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/object/);
  });

  test('enforces 10 MB size cap', () => {
    const huge = JSON.stringify({ x: 'a'.repeat(MAX_INPUT_BYTES + 1) });
    const r = safeParseJson(huge);
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/cap/);
  });

  test('strips __proto__ at top level', () => {
    const malicious = '{"good": 1, "__proto__": {"polluted": true}}';
    const r = safeParseJson(malicious);
    expect(r.ok).toBe(true);
    // After stripping, the prototype shouldn't be polluted
    expect({}.polluted).toBeUndefined();
  });
});

describe('detectKind', () => {
  test('detects "report" shape from real e2e-success.json', () => {
    const json = JSON.parse(loadFixture('reports/e2e-success.json'));
    expect(detectKind(json)).toBe('report');
  });

  test('detects "queue-state" shape from real data/queue-state.json', () => {
    const json = JSON.parse(loadFixture('data/queue-state.json'));
    expect(detectKind(json)).toBe('queue-state');
  });

  test('returns "unknown" for empty object', () => {
    expect(detectKind({})).toBe('unknown');
    expect(detectKind(null)).toBe('unknown');
  });
});

describe('parseAuditArtifact', () => {
  test('parses real e2e-success report fixture', () => {
    const json = JSON.parse(loadFixture('reports/e2e-success.json'));
    const view = parseAuditArtifact(json);
    expect(view.kind).toBe('report');
    expect(view.status).toBe('ok');
    expect(view.mode).toBe('live');
    expect(view.results.length).toBeGreaterThan(0);
    expect(view.summary.attempted).toBe(1);
    expect(view.summary.successful).toBe(1);
  });

  test('parses real e2e-fail-final fixture', () => {
    const json = JSON.parse(loadFixture('reports/e2e-fail-final.json'));
    const view = parseAuditArtifact(json);
    expect(view.kind).toBe('report');
    // Either needs_review or has retry/dead-letter queue activity
    expect(['ok', 'needs_review', 'blocked']).toContain(view.status);
  });

  test('parses real data/queue-state.json fixture', () => {
    const json = JSON.parse(loadFixture('data/queue-state.json'));
    const view = parseAuditArtifact(json);
    expect(view.kind).toBe('queue-state');
    expect(Array.isArray(view.audit)).toBe(true);
    expect(view.buckets).toHaveProperty('failed');
    expect(view.buckets).toHaveProperty('audit');
  });

  test('tolerates unknown bucket names (forward-compatible)', () => {
    const json = {
      audit: [],
      followUp: [],
      newBucketTypeQueue: [{ broker: 'spokeo', requestId: 'x' }]
    };
    const view = parseAuditArtifact(json);
    expect(view.kind).toBe('queue-state');
    expect(view.extraBuckets).toHaveProperty('newBucketTypeQueue');
    expect(view.extraBuckets.newBucketTypeQueue.length).toBe(1);
  });
});

describe('summariseAuditChain', () => {
  test('counts signed vs unsigned correctly using real fixture', () => {
    const json = JSON.parse(loadFixture('data/queue-state.json'));
    const summary = summariseAuditChain(json.audit);
    expect(summary.total).toBe(json.audit.length);
    expect(summary.signed + summary.unsigned).toBe(summary.total);
    // The fixture uses HMAC-SHA256 signed entries
    if (summary.total > 0) {
      expect(summary.signed).toBeGreaterThan(0);
      expect(summary.structurallyValid).toBe(summary.signed);
    }
  });

  test('flags malformed signatures as structurally invalid', () => {
    const audit = [
      { event: 'submitted', signature: 'sha256=' + 'a'.repeat(64), signatureAlgorithm: 'HMAC-SHA256' },
      { event: 'submitted', signature: 'wrong-format', signatureAlgorithm: 'HMAC-SHA256' },
      { event: 'submitted', signature: 'sha256=tooshort', signatureAlgorithm: 'HMAC-SHA256' },
      { event: 'submitted', signature: 'sha256=' + 'a'.repeat(64), signatureAlgorithm: 'WrongAlgo' }
    ];
    const s = summariseAuditChain(audit);
    expect(s.signed).toBe(4);
    expect(s.structurallyValid).toBe(1);
    expect(s.structurallyInvalid).toBe(3);
  });

  test('returns zero counts for empty array', () => {
    const s = summariseAuditChain([]);
    expect(s.total).toBe(0);
    expect(s.signed).toBe(0);
    expect(s.unsigned).toBe(0);
  });

  test('builds event-type histogram', () => {
    const audit = [
      { event: 'submitted' },
      { event: 'submitted' },
      { event: 'blocked' }
    ];
    const s = summariseAuditChain(audit);
    expect(s.eventCounts).toEqual({ submitted: 2, blocked: 1 });
  });
});

describe('validateStructure', () => {
  test('valid for both fixtures', () => {
    const reportJson = JSON.parse(loadFixture('reports/e2e-success.json'));
    expect(validateStructure(reportJson).valid).toBe(true);
    const stateJson = JSON.parse(loadFixture('data/queue-state.json'));
    expect(validateStructure(stateJson).valid).toBe(true);
  });

  test('flags inconsistent summary counts', () => {
    const corrupt = {
      brokers: ['spokeo'],
      results: [],
      summary: { attempted: 1, successful: 5, retryQueued: 0, manualReviewQueued: 0 }
    };
    const v = validateStructure(corrupt);
    expect(v.valid).toBe(false);
    expect(v.issues.join(' ')).toMatch(/more than attempted/);
  });
});

describe('renderArtifactView (smoke test)', () => {
  test('renders the e2e-success report into a container without throwing', () => {
    const div = document.createElement('div');
    document.body.appendChild(div);
    const json = JSON.parse(loadFixture('reports/e2e-success.json'));
    const view = parseAuditArtifact(json);
    const validation = validateStructure(json);
    expect(() => renderArtifactView(div, view, validation)).not.toThrow();
    expect(div.querySelector('.artifact-head')).toBeTruthy();
    // Status badge should reflect "ok"
    expect(div.querySelector('.status-ok')).toBeTruthy();
  });

  test('renders queue-state.json with audit timeline + HMAC banner', () => {
    const div = document.createElement('div');
    const json = JSON.parse(loadFixture('data/queue-state.json'));
    const view = parseAuditArtifact(json);
    renderArtifactView(div, view, validateStructure(json));
    // HMAC banner only renders when audit is non-empty
    if (view.audit.length > 0) {
      expect(div.querySelector('.hmac-disclaimer')).toBeTruthy();
      expect(div.textContent).toMatch(/Structural integrity/);
      expect(div.querySelector('.audit-timeline')).toBeTruthy();
    }
  });
});
