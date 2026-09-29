// The "Scenarios shown" picker's pure half (`scenarioSelection.ts`): which walks the Compare chart
// draws, rebuilt from the ticked subset so the crossover is the pair ON SCREEN, and styled over the
// whole plan so no line changes colour when another is unticked.
//
// The fixture is three ROOT scenarios. Two of them are the crossover-marker suite's pair, chosen
// (horizon 85) because they genuinely cross; the third is given an id that CONTENDS for
// `super-side`'s palette slot and sorts before it, so `super-side` is displaced in the full plan —
// which is the only arrangement in which styling the ticked subset alone would draw it differently.
import test from 'node:test';
import assert from 'node:assert/strict';

import { DEMO_ENTRIES, DEMO_PLAN } from '../dist/app/demoHousehold.js';
import { toCents } from '../dist/core/money.js';
import { parsePlan } from '../dist/core/parsePlan.js';
import { scenarioWalks } from '../dist/app/scenarioWalks.js';
import { comparisonSeries } from '../dist/app/comparisonSeries.js';
import { crossoverPoint } from '../dist/app/crossover.js';
import { comparisonChartConfig } from '../dist/app/comparisonConfig.js';
import { preferredSlot, scenarioStyles } from '../dist/app/scenarioStyle.js';
import {
  NO_SCENARIOS_TICKED,
  reconcileTicked,
  tickedComparison,
  tickedSummary,
} from '../dist/app/scenarioSelection.js';

const FUTURE = { view: 'futureDollars', asAtDate: DEMO_PLAN.settings.asAtDate, cpi: DEMO_PLAN.settings.economicSeries.cpi };

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

const COLLIDER = (() => {
  for (let index = 0; index < 100_000; index += 1) {
    const id = `a${index}`;
    if (preferredSlot(id) === preferredSlot('super-side')) return id;
  }
  throw new Error('no colliding id found');
})();

const demoIds = DEMO_ENTRIES.map((entry) => entry.id);
const PLAN = parsePlan(
  JSON.parse(
    JSON.stringify({
      ...DEMO_PLAN,
      settings: { ...DEMO_PLAN.settings, planningHorizonAge: 85 },
      entries: [...DEMO_ENTRIES, SUPER_ENTRY, INVEST_ENTRY],
      scenarios: [
        { id: COLLIDER, name: 'Baseline', parentId: null, entryIds: demoIds },
        { id: 'super-side', name: 'Super side', parentId: null, entryIds: [...demoIds, SUPER_ENTRY.id] },
        { id: 'invest-side', name: 'Invest side', parentId: null, entryIds: [...demoIds, INVEST_ENTRY.id] },
      ],
      activeScenarioId: COLLIDER,
    }),
  ),
);
const WALKS = scenarioWalks(PLAN);
const FULL = comparisonSeries(PLAN, WALKS);
const ALL_IDS = PLAN.scenarios.map((scenario) => scenario.id);

const subsets = (ids) =>
  ids.reduce((acc, id) => [...acc, ...acc.map((subset) => [...subset, id])], [[]]);

const lineStyles = (series) =>
  new Map(comparisonChartConfig(series, FUTURE).data.datasets.map((d) => [d.scenarioId, JSON.stringify([d.borderColor, d.borderDash])]));

test('nothing ticked draws nothing — no series, not an empty one', () => {
  assert.equal(tickedComparison(PLAN, WALKS, new Set()), undefined);
  assert.match(NO_SCENARIOS_TICKED, /tick one/i);
});

test('one ticked is one line: that scenario’s own figures, and no crossover', () => {
  for (const id of ALL_IDS) {
    const series = tickedComparison(PLAN, WALKS, new Set([id]));
    assert.deepEqual(series.lines.map((line) => line.scenarioId), [id]);
    assert.deepEqual(series.lines[0].values, FULL.lines.find((line) => line.scenarioId === id).values);
    assert.equal(series.crossover, undefined);
  }
});

