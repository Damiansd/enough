// P3-3b — salary sacrifice and personal deductible contributions as *contributions*, the 15%
// contributions tax, and applying the total against the concessional cap and the carry-forward
// headroom. Register §3.1 (the rate) and §3.4 (carry-forward, ITAA 1997 s 291-20(3)–(7)).
//
// Every expected figure is hand-worked from the register and the working is written out beside it.
// Nothing here was produced by running the implementation and pasting the output.
//
// **Every year-varying fixture runs at least two financial years.** The concessional cap is
// $32,500 in FY2026-27 and $35,000 on the synthetic FY2027-28 driver, and the carry-forward window
// rolls between them, so the same contribution figure produces a different excess in each year. A
// FY2026-27 cap hard-coded as a literal survives one year and fails the other; a single-year
// fixture would not see it. That is not hypothetical — the suite's known defect is exactly this.
//
// NOT covered here, and not built: Division 293. Register §3.6 names its income base as "income
// for surcharge purposes" and never decomposes it, so the second 15% is a documented seam and not
// an invented component list. Also not priced: Division 291's excess concessional treatment.
import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { toCents } from '../dist/core/money.js';
import { SUPERANNUATION } from '../dist/data/assumptions/index.js';
import {
  MissingIndexNumberError,
  carryForwardHeadroom,
  concessionalContributionsCap,
  decemberQuarterIndex,
  forecastAwoteIndexNumbers,
  totalSuperBalance,
} from '../dist/core/superCaps.js';
import { qualifyingEarnings, superGuarantee } from '../dist/core/superContributions.js';
import {
  ExcessConcessionalContributionsNotModelledError,
  NoticeOfIntentError,
  applyConcessional,
  concessionalContributions,
  refuseConcessionalContributionsOverGeneralCap,
  contributionsTax,
  personalDeductibleContributions,
} from '../dist/core/superConcessional.js';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const fundTax = SUPERANNUATION.fundTax;

// ATO Table 40 — AWOTE for the December quarter (register §3.2). Dec 2025 drives FY2026-27 → $32,500.
const AWOTE_DEC_2025 = 2_051.1;

// SYNTHETIC. The December 2026 quarter has not been published and register O5 makes the forward
// series a Setting, not an assumption. Carried as `unverified` so anything computed from it says so.
//   2,200.00 / 1,533.40 = 1.434720… → 1.435; 25,000 × 1.435 = 35,875 → floor $2,500 → $35,000
// The same driver the P3-3a and P3-4 suites use, so all three agree on FY2027-28.
const AWOTE_SYNTHETIC_DEC_2026 = 2_200.0;

const INDEX_NUMBERS = [
  decemberQuarterIndex({
    index: 'AWOTE',
    fy: '2026-27',
    indexNumber: AWOTE_DEC_2025,
    confidence: 'primary-verified',
    source: 'ATO Table 40 — AWOTE Dec 2025',
  }),
  decemberQuarterIndex({
    index: 'AWOTE',
    fy: '2027-28',
    indexNumber: AWOTE_SYNTHETIC_DEC_2026,
    confidence: 'unverified',
    source: 'synthetic test driver — not published',
  }),
];

// The contribution history from the P3-4 suite, unchanged, so the two files hand-work the same
// window. The three earliest caps are SYNTHETIC and deliberately round — the register does not
// carry the historical caps and the window arithmetic is subtraction, so round numbers keep the
// hand-working checkable.
//
//   FY        cap            contributions   unused   over cap
//   2021-22   $20,000 SYNTH   $5,000         $15,000       —
//   2022-23   $21,000 SYNTH  $25,000             nil   $4,000
//   2023-24   $22,000 SYNTH  $22,000             nil       —
//   2024-25   $23,000 SYNTH   $3,000         $20,000       —
//   2025-26   $30,000 §3.2    $6,000         $24,000       —
//   2026-27   $32,500 §3.1   $40,000             nil   $7,500
const HISTORY = [
  { fy: '2021-22', cap: toCents(20_000), concessionalContributions: toCents(5_000) },
  { fy: '2022-23', cap: toCents(21_000), concessionalContributions: toCents(25_000) },
  { fy: '2023-24', cap: toCents(22_000), concessionalContributions: toCents(22_000) },
  { fy: '2024-25', cap: toCents(23_000), concessionalContributions: toCents(3_000) },
  { fy: '2025-26', cap: toCents(30_000), concessionalContributions: toCents(6_000) },
  { fy: '2026-27', cap: toCents(32_500), concessionalContributions: toCents(40_000) },
];

// s 291-20(7), earliest year first — worked in full in `core-super-carry-forward.test.mjs`:
//
//   FY2026-27, window FY2021-22…FY2025-26. FY2022-23's $4,000 over its cap spends the oldest
//   unused amount standing, which is FY2021-22's: remaining 15,000 − 4,000 = $11,000.
//     remaining  = [11,000, 0, 0, 20,000, 24,000]  → available $55,000
//     total cap  = general 32,500 + 55,000         = $87,500
//
//   FY2027-28, window FY2022-23…FY2026-27. FY2026-27's $7,500 over its cap spends the oldest
//   standing amount, which is now FY2024-25's: 20,000 − 7,500 = $12,500. FY2022-23's own $4,000
//   over has no earlier year left inside the window and is left alone.
//     remaining  = [0, 0, 12,500, 24,000, 0]       → available $36,500
//     total cap  = general 35,000 + 36,500         = $71,500
const CAP_2026_27 = toCents(32_500);
const CAP_2027_28 = toCents(35_000);
const AVAILABLE_2026_27 = toCents(55_000);
const AVAILABLE_2027_28 = toCents(36_500);

