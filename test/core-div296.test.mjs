// P3-5a — Division 296. ITAA 1997 ss 296-20, 296-25, 296-30, 296-35, 296-40, 296-45, 296-50,
// 296-60 and 296-65; Income Tax (Transitional Provisions) Act 1997 ss 296-1(2) and 296-60(2);
// Superannuation (BSFSS) Imposition Act 2026 s 5. Register §3.7, traps T11, T12, T15 and T16.
//
// Every expected figure below is hand-worked from §3.7, with the arithmetic written out beside it.
// Nothing here was produced by running the implementation. Unlike Div 293 there is **no published
// worked example** anywhere in the register or in `docs/research/p1-super-caps.md` — §3.7 gives the
// algorithm and the parameters and no numbers to check them against. That absence is the reason
// the two structural mistakes get their own explicit "and this is what the wrong answer would have
// been" line: a suite hand-worked against a silent spec is exactly how a wrong golden value gets
// enshrined, so each fixture below states the rival reading's number as well as the right one.
//
// **The T16 fixture is the one that had to be constructed rather than found.** "The closing
// balance alone" and "the greater of opening and closing" give the *same* answer whenever the
// closing balance is the larger, which is the ordinary case for a growing balance — so a suite
// full of ordinary fixtures tests T16 not at all. Every T16 assertion here runs a Person whose
// balance **fell** during the year ($12,000,000 → $4,000,000), in FY2026-27 and FY2027-28, and
// there is a control fixture asserting that a rising balance cannot tell the two rules apart.
//
// NOT covered here, and not built: the Condition of Release, accumulation versus retirement phase,
// franking inside super, TTR, the transfer balance cap and the minimum drawdown.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { toCents } from '../dist/core/money.js';
import { SUPERANNUATION, cpiSeries } from '../dist/data/assumptions/index.js';
import { decemberQuarterBefore, totalSuperBalance } from '../dist/core/superCaps.js';
import {
  NO_DIV_296_EXCLUSION,
  div296FundEarnings,
  div296Tax,
  div296Thresholds,
  superannuationEarnings,
  superannuationEarningsFromWholeFund,
  totalSuperBalanceReference,
} from '../dist/core/div296.js';

const DIV_296 = SUPERANNUATION.division296;
const SPECS = SUPERANNUATION.capIndexation;
const REGISTER_CPI = SPECS.cpiDecemberQuarterIndexNumbers.value;

// --- The synthetic CPI series, and why one is allowed here ---------------------------------------
//
// Both Division 296 thresholds index from the **December 2025** quarter, which is the most recent
// December quarter the ABS has published. The base quarter is the newest number in the series, so
// there is no later December quarter in existence to index *to* and the published data yields
// exactly one computable year — FY2026-27, at a factor of exactly 1. That is a real limit of the
// world, not of the register, and it has a consequence for this suite: with one computable year, a
// **correct literal** hard-coded in place of the indexation passes every test that can be written
// from published numbers. The canary cannot sing.
//
// So the years after FY2026-27 are driven by a **synthetic** series, clearly labelled as one —
// unverified, sourced "synthetic test driver — not published", on a reference base that names
// itself as not an ABS series. It exercises machinery; it asserts nothing about the real world, and
// no number in it may ever appear under `src/`. The December 2025 denominator is read from the
// register's own record rather than re-typed, so the factor is measured against the real base
// quarter and a changed register number changes these expectations instead of hiding from them.

const syntheticSeries = (laterQuarters) =>
  cpiSeries({
    referenceBase: 'SYNTHETIC test base — not an ABS series',
    source: 'synthetic test driver — not published',
    confidence: 'unverified',
    indexNumbers: { '2025-12-31': REGISTER_CPI.indexNumbers['2025-12-31'], ...laterQuarters },
  });

/** Dec 2026 = 102.33 and Dec 2027 = 109.65, both invented. See the working at each fixture. */
const SYNTHETIC_FORWARD = syntheticSeries({ '2026-12-31': 102.33, '2027-12-31': 109.65 });

// --- Fixtures -----------------------------------------------------------------------------------
//
// The balances are stated at the two 30 Junes each financial year has: `2026-06-30` is just before
// FY2026-27 begins and `2027-06-30` is the day it ends.

const reference = (fy, openingDollars, closingDollars, deceasedDuringYear = false) => {
  const start = Number(fy.slice(0, 4));
  return totalSuperBalanceReference({
    fy,
    opening: totalSuperBalance(`${start}-06-30`, toCents(openingDollars)),
    closing: totalSuperBalance(`${start + 1}-06-30`, toCents(closingDollars)),
    deceasedDuringYear,
  });
};

const assess = (fy, openingDollars, closingDollars, earningsDollars, exclusions = NO_DIV_296_EXCLUSION) =>
  div296Tax({
    reference: reference(fy, openingDollars, closingDollars),
    earnings: superannuationEarnings({ fy, amount: toCents(earningsDollars) }),
    exclusions,
  });

// --- The parameters, read from the register and not from the module -----------------------------

test('§3.7 — the thresholds and rates this suite hand-works from', () => {
  const thresholds = div296Thresholds('2026-27');
  assert.equal(thresholds.large, toCents(3_000_000));
  assert.equal(thresholds.veryLarge, toCents(10_000_000));
  assert.equal(thresholds.large, DIV_296.largeBalanceThreshold.value);
  assert.equal(thresholds.veryLarge, DIV_296.veryLargeBalanceThreshold.value);
  assert.equal(DIV_296.baseRate.value, 0.15);
  assert.equal(DIV_296.additionalRate.value, 0.1);
  assert.equal(thresholds.provenance.confidence, 'primary-verified');
});

// --- s 296-40: below, at, and above the large super balance threshold ---------------------------

test('nil below the large super balance threshold — no proportion, no charge', () => {
  // Reference $2,500,000, which is under $3,000,000. Earnings of $100,000 are untouched.
  const assessment = assess('2026-27', 2_000_000, 2_500_000, 100_000);
  assert.equal(assessment.totalSuperBalanceReference.value, toCents(2_500_000));
  assert.deepEqual(assessment.proportions, []);
  assert.equal(assessment.taxableSuperannuationEarnings, toCents(0));
  assert.equal(assessment.tax, toCents(0));
});

test('"exceeds" is strict — a reference of exactly $3,000,000 is not over the threshold', () => {
  const assessment = assess('2026-27', 2_900_000, 3_000_000, 100_000);
  assert.equal(assessment.tax, toCents(0));
  // One cent more is over it: (300,000,001 − 300,000,000) / 300,000,001 × 100 = 0.00000033%,
  // which rounds to 0.00% at two decimal places, so the charge is still nil — the threshold is a
  // taper on the *balance*, not a cliff, and the first dollars over it are worth nothing.
  const justOver = div296Tax({
    reference: totalSuperBalanceReference({
      fy: '2026-27',
      opening: totalSuperBalance('2026-06-30', toCents(2_900_000)),
      closing: totalSuperBalance('2027-06-30', (toCents(3_000_000) + 1)),
      deceasedDuringYear: false,
    }),
    earnings: superannuationEarnings({ fy: '2026-27', amount: toCents(100_000) }),
    exclusions: NO_DIV_296_EXCLUSION,
  });
  assert.equal(justOver.proportions[0].percentage, 0);
  assert.equal(justOver.tax, toCents(0));
});

