import fs from 'node:fs';

export class AuthSession {
  constructor({ token = null, cookie = null, scopes = [], expiresAt = null, source = 'none', tempFilePath = null } = {}) {
    this.token = token;
    this.cookie = cookie;
    this.scopes = scopes;
    this.expiresAt = expiresAt;
    this.source = source;
    this.tempFilePath = tempFilePath;
  }

  static fromSources({ input = {}, env = process.env } = {}) {
    let tempFilePath = null;
    let filePayload = {};

    if (input.authFile) {
      tempFilePath = input.authFile;
      filePayload = JSON.parse(fs.readFileSync(input.authFile, 'utf8'));
    }

    const token = input.authToken || env.HOLMES_AUTH_TOKEN || filePayload.token || null;
    const cookie = input.authCookie || env.HOLMES_AUTH_COOKIE || filePayload.cookie || null;
    const scopeText = input.authScopes || env.HOLMES_AUTH_SCOPES || filePayload.scopes || '';
    const scopes = Array.isArray(scopeText)
      ? scopeText
      : String(scopeText)
          .split(',')
          .map(s => s.trim())
          .filter(Boolean);
    const expiresAt = input.authExpiresAt || env.HOLMES_AUTH_EXPIRES_AT || filePayload.expiresAt || null;

    const source = input.authToken || input.authCookie
      ? 'session-input'
      : input.authFile
        ? 'auth-file'
        : 'environment';

    return new AuthSession({ token, cookie, scopes, expiresAt, source, tempFilePath });
  }

  validate({ requiredScopes = [], minTtlSeconds = 120 } = {}) {
    if (!this.token && !this.cookie) {
      return { ok: false, reason: 'missing_credentials', detail: 'No token/cookie provided.' };
    }

    if (this.expiresAt) {
      const ttlSeconds = Math.floor((Date.parse(this.expiresAt) - Date.now()) / 1000);
      if (!Number.isFinite(ttlSeconds) || ttlSeconds < minTtlSeconds) {
        return { ok: false, reason: 'ttl_too_short', detail: `Credential TTL too short: ${ttlSeconds}s` };
      }
    }

    const missingScopes = requiredScopes.filter(scope => !this.scopes.includes(scope));
    if (missingScopes.length > 0) {
      return { ok: false, reason: 'insufficient_scope', detail: `Missing scopes: ${missingScopes.join(',')}` };
    }

    return { ok: true, detail: 'Auth session valid.' };
  }

  toHeaders() {
    const headers = {};
    if (this.token) headers.Authorization = `Bearer ${this.token}`;
    if (this.cookie) headers.Cookie = this.cookie;
    return headers;
  }

  clear() {
    if (this.tempFilePath && fs.existsSync(this.tempFilePath)) {
      fs.writeFileSync(this.tempFilePath, '');
      fs.unlinkSync(this.tempFilePath);
    }
    this.token = null;
    this.cookie = null;
    this.scopes = [];
    this.expiresAt = null;
  }
}
