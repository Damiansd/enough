// Phase 14, SLICE 2 (P14-4/P14-9) — the Aged Care Means Assessment, its fees, and the RAD/DAP
// accommodation arithmetic. Register §12.6.
//
// Every dollar figure asserted below is either (a) the module's own 20 Sep 2026 dated rates
// (`AGED_CARE.residentialSchedule['2026-09-20']`), or (b) hand-typed straight from
// health.gov.au's own worked examples (Sakura, Julie, Raj — 20 Mar 2026 rates), reproduced to the
// cent as its own fixture, never read back from the implementation.
import test from 'node:test';
import assert from 'node:assert/strict';

import { toCents } from '../dist/core/money.js';
import { AGED_CARE } from '../dist/data/assumptions/agedCare.js';
import {
  agedCareMeansAssessment,
  agedCareFees,
  agedCareAccommodationPayment,
  agedCareRadRetentionDeduction,
  startingNcccCapBalance,
} from '../dist/core/agedCare.js';

const CURRENT = AGED_CARE.residentialSchedule['2026-09-20'].value;

/**
 * health.gov.au's own "1 November 2025 fee arrangements" worked examples, current on 20 March
 * 2026 (https://www.health.gov.au/our-work/residential-aged-care/charging/fees/scenarios2025,
 * retrieved 2026-09-24) — a SEPARATE, earlier rate set from `CURRENT`, kept as its own fixture so
 * the reproduction tests below are checked against the source's own numbers, not this module's.
 */
const SOURCE_20_MAR_2026 = {
  basicDailyFee: toCents(66.8),
  hotellingContributionMax: toCents(22.15),
  nonClinicalCareContribution: { dailyMax: toCents(107.32), lifetimeCap: toCents(137_910.01), capYears: 4 },
  thresholds: {
    incomeFreeAreaSingle: toCents(35_313.2),
    assetsFreeArea: toCents(64_500),
    homeExemptionCap: toCents(214_884),
  },
  maxRadWithoutPricingApproval: toCents(789_686), // not exercised by these tests
  incomeThresholds: {
    single: {
      freeArea: toCents(35_313.2),
      first: toCents(87_947.6),
      second: toCents(101_105),
      third: toCents(117_230.2),
      fourth: toCents(141_252.8),
    },
    couple: {
      freeArea: toCents(34_585.2),
      first: toCents(87_219.6),
      second: toCents(101_105),
      third: toCents(117_230.2),
      fourth: toCents(138_340.8),
    },
  },
  assetThresholds: {
    freeArea: toCents(64_500),
    first: toCents(214_884),
    second: toCents(258_000),
    third: toCents(361_366.66),
    fourth: toCents(536_384),
  },
  maxAccommodationSupplement: toCents(72.3),
};

const SOURCE_MPIR_20_MAR_2026 = 0.0765;

test('single, below every threshold — fees are the basic daily fee only (P14-4/P14-7)', () => {
  const household = {
    couple: false,
    personNames: ['Mario'],
    combinedAssessableIncome: toCents(20_000),
    combinedAssessableAssetsExcludingHomeAndRad: toCents(15_000),
    combinedRadPaid: toCents(0),
    home: { netValue: toCents(0), homeIsProtected: false },
  };
  // $20,000 < $36,454.60 (income free area) and $15,000 < $66,500.00 (assets free area): both
  // tests' first band never opens, so both daily amounts are $0 — hand-worked, no arithmetic to
  // show beyond "below the free area".
  const means = agedCareMeansAssessment(household, CURRENT);
  assert.equal(means.perPerson.length, 1);
  assert.equal(means.perPerson[0].incomeTestedAmountPerDay, 0);
  assert.equal(means.perPerson[0].assetTestedAmountPerDay, 0);
  assert.equal(means.perPerson[0].meansTestedAmountPerDay, 0);

  const fees = agedCareFees(means.perPerson[0].meansTestedAmountPerDay, CURRENT, startingNcccCapBalance(CURRENT));
  assert.equal(fees.basicDailyFee, CURRENT.basicDailyFee);
  assert.equal(fees.hotellingContribution, 0);
  assert.equal(fees.nonClinicalCareContribution, 0);
});