const ELIGIBLE = { '2026-27': totalSuperBalance('2026-06-30', toCents(400_000)), '2027-28': totalSuperBalance('2027-06-30', toCents(400_000)) };
// The test is `< $500,000` and never indexes (T21), so exactly $500,000 is outside it.
const INELIGIBLE = { '2026-27': totalSuperBalance('2026-06-30', toCents(500_000)), '2027-28': totalSuperBalance('2027-06-30', toCents(500_000)) };

const headroomFor = (fy, balances = ELIGIBLE) =>
  carryForwardHeadroom({
    fy,
    cap: concessionalContributionsCap(fy, INDEX_NUMBERS),
    totalSuperBalance: balances[fy],
    priorYears: HISTORY.filter((each) => each.fy < fy),
  });

const deductible = (dollars) => personalDeductibleContributions(toCents(dollars), { noticeOfIntentAcknowledged: true });

/** A total made only of employer contributions, so the arithmetic under test is the cap, not the sum. */
const employerOnly = (dollars) =>
  concessionalContributions({
    employerContributions: toCents(dollars),
    salarySacrificed: toCents(0),
    personalDeductible: deductible(0),
    otherConcessional: toCents(0),
  });

const assess = (fy, dollars, balances = ELIGIBLE) =>
  applyConcessional({ fy, contributions: employerOnly(dollars), headroom: headroomFor(fy, balances) });

// --- The composition: every limb added, and the sacrifice counted on both sides (T17) ------------

test('s 291-25 — the sacrificed amount is a contribution AND part of the SG base, and that is not double counting', () => {
  // A $170,000 package, $20,000 of it sacrificed. SGAA ss 10A(1)(h), 10A(4)(b): the base is the
  // whole $170,000, so SG = 12% × 170,000 = $20,400 — the sacrifice does not reduce it.
  const sacrificing = superGuarantee(
    '2026-27',
    [{ employer: 'Employer A', qualifyingEarnings: qualifyingEarnings({
      earningsPaidToThePerson: toCents(150_000),
      salarySacrificedAmounts: toCents(20_000),
      otherQualifyingEarnings: toCents(0),
    }) }],
    INDEX_NUMBERS,
  );
  assert.equal(sacrificing.amount, toCents(20_400));

  // The concessional total is the SG *plus* the sacrificed dollars: 20,400 + 20,000 = $40,400.
  // Netting the sacrifice off either side is the T17 mistake wearing a different hat — the $20,000
  // is not "already inside" the $20,400.
  const total = concessionalContributions({
    employerContributions: sacrificing.amount,
    salarySacrificed: toCents(20_000),
    personalDeductible: deductible(0),
    otherConcessional: toCents(0),
  });
  assert.equal(total, toCents(40_400));

  // The same Person not sacrificing: same SG, $20,000 less into the fund.
  const notSacrificing = superGuarantee(
    '2026-27',
    [{ employer: 'Employer A', qualifyingEarnings: qualifyingEarnings({
      earningsPaidToThePerson: toCents(170_000),
      salarySacrificedAmounts: toCents(0),
      otherQualifyingEarnings: toCents(0),
    }) }],
    INDEX_NUMBERS,
  );
  assert.equal(notSacrificing.amount, sacrificing.amount);
  assert.equal(total - employerOnly(20_400), toCents(20_000));
});

test('every limb is added and every limb is required', () => {
  // 20,400 + 20,000 + 15,000 + 1,000 = $56,400.
  assert.equal(
    concessionalContributions({
      employerContributions: toCents(20_400),
      salarySacrificed: toCents(20_000),
      personalDeductible: deductible(15_000),
      otherConcessional: toCents(1_000),
    }),
    toCents(56_400),
  );
  // Nothing subtracts: dropping any one limb to nil lowers the total by exactly that limb.
  assert.equal(
    concessionalContributions({
      employerContributions: toCents(20_400),
      salarySacrificed: toCents(0),
      personalDeductible: deductible(15_000),
      otherConcessional: toCents(1_000),
    }),
    toCents(36_400),
  );
  for (const limb of ['employerContributions', 'salarySacrificed', 'otherConcessional']) {
    assert.throws(
      () =>
        concessionalContributions({
          employerContributions: toCents(0),
          salarySacrificed: toCents(0),
          personalDeductible: deductible(0),
          otherConcessional: toCents(0),
          [limb]: toCents(-1),
        }),
      RangeError,
    );
  }
});

// --- s 290-150 personal deductible contributions -------------------------------------------------

test('s 290-150 — without an acknowledged s 290-170 notice the amount is not deductible, and this refuses', () => {
  assert.equal(personalDeductibleContributions(toCents(15_000), { noticeOfIntentAcknowledged: true }), toCents(15_000));
  // The consequence of guessing runs both ways — a deduction the Person is not entitled to on one
  // side, an excess non-concessional determination on the other — so nothing is assumed.
  assert.throws(
    () => personalDeductibleContributions(toCents(15_000), { noticeOfIntentAcknowledged: false }),
    NoticeOfIntentError,
  );
  // Nil needs no notice: there is nothing to deduct and nothing to reclassify.
  assert.equal(personalDeductibleContributions(toCents(0), { noticeOfIntentAcknowledged: false }), toCents(0));
  assert.throws(() => personalDeductibleContributions(toCents(-1), { noticeOfIntentAcknowledged: true }), RangeError);
});

// --- §3.1 — the 15% contributions tax ------------------------------------------------------------

