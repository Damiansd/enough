// P3-7, the phase limb — Accumulation Phase against Retirement Phase, and the fund earnings tax
// that follows from the distinction.
//
// **Every expected figure below is hand-worked from register §3.1 with the arithmetic written out
// beside it.** None of it came from running the implementation. There are only two rates in the
// section and they are flat, so the arithmetic is one multiplication each; what the fixtures are
// really for is *which* rate a given interest gets.
//
// The register rows, verbatim from §3.1 and repeated in §7's constants list:
//
//   | Fund earnings tax, Accumulation Phase / TTR | 15% | — | constant | ITAA 1997 |
//   | Fund earnings tax, Retirement Phase (ECPI)  |  0% | — | constant | ITAA 1997 ss 295-385, 295-390 |
//
// **The trap.** A TTR pension is a pension and it is *not* Retirement Phase — the first row says
// so in its own name. Its earnings bear 15%, and the assertion below that they are 15% is written
// alongside an explicit assertion that they are **not** 0%, because "it pays a pension so it must
// be exempt" is the reading that makes every TTR strategy look better than it is.
//
// **Two financial years, and what does not vary between them.** FY2026-27 and FY2027-28 carry the
// same fixtures. Both rates are `everyYear: true` constants, are not indexed and have no FY-keyed
// slot, and no financial year reaches the rate lookup — so the invariance is asserted **as an
// invariance**, not dressed up as a number that moves. The year is not inert everywhere, though:
// it is what `PhaseYearMismatchError` checks a phase statement against.
//
// Amounts are integer cents, so $40,000.00 is `4_000_000`.
//
// NOT covered here, and not built: franking credits inside super (P3-7a/b), the TTR conversion
// limb of P3-8, the transfer balance cap (P3-9).
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { SUPERANNUATION } from '../dist/data/assumptions/index.js';
import { PreservedBenefitError, conditionOfRelease } from '../dist/core/conditionOfRelease.js';
import {
  FundLossNotModelledError,
  MidYearPhaseChangeError,
  PhaseYearMismatchError,
  ReversionaryStreamNotModelledError,
  TrisRetirementPhaseNotModelledError,
  accumulationInterest,
  fundEarningsTax,
  phaseHeldForTheWholeYear,
  phaseHeldFrom,
  retirementPhaseInterest,
  transitionToRetirementInterest,
} from '../dist/core/superPhase.js';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = join(ROOT, 'src');

const FUND_TAX = SUPERANNUATION.fundTax;

/** 61 on 1 July 2026 and still working: inside the TTR window, and no Condition of Release met. */
const AGED_61 = '1965-07-01';
/** 67 on 1 July 2026: past the automatic release age, so the condition is met without any act. */
const AGED_67 = '1959-07-01';

const YEARS = [
  { fy: '2026-27', on: '2026-07-01' },
  { fy: '2027-28', on: '2027-07-01' },
];

const release = (dateOfBirth, on, gainfulEmployment = { ceased: false }) =>
  conditionOfRelease({ dateOfBirth, on, gainfulEmployment });

const taxOn = (interest, fy, taxableEarnings) =>
  fundEarningsTax({ fy, interest, taxableEarnings, phaseHeldFor: phaseHeldForTheWholeYear(fy) });

/** $40,000.00 of taxable fund earnings — the one base every phase fixture is applied to. */
const EARNINGS = 4_000_000;

// --- The register and the records say the same thing ------------------------------------------------

// P3-31. §3.11.6's proof of R10's bound once read "under **either** method and on **any** facts".
// That is false on a loss: `[0, the year's income]` is not an interval when income is negative, the
// inequality reverses, and 15% of a loss is the LARGEST notional refund rather than a ceiling. The
// condition is now stated at the head of the proof. This canary stops the unconditioned claim
// creeping back — the phrase may survive ONLY as a quotation of the superseded sentence, and the
// condition must still be there to have been quoted against.
test('register §3.11.6 states the non-negative condition, and the unconditioned claim survives only as a quotation', () => {
  const register = readFileSync(join(ROOT, 'docs', 'assumptions-register.md'), 'utf8');
  assert.match(
    register,
    /Let `taxableEarnings ≥ 0`/,
    "§3.11.6's proof must open by assuming non-negative earnings — R10's bound does not hold on a loss (P3-31)",
  );
  const unconditioned = [...register.matchAll(/on \*\*any\*\* facts/g)].length;
  assert.equal(
    unconditioned,
    2,
    `"on **any** facts" appears ${unconditioned} times in the register; exactly 2 are expected, both ` +
      'quotations of the superseded claim recording that it was wrong. A third occurrence means the ' +
      'unconditioned bound has been reasserted somewhere as though it were true (P3-31).',
  );
});

test('register §3.1 and src/data/assumptions/super.ts agree on both rates', () => {
  const register = readFileSync(join(ROOT, 'docs', 'assumptions-register.md'), 'utf8');
  const row = (name) =>
    register
      .split('\n')
      .filter((line) => line.startsWith(`| ${name} |`))
      .map((line) => line.split('|')[2].trim());

  assert.deepEqual(row('Fund earnings tax, Accumulation Phase / TTR'), ['15%', '15%']); // §3.1 and §7
  assert.deepEqual(row('Fund earnings tax, Retirement Phase (ECPI)'), ['0%']); // §3.1
  assert.deepEqual(row('Fund earnings tax, Retirement Phase'), ['0%']); // §7's constants list

  assert.equal(FUND_TAX.earningsTaxAccumulation.value, 0.15);
  assert.equal(FUND_TAX.earningsTaxRetirement.value, 0);
  // §7 lists both, so both must be constants: a config row would need an FY stamp and would then
  // be a figure that could be indexed, which neither of these is.
  assert.equal(FUND_TAX.earningsTaxAccumulation.kind, 'constant');
  assert.equal(FUND_TAX.earningsTaxRetirement.kind, 'constant');
  assert.equal(FUND_TAX.earningsTaxAccumulation.everyYear, true);
  assert.equal(FUND_TAX.earningsTaxRetirement.everyYear, true);
  assert.match(FUND_TAX.earningsTaxRetirement.source, /295-385/);
  assert.match(FUND_TAX.earningsTaxRetirement.source, /295-390/);
});

// --- The three phases, hand-worked ------------------------------------------------------------------

test('Accumulation Phase: $40,000 of earnings bears $6,000 of tax', () => {
  // §3.1: 15%. $40,000.00 × 0.15 = $6,000.00, and $40,000.00 − $6,000.00 = $34,000.00.
  for (const { fy, on } of YEARS) {
    const interest = accumulationInterest(release(AGED_61, on));
    assert.equal(interest.phase, 'accumulation');
    assert.equal(interest.incomeStream, 'no income stream — the interest is in accumulation');

    const result = taxOn(interest, fy, EARNINGS);
    assert.equal(result.rate, 0.15);
    assert.equal(result.tax, 600_000);
    assert.equal(result.netEarnings, 3_400_000);
    assert.equal(result.fy, fy);
    assert.equal(result.provenance.confidence, 'primary-verified');
    assert.deepEqual(result.provenance.caveats, []);
  }
});

test('TTR: $40,000 of earnings bears $6,000 of tax — 15%, and NOT the 0% a pension suggests', () => {
  // The trap, stated as an equality and as a disequality. reg 6.01(2) makes a TRIS a pension, and
  // register §3.1 puts it on the *Accumulation Phase* row: the earnings are taxed exactly as an
  // accumulation account's are. $40,000.00 × 0.15 = $6,000.00; at 0% it would be $0.00, and the
  // $6,000 difference on this one fixture is the whole reason the row is worded the way it is.
  for (const { fy, on } of YEARS) {
    const interest = transitionToRetirementInterest(release(AGED_61, on));
    assert.equal(interest.phase, 'accumulation');
    assert.equal(interest.incomeStream, 'a transition to retirement income stream');

    const result = taxOn(interest, fy, EARNINGS);
    assert.equal(result.rate, FUND_TAX.earningsTaxAccumulation.value);
    assert.equal(result.tax, 600_000);
    assert.notEqual(result.tax, 0);
    assert.notEqual(result.rate, FUND_TAX.earningsTaxRetirement.value);
    assert.equal(result.netEarnings, 3_400_000);
    // And it is the same figure an accumulation account gets, to the cent, on the same earnings.
    assert.equal(result.tax, taxOn(accumulationInterest(release(AGED_61, on)), fy, EARNINGS).tax);
  }
});

