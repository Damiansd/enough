// P3-22 — franking credits received by an **individual**, on shares held outside super. Register
// §5A, and §5A.3, §5A.5 and §5A.6 in particular; traps T43, T46, T47, T48, T49.
//
// **Every expected figure below is hand-worked from register §2 and §5A, with the arithmetic
// written out beside it. None of it came from running the implementation**, and that matters more
// here than it does on the super side: the super module multiplies by one rate, and this one runs
// the whole of `householdIncomeTax` twice, so a figure lifted from the code would be a figure
// nobody had checked.
//
// The FY2026-27 parameters used throughout, all from `src/data/assumptions/tax.ts`:
//
//   tax-free threshold   $18,200        marginal rates  15% / 30% / 37% / 45%
//   bracket edges        $45,000 · $135,000 · $190,000
//   LITO                 $700 max; taper 5c per $1 over $37,500; 1.5c per $1 over $45,000 off $325
//   Medicare levy        2%; single lower $28,011, single upper $35,013, s 7(2) shade-in 10c/$1
//   family levy          lower $47,238; s 8(2) reduction = 2% × threshold − 8% × (FI − threshold)
//
// SAPTO is nil in every fixture (no Person is qualified for the Age Pension) and WATO is nil in
// FY2026-27 (it does not exist before FY2027-28), so the four moving parts are the brackets, the
// LITO taper, the single levy and the family levy. That is P3-22f's list, less the one a franked
// distribution must not reach.
//
// **The counter-intuitive case P3-22f asks for is `THE LITO TAPER` below**: a $1,000 gross-up at a
// $40,000 baseline costs $220, not the $150 a "30% marginal rate" model would charge — $150 of
// bracket, $20 of levy and **$50 of LITO taper**. A model that refunded $150 over-refunds by $70
// on a $300 credit, which is 23% of it.
//
// NOT covered here, and not built: stating a distribution at all (P3-22h), the day the refund
// becomes cash (P3-22g, register O28), the 45-day count (P3-22e). ⚠️ **`project()` DOES call this
// module now, live, from P3-22h step 3 — and, from P3-42 step 3 (2026-09-22), it calls
// `frankingInSuper` too, on the super side.** This paragraph once said neither call existed; kept
// struck through in substance rather than silently corrected, so a reader who remembers it sees
// which half moved and when.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { toCents } from '../dist/core/money.js';
import { netLabourIncomeFromSalary, taxableIncome } from '../dist/core/incomeBases.js';
import { frankedDistributionFromStatement } from '../dist/core/superFranking.js';
import {
  EXCESS_CREDITS_REFUNDABLE,
  IndividualFrankingYearMismatchError,
  IndividualNotAQualifiedPersonError,
  NO_REBATE_INCOME_ADD_BACKS,
  NonResidentIndividualDistributionError,
  RELIEF_IS_INDIVIDUALS_ONLY,
  SMALL_SHAREHOLDER_RELIEF,
  frankingForIndividual,
  qualifiedResidentIndividual,
} from '../dist/core/individualFranking.js';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = join(ROOT, 'src');

/** A Person with no Rebate Income add-backs and no Age Pension qualification. */
const person = (name, dollars) => ({
  name,
  taxableIncome: taxableIncome(toCents(dollars)),
  rebateIncomeAddBacks: NO_REBATE_INCOME_ADD_BACKS,
  qualifiedForAgePension: false,
});

/**
 * A distribution stated from a statement — the T43 route, which needs no rate at all. The franked
 * amount and the credit are two dollar figures, and `grossed up = franked + credit` is an addition.
 */
const statement = (frankedDollars, creditDollars, fy = '2026-27') =>
  frankedDistributionFromStatement({
    fy,
    frankedAmount: toCents(frankedDollars),
    frankingCredit: toCents(creditDollars),
    source: 'the Household’s AMMA statement',
    confidence: 'primary-verified',
  });

/** Facts for a resident who is a qualified person, with the year's credits stated. */
const resident = (creditsForTheYearDollars) => qualifiedResidentIndividual(toCents(creditsForTheYearDollars));

const single = (baseline, distribution, facts) =>
  frankingForIndividual({
    fy: distribution.fy,
    relationship: 'single',
    persons: [baseline],
    recipient: 0,
    distribution,
    facts,
  });

