// Training dataset membership check engine.
//
// For Common Crawl: actually query the CDX Index Server for user-provided URLs.
// For other datasets: return walkthrough metadata from catalog.

/**
 * Resolve user-given flags (e.g., "common-crawl", "laion") to catalog dataset keys.
 */
export function resolveDatasetKeys(flags, catalog) {
  const keys = [];
  const entries = Object.entries(catalog.datasets);

  if (flags.all) {
    for (const [key] of entries) keys.push(key);
    return keys;
  }

  if (flags.use) {
    const tokens = String(flags.use).split(',').map(s => s.trim()).filter(Boolean);
    for (const token of tokens) {
      const found = entries.find(([k, d]) => k === token || d.signalAsked === token);
      if (!found) continue;
      if (!keys.includes(found[0])) keys.push(found[0]);
    }
  }

  for (const [key, dataset] of entries) {
    if (flags[key] || flags[dataset.signalAsked]) {
      if (!keys.includes(key)) keys.push(key);
    }
  }

  return keys;
}

/**
 * List Common Crawl index snapshots (monthly crawls).
 * Returns array of { id, name, cdxApi, from, to }.
 * Falls back to a hardcoded list if the collinfo endpoint is unavailable.
 */
export async function listCommonCrawlSnapshots({ timeoutMs = 15000, fetchImpl = fetch } = {}) {
  const fallback = [
    { id: 'CC-MAIN-2025-42', cdxApi: 'https://index.commoncrawl.org/CC-MAIN-2025-42-index' },
    { id: 'CC-MAIN-2025-30', cdxApi: 'https://index.commoncrawl.org/CC-MAIN-2025-30-index' },
    { id: 'CC-MAIN-2025-13', cdxApi: 'https://index.commoncrawl.org/CC-MAIN-2025-13-index' },
    { id: 'CC-MAIN-2024-51', cdxApi: 'https://index.commoncrawl.org/CC-MAIN-2024-51-index' },
    { id: 'CC-MAIN-2024-42', cdxApi: 'https://index.commoncrawl.org/CC-MAIN-2024-42-index' }
  ];

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetchImpl('https://index.commoncrawl.org/collinfo.json', {
      signal: controller.signal
    });
    if (!res.ok) return fallback;
    const info = await res.json();
    return info.slice(0, 5).map(i => ({ id: i.id, cdxApi: i['cdx-api'] || `https://index.commoncrawl.org/${i.id}-index` }));
  } catch {
    return fallback;
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Query Common Crawl CDX for a specific URL.
 * Returns { url, snapshotsChecked, hits: [{snapshot, timestamp, digest}], error? }.
 */
export async function queryCommonCrawl(url, { snapshots, timeoutMs = 20000, fetchImpl = fetch } = {}) {
  if (!snapshots) snapshots = await listCommonCrawlSnapshots({ fetchImpl });

  const result = { url, snapshotsChecked: snapshots.length, hits: [], errors: [] };

  for (const snap of snapshots) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const qUrl = `${snap.cdxApi}?url=${encodeURIComponent(url)}&output=json&limit=5`;
      const res = await fetchImpl(qUrl, { signal: controller.signal });
      if (res.status === 404) continue; // no records for this URL in this snapshot
      if (!res.ok) {
        result.errors.push({ snapshot: snap.id, status: res.status });
        continue;
      }
      const text = await res.text();
      // CDX returns one JSON object per line
      for (const line of text.split('\n')) {
        if (!line.trim()) continue;
        try {
          const record = JSON.parse(line);
          result.hits.push({
            snapshot: snap.id,
            timestamp: record.timestamp,
            length: record.length,
            url: record.url,
            digest: record.digest
          });
        } catch { /* skip malformed */ }
      }
    } catch (err) {
      result.errors.push({ snapshot: snap.id, error: err.message });
    } finally {
      clearTimeout(timeout);
    }
  }

  return result;
}

/**
 * Build the check plan — which datasets to query + which need walkthroughs.
 */
export function planDatasetCheck(keys, catalog) {
  const plan = [];
  for (const key of keys) {
    const dataset = catalog.datasets[key];
    if (!dataset) continue;
    plan.push({
      key,
      displayName: dataset.displayName,
      shortName: dataset.shortName,
      usedBy: dataset.usedBy || [],
      queryMethod: dataset.queryMethod,
      automated: Boolean(dataset.howToCheck?.automated),
      checkWalkthrough: dataset.checkWalkthrough || null,
      optOutWalkthrough: dataset.optOutWalkthrough || null,
      notes: dataset.notes
    });
  }
  return plan;
}

/**
 * Render a short risk summary based on hits and datasets checked.
 */
export function classifyExposure(hitCount, datasetCount) {
  if (hitCount === 0) return { level: 'low', label: '✅ no direct hits' };
  if (hitCount < 5) return { level: 'moderate', label: '⚠️  limited presence' };
  if (hitCount < 50) return { level: 'high', label: '🔴 significant presence' };
  return { level: 'critical', label: '🔴 saturated presence' };
}
