// P3-8, the payment range limb — the least a TTR pension must pay in a year, and the most it may.
//
// **Every expected figure below is hand-worked from the two provisions with the arithmetic written
// out beside it.** None of it came from running the implementation.
//
// The floor is Schedule 7 (via reg 6.01(2)(b)(i) → reg 1.06(9A)): `round10(balance × factor ×
// days ÷ daysInYear)`, rounded once, last, to the nearest $10 with an exact $5 going up. The
// ceiling is reg 6.01(2)(b)(ii): `10% × balance`, and **nothing else happens to it** — no
// pro-rating, no rounding, no age, no 1 June nil, no withdrawal-benefit substitution. The
// asymmetry is the point of the file, so the fixtures are built to make the ceiling's *failure to
// move* visible: every part-year case asserts the ceiling against the same account's full-year
// ceiling, and the June case asserts a whole year's ceiling against a nil floor.
//
// Amounts are integer cents, so $50,000.00 is `5_000_000`.
//
// **Two financial years, and what actually varies between them.** FY2026-27 (365 days) and
// FY2027-28 (366, it contains 29 February 2028) carry the same part-year fixture, and the floor
// moves — $14,960 against $14,970. The **ceiling does not, and cannot**: the 10% is
// `everyYear: true`, is not indexed, and the day count has no route into it. That invariance is
// asserted as an invariance rather than dressed up as a moving number.
//
// **The one thing no fixture can catch** is the maximum varying with age. A TRIS holder has by
// definition not met a nil-cashing-restriction Condition of Release, and turning 65 meets one
// automatically, so every reachable age sits in Schedule 7's single 0-to-64 band: an age-varying
// maximum has no fixture that could see it. The defence is structural and is asserted as such at
// the bottom of this file — there is no date of birth, no `ageAt` and no band lookup anywhere near
// the ceiling.
//
// NOT covered here, and not built: the conversion limb of P3-8 (when a TRIS converts on
// notification or at 65, and what it becomes) — which is *refused*, not guessed — the transfer
// balance cap (P3-9), the accumulation and retirement phase distinction (P3-7), and franking
// inside super.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { SUPERANNUATION } from '../dist/data/assumptions/index.js';
import { daysInFinancialYear, daysInclusive } from '../dist/core/financialYear.js';
import {
  MidYearProportioningError,
  PensionBalanceDateError,
  minimumDrawdown,
  pensionAccountBalance,
} from '../dist/core/minimumDrawdown.js';
import {
  TrisConversionNotModelledError,
  TrisMaximumBalanceDateError,
  TrisNotCommencedError,
  ttrPaymentRange,
} from '../dist/core/ttrPaymentRange.js';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = join(ROOT, 'src');

const ACCESS = SUPERANNUATION.access;

/** A Person of 61 on 1 July 2026, still working: squarely inside the 60-to-64 TTR window. */
const AGED_61 = '1965-07-01';

const balanceOn = (measuredAt, accountBalance, withdrawalBenefit = accountBalance) =>
  pensionAccountBalance({ measuredAt, accountBalance, withdrawalBenefit });

const range = ({ fy, dateOfBirth = AGED_61, commencementDay, balance, gainfulEmployment = { ceased: false }, commuted = false }) =>
  ttrPaymentRange({
    fy,
    dateOfBirth,
    commencementDay,
    balance,
    gainfulEmployment,
    commutedOrRolledOverDuringYear: commuted,
  });

// --- The calendar the part-year floors rest on ---------------------------------------------------

test('the two years the fixtures use, and the day counts inside them', () => {
  assert.equal(daysInFinancialYear('2026-27'), 365);
  assert.equal(daysInFinancialYear('2027-28'), 366); // 29 February 2028
  // 1 Oct → 30 Jun inclusive: 31 + 30 + 31 + 31 + 28 + 31 + 30 + 31 + 30.
  assert.equal(daysInclusive('2026-10-01', '2027-06-30'), 273);
  // The same nine months a year later, with the extra February day: 31 + 30 + 31 + 31 + 29 + …
  assert.equal(daysInclusive('2027-10-01', '2028-06-30'), 274);
});

// --- The asymmetry ---------------------------------------------------------------------------------

