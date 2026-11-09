/**
 * Serves public/ as a plain static site, so the editor can be opened locally
 * without the Astro dev server.
 *
 * This exists for one reason: the dev server reloads the page whenever a file
 * on disk changes. The editor writes files, so it can trigger a reload of
 * itself half way through saving and leave the content truncated. Sveltia
 * warns about exactly this and asks to be served as a static file instead.
 *
 * Nothing here is needed in production: the host serves public/editor/ the
 * same way, and there is no file watcher to interrupt anything.
 *
 *   npm run admin
 */
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'public');
const PORT = Number(process.env.PORT ?? 4322);

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.yml': 'text/yaml; charset=utf-8',
  '.yaml': 'text/yaml; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
};

const server = createServer(async (req, res) => {
  const url = new URL(req.url ?? '/', 'http://localhost');
  let file = path.join(root, decodeURIComponent(url.pathname));

  // Refuse anything that climbs out of public/.
  if (!file.startsWith(root)) {
    res.writeHead(403).end('Forbidden');
    return;
  }

  if (url.pathname.endsWith('/')) file = path.join(file, 'index.html');

  try {
    const body = await readFile(file);
    res.writeHead(200, {
      'content-type': TYPES[path.extname(file)] ?? 'application/octet-stream',
      // The editor reads its own configuration; a stale copy is confusing.
      'cache-control': 'no-store',
    });
    res.end(body);
  } catch {
    res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
    res.end('Non atopado');
  }
});

server.listen(PORT, () => {
  const url = `http://localhost:${PORT}/editor/`;
  console.log(`\n  Editor en ${url}`);
  console.log('  Preme "Traballar cun repositorio local" e escolle a carpeta do proxecto.');
  console.log('  Ctrl+C para parar.\n');

  const open =
    process.platform === 'win32' ? ['cmd', ['/c', 'start', '', url]]
    : process.platform === 'darwin' ? ['open', [url]]
    : ['xdg-open', [url]];
  spawn(open[0], open[1], { stdio: 'ignore', detached: true }).unref();
});
