// P11-1 slice 1 — the Ledger (`ledger.json`): the append-only store of Transactions, and the one
// door `unknown` comes through to become one. CONTEXT.md §Spending history owns the vocabulary.
//
// **APPEND-ONLY, NOT CHRONOLOGICAL.** A Transaction once in the Ledger is never edited and never
// removed; a correction is a NEW Transaction that `reverses` the original. Order in the file is the
// order things were RECORDED, not the order they happened: a Transaction dated before the last one
// is legal, because a back-dated import is the ordinary case (a statement for March arrives after a
// cash purchase in April was entered by hand).
//
// **A Category is NOT a field on a Transaction. It is a separate appended `Categorisation`.** A
// Transaction is an observed fact — the bank said this amount left this account on this day.
// Its Category is a judgement about that fact, and judgements change: a rule suggests one, the user
// accepts it, and later reclassifies (ADR-0004). Were the Category on the Transaction, every
// reclassification would be an edit in place — the one thing this file refuses — or a reversal and
// re-entry of the whole Transaction, which would make every correction of a label look like a
// correction of a spend. As its own record, categorising appends and edits nothing, and the history
// of how a Transaction came to be Committed/Groceries is kept rather than overwritten. The current
// Category of a Transaction is the LAST Categorisation naming it (`categoryOf`).
//
// **Sign convention: `amount` is signed Cents, money OUT of the Household is NEGATIVE** (a spend),
// money IN is positive (a refund). It is how bank statements write it, so an import does not flip
// signs, and a reversal is exactly the negation of what it reverses.
//
// **A saved CSV column mapping is a third kind of record, `ImportMapping` (P11-2, user ruling
// 2026-09-28).** It is kept here rather than in a file of its own because the ruling put it in
// `ledger.json`, and it is append-only like everything else: a changed mapping is a NEW record with
// the same format key, and the last one wins (`savedMappingFor`). A mapping is keyed either by the
// file's header row — the column names, order-independent — or, for a bank that exports no header
// (CommBank), by the number of columns plus a name the user gives the format; its columns are then
// called "Column 1", "Column 2" … (`headerlessColumnName`), so both kinds refer to columns BY NAME
// and a mapping never depends on where a column sits. The key `importMappings` is optional in the
// file and written only once a mapping exists, so every ledger.json written before P11-2 is still
// read, and still round-trips to its own bytes.
//
// **A categorisation rule is a fourth kind of record, `CategorisationRule` (P11-6, ADR-0004).** A
// rule is a case-insensitive piece of a raw description, optionally held to one account, and the
// Category it SUGGESTS. It never writes a Categorisation by itself: matching makes a suggestion batch
// the user accepts or rejects whole (`app/categorisationRules.ts`). Rules are keyed by their text
// (case ignored) and account, and the last record for a key wins — so a changed rule is a new record,
// and a retired one is a record saying `retired: true`. A Categorisation an accepted batch appended
// carries the `ruleId` of the exact rule record that suggested it; one without a `ruleId` was chosen
// by hand. That is the whole of the manual/rule distinction, and it needs no marker on the hand-made
// ones because every Categorisation written before P11-6 was made by hand. `categorisationRules`,
// like `importMappings`, is optional and written only once a rule exists.
//
// This module is `core/`: pure, no I/O, no clock. Nothing in the projection reads it (P11-10: a
// Derived Baseline is offered, never silently bound), and `app/ledgerStore.ts` is its only importer.
import { assertIsoDate } from './household.js'; // `.js` is correct in a `.ts` file — see tsconfig.json
import type { Cents } from './money.js';
import type { IsoDate } from '../data/assumptions/types.js';

/** The version of `ledger.json` this build reads. A bare integer, like `PLAN_FILE_VERSION`. */
export const LEDGER_FILE_VERSION = 1;