test('a 1 October commencement: the floor drops to $14,960 and the ceiling stays at $50,000', () => {
  // Sch 7: $500,000 × 4% = $20,000 a year; × 273/365 = $14,958.9041; nearest $10, exact $5 up →
  //   $14,960. (14,958.9041 / 10 = 1,495.89 → 1,496 tens.)
  // reg 6.01(2)(b)(ii): 10% × $500,000 = $50,000. Not 273/365 of it, which would be $37,397.26.
  const commencing = range({
    fy: '2026-27',
    commencementDay: '2026-10-01',
    balance: balanceOn('2026-10-01', 50_000_000),
  });
  assert.equal(commencing.floor, 1_496_000);
  assert.equal(commencing.ceiling, 5_000_000);
  assert.equal(commencing.isCommencementYear, true);

  // The same account, the next year, running: the floor goes back up to the full 4% and the
  // ceiling is exactly where it was. The corridor widened downwards only.
  const running = range({
    fy: '2027-28',
    commencementDay: '2026-10-01',
    balance: balanceOn('2027-07-01', 50_000_000),
  });
  assert.equal(running.floor, 2_000_000); // $500,000 × 4%, no clause 3 to apply
  assert.equal(running.ceiling, 5_000_000);

  assert.equal(commencing.ceiling, running.ceiling, 'the ceiling did not move');
  assert.equal(running.floor - commencing.floor, 504_000); // $5,040 of floor, and $0 of ceiling
});

test('commencing on or after 1 June: the floor is nil and the ceiling is still the whole 10%', () => {
  // Sch 7 cl 4 is operative, not permissive: a commencement day on or after 1 June requires no
  // payment at all for the year. reg 6.01(2)(b)(ii) has no such clause, so a stream that started
  // on 15 June may still pay a whole year's ceiling in the sixteen days that remain.
  const june = range({
    fy: '2026-27',
    commencementDay: '2027-06-15',
    balance: balanceOn('2027-06-15', 50_000_000),
  });
  assert.equal(june.floor, 0);
  assert.equal(june.minimum.nil, true);
  assert.equal(june.ceiling, 5_000_000);

  // Pro-rating the ceiling on the same facts would give $50,000 × 16/365 = $2,191.78, and applying
  // cl 4 to it would give nil. It is neither.
  assert.notEqual(june.ceiling, 219_178);
  assert.notEqual(june.ceiling, 0);
});

test('the same part-year in two financial years: the floor moves with the calendar, the ceiling cannot', () => {
  // FY2026-27: $20,000 × 273/365 = $14,958.9041 → $14,960.
  // FY2027-28: $20,000 × 274/366 = $14,972.6776 → $14,970. (14,972.6776 / 10 = 1,497.27 → 1,497.)
  const first = range({ fy: '2026-27', commencementDay: '2026-10-01', balance: balanceOn('2026-10-01', 50_000_000) });
  const second = range({ fy: '2027-28', commencementDay: '2027-10-01', balance: balanceOn('2027-10-01', 50_000_000) });

  assert.equal(first.floor, 1_496_000);
  assert.equal(second.floor, 1_497_000);
  assert.notEqual(first.floor, second.floor);

  // Invariant by construction, not by coincidence: the rate is stamped `everyYear` and is not
  // indexed, and no day count reaches the ceiling — so this is an assertion about the shape.
  assert.equal(ACCESS.ttrMaximumDrawdown.everyYear, true);
  assert.equal(first.ceiling, 5_000_000);
  assert.equal(second.ceiling, 5_000_000);
});

// --- Not rounded, and quantised only at the cent ---------------------------------------------------

test('a balance whose 10% is not a multiple of $10: the ceiling keeps the cents', () => {
  // $487,654.32. 10% = $48,765.432 — not a whole $10, and not even a whole cent.
  //   The ceiling is $48,765.43: truncated at the cent because it is a ceiling, and adjusted in no
  //   other way. Rounded to the nearest $10 it would be $48,770 (a remainder of $5.432, which
  //   Sch 7 cl 5 would take *up*) — $4.57 of headroom that does not exist.
  // The floor on the same account: $487,654.32 × 4% = $19,506.1728 → nearest $10 → $19,510. The
  //   floor rounds up, the ceiling does not round at all, and both happen in the same year.
  const result = range({
    fy: '2026-27',
    commencementDay: '2020-07-01',
    balance: balanceOn('2026-07-01', 48_765_432),
  });

  assert.equal(result.ceiling, 4_876_543);
  assert.equal(result.floor, 1_951_000);

  assert.notEqual(result.ceiling, 4_877_000, 'rounded to the nearest $10 — the mutation this fixture exists for');
  assert.notEqual(result.ceiling % 1_000, 0, 'a $10-rounded amount is a multiple of 1,000 cents; this is not');
  assert.equal(result.maximum.exactInCents, false); // 2/10 of a cent given away, and reported
  assert.ok(result.ceiling * 10 <= 48_765_432, 'a ceiling is never rounded up into a breach');
});

