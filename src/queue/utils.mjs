export function serializeError(error) {
  if (!error) return null;
  return {
    name: error.name || 'Error',
    message: error.message || String(error),
    code: error.code || 'UNKNOWN',
    transient: Boolean(error.transient)
  };
}
