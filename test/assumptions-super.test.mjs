// Superannuation — register §3, and the §9 mutations that a single financial year cannot see.
//
// Cap indexation, the bring-forward tiers and the Div 296 plateau are all multi-year shapes: a
// test that only ever looks at FY2026-27 passes against every one of the mutations below. Each
// test here therefore runs at least two years, or drives the formula with a synthetic index
// series. The index numbers used as drivers are the published AWOTE figures, or round synthetic
// ratios — never a forecast, which is a Setting (register O5).
import test from 'node:test';
import assert from 'node:assert/strict';

import { toCents } from '../dist/core/money.js';
import {
  SUPERANNUATION,
  bringForwardArrangement,
  div296TotalSuperBalanceReference,
  indexCap,
  maximumContributionsBase,
} from '../dist/data/assumptions/index.js';

const caps = SUPERANNUATION.caps;
const specs = SUPERANNUATION.capIndexation;

// ATO Table 40, AWOTE for the December quarter: the base quarter and the two years the register
// reconciles. Dec 2024 and Dec 2025 are historical published figures, used as fixture drivers.
const AWOTE_BASE = specs.awoteBaseQuarterIndexNumber.value; // Dec 2016
const AWOTE_DEC_2024 = 1_975.8;
const AWOTE_DEC_2025 = 2_051.1;

test('T13 — cap indexation is cumulative from the base amount, never chained off last year', () => {
  const spec = specs.concessional.value;
  assert.equal(indexCap(spec, AWOTE_BASE, AWOTE_DEC_2024), toCents(30_000)); // FY2025-26
  assert.equal(indexCap(spec, AWOTE_BASE, AWOTE_DEC_2025), toCents(32_500)); // FY2026-27
  assert.equal(indexCap(spec, AWOTE_BASE, AWOTE_DEC_2025), caps.concessional.value);

  // The mutation: chain off last year's $30,000 cap and last year's index number. It gives
  // $30,000 for FY2026-27 — plausible, flat, and wrong. One year cannot see this.
  const chained = indexCap({ ...spec, baseAmount: toCents(30_000) }, AWOTE_DEC_2024, AWOTE_DEC_2025);
  assert.equal(chained, toCents(30_000));
  assert.notEqual(chained, caps.concessional.value);
});

test('T13 — the rounding is a floor to the cap multiple, not a round to nearest', () => {
  // FY2025-26: 25,000 × 1.289 = 32,225. Floor to $2,500 gives $30,000; round-to-nearest gives
  // $32,500 — which happens to be the *correct* FY2026-27 answer, so only the earlier year
  // separates the two.
  assert.equal(indexCap(specs.concessional.value, AWOTE_BASE, AWOTE_DEC_2024), toCents(30_000));
  assert.equal(Math.round(32_225 / 2_500) * 2_500, 32_500);
});

test('T14 — each cap carries its own index, base amount, base quarter and rounding', () => {
  assert.equal(specs.concessional.value.index, 'AWOTE');
  assert.equal(specs.transferBalance.value.index, 'CPI');
  assert.equal(specs.div296LargeBalanceThreshold.value.index, 'CPI');
  assert.equal(specs.div296VeryLargeBalanceThreshold.value.index, 'CPI');

  assert.equal(specs.concessional.value.baseQuarter, '2016-12-31');
  assert.equal(specs.transferBalance.value.baseQuarter, '2016-12-31');
  // A different base quarter for Div 296 — using Dec 2016 for it is the T14 mutation.
  assert.equal(specs.div296LargeBalanceThreshold.value.baseQuarter, '2025-12-31');
  assert.equal(specs.div296VeryLargeBalanceThreshold.value.baseQuarter, '2025-12-31');

  assert.equal(specs.concessional.value.roundingAmount, toCents(2_500));
  assert.equal(specs.transferBalance.value.roundingAmount, toCents(100_000));
  assert.equal(specs.div296LargeBalanceThreshold.value.roundingAmount, toCents(150_000));
  assert.equal(specs.div296VeryLargeBalanceThreshold.value.roundingAmount, toCents(500_000));

  // Swapping the concessional cap to CPI must change the answer, so the index cannot be shared.
  assert.notEqual(specs.concessional.value.index, specs.transferBalance.value.index);
});

