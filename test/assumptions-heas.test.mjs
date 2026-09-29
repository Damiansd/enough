// HEAS — register §5. The four worked examples from §5.2 are fixtures here, and so are the two
// arithmetic pins that settle the interest convention.
//
// Every figure is from a legislative instrument or a Services Australia worked example. The
// "market values" below are the register's own example figures, not this Household's.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { toCents } from '../dist/core/money.js';
import {
  AGE_PENSION_PERIODS,
  HEAS,
  SETTINGS_NOT_ASSUMPTIONS,
  heasAccrueFortnight,
  heasAdvanceAvailable,
  heasAdvanceCap,
  heasAgeComponent,
  heasFortnightlyCap,
  heasFortnightlyDraw,
  heasFortnightlyDrawDuringAdvancePeriod,
  heasSecurityValue,
  maximumLoanAvailable,
  maximumPaymentRate,
  personMaximumLoanAvailable,
} from '../dist/data/assumptions/index.js';

test('the age component table is all 36 rows, unchanged since 2019, and clamps at both ends', () => {
  const table = HEAS.ageComponent.table.value;
  assert.equal(Object.keys(table).length, 36);
  assert.equal(HEAS.ageComponent.table.kind, 'constant');
  assert.equal(HEAS.ageComponent.table.effective, '2019-07-01');

  assert.equal(heasAgeComponent(55), toCents(1_710));
  assert.equal(heasAgeComponent(67), toCents(2_740));
  assert.equal(heasAgeComponent(70), toCents(3_080));
  assert.equal(heasAgeComponent(90), toCents(6_750));

  // Both endpoints are open-ended in the instrument.
  assert.equal(heasAgeComponent(40), heasAgeComponent(55));
  assert.equal(heasAgeComponent(101), heasAgeComponent(90));

  // Monotonic across every row — a transposed digit would break this.
  for (let age = 56; age <= 90; age += 1) {
    assert.ok(heasAgeComponent(age) > heasAgeComponent(age - 1), `age ${age} must exceed ${age - 1}`);
  }
});

test('register §5.2 example 1 — single, 70, $256,000 of security', () => {
  assert.equal(maximumLoanAvailable(heasAgeComponent(70), toCents(256_000)), toCents(77_000));
});

test('register §5.2 example 2 — couple 70/69 keys to the YOUNGER Person (T36)', () => {
  assert.equal(maximumLoanAvailable(heasAgeComponent(69), toCents(256_000)), toCents(74_000));
  // The mutation: the older partner's age, or age next birthday, gives $77,000.
  assert.equal(maximumLoanAvailable(heasAgeComponent(70), toCents(256_000)), toCents(77_000));
  assert.notEqual(
    maximumLoanAvailable(heasAgeComponent(69), toCents(256_000)),
    maximumLoanAvailable(heasAgeComponent(70), toCents(256_000)),
  );
});

test('register §5.2 example 3 — the nominated amount comes off the security first', () => {
  const security = heasSecurityValue(toCents(180_000), toCents(0), toCents(80_000));
  assert.equal(security, toCents(100_000));
  assert.equal(maximumLoanAvailable(heasAgeComponent(70), security), toCents(30_800));
});

test('register §5.2 example 4 — per-Person halving, nomination and round-down together (T37)', () => {
  // Couple 72/68, joint, $240,000 of security, each nominating $45,000. Per Person:
  // $120,000 − $45,000 = $75,000, which floors to $70,000 — losing $5,000 of counted security.
  const perPerson = personMaximumLoanAvailable(heasAgeComponent(68), toCents(240_000), 0.5, toCents(45_000));
  assert.equal(perPerson, toCents(19_950));

  // Round-to-nearest instead of down would give 8 × $2,850 = $22,800.
  assert.notEqual(perPerson, toCents(22_800));

  // Applying the formula once at Household level on the whole net security is also wrong here:
  // $240,000 − $90,000 = $150,000 → 15 × $2,850 = $42,750, against 2 × $19,950 = $39,900.
  const householdLevel = maximumLoanAvailable(heasAgeComponent(68), toCents(150_000));
  assert.equal(householdLevel, toCents(42_750));
  assert.notEqual(householdLevel, perPerson * 2);
});

