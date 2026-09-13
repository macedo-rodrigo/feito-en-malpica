/**
 * Generates placeholder photography at the exact aspect ratios the layout
 * expects, so the site can be built and reviewed before any real photograph
 * exists. Nothing is fetched from the network.
 *
 * Existing files are never overwritten: drop a real photograph in with the
 * same name and this script will leave it alone. Pass --force to regenerate.
 *
 *   npm run images:placeholders
 *   npm run images:placeholders -- --force
 */
import { mkdir, writeFile, access } from 'node:fs/promises';
import { constants } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import sharp from 'sharp';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const FORCE = process.argv.includes('--force');

/** The site palette. Placeholders must not introduce colours of their own. */
const C = {
  seaDeep: '#0d2b3e',
  sea: '#14455f',
  seaMist: '#7fa0ad',
  granite: '#4a5359',
  graniteLight: '#9aa3a8',
  foam: '#f4f1ec',
  foamShade: '#e3ddd3',
  buoy: '#d1552b',
  buoyDeep: '#94330f',
  ink: '#14181a',
};

/**
 * What to generate. Aspect ratios are fixed here and mirrored by the CSS, so
 * swapping in a real photograph at the same ratio needs no layout change.
 *
 *   portrait  4:5   artisan profile photo
 *   object    1:1   gallery piece
 *   seascape  2:1   page hero
 *   social  1.91:1  Open Graph image
 */
const TARGETS = [
  {
    file: 'src/content/artisans/uxio-lema/perfil.jpg',
    style: 'portrait',
    width: 1000,
    height: 1250,
    label: 'Uxío Lema · retrato',
  },
  ...[
    ['lampada-sisargas', 'Lámpada Sisargas'],
    ['chaveiro-percebe', 'Chaveiro percebe'],
    ['recambio-aparello', 'Recambios para aparellos'],
    ['faro-punta-nariga', 'Faro de Punta Nariga'],
    ['gamela-malpica', 'Gamela malpicá 1:20'],
    ['portavelas-onda', 'Portavelas Onda'],
  ].map(([slug, label]) => ({
    file: `src/content/artisans/uxio-lema/pezas/${slug}.jpg`,
    style: 'object',
    width: 1200,
    height: 1200,
    label,
  })),
  {
    file: 'src/assets/hero-malpica.jpg',
    style: 'seascape',
    width: 2400,
    height: 1200,
    label: 'Illas Sisargas desde o peirao',
  },
  {
    file: 'src/assets/malpica/porto.jpg',
    style: 'harbour',
    width: 1200,
    height: 1500,
    label: 'Porto de Malpica',
  },
  {
    file: 'src/assets/malpica/peirao.jpg',
    style: 'quay',
    width: 2000,
    height: 860,
    label: 'Peirao de Malpica',
  },
  {
    file: 'public/og/default.jpg',
    style: 'social',
    width: 1200,
    height: 630,
    label: 'Feito en Malpica',
  },
];