// --- The genuine refund: a low-income holder, fully franked ---------------------------------------
//
// $7,000.00 franked, fully franked by a 30% payer, so the credit is $3,000.00 and the grossed-up
// amount is $10,000.00. Baseline taxable income $15,000.00.
//
//   WITHOUT   taxable 15,000 — below the $18,200 threshold, so tax is nil
//             LITO would be $700 and is NON-REFUNDABLE, so it applies nil against nil tax
//             levy: 15,000 <= 28,011, s 7(1) — no levy
//             net tax = $0.00
//   WITH      taxable 25,000 — 0.15 × (25,000 − 18,200) = 0.15 × 6,800 =   $1,020.00
//             LITO: 25,000 <= 37,500, full                              −    $700.00
//             levy: 25,000 <= 28,011, s 7(1) — no levy                        $0.00
//             net tax = $320.00
//
//   the tax on the distribution  = 320 − 0 =   $320.00
//   offset (s 207-20(2))         = the credit = $3,000.00
//   refund (s 63-10(1) item 40)  = 3,000 − 320 = $2,680.00   IN CASH
//   net cash = 7,000 + 2,680 = $9,680.00 on a $7,000 distribution

test('a low-income individual is REFUNDED the excess credit in cash, and it is the larger half of the money', () => {
  const result = single(person('Ada', 15_000), statement(7_000, 3_000), resident(3_000));

  assert.equal(result.taxWithout.persons[0].netTax, toCents(0));
  assert.equal(result.taxWith.persons[0].netTax, toCents(320));
  assert.equal(result.additionalTaxOnTheDistribution, toCents(320));
  assert.equal(result.offset, toCents(3_000));
  assert.equal(result.refund, toCents(2_680));
  assert.equal(result.taxPayableAfterOffset, toCents(0));
  assert.equal(result.netCash, toCents(9_680));

  // T46, and the whole reason the item is worth building: clamp the refund at nil — keep only
  // `max(0, tax − offset)` — and this Household's benefit is $0, not $2,680. On the super side the
  // same clamp is the same mutation, which is what makes refundability NOT a super advantage.
  assert.ok(result.refund > result.additionalTaxOnTheDistribution);
  assert.notEqual(result.refund, toCents(0));
});

test('LITO is still non-refundable — the $700 it could not use did not become cash', () => {
  const result = single(person('Ada', 15_000), statement(7_000, 3_000), resident(3_000));

  // Baseline: $700 of LITO entitlement against $0 of tax. If franking's refundability had been
  // achieved by letting `netTax` go below zero inside `incomeTax.ts`, this would be −$700 and
  // every Household in the model would be quietly receiving LITO in cash.
  assert.equal(result.taxWithout.persons[0].lito, toCents(700));
  assert.equal(result.taxWithout.persons[0].offsetsApplied, toCents(0));
  assert.equal(result.taxWithout.persons[0].netTax, toCents(0));
  // And in the assessment WITH the distribution, LITO is capped by the tax it reduces.
  assert.equal(result.taxWith.persons[0].lito, toCents(700));
  assert.equal(result.taxWith.persons[0].offsetsApplied, toCents(700));
  assert.ok(result.taxWith.persons[0].netTax > toCents(0));
});

// --- Partly franked, and the tax exceeds the credit -----------------------------------------------
//
// $7,000.00 franked with only $1,000.00 of credit attached, so the grossed-up amount is $8,000.00.
// Baseline taxable income $90,000.00 — the 30% bracket, past the LITO ceiling, full 2% levy.
//
//   WITHOUT   0.15 × 26,800 + 0.30 × 45,000 = 4,020 + 13,500 = $17,520.00
//             LITO: 90,000 > 66,667 — nil
//             levy: 2% × 90,000                               =  $1,800.00
//             net tax = $19,320.00
//   WITH      0.15 × 26,800 + 0.30 × 53,000 = 4,020 + 15,900 = $19,920.00
//             levy: 2% × 98,000                               =  $1,960.00
//             net tax = $21,880.00
//
//   the tax on the distribution = $2,560.00  (32% of 8,000 — 30% bracket plus 2% levy, exactly)
//   offset = $1,000.00 → nothing left to refund, $1,560.00 still to pay
//   net cash = 7,000 − 1,560 = $5,440.00

test('a partly franked distribution to a 30%-bracket holder leaves tax to pay, and no refund', () => {
  const result = single(person('Grace', 90_000), statement(7_000, 1_000), resident(1_000));

  assert.equal(result.taxWithout.persons[0].netTax, toCents(19_320));
  assert.equal(result.taxWith.persons[0].netTax, toCents(21_880));
  assert.equal(result.additionalTaxOnTheDistribution, toCents(2_560));
  assert.equal(result.offset, toCents(1_000));
  assert.equal(result.refund, toCents(0));
  assert.equal(result.taxPayableAfterOffset, toCents(1_560));
  assert.equal(result.netCash, toCents(5_440));

  // Exactly one of the two directions is non-nil, on every route. Both being nil would mean the
  // credit exactly met the tax; both being non-nil is impossible and would mean the module had
  // grown a branch.
  assert.ok((result.refund === 0) !== (result.taxPayableAfterOffset === 0));
});

