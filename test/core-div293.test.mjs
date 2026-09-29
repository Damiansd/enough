// P3-5 — Division 293: the taper, the income base it is measured on, and the two s 995-1 limbs
// that feed it. ITAA 1997 ss 293-20, 293-25, 293-30 and the Superannuation (Sustaining the
// Superannuation Contribution Concession) Imposition Act 2013 (No. 87, 2013) s 5. Register §3.6.
//
// Every expected figure below is hand-worked from the statute and the P3-5 research report, with
// the arithmetic written out beside it. Nothing here was produced by running the implementation.
// Where a published figure exists it is used in preference to my own arithmetic: the ATO's worked
// example is a test in its own right, because the mistake this module exists to prevent — a cliff
// instead of a taper — produces a perfectly plausible number that is three times too large, and a
// suite hand-worked only from a silent spec is exactly how that gets enshrined.
//
// **Two financial years, and one figure that deliberately does not move.** The derived low tax
// contributions run at FY2026-27 and FY2027-28, where the concessional cap is $32,500 and $35,000,
// so the same $40,000 of contributions produces a different excess and therefore a different
// charge in each year. The $250,000 threshold is the opposite case: it is frozen by construction
// (T21 — absent from the s 960-265 indexation table, no indexation language anywhere in Div 293,
// moved only ever by textual amendment), so the two-year test on it asserts that the tax is the
// SAME twenty years apart rather than pretending the figure varies.
//
// NOT covered here, and not built: Division 296, the Condition of Release, TTR, the transfer
// balance cap, and which pot pays the Div 293 liability (P3-5 Finding 5.5 — a Setting, not a legal
// question). Subdivisions 293-D/E/F were never retrieved (P3-5 U2) and are refused, not modelled.
import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { toCents } from '../dist/core/money.js';
import { SUPERANNUATION } from '../dist/data/assumptions/index.js';
import {
  div293Income,
  reportableSuperannuationContributions,
  surchargeIncome,
  taxableIncome,
  totalNetInvestmentLoss,
} from '../dist/core/incomeBases.js';
import {
  carryForwardHeadroom,
  concessionalContributionsCap,
  decemberQuarterIndex,
  totalSuperBalance,
} from '../dist/core/superCaps.js';
import {
  applyConcessional,
  concessionalContributions,
  personalDeductibleContributions,
} from '../dist/core/superConcessional.js';
import {
  ACCUMULATION_INTEREST_ONLY,
  ModifiedLowTaxContributionsError,
  division293Tax,
  lowTaxContributions,
  lowTaxContributionsFromConcessional,
} from '../dist/core/div293.js';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const FY = '2026-27';

const ti = (dollars) => taxableIncome(toCents(dollars));

/** A Div 293 income of exactly `dollars`: every s 995-1 limb but (a) stated at nil, as the type requires. */
const income = (dollars) =>
  div293Income({
    taxableIncome: ti(dollars),
    assessableFhssReleasedAmount: toCents(0),
    familyTrustDistributionTaxReduction: toCents(0),
    reportableFringeBenefitsTotal: toCents(0),
    reportableSuperannuationContributions: toCents(0),
    totalNetInvestmentLoss: toCents(0),
    lowRateCapLumpSumComponent: toCents(0),
  });

/** s 293-30 amounts stated directly, with no excess to subtract — the path that does not rely on P3-5 U1. */
const stated = (dollars, fy = FY) =>
  lowTaxContributions({
    fy,
    lowTaxContributedAmounts: toCents(dollars),
    excessConcessionalContributions: toCents(0),
    interests: ACCUMULATION_INTEREST_ONLY,
  });

const charge = (incomeDollars, contributionDollars, fy = FY) =>
  division293Tax({ fy, income: income(incomeDollars), lowTaxContributions: stated(contributionDollars, fy) });

// --- s 293-20(1): the taper -------------------------------------------------------------------

