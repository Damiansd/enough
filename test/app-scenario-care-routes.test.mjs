// P14-14 — "Compare ways to pay for care": `careRoutes` makes up to four child Scenarios
// of the scenario in view, one per funding route, and skips (never creates) a route whose walk or
// door refuses it. Synthetic households, round numbers.
import test from 'node:test';
import assert from 'node:assert/strict';

import { CARE_ROUTE_NAMES, careRouteScenarioId, careRouteSkipLine, careRoutes } from '../dist/app/careRoutes.js';
import { validatedPlan } from '../dist/app/planEdits.js';
import { scenarioById, scenarioEntries } from '../dist/app/scenarioWalks.js';
import { project, RadPaymentUnfundedError } from '../dist/core/projection.js';
import { radDepositEnds, radDepositSentences } from '../dist/app/radDeposit.js';
import { priceLevelFactor } from '../dist/core/priceLevel.js';
import { formatDollars } from '../dist/app/displayMoney.js';
import { DEMO_PLAN } from '../dist/app/demoHousehold.js';

const person = (name, dateOfBirth) => ({ name, dateOfBirth, superInterests: [], parcels: [], employmentIncomePerFortnight: 0, workBonusBalance: 0 });
const entry = (id, type, date, params, owner = 'household') => ({ id, date, owner, type, params, enabled: true, createdAt: '2026-06-01' });
const CARE_PARAMS = { homeValue: 90_000_000, radPrice: 50_000_000, radPaidAsLumpSum: 10_000_000 };

/** Baseline (root) → "Care" (active, holds the ENTER_CARE). The active scenario is NOT the root. */
const carePlan = (persons, extra = {}, kidExtra = []) => validatedPlan({
  ...DEMO_PLAN,
  settings: {
    asAtDate: '2026-09-16',
    planningHorizonAge: 70,
    economicSeries: { cpi: 0.025, pblci: 0.025, awote: 0.035, mtawe: 0.035 },
    deemingRates: { lower: 0.0175, upper: 0.0375 },
    nominalReturn: 0.065,
    cashInterestRate: 0,
  },
  household: { persons, homeStatus: 'occupied', openingOffsetBalance: 20_000_000, ...extra },
  entries: [entry('spend', 'SPEND_CHANGE', '2026-10-01', { annualSpend: 4_000_000 }), entry('care', 'ENTER_CARE', '2026-12-01', CARE_PARAMS, 'personA'), ...kidExtra],
  scenarios: [{ id: 'root', name: 'Baseline', parentId: null, entryIds: ['spend'] }, { id: 'kid', name: 'Care', parentId: 'root', entryIds: ['care', ...kidExtra.map((one) => one.id)] }],
  activeScenarioId: 'kid',
}).plan;
const SINGLE = carePlan([person('Sam', '1957-06-01')]);
const COUPLE = carePlan([person('Alex', '1957-06-01'), person('Blair', '1957-06-15')]);

const idOf = (route) => careRouteScenarioId('kid', 'care', route);
const own = (plan, route) => {
  const child = scenarioById(plan, idOf(route));
  return child.entryIds.map((id) => plan.entries.find((candidate) => candidate.id === id));
};
const onIn = (plan, route) => scenarioEntries(plan, scenarioById(plan, idOf(route))).filter((one) => one.enabled);

test('all four routes are made, each a child of the scenario in view with the parent’s ENTER_CARE switched off', () => {
  const result = careRoutes(SINGLE, 'care', '600', '2026-09-25');
  assert.deepEqual(result.skipped, []);
  assert.deepEqual(result.created, ['sell', 'rent', 'empty', 'heas'].map(idOf));
  for (const route of ['sell', 'rent', 'empty', 'heas']) {
    const child = scenarioById(result.plan, idOf(route));
    assert.equal(child.parentId, 'kid', `${route} is not a child of the scenario in view`);
    assert.equal(child.name, `Care — ${CARE_ROUTE_NAMES[route]}`);
    assert.deepEqual(child.entryOverrides, { care: false });
    assert.equal(onIn(result.plan, route).filter((one) => one.type === 'ENTER_CARE').length, 1);
  }
  // The save gate takes it: every scenario walks.
  assert.equal(validatedPlan(result.plan).walks.byScenarioId.size, 6);
});

