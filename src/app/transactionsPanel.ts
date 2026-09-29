// P11-3 / P11-1 slice 2 — the Transactions panel: manual entry into the Ledger (`ledger.json`), one
// Transaction at a time, and the list of what is recorded.
//
// **APPEND, NEVER EDIT, NEVER DELETE.** Three things can be done here and each APPENDS a record
// through `appendToLedger`, whose writer refuses anything that is not the Ledger last loaded plus
// records after it (`ledgerStore.ts`):
//
//   * **Add** — one Transaction, from a date, an amount in dollars with a money-out / money-in
//     choice (the sign is chosen, never typed), a description and an account label;
//   * **Reverse** — after a confirm, a NEW Transaction that is the exact negation of the original,
//     dated the same day so the pair nets to nothing in any window. A reversed Transaction, and a
//     reversal itself, offer no Reverse button; a stale click is refused and writes nothing;
//   * **Category** — a NEW Categorisation (Committed / Discretionary / One-off / Other, optional
//     subcategory). The last one naming a Transaction is the one shown (`categoryOf`).
//
//   * **Import a bank CSV file** (P11-2) — read in the browser, never uploaded anywhere but this
//     app's own `ledger.json`. A file whose header matches a saved mapping (in any column order) is
//     read with it and asks nothing about columns; an unknown one asks once, and the mapping is
//     appended to the Ledger with the rows. Rows already imported are skipped by multiset, every
//     row that cannot be read is listed with its line and reason, and nothing is appended until the
//     Import button is pressed (`csvImport.ts` holds the rules).
//
//   * **Rules that suggest** (P11-6, ADR-0004) — a rule is a piece of the raw description (case
//     ignored), optionally one account, and a Category it suggests. Saving, changing or retiring one
//     APPENDS a rule record; it categorises nothing. What rules match is shown as one card per rule,
//     reviewed WHOLE (user ruling 2026-09-28): **Accept all** appends one Categorisation per
//     Transaction in the batch, each carrying the rule's id; **Reject** writes nothing. An import
//     only OFFERS the batches its rows fall into. A Transaction categorised by hand is in no batch
//     (`categorisationRules.ts` holds the rules of matching).
//   * **Subcategories** (P11-5) are free text under each Category, offered back from those already
//     used (a `datalist` per Category); there is no separate list of them to keep.
//
//   * **Work out my spending from transactions** (P11-7..P11-11, slice 5). The ONLY trigger of the
//     Derived Baseline (user ruling 2026-09-28): never on load, never after an import, and any write
//     to the Ledger clears an offer on screen, so a figure shown is always one the user asked for
//     from the Ledger as it now stands. **Use this as my spending from today** appends ONE
//     household `SPEND_CHANGE` dated `asAtDate` to the active Scenario through the page's ordinary
//     save (`planWithEntry` → `parsePlan` → `savePlan`); later-dated ones stand. Cancel writes
//     nothing. The rules of the figure are `derivedBaseline.ts`'s.
//
// **A rejected batch is set aside for this page only.** Reject writes nothing, so nothing on disk can
// remember it: the same batch is not shown again until the page is reloaded or its members change
// (an import brings a new match, or one is categorised by hand). To stop a rule suggesting for good,
// retire it. Chosen over a stored "rejected" record because Reject then stays a pure no-write.
//
// **The list's filters are display only** (user request 2026-09-28): category (the CURRENT one),
// description, account and an inclusive date range narrow what the list shows. They write nothing,
// are held in memory only (a reload clears them), and survive every redraw of the list.
//
// There is no edit and no delete control anywhere in this panel, and no form is ever pre-filled
// from a recorded Transaction.
//
// **An unreadable Ledger switches the panel off and is never written.** The load refusal is shown
// in the panel in plain words, no form is built, and `startAgainQuestion` offers nothing — so not
// even Start again can overwrite a file this build could not read. The rest of the page carries on.
//
// Nothing in the projection reads the Ledger (P11-10); this panel draws no forecast figure.
import { CATEGORIES, DATE_FORMATS, categoryOf } from '../core/ledger.js'; // `.js` is correct in a `.ts` file — see tsconfig.json
import type { Categorisation, CategorisationRule, Category, DateFormat, ImportMapping, Ledger, Transaction } from '../core/ledger.js';
import type { Cents } from '../core/money.js';
import type { IsoDate } from '../data/assumptions/types.js';
import { appendToLedger, loadLedger, replaceWithEmptyLedger } from './ledgerStore.js';
import type { LedgerTransport } from './ledgerStore.js';
import { dollarsToCents, planWithEntry, spendChangeEntry } from './planEdits.js';
import type { PlanFile } from '../core/parsePlan.js';
import { dateInWords, deriveBaseline } from './derivedBaseline.js';
import type { BaselineLine, BaselineOffer, DerivedBaseline } from './derivedBaseline.js';
import { formatDollars } from './displayMoney.js';
import { CsvSyntaxError, parseCsv } from './csv.js';
import type { CsvRecord } from './csv.js';
import {
  detectDateFormat,
  headerNames,
  headerlessColumns,
  importedTransactions,
  looksLikeData,
  notYetImported,
  parseAmount,
  parseDate,
  readRows,
  sameMapping,
  savedHeaderlessFormats,
  savedMappingFor,
} from './csvImport.js';
import type { MappingDraft } from './csvImport.js';
import { liveRules, sameRuleKey, subcategoriesInUse, suggestionBatches } from './categorisationRules.js';
import type { SuggestionBatch } from './categorisationRules.js';
import { button, input, label, paragraph } from './settingsPanel.js';
import type { StartAgainQuestion } from './settingsPanel.js';

export interface TransactionsPanelHost {
  readonly transport: LedgerTransport;
  /** Today, as an ISO date: the day a record is recorded (`createdAt`). */
  readonly today: () => IsoDate;
  readonly newId: () => string;
  /** The plan on disk, and the page's one save — read only when the Derived Baseline is asked for or accepted. */
  readonly currentPlan: () => PlanFile;
  readonly save: (candidate: unknown) => Promise<void>;
}

export interface TransactionsPanel {
  /** Start again's question about this Ledger, or `undefined` when the Ledger did not load. */
  readonly startAgainQuestion: () => StartAgainQuestion | undefined;
}

export const DIRECTION_CHOICES = [
  { value: 'out', label: 'Money out (a spend)' },
  { value: 'in', label: 'Money in (a refund)' },
] as const;

export const TRANSACTION_LABELS = {
  date: 'Date it happened ',
  direction: 'Which way ',
  amount: 'Amount, in dollars ',
  description: 'Description ',
  account: 'Account desc. ',
  add: 'Add this transaction',
  reverse: 'Reverse…',
  reverseConfirm: 'Yes — reverse it',
  reverseCancel: 'Cancel — leave it as it is',
  category: 'Category ',
  subcategory: 'Subcat. (opt.) ',
  setCategory: 'Save category',
} as const;