test('Retirement Phase: $40,000 of earnings bears no tax at all', () => {
  // §3.1: 0%, ITAA 1997 ss 295-385, 295-390 — exempt current pension income. $40,000.00 × 0 = $0.
  for (const { fy, on } of YEARS) {
    const interest = retirementPhaseInterest(release(AGED_67, on));
    assert.equal(interest.phase, 'retirement');
    assert.equal(interest.incomeStream, 'a superannuation income stream in the retirement phase');

    const result = taxOn(interest, fy, EARNINGS);
    assert.equal(result.rate, 0);
    assert.equal(result.tax, 0);
    assert.equal(result.netEarnings, EARNINGS);
  }
});

test('the two rates do not vary by year, and that is an invariance rather than a fixture', () => {
  // Both records are `everyYear: true`, neither is indexed, and no financial year reaches the rate
  // lookup — `fundEarningsTax` uses `fy` only to check the phase statement's year and to stamp the
  // provenance. So the equality below is structural, and is asserted as such: there is no year in
  // the Planning Horizon that could make these differ, and no fixture could show one.
  const [first, second] = YEARS;
  const accumulation = (year) => taxOn(accumulationInterest(release(AGED_61, year.on)), year.fy, EARNINGS);
  const retirement = (year) => taxOn(retirementPhaseInterest(release(AGED_67, year.on)), year.fy, EARNINGS);

  assert.equal(accumulation(first).tax, accumulation(second).tax);
  assert.equal(retirement(first).tax, retirement(second).tax);
  assert.equal(FUND_TAX.earningsTaxAccumulation.fy, undefined);
  assert.equal(FUND_TAX.earningsTaxRetirement.fy, undefined);
});

// --- Meeting a Condition of Release is not, by itself, Retirement Phase --------------------------

test('a Person who has met a Condition of Release, with the money still in accumulation, pays 15%', () => {
  // 67 years old, released twice over on the register's second limb — and the money has not moved.
  // Phase follows the act of starting a retirement phase income stream, not the entitlement to.
  // $40,000.00 × 0.15 = $6,000.00, the same as the 61-year-old still working.
  for (const { fy, on } of YEARS) {
    const met = release(AGED_67, on);
    assert.equal(met.met, true);
    assert.deepEqual(met.grounds, ['turning the age that releases benefits by itself']);

    const interest = accumulationInterest(met);
    assert.equal(interest.phase, 'accumulation');

    const result = taxOn(interest, fy, EARNINGS);
    assert.equal(result.tax, 600_000);
    assert.notEqual(result.tax, 0);
  }
});

test('the same is true of a Person released by ceasing work rather than by age', () => {
  // Ceased gainful employment at 61, after Preservation Age: released on §3.9's first limb, and
  // still in Accumulation Phase until they do something with the money.
  const met = release(AGED_61, '2026-12-31', { ceased: true, ceasedOn: '2026-12-01' });
  assert.equal(met.met, true);
  assert.deepEqual(met.grounds, ['ceasing gainful employment after Preservation Age']);

  const result = taxOn(accumulationInterest(met), '2026-27', EARNINGS);
  assert.equal(result.phase, 'accumulation');
  assert.equal(result.tax, 600_000);
});

test('a preserved Person cannot be put in Retirement Phase at all', () => {
  // Necessary, and checked through the single gate the model has. 61 and still working.
  const preserved = release(AGED_61, '2026-07-01');
  assert.equal(preserved.met, false);
  assert.throws(() => retirementPhaseInterest(preserved), PreservedBenefitError);
});

// --- Rounding, and where it happens ---------------------------------------------------------------

test('the one rounding is the product, to the whole cent', () => {
  // $12,345.67 × 15% = $1,851.8505 exactly. Rounded to the whole cent, half away from zero:
  // $1,851.85. Net $12,345.67 − $1,851.85 = $10,493.82.
  const result = taxOn(accumulationInterest(release(AGED_61, '2026-07-01')), '2026-27', 1_234_567);
  assert.equal(result.tax, 185_185);
  assert.equal(result.netEarnings, 1_049_382);
  assert.ok(Number.isSafeInteger(result.tax));

  // 10 cents × 15% = 1.5 cents, the tie. `mulCents` rounds half away from zero, so 2 cents.
  assert.equal(taxOn(accumulationInterest(release(AGED_61, '2026-07-01')), '2026-27', 10).tax, 2);

  // Nil earnings are a real year, not an error: no tax, no rounding, either side.
  assert.equal(taxOn(accumulationInterest(release(AGED_61, '2026-07-01')), '2026-27', 0).tax, 0);
  assert.equal(taxOn(retirementPhaseInterest(release(AGED_67, '2026-07-01')), '2026-27', 0).tax, 0);
});

// --- What is refused rather than guessed ------------------------------------------------------------

test('a TRIS held by a Person who has met a Condition of Release is refused, not answered', () => {
  const met = release(AGED_67, '2026-07-01');
  assert.throws(() => transitionToRetirementInterest(met), TrisRetirementPhaseNotModelledError);
  assert.throws(() => transitionToRetirementInterest(met), /conversion limb of P3-8/);
  // And the refusal is narrow: while the condition is unmet the same call answers.
  assert.equal(transitionToRetirementInterest(release(AGED_61, '2026-07-01')).phase, 'accumulation');
});

test('MUTATION — the TRIS refusal must not say the register is silent on WHEN a stream converts', () => {
  // The refusal stays; the ground it was refused on was falsified by register §3.10.6, which
  // answers exactly the question the message said was unanswered: the phase changes on the day the
  // provider is NOTIFIED for SISR Schedule 1 items 101, 102A and 103 (ITAA 1997 s 307-80(3)(b)(ii),
  // LCR 2016/9 Example 1B), and AUTOMATICALLY on the 65th birthday for item 106, which
  // (3)(b)(ii)'s enumeration omits. Under ruling R5 the refusal now fires because the conversion
  // DAY is a stated Setting that does not exist yet — not because the rule is unknown — and under
  // R6 the age-65 finding is an inference from an express enumeration corroborated by a public
  // ruling, never bare `primary-verified`. All of this lives in the message, which is a string and
  // is therefore assertable.
  let message = '';
  assert.throws(
    () => transitionToRetirementInterest(release(AGED_67, '2026-07-01')),
    (error) => {
      message = error.message;
      return error instanceof TrisRetirementPhaseNotModelledError;
    },
  );

  assert.doesNotMatch(message, /converts[\s\S]*is not\s+in the register/);
  assert.doesNotMatch(message, /automatically on the condition being met/);
  assert.match(message, /§3\.10\.6/);
  assert.match(message, /307-80\(3\)\(b\)\(ii\)/);
  assert.match(message, /NOTIFIED/);
  assert.match(message, /65th birthday/);
  assert.match(message, /item 106/);
  assert.match(message, /inference from an express enumeration/);
  assert.match(message, /never bare primary-verified/); // R6: the label must not be narrowed away

  // R5's mandatory mitigation, in the message: an absent conversion-day Setting is a NAMED
  // refusal, and the reason is that silence is flattering on the cap side even though it is
  // conservative on the tax side. A message that dropped the cap half would justify a silent skip.
  assert.match(message, /stated Setting/);
  assert.match(message, /NOT derived from date of birth/);
  assert.match(message, /no transfer balance credit/);
  assert.match(message, /breach of the cap goes\s+undetected/);
});

// --- The conversion year: R10's bound, and register §3.11.7's four golden fixtures ----------------
//
// Every figure below is hand-worked from register §3.11.7, which hand-works it from
// `docs/research/p3-25-ecpi-apportionment.md` §5. None of it came from running the implementation.
//
// **Example A.** A two-member household SMSF. Alex $900,000, converting **14 December 2026**; Sam
// $600,000, in accumulation all year; fund taxable earnings **$75,000**; balances flat. Not DSFA
// (both limbs of s 295-387(2)(c) fail — T129), and the fund is never 100% retirement phase, so the
// s 295-385(9) election is unavailable and no assets are segregated: **proportionate method, whole
// year**.
//
//   Alex's share of the income:   900,000 / 1,500,000 × 75,000  =  $45,000.00
//   Sam's share:                  600,000 / 1,500,000 × 75,000  =  $30,000.00
//   days 14 Dec 2026 → 30 Jun 2027, both counted: 18 + 31 + 28 + 31 + 30 + 31 + 30  =  199
//   days in FY2026-27: 1 Jul 2026 → 30 Jun 2027, 2027 not a leap year               =  365
//
//   F1  statutory   average current pension liabilities 900,000 × 199/365 = $490,684.93
//                   exempt proportion 490,684.93 / 1,500,000 = 0.3271232877
//                   exempt income 75,000 × 0.3271232877      = $24,534.25
//                   tax (75,000 − 24,534.25) × 0.15          =   $7,569.86   =   756_986c
//   F2  the bound   75,000 × 0.15                            =  $11,250.00   = 1_125_000c
//   F3  naive fix   Alex 0% on 45,000 + Sam 15% on 30,000    =   $4,500.00   =   450_000c
//
// F3 is **identical to the provable floor**, $3,069.86 below the statutory answer. It is not an
// approximation of the right answer; it is the worst available answer in the flattering direction,
// and **M-P3-25-1** is the mutation that catches it.