test('between the thresholds — one proportion of the earnings, taxed at 15%', () => {
  // Reference $4,000,000. s 296-40(3): (4,000,000 − 3,000,000) / 4,000,000 × 100 = 25.00%.
  // Taxable superannuation earnings = 25% × $200,000 = $50,000.
  // Imposition Act s 5: 15% × $50,000 = $7,500. No s 296-45 component below $10,000,000.
  const assessment = assess('2026-27', 3_500_000, 4_000_000, 200_000);
  assert.equal(assessment.proportions[0].percentage, 25);
  assert.equal(assessment.taxableSuperannuationEarnings, toCents(50_000));
  assert.equal(assessment.veryLargeBalanceEarningsComponent, toCents(0));
  assert.equal(assessment.proportions[1].percentage, 0);
  assert.equal(assessment.tax, toCents(7_500));
});

// --- ss 296-40(3) and 296-45(3): 2 dp, rounding up at the third decimal -------------------------

test('the percentage rounds UP where the third decimal is 5 or more', () => {
  // Reference $3,500,000: (500,000 / 3,500,000) × 100 = 14.285714...%. The third decimal is 5,
  // so it rounds up to 14.29% — truncation would give 14.28%.
  // 14.29% × $100,000 = $14,290.00; 15% of that = $2,143.50.
  const assessment = assess('2026-27', 3_000_000, 3_500_000, 100_000);
  assert.equal(assessment.proportions[0].percentage, 14.29);
  assert.equal(assessment.taxableSuperannuationEarnings, toCents(14_290));
  assert.equal(assessment.tax, toCents(2_143.5));
  // Truncating to two decimals instead: 14.28% × $100,000 = $14,280; 15% = $2,142.00.
  assert.notEqual(assessment.tax, toCents(2_142));
});

test('the percentage rounds DOWN where the third decimal is under 5 — it is not a ceiling', () => {
  // Reference $7,200,000: (4,200,000 / 7,200,000) × 100 = 58.3333...%. The third decimal is 3,
  // so it stays 58.33%. 58.33% × $100,000 = $58,330; 15% of that = $8,749.50.
  const assessment = assess('2026-27', 7_000_000, 7_200_000, 100_000);
  assert.equal(assessment.proportions[0].percentage, 58.33);
  assert.equal(assessment.tax, toCents(8_749.5));
  // Rounding every percentage up — a ceiling at two decimals — gives 58.34%: $58,340 and $8,751.00.
  assert.notEqual(assessment.tax, toCents(8_751));
});

// --- T15: above the very large super balance threshold ------------------------------------------

test('T15 — above $10,000,000 the two proportions are taken of the SAME earnings', () => {
  // Reference $12,000,000, total superannuation earnings $1,000,000.
  //   s 296-40(3): (12,000,000 − 3,000,000) / 12,000,000 × 100 = 75.00%
  //   s 296-45(3): (12,000,000 − 10,000,000) / 12,000,000 × 100 = 16.6666...% → 16.67%
  //   taxable superannuation earnings      = 75.00% × $1,000,000 = $750,000
  //   very large balance earnings component = 16.67% × $1,000,000 = $166,700
  //   tax = 15% × $750,000 + 10% × $166,700 = $112,500 + $16,670 = $129,170
  const assessment = assess('2026-27', 11_000_000, 12_000_000, 1_000_000);
  assert.equal(assessment.proportions[0].percentage, 75);
  assert.equal(assessment.proportions[1].percentage, 16.67);
  assert.equal(assessment.taxableSuperannuationEarnings, toCents(750_000));
  assert.equal(assessment.veryLargeBalanceEarningsComponent, toCents(166_700));
  assert.equal(assessment.proportions[0].tax, toCents(112_500));
  assert.equal(assessment.proportions[1].tax, toCents(16_670));
  assert.equal(assessment.tax, toCents(129_170));

  // The three wrong readings, each with the number it would have produced. All of them agree with
  // the right answer below $10,000,000, which is why this fixture sits above it.
  //
  //   marginal bands — the s 296-45 slice carved OUT of the s 296-40 slice rather than added to it:
  //     15% × ($750,000 − $166,700) + 10% × $166,700 = $87,495 + $16,670 = $104,165
  assert.notEqual(assessment.tax, toCents(104_165));
  //   both rates on the same proportion: 15% × $750,000 + 10% × $750,000 = $187,500
  assert.notEqual(assessment.tax, toCents(187_500));
  //   the rates swapped: 10% × $750,000 + 15% × $166,700 = $75,000 + $25,005 = $100,005
  assert.notEqual(assessment.tax, toCents(100_005));

  // The structure itself, asserted rather than inferred from the total: both proportions are
  // proportions of one and the same earnings figure, and each amount is that figure times its own
  // percentage — never times a remainder of it.
  assert.equal(assessment.proportions.length, 2);
  for (const proportion of assessment.proportions) {
    assert.equal(proportion.amount, toCents((1_000_000 * proportion.percentage) / 100));
  }
});

test('T15 — the additional 10% is on top of the 15%, not instead of it', () => {
  // The same Person, one dollar of balance either side of $10,000,000, is the smallest check that
  // the s 296-45 component is additive. At $9,999,999.99 there is no second proportion at all.
  const under = assess('2026-27', 9_000_000, 9_999_999.99, 1_000_000);
  const over = assess('2026-27', 9_000_000, 12_000_000, 1_000_000);
  assert.equal(under.veryLargeBalanceEarningsComponent, toCents(0));
  assert.ok(over.tax > over.proportions[0].tax);
  assert.equal(over.tax, toCents(129_170));
});

// --- T16: the first year is different -----------------------------------------------------------

test('T16 — a balance that FELL: FY2026-27 reads the closing balance alone', () => {
  // Opening $12,000,000 at 30 Jun 2026, closing $4,000,000 at 30 Jun 2027. Transitional
  // s 296-1(2) strikes out the opening limb, so the reference is $4,000,000.
  const fell = reference('2026-27', 12_000_000, 4_000_000);
  assert.equal(fell.value, toCents(4_000_000));
  assert.notEqual(fell.value, toCents(12_000_000));

  // And the tax that follows: 25.00% × $200,000 = $50,000; 15% = $7,500.
  const assessment = assess('2026-27', 12_000_000, 4_000_000, 200_000);
  assert.equal(assessment.tax, toCents(7_500));

  // Applying max(opening, closing) here would give a reference of $12,000,000:
  //   75.00% × $200,000 = $150,000 → 15% = $22,500
  //   16.67% × $200,000 = $33,340  → 10% = $3,334
  //   total $25,834 — three and a half times the right answer.
  assert.notEqual(assessment.tax, toCents(25_834));
});

