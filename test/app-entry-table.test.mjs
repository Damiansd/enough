// The journal panel is a sortable, filterable TABLE from 2026-09-22, and this is the pure half of
// it: which rows it shows, in what order, and how many it is hiding. `entryForm.ts` builds the
// `<table>` and is untested (`test/app-entry-form.test.mjs` pins it as source text, and its header
// says why there is no jsdom), so every property a silent regression could break is asserted here
// behaviourally instead — the same split `entryVisibility.ts` already had with the old list.
//
// ⚠️ **The rows are built off the DEMO fixture's real entries** (`demoHousehold.ts`), not made up
// here, so the cells are the strings the page actually writes. The fixture is committed with every
// entry `enabled: true` and with its three entries in an order that is NOT date order — the
// spending change, then a 2031 retirement, then a 2029 expense. That last fact is load-bearing:
// plan-array order is what the default sort REPLACED, so a fixture already in date order could not
// tell the new behaviour from the old one.
import test from 'node:test';
import assert from 'node:assert/strict';

import {
  DEFAULT_ENTRY_TABLE_VIEW,
  ENTRY_TABLE_COLUMNS,
  ariaSortFor,
  entryTableRows,
  filtersAreOpen,
  filtersReset,
  hiddenSummary,
  searchHiddenCount,
  switchedOffHiddenCount,
  withSortKey,
} from '../dist/app/entryTable.js';
import { DEMO_ENTRIES } from '../dist/app/demoHousehold.js';
import { entryTypeLabel } from '../dist/app/entryLabels.js';

/** What `entryForm.ts` hands in: the entry, plus the text of each readable cell. */
const rowOf = (entry, owner = 'Household') => ({
  entry,
  date: entry.date,
  type: entryTypeLabel(entry.type),
  owner,
  description: entry.note ?? '',
  enabled: entry.enabled,
});

const OWNERS = { household: 'Household', personA: 'Dana', personB: 'Kim' };
const ROWS = DEMO_ENTRIES.map((entry) => rowOf(entry, OWNERS[entry.owner] ?? entry.owner));
const ids = (rows) => rows.map((row) => row.entry.id);

test('the vacuity control: the fixture is not already in date order, and carries at least three entries', () => {
  assert.ok(ROWS.length >= 3, 'the ordering tests below need three rows to distinguish a sort from a reversal');
  const dates = ROWS.map((row) => row.date);
  assert.notDeepEqual(dates, [...dates].sort(), 'the fixture is already in date order — every sort assertion below would pass on the old plan-array behaviour');
});

// --- The default view: date descending, switched-off rows hidden --------------------------------

test('the default view is date DESCENDING, and it is the entry’s own effective date', () => {
  assert.equal(DEFAULT_ENTRY_TABLE_VIEW.sortKey, 'date');
  assert.equal(DEFAULT_ENTRY_TABLE_VIEW.direction, 'descending');
  const shown = entryTableRows(ROWS, DEFAULT_ENTRY_TABLE_VIEW);
  assert.deepEqual(
    shown.map((row) => row.date),
    [...ROWS.map((row) => row.date)].sort().reverse(),
    'the rows are not newest-first by the date the entry applies from',
  );
  // And explicitly, on the fixture: the 2031 retirement leads, the 2026 spending change is last,
  // which is neither the plan array's order nor its reverse.
  assert.deepEqual(ids(shown), ['dana-retires', 'new-roof', 'spend-2026']);
});

test('a BACKDATED entry sorts by its effective date, not by where it sits in the plan array', () => {
  // Appended last — the newest thing typed in — but dated before everything else. Plan-array order
  // would put it at the bottom of a newest-first list; effective-date order puts it at the bottom
  // for the opposite reason, so the ASCENDING view is what distinguishes the two.
  const backdated = rowOf({ ...DEMO_ENTRIES[0], id: 'backdated', date: '2020-01-01', createdAt: '2026-09-22' });
  const rows = [...ROWS, backdated];
  assert.equal(ids(rows).at(-1), 'backdated', 'the control: it really is last in the array');
  assert.equal(ids(entryTableRows(rows, DEFAULT_ENTRY_TABLE_VIEW)).at(-1), 'backdated');
  assert.equal(ids(entryTableRows(rows, { ...DEFAULT_ENTRY_TABLE_VIEW, direction: 'ascending' }))[0], 'backdated');
});

