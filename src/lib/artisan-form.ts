import { stringify } from 'yaml';
import { CRAFTS, SOCIAL_NETWORKS } from '../content.config';

/**
 * Turns what the editor typed into the Markdown file the site reads.
 *
 * The site's own schema is the real gate - a bad file fails the build - but
 * failing a build is a terrible way to tell someone they forgot a photo
 * caption. So the same rules are checked here first, and reported next to
 * the field they belong to.
 */

export interface FieldError {
  field: string;
  message: string;
}

export interface PieceInput {
  id: string;
  title: string;
  description: string;
  alt: string;
  price: string;
  /** Existing file name, kept when no new photograph is uploaded. */
  image: string;
  /** New upload, if any. */
  upload?: File;
}

export interface ArtisanInput {
  slug: string;
  name: string;
  workshop: string;
  craft: string;
  summary: string;
  photoAlt: string;
  photo: string;
  photoUpload?: File;
  address: string;
  directions: string;
  mapUrl: string;
  email: string;
  phone: string;
  whatsapp: string;
  website: string;
  instagram: string;
  commissions: boolean;
  shipping: boolean;
  featured: boolean;
  order: string;
  body: string;
  pieces: PieceInput[];
}

const E164 = /^\+[1-9]\d{6,14}$/;
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

/** Accent-stripped, lowercase, hyphenated. Used for folders and file names. */
export function slugify(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}

/** Keeps an uploaded file name predictable and safe to put in a URL. */
export function safeFileName(original: string, fallback: string): string {
  const dot = original.lastIndexOf('.');
  const base = dot > 0 ? original.slice(0, dot) : original;
  const ext = (dot > 0 ? original.slice(dot + 1) : 'jpg').toLowerCase();
  const allowed = ['jpg', 'jpeg', 'png', 'webp', 'avif'];
  const extension = allowed.includes(ext) ? ext : 'jpg';
  return `${slugify(base) || fallback}.${extension}`;
}

export const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;

export function validate(input: ArtisanInput): FieldError[] {
  const errors: FieldError[] = [];
  const add = (field: string, message: string) => errors.push({ field, message });

  if (!SLUG.test(input.slug)) {
    add('slug', 'O enderezo só pode levar minúsculas, números e guións.');
  }
  if (input.name.trim().length < 2) add('name', 'Fai falla un nome.');
  if (input.workshop.trim().length < 2) add('workshop', 'Fai falla o nome do obradoiro.');
  if (!(CRAFTS as readonly string[]).includes(input.craft)) add('craft', 'Escolle un oficio.');

  const summary = input.summary.trim();
  if (summary.length < 20 || summary.length > 200) {
    add('summary', `O resumo ten que ter entre 20 e 200 caracteres (agora ten ${summary.length}).`);
  }

  if (!input.photo && !input.photoUpload) add('photoUpload', 'Fai falla unha foto de perfil.');
  if (input.photoAlt.trim().length < 15) {
    add('photoAlt', 'Describe a foto de perfil: polo menos 15 caracteres.');
  }

  if (input.address.trim().length < 5) add('address', 'Fai falla un enderezo.');
  if (input.mapUrl.trim() && !/^https?:\/\//.test(input.mapUrl.trim())) {
    add('mapUrl', 'A ligazón ao mapa ten que empezar por http:// ou https://');
  }

  if (!EMAIL.test(input.email.trim())) add('email', 'Fai falla un correo válido.');
  for (const [field, value] of [
    ['phone', input.phone],
    ['whatsapp', input.whatsapp],
  ] as const) {
    if (value.trim() && !E164.test(value.trim())) {
      add(field, 'Con prefixo do país e sen espazos. Por exemplo: +34981000000');
    }
  }
  if (input.website.trim() && !/^https?:\/\//.test(input.website.trim())) {
    add('website', 'A web ten que empezar por http:// ou https://');
  }
  if (input.instagram.trim() && !/^https?:\/\//.test(input.instagram.trim())) {
    add('instagram', 'A ligazón de Instagram ten que empezar por https://');
  }

  if (input.pieces.length === 0) add('pieces', 'Fai falla polo menos unha peza.');

  const seen = new Set<string>();
  input.pieces.forEach((piece, i) => {
    const where = `pieces.${i}`;
    if (!SLUG.test(piece.id)) {
      add(`${where}.id`, 'O código só pode levar minúsculas, números e guións.');
    } else if (seen.has(piece.id)) {
      add(`${where}.id`, 'Hai dúas pezas co mesmo código.');
    }
    seen.add(piece.id);

    if (piece.title.trim().length < 2) add(`${where}.title`, 'Fai falla un título.');
    if (piece.description.trim().length < 10) {
      add(`${where}.description`, 'A descrición é demasiado curta.');
    }
    if (piece.alt.trim().length < 15) {
      add(`${where}.alt`, 'Describe a foto: polo menos 15 caracteres.');
    }
    if (!piece.image && !piece.upload) add(`${where}.upload`, 'Fai falla unha foto.');

    const price = piece.price.trim().replace(',', '.');
    if (price && !(Number(price) > 0)) {
      add(`${where}.price`, 'O prezo ten que ser un número maior que cero, ou estar baleiro.');
    }
  });

  for (const upload of [input.photoUpload, ...input.pieces.map((p) => p.upload)]) {
    if (upload && upload.size > MAX_UPLOAD_BYTES) {
      add('upload', `A foto "${upload.name}" pasa de 8 MB. Faina máis pequena.`);
    }
  }

  return errors;
}

/** Drops blank optional values so they never reach the file as `""`. */
function clean<T extends Record<string, unknown>>(object: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(object).filter(([, value]) => value !== '' && value !== undefined),
  ) as Partial<T>;
}

/**
 * Builds the Markdown file. Image names are resolved by the caller, which
 * knows which uploads actually happened.
 */
export function toMarkdown(
  input: ArtisanInput,
  images: { photo: string; pieces: string[] },
): string {
  const order = Number(input.order);

  const frontmatter = {
    name: input.name.trim(),
    workshop: input.workshop.trim(),
    craft: input.craft,
    featured: input.featured,
    order: Number.isFinite(order) ? order : 99,
    summary: input.summary.trim(),
    photo: { src: images.photo, alt: input.photoAlt.trim() },
    location: clean({
      address: input.address.trim(),
      directions: input.directions.trim(),
      mapUrl: input.mapUrl.trim(),
    }),
    contact: clean({
      email: input.email.trim(),
      phone: input.phone.trim(),
      whatsapp: input.whatsapp.trim(),
      website: input.website.trim(),
    }),
    social: input.instagram.trim()
      ? [{ network: 'instagram' as const, url: input.instagram.trim() }]
      : [],
    commissions: input.commissions,
    shipping: input.shipping,
    pieces: input.pieces.map((piece, i) => {
      const price = piece.price.trim().replace(',', '.');
      return {
        id: piece.id,
        image: images.pieces[i],
        alt: piece.alt.trim(),
        title: piece.title.trim(),
        description: piece.description.trim(),
        price: price ? Number(price) : null,
      };
    }),
  };

  // lineWidth 0 stops the serialiser folding long sentences across lines,
  // which keeps the files readable and the diffs small.
  const yaml = stringify(frontmatter, { lineWidth: 0 });
  const body = input.body.trim();

  return `---\n${yaml}---\n\n${body}\n`;
}

export const SOCIAL = SOCIAL_NETWORKS;
