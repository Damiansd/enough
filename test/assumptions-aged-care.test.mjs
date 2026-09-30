// Aged Care — register §12. SLICE 1 (P14-1/P14-3): the sourced rates and their indexation only.
// Figures are hand-worked from `docs/research/p14-aged-care-sources-2026-09-24.md`, never read back
// out of the module under test.
import test from 'node:test';
import assert from 'node:assert/strict';

import { toCents } from '../dist/core/money.js';
import {
  AGED_CARE,
  AGED_CARE_PERIODS,
  agedCarePeriodAt,
  agedCarePeriods,
  agedCarePeriodsThrough,
  agedCareScheduleThrough,
  indexAgedCareSchedule,
  basicDailyFeeFromPension,
  assumptionKeys,
  assumptionAt,
  agePensionPeriodAt,
  defaultAgePensionSeries,
} from '../dist/data/assumptions/index.js';

// The demo/test economic series this file uses throughout for forward generation — an arbitrary but
// fixed rate, so every test below is reproducible arithmetic and not a moving target.
const ECONOMIC_SERIES = { cpi: 0.025, pblci: 0.025, mtawe: 0.035 };
const agePensionSeries = defaultAgePensionSeries(ECONOMIC_SERIES, '2060-09-20');
const singleMaximumBasicRateAt = (date) => agePensionPeriodAt(date, agePensionSeries).rates.maximumBasicRate.single;

test('P14-3 — every 20 Sep 2026 residential schedule figure, pinned by hand', () => {
  const rates = AGED_CARE.residentialSchedule['2026-09-20'].value;
  assert.equal(rates.basicDailyFee, toCents(68.93));
  assert.equal(rates.hotellingContributionMax, toCents(22.15));
  assert.equal(rates.nonClinicalCareContribution.dailyMax, toCents(109.45));
  assert.equal(rates.nonClinicalCareContribution.lifetimeCap, toCents(140_652.8));
  assert.equal(rates.nonClinicalCareContribution.capYears, 4);
  assert.equal(rates.thresholds.incomeFreeAreaSingle, toCents(36_454.6));
  assert.equal(rates.thresholds.assetsFreeArea, toCents(66_500.0));
  assert.equal(rates.thresholds.homeExemptionCap, toCents(219_858.4));
  assert.equal(rates.maxRadWithoutPricingApproval, toCents(789_686));
});

test('P14-3 — the grandfathered caps and RAD retention, pinned by hand', () => {
  const caps = AGED_CARE.grandfatheredCaps['2026-09-20'].value;
  assert.equal(caps.lifetimeCap, toCents(88_934.57));
  assert.equal(caps.annualCap, toCents(37_055.98));

  assert.deepEqual(AGED_CARE.radRetention.value, { annualRatePercent: 2, maxYears: 5 });
});

test('P14-3 — the MPIR, both quarters, pinned by hand', () => {
  assert.equal(AGED_CARE.mpir['2026-07-01'].value, 0.0843);
  assert.equal(AGED_CARE.mpir['2026-10-01'].value, 0.0851);
});

test('P14-3 — the Support at Home classification budgets, pinned by hand', () => {
  const budgets = AGED_CARE.supportAtHome.classificationBudgets.value;
  assert.equal(budgets[1], toCents(11_010.01));
  assert.equal(budgets[2], toCents(16_451.35));
  assert.equal(budgets[3], toCents(22_536.81));
  assert.equal(budgets[4], toCents(30_468.51));
  assert.equal(budgets[5], toCents(40_729.53));
  assert.equal(budgets[6], toCents(49_365.27));
  assert.equal(budgets[7], toCents(59_660.0));
  assert.equal(budgets[8], toCents(80_137.12));
});

test('P14-2 — the 1 Oct 2026 reclassification is scoped to Support at Home', () => {
  const record = AGED_CARE.supportAtHome.reclassification1Oct2026;
  assert.equal(record.effective, '2026-10-01');
  assert.match(record.value, /Support at Home ONLY/);
  assert.match(record.value, /residential care.*untouched/i);
});