test('P3-5 — the ATO\'s own worked example: Jan pays $750, and never the $2,250 a cliff would charge', () => {
  // ATO, Division 293 tax on concessional contributions by high income earners (retrieved
  // 2026-09-05), quoted at P3-5 Finding 5.2:
  //
  //   "Jan's Division 293 income is $240,000 and Division 293 super contributions are $15,000.
  //    This is a total of $255,000. Division 293 taxable contributions are the lesser of Division
  //    293 super contributions ($15,000) or the amount above the $250,000 threshold ($5,000).
  //    Jan's Division 293 tax payable is 15% of $5,000. So the Division 293 tax payable is $750."
  //
  //   sum      = 240,000 + 15,000 = 255,000
  //   excess   = 255,000 − 250,000 = 5,000
  //   taxable  = min(15,000, 5,000) = 5,000        ← s 293-20(1), "the LESSER of"
  //   tax      = 0.15 × 5,000 = 750
  //
  // This is a published figure, not my arithmetic, which is the point of using it: it is
  // independent of both the implementation and of me.
  const jan = charge(240_000, 15_000);

  assert.equal(jan.sum, toCents(255_000));
  assert.equal(jan.excess, toCents(5_000));
  assert.equal(jan.taxableContributions, toCents(5_000));
  assert.equal(jan.tax, toCents(750));

  // The cliff, stated as the thing that must not happen. 0.15 × 15,000 = 2,250 — three times too
  // much, and it is the number a reader who skims "the lesser of" will produce.
  assert.notEqual(jan.tax, toCents(2_250));
  assert.notEqual(jan.taxableContributions, jan.lowTaxContributions.amount);
  assert.equal(jan.lowTaxContributions.amount, toCents(15_000));
  assert.equal(jan.binding, 'excess');

  // The rate is applied to the taxable contributions and to nothing else.
  assert.equal(jan.rate, 0.15);
  assert.equal(jan.tax, toCents(0.15 * 5_000));
});

test('P3-5 — below the threshold there is no charge, however large the contributions', () => {
  //   sum     = 200,000 + 30,000 = 230,000, which does not exceed 250,000
  //   excess  = nil, taxable contributions = min(30,000, 0) = nil, tax = nil
  const below = charge(200_000, 30_000);
  assert.equal(below.sum, toCents(230_000));
  assert.equal(below.excess, toCents(0));
  assert.equal(below.taxableContributions, toCents(0));
  assert.equal(below.tax, toCents(0));
  assert.equal(below.binding, null);

  // The contributions sit on the SAME side of the comparison as the income (P3-5 D4). A Person on
  // $235,000 of Div 293 income with $20,000 of contributions IS over the threshold, on $255,000,
  // even though their income alone is not.
  const over = charge(235_000, 20_000);
  assert.equal(over.sum, toCents(255_000));
  assert.equal(over.tax, toCents(750)); // min(20,000, 5,000) = 5,000 → 0.15 × 5,000
});

test('P3-5 — "exceeds" is strict: $250,000 exactly is nil and $250,001 is fifteen cents', () => {
  //   235,000 + 15,000 = 250,000 exactly. s 293-20(1) charges only where the sum EXCEEDS the
  //   threshold, so the excess is nil and so is the tax.
  const exactly = charge(235_000, 15_000);
  assert.equal(exactly.sum, toCents(250_000));
  assert.equal(exactly.threshold, toCents(250_000));
  assert.equal(exactly.excess, toCents(0));
  assert.equal(exactly.tax, toCents(0));

  //   235,001 + 15,000 = 250,001
  //   excess  = 1 dollar = 100 cents
  //   taxable = min(15,000, 1) = $1
  //   tax     = 0.15 × 100 cents = 15 cents
  // A cliff at the same point charges 0.15 × 15,000 = $2,250 — the step this test exists to deny.
  const oneDollarOver = charge(235_001, 15_000);
  assert.equal(oneDollarOver.sum, toCents(250_001));
  assert.equal(oneDollarOver.excess, toCents(1));
  assert.equal(oneDollarOver.taxableContributions, toCents(1));
  assert.equal(oneDollarOver.tax, 15);
  assert.equal(oneDollarOver.tax, toCents(0.15));
  assert.notEqual(oneDollarOver.tax, toCents(2_250));
});

test('P3-5 — inside the shade-in band the EXCESS binds and the tax rises dollar for dollar', () => {
  // P3-5 Finding 1.2's worked check: low tax contributions $30,000, Div 293 income $235,000.
  //   sum     = 265,000
  //   excess  = 15,000
  //   taxable = min(30,000, 15,000) = 15,000
  //   tax     = 0.15 × 15,000 = 2,250
  const inBand = charge(235_000, 30_000);
  assert.equal(inBand.excess, toCents(15_000));
  assert.equal(inBand.taxableContributions, toCents(15_000));
  assert.equal(inBand.tax, toCents(2_250));
  assert.equal(inBand.binding, 'excess');

  // Dollar for dollar: $1,000 more income is $1,000 more taxable contributions, $150 more tax.
  //   236,000 + 30,000 = 266,000 → excess 16,000 → min(30,000, 16,000) = 16,000 → 2,400
  const thousandMore = charge(236_000, 30_000);
  assert.equal(thousandMore.taxableContributions, toCents(16_000));
  assert.equal(thousandMore.tax, toCents(2_400));
  assert.equal(thousandMore.tax - inBand.tax, toCents(150));
});

