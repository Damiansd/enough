// P7-8 — the x-axis tick spacing fix. `maxTicksLimit: 24` on a 501-point CATEGORY axis divided the
// point COUNT, not the calendar, and printed ticks at `2026-09, 2028-06, 2030-03, 2031-12, 2033-09 …`
// — a 21-month step nobody chose. `xAxisTickPlan` (`chartConfig.ts`) replaces that with a plan
// anchored to a MONTH that means something (July — the engine is FY-driven) and stepped in whole
// years, the step itself derived from a ladder rather than hard-coded. This file is written against
// exactly the properties the brief demands, using SYNTHETIC month arrays for the ladder tests — no
// re-projection — and the committed demo walk for the ones that need a long, real, irregular span.
import test from 'node:test';
import assert from 'node:assert/strict';

import { project } from '../dist/core/projection.js';
import { DEMO_ENTRIES, DEMO_HOUSEHOLD, DEMO_SETTINGS } from '../dist/app/demoHousehold.js';
import { statedContingencyFloor } from '../dist/core/outcomes.js';
import { monthsToSeries } from '../dist/app/monthsToSeries.js';
import { chartConfig, xAxisTickPlan } from '../dist/app/chartConfig.js';

const FLOOR_700K = 700_000_00;
/**
 * **The floor as a plan states it (P4-14).** `monthsToSeries` no longer takes a bare figure: a
 * floor is `Settings.contingencyFloor`, stated in TODAY'S money, and it travels with the date it is
 * stated at and the CPI that raises it to a later month's price level. Built through
 * `statedContingencyFloor` rather than as a literal, so these fixtures go through the door a page
 * goes through.
 */
const STATED_700K = statedContingencyFloor({ ...DEMO_SETTINGS, contingencyFloor: FLOOR_700K });

const MONTHS = project(DEMO_SETTINGS, DEMO_HOUSEHOLD, DEMO_ENTRIES);
const SERIES = monthsToSeries(MONTHS, DEMO_HOUSEHOLD, STATED_700K, DEMO_SETTINGS.economicSeries.agePension);
/**
 * The raw future amounts — see `test/app-chart-config.test.mjs` for why this file draws in that
 * basis. In the future-dollars view `todaysDollars.ts`'s lens is the identity, so every dataset is
 * still the series' own array, value for value, and nothing below is re-based. The today's-money
 * view is `test/app-todays-dollars.test.mjs`.
 */
const FUTURE = { view: 'futureDollars', asAtDate: DEMO_SETTINGS.asAtDate, cpi: DEMO_SETTINGS.economicSeries.cpi };

/** `YYYY-MM` strings, ascending, `count` long, starting at `startYear`-`startMonth` (1-12). Pure
 * string arithmetic — no `Date`, no re-projection, exactly the shape `series.months` itself is. */
const monthsRange = (startYear, startMonth, count) => {
  const out = [];
  let year = startYear;
  let month = startMonth;
  for (let i = 0; i < count; i += 1) {
    out.push(`${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}`);
    month += 1;
    if (month > 12) {
      month = 1;
      year += 1;
    }
  }
  return out;
};

const calendarMonthOf = (month) => Number(month.slice(5, 7));
const yearOf = (month) => Number(month.slice(0, 4));

// --- The demo walk: the fixture the reported defect was measured on ------------------------------

const DEMO_PLAN = xAxisTickPlan(SERIES.months);

test('the vacuity control: the demo walk is 501 months and does not start or end in July', () => {
  assert.equal(SERIES.months.length, 501, 'the demo walk changed length — the figures below were measured on 501 months');
  assert.notEqual(calendarMonthOf(SERIES.months[0]), 7, 'the walk already starting in July would make the "irregular edges" claim vacuous');
  assert.notEqual(calendarMonthOf(SERIES.months[SERIES.months.length - 1]), 7);
});

test('EVERY chosen index is a July', () => {
  assert.ok(DEMO_PLAN.indices.length > 0, 'the demo walk must produce at least one tick');
  for (const index of DEMO_PLAN.indices) {
    assert.equal(calendarMonthOf(SERIES.months[index]), 7, `index ${index} (${SERIES.months[index]}) is not a July`);
  }
});

test('the gap between consecutive indices is CONSTANT and a whole number of years', () => {
  const gaps = new Set();
  for (let i = 1; i < DEMO_PLAN.indices.length; i += 1) {
    gaps.add(DEMO_PLAN.indices[i] - DEMO_PLAN.indices[i - 1]);
  }
  assert.equal(gaps.size, 1, `the gaps are not constant: ${[...gaps].join(', ')}`);
  const [gap] = gaps;
  assert.equal(gap % 12, 0, `a ${gap}-month gap is not a whole number of years`);
  assert.equal(gap / 12, DEMO_PLAN.stepYears);
});

