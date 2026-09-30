// P18 — the "Try changes" slider sandbox's pure half (`sandbox.ts`). A sandbox is an unsaved child
// Scenario: moved sliders switch the parent's entry off in the child and add a replacement. The
// fixtures are the demo couple plus a second, later SPEND_CHANGE (so "every" is not "the first"), a
// refinance, and — in one plan — a second RETIRE for Dana (so "earliest" is not "latest").
import test from 'node:test';
import assert from 'node:assert/strict';

import { DEMO_ENTRIES, DEMO_PLAN } from '../dist/app/demoHousehold.js';
import { toCents } from '../dist/core/money.js';
import { parsePlan } from '../dist/core/parsePlan.js';
import { project } from '../dist/core/projection.js';
import { scenarioEntries, scenarioById } from '../dist/app/scenarioWalks.js';
import {
  NO_REFINANCE,
  NO_RETIRE,
  SANDBOX_NAME,
  UNMOVED,
  UPDATING,
  positionsMoved,
  reconcilePositions,
  retireAgeLabel,
  sandboxCandidate,
  sandboxFigures,
  sandboxSaved,
  sandboxSliders,
  sandboxWalk,
  shiftedDate,
  spendLabel,
  sustainableRow,
  monthsText,
} from '../dist/app/sandbox.js';

const LATER_SPEND = {
  id: 'spend-2040', date: '2040-01-01', owner: 'household', type: 'SPEND_CHANGE',
  params: { annualSpend: toCents(60_000) }, enabled: true, createdAt: '2026-08-20',
};
const REFINANCE = {
  id: 'refi', date: '2027-04-01', owner: 'household', type: 'MORTGAGE_REFINANCE',
  params: { openingBalance: toCents(300_000), annualInterestRate: 0.06, monthlyRepayment: toCents(2_600) },
  enabled: true, createdAt: '2026-08-20',
};
const SECOND_RETIRE = {
  id: 'dana-retires-again', date: '2033-06-01', owner: 'personA', type: 'RETIRE',
  params: {}, enabled: true, createdAt: '2026-08-20',
};

const planOf = (entries, household = DEMO_PLAN.household) =>
  parsePlan(JSON.parse(JSON.stringify({
    ...DEMO_PLAN,
    household,
    entries,
    scenarios: [{ id: 'baseline', name: 'Baseline', parentId: null, entryIds: entries.map((entry) => entry.id) }],
    activeScenarioId: 'baseline',
  })));

const PLAN = planOf([...DEMO_ENTRIES, LATER_SPEND, REFINANCE]);
const TWO_RETIRES = planOf([...DEMO_ENTRIES, LATER_SPEND, REFINANCE, SECOND_RETIRE]);

const IDS = { scenarioId: 'sandbox', entryId: (id) => `sandbox-${id}`, createdAt: '2026-09-30' };
const at = (positions) => ({ ...UNMOVED, ...positions });

const childEntries = (candidate) => scenarioEntries(candidate.plan, scenarioById(candidate.plan, candidate.sandboxId));
const enabledOf = (entries, type) => entries.filter((entry) => entry.type === type && entry.enabled);

const deepFreeze = (value) => {
  if (value !== null && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const inner of Object.values(value)) deepFreeze(inner);
  }
  return value;
};

test('each slider finds the EARLIEST enabled entry of its kind, and spend finds every enabled level', () => {
  const sliders = sandboxSliders(TWO_RETIRES, 'baseline');
  assert.deepEqual(sliders.retire.map((slider) => [slider.owner, slider.entry.id]), [['personA', 'dana-retires']]);
  assert.equal(sliders.retireReason, undefined);
  assert.equal(sliders.spend.kind, 'target');
  assert.deepEqual(sliders.spend.entries.map((entry) => entry.id), ['spend-2026', 'spend-2040']);
  assert.equal(sliders.spend.firstYearSpend, toCents(84_000));
  assert.equal(sliders.refinance.kind, 'target');
  assert.equal(sliders.refinance.entry.id, 'refi');
  assert.equal(sliders.refinance.max, toCents(600_000));
});