test('T16 — the same balance in FY2027-28 reads max(opening, closing)', () => {
  // Opening $12,000,000 at 30 Jun 2027, closing $4,000,000 at 30 Jun 2028. From 2027-28 the
  // opening limb is back: s 296-40(2) takes the greater, which is $12,000,000.
  const fell = reference('2027-28', 12_000_000, 4_000_000);
  assert.equal(fell.value, toCents(12_000_000));
  assert.notEqual(fell.value, toCents(4_000_000));

  // The two years disagree on the same pair of balances. That disagreement is the whole of T16.
  assert.notEqual(reference('2026-27', 12_000_000, 4_000_000).value, fell.value);
});

test('T16 — a RISING balance cannot tell the two rules apart, which is why the fixture falls', () => {
  // $4,000,000 → $12,000,000. Closing alone and max(opening, closing) are both $12,000,000, in
  // both years. A suite built only from growing balances tests T16 not at all.
  assert.equal(reference('2026-27', 4_000_000, 12_000_000).value, toCents(12_000_000));
  assert.equal(reference('2027-28', 4_000_000, 12_000_000).value, toCents(12_000_000));
});

test('T16 — the rule is the assumptions layer\'s, quoted rather than restated', () => {
  assert.equal(reference('2026-27', 1_000_000, 2_000_000).rule, DIV_296.totalSuperBalanceReference.derivation);
  assert.match(reference('2027-28', 1_000_000, 2_000_000).rule, /max\(opening, closing\)/);
});

// --- T11: the thresholds are CPI-indexed, and the base quarter is the newest quarter there is ----

test('the base quarter IS the latest published December quarter — one computable year, and why', () => {
  // This is the fact the whole section turns on, asserted rather than described. Both specs index
  // from Dec 2025 (s 960-265 items 10B and 10C), and Dec 2025 is the last quarter in the register's
  // series. Nothing is missing from the register: the ABS has not published Dec 2026, because
  // Dec 2026 has not happened.
  const quarters = Object.keys(REGISTER_CPI.indexNumbers).sort();
  const latest = quarters[quarters.length - 1];
  assert.equal(SPECS.div296LargeBalanceThreshold.value.baseQuarter, '2025-12-31');
  assert.equal(SPECS.div296VeryLargeBalanceThreshold.value.baseQuarter, '2025-12-31');
  assert.equal(latest, '2025-12-31');
  assert.equal(decemberQuarterBefore('2026-27'), latest);

  // So FY2026-27's factor is one number over itself — exactly 1 on either reference base, which is
  // why the published year owes O41 nothing and stays primary-verified.
  assert.equal(REGISTER_CPI.indexNumbers['2025-12-31'] / REGISTER_CPI.indexNumbers['2025-12-31'], 1);
  assert.equal(decemberQuarterBefore('2027-28'), '2026-12-31');
  assert.equal(REGISTER_CPI.indexNumbers['2026-12-31'], undefined);
});

test('T11 — FY2027-28 is refused for a missing December quarter, not for a missing base', () => {
  // The refusal is `MissingIndexNumberError`: the quarter to index *to* does not exist yet. It is
  // not `UnsourcedIndexBaseError`, which would say the base quarter is unavailable — Dec 2025 is in
  // the register and has been since O11 closed on 2026-09-09.
  assert.throws(() => div296Thresholds('2027-28'), { name: 'MissingIndexNumberError' });
  assert.throws(
    () =>
      div296Tax({
        reference: reference('2027-28', 12_000_000, 4_000_000),
        earnings: superannuationEarnings({ fy: '2027-28', amount: toCents(200_000) }),
        exclusions: NO_DIV_296_EXCLUSION,
      }),
    { name: 'MissingIndexNumberError' },
  );
  // The reference balance and the fund earnings do not touch a threshold, so both stay available
  // for FY2027-28 — the refusal is as narrow as the missing quarter.
  assert.equal(reference('2027-28', 12_000_000, 4_000_000).value, toCents(12_000_000));
});

test('UnsourcedIndexBaseError survives on its own ground: a series that cannot supply Dec 2025', () => {
  // The only way to reach it now is to supply a series with the year's quarter and no base quarter
  // — a caller error, and a different failure from the one above. Both refusals stay named.
  const noBase = cpiSeries({
    referenceBase: 'SYNTHETIC test base — not an ABS series',
    source: 'synthetic test driver — not published',
    confidence: 'unverified',
    indexNumbers: { '2026-12-31': 102.33 },
  });
  assert.throws(() => div296Thresholds('2027-28', noBase), { name: 'UnsourcedIndexBaseError' });
});

// --- The canary: a second computable year, driven by the synthetic series ------------------------
//
// Hand-worked from §3.7 and s 960-285. Nothing below was produced by running the implementation.
//
//   factor = round_up_to_3dp(index(Dec before the FY) / index(Dec 2025 = 100.32))   s 960-285(5),(6)
//   LSBT   = floor_to_$150,000(3,000,000 × factor)                                  s 960-265 item 10B
//   VLSBT  = floor_to_$500,000(10,000,000 × factor)                                 s 960-265 item 10C

test('T11 — a 2% rise moves neither threshold: they plateau, they do not escalate smoothly', () => {
  // Dec 2026 = 102.33 (synthetic). 102.33 / 100.32 = 1.0200359 → factor 1.020.
  //   3,000,000 × 1.020 = 3,060,000 → floor $150,000 → $3,000,000 — unchanged after a 2% CPI rise.
  //  10,000,000 × 1.020 = 10,200,000 → floor $500,000 → $10,000,000 — unchanged.
  // The register's note is that CPI must lift $3,000,000 clear of $3,150,000, a cumulative 5% move,
  // before the large threshold changes at all. This is that year.
  const plateau = div296Thresholds('2027-28', SYNTHETIC_FORWARD);
  assert.equal(Math.floor((102.33 / 100.32) * 1000 + 0.5) / 1000, 1.02);
  assert.equal(plateau.large, toCents(3_000_000));
  assert.equal(plateau.veryLarge, toCents(10_000_000));
  // A model that escalated smoothly would have given 3,060,000 and 10,200,000 here.
  assert.notEqual(plateau.large, toCents(3_060_000));
  assert.notEqual(plateau.veryLarge, toCents(10_200_000));
  assert.equal(plateau.indexNumber.quarter, '2026-12-31');
  assert.equal(plateau.indexNumber.indexNumber, 102.33);
});