test('route 1 pays the whole room price as a deposit and sells the home in the care month at its stated value', () => {
  const { plan } = careRoutes(SINGLE, 'care', '600', '2026-09-25');
  const [care, sell, ...rest] = own(plan, 'sell');
  assert.equal(rest.length, 0);
  assert.equal(care.type, 'ENTER_CARE');
  assert.deepEqual(care.params, { ...CARE_PARAMS, radPaidAsLumpSum: CARE_PARAMS.radPrice });
  assert.equal(care.date, '2026-12-01');
  assert.equal(sell.type, 'SELL_HOME');
  assert.equal(sell.date, '2026-12-01');
  assert.deepEqual(sell.params, { salePrice: CARE_PARAMS.homeValue });
});

test('route 2 pays daily and rents the home from the month AFTER the care month; route 3 pays daily and does nothing else', () => {
  const { plan } = careRoutes(SINGLE, 'care', '600', '2026-09-25');
  const [care, rent, ...rest] = own(plan, 'rent');
  assert.equal(rest.length, 0);
  assert.equal(care.params.radPaidAsLumpSum, 0);
  assert.equal(rent.type, 'RENT_OUT_HOME');
  assert.equal(rent.date, '2027-01-01');
  assert.deepEqual(rent.params, { weeklyRent: 60_000 });
  const empty = own(plan, 'empty');
  assert.deepEqual(empty.map((one) => one.type), ['ENTER_CARE']);
  assert.equal(empty[0].params.radPaidAsLumpSum, 0);
});

test('a blank rent skips the rent route with a message — never a rent of 0, never guessed', () => {
  const result = careRoutes(SINGLE, 'care', '  ', '2026-09-25');
  assert.deepEqual(result.created, [idOf('sell'), idOf('empty'), idOf('heas')]);
  assert.equal(result.skipped.length, 1);
  assert.equal(
    careRouteSkipLine(result.skipped[0]),
    'Skipped “Keep home, rent it out, pay daily”: no weekly rent was typed — type the rent you expect to compare renting the home out',
  );
  assert.ok(!result.plan.entries.some((one) => one.type === 'RENT_OUT_HOME'));
});

test('a route the WALK refuses is not made, and the line says which route and the walk’s reason', () => {
  // A couple, one partner in care: the other still lives in the home, so renting it is refused by the walk.
  const result = careRoutes(COUPLE, 'care', '600', '2026-09-25');
  assert.deepEqual(result.created, [idOf('sell'), idOf('empty'), idOf('heas')]);
  assert.equal(result.skipped.length, 1);
  assert.equal(result.skipped[0].route, 'rent');
  assert.match(careRouteSkipLine(result.skipped[0]), /^Skipped “Keep home, rent it out, pay daily”: .*while a partner still lives in the home/);
  assert.ok(!result.plan.scenarios.some((one) => one.id === idOf('rent')));
  assert.ok(!result.plan.entries.some((one) => one.type === 'RENT_OUT_HOME'));
});

test('a route the DOOR refuses is not made either', () => {
  const result = careRoutes(SINGLE, 'care', 'lots', '2026-09-25');
  assert.deepEqual(result.skipped.map((skip) => skip.route), ['rent']);
  assert.match(result.skipped[0].reason, /weeklyRent/);
});

test('each route is walked once, alone', () => {
  let walks = 0;
  careRoutes(SINGLE, 'care', '600', '2026-09-25', (...args) => {
    walks += 1;
    return project(...args);
  });
  assert.equal(walks, 4);
});

test('a re-run makes no duplicates: every route is skipped as already in the plan, and nothing is saved', () => {
  const first = careRoutes(SINGLE, 'care', '600', '2026-09-25');
  const again = careRoutes(first.plan, 'care', '600', '2026-09-25');
  assert.equal(again.plan, null);
  assert.deepEqual(again.created, []);
  assert.deepEqual(again.skipped.map((skip) => skip.route), ['sell', 'rent', 'empty', 'heas']);
  assert.match(careRouteSkipLine(again.skipped[0]), /already in the plan as “Care — Sell home, pay deposit”/);
});

test('route 4 pays daily and draws HEAS at the most allowed for the Person in care, from the care month, secured on the home value', () => {
  const { plan } = careRoutes(SINGLE, 'care', '600', '2026-09-25');
  const [care, heas, ...rest] = own(plan, 'heas');
  assert.equal(rest.length, 0);
  assert.deepEqual(care.params, { ...CARE_PARAMS, radPaidAsLumpSum: 0 });
  assert.equal(heas.type, 'HEAS_DRAW');
  assert.equal(heas.date, care.date);
  assert.equal(heas.owner, 'personA');
  assert.deepEqual(heas.params, { securityValue: CARE_PARAMS.homeValue, fortnightlyAmount: 'maximum' });
});

