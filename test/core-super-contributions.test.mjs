// P3-3a — the Superannuation Guarantee. Register §3.5, traps T17 and T18.
//
// Every expected figure below is hand-worked from the register and the working is written out
// beside it. Nothing here was produced by running the implementation and pasting the output: an
// expectation generated that way proves only that the code agrees with itself.
//
// **Every year-varying fixture runs at least two financial years.** The SG charge percentage is a
// flat legislated 12 with no forward schedule (register O4), so the *rate* cannot vary between
// years and a test on the rate alone is blind by construction. What does vary is the maximum
// contributions base, because it is derived from the concessional cap and the cap indexes — so
// FY2026-27 and FY2027-28 have different ceilings ($270,830 and $291,660) and a hard-coded
// FY2026-27 figure cannot survive both. The year the charge percentage is *stamped* for is
// visible in the provenance, which is the other half of the same defence.
//
// NOT covered here, and not built: salary sacrifice as a contribution, personal deductible
// contributions, the 15% contributions tax, applying any of it against the caps, and Division 293.
// Salary sacrifice appears only as a limb of the SG earnings base, which is what T17 is about.
import test from 'node:test';
import assert from 'node:assert/strict';

import { toCents } from '../dist/core/money.js';
import { SUPERANNUATION } from '../dist/data/assumptions/index.js';
import { MissingIndexNumberError, decemberQuarterIndex } from '../dist/core/superCaps.js';
import {
  DuplicateEmployerError,
  SuperGuaranteeEarningsBaseError,
  maximumContributionsBaseFor,
  qualifyingEarnings,
  superGuarantee,
} from '../dist/core/superContributions.js';

const sg = SUPERANNUATION.superGuarantee;

// ATO Table 40 — AWOTE for the December quarter (register §3.2). Dec 2025 drives FY2026-27.
const AWOTE_DEC_2025 = 2_051.1;

// SYNTHETIC. Not an AWOTE figure and not a forecast of one — the December 2026 quarter has not
// been published, and register O5 makes the forward series a Setting, not an assumption. Carried
// as `unverified` so anything computed from it arrives saying so. It exists to give the suite a
// second financial year in which the maximum contributions base is a different number.
const AWOTE_SYNTHETIC_DEC_2026 = 2_200.0;

const awote = (fy, indexNumber, confidence, source) =>
  decemberQuarterIndex({ index: 'AWOTE', fy, indexNumber, confidence, source });

const INDEX_NUMBERS = [
  awote('2026-27', AWOTE_DEC_2025, 'primary-verified', 'ATO Table 40 — AWOTE Dec 2025'),
  awote('2027-28', AWOTE_SYNTHETIC_DEC_2026, 'unverified', 'synthetic test driver — not published'),
];

/** Qualifying earnings of `paid` cash plus `sacrificed`, with no unenumerated remainder. */
const earnings = (paid, sacrificed) =>
  qualifyingEarnings({
    earningsPaidToThePerson: toCents(paid),
    salarySacrificedAmounts: toCents(sacrificed),
    otherQualifyingEarnings: toCents(0),
  });

const job = (employer, paid, sacrificed) => ({ employer, qualifyingEarnings: earnings(paid, sacrificed) });

// --- Qualifying earnings: the sacrificed amount is added, never deducted (T17) -------------------

test('SGAA ss 10A(1)(h), 10A(4)(b) — a sacrificed amount is itself qualifying earnings', () => {
  // $150,000 paid + $20,000 sacrificed = $170,000 of qualifying earnings. The payslip gross is
  // $150,000; the SG base is not.
  assert.equal(earnings(150_000, 20_000), toCents(170_000));

  // The same total package, sacrificed and not, is the same base.
  assert.equal(earnings(170_000, 0), earnings(150_000, 20_000));

  // The unenumerated remainder (register O19) adds, like everything else.
  assert.equal(
    qualifyingEarnings({
      earningsPaidToThePerson: toCents(150_000),
      salarySacrificedAmounts: toCents(20_000),
      otherQualifyingEarnings: toCents(5_000),
    }),
    toCents(175_000),
  );
});

test('no component of qualifying earnings may be negative — subtraction has no way in', () => {
  assert.throws(() => earnings(150_000, -20_000), RangeError);
  assert.throws(() => earnings(-1, 0), RangeError);
  assert.throws(
    () =>
      qualifyingEarnings({
        earningsPaidToThePerson: toCents(150_000),
        salarySacrificedAmounts: toCents(0),
        otherQualifyingEarnings: toCents(-1),
      }),
    RangeError,
  );
});

