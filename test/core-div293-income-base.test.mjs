// P6-9 chunk 1 — THE DIVISION 293 INCOME BASE, BUILT FROM THE WALK'S OWN LIMBS AND CHARGED NOWHERE.
//
// `div293.ts` has been built and tested since P3-5 and `projection.ts` had no hit for it at all.
// This chunk closes half of that: `div293IncomeForWalk` assembles the s 293-20(1)(a) base out of the
// two figures `asSaptoPerson` already derives, and the walk builds one for every Person of every
// assessment. ~~**No charge is computed.** `division293Tax` is still called from nowhere, there is
// still no `Division 293 tax` line, and register O77(i) — the one remaining gap that FLATTERS the
// household — is still open and still disclosed as open.~~
//
// ⚠️ **SUPERSEDED ON 2026-09-20 BY P6-9 CHUNK 3, WHICH IS WHAT THIS FILE WAS WRITTEN AGAINST.** The
// charge is wired: `division293Tax` is called, a `Division 293 tax, <name>` line is emitted in every
// month a Person is over the threshold, and the disclosure that said it was not charged has been
// corrected everywhere it was made. The struck sentence is kept because chunk 1 was committed on it.
// The consequences for THIS file are stated where they fall: the walk test below now asserts the
// charge and the corrected wording, and the SOURCE PINS that chunk 1 called its honest weak point
// are retired in favour of assertions over the money, because the base finally has a consumer.
//
// **What is defended here.**
//
//   1. **A real above-threshold Person, hand-derived.** Val is paid $10,000 a fortnight, which is
//      $260,000 a year, which is $259,000 of taxable income once s 25-130(2)'s $1,000 standard
//      deduction bites in FY2026-27. Her Div 293 income is that $259,000 and it is OVER the
//      threshold — read from the register record, never written here as a literal.
//   2. **A below-threshold Person, so the figure is not merely "large".**
//   3. **The s 293-20(1)(a) disregard is REAL and not a coincidence of the fixture.** A Person
//      sacrificing $10,000 has $10,000 of reportable superannuation contributions, and their Div 293
//      income is unchanged by it — while their Rebate Income, built from the same figure in the same
//      function, is $10,000 higher. That pair is the whole of trap T9 on one Person.
//   4. **The base falls with the sacrifice.** It is built on the sacrifice-REDUCED taxable income,
//      because that is what paragraph (a) is. A base built on the gross would be $10,000 too high
//      and would pull a Person over $250,000 who is not over it.
//   5. **It fails LOUDLY.** Nothing consumes the base yet, so a green suite proves little on its
//      own — except that the construction itself refuses a bad limb by name, and the walk runs the
//      construction on every Person of every month.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { toCents } from '../dist/core/money.js';
import {
  annualSalaryFromFortnightly,
  div293IncomeForWalk,
  project,
  taxableIncomeFromSalary,
} from '../dist/core/projection.js';
import { rebateIncome, reportableSuperannuationContributions } from '../dist/core/incomeBases.js';
import { personalDeductibleContributions } from '../dist/core/superConcessional.js';
import { SUPERANNUATION } from '../dist/data/assumptions/super.js';

/** The walk's own limb (c) for a Person who sacrifices `sacrificed` and nothing else. */
const reportableFor = (sacrificed) =>
  reportableSuperannuationContributions({
    salarySacrificed: sacrificed,
    otherReportableEmployerContributions: toCents(0),
    personalDeductible: personalDeductibleContributions(toCents(0), { noticeOfIntentAcknowledged: false }),
    excessConcessionalContributions: toCents(0),
  });

test('Val, at $10,000 a fortnight, has $259,000 of Division 293 income and is over the threshold', () => {
  // $10,000 × 26 = $260,000 of assessable salary, less the $1,000 standard deduction = $259,000.
  const annual = annualSalaryFromFortnightly(toCents(10_000));
  assert.equal(annual, toCents(260_000));
  const income = taxableIncomeFromSalary('2026-27', annual, toCents(0));
  assert.equal(income, toCents(259_000));

  const base = div293IncomeForWalk(income, reportableFor(toCents(0)));
  assert.equal(base, toCents(259_000));

  // The threshold comes from the register record, which is `kind: 'constant', everyYear: true` and
  // deliberately NOT indexed. A second `toCents(250_000)` here would be the T14 drift the record
  // exists to prevent: it would agree today and diverge the year s 293-20 is amended.
  const threshold = SUPERANNUATION.division293.threshold;
  assert.equal(threshold.kind, 'constant');
  assert.equal(threshold.everyYear, true);
  assert.equal(SUPERANNUATION.division293.rate.kind, 'constant');
  assert.equal(SUPERANNUATION.division293.rate.everyYear, true);
  assert.ok(base > threshold.value, 'Val is over the Division 293 threshold on her income alone');
});

