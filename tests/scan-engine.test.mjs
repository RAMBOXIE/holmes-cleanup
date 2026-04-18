import test from 'node:test';
import assert from 'node:assert/strict';

import { runHeuristicScan } from '../src/scanner/scan-engine.mjs';

const fullIdentity = {
  fullName: 'John Doe',
  emails: ['john@example.com'],
  phones: ['+15551234567'],
  usernames: ['johndoe'],
  jurisdiction: 'US',
  city: 'New York',
  state: 'NY'
};

const minimalIdentity = {
  fullName: 'Jane Smith',
  jurisdiction: 'US'
};

test('scan returns valid ScanResult shape', () => {
  const result = runHeuristicScan(fullIdentity);

  assert.ok(result.scanId.startsWith('scan_'));
  assert.ok(result.scannedAt);
  assert.equal(typeof result.privacyScore, 'number');
  assert.ok(['low', 'moderate', 'high', 'critical'].includes(result.riskLevel));
  assert.equal(typeof result.summary.totalBrokers, 'number');
  assert.equal(typeof result.summary.likelyExposed, 'number');
  assert.equal(typeof result.summary.possiblyExposed, 'number');
  assert.equal(typeof result.summary.unlikelyExposed, 'number');
  assert.ok(result.summary.byCategory);
  assert.ok(result.summary.byRisk);
  assert.ok(Array.isArray(result.exposures));
  assert.ok(Array.isArray(result.recommendations));
});

test('scan processes all brokers by default (201 after Hiya addition)', () => {
  const result = runHeuristicScan(fullIdentity);
  assert.equal(result.summary.totalBrokers, 201);
  assert.equal(result.exposures.length, 201);
});

test('full identity yields higher score than minimal identity', () => {
  const fullResult = runHeuristicScan(fullIdentity);
  const minResult = runHeuristicScan(minimalIdentity);

  assert.ok(fullResult.privacyScore > minResult.privacyScore,
    `Full: ${fullResult.privacyScore} should be > Minimal: ${minResult.privacyScore}`);
});

test('US jurisdiction matches US brokers with higher confidence', () => {
  const usResult = runHeuristicScan({ ...fullIdentity, jurisdiction: 'US' });
  const euResult = runHeuristicScan({ ...fullIdentity, jurisdiction: 'EU' });

  // US brokers should give higher avg confidence for US identity
  const usAvg = usResult.exposures.reduce((sum, e) => sum + e.confidence, 0) / usResult.exposures.length;
  const euAvg = euResult.exposures.reduce((sum, e) => sum + e.confidence, 0) / euResult.exposures.length;

  assert.ok(usAvg > euAvg, `US avg ${usAvg.toFixed(3)} should be > EU avg ${euAvg.toFixed(3)}`);
});

test('scan with custom catalog override works', () => {
  const testCatalog = {
    brokers: {
      'test-broker': {
        displayName: 'Test Broker',
        category: 'people-search',
        jurisdiction: 'US',
        optOutUrl: 'https://test.com/optout',
        optOutMethod: 'form',
        dataTypes: ['name', 'email', 'phone']
      }
    }
  };

  const result = runHeuristicScan(fullIdentity, { catalog: testCatalog });
  assert.equal(result.summary.totalBrokers, 1);
  assert.equal(result.exposures[0].broker, 'test-broker');
  assert.equal(result.exposures[0].displayName, 'Test Broker');
});

test('scan with broker filter limits results', () => {
  const result = runHeuristicScan(fullIdentity, { brokers: ['spokeo', 'whitepages'] });
  assert.equal(result.summary.totalBrokers, 2);
  assert.equal(result.exposures.length, 2);
});

test('every exposure has required fields', () => {
  const result = runHeuristicScan(fullIdentity);
  for (const exp of result.exposures) {
    assert.ok(exp.broker, 'missing broker');
    assert.ok(exp.displayName, 'missing displayName');
    assert.ok(exp.category, 'missing category');
    assert.ok(['likely', 'possible', 'unlikely'].includes(exp.likelihood), `invalid likelihood: ${exp.likelihood}`);
    assert.equal(typeof exp.confidence, 'number');
    assert.ok(['critical', 'high', 'moderate', 'low'].includes(exp.riskTier), `invalid riskTier: ${exp.riskTier}`);
    assert.ok(exp.reason, 'missing reason');
    assert.ok(Array.isArray(exp.dataTypesExposed), 'missing dataTypesExposed');
    assert.ok(['easy', 'moderate', 'hard'].includes(exp.removalDifficulty), `invalid difficulty: ${exp.removalDifficulty}`);
  }
});

test('identity is redacted in result', () => {
  const result = runHeuristicScan(fullIdentity);
  assert.ok(!result.identity.fullName, 'fullName should be redacted');
  assert.ok(result.identity.name, 'redacted name should exist');
  assert.ok(result.identity.name.includes('.'), 'redacted name should be abbreviated');
  assert.ok(result.identity.emailDomains[0].startsWith('***@'), 'email should be redacted');
  assert.ok(result.identity.phoneAreaCodes[0].includes('***'), 'phone should be redacted');
});

test('throws when fullName is missing', () => {
  assert.throws(() => runHeuristicScan({}), /fullName is required/);
  assert.throws(() => runHeuristicScan(null), /fullName is required/);
});
