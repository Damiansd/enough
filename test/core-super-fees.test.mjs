// P3-17 SLICE 1 — ADMINISTRATION AND INVESTMENT FEES ON A SUPERANNUATION INTEREST.
//
// Slice 1 is the two fees a fund charges on an account: administration, quoted as a dollar amount
// AND a percentage, and investment, quoted as a percentage. Insurance premiums and their stop age
// are slice 2 and are not built; age-rated premiums (P3-17a) are research-gated and have no source;
// no non-super account carries a fee, because `Parcel` is `{acquired, costBase, marketValue}` and
// hangs directly off `Person.parcels` with no account wrapper to hang one on.
//
// Five things are defended here and nothing else:
//
//   1. THE FIGURES — hand-worked from the rules in `monthlySuperFeesForOneMonth`'s doc and never
//      read off the engine: an arithmetic twelfth (`rate / 12`, not the geometric one growth uses),
//      each component ceiled on its own figure, charged on the post-drawdown pre-growth balance;
//   2. BEFORE GROWTH — the fee does not earn a return, pinned as a FIGURE (the after-growth reading
//      is $0.47 higher on the fixture below and is written out beside it);
//   3. ABSENT IS NIL AND NIL IS SILENT — a fee-less interest projects to hand-worked no-fee figures
//      and emits no line of any kind, which is what keeps every pre-P3-17 fixture byte-identical;
//   4. THE FEE IS VISIBLE — a nonzero fee has its OWN `MonthLine`, at the amount the balance moved
//      by, and the two fees are two lines because `UnlegislatedFigure` cannot itemise;
//   5. THE WEALTH IDENTITY STILL CLOSES — the P4-4 identity, over a walk that pays fees. ⚠️ This is
//      the assertion that goes red if a fee ever moves money without a line against it, which is the
//      failure `PORTFOLIO_BROKERAGE_LINE`'s doc records against the brokerage fee. It is asserted
//      HERE and not in `core-projection-growth-lines.test.mjs`, because no fixture in that file
//      states a fee and an identity is only tested by a walk that can break it.
import test from 'node:test';
import assert from 'node:assert/strict';

import { mulCents, toCents } from '../dist/core/money.js';
import { priceLevelFactor } from '../dist/core/priceLevel.js';
import {
  GROWTH_LINE,
  INTERNAL_TRANSFER_LINES,
  SUPER_ADMINISTRATION_FEE_LINE,
  SUPER_INVESTMENT_FEE_LINE,
  NO_STATING_ENTRY,
  UNLEGISLATED,
  monthlySuperFeesForOneMonth,
  project,
  superPoolName,
} from '../dist/core/projection.js';
import { DEMO_PLAN } from '../dist/app/demoHousehold.js';
import { PlanFileHouseholdError, parsePlan } from '../dist/core/parsePlan.js';

const person = (name, dateOfBirth, over = {}) => ({
  name,
  dateOfBirth,
  superInterests: [],
  parcels: [],
  employmentIncomePerFortnight: toCents(0),
  workBonusBalance: toCents(0),
  ...over,
});

const settings = (over = {}) => ({
  asAtDate: '2026-09-16',
  planningHorizonAge: 48,
  economicSeries: { cpi: 0.025, pblci: 0.025, awote: 0.035, mtawe: 0.035 },
  deemingRates: { lower: 0.0175, upper: 0.0375 },
  nominalReturn: 0.065,
  ...over,
});

/**
 * **ONE Person, ONE pool, and NOTHING ELSE MOVES — the fixture the figures are worked on.**
 *
 * Dev is 46 on `asAtDate` and holds a $100,000 ACCUMULATION interest. That choice is what makes the
 * arithmetic a two-term one and the assertions below hand-workable:
 *
 *   * accumulation, so there is no Schedule 7 minimum, so Waterfall limb 2 draws nothing and the
 *     post-drawdown balance IS the opening balance — the fee base and the opening figure coincide
 *     and the test can state one number;
 *   * 46, so the money is preserved, so limb 5 cannot reach it either;
 *   * no salary, no parcels, no spending entry and no offset, so no cash line exists at all.
 *
 * The balance therefore moves for exactly two reasons in every month: the fees, then the growth.
 */
const DEV = (fees = {}) => ({
  persons: [person('Dev', '1980-01-15', { superInterests: [{ phase: 'accumulation', balance: toCents(100_000), ...fees }] })],
  homeStatus: 'occupied',
});

/** `DEV`, with the balance stated rather than fixed at $100,000 — the cap tests need two of them. */
const ACCOUNT = (balanceDollars, fees = {}) => ({
  persons: [person('Dev', '1980-01-15', { superInterests: [{ phase: 'accumulation', balance: toCents(balanceDollars), ...fees }] })],
  homeStatus: 'occupied',
});

const ACCUMULATION = superPoolName('accumulation');
const ADMIN = `${SUPER_ADMINISTRATION_FEE_LINE}, Dev — ${ACCUMULATION}`;
const INVESTMENT = `${SUPER_INVESTMENT_FEE_LINE}, Dev — ${ACCUMULATION}`;
const GROWTH = `${GROWTH_LINE}, Dev — ${ACCUMULATION}`;

const lineNamed = (month, description) => month.lines.filter((line) => line.description === description);
const amountOf = (month, description) => {
  const found = lineNamed(month, description);
  return found.length === 0 ? undefined : found[0].amount;
};

// THE MONTHLY FACTOR, once, for every "grown" figure below:
//     (1.065)^(1/12) = 1.005261694276848…
// It is `monthlyGrowthFactor`'s rate and the growth is `⌊balance × factor⌋` — `grownForOneMonth`'s
// declared round-DOWN. Fees are NOT compounded that way and that is design point 3: see each
// worked case.

// --- 1. THE FIGURES ------------------------------------------------------------------------------

