// P3-12 — deeming and the Work Bonus. Register §4.5, §4.6; traps T29, T30.
import test from 'node:test';
import assert from 'node:assert/strict';

import { toCents } from '../dist/core/money.js';
import { agePensionPeriodAt } from '../dist/data/assumptions/index.js';
import {
  DEEMING_RATES_SETTING_KEY,
  MissingDeemingRatesError,
  deemedIncome,
  deemingThreshold,
  resolveDeemingRates,
} from '../dist/core/deeming.js';
import {
  WORK_BONUS_MAXIMUM_BALANCE,
  WORK_BONUS_STARTING_BALANCE,
  applyWorkBonus,
} from '../dist/core/workBonus.js';

const person = (name, overrides = {}) => ({
  name,
  dateOfBirth: '1955-01-01',
  superInterests: [],
  parcels: [],
  employmentIncomePerFortnight: toCents(0),
  workBonusBalance: toCents(0),
  ...overrides,
});

// --- Deeming ------------------------------------------------------------------------------------

test('T30 — deeming rates come from the determinations, and stop at the last one', () => {
  assert.deepEqual(resolveDeemingRates('2026-09-20'), { lower: 0.0175, upper: 0.0375 });
  assert.deepEqual(resolveDeemingRates('2026-07-01'), { lower: 0.0125, upper: 0.0325 });

  // Past the last determination there is nothing to read. Three +0.5% steps in a row is not a
  // formula, and extrapolating one would be a forecast wearing an assumption's provenance.
  assert.throws(() => resolveDeemingRates('2026-09-21'), MissingDeemingRatesError);
  assert.throws(() => resolveDeemingRates('2030-01-01'), MissingDeemingRatesError);
  assert.throws(() => resolveDeemingRates('2026-09-21'), /agePension\.deeming\.ratesAfterLastDetermination/);
  assert.equal(DEEMING_RATES_SETTING_KEY, 'agePension.deeming.ratesAfterLastDetermination');

  // Supplying the Setting is the only way through — and it is also the scenario lever, so it
  // overrides a determination that does exist.
  const lever = { lower: 0.03, upper: 0.05 };
  assert.deepEqual(resolveDeemingRates('2030-01-01', lever), lever);
  assert.deepEqual(resolveDeemingRates('2026-09-20', lever), lever);
});

test('the deeming threshold is one combined figure for the Household, not one each', () => {
  const period = agePensionPeriodAt('2026-09-20');
  assert.equal(deemingThreshold(period, true), toCents(110_600));
  assert.equal(deemingThreshold(period, false), toCents(66_800));

  // The register's "member of a couple, neither on a pension" row is $55,300 each — exactly half
  // the combined figure, so it needs no branch. If an indexation ever breaks that, this fails and
  // the branch becomes visible rather than silently wrong.
  assert.equal(
    period.meansTest.deemingThreshold.memberOfCoupleNeitherOnPension * 2,
    period.meansTest.deemingThreshold.coupleCombined,
  );
});

test('deeming is lower rate to the threshold, upper rate above — hand-worked', () => {
  const rates = { lower: 0.0175, upper: 0.0375 };
  const threshold = toCents(110_600);

  // $110,600 × 1.75% = $1,935.50; $589,400 × 3.75% = $22,102.50; total $24,038.00 a year.
  const deemed = deemedIncome(toCents(700_000), threshold, rates);
  assert.equal(deemed.lowerPortion, toCents(1_935.5));
  assert.equal(deemed.upperPortion, toCents(22_102.5));
  assert.equal(deemed.annual, toCents(24_038));
  assert.equal(deemed.perFortnight, toCents(924.54)); // 24,038.00 ÷ 26 = 924.5384…

  // Entirely below the threshold: the upper rate never applies.
  const small = deemedIncome(toCents(50_000), threshold, rates);
  assert.equal(small.upperPortion, toCents(0));
  assert.equal(small.annual, toCents(875)); // 50,000 × 1.75%

  // Exactly at the threshold is the boundary: still all at the lower rate.
  const atThreshold = deemedIncome(threshold, threshold, rates);
  assert.equal(atThreshold.upperPortion, toCents(0));
  assert.equal(atThreshold.annual, toCents(1_935.5));

  assert.equal(deemedIncome(toCents(0), threshold, rates).annual, toCents(0));
});

test('deeming is applied to the rates in force, so a rate step moves it', () => {
  const threshold = toCents(110_600);
  const before = deemedIncome(toCents(700_000), threshold, { lower: 0.0125, upper: 0.0325 });
  const after = deemedIncome(toCents(700_000), threshold, { lower: 0.0175, upper: 0.0375 });
  assert.ok(after.annual > before.annual);
  // 110,600 × 1.25% = 1,382.50; 589,400 × 3.25% = 19,155.50 → 20,538.00
  assert.equal(before.annual, toCents(20_538));
});