test('the newest entry TYPED IN does not lead the table unless it is also the newest DATED', () => {
  // The `createdAt` trap, stated as behaviour: this entry was written down today and applies in
  // 2020. A table that sorted by provenance — the column the user ruled out — would lead with it.
  const written = rowOf({ ...DEMO_ENTRIES[0], id: 'written-today', date: '2020-01-01', createdAt: '2026-09-22' });
  const shown = entryTableRows([...ROWS, written], DEFAULT_ENTRY_TABLE_VIEW);
  assert.notEqual(ids(shown)[0], 'written-today');
  assert.equal(ids(shown)[0], 'dana-retires', 'the latest EFFECTIVE date still leads');
});

test('createdAt is not reachable from the table at all: five columns, and none of them is provenance', () => {
  assert.deepEqual(ENTRY_TABLE_COLUMNS.map((column) => column.key), ['date', 'type', 'owner', 'description', 'enabled']);
  assert.deepEqual(ENTRY_TABLE_COLUMNS.map((column) => column.heading), ['Date', 'Type', 'Owner', 'Description', 'Enabled']);
  // And the rows themselves carry no provenance for a sort to reach: `EntryRow` has five fields
  // plus the entry, and `createdAt` is not one of them. (`EntrySortKey` is the compiler's half of
  // this — `sortKey: 'createdAt'` does not typecheck — and the row builder in `entryForm.ts` is
  // pinned as source in `test/app-entry-form.test.mjs`. This is the half a test can hold.)
  for (const row of ROWS) {
    assert.deepEqual(Object.keys(row).sort(), ['date', 'description', 'enabled', 'entry', 'owner', 'type']);
    assert.ok(row.entry.createdAt !== undefined, 'the control: the entry underneath DOES carry a createdAt, so its absence from the row is a choice');
  }
});

test('and there is no Amount column — `RETIRE` has no params for one to hold', () => {
  const retire = DEMO_ENTRIES.find((entry) => entry.type === 'RETIRE');
  assert.ok(retire, 'the fixture no longer carries the type whose params are empty');
  assert.deepEqual(Object.keys(retire.params), [], 'RETIRE states a figure now — an Amount column may be reconsiderable');
  assert.ok(!ENTRY_TABLE_COLUMNS.some((column) => /amount/i.test(column.heading)));
});

// --- The enabled filter, the count, and the way back --------------------------------------------

// entry 0 on, entry 1 off, the rest on — ids kept from the real fixture, `enabled` overridden by
// index so a reader can see which row is meant to be hidden without re-deriving it from a count.
const MIXED = ROWS.map((row, index) => ({ ...row, enabled: index !== 1, entry: { ...row.entry, enabled: index !== 1 } }));

test('the default filter shows switched-ON entries only', () => {
  assert.equal(DEFAULT_ENTRY_TABLE_VIEW.showSwitchedOff, false);
  const shown = entryTableRows(MIXED, DEFAULT_ENTRY_TABLE_VIEW);
  assert.equal(shown.length, MIXED.length - 1);
  assert.ok(shown.every((row) => row.enabled));
  assert.ok(!ids(shown).includes(MIXED[1].entry.id), 'the switched-off entry is on screen');
});

test('the hidden count names the switched-off rows, and is right in the state where NOTHING is shown', () => {
  assert.equal(switchedOffHiddenCount(MIXED, DEFAULT_ENTRY_TABLE_VIEW), 1);
  assert.equal(switchedOffHiddenCount(MIXED, { ...DEFAULT_ENTRY_TABLE_VIEW, showSwitchedOff: true }), 0, 'nothing is hidden once they are shown');
  // The state the count exists for: every entry is off, the table is empty, and a count derived
  // from the filtered output's length would say 0 while three rows were missing.
  const allOff = ROWS.map((row) => ({ ...row, enabled: false }));
  assert.deepEqual(entryTableRows(allOff, DEFAULT_ENTRY_TABLE_VIEW), []);
  assert.equal(switchedOffHiddenCount(allOff, DEFAULT_ENTRY_TABLE_VIEW), ROWS.length);
  assert.match(hiddenSummary(allOff, DEFAULT_ENTRY_TABLE_VIEW), new RegExp(`${ROWS.length} switched off`));
});

