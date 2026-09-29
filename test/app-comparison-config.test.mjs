// P7-1 §C / P7-7 §B — **THE STACK IS UNREACHABLE IN COMPARISON MODE**, measured rather than
// asserted in a header.
//
// `chartConfig.ts` already warns that a third stacked band "would draw every reachable dollar
// twice and print a total larger than it is". N scenarios' worth of bands in that one stack is the
// same failure N times, and — the part that is easy to miss — **so is leaving the y-axis
// `stacked: true`**: Chart.js stacks every dataset that names no group at all, so six lines on the
// focused chart's own axis options would draw the sixth at the sum of all six. Both are checked.
//
// Four mechanisms, and this file measures each:
//   §1 no dataset carries a stack key, for one scenario and for six — swept, not spot-checked;
//   §2 `y.stacked` is `false`, and `refuseStacking` is a real guard with a positive control;
//   §3 `tsc --noEmit` refuses `{ ...line, stack: WEALTH_STACK }` — the SPREAD form, which is the
//      one that defeats excess-property checking (see `test/brand-spread-sweep.test.mjs`) — with
//      a positive control that the honest dataset still compiles;
//   §4 the module's RAW import list holds nothing from the band side of the house.
//
// §5 is P7-7: N lines, N distinct identifications, a legend with no height cap, and no caption
// anywhere — `ComparisonRule` has no field to put one in.
import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { DEMO_PLAN } from '../dist/app/demoHousehold.js';
import { parsePlan } from '../dist/core/parsePlan.js';
import { scenarioWalks } from '../dist/app/scenarioWalks.js';
import { comparisonSeries } from '../dist/app/comparisonSeries.js';
import { AGE_PENSION_AGE_RULE_SCENARIO_ID, COMPARISON_TITLE, agePensionAgeRulesNote, comparisonChartConfig, refuseStacking } from '../dist/app/comparisonConfig.js';
import { MONEY_VIEW_BASIS } from '../dist/app/todaysDollars.js';
/**
 * **THE BASIS THIS FILE DRAWS IN (P2-7).** `comparisonChartConfig` now converts each point to
 * today's money by default, like the focused chart and the table, off the page's one toggle — see
 * `comparisonConfig.ts` on why leaving this chart alone was the worse option. In the future-dollars
 * view the lens is the identity, so "every dataset is one of the series' own value arrays" below
 * still asserts what it always did and no expectation moves. `test/app-todays-dollars.test.mjs`
 * covers the other view.
 */
const FUTURE = { view: 'futureDollars', asAtDate: DEMO_PLAN.settings.asAtDate, cpi: DEMO_PLAN.settings.economicSeries.cpi };
import { WEALTH_STACK, xAxisTickPlan } from '../dist/app/chartConfig.js';
import { scenarioStyles } from '../dist/app/scenarioStyle.js';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = join(ROOT, 'src');

const scenarios = (count) => [
  { id: 'baseline', name: 'Baseline', parentId: null, entryIds: DEMO_PLAN.entries.map((entry) => entry.id) },
  ...Array.from({ length: count - 1 }, (_, index) => ({
    id: `fork-${index}`,
    name: `Fork ${index}`,
    parentId: 'baseline',
    entryIds: [],
  })),
];

const seriesOf = (count, names) => {
  const list = scenarios(count).map((scenario, index) => (names ? { ...scenario, name: names[index] ?? scenario.name } : scenario));
  const plan = parsePlan(JSON.parse(JSON.stringify({ ...DEMO_PLAN, scenarios: list, activeScenarioId: 'baseline' })));
  return comparisonSeries(plan, scenarioWalks(plan));
};

const thrown = (fn) => {
  try { fn(); } catch (error) { return error; }
  return assert.fail('nothing was thrown');
};

// --- §1 No dataset carries a stack, at any scenario count ------------------------------------------

test('NO dataset in a comparison config carries a stack key — one scenario, two, or six', () => {
  for (const count of [1, 2, 6]) {
    const config = comparisonChartConfig(seriesOf(count), FUTURE);
    assert.equal(config.data.datasets.length, count);
    for (const dataset of config.data.datasets) {
      assert.ok(!('stack' in dataset), `a scenario line carries a stack key at ${count} scenarios`);
      assert.equal(dataset.fill, false, 'a filled line reads as a band');
    }
    // And nowhere else in the whole returned object either — a `stack` nested in options would
    // reach Chart.js just the same.
    assert.ok(!JSON.stringify(config).includes('"stack"'), `"stack" appears somewhere in the config at ${count} scenarios`);
    assert.ok(!JSON.stringify(config).includes(WEALTH_STACK), 'the wealth partition’s stack group is in the comparison config');
  }
  // Positive control on the same sweep: the FOCUSED chart's config does carry both, so a sweep
  // that found nothing here is a sweep that can find something.
  assert.equal(WEALTH_STACK, 'wealth-partition');
});