test('§3.1 — 15% of the concessional contributions, in both years, read from the record', () => {
  const rate = fundTax.contributionsTax.value;
  assert.equal(rate, 0.15);

  // FY2026-27 at the cap: 32,500 × 0.15 = $4,875, leaving $27,625 in the fund.
  const y1 = contributionsTax('2026-27', employerOnly(32_500));
  assert.equal(y1.rate, rate);
  assert.equal(y1.amount, toCents(4_875));
  assert.equal(y1.netOfTax, toCents(27_625));

  // FY2027-28 at *its* cap: 35,000 × 0.15 = $5,250, leaving $29,750. A hard-coded FY2026-27 figure
  // cannot satisfy both lines.
  const y2 = contributionsTax('2027-28', employerOnly(35_000));
  assert.equal(y2.amount, toCents(5_250));
  assert.equal(y2.netOfTax, toCents(29_750));

  // A figure that is not a round multiple of anything: 40,400 × 0.15 = $6,060.
  assert.equal(contributionsTax('2026-27', employerOnly(40_400)).amount, toCents(6_060));
  // And it rounds to a whole cent: 333 × 0.15 = 49.95 → 50 cents.
  assert.equal(
    contributionsTax('2026-27', concessionalContributions({
      employerContributions: toCents(3.33),
      salarySacrificed: toCents(0),
      personalDeductible: deductible(0),
      otherConcessional: toCents(0),
    })).amount,
    toCents(0.5),
  );
});

test('the rate is the fund low tax component rate, not a marginal rate and not a Person-dependent one', () => {
  // Register §9: "wire the 15% contributions tax to the marginal rate — must fail against a
  // high-income Person: contributions tax must stay 15%". There is no income argument to wire it
  // to; the same contributions give the same tax whatever the Person earns, and the only way to
  // see the missing second 15% is the Div 293 caveat.
  const big = contributionsTax('2026-27', employerOnly(300_000));
  assert.equal(big.amount, toCents(45_000));
  assert.equal(big.rate, fundTax.contributionsTax.value);
  assert.equal(big.provenance.caveats.length, 1);
  assert.match(big.provenance.caveats[0], /Division 293 imposes a further 15%/);
});

// --- s 291-20 — applying the contributions against the cap ---------------------------------------

test('s 291-20 — inside the general cap, the carry-forward window is not touched at all', () => {
  // $20,000 against a $32,500 cap: nothing reaches the window, and this year generates $12,500 of
  // its own unused cap for the next five years.
  const y1 = assess('2026-27', 20_000);
  assert.equal(y1.generalCap, CAP_2026_27);
  assert.equal(y1.appliedToGeneralCap, toCents(20_000));
  assert.equal(y1.unusedGeneralCapGenerated, toCents(12_500));
  assert.equal(y1.carryForwardApplied, toCents(0));
  assert.deepEqual(y1.carryForward.map((each) => each.applied), [0, 0, 0, 0, 0]);
  assert.equal(y1.carryForwardAvailable, AVAILABLE_2026_27);
  assert.equal(y1.totalCap, toCents(87_500));
  assert.equal(y1.excess, toCents(0));
  assert.equal(y1.contributionsTax.amount, toCents(3_000)); // 20,000 × 0.15

  // The same $20,000 a year later, against a $35,000 cap: $15,000 generated, not $12,500.
  const y2 = assess('2027-28', 20_000);
  assert.equal(y2.generalCap, CAP_2027_28);
  assert.equal(y2.unusedGeneralCapGenerated, toCents(15_000));
  assert.equal(y2.carryForwardAvailable, AVAILABLE_2027_28);
  assert.equal(y2.totalCap, toCents(71_500));
  assert.equal(y2.excess, toCents(0));
});

test('s 291-20(4) — the general cap is consumed FIRST, and only what is left over reaches the window', () => {
  // $40,000 in FY2026-27: 32,500 against the general cap, $7,500 outstanding.
  const y1 = assess('2026-27', 40_000);
  assert.equal(y1.appliedToGeneralCap, CAP_2026_27);
  // Consuming the window first would leave the general cap unspent — which would then generate a
  // fresh unused amount for this year — while burning window years that expire. Same total cap,
  // different future, and this is the line that sees the difference.
  assert.equal(y1.unusedGeneralCapGenerated, toCents(0));
  assert.equal(y1.carryForwardApplied, toCents(7_500));
  assert.equal(y1.excess, toCents(0));

  // $40,000 in FY2027-28: the cap is $35,000, so only $5,000 reaches the window.
  const y2 = assess('2027-28', 40_000);
  assert.equal(y2.appliedToGeneralCap, CAP_2027_28);
  assert.equal(y2.carryForwardApplied, toCents(5_000));
  assert.equal(y2.excess, toCents(0));
});

test('s 291-20(7) — the window is consumed earliest year first, and the year it comes out of moves', () => {
  // FY2026-27, remaining = [11,000, 0, 0, 20,000, 24,000] over FY2021-22…FY2025-26.
  // $7,500 outstanding takes from FY2021-22, the earliest standing amount: 11,000 − 7,500 = $3,500.
  const y1 = assess('2026-27', 40_000);
  assert.deepEqual(y1.carryForward.map((each) => each.fy), ['2021-22', '2022-23', '2023-24', '2024-25', '2025-26']);
  assert.deepEqual(y1.carryForward.map((each) => each.available), [1_100_000, 0, 0, 2_000_000, 2_400_000]);
  assert.deepEqual(y1.carryForward.map((each) => each.applied), [750_000, 0, 0, 0, 0]);
  assert.deepEqual(y1.carryForward.map((each) => each.remainingAfter), [350_000, 0, 0, 2_000_000, 2_400_000]);
  // Latest-first would have taken the $7,500 out of FY2025-26 and left FY2021-22 whole — and
  // FY2021-22 expires this year, so the difference is $7,500 of headroom lost for nothing.
  assert.equal(y1.carryForward[0].lastYearUsable, '2026-27');

  // FY2027-28, remaining = [0, 0, 12,500, 24,000, 0] over FY2022-23…FY2026-27. The earliest
  // standing amount is now FY2024-25's, so the $5,000 comes out of a different year.
  const y2 = assess('2027-28', 40_000);
  assert.deepEqual(y2.carryForward.map((each) => each.fy), ['2022-23', '2023-24', '2024-25', '2025-26', '2026-27']);
  assert.deepEqual(y2.carryForward.map((each) => each.available), [0, 0, 1_250_000, 2_400_000, 0]);
  assert.deepEqual(y2.carryForward.map((each) => each.applied), [0, 0, 500_000, 0, 0]);
  assert.deepEqual(y2.carryForward.map((each) => each.remainingAfter), [0, 0, 750_000, 2_400_000, 0]);
});

