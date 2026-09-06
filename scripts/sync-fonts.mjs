/**
 * Copies the two font files the site actually uses out of node_modules and
 * into public/fonts/, where they get stable URLs that can be preloaded.
 *
 * Only the `latin` subset is copied. It covers Galician, Spanish and English
 * in full (including ñ, the accented vowels, ü and the inverted marks), so
 * the latin-ext, Vietnamese and Cyrillic cuts would only ever sit unused.
 *
 * Fraunces ships as several axis combinations; `standard` is weight plus
 * optical size, which is what makes large headings sharpen up on their own.
 * Swap to `full` here and in fonts.css if the SOFT and WONK axes are ever
 * wanted - it costs about 54 KB more.
 *
 * Run with `npm run fonts:sync` after updating the font packages.
 */
import { mkdir, copyFile, stat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(root, 'public/fonts');

const FILES = [
  {
    from: '@fontsource-variable/fraunces/files/fraunces-latin-standard-normal.woff2',
    to: 'fraunces-latin-variable.woff2',
  },
  {
    from: '@fontsource-variable/public-sans/files/public-sans-latin-wght-normal.woff2',
    to: 'public-sans-latin-variable.woff2',
  },
];

await mkdir(OUT, { recursive: true });

for (const file of FILES) {
  const source = path.join(root, 'node_modules', file.from);
  const target = path.join(OUT, file.to);
  await copyFile(source, target);
  const { size } = await stat(target);
  console.log(`  ${file.to.padEnd(34)} ${(size / 1024).toFixed(1)} KB`);
}
