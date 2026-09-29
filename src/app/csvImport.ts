// P11-2 — turning a bank CSV file into Transactions, the pure half of the import (the page half is
// in `transactionsPanel.ts`). User rulings 2026-09-28:
//
//   1. **A mapping is remembered per bank format.** A file with a header row is keyed by its column
//      names, ORDER-INDEPENDENT: the same names in any order find the same saved mapping, which
//      refers to columns by name and so reads the shuffled file correctly. A headerless file is
//      keyed by its column count and a name the user gives the format; its columns are "Column 1" …
//   2. **Rows already imported are skipped, by MULTISET.** Key = (date, cents, raw description,
//      account). A file holding k copies of a key, over a Ledger already holding j IMPORTED copies,
//      adds max(0, k − j): two genuine identical purchases on one day both survive a first import,
//      and a re-import of the same file adds nothing.
//   3. **Nothing is silently dropped.** Every row that cannot be read comes back with its line number
//      and the reason; the page appends nothing until the user confirms the good rows.
//
// Pure: no DOM, no I/O, no clock.
import { DATE_FORMATS, headerlessColumnName } from '../core/ledger.js'; // `.js` is correct in a `.ts` file — see tsconfig.json
import type { DateFormat, ImportMapping, Ledger, Transaction } from '../core/ledger.js';
import type { Cents } from '../core/money.js';
import type { IsoDate } from '../data/assumptions/types.js';
import type { CsvRecord } from './csv.js';

/**
 * Everything a mapping says about reading a row. One signed `amountColumn`, or else `debitColumn`
 * and `creditColumn` (the door, `readImportMapping`, has already refused any other combination).
 */
export type RowMapping = Pick<ImportMapping, 'dateColumn' | 'dateFormat' | 'descriptionColumn' | 'amountColumn' | 'debitColumn' | 'creditColumn'>;

/** A row read cleanly: what becomes a Transaction, less the account and the ids. */
export interface ImportedRow {
  readonly line: number;
  readonly date: IsoDate;
  readonly amount: Cents;
  readonly description: string;
}

/** A row that could not be read, and why, in words for the user. */
export interface BadRow {
  readonly line: number;
  readonly reason: string;
}

// --- The format key ------------------------------------------------------------------------------

/** A header row's column names, as the key compares them. Whitespace round a name is not part of it. */
export const headerNames = (record: CsvRecord): string[] => record.fields.map((field) => field.trim());

const sameNames = (a: readonly string[], b: readonly string[]): boolean => {
  if (a.length !== b.length) return false;
  const sortedA = [...a].sort();
  const sortedB = [...b].sort();
  return sortedA.every((name, index) => name === sortedB[index]);
};

/** The mapping saved for a file with this header row — in any column order — or none. The last one saved wins. */
export const savedMappingFor = (ledger: Ledger, header: readonly string[]): ImportMapping | undefined =>
  (ledger.importMappings ?? []).filter((mapping) => mapping.header !== undefined && sameNames(mapping.header, header)).at(-1);

/** The headerless formats saved for this many columns, newest mapping per name, in the order first named. */
export const savedHeaderlessFormats = (ledger: Ledger, columnCount: number): ImportMapping[] => {
  const byName = new Map<string, ImportMapping>();
  for (const mapping of ledger.importMappings ?? []) {
    if (mapping.formatName !== undefined && mapping.columnCount === columnCount) byName.set(mapping.formatName, mapping);
  }
  return [...byName.values()];
};

/** A headerless file's column names. */
export const headerlessColumns = (count: number): string[] => Array.from({ length: count }, (_, index) => headerlessColumnName(index));

/** A mapping as the user draws it: an `ImportMapping` before it has an id and a day. */
export type MappingDraft = Omit<ImportMapping, 'id' | 'createdAt'>;

const COMPARED = ['formatName', 'columnCount', 'dateColumn', 'dateFormat', 'descriptionColumn', 'amountColumn', 'debitColumn', 'creditColumn', 'account'] as const;

/** True when a saved mapping and a draft say the same thing — then importing saves no new record. */
export const sameMapping = (saved: MappingDraft, draft: MappingDraft): boolean =>
  (saved.header === undefined) === (draft.header === undefined) &&
  (saved.header === undefined || sameNames(saved.header, draft.header!)) &&
  COMPARED.every((key) => saved[key] === draft[key]);

