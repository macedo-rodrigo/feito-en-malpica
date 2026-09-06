// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

/**
 * TEMPORARY domain. Canonical URLs, hreflang, Open Graph images and the
 * sitemap all derive from this single value - change it here and nowhere else
 * when the real domain exists.
 */
const SITE = 'https://feito-en-malpica.netlify.app';

export default defineConfig({
  site: SITE,
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
