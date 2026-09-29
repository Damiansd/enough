// P3-7a and P3-7b — franking credits received **inside** superannuation. Register §5A, and §5A.3
// in particular; traps T43, T44, T45, T46, T49.
//
// **Every expected figure below is hand-worked from register §5A with the arithmetic written out
// beside it.** None of it came from running the implementation.
//
// The base fixture, used by nearly everything: a **$70,000.00** frankable distribution, `D`.
//
//   fully franked, payer at 30%   credit = D × r/(1−r) = 7,000,000 × 3/7    = 3,000,000  ($30,000.00)
//                                 grossed up = D + credit                   = 10,000,000 ($100,000.00)
//   60% franked, payer at 30%     credit = 0.6 × 7,000,000 × 3/7            = 1,800,000  ($18,000.00)
//                                 grossed up                                = 8,800,000  ($88,000.00)
//   10% franked, payer at 30%     credit = 0.1 × 7,000,000 × 3/7            =   300,000  ($3,000.00)
//                                 grossed up                                = 7,300,000  ($73,000.00)
//   fully franked, payer at 25%   credit = 7,000,000 × (0.25/0.75) = 7,000,000/3
//                                        = 2,333,333.33… → 2,333,333        ($23,333.33)
//                                 grossed up                                = 9,333,333  ($93,333.33)
//
// and the two phase rates, from register §3.1 through `superPhase.ts`: **15%** in Accumulation
// Phase and for a TTR pension, **0%** in Retirement Phase (ECPI).
//
// **The headline is T45, and it is a sequencing trap.** s 207-90 denies the gross-up *and* the
// offset on exempt income and has no superannuation carve-out, so Division 207 read as far as
// s 207-90 and no further says a Retirement Phase fund gets **nothing**. s 207-110(2)(b), one
// Subdivision later, disapplies it for exempt current pension income. The Retirement Phase test
// below therefore asserts **two** things: that the refund is the whole $30,000, and — explicitly —
// that it is **not** the $0 the s 207-90-only reading produces. Register §9 carries this as a
// mutation row ("Apply s 207-90 without reaching s 207-110 … the credit must be refunded in full,
// not zero"); this is that row made real.
//
// **Two financial years, and what is invariant by construction.** FY2026-27 and FY2027-28 carry
// the same fixtures. Both phase rates are `everyYear: true` constants, and `f × D × r/(1−r)` has
// no year in it at all — `r` is a caller-supplied input, not an indexed figure — so the invariance
// is asserted **as an invariance** rather than dressed up as a number that moves. The year is not
// inert: it is what `FrankingYearMismatchError` and `PhaseYearMismatchError` check against.
//
// Amounts are integer cents, so $70,000.00 is `7_000_000`.
//
// NOT covered here, and not built: the individual side of franking (P3-22), the 45-day qualified
// person machinery (P3-22e), when the refund becomes cash (P3-22g), the TTR conversion limb of
// P3-8, and the transfer balance cap (P3-9).
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { conditionOfRelease } from '../dist/core/conditionOfRelease.js';
import {
  MidYearPhaseChangeError,
  PhaseYearMismatchError,
  TrisRetirementPhaseNotModelledError,
  accumulationInterest,
  phaseHeldForTheWholeYear,
  phaseHeldFrom,
  retirementPhaseInterest,
  transitionToRetirementInterest,
} from '../dist/core/superPhase.js';
import {
  COMPLYING_RESIDENT_QUALIFIED_FUND,
  FrankingYearMismatchError,
  NO_SMALL_SHAREHOLDER_RELIEF_FOR_SUPER,
  NonComplyingFundError,
  NonResidentFrankedDistributionError,
  NotAQualifiedPersonError,
  frankedDistributionFromRate,
  frankedDistributionFromStatement,
  frankingInSuper,
} from '../dist/core/superFranking.js';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = join(ROOT, 'src');

/** 61 on 1 July 2026 and still working: a TTR is available, and no Condition of Release is met. */
const AGED_61 = '1965-07-01';
/** 67 on 1 July 2026: released by age alone, so a retirement phase income stream can be stated. */
const AGED_67 = '1959-07-01';

const YEARS = [
  { fy: '2026-27', on: '2026-07-01' },
  { fy: '2027-28', on: '2027-07-01' },
];

const release = (dateOfBirth, on) => conditionOfRelease({ dateOfBirth, on, gainfulEmployment: { ceased: false } });

/** $70,000.00 of frankable distribution — the one cash figure nearly every fixture starts from. */
const D = 7_000_000;

const STATEMENT = { source: 'the fund’s AMMA statement', confidence: 'primary-verified' };
const RATE_SOURCE = { source: 'a Setting: the portfolio’s effective franking rate', confidence: 'primary-verified' };

const derived = (fy, frankingPercentage, payerCorporateTaxRate, frankedAmount = D) =>
  frankedDistributionFromRate({ fy, frankedAmount, frankingPercentage, payerCorporateTaxRate, ...RATE_SOURCE });

const outcome = (fy, interest, distribution, facts = COMPLYING_RESIDENT_QUALIFIED_FUND) =>
  frankingInSuper({ fy, interest, distribution, facts, phaseHeldFor: phaseHeldForTheWholeYear(fy) });

// --- The gross-up: an addition, and the credit computed directly (T43, T44) -----------------------

