// The Compare chart's second view — "What Centrelink counts". Each Scenario's line is that walk's
// `assessableAssets`, drawn against the assets test's two thresholds; the default "Total wealth"
// view is unchanged and draws no threshold at all.
//
// The failures this file is pointed at:
//   (a) the Centrelink view drawing total wealth under a Centrelink title;
//   (b) one Scenario's thresholds silently standing for all of them — a Scenario that SELLS THE
//       HOME is assessed against the non-homeowner figures, and a reader comparing it against the
//       homeowner line would read the wrong cut-off off the chart;
//   (c) a month with no computed entitlement bridged over as if the line ran through it.
import test from 'node:test';
import assert from 'node:assert/strict';

import { DEMO_PLAN } from '../dist/app/demoHousehold.js';
import { parsePlan } from '../dist/core/parsePlan.js';
import { scenarioWalks } from '../dist/app/scenarioWalks.js';
import { comparisonSeries } from '../dist/app/comparisonSeries.js';
import {
  CENTRELINK_COMPARISON_NOTE,
  CENTRELINK_COMPARISON_TITLE,
  COMPARISON_TITLE,
  PER_SCENARIO_THRESHOLD_DASH,
  agePensionAgeRulesNote,
  comparisonChartConfig,
} from '../dist/app/comparisonConfig.js';
import { ASSETS_TEST_ONLY_NOTE, THRESHOLD_COLOURS } from '../dist/app/chartConfig.js';
import { THRESHOLD_LABELS } from '../dist/app/monthsToSeries.js';
import { MONEY_VIEW_BASIS, moneyBasis, moneyLens } from '../dist/app/todaysDollars.js';
import { scenarioStyles } from '../dist/app/scenarioStyle.js';

const KEYS = ['fullPensionUpTo', 'noPensionAbove'];
const DEMO_IDS = DEMO_PLAN.entries.map((entry) => entry.id);

const SOLD = { id: 'sold', date: '2033-01-01', owner: 'household', type: 'SELL_HOME', params: { salePrice: 90_000_000 }, enabled: true, createdAt: '2026-09-24' };
const SPEND = { id: 'spend', date: '2030-03-01', owner: 'household', type: 'ONE_OFF_EXPENSE', params: { amount: 250_000_00 }, enabled: true, createdAt: '2026-09-19' };

const planOf = (extra, settings = DEMO_PLAN.settings) =>
  parsePlan(JSON.parse(JSON.stringify({
    ...DEMO_PLAN,
    settings,
    entries: [...DEMO_PLAN.entries, extra],
    scenarios: [
      { id: 'baseline', name: 'Baseline', parentId: null, entryIds: DEMO_IDS },
      { id: 'fork', name: 'Fork', parentId: 'baseline', entryIds: [extra.id] },
    ],
    activeScenarioId: 'baseline',
  })));

const setUp = (plan) => {
  const walks = scenarioWalks(plan);
  return { plan, walks, series: comparisonSeries(plan, walks) };
};

const SELLS = setUp(planOf(SOLD));
const SPENDS = setUp(planOf(SPEND));
/** Opens before the first Age Pension determination the register holds — its first months compute no entitlement. */
const EARLY = setUp(planOf(SPEND, { ...DEMO_PLAN.settings, asAtDate: '2026-01-01' }));

const FUTURE = moneyBasis('futureDollars', DEMO_PLAN.settings);
const TODAY = moneyBasis('todaysDollars', DEMO_PLAN.settings);

const thresholdSets = (config) => config.data.datasets.filter((dataset) => dataset.key.startsWith('threshold:'));
const lineSets = (config) => config.data.datasets.filter((dataset) => dataset.key.startsWith('scenario:'));

// --- (a) the line IS assessableAssets --------------------------------------------------------------

test('CENTRELINK VIEW — each scenario’s line is that walk’s own assessableAssets, month by month (mutation (a))', () => {
  const { series, walks } = SELLS;
  for (const basis of [FUTURE, TODAY]) {
    const config = comparisonChartConfig(series, basis, 'date', 'centrelink');
    const lines = lineSets(config);
    assert.equal(lines.length, 2);
    for (const dataset of lines) {
      const walk = walks.byScenarioId.get(dataset.scenarioId);
      assert.deepEqual([...dataset.data], walk.map((month) => moneyLens(basis, month.month)(month.assessableAssets)));
    }
  }
  // Vacuity control: total wealth and the assessable figure really differ on this fixture, in many
  // months, so a view that drew the wrong one could not pass the assertion above.
  const baseline = series.lines[0];
  const differ = baseline.values.filter((value, index) => value !== baseline.assessableValues[index]).length;
  assert.ok(differ > 50, `only ${differ} months where total wealth and assessable assets differ`);
});

