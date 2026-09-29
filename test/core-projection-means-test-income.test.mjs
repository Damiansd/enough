// P4-8 — **the Journal reaches the Age Pension income test.** This file is the fixture that went
// red before the fix and green after it, and it exists because the defect it closes was invisible
// from every other angle in the suite.
//
// **What was wrong until 2026-09-19.** `applyWorkBonus` reads `Person.employmentIncomePerFortnight`
// raw, and the `Household` handed to `agePensionEntitlement` was built by `withBalances`, which
// spread `...person` and substituted only the parcels, the super interest balances and the Offset.
// The walk's own in-force salary — the `salaries` array, which `RETIRE` drives to nil, a zero-day
// `WORK_PATTERN_CHANGE` drives to nil, and a stated `annualSalary` replaces — never reached the
// means test at all. So a Person who retired in 2031 went on being assessed on the wage the
// Household stated on day 1, for every remaining month of the walk.
//
// **Direction: assessed income too high → pension too low → wealth UNDERSTATED.** Conservative,
// which is presumably why it survived, and wrong: it is the direction that hides a household's
// actual eligibility from them, and the honest direction does not make a wrong figure right.
//
// **Why no existing fixture caught it.** A walk shows a retirement in two places — the `Salary,`
// line stops and the `Age Pension` line rises — and only the first of them was ever asserted. The
// pension line kept paying its reduced figure and nothing in the output said which income it had
// been reduced against. Every assertion here is on the SECOND fact.
//
// **Two things this file pinned as gaps and did NOT fix. One of them is now fixed here.**
//
//   ✅ **P4-10, fixed 2026-09-19 — the walk carries `Person.workBonusBalance`.** §5 was written as
//   the failing witness for it: it asserted that a stated balance was never depleted (the
//   OVER-stating half) and §4 asserted that a Person who stopped work never banked the accrual
//   (the UNDER-stating half). Both are now assertions of the fixed behaviour — §5 watches a full
//   $11,800 run out and the shelter END, §2 watches two months off pay for a restart, and §6 pins
//   the $11,800 cap and the fortnight-per-month convention the carry needed.
//
//   ⚠️ **STILL OPEN — `applyWorkBonus`'s `eligible` flag is gated on Age Pension age alone.** A
//   separate blast radius, deliberately untouched by P4-8 and by P4-10, and pinned at the end of
//   §5. What is written there is its DIRECTION, tested.
import test from 'node:test';
import assert from 'node:assert/strict';

import { toCents } from '../dist/core/money.js';
import { AGE_PENSION_LINE, fortnightsInWalkMonth, project, withBalances, workBonusBalanceAfterMonth } from '../dist/core/projection.js';
import { agePensionEntitlement } from '../dist/core/agePension.js';
import { WORK_BONUS_MAXIMUM_BALANCE, WORK_BONUS_STARTING_BALANCE, applyWorkBonus } from '../dist/core/workBonus.js';

/**
 * **Ray, 70 and working, in the PUBLISHED parameter window** — born 1956-06-15, so of Age Pension
 * age throughout, and walked from 2026-07 with no `agePension` indexation series at all. The rates
 * are therefore the determined ones (the 2026-09-20 period holds for every month asserted below)
 * and every figure here is hand-workable against `AGE_PENSION` rather than against a synthetic
 * series. The walk runs to Ray's 71st birthday; the last three months carry no Age Pension line
 * because the published parameters end on 2027-03-19, which is why nothing is asserted about them.
 *
 * $1,500 a fortnight of employment income, a nil Work Bonus balance, no parcels, and — since P6-8
 * brief 3 chunk 2b — an accumulation interest that opens at NIL and receives Ray's employer
 * Superannuation Guarantee. The Offset Account is no longer the whole of the assets: Ray is 70, so
 * that interest is ASSESSED and DEEMED rather than exempt (§4.8 exempts accumulation super only
 * below Age Pension age), and every deemed figure below is computed on the Offset PLUS the
 * Guarantee paid so far. Both are small, so the deemed income is still a few dollars a fortnight
 * and the income test is still driven by the WAGE. That is the point of the fixture.
 *
 * **The Guarantee itself, hand-derived once:** 12% of $39,000 ($1,500 × 26) is $4,680 a year, a
 * twelfth of which is $390.00, less the fund's 15% = **$331.50 into the interest every month Ray
 * works**. It is never cash — it goes from the employer to the fund — so it moves no Offset balance
 * and no salary line, and it reaches the Age Pension through the ASSETS side alone.
 */
