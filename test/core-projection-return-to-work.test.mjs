// Retire flow S3 (user ruling 2026-09-29: "the user may also elect to return to work").
//
// The mechanism under test: a `WORK_PATTERN_CHANGE` with days, dated strictly after the day a Person
// stopped work, is a return to work (`workSpells`). The salary pays again, and everything that reads
// the in-force salary follows (tax, the income test, the Guarantee). In law the return undoes no
// release: reg 6.12(1) and 6.18(2)(a) keep the money accrued by the stop free. New contributions are
// preserved until the next stop at 60 or older (reg 6.01(7)(b)(i), item 101) or 65 (item 106). The
// walk tracks release per Person, not per dollar, so every accumulation account of the returner is
// locked until then: the unflattering direction, bounded by those balances on the return day. An
// account-based pension keeps paying (ITAA 1997 s 307-80(1)). A pension account takes no
// contributions, so the Guarantee lands in an account kept in accumulation, or the walk refuses.
//
// `nominalReturn: 0` and `cpi: 0`, so balances move only by the flows the tests name.
import test from 'node:test';
import assert from 'node:assert/strict';

import { toCents } from '../dist/core/money.js';
import { AGE_PENSION_LINE, PENSION_MINIMUM_LINE, project } from '../dist/core/projection.js';
import { PlanFileEntryError, parsePlan } from '../dist/core/parsePlan.js';
import { DEMO_PLAN } from '../dist/app/demoHousehold.js';

const person = (name, dateOfBirth, superInterests, pay = 0) => ({
  name,
  dateOfBirth,
  superInterests,
  parcels: [],
  employmentIncomePerFortnight: toCents(pay),
  workBonusBalance: toCents(0),
});

const settings = (over = {}) => ({
  asAtDate: '2026-07-01',
  planningHorizonAge: 66,
  economicSeries: { cpi: 0, pblci: 0.025, awote: 0.035, mtawe: 0.035 },
  deemingRates: { lower: 0.0175, upper: 0.0375 },
  nominalReturn: 0,
  ...over,
});

// Lee: born 1 January 1964, so 63 on the first stop and 65 on 2029-01-01. Kim is past Age Pension
// age, so Lee's salary reaches the couple's income test. Account 1 switches at retirement and takes
// the Guarantee until then; account 2 is kept in accumulation.
const account = (dollars, extra = {}) => ({ phase: 'accumulation', balance: toCents(dollars), ...extra });
const couple = (leeSuper, dateOfBirth = '1964-01-01') => ({
  persons: [person('Lee', dateOfBirth, leeSuper, 3_000), person('Kim', '1955-01-01', [])],
  homeStatus: 'occupied',
});
const KEPT = couple([
  account(300_000, { statedEmployerContributionDestination: 'superannuationGuarantee' }),
  account(100_000, { keepInAccumulationAtRetirement: true }),
]);
const entry = (id, date, type, params = {}, owner = 'personA') => ({ id, date, owner, type, params, enabled: true, createdAt: '2026-09-29' });
const retire = (date, id = `retire-${date}`) => entry(id, date, 'RETIRE');
const work = (date, days = 3, salary = 50_000, id = `work-${date}`) => entry(id, date, 'WORK_PATTERN_CHANGE', { daysPerWeek: days, annualSalary: toCents(salary) });

const at = (months, isoMonth) => months.find((m) => m.month === isoMonth);
const between = (months, from, to) => months.filter((m) => m.month >= from && m.month <= to);
const amounts = (month, description) => month.lines.filter((l) => l.description === description).map((l) => l.amount);
const salaryMonths = (months) => months.filter((m) => amounts(m, 'Salary, Lee').length > 0).map((m) => m.month);
const guaranteeSlots = (months) => months.flatMap((m) => m.notes.filter((n) => n.subject === 'superannuation guarantee' && n.interestIndex !== null).map((n) => [m.month, n.interestIndex]));
const outcomes = (months) => months.flatMap((m) => m.notes.filter((n) => n.subject === 'pension at retirement').map((n) => [m.month, n.outcome]));
const reach = (month) => month.assetsByPerson[0].accessibleAssets;

const RETURNS = [retire('2027-01-15'), work('2027-07-01')];

test('the salary pays again from the return, and not in the break', () => {
  const months = project(settings(), KEPT, RETURNS);
  const paid = salaryMonths(months);
  assert.ok(paid.includes('2027-01'), 'the retirement month pays the days worked');
  assert.deepEqual(paid.filter((m) => m > '2027-01' && m < '2027-07'), [], 'the break was paid');
  // Every month from the return to the horizon, since nothing stops Lee again.
  assert.deepEqual(paid.filter((m) => m >= '2027-07'), months.filter((m) => m.month >= '2027-07').map((m) => m.month));
  assert.deepEqual(outcomes(months), [['2027-01', 'switched'], ['2027-07', 'back at work']]);
});