test('HAND-WORKED — the ADMINISTRATION FEE’S DOLLAR LIMB alone, RAISED then a twelfth rounded UP', () => {
  //   $125.00 a year, stated in TODAY'S money (register O87, ruled 2026-09-21). Month 0 IS
  //   `asAtDate`'s own month, so its factor is exactly 1 and the arithmetic is the original one:
  //     12,500 ÷ 12                       = 1,041.666… cents
  //     ceiled (an OUTFLOW, so the residual points AT the Household)
  //                                       = 1,042 cents = $10.42
  //   THE BALANCE, month 0:
  //     opening                           = 10,000,000 cents
  //     less the fee, BEFORE growth       =  9,998,958 cents
  //     grown  ⌊9,998,958 × 1.005261694276848⌋
  //                                       = 10,051,569 cents
  //     the GROWTH LINE  10,051,569 − 9,998,958
  //                                       =     52,611 cents
  //   MONTH 1 IS WHERE THE RULING SHOWS. `DEV` is an ACCUMULATION interest and stays one for the
  //   whole walk, so from 2026-09-25 (P3-17 slice 4) it is raised by WAGES, not prices — Aware's own
  //   schedule indexes an accumulation-phase account's dollar fee by salary growth
  //   (`~/.enough/verification/P13-1c-aware-soa-extract.md`, p.15). One month of 3.5% is
  //   1.035^(1/12) = 1.00287089…, and the raise happens BEFORE the twelfth so the ceil stays last:
  //     12,500 × 1.00287089… = 12,535.886…, `mulCents` rounds to nearest
  //                                       =     12,536 cents of 2026-10 money
  //     ⌈12,536 ÷ 12⌉                     =      1,045 cents = $10.45, not $10.42
  //     10,051,569 − 1,045 = 10,050,524; ⌊× factor⌋ = 10,103,406 cents.
  //   Three cents a month on a $125 fee at wage growth, and that is the whole size of this end of the
  //   walk: by 2028-01, sixteen months out, the same stated fee is charged at 1,091 cents.
  const months = project(settings(), DEV({ statedAdministrationFeePerYear: toCents(125) }), []);

  assert.equal(amountOf(months[0], ADMIN), 1_042);
  assert.equal(amountOf(months[0], INVESTMENT), undefined, 'an investment fee nobody stated');
  assert.equal(amountOf(months[0], GROWTH), 52_611);
  assert.equal(months[1].protectedAssets, 10_051_569);

  assert.equal(amountOf(months[1], ADMIN), 1_045, 'an ACCUMULATION dollar fee is a PRICE and rises with WAGES — P3-17 slice 4');
  assert.equal(months[2].protectedAssets, 10_103_406);
  // It does not move with the BALANCE, which is the other thing it could have been doing: the
  // balance rose by 0.53% between these two months and the fee by 0.29%, the wage level's month.
  assert.equal(amountOf(months[2], ADMIN), 1_048);
  assert.equal(months.at(-1).month, '2028-01');
  assert.equal(amountOf(months.at(-1), ADMIN), 1_091, '⌈⌊12,500 × 1.035^(16/12)⌉⌉ ÷ 12 — sixteen months of wage growth');
});

test('HAND-WORKED — the ADMINISTRATION FEE’S PERCENTAGE LIMB alone, an ARITHMETIC twelfth', () => {
  //   0.35% a year, stated as the fraction 0.0035.
  //   ⚠️ THE TWELFTH IS `rate / 12` AND NOT `(1 + rate)^(1/12) − 1`. A fee is a periodic charge and
  //   not a compounding return; the geometric reading would charge LESS, which is the flattering
  //   side. Month 0:
  //     10,000,000 × 0.0035               =     35,000 cents a year
  //     ÷ 12                              =  2,916.666… cents
  //     ceiled                            =      2,917 cents = $29.17
  //       (the geometric twelfth would be ⌈10,000,000 × ((1.0035)^(1/12) − 1)⌉ = 2,913 cents — four
  //        cents less in the first month alone, and it is not what a fund deducts.)
  //     less the fee                      =  9,997,083 cents
  //     grown  ⌊9,997,083 × factor⌋       = 10,049,684 cents
  //   MONTH 1 is the one that proves the percentage is charged on the CARRIED balance rather than
  //   on the stated one:
  //     10,049,684 × 0.0035 ÷ 12          =  2,931.157… → ceiled 2,932 cents
  //     10,049,684 − 2,932 = 10,046,752;  ⌊× factor⌋ = 10,099,614 cents.
  const months = project(settings(), DEV({ statedAdministrationFeeRate: 0.0035 }), []);

  assert.equal(amountOf(months[0], ADMIN), 2_917);
  assert.equal(amountOf(months[0], INVESTMENT), undefined);
  assert.equal(months[1].protectedAssets, 10_049_684);

  assert.equal(amountOf(months[1], ADMIN), 2_932, 'the percentage is charged on the balance the month OPENS with');
  assert.equal(months[2].protectedAssets, 10_099_614);
});

test('HAND-WORKED — the INVESTMENT FEE alone, on its OWN line and never merged with the admin one', () => {
  //   0.61% a year, stated as 0.0061. Month 0:
  //     10,000,000 × 0.0061 ÷ 12          =  5,083.333… → ceiled 5,084 cents = $50.84
  //     less the fee                      =  9,994,916 cents
  //     grown  ⌊9,994,916 × factor⌋       = 10,047,506 cents
  //   Month 1: 10,047,506 × 0.0061 ÷ 12 = 5,107.48… → 5,108; 10,042,398 grows to 10,095,238.
  const months = project(settings(), DEV({ statedInvestmentFeeRate: 0.0061 }), []);

  assert.equal(amountOf(months[0], INVESTMENT), 5_084);
  assert.equal(amountOf(months[0], ADMIN), undefined, 'an administration fee nobody stated');
  assert.equal(months[1].protectedAssets, 10_047_506);

  assert.equal(amountOf(months[1], INVESTMENT), 5_108);
  assert.equal(months[2].protectedAssets, 10_095_238);
});

test('HAND-WORKED — ALL THREE TOGETHER, and the components are the SUM of the three alone', () => {
  //   $125.00 a year + 0.35% + 0.61%, month 0:
  //     the flat twelfth                  =      1,042 cents
  //     the admin percentage              =      2,917 cents
  //     ONE ADMINISTRATION LINE           =      3,959 cents = $39.59
  //     ONE INVESTMENT LINE               =      5,084 cents = $50.84
  //     opening less both                 =  9,990,957 cents
  //     grown  ⌊9,990,957 × factor⌋       = 10,043,526 cents
  //     the GROWTH LINE                   =     52,569 cents
  //   Month 1, on the carried 10,043,526. `DEV` stays ACCUMULATION for the whole walk, so from
  //   2026-09-25 (P3-17 slice 4) the flat limb is RAISED BY WAGES rather than prices, first (O87),
  //   and the two rate limbs are NOT — a share of the balance is already in the month's own dollars:
  //     the wage-raised twelfth  ⌈12,536 ÷ 12⌉ =      1,045 cents
  //     the admin percentage ⌈10,043,526 × 0.0035 ÷ 12⌉
  //                                       =      2,930 cents  (unchanged by the ruling)
  //     ONE ADMINISTRATION LINE           =      3,975 cents, one cent above the flat-fee walk's 3,974
  //     ONE INVESTMENT LINE  ⌈10,043,526 × 0.0061 ÷ 12⌉
  //                                       =      5,106 cents  (unchanged by the ruling)
  //   and 10,034,445 grows to 10,087,243 — one cent below the flat-fee walk, and only one.
  const all = { statedAdministrationFeePerYear: toCents(125), statedAdministrationFeeRate: 0.0035, statedInvestmentFeeRate: 0.0061 };
  const months = project(settings(), DEV(all), []);

  assert.equal(amountOf(months[0], ADMIN), 3_959);
  assert.equal(amountOf(months[0], INVESTMENT), 5_084);
  assert.equal(amountOf(months[0], GROWTH), 52_569);
  assert.equal(months[1].protectedAssets, 10_043_526);
  assert.equal(amountOf(months[1], ADMIN), 3_975, 'the dollar limb is now raised by WAGES — P3-17 slice 4');
  assert.equal(amountOf(months[1], INVESTMENT), 5_106, 'a RATE limb is not indexed — the balance it is charged on already is');
  assert.equal(months[2].protectedAssets, 10_087_243);

  // **THE COMPOSITION, which is what ceiling EACH component on its OWN figure buys.** In month 0 —
  // the one month all four walks share a base — the combined administration line is exactly the two
  // limbs charged alone. A single ceil on the summed figure would give 3,958 here, and a reader
  // could not reproduce either limb from the number they typed.
  const dollarOnly = project(settings(), DEV({ statedAdministrationFeePerYear: toCents(125) }), []);
  const rateOnly = project(settings(), DEV({ statedAdministrationFeeRate: 0.0035 }), []);
  assert.equal(amountOf(months[0], ADMIN), amountOf(dollarOnly[0], ADMIN) + amountOf(rateOnly[0], ADMIN));
});