test('a slider with nothing to move says why and never invents an entry', () => {
  const bare = planOf(DEMO_ENTRIES.filter((entry) => entry.type !== 'RETIRE'));
  const sliders = sandboxSliders(bare, 'baseline');
  assert.deepEqual(sliders.retire, []);
  assert.equal(sliders.retireReason, NO_RETIRE);
  assert.deepEqual(sliders.refinance, { kind: 'none', reason: NO_REFINANCE });
  const candidate = sandboxCandidate(bare, 'baseline', at({ refinanceBalance: toCents(100_000), retireMonths: { personA: 5 } }), IDS);
  assert.equal(candidate.kind, 'candidate');
  assert.equal(candidate.plan.entries.length, bare.entries.length);
});

test('the retirement range runs from next month to age 75, and always contains where it starts', () => {
  const [slider] = sandboxSliders(PLAN, 'baseline').retire;
  // asAtDate 2026-09-01 → next month 2026-10; Dana (born 1968-05-14) turns 75 in 2043-05.
  assert.equal(shiftedDate(slider.entry.date, slider.minMonths).slice(0, 7), '2026-10');
  assert.equal(shiftedDate(slider.entry.date, slider.maxMonths).slice(0, 7), '2043-05');
  assert.ok(slider.minMonths <= 0 && slider.maxMonths >= 0);
  assert.equal(shiftedDate('2031-01-31', 1), '2031-02-28');
});

test('a household RETIRE is labelled with every Person\'s age; a personal one with the owner\'s', () => {
  assert.equal(retireAgeLabel(PLAN.household, 'household', '2031-05-14'), 'Dana 63y 0m · Ash 71y 3m');
  assert.equal(retireAgeLabel(PLAN.household, 'personA', '2031-05-14'), 'Dana 63y 0m');
  assert.equal(retireAgeLabel(PLAN.household, 'personB', '2031-05-14'), 'Ash 71y 3m');
});

test('moving retirement switches the parent\'s RETIRE off in the child, so exactly one projects', () => {
  const candidate = sandboxCandidate(PLAN, 'baseline', at({ retireMonths: { personA: 12 } }), IDS);
  assert.equal(candidate.kind, 'candidate');
  const retires = enabledOf(childEntries(candidate), 'RETIRE');
  assert.deepEqual(retires.map((entry) => [entry.id, entry.date]), [['sandbox-dana-retires', '2032-05-14']]);
  const child = scenarioById(candidate.plan, 'sandbox');
  assert.equal(child.name, SANDBOX_NAME);
  assert.equal(child.parentId, 'baseline');
  assert.deepEqual(child.entryOverrides, { 'dana-retires': false });
  // The parent is untouched: it still projects its own RETIRE.
  const parentRetires = enabledOf(scenarioEntries(candidate.plan, scenarioById(candidate.plan, 'baseline')), 'RETIRE');
  assert.deepEqual(parentRetires.map((entry) => entry.id), ['dana-retires']);
});

test('with two RETIREs for one Person the EARLIEST moves and the later one is left alone', () => {
  const candidate = sandboxCandidate(TWO_RETIRES, 'baseline', at({ retireMonths: { personA: 3 } }), IDS);
  assert.equal(candidate.kind, 'candidate');
  const retires = enabledOf(childEntries(candidate), 'RETIRE');
  assert.deepEqual(
    retires.map((entry) => [entry.id, entry.date]).sort(),
    [['dana-retires-again', '2033-06-01'], ['sandbox-dana-retires', '2031-08-14']],
  );
});

test('the spend factor scales EVERY enabled SPEND_CHANGE, never only the first', () => {
  const candidate = sandboxCandidate(PLAN, 'baseline', at({ spendFactor: 0.9 }), IDS);
  assert.equal(candidate.kind, 'candidate');
  const spends = enabledOf(childEntries(candidate), 'SPEND_CHANGE');
  assert.deepEqual(
    spends.map((entry) => [entry.date, entry.params.annualSpend]),
    [['2026-09-01', toCents(75_600)], ['2040-01-01', toCents(54_000)]],
  );
  assert.equal(spendLabel(sandboxSliders(PLAN, 'baseline').spend, 0.9), '90% — $75,600 a year in the first year');
  // Upward too: a factor above 1 must raise every level, not be clamped (LIZ mutation, 2026-09-30).
  const raised = sandboxCandidate(PLAN, 'baseline', at({ spendFactor: 1.2 }), IDS);
  assert.deepEqual(
    enabledOf(childEntries(raised), 'SPEND_CHANGE').map((entry) => [entry.date, entry.params.annualSpend]),
    [['2026-09-01', toCents(100_800)], ['2040-01-01', toCents(72_000)]],
  );
});