/** Example A, per interest: [income in cents, the interest, the fraction of FY2026-27 it held]. */
const EXAMPLE_A = () => [
  { name: 'Alex, converting 14 December', earnings: 4_500_000, interest: retirementPhaseInterest(release(AGED_67, '2026-07-01')), heldFor: phaseHeldFrom('2026-27', '2026-12-14') },
  { name: 'Sam, in accumulation all year', earnings: 3_000_000, interest: accumulationInterest(release(AGED_61, '2026-07-01')), heldFor: phaseHeldForTheWholeYear('2026-27') },
];

const fundTaxFor = (members, fy = '2026-27') =>
  members
    .map(({ interest, earnings, heldFor }) => fundEarningsTax({ fy, interest, taxableEarnings: earnings, phaseHeldFor: heldFor }))
    .reduce((total, result) => total + result.tax, 0);

test('§3.11.7 F2 — the conversion year is charged at the bound, $11,250.00, not refused', () => {
  const [alex, sam] = EXAMPLE_A();

  // 199 of 365 days, as two integers. Never divided: T130 — the one days formula in Subdiv 295-F
  // is s 295-410 and it is for RSAs, so there is no float here to split the year with.
  assert.equal(alex.heldFor.days, 199);
  assert.equal(alex.heldFor.daysInYear, 365);
  assert.equal(alex.heldFor.coverage, 'part-year');
  assert.equal(sam.heldFor.days, 365);
  assert.equal(sam.heldFor.coverage, 'whole-year');

  // Alex: $45,000.00 × 0.15 = $6,750.00, at the ACCUMULATION row, on a retirement-phase interest.
  const converting = fundEarningsTax({ fy: '2026-27', interest: alex.interest, taxableEarnings: alex.earnings, phaseHeldFor: alex.heldFor });
  assert.equal(converting.tax, 675_000);
  assert.equal(converting.rate, 0.15);
  assert.equal(converting.phase, 'retirement'); // the interest still says what it is
  assert.equal(converting.chargedAs, 'accumulation'); // and the row applied is disclosed separately

  // Sam: $30,000.00 × 0.15 = $4,500.00.
  const accumulating = fundEarningsTax({ fy: '2026-27', interest: sam.interest, taxableEarnings: sam.earnings, phaseHeldFor: sam.heldFor });
  assert.equal(accumulating.tax, 450_000);
  assert.equal(accumulating.chargedAs, 'accumulation');

  // $6,750.00 + $4,500.00 = $11,250.00 — F2, which is 15% of the whole $75,000.
  assert.equal(fundTaxFor(EXAMPLE_A()), 1_125_000);
});

test('MUTATION M-P3-25-1 — a conversion year below $11,250.00 is the flattering extreme', () => {
  // §9's mutation row: "§3.11.7 fixture F1's facts with no ECPI Setting: any fund earnings tax
  // below $11,250.00 for FY2026-27 fails." Asserted as an inequality, not as an equality, because
  // the register states it as a *bound*: F1's statutory $7,569.86 and F3's naive $4,500.00 both
  // sit below it, and both are answers this engine must not be able to reach.
  const total = fundTaxFor(EXAMPLE_A());
  assert.ok(total >= 1_125_000, `${total} cents is below the R10 bound of 1_125_000`);
  assert.notEqual(total, 450_000); // F3 — the naive fix, and the provable floor
  assert.notEqual(total, 756_986); // F1 — the statutory figure, which needs a certificate
  assert.ok(756_986 < 1_125_000); // the bound is above the statutory answer, which is the point
  assert.ok(450_000 < 756_986); // and the naive fix is below it, by $3,069.86
  assert.equal(756_986 - 450_000, 306_986);
});

test('§3.11.7 F4 — the bound sits above BOTH methods on facts where they disagree', () => {
  // Example B: one member, $900,000, converting 14 Dec 2026, income $45,000 of which a $15,000
  // gain realised 20 November. Segregated → $4,296.58; the s 295-385(9) election → $3,069.86.
  // $1,226.71 apart on identical facts, which is why the method is not assumable — and the reason
  // the bound is what is computed instead of either of them.
  const alone = retirementPhaseInterest(release(AGED_67, '2026-07-01'));
  const result = fundEarningsTax({ fy: '2026-27', interest: alone, taxableEarnings: 4_500_000, phaseHeldFor: phaseHeldFrom('2026-27', '2026-12-14') });
  assert.equal(result.tax, 675_000); // $45,000.00 × 0.15 = $6,750.00
  assert.ok(result.tax >= 429_658); // ≥ the segregated answer
  assert.ok(result.tax >= 306_986); // ≥ the election answer
  // The register reports the two branches as $1,226.71 apart, from the unrounded figures; the two
  // rounded cent fixtures it publishes differ by $1,226.72. Both are below the bound, which is the
  // only claim this fixture is making.
  assert.equal(429_658 - 306_986, 122_672);
});

test('the bound is DISCLOSED by name — a caller can see a ceiling was applied, not a figure', () => {
  const bounded = fundEarningsTax({
    fy: '2026-27',
    interest: retirementPhaseInterest(release(AGED_67, '2026-07-01')),
    taxableEarnings: EARNINGS,
    phaseHeldFor: phaseHeldFrom('2026-27', '2026-12-14'),
  });
  assert.equal(bounded.basis, 'ITAA 1997 Subdiv 295-F upper bound (R10): the Accumulation Phase rate on the whole year’s earnings');

  // R10 step 3's words, in the register's own terms: what it is, what it is not, what it needs,
  // and — the half a confidence label does not do — WHICH WAY the error runs.
  const disclosure = bounded.provenance.caveats.find((line) => /upper bound/.test(line));
  assert.ok(disclosure, 'a bounded result must say so in its caveats');
  assert.match(disclosure, /charged at the accumulation rate on the whole year’s earnings/);
  assert.match(disclosure, /proven upper bound/);
  assert.match(disclosure, /not the fund’s actual ECPI/);
  assert.match(disclosure, /actuary’s certificate \(s 295-390\(4\)\)/);
  assert.match(disclosure, /asset-level tracing \(s 295-385\(1\)\(b\)\)/);
  assert.match(disclosure, /It understates the household/);

  // The Retirement Phase cap caveat survives alongside it: the conversion still happened, the
  // s 294-25 credit still arises, and nothing here has checked it against any cap (§3.11.6).
  assert.ok(bounded.provenance.caveats.some((line) => /checked against any cap/.test(line)));

  // A whole year says none of it — the disclosure is not boilerplate on every result.
  const whole = taxOn(accumulationInterest(release(AGED_61, '2026-07-01')), '2026-27', EARNINGS);
  assert.equal(whole.basis, 'the phase stated for the interest, held for the whole financial year');
  assert.deepEqual(whole.provenance.caveats, []);
  assert.equal(whole.chargedAs, 'accumulation');
});

test('MUTATION — a part year cannot reach the 0% row from either direction', () => {
  // Both directions of the fraction, both phases, one assertion each.
  const converting = retirementPhaseInterest(release(AGED_67, '2026-07-01'));
  const accumulating = accumulationInterest(release(AGED_61, '2026-07-01'));

  for (const day of ['2026-12-14', '2026-07-02', '2027-06-30']) {
    const held = phaseHeldFrom('2026-27', day);
    assert.equal(held.coverage, 'part-year');
    const result = fundEarningsTax({ fy: '2026-27', interest: converting, taxableEarnings: EARNINGS, phaseHeldFor: held });
    assert.equal(result.rate, 0.15);
    assert.equal(result.tax, 600_000); // $40,000.00 × 0.15, never $0.00
    assert.notEqual(result.rate, 0);
  }

  // A part year in accumulation is charged the same 15% and discloses the same bound: the bound is
  // a property of the YEAR, not of the phase, so it cannot be dodged by re-stating the interest.
  const other = fundEarningsTax({ fy: '2026-27', interest: accumulating, taxableEarnings: EARNINGS, phaseHeldFor: phaseHeldFrom('2026-27', '2026-12-14') });
  assert.equal(other.tax, 600_000);
  assert.ok(other.provenance.caveats.some((line) => /proven upper bound/.test(line)));

  // The whole year is the only route to 0%, and it still works.
  const exempt = taxOn(converting, '2026-27', EARNINGS);
  assert.equal(exempt.rate, 0);
  assert.equal(exempt.tax, 0);
  assert.equal(exempt.chargedAs, 'retirement');
});