// --- Dates and amounts ---------------------------------------------------------------------------

const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];

const calendarDate = (year: number, month: number, day: number): IsoDate | undefined => {
  if (month < 1 || month > 12 || day < 1) return undefined;
  const leap = (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
  const days = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month - 1]!;
  if (day > days) return undefined;
  return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}` as IsoDate;
};

/** A date as the format writes it, or `undefined`. Checked against the calendar: 31/02/2026 is not a date. */
export const parseDate = (text: string, format: DateFormat): IsoDate | undefined => {
  const value = text.trim();
  if (format === 'YYYY-MM-DD') {
    const match = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(value);
    return match ? calendarDate(Number(match[1]), Number(match[2]), Number(match[3])) : undefined;
  }
  if (format === 'D MMM YYYY') {
    const match = /^(\d{1,2})[\s-]([A-Za-z]{3})[A-Za-z]*[\s-](\d{4})$/.exec(value);
    const month = match ? MONTHS.indexOf(match[2]!.toLowerCase()) + 1 : 0;
    return match && month > 0 ? calendarDate(Number(match[3]), month, Number(match[1])) : undefined;
  }
  const match = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/.exec(value);
  if (!match) return undefined;
  const [first, second] = [Number(match[1]), Number(match[2])];
  return format === 'DD/MM/YYYY' ? calendarDate(Number(match[3]), second, first) : calendarDate(Number(match[3]), first, second);
};

/**
 * The format every non-blank value reads under, trying DD/MM/YYYY first: a column of dates that are
 * all ambiguous (every day ≤ 12) is read the Australian way. When none reads them all, the one that
 * reads the most, and DD/MM/YYYY on a tie — the rest are then listed as bad rows, not guessed at.
 */
export const detectDateFormat = (values: readonly string[]): DateFormat => {
  const present = values.filter((value) => value.trim() !== '');
  let best: DateFormat = DATE_FORMATS[0];
  let bestCount = -1;
  for (const format of DATE_FORMATS) {
    const count = present.filter((value) => parseDate(value, format) !== undefined).length;
    if (count > bestCount) [best, bestCount] = [format, count];
  }
  return best;
};

/**
 * An amount in dollars as banks write it: `-12.50`, `12.50`, `$1,234.56`, `-$5`, `(12.50)` for a
 * negative. At most two decimal places; anything else is `undefined`, never rounded.
 */
export const parseAmount = (text: string): Cents | undefined => {
  let value = text.trim();
  let negative = false;
  const bracketed = /^\((.*)\)$/.exec(value);
  if (bracketed) {
    negative = true;
    value = bracketed[1]!.trim();
  }
  const match = /^([+-])?\s*\$?\s*([+-])?\s*(\d{1,3}(?:,\d{3})+|\d+)(?:\.(\d{1,2}))?$/.exec(value);
  if (!match || (match[1] !== undefined && match[2] !== undefined)) return undefined;
  if (match[1] === '-' || match[2] === '-') {
    if (negative) return undefined;
    negative = true;
  }
  const cents = Number(match[3]!.replaceAll(',', '')) * 100 + Number((match[4] ?? '').padEnd(2, '0'));
  if (!Number.isSafeInteger(cents)) return undefined;
  return (negative && cents !== 0 ? -cents : cents) as Cents;
};

// --- Reading rows --------------------------------------------------------------------------------

/**
 * A first row that reads as data — a date in one field and an amount in another — is taken to be a
 * headerless file's first transaction, not a header. Only a GUESS: the page lets the user say otherwise.
 */
export const looksLikeData = (record: CsvRecord): boolean => {
  const dateAt = record.fields.findIndex((field) => DATE_FORMATS.some((format) => parseDate(field, format) !== undefined));
  return dateAt >= 0 && record.fields.some((field, index) => index !== dateAt && parseAmount(field) !== undefined);
};

/**
 * Every data row, read through a mapping over `columns`: each comes back either as a row or as a
 * bad row with its line and reason. The two lists together account for every record passed in.
 */
export const readRows = (records: readonly CsvRecord[], columns: readonly string[], mapping: RowMapping): { rows: ImportedRow[]; bad: BadRow[] } => {
  const at = (name: string): number => columns.indexOf(name);
  const rows: ImportedRow[] = [];
  const bad: BadRow[] = [];
  for (const record of records) {
    const refuse = (reason: string): void => {
      bad.push({ line: record.line, reason });
    };
    if (record.fields.every((field) => field.trim() === '')) {
      refuse('is blank');
      continue;
    }
    if (record.fields.length !== columns.length) {
      refuse(`has ${record.fields.length} ${record.fields.length === 1 ? 'field' : 'fields'}, and this format has ${columns.length} columns`);
      continue;
    }
    const field = (name: string): string => record.fields[at(name)]!;
    const date = parseDate(field(mapping.dateColumn), mapping.dateFormat);
    if (date === undefined) {
      refuse(`has the date "${field(mapping.dateColumn)}", which is not a ${mapping.dateFormat} date`);
      continue;
    }
    let amount: Cents;
    if (mapping.amountColumn !== undefined) {
      const text = field(mapping.amountColumn);
      if (text.trim() === '') {
        refuse('has no amount');
        continue;
      }
      const cents = parseAmount(text);
      if (cents === undefined) {
        refuse(`has the amount "${text}", which is not an amount in dollars`);
        continue;
      }
      amount = cents;
    } else {
      const debitText = field(mapping.debitColumn!);
      const creditText = field(mapping.creditColumn!);
      if (debitText.trim() === '' && creditText.trim() === '') {
        refuse('has neither a debit nor a credit');
        continue;
      }
      const debit = debitText.trim() === '' ? (0 as Cents) : parseAmount(debitText);
      const credit = creditText.trim() === '' ? (0 as Cents) : parseAmount(creditText);
      if (debit === undefined) {
        refuse(`has the debit "${debitText}", which is not an amount in dollars`);
        continue;
      }
      if (credit === undefined) {
        refuse(`has the credit "${creditText}", which is not an amount in dollars`);
        continue;
      }
      if (debit !== 0 && credit !== 0) {
        refuse(`has both a debit ("${debitText}") and a credit ("${creditText}")`);
        continue;
      }
      // A debit is money out whichever sign the bank wrote it with; a credit is money in.
      amount = (debit !== 0 ? -Math.abs(debit) : Math.abs(credit)) as Cents;
    }
    rows.push({ line: record.line, date, amount, description: field(mapping.descriptionColumn) });
  }
  return { rows, bad };
};

// --- Already imported ----------------------------------------------------------------------------

const keyOf = (date: string, amount: number, description: string, account: string): string => JSON.stringify([date, amount, description, account]);

/**
 * Ruling 2: the rows to add, by multiset. The n-th copy of a key in the file is added only when the
 * Ledger holds fewer than n IMPORTED copies of it (a hand-entered Transaction is not a copy of a
 * statement line, so it never makes one look already imported).
 */
export const notYetImported = (ledger: Ledger, rows: readonly ImportedRow[], account: string): { toAdd: ImportedRow[]; skipped: number } => {
  const held = new Map<string, number>();
  for (const transaction of ledger.transactions) {
    if (transaction.origin !== `import`) continue;
    const key = keyOf(transaction.date, transaction.amount, transaction.description, transaction.account);
    held.set(key, (held.get(key) ?? 0) + 1);
  }
  const seen = new Map<string, number>();
  const toAdd: ImportedRow[] = [];
  for (const row of rows) {
    const key = keyOf(row.date, row.amount, row.description, account);
    const copy = (seen.get(key) ?? 0) + 1;
    seen.set(key, copy);
    if (copy > (held.get(key) ?? 0)) toAdd.push(row);
  }
  return { toAdd, skipped: rows.length - toAdd.length };
};

/** The Transactions an import appends, in file order. */
export const importedTransactions = (rows: readonly ImportedRow[], account: string, createdAt: IsoDate, newId: () => string): Transaction[] =>
  rows.map((row) => ({ id: newId(), date: row.date, amount: row.amount, description: row.description, account, createdAt, origin: `import` }));