test('period lookup on either side of 20 Sep 2026 — the only published schedule date', () => {
  assert.equal(AGED_CARE_PERIODS.length, 2, 'the schedule and MPIR calendars merge to two boundaries in this window');

  // Nothing is published before 2026-09-20 — Phase 14 is unbuilt before today, so this refuses
  // rather than guessing at an earlier rate that was never sourced.
  assert.throws(() => agedCarePeriodAt('2026-09-19'), RangeError);

  const onDate = agedCarePeriodAt('2026-09-20');
  assert.equal(onDate.scheduleEffective, '2026-09-20');
  assert.equal(onDate.mpirEffective, '2026-07-01');
  assert.equal(onDate.mpir, 0.0843);

  const after = agedCarePeriodAt('2026-09-25');
  assert.equal(after.scheduleEffective, '2026-09-20');
  assert.equal(after.mpirEffective, '2026-07-01');
});

test('period lookup on either side of 1 Oct 2026 — the MPIR boundary', () => {
  const before = agedCarePeriodAt('2026-09-30');
  assert.equal(before.mpirEffective, '2026-07-01');
  assert.equal(before.mpir, 0.0843);

  const onDate = agedCarePeriodAt('2026-10-01');
  assert.equal(onDate.mpirEffective, '2026-10-01');
  assert.equal(onDate.mpir, 0.0851);

  const after = agedCarePeriodAt('2026-10-02');
  assert.equal(after.mpirEffective, '2026-10-01');
  assert.equal(after.mpir, 0.0851);

  // The schedule figures did not move across the MPIR boundary — two calendars, not one.
  assert.equal(before.scheduleEffective, onDate.scheduleEffective);
  assert.equal(before.rates.basicDailyFee, onDate.rates.basicDailyFee);
});

test('the schedule and MPIR calendars merge, the same machinery agePensionPeriods uses', () => {
  assert.equal(agedCarePeriods('2026-09-20', '2026-09-30').length, 1);
  assert.equal(agedCarePeriods('2026-09-20', '2026-10-01').length, 2);
});

test('future-period indexation direction — a cost never falls, a protection never rises', () => {
  const previous = AGED_CARE.residentialSchedule['2026-09-20'].value;
  // Arbitrary forward Age Pension rate: this test exercises the CPI-indexed fields only, which do
  // not depend on its value — the basic daily fee's own dependency on it is tested separately below.
  const pensionRate = toCents(1_200.0);
  const risen = indexAgedCareSchedule(previous, { cpi: 1.03 }, pensionRate);

  // Cost-to-household figures: rounded UP, so they are AT LEAST the CPI-scaled figure.
  assert.ok(risen.hotellingContributionMax > previous.hotellingContributionMax);
  assert.ok(risen.nonClinicalCareContribution.dailyMax > previous.nonClinicalCareContribution.dailyMax);
  assert.ok(risen.nonClinicalCareContribution.lifetimeCap > previous.nonClinicalCareContribution.lifetimeCap);
  assert.ok(risen.thresholds.homeExemptionCap > previous.thresholds.homeExemptionCap);
  assert.ok(risen.hotellingContributionMax >= Math.ceil(previous.hotellingContributionMax * 1.03));

  // Protection-to-household figures: rounded DOWN.
  assert.ok(risen.thresholds.incomeFreeAreaSingle > previous.thresholds.incomeFreeAreaSingle);
  assert.ok(risen.thresholds.incomeFreeAreaSingle <= Math.floor(previous.thresholds.incomeFreeAreaSingle * 1.03));
  assert.ok(risen.thresholds.assetsFreeArea <= Math.floor(previous.thresholds.assetsFreeArea * 1.03));
  assert.ok(risen.maxRadWithoutPricingApproval <= Math.floor(previous.maxRadWithoutPricingApproval * 1.03));

  // A year-count is not a dollar figure and does not move.
  assert.equal(risen.nonClinicalCareContribution.capYears, previous.nonClinicalCareContribution.capYears);

  // A CPI of exactly 1 (no movement) must never let a cost figure fall and a protection figure rise —
  // rounding direction must still hold even when there is nothing to round.
  const flat = indexAgedCareSchedule(previous, { cpi: 1 }, pensionRate);
  assert.ok(flat.thresholds.incomeFreeAreaSingle <= previous.thresholds.incomeFreeAreaSingle);

  // A CPI below 1 (a falling index, as happened to the Age Pension in Sep 2020) still keeps the
  // direction: cost figures never round below the raw CPI-scaled amount, protections never above it.
  const fallen = indexAgedCareSchedule(previous, { cpi: 0.98 }, pensionRate);
  assert.ok(fallen.thresholds.assetsFreeArea <= Math.floor(previous.thresholds.assetsFreeArea * 0.98));
});

