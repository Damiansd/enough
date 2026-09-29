// P5-3 — LINE → ENTRY ATTRIBUTION. Which of a month's entries produced WHICH figure.
//
// `Month.appliedEntryIds` has cited every entry that GOVERNS a month since P4-4, which is what put a
// 2019 `SPEND_CHANGE` into month 200. It did not say which of the month's ids set which row, and a
// month citing five ids left the reader of the `Household spending` row to guess — concept.md §2's
// black box, one level in.
//
// **Four things are defended here and nothing else.**
//
//   1. **A line names the entry whose statement IS its figure, however old that entry is.** The
//      headline: a spending line in 2039 names a `SPEND_CHANGE` dated 2022, ON THE LINE, and the
//      month's `appliedEntryIds` could not have told a reader which of its two standing spending
//      levels it was.
//   2. **An empty list is not a value.** "No entry states this figure" (the Age Pension) and "an
//      entry does and this build cannot say which" (the pension payment, the year-end true-up) are
//      different facts and are different members of a union; `statedBy()` refuses to build a third
//      reading out of `[]`.
//   3. **A disabled entry reaches nothing** (ADR-0002), and a line's ids are always a SUBSET of its
//      month's — asserted across every month of a thirty-year walk, not on one fixture.
//   4. **Every line carries one**, and all three members are exercised by the one walk, so none of
//      them is a shape nothing ever produces.
import test from 'node:test';
import assert from 'node:assert/strict';

import { toCents } from '../dist/core/money.js';
import {
  AGE_PENSION_LINE,
  NO_STATING_ENTRY,
  PENSION_MINIMUM_LINE,
  SHORTFALL_LINE,
  TAX_TRUE_UP_LINE,
  UNATTRIBUTED,
  project,
  statedBy,
} from '../dist/core/projection.js';

// --- The fixture ---------------------------------------------------------------------------------

const person = (name, dateOfBirth, over = {}) => ({
  name,
  dateOfBirth,
  superInterests: [],
  parcels: [],
  employmentIncomePerFortnight: toCents(0),
  workBonusBalance: toCents(0),
  ...over,
});

const SETTINGS = {
  asAtDate: '2026-07-01',
  planningHorizonAge: 95,
  // ⚠️ **`cpi: 0`, AND IT IS THE ALGEBRAIC CONTROL RATHER THAN A SPECIAL CASE** (register O85,
  // user ruling 2026-09-21). The stated spending level is a REAL figure now and `project()` raises it
  // to each month's own price level, so at any positive CPI every hand-worked figure below would
  // carry a `(1 + cpi) ^ (n / 12)` in it and this fixture would be arithmetic about indexation rather
  // than about what it was written for. At nil the factor is exactly 1 in every month
  // (`core/priceLevel.ts`), so every figure here is the figure it was hand-worked as. The indexation
  // itself is asserted in `test/core-projection-waterfall.test.mjs` §8, on its own fixture.
  economicSeries: { cpi: 0, pblci: 0.025, awote: 0.035, mtawe: 0.035 },
  deemingRates: { lower: 0.0175, upper: 0.0375 },
  nominalReturn: 0.05,
};

/**
 * **Born eleven years apart, and both halves of the gap do work here.** Val is 71 at `asAtDate` and
 * already drawing an Account-Based Pension, so her payment line — a Schedule 7 minimum merged with
 * the Waterfall's own draw — is in the walk from month 0. Ken is 64, still working, and reaches Age
 * Pension age in 2028: his salary is what a `WORK_PATTERN_CHANGE` switches off in 2029, and his
 * super is what the younger-partner exemption protects until then.
 *
 * A fixture with one age, or with two people the same age, could not separate the person-indexed
 * attribution from the household-wide one: the salary and income tax lines are attributed per
 * Person and the spending line is not.
 */
const HOUSEHOLD = {
  persons: [
    person('Val', '1955-04-17', {
      // The commencement day is STATED, because Sch 7 keys the balance day off it and this model
      // will not guess one — without it limb 2 offers nil and no payment line is ever written.
      superInterests: [
        { phase: 'accountBasedPension', balance: toCents(300_000), statedStreamSettings: { commencementDay: '2015-07-01' } },
      ],
    }),
    person('Ken', '1961-08-09', {
      superInterests: [{ phase: 'accumulation', balance: toCents(200_000) }],
      employmentIncomePerFortnight: toCents(3_500),
    }),
  ],
  homeStatus: 'occupied',
};