test('P3-5 — above the band the LOW TAX CONTRIBUTIONS bind and the tax stops rising', () => {
  // The band is exactly as wide as the Person's own low tax contributions. With $30,000 of them
  // the top of the band is at 250,000 + 30,000 = $280,000 of sum, i.e. $250,000 of Div 293 income.
  //   250,000 + 30,000 = 280,000 → excess 30,000 → min(30,000, 30,000) = 30,000 → 0.15 × 30,000 = 4,500
  const topOfBand = charge(250_000, 30_000);
  assert.equal(topOfBand.excess, toCents(30_000));
  assert.equal(topOfBand.taxableContributions, toCents(30_000));
  assert.equal(topOfBand.tax, toCents(4_500));

  //   300,000 + 30,000 = 330,000 → excess 80,000 → min(30,000, 80,000) = 30,000 → 4,500
  //   900,000 + 30,000 = 930,000 → excess 680,000 → min(30,000, 680,000) = 30,000 → 4,500
  // Above the band the whole of the low tax contributions is charged and no more, ever: the excess
  // has stopped being the lesser of the two.
  const wellAbove = charge(300_000, 30_000);
  assert.equal(wellAbove.excess, toCents(80_000));
  assert.equal(wellAbove.taxableContributions, toCents(30_000));
  assert.equal(wellAbove.tax, toCents(4_500));
  assert.equal(wellAbove.binding, 'low tax contributions');
  assert.equal(charge(900_000, 30_000).tax, toCents(4_500));
});

test('P3-5 — s 293-20(2): nil low tax contributions, no charge, at any income', () => {
  // s 293-20(2) is a redundancy guard rather than a second rule — min(0, excess) is already nil —
  // and it is not written as a branch, so this asserts the arithmetic reaches the same place.
  //   400,000 + 0 = 400,000 → excess 150,000 → min(0, 150,000) = 0 → tax nil
  const nothingIn = charge(400_000, 0);
  assert.equal(nothingIn.excess, toCents(150_000));
  assert.equal(nothingIn.taxableContributions, toCents(0));
  assert.equal(nothingIn.tax, toCents(0));
  assert.equal(nothingIn.binding, 'low tax contributions');
});

// --- s 293-20(1)(a): the reportable superannuation contributions disregard -----------------------

test('P3-5 — the sacrificed amount is counted once, not on both sides of the same sum', () => {
  // A Person on a $230,000 package sacrificing $25,000: taxable income $205,000, reportable
  // superannuation contributions $25,000 (s 995-1 limb (c)).
  //
  //   income for surcharge purposes = 205,000 + 25,000            = 230,000   (the MLS base)
  //   Div 293 income (s 293-20(1)(a), disregarding limb (c))      = 205,000
  //
  // Their low tax contributions are $30,000 — the $25,000 sacrificed plus SG on top of it.
  //
  //   CORRECT: 205,000 + 30,000 = 235,000 → below the threshold → NIL
  //   WRONG  : 230,000 + 30,000 = 260,000 → excess 10,000 → min(30,000, 10,000) → 0.15 × 10,000 = 1,500
  //
  // The $25,000 is counted once in the income base and again in the contributions on the same side
  // of the same comparison, and it pulls a Person over $250,000 who is not over it.
  const components = {
    taxableIncome: ti(205_000),
    assessableFhssReleasedAmount: toCents(0),
    familyTrustDistributionTaxReduction: toCents(0),
    reportableFringeBenefitsTotal: toCents(0),
    reportableSuperannuationContributions: reportableSuperannuationContributions({
      salarySacrificed: toCents(25_000),
      otherReportableEmployerContributions: toCents(0),
      personalDeductible: personalDeductibleContributions(toCents(0), { noticeOfIntentAcknowledged: true }),
      excessConcessionalContributions: toCents(0),
    }),
    totalNetInvestmentLoss: toCents(0),
    lowRateCapLumpSumComponent: toCents(0),
  };
  assert.equal(surchargeIncome(components), toCents(230_000));
  assert.equal(div293Income(components), toCents(205_000));

  const correct = division293Tax({ fy: FY, income: div293Income(components), lowTaxContributions: stated(30_000) });
  assert.equal(correct.sum, toCents(235_000));
  assert.equal(correct.tax, toCents(0));

  // The size of the mistake, computed the only way it can be reached here — by building the base
  // from a taxable income that already contains the sacrificed amount. Passing `surchargeIncome`
  // itself to `division293Tax` is a compile error; see the probe at the end of this file.
  const mutated = charge(230_000, 30_000);
  assert.equal(mutated.tax, toCents(1_500));
  assert.notEqual(mutated.tax, correct.tax);
});