test('the canary — a 9.3% rise steps both thresholds, and a correct literal cannot survive it', () => {
  // Dec 2027 = 109.65 (synthetic). 109.65 / 100.32 = 1.0930024 → factor 1.093.
  //   3,000,000 × 1.093 = 3,279,000 → 3,279,000 / 150,000 = 21.86 → floor 21 → $3,150,000.
  //  10,000,000 × 1.093 = 10,930,000 → 10,930,000 / 500,000 = 21.86 → floor 21 → $10,500,000.
  const stepped = div296Thresholds('2028-29', SYNTHETIC_FORWARD);
  assert.equal(Math.floor((109.65 / 100.32) * 1000 + 0.5) / 1000, 1.093);
  assert.equal(stepped.large, toCents(3_150_000));
  assert.equal(stepped.veryLarge, toCents(10_500_000));

  // This is the assertion the FY2026-27 fixture cannot make: $3,000,000 is the RIGHT answer for the
  // only year published data reaches, so a hard-coded $3,000,000 is invisible there and wrong here.
  assert.notEqual(stepped.large, toCents(3_000_000));
  assert.notEqual(stepped.veryLarge, toCents(10_000_000));

  // Rounding to the nearest step instead of flooring: 21.86 rounds to 22.
  assert.notEqual(stepped.large, toCents(3_300_000));
  assert.notEqual(stepped.veryLarge, toCents(11_000_000));

  // The two step sizes swapped: $500,000 on the large threshold gives 6.558 → 6 → $3,000,000, and
  // $150,000 on the very large one gives 72.866 → 72 → $10,800,000.
  assert.notEqual(stepped.veryLarge, toCents(10_800_000));
  assert.equal(SPECS.div296LargeBalanceThreshold.value.roundingAmount, toCents(150_000));
  assert.equal(SPECS.div296VeryLargeBalanceThreshold.value.roundingAmount, toCents(500_000));
});

test('a computed year carries O41: the reference base is consumed and the figure is unverified', () => {
  // The published year is read off a primary-verified ATO record with the computation as a check,
  // and its factor is 1 on either reference base — so it owes O41 nothing. Any other year's factor
  // is a ratio of two quarters, the base decides the third decimal, and the result says so.
  assert.equal(div296Thresholds('2026-27').provenance.confidence, 'primary-verified');
  const computed = div296Thresholds('2028-29', SYNTHETIC_FORWARD);
  assert.equal(computed.provenance.confidence, 'unverified');
  assert.ok(computed.provenance.caveats.some((each) => each.includes('cpiReferenceBase')));
  assert.ok(computed.provenance.caveats.some((each) => each.includes('SYNTHETIC test base')));
  // And the published FY2026-27 records are not cited for a year they are not stamped for.
  assert.ok(!computed.provenance.caveats.some((each) => each.includes('largeBalanceThreshold is stamped')));
});

test('the stepped thresholds reach the assessment, and T16 rides with them into a second year', () => {
  // FY2028-29, balance falling $12,000,000 → $4,000,000, earnings $200,000. From FY2027-28 the
  // opening limb is back (T16), so the reference is $12,000,000 — and the thresholds are the
  // stepped ones, not FY2026-27's.
  //   (12,000,000 − 3,150,000) / 12,000,000 = 73.75%  → $147,500 → 15% = $22,125
  //   (12,000,000 − 10,500,000) / 12,000,000 = 12.50% → $25,000  → 10% =  $2,500
  //   total $24,625
  const assessment = div296Tax({
    reference: reference('2028-29', 12_000_000, 4_000_000),
    earnings: superannuationEarnings({ fy: '2028-29', amount: toCents(200_000) }),
    exclusions: NO_DIV_296_EXCLUSION,
    cpiSeries: SYNTHETIC_FORWARD,
  });
  assert.equal(assessment.totalSuperBalanceReference.value, toCents(12_000_000));
  assert.equal(assessment.thresholds.large, toCents(3_150_000));
  assert.deepEqual(assessment.proportions.map((each) => each.percentage), [73.75, 12.5]);
  assert.equal(assessment.taxableSuperannuationEarnings, toCents(147_500));
  assert.equal(assessment.veryLargeBalanceEarningsComponent, toCents(25_000));
  assert.equal(assessment.tax, toCents(24_625));

  // Frozen FY2026-27 thresholds under a FY2028-29 label would have given:
  //   75.00% × $200,000 = $150,000 → 15% = $22,500
  //   16.67% × $200,000 = $33,340  → 10% =  $3,334   (16.666...% rounds UP at the third decimal)
  //   total $25,834 — $1,209 too much, and every dollar of it from a threshold that did not move.
  assert.notEqual(assessment.tax, toCents(25_834));

  // Reading the closing balance alone, as FY2026-27 does, would put this Person under the large
  // threshold entirely: $4,000,000 against $3,150,000 is 21.25%, not nil — but the s 296-45 limb
  // would fall away completely and the tax would be $6,375.
  assert.notEqual(assessment.tax, toCents(6_375));
});

// --- T12: the application year, not the commencement date ---------------------------------------

test('T12 — nothing is assessed before FY2026-27', () => {
  assert.throws(() => div296Thresholds('2025-26'), { name: 'Div296NotApplicableError' });
  // A FY2025-26 reference balance cannot even be built: the opening limb would be measured at
  // 30 June 2025 and s 307-230A does not define a Total Super Balance before 30 June 2026 (§3.8),
  // so `superCaps` refuses one dated earlier. Two refusals stacked, each on its own ground.
  assert.throws(() => reference('2025-26', 4_000_000, 5_000_000), { name: 'TotalSuperBalanceDefinitionError' });
  assert.throws(() => superannuationEarnings({ fy: '2025-26', amount: toCents(100_000) }), {
    name: 'Div296NotApplicableError',
  });
  assert.throws(
    () =>
      div296FundEarnings({
        fy: '2025-26',
        components: {
          relevantTaxableIncome: toCents(1_000_000),
          netCapitalGain: toCents(0),
          assessableContributions: toCents(0),
          netExemptCurrentPensionIncome: toCents(0),
          nonArmsLengthComponent: toCents(0),
          pooledSuperannuationTrustComponent: toCents(0),
        },
        smallSuperannuationFund: false,
      }),
    { name: 'Div296NotApplicableError' },
  );
  // The commencement date is 1 April 2026 and it is not the application year.
  assert.equal(DIV_296.commencementDate.value, '2026-04-01');
  assert.equal(DIV_296.applicationYear.value, '2026-27');
});

// --- ss 296-20 and 296-25: the two exclusions ---------------------------------------------------

test('ss 296-20 and 296-25 — an excluded Person is not charged at all', () => {
  const child = assess('2026-27', 11_000_000, 12_000_000, 1_000_000, {
    childRecipientOfSuperannuationIncomeStream: true,
    structuredSettlementContributionEverMade: false,
  });
  assert.equal(child.tax, toCents(0));
  assert.match(child.excludedBy, /s 296-20/);
  // Without the exclusion this same Person owes $129,170.
  assert.equal(assess('2026-27', 11_000_000, 12_000_000, 1_000_000).tax, toCents(129_170));

  const settlement = assess('2026-27', 11_000_000, 12_000_000, 1_000_000, {
    childRecipientOfSuperannuationIncomeStream: false,
    structuredSettlementContributionEverMade: true,
  });
  assert.equal(settlement.tax, toCents(0));
  assert.match(settlement.excludedBy, /s 296-25/);
});