// --- 2. BEFORE GROWTH, PINNED AS A FIGURE --------------------------------------------------------

test('THE FEE COMES OFF BEFORE GROWTH, and the after-growth reading is a DIFFERENT number', () => {
  //   Design point 2, as arithmetic rather than as a claim. On the all-three fixture, month 0:
  //     THIS BUILD   ⌊(10,000,000 − 9,043) × factor⌋          = 10,043,526 cents
  //     the other    ⌊10,000,000 × factor⌋ − 9,043
  //                  = 10,052,616 − 9,043                     = 10,043,573 cents
  //   A difference of 47 cents in the FIRST MONTH of one $100,000 account, compounding for the
  //   length of the walk. This build takes the SMALLER figure: ADR-0009's named failure mode is a
  //   model that flatters the Household, and letting a fee earn a return it was never invested for
  //   is exactly that.
  const all = { statedAdministrationFeePerYear: toCents(125), statedAdministrationFeeRate: 0.0035, statedInvestmentFeeRate: 0.0061 };
  const months = project(settings(), DEV(all), []);
  assert.equal(months[1].protectedAssets, 10_043_526);
  assert.notEqual(months[1].protectedAssets, 10_043_573);
});

// --- 3. ABSENT IS NIL, AND NIL IS SILENT ---------------------------------------------------------

test('NO FEE STATED — hand-worked no-fee figures, and NOT ONE FEE LINE in the whole walk', () => {
  //   The same account with nothing stated. Every month is growth alone:
  //     ⌊10,000,000 × factor⌋             = 10,052,616 cents
  //     ⌊10,052,616 × factor⌋             = 10,105,509 cents
  //   ⚠️ These are ABSOLUTE figures, not a comparison, and that is deliberate: a default fee of any
  //   size — a "typical" 0.10%, a $1 a month — would move them, so this assertion is what forbids
  //   one. `household.ts` states why no default is supplied and which way the silence is wrong.
  const months = project(settings(), DEV(), []);
  assert.equal(months[1].protectedAssets, 10_052_616);
  assert.equal(months[2].protectedAssets, 10_105_509);

  const fees = months.flatMap((month) => month.lines.filter((line) =>
    line.description.startsWith(SUPER_ADMINISTRATION_FEE_LINE) || line.description.startsWith(SUPER_INVESTMENT_FEE_LINE)));
  assert.deepEqual(fees, [], 'a nil fee is a fact about the account, not a payment of nothing');
  // Not vacuous: the same walk with a fee stated DOES emit them, so the filter above can find one.
  const paying = project(settings(), DEV({ statedInvestmentFeeRate: 0.0061 }), []);
  assert.equal(paying.flatMap((month) => month.lines.filter((line) => line.description.startsWith(SUPER_INVESTMENT_FEE_LINE))).length, paying.length);
});

test('ABSENT AND EXPLICITLY NIL ARE THE SAME WALK, to the byte', () => {
  // A file stating `0` and a file stating nothing are two spellings of the same fact here — unlike
  // `statedStreamSettings`, absence carries no third state — so the two walks must be identical, not
  // merely close. `JSON.stringify` over the whole `Month[]` compares every line, note and figure.
  const absent = project(settings(), DEV(), []);
  const nil = project(settings(), DEV({ statedAdministrationFeePerYear: toCents(0), statedAdministrationFeeRate: 0, statedInvestmentFeeRate: 0 }), []);
  assert.equal(JSON.stringify(nil), JSON.stringify(absent));
});

// --- 4. THE FEE IS VISIBLE, AND IT IS WEALTH RATHER THAN CASH ------------------------------------

test('A NONZERO FEE HAS ITS OWN LINE — shape, direction, effect, provenance, attribution', () => {
  const all = { statedAdministrationFeePerYear: toCents(125), statedAdministrationFeeRate: 0.0035, statedInvestmentFeeRate: 0.0061 };
  const months = project(settings(), DEV(all), []);

  for (const month of months) {
    for (const description of [ADMIN, INVESTMENT]) {
      const found = lineNamed(month, description);
      assert.equal(found.length, 1, `${month.month} ${description}`);
      const [line] = found;
      assert.equal(line.direction, 'outflow');
      // ⚠️ `'wealth'` and never `'cash'`: the deduction happens inside the fund and the Household
      // never holds the money. A cash line would take a fund's fee out of the Offset Account.
      assert.equal(line.effect, 'wealth');
      assert.ok(line.amount > 0, 'MonthLine.amount is specified as always positive');
      assert.ok(Object.isFrozen(line));
      assert.equal(line.provenance, UNLEGISLATED.superFees);
      assert.equal(line.attribution, NO_STATING_ENTRY.superFees);
    }
  }

  // **TWO LINES AND NOT ONE.** `UnlegislatedFigure` is `{ basis, note }` — only a `'legislated'`
  // record carries a `determination` — so a fee that has no line of its own cannot be seen at all.
  assert.notEqual(amountOf(months[0], ADMIN), amountOf(months[0], INVESTMENT));
});

test('A FEE REACHES NO CASH FIGURE — every opening and closing balance is the fee-less walk’s', () => {
  const all = { statedAdministrationFeePerYear: toCents(125), statedAdministrationFeeRate: 0.0035, statedInvestmentFeeRate: 0.0061 };
  const paying = project(settings(), DEV(all), []);
  const free = project(settings(), DEV(), []);
  assert.equal(
    JSON.stringify(paying.map((month) => [month.openingBalance, month.closingBalance])),
    JSON.stringify(free.map((month) => [month.openingBalance, month.closingBalance])),
  );
  // Not vacuous — the two walks' WEALTH diverges from the second month, so the equality above is
  // about cash rather than about two identical walks.
  assert.notEqual(
    JSON.stringify(paying.map((month) => month.protectedAssets)),
    JSON.stringify(free.map((month) => month.protectedAssets)),
  );
  // And the cash identity itself still closes, month by month.
  const cashTotal = (month) => month.lines.reduce(
    (total, line) => total + (line.effect !== 'cash' ? 0 : line.direction === 'inflow' ? line.amount : -line.amount), 0);
  for (const month of paying) assert.equal(month.openingBalance + cashTotal(month), month.closingBalance, month.month);
});

