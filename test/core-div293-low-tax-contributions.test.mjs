// P6-9 chunk 2 — THE s 293-20(1)(b) LIMB, BUILT FROM THE CAP CHECK'S OWN COMPONENTS AND CHARGED
// NOWHERE.
//
// Chunk 1 gave every Person of every assessment a `Div293Income`. This gives a sacrificing Person a
// `LowTaxContributions` built out of the SAME `ConcessionalContributionComponents` that
// `refuseConcessionalContributionsOverGeneralCap` measures against the year's cap. **Still no
// charge**: `division293Tax` is called from nowhere, there is no `Division 293 tax` line, and the
// walk's note still says in terms that the further 15% is not made — chunk 1's count of 30 is
// re-asserted here for that reason.
//
// **What is defended here.**
//
//   1. **The constructor.** `lowTaxContributionsFromComponents` adds the four s 291-25 limbs through
//      `concessionalContributions` and subtracts the excess, and it carries the P3-5 U1 / O35
//      `unverified` label, because it is the same inference `lowTaxContributionsFromConcessional`
//      makes and not the stated s 293-30 figure the primary-verified route wants.
//   2. **The UNREACHABLE branch is real law and is kept.** s 293-25(b)'s subtraction cannot run in a
//      figure this walk builds, and the branch is exercised directly here so that it is tested by
//      something even though `project()` cannot reach it.
//   3. **The unreachability is PROVED, not asserted.** A Household whose sacrifice plus Guarantee
//      exceeds the year's general cap is refused BY NAME and `project()` returns no `Month` at all —
//      in FY2026-27 against the published cap, and in FY2027-28 against no cap at all.
//   4. **No figure moves**, and the honest weak point: nothing consumes this value, so the CALL is
//      defended by source pins alone until chunk 3. They are marked as the stopgaps they are.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { toCents } from '../dist/core/money.js';
import { project } from '../dist/core/projection.js';
import {
  ACCUMULATION_INTEREST_ONLY,
  division293Tax,
  lowTaxContributionsFromComponents,
} from '../dist/core/div293.js';
import { concessionalContributions, personalDeductibleContributions } from '../dist/core/superConcessional.js';
import { div293Income } from '../dist/core/incomeBases.js';
import { SUPERANNUATION } from '../dist/data/assumptions/super.js';

const NIL_DEDUCTIBLE = personalDeductibleContributions(toCents(0), { noticeOfIntentAcknowledged: false });

/** The shape the walk hands to both readers: the Guarantee, the sacrifice, and two named nils. */
const components = (employer, sacrificed) => ({
  employerContributions: toCents(employer),
  salarySacrificed: toCents(sacrificed),
  personalDeductible: NIL_DEDUCTIBLE,
  otherConcessional: toCents(0),
});

// --- 1. The constructor -------------------------------------------------------------------------

test('the figure is the four s 291-25 limbs added, and the addition is `concessionalContributions`', () => {
  const parts = components(31_200, 1_000);
  const figure = lowTaxContributionsFromComponents({
    fy: '2026-27',
    components: parts,
    excessConcessionalContributions: toCents(0),
    interests: ACCUMULATION_INTEREST_ONLY,
  });
  assert.equal(figure.lowTaxContributedAmounts, toCents(32_200));
  // The one adding expression, asserted as an identity rather than re-added here by hand.
  assert.equal(figure.lowTaxContributedAmounts, concessionalContributions(parts));
  assert.equal(figure.excessConcessionalContributions, toCents(0));
  assert.equal(figure.amount, figure.lowTaxContributedAmounts);
  assert.equal(figure.fy, '2026-27');
});

test('the derived route is `unverified` and carries O35, exactly as the assessment route does', () => {
  const figure = lowTaxContributionsFromComponents({
    fy: '2026-27',
    components: components(31_200, 1_000),
    excessConcessionalContributions: toCents(0),
    interests: ACCUMULATION_INTEREST_ONLY,
  });
  // P3-5 U1 / register O35: a SIS Act s 99G(6) refunded amount would remain a low tax contributed
  // amount after it stopped being a concessional contribution, so deriving one from the other
  // UNDERSTATES Division 293. Routing the walk through the stated s 293-30 constructor would have
  // produced the same cents today wearing `primary-verified`, which it has not earned.
  assert.equal(figure.provenance.confidence, 'unverified');
  assert.ok(
    figure.provenance.caveats.includes('superannuation.division293.lowTaxContributedAmountDivergence is unverified'),
    `the O35 caveat did not survive into the walk's figure: ${JSON.stringify(figure.provenance.caveats)}`,
  );
});

