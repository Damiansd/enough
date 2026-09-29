// P4-1 chunk 5a — BALANCES THAT MOVE. Growth only: no drawdown, no minimum, no CGT.
//
// Before this chunk nothing in the model had a balance that could change. `splitAssets` re-read the
// STATIC `Household` every month, so month 0 and month 575 reported identical assets, and every
// fixture in the suite either held nothing or held a deliberately constant amount — so nothing
// would have caught a wrong wiring, it would simply have followed it.
//
// Four things are defended here and nothing else:
//
//   1. the monthly rate is COMPOUNDED, `(1 + r)^(1/12)`, and twelve of them recover the annual rate
//      — proven against `r / 12`, which does not, on a figure that separates them by $1,971.85;
//   2. the rounding is DOWN, stated, and iterated on the carried balance rather than recomputed
//      from the stated one;
//   3. **BOTH** means-test call sites in `project()` take the month's Household — the one outside
//      the Age Pension parameter window as well as the one inside it. The ADR-0005 guard catches
//      the two DISAGREEING; it cannot catch both being uniformly stale, so that is caught here, as
//      hand-worked figures that move;
//   4. which balances grow and which do not: the Work Bonus balance and the Offset Account do not,
//      and both are asserted through a figure rather than by reading the source.
import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { toCents } from '../dist/core/money.js';
import { financialAssets } from '../dist/core/household.js';
import { grownForOneMonth, monthlyGrowthFactor, parcelsGrownForOneMonth, project, withBalances } from '../dist/core/projection.js';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const person = (name, dateOfBirth, over = {}) => ({
  name,
  dateOfBirth,
  // P6-8 brief 3 chunk 2b: the employer Superannuation Guarantee has to land in a NAMED account,
  // so a salaried Person holds one and the walk refuses a salary with nowhere to pay it. A NIL
  // balance is the smallest change that makes the fixture honest: it moves no figure of its own.
  superInterests: [{ phase: 'accumulation', balance: toCents(0) }],
  parcels: [],
  employmentIncomePerFortnight: toCents(0),
  workBonusBalance: toCents(0),
  ...over,
});

/**
 * One parcel worth `marketValue`, acquired long before every walk in this file (P3-21f chunk 1).
 * The cost base is deliberately a DIFFERENT figure from the market value: nothing chunk 1 touches
 * may read a cost base, so a fixture where the two agree could not show that.
 */
const parcel = (marketValue, over = {}) => ({
  acquired: '2015-03-02',
  costBase: toCents(1_234.56),
  marketValue,
  ...over,
});

const settings = (over = {}) => ({
  asAtDate: '2026-09-16',
  planningHorizonAge: 72,
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
  ...over,
});

const assetsOf = (months, isoMonth) => {
  const month = months.find((m) => m.month === isoMonth);
  return [month.assessableAssets, month.protectedAssets];
};
const agePensionIn = (month) => month.lines.filter((l) => l.description === 'Age Pension').map((l) => l.amount);

// --- The rate, and the one ruling this chunk was given -------------------------------------------

test('HAND-WORKED — the monthly rate is COMPOUNDED, and twelve of them recover the annual rate', () => {
  // (1.065)^(1/12) = 1.005261694277…  The whole ruling is that this is not 1 + 0.065/12 = 1.0054166…
  assert.equal(monthlyGrowthFactor(0.065).toFixed(12), '1.005261694277');
  assert.equal(monthlyGrowthFactor(0).toFixed(12), '1.000000000000');

  // Twelve applications of the compounded factor to $1,000,000 land on $1,064,999.93 — the annual
  // rate, within the seven cents the twelve floorings cost (bounded above by twelve cents).
  let compounded = toCents(1_000_000);
  for (let m = 0; m < 12; m += 1) compounded = grownForOneMonth(compounded, 0.065);
  assert.equal(compounded, 106_499_993);
  assert.ok(toCents(1_065_000) - compounded <= 12, 'twelve floorings may cost at most twelve cents');

  // Twelve applications of `r / 12` land on $1,066,971.78 — 6.697% a year, not the 6.5% the Setting
  // states, and $1,971.85 too much on a single year of a single million. Over a forty-eight year
  // walk that reading compounds to about 9.9% more terminal wealth than the user asked for, all of
  // it in the direction that flatters the household.
  let simple = toCents(1_000_000);
  for (let m = 0; m < 12; m += 1) simple = Math.floor(simple * (1 + 0.065 / 12));
  assert.equal(simple, 106_697_178);
  assert.equal(simple - compounded, 197_185);
});

test('the rounding is DOWN, every month, and it is iterated on the carried balance', () => {
  // $703,683.18599… floored, not rounded half away from zero, which would have given …19.
  assert.equal(grownForOneMonth(toCents(700_000), 0.065), 70_368_318);
  assert.notEqual(grownForOneMonth(toCents(700_000), 0.065), 70_368_319);

  // Iterated on the ROUNDED carry, never recomputed from the stated figure × factor^n. The two
  // differ, and the iterated one is the smaller — which is also the safe one.
  let carried = toCents(700_000);
  for (let m = 0; m < 12; m += 1) carried = grownForOneMonth(carried, 0.065);
  assert.equal(carried, 74_549_993);
  assert.equal(Math.floor(toCents(700_000) * monthlyGrowthFactor(0.065) ** 12), 74_549_999);

  // A balance whose month's growth is under a cent does not move. Degenerate, under-stating, and
  // stated rather than discovered: at 6.5% it takes a balance under about $1.90 to bite.
  assert.equal(grownForOneMonth(toCents(1), 0.065), toCents(1));
  assert.equal(grownForOneMonth(toCents(0), 0.065), toCents(0));
  assert.equal(grownForOneMonth(toCents(2), 0.065), toCents(2.01));

  // A nil rate moves nothing at all — the control every movement assertion below is read against.
  assert.equal(grownForOneMonth(toCents(700_000), 0), toCents(700_000));
});