// --- Work Bonus ---------------------------------------------------------------------------------

test('§4.6 — the Work Bonus figures are consumed, never re-declared', () => {
  assert.equal(WORK_BONUS_STARTING_BALANCE, toCents(4_000));
  assert.equal(WORK_BONUS_MAXIMUM_BALANCE, toCents(11_800));
});

test('the $300 fortnightly amount is applied first, then the balance', () => {
  // $1,000 a fortnight against a $4,000 balance: $300 from the accrual, $700 from the balance,
  // nothing assessed, and the balance falls to $3,300.
  const result = applyWorkBonus(
    person('Alex', { employmentIncomePerFortnight: toCents(1_000), workBonusBalance: toCents(4_000) }),
    true,
  );
  assert.equal(result.fromFortnightlyAccrual, toCents(300));
  assert.equal(result.fromBalance, toCents(700));
  assert.equal(result.assessedEmploymentIncome, toCents(0));
  assert.equal(result.balanceAfter, toCents(3_300));
});

test('a sub-$300 fortnight zeroes the income and banks the remainder; the bank caps at $11,800', () => {
  const light = applyWorkBonus(
    person('Alex', { employmentIncomePerFortnight: toCents(120), workBonusBalance: toCents(4_000) }),
    true,
  );
  assert.equal(light.assessedEmploymentIncome, toCents(0));
  assert.equal(light.balanceAfter, toCents(4_180)); // 4,000 + (300 − 120)

  // Accrues whether or not the Person works.
  const idle = applyWorkBonus(person('Alex', { workBonusBalance: toCents(4_000) }), true);
  assert.equal(idle.balanceAfter, toCents(4_300));

  const full = applyWorkBonus(person('Alex', { workBonusBalance: toCents(11_700) }), true);
  assert.equal(full.balanceAfter, toCents(11_800), 'the balance caps at $11,800');
});

test('income above $300 plus the whole balance is assessed', () => {
  const result = applyWorkBonus(
    person('Alex', { employmentIncomePerFortnight: toCents(2_000), workBonusBalance: toCents(500) }),
    true,
  );
  assert.equal(result.assessedEmploymentIncome, toCents(1_200)); // 2,000 − 300 − 500
  assert.equal(result.balanceAfter, toCents(0));
});

test('T29 — the Work Bonus is per Person and never poolable', () => {
  // Alex earns $2,000 a fortnight with an empty balance; Blair earns nothing and holds the full
  // $11,800. Pooling would shelter Alex entirely. It does not: Alex gets the $300 accrual only.
  const alex = applyWorkBonus(
    person('Alex', { employmentIncomePerFortnight: toCents(2_000), workBonusBalance: toCents(0) }),
    true,
  );
  const blair = applyWorkBonus(
    person('Blair', { employmentIncomePerFortnight: toCents(0), workBonusBalance: toCents(11_800) }),
    true,
  );
  assert.equal(alex.assessedEmploymentIncome, toCents(1_700));
  assert.notEqual(alex.assessedEmploymentIncome, toCents(0));
  assert.equal(blair.assessedEmploymentIncome, toCents(0));
  assert.equal(blair.balanceAfter, toCents(11_800), "Blair's unused balance stays with Blair");

  // The structural half of the same claim: the only entry point takes one Person, so there is no
  // parameter a partner's balance could arrive through.
  assert.equal(applyWorkBonus.length, 2);
});

test('T29 — the Work Bonus never touches investment income', () => {
  // A Person holding a Non-Super Portfolio and no employment income gets no offset at all: deemed
  // income is outside the definition, so there is nothing for the bonus to reduce. The $700,000 is
  // stated as the parcel it is made of (P3-21f chunk 1) — `financialAssets` is a derivation now,
  // and a Person cannot hold a figure that is not in a parcel.
  const result = applyWorkBonus(
    person('Alex', {
      parcels: [{ acquired: '2015-03-02', costBase: toCents(400_000), marketValue: toCents(700_000) }],
      workBonusBalance: toCents(11_800),
    }),
    true,
  );
  assert.equal(result.eligibleIncome, toCents(0));
  assert.equal(result.assessedEmploymentIncome, toCents(0));
  assert.equal(result.fromBalance, toCents(0), 'nothing was drawn from the balance for deemed income');
});

test('a Person below Age Pension age gets no Work Bonus, and their balance does not move', () => {
  const result = applyWorkBonus(
    person('Blair', { employmentIncomePerFortnight: toCents(1_000), workBonusBalance: toCents(4_000) }),
    false,
  );
  assert.equal(result.assessedEmploymentIncome, toCents(1_000));
  assert.equal(result.balanceAfter, toCents(4_000));
  assert.equal(result.eligible, false);
});