test('T37 — security below $10,000 gives nil capacity, and the rounding is downward', () => {
  assert.equal(maximumLoanAvailable(heasAgeComponent(67), toCents(9_999)), toCents(0));
  assert.equal(maximumLoanAvailable(heasAgeComponent(67), toCents(10_000)), toCents(2_740));
  assert.equal(maximumLoanAvailable(heasAgeComponent(67), toCents(19_999)), toCents(2_740));
  // A mortgage larger than the home cannot produce a negative security value.
  assert.equal(heasSecurityValue(toCents(400_000), toCents(500_000)), toCents(0));
});

test('T33 — the 150% cap is fortnightly and the 50% advance cap is ANNUAL', () => {
  // At the 20 Mar 2026 rates, taken from the Age Pension assumption rather than duplicated here.
  const period = AGE_PENSION_PERIODS[0];
  const single = maximumPaymentRate(period, 'single');
  const coupleEach = maximumPaymentRate(period, 'coupleEach');
  const coupleCombined = maximumPaymentRate(period, 'coupleCombined');

  assert.equal(heasFortnightlyCap(single), toCents(1_801.35));
  assert.equal(heasFortnightlyCap(coupleEach), toCents(1_357.8));
  assert.equal(heasFortnightlyCap(coupleCombined) * 26, toCents(70_605.6)); // concept.md's "~$70,600/yr"

  assert.equal(heasAdvanceCap(single), toCents(15_611.7));
  assert.equal(heasAdvanceCap(coupleEach), toCents(11_767.6));

  // The 26× error: reading the 50% against the fortnightly rate gives $452.60.
  assert.equal(toCents(coupleEach * 0.5) / 100, toCents(452.6));
  assert.equal(heasAdvanceCap(coupleEach), toCents(452.6) * 26);
});

test('T33 — the fortnightly draw is the difference, so a full-rate pensioner gets only 50%', () => {
  const period = AGE_PENSION_PERIODS[0];
  const single = maximumPaymentRate(period, 'single');
  assert.equal(heasFortnightlyDraw(single, single), toCents(600.45)); // the remaining 50%
  assert.equal(heasFortnightlyDraw(single, toCents(0)), toCents(1_801.35)); // nil entitlement: the full 150%
  assert.notEqual(heasFortnightlyDraw(single, single), heasFortnightlyCap(single));
});

test('an advance is capped by the annual cap, by advances already taken, and by headroom', () => {
  const period = AGE_PENSION_PERIODS[0];
  const coupleEach = maximumPaymentRate(period, 'coupleEach');
  const capacity = toCents(100_000);

  assert.equal(heasAdvanceAvailable(coupleEach, toCents(0), capacity, toCents(0)), toCents(11_767.6));
  // A second advance in the same rolling 26 fortnights is capped at the remainder.
  assert.equal(heasAdvanceAvailable(coupleEach, toCents(5_000), capacity, toCents(0)), toCents(6_767.6));
  // And the maximum loan available less current debt binds when it is smaller.
  assert.equal(heasAdvanceAvailable(coupleEach, toCents(0), capacity, toCents(98_000)), toCents(2_000));
  assert.equal(heasAdvanceAvailable(coupleEach, toCents(0), capacity, capacity), toCents(0));
  assert.equal(HEAS.drawModes.maximumAdvancesPerPeriod.value, 2);
  assert.equal(HEAS.drawModes.advancePeriodFortnights.value, 26);
});

// --- T136 (P9-2b) — the fortnightly draw DURING an advance period, register §5.3's ambiguity ------

