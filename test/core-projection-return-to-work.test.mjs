// Retire flow S3 (user ruling 2026-09-29: "the user may also elect to return to work").
//
// The mechanism under test: a `WORK_PATTERN_CHANGE` with days, dated strictly after the day a Person
// stopped work, is a return to work (`workSpells`). The salary pays again, and everything that reads
// the in-force salary follows (tax, the income test, the Guarantee). In law the return undoes no
// release, but only what was unrestricted at the stop stays cashable, as a FIXED dollar figure (SISR
// 6.03, 6.10(1), 6.18(2)): money paid in since, and all earnings after the stop, are preserved until
// the next stop at 60 or older (reg 6.01(7)(b)(i), item 101) or 65 (item 106). RF-1 (2026-09-30):
// the walk takes each account's balance at the start of the month of a stop that freed it, takes off
// every draw until the return, cuts it to the balance on the return, and then to the balance after
// every debit; it never grows. The entry path, Waterfall limb 5 and `accessibleAssets` all reach that
// much and no more. An account-based pension keeps paying (ITAA 1997 s 307-80(1)). A pension account
// takes no contributions, so the Guarantee lands in an account kept in accumulation, or the walk refuses.
//
// `nominalReturn: 0` and `cpi: 0` unless a test says otherwise, so balances move only by the flows
// the tests name. The RF-1 tests use 6% so earnings are there to be wrongly released.
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
const nextMonth = (m) => { const [y, mo] = m.split('-').map(Number); return mo === 12 ? `${y + 1}-01` : `${y}-${String(mo + 1).padStart(2, '0')}`; };

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

// RF-1's hand-worked figure. At 6% a year the month's factor is 1.06^(1/12), and the walk floors to
// the cent each month: $100,000.00 -> $100,486.75 -> $100,975.87 -> $101,467.37 -> $101,961.26 ->
// $102,457.56 -> $102,956.27, the balance of account 2 at the start of January 2027, the month of the stop.
const GROWN = settings({ nominalReturn: 0.06 });
const RELEASED = 10_295_627;
const EMPTY = couple([
  account(300_000, { statedEmployerContributionDestination: 'superannuationGuarantee' }),
  account(0, { keepInAccumulationAtRetirement: true }),
]);
// The same walk with account 2 empty: the pension, the Guarantee and every other figure of Lee's are
// the same, so the gap in what Lee can reach is what account 2 adds, and nothing else.
const gaps = (household, entries, s = GROWN) => {
  const months = project(s, household, entries);
  const empty = project(s, household === KEPT ? EMPTY : household, entries);
  return months.map((m, i) => ({ month: m.month, reach: reach(m) - reach(empty[i]), held: m.superBalance - empty[i].superBalance, notes: m.notes }));
};
const gapIn = (rows, m) => rows.find((row) => row.month === m);
const claimed = (notes, pattern) => notes.some((n) => n.subject === 'waterfall limb' && pattern.test(n.note));
const WHOLE = /Lee's superannuation interest 1 is released — a Condition of Release is met/;
const IN_PART = /Lee's superannuation interest 1 is released only in part, because Lee is back at work/;

test('back at work, only what account 2 held at the stop is reachable, and it does not grow (RF-1)', () => {
  const rows = gaps(KEPT, RETURNS);
  // Lee is 62 and working: nothing of it is reachable. January is the stop month, read at its 1st.
  for (const row of rows.filter((r) => r.month <= '2027-01')) assert.equal(row.reach, 0, row.month);
  // February to June: stopped at 63, so all of it, earnings too.
  for (const row of rows.filter((r) => r.month >= '2027-02' && r.month <= '2027-06')) assert.equal(row.reach, row.held, row.month);
  // Back at work: $102,956.27 every month, while the account itself keeps growing past it.
  for (const row of rows.filter((r) => r.month >= '2027-07' && r.month <= '2028-12')) {
    assert.equal(row.reach, RELEASED, `${row.month}: reachable`);
    assert.ok(row.held > RELEASED, `${row.month}: the account did not grow past the released figure`);
  }
  assert.equal(gapIn(rows, '2027-07').held, 10_599_994, 'the growth between the stop and the return is in the account');
  // Lee turns 65 on 2029-01-01, item 106: all of it, whether or not Lee works.
  assert.equal(gapIn(rows, '2029-01').reach, gapIn(rows, '2029-01').held);
  const months = project(GROWN, KEPT, RETURNS);
  assert.ok(at(months, '2027-07').notes.some((n) => n.outcome === 'back at work' && /that amount is fixed: it does not grow\. Only the money paid in since, and the earnings, are locked/.test(n.note)));
  // Limb 5 offers the whole account when stopped and at 65, and the released part while back.
  assert.deepEqual(['2027-06', '2027-08', '2028-12', '2029-02'].map((m) => claimed(at(months, m).notes, WHOLE)), [true, false, false, true]);
  assert.deepEqual(['2027-06', '2027-08', '2028-12', '2029-02'].map((m) => claimed(at(months, m).notes, IN_PART)), [false, true, true, false]);
});