test('the cap and the 15% read the total, whatever it is made of', () => {
  // The same $40,000 as the two tests above, composed as SG $20,400 + sacrifice $15,000 +
  // personal deductible $4,600 rather than one employer figure. Every limb counts against the
  // concessional cap and every limb is taxed at 15%, so the assessment is identical:
  //   FY2026-27  32,500 to the general cap, 7,500 from FY2021-22, tax 40,000 × 0.15 = $6,000
  //   FY2027-28  35,000 to the general cap, 5,000 from FY2024-25, tax the same $6,000
  const mixed = concessionalContributions({
    employerContributions: toCents(20_400),
    salarySacrificed: toCents(15_000),
    personalDeductible: deductible(4_600),
    otherConcessional: toCents(0),
  });
  assert.equal(mixed, toCents(40_000));

  const y1 = applyConcessional({ fy: '2026-27', contributions: mixed, headroom: headroomFor('2026-27') });
  assert.equal(y1.appliedToGeneralCap, CAP_2026_27);
  assert.equal(y1.carryForwardApplied, toCents(7_500));
  assert.deepEqual(y1.carryForward.map((each) => each.applied), [750_000, 0, 0, 0, 0]);
  assert.equal(y1.excess, toCents(0));
  assert.equal(y1.contributionsTax.amount, toCents(6_000));

  const y2 = applyConcessional({ fy: '2027-28', contributions: mixed, headroom: headroomFor('2027-28') });
  assert.equal(y2.appliedToGeneralCap, CAP_2027_28);
  assert.equal(y2.carryForwardApplied, toCents(5_000));
  assert.deepEqual(y2.carryForward.map((each) => each.applied), [0, 0, 500_000, 0, 0]);
  assert.equal(y2.contributionsTax.amount, toCents(6_000));
});

test('the excess is what is above the general cap AND the whole window — and it differs by year', () => {
  // FY2026-27: $100,000 against 32,500 + 55,000 = $87,500 → excess $12,500. Every window year is
  // drained in order: 11,000 + 20,000 + 24,000 = $55,000.
  const y1 = assess('2026-27', 100_000);
  assert.equal(y1.appliedToGeneralCap, CAP_2026_27);
  assert.equal(y1.carryForwardApplied, AVAILABLE_2026_27);
  assert.deepEqual(y1.carryForward.map((each) => each.applied), [1_100_000, 0, 0, 2_000_000, 2_400_000]);
  assert.deepEqual(y1.carryForward.map((each) => each.remainingAfter), [0, 0, 0, 0, 0]);
  assert.equal(y1.excess, toCents(12_500));
  // The fund's 15% falls on the whole of the assessable contributions, excess included:
  // 100,000 × 0.15 = $15,000. What the *Person* additionally owes on the excess is Div 291 and is
  // not priced here.
  assert.equal(y1.contributionsTax.amount, toCents(15_000));

  // FY2027-28: the same $100,000 against 35,000 + 36,500 = $71,500 → excess $28,500.
  const y2 = assess('2027-28', 100_000);
  assert.equal(y2.carryForwardApplied, AVAILABLE_2027_28);
  assert.equal(y2.excess, toCents(28_500));
  assert.equal(y2.contributionsTax.amount, toCents(15_000));
  // Both years: nothing is created and nothing is lost.
  for (const year of [y1, y2]) {
    assert.equal(year.appliedToGeneralCap + year.carryForwardApplied + year.excess, year.contributions);
    assert.equal(year.generalCap + year.carryForwardAvailable, year.totalCap);
  }
});

test('s 291-20(3) — a Total Super Balance of $500,000 or more takes the window away entirely', () => {
  // The test is strict and the figure never indexes (T21), so exactly $500,000 fails it. The same
  // $40,000 that fitted comfortably above is now $7,500 of excess in FY2026-27 and $5,000 in
  // FY2027-28 — the window is reported, so the Person can see what they cannot use, and nothing is
  // drawn from it.
  const y1 = assess('2026-27', 40_000, INELIGIBLE);
  assert.equal(y1.carryForwardAvailable, toCents(0));
  assert.equal(y1.carryForwardApplied, toCents(0));
  assert.equal(y1.carryForward.length, 5);
  assert.deepEqual(y1.carryForward.map((each) => each.available), [0, 0, 0, 0, 0]);
  assert.equal(y1.totalCap, CAP_2026_27);
  assert.equal(y1.excess, toCents(7_500));

  const y2 = assess('2027-28', 40_000, INELIGIBLE);
  assert.equal(y2.totalCap, CAP_2027_28);
  assert.equal(y2.excess, toCents(5_000));
});

test('last year\'s headroom applied to this year is refused, in both directions', () => {
  const contributions = employerOnly(40_000);
  assert.throws(
    () => applyConcessional({ fy: '2026-27', contributions, headroom: headroomFor('2027-28') }),
    RangeError,
  );
  assert.throws(
    () => applyConcessional({ fy: '2027-28', contributions, headroom: headroomFor('2026-27') }),
    RangeError,
  );
  assert.throws(
    () => applyConcessional({ fy: '2026-27', contributions: -1, headroom: headroomFor('2026-27') }),
    RangeError,
  );
});

// --- Provenance -----------------------------------------------------------------------------------

