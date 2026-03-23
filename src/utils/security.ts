const LEGACY_HASH_LENGTH = 14;

export function legacyHashPassword(str: string): string {
  let h1 = 0xdeadbeef;
  let h2 = 0x41c6ce57;

  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }

  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);

  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(16).padStart(LEGACY_HASH_LENGTH, '0');
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes).map(byte => byte.toString(16).padStart(2, '0')).join('');
}

function generateSalt(length: number = 16): string {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return bytesToHex(bytes);
}

async function sha256Hex(value: string): Promise<string> {
  const encoded = new TextEncoder().encode(value);
  const buffer = await crypto.subtle.digest('SHA-256', encoded);
  return bytesToHex(new Uint8Array(buffer));
}

export async function hashPassword(password: string, salt: string = generateSalt()): Promise<string> {
  const digest = await sha256Hex(`${salt}:${password}`);
  return `sha256:${salt}:${digest}`;
}

export async function verifyPassword(password: string, storedHash?: string): Promise<boolean> {
  if (!storedHash) return false;

  if (storedHash.startsWith('sha256:')) {
    const [, salt, digest] = storedHash.split(':');
    if (!salt || !digest) return false;
    const calculated = await sha256Hex(`${salt}:${password}`);
    return calculated === digest;
  }

  return legacyHashPassword(password) === storedHash;
}

export function needsPasswordUpgrade(storedHash?: string): boolean {
  return Boolean(storedHash && !storedHash.startsWith('sha256:'));
}

export function sanitizeText(value: string, maxLength: number = 255): string {
  return value
    .replace(/[<>]/g, '')
    .replace(/[\u0000-\u001F\u007F]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength);
}

export function sanitizeMultilineText(value: string, maxLength: number = 1000): string {
  return value
    .replace(/[<>]/g, '')
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, ' ')
    .replace(/\r\n/g, '\n')
    .trim()
    .slice(0, maxLength);
}

export function sanitizeNumber(
  value: number,
  options?: { min?: number; max?: number; integer?: boolean }
): number {
  const normalized = Number.isFinite(value) ? value : 0;
  const withMin = options?.min !== undefined ? Math.max(options.min, normalized) : normalized;
  const withMax = options?.max !== undefined ? Math.min(options.max, withMin) : withMin;
  return options?.integer ? Math.trunc(withMax) : withMax;
}