test('a lump sum in the break comes off the released figure (RF-1)', () => {
  const rows = gaps(KEPT, [...RETURNS, entry('lump', '2027-03-01', 'LUMP_SUM_FROM_SUPER', { amount: toCents(10_000), interestIndex: 1 })]);
  for (const row of rows.filter((r) => r.month >= '2027-07' && r.month <= '2028-12')) assert.equal(row.reach, RELEASED - 1_000_000, row.month);
});

test('a draw while back at work, in the month of the next stop, comes off what that stop frees (RF-1)', () => {
  // The second stop's capture is the account at the start of its month and waits a month before it is
  // committed. A lump sum on the 1st of that month (Lee is still back at work then) must come off the
  // waiting figure too, or the second return would reach $10,000 that is no longer in the account.
  const again = [...RETURNS, retire('2028-03-15', 'retire-again'), work('2028-07-01', 3, 50_000, 'work-again')];
  const lump = entry('lump', '2028-03-01', 'LUMP_SUM_FROM_SUPER', { amount: toCents(10_000), interestIndex: 1 });
  const without = gaps(KEPT, again);
  const rows = gaps(KEPT, [...again, lump]);
  // Account 2 on 1 March 2028: a month's `superBalance` is before that month's growth (growth is added
  // at the close of the tick), so March's own row is its opening. Hand check: $100,000 x 1.06^(20/12).
  const opening = gapIn(without, '2028-03').held;
  assert.equal(opening, 11_019_864);
  for (const row of rows.filter((r) => r.month >= '2028-07' && r.month <= '2028-12')) assert.equal(row.reach, opening - 1_000_000, row.month);
});

test('back at work, a lump sum above the released figure is capped to it, and the rest stays in the account (RF-1)', () => {
  const asked = entry('lump', '2027-09-01', 'LUMP_SUM_FROM_SUPER', { amount: toCents(150_000), interestIndex: 1 });
  const months = project(GROWN, KEPT, [...RETURNS, asked]);
  const plain = project(GROWN, KEPT, RETURNS);
  const note = at(months, '2027-09').notes.find((n) => n.subject === 'super withdrawal' && n.entryId === 'lump');
  assert.deepEqual([note.requested, note.paid], [15_000_000, RELEASED]);
  // Out of the real balance: the account is $102,956.27 lighter, not emptied.
  assert.equal(at(plain, '2027-09').superBalance - at(months, '2027-09').superBalance, RELEASED);
  // Nothing of it is left to reach until 65.
  const rows = gaps(KEPT, [...RETURNS, asked]);
  for (const row of rows.filter((r) => r.month >= '2027-09' && r.month <= '2028-12')) assert.equal(row.reach, 0, row.month);
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
  const entries = [...RETURNS, retire('2028-03-10')];
  const months = project(GROWN, KEPT, entries);
  assert.deepEqual(outcomes(months), [['2027-01', 'switched'], ['2027-07', 'back at work'], ['2028-03', 'stopped again']]);
  // March is still back at work (a month is read at its 1st): the released $102,956.27 and no more.
  // April: all of account 2.
  const rows = gaps(KEPT, entries);
  assert.equal(gapIn(rows, '2028-03').reach, RELEASED);
  assert.equal(gapIn(rows, '2028-03').held, 11_019_864);
  for (const row of rows.filter((r) => r.month >= '2028-04')) assert.equal(row.reach, row.held, row.month);
  // Account 2 (slot 1) is still accumulation after the second stop: limb 5 offers it whole as released
  // super, which it never does for a pension. While Lee was back at work it offered the released part.
  assert.equal(claimed(at(months, '2028-05').notes, WHOLE), true);
  assert.equal(claimed(at(months, '2027-08').notes, WHOLE), false);
  assert.equal(claimed(at(months, '2027-08').notes, IN_PART), true);
  assert.deepEqual(salaryMonths(months).filter((m) => m > '2028-03'), []);
});

