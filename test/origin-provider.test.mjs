// The origin provider's request guards, exercised against a real listening server.
//
// A page the user happens to be visiting can reach 127.0.0.1. The guards under test are the
// only thing standing between that page and the Working File, so they are asserted against
// the running server rather than by reading the source: a guard that is present but
// unreachable (wrong branch order, fall-through to a read) still passes a source-level check.
import test, { after, before } from 'node:test';
import assert from 'node:assert/strict';
import { request } from 'node:http';
import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const HOST = '127.0.0.1';
// A free port of the test's own, never 4173: the user's server may be running there, and this suite
// must pass alongside it. The server is told which port through ENOUGH_PORT (server/config.mjs).
let PORT;
let ORIGIN;
const freePort = () => new Promise((ok, fail) => {
  const probeServer = createServer();
  probeServer.on('error', fail);
  probeServer.listen(0, HOST, () => {
    const { port } = probeServer.address();
    probeServer.close(() => ok(port));
  });
});

const DATA_DIR = mkdtempSync(join(tmpdir(), 'enough-test-'));
let server;

// node:http, not fetch: Host is a forbidden header name and the test must be able to lie
// about it. Headers given here replace the defaults entirely.
const probe = (method, path, headers = {}, body) => new Promise((ok, fail) => {
  const req = request({ host: HOST, port: PORT, method, path, headers: { host: `${HOST}:${PORT}`, ...headers } });
  req.on('error', fail);
  req.on('response', (res) => {
    const chunks = [];
    res.on('data', (c) => chunks.push(c));
    res.on('end', () => ok({ status: res.statusCode, type: res.headers['content-type'], body: Buffer.concat(chunks).toString() }));
  });
  req.end(body);
});

before(async () => {
  PORT = await freePort();
  ORIGIN = `http://${HOST}:${PORT}`;
  assert.notEqual(PORT, 4173);
  await new Promise((ok, fail) => {
  server = spawn(process.execPath, [join(REPO, 'server', 'index.mjs')], {
    env: { ...process.env, ENOUGH_DATA_DIR: DATA_DIR, ENOUGH_PORT: String(PORT) },
    stdio: ['ignore', 'pipe', 'inherit'],
  });
  server.on('error', fail);
  server.stdout.on('data', (chunk) => { if (String(chunk).includes(ORIGIN)) ok(); });
  });
});

after(() => {
  server?.kill();
  rmSync(DATA_DIR, { recursive: true, force: true });
});

test('a same-origin PUT writes and a GET reads it back', async () => {
  const put = await probe('PUT', '/api/plan', { origin: ORIGIN, 'content-type': 'application/json' }, '{"kept":1}');
  assert.equal(put.status, 204);
  assert.equal(readFileSync(join(DATA_DIR, 'plan.json'), 'utf8'), '{"kept":1}');

  const get = await probe('GET', '/api/plan');
  assert.equal(get.status, 200);
  assert.equal(get.type, 'application/json');
  assert.deepEqual(JSON.parse(get.body), { kept: 1 });
});

test('a PUT with no Origin is accepted — a same-origin fetch may omit it', async () => {
  assert.equal((await probe('PUT', '/api/ledger', {}, '[]')).status, 204);
});

// The hole this suite exists for: a cross-origin POST carrying text/plain is a CORS simple
// request, so no preflight is sent and a blind overwrite lands. POST must never write, and
// must not fall through to the read branch either.
test('POST is refused and does not overwrite the plan', async () => {
  const post = await probe('POST', '/api/plan', { 'content-type': 'text/plain' }, '{"attacker":1}');
  assert.equal(post.status, 405);
  assert.equal(readFileSync(join(DATA_DIR, 'plan.json'), 'utf8'), '{"kept":1}');
});

test('a PUT from a foreign Origin is refused and does not overwrite the plan', async () => {
  const put = await probe('PUT', '/api/plan', { origin: 'http://evil.example' }, '{"attacker":1}');
  assert.equal(put.status, 403);
  assert.equal(readFileSync(join(DATA_DIR, 'plan.json'), 'utf8'), '{"kept":1}');
});

test('a foreign Host is refused on writes and on reads (DNS rebinding)', async () => {
  assert.equal((await probe('PUT', '/api/plan', { host: 'evil.example' }, '{"attacker":1}')).status, 403);
  assert.equal((await probe('GET', '/api/plan', { host: 'evil.example' })).status, 403);
  assert.equal((await probe('GET', '/', { host: 'evil.example' })).status, 403);
  assert.equal(readFileSync(join(DATA_DIR, 'plan.json'), 'utf8'), '{"kept":1}');
});

test('the static path still serves dist/ with its MIME type and refuses traversal', async () => {
  const index = await probe('GET', '/');
  assert.equal(index.status, 200);
  assert.equal(index.type, 'text/html');

  const script = await probe('GET', '/app/main.js');
  assert.equal(script.status, 200);
  assert.equal(script.type, 'text/javascript');

  // A source map is JSON, not a byte blob. Vendored 2026-09-19 so the library reads from its own
  // 74 TypeScript sources rather than as a minified blob; served as octet-stream it is useless.
  const map = await probe('GET', '/vendor/chart.umd.js.map');
  assert.equal(map.status, 200);
  assert.equal(map.type, 'application/json');

  for (const path of ['/../package.json', '/..%2fpackage.json', '/%2e%2e/%2e%2e/etc/passwd', '/a/../../package.json']) {
    const escaped = await probe('GET', path);
    assert.ok(escaped.status === 403 || escaped.status === 404, `${path} returned ${escaped.status}`);
    assert.ok(!escaped.body.includes('"name": "enough"'), `${path} leaked the repo`);
  }
});
