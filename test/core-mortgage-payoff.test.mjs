// P3-16 slice 3 — **`mortgagePayoff` and `retirementMonths`**, the two readings that make *"am I
// clear before I retire?"* answerable.
//
// The user's report is the specification: *"I manually trawled the months and saw the balance at 0
// but didn't know where else to see it in the ui."* `Month.mortgageBalance` has been on every month
// since slice 2 and nothing summarised it. These are the engine-side halves; the sentence and the
// chart marker are `test/app-mortgage-headline.test.mjs`.
//
// **Every balance asserted here is hand-worked from an INTEREST-FREE loan**, so that the schedule
// is arithmetic anyone can check in their head ($10,000 at $3,000 a month is 3,000/3,000/3,000/1,000)
// and no expectation is read off the engine. Slice 1's suite already proves the interest.
//
// **The seven cases the brief named, plus the one it did not**, each with its own test:
//   1. no loan at all            §1
//   2. paid off before retirement §5 (and the sentence suite)
//   3. still owing at retirement  §5 (and the sentence suite)
//   4. never repaid in the walk   §2
//   5. nobody retires             §4
//   6. a loan that starts later   §3
//   7. paid off, then borrowed again §3 — BOTH payoff dates, and which one the chart draws
//   8. one of a couple retires, the other has no RETIRE entry §4
import test from 'node:test';
import assert from 'node:assert/strict';

import { toCents } from '../dist/core/money.js';
import { project } from '../dist/core/projection.js';
import { mortgagePayoff, retirementMonths } from '../dist/core/outcomes.js';

const person = (name, dateOfBirth) => ({
  name,
  dateOfBirth,
  superInterests: [],
  parcels: [],
  employmentIncomePerFortnight: toCents(0),
  workBonusBalance: toCents(0),
});

/** `core-mortgage.test.mjs`'s settings — an eight-month walk, which is short enough to read whole. */
const SETTINGS = {
  asAtDate: '2026-09-16',
  planningHorizonAge: 72,
  economicSeries: { cpi: 0.025, pblci: 0.025, awote: 0.035, mtawe: 0.035 },
  deemingRates: { lower: 0.0175, upper: 0.0375 },
  nominalReturn: 0.065,
};

const entry = (id, type, date, params, owner = 'household') => ({
  id,
  date,
  owner,
  type,
  params,
  enabled: true,
  createdAt: '2026-06-01',
});

/** Spending far past the pension, so the month's cash opens at nil and no offset moves the interest. */
const spend = (annual) => entry('sc', 'SPEND_CHANGE', '2026-09-01', { annualSpend: toCents(annual) });
const refi = (id, date, balance, rate, repayment) =>
  entry(id, 'MORTGAGE_REFINANCE', date, {
    openingBalance: toCents(balance),
    annualInterestRate: rate,
    monthlyRepayment: toCents(repayment),
  });
const retire = (id, date, owner) => entry(id, 'RETIRE', date, {}, owner);

const solo = (mortgage) => ({
  persons: [person('Val', '1955-04-17')],
  homeStatus: 'occupied',
  ...(mortgage === undefined ? {} : { mortgage }),
});

/** Val turns 72 in 2027-04 and Bea is older, so the couple's walk is the same eight months. */
const couple = (mortgage) => ({
  persons: [person('Val', '1955-04-17'), person('Bea', '1954-08-09')],
  homeStatus: 'occupied',
  ...(mortgage === undefined ? {} : { mortgage }),
});

/** $10,000, no interest, $3,000 a month: 7,000 / 4,000 / 1,000 / 0, and nothing after. */
const PAID_OFF = Object.freeze({ openingBalance: toCents(10_000), annualInterestRate: 0, monthlyRepayment: toCents(3_000) });
/** $100,000 at the same repayment: $3,000 a month for eight months leaves $76,000 owing. */
const OUTLIVES = Object.freeze({ openingBalance: toCents(100_000), annualInterestRate: 0, monthlyRepayment: toCents(3_000) });

const walk = (household, entries) => project(SETTINGS, household, [spend(120_000), ...entries]);
const balances = (months) => months.map((month) => month.mortgageBalance);

// --- 1. NO LOAN AT ALL — the answer is a REAL one, and nothing else in the shape is filled in -----

test('A HOUSEHOLD WITH NO LOAN ANSWERS `noLoan`, and every other field is undefined', () => {
  const months = walk(solo(), []);
  assert.deepEqual(balances(months), Array(8).fill(undefined), 'no month carries the key at all');
  assert.deepEqual(mortgagePayoff(months, solo()), {
    outcome: 'noLoan',
    firstPayoff: undefined,
    clearForGood: undefined,
    owedAtHorizon: undefined,
    lastReported: undefined,
  });
  // ⚠️ ABSENCE IS THE ONLY SPELLING. A nil balance is a loan CLEARED and must NOT reach this answer:
  // the two are different facts and the page says different things about them.
  const cleared = walk(solo(PAID_OFF), []);
  assert.equal(cleared.at(-1).mortgageBalance, 0);
  assert.notEqual(mortgagePayoff(cleared, solo(PAID_OFF)).outcome, 'noLoan');
});

