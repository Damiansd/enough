// The hover box on BOTH charts (user report, 2026-09-24: "The chart tooltip numbers are out by a
// factor of 100" and "Make the ages read clearly").
//
// `renderChart.ts` hands its config to the global `Chart` the vendored UMD build sets. Nothing here
// draws: `Chart` is replaced by a stand-in that keeps the config it was handed, so the callbacks the
// real library would call are read off the very object `new Chart` receives — for the focused chart
// AND the comparison chart, in both axis modes. Chart.js calls `label` once per dataset with the
// point's own value (`raw`) and `title` with the hovered items; that is exactly how they are called
// below.
import test from 'node:test';
import assert from 'node:assert/strict';

import { project } from '../dist/core/projection.js';
import { parsePlan } from '../dist/core/parsePlan.js';
import { statedContingencyFloor } from '../dist/core/outcomes.js';
import { DEMO_ENTRIES, DEMO_HOUSEHOLD, DEMO_PLAN, DEMO_SETTINGS } from '../dist/app/demoHousehold.js';
import { AGE_DIED, AGE_NOT_YET_BORN, ageAxis, monthsToSeries } from '../dist/app/monthsToSeries.js';
import { scenarioWalks } from '../dist/app/scenarioWalks.js';
import { comparisonSeries } from '../dist/app/comparisonSeries.js';
import { ageAxisTitle, agesTooltipTitle, tooltipLabel } from '../dist/app/chartConfig.js';
import { formatDollars } from '../dist/app/displayMoney.js';
import { renderChart, renderComparisonChart } from '../dist/app/renderChart.js';

const FUTURE = { view: 'futureDollars', asAtDate: DEMO_SETTINGS.asAtDate, cpi: DEMO_SETTINGS.economicSeries.cpi };

const MONTHS = project(DEMO_SETTINGS, DEMO_HOUSEHOLD, DEMO_ENTRIES);
const SERIES = monthsToSeries(MONTHS, DEMO_HOUSEHOLD, statedContingencyFloor(DEMO_SETTINGS), DEMO_SETTINGS.economicSeries.agePension);
const PLAN = parsePlan(JSON.parse(JSON.stringify({
  ...DEMO_PLAN,
  scenarios: [
    { id: 'baseline', name: 'Baseline', parentId: null, entryIds: DEMO_PLAN.entries.map((entry) => entry.id) },
    { id: 'fork', name: 'Fork', parentId: 'baseline', entryIds: [] },
  ],
  activeScenarioId: 'baseline',
})));
const COMPARISON = comparisonSeries(PLAN, scenarioWalks(PLAN));

/** `new Chart(canvas, config)` without a canvas: returns the config the writer handed over. */
const handedToChart = (draw) => {
  const previous = globalThis.Chart;
  let handed;
  globalThis.Chart = class {
    constructor(_canvas, config) {
      handed = config;
    }
  };
  try {
    draw();
  } finally {
    globalThis.Chart = previous;
  }
  return handed;
};

const CHARTS = [
  ['focused', (mode) => handedToChart(() => renderChart({}, SERIES, FUTURE, mode)), SERIES.ageAxis],
  ['comparison', (mode) => handedToChart(() => renderComparisonChart({}, COMPARISON, FUTURE, mode)), COMPARISON.ageAxis],
];

/** The hover lines for month `index`, as Chart.js builds them: one `label` call per dataset. */
const hoverLines = (config, index) =>
  config.data.datasets.map((dataset) => config.options.plugins.tooltip.callbacks.label({ dataset, raw: dataset.data[index], dataIndex: index }));

test('the vacuity control — the demo walk has figures with cents in them, so a raw value would show', () => {
  const values = SERIES.bands.flatMap((band) => band.values);
  assert.ok(values.some((value) => value % 100 !== 0), 'every figure is whole dollars, so this file could not tell cents from dollars');
  assert.ok(values.some((value) => value >= 100_000_00), 'no figure is large enough for a factor of 100 to be unmistakable');
});

for (const [name, draw, axis] of CHARTS) {
  test(`${name} chart: every hover line is "label: $whole dollars", never the raw cents — in both axis modes`, () => {
    for (const mode of ['date', 'age']) {
      const config = draw(mode);
      const label = config.options.plugins.tooltip?.callbacks?.label;
      assert.equal(typeof label, 'function', `the ${name} chart has no tooltip label callback in ${mode} mode`);
      for (const index of [0, 120, config.data.datasets[0].data.length - 1]) {
        for (const [position, line] of hoverLines(config, index).entries()) {
          const dataset = config.data.datasets[position];
          const value = dataset.data[index];
          assert.equal(line, `${dataset.label}: ${formatDollars(value)}`);
          assert.match(line, /: -?\$[\d,]+$/, `a hover line is not whole dollars: ${line}`);
          assert.ok(!line.includes(String(value)) || Math.abs(value) < 100, `a hover line prints the raw cents ${value}: ${line}`);
        }
      }
    }
  });

  test(`${name} chart: the age-view hover title names each Person's age, not "67,66"`, () => {
    const config = draw('age');
    const title = config.options.plugins.tooltip.callbacks.title;
    assert.equal(typeof title, 'function', `the ${name} chart has no tooltip title callback in age mode`);
    const index = 0;
    const [dana, ash] = config.data.labels[index];
    const text = title([{ dataIndex: index, label: config.data.labels[index].join(',') }]);
    assert.equal(text, `Age ${dana} (Dana) · ${ash} (Ash)`);
    assert.doesNotMatch(text, /\d,\d/, 'the title is the comma-joined label Chart.js prints by itself');
    // Named in the axis title's own order and words.
    assert.equal(config.options.scales.x.title.text, ageAxisTitle(axis));
    assert.equal(ageAxisTitle(axis), 'Age — Dana / Ash');
  });

  test(`${name} chart: the date view keeps Chart.js's own month title`, () => {
    assert.equal(draw('date').options.plugins.tooltip.callbacks.title, undefined);
  });
}

test('tooltipLabel is the page formatter: $1,291,193 for 129,119,323 cents', () => {
  assert.equal(tooltipLabel('Baseline', 129_119_323), 'Baseline: $1,291,193');
  assert.equal(tooltipLabel('Baseline', 129_119_350), 'Baseline: $1,291,194');
});

test('agesTooltipTitle keeps the axis word for a Person not yet born, or who has died', () => {
  const household = {
    persons: [
      { name: 'Alex', dateOfBirth: '2030-06-01' },
      { name: 'Sam', dateOfBirth: '1960-02-09' },
    ],
  };
  const axis = ageAxis([{ month: '2026-09' }, { month: '2040-01', died: [1] }], household);
  assert.equal(agesTooltipTitle(axis, 0), `Age ${AGE_NOT_YET_BORN} (Alex) · 66 (Sam)`);
  assert.equal(agesTooltipTitle(axis, 1), `Age 9 (Alex) · ${AGE_DIED} (Sam)`);
  assert.equal(ageAxisTitle(axis), 'Age — Alex / Sam');
});