/**
 * CONTEXT.md §Category: the fixed top level. Subcategories beneath are user-defined strings.
 * **`Other` marks NOT spending** (P11 slice 5, user ruling 2026-09-28): transfers between the
 * Household's own accounts, card repayments, mortgage payments, income and investment purchases.
 * The Derived Baseline leaves it out and shows its total beside the offer. Appended LAST, so every
 * ledger written before it still reads and round-trips to its own bytes.
 */
export const CATEGORIES = ['Committed', 'Discretionary', 'One-off', 'Other'] as const;
export type Category = (typeof CATEGORIES)[number];

// A backtick, not a quote: `test/import-graph.test.mjs` reads the word import before a quote as an import.
export const TRANSACTION_ORIGINS = ['manual', `import`] as const;
export type TransactionOrigin = (typeof TRANSACTION_ORIGINS)[number];

/** P11-2: how a date column is written. DD/MM/YYYY first: the Australian banks' default, and the tie-break. */
export const DATE_FORMATS = ['DD/MM/YYYY', 'MM/DD/YYYY', 'YYYY-MM-DD', 'D MMM YYYY'] as const;
export type DateFormat = (typeof DATE_FORMATS)[number];

/** The name a column of a headerless file goes by: "Column 1" is the first. */
export const headerlessColumnName = (index: number): string => `Column ${index + 1}`;

/** CONTEXT.md §Transaction: one observed historical spend record. Never edited once recorded. */
export interface Transaction {
  readonly id: string;
  /** The day it happened, as the statement or the person says. */
  readonly date: IsoDate;
  /** Signed: money out of the Household is NEGATIVE, money in is positive. */
  readonly amount: Cents;
  /** The statement text exactly as it arrived, or as typed. Never cleaned: rules match on it. */
  readonly description: string;
  /** Which account or source it came from — a label, e.g. "Everyday account" or "Cash". */
  readonly account: string;
  /** The day it was recorded in the Ledger. Provenance only. */
  readonly createdAt: IsoDate;
  readonly origin: TransactionOrigin;
  /** The id of an EARLIER Transaction this one cancels. Its amount is the exact negation of that one's. */
  readonly reverses?: string;
}

/** The Category given to one Transaction. Appended, never edited: the last one naming a Transaction wins. */
export interface Categorisation {
  readonly id: string;
  readonly transactionId: string;
  readonly category: Category;
  readonly subcategory?: string;
  /** P11-6: the rule record whose accepted suggestion this is. Absent: the user chose it by hand. */
  readonly ruleId?: string;
  readonly createdAt: IsoDate;
}

/**
 * P11-6: a rule that SUGGESTS a Category for every Transaction whose raw description contains `match`
 * (case ignored), and — when `account` is set — that was recorded against that account. Exactly one of
 * `category` (with an optional `subcategory`) or `retired: true` is set. Appended, never edited: the
 * last record with the same `match` (case ignored) and `account` is the rule as it now stands.
 */
export interface CategorisationRule {
  readonly id: string;
  readonly match: string;
  readonly account?: string;
  readonly category?: Category;
  readonly subcategory?: string;
  readonly retired?: true;
  readonly createdAt: IsoDate;
}

/**
 * P11-2: how one bank's CSV format maps onto a Transaction. Exactly one of `header` (the file's
 * column names, as they stood in the file) or `formatName` + `columnCount` (a headerless file) is
 * set, and exactly one of `amountColumn` (one signed column) or `debitColumn` + `creditColumn`.
 * Every column is named, never numbered. Appended, never edited: the last one for a format wins.
 */
export interface ImportMapping {
  readonly id: string;
  readonly header?: readonly string[];
  readonly formatName?: string;
  readonly columnCount?: number;
  readonly dateColumn: string;
  readonly dateFormat: DateFormat;
  readonly descriptionColumn: string;
  readonly amountColumn?: string;
  readonly debitColumn?: string;
  readonly creditColumn?: string;
  /** The account label the rows are recorded against, offered again next time. */
  readonly account: string;
  readonly createdAt: IsoDate;
}

declare const LEDGER: unique symbol;