test('a balance whose 10% is exact reports the truncation as untouched', () => {
  const result = range({
    fy: '2026-27',
    commencementDay: '2020-07-01',
    balance: balanceOn('2026-07-01', 50_000_000),
  });
  assert.equal(result.maximum.exactInCents, true);
  assert.equal(result.ceiling * 10, 50_000_000);
});

// --- The withdrawal-benefit substitution is Schedule 7's, and only Schedule 7's --------------------

test('cl 1(2)(b) lifts the floor and does not touch the ceiling', () => {
  // An account balance of $400,000 with a $420,000 withdrawal benefit.
  //   Sch 7 cl 1(2)(b) substitutes the greater: floor = $420,000 × 4% = $16,800.
  //   reg 6.01(2)(b)(ii) says "the pension account balance", plain: ceiling = 10% × $400,000
  //   = $40,000, not $42,000.
  const result = range({
    fy: '2026-27',
    commencementDay: '2020-07-01',
    balance: balanceOn('2026-07-01', 40_000_000, 42_000_000),
  });

  assert.equal(result.minimum.balance.withdrawalBenefitSubstituted, true);
  assert.equal(result.floor, 1_680_000);

  assert.equal(result.maximum.balance.value, 40_000_000);
  assert.equal(result.ceiling, 4_000_000);
  assert.notEqual(result.ceiling, 4_200_000, 'the substitution reached the ceiling');
  assert.equal(Object.hasOwn(result.maximum.balance, 'withdrawalBenefit'), false);
});

// --- The reg 6.01(2) "unless": refused, not guessed -------------------------------------------------

test('a Person who has met a Condition of Release has no maximum, and the range refuses to invent one', () => {
  // Turning 65 meets a Condition of Release by itself, so reg 6.01(2)'s "unless" bites and the
  // 10% limb falls away entirely. Born 1 June 1962 → 65 on 1 June 2027, within FY2026-27.
  assert.throws(
    () =>
      range({
        fy: '2026-27',
        dateOfBirth: '1962-06-01',
        commencementDay: '2020-07-01',
        balance: balanceOn('2026-07-01', 50_000_000),
      }),
    (error) => error instanceof TrisConversionNotModelledError && /no maximum at all/.test(error.message),
  );

  // And by the other ground: ceasing gainful employment after Preservation Age. Age is not what
  // decides it — this Person is 63 all year.
  assert.throws(
    () =>
      range({
        fy: '2026-27',
        dateOfBirth: '1963-07-01',
        commencementDay: '2020-07-01',
        balance: balanceOn('2026-07-01', 50_000_000),
        gainfulEmployment: { ceased: true, ceasedOn: '2025-08-01' },
      }),
    TrisConversionNotModelledError,
  );

  // One day short of the automatic release age at 30 June, still working: a TRIS year, and it
  // computes. Born 1 August 1962 → 64 on 30 June 2027.
  const stillATris = range({
    fy: '2026-27',
    dateOfBirth: '1962-08-01',
    commencementDay: '2020-07-01',
    balance: balanceOn('2026-07-01', 50_000_000),
  });
  assert.equal(stillATris.release.met, false);
  assert.equal(stillATris.ceiling, 5_000_000);
});