test('the growth rate and the balance are both guarded at the boundary', () => {
  assert.throws(() => monthlyGrowthFactor(Number.NaN), /not a finite nominal return/);
  assert.throws(() => monthlyGrowthFactor(Number.POSITIVE_INFINITY), /not a finite nominal return/);
  // −100% or worse takes the whole balance in a year; there is no root of a negative base to return.
  assert.throws(() => monthlyGrowthFactor(-1), /loses the whole balance/);
  assert.throws(() => monthlyGrowthFactor(-1.5), /loses the whole balance/);
  // A negative return short of that is a scenario, not an error.
  assert.ok(monthlyGrowthFactor(-0.2) < 1);
  assert.equal(grownForOneMonth(toCents(100_000), -0.2), 9_815_765);

  assert.throws(() => grownForOneMonth(-1, 0.065), /not a balance in whole cents/);
  assert.throws(() => grownForOneMonth(100.5, 0.065), /not a balance in whole cents/);
});

// --- The seam: one Household, its balances substituted, `splitAssets` reused verbatim ------------

test('withBalances substitutes the balances and copies every other fact through', () => {
  const household = {
    persons: [
      person('Val', '1955-04-17', {
        superInterests: [
          { phase: 'accountBasedPension', balance: toCents(700_000) },
          { phase: 'ttr', balance: toCents(50_000) },
        ],
        parcels: [parcel(toCents(250_000))],
        employmentIncomePerFortnight: toCents(1_000),
        workBonusBalance: toCents(11_800),
      }),
      person('Ken', '1970-01-01', { superInterests: [{ phase: 'accumulation', balance: toCents(400_000) }] }),
    ],
    homeStatus: 'occupied',
  };
  const snapshot = JSON.stringify(household);

  const moved = withBalances(
    household,
    [
      { workBonusBalance: toCents(6_500), superInterestBalances: [toCents(1), toCents(2)], parcels: [parcel(toCents(3))] },
      { workBonusBalance: toCents(300), superInterestBalances: [toCents(4)], parcels: [parcel(toCents(5))] },
    ],
    toCents(0),
    [toCents(400), toCents(0)],
  );

  assert.deepEqual(moved.persons.map((p) => p.superInterests.map((i) => i.balance)), [[100, 200], [400]]);
  // **The portfolio is substituted as PARCELS and read back as a derivation** (P3-21f chunk 1).
  // `financialAssets` is a function over `parcels` now, so there is no field here to carry a figure
  // the parcels do not support — Ken held none at all and now holds one worth $5.
  assert.deepEqual(moved.persons.map((p) => financialAssets(p)), [300, 500]);
  assert.deepEqual(moved.persons.map((p) => p.parcels.map((q) => q.marketValue)), [[300], [500]]);
  // Everything else is the SAME fact, including the one that must never be grown by a return.
  assert.deepEqual(moved.persons.map((p) => [p.name, p.dateOfBirth]), [['Val', '1955-04-17'], ['Ken', '1970-01-01']]);
  assert.deepEqual(moved.persons.map((p) => p.superInterests.map((i) => i.phase)), [['accountBasedPension', 'ttr'], ['accumulation']]);
  // **The Work Bonus balance is SUBSTITUTED too — P4-10, and this assertion used to say the
  // opposite.** It read `[$11,800, $0]`, the Household's own stated figures, and that was the
  // second half of the same defect: the Household handed to the means test carried a balance that
  // was never drawn down by the wage it sheltered and never credited with the accrual a Person who
  // stopped work had banked. Val's stated $11,800 is now overridden by the $6,500 the caller
  // carried in, and Ken's stated nil by $300 — both different from what they state, which is what
  // makes this evidence rather than a coincidence.
  assert.deepEqual(moved.persons.map((p) => p.workBonusBalance), [toCents(6_500), toCents(300)]);
  assert.deepEqual(household.persons.map((p) => p.workBonusBalance), [toCents(11_800), toCents(0)]);
  // **Employment income is SUBSTITUTED, not copied through — P4-8, and this assertion used to say
  // the opposite.** It read `[$1,000, $0]`, the Household's own stated wage, and that was the
  // defect in one line: the Household handed to the means test carried the Day-1 wage into every
  // month of the walk, so `applyWorkBonus` assessed a retired Person on a salary they had stopped
  // earning. Val's stated $1,000 a fortnight is now overridden by the $400 the caller carried in,
  // and Ken's nil stays nil because the caller carried nil — the same figure by the same route,
  // which is why the second element is not evidence on its own.
  assert.deepEqual(moved.persons.map((p) => p.employmentIncomePerFortnight), [toCents(400), toCents(0)]);
  assert.notEqual(moved.persons[0].employmentIncomePerFortnight, household.persons[0].employmentIncomePerFortnight);
  assert.equal(moved.homeStatus, 'occupied');
  assert.equal(moved.persons.length, 2);

  // Pure: the Household it was given is untouched.
  assert.equal(JSON.stringify(household), snapshot);

  // A balance table that does not line up with the Household is refused rather than silently
  // dropping or inventing an interest.
  assert.throws(
    () => withBalances(household, [{ workBonusBalance: toCents(0), superInterestBalances: [toCents(1), toCents(2)], parcels: [] }], toCents(0), [toCents(0), toCents(0)]),
    /no carried balances for person 1 \(Ken\)/,
  );
  assert.throws(
    () => withBalances(household, [
      { workBonusBalance: toCents(0), superInterestBalances: [toCents(1)], parcels: [] },
      { workBonusBalance: toCents(0), superInterestBalances: [toCents(4)], parcels: [] },
    ], toCents(0), [toCents(0), toCents(0)]),
    /Val holds 2 superannuation interests but 1 balances were carried/,
  );
  // And a carried entry with no Work Bonus balance in it is refused rather than silently handing
  // back the STATED one (P4-10) — the same reasoning as `offsetBalance` and the in-force wage: a
  // caller who forgets it must not be given the stale figure quietly.
  assert.throws(
    () => withBalances(household, [
      { superInterestBalances: [toCents(1), toCents(2)], parcels: [] },
      { workBonusBalance: toCents(0), superInterestBalances: [toCents(4)], parcels: [] },
    ], toCents(0), [toCents(0), toCents(0)]),
    /no carried Work Bonus balance for person 0 \(Val\)/,
  );
  // And an income table that does not line up is refused for the same reason the balance table is
  // (P4-8): the fourth argument is REQUIRED so that a caller cannot omit it and be handed the
  // stale stated wage silently. A caller who forgets it entirely reaches the same refusal.
  assert.throws(
    () => withBalances(household, [
      { workBonusBalance: toCents(0), superInterestBalances: [toCents(1), toCents(2)], parcels: [] },
      { workBonusBalance: toCents(0), superInterestBalances: [toCents(4)], parcels: [] },
    ], toCents(0), [toCents(0)]),
    /no in-force employment income for person 1 \(Ken\)/,
  );
  // Omitted ENTIRELY it throws too — a JS caller reaches it before the per-person check, so the
  // message is the runtime's rather than this module's, and what is asserted is that no
  // Household comes back at all. A returned Household would be one carrying the stated wage.
  assert.throws(() => withBalances(household, [
    { workBonusBalance: toCents(0), superInterestBalances: [toCents(1), toCents(2)], parcels: [] },
    { workBonusBalance: toCents(0), superInterestBalances: [toCents(4)], parcels: [] },
  ], toCents(0)));

  // A single-Person Household stays a single-Person Household.
  const single = { persons: [household.persons[0]], homeStatus: 'noHome' };
  const one = withBalances(single, [{ workBonusBalance: toCents(0), superInterestBalances: [toCents(1), toCents(2)], parcels: [parcel(toCents(3))] }], toCents(0), [toCents(0)]);
  assert.equal(one.persons.length, 1);
  assert.equal(one.homeStatus, 'noHome');
});

