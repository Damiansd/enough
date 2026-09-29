// P3-42 STEPS 2 AND 3 — THE SUPER FUND'S REAL 15%/0% EARNINGS TAX, AND ITS FRANKING CREDIT,
// COMPUTED IN A LIVE FORECAST.
//
// Step 1 shipped two optional Settings and read neither. This file defends steps 2 and 3 —
// `Settings.superIncomeYieldRate` and `Settings.superIncomeYieldFrankedShare`, both once a year,
// in the financial year's final month and settled the following July —
//
//   1. **ABSENT: NO EFFECT AT ALL** — §1, a structural identity, not a digest that happens not to
//      have moved (`investmentPayoutRate`'s own §5 precedent).
//   2. **ACCUMULATION PHASE, THE WHOLE YEAR — 15%, HAND-WORKED TO THE CENT** — §2.
//   3. **RETIREMENT PHASE FROM DAY ONE — 0%, AND NO LINE AT ALL** — §3.
//   4. **THE MID-YEAR CONVERSION — R10's BOUND, NOT THE NAIVE YEAR-END-PHASE READ** — §4, the case
//      the re-gate note of 2026-09-22 named: a TTR interest that converts mid-year is charged at
//      the ACCUMULATION rate on the WHOLE year's income share, not the 0% a careless
//      `phaseHeldForTheWholeYear` read of the CONVERTED phase would reach for.
//   5. **THE FRANKING CREDIT COMPOSES WITH THE EARNINGS TAX, NOT ALONGSIDE IT** — §5, step 3:
//      Accumulation Phase, lightly franked, leaves a REDUCED `SUPER_EARNINGS_TAX_LINE`; Retirement
//      Phase, at 0%, refunds the WHOLE credit in cash on `SUPER_FRANKING_CREDIT_REFUND_LINE` — T45/
//      T46 reachable from a live walk for the first time.
import test from 'node:test';
import assert from 'node:assert/strict';

import { toCents } from '../dist/core/money.js';
import { SUPER_EARNINGS_TAX_LINE, SUPER_FRANKING_CREDIT_REFUND_LINE, project } from '../dist/core/projection.js';

const person = (name, dateOfBirth, superInterests, over = {}) => ({
  name,
  dateOfBirth,
  superInterests,
  parcels: [],
  employmentIncomePerFortnight: toCents(0),
  workBonusBalance: toCents(0),
  ...over,
});

/** A walk that begins on 1 July, `nominalReturn: 0` — `investmentPayoutRate`'s own `FROM_JULY`
 * precedent: FY2026-27 is a complete financial year inside the walk, so the true-up is reachable,
 * and nothing grows, so a balance is the fixture's own number in every month rather than a
 * compounded one. */
const FROM_JULY = {
  asAtDate: '2026-07-01',
  economicSeries: { cpi: 0, pblci: 0.025, awote: 0.035, mtawe: 0.035 },
  deemingRates: { lower: 0.0175, upper: 0.0375 },
  nominalReturn: 0,
};

const entry = (id, owner, type, date, params = {}) => ({ id, date, owner, type, params, enabled: true, createdAt: '2026-06-01' });
const monthAt = (months, isoMonth) => months.find((m) => m.month === isoMonth);
const linesOf = (months, description) => months.flatMap((m) => m.lines.filter((l) => l.description.startsWith(description)));

// --- §1. ABSENT: NO EFFECT AT ALL -------------------------------------------------------------------

test('ABSENT Settings.superIncomeYieldRate — the walk is byte-identical to the same plan with the key never having existed', () => {
  const household = {
    persons: [person('Jules', '1980-01-01', [{ phase: 'accumulation', balance: toCents(300_000) }])],
    homeStatus: 'occupied',
  };
  const settings = { ...FROM_JULY, planningHorizonAge: 48 };
  const without = project(settings, household, []);
  const withUndefinedKey = project({ ...settings, superIncomeYieldRate: undefined }, household, []);
  assert.deepEqual(withUndefinedKey, without);
  assert.equal(linesOf(without, SUPER_EARNINGS_TAX_LINE).length, 0);
});

// --- §2. ACCUMULATION PHASE, THE WHOLE YEAR — HAND-WORKED ------------------------------------------

