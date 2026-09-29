// P6-6 (the table) — **the pure half of the journal TABLE**: which rows are shown, in what order,
// and how many are being hidden. No DOM, no clock, no randomness, in `entryVisibility.ts`'s and
// `scenarioList.ts`'s idiom — `entryForm.ts` builds the `<table>` and is untested
// (`test/app-entry-form.test.mjs` pins it as source text), so every property a silent regression
// could break lives here and is asserted behaviourally in `test/app-entry-table.test.mjs`.
//
// Sorting and filtering are VIEW STATE and nothing here is written back: `enabled: false` is still
// the append-only-safe delete (ADR-0002), the entry stays in `plan.json` forever, and a column
// header is a question about the screen, not an edit to the file. `entryForm.ts` holds one
// `EntryTableView` in memory per mount, and its own header says why it never reaches `savePlan`.
//
// ⚠️ **THIS FILE TAKES ROWS, NOT ENTRIES, AND THAT IS THE POINT.** The cells are sorted by what
// the user can READ — the type's plain-English label, the owner's NAME, the description sentence —
// and not by the code identifiers `plan.json` stores. Sorting by `entry.type` would order the table
// by `LUMP_SUM_FROM_SUPER` while the screen says "Take a lump sum from super", which puts the rows
// in an order the headings do not explain. So the caller (which is the only place that has a
// `household` to resolve a name against, and the only place that knows how a type's params are
// worded) builds an `EntryRow` per entry and hands those in. The `entry` itself rides along so the
// writer can wire the row's one control back to `planWithEntryOverride`.
import type { Entry } from '../core/plan.js'; // `.js` is correct in a `.ts` file — see tsconfig.json
import { switchedOffCount, visibleEntries } from './entryVisibility.js';

/**
 * ⚠️ **FIVE COLUMNS, AND `createdAt` IS NOT ONE OF THEM** (user ruling, 2026-09-22). The date on a
 * row is the entry's EFFECTIVE date (`plan.ts`'s `date`) — the day the change applies from, which
 * is the only date the forecast reads. `createdAt` is provenance, nothing computes from it, and a
 * column of "when this was typed in" would offer a sort order that answers no question a user of
 * this page has. It is therefore absent as a column AND absent from `EntrySortKey`: there is no
 * way to reach it from the table at all, which is stronger than leaving it out of the headings.
 *
 * ⚠️ **AND THERE IS NO AMOUNT COLUMN, WHICH IS A FACT ABOUT THE UNION AND NOT A DESIGN CHOICE.**
 * `Entry['params']` has no field common to all members — `RetireParams` is `{}`, a
 * `MORTGAGE_REFINANCE` states three figures and no single one of them is "the amount", and a
 * stopped `SUPER_CONTRIBUTION` deliberately states none (a "$0" there is the overloaded nil the
 * door refuses). An Amount column would therefore be blank for some types and arbitrary for
 * others, and a blank money cell beside a real one reads as "zero" rather than "not applicable".
 * The figures go in the Description cell instead, where each type words its own.
 */
export type EntrySortKey = 'date' | 'type' | 'owner' | 'description' | 'enabled';

export type SortDirection = 'ascending' | 'descending';

/** One row of the table: the entry, and the text of each of its four readable cells. */
export interface EntryRow {
  readonly entry: Entry;
  /** The entry's own effective date, `YYYY-MM-DD`. Never `createdAt` — see `EntrySortKey`. */
  readonly date: string;
  readonly type: string;
  readonly owner: string;
  readonly description: string;
  readonly enabled: boolean;
}

/** What the table is showing right now. One of these per mount, in memory, never saved. */
export interface EntryTableView {
  readonly sortKey: EntrySortKey;
  readonly direction: SortDirection;
  /** `false` hides switched-off rows — the default, guarded by the count below. */
  readonly showSwitchedOff: boolean;
  /** Free text matched across Type, Owner and Description. Empty means "match everything". */
  readonly search: string;
}