// --- BOTH call sites, and the one the ADR-0005 guard cannot reach --------------------------------

/**
 * A single pensioner holding a $700,000 Account-Based Pension, walked to 2028-04 — well past
 * 2027-03-19, the last day `AGE_PENSION_PERIODS` covers, with no indexation series supplied.
 *
 * **That is what makes this fixture the one that matters.** Past the window
 * `agePensionEntitlement` never runs, so the ADR-0005 guard never runs either, and the reported
 * assets come from the OTHER call site — the bare `splitAssets` fallback. A walk that switched only
 * the entitlement site would throw; a walk that switched only this one would pass the guard; a walk
 * that switched NEITHER would pass everything and still be wrong. Only a figure catches that.
 */
const LATE = { persons: [person('Val', '1955-04-17', { superInterests: [{ phase: 'accountBasedPension', balance: toCents(700_000) }] })], homeStatus: 'occupied' };
const LATE_SETTINGS = settings({ planningHorizonAge: 73 });

test('HAND-WORKED — the assets move OUTSIDE the Age Pension window too, where no guard can see them', () => {
  const months = project(LATE_SETTINGS, LATE, []);
  assert.equal(months[0].month, '2026-09');
  assert.equal(months.at(-1).month, '2028-04');

  // ⚠️ **SINCE P4-3b EVERY FIGURE BELOW CARRIES THE OFFSET AS WELL AS THE SUPER**, because the
  // walk's running cash is substituted into the Household the split reads. Val banks the whole of
  // her Age Pension — she has no spending level — so the Offset is the pension paid so far, and
  // `superOnly` takes it back out. The SUPER series is untouched by P4-3b to the cent: it is the
  // same 70,000,000c compounded and floored, month after month, that this test asserted before.
  const superOnly = (m) => m.assessableAssets - m.openingBalance;

  // Inside the window (the entitlement call site supplies the split).
  assert.deepEqual(assetsOf(months, '2026-09'), [70_000_000, 0]);
  assert.equal(superOnly(months.find((m) => m.month === '2026-10')), 70_368_318);
  assert.deepEqual(assetsOf(months, '2026-10'), [70_389_963, 0], '$703,683.18 of super plus $216.45 of banked pension');
  assert.ok(agePensionIn(months.find((m) => m.month === '2026-10')).length === 1);

  // ⚠️ **PAST THE PUBLISHED WINDOW THIS FIXTURE CHANGED ITS CHARACTER ON 2026-09-21 (P4-1e), AND
  // THE SERIES IT WAS BUILT TO PIN DID NOT MOVE BY A CENT.** It read: *"Outside it (the
  // `splitAssets` fallback supplies the split, and there is no Age Pension line at all). 2027-06 is
  // month 9 … plus the $1,454.87 of pension banked before the parameter window ran out — which
  // stops growing because the Offset does not grow and no further pension is paid"*, and asserted
  // `agePensionIn(june) === []`, `june.openingBalance === 145_487` and the last month's assets as
  // `77_339_530 + 145_487`. The standing table pays a pension in those months, so the Offset keeps
  // filling and the two figures that carry it moved. **`superOnly` is unchanged to the cent in both
  // months below** — same 70,000,000c compounded and floored nine and nineteen times — which is
  // what says the growth arithmetic this test exists for was untouched by the ruling.
  const june = months.find((m) => m.month === '2027-06');
  assert.equal(superOnly(june), 73_385_492);
  // ⚠️ **AND $61.08 MORE OF IT SINCE 2026-09-23**, because a plan with no series now INDEXES the
  // 20 March 2027 rates on its own growth rates instead of carrying them: Val's maximum rate rises by
  // $14.14 a fortnight (below), which the assets test does not touch — its taper is on the EXCESS —
  // so April pays $30.64 a month more. May pays $30.44 more: the $30.64 banked in April is itself
  // assessed, at $3.00 a fortnight per $1,000, which takes back 9.19c a fortnight, 20c a month.
  assert.equal(172_330 - 166_222, 3_064 + 3_044, 'the pre-T135 2026-09-23 figure, kept beside the new one');
  // ⚠️ **AND $5.77 MORE AGAIN WITH THE ASSETS-TEST FLOOR (T135, 2026-09-24).** SS Act 1064-G7 floors
  // a single Person's assets excess to the nearest $250 before the $3/$1,000 taper runs
  // (`flooredExcess` in `agePension.ts`), and flooring it DOWN can only raise or hold each month's
  // rate — nine months of that (September to May) compounding through the growing Offset, not
  // hand-derivable to the cent from a single month's bound (≤ $0.75/fortnight for a single Person),
  // only the sign, which is up and matches what is observed.
  assert.equal(june.openingBalance, 172_330 + 577, 'the Offset kept filling past 2027-03, and floored further still');
  assert.equal(june.assessableAssets, 73_385_492 + 172_330 + 577);
  assert.notEqual(june.assessableAssets, toCents(700_000));
  // It is still the `splitAssets` FALLBACK path that this test was built to reach, though: the
  // entitlement site supplies the split only while a pension is computed, and the walk's last
  // months compute none — not for want of parameters now, but because the ASSETS TEST cuts out.
  // Hand-worked at the $333,000 free area and $3.00 a fortnight per $1,000, on the 20 March 2027
  // set GENERATED from this plan's rates (2026-09-23; it was the carried 20 September 2026 set):
  //   the maximum payment rate is $1,149.54 + $88.20 + $14.10 = $1,251.84 — the basic rate is
  //   0.6633 × $1,711.80 × √1.025 (PBLCI; CPI is nil, so the Supplement does not move) — so the
  //   reduction exhausts it at an excess of $1,251.84 ÷ 3 × 1,000 = $417,280, floored to the nearest
  //   $250 (T135, 1064-G7) — $417,250 — at $750,250 assessed
  //   2027-04 is assessed on $727,651.75: excess $394,651.75, floored to $394,500.00 (T135),
  //           reduction $1,183.50, rate $68.34 a fortnight → $68.34 × 26 ÷ 12 = $148.07 a month
  //           (it was $147.12 pre-T135, $116.48 pre-2026-09-23)
  //   2028-04 is assessed on $775,380.56; the 20 March 2028 set's cut-off is about $759,860 → nil,
  //           and no line at all
  assert.deepEqual(agePensionIn(months.find((m) => m.month === '2027-04')), [14_807]);
  assert.deepEqual(agePensionIn(months.at(-1)), [], 'the assets test cut her out, and that is what leaves no line');

  // And the very last month of a twenty-month walk (2028-04 is month 19), which is the figure a
  // stale walk reports as $700,000.00 for all twenty.
  assert.equal(months.length, 20);
  assert.equal(superOnly(months.at(-1)), 77_339_530);
  assert.equal(months.at(-1).assessableAssets, 77_339_530 + 197_522 + 1_004, 'and $10.04 more again with T135');
});