// --- 5. THE WEALTH IDENTITY, OVER A WALK THAT PAYS FEES ------------------------------------------

/**
 * **The fixture the identity needs, and it is deliberately NOT the one above.** A fee that moved
 * money with no line against it is invisible in a one-pool walk that reconciles nothing, so this one
 * has a drawdown (an Account-Based Pension, commenced years ago, whose Schedule 7 minimum limb 2
 * pays), spending, an Offset Account and TWO interests with DIFFERENT fees — so a fee charged on the
 * wrong slot's balance, or on the pre-drawdown balance, breaks it too.
 */
const RECONCILING = {
  persons: [
    person('Ash', '1958-03-20', {
      superInterests: [
        {
          phase: 'accountBasedPension',
          balance: toCents(500_000),
          statedStreamSettings: { commencementDay: '2020-07-01' },
          statedAdministrationFeePerYear: toCents(125),
          statedInvestmentFeeRate: 0.0061,
        },
        { phase: 'accumulation', balance: toCents(80_000), statedAdministrationFeeRate: 0.0035 },
      ],
    }),
  ],
  homeStatus: 'occupied',
  openingOffsetBalance: toCents(40_000),
};

// The cash lines that move money between two of the Household's OWN pools, so total wealth does not
// change and they must come back out of `Δ offset` — `INTERNAL_TRANSFER_LINES`, `projection.ts`'s
// single source of truth for this list (P4-13). This walk spends its pension down and Waterfall
// limb 5 fires from 2027-06, which is what caught `SUPER_LUMP_SUM_LINE` missing from a hand-copy of
// this regex in `core-projection-growth-lines.test.mjs`: omitting it made the identity read
// $4,174.47 out in exactly that month.
const INTERNAL = new RegExp(`^(${INTERNAL_TRANSFER_LINES.join('|')})`);

test('THE P4-4 WEALTH IDENTITY STILL CLOSES — exact, in every month, with fees being paid', () => {
  //     Δ(protected + assessable) = Σ wealth lines + Δ offset − Σ internal transfers
  //
  // ⚠️ **THIS IS THE ASSERTION AN UNLINED FEE BREAKS.** The fee leaves a superannuation balance, so
  // it is inside `Δ(protected + assessable)`; it is not cash, so it is outside `Δ offset`; it is not
  // a transfer between the Household's own pools, so it is outside `Σ internal`. The ONLY term it
  // can appear in is `Σ wealth lines` — which is another way of saying that suppressing the line
  // while still deducting the money makes this equality false in every month a fee is paid.
  const entries = [{ id: 'sc', date: '2026-09-01', owner: 'household', type: 'SPEND_CHANGE', params: { annualSpend: toCents(60_000) }, enabled: true, createdAt: '2026-06-01' }];
  const months = project(settings({ planningHorizonAge: 72 }), RECONCILING, entries);
  const signed = (month, predicate) => month.lines.filter(predicate)
    .reduce((total, line) => total + (line.direction === 'inflow' ? line.amount : -line.amount), 0);

  let feeMonths = 0;
  for (let index = 0; index + 1 < months.length; index += 1) {
    const month = months[index];
    const next = months[index + 1];
    const wealth = signed(month, (line) => line.effect === 'wealth');
    const internal = signed(month, (line) => line.effect === 'cash' && INTERNAL.test(line.description));
    const offset = month.closingBalance - month.openingBalance;
    const delta = next.protectedAssets + next.assessableAssets - (month.protectedAssets + month.assessableAssets);
    assert.equal(delta, wealth + offset - internal, `${month.month}: the wealth identity`);
    if (month.lines.some((line) => line.description.startsWith(SUPER_ADMINISTRATION_FEE_LINE))) feeMonths += 1;
  }
  // The identity is only a test of the fee where a fee was actually charged, so count them.
  assert.equal(feeMonths, months.length - 1, 'every transition of this walk pays an administration fee');
  // And both interests are paying, on their own stated figures — a fee read off the wrong slot
  // would still reconcile, so the two are pinned as separate lines with separate pools.
  const pension = `${SUPER_ADMINISTRATION_FEE_LINE}, Ash — ${superPoolName('accountBasedPension')}`;
  const accumulation = `${SUPER_ADMINISTRATION_FEE_LINE}, Ash — ${ACCUMULATION}`;
  //   Pension interest: the flat $125 a year only → ⌈12,500 ÷ 12⌉ = 1,042 cents, every month.
  //   Accumulation interest: 0.35% only, month 0 → ⌈8,000,000 × 0.0035 ÷ 12⌉ = ⌈2,333.33⌉ = 2,334.
  assert.equal(amountOf(months[0], pension), 1_042);
  assert.equal(amountOf(months[0], accumulation), 2_334);
  // **AND THE INVESTMENT FEE IS ON THE PENSION INTEREST ONLY, because only it states one.** The
  // accumulation interest states an administration rate and nothing else, so it has no investment
  // line in any month of the walk — a fee read off the Person rather than off the interest, or
  // summed across the two, would put one here.
  assert.equal(
    months.flatMap((month) => lineNamed(month, `${SUPER_INVESTMENT_FEE_LINE}, Ash — ${ACCUMULATION}`)).length,
    0,
    'an interest that states no investment fee is charged none',
  );
  assert.ok(amountOf(months[0], `${SUPER_INVESTMENT_FEE_LINE}, Ash — ${superPoolName('accountBasedPension')}`) > 0);
});

// --- 5b. THE PRICE LEVEL, AND ITS ALGEBRAIC CONTROL (register O87, ruled 2026-09-21) -------------