/** The column list, in the order the table draws them, with the heading each one carries. */
export const ENTRY_TABLE_COLUMNS: readonly { readonly key: EntrySortKey; readonly heading: string }[] = [
  { key: 'date', heading: 'Date' },
  { key: 'type', heading: 'Type' },
  { key: 'owner', heading: 'Owner' },
  { key: 'description', heading: 'Description' },
  { key: 'enabled', heading: 'Enabled' },
];

/**
 * ⚠️ **NEWEST FIRST, AND SWITCHED-OFF ROWS HIDDEN** (user ruling, 2026-09-22). Date descending is
 * the opening state because the entry a user has just added, or is about to switch off, is the one
 * nearest the date they are thinking about — and because plan-array order (what this replaced) is
 * the order things were TYPED, which is `createdAt`'s order wearing a disguise.
 *
 * Hiding the switched-off ones by default is permitted only because `hiddenSummary` below is
 * always on screen and `filtersReset` is one click away. See the guardrail on `hiddenSummary`.
 */
export const DEFAULT_ENTRY_TABLE_VIEW: EntryTableView = {
  sortKey: 'date',
  direction: 'descending',
  showSwitchedOff: false,
  search: '',
};

/**
 * The one-click way back to the whole file. It clears BOTH filters — a reset that cleared the text
 * and left switched-off rows hidden would still be hiding entries after the user asked to see
 * everything, which is the failure the guardrail exists to prevent.
 *
 * It does NOT touch the sort. Sorting hides nothing, so a reset that reordered the table would be
 * undoing a choice the user did not ask to undo, and would make the button's effect unpredictable.
 */
export const filtersReset = (view: EntryTableView): EntryTableView => ({
  ...view,
  showSwitchedOff: true,
  search: '',
});

/** True when nothing is filtered out — what a "Reset filters" control can be told to look idle by. */
export const filtersAreOpen = (view: EntryTableView): boolean => view.showSwitchedOff && view.search.trim() === '';

/**
 * Clicking a heading. The same heading again flips the direction; a different heading moves the
 * sort to it and starts at that column's own natural end — dates newest first (the same reason
 * `DEFAULT_ENTRY_TABLE_VIEW` gives), everything else A to Z.
 */
export const withSortKey = (view: EntryTableView, key: EntrySortKey): EntryTableView =>
  view.sortKey === key
    ? { ...view, direction: view.direction === 'ascending' ? 'descending' : 'ascending' }
    : { ...view, sortKey: key, direction: key === 'date' ? 'descending' : 'ascending' };

/** What `aria-sort` on a `<th>` says: the sorted column's direction, `none` on every other. */
export const ariaSortFor = (view: EntryTableView, key: EntrySortKey): 'ascending' | 'descending' | 'none' =>
  view.sortKey === key ? view.direction : 'none';

/**
 * Case-folded, and compared as plain code units rather than with `localeCompare`. A locale
 * comparison would order the table differently depending on which ICU the browser shipped, and
 * this is the only comparison in the app whose output a test asserts on directly.
 *
 * `date` goes through here too, and correctly: `YYYY-MM-DD` sorts chronologically as text, which
 * is the whole reason the plan file stores dates in that shape (`plan.ts`).
 */
const compareText = (left: string, right: string): number => {
  const a = left.toLowerCase();
  const b = right.toLowerCase();
  return a < b ? -1 : a > b ? 1 : 0;
};

const compareBy = (key: EntrySortKey, left: EntryRow, right: EntryRow): number =>
  key === 'enabled' ? Number(left.enabled) - Number(right.enabled) : compareText(left[key], right[key]);

/** A row matches free text when any of its three readable cells contains it, case-folded. */
const matchesSearch = (row: EntryRow, search: string): boolean => {
  const needle = search.trim().toLowerCase();
  if (needle === '') return true;
  return [row.type, row.owner, row.description].some((cell) => cell.toLowerCase().includes(needle));
};

/** The switched-on filter and the text filter, in that order. Nothing here sorts. */
const matching = (rows: readonly EntryRow[], view: EntryTableView): readonly EntryRow[] =>
  visibleEntries(rows, view.showSwitchedOff).filter((row) => matchesSearch(row, view.search));