test('the gross-up adds the credit — it is not a rate applied to the cash', () => {
  // §5A.1, s 207-20(1). $70,000.00 fully franked by a 30% payer:
  //   credit      = 7,000,000 × 0.30/0.70 = 7,000,000 × 3/7 = 3,000,000 cents exactly
  //   grossed up  = 7,000,000 + 3,000,000 = 10,000,000 cents = $100,000.00
  // and 10,000,000 is also 7,000,000 / (1 − 0.30), which is the check §5A.1 offers for f = 1.
  for (const { fy } of YEARS) {
    const distribution = derived(fy, 1, 0.3);
    assert.equal(distribution.frankedAmount, D);
    assert.equal(distribution.frankingCredit, 3_000_000);
    assert.equal(distribution.grossedUpAmount, 10_000_000);
    assert.equal(distribution.grossedUpAmount, distribution.frankedAmount + distribution.frankingCredit);
  }
});

test('T44 — $100,000 fully franked at 30% is a credit of $42,857.14, not $42,857.75', () => {
  // The register's own worked example, and the whole of T44. Computed directly:
  //   10,000,000 × 3/7 = 4,285,714.285714… cents → 4,285,714 cents = $42,857.14
  // Materialising the s 995-1 gross-up rate as 2.3333 and dividing by it instead:
  //   10,000,000 / 2.3333 = 4,285,775.51… cents ≈ $42,857.75, the ATO's published figure —
  // 61 cents adrift on $100,000, whichever way that .51 is rounded.
  const distribution = derived('2026-27', 1, 0.3, 10_000_000);
  assert.equal(distribution.frankingCredit, 4_285_714);
  assert.notEqual(distribution.frankingCredit, 4_285_775);
  assert.notEqual(distribution.frankingCredit, 4_285_776);
  assert.equal(distribution.grossedUpAmount, 14_285_714);

  // The base fixture catches the same mutation 43 cents at a time: 7,000,000 / 2.3333 is
  // 3,000,042.5 cents, against 3,000,000 exact.
  assert.equal(derived('2026-27', 1, 0.3).frankingCredit, 3_000_000);
});

test('the payer’s rate is an input — 25%, 30% and a blended 28% all answer, and none is checked', () => {
  // T43: s 202-60(2) fixes the rate to *the entity making the distribution*, so a diversified
  // holding spans both legislated rates and no portfolio-level rate exists in law. Three rates,
  // three different credits on the same $70,000 — no engine constant can produce all three.
  //   30%: 7,000,000 × 0.30/0.70 = 3,000,000                                   ($30,000.00)
  //   25%: 7,000,000 × 0.25/0.75 = 7,000,000/3 = 2,333,333.33… → 2,333,333     ($23,333.33)
  //   28%: 7,000,000 × 0.28/0.72 = 2,722,222.22… → 2,722,222                   ($27,222.22)
  assert.equal(derived('2026-27', 1, 0.3).frankingCredit, 3_000_000);
  assert.equal(derived('2026-27', 1, 0.25).frankingCredit, 2_333_333);
  assert.equal(derived('2026-27', 1, 0.28).frankingCredit, 2_722_222);

  // The 28% is not a legislated rate and is accepted anyway: validating `r` against 0.25 and 0.30
  // would put both figures in the engine, which is exactly what T43 forbids.
  assert.equal(derived('2026-27', 1, 0.28).grossedUpAmount, 9_722_222);
});

test('a partly franked distribution scales the credit by f, and only the credit', () => {
  // §5A.1, s 203-35 rearranged: credit = f × D × r/(1−r).
  //   f = 0.60: 0.60 × 3,000,000 = 1,800,000 ($18,000.00); grossed up 8,800,000 ($88,000.00)
  //   f = 0.10: 0.10 × 3,000,000 =   300,000  ($3,000.00); grossed up 7,300,000 ($73,000.00)
  //   f = 0:    no credit at all;             grossed up 7,000,000 — the cash, unchanged
  assert.equal(derived('2026-27', 0.6, 0.3).frankingCredit, 1_800_000);
  assert.equal(derived('2026-27', 0.6, 0.3).grossedUpAmount, 8_800_000);
  assert.equal(derived('2026-27', 0.1, 0.3).frankingCredit, 300_000);
  assert.equal(derived('2026-27', 0.1, 0.3).grossedUpAmount, 7_300_000);
  assert.equal(derived('2026-27', 0, 0.3).frankingCredit, 0);
  assert.equal(derived('2026-27', 0, 0.3).grossedUpAmount, D);
});

test('the statement route needs no rate at all, and agrees with the derived one to the cent', () => {
  // T43's preferred route: an AMMA statement reports the franked amount and the credit as two
  // dollar figures, after which grossed_up = franked + credit needs no rate. $70,000 + $30,000.
  const stated = frankedDistributionFromStatement({
    fy: '2026-27',
    frankedAmount: D,
    frankingCredit: 3_000_000,
    ...STATEMENT,
  });
  assert.equal(stated.grossedUpAmount, 10_000_000);
  assert.equal(stated.creditRoute, 'the credit as reported, with no rate used at all');
  assert.equal(stated.frankingCredit, derived('2026-27', 1, 0.3).frankingCredit);

  const interest = accumulationInterest(release(AGED_61, '2026-07-01'));
  assert.equal(outcome('2026-27', interest, stated).refund, outcome('2026-27', interest, derived('2026-27', 1, 0.3)).refund);
});

// --- P3-7b, the headline: Retirement Phase, and T45 --------------------------------------------------