// --- THE LITO TAPER: P3-22f's counter-intuitive case ----------------------------------------------
//
// $700.00 franked, fully franked at 30%, credit $300.00, grossed up $1,000.00. Baseline $40,000.00,
// which sits inside LITO's first taper AND above the levy's single upper threshold.
//
//   WITHOUT   0.15 × (40,000 − 18,200)              = $3,270.00
//             LITO: 700 − 0.05 × (40,000 − 37,500)  = −  $575.00
//             levy: 2% × 40,000                     =    $800.00
//             net tax = $3,495.00
//   WITH      0.15 × (41,000 − 18,200)              = $3,420.00
//             LITO: 700 − 0.05 × (41,000 − 37,500)  = −  $525.00
//             levy: 2% × 41,000                     =    $820.00
//             net tax = $3,715.00
//
//   the tax on the distribution = $220.00 = $150 bracket + $20 levy + $50 of LITO taper
//   refund = 300 − 220 = $80.00

test('P3-22f — the gross-up moves the LITO taper too, and a 30% marginal model over-refunds by 23%', () => {
  const result = single(person('Ruth', 40_000), statement(700, 300), resident(300));

  assert.equal(result.taxWithout.persons[0].lito, toCents(575));
  assert.equal(result.taxWith.persons[0].lito, toCents(525));
  assert.equal(result.additionalTaxOnTheDistribution, toCents(220));
  assert.equal(result.refund, toCents(80));
  assert.equal(result.netCash, toCents(780));

  // The three figures a simpler model would have produced, pinned as the wrong answers they are:
  //   $150 — the bracket alone, "30% marginal"                     → refund $150
  //   $170 — bracket plus levy, forgetting the offset taper        → refund $130
  assert.notEqual(result.additionalTaxOnTheDistribution, toCents(150));
  assert.notEqual(result.additionalTaxOnTheDistribution, toCents(170));
});

test('P3-22c — the order is gross up, tax, THEN offset; taxing the cash is a different number', () => {
  const result = single(person('Ruth', 40_000), statement(700, 300), resident(300));

  // Taxing the CASH ($700) instead of the grossed-up amount ($1,000) and then offsetting the credit
  // is the plausible-looking wrong implementation. Hand-worked, it gives:
  //   0.15 × (40,700 − 18,200) = 3,375.00;  LITO 700 − 0.05 × 3,200 = 654.00 → 646.00 wait
  //   LITO: 700 − 0.05 × (40,700 − 37,500) = 700 − 160 = $540.00
  //   tax after offsets = 3,375 − 540 = 2,835.00;  levy 2% × 40,700 = 814.00 → net 3,649.00
  //   difference against the $3,495.00 baseline = $154.00, and a refund of 300 − 154 = $146.00
  // So the wrong order refunds $146 where the right one refunds $80 — nearly twice as much, on a
  // distribution of $700. The number is pinned rather than described.
  assert.notEqual(result.additionalTaxOnTheDistribution, toCents(154));
  assert.notEqual(result.refund, toCents(146));
  assert.equal(result.refund, toCents(80));

  // And structurally: the only figure added to taxable income is the GROSSED-UP amount.
  assert.equal(
    result.taxWith.persons[0].taxableIncome - result.taxWithout.persons[0].taxableIncome,
    result.distribution.grossedUpAmount,
  );
  assert.equal(result.distribution.grossedUpAmount, toCents(1_000));
  assert.equal(result.distribution.frankedAmount, toCents(700));
});

test('the net cash is the identity it claims to be, on all three fixtures', () => {
  for (const result of [
    single(person('Ada', 15_000), statement(7_000, 3_000), resident(3_000)),
    single(person('Grace', 90_000), statement(7_000, 1_000), resident(1_000)),
    single(person('Ruth', 40_000), statement(700, 300), resident(300)),
  ]) {
    assert.equal(
      result.netCash,
      result.distribution.frankedAmount + result.refund - result.taxPayableAfterOffset,
    );
    // The same figure by the other route: cash, less the tax on the grossed-up amount, plus the
    // credit. The two agree only because nothing is floored at nil on the way through.
    assert.equal(
      result.netCash,
      result.distribution.frankedAmount - result.additionalTaxOnTheDistribution + result.offset,
    );
  }
});