test('MUTATION — the refusal must not say the stream stops being a TRIS, and must not fuse the two events', () => {
  // Both propositions live in the refusal *message*, which is a string and so is assertable. They
  // were both false as shipped, and each has a source that says so:
  //
  //   * ITAA 1997 s 307-80(3)(a)(i) is written ABOUT "a transition to retirement income stream"
  //     whose recipient has met a condition, and (b) then asks separately whether they notified —
  //     so if satisfying a condition ended the product's TRIS character, (b) would be dead text.
  //     The stream stays a TRIS; its tax PHASE is what changes. Register §3.10.6.
  //   * reg 6.01(2)(b)(ii)'s "unless" has no notification word and tests seven SISR Schedule 1
  //     items; s 307-80(3)(b) changes the phase on notification for items 101/102A/103 and
  //     automatically at 65 for item 106. Different days, different sets — traps T118, T119, and
  //     LCR 2016/9 Example 1B's fortnight is the window between them.
  //
  // The refusal itself stays: it is correct to refuse, and this fixture asserts the ground it is
  // refused on, not merely that it throws.
  let message = '';
  assert.throws(
    () =>
      range({
        fy: '2026-27',
        dateOfBirth: '1962-06-01',
        commencementDay: '2020-07-01',
        balance: balanceOn('2026-07-01', 50_000_000),
      }),
    (error) => {
      message = error.message;
      return error instanceof TrisConversionNotModelledError;
    },
  );

  assert.doesNotMatch(message, /no longer a transition to retirement income stream/);
  assert.match(message, /still a transition to retirement income stream/);
  assert.match(message, /307-80\(3\)\(a\)\(i\)/);
  assert.match(message, /tax phase/);

  // The ceiling event and the phase event, each attached to its own trigger.
  assert.match(message, /ceiling lapses on the day the condition is SATISFIED/);
  assert.match(message, /NOTIFICATION of the income stream provider/);
  assert.match(message, /automatically on the 65th birthday/);
  // The seven-item "Nil" set, which is wider than s 307-80's four.
  for (const item of ['101', '102', '102A', '103', '104', '105(b)', '106']) {
    assert.ok(message.includes(item), `${item} is in reg 6.01(2)(b)(ii)'s set and the message must carry it`);
  }
  // And it still refuses for the reason it always did.
  assert.match(message, /no maximum at all/);

  // P3-30, corrected 2026-09-10: the stated GROUND, not the refusal. This message cited O60 as a
  // live blocker on the conversion limb after O60 had been closed (P3-25 → §3.11) and R10 built,
  // so `superPhase.ts` — which already says "O60 no longer blocks it" — and this file shipped
  // contradictory statements about one limb of one item. The R5 half stands and is what is left.
  assert.doesNotMatch(message, /blocked on mid-year ECPI apportionment/);
  assert.doesNotMatch(message, /apportionment\s+\(O60\)/);
  assert.match(message, /O60 no longer blocks it/);
  assert.match(message, /R10/);
  assert.match(message, /conversion-day\s+Setting alone \(R5\)/);
});

test('every age a TRIS can be held at takes the same floor and the same ceiling', () => {
  // Preservation age is 60 and 65 releases benefits by itself, so the window is 60 to 64 — one
  // Schedule 7 band (0 to 64, 4%) from end to end. Stated as the invariance it is: no fixture in
  // this file can show the floor varying by age, because within the window it does not.
  const at60 = range({ fy: '2026-27', dateOfBirth: '1966-07-01', commencementDay: '2020-07-01', balance: balanceOn('2026-07-01', 50_000_000) });
  const at64 = range({ fy: '2026-27', dateOfBirth: '1962-08-01', commencementDay: '2020-07-01', balance: balanceOn('2026-07-01', 50_000_000) });
  assert.equal(at60.minimum.age, 60);
  assert.equal(at64.minimum.age, 63); // 63 on 1 July 2026, 64 by the 30 June the release is tested on
  assert.equal(at60.floor, 2_000_000);
  assert.equal(at64.floor, 2_000_000);
  assert.equal(at60.ceiling, at64.ceiling);
  assert.equal(ACCESS.minimumDrawdownFactors.value.filter((band) => band.fromAge <= 64).length, 1);
});

// --- The other refusals ---------------------------------------------------------------------------

test('the balance must be the one both provisions name, and each provision checks for itself', () => {
  // A 1 July balance for a stream that commenced in October is a different number that would be
  // multiplied by the same 10%.
  assert.throws(
    () => range({ fy: '2026-27', commencementDay: '2026-10-01', balance: balanceOn('2026-07-01', 50_000_000) }),
    (error) => error instanceof TrisMaximumBalanceDateError && /6\.01\(2\)\(b\)\(ii\)\(B\)/.test(error.message),
  );
  assert.throws(
    () => range({ fy: '2027-28', commencementDay: '2020-07-01', balance: balanceOn('2027-08-01', 50_000_000) }),
    (error) => error instanceof TrisMaximumBalanceDateError && /6\.01\(2\)\(b\)\(ii\)\(A\)/.test(error.message),
  );

  // Schedule 7 names the same day by its own route and refuses the same balance on its own — two
  // provisions agreeing, checked twice, rather than one check doing duty for both.
  assert.throws(
    () =>
      minimumDrawdown({
        fy: '2026-27',
        dateOfBirth: AGED_61,
        commencementDay: '2026-10-01',
        balance: balanceOn('2026-07-01', 50_000_000),
        commutedOrRolledOverDuringYear: false,
      }),
    PensionBalanceDateError,
  );
});