test('awote: 0 RECOVERS THE FLAT-FEE WALK EXACTLY — the control on an ACCUMULATION account, P3-17 slice 4', () => {
  // **The strongest form of the control this repo has, and it is available here because the ruling
  // added exactly one factor.** `DEV` is an ACCUMULATION interest and never converts in this walk,
  // so from 2026-09-25 its dollar fee and cap are raised by WAGES, not prices (P3-17 slice 4) — the
  // control that recovers the pre-ruling flat-fee walk is `awote: 0`, not `cpi: 0`. With wage growth
  // forced to nil, every figure this file stated before ANY indexation existed comes back to the
  // cent — 1,042 and 3,972 in month 1, 10,103,409 and 10,087,246 in month 2 — so the two figures that
  // move in the tests above move for the WAGE level and for nothing else: no rounding changed, no
  // ordering changed, and the percentage limbs are where they were.
  //
  // `awote: 0` is the algebraic control and not a special case — `priceLevelFactor` returns exactly 1
  // in every month for it, with no branch anywhere. The other three series are left alone, so this is
  // a statement about WAGES and not about a walk in which nothing indexes. See the CPI-side control
  // beside it below, on an interest already in retirement phase.
  const nil = settings({ economicSeries: { cpi: 0.025, pblci: 0.025, awote: 0, mtawe: 0.035 } });

  const dollarOnly = project(nil, DEV({ statedAdministrationFeePerYear: toCents(125) }), []);
  assert.equal(amountOf(dollarOnly[1], ADMIN), 1_042);
  assert.equal(dollarOnly[2].protectedAssets, 10_103_409);
  assert.equal(new Set(dollarOnly.map((month) => amountOf(month, ADMIN))).size, 1, 'with no wage growth a dollar fee is one figure');

  const all = { statedAdministrationFeePerYear: toCents(125), statedAdministrationFeeRate: 0.0035, statedInvestmentFeeRate: 0.0061 };
  const three = project(nil, DEV(all), []);
  assert.equal(amountOf(three[1], ADMIN), 3_972);
  assert.equal(amountOf(three[1], INVESTMENT), 5_106, 'the investment limb was never indexed, so the control cannot move it');
  assert.equal(three[2].protectedAssets, 10_087_246);
});

// --- 5c. THE PHASE SPLIT — the accumulation set rides WAGES, the pension set rides CPI (P3-17
// slice 4, user-approved 2026-09-25) --------------------------------------------------------------

test('WAGE VS CPI INDEXATION, PER PHASE — two interests, the SAME stated dollar fee, and NO pension fee stated on either', () => {
  // **Both interests state ONLY `statedAdministrationFeePerYear: $125` and nothing else** — no
  // pension-specific field at all — so the PENSION interest's figure is `statedAdministrationFee-
  // PerYear` falling back exactly as `household.ts`'s doc on `statedPensionAdministrationFeePerYear`
  // says, and the only thing that can differ between the two lines below is which SERIES raises that
  // one shared figure. `statedAdministrationFeeRate` is absent on both, so the admin line is the
  // flat twelfth alone (design point 8's `annualPercentage` term is nil), which is what lets this
  // test read the fee straight off `priceLevelFactor` with no balance or drawdown arithmetic at all.
  const household = {
    persons: [
      person('Grow', '1980-01-15', { superInterests: [{ phase: 'accumulation', balance: toCents(100_000), statedAdministrationFeePerYear: toCents(125) }] }),
      person('Pay', '1958-01-15', { superInterests: [{ phase: 'accountBasedPension', balance: toCents(100_000), statedAdministrationFeePerYear: toCents(125) }] }),
    ],
    homeStatus: 'occupied',
  };
  const months = project(settings({ planningHorizonAge: 68 }), household, []);
  const growAdmin = `${SUPER_ADMINISTRATION_FEE_LINE}, Grow — ${ACCUMULATION}`;
  const payAdmin = `${SUPER_ADMINISTRATION_FEE_LINE}, Pay — ${superPoolName('accountBasedPension')}`;

  assert.equal(amountOf(months[0], growAdmin), 1_042, 'month 0 is the plan’s own month for both series alike');
  assert.equal(amountOf(months[0], payAdmin), 1_042);

  // **THE IDENTITY, one per line, each against its OWN series.** `Grow` is re-derived from WAGES
  // alone and `Pay` from CPI alone, in EVERY month — the two figures diverge from month 1 on, because
  // `settings()` states the two series apart (3.5% and 2.5%), and neither identity would hold against
  // the other series.
  for (const [index, month] of months.entries()) {
    const wageRaised = Math.ceil(mulCents(toCents(125), priceLevelFactor(0.035, settings().asAtDate, month.month)) / 12);
    const cpiRaised = Math.ceil(mulCents(toCents(125), priceLevelFactor(0.025, settings().asAtDate, month.month)) / 12);
    assert.equal(amountOf(month, growAdmin), wageRaised, `${month.month}: the ACCUMULATION fee is not the stated figure raised by WAGES`);
    assert.equal(amountOf(month, payAdmin), cpiRaised, `${month.month}: the PENSION fee is not the stated figure raised by CPI`);
  }
  assert.notEqual(amountOf(months.at(-1), growAdmin), amountOf(months.at(-1), payAdmin), 'the two series must have actually diverged by the end of this walk');

  // **THE FALLBACK, AS A CONTROL.** Neither interest states a pension-specific field, so `Pay`'s own
  // figure is `statedAdministrationFeePerYear` read through the door P3-17 slice 4 opened on
  // `SuperInterest`, not a separate code path — proven by giving `Pay` the SAME figure again under
  // `statedPensionAdministrationFeePerYear` instead and getting byte-identical months.
  const restated = {
    ...household,
    persons: [
      household.persons[0],
      { ...household.persons[1], superInterests: [{ phase: 'accountBasedPension', balance: toCents(100_000), statedPensionAdministrationFeePerYear: toCents(125) }] },
    ],
  };
  assert.equal(JSON.stringify(project(settings({ planningHorizonAge: 68 }), restated, [])), JSON.stringify(months));
});

test('A PERCENTAGE FEE IS BLIND TO THE PRICE LEVEL — asserted, not assumed, against EITHER series', () => {
  // **The claim O87's ruling rests on for the other two limbs:** a share of a balance is charged on
  // a figure that is already in the month's own nominal dollars, so it indexes itself and raising
  // the rate would count the price level twice. That is an argument; this is the test of it. Two
  // walks differing ONLY in `cpi`, with no dollar fee stated anywhere, are the same walk to the byte
  // — and so are two differing only in `awote`, since `DEV` is ACCUMULATION and P3-17 slice 4 made
  // WAGES the series its dollar limb would have moved with, had one been stated.
  //
  // ⚠️ `Month.assetsTestThresholds` (2026-09-25) is stripped before comparing, and ONLY it: the Age
  // Pension's free area and cut-off are indexed to prices and wages BY LAW, so they rightly differ
  // between these walks. They are a reading of the means test, not a fee, and no money moves on them.
  const feeView = (walk) => JSON.stringify(walk.map(({ assetsTestThresholds, ...rest }) => rest));
  const rates = { statedAdministrationFeeRate: 0.0035, statedInvestmentFeeRate: 0.0061 };
  const inflatingCpi = project(settings(), DEV(rates), []);
  const flatCpi = project(settings({ economicSeries: { cpi: 0, pblci: 0.025, awote: 0.035, mtawe: 0.035 } }), DEV(rates), []);
  assert.equal(feeView(inflatingCpi), feeView(flatCpi), 'a RATE moved with the CPI — that would be the price level charged twice');
  const flatAwote = project(settings({ economicSeries: { cpi: 0.025, pblci: 0.025, awote: 0, mtawe: 0.035 } }), DEV(rates), []);
  assert.equal(feeView(inflatingCpi), feeView(flatAwote), 'a RATE moved with WAGES — that would be the price level charged twice');
  // The strip is not hiding anything by accident: the thresholds DO differ with the CPI.
  assert.notEqual(JSON.stringify(inflatingCpi), JSON.stringify(flatCpi), 'the thresholds no longer follow the CPI — the strip above is now dead');
  // Not vacuous: the same pair of walks with a DOLLAR fee added does differ against WAGES — the
  // series `DEV`'s own dollar limb actually rides — so the equalities above are about the rate limbs
  // rather than about a fixture neither series can reach at all.
  const withDollar = { ...rates, statedAdministrationFeePerYear: toCents(125) };
  assert.notEqual(
    feeView(project(settings(), DEV(withDollar), [])),
    feeView(project(settings({ economicSeries: { cpi: 0.025, pblci: 0.025, awote: 0, mtawe: 0.035 } }), DEV(withDollar), [])),
  );
});