test('HAND-WORKED — Accumulation Phase, the whole year: $300,000.00 × 3% = $9,000.00 income, taxed at 15% = $1,350.00', () => {
  // $300,000.00 = 30,000,000 cents. `superIncomeYieldFor` floors `balance × rate`:
  //   30,000,000 × 0.03 = 900,000.0 cents exactly — the floor moves nothing here.
  // `fundEarningsTax` charges the Accumulation row (register §3.1, ITAA 1997, 0.15) on the whole of
  // it, `whole-year` coverage (no conversion in play at all):
  //   900,000 × 0.15 = 135,000 cents exactly ($1,350.00).
  assert.equal(Math.floor(30_000_000 * 0.03), 900_000);
  assert.equal(900_000 * 0.15, 135_000);

  const household = {
    persons: [person('Jules', '1980-01-01', [{ phase: 'accumulation', balance: toCents(300_000) }])],
    homeStatus: 'occupied',
  };
  const months = project({ ...FROM_JULY, planningHorizonAge: 48, superIncomeYieldRate: 0.03 }, household, []);
  const july = monthAt(months, '2027-07');
  const lines = linesOf([july], SUPER_EARNINGS_TAX_LINE);
  assert.equal(lines.length, 1);
  assert.equal(lines[0].description, `${SUPER_EARNINGS_TAX_LINE}, Jules — Superannuation, Accumulation Phase, 2026-27`);
  assert.equal(lines[0].direction, 'outflow');
  assert.equal(lines[0].effect, 'wealth');
  assert.equal(lines[0].amount, toCents(1_350));
  assert.equal(lines[0].provenance.register, 'superannuation fund earnings tax');
  // No OTHER month carries this line — charged once, at the settlement, on the completed year alone.
  assert.equal(linesOf(months, SUPER_EARNINGS_TAX_LINE).length, 1);
});

// --- §3. RETIREMENT PHASE FROM DAY ONE — 0%, AND NO LINE AT ALL ------------------------------------

test('HAND-WORKED — Retirement Phase from day one, the whole year: 0% of $8,000.00 income is nil, and no line reports it', () => {
  // $400,000.00 = 40,000,000 cents; 40,000,000 × 0.02 = 800,000 cents of income ($8,000.00) — a
  // real, nonzero income share. `fundEarningsTax` charges the Retirement row (0, ss 295-385/390) on
  // the whole of it, `whole-year` coverage (declared Account-Based Pension from day one, so there is
  // no part-year conversion to bound): 800,000 × 0 = 0 exactly, and a nil tax emits no line
  // (`SUPER_EARNINGS_TAX_LINE`'s own doc — "no line where there was no tax").
  assert.equal(Math.floor(40_000_000 * 0.02), 800_000);
  assert.equal(800_000 * 0, 0);

  // Alex, born 1955-01-01: 71 on 2026-07-01, decades past the automatic release age (65), so
  // `retirementPhaseInterest`'s `release.met` gate is satisfied by age alone.
  const household = {
    persons: [person('Alex', '1955-01-01', [{ phase: 'accountBasedPension', balance: toCents(400_000) }])],
    homeStatus: 'occupied',
  };
  const months = project({ ...FROM_JULY, planningHorizonAge: 73, superIncomeYieldRate: 0.02 }, household, []);
  assert.equal(linesOf(months, SUPER_EARNINGS_TAX_LINE).length, 0);
});

// --- §4. THE MID-YEAR CONVERSION — R10's BOUND, NOT THE NAIVE YEAR-END-PHASE READ ------------------

