import type { APIRoute } from 'astro';
import { SESSION_COOKIE } from '@/lib/auth';

export const prerender = false;

/**
 * Sign out. POST only: a link that logs you out can be triggered by anything
 * that makes your browser fetch a URL.
 */
export const POST: APIRoute = ({ cookies, redirect }) => {
  cookies.delete(SESSION_COOKIE, { path: '/' });
  return redirect('/admin/entrar/', 303);
};