// --- 6. THE FUNCTION'S OWN EDGES -----------------------------------------------------------------

test('monthlySuperFeesForOneMonth — nil, the cap, and the refusals', () => {
  const interest = (over) => ({ phase: 'accumulation', balance: toCents(0), ...over });
  // **The price-level lens, held at 1 here, and it is REQUIRED rather than defaulted** (O87, design
  // point 6): these cases are about the cap and the refusals, so the factor is the algebraic
  // control. A caller that forgot it would not compile, which is the point of there being no
  // default — an identity default would silently restore the flat fee this ruling removed.
  const flat = (stated) => stated;

  // Nil in every arm, and the three fields are independent of one another.
  assert.deepEqual({ ...monthlySuperFeesForOneMonth(toCents(1_000), interest({}), flat) }, { administration: 0, investment: 0 });

  // **THE CAP IS ORDERED, NEVER PRO-RATED** (design point 5). A $3.00 account stating $120 a year
  // flat plus a 100% investment fee: the administration limb is ⌈12,000 ÷ 12⌉ = 1,000 cents, capped
  // at the 300 cents the account holds, and the investment limb then has nothing left to take. The
  // balance goes to nil rather than negative, and `balanceAfterDrawdownAndGrowth` never sees a
  // deduction larger than the balance.
  assert.deepEqual(
    { ...monthlySuperFeesForOneMonth(toCents(3), interest({ statedAdministrationFeePerYear: toCents(120), statedInvestmentFeeRate: 1 }), flat) },
    { administration: 300, investment: 0 },
  );

  // A negative fee is a credit and these fields name charges.
  assert.throws(() => monthlySuperFeesForOneMonth(toCents(1_000), interest({ statedAdministrationFeePerYear: -1 }), flat), RangeError);
  assert.throws(() => monthlySuperFeesForOneMonth(toCents(1_000), interest({ statedAdministrationFeeRate: -0.001 }), flat), RangeError);
  assert.throws(() => monthlySuperFeesForOneMonth(toCents(1_000), interest({ statedInvestmentFeeRate: -0.001 }), flat), RangeError);
  assert.throws(() => monthlySuperFeesForOneMonth(-1, interest({}), flat), RangeError);

  // **The refusal is taken on the STATED figure, before the lens** (design point 6): the message
  // has to quote the number the user typed, and a raised one is a number they never saw. A lens
  // that would have turned -1 into -2 does not get the chance to.
  assert.throws(
    () => monthlySuperFeesForOneMonth(toCents(1_000), interest({ statedAdministrationFeePerYear: -1 }), (stated) => stated * 2),
    /not an annual administration fee in whole cents: -1$/,
  );
});

// --- 6b. P3-17 SLICE 3 — THE PERCENTAGE ADMIN FEE CAP (2026-09-25) -------------------------------

test('monthlySuperFeesForOneMonth — the CAP limits the PERCENTAGE limb only, and is indexed and refused', () => {
  const interest = (over) => ({ phase: 'accumulation', balance: toCents(0), ...over });
  const flat = (stated) => stated;

  // **BINDS: the cap wins the `Math.min`.** $1,000,000 at 1% is $10,000/yr uncapped; a $480/yr cap
  // brings it down to ⌈48,000 ÷ 12⌉ = 4,000 cents, and the investment limb is untouched by it.
  assert.deepEqual(
    { ...monthlySuperFeesForOneMonth(
      toCents(1_000_000),
      interest({ statedAdministrationFeeRate: 0.01, statedAdministrationFeeCapPerYear: toCents(480), statedInvestmentFeeRate: 0.02 }),
      flat,
    ) },
    { administration: 4_000, investment: Math.ceil((toCents(1_000_000) * 0.02) / 12) },
  );

  // **DOES NOT BIND: a cap far above the uncapped figure changes nothing.** Same rate, same balance,
  // a cap of $1,000,000/yr — the uncapped ⌈100,000,000 × 0.01 ÷ 12⌉ = 833,334 cents wins the `min`.
  const uncapped = { ...monthlySuperFeesForOneMonth(toCents(1_000_000), interest({ statedAdministrationFeeRate: 0.01 }), flat) };
  const notBinding = { ...monthlySuperFeesForOneMonth(
    toCents(1_000_000),
    interest({ statedAdministrationFeeRate: 0.01, statedAdministrationFeeCapPerYear: toCents(1_000_000) }),
    flat,
  ) };
  assert.deepEqual(notBinding, uncapped, 'a cap that never binds must not move the figure by a cent');

  // **THE FLAT DOLLAR LIMB IS NEVER CAPPED.** A cap alone, with the dollar limb also stated, still
  // charges the dollar limb in full: only the percentage limb is limited.
  assert.deepEqual(
    { ...monthlySuperFeesForOneMonth(
      toCents(1_000_000),
      interest({ statedAdministrationFeePerYear: toCents(120), statedAdministrationFeeRate: 0.01, statedAdministrationFeeCapPerYear: toCents(480) }),
      flat,
    ) },
    { administration: Math.ceil(toCents(120) / 12) + 4_000, investment: 0 },
  );

  // **INDEXED THROUGH THE SAME LENS AS THE DOLLAR FEE.** A lens that doubles moves the cap and
  // therefore moves which figure wins the `min` — proof the cap is read through `raisedToPriceLevel`
  // and not the stated figure directly.
  const doubled = (stated) => (stated * 2);
  assert.deepEqual(
    { ...monthlySuperFeesForOneMonth(
      toCents(1_000_000),
      interest({ statedAdministrationFeeRate: 0.01, statedAdministrationFeeCapPerYear: toCents(480) }),
      doubled,
    ) },
    { administration: Math.ceil((toCents(480) * 2) / 12), investment: 0 },
    'the cap was not raised by the lens it was handed',
  );

  // A negative cap is a credit and this field names a limit on a charge.
  assert.throws(
    () => monthlySuperFeesForOneMonth(toCents(1_000), interest({ statedAdministrationFeeRate: 0.01, statedAdministrationFeeCapPerYear: -1 }), flat),
    /not an annual administration fee cap in whole cents: -1$/,
  );
});