// --- §2 The axis is not stacked, and the guard that says so is real --------------------------------

test('the comparison y-axis is NOT stacked — the focused chart’s options cannot be copied over', () => {
  const config = comparisonChartConfig(seriesOf(3), FUTURE);
  assert.equal(config.options.scales.y.stacked, false);
  assert.equal(config.options.scales.y.beginAtZero, true);
});

test('refuseStacking is a guard, not a comment: both ways of stacking are refused (mutation (b))', () => {
  const config = comparisonChartConfig(seriesOf(2), FUTURE);
  const honest = config.data.datasets.map((dataset) => ({ ...dataset }));
  // The positive control: the real datasets and the real axis pass.
  refuseStacking(honest, false);
  // (i) a dataset that names the wealth partition's group — the exact mutation this slice is
  // written against, spelled the way a hand edit would spell it.
  const stacked = [...honest.slice(0, 1), { ...honest[1], stack: WEALTH_STACK }];
  assert.match(thrown(() => refuseStacking(stacked, false)).message, /^a scenario line carries a stack group/);
  // A group of ANY name, not just the partition's: a private group per scenario would still stack.
  assert.match(thrown(() => refuseStacking([{ ...honest[0], stack: 'anything' }], false)).message, /carries a stack group/);
  // (ii) the axis left stacked, which stacks datasets that name no group at all.
  assert.match(thrown(() => refuseStacking(honest, true)).message, /y-axis is stacked \(true\)/);
  assert.match(thrown(() => refuseStacking(honest, undefined)).message, /y-axis is stacked \(undefined\)/);
});

// --- §3 `tsc` refuses the spread form, which is the one that defeats excess-property checking -------

const tsc = (body) => {
  const dir = mkdtempSync(join(ROOT, '.tsc-comparison-'));
  try {
    const file = join(dir, 'case.ts');
    writeFileSync(file, `${body}\n`);
    let output = '';
    let ok = true;
    try {
      execFileSync(
        process.execPath,
        [
          join(ROOT, 'node_modules', 'typescript', 'bin', 'tsc'),
          '--noEmit',
          '--strict',
          '--target', 'ES2022',
          '--module', 'nodenext',
          '--moduleResolution', 'nodenext',
          '--verbatimModuleSyntax',
          '--noUncheckedIndexedAccess',
          file,
        ],
        { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] },
      );
    } catch (error) {
      ok = false;
      output = `${error.stdout ?? ''}${error.stderr ?? ''}`;
    }
    return { ok, output };
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
};

const PRELUDE = [
  "import type { ScenarioLineDataset } from '../src/app/comparisonConfig.js';",
  "import { WEALTH_STACK } from '../src/app/chartConfig.js';",
  'declare const line: ScenarioLineDataset;',
];

test('tsc REFUSES a scenario line spread into the wealth stack — TS2322, the spread form and all', () => {
  const result = tsc([...PRELUDE, 'const bad: ScenarioLineDataset = { ...line, stack: WEALTH_STACK };'].join('\n'));
  assert.equal(result.ok, false, 'a comparison dataset can be given the wealth stack and still compile');
  assert.match(result.output, /TS2322/, `expected an assignability error, got:\n${result.output}`);
  // The diagnostic reads *"Type 'string' is not assignable to type 'undefined'"* rather than
  // naming `stack`: with `exactOptionalPropertyTypes` off — the project's own setting — the
  // declared `stack?: never` is `never | undefined`, so `undefined` is the only value it admits
  // and a `string` is refused against that. Recorded here so the next reader does not take the
  // wording for the wrong property.
  assert.match(result.output, /Type 'string' is not assignable to type 'undefined'/);
});

test('…and the POSITIVE CONTROL: the honest dataset, spread and all, compiles', () => {
  const result = tsc([...PRELUDE, 'const fine: ScenarioLineDataset = { ...line };', 'void fine;'].join('\n'));
  assert.equal(result.ok, true, `the probe’s own baseline does not compile, so the refusal above proves nothing:\n${result.output}`);
});

test('a stack of ANY string is refused by the type too, not just the partition’s own name', () => {
  const result = tsc([...PRELUDE, "const bad: ScenarioLineDataset = { ...line, stack: 'mine' };"].join('\n'));
  assert.equal(result.ok, false);
  assert.match(result.output, /TS2322/);
});

// --- §4 The band side of the house is not imported here at all -------------------------------------

