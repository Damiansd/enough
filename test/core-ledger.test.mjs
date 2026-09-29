// P11-1 slice 1 — the Ledger: append-only, not chronological, and a writer that refuses anything
// but an extension of what it last loaded.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  LEDGER_FILE_VERSION,
  LedgerCategorisationError,
  LedgerDuplicateIdError,
  LedgerFileShapeError,
  LedgerFileVersionError,
  LedgerImportMappingError,
  LedgerNotAnExtensionError,
  LedgerReversalError,
  LedgerTransactionError,
  appended,
  categoryOf,
  emptyLedger,
  parseLedger,
  requireExtension,
} from '../dist/core/ledger.js';
import { LedgerWriteFailure, appendToLedger, loadLedger, saveLedger } from '../dist/app/ledgerStore.js';
import { readLedger } from '../dist/store/files.js';

const SRC = join(resolve(dirname(fileURLToPath(import.meta.url)), '..'), 'src');

/** The bytes the store writes (`store/files.ts`: `JSON.stringify(body, null, 2)`). */
const bytes = (value) => JSON.stringify(value, null, 2);

const txn = (id, date, amount, extra = {}) => ({
  id,
  date,
  amount,
  description: `EFTPOS ${id.toUpperCase()}`,
  account: 'Everyday account',
  createdAt: '2026-09-28',
  origin: 'import',
  ...extra,
});

const FILE = {
  version: 1,
  transactions: [
    txn('t1', '2026-08-03', -8_450),
    txn('t2', '2026-08-05', -120_000, { origin: 'manual', account: 'Cash' }),
    txn('t3', '2026-08-09', 120_000, { reverses: 't2', description: 'correction' }),
    txn('t4', '2026-07-30', 2_500),
  ],
  categorisations: [
    { id: 'c1', transactionId: 't1', category: 'Committed', subcategory: 'Groceries', createdAt: '2026-09-28' },
    { id: 'c2', transactionId: 't4', category: 'One-off', createdAt: '2026-09-28' },
    { id: 'c3', transactionId: 't1', category: 'Discretionary', createdAt: '2026-09-29' },
  ],
};
const FILE_TEXT = bytes(FILE);
const clone = () => JSON.parse(FILE_TEXT);

/** A transport over one stored value, recording every write as the bytes the store would send. */
const transport = (stored) => {
  const writes = [];
  return {
    writes,
    readLedger: async () => stored,
    writeLedger: async (body) => { writes.push(bytes(body)); },
  };
};

// --- Round trip -----------------------------------------------------------------------------------

test('round trip: a Ledger read through the door serialises to the exact bytes it was read from', () => {
  assert.equal(bytes(parseLedger(JSON.parse(FILE_TEXT))), FILE_TEXT);
  // Absent optional keys stay absent: t1 has no `reverses`, c2 no `subcategory`.
  const ledger = parseLedger(clone());
  assert.equal(Object.hasOwn(ledger.transactions[0], 'reverses'), false);
  assert.equal(Object.hasOwn(ledger.categorisations[1], 'subcategory'), false);
});

test('round trip through the store: load, append nothing, save — the bytes on the wire are the file', async () => {
  const disk = transport(clone());
  const loaded = await loadLedger(disk);
  await saveLedger(disk, loaded, clone());
  assert.deepEqual(disk.writes, [FILE_TEXT]);
});

test('absence is the empty Ledger, and the empty Ledger has one canonical form', async () => {
  const empty = await loadLedger(transport(null));
  assert.equal(bytes(empty), bytes({ version: LEDGER_FILE_VERSION, transactions: [], categorisations: [] }));
  assert.equal(bytes(parseLedger(null)), bytes(emptyLedger()));
  assert.equal(bytes(parseLedger({ version: 1, transactions: [], categorisations: [] })), bytes(emptyLedger()));
});

test('store: an empty ledger.json reads as absence, a non-empty one as its JSON', async () => {
  const original = globalThis.fetch;
  try {
    globalThis.fetch = async () => ({ ok: true, text: async () => '  \n' });
    assert.equal(await readLedger(), null);
    globalThis.fetch = async () => ({ ok: true, text: async () => FILE_TEXT });
    assert.deepEqual(await readLedger(), FILE);
    globalThis.fetch = async () => ({ ok: true, text: async () => 'null' });
    assert.equal(await readLedger(), null);
  } finally {
    globalThis.fetch = original;
  }
});

