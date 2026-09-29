// The main chart's two assets-test lines and its stack order (2026-09-25).
//
// "Full pension up to" is the Age Pension assets test's free area and "No pension above" is its
// cut-off. Both come off `Month.assetsTestThresholds`, which the walk reads from the entitlement it
// computed that month, so the app re-derives no rule. The assessable band is the BOTTOM of the stack,
// so its top edge is the figure the two lines are read against. The lines are drawn on the Focused
// chart only, converted with the chart's money basis, and left as gaps in any month with no
// entitlement.
import test from 'node:test';
import assert from 'node:assert/strict';

import { project, PARAMETER_WINDOW_NOTES } from '../dist/core/projection.js';
import { DEMO_ENTRIES, DEMO_HOUSEHOLD, DEMO_PLAN, DEMO_SETTINGS } from '../dist/app/demoHousehold.js';
import { THRESHOLD_LABELS, monthsToSeries } from '../dist/app/monthsToSeries.js';
import { ASSETS_TEST_ONLY_NOTE, WEALTH_STACK, chartConfig } from '../dist/app/chartConfig.js';
import { moneyBasis, moneyLens } from '../dist/app/todaysDollars.js';
import { parsePlan } from '../dist/core/parsePlan.js';
import { scenarioWalks } from '../dist/app/scenarioWalks.js';
import { comparisonSeries } from '../dist/app/comparisonSeries.js';
import { comparisonChartConfig } from '../dist/app/comparisonConfig.js';

const MONTHS = project(DEMO_SETTINGS, DEMO_HOUSEHOLD, DEMO_ENTRIES);
const SERIES = monthsToSeries(MONTHS, DEMO_HOUSEHOLD, undefined, DEMO_SETTINGS.economicSeries.agePension);
const TODAY = moneyBasis('todaysDollars', DEMO_SETTINGS);
const FUTURE = moneyBasis('futureDollars', DEMO_SETTINGS);
const KEYS = ['fullPensionUpTo', 'noPensionAbove'];
const dataOf = (config, key) => [...config.data.datasets.find((dataset) => dataset.key === key).data];

/**
 * A walk that OPENS before the first Age Pension determination this register holds (20 March 2026),
 * so its first three months compute no entitlement at all — the only way to reach the "absent" case.
 */
const EARLY = project({ ...DEMO_SETTINGS, asAtDate: '2026-01-01' }, DEMO_HOUSEHOLD, DEMO_ENTRIES);
const uncomputed = (month) => month.notes.some((note) => note === PARAMETER_WINDOW_NOTES['Age Pension']);

// --- The stack order -------------------------------------------------------------------------------

test('ASSESSABLE IS THE BOTTOM BAND — the first dataset in the wealth stack, and first in the legend', () => {
  const config = chartConfig(SERIES, FUTURE);
  const stacked = config.data.datasets.filter((dataset) => dataset.stack === WEALTH_STACK);
  // Chart.js stacks in dataset order from the axis up, and lists the legend in the same order.
  assert.deepEqual(stacked.map((dataset) => dataset.key), ['assessable', 'protected']);
  assert.equal(config.data.datasets[0].key, 'assessable');
  assert.deepEqual([...config.data.datasets[0].data], MONTHS.map((month) => month.assessableAssets));
});

// --- The engine's field ----------------------------------------------------------------------------

test('ENGINE — the free area is the LOWER line: the published $481,500, below the cut-off in every month', () => {
  // A homeowner couple's combined assets-test free area from 1 July 2025 is $481,500 (Services
  // Australia). The first computed month of the early walk is still on that determination.
  const april = EARLY.find((month) => month.month === '2026-04');
  assert.equal(april.assetsTestThresholds.fullPensionUpTo, 481_500_00);
  for (const month of [...MONTHS, ...EARLY.filter((each) => each.assetsTestThresholds !== undefined)]) {
    const { fullPensionUpTo, noPensionAbove } = month.assetsTestThresholds;
    assert.ok(fullPensionUpTo > 0, `${month.month}: a nil free area`);
    assert.ok(fullPensionUpTo < noPensionAbove, `${month.month}: the full-pension line is not below the no-pension line`);
  }
});