/**
 * **Nominal — the P3-41 witness.** The brand is a `private` member of a type-only class, and no
 * object literal can supply one, a spread of a real Ledger included: `{ ...ledger, transactions: [] }`
 * is TS2741. So a Ledger in hand came out of `parseLedger`, `emptyLedger` or `appended`, and every
 * one of those ran the checks below. Nothing exists at runtime; the value is a plain frozen record
 * and `JSON.stringify` of it is the file.
 */
declare class LedgerWitness { private readonly [LEDGER]: true }

export interface Ledger extends LedgerWitness {
  readonly version: typeof LEDGER_FILE_VERSION;
  readonly transactions: readonly Transaction[];
  readonly categorisations: readonly Categorisation[];
  /** Absent until the first mapping is saved, so a pre-P11-2 file round-trips to its own bytes. */
  readonly importMappings?: readonly ImportMapping[];
  /** Absent until the first rule is saved, so a pre-P11-6 file round-trips to its own bytes. */
  readonly categorisationRules?: readonly CategorisationRule[];
}

// --- The refusals -------------------------------------------------------------------------------

/** The file is not a ledger at all: not an object, a missing or unknown top-level key, a list that is not a list. */
export class LedgerFileShapeError extends RangeError {}

/** The file states a `version` other than `LEDGER_FILE_VERSION`. Refused by name, never coerced. */
export class LedgerFileVersionError extends RangeError {}

/** A Transaction is malformed: a missing, unknown or mistyped field, a bad date, an amount that is not whole cents. */
export class LedgerTransactionError extends RangeError {}

/** A Categorisation is malformed, or names no Transaction in the Ledger. */
export class LedgerCategorisationError extends RangeError {}

/** A saved CSV column mapping is malformed: both or neither format key, a column the format does not have. */
export class LedgerImportMappingError extends RangeError {}

/** A categorisation rule is malformed: empty text, both or neither of a category and `retired`. */
export class LedgerCategorisationRuleError extends RangeError {}

/** Two records of one kind — Transactions, Categorisations, ImportMappings or rules — share an id. */
export class LedgerDuplicateIdError extends RangeError {}

/** A `reverses` names no earlier Transaction, names one already reversed, or does not exactly cancel it. */
export class LedgerReversalError extends RangeError {}

/** The writer was handed a Ledger that edits, drops or reorders what was last loaded. */
export class LedgerNotAnExtensionError extends RangeError {}

type Refusal = new (message: string) => RangeError;

function fail(Kind: Refusal, path: string, message: string): never {
  throw new Kind(`ledger file: ${path} ${message}`);
}

const describe = (value: unknown): string =>
  typeof value === 'object' ? (value === null ? 'null' : Array.isArray(value) ? 'an array' : 'an object') : `${typeof value} ${JSON.stringify(value)}`;

const object = (Kind: Refusal, value: unknown, path: string, required: readonly string[], optional: readonly string[]): Record<string, unknown> => {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) fail(Kind, path, `is ${describe(value)}, and an object was required`);
  const record = value as Record<string, unknown>;
  const unknown = Object.keys(record).filter((key) => !required.includes(key) && !optional.includes(key));
  if (unknown.length > 0) fail(Kind, path, `carries ${unknown.map((key) => `"${key}"`).join(', ')}, which this build does not read — refused rather than dropped`);
  const missing = required.filter((key) => !Object.hasOwn(record, key));
  if (missing.length > 0) fail(Kind, path, `lacks ${missing.map((key) => `"${key}"`).join(', ')}`);
  return record;
};

const array = (Kind: Refusal, value: unknown, path: string): readonly unknown[] => {
  if (!Array.isArray(value)) fail(Kind, path, `is ${describe(value)}, and an array was required`);
  return value as readonly unknown[];
};

const string = (Kind: Refusal, value: unknown, path: string): string => {
  if (typeof value !== 'string') fail(Kind, path, `is ${describe(value)}, and a string was required`);
  return value as string;
};

