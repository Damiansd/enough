// P6-8c — the crossover marker: `comparisonSeries.ts` wires `crossover.ts`'s `crossoverPoint` onto
// exactly-two-Scenario comparisons, and `comparisonConfig.ts` draws it as ONE MORE bare rule,
// reusing the same `renderChart.ts` plugin a Shortfall Age rule already uses — no new drawing code.
//
// §1-§2 build a `ComparisonSeries`-shaped object by HAND, so the drawing half is proven without the
// engine. §3-§5 go through the real engine, and assert AGREEMENT with `crossoverPoint` called
// directly on the same two walks, rather than a hardcoded index — the wiring is what is under test,
// not a number this walk happens to produce today.
import test from 'node:test';
import assert from 'node:assert/strict';

import { DEMO_ENTRIES, DEMO_PLAN } from '../dist/app/demoHousehold.js';
import { toCents } from '../dist/core/money.js';
import { parsePlan } from '../dist/core/parsePlan.js';
import { scenarioWalks } from '../dist/app/scenarioWalks.js';
import { comparisonSeries } from '../dist/app/comparisonSeries.js';
import { crossoverPoint } from '../dist/app/crossover.js';
import { CROSSOVER_RULE_COLOUR, CROSSOVER_RULE_SCENARIO_ID, comparisonChartConfig } from '../dist/app/comparisonConfig.js';
import { scenarioStyles } from '../dist/app/scenarioStyle.js';

const FUTURE = { view: 'futureDollars', asAtDate: DEMO_PLAN.settings.asAtDate, cpi: DEMO_PLAN.settings.economicSeries.cpi };

// --- §1-§2 The drawing half, hand-built (no engine call) --------------------------------------------

const handSeries = (crossover) => ({
  months: ['2027-01', '2027-02', '2027-03'],
  ageAxis: { personNames: [], labels: [[], [], []] },
  lines: [
    { scenarioId: 'a', name: 'A', values: [1, 2, 3], shortfall: { outcome: 'never', month: undefined, index: undefined, text: 'x' }, agePension: { monthsPaid: 0, totalMonths: 3, firstMonth: undefined, text: 'y' } },
    { scenarioId: 'b', name: 'B', values: [1, 2, 3], shortfall: { outcome: 'never', month: undefined, index: undefined, text: 'x' }, agePension: { monthsPaid: 0, totalMonths: 3, firstMonth: undefined, text: 'y' } },
  ],
  styleIds: ['a', 'b'],
  notes: [],
  agePensionAge: { lines: [], notes: [] },
  ...(crossover === undefined ? {} : { crossover }),
});

test('a series with a crossover draws exactly one extra rule, in the neutral colour, at the right index', () => {
  const withCrossover = handSeries({ index: 1, month: '2027-02', leaderScenarioId: 'b' });
  const withoutCrossover = handSeries(undefined);
  const configWith = comparisonChartConfig(withCrossover, FUTURE);
  const configWithout = comparisonChartConfig(withoutCrossover, FUTURE);
  assert.equal(configWith.rules.length, configWithout.rules.length + 1);
  const crossoverRule = configWith.rules.find((rule) => rule.scenarioId === CROSSOVER_RULE_SCENARIO_ID);
  assert.ok(crossoverRule);
  assert.equal(crossoverRule.index, 1);
  assert.equal(crossoverRule.month, '2027-02');
  assert.equal(crossoverRule.colour, CROSSOVER_RULE_COLOUR);
});

test('the crossover colour is neither scenario style colour used on this fixture — a reader cannot mistake it for a line', () => {
  const series = handSeries({ index: 1, month: '2027-02', leaderScenarioId: 'b' });
  const config = comparisonChartConfig(series, FUTURE);
  const styles = scenarioStyles(['a', 'b']);
  for (const style of styles.values()) assert.notEqual(CROSSOVER_RULE_COLOUR, style.colour);
});

test('no crossover on the series draws no crossover rule at all', () => {
  const config = comparisonChartConfig(handSeries(undefined), FUTURE);
  assert.equal(config.rules.some((rule) => rule.scenarioId === CROSSOVER_RULE_SCENARIO_ID), false);
});

// --- §3-§5 The compute half, through the real engine, checked for AGREEMENT -------------------------