test('CENTRELINK VIEW — same colours, dashes and legend labels as the total-wealth view', () => {
  const total = lineSets(comparisonChartConfig(SELLS.series, FUTURE));
  const counted = lineSets(comparisonChartConfig(SELLS.series, FUTURE, 'date', 'centrelink'));
  assert.deepEqual(
    counted.map(({ key, label, borderColor, borderDash }) => [key, label, borderColor, [...borderDash]]),
    total.map(({ key, label, borderColor, borderDash }) => [key, label, borderColor, [...borderDash]]),
  );
});

// --- one shared pair where every scenario agrees ---------------------------------------------------

test('THRESHOLDS EQUAL — ONE pair, the focused chart’s teal and red, dashed [8, 4], stepped, no gaps bridged', () => {
  const { series, walks } = SPENDS;
  const [a, b] = [...walks.byScenarioId.values()];
  // The fixture's premise: the lines differ, the thresholds do not.
  assert.notDeepEqual(series.lines[0].assessableValues, series.lines[1].assessableValues);
  assert.deepEqual(a.map((month) => month.assetsTestThresholds), b.map((month) => month.assetsTestThresholds));
  const config = comparisonChartConfig(series, TODAY, 'date', 'centrelink');
  const pair = thresholdSets(config);
  assert.deepEqual(pair.map((dataset) => dataset.key), ['threshold:fullPensionUpTo', 'threshold:noPensionAbove']);
  for (const [index, key] of KEYS.entries()) {
    const dataset = pair[index];
    assert.equal(dataset.label, THRESHOLD_LABELS[key]);
    assert.equal(dataset.borderColor, THRESHOLD_COLOURS[key]);
    assert.deepEqual([...dataset.borderDash], [8, 4]);
    assert.equal(dataset.stepped, 'before');
    assert.equal(dataset.spanGaps, false);
    assert.equal(dataset.fill, false);
    assert.equal(dataset.scenarioId, undefined);
    assert.deepEqual([...dataset.data], a.map((month) => moneyLens(TODAY, month.month)(month.assetsTestThresholds[key])));
  }
  assert.equal(THRESHOLD_COLOURS.fullPensionUpTo, '#00838f');
  assert.equal(THRESHOLD_COLOURS.noPensionAbove, '#b3261e');
});

// --- (b) one pair per scenario where they differ ---------------------------------------------------

test('THRESHOLDS DIFFER (one scenario sells the home) — one pair PER scenario, never scenario 0’s for all (mutation (b))', () => {
  const { series, walks, plan } = SELLS;
  const differ = walks.byScenarioId.get('baseline').filter((month, index) =>
    month.assetsTestThresholds.noPensionAbove !== walks.byScenarioId.get('fork')[index].assetsTestThresholds.noPensionAbove).length;
  assert.ok(differ > 300, `the home sale moved the cut-off in only ${differ} months — the fixture no longer differs`);
  const config = comparisonChartConfig(series, FUTURE, 'date', 'centrelink');
  const sets = thresholdSets(config);
  assert.equal(sets.length, 4);
  const styles = scenarioStyles(plan.scenarios.map((scenario) => scenario.id));
  for (const [scenarioId, legend] of [['baseline', 'Baseline'], ['fork', 'Fork']]) {
    const walk = walks.byScenarioId.get(scenarioId);
    const own = sets.filter((dataset) => dataset.scenarioId === scenarioId);
    assert.deepEqual(own.map((dataset) => dataset.key), KEYS.map((key) => `threshold:${key}:${scenarioId}`));
    for (const [index, key] of KEYS.entries()) {
      const dataset = own[index];
      assert.deepEqual([...dataset.data], walk.map((month) => month.assetsTestThresholds[key]), `${scenarioId} ${key}`);
      assert.equal(dataset.borderColor, styles.get(scenarioId).colour);
      assert.deepEqual([...dataset.borderDash], [...PER_SCENARIO_THRESHOLD_DASH[key]]);
      assert.equal(dataset.label, `${THRESHOLD_LABELS[key]} — ${legend}`);
      assert.equal(dataset.stepped, 'before');
      assert.equal(dataset.spanGaps, false);
    }
  }
  assert.notDeepEqual([...PER_SCENARIO_THRESHOLD_DASH.fullPensionUpTo], [...PER_SCENARIO_THRESHOLD_DASH.noPensionAbove]);
  assert.equal(new Set(sets.map((dataset) => dataset.label)).size, 4, 'two threshold lines share a legend label');
});

