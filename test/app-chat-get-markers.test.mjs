// plan_ai.md §5 and §13 microtask 6 — `getMarkers`: `outcomes.ts`'s markers, through the identity
// guard. A Household verdict carries a month and BOTH Persons' ages; a per-Person marker is one
// entry per Person, labelled by position and never merged; and an absent marker says why, keeping
// every distinction `outcomes.ts` makes ("never" is not "could not be worked out").
import test from 'node:test';
import assert from 'node:assert/strict';

import { toCents } from '../dist/core/money.js';
import { DEMO_HOUSEHOLD, DEMO_PLAN } from '../dist/app/demoHousehold.js';
import { PENSION_ONLY_NEVER_NOTE, PENSION_ONLY_UNCOMPUTABLE_NOTE } from '../dist/app/monthsToSeries.js';
import { anonymousAges } from '../dist/app/chat/tools/identity.js';
import { ABSENT, getMarkers, markersOrRefusal } from '../dist/app/chat/tools/getMarkers.js';

const NAME_PARTS = ['Wilhelmina', 'Quartermaine', 'Bartholomew', 'Fenwick', 'Oyelaran'];
const RENAMED = {
  ...DEMO_HOUSEHOLD,
  persons: DEMO_HOUSEHOLD.persons.map((person, index) => ({ ...person, name: ['Wilhelmina Quartermaine', 'Bartholomew Fenwick-Oyelaran'][index] })),
};
const DEMO = { ...DEMO_PLAN, household: RENAMED };

const entry = (id, type, date, owner, params) => ({ id, date, owner, type, params, enabled: true, createdAt: '2026-08-20' });

// SYNTHETIC: the demo couple (A born 1968-05-14, B born 1960-02-09) spending $110,000 a year, with a
// $50,000 home loan, a $100,000 floor, B retiring in 2033 as well as A in 2031, and a mortgage
// target in January 2032 that falls between the two retirements. Every marker is present.
const MARKERS = {
  ...DEMO,
  settings: { ...DEMO_PLAN.settings, contingencyFloor: toCents(100_000) },
  household: { ...RENAMED, mortgage: { openingBalance: toCents(50_000), annualInterestRate: 0.06, monthlyRepayment: toCents(1_000) } },
  entries: [
    ...DEMO_PLAN.entries.map((each) => (each.type === 'SPEND_CHANGE' ? { ...each, params: { annualSpend: toCents(110_000) } } : each)),
    entry('retire-b', 'RETIRE', '2033-02-01', 'personB', {}),
    entry('target', 'MORTGAGE_TARGET', '2032-01-01', 'household', {}),
  ],
};
MARKERS.scenarios = [{ ...DEMO_PLAN.scenarios[0], entryIds: MARKERS.entries.map(({ id }) => id) }];

const both = (plan, month) => ({ month, ages: anonymousAges(plan.household, month) });

test('every Household verdict is a month with BOTH Persons’ ages in it, never one Person’s', () => {
  const out = JSON.parse(getMarkers(MARKERS));
  for (const part of NAME_PARTS) assert.ok(!JSON.stringify(out).includes(part), part);
  const { shortfallAge, pensionOnlyAge, contingencyFloor, mortgagePayoff } = out.household;
  assert.equal(shortfallAge.status, 'shortfall');
  // One month EARLIER since 2026-09-29 (LR-1 slice 2, the CGT reform from 1 July 2027): this
  // household sells Person A's parcel from 2028-02 to 2030-03, and the part of each gain after
  // 1 July 2027 is now indexed and never halved, so those sales pay $445.70 more tax between them and
  // the last one, in 2030-03, finds $1,557.73 left where it found $2,064.09. That money not
  // compounding for twenty years brings the shortfall and the pension-only month forward by one;
  // the ages do not change.
  assert.deepEqual(shortfallAge.firstShortfall, both(MARKERS, '2050-06'));
  assert.deepEqual(shortfallAge.firstShortfall.ages, [{ person: 'Person A', age: 82 }, { person: 'Person B', age: 90 }]);
  assert.deepEqual(shortfallAge.pointOfNoRecovery, both(MARKERS, '2050-06'));
  assert.equal(pensionOnlyAge.status, 'pensionOnly');
  assert.deepEqual(pensionOnlyAge.firstPensionOnly, both(MARKERS, '2050-07'));
  assert.equal(pensionOnlyAge.recoveredAt, ABSENT.pensionOnlyToTheEnd);
  assert.equal(contingencyFloor.status, 'breached');
  assert.deepEqual(contingencyFloor.firstBreach, both(MARKERS, '2048-09'));
  assert.match(contingencyFloor.floorThatMonth, /^\$\d{2,3},\d{3}\.\d\d \(today’s money\)$/);
  assert.equal(mortgagePayoff.status, 'clear');
  assert.deepEqual(mortgagePayoff.clearForGood, both(MARKERS, '2030-11'));
  assert.deepEqual(mortgagePayoff.clearForGood.ages, [{ person: 'Person A', age: 62 }, { person: 'Person B', age: 70 }]);
  assert.equal(mortgagePayoff.owedAtHorizon, '$0.00 (today’s money)');
});

test('each retirement is its own entry, labelled by position, with that Person’s own month and age', () => {
  const { retirements } = JSON.parse(getMarkers(MARKERS)).perPerson;
  assert.deepEqual(retirements, [
    { person: 'Person A', status: 'retires', month: '2031-05', age: 62 },
    { person: 'Person B', status: 'retires', month: '2033-02', age: 72 },
  ]);
});

