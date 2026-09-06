import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

/**
 * Crafts are stored as stable English keys and displayed through the
 * translation files (`craft.<key>` in src/i18n/*.json), so adding a language
 * never means touching the artisan data. Add a key here and a label in every
 * src/i18n/*.json to introduce a new craft.
 */
export const CRAFTS = [
  '3d-printing',
  'ceramics',
  'nets',
  'basketry',
  'jewellery',
  'wood',
  'preserves',
  'textile',
  'leather',
] as const;

export type Craft = (typeof CRAFTS)[number];

export const SOCIAL_NETWORKS = [
  'instagram',
  'facebook',
  'youtube',
  'tiktok',
  'pinterest',
  'etsy',
] as const;

/**
 * Phone numbers are stored in E.164 - the one format that `tel:` and
 * `wa.me` links can both be built from without guessing. Display formatting
 * happens at render time (src/lib/contact.ts).
 */
const e164 = z
  .string()
  .regex(/^\+[1-9]\d{6,14}$/, 'Use E.164 format with country code, e.g. +34981000000');

const piece = z.object({
  /** Stable key used to attach translations to this piece. Never reuse one. */
  id: z.string().regex(/^[a-z0-9-]+$/, 'Lowercase letters, numbers and hyphens only'),
  title: z.string().min(2),
  description: z.string().min(10),
  /**
   * Price in euros, or null for "ask". Written as a number so it can be
   * formatted per locale rather than baked into the text.
   */
  price: z.number().positive().nullable().default(null),
});

const artisans = defineCollection({
  loader: glob({
    pattern: '*/index.md',
    base: './src/content/artisans',
    // One folder per artisan, so their photos sit next to their text.
    // src/content/artisans/uxio-lema/index.md -> id "uxio-lema"
    generateId: ({ entry }) => entry.replace(/\/index\.md$/, ''),
  }),
  schema: ({ image }) =>
    z
      .object({
        name: z.string().min(2),
        workshop: z.string().min(2),
        craft: z.enum(CRAFTS),
        /** Shown on the home page. Keep this to three or so artisans. */
        featured: z.boolean().default(false),
        /** Lower sorts first in listings. */
        order: z.number().int().default(99),
        /** One or two lines for cards and meta descriptions. */
        summary: z.string().min(20).max(200),
        photo: z.object({
          src: image(),
          // Required, and long enough to be a real description rather than a
          // repeat of the name: the build fails if someone forgets.
          alt: z.string().min(15),
        }),
        location: z.object({
          address: z.string().min(5),
          directions: z.string().optional(),
          mapUrl: z.string().url().optional(),
        }),
        contact: z.object({
          phone: e164.optional(),
          whatsapp: e164.optional(),
          email: z.string().email().optional(),
          website: z.string().url().optional(),
        }),
        social: z
          .array(
            z.object({
              network: z.enum(SOCIAL_NETWORKS),
              url: z.string().url(),
              handle: z.string().optional(),
            }),
          )
          .default([]),
        commissions: z.boolean(),
        shipping: z.boolean(),
        pieces: z
          .array(piece.extend({ image: image(), alt: z.string().min(15) }))
          .min(1, 'An artisan needs at least one piece in the gallery'),
      })
      .refine(
        (data) => Boolean(data.contact.phone || data.contact.whatsapp || data.contact.email),
        {
          message: 'An artisan needs at least one of phone, whatsapp or email to be reachable',
          path: ['contact'],
        },
      ),
});

/**
 * Translations of an artisan's prose. The Galician file is the single source
 * of truth for everything factual - phone, email, images, prices, craft - so
 * a number can never drift between languages. These files carry only what
 * actually changes from one language to another, and anything left out falls
 * back to Galician.
 *
 *   src/content/translations/es/uxio-lema.md  -> Spanish text for "uxio-lema"
 */
const artisanTranslations = defineCollection({
  loader: glob({ pattern: '{es,en}/*.md', base: './src/content/translations' }),
  schema: z.object({
    workshop: z.string().min(2).optional(),
    summary: z.string().min(20).max(200).optional(),
    photoAlt: z.string().min(15).optional(),
    location: z
      .object({
        address: z.string().optional(),
        directions: z.string().optional(),
      })
      .optional(),
    /** Only the pieces that need translating, matched by their `id`. */
    pieces: z
      .array(
        z.object({
          id: z.string(),
          title: z.string().optional(),
          description: z.string().optional(),
          alt: z.string().optional(),
        }),
      )
      .default([]),
  }),
});

/**
 * Editorial pages. One file per language per page, so the long-form copy is
 * editable by whoever writes it without going near a component.
 *
 *   src/content/pages/gl/about.md
 */
const pages = defineCollection({
  loader: glob({ pattern: '{gl,es,en}/*.md', base: './src/content/pages' }),
  schema: z.object({
    /** <title> and og:title. Unique per page and per language. */
    title: z.string().min(5).max(70),
    /** Meta description. */
    description: z.string().min(50).max(180),
    /** The visible <h1>, which is often shorter than the <title>. */
    heading: z.string().min(2),
    /** Standfirst under the heading. */
    lead: z.string().optional(),
    /** Home page only: the labels on the two hero buttons. */
    hero: z
      .object({
        cta: z.string(),
        ctaSecondary: z.string().optional(),
      })
      .optional(),
    /** Home page only: the "what this site is" points. */
    values: z
      .array(z.object({ title: z.string(), text: z.string() }))
      .max(4)
      .optional(),
  }),
});

export const collections = { artisans, artisanTranslations, pages };
