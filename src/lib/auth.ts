import { randomBytes, scrypt, timingSafeEqual, createHmac } from 'node:crypto';
import { promisify } from 'node:util';

/**
 * The login for /admin.
 *
 * One shared account, which is what the project needs: a password that the
 * team knows, checked against a hash kept in an environment variable. No
 * database, no user table, nothing stored about anybody.
 *
 * Everything here uses node:crypto. Rolling your own crypto is a bad idea;
 * calling the platform's is not, and it keeps the dependency count at zero.
 */

const scryptAsync = promisify(scrypt);

/** Deliberately slow, so guessing a password is expensive. */
const SCRYPT = { N: 16384, r: 8, p: 1, keylen: 64 } as const;

/** How long a session lasts before the editor has to sign in again. */
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 12;

export const SESSION_COOKIE = 'fem_session';

// ----------------------------------------------------------------- password

/**
 * Hashes a password for storage, as `salt:hash`. Used by
 * `npm run admin:password`; the site itself only ever verifies.
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString('hex');
  const derived = (await scryptAsync(password, salt, SCRYPT.keylen, SCRYPT)) as Buffer;
  return `${salt}:${derived.toString('hex')}`;
}

/**
 * Checks a password against a stored `salt:hash`.
 *
 * The comparison is constant-time: a plain `===` leaks how much of the hash
 * matched through how long it took to say no.
 */
export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [salt, hash] = stored.split(':');
  if (!salt || !hash) return false;

  let expected: Buffer;
  try {
    expected = Buffer.from(hash, 'hex');
  } catch {
    return false;
  }

  const derived = (await scryptAsync(password, salt, expected.length, SCRYPT)) as Buffer;
  return derived.length === expected.length && timingSafeEqual(derived, expected);
}

// ------------------------------------------------------------------ session

interface SessionPayload {
  /** Who signed in. Only ever the one admin address, but recorded anyway. */
  sub: string;
  /** Unix seconds. */
  exp: number;
}

function sign(data: string, secret: string): string {
  return createHmac('sha256', secret).update(data).digest('base64url');
}

/**
 * A session is the payload plus a signature over it. Nothing secret lives in
 * the cookie, and nothing in it can be changed without the secret.
 */
export function createSession(subject: string, secret: string): string {
  const payload: SessionPayload = {
    sub: subject,
    exp: Math.floor(Date.now() / 1000) + SESSION_MAX_AGE_SECONDS,
  };
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return `${body}.${sign(body, secret)}`;
}

/** Returns the signed-in subject, or null for anything that does not verify. */
export function readSession(token: string | undefined, secret: string): string | null {
  if (!token) return null;

  const [body, signature] = token.split('.');
  if (!body || !signature) return null;

  const expected = sign(body, secret);
  const given = Buffer.from(signature);
  const want = Buffer.from(expected);
  if (given.length !== want.length || !timingSafeEqual(given, want)) return null;

  try {
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString()) as SessionPayload;
    if (typeof payload.exp !== 'number' || payload.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }
    return typeof payload.sub === 'string' ? payload.sub : null;
  } catch {
    return null;
  }
}

export function sessionCookieOptions(secure: boolean) {
  return {
    httpOnly: true,
    // Not readable by scripts, not sent on cross-site requests, and over
    // HTTPS only in production.
    sameSite: 'lax' as const,
    secure,
    path: '/',
    maxAge: SESSION_MAX_AGE_SECONDS,
  };
}

// ------------------------------------------------------------ configuration

export interface AdminConfig {
  email: string;
  passwordHash: string;
  sessionSecret: string;
}

/**
 * Reads the admin credentials from the environment.
 *
 * Returns null rather than throwing when they are missing: the login page
 * uses that to explain what has not been set up yet, instead of showing a
 * crash to whoever happens to open it.
 */
export function readAdminConfig(env: Record<string, string | undefined>): AdminConfig | null {
  const email = env.ADMIN_EMAIL?.trim().toLowerCase();
  const passwordHash = env.ADMIN_PASSWORD_HASH?.trim();
  const sessionSecret = env.SESSION_SECRET?.trim();

  if (!email || !passwordHash || !sessionSecret) return null;
  if (sessionSecret.length < 32) return null;

  return { email, passwordHash, sessionSecret };
}

/** Case-insensitive, constant-time address comparison. */
export function emailMatches(given: string, expected: string): boolean {
  const a = Buffer.from(given.trim().toLowerCase());
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}