test('a year before the stream commenced has no range at all', () => {
  assert.throws(
    () => range({ fy: '2025-26', commencementDay: '2026-10-01', balance: balanceOn('2026-10-01', 50_000_000) }),
    (error) => error instanceof TrisNotCommencedError && /the year ends before it starts/.test(error.message),
  );
});

test("a year the stream was commuted or rolled over in is Schedule 7's refusal, and it reaches the range", () => {
  assert.throws(
    () =>
      range({
        fy: '2026-27',
        commencementDay: '2020-07-01',
        balance: balanceOn('2026-07-01', 50_000_000),
        commuted: true,
      }),
    MidYearProportioningError,
  );
});

// --- Provenance ------------------------------------------------------------------------------------

test('the ceiling is secondary-only because it rests on the absence of a provision, and says so', () => {
  const running = range({ fy: '2026-27', commencementDay: '2020-07-01', balance: balanceOn('2026-07-01', 50_000_000) });

  // The floor of a full year is primary-verified — read straight off Schedule 7.
  assert.equal(running.minimum.provenance.confidence, 'primary-verified');
  // The ceiling is not, and the weakness is named rather than laundered by consolidation.
  assert.equal(running.maximum.provenance.confidence, 'secondary-only');
  assert.equal(ACCESS.ttrMaximumUnadjusted.confidence, 'secondary-only');
  assert.equal(ACCESS.ttrMaximumDrawdown.confidence, 'primary-verified');
  assert.match(ACCESS.ttrMaximumDrawdown.source, /reg 6\.01\(2\)\(b\)\(ii\)/);
  assert.match(ACCESS.ttrMaximumUnadjusted.note, /absence of a provision/);

  assert.equal(running.provenance.confidence, 'secondary-only');
  assert.ok(running.provenance.caveats.includes('superannuation.access.ttrMaximumUnadjusted is secondary-only'));
});

test('the caveats ride only where they are load-bearing', () => {
  const running = range({ fy: '2026-27', commencementDay: '2020-07-01', balance: balanceOn('2026-07-01', 50_000_000) });
  const commencing = range({ fy: '2026-27', commencementDay: '2026-10-01', balance: balanceOn('2026-10-01', 50_000_000) });
  const june = range({ fy: '2026-27', commencementDay: '2027-06-15', balance: balanceOn('2027-06-15', 50_000_000) });
  const uneven = range({ fy: '2026-27', commencementDay: '2020-07-01', balance: balanceOn('2026-07-01', 48_765_432) });

  const has = (result, pattern) => result.provenance.caveats.some((line) => pattern.test(line));

  // The pro-rating negative changed the number only in the commencement year.
  assert.equal(has(commencing, /has no pro-rating/), true);
  assert.equal(has(running, /has no pro-rating/), false);

  // cl 4 zeroed the floor and left the ceiling whole — worth saying once, where it happened.
  assert.equal(has(june, /requires no minimum payment at all/), true);
  assert.equal(has(running, /requires no minimum payment at all/), false);

  // The whole-cent truncation is a modelling choice and is flagged only when it discarded something.
  assert.equal(has(uneven, /truncated to the whole cent/), true);
  assert.equal(has(running, /truncated to the whole cent/), false);

  // The part-year floor carries Schedule 7's own weakness — the unstated cl 3 denominator — and it
  // does not get merged into the ceiling's.
  assert.ok(commencing.provenance.caveats.includes('superannuation.access.minimumDrawdownProRataDenominator is secondary-only'));
  assert.equal(running.provenance.caveats.includes('superannuation.access.minimumDrawdownProRataDenominator is secondary-only'), false);
});

test('the figure is frozen and its amounts are whole cents', () => {
  const result = range({ fy: '2026-27', commencementDay: '2026-10-01', balance: balanceOn('2026-10-01', 48_765_432) });
  assert.ok(Object.isFrozen(result));
  assert.ok(Object.isFrozen(result.maximum));
  assert.ok(Number.isSafeInteger(result.floor));
  assert.ok(Number.isSafeInteger(result.ceiling));
  assert.throws(() => {
    result.ceiling = 0;
  }, TypeError);
});

