// P7 (pure layer) — `ageAxis` in `monthsToSeries.ts`: the AGE VIEW of the chart's x-axis, added
// beside the existing date view as a label SWITCH, never a second computation (see that file's
// header for why every Person is reported and never just one). This file is the whole of that
// guarantee: the pure function is exercised directly, with tiny synthetic households built to
// isolate one rule each, and against the committed demo fixture for a fact this file does not
// invent. The wiring that actually flips the live chart between the two views — `main.ts`'s radio
// buttons and the Chart.js instance they rebuild — is untested here and stays that way; see
// `test/app-chart-config.test.mjs`'s RAW SOURCE canary for what remains unproven until a human
// looks at the page.
import test from 'node:test';
import assert from 'node:assert/strict';

import { project } from '../dist/core/projection.js';
import { DEMO_ENTRIES, DEMO_HOUSEHOLD, DEMO_SETTINGS } from '../dist/app/demoHousehold.js';
import { statedContingencyFloor } from '../dist/core/outcomes.js';
import { AGE_NOT_YET_BORN, ageAxis, monthsToSeries } from '../dist/app/monthsToSeries.js';

const MONTHS = project(DEMO_SETTINGS, DEMO_HOUSEHOLD, DEMO_ENTRIES);

const monthsOf = (yyyymm) => yyyymm.map((month) => ({ month }));

// --- Against the real fixture ---------------------------------------------------------------------

test('the age axis reports every Person the demo Household holds, in its own order, one label set per month', () => {
  const axis = ageAxis(MONTHS, DEMO_HOUSEHOLD);
  assert.deepEqual(axis.personNames, ['Dana', 'Ash']);
  assert.equal(axis.labels.length, MONTHS.length, 'the label count must equal the month count');
  for (const label of axis.labels) assert.equal(label.length, 2, 'one age per Person, every month');
});

test('two ages, hand-derived from demoHousehold.ts’s stated birth dates — not read out of ageAxis’s own output', () => {
  // Dana born 1968-05-14; Ash born 1960-02-09 (`demoHousehold.ts`). `ageAt` (`household.ts`) is
  // "years difference, minus one if the reading day's month-day STRING sorts before the birth day's
  // month-day string" — pure lexical comparison, no calendar arithmetic.
  const axis = ageAxis(MONTHS, DEMO_HOUSEHOLD);
  // Month 0 is 2026-09 (asserted elsewhere as the walk's start); first day 2026-09-01.
  //   Dana: 2026 - 1968 = 58; "09-01" is NOT before "05-14" -> 58.
  //   Ash:  2026 - 1960 = 66; "09-01" is NOT before "02-09" -> 66.
  assert.equal(MONTHS[0].month, '2026-09');
  assert.deepEqual([...axis.labels[0]], ['58', '66']);
  // Index 200 is 2043-05, the walk's Shortfall Age marker (re-derived independently in
  // app-months-to-series.test.mjs and app-chart-config.test.mjs); first day 2043-05-01.
  //   Dana: 2043 - 1968 = 75; "05-01" IS before "05-14" -> 74.
  //   Ash:  2043 - 1960 = 83; "05-01" is NOT before "02-09" -> 83.
  // This is the exact "Dana 74, Ash 83" the Shortfall marker's own caption already prints
  // (`markerCaption` in `chartConfig.ts`), arrived at here independently from the raw birth dates.
  assert.equal(MONTHS[200].month, '2043-05');
  assert.deepEqual([...axis.labels[200]], ['74', '83']);
});

test('`monthsToSeries` carries exactly the ageAxis this function produces directly — no drift between the two call sites', () => {
  const series = monthsToSeries(MONTHS, DEMO_HOUSEHOLD, statedContingencyFloor({ ...DEMO_SETTINGS, contingencyFloor: 700_000_00 }), DEMO_SETTINGS.economicSeries.agePension);
  assert.deepEqual(series.ageAxis, ageAxis(MONTHS, DEMO_HOUSEHOLD));
});

test('the label count equals the month count on a truncated walk too — it is not hard-coded to 501', () => {
  const short = MONTHS.slice(0, 37);
  assert.equal(ageAxis(short, DEMO_HOUSEHOLD).labels.length, 37);
});

// --- THE INVARIANT: the wealth series never moves when the axis view changes ----------------------