test('HAND-WORKED — a TTR interest converting mid-year is charged the R10 bound, not the naive 0%', () => {
  // Robin, born 1966-01-01: 60 on 2026-01-01 (already past Preservation Age when the walk opens),
  // retires 2026-08-01 (age 60, so the EMPLOYMENT ground is made out), and converts the TTR to an
  // Account-Based Pension on 2027-01-01 via a stated TRIS_EARLY_CONVERSION entry — squarely R13's
  // "preservation age to 64, user advises the move" window.
  //
  // The balance is $600,000.00 = 60,000,000 cents, flat all year (`nominalReturn: 0`, no spending
  // target, and nothing draws an Accumulation-or-TTR balance automatically before conversion; the
  // Schedule 7 minimum sweep that fires once converted writes back to the balance only at THIS
  // month's OWN growth step, which is after the settlement below reads it, so it never enters this
  // arithmetic).
  //
  // `Settings.superIncomeYieldRate` is 0.02: 60,000,000 × 0.02 = 1,200,000 cents of income for the
  // YEAR ($12,000.00) — the walk computes this ONCE, off the June balance, undivided by the
  // conversion.
  assert.equal(Math.floor(60_000_000 * 0.02), 1_200_000);

  // **`phaseHeldFor` — the fraction, hand-counted (SISR Sch 7 cl 3's inclusive count, register
  // §3.11.7's own convention).** The interest converts 2027-01-01, inside FY2026-27
  // (2026-07-01 to 2027-06-30, 365 days — neither 2026 nor 2027 is a leap year, and FY2026-27 does
  // not contain 29 February). Days held in Retirement Phase, 1 January to 30 June 2027 inclusive:
  //   January 31 + February 28 + March 31 + April 30 + May 31 + June 30 = 181 of 365 days.
  assert.equal(31 + 28 + 31 + 30 + 31 + 30, 181);
  // 181 < 365, so `coverage` is `'part-year'` — R10's bound fires. `CHARGED['retirement']['part-year']`
  // is `'accumulation'`: the interest is charged at the ACCUMULATION rate (register §3.1, 0.15) on
  // the WHOLE year's income share, not apportioned by the 181/365 fraction (§3.11.2 — there is no
  // apportionment under either method; the fraction decides the ROW, never a divisor).
  //   1,200,000 × 0.15 = 180,000 cents exactly ($1,800.00).
  //
  // **The naive, WRONG reading this bound exists to replace**: if the walk instead read the
  // CONVERTED phase for the WHOLE year (`phaseHeldForTheWholeYear` in place of `phaseHeldFrom`), the
  // charge would be `CHARGED['retirement']['whole-year']` = `'retirement'` — the 0% row — giving
  // $0.00 and NO LINE AT ALL. $1,800.00 against $0.00 is the whole of what this test pins.
  assert.equal(1_200_000 * 0.15, 180_000);

  const household = {
    persons: [
      person('Robin', '1966-01-01', [{ phase: 'ttr', balance: toCents(600_000) }]),
    ],
    homeStatus: 'occupied',
  };
  const entries = [
    entry('ret', 'personA', 'RETIRE', '2026-08-01'),
    entry('conv', 'personA', 'TRIS_EARLY_CONVERSION', '2027-01-01', { interestIndex: 0 }),
  ];
  const months = project({ ...FROM_JULY, planningHorizonAge: 62, superIncomeYieldRate: 0.02 }, household, entries);
  const july = monthAt(months, '2027-07');
  const lines = linesOf([july], SUPER_EARNINGS_TAX_LINE);
  assert.equal(lines.length, 1, 'the R10 bound produced no line — has the resolver reverted to the naive whole-year read?');
  assert.equal(lines[0].amount, toCents(1_800), 'the R10 bound amount has drifted from the hand-worked $1,800.00');
  assert.notEqual(lines[0].amount, toCents(0), 'a nil charge is the naive, WRONG reading this bound exists to replace');
  assert.equal(lines[0].direction, 'outflow');
  assert.equal(lines[0].effect, 'wealth');
  assert.match(lines[0].provenance.determination.join(' '), /1200000 cents at 0\.15/);
  assert.match(lines[0].provenance.determination.join(' '), /Subdiv 295-F upper bound/);
  assert.equal(linesOf(months, SUPER_EARNINGS_TAX_LINE).length, 1);
});

// --- §5. THE FRANKING CREDIT COMPOSES WITH THE EARNINGS TAX, NOT ALONGSIDE IT ----------------------

test('HAND-WORKED — Accumulation Phase, lightly franked: the credit REDUCES the earnings tax line, it does not add a second one', () => {
  // $300,000.00 = 30,000,000 cents; 3% income = 900,000 cents ($9,000.00) — as §2.
  // A 10% franked share: `frankedAmount` is the WHOLE income share, UNSPLIT (never a fraction of
  // it) — `frankingCredit = 900,000 × 0.1 = 90,000` cents ($900.00).
  //   grossedUpAmount = 900,000 + 90,000 = 990,000 cents.
  //   earnings tax = 990,000 × 0.15 = 148,500 cents ($1,485.00) — the Accumulation row, on the
  //   GROSSED-UP amount, not on the bare 900,000 §2 charged.
  //   offset = the credit, unconditionally (s 207-20(2)) = 90,000 cents.
  //   Since the offset (90,000) is LESS than the tax (148,500) — a LIGHTLY franked distribution,
  //   deliberately, so both directions of `frankingInSuper`'s own invariant are exercised across
  //   this file — the excess is what remains: 148,500 − 90,000 = 58,500 cents ($585.00) payable,
  //   and the refund is nil.
  assert.equal(Math.floor(30_000_000 * 0.03), 900_000);
  assert.equal(900_000 * 0.1, 90_000);
  assert.equal(900_000 + 90_000, 990_000);
  assert.equal(990_000 * 0.15, 148_500);
  assert.equal(148_500 - 90_000, 58_500);

  const household = {
    persons: [person('Jules', '1980-01-01', [{ phase: 'accumulation', balance: toCents(300_000) }])],
    homeStatus: 'occupied',
  };
  const months = project(
    { ...FROM_JULY, planningHorizonAge: 48, superIncomeYieldRate: 0.03, superIncomeYieldFrankedShare: 0.1 },
    household,
    [],
  );
  const july = monthAt(months, '2027-07');
  const taxLines = linesOf([july], SUPER_EARNINGS_TAX_LINE);
  // **EXACTLY ONE tax line, at the COMPOSED figure — not the plain $1,350.00 §2 charged on the same
  // rate and balance without a franked share, and not that figure plus a second, separate credit
  // line.** Two lines here would mean the walk taxed the income share once and then applied the
  // credit a second time as an unrelated adjustment, rather than composing the two into one figure.
  assert.equal(taxLines.length, 1, 'the composed tax line is missing — has the credit stopped reducing the charge?');
  assert.equal(taxLines[0].amount, toCents(585), 'the composed figure has drifted from the hand-worked $585.00');
  assert.notEqual(taxLines[0].amount, toCents(1_350), 'this is the PLAIN, credit-free figure — the credit was not applied at all');
  assert.notEqual(taxLines[0].amount, toCents(1_485), 'this is the GROSSED-UP figure with no credit netted off — the offset was dropped');
  assert.equal(linesOf([july], SUPER_FRANKING_CREDIT_REFUND_LINE).length, 0, 'a lightly franked distribution leaves no refund — the tax exceeds the credit');
  assert.equal(linesOf(months, SUPER_EARNINGS_TAX_LINE).length, 1);
  assert.equal(linesOf(months, SUPER_FRANKING_CREDIT_REFUND_LINE).length, 0);
});