const id = (Kind: Refusal, value: unknown, path: string): string => {
  const text = string(Kind, value, path);
  if (text === '') fail(Kind, path, 'is empty, and an id was required');
  return text;
};

const isoDate = (Kind: Refusal, value: unknown, path: string): IsoDate => {
  const text = string(Kind, value, path);
  try {
    return assertIsoDate(text);
  } catch {
    return fail(Kind, path, `is "${text}", which is not a zero-padded ISO date (YYYY-MM-DD)`);
  }
};

const cents = (Kind: Refusal, value: unknown, path: string): Cents => {
  if (typeof value !== 'number' || !Number.isSafeInteger(value)) fail(Kind, path, `is ${describe(value)}, and a whole number of cents was required`);
  return value as Cents;
};

const member = <T extends string>(Kind: Refusal, value: unknown, path: string, allowed: readonly T[]): T => {
  const text = string(Kind, value, path);
  if (!(allowed as readonly string[]).includes(text)) fail(Kind, path, `is "${text}", and one of ${allowed.map((option) => `"${option}"`).join(', ')} was required`);
  return text as T;
};

/** Absent stays absent: `{ reverses: undefined }` would not survive a round trip through the file. */
const optionally = <T>(key: string, value: T | undefined): Record<string, T> =>
  value === undefined ? {} : ({ [key]: value } as Record<string, T>);

// Key order here IS the order in the file, so a parsed Ledger serialises to the bytes it was read from.
const readTransaction = (value: unknown, path: string): Transaction => {
  const record = object(LedgerTransactionError, value, path, ['id', 'date', 'amount', 'description', 'account', 'createdAt', 'origin'], ['reverses']);
  return Object.freeze({
    id: id(LedgerTransactionError, record['id'], `${path}.id`),
    date: isoDate(LedgerTransactionError, record['date'], `${path}.date`),
    amount: cents(LedgerTransactionError, record['amount'], `${path}.amount`),
    description: string(LedgerTransactionError, record['description'], `${path}.description`),
    account: string(LedgerTransactionError, record['account'], `${path}.account`),
    createdAt: isoDate(LedgerTransactionError, record['createdAt'], `${path}.createdAt`),
    origin: member(LedgerTransactionError, record['origin'], `${path}.origin`, TRANSACTION_ORIGINS),
    ...optionally('reverses', Object.hasOwn(record, 'reverses') ? id(LedgerTransactionError, record['reverses'], `${path}.reverses`) : undefined),
  });
};

const readCategorisation = (value: unknown, path: string): Categorisation => {
  const record = object(LedgerCategorisationError, value, path, ['id', 'transactionId', 'category', 'createdAt'], ['subcategory', 'ruleId']);
  return Object.freeze({
    id: id(LedgerCategorisationError, record['id'], `${path}.id`),
    transactionId: id(LedgerCategorisationError, record['transactionId'], `${path}.transactionId`),
    category: member(LedgerCategorisationError, record['category'], `${path}.category`, CATEGORIES),
    ...optionally('subcategory', Object.hasOwn(record, 'subcategory') ? id(LedgerCategorisationError, record['subcategory'], `${path}.subcategory`) : undefined),
    ...optionally('ruleId', Object.hasOwn(record, 'ruleId') ? id(LedgerCategorisationError, record['ruleId'], `${path}.ruleId`) : undefined),
    createdAt: isoDate(LedgerCategorisationError, record['createdAt'], `${path}.createdAt`),
  });
};

