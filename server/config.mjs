// Every location and port the origin provider knows about. One place, by design:
// ADR-0007 keeps the server to two jobs, and a constant scattered across three files
// is how a third job arrives.
import { homedir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '..');

export const HOST = '127.0.0.1'; // loopback only — 0.0.0.0 would publish the plan to the network
// 4173 is the app's port, and the browser origin the plan and the chat settings belong to. Only a
// test overrides it (ENOUGH_PORT), so the suite can run its own server while yours keeps running.
const portFromEnv = (value) => {
  const port = Number(value);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new RangeError(`ENOUGH_PORT is not a port: ${value}`);
  return port;
};
export const PORT = process.env.ENOUGH_PORT === undefined ? 4173 : portFromEnv(process.env.ENOUGH_PORT);
export const URL_BASE = `http://${HOST}:${PORT}`;
// The only Host header this server will answer to. A DNS rebinding attack reaches loopback
// by resolving an attacker-controlled name to 127.0.0.1; the name survives in Host.
export const EXPECTED_HOST = `${HOST}:${PORT}`;

// Only the build output is reachable over HTTP. Serving the repo root would put
// .git/, the research notes and any stray plan file one GET away.
export const WEB_ROOT = join(REPO, 'dist');

// The Working File and the Ledger live OUTSIDE the repo (README §Data). The default
// is the user's home directory, never the project tree; override with ENOUGH_DATA_DIR.
// Importing this file touches nothing on disk: the server makes DATA_DIR when it starts, and the
// connector (`connector.mjs`), which only reads, never makes it.
export const DATA_DIR = process.env.ENOUGH_DATA_DIR
  ? resolve(process.env.ENOUGH_DATA_DIR)
  : join(homedir(), '.enough');

export const PLAN_FILE = join(DATA_DIR, 'plan.json');
export const LEDGER_FILE = join(DATA_DIR, 'ledger.json');