test('adding the age axis changes nothing about the bands or overlays `monthsToSeries` already produced', () => {
  const withFloor700k = monthsToSeries(MONTHS, DEMO_HOUSEHOLD, statedContingencyFloor({ ...DEMO_SETTINGS, contingencyFloor: 700_000_00 }), DEMO_SETTINGS.economicSeries.agePension);
  const protectedOf = MONTHS.map((m) => m.protectedAssets);
  const assessableOf = MONTHS.map((m) => m.assessableAssets);
  const accessibleOf = MONTHS.map((m) => m.accessibleAssets);
  // The presence of `ageAxis` on the same object must not have touched the figures the date-view
  // chart already draws — this is the "byte-identical between the two views" invariant, checked at
  // the pure layer rather than only in `chartConfig.ts` (which checks it again, at the dataset
  // level, in `test/app-chart-config.test.mjs` §8).
  assert.deepEqual([...withFloor700k.bands[0].values], assessableOf);
  assert.deepEqual([...withFloor700k.bands[1].values], protectedOf);
  assert.deepEqual([...withFloor700k.overlays[0].values], accessibleOf);
});

// --- Generalised over the number of Persons — never hard-coded to a pair --------------------------

test('a ONE-person household produces one age per month, not a pair', () => {
  const solo = { persons: [{ name: 'Solo', dateOfBirth: '1970-01-01' }] };
  const axis = ageAxis(monthsOf(['2026-01', '2026-02']), solo);
  assert.deepEqual(axis.personNames, ['Solo']);
  assert.deepEqual(axis.labels.map((label) => [...label]), [['56'], ['56']]);
});

test('a THREE-person household produces three ages per month — nothing here is hard-coded to a couple', () => {
  const trio = {
    persons: [
      { name: 'A', dateOfBirth: '1970-01-01' },
      { name: 'B', dateOfBirth: '1980-06-15' },
      { name: 'C', dateOfBirth: '1990-12-31' },
    ],
  };
  const axis = ageAxis(monthsOf(['2026-01']), trio);
  assert.deepEqual(axis.personNames, ['A', 'B', 'C']);
  // A: 2026-1970=56, "01-01" not before "01-01" -> 56.
  // B: 2026-1980=46, "01-01" IS before "06-15" -> 45.
  // C: 2026-1990=36, "01-01" IS before "12-31" -> 35.
  assert.deepEqual([...axis.labels[0]], ['56', '45', '35']);
});

// --- The step: on the reading month's first day, and never before ---------------------------------

test('a Person born on the 1st steps EXACTLY in their birth month — the first day already equals the birthday', () => {
  const bornFirst = { persons: [{ name: 'P', dateOfBirth: '1970-03-01' }] };
  const axis = ageAxis(monthsOf(['2026-02', '2026-03', '2026-04']), bornFirst);
  assert.deepEqual(
    axis.labels.map((label) => label[0]),
    ['55', '56', '56'],
    'the age must step in March itself, the birth month, since "03-01" is not before "03-01"',
  );
});

test('a Person born mid-month does NOT step until the FIRST DAY of the month AFTER their birthday', () => {
  // Dana, 1968-05-14: her birthday falls inside May, but the reading is the month's FIRST DAY —
  // 2043-05-01 is lexically before "05-14", so she is still 74 all through May; the step to 75
  // lands on 2043-06-01, the first day of the month AFTER the one her birthday falls in. This is
  // `monthsToSeries.ts`'s header note, and `AgeAtMonth`'s in `outcomes.ts`, checked directly here.
  const dana = { persons: [{ name: 'Dana', dateOfBirth: '1968-05-14' }] };
  const axis = ageAxis(monthsOf(['2043-04', '2043-05', '2043-06']), dana);
  assert.deepEqual(
    axis.labels.map((label) => label[0]),
    ['74', '74', '75'],
    'the step must land in June (the month AFTER the birthday month), not within May itself',
  );
});

// --- Honesty: no fractional or invented age --------------------------------------------------------

test('a dateOfBirth after the reading month prints an honest placeholder, never a negative number', () => {
  const unborn = { persons: [{ name: 'Future', dateOfBirth: '2099-01-01' }] };
  const axis = ageAxis(monthsOf(['2026-01']), unborn);
  assert.deepEqual([...axis.labels[0]], [AGE_NOT_YET_BORN]);
  assert.doesNotMatch(axis.labels[0][0], /^-/, 'a negative age was printed instead of the honest placeholder');
});

test('every label on the real fixture is a whole-number string — never a fraction, never the placeholder', () => {
  const axis = ageAxis(MONTHS, DEMO_HOUSEHOLD);
  for (const label of axis.labels) {
    for (const age of label) assert.match(age, /^\d+$/, `${age} is not a whole, non-negative age`);
  }
});
