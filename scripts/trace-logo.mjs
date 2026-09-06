/**
 * Vectorises brand/source/logo-original.jpeg into clean SVG variants.
 *
 * The source is a 300px JPEG with compression artefacts and an opaque white
 * background, so it must never ship to the browser. This script de-noises it,
 * thresholds it to pure black/white and traces it with potrace.
 *
 * Variants:
 *   seal.svg          faithful trace                    - footer, "sobre" page
 *   seal-compact.svg  same artwork, thickened strokes   - header, ~48-64px
 *   mark.svg          NOT generated here: hand-drawn    - favicon, 16-32px
 *
 * `mark.svg` is authored by hand and committed, because at 32px the original
 * ring is 0.57px thick and no amount of dilation rescues it. This script only
 * copies it to public/favicon.svg and renders the proof sheet.
 *
 * Run with `npm run brand:trace`. Output is committed, so this only needs
 * re-running if the source artwork changes.
 */
import { createRequire } from 'node:module';
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import sharp from 'sharp';

const require = createRequire(import.meta.url);
const potrace = require('potrace');

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SOURCE = path.join(root, 'brand/source/logo-original.jpeg');
const BRAND_DIR = path.join(root, 'src/assets/brand');
const PUBLIC_DIR = path.join(root, 'public');
const PREVIEW_DIR = path.join(root, 'brand/preview');

/**
 * Trace resolution. High enough that potrace sees smooth edges rather than the
 * source's 300px staircase, low enough that it does not fit a curve to every
 * pixel of noise. Output is normalised to VIEWBOX afterwards, so this only
 * affects fidelity and file size, not the final coordinate space.
 */
const TRACE_WIDTH = 800;
/** Every variant is emitted in the same square coordinate space. */
const VIEWBOX = 512;

/**
 * Binarises the source. `blur` + `threshold` together control stroke weight:
 * blurring a binary image bleeds black into white, so a threshold above 128
 * afterwards keeps more pixels black and fattens the stroke.
 */
function binarise({ blur, threshold }) {
  return sharp(SOURCE)
    .resize({ width: TRACE_WIDTH, kernel: 'lanczos3' })
    .greyscale()
    .normalise()
    .median(3) // removes JPEG ringing around the strokes
    .blur(blur)
    .threshold(threshold)
    .png()
    .toBuffer();
}

function traceToSvg(buffer) {
  return new Promise((resolve, reject) => {
    potrace.trace(
      buffer,
      {
        threshold: 128,
        turdSize: 5, // drop specks left over from JPEG noise
        alphaMax: 1.3,
        optCurve: true,
        // Generous. These files are inlined into every page, so each curve
        // segment is bytes on the wire; the source is a hand-drawn stamp, and
        // smoothing away a fraction of a pixel costs nothing that can be seen.
        optTolerance: 1.1,
        turnPolicy: potrace.Potrace.TURNPOLICY_MINORITY,
        background: 'transparent',
        color: '#000000',
      },
      (err, svg) => (err ? reject(err) : resolve(svg)),
    );
  });
}

/** Splits a path `d` attribute into subpaths, one per `M` command. */
function splitSubpaths(d) {
  return d
    .split(/(?=M)/)
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * Bounding box from every coordinate pair in a subpath. Bezier control points
 * can sit slightly outside the true curve, which only ever makes the box a
 * little generous - fine for finding the outer edge of the ring.
 */
function bbox(subpath) {
  const numbers = subpath.match(/-?\d+(?:\.\d+)?/g)?.map(Number) ?? [];
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (let i = 0; i + 1 < numbers.length; i += 2) {
    minX = Math.min(minX, numbers[i]);
    maxX = Math.max(maxX, numbers[i]);
    minY = Math.min(minY, numbers[i + 1]);
    maxY = Math.max(maxY, numbers[i + 1]);
  }
  return { minX, minY, maxX, maxY, width: maxX - minX, height: maxY - minY };
}

function parse(svg) {
  const d = svg.match(/ d="([^"]+)"/)?.[1];
  if (!d) throw new Error('potrace returned no path data');
  return splitSubpaths(d).map((subpath) => ({ d: subpath, box: bbox(subpath) }));
}

function boxOf(subpaths) {
  return {
    minX: Math.min(...subpaths.map((s) => s.box.minX)),
    minY: Math.min(...subpaths.map((s) => s.box.minY)),
    maxX: Math.max(...subpaths.map((s) => s.box.maxX)),
    maxY: Math.max(...subpaths.map((s) => s.box.maxY)),
  };
}

