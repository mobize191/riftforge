// B35 — serveur statique e2e : sert out/ sous /riftforge/ (loopback), sans bash.
// Remplace le tube « mkdir -p + ln -sfn + python3 » de l'ancienne config webServer,
// qui n'existait que pour Git Bash et échouait sur Windows.
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { join, extname } from 'node:path';

const PORT = Number(process.env.PORT ?? 4173);
const ROOT = join(process.cwd(), 'out');
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.wasm': 'application/wasm',
  '.mp3': 'audio/mpeg',
  '.ogg': 'audio/ogg',
};

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url ?? '/', 'http://127.0.0.1');
    let rel = decodeURIComponent(url.pathname).replace(/^\/riftforge\/?/, '/');
    if (rel === '/') rel = '/index.html';
    let path = join(ROOT, rel);
    try {
      const st = await stat(path);
      if (st.isDirectory()) path = join(path, 'index.html');
    } catch {
      // pas trouvé tel quel : fallback SPA -> index.html (basePath Next.js)
      path = join(ROOT, 'index.html');
    }
    const body = await readFile(path);
    res.writeHead(200, { 'content-type': MIME[extname(path)] ?? 'application/octet-stream' });
    res.end(body);
  } catch {
    res.writeHead(404);
    res.end('404');
  }
});

server.listen(PORT, '127.0.0.1', () => console.log(`e2e static server on http://127.0.0.1:${PORT}/riftforge/`));
