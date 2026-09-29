// P3-1 and P3-2 — income tax, the Medicare levy, LITO, SAPTO, and the five income bases.
// Register §2.
//
// Every expected figure below is hand-worked from `docs/assumptions-register.md` and the working
// is written out beside it. Nothing here was produced by running the implementation and pasting
// the output: an expectation generated that way proves only that the code agrees with itself.
//
// Three of the fixtures are the register's own published worked examples — §2.4's threshold sets,
// §2.5's *Ying and Li Jun*, and §2.6's FY2026-27 transfer check — so they are independent of both
// the code and of my arithmetic.
//
// Every Person here is synthetic: round numbers, placeholder names, no real personal figures.
import test from 'node:test';
import assert from 'node:assert/strict';

import { addCents, subCents, toCents } from '../dist/core/money.js';
import { readFile } from 'node:fs/promises';
import { personalDeductibleContributions } from '../dist/core/superConcessional.js';
import {
  MissingNetLabourIncomeComponentError,
  div293Income,
  familyIncome,
  netLabourIncome,
  netLabourIncomeFromSalary,
  rebateIncome,
  rebateIncomeFrom,
  reportableSuperannuationContributions,
  surchargeIncome,
  taxableIncome,
} from '../dist/core/incomeBases.js';
import {
  TAX,
  entitledToWorkingAustraliansOffset,
  s25130AppliesToYear,
  standardDeductionAmount,
  standardDeductionAmountFor,
  taxYear,
  watoShadeInPointFor,
} from '../dist/data/assumptions/tax.js';
import {
  MissingBracketTableError,
  NetLabourIncomeNotSuppliedError,
  bracketTableOf,
  householdIncomeTax,
  lowIncomeTaxOffset,
  medicareLevy,
  seniorsAndPensionersOffset,
  spouseContributionOffset,
  taxOnTaxableIncome,
  workingAustraliansTaxOffset,
} from '../dist/core/incomeTax.js';

const ti = (dollars) => taxableIncome(toCents(dollars));

/** A Person whose Rebate Income equals their taxable income — no add-backs. */
const person = (name, dollars, overrides = {}) => ({
  name,
  taxableIncome: ti(dollars),
  rebateIncome: rebateIncomeFrom(ti(dollars)),
  qualifiedForAgePension: true,
  ...overrides,
});

const FY = '2026-27';

// --- P3-19 helpers, used both by the pure-function fixtures and the household ones below --------

const NO_PERSONAL_DEDUCTIBLE = personalDeductibleContributions(toCents(0), { noticeOfIntentAcknowledged: false });

/** The RECEIVING spouse's own reportable employer super contributions, isolated from the other two limbs. */
const reportableEmployerSuper = (dollars) =>
  reportableSuperannuationContributions({
    salarySacrificed: toCents(0),
    otherReportableEmployerContributions: toCents(dollars),
    personalDeductible: NO_PERSONAL_DEDUCTIBLE,
    excessConcessionalContributions: toCents(0),
  });

/** `SpouseIncomeTestComponents` for a receiving spouse, built from the three named limbs. */
const spouseIncome = (assessableDollars, rfbDollars = 0, reportableEmployerSuperDollars = 0) => ({
  assessableIncome: ti(assessableDollars),
  reportableFringeBenefitsTotal: toCents(rfbDollars),
  reportableSuperannuationContributions: reportableEmployerSuper(reportableEmployerSuperDollars),
});

// --- P3-2: the five income bases ----------------------------------------------------------------

test('P3-2 — Rebate Income adds back what taxable income took out, so the two differ', () => {
  // Register §2.3. A Person on $80,000 salary who sacrifices $20,000: taxable income $60,000,
  // reportable superannuation contributions $20,000, so Rebate Income is $80,000 again.
  const taxable = ti(60_000);
  const rebate = rebateIncome({
    taxableIncome: taxable,
    reportableSuperContributions: toCents(20_000),
    totalNetInvestmentLoss: toCents(0),
    adjustedFringeBenefitsTotal: toCents(0),
    assessableFhssReleasedAmounts: toCents(0),
  });
  assert.equal(taxable, toCents(60_000));
  assert.equal(rebate, toCents(80_000));
  assert.notEqual(taxable, rebate);
});

test('P3-2 — a total net investment loss and adjusted fringe benefits are add-backs; FHSS is not', () => {
  // $50,000 + $3,000 RSC + $2,000 TNIL + $1,500 AFB − $4,000 FHSS = $52,500.
  assert.equal(
    rebateIncome({
      taxableIncome: ti(50_000),
      reportableSuperContributions: toCents(3_000),
      totalNetInvestmentLoss: toCents(2_000),
      adjustedFringeBenefitsTotal: toCents(1_500),
      assessableFhssReleasedAmounts: toCents(4_000),
    }),
    toCents(52_500),
  );
});

test('P3-2 — family income is the sum of both Persons\' TAXABLE incomes (Medicare Levy Act s 8(5))', () => {
  assert.equal(familyIncome(ti(54_020), ti(25_677)), toCents(79_697));
  assert.equal(familyIncome(ti(42_000)), toCents(42_000));
});

// The seven s 995-1(1) limbs for one synthetic Person, used by the three tests below. Every limb
// is stated, including the nil ones: that is the shape of the definition, not a convenience.
const surchargeComponents = {
  taxableIncome: ti(120_000), // (a)
  assessableFhssReleasedAmount: toCents(4_000), // (a)'s first disregard — SUBTRACTS
  familyTrustDistributionTaxReduction: toCents(3_000), // (a)'s second disregard — ADDS BACK
  reportableFringeBenefitsTotal: toCents(9_000), // (b)
  reportableSuperannuationContributions: toCents(25_000), // (c) — the limb Div 293 disregards
  totalNetInvestmentLoss: toCents(6_000), // (d)
  lowRateCapLumpSumComponent: toCents(2_000), // the s 301-20(3) amount — SUBTRACTS
};

test('P3-2 — income for surcharge purposes is the s 995-1(1) sum, and two of its limbs subtract', () => {
  // ITAA 1997 s 995-1(1), hand-worked limb by limb in the order the definition writes them:
  //   (a) 120,000 − 4,000 (FHSS disregard) + 3,000 (s 271-105(1) disregard added back) = 119,000
  //   (b) + 9,000 reportable fringe benefits total                                     = 128,000
  //   (c) + 25,000 reportable superannuation contributions                             = 153,000
  //   (d) + 6,000 total net investment loss                                            = 159,000
  //   less the s 301-20(3) amount, 2,000                                               = 157,000
  assert.equal(surchargeIncome(surchargeComponents), toCents(157_000));

  // With every optional limb at nil the base is taxable income and nothing else.
  assert.equal(
    surchargeIncome({
      taxableIncome: ti(120_000),
      assessableFhssReleasedAmount: toCents(0),
      familyTrustDistributionTaxReduction: toCents(0),
      reportableFringeBenefitsTotal: toCents(0),
      reportableSuperannuationContributions: toCents(0),
      totalNetInvestmentLoss: toCents(0),
      lowRateCapLumpSumComponent: toCents(0),
    }),
    toCents(120_000),
  );
});

test('P3-2 — Div 293 income is the same sum with paragraph (c) left out (s 293-20(1)(a))', () => {
  // The same $157,000, disregarding the $25,000 of reportable superannuation contributions.
  assert.equal(div293Income(surchargeComponents), toCents(132_000));
  assert.equal(subCents(surchargeIncome(surchargeComponents), div293Income(surchargeComponents)), toCents(25_000));
});

test('P3-2 — an omitted surcharge limb is refused by name, not summed as NaN', () => {
  // Four of the seven are Settings, so omission is the likely mistake, and a JavaScript caller
  // gets no compile error for it. Without the guard this surfaced two frames away inside
  // `addCents` as "not a whole number of cents: NaN", naming neither the limb nor the base.
  const { reportableFringeBenefitsTotal: _omitted, ...missingOneLimb } = surchargeComponents;
  assert.throws(() => surchargeIncome(missingOneLimb), {
    name: 'MissingSurchargeComponentError',
    component: 'reportableFringeBenefitsTotal',
  });
  assert.throws(() => div293Income(missingOneLimb), { name: 'MissingSurchargeComponentError' });
});

test('P3-2 — a negative taxable income is refused, not clamped', () => {
  assert.throws(() => taxableIncome(toCents(-1)), RangeError);
});

// --- Income tax on taxable income ---------------------------------------------------------------

test('the FY2026-27 brackets are marginal, hand-worked at four points', () => {
  // §2.1: nil to $18,200 · 15% to $45,000 · 30% to $135,000 · 37% to $190,000 · 45% above.
  assert.equal(taxOnTaxableIncome(FY, ti(18_200)), toCents(0));

  // $45,000: (45,000 − 18,200) × 15% = 26,800 × 0.15 = $4,020.00
  assert.equal(taxOnTaxableIncome(FY, ti(45_000)), toCents(4_020));

  // $60,000: 4,020 + (60,000 − 45,000) × 30% = 4,020 + 4,500 = $8,520.00
  assert.equal(taxOnTaxableIncome(FY, ti(60_000)), toCents(8_520));

  // $200,000: 4,020 + 90,000 × 30% (= 27,000) + 55,000 × 37% (= 20,350) + 10,000 × 45% (= 4,500)
  //         = 4,020 + 27,000 + 20,350 + 4,500 = $55,870.00
  assert.equal(taxOnTaxableIncome(FY, ti(200_000)), toCents(55_870));
});

test('FY2027-28 is computed, on Sch 7 Pt I\'s own third table: 14% / 30% / 37% / 45%', () => {
  // This year was REFUSED until RULINGS.md R12. The table is 0 to $18,200 · 14% to $45,000 · 30%
  // to $135,000 · 37% to $190,000 · 45% above — the thresholds are §2.1's never-indexed constant,
  // the 14% is law from 1 Jul 2027, and the top three rates are FY2026-27's carried forward, which
  // over-states tax or is exactly right and cannot flatter the household.
  //
  // Hand-worked from the register, not from the implementation.
  // $60,000: (45,000 − 18,200) × 14% (= 3,752) + 15,000 × 30% (= 4,500) = $8,252.00
  assert.equal(taxOnTaxableIncome('2027-28', ti(60_000)), toCents(8_252));

  // $200,000: 3,752 + 90,000 × 30% (= 27,000) + 55,000 × 37% (= 20,350) + 10,000 × 45% (= 4,500)
  //         = 3,752 + 27,000 + 20,350 + 4,500 = $55,602.00
  assert.equal(taxOnTaxableIncome('2027-28', ti(200_000)), toCents(55_602));

  // And it is cheaper than the same income in FY2026-27, by exactly the 1% cut on the second
  // bracket's $26,800 width: 8,520 − 8,252 = $268.00.
  assert.equal(subCents(taxOnTaxableIncome(FY, ti(60_000)), taxOnTaxableIncome('2027-28', ti(60_000))), toCents(268));
});