/**
 * Builds a standalone SVG filled with currentColor, normalised into a square
 * VIEWBOX so every variant shares one coordinate space. The seal is drawn
 * tight to its own edge: clear space is the responsibility of the component
 * that places it, not of the file.
 */
function buildSvg(subpaths, box, { round = 1 } = {}) {
  const width = box.maxX - box.minX;
  const height = box.maxY - box.minY;
  const scale = VIEWBOX / Math.max(width, height);
  const padX = (VIEWBOX - width * scale) / 2;
  const padY = (VIEWBOX - height * scale) / 2;

  const project = (d) =>
    d.replace(/(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)/g, (_, x, y) => {
      const nx = (Number(x) - box.minX) * scale + padX;
      const ny = (Number(y) - box.minY) * scale + padY;
      return `${+nx.toFixed(round)} ${+ny.toFixed(round)}`;
    });

  const d = subpaths.map((s) => project(s.d)).join('');
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${VIEWBOX} ${VIEWBOX}" fill="currentColor" fill-rule="evenodd">`,
    `<path d="${d}"/>`,
    `</svg>`,
    ``,
  ].join('\n');
}

function report(name, svg) {
  console.log(`  ${name.padEnd(24)} ${(Buffer.byteLength(svg, 'utf8') / 1024).toFixed(1)} KB`);
}

/**
 * Rasterises at the real display size, then magnifies with nearest-neighbour
 * so the proof shows the actual pixel grid rather than a flattering resample.
 */
async function proof(name, svg, size, magnify = Math.max(1, Math.round(256 / size))) {
  const tiny = await sharp(Buffer.from(svg))
    .resize(size, size, { fit: 'contain', background: '#ffffff' })
    .flatten({ background: '#ffffff' })
    .png()
    .toBuffer();
  await sharp(tiny)
    .resize(size * magnify, size * magnify, { kernel: 'nearest' })
    .png()
    .toFile(path.join(PREVIEW_DIR, `${name}-${size}.png`));
}

async function main() {
  await mkdir(BRAND_DIR, { recursive: true });
  await mkdir(PUBLIC_DIR, { recursive: true });
  await mkdir(PREVIEW_DIR, { recursive: true });

  // --- Full seal: faithful to the original strokes -------------------------
  const faithful = parse(await traceToSvg(await binarise({ blur: 0.5, threshold: 132 })));
  const seal = buildSvg(faithful, boxOf(faithful));
  await writeFile(path.join(BRAND_DIR, 'seal.svg'), seal);
  report('seal.svg', seal);

  // --- Compact seal: same artwork, fatter strokes so it holds at ~48px ------
  const fattened = parse(await traceToSvg(await binarise({ blur: 1.1, threshold: 176 })));
  const compact = buildSvg(fattened, boxOf(fattened));
  await writeFile(path.join(BRAND_DIR, 'seal-compact.svg'), compact);
  report('seal-compact.svg', compact);

  // --- Favicon: the hand-drawn mark, unchanged apart from an intrinsic size -
  const mark = await readFile(path.join(BRAND_DIR, 'mark.svg'), 'utf8');
  const favicon = mark.replace('<svg ', '<svg width="32" height="32" ');
  await writeFile(path.join(PUBLIC_DIR, 'favicon.svg'), favicon);
  report('public/favicon.svg', favicon);

  // Raster fallbacks. iOS ignores transparency on touch icons and composites
  // them on black, so that one gets the paper background baked in.
  const inkMark = mark.replace('currentColor', '#14181a');
  await sharp(Buffer.from(inkMark))
    .resize(32, 32, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toFile(path.join(PUBLIC_DIR, 'favicon-32.png'));
  await sharp(Buffer.from(inkMark))
    .resize(148, 148, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .extend({ top: 16, bottom: 16, left: 16, right: 16, background: '#f6f3ed' })
    .flatten({ background: '#f6f3ed' })
    .png()
    .toFile(path.join(PUBLIC_DIR, 'apple-touch-icon.png'));
  console.log('  favicon-32.png / apple-touch-icon.png');

  await proof('seal', seal, 240, 1);
  await proof('seal', seal, 96, 2);
  await proof('seal-compact', compact, 48, 5);
  await proof('mark', mark, 32, 8);
  await proof('mark', mark, 16, 16);
  console.log(`\n  proofs written to brand/preview/`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