test('T45 — a Retirement Phase fund is refunded the credit IN FULL, and NOT the zero s 207-90 alone gives', () => {
  // §5A.3, and register §9's franking mutation row. The chain: s 207-20(1),(2) grosses up and
  // gives the offset; s 207-90 denies both on exempt income; **s 207-110(2)(b) disapplies s 207-90
  // for the ss 295-385/295-390 exempt current pension income**; s 67-25(1) with s 63-10(1) item 40
  // pays the remainder in cash.
  //
  //   grossed up          10,000,000 ($100,000.00)
  //   earnings tax at 0%           0
  //   offset (s 207-20(2))  3,000,000 ($30,000.00)
  //   refund = offset − tax 3,000,000 ($30,000.00) — the whole credit, in cash
  //   net cash            10,000,000 ($100,000.00) = the grossed-up amount, untaxed
  //
  // Stopping at s 207-90 gives a refund of $0 and net cash of $70,000 — the best case in the
  // model reported as the worst. Both are asserted against explicitly.
  for (const { fy, on } of YEARS) {
    const result = outcome(fy, retirementPhaseInterest(release(AGED_67, on)), derived(fy, 1, 0.3));

    assert.equal(result.earningsTax.rate, 0);
    assert.equal(result.earningsTax.tax, 0);
    assert.equal(result.offset, 3_000_000);
    assert.equal(result.refund, 3_000_000);
    assert.equal(result.taxPayableAfterOffset, 0);
    assert.equal(result.netCash, 10_000_000);

    // The s 207-90-only answer, asserted as *not* produced — every limb of it.
    assert.notEqual(result.refund, 0);
    assert.notEqual(result.offset, 0);
    assert.notEqual(result.netCash, D);
    assert.equal(result.refund, result.distribution.frankingCredit);

    // And a 0% rate did not multiply the credit away: the rate applies to the income, not the offset.
    assert.equal(result.earningsTax.rate * result.offset, 0);
    assert.notEqual(result.refund, result.earningsTax.rate * result.offset);
  }
});

test('the chain records that s 207-90 was reached and then disapplied, not skipped', () => {
  const result = outcome('2026-27', retirementPhaseInterest(release(AGED_67, '2026-07-01')), derived('2026-27', 1, 0.3));
  const chain = result.chain.join('\n');
  assert.match(chain, /s 207-20\(1\)/);
  assert.match(chain, /s 207-90: denies/);
  assert.match(chain, /s 207-110\(2\)\(b\), Subdiv 207-E: disapplies s 207-90/);
  assert.match(chain, /s 63-10\(1\) item 40/);
  // s 207-90 must come before its exception, and the refund provision after both.
  const at = (needle) => result.chain.findIndex((line) => line.includes(needle));
  assert.ok(at('s 207-90: denies') < at('s 207-110(2)(b)'));
  assert.ok(at('s 207-110(2)(b)') < at('s 63-10(1) item 40'));
});

// --- P3-7a: Accumulation Phase, and a TTR pension with it ---------------------------------------------

test('Accumulation Phase — the credit offsets the 15% and the EXCESS is refunded in cash', () => {
  // §5A.3: the credit offsets the 15% liability and any excess is refunded. Because 30% > 15%, a
  // fully franked distribution always leaves a refund.
  //   grossed up            10,000,000 ($100,000.00)
  //   earnings tax at 15%    1,500,000  ($15,000.00)   = 10,000,000 × 0.15
  //   offset                 3,000,000  ($30,000.00)
  //   refund                 1,500,000  ($15,000.00)   = 3,000,000 − 1,500,000
  //   tax still payable              0
  //   net cash               8,500,000  ($85,000.00)   = 7,000,000 + 1,500,000
  for (const { fy, on } of YEARS) {
    const result = outcome(fy, accumulationInterest(release(AGED_61, on)), derived(fy, 1, 0.3));

    assert.equal(result.earningsTax.rate, 0.15);
    assert.equal(result.earningsTax.tax, 1_500_000);
    assert.equal(result.offset, 3_000_000);
    assert.equal(result.refund, 1_500_000);
    assert.equal(result.taxPayableAfterOffset, 0);
    assert.equal(result.netCash, 8_500_000);

    // Offsetting without refunding the excess (T46) would report $0 here, and would delete the
    // entire franking benefit of an accumulation account.
    assert.notEqual(result.refund, 0);
  }
});

test('Accumulation and Retirement differ by exactly the 15%, and by nothing else (T46)', () => {
  // Refundability is *equal* on both sides of the phase line, so the whole difference between the
  // two phases is the rate on the grossed-up amount: 15% of $100,000.00 = $15,000.00.
  //   Retirement net cash   10,000,000
  //   Accumulation net cash  8,500,000
  //   difference             1,500,000 = 0.15 × 10,000,000
  const fy = '2026-27';
  const on = '2026-07-01';
  const distribution = derived(fy, 1, 0.3);
  const retirement = outcome(fy, retirementPhaseInterest(release(AGED_67, on)), distribution);
  const accumulation = outcome(fy, accumulationInterest(release(AGED_61, on)), distribution);

  assert.equal(retirement.netCash - accumulation.netCash, 1_500_000);
  assert.equal(retirement.refund - accumulation.refund, 1_500_000);
  // The offset itself is identical — the phase never touches it. That is s 207-110's whole effect.
  assert.equal(retirement.offset, accumulation.offset);
});

