// P6-8 brief 3, chunk 1 — THE SUPERANNUATION GUARANTEE IS COMPUTED, AND IT IS PAID TO NOBODY.
//
// `superContributions.ts` was written in P3-3a and reached no part of the walk until this chunk.
// What lands here is the CALL and nothing else: the employer's Guarantee is computed from the
// month's own earnings, reported in `Month.notes`, and credited to NOTHING. No balance moves, no
// concessional total counts it, no cap is measured against it. Chunk 2 owns the crediting.
//
// **The one claim this file exists to prove: the earnings base is honest, and nothing in it is
// guessed.**
//
//   * For a Person with no arrangement, the Guarantee is 12% of their salary, and the 12 is read
//     from the dated register record — never from a literal in `projection.ts`.
//   * For a Person who sacrifices, it is 12% of their **PRE-sacrifice** earnings (T17, SGAA
//     ss 10A(1)(h), 10A(4)(b)): the two limbs sum back to the gross, and the figure does not fall
//     by a cent when the sacrifice rises. The intuitive answer — 12% of what the payslip calls
//     gross, which is the post-sacrifice figure — is asserted against explicitly, because it is
//     the mistake the whole shape of `QualifyingEarnings` exists to make unavailable.
//   * The third limb of the base (s 10A(1)(a)–(g) bonuses, allowances, the rest) is **nil, stated**
//     under register O19, and the module's own caveat saying so travels in every note.
//   * Where the year's ceiling cannot be derived at all, the note reports NOT COMPUTED — not nil.
//
// **AND CHUNK 2B CREDITS IT (2026-09-20), so the second half of this file is new.** §4 is the
// floor that keeps a later year computable, §5 is the money arriving NET of the fund's 15% and
// reachable by no limb of the Waterfall, §6 is the destination — derived, stated, or refused by
// name, never guessed — and §7 is what the credit does to the Age Pension on both sides of Age
// Pension age. The chunk-1 claim that NO FIGURE MOVED is retired here, as it asked to be: §5
// re-derives the balance from pure compounding PLUS the credits and pins it to the cent, so a
// build that credited the gross, or credited twice, fails there rather than quietly enriching the
// forecast.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { toCents } from '../dist/core/money.js';
import { SUPER_GUARANTEE_LINE, project } from '../dist/core/projection.js';
import { MINIMUM_MAXIMUM_CONTRIBUTIONS_BASE, maximumContributionsBaseFor } from '../dist/core/superContributions.js';
import { forecastAwoteIndexNumbers } from '../dist/core/superCaps.js';
import { SUPERANNUATION, indexCap, maximumContributionsBase } from '../dist/data/assumptions/super.js';
// The expectation is re-derived from each fixture's own salary, once, in one place — see its header.
import { monthlyGuaranteeCredit } from './fixtures/super-guarantee.mjs';