test('HAND-WORKED — the Non-Super Portfolio grows on the same rate, and it is a separate field', () => {
  // `Person.parcels` is ADR-0009's Non-Super Portfolio and is a DIFFERENT pool from
  // `SuperInterest.balance`, so growing one and not the other is a mutation the super fixtures
  // above cannot see. Same money, same rate, same floored compounding — and assessable, and deemed.
  // **The figures below are the ones this test asserted when the pool was a scalar field** and are
  // unchanged by P3-21f chunk 1: one parcel grows by exactly the arithmetic the scalar did.
  const portfolio = {
    persons: [person('Val', '1955-04-17', { parcels: [parcel(toCents(700_000))] })],
    homeStatus: 'occupied',
  };
  // (`portfolioOnly` for the P4-3b reason given in the fixture above: the figure now carries the
  // banked Age Pension in the Offset as well, and the parcel series is unchanged by that.)
  const months = project(LATE_SETTINGS, portfolio, []);
  const portfolioOnly = (m) => m.assessableAssets - m.openingBalance;
  assert.deepEqual(assetsOf(months, '2026-09'), [70_000_000, 0]);
  assert.equal(portfolioOnly(months.find((m) => m.month === '2026-10')), 70_368_318);
  assert.equal(portfolioOnly(months.find((m) => m.month === '2027-06')), 73_385_492);
  assert.equal(portfolioOnly(months.at(-1)), 77_339_530);
  assert.deepEqual(assetsOf(months, '2026-10'), [70_389_963, 0]);

  // The two pools are interchangeable for the ASSETS test at these figures, so the Age Pension line
  // agrees month for month with the Account-Based Pension fixture — which is the point: with no
  // `RETURN_CHANGE` entry stated (P2-11 ships PER-PERSON, never per-account or per-pool — see
  // `Settings.nominalReturn`'s own doc), the rate is one flat plan-wide number, not one per pool.
  assert.deepEqual(
    months.map((m) => agePensionIn(m)),
    project(LATE_SETTINGS, LATE, []).map((m) => agePensionIn(m)),
  );
});