/**
 * **Five entries, and the pairs are the point.**
 *
 *   * TWO spending levels stand at once and they are stated against DIFFERENT OWNERS, so they hold
 *     different keys in the walk's `governing` map and BOTH are cited by every month's
 *     `appliedEntryIds`. Only one of them set the figure — `SPEND_CHANGE` ignores `owner` and the
 *     later-applied entry wins — so a line that named "the month's standing spending levels" would
 *     name one entry too many, and a line that named the first would name the wrong one. The
 *     amounts differ ($48,000 against $60,000.12) so the dollar figure says which won.
 *   * TWO work patterns, eight years apart, so the salary line's attribution is a level that was
 *     SUPERSEDED rather than a level that was merely stated.
 *   * ONE disabled entry, dated in the middle of the walk and stating a spending level four times
 *     the standing one, so that a walk which let it through would be visible in dollars as well as
 *     in ids.
 */
const ENTRIES = [
  { id: 'spend-2019', date: '2019-03-01', owner: 'household', type: 'SPEND_CHANGE', params: { annualSpend: toCents(48_000) }, enabled: true, createdAt: '2019-03-01' },
  { id: 'spend-2022', date: '2022-06-01', owner: 'personA', type: 'SPEND_CHANGE', params: { annualSpend: toCents(60_000.12) }, enabled: true, createdAt: '2022-06-01' },
  { id: 'pattern-2021', date: '2021-05-04', owner: 'personB', type: 'WORK_PATTERN_CHANGE', params: { daysPerWeek: 3, annualSalary: toCents(91_000) }, enabled: true, createdAt: '2021-05-04' },
  { id: 'stop-2029', date: '2029-01-01', owner: 'personB', type: 'WORK_PATTERN_CHANGE', params: { daysPerWeek: 0, annualSalary: toCents(0) }, enabled: true, createdAt: '2026-06-01' },
  { id: 'roof-2033', date: '2033-05-01', owner: 'household', type: 'ONE_OFF_EXPENSE', params: { amount: toCents(30_000) }, enabled: true, createdAt: '2026-06-01' },
  { id: 'spend-2035-DISABLED', date: '2035-01-01', owner: 'household', type: 'SPEND_CHANGE', params: { annualSpend: toCents(240_000) }, enabled: false, createdAt: '2026-06-01' },
];

const MONTHS = project(SETTINGS, HOUSEHOLD, ENTRIES);
const monthAt = (isoMonth) => MONTHS.find((m) => m.month === isoMonth);
const lineAt = (isoMonth, description) => monthAt(isoMonth).lines.find((l) => l.description === description);

// --- 1. THE HEADLINE: a late month's spending row names an entry from long before the walk --------

test('a 2039 spending line names the 2022 SPEND_CHANGE — on the LINE, not merely in the month', () => {
  // The walk runs to Ken's 95th birthday, so this is a thirty-year fixture and 2039-11 is month 161
  // of it: seventeen years after the entry that set the figure and thirteen years after the walk
  // opened. Before this item the only trace of `spend-2022` in this month was its id in an array of
  // five, beside `spend-2019`, which sets nothing.
  assert.equal(MONTHS[0].month, '2026-07');
  assert.equal(MONTHS.at(-1).month, '2056-08');
  assert.equal(MONTHS.length, 362);

  const spending = lineAt('2039-11', 'Household spending');
  assert.deepEqual(spending.attribution, statedBy('spend-2022'));

  // HAND-WORKED, and it is what says the attribution names the entry that actually set the figure:
  // $60,000.12 ÷ 12 = $5,000.01 exactly, `spend-2022`'s annual figure and not `spend-2019`'s
  // $48,000 ÷ 12 = $4,000.00. The two entries are both in force, both cited by the month, and only
  // one of them is on the line.
  assert.equal(spending.amount, toCents(5_000.01));
  assert.equal(toCents(60_000.12) / 12, toCents(5_000.01));

  // **THE GAP THIS ITEM EXISTS TO CLOSE, stated as an assertion.** The month cites both spending
  // levels — `appliedEntryIds` is the "which entries govern this month" answer and is right to —
  // and nothing in it distinguishes the one that produced this row.
  const month = monthAt('2039-11');
  assert.ok(month.appliedEntryIds.includes('spend-2019'));
  assert.ok(month.appliedEntryIds.includes('spend-2022'));
  assert.equal(month.appliedEntryIds.filter((id) => id.startsWith('spend-')).length, 2);
  assert.ok(month.lines.length > 1, 'a one-line month would make the attribution trivially right');
});