test('the bracket-table refusal survives R12, and a SYNTHETIC table-less year still fires it', () => {
  // R12 narrowed this refusal; it did not delete it. Deleting it is the naive repair and is
  // forbidden — `brackets` is an optional field, so a year record without a table remains
  // constructible, and the guard is what stops one reaching the arithmetic.
  //
  // No real input can reach it any more, which is exactly the danger: an unreachable guard is
  // decoration (cf. the Div 296 CGT phase-in discount, computed and reachable by nobody). So the
  // record below is SYNTHETIC — a fabricated `TaxYear` that exists only in this test, is not a
  // financial year of the build, and must never be mistaken for an assumption. `bracketTableOf`
  // takes the year record precisely so this seam exists.
  const SYNTHETIC_YEAR_WITHOUT_A_TABLE = {
    taxFreeThreshold: { value: toCents(18_200) },
    lowestMarginalRate: { value: 0.14 },
    secondLowestMarginalRate: { value: 0.3 },
    // no `brackets` — the whole point of the fixture
  };
  assert.throws(() => bracketTableOf('2029-30', SYNTHETIC_YEAR_WITHOUT_A_TABLE), MissingBracketTableError);

  // A year that carries one is returned, not thrown on — the guard is narrow, not a blanket.
  assert.equal(bracketTableOf('2027-28', taxYear('2027-28')).value.length, 5);

  // And the OUTER boundary stays nameless and is accepted (R12): a year absent from the year table
  // never reaches this refusal, because `taxYear` raises a bare `RangeError` first.
  //
  // **THE EXAMPLE YEAR MOVED, and that is P2-10b's whole effect on this boundary.** It used to be
  // FY2030-31. Sch 7 Pt I's table for "the 2027-28 year of income OR A LATER YEAR OF INCOME" now
  // answers FY2030-31 and every year after it, so the refusal no longer lies above the window —
  // it lies BELOW it. FY2025-26 is refused because Sch 7's earlier tables name their years
  // expressly and there is no standing table running backwards.
  assert.throws(() => taxOnTaxableIncome('2025-26', ti(60_000)), (error) => {
    assert.equal(error.name, 'RangeError');
    assert.match(error.message, /no tax assumptions for FY2025-26/);
    return true;
  });
  // The year that used to be the example is now COMPUTED, on the standing table, and it is the
  // same ladder as FY2027-28's to the cent — which is the point, and why it is `standingLawFrom`
  // and not the figure that tells a reader which kind of answer this is.
  assert.equal(taxOnTaxableIncome('2030-31', ti(60_000)), taxOnTaxableIncome('2027-28', ti(60_000)));
  assert.equal(taxYear('2030-31').standingLawFrom, '2027-28');
  assert.equal(taxYear('2027-28').standingLawFrom, undefined);
});

// --- LITO ---------------------------------------------------------------------------------------

test('LITO is the §2.2 step function, hand-worked including the join and the clamp', () => {
  assert.equal(lowIncomeTaxOffset(ti(30_000)), toCents(700)); // ≤ $37,500 — the maximum
  assert.equal(lowIncomeTaxOffset(ti(37_500)), toCents(700)); // the band edge is inclusive

  // $40,000: 700 − 0.05 × 2,500 = 700 − 125 = $575
  assert.equal(lowIncomeTaxOffset(ti(40_000)), toCents(575));

  // $45,000: the limbs join — 700 − 0.05 × 7,500 = $325, and the stage-2 base is $325
  assert.equal(lowIncomeTaxOffset(ti(45_000)), toCents(325));

  // $50,000: 325 − 0.015 × 5,000 = 325 − 75 = $250
  assert.equal(lowIncomeTaxOffset(ti(50_000)), toCents(250));

  // $66,667: 325 − 0.015 × 21,667 = 325 − 325.005 = −$0.005. The clamp, not the gate, fires here.
  assert.equal(lowIncomeTaxOffset(ti(66_667)), toCents(0));

  // $66,668: above the s 61-110(1)(b) ceiling — the gate fires.
  assert.equal(lowIncomeTaxOffset(ti(66_668)), toCents(0));
  assert.equal(lowIncomeTaxOffset(ti(200_000)), toCents(0));
});

// --- SAPTO --------------------------------------------------------------------------------------

test('the FY2026-27 single thresholds reach the offset — §2.4 publishes $36,034 / $53,874', () => {
  const single = (dollars) =>
    seniorsAndPensionersOffset({ fy: FY, relationship: 'single', persons: [person('Sam', dollars)] });

  const atShadeOut = single(36_034);
  assert.equal(atShadeOut.persons[0].threshold.shadeOut, toCents(36_034));
  assert.equal(atShadeOut.persons[0].threshold.cutOut, toCents(53_874));
  assert.equal(atShadeOut.persons[0].offset, toCents(2_230)); // the full base rebate amount

  // $40,000: 2,230 − 0.125 × (40,000 − 36,034) = 2,230 − 495.75 = 1,734.25, rounded UP → $1,735
  assert.equal(single(40_000).persons[0].offset, toCents(1_735));

  // At the cut-out the offset is nil, and eligibility fails with it.
  assert.equal(single(53_874).persons[0].offset, toCents(0));
  assert.equal(single(53_874).persons[0].eligibility.passed, false);
});

test('T2 — Ying and Li Jun: both eligible on half combined, one receives $0 on their own', () => {
  // Register §2.5, the ATO worked example. Combined Rebate Income $79,697 halves to $39,848.50,
  // below the couple cut-out, so BOTH pass the gate. Ying's OWN $54,020 is above the cut-out, so
  // Ying's amount is $0; Li Jun's $25,677 is below the shade-out, so Li Jun takes the full $1,602.
  //
  // The example is published against FY2025-26 parameters and reproduces unchanged at FY2026-27's,
  // because $39,848.50 clears both cut-outs ($43,810 then $44,663) and the couple base rebate
  // amount is $1,602 in both years.
  const result = seniorsAndPensionersOffset({
    fy: FY,
    relationship: 'couple',
    persons: [person('Ying', 54_020), person('Li Jun', 25_677)],
  });

  assert.equal(result.combinedRebateIncome, toCents(79_697));
  for (const each of result.persons) {
    assert.equal(each.eligibility.basis, 'half combined Rebate Income');
    assert.equal(each.eligibility.incomeTested, toCents(39_848.5));
    assert.equal(each.eligibility.cutOut, toCents(44_663));
    assert.equal(each.eligibility.passed, true);
  }

  assert.equal(result.persons[0].offset, toCents(0));
  assert.equal(result.persons[1].offset, toCents(1_602));

  // Li Jun could transfer to Ying — Li Jun's tax payable on $25,677 is $1,121.55, below the
  // $1,602 base rebate amount — but the s 12(3)(b)(ii) formula gives
  // 1,602 − (25,677 − 6,000) × 0.15 = 1,602 − 2,951.55, which is negative and clamps to nil.
  assert.equal(result.persons[0].transferReceived, null);
  assert.equal(result.persons[0].augmentedBaseRebateAmount, toCents(1_602));
});

test('§2.6 FY2026-27 worked transfer check reconciles end to end: $1,002, $37,727, $2,070', () => {
  // Couple. The transferor has taxable income $10,000; the transferee's Rebate Income is $42,000.
  //   gate:        (10,000 + 42,000) / 2 = $26,000, below the $44,663 cut-out — both eligible
  //   transferee's untransferred amount: 1,602 − 0.125 × (42,000 − 31,847) = $332.875 → $333,
  //                                      which is below $1,602, so a transfer may be made
  //   transfer:    1,602 − (10,000 − 6,000) × 0.15 = $1,002        (reg s 12(3)(b)(ii))
  //   BRA*:        1,602 + 1,002 = $2,604
  //   T5:          18,200 + (445 + 2,604) / 0.15 = $38,526.67 > $37,000, so reg s 9(6) applies
  //   S7:          37,000 × (0.015 + 0.30 − 0.15) = $6,105
  //   T:           (0.15 × 18,200 + 445 + 2,604 + 6,105) / 0.315 = 11,884 / 0.315 = $37,726.98 → $37,727
  //   amount:      2,604 − 0.125 × (42,000 − 37,727) = 2,604 − 534.125 = $2,069.875 → $2,070
  const result = seniorsAndPensionersOffset({
    fy: FY,
    relationship: 'couple',
    persons: [person('Robin', 10_000), person('Sasha', 42_000)],
  });

  const sasha = result.persons[1];
  assert.equal(sasha.transferReceived.from, 'Robin');
  assert.equal(sasha.transferReceived.amount, toCents(1_002));
  assert.equal(sasha.augmentedBaseRebateAmount, toCents(2_604));
  assert.equal(sasha.threshold.branch, 'reg-s-9(6)');
  assert.equal(sasha.threshold.shadeOut, toCents(37_727));
  assert.equal(sasha.offset, toCents(2_070));

  // T3 — the gate never moved. It was decided on the untransferred $1,602 amount, whose cut-out
  // is $44,663, and the transferee's own threshold before the transfer is the untransferred one.
  assert.equal(sasha.eligibility.cutOut, toCents(44_663));
  assert.equal(sasha.thresholdBeforeTransfer.shadeOut, toCents(31_847));
  assert.equal(sasha.thresholdBeforeTransfer.branch, 'reg-s-9(5)');

  // The transferor keeps their own full amount; nothing is transferred back the other way.
  assert.equal(result.persons[0].offset, toCents(1_602));
  assert.equal(result.persons[0].transferReceived, null);
});