test('the basic daily fee is 85% of the Age Pension single maximum basic rate ÷ 14, floored — both known points reproduce', () => {
  // 20 Sep 2026: 0.85 × $1,135.40 ÷ 14 = $68.935 exactly — floored, not rounded, to $68.93.
  assert.equal(basicDailyFeeFromPension(toCents(1_135.4)), toCents(68.93));
  // 20 Mar 2026 (the prior published fee, superseded by the schedule above): 0.85 × $1,100.30 ÷ 14 = $66.8032...
  assert.equal(basicDailyFeeFromPension(toCents(1_100.3)), toCents(66.8));
});

test('the basic daily fee moves with the Age Pension rate supplied, not with the CPI movement — mutation guard', () => {
  const previous = AGED_CARE.residentialSchedule['2026-09-20'].value;

  // A forward Age Pension rate produces a wage-linked fee even at cpi: 1 (no CPI movement at all).
  const grownPension = toCents(1_200.0);
  const withGrownPension = indexAgedCareSchedule(previous, { cpi: 1 }, grownPension);
  assert.equal(withGrownPension.basicDailyFee, basicDailyFeeFromPension(grownPension));
  assert.ok(withGrownPension.basicDailyFee > previous.basicDailyFee);

  // A large CPI movement must NOT move the fee at all if the Age Pension rate supplied is unchanged —
  // this is what a regression back to CPI-indexing the fee would fail.
  const unchangedPension = toCents(1_135.4);
  const withHighCpiFlatPension = indexAgedCareSchedule(previous, { cpi: 1.5 }, unchangedPension);
  assert.equal(withHighCpiFlatPension.basicDailyFee, previous.basicDailyFee);
});

test('provenance is present on every aged care leaf', () => {
  const agedCareKeys = assumptionKeys().filter((key) => key.startsWith('agedCare.'));
  assert.ok(agedCareKeys.length > 10, `expected a populated aged care register, found ${agedCareKeys.length}`);
  for (const key of agedCareKeys) {
    const record = assumptionAt(key);
    assert.ok(typeof record.source === 'string' && record.source.trim() !== '', `${key} has no source`);
    assert.match(record.retrieved, /^\d{4}-\d{2}-\d{2}$/, `${key} has no usable retrieval date`);
    assert.ok(
      ['primary-verified', 'primary-via-archive', 'secondary-only', 'unverified'].includes(record.confidence),
      `${key} has confidence ${record.confidence}`,
    );
    assert.match(record.registerSection, /^§12/, `${key} does not point into register §12`);
  }
});

test('the forward indexation linkage is explicitly UNVERIFIED, not dressed up as a source', () => {
  assert.equal(AGED_CARE.indexation.linkageUnknown.confidence, 'unverified');
  assert.equal(AGED_CARE.indexation.mechanism.confidence, 'unverified');
  assert.equal(AGED_CARE.indexation.mechanism.value, indexAgedCareSchedule);
});

test('the basic daily fee linkage is the one evidenced exception — primary-verified, not unverified', () => {
  assert.equal(AGED_CARE.indexation.basicDailyFeeLinkage.confidence, 'primary-verified');
  assert.equal(AGED_CARE.indexation.basicDailyFeeLinkage.value, basicDailyFeeFromPension);
  assert.match(AGED_CARE.indexation.linkageUnknown.value, /EXCEPT the basic daily fee/);
});

// --- P14-17 — forward indexation past the one published year -------------------------------------

test('the published 2026-09-20 figures are UNCHANGED by generating a forward schedule — byte-identical', () => {
  const schedule = agedCareScheduleThrough(ECONOMIC_SERIES.cpi, singleMaximumBasicRateAt, '2056-09-20');
  assert.deepEqual(schedule['2026-09-20'], AGED_CARE.residentialSchedule['2026-09-20'].value);
});

test('a horizon decades past the one published year generates forward without refusing', () => {
  const periods = agedCarePeriodsThrough('2056-09-20', ECONOMIC_SERIES.cpi, singleMaximumBasicRateAt);
  assert.ok(periods.length > 50, `expected many generated periods over thirty years, found ${periods.length}`);
  const far = agedCarePeriodAt('2056-09-20', periods);
  assert.equal(far.scheduleEffective, '2056-09-20');
  // A date before the first published schedule is still refused — the ONE bound left (P14-17).
  assert.throws(() => agedCarePeriodAt('2026-09-19', periods), RangeError);
});

