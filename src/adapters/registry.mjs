import catalog from './brokers/config/broker-catalog.json' with { type: 'json' };
import { createDryRunBrokerAdapter } from './brokers/_dry-run-broker.mjs';
import { createLiveBrokerAdapter } from './brokers/_live-broker.mjs';

const REQUIRED_ADAPTER_METHODS = ['prepareRequest', 'submit', 'parseResult'];

function validateAdapter(adapter) {
  if (!adapter || typeof adapter.name !== 'string' || !adapter.name) {
    throw new Error('Adapter must have a non-empty string "name" property.');
  }
  for (const method of REQUIRED_ADAPTER_METHODS) {
    if (typeof adapter[method] !== 'function') {
      throw new Error(`Adapter "${adapter.name}" is missing required method: ${method}`);
    }
  }
}

function buildAdapterFromCatalog(name, entry) {
  const common = {
    name,
    displayName: entry.displayName,
    optOutUrl: entry.optOutUrl || null,
    optOutMethod: entry.optOutMethod || 'form',
    category: entry.category || 'people-search',
    jurisdiction: entry.jurisdiction || 'US'
  };

  if (entry.adapterMode === 'live') {
    return createLiveBrokerAdapter({
      ...common,
      endpointEnvVar: entry.live?.endpointEnvVar || null,
      defaultTestEndpoint: entry.live?.defaultTestEndpoint || undefined,
      officialEndpointMode: entry.live?.officialEndpointMode || 'form',
      officialEndpointConfig: entry.officialEndpoint || {},
      bodyStrategy: entry.live?.bodyStrategy || null
    });
  }

  return createDryRunBrokerAdapter(common);
}

function registerFromCatalog(catalogData) {
  const map = new Map();
  for (const [name, entry] of Object.entries(catalogData.brokers)) {
    const adapter = buildAdapterFromCatalog(name, entry);
    validateAdapter(adapter);
    map.set(name, adapter);
  }
  return map;
}

const brokerAdapters = registerFromCatalog(catalog);

export function listBrokerAdapters() {
  return Array.from(brokerAdapters.keys());
}

export function getBrokerAdapter(name) {
  const adapter = brokerAdapters.get(name);
  if (!adapter) {
    throw new Error(`Unknown broker adapter: ${name}`);
  }
  return adapter;
}

export function getBrokerAdapters(names = listBrokerAdapters()) {
  return names.map(getBrokerAdapter);
}

export const registry = {
  brokers: Object.fromEntries(brokerAdapters)
};