// --- T21: the threshold is frozen ---------------------------------------------------------------

test('P3-5 — the $250,000 threshold is frozen, so twenty years on the same Person pays the same', () => {
  // **This figure is year-invariant by construction**, so the two-year fixture asserts sameness
  // rather than difference — the established treatment for a figure that does not vary. Register
  // T21 and P3-5 Finding 4.1: no indexation language anywhere in the 30 sections of Div 293;
  // absent from the s 960-265 table that s 960-270(1) makes the gateway, while the concessional
  // cap, the CGT cap, the transfer balance cap, both Div 296 thresholds and the low rate cap are
  // all in it; and it has only ever moved by textual amendment ($300,000 → $250,000, No 81 of
  // 2016). The nominal creep is the behaviour, not a bug.
  const now = charge(240_000, 15_000, '2026-27');
  const twentyYearsOn = charge(240_000, 15_000, '2046-47');

  assert.equal(now.threshold, toCents(250_000));
  assert.equal(twentyYearsOn.threshold, toCents(250_000));
  assert.equal(now.tax, toCents(750));
  assert.equal(twentyYearsOn.tax, toCents(750));
  assert.equal(now.tax, twentyYearsOn.tax);

  // And the record itself says so, rather than the code merely happening not to index it.
  assert.equal(SUPERANNUATION.division293.threshold.kind, 'constant');
  assert.equal(SUPERANNUATION.division293.threshold.everyYear, true);
  assert.equal(SUPERANNUATION.division293.threshold.value, toCents(250_000));

  // At 3.5% wage growth an indexed threshold would be near $497,000 by FY2046-47 and this Person's
  // $255,000 sum would be nowhere near it. A mutation that indexes the figure is invisible in
  // FY2026-27 alone — register §9 marks that row "FY2026-27 blind: YES" — and visible here.
  assert.notEqual(twentyYearsOn.tax, toCents(0));
});

// --- ss 293-25 and 293-30: the two routes to low tax contributions -------------------------------

// The FY2026-27 and FY2027-28 fixture the P3-3b and P3-4 suites already use, so all three files
// hand-work the same window. Dec 2025 AWOTE drives the $32,500 cap; the Dec 2026 index number has
// not been published, so the FY2027-28 driver is synthetic and carried as `unverified`.
const AWOTE_DEC_2025 = 2_051.1;
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

const HISTORY = [
  { fy: '2021-22', cap: toCents(20_000), concessionalContributions: toCents(5_000) },
  { fy: '2022-23', cap: toCents(21_000), concessionalContributions: toCents(25_000) },
  { fy: '2023-24', cap: toCents(22_000), concessionalContributions: toCents(22_000) },
  { fy: '2024-25', cap: toCents(23_000), concessionalContributions: toCents(3_000) },
  { fy: '2025-26', cap: toCents(30_000), concessionalContributions: toCents(6_000) },
  { fy: '2026-27', cap: toCents(32_500), concessionalContributions: toCents(40_000) },
];

const ELIGIBLE = {
  '2026-27': totalSuperBalance('2026-06-30', toCents(400_000)),
  '2027-28': totalSuperBalance('2027-06-30', toCents(400_000)),
};
// The carry-forward test is `< $500,000` and never indexes (T21), so exactly $500,000 fails it.
const INELIGIBLE = {
  '2026-27': totalSuperBalance('2026-06-30', toCents(500_000)),
  '2027-28': totalSuperBalance('2027-06-30', toCents(500_000)),
};

const assess = (fy, dollars, balances) =>
  applyConcessional({
    fy,
    contributions: concessionalContributions({
      employerContributions: toCents(dollars),
      salarySacrificed: toCents(0),
      personalDeductible: personalDeductibleContributions(toCents(0), { noticeOfIntentAcknowledged: true }),
      otherConcessional: toCents(0),
    }),
    headroom: carryForwardHeadroom({
      fy,
      cap: concessionalContributionsCap(fy, INDEX_NUMBERS),
      totalSuperBalance: balances[fy],
      priorYears: HISTORY.filter((each) => each.fy < fy),
    }),
  });

