// P4-1 chunk 4 — the Income Waterfall, the spending target, and the balances.
//
// **The failure this file is written against is specific to an ORDERED waterfall**: a fixture in
// which the order does not matter. If only one limb has money, or the target is met by the first
// limb, or the total comes out the same whichever way round you draw, then the Waterfall is untested
// no matter how many assertions are written. So §1 below draws the SAME four funded limbs against
// FIVE different targets, chosen so that a different limb is the marginal one each time — and each
// of the four adjacent swaps, plus the full reversal, is written out as the DOLLAR FIGURE it would
// produce and asserted against.
//
// Five things are defended and nothing else:
//
//   1. the ORDER — salary → the pension's minimum still owed → cash not offsetting the loan →
//      Non-Super Portfolio → the pension above its minimum → cash offsetting the loan → released
//      super (2026-09-23) — on dollar figures that distinguish it from every adjacent transposition;
//   2. the twelfths decision `SpendChangeParams.annualSpend` asks for by name, including the exact
//      bound on what twelve of them sum to and the direction the residual runs;
//   3. `ONE_OFF_EXPENSE` charged in its own month, once, never replayed;
//   4. the SHORTFALL — a fixture that falls short, a fixture that is met exactly, and the one-cent
//      boundary between them, because an exactly-met fixture tests nothing about shortfall;
//   5. the reconciliation `Month` exists to support — `closingBalance = openingBalance + Σinflow −
//      Σoutflow`, every month of every fixture — and P4-1a re-earned over a hand-worked CASHFLOW
//      figure, so an empty or line-less walk cannot pass it vacuously.
//
// Every cashflow figure is HAND-WORKED and written out long.
import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { toCents } from '../dist/core/money.js';
import {
  SHORTFALL_LINE,
  NO_STATING_ENTRY,
  UNLEGISLATED,
  statedBy,
  WATERFALL_LIMBS,
  drawWaterfall,
  monthlySpendFromAnnual,
  project,
  unfundedMiddleLimbs,
} from '../dist/core/projection.js';
import { taxYear } from '../dist/data/assumptions/index.js';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

// --- 1. THE ORDER, on dollar figures ---------------------------------------------------------------

/**
 * **Seven limbs, all funded, all with DIFFERENT capacities.** $2,000 / $1,500 / $800 / $3,000 /
 * $4,000 / $10,000 / $7,000 — $28,300 in total, and no two the same, so a draw reported against the
 * wrong limb is a different number and not a relabelling.
 *
 * Seven since 2026-09-23 ("spend cash first"): the pension split at what is still owed of its
 * minimum, and the running cash split at what is owed on the home loan.
 */
const SEVEN_FUNDED = {
  salary: { available: toCents(2_000), note: 'wages' },
  accountBasedPensionMinimum: { available: toCents(1_500), note: 'the minimum still owed' },
  cashAboveLoan: { available: toCents(800), note: 'cash above the loan' },
  nonSuperPortfolio: { available: toCents(3_000), note: 'ETFs' },
  accountBasedPensionAboveMinimum: { available: toCents(4_000), note: 'the pension above its minimum' },
  offsetAccount: { available: toCents(10_000), note: 'cash offsetting the loan' },
  releasedSuperannuation: { available: toCents(7_000), note: 'released super' },
};

const [SALARY, ABP_MIN, CASH_ABOVE, PORTFOLIO, ABP_ABOVE, OFFSET, RELEASED] = WATERFALL_LIMBS;

/**
 * **Run the Waterfall with the SAME seven sources drawn in `order`, and report what each SOURCE paid.**
 * Keyed by source rather than by position, so a transposition shows up as money taken from a
 * different account — which is what a wrong order means to the Household.
 */
const paidBy = (target, order = [...WATERFALL_LIMBS]) => {
  const sources = Object.fromEntries(WATERFALL_LIMBS.map((limb, i) => [limb, SEVEN_FUNDED[order[i]]]));
  const draws = drawWaterfall(toCents(target), sources).draws;
  return Object.fromEntries(order.map((source, i) => [source, draws[i].drawn]));
};

/** `WATERFALL_LIMBS` with the limbs at positions `i` and `i + 1` swapped — the wrong waterfall. */
const swapped = (i) => {
  const order = [...WATERFALL_LIMBS];
  [order[i], order[i + 1]] = [order[i + 1], order[i]];
  return order;
};

/** Every source at nil, then the named ones at their draws. */
const only = (paid) => ({ ...Object.fromEntries(WATERFALL_LIMBS.map((limb) => [limb, 0])), ...paid });