// --- Append-only, not chronological --------------------------------------------------------------

test('a back-dated Transaction is appended: order is the order recorded, not the order it happened', async () => {
  const ledger = parseLedger(clone());
  const earlier = txn('t5', '2025-01-15', -3_000);
  const grown = appended(ledger, [earlier]);
  assert.equal(grown.transactions.length, 5);
  assert.equal(grown.transactions.at(-1).date, '2025-01-15');
  assert.ok(grown.transactions.at(-1).date < ledger.transactions.at(-1).date);
  // …and the writer takes it.
  const disk = transport(clone());
  const saved = await appendToLedger(disk, await loadLedger(disk), [earlier]);
  assert.equal(disk.writes.length, 1);
  assert.equal(bytes(saved), disk.writes[0]);
  assert.equal(JSON.parse(disk.writes[0]).transactions.at(-1).id, 't5');
});

test('appended never touches the Ledger it was given', () => {
  const ledger = parseLedger(clone());
  appended(ledger, [txn('t5', '2026-09-01', -1)]);
  assert.equal(ledger.transactions.length, 4);
  assert.equal(bytes(ledger), FILE_TEXT);
  assert.ok(Object.isFrozen(ledger) && Object.isFrozen(ledger.transactions) && Object.isFrozen(ledger.transactions[0]));
});

test('categorising appends a record and edits nothing; the last Categorisation naming a Transaction wins', () => {
  const ledger = parseLedger(clone());
  assert.equal(categoryOf(ledger, 't1').category, 'Discretionary');
  assert.equal(categoryOf(ledger, 't2'), undefined);
  const recategorised = appended(ledger, [], [{ id: 'c4', transactionId: 't1', category: 'One-off', createdAt: '2026-09-30' }]);
  assert.equal(categoryOf(recategorised, 't1').category, 'One-off');
  assert.equal(bytes(recategorised.transactions), bytes(ledger.transactions));
  // A Categorisation may name a Transaction appended in the same call.
  const both = appended(ledger, [txn('t5', '2026-09-01', -1)], [{ id: 'c4', transactionId: 't5', category: 'Committed', createdAt: '2026-09-30' }]);
  assert.equal(categoryOf(both, 't5').category, 'Committed');
});

test('a correction is a reversal plus a new Transaction, both appended', () => {
  const ledger = parseLedger(clone());
  const corrected = appended(ledger, [
    txn('t5', '2026-08-03', 8_450, { reverses: 't1', description: 'correction' }),
    txn('t6', '2026-08-03', -8_540),
  ]);
  // The reversal cancels t1 to the cent; what is left is the corrected figure.
  const sum = (l) => l.transactions.reduce((total, t) => total + t.amount, 0);
  assert.equal(sum(corrected) - sum(ledger), 8_450 - 8_540);
});

// --- The writer refuses anything but an extension -------------------------------------------------

const refusedAtWriter = async (mutate, base = clone()) => {
  const disk = transport(structuredClone(base));
  const loaded = await loadLedger(disk);
  const candidate = structuredClone(base);
  mutate(candidate);
  await assert.rejects(saveLedger(disk, loaded, candidate), LedgerNotAnExtensionError);
  assert.deepEqual(disk.writes, [], 'a refused candidate reached the transport');
};

test('writer: an EDITED recorded Transaction is refused by name, before any write', async () => {
  await refusedAtWriter((file) => { file.transactions[0].amount = -8_500; });
  await refusedAtWriter((file) => { file.transactions[3].description = 'tidied up'; });
  await refusedAtWriter((file) => { file.transactions[1].date = '2026-08-06'; });
  // Edited AND extended is still an edit.
  await refusedAtWriter((file) => { file.transactions[0].account = 'Cash'; file.transactions.push(txn('t5', '2026-09-01', -1)); });
});

test('writer: a REMOVED recorded Transaction is refused, the last one included', async () => {
  // The last Transaction, uncategorised, so the candidate is a valid Ledger and only the writer can refuse it.
  const withUncategorisedLast = clone();
  withUncategorisedLast.transactions.push(txn('t5', '2026-09-01', -1));
  assert.equal(parseLedger(withUncategorisedLast).transactions.length, 5);
  await refusedAtWriter((file) => { file.transactions.pop(); }, withUncategorisedLast);
  await refusedAtWriter((file) => { file.transactions.splice(0, 1); file.categorisations = file.categorisations.filter((c) => c.transactionId !== 't1'); });
  // Removed and replaced by a new one: same length, still a removal.
  await refusedAtWriter((file) => { file.transactions[3] = txn('t9', '2026-07-30', 2_500); file.categorisations.splice(1, 1); });
});