// --- (c) a gap stays a gap -------------------------------------------------------------------------

test('A MONTH WITH NO ENTITLEMENT IS A GAP — null in, null out, spanGaps false (mutation (c))', () => {
  const { series, walks } = EARLY;
  const walk = walks.byScenarioId.get('baseline');
  const gaps = walk.filter((month) => month.assetsTestThresholds === undefined).length;
  assert.ok(gaps >= 1, 'the early walk no longer opens before the first determination — nothing here is tested');
  for (const basis of [FUTURE, TODAY]) {
    for (const dataset of thresholdSets(comparisonChartConfig(series, basis, 'date', 'centrelink'))) {
      assert.equal(dataset.spanGaps, false);
      assert.equal(dataset.data.filter((value) => value === null).length, gaps, dataset.key);
      walk.forEach((month, index) => {
        if (month.assetsTestThresholds === undefined) assert.equal(dataset.data[index], null, `${dataset.key} bridges ${month.month}`);
      });
    }
  }
});

// --- title, subtitle and the stack guard -----------------------------------------------------------

test('CENTRELINK VIEW — the title and subtitle say which view it is, and carry the assets-test-only caveat', () => {
  const config = comparisonChartConfig(SELLS.series, TODAY, 'date', 'centrelink');
  assert.equal(config.options.plugins.title.text, CENTRELINK_COMPARISON_TITLE);
  assert.match(CENTRELINK_COMPARISON_TITLE, /Centrelink/);
  assert.match(CENTRELINK_COMPARISON_TITLE, /scenario/);
  const subtitle = [...config.options.plugins.subtitle.text];
  assert.equal(subtitle[0], MONEY_VIEW_BASIS.todaysDollars);
  assert.ok(subtitle.includes(CENTRELINK_COMPARISON_NOTE));
  assert.ok(subtitle.includes(ASSETS_TEST_ONLY_NOTE));
  assert.ok(!subtitle.some((line) => /TOTAL wealth/.test(line)), 'the Centrelink view still says each line is total wealth');
});

test('CENTRELINK VIEW — no dataset carries a stack key and the y-axis is not stacked', () => {
  for (const { series } of [SELLS, SPENDS]) {
    const config = comparisonChartConfig(series, FUTURE, 'date', 'centrelink');
    for (const dataset of config.data.datasets) assert.ok(!Object.hasOwn(dataset, 'stack'), dataset.key);
    assert.ok(!JSON.stringify(config).includes('"stack"'));
    assert.equal(config.options.scales.y.stacked, false);
  }
});

// --- the default view is unchanged -----------------------------------------------------------------

test('TOTAL WEALTH VIEW (the default) — no threshold line, total-wealth values, the old title and notes', () => {
  for (const { series } of [SELLS, SPENDS, EARLY]) {
    const implicit = comparisonChartConfig(series, FUTURE);
    const explicit = comparisonChartConfig(series, FUTURE, 'date', 'totalWealth');
    assert.deepEqual(JSON.stringify(implicit), JSON.stringify(explicit));
    assert.equal(thresholdSets(implicit).length, 0);
    assert.equal(implicit.data.datasets.length, series.lines.length);
    assert.deepEqual(implicit.data.datasets.map((dataset) => [...dataset.data]), series.lines.map((line) => [...line.values]));
    assert.equal(implicit.options.plugins.title.text, COMPARISON_TITLE);
    assert.deepEqual([...implicit.options.plugins.subtitle.text], [
      MONEY_VIEW_BASIS.futureDollars,
      ...series.notes,
      agePensionAgeRulesNote(series.agePensionAge.lines),
      ...series.agePensionAge.notes,
    ]);
    const text = JSON.stringify(implicit);
    for (const key of KEYS) assert.ok(!text.includes(THRESHOLD_LABELS[key]));
    assert.ok(!text.includes(ASSETS_TEST_ONLY_NOTE));
  }
});