test('the assessment carries the headroom\'s provenance merged, plus the three limits of the reading', () => {
  const y1 = assess('2026-27', 40_000);
  // Everything consumed is primary-verified for FY2026-27, so the confidence is unweakened and the
  // only caveats are the ones about what this number is *not*.
  assert.equal(y1.provenance.confidence, 'primary-verified');
  assert.equal(y1.provenance.caveats.length, 3);
  const lines = y1.provenance.caveats.join('\n');
  assert.match(lines, /does not enumerate what a concessional contribution is/);
  assert.match(lines, /Division 293 imposes a further 15%/);
  assert.match(lines, /excess concessional contribution is reported and not priced/);

  // FY2027-28 is driven by the synthetic AWOTE number, and the merge must carry that through from
  // the headroom rather than rebuilding a confidence and dropping the line.
  const y2 = assess('2027-28', 40_000);
  assert.equal(y2.provenance.confidence, 'unverified');
  assert.equal(y2.provenance.caveats.length, 4);
  assert.match(y2.provenance.caveats.join('\n'), /AWOTE index number for the quarter ending 2026-12-31 is unverified/);

  // The contributions tax on its own consumes only an every-year constant, so it is year-blind and
  // says the same thing in both years.
  for (const fy of ['2026-27', '2027-28']) {
    const tax = contributionsTax(fy, employerOnly(40_000));
    assert.equal(tax.provenance.confidence, 'primary-verified');
    assert.deepEqual(tax.provenance.caveats.length, 1);
  }
});

// --- The source carries no figure of its own ------------------------------------------------------