test('a nil return is the control: the same walk with nothing to grow reports the stated figure', () => {
  // The trap this whole chunk is exposed to is a fixture where growth is invisible. So: the same
  // fixture, the same months, `nominalReturn: 0` — and every figure is the stated one. If the
  // assertions above could pass on a walk that did not move, this one could not exist.
  const flat = project(settings({ planningHorizonAge: 73, nominalReturn: 0 }), LATE, []);
  for (const month of flat) {
    assert.equal(month.assessableAssets - month.openingBalance, toCents(700_000), month.month);
  }

  // ⚠️ **AND THE ONE THING THAT DOES MOVE IN A NIL-RETURN WALK SINCE P4-3b IS THE OFFSET, which is
  // this control's new second half rather than a hole in it.** Val banks her whole pension, so the
  // Offset climbs month by month and `assessableAssets` climbs with it — and, because the assets
  // test BINDS at $700,000, each month's banked cash cuts the next month's payment. Hand-worked, at
  // the $333,000 single-homeowner free area and the $3.00-a-fortnight-per-$1,000 taper:
  //
  //   2026-09 opens with nil cash          → assessed $700,000.00, and the payment is the control
  //   2026-10 opens with $216.45 of it     → assessed $700,216.45; the excess over the free area is
  //                                          $216.45 larger, so the fortnightly reduction is
  //                                          216.45 ÷ 1,000 × $3.00 = **64.935c** more, which is
  //                                          64.935c × 26 ÷ 12 = **$1.41** a month more
  //                                          → $296.18 − $1.41 = **$294.77**   (pre-T135)
  //
  // ⚠️ **REWRITTEN FOR SS Act 1064-G7 (T135, 2026-09-24), and 2026-10 is the case the register
  // predicts: a small asset change moves the pension by $0.** 1064-G7 floors a single Person's
  // excess to the nearest $250 before the taper runs. 2026-09's excess is $367,000.00, already a
  // $250 multiple, so its floor is itself. 2026-10's excess is $367,216.45 — the $216.45 the Offset
  // added is smaller than one $250 step, so it floors AWAY ENTIRELY, back to $367,000.00, the same
  // floored excess as 2026-09. Same floored excess, same reduction, same rate: 2026-10 pays exactly
  // the control, $296.18 — not $296.18 minus a cent-sized taper on $216.45, because there is no
  // taper on $216.45 once it is floored to nothing.
  //   2026-11 opens with $512.63 of it     → assessed $700,512.63, excess $367,512.63, floored to
  //                                          $367,500.00 (two $250 steps up from 2026-09's floor)
  //                                          reduction $1,102.50, rate $135.20 a fortnight
  //                                          → $135.20 × 26 ÷ 12 = $292.93
  //   2026-12 opens with $805.56 of it     → assessed $700,805.56, excess $367,805.56, floored to
  //                                          $367,750.00, reduction $1,103.25, rate $134.45
  //                                          a fortnight → $134.45 × 26 ÷ 12 = $291.31
  assert.deepEqual(flat.map((m) => m.openingBalance).slice(0, 4), [0, 21_645, 51_263, 80_556]);
  assert.deepEqual(flat.slice(0, 4).map((m) => m.assessableAssets), [70_000_000, 70_021_645, 70_051_263, 70_080_556]);
  assert.deepEqual(flat.slice(0, 4).map(agePensionIn), [[21_645], [29_618], [29_293], [29_131]]);
  assert.equal(29_618, 29_618, 'the 2026-10 payment IS the control — the floor made $216.45 invisible');
  const flatPayments = flat.slice(1, 7).map((m) => agePensionIn(m)[0]);
  assert.equal(flatPayments.length, 6);
  assert.ok(flatPayments.every((amount, i) => i === 0 || amount < flatPayments[i - 1]), 'and it keeps falling');

  // A Household holding nothing has nothing to GROW, at any rate — and this is now also the file's
  // sharpest assertion that **the Offset does not grow either** (defended thing 4). Val holds no
  // super and no parcels, so `assessableAssets` is the banked pension and nothing else; at a 20%
  // nominal return it is still the banked pension to the cent.
  const empty = { persons: [person('Val', '1955-04-17')], homeStatus: 'occupied' };
  const banked = project(settings({ planningHorizonAge: 73, nominalReturn: 0.2 }), empty, []);
  for (const month of banked) {
    assert.equal(month.assessableAssets, month.openingBalance, month.month);
    assert.equal(month.protectedAssets, toCents(0), month.month);
  }
  // $2,601.95 in the first month and $2,681.68 in each of the six after it: $18,692.03 by 2027-04.
  assert.equal(toCents(2_601.95) + 6 * toCents(2_681.68), 1_869_203);
  assert.equal(banked.find((m) => m.month === '2027-04').assessableAssets, 1_869_203);
  // ⚠️ **AND IT DOES NOT STOP THERE ANY MORE (P4-1e, 2026-09-21).** This asserted a single value
  // across every month from 2027-04 — *"once the parameter window closes in 2027-04 it stops at
  // $18,692.03 and never moves again"* — which was the pension running out, not the rate doing
  // anything. The standing table keeps paying it, so the balance climbs by exactly one payment a
  // month, at the SAME carried rate: $2,681.68, thirteen months running, because this Household's
  // assets never come near the $333,000 free area and nothing else can move the figure. An
  // arithmetic progression is a stronger statement of "the Offset does not grow" than a constant
  // was: a growth rate applied to it would bend the series, and 20% a year on $18,692.03 would be
  // visible in the first month.
  //
  // ⚠️ **AND FROM 2026-09-23 THE STEP IS NOT ONE FIGURE BUT TWO**, because a plan with no series now
  // INDEXES the rates on its own growth rates instead of carrying them. Still no means test bites,
  // so each month banks the full single maximum of the set in force, and CPI is nil so only the
  // basic rate moves (0.6633 × the combined, which rises by √1.025 a half-year on PBLCI):
  //   2027-04 … 2027-09   20 Mar 2027 set  $1,149.54 + $88.20 + $14.10 = $1,251.84 → $2,712.32 a month
  //   2027-10 … 2028-03   20 Sep 2027 set  $1,163.83 + $88.20 + $14.10 = $1,266.13 → $2,743.28 a month
  // Two flat runs of six. The claim survives the change intact: a growth rate applied to the Offset
  // would bend each run, and it does not.
  const bankedFrom = banked.filter((m) => m.month >= '2027-04').map((m) => m.assessableAssets);
  assert.equal(bankedFrom[0], 1_869_203);
  const steps = bankedFrom.slice(1).map((value, i) => value - bankedFrom[i]);
  assert.deepEqual(steps, [...Array(6).fill(271_232), ...Array(6).fill(274_328)]);
  assert.equal(banked.at(-1).assessableAssets, 1_869_203 + 6 * 271_232 + 6 * 274_328);
  assert.equal(1_869_203 + 6 * 271_232 + 6 * 274_328, 5_142_563);
});

// --- What does NOT grow --------------------------------------------------------------------------

/**
 * A single pensioner with a wage and a small Work Bonus balance, no assets at all, walked entirely
 * inside ONE Age Pension rate period (20 Sep 2026 → 19 Mar 2027) so that nothing in the entitlement
 * can move for a reason other than the one under test.
 *
 * $1,000 a fortnight: $300 comes off the fortnightly accrual, the next $100 comes off the balance,
 * and $600 is assessed — which is above the $218 single income free area, so the balance reaches
 * the answer. Growing it at 6.5% would move the assessed figure by 52c a fortnight in month one and
 * keep moving it, and the Age Pension line would drift.
 *
 * ⚠️ **AND SINCE P4-10 THE BALANCE IS CARRIED, so $100 is now a balance that RUNS OUT.** The first
 * fortnight of October draws the whole $100 against the $700 the accrual does not cover, and there
 * is nothing left to draw in the second — nor anything to bank, because the whole $300 accrual is
 * used against the wage every fortnight Val works. So October is assessed on $600 and every month
 * after it on $700. That is depletion, it is the direction P4-10 exists to remove, and it is why
 * the six payments below are no longer six drifts of one figure.
 */
const WAGED = {
  persons: [person('Val', '1955-04-17', { employmentIncomePerFortnight: toCents(1_000), workBonusBalance: toCents(100) })],
  homeStatus: 'occupied',
};