test('single, well above every threshold — hotelling and NCCC both reach their maximum (P14-4/P14-7)', () => {
  const household = {
    couple: false,
    personNames: ['Priya'],
    combinedAssessableIncome: toCents(500_000),
    combinedAssessableAssetsExcludingHomeAndRad: toCents(3_000_000),
    combinedRadPaid: toCents(0),
    home: { netValue: toCents(0), homeIsProtected: false },
  };
  // $500,000 income and $3,000,000 in assets both clear every band's TOP threshold, so every band
  // (including the two non-zero ones per test) is fully open — the resulting means tested amount
  // is far above maxAccommodationSupplement ($73.73) + hotellingMax ($22.15) + ncccMax ($109.45)
  // = $205.33, so both contributions must be capped at their own maximum. That inequality, not the
  // exact means tested figure, is what this test hand-verifies.
  const means = agedCareMeansAssessment(household, CURRENT);
  assert.ok(means.perPerson[0].meansTestedAmountPerDay > toCents(73.73) + toCents(22.15) + toCents(109.45));

  const fees = agedCareFees(means.perPerson[0].meansTestedAmountPerDay, CURRENT, startingNcccCapBalance(CURRENT));
  assert.equal(fees.hotellingContribution, CURRENT.hotellingContributionMax);
  assert.equal(fees.nonClinicalCareContribution, CURRENT.nonClinicalCareContribution.dailyMax);
});

test('couple, one in care with the partner at home — the home is 100% exempt, not merely capped (P14-4/P14-5)', () => {
  // Combined income $40,000 → $20,000 each, under the couple free area ($35,726.60). Combined
  // OTHER assets (excl. home) $60,000 → $30,000 each, under the assets free area ($66,500.00).
  // If the $800,000 home were NOT exempt, each Person's home share would be $400,000, capped at
  // $219,858.40 — pushing total assessable assets to $249,858.40, far past every asset threshold.
  // Exempt, the home contributes nothing at all, and BOTH tests stay at $0 for BOTH Persons — this
  // is also the mutation kill for "drop the protected-person exemption".
  const household = {
    couple: true,
    personNames: ['Jun', 'Aroha'],
    combinedAssessableIncome: toCents(40_000),
    combinedAssessableAssetsExcludingHomeAndRad: toCents(60_000),
    combinedRadPaid: toCents(0),
    home: { netValue: toCents(800_000), homeIsProtected: true },
  };
  const means = agedCareMeansAssessment(household, CURRENT);
  assert.equal(means.perPerson.length, 2);
  for (const person of means.perPerson) {
    assert.equal(person.homeAssessedValue, 0);
    assert.equal(person.totalAssessableAssets, toCents(30_000));
    assert.equal(person.meansTestedAmountPerDay, 0);
  }
});

test('single, home NOT protected — capped at the home exemption cap, not exempt (P14-4/P14-5)', () => {
  // $960,000 home, single, no protected person: assessed at min($960,000, $219,858.40) =
  // $219,858.40 — the mutation kill for "drop the home cap" (an uncapped mutant would assess the
  // full $960,000 instead).
  const household = {
    couple: false,
    personNames: ['Sakura'],
    combinedAssessableIncome: toCents(0),
    combinedAssessableAssetsExcludingHomeAndRad: toCents(0),
    combinedRadPaid: toCents(0),
    home: { netValue: toCents(960_000), homeIsProtected: false },
  };
  const means = agedCareMeansAssessment(household, CURRENT);
  assert.equal(means.perPerson[0].homeAssessedValue, toCents(219_858.4));
  assert.equal(means.perPerson[0].homeAssessedValue, CURRENT.thresholds.homeExemptionCap);
});

test('reproduces health.gov.au\'s "Self-funded retiree – Sakura" worked example to the cent (P14-4/P14-7/P14-8)', () => {
  // Sakura: single, income $52,000, home $960,000 (capped at $214,884), other assets $340,000 →
  // total assessable assets $554,884.
  const household = {
    couple: false,
    personNames: ['Sakura'],
    combinedAssessableIncome: toCents(52_000),
    combinedAssessableAssetsExcludingHomeAndRad: toCents(340_000),
    combinedRadPaid: toCents(0),
    home: { netValue: toCents(960_000), homeIsProtected: false },
  };
  const means = agedCareMeansAssessment(household, SOURCE_20_MAR_2026);
  const sakura = means.perPerson[0];
  assert.equal(sakura.totalAssessableAssets, toCents(554_884));
  // Income tested amount = 50% x ($52,000 - $35,313.20) / 364 = $8,343.40 / 364 = $22.92
  assert.equal(sakura.incomeTestedAmountPerDay, toCents(22.92));
  // Asset tested amount = [17.5% x $150,384 + 7.8% x $103,366.66 + 7.8% x $18,500] / 364
  //                     = [$26,317.20 + $8,062.60 + $1,443.00] / 364 = $98.41
  assert.equal(sakura.assetTestedAmountPerDay, toCents(98.41));
  // Means tested amount = $22.92 + $98.41 = $121.33
  assert.equal(sakura.meansTestedAmountPerDay, toCents(121.33));

  const fees = agedCareFees(sakura.meansTestedAmountPerDay, SOURCE_20_MAR_2026, startingNcccCapBalance(SOURCE_20_MAR_2026));
  // Hotelling = min($121.33 - $72.30, $22.15) = min($49.03, $22.15) = $22.15 (maxed)
  assert.equal(fees.hotellingContribution, toCents(22.15));
  // NCCC = min($121.33 - ($72.30 + $22.15), $107.32) = min($26.88, $107.32) = $26.88
  assert.equal(fees.nonClinicalCareContribution, toCents(26.88));

  // RAD in full: $650,000 RAD, $0 DAP.
  const full = agedCareAccommodationPayment(toCents(650_000), toCents(650_000), SOURCE_MPIR_20_MAR_2026);
  assert.equal(full.radOutstanding, 0);
  assert.equal(full.dap, 0);

  // DAP only: DAP = $650,000 x 7.65% / 365 = $136.23
  const dapOnly = agedCareAccommodationPayment(toCents(650_000), toCents(0), SOURCE_MPIR_20_MAR_2026);
  assert.equal(dapOnly.radOutstanding, toCents(650_000));
  assert.equal(dapOnly.dap, toCents(136.23));

  // Split: $250,000 RAD + reduced DAP = ($650,000 - $250,000) x 7.65% / 365 = $83.84
  const split = agedCareAccommodationPayment(toCents(650_000), toCents(250_000), SOURCE_MPIR_20_MAR_2026);
  assert.equal(split.radOutstanding, toCents(400_000));
  assert.equal(split.dap, toCents(83.84));
});