test('ENGINE — ABSENT, key and all, in every month that computed no entitlement, and present in every other', () => {
  const without = EARLY.filter(uncomputed);
  assert.deepEqual(without.map((month) => month.month), ['2026-01', '2026-02', '2026-03'], 'the fixture no longer reaches the uncomputed case');
  for (const month of without) {
    assert.equal(Object.hasOwn(month, 'assetsTestThresholds'), false, `${month.month} carries thresholds with no entitlement behind them`);
  }
  for (const month of EARLY.filter((each) => !uncomputed(each))) {
    assert.equal(Object.hasOwn(month, 'assetsTestThresholds'), true, `${month.month} computed an entitlement and reports no thresholds`);
  }
  assert.equal(MONTHS.every((month) => Object.hasOwn(month, 'assetsTestThresholds')), true);
});

test('ENGINE — the lines STEP: on indexation, and down when a couple becomes single', () => {
  const distinct = new Set(MONTHS.map((month) => month.assetsTestThresholds.fullPensionUpTo));
  assert.ok(distinct.size > 30, `only ${distinct.size} distinct free areas over ${MONTHS.length} months — the line was flattened`);
  const death = { id: 'd', date: '2050-07-01', owner: 'personB', type: 'DEATH', params: {}, enabled: true, createdAt: '2026-06-01' };
  const widowed = project(DEMO_SETTINGS, DEMO_HOUSEHOLD, [...DEMO_ENTRIES, death]);
  const at = (walk, month) => walk.find((each) => each.month === month).assetsTestThresholds;
  assert.deepEqual(at(widowed, '2050-06'), at(MONTHS, '2050-06'), 'the month before the death moved');
  assert.ok(at(widowed, '2050-07').fullPensionUpTo < at(MONTHS, '2050-07').fullPensionUpTo, 'a single free area is not below the couple one');
  assert.ok(at(widowed, '2050-07').noPensionAbove < at(MONTHS, '2050-07').noPensionAbove, 'a single cut-off is not below the couple one');
});

// --- The series and the chart ----------------------------------------------------------------------

test('SERIES — each line is its own figure off the month, and a month with none is a GAP (null), never 0', () => {
  assert.deepEqual(SERIES.thresholds.map((line) => line.key), KEYS);
  assert.deepEqual([...SERIES.thresholds[0].values], MONTHS.map((month) => month.assetsTestThresholds.fullPensionUpTo));
  assert.deepEqual([...SERIES.thresholds[1].values], MONTHS.map((month) => month.assetsTestThresholds.noPensionAbove));
  const early = monthsToSeries(EARLY, DEMO_HOUSEHOLD, undefined, DEMO_SETTINGS.economicSeries.agePension);
  for (const line of early.thresholds) {
    assert.deepEqual(line.values.slice(0, 3), [null, null, null], `${line.key} is drawn where no entitlement was computed`);
    assert.equal(line.values.slice(3).every((value) => typeof value === 'number' && value > 0), true);
  }
  // And a walk that computed no entitlement anywhere draws no line at all, and no caveat for one.
  const none = monthsToSeries(EARLY.slice(0, 3), DEMO_HOUSEHOLD, undefined, undefined);
  assert.deepEqual([...none.thresholds], []);
  assert.equal(chartConfig(none, FUTURE).options.plugins.subtitle.text.includes(ASSETS_TEST_ONLY_NOTE), false);
});