test('the salary line names the work pattern in force, and a superseding level takes the line away', () => {
  // `pattern-2021` is dated five years before the walk and is Ken's standing work pattern in month
  // 0; the salary line exists BECAUSE no later level took it away, which is exactly what that entry
  // is a statement of. Since 2026-09-19 the entry states the figure too, and it is stated HERE as
  // the Household's own rate so that this test still measures the ATTRIBUTION and not the
  // substitution: $3,500 a fortnight × 26 = $91,000 a year, stated as $91,000 by `pattern-2021`,
  // and a twelfth of it is $7,583.33 to the cent by either route.
  const salary = lineAt('2026-07', 'Salary, Ken');
  assert.deepEqual(salary.attribution, statedBy('pattern-2021'));
  assert.equal(salary.amount, toCents(7_583.33));
  assert.equal(Math.round((toCents(3_500) * 26) / 12), toCents(7_583.33));

  // The income tax assessed on that salary carries the same attribution, because it is assessed on
  // that salary and on no other income.
  assert.deepEqual(lineAt('2026-07', 'Income tax, Ken').attribution, statedBy('pattern-2021'));

  // ⚠️ **AND IT IS STILL THAT ENTRY THIRTY MONTHS LATER, which is the half a month-0 assertion
  // cannot see.** `pattern-2021` is dated before the walk, so it is applied in month 0 and in no
  // other month; a build that attributed only the entries DATED in a month would agree with the
  // assertion above and say `'none'` here. Every salary line of the walk names it, and every income
  // tax line with it.
  assert.deepEqual(lineAt('2028-12', 'Salary, Ken').attribution, statedBy('pattern-2021'));
  assert.deepEqual(lineAt('2028-12', 'Income tax, Ken').attribution, statedBy('pattern-2021'));
  const salaryLines = MONTHS.flatMap((m) => m.lines).filter((l) => l.description === 'Salary, Ken');
  assert.equal(salaryLines.length, 30);
  for (const line of salaryLines) assert.deepEqual(line.attribution, statedBy('pattern-2021'));

  // And `stop-2029` supersedes it: from January 2029 there is no salary line at all, so there is
  // nothing left to attribute. A level that ENDS a line cannot be read off that line, which is why
  // this half is asserted as an absence.
  assert.notEqual(lineAt('2028-12', 'Salary, Ken'), undefined);
  assert.equal(lineAt('2029-01', 'Salary, Ken'), undefined);
  assert.ok(monthAt('2029-01').appliedEntryIds.includes('stop-2029'));
  assert.equal(
    MONTHS.filter((m) => m.month >= '2029-01').flatMap((m) => m.lines).filter((l) => l.description.startsWith('Salary')).length,
    0,
  );

  // Val never worked a day of this walk, so no line of hers is ever attributed to a work pattern.
  assert.equal(MONTHS.flatMap((m) => m.lines).filter((l) => l.description === 'Salary, Val').length, 0);
});

test('a one-off expense names its own entry, in its own month and in no other', () => {
  const roof = lineAt('2033-05', 'One-off expense');
  assert.deepEqual(roof.attribution, statedBy('roof-2033'));
  assert.equal(roof.amount, toCents(30_000));
  // An EVENT is cited in its own month alone (`ENTRY_KIND`), so both the id and the line are gone
  // the following month — the spending line of 2033-06 is the standing level's, unchanged.
  assert.equal(lineAt('2033-06', 'One-off expense'), undefined);
  assert.equal(monthAt('2033-06').appliedEntryIds.includes('roof-2033'), false);
  assert.deepEqual(lineAt('2033-06', 'Household spending').attribution, statedBy('spend-2022'));
});

// --- 2. THE TWO KINDS OF NOTHING -----------------------------------------------------------------