test('the Work Bonus balance does NOT grow — its accrual is §4.6, already modelled elsewhere', () => {
  const WAGED_SETTINGS = settings({ asAtDate: '2026-10-01', planningHorizonAge: 72 });
  const months = project(WAGED_SETTINGS, WAGED, []);
  // Val turns 72 in 2027-04, which is past the parameter window, so six months carry a line.
  assert.deepEqual(months.map((m) => m.month), ['2026-10', '2026-11', '2026-12', '2027-01', '2027-02', '2027-03', '2027-04']);

  // ⚠️ **THIS FIXTURE USED TO ASSERT SIX IDENTICAL PAYMENTS, and it now asserts a STEP followed by
  // a drift.** Two things move it and neither is a return applied to the Work Bonus balance:
  //
  //   **(1) THE STEP, from P4-10 — depletion.** October opens with the stated $100 and is assessed
  //   on $600. Every later month opens with nil, because the two October fortnights emptied it, and
  //   is assessed on the full **$700**. $100 more assessed a fortnight is 50c in the dollar = $50.00
  //   more reduction a fortnight, × 26 ÷ 12 = **$108.33 a month**, and that is the bulk of the
  //   $111.59 fall from October to November. Before P4-10 the $100 was restored every month and
  //   November's fall was $3.25 — the OVER-statement, and it was here.
  //
  //   **(2) THE DRIFT, from P4-3b — deeming on the banked cash.** Val banks her wage and her
  //   pension, the Offset is a deemed financial asset, and the income test bites a little harder
  //   every month. Every cent of it is the 1.75% lower rate (far below the $66,800 single deeming
  //   threshold) and the 50c taper:
  //
  //     2026-10  opens with nil cash, balance $100 → $600 assessed, $0 deemed; $600 − $226 free
  //                                    area = $374, halved = $187.00 off $1,237.70 → $1,050.70/fn
  //                                    → × 26 ÷ 12 = **$2,276.52**, the undrifted control
  //     2026-11  opens with $4,443.19 of cash AND $221.00 of superannuation — October's employer
  //                                    Guarantee, 12% of $26,000 ÷ 12 less the fund's 15%, and Val
  //                                    is 71 so it is DEEMED like the cash (P6-8 brief 3 chunk 2b).
  //                                    Balance NIL → $700 assessed + deemed 1.75% of $4,664.19 =
  //                                    $81.62 a year = **$3.14 a fortnight**; $703.14 − $226 =
  //                                    $477.14, halved = $238.57 off $1,237.70 → $999.13/fn →
  //                                    **$2,164.78**
  //     2026-12  opens with $8,774.64 of cash and $442.16 of superannuation → deemed $161.31 a year
  //                                    = **$6.20 a fortnight**; $706.20 − $226 = $480.20, halved =
  //                                    $240.10 → $997.60/fn → **$2,161.47**
  //
  // (The assets test cannot be what moved: $87.75 of cash is $332,912.25 under the $333,000
  // single-homeowner free area, and the taper on it would be 26c a fortnight against the $3.16
  // observed. And the three later months continue the same deeming drift and nothing else — the
  // assessed wage is $700 flat once the balance is gone, so there is no second step.)
  assert.deepEqual(months.slice(0, 6).map((m) => agePensionIn(m)), [
    [227_652], [216_478], [216_147], [215_813], [215_481], [215_150],
  ]);
  // The step is $108.33 of depletion plus $3.40 of deeming, within the cent that × 26 ÷ 12 leaves.
  assert.equal(227_652 - 216_478, toCents(111.74));
  assert.ok(Math.abs(227_652 - 216_478 - (toCents(50) + toCents(1.57)) * 26 / 12) < 1);
  // **October is untouched by the Guarantee and every later month is**: the first month opens
  // before any employer contribution has been made, so it is the control on the whole block.
  // The Offset carries the step forward, and there is no spending level in this fixture, so each
  // month opens at the last one plus the pension and the $2,166.67 salary — nothing else. The
  // Guarantee is not among them: it is not cash and it never touches this balance.
  assert.deepEqual(months.slice(0, 3).map((m) => m.openingBalance), [0, 444_319, 877_464]);
  assert.equal(444_319, 227_652 + toCents(2_166.67));
  assert.equal(877_464, 444_319 + 216_478 + toCents(2_166.67));

  // **AND THE WORK BONUS CLAIM IS NOW A DIFFERENCE RATHER THAN A FLAT LINE, which is the same claim
  // and a sharper one:** the growth under test has to show up as a gap between two walks that share
  // everything else, including the Offset drift above. $100 compounded and floored six times at
  // 6.5% is $103.17, and a Household holding $103.17 is paid **$3.42 a month more** — $3.17 less
  // assessed, halved to $1.585 a fortnight of reduction, × 26 ÷ 12.
  //
  // ⚠️ **THE MONTH THAT $3.42 APPEARS IN MOVED FROM THE SIXTH TO THE FIRST, and the move IS P4-10
  // landing.** It used to be asserted at index 5 because the stated balance was restored in every
  // month, so the advantage was permanent; now the balance is spent, both walks are empty from
  // November, and their sixth months agree to the cent. The figure is the same $3.42 either way.
  let balance = toCents(100);
  for (let m = 0; m < 6; m += 1) balance = grownForOneMonth(balance, 0.065);
  assert.equal(balance, toCents(103.17));
  const grown = { ...WAGED, persons: [{ ...WAGED.persons[0], workBonusBalance: balance }] };
  const grownMonths = project(WAGED_SETTINGS, grown, []);
  assert.deepEqual(agePensionIn(grownMonths[0]), [227_994]);
  assert.equal(227_994 - 227_652, toCents(3.42));
  assert.notEqual(227_994, 227_652);
  // Spent, not grown: the extra $3.17 buys ONE month of shelter and then it is gone, so the five
  // months after it are within a rounding cent of the $100 walk's — which a balance that grew at
  // 6.5% could not be, because it would still be sheltering $103 and more in each of them.
  //
  // ⚠️ **"within a rounding cent" rather than "identical", since P6-8 brief 3 chunk 2b.** The two
  // walks' Offsets are $3.42 apart for ever (asserted below), and deemed income is now computed on
  // the Offset PLUS the superannuation the Guarantee has paid in — a bigger base, on which that
  // $3.42 occasionally lands the other side of a cent. 2026-12 is the one month in six where it
  // does, and it is worth THREE CENTS. A sheltered $103 would be worth $3.42 a month, a hundred
  // times that, in every one of the five.
  const spentGap = grownMonths.slice(1, 6).map((m, i) => agePensionIn(m)[0] - agePensionIn(months[i + 1])[0]);
  assert.deepEqual(spentGap, [0, -3, 0, 0, 0]);
  for (const gap of spentGap) assert.ok(Math.abs(gap) < toCents(0.05), 'the balance is still sheltering a wage — it grew');
  // Not vacuously identical: the Offset is $3.42 apart in every one of those months and stays apart,
  // so the two walks really are two walks and the pension figures agree anyway.
  // The 3 cents December's deeming rounding cost the grown walk is banked from January on, so the
  // gap is $3.42 for two months and $3.39 thereafter — the same three cents, seen from the other
  // side, and the whole of the interaction between this fixture and the Guarantee.
  assert.deepEqual(
    grownMonths.slice(1, 6).map((m, i) => m.openingBalance - months[i + 1].openingBalance),
    [342, 342, 339, 339, 339],
  );

  // **THE NON-GROWTH CLAIM AT ITS SHARPEST — AND IT NARROWED ON 2026-09-20 (P6-8 brief 3, chunk
  // 2b), ON ITS OWN GROUND.** It used to be that the WHOLE walk was rate-blind: Val held no super
  // and no parcels, the Offset does not grow, and so `nominalReturn` had nothing to touch except
  // the Work Bonus balance. She holds super now — her employer pays a Guarantee into it every
  // month — so the walk as a whole is no longer rate-blind, and asserting that it is would be
  // asserting that the Guarantee is not invested.
  //
  // What survives is the claim this test is actually about, at the one month where nothing else
  // can interfere: **October opens before any Guarantee has been paid**, so its Age Pension is a
  // function of the Work Bonus balance and nothing else — and the $100 and the $103.17 walks are
  // the same $3.42 apart at 20% as at 6.5%. A Work Bonus balance that grew would not be.
  const fast = (person) => project(
    settings({ asAtDate: '2026-10-01', planningHorizonAge: 72, nominalReturn: 0.2 }),
    { ...WAGED, persons: [person] },
    [],
  );
  assert.deepEqual(agePensionIn(fast(WAGED.persons[0])[0]), [227_652]);
  assert.deepEqual(agePensionIn(fast({ ...WAGED.persons[0], workBonusBalance: balance })[0]), [227_994]);
  // And the control that the 20% walk really is a different walk: from November it diverges, and it
  // diverges through the superannuation the Guarantee built — which is what a return acts on.
  assert.notEqual(
    JSON.stringify(fast(WAGED.persons[0]).map((m) => m.assessableAssets)),
    JSON.stringify(months.map((m) => m.assessableAssets)),
  );
  // Val is 71, so the Guarantee lands in ASSESSABLE assets rather than protected ones — §4.8's
  // exemption is for a Person below Age Pension age and she is not one.
  assert.equal(months[0].protectedAssets, 0);
  assert.equal(months[0].assessableAssets, 0, 'the first month holds nothing at all — which is why it is the control');
});