test('reproduces health.gov.au\'s "Part pensioner – Raj" worked example to the cent, including the floor-not-round division (P14-4/P14-5/P14-8)', () => {
  // Raj and Julie: combined income $88,000, combined other assets $156,000, home $600,000 (not
  // protected — Raj has moved out). Raj's own share: income $44,000, home share
  // min($300,000, $214,884) = $214,884, other assets $78,000 → total assessable assets $292,884.
  const household = {
    couple: true,
    personNames: ['Raj', 'Julie'],
    combinedAssessableIncome: toCents(88_000),
    combinedAssessableAssetsExcludingHomeAndRad: toCents(156_000),
    combinedRadPaid: toCents(0),
    home: { netValue: toCents(600_000), homeIsProtected: false },
  };
  const means = agedCareMeansAssessment(household, SOURCE_20_MAR_2026);
  const [raj] = means.perPerson;
  assert.equal(raj.assessableIncome, toCents(44_000));
  assert.equal(raj.homeAssessedValue, toCents(214_884));
  assert.equal(raj.totalAssessableAssets, toCents(292_884));
  // Income tested = 50% x ($44,000 - $34,585.20) / 364 = $4,707.40 / 364 = $12.93
  assert.equal(raj.incomeTestedAmountPerDay, toCents(12.93));
  // Asset tested = [17.5% x $150,384 + 7.8% x $34,884] / 364 = [$26,317.20 + $2,720.95] / 364
  //              = $29,038.15 / 364 = $79.7751374... → the SOURCE publishes $79.77: a plain
  //              round-half-up would give $79.78 (187/364 = 0.5137, past the halfway point), so
  //              this pins the FLOOR behaviour of the 364-day division, not merely its existence.
  assert.equal(raj.assetTestedAmountPerDay, toCents(79.77));
  assert.equal(raj.meansTestedAmountPerDay, toCents(92.7));

  const fees = agedCareFees(raj.meansTestedAmountPerDay, SOURCE_20_MAR_2026, startingNcccCapBalance(SOURCE_20_MAR_2026));
  // Hotelling = min($92.70 - $72.30, $22.15) = min($20.40, $22.15) = $20.40 (below max)
  assert.equal(fees.hotellingContribution, toCents(20.4));
  // Below the hotelling max, so NO non-clinical care contribution at all.
  assert.equal(fees.nonClinicalCareContribution, 0);

  // Full RAD: DAP = $450,000 x 7.65% / 365 = $94.32
  const full = agedCareAccommodationPayment(toCents(450_000), toCents(0), SOURCE_MPIR_20_MAR_2026);
  assert.equal(full.dap, toCents(94.32));
  // Combination: $100,000 RAD, reduced DAP = ($450,000 - $100,000) x 7.65% / 365 = $73.36
  const combo = agedCareAccommodationPayment(toCents(450_000), toCents(100_000), SOURCE_MPIR_20_MAR_2026);
  assert.equal(combo.dap, toCents(73.36));
});