// --- The spillover onto the other Person ------------------------------------------------------
//
// A couple, each on $29,000.00 of taxable income. A $1,400.00 fully franked distribution at 30%
// carries a $600.00 credit and grosses up to $2,000.00, and it flows to ONE of them.
//
// Both are inside the s 8 family shade-in before the distribution and neither is after it:
//
//   WITHOUT   family income 58,000; reduction = 0.02 × 47,238 − 0.08 × (58,000 − 47,238)
//                                            = 944.76 − 860.96 = $83.80, so s 8 applies
//             s 8(3): the spouse IS liable (29,000 > 28,011), so it is apportioned by taxable
//             income — each keeps 83.80 × 29,000/58,000 = $41.90
//             s 7(2) ceiling each: 10% × (29,000 − 28,011) = $98.90, below 2% × 29,000 = $580.00
//             levy each = 98.90 − 41.90 = $57.00
//             tax each: 0.15 × 10,800 = 1,620.00 − LITO 700.00 = 920.00, + 57.00 = $977.00
//   WITH      family income 60,000; reduction = 944.76 − 0.08 × 12,762 = 944.76 − 1,020.96
//                                            = −$76.20, so s 8 grants NOTHING and s 7 stands
//             recipient: 0.15 × 12,800 = 1,920.00 − 700.00 = 1,220.00; levy = 10% × 2,989 = 298.90
//                        net tax = $1,518.90
//             spouse:    920.00 + 10% × 989 = 920.00 + 98.90 = $1,018.90
//
//   the recipient's extra tax = 1,518.90 − 977.00 = $541.90   ← what the offset runs against
//   the spouse's extra tax    = 1,018.90 − 977.00 =  $41.90   ← nobody's offset touches this
//   the household's extra tax                     = $583.80

test('one Person’s distribution raises the OTHER Person’s tax, and the offset does not reach it', () => {
  const result = frankingForIndividual({
    fy: '2026-27',
    relationship: 'couple',
    persons: [person('Ada', 29_000), person('Bea', 29_000)],
    recipient: 0,
    distribution: statement(1_400, 600),
    facts: resident(600),
  });

  assert.equal(result.recipient, 'Ada');
  assert.equal(result.taxWithout.persons[0].netTax, toCents(977));
  assert.equal(result.taxWithout.persons[1].netTax, toCents(977));
  assert.equal(result.taxWith.persons[0].netTax, toCents(1_518.9));
  assert.equal(result.taxWith.persons[1].netTax, toCents(1_018.9));

  assert.equal(result.additionalTaxOnTheDistribution, toCents(541.9));
  assert.equal(result.additionalHouseholdTax, toCents(583.8));
  assert.equal(result.spilloverToTheOtherPerson, toCents(41.9));

  // The refund is worked out on the RECIPIENT's figure. Working it out on the household's would
  // refund $41.90 less; working the offset against the household's liability would refund the
  // spouse's extra levy, which is cash nobody is entitled to. Both wrong answers are pinned.
  assert.equal(result.offset, toCents(600));
  assert.equal(result.refund, toCents(58.1));
  assert.notEqual(result.refund, toCents(16.2));
  assert.equal(result.netCash, toCents(1_458.1));

  // The spillover is real and the direction is one-way: a positive gross-up cannot LOWER the other
  // Person's tax, because every base it moves — family income, combined Rebate Income — moves up.
  assert.ok(result.spilloverToTheOtherPerson > toCents(0));
  assert.equal(
    result.additionalHouseholdTax,
    result.additionalTaxOnTheDistribution + result.spilloverToTheOtherPerson,
  );
});

test('a single Person has no spillover to have — the identity holds at nil too', () => {
  const result = single(person('Ada', 15_000), statement(7_000, 3_000), resident(3_000));
  assert.equal(result.spilloverToTheOtherPerson, toCents(0));
  assert.equal(result.additionalHouseholdTax, result.additionalTaxOnTheDistribution);
});

// --- P3-22f's last sentence: the base a franked distribution must NOT raise --------------------