test('T9 — a Person who salary sacrifices: SAPTO reads Rebate Income and the transfer reads taxable', () => {
  // The case the register\'s §9 T9 row names — "a Person with reportable superannuation
  // contributions — the bases must differ". Everywhere else in this file the two figures are the
  // same number, which is precisely why the conflation is invisible on a demo Household.
  //
  // Taxable income $30,000, reportable superannuation contributions $15,000 ⇒ Rebate Income
  // $45,000. SAPTO reads $45,000:
  //   2,230 − 0.125 × (45,000 − 36,034) = 2,230 − 1,120.75 = $1,109.25, rounded UP → $1,110
  // Reading taxable income instead would put the Person below the $36,034 shade-out and hand
  // them the full $2,230 — $1,120 too much.
  const sacrificer = {
    name: 'Kim',
    taxableIncome: ti(30_000),
    rebateIncome: rebateIncome({
      taxableIncome: ti(30_000),
      reportableSuperContributions: toCents(15_000),
      totalNetInvestmentLoss: toCents(0),
      adjustedFringeBenefitsTotal: toCents(0),
      assessableFhssReleasedAmounts: toCents(0),
    }),
    qualifiedForAgePension: true,
  };
  const single = seniorsAndPensionersOffset({ fy: FY, relationship: 'single', persons: [sacrificer] });
  assert.equal(single.persons[0].eligibility.incomeTested, toCents(45_000));
  assert.equal(single.persons[0].offset, toCents(1_110));
  assert.notEqual(single.persons[0].offset, toCents(2_230));

  // And reg s 12(3)(b)(ii) reads the transferor\'s TAXABLE income, not their Rebate Income.
  // Transferor: taxable $10,000, RSC $8,000 ⇒ Rebate Income $18,000.
  //   gate:     (18,000 + 42,000) / 2 = $30,000, below the $31,847 shade-out — both eligible
  //   transfer: 1,602 − (10,000 − 6,000) × 0.15 = $1,002, on TAXABLE income
  //             on Rebate Income it would be 1,602 − 12,000 × 0.15 = −$198 ⇒ nil, and the
  //             transferee would keep the untransferred $333 instead of $2,070
  const transferor = {
    name: 'Robin',
    taxableIncome: ti(10_000),
    rebateIncome: rebateIncome({
      taxableIncome: ti(10_000),
      reportableSuperContributions: toCents(8_000),
      totalNetInvestmentLoss: toCents(0),
      adjustedFringeBenefitsTotal: toCents(0),
      assessableFhssReleasedAmounts: toCents(0),
    }),
    qualifiedForAgePension: true,
  };
  const couple = seniorsAndPensionersOffset({
    fy: FY,
    relationship: 'couple',
    persons: [transferor, person('Sasha', 42_000)],
  });
  assert.equal(couple.combinedRebateIncome, toCents(60_000));
  assert.equal(couple.persons[1].transferReceived.amount, toCents(1_002));
  assert.equal(couple.persons[1].offset, toCents(2_070));
  assert.equal(couple.persons[0].offset, toCents(1_602));
});

test('a Person who has not reached Age Pension age, or is in gaol all year, gets nothing', () => {
  const result = seniorsAndPensionersOffset({
    fy: FY,
    relationship: 'couple',
    persons: [person('Robin', 10_000, { qualifiedForAgePension: false }), person('Sasha', 42_000)],
  });
  assert.equal(result.persons[0].eligibility.passed, false);
  assert.equal(result.persons[0].offset, toCents(0));
  // And with no eligible transferor, the transferee is back to the untransferred amount: $333.
  assert.equal(result.persons[1].transferReceived, null);
  assert.equal(result.persons[1].offset, toCents(333));

  const gaoled = seniorsAndPensionersOffset({
    fy: FY,
    relationship: 'single',
    persons: [person('Sam', 30_000, { inGaolForTheWholeYear: true })],
  });
  assert.equal(gaoled.persons[0].offset, toCents(0));
});

test('the relationship and the number of Persons must agree — reg s 9(3)', () => {
  assert.throws(
    () => seniorsAndPensionersOffset({ fy: FY, relationship: 'single', persons: [person('A', 1), person('B', 1)] }),
    RangeError,
  );
  assert.throws(
    () => seniorsAndPensionersOffset({ fy: FY, relationship: 'couple', persons: [person('A', 1)] }),
    RangeError,
  );
});

test('an illness separated couple takes the $2,040 amount and is still gated on half combined', () => {
  const result = seniorsAndPensionersOffset({
    fy: FY,
    relationship: 'illnessSeparated',
    persons: [person('Robin', 10_000), person('Sasha', 42_000)],
  });
  assert.equal(result.persons[0].baseRebateAmount, toCents(2_040));
  assert.equal(result.persons[0].eligibility.basis, 'half combined Rebate Income');
  // §2.4: the illness-separated FY2026-27 shade-out is $34,767 and the cut-out $51,087.
  assert.equal(result.persons[0].thresholdBeforeTransfer.shadeOut, toCents(34_767));
  assert.equal(result.persons[0].eligibility.cutOut, toCents(51_087));
});

test('FY2027-28 SAPTO reaches reg s 9(6) with no transfer, and reports the Act it used', () => {
  // §2.4: at a 14% lowest rate the single case alone gives T5 = 18,200 + 2,675/0.14 = $37,307,
  // above the $37,000 reduction threshold, so s 9(6) is the default with no transfer at all.
  //   S7 = 37,000 × (0.015 + 0.30 − 0.14) = $6,475
  //   T  = (0.14 × 18,200 + 445 + 2,230 + 6,475) / 0.315 = 11,698 / 0.315 = $37,136.51 → $37,137
  const result = seniorsAndPensionersOffset({
    fy: '2027-28',
    relationship: 'single',
    persons: [person('Sam', 30_000)],
  });
  assert.equal(result.persons[0].threshold.branch, 'reg-s-9(6)');
  assert.equal(result.persons[0].threshold.shadeOut, toCents(37_137));

  // That $37,137 is only as good as the 0.30 it was computed from. Until P2-10b that rate was
  // R12's carry-forward and this assertion read `unverified`; Income Tax Rates Act 1986 Sch 7
  // Pt I cl 1(b)'s FY2027-28 table has since been read directly and states it, so the consolidated
  // confidence is now the strongest the inputs allow. The ASSERTION IS NOT RELAXED, only moved:
  // it still pins the exact label, so a rate quietly weakened back to a guess fails here.
  assert.equal(result.provenance.confidence, 'primary-verified');
  assert.equal(result.provenance.fy, '2027-28');
  // The caveats that remain are a DIFFERENT weakness and must not be swept up with the old one:
  // the SAPTO regulation's own dollar figures are stamped FY2026-27 and were applied to FY2027-28.
  // That is a year-stamp mismatch, not an unsourced rate, and §2.4 is what has to close it.
  assert.deepEqual(result.provenance.caveats, [
    'tax.sapto.rebateMaximumAmount is stamped FY2026-27 and was applied to FY2027-28',
    'tax.sapto.rebateReductionThreshold is stamped FY2026-27 and was applied to FY2027-28',
    'tax.sapto.baseRebateAmount.single is stamped FY2026-27 and was applied to FY2027-28',
  ]);
  // …and no caveat names a marginal rate any more, which is exactly what P2-10b changed here.
  assert.ok(!result.provenance.caveats.some((line) => line.includes('MarginalRate')));
});

test('the FY2027-28 couple threshold moves with the 14% rate and stays on reg s 9(5)', () => {
  // T5/T6. The same base rebate amount, a different year, a different threshold — which is what
  // makes hard-coding the published FY2026-27 $31,847 / $44,663 wrong rather than merely lazy.
  //   T5 = 18,200 + (445 + 1,602) / 0.14 = 18,200 + 14,621.43 = $32,821.43
  //   $32,821.43 is NOT above the $37,000 reduction threshold, so reg s 9(5) still applies —
  //   §2.4 says s 9(6) becomes the default at 0.14 for the SINGLE case alone, and this is why.
  //   shade-out = ceil(32,821.43)                             = $32,822
  //   cut-out   = ceil(1,602 / 0.125 + 32,822) = 12,816 + 32,822 = $45,638
  //
  // Both Persons sit below the shade-out, so both take the full amount and no transfer is
  // attempted. Until R12 that was also the ONLY way to compute a FY2027-28 couple, because the
  // reg s 12 transfer precondition needs a bracket table the register did not then carry for that
  // year; it carries one now, so the restriction is gone and this fixture is simply about s 9(5).
  const result = seniorsAndPensionersOffset({
    fy: '2027-28',
    relationship: 'couple',
    persons: [person('Robin', 30_000), person('Sasha', 30_000)],
  });
  assert.equal(result.persons[0].threshold.branch, 'reg-s-9(5)');
  assert.equal(result.persons[0].threshold.shadeOut, toCents(32_822));
  assert.equal(result.persons[0].threshold.cutOut, toCents(45_638));
  assert.notEqual(result.persons[0].threshold.shadeOut, toCents(31_847));
  assert.equal(result.persons[0].offset, toCents(1_602));

  // reg s 9(5) never reads the second-lowest marginal rate, so the FY2027-28 result that does not
  // touch it is not tarred with its unverified confidence.
  assert.equal(result.provenance.confidence, 'primary-verified');
});

test('FY2026-27 SAPTO on the reg s 9(5) branch is primary-verified and carries no caveats', () => {
  const result = seniorsAndPensionersOffset({ fy: FY, relationship: 'single', persons: [person('Sam', 30_000)] });
  assert.equal(result.persons[0].threshold.branch, 'reg-s-9(5)');
  assert.equal(result.provenance.confidence, 'primary-verified');
  assert.deepEqual(result.provenance.caveats, []);
});

// --- The Medicare levy --------------------------------------------------------------------------

test('the singles levy: nil, then the s 7(2) shade-in, then 2% — hand-worked at five points', () => {
  const levy = (dollars, sapto = 0) =>
    medicareLevy({ fy: FY, taxableIncome: ti(dollars), saptoReceived: toCents(sapto) }).levy;

  // §2.7: single lower $28,011, single upper $35,013 (FY2025-26, carried as a labelled fallback).
  assert.equal(levy(28_011), toCents(0));

  // $30,000: 10% × (30,000 − 28,011) = $198.90
  assert.equal(levy(30_000), toCents(198.9));

  // $35,013: 10% × 7,002 = $700.20. The published upper truncates from $35,013.75, which is where
  // the shade-in actually meets 2% (0.08x = 2,801.10), so at $35,013 the shade-in is still lower.
  assert.equal(levy(35_013), toCents(700.2));

  // $40,000: above the upper — the full 2% = $800.00
  assert.equal(levy(40_000), toCents(800));
});