test('a TTR pension is treated as Accumulation Phase — 15%, and NOT the full refund', () => {
  // Inherited from `superPhase.ts` rather than re-decided here: `transitionToRetirementInterest`
  // returns an `AccumulationInterest`, so there is no way to route a TRIS to the 0% rate that
  // survives `tsc`. This module never reads a phase at all. The consequence, to the cent:
  //   TTR refund       1,500,000 ($15,000.00) — the excess only
  //   Retirement refund 3,000,000 ($30,000.00) — the lot
  // and the $15,000 gap between them is the whole value of *not* being on a TTR.
  for (const { fy, on } of YEARS) {
    const ttr = transitionToRetirementInterest(release(AGED_61, on));
    assert.equal(ttr.phase, 'accumulation');
    assert.equal(ttr.incomeStream, 'a transition to retirement income stream');

    const result = outcome(fy, ttr, derived(fy, 1, 0.3));
    assert.equal(result.earningsTax.rate, 0.15);
    assert.equal(result.refund, 1_500_000);
    assert.notEqual(result.refund, 3_000_000);
    assert.equal(result.netCash, 8_500_000);

    // To the cent, the same answer an accumulation account gets on the same distribution.
    const plain = outcome(fy, accumulationInterest(release(AGED_61, on)), derived(fy, 1, 0.3));
    assert.equal(result.refund, plain.refund);
    assert.equal(result.netCash, plain.netCash);
  }
});

test('a partly franked distribution in Accumulation Phase — refund, then payable', () => {
  // f = 0.60, payer at 30%:
  //   grossed up   8,800,000 ($88,000.00); tax 8,800,000 × 0.15 = 1,320,000 ($13,200.00)
  //   offset       1,800,000 ($18,000.00); refund 1,800,000 − 1,320,000 = 480,000 ($4,800.00)
  //   net cash     7,000,000 + 480,000 = 7,480,000 ($74,800.00)
  const acc60 = outcome('2026-27', accumulationInterest(release(AGED_61, '2026-07-01')), derived('2026-27', 0.6, 0.3));
  assert.equal(acc60.earningsTax.tax, 1_320_000);
  assert.equal(acc60.offset, 1_800_000);
  assert.equal(acc60.refund, 480_000);
  assert.equal(acc60.taxPayableAfterOffset, 0);
  assert.equal(acc60.netCash, 7_480_000);

  // f = 0.10, payer at 30% — the direction that is *not* a refund. §5A.3's "a fully franked
  // distribution produces a net refund" is about a *fully* franked one; a lightly franked one
  // leaves tax to pay, and both directions are computed rather than one being floored away.
  //   grossed up   7,300,000 ($73,000.00); tax 7,300,000 × 0.15 = 1,095,000 ($10,950.00)
  //   offset         300,000  ($3,000.00); payable 1,095,000 − 300,000 = 795,000 ($7,950.00)
  //   net cash     7,000,000 − 795,000 = 6,205,000 ($62,050.00)
  const acc10 = outcome('2026-27', accumulationInterest(release(AGED_61, '2026-07-01')), derived('2026-27', 0.1, 0.3));
  assert.equal(acc10.earningsTax.tax, 1_095_000);
  assert.equal(acc10.offset, 300_000);
  assert.equal(acc10.refund, 0);
  assert.equal(acc10.taxPayableAfterOffset, 795_000);
  assert.equal(acc10.netCash, 6_205_000);

  // The same $7,000 cash in Retirement Phase is refunded the whole $3,000 and pays nothing.
  const ret10 = outcome('2026-27', retirementPhaseInterest(release(AGED_67, '2026-07-01')), derived('2026-27', 0.1, 0.3));
  assert.equal(ret10.refund, 300_000);
  assert.equal(ret10.taxPayableAfterOffset, 0);
  assert.equal(ret10.netCash, 7_300_000);
});

test('a 25% base rate entity payer, both phases, and where the rounding happens', () => {
  // §5A.1: 100% franking means 100% of the *payer's own* maximum — 1/3 per $1 cash at 25%.
  //   credit      7,000,000 × (0.25/0.75) = 2,333,333.33… → 2,333,333 ($23,333.33)  ← rounded here
  //   grossed up  7,000,000 + 2,333,333   = 9,333,333 ($93,333.33)
  //   Accumulation tax 9,333,333 × 0.15 = 1,399,999.95 → 1,400,000 ($14,000.00)     ← and here
  //   Accumulation refund 2,333,333 − 1,400,000 = 933,333 ($9,333.33)
  //   Retirement   tax 0, refund 2,333,333 in full
  // Two roundings, both `mulCents`, both to the whole cent, half away from zero. Nothing else in
  // the module rounds: the gross-up and the offset are additions and subtractions of whole cents.
  const distribution = derived('2026-27', 1, 0.25);
  assert.equal(distribution.frankingCredit, 2_333_333);
  assert.equal(distribution.grossedUpAmount, 9_333_333);

  const accumulation = outcome('2026-27', accumulationInterest(release(AGED_61, '2026-07-01')), distribution);
  assert.equal(accumulation.earningsTax.tax, 1_400_000);
  assert.equal(accumulation.refund, 933_333);
  assert.equal(accumulation.netCash, 7_933_333);

  const retirement = outcome('2026-27', retirementPhaseInterest(release(AGED_67, '2026-07-01')), distribution);
  assert.equal(retirement.refund, 2_333_333);
  assert.equal(retirement.netCash, 9_333_333);
  assert.notEqual(retirement.refund, 0);
});