test('the register still says the base is qualifying earnings and that sacrifice is part of it', () => {
  // The module's type shape is built on both of these. They are read, not assumed.
  assert.equal(sg.earningsBase.value, 'qualifying earnings');
  assert.equal(sg.salarySacrificeIsQualifyingEarnings.value, true);
  assert.equal(sg.chargePercentage.value, 12);
});

// --- The maximum contributions base: annual, per employer, and it moves (T18) --------------------

test('§3.5 — the maximum contributions base over FY2026-27 and FY2027-28', () => {
  // FY2026-27. The concessional cap is $32,500 (§3.2: 2,051.10 / 1,533.40 → 1.338; 25,000 × 1.338
  // = 33,450; floor to $2,500 → $32,500). s 10A(5): 32,500 × 100 ÷ 12 = 270,833.33…; floor to $10
  // → $270,830 — the figure the register publishes and ATO Table 23 carries.
  const y1 = maximumContributionsBaseFor('2026-27', INDEX_NUMBERS);
  assert.equal(y1.amount, toCents(270_830));
  assert.equal(y1.amount, sg.maximumContributionsBase.value);

  // FY2027-28 on the synthetic driver. The concessional cap is $35,000 (2,200.00 / 1,533.40 =
  // 1.434720… → 1.435; 25,000 × 1.435 = 35,875; floor to $2,500 → $35,000). s 10A(5):
  // 35,000 × 100 ÷ 12 = 291,666.66…; floor to $10 → $291,660.
  const y2 = maximumContributionsBaseFor('2027-28', INDEX_NUMBERS);
  assert.equal(y2.amount, toCents(291_660));

  // The ceiling is not a constant. A model holding $270,830 answers the first year and no other.
  assert.notEqual(y1.amount, y2.amount);
});

test('T18 — the period is the financial year, per employer, in the register\'s own words', () => {
  assert.equal(maximumContributionsBaseFor('2026-27', INDEX_NUMBERS).period, 'financial year, per employer');
  assert.equal(sg.maximumContributionsBasePeriod.value, 'financial year, per employer');

  // The pre-1 Jul 2026 construct was $62,500 per **quarter** — $250,000 across four quarters, a
  // different number from $270,830 and a different shape. Neither figure is in the assumptions
  // layer, and nothing in the module can produce them.
  assert.notEqual(maximumContributionsBaseFor('2026-27', INDEX_NUMBERS).amount, toCents(250_000));
});

test('a year with no AWOTE index number refuses rather than reusing last year\'s ceiling', () => {
  assert.throws(() => maximumContributionsBaseFor('2028-29', INDEX_NUMBERS), MissingIndexNumberError);
  assert.throws(() => maximumContributionsBaseFor('2027-28'), MissingIndexNumberError);
});

// --- The charge, below the ceiling ---------------------------------------------------------------

test('T17 — sacrificing salary does not reduce the SG, in either year', () => {
  // FY2026-27. $150,000 paid + $20,000 sacrificed = $170,000, under the $270,830 ceiling.
  // 170,000 × 12% = $20,400. Computing on the $150,000 payslip gross gives $18,000.
  const sacrificing = superGuarantee('2026-27', [job('Employer A', 150_000, 20_000)], INDEX_NUMBERS);
  assert.equal(sacrificing.amount, toCents(20_400));
  assert.notEqual(sacrificing.amount, toCents(18_000));

  const notSacrificing = superGuarantee('2026-27', [job('Employer A', 170_000, 0)], INDEX_NUMBERS);
  assert.equal(notSacrificing.amount, toCents(20_400));
  assert.equal(sacrificing.amount, notSacrificing.amount);

  // FY2027-28. The rate is the same flat 12 (register O4), so the same package gives the same
  // charge — the ceiling moved, but $170,000 is under both ceilings.
  const laterYear = superGuarantee('2027-28', [job('Employer A', 150_000, 20_000)], INDEX_NUMBERS);
  assert.equal(laterYear.amount, toCents(20_400));
  assert.equal(laterYear.employments[0].cappedByMaximumContributionsBase, false);
  assert.equal(laterYear.employments[0].earningsCharged, toCents(170_000));
});

test('the charge is computed on qualifying earnings, and the line says which figure it used', () => {
  const [line] = superGuarantee('2026-27', [job('Employer A', 150_000, 20_000)], INDEX_NUMBERS).employments;
  assert.equal(line.employer, 'Employer A');
  assert.equal(line.qualifyingEarnings, toCents(170_000));
  assert.equal(line.earningsCharged, toCents(170_000)); // not $150,000 — T17
  assert.equal(line.amount, toCents(20_400));
});

// --- The charge, above the ceiling ----------------------------------------------------------------