test('T8 — the seniors thresholds switch on computed SAPTO, and $0 SAPTO means the ordinary ones', () => {
  // Seniors single lower $44,268, upper $55,335 (§2.7).
  const withOffset = medicareLevy({ fy: FY, taxableIncome: ti(50_000), saptoReceived: toCents(1) });
  assert.equal(withOffset.seniorsThresholds, true);
  assert.equal(withOffset.lowerThreshold, toCents(44_268));
  // 10% × (50,000 − 44,268) = $573.20
  assert.equal(withOffset.levy, toCents(573.2));

  // The same income with no offset received takes the ordinary thresholds: 2% × 50,000 = $1,000.
  const withoutOffset = medicareLevy({ fy: FY, taxableIncome: ti(50_000), saptoReceived: toCents(0) });
  assert.equal(withoutOffset.seniorsThresholds, false);
  assert.equal(withoutOffset.lowerThreshold, toCents(28_011));
  assert.equal(withoutOffset.levy, toCents(1_000));

  // And Ying, from the T2 fixture, is the case that separates the two designs. Ying is ELIGIBLE
  // — the half-combined gate passed — but receives $0, so the ordinary thresholds apply:
  //   ordinary: 2% × 54,020                    = $1,080.40
  //   seniors:  10% × (54,020 − 44,268)         =   $975.20
  // A $105.20 difference, on a Person the eligibility test and the amount test disagree about.
  const ying = medicareLevy({ fy: FY, taxableIncome: ti(54_020), saptoReceived: toCents(0) });
  assert.equal(ying.levy, toCents(1_080.4));
  assert.notEqual(ying.levy, toCents(975.2));
});

test('T10 — a levy computed for FY2026-27 says which year its thresholds came from', () => {
  const result = medicareLevy({ fy: FY, taxableIncome: ti(40_000), saptoReceived: toCents(0) });
  assert.ok(
    result.provenance.caveats.some(
      (line) => line.includes('singleLower') && line.includes('FY2025-26') && line.includes('prior-year fallback'),
    ),
    `expected a prior-year fallback caveat, got ${JSON.stringify(result.provenance.caveats)}`,
  );
});

test('the family test: s 7(1) still gives nil, the family lower gives nil, and above the family upper s 7(2) still caps', () => {
  const familyLevy = (own, other, sapto = 0) =>
    medicareLevy({
      fy: FY,
      taxableIncome: ti(own),
      saptoReceived: toCents(sapto),
      familyIncome: familyIncome(ti(own), ti(other)),
    });

  // Own taxable income at or below the single lower threshold — s 7(1), whatever the family does.
  assert.equal(familyLevy(20_000, 60_000).levy, toCents(0));
  assert.equal(familyLevy(20_000, 60_000).basis, 's 7 — the Person alone');

  // Family income $45,000, below the $47,238 family lower threshold — nil for both.
  assert.equal(familyLevy(30_000, 15_000).levy, toCents(0));
  assert.equal(familyLevy(30_000, 15_000).basis, 's 8 — family income');

  // Family income $80,000, above the $59,047 family upper, so s 8 reduces nothing and what the
  // Person pays is what s 7 left. s 7 has no married-person carve-out and runs before s 8, so
  // s 7(2) still caps this Person's levy against their OWN §2.7 figures:
  //   own taxable income                                              $30,000.00
  //   own threshold amount (single lower)                             $28,011.00  ⇒ s 7(1) passed
  //   own phase-in limit (single upper)                               $35,013.00  ⇒ s 7(2) applies
  //   s 7(2) ceiling: 10% × (30,000 − 28,011) = 10% × 1,989       =      $198.90
  //   2% levy:        2%  ×  30,000                               =      $600.00
  //   "shall not exceed" ⇒ the lesser                              =      $198.90
  // This assertion previously read $600.00 — the s 7(2) ceiling was applied only to a Person
  // assessed alone, which is a carve-out s 7 does not contain. Three times too much levy.
  assert.equal(familyLevy(30_000, 50_000).levy, toCents(198.9));
  assert.notEqual(familyLevy(30_000, 50_000).levy, toCents(600));
  assert.equal(familyLevy(30_000, 50_000).sevenTwoCeiling, toCents(198.9));
  assert.equal(familyLevy(30_000, 50_000).upperThreshold, toCents(59_047));
});

test('s 7(2) does not know whether the Person has a spouse — the reported family-path bug', () => {
  // The reproduction: FY2026-27, no dependants, the Person on $30,000, the spouse on $40,000.
  // Family income $70,000 is above the $59,047 family upper, so s 8 grants nothing; s 7(2) caps
  // the levy at 10% × (30,000 − 28,011) = $198.90, against $600.00 for a bare 2%.
  //
  // Run in two financial years. The §2.7 thresholds are one prior-year fallback record shared by
  // every year, so the AMOUNT is year-invariant by construction and the second year is here to
  // keep the fixture honest about that: what changes between the years is the provenance, since
  // the 2% rate is stamped FY2026-27 and nothing else is.
  for (const fy of ['2026-27', '2027-28']) {
    const result = medicareLevy({
      fy,
      taxableIncome: ti(30_000),
      saptoReceived: toCents(0),
      familyIncome: familyIncome(ti(30_000), ti(40_000)),
    });
    assert.equal(result.levy, toCents(198.9), `own s 7(2) ceiling in FY${fy}`);
    assert.notEqual(result.levy, toCents(600));
    assert.equal(result.sevenTwoCeiling, toCents(198.9));
    assert.equal(result.basis, 's 8 — family income');
    // The ceiling is measured against the Person's own $28,011, never the $47,238 family lower:
    // 10% × (30,000 − 47,238) would be negative, and a negative levy is not a reading of s 7(2).
    assert.ok(result.levy > toCents(0));
    // The prior-year fallback caveats survive the family path.
    assert.ok(
      result.provenance.caveats.some((line) => line.includes('singleLower') && line.includes('prior-year fallback')),
      `expected the singleLower fallback caveat in FY${fy}, got ${JSON.stringify(result.provenance.caveats)}`,
    );
  }

  // FY2027-28 additionally says the 2% rate was stamped for another year; FY2026-27 does not.
  const stamp = (fy) =>
    medicareLevy({
      fy,
      taxableIncome: ti(30_000),
      saptoReceived: toCents(0),
      familyIncome: familyIncome(ti(30_000), ti(40_000)),
    }).provenance.caveats.some((line) => line.includes('tax.medicareLevy.rate') && line.includes('applied to FY2027-28'));
  assert.equal(stamp('2027-28'), true);
  assert.equal(stamp('2026-27'), false);
});

test('the three positions against a Person\'s own s 3(1) thresholds, all on the family path', () => {
  // Every case below has family income above the $59,047 family upper, so s 8 reduces nothing and
  // the answer is s 7 alone. Only the Person's own taxable income moves.
  const own = (dollars, spouse, fy = FY) =>
    medicareLevy({
      fy,
      taxableIncome: ti(dollars),
      saptoReceived: toCents(0),
      familyIncome: familyIncome(ti(dollars), ti(spouse)),
    });

  // BELOW the Person's own threshold amount — s 7(1), nil, no ceiling to report. $28,011 exactly
  // is "does not exceed", so it is still nil. Family income $88,011.
  const below = own(28_011, 60_000);
  assert.equal(below.levy, toCents(0));
  assert.equal(below.basis, 's 7 — the Person alone');
  assert.equal(below.sevenTwoCeiling, undefined);

  // INSIDE the range, at the top of it: $35,013 is the phase-in limit and "does not exceed" it.
  //   s 7(2): 10% × (35,013 − 28,011) = 10% × 7,002 = $700.20
  //   2%:     2% × 35,013                          = $700.26
  // The published upper is 28,011 × 1.25 = 35,013.75 truncated, so the two do not quite meet and
  // the ceiling is still the lesser by 6c. Family income $95,013.
  const atLimit = own(35_013, 60_000);
  assert.equal(atLimit.levy, toCents(700.2));
  assert.equal(atLimit.sevenTwoCeiling, toCents(700.2));

  // ABOVE the phase-in limit — s 7(2) is spent, the full 2% applies and no ceiling is reported.
  //   2% × 40,000 = $800.00. Family income $100,000.
  const above = own(40_000, 60_000);
  assert.equal(above.levy, toCents(800));
  assert.equal(above.sevenTwoCeiling, undefined);
  assert.equal(above.band, 'full levy');

  // And the same three answers in FY2027-28: the thresholds are the same shared fallback record.
  assert.equal(own(28_011, 60_000, '2027-28').levy, toCents(0));
  assert.equal(own(35_013, 60_000, '2027-28').levy, toCents(700.2));
  assert.equal(own(40_000, 60_000, '2027-28').levy, toCents(800));
});

test('T8 and s 7(2) both apply at once: the seniors thresholds move the ceiling, on the family path', () => {
  // A Person on $50,000 with a spouse on $30,000 — family income $80,000, above BOTH the $59,047
  // ordinary family upper and the $61,623/$77,028 seniors family band, so s 8 reduces nothing
  // either way and the seniors switch is visible in the s 7(2) ceiling alone.
  const withSapto = (sapto, fy = FY) =>
    medicareLevy({
      fy,
      taxableIncome: ti(50_000),
      saptoReceived: toCents(sapto),
      familyIncome: familyIncome(ti(50_000), ti(30_000)),
    });

  // SAPTO received > $0 ⇒ seniors thresholds $44,268 / $55,335, and $50,000 is inside them:
  //   s 7(2): 10% × (50,000 − 44,268) = 10% × 5,732 = $573.20
  //   2%:     2% × 50,000                          = $1,000.00  ⇒ the ceiling binds
  const seniors = withSapto(1);
  assert.equal(seniors.seniorsThresholds, true);
  assert.equal(seniors.levy, toCents(573.2));
  assert.equal(seniors.sevenTwoCeiling, toCents(573.2));
  assert.equal(seniors.upperThreshold, toCents(77_028)); // the family band is what `band` describes

  // $0 SAPTO received ⇒ the ordinary $28,011 / $35,013, which $50,000 is above: the full 2%.
  const ordinary = withSapto(0);
  assert.equal(ordinary.seniorsThresholds, false);
  assert.equal(ordinary.levy, toCents(1_000));
  assert.equal(ordinary.sevenTwoCeiling, undefined);

  // A $426.80 difference on one Person, from the switch alone. And in FY2027-28 as well.
  assert.equal(subCents(ordinary.levy, seniors.levy), toCents(426.8));
  assert.equal(withSapto(1, '2027-28').levy, toCents(573.2));
  assert.equal(withSapto(0, '2027-28').levy, toCents(1_000));
});