test('s 293-25 — low tax contributions are the concessional contributions AS CAPPED, in both years', () => {
  // A Person contributing $40,000 with no carry-forward available (Total Super Balance $500,000,
  // which fails the strict `< $500,000` test), so the cap is the general cap alone:
  //
  //   FY2026-27  general cap $32,500 → excess 40,000 − 32,500 = 7,500 → ltc = 40,000 − 7,500 = 32,500
  //   FY2027-28  general cap $35,000 → excess 40,000 − 35,000 = 5,000 → ltc = 40,000 − 5,000 = 35,000
  //
  // The same contribution figure gives a different answer in each year, which is why this fixture
  // runs two: a FY2026-27 cap written as a literal survives one year and fails the other.
  const capped2026 = lowTaxContributionsFromConcessional({
    assessment: assess('2026-27', 40_000, INELIGIBLE),
    interests: ACCUMULATION_INTEREST_ONLY,
  });
  assert.equal(capped2026.lowTaxContributedAmounts, toCents(40_000));
  assert.equal(capped2026.excessConcessionalContributions, toCents(7_500));
  assert.equal(capped2026.amount, toCents(32_500));

  const capped2027 = lowTaxContributionsFromConcessional({
    assessment: assess('2027-28', 40_000, INELIGIBLE),
    interests: ACCUMULATION_INTEREST_ONLY,
  });
  assert.equal(capped2027.excessConcessionalContributions, toCents(5_000));
  assert.equal(capped2027.amount, toCents(35_000));
  assert.notEqual(capped2026.amount, capped2027.amount);
});

test('s 293-25 — using carry-forward headroom INCREASES the Div 293 charge (P3-5 D5)', () => {
  // The same Person, the same $40,000 contributed, the same $230,000 of Div 293 income. The only
  // difference is whether the five-year window is available to them.
  //
  //   WITHOUT the window (TSB $500,000): cap $32,500, excess $7,500 — and s 293-25(b) subtracts
  //   the excess, so it escapes Div 293 entirely (Div 291 taxes it at marginal rates instead).
  //       ltc = 32,500 → sum = 262,500 → excess 12,500 → min(32,500, 12,500) → 0.15 × 12,500 = 1,875
  //
  //   WITH the window (TSB $400,000): cap 32,500 + 55,000 = $87,500, so there is NO excess and the
  //   whole $40,000 survives into the low tax contributions.
  //       ltc = 40,000 → sum = 270,000 → excess 20,000 → min(40,000, 20,000) → 0.15 × 20,000 = 3,000
  //
  // $1,125 more tax for using the headroom — exactly 0.15 × the $7,500 that would have been an
  // excess. ATO: "if your concessional contributions cap has increased due to the use of
  // carried-forward amounts, all contributions included in your higher cap amount are counted for
  // Division 293 purposes." A UI presenting carry-forward as an unambiguous win is misleading a
  // Person above the threshold.
  const base = income(230_000);

  const withoutWindow = division293Tax({
    fy: '2026-27',
    income: base,
    lowTaxContributions: lowTaxContributionsFromConcessional({
      assessment: assess('2026-27', 40_000, INELIGIBLE),
      interests: ACCUMULATION_INTEREST_ONLY,
    }),
  });
  assert.equal(withoutWindow.lowTaxContributions.amount, toCents(32_500));
  assert.equal(withoutWindow.excess, toCents(12_500));
  assert.equal(withoutWindow.tax, toCents(1_875));

  const withWindow = division293Tax({
    fy: '2026-27',
    income: base,
    lowTaxContributions: lowTaxContributionsFromConcessional({
      assessment: assess('2026-27', 40_000, ELIGIBLE),
      interests: ACCUMULATION_INTEREST_ONLY,
    }),
  });
  assert.equal(withWindow.lowTaxContributions.amount, toCents(40_000));
  assert.equal(withWindow.excess, toCents(20_000));
  assert.equal(withWindow.tax, toCents(3_000));

  assert.equal(withWindow.tax - withoutWindow.tax, toCents(1_125));
  assert.equal(withWindow.tax - withoutWindow.tax, toCents(0.15 * 7_500));
});