test('a stated home loan skips the HEAS route — the security would need the loan netted off, so it is not guessed', () => {
  const loan = { openingBalance: 10_000_000, annualInterestRate: 0.06, monthlyRepayment: 200_000 };
  const refinance = entry('refi', 'MORTGAGE_REFINANCE', '2026-10-01', loan);
  for (const plan of [carePlan([person('Sam', '1957-06-01')], { mortgage: loan }), carePlan([person('Sam', '1957-06-01')], {}, [refinance])]) {
    const result = careRoutes(plan, 'care', '600', '2026-09-25');
    assert.deepEqual(result.skipped.map((skip) => skip.route), ['heas']);
    assert.match(careRouteSkipLine(result.skipped[0]), /^Skipped “Keep home, draw HEAS, pay daily”: a home loan is stated/);
    assert.ok(!result.plan.entries.some((one) => one.type === 'HEAS_DRAW'));
  }
});

test('a HEAS loan the Person in care already has in the scenario skips the route; the partner’s own does not', () => {
  const draw = (owner) => entry(`heas-${owner}`, 'HEAS_DRAW', '2026-10-01', { securityValue: CARE_PARAMS.homeValue, fortnightlyAmount: 'maximum' }, owner);
  const theirs = careRoutes(carePlan([person('Alex', '1957-06-01'), person('Blair', '1957-06-15')], {}, [draw('personA')]), 'care', '600', '2026-09-25');
  assert.deepEqual(theirs.skipped.map((skip) => skip.route), ['rent', 'heas']);
  assert.equal(careRouteSkipLine(theirs.skipped[1]), 'Skipped “Keep home, draw HEAS, pay daily”: this person already has a Home Equity Access Scheme loan in this scenario');
  assert.equal(theirs.plan.entries.filter((one) => one.type === 'HEAS_DRAW').length, 1);
  const partners = careRoutes(carePlan([person('Alex', '1957-06-01'), person('Blair', '1957-06-15')], {}, [draw('personB')]), 'care', '600', '2026-09-25');
  assert.ok(partners.created.includes(idOf('heas')));
});

test('a HEAS loan for the same Person in a SIBLING scenario does not block route 4 — the door checks each scenario alone', () => {
  const sibling = entry('heas-sibling', 'HEAS_DRAW', '2026-10-01', { securityValue: CARE_PARAMS.homeValue, fortnightlyAmount: 'maximum' }, 'personA');
  const plan = validatedPlan({
    ...SINGLE,
    entries: [...SINGLE.entries, sibling],
    scenarios: [...SINGLE.scenarios, { id: 'other', name: 'Other', parentId: 'root', entryIds: [sibling.id] }],
  }).plan;
  const result = careRoutes(plan, 'care', '600', '2026-09-25');
  assert.ok(result.created.includes(idOf('heas')), JSON.stringify(result.skipped));
  assert.equal(result.plan.entries.filter((one) => one.type === 'HEAS_DRAW' && one.owner === 'personA').length, 2);
});

test('an entry that is not an ENTER_CARE of the scenario in view, or is switched off there, is refused', () => {
  assert.throws(() => careRoutes(SINGLE, 'spend', '600', '2026-09-25'), RangeError);
  assert.throws(() => careRoutes({ ...SINGLE, activeScenarioId: 'root' }, 'care', '600', '2026-09-25'), RangeError);
  const off = { ...SINGLE, scenarios: SINGLE.scenarios.map((one) => (one.id === 'kid' ? { ...one, entryOverrides: { care: false } } : one)) };
  assert.throws(() => careRoutes(off, 'care', '600', '2026-09-25'), /switched off/);
});