test('P3-22f — the gross-up is not a labour amount, and WATO’s base does not move', () => {
  // FY2027-28, where WATO exists and `netLabourIncome` is required. s 61-155(2)'s net labour income
  // is a labour amount; a franked distribution and its gross-up are not, so `watoComputed` — which
  // reads that base and nothing else — must be identical in both assessments.
  const employed = {
    ...person('Ada', 60_000),
    netLabourIncome: netLabourIncomeFromSalary('2027-28', toCents(60_000), toCents(0)),
  };
  const result = frankingForIndividual({
    fy: '2027-28',
    relationship: 'single',
    persons: [employed],
    recipient: 0,
    distribution: statement(7_000, 3_000, '2027-28'),
    facts: resident(3_000),
  });

  assert.equal(result.taxWith.persons[0].watoComputed, result.taxWithout.persons[0].watoComputed);
  // Not vacuous: WATO is actually being computed in this year, and taxable income really did move.
  assert.ok(result.taxWithout.persons[0].watoComputed > toCents(0));
  assert.equal(
    result.taxWith.persons[0].taxableIncome - result.taxWithout.persons[0].taxableIncome,
    toCents(10_000),
  );
  // Rebate Income moved WITH taxable income, because it contains it — the other three bases move.
  assert.equal(
    result.taxWith.persons[0].rebateIncome - result.taxWithout.persons[0].rebateIncome,
    toCents(10_000),
  );
});

// --- The gates -------------------------------------------------------------------------------

test('a non-resident is refused, and s 207-110 is not offered as a way out', () => {
  assert.throws(
    () =>
      single(person('Ada', 15_000), statement(7_000, 3_000), {
        australianResident: false,
        qualifiedPerson: true,
        frankingCreditsForTheIncomeYear: toCents(3_000),
        relatedPayment: false,
      }),
    (error) => {
      assert.ok(error instanceof NonResidentIndividualDistributionError);
      assert.match(error.message, /128B\(3\)\(ga\)/);
      assert.match(error.message, /s 207-90\(1\)\(c\)/);
      // The reason the super side's rescue is not available here, stated where a reader coming from
      // `superFranking.ts` will meet it.
      assert.match(error.message, /Subdiv 207-E rescues the exempt\s+current pension income/);
      assert.match(error.message, /refused rather than answered as a nil/);
      return true;
    },
  );
});

test('T48 — an unqualified individual over the $5,000 ceiling is refused, and cannot claim $5,000 of it', () => {
  assert.throws(
    () =>
      single(person('Ada', 15_000), statement(7_000, 6_000), {
        australianResident: true,
        qualifiedPerson: false,
        frankingCreditsForTheIncomeYear: toCents(6_000),
        relatedPayment: false,
      }),
    (error) => {
      assert.ok(error instanceof IndividualNotAQualifiedPersonError);
      assert.match(error.message, /600000 cents of franking credits/);
      assert.match(error.message, /ALL-OR-NOTHING/);
      assert.match(error.message, /cannot cap the claim at the ceiling/);
      assert.match(error.message, /160APHT\(1\)\(b\)/);
      return true;
    },
  );
});

test('T48 — the boundary is "does not exceed", so exactly $5,000.00 of credits qualifies', () => {
  const unqualified = (creditsForTheYearDollars) => ({
    australianResident: true,
    qualifiedPerson: false,
    frankingCreditsForTheIncomeYear: toCents(creditsForTheYearDollars),
    relatedPayment: false,
  });

  const atTheCeiling = single(person('Ada', 15_000), statement(7_000, 3_000), unqualified(5_000));
  assert.equal(atTheCeiling.qualifiedBySmallShareholderRelief, true);
  // The relief changes the ROUTE to the answer and not the answer: same figures as the qualified case.
  assert.equal(atTheCeiling.refund, toCents(2_680));

  assert.throws(
    () => single(person('Ada', 15_000), statement(7_000, 3_000), unqualified(5_000.01)),
    IndividualNotAQualifiedPersonError,
  );
  assert.equal(SMALL_SHAREHOLDER_RELIEF.ceiling, toCents(5_000));
});

test('T47 — a related payment does not disqualify, it costs the shelter: refused UNDER the ceiling', () => {
  // The direction a reader gets backwards. Credits of $300 are far below the ceiling, and the
  // holder is still refused, because s 160APHT(2) defeats reliance on the exemption and throws them
  // back on a ±45/±90 day count this model does not do.
  assert.throws(
    () =>
      single(person('Ruth', 40_000), statement(700, 300), {
        australianResident: true,
        qualifiedPerson: false,
        frankingCreditsForTheIncomeYear: toCents(300),
        relatedPayment: true,
      }),
    (error) => {
      assert.ok(error instanceof IndividualNotAQualifiedPersonError);
      assert.match(error.message, /160APHT\(2\) defeats reliance/);
      assert.match(error.message, /does not disqualify\s+by itself/);
      assert.doesNotMatch(error.message, /exceeds the/);
      return true;
    },
  );

  // And the same holding WITHOUT the related payment is answered, which is what makes the line above
  // a test of the related payment rather than of the ceiling.
  const relieved = single(person('Ruth', 40_000), statement(700, 300), {
    australianResident: true,
    qualifiedPerson: false,
    frankingCreditsForTheIncomeYear: toCents(300),
    relatedPayment: false,
  });
  assert.equal(relieved.refund, toCents(80));
  assert.equal(relieved.qualifiedBySmallShareholderRelief, true);
});