test('the indicator is a sentence in EVERY state, including the one where nothing is hidden', () => {
  // The guardrail: a user must be able to see that something is hidden without touching a control,
  // so the text is never empty and never conditional on there being something to say.
  const nothingHidden = hiddenSummary(ROWS, { ...DEFAULT_ENTRY_TABLE_VIEW, showSwitchedOff: true });
  assert.match(nothingHidden, /nothing is hidden/i);
  assert.match(hiddenSummary(MIXED, DEFAULT_ENTRY_TABLE_VIEW), /1 switched off — hidden/);
  assert.match(hiddenSummary(MIXED, DEFAULT_ENTRY_TABLE_VIEW), new RegExp(`Showing ${MIXED.length - 1} of ${MIXED.length}`));
  // Both causes at once, named separately: they are undone by different controls.
  const both = hiddenSummary(MIXED, { ...DEFAULT_ENTRY_TABLE_VIEW, search: 'Re-roof' });
  assert.match(both, /1 switched off — hidden/);
  assert.match(both, /hidden by the text filter/);
});

test('RESET brings every row back in one step, whatever the filters were', () => {
  const filtered = { ...DEFAULT_ENTRY_TABLE_VIEW, search: 'nothing matches this' };
  assert.deepEqual(entryTableRows(MIXED, filtered), [], 'the control: the filters really were hiding everything');
  const reset = filtersReset(filtered);
  assert.equal(entryTableRows(MIXED, reset).length, MIXED.length, 'reset did not bring the whole file back');
  assert.equal(switchedOffHiddenCount(MIXED, reset), 0);
  assert.equal(searchHiddenCount(MIXED, reset), 0);
  assert.match(hiddenSummary(MIXED, reset), /nothing is hidden/i);
  // It clears the filters and nothing else: a reset that reordered the table would be undoing a
  // choice the user never asked it to undo.
  const sorted = filtersReset({ ...filtered, sortKey: 'owner', direction: 'ascending' });
  assert.equal(sorted.sortKey, 'owner');
  assert.equal(sorted.direction, 'ascending');
});

test('filtersAreOpen is true exactly when nothing is being filtered out', () => {
  assert.equal(filtersAreOpen(DEFAULT_ENTRY_TABLE_VIEW), false, 'the default hides switched-off rows, so the way back must be live');
  assert.equal(filtersAreOpen(filtersReset(DEFAULT_ENTRY_TABLE_VIEW)), true);
  assert.equal(filtersAreOpen({ ...filtersReset(DEFAULT_ENTRY_TABLE_VIEW), search: '  ' }), true, 'whitespace is not a filter');
  assert.equal(filtersAreOpen({ ...filtersReset(DEFAULT_ENTRY_TABLE_VIEW), search: 'a' }), false);
});

// --- The free-text filter ------------------------------------------------------------------------

test('the text filter reads Type, Owner and Description — case-folded — and not the date', () => {
  const rows = [
    { ...ROWS[0], type: 'Spending change', owner: 'Dana', description: 'The standing spending level.' },
    { ...ROWS[1], type: 'Retire', owner: 'Kim', description: 'Kim stops work at 63.' },
  ];
  const shown = (search) => entryTableRows(rows, { ...DEFAULT_ENTRY_TABLE_VIEW, showSwitchedOff: true, search });
  assert.deepEqual(shown('retire').map((row) => row.type), ['Retire'], 'the Type cell is not matched, or the match is case-sensitive');
  assert.deepEqual(shown('DANA').map((row) => row.owner), ['Dana']);
  assert.deepEqual(shown('standing').map((row) => row.description), ['The standing spending level.']);
  assert.equal(shown('').length, 2, 'an empty filter must match everything');
  assert.equal(shown('   ').length, 2, 'whitespace must match everything');
  assert.deepEqual(shown(rows[0].date), [], 'the date column is searched — the brief scopes the text filter to Type, Owner and Description');
});