// P14-10 — the pay-least vs pay-most deposit headline. A single with $200,000 in cash and no
// super, so a $100,000 deposit is fundable in full and a $500,000 one is not.
const depositPlan = (radPrice) => validatedPlan({
  ...DEMO_PLAN,
  settings: { ...SINGLE.settings, planningHorizonAge: 80 },
  household: { persons: [person('Sam', '1957-06-01')], homeStatus: 'occupied', openingOffsetBalance: 20_000_000 },
  entries: [entry('spend', 'SPEND_CHANGE', '2026-10-01', { annualSpend: 4_000_000 }), entry('care', 'ENTER_CARE', '2026-12-01', { homeValue: 90_000_000, radPrice, radPaidAsLumpSum: 0 }, 'personA')],
  scenarios: [{ id: 'root', name: 'Baseline', parentId: null, entryIds: ['spend', 'care'] }],
  activeScenarioId: 'root',
}).plan;
const withDeposit = (plan, radPaidAsLumpSum) =>
  scenarioEntries(plan, scenarioById(plan, 'root')).map((one) => (one.id === 'care' ? { ...one, params: { ...one.params, radPaidAsLumpSum } } : one));
const counted = () => {
  const walk = (...args) => {
    walk.count += 1;
    return project(...args);
  };
  walk.count = 0;
  return walk;
};

test('deposit: the least end pays nothing; a fundable room price is the most end, in two walks', () => {
  const walk = counted();
  const ends = radDepositEnds(depositPlan(10_000_000), 'care', walk);
  assert.equal(ends.least.radPaidAsLumpSum, 0);
  assert.equal(ends.most.radPaidAsLumpSum, 10_000_000);
  assert.equal(walk.count, 2);
});

test('deposit: an unfundable room price is searched down to the largest fundable $1,000, within twelve walks', () => {
  const plan = depositPlan(50_000_000);
  const { settings, household } = plan;
  assert.throws(() => project(settings, household, withDeposit(plan, 50_000_000)), RadPaymentUnfundedError);
  const walk = counted();
  const { most } = radDepositEnds(plan, 'care', walk);
  assert.ok(walk.count <= 12, `${walk.count} walks`);
  assert.equal(most.radPaidAsLumpSum % 100_000, 0);
  assert.ok(most.radPaidAsLumpSum > 0 && most.radPaidAsLumpSum < 50_000_000);
  assert.doesNotThrow(() => project(settings, household, withDeposit(plan, most.radPaidAsLumpSum)));
  assert.throws(() => project(settings, household, withDeposit(plan, most.radPaidAsLumpSum + 100_000)), RadPaymentUnfundedError);
});

test('deposit: across the fundable range, end wealth and months short of cash both rise with the deposit (the P14-10 gate)', () => {
  const plan = depositPlan(50_000_000);
  const { least, most } = radDepositEnds(plan, 'care');
  const sweep = [0, 5_000_000, 10_000_000, 15_000_000, most.radPaidAsLumpSum].map((paid) => {
    const months = project(plan.settings, plan.household, withDeposit(plan, paid));
    const last = months.at(-1);
    return { wealth: last.closingBalance + last.superBalance + last.closingNonSuperPortfolio + (last.radHeld ?? 0), short: months.filter((m) => m.lines.some((l) => l.direction === 'inflow' && l.description === 'Unfunded shortfall')).length };
  });
  for (let i = 1; i < sweep.length; i += 1) {
    assert.ok(sweep[i].wealth >= sweep[i - 1].wealth, `wealth fell at step ${i}`);
    assert.ok(sweep[i].short >= sweep[i - 1].short, `months short fell at step ${i}`);
  }
  assert.equal(sweep[0].wealth, least.endWealth);
  assert.equal(sweep[0].short, least.monthsShort);
  assert.equal(sweep.at(-1).wealth, most.endWealth);
  assert.equal(sweep.at(-1).short, most.monthsShort);
  assert.ok(most.endWealth > least.endWealth && most.monthsShort > least.monthsShort);
});

test('deposit: the two sentences, most first, end wealth in today’s money and whole dollars', () => {
  const plan = depositPlan(50_000_000);
  const ends = radDepositEnds(plan, 'care');
  const today = (end) => formatDollars(Math.round(end.endWealth / priceLevelFactor(0.025, '2026-09-16', end.endMonth)));
  assert.notEqual(today(ends.most), formatDollars(ends.most.endWealth));
  assert.deepEqual(radDepositSentences(ends, plan.settings), [
    `Paying the most you can as a deposit (${formatDollars(ends.most.radPaidAsLumpSum)}) leaves ${today(ends.most)} at the end, with ${ends.most.monthsShort} months short of cash.`,
    `Paying it all daily leaves ${today(ends.least)}, with ${ends.least.monthsShort} months short.`,
  ]);
  assert.doesNotMatch(radDepositSentences(ends, plan.settings).join(' '), /\bshould\b|\.\d\d\b/);
});