const ray = (over = {}) => ({
  persons: [
    {
      name: 'Ray',
      dateOfBirth: '1956-06-15',
      // P6-8 brief 3 chunk 2b: the employer Superannuation Guarantee has to land in a NAMED account,
      // so a salaried Person holds one and the walk refuses a salary with nowhere to pay it. A NIL
      // balance is the smallest change that makes the fixture honest: it moves no figure of its own.
      superInterests: [{ phase: 'accumulation', balance: toCents(0) }],
      parcels: [],
      employmentIncomePerFortnight: toCents(1_500),
      workBonusBalance: toCents(0),
      ...over,
    },
  ],
  homeStatus: 'occupied',
});

const SETTINGS = {
  asAtDate: '2026-07-01',
  planningHorizonAge: 71,
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

const entry = (id, type, date, params, owner = 'household') => ({
  id,
  date,
  owner,
  type,
  params,
  enabled: true,
  createdAt: '2026-06-01',
});
const SPEND = entry('sc', 'SPEND_CHANGE', '2026-07-01', { annualSpend: toCents(30_000) });

const monthAt = (months, isoMonth) => months.find((m) => m.month === isoMonth);
const pensionAt = (months, isoMonth) => monthAt(months, isoMonth).lines.find((l) => l.description === AGE_PENSION_LINE)?.amount;
const salaryAt = (months, isoMonth) => monthAt(months, isoMonth).lines.find((l) => l.description === 'Salary, Ray')?.amount;

/**
 * **THE HAND-WORKED PAIR, and every figure below is one of these two.** Both months fall in the
 * rate period commencing 2026-09-20 and both are assessed on the month's own opening Offset:
 *
 *   NOVEMBER, still working. Maximum single rate $1,237.70/fn. Ray's $1,500 wage less the $300
 *   Work Bonus fortnightly accrual = **$1,200.00** of assessed employment income; the deemed assets
 *   open at $10,488.64 — a $9,152.15 Offset plus $1,336.49 of superannuation, being four months of
 *   Guarantee and the growth on it — wholly below the deeming threshold, so 1.75% of it is $183.55
 *   a year and **+ $7.06 deemed** = $1,207.06 assessed; less the $226.00 income free area =
 *   $981.06 excess; at 50c in the dollar = $490.53 off the rate → **$747.17/fn → × 26 ÷ 12 =
 *   $1,618.87 a month.**
 *
 *   DECEMBER, not working. The same maximum rate, and $8.86 of deemed income on $13,170.21 of
 *   Offset and superannuation — which is BELOW the $226.00 free area, so no test binds at all and
 *   the rate is the maximum: **$1,237.70/fn → × 26 ÷ 12 = $2,681.68 a month.** The Guarantee moves
 *   this figure not at all, which is the point of a free area: it is the WAGE that binds.
 *
 * The rise is November's whole reduction, which is what stopping work removes: $490.53 × 26 ÷ 12 =
 * **$1,062.81**. Before this fix December paid $1,617.80 — the reduction recomputed against a wage
 * Ray no longer earned, two dollars BELOW November's because the Offset had grown and the deeming
 * with it. The pension went DOWN in the month the salary stopped, and that is what was wrong.
 */
const WORKING_NOVEMBER = toCents(1_618.87);
const MAXIMUM_DECEMBER = toCents(2_681.68);
const THE_RISE = toCents(1_062.81);

// --- 1. RETIRE ----------------------------------------------------------------------------------

test('RETIRE reaches the income test — the pension RISES in the month gainful employment ceases', () => {
  // Dated 30 November, the last day worked: a RETIRE month pays its days up to that date
  // (2026-09-23), so November is paid whole and December is the first month with no wage.
  const months = project(SETTINGS, ray(), [SPEND, entry('r', 'RETIRE', '2026-11-30', {})]);

  // The first fact, which was true before the fix as well: the salary line stops.
  assert.equal(salaryAt(months, '2026-11'), toCents(3_250)); // $1,500 × 26 ÷ 12
  assert.equal(salaryAt(months, '2026-12'), undefined);

  // The second fact, which is the one this file exists for.
  assert.equal(pensionAt(months, '2026-11'), WORKING_NOVEMBER);
  assert.equal(pensionAt(months, '2026-12'), MAXIMUM_DECEMBER);
  assert.equal(pensionAt(months, '2026-12') - pensionAt(months, '2026-11'), THE_RISE);
  assert.ok(pensionAt(months, '2026-12') > pensionAt(months, '2026-11'), 'a retired Person is assessed on nil employment income, so the pension must RISE');

  // And it STAYS risen: `RETIRE` is not a month's event, and nothing un-retires. Every remaining
  // month in the parameter window is paid the maximum rate, flat, because the only assessable
  // income left is deeming on an Offset far below the free area — so the rate cannot move with the
  // balance either. Before the fix these four months paid a figure that DECLINED month on month.
  const inWindow = months.filter((m) => m.month >= '2026-12' && m.month <= '2027-03');
  assert.equal(inWindow.length, 4);
  assert.deepEqual(new Set(inWindow.map((m) => pensionAt(months, m.month))), new Set([MAXIMUM_DECEMBER]));
  assert.equal(months.filter((m) => salaryAt(months, m.month) !== undefined).length, 5); // 2026-07 to 2026-11

  // The months BEFORE the retirement are untouched by the fix: while Ray is working, the in-force
  // figure IS `employmentIncomePerFortnight` and the means test sees exactly what it always saw.
  // July is the FIRST month of the walk: nothing has been banked and no Guarantee has been paid
  // yet, so it is the one month chunk 2b could not move — and it did not.
  assert.equal(pensionAt(months, '2026-07'), toCents(1_546.78));
  assert.equal(pensionAt(months, '2026-10'), toCents(1_620.82)); // the 2026-09-20 indexation, one month on
});

// --- 2. A zero-day work pattern, and the restart that follows it --------------------------------

test('a zero-day WORK_PATTERN_CHANGE reaches it by the same route, and a later stated salary is a LEVEL', () => {
  const stopped = project(SETTINGS, ray(), [SPEND, entry('w', 'WORK_PATTERN_CHANGE', '2026-12-01', { daysPerWeek: 0 })]);

  // Zero days is zero labour income, so the income test sees what `RETIRE` makes it see, to the
  // cent — and it must, because the two reach it through the same in-force figure.
  assert.equal(pensionAt(stopped, '2026-11'), WORKING_NOVEMBER);
  assert.equal(pensionAt(stopped, '2026-12'), MAXIMUM_DECEMBER);
  assert.equal(salaryAt(stopped, '2026-12'), undefined);

  // **Unlike `RETIRE` it is reversible, and the restart is assessed at the NEW stated figure.**
  // $26,000 a year is $1,000 a fortnight exactly; less the $300 accrual, $700.00 a fortnight is
  // left to assess.
  //
  // ⚠️ **AND SINCE P4-10 IT IS NOT ASSESSED, BECAUSE THE TWO MONTHS OFF BANKED ENOUGH TO COVER IT
  // — this is the accrual half of the gap, now observable through `project()`.** Ray stops on
  // 2026-12-01 holding nil, and a Person of Age Pension age who earns nothing banks the whole $300
  // accrual in every fortnight they do not work (§4.6, "accrues whether or not the Person works").
  // December is the sixth month of this walk and so carries THREE fortnights, January two:
  //
  //   5 fortnights × $300 = **$1,500 banked** by the time work restarts on 2027-02-01.
  //
  // February then draws $700 of that $1,500, so **nothing at all is assessed on the wage**: the
  // only assessable income is $9.12 of deeming on $13,551.23 of Offset and superannuation, which is
  // below the $226.00 free area, so neither test binds and Ray is paid the maximum — the same
  // $2,681.68 the two months off were paid. Before P4-10 the banked $1,500 did not exist and
  // February paid $2,159.54.
  const restarted = project(SETTINGS, ray(), [
    SPEND,
    entry('w', 'WORK_PATTERN_CHANGE', '2026-12-01', { daysPerWeek: 0 }),
    entry('w2', 'WORK_PATTERN_CHANGE', '2027-02-01', { daysPerWeek: 3, annualSalary: toCents(26_000) }),
  ]);
  assert.equal(pensionAt(restarted, '2027-01'), MAXIMUM_DECEMBER);
  assert.equal(salaryAt(restarted, '2027-02'), toCents(2_166.67)); // $26,000 ÷ 12
  assert.equal(pensionAt(restarted, '2027-02'), MAXIMUM_DECEMBER);
  assert.ok(pensionAt(restarted, '2027-02') > WORKING_NOVEMBER, 'nowhere near the rate the ORIGINAL $1,500 wage produced');
  // **The salary is real and the pension is undisturbed, which is the whole claim.** A month that
  // pays a $2,166.67 wage and the MAXIMUM pension is a month whose wage was sheltered by a balance
  // earned in the months before it — there is no other way to hold both at once.
  assert.equal(pensionAt(restarted, '2027-02'), pensionAt(restarted, '2027-01'));
  assert.notEqual(salaryAt(restarted, '2027-02'), salaryAt(restarted, '2027-01'));
  assert.equal(salaryAt(restarted, '2027-01'), undefined);

  // **AND THE BANKED BALANCE IS SPENT, on the schedule §4.6 gives it.** February carries two
  // fortnights, each drawing $700, so $1,400 of the $1,500 is gone and **$100 is left** to open
  // March with. March therefore assesses $700 − $100 = **$600.00** of employment income, + $10.86
  // deemed on $16,129.48 of Offset and superannuation = $610.86, less $226.00 = $384.86 excess,
  // halved = $192.43 off $1,237.70 → $1,045.27/fn → × 26 ÷ 12 = **$2,264.75 a month.** The pension falls for the first
  // time two months AFTER the wage restarted, which is exactly what a spent balance looks like and
  // is not something a stated balance could ever show.
  assert.equal(salaryAt(restarted, '2027-03'), toCents(2_166.67));
  assert.equal(pensionAt(restarted, '2027-03'), toCents(2_264.75));
  assert.ok(pensionAt(restarted, '2027-03') < pensionAt(restarted, '2027-02'), 'the banked balance runs low and the wage starts to be assessed');
  assert.ok(pensionAt(restarted, '2027-03') > WORKING_NOVEMBER, 'but $100 of shelter is still left in it');
});

// --- 3. A stated part-time salary, and the ONE division ------------------------------------------

test('a STATED part-time salary is assessed at the stated figure, and the conversion happens once', () => {
  // **$20,800 a year is $800.00 a fortnight exactly** (26 × $800), so this case carries no rounding
  // at all: assessed employment income is $800.00 − $300.00 = $500.00, + $8.86 deemed = $508.86,
  // less $226.00 = $282.86 excess, halved = $141.43 off $1,237.70 → $1,096.27/fn → × 26 ÷ 12 =
  // **$2,375.25 a month**. The salary LINE is $20,800 ÷ 12 = $1,733.33, from the same stated figure.
  const exact = project(SETTINGS, ray(), [
    SPEND,
    entry('w', 'WORK_PATTERN_CHANGE', '2026-12-01', { daysPerWeek: 2, annualSalary: toCents(20_800) }),
  ]);
  assert.equal(salaryAt(exact, '2026-12'), toCents(1_733.33));
  assert.equal(pensionAt(exact, '2026-12'), toCents(2_375.25));
  // It is assessed on the STATED figure and on neither of the two figures it replaced.
  assert.notEqual(pensionAt(exact, '2026-12'), WORKING_NOVEMBER);
  assert.notEqual(pensionAt(exact, '2026-12'), MAXIMUM_DECEMBER);
  assert.ok(pensionAt(exact, '2026-12') > WORKING_NOVEMBER && pensionAt(exact, '2026-12') < MAXIMUM_DECEMBER);

  // **$20,000 a year is NOT a whole number of cents a fortnight**, and this is the case the unit
  // trap lives in. $20,000 ÷ 26 = $769.2307…, and `fortnightlyFromAnnual` rounds it to **$769.23**,
  // 26 of which is $19,999.98 — two cents below the stated figure. That rounding is inherent in a
  // fortnightly means test on an annual figure, and it happens EXACTLY ONCE, against the stated
  // number: the walk never divides the ANNUALISED `employmentIncomePerFortnight` back down, so the
  // ordinary case (§1 and §2's $1,500) round-trips nothing and rounds nothing.
  //   $769.23 − $300.00 = $469.23 assessed employment, + $8.86 deemed = $478.09, less $226.00 =
  //   $252.09 excess, halved = $126.05 (half away from zero) off $1,237.70 → $1,111.65/fn
  //   → × 26 ÷ 12 = $2,408.575, which the walk's single multiplication by a twelfth lands on
  //   **$2,408.57 a month** — the one place in this file where the float boundary is visible, and
  //   it is visible because the fortnightly figure happens to land on a half-cent.
  const rounded = project(SETTINGS, ray(), [
    SPEND,
    entry('w', 'WORK_PATTERN_CHANGE', '2026-12-01', { daysPerWeek: 2, annualSalary: toCents(20_000) }),
  ]);
  assert.equal(pensionAt(rounded, '2026-12'), toCents(2_408.57));
  // The income tax side keeps the stated ANNUAL figure and is not derived from the fortnightly one:
  // the salary line is $20,000 ÷ 12 to the cent, and 12 of those are not 26 of $769.23.
  assert.equal(salaryAt(rounded, '2026-12'), toCents(1_666.67));
  assert.notEqual(toCents(769.23) * 26, toCents(20_000));
  assert.equal(toCents(20_000) - toCents(769.23) * 26, toCents(0.02));
});

// --- 4. The Work Bonus BALANCE path, which moves with the same figure ---------------------------

test('the in-force figure drives the Work Bonus BALANCE, not only the assessment', () => {
  const household = ray({ workBonusBalance: toCents(2_000) });
  // The carried balance is the walk's, not the Household's stated one (P4-10); here they are the
  // same figure on purpose, so that this section stays about the in-force WAGE and nothing else.
  // One balance, because Ray now holds one interest — the Guarantee's destination. It is NIL here:
  // this section is about the in-force WAGE and a balance would only add deemed income to it.
  const carried = [{ workBonusBalance: toCents(2_000), superInterestBalances: [toCents(0)], parcels: [] }];

  // Working: the $300 accrual is fully used, $1,200 is drawn from the balance — leaving $800 —
  // and nothing is banked. This is the figure the walk used to see in EVERY month.
  const working = withBalances(household, carried, toCents(0), [toCents(1_500)]);
  const [wasWorking] = agePensionEntitlement({ date: '2026-12-01', household: working, deemingRates: { lower: 0.0175, upper: 0.0375 } }).workBonus;
  assert.deepEqual(
    [wasWorking.eligibleIncome, wasWorking.fromFortnightlyAccrual, wasWorking.fromBalance, wasWorking.assessedEmploymentIncome, wasWorking.balanceAfter],
    [toCents(1_500), toCents(300), toCents(1_200), toCents(0), toCents(800)],
  );

  // Stopped: the SAME Person, with the walk's in-force nil substituted in. Every one of the four
  // figures moves, not just the assessed one — nothing is drawn from the balance and the whole of
  // the unused $300 accrual is banked on top of it. A fix that routed the income into the
  // assessment but left the accrual reading the raw wage would leave this Person's balance at $800.
  const stopped = withBalances(household, carried, toCents(0), [toCents(0)]);
  const [hasStopped] = agePensionEntitlement({ date: '2026-12-01', household: stopped, deemingRates: { lower: 0.0175, upper: 0.0375 } }).workBonus;
  assert.deepEqual(
    [hasStopped.eligibleIncome, hasStopped.fromFortnightlyAccrual, hasStopped.fromBalance, hasStopped.assessedEmploymentIncome, hasStopped.balanceAfter],
    [toCents(0), toCents(0), toCents(0), toCents(0), toCents(2_300)],
  );
  assert.equal(hasStopped.balanceAfter - household.persons[0].workBonusBalance, toCents(300), 'a fortnight not worked banks the whole accrual');

  // **STOP, THEN RESTART, one fortnight at a time.** This is the mechanism §5 now watches the WALK
  // perform over months; here it is four bare fortnights, so the arithmetic is visible without a
  // fortnight-per-month convention in the way. From a nil balance: work at $1,500, stop, stop,
  // then work again.
  //   f1 $1,500: $300 accrual used, nothing to draw, $1,200 assessed, balance stays $0.
  //   f2 and f3 at nil: nothing assessed, $300 banked each → $600.
  //   f4 $1,500: $300 accrual used, $600 drawn from the balance, so only $600 is assessed — half
  //   of what the same fortnight cost before the stop — and the balance is back to $0.
  const fortnight = (balance, income) =>
    applyWorkBonus({ ...household.persons[0], workBonusBalance: balance, employmentIncomePerFortnight: income }, true);
  const f1 = fortnight(toCents(0), toCents(1_500));
  const f2 = fortnight(f1.balanceAfter, toCents(0));
  const f3 = fortnight(f2.balanceAfter, toCents(0));
  const f4 = fortnight(f3.balanceAfter, toCents(1_500));
  assert.deepEqual(
    [f1.balanceAfter, f2.balanceAfter, f3.balanceAfter, f4.balanceAfter],
    [toCents(0), toCents(300), toCents(600), toCents(0)],
  );
  assert.deepEqual(
    [f1.assessedEmploymentIncome, f2.assessedEmploymentIncome, f3.assessedEmploymentIncome, f4.assessedEmploymentIncome],
    [toCents(1_200), toCents(0), toCents(0), toCents(600)],
  );
  assert.equal(f4.fromBalance, toCents(600));
  assert.ok(f4.assessedEmploymentIncome < f1.assessedEmploymentIncome, 'the fortnights not worked shelter the fortnight worked after them');
});

// --- 5. THE BALANCE IS CARRIED, AND IT RUNS OUT (P4-10) -----------------------------------------

test('the walk CARRIES the Work Bonus balance across months — a full balance depletes and the shelter ENDS', () => {
  // ✅ **THIS TEST WAS THE FAILING WITNESS FOR P4-10 AND IT IS NOW THE PASSING ONE.** Until
  // 2026-09-19 `Person.workBonusBalance` was the Day-1 stated figure in every month of the walk and
  // `WorkBonusResult.balanceAfter` had no consumer anywhere in `src/`: the walk carried super
  // balances, parcels and the Offset from month to month and this fourth balance not at all. What
  // that produced is asserted below as the thing that NO LONGER happens.
  //
  // **The mechanism, in fortnights.** Ray earns $1,500 a fortnight; $300 comes off the accrual and
  // the remaining **$1,200 is drawn from the balance**, so a full $11,800 lasts 11,800 ÷ 1,200 =
  // **9.83 fortnights** and the tenth empties it. The walk ticks monthly, and a month contributes
  // ⌊26(n+1)/12⌋ − ⌊26n/12⌋ fortnights — 2, 2, 2, 2, 2, 3 — so ten fortnights have run by the start
  // of the SIXTH month, 2026-12. Five months sheltered, and assessed on the wage from then on.
  const sheltered = project(SETTINGS, ray({ workBonusBalance: toCents(11_800) }), [SPEND]);
  const inWindow = sheltered.filter((m) => m.month <= '2027-03');
  assert.equal(inWindow.length, 9);
  assert.equal(inWindow.filter((m) => salaryAt(sheltered, m.month) === toCents(3_250)).length, 9, 'working, on full pay, in all nine');

  // **The five sheltered months.** Nothing but deeming is assessable — the Offset runs from nil to
  // $13,384.21 and the superannuation the Guarantee has paid in from nil to $1,336.49, which
  // together at the 1.75% lower rate is at most $9.91 a fortnight and below the $226.00
  // free area — so every one of them is paid the MAXIMUM rate for its own period, and there are
  // exactly two periods in them: $1,200.90/fn to 19 Sep and $1,237.70/fn from 20 Sep.
  assert.deepEqual(
    inWindow.slice(0, 5).map((m) => pensionAt(sheltered, m.month)),
    [toCents(2_601.95), toCents(2_601.95), toCents(2_601.95), MAXIMUM_DECEMBER, MAXIMUM_DECEMBER],
  );

  // ⚠️ **AND THEN IT STOPS, INSIDE A RATE PERIOD — which is the signature of depletion and was
  // unreachable before P4-10.** 2026-12 opens with nil balance, so the whole $1,200 is assessed:
  // + $12.43 deemed on $18,465.08 of Offset and superannuation = $1,212.43, less the $226.00 free
  // area = $986.43 excess, halved = $493.22 off $1,237.70 → $744.48/fn → × 26 ÷ 12 = **$1,613.04 a
  // month.** The three months after it are the same $1,200 assessed and nothing but the deeming
  // drift moving: $14.23, $16.03 and $17.83 a fortnight on $21,142.60, $23,819.96 and $26,497.17.
  assert.deepEqual(
    inWindow.slice(5).map((m) => pensionAt(sheltered, m.month)),
    [toCents(1_613.04), toCents(1_611.09), toCents(1_609.14), toCents(1_607.19)],
  );
  // **December's Offset is to the cent what it was before chunk 2b, and the three after it are
  // not.** The Guarantee is not cash, so it cannot move a balance directly; what moves these is the
  // pension that the deeming on it reduced, arriving one month later. December is therefore the
  // control: the first month a figure moves is the first month the means test has seen the money.
  assert.deepEqual(inWindow.slice(5).map((m) => m.openingBalance), [1_679_006, 1_912_727, 2_146_253, 2_379_584]);
  // The drop is the WHOLE of December's reduction, because November had none: $986.43 of excess at
  // 50c in the dollar is $493.22 a fortnight, × 26 ÷ 12 = $1,068.64.
  assert.equal(MAXIMUM_DECEMBER - toCents(1_613.04), toCents(1_068.64));
  assert.ok(Math.abs(toCents(1_068.64) - toCents(493.22) * 26 / 12) <= 1);

  // **The over-statement, named as the thing that is gone.** Before P4-10 all nine months paid the
  // maximum — two figures and no third — because the $11,800 was restored on the first of every
  // month. A $1,500 wage was assessed at nil for as long as the walk ran.
  assert.equal(new Set(inWindow.map((m) => pensionAt(sheltered, m.month))).size, 6);
  assert.ok(pensionAt(sheltered, '2026-12') < WORKING_NOVEMBER, 'assessed on the same $1,200 §1 November was, on a bigger Offset, so a little lower again');
  assert.ok(pensionAt(sheltered, '2026-12') < pensionAt(sheltered, '2026-11'), 'the pension FALLS when the balance runs out, inside one rate period');

  // ⚠️ **AND `applyWorkBonus`'s `eligible` flag is still gated on Age Pension age ALONE.** Its own
  // doc says the register's condition is "of Age Pension age AND receiving a payment", that the
  // second half is circular in a means test, and that the full condition is unverified as
  // implemented. P4-8 did not widen it and must not be read as having done so: the substitution
  // above changes WHICH income is assessed, never WHO is assessed on it.
  const tooYoung = withBalances(
    { persons: [{ ...ray().persons[0], name: 'Kit', dateOfBirth: '1980-01-01' }], homeStatus: 'occupied' },
    [{ workBonusBalance: toCents(0), superInterestBalances: [toCents(0)], parcels: [] }],
    toCents(0),
    [toCents(1_500)],
  );
  const [kit] = agePensionEntitlement({ date: '2026-12-01', household: tooYoung, deemingRates: { lower: 0.0175, upper: 0.0375 } }).workBonus;
  assert.equal(kit.eligible, false);
  assert.equal(kit.assessedEmploymentIncome, toCents(1_500), 'no Work Bonus below Age Pension age — the whole wage is assessed');
});

// --- 6. THE CONVENTION THE CARRY NEEDED, AND THE CAP IT RESPECTS (P4-10) ------------------------

/**
 * **The Work Bonus is FORTNIGHTLY and the walk is MONTHLY, and 26 does not divide by 12.** §5
 * depends on the reconciliation between them, so it is pinned here rather than inferred from a
 * pension figure five steps downstream.
 */
test('a month contributes a whole number of fortnights, 26 of them a year', () => {
  // The same claim `monthlyFromFortnightly` makes — annualise at 26, take a twelfth — applied to a
  // COUNT instead of to a dollar figure, so that the residual lands in the count and not inside a
  // per-fortnight cap. Two fortnights a month with a third in the sixth and the twelfth.
  const year = Array.from({ length: 12 }, (_, n) => fortnightsInWalkMonth(n));
  assert.deepEqual(year, [2, 2, 2, 2, 2, 3, 2, 2, 2, 2, 2, 3]);
  assert.equal(year.reduce((a, b) => a + b, 0), 26);
  // And it keeps holding, for as long as the walk runs: forty-eight years of it is 48 × 26 and not
  // 48 × 26 plus a drifting remainder.
  const long = Array.from({ length: 12 * 48 }, (_, n) => fortnightsInWalkMonth(n));
  assert.equal(long.reduce((a, b) => a + b, 0), 26 * 48);
  assert.deepEqual([...new Set(long)].sort(), [2, 3]);
});

test('the carried balance banks the accrual up to the $11,800 cap and NO further', () => {
  const idle = { ...ray().persons[0], employmentIncomePerFortnight: toCents(0), workBonusBalance: toCents(0) };
  // $300 a fortnight, banked whether or not the Person works (§4.6, `accruesWithoutWork`). From
  // nil, the cap is 11,800 ÷ 300 = **39.33 fortnights** away, so the thirty-ninth leaves $11,700
  // and the fortieth would reach $12,000 and is held at $11,800 instead.
  assert.equal(workBonusBalanceAfterMonth(idle, true, 1), toCents(300));
  assert.equal(workBonusBalanceAfterMonth(idle, true, 39), toCents(11_700));
  assert.equal(workBonusBalanceAfterMonth(idle, true, 40), WORK_BONUS_MAXIMUM_BALANCE);
  assert.equal(WORK_BONUS_MAXIMUM_BALANCE, toCents(11_800));
  // **And no further, however long the walk is.** A forty-eight year projection is over a thousand
  // fortnights; an uncapped carry would hand the means test $375,000 of shelter and would be a new
  // over-statement replacing the one P4-10 removed.
  assert.equal(workBonusBalanceAfterMonth(idle, true, 41), WORK_BONUS_MAXIMUM_BALANCE);
  assert.equal(workBonusBalanceAfterMonth(idle, true, 1_000), WORK_BONUS_MAXIMUM_BALANCE);
  assert.notEqual(1_000 * toCents(300), WORK_BONUS_MAXIMUM_BALANCE);
  // The cap is `applyWorkBonus`'s own clamp and is not re-enforced by the carrier: a balance handed
  // in ABOVE it is not raised, and the very next fortnight brings it back down to the cap.
  assert.equal(workBonusBalanceAfterMonth({ ...idle, workBonusBalance: toCents(20_000) }, true, 1), WORK_BONUS_MAXIMUM_BALANCE);

  // **The draw is the other half and it is bounded by the balance, not by the wage.** Ray's $1,500
  // costs $1,200 a fortnight, so a full balance lasts 9.83 fortnights: nine leave $1,000, the tenth
  // takes what is there and stops at nil rather than going negative.
  const working = { ...ray().persons[0], workBonusBalance: WORK_BONUS_MAXIMUM_BALANCE };
  assert.equal(workBonusBalanceAfterMonth(working, true, 9), toCents(1_000));
  assert.equal(workBonusBalanceAfterMonth(working, true, 10), toCents(0));
  assert.equal(workBonusBalanceAfterMonth(working, true, 11), toCents(0));

  // **An INELIGIBLE Person's balance does not move at all** — neither drawn nor accrued. The gate
  // is `applyWorkBonus`'s, age-only and unverified (§5), and the carrier adds no rule of its own.
  assert.equal(workBonusBalanceAfterMonth(idle, false, 1_000), toCents(0));
  assert.equal(workBonusBalanceAfterMonth(working, false, 1_000), WORK_BONUS_MAXIMUM_BALANCE);

  // ⚠️ **The register's $4,000 starting balance for a new claimant has no consumer in `src/` and
  // carrying does not give it one.** Every Household STATES its own `workBonusBalance`, and P4-10
  // carries whatever was stated; nothing seeds a first claim at $4,000. Recorded, not fixed — it is
  // a question about what a Household means by the figure it states, not about the carry.
  assert.equal(WORK_BONUS_STARTING_BALANCE, toCents(4_000));
  assert.notEqual(WORK_BONUS_STARTING_BALANCE, ray().persons[0].workBonusBalance);
});