test('a related payment is irrelevant to a holder who IS a qualified person', () => {
  // s 160APHT(2) takes away the exemption, and a holder who satisfied the holding rule was never
  // relying on it. A module that refused here would have fused the two rules.
  const result = single(person('Ada', 15_000), statement(7_000, 3_000), {
    australianResident: true,
    qualifiedPerson: true,
    frankingCreditsForTheIncomeYear: toCents(9_999),
    relatedPayment: true,
  });
  assert.equal(result.refund, toCents(2_680));
  assert.equal(result.qualifiedBySmallShareholderRelief, false);
});

test('a distribution from one year cannot be assessed against another year', () => {
  assert.throws(
    () =>
      frankingForIndividual({
        fy: '2026-27',
        relationship: 'single',
        persons: [person('Ada', 15_000)],
        recipient: 0,
        distribution: statement(7_000, 3_000, '2027-28'),
        facts: resident(3_000),
      }),
    (error) => {
      assert.ok(error instanceof IndividualFrankingYearMismatchError);
      assert.match(error.message, /FY2027-28/);
      assert.match(error.message, /the wrong LITO taper/);
      return true;
    },
  );
});

test('the year is checked BEFORE the fact gates, so a wrong year is never masked by a refusal', () => {
  assert.throws(
    () =>
      frankingForIndividual({
        fy: '2026-27',
        relationship: 'single',
        persons: [person('Ada', 15_000)],
        recipient: 0,
        distribution: statement(7_000, 3_000, '2027-28'),
        facts: { australianResident: false, qualifiedPerson: false, frankingCreditsForTheIncomeYear: toCents(9_000), relatedPayment: true },
      }),
    IndividualFrankingYearMismatchError,
  );
});

test('a recipient index with no Person behind it is refused rather than assessed as Person 0', () => {
  assert.throws(
    () =>
      frankingForIndividual({
        fy: '2026-27',
        relationship: 'single',
        persons: [person('Ada', 15_000)],
        recipient: 1,
        distribution: statement(7_000, 3_000),
        facts: resident(3_000),
      }),
    /Person 1 of a Household of 1/,
  );
});

// --- The record the answer rests on ------------------------------------------------------------

test('the §5A.6 asymmetry rides with the relief at its own epistemic status, never laundered up', () => {
  assert.equal(RELIEF_IS_INDIVIDUALS_ONLY.confidence, 'secondary-only');
  assert.match(RELIEF_IS_INDIVIDUALS_ONLY.source, /the taxpayer is an individual/);
  assert.equal(RELIEF_IS_INDIVIDUALS_ONLY.registerSection, '§5A.6 / O27');

  const relieved = single(person('Ada', 15_000), statement(7_000, 3_000), {
    australianResident: true,
    qualifiedPerson: false,
    frankingCreditsForTheIncomeYear: toCents(3_000),
    relatedPayment: false,
  });
  const caveat = relieved.provenance.caveats.find((line) => line.includes('small shareholder relief'));
  assert.ok(caveat, 'the relief carried this result and said nothing about it');
  assert.match(caveat, /secondary-only/);
  assert.match(caveat, /§5A\.6 \/ O27/);
  assert.match(caveat, /no equivalent at any credit level/);
});

test('where the caller states qualification, the caveat says the 45-day rule was NOT counted', () => {
  const result = single(person('Ada', 15_000), statement(7_000, 3_000), resident(3_000));
  const caveat = result.provenance.caveats.find((line) => line.includes('45-day holding rule'));
  assert.ok(caveat, 'qualification was assumed and the result did not say so');
  assert.match(caveat, /P3-22e/);
  assert.match(caveat, /not counted in this model/);

  // The two caveats are alternatives, not both: a result says which route qualified it.
  assert.equal(result.provenance.caveats.filter((line) => line.includes('qualified person')).length, 1);
});