test('T18 — one employer above the ceiling is capped at the annual figure, both years', () => {
  // FY2026-27. $300,000 paid + $30,000 sacrificed = $330,000, above $270,830. The charge is on
  // $270,830: 270,830 × 12% = $32,499.60.
  const y1 = superGuarantee('2026-27', [job('Employer A', 300_000, 30_000)], INDEX_NUMBERS);
  assert.equal(y1.amount, toCents(32_499.6));
  assert.equal(y1.employments[0].cappedByMaximumContributionsBase, true);
  assert.equal(y1.employments[0].earningsCharged, toCents(270_830));
  // A quarterly $62,500 ceiling carried forward would charge 4 × 62,500 = $250,000 → $30,000.
  assert.notEqual(y1.amount, toCents(30_000));

  // FY2027-28. $380,000 paid + $20,000 sacrificed = $400,000, above $291,660. The charge is on
  // $291,660: 291,660 × 12% = $34,999.20.
  const y2 = superGuarantee('2027-28', [job('Employer A', 380_000, 20_000)], INDEX_NUMBERS);
  assert.equal(y2.amount, toCents(34_999.2));
  assert.equal(y2.employments[0].earningsCharged, toCents(291_660));
  // Hard-coding the FY2026-27 ceiling gives 270,830 × 12% = $32,499.60 in this year too.
  assert.notEqual(y2.amount, toCents(32_499.6));
});

// --- Per employer, not combined (T18) -------------------------------------------------------------

test('T18 — two employers each below the ceiling are not one employer above it', () => {
  // FY2026-27. Employer A: $180,000 paid + $20,000 sacrificed = $200,000. Employer B: $150,000
  // paid, nothing sacrificed. Neither reaches $270,830, so neither is capped.
  //   200,000 × 12% = $24,000
  //   150,000 × 12% = $18,000
  //   total          $42,000
  const y1 = superGuarantee(
    '2026-27',
    [job('Employer A', 180_000, 20_000), job('Employer B', 150_000, 0)],
    INDEX_NUMBERS,
  );
  assert.deepEqual(
    y1.employments.map((line) => line.amount),
    [toCents(24_000), toCents(18_000)],
  );
  assert.equal(y1.amount, toCents(42_000));
  assert.deepEqual(
    y1.employments.map((line) => line.cappedByMaximumContributionsBase),
    [false, false],
  );
  // A ceiling applied to the combined $350,000 would cap at $270,830 → $32,499.60. It is $42,000.
  assert.notEqual(y1.amount, toCents(32_499.6));

  // FY2027-28, the same two employments. Both are still under the higher $291,660 ceiling, so the
  // total is unchanged — and a combined ceiling would answer 291,660 × 12% = $34,999.20 here.
  const y2 = superGuarantee(
    '2027-28',
    [job('Employer A', 180_000, 20_000), job('Employer B', 150_000, 0)],
    INDEX_NUMBERS,
  );
  assert.equal(y2.amount, toCents(42_000));
  assert.notEqual(y2.amount, toCents(34_999.2));
});

test('T18 — the ceiling binds on the employer that exceeds it and on no other', () => {
  // FY2026-27. Employer A: $280,000 paid + $20,000 sacrificed = $300,000, capped at $270,830 →
  // $32,499.60. Employer B: $100,000 → $12,000. Total $44,499.60.
  const y1 = superGuarantee(
    '2026-27',
    [job('Employer A', 280_000, 20_000), job('Employer B', 100_000, 0)],
    INDEX_NUMBERS,
  );
  assert.deepEqual(
    y1.employments.map((line) => line.cappedByMaximumContributionsBase),
    [true, false],
  );
  assert.deepEqual(
    y1.employments.map((line) => line.amount),
    [toCents(32_499.6), toCents(12_000)],
  );
  assert.equal(y1.amount, toCents(44_499.6));
  // Combined, $400,000 would cap to $270,830 → $32,499.60, losing Employer B's charge entirely.
  assert.notEqual(y1.amount, toCents(32_499.6));

  // FY2027-28: the higher $291,660 ceiling lets more of Employer A through.
  //   291,660 × 12% = $34,999.20, plus $12,000 = $46,999.20.
  const y2 = superGuarantee(
    '2027-28',
    [job('Employer A', 280_000, 20_000), job('Employer B', 100_000, 0)],
    INDEX_NUMBERS,
  );
  assert.equal(y2.amount, toCents(46_999.2));
});