test('a mortgage target is answered per Person, and the two answers differ here', () => {
  const { mortgageTargets } = JSON.parse(getMarkers(MARKERS)).perPerson;
  assert.deepEqual(mortgageTargets, {
    status: 'stated',
    targets: [
      {
        entryId: 'target',
        month: '2032-01',
        perPerson: [
          { person: 'Person A', outcome: 'retiresBeforeTarget' },
          { person: 'Person B', outcome: 'retiresAfterTarget' },
        ],
      },
    ],
  });
});

// --- Absence, and why ----------------------------------------------------------------------------

test('the demo: every absent marker says why, and a Person with no retirement is still their own entry', () => {
  const out = JSON.parse(getMarkers(DEMO));
  assert.deepEqual(out.household, {
    shortfallAge: { status: 'never', why: ABSENT.shortfallNever },
    pensionOnlyAge: { status: 'never', why: PENSION_ONLY_NEVER_NOTE },
    contingencyFloor: { status: 'noFloorStated', why: ABSENT.noFloorStated },
    mortgagePayoff: { status: 'noLoan', why: ABSENT.noLoan },
  });
  assert.deepEqual(out.perPerson.retirements, [
    { person: 'Person A', status: 'retires', month: '2031-05', age: 62 },
    { person: 'Person B', status: 'noRetirement', why: ABSENT.noRetirement },
  ]);
  assert.deepEqual(out.perPerson.mortgageTargets, { status: 'none', why: ABSENT.noMortgageTarget });
});

test('“never” and “could not be worked out” are different outputs', () => {
  const early = { ...DEMO, settings: { ...DEMO.settings, asAtDate: '2026-02-01' } };
  const uncomputable = markersOrRefusal(early).household.pensionOnlyAge;
  const never = markersOrRefusal(DEMO).household.pensionOnlyAge;
  assert.deepEqual(uncomputable, { status: 'uncomputable', why: PENSION_ONLY_UNCOMPUTABLE_NOTE });
  assert.deepEqual(never, { status: 'never', why: PENSION_ONLY_NEVER_NOTE });
  assert.notDeepEqual(uncomputable, never);
  // Every reason is its own sentence: no two absences share one.
  assert.equal(new Set(Object.values(ABSENT)).size, Object.keys(ABSENT).length);
});

test('a floor never breached, and a loan still owing, each say which', () => {
  // SYNTHETIC: the demo with a $1,000 floor; and separately with a $50,000 loan repaid at $1 a month.
  const floored = markersOrRefusal({ ...DEMO, settings: { ...DEMO.settings, contingencyFloor: toCents(1_000) } }).household.contingencyFloor;
  assert.deepEqual(floored, { status: 'never', floor: '$1,000.00 (today’s money)', why: ABSENT.floorNever });
  const owing = markersOrRefusal({ ...DEMO, household: { ...DEMO.household, mortgage: { openingBalance: toCents(50_000), annualInterestRate: 0, monthlyRepayment: toCents(1) } } }).household.mortgagePayoff;
  assert.equal(owing.status, 'stillOwing');
  assert.equal(owing.firstPayoff, ABSENT.loanNeverPaidOff);
  assert.equal(owing.clearForGood, ABSENT.loanStillOwing);
  assert.match(owing.owedAtHorizon, /^\$[\d,]+\.\d\d \(today’s money\)$/);
});

test('no null goes out, every dollar figure is labelled, and the only bare numbers are ages and counts', () => {
  const numbers = [];
  const visit = (value, key) => {
    assert.notEqual(value, null, key);
    if (typeof value === 'number') numbers.push(key);
    else if (typeof value === 'string') for (const match of value.matchAll(/\$[\d,]+\.\d\d/g)) assert.equal(value.slice(match.index + match[0].length), ' (today’s money)', value);
    else if (typeof value === 'object') for (const [child, each] of Object.entries(value)) visit(each, child);
  };
  for (const plan of [MARKERS, DEMO]) visit(JSON.parse(getMarkers(plan)), '');
  assert.deepEqual([...new Set(numbers)].sort(), ['age', 'monthsBelowFloor', 'monthsPensionOnly', 'monthsShort']);
});

test('future dollars on request; the active scenario by default; unknown ids and bases refused', () => {
  const future = markersOrRefusal(MARKERS, { basis: 'futureDollars' });
  assert.equal(future.basis, 'future dollars');
  assert.match(future.household.contingencyFloor.floorThatMonth, /\(future dollars\)$/);
  assert.equal(markersOrRefusal(MARKERS).scenarioId, MARKERS.activeScenarioId);
  assert.equal(JSON.parse(getMarkers(MARKERS, { scenarioId: 'nope' })).refused, 'UNKNOWN_SCENARIO');
  assert.equal(markersOrRefusal(MARKERS, { basis: 'real' }).refused, 'UNKNOWN_BASIS');
  // The walk the markers were read from is the Scenario's: a child that retires B earlier moves B alone.
  const child = { id: 'early-b', name: 'Bartholomew retires early', parentId: MARKERS.scenarios[0].id, entryIds: ['retire-b-early'] };
  const plan = { ...MARKERS, entries: [...MARKERS.entries, entry('retire-b-early', 'RETIRE', '2030-03-01', 'personB', {})], scenarios: [...MARKERS.scenarios, child], activeScenarioId: 'early-b' };
  assert.deepEqual(markersOrRefusal(plan).perPerson.retirements.map(({ month }) => month), ['2031-05', '2030-03']);
});
