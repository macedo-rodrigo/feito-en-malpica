import type { Locale } from '@/i18n/locales';

/** BCP-47 tags for Intl. Galician is a real ICU locale, so prices read right. */
const INTL_TAGS: Record<Locale, string> = {
  gl: 'gl-ES',
  es: 'es-ES',
  en: 'en-IE', // English-speaking euro locale, so the symbol stays "€"
};

/**
 * Prices are stored as plain numbers so they can be formatted per locale.
 * Whole euros lose the decimals: "45 €" rather than "45,00 €".
 */
export function formatPrice(price: number, locale: Locale): string {
  const fractionDigits = Number.isInteger(price) ? 0 : 2;
  return new Intl.NumberFormat(INTL_TAGS[locale], {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(price);
}