/**
 * A Household well below Age Pension age, so no entitlement exists and nothing but the return can
 * move the cashflow. It holds $800,000 in Accumulation Phase (protected — under Age Pension age,
 * T27) and $250,000 outside super (assessable), earns a wage and has a spending level.
 */
const YOUNG = {
  persons: [
    person('Sam', '1979-06-15', {
      superInterests: [{ phase: 'accumulation', balance: toCents(800_000) }],
      parcels: [parcel(toCents(250_000))],
      employmentIncomePerFortnight: toCents(3_000),
    }),
  ],
  homeStatus: 'occupied',
};
const SPEND = {
  id: 'sc',
  date: '2026-09-01',
  owner: 'household',
  type: 'SPEND_CHANGE',
  params: { annualSpend: toCents(60_000.01) },
  enabled: true,
  createdAt: '2026-06-01',
};

test('the Offset Account does NOT grow: chunk 4 reconciliation is exact and the cash is rate-blind', () => {
  const slow = project(settings({ planningHorizonAge: 50 }), YOUNG, [SPEND]);
  const fast = project(settings({ planningHorizonAge: 50, nominalReturn: 0.2 }), YOUNG, [SPEND]);

  // The investment balances are very different under the two rates…
  assert.notEqual(slow.at(-1).protectedAssets, fast.at(-1).protectedAssets);
  assert.notEqual(slow.at(-1).assessableAssets, fast.at(-1).assessableAssets);
  assert.ok(fast.at(-1).protectedAssets > slow.at(-1).protectedAssets);
  // …and the running cash balance is byte-for-byte identical, because the Offset earns the MORTGAGE
  // rate (concept.md §5.12) and this model holds no mortgage. Direction: under-stated, and safe.
  // **It no longer compounds a second residual**: P4-3b discharged the finding that the Offset could
  // only start at nil (`Household.openingOffsetBalance` seeds it), so the missing interest is now
  // the whole of what this pool under-states.
  assert.equal(
    JSON.stringify(slow.map((m) => [m.openingBalance, m.closingBalance])),
    JSON.stringify(fast.map((m) => [m.openingBalance, m.closingBalance])),
  );
  assert.ok(slow.at(-1).closingBalance > 0, 'a walk whose balances were all nil would prove nothing');

  // ✅ **THE RESIDUAL IS CLOSED, AND THIS IS THE ASSERTION THAT WENT RED — P4-4, 2026-09-18.** It
  // read `assert.deepEqual(month.lines.filter(/growth|return|interest/i), [])`, with a comment
  // saying it was *"what will go red the day a growth line is emitted"*. That day came: growth is
  // now a `MonthLine` carrying `effect: 'wealth'`, so `assessableAssets` no longer moves for a
  // reason the month's own lines cannot explain. The assertion is REPLACED by its opposite rather
  // than deleted, and chunk 4's identity is asserted beside it — on the CASH lines, which is what
  // it always meant and what `effect` now says.
  for (const month of slow) {
    const reconciled = month.lines.reduce(
      (balance, line) => balance + (line.effect !== 'cash' ? 0 : line.direction === 'inflow' ? line.amount : -line.amount),
      month.openingBalance,
    );
    assert.equal(reconciled, month.closingBalance, month.month);
    // Sam holds two pools — $800,000 of Accumulation super and $250,000 of parcels — so there are
    // TWO growth lines, one per pool, and never one merged figure.
    const growth = month.lines.filter((l) => /growth/i.test(l.description));
    assert.deepEqual(
      growth.map((l) => l.description),
      [
        'Investment growth, Sam — Financial investments outside superannuation',
        'Investment growth, Sam — Superannuation, Accumulation Phase',
      ],
      month.month,
    );
    for (const line of growth) {
      assert.equal(line.effect, 'wealth');
      assert.equal(line.direction, 'inflow');
      assert.ok(line.amount > 0);
    }
    // And the Offset still earns nothing: no line anywhere in the walk grows the running cash, so
    // the identity above stays exact and the two walks' balances stay byte-identical.
    assert.deepEqual(month.lines.filter((l) => /Offset|mortgage/i.test(l.description)), []);
  }
  // The rate-blind claim above is now testable on the growth lines themselves: the FAST walk's
  // growth line is larger in every month, while its cash is identical to the cent.
  const growthIn = (months, index) =>
    months[index].lines.filter((l) => l.effect === 'wealth').reduce((total, l) => total + l.amount, 0);
  for (let index = 0; index < slow.length; index += 1) {
    assert.ok(growthIn(fast, index) > growthIn(slow, index), slow[index].month);
  }
  assert.ok(slow.at(-1).protectedAssets > slow[0].protectedAssets, 'and the balance really did move');
});