const SRC = resolve(dirname(fileURLToPath(import.meta.url)), '..', 'src');
const executableCode = (text) =>
  text
    .replaceAll(/\/\*[\s\S]*?\*\//g, '')
    .replaceAll(/`(?:[^`\\]|\\.)*`|'(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*"|\/\/.*$/gm, (match) =>
      match.startsWith('//') ? '' : '""',
    );
const RAW = readFileSync(join(SRC, 'core', 'projection.ts'), 'utf8');
const CODE = executableCode(RAW);

const entry = (id, type, date, owner, params = {}) => ({ id, date, owner, type, params, enabled: true, createdAt: '2026-01-01' });

/**
 * **One Person, and that WAS deliberate.** A couple where one spouse's SAPTO moved and the other's
 * did not raised `MixedSaptoFamilyThresholdError` (register O30) — a trap that had nothing to do
 * with the Guarantee and decided which salaries this file could use. **⚠️ SUPERSEDED 2026-09-21:
 * O30 is CLOSED and that refusal is deleted** — the levy is per taxpayer and no couple is refused
 * for holding two family income thresholds. The single Person stays for the arithmetic it was also
 * chosen for: $120,000 is comfortably under the maximum contributions base, and §3's $300,000 is
 * comfortably over it.
 */
const household = (balance = toCents(300_000)) => ({
  persons: [
    {
      name: 'Ada',
      dateOfBirth: '1980-05-10',
      superInterests: [{ phase: 'accumulation', balance }],
      parcels: [],
      employmentIncomePerFortnight: toCents(4_615),
      workBonusBalance: toCents(0),
    },
  ],
  homeStatus: 'occupied',
});

/**
 * Opens in FY2026-27 and closes in FY2027-28, because BOTH branches of the note are properties of
 * the YEAR: FY2026-27 is the only year whose concessional cap — and so whose SG ceiling — this
 * register can derive, and every later year refuses. A walk inside one year could not tell the two
 * apart, and a single-month fixture could not tell either from a bug.
 */
const SETTINGS = {
  asAtDate: '2026-10-01',
  planningHorizonAge: 48,
  economicSeries: { cpi: 0.025, pblci: 0.025, awote: 0.035, mtawe: 0.035 },
  deemingRates: { lower: 0.0175, upper: 0.0375 },
  nominalReturn: 0.065,
};

const base = (annualSalary) => [
  entry('spend', 'SPEND_CHANGE', '2026-10-01', 'household', { annualSpend: toCents(60_000) }),
  entry('w', 'WORK_PATTERN_CHANGE', '2026-10-01', 'personA', { daysPerWeek: 5, annualSalary }),
];
const sacrifice = (annualAmount) =>
  entry('sac', 'SUPER_CONTRIBUTION', '2026-10-01', 'personA', { kind: 'salarySacrificed', annualAmount, interestIndex: 0 });

const walk = (entries, balance) => project(SETTINGS, household(balance), entries);
const monthAt = (months, isoMonth) => months.find((each) => each.month === isoMonth);
const sgNotes = (months) => months.flatMap((month) => month.notes.filter((note) => note.subject === 'superannuation guarantee').map((note) => ({ month: month.month, ...note })));
const sgAt = (months, isoMonth) => monthAt(months, isoMonth).notes.find((note) => note.subject === 'superannuation guarantee');

const PLAIN = walk(base(toCents(120_000)));
const SACRIFICING = walk([...base(toCents(120_000)), sacrifice(toCents(15_000))]);

// --- §1 The rate is a dated register record, not a number in the walk ----------------------------

test('the 12 is read from the register, stamped for the year, and appears nowhere in projection.ts', () => {
  const charge = SUPERANNUATION.superGuarantee.chargePercentage;
  // A `config` record with an `fy`, not a `constant`: SGAA s 17A(2) states a flat 12 with no forward
  // schedule (register O4), so the figure is stamped for the year it was read for and holding it
  // beyond that year is an assumption the module caveats rather than a fact.
  assert.equal(charge.kind, 'config');
  assert.equal(charge.fy, '2026-27');
  assert.equal(charge.value, 12);
  assert.equal(sgAt(PLAIN, '2026-10').chargePercentage, charge.value, 'the note reports a percentage the register does not state');
  // And the walk holds no copy of it. `12` as a bare number is everywhere in a calendar-driven file
  // (twelfths, months), so the assertion is on the SHAPES a hard-coded SG rate would take.
  assert.doesNotMatch(CODE, /chargePercentage:\s*12/, 'projection.ts states an SG charge percentage of its own');
  assert.doesNotMatch(CODE, /0\.12\b/, 'projection.ts holds an SG rate as a decimal literal');
  // The positive control on both: the walk reaches the register's record through the module.
  assert.match(CODE, /superGuarantee\(fy, \[\{ employer:/, 'projection.ts no longer calls superGuarantee');
});

// --- §2 The honesty claim: 12% of PRE-sacrifice earnings, both ways round ------------------------

/**
 * **Hand-derived, and written down before the walk was run.**
 *
 * Ada is paid $120,000 a year. Under SGAA s 10A(1) her qualifying earnings for the year are
 * $120,000 + $0 sacrificed + $0 of unenumerated other earnings = $120,000, and s 17A(2) charges 12%
 * of it: **$14,400.00**, or 1,440,000 cents.
 *
 * With a $15,000 arrangement the payslip gross falls to $105,000 — and the base does NOT. The two
 * limbs are $105,000 paid plus $15,000 sacrificed, ADDED (ss 10A(1)(h), 10A(4)(b)), which is
 * $120,000 again, and the Guarantee is **$14,400.00 again**. The T17 answer is $12,600.00, which is
 * $1,800 a year of employer contribution a plausible-looking build would lose.
 *
 * ⚠️ **$15,000 AND NOT $20,000, AND THE CONSTRAINT IS THE CONCESSIONAL CAP (P6-8 brief 3, final
 * chunk, 2026-09-20).** The cap is measured against the sacrifice AND the Guarantee together from
 * that date, so Ada's room in FY2026-27 is $32,500 − $14,400 = **$18,100**. The $20,000 this
 * fixture used until then is $34,400 of concessional contributions and is refused by name — a
 * behaviour change, not a defect, and §5 asserts it. The figures below are re-derived at $15,000
 * rather than the fixture being moved to a year with a larger cap, because there is no such year:
 * FY2026-27 is the only one whose cap this register can compute.
 */
const QUALIFYING_EARNINGS = 120_000_00;
/** The most Ada can sacrifice in FY2026-27 once her Guarantee is counted: $32,500 − $14,400. */
const ROOM_FOR_A_SACRIFICE = 18_100_00;
const SG_ON_GROSS = 14_400_00;
const T17_MISTAKE = 12_600_00;
/** What ARRIVES each month: a twelfth of $14,400.00, less the fund's 15% — $1,020.00. */
const MONTHLY_CREDIT = 102_000;
/** The same, on §7's $30,000 salary: 12% is $3,600.00, a twelfth is $300.00, 85% of it is $255.00. */
const MONTHLY_CREDIT_30K = 25_500;

const thrown = (fn) => {
  try { fn(); } catch (error) { return error; }
  return assert.fail('nothing was thrown');
};

test('a Person with NO arrangement: the Guarantee is 12% of their salary, to the cent', () => {
  assert.equal(Math.round(QUALIFYING_EARNINGS * 0.12), SG_ON_GROSS);
  const note = sgAt(PLAIN, '2026-10');
  assert.equal(note.qualifyingEarnings, QUALIFYING_EARNINGS);
  // Nil BECAUSE NOBODY SACRIFICED, and reported rather than omitted: the add-back is visible in the
  // walk that does not use it, which is what makes §2's second half a comparison and not an anecdote.
  assert.equal(note.salarySacrificedAmounts, 0);
  assert.equal(note.annualAmount, SG_ON_GROSS);
  assert.equal(note.person, 'Ada');
});

test('a SACRIFICING Person: the Guarantee is 12% of PRE-sacrifice earnings, and does not fall by a cent (T17)', () => {
  const plain = sgAt(PLAIN, '2026-10');
  const sacrificing = sgAt(SACRIFICING, '2026-10');
  // The control: the sacrifice is really in this walk and really reduced the pay packet, so the
  // equality below is not two identical fixtures agreeing with each other.
  assert.equal(sacrificing.salarySacrificedAmounts, 15_000_00);
  const salaryLine = (months) => monthAt(months, '2026-10').lines.find((line) => line.description === 'Salary, Ada').amount;
  assert.equal(salaryLine(PLAIN) - salaryLine(SACRIFICING), Math.round(15_000_00 / 12), 'the sacrifice never left the pay packet — the fixture is not sacrificing');
  // **THE CLAIM.** The base is the sum of the two limbs, which is the gross; the charge is 12% of
  // it; and both are identical to the walk with no arrangement at all.
  assert.equal(sacrificing.qualifyingEarnings, sacrificing.salarySacrificedAmounts + 105_000_00);
  assert.equal(sacrificing.qualifyingEarnings, QUALIFYING_EARNINGS);
  assert.equal(sacrificing.annualAmount, SG_ON_GROSS);
  assert.equal(sacrificing.annualAmount, plain.annualAmount);
  // And the mistake, named: 12% of the post-sacrifice figure is $12,000, and this build does not
  // report it. Asserted as a NUMBER rather than as a shape, because the wrong answer here is a
  // plausible one and nothing about it looks broken.
  assert.equal(Math.round(105_000_00 * 0.12), T17_MISTAKE);
  assert.notEqual(sacrificing.annualAmount, T17_MISTAKE);
  // A LARGER arrangement does not move it either — the base is insensitive to the sacrifice, which
  // is a stronger statement than one fixture's equality.
  const heavier = sgAt(walk([...base(toCents(120_000)), sacrifice(toCents(18_000))]), '2026-10');
  assert.equal(heavier.salarySacrificedAmounts, 18_000_00);
  assert.equal(heavier.annualAmount, SG_ON_GROSS);
});

test('the third limb is nil BY STATEMENT, and register O19 travels with every figure', () => {
  // `otherQualifyingEarnings` is nil because this register never enumerated s 10A(1)(a)–(g); it is
  // not nil because the model has no bonuses. The difference is the caveat, and it is on the note.
  assert.match(CODE, /otherQualifyingEarnings: toCents\(0\)/, 'the third limb is no longer stated in the walk');
  assert.match(sgAt(PLAIN, '2026-10').note, /register O19/);
  assert.match(sgAt(PLAIN, '2026-10').note, /bonuses, allowances or termination payments/);
});

// --- §3 The ceiling is annual, per employer, and DERIVED (T18) -----------------------------------

/**
 * **Hand-derived.** SGAA s 10A(5) makes the maximum contributions base
 * `floor_to_10(concessional cap × 100 ÷ charge percentage)`: $32,500 × 100 ÷ 12 = $270,833.33,
 * floored to ten dollars = **$270,830**, which is the published figure. 12% of it is **$32,499.60**.
 *
 * The two wrong answers this pins against are both plausible: 12% of the whole $300,000 salary is
 * $36,000 (no ceiling at all), and the PRE-2026 ceiling of $62,500 *per quarter* — the construct
 * that changed on 1 July 2026 — gives $250,000 a year and $30,000 of Guarantee.
 */
test('a salary above the maximum contributions base is charged on the CEILING, and the ceiling is annual', () => {
  // Worked in DOLLARS, which is how `maximumContributionsBase` states s 10A(5): the cap of $32,500
  // ÷ 12% is $270,833.33 and the section floors it to a multiple of ten dollars.
  assert.equal(Math.floor((32_500 * 100) / 12 / 10) * 10, 270_830);
  const note = sgAt(walk(base(toCents(300_000))), '2026-10');
  assert.equal(note.qualifyingEarnings, 300_000_00, 'the ceiling was applied to the EARNINGS rather than to the charge');
  assert.equal(note.annualAmount, Math.round(270_830_00 * 0.12));  // $270,830 × 12%
  assert.equal(note.annualAmount, 32_499_60);
  assert.notEqual(note.annualAmount, 36_000_00, 'no ceiling is being applied at all');
  assert.notEqual(note.annualAmount, 30_000_00, 'the pre-2026 quarterly ceiling is being carried forward (T18)');
});

// --- §4 A year whose CEILING cannot be derived refuses the EXCESS alone, and pays the rest -------
//
// ⚠️ **REWRITTEN ON 2026-09-20 (P6-8 brief 3, chunk 2b), AND THE OLD CLAIM WAS TOO WIDE.** Chunk 1
// reported the WHOLE Guarantee as `null` from FY2027-28, because the year's maximum contributions
// base is derived from the AWOTE-indexed concessional cap and no index number exists for any later
// December quarter. That was honest while nothing was credited. Once the Guarantee is PAID it would
// have meant refusing every employer contribution in this model from 1 July 2027 — for a Person
// earning $120,000, over a ceiling a quarter of a million dollars above their head.
//
// **The floor closes it, and it is a proof rather than an approximation.** ITAA 1997 s 960-285(4)
// makes the concessional cap's $25,000 base amount a FLOOR on the indexed cap; SGAA s 10A(5)'s
// ceiling is monotone in the cap; so every year's ceiling is at least
// `floor_to_10(25,000 × 100 ÷ 12) = $208,330`, and 12% of the first $208,330 of qualifying earnings
// is owed in EVERY year, indexed or not. Earnings at or below that need no index number at all.
// ~~Above it, the charge on the excess is refused BY NAME and the rest is still paid.~~ **Struck on
// 2026-09-21 (P6-12): `project()` now supplies a forward AWOTE series out of the plan's own wage
// growth rate, so the walk has no year above FY2026-27 whose ceiling it cannot derive.** The floor
// argument itself is untouched and still does the whole job for a caller with no series, which is
// what the last two tests of this section now separate.

test('the floor is DERIVED from the concessional cap’s base amount, and no walk holds it as a literal', () => {
  // **The derivation, re-run here against the register's own records rather than pasted.**
  const spec = SUPERANNUATION.capIndexation.concessional.value;
  const charge = SUPERANNUATION.superGuarantee.chargePercentage.value;
  assert.equal(spec.baseAmount, toCents(25_000));
  assert.equal(spec.index, 'AWOTE');
  assert.equal(Math.floor((25_000 * 100) / 12 / 10) * 10, 208_330);
  assert.equal(MINIMUM_MAXIMUM_CONTRIBUTIONS_BASE, toCents(208_330));
  assert.equal(MINIMUM_MAXIMUM_CONTRIBUTIONS_BASE, maximumContributionsBase(spec.baseAmount, charge));
  // **Why it is a FLOOR and not merely this year's figure: s 960-285(4).** A factor of one or less
  // returns the base amount itself, so no year's cap is below it; a factor above one multiplies the
  // base and floors to the rounding multiple, which is never below the base either. Both branches
  // are exercised against the spec, so a change to `indexCap`'s short-circuit fails HERE and not
  // four steps downstream in a walk.
  assert.equal(indexCap(spec, 100, 90), spec.baseAmount, 'a falling index no longer floors at the base amount — the whole argument goes with it');
  assert.equal(indexCap(spec, 100, 100), spec.baseAmount);
  assert.ok(indexCap(spec, 100, 200) > spec.baseAmount);
  // And the walk states neither figure. `208_330` or `25_000` appearing in `projection.ts` would be
  // a second copy of the concessional cap's base amount — the T13/T14 drift, one module along.
  assert.doesNotMatch(CODE, /208[_,]?330/, 'projection.ts holds the SG floor as a literal');
  assert.doesNotMatch(CODE, /25[_,]?000/, 'projection.ts holds the concessional base amount as a literal');
  // The positive control on both: the walk reaches the floor through the module that derives it.
  assert.match(CODE, /superGuaranteeBelowTheFloor\(fy, earnings\)/, 'the walk no longer asks for the floor-safe charge');
});

test('from FY2027-28 a Person UNDER the floor is paid in full, with no index number in sight', () => {
  // Ada earns $120,000, which is $88,330 below the floor, so every month of FY2027-28 states and
  // pays 12% of her whole salary, as the computable year does. Before chunk 2b this was `null`.
  // ⚠️ **AND THE SALARY IS JULY 2027's, NOT OCTOBER 2026's (2026-09-23).** Pay rises with wages: the
  // $120,000 is stated in the wage level of `asAtDate`, and July 2027 is nine months on, so it pays
  // $120,000 × 1.035 ^ (9/12) = $123,136.42, and the Guarantee is 12% of THAT — $14,776.37 a year,
  // still far under the floor. $14,400 was the flat-pay figure.
  const grown = Math.round(12_000_000 * 1.035 ** (9 / 12));
  assert.equal(grown, 12_313_642);
  const july = sgAt(PLAIN, '2027-07');
  assert.equal(july.annualAmount, Math.round(grown * 0.12));
  assert.equal(july.annualAmount, 14_776_37);
  assert.equal(july.annualAmountCredited, 14_776_37);
  assert.equal(july.chargePercentage, 12);
  assert.equal(july.creditedToSuperannuation, Math.round(Math.round(14_776_37 / 12) * 0.85));
  assert.match(july.note, /no ceiling and no index number is needed to state this figure/);
  assert.doesNotMatch(july.note, /NOT COMPUTED AT ALL/);
  // The control that no ceiling was needed to say it: asking for FY2027-28's ceiling with NO forward
  // series still throws, so this Person's figure cannot have come from one. (It is the walk that
  // supplies a series now — see the derived-ceiling test below — and this call deliberately does not.)
  assert.throws(() => maximumContributionsBaseFor('2027-28'), { name: 'MissingIndexNumberError' });
  assert.equal(maximumContributionsBaseFor('2026-27').amount, toCents(270_830));
});

// ⚠️ **REPLACED ON 2026-09-21 (P6-12). THE WALK HAS NO UNINDEXABLE YEAR LEFT, AND THAT IS A
// FINDING WORTH STATING PLAINLY.** This test used to walk a $300,000 earner into FY2027-28, where
// the ceiling could not be derived, and assert that the charge on the first $208,330 was paid and
// the charge on the remaining $91,670 was REFUSED by name. The register now holds December 2025's
// published wage level and `project()` supplies a forward series out of the plan's own wage growth
// rate, so **every year the walk can reach from FY2026-27 has a derivable ceiling** — and every year
// before it fails earlier, on `SuperGuaranteeEarningsBaseError`, because there is no qualifying
// earnings base at all. The `MissingIndexNumberError` catch in `superGuaranteeYear` is therefore
// **unreachable from `project()`**. It is kept, and it is kept tested: `superGuarantee` is a public
// function of `superContributions.ts` and a caller who passes no series still gets the refusal, which
// the second test below exercises directly. What is asserted on the walk is the unreachability
// itself, so the day someone reintroduces a year with no number this file goes red rather than quiet.
test('ABOVE the floor the whole charge is now stated, on a ceiling DERIVED from the plan’s wage assumption', () => {
  // $300,000 of qualifying earnings. FY2026-27's published ceiling is $270,830 and 12% of it is
  // $32,499.60. **FY2027-28's ceiling is the same $270,830 and it is derived, not published**: the
  // cap for that year is $32,500 (2051.10 grown one year at 3.5% is 2122.888; over 1533.40 the factor
  // is 1.385; $25,000 × 1.385 = $34,622.50 floors to $32,500), and SGAA s 10A(5) is
  // `floor_to_10($32,500 × 100 ÷ 12)` = $270,830. One year of 3.5% does not carry the cap over a
  // $2,500 step, so the two years agree — and the agreement is the check, because the ceiling moved
  // from "cannot be derived" to a figure that has to match the published year exactly.
  const rich = walk(base(toCents(300_000)));
  const computable = sgAt(rich, '2026-10');
  assert.equal(computable.annualAmount, 32_499_60);
  assert.equal(computable.annualAmountCredited, 32_499_60);

  const derived = sgAt(rich, '2027-07');
  assert.equal(derived.annualAmount, 32_499_60, 'FY2027-28 no longer states a whole-year charge — the forward series is not reaching the walk');
  assert.equal(derived.annualAmountCredited, 32_499_60);
  assert.equal(derived.chargePercentage, 12);
  assert.equal(maximumContributionsBaseFor('2027-28', forecastAwoteIndexNumbers('2027-28', SETTINGS.economicSeries.awote)).amount, toCents(270_830));
  // **AND IT IS LABELLED, which is half the ruling.** The figure is quoted to the cent, and nobody
  // has published it; the note says so in its own words, and the provenance says so in its caveats.
  assert.match(derived.note, /NOT a published figure for this year/);
  assert.match(derived.note, /It is a forecast, and it is yours/);
  assert.match(derived.note, /the AWOTE index number for the quarter ending 2026-12-31 is unverified/);
  // The published year is NOT labelled, because there is nothing to disclose about it.
  assert.doesNotMatch(computable.note, /NOT a published figure for this year/);
  assert.doesNotMatch(computable.note, /is unverified/);
  // **The money that arrives.** A twelfth of $32,499.60 is $2,708.30, less the fund's 15%.
  assert.equal(derived.creditedToSuperannuation, monthlyGuaranteeCredit(300_000_00, 270_830_00));
  assert.equal(derived.creditedToSuperannuation, 270_830 - Math.round(270_830 * 0.15));
  assert.equal(derived.creditedToSuperannuation, 230_205);
  const line = monthAt(rich, '2027-07').lines.find((each) => each.description.startsWith(SUPER_GUARANTEE_LINE));
  assert.equal(line.amount, derived.creditedToSuperannuation);
  // **THE UNREACHABILITY, ASSERTED.** No month of this walk refuses a charge for want of an index
  // number, and every month pays something.
  assert.equal(sgNotes(rich).filter((note) => /REFUSED rather than guessed/.test(note.note)).length, 0);
  assert.equal(sgNotes(rich).filter((note) => note.creditedToSuperannuation > 0).length, sgNotes(rich).length);
  assert.equal(sgNotes(rich).filter((note) => note.annualAmount === null).length, 0);
});

test('the floor argument still holds, and the refusal it protects is still there for a caller with no series', () => {
  // The branch the walk can no longer reach, exercised where it lives. A caller who supplies no
  // forward series gets `MissingIndexNumberError` for FY2027-28 exactly as before — and the floor
  // still pays the part no index number is needed for, which is the argument that made a year with
  // no ceiling survivable in the first place and is what protects any year the anchor cannot reach.
  assert.throws(() => maximumContributionsBaseFor('2027-28'), { name: 'MissingIndexNumberError' });
  assert.equal(maximumContributionsBaseFor('2026-27').amount, toCents(270_830));
  assert.equal(
    maximumContributionsBaseFor('2027-28', forecastAwoteIndexNumbers('2027-28', 0)).amount,
    toCents(270_830),
    'a nil wage growth rate must hold the ceiling at the last published level, not collapse it to the floor',
  );
  assert.ok(MINIMUM_MAXIMUM_CONTRIBUTIONS_BASE < toCents(270_830));
});

test('a walk that OPENS before 1 July 2026 states no Guarantee at all, and credits nothing', () => {
  // The other refusal, and the one the floor cannot save: FY2025-26 has no qualifying earnings base
  // and no charge percentage in this register, so there is no rate to apply to the floor either.
  // Pay rising with wages (2026-09-23) is not this test's subject: `awote: 0` holds the salary at
  // the figure stated, so July's credit is the flat $1,020.00 (and FY2026-27's cap is published,
  // so nothing else here reads the rate).
  const early = project({ ...SETTINGS, asAtDate: '2026-05-01', economicSeries: { ...SETTINGS.economicSeries, awote: 0 } }, household(), [
    entry('spend', 'SPEND_CHANGE', '2026-05-01', 'household', { annualSpend: toCents(60_000) }),
    entry('w', 'WORK_PATTERN_CHANGE', '2026-05-01', 'personA', { daysPerWeek: 5, annualSalary: toCents(120_000) }),
  ]);
  const may = sgAt(early, '2026-05');
  assert.equal(may.annualAmount, null);
  assert.equal(may.annualAmountCredited, null, 'a year with no charge percentage credited a figure');
  assert.equal(may.chargePercentage, null);
  assert.equal(may.creditedToSuperannuation, 0);
  assert.equal(may.interestIndex, null, 'a destination was resolved for a month that pays nothing');
  assert.match(may.note, /NOT COMPUTED AT ALL/);
  assert.match(may.note, /qualifying earnings on 1 July 2026/);
  assert.deepEqual(monthAt(early, '2026-05').lines.filter((line) => line.description.startsWith(SUPER_GUARANTEE_LINE)), []);
  // And July, one month into the new base, pays: the refusal is about the YEAR and nothing else.
  assert.equal(sgAt(early, '2026-07').creditedToSuperannuation, MONTHLY_CREDIT);
});

// --- §5 THE MONEY ARRIVES, NET OF THE FUND'S 15% — and it is not cash ----------------------------

test('the credit is the Guarantee less the fund’s 15%, and the GROSS is asserted against by name', () => {
  // **HAND-DERIVED.** 12% of $120,000 is $14,400.00 a year; a twelfth is $1,200.00; the fund pays
  // Income Tax Rates Act 1986 s 26(1)(a)'s 15% on it, which is $180.00, and **$1,020.00 lands**.
  assert.equal(Math.round(SG_ON_GROSS / 12), 120_000);
  assert.equal(Math.round(120_000 * 0.15), 18_000);
  assert.equal(MONTHLY_CREDIT, 102_000);
  assert.equal(MONTHLY_CREDIT, monthlyGuaranteeCredit(120_000_00), 'the shared helper and this hand-derivation disagree');
  const line = monthAt(PLAIN, '2026-10').lines.find((each) => each.description.startsWith(SUPER_GUARANTEE_LINE));
  assert.equal(line.amount, MONTHLY_CREDIT);
  // **The mutation this test exists for, asserted as a NUMBER.** Crediting the gross is a plausible
  // build: the money the employer sends IS $1,200.00. What makes it wrong is that the fund never
  // receives the last $180 of it, and a build that credited it would run 15% rich, compounding, for
  // the length of every walk — the one direction this project refuses.
  assert.notEqual(line.amount, 120_000, 'the GROSS Guarantee is being credited — the fund’s 15% is not taken');
  assert.equal(120_000 - MONTHLY_CREDIT, 18_000);
  // The tax and the gross are both on the line, so the row can be read as an arithmetic.
  assert.ok(line.provenance.determination.some((each) => /120000 cents of employer Superannuation Guarantee, less 18000 cents of contributions tax at 0.15/.test(each)));
  assert.equal(line.provenance.register, 'superannuation contributions tax');
  // And the cap sentence. It said *"no contributions cap is measured against it"* for the length of
  // chunk 2b and says the opposite from the final chunk of brief 3: the Guarantee counts towards
  // the general cap, and PLAIN's Ada — who states no sacrifice — is never checked because a
  // Guarantee alone cannot breach a cap its own ceiling is derived from.
  assert.ok(line.provenance.determination.some((each) => /it counts towards the general concessional cap/.test(each)));
  assert.ok(line.provenance.determination.some((each) => /On its own it cannot exceed the cap/.test(each)));
  for (const each of line.provenance.determination) {
    assert.doesNotMatch(each, /no contributions cap is measured against it/);
  }
});

test('the note, the line and the BALANCE are one figure — asserted as an identity over every month', () => {
  // The defect this forecloses is the one `feedback-one-fact-one-expression` names: two readers of
  // one fact drifting apart. There is one `contributionsTax` per Person per month and all three of
  // these read it, so the identity holds in every month of the walk or in none.
  let checked = 0;
  for (const month of PLAIN) {
    const note = month.notes.find((each) => each.subject === 'superannuation guarantee');
    const line = month.lines.find((each) => each.description.startsWith(SUPER_GUARANTEE_LINE));
    if (note === undefined) { assert.equal(line, undefined); continue; }
    assert.equal(line.amount, note.creditedToSuperannuation, `${month.month}: the note and the line disagree`);
    checked += 1;
  }
  assert.ok(checked > 12, `only ${checked} months carried a Guarantee`);
  // **And the BALANCE moved by exactly that, re-derived from pure compounding plus the credits.**
  // Ada's only interest is Accumulation Phase held by a Person under Age Pension age, so it is the
  // whole of `protectedAssets` (§4.8) and there is no drawdown against it in this walk.
  const factor = (1 + SETTINGS.nominalReturn) ** (1 / 12);
  let expected = 300_000_00;
  for (const month of PLAIN) {
    assert.equal(month.protectedAssets, expected, `${month.month}: the balance is not growth plus the Guarantee`);
    const credited = month.notes.find((each) => each.subject === 'superannuation guarantee')?.creditedToSuperannuation ?? 0;
    expected = Math.floor(expected * factor) + credited;
  }
  // The control that the credit is really in that arithmetic: pure growth alone lands elsewhere.
  let growthOnly = 300_000_00;
  for (const _month of PLAIN) growthOnly = Math.floor(growthOnly * factor);
  assert.ok(PLAIN.at(-1).protectedAssets > growthOnly * 1.05, 'the balance is pure growth — nothing was contributed');
});

test('the Guarantee is NOT CASH: no limb of the Waterfall can reach it, and no balance holds it', () => {
  // **The other half of chunk 4's rule, and the reason this line is `'wealth'`.** The money goes
  // from the employer to the fund; the Household never holds it. A `'cash'` line would put a year's
  // employer contributions into the Offset Account and let the Waterfall spend them on groceries.
  for (const months of [PLAIN, SACRIFICING]) {
    for (const month of months) {
      for (const line of month.lines.filter((each) => each.description.startsWith(SUPER_GUARANTEE_LINE))) {
        assert.equal(line.effect, 'wealth', `${month.month}: the Guarantee is a cash line`);
        assert.equal(line.direction, 'inflow');
        assert.ok(line.amount > 0);
      }
      const cash = month.lines.reduce((total, line) => total + (line.effect !== 'cash' ? 0 : line.direction === 'inflow' ? line.amount : -line.amount), 0);
      assert.equal(month.openingBalance + cash, month.closingBalance, `${month.month} does not reconcile`);
    }
  }
  // **And the Waterfall itself is untouched by this chunk.** Asserted over the RAW text of the two
  // things that define it — the limb list and the draw — because a sliced-up executable strip could
  // pass this by cutting the wrong window. The window is the source between the two declarations
  // and the first `};` after the draw.
  const from = RAW.indexOf('export const WATERFALL_LIMBS');
  const to = RAW.indexOf('\n};', RAW.indexOf('export const drawWaterfall'));
  const waterfall = RAW.slice(from, to);
  assert.ok(from > 0 && to > from, 'the Waterfall declarations moved — this window is not measuring them');
  assert.ok(waterfall.length > 3_000, 'the window that should contain the Waterfall is too small');
  assert.match(waterfall, /drawWaterfall = \(target: Cents, sources: WaterfallSources\)/, 'the window does not contain the draw');
  assert.match(waterfall, /releasedSuperannuation/, 'the window does not contain the limbs');
  assert.equal([...waterfall.matchAll(/[Gg]uarantee/g)].length, 0, 'a Waterfall limb now names the Guarantee');
});

test('the walk’s concessional total NAMES the Guarantee as an employer contribution — and the cap still does not', () => {
  // ⚠️ **THE CHUNK-1 TRIPWIRE, RETIRED AS IT ASKED TO BE.** It asserted that `employerContributions`
  // was hard-coded nil everywhere in the walk, so that the chunk feeding the Guarantee into
  // `concessionalContributions` had to come back here and say so. This is that chunk saying so.
  //
  // There are TWO `ConcessionalContributions` per Person-month now and the pair is deliberate: the
  // sacrifice's, which still names a nil employer limb because a sacrifice is not an employer
  // contribution, and the Guarantee's, which names the month's own credit. The 15% is flat, so the
  // charge on each is the same whether it is computed alone or inside a larger total.
  assert.match(CODE, /employerContributions: monthly/, 'the Guarantee no longer reaches concessionalContributions');
  assert.match(CODE, /employerContributions: toCents\(0\)/, 'the SACRIFICE limb no longer states its nil employer contribution');
  assert.equal([...CODE.matchAll(/concessionalContributions\(\{/g)].length, 2);
  // ⚠️ **AND THE CAP NOW SEES BOTH LIMBS (P6-8 brief 3, final chunk).** This tripwire read *"what
  // is still NOT done, and it is the cap"* and counted two mentions of
  // `refuseStatedContributionOverGeneralCap`; the function is
  // `refuseConcessionalContributionsOverGeneralCap` now, it is called ONCE — in the month a level
  // is stated, not on every entry — and it takes the four s 291-25 components rather than an
  // amount. The count is of the IMPORT and the one call site, and the components are pinned by
  // name so a limb cannot be quietly dropped back to nil.
  assert.equal([...CODE.matchAll(/refuseConcessionalContributionsOverGeneralCap/g)].length, 2);
  assert.equal([...CODE.matchAll(/refuseStatedContributionOverGeneralCap/g)].length, 0, 'the sacrifice-alone cap check is back in the walk');
  // ⚠️ **RE-SPELLED BY P6-9 CHUNK 3, and the FACT is unchanged.** The four s 291-25 limbs were an
  // object literal at this call site; they are `concessionalComponentsOf(guarantee, sacrifice)`
  // now, because the year-end Division 293 settlement needs the same four limbs over the year's
  // totals and a second literal there would have been a second statement of which contributions
  // this model holds. The cap check still counts the Guarantee and still counts the sacrifice, and
  // it is the ARGUMENTS that are pinned rather than the field names.
  assert.match(CODE, /concessionalComponentsOf\(\n\s*guaranteeForTheYear\[index\] \?\? toCents\(0\),\n\s*sacrificedThisMonth\[index\] \?\? toCents\(0\),\n\s*\)/, 'the cap check no longer counts the Guarantee and the sacrifice together');
  assert.match(CODE, /employerContributions,\n\s*salarySacrificed,/, 'the helper no longer names the two limbs it is handed');
  // Four since 2026-09-23: the year-to-date cap check builds its components from the year's two
  // accumulators through the same helper — the declaration, the month, the settlement, that check.
  assert.equal([...CODE.matchAll(/concessionalComponentsOf/g)].length, 4, 'the four limbs are stated somewhere other than the one helper');
  const guarantee = monthAt(SACRIFICING, '2026-10').lines.find((line) => line.description.startsWith(SUPER_GUARANTEE_LINE));
  const sacrifice = monthAt(SACRIFICING, '2026-10').lines.find((line) => line.description.startsWith('Salary sacrifice into superannuation'));
  assert.ok(guarantee.provenance.determination.some((each) => /it counts towards the general concessional cap/.test(each)));
  assert.ok(sacrifice.provenance.determination.some((each) => /The CAP is measured on the two TOGETHER/.test(each)));
  // The superseded claims are gone from the live lines, not reworded around them.
  for (const line of [guarantee, sacrifice]) {
    for (const each of line.provenance.determination) {
      assert.doesNotMatch(each, /no contributions cap is measured against it/);
      assert.doesNotMatch(each, /against this stated arrangement alone/);
    }
  }
  // **AND THE ROOM IS THE CAP LESS THE GUARANTEE, as a walk and not as prose.** $18,100 is walked
  // and a cent more is refused, so the Guarantee is in the total this Person is measured on.
  assert.equal(ROOM_FOR_A_SACRIFICE + SG_ON_GROSS, 32_500_00);
  const atLevel = (annualAmount) =>
    walk([...base(toCents(120_000)), entry('sac', 'SUPER_CONTRIBUTION', '2026-10-01', 'personA', { kind: 'salarySacrificed', annualAmount, interestIndex: 0 })]);
  assert.ok(atLevel(ROOM_FOR_A_SACRIFICE).length > 0);
  assert.throws(() => atLevel(ROOM_FOR_A_SACRIFICE + 1), { name: 'ExcessConcessionalContributionsNotModelledError' });
  // The two lines are separate and both arrive: a build that merged them would lose one.
  assert.equal(sacrifice.amount, Math.round(Math.round(15_000_00 / 12) * 0.85));
  assert.equal(guarantee.amount, MONTHLY_CREDIT, 'the sacrifice moved the Guarantee — T17 says it cannot');
});

// --- §6 THE DESTINATION: derived, stated, or REFUSED — never guessed (register O82) --------------

test('one accumulation interest and no nomination: DERIVED, and nothing is stated', () => {
  const note = sgAt(PLAIN, '2026-10');
  assert.equal(note.interestIndex, 0);
  assert.match(note.note, /paid into interest 0 \(Superannuation, Accumulation Phase\)/);
  // The Household's own plan states nothing at all, which is the ordinary case and every plan file
  // written before 2026-09-20.
  assert.equal(household().persons[0].superInterests[0].statedEmployerContributionDestination, undefined);
});

test('a NOMINATION is taken at its word, and the money lands in the interest it names', () => {
  // Two accumulation interests. The first is the larger and the second is nominated, so "the larger
  // one" and "the first one" — the two guesses available — both give the wrong answer here.
  const nominated = (slot) => ({
    persons: [{
      ...household().persons[0],
      superInterests: [
        { phase: 'accumulation', balance: toCents(300_000), ...(slot === 0 ? { statedEmployerContributionDestination: 'superannuationGuarantee' } : {}) },
        { phase: 'accumulation', balance: toCents(1_000), ...(slot === 1 ? { statedEmployerContributionDestination: 'superannuationGuarantee' } : {}) },
      ],
    }],
    homeStatus: 'occupied',
  });
  const second = project(SETTINGS, nominated(1), base(toCents(120_000)));
  assert.equal(sgAt(second, '2026-10').interestIndex, 1);
  const line = monthAt(second, '2026-10').lines.find((each) => each.description.startsWith(SUPER_GUARANTEE_LINE));
  assert.equal(line.amount, MONTHLY_CREDIT);
  // **The balance that moved is the NOMINATED one**: the small interest grows by the credit and the
  // large one grows by compounding alone. Asserted on the interests' own growth lines, because both
  // are in the same pool and `protectedAssets` could not tell them apart.
  const factor = (1 + SETTINGS.nominalReturn) ** (1 / 12);
  const secondBalance = (months) => {
    let held = toCents(1_000);
    for (const month of months) {
      const credited = month.notes.find((each) => each.subject === 'superannuation guarantee')?.creditedToSuperannuation ?? 0;
      held = Math.floor(held * factor) + credited;
    }
    return held;
  };
  const twelveMonths = second.slice(0, 12);
  const grownLarge = (() => { let held = toCents(300_000); for (const _m of twelveMonths) held = Math.floor(held * factor); return held; })();
  assert.equal(second[12].protectedAssets, grownLarge + secondBalance(twelveMonths));
  // And the other way round: nominating the FIRST puts it there instead, on the same Household.
  assert.equal(sgAt(project(SETTINGS, nominated(0), base(toCents(120_000))), '2026-10').interestIndex, 0);
  // **The mutation this pair exists for**: a build that credited "the only one", or interest 0,
  // would answer 0 for both of these fixtures.
  assert.notEqual(
    sgAt(project(SETTINGS, nominated(0), base(toCents(120_000))), '2026-10').interestIndex,
    sgAt(second, '2026-10').interestIndex,
  );
});

test('TWO accumulation interests and NO nomination is REFUSED BY NAME, and the message says how to fix it', () => {
  // The case chunk 2a deliberately left legal at the door — a plan file written before the field
  // existed is well formed and its author was never put the question — and which the WALK must not
  // guess, because this is where the money moves.
  const ambiguous = {
    persons: [{
      ...household().persons[0],
      superInterests: [
        { phase: 'accumulation', balance: toCents(300_000) },
        { phase: 'accumulation', balance: toCents(1_000) },
      ],
    }],
    homeStatus: 'occupied',
  };
  const error = thrown(() => project(SETTINGS, ambiguous, base(toCents(120_000))));
  assert.equal(error.name, 'RangeError');
  assert.match(error.message, /Ada holds 2 accumulation superannuation interests and has nominated none of them/);
  assert.match(error.message, /UNDETERMINED \(register O82\)/);
  // **The fix is NAMED, in the message, with the field's own spelling** — a refusal a user cannot
  // act on is a dead end.
  assert.match(error.message, /statedEmployerContributionDestination: "superannuationGuarantee"/);
  assert.match(error.message, /"the larger one" and "the first one" are both guesses/i);
  // And the control: the same Household with a nomination walks, so the refusal is about the
  // ABSENCE of an answer and not about holding two accounts.
  const fixed = {
    persons: [{
      ...ambiguous.persons[0],
      superInterests: [
        { ...ambiguous.persons[0].superInterests[0], statedEmployerContributionDestination: 'superannuationGuarantee' },
        ambiguous.persons[0].superInterests[1],
      ],
    }],
    homeStatus: 'occupied',
  };
  assert.equal(sgAt(project(SETTINGS, fixed, base(toCents(120_000))), '2026-10').interestIndex, 0);
});

test('a SALARY with NO accumulation interest is REFUSED: the Guarantee must land in a named account', () => {
  // The user's ruling, 2026-09-20. The alternatives were both worse: crediting nothing understates
  // the Household by 12% of a salary every month with nothing on screen to say so (the P4-12 silent
  // no-op), and inventing an interest states a fact about the world that the plan does not.
  const noAccount = { persons: [{ ...household().persons[0], superInterests: [] }], homeStatus: 'occupied' };
  const error = thrown(() => project(SETTINGS, noAccount, base(toCents(120_000))));
  assert.match(error.message, /Ada is paid a salary and holds no accumulation superannuation interest/);
  assert.match(error.message, /a balance of nil is a statement, and is enough/);
  // **A RETIREMENT-PHASE interest is not an account that can receive it**, which is the same ground
  // `checkContributionTargets` refuses a sacrifice into one at the door.
  const pensionOnly = {
    persons: [{ ...household().persons[0], superInterests: [{ phase: 'accountBasedPension', balance: toCents(300_000) }] }],
    homeStatus: 'occupied',
  };
  assert.match(thrown(() => project(SETTINGS, pensionOnly, base(toCents(120_000)))).message, /holds no accumulation superannuation interest/);
  // **And a Person who is not PAID is not refused anything** — the refusal is about a Guarantee
  // with nowhere to go, not about holding no super.
  const unpaid = { persons: [{ ...household().persons[0], superInterests: [], employmentIncomePerFortnight: toCents(0) }], homeStatus: 'occupied' };
  const walked = project(SETTINGS, unpaid, [entry('spend', 'SPEND_CHANGE', '2026-10-01', 'household', { annualSpend: toCents(10_000) })]);
  assert.deepEqual(sgNotes(walked), [], 'a Person nobody employs was given a Guarantee');
  // The fix the message names — a nil balance — is enough, and it is what the fixtures took.
  const fixed = { persons: [{ ...household().persons[0], superInterests: [{ phase: 'accumulation', balance: toCents(0) }] }], homeStatus: 'occupied' };
  assert.equal(sgAt(project(SETTINGS, fixed, base(toCents(120_000))), '2026-10').creditedToSuperannuation, MONTHLY_CREDIT);
});

test('a destination stated on a RETIREMENT-PHASE interest is refused in the walk as well as at the door', () => {
  // `project()` is called directly by every fixture in this suite and by every caller that built a
  // `Household` in code, so the door's refusal is not the walk's. The walk's says the same thing.
  const misdirected = {
    persons: [{
      ...household().persons[0],
      superInterests: [
        { phase: 'accountBasedPension', balance: toCents(300_000), statedEmployerContributionDestination: 'superannuationGuarantee' },
        { phase: 'accumulation', balance: toCents(0) },
      ],
    }],
    homeStatus: 'occupied',
  };
  const error = thrown(() => project(SETTINGS, misdirected, base(toCents(120_000))));
  assert.match(error.message, /which is in the accountBasedPension phase/);
  assert.match(error.message, /closed to contributions/);
  // ⚠️ **AND IT IS NOT SILENTLY REDIRECTED to the accumulation interest sitting beside it**, which
  // is the plausible mercy and is a guess about a Person's fund.
  assert.doesNotMatch(String(error.message), /credited/);
  // TWO claims on one Person is refused too, on the ground that a Person has one fund or none.
  const twoClaims = {
    persons: [{
      ...household().persons[0],
      superInterests: [
        { phase: 'accumulation', balance: toCents(300_000), statedEmployerContributionDestination: 'superannuationGuarantee' },
        { phase: 'accumulation', balance: toCents(1_000), statedEmployerContributionDestination: 'superannuationGuarantee' },
      ],
    }],
    homeStatus: 'occupied',
  };
  assert.match(thrown(() => project(SETTINGS, twoClaims, base(toCents(120_000)))).message, /states the employer contribution destination on 2 superannuation interests/);
});

// --- §7 WHAT THE CREDIT DOES TO THE AGE PENSION, both signs ------------------------------------

test('for a Person UNDER Age Pension age the Guarantee is EXEMPT, and the pension does not move', () => {
  // §4.8: an Accumulation Phase interest held by a Person below Age Pension age is outside BOTH
  // means tests. Ada is 46 in this walk, so every cent credited is exempt — and the control that
  // makes this a finding is the SAME Household aged past the threshold, where it is not.
  //
  // **The pair is one fixture and one figure: the date of birth.**
  const pensioner = (dateOfBirth) => ({
    persons: [{ ...household(toCents(0)).persons[0], dateOfBirth }],
    homeStatus: 'occupied',
  });
  const entries = [
    entry('spend', 'SPEND_CHANGE', '2026-10-01', 'household', { annualSpend: toCents(60_000) }),
    entry('w', 'WORK_PATTERN_CHANGE', '2026-10-01', 'personA', { daysPerWeek: 5, annualSalary: toCents(30_000) }),
  ];
  // Pay rising with wages (2026-09-23) is not this test's subject: `awote: 0` holds the $30,000 flat,
  // so each month credits the same `MONTHLY_CREDIT_30K` the arithmetic below is written in.
  const flat = { ...SETTINGS, economicSeries: { ...SETTINGS.economicSeries, awote: 0 } };
  const young = project({ ...flat, planningHorizonAge: 48 }, pensioner('1980-05-10'), entries);
  const old = project({ ...flat, planningHorizonAge: 72 }, pensioner('1955-04-17'), entries);
  const pensionAt = (months, month) => monthAt(months, month)?.lines.find((line) => line.description === 'Age Pension')?.amount;
  // The younger Person gets no Age Pension at all, so the exemption is asserted on the ASSETS: the
  // credited Guarantee is wholly in `protectedAssets` and contributes nothing to `assessableAssets`.
  assert.equal(pensionAt(young, '2026-12'), undefined);
  assert.equal(monthAt(young, '2026-12').protectedAssets, MONTHLY_CREDIT_30K * 2 + Math.floor(MONTHLY_CREDIT_30K * ((1 + SETTINGS.nominalReturn) ** (1 / 12))) - MONTHLY_CREDIT_30K);
  assert.equal(monthAt(young, '2026-12').assessableAssets, monthAt(young, '2026-12').openingBalance, 'the exempt Guarantee reached the assessable band');
  // The older Person's identical interest IS assessed, and the deeming on it takes the pension down.
  assert.ok(monthAt(old, '2026-12').assessableAssets > monthAt(old, '2026-12').openingBalance);
  assert.equal(monthAt(old, '2026-12').protectedAssets, 0);
  assert.ok(pensionAt(old, '2026-12') > 0);
  assert.ok(pensionAt(old, '2026-12') < pensionAt(old, '2026-10'), 'the deemed Guarantee is not reaching the income test at all');
});

// --- §8 The register's own row ------------------------------------------------------------------

test('register O82 is on the record as CLOSED, and it states which way the residue runs', () => {
  const register = readFileSync(join(SRC, '..', 'docs', 'assumptions-register.md'), 'utf8');
  const row = register.split('\n').find((line) => line.startsWith('| O82 |'));
  assert.ok(row, 'section 8 has no O82 row');
  assert.match(row, /DESTINATION is derivable from the plan file/, 'O82 is not the item it was opened as');
  // The DIRECTION sentence — the thing a reader acts on — and it changed with this chunk: an
  // undetermined destination is now a refusal rather than an understatement.
  assert.match(row, /Direction: nothing is understated by this residue any more/, 'O82 no longer states which way its error runs');
  assert.match(row, /refused by name in the walk/);
  assert.doesNotMatch(row, /Nothing in the walk reads the field yet/, 'the row still says the walk cannot read the field');
  // **O81 was narrowed by this chunk and the narrowing is canaried too.** Its row said the
  // contribution target's phase is checked at the door only and the walk never re-checks it. That
  // is still true of a STATED sacrifice and is no longer true of the Guarantee, whose destination
  // is phase-checked every month — so the row carries both halves and both are read back here.
  const o81 = register.split('\n').find((line) => line.startsWith('| O81 |'));
  assert.ok(o81, 'section 8 has no O81 row');
  assert.match(o81, /PARTLY DISCHARGED ON 2026-09-20 \(P6-8 brief 3, chunk 2b\), FOR THE GUARANTEE ONLY/);
  assert.match(o81, /The SACRIFICE target is unchanged and this row stands for it/);
  assert.match(o81, /Direction: it OVERSTATES the Household/, 'O81 no longer states which way its error runs');
  // The vacuity control: the same lookup over an id nobody has opened finds nothing.
  assert.equal(register.split('\n').find((line) => line.startsWith('| O99 |')), undefined);
});