test('nothing here varies by financial year, and that is an invariance rather than a fixture', () => {
  // `f × D × r/(1−r)` contains no year: `r` is a caller-supplied input, not an indexed figure, and
  // both phase rates are `everyYear: true` constants. So the equality below is structural — no
  // year in the Planning Horizon could make these differ, and no fixture could show one. The year
  // is still load-bearing for the two mismatch refusals below.
  const [first, second] = YEARS;
  const refundIn = (year, dateOfBirth, phase) =>
    outcome(year.fy, phase(release(dateOfBirth, year.on)), derived(year.fy, 1, 0.3)).refund;

  assert.equal(refundIn(first, AGED_67, retirementPhaseInterest), refundIn(second, AGED_67, retirementPhaseInterest));
  assert.equal(refundIn(first, AGED_61, accumulationInterest), refundIn(second, AGED_61, accumulationInterest));
  assert.equal(derived(first.fy, 1, 0.3).frankingCredit, derived(second.fy, 1, 0.3).frankingCredit);
});

// --- What is refused rather than answered with a nil credit -------------------------------------------

test('T49 / O27 — a fund that is not a qualified person is refused, at ANY credit level', () => {
  // §5A.4: s 207-110 disapplies ss 207-90 and 207-95 only, so exempt current pension income is no
  // shelter from the Subdiv 207-F denials. §5A.6: the individual's $5,000 small shareholder relief
  // is not available to a complying fund — and that conclusion is *inferred* from the words "the
  // taxpayer is an individual", not stated in terms (register O27). So the refusal does not soften
  // below $5,000, and there is no dollar figure at which it stops.
  const notQualified = { complyingFund: true, australianResident: true, qualifiedPerson: false };
  const interest = retirementPhaseInterest(release(AGED_67, '2026-07-01'));

  for (const credit of [400_000, 500_000, 500_001, 3_000_000]) {
    const distribution = frankedDistributionFromStatement({
      fy: '2026-27',
      frankedAmount: D,
      frankingCredit: credit,
      ...STATEMENT,
    });
    assert.throws(
      () => frankingInSuper({ fy: '2026-27', interest, distribution, facts: notQualified, phaseHeldFor: phaseHeldForTheWholeYear('2026-27') }),
      NotAQualifiedPersonError,
      `${credit} cents of credit must be refused just the same`,
    );
  }
});

test('the O27 inference rides with the refusal at its own epistemic status', () => {
  // It must never be laundered to a bare `primary-verified`: the statutory text is primary, the
  // negative conclusion for a fund is inferential, and the label has to say so where it is read.
  assert.equal(NO_SMALL_SHAREHOLDER_RELIEF_FOR_SUPER.confidence, 'secondary-only');
  assert.notEqual(NO_SMALL_SHAREHOLDER_RELIEF_FOR_SUPER.confidence, 'primary-verified');
  assert.match(NO_SMALL_SHAREHOLDER_RELIEF_FOR_SUPER.source, /160APHT\(1\)\(a\)/);
  assert.match(NO_SMALL_SHAREHOLDER_RELIEF_FOR_SUPER.source, /the taxpayer is an individual/);
  assert.match(NO_SMALL_SHAREHOLDER_RELIEF_FOR_SUPER.registerSection, /O27/);

  const thrown = () =>
    frankingInSuper({
      fy: '2026-27',
      interest: accumulationInterest(release(AGED_61, '2026-07-01')),
      distribution: derived('2026-27', 1, 0.3),
      facts: { complyingFund: true, australianResident: true, qualifiedPerson: false },
      phaseHeldFor: phaseHeldForTheWholeYear('2026-27'),
    });
  assert.throws(thrown, /inferred from statutory structure, not stated in terms/);
  assert.throws(thrown, /secondary-only/);
  assert.throws(thrown, /no shelter from the Subdivision 207-F denials/);
  // And the refusal says why it is a refusal and not a zero — the T45 reading is the reason.
  assert.throws(thrown, /indistinguishable from the T45 mistake/);
});

test('a non-complying fund and a non-resident are refused, each on its own ground', () => {
  const interest = accumulationInterest(release(AGED_61, '2026-07-01'));
  const distribution = derived('2026-27', 1, 0.3);
  const run = (facts) => () => frankingInSuper({ fy: '2026-27', interest, distribution, facts, phaseHeldFor: phaseHeldForTheWholeYear('2026-27') });

  // s 67-25(1A): excess credits are not refundable, so answering one distribution on its own stops
  // being exact — there is a floor at nil for the remainder to pile up behind.
  assert.throws(run({ complyingFund: false, australianResident: true, qualifiedPerson: true }), NonComplyingFundError);
  assert.throws(run({ complyingFund: false, australianResident: true, qualifiedPerson: true }), /67-25\(1A\)/);

  // ss 128B(3)(ga), 128D make it NANE, and s 207-90(1)(c) denies both outright: the one route on
  // which s 207-90 really is the end of the chain.
  assert.throws(run({ complyingFund: true, australianResident: false, qualifiedPerson: true }), NonResidentFrankedDistributionError);
  assert.throws(run({ complyingFund: true, australianResident: false, qualifiedPerson: true }), /207-90\(1\)\(c\)/);

  // And the Household's fund, stated as all three, answers.
  assert.equal(run(COMPLYING_RESIDENT_QUALIFIED_FUND)().refund, 1_500_000);
  assert.deepEqual(Object.keys(COMPLYING_RESIDENT_QUALIFIED_FUND).sort(), [
    'australianResident',
    'complyingFund',
    'qualifiedPerson',
  ]);
});

test('a distribution from one year cannot be set against another year’s liability', () => {
  const interest = accumulationInterest(release(AGED_61, '2026-07-01'));
  assert.throws(
    () =>
      frankingInSuper({
        fy: '2026-27',
        interest,
        distribution: derived('2027-28', 1, 0.3),
        facts: COMPLYING_RESIDENT_QUALIFIED_FUND,
        phaseHeldFor: phaseHeldForTheWholeYear('2026-27'),
      }),
    FrankingYearMismatchError,
  );
});