test('the day counts are exact integers, and a day outside the year is refused', () => {
  // 199 of 365 for FY2026-27; the same 14 December is meaningless in another year.
  assert.deepEqual(
    { ...phaseHeldFrom('2026-27', '2026-12-14') },
    { fy: '2026-27', days: 199, daysInYear: 365, coverage: 'part-year' },
  );
  // 1 July is the whole year, counted the same inclusive way: not a special case.
  assert.equal(phaseHeldFrom('2026-27', '2026-07-01').coverage, 'whole-year');
  assert.equal(phaseHeldFrom('2026-27', '2026-07-01').days, 365);
  // 30 June is one day: the smallest part year, and still a part year.
  assert.equal(phaseHeldFrom('2026-27', '2027-06-30').days, 1);
  assert.equal(phaseHeldFrom('2026-27', '2027-06-30').coverage, 'part-year');
  // FY2027-28 contains 29 February 2028, so its whole year is 366 days — counted, never stated.
  assert.equal(phaseHeldForTheWholeYear('2027-28').daysInYear, 366);
  assert.equal(phaseHeldForTheWholeYear('2027-28').days, 366);

  assert.throws(() => phaseHeldFrom('2026-27', '2027-07-01'), PhaseYearMismatchError);
  assert.throws(() => phaseHeldFrom('2026-27', '2026-06-30'), PhaseYearMismatchError);
  assert.throws(() => phaseHeldFrom('2026-27', '2026-12-32'), /not a day of that month/);
  assert.throws(() => phaseHeldFrom('2026-27', '2026-7-1'), /not a zero-padded ISO date/);
});

test('MidYearPhaseChangeError is NARROWED: it fires on a fraction counted in another year', () => {
  // R10 step 1. What is left of the refusal is the one route by which a year containing a phase
  // change could still reach the Retirement Phase row: FY2026-27 is 365 days and FY2027-28 is 366,
  // so a whole-year fraction carried across describes 365 of 366 days — a mid-year change — and
  // would be charged at 0% on the whole year if it were accepted.
  const interest = retirementPhaseInterest(release(AGED_67, '2027-07-01'));
  const carriedAcross = phaseHeldForTheWholeYear('2026-27');
  assert.equal(carriedAcross.days, 365);
  assert.equal(phaseHeldForTheWholeYear('2027-28').daysInYear, 366);

  let message = '';
  assert.throws(
    () => fundEarningsTax({ fy: '2027-28', interest, taxableEarnings: EARNINGS, phaseHeldFor: carriedAcross }),
    (error) => {
      message = error.message;
      return error instanceof MidYearPhaseChangeError;
    },
  );
  assert.match(message, /365 of 365 days/); // what was supplied, against the year it was counted in
  assert.match(message, /366 days/); // and why that is not the same year
  assert.match(message, /segregat/);

  // The refusal is narrowed, so it must stop describing itself as the blocker it no longer is.
  assert.doesNotMatch(message, /BINDING BLOCKER/);
  assert.match(message, /NO LONGER a blocker on the TRIS conversion limb of P3-8 or on P4/);
  assert.match(message, /no longer\s+refuses a conversion year at all/);

  // The corrected grounds stay: no apportionment exists, and R10 is what narrowed it.
  assert.match(message, /295-390/);
  assert.match(message, /NO apportionment/);
  assert.match(message, /R10/);
  assert.match(message, /295-390\(4\)/);
  assert.match(message, /295-385\(4\)/);
  // MUTATION — neither falsehood may return. O70: never assert a cross-pass negative in a refusal.
  assert.doesNotMatch(message, /NEVER BEEN RETRIEVED/);
  assert.doesNotMatch(message, /295-385\(3\)\(b\) requires an actuary/);

  // And the sibling refusal must stop citing O60 as an independent blocker on the conversion limb.
  let tris = '';
  assert.throws(
    () => transitionToRetirementInterest(release(AGED_67, '2026-07-01')),
    (error) => {
      tris = error.message;
      return error instanceof TrisRetirementPhaseNotModelledError;
    },
  );
  assert.doesNotMatch(tris, /O60 blocks it independently/);
  assert.match(tris, /O60 no longer blocks it/);
});

test('a fund loss is refused rather than turned into a 15% refund', () => {
  const interest = accumulationInterest(release(AGED_61, '2026-07-01'));
  assert.throws(() => taxOn(interest, '2026-27', -100), FundLossNotModelledError);
  assert.throws(() => taxOn(interest, '2026-27', -100), /carried forward/);
  assert.throws(() => taxOn(interest, '2026-27', 1.5), RangeError);
});

test('a PART-year loss is refused too — the bound reverses on a loss and is not a ceiling', () => {
  // §3.11.6's proof holds only for `taxableEarnings >= 0`, and the part year is the only place that
  // condition bites: a whole year in accumulation is charged 15%, which IS the statutory rate, and a
  // whole year in retirement phase is charged 0%. Hand-worked as the MIRROR of Example A's Alex —
  // the same $45,000 and the same conversion on 14 Dec 2026, 199 of 365 days, but a loss:
  //
  //   the bound, applied anyway   −45,000.00 × 0.15                        =  −$6,750.00
  //   the statutory figure        exempt −45,000 × 199/365   = −$24,534.25
  //                               assessable −45,000 − (−24,534.25)        = −$20,465.75
  //                               −20,465.75 × 0.15                        =  −$3,069.86
  //
  // On a gain the bound sits $3,680.14 ABOVE the statutory answer (F2 − F1). On a loss of the same
  // size it sits $3,680.14 BELOW it — the largest notional refund available, not a ceiling. That is
  // the direction §3.11.6's *"on any facts"* claimed to exclude and does not, and the loss refusal
  // running ahead of the rate lookup is what keeps the claim true in the code.
  const converting = retirementPhaseInterest(release(AGED_67, '2026-07-01'));
  const partYear = phaseHeldFrom('2026-27', '2026-12-14');
  const chargeIt = (taxableEarnings) =>
    fundEarningsTax({ fy: '2026-27', interest: converting, taxableEarnings, phaseHeldFor: partYear });

  assert.equal(partYear.coverage, 'part-year');
  assert.throws(() => chargeIt(-4_500_000), FundLossNotModelledError);
  assert.throws(() => chargeIt(-4_500_000), /carried forward/);

  // Refused RATHER THAN charged at the bound. What comes back is the refusal itself, with none of
  // the fields a bounded result carries: no −675_000 for a caller to read as a ceiling, and no
  // `basis` or bound caveat to label it with.
  let outcome;
  try {
    outcome = chargeIt(-4_500_000);
  } catch (error) {
    outcome = error;
  }
  assert.ok(outcome instanceof FundLossNotModelledError);
  assert.equal(outcome.tax, undefined);
  assert.equal(outcome.basis, undefined);
  assert.equal(outcome.chargedAs, undefined);

  // And the refusal is about the SIGN, not about the part year: the same facts with the sign
  // flipped are still charged at the bound, so this fixture cannot be satisfied by closing the
  // part-year path that §3.11.7 F2 requires to stay open.
  const gain = chargeIt(4_500_000);
  assert.equal(gain.tax, 675_000);
  assert.equal(gain.chargedAs, 'accumulation');

  // The reversal as arithmetic, so the DIRECTION is asserted and not merely narrated.
  assert.ok(675_000 > 306_986); // a gain: the bound OVERstates the fund's tax, by $3,680.14
  assert.ok(-675_000 < -306_986); // the same loss: it UNDERstates it, by the same $3,680.14
  assert.equal(675_000 - 306_986, 368_014);
});

test('a phase stated in one year is not evidence for another', () => {
  const interest = accumulationInterest(release(AGED_61, '2026-07-01'));
  assert.throws(() => taxOn(interest, '2027-28', EARNINGS), PhaseYearMismatchError);
  assert.equal(taxOn(interest, '2026-27', EARNINGS).fy, '2026-27');
});

// --- Provenance ---------------------------------------------------------------------------------------