test('the family shade-in band is COMPUTED — s 8(2) has been read, and s 8(3) apportions it', () => {
  // Two Persons on $29,000 each: family income $58,000, between $47,238 and $59,047, and neither
  // is below the $28,011 single threshold. This band used to throw, because s 8(2)'s formula was
  // a GIF nobody had read and its apportionment between two spouses was inferred (O7). It has now
  // been read — see docs/research/p3-medicare-family-shadein.md — and the fixtures that pin the
  // reading down are in test/core-medicare-family-shade-in.test.mjs.
  //   s 7(2)  10% × (29,000 − 28,011)                                  =    $98.90  ⇒ base
  //   s 8(2)  0.02 × 47,238 = 944.76; 0.08 × (58,000 − 47,238) = 860.96
  //           raw                                                      =    $83.80
  //   s 8(3)  the spouse's $29,000 is above their own $28,011 ⇒ liable ⇒ apportioned:
  //           round(83.80 × 29,000/58,000) = 41.90; reduction 83.80 − 41.90 = $41.90
  //           98.90 − 41.90                                            =    $57.00
  const result = medicareLevy({
    fy: FY,
    taxableIncome: ti(29_000),
    saptoReceived: toCents(0),
    familyIncome: familyIncome(ti(29_000), ti(29_000)),
    spouse: { taxableIncome: ti(29_000), saptoReceived: toCents(0) },
  });
  assert.equal(result.band, 'shade-in');
  assert.equal(result.sevenTwoCeiling, toCents(98.9));
  assert.equal(result.familyShadeIn.raw, toCents(83.8));
  assert.equal(result.familyShadeIn.apportioned, true);
  assert.equal(result.levy, toCents(57));
});

test('dependent children lift both family thresholds by the §2.7 per-child amounts', () => {
  // Family lower 47,238 + 4,338 = $51,576; family upper 59,047 + 5,423 = $64,470.
  const result = medicareLevy({
    fy: FY,
    taxableIncome: ti(30_000),
    saptoReceived: toCents(0),
    familyIncome: familyIncome(ti(30_000), ti(21_000)),
    dependentChildren: 1,
  });
  assert.equal(result.lowerThreshold, toCents(51_576));
  assert.equal(result.upperThreshold, toCents(64_470));
  assert.equal(result.levy, toCents(0)); // $51,000 family income is below the lifted lower threshold
});

// --- The Household, end to end ------------------------------------------------------------------

test('hand-worked Household fixture — the §2.6 transfer couple, reconciled line by line', () => {
  const result = householdIncomeTax({
    fy: FY,
    relationship: 'couple',
    persons: [person('Robin', 10_000), person('Sasha', 42_000)],
  });

  // Robin, taxable income $10,000:
  //   tax:      below $18,200                                        =      $0.00
  //   LITO:     ≤ $37,500                                            =    $700.00
  //   SAPTO:    below the shade-out, full base rebate amount          =  $1,602.00
  //   offsets are non-refundable, so only $0 of $2,302 can be applied
  //   levy:     SAPTO received > $0 ⇒ seniors; $10,000 ≤ $44,268      =      $0.00
  const robin = result.persons[0];
  assert.equal(robin.taxOnTaxableIncome, toCents(0));
  assert.equal(robin.lito, toCents(700));
  assert.equal(robin.sapto, toCents(1_602));
  assert.equal(robin.offsetsApplied, toCents(0));
  assert.equal(robin.medicareLevy.seniorsThresholds, true);
  assert.equal(robin.medicareLevy.levy, toCents(0));
  assert.equal(robin.netTax, toCents(0));

  // Sasha, taxable income $42,000:
  //   tax:      (42,000 − 18,200) × 15% = 23,800 × 0.15              =  $3,570.00
  //   LITO:     700 − 0.05 × (42,000 − 37,500) = 700 − 225           =    $475.00
  //   SAPTO:    the transfer case above                              =  $2,070.00
  //   offsets:  2,070 + 475 = 2,545, below the tax                   =  $2,545.00
  //   after:    3,570 − 2,545                                        =  $1,025.00
  //   levy:     SAPTO > $0 ⇒ seniors; $42,000 ≤ $44,268 (s 7(1))     =      $0.00
  //   net tax:                                                          $1,025.00
  const sasha = result.persons[1];
  assert.equal(sasha.taxOnTaxableIncome, toCents(3_570));
  assert.equal(sasha.lito, toCents(475));
  assert.equal(sasha.sapto, toCents(2_070));
  assert.equal(sasha.offsetsApplied, toCents(2_545));
  assert.equal(sasha.taxAfterOffsets, toCents(1_025));
  assert.equal(sasha.medicareLevy.levy, toCents(0));
  assert.equal(sasha.netTax, toCents(1_025));

  // The Household figure carries the Medicare levy's prior-year fallback up with it.
  assert.equal(result.provenance.confidence, 'primary-verified');
  assert.ok(result.provenance.caveats.some((line) => line.includes('prior-year fallback')));
});

test('offsets never reduce the Medicare levy, and never turn into a refund', () => {
  // A single on $30,000: tax = (30,000 − 18,200) × 15% = $1,770.00. LITO $700. SAPTO: Rebate
  // Income $30,000 is below the $36,034 single shade-out, so the full $2,230. Offsets total
  // $2,930 against $1,770 of tax — capped at $1,770, leaving nil, never negative.
  // The levy is added after: seniors thresholds apply, $30,000 ≤ $44,268, so $0.
  const result = householdIncomeTax({ fy: FY, relationship: 'single', persons: [person('Sam', 30_000)] });
  const sam = result.persons[0];
  assert.equal(sam.taxOnTaxableIncome, toCents(1_770));
  assert.equal(sam.offsetsApplied, toCents(1_770));
  assert.equal(sam.taxAfterOffsets, toCents(0));
  assert.equal(sam.netTax, toCents(0));

  // The same Person with no SAPTO qualification pays the levy on the ordinary thresholds:
  // tax 1,770 − LITO 700 = $1,070, plus 2% × 30,000... no: $30,000 is in the shade-in band,
  // 10% × (30,000 − 28,011) = $198.90. Net $1,268.90.
  const younger = householdIncomeTax({
    fy: FY,
    relationship: 'single',
    persons: [person('Sam', 30_000, { qualifiedForAgePension: false })],
  });
  assert.equal(younger.persons[0].sapto, toCents(0));
  assert.equal(younger.persons[0].taxAfterOffsets, toCents(1_070));
  assert.equal(younger.persons[0].medicareLevy.levy, toCents(198.9));
  assert.equal(younger.persons[0].netTax, toCents(1_268.9));
});

test('the T2 couple, end to end: the Person with $0 SAPTO pays the ordinary-threshold levy', () => {
  const result = householdIncomeTax({
    fy: FY,
    relationship: 'couple',
    persons: [person('Ying', 54_020), person('Li Jun', 25_677)],
  });

  // Ying: tax = 4,020 + (54,020 − 45,000) × 30% = 4,020 + 2,706 = $6,726.00
  //       LITO = 325 − 0.015 × (54,020 − 45,000) = 325 − 135.30 = $189.70
  //       SAPTO = $0, so no seniors thresholds; family income $79,697 is above the $59,047
  //       family upper, so the full 2% × 54,020 = $1,080.40
  //       net = 6,726 − 189.70 + 1,080.40 = $7,616.70
  const ying = result.persons[0];
  assert.equal(ying.taxOnTaxableIncome, toCents(6_726));
  assert.equal(ying.lito, toCents(189.7));
  assert.equal(ying.sapto, toCents(0));
  assert.equal(ying.medicareLevy.seniorsThresholds, false);
  assert.equal(ying.medicareLevy.levy, toCents(1_080.4));
  assert.equal(ying.netTax, toCents(7_616.7));

  // Li Jun: tax = (25,677 − 18,200) × 15% = 7,477 × 0.15 = $1,121.55
  //         LITO $700, SAPTO $1,602 — together above the tax, so capped at $1,121.55
  //         levy: SAPTO > $0 ⇒ seniors; $25,677 ≤ $44,268 ⇒ s 7(1) nil
  const liJun = result.persons[1];
  assert.equal(liJun.taxOnTaxableIncome, toCents(1_121.55));
  assert.equal(liJun.offsetsApplied, toCents(1_121.55));
  assert.equal(liJun.medicareLevy.levy, toCents(0));
  assert.equal(liJun.netTax, toCents(0));
});

// --- Spouse contribution offset, wired into `householdIncomeTax` (P3-19) ------------------------

test('spouse contribution offset — lands on the CONTRIBUTOR\'s tax, tested against the RECEIVING spouse, item 20 residual with LITO', () => {
  // Robin contributes $5,000 to Sasha this year; Sasha's own income for the test is nil, well
  // under $37,000, so the raw entitlement is the full $540 (matching the pure-function fixture).
  // Both Persons are NOT SAPTO-qualified, to keep this fixture to two offsets: LITO and the new one.
  const robin = person('Robin', 60_000, {
    qualifiedForAgePension: false,
    spouseContributionMade: toCents(5_000),
  });
  const sasha = person('Sasha', 0, {
    qualifiedForAgePension: false,
    spouseIncomeTest: spouseIncome(0),
  });
  const result = householdIncomeTax({ fy: FY, relationship: 'couple', persons: [robin, sasha] });

  // Robin, taxable income $60,000:
  //   tax:  (45,000 − 18,200) × 15% + (60,000 − 45,000) × 30% = 4,020 + 4,500 = $8,520.00
  //   LITO: 325 − 0.015 × (60,000 − 45,000) = 325 − 225 = $100.00
  //   SAPTO: not qualified, $0
  //   spouse contribution offset: full $540 (Sasha's income is nil)
  //   residual = 100 + 0 + 540 = $640, well under the $8,520 tax otherwise payable
  const robinResult = result.persons[0];
  assert.equal(robinResult.taxOnTaxableIncome, toCents(8_520));
  assert.equal(robinResult.lito, toCents(100));
  assert.equal(robinResult.sapto, toCents(0));
  assert.equal(robinResult.spouseContributionOffsetComputed, toCents(540));
  assert.equal(robinResult.offsetsApplied, toCents(640));
  assert.equal(robinResult.taxAfterOffsets, toCents(7_880));

  // Sasha made no contribution — the offset is on the CONTRIBUTOR's own tax and does not appear
  // on the receiving spouse's result at all, even though her `spouseIncomeTest` was read.
  const sashaResult = result.persons[1];
  assert.equal(sashaResult.spouseContributionOffsetComputed, toCents(0));
});

test('spouse contribution offset — NON-REFUNDABLE: it cannot create a refund even where its raw entitlement exceeds the tax otherwise payable', () => {
  // Robin's taxable income is $500 — below the $18,200 tax-free threshold, so gross tax is $0.
  // LITO at $500 is the full $700 (≤ $37,500). The spouse contribution offset is again the full
  // $540 (Sasha's income is nil). The residual is 700 + 540 = $1,240 against $0 of tax otherwise
  // payable — capped at $0, not carried as a refund and not left negative.
  const robin = person('Robin', 500, {
    qualifiedForAgePension: false,
    spouseContributionMade: toCents(5_000),
  });
  const sasha = person('Sasha', 0, {
    qualifiedForAgePension: false,
    spouseIncomeTest: spouseIncome(0),
  });
  const result = householdIncomeTax({ fy: FY, relationship: 'couple', persons: [robin, sasha] });
  const robinResult = result.persons[0];
  assert.equal(robinResult.taxOnTaxableIncome, toCents(0));
  assert.equal(robinResult.lito, toCents(700));
  // The RAW entitlement is still reported — s 290-230's own figure, uncapped — even though the
  // aggregate below shows none of it, or of LITO, could actually be applied.
  assert.equal(robinResult.spouseContributionOffsetComputed, toCents(540));
  assert.equal(robinResult.offsetsApplied, toCents(0), 'a $1,240 residual against $0 tax must cap at $0, never go negative');
  assert.equal(robinResult.taxAfterOffsets, toCents(0));
});