test('writer: a REORDERED Ledger is refused', async () => {
  await refusedAtWriter((file) => { [file.transactions[0], file.transactions[3]] = [file.transactions[3], file.transactions[0]]; });
});

test('writer: an edited or dropped Categorisation is refused the same way', async () => {
  await refusedAtWriter((file) => { file.categorisations[0].category = 'One-off'; });
  await refusedAtWriter((file) => { file.categorisations.pop(); });
});

test('writer: the candidate goes through the door first — a malformed one is refused by its own name, unwritten', async () => {
  const disk = transport(clone());
  const loaded = await loadLedger(disk);
  const candidate = clone();
  candidate.transactions.push(txn('t1', '2026-09-01', -1));
  await assert.rejects(saveLedger(disk, loaded, candidate), LedgerDuplicateIdError);
  assert.deepEqual(disk.writes, []);
});

test('requireExtension, direct: equal is an extension; a shorter or altered Ledger is not', () => {
  const ledger = parseLedger(clone());
  assert.equal(requireExtension(ledger, parseLedger(clone())).transactions.length, 4);
  assert.throws(() => requireExtension(appended(ledger, [txn('t5', '2026-09-01', -1)]), ledger), LedgerNotAnExtensionError);
});

test('a disk that refuses the write is LedgerWriteFailure, not a refusal', async () => {
  const disk = { readLedger: async () => null, writeLedger: async () => { throw new Error('ENOSPC'); } };
  const error = await appendToLedger(disk, await loadLedger(disk), [txn('t1', '2026-09-01', -1)]).catch((caught) => caught);
  assert.ok(error instanceof LedgerWriteFailure);
  assert.ok(!(error instanceof RangeError));
});

// --- appended refuses by name ---------------------------------------------------------------------

test('appended: a duplicate id is refused — against the Ledger and within one call', () => {
  const ledger = parseLedger(clone());
  assert.throws(() => appended(ledger, [txn('t2', '2026-09-01', -1)]), LedgerDuplicateIdError);
  assert.throws(() => appended(ledger, [txn('t5', '2026-09-01', -1), txn('t5', '2026-09-02', -2)]), LedgerDuplicateIdError);
  assert.throws(() => appended(ledger, [], [{ id: 'c1', transactionId: 't1', category: 'Committed', createdAt: '2026-09-30' }]), LedgerDuplicateIdError);
});

test('appended: a reversal naming nothing, itself, a later one, or one already reversed is refused', () => {
  const ledger = parseLedger(clone());
  assert.throws(() => appended(ledger, [txn('t5', '2026-09-01', 1, { reverses: 'nope' })]), LedgerReversalError);
  assert.throws(() => appended(ledger, [txn('t5', '2026-09-01', 1, { reverses: 't5' })]), LedgerReversalError);
  assert.throws(() => appended(ledger, [txn('t5', '2026-09-01', 1, { reverses: 't6' }), txn('t6', '2026-09-01', -1)]), LedgerReversalError);
  // t2 was reversed by t3 in the file.
  assert.throws(() => appended(ledger, [txn('t5', '2026-09-01', 120_000, { reverses: 't2' })]), /already reversed/);
  // Not the exact negation.
  assert.throws(() => appended(ledger, [txn('t5', '2026-09-01', 8_000, { reverses: 't1' })]), LedgerReversalError);
});

test('appended: malformed fields are refused by name', () => {
  const ledger = parseLedger(clone());
  const bad = [
    txn('t5', '2026-9-1', -1),
    txn('t5', '2026-09-01', -1.5),
    txn('t5', '2026-09-01', '-100'),
    txn('', '2026-09-01', -1),
    txn('t5', '2026-09-01', -1, { origin: 'bank-feed' }),
    txn('t5', '2026-09-01', -1, { category: 'Committed' }),
    txn('t5', '2026-09-01', -1, { reverses: 7 }),
    { id: 't5', date: '2026-09-01', amount: -1 },
  ];
  for (const record of bad) assert.throws(() => appended(ledger, [record]), LedgerTransactionError, JSON.stringify(record));
  assert.throws(() => appended(ledger, [], [{ id: 'c4', transactionId: 't1', category: 'Groceries', createdAt: '2026-09-30' }]), LedgerCategorisationError);
  assert.throws(() => appended(ledger, [], [{ id: 'c4', transactionId: 'nope', category: 'Committed', createdAt: '2026-09-30' }]), LedgerCategorisationError);
});