test('P3-17 SLICE 3 — HAND-WORKED WALK: the cap binds at a HIGH balance and not at a LOW one', () => {
  // 1% admin rate, an annual cap of $480 (48,000 cents), on two otherwise identical accounts.
  const fees = { statedAdministrationFeeRate: 0.01, statedAdministrationFeeCapPerYear: toCents(480) };
  // $200,000 × 1% = $2,000/yr, capped to $480/yr: ⌈48,000 ÷ 12⌉ = 4,000 cents, month 0 (factor 1).
  const high = project(settings(), ACCOUNT(200_000, fees), []);
  assert.equal(amountOf(high[0], ADMIN), 4_000, 'the cap did not bind at the balance it is supposed to bind at');
  // The positive control: with no cap stated the same balance is charged the full uncapped figure.
  const uncappedHigh = project(settings(), ACCOUNT(200_000, { statedAdministrationFeeRate: 0.01 }), []);
  assert.equal(amountOf(uncappedHigh[0], ADMIN), 16_667, '⌈20,000,000 × 0.01 ÷ 12⌉ — the uncapped figure');
  assert.notEqual(amountOf(high[0], ADMIN), amountOf(uncappedHigh[0], ADMIN), 'the cap made no difference at the balance where it should');

  // $30,000 × 1% = $300/yr, well under the $480 cap: ⌈30,000 ÷ 12⌉ = 2,500 cents, uncapped.
  const low = project(settings(), ACCOUNT(30_000, fees), []);
  assert.equal(amountOf(low[0], ADMIN), 2_500);
  // **BYTE-IDENTICAL: a cap that never binds must not move a single figure in the whole walk**, not
  // merely the fee line — the same standard `core-super-fees.test.mjs` already holds absence to.
  const uncappedLow = project(settings(), ACCOUNT(30_000, { statedAdministrationFeeRate: 0.01 }), []);
  assert.equal(JSON.stringify(low), JSON.stringify(uncappedLow), 'a cap that never binds changed the walk anyway');
});

test('P3-17 SLICE 3 — THE CAP IS INDEXED, on the SAME lens as the dollar administration fee (P3-17 slice 4)', () => {
  const fees = { statedAdministrationFeeRate: 0.01, statedAdministrationFeeCapPerYear: toCents(480) };
  const indexed = project(settings(), ACCOUNT(200_000, fees), []);
  // The uncapped figure ($16,667c) is unmoved by the price level (a RATE limb never is — see the
  // "PERCENTAGE FEE IS BLIND TO THE PRICE LEVEL" test above); if the CAPPED figure rises anyway, the
  // cap itself, and only the cap, is what moved.
  assert.ok(amountOf(indexed[6], ADMIN) > amountOf(indexed[0], ADMIN), 'the capped fee never rose — the cap is not being indexed');
  assert.ok(new Set(indexed.map((month) => amountOf(month, ADMIN))).size > 1, 'the capped fee is flat — the ruling was not applied to the cap');

  // **THE ALGEBRAIC CONTROL — `ACCOUNT` stays ACCUMULATION for the whole walk, so from 2026-09-25
  // (P3-17 slice 4) its cap is raised by WAGES, not prices: `awote: 0` is now what recovers exactly
  // one figure in every month, not `cpi: 0`.**
  const flatAwote = project(settings({ economicSeries: { cpi: 0.025, pblci: 0.025, awote: 0, mtawe: 0.035 } }), ACCOUNT(200_000, fees), []);
  assert.equal(new Set(flatAwote.map((month) => amountOf(month, ADMIN))).size, 1, 'with no wage growth the cap is one figure in every month');
  assert.equal(amountOf(flatAwote[0], ADMIN), 4_000);

  // **THE IDENTITY**, re-derived from the STATED cap and each month's own WAGE level alone — exactly
  // O87's pattern applied to the cap instead of the dollar limb, on the series an accumulation-phase
  // account actually uses.
  for (const [index, month] of indexed.entries()) {
    const raisedCap = Math.ceil(mulCents(toCents(480), priceLevelFactor(0.035, settings().asAtDate, month.month)) / 12);
    assert.equal(amountOf(month, ADMIN), raisedCap, `${month.month}: the capped fee is not the stated cap raised to this month`);
  }
});

// --- 7. THE DOOR ---------------------------------------------------------------------------------
//
// `object()` in `parsePlan.ts` refuses an unknown key BY NAME, so the three fields are unreachable
// from a file until they are on the allowlist — and a plan file written before they existed must
// still parse, which is the half that has to be verified rather than assumed.

/** The demo plan as it would be on disk: JSON, with every brand and every prototype gone. */
const onDisk = () => JSON.parse(JSON.stringify(DEMO_PLAN));

test('THE DOOR — a plan file with NO fee keys parses, and reproduces its own input', () => {
  const file = onDisk();
  // Vacuity control: the base file really does state no fee, so "it parsed" is about the absence.
  assert.equal(JSON.stringify(file).includes('statedAdministrationFee'), false);
  assert.equal(JSON.stringify(file).includes('statedInvestmentFee'), false);

  const parsed = parsePlan(file);
  // **ABSENT, never present-and-undefined.** `optionally` is what makes this true, and it is what
  // lets a re-written file reproduce its own input: `JSON.stringify` drops an undefined-valued key,
  // so a parse that produced one would round-trip to a DIFFERENT file from the one it read.
  for (const person of parsed.household.persons) {
    for (const held of person.superInterests) {
      assert.equal(Object.hasOwn(held, 'statedAdministrationFeePerYear'), false);
      assert.equal(Object.hasOwn(held, 'statedAdministrationFeeRate'), false);
      assert.equal(Object.hasOwn(held, 'statedInvestmentFeeRate'), false);
    }
  }
  assert.equal(JSON.stringify(parsePlan(JSON.parse(JSON.stringify(parsed)))), JSON.stringify(parsed));
});

test('THE DOOR — the three fee keys are READ, and a negative one is refused BY NAME', () => {
  const withFees = (fees) => {
    const file = onDisk();
    Object.assign(file.household.persons[0].superInterests[0], fees);
    return file;
  };
  const stated = { statedAdministrationFeePerYear: 12_500, statedAdministrationFeeRate: 0.0035, statedInvestmentFeeRate: 0.0061 };
  assert.deepEqual(
    { ...parsePlan(withFees(stated)).household.persons[0].superInterests[0] },
    { ...parsePlan(onDisk()).household.persons[0].superInterests[0], ...stated },
  );
  // Round trip: a file that STATES fees reproduces its own input too.
  const parsed = parsePlan(withFees(stated));
  assert.equal(JSON.stringify(parsePlan(JSON.parse(JSON.stringify(parsed)))), JSON.stringify(parsed));

  // A negative fee is a credit, and these fields name charges. Refused at the door with the path,
  // rather than as a bare `RangeError` out of the middle of a projection.
  for (const [key, value] of [['statedAdministrationFeePerYear', -1], ['statedAdministrationFeeRate', -0.001], ['statedInvestmentFeeRate', -0.001]]) {
    assert.throws(() => parsePlan(withFees({ [key]: value })), PlanFileHouseholdError, `${key} was accepted`);
    assert.match(
      (() => { try { parsePlan(withFees({ [key]: value })); } catch (error) { return error.message; } return ''; })(),
      new RegExp(`superInterests\\[0\\]\\.${key}`),
    );
  }
  // A non-number is refused too, by the shape check the other fields already use.
  assert.throws(() => parsePlan(withFees({ statedInvestmentFeeRate: '0.006' })), PlanFileHouseholdError);
});