// --- Negative earnings: computed where §3.7 answers, refused where it does not -------------------

test('negative earnings below the very large threshold are nil, and say the loss goes nowhere', () => {
  // §3.7 guards the s 296-40 limb with "total superannuation earnings > 0", so there are no
  // taxable superannuation earnings and no charge. Both readings of §3.7 agree here.
  const assessment = assess('2026-27', 3_500_000, 4_000_000, -50_000);
  assert.equal(assessment.tax, toCents(0));
  assert.deepEqual(assessment.proportions, []);
  assert.ok(assessment.provenance.caveats.some((line) => /carries the loss/.test(line)));
});

test('negative earnings above the very large threshold are refused, not guessed', () => {
  // §3.7 puts no "> 0" guard on the s 296-45 limb: one reading gives nil, the other 10% of a
  // negative proportion. The two answers differ, so this refuses.
  assert.throws(() => assess('2026-27', 11_000_000, 12_000_000, -50_000), { name: 'Div296NegativeEarningsError' });
});

// --- s 296-50: the balance after death -----------------------------------------------------------

test('s 296-50 — in FY2026-27 a Person who died has a nil reference and no charge', () => {
  const assessment = div296Tax({
    reference: reference('2026-27', 12_000_000, 12_000_000, true),
    earnings: superannuationEarnings({ fy: '2026-27', amount: toCents(1_000_000) }),
    exclusions: NO_DIV_296_EXCLUSION,
  });
  assert.equal(assessment.totalSuperBalanceReference.value, toCents(0));
  assert.equal(assessment.tax, toCents(0));
});

test('s 296-50 — from FY2027-28 the opening limb makes the section ambiguous, and it is refused', () => {
  assert.throws(() => reference('2027-28', 12_000_000, 12_000_000, true), {
    name: 'TotalSuperBalanceAfterDeathError',
  });
  // Where the opening balance was nil the two readings agree again, and it computes.
  assert.equal(reference('2027-28', 0, 12_000_000, true).value, toCents(0));
});

// --- The two balances must be the two balances that year has ------------------------------------

test('a balance from the wrong 30 June is an error, not a plausible number', () => {
  assert.throws(
    () =>
      totalSuperBalanceReference({
        fy: '2026-27',
        opening: totalSuperBalance('2027-06-30', toCents(4_000_000)),
        closing: totalSuperBalance('2027-06-30', toCents(4_000_000)),
        deceasedDuringYear: false,
      }),
    { name: 'Div296BalanceDateError' },
  );
  assert.throws(
    () =>
      totalSuperBalanceReference({
        fy: '2026-27',
        opening: totalSuperBalance('2026-06-30', toCents(4_000_000)),
        closing: totalSuperBalance('2026-06-30', toCents(4_000_000)),
        deceasedDuringYear: false,
      }),
    { name: 'Div296BalanceDateError' },
  );
});

test('the date check states the T16 ground for FY2026-27, not the s 296-40(2) one', () => {
  // CORRECTED 2026-09-10. The message grounded the check in s 296-40(2) reading a balance "just
  // before the start of the year" — and in FY2026-27 it does not: transitional s 296-1(2) strikes
  // the opening limb out (T16) and `div296TotalSuperBalanceReference` discards the opening value
  // entirely, yet the opening DATE is still enforced in the only year published data can compute.
  // The check stays — a mis-stamped balance still suggests the two dates were swapped, which puts
  // the opening figure into the closing limb that year does read — and the ground says so.
  let message = '';
  assert.throws(
    () =>
      totalSuperBalanceReference({
        fy: '2026-27',
        opening: totalSuperBalance('2027-06-30', toCents(4_000_000)),
        closing: totalSuperBalance('2027-06-30', toCents(4_000_000)),
        deceasedDuringYear: false,
      }),
    (error) => {
      message = error.message;
      return error.name === 'Div296BalanceDateError';
    },
  );
  assert.match(message, /296-1\(2\)/);
  assert.match(message, /T16/);
  assert.match(message, /swapped/);
  // MUTATION — the s 296-40(2) ground may stay, but only qualified by the years it holds in. The
  // old message asserted it unqualified, which is false for FY2026-27, so the qualifier is the
  // thing under test: reinstating the old sentence loses it.
  assert.match(message, /From FY2027-28, ITAA 1997 s 296-40\(2\) reads/);
  assert.equal((message.match(/s 296-40\(2\) reads/g) ?? []).length, 1);
});

test('one year\'s earnings against another year\'s balance is refused', () => {
  assert.throws(
    () =>
      div296Tax({
        reference: reference('2026-27', 3_500_000, 4_000_000),
        earnings: superannuationEarnings({ fy: '2027-28', amount: toCents(200_000) }),
        exclusions: NO_DIV_296_EXCLUSION,
      }),
    /FY2027-28/,
  );
});

// --- s 296-60: fund earnings, and the transitional CGT phase-in ---------------------------------

const COMPONENTS = Object.freeze({
  relevantTaxableIncome: toCents(1_000_000),
  netCapitalGain: toCents(500_000),
  assessableContributions: toCents(200_000),
  netExemptCurrentPensionIncome: toCents(100_000),
  nonArmsLengthComponent: toCents(50_000),
  pooledSuperannuationTrustComponent: toCents(20_000),
});

const fundEarnings = (fy, smallSuperannuationFund = false) =>
  div296FundEarnings({ fy, components: COMPONENTS, smallSuperannuationFund });

test('s 296-60(1) — five limbs, two of which subtract', () => {
  // $1,000,000 − $200,000 + $100,000 − $50,000 + $20,000 = $870,000 before the transitional
  // discount. In FY2030-31 the provision is spent, so $870,000 is also the answer.
  assert.equal(fundEarnings('2030-31').amount, toCents(870_000));
  assert.equal(fundEarnings('2030-31').netCapitalGainFactor, 1);
  // Adding where the section subtracts — assessable contributions and the non-arm's-length
  // component — would give $1,000,000 + $200,000 + $100,000 + $50,000 + $20,000 = $1,370,000.
  assert.notEqual(fundEarnings('2030-31').amount, toCents(1_370_000));
});