test('a Retirement Phase result says the transfer balance cap has not been applied to it', () => {
  const result = taxOn(retirementPhaseInterest(release(AGED_67, '2026-07-01')), '2026-27', EARNINGS);
  assert.equal(result.provenance.confidence, 'primary-verified'); // the rate itself is
  assert.equal(result.provenance.caveats.length, 1);
  assert.match(result.provenance.caveats[0], /transfer balance cap/);
  assert.match(result.provenance.caveats[0], /307-80/);

  // MUTATION — the caveat's two REASONS were falsified by the P3-9 pass and must not come back.
  // It said s 307-80's entry test "is not in the register" (§3.10.6 now carries it, in full) and
  // that the cap "is not modelled (P3-9)" as though the register were silent (§§3.10.1–3.10.3
  // carry the cap, its proportional indexation and the highest-ever balance tracking). The risk
  // the caveat warns about is untouched — this engine still checks no stated Retirement Phase
  // amount against any cap — so the warning stays and only its ground changes: the register
  // specifies it and the code does not implement it.
  assert.doesNotMatch(result.provenance.caveats[0], /entry test is not in the register/);
  assert.doesNotMatch(result.provenance.caveats[0], /is not modelled \(P3-9\)/);
  assert.match(result.provenance.caveats[0], /§3\.10\.6/);
  assert.match(result.provenance.caveats[0], /§§3\.10\.1–3\.10\.3/);
  // **Second correction, 2026-09-16 (P3-9 chunk 6-4).** The caveat used to say the engine
  // implements NEITHER half and that "the P3-9 build has not happened". Chunks 1-6 happened: the
  // personal cap, its indexation, the day history, the breach refusal and the pre-forecast refusal
  // are all in `src/core/transferBalanceAccount.ts` and `transferBalanceAccountSettings.ts`. The
  // superseded sentence is KEPT, once, inside the note that records it as superseded — so this is
  // pinned by COUNT and by frame, not by absence: a bare `doesNotMatch` would fail on the honest
  // copy, and a bare `match` is what let the sentence go on being read as current.
  const caveat = result.provenance.caveats[0];
  assert.equal([...caveat.matchAll(/the P3-9 build has not happened/g)].length, 1);
  assert.match(caveat, /Corrected 2026-09-16 by P3-9 chunk 6-4[\s\S]*the P3-9 build has not happened/);
  assert.match(caveat, /which was true when it was written and false from chunk 1/);
  // And the corrected ground says which half is built and which is not, in terms.
  assert.match(caveat, /s 307-80’s entry test, which is built nowhere/);
  assert.match(caveat, /those ARE built/);
  assert.match(caveat, /What is missing is the WIRING/);
  // The warning itself survives the correction: nothing here is checked against a cap. This is the
  // sentence that must NOT be softened while the wiring is absent.
  assert.match(caveat, /no amount here has been checked against any cap/);

  // The Accumulation Phase side carries no such caveat, because no cap gates it.
  const accumulation = taxOn(accumulationInterest(release(AGED_61, '2026-07-01')), '2026-27', EARNINGS);
  assert.deepEqual(accumulation.caveats, undefined);
  assert.deepEqual(accumulation.provenance.caveats, []);
});

test('every result is frozen', () => {
  const result = taxOn(accumulationInterest(release(AGED_61, '2026-07-01')), '2026-27', EARNINGS);
  assert.throws(() => {
    result.tax = 0;
  }, TypeError);
  assert.throws(() => {
    result.interest.phase = 'retirement';
  }, TypeError);
});

// --- The structural defences, asserted against the source ----------------------------------------------