test('a Person at $60,000 is well below the threshold, so the figure is not merely "large"', () => {
  const income = taxableIncomeFromSalary('2026-27', annualSalaryFromFortnightly(toCents(2_000)), toCents(0));
  assert.equal(income, toCents(51_000)); // $2,000 × 26 = $52,000, less the $1,000 deduction.
  const base = div293IncomeForWalk(income, reportableFor(toCents(0)));
  assert.equal(base, toCents(51_000));
  assert.ok(base < SUPERANNUATION.division293.threshold.value);
});

test('s 293-20(1)(a) disregards limb (c): the sacrifice is in Rebate Income and NOT in this base', () => {
  const gross = annualSalaryFromFortnightly(toCents(10_000));
  const sacrificed = toCents(10_000);
  // Paragraph (a) is the sacrifice-REDUCED taxable income: $260,000 − $10,000 − $1,000.
  const income = taxableIncomeFromSalary('2026-27', (gross - sacrificed), toCents(0));
  assert.equal(income, toCents(249_000));
  const reportable = reportableFor(sacrificed);
  assert.equal(reportable, sacrificed);

  const base = div293IncomeForWalk(income, reportable);

  // The disregard: the same $10,000 that lifts Rebate Income leaves this base alone.
  assert.equal(base, toCents(249_000));
  assert.equal(base, income);
  assert.equal(base, div293IncomeForWalk(income, reportableFor(toCents(0))));
  assert.equal(
    rebateIncome({
      taxableIncome: income,
      reportableSuperContributions: reportable,
      totalNetInvestmentLoss: toCents(0),
      adjustedFringeBenefitsTotal: toCents(0),
      assessableFhssReleasedAmounts: toCents(0),
    }),
    toCents(259_000),
  );
  // And the base is $10,000 BELOW the gross-built figure a limb-(a) error would produce — which is
  // the difference between being over $250,000 and being under it for this Person.
  assert.ok(base < SUPERANNUATION.division293.threshold.value);
  assert.equal(toCents(259_000) - base, sacrificed);
});

test('the base refuses a bad limb BY NAME, which is how it fails loudly with nothing consuming it', () => {
  const income = taxableIncomeFromSalary('2026-27', annualSalaryFromFortnightly(toCents(10_000)), toCents(0));
  assert.throws(() => div293IncomeForWalk(income, undefined), {
    name: 'MissingSurchargeComponentError',
    component: 'reportableSuperannuationContributions',
  });
  assert.throws(() => div293IncomeForWalk(income, Number.NaN), { name: 'MissingSurchargeComponentError' });
  assert.throws(() => div293IncomeForWalk(income, toCents(-1)), { name: 'RangeError' });
  assert.throws(() => div293IncomeForWalk(toCents(-1), reportableFor(toCents(0))), { name: 'RangeError' });
});

// --- The base is built on every Person of every month, and it charges nothing --------------------

const person = (name, dateOfBirth, over = {}) => ({
  name,
  dateOfBirth,
  superInterests: [{ phase: 'accumulation', balance: toCents(0) }],
  parcels: [],
  employmentIncomePerFortnight: toCents(0),
  workBonusBalance: toCents(0),
  ...over,
});

const SETTINGS = {
  asAtDate: '2026-09-16',
  planningHorizonAge: 51,
  economicSeries: { cpi: 0.025, pblci: 0.025, awote: 0.035, mtawe: 0.035 },
  deemingRates: { lower: 0.0175, upper: 0.0375 },
  nominalReturn: 0.065,
};

const HOUSEHOLD = {
  persons: [
    person('Val', '1976-05-10', { employmentIncomePerFortnight: toCents(10_000) }),
    person('Ken', '1978-02-02'),
  ],
  homeStatus: 'occupied',
};