test('the Age Pension has NO entry behind it, and says so in its own words', () => {
  const pensionMonths = MONTHS.filter((m) => m.lines.some((l) => l.description === AGE_PENSION_LINE));
  assert.ok(pensionMonths.length > 0, 'no Age Pension line in the walk: this test would pass vacuously');
  const first = pensionMonths[0];
  const line = first.lines.find((l) => l.description === AGE_PENSION_LINE);

  // Legislated, and nobody's entry — the two are not in tension. Its `provenance` names the register
  // that decided it and its `attribution` says no Journal Entry states an Age Pension.
  assert.equal(line.provenance.basis, 'legislated');
  assert.equal(line.provenance.register, 'Age Pension');
  assert.deepEqual(line.attribution, NO_STATING_ENTRY.agePension);
  assert.equal(line.attribution.basis, 'none');
  assert.equal(line.attribution.entryIds, undefined, 'a "none" record carries no id list at all');

  // And it is NOT a month with nothing in it: entries govern this month and produced other rows of
  // it. "No entry states this figure" is a fact about the row, never about the month.
  assert.ok(first.appliedEntryIds.length >= 2);
  assert.ok(first.lines.some((l) => l.attribution.basis === 'entries'));
});

test('a pension payment and a year-end true-up are NOT DETERMINED, and that is a third answer', () => {
  // The payment merges a Schedule 7 minimum no entry states with a draw to a target `spend-2022`
  // does state, and the line carries no split to attribute half of. Filing it under `'none'` would
  // say the Scenario had nothing to do with it, which is false in a month where the Waterfall drew.
  // June 2027, not July 2026: Ken's salary covers the target all year, so the Waterfall never
  // reaches limb 2 — and the payment that lands is the year's minimum being SWEPT in the final month
  // of the financial year, which is the half of this line no entry states at all.
  const payment = lineAt('2027-06', `${PENSION_MINIMUM_LINE}, Val`);
  assert.deepEqual(payment.attribution, UNATTRIBUTED.pensionMinimum);
  assert.equal(payment.attribution.basis, 'not attributed');

  // The year-end true-up is the other one. `stop-2029` moves Ken's salary in the middle of FY2028-29,
  // so that year is settled in the July that follows it — assessed on twelve months of salary whose
  // movements `taxYearToDate` records as figures and not as causes. An entry caused this line and
  // the walk cannot say so.
  const trueUps = MONTHS.flatMap((m) => m.lines).filter((l) => l.description.startsWith(TAX_TRUE_UP_LINE));
  assert.ok(trueUps.length > 0, 'no true-up in the walk: the "not determined" tax case would be untested');
  for (const line of trueUps) assert.deepEqual(line.attribution, UNATTRIBUTED.taxTrueUp);

  // **THE TRAP, AS AN ASSERTION: the two kinds of nothing are not the same value.** An empty array
  // would have made them one, and neither of them has an array at all.
  const agePension = MONTHS.flatMap((m) => m.lines).find((l) => l.description === AGE_PENSION_LINE);
  assert.notEqual(agePension.attribution.basis, payment.attribution.basis);
  assert.notEqual(agePension.attribution.note, payment.attribution.note);
  assert.equal(payment.attribution.entryIds, undefined);
});

test('an EMPTY list of entries cannot be built, so it can never mean either of them', () => {
  assert.throws(() => statedBy(), /at least one entry/);
  assert.throws(() => statedBy(...[]), /at least one entry/);
  assert.deepEqual(statedBy('a', 'b'), { basis: 'entries', entryIds: ['a', 'b'] });
  assert.ok(Object.isFrozen(statedBy('a')));
  assert.ok(Object.isFrozen(statedBy('a').entryIds));
  // And no line of the whole walk carries one, which is the behavioural half of the same claim.
  for (const month of MONTHS) {
    for (const line of month.lines) {
      if (line.attribution.basis === 'entries') assert.ok(line.attribution.entryIds.length > 0, month.month);
    }
  }
});

// --- 3. THE INVARIANTS, ACROSS THE WHOLE WALK ----------------------------------------------------

test('a disabled entry attaches to no line and is cited by no month, for 362 months', () => {
  for (const month of MONTHS) {
    assert.equal(month.appliedEntryIds.includes('spend-2035-DISABLED'), false, month.month);
    for (const line of month.lines) {
      if (line.attribution.basis === 'entries') {
        assert.equal(line.attribution.entryIds.includes('spend-2035-DISABLED'), false, month.month);
      }
    }
  }
  // ADR-0002's append-only delete is about the FIGURE as well as the citation: the disabled entry
  // states $240,000 a year from January 2035, and the spending line that month is still the standing
  // $5,000.01 under the entry that really is in force.
  const january = lineAt('2035-01', 'Household spending');
  assert.equal(january.amount, toCents(5_000.01));
  assert.deepEqual(january.attribution, statedBy('spend-2022'));
});