const readCategorisationRule = (value: unknown, path: string): CategorisationRule => {
  const Kind = LedgerCategorisationRuleError;
  const record = object(Kind, value, path, ['id', 'match', 'createdAt'], ['account', 'category', 'subcategory', 'retired']);
  const has = (key: string): boolean => Object.hasOwn(record, key);
  const match = string(Kind, record['match'], `${path}.match`);
  if (match.trim() === '') fail(Kind, `${path}.match`, 'is blank, and a rule matching every description would categorise everything');
  if (has('category') === has('retired')) fail(Kind, path, 'must carry either "category" or "retired", and exactly one of the two');
  if (has('retired') && record['retired'] !== true) fail(Kind, `${path}.retired`, `is ${describe(record['retired'])}, and only true is written`);
  if (has('subcategory') && !has('category')) fail(Kind, `${path}.subcategory`, 'is set on a retirement, which suggests no category');
  return Object.freeze({
    id: id(Kind, record['id'], `${path}.id`),
    match,
    ...optionally('account', has('account') ? id(Kind, record['account'], `${path}.account`) : undefined),
    ...optionally('category', has('category') ? member(Kind, record['category'], `${path}.category`, CATEGORIES) : undefined),
    ...optionally('subcategory', has('subcategory') ? id(Kind, record['subcategory'], `${path}.subcategory`) : undefined),
    ...optionally('retired', has('retired') ? (true as const) : undefined),
    createdAt: isoDate(Kind, record['createdAt'], `${path}.createdAt`),
  });
};

const readImportMapping = (value: unknown, path: string): ImportMapping => {
  const Kind = LedgerImportMappingError;
  const record = object(Kind, value, path,
    ['id', 'dateColumn', 'dateFormat', 'descriptionColumn', 'account', 'createdAt'],
    ['header', 'formatName', 'columnCount', 'amountColumn', 'debitColumn', 'creditColumn']);
  const has = (key: string): boolean => Object.hasOwn(record, key);
  let columns: readonly string[];
  let format: Record<string, unknown>;
  if (has('header') === (has('formatName') || has('columnCount'))) {
    fail(Kind, path, 'must carry either "header" or "formatName" with "columnCount", and exactly one of the two');
  }
  if (has('header')) {
    const header = array(Kind, record['header'], `${path}.header`).map((name, index) => string(Kind, name, `${path}.header[${index}]`));
    if (header.length === 0) fail(Kind, `${path}.header`, 'is empty, and a header names at least one column');
    const repeated = header.find((name, index) => header.indexOf(name) !== index);
    if (repeated !== undefined) fail(Kind, `${path}.header`, `names "${repeated}" twice, so its columns cannot be told apart by name`);
    columns = header;
    format = { header: Object.freeze(header) };
  } else {
    const formatName = id(Kind, record['formatName'], `${path}.formatName`);
    const count = record['columnCount'];
    if (typeof count !== 'number' || !Number.isSafeInteger(count) || count < 1) fail(Kind, `${path}.columnCount`, `is ${describe(count)}, and a whole number of columns, at least 1, was required`);
    columns = Array.from({ length: count as number }, (_, index) => headerlessColumnName(index));
    format = { formatName, columnCount: count };
  }
  const column = (key: string): string => {
    const name = string(Kind, record[key], `${path}.${key}`);
    if (!columns.includes(name)) fail(Kind, `${path}.${key}`, `is "${name}", which is not one of this format's columns`);
    return name;
  };
  if (has('amountColumn') === (has('debitColumn') || has('creditColumn'))) {
    fail(Kind, path, 'must carry either "amountColumn" or "debitColumn" with "creditColumn", and exactly one of the two');
  }
  if (has('debitColumn') !== has('creditColumn')) fail(Kind, path, 'carries one of "debitColumn" and "creditColumn" without the other');
  const amount = has('amountColumn')
    ? { amountColumn: column('amountColumn') }
    : { debitColumn: column('debitColumn'), creditColumn: column('creditColumn') };
  if ('debitColumn' in amount && amount.debitColumn === amount.creditColumn) fail(Kind, `${path}.creditColumn`, 'is the debit column too');
  return Object.freeze({
    id: id(Kind, record['id'], `${path}.id`),
    ...format,
    dateColumn: column('dateColumn'),
    dateFormat: member(Kind, record['dateFormat'], `${path}.dateFormat`, DATE_FORMATS),
    descriptionColumn: column('descriptionColumn'),
    ...amount,
    account: string(Kind, record['account'], `${path}.account`),
    createdAt: isoDate(Kind, record['createdAt'], `${path}.createdAt`),
  });
};