test('the account-based pension keeps paying while back at work', () => {
  const months = project(settings(), KEPT, RETURNS);
  const paying = between(months, '2027-07', '2028-06').filter((m) => amounts(m, `${PENSION_MINIMUM_LINE}, Lee`).some((a) => a > 0));
  assert.ok(paying.length >= 1, 'no pension payment while back at work');
  // Sch 7's minimum for FY2027-28 at 63 is 4% of the 1 July balance, and it is paid in full.
  const year = between(months, '2027-07', '2028-06').flatMap((m) => amounts(m, `${PENSION_MINIMUM_LINE}, Lee`)).reduce((a, b) => a + b, 0);
  assert.ok(year >= Math.round(0.04 * toCents(250_000)), `only ${year} cents paid in FY2027-28`);
});

test('the Guarantee lands in the account kept in accumulation, never the pension', () => {
  const months = project(settings(), KEPT, RETURNS);
  const slots = guaranteeSlots(months);
  assert.ok(slots.some(([m, slot]) => m < '2027-01' && slot === 0), 'the employer paid into account 1 before retiring');
  const after = slots.filter(([m]) => m >= '2027-07');
  assert.ok(after.length > 12);
  assert.deepEqual([...new Set(after.map(([, slot]) => slot))], [1]);
});