// --- 7b. THE DOOR — P3-17 SLICE 3, THE CAP (2026-09-25) -------------------------------------------

test('THE DOOR — the cap is READ alongside a rate, absent is unreachable evidence of a change, and both refusals name the field', () => {
  const withFees = (fees) => {
    const file = onDisk();
    Object.assign(file.household.persons[0].superInterests[0], fees);
    return file;
  };

  // Stated beside the rate it caps: it is read, and the round trip reproduces the file that stated it.
  const stated = { statedAdministrationFeeRate: 0.0035, statedAdministrationFeeCapPerYear: 75_000 };
  const parsed = parsePlan(withFees(stated));
  assert.equal(parsed.household.persons[0].superInterests[0].statedAdministrationFeeCapPerYear, 75_000);
  assert.equal(JSON.stringify(parsePlan(JSON.parse(JSON.stringify(parsed)))), JSON.stringify(parsed));

  // Absent, on a file stating the rate but no cap: the key is UNREACHABLE, not present-and-undefined.
  const rateOnly = parsePlan(withFees({ statedAdministrationFeeRate: 0.0035 }));
  assert.equal(Object.hasOwn(rateOnly.household.persons[0].superInterests[0], 'statedAdministrationFeeCapPerYear'), false);

  // Negative: a credit, and this field names a limit on a charge.
  assert.throws(() => parsePlan(withFees({ statedAdministrationFeeRate: 0.0035, statedAdministrationFeeCapPerYear: -1 })), PlanFileHouseholdError);
  const negative = (() => {
    try { parsePlan(withFees({ statedAdministrationFeeRate: 0.0035, statedAdministrationFeeCapPerYear: -1 })); } catch (error) { return error.message; }
    return '';
  })();
  assert.match(negative, /superInterests\[0\]\.statedAdministrationFeeCapPerYear/);

  // **A CAP WITH NO RATE TO CAP IS REFUSED BY NAME** (P3-17 slice 3's own door ruling) — a cap on a
  // percentage fee nobody stated is not a fact about a fund, and this build does not guess whether
  // the rate was left off by accident or the fund charges no percentage fee at all.
  assert.throws(() => parsePlan(withFees({ statedAdministrationFeeCapPerYear: 75_000 })), PlanFileHouseholdError);
  const capAlone = (() => {
    try { parsePlan(withFees({ statedAdministrationFeeCapPerYear: 75_000 })); } catch (error) { return error.message; }
    return '';
  })();
  assert.match(capAlone, /superInterests\[0\]\.statedAdministrationFeeCapPerYear/);
  assert.match(capAlone, /statedAdministrationFeeRate/, 'the refusal does not name what is missing');

  // The dollar limb and the investment fee are untouched by any of this: a cap with no rate is
  // refused whether or not the OTHER two fees are stated.
  assert.throws(
    () => parsePlan(withFees({ statedAdministrationFeePerYear: 12_500, statedInvestmentFeeRate: 0.0061, statedAdministrationFeeCapPerYear: 75_000 })),
    PlanFileHouseholdError,
  );
});

// --- 7c. THE DOOR — P3-17 SLICE 4, THE PENSION-PHASE FEE SET (2026-09-25) -------------------------

test('THE DOOR — the pension-phase fee set is READ, round-trips, and is refused on the SAME three grounds as the accumulation set', () => {
  const withFees = (fees) => {
    const file = onDisk();
    Object.assign(file.household.persons[0].superInterests[0], fees);
    return file;
  };

  // Read, and round trips: a file stating the pension set reproduces its own input.
  const stated = {
    statedPensionAdministrationFeePerYear: 20_000,
    statedPensionAdministrationFeeRate: 0.0016,
    statedPensionAdministrationFeeCapPerYear: 130_000,
  };
  const parsed = parsePlan(withFees(stated));
  assert.deepEqual(
    { ...parsed.household.persons[0].superInterests[0] },
    { ...parsePlan(onDisk()).household.persons[0].superInterests[0], ...stated },
  );
  assert.equal(JSON.stringify(parsePlan(JSON.parse(JSON.stringify(parsed)))), JSON.stringify(parsed));

  // Absent: the three keys are UNREACHABLE, not present-and-undefined, exactly like the accumulation
  // set — the base demo file states neither.
  for (const key of ['statedPensionAdministrationFeePerYear', 'statedPensionAdministrationFeeRate', 'statedPensionAdministrationFeeCapPerYear']) {
    assert.equal(Object.hasOwn(parsed.household.persons[0].superInterests[0], key), true);
    assert.equal(Object.hasOwn(parsePlan(onDisk()).household.persons[0].superInterests[0], key), false);
  }

  // Negative: a credit, refused by name, on the accumulation set's own ground.
  for (const [key, value] of [
    ['statedPensionAdministrationFeePerYear', -1],
    ['statedPensionAdministrationFeeRate', -0.001],
    ['statedPensionAdministrationFeeCapPerYear', -1],
  ]) {
    assert.throws(() => parsePlan(withFees({ statedPensionAdministrationFeeRate: 0.0016, [key]: value })), PlanFileHouseholdError, `${key} was accepted`);
  }

  // **A PENSION CAP WITH NO PENSION RATE TO CAP IS REFUSED BY NAME** — `statedAdministrationFeeCapPerYear`'s
  // own door ruling, mirrored: this build does not guess whether the rate was left off by accident or
  // the pension charges no percentage fee at all.
  assert.throws(() => parsePlan(withFees({ statedPensionAdministrationFeeCapPerYear: 130_000 })), PlanFileHouseholdError);
  const capAlone = (() => {
    try { parsePlan(withFees({ statedPensionAdministrationFeeCapPerYear: 130_000 })); } catch (error) { return error.message; }
    return '';
  })();
  assert.match(capAlone, /superInterests\[0\]\.statedPensionAdministrationFeeCapPerYear/);
  assert.match(capAlone, /statedPensionAdministrationFeeRate/, 'the refusal does not name what is missing');

  // The accumulation set's own cap-needs-rate refusal is untouched by any of this — the two pairs
  // are checked independently.
  assert.throws(() => parsePlan(withFees({ statedAdministrationFeeCapPerYear: 75_000 })), PlanFileHouseholdError);
});
