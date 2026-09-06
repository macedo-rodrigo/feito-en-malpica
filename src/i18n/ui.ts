import { DEFAULT_LOCALE, type Locale } from './locales';
import gl from './gl.json';
import es from './es.json';
import en from './en.json';

/**
 * Galician is the reference dictionary: its keys are the contract, and a
 * missing key in another language falls back to it rather than rendering an
 * empty string. TypeScript flags any key that does not exist in gl.json.
 */
export type UIKey = keyof typeof gl;

const DICTIONARIES: Record<Locale, Partial<Record<UIKey, string>>> = { gl, es, en };

type Vars = Record<string, string | number>;

/** Replaces {name}-style placeholders. Unknown names are left untouched. */
function interpolate(template: string, vars?: Vars): string {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (match, key: string) =>
    key in vars ? String(vars[key]) : match,
  );
}

/**
 * Returns the translation function for a locale:
 *
 *   const t = useTranslations(locale);
 *   t('artisans.resultsMany', { count: 8 })
 */
export function useTranslations(locale: Locale) {
  const dictionary = DICTIONARIES[locale] ?? DICTIONARIES[DEFAULT_LOCALE];
  return function t(key: UIKey, vars?: Vars): string {
    return interpolate(dictionary[key] ?? gl[key], vars);
  };
}

export type Translate = ReturnType<typeof useTranslations>;