test('THE ORDER — each adjacent transposition changes a DOLLAR FIGURE, and here is which one', () => {
  // The rule that makes this testable at all: a transposition of limbs k and k+1 is invisible unless
  // limb k is PARTIALLY drawn, because two limbs that are both drawn to exhaustion are drawn to
  // exhaustion in either order. So one target cannot discriminate every swap, and one is chosen per
  // swap, each making a different limb the marginal one. Running totals of the capacities:
  //   salary $2,000 · +minimum $3,500 · +cash above $4,300 · +portfolio $7,300 · +pension above
  //   $11,300 · +offsetting cash $21,300 · +released super $28,300.

  // (i) $1,200 — inside salary. Swap 1↔2 pays it from the pension's minimum instead.
  assert.deepEqual(paidBy(1_200), only({ [SALARY]: toCents(1_200) }));
  assert.deepEqual(paidBy(1_200, swapped(0)), only({ [ABP_MIN]: toCents(1_200) }));

  // (ii) $3,000 — salary $2,000, then the minimum still owed is marginal at $1,000. Swap 2↔3 spends
  //      all $800 of the cash above the loan first and only $200 of the minimum.
  assert.deepEqual(paidBy(3_000), only({ [SALARY]: toCents(2_000), [ABP_MIN]: toCents(1_000) }));
  assert.deepEqual(paidBy(3_000, swapped(1)), only({ [SALARY]: toCents(2_000), [CASH_ABOVE]: toCents(800), [ABP_MIN]: toCents(200) }));

  // (iii) $4,000 — $3,500 from salary and the minimum, then CASH ABOVE THE LOAN is marginal at $500
  //       and no investment is sold. Swap 3↔4 (cash after the portfolio, the order before
  //       2026-09-23) sells $500 of investments and leaves the cash untouched.
  assert.deepEqual(paidBy(4_000), only({ [SALARY]: toCents(2_000), [ABP_MIN]: toCents(1_500), [CASH_ABOVE]: toCents(500) }));
  assert.deepEqual(paidBy(4_000, swapped(2)), only({ [SALARY]: toCents(2_000), [ABP_MIN]: toCents(1_500), [PORTFOLIO]: toCents(500) }));

  // (iv) $6,000 — $4,300 from the first three, then the PORTFOLIO is marginal at $1,700. Swap 4↔5
  //      takes the $1,700 from the pension above its minimum instead.
  assert.deepEqual(paidBy(6_000), only({ [SALARY]: toCents(2_000), [ABP_MIN]: toCents(1_500), [CASH_ABOVE]: toCents(800), [PORTFOLIO]: toCents(1_700) }));
  assert.deepEqual(paidBy(6_000, swapped(3)), only({ [SALARY]: toCents(2_000), [ABP_MIN]: toCents(1_500), [CASH_ABOVE]: toCents(800), [ABP_ABOVE]: toCents(1_700) }));

  // (v) $9,000 — $7,300 from the first four, then the PENSION ABOVE ITS MINIMUM is marginal at $1,700
  //     and the cash offsetting the loan is untouched: §5.12's whole point, the most expensive dollar
  //     in the Household is still in the offset at the end of the month. Swap 5↔6 spends it.
  assert.deepEqual(paidBy(9_000), only({ [SALARY]: toCents(2_000), [ABP_MIN]: toCents(1_500), [CASH_ABOVE]: toCents(800), [PORTFOLIO]: toCents(3_000), [ABP_ABOVE]: toCents(1_700) }));
  assert.deepEqual(paidBy(9_000, swapped(4)), only({ [SALARY]: toCents(2_000), [ABP_MIN]: toCents(1_500), [CASH_ABOVE]: toCents(800), [PORTFOLIO]: toCents(3_000), [OFFSET]: toCents(1_700) }));

  // (vi) $15,000 — $11,300 from the first five, then the OFFSETTING CASH is marginal at $3,700. Swap
  //      6↔7 drains released super first and leaves the offset whole (the 2026-09-19 position).
  const fiveSpent = { [SALARY]: toCents(2_000), [ABP_MIN]: toCents(1_500), [CASH_ABOVE]: toCents(800), [PORTFOLIO]: toCents(3_000), [ABP_ABOVE]: toCents(4_000) };
  assert.deepEqual(paidBy(15_000), only({ ...fiveSpent, [OFFSET]: toCents(3_700) }));
  assert.deepEqual(paidBy(15_000, swapped(5)), only({ ...fiveSpent, [RELEASED]: toCents(3_700) }));

  // (vii) $24,000 — everything above released super exhausts at $21,300, so it is marginal at $2,700.
  assert.deepEqual(paidBy(24_000), only({ ...fiveSpent, [OFFSET]: toCents(10_000), [RELEASED]: toCents(2_700) }));

  // (viii) THE ORDER BEFORE 2026-09-23, restored: the whole pension, then the portfolio, then ALL the
  //        cash. At $6,000 it spends $2,500 of the pension above its minimum and leaves the $800 of
  //        cash earning only the cash rate — the pile-up the ruling closed.
  assert.deepEqual(
    paidBy(6_000, [SALARY, ABP_MIN, ABP_ABOVE, PORTFOLIO, CASH_ABOVE, OFFSET, RELEASED]),
    only({ [SALARY]: toCents(2_000), [ABP_MIN]: toCents(1_500), [ABP_ABOVE]: toCents(2_500) }),
  );

  // (ix) The ORDER is the array, and the array is the order. A test that read the order from the same
  //      place the code does would be circular, so it is spelled out here, once, in full.
  assert.deepEqual(
    [...WATERFALL_LIMBS],
    [
      'salary',
      'accountBasedPensionMinimum',
      'cashAboveLoan',
      'nonSuperPortfolio',
      'accountBasedPensionAboveMinimum',
      'offsetAccount',
      'releasedSuperannuation',
    ],
  );
  assert.deepEqual(drawWaterfall(toCents(6_000), SEVEN_FUNDED).draws.map((d) => d.limb), [...WATERFALL_LIMBS]);
});

test('THE ORDER — every limb is reported even when it drew nothing, with the reason it drew nothing', () => {
  // ADR-0009: "no waterfall step that fires on zero". An empty limb is not a special case, it is the
  // same arithmetic, and it still appears in the result — because a limb that vanished when empty is
  // a limb the next author never finds.
  const result = drawWaterfall(toCents(1_200), SEVEN_FUNDED);
  assert.equal(result.draws.length, 7);
  assert.deepEqual(result.draws.map((d) => d.available), WATERFALL_LIMBS.map((limb) => SEVEN_FUNDED[limb].available));
  assert.deepEqual(result.draws.map((d) => d.note), [
    'wages',
    'the minimum still owed',
    'cash above the loan',
    'ETFs',
    'the pension above its minimum',
    'cash offsetting the loan',
    'released super',
  ]);

  // A wholly empty Waterfall still reports every limb and a full shortfall — not an empty list.
  const empty = Object.fromEntries(WATERFALL_LIMBS.map((limb) => [limb, { available: toCents(0), note: 'nil' }]));
  const nothing = drawWaterfall(toCents(900), empty);
  assert.equal(nothing.draws.length, 7);
  assert.deepEqual(nothing.draws.map((d) => d.drawn), [0, 0, 0, 0, 0, 0, 0]);
  assert.equal(nothing.shortfall, toCents(900));
  // And drawing nil from nil is arithmetically identical to a Household that has no limbs at all:
  // ADR-0009's "projects exactly as it did before" is a property of the numbers, not of a branch.
  assert.equal(drawWaterfall(toCents(0), empty).shortfall, toCents(0));
  assert.equal(drawWaterfall(toCents(0), SEVEN_FUNDED).funded, toCents(0));
  assert.deepEqual(drawWaterfall(toCents(0), SEVEN_FUNDED).draws.map((d) => d.drawn), [0, 0, 0, 0, 0, 0, 0]);
});

