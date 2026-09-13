import { DEFAULT_LOCALE, LOCALES, type Locale } from './locales';

/**
 * URLs are content, so path segments are translated too. Galician has no
 * prefix; the other locales are served under /es/ and /en/.
 *
 *   gl  /artesans/nadia3d/
 *   es  /es/artesanos/nadia3d/
 *   en  /en/makers/nadia3d/
 *
 * The artisan slug itself is NOT translated: it is the identity of the
 * craftsperson and stays stable across languages (and in analytics).
 */
export const ROUTE_SEGMENTS = {
  artisans: { gl: 'artesans', es: 'artesanos', en: 'makers' },
  about: { gl: 'sobre', es: 'sobre', en: 'about' },
  join: { gl: 'unete', es: 'unete', en: 'join' },
} as const satisfies Record<string, Record<Locale, string>>;

export type PageKey = 'home' | keyof typeof ROUTE_SEGMENTS;

function prefix(locale: Locale): string {
  return locale === DEFAULT_LOCALE ? '' : `/${locale}`;
}

/**
 * Absolute path (site-root relative) for a page in a given locale. Always
 * ends in a slash, matching `trailingSlash: 'always'`.
 */
export function pathTo(locale: Locale, page: PageKey, slug?: string): string {
  if (page === 'home') return `${prefix(locale)}/`;
  const segment = ROUTE_SEGMENTS[page][locale];
  return slug
    ? `${prefix(locale)}/${segment}/${slug}/`
    : `${prefix(locale)}/${segment}/`;
}

/**
 * The same page in every language, for the language switcher and for the
 * hreflang tags. Switching language keeps you on the page you were reading
 * rather than dumping you on the home page.
 */
export function alternates(page: PageKey, slug?: string): { locale: Locale; path: string }[] {
  return LOCALES.map((locale) => ({ locale, path: pathTo(locale, page, slug) }));
}