/** The filters over the Transactions list. Display only: they write nothing and reset on reload. */
export const FILTER_LABELS = {
  category: 'Category ',
  description: 'Description contains ',
  account: 'Account ',
  from: 'From ',
  to: 'To ',
  clear: 'Clear filters',
} as const;

/** The Category filter's choices: `''` is All, `'none'` is Not categorised. */
export const FILTER_CATEGORIES = [
  { value: '', label: 'All' },
  ...CATEGORIES.map((category) => ({ value: category, label: category })),
  { value: 'none', label: 'Not categorised' },
] as const;

/** What the list is filtered by. An empty string is no filter; `account` is `undefined` for All. */
export interface TransactionFilter {
  category: string;
  description: string;
  account: string | undefined;
  from: string;
  to: string;
}

export const noFilter = (): TransactionFilter => ({ category: '', description: '', account: undefined, from: '', to: '' });

/** The Transactions a filter keeps, in Ledger order. Both dates are inclusive; the category is the CURRENT one. */
export const filteredTransactions = (ledger: Ledger, filter: TransactionFilter): Transaction[] => {
  const words = filter.description.trim().toLowerCase();
  return ledger.transactions.filter((transaction) => {
    if (filter.category !== '') {
      const category = categoryOf(ledger, transaction.id)?.category ?? 'none';
      if (category !== filter.category) return false;
    }
    if (words !== '' && !transaction.description.toLowerCase().includes(words)) return false;
    if (filter.account !== undefined && transaction.account !== filter.account) return false;
    if (filter.from !== '' && transaction.date < filter.from) return false;
    if (filter.to !== '' && transaction.date > filter.to) return false;
    return true;
  });
};

/** The line under the filters: how many are shown, and what they add up to each way in whole dollars. */
export const filterSummary = (shown: readonly Transaction[], total: number): string => {
  const out = shown.reduce((sum, each) => (each.amount < 0 ? sum - each.amount : sum), 0);
  const into = shown.reduce((sum, each) => (each.amount > 0 ? sum + each.amount : sum), 0);
  return `Showing ${shown.length} of ${total} transactions. Total shown: ${formatDollars(out)} out, ${formatDollars(into)} in.`;
};

export const IMPORT_LABELS = {
  file: 'Import a bank CSV file ',
  hasHeader: 'The first row holds column names ',
  formatName: 'A name for this bank format, e.g. CommBank everyday ',
  dateColumn: 'Date column ',
  dateFormat: 'Dates are written as ',
  descriptionColumn: 'Description column ',
  amountForm: 'Amounts are in ',
  amountColumn: 'Amount column ',
  debitColumn: 'Debit (money out) column ',
  creditColumn: 'Credit (money in) column ',
  account: 'Record these against the account ',
  changeMapping: 'Change the mapping',
  newFormat: 'Map it as a new format',
  cancel: 'Cancel — import nothing',
} as const;

export const RULE_LABELS = {
  match: 'Description contains ',
  account: 'Only for the account (leave empty for any) ',
  category: 'Suggest the category ',
  subcategory: 'Subcategory (optional) ',
  save: 'Save rule',
  retire: 'Retire',
  accept: 'Accept all',
  reject: 'Reject',
} as const;

const suggested = (category: Category, subcategory: string | undefined): string => `${category}${subcategory === undefined ? '' : ` / ${subcategory}`}`;

const ruleInWords = (rule: Pick<CategorisationRule, 'match' | 'account'>): string => `"${rule.match}"${rule.account === undefined ? '' : ` in ${rule.account}`}`;

/** The card's heading: "23 transactions match "WOOLWORTHS" → Committed / Groceries". */
export const batchHeading = (batch: SuggestionBatch): string =>
  `${batch.transactions.length} ${batch.transactions.length === 1 ? 'transaction matches' : 'transactions match'} ${ruleInWords(batch.rule)} → ${suggested(batch.rule.category, batch.rule.subcategory)}`;

/** Where two rules match one Transaction, the card says which rule got it. */
export const batchConflicts = (batch: SuggestionBatch): string[] => [
  ...batch.tookFrom.map(({ rule, count }) =>
    `${count} of these also ${count === 1 ? 'matches' : 'match'} your older rule ${ruleInWords(rule)}; where two rules match, the one saved most recently makes the suggestion.`),
  ...batch.gaveUp.map(({ rule, count }) =>
    `${count} more ${count === 1 ? 'matches' : 'match'} this rule but ${count === 1 ? 'is' : 'are'} in the batch of your newer rule ${ruleInWords(rule)} instead, and not in this one.`),
];

/** The same batch: the same rule record over the same Transactions. */
const membership = (batch: SuggestionBatch): string => JSON.stringify([batch.rule.id, batch.transactions.map((each) => each.id)]);

const subcategoryList = (category: string): string => `subcategories-${category}`;

export const AMOUNT_FORMS = [
  { value: 'signed', label: 'One column, money out negative' },
  { value: 'debitCredit', label: 'Separate debit and credit columns' },
] as const;

/** The import button's words: plain when every row read, "the N good rows" when some did not. */
export const importButtonLabel = (good: number, bad: number): string =>
  bad === 0 ? `Import ${good} ${good === 1 ? 'row' : 'rows'}` : `Import the ${good} good ${good === 1 ? 'row' : 'rows'}`;

export const importOutcome = (added: number, skipped: number): string => `${added} added, ${skipped} skipped as already imported.`;

export const BASELINE_LABELS = {
  workOut: 'Work out my spending from transactions',
  accept: 'Use this as my spending from today',
  cancel: 'Cancel — keep my spending as it is',
  show: 'Show which transactions',
} as const;

/** The picker's words for a Category: Other says what it does to the spending figure. */
export const categoryLabel = (category: Category): string =>
  category === 'Other' ? 'Other (not spending: left out of the spending figure)' : category;

const lineInWords = (line: BaselineLine): string =>
  `${formatDollars(line.total)} (${line.count} ${line.count === 1 ? 'transaction' : 'transactions'})`;

/** The offer's sentences, in the order shown. */
export const baselineSentences = (offer: BaselineOffer, cpi: number): string[] => [
  `From ${dateInWords(offer.window.from)} to ${dateInWords(offer.window.to)}${offer.window.days < 365 ? ` (${offer.window.days} days, scaled to a year)` : ''}, your household spent about ${formatDollars(offer.annualSpend)} a year, in today's money.`,
  `Committed: ${lineInWords(offer.committed)}. Discretionary: ${lineInWords(offer.discretionary)}.`,
  ...(offer.uncategorised.count === 0 ? [] : [`Not categorised, money out: ${lineInWords(offer.uncategorised)} — counted in, so that no spend is left out. Categorise them to check.`]),
  `One-off: ${lineInWords(offer.oneOff)} — not included. Add a one-off expense to your plan for any you expect again.`,
  // Both directions (user-reported 2026-09-28: five transfers IN marked Other read as "$0 (0 transactions)").
  offer.other.count + offer.otherIn.count === 0
    ? 'Other (not spending): none.'
    : `Other (not spending): ${[
      ...(offer.other.count === 0 ? [] : [`${lineInWords(offer.other)} out`]),
      ...(offer.otherIn.count === 0 ? [] : [`${lineInWords(offer.otherIn)} in`]),
    ].join(' and ')} — not included.${offer.other.count === 0 ? '' : ' If any money out here was a real purchase, categorise it again.'}`,
  ...(offer.uncategorisedIn.count === 0 ? [] : [`Not categorised, money in: ${lineInWords(offer.uncategorisedIn)} — not taken off your spending. Categorise a refund to have it counted.`]),
  ...(offer.window.days >= 365 ? [] : [`Your transactions cover only ${offer.window.days} days, so the figure is those days scaled up to a full year. The lines below are what was actually recorded.`]),
  `Each month is raised to today's money at your plan's inflation assumption of ${(cpi * 100).toFixed(1)}% a year.`,
];