test('two records for one employer are refused — the ceiling is per employer, not per payslip', () => {
  assert.throws(
    () => superGuarantee('2026-27', [job('Employer A', 200_000, 0), job('Employer A', 150_000, 0)], INDEX_NUMBERS),
    DuplicateEmployerError,
  );
  // No employment at all is nil, not an error.
  assert.equal(superGuarantee('2026-27', [], INDEX_NUMBERS).amount, toCents(0));
});

// --- The 1 July 2026 boundary ----------------------------------------------------------------------

test('T17 — years before FY2026-27 are refused, not computed on the new base', () => {
  // The register carries no ordinary time earnings definition and no pre-2026 charge percentage.
  // It DOES carry the pre-2026 maximum contributions base — §3.5 states "$62,500 per quarter"
  // below its own table, T18 states it and `maximumContributionsBase.note` repeats it — so this
  // comment used to copy an overstatement out of the refusal message and hold it in place
  // (P3-29). What is true and enough: that figure is prose and a note, not a record, so there is
  // nothing an earlier year could be computed FROM. Applying the qualifying earnings base
  // backwards would be T17 run in reverse.
  for (const fy of ['2025-26', '2024-25']) {
    assert.throws(() => superGuarantee(fy, [job('Employer A', 170_000, 0)], INDEX_NUMBERS), SuperGuaranteeEarningsBaseError);
    assert.throws(() => maximumContributionsBaseFor(fy, INDEX_NUMBERS), SuperGuaranteeEarningsBaseError);
  }
  // And FY2026-27 itself is on the near side of the boundary.
  assert.equal(superGuarantee('2026-27', [job('Employer A', 170_000, 0)], INDEX_NUMBERS).amount, toCents(20_400));
});

test('MUTATION — the refusal must not say the register lacks the pre-2026 contributions base', () => {
  // P3-29, same class as O70: a refusal asserting a negative about the register that the register
  // itself contradicts. The message said the register carries "nor the quarterly $62,500 maximum
  // contributions base (§3.5)" while citing the very section that states it. Corrected on
  // 2026-09-10 to the narrower claim that carries the refusal just as well — prose and a note,
  // not a record — and the false version is asserted ABSENT here so it cannot come back quietly.
  let message = '';
  assert.throws(
    () => maximumContributionsBaseFor('2025-26', INDEX_NUMBERS),
    (error) => {
      message = error.message;
      return error instanceof SuperGuaranteeEarningsBaseError;
    },
  );
  assert.doesNotMatch(message, /nor the quarterly/);
  assert.doesNotMatch(message, /charge percentage nor/);

  // The two limbs that DO hold, and the narrower third one.
  assert.match(message, /neither the ordinary time earnings definition nor a pre-2026 charge percentage/);
  assert.match(message, /It does carry the pre-2026 maximum contributions base/);
  assert.match(message, /NOT AS A\s+RECORD/);
  assert.match(message, /nothing a computation can consume/);
  // R6: "no record exists" is an argument from absence and is labelled as one, not stated flat.
  assert.match(message, /argument from the absence of a record/);
  assert.match(message, /R6/);
  // The ground of the refusal is unchanged: 1 July 2026 and T17 run backwards.
  assert.match(message, /10A\(1\)/);
  assert.match(message, /T17 run backwards/);
});

// --- Provenance ------------------------------------------------------------------------------------

test('FY2026-27 carries only the O19 caveat; FY2027-28 carries the year stamp and the driver', () => {
  const y1 = superGuarantee('2026-27', [job('Employer A', 170_000, 0)], INDEX_NUMBERS);
  assert.equal(y1.provenance.confidence, 'primary-verified');
  assert.equal(y1.provenance.caveats.length, 1);
  assert.match(y1.provenance.caveats[0], /register O19/);
  // The charge percentage is stamped for this year, so there is no O4 caveat and no year mismatch.
  assert.equal(y1.provenance.caveats.some((line) => /stamped FY2026-27/.test(line)), false);
  assert.equal(maximumContributionsBaseFor('2026-27', INDEX_NUMBERS).provenance.caveats.length, 0);

  const y2 = superGuarantee('2027-28', [job('Employer A', 170_000, 0)], INDEX_NUMBERS);
  // The synthetic AWOTE driver is unverified, and the result is as weak as its weakest input.
  assert.equal(y2.provenance.confidence, 'unverified');
  assert.equal(y2.provenance.caveats.length, 4);
  const caveats = y2.provenance.caveats.join('\n');
  assert.match(caveats, /superannuation\.superGuarantee\.chargePercentage is stamped FY2026-27 and was applied to FY2027-28/);
  assert.match(caveats, /AWOTE index number for the quarter ending 2026-12-31 is unverified/);
  assert.match(caveats, /register O4/);
  assert.match(caveats, /register O19/);
});