test('THE SHORTFALL — falls short, is met exactly, and the ONE CENT between the two', () => {
  // An exactly-met fixture tests nothing about shortfall and a short one tests nothing about the
  // met case, so all three are here and the boundary is a cent wide.
  //   available in total: $2,000 + $1,500 + $800 + $3,000 + $4,000 + $10,000 + $7,000 = $28,300.00
  const exact = drawWaterfall(toCents(28_300), SEVEN_FUNDED);
  assert.equal(exact.funded, toCents(28_300));
  assert.equal(exact.shortfall, toCents(0));
  assert.deepEqual(exact.draws.map((d) => d.drawn), WATERFALL_LIMBS.map((limb) => SEVEN_FUNDED[limb].available));

  const byACent = drawWaterfall(toCents(28_300.01), SEVEN_FUNDED);
  assert.equal(byACent.funded, toCents(28_300));
  assert.equal(byACent.shortfall, 1);

  const short = drawWaterfall(toCents(30_000), SEVEN_FUNDED);
  assert.equal(short.funded, toCents(28_300));
  assert.equal(short.shortfall, toCents(1_700));
  // `funded + shortfall = target`, always. The identity a "never record a shortfall" mutation breaks.
  for (const target of [0, 1_200, 3_000, 4_000, 6_000, 9_000, 15_000, 24_000, 28_300, 30_000]) {
    const r = drawWaterfall(toCents(target), SEVEN_FUNDED);
    assert.equal(r.funded + r.shortfall, toCents(target), `${target} does not reconcile`);
    assert.equal(r.draws.reduce((t, d) => t + d.drawn, 0), r.funded, `${target}: the draws do not sum to funded`);
  }
});

test('the Waterfall refuses a target or a capacity that is not a whole non-negative number of cents', () => {
  assert.throws(() => drawWaterfall(-1, SEVEN_FUNDED), /not a spending target in whole cents/);
  assert.throws(() => drawWaterfall(1.5, SEVEN_FUNDED), /not a spending target in whole cents/);
  assert.throws(
    () => drawWaterfall(toCents(100), { ...SEVEN_FUNDED, nonSuperPortfolio: { available: -5, note: 'x' } }),
    /nonSuperPortfolio limb offered -5/,
  );
});

// --- 2. The twelfths decision -----------------------------------------------------------------------

test('THE TWELFTHS DECISION — round UP, and twelve of them are between 0 and 11 cents OVER the year', () => {
  // The decision `SpendChangeParams.annualSpend` asks for by name, in one place, with this test.
  //   $60,000.00 divides exactly                       → $5,000.00, and twelve are $60,000.00
  assert.equal(monthlySpendFromAnnual(toCents(60_000)), toCents(5_000));
  assert.equal(12 * monthlySpendFromAnnual(toCents(60_000)), toCents(60_000));
  //   $60,000.01 is the worst case: 6,000,001 ÷ 12 = 500,000.0833… → 500,001, and twelve are
  //   6,000,012 — ELEVEN cents more than the year. The residual runs AGAINST the household.
  assert.equal(monthlySpendFromAnnual(toCents(60_000.01)), toCents(5_000.01));
  assert.equal(12 * monthlySpendFromAnnual(toCents(60_000.01)) - toCents(60_000.01), 11);
  //   …and half-away-from-zero would have given 500,000 here, i.e. twelve months summing to ELEVEN
  //   CENTS LESS than the household said it spends. That is the direction this rounding refuses.
  assert.notEqual(monthlySpendFromAnnual(toCents(60_000.01)), toCents(5_000));

  // The bound, swept rather than sampled: every remainder class 0..11, at two magnitudes.
  for (const base of [toCents(60_000), toCents(123_456)]) {
    for (let extra = 0; extra < 24; extra += 1) {
      const annual = base + extra;
      const residual = 12 * monthlySpendFromAnnual(annual) - annual;
      assert.ok(residual >= 0, `${annual} is UNDER-spent by ${-residual} — the flattering direction`);
      assert.ok(residual <= 11, `${annual} is over-spent by ${residual}`);
      assert.equal(Number.isInteger(monthlySpendFromAnnual(annual)), true);
    }
  }
  // A dividing-by-13 mutation is a different number at every magnitude, not merely at one.
  assert.notEqual(monthlySpendFromAnnual(toCents(60_000)), Math.ceil(toCents(60_000) / 13));
  assert.equal(monthlySpendFromAnnual(toCents(0)), toCents(0));
  assert.throws(() => monthlySpendFromAnnual(-100), /not a spending level in whole cents/);
});

// --- 3. The fixture the walk is hand-worked on --------------------------------------------------------

/**
 * **Sam: one Person, 47, one salary, one spending level, and nothing else.**
 *
 * $3,000 a fortnight = $78,000 a year; the monthly salary is $6,500.00. She is 47, so there is no Age
 * Pension, no SAPTO and no seniors Medicare threshold in any figure here — this fixture is about the
 * CASHFLOW and about nothing else.
 *
 * The walk is 2026-07 → 2028-06: **exactly two financial years, both of which the register carries
 * tax parameters for**, so the flattering post-FY2027-28 residual is deliberately outside it and is
 * exercised in its own test below instead of contaminating these figures.
 *
 * THE MONTHLY TAX, hand-worked (and identical to `core-projection-tax.test.mjs`'s Rae, who has the
 * same salary — the Medicare family threshold does not bind at $77,000, so single and couple agree):
 *   FY2026-27  taxable $78,000 − $1,000 = $77,000; tax $4,020 + $9,600 = $13,620; LITO nil; WATO does
 *              not exist; Medicare 2% × $77,000 = $1,540 → $15,160 ÷ 12 = $1,263.33
 *   FY2027-28  the lowest rate falls to 14% → $3,752 + $9,600 = $13,352; WATO $250; Medicare $1,540
 *              → $14,642 ÷ 12 = $1,220.1666… = $1,220.17
 */
const SAM = {
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
  ],
  homeStatus: 'occupied',
};