test('T136 — Services Australia\'s "George", the pre-20 Sep 2026 example: $15,323.10 − $10,000 = $5,323.10 ÷ 26 = $204.73/fn, to the cent', () => {
  // "George also gets the maximum $589.35 ($15,323.10 yearly) rate of loan payments... he wants a
  // lump sum payment of $10,000... $15,323.10 yearly − $10,000 (advance payment) = $5,323.10
  // divided by 26 = $204.73 for 26 fortnights." (Services Australia, "Home Equity Access Scheme
  // advance payment examples", as the page stood before its 20 Sep 2026 update — the gate's own source; superseded by the next test).
  const fortnightlyDrawBeforeAdvance = toCents(589.35);
  assert.equal(fortnightlyDrawBeforeAdvance * 26, toCents(15_323.1)); // the annualised headroom, unrounded by this step
  assert.equal(heasFortnightlyDrawDuringAdvancePeriod(fortnightlyDrawBeforeAdvance, toCents(10_000)), toCents(204.73));

  // **The mutation this pins: no ÷26.** Reading the register's old table row literally —
  // `1.5×MPR − advances_taken`, no annualising step — subtracts the WHOLE $10,000 lump sum from a
  // FORTNIGHTLY rate and floors George at bare MPR (nil loan top-up) for the entire 26 fortnights,
  // a 26× error in the household's favour. `heasFortnightlyDrawDuringAdvancePeriod` must not agree
  // with that reading.
  const literalTableRowReading = Math.max(0, fortnightlyDrawBeforeAdvance - toCents(10_000));
  assert.notEqual(heasFortnightlyDrawDuringAdvancePeriod(fortnightlyDrawBeforeAdvance, toCents(10_000)), literalTableRowReading);
});

test('T136 — Services Australia\'s "George", the current (20 Sep 2026) example: $16,090.10 − $10,000 = $6,090.10 ÷ 26 = $234.23/fn, to the cent', () => {
  // The same page after its 20 Sep 2026 update: George on the maximum $1,237.70 pension, a loan of
  // $618.85 a fortnight ($16,090.10 yearly), a $10,000 advance, and "$6,090.10 divided by 26 =
  // $234.23 for 26 fortnights" (Services Australia, "Home Equity Access Scheme advance payment
  // examples", page last updated 20 September 2026). The method is unchanged; only the rate moved.
  const fortnightlyDrawBeforeAdvance = toCents(618.85);
  assert.equal(fortnightlyDrawBeforeAdvance * 26, toCents(16_090.1));
  assert.equal(heasFortnightlyDrawDuringAdvancePeriod(fortnightlyDrawBeforeAdvance, toCents(10_000)), toCents(234.23));
  // Same mutation as the pre-20 Sep example: no ÷26 must not agree.
  assert.notEqual(
    heasFortnightlyDrawDuringAdvancePeriod(fortnightlyDrawBeforeAdvance, toCents(10_000)),
    Math.max(0, fortnightlyDrawBeforeAdvance - toCents(10_000)),
  );
});

test('T136 — nil advances in the period leaves the fortnightly draw unchanged, to the cent', () => {
  const period = AGE_PENSION_PERIODS[0];
  const single = maximumPaymentRate(period, 'single');
  const uncapped = heasFortnightlyDraw(single, toCents(0)); // nil entitlement: the full 150%
  assert.equal(heasFortnightlyDrawDuringAdvancePeriod(uncapped, toCents(0)), uncapped);
});

test('T136 — a window total at or over the annual headroom floors the fortnightly draw at nil, never negative', () => {
  const fortnightlyDrawBeforeAdvance = toCents(589.35);
  const headroomAnnual = fortnightlyDrawBeforeAdvance * 26;
  assert.equal(heasFortnightlyDrawDuringAdvancePeriod(fortnightlyDrawBeforeAdvance, headroomAnnual), toCents(0));
  assert.equal(heasFortnightlyDrawDuringAdvancePeriod(fortnightlyDrawBeforeAdvance, headroomAnnual + toCents(1_000)), toCents(0));
});