test('ITTPA s 296-60(2) — the factor is the share of the net capital gain that COUNTS', () => {
  // Base $870,000, with a $500,000 net capital gain inside the taxable income.
  //   FY2026-27, factor 0.2: the gain counts as $100,000, so $400,000 comes out → $470,000
  //   FY2027-28, factor 0.4: $200,000 counts, $300,000 comes out          → $570,000
  //   FY2028-29, factor 0.6: $300,000 counts, $200,000 comes out          → $670,000
  //   FY2029-30, factor 0.8: $400,000 counts, $100,000 comes out          → $770,000
  //   FY2030-31 onward: spent, the whole gain counts                      → $870,000
  assert.equal(fundEarnings('2026-27').amount, toCents(470_000));
  assert.equal(fundEarnings('2027-28').amount, toCents(570_000));
  assert.equal(fundEarnings('2028-29').amount, toCents(670_000));
  assert.equal(fundEarnings('2029-30').amount, toCents(770_000));
  assert.equal(fundEarnings('2030-31').amount, toCents(870_000));

  assert.equal(fundEarnings('2026-27').netCapitalGainFactor, 0.2);
  assert.equal(fundEarnings('2026-27').netCapitalGainDiscount, toCents(400_000));

  // Reading the factor the other way — as the share removed — would ramp inclusion DOWN from 80%
  // to 20% and then jump to 100% when the provision is spent. FY2026-27 would be $570,000.
  assert.notEqual(fundEarnings('2026-27').amount, toCents(570_000));
  // Offsetting the phase-in by one year would give FY2026-27 the 0.4 factor: also $570,000, and
  // FY2029-30 the 0.6 factor: $670,000 instead of $770,000.
  assert.notEqual(fundEarnings('2029-30').amount, toCents(670_000));

  // The four factors, read from the register rather than from the module.
  const factors = DIV_296.transitionalNetCapitalGainFactor;
  assert.deepEqual(
    ['2026-27', '2027-28', '2028-29', '2029-30'].map((fy) => factors[fy].value),
    [0.2, 0.4, 0.6, 0.8],
  );
  for (const fy of ['2026-27', '2027-28', '2028-29', '2029-30']) assert.equal(factors[fy].fy, fy);
});

test('s 296-60(3) — a small superannuation fund gets no discount, and is told why', () => {
  const small = fundEarnings('2026-27', true);
  assert.equal(small.netCapitalGainFactor, 1);
  assert.equal(small.netCapitalGainDiscount, toCents(0));
  assert.equal(small.amount, toCents(870_000));
  assert.notEqual(small.amount, fundEarnings('2026-27').amount);
  assert.ok(small.provenance.caveats.some((line) => /cost bases at\s+30 June 2026/.test(line)));
});

test('a net capital loss is not a negative net capital gain', () => {
  assert.throws(
    () =>
      div296FundEarnings({
        fy: '2026-27',
        components: { ...COMPONENTS, netCapitalGain: toCents(-100_000) },
        smallSuperannuationFund: false,
      }),
    /net capital gain cannot be negative/,
  );
});

// --- s 296-65: attribution ----------------------------------------------------------------------

test('s 296-65 — fund earnings cannot be attributed on a basis the register does not carry', () => {
  assert.throws(
    () => superannuationEarningsFromWholeFund({ fund: fundEarnings('2026-27', true), personHoldsWholeFund: false }),
    { name: 'Div296AttributionBasisError' },
  );
});

test('the attribution refusal states the WEAKER absence: retrieved but unread, not never retrieved', () => {
  // CORRECTED 2026-09-10. The message asserted "neither set of regulations was retrieved", and
  // O17 records the opposite for the s 296-65(5) limb: F2026L00726 WAS retrieved — regs 296-65.01,
  // 296-70.01 (prescribed factor 0.825) and 296-70.02 — and was "not read in full"
  // (docs/research/p1-super-caps.md §8 item 2). §3.7 cites that same instrument at
  // `primary-verified` for the CGT phase-in factors. For the s 296-65(3) limb no document says
  // either way. *Retrieved but unread* is a weaker argument from absence than *never retrieved*
  // and R6 forbids recording the stronger one; asserting an unchecked negative inside a refusal
  // is O70, and this is O70 in a second module.
  let message = '';
  assert.throws(
    () => superannuationEarningsFromWholeFund({ fund: fundEarnings('2026-27', true), personHoldsWholeFund: false }),
    (error) => {
      message = error.message;
      return error.name === 'Div296AttributionBasisError';
    },
  );
  // The true position, and the instrument that falsifies the old one.
  assert.match(message, /WERE retrieved/);
  assert.match(message, /NOT READ IN FULL/);
  assert.match(message, /F2026L00726/);
  assert.match(message, /O17/);
  // The refusal's surviving ground — narrower, and untouched by O17.
  assert.match(message, /no source/);
  assert.match(message, /cannot be implemented/);
  // MUTATION — the false negative may not return in any of the shapes it has worn. The refusal
  // stays; only its ground was wrong, and a message that says "not retrieved" is asserting a
  // cross-pass negative nobody checked.
  assert.doesNotMatch(message, /neither set of regulations/i);
  assert.doesNotMatch(message, /was not retrieved|were not retrieved|never retrieved|not been retrieved/i);
});

test('s 296-65 — the whole-fund route is unverified, and only that route', () => {
  const stated = superannuationEarnings({ fy: '2026-27', amount: toCents(870_000) });
  assert.equal(stated.provenance.confidence, 'primary-verified');

  const attributed = superannuationEarningsFromWholeFund({
    fund: fundEarnings('2026-27', true),
    personHoldsWholeFund: true,
  });
  assert.equal(attributed.amount, toCents(870_000));
  assert.equal(attributed.provenance.confidence, 'unverified');

  // The weakness reaches the charge, and the small fund's cost-base caveat travels with it:
  // reference $4,000,000 → 25.00% × $870,000 = $217,500 → 15% = $32,625.
  const assessment = div296Tax({
    reference: reference('2026-27', 3_500_000, 4_000_000),
    earnings: attributed,
    exclusions: NO_DIV_296_EXCLUSION,
  });
  assert.equal(assessment.tax, toCents(32_625));
  assert.equal(assessment.provenance.confidence, 'unverified');
  assert.ok(assessment.provenance.caveats.some((line) => /cost bases at\s+30 June 2026/.test(line)));

  // The same charge from a stated figure keeps the stronger label — a blanket caveat on every
  // Division 296 number would stop meaning anything.
  const fromStated = div296Tax({
    reference: reference('2026-27', 3_500_000, 4_000_000),
    earnings: stated,
    exclusions: NO_DIV_296_EXCLUSION,
  });
  assert.equal(fromStated.tax, toCents(32_625));
  assert.equal(fromStated.provenance.confidence, 'primary-verified');
});

// --- Every DIV_296 record has an importer, except the one forbidden from having one --------------

test('the only Div 296 record nothing computes from is the commencement date, as its note requires', () => {
  assert.match(DIV_296.commencementDate.note, /Nothing may compute from it/);
  const source = SUPERANNUATION.division296;
  assert.deepEqual(
    Object.keys(source).sort(),
    [
      'additionalRate',
      'applicationYear',
      'baseRate',
      'commencementDate',
      'earningsBasis',
      'exclusions',
      'largeBalanceThreshold',
      'percentageRounding',
      'totalSuperBalanceAfterDeath',
      'totalSuperBalanceReference',
      'transitionalNetCapitalGainFactor',
      'veryLargeBalanceThreshold',
    ],
    'a new Div 296 record needs an importer in core/div296.ts, or a reason it may not have one',
  );
});

