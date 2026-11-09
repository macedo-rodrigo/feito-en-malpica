import {
  randomBytes,
  scrypt,
  timingSafeEqual,
  createHmac,
  type ScryptOptions,
} from 'node:crypto';

/**
 * The login for /admin.
 *
 * A short list of accounts kept in an environment variable: one line per
 * person, each with their own password hash. No database, no user table,
 * nothing stored about anybody beyond those lines.
 *
 * Separate accounts rather than one shared password, because a password you
 * have to send someone over a chat is a password you cannot take back, and
 * because the commit each save produces then says who made it.
 *
 * Everything here uses node:crypto. Rolling your own crypto is a bad idea;
 * calling the platform's is not, and it keeps the dependency count at zero.
 */

/** Deliberately slow, so guessing a password is expensive. */
const SCRYPT = { N: 16384, r: 8, p: 1, keylen: 64 } as const;

/**
 * Written out rather than wrapped with promisify: promisify only picks up
 * one of scrypt's overloads, and it is not the one that takes options.
 */
function scryptAsync(
  password: string,
  salt: string,
  keylen: number,
  options: ScryptOptions,
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(password, salt, keylen, options, (error, derived) =>
      error ? reject(error) : resolve(derived),
    );
  });
}

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
  const derived = await scryptAsync(password, salt, SCRYPT.keylen, SCRYPT);
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

  const derived = await scryptAsync(password, salt, expected.length, SCRYPT);
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

export interface AdminUser {
  email: string;
  passwordHash: string;
}

export interface AdminConfig {
  users: AdminUser[];
  sessionSecret: string;
}

/**
 * Reads the admin credentials from the environment.
 *
 * Returns null rather than throwing when they are missing: the login page
 * uses that to explain what has not been set up yet, instead of showing a
 * crash to whoever happens to open it.
 */
/**
 * Reads ADMIN_USERS: one account per line, as `correo hash`. Lines that do
 * not look like an account are skipped rather than failing the whole login,
 * so one bad paste cannot lock everybody out.
 */
export function readAdminConfig(env: Record<string, string | undefined>): AdminConfig | null {
  const sessionSecret = env.SESSION_SECRET?.trim();
  if (!sessionSecret || sessionSecret.length < 32) return null;

  const users = (env.ADMIN_USERS ?? '')
    // Split on newlines only; trimming each line takes care of carriage
    // returns, which a value pasted from Windows will carry.
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const separator = line.search(/\s/);
      if (separator < 0) return null;
      const email = line.slice(0, separator).trim().toLowerCase();
      const passwordHash = line.slice(separator).trim();
      return email.includes('@') && passwordHash.includes(':')
        ? { email, passwordHash }
        : null;
    })
    .filter((user): user is AdminUser => user !== null);

  return users.length > 0 ? { users, sessionSecret } : null;
}

/**
 * A hash of nothing in particular, verified against when no account matches.
 *
 * Without it, an unknown address would be refused instantly while a known
 * one took the time scrypt needs - which is a way of asking the login which
 * addresses exist.
 */
const DECOY_HASH =
  '0000000000000000000000000000000000000000000000000000000000000000:' +
  '0'.repeat(128);

/** The account for an address, or null. Always costs the same either way. */
export async function authenticate(
  email: string,
  password: string,
  users: AdminUser[],
): Promise<AdminUser | null> {
  const wanted = email.trim().toLowerCase();
  const found = users.find((user) => emailMatches(wanted, user.email)) ?? null;
  const ok = await verifyPassword(password, found?.passwordHash ?? DECOY_HASH);
  return ok ? found : null;
}

/** Case-insensitive, constant-time address comparison. */
export function emailMatches(given: string, expected: string): boolean {
  const a = Buffer.from(given.trim().toLowerCase());
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}