test('every line of every month is attributed, and a line’s ids are a SUBSET of its month’s', () => {
  const seen = { entries: 0, none: 0, 'not attributed': 0 };
  let lines = 0;
  for (const month of MONTHS) {
    const cited = new Set(month.appliedEntryIds);
    for (const line of month.lines) {
      lines += 1;
      assert.notEqual(line.attribution, undefined, `${month.month}: ${line.description}`);
      assert.ok(line.attribution.basis in seen, `${month.month}: ${line.attribution.basis}`);
      seen[line.attribution.basis] += 1;
      if (line.attribution.basis !== 'entries') continue;
      for (const id of line.attribution.entryIds) {
        // **THE INVARIANT.** A line cannot cite an entry its own month does not: the month's array is
        // the walk's answer to "what governs here", and a row of that month claiming an author from
        // outside it would be an audit trail that does not close.
        assert.ok(cited.has(id), `${month.month}: line "${line.description}" cites ${id}, which the month does not`);
      }
    }
  }
  assert.ok(lines > 1_000, 'a walk this short would not exercise the invariant');
  // All three members are produced by this one walk, so none of them is a shape nothing reaches.
  assert.ok(seen.entries > 0);
  assert.ok(seen.none > 0);
  assert.ok(seen['not attributed'] > 0);

  // The positive control the subset check needs: the walk DOES cite entries on lines, and the check
  // above would have caught an id that was not the month's. Feed it one and watch it fail.
  const month = monthAt('2039-11');
  assert.ok(!new Set(month.appliedEntryIds).has('spend-2035-DISABLED'));
  assert.throws(() => {
    for (const id of ['spend-2035-DISABLED']) {
      assert.ok(new Set(month.appliedEntryIds).has(id), 'the subset check is capable of failing');
    }
  }, /capable of failing/);
});

test('the shortfall and the Waterfall’s own draw say NO ENTRY STATES THIS, and name what did', () => {
  // The narrow rule, asserted rather than described: a shortfall exists because the Household could
  // not meet a target `spend-2022` set, and it is still `'none'`. Attributing it to the spending
  // level would put that entry on every row of every month and distinguish nothing — so the note
  // says what decided the figure instead, and the reader is sent to the spending line of the same
  // month, which is in the same array.
  // ⚠️ **THIS WALK NO LONGER SHORTS, AND THE FIXTURE MOVED RATHER THAN THE RULE (P4-1e,
  // 2026-09-21).** `MONTHS` used to run out of money, because its Age Pension stopped at 2027-03
  // and the $60,000.12 spending level had nothing but salary behind it after `stop-2029`. With the
  // standing table wired the same Household is paid a pension for the rest of the walk and meets
  // its target in every month — which is the ruling's whole purpose, showing up as the disappearance
  // of the state this test needs. So the shortfall is produced by a walk stated HERE: the identical
  // Household and entries with the spending level raised, which is the smallest change that puts
  // the target out of reach and leaves every attribution in the test unchanged.
  const shortWalk = project(
    SETTINGS,
    HOUSEHOLD,
    ENTRIES.map((entry) => (entry.id === 'spend-2022' ? { ...entry, params: { annualSpend: toCents(360_000.12) } } : entry)),
  );
  const shortfalls = shortWalk.flatMap((m) => m.lines).filter((l) => l.description === SHORTFALL_LINE);
  assert.ok(shortfalls.length > 0, 'no shortfall in this walk: the narrow rule would be untested');
  for (const line of shortfalls) assert.deepEqual(line.attribution, NO_STATING_ENTRY.shortfall);
  assert.match(NO_STATING_ENTRY.shortfall.note, /No entry states it/);
  // And the control for the sentence above: the unraised walk shorts in no month at all.
  assert.deepEqual(MONTHS.flatMap((m) => m.lines).filter((l) => l.description === SHORTFALL_LINE), []);

  // The month that carries one also carries the spending line that set the target, and THAT line
  // names the entry. The pair is the whole of the rule.
  const month = shortWalk.find((m) => m.lines.some((l) => l.description === SHORTFALL_LINE));
  assert.deepEqual(month.lines.find((l) => l.description === 'Household spending').attribution, statedBy('spend-2022'));
});