// --- The structural defences, asserted against the source ----------------------------------------
//
// ADDED 2026-09-10. Nothing above reads this module's source text, and until today nothing in the
// suite did: `div296.ts` was one of the two substantial core modules with no raw-source canary.
// That was demonstrated, not suspected — a mutation reinstating the O70 false negative in a
// `div296.ts` *comment* failed ZERO tests, while the same sentence in a *message* was caught by
// the runtime test above. Comment-level and structural corrections in this file were unenforceable
// by construction. Everything below exists to make them enforceable.

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = join(ROOT, 'src');
const RAW = readFileSync(join(SRC, 'core', 'div296.ts'), 'utf8');

/** Comments and strings quote the register on purpose; most greps below are about the *code*. */
const executableCode = (text) =>
  text
    .replaceAll(/\/\*[\s\S]*?\*\//g, '')
    .replaceAll(/`(?:[^`\\]|\\.)*`|'(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*"|\/\/.*$/gm, (match) =>
      match.startsWith('//') ? '' : '""',
    );

/** Comments stripped, string literals KEPT — for greps about what is *written at a call site*. */
const codeWithStrings = (text) =>
  text
    .replaceAll(/\/\*[\s\S]*?\*\//g, '')
    .replaceAll(/`(?:[^`\\]|\\.)*`|'(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*"|\/\/.*$/gm, (match) =>
      match.startsWith('//') ? '' : match,
    );

/** Every word in the file — comment markers removed, whitespace flattened so a claim that wraps across lines still reads as one sentence. */
const flatten = (text) => text.replaceAll(/^[ \t]*(?:\/\/|\*\/|\/\*\*?|\*)[ \t]?/gm, '').replaceAll(/\s+/g, ' ');

const CODE = executableCode(RAW);
const WRITTEN = codeWithStrings(RAW);
const PROSE = flatten(RAW);

test('the source greps are not vacuous — stripping leaves the executable code behind', () => {
  assert.match(CODE, /\bexport const div296Tax\b/);
  assert.match(CODE, /\bexport const totalSuperBalanceReference\b/);
  assert.match(CODE, /\bexport const div296Thresholds\b/);
  assert.ok(CODE.length > 2000, `the executable-code derivation collapsed to ${CODE.length} characters`);
  // The three derivations differ in exactly the way they are relied on to differ.
  assert.match(executableCode("const x = 0.15; // 15%\nconst y = '2026-27';"), /0\.15/);
  assert.doesNotMatch(executableCode("const y = '2026-27'; // note"), /2026-27/);
  assert.match(codeWithStrings("const y = '2026-27'; // note"), /'2026-27'/);
  assert.doesNotMatch(codeWithStrings("// a comment mentioning '2026-27'"), /2026-27/);
  assert.match(flatten('//     wrapped across\n//     two lines'), /wrapped across two lines/);
});

test('MUTATION — no dollar amount, rate, threshold or factor is written as a literal (T14)', () => {
  // The file's own header says it: "A dollar amount, a rate or a factor appearing below as a
  // literal is a bug — every one of them is read from `data/assumptions/super.ts`." No fixture can
  // see the difference while a written literal still agrees with its record — that is the whole
  // shape of T14 drift — so the defence is that there is no such literal to disagree later.
  const literals = [...CODE.matchAll(/(?<![\w.])\d[\d_]*(?:\.\d+)?/g)].map(([match]) => match);
  assert.deepEqual(
    [...new Set(literals)].sort(),
    ['0', '0.5', '100', '1'].sort(),
    'the only numbers this module may write are structural: 0 (nil and the sign tests), 1 (the ' +
      'no-discount identity for a year with no prescribed factor), and 100 / 0.5 (the percentage ' +
      'rounding mechanics of §3.7). A dollar amount, rate, threshold or factor belongs in ' +
      'data/assumptions/super.ts and is read from there — see the head of src/core/div296.ts',
  );
  for (const forbidden of [/\b0\.15\b/, /\b0\.1\b/, /\b0\.3\b/, /\b0\.4\b/, /3_?000_?000/, /10_?000_?000/, /\b15\b/, /\b30\b/]) {
    assert.doesNotMatch(CODE, forbidden, `${forbidden} must be read from a record, never written here`);
  }
  // And the records the arithmetic actually reads, so the literal ban cannot be satisfied by
  // deleting the arithmetic instead.
  assert.match(CODE, /const rate = DIVISION_296\.baseRate;/);
  assert.match(CODE, /const additionalRate = DIVISION_296\.additionalRate;/);
  assert.match(CODE, /proportionOfTheYearsEarnings\("", thresholds\.large, rate\.value\)/);
  assert.match(CODE, /proportionOfTheYearsEarnings\("", thresholds\.veryLarge, additionalRate\.value\)/);
  assert.match(CODE, /TRANSITIONAL_FACTORS: Readonly<Record<string, Rate \| undefined>> = DIVISION_296\.transitionalNetCapitalGainFactor/);
});

test('MUTATION — the prescribed factor 0.825 is in no source file, because its regulation is unread', () => {
  // O17: F2026L00726 reg 296-70.01 prescribes 0.825, and the instrument was retrieved and NOT read
  // in full. `superannuationEarningsFromWholeFund` refuses small-fund attribution for exactly that
  // reason. Writing the factor into src/ would be implementing a regulation nobody has read, so
  // the number is kept in the register's prose and in this suite's commentary and nowhere else.
  const sources = function* (dir) {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const path = join(dir, entry.name);
      if (entry.isDirectory()) yield* sources(path);
      else if (entry.name.endsWith('.ts')) yield path;
    }
  };
  const offenders = [...sources(SRC)].filter((file) => /0\.825|\b825\b/.test(readFileSync(file, 'utf8')));
  assert.deepEqual(
    offenders,
    [],
    'the s 296-70.01 prescribed factor may not appear anywhere under src/ — the regulation that ' +
      'prescribes it was retrieved and left unread (O17), and an unread regulation cannot be implemented',
  );
});