test('an empty walk is REFUSED rather than answered `noLoan` — a walk of nothing said nothing', () => {
  assert.throws(() => mortgagePayoff([], solo()), /no home loan payoff/);
});

// --- 2. NEVER REPAID INSIDE THE FORECAST ----------------------------------------------------------

test('A LOAN THAT OUTLIVES THE FORECAST HAS NO PAYOFF DATE, and says what is still owing', () => {
  // $100,000 less eight payments of $3,000 is $76,000, and the balance never reaches nil.
  const months = walk(solo(OUTLIVES), []);
  assert.deepEqual(balances(months), [97, 94, 91, 88, 85, 82, 79, 76].map((k) => toCents(k * 1_000)));
  const payoff = mortgagePayoff(months, solo(OUTLIVES));
  assert.equal(payoff.outcome, 'stillOwing');
  assert.equal(payoff.firstPayoff, undefined, 'a payoff that never happens is never dated');
  assert.equal(payoff.clearForGood, undefined);
  assert.equal(payoff.owedAtHorizon, toCents(76_000));
  assert.equal(payoff.lastReported, '2027-04');
});

// --- 3. MORE THAN ONE LOAN — the two payoff dates, and which one means "clear" --------------------

test('(6) A LOAN THAT STARTS LATER — the payoff is of THAT loan, and the months before it are not "clear"', () => {
  // No household loan; $6,000 at no interest from 2026-12, repaid at $3,000: owing in 2026-12,
  // clear in 2027-01. The three months before carry no key, and a month with no key is a month with
  // no loan — never a month in which the loan was paid off.
  const months = walk(solo(), [refi('first-home', '2026-12-01', 6_000, 0, 3_000)]);
  assert.deepEqual(balances(months), [undefined, undefined, undefined, toCents(3_000), 0, 0, 0, 0]);
  const payoff = mortgagePayoff(months, solo());
  assert.equal(payoff.outcome, 'clear');
  assert.equal(payoff.firstPayoff.month, '2027-01');
  assert.equal(payoff.clearForGood.month, '2027-01', 'the keyless months floor the walk back on their own');
});

test('(7) PAID OFF, THEN BORROWED AGAIN AND CLEARED — `firstPayoff` is the first, `clearForGood` the last', () => {
  // $10,000 at no interest clears in 2026-12. A $2,000 loan from 2027-01 at $1,000 a month owes
  // $1,000 in 2027-01 and clears in 2027-02. Both dates are true and they are different months.
  const months = walk(solo(PAID_OFF), [refi('again', '2027-01-01', 2_000, 0, 1_000)]);
  assert.deepEqual(balances(months), [
    toCents(7_000), toCents(4_000), toCents(1_000), 0, toCents(1_000), 0, 0, 0,
  ]);
  const payoff = mortgagePayoff(months, solo(PAID_OFF));
  assert.equal(payoff.outcome, 'clear');
  assert.equal(payoff.firstPayoff.month, '2026-12');
  assert.equal(payoff.clearForGood.month, '2027-02', 'the run of nil months that reaches the end starts in 2027-02');
  // THE RULING: the chart draws `clearForGood`. An upright rule captioned "Home loan clear" drawn at
  // 2026-12 would be making that claim about 2027-01, in which $1,000 is owed.
  assert.notEqual(payoff.firstPayoff.month, payoff.clearForGood.month);
  assert.equal(months[4].mortgageBalance > 0, true, 'the month between the two payoffs owes money');
});

test('(7) PAID OFF, THEN BORROWED AGAIN AND NOT CLEARED — a payoff date AND `stillOwing`', () => {
  // The same first loan, then $50,000 at 6.0% repaid at $1,000 from 2027-01 — slice 2's own
  // transition (vi) fixture. A build that reported "paid off in 2026-12" and stopped would be
  // announcing a clear house to a household that owes $46,977.44 at the horizon.
  const months = walk(solo(PAID_OFF), [refi('again', '2027-01-01', 50_000, 0.06, 1_000)]);
  const payoff = mortgagePayoff(months, solo(PAID_OFF));
  assert.equal(payoff.outcome, 'stillOwing');
  assert.equal(payoff.firstPayoff.month, '2026-12', 'the first payoff really happened and is not erased');
  assert.equal(payoff.clearForGood, undefined, 'and there is no month from which nothing is owed again');
  assert.equal(payoff.owedAtHorizon, toCents(46_977.44));
});

// --- 4. WHEN EACH PERSON RETIRES, off the walk's own provenance -----------------------------------

