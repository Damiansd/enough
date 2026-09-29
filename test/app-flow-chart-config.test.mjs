// the income/spend chart design gate — `flowChartConfig.ts`, the decidable half of the second chart's renderer.
// `renderChart.ts`'s `renderFlowChart` is not tested here and cannot be: it draws to a canvas.
//
//   1. THE SHORTFALL NEVER SHARES A STACK WITH ANY INCOME/OUTFLOW GROUP.
//   2. OUTFLOW-SIDE GROUPS ARE NEGATED SO THEY STACK BELOW ZERO; INFLOW-SIDE GROUPS ARE NOT.
//   3. EVERY NUMBER IN THE CONFIG IS ONE OF THE SERIES' OWN NUMBERS (up to the outflow sign flip).
//   4. A PARTIAL FINANCIAL YEAR IS NAMED ON THE FACE OF THE CHART.
import test from 'node:test';
import assert from 'node:assert/strict';

import { toCents } from '../dist/core/money.js';
import { AGE_PENSION_LINE, HOUSEHOLD_SPENDING_LINE, SHORTFALL_LINE } from '../dist/core/projection.js';
import { flowSeries } from '../dist/app/flowSeries.js';
import { CHART_TITLE, FLOW_STACK, SHORTFALL_STACK, flowChartConfig } from '../dist/app/flowChartConfig.js';
import { moneyBasis } from '../dist/app/todaysDollars.js';

const SETTINGS = { asAtDate: '2026-09-01', economicSeries: { cpi: 0.025 } };
const FUTURE = moneyBasis('futureDollars', SETTINGS);
const HOUSEHOLD = { persons: [{ name: 'Robin', dateOfBirth: '1965-01-01', superInterests: [], parcels: [] }] };

const cashLine = (direction, description, amount) =>
  Object.freeze({ direction, effect: 'cash', description, amount, provenance: { basis: 'none', note: '' }, attribution: { basis: 'none', note: '' } });
const monthOf = (month, lines) => Object.freeze({ month, lines: Object.freeze(lines) });

const MONTHS = [
  monthOf('2026-07', [
    cashLine('inflow', AGE_PENSION_LINE, toCents(2_000)),
    cashLine('outflow', HOUSEHOLD_SPENDING_LINE, toCents(1_500)),
    cashLine('inflow', SHORTFALL_LINE, toCents(300)),
  ]),
  ...['2026-08', '2026-09', '2026-10', '2026-11', '2026-12', '2027-01', '2027-02', '2027-03', '2027-04', '2027-05', '2027-06'].map((m) =>
    monthOf(m, [cashLine('inflow', AGE_PENSION_LINE, toCents(2_000)), cashLine('outflow', HOUSEHOLD_SPENDING_LINE, toCents(1_500))]),
  ),
];

test('the shortfall dataset never shares a stack with any group dataset', () => {
  const series = flowSeries(MONTHS, HOUSEHOLD, FUTURE);
  const config = flowChartConfig(series);
  const shortfall = config.data.datasets.filter((d) => d.key === 'shortfall');
  const groups = config.data.datasets.filter((d) => d.key !== 'shortfall');
  assert.equal(shortfall.length, 1);
  assert.equal(shortfall[0].stack, SHORTFALL_STACK);
  assert.ok(groups.length > 0);
  for (const dataset of groups) {
    assert.equal(dataset.stack, FLOW_STACK);
    assert.notEqual(dataset.stack, shortfall[0].stack);
  }
  assert.equal(config.type, 'bar');
  assert.equal(config.options.plugins.title.text, CHART_TITLE);
});

test('an outflow-side group is negated for the stack; an inflow-side group is not', () => {
  const series = flowSeries(MONTHS, HOUSEHOLD, FUTURE);
  const config = flowChartConfig(series);
  const spending = config.data.datasets.find((d) => d.key === 'spending');
  const agePension = config.data.datasets.find((d) => d.key === 'agePension');
  const spendingGroup = series.groups.find((g) => g.key === 'spending');
  const agePensionGroup = series.groups.find((g) => g.key === 'agePension');
  assert.deepEqual(spending.data, spendingGroup.values.map((v) => -v));
  assert.deepEqual(agePension.data, [...agePensionGroup.values]);
  assert.ok(spending.data[0] < 0, 'spending must read below zero on the stacked axis');
  assert.ok(agePension.data[0] > 0);
});

test('the shortfall dataset is exactly series.shortfall, never negated and never summed with a group', () => {
  const series = flowSeries(MONTHS, HOUSEHOLD, FUTURE);
  const config = flowChartConfig(series);
  const shortfall = config.data.datasets.find((d) => d.key === 'shortfall');
  assert.deepEqual(shortfall.data, [...series.shortfall]);
  assert.equal(shortfall.data[0], toCents(300));
});

test('every number in the config is one of the series’ own group/shortfall figures, or its negation', () => {
  const series = flowSeries(MONTHS, HOUSEHOLD, FUTURE);
  const config = flowChartConfig(series);
  const known = new Set();
  for (const group of series.groups) for (const v of group.values) { known.add(v); known.add(-v); }
  for (const v of series.shortfall) known.add(v);
  for (const dataset of config.data.datasets) {
    for (const value of dataset.data) {
      assert.ok(known.has(value), `${dataset.key}: ${value} is not traceable to the series`);
    }
  }
});

test('a partial financial year is named on the face of the chart (subtitle), not just flagged in the data', () => {
  const partialMonths = MONTHS.slice(0, 3); // three months only — a partial year
  const series = flowSeries(partialMonths, HOUSEHOLD, FUTURE);
  const config = flowChartConfig(series);
  assert.ok(series.years[0].partial);
  assert.ok(
    config.options.plugins.subtitle.text.some((line) => line.includes(series.years[0].label) && line.includes('partial')),
    JSON.stringify(config.options.plugins.subtitle.text),
  );
});

test('the datasets are stable in FLOW_GROUP_ORDER regardless of the walk, not in series.groups’ own (filtered) order', () => {
  const series = flowSeries(MONTHS, HOUSEHOLD, FUTURE);
  const config = flowChartConfig(series);
  const keys = config.data.datasets.map((d) => d.key);
  assert.deepEqual(keys, ['agePension', 'spending', 'shortfall']);
});