// --- The door --------------------------------------------------------------------------------------

test('the door refuses by name', () => {
  const cases = [
    [[], LedgerFileShapeError],
    ['ledger', LedgerFileShapeError],
    [{ version: 1, transactions: [] }, LedgerFileShapeError],
    [{ ...clone(), extra: true }, LedgerFileShapeError],
    [{ ...clone(), transactions: {} }, LedgerFileShapeError],
    [{ ...clone(), version: 2 }, LedgerFileVersionError],
    [{ ...clone(), version: '1' }, LedgerFileVersionError],
    [{ transactions: [], categorisations: [] }, LedgerFileShapeError],
  ];
  for (const [value, Kind] of cases) assert.throws(() => parseLedger(value), Kind, JSON.stringify(value));
  const withoutVersion = clone();
  delete withoutVersion.version;
  assert.throws(() => parseLedger(withoutVersion), LedgerFileShapeError);
  const duplicate = clone();
  duplicate.transactions.push(duplicate.transactions[0]);
  assert.throws(() => parseLedger(duplicate), LedgerDuplicateIdError);
  const forwardReversal = clone();
  forwardReversal.transactions.unshift(txn('t0', '2026-08-01', 8_450, { reverses: 't1' }));
  assert.throws(() => parseLedger(forwardReversal), LedgerReversalError);
});

test('a refused file is refused at load, and nothing is written', async () => {
  const disk = transport({ ...clone(), version: 9 });
  await assert.rejects(loadLedger(disk), LedgerFileVersionError);
  assert.deepEqual(disk.writes, []);
});

test('every refusal is a RangeError and names the path it refused', () => {
  const error = (() => { try { parseLedger({ ...clone(), transactions: [txn('t1', 'soon', -1)] }); } catch (caught) { return caught; } })();
  assert.ok(error instanceof LedgerTransactionError && error instanceof RangeError);
  assert.match(error.message, /^ledger file: transactions\[0\]\.date /);
});

// --- P11-2: saved CSV column mappings -------------------------------------------------------------

const MAPPING = {
  id: 'm1',
  header: ['Date', 'Amount', 'Description', 'Balance'],
  dateColumn: 'Date',
  dateFormat: 'DD/MM/YYYY',
  descriptionColumn: 'Description',
  amountColumn: 'Amount',
  account: 'Everyday account',
  createdAt: '2026-09-28',
};
const HEADERLESS = {
  id: 'm2',
  formatName: 'CommBank',
  columnCount: 4,
  dateColumn: 'Column 1',
  dateFormat: 'DD/MM/YYYY',
  descriptionColumn: 'Column 3',
  amountColumn: 'Column 2',
  account: 'Everyday account',
  createdAt: '2026-09-28',
};

test('P11-2: a file without importMappings reads and round-trips unchanged; one with them round-trips to its own bytes', () => {
  assert.equal(Object.hasOwn(parseLedger(clone()), 'importMappings'), false);
  const text = bytes({ ...clone(), importMappings: [MAPPING, HEADERLESS] });
  assert.equal(bytes(parseLedger(JSON.parse(text))), text);
  const grown = appended(parseLedger(clone()), [], [], [MAPPING]);
  assert.deepEqual(grown.importMappings, [MAPPING]);
  assert.equal(bytes(appended(grown, [], [], [])), bytes(grown));
});

test('P11-2: a changed mapping is a NEW record and the old one stays; dropping or editing one is not an extension', () => {
  const one = parseLedger({ ...clone(), importMappings: [MAPPING] });
  const two = appended(one, [], [], [{ ...MAPPING, id: 'm1b', dateFormat: 'MM/DD/YYYY' }]);
  assert.deepEqual(two.importMappings.map((each) => each.id), ['m1', 'm1b']);
  assert.equal(requireExtension(one, two), two);
  assert.throws(() => requireExtension(two, one), LedgerNotAnExtensionError);
  const edited = parseLedger({ ...clone(), importMappings: [{ ...MAPPING, account: 'Cash' }] });
  assert.throws(() => requireExtension(one, edited), LedgerNotAnExtensionError);
  assert.throws(() => requireExtension(one, parseLedger(clone())), LedgerNotAnExtensionError);
});