test('the refinance slider moves openingBalance and keeps the rest of the loan\'s terms', () => {
  const candidate = sandboxCandidate(PLAN, 'baseline', at({ refinanceBalance: toCents(200_000) }), IDS);
  const [refinance] = enabledOf(childEntries(candidate), 'MORTGAGE_REFINANCE');
  assert.equal(refinance.id, 'sandbox-refi');
  assert.deepEqual(refinance.params, { ...REFINANCE.params, openingBalance: toCents(200_000) });
});

test('the candidate never mutates the plan it was built from', () => {
  const input = deepFreeze(JSON.parse(JSON.stringify(PLAN)));
  const before = JSON.stringify(input);
  const candidate = sandboxCandidate(input, 'baseline', at({ retireMonths: { personA: -6 }, spendFactor: 1.2, refinanceBalance: toCents(100_000) }), IDS);
  assert.equal(candidate.kind, 'candidate');
  assert.equal(JSON.stringify(input), before);
  assert.equal(input.scenarios.length, 1);
  assert.equal(input.entries.length, PLAN.entries.length);
});

test('Save: a live child of the parent, selected, holding only the slider entries — and it round-trips through parsePlan', () => {
  const candidate = sandboxCandidate(PLAN, 'baseline', at({ retireMonths: { personA: 12 }, spendFactor: 1.1 }), IDS);
  const saved = sandboxSaved(candidate, '  Retire a year later  ');
  const child = scenarioById(saved, 'sandbox');
  assert.equal(child.parentId, 'baseline');
  assert.equal(child.name, 'Retire a year later');
  assert.equal(saved.activeScenarioId, 'sandbox');
  assert.deepEqual(child.entryIds, ['sandbox-dana-retires', 'sandbox-spend-2026', 'sandbox-spend-2040']);

  const reread = parsePlan(JSON.parse(JSON.stringify(saved)));
  assert.deepEqual(reread, parsePlan(saved));
  // Live inheritance: the parent's untouched entries reach the child through parentId, not a copy.
  const ids = scenarioEntries(reread, scenarioById(reread, 'sandbox')).filter((entry) => entry.enabled).map((entry) => entry.id);
  assert.ok(ids.includes('new-roof'));
  assert.ok(ids.includes('refi'));
  assert.ok(!ids.includes('dana-retires'));
  assert.throws(() => sandboxSaved(candidate, '   '), /needs a name/);
});

