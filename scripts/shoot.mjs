/**
 * Screenshots the built site for design review. Development utility only.
 *
 *   npm run build && node scripts/shoot.mjs [path] [...]
 *
 * Serves dist/ over http (file:// breaks absolute asset paths) and captures
 * each requested page at desktop and mobile widths into brand/preview/shots/.
 */
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { chromium } from '@playwright/test';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIST = path.join(root, 'dist');
const OUT = path.join(root, 'brand/preview/shots');
const PORT = 4399;

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.woff2': 'font/woff2',
  '.xml': 'application/xml',
};

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url ?? '/', 'http://localhost');
    let file = path.join(DIST, decodeURIComponent(url.pathname));
    if (url.pathname.endsWith('/')) file = path.join(file, 'index.html');
    const body = await readFile(file);
    res.writeHead(200, { 'content-type': TYPES[path.extname(file)] ?? 'application/octet-stream' });
    res.end(body);
  } catch {
    res.writeHead(404).end('not found');
  }
});

await new Promise((resolve) => server.listen(PORT, resolve));
await mkdir(OUT, { recursive: true });

const args = process.argv.slice(2);
/** --fold captures only what is above the fold instead of the whole page. */
const fold = args.includes('--fold');
/** --scroll=1200 scrolls before capturing, to check sticky/scrolled states. */
const scrollTo = Number(args.find((a) => a.startsWith('--scroll='))?.split('=')[1] ?? 0);
const targets = args.filter((a) => !a.startsWith('--'));
const paths = targets.length > 0 ? targets : ['/'];
const suffix = fold ? '-fold' : scrollTo ? `-scrolled` : '';

const VIEWPORTS = [
  { name: 'desktop', width: 1440, height: 960 },
  { name: 'mobile', width: 390, height: 844 },
];

const browser = await chromium.launch();

for (const target of paths) {
  for (const viewport of VIEWPORTS) {
    const page = await browser.newPage({
      viewport: { width: viewport.width, height: viewport.height },
      deviceScaleFactor: 1,
    });
    await page.goto(`http://localhost:${PORT}${target}`, { waitUntil: 'networkidle' });
    await page.evaluate(() => document.fonts.ready);
    if (scrollTo) {
      await page.evaluate((y) => window.scrollTo(0, y), scrollTo);
      await page.waitForTimeout(600); // let the sticky header finish its transition
    }
    const slug = target.replace(/\W+/g, '-').replace(/^-|-$/g, '') || 'home';
    const file = path.join(OUT, `${slug}-${viewport.name}${suffix}.png`);
    await page.screenshot({ path: file, fullPage: !fold && !scrollTo });
    console.log(`  ${path.relative(root, file)}`);
    await page.close();
  }
}

await browser.close();
server.close();
