// P4-5 — the Shortfall Age, read off the walk.
//
// **The failure this file is written against is a FLATTERING FIXTURE**, and there are two specific
// ones available here:
//
//   * a fixture whose first shortfall month is also the first month of its final unbroken run
//     proves nothing about which of the two definitions was implemented — so §3 below is a walk that
//     falls short, RECOVERS, and then falls short again and stays short, where the two readings are
//     fourteen months apart and every assertion names which one it is asserting;
//   * a Household whose two people are the same age cannot tell you whose age is reported — so every
//     fixture here is a COUPLE born **six and a half years apart**, Sam on 1979-06-15 and Ali on
//     1972-11-20, and every age assertion is a pair of different numbers in a stated order.
//
// Ali has no salary, no super and no financial assets, and is under Age Pension age for the whole
// walk, so the cashflow is Sam's alone and is the very cashflow
// `test/core-projection-waterfall.test.mjs` hand-works month by month: net pay $5,236.67 a month in
// FY2026-27 ($6,500.00 salary less $1,263.33 tax) and $5,279.83 in FY2027-28 (less $1,220.17), a
// spending level of $5,000.01 a month, and therefore $236.66 and $279.82 a month banked in the
// Offset. Every shortfall figure below is worked from those two numbers and written out long, and
// every AGE below is worked from a date of birth and a month and nothing else.
import test from 'node:test';
import assert from 'node:assert/strict';

import { toCents } from '../dist/core/money.js';
import { SHORTFALL_LINE, project } from '../dist/core/projection.js';
import { shortfallAge } from '../dist/core/outcomes.js';

/** Sam earns; Ali is six and a half years older and earns nothing. The ages are what this file tests. */
const COUPLE = {
  persons: [
    {
      name: 'Sam',
      dateOfBirth: '1979-06-15',
      // P6-8 brief 3 chunk 2b: the employer Superannuation Guarantee has to land in a NAMED account,
      // so a salaried Person holds one and the walk refuses a salary with nowhere to pay it. A NIL
      // balance is the smallest change that makes the fixture honest: it moves no figure of its own.
      superInterests: [{ phase: 'accumulation', balance: toCents(0) }],
      parcels: [],
      employmentIncomePerFortnight: toCents(3_000),
      workBonusBalance: toCents(0),
    },
    {
      name: 'Ali',
      dateOfBirth: '1972-11-20',
      // P6-8 brief 3 chunk 2b: the employer Superannuation Guarantee has to land in a NAMED account,
      // so a salaried Person holds one and the walk refuses a salary with nowhere to pay it. A NIL
      // balance is the smallest change that makes the fixture honest: it moves no figure of its own.
      superInterests: [{ phase: 'accumulation', balance: toCents(0) }],
      parcels: [],
      employmentIncomePerFortnight: toCents(0),
      workBonusBalance: toCents(0),
    },
  ],
  homeStatus: 'occupied',
};

/** Sam's 49th birthday is 2028-06-15 and Ali passed 49 long ago, so the walk is 2026-07 → 2028-06. */
const SETTINGS = {
  asAtDate: '2026-07-01',
  planningHorizonAge: 49,
  // ⚠️ **`cpi: 0`, AND IT IS THE ALGEBRAIC CONTROL RATHER THAN A SPECIAL CASE** (register O85,
  // user ruling 2026-09-21). The stated spending level is a REAL figure now and `project()` raises it
  // to each month's own price level, so at any positive CPI every hand-worked figure below would
  // carry a `(1 + cpi) ^ (n / 12)` in it and this fixture would be arithmetic about indexation rather
  // than about what it was written for. At nil the factor is exactly 1 in every month
  // (`core/priceLevel.ts`), so every figure here is the figure it was hand-worked as. The indexation
  // itself is asserted in `test/core-projection-waterfall.test.mjs` §8, on its own fixture.
  // Pay rising with wages (2026-09-23) is not this fixture's subject: `awote: 0` holds every salary at the figure stated. A proved control: every figure this file asserts is the same at nil on the build before pay rose.
  economicSeries: { cpi: 0, pblci: 0.025, awote: 0, mtawe: 0.035 },
  deemingRates: { lower: 0.0175, upper: 0.0375 },
  nominalReturn: 0.065,
};

const entry = (id, type, date, params) => ({
  id,
  date,
  owner: 'household',
  type,
  params,
  enabled: true,
  createdAt: '2026-06-01',
});