/** Deterministic RNG, so re-running produces byte-identical files. */
function rng(seed) {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return () => {
    h += 0x6d2b79f5;
    let t = h;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A low island profile: a wide hump with an off-centre peak. */
function hump(x0, x1, base, height, skew) {
  const peak = x0 + (x1 - x0) * skew;
  return `M${x0} ${base} C${x0 + (peak - x0) * 0.5} ${base - height * 0.9} ${peak - (peak - x0) * 0.2} ${base - height} ${peak} ${base - height} C${peak + (x1 - peak) * 0.35} ${base - height} ${x1 - (x1 - peak) * 0.35} ${base - height * 0.55} ${x1} ${base}Z`;
}

function caption(label, w, h, color) {
  const size = Math.round(Math.max(14, w * 0.022));
  return `<text x="${Math.round(w * 0.045)}" y="${h - Math.round(w * 0.038)}" font-family="Georgia, 'Times New Roman', serif" font-size="${size}" fill="${color}" fill-opacity="0.55" letter-spacing="0.5">${escapeXml(label)}</text>`;
}

function escapeXml(s) {
  return s.replace(/[<>&'"]/g, (c) => `&#${c.charCodeAt(0)};`);
}

function seascape(w, h, label, rand) {
  const horizon = Math.round(h * (0.52 + rand() * 0.1));
  const islandBase = horizon + 2;
  return `
    <defs>
      <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="${C.seaDeep}"/>
        <stop offset="70%" stop-color="${C.sea}"/>
        <stop offset="100%" stop-color="${C.seaMist}"/>
      </linearGradient>
      <linearGradient id="water" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="${C.sea}"/>
        <stop offset="100%" stop-color="${C.seaDeep}"/>
      </linearGradient>
    </defs>
    <rect width="${w}" height="${horizon}" fill="url(#sky)"/>
    <rect y="${horizon}" width="${w}" height="${h - horizon}" fill="url(#water)"/>
    <path d="${hump(w * 0.08, w * 0.52, islandBase, h * 0.13, 0.38)}" fill="${C.ink}" fill-opacity="0.72"/>
    <path d="${hump(w * 0.5, w * 0.78, islandBase, h * 0.08, 0.45)}" fill="${C.ink}" fill-opacity="0.6"/>
    <rect y="${horizon - 1}" width="${w}" height="2" fill="${C.foam}" fill-opacity="0.25"/>
    <circle cx="${Math.round(w * 0.86)}" cy="${Math.round(horizon + h * 0.12)}" r="${Math.round(w * 0.008)}" fill="${C.buoy}"/>
  `;
  // No caption: this one runs full-bleed behind the hero headline, where a
  // stray line of text reads as a rendering bug rather than as a placeholder.
}

/**
 * Object placeholders. Each piece gets a different silhouette and a different
 * material, picked from its own filename, so a gallery of six does not read
 * as the same grey square repeated six times.
 */
const OBJECT_MATERIALS = [
  [C.graniteLight, C.granite],
  [C.seaMist, C.sea],
  [C.foamShade, C.granite],
  [C.buoy, C.buoyDeep],
  [C.granite, C.ink],
];

function objectShape(kind, cx, cy, s) {
  switch (kind) {
    // A lamp or a vase: a body with a narrow neck.
    case 0:
      return `
        <rect x="${cx - s * 0.2}" y="${cy - s * 1.05}" width="${s * 0.4}" height="${s * 0.55}" rx="${s * 0.08}" fill="url(#body)"/>
        <ellipse cx="${cx}" cy="${cy + s * 0.2}" rx="${s * 0.78}" ry="${s * 0.82}" fill="url(#body)"/>`;
    // A disc: a plate, a lid, a keyring.
    case 1:
      return `
        <circle cx="${cx}" cy="${cy}" r="${s * 0.88}" fill="url(#body)"/>
        <circle cx="${cx}" cy="${cy}" r="${s * 0.3}" fill="${C.foam}" fill-opacity="0.35"/>`;
    // A tower: the lighthouse.
    case 2:
      return `
        <path d="M${cx - s * 0.3} ${cy + s} L${cx - s * 0.2} ${cy - s * 0.85} L${cx + s * 0.2} ${cy - s * 0.85} L${cx + s * 0.3} ${cy + s}Z" fill="url(#body)"/>
        <rect x="${cx - s * 0.34}" y="${cy - s * 1.05}" width="${s * 0.68}" height="${s * 0.22}" rx="${s * 0.05}" fill="url(#body)"/>`;
    // A hull: the gamela, seen from the side.
    case 3:
      return `
        <path d="M${cx - s} ${cy - s * 0.3} L${cx + s} ${cy - s * 0.3} C${cx + s * 0.75} ${cy + s * 0.72} ${cx - s * 0.75} ${cy + s * 0.72} ${cx - s} ${cy - s * 0.3}Z" fill="url(#body)"/>
        <rect x="${cx - s * 0.05}" y="${cy - s * 1.1}" width="${s * 0.1}" height="${s * 0.8}" fill="url(#body)"/>`;
    // A block: a mechanical part.
    default:
      return `
        <rect x="${cx - s * 0.85}" y="${cy - s * 0.75}" width="${s * 1.7}" height="${s * 1.5}" rx="${s * 0.16}" fill="url(#body)"/>
        <circle cx="${cx}" cy="${cy}" r="${s * 0.34}" fill="${C.foam}" fill-opacity="0.4"/>`;
  }
}

function object(w, h, label, rand) {
  const cx = w / 2;
  const cy = h * 0.5;
  const s = w * (0.2 + rand() * 0.05);
  const kind = Math.floor(rand() * 5);
  const material = OBJECT_MATERIALS[Math.floor(rand() * OBJECT_MATERIALS.length)];
  const tilt = -7 + rand() * 14;
  const warmGround = rand() > 0.5;

  return `
    <defs>
      <radialGradient id="ground" cx="50%" cy="40%" r="74%">
        <stop offset="0%" stop-color="${warmGround ? C.foam : C.foamShade}"/>
        <stop offset="100%" stop-color="${warmGround ? C.foamShade : C.graniteLight}"/>
      </radialGradient>
      <linearGradient id="body" x1="0.15" y1="0" x2="0.7" y2="1">
        <stop offset="0%" stop-color="${material[0]}"/>
        <stop offset="100%" stop-color="${material[1]}"/>
      </linearGradient>
    </defs>
    <rect width="${w}" height="${h}" fill="url(#ground)"/>
    <ellipse cx="${cx}" cy="${cy + s * 1.16}" rx="${s * 1.2}" ry="${s * 0.14}" fill="${C.ink}" fill-opacity="0.16"/>
    <g transform="rotate(${tilt.toFixed(1)} ${cx} ${cy})">
      ${objectShape(kind, cx, cy, s)}
    </g>
    ${caption(label, w, h, C.ink)}
  `;
}

function portrait(w, h, label, rand) {
  // Figure sits low and off-centre, the way a real workshop portrait would,
  // with the head overlapping the shoulders rather than floating above them.
  const shoulder = h * (0.66 + rand() * 0.04);
  const headX = w * 0.44;
  const headR = w * 0.145;
  return `
    <defs>
      <linearGradient id="wall" x1="0.2" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="${C.granite}"/>
        <stop offset="100%" stop-color="${C.ink}"/>
      </linearGradient>
      <linearGradient id="doorway" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="${C.seaMist}" stop-opacity="0.5"/>
        <stop offset="100%" stop-color="${C.seaMist}" stop-opacity="0.05"/>
      </linearGradient>
      <radialGradient id="light" cx="24%" cy="22%" r="72%">
        <stop offset="0%" stop-color="${C.foam}" stop-opacity="0.34"/>
        <stop offset="100%" stop-color="${C.foam}" stop-opacity="0"/>
      </radialGradient>
    </defs>
    <rect width="${w}" height="${h}" fill="url(#wall)"/>
    <rect x="${w * 0.06}" y="${h * 0.05}" width="${w * 0.3}" height="${h * 0.52}" fill="url(#doorway)"/>
    <rect width="${w}" height="${h}" fill="url(#light)"/>
    <path d="${hump(w * -0.05, w * 1.05, h, h - shoulder, 0.42)}" fill="${C.ink}" fill-opacity="0.88"/>
    <circle cx="${headX}" cy="${shoulder - h * 0.055}" r="${headR}" fill="${C.ink}" fill-opacity="0.88"/>
    <rect x="${w * 0.86}" y="${h * 0.09}" width="${w * 0.014}" height="${h * 0.16}" fill="${C.buoy}" fill-opacity="0.8"/>
    ${caption(label, w, h, C.foam)}
  `;
}

function social(w, h, label, rand) {
  const horizon = Math.round(h * 0.66);
  return `
    <defs>
      <linearGradient id="sky2" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="${C.seaDeep}"/>
        <stop offset="100%" stop-color="${C.sea}"/>
      </linearGradient>
    </defs>
    <rect width="${w}" height="${h}" fill="url(#sky2)"/>
    <path d="${hump(w * 0.05, w * 0.55, horizon, h * 0.16, 0.4)}" fill="${C.ink}" fill-opacity="0.7"/>
    <path d="${hump(w * 0.52, w * 0.82, horizon, h * 0.1, 0.45)}" fill="${C.ink}" fill-opacity="0.58"/>
    <rect y="${horizon}" width="${w}" height="${h - horizon}" fill="${C.seaDeep}"/>
    <rect y="${horizon - 2}" width="${w}" height="3" fill="${C.foam}" fill-opacity="0.3"/>
    <text x="${w / 2}" y="${Math.round(h * 0.34)}" text-anchor="middle" font-family="Georgia, 'Times New Roman', serif" font-size="${Math.round(h * 0.13)}" fill="${C.foam}">${escapeXml(label)}</text>
    <text x="${w / 2}" y="${Math.round(h * 0.45)}" text-anchor="middle" font-family="Georgia, 'Times New Roman', serif" font-size="${Math.round(h * 0.05)}" fill="${C.buoy}" letter-spacing="4">COSTA DA MORTE</text>
  `;
}


/**
 * The working harbour: the village stacked behind the quay, boats on the
 * water, the headland closing the bay. Stands in for a real photograph of
 * Malpica until one exists.
 */
function harbour(w, h, label, rand) {
  const horizon = Math.round(h * (0.4 + rand() * 0.06));
  const quay = Math.round(h * 0.84);

  const houses = Array.from({ length: 9 }, (_, i) => {
    const bw = w * (0.05 + rand() * 0.05);
    const bh = h * (0.05 + rand() * 0.07);
    const x = w * 0.02 + i * (w * 0.1);
    const roof = horizon - bh;
    const tone = i % 3 === 0 ? C.foamShade : i % 3 === 1 ? C.graniteLight : C.foam;
    return `<rect x="${x.toFixed(1)}" y="${roof.toFixed(1)}" width="${bw.toFixed(1)}" height="${(bh + h * 0.02).toFixed(1)}" fill="${tone}" fill-opacity="0.85"/>`;
  }).join('');

  const boats = Array.from({ length: 3 }, (_, i) => {
    const bx = w * (0.18 + i * 0.28 + rand() * 0.05);
    const by = horizon + h * (0.1 + i * 0.11);
    const bw = w * (0.1 + rand() * 0.05);
    const hull = `<path d="M${bx - bw} ${by} L${bx + bw} ${by} C${bx + bw * 0.7} ${by + h * 0.045} ${bx - bw * 0.7} ${by + h * 0.045} ${bx - bw} ${by}Z" fill="${C.foam}" fill-opacity="0.9"/>`;
    const mast = `<rect x="${bx - w * 0.002}" y="${by - h * 0.09}" width="${w * 0.004}" height="${h * 0.09}" fill="${C.ink}" fill-opacity="0.55"/>`;
    const stripe = `<rect x="${bx - bw}" y="${by - h * 0.012}" width="${bw * 2}" height="${h * 0.012}" fill="${i === 1 ? C.buoy : C.sea}" fill-opacity="0.8"/>`;
    return mast + hull + stripe;
  }).join('');

  return `
    <defs>
      <linearGradient id="hsky" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="${C.sea}"/>
        <stop offset="70%" stop-color="${C.seaMist}"/>
        <stop offset="100%" stop-color="${C.foamShade}"/>
      </linearGradient>
      <linearGradient id="hwater" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="${C.sea}"/>
        <stop offset="100%" stop-color="${C.seaDeep}"/>
      </linearGradient>
    </defs>
    <rect width="${w}" height="${horizon}" fill="url(#hsky)"/>
    <path d="${hump(w * 0.55, w * 1.05, horizon, h * 0.1, 0.55)}" fill="${C.granite}" fill-opacity="0.55"/>
    ${houses}
    <rect y="${horizon}" width="${w}" height="${h - horizon}" fill="url(#hwater)"/>
    ${boats}
    <rect y="${quay}" width="${w}" height="${h - quay}" fill="${C.granite}"/>
    <rect y="${quay}" width="${w}" height="${h * 0.008}" fill="${C.ink}" fill-opacity="0.3"/>
    <circle cx="${w * 0.87}" cy="${quay - h * 0.04}" r="${w * 0.012}" fill="${C.buoy}"/>
  `;
}

/**
 * The quay itself, close up: granite blocks, mooring rope and a bollard.
 */
function quay(w, h, label, rand) {
  const rows = 5;
  const blockH = h / rows;
  const stones = Array.from({ length: rows }, (_, r) => {
    const offset = (r % 2) * 0.5;
    const perRow = 6;
    return Array.from({ length: perRow + 1 }, (_, c) => {
      const bw = w / perRow;
      const x = (c - 1 + offset) * bw;
      const shade = 0.06 + rand() * 0.16;
      return `<rect x="${x.toFixed(1)}" y="${(r * blockH).toFixed(1)}" width="${(bw - 3).toFixed(1)}" height="${(blockH - 3).toFixed(1)}" fill="${C.ink}" fill-opacity="${shade.toFixed(3)}"/>`;
    }).join('');
  }).join('');

  const ropeY = h * 0.62;
  return `
    <defs>
      <linearGradient id="stone" x1="0" y1="0" x2="0.6" y2="1">
        <stop offset="0%" stop-color="${C.graniteLight}"/>
        <stop offset="100%" stop-color="${C.granite}"/>
      </linearGradient>
    </defs>
    <rect width="${w}" height="${h}" fill="url(#stone)"/>
    ${stones}
    <path d="M0 ${ropeY} C${w * 0.25} ${ropeY + h * 0.16} ${w * 0.5} ${ropeY - h * 0.12} ${w} ${ropeY + h * 0.06}"
      fill="none" stroke="${C.foamShade}" stroke-width="${h * 0.022}" stroke-linecap="round" opacity="0.9"/>
    <path d="M0 ${ropeY} C${w * 0.25} ${ropeY + h * 0.16} ${w * 0.5} ${ropeY - h * 0.12} ${w} ${ropeY + h * 0.06}"
      fill="none" stroke="${C.ink}" stroke-width="${h * 0.006}" stroke-linecap="round" opacity="0.2"
      stroke-dasharray="${h * 0.02} ${h * 0.03}"/>
    <rect x="${w * 0.1}" y="${h * 0.3}" width="${w * 0.06}" height="${h * 0.5}" rx="${w * 0.02}" fill="${C.ink}" fill-opacity="0.72"/>
    <rect x="${w * 0.085}" y="${h * 0.27}" width="${w * 0.09}" height="${h * 0.06}" rx="${w * 0.02}" fill="${C.ink}" fill-opacity="0.72"/>
    <circle cx="${w * 0.78}" cy="${h * 0.33}" r="${h * 0.05}" fill="${C.buoy}" fill-opacity="0.92"/>
  `;
}

const STYLES = { seascape, object, portrait, social, harbour, quay };

/** Fine film grain, so flat vector fills do not read as a screenshot of CSS. */
function grain(size, rand) {
  const pixels = Buffer.alloc(size * size * 4);
  for (let i = 0; i < size * size; i++) {
    const v = Math.round(rand() * 255);
    pixels[i * 4] = v;
    pixels[i * 4 + 1] = v;
    pixels[i * 4 + 2] = v;
    pixels[i * 4 + 3] = 12; // barely there
  }
  return { input: pixels, raw: { width: size, height: size, channels: 4 }, tile: true, blend: 'over' };
}

async function exists(file) {
  try {
    await access(file, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

async function main() {
  let written = 0;
  let kept = 0;

  for (const target of TARGETS) {
    const out = path.join(root, target.file);
    if (!FORCE && (await exists(out))) {
      console.log(`  kept      ${target.file}`);
      kept++;
      continue;
    }

    const rand = rng(target.file);
    const { width: w, height: h } = target;
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${STYLES[target.style](w, h, target.label, rand)}</svg>`;

    await mkdir(path.dirname(out), { recursive: true });
    const buffer = await sharp(Buffer.from(svg))
      .composite([grain(256, rng(`${target.file}:grain`))])
      .jpeg({ quality: 82, mozjpeg: true, chromaSubsampling: '4:4:4' })
      .toBuffer();
    await writeFile(out, buffer);

    console.log(`  generated ${target.file.padEnd(52)} ${w}x${h}  ${(buffer.length / 1024).toFixed(0)} KB`);
    written++;
  }

  console.log(`\n  ${written} generated, ${kept} left untouched`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