test('T11 — the Div 296 threshold plateaus for years, then steps exactly $150,000', () => {
  const spec = specs.div296LargeBalanceThreshold.value;
  const at = (cumulativeCpi) => indexCap(spec, 100, 100 * cumulativeCpi);

  // Ten years of a synthetic 1% a year: nothing moves until the cumulative ratio reaches 1.05.
  // 1.0494 is the last flat ratio: s 960-285(6) rounds the factor up at the fourth decimal, so
  // 1.0495 is already 1.050.
  const series = [1.0, 1.01, 1.02, 1.03, 1.04, 1.0494];
  for (const ratio of series) assert.equal(at(ratio), toCents(3_000_000), `flat at ${ratio}`);

  assert.equal(at(1.05), toCents(3_150_000));
  assert.equal(at(1.0994), toCents(3_150_000));
  assert.equal(at(1.1), toCents(3_300_000));

  // Smooth escalation — the mutation — would have given $3,030,000 at 1.01. It never does.
  assert.notEqual(at(1.01), toCents(3_030_000));

  // Same shape, bigger step, on the very large balance threshold.
  const vlsbt = specs.div296VeryLargeBalanceThreshold.value;
  assert.equal(indexCap(vlsbt, 100, 104), toCents(10_000_000));
  assert.equal(indexCap(vlsbt, 100, 105), toCents(10_500_000));
});

test('T19 — the bring-forward tiers are derived, and the inequalities are strict', () => {
  const arrangement = (totalSuperBalance) =>
    bringForwardArrangement({
      generalTransferBalanceCap: caps.generalTransferBalance.value,
      nonConcessionalCap: caps.nonConcessional.value,
      totalSuperBalance,
    });

  // The FY2026-27 ATO table, reproduced exactly.
  assert.deepEqual(arrangement(toCents(1_000_000)), { firstYearCap: toCents(390_000), years: 3 });
  assert.deepEqual(arrangement(toCents(1_839_999)), { firstYearCap: toCents(390_000), years: 3 });
  assert.deepEqual(arrangement(toCents(1_840_000)), { firstYearCap: toCents(260_000), years: 2 });
  assert.deepEqual(arrangement(toCents(1_969_999)), { firstYearCap: toCents(260_000), years: 2 });
  assert.deepEqual(arrangement(toCents(1_970_000)), { firstYearCap: toCents(130_000), years: 1 });
  assert.deepEqual(arrangement(toCents(2_100_000)), { firstYearCap: toCents(0), years: 0 });

  // The tiers must move when either cap indexes — hard-coded literals cannot do this.
  const indexed = bringForwardArrangement({
    generalTransferBalanceCap: toCents(2_200_000),
    nonConcessionalCap: toCents(140_000),
    totalSuperBalance: toCents(1_840_000),
  });
  assert.deepEqual(indexed, { firstYearCap: toCents(420_000), years: 3 });
});

test('T20 — a triggered bring-forward cap is frozen at first-year cap × the period', () => {
  assert.equal(SUPERANNUATION.bringForward.capIsFrozenOnceTriggered.value, true);
  const threeYear = bringForwardArrangement({
    generalTransferBalanceCap: caps.generalTransferBalance.value,
    nonConcessionalCap: caps.nonConcessional.value,
    totalSuperBalance: toCents(500_000),
  });
  assert.equal(threeYear.firstYearCap, toCents(390_000));
  // Summing three indexed years would give $410,000 ($130k + $130k + $150k at one $10k step).
  assert.notEqual(threeYear.firstYearCap, toCents(410_000));
});

test('the non-concessional cap is 4 × the concessional cap, and says so', () => {
  assert.equal(caps.nonConcessional.kind, 'config-derived');
  assert.equal(caps.nonConcessional.value, 4 * caps.concessional.value);
  assert.match(caps.nonConcessional.derivation, /4 × concessional/);
});