test('no rate and no cap is written as a literal in the module', () => {
  const source = readFileSync(join(ROOT, 'src', 'core', 'superConcessional.ts'), 'utf8')
    .replaceAll(/\/\*[\s\S]*?\*\//g, '')
    .replaceAll(/`(?:[^`\\]|\\.)*`|'(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*"|\/\/.*$/gm, (match) =>
      match.startsWith('//') ? '' : '""',
    );
  // Not vacuous: the executable code is still there.
  assert.match(source, /export const applyConcessional/);
  assert.match(source, /FUND_TAX\.contributionsTax/);
  // The 15% comes from the record and the caps come from the headroom. Neither appears here.
  assert.doesNotMatch(source, /0\.15/);
  assert.doesNotMatch(source, /32[,_]?500|35[,_]?000|500[,_]?000/);
});

// --- Substitutions that will not compile ------------------------------------------------------------
//
// §9's rule is that a mutation with no failing test is a trap the suite does not cover. These four
// are stronger than a failing test: the mutation cannot be written down. Each runs `tsc` over a
// scratch file and asserts that it *fails*, with a positive control asserting the correct version
// compiles clean — without the control, a probe broken by a bad path would make every case below
// pass for the wrong reason.

const tsc = (body) => {
  const dir = mkdtempSync(join(ROOT, '.tsc-mutation-'));
  try {
    const file = join(dir, 'case.ts');
    writeFileSync(
      file,
      "import { toCents } from '../src/core/money.js';\n" +
        "import { applyNonConcessional, bringForward, nonConcessionalContributions, totalSuperBalance } from '../src/core/superCaps.js';\n" +
        "import { qualifyingEarnings, superGuarantee } from '../src/core/superContributions.js';\n" +
        "import { applyConcessional, concessionalContributions, contributionsTax, personalDeductibleContributions } from '../src/core/superConcessional.js';\n" +
        'const DEDUCTIBLE = personalDeductibleContributions(toCents(15_000), { noticeOfIntentAcknowledged: true });\n' +
        'const CONCESSIONAL = concessionalContributions({\n' +
        '  employerContributions: toCents(20_400),\n' +
        '  salarySacrificed: toCents(20_000),\n' +
        '  personalDeductible: DEDUCTIBLE,\n' +
        '  otherConcessional: toCents(0),\n' +
        '});\n' +
        "const ARRANGEMENT = bringForward({ fy: '2026-27', dateOfBirth: '1970-01-01', totalSuperBalance: totalSuperBalance('2026-06-30', toCents(400_000)) });\n" +
        'void applyConcessional; void applyNonConcessional; void contributionsTax; void qualifyingEarnings;\n' +
        'void superGuarantee; void nonConcessionalContributions; void CONCESSIONAL; void ARRANGEMENT; void DEDUCTIBLE;\n' +
        `${body}\n`,
    );
    try {
      execFileSync(
        process.execPath,
        [
          join(ROOT, 'node_modules', 'typescript', 'bin', 'tsc'),
          '--noEmit',
          '--strict',
          '--target', 'ES2022',
          '--module', 'nodenext',
          '--moduleResolution', 'nodenext',
          '--verbatimModuleSyntax',
          '--noUncheckedIndexedAccess',
          file,
        ],
        { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] },
      );
      return { ok: true, output: '' };
    } catch (error) {
      return { ok: false, output: `${error.stdout ?? ''}${error.stderr ?? ''}` };
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
};

test('the compile probe is not vacuous — the CORRECT calls compile clean', () => {
  const result = tsc(
    'contributionsTax(\'2026-27\', CONCESSIONAL);\n' +
      'applyNonConcessional(ARRANGEMENT, nonConcessionalContributions(toCents(130_000)));\n' +
      "superGuarantee('2026-27', [{ employer: 'A', qualifyingEarnings: qualifyingEarnings({\n" +
      '  earningsPaidToThePerson: toCents(150_000),\n' +
      '  salarySacrificedAmounts: toCents(20_000),\n' +
      '  otherQualifyingEarnings: toCents(0),\n' +
      '}) }]);',
  );
  assert.equal(result.ok, true, result.output);
});

test('MUTATION T17 — deducting the sacrifice from the SG base WILL NOT COMPILE', () => {
  // The regression this whole segment invites: now that salary sacrifice is a contribution,
  // "fix" the SG base by handing it the post-sacrifice payslip gross. There is no argument to
  // `superGuarantee` a bare `Cents` satisfies…
  const bare = tsc("superGuarantee('2026-27', [{ employer: 'A', qualifyingEarnings: toCents(150_000) }]);");
  assert.equal(bare.ok, false, 'the post-sacrifice payslip gross must not type-check as the SG base');
  assert.match(bare.output, /QUALIFYING_EARNINGS|not assignable/);

  // …and no field on the constructor that subtracts, so the sacrificed amount cannot be dropped.
  const omitted = tsc(
    "superGuarantee('2026-27', [{ employer: 'A', qualifyingEarnings: qualifyingEarnings({\n" +
      '  earningsPaidToThePerson: toCents(150_000),\n' +
      '  otherQualifyingEarnings: toCents(0),\n' +
      '}) }]);',
  );
  assert.equal(omitted.ok, false, 'omitting the sacrificed amount must not type-check');
  assert.match(omitted.output, /salarySacrificedAmounts/);
});

test('MUTATION — taxing a non-concessional contribution at 15% WILL NOT COMPILE', () => {
  // The fund taxes assessable contributions. A non-concessional contribution is made from money
  // already taxed in the Person's hands, and nothing widens into `ConcessionalContributions`
  // except the constructor — so the rate has nothing wrong to be applied to.
  const bare = tsc("contributionsTax('2026-27', toCents(130_000));");
  assert.equal(bare.ok, false, 'a bare Cents must not be taxable as a concessional contribution');
  assert.match(bare.output, /CONCESSIONAL_CONTRIBUTIONS|not assignable/);

  const branded = tsc("contributionsTax('2026-27', nonConcessionalContributions(toCents(130_000)));");
  assert.equal(branded.ok, false, 'a non-concessional contribution must not be taxable at 15%');
  assert.match(branded.output, /CONCESSIONAL_CONTRIBUTIONS|not assignable/);
});

test('MUTATION — a personal deductible contribution treated as non-concessional WILL NOT COMPILE', () => {
  // Two ways to make the mistake, both rejected. Filing the deductible amount against the
  // non-concessional cap:
  const filed = tsc('applyNonConcessional(ARRANGEMENT, DEDUCTIBLE);');
  assert.equal(filed.ok, false, 'a deductible personal contribution must not count against the NCC cap');
  assert.match(filed.output, /NON_CONCESSIONAL_CONTRIBUTIONS|not assignable/);

  // …and leaving it out of the concessional total, which is where the cap and the 15% are decided.
  const omitted = tsc(
    'concessionalContributions({\n' +
      '  employerContributions: toCents(20_400),\n' +
      '  salarySacrificed: toCents(20_000),\n' +
      '  otherConcessional: toCents(0),\n' +
      '});',
  );
  assert.equal(omitted.ok, false, 'the personal deductible limb must not be omissible');
  assert.match(omitted.output, /personalDeductible/);

  // An undeducted personal contribution cannot be filed as the deductible limb either: the brand
  // is only obtainable from the constructor, which demands the s 290-170 acknowledgement.
  const undeducted = tsc(
    'concessionalContributions({\n' +
      '  employerContributions: toCents(20_400),\n' +
      '  salarySacrificed: toCents(20_000),\n' +
      '  personalDeductible: toCents(15_000),\n' +
      '  otherConcessional: toCents(0),\n' +
      '});',
  );
  assert.equal(undeducted.ok, false, 'a bare Cents must not pass as a deductible personal contribution');
  assert.match(undeducted.output, /PERSONAL_DEDUCTIBLE|not assignable/);
});

// --- P6-8 brief 3 (final chunk) — the YEAR'S CONTRIBUTIONS against the year's general cap --------
//
// A refusal, not an assessment: `applyConcessional` above needs a contribution history and prices
// an excess it cannot tax; this answers the one question that needs neither. It is the check the
// walk makes when a user states a salary sacrifice, and the three properties it must have are that
// the boundary is exact, that the cap is the YEAR's, and that the amount measured is the TOTAL.
//
// ⚠️ **WHAT IS MEASURED CHANGED ON 2026-09-20, AND THIS SECTION IS RE-DERIVED RATHER THAN
// RELAXED.** Brief 2 chunk 5 passed a single `statedAnnualAmount` and tested the sacrifice ALONE,
// on a ground its own comment stated: *"The Superannuation Guarantee is not contributed by the
// walk (P6-8 brief 3), so every total it can build understates the Person's real one."* Chunk 2b
// of brief 3 contributes the Guarantee, so the ground is discharged and the function now takes the
// four s 291-25 COMPONENTS and builds the total with `concessionalContributions` — one constructor,
// no second spelling, and a bare number cannot be passed.
//
// **It still cannot prove compliance, and still returns `undefined` for that reason.** Two limbs
// remain outside it and they run in opposite directions: s 291-20(4) carry-forward headroom would
// make the CAP larger, and a personal deductible contribution would make the TOTAL larger. The
// tests below assert both halves: over the cap throws, and at or under it returns NOTHING.

const statedBy = 'entry sac (SUPER_CONTRIBUTION), Nell';

/** The walk's own shape: a sacrifice and an employer Guarantee, with the two unheld limbs at nil. */
const limbs = (salarySacrificed, employerContributions = toCents(0)) => ({
  employerContributions,
  salarySacrificed,
  personalDeductible: personalDeductibleContributions(toCents(0), { noticeOfIntentAcknowledged: false }),
  otherConcessional: toCents(0),
});

test('the SACRIFICE AND THE GUARANTEE TOGETHER are measured, and the boundary is a cent wide', () => {
  // FY2026-27's published cap is $32,500 (register §3.1). **The Guarantee is $11,400 — 12% of a
  // $95,000 salary — so the room left for a sacrifice is $21,100**, and one cent either side of
  // THAT is the boundary. A build still testing the sacrifice alone would walk $32,500 here.
  assert.equal(toCents(21_100) + toCents(11_400), toCents(32_500));
  assert.equal(
    refuseConcessionalContributionsOverGeneralCap({ fy: '2026-27', components: limbs(toCents(21_100), toCents(11_400)), statedBy, indexNumbers: INDEX_NUMBERS }),
    undefined,
    'at the cap is walked — s 291-20(1) is exceeded only ABOVE the cap, and a silent return is not a finding of compliance either',
  );
  assert.throws(
    () => refuseConcessionalContributionsOverGeneralCap({ fy: '2026-27', components: limbs(toCents(21_100.01), toCents(11_400)), statedBy, indexNumbers: INDEX_NUMBERS }),
    (err) => {
      assert.ok(err instanceof ExcessConcessionalContributionsNotModelledError);
      // The TOTAL, and each limb of it by name, so a reader can see which one to change.
      assert.match(err.message, /3250001 cents of concessional contributions in FY2026-27/);
      assert.match(err.message, /2110001 cents salary sacrificed/);
      assert.match(err.message, /1140000 cents of employer Superannuation Guarantee/);
      assert.match(err.message, /cap for FY2026-27 is 3250000 cents/);
      // The refusal says what it is refusing to do rather than only that it refuses: Div 291's
      // excess treatment is the thing this build does not price.
      assert.match(err.message, /Div 291|Division 291/);
      assert.match(err.message, /excess concessional contributions charge/);
      assert.match(err.message, /entry sac \(SUPER_CONTRIBUTION\), Nell/);
      // And it says how to fix it, which a sacrifice-alone message could not: the Guarantee is not
      // optional, so what the user can change is the other limb.
      assert.match(err.message, /room left for a sacrifice is the cap less the Guarantee/);
      return true;
    },
  );
  // **THE MUTATION THIS PAIR EXISTS TO KILL: measuring the sacrifice alone.** $32,500 sacrificed is
  // exactly at the cap on its own and $11,400 over it once the employer's 12% is counted.
  assert.throws(
    () => refuseConcessionalContributionsOverGeneralCap({ fy: '2026-27', components: limbs(toCents(32_500), toCents(11_400)), statedBy, indexNumbers: INDEX_NUMBERS }),
    ExcessConcessionalContributionsNotModelledError,
  );
  // And the control that says the Guarantee is a LIMB and not a constant: the same sacrifice with
  // no employer contribution at all is walked.
  assert.equal(
    refuseConcessionalContributionsOverGeneralCap({ fy: '2026-27', components: limbs(toCents(32_500)), statedBy, indexNumbers: INDEX_NUMBERS }),
    undefined,
  );
});

test('every limb counts, and counts ONCE', () => {
  // **The four limbs are added, and the total is the constructor's.** $16,250 in each of two limbs
  // is exactly the cap; a cent more in either is over it. A build that counted the Guarantee twice
  // would refuse the first of these.
  assert.equal(
    refuseConcessionalContributionsOverGeneralCap({ fy: '2026-27', components: limbs(toCents(16_250), toCents(16_250)), statedBy, indexNumbers: INDEX_NUMBERS }),
    undefined,
    'the total is not the sum of the limbs — something is counted twice',
  );
  for (const [sacrifice, guarantee] of [[toCents(16_250.01), toCents(16_250)], [toCents(16_250), toCents(16_250.01)]]) {
    assert.throws(
      () => refuseConcessionalContributionsOverGeneralCap({ fy: '2026-27', components: limbs(sacrifice, guarantee), statedBy, indexNumbers: INDEX_NUMBERS }),
      ExcessConcessionalContributionsNotModelledError,
      'a cent in one of the two limbs is not reaching the total',
    );
  }
  // The other two limbs are not decoration either: a personal deductible contribution of a cent
  // takes the same pair over.
  assert.throws(
    () => refuseConcessionalContributionsOverGeneralCap({
      fy: '2026-27',
      components: { ...limbs(toCents(16_250), toCents(16_250)), personalDeductible: deductible(0.01) },
      statedBy,
      indexNumbers: INDEX_NUMBERS,
    }),
    ExcessConcessionalContributionsNotModelledError,
  );
  assert.throws(
    () => refuseConcessionalContributionsOverGeneralCap({
      fy: '2026-27',
      components: { ...limbs(toCents(16_250), toCents(16_250)), otherConcessional: toCents(0.01) },
      statedBy,
      indexNumbers: INDEX_NUMBERS,
    }),
    ExcessConcessionalContributionsNotModelledError,
  );
});

test('the cap is the YEAR’s, and the two years disagree by $2,500', () => {
  // **The fixture crosses a cap change**, which is the only way this can be tested at all: the
  // register publishes one concessional cap. FY2026-27 is $32,500 (published) and FY2027-28 is
  // $35,000 on the synthetic AWOTE driver at the top of this file. A $22,600 sacrifice beside an
  // $11,400 Guarantee is $34,000 — over one and inside the other, so a check wired to "the cap"
  // rather than to the year gets exactly one of these two wrong whichever year it picks.
  assert.equal(concessionalContributionsCap('2026-27', INDEX_NUMBERS).amount, toCents(32_500));
  assert.equal(concessionalContributionsCap('2027-28', INDEX_NUMBERS).amount, toCents(35_000));
  const thirtyFour = limbs(toCents(22_600), toCents(11_400));
  assert.throws(
    () => refuseConcessionalContributionsOverGeneralCap({ fy: '2026-27', components: thirtyFour, statedBy, indexNumbers: INDEX_NUMBERS }),
    ExcessConcessionalContributionsNotModelledError,
  );
  assert.equal(
    refuseConcessionalContributionsOverGeneralCap({ fy: '2027-28', components: thirtyFour, statedBy, indexNumbers: INDEX_NUMBERS }),
    undefined,
    'FY2027-28 is being tested against FY2026-27’s cap — the cap is indexed and it moved',
  );
});

test('a year with no index number is refused above the base amount, and walked at or below it', () => {
  // **The floor is a rule of s 960-285 and not a convenience.** The cap is indexed cumulatively
  // from $25,000 and the December 2016 quarter, and where the factor is not greater than 1 the
  // base amount stands — so no year's cap is below $25,000, published or not. A TOTAL within the
  // base amount is within every year's cap and needs no index number at all.
  const baseAmount = SUPERANNUATION.capIndexation.concessional.value.baseAmount;
  assert.equal(baseAmount, toCents(25_000), 'the base amount moved — the floor below is measured against the record, not against this literal');
  assert.equal(
    refuseConcessionalContributionsOverGeneralCap({ fy: '2029-30', components: limbs(toCents(13_600), toCents(11_400)), statedBy }),
    undefined,
    'a year with no AWOTE number refuses a total that cannot breach any cap',
  );
  // ⚠️ **AND THE FLOOR IS CROSSED BY THE TOTAL, WHICH IS THE CHANGE THIS CHUNK MADE.** The same
  // $13,600 sacrifice with a cent more of Guarantee needs the year's own cap — and for a year this
  // build holds no number for, that is `MissingIndexNumberError` rather than a guess. Growing the
  // last known cap by an assumed rate is the T13 mutation. **A sacrifice that cleared the floor on
  // its own does not clear it as a total**, and the message names the cap it could not compute.
  assert.throws(
    () => refuseConcessionalContributionsOverGeneralCap({ fy: '2029-30', components: limbs(toCents(13_600), toCents(11_400.01)), statedBy }),
    (err) => {
      assert.ok(err instanceof MissingIndexNumberError);
      assert.match(err.message, /concessional contributions cap for FY2029-30/);
      return true;
    },
  );
  // The control on the other side of the same pair: the sacrifice ALONE is far inside the floor in
  // both of the two cases above, so what moved is the total and nothing else.
  assert.ok(toCents(13_600) < baseAmount);
  // And the floor is not a cap: supplied with the year's number, the real cap governs and $34,000
  // is inside FY2027-28's.
  assert.equal(
    refuseConcessionalContributionsOverGeneralCap({ fy: '2027-28', components: limbs(toCents(22_600), toCents(11_400)), statedBy, indexNumbers: INDEX_NUMBERS }),
    undefined,
  );
});

// --- P6-12 — THE REFUSAL SAYS WHERE ITS CAP CAME FROM (user ruling, 2026-09-21) ------------------
//
// Half the ruling was "do it" and half was "label it". A refusal is where the label matters most: a
// Person told their contribution is over the cap, in a year nobody has published a cap for, is being
// refused against a figure their OWN wage assumption produced — and if the message does not say so
// they will read it as the law and will not know that the box on the settings panel moves it.
//
// Three cases, three sentences, and each names what the figure rests on. The pins are on the
// SUBJECTS rather than on the wording, except for the two words that carry the claim.

test('the refusal names the cap’s SOURCE — published, computed from a published level, or a forecast', () => {
  const over = (fy, indexNumbers) => {
    try {
      refuseConcessionalContributionsOverGeneralCap({
        fy,
        components: limbs(toCents(30_000), toCents(11_400)),
        statedBy,
        indexNumbers,
      });
    } catch (error) {
      assert.equal(error.name, 'ExcessConcessionalContributionsNotModelledError');
      return error.message;
    }
    return assert.fail(`FY${fy} accepted $41,400 of concessional contributions`);
  };

  // (1) The year the register publishes, read rather than computed — no index number supplied.
  const published = over('2026-27', []);
  assert.match(published, /cap for FY2026-27 is 3250000 cents/);
  assert.match(published, /the figure the register publishes for that year/);
  assert.doesNotMatch(published, /FORECAST/);

  // (2) The same year, computed from the PUBLISHED December 2025 wage level. Still no forecast in
  // it, and the message says computed rather than quoted — the cross-check is what makes it safe.
  const computed = over('2026-27', forecastAwoteIndexNumbers('2026-27', 0.035));
  assert.match(computed, /COMPUTED, not quoted/);
  assert.match(computed, /quarter ending 2025-12-31/);
  assert.doesNotMatch(computed, /FORECAST/);

  // (3) A year beyond publication. The cap is $35,000 — larger than the published one, so this
  // refusal is STRICTLY harder to earn than it was before P6-12 — and it is labelled.
  const forecast = over('2028-29', forecastAwoteIndexNumbers('2028-29', 0.035));
  assert.match(forecast, /cap for FY2028-29 is 3500000 cents/);
  assert.match(forecast, /FORECAST AND NOT THE LAW/);
  assert.match(forecast, /Nobody has published a cap for that year/);
  assert.match(forecast, /wage growth rate stated in this plan/);
  // Which way each direction runs, said in terms, because a figure the user can move is a figure
  // they should be told how to move.
  assert.match(forecast, /Raise that rate and the cap rises/);
  assert.match(forecast, /lower it and more arrangements are refused/);
  // The three are genuinely different sentences and not one sentence with a word swapped.
  assert.equal(new Set([published, computed, forecast]).size, 3);
  // And the rest of the refusal is untouched: it still names the entry, the limbs and Division 291.
  for (const message of [published, computed, forecast]) {
    assert.match(message, /4140000 cents of concessional contributions/);
    assert.match(message, /3000000 cents salary sacrificed/);
    assert.match(message, /1140000 cents of employer Superannuation Guarantee/);
    assert.match(message, /Div(ision)? 291/);
  }
});
