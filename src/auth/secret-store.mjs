import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const STORE_VERSION = 1;

export class SecretStore {
  constructor({
    filePath = path.resolve('data', 'secret-store.json'),
    masterKey = process.env.HOLMES_SECRET_MASTER_KEY || null,
    forceFallback = false,
    platform = process.platform
  } = {}) {
    this.filePath = filePath;
    this.masterKey = masterKey;
    this.forceFallback = forceFallback;
    this.platform = platform;
    fs.mkdirSync(path.dirname(this.filePath), { recursive: true });
    if (!fs.existsSync(this.filePath)) {
      fs.writeFileSync(this.filePath, JSON.stringify({ version: STORE_VERSION, secrets: {} }, null, 2));
    }
  }

  async setSecret(name, plaintext, { ttlSeconds = null, tags = [] } = {}) {
    const now = new Date().toISOString();
    const expiresAt = Number.isFinite(ttlSeconds) ? new Date(Date.now() + ttlSeconds * 1000).toISOString() : null;
    const encrypted = this.encrypt(String(plaintext));
    const state = this.read();
    state.secrets[name] = {
      ...encrypted,
      createdAt: state.secrets[name]?.createdAt || now,
      updatedAt: now,
      expiresAt,
      tags: Array.isArray(tags) ? tags : []
    };
    this.write(state);
    return { name, updatedAt: now, expiresAt };
  }

  async getSecret(name) {
    const state = this.read();
    const record = state.secrets[name];
    if (!record) return null;
    if (record.expiresAt && Date.parse(record.expiresAt) <= Date.now()) {
      const error = new Error(`Secret expired: ${name}`);
      error.code = 'SECRET_EXPIRED';
      throw error;
    }
    return this.decrypt(record);
  }

  async deleteSecret(name) {
    const state = this.read();
    const existed = Boolean(state.secrets[name]);
    delete state.secrets[name];
    this.write(state);
    return existed;
  }

  async listMeta() {
    const state = this.read();
    return Object.entries(state.secrets).map(([name, record]) => ({
      name,
      provider: record.provider,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
      expiresAt: record.expiresAt,
      expired: Boolean(record.expiresAt && Date.parse(record.expiresAt) <= Date.now()),
      tags: Array.isArray(record.tags) ? record.tags : []
    }));
  }

  read() {
    const parsed = JSON.parse(fs.readFileSync(this.filePath, 'utf8'));
    return { version: STORE_VERSION, secrets: {}, ...parsed };
  }

  write(state) {
    fs.writeFileSync(this.filePath, JSON.stringify(state, null, 2));
  }

  encrypt(plaintext) {
    if (this.canUseDpapi()) {
      return { provider: 'windows-dpapi', ciphertext: dpapiProtect(plaintext) };
    }
    const salt = crypto.randomBytes(16);
    const key = this.deriveKey(salt);
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
    const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
    return {
      provider: 'aes-256-gcm',
      kdf: 'scrypt',
      salt: salt.toString('base64'),
      iv: iv.toString('base64'),
      tag: cipher.getAuthTag().toString('base64'),
      ciphertext: ciphertext.toString('base64')
    };
  }

  decrypt(record) {
    if (record.provider === 'windows-dpapi') {
      return dpapiUnprotect(record.ciphertext);
    }
    if (record.provider !== 'aes-256-gcm') {
      throw new Error(`Unsupported secret provider: ${record.provider}`);
    }
    // Derive key: scrypt if salt present, legacy SHA-256 for old records
    const key = record.kdf === 'scrypt' && record.salt
      ? this.deriveKey(Buffer.from(record.salt, 'base64'))
      : this.legacyKey();
    const decipher = crypto.createDecipheriv(
      'aes-256-gcm',
      key,
      Buffer.from(record.iv, 'base64')
    );
    decipher.setAuthTag(Buffer.from(record.tag, 'base64'));
    return Buffer.concat([
      decipher.update(Buffer.from(record.ciphertext, 'base64')),
      decipher.final()
    ]).toString('utf8');
  }

  canUseDpapi() {
    return !this.forceFallback && this.platform === 'win32';
  }

  deriveKey(salt) {
    if (!this.masterKey) {
      throw new Error('HOLMES_SECRET_MASTER_KEY is required when Windows DPAPI is unavailable.');
    }
    return crypto.scryptSync(this.masterKey, salt, 32, { N: 16384, r: 8, p: 1 });
  }

  // Backward compatibility for secrets encrypted before scrypt migration
  legacyKey() {
    if (!this.masterKey) {
      throw new Error('HOLMES_SECRET_MASTER_KEY is required when Windows DPAPI is unavailable.');
    }
    return crypto.createHash('sha256').update(this.masterKey).digest();
  }
}

export function createSecretStore(options = {}) {
  return new SecretStore(options);
}

function dpapiProtect(plaintext) {
  const script = [
    '$plain = [Console]::In.ReadToEnd()',
    '$secure = ConvertTo-SecureString -String $plain -AsPlainText -Force',
    'ConvertFrom-SecureString -SecureString $secure'
  ].join('; ');
  return execFileSync('powershell.exe', ['-NoProfile', '-Command', script], {
    input: plaintext,
    encoding: 'utf8',
    windowsHide: true
  }).trim();
}

function dpapiUnprotect(ciphertext) {
  const script = [
    '$cipher = [Console]::In.ReadToEnd()',
    '$secure = ConvertTo-SecureString -String $cipher',
    '$ptr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)',
    'try { [Runtime.InteropServices.Marshal]::PtrToStringBSTR($ptr) } finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($ptr) }'
  ].join('; ');
  return execFileSync('powershell.exe', ['-NoProfile', '-Command', script], {
    input: ciphertext,
    encoding: 'utf8',
    windowsHide: true
  });
}
