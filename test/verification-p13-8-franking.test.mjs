// P13-8 — ONE HAND-WORKED FRANKED DISTRIBUTION, BOTH SIDES, RECONCILED INDEPENDENTLY OF THE ENGINE.
//
// The full working is in docs/verification/P13-8-franking.md, committed BEFORE this file existed.
// Every figure below is copied from that document, not derived here — this file's only job is to
// run the same three cases through the public franking functions and check them to the cent.
//
//   (a) Nadia — single, SAPTO-qualified, taxable income $22,000.00, a $16,800.00 fully franked
//       distribution at a 30% payer. Credit $7,200.00, grossed up $24,000.00. Additional tax
//       $3,198.20 (through LITO's taper, SAPTO's rebate-income taper and the seniors Medicare
//       levy shade-in), so the offset REFUNDS $4,001.80 in cash.
//   (b) A fund wholly in Retirement Phase, $42,000.00 fully franked at 30%: credit $18,000.00,
//       0% earnings tax, the WHOLE credit refunded.
//   (c) A fund wholly in Accumulation Phase, $36,000.00 fully franked at 25% (the 1/3 rational,
//       not 3/7): credit $12,000.00, 15% earnings tax $7,200.00, offset exceeds it, so $4,800.00
//       is refunded and nothing is payable.
import test from 'node:test';
import assert from 'node:assert/strict';

import { toCents } from '../dist/core/money.js';
import { taxableIncome } from '../dist/core/incomeBases.js';
import {
  NO_REBATE_INCOME_ADD_BACKS,
  frankingForIndividual,
  qualifiedResidentIndividual,
} from '../dist/core/individualFranking.js';
import {
  COMPLYING_RESIDENT_QUALIFIED_FUND,
  frankedDistributionFromRate,
  frankingInSuper,
} from '../dist/core/superFranking.js';
import { accumulationInterest, phaseHeldForTheWholeYear, retirementPhaseInterest } from '../dist/core/superPhase.js';
import { conditionOfRelease } from '../dist/core/conditionOfRelease.js';

const RATE_SOURCE = { source: 'a Setting: the portfolio’s effective franking rate', confidence: 'primary-verified' };

// --- (a) The individual, low retirement income, SAPTO in play -------------------------------------

test('P13-8(a) HAND-WORKED — a SAPTO-eligible individual on $22,000.00: refund $4,001.80', () => {
  const nadia = {
    name: 'Nadia',
    taxableIncome: taxableIncome(toCents(22_000)),
    rebateIncomeAddBacks: NO_REBATE_INCOME_ADD_BACKS,
    qualifiedForAgePension: true,
  };
  const distribution = frankedDistributionFromRate({
    fy: '2026-27',
    frankedAmount: toCents(16_800),
    frankingPercentage: 1,
    payerCorporateTaxRate: 0.3,
    ...RATE_SOURCE,
  });
  assert.equal(distribution.frankingCredit, toCents(7_200));
  assert.equal(distribution.grossedUpAmount, toCents(24_000));

  const result = frankingForIndividual({
    fy: '2026-27',
    relationship: 'single',
    persons: [nadia],
    recipient: 0,
    distribution,
    facts: qualifiedResidentIndividual(toCents(7_200)),
  });

  assert.equal(result.taxWithout.persons[0].netTax, toCents(0));
  assert.equal(result.taxWith.persons[0].netTax, toCents(3_198.2));
  assert.equal(result.additionalTaxOnTheDistribution, toCents(3_198.2));
  assert.equal(result.offset, toCents(7_200));
  assert.equal(result.refund, toCents(4_001.8));
  assert.equal(result.taxPayableAfterOffset, toCents(0));
  assert.equal(result.netCash, toCents(20_801.8));

  // The SAPTO and LITO limbs, checked directly against the working.
  assert.equal(result.taxWithout.persons[0].lito, toCents(700));
  assert.equal(result.taxWith.persons[0].lito, toCents(310));
  assert.equal(result.taxWithout.persons[0].sapto, toCents(2_230));
  assert.equal(result.taxWith.persons[0].sapto, toCents(985));
});

// --- (b) A fund in Retirement Phase --------------------------------------------------------------

test('P13-8(b) HAND-WORKED — Retirement Phase, $42,000.00 fully franked at 30%: refund IN FULL, $18,000.00', () => {
  const distribution = frankedDistributionFromRate({
    fy: '2026-27',
    frankedAmount: toCents(42_000),
    frankingPercentage: 1,
    payerCorporateTaxRate: 0.3,
    ...RATE_SOURCE,
  });
  assert.equal(distribution.frankingCredit, toCents(18_000));
  assert.equal(distribution.grossedUpAmount, toCents(60_000));

  const release67 = conditionOfRelease({ dateOfBirth: '1959-07-01', on: '2026-07-01', gainfulEmployment: { ceased: false } });
  const result = frankingInSuper({
    fy: '2026-27',
    interest: retirementPhaseInterest(release67),
    distribution,
    facts: COMPLYING_RESIDENT_QUALIFIED_FUND,
    phaseHeldFor: phaseHeldForTheWholeYear('2026-27'),
  });

  assert.equal(result.earningsTax.rate, 0);
  assert.equal(result.earningsTax.tax, toCents(0));
  assert.equal(result.offset, toCents(18_000));
  assert.equal(result.refund, toCents(18_000));
  assert.equal(result.taxPayableAfterOffset, toCents(0));
  assert.equal(result.netCash, toCents(60_000));
});

// --- (c) A fund in Accumulation Phase ------------------------------------------------------------

test('P13-8(c) HAND-WORKED — Accumulation Phase, $36,000.00 fully franked at 25%: offset exceeds the 15%, refund $4,800.00', () => {
  const distribution = frankedDistributionFromRate({
    fy: '2026-27',
    frankedAmount: toCents(36_000),
    frankingPercentage: 1,
    payerCorporateTaxRate: 0.25,
    ...RATE_SOURCE,
  });
  assert.equal(distribution.frankingCredit, toCents(12_000));
  assert.equal(distribution.grossedUpAmount, toCents(48_000));

  const release61 = conditionOfRelease({ dateOfBirth: '1965-07-01', on: '2026-07-01', gainfulEmployment: { ceased: false } });
  const result = frankingInSuper({
    fy: '2026-27',
    interest: accumulationInterest(release61),
    distribution,
    facts: COMPLYING_RESIDENT_QUALIFIED_FUND,
    phaseHeldFor: phaseHeldForTheWholeYear('2026-27'),
  });

  assert.equal(result.earningsTax.rate, 0.15);
  assert.equal(result.earningsTax.tax, toCents(7_200));
  assert.equal(result.offset, toCents(12_000));
  assert.equal(result.refund, toCents(4_800));
  assert.equal(result.taxPayableAfterOffset, toCents(0));
  assert.equal(result.netCash, toCents(40_800));
});