// --- The structural defences, asserted against the source ------------------------------------------

/** Comments and strings quote the provisions on purpose; the greps below are about the *code*. */
const executableCode = (text) =>
  text
    .replaceAll(/\/\*[\s\S]*?\*\//g, '')
    .replaceAll(/`(?:[^`\\]|\\.)*`|'(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*"|\/\/.*$/gm, (match) =>
      match.startsWith('//') ? '' : '""',
    );

const CODE = executableCode(readFileSync(join(SRC, 'core', 'ttrPaymentRange.ts'), 'utf8'));

test('the source grep is not vacuous — stripping leaves the executable code behind', () => {
  assert.match(CODE, /\bexport const ttrPaymentRange\b/);
  assert.match(CODE, /\bconst unadjustedMaximum\b/);
  assert.ok(CODE.length > 500);
  assert.match(executableCode("const x = 0.1; // 10%\nconst rate = 0.04;"), /0\.04/);
});

test('MUTATION — hard-coding the 10%, a $10 step, a day count or a factor instead of the record', () => {
  // The 10% is correct today, so no fixture above could see it written as a literal: the
  // arithmetic would be identical. The defence is that no figure from either provision appears in
  // executable code at all.
  const literals = [...CODE.matchAll(/(?<![\w.])\d[\d_]*(?:\.\d+)?/g)].map(([match]) => match);
  assert.deepEqual([...new Set(literals)].sort(), ['0', '1_000_000']);

  for (const forbidden of [/\b0\.1\b/, /\b10\b/, /\b0\.0[4-9]\b/, /\b365\b/, /\b366\b/, /\b1000\b/]) {
    assert.doesNotMatch(CODE, forbidden, `${forbidden} must be read from a record, never written`);
  }
  assert.match(CODE, /ACCESS\.ttrMaximumDrawdown/);
  assert.match(CODE, /ACCESS\.ttrMaximumUnadjusted/);
});

test('nothing that would adjust the maximum is reachable from the file that computes it', () => {
  // Pro-rating needs a day count; rounding needs the $10 step; the 1 June nil needs its date; the
  // age needs `ageAt`. None of them is imported, so none of the four mutations can be *written*
  // here without first importing the machinery to write it with — which is the visible change.
  for (const absent of [
    /\bdaysInclusive\b/,
    /\bdaysInFinancialYear\b/,
    /\broundHalfUpToStep\b/,
    /\bminimumDrawdownRoundingStep\b/,
    /\bminimumDrawdownNilFrom\b/,
    /\bminimumDrawdownFactors\b/,
    /\bttrMinimumDrawdown\b/,
    /\bageAt\b/,
    /\bwithdrawalBenefit\b/,
    /\bmulCents\b/,
  ]) {
    assert.doesNotMatch(CODE, absent, `${absent} has no business in the TTR maximum`);
  }
  // Two `Math` calls: one to scale the rate to an exact integer, one to truncate at the cent.
  assert.deepEqual([...CODE.matchAll(/Math\.\w+/g)].map(([match]) => match), ['Math.round', 'Math.floor']);
  assert.equal([...CODE.matchAll(/Math\.floor\(/g)].length, 1);
});

test('the maximum takes a balance and takes nothing else', () => {
  const parameters = /const unadjustedMaximum = \(([^)]*)\)/.exec(CODE)?.[1] ?? '';
  assert.equal(parameters, 'balance: TrisAccountBalance');

  // And the balance it takes carries a day and an amount — there is no field on it for a
  // proportion, a factor or a withdrawal benefit to arrive through.
  const figure = /export interface TrisAccountBalanceFigure \{([\s\S]*?)\n\}/.exec(CODE)?.[1] ?? '';
  assert.ok(figure.length > 0);
  assert.deepEqual([...figure.matchAll(/readonly (\w+):/g)].map(([, name]) => name), ['measuredAt', 'value']);
});

test('neither end of the range is something a caller can supply an answer to', () => {
  const signature = /export const ttrPaymentRange = \(input: \{([\s\S]*?)\n\}\): TtrPaymentRange/.exec(CODE)?.[1] ?? '';
  assert.ok(signature.length > 0);
  for (const absent of [/\bage\b/, /\bfactor\b/, /\brate\b/, /\bdays\b/, /\bmonths\b/, /\bproportion\b/, /\bmaximum\b/, /\bminimum\b/, /\bamount\b/]) {
    assert.doesNotMatch(signature, absent, `${absent} must not be a parameter`);
  }
  assert.match(signature, /dateOfBirth: IsoDate/);
  assert.match(signature, /commencementDay: IsoDate/);
  assert.match(signature, /balance: PensionAccountBalance/);
  assert.match(signature, /gainfulEmployment: GainfulEmployment/);
  assert.match(signature, /commutedOrRolledOverDuringYear: boolean/);
});

test('the floor is Schedule 7 itself — the flat 4% record is consumed by nothing in src/', () => {
  // Register §3.9 carries a "TTR minimum drawdown 4%" scalar. It understates the rule: a TRIS
  // pulls in the whole of Schedule 7 through reg 6.01(2)(b)(i), so the floor is age-banded,
  // pro-rated, rounded and nil for a June commencement. Consuming that record would be a flat 4%
  // and would be wrong the moment a TRIS is held at 65 — so it stays unconsumed, deliberately.
  const sources = function* (dir) {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const path = join(dir, entry.name);
      if (entry.isDirectory()) yield* sources(path);
      else if (entry.name.endsWith('.ts')) yield path;
    }
  };
  const importers = [...sources(SRC)].filter(
    (file) => file !== join(SRC, 'data', 'assumptions', 'super.ts') && readFileSync(file, 'utf8').includes('ttrMinimumDrawdown'),
  );
  assert.deepEqual(importers, []);
  assert.equal(ACCESS.ttrMinimumDrawdown.value, 0.04);
  assert.match(ACCESS.ttrMinimumDrawdown.note, /Understates the rule/);
  assert.match(ACCESS.ttrMinimumDrawdown.note, /do not start/);
});

// --- T118: reg 6.01(2)'s "Nil" set is STRICTLY LARGER than s 307-80(2)(c)'s ------------------------

test('T118 — the "Nil" set is seven items, parsed as a SET, and the three s 307-80 does not have', () => {
  // §1's T118 row: reg 6.01(2)'s "Nil cashing restriction" set "is strictly larger: it also
  // contains items 102, 104 and 105(b)". An implementation that derives the phase from "the 10% no
  // longer applies" exempts the earnings and creates a transfer balance credit that does not exist.
  //
  // **Why this is not the loop the mutation fixture above already runs.** That loop asks
  // `message.includes(item)` for each of the seven, and `'102A'` answers for `'102'` — measured
  // 2026-09-16 by O66 batch 3: deleting item 102 (death) from the refusal failed ZERO tests. The
  // set is parsed out of the message here and compared as a set, so a member can be dropped, added
  // or renamed and exactly one of those is a pass.
  let message = '';
  assert.throws(
    () =>
      range({
        fy: '2026-27',
        dateOfBirth: '1962-06-01',
        commencementDay: '2020-07-01',
        balance: balanceOn('2026-07-01', 50_000_000),
      }),
    (error) => {
      message = error.message;
      return error instanceof TrisConversionNotModelledError;
    },
  );

  const spelled = message.match(/"Nil" set is the (\w+) SISR Schedule 1 items ([^—]+)—/);
  assert.ok(spelled, 'the refusal no longer states reg 6.01(2)(b)(ii)\'s "Nil" set at all');
  const nilSet = spelled[2]
    .split(/,\s*|\s+and\s+/)
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
  assert.deepEqual([...nilSet].sort(), ['101', '102', '102A', '103', '104', '105(b)', '106']);
  // The COUNT the prose states, checked against the list it introduces rather than against a
  // literal, so the two cannot drift apart.
  assert.equal(spelled[1], 'seven');
  assert.equal(nilSet.length, 7);
  assert.equal(new Set(nilSet).size, 7, 'an item is named twice');

  // s 307-80(2)(c)'s four, and the relation that is the whole trap: strict superset, by exactly
  // these three. Item 102 is death, 104 is termination with preserved benefits under the threshold,
  // 105(b) is the other limb — none of them is in s 307-80(2)(c), so none of them changes the phase.
  const phaseSet = ['101', '102A', '103', '106'];
  for (const item of phaseSet) assert.ok(nilSet.includes(item), `${item} must be in both sets`);
  assert.deepEqual(nilSet.filter((item) => !phaseSet.includes(item)).sort(), ['102', '104', '105(b)']);
  assert.ok(nilSet.length > phaseSet.length, 'the two sets have stopped differing, which is the trap');
});

// --- T119: the ceiling event and the phase event are two events ----------------------------------

test('T119 — the ceiling lapses on SATISFACTION, and no ground and no notification reaches that gate', () => {
  // §1's T119 row: "member retires 30 June, notifies 15 July. For 30 June there must be no maximum,
  // 15% fund earnings tax and no transfer balance credit — three answers that no single 'converted'
  // boolean can produce." The first of the three is this module's, and the fixture is LCR 2016/9
  // Example 1B's fortnight: the ceiling has already gone on 30 June, when nothing has been notified
  // and the stream is still squarely in accumulation phase.
  assert.throws(
    () =>
      range({
        fy: '2026-27',
        dateOfBirth: '1963-07-01',
        commencementDay: '2020-07-01',
        balance: balanceOn('2026-07-01', 50_000_000),
        gainfulEmployment: { ceased: true, ceasedOn: '2027-06-30' },
      }),
    TrisConversionNotModelledError,
    'the ceiling survived a Condition of Release satisfied on the last day of the year',
  );

  // **The mutation this is written against, and it is why the assertion below is structural.**
  // Slaving the ceiling gate to the phase — `release.met && grounds.includes(the age-65 ground)` —
  // leaves every fixture above green except one, because the gate is the only place the two rules
  // could be fused. reg 6.01(2)(b)(ii)'s "unless" has no notification word and no item number in
  // it: it asks whether a condition has been SATISFIED, full stop.
  assert.match(CODE, /if \(release\.met\) throw new TrisConversionNotModelledError\(fy, releaseOn, release\.grounds\);/);
  for (const forbidden of [/grounds\.(includes|some|indexOf|find)/, /notif/i, /\bphase\b/, /statedNotificationDay/]) {
    assert.doesNotMatch(CODE, forbidden, `${forbidden} would fuse the ceiling event to the phase event`);
  }
  // The ceiling is decided from what this function is GIVEN, and a notification day is not among
  // its inputs — so the fusion cannot be written here without first widening the parameter list.
  assert.doesNotMatch(CODE, /superPhase|trisInterest|trisConversionDay/);
});

// --- T123: a 10% breach is not a bad year ---------------------------------------------------------

test('T123 — the breach note says the stream CANNOT recommence, and never that it costs one year', () => {
  // §1's T123 row, on TR 2013/5 ¶20 ("cannot recommence meeting the SISR requirements in a future
  // year") and ¶101 (a new stream must be commenced and the proportioning rule reapplied). Nothing
  // in `src/` computes a breach of the 10% ceiling, so the whole of this rule is carried in the
  // reasoning beside the rate — and a doc comment is exactly the thing a green suite does not read.
  // Measured 2026-09-16 by O66 batch 3: reversing this note to "the breach costs that one year and
  // no more" failed ZERO tests.
  const RAW = readFileSync(join(SRC, 'core', 'ttrPaymentRange.ts'), 'utf8');
  const prose = RAW.replaceAll(/^\s*(\/\/|\*|\/\*\*)/gm, ' ').replaceAll(/\s+/g, ' ');

  assert.match(prose, /the stream \*\*cannot recommence\*\* in a later year/);
  assert.match(prose, /it must be commuted and a \*\*new\*\* stream started, with the proportioning rule re-struck on commencement/);
  assert.match(prose, /taken to have ceased for income tax purposes \*\*at the start of that income year\*\*/);
  assert.match(prose, /the fund loses \*\*ECPI for the whole year\*\*/);
  assert.match(prose, /TR 2013\/5/);

  // The readings the rule is not. A keyword ban rather than a keyword match, because a reversal
  // that keeps "recommence" and drops "cannot" keeps every keyword and says the opposite.
  for (const forbidden of [
    /costs that one year/,
    /resumes meeting/,
    /in the FOLLOWING year/i,
    /may recommence/,
    /can recommence/,
    /one bad year/,
  ]) {
    assert.doesNotMatch(prose, forbidden, `${forbidden} is the T123 reading, and it is wrong for every later year`);
  }
  // Not vacuous: the same flattening keeps the surrounding reasoning readable.
  assert.ok(prose.includes('TR 2013/5 ¶¶18–20, 100–101 and Example 6'));
});