test('NOBODY RETIRES — every Person answers `undefined`, which is a fact about the plan', () => {
  const months = walk(couple(PAID_OFF), []);
  assert.deepEqual(retirementMonths(months, couple(PAID_OFF), [spend(120_000)]), [
    { name: 'Val', month: undefined, age: undefined },
    { name: 'Bea', month: undefined, age: undefined },
  ]);
});

test('A COUPLE RETIRING IN DIFFERENT MONTHS GETS TWO ANSWERS, in `household.persons` order', () => {
  const entries = [spend(120_000), retire('r1', '2026-11-01', 'personA'), retire('r2', '2027-01-01', 'personB')];
  const months = project(SETTINGS, couple(PAID_OFF), entries);
  const found = retirementMonths(months, couple(PAID_OFF), entries);
  assert.deepEqual(found, [
    { name: 'Val', month: '2026-11', age: 71 },
    { name: 'Bea', month: '2027-01', age: 72 },
  ]);
  // ⚠️ NEITHER IS DROPPED AND NEITHER IS THE OTHER. Two different months and two different ages.
  assert.notEqual(found[0].month, found[1].month);
  assert.notEqual(found[0].age, found[1].age);
});

test('(8) ONE OF A COUPLE RETIRES AND THE OTHER HAS NO ENTRY — the answer is per Person', () => {
  const entries = [spend(120_000), retire('r1', '2026-11-01', 'personB')];
  const months = project(SETTINGS, couple(PAID_OFF), entries);
  assert.deepEqual(retirementMonths(months, couple(PAID_OFF), entries), [
    { name: 'Val', month: undefined, age: undefined },
    { name: 'Bea', month: '2026-11', age: 72 },
  ]);
});

test('A HOUSEHOLD-OWNED RETIREMENT REACHES BOTH, a disabled one reaches nobody, and a pre-dated one lands in month 0', () => {
  const both = [spend(120_000), retire('r', '2026-11-01', 'household')];
  const months = project(SETTINGS, couple(PAID_OFF), both);
  assert.deepEqual(
    retirementMonths(months, couple(PAID_OFF), both).map((found) => found.month),
    ['2026-11', '2026-11'],
  );

  const off = [spend(120_000), { ...retire('r', '2026-11-01', 'household'), enabled: false }];
  const offMonths = project(SETTINGS, couple(PAID_OFF), off);
  assert.deepEqual(
    retirementMonths(offMonths, couple(PAID_OFF), off).map((found) => found.month),
    [undefined, undefined],
    'a switched-off entry applies in no month, so it is cited in none',
  );

  // `RETIRE` is an `ENTRY_KIND` level, so one dated before `asAtDate` is a standing fact applied in
  // month 0 — and this reads the walk's own answer rather than re-deciding it from the entry's date.
  const old = [spend(120_000), retire('r', '2001-06-01', 'personA')];
  const oldMonths = project(SETTINGS, couple(PAID_OFF), old);
  assert.equal(retirementMonths(oldMonths, couple(PAID_OFF), old)[0].month, '2026-09');
  assert.equal(oldMonths[0].month, '2026-09');
});

test('THE EARLIEST RETIREMENT WINS where a Person has two — the walk cites both and the first month is taken', () => {
  const entries = [spend(120_000), retire('late', '2027-02-01', 'personA'), retire('early', '2026-11-01', 'personA')];
  const months = project(SETTINGS, couple(PAID_OFF), entries);
  assert.equal(retirementMonths(months, couple(PAID_OFF), entries)[0].month, '2026-11');
});

// --- 5. THE TWO HALVES TOGETHER — the question the slice exists to answer -------------------------

test('THE COUPLE CASE: one retires still owing and the other retires clear, off ONE walk', () => {
  const entries = [spend(120_000), retire('r1', '2026-11-01', 'personA'), retire('r2', '2027-01-01', 'personB')];
  const months = project(SETTINGS, couple(PAID_OFF), entries);
  const payoff = mortgagePayoff(months, couple(PAID_OFF));
  const [val, bea] = retirementMonths(months, couple(PAID_OFF), entries);
  assert.equal(payoff.clearForGood.month, '2026-12');
  // Val retires in 2026-11 with $1,000 owing; Bea retires in 2027-01 with nothing owing. A single
  // "before you retire" answer would have to pick one of these two, and both are true.
  assert.equal(months[2].mortgageBalance, toCents(1_000));
  assert.equal(val.month, '2026-11');
  assert.equal(months[4].mortgageBalance, 0);
  assert.equal(bea.month, '2027-01');
  // BOTH ages are on the marker too, for the same reason.
  assert.deepEqual(payoff.clearForGood.ages.map((age) => age.name), ['Val', 'Bea']);
  assert.deepEqual(payoff.clearForGood.ages.map((age) => age.age), [71, 72]);
});