export const START_AGAIN_LEDGER_QUESTION = 'Also delete my transaction history (and the saved bank formats and rules)? ';

/** The summary heading, which carries the size of what the collapsed panel hides. */
export const transactionsSummary = (ledger: Ledger | undefined): string =>
  ledger === undefined
    ? 'Transactions (could not be read)'
    : `Transactions (${ledger.transactions.length} recorded)`;

/** An amount in whole dollars, with its direction as words rather than a sign. */
export const amountInWords = (amount: Cents): string => `${formatDollars(Math.abs(amount))} ${amount < 0 ? 'out' : 'in'}`;

export const categoryInWords = (categorisation: Categorisation | undefined): string =>
  categorisation === undefined
    ? 'Not categorised'
    : `${categorisation.category}${categorisation.subcategory === undefined ? '' : ` — ${categorisation.subcategory}`}`;

const reason = (error: unknown): string => (error instanceof Error ? error.message : String(error));

const select = (name: string, options: readonly { readonly value: string; readonly label: string }[], value: string): HTMLSelectElement => {
  const element = document.createElement('select');
  element.name = name;
  for (const option of options) {
    const choice = document.createElement('option');
    choice.value = option.value;
    choice.textContent = option.label;
    element.append(choice);
  }
  element.value = value;
  return element;
};

const cell = (text: string): HTMLTableCellElement => {
  const element = document.createElement('td');
  element.textContent = text;
  return element;
};

// --- The import's working state -----------------------------------------------------------------

type AmountForm = (typeof AMOUNT_FORMS)[number]['value'];

/** The mapping as the controls hold it, before it is checked. Mutable: the controls write into it. */
interface Working {
  hasHeader: boolean;
  formatName: string;
  dateColumn: string;
  dateFormat: DateFormat;
  descriptionColumn: string;
  amountForm: AmountForm;
  amountColumn: string;
  debitColumn: string;
  creditColumn: string;
  account: string;
}

interface ImportWork {
  readonly fileName: string;
  readonly records: readonly CsvRecord[];
  readonly working: Working;
  /** The saved mapping this file is read with, while the user has not asked to change it. */
  readonly reused: ImportMapping | undefined;
  /** Saved headerless formats of this file's width, when there is more than one to choose from. */
  readonly choices: readonly ImportMapping[];
  readonly editing?: boolean;
}

const columnsOf = (records: readonly CsvRecord[], hasHeader: boolean): string[] =>
  hasHeader ? headerNames(records[0]!) : headerlessColumns(records[0]!.fields.length);

const dataRecords = (records: readonly CsvRecord[], hasHeader: boolean): readonly CsvRecord[] => (hasHeader ? records.slice(1) : records);

const columnValues = (records: readonly CsvRecord[], hasHeader: boolean, columns: readonly string[], column: string): string[] =>
  dataRecords(records, hasHeader).map((record) => record.fields[columns.indexOf(column)] ?? '');

const fromMapping = (mapping: ImportMapping): Working => ({
  hasHeader: mapping.header !== undefined,
  formatName: mapping.formatName ?? '',
  dateColumn: mapping.dateColumn,
  dateFormat: mapping.dateFormat,
  descriptionColumn: mapping.descriptionColumn,
  amountForm: mapping.amountColumn !== undefined ? 'signed' : 'debitCredit',
  amountColumn: mapping.amountColumn ?? '',
  debitColumn: mapping.debitColumn ?? '',
  creditColumn: mapping.creditColumn ?? '',
  account: mapping.account,
});

/**
 * A first guess at a new format, for the user to correct: by column name when the file has them,
 * and by what the first row holds when it has not. A guess only fills the boxes; nothing is saved
 * until the rows are imported.
 */
const guessed = (records: readonly CsvRecord[], hasHeader: boolean): Working => {
  const columns = columnsOf(records, hasHeader);
  let dateColumn = '';
  let descriptionColumn = '';
  let amountColumn = '';
  let debitColumn = '';
  let creditColumn = '';
  if (hasHeader) {
    const named = (pattern: RegExp): string => columns.find((name) => pattern.test(name)) ?? '';
    dateColumn = named(/date/i);
    descriptionColumn = named(/desc|narrat|detail|particular|payee|memo/i);
    amountColumn = named(/amount/i);
    debitColumn = named(/debit|withdraw/i);
    creditColumn = named(/credit|deposit/i);
  } else {
    const fields = records[0]!.fields;
    const dateAt = fields.findIndex((field) => DATE_FORMATS.some((format) => parseDate(field, format) !== undefined));
    const amountAt = fields.findIndex((field, index) => index !== dateAt && parseAmount(field) !== undefined);
    const textAt = fields.findIndex((field, index) => index !== dateAt && index !== amountAt && field.trim() !== '');
    dateColumn = columns[dateAt] ?? '';
    amountColumn = columns[amountAt] ?? '';
    descriptionColumn = columns[textAt] ?? '';
  }
  const amountForm: AmountForm = amountColumn === '' && debitColumn !== '' && creditColumn !== '' ? 'debitCredit' : 'signed';
  return {
    hasHeader,
    formatName: '',
    dateColumn,
    dateFormat: dateColumn === '' ? DATE_FORMATS[0] : detectDateFormat(columnValues(records, hasHeader, columns, dateColumn)),
    descriptionColumn,
    amountForm,
    amountColumn,
    debitColumn,
    creditColumn,
    account: '',
  };
};

/** What stops the working mapping being used, in words. Empty when it can be. */
const problemsWith = (working: Working, columns: readonly string[]): string[] => {
  const problems: string[] = [];
  if (working.hasHeader) {
    const repeated = columns.find((name, index) => columns.indexOf(name) !== index);
    if (repeated !== undefined) {
      problems.push(`Two columns are both called "${repeated}", so they cannot be told apart by name. Untick "the first row holds column names" to map them by position instead.`);
      return problems;
    }
  } else if (working.formatName.trim() === '') {
    problems.push('This file has no column names. Give its format a name, so the mapping can be found again next time.');
  }
  const roles: [string, string][] = [['date', working.dateColumn], ['description', working.descriptionColumn]];
  if (working.amountForm === 'signed') roles.push(['amount', working.amountColumn]);
  else roles.push(['debit', working.debitColumn], ['credit', working.creditColumn]);
  for (const [role, column] of roles) {
    if (!columns.includes(column)) problems.push(`Choose which column holds the ${role}.`);
  }
  const chosen = roles.filter(([, column]) => columns.includes(column));
  for (const [index, [role, column]] of chosen.entries()) {
    const other = chosen.slice(0, index).find(([, earlier]) => earlier === column);
    if (other !== undefined) problems.push(`The ${other[0]} and the ${role} cannot both be the column "${column}".`);
  }
  if (working.account.trim() === '') problems.push('Type the account these rows came from, e.g. Everyday account. It is how a later import of the same rows is recognised.');
  return problems;
};

