// The origin provider (ADR-0007). Two jobs: serve the built files, and read/write the
// Working File and the Ledger. It holds no state and computes nothing — the moment it
// knows what a Journal Entry is, the model lives in two places and one is untested.
import { createServer } from 'node:http';
import { mkdirSync } from 'node:fs';
import { readFile, rename, writeFile } from 'node:fs/promises';
import { extname, join, normalize, sep } from 'node:path';
import { DATA_DIR, EXPECTED_HOST, HOST, LEDGER_FILE, PLAN_FILE, PORT, URL_BASE, WEB_ROOT } from './config.mjs';

// node:http sets no Content-Type. A .js module served as text/plain is refused by the browser.
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.map': 'application/json', '.svg': 'image/svg+xml' };
// The only two disk paths the browser can reach, chosen here and never taken from the request.
const FILES = { '/api/plan': PLAN_FILE, '/api/ledger': LEDGER_FILE };

const server = createServer(async (req, res) => {
  try {
    // Every request, reads included. Without this, a name that resolves to 127.0.0.1 makes
    // the attacker's page same-origin with us and the plan becomes readable (DNS rebinding).
    if (req.headers.host !== EXPECTED_HOST) return res.writeHead(403).end();
    const { pathname } = new URL(req.url, URL_BASE);
    const target = FILES[pathname];
    // PUT only. Do not re-add POST: a cross-origin POST with a text/plain or form body is a
    // CORS *simple* request, so the browser sends it with no preflight and the write lands
    // blind. PUT is never simple, always preflights, and we answer no OPTIONS — so it dies.
    if (target && req.method === 'PUT') {
      // Same-origin fetch may omit Origin; present-and-wrong is a cross-origin caller.
      const origin = req.headers.origin;
      if (origin !== undefined && origin !== URL_BASE) return res.writeHead(403).end();
      const body = []; for await (const chunk of req) body.push(chunk);
      await writeFile(`${target}.tmp`, Buffer.concat(body));
      await rename(`${target}.tmp`, target); // atomic: an interrupted write cannot truncate a plan
      return res.writeHead(204).end();
    }
    if (target) {
      if (req.method !== 'GET') return res.writeHead(405).end(); // never let POST fall through to a read
      const json = await readFile(target, 'utf8').catch(() => 'null'); // absent file reads as null
      return res.writeHead(200, { 'content-type': 'application/json' }).end(json);
    }
    const file = join(WEB_ROOT, normalize(decodeURIComponent(pathname)));
    if (file !== WEB_ROOT && !file.startsWith(WEB_ROOT + sep)) return res.writeHead(403).end();
    const asset = pathname.endsWith('/') ? join(file, 'index.html') : file;
    const bytes = await readFile(asset).catch(() => null);
    if (bytes === null) return res.writeHead(404, { 'content-type': 'text/plain' }).end('not found');
    res.writeHead(200, { 'content-type': TYPES[extname(asset)] ?? 'application/octet-stream' }).end(bytes);
  } catch {
    res.writeHead(400, { 'content-type': 'text/plain' }).end('bad request');
  }
});

mkdirSync(DATA_DIR, { recursive: true });
server.listen(PORT, HOST, () => console.log(`enough — ${URL_BASE}`));
