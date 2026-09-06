/**
 * Checks every foreground/background pair the site actually uses against
 * WCAG 2.1 AA, reading the hex values straight out of src/styles/tokens.css
 * so the check can never drift from the palette.
 *
 * Thresholds: 4.5 for body text, 3.0 for large text (>=24px, or >=18.66px
 * bold) and for non-text essentials like focus rings and icon strokes.
 *
 *   npm run check:contrast
 *
 * Exits non-zero if anything fails, so it can gate a deploy.
 */
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const css = await readFile(path.join(root, 'src/styles/tokens.css'), 'utf8');
const palette = Object.fromEntries(
  [...css.matchAll(/--(color-[\w-]+):\s*(#[0-9a-f]{6})\s*;/gi)].map((m) => [m[1], m[2]]),
);

function luminance(hex) {
  const channels = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}

function ratio(a, b) {
  const [l1, l2] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (l1 + 0.05) / (l2 + 0.05);
}

/** [foreground, background, minimum, what it is used for] */
const PAIRS = [
  ['color-ink', 'color-foam', 4.5, 'body text on the page'],
  ['color-ink', 'color-paper', 4.5, 'body text on cards'],
  ['color-ink-soft', 'color-foam', 4.5, 'secondary text'],
  ['color-granite', 'color-foam', 4.5, 'metadata and captions'],
  ['color-granite', 'color-paper', 4.5, 'metadata on cards'],
  ['color-buoy', 'color-foam', 4.5, 'accent links and prices'],
  ['color-buoy', 'color-paper', 4.5, 'accent on cards'],
  ['color-foam', 'color-buoy', 4.5, 'text inside a solid accent button'],
  ['color-foam', 'color-buoy-deep', 4.5, 'text on a hovered accent button'],
  ['color-foam', 'color-sea-deep', 4.5, 'text on the hero and footer'],
  ['color-foam', 'color-sea', 4.5, 'text on mid-blue panels'],
  ['color-sea-mist', 'color-sea-deep', 4.5, 'secondary text on dark'],
  ['color-buoy-bright', 'color-sea-deep', 4.5, 'accent links on dark'],
  ['color-ink', 'color-shell', 4.5, 'text on quiet fills'],
  ['color-sea-deep', 'color-foam', 3, 'focus ring on the page'],
  ['color-buoy-bright', 'color-sea', 3, 'focus ring on dark'],
  ['color-shell', 'color-foam', 1, 'hairline rules (decorative)'],
];

let failures = 0;
console.log('  WCAG AA contrast\n');

for (const [fg, bg, min, use] of PAIRS) {
  const a = palette[fg];
  const b = palette[bg];
  if (!a || !b) {
    console.log(`  MISSING   --${fg} or --${bg} not found in tokens.css`);
    failures++;
    continue;
  }
  const value = ratio(a, b);
  const ok = value >= min;
  if (!ok) failures++;
  const mark = min === 1 ? 'note' : ok ? 'pass' : 'FAIL';
  console.log(
    `  ${mark.padEnd(6)} ${value.toFixed(2).padStart(6)}:1  (min ${min})  ${fg} on ${bg}  - ${use}`,
  );
}

console.log(
  failures === 0
    ? '\n  All pairs pass.\n'
    : `\n  ${failures} pair(s) below the threshold.\n`,
);
process.exit(failures === 0 ? 0 : 1);