test('a second return reaches what the second stop freed, not what the first did (RF-1)', () => {
  const rows = gaps(KEPT, [...RETURNS, retire('2028-03-10'), work('2028-07-01')]);
  // The balance of account 2 at the start of March 2028, the month of the second stop: the $11,019,864
  // cents the test above reads there, less the empty twin's own released Guarantee money.
  const second = gapIn(rows, '2028-03').held;
  for (const row of rows.filter((r) => r.month >= '2028-07' && r.month <= '2028-12')) assert.equal(row.reach, second, row.month);
  assert.ok(second > RELEASED);
});

test('a stop before 60 frees nothing, so nothing is reachable while back at work (RF-1)', () => {
  const young = couple([account(300_000)], '1967-03-01');
  const months = project(settings({ nominalReturn: 0.05 }), young, [retire('2026-10-01'), work('2027-05-01'), retire('2027-09-01')]);
  for (const m of between(months, '2027-05', '2027-08')) assert.equal(reach(m), 0, m.month);
  // The second stop is on the 1st of September, so September is already free.
  assert.ok(reach(at(months, '2027-09')) > 0);
});

test('a stop before the plan starts is not in the walk, so nothing is released by it (RF-1)', () => {
  const rows = gaps(KEPT, [retire('2026-03-01'), work('2026-10-01')]);
  for (const row of rows.filter((r) => r.month >= '2026-10' && r.month <= '2028-12')) assert.equal(row.reach, 0, row.month);
});

test('limb 5 draws the released figure down, and no further, while back at work (RF-1)', () => {
  const solo = couple([account(100_000, { keepInAccumulationAtRetirement: true, statedEmployerContributionDestination: 'superannuationGuarantee' })]);
  const spend = entry('spend', '2026-07-01', 'SPEND_CHANGE', { annualSpend: toCents(150_000) }, 'household');
  const months = project(GROWN, solo, [...RETURNS, spend]);
  const drawn = (from, to) => between(months, from, to).flatMap((m) => m.notes.filter((n) => n.subject === 'super withdrawal' && n.entryId === null)).reduce((a, n) => a + n.paid, 0);
  const inBreak = drawn('2027-02', '2027-06');
  assert.ok(inBreak > 0, 'limb 5 drew nothing in the break');
  // The account at the start of January 2027 (its close that month: nothing is drawn in it and the
  // close is before the month's growth), less what limb 5 took in the break, and not a cent more while back.
  const atStop = at(months, '2027-01').superBalance;
  assert.equal(drawn('2027-07', '2028-12'), atStop - inBreak);
  // Once it is used up, what Lee can reach is nothing, and the month is short instead.
  const last = between(months, '2027-07', '2028-12').filter((m) => m.notes.some((n) => n.subject === 'super withdrawal' && n.entryId === null)).at(-1);
  const after = between(months, nextMonth(last.month), '2028-12');
  assert.ok(after.length > 0);
  for (const m of after) assert.equal(reach(m), 0, m.month);
});

test('back at work, a loss takes the released figure down with it, and the Guarantee does not put it back (RF-1)', () => {
  // At -10% a year the account falls 0.9^(1/12) a month, floored: $100,000.00 is $89,999.93 by the
  // return, which is below what it held at the stop, so the released figure is cut to it. July's loss
  // takes it to $89,213.18 before July's Guarantee lands; the Guarantee ($200,000 a year) outruns the
  // loss from then on, but the released figure stays where the loss put it.
  const rows = gaps(KEPT, [retire('2027-01-15'), work('2027-07-01', 5, 200_000)], settings({ nominalReturn: -0.1 }));
  assert.equal(gapIn(rows, '2027-07').reach, 8_999_993);
  for (const row of rows.filter((r) => r.month >= '2027-08' && r.month <= '2028-12')) assert.equal(row.reach, 8_921_318, row.month);
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