test('a walk over an above-threshold Household CHARGES — and the base under the charge is this one', () => {
  // ⚠️ **INVERTED BY CHUNK 3, NOT DELETED.** This test read *"charges nothing, and still SAYS it
  // charges nothing"* and pinned a count of zero Division 293 lines. Chunk 3 charges it, so the
  // assertion is inverted: one line per month, for the Person over the threshold and for no other.
  const months = project(SETTINGS, HOUSEHOLD, []);
  assert.ok(months.length > 0);
  const lines = months.flatMap((month) => month.lines.map((line) => line.description));
  const charged = lines.filter((description) => /Divi?s?i?o?n? ?293|div293/i.test(description));
  assert.deepEqual([...new Set(charged)], ['Division 293 tax, Val'], 'Ken has no salary and must never be charged');
  assert.equal(charged.length, months.length, 'the charge is monthly, in every month of the walk');

  // **AND THE BASE THIS FILE IS ABOUT IS NOW VISIBLE IN THE MONEY, which is what retires chunk 1's
  // source pins.** The line's determination reports the SUM the threshold was tested against, and
  // that sum is the s 293-20(1)(a) base plus the s 293-20(1)(b) contributions: $259,000 + $31,200 =
  // $290,200. A base built on the GROSS $260,000 would read $291,200 here, and a base that added
  // limb (c) back would read higher again — both of which chunk 1 could only catch by reading the
  // source, because nothing consumed the figure.
  const first = months[0].lines.find((line) => line.description === 'Division 293 tax, Val');
  assert.match(first.provenance.determination.join(' '), /being the lesser of 3120000 cents of low tax contributions and the 4020000 cents by which 29020000 exceeds the 25000000 cent threshold/);
  assert.equal(toCents(259_000) + toCents(31_200), 29_020_000);

  // Not a bare /293/: the Superannuation Guarantee note carries `3120000`-shaped cent amounts, so a
  // bare digit match is 31 false positives on this very fixture and would pass for the wrong reason.
  const notes = months.flatMap((month) => (month.notes ?? []).map((note) => JSON.stringify(note)));
  const div293Notes = notes.filter((note) => /Divi?s?i?o?n? ?293|div293/i.test(note));

  // ⚠️ **THE COUNT OF 30 IS RE-DERIVED AND KEPT; THE WORDING IS THE OPPOSITE OF WHAT IT WAS.** The
  // 30 notes are the Superannuation Guarantee notes of the 30 months of this walk, each carrying
  // `SUPER_GUARANTEE_CREDITED` — so the count is a property of the WALK's length and the number of
  // Guarantee notes in it, and chunk 3 changed neither. What chunk 3 changed is what those notes
  // SAY: the sentence *"Division 293's further 15% is not charged on it"* became false the moment
  // the line above was emitted, so it is corrected in the constant rather than left standing beside
  // a charge that contradicts it. Both halves are pinned — the new claim, and the absence of the
  // old one anywhere in any note.
  assert.equal(div293Notes.length, 30);
  assert.equal(months.length, 30);
  for (const note of div293Notes) {
    assert.match(note, /DIVISION 293'S FURTHER 15% IS CHARGED ON IT/);
    assert.doesNotMatch(note, /further 15% is not charged on it/);
    // ⚠️ **AND THE SAME AGAIN FOR THE RELEASE ELECTION (P6-10).** *"...is not modelled"* became
    // false the day the election was performed, so the constant says IS PERFORMED and the old
    // sentence must appear in no note.
    assert.match(note, /SUBDIV 293-B ELECTION TO HAVE THAT CHARGE RELEASED FROM THE FUND INSTEAD IS PERFORMED/);
    assert.doesNotMatch(note, /election to have that charge RELEASED FROM THE FUND instead is not modelled/);
    // And the limitation that IS left is named, so the note is not silently claiming completeness.
    // ⚠️ **IT WAS TWO RESIDUALS UNTIL 2026-09-20 AND IS NOW ONE (P6-11).** *"no screen offers that
    // election"* became false the day the household form grew the control, so the note says where
    // the election is made and keeps the ONE residual that still flatters — the partial financial
    // year — rather than dropping the caveat with the sentence that carried it.
    assert.match(note, /THE ELECTION IS STATED ON THE HOUSEHOLD FORM/);
    assert.doesNotMatch(note, /no screen offers that election/);
    assert.match(note, /PARTIAL financial year never reaches a settlement/);
    assert.match(note, /register O84, residual \(i\)/);
  }
});

// --- The wiring, pinned in the SOURCE — RETIRED IN PART BY CHUNK 3 -----------------------------
//
// ⚠️ **CHUNK 1's HONEST WEAK POINT, AND WHAT IS LEFT OF IT.** Chunk 1 wrote: *"the base is computed
// on every Person of every month and NOTHING CONSUMES IT, so feeding `asSaptoPerson`'s wrong figure
// into it — the gross instead of the sacrifice-reduced taxable income, or the other Person's —
// compiles, runs, and moves no number anywhere. Two of the four mutations this chunk was checked
// against survived the whole suite for exactly that reason."* **Chunk 3 gave the base a consumer,
// so those two mutations now move money and are killed by the figures above and by
// `core-div293-charge.test.mjs`.** The dollar pins are the defence now; what remains here is the
// ONE claim no figure can make, which is that the base is derived in exactly one place.
const SOURCE = readFileSync(new URL('../src/core/projection.ts', import.meta.url), 'utf8');

// **Comments stripped, and the first draft of this file needed it.** `projection.ts` is prose-heavy
// and the chunk-1 doc above `div293IncomeForWalk` SAYS the words "`division293Tax` is not called" —
// so a sweep over the raw source reported one hit for the charge and failed on its own explanation
// of why there is none. The pins below are over CODE.
const CODE = SOURCE.split('\n')
  .filter((line) => !/^\s*(\/\/|\/?\*)/.test(line))
  .join('\n');
const occurrences = (needle) => CODE.split(needle).length - 1;

test('the base is derived in ONE place, and both readers of it go through that place', () => {
  // A figure a test can see is defended by the figure; a SECOND derivation of it is defended by
  // nothing, because two derivations that agree today are one edit away from disagreeing and both
  // would look right. So this is the pin that stays: one definition, and one call — inside
  // `asSaptoPerson`, which is where the two inputs are already derived.
  assert.equal(occurrences('export const div293IncomeForWalk = ('), 1);
  assert.equal(occurrences('div293IncomeForWalk('), 1); // the definition reads `= (`, so this is the CALL
  assert.equal(occurrences('div293Income: div293IncomeForWalk(income, reportable),'), 1);
  // `div293Income` — the constructor that performs the s 293-20(1)(a) disregard — is called once,
  // inside `div293IncomeForWalk`, so there is no second assembly of this base to drift from it.
  assert.equal(occurrences('div293Income({'), 1);
  // And the two consumers — the monthly accrual and the year-end settlement — read it through ONE
  // accessor, so neither can reach past `asSaptoPerson` and build a base of its own.
  assert.equal(occurrences('const div293IncomesOn = ('), 1);
  assert.equal(occurrences('div293IncomesOn('), 2); // the monthly accrual and the year-end settlement
  // Vacuity control: the strip above must not have eaten the code it is searching.
  assert.ok(CODE.includes('division293Tax({'), 'the comment strip removed the call site');
});

test('the charge is wired, and chunk 1\'s superseded prose is struck rather than left standing', () => {
  // The inverse of chunk 1's `occurrences('division293Tax') === 0`. Two calls: the monthly accrual
  // and the year-end settlement. A third would be a third assessment of the same tax.
  assert.equal(occurrences('division293Tax({'), 2);
  assert.equal(occurrences('DIVISION_293_LINE'), 2); // the declaration and the one line that uses it
  assert.equal(occurrences('DIVISION_293_TRUE_UP_LINE'), 2);
  // **And no live sentence in the source still says the charge is not made.** The two claims chunk 1
  // and chunk 2 committed on are kept, struck, exactly once each — the count-not-absence rule.
  assert.match(SOURCE, /~~`division293Tax` is still called from nowhere\.~~ SUPERSEDED 2026-09-20 BY CHUNK 3/);
  assert.equal([...SOURCE.matchAll(/`division293Tax` is still called from nowhere/g)].length, 1);
  // Chunk 1's own claim, in the doc above `div293IncomeForWalk`, kept and marked false on its face.
  assert.match(SOURCE, /Chunk 1's further claim — that `division293Tax` is called from nowhere/);
  assert.match(SOURCE, /was true until 2026-09-20 and is now FALSE/);
  // **Neither claim survives anywhere unmarked.** Every occurrence of the superseded sentence in
  // the whole file is inside a struck or an explicitly-falsified paragraph, and this is the count
  // that says so rather than an absence that a reword could satisfy vacuously.
  assert.equal([...SOURCE.matchAll(/is (still )?called from nowhere/g)].length, 2);
});