test('the NCCC stops at the lifetime dollar cap, mid-fortnight, then stays at zero (P14-7)', () => {
  const rates = CURRENT;
  const huge = toCents(10_000); // certainly drives NCCC to its daily max before any cap
  const almostExhausted = { lifetimeCapRemaining: toCents(0.5), daysRemaining: 1000 };

  const day1 = agedCareFees(huge, rates, almostExhausted);
  assert.equal(day1.nonClinicalCareContribution, toCents(0.5)); // capped by the $ balance, not the daily max
  assert.equal(day1.ncccCapBalanceAfter.lifetimeCapRemaining, 0);
  assert.equal(day1.ncccCapBalanceAfter.daysRemaining, 999);

  const day2 = agedCareFees(huge, rates, day1.ncccCapBalanceAfter);
  assert.equal(day2.nonClinicalCareContribution, 0);
  assert.equal(day2.ncccCapBalanceAfter.daysRemaining, 999); // no further day is consumed once $0 is charged
  // Hotelling is UNCAPPED — it keeps being charged even once the NCCC lifetime cap is reached.
  assert.equal(day2.hotellingContribution, rates.hotellingContributionMax);
});

test('the NCCC stops at 1,460 days, independent of the dollar cap (P14-7)', () => {
  const rates = CURRENT;
  const huge = toCents(10_000);
  const oneDayLeft = { lifetimeCapRemaining: toCents(100_000), daysRemaining: 1 };

  const lastDay = agedCareFees(huge, rates, oneDayLeft);
  assert.equal(lastDay.nonClinicalCareContribution, rates.nonClinicalCareContribution.dailyMax);
  assert.equal(lastDay.ncccCapBalanceAfter.daysRemaining, 0);

  const afterCap = agedCareFees(huge, rates, lastDay.ncccCapBalanceAfter);
  assert.equal(afterCap.nonClinicalCareContribution, 0);
  assert.equal(afterCap.ncccCapBalanceAfter.lifetimeCapRemaining, lastDay.ncccCapBalanceAfter.lifetimeCapRemaining);
});

test('starting NCCC balance is the lifetime cap and capYears × 365 days (P14-7)', () => {
  const starting = startingNcccCapBalance(CURRENT);
  assert.equal(starting.lifetimeCapRemaining, CURRENT.nonClinicalCareContribution.lifetimeCap);
  assert.equal(starting.daysRemaining, CURRENT.nonClinicalCareContribution.capYears * 365);
  assert.equal(starting.daysRemaining, 1460);
});

test('the DAP moves with the MPIR fixed at entry — pre- and post-1 Oct 2026 (P14-8, register §12.2)', () => {
  const outstanding = toCents(500_000);
  const preOct = AGED_CARE.mpir['2026-07-01'].value; // 8.43%
  const postOct = AGED_CARE.mpir['2026-10-01'].value; // 8.51%
  assert.equal(preOct, 0.0843);
  assert.equal(postOct, 0.0851);

  // DAP = $500,000 x 8.43% / 365 = $42,150 / 365 = $115.479... → $115.48
  const before = agedCareAccommodationPayment(outstanding, toCents(0), preOct);
  assert.equal(before.dap, toCents(115.48));

  // DAP = $500,000 x 8.51% / 365 = $42,550 / 365 = $116.575... → $116.58
  const after = agedCareAccommodationPayment(outstanding, toCents(0), postOct);
  assert.equal(after.dap, toCents(116.58));

  // Same RAD, a higher MPIR — the DAP for the identical outstanding amount rises.
  assert.ok(after.dap > before.dap);
});

test('RAD retention: 2% p.a., accrued daily, capped at 5 years (register §12.4)', () => {
  const retention = AGED_CARE.radRetention.value;
  assert.deepEqual(retention, { annualRatePercent: 2, maxYears: 5 });

  const radPaid = toCents(650_000);
  // One full year: 2% x $650,000 = $13,000.
  assert.equal(agedCareRadRetentionDeduction(radPaid, 365, retention), toCents(13_000));
  // Six years held: capped at 5 years' worth, not 6 — $65,000, not $78,000.
  assert.equal(agedCareRadRetentionDeduction(radPaid, 6 * 365, retention), toCents(65_000));
  assert.equal(agedCareRadRetentionDeduction(radPaid, 5 * 365, retention), toCents(65_000));
  // Day zero: no deduction yet.
  assert.equal(agedCareRadRetentionDeduction(radPaid, 0, retention), 0);
});

test('agedCareMeansAssessment refuses a person-name count that does not match couple/single', () => {
  assert.throws(
    () =>
      agedCareMeansAssessment(
        {
          couple: true,
          personNames: ['Solo'],
          combinedAssessableIncome: toCents(0),
          combinedAssessableAssetsExcludingHomeAndRad: toCents(0),
          combinedRadPaid: toCents(0),
          home: { netValue: toCents(0), homeIsProtected: false },
        },
        CURRENT,
      ),
    RangeError,
  );
});

test('agedCareAccommodationPayment refuses a RAD paid above the agreed room price', () => {
  assert.throws(() => agedCareAccommodationPayment(toCents(500_000), toCents(500_001), 0.08), RangeError);
});