// **`planningHorizonAge: 85`, not the demo's own 100.** At the demo's full horizon BOTH scenarios
// below run their money out entirely (shortfall, both at $0) — a genuine tie in the LAST month
// compared, which `crossoverPoint` correctly reports as `'noStableCrossing'` (§3below would then
// only ever exercise the `else` branch). Ending the walk at 85 stops it before either goes broke,
// which is what lets this fixture actually reach `'crossed'` and exercise both branches — verified
// once by hand (`crossoverPoint` on the real walks reports `{ outcome: 'crossed', index: 57,
// month: '2031-06', leader: 'a' }` at the time this was written) and asserted here by AGREEMENT
// rather than by repeating that number, so a later change to `nominalReturn` or the demo figures
// cannot silently make this fixture stop testing the branch it exists to test without the test
// itself failing loudly (see the `assert.equal(direct.outcome, 'crossed', …)` sanity check below).
const twoScenarioPlan = (extraA, extraB) => {
  const entries = [...DEMO_ENTRIES, extraA, extraB];
  const scenarios = [
    { id: 'super-side', name: 'Super side', parentId: null, entryIds: [...DEMO_ENTRIES.map((e) => e.id), extraA.id] },
    { id: 'invest-side', name: 'Invest side', parentId: null, entryIds: [...DEMO_ENTRIES.map((e) => e.id), extraB.id] },
  ];
  const settings = { ...DEMO_PLAN.settings, planningHorizonAge: 85 };
  return parsePlan(JSON.parse(JSON.stringify({ ...DEMO_PLAN, settings, entries, scenarios, activeScenarioId: 'super-side' })));
};

const SUPER_ENTRY = {
  id: 'crossover-super', date: '2026-10-01', owner: 'personA', type: 'SUPER_CONTRIBUTION',
  params: { kind: 'salarySacrificed', annualAmount: toCents(15_000), interestIndex: 0 },
  enabled: true, createdAt: '2026-09-22',
};
const INVEST_ENTRY = {
  id: 'crossover-invest', date: '2026-10-01', owner: 'personA', type: 'NON_SUPER_INVESTMENT',
  params: { direction: 'buy', amount: toCents(400_000), incidentalCostsOfAcquisition: toCents(0) },
  enabled: true, createdAt: '2026-09-22',
};

test('a plan with exactly TWO scenarios agrees with crossoverPoint called on the same two walks', () => {
  const plan = twoScenarioPlan(SUPER_ENTRY, INVEST_ENTRY);
  const walks = scenarioWalks(plan);
  const series = comparisonSeries(plan, walks);
  const direct = crossoverPoint(walks.byScenarioId.get('super-side'), walks.byScenarioId.get('invest-side'));
  // The sanity check the header promises: this fixture is chosen to reach 'crossed', so a change
  // that silently moved it back to 'noStableCrossing' (or the reverse) fails loudly, HERE, rather
  // than quietly reducing the assertions below to the weaker branch.
  assert.equal(direct.outcome, 'crossed', `expected this fixture to cross; got ${JSON.stringify(direct)}`);

  assert.ok(series.crossover);
  assert.equal(series.crossover.index, direct.index);
  assert.equal(series.crossover.month, direct.month);
  assert.equal(series.crossover.leaderScenarioId, direct.leader === 'a' ? 'super-side' : 'invest-side');
});

test('three UNRELATED root scenarios (no sibling relationship, not exactly two) never carries a crossover', () => {
  const plan = twoScenarioPlan(SUPER_ENTRY, INVEST_ENTRY);
  const withBaseline = {
    ...plan,
    // All three are ROOTS here (`parentId: null` on every one) — distinct from the sibling-pair
    // fixture below, where the two sides are forked FROM the Baseline and `crossoverPairOf` finds
    // them by that relationship rather than by the scenario count.
    scenarios: [{ id: 'baseline', name: 'Baseline', parentId: null, entryIds: DEMO_ENTRIES.map((e) => e.id) }, ...plan.scenarios],
  };
  const parsed = parsePlan(JSON.parse(JSON.stringify(withBaseline)));
  const series = comparisonSeries(parsed, scenarioWalks(parsed));
  assert.equal(parsed.scenarios.length, 3);
  assert.equal(series.crossover, undefined);
});