/**
 * The relations between records, checked in file order. A `reverses` must name a Transaction
 * EARLIER in the list — which also refuses one naming itself or a later one — that nothing has
 * reversed yet, and must cancel it to the cent. A Categorisation must name a Transaction anywhere
 * in the Ledger, and a `ruleId` must name a rule record that suggests a category (not a retirement).
 */
const checked = (
  transactions: readonly Transaction[],
  categorisations: readonly Categorisation[],
  importMappings: readonly ImportMapping[],
  rules: readonly CategorisationRule[],
): Ledger => {
  const ruleIds = new Map<string, CategorisationRule>();
  rules.forEach((rule, index) => {
    if (ruleIds.has(rule.id)) fail(LedgerDuplicateIdError, `categorisationRules[${index}].id`, `is "${rule.id}", which an earlier rule already has`);
    ruleIds.set(rule.id, rule);
  });
  const seen = new Map<string, Transaction>();
  const reversed = new Set<string>();
  transactions.forEach((transaction, index) => {
    const path = `transactions[${index}]`;
    if (seen.has(transaction.id)) fail(LedgerDuplicateIdError, `${path}.id`, `is "${transaction.id}", which an earlier Transaction already has`);
    if (transaction.reverses !== undefined) {
      const original = seen.get(transaction.reverses);
      if (original === undefined) fail(LedgerReversalError, `${path}.reverses`, `is "${transaction.reverses}", which names no earlier Transaction`);
      if (reversed.has(original.id)) fail(LedgerReversalError, `${path}.reverses`, `is "${original.id}", which an earlier Transaction has already reversed`);
      if (transaction.amount !== -original.amount) {
        fail(LedgerReversalError, `${path}.amount`, `is ${transaction.amount}, and a reversal of "${original.id}" must be exactly ${-original.amount}`);
      }
      reversed.add(original.id);
    }
    seen.set(transaction.id, transaction);
  });
  const categorisationIds = new Set<string>();
  categorisations.forEach((categorisation, index) => {
    const path = `categorisations[${index}]`;
    if (categorisationIds.has(categorisation.id)) fail(LedgerDuplicateIdError, `${path}.id`, `is "${categorisation.id}", which an earlier Categorisation already has`);
    if (!seen.has(categorisation.transactionId)) {
      fail(LedgerCategorisationError, `${path}.transactionId`, `is "${categorisation.transactionId}", which names no Transaction in the Ledger`);
    }
    if (categorisation.ruleId !== undefined && ruleIds.get(categorisation.ruleId)?.category === undefined) {
      fail(LedgerCategorisationError, `${path}.ruleId`, `is "${categorisation.ruleId}", which names no rule in the Ledger that suggests a category`);
    }
    categorisationIds.add(categorisation.id);
  });
  const mappingIds = new Set<string>();
  importMappings.forEach((mapping, index) => {
    if (mappingIds.has(mapping.id)) fail(LedgerDuplicateIdError, `importMappings[${index}].id`, `is "${mapping.id}", which an earlier ImportMapping already has`);
    mappingIds.add(mapping.id);
  });
  return Object.freeze({
    version: LEDGER_FILE_VERSION,
    transactions: Object.freeze([...transactions]),
    categorisations: Object.freeze([...categorisations]),
    ...(importMappings.length === 0 ? {} : { importMappings: Object.freeze([...importMappings]) }),
    ...(rules.length === 0 ? {} : { categorisationRules: Object.freeze([...rules]) }),
  }) as Ledger;
};

export const emptyLedger = (): Ledger => checked([], [], [], []);

/**
 * **The door.** `null` — no file — is the empty Ledger; anything else must be a whole, valid
 * version-1 Ledger or it is refused by name.
 */