test('the refundability record is consumed, not merely written down', () => {
  assert.equal(EXCESS_CREDITS_REFUNDABLE.confidence, 'primary-verified');
  assert.match(EXCESS_CREDITS_REFUNDABLE.source, /s 67-25\(1\)/);
  assert.match(EXCESS_CREDITS_REFUNDABLE.source, /s 63-10\(1\) item 40/);
  assert.match(EXCESS_CREDITS_REFUNDABLE.rule, /not a super advantage/);
});

test('the distribution’s own confidence reaches the refund — a forecast rate makes a forecast refund', () => {
  const forecast = frankedDistributionFromStatement({
    fy: '2026-27',
    frankedAmount: toCents(7_000),
    frankingCredit: toCents(3_000),
    source: 'the Household’s own estimate of next year’s distribution',
    confidence: 'unverified',
  });
  const result = single(person('Ada', 15_000), forecast, resident(3_000));
  assert.equal(result.provenance.confidence, 'unverified');
  assert.equal(result.refund, toCents(2_680));

  // And the statement route weakens nothing it did not have to: the same fixture on a verified
  // statement is as strong as the tax parameters allow.
  const verified = single(person('Ada', 15_000), statement(7_000, 3_000), resident(3_000));
  assert.notEqual(verified.provenance.confidence, 'unverified');
});

test('the chain records that s 207-110 is a fund’s provision and the $5,000 relief an individual’s', () => {
  const result = single(person('Ada', 15_000), statement(7_000, 3_000), resident(3_000));
  const chain = result.chain.join('\n');
  assert.match(chain, /s 207-20\(1\)/);
  assert.match(chain, /s 207-20\(2\)/);
  assert.match(chain, /s 207-90/);
  assert.match(chain, /s 63-10\(1\) item 40/);
  assert.match(chain, /s 207-110 is a superannuation provision an individual never reaches/);
  assert.match(chain, /160APHT/);
});

test('every result is frozen', () => {
  const result = single(person('Ada', 15_000), statement(7_000, 3_000), resident(3_000));
  assert.ok(Object.isFrozen(result));
  assert.ok(Object.isFrozen(result.chain));
  assert.throws(() => {
    result.refund = toCents(0);
  }, TypeError);
});

// --- Source canaries: the halves TypeScript cannot enforce --------------------------------------

const moduleSource = readFileSync(join(SRC, 'core', 'individualFranking.ts'), 'utf8');
const executable = moduleSource
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .split('\n')
  .filter((line) => !line.trim().startsWith('//'))
  .join('\n');

test('the source canaries are not vacuous — stripping leaves the executable code behind', () => {
  assert.ok(executable.includes('export const frankingForIndividual'));
  assert.ok(executable.includes('householdIncomeTax'));
  assert.ok(!executable.includes('A rate appearing below as a literal is a bug'));
});

test('MUTATION T43 — no rate-shaped literal is written in individualFranking.ts', () => {
  const rateLiterals = [...executable.matchAll(/(?<![\w.])0\.\d+/g)].map(([literal]) => literal);
  assert.deepEqual(
    rateLiterals,
    [],
    `src/core/individualFranking.ts holds the rate literal(s) ${rateLiterals.join(', ')} in code. ` +
      's 202-60(2) fixes the gross-up rate to the entity making the distribution, so a diversified ' +
      'holding spans both legislated rates and no portfolio-level figure exists in law. This module ' +
      'derives no credit at all — it reads one off a `FrankedDistribution`.',
  );
});

test('MUTATION — the $5,000 ceiling is read from its assumption record, and no dollar figure is written here', () => {
  // The individual's relief is the one §7 franking figure that decides something here (T49). Since
  // 2026-09-30 its VALUE is read from `franking.smallShareholder.ceiling` — the record the
  // rules-in-force panel shows — so a literal copy here is a second home that drifts when the
  // register's figure is re-read.
  const fiveThousand = [...executable.matchAll(/(?<![\w.$])5_?000(?![\w.])/g)];
  assert.equal(fiveThousand.length, 0, 'the $5,000 ceiling is written as a literal in code');
  assert.match(executable, /ceiling: FRANKING\.smallShareholder\.ceiling\.value/);

  // No money literal. `toCents(0)` is a nil and is not a figure.
  const money = [...executable.matchAll(/toCents\(([\d_.]+)\)/g)].map(([, amount]) => amount);
  assert.deepEqual([...new Set(money)].sort(), ['0']);
});