test('HAND-WORKED — Retirement Phase, fully franked: the WHOLE credit is refunded in cash, and there is no tax line at all', () => {
  // $400,000.00 = 40,000,000 cents; 2% income = 800,000 cents ($8,000.00) — as §3.
  // A 60% franked share: frankingCredit = 800,000 × 0.6 = 480,000 cents ($4,800.00).
  //   grossedUpAmount = 800,000 + 480,000 = 1,280,000 cents.
  //   earnings tax = 1,280,000 × 0 = 0 — the Retirement row, whole year, exactly as §3.
  //   offset = 480,000 (unconditional). Since the offset EXCEEDS the nil tax, T45/T46's own
  //   point fires: the WHOLE credit is refunded in cash, s 63-10(1) item 40 — 480,000 cents
  //   ($4,800.00) — and taxPayableAfterOffset is nil, so NO `SUPER_EARNINGS_TAX_LINE` at all.
  assert.equal(Math.floor(40_000_000 * 0.02), 800_000);
  assert.equal(800_000 * 0.6, 480_000);
  assert.equal(1_280_000 * 0, 0);

  // Alex, born 1955-01-01 — §3's own fixture, decades past the automatic release age.
  const household = {
    persons: [person('Alex', '1955-01-01', [{ phase: 'accountBasedPension', balance: toCents(400_000) }])],
    homeStatus: 'occupied',
  };
  const months = project(
    { ...FROM_JULY, planningHorizonAge: 73, superIncomeYieldRate: 0.02, superIncomeYieldFrankedShare: 0.6 },
    household,
    [],
  );
  assert.equal(linesOf(months, SUPER_EARNINGS_TAX_LINE).length, 0, 'a tax line appeared at 0% — the credit is being offset against a liability that does not exist');
  const refundLines = linesOf(months, SUPER_FRANKING_CREDIT_REFUND_LINE);
  assert.equal(refundLines.length, 1, 'the refund is missing — has frankingInSuper stopped being reached for Retirement Phase?');
  assert.equal(refundLines[0].direction, 'inflow');
  assert.equal(refundLines[0].effect, 'wealth');
  assert.equal(refundLines[0].amount, toCents(4_800), 'the refund has drifted from the hand-worked $4,800.00 — the WHOLE credit, T45/T46');
});

test('ABSENT Settings.superIncomeYieldFrankedShare — byte-identical to the plain earnings-tax walk (§2)', () => {
  const household = {
    persons: [person('Jules', '1980-01-01', [{ phase: 'accumulation', balance: toCents(300_000) }])],
    homeStatus: 'occupied',
  };
  const settings = { ...FROM_JULY, planningHorizonAge: 48, superIncomeYieldRate: 0.03 };
  const withoutShare = project(settings, household, []);
  const withUndefinedKey = project({ ...settings, superIncomeYieldFrankedShare: undefined }, household, []);
  assert.deepEqual(withUndefinedKey, withoutShare);
  const july = monthAt(withoutShare, '2027-07');
  assert.equal(linesOf([july], SUPER_EARNINGS_TAX_LINE)[0].amount, toCents(1_350), 'the §2 baseline itself has drifted');
  assert.equal(linesOf(withoutShare, SUPER_FRANKING_CREDIT_REFUND_LINE).length, 0);
});