test('the conversion year charges the grossed-up income at the bound, and still refunds the credit', () => {
  // R10 step 3 reaching this module through the one call it makes. A $70,000.00 fully franked
  // distribution from a 30% payer: credit $30,000.00, grossed-up $100,000.00 (§5A.3's arithmetic,
  // and the same figures as the fixtures above).
  //
  // Alex converts on 14 December, so FY2026-27 is a part year: 199 of 365 days. The grossed-up
  // $100,000.00 is charged at the ACCUMULATION row — $100,000.00 × 0.15 = $15,000.00 — not at the
  // 0% the interest's stated phase would give, and the offset is untouched by any of it
  // (s 207-110(2)(b)).
  //
  //   refund  = 30,000.00 − 15,000.00 = $15,000.00
  //   netCash = 70,000.00 + 15,000.00 −      0.00 = $85,000.00
  //
  // Whole-year Retirement Phase on the same distribution is $0.00 of tax and the whole $30,000.00
  // back, for $100,000.00 of net cash — so the bound costs the household $15,000.00 here, in the
  // conservative direction, and says so.
  const interest = retirementPhaseInterest(release(AGED_67, '2026-07-01'));
  const distribution = derived('2026-27', 1, 0.3);
  const bounded = frankingInSuper({
    fy: '2026-27',
    interest,
    distribution,
    facts: COMPLYING_RESIDENT_QUALIFIED_FUND,
    phaseHeldFor: phaseHeldFrom('2026-27', '2026-12-14'),
  });
  assert.equal(bounded.earningsTax.tax, 1_500_000);
  assert.equal(bounded.earningsTax.chargedAs, 'accumulation');
  assert.equal(bounded.offset, 3_000_000);
  assert.equal(bounded.refund, 1_500_000);
  assert.equal(bounded.taxPayableAfterOffset, 0);
  assert.equal(bounded.netCash, 8_500_000);
  // The disclosure survives the merge into the franking result, exactly as the cap caveat does.
  assert.ok(bounded.provenance.caveats.some((line) => /proven upper bound/.test(line)));

  const wholeYear = outcome('2026-27', interest, distribution);
  assert.equal(wholeYear.earningsTax.tax, 0);
  assert.equal(wholeYear.refund, 3_000_000);
  assert.equal(wholeYear.netCash, 10_000_000);
  assert.ok(wholeYear.netCash > bounded.netCash); // the bound understates the household, by design
  assert.ok(!wholeYear.provenance.caveats.some((line) => /proven upper bound/.test(line)));
});

test('the phase model’s own refusals are inherited, not re-implemented', () => {
  // A phase fraction counted in another year, a phase stated in a different year, and a TRIS held
  // by a Person who has already met a Condition of Release: all three arrive from `superPhase.ts`.
  // `MidYearPhaseChangeError` is the narrowed one (R10): a part year is no longer refused here or
  // anywhere, it is charged at the bound — see the fixture below.
  const interest = retirementPhaseInterest(release(AGED_67, '2026-07-01'));
  assert.throws(
    () =>
      frankingInSuper({
        fy: '2026-27',
        interest,
        distribution: derived('2026-27', 1, 0.3),
        facts: COMPLYING_RESIDENT_QUALIFIED_FUND,
        phaseHeldFor: phaseHeldForTheWholeYear('2027-28'),
      }),
    MidYearPhaseChangeError,
  );
  assert.throws(
    () => outcome('2027-28', interest, derived('2027-28', 1, 0.3)),
    PhaseYearMismatchError,
  );
  assert.throws(() => transitionToRetirementInterest(release(AGED_67, '2026-07-01')), TrisRetirementPhaseNotModelledError);
});

test('malformed inputs are refused rather than clamped', () => {
  const bad = (frankingPercentage, payerCorporateTaxRate) =>
    () => derived('2026-27', frankingPercentage, payerCorporateTaxRate);
  // s 203-35(2) takes anything above 100% to be 100%, but 60 supplied for 0.6 is far likelier.
  assert.throws(bad(60, 0.3), /franking percentage is a fraction between 0 and 1/);
  assert.throws(bad(-0.1, 0.3), RangeError);
  // r = 1 has no r/(1−r); r = 0 attaches no credit and is a rate that does not exist.
  assert.throws(bad(1, 1), /strictly between 0 and 1/);
  assert.throws(bad(1, 0), /strictly between 0 and 1/);
  assert.throws(() => derived('2026-27', 1, 0.3, 1.5), /whole number of cents/);
  assert.throws(
    () => frankedDistributionFromStatement({ fy: '2026-27', frankedAmount: D, frankingCredit: -1, ...STATEMENT }),
    /whole number of cents/,
  );
});

// --- Provenance -----------------------------------------------------------------------------------------