test('P3-5 U1 — only the DERIVED route reports unverified, and it says why', () => {
  // `concessional − excess` is a NEAR-identity, not an identity: s 291-25(2)(e) excludes a SIS Act
  // s 99G(6) refunded amount from concessional contributions and s 293-30(4) has no counterpart,
  // so on the face of the two provisions such an amount stays a low tax contributed amount while
  // ceasing to be concessional — and the derivation would UNDERSTATE the tax. SIS s 99G was never
  // retrieved and nothing states the consequence in terms, so the record carrying it is
  // `unverified` and a result that leans on it must say so.
  const derived = division293Tax({
    fy: '2026-27',
    income: income(230_000),
    lowTaxContributions: lowTaxContributionsFromConcessional({
      assessment: assess('2026-27', 40_000, ELIGIBLE),
      interests: ACCUMULATION_INTEREST_ONLY,
    }),
  });
  assert.equal(derived.provenance.confidence, 'unverified');
  assert.ok(
    derived.provenance.caveats.includes('superannuation.division293.lowTaxContributedAmountDivergence is unverified'),
    `the divergence caveat survived into the result: ${JSON.stringify(derived.provenance.caveats)}`,
  );

  // The assessment it was derived from is itself primary-verified in FY2026-27, which is what
  // makes the weakening attributable to the U1 reading and to nothing else.
  assert.equal(assess('2026-27', 40_000, ELIGIBLE).provenance.confidence, 'primary-verified');

  // The stated route does not rely on the reading, and keeps the stronger label. Same threshold,
  // same rate, same arithmetic — a blanket `unverified` on every Div 293 figure would be a caveat
  // that stops meaning anything.
  const statedRoute = charge(240_000, 15_000);
  assert.equal(statedRoute.provenance.confidence, 'primary-verified');
  assert.deepEqual(statedRoute.provenance.caveats, []);
});

test('s 293-25 Notes 1 and 2 — a modified interest is refused by Subdivision, not approximated', () => {
  // P3-5 U2: Subdivs 293-D, 293-E and 293-F each replace this calculation and none was retrieved.
  // Nor can the concessional figure stand in — Subdiv 291-C modifies that for the same interests
  // by different rules, so neither is derivable from the other.
  for (const [flag, subdivision] of [
    ['definedBenefitInterest', '293-D'],
    ['constitutionallyProtectedStateHigherLevelOfficeHolder', '293-E'],
    ['commonwealthJustice', '293-F'],
  ]) {
    assert.throws(
      () =>
        lowTaxContributions({
          fy: FY,
          lowTaxContributedAmounts: toCents(30_000),
          excessConcessionalContributions: toCents(0),
          interests: { ...ACCUMULATION_INTEREST_ONLY, [flag]: true },
        }),
      { name: 'ModifiedLowTaxContributionsError', subdivision },
      flag,
    );
  }
  assert.ok(new ModifiedLowTaxContributionsError('293-D', 'x') instanceof RangeError);

  // The derived route is gated the same way — there is no back door through `applyConcessional`.
  assert.throws(
    () =>
      lowTaxContributionsFromConcessional({
        assessment: assess('2026-27', 40_000, ELIGIBLE),
        interests: { ...ACCUMULATION_INTEREST_ONLY, definedBenefitInterest: true },
      }),
    ModifiedLowTaxContributionsError,
  );
});

test('P3-5 — one year\'s contributions against another year\'s income is refused', () => {
  assert.throws(
    () => division293Tax({ fy: '2027-28', income: income(240_000), lowTaxContributions: stated(15_000, '2026-27') }),
    /low tax contributions supplied are for FY2026-27, not FY2027-28/,
  );
  // s 293-25 subtracts the excess from the amounts it was measured out of, so it can never exceed them.
  assert.throws(
    () =>
      lowTaxContributions({
        fy: FY,
        lowTaxContributedAmounts: toCents(10_000),
        excessConcessionalContributions: toCents(15_000),
        interests: ACCUMULATION_INTEREST_ONLY,
      }),
    /exceed the .* low tax contributed amounts/,
  );
});

// --- The two s 995-1 limbs that feed the base ---------------------------------------------------

