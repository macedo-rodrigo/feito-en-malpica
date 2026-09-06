import full from '@/assets/brand/seal.svg?raw';
import compact from '@/assets/brand/seal-compact.svg?raw';
import mark from '@/assets/brand/mark.svg?raw';

/**
 * The seal artwork, prepared for use as an SVG sprite.
 *
 * The traced calligraphy is a few thousand curve segments, so inlining it
 * once per appearance would put the same 18 KB into a page two or three
 * times. Instead the artwork is emitted once as <symbol>s and every Seal is a
 * <use> reference costing a few dozen bytes - and `currentColor` still works,
 * which an <img> would not allow.
 */

/** Strips the wrapper element and comments, leaving the drawing itself. */
function inner(svg: string): string {
  return svg
    .replace(/^[\s\S]*?<svg[^>]*>/, '')
    .replace(/<\/svg>[\s\S]*$/, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .trim();
}

export const SEAL_ARTWORK = {
  full: inner(full),
  compact: inner(compact),
  mark: inner(mark),
} as const;

export type SealVariant = keyof typeof SEAL_ARTWORK;

/** Every variant is drawn in the same square coordinate space. */
export const SEAL_VIEWBOX = '0 0 512 512';

export const sealSymbolId = (variant: SealVariant) => `seal-${variant}`;