/** Comments and strings quote the register on purpose; the greps below are about the *code*. */
const executableCode = (text) =>
  text
    .replaceAll(/\/\*[\s\S]*?\*\//g, '')
    .replaceAll(/`(?:[^`\\]|\\.)*`|'(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*"|\/\/.*$/gm, (match) =>
      match.startsWith('//') ? '' : '""',
    );

const RAW = readFileSync(join(SRC, 'core', 'superPhase.ts'), 'utf8');
const CODE = executableCode(RAW);

/** The text of one exported binding, up to the next top-level `export`. */
const bodyOf = (name) =>
  new RegExp(`export const ${name} = [\\s\\S]*?(?=\\nexport |$)`).exec(RAW)?.[0] ?? '';

test('the source grep is not vacuous — stripping leaves the executable code behind', () => {
  assert.match(CODE, /\bexport const fundEarningsTax\b/);
  assert.match(CODE, /\bexport const transitionToRetirementInterest\b/);
  assert.ok(CODE.length > 500);
  assert.match(executableCode("const x = 0.15; // 15%\nconst y = 0;"), /0\.15/);
});

test('the header bullet corrected by chunk 6-4 is pinned, and the claim it retired is quoted once', () => {
  // **Measured as a survivor on 2026-09-16 (Battery E, mutation 12).** Reinstating the retired
  // sentence in place of the correction — *"Nothing in this model applies any of it yet, because
  // the P3-9 build has not happened"* — failed **ZERO** tests. It stopped being true at P3-9 chunk
  // 1, and a header that says the transfer balance cap is unbuilt is an invitation to build it a
  // second time here, which is the one thing this file's own bullet says must not happen.
  //
  // Derivation 3, flattened prose, because the claim wraps across comment lines and a naive grep of
  // the raw text cannot see it. Pinned by COUNT inside its correction frame, not by absence: this
  // project deliberately keeps one copy of a superseded sentence, quoted in the note recording it
  // as false.
  const prose = RAW.replace(/^\s*\/\/ ?/gm, '').replace(/\s+/g, ' ');
  assert.match(
    prose,
    /since P3-9 chunks 1–6 `src\/core\/transferBalanceAccount\.ts` BUILDS all three/,
    'the corrected claim: the build has happened',
  );
  const retired = [...prose.matchAll(/nothing in this model applies any of it yet, because the P3-9 build has not happened/gi)];
  assert.equal(retired.length, 1, 'the retired sentence is quoted exactly once, or it has been reasserted');
  assert.match(
    prose,
    /\(Corrected 2026-09-16 by P3-9 chunk 6-4; this said "nothing in this model applies any of it yet, because the P3-9 build has not happened", which stopped being true at chunk 1\.\)/,
    'the one copy must sit inside its correction frame',
  );
  // The narrower claim the bullet retreated TO, which is the part that is still true and still
  // load-bearing: no Person-level join exists here, and it is P4-1's.
  assert.match(prose, /nothing in this model applies any of it to a stated interest/);
  assert.match(prose, /that join is P4-1's walk/);
  // Vacuity: the flattening really did keep the header.
  assert.ok(prose.length > 4000);
});

test('MUTATION — a TTR interest cannot be given the Retirement Phase type', () => {
  // The defence is the declared return type, not an assertion: `transitionToRetirementInterest`
  // returns an `AccumulationInterest`, whose `phase` is the literal `'accumulation'`. Writing
  // `phase: 'retirement'` in its body, or returning a `RetirementPhaseInterest` from it, does not
  // compile. Making the mutation compile takes a visible change to the signature — which is what
  // this asserts is still there.
  assert.match(
    RAW,
    /export const transitionToRetirementInterest = \(\n  release: ConditionOfRelease,\n  declared\?: DeclaredRecipient,\n\): AccumulationInterest => \{/,
  );
  // The brand — a private-member witness class as of P3-41 chunk 2, one per type so the two
  // interests are never nominally the same class.
  assert.match(RAW, /export type AccumulationInterest = SuperInterestFigure & \{ readonly phase: 'accumulation' \} & AccumulationInterestWitness;/);
  assert.match(RAW, /export type RetirementPhaseInterest = SuperInterestFigure & \{ readonly phase: 'retirement' \} & RetirementPhaseInterestWitness;/);
  assert.match(bodyOf('transitionToRetirementInterest'), /phase: 'accumulation',/);

  // And there is no third phase for a TRIS to be routed to: two rates, two keys, two members.
  assert.match(RAW, /export type EarningsPhase = 'accumulation' \| 'retirement';/);
  const table = /const EARNINGS_TAX: Readonly<Record<EarningsPhase, Rate>> = \{([\s\S]*?)\n\};/.exec(CODE)?.[1] ?? '';
  assert.deepEqual([...table.matchAll(/^\s*(\w+):/gm)].map(([, key]) => key), ['accumulation', 'retirement']);
  assert.doesNotMatch(CODE, /\bttr\w*:/i);
});

test('MUTATION — phase cannot be keyed off an age, because no age can arrive', () => {
  // Same shape as `benefitAccess` in conditionOfRelease.ts: a `ConditionOfRelease` carries no age,
  // there is no date of birth, no `ageAt`, and `household.js` — where the age arithmetic lives — is
  // not imported. Keying phase off a birthday means adding a parameter for the birthday to arrive
  // through, which is a visible change to a signature this test pins exactly.
  for (const absent of [/\bageAt\b/, /\bdateOfBirth\b/, /\bpreservationAge\b/, /\bautomaticReleaseAge\b/, /household\.js/, /\bage\b/]) {
    assert.doesNotMatch(CODE, absent, `${absent} has no business in the phase model`);
  }
  // **EXTENDED 2026-09-16 by P3-9 chunk 5b-1.** R13 makes the 65th birthday the backstop TRIS
  // conversion day, and `nthBirthday` in `financialYear.ts` is the day function that computes it.
  // A birthday is an age arithmetic result, so importing it here would walk an age in through the
  // one door the list above does not name — `financialYear.js` is legitimately imported for the
  // day counters. The derivation belongs to whatever module reads the stated changeover day; this
  // module takes its phase already decided. The names are in this file's PROSE, which is why the
  // grep is against `CODE`: comments are stripped and strings are blanked before the check.
  for (const absent of [/\bnthBirthday\b/, /\bbirthday\b/i]) {
    assert.doesNotMatch(CODE, absent, `${absent} has no business in the phase model`);
  }
  assert.match(RAW, /65th birthday/, 'the prose says it — the point of the grep above is that the CODE does not');
  // **NARROWED 2026-09-16 by P3-9 chunk 5a, not deleted.** This used to read
  // `release: ConditionOfRelease` and nothing else. Chunk 5a gave the three constructors R7's
  // inputs 4 and 7 as an optional `DeclaredRecipient`, so the old equality was false — but the
  // ground it was defending is untouched, and the replacement defends it the same way: the exact
  // parameter list, so a THIRD parameter, or a widening of the second, fails here. What makes the
  // narrowing safe rather than a hole is the shape of `DeclaredRecipient` itself, pinned below: two
  // fields, neither a date, a number nor an age, so no birthday can arrive through it either.
  for (const constructor of ['accumulationInterest', 'transitionToRetirementInterest', 'retirementPhaseInterest']) {
    const parameters = new RegExp(`export const ${constructor} = \\(([^)]*)\\)`).exec(CODE)?.[1] ?? '';
    assert.deepEqual(
      parameters.split(',').map((parameter) => parameter.trim()).filter(Boolean),
      ['release: ConditionOfRelease', 'declared?: DeclaredRecipient'],
      `${constructor} must take the condition and the declared facts, and nothing else`,
    );
  }
  const declared = /export interface DeclaredRecipient \{([\s\S]*?)\n\}/.exec(CODE)?.[1] ?? '';
  assert.deepEqual([...declared.matchAll(/readonly (\w+): ([\w |'\-]+);/g)].map(([, key, type]) => `${key}: ${type}`), [
    'reversionaryBeneficiary: boolean',
    'commutationAuthority: CommutationAuthority',
  ]);
  // **A COUNT, because the matcher above is type-shaped and a field can hide from it.** Its capture
  // class is `[\w |'-]`, so any type carrying a character outside that — `Readonly<{ dob: IsoDate }>`,
  // `readonly IsoDate[]`, `{ born: IsoDate }` — produces no match at all and the `deepEqual` still
  // sees exactly the two expected entries. Measured 2026-09-16: adding
  // `readonly bornOn: Readonly<{ dob: IsoDate }>;` to `DeclaredRecipient` failed ZERO tests, which
  // is a date of birth arriving through the very parameter this test was narrowed to say could not
  // carry one. The count is blind to the type, so it fails on any added field however it is spelled.
  assert.equal(
    [...declared.matchAll(/\breadonly \w+\??:/g)].length,
    2,
    'DeclaredRecipient gained or lost a field — no date, number or age may arrive through it',
  );
  // And `fundEarningsTax` has no route in either: the phase arrives already decided.
  const signature = /export const fundEarningsTax = \(input: \{([\s\S]*?)\n\}\): FundEarningsTax/.exec(CODE)?.[1] ?? '';
  assert.ok(signature.length > 0);
  for (const absent of [/\bage\b/, /\bdateOfBirth\b/, /\bphase\b/, /\brate\b/, /\btax:/]) {
    assert.doesNotMatch(signature, absent, `${absent} must not be a parameter`);
  }
  // The parameter list itself, exactly — the four names and their four types. R10 step 2 replaced
  // `phaseHeldForTheWholeYear: boolean` with a branded fraction, and this pins BOTH halves: a
  // fifth parameter cannot be smuggled in, and the fraction cannot quietly become a `number` (a
  // float proportion) or a `boolean` (the collapsed endpoints it was) without failing here.
  assert.deepEqual([...signature.matchAll(/readonly (\w+): ([\w<>, ]+);/g)].map(([, key, type]) => `${key}: ${type}`), [
    'fy: FinancialYear',
    'interest: SuperInterest',
    'taxableEarnings: Cents',
    'phaseHeldFor: PhaseYearFraction',
  ]);
});

test('MUTATION — the naive repair is not a guard that can be deleted: it is a labelled cell', () => {
  // §3.11.7 F3, T132, M-P3-25-1. "Honour the stated phase for the whole year" returns $4,500.00 on
  // Example A's facts — the provable floor. The defence is that there is no `if` to remove: which
  // §3.1 row a stated phase is charged at is a TOTAL lookup over (phase × coverage), so the naive
  // repair has to be written into a cell, over the comment that says what the cell is for.
  const table = /const CHARGED: Readonly<Record<EarningsPhase, Readonly<Record<YearCoverage, EarningsPhase>>>> = \{([\s\S]*?)\n\};/.exec(RAW)?.[1] ?? '';
  assert.ok(table.length > 0, 'the charge table has gone or changed shape');
  assert.deepEqual([...table.matchAll(/^\s*(\w+): \{ 'whole-year': '(\w+)', 'part-year': '(\w+)' \},$/gm)].map(([, row, whole, part]) => `${row}/${whole}/${part}`), [
    'accumulation/accumulation/accumulation',
    'retirement/retirement/accumulation', // ← the bound. `'retirement'` here is the $4,500.00 answer
  ]);

  // Dropping the second index to get back to "the stated phase, always" does not type-check:
  // `CHARGED[interest.phase]` is a `Record<YearCoverage, EarningsPhase>`, which is not a key of
  // `EARNINGS_TAX`. The rate and the provenance are both read through the CHARGED row, so a
  // result cannot be charged at one row and cite the other.
  assert.match(CODE, /const chargedAs = CHARGED\[phase\]\[coverage\];/);
  assert.match(CODE, /const record = EARNINGS_TAX\[chargedAs\];/);
  assert.match(CODE, /provenanceOf\(fy, CONSUMED\[chargedAs\]\)/);
  assert.doesNotMatch(CODE, /EARNINGS_TAX\[phase\]/);
  assert.doesNotMatch(CODE, /CONSUMED\[phase\]/);

  // And the disclosure is read off the same `coverage` the charge is, so a bounded result cannot
  // be returned without saying so — there is no second, independent condition to falsify.
  assert.match(CODE, /basis: BASIS\[coverage\]/);
  assert.match(CODE, /coverage === ""\s*\?\s*stated\s*:\s*withCaveats\(stated, CONVERSION_YEAR_BOUND\)/);
});

test('MUTATION — the fraction is two integers, and it is never divided (T130)', () => {
  // A float proportion would decide the whole-year test — 0% against 15% on a whole year's
  // earnings — by comparing a float to 1. And a days-based SPLIT of the year is not the law under
  // either method: the only days formula in Subdiv 295-F is s 295-410, for RSAs. So there is no
  // division of the day counts anywhere in this file for anyone to multiply earnings by.
  assert.doesNotMatch(CODE, /days\s*\/[^/]/);
  assert.doesNotMatch(CODE, /\/\s*daysInYear/);
  assert.doesNotMatch(CODE, /daysInFinancialYear\([^)]*\)\s*\*/);
  assert.match(RAW, /readonly days: number;/);
  assert.match(RAW, /readonly daysInYear: number;/);
  assert.doesNotMatch(RAW, /readonly fraction: number;|readonly proportion: number;/);

  // The whole-year test is one integer equality, stated twice in opposite directions so that
  // mutating either — a part year read as whole, or a whole year read as part — throws instead of
  // charging the wrong row. Both statements are asserted present.
  assert.match(CODE, /days < daysInYear \? "" : ""/);
  assert.match(CODE, /\(coverage === ""\) !== \(days === daysInYear\)/);
});