// --- T137 RESOLVED (P16-4, docs/research/p9-2b-part-rate-advances-2026-09-25.md) ------------------
//
// ⚠️ **THIS FIXTURE IS HAND-BUILT AND DERIVED FROM THE ACT, NOT FROM AN OFFICIAL WORKED EXAMPLE.**
// Neither of Services Australia's two published advance examples is a genuine part-rate pensioner
// (George is full-rate, Olli is nil), so — unlike every other figure in this file — there is no
// primary-sourced number to pin this case against. The research doc instead proves the formula
// correct ALGEBRAICALLY: given the 50% annual advance cap `checkHeasDraws` already enforces at the
// door (s 1134A(3)(a)), `combined_fn = pension_fn + max(0, headroom_annual − advances_taken)/26 ≥
// MPR_fn` for ANY `pension_fn` in `[0, MPR_fn]` — the "greater of MPR" floor in s 1134(1A)(b)(i) is
// automatically satisfied by the plain unfloored subtraction and never needs a separate floor step.
// The numbers below are the research doc's own worked figures, re-derived here rather than merely
// quoted, so a change to `heasFortnightlyDraw` or `heasFortnightlyDrawDuringAdvancePeriod` that
// silently breaks the algebra is caught.
test('T137 — a genuine part-rate pensioner: the plain formula lifts the combined payment to MPR at the legal maximum advance, with no separate floor step (hand-built, no official example)', () => {
  const mprFortnightly = toCents(1_200.90); // register §4.2's own table figure, single rate
  const pensionFortnightly = toCents(700.00); // strictly between nil and MPR — the genuine part-rate case
  const uncappedFortnightlyDraw = heasFortnightlyDraw(mprFortnightly, pensionFortnightly);
  assert.equal(uncappedFortnightlyDraw, toCents(1_101.35)); // 1.5 × 1,200.90 − 700.00

  const headroomAnnual = uncappedFortnightlyDraw * 26;
  assert.equal(headroomAnnual, toCents(28_635.10));

  const legalMaximumAdvance = heasAdvanceCap(mprFortnightly); // s 1134A(3)(a): 0.5 × MPR × 26
  assert.equal(legalMaximumAdvance, toCents(15_611.70));

  // At the legal maximum, the loan tops the pension up to EXACTLY the maximum payment rate — the
  // floor binds with equality, produced by the unfloored subtraction alone.
  const loanAtMaximum = heasFortnightlyDrawDuringAdvancePeriod(uncappedFortnightlyDraw, legalMaximumAdvance);
  assert.equal(loanAtMaximum, toCents(500.90));
  assert.equal(pensionFortnightly + loanAtMaximum, mprFortnightly);

  // A smaller, lawful advance lands the combined payment comfortably ABOVE the maximum payment rate
  // — the same formula, no branch taken for "how far above".
  const smallerAdvance = toCents(5_000);
  const loanAtSmallerAdvance = heasFortnightlyDrawDuringAdvancePeriod(uncappedFortnightlyDraw, smallerAdvance);
  assert.equal(loanAtSmallerAdvance, toCents(909.04));
  assert.ok(pensionFortnightly + loanAtSmallerAdvance > mprFortnightly);
});

test('T40 — interest is r/26, not r × 14/365, and the draw goes on before the interest', () => {
  // Services Australia publishes $2.28 on a balance of $1,501.14.
  const balance = toCents(1_501.14);
  assert.equal(heasAccrueFortnight(balance) - balance, toCents(2.28));
  assert.equal(Math.round((balance * 0.0395 * 14) / 365), toCents(2.27)); // the mutation
  assert.notEqual(heasAccrueFortnight(balance) - balance, toCents(2.27));

  // The Services Australia annuity example: $50 a fortnight for 130 fortnights.
  let running = toCents(0);
  for (let fortnight = 0; fortnight < 130; fortnight += 1) running = heasAccrueFortnight(running, toCents(50));
  assert.ok(
    Math.abs(running - toCents(7_191.2)) <= toCents(0.05),
    `expected about $7,191.20, got ${running} cents — rounding per fortnight, register O22`,
  );

  // Charging interest before adding the draw loses a fortnight of compounding on every draw.
  let interestFirst = toCents(0);
  for (let fortnight = 0; fortnight < 130; fortnight += 1) {
    interestFirst = (heasAccrueFortnight(interestFirst) + toCents(50));
  }
  assert.ok(interestFirst < running);
});