// --- Sorting: every column, both directions, and what a tie does ---------------------------------

test('every column sorts, and clicking the same heading twice flips it back', () => {
  for (const column of ENTRY_TABLE_COLUMNS) {
    const view = { ...DEFAULT_ENTRY_TABLE_VIEW, showSwitchedOff: true, sortKey: column.key, direction: 'ascending' };
    const up = ids(entryTableRows(MIXED, view));
    const down = ids(entryTableRows(MIXED, { ...view, direction: 'descending' }));
    assert.equal(up.length, MIXED.length, `${column.key} lost a row`);
    assert.deepEqual([...up].sort(), [...down].sort(), `${column.key} shows a different set in each direction`);
  }
  assert.equal(withSortKey(DEFAULT_ENTRY_TABLE_VIEW, 'date').direction, 'ascending', 'the same heading again must flip the direction');
  assert.equal(withSortKey(withSortKey(DEFAULT_ENTRY_TABLE_VIEW, 'date'), 'date').direction, 'descending');
  // A different heading starts at its own natural end: dates newest first, words A to Z.
  assert.deepEqual(withSortKey(DEFAULT_ENTRY_TABLE_VIEW, 'owner'), { ...DEFAULT_ENTRY_TABLE_VIEW, sortKey: 'owner', direction: 'ascending' });
  assert.equal(withSortKey({ ...DEFAULT_ENTRY_TABLE_VIEW, sortKey: 'owner', direction: 'descending' }, 'date').direction, 'descending');
});

test('two entries sharing a date keep the journal’s order — in BOTH directions', () => {
  // The property a reversal would break: descending is the comparator negated, not the array
  // flipped, so a user who clicks a heading twice ends up exactly where they started.
  const sameDay = ROWS.map((row, index) => ({ ...row, date: '2030-01-01', entry: { ...row.entry, id: `tie-${index}` } }));
  const journal = ids(sameDay);
  assert.deepEqual(ids(entryTableRows(sameDay, { ...DEFAULT_ENTRY_TABLE_VIEW, showSwitchedOff: true })), journal);
  assert.deepEqual(ids(entryTableRows(sameDay, { ...DEFAULT_ENTRY_TABLE_VIEW, showSwitchedOff: true, direction: 'ascending' })), journal);
  // And the round trip through the control that produces those two views.
  const clicked = withSortKey(withSortKey(DEFAULT_ENTRY_TABLE_VIEW, 'date'), 'date');
  assert.deepEqual(ids(entryTableRows(sameDay, { ...clicked, showSwitchedOff: true })), journal);
});

test('the Enabled column sorts by the flag, switched-off rows first ascending', () => {
  const view = { ...DEFAULT_ENTRY_TABLE_VIEW, showSwitchedOff: true, sortKey: 'enabled', direction: 'ascending' };
  assert.deepEqual(entryTableRows(MIXED, view).map((row) => row.enabled), [false, true, true]);
  assert.deepEqual(entryTableRows(MIXED, { ...view, direction: 'descending' }).map((row) => row.enabled), [true, true, false]);
});

test('aria-sort is on the sorted column and `none` on every other', () => {
  const view = { ...DEFAULT_ENTRY_TABLE_VIEW, sortKey: 'owner', direction: 'ascending' };
  assert.deepEqual(ENTRY_TABLE_COLUMNS.map((column) => ariaSortFor(view, column.key)), ['none', 'none', 'ascending', 'none', 'none']);
  assert.equal(ariaSortFor(DEFAULT_ENTRY_TABLE_VIEW, 'date'), 'descending');
});

test('the source array is never mutated — `plan.entries` is the file', () => {
  const before = JSON.stringify(ROWS);
  entryTableRows(ROWS, DEFAULT_ENTRY_TABLE_VIEW);
  entryTableRows(ROWS, { ...DEFAULT_ENTRY_TABLE_VIEW, sortKey: 'type', direction: 'ascending' });
  hiddenSummary(ROWS, DEFAULT_ENTRY_TABLE_VIEW);
  assert.equal(JSON.stringify(ROWS), before);
});