test('MUTATION — "has met a Condition of Release" is carried, never consulted', () => {
  // `accumulationInterest` does not read `met` off the release, so there is no branch to flip and
  // the minimal way to write the mutation — returning a `RetirementPhaseInterest` from it — does
  // not compile. The one place `met` is read is the TRIS conversion refusal, and the one place
  // access is tested is the Retirement Phase constructor's necessary condition.
  assert.ok(bodyOf('accumulationInterest').includes('accumulationInterest ='));
  assert.doesNotMatch(bodyOf('accumulationInterest'), /\.met\b/);
  assert.doesNotMatch(bodyOf('accumulationInterest'), /requireBenefitAccess/);
  assert.doesNotMatch(bodyOf('accumulationInterest'), /RetirementPhaseInterest/);
  assert.match(bodyOf('transitionToRetirementInterest'), /if \(release\.met\) throw new TrisRetirementPhaseNotModelledError/);
  assert.match(bodyOf('retirementPhaseInterest'), /requireBenefitAccess\(benefitAccess\(release\)/);
  assert.equal([...CODE.matchAll(/release\.met/g)].length, 1);
});

test('MUTATION — hard-coding 0.15 or 0 instead of reading the records', () => {
  // Both rates are correct today, so no fixture above could see one written as a literal: the
  // arithmetic would be identical. The defence is that no rate appears in executable code at all.
  const literals = [...CODE.matchAll(/(?<![\w.])\d[\d_]*(?:\.\d+)?/g)].map(([match]) => match);
  assert.deepEqual([...new Set(literals)].sort(), ['0']); // the loss test, and nothing else

  for (const forbidden of [/\b0\.15\b/, /\b15\b/, /\b0\.85\b/, /\b295\b/]) {
    assert.doesNotMatch(CODE, forbidden, `${forbidden} must be read from a record, never written`);
  }
  assert.match(CODE, /FUND_TAX\.earningsTaxAccumulation/);
  assert.match(CODE, /FUND_TAX\.earningsTaxRetirement/);
  assert.match(CODE, /rate: record\.value/);
  assert.match(CODE, /mulCents\(taxableEarnings, record\.value\)/);
});

test('both earnings-tax records are now consumed by src/, and by this module', () => {
  // A record in src/data/assumptions/ that nothing under src/ imports is this project's recurring
  // bug signature. These two were unconsumed until this chunk; the point of the assertion is that
  // they are consumed *here*, by the rate lookup, and not merely displayed somewhere.
  const sources = function* (dir) {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const path = join(dir, entry.name);
      if (entry.isDirectory()) yield* sources(path);
      else if (entry.name.endsWith('.ts')) yield path;
    }
  };
  // The rules-in-force panel (src/app/rulesInForce.ts) names every register key to classify it for
  // display; it reads, never computes. Consumption means computation, so it is left out here.
  const declaration = join(SRC, 'data', 'assumptions', 'super.ts');
  for (const key of ['earningsTaxAccumulation', 'earningsTaxRetirement']) {
    const importers = [...sources(SRC)].filter(
      (file) => file !== declaration && file !== join(SRC, 'app', 'rulesInForce.ts') && readFileSync(file, 'utf8').includes(key),
    );
    assert.deepEqual(importers, [join(SRC, 'core', 'superPhase.ts')], `${key} must be consumed, and here`);
  }
});

