import type { APIContext, AstroGlobal } from 'astro';
import { readAdminConfig, readSession, SESSION_COOKIE } from './auth';
import { readGitHubConfig } from './github';

/**
 * Everything the admin pages need to know before they render: is it set up,
 * and is whoever is asking signed in.
 */

export type Setup =
  | { ready: true }
  | { ready: false; missing: string[] };

/** Which environment variables are still missing, if any. */
export function checkSetup(env: Record<string, string | undefined>): Setup {
  const missing: string[] = [];
  if (!env.ADMIN_EMAIL?.trim()) missing.push('ADMIN_EMAIL');
  if (!env.ADMIN_PASSWORD_HASH?.trim()) missing.push('ADMIN_PASSWORD_HASH');
  if (!env.SESSION_SECRET?.trim() || env.SESSION_SECRET.trim().length < 32) {
    missing.push('SESSION_SECRET');
  }
  if (!env.GITHUB_TOKEN?.trim()) missing.push('GITHUB_TOKEN');
  if (!env.GITHUB_REPO?.trim()) missing.push('GITHUB_REPO');
  return missing.length === 0 ? { ready: true } : { ready: false, missing };
}

/**
 * The signed-in address, or null.
 *
 * Reads straight from the cookie and verifies the signature; there is no
 * session store to consult, which is what keeps this working on a host that
 * may run every request in a different process.
 */
export function currentUser(context: APIContext | AstroGlobal): string | null {
  const env = import.meta.env as unknown as Record<string, string | undefined>;
  const config = readAdminConfig({ ...process.env, ...env });
  if (!config) return null;
  return readSession(context.cookies.get(SESSION_COOKIE)?.value, config.sessionSecret);
}

/** The environment, wherever the host happens to put it. */
export function env(): Record<string, string | undefined> {
  return { ...process.env, ...(import.meta.env as unknown as Record<string, string | undefined>) };
}

export function adminConfig() {
  return readAdminConfig(env());
}

export function githubConfig() {
  return readGitHubConfig(env());
}