test('a Subdiv 293-D/E/F Person is refused BY NAME rather than given an ordinary s 293-25 figure', () => {
  for (const [field, subdivision] of [
    ['definedBenefitInterest', '293-D'],
    ['constitutionallyProtectedStateHigherLevelOfficeHolder', '293-E'],
    ['commonwealthJustice', '293-F'],
  ]) {
    assert.throws(
      () =>
        lowTaxContributionsFromComponents({
          fy: '2026-27',
          components: components(31_200, 1_000),
          excessConcessionalContributions: toCents(0),
          interests: { ...ACCUMULATION_INTEREST_ONLY, [field]: true },
        }),
      { name: 'ModifiedLowTaxContributionsError', subdivision },
    );
  }
});

test('a negative limb and an excess larger than the amounts it came out of are both refused', () => {
  const build = (parts, excess) =>
    lowTaxContributionsFromComponents({
      fy: '2026-27',
      components: parts,
      excessConcessionalContributions: excess,
      interests: ACCUMULATION_INTEREST_ONLY,
    });
  assert.throws(() => build(components(-1, 0), toCents(0)), { name: 'RangeError' });
  assert.throws(() => build(components(1_000, 0), toCents(1_001)), { name: 'RangeError' });
  assert.throws(() => build(components(1_000, 0), toCents(-1)), { name: 'RangeError' });
});

// --- 2. The branch `project()` cannot reach, kept and exercised here ------------------------------

test('s 293-25(b) subtracts a real excess — the branch the walk cannot reach, tested directly', () => {
  // $40,000 of contributions against FY2026-27's $32,500 general cap is $7,500 of excess, and
  // s 293-10 says the second 15% is not payable in respect of it — so it comes OUT before the
  // charge, and the low tax contributions are the contributions AS CAPPED.
  const parts = components(31_200, 8_800);
  const excess = toCents(7_500);
  const figure = lowTaxContributionsFromComponents({
    fy: '2026-27',
    components: parts,
    excessConcessionalContributions: excess,
    interests: ACCUMULATION_INTEREST_ONLY,
  });
  assert.equal(figure.lowTaxContributedAmounts, toCents(40_000));
  assert.equal(figure.amount, toCents(32_500));
  assert.equal(figure.lowTaxContributedAmounts - figure.amount, excess);

  // **The DIRECTION of the branch, which is why keeping it matters.** The subtraction only ever runs
  // downward: the same Person with the excess left in is charged MORE. A build that dropped the
  // branch as dead code would, the day the Div 291 refusal is lifted, charge the second 15% on the
  // very dollars s 293-10 exempts.
  const base = div293Income({
    taxableIncome: toCents(230_000),
    assessableFhssReleasedAmount: toCents(0),
    familyTrustDistributionTaxReduction: toCents(0),
    reportableFringeBenefitsTotal: toCents(0),
    reportableSuperannuationContributions: toCents(0),
    totalNetInvestmentLoss: toCents(0),
    lowRateCapLumpSumComponent: toCents(0),
  });
  const withSubtraction = division293Tax({ fy: '2026-27', income: base, lowTaxContributions: figure });
  const withoutSubtraction = division293Tax({
    fy: '2026-27',
    income: base,
    lowTaxContributions: lowTaxContributionsFromComponents({
      fy: '2026-27',
      components: parts,
      excessConcessionalContributions: toCents(0),
      interests: ACCUMULATION_INTEREST_ONLY,
    }),
  });
  assert.ok(withoutSubtraction.tax > withSubtraction.tax, 's 293-25(b) must be able to LOWER the charge');
  assert.equal(withSubtraction.tax, toCents(1_875)); // 0.15 × (262,500 − 250,000)
  assert.equal(withoutSubtraction.tax, toCents(3_000)); // 0.15 × (270,000 − 250,000)
});

// --- 3. The unreachability, proved on the walk ---------------------------------------------------

const person = (name, dateOfBirth, over = {}) => ({
  name,
  dateOfBirth,
  superInterests: [
    { phase: 'accumulation', balance: toCents(0), statedEmployerContributionDestination: 'superannuationGuarantee' },
  ],
  parcels: [],
  employmentIncomePerFortnight: toCents(0),
  workBonusBalance: toCents(0),
  ...over,
});