export const parseLedger = (value: unknown): Ledger => {
  if (value === null) return emptyLedger();
  const record = object(LedgerFileShapeError, value, 'the file', ['version', 'transactions', 'categorisations'], ['importMappings', 'categorisationRules']);
  if (record['version'] !== LEDGER_FILE_VERSION) {
    fail(LedgerFileVersionError, 'the file', `states version ${JSON.stringify(record['version']) ?? 'nothing'}, and this build reads version ${LEDGER_FILE_VERSION} only`);
  }
  const transactions = array(LedgerFileShapeError, record['transactions'], 'transactions').map((entry, index) => readTransaction(entry, `transactions[${index}]`));
  const categorisations = array(LedgerFileShapeError, record['categorisations'], 'categorisations').map((entry, index) => readCategorisation(entry, `categorisations[${index}]`));
  const importMappings = Object.hasOwn(record, 'importMappings')
    ? array(LedgerFileShapeError, record['importMappings'], 'importMappings').map((entry, index) => readImportMapping(entry, `importMappings[${index}]`))
    : [];
  const rules = Object.hasOwn(record, 'categorisationRules')
    ? array(LedgerFileShapeError, record['categorisationRules'], 'categorisationRules').map((entry, index) => readCategorisationRule(entry, `categorisationRules[${index}]`))
    : [];
  return checked(transactions, categorisations, importMappings, rules);
};

/**
 * **The one way a Ledger grows.** The new records go on the END and nothing before them is touched.
 * Each is read through the same field checks as the door, so a malformed one is refused by the same
 * name here as in a file.
 */
export const appended = (
  ledger: Ledger,
  transactions: readonly Transaction[],
  categorisations: readonly Categorisation[] = [],
  importMappings: readonly ImportMapping[] = [],
  rules: readonly CategorisationRule[] = [],
): Ledger => {
  const offset = ledger.transactions.length;
  const categorisationOffset = ledger.categorisations.length;
  const held = ledger.importMappings ?? [];
  const heldRules = ledger.categorisationRules ?? [];
  return checked(
    [...ledger.transactions, ...transactions.map((entry, index) => readTransaction(entry, `transactions[${offset + index}]`))],
    [...ledger.categorisations, ...categorisations.map((entry, index) => readCategorisation(entry, `categorisations[${categorisationOffset + index}]`))],
    [...held, ...importMappings.map((entry, index) => readImportMapping(entry, `importMappings[${held.length + index}]`))],
    [...heldRules, ...rules.map((entry, index) => readCategorisationRule(entry, `categorisationRules[${heldRules.length + index}]`))],
  );
};

/**
 * **The writer's guard.** `candidate` must hold every record of `lastLoaded`, byte for byte, in the
 * same order and at the same positions, with anything new after them. Anything else is an edit, a
 * removal or a reorder of recorded history.
 */
export const requireExtension = (lastLoaded: Ledger, candidate: Ledger): Ledger => {
  const lists = [
    ['transactions', 'Transaction', lastLoaded.transactions, candidate.transactions],
    ['categorisations', 'Categorisation', lastLoaded.categorisations, candidate.categorisations],
    ['importMappings', 'ImportMapping', lastLoaded.importMappings ?? [], candidate.importMappings ?? []],
    ['categorisationRules', 'rule', lastLoaded.categorisationRules ?? [], candidate.categorisationRules ?? []],
  ] as const;
  for (const [name, noun, before, after] of lists) {
    if (after.length < before.length) {
      fail(LedgerNotAnExtensionError, name, `holds ${after.length} records where the Ledger last loaded held ${before.length}: a recorded ${noun} is never removed`);
    }
    before.forEach((record, index) => {
      if (JSON.stringify(after[index]) !== JSON.stringify(record)) {
        fail(LedgerNotAnExtensionError, `${name}[${index}]`, 'differs from the Ledger last loaded: a recorded entry is never edited or moved, and a correction is a new record appended after it');
      }
    });
  }
  return candidate;
};

/** The Category a Transaction currently has: the last Categorisation naming it, or none. */
export const categoryOf = (ledger: Ledger, transactionId: string): Categorisation | undefined =>
  ledger.categorisations.filter((categorisation) => categorisation.transactionId === transactionId).at(-1);