// ⚠️ **`cpi: 0` FROM 2026-09-21, AND IT IS THE ALGEBRAIC CONTROL RATHER THAN A SPECIAL CASE**
// (register O85). The stated spending level is a REAL figure now and the walk raises it to each
// month's price level, so at any positive CPI every hand-worked twelfth below would be a different
// figure in every month and the five ordering fixtures this file exists for would be arithmetic
// about `(1 + cpi) ^ (n / 12)` rather than about the Waterfall. At `cpi: 0` the factor is exactly 1
// in every month (`priceLevel.ts`), so every figure in §§1-5 is the figure it was hand-worked as,
// unchanged to the cent — the same move `test/app-todays-dollars.test.mjs` makes for the
// Contingency Floor under P4-14. **The indexation itself is asserted in §6, on its own fixture, at a
// live CPI.**
const SETTINGS = {
  asAtDate: '2026-07-01',
  planningHorizonAge: 49, // Sam's 49th birthday is 2028-06-15, so the last month is 2028-06.
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

/** $60,000.01 a year — the worst-case twelfth, so the rounding decision is inside every figure below. */
const SPEND = entry('sc', 'SPEND_CHANGE', '2026-07-01', { annualSpend: toCents(60_000.01) });

const monthAt = (months, isoMonth) => months.find((m) => m.month === isoMonth);
const amountOf = (month, description) =>
  month.lines.filter((l) => l.description === description).map((l) => l.amount);

// The identity `Month` exists to support, applied to one month.
const reconciles = (month) =>
  month.lines.reduce((b, l) => b + (l.effect !== 'cash' ? 0 : l.direction === 'inflow' ? l.amount : -l.amount), month.openingBalance) ===
  month.closingBalance;

test('HAND-WORKED — one month of cashflow, and the balance it leaves behind', () => {
  const months = project(SETTINGS, SAM, [SPEND]);
  assert.equal(months.length, 24);
  assert.equal(months[0].month, '2026-07');
  assert.equal(months.at(-1).month, '2028-06');

  //   salary          +$6,500.00
  //   income tax      −$1,263.33
  //   spending        −$5,000.01     ($60,000.01 ÷ 12, rounded UP)
  //   ───────────────────────────
  //   net              +$236.66      and the opening balance is nil, so the month closes at $236.66
  // The first three are `effect: 'cash'` (P4-4). **The fourth is not, and that is the whole of what
  // P6-8 brief 3 chunk 2b adds to this month:** Sam's employer pays 12% of her $78,000 into
  // superannuation — $780.00 a month, less the fund's 15%, is $663.00 — and the Household never
  // holds a cent of it. It is `'wealth'`, so it is NOT in the arithmetic above, NOT in
  // `closingBalance`, and no limb of the Waterfall can reach it. Every cash figure in this test is
  // to the cent what it was before the Guarantee was credited, which is the proof stated as a
  // fixture rather than as a claim.
  // The income tax line's record is dropped from this pin (P5-3 limb 2) — it carries the year's
  // Medicare-threshold caveats, which are not what a cashflow assertion is about — and the two lines
  // that carry NOTHING legislated are pinned with their records, because that is the whole of theirs.
  assert.deepEqual(months[0].lines.map(({ provenance, attribution, ...line }) => line), [
    { direction: 'inflow', effect: 'cash', description: 'Salary, Sam', amount: 650_000 },
    { direction: 'outflow', effect: 'cash', description: 'Income tax, Sam', amount: 126_333 },
    { direction: 'outflow', effect: 'cash', description: 'Household spending', amount: 500_001 },
    { direction: 'inflow', effect: 'wealth', description: 'Superannuation Guarantee into superannuation, Sam — Superannuation, Accumulation Phase', amount: 66_300 },
  ]);
  assert.deepEqual(months[0].lines.map((l) => l.provenance), [
    UNLEGISLATED.salary,
    months[0].lines[1].provenance,
    UNLEGISLATED.spending,
    months[0].lines[3].provenance,
  ]);
  assert.equal(months[0].lines[3].provenance.register, 'superannuation contributions tax');
  assert.equal(months[0].lines[1].provenance.register, 'income tax');
  // **AND WHICH ENTRY PRODUCED EACH — P5-3's line → entry attribution.** One entry is in this walk
  // and it accounts for exactly one of the three lines. Sam's pay is `employmentIncomePerFortnight`
  // and no entry in this model can state a salary, so the salary line and the tax assessed on it say
  // `'none'` and say it in their own words; the spending line names `sc`. The month's
  // `appliedEntryIds` says `['sc']` and could not have told a reader which row it set.
  assert.deepEqual(months[0].lines.map((l) => l.attribution), [
    NO_STATING_ENTRY.salary,
    NO_STATING_ENTRY.incomeTax,
    statedBy('sc'),
    NO_STATING_ENTRY.superannuationGuarantee,
  ]);
  assert.deepEqual([...months[0].appliedEntryIds], ['sc']);
  assert.deepEqual([...months[0].provenance.registers], ['income tax', 'superannuation contributions tax']);
  assert.equal(months[0].openingBalance, toCents(0));
  assert.equal(months[0].closingBalance, toCents(236.66));
  // The surplus stays in the Offset Account, which is this balance, and is available to the LAST
  // limb of next month's Waterfall — which is the only sense in which the offset is modelled today.
  assert.equal(monthAt(months, '2026-08').openingBalance, toCents(236.66));
  assert.equal(monthAt(months, '2026-08').closingBalance, toCents(473.32));

  // TWELVE of those months — the whole of FY2026-27 — is 12 × $236.66 = $2,839.92.
  assert.equal(monthAt(months, '2027-06').closingBalance, toCents(2_839.92));

  // FY2027-28: the tax falls to $1,220.17, so the net rises to $279.82 a month. Twelve more:
  //   $2,839.92 + 12 × $279.82 = $2,839.92 + $3,357.84 = $6,197.76
  assert.equal(monthAt(months, '2027-07').openingBalance, toCents(2_839.92));
  assert.deepEqual(amountOf(monthAt(months, '2027-07'), 'Income tax, Sam'), [122_017]);
  assert.equal(monthAt(months, '2027-07').closingBalance, toCents(3_119.74));
  assert.equal(monthAt(months, '2028-06').closingBalance, toCents(6_197.76));

  // No month of this fixture falls short: the salary covers the spending every time.
  assert.deepEqual(months.flatMap((m) => amountOf(m, SHORTFALL_LINE)), []);
});

test('THE RECONCILIATION — closingBalance is openingBalance plus the lines, every month, and it CHAINS', () => {
  // The assertion `Month.closingBalance` exists for. It is not derived at display time (`plan.ts`:
  // "a month that reported only a closing balance would make the tool a black box"), so it can be,
  // and here is, checked against the itemisation it claims to summarise.
  const fixtures = [
    project(SETTINGS, SAM, [SPEND]),
    project(SETTINGS, SAM, [SPEND, entry('oo', 'ONE_OFF_EXPENSE', '2027-03-10', { amount: toCents(30_000) })]),
    project(SETTINGS, SAM, []),
  ];
  let checked = 0;
  for (const months of fixtures) {
    let previous = toCents(0);
    for (const month of months) {
      assert.ok(reconciles(month), `${month.month} does not reconcile`);
      assert.equal(month.openingBalance, previous, `${month.month} does not open where the last month closed`);
      assert.ok(month.closingBalance >= 0, `${month.month} closed negative — a shortfall was not recorded`);
      previous = month.closingBalance;
      checked += 1;
    }
    assert.equal(months[0].openingBalance, toCents(0));
  }
  // Not vacuous: the balance really moved, and real lines really were reconciled.
  assert.equal(checked, 72);
  assert.ok(fixtures[0].at(-1).closingBalance > 0);
  assert.ok(fixtures[0].flatMap((m) => m.lines).length > 60);
});

// --- 4. ONE_OFF_EXPENSE, the shortfall, and the boundary between met and short -------------------------

test('HAND-WORKED — a ONE_OFF_EXPENSE empties the offset, records a SHORTFALL, and the walk recovers', () => {
  const months = project(SETTINGS, SAM, [
    SPEND,
    entry('oo', 'ONE_OFF_EXPENSE', '2027-03-10', { amount: toCents(30_000) }),
  ]);

  // By the end of 2027-02 the household has banked eight months of $236.66 = $1,893.28.
  assert.equal(monthAt(months, '2027-02').closingBalance, toCents(1_893.28));

  // 2027-03 — the Waterfall in full:
  //   TARGET      $5,000.01 spending + $30,000.00 one-off      = $35,000.01
  //   limb 1 salary          $6,500.00 − $1,263.33 tax         =  $5,236.67
  //   limb 2 ABP minimum     no Account-Based Pension          =      nil
  //   limb 3 portfolio       no Non-Super Portfolio            =      nil
  //   limb 4 offset          the opening balance               =  $1,893.28
  //   FUNDED                 $5,236.67 + $1,893.28             =  $7,129.95
  //   SHORTFALL              $35,000.01 − $7,129.95            = $27,870.06
  const march = monthAt(months, '2027-03');
  assert.deepEqual(amountOf(march, 'One-off expense'), [3_000_000]);
  assert.deepEqual(amountOf(march, 'Household spending'), [500_001]);
  assert.deepEqual(amountOf(march, SHORTFALL_LINE), [2_787_006]);
  assert.equal(march.openingBalance, toCents(1_893.28));
  // The offset is emptied and the balance FLOORS at nil rather than going to −$27,870.06: this model
  // has no borrowing facility, so the debt is a named line and never a negative balance.
  assert.equal(march.closingBalance, toCents(0));
  assert.ok(reconciles(march));
  // **P4-4 — the month cites the one-off AND the standing spending level that decided the $5,000.01.**
  // Before P4-4 this array was `['oo']` alone: `sc` is dated 2026-07-01, so it appeared in month 0
  // and in no other, and March 2027's spending line had no traceable cause in its own `Month`. The
  // widening is an APPEND — the month's own entry keeps its place at the front.
  assert.deepEqual(march.appliedEntryIds, ['oo', 'sc']);

  // CHARGED ONCE. Not in the month before, not in the month after, not for the remaining 15 months.
  assert.deepEqual(months.flatMap((m) => amountOf(m, 'One-off expense')), [3_000_000]);
  assert.deepEqual(months.filter((m) => amountOf(m, SHORTFALL_LINE).length > 0).map((m) => m.month), ['2027-03']);
  // And the walk recovers from nil the very next month: $236.66 again, not $1,893.28 + $236.66.
  assert.equal(monthAt(months, '2027-04').openingBalance, toCents(0));
  assert.equal(monthAt(months, '2027-04').closingBalance, toCents(236.66));

  // A ONE_OFF_EXPENSE dated BEFORE the walk was already paid (chunk 2b: it is an `event`), so it is
  // charged NOWHERE and the whole walk is byte-identical to one without it.
  const past = project(SETTINGS, SAM, [SPEND, entry('old', 'ONE_OFF_EXPENSE', '2020-03-01', { amount: toCents(45_000) })]);
  assert.equal(JSON.stringify(past), JSON.stringify(project(SETTINGS, SAM, [SPEND])));
});

test('THE SHORTFALL BOUNDARY — exactly met records nothing; one cent more records one cent', () => {
  // An exactly-met month tests nothing about shortfall, so both sides of the boundary are here, a
  // cent apart, on the same month of the same fixture.
  //   available in 2027-03: $1,893.28 opening + $5,236.67 net income = $7,129.95
  //   less the $5,000.01 spending level leaves $2,129.94 for a one-off to consume EXACTLY.
  const met = monthAt(
    project(SETTINGS, SAM, [SPEND, entry('oo', 'ONE_OFF_EXPENSE', '2027-03-10', { amount: toCents(2_129.94) })]),
    '2027-03',
  );
  assert.deepEqual(amountOf(met, SHORTFALL_LINE), []);
  assert.equal(met.closingBalance, toCents(0));
  assert.ok(reconciles(met));

  const overByACent = monthAt(
    project(SETTINGS, SAM, [SPEND, entry('oo', 'ONE_OFF_EXPENSE', '2027-03-10', { amount: toCents(2_129.95) })]),
    '2027-03',
  );
  assert.deepEqual(amountOf(overByACent, SHORTFALL_LINE), [1]);
  assert.equal(overByACent.closingBalance, toCents(0));
  assert.ok(reconciles(overByACent));

  // A cent UNDER leaves a cent in the offset and still records nothing.
  const underByACent = monthAt(
    project(SETTINGS, SAM, [SPEND, entry('oo', 'ONE_OFF_EXPENSE', '2027-03-10', { amount: toCents(2_129.93) })]),
    '2027-03',
  );
  assert.deepEqual(amountOf(underByACent, SHORTFALL_LINE), []);
  assert.equal(underByACent.closingBalance, 1);
});

test('the spending lines are what the Household NEEDED, never what it could AFFORD', () => {
  // **The mutation this exists for**: emitting the spending line at `min(need, funded)` instead of at
  // the need. It reconciles just as neatly, it never shows a shortfall bigger than the bill, and it
  // answers "does the money last?" with "yes, always" — which is the one answer this tool must never
  // be able to give. So: the same Sam, with NO salary at all, and a spending level she cannot fund.
  const brokeSam = { ...SAM, persons: [{ ...SAM.persons[0], employmentIncomePerFortnight: toCents(0) }] };
  const months = project(SETTINGS, brokeSam, [
    SPEND,
    entry('oo', 'ONE_OFF_EXPENSE', '2027-03-10', { amount: toCents(30_000) }),
  ]);
  // Month 0: nothing comes in and nothing is in the offset, so the whole $5,000.01 is unfunded — and
  // the spending line is still $5,000.01, not nil and not "what was left".
  assert.deepEqual(amountOf(months[0], 'Household spending'), [500_001]);
  assert.deepEqual(amountOf(months[0], SHORTFALL_LINE), [500_001]);
  assert.equal(months[0].closingBalance, toCents(0));
  assert.ok(reconciles(months[0]));

  // And the one-off month bills the full $30,000.00 on top, unfunded to the cent.
  const march = monthAt(months, '2027-03');
  assert.deepEqual(amountOf(march, 'One-off expense'), [3_000_000]);
  assert.deepEqual(amountOf(march, 'Household spending'), [500_001]);
  assert.deepEqual(amountOf(march, SHORTFALL_LINE), [3_500_001]);

  // Every one of the 24 months falls short, by exactly the bill, and the balance never moves off nil.
  assert.equal(months.filter((m) => amountOf(m, SHORTFALL_LINE).length === 1).length, 24);
  assert.deepEqual([...new Set(months.map((m) => m.closingBalance))], [toCents(0)]);
  // No salary line either — this fixture is honestly income-less rather than merely poor.
  assert.deepEqual(months.flatMap((m) => amountOf(m, 'Salary, Sam')), []);
});

test('the SPENDING LEVEL is a level: it stands until superseded, and no SPEND_CHANGE means no line', () => {
  // No `SPEND_CHANGE` at all is not a spending level of zero — it is a Household nobody asked, and
  // the month carries no spending line rather than a line for nothing. This is what keeps every
  // fixture written before chunk 4 projecting exactly as it did.
  const silent = project(SETTINGS, SAM, []);
  assert.deepEqual(silent.flatMap((m) => amountOf(m, 'Household spending')), []);
  assert.equal(silent[0].closingBalance, 650_000 - 126_333);

  // A level stated mid-walk applies from its own month and then HOLDS — not one month, not a delta.
  const later = project(SETTINGS, SAM, [SPEND, entry('sc2', 'SPEND_CHANGE', '2027-01-20', { annualSpend: toCents(36_000) })]);
  assert.deepEqual(amountOf(monthAt(later, '2026-12'), 'Household spending'), [500_001]);
  assert.deepEqual(amountOf(monthAt(later, '2027-01'), 'Household spending'), [toCents(3_000)]);
  assert.deepEqual(amountOf(monthAt(later, '2028-06'), 'Household spending'), [toCents(3_000)]);
});

// --- 5. The two limbs that draw nothing, and WHY ------------------------------------------------------

test('the two middle limbs say WHICH nothing they are — and both of them now draw', () => {
  // The seam this chunk is mostly here to leave. A nil with no reason cannot tell "this Household
  // has none" from "this limb is not built", and those are different facts with different fixes.
  const none = unfundedMiddleLimbs(SAM);
  assert.equal(none.accountBasedPensionMinimum.available, toCents(0));
  assert.equal(none.accountBasedPensionMinimum.note, 'no Account-Based Pension in this Household');
  assert.equal(none.nonSuperPortfolio.available, toCents(0));
  assert.equal(none.nonSuperPortfolio.note.startsWith('no Non-Super Portfolio in this Household:'), true);

  // A Household that DOES hold both gets the other note — and still nil, which is the finding.
  const funded = {
    ...SAM,
    persons: [
      {
        ...SAM.persons[0],
        // The nil accumulation interest is kept beside the pension: Sam is paid a wage, and since
        // P6-8 brief 3 chunk 2b her employer's Guarantee has to land in an account that can receive
        // it. A retirement-phase interest cannot, which is the whole reason the pair is here.
        superInterests: [{ phase: 'accountBasedPension', balance: toCents(800_000) }, { phase: 'accumulation', balance: toCents(0) }],
        parcels: [{ acquired: '2019-02-14', costBase: toCents(120_000), marketValue: toCents(250_000) }],
      },
    ],
  };
  // ⚠️ **LIMB 3's NOTE CHANGED AT P3-21f CHUNK 6, and this assertion changed with it.** It used to
  // read `/CGT disposal on a per-parcel cost base/`, which was the refusal this limb carried for the
  // whole of the build; chunks 1 to 6 discharged every clause of it and limb 3 now draws. What is
  // left of the nil is a Household that holds no parcels — so a FUNDED one reaching it is a stated
  // BUG rather than a finding, and `test/core-non-super-limb-3.test.mjs` owns the funded half.
  const held = unfundedMiddleLimbs(funded);
  assert.equal(held.nonSuperPortfolio.available, toCents(0));
  assert.match(held.nonSuperPortfolio.note, /this note is a BUG and not a fact/);

  // **LIMB 2's NOTE CHANGED ON 2026-09-17 and this assertion changed with it.** It used to read
  // `/nowhere for the balance to fall/`, which was chunk 5a's finding and is now false: P4-1 chunk
  // 5b draws the SIS Reg Sch 7 minimum and the balance falls. What is left of the nil is the
  // Household that states no commencement day — this one — and it refuses to guess rather than
  // inventing 1 July. `test/core-projection-pension-drawdown.test.mjs` owns the funded half.
  assert.equal(held.accountBasedPensionMinimum.available, toCents(0));
  assert.match(held.accountBasedPensionMinimum.note, /no commencement day is stated/);
  assert.match(held.accountBasedPensionMinimum.note, /will not guess one/);

  // An ACCUMULATION interest is not an Account-Based Pension, so it gets the "none held" note: the
  // limb reads `phase`, which is the field the whole means test turns on, and not `superInterests`
  // being non-empty.
  const accumulation = {
    ...SAM,
    persons: [{ ...SAM.persons[0], superInterests: [{ phase: 'accumulation', balance: toCents(800_000) }] }],
  };
  assert.equal(unfundedMiddleLimbs(accumulation).accountBasedPensionMinimum.note, 'no Account-Based Pension in this Household');

  // **THE DIRECTION, STILL ASSERTED AS A DOLLAR, AND NOW ONLY FOR THE SILENT HOUSEHOLD.** A
  // Household holding $800,000 in an Account-Based Pension it has stated no commencement day for,
  // and $250,000 in ETFs, projects EXACTLY as one holding neither: its income is under-stated by the
  // whole Sch 7 minimum and its Shortfall Age is too EARLY. Safe direction, and not silent.
  assert.equal(
    JSON.stringify(project(SETTINGS, funded, [SPEND]).map((m) => m.closingBalance)),
    JSON.stringify(project(SETTINGS, SAM, [SPEND]).map((m) => m.closingBalance)),
  );

  // **AND THE OTHER BRANCH, WHICH IS THE POINT OF CHUNK 5B: state the day and the walk DIVERGES.**
  // The same Household, the same entries, one extra field — and the pension balance now falls. If
  // limb 2 ever stopped drawing, this assertion is what goes red.
  // Sam's wage covers her spending every month, so even a FUNDED limb 2 would draw nothing from her
  // — which is itself chunk 5b's declared flattering residual, and it is why the pair below drops
  // the wage: a household that needs the money is the only one that can show the limb working.
  const withoutWages = (interests) => ({
    ...funded,
    persons: [{ ...funded.persons[0], employmentIncomePerFortnight: toCents(0), superInterests: interests }],
  });
  const silent = withoutWages([{ phase: 'accountBasedPension', balance: toCents(800_000) }]);
  const stated = withoutWages([
    { phase: 'accountBasedPension', balance: toCents(800_000), statedStreamSettings: { commencementDay: '2024-07-01' } },
  ]);
  const drawn = project(SETTINGS, stated, [SPEND]);
  assert.notEqual(
    JSON.stringify(drawn.map((m) => m.assessableAssets)),
    JSON.stringify(project(SETTINGS, silent, [SPEND]).map((m) => m.assessableAssets)),
  );
  assert.ok(
    drawn.some((m) => m.lines.some((l) => l.description === 'Account-Based Pension payment, Sam')),
    'a stated commencement day must fund limb 2',
  );
  // And the silent one still draws nothing at all, which is the branch this test keeps alive.
  // **`effect === 'cash'` and not every matching description (P4-4).** The silent Household's
  // pension still GROWS every month, and since P4-4 that growth is a line whose description names
  // the pool it grew — `Investment growth, Sam — Account-Based Pension`. What this assertion has
  // always been about is the PAYMENT, so it is the cash lines that must be empty, and the growth
  // lines are asserted present immediately below rather than filtered away and forgotten.
  const silentMonths = project(SETTINGS, silent, [SPEND]);
  assert.deepEqual(
    silentMonths.flatMap((m) => m.lines.filter((l) => l.effect === 'cash' && /Account-Based Pension/.test(l.description))),
    [],
  );
  assert.ok(
    silentMonths.every((m) =>
      m.lines.some(
        (l) => l.effect === 'wealth' && l.description === 'Investment growth, Sam — Account-Based Pension',
      ),
    ),
    'the balance nobody may draw still grows, and P4-4 says so in every month',
  );
});

// --- 6. The residual this chunk inherited, and the proof that it is gone ------------------------

test('THE RESIDUAL IS CLOSED — past FY2027-28 the cashflow STILL carries its tax drag', () => {
  // **This test replaces the canary that stood here, and it is the same fixture, the same months
  // and the same dollar figure read the other way round.** The canary asserted that from 1 July
  // 2028 the walk emitted NO income-tax line and the Waterfall spent the GROSS salary — $1,220.17
  // a month of tax drag that was not there — and its own comment said it "goes red the day it is
  // fixed". It is fixed. Income Tax Rates Act 1986 Sch 7 Pt I cl 1(b)'s table for "the 2027-28
  // year of income OR A LATER YEAR OF INCOME" supplies FY2028-29 and every year after it, so the
  // hole was never a missing figure — it was an unread one (register O8).
  const longer = project({ ...SETTINGS, planningHorizonAge: 50 }, SAM, [SPEND]);
  assert.equal(longer.at(-1).month, '2029-06');

  const june2028 = monthAt(longer, '2028-06'); // the last month the register STATES
  const july2028 = monthAt(longer, '2028-07'); // the first month it PROJECTS

  // THE MEASURED FIGURE, in the month that used to be empty. It was `[]` here; it is $1,220.17.
  assert.deepEqual(amountOf(june2028, 'Income tax, Sam'), [122_017]);
  assert.deepEqual(amountOf(july2028, 'Income tax, Sam'), [122_017]);

  // **The month-on-month step across the boundary is NIL, and that is the assertion that matters.**
  // The old canary measured a $1,220.17 jump in the offset on a salary that had not changed by a
  // cent — the tax vanishing. There is no jump now. Sam's salary, tax and spending are identical
  // either side, so the net to the offset is identical: $6,500.00 − $1,220.17 − $5,000.01.
  const net = (m) => m.closingBalance - m.openingBalance;
  assert.equal(net(july2028) - net(june2028), 0, 'the tax drag still disappears across 1 July 2028');
  assert.equal(net(july2028), 27_982);
  assert.equal(650_000 - 122_017 - 500_001, 27_982);

  // Over the twelve months of FY2028-29 the household keeps $3,357.84, not $17,999.88. The
  // difference — $14,642.04 — is exactly the twelve months of tax the canary measured as missing.
  const projected = longer.filter((m) => m.month >= '2028-07');
  assert.equal(projected.length, 12);
  assert.equal(projected.at(-1).closingBalance - projected[0].openingBalance, 12 * 27_982);
  assert.equal(12 * 122_017, 1_464_204); // what the household used to be handed and did not have
  assert.equal(12 * (650_000 - 500_001) - 12 * 27_982, 1_464_204); // …and it is that same $14,642.04

  // EVERY month of the walk carries a tax line now, not twenty-four of thirty-six.
  const taxed = longer.filter((m) => m.lines.some((l) => l.description.startsWith('Income tax')));
  assert.equal(taxed.length, longer.length);
  assert.equal(taxed.length, 36);

  // **AND THE THING THE FIGURE CANNOT TELL YOU.** FY2028-29's $1,220.17 is identical to
  // FY2027-28's, because the ladder is identical — so no assertion above distinguishes a year the
  // register STATES from one it PROJECTS from standing law, and a fixture that tried would pass
  // under almost any mutation. `standingLawFrom` is the only thing that separates them.
  assert.equal(taxYear('2028-29').standingLawFrom, '2027-28');
  assert.equal(taxYear('2027-28').standingLawFrom, undefined);

  // The reconciliation still holds in both months, so the tax line is really in the cashflow and
  // not merely in the line list.
  assert.ok(reconciles(june2028));
  assert.ok(reconciles(july2028));
});

// --- 7. P4-1a, re-earned over a CASHFLOW figure ---------------------------------------------------------

test('P4-1a STILL HOLDS through the Waterfall — two fake clocks, BYTE-IDENTICAL, over a CASHFLOW figure', () => {
  // Chunks 1, 2 and 3 each re-earned this tick rather than inheriting it, and chunk 4 puts the
  // spending target, the Waterfall and the running balance on the path. The fixture is the shortfall
  // one, so the output carries a spending line, a one-off, a SHORTFALL and a non-zero closing
  // balance: an empty walk, a line-less walk and a walk whose balances are all zero would every one
  // of them agree under any two clocks, and none of them can pass this.
  const CLOCKS = ['2026-07-01T00:00:00Z', '2031-12-24T13:45:09Z'];
  const ENTRIES = [SPEND, entry('oo', 'ONE_OFF_EXPENSE', '2027-03-10', { amount: toCents(30_000) })];
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
process.stdout.write(JSON.stringify(project(${JSON.stringify(SETTINGS)}, ${JSON.stringify(SAM)}, ${JSON.stringify(ENTRIES)})));
`;
  const dir = mkdtempSync(join(tmpdir(), 'enough-waterfall-clock-'));
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
    assert.equal(outputs[0], outputs[1], 'the cashflow drifted with the system clock');
    // NOT vacuous — the hand-worked figures of §4 are really in the bytes that were compared.
    assert.match(outputs[0], /"description":"Household spending","amount":500001/);
    assert.match(outputs[0], /"description":"Unfunded shortfall","amount":2787006/);
    assert.match(outputs[0], /"openingBalance":189328/);
    // $6,197.76 less the $27,870.06 the household could not fund is not the walk's end here: the
    // shortfall floors the balance at nil in 2027-03, so the last fifteen months rebuild from zero
    // and the walk ends at 8 × $236.66 + ... — hand-worked as $4,067.82. ($236.66 × 3 + $279.82 × 12)
    assert.equal(3 * 23_666 + 12 * 27_982, 406_782);
    assert.match(outputs[0], /"closingBalance":406782/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

// --- 8. THE SPENDING LEVEL IS A REAL FIGURE — register O85, ruled 2026-09-21 ---------------------
//
// Everything above this line runs at `cpi: 0`, which is why its hand-worked twelfths are the same
// cents in month 0 and month 23. This section is the other half of that: the ONE fixture in this
// file at a live CPI, asserting that the stated level is raised to each month's price level before
// the twelfth is taken. Without it, `cpi: 0` above would have quietly turned the whole file into a
// test of a rule nobody applies.
const INDEXED = { ...SETTINGS, economicSeries: { ...SETTINGS.economicSeries, cpi: 0.025 } };

test('THE STATED LEVEL IS REAL — the same $60,000.01 buys the same life in 2028 and costs more', () => {
  const months = project(INDEXED, SAM, [SPEND]);
  const spend = (isoMonth) => amountOf(monthAt(months, isoMonth), 'Household spending')[0];

  // HAND-WORKED, from `priceLevelFactor(cpi, asAtDate, month) = (1 + cpi) ^ (months / 12)` and then
  // the twelfth `monthlySpendFromAnnual` rounds UP:
  //   2026-07 — the month the plan is stated as at. The factor is EXACTLY 1, whatever the CPI is,
  //             so the figure is $5,000.01 to the cent: the same figure §2 hand-worked at `cpi: 0`.
  //   2027-07 — twelve months on. $60,000.01 × 1.025 = $61,500.01 (to the cent), ÷ 12 = $5,125.01.
  //   2028-06 — twenty-three months on. 1.025 ^ (23/12) = 1.04846533…, so the year's figure is
  //             $62,907.93 and the month's is $5,242.33.
  assert.equal(spend('2026-07'), 500_001);
  assert.equal(spend('2026-07'), amountOf(project(SETTINGS, SAM, [SPEND])[0], 'Household spending')[0]);
  assert.equal(spend('2027-07'), 512_501);
  assert.equal(spend('2028-06'), 524_233);
  assert.equal(Math.ceil(Math.round(6_000_001 * 1.025) / 12), 512_501);
  assert.equal(Math.ceil(Math.round(6_000_001 * 1.025 ** (23 / 12)) / 12), 524_233);

  // **THE DIRECTION, ASSERTED AS A DIRECTION and not as a pair of endpoints.** The line never falls,
  // it rises in most months, and it is strictly larger than the flat figure in every month but the
  // first — a mutation that indexed by half the rate, or off the entry's date, or not at all, has to
  // survive all three of these and the three figures above.
  const flat = project(SETTINGS, SAM, [SPEND]).map((m) => amountOf(m, 'Household spending')[0]);
  const rising = months.map((m) => amountOf(m, 'Household spending')[0]);
  assert.equal(rising.length, 24);
  assert.ok(rising.every((cents, i) => i === 0 || cents >= rising[i - 1]), 'the target must never fall');
  assert.ok(rising.every((cents, i) => (i === 0 ? cents === flat[i] : cents > flat[i])), 'every later month must cost MORE');

  // **THE CONSERVATION IDENTITY, and it is the whole of the ruling in one line:** deflate the
  // month's own figure by that month's own price-level factor and TWELVE of them are the annual
  // figure the user typed, in EVERY month of the walk — the walk indexes by the same factor the page
  // deflates by, so the two cancel and the user is shown the number they entered.
  //
  // The residue is bounded and both ends of it are DERIVED, not measured. Upwards: the twelfth is
  // rounded UP once, which is at most 11 cents of annual figure (`monthlySpendFromAnnual`'s own
  // stated bound). Downwards: `mulCents` rounds the raised annual figure to the NEAREST cent, so the
  // deflation can come back up to half a cent short. Nothing here compounds with the length of the
  // walk; a drift that grew with the month would be a second factor somewhere.
  for (const [i, cents] of rising.entries()) {
    const deflated = (12 * cents) / 1.025 ** (i / 12);
    assert.ok(deflated > 6_000_000, `${months[i].month} deflates to ${deflated}, more than a cent below the stated level`);
    assert.ok(deflated - 6_000_001 <= 12, `${months[i].month} deflates to ${deflated}, more than a dozen cents above`);
  }

  // And the household is poorer for it: the same Sam, the same salary, less left at the end.
  const flatWalk = project(SETTINGS, SAM, [SPEND]);
  assert.ok(months.at(-1).closingBalance < flatWalk.at(-1).closingBalance, 'indexing spending must LEAVE LESS');
});