/**
 * The rows the table draws: filtered, then sorted, newest first by default.
 *
 * **Ties keep the journal's own order, in BOTH directions.** `Array.prototype.sort` is stable, and
 * the comparator is negated for a descending sort rather than the array being reversed — so two
 * entries sharing a date stay in the order `plan.entries` holds them whichever way the arrow
 * points. Reversing the array instead would make the same two rows swap places when the user
 * clicked the heading twice and ended up back where they started.
 *
 * The input array is never mutated: `sort` runs on a copy, because `plan.entries` is the file.
 */
export const entryTableRows = (rows: readonly EntryRow[], view: EntryTableView): readonly EntryRow[] => {
  const sign = view.direction === 'descending' ? -1 : 1;
  return [...matching(rows, view)].sort((left, right) => sign * compareBy(view.sortKey, left, right));
};

/**
 * How many rows the switched-on filter is hiding, counted over the INPUT and never derived from
 * `entryTableRows`'s length. `entryVisibility.ts`'s header gives the reason and it still holds: the
 * one thing this number has to survive is a filter that hides the wrong rows, and a count taken
 * from the filtered output could not catch that — it would describe the screen instead of the file.
 */
export const switchedOffHiddenCount = (rows: readonly EntryRow[], view: EntryTableView): number =>
  view.showSwitchedOff ? 0 : switchedOffCount(rows);

/** How many switched-ON rows the free-text filter is hiding. Counted the same independent way. */
export const searchHiddenCount = (rows: readonly EntryRow[], view: EntryTableView): number =>
  visibleEntries(rows, view.showSwitchedOff).filter((row) => !matchesSearch(row, view.search)).length;

/**
 * ⚠️ **THE HIDING GUARDRAIL, AND IT IS NOT DECORATION** (user rulings, 2026-09-19 and 2026-09-22).
 * This sentence is on the page at all times, whether or not anything is hidden and without the
 * user touching a control, and it is the reason hiding switched-off rows by default is allowed at
 * all. The rule the user set: **rows may be hidden by default only if the user can always SEE that
 * something is hidden and get it back in one click.** The count is the seeing; `filtersReset` is
 * the click. Take either away and switching an entry off becomes indistinguishable from deleting
 * it — which this build has no operation for, by design (`planEdits.ts`).
 *
 * **THE ARGUMENT THIS OVERTURNED, kept in frame because it is a good one.** Until 2026-09-19 the
 * list showed disabled entries always, on the grounds that *a disabled entry is still a decision
 * the household made, and hiding it would make the list agree with the forecast and disagree with
 * the FILE*. That is exactly right, and it is why the count is load-bearing: hidden rows DO make
 * the table agree with the forecast and diverge from `plan.json`, and this sentence is the only
 * thing keeping the file's own truth on screen. Switching an entry off is advertised as reversible
 * ("Switch back on"); a hidden row with no count would make it irreversible in practice, because a
 * user who forgets a disabled entry exists could never reach it again. If this indicator is ever
 * dropped, the trade stops holding and the old reasoning wins — put the rows back rather than
 * hiding them silently.
 *
 * The two causes are named separately because they are undone by different controls, and a single
 * "3 hidden" would leave a user clicking the wrong one.
 */
export const hiddenSummary = (rows: readonly EntryRow[], view: EntryTableView): string => {
  const switchedOff = switchedOffHiddenCount(rows, view);
  const bySearch = searchHiddenCount(rows, view);
  const shown = rows.length - switchedOff - bySearch;
  const causes: string[] = [];
  if (switchedOff > 0) causes.push(`${switchedOff} switched off — hidden`);
  if (bySearch > 0) causes.push(`${bySearch} hidden by the text filter`);
  return causes.length === 0
    ? `Showing all ${rows.length} entries — nothing is hidden.`
    : `${causes.join('; ')}. Showing ${shown} of ${rows.length}.`;
};