test('the provenance names the record the phase actually used', () => {
  // A result that consumed the Accumulation rate must not be able to cite the Retirement one —
  // and under R10 the record consumed is the one the CHARGE was made at (`chargedAs`), not the one
  // the interest states, so a bounded conversion year cites the 15% row it was actually charged.
  assert.match(RAW, /'superannuation\.fundTax\.earningsTaxAccumulation', EARNINGS_TAX\.accumulation/);
  assert.match(RAW, /'superannuation\.fundTax\.earningsTaxRetirement', EARNINGS_TAX\.retirement/);
  assert.match(CODE, /provenanceOf\(fy, CONSUMED\[chargedAs\]\)/);
  assert.doesNotMatch(CODE, /provenanceOf\(fy, CONSUMED\[phase\]\)/);
  assert.match(CODE, /mergeProvenance\(/);
  // Never rebuilt by hand — `withCaveats` and `mergeProvenance` only.
  assert.doesNotMatch(CODE, /confidence:/);
});

// --- CLOSED (P3-9 chunk 6-1): the 0% row re-earns its preconditions at the point of charge -------

test('the spread that laundered a TTR into the 0% row is now refused by fundEarningsTax', () => {
  // **This test replaces the KNOWN-UNSAFE test that pinned the wrong number here** (P3-9 Battery D,
  // 2026-09-16). Its own tripwire scripted this retirement: "if a later chunk closes this — by
  // refusing a laundered interest — whoever closed it must come back here and rewrite this test as
  // a refusal". Chunk 6-1 did, so this is that rewrite, and the priced pair is kept verbatim.
  //
  // What has NOT changed is the type-level fact. A symbol brand survives an object spread, so
  //
  //     const x: RetirementPhaseInterest = { ...transitionToRetirementInterest(release), phase: 'retirement' };
  //
  // still compiles under `tsc --noEmit` (the same literal WITHOUT the spread is correctly rejected,
  // TS2322, `[SUPER_INTEREST]` missing — that is the positive control). The fix is not a type and
  // cannot be: `fundEarningsTax` re-derives the precondition out of evidence the interest already
  // carries — `interest.release` — exactly as chunk 6-0 re-derived its Σ movement witness.
  //
  // **Hand-derived from register §3.1, not from the implementation.** Taxable earnings $100,000.00 =
  // 10_000_000 cents. Accumulation Phase / TTR row: 15% -> 10_000_000 x 0.15 = 1_500_000 cents =
  // $15,000.00. Retirement Phase (ECPI) row: 0% -> 0 cents. The laundering was worth $15,000 a year
  // on $100,000 of earnings and it ran ONE WAY. It is now $15,000 or a refusal, and nothing between.
  const preserved = release(AGED_61, '2026-11-03');
  const ttr = transitionToRetirementInterest(preserved);
  const year = { fy: '2026-27', taxableEarnings: 10_000_000, phaseHeldFor: phaseHeldForTheWholeYear('2026-27') };

  const honest = fundEarningsTax({ ...year, interest: ttr });
  assert.equal(honest.rate, 0.15);
  assert.equal(honest.tax, 1_500_000, 'the TTR row: $100,000 x 15% = $15,000');

  // The wrong answer, named beside the right one: this call used to return `tax: 0` — $0 where
  // $15,000 is owed — with `chargedAs: 'retirement'` agreeing with the lie and no caveat at all.
  assert.throws(
    () => fundEarningsTax({ ...year, interest: { ...ttr, phase: 'retirement' } }),
    PreservedBenefitError,
    'the laundered interest must be refused, not charged $0',
  );
  // And refused on the preservation gate by name, not by some new refusal invented for the spread:
  // a TRIS can only exist on an unmet release, because its constructor throws otherwise.
  assert.equal(ttr.release.met, false, 'the re-derivable fact: a TRIS carries an unmet release');
  assert.throws(
    () => fundEarningsTax({ ...year, interest: { ...ttr, phase: 'retirement' } }),
    /preserved/,
  );

  // An accumulation interest on the same unmet release is the same attack and the same refusal.
  const accumulating = accumulationInterest(preserved);
  assert.equal(fundEarningsTax({ ...year, interest: accumulating }).tax, 1_500_000);
  assert.throws(
    () => fundEarningsTax({ ...year, interest: { ...accumulating, phase: 'retirement' } }),
    PreservedBenefitError,
  );

  // **The property that is load-bearing is that the re-derivation is UNCONDITIONAL over `coverage`,
  // not that it sits above the rate lookup — added by Battery E, 2026-09-16.** Measured: moving the
  // guard below the lookup and keying it off `chargedAs` instead of `phase` failed **ZERO** tests,
  // because `CHARGED.retirement['part-year']` is `'accumulation'`, so a laundered TTR held for part
  // of the year escaped the gate entirely. No dollar moved under that mutation — the bound charges
  // 15% either way — but the refusal R9's reasoning requires simply did not fire, and the day
  // `CHARGED` grows a row it becomes a wrong number with nothing between. So the same spread is
  // asserted on a PART year, on the same $100,000 and the same $15,000.
  const partYear = { ...year, phaseHeldFor: phaseHeldFrom('2026-27', '2026-12-14') };
  assert.equal(partYear.phaseHeldFor.coverage, 'part-year');
  assert.equal(fundEarningsTax({ ...partYear, interest: ttr }).tax, 1_500_000, 'the bound: $100,000 x 15%');
  assert.equal(fundEarningsTax({ ...partYear, interest: ttr }).chargedAs, 'accumulation');
  assert.throws(
    () => fundEarningsTax({ ...partYear, interest: { ...ttr, phase: 'retirement' } }),
    PreservedBenefitError,
    'the gate must not be keyed off the row that was charged',
  );
  assert.throws(
    () => fundEarningsTax({ ...partYear, interest: { ...accumulating, phase: 'retirement' } }),
    PreservedBenefitError,
  );
  // And the guard's own text says which of the two it reads, so a later `chargedAs` swap is visible.
  assert.match(bodyOf('fundEarningsTax'), /if \(phase === 'retirement'\) \{\n    requireModelledRecipient\(/);
});

test('POSITIVE CONTROL — a genuinely built retirement phase interest is still charged 0%', () => {
  // Without this the guard above could be passing by refusing everything. $100,000.00 of earnings
  // at the Retirement Phase (ECPI) row: 0% -> 0 cents, and the interest is not rejected.
  const met = release(AGED_67, '2026-11-03');
  const retired = retirementPhaseInterest(met);
  const year = { fy: '2026-27', taxableEarnings: 10_000_000, phaseHeldFor: phaseHeldForTheWholeYear('2026-27') };

  const result = fundEarningsTax({ ...year, interest: retired });
  assert.equal(result.rate, 0);
  assert.equal(result.tax, 0, '$100,000 x 0% = $0, and it is allowed through');
  assert.equal(result.chargedAs, 'retirement');

  // The recipient half of the re-derivation: a declaration spread onto a genuine retirement
  // interest never met `requireModelledRecipient` at construction, and is caught at the charge.
  assert.throws(
    () => fundEarningsTax({
      ...year,
      interest: { ...retired, recipient: { reversionaryBeneficiary: true, commutationAuthority: 'no commutation authority has been issued for this stream' } },
    }),
    ReversionaryStreamNotModelledError,
  );
  // A stated-and-benign declaration still passes, so the check is not refusing on presence alone.
  assert.equal(
    fundEarningsTax({
      ...year,
      interest: { ...retired, recipient: { reversionaryBeneficiary: false, commutationAuthority: 'no commutation authority has been issued for this stream' } },
    }).tax,
    0,
  );
});

test('KNOWN-UNSAFE, MONITORED — a MET release spread into the retirement type is NOT caught', () => {
  // The third case of the partition, and the residue of chunk 6-1. An accumulation interest built
  // on a release that DOES pass the preservation gate can still be spread into `phase: 'retirement'`
  // and charged 0%. This test asserts the CURRENT behaviour rather than pretending to close it.
  //
  // **Why that is acceptable, and why it is not the priced defect.** `retirementPhaseInterest(met)`
  // would have returned the same 0% honestly — the caller had the honest route available and the
  // figure is identical, so no dollar moves either way. What the spread skips is the
  // `UNCAPPED_ENTRY` caveat that constructor attaches to its provenance. That is a DISCLOSURE loss,
  // not a dollar loss, and it is recorded here so it cannot be lost or closed silently.
  const met = release(AGED_67, '2026-11-03');
  const accumulating = accumulationInterest(met);
  const year = { fy: '2026-27', taxableEarnings: 10_000_000, phaseHeldFor: phaseHeldForTheWholeYear('2026-27') };

  assert.equal(fundEarningsTax({ ...year, interest: accumulating }).tax, 1_500_000, 'honestly $15,000');

  const spread = fundEarningsTax({ ...year, interest: { ...accumulating, phase: 'retirement' } });
  assert.equal(spread.tax, 0, 'KNOWN-UNSAFE: the met-release spread is allowed through');

  // And it is the same number the honest route gives, which is the whole reason it is tolerated.
  const honestlyRetired = fundEarningsTax({ ...year, interest: retirementPhaseInterest(met) });
  assert.equal(spread.tax, honestlyRetired.tax, 'no dollar moves — the loss is disclosure only');
  assert.deepEqual(spread.provenance.caveats, [], 'the spread carries no caveat');
  assert.ok(
    honestlyRetired.provenance.caveats.length > 0,
    'while the honest route discloses the uncapped entry — that is exactly what is lost',
  );

  // TRIPWIRE. If a later chunk closes this residue, these assertions start failing and whoever
  // closed it must rewrite this test as a refusal, as chunk 6-1 rewrote Battery D's.
  assert.equal(accumulating.release.met, true, 'the gap exists only where the gate would pass');
});

// --- T124: the statute's test, never TR 2013/5 ¶71B's gloss of it ---------------------------------

test('T124 — ¶71B\'s gloss appears in src/ only as a shortcut being REFUSED, never as the rule', () => {
  // §1's T124 row: "¶71B says a TRIS 'will not be in the retirement phase unless the person has met
  // a specified condition of release', omitting notification. Any comment, docstring or register row
  // whose wording follows ¶71B rather than the statute will encode the wrong answer for Case B; a
  // source-text canary, asserting that the notification requirement appears in the module's own
  // reasoning, is the cheap guard." This is that canary, and it is written over the WHOLE of `src/`
  // rather than over one module, because the gloss is a sentence anyone may reach for.
  //
  // **Measured 2026-09-16 by O66 batch 3.** The refusal MESSAGE was already pinned; the DOCSTRING
  // above it — the paragraph headed "The shortcut this refusal exists to stop" — could be reversed
  // into an endorsement of ¶71B and it failed ZERO tests. A warning nothing reads is a comment.
  const sources = function* (dir) {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const path = join(dir, entry.name);
      if (entry.isDirectory()) yield* sources(path);
      else if (entry.name.endsWith('.ts')) yield path;
    }
  };

  const GLOSS = /has met a specified condition of release/i;
  const carriers = [];
  let filesRead = 0;
  for (const file of sources(SRC)) {
    filesRead += 1;
    // Comment markers off before the collapse: a claim in a doc comment wraps across lines, and a
    // grep of the raw text finds it only by the accident of where the line broke.
    const prose = readFileSync(file, 'utf8')
      .replaceAll(/^\s*(\/\/|\*|\/\*\*)/gm, ' ')
      .replaceAll(/\s+/g, ' ');
    if (GLOSS.test(prose)) carriers.push([file, prose]);
  }
  assert.ok(filesRead > 10, `only ${filesRead} sources walked`);
  // Exactly one file quotes it today. A second is not forbidden — it is required to say the same
  // thing, and this count is what makes a new carrier arrive here rather than arrive silently.
  assert.equal(carriers.length, 1, `${carriers.length} files quote TR 2013/5 ¶71B's gloss`);
  assert.match(carriers[0][0], /core[/\\]superPhase\.ts$/);

  for (const [file, prose] of carriers) {
    // The gloss must be named as ¶71B's and as WRONG, in the same breath.
    assert.match(prose, /TR 2013\/5 ¶71B/, `${file} quotes the gloss without attributing it`);
    assert.match(
      prose,
      /¶71B paraphrases s 307-80\(3\) and drops the notification requirement entirely/,
      `${file} no longer says what ¶71B leaves out`,
    );
    assert.match(
      prose,
      /that paraphrase is wrong for the retired-but-not-notified case/,
      `${file} no longer says that the paraphrase is wrong`,
    );
    // And the statute's own test must be present beside it, with the notification in it.
    assert.match(prose, /s 307-80\(3\)\(b\)\(ii\)/, `${file} drops the operative subparagraph`);
    assert.match(prose, /NOTIFIED|notified the provider|the provider is notified/, `${file} drops the notification act`);
    // The endorsements the reversal needs. A keyword match survives a reversal that keeps every
    // keyword, so the ban is on the sentences and not on the words.
    for (const forbidden of [
      /the shorter statement of the same test/i,
      /an implementer may take that sentence/i,
      /the notification is a formality/i,
      /meeting the condition is what moves the stream/i,
      /¶71B states the rule/i,
    ]) {
      assert.doesNotMatch(prose, forbidden, `${file}: ${forbidden} endorses the gloss T124 forbids`);
    }
  }

  // Vacuity control: the same walk and the same flattening find a sentence that IS in the file.
  assert.match(carriers[0][1], /the superannuation income stream provider \*\*for the superannuation income stream\*\*/);
});