test('a refusal is returned by name, never thrown: the door\'s ($0 refinance) and the TTR_START order', () => {
  const zero = sandboxCandidate(PLAN, 'baseline', at({ refinanceBalance: toCents(0) }), IDS);
  assert.equal(zero.kind, 'refused');
  assert.match(zero.reason, /openingBalance is 0 cents/);

  const [dana, ash] = DEMO_PLAN.household.persons;
  const household = { ...DEMO_PLAN.household, persons: [{ ...dana, superInterests: [...dana.superInterests, { phase: 'accumulation', balance: toCents(50_000) }] }, ash] };
  const ttr = { id: 'dana-ttr', date: '2029-06-01', owner: 'personA', type: 'TTR_START', params: { interestIndex: 1 }, enabled: true, createdAt: '2026-08-20' };
  const withTtr = planOf([...DEMO_ENTRIES, ttr], household);
  const early = sandboxCandidate(withTtr, 'baseline', at({ retireMonths: { personA: -30 } }), IDS);
  assert.equal(early.kind, 'refused');
  assert.match(early.reason, /transition to retirement pension can't start after it/);
});

test('the sandbox walk is one projection, and a walk the engine refuses comes back by name', () => {
  const candidate = sandboxCandidate(PLAN, 'baseline', at({ spendFactor: 1.2 }), IDS);
  let calls = 0;
  const walked = sandboxWalk(candidate, (settings, household, entries) => {
    calls += 1;
    return project(settings, household, entries);
  });
  assert.equal(walked.kind, 'walked');
  assert.equal(calls, 1);
  const refused = sandboxWalk(candidate, () => {
    throw new RangeError('entry x is after the Planning Horizon');
  });
  assert.deepEqual(refused, { kind: 'refused', reason: 'entry x is after the Planning Horizon' });
});

test('unmoved sliders write nothing, and the four figures agree with the parent', () => {
  assert.equal(positionsMoved(UNMOVED), false);
  assert.equal(positionsMoved(at({ retireMonths: { personA: 0 } })), false);
  assert.equal(positionsMoved(at({ spendFactor: 0.95 })), true);
  const candidate = sandboxCandidate(PLAN, 'baseline', UNMOVED, IDS);
  const child = scenarioById(candidate.plan, 'sandbox');
  assert.deepEqual(child.entryIds, []);
  assert.equal(child.entryOverrides, undefined);
  const parent = project(PLAN.settings, PLAN.household, scenarioEntries(PLAN, scenarioById(PLAN, 'baseline')));
  const walked = sandboxWalk(candidate);
  const rows = sandboxFigures(PLAN.household, PLAN.settings.economicSeries.agePension, parent, walked.months);
  assert.deepEqual(rows.map((row) => row.label), ['Money lasts until', 'Living on the Age Pension alone from', 'Mortgage paid off']);
  for (const row of rows) {
    assert.equal(row.sandbox, row.selected);
    assert.equal(row.difference, 'same');
  }
});

test('the figures show the difference, and a refused sandbox leaves its column blank rather than stale', () => {
  const parent = project(PLAN.settings, PLAN.household, scenarioEntries(PLAN, scenarioById(PLAN, 'baseline')));
  const smaller = sandboxWalk(sandboxCandidate(PLAN, 'baseline', at({ refinanceBalance: toCents(200_000) }), IDS));
  const [, , mortgage] = sandboxFigures(PLAN.household, undefined, parent, smaller.months);
  assert.match(mortgage.difference, /^(\d+ years?)?( ?\d+ months?)? earlier$/);
  // The one-sided case names what happened, never a bare "changed" (user ruling 2026-09-30: state the gap).
  const early = sandboxWalk(sandboxCandidate(PLAN, 'baseline', at({ spendFactor: 1.5 }), IDS));
  const [lasts] = sandboxFigures(PLAN.household, undefined, parent, early.months);
  assert.equal(lasts.difference, 'now runs out');
  const blank = sandboxFigures(PLAN.household, undefined, parent, undefined);
  for (const row of blank) {
    assert.equal(row.sandbox, '');
    assert.equal(row.difference, '');
  }
  assert.deepEqual(sustainableRow('updating', undefined).sandbox, '');
  // A gap inside the search's $12 resolution is noise, not a difference (LIZ, 2026-09-30: the page showed "−$2").
  assert.equal(sustainableRow({ sustainableAnnualSpend: toCents(83_421) }, { sustainableAnnualSpend: toCents(83_419) }).difference, 'same');
  assert.equal(sustainableRow({ sustainableAnnualSpend: toCents(83_421) }, { sustainableAnnualSpend: toCents(83_400) }).difference, '−$21');
  assert.equal(sustainableRow({ sustainableAnnualSpend: toCents(90_000) }, 'updating').sandbox, UPDATING);
  assert.equal(
    sustainableRow({ sustainableAnnualSpend: toCents(90_000) }, { sustainableAnnualSpend: toCents(95_500) }).difference,
    '+$5,500',
  );
});

test('a parent edit that removes a slider\'s target drops that slider\'s change with a notice', () => {
  const before = sandboxSliders(PLAN, 'baseline');
  const withoutRefi = planOf([...DEMO_ENTRIES, LATER_SPEND]);
  const after = sandboxSliders(withoutRefi, 'baseline');
  const kept = reconcilePositions(before, after, at({ refinanceBalance: toCents(1), retireMonths: { personA: 4 } }));
  assert.equal(kept.positions.refinanceBalance, undefined);
  assert.deepEqual(kept.positions.retireMonths, { personA: 4 });
  assert.equal(kept.notices.length, 1);
  assert.match(kept.notices[0], /refinance/);
});

test('a gap between two dates reads in plain words, later or earlier', () => {
  assert.equal(monthsText(0), 'same');
  assert.equal(monthsText(27), '2 years 3 months later');
  assert.equal(monthsText(-12), '1 year earlier');
  assert.equal(monthsText(-1), '1 month earlier');
  assert.equal(monthsText(5), '5 months later');
});