test('spouse contribution offset — a Household that states no SPOUSE_CONTRIBUTION at all is untouched', () => {
  // The exact §2.6 transfer-couple fixture above, with neither field supplied — `person()` never
  // sets them — reproduced here to pin that absence computes the same nil the pure function does.
  const result = householdIncomeTax({
    fy: FY,
    relationship: 'couple',
    persons: [person('Robin', 10_000), person('Sasha', 42_000)],
  });
  assert.equal(result.persons[0].spouseContributionOffsetComputed, toCents(0));
  assert.equal(result.persons[1].spouseContributionOffsetComputed, toCents(0));
  // And the aggregate is byte-identical to the pre-existing fixture — zero fixture churn.
  assert.equal(result.persons[0].offsetsApplied, toCents(0));
  assert.equal(result.persons[1].offsetsApplied, toCents(2_545));
});

// --- WATO — ITAA 1997 Subdiv 61-E, from FY2027-28 (P3-39) ----------------------------------------
//
// Every figure below is hand-worked from register §2.8.1 on FY2027-28's own inputs — tax-free
// threshold $18,200, lowest marginal rate 0.14, maximum offset $250 — and two of them are the
// register's own published worked examples, marked where they appear. Nothing was produced by
// running the implementation.
//
// The three traps §2.8.1 names are three different numbers doing three different jobs, and every
// test below is about keeping them apart:
//
//   entitlement   net labour income must EXCEED $18,200                         s 61-155(1)(b)
//   limb (b)      net labour income treated AS IF it were the whole taxable income, PRE-OFFSET
//                                                                                 s 61-160(b)
//   usability     ACTUAL basic income tax liability on ACTUAL taxable income     s 63-10(1) item 3

const WATO_FY = '2027-28';
const NIL_REDUCERS = toCents(0);

// **Every figure below moved by $1,000 on 2026-09-15 when P3-38 wired ITAA 1997 s 25-130.** The
// standard deduction is `labour deductions` limb (c) of s 61-155(2), so the Setting's default is no
// longer "salary, undeducted": it is `salary − max(0, min($1,000, salary) − reducers)`. The
// argument to `nli` is therefore a **gross salary** and not a net labour income, and every fixture
// that had to sit at a particular net labour income was re-based by exactly the $1,000 the
// deduction takes out. Where that is so, the old and the new salary are both written at the site.
const nli = (salaryDollars, fy = WATO_FY) => netLabourIncomeFromSalary(fy, toCents(salaryDollars), NIL_REDUCERS);

/** A working-age Person: no Age Pension qualification, so LITO is WATO's only competitor. */
const worker = (name, taxableDollars, salaryDollars, fy = WATO_FY) => ({
  name,
  taxableIncome: ti(taxableDollars),
  rebateIncome: rebateIncomeFrom(ti(taxableDollars)),
  qualifiedForAgePension: false,
  netLabourIncome: nli(salaryDollars, fy),
});

test('s 61-155(1)(b) — the entitlement boundary is EXCEEDS, and entitled-but-zero is real', () => {
  // At exactly the tax-free threshold there is no entitlement at all: the gate, not the arithmetic.
  // RE-BASED by P3-38, $18,200 → $19,200 of gross salary, because $19,200 − $1,000 = $18,200 is what
  // now lands the Person exactly on the threshold. The discriminant is untouched: the assertion is
  // still that AT the threshold there is no entitlement.
  assert.equal(nli(19_200), toCents(18_200), 'the re-based salary must land exactly on the threshold');
  assert.equal(workingAustraliansTaxOffset(WATO_FY, nli(19_200)), toCents(0));

  // One cent above it the gate passes — and limb (b) is 14% of one cent, which rounds to nil. The
  // two provisions disagree over a cent-wide window and that is a real boundary artefact, not a
  // bug: s 61-155(1)(b) and s 61-160(b) are separate tests and collapsing them would invent a
  // boundary the Act does not draw.
  const oneCentOver = netLabourIncome({ labourAmounts: toCents(18_200.01), labourDeductions: toCents(0) });
  assert.equal(workingAustraliansTaxOffset(WATO_FY, oneCentOver), toCents(0));

  // Which is why the $0 above cannot be read as "not entitled" — the gate itself says otherwise.
  assert.equal(entitledToWorkingAustraliansOffset(WATO_FY, oneCentOver), true);
  assert.equal(entitledToWorkingAustraliansOffset(WATO_FY, nli(19_200)), false);

  // And the same boundary reached through the default rather than through the two limbs directly:
  // one cent of gross salary above the re-based threshold, which is the Person a fixture would use.
  assert.equal(entitledToWorkingAustraliansOffset(WATO_FY, nli(19_200.01)), true);
});

test('s 61-160(b) — the shade-IN band is rate × the excess over the threshold', () => {
  // **RE-BASED by P3-38, and the expected figures are deliberately unchanged.** These two fixtures
  // test the shade-in ARITHMETIC, so what must be preserved is the net labour income, not the
  // salary. $18,700 → $19,700 and $19,900 → $20,900 of gross salary, each $1,000 higher because the
  // standard deduction now takes $1,000 out before s 61-160(b) sees it. Updating the expected
  // values instead would have moved one of them to $0.00, where the shade-in band cannot be
  // distinguished from no entitlement at all.
  // $19,700 salary → NLI $18,700: (18,700 − 18,200) × 0.14 = 500 × 0.14 = $70.00
  assert.equal(nli(19_700), toCents(18_700));
  assert.equal(workingAustraliansTaxOffset(WATO_FY, nli(19_700)), toCents(70));
  // $20,900 salary → NLI $19,900: (19,900 − 18,200) × 0.14 = 1,700 × 0.14 = $238.00
  assert.equal(nli(20_900), toCents(19_900));
  assert.equal(workingAustraliansTaxOffset(WATO_FY, nli(20_900)), toCents(238));

  // The $1,000 is not a literal here either: it is the shift between the old fixture and the new,
  // read from the record. A record that moved without these fixtures moving fails this line.
  assert.equal(subCents(toCents(19_700), nli(19_700)), TAX.s25130.maximumDeduction.value);
});

test('s 61-160(a) — above the shade-in point it is a FLAT $250 at every income, with no ceiling', () => {
  // §2.8.1's own published pair, NOT re-based: both sit far above the shade-in point, so the
  // $1,000 the standard deduction removes cannot change the answer, and that is the point being
  // made. $30,000 salary → NLI $29,000: min(250, 0.14 × 10,800 = 1,512) = $250.00
  assert.equal(workingAustraliansTaxOffset(WATO_FY, nli(30_000)), toCents(250));
  // $400,000 salary → NLI $399,000: min(250, 0.14 × 380,800 = 53,312) = $250.00. There is no taper
  // and no eligibility ceiling of LITO's s 61-110(1)(b) kind — the same $250.
  assert.equal(workingAustraliansTaxOffset(WATO_FY, nli(400_000)), toCents(250));

  // **The gross-wage shade-in point moves by exactly the standard deduction, and is DERIVED.**
  // $19,985.72 of net labour income is $20,985.72 of gross wage for a Person with nil reducers —
  // register §2.8.2's own prose figure, computed here from `watoShadeInPointFor` plus the record
  // and never typed, exactly as `watoShadeInPoint` forbids storing $19,985.71.
  const point = watoShadeInPointFor(WATO_FY).firstCentAtMaximum;
  const grossForFullOffset = addCents(point, TAX.s25130.maximumDeduction.value);
  assert.equal(nli(grossForFullOffset / 100), point, 'the gross wage that yields the shade-in point');
  assert.equal(workingAustraliansTaxOffset(WATO_FY, nli(grossForFullOffset / 100)), toCents(250));
  assert.equal(workingAustraliansTaxOffset(WATO_FY, nli((grossForFullOffset - 100) / 100)) < toCents(250), true);
});

test('WATO is $0 in FY2026-27 and earlier, and that is a FACT rather than an estimate', () => {
  // The offset does not exist in law before FY2027-28 (Act No. 49 of 2026 Sch 3 Pt 2 item 4), so
  // there is nothing to refuse: this is the opposite case from a missing bracket table, where the
  // true figure exists and the register does not carry it.
  assert.equal(workingAustraliansTaxOffset(FY, nli(30_000)), toCents(0));
  assert.equal(workingAustraliansTaxOffset(FY, nli(400_000)), toCents(0));

  // And a FY2026-27 Household needs no net labour income at all — the narrowness of the refusal.
  const result = householdIncomeTax({ fy: FY, relationship: 'single', persons: [person('Sam', 30_000)] });
  assert.equal(result.persons[0].watoComputed, toCents(0));
  assert.equal(result.persons[0].watoApplied, toCents(0));
});

test('TRAP 2 — the s 63-10 item 3 cap is on ACTUAL liability and can waste the WHOLE offset', () => {
  // §2.8.1's own published example, with the salary left where it was: the $1,000 the standard
  // deduction removes cannot reach the answer here, because limb (b) is already at its maximum.
  // Salary $50,000, actual taxable income $3,000:
  //   NLI:         $50,000 of salary less the s 25-130 $1,000                 = $49,000
  //   limb (b):    min(250, 0.14 × (49,000 − 18,200) = 4,312)          =    $250.00
  //   gross:       $3,000 is below the tax-free threshold              =      $0.00
  //   applied:     min(250, 0) — the excess is lost: no refund, no transfer, no carry-forward
  const result = householdIncomeTax({
    fy: WATO_FY,
    relationship: 'single',
    persons: [worker('Kit', 3_000, 50_000)],
  });
  const kit = result.persons[0];
  assert.equal(kit.taxOnTaxableIncome, toCents(0));
  assert.equal(kit.watoComputed, toCents(250), 'computed in full — limb (b) reads net labour income');
  assert.equal(kit.watoApplied, toCents(0), 'and entirely wasted — the cap reads actual taxable income');
  assert.equal(subCents(kit.watoComputed, kit.watoApplied), toCents(250), 'the wasted amount, reportable');
  assert.equal(kit.netTax, toCents(0));

  // An implementation that stopped at s 61-160 would over-credit this Person by $250. The two
  // figures being separate fields is what makes that visible instead of absorbed.
  assert.notEqual(kit.watoComputed, kit.watoApplied);
});

