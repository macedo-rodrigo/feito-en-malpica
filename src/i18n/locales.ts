/**
 * The site speaks Galician first. Spanish and English are alternatives, so
 * Galician lives at the root of the domain and the others are prefixed.
 */
export const LOCALES = ['gl', 'es', 'en'] as const;

export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = 'gl';

/** Name of each language, written in that language. */
export const LOCALE_NAMES: Record<Locale, string> = {
  gl: 'Galego',
  es: 'Español',
  en: 'English',
};

/** Two-letter code shown in the compact language switcher. */
export const LOCALE_SHORT: Record<Locale, string> = {
  gl: 'GL',
  es: 'ES',
  en: 'EN',
};

export function isLocale(value: string): value is Locale {
  return (LOCALES as readonly string[]).includes(value);
}

/**
 * The locale a URL belongs to, taken from its first path segment. Anything
 * without a known prefix is Galician, which is the unprefixed default.
 */
export function localeFromPath(pathname: string): Locale {
  const first = pathname.split('/').filter(Boolean)[0];
  return first && isLocale(first) ? first : DEFAULT_LOCALE;
}