test('P11-2: the door refuses a malformed mapping by name', () => {
  const without = (key) => { const copy = { ...MAPPING }; delete copy[key]; return copy; };
  const cases = [
    { ...MAPPING, formatName: 'x', columnCount: 4 },
    without('header'),
    { ...MAPPING, header: [] },
    { ...MAPPING, header: ['Date', 'Date', 'Amount', 'Description'] },
    { ...MAPPING, dateColumn: 'When' },
    { ...MAPPING, debitColumn: 'Amount', creditColumn: 'Balance' },
    { ...without('amountColumn'), debitColumn: 'Amount' },
    { ...without('amountColumn'), debitColumn: 'Amount', creditColumn: 'Amount' },
    { ...MAPPING, dateFormat: 'DD.MM.YY' },
    { ...HEADERLESS, columnCount: 0 },
    { ...HEADERLESS, formatName: '' },
    { ...HEADERLESS, dateColumn: 'Column 5' },
    { ...MAPPING, extra: true },
  ];
  for (const mapping of cases) assert.throws(() => parseLedger({ ...clone(), importMappings: [mapping] }), LedgerImportMappingError, JSON.stringify(mapping));
  assert.throws(() => parseLedger({ ...clone(), importMappings: [MAPPING, MAPPING] }), LedgerDuplicateIdError);
  assert.throws(() => parseLedger({ ...clone(), importMappings: {} }), LedgerFileShapeError);
  const debitCredit = { ...without('amountColumn'), debitColumn: 'Amount', creditColumn: 'Balance' };
  assert.deepEqual(parseLedger({ ...clone(), importMappings: [debitCredit] }).importMappings, [debitCredit]);
});

// --- Nothing in the projection reads the Ledger ---------------------------------------------------

// Slice 2 (2026-09-28) wired the Ledger to the page: the Transactions panel imports the store and
// the core type, and `main.ts` mounts the panel. The P11-10 ground is unchanged and is what is pinned:
// the chain stops at the page, so no module of the projection (`core/`, `data/`) can reach it.
test('P11-10: the Ledger reaches the page through the Transactions panel only, and nothing in the projection imports it', () => {
  const sources = function* (dir) {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const path = join(dir, entry.name);
      if (entry.isDirectory()) yield* sources(path);
      else if (entry.name.endsWith('.ts')) yield path;
    }
  };
  const importers = (name) => [...sources(SRC)]
    .filter((file) => new RegExp(`from\\s*['"][^'"]*/${name}\\.js['"]`).test(readFileSync(file, 'utf8')))
    .map((file) => relative(SRC, file));
  // P11-2 (2026-09-28) added the CSV import's pure half, `app/csvImport.ts`, which reads the Ledger's
  // saved mappings and imported rows; it and the CSV reader are reached from the panel only.
  // P11-6 (2026-09-28) added the rules' pure half, `app/categorisationRules.ts`, reached from the panel only.
  // P11 slice 5 (2026-09-28) added the Derived Baseline's pure half, `app/derivedBaseline.ts`, reached from the panel only.
  assert.deepEqual(importers('ledger').sort(), [join('app', 'categorisationRules.ts'), join('app', 'csvImport.ts'), join('app', 'derivedBaseline.ts'), join('app', 'ledgerStore.ts'), join('app', 'transactionsPanel.ts')]);
  assert.deepEqual(importers('derivedBaseline'), [join('app', 'transactionsPanel.ts')]);
  assert.deepEqual(importers('csvImport'), [join('app', 'transactionsPanel.ts')]);
  assert.deepEqual(importers('categorisationRules'), [join('app', 'transactionsPanel.ts')]);
  assert.deepEqual(importers('csv').sort(), [join('app', 'csvImport.ts'), join('app', 'transactionsPanel.ts')]);
  assert.deepEqual(importers('ledgerStore'), [join('app', 'transactionsPanel.ts')]);
  assert.deepEqual(importers('transactionsPanel'), [join('app', 'main.ts')]);
  // Vacuity: the same search finds the plan door's many importers.
  assert.ok(importers('parsePlan').length > 3);
});
