// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import netlify from '@astrojs/netlify';

/**
 * TEMPORARY domain. Canonical URLs, hreflang, Open Graph images and the
 * sitemap all derive from this single value - change it here and nowhere else
 * when the real domain exists.
 */
const SITE = 'https://feito-en-malpica.netlify.app';

export default defineConfig({
  site: SITE,

  /**
   * Still a static site. The adapter is here only so the handful of pages
   * under /admin can opt out with `export const prerender = false`: they
   * need a server to check a password and write to GitHub. Every public page
   * is still built once, up front, and served as a file.
   */
  adapter: netlify({
    /**
     * The site uses none of Netlify's edge features, and emulating them
     * locally starts a Deno process that fails on this machine and covers
     * the page with an error overlay. Environment variables are the only
     * part we actually want in development.
     */
    devFeatures: { environmentVariables: true, images: false, edgeFunctions: false },
  }),
  /**
   * Accept a URL with or without the trailing slash.
   *
   * Every link the site writes carries one, and `build.format: 'directory'`
   * below still puts each page at its own index.html, so nothing about the
   * output changes. What changes is what the server accepts: with 'always',
   * the on-demand pages under /admin answered a bare /admin with the 404
   * page, because the host only patches a missing slash for static files
   * and these are not static.
   *
   * Doing it here rather than with a host redirect: Netlify ignores the
   * trailing slash when matching a rule, so a rule from /admin to /admin/
   * also matches /admin/ and redirects it to itself, forever.
   */
  trailingSlash: 'ignore',
  build: { format: 'directory' },

  // Galician is the default and lives at the root; Spanish and English are
  // prefixed. Route segments themselves are translated (see src/i18n/routes.ts),
  // so pages are declared per locale under src/pages/ rather than generated.
  i18n: {
    defaultLocale: 'gl',
    locales: ['gl', 'es', 'en'],
    routing: { prefixDefaultLocale: false },
  },

  integrations: [
    sitemap({
      // 404 is not a page anyone should be sent to from search results.
      filter: (page) => !page.includes('/404'),
    }),
  ],

  image: {
    // Only local images are ever processed; nothing is fetched at build time.
    remotePatterns: [],
  },
});
