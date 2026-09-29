// P6-8 microtask 2 — the guided-template generator: `superDestinationRefusal` and
// `superVsInvestTemplate`. Both are exercised against `DEMO_PLAN` (Dana holds an ACCUMULATION
// interest, Ash's is already an ACCOUNT-BASED PENSION — the fixture the refusal is built to catch)
// and every candidate produced is walked through the real `savePlan` door, never inspected raw.
import test from 'node:test';
import assert from 'node:assert/strict';

import { DEMO_PLAN } from '../dist/app/demoHousehold.js';
import { parsePlan } from '../dist/core/parsePlan.js';
import { savePlan, validatedPlan } from '../dist/app/planEdits.js';
import { superDestinationRefusal, superVsInvestTemplate } from '../dist/app/comparisonTemplate.js';

const plan = () => parsePlan(JSON.parse(JSON.stringify(DEMO_PLAN)));

const IDS = {
  superScenarioId: 'tpl-super',
  investScenarioId: 'tpl-invest',
  superEntryId: 'tpl-super-entry',
  investEntryId: 'tpl-invest-entry',
};

const INPUT = {
  annualAmount: '10000',
  startDate: '2027-01-01',
  endDate: '2029-01-01', // 24 months → 2 years → lump sum $20,000
  owner: 'personA', // Dana — accumulation, stored position 0, typed as account 1
  interestIndex: '1',
  incidentalCostsOfAcquisition: '0',
  note: '',
};

// --- §1 The destination refusal, said BEFORE generation -------------------------------------------

test('an accumulation destination (Dana, index 0) has no refusal', () => {
  assert.equal(superDestinationRefusal(DEMO_PLAN.household, 'personA', 0), undefined);
});

test('an account-based-pension destination (Ash, index 0) is refused, and names the phase', () => {
  const refusal = superDestinationRefusal(DEMO_PLAN.household, 'personB', 0);
  assert.equal(typeof refusal, 'string');
  assert.match(refusal, /account-based pension/);
  assert.doesNotMatch(refusal, /franking|imputation|ECPI|gross-up/i);
});

test('an interest position that does not exist is refused, naming the count', () => {
  const refusal = superDestinationRefusal(DEMO_PLAN.household, 'personA', 4);
  assert.match(refusal, /1 superannuation interest/);
});

test('a person position that does not exist (a one-person household) is refused', () => {
  const solo = { ...DEMO_PLAN.household, persons: [DEMO_PLAN.household.persons[0]] };
  assert.match(superDestinationRefusal(solo, 'personB', 0), /no.*second person/);
});

test('superVsInvestTemplate refuses an ineligible destination before generating anything', () => {
  const before = plan();
  assert.throws(
    () => superVsInvestTemplate(before, 'baseline', { ...INPUT, owner: 'personB', interestIndex: '1' }, IDS, '2026-09-22'),
    RangeError,
  );
});

// --- §2 A valid template: two clones, one entry each, both walkable through the real save gate ------

test('a valid template clones the scenario twice and writes one entry into each clone', () => {
  const before = plan();
  const candidate = superVsInvestTemplate(before, 'baseline', INPUT, IDS, '2026-09-22');
  const validated = validatedPlan(candidate);

  assert.equal(validated.plan.scenarios.length, 3);
  const superScenario = validated.plan.scenarios.find((s) => s.id === IDS.superScenarioId);
  const investScenario = validated.plan.scenarios.find((s) => s.id === IDS.investScenarioId);
  assert.ok(superScenario);
  assert.ok(investScenario);
  assert.equal(superScenario.parentId, 'baseline');
  assert.equal(investScenario.parentId, 'baseline');
  assert.deepEqual(superScenario.entryIds, [IDS.superEntryId]);
  assert.deepEqual(investScenario.entryIds, [IDS.investEntryId]);

  const superEntry = validated.plan.entries.find((e) => e.id === IDS.superEntryId);
  const investEntry = validated.plan.entries.find((e) => e.id === IDS.investEntryId);
  assert.equal(superEntry.type, 'SUPER_CONTRIBUTION');
  assert.equal(superEntry.params.kind, 'salarySacrificed');
  assert.equal(superEntry.params.annualAmount, 10_000_00);
  assert.equal(superEntry.params.interestIndex, 0, 'typed super account 1 is stored as position 0');
  assert.equal(investEntry.type, 'NON_SUPER_INVESTMENT');
  assert.equal(investEntry.params.direction, 'buy');
  // 24 months at $10,000/yr = $20,000 lump sum.
  assert.equal(investEntry.params.amount, 20_000_00);

  // Both walk — this is the assertion that the save gate was genuinely exercised, not skipped.
  assert.ok(validated.walks.byScenarioId.get(IDS.superScenarioId).length > 0);
  assert.ok(validated.walks.byScenarioId.get(IDS.investScenarioId).length > 0);

  // The ORIGINAL scenario is untouched — append-only, on `scenarioCloned`'s own ground.
  const baseline = validated.plan.scenarios.find((s) => s.id === 'baseline');
  assert.deepEqual(baseline.entryIds, DEMO_PLAN.scenarios[0].entryIds);
});

test('the candidate saves through the real savePlan door, not a shortcut', async () => {
  const before = plan();
  const candidate = superVsInvestTemplate(before, 'baseline', INPUT, IDS, '2026-09-22');
  let written;
  const transport = { writePlan: async (p) => { written = p; } };
  const result = await savePlan(transport, candidate);
  assert.ok(written);
  assert.equal(result.plan.scenarios.length, 3);
});

// --- §3 The date range must run forward ------------------------------------------------------------

test('an end date on or before the start date is refused, before touching the door', () => {
  const before = plan();
  assert.throws(
    () => superVsInvestTemplate(before, 'baseline', { ...INPUT, endDate: INPUT.startDate }, IDS, '2026-09-22'),
    RangeError,
  );
  assert.throws(
    () => superVsInvestTemplate(before, 'baseline', { ...INPUT, endDate: '2026-06-01' }, IDS, '2026-09-22'),
    RangeError,
  );
});

// --- §4 Money is never invented: a blank brokerage box is refused, not defaulted to 0 ---------------

test('a blank incidentalCostsOfAcquisition is refused at the door, not silently zeroed', () => {
  const before = plan();
  const candidate = superVsInvestTemplate(before, 'baseline', { ...INPUT, incidentalCostsOfAcquisition: '' }, IDS, '2026-09-22');
  assert.throws(() => validatedPlan(candidate));
});

// --- §5 Unknown source scenario -----------------------------------------------------------------

test('an unknown source scenario id is refused', () => {
  const before = plan();
  assert.throws(() => superVsInvestTemplate(before, 'not-a-scenario', INPUT, IDS, '2026-09-22'), RangeError);
});