test('the tick count is at or under 24', () => {
  assert.ok(DEMO_PLAN.indices.length <= 24, `${DEMO_PLAN.indices.length} ticks exceeds the 24-tick ceiling`);
});

test('the demo walk resolves to a 2-year step and ~21 ticks — the exact figures named in the brief', () => {
  assert.equal(DEMO_PLAN.stepYears, 2);
  assert.equal(DEMO_PLAN.indices.length, 21);
});

test('the edges are left IRREGULAR — first tick 2027-07, last tick 2067-07, neither the walk’s own first nor last month', () => {
  const first = DEMO_PLAN.indices[0];
  const last = DEMO_PLAN.indices[DEMO_PLAN.indices.length - 1];
  assert.equal(SERIES.months[first], '2027-07');
  assert.equal(SERIES.months[last], '2067-07');
  assert.notEqual(first, 0, 'a forced tick at the walk’s own first month would read as a data boundary that is not one');
  assert.notEqual(last, SERIES.months.length - 1, 'a forced tick at the walk’s own last month would read as a data boundary that is not one');
});

// --- The step ladder: 1 / 2 / 5 / 10, smallest that fits under 24 --------------------------------

test('a ~10-year synthetic walk picks a 1-year step', () => {
  const months = monthsRange(2020, 3, 121); // 2020-03 .. 2030-03, crossing 10 or 11 Julys
  const plan = xAxisTickPlan(months);
  assert.equal(plan.stepYears, 1);
  assert.ok(plan.indices.length <= 24);
  for (const index of plan.indices) assert.equal(calendarMonthOf(months[index]), 7);
});

test('a ~200-year synthetic walk picks a 10-year step', () => {
  const months = monthsRange(1900, 1, 2401); // 200 years and a month
  const plan = xAxisTickPlan(months);
  assert.equal(plan.stepYears, 10);
  assert.ok(plan.indices.length <= 24, `${plan.indices.length} ticks exceeds 24 at step 10`);
});

test('a ~50-year synthetic walk picks a 5-year step, not 2 or 10 — the SMALLEST step that fits under 24, never a bigger one that also would', () => {
  const months = monthsRange(1975, 1, 601); // 50 years: 1-year → ~50 (too many), 2-year → ~25 (too many), 5-year → ~10 (fits, and must win over 10)
  const plan = xAxisTickPlan(months);
  assert.equal(plan.stepYears, 5);
  assert.ok(plan.indices.length <= 24);
});

test('a ~15-year synthetic walk picks a 1-year step, not 2 — the ladder is tried smallest-first', () => {
  const months = monthsRange(2000, 1, 181); // 15 years: 1-year step is ~15 ticks, already under 24
  const plan = xAxisTickPlan(months);
  assert.equal(plan.stepYears, 1);
  assert.ok(plan.indices.length <= 24);
});

// --- The fallback: a walk shorter than one anchor interval ---------------------------------------

test('a short walk that DOES cross a July still ticks normally, at step 1', () => {
  const months = ['2030-06', '2030-07', '2030-08'];
  const plan = xAxisTickPlan(months);
  assert.equal(plan.stepYears, 1);
  assert.deepEqual([...plan.indices], [1]);
});

test('a short walk that crosses NO July at all still yields at least one tick — the honest fallback', () => {
  const months = ['2030-01', '2030-02', '2030-03'];
  const plan = xAxisTickPlan(months);
  assert.equal(plan.indices.length, 1, 'a blank axis is worse than one off-anchor tick');
  assert.deepEqual([...plan.indices], [0], 'the fallback tick is the walk’s own first month');
  assert.equal(plan.stepYears, 0, '0 means "no regular step" — never mistaken for an annual step');
});

test('an empty walk produces no tick — there is no month to put one on', () => {
  const plan = xAxisTickPlan([]);
  assert.deepEqual([...plan.indices], []);
});

// --- Both axis modes agree ------------------------------------------------------------------------

test('date mode and age mode choose the IDENTICAL tick indices — the plan is built from `months`, never from the chosen label set', () => {
  const dateConfig = chartConfig(SERIES, FUTURE, 'date');
  const ageConfig = chartConfig(SERIES, FUTURE, 'age');
  assert.deepEqual([...dateConfig.xTicks.indices], [...ageConfig.xTicks.indices]);
  assert.equal(dateConfig.xTicks.stepYears, ageConfig.xTicks.stepYears);
  // And the config's plan is exactly the pure function's own output — chartConfig recomputes nothing.
  assert.deepEqual([...dateConfig.xTicks.indices], [...DEMO_PLAN.indices]);
});

test('xTicks carries no Chart.js key Chart.js itself would read off `options` — it is taken off by the writer', () => {
  const config = chartConfig(SERIES, FUTURE);
  assert.equal(config.options.scales.x.xTicks, undefined, 'xTicks must not leak into the options object Chart.js is handed');
  assert.ok(Array.isArray(config.xTicks.indices));
});
