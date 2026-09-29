// Launcher (P2-2b): start the origin provider, then open the browser at it.
// `npm start` compiles first; this script assumes dist/ is current.
import { spawn } from 'node:child_process';
import { URL_BASE } from './config.mjs';

await import('./index.mjs');

const opener = process.platform === 'darwin' ? 'open' : process.platform === 'win32' ? 'start' : 'xdg-open';
spawn(opener, [URL_BASE], { detached: true, stdio: 'ignore', shell: process.platform === 'win32' }).unref();