const SPEND = entry('sc', 'SPEND_CHANGE', '2026-07-01', { annualSpend: toCents(60_000.01) });
const ONE_OFF_2027_03 = entry('oo', 'ONE_OFF_EXPENSE', '2027-03-10', { amount: toCents(30_000) });

const read = (entries, household = COUPLE) => shortfallAge(project(SETTINGS, household, entries), household);
const shortMonths = (entries, household = COUPLE) =>
  project(SETTINGS, household, entries)
    .filter((m) => m.lines.some((l) => l.description === SHORTFALL_LINE))
    .map((m) => m.month);

// --- 1. A WALK THAT NEVER FALLS SHORT — a real answer, not a missing one ------------------------

test('NEVER, within the horizon — and it is spelled, not left as an absent value', () => {
  // Sam nets $5,236.67 against a $5,000.01 bill: there is no month of these twenty-four the
  // Waterfall cannot meet, so the walk emits no `Unfunded shortfall` line at all.
  assert.deepEqual(shortMonths([SPEND]), []);

  const answer = read([SPEND]);
  // `'never'` is the whole answer. A caller must not have to tell it apart from an unanswered
  // question, and must not be able to confuse it with a shortfall in the last month — which is what
  // §4 below asserts from the other side.
  assert.equal(answer.outcome, 'never');
  assert.equal(answer.monthsShort, 0);
  assert.equal(answer.recovered, false);
  assert.equal(answer.firstShortfall, undefined);
  assert.equal(answer.pointOfNoRecovery, undefined);

  // Not vacuous: this fixture really did run a full walk with real money in it.
  const months = project(SETTINGS, COUPLE, [SPEND]);
  assert.equal(months.length, 24);
  assert.equal(months.at(-1).closingBalance, toCents(6_197.76)); // 12 × $236.66 + 12 × $279.82
});

// --- 2. A WALK THAT FALLS SHORT AT A KNOWN MONTH — the ages, hand-worked ------------------------

test('HAND-WORKED — the month, and the two ages in it', () => {
  // THE MONTH, from the cashflow:
  //   by the close of 2027-02 the Offset holds eight months of $236.66      =  $1,893.28
  //   2027-03 target  $5,000.01 spending + $30,000.00 one-off               = $35,000.01
  //   funded          $5,236.67 net pay + $1,893.28 offset                  =  $7,129.95
  //   SHORTFALL       $35,000.01 − $7,129.95                                = $27,870.06
  assert.deepEqual(shortMonths([SPEND, ONE_OFF_2027_03]), ['2027-03']);

  const answer = read([SPEND, ONE_OFF_2027_03]);
  assert.equal(answer.outcome, 'shortfall');
  assert.equal(answer.firstShortfall.month, '2027-03');

  // THE AGES, from the dates of birth and the FIRST DAY of that month, and from nothing else:
  //   Sam, born 1979-06-15, on 2027-03-01: 2027 − 1979 = 48, and 03-01 is before 06-15, so 47.
  //   Ali, born 1972-11-20, on 2027-03-01: 2027 − 1972 = 55, and 03-01 is before 11-20, so 54.
  // Seven years apart, in `household.persons` order, each carrying the name it belongs to — so an
  // answer that reported one person, or the wrong one, or the right ages under swapped names, is a
  // different assertion and not a relabelling.
  assert.deepEqual(answer.firstShortfall.ages, [
    { name: 'Sam', age: 47 },
    { name: 'Ali', age: 54 },
  ]);
});

// --- 3. SHORT, THEN RECOVERED, THEN SHORT FOR GOOD — the fixture the definition turns on --------

