import type { APIRoute } from 'astro';

/**
 * robots.txt, generated so the sitemap URL follows `site` in astro.config.mjs
 * instead of being hard-coded in a file nobody remembers to update.
 *
 * While PUBLIC_NOINDEX is set the whole site is closed to crawlers, which is
 * what a work-in-progress preview wants. The <meta name="robots"> tag in
 * Seo.astro is driven by the same variable and is the one that actually keeps
 * a page out of the index; this is the belt to that pair of braces.
 */
export const GET: APIRoute = ({ site }) => {
  const draft = import.meta.env.PUBLIC_NOINDEX === 'true';

  const body = draft
    ? ['User-agent: *', 'Disallow: /', ''].join('\n')
    : [
        'User-agent: *',
        'Allow: /',
        '',
        `Sitemap: ${new URL('sitemap-index.xml', site).href}`,
        '',
      ].join('\n');

  return new Response(body, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
};