test('RAW SOURCE — comparisonConfig.ts imports nothing that can carry a band or a stack', () => {
  const raw = readFileSync(join(SRC, 'app', 'comparisonConfig.ts'), 'utf8');
  // Import specifiers off the RAW text, and the imported NAMES with them: the stripped code blanks
  // string literals, so an import can only be read here.
  const specifiers = [...raw.matchAll(/\bfrom\s*['"]([^'"]+)['"]/g)].map(([, specifier]) => specifier);
  // `./todaysDollars.js` and `../core/money.js` since P2-7: this chart converts each point to the
  // page's money basis, exactly as the focused chart does and off the same toggle. Neither carries
  // a band, a stack or a colour — `todaysDollars.ts` is arithmetic and two prose constants, and
  // `money.ts` is imported for the `Cents` type alone.
  // `./monthsToSeries.js` and the two `chartConfig.ts` constants since the "What Centrelink counts"
  // view: the assets-test lines' labels, colours and caveat — prose and hex strings, no stack.
  // `AGE_PENSION_AGE_COLOUR` and `./financialYearRows.js`'s `monthName` since the Age Pension age
  // rules: a hex string and a month-name formatter for the subtitle note, no stack.
  assert.deepEqual(specifiers, ['./chartConfig.js', './chartConfig.js', './monthsToSeries.js', './monthsToSeries.js', './scenarioStyle.js', './todaysDollars.js', './todaysDollars.js', '../core/money.js', './financialYearRows.js', './comparisonSeries.js', './comparisonSeries.js']);
  const named = [...raw.matchAll(/import(?:\s+type)?\s*\{([^}]*)\}/g)].flatMap(([, list]) => list.split(',').map((name) => name.trim()));
  assert.deepEqual(named, ['AGE_PENSION_AGE_COLOUR', 'ASSETS_TEST_ONLY_NOTE', 'THRESHOLD_COLOURS', 'ageAxisTitle', 'xAxisTickPlan', 'AxisMode', 'XAxisTickPlan', 'THRESHOLD_LABELS', 'ThresholdKey', 'scenarioStyles', 'MONEY_VIEW_BASIS', 'moneyLens', 'MoneyBasis', 'Cents', 'monthName', 'SHORTFALL_IN_LIST_NOTE', 'ComparisonSeries', 'ScenarioComparisonLine']);
  for (const banned of ['WEALTH_STACK', 'WealthStack', 'BandDataset', 'WealthBand', 'WealthBandKey', 'OverlayDataset', 'monthsToSeries']) {
    assert.ok(!named.includes(banned), `comparisonConfig.ts imports ${banned}`);
  }
  // Positive control on the walker: it found the imports that ARE there, and they are used.
  assert.ok(named.includes('xAxisTickPlan'));
  assert.match(raw.replaceAll(/\/\*[\s\S]*?\*\//g, '').replaceAll(/\/\/.*$/gm, ''), /xAxisTickPlan\(series\.months\)/);
});

// --- §5 P7-7: identification, the legend, and the absence of captions ------------------------------

test('every line is identified by its SCENARIO ID’s style, and six of them are six distinct lines', () => {
  const series = seriesOf(6);
  const config = comparisonChartConfig(series, FUTURE);
  const styles = scenarioStyles(series.lines.map((line) => line.scenarioId));
  const seen = new Set();
  for (const dataset of config.data.datasets) {
    const style = styles.get(dataset.scenarioId);
    assert.equal(dataset.borderColor, style.colour);
    assert.deepEqual([...dataset.borderDash], [...style.dash]);
    seen.add(`${dataset.borderColor}|${dataset.borderDash.join(',')}`);
    assert.equal(dataset.key, `scenario:${dataset.scenarioId}`);
  }
  assert.equal(seen.size, 6, 'two of the six lines are drawn identically');
});

test('the colours do not move when a scenario is added — the same ids keep the same lines', () => {
  const before = comparisonChartConfig(seriesOf(3), FUTURE);
  const after = comparisonChartConfig(seriesOf(4), FUTURE);
  for (const dataset of before.data.datasets) {
    const same = after.data.datasets.find((candidate) => candidate.scenarioId === dataset.scenarioId);
    assert.equal(same.borderColor, dataset.borderColor, `${dataset.scenarioId} changed colour when a scenario was added`);
    assert.deepEqual([...same.borderDash], [...dataset.borderDash]);
  }
  // Control: the fourth scenario really is new, and the array positions really did move.
  assert.equal(after.data.datasets.length, 4);
});

test('two scenarios with the SAME NAME are still two legend entries', () => {
  const config = comparisonChartConfig(seriesOf(3, ['Plan', 'Plan', 'Other']), FUTURE);
  const labels = config.data.datasets.map((dataset) => dataset.label);
  assert.equal(new Set(labels).size, 3, `the legend cannot tell two lines apart: ${labels.join(' / ')}`);
  assert.deepEqual(labels, ['Plan (baseline)', 'Plan (fork-0)', 'Other']);
});

test('the legend is on, at the bottom, and has no height cap to drop an entry into', () => {
  const config = comparisonChartConfig(seriesOf(6), FUTURE);
  const legend = config.options.plugins.legend;
  assert.equal(legend.display, true);
  assert.equal(legend.position, 'bottom');
  assert.equal(legend.maxHeight, undefined, 'a capped legend silently drops the scenarios that do not fit');
  assert.equal(config.options.plugins.decimation.enabled, false);
  assert.equal(config.options.plugins.title.text, COMPARISON_TITLE);
  // That line above compares a constant with itself: emptying `COMPARISON_TITLE` empties both sides
  // and it stays green, which is how this chart could ship with no title at all and nothing in the
  // suite failing (P4-15). What it actually has to defend is that the title is DISPLAYED, is real
  // text, and says what the lines are — not its wording, which may be reworded freely.
  assert.equal(config.options.plugins.title.display, true, 'the comparison chart’s title is built but not drawn');
  assert.ok(
    COMPARISON_TITLE.trim().length >= 15,
    `the comparison chart’s title is ${COMPARISON_TITLE.trim().length} characters — too short to say what the chart is`,
  );
  assert.match(COMPARISON_TITLE, /wealth/i, 'the title no longer names what the lines measure');
  assert.match(COMPARISON_TITLE, /scenario/i, 'the title no longer says a line is a scenario — the one thing this chart is for');
  // The basis line is FIRST here too — this chart states which money it is in, in every state, for
  // the reason the focused one does (ADR-0001).
  assert.deepEqual([...config.options.plugins.subtitle.text], [
    MONEY_VIEW_BASIS.futureDollars,
    ...seriesOf(6).notes,
    agePensionAgeRulesNote(seriesOf(6).agePensionAge.lines),
    ...seriesOf(6).agePensionAge.notes,
  ]);
});

test('the rules carry NO caption — there is no field for one, and they point at real months', () => {
  const series = seriesOf(2);
  const config = comparisonChartConfig(series, FUTURE);
  for (const rule of config.rules) {
    assert.deepEqual(Object.keys(rule).sort(), ['colour', 'index', 'month', 'scenarioId']);
    assert.equal(series.months[rule.index], rule.month);
    assert.ok(rule.index >= 0);
  }
  // One rule per scenario that HAS a Shortfall Age, and none for one that does not — besides the
  // Age Pension age rules, which belong to no scenario.
  assert.equal(config.rules.filter((rule) => rule.scenarioId !== AGE_PENSION_AGE_RULE_SCENARIO_ID).length, series.lines.filter((line) => line.shortfall.outcome === 'shortfall').length);
  assert.ok(!JSON.stringify(config.rules).includes('caption'));
});

test('nothing is computed here: every dataset is one of the series’ own value arrays', () => {
  const series = seriesOf(3);
  const config = comparisonChartConfig(series, FUTURE);
  const known = new Set(series.lines.map((line) => JSON.stringify([...line.values])));
  for (const dataset of config.data.datasets) {
    assert.ok(known.has(JSON.stringify([...dataset.data])), 'a dataset holds numbers the series did not');
  }
  assert.deepEqual(config.xTicks, xAxisTickPlan(series.months));
});

test('the axis mode picks the label set and moves no data point', () => {
  const series = seriesOf(2);
  const date = comparisonChartConfig(series, FUTURE, 'date');
  const age = comparisonChartConfig(series, FUTURE, 'age');
  assert.deepEqual([...date.data.labels], [...series.months]);
  assert.deepEqual(age.data.labels.length, series.ageAxis.labels.length);
  assert.deepEqual(
    date.data.datasets.map((dataset) => [...dataset.data]),
    age.data.datasets.map((dataset) => [...dataset.data]),
  );
  assert.match(age.options.scales.x.title.text, /^Age — /);
  assert.deepEqual(date.options.scales.x, {});
  assert.deepEqual(date.xTicks, age.xTicks);
});

test('the config is frozen all the way down — Chart.js must be handed the clone, never this', () => {
  const config = comparisonChartConfig(seriesOf(2), FUTURE);
  assert.ok(Object.isFrozen(config));
  assert.ok(Object.isFrozen(config.data));
  assert.ok(Object.isFrozen(config.data.datasets));
  for (const dataset of config.data.datasets) assert.ok(Object.isFrozen(dataset));
  assert.ok(Object.isFrozen(config.options));
  assert.ok(Object.isFrozen(config.rules));
});