test('the transfer balance cap caveat survives into every Retirement Phase franking result', () => {
  // It is more load-bearing here than in `superPhase.ts`, not less: a mis-stated Retirement Phase
  // balance now escapes 15% of the *grossed-up* amount rather than 15% of the cash, so the same
  // misstatement costs 1/(1−r) times as much — about 43% more at the 30% rate.
  const result = outcome('2026-27', retirementPhaseInterest(release(AGED_67, '2026-07-01')), derived('2026-27', 1, 0.3));
  assert.equal(result.provenance.confidence, 'primary-verified');
  assert.ok(result.provenance.caveats.some((line) => /transfer balance cap/.test(line)));
  // The caveat's ground was corrected when register §3.10 landed: the cap is now SPECIFIED and
  // still not implemented, which is a different sentence from "not modelled (P3-9)". What must
  // survive into this result is the warning, not the superseded reason.
  assert.ok(result.provenance.caveats.some((line) => /no amount here has been checked against any cap/.test(line)));
  // Corrected again 2026-09-16 (P3-9 chunk 6-4): the cap IS now built and is still not wired to
  // anything this file computes. The superseded sentence survives exactly once, inside its note.
  assert.ok(result.provenance.caveats.some((line) => /What is missing is the WIRING/.test(line)));
  assert.ok(
    result.provenance.caveats.some(
      (line) => [...line.matchAll(/the P3-9 build has not happened/g)].length === 1 && /Corrected 2026-09-16/.test(line),
    ),
  );
  assert.ok(!result.provenance.caveats.some((line) => /entry test is not in the register/.test(line)));

  // The qualified person assumption is stated on every result, per §5A.4 / P3-22e, and it carries
  // the O27 inference's status with it rather than asserting the conclusion flatly.
  assert.ok(result.provenance.caveats.some((line) => /45-day holding rule is not counted/.test(line)));
  assert.ok(result.provenance.caveats.some((line) => /inferred from statutory structure, not stated in terms/.test(line)));

  // Accumulation Phase carries the qualification caveat but no cap caveat: no cap gates it.
  const accumulation = outcome('2026-27', accumulationInterest(release(AGED_61, '2026-07-01')), derived('2026-27', 1, 0.3));
  assert.ok(!accumulation.provenance.caveats.some((line) => /transfer balance cap/.test(line)));
  assert.ok(accumulation.provenance.caveats.some((line) => /45-day holding rule is not counted/.test(line)));
});

test('a forecast franking rate weakens every figure derived from it, and says so', () => {
  // The rate is a Setting (T43, P3-22h), so a Household supplying a forecast gets a result that
  // arrives labelled as a forecast. `mergeProvenance` does that; no confidence string is rebuilt.
  const forecast = frankedDistributionFromRate({
    fy: '2026-27',
    frankedAmount: D,
    frankingPercentage: 1,
    payerCorporateTaxRate: 0.28,
    source: 'a Setting: the portfolio’s effective franking rate',
    confidence: 'unverified',
  });
  assert.equal(forecast.provenance.confidence, 'unverified');

  const result = outcome('2026-27', retirementPhaseInterest(release(AGED_67, '2026-07-01')), forecast);
  assert.equal(result.provenance.confidence, 'unverified');
  assert.ok(result.provenance.caveats.some((line) => /corporate tax rate for imputation purposes is unverified/.test(line)));
  assert.ok(result.provenance.caveats.some((line) => /no portfolio-level rate in law/.test(line)));
  // …and the cap caveat is not lost when the weaker confidence arrives.
  assert.ok(result.provenance.caveats.some((line) => /transfer balance cap/.test(line)));

  // The statement route makes no rate claim at all, so it does not carry the rate's caveat.
  const stated = frankedDistributionFromStatement({ fy: '2026-27', frankedAmount: D, frankingCredit: 3_000_000, ...STATEMENT });
  assert.equal(stated.provenance.confidence, 'primary-verified');
  assert.ok(!stated.provenance.caveats.some((line) => /no portfolio-level rate in law/.test(line)));
  assert.ok(stated.provenance.caveats.some((line) => /not derived from any rate/.test(line)));
});

test('every result and every distribution is frozen', () => {
  const result = outcome('2026-27', accumulationInterest(release(AGED_61, '2026-07-01')), derived('2026-27', 1, 0.3));
  assert.throws(() => {
    result.refund = 0;
  }, TypeError);
  assert.throws(() => {
    result.distribution.frankingCredit = 0;
  }, TypeError);
});

// --- The structural defences, asserted against the source ---------------------------------------------------