test('TRAP 2 — PARTIAL waste, and it is the ATTRIBUTION that moves, not the net tax', () => {
  // DERIVED, not register-sourced — §2.8.1 publishes the total-waste case above and not this one.
  // Salary $50,000 → net labour income $49,000, actual taxable income $19,000:
  //   limb (b):    min(250, 0.14 × 30,800 = 4,312)                     =    $250.00
  //   gross:       (19,000 − 18,200) × 0.14 = 800 × 0.14               =    $112.00
  //   WATO first:  min(250, 112)                                       =    $112.00, $138 wasted
  //   LITO:        $19,000 ≤ $37,500, so entitled to the full          =    $700.00
  //   ... of which $0.00 is usable, because item 3 consumed the whole liability first
  const result = householdIncomeTax({
    fy: WATO_FY,
    relationship: 'single',
    persons: [worker('Nour', 19_000, 50_000)],
  });
  const nour = result.persons[0];
  assert.equal(nour.taxOnTaxableIncome, toCents(112));
  assert.equal(nour.watoComputed, toCents(250));
  assert.equal(nour.watoApplied, toCents(112));
  assert.equal(subCents(nour.watoComputed, nour.watoApplied), toCents(138), 'wasted');
  assert.equal(nour.lito, toCents(700), 'entitled to LITO in full — the entitlement is not reduced');
  assert.equal(nour.offsetsApplied, toCents(112), 'and none of it is usable: WATO took the liability');
  assert.equal(nour.taxAfterOffsets, toCents(0));
  assert.equal(nour.netTax, toCents(0));

  // **The aggregate is order-blind and the attribution is not.** Applying LITO first would give the
  // same $112 of offsets applied and the same $0 net tax — every excess here is lost — but it would
  // record LITO as having used the liability and WATO as wholly wasted. s 63-10(1) is imperative
  // about which of those two the Person's assessment says, and the result reports it.
  const litoFirst = Math.min(toCents(700) + nour.sapto, nour.taxOnTaxableIncome);
  assert.equal(litoFirst, nour.offsetsApplied, 'the AGGREGATE cannot move — O73s mechanism');
  assert.notEqual(nour.watoApplied, toCents(0), 'the ATTRIBUTION does, and item 3 fixes it this way');
});

test('P3-39 CANARY — limb (b) is PRE-OFFSET, and the naive post-offset answer is WRONG', () => {
  // The most important test in the WATO build. Net labour income and actual taxable income are the
  // SAME $19,000, so the only thing that can move the answer is whether limb (b) is computed before
  // or after LITO.
  //
  // **RE-BASED by P3-38 on 2026-09-15: Ari's SALARY moved from $19,000 to $20,000, and every
  // expected figure below is unchanged.** s 25-130 takes $1,000 out of net labour income, so at the
  // old salary Ari's net labour income would have fallen to $18,000 — below the $18,200 entitlement
  // threshold — and `watoComputed` would have become $0.00. **That update was available and was
  // refused**: at $0.00 the correct implementation and the naive post-offset one AGREE, so the
  // canary would still pass, forever, while discriminating nothing. The property this test exists
  // for is that taxable income EQUALS net labour income and the pre-offset answer is materially
  // non-zero, and the re-based salary restores both exactly: $20,000 − $1,000 = $19,000 = the
  // taxable income, and limb (b) is $112.00 against a naive $0.00, as before.
  //
  //   correct, s 4-10(3) step 2:   (19,000 − 18,200) × 0.14            =    $112.00
  //   naive, netting LITO off:     max(0, 112 − 700)                   =      $0.00
  //
  // LITO and SAPTO are step 3. They are applied to basic income tax liability; they are not part of
  // it. A "simplification" that computes limb (b) net of LITO gives nil for EVERY Person below the
  // crossover and fails nothing else in this suite — every figure it produces is plausible.
  const result = householdIncomeTax({
    fy: WATO_FY,
    relationship: 'single',
    persons: [worker('Ari', 19_000, 20_000)],
  });
  const ari = result.persons[0];

  // The premise, asserted rather than assumed: the two bases are the same number. If a later change
  // to the standard deduction breaks that, this test stops being about step 2 versus step 3 and
  // must be re-based again rather than have its expectations edited.
  assert.equal(worker('Ari', 19_000, 20_000).netLabourIncome, ti(19_000), 'net labour income EQUALS taxable income');

  assert.equal(ari.watoComputed, toCents(112), 'limb (b) is the PRE-OFFSET liability');
  assert.notEqual(
    ari.watoComputed,
    toCents(0),
    'WATO has been computed NET OF LITO. That is the s 4-10(3) step 2 / step 3 confusion register ' +
      '§2.8.1 warns about: basic income tax liability is worked out at step 2 and tax offsets are ' +
      'applied at step 3, so LITO cannot enter limb (b). The wrong answer is nil for every Person ' +
      'with net labour income at or below $23,200 and is plausible everywhere.',
  );
  assert.equal(ari.lito, toCents(700), 'LITO is still entitled in full — it is not what limb (b) eats');

  // The crossover is EXACTLY $23,200 and the register hedges it as "roughly". Both inputs are
  // exact, so the boundary is: 0.14 × 5,000 = 700, LITO's maximum. Derived from the records here,
  // never typed, so it moves with the lowest marginal rate or with LITO's $700 and with nothing else.
  const crossover = taxYear(WATO_FY).taxFreeThreshold.value + TAX.lito.maximumOffset.value / taxYear(WATO_FY).lowestMarginalRate.value;
  assert.equal(crossover, toCents(23_200));
  assert.equal(TAX.lito.maximumOffset.value, toCents(5_000) * taxYear(WATO_FY).lowestMarginalRate.value);

  // Priced at the boundary, through the naive formula written out, so the canary says what it means:
  // at the crossover the naive answer is still nil and the correct one is the full $700 of liability.
  // The loop is over NET LABOUR INCOMES, and the salary that produces each is derived from the
  // record — never a second $1,000 literal, and never a figure copied from the implementation.
  for (const income of [19_000, 23_200]) {
    const gross = taxOnTaxableIncome(WATO_FY, ti(income));
    const naive = Math.max(0, gross - lowIncomeTaxOffset(ti(income)));
    assert.equal(naive, 0, 'vacuity guard — the naive formula must actually be nil here');
    const salary = addCents(toCents(income), TAX.s25130.maximumDeduction.value);
    assert.equal(nli(salary / 100), toCents(income), 'the salary must produce exactly this net labour income');
    assert.ok(workingAustraliansTaxOffset(WATO_FY, nli(salary / 100)) > 0, `WATO must be positive at $${income}`);
  }
});

test('TRAP 3 — no WATO amount can reach the Medicare levy, because there is no field to put it in', async () => {
  // s 63-10(1) item 3 carries no Medicare-levy limb, unlike items 21 and 22. The defence is ABSENCE
  // (the P3-1a pattern): the levy's three input interfaces must carry no WATO field and no generic
  // offsets-applied field, so there is no parameter a maintainer could thread an amount through and
  // adding one is a visible interface change. Asserted against the source, because a missing field
  // cannot be asserted against a value.
  const source = await readFile(new URL('../src/core/incomeTax.ts', import.meta.url), 'utf8');
  const bodies = ['MedicareLevySpouse', 'MedicareLevyPerson', 'MedicareLevyInput'].map((name) => {
    const start = source.indexOf(`interface ${name} {`) >= 0
      ? source.indexOf(`interface ${name} {`)
      : source.indexOf(`type ${name} =`);
    assert.ok(start >= 0, `${name} has gone — this canary would pass vacuously`);
    const end = source.indexOf('\n}\n', start);
    assert.ok(end > start, `${name}'s declaration did not terminate — the canary cannot read it`);
    return source.slice(start, end);
  });

  // Vacuity guard first: the slices must really be the declarations, or every ban below is free.
  assert.match(bodies[0], /taxableIncome/);
  assert.match(bodies[1], /saptoReceived/);
  assert.match(bodies[2], /familyIncome/);

  for (const [index, body] of bodies.entries()) {
    assert.doesNotMatch(body, /wato/i, `a WATO field has appeared on Medicare levy input ${index}`);
    assert.doesNotMatch(body, /offsetsApplied|offsetApplied|offsets\??:/i, `a generic offsets field on input ${index} would do the same job`);
    assert.doesNotMatch(body, /workingAustralians/i, `input ${index} must not name the offset at all`);
  }

  // And the levy a Person actually receives is untouched by the offset they received. Nour above
  // pays no levy; this Person's income is above the threshold and their levy must equal the levy of
  // the identical Person with no net labour income at all.
  const withWato = householdIncomeTax({ fy: WATO_FY, relationship: 'single', persons: [worker('Wren', 40_000, 40_000)] });
  const withoutWato = householdIncomeTax({ fy: WATO_FY, relationship: 'single', persons: [worker('Wren', 40_000, 0)] });
  assert.ok(withWato.persons[0].watoApplied > 0, 'vacuity guard — this Person must actually receive WATO');
  assert.equal(withoutWato.persons[0].watoComputed, toCents(0));
  assert.equal(withWato.persons[0].medicareLevy.levy, withoutWato.persons[0].medicareLevy.levy);
});

test('net labour income is REQUIRED from FY2027-28 and not before — the refusal is narrow', () => {
  const omitted = { name: 'Sam', taxableIncome: ti(30_000), rebateIncome: rebateIncomeFrom(ti(30_000)), qualifiedForAgePension: false };

  // FY2026-27: the field is absent and the Household computes, because WATO does not exist yet.
  assert.equal(householdIncomeTax({ fy: FY, relationship: 'single', persons: [omitted] }).persons[0].watoComputed, toCents(0));

  // FY2027-28: the same omission is refused BY NAME. A nil is a figure the caller states.
  assert.throws(
    () => householdIncomeTax({ fy: WATO_FY, relationship: 'single', persons: [omitted] }),
    (error) => {
      assert.ok(error instanceof NetLabourIncomeNotSuppliedError);
      assert.equal(error.person, 'Sam');
      assert.match(error.message, /s 61-155\(2\)/);
      // The refusal must not tell the caller the tool could have worked it out.
      assert.doesNotMatch(error.message, /derive[ds]? (it|the split) from|assume|default to nil/i);
      return true;
    },
  );

  // And a STATED nil is not a refusal — it is an answer, and the right one.
  const stated = { ...omitted, netLabourIncome: nli(0) };
  const result = householdIncomeTax({ fy: WATO_FY, relationship: 'single', persons: [stated] });
  assert.equal(result.persons[0].watoComputed, toCents(0));
  assert.equal(result.persons[0].watoApplied, toCents(0));

  // The missing-component guard beside it now has a name too (R8, §3.9 finding 3).
  assert.throws(() => netLabourIncome({ labourAmounts: toCents(1) }), MissingNetLabourIncomeComponentError);
  assert.throws(() => netLabourIncome({ labourDeductions: toCents(1) }), (error) => {
    assert.equal(error.component, 'labourAmounts');
    assert.match(error.message, /a nil is a figure the caller states/);
    return true;
  });
});