test('s 995-1 total net investment loss — a financial investment PROFIT does not soak up a rental loss', () => {
  // "The amount (if any) by which … exceed …" is written once per paragraph, so each silo is
  // floored at nil before the addition.
  //   (a) financial investments: deductions 1,000, income 6,000 → do not exceed → NIL
  //   (b) rental property:       deductions 20,000, income 12,000 → 8,000
  //   total = 0 + 8,000 = 8,000
  // Netted, the $5,000 financial investment profit would eat into the rental loss:
  //   (1,000 − 6,000) + (20,000 − 12,000) = −5,000 + 8,000 = 3,000 — understating by $5,000.
  const loss = totalNetInvestmentLoss({
    financialInvestmentDeductions: toCents(1_000),
    financialInvestmentIncome: toCents(6_000),
    rentalPropertyDeductions: toCents(20_000),
    rentalPropertyIncome: toCents(12_000),
  });
  assert.equal(loss, toCents(8_000));
  assert.notEqual(loss, toCents(3_000));
});

test('s 995-1 total net investment loss — and not the other way round either', () => {
  //   (a) financial investments: deductions 8,000, income 3,000 → 5,000
  //   (b) rental property:       deductions 2,000, income 9,000 → do not exceed → NIL
  //   total = 5,000 + 0 = 5,000
  // Netted: 5,000 + (2,000 − 9,000) = 5,000 − 7,000 = −2,000, which an implementation that then
  // floors the TOTAL reports as nil. Both wrong answers are asserted against, because a netting
  // mutation may or may not carry a floor of its own.
  const loss = totalNetInvestmentLoss({
    financialInvestmentDeductions: toCents(8_000),
    financialInvestmentIncome: toCents(3_000),
    rentalPropertyDeductions: toCents(2_000),
    rentalPropertyIncome: toCents(9_000),
  });
  assert.equal(loss, toCents(5_000));
  assert.notEqual(loss, toCents(0));
  assert.notEqual(loss, toCents(-2_000));

  // Where both silos are in loss the two readings agree — 5,000 + 8,000 = 13,000 either way — so
  // this case proves nothing about the flooring and is here only to pin the ordinary sum.
  assert.equal(
    totalNetInvestmentLoss({
      financialInvestmentDeductions: toCents(8_000),
      financialInvestmentIncome: toCents(3_000),
      rentalPropertyDeductions: toCents(20_000),
      rentalPropertyIncome: toCents(12_000),
    }),
    toCents(13_000),
  );

  // Nil throughout is nil, not a negative.
  assert.equal(
    totalNetInvestmentLoss({
      financialInvestmentDeductions: toCents(0),
      financialInvestmentIncome: toCents(80_000),
      rentalPropertyDeductions: toCents(0),
      rentalPropertyIncome: toCents(40_000),
    }),
    toCents(0),
  );

  // A negative input is a caller error — the four figures are gross amounts, not net ones.
  assert.throws(
    () =>
      totalNetInvestmentLoss({
        financialInvestmentDeductions: toCents(-1),
        financialInvestmentIncome: toCents(0),
        rentalPropertyDeductions: toCents(0),
        rentalPropertyIncome: toCents(0),
      }),
    /financialInvestmentDeductions cannot be negative/,
  );
});

test('s 995-1 reportable superannuation contributions — RESC plus Subdiv 290-C, less the excess', () => {
  // Limb (c), and the limb Div 293 disregards. It is NOT "reportable employer" contributions:
  //   20,000 sacrificed + 5,000 negotiated above SG + 10,000 personal deductible = 35,000
  //   less 8,000 of excess concessional contributions                            = 27,000
  assert.equal(
    reportableSuperannuationContributions({
      salarySacrificed: toCents(20_000),
      otherReportableEmployerContributions: toCents(5_000),
      personalDeductible: personalDeductibleContributions(toCents(10_000), { noticeOfIntentAcknowledged: true }),
      excessConcessionalContributions: toCents(8_000),
    }),
    toCents(27_000),
  );
});

test('s 995-1 reportable superannuation contributions — reduced BUT NOT BELOW ZERO', () => {
  //   10,000 sacrificed, and 15,000 of excess concessional contributions.
  //   10,000 − 15,000 = −5,000, and s 995-1 says "reduced (but not below zero)" → NIL.
  // A negative here would subtract from income for surcharge purposes, which the limb never does.
  assert.equal(
    reportableSuperannuationContributions({
      salarySacrificed: toCents(10_000),
      otherReportableEmployerContributions: toCents(0),
      personalDeductible: personalDeductibleContributions(toCents(0), { noticeOfIntentAcknowledged: true }),
      excessConcessionalContributions: toCents(15_000),
    }),
    toCents(0),
  );

  assert.throws(
    () =>
      reportableSuperannuationContributions({
        salarySacrificed: toCents(-1),
        otherReportableEmployerContributions: toCents(0),
        personalDeductible: personalDeductibleContributions(toCents(0), { noticeOfIntentAcknowledged: true }),
        excessConcessionalContributions: toCents(0),
      }),
    /salarySacrificed cannot be negative/,
  );
});