const toDraft = (working: Working, columns: readonly string[]): MappingDraft => ({
  ...(working.hasHeader ? { header: [...columns] } : { formatName: working.formatName.trim(), columnCount: columns.length }),
  dateColumn: working.dateColumn,
  dateFormat: working.dateFormat,
  descriptionColumn: working.descriptionColumn,
  ...(working.amountForm === 'signed' ? { amountColumn: working.amountColumn } : { debitColumn: working.debitColumn, creditColumn: working.creditColumn }),
  account: working.account.trim(),
});

/**
 * Load the Ledger through the door and put the panel on the page. Resolves once the load has
 * settled; a refusal is caught HERE and shown, never rethrown, so the page around it keeps working.
 */
export const mountTransactionsPanel = async (
  box: HTMLElement,
  summary: HTMLElement | null,
  host: TransactionsPanelHost,
): Promise<TransactionsPanel> => {
  /** The Ledger as it is on disk, or `undefined` when it could not be read — and then nothing writes. */
  let ledger: Ledger | undefined;
  let refusal = '';
  try {
    ledger = await loadLedger(host.transport);
  } catch (error) {
    refusal = reason(error);
  }

  const status = paragraph('transactions-status', '');
  const formBox = document.createElement('div');
  const listBox = document.createElement('div');
  const importBox = document.createElement('div');
  importBox.className = 'transaction-import';
  const suggestionsBox = document.createElement('div');
  suggestionsBox.className = 'transaction-suggestions';
  const ruleFormBox = document.createElement('div');
  const rulesBox = document.createElement('div');
  const listsBox = document.createElement('div');
  /** Batches the user rejected, by rule and members: set aside until the page reloads or the members change. */
  const rejected = new Set<string>();
  let armedReversal: string | undefined;
  /** The Derived Baseline on screen, and the plan facts it was worked out against; `undefined` until asked for. */
  let baseline: { readonly result: DerivedBaseline; readonly asAtDate: string; readonly cpi: number } | undefined;
  const baselineBox = document.createElement('div');
  baselineBox.className = 'derived-baseline';
  /** The file being imported, and the mapping as it stands; `undefined` when no import is under way. */
  let importing: ImportWork | undefined;

  // The list's filters are built ONCE, so a redraw never takes the cursor out of the text box, and
  // what they hold survives any redraw (an add, a reversal, a category saved). They write nothing.
  let filter = noFilter();
  const filterCategory = select('filterCategory', FILTER_CATEGORIES, '');
  const filterDescription = input('text', 'filterDescription', '');
  const filterAccount = select('filterAccount', [{ value: '', label: 'All' }], '');
  const filterFrom = input('date', 'filterFrom', '');
  const filterTo = input('date', 'filterTo', '');
  const filterLine = paragraph('transaction-filter-count', '');
  const tableBox = document.createElement('div');
  const readFilters = (): void => {
    filter = {
      category: filterCategory.value,
      description: filterDescription.value,
      // An account's option stores `a:` and its label, so a blank label is not mistaken for All.
      account: filterAccount.value === '' ? undefined : filterAccount.value.slice('a:'.length),
      from: filterFrom.value,
      to: filterTo.value,
    };
    if (ledger !== undefined) renderTable(ledger);
  };
  for (const control of [filterCategory, filterDescription, filterAccount, filterFrom, filterTo]) {
    control.addEventListener('input', readFilters);
    control.addEventListener('change', readFilters);
  }
  const filterBar = document.createElement('div');
  filterBar.className = 'transaction-filters';
  filterBar.append(
    label(FILTER_LABELS.category, filterCategory),
    label(FILTER_LABELS.description, filterDescription),
    label(FILTER_LABELS.account, filterAccount),
    label(FILTER_LABELS.from, filterFrom),
    label(FILTER_LABELS.to, filterTo),
    button(FILTER_LABELS.clear, 'Shows every transaction again. Nothing is written.', () => {
      filterCategory.value = '';
      filterDescription.value = '';
      filterAccount.value = '';
      filterFrom.value = '';
      filterTo.value = '';
      readFilters();
    }),
  );
  /** The Account filter offers the labels in the Ledger now, keeping the one chosen. */
  const refreshAccounts = (current: Ledger): void => {
    const chosen = filterAccount.value;
    const accounts = [...new Set(current.transactions.map((each) => each.account))].sort();
    const options = [{ value: '', label: 'All' }, ...accounts.map((account) => ({ value: `a:${account}`, label: account === '' ? '(no account)' : account }))];
    filterAccount.replaceChildren(...Array.from(select('', options, '').children));
    filterAccount.value = chosen;
  };

  const render = (): void => {
    if (summary) summary.textContent = transactionsSummary(ledger);
    if (ledger === undefined) {
      box.replaceChildren(
        paragraph(
          'transactions-refusal',
          'Your transaction history could not be read, so this section is switched off and nothing will be written to it.' +
            ' The file is left exactly as it is. What went wrong: ' + refusal,
        ),
      );
      return;
    }
    renderList(ledger);
  };

  /** Append, save, and redraw. On any refusal or failed write, `ledger` is left as what is on disk. */
  const commit = async (
    transactions: readonly Transaction[],
    categorisations: readonly Categorisation[],
    done: string,
    importMappings: readonly ImportMapping[] = [],
    rules: readonly CategorisationRule[] = [],
  ): Promise<boolean> => {
    if (ledger === undefined) return false;
    let landed = false;
    try {
      ledger = await appendToLedger(host.transport, ledger, transactions, categorisations, importMappings, rules);
      status.textContent = done;
      landed = true;
    } catch (error) {
      status.textContent = `Nothing was recorded. ${reason(error)}`;
    }
    armedReversal = undefined;
    // Any write to the Ledger withdraws a figure worked out from the Ledger before it.
    baseline = undefined;
    render();
    return landed;
  };

  const renderForm = (): void => {
    const date = input('date', 'transactionDate', '');
    const direction = select('transactionDirection', DIRECTION_CHOICES, 'out');
    const amount = input('text', 'transactionAmount', '');
    amount.inputMode = 'decimal';
    const description = input('text', 'transactionDescription', '');
    const account = input('text', 'transactionAccount', '');
    const form = document.createElement('form');
    form.className = 'transaction-form';
    form.append(
      label(TRANSACTION_LABELS.date, date),
      label(TRANSACTION_LABELS.direction, direction),
      label(TRANSACTION_LABELS.amount, amount),
      label(TRANSACTION_LABELS.description, description),
      label(TRANSACTION_LABELS.account, account),
      button(TRANSACTION_LABELS.add, 'Records this transaction. It cannot be edited or deleted afterwards; a mistake is corrected by reversing it.', () => {
        const cents = dollarsToCents(amount.value);
        if (date.value.trim() === '') {
          status.textContent = 'Nothing was recorded. Choose the date it happened.';
          return;
        }
        if (!Number.isSafeInteger(cents) || cents <= 0) {
          status.textContent =
            'Nothing was recorded. Type the amount as a figure in dollars, like 45 or 45.50, and choose money out or money in to say which way it went.';
          return;
        }
        return commit(
          [{
            id: host.newId(),
            date: date.value as IsoDate,
            amount: (direction.value === 'in' ? cents : -cents) as Cents,
            description: description.value,
            account: account.value,
            createdAt: host.today(),
            origin: 'manual',
          }],
          [],
          `Recorded: ${amountInWords((direction.value === 'in' ? cents : -cents) as Cents)} on ${date.value}.`,
        ).then((landed) => {
          // A recorded transaction clears the form; a refused one leaves what was typed to be fixed.
          if (landed) renderForm();
        });
      }),
    );
    formBox.replaceChildren(form);
  };

  const categoryControls = (transaction: Transaction): HTMLElement => {
    const chooser = select('transactionCategory', [{ value: '', label: 'Choose…' }, ...CATEGORIES.map((category) => ({ value: category, label: categoryLabel(category) }))], '');
    const subcategory = input('text', 'transactionSubcategory', '');
    offersSubcategories(chooser, subcategory);
    const wrap = document.createElement('span');
    wrap.className = 'category-controls';
    wrap.append(
      label(TRANSACTION_LABELS.category, chooser),
      label(TRANSACTION_LABELS.subcategory, subcategory),
      button(TRANSACTION_LABELS.setCategory, 'Records this category. The earlier one is kept in the history; the newest is the one shown.', () => {
        if (chooser.value === '') {
          status.textContent = 'Nothing was recorded. Choose Committed, Discretionary, One-off or Other first.';
          return;
        }
        const sub = subcategory.value.trim();
        return commit(
          [],
          [{
            id: host.newId(),
            transactionId: transaction.id,
            category: chooser.value as Category,
            ...(sub === '' ? {} : { subcategory: sub }),
            createdAt: host.today(),
          }],
          `Category saved for ${transaction.description || 'that transaction'}.`,
        );
      }),
    );
    return wrap;
  };

  /** P11-5: the subcategory box offers those already used under whichever Category is chosen. */
  const offersSubcategories = (chooser: HTMLSelectElement, subcategory: HTMLInputElement): void => {
    const follow = (): void => {
      subcategory.setAttribute('list', chooser.value === '' ? '' : subcategoryList(chooser.value));
    };
    chooser.addEventListener('change', follow);
    follow();
  };

  const renderSubcategoryLists = (current: Ledger): void => {
    const used = subcategoriesInUse(current);
    listsBox.replaceChildren(...CATEGORIES.map((category) => {
      const list = document.createElement('datalist');
      list.id = subcategoryList(category);
      for (const name of used[category]) {
        // A datalist suggestion IS the text it puts in the box, so it is shown as what it stores.
        const suggestion = document.createElement('option');
        suggestion.value = name;
        list.append(suggestion);
      }
      return list;
    }));
  };

  // --- Rules that suggest (P11-6) -----------------------------------------------------------------

  const renderRuleForm = (): void => {
    const match = input('text', 'ruleMatch', '');
    const account = input('text', 'ruleAccount', '');
    const chooser = select('ruleCategory', [{ value: '', label: 'Choose…' }, ...CATEGORIES.map((category) => ({ value: category, label: categoryLabel(category) }))], '');
    const subcategory = input('text', 'ruleSubcategory', '');
    offersSubcategories(chooser, subcategory);
    const form = document.createElement('div');
    form.className = 'rule-form';
    form.append(
      paragraph('caveat', 'A rule only suggests; you accept or reject each batch.'),
      label(RULE_LABELS.match, match),
      label(RULE_LABELS.account, account),
      label(RULE_LABELS.category, chooser),
      label(RULE_LABELS.subcategory, subcategory),
      button(RULE_LABELS.save, 'Saves the rule. It categorises nothing by itself.', () => {
        if (ledger === undefined) return;
        const words = match.value.trim();
        const accountLabel = account.value.trim();
        const sub = subcategory.value.trim();
        if (words === '') {
          status.textContent = 'Nothing was saved. Type the words the description contains, e.g. WOOLWORTHS.';
          return;
        }
        if (chooser.value === '') {
          status.textContent = 'Nothing was saved. Choose the category the rule suggests.';
          return;
        }
        const draft = {
          match: words,
          ...(accountLabel === '' ? {} : { account: accountLabel }),
          category: chooser.value as Category,
          ...(sub === '' ? {} : { subcategory: sub }),
        };
        const standing = liveRules(ledger).find((rule) => sameRuleKey(rule, draft));
        if (standing !== undefined && standing.match === draft.match && standing.category === draft.category && standing.subcategory === draft.subcategory) {
          status.textContent = 'That rule is already saved. Nothing was written.';
          return;
        }
        return commit([], [], `Rule saved: ${ruleInWords(draft)} suggests ${suggested(draft.category, draft.subcategory)}. Nothing is categorised until you accept.`, [], [
          { id: host.newId(), ...draft, createdAt: host.today() },
        ]).then((landed) => {
          if (landed) renderRuleForm();
        });
      }),
    );
    ruleFormBox.replaceChildren(form);
  };

  const renderRules = (current: Ledger): void => {
    const rules = liveRules(current);
    if (rules.length === 0) {
      rulesBox.replaceChildren();
      return;
    }
    const list = document.createElement('ul');
    list.className = 'rules';
    for (const rule of [...rules].reverse()) {
      const item = document.createElement('li');
      item.dataset['id'] = rule.id;
      item.append(
        `${ruleInWords(rule)} → ${suggested(rule.category, rule.subcategory)} `,
        button(RULE_LABELS.retire, 'Records that this rule is retired. What it categorised stays as it is.', () =>
          commit([], [], `Retired the rule ${ruleInWords(rule)}. It suggests nothing from now on; what it categorised stays as it is.`, [], [{
            id: host.newId(),
            match: rule.match,
            ...(rule.account === undefined ? {} : { account: rule.account }),
            retired: true,
            createdAt: host.today(),
          }])),
      );
      list.append(item);
    }
    rulesBox.replaceChildren(paragraph('rules-heading', 'Your rules, newest first:'), list);
  };

  const renderSuggestions = (current: Ledger): void => {
    const cards = suggestionBatches(current).filter((batch) => !rejected.has(membership(batch))).map((batch) => {
      const card = document.createElement('div');
      card.className = 'suggestion';
      card.dataset['rule'] = batch.rule.id;
      const table = document.createElement('table');
      for (const transaction of batch.transactions) {
        const line = document.createElement('tr');
        line.append(cell(transaction.date), cell(transaction.description), cell(amountInWords(transaction.amount)), cell(categoryInWords(categoryOf(current, transaction.id))));
        table.append(line);
      }
      card.append(
        paragraph('suggestion-heading', batchHeading(batch)),
        ...batchConflicts(batch).map((note) => paragraph('caveat', note)),
        table,
        button(RULE_LABELS.accept, 'Records this category for every transaction listed. Each can be recategorised by hand afterwards.', () => {
          // Checked against the Ledger ON DISK at the click: what is accepted is exactly what was shown.
          const now = ledger === undefined ? undefined : suggestionBatches(ledger).find((each) => each.rule.id === batch.rule.id);
          if (now === undefined || membership(now) !== membership(batch)) {
            status.textContent = 'Nothing was recorded. The transactions this rule matches have changed since it was shown; look at it again.';
            render();
            return;
          }
          const { rule } = now;
          return commit(
            [],
            now.transactions.map((transaction) => ({
              id: host.newId(),
              transactionId: transaction.id,
              category: rule.category,
              ...(rule.subcategory === undefined ? {} : { subcategory: rule.subcategory }),
              ruleId: rule.id,
              createdAt: host.today(),
            })),
            `Accepted: ${now.transactions.length} categorised as ${suggested(rule.category, rule.subcategory)} by the rule ${ruleInWords(rule)}.`,
          );
        }),
        button(RULE_LABELS.reject, 'Nothing is written. This batch is not shown again until the page is reloaded or what it matches changes.', () => {
          rejected.add(membership(batch));
          status.textContent = `Nothing was recorded. The suggestion from ${ruleInWords(batch.rule)} is set aside until the page is reloaded; retire the rule to stop it for good.`;
          render();
        }),
      );
      return card;
    });
    suggestionsBox.replaceChildren(...(cards.length === 0 ? [] : [paragraph('suggestions-heading', 'Suggested by your rules — nothing is categorised until you accept:'), ...cards]));
  };

  const reverseControls = (current: Ledger, transaction: Transaction, reversed: ReadonlySet<string>): HTMLElement | undefined => {
    if (transaction.reverses !== undefined || reversed.has(transaction.id)) return undefined;
    const wrap = document.createElement('span');
    if (armedReversal !== transaction.id) {
      wrap.append(button(TRANSACTION_LABELS.reverse, 'Asks first. Nothing is written by this button.', () => {
        armedReversal = transaction.id;
        render();
      }));
      return wrap;
    }
    wrap.append(
      paragraph(
        'caveat',
        `Reverse this? A new transaction of ${amountInWords(-transaction.amount as Cents)} is added that cancels it.` +
          ' Both stay in your history; nothing is deleted.',
      ),
      button(TRANSACTION_LABELS.reverseConfirm, 'Adds the reversing transaction now.', () => {
        // Checked against the Ledger ON DISK at the click, not the one this button was drawn from.
        const latest = ledger ?? current;
        if (latest.transactions.some((each) => each.reverses === transaction.id)) {
          status.textContent = 'Nothing was recorded. That transaction has already been reversed.';
          armedReversal = undefined;
          render();
          return;
        }
        return commit(
          [{
            id: host.newId(),
            date: transaction.date,
            amount: -transaction.amount as Cents,
            description: `Reversal of: ${transaction.description}`,
            account: transaction.account,
            createdAt: host.today(),
            origin: 'manual',
            reverses: transaction.id,
          }],
          [],
          `Reversed: ${transaction.description || 'that transaction'}.`,
        );
      }),
      button(TRANSACTION_LABELS.reverseCancel, 'Nothing is written.', () => {
        armedReversal = undefined;
        render();
      }),
    );
    return wrap;
  };

  const renderTable = (current: Ledger): void => {
    const reversed = new Set(current.transactions.flatMap((each) => (each.reverses === undefined ? [] : [each.reverses])));
    const byId = new Map(current.transactions.map((each) => [each.id, each] as const));
    const shown = filteredTransactions(current, filter);
    filterLine.textContent = filterSummary(shown, current.transactions.length);
    const table = document.createElement('table');
    table.className = 'transaction-list';
    const head = document.createElement('tr');
    for (const title of ['Date', 'Description', 'Amount', 'Category', '']) {
      const th = document.createElement('th');
      th.textContent = title;
      head.append(th);
    }
    table.append(head);
    // Newest APPENDED first — the order things were recorded, not the order they happened.
    for (const transaction of [...shown].reverse()) {
      const row = document.createElement('tr');
      row.className = 'transaction';
      row.dataset['id'] = transaction.id;
      const original = transaction.reverses === undefined ? undefined : byId.get(transaction.reverses);
      const note = original !== undefined ? ` (cancels the one of ${original.date})` : reversed.has(transaction.id) ? ' (reversed)' : '';
      const actions = document.createElement('td');
      const reverse = reverseControls(current, transaction, reversed);
      actions.append(categoryControls(transaction), ...(reverse ? [reverse] : []));
      row.append(
        cell(transaction.date),
        cell(`${transaction.description}${note}`),
        cell(amountInWords(transaction.amount)),
        cell(categoryInWords(categoryOf(current, transaction.id))),
        actions,
      );
      table.append(row);
    }
    tableBox.replaceChildren(table);
  };

  const renderList = (current: Ledger): void => {
    if (current.transactions.length === 0) {
      listBox.replaceChildren(paragraph('caveat', 'No transactions recorded yet.'));
    } else {
      refreshAccounts(current);
      renderTable(current);
      listBox.replaceChildren(filterBar, filterLine, tableBox);
    }
    renderImport(current);
    renderSuggestions(current);
    renderRules(current);
    renderSubcategoryLists(current);
    renderBaseline(current);
    box.replaceChildren(formBox, importBox, suggestionsBox, status, baselineBox, ruleFormBox, rulesBox, listBox, listsBox);
  };

  // --- The Derived Baseline (P11-7..P11-11) -------------------------------------------------------

  const workedOut = (current: Ledger): { result: DerivedBaseline; asAtDate: string; cpi: number } => {
    const { asAtDate, economicSeries } = host.currentPlan().settings;
    return { result: deriveBaseline(current, asAtDate, economicSeries.cpi), asAtDate, cpi: economicSeries.cpi };
  };

  const renderBaseline = (current: Ledger): void => {
    const workOut = button(BASELINE_LABELS.workOut, 'Works out a yearly spending figure from your most recent year of transactions (up to 365 days, ending on the latest one). Nothing is written.', () => {
      baseline = workedOut(current);
      status.textContent = '';
      render();
    });
    if (baseline === undefined) {
      baselineBox.replaceChildren(workOut);
      return;
    }
    const { result, cpi } = baseline;
    if (result.kind === 'none') {
      baselineBox.replaceChildren(workOut, paragraph('baseline-none', result.reason));
      return;
    }
    const shown = baseline;
    const byId = new Map(current.transactions.map((each) => [each.id, each] as const));
    const rules = new Map((current.categorisationRules ?? []).map((rule) => [rule.id, rule] as const));
    const table = document.createElement('table');
    for (const id of result.transactionIds) {
      const transaction = byId.get(id)!;
      const categorisation = categoryOf(current, id);
      const rule = categorisation?.ruleId === undefined ? undefined : rules.get(categorisation.ruleId);
      const how = categorisation === undefined ? '' : rule === undefined ? ' (by hand)' : ` (by the rule ${ruleInWords(rule)})`;
      const line = document.createElement('tr');
      line.dataset['id'] = id;
      line.append(cell(transaction.date), cell(transaction.description), cell(amountInWords(transaction.amount)), cell(`${categoryInWords(categorisation)}${how}`));
      table.append(line);
    }
    const disclosure = document.createElement('details');
    const disclosureSummary = document.createElement('summary');
    disclosureSummary.textContent = BASELINE_LABELS.show;
    disclosure.append(disclosureSummary, paragraph('caveat', `The ${result.transactionIds.length} transactions counted, from ${dateInWords(result.window.from)} to ${dateInWords(result.window.to)}:`), table);
    baselineBox.replaceChildren(
      workOut,
      ...baselineSentences(result, cpi).map((sentence, index) => paragraph(index === 0 ? 'baseline-figure' : 'caveat', sentence)),
      disclosure,
      button(BASELINE_LABELS.accept, 'Adds one spending change to the scenario you are looking at, dated your plan\'s as-at date. Later spending changes stay as they are.', () => {
        // Checked against the Ledger and the plan AT THE CLICK: what is saved is exactly what was shown.
        const now = ledger === undefined ? undefined : workedOut(ledger);
        if (now === undefined || JSON.stringify(now) !== JSON.stringify(shown)) {
          baseline = undefined;
          status.textContent = 'Nothing was saved. Your transactions or your plan have changed since the figure was worked out; work it out again.';
          render();
          return;
        }
        const plan = host.currentPlan();
        const entry = spendChangeEntry({
          date: now.asAtDate,
          owner: 'household',
          note: `Worked out from ${result.transactionIds.length} transactions, ${dateInWords(result.window.from)} to ${dateInWords(result.window.to)}.`,
          annualSpend: String(result.annualSpend / 100),
        }, host.newId(), host.today());
        return host.save(planWithEntry(plan, entry)).then(() => {
          if (host.currentPlan() === plan) {
            status.textContent = 'Nothing was saved. The message at the top of the page says why.';
          } else {
            baseline = undefined;
            status.textContent = `Saved: your spending is ${formatDollars(result.annualSpend)} a year from ${now.asAtDate}. Any later spending change in your plan still applies from its own date.`;
          }
          render();
        });
      }),
      button(BASELINE_LABELS.cancel, 'Nothing is written.', () => {
        baseline = undefined;
        status.textContent = 'Nothing was saved. Your spending is as it was.';
        render();
      }),
    );
  };

  // --- Import a bank CSV file (P11-2) ------------------------------------------------------------

  const fileInput = input('file', 'transactionsCsv', '');
  fileInput.accept = '.csv,text/csv';
  fileInput.addEventListener('change', async () => {
    const file = fileInput.files?.[0];
    if (file === undefined || ledger === undefined) return;
    const text = await file.text();
    // Cleared so choosing the same file again starts a fresh import rather than doing nothing.
    fileInput.value = '';
    startImport(ledger, file.name, text);
    render();
  });

  const startImport = (current: Ledger, fileName: string, text: string): void => {
    let records: CsvRecord[];
    try {
      records = parseCsv(text);
    } catch (error) {
      importing = undefined;
      status.textContent = `Nothing was imported from ${fileName}. ${error instanceof CsvSyntaxError ? error.message : reason(error)}`;
      return;
    }
    if (records.length === 0) {
      importing = undefined;
      status.textContent = `Nothing was imported: ${fileName} holds no rows.`;
      return;
    }
    status.textContent = '';
    const first = records[0]!;
    const saved = savedMappingFor(current, headerNames(first));
    if (saved !== undefined) {
      importing = { fileName, records, working: fromMapping(saved), reused: saved, choices: [] };
      return;
    }
    if (looksLikeData(first)) {
      const choices = savedHeaderlessFormats(current, first.fields.length);
      const only = choices.length === 1 ? choices[0] : undefined;
      importing = only !== undefined
        ? { fileName, records, working: fromMapping(only), reused: only, choices: [] }
        : { fileName, records, working: guessed(records, false), reused: undefined, choices };
      return;
    }
    importing = { fileName, records, working: guessed(records, true), reused: undefined, choices: [] };
  };

  const renderImport = (current: Ledger): void => {
    const heading = paragraph('import-heading', '');
    heading.append(label(IMPORT_LABELS.file, fileInput));
    if (importing === undefined) {
      importBox.replaceChildren(
        heading,
        paragraph('caveat', 'Read in your browser; rows already imported are skipped.'),
      );
      return;
    }
    const work = importing;
    const parts: HTMLElement[] = [heading, paragraph('import-file', `Importing ${work.fileName}.`)];
    const cancel = button(IMPORT_LABELS.cancel, 'Nothing is written.', () => {
      importing = undefined;
      status.textContent = 'Nothing was imported.';
      render();
    });
    const redraw = (): void => render();

    if (work.reused === undefined && work.choices.length > 1 && !work.editing) {
      parts.push(paragraph('caveat', `This file has no column names and ${work.records[0]!.fields.length} columns. Which of your saved formats is it?`));
      for (const choice of work.choices) {
        parts.push(button(`Read it as "${choice.formatName}"`, 'Uses that saved mapping. Nothing is written yet.', () => {
          importing = { ...work, working: fromMapping(choice), reused: choice };
          render();
        }));
      }
      parts.push(button(IMPORT_LABELS.newFormat, 'Asks which column is which.', () => {
        importing = { ...work, editing: true };
        render();
      }), cancel);
      importBox.replaceChildren(...parts);
      return;
    }

    const working = work.working;
    const columns = columnsOf(work.records, working.hasHeader);
    const account = input('text', 'importAccount', working.account);
    account.addEventListener('change', () => {
      working.account = account.value;
      redraw();
    });

    if (work.reused !== undefined && !work.editing) {
      parts.push(
        paragraph('import-known', work.reused.formatName === undefined
          ? 'These columns match a mapping you saved before, so it is used as it is.'
          : `Read as your saved format "${work.reused.formatName}" (${work.reused.columnCount} columns, no column names).`),
        label(IMPORT_LABELS.account, account),
        button(IMPORT_LABELS.changeMapping, 'Asks which column is which. Nothing is written yet.', () => {
          importing = { ...work, editing: true };
          render();
        }),
      );
    } else {
      parts.push(mappingForm(work, columns, account, redraw));
    }

    const problems = problemsWith(working, columns);
    if (problems.length > 0) {
      parts.push(...problems.map((problem) => paragraph('import-problem', problem)), cancel);
      importBox.replaceChildren(...parts);
      return;
    }
    const draft = toDraft(working, columns);
    const { rows, bad } = readRows(dataRecords(work.records, working.hasHeader), columns, draft);

    if (rows.length > 0) {
      parts.push(paragraph('caveat', rows.length > 5 ? 'The first 5 rows, as they will be recorded:' : 'The rows, as they will be recorded:'));
      const table = document.createElement('table');
      table.className = 'import-preview';
      for (const row of rows.slice(0, 5)) {
        const line = document.createElement('tr');
        line.append(cell(row.date), cell(row.description), cell(amountInWords(row.amount)));
        table.append(line);
      }
      parts.push(table);
    }
    if (bad.length > 0) {
      parts.push(paragraph('import-bad-heading', `${bad.length} ${bad.length === 1 ? 'row' : 'rows'} could not be read and will not be imported:`));
      const list = document.createElement('ul');
      list.className = 'import-bad';
      for (const each of bad) {
        const item = document.createElement('li');
        item.textContent = `Line ${each.line}: ${each.reason}.`;
        list.append(item);
      }
      parts.push(list);
    }
    if (rows.length === 0) {
      parts.push(paragraph('import-problem', 'No row of this file could be read with this mapping, so there is nothing to import.'), cancel);
      importBox.replaceChildren(...parts);
      return;
    }
    parts.push(
      button(importButtonLabel(rows.length, bad.length), 'Adds these rows, skipping any already imported. They cannot be edited or deleted afterwards.', () => {
        const latest = ledger ?? current;
        const { toAdd, skipped } = notYetImported(latest, rows, draft.account);
        const held = draft.header !== undefined
          ? savedMappingFor(latest, draft.header)
          : savedHeaderlessFormats(latest, draft.columnCount!).find((each) => each.formatName === draft.formatName);
        const mappings: ImportMapping[] = held !== undefined && sameMapping(held, draft)
          ? []
          : [{ id: host.newId(), ...draft, createdAt: host.today() }];
        const outcome = importOutcome(toAdd.length, skipped);
        if (toAdd.length === 0 && mappings.length === 0) {
          importing = undefined;
          status.textContent = outcome;
          render();
          return;
        }
        const added = importedTransactions(toAdd, draft.account, host.today(), host.newId);
        return commit(added, [], outcome, mappings).then((landed) => {
          if (landed) {
            importing = undefined;
            // Offered, never applied: the batches these rows fall into are shown for review.
            const ids = new Set(added.map((each) => each.id));
            const matched = ledger === undefined ? 0 : suggestionBatches(ledger).reduce((sum, batch) => sum + batch.transactions.filter((each) => ids.has(each.id)).length, 0);
            if (matched > 0) status.textContent = `${outcome} Your rules suggest a category for ${matched} of them — review below; nothing is categorised until you accept.`;
            render();
          }
        });
      }),
      cancel,
    );
    importBox.replaceChildren(...parts);
  };

  const mappingForm = (work: ImportWork, columns: readonly string[], account: HTMLInputElement, redraw: () => void): HTMLElement => {
    const working = work.working;
    const form = document.createElement('div');
    form.className = 'import-mapping';
    const columnChoices = [{ value: '', label: 'Choose…' }, ...columns.map((name) => ({ value: name, label: name }))];
    const onChange = <E extends HTMLInputElement | HTMLSelectElement>(element: E, apply: (element: E) => void): E => {
      element.addEventListener('change', () => {
        apply(element);
        redraw();
      });
      return element;
    };
    const hasHeader = onChange(input('checkbox', 'importHasHeader', ''), (element) => {
      importing = { ...work, editing: true, working: { ...guessed(work.records, element.checked), account: working.account } };
    });
    hasHeader.checked = working.hasHeader;
    form.append(
      paragraph('caveat', 'Say once which column is which. The mapping is saved with the rows and used again for files with the same columns.'),
      label(IMPORT_LABELS.hasHeader, hasHeader),
    );
    if (!working.hasHeader) {
      form.append(label(IMPORT_LABELS.formatName, onChange(input('text', 'importFormatName', working.formatName), (element) => { working.formatName = element.value; })));
    }
    const dateColumn = onChange(select('importDateColumn', columnChoices, working.dateColumn), (element) => {
      working.dateColumn = element.value;
      if (columns.includes(element.value)) working.dateFormat = detectDateFormat(columnValues(work.records, working.hasHeader, columns, element.value));
    });
    const amountForm = onChange(select('importAmountForm', AMOUNT_FORMS, working.amountForm), (element) => { working.amountForm = element.value as AmountForm; });
    form.append(
      label(IMPORT_LABELS.dateColumn, dateColumn),
      label(IMPORT_LABELS.dateFormat, onChange(select('importDateFormat', DATE_FORMATS.map((format) => ({ value: format, label: format })), working.dateFormat), (element) => { working.dateFormat = element.value as DateFormat; })),
      label(IMPORT_LABELS.descriptionColumn, onChange(select('importDescriptionColumn', columnChoices, working.descriptionColumn), (element) => { working.descriptionColumn = element.value; })),
      label(IMPORT_LABELS.amountForm, amountForm),
    );
    if (working.amountForm === 'signed') {
      form.append(label(IMPORT_LABELS.amountColumn, onChange(select('importAmountColumn', columnChoices, working.amountColumn), (element) => { working.amountColumn = element.value; })));
    } else {
      form.append(
        label(IMPORT_LABELS.debitColumn, onChange(select('importDebitColumn', columnChoices, working.debitColumn), (element) => { working.debitColumn = element.value; })),
        label(IMPORT_LABELS.creditColumn, onChange(select('importCreditColumn', columnChoices, working.creditColumn), (element) => { working.creditColumn = element.value; })),
      );
    }
    form.append(label(IMPORT_LABELS.account, account));
    return form;
  };

  if (ledger !== undefined) {
    renderForm();
    renderRuleForm();
  }
  render();

  return {
    startAgainQuestion: () => {
      if (ledger === undefined) return undefined;
      const count = ledger.transactions.length;
      const tick = input('checkbox', 'alsoDeleteTransactions', '');
      tick.checked = false;
      const element = document.createElement('div');
      element.className = 'start-again-ledger';
      element.append(
        label(START_AGAIN_LEDGER_QUESTION, tick),
        paragraph(
          'caveat',
          `Left unticked, your transaction history (${count} recorded) is kept exactly as it is.` +
            ' Ticked, all of it is deleted when you press Finish, and that cannot be undone either.',
        ),
      );
      return {
        element,
        afterPlanReplaced: async () => {
          if (!tick.checked) return 'Your transaction history is kept as it was.';
          try {
            ledger = await replaceWithEmptyLedger(host.transport);
          } catch (error) {
            return `Your new plan is saved. ${reason(error)}`;
          }
          status.textContent = '';
          render();
          return 'Your transaction history is deleted.';
        },
      };
    },
  };
};