test('CHART — plain-English labels, the lower one is "Full pension up to", neither is in any stack', () => {
  const config = chartConfig(SERIES, FUTURE);
  const lines = config.data.datasets.filter((dataset) => KEYS.includes(dataset.key));
  assert.deepEqual(lines.map((line) => line.key), KEYS);
  assert.match(THRESHOLD_LABELS.fullPensionUpTo, /^Full pension up to/);
  assert.match(THRESHOLD_LABELS.noPensionAbove, /^No pension above/);
  assert.deepEqual(lines.map((line) => line.label), KEYS.map((key) => THRESHOLD_LABELS[key]));
  const stacks = config.data.datasets.map((dataset) => dataset.stack);
  for (const line of lines) {
    assert.notEqual(line.stack, WEALTH_STACK);
    assert.equal(stacks.filter((stack) => stack === line.stack).length, 1, `${line.key} shares a stack group`);
    assert.equal(line.fill, false);
  }
  const full = dataOf(config, 'fullPensionUpTo');
  const none = dataOf(config, 'noPensionAbove');
  assert.equal(full.every((value, index) => value < none[index]), true, 'the full-pension line is not the lower line');
  assert.deepEqual(full, MONTHS.map((month) => month.assetsTestThresholds.fullPensionUpTo));
});

test('CHART — the caption says it is the assets test only, and that the income test can cut the pension too', () => {
  const subtitle = chartConfig(SERIES, FUTURE).options.plugins.subtitle.text;
  assert.ok(subtitle.includes(ASSETS_TEST_ONLY_NOTE));
  assert.match(ASSETS_TEST_ONLY_NOTE, /assets test only/);
  assert.match(ASSETS_TEST_ONLY_NOTE, /income test/);
  assert.ok(ASSETS_TEST_ONLY_NOTE.length <= 110, 'the subtitle draws each line unwrapped');
});

test('CHART — TODAY’S MONEY converts both lines point by point, exactly as the bands are converted', () => {
  const today = chartConfig(SERIES, TODAY);
  const future = chartConfig(SERIES, FUTURE);
  for (const [index, key] of KEYS.entries()) {
    const raw = SERIES.thresholds[index].values;
    assert.deepEqual(dataOf(today, key), raw.map((value, at) => moneyLens(TODAY, SERIES.months[at])(value)), key);
    assert.deepEqual(dataOf(future, key), [...raw], key);
    const moved = dataOf(today, key).filter((value, at) => value !== raw[at]).length;
    assert.ok(moved > 400, `${key}: only ${moved} of ${raw.length} points differ in today's money`);
  }
  // A gap converts to a gap, not to a number.
  const early = chartConfig(monthsToSeries(EARLY, DEMO_HOUSEHOLD, undefined, DEMO_SETTINGS.economicSeries.agePension), TODAY);
  for (const key of KEYS) assert.deepEqual(dataOf(early, key).slice(0, 3), [null, null, null]);
});

test('COMPARE VIEW — neither line, nor its caption, is drawn', () => {
  const plan = parsePlan(JSON.parse(JSON.stringify({
    ...DEMO_PLAN,
    scenarios: [
      { id: 'baseline', name: 'Baseline', parentId: null, entryIds: DEMO_PLAN.entries.map((entry) => entry.id) },
      { id: 'fork', name: 'Fork', parentId: 'baseline', entryIds: [] },
    ],
    activeScenarioId: 'baseline',
  })));
  const walks = scenarioWalks(plan);
  // Vacuity control: the walks being compared DO carry the thresholds.
  assert.equal([...walks.byScenarioId.values()].every((walk) => walk.some((month) => month.assetsTestThresholds !== undefined)), true);
  for (const basis of [TODAY, FUTURE]) {
    const config = comparisonChartConfig(comparisonSeries(plan, walks), basis);
    assert.equal(config.data.datasets.length, 2, 'one line per Scenario and nothing else');
    const text = JSON.stringify(config);
    for (const key of KEYS) {
      assert.equal(text.includes(key), false, `${key} reached the Compare view`);
      assert.equal(text.includes(THRESHOLD_LABELS[key]), false, `${key}'s label reached the Compare view`);
    }
    assert.equal(text.includes(ASSETS_TEST_ONLY_NOTE), false);
  }
});