test('PROVENANCE — limb (b) equals the FULL ladder after the min, so it needs no carried-forward rate', () => {
  // The claim register §2.8.1.1 makes, proved against the shipped bracket table rather than
  // asserted: `min($250, closed form)` and `min($250, ladder)` agree at EVERY net labour income, so
  // limb (b) depends on the tax-free threshold and the lowest marginal rate — both legislated and
  // primary-verified for FY2027-28 — and never on R12's unverified 30/37/45.
  //
  // This matters because the alternative reading of TODO P3-39 ("R12 supplied it, so limb (b) has a
  // rate ladder to run against") would attach an `unverified` caveat to every shade-in WATO figure.
  for (const fy of ['2026-27', '2027-28']) {
    const year = taxYear(fy);
    const threshold = year.taxFreeThreshold.value;
    const rate = year.lowestMarginalRate.value;
    const maximum = TAX.wato.maximumOffset.value;
    const secondBracketTop = bracketTableOf(fy, year).value[1].upTo;

    // Vacuity guard: every figure the argument rests on must be real.
    assert.ok(threshold > 0 && rate > 0 && maximum > 0 && secondBracketTop > threshold);

    // Step 1 — at or below the second bracket's top the two are EQUAL, not merely close.
    for (const income of [threshold, threshold + 1, 18_700_00, 19_900_00, 30_000_00, secondBracketTop]) {
      const closed = Math.max(0, Math.round((income - threshold) * rate));
      assert.equal(taxOnTaxableIncome(fy, ti(income / 100)), closed, `the ladder and the closed form part at ${income}`);
    }

    // Step 2 — above it the closed form is a LOWER bound on the ladder, so it can only under-state.
    for (const income of [secondBracketTop + 100, 100_000_00, 400_000_00, 1_000_000_00]) {
      const closed = Math.round((income - threshold) * rate);
      assert.ok(taxOnTaxableIncome(fy, ti(income / 100)) >= closed, `the closed form over-states at ${income}`);
    }

    // Step 3 — both have passed the maximum offset long before that bound, so the min agrees anyway.
    assert.ok(Math.round((secondBracketTop - threshold) * rate) > maximum, 'the min does not saturate inside the lowest bracket');

    // And the shade-in point, which is where the two limbs cross, sits inside the lowest bracket.
    assert.ok(threshold + maximum / rate < secondBracketTop);
  }

  // The consequence, priced: FY2027-28's unverified rates reach a Household's WATO only through the
  // item 3 cap. Kit's $250 above is computed on primary-verified figures alone.
  assert.equal(workingAustraliansTaxOffset(WATO_FY, nli(400_000)), TAX.wato.maximumOffset.value);
});

// --- ITAA 1997 s 25-130(2) — the three operations, and the order of all three ---------------------
//
// `standardDeductionAmount` and `standardDeductionAmountFor` were imported into this file by P3-38
// and never called: every s 25-130 figure was reached through `netLabourIncomeFromSalary`, so the
// arithmetic's three traps rested on one aggregated assertion in `assumptions-tax.test.mjs`. The
// P3-38 mutation battery caught them all there, but each by exactly one test. These are the same
// three traps priced directly, one assertion each, hand-derived from the statute.

test('s 25-130(2) — min FIRST, reducers off the CAPPED figure, floor at nil LAST', () => {
  const maximum = TAX.s25130.maximumDeduction.value;
  assert.equal(maximum, toCents(1_000), 'the workings below are all stated against the $1,000 maximum');
  const deduction = (incomeDollars, reducerDollars) =>
    standardDeductionAmount({
      maximumDeduction: maximum,
      assessableLabourIncome: toCents(incomeDollars),
      reducerDeductions: toCents(reducerDollars),
    });

  // Trap 1 — the cap binds against labour income. $400 of labour income, nil reducers:
  //   max(0, min(1,000, 400) − 0) = $400. Unbounded, it would be a $1,000 deduction on $400.
  assert.equal(deduction(400, 0), toCents(400));

  // Trap 2 — the reducers come off the CAPPED figure, not off the income. $1,500 of labour income
  // and $300 of reducers: max(0, min(1,000, 1,500) − 300) = 1,000 − 300 = $700.
  //   The other order gives min(1,000, 1,500 − 300) = min(1,000, 1,200) = $1,000.
  assert.equal(deduction(1_500, 300), toCents(700));

  // Trap 3 — the floor at nil is LAST. $80,000 of labour income and $1,200 of real work deductions:
  //   max(0, min(1,000, 80,000) − 1,200) = max(0, −200) = $0. Without the floor it is −$200, which
  //   ADDS to net labour income and to taxable income.
  assert.equal(deduction(80_000, 1_200), toCents(0));

  // And the sign, which the three orderings do not carry: reducers SUBTRACT. $300 on $80,000 is
  //   max(0, 1,000 − 300) = $700, not $1,300.
  assert.equal(deduction(80_000, 300), toCents(700));
  assert.equal(deduction(80_000, 0), maximum, 'and nil reducers leave the whole of limb (a)');
});

test('s 25-130 — the year gate is the FIRST INCOME YEAR, and before it the nil is the LAW', () => {
  // Act No. 49 of 2026 Sch 4 Pt 1 item 17: assessments for the 2026-27 income year and later — one
  // year EARLIER than WATO. $80,000 of labour income and nil reducers gives the full $1,000 in
  // every year from FY2026-27 and $0 in every year before it, and the second of those is a fact
  // about the law rather than an estimate, so it is answered rather than refused.
  const maximum = TAX.s25130.maximumDeduction.value;
  assert.equal(TAX.s25130.firstIncomeYear.value, '2026-27');
  for (const fy of ['2026-27', '2027-28']) {
    assert.equal(s25130AppliesToYear(fy), true, fy);
    assert.equal(standardDeductionAmountFor(fy, toCents(80_000), toCents(0)), maximum, fy);
  }
  for (const fy of ['2024-25', '2025-26']) {
    assert.equal(s25130AppliesToYear(fy), false, fy);
    assert.equal(standardDeductionAmountFor(fy, toCents(80_000), toCents(0)), toCents(0), fy);
  }
  // The gate does not reach the reducers: a Person with $4,000 of real work deductions gets the
  // same nil in FY2025-26 and the same $0 in FY2026-27 — max(0, 1,000 − 4,000) — by two different
  // routes, and only the first of those is the gate.
  assert.equal(standardDeductionAmountFor('2025-26', toCents(80_000), toCents(4_000)), toCents(0));
  assert.equal(standardDeductionAmountFor('2026-27', toCents(80_000), toCents(4_000)), toCents(0));
  assert.notEqual(maximum, toCents(0), 'or every equality above is the same trivial case');
});

// --- Spouse contribution offset — ITAA 1997 Subdiv 290-D (P3-19) --------------------------------

test('spouse contribution offset — FULL $540 at or below the $37,000 lower threshold, contribution ample', () => {
  // s 290-230(1): 18% of min($3,000, contribution). At $30,000 the receiving spouse's income is
  // below $37,000 so the reduction is nil and the base is the untapered $3,000; a $5,000
  // contribution covers it, so the lesser is $3,000 and 18% × $3,000 = $540 exactly.
  assert.equal(spouseContributionOffset(spouseIncome(30_000), toCents(5_000)), toCents(540));
  // The threshold's own edge is inclusive — reduction is `max(0, income − 37,000)`, which is nil
  // AT $37,000 as well as below it.
  assert.equal(spouseContributionOffset(spouseIncome(37_000), toCents(5_000)), toCents(540));
});

test('spouse contribution offset — PARTIAL taper between $37,000 and $40,000', () => {
  // At $38,500 the reduction is 38,500 − 37,000 = $1,500, so the tapered base is
  // 3,000 − 1,500 = $1,500. A $5,000 contribution is ample, so the lesser is $1,500 and
  // 18% × $1,500 = $270.
  assert.equal(spouseContributionOffset(spouseIncome(38_500), toCents(5_000)), toCents(270));
});

test('spouse contribution offset — NIL at and above $40,000, where the $3,000 reduction is exhausted', () => {
  // $40,000 is not a stored figure (`data/assumptions/tax.ts`) — it is where lowerThreshold + base
  // lands: reduction = 40,000 − 37,000 = $3,000, exactly the base, so the tapered base is nil.
  assert.equal(spouseContributionOffset(spouseIncome(40_000), toCents(5_000)), toCents(0));
  // And above it the reduction only grows, so the base stays floored at nil.
  assert.equal(spouseContributionOffset(spouseIncome(45_000), toCents(5_000)), toCents(0));
});

test('spouse contribution offset — limited by the ACTUAL contribution below the tapered base', () => {
  // At $30,000 the tapered base is the untapered $3,000, but the contribution is only $1,000:
  // the lesser of $3,000 and $1,000 is $1,000, and 18% × $1,000 = $180.
  assert.equal(spouseContributionOffset(spouseIncome(30_000), toCents(1_000)), toCents(180));
  // A nil contribution is nil offset regardless of the receiving spouse's income.
  assert.equal(spouseContributionOffset(spouseIncome(20_000), toCents(0)), toCents(0));
});

test('spouse contribution offset — the THREE components of the income test all count, and REUSE the existing figures', () => {
  // Assessable income $36,000 + reportable fringe benefits $500 + reportable employer super $1,000
  // = $37,500, so the reduction is 37,500 − 37,000 = $500 and the tapered base is
  // 3,000 − 500 = $2,500. A $5,000 contribution is ample: 18% × $2,500 = $450.
  assert.equal(
    spouseContributionOffset(spouseIncome(36_000, 500, 1_000), toCents(5_000)),
    toCents(450),
  );
  // Reading only the assessable-income limb and ignoring the other two would test $36,000, below
  // $37,000, and wrongly return the full $540 — the mutation this fixture is built to catch.
  assert.notEqual(
    spouseContributionOffset(spouseIncome(36_000, 500, 1_000), toCents(5_000)),
    toCents(540),
  );
});