// --- Purity, and P4-1a re-earned over a walk whose balances DRIFT --------------------------------

test('project() is still pure with the balance state threaded through it', () => {
  const snapshot = JSON.stringify(LATE);
  const first = JSON.stringify(project(LATE_SETTINGS, LATE, []));
  const second = JSON.stringify(project(LATE_SETTINGS, LATE, []));
  assert.equal(first, second, 'the carried balances leaked between calls');
  assert.equal(JSON.stringify(LATE), snapshot, 'the Household was mutated');
  // The accumulator is LOCAL to the call, so a second walk starts again from the stated figures.
  assert.equal(project(LATE_SETTINGS, LATE, [])[0].assessableAssets, toCents(700_000));
});

test('P4-1a RE-EARNED for chunk 5a — two fake clocks, BYTE-IDENTICAL, over a MOVING balance', () => {
  // Chunks 2 and 3 each re-earned this for what they added. This adds the first output in which a
  // BALANCE drifts across the walk, so the tick is re-earned rather than inherited — and the
  // vacuity control below is a hand-worked moved figure, so neither an empty walk nor a static one
  // could pass it.
  const CLOCKS = ['2026-09-16T00:00:00Z', '2031-03-04T13:45:06Z'];
  const clock = `
const fixed = Date.parse(process.env.FAKE_NOW);
const Real = Date;
class Fake extends Real {
  constructor(...args) { super(...(args.length === 0 ? [fixed] : args)); }
  static now() { return fixed; }
}
globalThis.Date = Fake;
if (Date.now() !== fixed) throw new Error('the clock override did not take');
`;
  const body = `
import { project } from ${JSON.stringify(join(ROOT, 'dist', 'core', 'projection.js'))};
process.stdout.write(JSON.stringify(project(${JSON.stringify(LATE_SETTINGS)}, ${JSON.stringify(LATE)}, [])));
`;
  const dir = mkdtempSync(join(tmpdir(), 'enough-growth-clock-'));
  try {
    writeFileSync(join(dir, 'clock.mjs'), clock);
    const outputs = CLOCKS.map((now) => {
      const script = join(dir, `run-${Buffer.from(now).toString('hex')}.mjs`);
      writeFileSync(script, body);
      return execFileSync(process.execPath, ['--import', join(dir, 'clock.mjs'), script], {
        encoding: 'utf8',
        env: { ...process.env, FAKE_NOW: now },
      });
    });
    assert.equal(outputs[0], outputs[1], 'a moving balance drifted with the system clock');
    // The stated figure, month 0 — the only month whose Offset is nil, so the only one where the
    // super balance and `assessableAssets` still coincide.
    assert.match(outputs[0], /"assessableAssets":70000000/);
    // … and two hand-worked moved ones, one inside the published Age Pension window and one well
    // outside it. Since P4-3b each is the grown super PLUS the pension banked in the Offset by that
    // month: $703,683.18 + $216.45 = $703,899.63 in 2026-10, and $773,395.30 + $1,781.65 =
    // $775,176.95 in 2028-04.
    //
    // ⚠️ **THE SECOND FIGURE MOVED ON 2026-09-21 (P4-1e) AND THE SUPER HALF OF IT DID NOT.** It was
    // $774,850.17, on an Offset *"frozen since the parameter window closed"* at $1,454.87. The
    // standing table keeps paying past 19 March 2027, so the Offset went on filling to $1,781.65 —
    // by a shrinking amount each month, because this fixture's assets test tapers the payment away
    // as the balance grows. `$773,395.30` is identical to the cent, which is the half of this
    // assertion that is about the clock rather than about the pension.
    assert.match(outputs[0], /"assessableAssets":70389963/);
    //
    // ⚠️ **AND AGAIN ON 2026-09-23, AND AGAIN ONLY THE OFFSET HALF.** With no series stated the
    // rates past 19 March 2027 are now INDEXED on the plan's own growth rates rather than carried,
    // so each payment from 2027-04 is larger — by $30.64 in April, less a little each month as the
    // extra cash is itself assessed — and the higher 20 September 2027 maximum keeps her paid
    // through 2027-10, a month the carried rates had already tapered to nil. The Offset reaches
    // $1,975.22; `$773,395.30` is still identical to the cent.
    //
    // ⚠️ **AND $10.04 MORE AGAIN WITH THE ASSETS-TEST FLOOR (T135, 2026-09-24), STILL ONLY THE
    // OFFSET HALF.** SS Act 1064-G7 floors this single Person's excess to the nearest $250 before
    // the taper runs, so a payment can only be the same or larger every month it binds; nineteen
    // months of that compounding through the Offset (the pension itself is not grown further once
    // banked) is not hand-derivable to the cent from a single month's bound (≤ $0.75/fortnight for a
    // single Person), only the sign, which is up. The Offset reaches $1,985.26; `$773,395.30` is
    // still identical to the cent.
    assert.match(outputs[0], /"assessableAssets":77538056/);
    assert.equal(70_368_318 + 21_645, 70_389_963);
    assert.equal(77_339_530 + 197_522, 77_537_052, 'the pre-T135 figure, kept beside the new one');
    assert.equal(77_339_530 + 198_526, 77_538_056);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