test('MUTATION — T15: one earnings figure, closed over, and no parameter a second base can arrive through', () => {
  // ss 296-40 and 296-45 each compute a proportion of the SAME total superannuation earnings; the
  // "30% / 40% marginal bands" reading is the intuitive mistake and it reconciles below $10m. The
  // defence is shape, not arithmetic: `div296Tax` takes exactly one earnings parameter, branded so
  // that a `Cents` slice is not assignable to it, and the proportion closure takes no earnings
  // argument at all — it closes over the one figure. A band calculation has no base to use.
  const signature = /export const div296Tax = \(input: \{([\s\S]*?)\n\}\): Div296Assessment/.exec(CODE)?.[1] ?? '';
  assert.ok(signature.length > 0, 'div296Tax has gone or changed shape');
  assert.deepEqual(
    [...signature.matchAll(/readonly (\w+\??): ([\w<>, |]+);/g)].map(([, key, type]) => `${key}: ${type}`),
    [
      'reference: TotalSuperBalanceReference',
      'earnings: SuperannuationEarnings',
      'exclusions: Div296ExclusionFacts',
      'cpiSeries?: CpiSeries',
    ],
    'a fifth field here is a second way for a number to enter the charge. A second earnings base ' +
      'is the T15 mutation: both proportions must be proportions of the one figure',
  );
  // The brand — a private-member witness class as of P3-41 chunk 2 — and the two public
  // constructors that are the only way to make one.
  assert.match(RAW, /declare class SuperannuationEarningsWitness \{ private readonly \[SUPERANNUATION_EARNINGS\]: true \}/);
  assert.match(RAW, /export type SuperannuationEarnings = SuperannuationEarningsFigure & SuperannuationEarningsWitness;/);
  assert.match(CODE, /export const superannuationEarnings = \(input: \{ readonly fy: FinancialYear; readonly amount: Cents \}\): SuperannuationEarnings/);
  assert.match(CODE, /export const superannuationEarningsFromWholeFund = \(input: \{/);

  // The closure: three parameters, none of them an earnings figure or a Cents base.
  const closure = /const proportionOfTheYearsEarnings = \(([\s\S]*?)\): Div296EarningsProportion =>/.exec(CODE)?.[1] ?? '';
  assert.deepEqual(
    [...closure.matchAll(/^\s*(\w+): ([\w<>\[\]'" |]+),$/gm)].map(([, key]) => key),
    ['section', 'threshold', 'proportionRate'],
    'the proportion closure must take the section, its threshold and its rate — and read the ' +
      'earnings it applies to off the single figure it closes over',
  );
  assert.doesNotMatch(
    closure,
    /SuperannuationEarnings|Div296FundEarnings|\bamount\b/,
    'no earnings figure and no loose amount may be passed in: there is one, and it is closed over',
  );
  assert.match(CODE, /const amount = mulCents\(earnings\.amount, percentage \/ 100\);/);
  // One earnings figure means one `earnings.amount` in the charge arithmetic. The other mentions
  // are the sign tests and the negative-earnings caveat, which read it and do not multiply it.
  assert.equal([...CODE.matchAll(/mulCents\(earnings\.amount/g)].length, 1);
  assert.doesNotMatch(CODE, /subCents\(earnings\.amount/, 'carving one proportion out of another is the band reading of T15');
});

test("MUTATION — T16: the year switch is in the data layer, and no line here compares a year to a literal", () => {
  // Transitional s 296-1(2) strikes the opening limb out for 2026-27 only; from 2027-28 the test is
  // the greater of opening and closing. The two rules agree whenever the closing balance is larger,
  // so the switch is the kind of thing that can be re-implemented here and stay green. It is called
  // once, from the one constructor that can produce a reference balance, and there is nowhere in
  // this file for either T16 mutation to be applied.
  assert.equal([...WRITTEN.matchAll(/div296TotalSuperBalanceReference/g)].length, 2, 'one import, one call site — no more');
  assert.match(CODE, /value: div296TotalSuperBalanceReference\(fy, opening\.value, closingValue\),/);
  assert.doesNotMatch(CODE, /Math\.max|Math\.min/, 'the greater-of rule belongs to the assumptions layer, not here');
  // No financial year and no quarter is written down. The one year this module knows is read off
  // its record, and every other year comparison is against another figure's `fy`.
  assert.deepEqual(
    [...new Set([...WRITTEN.matchAll(/'\d{4}-\d{2}(?:-\d{2})?'/g)].map(([match]) => match))],
    [],
    'a year or a date written into core/div296.ts is the T16 switch being re-implemented outside ' +
      'the data layer, or the application year being written instead of read',
  );
  assert.match(CODE, /const APPLICATION_YEAR = DIVISION_296\.applicationYear\.value as FinancialYear;/);
  assert.match(CODE, /if \(compareFinancialYears\(fy, APPLICATION_YEAR\) < 0\) throw new Div296NotApplicableError\(fy\);/);
  // The commencement date record forbids computing from it, so nothing here may read it.
  assert.doesNotMatch(CODE, /commencementDate/, 'DIVISION_296.commencementDate.note: nothing may compute from it');
});

test('MUTATION — the O70 false negative cannot come back, in a comment or anywhere else', () => {
  // CORRECTED 2026-09-10 (cb143ec). The refusal used to say "neither set of regulations was
  // retrieved". O17 records the opposite for the s 296-65(5) limb: F2026L00726 WAS retrieved and
  // was not read in full. The runtime test above pins the *message*; this pins the *file*, which
  // is where the correction actually was and where nothing was watching. The superseded sentence
  // survives in exactly one place — the note recording that it was superseded — so the canary is a
  // count, not an absence: reinstating the claim anywhere makes it two.
  const reinstated = [...PROSE.matchAll(/neither set of regulations was retrieved/gi)];
  assert.equal(
    reinstated.length,
    1,
    'the only surviving copy of "neither set of regulations was retrieved" is the note recording ' +
      'that it is false (O70/R6). A second copy is the claim being reasserted',
  );
  assert.match(
    PROSE,
    /used to end "neither set of regulations was retrieved", and that is false/,
    'the one surviving copy must stay inside its correction frame — quoted as superseded, never stated',
  );
  // The other shapes the stronger absence has worn, and could wear again.
  for (const forbidden of [/regulations?\s+(?:was|were|have|has)\s+not\s+(?:been\s+)?retrieved/i, /no\s+regulations?\s+(?:was|were)\s+retrieved/i, /nothing\s+was\s+retrieved/i]) {
    assert.doesNotMatch(PROSE, forbidden, `${forbidden} asserts a cross-pass negative nobody checked — R6 permits only the weaker absence`);
  }
  // "never retrieved" survives once, and only as the named half of the comparison that says which
  // absence is the weaker. Asserted as a count for the same reason as the sentence above: the
  // words have to stay available to state the direction, so absence is not the property to test.
  assert.equal(
    [...PROSE.matchAll(/never retrieved/gi)].length,
    1,
    'the only "never retrieved" here is the stronger absence being named and rejected — a second ' +
      'use is the module asserting it',
  );
  // A label is half a record: the DIRECTION has to be stated, or the next correction has nothing to
  // stand on. Retrieved-but-unread is the WEAKER absence and is the one this module records.
  assert.match(PROSE, /\*Retrieved but unread\* is a \*\*weaker\*\* argument from absence than \*never retrieved\*/);
  assert.match(PROSE, /\*\*R6\*\* forbids recording the stronger/);
  for (const required of [/O17/, /F2026L00726/, /not read in full/i, /O70/]) {
    assert.match(PROSE, required, `${required} is the evidence the correction rests on and must stay in the file`);
  }
  // And the refusal itself survives on its own narrower ground — a correction that quietly dropped
  // the refusal would satisfy every assertion above.
  assert.match(CODE, /if \(!input\.personHoldsWholeFund\) throw new Div296AttributionBasisError\(fund\.fy\);/);
});
