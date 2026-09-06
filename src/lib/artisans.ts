import { getCollection, type CollectionEntry } from 'astro:content';
import type { Craft } from '../content.config';
import { DEFAULT_LOCALE, type Locale } from '@/i18n/locales';

/**
 * Merges an artisan's canonical (Galician) record with the translation for a
 * given locale.
 *
 * The Galician file owns every fact - phone, email, images, prices, craft -
 * so those can never disagree between languages. A translation file supplies
 * prose only, and anything it leaves out falls back to Galician rather than
 * rendering blank.
 */

type ArtisanEntry = CollectionEntry<'artisans'>;
type TranslationEntry = CollectionEntry<'artisanTranslations'>;

export interface LocalizedPiece {
  id: string;
  image: ArtisanEntry['data']['pieces'][number]['image'];
  alt: string;
  title: string;
  description: string;
  price: number | null;
}

export interface LocalizedArtisan {
  slug: string;
  name: string;
  workshop: string;
  craft: Craft;
  featured: boolean;
  order: number;
  summary: string;
  photo: { src: ArtisanEntry['data']['photo']['src']; alt: string };
  location: { address: string; directions?: string; mapUrl?: string };
  contact: ArtisanEntry['data']['contact'];
  social: ArtisanEntry['data']['social'];
  commissions: boolean;
  shipping: boolean;
  pieces: LocalizedPiece[];
  /**
   * The entry whose Markdown body should be rendered: the translation when
   * one exists, otherwise the Galician original.
   */
  body: ArtisanEntry | TranslationEntry;
}

function localize(
  artisan: ArtisanEntry,
  translation: TranslationEntry | undefined,
): LocalizedArtisan {
  const source = artisan.data;
  const t = translation?.data;

  // Pieces are matched by their stable `id`, never by position, so reordering
  // the gallery in Galician cannot silently mistranslate a piece.
  const overridesById = new Map((t?.pieces ?? []).map((piece) => [piece.id, piece]));

  return {
    slug: artisan.id,
    name: source.name,
    workshop: t?.workshop ?? source.workshop,
    craft: source.craft,
    featured: source.featured,
    order: source.order,
    summary: t?.summary ?? source.summary,
    photo: { src: source.photo.src, alt: t?.photoAlt ?? source.photo.alt },
    location: {
      address: t?.location?.address ?? source.location.address,
      directions: t?.location?.directions ?? source.location.directions,
      mapUrl: source.location.mapUrl,
    },
    contact: source.contact,
    social: source.social,
    commissions: source.commissions,
    shipping: source.shipping,
    pieces: source.pieces.map((piece) => {
      const override = overridesById.get(piece.id);
      return {
        id: piece.id,
        image: piece.image,
        alt: override?.alt ?? piece.alt,
        title: override?.title ?? piece.title,
        description: override?.description ?? piece.description,
        price: piece.price,
      };
    }),
    body: translation ?? artisan,
  };
}

/** Every artisan in a locale, in listing order. */
export async function getArtisans(locale: Locale): Promise<LocalizedArtisan[]> {
  const artisans = await getCollection('artisans');
  const translations =
    locale === DEFAULT_LOCALE ? [] : await getCollection('artisanTranslations');

  const bySlug = new Map(
    translations
      .filter((entry) => entry.id.startsWith(`${locale}/`))
      .map((entry) => [entry.id.slice(locale.length + 1), entry]),
  );

  return artisans
    .map((artisan) => localize(artisan, bySlug.get(artisan.id)))
    .sort((a, b) => a.order - b.order || a.name.localeCompare(b.name, locale));
}

/** A single artisan, or undefined if the slug does not exist. */
export async function getArtisan(
  slug: string,
  locale: Locale,
): Promise<LocalizedArtisan | undefined> {
  const all = await getArtisans(locale);
  return all.find((artisan) => artisan.slug === slug);
}