test('the crossing pair ticked alone carries the crossover crossoverPoint finds on those two walks', () => {
  const direct = crossoverPoint(WALKS.byScenarioId.get('super-side'), WALKS.byScenarioId.get('invest-side'));
  assert.equal(direct.outcome, 'crossed', `expected this fixture to cross; got ${JSON.stringify(direct)}`);
  const series = tickedComparison(PLAN, WALKS, new Set(['invest-side', 'super-side']));
  assert.deepEqual(series.lines.map((line) => line.scenarioId), ['super-side', 'invest-side'], 'not in the plan’s order');
  assert.ok(series.crossover, 'two ticked lines that cross drew no crossover');
  assert.equal(series.crossover.index, direct.index);
  assert.equal(series.crossover.leaderScenarioId, direct.leader === 'a' ? 'super-side' : 'invest-side');
});

test('the crossover is present only when exactly two lines are ticked', () => {
  let counted = 0;
  for (const subset of subsets(ALL_IDS)) {
    const series = tickedComparison(PLAN, WALKS, new Set(subset));
    if (subset.length !== 2) {
      assert.equal(series?.crossover, undefined, `a crossover with ${subset.length} ticked`);
      counted += 1;
    }
  }
  assert.equal(counted, 5);
  assert.equal(FULL.crossover, undefined, 'the fixture’s three roots must not cross on their own, or the 3-ticked case is vacuous');
});

test('all N ticked is the whole comparison, line for line', () => {
  const series = tickedComparison(PLAN, WALKS, new Set(ALL_IDS));
  assert.deepEqual(series.lines.map((line) => line.scenarioId), ALL_IDS);
  assert.deepEqual(series.lines.map((line) => [...line.values]), FULL.lines.map((line) => [...line.values]));
  assert.deepEqual(series.months, FULL.months);
});

test('every scenario keeps its colour and dash whatever else is unticked — including one displaced by a collision', () => {
  const full = scenarioStyles(ALL_IDS);
  assert.notEqual(full.get('super-side').slot, preferredSlot('super-side'), 'the fixture no longer displaces super-side — this test would be vacuous');
  const reference = lineStyles(FULL);
  let compared = 0;
  for (const subset of subsets(ALL_IDS)) {
    if (subset.length === 0) continue;
    const styles = lineStyles(tickedComparison(PLAN, WALKS, new Set(subset)));
    for (const [id, style] of styles) {
      assert.equal(style, reference.get(id), `${id} changed style with only [${subset.join(', ')}] ticked`);
      compared += 1;
    }
  }
  assert.equal(compared, 12);
});

test('a deleted scenario’s id is dropped from the ticked set, and a stale id draws nothing', () => {
  const afterDelete = { ...PLAN, scenarios: PLAN.scenarios.filter((scenario) => scenario.id !== 'invest-side') };
  const ticked = reconcileTicked(new Set(ALL_IDS), ALL_IDS, afterDelete);
  assert.deepEqual([...ticked].sort(), [COLLIDER, 'super-side'].sort());
  assert.equal(tickedComparison(afterDelete, WALKS, new Set(['invest-side'])), undefined);
  assert.equal(tickedSummary(afterDelete, new Set(['invest-side', 'super-side'])), 'Scenarios shown (1 of 2)');
});

test('a new scenario arrives ticked, and one the reader unticked stays unticked', () => {
  const before = [COLLIDER, 'super-side'];
  const ticked = reconcileTicked(new Set([COLLIDER]), before, PLAN);
  assert.deepEqual([...ticked].sort(), [COLLIDER, 'invest-side'].sort());
  assert.deepEqual([...reconcileTicked(new Set(), [], PLAN)], ALL_IDS, 'the first draw does not tick every scenario');
});

test('the summary counts the ticked scenarios the plan holds', () => {
  assert.equal(tickedSummary(PLAN, new Set(['super-side', 'invest-side'])), 'Scenarios shown (2 of 3)');
  assert.equal(tickedSummary(PLAN, new Set()), 'Scenarios shown (0 of 3)');
});