test('a SIBLING PAIR forked from a shared Baseline (the real superVsInvestTemplate shape) still carries a crossover, with the Baseline present as a third scenario', () => {
  const settings = { ...DEMO_PLAN.settings, planningHorizonAge: 85 };
  const entries = [...DEMO_ENTRIES, SUPER_ENTRY, INVEST_ENTRY];
  const scenarios = [
    { id: 'baseline', name: 'Baseline', parentId: null, entryIds: DEMO_ENTRIES.map((e) => e.id) },
    { id: 'super-side', name: 'Super side', parentId: 'baseline', entryIds: [SUPER_ENTRY.id] },
    { id: 'invest-side', name: 'Invest side', parentId: 'baseline', entryIds: [INVEST_ENTRY.id] },
  ];
  const plan = parsePlan(JSON.parse(JSON.stringify({ ...DEMO_PLAN, settings, entries, scenarios, activeScenarioId: 'baseline' })));
  assert.equal(plan.scenarios.length, 3);
  const walks = scenarioWalks(plan);
  const series = comparisonSeries(plan, walks);
  const direct = crossoverPoint(walks.byScenarioId.get('super-side'), walks.byScenarioId.get('invest-side'));
  assert.equal(direct.outcome, 'crossed', `expected this fixture to cross; got ${JSON.stringify(direct)}`);
  assert.ok(series.crossover);
  assert.equal(series.crossover.index, direct.index);
  assert.equal(series.crossover.leaderScenarioId, direct.leader === 'a' ? 'super-side' : 'invest-side');
});

test('a group of FOUR children of one Baseline is not "one sibling pair" — no crossover', () => {
  const scenarios = [
    { id: 'baseline', name: 'Baseline', parentId: null, entryIds: DEMO_ENTRIES.map((e) => e.id) },
    { id: 'c1', name: 'C1', parentId: 'baseline', entryIds: [] },
    { id: 'c2', name: 'C2', parentId: 'baseline', entryIds: [] },
    { id: 'c3', name: 'C3', parentId: 'baseline', entryIds: [] },
    { id: 'c4', name: 'C4', parentId: 'baseline', entryIds: [] },
  ];
  const plan = parsePlan(JSON.parse(JSON.stringify({ ...DEMO_PLAN, scenarios, activeScenarioId: 'baseline' })));
  const series = comparisonSeries(plan, scenarioWalks(plan));
  assert.equal(series.crossover, undefined);
});

test('TWO DIFFERENT sibling pairs (two guided comparisons run back to back) is ambiguous — no crossover', () => {
  const scenarios = [
    { id: 'baseline1', name: 'Baseline 1', parentId: null, entryIds: DEMO_ENTRIES.map((e) => e.id) },
    { id: 'a1', name: 'A1', parentId: 'baseline1', entryIds: [] },
    { id: 'b1', name: 'B1', parentId: 'baseline1', entryIds: [] },
    { id: 'baseline2', name: 'Baseline 2', parentId: null, entryIds: DEMO_ENTRIES.map((e) => e.id) },
    { id: 'a2', name: 'A2', parentId: 'baseline2', entryIds: [] },
    { id: 'b2', name: 'B2', parentId: 'baseline2', entryIds: [] },
  ];
  const plan = parsePlan(JSON.parse(JSON.stringify({ ...DEMO_PLAN, scenarios, activeScenarioId: 'baseline1' })));
  const series = comparisonSeries(plan, scenarioWalks(plan));
  assert.equal(series.crossover, undefined);
});

test('two scenarios with IDENTICAL entries never cross (tied throughout) — no crossover', () => {
  const scenarios = [
    { id: 'x', name: 'X', parentId: null, entryIds: DEMO_ENTRIES.map((e) => e.id) },
    { id: 'y', name: 'Y', parentId: null, entryIds: DEMO_ENTRIES.map((e) => e.id) },
  ];
  const plan = parsePlan(JSON.parse(JSON.stringify({ ...DEMO_PLAN, scenarios, activeScenarioId: 'x' })));
  const series = comparisonSeries(plan, scenarioWalks(plan));
  assert.equal(series.crossover, undefined);
});