test('super kept in accumulation is locked from the return until 65, and free before it', () => {
  const months = project(settings(), KEPT, RETURNS);
  const without = project(settings(), KEPT, [retire('2027-01-15')]);
  // Before the return the two walks are the same Lee: stopped at 63, so account 2 is reachable.
  assert.equal(reach(at(months, '2027-06')), reach(at(without, '2027-06')));
  // From the return month to December 2028 it is not: at least the $100,000 less, every month.
  for (const month of between(months, '2027-07', '2028-12')) {
    const other = at(without, month.month);
    assert.ok(reach(other) - reach(month) >= toCents(100_000) - toCents(1), `${month.month}: kept super still reachable while back at work`);
  }
  // Lee turns 65 on 2029-01-01, item 106: free again whether or not Lee works.
  const gap = reach(at(without, '2029-01')) - reach(at(months, '2029-01'));
  assert.ok(gap < toCents(100_000) - toCents(10_000), `still locked at 65 (gap ${gap})`);
  assert.ok(at(months, '2027-07').notes.some((n) => n.outcome === 'back at work' && /less you can reach than you really have/.test(n.note)));
  // And the Waterfall's released-super limb reads the same lock: nothing offered while back, all of it at 65.
  const offered = (m) => at(months, m).notes.some((n) => n.subject === 'waterfall limb' && /Lee's superannuation interest 1 is released/.test(n.note));
  assert.deepEqual(['2027-06', '2027-08', '2028-12', '2029-02'].map(offered), [true, false, false, true]);
});

test('the returned salary reaches the couple\'s income test', () => {
  const months = project(settings(), KEPT, RETURNS);
  const without = project(settings(), KEPT, [retire('2027-01-15')]);
  const pension = (walk, m) => amounts(at(walk, m), AGE_PENSION_LINE).reduce((a, b) => a + b, 0);
  assert.equal(pension(months, '2027-06'), pension(without, '2027-06'));
  // Derived, not copied: $50,000 a year is $1,923.08 a fortnight in today's wages, raised a year by
  // AWOTE 3.5% to $1,990.39. Deemed income already uses the free area, so every dollar is excess and
  // takes 50c off the couple's pension, 25c of it Kim's: $497.60 a fortnight, $1,078.13 a month.
  const drop = pension(without, '2027-07') - pension(months, '2027-07');
  assert.ok(Math.abs(drop - Math.round(0.25 * 199_039 * 26 / 12)) <= 2, `Kim's Age Pension fell ${drop} cents in the return month`);
});

test('stopping again at 60 or older frees it the next month, and switches nothing a second time', () => {
  const months = project(settings(), KEPT, [...RETURNS, retire('2028-03-10')]);
  const without = project(settings(), KEPT, [retire('2027-01-15')]);
  assert.deepEqual(outcomes(months), [['2027-01', 'switched'], ['2027-07', 'back at work'], ['2028-03', 'stopped again']]);
  // March still locked (a month is read at its first day); April free.
  assert.ok(reach(at(without, '2028-03')) - reach(at(months, '2028-03')) >= toCents(100_000));
  assert.ok(reach(at(without, '2028-04')) - reach(at(months, '2028-04')) < toCents(100_000) - toCents(10_000));
  // Account 2 (slot 1) is still accumulation after the second stop: limb 5 offers it as released
  // super, which it never does for a pension. While Lee was back at work it offered nothing.
  const released = (m) => at(months, m).notes.some((n) => n.subject === 'waterfall limb' && /Lee's superannuation interest 1 is released/.test(n.note));
  assert.equal(released('2028-05'), true);
  assert.equal(released('2027-08'), false);
  assert.deepEqual(salaryMonths(months).filter((m) => m > '2028-03'), []);
});

test('two Retire entries with no return: the first releases, and the second changes nothing', () => {
  const once = project(settings(), KEPT, [retire('2027-01-15')]);
  const twice = project(settings(), KEPT, [retire('2027-01-15'), retire('2028-03-10')]);
  assert.deepEqual(twice.map(reach), once.map(reach));
  assert.deepEqual(outcomes(twice), [['2027-01', 'switched']]);
});

test('a first stop before 60 switches nothing, so the next stop at 60 or older is the switch', () => {
  // Lee born 1 March 1967: 59 at the first stop, 60 at the second.
  const young = couple([account(300_000)], '1967-03-01');
  const months = project(settings(), young, [retire('2026-10-01'), work('2027-05-01'), retire('2027-09-01')]);
  // The switch is decided at the stop that releases, so the first stop reports nothing of its own.
  assert.deepEqual(outcomes(months), [['2027-05', 'back at work'], ['2027-09', 'switched']]);
  assert.match(at(months, '2027-05').notes.find((n) => n.outcome === 'back at work').note, /stopped before 60, which freed no super/);
  // The pension pays from the second stop, and its fund tax is worked out at the July true-up: that
  // needs a release, and the second stop is it.
  assert.ok(between(months, '2027-09', '2028-08').some((m) => amounts(m, `${PENSION_MINIMUM_LINE}, Lee`).some((a) => a > 0)));
  // With earnings, the July true-up asks the pension's fund tax for a release: the second stop is it.
  project(settings({ nominalReturn: 0.05, superIncomeYieldRate: 0.02 }), young, [retire('2026-10-01'), work('2027-05-01'), retire('2027-09-01')]);
  // The Guarantee went into the one account while back at work, before it switched.
  assert.ok(guaranteeSlots(months).some(([m, slot]) => m === '2027-06' && slot === 0));
});

test('back at work with every account a pension: refused by name, not paid into the pension', () => {
  const one = couple([account(300_000)]);
  assert.throws(() => project(settings(), one, RETURNS), /Lee goes back to work on 2027-07-01, and every super account of Lee's is a pension by then\. .*can't open one part-way through the plan/);
  // Not refused without the return, and not for a return with zero days.
  project(settings(), one, [retire('2027-01-15')]);
  project(settings(), one, [retire('2027-01-15'), work('2027-07-01', 0, 0)]);
});

test('a return in the same month as the stop is refused by name', () => {
  assert.throws(() => project(settings(), KEPT, [retire('2027-01-05'), work('2027-01-20')]), /going back to work on 2027-01-20, in the same month as stopping work on 2027-01-05/);
  // Scenario order does not decide it: the return listed first is still after the stop by date.
  assert.throws(() => project(settings(), KEPT, [work('2027-01-20'), retire('2027-01-05')]), /same month as stopping work/);
});

test('a transition to retirement pension after a return is refused: lawful, not modelled', () => {
  const two = couple([account(300_000, { statedEmployerContributionDestination: 'superannuationGuarantee' }), account(100_000, { keepInAccumulationAtRetirement: true }), account(50_000, { keepInAccumulationAtRetirement: true })]);
  const ttr = entry('ttr', '2027-09-01', 'TTR_START', { interestIndex: 2 });
  assert.throws(() => project(settings(), two, [...RETURNS, ttr]), /after going back to work too: the law would allow one then, but the forecast doesn't model it/);
  const plan = structuredClone(DEMO_PLAN);
  plan.household.persons[0].superInterests = [
    { ...plan.household.persons[0].superInterests[0], statedEmployerContributionDestination: 'superannuationGuarantee' },
    { phase: 'accumulation', balance: toCents(50_000), keepInAccumulationAtRetirement: true },
  ];
  plan.entries.push(
    { id: 'back', date: '2032-01-01', owner: 'personA', type: 'WORK_PATTERN_CHANGE', params: { daysPerWeek: 3, annualSalary: toCents(40_000) }, enabled: true, createdAt: '2026-09-29' },
    { id: 'ttr', date: '2032-03-01', owner: 'personA', type: 'TTR_START', params: { interestIndex: 1 }, enabled: true, createdAt: '2026-09-29' },
  );
  plan.scenarios[0].entryIds.push('back', 'ttr');
  assert.throws(() => parsePlan(plan), (error) => error instanceof PlanFileEntryError && /after going back to work too/.test(error.message));
});

test('a work pattern dated before the stop, on it, or with zero days does not bring the salary back', () => {
  for (const pattern of [work('2026-11-01'), work('2027-01-15'), work('2027-07-01', 0, 0)]) {
    const months = project(settings(), KEPT, [retire('2027-01-15'), pattern]);
    assert.deepEqual(salaryMonths(months).filter((m) => m > '2027-01'), [], `${pattern.date} un-retired Lee`);
    assert.deepEqual(outcomes(months), [['2027-01', 'switched']]);
  }
});