test('MUTATION — the module does not reach into incomeTax.ts for anything but the assessment', () => {
  // The refund must not be achieved by letting net tax go below zero. The only thing imported from
  // `incomeTax.ts` is `householdIncomeTax` and its types, so there is no offset table, no LITO and
  // no levy in this file to make refundable.
  const imports = [...moduleSource.matchAll(/^import\s+(?!type)[^\n]*from\s+'([^']+)'/gm)].map(([, s]) => s);
  assert.deepEqual(imports.filter((s) => s.includes('incomeTax')), ['./incomeTax.js']);
  assert.match(moduleSource, /^import \{ householdIncomeTax \} from '\.\/incomeTax\.js';$/m);
  for (const forbidden of [/lowIncomeTaxOffset/, /seniorsAndPensionersOffset/, /medicareLevy/, /workingAustraliansTaxOffset/]) {
    assert.doesNotMatch(executable, forbidden);
  }
});

test('MUTATION — the individual module has no complying-fund gate to have grown', () => {
  // The fund's third fact is s 67-25(1A), which is a superannuation provision. A `complyingFund`
  // field copied across from `FundFrankingFacts` would refuse individuals on a rule that does not
  // reach them. There is no such field and nothing reads one.
  assert.doesNotMatch(executable, /complyingFund\s*[:?.]/);
  assert.doesNotMatch(executable, /NonComplyingFundError/);

  // ⚠️ **NARROWED, not deleted, 2026-09-22 (P3-22h step 3).** Until this step the only thing taken
  // from the super module was the branded distribution TYPE, and this test asserted ZERO value
  // imports — a value import was flagged as "the first step toward one module's phase logic
  // deciding an individual's tax". That ground still holds and is still tested below (no phase, no
  // fund-eligibility export reaches this file). What changed is that `frankedDistributionFromShare`
  // (added this step, immediately below) needs `frankedDistributionFromStatement` to build a
  // `FrankedDistribution` at all — the branded constructor, the one T43 already calls "the
  // preferred route", not a fund-specific one — so EXACTLY that one value import is now expected,
  // and named, rather than merely counted.
  const imports = [...moduleSource.matchAll(/^import\s+(?!type)[^\n]*from\s+'([^']+)'/gm)].map(([, s]) => s);
  assert.equal(imports.filter((s) => s.includes('superFranking')).length, 1);
  assert.match(moduleSource, /^import \{ frankedDistributionFromStatement \} from '\.\/superFranking\.js';$/m);
  assert.match(moduleSource, /^import type \{ FrankedDistribution \} from '\.\/superFranking\.js';$/m);
  // The ground itself, still tested directly: nothing FUND- or PHASE-shaped crosses over.
  for (const forbidden of [/frankingInSuper/, /FundFrankingFacts/, /NO_SMALL_SHAREHOLDER_RELIEF_FOR_SUPER/, /fundEarningsTax/, /SuperInterest/]) {
    assert.doesNotMatch(executable, forbidden);
  }
});

test('P3-22h STEP 3 LANDED, 2026-09-22 — the walk now calls this module, AND the super side (P3-42 step 3)', () => {
  // ⚠️ **INVERTED ON PURPOSE, TWICE.** Until P3-22h step 3, `project()` called NEITHER franking
  // module, and this test asserted that of both. P3-22h step 3 inverted the individual half. P3-42
  // step 3 (2026-09-22) inverts the second half: `frankingInSuper`/`superFranking` is now wired
  // too — P6-8d's own gate named this the prerequisite for "franking on both sides", and it is
  // done, so both franking modules are now live in `projection.ts` and neither assertion below
  // stays a `doesNotMatch`.
  //
  // The module itself is unchanged in the respect that matters: the same footing `frankingInSuper`
  // ships on for TIMING — a franking credit is an ANNUAL tax outcome (P3-22g, register O28), and
  // the Income Waterfall must not be able to spend the refund in the month of the distribution. The
  // defence is still that this module's only unit of time is a FinancialYear; the walk's OWN
  // wiring (`src/core/projection.ts`) applies the credit once a year, at the SAME year-end
  // settlement `TAX_TRUE_UP_LINE` already uses (P4-2's mechanism), never inside the month loop.
  assert.doesNotMatch(executable, /\bMonth\b|\bYearMonth\b|monthly/);
  assert.match(executable, /FinancialYear/);

  const projection = readFileSync(join(SRC, 'core', 'projection.ts'), 'utf8');
  assert.match(projection, /frankingForIndividual|individualFranking/);
  assert.match(projection, /frankingInSuper/);
  assert.match(projection, /superFranking/);
});