const SETTINGS = (asAtDate, planningHorizonAge = 51) => ({
  asAtDate,
  planningHorizonAge,
  economicSeries: { cpi: 0.025, pblci: 0.025, awote: 0.035, mtawe: 0.035 },
  deemingRates: { lower: 0.0175, upper: 0.0375 },
  nominalReturn: 0.065,
});

/** Single-Person, deliberately: a mixed-SAPTO couple runs into register O30 instead. */
const VAL = { persons: [person('Val', '1976-05-10', { employmentIncomePerFortnight: toCents(10_000) })], homeStatus: 'occupied' };

const entry = (id, type, date, owner, params = {}) => ({ id, date, owner, type, params, enabled: true, createdAt: '2026-01-01' });
const plan = (asAtDate, sacrificed) => [
  entry('spend', 'SPEND_CHANGE', asAtDate, 'household', { annualSpend: toCents(60_000) }),
  entry('sac', 'SUPER_CONTRIBUTION', asAtDate, 'personA', {
    kind: 'salarySacrificed',
    annualAmount: toCents(sacrificed),
    interestIndex: 0,
  }),
];

test('an over-cap Household is refused BEFORE any Month exists — so the excess is always nil', () => {
  // Val is paid $260,000 and her employer's Guarantee is $31,200, which leaves $1,300 of room under
  // FY2026-27's $32,500 cap. $10,000 of sacrifice is $8,700 over it.
  let months = 'project() returned';
  assert.throws(
    () => {
      months = project(SETTINGS('2026-09-16'), VAL, plan('2026-09-16', 10_000));
    },
    { name: 'ExcessConcessionalContributionsNotModelledError' },
    'an over-cap sacrifice must be refused, not walked',
  );
  // **This is the proof, and it is the strong half of it**: the throw escapes `project()`, so there
  // is no partial walk, no Month, and no Person carrying a `LowTaxContributions` with an excess in
  // it. Every figure built by the line under test sits downstream of the refusal on the line above.
  assert.equal(months, 'project() returned', 'no Month was produced for the refused Household');

  // And the same arrangement one dollar inside the room walks, so the refusal above is the CAP and
  // not some other objection to the fixture.
  const walked = project(SETTINGS('2026-09-16'), VAL, plan('2026-09-16', 1_000));
  assert.ok(walked.length > 0);
});

// ⚠️ **NARROWED ON 2026-09-21 (P6-12), AND THE GROUND IT STOOD ON IS GONE RATHER THAN WEAKENED.**
// This test used to walk FY2027-28 and assert `MissingIndexNumberError`, on the ground that "from
// FY2027-28 there is no cap at all". That was true of a build that held one published AWOTE level;
// this one holds the December 2025 level as a record and grows it by the plan's own wage assumption,
// so FY2027-28 has a cap — a derived one, labelled as a forecast. The refusal did not become wrong;
// its ground was discharged for FORWARD years. What is left of it is the direction the series cannot
// run: **backwards**. A year before the last published December quarter gets no index number, because
// compounding a rate into the past would invent a figure the ABS has already published, and it would
// invent it lower. Both arms are asserted, so the refusal is retired only where it was discharged.
test('a year BEFORE the published wage level still refuses by name — the series does not run backwards', () => {
  // FY2025-26. The Guarantee is not computed at all before 1 July 2026 (no qualifying earnings
  // base), so the total tested is the sacrifice alone — $30,000, which is above the $25,000 base
  // amount and therefore needs the year's own cap. There is none, and there will never be one from
  // this box: `forecastAwoteIndexNumbers` returns an empty series for any year before the anchor.
  let months = 'project() returned';
  assert.throws(
    () => {
      months = project(SETTINGS('2026-03-16', 53), VAL, plan('2026-03-16', 30_000));
    },
    { name: 'MissingIndexNumberError' },
  );
  assert.equal(months, 'project() returned');
  // And below the floor the same year walks, so the refusal above is the missing index number and
  // not the year itself.
  assert.ok(project(SETTINGS('2026-03-16', 53), VAL, plan('2026-03-16', 20_000)).length > 0);
});

