import 'dotenv/config';
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { getStatus } from './status.js';

// --- CarStatus dashboard: the same reading as the CLI, as one card in a browser ---
// `npm run web`, then open http://localhost:8080. Polls /api/status every 10 s.

const PORT = Number(process.env.PORT) || 8080;
const page = new URL('./web/index.html', import.meta.url);

http
  .createServer(async (req, res) => {
    const { pathname } = new URL(req.url, 'http://localhost');
    if (pathname === '/api/status') {
      try {
        const status = await getStatus();
        res.writeHead(200, { 'Content-Type': 'application/json' }).end(JSON.stringify(status));
      } catch (err) {
        res.writeHead(502, { 'Content-Type': 'application/json' })
          .end(JSON.stringify({ error: err?.message ?? String(err) }));
      }
      return;
    }
    if (pathname === '/' || pathname === '/index.html') {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' }).end(await readFile(page));
      return;
    }
    res.writeHead(404).end('Not found');
  })
  .listen(PORT, () => console.log(`🚗 CarStatus dashboard on http://localhost:${PORT}`));