test('T41 — interest keeps compounding past the maximum loan available', () => {
  const capacity = toCents(50_000);
  let balance = capacity;
  for (let fortnight = 0; fortnight < 26; fortnight += 1) balance = heasAccrueFortnight(balance);
  assert.ok(balance > capacity, 'hitting the maximum is an automatic exit, not a freeze');
  assert.match(HEAS.interest.reachingTheMaximumLoan.value, /payments stop, compounding does not/);
});

test('T32/T34/T38 — the means-test treatment that reverses the intuition', () => {
  assert.equal(HEAS.meansTest.pensionerConcessionCardAtNilEntitlement.value, false);
  assert.equal(HEAS.meansTest.advanceDeemedFromDayOne.value, true);
  assert.equal(HEAS.meansTest.advanceAssetExemptDays.value, 90);
  assert.match(HEAS.meansTest.advanceAssetExemptDays.note, /assets test only/);
  assert.equal(HEAS.meansTest.debtReducesAssessableAssets.value, false);
  assert.match(HEAS.meansTest.debtReducesAssessableAssets.note, /STRICTLY REDUCES/);
  assert.equal(HEAS.meansTest.fortnightlyStreamIsIncome.value, false);
});

test('T35 — increasing the Owner-Occupied Mortgage voids the guarantee', () => {
  assert.equal(HEAS.noNegativeEquityGuarantee.exists.value, true);
  assert.match(HEAS.noNegativeEquityGuarantee.voidedBy.value, /created or increased after participation began/);
  assert.match(HEAS.noNegativeEquityGuarantee.adjustedValue.value, /pre-existing mortgage reduces the guarantee/);
});

test('T42 — the home market value is a Setting, and nothing here holds one', () => {
  assert.ok('heas.homeMarketValue' in SETTINGS_NOT_ASSUMPTIONS);
  assert.match(SETTINGS_NOT_ASSUMPTIONS['heas.homeMarketValue'].reason, /no source and no confidence/);
  // The capacity formula takes the value as an argument; it is not stored anywhere in HEAS.
  assert.equal(typeof HEAS.capacity.securityValue.value, 'function');
});

test('no HEAS constant duplicates an Age Pension dollar figure', () => {
  // Register §5.3: derive the maximum payment rate from the Age Pension assumption, which
  // reindexes 20 Mar and 20 Sep. The caps here are multiples, never amounts.
  assert.equal(HEAS.drawModes.fortnightlyCapMultiple.value, 1.5);
  assert.equal(HEAS.drawModes.advanceCapMultiple.value, 0.5);
  const [first, , third] = AGE_PENSION_PERIODS;
  assert.notEqual(heasAdvanceCap(maximumPaymentRate(first, 'single')), heasAdvanceCap(maximumPaymentRate(third, 'single')));
});

// --- P4-18: the evidence for T40, and the rate that came before ---------------------------------

const RAW_HEAS = readFileSync(new URL('../src/data/assumptions/heas.ts', import.meta.url), 'utf8');

/** Doc-comment continuation markers removed, so a sentence wrapped across lines reads as one. */
const flattenProse = (source) => source.replace(/\n\s*\*\s?/g, ' ').replace(/[ \t]+/g, ' ');

const dollars = (text) => Number(text.replace(/,/g, ''));
const toTheCent = (value) => Math.round(value * 100) / 100;

/** The convention sentence, or `undefined` — three figures, read off the raw module. */
const conventionProse = (source) => {
  const match = flattenProse(source).match(
    /at a \$([\d,]+\.\d{2}) balance, `r\/26` gives the published \$([\d,]+\.\d{2}) and `r × 14\/365` gives \$([\d,]+\.\d{2})/,
  );
  return match === null
    ? undefined
    : { balance: dollars(match[1]), twentySixths: dollars(match[2]), daysInTheYear: dollars(match[3]) };
};

/** The superseded rate as `interest.rate.note` states it, or `undefined`. */
const supersededProse = (source) => {
  const match = flattenProse(source).match(/was (\d+\.\d{2})% from (\d+) Jan (\d{4})/);
  return match === null ? undefined : { rate: Number(match[1]) / 100, from: `${match[3]}-01-0${match[2]}` };
};