/** Comments and strings quote the statute on purpose; the greps below are about the *code*. */
const executableCode = (text) =>
  text
    .replaceAll(/\/\*[\s\S]*?\*\//g, '')
    .replaceAll(/`(?:[^`\\]|\\.)*`|'(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*"|\/\/.*$/gm, (match) =>
      match.startsWith('//') ? '' : '""',
    );

const RAW = readFileSync(join(SRC, 'core', 'superFranking.ts'), 'utf8');
const CODE = executableCode(RAW);

test('the source grep is not vacuous — stripping leaves the executable code behind', () => {
  assert.match(CODE, /\bexport const frankingInSuper\b/);
  assert.match(CODE, /\bexport const frankedDistributionFromRate\b/);
  assert.ok(CODE.length > 500);
  assert.match(executableCode("const x = 0.15; // 15%\nconst y = 0;"), /0\.15/);
});

test('MUTATION — s 207-90 has nothing to deny: the offset is the credit, unconditionally', () => {
  // The defence against "apply s 207-90 without reaching s 207-110" is that the correct code has
  // **no exemption branch at all** — s 207-110 makes exempt current pension income a non-event for
  // the offset, so the mutation cannot be written by flipping a condition; it has to add one.
  // There is exactly one assignment to `offset`, it is unconditional, and it is the credit.
  const assignments = [...CODE.matchAll(/\bconst offset = ([^;]*);/g)].map(([, expression]) => expression.trim());
  assert.deepEqual(assignments, ['distribution.frankingCredit']);
  assert.doesNotMatch(CODE, /offset\s*=\s*[^;]*\?/); // no ternary anywhere on the offset
  assert.equal([...CODE.matchAll(/\boffset\s*=/g)].length, 1);

  // And the refund is the offset less the liability, never the offset scaled by anything.
  assert.match(CODE, /const refund = offset > liability \? subCents\(offset, liability\) : toCents\(0\)/);
  assert.match(CODE, /const taxPayableAfterOffset = liability > offset \? subCents\(liability, offset\) : toCents\(0\)/);
});

test('MUTATION — TTR cannot be treated as Retirement Phase here, because phase never arrives', () => {
  // Inherited from `superPhase.ts` rather than re-asserted: this module has no opinion about
  // phase at all. It never reads `.phase`, never names either phase, and reaches the rate through
  // exactly one call. Writing "if the interest is in Retirement Phase…" means first giving this
  // file a way to find out, and a TRIS is an `AccumulationInterest` at the type level anyway.
  assert.doesNotMatch(CODE, /\.phase\b/);
  assert.doesNotMatch(CODE, /'retirement'|'accumulation'|"retirement"|"accumulation"/);
  assert.doesNotMatch(CODE, /\bTTR\b|transitionToRetirement|retirementPhaseInterest|accumulationInterest/);
  assert.doesNotMatch(CODE, /\bEarningsPhase\b/);
  assert.equal([...CODE.matchAll(/fundEarningsTax\(/g)].length, 1);
  // The tax is on the grossed-up amount, not on the cash — T44's other half.
  assert.match(CODE, /taxableEarnings: distribution\.grossedUpAmount/);
});

test('MUTATION — the individual’s $5,000 relief cannot be applied here: no amount reaches the gate', () => {
  // §5A.6 / O27, made structural. The qualified person gate is decided by `FundFrankingFacts`
  // alone — three booleans — and the function that applies it is given no dollar figure at all, so
  // "…unless the credits are $5,000 or less" cannot be written without first adding a parameter
  // for the amount to arrive through.
  assert.match(CODE, /const refuseDeniedDistributions = \(fy: FinancialYear, facts: FundFrankingFacts\): void =>/);
  const facts = /export interface FundFrankingFacts \{([\s\S]*?)\n\}/.exec(CODE)?.[1] ?? '';
  assert.deepEqual([...facts.matchAll(/readonly (\w+): (\w+);/g)].map(([, key, type]) => `${key}:${type}`), [
    'complyingFund:boolean',
    'australianResident:boolean',
    'qualifiedPerson:boolean',
  ]);
  assert.doesNotMatch(CODE, /5[_,]?000/);
  assert.doesNotMatch(CODE, /smallShareholder|isIndividual|creditsUnder/i);
  // The gate runs before anything is computed, so no partial answer escapes a denied distribution.
  assert.match(CODE, /refuseDeniedDistributions\(fy, facts\);[\s\S]*?fundEarningsTax\(/);
});

test('MUTATION — no rate and no dollar figure is written in this file', () => {
  // T43: there is no portfolio-level gross-up rate in law, so there is none here. The only numeric
  // literals in executable code are 0 and 1, and both are bounds on a supplied rate.
  // `\.\d+` is not decoration: a rate written `.3` rather than `0.3` has no leading digit, so a
  // pattern anchored on one is blind to it. Measured 2026-09-15 — `.3` planted in this module
  // failed zero tests of 627, here and in `assumptions-franking.test.mjs`.
  const literals = [...CODE.matchAll(/(?<![\w.])(?:\d[\d_]*(?:\.\d+)?|\.\d+)/g)].map(([match]) => match);
  assert.deepEqual([...new Set(literals)].sort(), ['0', '1']);
  for (const forbidden of [/\b0\.15\b/, /\b0\.25\b/, /\b0\.30?\b/, /\b2\.3333\b/, /\b3 \/ 7\b/, /\b15\b/, /\b25\b/, /\b30\b/]) {
    assert.doesNotMatch(CODE, forbidden, `${forbidden} must be supplied, never written`);
  }
  // No assumption record is read here at all: the two phase rates arrive through `superPhase.ts`.
  assert.doesNotMatch(RAW, /assumptions\/super\.js/);
  assert.doesNotMatch(CODE, /SUPERANNUATION/);
});

test('MUTATION — the credit is computed directly, with no gross-up rate materialised', () => {
  // T44. `f × D × r/(1−r)`, formed at full double precision and applied once. Nothing divides by a
  // gross-up rate, and there is no `(1 − r) / r` anywhere for a 2.3333 to be rounded out of.
  assert.match(CODE, /mulCents\(input\.frankedAmount, \(f \* r\) \/ \(1 - r\)\)/);
  assert.doesNotMatch(CODE, /grossUpRate|GROSS_UP_RATE/);
  assert.doesNotMatch(CODE, /\(1 - r\) \/ r/);
  assert.equal([...CODE.matchAll(/mulCents\(/g)].length, 1); // one product, therefore one rounding
  // The rate is validated as a rate and not against the two legislated figures.
  assert.match(CODE, /r <= 0 \|\| r >= 1/);
});

test('the module is the only consumer of its own exports, and imports nothing it should not', () => {
  // core/ only, no assumptions module, and `superPhase.ts` is the single route to a phase rate.
  const imports = [...RAW.matchAll(/from '([^']+)'/g)].map(([, specifier]) => specifier).sort();
  assert.deepEqual([...new Set(imports)], [
    '../data/assumptions/types.js',
    './money.js',
    './provenance.js',
    './superPhase.js',
  ]);
});
