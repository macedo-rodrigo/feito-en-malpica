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
  adapter: netlify(),
  // Directory URLs everywhere, in dev and in the built output, so links and
  // end-to-end tests never disagree about a trailing slash.
  trailingSlash: 'always',
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