test('P4-18 — the worked example is a record, and the prose beside it agrees', () => {
  const record = HEAS.interest.publishedWorkedExample;

  assert.equal(record.kind, 'config');
  assert.equal(record.effective, '2022-01-01');
  assert.equal(record.retrieved, '2026-09-21');
  assert.equal(record.confidence, 'primary-verified');
  assert.match(record.registerSection, /^§5\.4/);
  assert.match(record.source, /Services Australia/);

  assert.equal(record.value.drawPerFortnight, toCents(750));
  assert.equal(record.value.balanceAfterFortnight1, toCents(751.14));
  assert.equal(record.value.balanceBeforeInterestFortnight2, toCents(1_501.14));
  assert.equal(record.value.publishedInterestFortnight2, toCents(2.28));
  assert.equal(record.value.balanceAfterFortnight2, toCents(1_503.42));
  assert.equal(record.value.balanceAfterFortnight3, toCents(2_256.84));

  // Internally coherent: the second fortnight's opening balance is the first fortnight's closing
  // balance plus a draw, and its closing balance is that plus the published interest.
  assert.equal(
    record.value.balanceAfterFortnight1 + record.value.drawPerFortnight,
    record.value.balanceBeforeInterestFortnight2,
  );
  assert.equal(
    record.value.balanceBeforeInterestFortnight2 + record.value.publishedInterestFortnight2,
    record.value.balanceAfterFortnight2,
  );

  const prose = conventionProse(RAW_HEAS);
  assert.equal(prose.balance, record.value.balanceBeforeInterestFortnight2 / 100);
  assert.equal(prose.twentySixths, record.value.publishedInterestFortnight2 / 100);
  assert.equal(conventionProse(''), undefined);
});

test('T40 — the worked example DECIDES the convention, computed from the stamped rate', () => {
  // The example is only evidence if it can tell the two conventions apart. It is computed here
  // from `interest.rate.value` and the stamped balance — nothing below is a pasted answer.
  const rate = HEAS.interest.rate.value;
  const example = HEAS.interest.publishedWorkedExample.value;
  const balance = example.balanceBeforeInterestFortnight2 / 100;

  const twentySixths = toTheCent((balance * rate) / HEAS.interest.compoundingPerYear.value);
  const daysInTheYear = toTheCent((balance * rate * 14) / 365);

  assert.equal(twentySixths, 2.28, `${balance} at ${rate} ÷ 26`);
  assert.equal(daysInTheYear, 2.27, `${balance} at ${rate} × 14/365`);
  assert.notEqual(twentySixths, daysInTheYear, 'an example that cannot separate them is not evidence');
  assert.equal(toCents(twentySixths), example.publishedInterestFortnight2, 'the 26ths are what was published');
  assert.notEqual(toCents(daysInTheYear), example.publishedInterestFortnight2);

  // The counterfactual is the one figure in the sentence that is NOT stored — deliberately, so it
  // cannot agree with a wrong rate. It is derived here and matched against the prose.
  assert.equal(conventionProse(RAW_HEAS).daysInTheYear, daysInTheYear);

  // The counterfactual closing balance too, so every figure in that paragraph is derived.
  assert.equal(toCents(balance + daysInTheYear), toCents(1_503.41));
  assert.notEqual(toCents(balance + daysInTheYear), example.balanceAfterFortnight2);

  // The third fortnight discriminates too, and in the same direction.
  const third = toTheCent(example.balanceAfterFortnight2 / 100 + example.drawPerFortnight / 100);
  assert.equal(toCents(third + toTheCent((third * rate) / 26)), example.balanceAfterFortnight3);
  assert.notEqual(toCents(third + toTheCent((third * rate * 14) / 365)), example.balanceAfterFortnight3);

  // And the engine itself reproduces all three published balances from nothing but the draw.
  const one = heasAccrueFortnight(toCents(0), example.drawPerFortnight);
  const two = heasAccrueFortnight(one, example.drawPerFortnight);
  const threeFortnights = heasAccrueFortnight(two, example.drawPerFortnight);
  assert.equal(one, example.balanceAfterFortnight1);
  assert.equal(two, example.balanceAfterFortnight2);
  assert.equal(threeFortnights, example.balanceAfterFortnight3);
});