test('FY2027-28 is walked now, against a cap DERIVED from the plan\'s own wage assumption', () => {
  // Val's Guarantee is $31,200 and FY2027-28's derived cap is $32,500 — the December 2025 level of
  // 2051.10 grown one year at the stated 3.5% is 2122.888, over the December 2016 base of 1533.40
  // is a factor of 1.385 (s 960-285(6), three decimals), × $25,000 = $34,622.50, floored to the
  // $2,500 step = $32,500. So $1,000 of sacrifice fits and $2,000 does not, and the refusal for the
  // second says in terms that the cap it used was a forecast rather than the law.
  assert.ok(project(SETTINGS('2027-09-16', 53), VAL, plan('2027-09-16', 1_000)).length > 0);
  let message = '';
  assert.throws(
    () => project(SETTINGS('2027-09-16', 53), VAL, plan('2027-09-16', 2_000)),
    (error) => {
      message = error.message;
      return error.name === 'ExcessConcessionalContributionsNotModelledError';
    },
  );
  assert.match(message, /is 3250000 cents/);
  assert.match(message, /FORECAST AND NOT THE LAW/);
});

test('the walk CHARGES the second 15% on the Guarantee ALONE, and says so in every note', () => {
  // ⚠️ **INVERTED BY CHUNK 3, NOT DELETED.** This test asserted a count of ZERO Division 293 lines
  // and the disclosure that none was charged — which is what chunk 2 was allowed to leave standing
  // and what chunk 3 had to change. The fixture is unchanged; only the expectation is.
  //
  // **AND THE PERSON CHARGED HERE STATES NO SACRIFICE AT ALL**, which is the widening chunk 3 made
  // to the loop above: Val's employer Guarantee ALONE is $31,200 of low tax contributions against a
  // $259,000 base, and at $260,000 of salary a sacrifice big enough to matter is refused by the cap
  // before any Month exists (the test above proves that). A charge wired only to the sacrificing
  // Person would have missed the ordinary high earner entirely.
  const HOUSEHOLD = {
    persons: [person('Val', '1976-05-10', { employmentIncomePerFortnight: toCents(10_000) }), person('Ken', '1978-02-02')],
    homeStatus: 'occupied',
  };
  // Pay rising with wages (2026-09-23) is not this test's subject: `awote: 0` holds Val's $260,000 flat,
  // so both years carry the same Guarantee. A proved control: every figure asserted here is the same at
  // nil on the build before pay rose. At nil the FY2027-28 cap is still $32,500 — 2051.10 ÷ 1533.40 is
  // a factor of about 1.338, and $25,000 × 1.338 floors to the same $2,500 step — so the ceiling below
  // is still $270,830 and still above her salary.
  const flat = SETTINGS('2026-09-16');
  const months = project({ ...flat, economicSeries: { ...flat.economicSeries, awote: 0 } }, HOUSEHOLD, []);
  const lines = months.flatMap((month) => month.lines).filter((line) => /Divi?s?i?o?n? ?293|div293/i.test(line.description));
  assert.deepEqual([...new Set(lines.map((line) => line.description))], ['Division 293 tax, Val']);
  // HAND-DERIVED: 12% of $260,000 is $31,200 of low tax contributions; the base is $259,000; the sum
  // is $290,200, which is $40,200 over the threshold — MORE than the contributions, so the
  // CONTRIBUTIONS limb of s 293-20(1)'s `min` binds and the tax is 15% of $31,200 = $4,680 a year,
  // $390.00 a month.
  //
  // ⚠️ **THE SECOND YEAR USED TO BE LOWER, AND ON 2026-09-21 IT STOPPED BEING (P6-12).** What stood
  // here: *"From July 2027 the maximum contributions base cannot be derived, so the walk credits
  // only the part SGAA s 960-285(4)'s $25,000 floor guarantees: 12% of $208,330 = $24,999.60 …
  // $312.495 a month, which `mulCents` rounds to $312.50. The direction: a Guarantee this build will
  // not fully derive carries a Division 293 charge this build therefore UNDER-states — the
  // flattering direction."* That under-statement is the defect P6-12 closed, and the figure moving
  // UP is the repair showing itself.
  //
  // **RE-DERIVED, not re-based.** FY2027-28's concessional cap is now derived — December 2025's
  // published 2051.10 grown one year at the plan's stated 3.5% is 2122.888, over the December 2016
  // base of 1533.40 gives a factor of 1.385, and $25,000 × 1.385 = $34,622.50 floors to $32,500.
  // SGAA s 10A(5)'s ceiling is `floor_to_10($32,500 × 100 ÷ 12)` = $270,830, which is ABOVE Val's
  // $260,000 salary, so her whole Guarantee is charged: 12% of $260,000 = $31,200, exactly as in
  // FY2026-27. The sum with the $259,000 base is $290,200, the excess $40,200 — still more than the
  // contributions — so the contributions limb of s 293-20(1) binds and the tax is 15% of $31,200 =
  // $4,680 a year, $390.00 a month. **The two years are now the same figure, and that agreement is
  // the check**: the ceiling never bound on this salary in either year, so nothing but the missing
  // index number was ever making them differ.
  const byYear = (fy) => [...new Set(lines.filter((line) => line.provenance.fy === fy).map((line) => line.amount))];
  assert.deepEqual(byYear('2026-27'), [toCents(390)]);
  assert.deepEqual(byYear('2027-28'), [toCents(390)]);
  assert.deepEqual([...new Set(lines.map((line) => line.amount))], [toCents(390)]);
  const notes = months.flatMap((month) => (month.notes ?? []).map((note) => JSON.stringify(note)));
  const div293Notes = notes.filter((note) => /Divi?s?i?o?n? ?293|div293/i.test(note));
  // The count of 30 is re-derived and unchanged — it is the 30 Superannuation Guarantee notes of a
  // 30-month walk — and what those notes SAY is now the opposite. See the chunk-1 file for why the
  // count survives a change of wording.
  assert.equal(div293Notes.length, 30);
  for (const note of div293Notes) assert.match(note, /DIVISION 293'S FURTHER 15% IS CHARGED ON IT/);
  for (const note of div293Notes) assert.doesNotMatch(note, /further 15% is not charged on it/);
  // The threshold and the rate are still dated records rather than literals anywhere in this chunk.
  assert.equal(SUPERANNUATION.division293.threshold.kind, 'constant');
  assert.equal(SUPERANNUATION.division293.rate.kind, 'constant');
  assert.equal(SUPERANNUATION.division293.threshold.value, toCents(250_000));
});

// --- 4. The wiring — CHUNK 2's SOURCE PINS, RETIRED WHERE CHUNK 3 GAVE THEM A FIGURE ------------
//
// ⚠️ **What chunk 2 wrote here:** *"Nothing consumes the figure yet, so no assertion over any walk's
// output can see the CALL. Feeding it a second, hand-assembled total, or a non-nil excess, or the
// other Person's components compiles, runs and moves not one cent. The pins below are therefore the
// only defence of the call site, they are stopgaps, and they are recorded as such in TODO.md to be
// retired the day chunk 3 gives these values a consumer."*
//
// **This is that day.** All three of those mutations now move money: the total is 15% of the
// binding limb, so a different total is a different line; a non-nil excess LOWERS the figure and so
// the charge; and the other Person's components charge the wrong Person. Each is killed by a dollar
// assertion in `core-div293-charge.test.mjs`, and the stopgaps for them are GONE rather than kept
// alongside. What is left below is the one claim no figure can make — that the cap check and the
// Division 293 figure are ONE expression of the total rather than two that happen to agree.
const SOURCE = readFileSync(new URL('../src/core/projection.ts', import.meta.url), 'utf8');
const CODE = SOURCE.split('\n')
  .filter((line) => !/^\s*(\/\/|\/?\*)/.test(line))
  .join('\n');
const occurrences = (needle) => CODE.split(needle).length - 1;

test('the cap check and the Division 293 figure read ONE components object, not two totals', () => {
  // The whole of the defence against a second, parallel total: the four s 291-25 limbs are named in
  // ONE place — `concessionalComponentsOf` — and every reader is handed the result of it. Two
  // literals, or a second `addCents` of the Guarantee and the sacrifice, breaks every line of this.
  //
  // ⚠️ **RE-DERIVED BY CHUNK 3: the object literal became a function.** Chunk 2 pinned
  // `const components = {` at exactly one occurrence, which was true while the month loop was the
  // only place the limbs were needed. The year-end settlement needs the same four limbs over the
  // YEAR's totals, so a second literal would have appeared there — the very defect this pin exists
  // to prevent. The limbs moved into one helper instead, and the pin follows them.
  assert.equal(occurrences('const concessionalComponentsOf = ('), 1);
  // Three since 2026-09-23: the year-to-date cap check reads the year's accumulators through it too.
  assert.equal(occurrences('concessionalComponentsOf('), 3, 'the month loop, the year-to-date cap check and the year-end settlement, and nothing else');
  assert.equal(occurrences('const components = {'), 0, 'the four limbs are stated somewhere other than the one helper');
  assert.equal(occurrences('        components,\n'), 2, 'the one object must be passed to BOTH readers');
  assert.equal(occurrences('refuseConcessionalContributionsOverGeneralCap({'), 1);
  assert.equal(occurrences('lowTaxContributionsFromComponents({'), 2, 'the month\'s figure and the year\'s at the settlement');
  // The two limbs the caller supplies are named exactly once each, inside that one helper.
  assert.equal(occurrences('  employerContributions,\n'), 1);
  assert.equal(occurrences('  salarySacrificed,\n'), 1);
  // Vacuity control: the strip above must not have eaten the code it is searching.
  assert.ok(CODE.includes('refuseConcessionalContributionsOverGeneralCap'), 'the comment strip removed the call site');
});

test('the excess passed by the walk is a stated nil, and the interests are the accumulation-only set', () => {
  // Both calls, whole: the month's figure and the year's at the settlement. `toCents(0)` for the
  // excess appears FOUR times in the file now — these two, limb (c)'s own s 995-1 reduction inside
  // `asSaptoPerson`, and (from P3-22h step 3, 2026-09-22) the SAME s 995-1 reduction rebuilt for the
  // Person(s) `frankingForIndividual` is assessed against at the year-end settlement — and a bare
  // count of the identifier cannot tell them apart.
  assert.equal(
    occurrences(
      'lowTaxContributionsForTheYear[index] = lowTaxContributionsFromComponents({\n' +
        '        fy,\n' +
        '        components,\n' +
        '        excessConcessionalContributions: toCents(0),\n',
    ),
    1,
    'the walk must pass the shared components and a nil excess in the month loop',
  );
  assert.equal(occurrences('excessConcessionalContributions: toCents(0),'), 4);
  assert.equal(occurrences('interests: ACCUMULATION_INTEREST_ONLY,'), 2);
  // Nothing in the walk may state a Div 293 interest fact: `false` is a claim about a Person, and
  // the day the model holds a defined benefit interest this count is what fails.
  assert.equal(occurrences('definedBenefitInterest'), 0);
});

test('the charge is made TWICE and no more — the monthly accrual and the year-end settlement', () => {
  // ⚠️ **THE INVERSE OF CHUNK 2's `occurrences('division293Tax') === 0`.** Two call sites, and a
  // third would be a third assessment of one tax. The line names exist and are used once each.
  assert.equal(occurrences('division293Tax({'), 2);
  // Each description is spelled once, in its exported helper, and each helper is written by one
  // push site (plan_ai.md §13: the summariser reads the same expressions).
  assert.equal(occurrences('`${DIVISION_293_LINE}, ${name}`'), 1);
  assert.equal(occurrences('`${DIVISION_293_TRUE_UP_LINE}, ${name}, ${fy}`'), 1);
  assert.equal(occurrences('description: division293Description(person.name),'), 1);
  assert.equal(occurrences('description: division293TrueUpDescription(person.name, completed.fy),'), 1);
  // And chunk 2's own superseded sentence is struck in the source rather than deleted from it.
  assert.match(SOURCE, /~~`division293Tax` is still called from nowhere\.~~ SUPERSEDED 2026-09-20 BY CHUNK 3/);
});

// --- The register's own record of the unreachable branch, and its direction ----------------------

const REGISTER = readFileSync(new URL('../docs/assumptions-register.md', import.meta.url), 'utf8');
const O83 = REGISTER.split('\n').filter((line) => line.startsWith('| O83 |'));

test('register O83 records the unreachable branch AND which way it is wrong', () => {
  assert.equal(O83.length, 1, 'O83 must be stated exactly once');
  const [row] = O83;
  assert.match(row, /s 293-25\(b\)/);
  assert.match(row, /unreachable/i);
  // **The direction sentence, contiguously.** A record that says only "unreachable" is half a
  // record: it must say that the figure is held at its maximum by the nil, that nothing is
  // understated or overstated today, and that the branch only ever runs DOWNWARD if the Div 291
  // refusal is lifted. A reword that drops any of those three is a different claim.
  assert.match(row, /neither understates nor overstates/);
  assert.match(row, /only ever (runs )?downward/);
  assert.match(row, /kept[^|]*not deleted/i);
  // It must name what makes it unreachable, so the day that refusal is narrowed this row is found.
  assert.match(row, /ExcessConcessionalContributionsNotModelledError/);
});

test('the same direction is stated at the call site, and the two cannot drift apart silently', () => {
  assert.match(SOURCE, /UNREACHABLE FROM `project\(\)` \(register O83\)/);
  assert.match(SOURCE, /neither understates nor overstates this figure by a cent/);
  assert.match(SOURCE, /the subtraction only\s+\/\/ ever runs downward/);
});