test('RECOVERY — the Shortfall Age is the FIRST short month, and the point of no recovery is reported beside it', () => {
  // Three shortfall months in two runs, fourteen months apart, so "the first short month" and "the
  // first month of the final run" are different answers and an implementation cannot satisfy both:
  //
  //   2027-03  the $30,000 one-off, as in §2                              short by $27,870.06
  //   2027-04 … 2028-04  recovered: $5,236.67 / $5,279.83 against $5,000.01 — thirteen funded months
  //   2028-05  the spending level jumps to $1,200,000 a year = $100,000.00 a month.
  //            Offset at 2028-05: 3 × $236.66 + 10 × $279.82                 =  $3,508.18
  //            funded  $5,279.83 + $3,508.18                                 =  $8,788.01
  //            SHORTFALL  $100,000.00 − $8,788.01                            = $91,211.99
  //   2028-06  the Offset is empty, so funded is the net pay alone           =  $5,279.83
  //            SHORTFALL  $100,000.00 − $5,279.83                            = $94,720.17
  const ENTRIES = [SPEND, ONE_OFF_2027_03, entry('sc2', 'SPEND_CHANGE', '2028-05-01', { annualSpend: toCents(1_200_000) })];
  assert.deepEqual(shortMonths(ENTRIES), ['2027-03', '2028-05', '2028-06']);

  const answer = read(ENTRIES);
  assert.equal(answer.outcome, 'shortfall');
  assert.equal(answer.monthsShort, 3);

  // THE READING TAKEN: the Shortfall Age is 2027-03, the month the plan first could not be funded.
  //   Sam on 2027-03-01: 47.  Ali on 2027-03-01: 54.
  assert.equal(answer.firstShortfall.month, '2027-03');
  assert.deepEqual(answer.firstShortfall.ages, [
    { name: 'Sam', age: 47 },
    { name: 'Ali', age: 54 },
  ]);

  // THE COMPETING READING, reported rather than discarded: the point from which the Household never
  // recovers within the horizon is 2028-05 — the start of the FINAL run, not of the first one.
  //   Sam on 2028-05-01: 2028 − 1979 = 49, and 05-01 is before 06-15, so 48.
  //   Ali on 2028-05-01: 2028 − 1972 = 56, and 05-01 is before 11-20, so 55.
  assert.equal(answer.pointOfNoRecovery.month, '2028-05');
  assert.deepEqual(answer.pointOfNoRecovery.ages, [
    { name: 'Sam', age: 48 },
    { name: 'Ali', age: 55 },
  ]);
  assert.equal(answer.recovered, true);

  // And the two are genuinely different facts here: fourteen months and a birthday apart.
  assert.notEqual(answer.firstShortfall.month, answer.pointOfNoRecovery.month);
});

test('a walk that falls short and recovers ENTIRELY still has a Shortfall Age, and no point of no recovery', () => {
  // §2's fixture, read for the other half of the rule: one lean month, thirteen good ones after it,
  // and a walk that ends funded. Under "the first month of the final unbroken run" this Household
  // would have NO Shortfall Age at all — which is the flattering answer this reading refuses.
  const answer = read([SPEND, ONE_OFF_2027_03]);
  assert.equal(answer.outcome, 'shortfall');
  assert.equal(answer.firstShortfall.month, '2027-03');
  assert.equal(answer.pointOfNoRecovery, undefined); // the walk ends funded
  assert.equal(answer.recovered, true);
  assert.equal(answer.monthsShort, 1);
  assert.equal(project(SETTINGS, COUPLE, [SPEND, ONE_OFF_2027_03]).at(-1).closingBalance, toCents(4_067.82)); // 3 × $236.66 + 12 × $279.82
});

// --- 4. THE BOUNDARIES — the very first month, and the very last --------------------------------

test('THE FIRST MONTH — month zero is a Shortfall Age like any other', () => {
  // Sam earns nothing, the Offset opens at nil, and the bill is $5,000.01 on day one, so every one
  // of the twenty-four months falls short by exactly the bill and the walk never recovers.
  const brokeSam = { ...COUPLE, persons: [{ ...COUPLE.persons[0], employmentIncomePerFortnight: toCents(0) }, COUPLE.persons[1]] };
  assert.equal(shortMonths([SPEND], brokeSam).length, 24);
  assert.equal(shortMonths([SPEND], brokeSam)[0], '2026-07');

  const answer = read([SPEND], brokeSam);
  assert.equal(answer.outcome, 'shortfall');
  assert.equal(answer.monthsShort, 24);
  assert.equal(answer.recovered, false);
  // Here — and only where nothing recovers — the two readings coincide, which is precisely why this
  // fixture cannot be the only one in the file.
  assert.equal(answer.firstShortfall.month, '2026-07');
  assert.equal(answer.pointOfNoRecovery.month, '2026-07');
  //   Sam on 2026-07-01: 2026 − 1979 = 47, and 07-01 is NOT before 06-15, so 47.
  //   Ali on 2026-07-01: 2026 − 1972 = 54, and 07-01 is before 11-20, so 53.
  assert.deepEqual(answer.firstShortfall.ages, [
    { name: 'Sam', age: 47 },
    { name: 'Ali', age: 53 },
  ]);
});

