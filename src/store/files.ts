// `store/` is the only layer that knows the Working File and the Ledger exist. It talks to
// the origin provider (ADR-0007) over two fixed URLs; the server picks the disk paths, so
// nothing here — and nothing above here — can name a file on disk.
//
// Shapes, versioning and migrations are Phase 8. This is transport only.

const PLAN_URL = '/api/plan';
const LEDGER_URL = '/api/ledger';

const read = async (url: string): Promise<unknown> => {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`read failed: ${url} ${response.status}`);
  return response.json();
};

const write = async (url: string, body: unknown): Promise<void> => {
  const response = await fetch(url, {
    method: 'PUT',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body, null, 2),
  });
  // A silent failed Save is worse than no Save (P8-2b): the screen would keep showing
  // figures that are no longer on disk. Callers surface this.
  if (!response.ok) throw new Error(`write failed: ${url} ${response.status}`);
};

/** The Working File, or `null` when none exists yet. */
export const readPlan = (): Promise<unknown> => read(PLAN_URL);

export const writePlan = (plan: unknown): Promise<void> => write(PLAN_URL, plan);

/**
 * The Ledger, or `null` when none exists yet — and an EMPTY file is `null` too: the origin provider
 * serves a zero-byte file as a zero-byte body, which is not JSON, and it has recorded nothing.
 */
export const readLedger = async (): Promise<unknown> => {
  const response = await fetch(LEDGER_URL);
  if (!response.ok) throw new Error(`read failed: ${LEDGER_URL} ${response.status}`);
  const text = await response.text();
  return text.trim() === '' ? null : JSON.parse(text);
};

export const writeLedger = (ledger: unknown): Promise<void> => write(LEDGER_URL, ledger);