// --- The substitutions that will not compile ----------------------------------------------------

const tsc = (body) => {
  const dir = mkdtempSync(join(ROOT, '.tsc-div293-'));
  try {
    const file = join(dir, 'case.ts');
    writeFileSync(
      file,
      "import { toCents } from '../src/core/money.js';\n" +
        'import { div293Income, reportableSuperannuationContributions, surchargeIncome, taxableIncome, ' +
        "totalNetInvestmentLoss } from '../src/core/incomeBases.js';\n" +
        "import { personalDeductibleContributions } from '../src/core/superConcessional.js';\n" +
        'import { ACCUMULATION_INTEREST_ONLY, division293Tax, lowTaxContributions } ' +
        "from '../src/core/div293.js';\n" +
        'const NIL = toCents(0);\n' +
        'const LIMBS = {\n' +
        '  taxableIncome: taxableIncome(toCents(240_000)),\n' +
        '  assessableFhssReleasedAmount: NIL,\n' +
        '  familyTrustDistributionTaxReduction: NIL,\n' +
        '  reportableFringeBenefitsTotal: NIL,\n' +
        '  reportableSuperannuationContributions: reportableSuperannuationContributions({\n' +
        '    salarySacrificed: NIL,\n' +
        '    otherReportableEmployerContributions: NIL,\n' +
        '    personalDeductible: personalDeductibleContributions(NIL, { noticeOfIntentAcknowledged: true }),\n' +
        '    excessConcessionalContributions: NIL,\n' +
        '  }),\n' +
        '  totalNetInvestmentLoss: totalNetInvestmentLoss({\n' +
        '    financialInvestmentDeductions: NIL,\n' +
        '    financialInvestmentIncome: NIL,\n' +
        '    rentalPropertyDeductions: NIL,\n' +
        '    rentalPropertyIncome: NIL,\n' +
        '  }),\n' +
        '  lowRateCapLumpSumComponent: NIL,\n' +
        '};\n' +
        "const LTC = lowTaxContributions({ fy: '2026-27', lowTaxContributedAmounts: toCents(15_000), " +
        'excessConcessionalContributions: NIL, interests: ACCUMULATION_INTEREST_ONLY });\n' +
        'void surchargeIncome; void LTC; void LIMBS;\n' +
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

test('the compile probe is not vacuous — the CORRECT base and figure compile clean', () => {
  // The positive control. Without it a probe that failed for an unrelated reason — a bad path, a
  // missing flag — would make the two cases below pass for the wrong reason.
  const result = tsc("division293Tax({ fy: '2026-27', income: div293Income(LIMBS), lowTaxContributions: LTC });");
  assert.equal(result.ok, true, result.output);
});

test('MUTATION — feeding income for surcharge purposes to Div 293 will not compile', () => {
  // s 293-20(1)(a) takes the base with paragraph (c) left out. `SurchargeIncome` and `Div293Income`
  // are separate brands over `Cents`, so the substitution is not a wrong number that a test has to
  // catch — it is a type error, and the disregard cannot be forgotten at the call site at all.
  const result = tsc("division293Tax({ fy: '2026-27', income: surchargeIncome(LIMBS), lowTaxContributions: LTC });");
  assert.equal(result.ok, false);
  assert.match(result.output, /SURCHARGE_INCOME|DIV_293_INCOME|not assignable/);
});

test('MUTATION — a hand-built low tax contributions figure will not compile', () => {
  // The brand is on the object, not just on the amount, so the only ways to obtain one are the two
  // constructors. A literal cannot carry a confidence it did not earn, and a raw
  // `ConcessionalContributions` total with the s 293-25(b) excess still in it has no route here.
  const result = tsc(
    "division293Tax({ fy: '2026-27', income: div293Income(LIMBS), lowTaxContributions: { fy: '2026-27', " +
      'lowTaxContributedAmounts: toCents(15_000), excessConcessionalContributions: toCents(0), ' +
      "amount: toCents(15_000), provenance: { fy: '2026-27', confidence: 'primary-verified', caveats: [] } } });",
  );
  assert.equal(result.ok, false);
  assert.match(result.output, /LOW_TAX_CONTRIBUTIONS|not assignable/);
});