test('T18 — the maximum contributions base is annual, per employer, and derived', () => {
  const sg = SUPERANNUATION.superGuarantee;
  assert.equal(maximumContributionsBase(caps.concessional.value, sg.chargePercentage.value), toCents(270_830));
  assert.equal(sg.maximumContributionsBase.value, toCents(270_830));
  assert.match(sg.maximumContributionsBasePeriod.value, /financial year, per employer/);
  // The pre-1 Jul 2026 quarterly construct is gone, not merely renumbered.
  assert.notEqual(sg.maximumContributionsBase.value, toCents(62_500));
});

test('T17 — salary sacrifice is itself qualifying earnings, so it cannot reduce the SG base', () => {
  const sg = SUPERANNUATION.superGuarantee;
  assert.equal(sg.earningsBase.value, 'qualifying earnings');
  assert.equal(sg.salarySacrificeIsQualifyingEarnings.value, true);
});

test('T12 — Div 296 stores its application year, and its commencement date separately', () => {
  const div296 = SUPERANNUATION.division296;
  assert.equal(div296.applicationYear.value, '2026-27');
  assert.equal(div296.applicationYear.fy, '2026-27');
  assert.equal(div296.commencementDate.value, '2026-04-01');
  assert.notEqual(div296.applicationYear.value, div296.commencementDate.value);
});

test('T16 — the Div 296 TSB test uses the closing balance alone in 2026-27 only', () => {
  const opening = toCents(3_400_000);
  const closing = toCents(3_100_000);
  assert.equal(div296TotalSuperBalanceReference('2026-27', opening, closing), closing);
  assert.equal(div296TotalSuperBalanceReference('2027-28', opening, closing), opening);
  assert.notEqual(
    div296TotalSuperBalanceReference('2026-27', opening, closing),
    div296TotalSuperBalanceReference('2027-28', opening, closing),
  );
});

test('T15 — Div 296 holds two rates on one earnings base, not marginal bands', () => {
  const div296 = SUPERANNUATION.division296;
  assert.equal(div296.baseRate.value, 0.15);
  assert.equal(div296.additionalRate.value, 0.1);
  assert.match(div296.additionalRate.note, /same total earnings/i);
  // The commentary framing that reconciles below $10m and fails above it.
  assert.notEqual(div296.additionalRate.value, 0.4);
});

test('T21 — the Div 293 and carry-forward figures are nominal constants with no index', () => {
  assert.equal(SUPERANNUATION.division293.threshold.value, toCents(250_000));
  assert.equal(SUPERANNUATION.division293.threshold.kind, 'constant');
  assert.equal(SUPERANNUATION.division293.threshold.everyYear, true);

  assert.equal(SUPERANNUATION.carryForward.totalSuperBalanceTest.value, toCents(500_000));
  assert.equal(SUPERANNUATION.carryForward.totalSuperBalanceTest.everyYear, true);

  // Neither appears in any indexation spec — that is what "no indexation provision" means here.
  const indexedBases = Object.values(specs)
    .map((record) => record.value)
    .filter((value) => typeof value === 'object' && value !== null)
    .map((spec) => spec.baseAmount);
  assert.ok(!indexedBases.includes(toCents(250_000)));
  assert.ok(!indexedBases.includes(toCents(500_000)));
});

test('the contributions tax is a constant 15%, never a marginal rate', () => {
  assert.equal(SUPERANNUATION.fundTax.contributionsTax.value, 0.15);
  assert.equal(SUPERANNUATION.fundTax.contributionsTax.kind, 'constant');
  assert.equal(SUPERANNUATION.fundTax.earningsTaxAccumulation.value, 0.15);
  assert.equal(SUPERANNUATION.fundTax.earningsTaxRetirement.value, 0);
});

test('access is a Condition of Release, not an age', () => {
  const access = SUPERANNUATION.access;
  assert.equal(access.preservationAge.value, 60);
  assert.match(access.conditionOfRelease.value, /independent of age/);
  assert.equal(access.ttrMaximumDrawdown.value, 0.1);
  assert.equal(access.minimumDrawdownFactors.value[0].factor, 0.04);
  assert.equal(access.minimumDrawdownFactors.value.at(-1).factor, 0.14);
});