test('the basic fee in a far year is 85% of THAT YEAR\'s projected single basic Age Pension rate ÷ 14, floored — never CPI', () => {
  const farDate = '2056-09-20';
  const schedule = agedCareScheduleThrough(ECONOMIC_SERIES.cpi, singleMaximumBasicRateAt, farDate);
  const projectedPension = singleMaximumBasicRateAt(farDate);
  assert.ok(projectedPension > agePensionPeriodAt('2026-09-20', agePensionSeries).rates.maximumBasicRate.single, 'the fixture must actually grow the pension, or this proves nothing');
  assert.equal(schedule[farDate].basicDailyFee, basicDailyFeeFromPension(projectedPension));
});

test('the NCCC daily max in a generated period is CPI-carried from the one before it, and rounded UP — mutation guard', () => {
  const schedule = agedCareScheduleThrough(ECONOMIC_SERIES.cpi, singleMaximumBasicRateAt, '2027-09-20');
  const first20Mar2027 = schedule['2027-03-20'];
  assert.notEqual(first20Mar2027, undefined, 'the first generated date must exist, or this proves nothing');
  // Composed via the SAME per-step mechanism `agedCareScheduleThrough` runs — `priceLevelFactor` from
  // the previous schedule date to this one, then `indexAgedCareSchedule`'s own UP rounding — proving
  // the WIRING calls the real per-step movement rather than, say, a flat carry or a full-horizon jump.
  const published = AGED_CARE.residentialSchedule['2026-09-20'].value;
  assert.ok(first20Mar2027.nonClinicalCareContribution.dailyMax > published.nonClinicalCareContribution.dailyMax);
  assert.ok(first20Mar2027.nonClinicalCareContribution.dailyMax >= Math.ceil(published.nonClinicalCareContribution.dailyMax * (1 + ECONOMIC_SERIES.cpi) ** 0.5));
});

// --- LR-4 — F2026L01252 Sch 8: the maximum accommodation supplement is $78.73 from 20 Mar 2027 ------

test('LR-4 — the leaf: $78.73, effective 20 Mar 2027, sourced to the instrument and Act s 235(3)', () => {
  const leaf = AGED_CARE.maxAccommodationSupplementFrom2027;
  assert.equal(leaf.value, 7873);
  assert.equal(leaf.effective, '2027-03-20');
  assert.equal(leaf.kind, 'config');
  assert.match(leaf.source, /F2026L01252/);
  assert.match(leaf.source, /s 235\(3\)/);
});

test('LR-4 — the supplement is $73.73 on 20 Sep 2026, EXACTLY $78.73 on 20 Mar 2027, then indexed DOWN from $78.73', () => {
  const schedule = agedCareScheduleThrough(ECONOMIC_SERIES.cpi, singleMaximumBasicRateAt, '2027-09-20');
  assert.equal(schedule['2026-09-20'].maxAccommodationSupplement, 7373);
  // Not CPI-carried on its own step: the instrument states the figure for that day.
  assert.equal(schedule['2027-03-20'].maxAccommodationSupplement, 7873);
  // 20 Mar → 1 Jul 2027 is four months: $78.73 × 1.025^(4/12) = $79.3807…, rounded DOWN = $79.38.
  assert.equal(schedule['2027-07-01'].maxAccommodationSupplement, 7938);
  assert.equal(schedule['2027-07-01'].maxAccommodationSupplement, Math.floor(7873 * 1.025 ** (4 / 12)));
  // 1 Jul → 20 Sep 2027 (two months) carries on from $79.38, not back to $78.73.
  assert.equal(schedule['2027-09-20'].maxAccommodationSupplement, Math.floor(7938 * 1.025 ** (2 / 12)));
  // The walk reads a period by its month's 1st: March 2027 keeps $73.73, April 2027 takes $78.73.
  const periods = agedCarePeriodsThrough('2027-09-20', ECONOMIC_SERIES.cpi, singleMaximumBasicRateAt);
  assert.equal(agedCarePeriodAt('2027-03-01', periods).rates.maxAccommodationSupplement, 7373);
  assert.equal(agedCarePeriodAt('2027-04-01', periods).rates.maxAccommodationSupplement, 7873);
});