test('P4-18 — the superseded 4.50% rate is a record, and the prose beside it agrees', () => {
  const record = HEAS.interest.supersededRates['2020-01-01'];

  assert.equal(record.kind, 'config');
  assert.equal(record.effective, '2020-01-01');
  assert.equal(record.retrieved, '2026-09-21');
  assert.equal(record.confidence, 'primary-verified', 'F2019L01613 s 5 was read; it says 4.50 in terms');
  assert.match(record.source, /F2019L01613/);
  assert.match(record.source, /F2021N00323/, 'a superseded rate must say what superseded it');
  assert.match(record.registerSection, /^§5\.4/);
  assert.equal(record.value, 0.045);

  assert.deepEqual(supersededProse(RAW_HEAS), { rate: record.value, from: record.effective });
  assert.equal(supersededProse(''), undefined);

  // It is superseded, and by the rate this module actually uses.
  assert.ok(record.value > HEAS.interest.rate.value);
  assert.ok(record.effective < HEAS.interest.rate.effective);
});

test('P4-18 — the superseded record carries the backtest warning, because T40 does not hold there', () => {
  // The finding this record exists to carry: Services Australia published the SAME example at
  // 4.50%, and its first two fortnights come out on `× 14/365`, not on the 26ths. Re-derived here
  // from the stamped superseded rate rather than asserted from a comment.
  const rate = HEAS.interest.supersededRates['2020-01-01'].value;
  const draw = HEAS.interest.publishedWorkedExample.value.drawPerFortnight / 100;

  const closeOn = (balance, method) => toTheCent(balance + method(balance));
  const sixths = (balance) => toTheCent((balance * rate) / 26);
  const days = (balance) => toTheCent((balance * rate * 14) / 365);

  assert.equal(closeOn(draw, days), 751.29, 'the 2020 page published $751.29 after one fortnight');
  assert.equal(closeOn(draw, sixths), 751.3, 'and the 26ths cannot produce it');
  assert.equal(days(751.29 + draw), 2.59, 'the 2020 page published $2.59 of interest');
  assert.equal(sixths(751.29 + draw), 2.6, 'and the 26ths cannot produce that either');

  // Fortnight 3 on the same page goes the OTHER way, which is why the record says inconsistent.
  const superseded = HEAS.interest.supersededWorkedExample.value;
  assert.equal(sixths(superseded.balanceAfterFortnight2 / 100 + draw), 3.9);
  assert.equal(days(superseded.balanceAfterFortnight2 / 100 + draw), 3.89);
  assert.equal(toCents(sixths(superseded.balanceAfterFortnight2 / 100 + draw)), superseded.publishedInterestFortnight3);

  // The record holds what the page published, and it is internally coherent as a sequence even
  // though the convention behind it is not.
  assert.equal(HEAS.interest.supersededWorkedExample.confidence, 'primary-via-archive');
  assert.equal(HEAS.interest.supersededWorkedExample.effective, '2020-01-01');
  assert.equal(superseded.balanceAfterFortnight1 + superseded.drawPerFortnight, superseded.balanceBeforeInterestFortnight2);
  assert.equal(superseded.balanceBeforeInterestFortnight2 + superseded.publishedInterestFortnight2, superseded.balanceAfterFortnight2);
  assert.equal(
    superseded.balanceAfterFortnight2 + superseded.drawPerFortnight + superseded.publishedInterestFortnight3,
    superseded.balanceAfterFortnight3,
  );
  assert.match(HEAS.interest.supersededWorkedExample.note, /INTERNALLY INCONSISTENT/);

  assert.match(HEAS.interest.supersededRates['2020-01-01'].note, /does NOT support T40/);
  assert.match(HEAS.interest.rate.note, /supersededRates/);
  assert.match(HEAS.interest.compoundingPerYear.note, /publishedWorkedExample/);
  assert.match(HEAS.interest.compoundingPerYear.note, /3\.95% example only/);
});