test('THE LAST MONTH — a shortfall in the horizon month is a shortfall, not a "never"', () => {
  // The same walk, funded for twenty-three months, with a $30,000 one-off landing in the last:
  //   Offset at 2028-06:  12 × $236.66 + 11 × $279.82                       =  $5,917.94
  //   target              $5,000.01 + $30,000.00                            = $35,000.01
  //   funded              $5,279.83 net pay + $5,917.94 offset              = $11,197.77
  //   SHORTFALL           $35,000.01 − $11,197.77                           = $23,802.24
  const ENTRIES = [SPEND, entry('oo', 'ONE_OFF_EXPENSE', '2028-06-10', { amount: toCents(30_000) })];
  assert.deepEqual(shortMonths(ENTRIES), ['2028-06']);

  const answer = read(ENTRIES);
  assert.equal(answer.outcome, 'shortfall'); // NOT 'never', though twenty-three of twenty-four months were funded
  assert.equal(answer.monthsShort, 1);
  assert.equal(answer.recovered, false); // nothing followed it: the horizon did
  assert.equal(answer.firstShortfall.month, '2028-06');
  assert.equal(answer.pointOfNoRecovery.month, '2028-06');

  // THE AGE CONVENTION, and this is the month that proves it. Sam's 49th birthday is 2028-06-15 —
  // inside this very month — and the reported age is 48, because the age is taken on the FIRST day
  // of the month, as the walk itself takes the asset split and the means test.
  //   Sam on 2028-06-01: 2028 − 1979 = 49, and 06-01 is before 06-15, so 48.
  //   Ali on 2028-06-01: 2028 − 1972 = 56, and 06-01 is before 11-20, so 55.
  assert.deepEqual(answer.firstShortfall.ages, [
    { name: 'Sam', age: 48 },
    { name: 'Ali', age: 55 },
  ]);
  // And the horizon really is Sam's 49th-birthday month, so 48 is a live boundary and not a spare one.
  assert.equal(project(SETTINGS, COUPLE, ENTRIES).at(-1).month, '2028-06');
});

// --- 5. THE REFUSAL ----------------------------------------------------------------------------

test('a projection with no months is REFUSED, not answered "never"', () => {
  // `project()` cannot return this — it throws when the horizon is before `asAtDate` — but a caller
  // that filtered or sliced can hand it over, and "no months" is not evidence that the money lasted.
  assert.throws(() => shortfallAge([], COUPLE), /no months has no Shortfall Age/);
  // The one-month case, by contrast, is answered rather than refused.
  assert.equal(shortfallAge(project(SETTINGS, COUPLE, [SPEND]).slice(0, 1), COUPLE).outcome, 'never');
});

test('an OUTFLOW named "Unfunded shortfall" is not a shortfall — the direction is read, not just the name', () => {
  // **This test exists because dropping the `direction === 'inflow'` check failed ZERO tests.** The
  // walk only ever emits `SHORTFALL_LINE` as an inflow, so no fixture built through `project()` can
  // reach it — but `shortfallAge` is exported over `Month[]`, so a caller can hand it one, and the
  // day something pays a shortfall BACK the name alone stops being the answer. `MonthLine`'s own
  // doc is the rule: *"direction carries the sign"*.
  const line = (direction, description, amount) => ({ direction, description, amount });
  const month = (isoMonth, lines) => ({
    month: isoMonth,
    openingBalance: toCents(0),
    closingBalance: toCents(0),
    lines,
    appliedEntryIds: [],
    protectedAssets: toCents(0),
    assessableAssets: toCents(0),
    // P4-6 widened `Month`. Nil here, because this Household holds nothing at all: what is being
    // tested is the DIRECTION of a line, and reachable money is no part of the Shortfall Age.
    accessibleAssets: toCents(0),
  });

  const repaid = [month('2027-03', [line('outflow', SHORTFALL_LINE, toCents(100))])];
  assert.equal(shortfallAge(repaid, COUPLE).outcome, 'never');

  // The control, one word apart: the same line as an INFLOW is a shortfall, and dates the age.
  //   Sam on 2027-03-01: 47.  Ali on 2027-03-01: 54.
  const short = [month('2027-03', [line('inflow', SHORTFALL_LINE, toCents(100))])];
  const answer = shortfallAge(short, COUPLE);
  assert.equal(answer.outcome, 'shortfall');
  assert.equal(answer.firstShortfall.month, '2027-03');
  assert.deepEqual(answer.firstShortfall.ages, [
    { name: 'Sam', age: 47 },
    { name: 'Ali', age: 54 },
  ]);
});
