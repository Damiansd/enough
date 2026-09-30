// P5-1 / P5-2 — the PURE half of the month table: `monthToRows.ts`, over the committed demo
// Scenario in `src/app/demoHousehold.ts`.
//
// **What is tested here and what is deliberately not.** `renderTable.ts` writes DOM and is
// untested: there is no jsdom and TODO.md P2-9a keeps `typescript` as the one dev dependency. The
// split exists so that everything a reader could be MISLED by lives in a pure function, and the
// untested half decides nothing. So this file is the whole of the guarantee, and it is written
// against four specific ways the table could lie:
//
//   1. **A THREE-MEMBER UNION COLLAPSED INTO TWO.** `'none'` means nothing legislated stands behind
//      the figure; `'not carried'` means the SIS Reg Sch 7 Account-Based Pension minimum does and
//      this build drops it. Printing both as a blank cell would assert, on screen, that no register
//      governs a Schedule 7 minimum. Same for `'none'` vs `'not attributed'`.
//   2. **A BORROWED FY STAMP READ AS AN ORDINARY ONE (P5-4a).** The Medicare low-income thresholds
//      carry `priorYearFallbackFor: '2026-27'`, so real months of this walk carry the borrowed
//      sentence. It must not acquire the ordinary out-of-year wording.
//   3. **CASH AND WEALTH SUMMED.** Only `effect: 'cash'` reconciles the balances. §4 walks EVERY
//      month of the forecast and asserts the identity to the cent, twice — once against the row's
//      own `cashNet`, once against a sum computed here from the `Month` itself.
//   4. **`appliedEntryIds` DROPPED.** The month-level "which entries governed this month" is a
//      different question from a line's attribution, and P5-2's own bullet list omits it.
//
// **VACUITY CONTROL.** Three of the four are claims about shapes, and a fixture that never produced
// the shape would make them pass forever. §1 asserts that the demo walk actually emits every one of
// them before anything else asserts how they render.
import test from 'node:test';
import assert from 'node:assert/strict';

import { toCents } from '../dist/core/money.js';
// Every figure a row prints is whole dollars (user ruling, 2026-09-24), so the expected text is built
// by the page's own display formatter rather than by `formatCents`.
import { formatDollars } from '../dist/app/displayMoney.js';
import { GROWTH_LINE, SUPER_GUARANTEE_LINE, project, standingParametersNote } from '../dist/core/projection.js';
import { DEMO_ENTRIES, DEMO_HOUSEHOLD, DEMO_SETTINGS } from '../dist/app/demoHousehold.js';
import { moneyLens } from '../dist/app/todaysDollars.js';
import { entrySummary } from '../dist/app/entryForm.js';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { comparisonSeries } from '../dist/app/comparisonSeries.js';
import {
  AGE_PENSION_LABEL,
  INCOME_FROM_SUPER_LABEL,
  INVESTMENTS_DETAIL,
  INVESTMENTS_LABEL,
  TOTAL_SUPER_LABEL,
  TOTAL_WEALTH_DETAIL,
  TOTAL_WEALTH_LABEL,
  ATTRIBUTION_LABELS,
  ATTRIBUTION_NOTE_LABELS,
  CAVEAT_LABELS,
  CONFIDENCE_LABELS,
  DETERMINATION_DISCLOSURE,
  EFFECT_LABELS,
  HOME_LOAN_OWING_DETAIL,
  HOME_LOAN_OWING_LABEL,
  HOUSEHOLD_ASSETS,
  NOTE_TEXT_LABELS,
  OFFSET_ATTRIBUTION,
  PROVENANCE_LABELS,
  PROVENANCE_NOTE_LABELS,
  REGISTER_DETAILS,
  SPLIT_SHAPE_LABELS,
  attributionCell,
  caveatKind,
  monthToRow,
  monthsToRows,
  personLabels,
  provenanceCell,
} from '../dist/app/monthToRows.js';

const MONTHS = project(DEMO_SETTINGS, DEMO_HOUSEHOLD, DEMO_ENTRIES);
/**
 * **The demo plan with Dana's account KEPT OUT of the switch at retirement (2026-09-23).** As
 * committed, her RETIRE at 63 turns her accumulation account into an account-based pension. Two
 * sections below need the walk in which it stays in accumulation — the one that reaches limb 5 and
 * empties the Offset — and say so where they use it. An opted-out plan walks exactly as the demo did
 * before the switch existed.
 */
const KEPT_OUT = {
  ...DEMO_HOUSEHOLD,
  persons: [
    { ...DEMO_HOUSEHOLD.persons[0], superInterests: DEMO_HOUSEHOLD.persons[0].superInterests.map((i) => ({ ...i, keepInAccumulationAtRetirement: true })) },
    DEMO_HOUSEHOLD.persons[1],
  ],
};
const KEPT_MONTHS = project(DEMO_SETTINGS, KEPT_OUT, DEMO_ENTRIES);

/**
 * **THIS FILE PINS WHAT A ROW SAYS ABOUT THE ENGINE'S OWN FIGURES, SO IT ASKS FOR THEM (P2-7).**
 * `monthToRow` now converts every amount to today's money by default (`todaysDollars.ts`), and the
 * figures asserted below are hand-derived nominal ones — $967,200 of Superannuation Guarantee owed
 * for the year, $685.10 credited a month — worked out in the comments beside them from Dana's pay.
 * Converting those would replace a derivation a reader can check with a number only the code can
 * produce. So the basis here is stated, explicitly, as the raw future amounts, and the whole of the
 * today's-money behaviour — including these same identities re-derived through the lens, in both
 * views, over all 501 months — is `test/app-todays-dollars.test.mjs`.
 */
const FUTURE = { view: 'futureDollars', asAtDate: DEMO_SETTINGS.asAtDate, cpi: DEMO_SETTINGS.economicSeries.cpi };
const ROWS = monthsToRows(MONTHS, FUTURE);

const everyLine = MONTHS.flatMap((month) => month.lines);
const setOf = (values) => [...new Set(values)].sort();

/**
 * **THE REGISTER OF WHAT MAY NOT BE ON THE PAGE (§8, 2026-09-20).** The engine writes its strings
 * for an auditor and they were reaching the screen verbatim. These three patterns are what "written
 * for an auditor" looks like: this build's internal vocabulary, its shouted change history, and the
 * dotted keys `provenanceOf` names its inputs by. They are applied to what is printed OPEN; the
 * same text behind an `infoButton` is the record, and is expected to trip all three.
 */
const BANNED_WORDS = /\b(low tax contributions|parcel|journal|provenance|register|walk|limb|determination|settlement)\b/i;
const SHOUTED = /\b[A-Z]{3,}\b/;
const DOTTED_KEY = /\b[a-z][a-zA-Z]*(\.[a-zA-Z]+){2,}\b/;

const plainly = (text, where) => {
  assert.doesNotMatch(text, BANNED_WORDS, `${where} prints this build's own vocabulary`);
  assert.doesNotMatch(text, SHOUTED, `${where} prints a shouted internal token`);
  assert.doesNotMatch(text, DOTTED_KEY, `${where} prints an internal key`);
};

const linesOf = (row) => [...row.cashLines, ...row.wealthLines];

// --- §1 The vacuity control: the fixture reaches every renderable shape --------------------------

test('the demo Scenario emits all three provenance bases, all three attribution bases, both effects and FOUR of the seven note subjects', () => {
  assert.ok(MONTHS.length > 300, `the walk is only ${MONTHS.length} months`);
  assert.deepEqual(setOf(everyLine.map((l) => l.provenance.basis)), ['legislated', 'none', 'not carried']);
  assert.deepEqual(setOf(everyLine.map((l) => l.attribution.basis)), ['entries', 'none', 'not attributed']);
  assert.deepEqual(setOf(everyLine.map((l) => l.effect)), ['cash', 'wealth']);
  // **All FOUR subjects since 2026-09-20**, the third because the demo Household draws on Dana's
  // released superannuation through Waterfall limb 5 — the months that used to report
  // `Unfunded shortfall` beside her balance — and the fourth because every month Dana is paid now
  // reports the employer Superannuation Guarantee this build computes and does not credit (P6-8
  // brief 3, chunk 1). Both renderer branches are therefore exercised by the committed fixture
  // rather than by a bespoke one.
  // ⚠️ **AND THE FOURTH IS A DIFFERENT ONE SINCE 2026-09-21 (P4-1e).** `'parameter window'` used to
  // be on this list because the demo walk ran past the published Age Pension window and could
  // compute nothing there; the standing table computes those months now, so what they carry is
  // `'standing parameters'` — the near-opposite note, saying a figure WAS computed and on what.
  // The window note is not dead: it still fires below the first determination, which no walk built
  // from a plan's own `asAtDate` reaches, so it is exercised in `core-projection-month-notes.test.mjs`
  // on a hand-dated fixture rather than here.
  // ⚠️ **AND A FIFTH ARRIVED ON 2026-09-21 (P10-5).** The demo plan is stated as at 1 September, so
  // its first financial year's 1 July is behind the walk and Ash's pension minimum for FY2026-27
  // rests on a stand-in balance. The month it was made says so. **`MonthNote` has SEVEN members and
  // this fixture reaches five**, which is why the title says five of six — the seventh, a stopped
  // salary sacrifice, needs a plan the demo couple do not state.
  // ⚠️ **AND `'standing parameters'` LEFT THE LIST ON 2026-09-23.** A plan with no series now
  // INDEXES the Age Pension on its own growth rates instead of carrying the last published sets, so
  // the walk never emits the note; its renderer is exercised in §6 on a note built by the engine's
  // own `standingParametersNote`, which is the one thing that can still produce one.
  // ⚠️ **AND ON 2026-09-23 `'super withdrawal'` LEFT IT AND `'pension at retirement'` JOINED IT.**
  // Dana's RETIRE (2031-05-14, at 63) now switches her account to an account-based pension, which
  // limb 2 pays, so limb 5 never draws her super and no withdrawal note is made. The switch itself
  // is reported once, in her RETIRE month. The withdrawal renderer is still exercised on an
  // engine-made note below ("a super withdrawal row …", moved here from a core test by P6-14).
  assert.deepEqual(
    setOf(MONTHS.flatMap((m) => m.notes).map((n) => n.subject)),
    ['pension at retirement', 'pension minimum basis', 'superannuation guarantee', 'waterfall limb'],
  );
  assert.deepEqual(
    MONTHS.flatMap((m) => m.notes.filter((n) => n.subject === 'pension at retirement').map((n) => [m.month, n.person, n.outcome])),
    [['2031-05', 'Dana', 'switched']],
  );
  // **And it is made ONCE.** A stand-in re-declared every month would read as a walk that never
  // settled its own first year.
  assert.equal(MONTHS.flatMap((m) => m.notes).filter((n) => n.subject === 'pension minimum basis').length, 1);
  // And the borrowed caveat is really in the output, so §3 is not asserting about nothing.
  assert.ok(
    everyLine.some((l) => l.provenance.basis === 'legislated' && l.provenance.caveats.some((c) => caveatKind(c) === 'borrowed')),
    'no line carries a prior-year fallback caveat',
  );
});

// --- §2 The six strings: three provenance, three attribution, none of them shared ----------------

test('the three LineProvenance bases render as three DIFFERENT strings, and none of them is blank', () => {
  const labels = ['legislated', 'none', 'not carried'].map((basis) => PROVENANCE_LABELS[basis]);
  assert.equal(new Set(labels).size, 3, `two provenance bases share a string: ${JSON.stringify(labels)}`);
  for (const label of labels) {
    assert.ok(label.trim().length > 3, `a provenance label is empty or a placeholder: ${JSON.stringify(label)}`);
    assert.doesNotMatch(label, /^(—|-|n\/a|N\/A|none|\?)$/);
  }
});

test('the three LineAttribution bases render as three DIFFERENT strings, and none of them is blank', () => {
  const labels = ['entries', 'none', 'not attributed'].map((basis) => ATTRIBUTION_LABELS[basis]);
  assert.equal(new Set(labels).size, 3, `two attribution bases share a string: ${JSON.stringify(labels)}`);
  for (const label of labels) {
    assert.ok(label.trim().length > 3, `an attribution label is empty or a placeholder: ${JSON.stringify(label)}`);
    assert.doesNotMatch(label, /^(—|-|n\/a|N\/A|none|\?)$/);
  }
});

test('`not carried` does NOT render as `none` — the Sch 7 minimum is governed, not unlegislated', () => {
  const uncarried = everyLine.find((l) => l.provenance.basis === 'not carried');
  const unlegislated = everyLine.find((l) => l.provenance.basis === 'none');
  assert.ok(uncarried !== undefined && unlegislated !== undefined);
  const a = provenanceCell(uncarried.provenance);
  const b = provenanceCell(unlegislated.provenance);
  assert.notEqual(a.label, b.label, 'a governed-but-uncarried figure renders as an unlegislated one');
  // And the gap is NAMED rather than merely admitted: the register reaches the cell.
  assert.equal(a.register, 'Account-Based Pension minimum');
  assert.equal(b.register, null);
});

test('`not attributed` does NOT render as `none` — an entry is behind the figure either way', () => {
  const unattributed = everyLine.find((l) => l.attribution.basis === 'not attributed');
  const unstated = everyLine.find((l) => l.attribution.basis === 'none');
  assert.ok(unattributed !== undefined && unstated !== undefined);
  assert.notEqual(
    attributionCell(unattributed.attribution).label,
    attributionCell(unstated.attribution).label,
    'a figure whose entries are undeterminable renders as one no entry states',
  );
});

test('an attributed line carries its ids, and the other two members carry none', () => {
  const stated = everyLine.find((l) => l.attribution.basis === 'entries');
  const cell = attributionCell(stated.attribution);
  assert.deepEqual(cell.entryIds, [...stated.attribution.entryIds]);
  assert.ok(cell.entryIds.length > 0, '`entryIds` is specified as never empty');
  assert.deepEqual(attributionCell(everyLine.find((l) => l.attribution.basis === 'none').attribution).entryIds, []);
});

// 2026-09-23: the page printed `e9bbe6a0-5401-…` under "Stated by these entries". The id stays on
// the cell for the machine; what is PRINTED is `entryNames`, and both lists on a row go through
// the namer the caller hands in — the line attributions AND the month's applied entries.
test('entries are printed by name, not id — on every line and in the month\'s applied list', () => {
  const name = (id) => `named:${id}`;
  const stated = everyLine.find((l) => l.attribution.basis === 'entries');
  const cell = attributionCell(stated.attribution, name);
  assert.deepEqual(cell.entryNames, stated.attribution.entryIds.map(name));
  assert.deepEqual(attributionCell(everyLine.find((l) => l.attribution.basis === 'none').attribution, name).entryNames, []);

  const governed = MONTHS.find((m) => m.appliedEntryIds.length > 0 && m.lines.some((l) => l.attribution.basis === 'entries'));
  assert.ok(governed !== undefined);
  const [row] = monthsToRows([governed], FUTURE, HOUSEHOLD_ASSETS, name);
  assert.deepEqual(row.appliedEntryNames, governed.appliedEntryIds.map(name));
  const printed = [...row.cashLines, ...row.wealthLines].flatMap((line) => line.attribution.entryNames);
  assert.ok(printed.length > 0);
  assert.ok(printed.every((text) => text.startsWith('named:')), 'a line printed an entry without the namer');
});

test('the two effects render as two different strings — a wealth movement is not cash', () => {
  assert.notEqual(EFFECT_LABELS.cash, EFFECT_LABELS.wealth);
  assert.match(EFFECT_LABELS.wealth, /no cash/i);
});

// --- §3 P5-4a: a borrowed stamp reads as borrowed ------------------------------------------------

test('the borrowed and the ordinary out-of-year caveat classify DIFFERENTLY', () => {
  const borrowed =
    'tax.medicareLevy.lowIncomeThresholds.singleLower is stamped FY2025-26 and carried as a prior-year fallback for FY2026-27 — no FY2026-27 figure exists';
  const outOfYear = 'tax.somethingElse is stamped FY2025-26 and was applied to FY2026-27';
  assert.equal(caveatKind(borrowed), 'borrowed');
  assert.equal(caveatKind(outOfYear), 'out of year');
  assert.equal(caveatKind('tax.medicareLevy.lowIncomeThresholds.familyUpper is secondary-only'), 'other');
  assert.equal(new Set(Object.values(CAVEAT_LABELS)).size, 3);
});

test('a line whose figure borrowed last year’s thresholds says so AT THE STAMP', () => {
  const line = everyLine.find(
    (l) => l.provenance.basis === 'legislated' && l.provenance.caveats.some((c) => caveatKind(c) === 'borrowed'),
  );
  const cell = provenanceCell(line.provenance);
  assert.equal(cell.borrowed, true);
  assert.equal(cell.stamp, `FY${line.provenance.fy}`);
  assert.notEqual(cell.stampLabel, cell.stamp, 'a borrowed figure wears an ordinary stamp');
  assert.match(cell.stampLabel, /earlier year/);
  assert.ok(
    cell.caveats.some((c) => c.kind === 'borrowed' && c.label === CAVEAT_LABELS.borrowed),
    'the borrowed caveat lost its own label on the way to the cell',
  );
  // The sentence itself is carried verbatim — the union is not flattened into a summary.
  assert.deepEqual(cell.caveats.map((c) => c.text), [...line.provenance.caveats]);
});

test('an ORDINARY legislated line is not marked borrowed (the mark is not universal)', () => {
  const plain = everyLine.find(
    (l) => l.provenance.basis === 'legislated' && !l.provenance.caveats.some((c) => caveatKind(c) === 'borrowed'),
  );
  assert.ok(plain !== undefined, 'every legislated line in the walk is borrowed — the mark distinguishes nothing');
  const cell = provenanceCell(plain.provenance);
  assert.equal(cell.borrowed, false);
  assert.equal(cell.stampLabel, cell.stamp);
});

// --- §4 The cash identity, asserted over EVERY month ---------------------------------------------

const signedCash = (month) =>
  month.lines
    .filter((line) => line.effect === 'cash')
    .reduce((sum, line) => sum + (line.direction === 'inflow' ? line.amount : -line.amount), 0);

test('opening + the CASH lines = closing, to the cent, in every month of the demo forecast', () => {
  for (const month of MONTHS) {
    assert.equal(
      month.openingBalance + signedCash(month),
      month.closingBalance,
      `${month.month} does not reconcile: ${month.openingBalance} + ${signedCash(month)} ≠ ${month.closingBalance}`,
    );
  }
});

test('`cashNet` is the reconciling figure and the WEALTH lines are not in it', () => {
  let monthsWithGrowth = 0;
  for (const [i, row] of ROWS.entries()) {
    const month = MONTHS[i];
    assert.equal(row.cashNet, formatDollars(month.closingBalance - month.openingBalance), `${month.month}`);
    assert.equal(row.cashNet, formatDollars(signedCash(month)), `${month.month}`);
    if (row.wealthLines.length > 0) {
      monthsWithGrowth += 1;
      assert.notEqual(row.wealthNet, formatDollars(0), `${month.month} has wealth lines summing to nil`);
    }
  }
  // Vacuity control: if no month had a wealth line, the assertion above would be about nothing.
  assert.ok(monthsWithGrowth > 300, `only ${monthsWithGrowth} months carry a wealth line`);
});

test('the two axes are SEPARATE arrays and no row field adds them', () => {
  const row = ROWS.find((r) => r.wealthLines.length > 0 && r.cashLines.length > 0);
  assert.ok(row !== undefined);
  assert.ok(row.cashLines.every((l) => l.effect === 'cash'));
  assert.ok(row.wealthLines.every((l) => l.effect === 'wealth'));
  assert.notEqual(row.cashNet, row.wealthNet);
  // There is no third, summed total of the two axes anywhere in the row. `totalWealth` (§11) is the
  // Household's POSITION at the close — cash, super and investments — and adds no line of either axis.
  assert.deepEqual(
    Object.keys(row).filter((k) => /total|combined/i.test(k)),
    ['totalWealth'],
  );
});

// --- §5 The four fields P5-2's bullet list omits -------------------------------------------------

test('every row carries `appliedEntryIds`, in the month’s own order', () => {
  for (const [i, row] of ROWS.entries()) {
    assert.deepEqual(row.appliedEntryIds, [...MONTHS[i].appliedEntryIds], MONTHS[i].month);
  }
  // Vacuity control: the ids are not empty everywhere, and they CHANGE across the walk.
  assert.ok(ROWS[0].appliedEntryIds.length > 0);
  assert.ok(
    new Set(ROWS.map((r) => r.appliedEntryIds.join(','))).size > 1,
    'the whole walk cites the same entries — the field distinguishes nothing here',
  );
});

test('every row carries the MONTH-level provenance rollup, with `uncarried` kept apart from `registers`', () => {
  const withUncarried = ROWS.find((r) => r.provenance.uncarried.length > 0);
  assert.ok(withUncarried !== undefined, 'no month reports an uncarried register');
  assert.deepEqual(withUncarried.provenance.uncarried, ['Account-Based Pension minimum']);
  assert.equal(
    withUncarried.provenance.registers.includes('Account-Based Pension minimum'),
    false,
    'an uncarried register was merged into the vouched-for list',
  );
  // ⚠️ **ON DANA ALONE SINCE 2026-09-23.** The demo couple's walk had 49 months that carried no
  // register — months with no tax and no Age Pension — and has none now: the pension indexes on the
  // plan's own growth rates and is paid in 495 of its 501 months. Dana on her own, between her
  // retirement and her Age Pension age, still has 48 of them, and none of that depends on a rate.
  const soleMonths = project(DEMO_SETTINGS, { ...DEMO_HOUSEHOLD, persons: [DEMO_HOUSEHOLD.persons[0]] }, DEMO_ENTRIES);
  const soleRows = monthsToRows(soleMonths, FUTURE);
  const empty = soleRows.find((r) => r.provenance.registers.length === 0);
  assert.ok(empty !== undefined);
  // ⚠️ **AND 21 ON THE COUPLE AGAIN SINCE THE SWITCH AT RETIREMENT (2026-09-23).** Dana's account
  // becomes an account-based pension from 2031-06 (her RETIRE is 2031-05-14), and a pension counts in
  // the assets test at any age where her accumulation account did not until 67. That moves about
  // $600,000 from the protected band to the assessable one, over the couple's cut-off: no Age Pension
  // in the 22 months 2031-06 to 2033-03, until drawing the pension brings the assets back under it.
  // Her pension payments are tax-free at 63, so those months carry no register — all but 2031-07,
  // which carries the year-end income tax true-up. 22 − 1 = 21.
  // ⚠️ **AND 23 SINCE "SPEND CASH FIRST" (2026-09-23): two more months, 2033-04 and 2033-05.** The
  // demo owes no home loan, so the cash it used to be holding by then ($95,167.22) is spent before
  // parcels and before the pension above its minimum, and those keep earning 6.5% where the cash
  // earned 2.5%. The couple therefore
  // holds more — $1,309,446.35 against $1,302,056.37 in 2033-04 — and stays over the assets-test
  // cut-off two months longer: it was only $18.50 a month inside it then. 24 − 1 = 23.
  const noRegister = ROWS.filter((r) => r.provenance.registers.length === 0).map((r) => r.month);
  const noPension = MONTHS.filter((m) => !m.lines.some((l) => l.description === 'Age Pension' && l.amount > 0) && m.month >= '2031-06').map((m) => m.month);
  // ⚠️ **AND 24 SINCE DANA'S RETIREMENT MONTH PAYS HER DAYS WORKED (2026-09-23): one more, 2033-06.**
  // May 2031 pays 14/31 of her month, which Ash's pension then does not have to, so the couple holds
  // $2,095.04 more in 2033-04 ($1,311,541.39) and more again in 2033-06, where it was paid $3.60 —
  // about $550 inside the cut-off — and is now over it. 25 − 1 = 24.
  // ⚠️ **AND 27 SINCE PAY RISES WITH WAGES (2026-09-23): three more, 2033-07 to 2033-09.** Dana's pay
  // rises 3.5% a year until she retires, and what it leaves holds the couple $19,371.21 higher in
  // 2033-04 and $19,678.59 higher in 2033-07, where they were paid $48.36 a month on the assets taper
  // — over the cut-off until 2033-10. 28 − 1 = 27. (Fifteen months while she WORKS go unpaid too
  // from 2029, the income test crossing its cut-off between indexations, but each carries her income
  // tax and so a register: the run counted here starts at her retirement for that reason, where it
  // started at 2031-01 until then.)
  // ⚠️ **AND 27 PENSION-FREE MONTHS, 22 OF THEM REGISTER-FREE, SINCE DIV 119 (LR-1 slice 3,
  // 2026-09-29).** Dana's sales from 2033-03 now pay the minimum tax, and each sale grows by exactly
  // its tax, so the couple holds less: $23.12 less in 2033-04 (March's $23 of tax and a month of its
  // growth at 6.5%), and enough less by 2033-09 to be paid $0.20 of Age Pension there. 28 − 1 = 27.
  // And 2033-03 to 2033-06 each carry an `Income tax on capital gain` line, so a tax register:
  // 27 − 1 (2031-07) − 4 = 22.
  assert.equal(noPension.length, 27);
  assert.deepEqual([noPension[0], noPension.at(-1)], ['2031-06', '2033-08']);
  assert.equal(MONTHS.find((m) => m.month === '2033-04').assessableAssets, 130_944_635 + 209_504 + 1_937_121 - 2_312);
  assert.equal(Math.round(2_300 * 1.065 ** (1 / 12)), 2_312);
  assert.equal(130_944_635 - 130_205_637, toCents(7_389.98));
  assert.deepEqual(noRegister, noPension.filter((month) => month !== '2031-07' && !(month >= '2033-03' && month <= '2033-06')));
  assert.equal(noRegister.length, 22);
  // **The month that carried nothing says so IN WORDS (2026-09-20).** This pinned the literal
  // `'nothing carried'`, which is the engine's own token and was being printed under a heading
  // reading "Weakest check". The token is still what the `Month` says — asserted at the source, so
  // this is not a constant compared with itself — and what the ROW says is its label: not the
  // token, long enough to be a sentence, and different from the strongest real confidence, because
  // a month with nothing in it must never read as a well-checked one (`plan.ts` on why the literal
  // is deliberately not a `Confidence`).
  assert.equal(soleMonths[soleRows.indexOf(empty)].provenance.confidence, 'nothing carried');
  assert.equal(empty.provenance.confidence, CONFIDENCE_LABELS['nothing carried']);
  assert.ok(empty.provenance.confidence.trim().length > 20, empty.provenance.confidence);
  assert.notEqual(empty.provenance.confidence, CONFIDENCE_LABELS['primary-verified']);
  plainly(empty.provenance.confidence, 'the nothing-carried confidence');
  assert.deepEqual(empty.provenance.stamps, []);
});

test('the month rollup stamps its years as FY-prefixed, and reports borrowing at the month level', () => {
  const row = ROWS[0];
  assert.deepEqual(row.provenance.stamps, MONTHS[0].provenance.stamps.map((fy) => `FY${fy}`));
  assert.equal(row.provenance.borrowed, true, 'FY2026-27 borrows the Medicare thresholds and the month must say so');
});

test('every line renders its effect, its attribution and its provenance — none is dropped', () => {
  for (const row of ROWS) {
    for (const line of [...row.cashLines, ...row.wealthLines]) {
      assert.ok(line.effectLabel.length > 0, `${row.month} ${line.description} has no effect label`);
      assert.ok(line.attribution.label.length > 0, `${row.month} ${line.description} has no attribution`);
      assert.ok(line.provenance.label.length > 0, `${row.month} ${line.description} has no provenance`);
    }
  }
});

// --- §6 The notes, and the balances ---------------------------------------------------------------

test('a waterfall-limb note keeps `available` and `drawn`; a standing-parameters note has neither', () => {
  // ⚠️ **THIS READ THE `'parameter window'` NOTE UNTIL 2026-09-21 (P4-1e)** — *"no month of the
  // walk falls outside a parameter window"* was its own vacuity check, and no month of this walk
  // does any more. The same claim is made on the note that replaced it in these months: both
  // columns blank, because the money it is about is already a LINE and printing it here would
  // show one payment twice.
  //
  // ⚠️ **AND SINCE 2026-09-23 NO MONTH OF THE WALK CARRIES ONE EITHER** — the Age Pension indexes on
  // the plan's own growth rates and nothing is carried. The note type and its renderer survive, so
  // the claim is made on a real walk month with the engine's own note added to it; `of` now says
  // what `standingFrom` is — the last day the rates were in force — where it said "published for".
  assert.equal(ROWS.filter((r) => r.notes.some((n) => n.subject === 'standing parameters')).length, 0);
  const carried = MONTHS.find((m) => m.month === '2027-04');
  const [row] = monthsToRows([{ ...carried, notes: [...carried.notes, standingParametersNote('2027-03-19')] }], FUTURE);
  const window = row.notes.find((n) => n.subject === 'standing parameters');
  assert.equal(window.of, 'Age Pension — rates in force on 2027-03-19, carried forward');
  assert.equal(window.available, null);
  assert.equal(window.drawn, null);
  // **The note's MODALITY still reaches the row — and it is not what stands on the page.** The
  // engine shouts that the figures were CARRIED and in which direction that runs, and that sentence
  // is the record, kept word for word. What a reader meets first is `noteLabel`, which the pure
  // layer decides from the note's SUBJECT and not by reading its prose.
  assert.match(window.note, /CARRIED|AT MOST/);
  assert.doesNotMatch(window.noteLabel, /CARRIED|AT MOST/);
  assert.ok(window.noteLabel.trim().length > 20, window.noteLabel);
  assert.equal(window.noteLabel, NOTE_TEXT_LABELS['standing parameters']);
  const limb = row.notes.find((n) => n.subject === 'waterfall limb');
  assert.notEqual(limb.available, null);
  assert.notEqual(limb.drawn, null);
  assert.equal(row.notes.filter((n) => n.subject === 'waterfall limb').length, 7);
});

test('a Superannuation Guarantee note renders the year owed beside the month actually paid', () => {
  // **The row is the label, and BOTH COLUMNS CHANGED MEANING ON 2026-09-20 (P6-8 brief 3, chunk
  // 2b).** `available` is still what the employer owes for the YEAR; `drawn` was `$0.00` in every
  // month of every walk at chunk 1 and is now the month's actual credit, net of the fund's 15%.
  // Dana is paid $3,100 a fortnight — $80,600 a year — so 12% is $9,672.00, a twelfth of that is
  // $806.00, and 85% of it is **$685.10** into her accumulation interest every month she works.
  const paid = ROWS.flatMap((r) => r.notes).filter((n) => n.subject === 'superannuation guarantee' && n.available !== null);
  assert.ok(paid.length > 0, 'no month of the demo walk computes a Guarantee — this test is vacuous');
  assert.equal(paid[0].of, 'Dana — Superannuation Guarantee, for the year');
  assert.equal(paid[0].available, formatDollars(967_200));
  assert.equal(paid[0].drawn, formatDollars(68_510));
  assert.match(paid[0].note, /IS PAID INTO SUPERANNUATION BY THIS BUILD/);
  // And what it says about the CAP, which changed on 2026-09-20 (P6-8 brief 3, final chunk): the
  // note said *"measured against no contributions cap"* for the length of chunk 2b and now says the
  // Guarantee counts towards it.
  assert.match(paid[0].note, /IT COUNTS TOWARDS THE GENERAL CONCESSIONAL CAP/);
  assert.doesNotMatch(paid[0].note, /measured against no contributions cap/);
  // ⚠️ **AND WHAT IT SAYS ABOUT DIVISION 293, WHICH CHANGED ON 2026-09-20 (P6-9 chunk 3).** The
  // note said *"Division 293's further 15% is not charged on it"* until the charge was wired; it is
  // charged now, so that sentence would be a FALSE statement on a screen. Both halves are asserted:
  // the new claim, and the absence of the superseded one — a reword that left the old sentence in
  // beside the new one would put two contradictory statements in front of the same reader.
  assert.match(paid[0].note, /DIVISION 293'S FURTHER 15% IS CHARGED ON IT/);
  assert.doesNotMatch(paid[0].note, /further 15% is not charged on it/);
  // ⚠️ **AND WHAT IT SAYS ABOUT THE RELEASE ELECTION, WHICH CHANGED AGAIN ON 2026-09-20 (P6-10
  // M3/M4).** The note said *"the Subdiv 293-B election ... is not modelled"* for the length of
  // P6-9; the election IS performed now, at the year-end settlement, so that sentence would be the
  // same kind of false statement on a screen as the two above. Both halves again — the new claim,
  // and the absence of the superseded one.
  assert.match(paid[0].note, /SUBDIV 293-B ELECTION TO HAVE THAT CHARGE RELEASED FROM THE FUND INSTEAD IS PERFORMED/);
  assert.doesNotMatch(paid[0].note, /election to have that charge RELEASED FROM THE FUND instead is not modelled/);
  // **AND THE LIMITATION THAT IS LEFT IS NAMED, WHICH IS THE HALF A "NOW MODELLED" REWORD LOSES.**
  // ⚠️ **AND ON 2026-09-20 (P6-11) ONE OF THE TWO WAS CLOSED, so the note's caveat NARROWED rather
  // than vanished.** It said *"no screen offers that election — it can only be stated in the plan
  // file"*; the household form states it now, so that sentence would be a false statement on a
  // screen in the same way the three above were. What is left is ONE residual (register O84 (i)), a
  // first or last partial financial year, and the note must still name it: a note that announced
  // the control and dropped the caveat would be claiming a completeness this build does not have.
  assert.match(paid[0].note, /THE ELECTION IS STATED ON THE HOUSEHOLD FORM/);
  assert.doesNotMatch(paid[0].note, /no screen offers that election/);
  assert.match(paid[0].note, /PARTIAL financial year never reaches a settlement/);
  assert.match(paid[0].note, /the LAST thing about this feature that runs in the Household's favour/);
  assert.match(paid[0].note, /more superannuation and less cash than a Person who makes the election/);
  // And it tells the reader what "no election" MEANS, because the control's default answer is a
  // real answer and a user who reads it as an unfilled box would read their own forecast wrong.
  assert.match(paid[0].note, /which is what the law does if you do nothing/);
  // ⚠️ **AND FROM 2026-09-20, EVERY SENTENCE ABOVE IS FOLDED.** All of it is still exactly what the
  // engine wrote and all of it still reaches this row — the assertions above are unchanged, and are
  // the pins that say so. What changed is that it is no longer what is PRINTED: it is the audit
  // record, one click behind `noteLabel`, which is the pure layer's plain statement of what kind of
  // thing it is. So the same vocabulary is asserted ABSENT from the label, in the same two halves.
  assert.doesNotMatch(paid[0].noteLabel, /DIVISION 293|SUBDIV|PARTIAL|low tax contributions|SGAA/);
  plainly(paid[0].noteLabel, 'the Guarantee note’s label');
  assert.ok(paid[0].noteLabel.trim().length > 20, paid[0].noteLabel);
  assert.equal(paid[0].noteLabel, NOTE_TEXT_LABELS['superannuation guarantee']);

  // ⚠️ **THE BLANK BRANCH IS NO LONGER REACHABLE FROM THIS WALK, AND THAT IS THE CHUNK LANDING.**
  // Until chunk 2b every month past FY2026-27 rendered a blank, because the year's maximum
  // contributions base could not be derived without an AWOTE number. It does not need one for
  // Dana: her earnings are below the floor every year's ceiling is at least, so the whole charge is
  // stated for all 480 months of this walk. The blank is kept for the earner who IS above that
  // floor in an unindexable year — asserted below on a synthetic note rather than deleted, because
  // "not computed" and "nothing" rendering the same is the confusion this array exists to end.
  const uncomputed = ROWS.flatMap((r) => r.notes).filter((n) => n.subject === 'superannuation guarantee' && n.available === null);
  assert.deepEqual(uncomputed, [], 'a month of the demo walk cannot state its Guarantee — which year, and why?');
  const synthetic = monthToRow({
    ...MONTHS[0],
    notes: [{
      // SYNTHETIC, and labelled: the shape `superGuaranteeThisMonth` produces for a Person over the
      // floor in a year with no AWOTE index number. No figure here is a fixture's.
      subject: 'superannuation guarantee',
      person: 'Dana',
      qualifyingEarnings: 300_000_00,
      salarySacrificedAmounts: 0,
      chargePercentage: 12,
      annualAmount: null,
      annualAmountCredited: 249_996_0,
      interestIndex: 0,
      creditedToSuperannuation: 17_708_05,
      note: 'the charge on the remaining earnings is REFUSED rather than guessed',
    }],
  }, FUTURE).notes[0];
  assert.equal(synthetic.available, null, 'an undeterminable year must render a BLANK, never a zero');
  assert.notEqual(synthetic.drawn, null);
  assert.equal(synthetic.drawn, formatDollars(17_708_05));
});

test('the three asset figures are reported separately and none is the sum of the others', () => {
  const row = ROWS[0];
  const month = MONTHS[0];
  assert.equal(row.protectedAssets, formatDollars(month.protectedAssets));
  assert.equal(row.assessableAssets, formatDollars(month.assessableAssets));
  assert.equal(row.accessibleAssets, formatDollars(month.accessibleAssets));
  assert.notEqual(row.accessibleAssets, formatDollars(month.protectedAssets + month.assessableAssets));
});

test('`monthToRow` is pure: the same month twice gives deep-equal rows', () => {
  assert.deepEqual(monthToRow(MONTHS[12], FUTURE), monthToRow(MONTHS[12], FUTURE));
});

// --- §7 P7-6 UI — the Household position, or the Persons' -----------------------------------------
//
// The split is the widening `Month.assetsByPerson` made visible, and it is written against four
// ways a renderer could lie about it:
//
//   1. **PERSON 0's MONEY UNDER PERSON 1's NAME.** The figures carry no name on purpose; the only
//      thing that pairs a figure with a person is its POSITION, so every assertion below pairs them
//      by index and the demo couple's figures are asserted to differ before any of it.
//   2. **A COUPLE COLLAPSED TO ONE MEMBER.** Both tuple shapes are real. §7 walks the whole demo
//      walk asserting two members, and runs a one-Person Household asserting exactly one.
//   3. **THE HOUSEHOLD SCALAR SHOWN AS A PERSON'S.** The Offset Account is in the Household figures
//      and in neither Person's, so the two genuinely differ — asserted per month, not once.
//   4. **THE OFFSET SILENTLY DROPPED OR FOLDED IN.** It is neither: it is its own block, and the
//      note that says no Person owns a share of it is a field of the row.
const SPLIT_VIEW = { mode: 'person', labels: personLabels(DEMO_HOUSEHOLD.persons) };
const SPLIT_ROWS = monthsToRows(MONTHS, FUTURE, SPLIT_VIEW);

test('the Household view is the DEFAULT, and it does not read the per-Person figures at all', () => {
  assert.equal(DEMO_HOUSEHOLD.persons.length, 2);
  for (const row of ROWS) assert.equal(row.assetsByPerson, null, `${row.month} read the split in the default view`);
  assert.deepEqual(monthsToRows(MONTHS, FUTURE, HOUSEHOLD_ASSETS), ROWS);
  // And the three scalars are on the row in BOTH views: the split is a widening, not a swap.
  for (const [i, row] of SPLIT_ROWS.entries()) {
    assert.equal(row.protectedAssets, ROWS[i].protectedAssets);
    assert.equal(row.assessableAssets, ROWS[i].assessableAssets);
    assert.equal(row.accessibleAssets, ROWS[i].accessibleAssets);
  }
});

test('every Person’s three figures are that Person’s own, paired by INDEX and never by name', () => {
  // Vacuity control first: Dana and Ash must actually hold different money, or a swapped index
  // would be invisible. Counted, not asserted once — a single month could be a coincidence. It is
  // the TRIPLE that is compared: the two Persons' protected figures are equal in 396 of the 501
  // months (both nil once Dana has reached Age Pension age), so a per-field control would be the
  // weaker claim.
  const triple = (figures) => [figures.protectedAssets, figures.assessableAssets, figures.accessibleAssets].join('|');
  const differing = MONTHS.filter((month) => triple(month.assetsByPerson[0]) !== triple(month.assetsByPerson[1])).length;
  // ⚠️ **351 OF 501, WHERE IT WAS ALL 501, SINCE REGISTER O85 (2026-09-21).** The stated spending
  // level is a REAL figure now, so this household's money runs out and from the month after it BOTH
  // Persons hold nothing — two nil triples are the same triple, and a swapped index really is
  // invisible in those months. The control is therefore stated over the months where it can bite.
  //
  // ⚠️ **ONE MONTH EARLIER SINCE P10-5 (2026-09-21), and 352 became 351.** The demo plan is stated
  // as at 1 September, so Ash's pension pays its FY2026-27 minimum from month one instead of from
  // 2027-07; that money is drawn ten months sooner and spent, so every exhaustion downstream of it
  // arrives a month sooner. **It is the same one month in three independent fixtures** — the
  // shortfall marker, this count, and the Offset's own emptying below — which is what makes it one
  // mechanism rather than three movements.
  //
  // ⚠️ **ALL 501 AGAIN SINCE 2026-09-23.** A plan with no series now INDEXES the Age Pension on its
  // own growth rates, and the demo couple never runs out — so no month holds two nil triples and
  // the control bites in every month of the walk once more.
  assert.equal(351, 351, 'the pre-2026-09-23 count, kept beside the new one');
  assert.equal(differing, 501, `only ${differing} of ${MONTHS.length} months tell the two Persons apart`);
  assert.equal(MONTHS.find((month) => triple(month.assetsByPerson[0]) === triple(month.assetsByPerson[1])), undefined);

  for (const [i, row] of SPLIT_ROWS.entries()) {
    const month = MONTHS[i];
    assert.equal(row.assetsByPerson.persons.length, month.assetsByPerson.length, `${month.month}`);
    for (const [index, person] of row.assetsByPerson.persons.entries()) {
      assert.equal(person.index, index);
      assert.equal(person.label, DEMO_HOUSEHOLD.persons[index].name, `${month.month} person ${index}`);
      assert.equal(person.protectedAssets, formatDollars(month.assetsByPerson[index].protectedAssets));
      assert.equal(person.assessableAssets, formatDollars(month.assetsByPerson[index].assessableAssets));
      assert.equal(person.accessibleAssets, formatDollars(month.assetsByPerson[index].accessibleAssets));
    }
  }
});

test('a couple is never collapsed to one member, and the shape is said in words', () => {
  for (const row of SPLIT_ROWS) {
    assert.equal(row.assetsByPerson.persons.length, 2, `${row.month} reported ${row.assetsByPerson.persons.length} member(s)`);
    assert.equal(row.assetsByPerson.shape, SPLIT_SHAPE_LABELS[2]);
  }
  assert.notEqual(SPLIT_SHAPE_LABELS[1], SPLIT_SHAPE_LABELS[2]);
});

test('a ONE-Person Household gets exactly one member and says so — the other real tuple shape', () => {
  // A labelled synthetic fixture: the demo Household with Ash removed, and Dana's own entries only.
  // It exists because the committed fixture is a couple and the one-member tuple would otherwise be
  // rendered by nothing, which is the shape a renderer assuming two people breaks on.
  const soleHousehold = { ...DEMO_HOUSEHOLD, persons: [DEMO_HOUSEHOLD.persons[0]] };
  const soleMonths = project(DEMO_SETTINGS, soleHousehold, DEMO_ENTRIES);
  const soleRows = monthsToRows(soleMonths, FUTURE, { mode: 'person', labels: personLabels(soleHousehold.persons) });
  assert.ok(soleRows.length > 300);
  for (const row of soleRows) {
    assert.equal(row.assetsByPerson.persons.length, 1, `${row.month} reported ${row.assetsByPerson.persons.length} member(s)`);
    assert.equal(row.assetsByPerson.persons[0].index, 0);
    assert.equal(row.assetsByPerson.persons[0].label, 'Dana');
    assert.equal(row.assetsByPerson.shape, SPLIT_SHAPE_LABELS[1]);
  }
  const first = soleRows[0].assetsByPerson.persons[0];
  assert.equal(first.assessableAssets, formatDollars(soleMonths[0].assetsByPerson[0].assessableAssets));
  assert.notEqual(first.assessableAssets, '$0');
});

test('a Person’s figure is not the Household’s — and the two clocks are visible in the counts', () => {
  // **The gap between a Person's figure and the Household's IS the Offset Account**, which belongs
  // to neither Person. So the months in which every Person's figure differs from the Household's
  // are exactly the months in which the Offset holds something — and, because the assessable figure
  // is read at the month's OPENING and the reachable one at its CLOSE, the two counts are the two
  // balances' own counts and they are not the same number. The demo walk empties the Offset in one
  // month, which is why the two counts differ by exactly one. A build that showed the Household
  // scalar as a Person's would put both counts at 0.
  //
  // **201/200 until 2026-09-21, emptying during 2043-05; 220/219 since, emptying during 2044-12
  // (P4-1e).** The Age Pension is paid past the published window, so the Offset is topped up for
  // another nineteen months before it runs dry — the same nineteen months by which the first
  // released-super draw moved in `core-waterfall-released-super.test.mjs`. One mechanism, two
  // files, and the counts agree with it.
  //
  // ⚠️ **FROM 2026-09-23 THE COUNTS BELOW ARE TAKEN ON `KEPT_MONTHS`, and every one is unchanged.**
  // On the plan as committed the Offset NEVER empties: Dana's account is an account-based pension
  // from 2031-06, limb 2 pays the bills out of it before the Offset is reached, and each June's
  // unspent minimum is swept INTO the Offset. So every month opens and closes with cash, both counts
  // are the walk's length, and the two clocks cannot be told apart there — asserted first, then the
  // kept-out walk, where the Offset empties, shows them.
  //
  // ⚠️ **AND SINCE "SPEND CASH FIRST" (later on 2026-09-23) THE COMMITTED WALK EMPTIES ITS CASH
  // AGAIN.** The demo owes no home loan, so none of its cash is offsetting one, and it is spent
  // straight after each year's pension minimum: gone during 2033-02, and nil until 2046-06, when
  // the Age Pension and the pension minimums outrun the bills and cash builds up again. The Offset
  // is still not what tells the clocks apart on this walk, though: from 2031-06 BOTH Persons hold an
  // account-based pension, so neither Person's figure is ever the Household's, cash or no cash — the
  // counts are the walk's length. The kept-out walk, where Dana's account is protected until 67,
  // is the one whose gap IS the Offset, and it shows the two clocks apart below.
  assert.notEqual(DEMO_HOUSEHOLD.openingOffsetBalance, 0);
  const everyPersonDiffers = (row, field) => row.assetsByPerson.persons.every((person) => person[field] !== row[field]);
  assert.equal(SPLIT_ROWS.filter((row) => everyPersonDiffers(row, 'assessableAssets')).length, MONTHS.length);
  assert.equal(SPLIT_ROWS.filter((row) => everyPersonDiffers(row, 'accessibleAssets')).length, MONTHS.length);
  // 333 and 2032-06 since May 2031 pays Dana's days worked (2026-09-23): June's sweep of Ash's
  // unspent minimum leaves more cash, and it lasts one month longer. 332 and 2032-05 before.
  // **341 and 2033-02 since pay rises with wages (2026-09-23)**: the higher pay is banked as cash
  // while she works, and at the ~$8,000 a month it is spent at once she retires, it lasts eight
  // months longer.
  assert.equal(MONTHS.filter((month) => month.openingBalance > 0).length, 341);
  assert.equal(MONTHS.filter((month) => month.closingBalance > 0).length, 341);
  assert.equal(MONTHS.find((month) => month.closingBalance === 0).month, '2033-02');
  assert.equal(MONTHS.find((month) => month.month > '2033-02' && month.closingBalance > 0).month, '2046-06');
  const keptSplit = monthsToRows(KEPT_MONTHS, FUTURE, SPLIT_VIEW);
  const assessable = keptSplit.filter((row) => everyPersonDiffers(row, 'assessableAssets')).length;
  const accessible = keptSplit.filter((row) => everyPersonDiffers(row, 'accessibleAssets')).length;
  // ⚠️ **"THE GAP IS THE OFFSET" WAS TRUE OF THIS WALK ONLY BECAUSE THE OFFSET WAS THE LAST THING
  // ASH'S SIDE HELD, and since "spend cash first" (2026-09-23) it is not.** The gap between a Person's
  // figure and the Household's is everything the Household holds that is NOT that Person's: the
  // Offset AND the other Person's pools. Cash with no loan to offset is now spent first, so the last
  // thing to go is Ash's pension, not the Offset. Stated as the identity it always was, per month and
  // per clock — the Offset at the month's opening beside the assessable figures, at its close beside
  // the reachable ones:
  const othersHold = (month, field, cash) =>
    month.assetsByPerson.every((_person, i) => month.assetsByPerson.reduce((total, other, j) => (j === i ? total : total + other[field]), 0) + cash !== 0);
  assert.equal(assessable, KEPT_MONTHS.filter((month) => othersHold(month, 'assessableAssets', month.openingBalance)).length);
  assert.equal(accessible, KEPT_MONTHS.filter((month) => othersHold(month, 'accessibleAssets', month.closingBalance)).length);
  // **AND 172/171 SINCE 2026-09-21, emptying during 2040-12.** Two changes landed on the same day
  // and both are in this number. Register **O85** made the spending target a REAL figure, so the
  // Offset meets a rising bill and is exhausted forty-seven months sooner than it once was. **P10-5**
  // then moved it one month further: Ash's pension pays its opening part-year now, that money is
  // spent, and the Offset carries the rest a month less far. 2040-12 is month 171 of a walk that
  // opens in 2026-09, so 172 months OPEN with something in the Offset and 171 CLOSE with it.
  // **AND 192/191 SINCE 2026-09-23, emptying during 2042-08.** A plan with no series now INDEXES the
  // Age Pension on its own growth rates, so more of every month's bill is met by the pension and the
  // Offset lasts twenty months longer — the same twenty by which the first released-super draw
  // moved in `core-waterfall-released-super.test.mjs` (2040-12 → 2042-08). One mechanism, two files.
  assert.equal(220, 220, 'the pre-O85 count, kept beside the new one');
  assert.equal(172, 172, 'the pre-2026-09-23 count, kept beside the new one');
  // **AND 195/194 WITH INTEREST ON CASH (2026-09-23), emptying during 2042-11.** The cash earns the
  // plan's 2.5% CPI. The Offset's plateau is $3,094.33 higher, and while it sits still its interest
  // is spent first and spares the pension account it waits behind, so it starts falling later; at
  // the ~$7,400 a month it is drawn down by, it empties three months later. The same three months move the first released-super
  // draw in `core-waterfall-released-super.test.mjs` (2042-08 → 2042-11).
  assert.equal(192, 192, 'the pre-interest count, kept beside the new one');
  // **AND 198/197 WITH "SPEND CASH FIRST" (2026-09-23), the gap closing during 2043-02.** The
  // Offset itself now empties during 2032-04 — with no home loan owing none of it is offsetting one,
  // so it is spent straight after Ash's minimum — but Ash's pension outlasts it, and the gap closes
  // the month THAT runs out: three months later than the Offset used to, the same three months the
  // first released-super draw moved in `core-waterfall-released-super.test.mjs` (2042-11 → 2043-02).
  assert.equal(195, 195, 'the pre-order count, kept beside the new one');
  // **AND 200/199 SINCE PAY RISES WITH WAGES (2026-09-23), the gap closing during 2043-04** — two
  // months later, the same two by which the first released-super draw moved in
  // `core-waterfall-released-super.test.mjs` (2043-02 → 2043-04): the higher pay Dana banked leaves
  // Ash's pension $10,863.41 more to spend before it runs out. The Offset itself now empties during
  // 2032-12.
  assert.equal(198, 198, 'the pre-wage-growth count, kept beside the new one');
  // **AND 199/198 SINCE DIV 119 (LR-1 slice 3, 2026-09-29), the gap closing during 2043-03** — one
  // month sooner, the same month by which the first released-super draw moved in
  // `core-waterfall-released-super.test.mjs` (2043-04 → 2043-03). On this walk Dana's sales pay
  // $7,858.21 of minimum tax from 2033-01 to 2035-06 (none refunded: her accumulation account counts
  // from 67, so no pension is paid in June 2035 and FY2034-35 is not exempt), and each sale grows by
  // that tax, so Ash's pension has that much less to spend before it runs out.
  assert.equal(200, 200, 'the pre-Div 119 count, kept beside the new one');
  assert.equal(assessable, 199);
  assert.equal(accessible, 198);
  assert.equal(KEPT_MONTHS.findIndex((month) => month.month === '2043-03'), 198);
  // 2032-05 once May 2031 paid Dana's days worked (2026-09-23), and 2032-12 since pay rises.
  assert.equal(KEPT_MONTHS.find((month) => month.closingBalance === 0).month, '2032-12');
  assert.equal(assessable - accessible, 1, 'the one month the Offset empties in');
});

test('the Offset Account is neither dropped nor folded into a Person — it is its own block', () => {
  const offset = SPLIT_ROWS[0].assetsByPerson.offset;
  assert.equal(offset, OFFSET_ATTRIBUTION);
  assert.match(offset.label, /Offset Account/);
  assert.match(offset.note, /No Person owns a share/);
  // The block carries no figure of its own: the row's own opening and closing balances are what
  // report it, each on its own clock, and a second formatting of them here would be a second fact.
  assert.deepEqual(Object.keys(offset), ['label', 'note']);
});

test('labels come from `household.persons` by position — duplicated and blank names still name someone', () => {
  assert.deepEqual(personLabels(DEMO_HOUSEHOLD.persons), ['Dana', 'Ash']);
  assert.deepEqual(personLabels([{ name: 'Sam' }, { name: 'Sam' }]), ['Sam (person 1)', 'Sam (person 2)']);
  assert.deepEqual(personLabels([{ name: 'Sam' }, { name: '  ' }]), ['Sam', 'Person 2']);
});

test('a labels array of the wrong length is refused, not silently paired', () => {
  assert.throws(() => monthToRow(MONTHS[0], FUTURE, { mode: 'person', labels: ['Dana'] }), RangeError);
  assert.throws(() => monthToRow(MONTHS[0], FUTURE, { mode: 'person', labels: [] }), RangeError);
});

test('`monthsToRows` passes the VIEW to every row, not the array index', () => {
  // `map(monthToRow)` would hand row 1 onwards a number where the view belongs. Row 0 would still
  // look right (index 0 is falsy-ish and would take the default), so this is asserted on a late row.
  assert.equal(SPLIT_ROWS[SPLIT_ROWS.length - 1].assetsByPerson.persons.length, 2);
  assert.equal(monthsToRows(MONTHS, FUTURE)[MONTHS.length - 1].assetsByPerson, null);
});

// --- §8 The engine's words are TRANSLATED, never rewritten (2026-09-20) --------------------------
//
// The strings a `Month` carries are written for someone checking a figure against the rule that
// made it, and `test/core-*` pins them for that reason. They were reaching the screen verbatim:
// "low tax contributions", "SUBDIV 293-B ELECTION", "secondary-only",
// `tax.medicareLevy.lowIncomeThresholds.singleLower`. The fix is at THIS layer and takes two forms
// and no third — a label decided from the engine's TYPE, and the engine's own sentence kept word
// for word behind it — so §8 is written against the three ways that could go wrong:
//
//   1. **THE JARGON STILL ON THE PAGE.** The sweep below walks every field `renderTable.ts` prints
//      OPEN, over the whole demo walk, and refuses this build's vocabulary in any of them.
//   2. **THE RECORD QUIETLY REWORDED.** A paraphrase of a citation on screen wearing the authority
//      of the citation is worse than the citation. Every folded string is asserted to be the
//      engine's own, to the character.
//   3. **A TRANSLATION THAT MEANS SOMETHING WARMER.** Above all for confidence: `secondary-only`
//      turned into a label without a negation in it would launder confidence upward, which is the
//      one direction that field must never be wrong in.

test('how well checked a figure is, said in WORDS — and the weakness survives the translation', () => {
  const tokens = ['primary-verified', 'primary-via-archive', 'secondary-only', 'unverified', 'nothing carried'];
  const labels = tokens.map((token) => CONFIDENCE_LABELS[token]);
  assert.equal(new Set(labels).size, 5, `two confidence tokens share a label: ${JSON.stringify(labels)}`);
  for (const [i, label] of labels.entries()) {
    assert.ok(label.trim().length > 15, `the ${tokens[i]} label is empty or a placeholder: ${JSON.stringify(label)}`);
    assert.doesNotMatch(label, /primary|secondary|unverified|nothing carried/i, `the ${tokens[i]} label still prints the token`);
  }
  // **THE DIRECTION, and it is the point of the whole map.** `docs/assumptions-register.md` defines
  // the weak three as NOT read from the statute; each label says so in terms, and the strong one
  // does not. A reword that dropped the negation from `secondary-only` would pass every other
  // assertion here and would tell a reader a corroborated figure was checked against the law.
  for (const weak of ['primary-via-archive', 'secondary-only', 'unverified']) {
    assert.match(CONFIDENCE_LABELS[weak], /\bnot\b/i, `the ${weak} label reads as though the figure were verified`);
  }
  assert.doesNotMatch(CONFIDENCE_LABELS['primary-verified'], /\bnot\b/i);
  // And the labels are what the ROWS carry — at the month and on the line, both of which print it.
  const onMonths = new Set(ROWS.map((row) => row.provenance.confidence));
  assert.ok(onMonths.size > 1, 'every month of the walk reports the same confidence — this is vacuous');
  const onLines = new Set(ROWS.flatMap(linesOf).map((line) => line.provenance.confidence).filter((c) => c !== null));
  assert.ok(onLines.size > 0, 'no line of the walk carries a confidence');
  for (const shown of [...onMonths, ...onLines]) {
    assert.ok(labels.includes(shown), `a row reports a confidence that is not one of the five labels: ${JSON.stringify(shown)}`);
  }
});

test('every month note puts a PLAIN sentence on the page and the engine’s own words behind it', () => {
  const engineNotes = MONTHS.flatMap((month) => month.notes);
  const rowNotes = ROWS.flatMap((row) => row.notes);
  assert.equal(rowNotes.length, engineNotes.length);
  assert.ok(rowNotes.length > 1000, `only ${rowNotes.length} notes in the walk`);
  let folded = 0;
  for (const [i, note] of rowNotes.entries()) {
    assert.ok(note.noteLabel.trim().length > 20, `${note.subject} has no label: ${JSON.stringify(note.noteLabel)}`);
    plainly(note.noteLabel, `the ${note.subject} label`);
    // Word for word: the record is MOVED, not rewritten. (`'super withdrawal'` appends the tax
    // figure, pinned in "a super withdrawal row …" below, so this is `includes`.)
    assert.ok(note.note.includes(engineNotes[i].note), `${note.subject} reworded the engine's sentence`);
    if (SHOUTED.test(note.note) || BANNED_WORDS.test(note.note)) folded += 1;
  }
  // **Vacuity control.** If none of the folded text were the kind this section exists to fold, every
  // assertion above would be about nothing. Counted, not found once.
  // **Over 1,000 rather than 2,000 since "spend cash first" (2026-09-23).** The pension limb's note
  // ("… is a FLOOR … so the limb offers the whole account") and the Offset limb's ("… this walk's own
  // running cash balance") were rewritten in plain words that day, and the two new limbs were written
  // plain from the start: 501 × 2 = 1,002 fewer notes need folding, 2,061 → 1,059.
  assert.ok(folded > 1000, `only ${folded} of ${rowNotes.length} notes carry anything worth folding`);
});

test('the eight note subjects get eight DIFFERENT labels — one label for two would say nothing', () => {
  // Five since 2026-09-21 (P4-1e). The fifth is the hardest of them to keep distinct, because in
  // plain English it wants the same words as `'parameter window'` — "rates used" — so the two are
  // deliberately split into what rates were used and how OLD they are.
  //
  // **SIX from 2026-09-21 (P6-8 brief 4): a salary sacrifice the user STOPPED.** It is the second
  // member whose plain-English name collides with a neighbour's — "salary sacrifice" is already
  // what the contribution LINE is called — so this one names what happened to the arrangement
  // rather than the arrangement, and its row carries no money at all.
  //
  // **SEVEN from 2026-09-21 (P10-5): which balance a year's pension minimum was worked out from.**
  // The third collision, and the sharpest: "pension minimum" is already the name of the PAYMENT and
  // of its lines, so this one names the BASIS and never the payment.
  //
  // **EIGHT from 2026-09-22 (P3-22h step 2): a non-super portfolio distribution, reinvested.** No
  // money moved that `'cash'` or `'wealth'` can truthfully name, so this is a note; "distribution"
  // is not on P3-22h step 1's banned-word list — only "franking", "imputation", "gross-up" and
  // "offset" are, none of which this label or note text uses.
  //
  // **NINE from 2026-09-23: what happened to a Person's super at retirement.** "Pension" is taken
  // twice already (the payment and the minimum's basis), so this one names the EVENT — retirement —
  // and its row carries no money: the switch moves none.
  //
  // **TEN from 2026-09-23: a year's concessional contributions went over the cap.** Its label names
  // the direction it leaves the forecast in, which no other subject's does.
  //
  // **ELEVEN from 2026-09-24 (P9-1, slice 1): the Home Equity Access Scheme's capacity cap reached.**
  // Its label names what stopped (the loan payments) and what did not (interest), which is the
  // whole point of the note existing rather than a silent stop.
  //
  // **TWELVE from 2026-09-30 (LR-3): a low income super tax offset left out** because every account
  // is a pension by the July it would be paid. Its label names the direction, like the cap note's.
  const labels = Object.values(NOTE_TEXT_LABELS);
  assert.equal(labels.length, 12);
  assert.equal(new Set(labels).size, 12, `two note subjects share a label: ${JSON.stringify(labels)}`);
  for (const label of labels) assert.ok(label.trim().length > 20, JSON.stringify(label));
  // And each subject of the walk carries its own. The withdrawal label is a PREFIX — the tax figure
  // is composed onto it, because folding a dollar amount away behind a disclosure would hide money.
  for (const note of ROWS.flatMap((row) => row.notes)) {
    if (note.subject === 'super withdrawal') {
      assert.ok(note.noteLabel.startsWith(NOTE_TEXT_LABELS['super withdrawal']), note.noteLabel);
      assert.match(note.noteLabel, /\$[\d,]+(?![.\d])/, 'the tax figure left the page when the text was folded');
    } else {
      assert.equal(note.noteLabel, NOTE_TEXT_LABELS[note.subject], note.subject);
    }
  }
});

test('a stopped salary sacrifice renders as a row with NO money in it, and says what stopped', () => {
  // **P6-8 brief 4.** The demo couple state no sacrifice, so the sixth note member is unreachable
  // from `MONTHS` above and the walk that produces one is built here — a Person who arranges a
  // sacrifice and then ends it. The note is taken from the ENGINE and not written by hand: a
  // hand-built note would test this file against itself.
  const household = {
    persons: [{
      name: 'Dana', dateOfBirth: '1980-06-10',
      superInterests: [{ phase: 'accumulation', balance: toCents(120_000), statedEmployerContributionDestination: 'superannuationGuarantee' }],
      parcels: [], employmentIncomePerFortnight: toCents(0), workBonusBalance: toCents(0),
    }],
    homeStatus: 'occupied', openingOffsetBalance: toCents(30_000),
  };
  const settings = { ...DEMO_SETTINGS, asAtDate: '2026-07-01', planningHorizonAge: 50 };
  const made = (id, type, date, params) => ({ id, date, owner: id === 'spend' ? 'household' : 'personA', type, params, enabled: true, createdAt: '2026-01-01' });
  const months = project(settings, household, [
    made('spend', 'SPEND_CHANGE', '2026-07-01', { annualSpend: toCents(40_000) }),
    made('work', 'WORK_PATTERN_CHANGE', '2026-07-01', { daysPerWeek: 5, annualSalary: toCents(80_600) }),
    made('sac', 'SUPER_CONTRIBUTION', '2027-07-01', { kind: 'salarySacrificed', annualAmount: toCents(15_000), interestIndex: 0 }),
    made('stop', 'SUPER_CONTRIBUTION', '2029-01-01', { kind: 'stopped' }),
  ]);
  const rows = monthsToRows(months, { view: 'futureDollars', asAtDate: settings.asAtDate, cpi: settings.economicSeries.cpi });
  const row = rows.find((each) => each.month === '2029-06').notes.find((each) => each.subject === 'salary sacrifice stopped');
  assert.ok(row !== undefined, 'the walk emits no stopped note — the fixture proves nothing');
  // **BOTH money columns are blank, which no other member but the two window-ish ones does.** A nil
  // in either would be a figure, and a reader would take it for an arrangement contributing nothing
  // rather than for one that is over.
  assert.equal(row.available, null);
  assert.equal(row.drawn, null);
  assert.equal(row.of, 'Dana — stopped from 2029-01-01');
  assert.equal(row.subjectLabel, 'Salary sacrifice stopped');
  assert.equal(row.noteLabel, NOTE_TEXT_LABELS['salary sacrifice stopped']);
  // The engine's sentence, word for word, and a plain-English gloss of the term behind the button.
  assert.equal(row.note, months.find((each) => each.month === '2029-06').notes.find((each) => each.subject === 'salary sacrifice stopped').note);
  assert.match(row.detail, /Salary sacrifice is money your employer puts into your super/);
  // And the control: the month before the stop has no such row at all.
  assert.equal(rows.find((each) => each.month === '2028-12').notes.filter((each) => each.subject === 'salary sacrifice stopped').length, 0);
});

test('a super withdrawal row names the account the way the entry table does, and keeps the tax on the page', () => {
  // **P6-14.** This wording was pinned in `test/core-lump-sum-from-super.test.mjs`, a core file,
  // which held the head at "Robin, interest 0". It is app wording and is pinned here. The note is
  // the ENGINE's, off `core-lump-sum-from-super`'s own fixture: Robin, 61, retired at 60, holding two
  // transition-to-retirement accounts — two, so the head is seen to follow the entry's account.
  const ttr = (dollars) => ({ phase: 'ttr', balance: toCents(dollars) });
  const person = (name, dateOfBirth, superInterests) => ({
    name, dateOfBirth, superInterests, parcels: [], employmentIncomePerFortnight: toCents(0), workBonusBalance: toCents(0),
  });
  const household = {
    persons: [person('Kit', '1960-01-15', []), person('Robin', '1965-06-10', [ttr(900_000), ttr(100_000)])],
    homeStatus: 'occupied', openingOffsetBalance: toCents(5_000),
  };
  const settings = { ...DEMO_SETTINGS, asAtDate: '2026-07-01', planningHorizonAge: 66, economicSeries: { cpi: 0, pblci: 0.025, awote: 0.035, mtawe: 0.035 } };
  const made = (id, owner, type, date, params) => ({ id, date, owner, type, params, enabled: true, createdAt: '2026-06-01' });
  const first = made('ls0', 'personB', 'LUMP_SUM_FROM_SUPER', '2027-01-01', { amount: toCents(300_000), interestIndex: 0 });
  const second = made('ls1', 'personB', 'LUMP_SUM_FROM_SUPER', '2027-03-01', { amount: toCents(50_000), interestIndex: 1 });
  const months = project(settings, household, [
    made('sc', 'household', 'SPEND_CHANGE', '2026-07-01', { annualSpend: toCents(80_000) }),
    made('rr', 'personB', 'RETIRE', '2025-08-01', {}),
    first,
    second,
  ]);
  const rows = monthsToRows(months, { view: 'futureDollars', asAtDate: settings.asAtDate, cpi: 0 });
  const withdrawal = (month) => rows.find((each) => each.month === month).notes.find((each) => each.subject === 'super withdrawal');
  const engineNote = (month) => months.find((each) => each.month === month).notes.find((each) => each.subject === 'super withdrawal');

  // Stored positions 0 and 1; the page counts from 1, as the settings panel's "Super account 1" does.
  for (const [month, entry, amount, account] of [['2027-01', first, '$300,000', 'super account 1'], ['2027-03', second, '$50,000', 'super account 2']]) {
    const row = withdrawal(month);
    assert.ok(row !== undefined, `the walk emits no withdrawal note in ${month} — the fixture proves nothing`);
    assert.equal(row.subjectLabel, 'Super withdrawal');
    assert.equal(row.available, amount);
    assert.equal(row.drawn, amount);
    // The head: the Person, then the account in the entry table's own words for the same entry,
    // numbered from 1 while the entry still stores the position from 0.
    assert.equal(entry.params.interestIndex + 1, Number(account.split(' ').pop()));
    assert.equal(row.of, `Robin — ${account}`);
    assert.ok(entrySummary(entry).endsWith(` out of ${account}`), `the entry table names this account differently: ${entrySummary(entry)}`);
    assert.doesNotMatch(row.of, /, interest \d/, 'the bare array position is back on the head');
    // The tax: in the folded text AND on the label beside it, so folding hid no dollar amount.
    assert.equal(engineNote(month).taxWithheld, toCents(0));
    assert.equal(row.note, `${engineNote(month).note} Tax withheld: $0.`);
    assert.equal(row.noteLabel, `${NOTE_TEXT_LABELS['super withdrawal']}: $0 — why it is that figure, and what it assumes`);
  }
});

test('a provenance or attribution sentence is folded behind a plain statement of what it IS', () => {
  const four = [...Object.values(PROVENANCE_NOTE_LABELS), ...Object.values(ATTRIBUTION_NOTE_LABELS)];
  assert.equal(four.length, 4);
  assert.equal(new Set(four).size, 4, `two of the four note labels are the same sentence: ${JSON.stringify(four)}`);
  let folded = 0;
  let jargon = 0;
  for (const line of ROWS.flatMap(linesOf)) {
    for (const cell of [line.provenance, line.attribution]) {
      // A label without a sentence, or a sentence without a label, is a button with nothing behind
      // it or a citation with nothing in front of it. Neither may exist.
      assert.equal(cell.noteLabel === null, cell.note === null, line.description);
      if (cell.note === null) continue;
      folded += 1;
      assert.ok(cell.noteLabel.trim().length > 15, JSON.stringify(cell.noteLabel));
      plainly(cell.noteLabel, `${line.description}'s folded label`);
      assert.ok(four.includes(cell.noteLabel), JSON.stringify(cell.noteLabel));
      if (BANNED_WORDS.test(cell.note) || DOTTED_KEY.test(cell.note)) jargon += 1;
    }
  }
  assert.ok(folded > 1000, `only ${folded} lines of the walk carry a note`);
  assert.ok(jargon > 500, `only ${jargon} of ${folded} folded sentences carry anything worth folding`);
});

test('the rule’s own working is kept word for word, and a plain heading stands in front of it', () => {
  assert.ok(DETERMINATION_DISCLOSURE.label.trim().length > 20);
  assert.ok(DETERMINATION_DISCLOSURE.detail.trim().length > 80);
  plainly(DETERMINATION_DISCLOSURE.label, 'the working’s heading');
  // VERBATIM, line by line, over the whole walk: `cashLines` then `wealthLines` is the month's own
  // `lines` partitioned on `effect` in order, so the pairing below is by position and by nothing
  // else. A summarised or reordered working would fail here rather than read plausibly on screen.
  let withWorking = 0;
  for (const [i, row] of ROWS.entries()) {
    const engineLines = [
      ...MONTHS[i].lines.filter((line) => line.effect === 'cash'),
      ...MONTHS[i].lines.filter((line) => line.effect === 'wealth'),
    ];
    for (const [j, line] of linesOf(row).entries()) {
      assert.deepEqual(line.provenance.determination, [...(engineLines[j].provenance.determination ?? [])], row.month);
      if (line.provenance.determination.length > 0) withWorking += 1;
    }
  }
  assert.ok(withWorking > 100, `only ${withWorking} lines of the walk state a working`);
  // Vacuity control: the working really is written in the rule's terms, with raw cents in it.
  const raw = ROWS.flatMap(linesOf).flatMap((line) => line.provenance.determination);
  assert.ok(raw.some((text) => /\d{4,} cents/.test(text)), 'no working carries a cent figure — the fold may be about nothing');
});

test('a caveat shows its KIND on the page and the citation behind it, unedited', () => {
  const caveats = ROWS.flatMap((row) => row.provenance.caveats);
  assert.ok(caveats.length > 300, `only ${caveats.length} caveats in the walk`);
  let keyed = 0;
  for (const caveat of caveats) {
    assert.equal(caveat.label, CAVEAT_LABELS[caveat.kind]);
    assert.ok(caveat.label.trim().length > 20, JSON.stringify(caveat.label));
    plainly(caveat.label, 'a caveat label');
    if (DOTTED_KEY.test(caveat.text)) keyed += 1;
  }
  // Vacuity control, and the whole reason the two are separate fields: the citation names the figure
  // it is about by its internal key, and the label never does.
  assert.ok(keyed > 300, `only ${keyed} caveats name a key — the split between label and text is about nothing`);
});

test('a real name keeps its name and gets a gloss, and the gloss is written ONCE', () => {
  for (const [name, gloss] of Object.entries(REGISTER_DETAILS)) {
    assert.ok(gloss.trim().length > 80, `the gloss of ${name} is a stub: ${JSON.stringify(gloss)}`);
    plainly(gloss, `the gloss of ${name}`);
  }
  // The Division 293 gloss must carry the two facts that make the name mean anything — otherwise it
  // is a friendly sentence that leaves a reader no better able to check the figure beside it.
  assert.match(REGISTER_DETAILS['Division 293 tax'], /\$250,000/);
  assert.match(REGISTER_DETAILS['Division 293 tax'], /smaller|lesser/i);
  // **ONE gloss of the Account-Based Pension minimum, read from one place.** The same rule is named
  // in a line's provenance and at the head of a money-source note, and two copies of one explanation
  // are two things that can be reworded apart. The length floor is what keeps this from being a
  // constant compared with itself: emptying the gloss would pass the equalities and fail here.
  const uncarried = everyLine.find((l) => l.provenance.basis === 'not carried');
  const cell = provenanceCell(uncarried.provenance);
  // The limb's TITLE was "Account-Based Pension" for part of 2026-09-23 and is two titles since
  // "spend cash first" split the account at its minimum — both glossed from the ONE register, which
  // keeps the rule's name.
  const limbNote = ROWS.flatMap((row) => row.notes).find((n) => n.of === "Account-Based Pension, this year's minimum");
  const aboveNote = ROWS.flatMap((row) => row.notes).find((n) => n.of === "Account-Based Pension, above this year's minimum");
  assert.ok(aboveNote !== undefined, 'no money-source note names the pension above its minimum');
  assert.equal(aboveNote.detail, limbNote.detail);
  assert.ok(limbNote !== undefined, 'no money-source note names the Account-Based Pension');
  assert.ok(limbNote.detail.trim().length > 100, limbNote.detail);
  assert.equal(cell.registerDetail, limbNote.detail);
  assert.equal(cell.registerDetail, REGISTER_DETAILS['Account-Based Pension minimum']);
  // And the NAME itself is the engine's, unrenamed: a household that meets these words on a
  // statement or an ATO notice must be able to match them to this screen.
  assert.equal(cell.register, uncarried.provenance.register);
  for (const [i, row] of ROWS.entries()) {
    assert.deepEqual(row.provenance.registers, [...MONTHS[i].provenance.registers], row.month);
    assert.deepEqual(row.provenance.uncarried, [...MONTHS[i].provenance.uncarried], row.month);
  }
});

test('NOTHING PRINTED OPEN carries this build’s own vocabulary — the whole walk, every field', () => {
  // **The list is of what `renderTable.ts` prints OPEN.** Everything else it writes goes through
  // `infoButton`, which folds it; the DOM writer is untested for the reason this file's header
  // gives, so the list is kept here and the claim is about the substance rather than the markup.
  //
  // ⚠️ **ONE EXCLUSION, AND IT IS A KNOWN GAP RATHER THAN AN OVERSIGHT**: `appliedEntryIds` and a
  // line's `attribution.entryIds` are printed open and are internal slugs (`dana-retires`). They
  // cannot be translated here — `monthToRow` is given a `Month` and no entries, so the text that
  // would replace an id is not reachable from this function — and inventing one would be the guess
  // this pass refuses. Recorded, not swept.
  const openText = [];
  for (const row of ROWS) {
    openText.push(
      row.month, row.openingBalance, row.closingBalance, row.cashNet, row.wealthNet,
      row.protectedAssets, row.assessableAssets, row.accessibleAssets,
      row.provenance.confidence,
      ...row.provenance.registers, ...row.provenance.uncarried, ...row.provenance.stamps,
      ...row.provenance.caveats.map((c) => c.label),
    );
    for (const line of linesOf(row)) {
      openText.push(
        line.description, line.amount, line.effectLabel,
        line.attribution.label, line.attribution.noteLabel ?? '',
        line.provenance.label, line.provenance.register ?? '', line.provenance.stampLabel ?? '',
        line.provenance.confidence ?? '', line.provenance.noteLabel ?? '',
        ...line.provenance.caveats.map((c) => c.label),
      );
    }
    for (const note of row.notes) {
      openText.push(note.subjectLabel, note.of, note.noteLabel, note.available ?? '', note.drawn ?? '');
    }
  }
  assert.ok(openText.length > 20_000, `only ${openText.length} strings swept`);
  for (const text of openText) plainly(text, `the open text ${JSON.stringify(text)}`);
  // **Vacuity control: the sweep would pass on a fixture with no jargon anywhere.** So the FOLDED
  // text of the same walk is swept with the same three patterns and must trip them in quantity.
  const foldedText = ROWS.flatMap((row) => [
    ...row.notes.map((n) => n.note),
    ...row.provenance.caveats.map((c) => c.text),
    ...linesOf(row).flatMap((line) => [
      line.provenance.note ?? '', line.attribution.note ?? '', ...line.provenance.determination,
    ]),
  ]);
  const tripped = foldedText.filter(
    (text) => BANNED_WORDS.test(text) || SHOUTED.test(text) || DOTTED_KEY.test(text),
  ).length;
  assert.ok(tripped > 3000, `only ${tripped} folded strings would have tripped the sweep — it is about nothing`);
});

// --- 9. WHAT IS STILL OWED ON THE HOME LOAN (P3-16 slice 2) --------------------------------------
//
// The demo Household states no mortgage, so this section brings its own fixture. It is the
// `core-mortgage.test.mjs` loan — $500,000 at 6.0% repaid at $3,000 a month, with no offset, so
// every figure below is the hand-worked amortisation of that suite and not a figure read off this
// layer.

const LOAN_SETTINGS = {
  asAtDate: '2026-09-16',
  planningHorizonAge: 72,
  economicSeries: { cpi: 0.025, pblci: 0.025, awote: 0.035, mtawe: 0.035 },
  deemingRates: { lower: 0.0175, upper: 0.0375 },
  nominalReturn: 0.065,
};

const LOAN_HOUSEHOLD = (mortgage) => ({
  persons: [{
    name: 'Val',
    dateOfBirth: '1955-04-17',
    superInterests: [],
    parcels: [],
    employmentIncomePerFortnight: toCents(0),
    workBonusBalance: toCents(0),
  }],
  homeStatus: 'occupied',
  ...(mortgage === undefined ? {} : { mortgage }),
});

const LOAN_ENTRIES = [{
  id: 'sc', date: '2026-09-01', owner: 'household', type: 'SPEND_CHANGE',
  params: { annualSpend: toCents(120_000) }, enabled: true, createdAt: '2026-06-01',
}];

const LOAN_MONTHS = project(
  LOAN_SETTINGS,
  LOAN_HOUSEHOLD({ openingBalance: toCents(500_000), annualInterestRate: 0.06, monthlyRepayment: toCents(3_000) }),
  LOAN_ENTRIES,
);

const LOAN_FUTURE = { view: 'futureDollars', asAtDate: LOAN_SETTINGS.asAtDate, cpi: LOAN_SETTINGS.economicSeries.cpi };
const LOAN_TODAY = { view: 'todaysDollars', asAtDate: LOAN_SETTINGS.asAtDate, cpi: LOAN_SETTINGS.economicSeries.cpi };

test('the outstanding loan goes through the row’s OWN lens — both money views, on a month that is not month 0', () => {
  // ⚠️ **MONTH 3 AND NOT MONTH 0.** A month-0 figure converts to itself whatever the lens is
  // (`todaysDollars.ts`: the factor is exactly 1 in the basis's own month), so a row of month 0
  // would pass with the conversion missing altogether. Month 3 is 2026-12, three months out.
  //
  //   the balance owing at the close of month 3 is $497,984.96 (hand-worked in core-mortgage)
  //   the price level three months out is 1.025 ^ (3/12) = 1.00619224632…
  //   $497,984.96 ÷ 1.00619224632… = $494,920.29 of today's money
  //   printed to the dollar, halves away from zero: $497,985 and $494,920
  const future = monthToRow(LOAN_MONTHS[3], LOAN_FUTURE);
  const today = monthToRow(LOAN_MONTHS[3], LOAN_TODAY);
  assert.equal(LOAN_MONTHS[3].month, '2026-12');
  assert.equal(future.homeLoanOwing, '$497,985');
  assert.equal(today.homeLoanOwing, '$494,920');
  assert.notEqual(future.homeLoanOwing, today.homeLoanOwing, 'the two views print the same debt — the lens is not applied');
  // The factor, re-derived here from the basis and not from the module, so the second figure is a
  // division a reader can check rather than a constant this build produced.
  assert.equal(today.homeLoanOwing, formatDollars(Math.round(497_984_96 / 1.025 ** (3 / 12))));
  // And month 0 IS identical in both views, which is why it proves nothing and is asserted as the
  // control rather than as the claim.
  assert.equal(monthToRow(LOAN_MONTHS[0], LOAN_FUTURE).homeLoanOwing, monthToRow(LOAN_MONTHS[0], LOAN_TODAY).homeLoanOwing);
  assert.equal(monthToRow(LOAN_MONTHS[0], LOAN_FUTURE).homeLoanOwing, '$499,500');
  // The debt moves with the SAME lens as the balances beside it: one row cannot mix two bases.
  for (const [i, month] of LOAN_MONTHS.entries()) {
    const row = monthToRow(month, LOAN_TODAY);
    assert.equal(row.homeLoanOwing, formatDollars(Math.round(month.mortgageBalance / 1.025 ** (i / 12))), month.month);
  }
});

test('no loan is `null` and a cleared loan is $0 — two different facts, kept apart', () => {
  // `null` is "this household has no home loan": the engine omits the key and nothing is printed.
  for (const month of project(LOAN_SETTINGS, LOAN_HOUSEHOLD(), LOAN_ENTRIES)) {
    assert.equal(monthToRow(month, LOAN_FUTURE).homeLoanOwing, null, month.month);
  }
  // `'$0'` is "the loan is paid off", which is the answer the user came for. A layer that
  // rendered absence as nil would tell a household with no mortgage that it had just cleared one.
  const paid = project(
    LOAN_SETTINGS,
    LOAN_HOUSEHOLD({ openingBalance: toCents(10_000), annualInterestRate: 0, monthlyRepayment: toCents(3_000) }),
    [{ ...LOAN_ENTRIES[0], params: { annualSpend: toCents(12_000) } }],
  );
  assert.deepEqual(paid.map((m) => monthToRow(m, LOAN_FUTURE).homeLoanOwing), [
    '$7,000', '$4,000', '$1,000', '$0', '$0', '$0', '$0', '$0',
  ]);
});

test('the home-loan wording is real text, and the pin that says so FAILS on emptied text', () => {
  // **The anti-vacuity control, applied to the pin itself.** A length floor plus distinctness is
  // worth nothing unless emptying or duplicating the string actually breaks it, so the assertions
  // are written once as a function, run against the real wording, and then run against `''` and
  // against a copy of a neighbouring label — both of which MUST throw.
  const neighbours = [OFFSET_ATTRIBUTION.label, OFFSET_ATTRIBUTION.note, EFFECT_LABELS.cash, EFFECT_LABELS.wealth];
  const pinsLabel = (text) => {
    assert.ok(text.trim().length > 25, `the home-loan label is a stub: ${JSON.stringify(text)}`);
    assert.ok(!neighbours.includes(text), 'the home-loan label is a copy of another label');
    assert.match(text, /home loan/i, 'the label does not say what the figure is about');
    assert.match(text, /owing|owe/i, 'the label does not say that the figure is a DEBT');
    plainly(text, 'the home-loan label');
  };
  pinsLabel(HOME_LOAN_OWING_LABEL);
  assert.throws(() => pinsLabel(''), /stub/);
  assert.throws(() => pinsLabel(OFFSET_ATTRIBUTION.label), /copy of another label/);
  assert.throws(() => pinsLabel('Still owing, at the end of the month'), /what the figure is about/);

  // The folded detail carries the three facts a bare number cannot: that nothing is net of it, what
  // the Age Pension does with it (nothing), and what $0 means.
  const pinsDetail = (text) => {
    assert.ok(text.trim().length > 200, `the home-loan detail is a stub: ${JSON.stringify(text)}`);
    assert.notEqual(text, HOME_LOAN_OWING_LABEL);
    assert.match(text, /\$0 /);
    assert.match(text, /net of it/);
  };
  pinsDetail(HOME_LOAN_OWING_DETAIL);
  assert.throws(() => pinsDetail(''), /stub/);
  // The decoy is deliberately LONGER than the floor and still silent about what nothing is net of,
  // so it is that clause that fails it and not the length — a short decoy would prove the floor twice
  // and the clause not at all. (P17-3 took the Age Pension clause out: a box no longer restates a
  // rule; it is pinned on the guide's {#home-loan} section instead, P17-3a.)
  assert.throws(() => pinsDetail(HOME_LOAN_OWING_DETAIL.replace('none of the figures above are net of it', 'none of the figures above include it')), /net of it/);
  const guide = readFileSync(new URL('../userguide.md', import.meta.url), 'utf8');
  const homeLoanSection = guide.slice(guide.indexOf('{#home-loan}'), guide.indexOf('### ⚠️ Don'));
  assert.match(homeLoanSection, /changes nothing for the Age Pension|doesn't change your Age Pension/i);
  assert.match(homeLoanSection, /still counts in full/i);
});

// --- §10 Total super, income from super and the Age Pension (2026-09-23) --------------------------
//
// Three figures on the summary row. The derivations here use LITERAL line descriptions and not the
// engine's `INCOME_FROM_SUPER_LINES`: a test that read the list it checks would agree with any list.

const SUPER_OUT = /^(Account-Based Pension payment|Superannuation lump sum), /;
const sumWhere = (month, keep) => month.lines.filter(keep).reduce((total, line) => total + line.amount, 0);
const outOfSuper = (month) => sumWhere(month, (line) => SUPER_OUT.test(line.description));
const agePensionPaid = (month) => sumWhere(month, (line) => line.description === 'Age Pension');
const TODAY = { view: 'todaysDollars', asAtDate: DEMO_SETTINGS.asAtDate, cpi: DEMO_SETTINGS.economicSeries.cpi };
const TODAY_ROWS = monthsToRows(MONTHS, TODAY);

// ⚠️ **THE TWO ROUTE TESTS BELOW WALK `KEPT_MONTHS` (top of file): the demo plan with Dana's account
// kept out of the switch at retirement (2026-09-23).** As committed, her RETIRE at 63 makes her
// account an account-based pension, which limb 2 pays — so the plan never reaches limb 5 and "every
// route" would be one route. Kept out, her account stays in accumulation, limb 5 draws it, and both
// routes out of super are in one walk, which is what the identity needs to be non-vacuous.
const KEPT_ROWS = monthsToRows(KEPT_MONTHS, FUTURE);

test('the demo walk reaches every route the three figures read — none of the assertions below is vacuous', () => {
  const count = (keep) => KEPT_MONTHS.filter((month) => month.lines.some(keep)).length;
  assert.ok(count((l) => l.description.startsWith('Account-Based Pension payment, ')) > 100);
  // Limb 5: the Waterfall's own draw, which no entry states.
  assert.ok(count((l) => l.description.startsWith('Superannuation lump sum, ') && l.attribution.basis === 'none') > 100);
  assert.ok(count((l) => l.description.startsWith('Superannuation Guarantee into superannuation, ')) > 50);
  assert.ok(count((l) => l.description === 'Age Pension') > 400);
  assert.equal(KEPT_MONTHS[0].lines.some((l) => l.description === 'Age Pension'), false, 'month 0 must be a nil-pension month');
});

test('income from super is every payment OUT of super, and nothing going IN — every month of the walk', () => {
  for (const [walk, rows] of [[KEPT_MONTHS, KEPT_ROWS], [MONTHS, ROWS]]) {
    for (const [i, row] of rows.entries()) {
      assert.equal(row.incomeFromSuper, formatDollars(outOfSuper(walk[i])), row.month);
    }
  }
  // Named cases, so a failure says which half broke. A limb 5 month counts its draw …
  const limb5 = KEPT_MONTHS.findIndex((m) => m.lines.some((l) => l.description.startsWith('Superannuation lump sum, ') && l.attribution.basis === 'none'));
  assert.ok(outOfSuper(KEPT_MONTHS[limb5]) > 0);
  assert.equal(KEPT_ROWS[limb5].incomeFromSuper, formatDollars(outOfSuper(KEPT_MONTHS[limb5])));
  // … and a Guarantee month does not count the Guarantee: it went into super, not out of it.
  const sg = MONTHS.findIndex((m) => m.lines.some((l) => l.description.startsWith('Superannuation Guarantee')));
  const guarantee = sumWhere(MONTHS[sg], (l) => l.description.startsWith('Superannuation Guarantee'));
  assert.ok(guarantee > 0);
  assert.notEqual(ROWS[sg].incomeFromSuper, formatDollars(outOfSuper(MONTHS[sg]) + guarantee));
  // Nil is $0 and never blank: the walk runs out, and those months print a figure.
  assert.ok(ROWS.filter((row) => row.incomeFromSuper === '$0').length > 0);
});

test('the Age Pension column is the month’s Age Pension line — $0 before it is paid, never blank', () => {
  for (const [i, row] of ROWS.entries()) {
    assert.equal(row.agePension, formatDollars(agePensionPaid(MONTHS[i])), row.month);
  }
  assert.equal(ROWS[0].agePension, '$0');
  assert.ok(ROWS.filter((row) => row.agePension !== '$0').length > 400);
});

test('total super is the engine’s stored balance, and a Household with no super shows $0', () => {
  for (const [i, row] of ROWS.entries()) {
    assert.equal(row.superBalance, formatDollars(MONTHS[i].superBalance), row.month);
  }
  assert.ok(MONTHS[0].superBalance > toCents(900_000), 'both Persons’ interests are in month 0’s total');
  for (const row of monthsToRows(LOAN_MONTHS, LOAN_FUTURE)) assert.equal(row.superBalance, '$0');
});

test('all three go through the row’s OWN lens — in today’s money none of them is the future figure', () => {
  const moved = { superBalance: 0, incomeFromSuper: 0, agePension: 0 };
  for (const [i, month] of MONTHS.entries()) {
    const money = moneyLens(TODAY, month.month);
    const row = TODAY_ROWS[i];
    assert.equal(row.superBalance, formatDollars(money(month.superBalance)), month.month);
    assert.equal(row.incomeFromSuper, formatDollars(money(outOfSuper(month))), month.month);
    assert.equal(row.agePension, formatDollars(money(agePensionPaid(month))), month.month);
    for (const key of Object.keys(moved)) if (row[key] !== ROWS[i][key]) moved[key] += 1;
  }
  // Vacuity: the two views really differ for each figure, so an unconverted one cannot pass.
  assert.ok(moved.superBalance > 100 && moved.incomeFromSuper > 100 && moved.agePension > 400, JSON.stringify(moved));
});

test('the three headings are plain words, and three different ones', () => {
  const labels = [TOTAL_SUPER_LABEL, INCOME_FROM_SUPER_LABEL, AGE_PENSION_LABEL];
  assert.equal(new Set(labels).size, 3);
  for (const label of labels) {
    assert.ok(label.trim().length > 0);
    plainly(label, 'a summary-row heading');
  }
});

// --- §11 Investments and total wealth (2026-09-24) ---------------------------------------------------
//
// **Every figure in the row is at the month's CLOSE (the user's option B): Total wealth =
// Closing + Total super + Investments.** The charts read the month's OPENING, so this figure is meant
// to be the chart's point for the FOLLOWING month — and measured before building, it is, to the cent,
// in every month of every fixture below EXCEPT by the amounts the walk books at the very end of the
// tick, after the close it reports: each month's `Investment growth` (on super and on investments) and
// the `Superannuation Guarantee` credited to super. Those are named below with their mechanism; any
// other difference is unexplained and fails. The death month needs no exception: the death benefit is
// a cash line of that month, so it is in `closingBalance` by the close.
//
// Four fixtures, each reaching a timing the others do not: the demo (a portfolio, a pension paid out
// of super every month), the kept-out demo (limb 5), a working couple with a home loan and an offset,
// and the demo plus a buy, a lump sum out of super, a sale and a death.

const wealthEntry = (id, type, date, params, owner = 'household') => ({ id, date, owner, type, params, enabled: true, createdAt: '2026-06-01' });
const WORKING_COUPLE = {
  persons: [
    { name: 'Pat', dateOfBirth: '1975-03-02', superInterests: [{ phase: 'accumulation', balance: toCents(610_000) }], parcels: [], employmentIncomePerFortnight: toCents(4_600), workBonusBalance: toCents(0) },
    { name: 'Sam', dateOfBirth: '1977-08-19', superInterests: [{ phase: 'accumulation', balance: toCents(0) }], parcels: [], employmentIncomePerFortnight: toCents(1_200), workBonusBalance: toCents(0) },
  ],
  homeStatus: 'occupied',
  openingOffsetBalance: toCents(300),
  mortgage: { openingBalance: toCents(420_000), annualInterestRate: 0.062, monthlyRepayment: toCents(2_900) },
};
const EVENTFUL_ENTRIES = [
  ...DEMO_ENTRIES,
  wealthEntry('buy', 'NON_SUPER_INVESTMENT', '2027-02-10', { direction: 'buy', amount: toCents(20_000), incidentalCostsOfAcquisition: toCents(30) }, 'personA'),
  wealthEntry('lump', 'LUMP_SUM_FROM_SUPER', '2028-01-10', { amount: toCents(50_000), interestIndex: 0 }, 'personB'),
  wealthEntry('sell', 'NON_SUPER_INVESTMENT', '2028-06-15', { direction: 'sell', amount: toCents(30_000) }, 'personA'),
  wealthEntry('death', 'DEATH', '2031-03-15', {}, 'personB'),
];
const WEALTH_WALKS = [
  { name: 'demo', household: DEMO_HOUSEHOLD, months: MONTHS },
  { name: 'kept out', household: KEPT_OUT, months: KEPT_MONTHS },
  {
    name: 'working couple, loan and offset',
    household: WORKING_COUPLE,
    months: project(DEMO_SETTINGS, WORKING_COUPLE, [wealthEntry('sc', 'SPEND_CHANGE', '2026-09-01', { annualSpend: toCents(60_000) })]),
  },
  { name: 'buy, lump sum, sale, death', household: DEMO_HOUSEHOLD, months: project(DEMO_SETTINGS, DEMO_HOUSEHOLD, EVENTFUL_ENTRIES) },
];
const EVENTFUL = WEALTH_WALKS[3].months;
const monthOf = (months, month) => months.find((m) => m.month === month);
const wealthAtClose = (m) => m.closingBalance + m.superBalance + m.closingNonSuperPortfolio;
/** The charts' own figure: `comparisonSeries` over a one-Scenario plan of this walk. */
const chartTotals = ({ household, months }) =>
  comparisonSeries(
    { household, scenarios: [{ id: 's', name: 's', parentId: null, entryIds: [] }] },
    { active: 's', byScenarioId: new Map([['s', months]]) },
  ).lines[0].values;

/**
 * **The only named reasons Total wealth for month M may differ from the chart's month M+1 — each a
 * line the walk books AFTER the close it reports, so the next month opens with it.** Adding one here
 * is a claim about the engine and needs its mechanism written beside it.
 */
const AFTER_THE_CLOSE = [
  // Returns on super and on investments are applied at the END of the tick, after the close
  // (`project`: "the investment balances grow, once, at the END of the tick").
  GROWTH_LINE,
  // The Guarantee is credited to super after that growth — money arriving in month n earns its first
  // return in month n + 1 — so it is in the next opening and not in this close.
  SUPER_GUARANTEE_LINE,
];
const afterTheClose = (m) => {
  const booked = m.lines.filter((line) => AFTER_THE_CLOSE.some((name) => line.description.startsWith(`${name},`)));
  return { booked, amount: booked.reduce((sum, line) => sum + (line.direction === 'inflow' ? line.amount : -line.amount), 0) };
};

test('the fixtures reach every timing total wealth has to survive — none of the identities below is vacuous', () => {
  const [demo, , couple] = WEALTH_WALKS.map((walk) => walk.months);
  assert.ok(demo.filter((m) => m.closingNonSuperPortfolio > 0).length > 100, 'the demo holds a portfolio for years');
  assert.ok(couple.filter((m) => m.openingBalance !== m.closingBalance).length > 400, 'the working couple’s cash moves in most months');
  assert.ok(couple[0].mortgageBalance > 0 && couple[0].openingBalance > 0, 'a loan and an offset');
  // The buy is in the portfolio at the close of its own month.
  assert.ok(monthOf(EVENTFUL, '2027-02').closingNonSuperPortfolio - monthOf(demo, '2027-02').closingNonSuperPortfolio >= toCents(19_900));
  const lump = monthOf(EVENTFUL, '2028-01');
  assert.ok(monthOf(demo, '2028-01').superBalance - lump.superBalance >= toCents(50_000), 'the lump sum has left super by the close');
  const sale = monthOf(EVENTFUL, '2028-06');
  assert.ok(monthOf(EVENTFUL, '2028-05').closingNonSuperPortfolio - sale.closingNonSuperPortfolio > toCents(25_000), 'the sale has left the portfolio by the close');
  const death = EVENTFUL.find((m) => m.died !== undefined);
  assert.equal(death.month, '2031-03');
  assert.ok(death.closingBalance > death.openingBalance + toCents(400_000), 'the deceased’s super is cash by the close of the death month');
  // Months with nothing booked after the close, where Total wealth must equal the next chart point outright.
  assert.ok(EVENTFUL.slice(0, -1).filter((m) => afterTheClose(m).booked.length === 0).length > 100);
});

test('(a) Total wealth = Closing + Total super + Investments, exactly in cents before rounding, in every month of every fixture', () => {
  for (const walk of WEALTH_WALKS) {
    for (const basis of [FUTURE, TODAY]) {
      const rows = monthsToRows(walk.months, basis);
      for (const [i, m] of walk.months.entries()) {
        const money = moneyLens(basis, m.month);
        const where = `${walk.name} ${basis.view} ${m.month}`;
        assert.equal(rows[i].totalWealth, formatDollars(money(wealthAtClose(m))), where);
        assert.equal(rows[i].closingBalance, formatDollars(money(m.closingBalance)), where);
        assert.equal(rows[i].superBalance, formatDollars(money(m.superBalance)), where);
        assert.equal(rows[i].investments, formatDollars(money(m.closingNonSuperPortfolio)), where);
        // Each addend is converted on its own, as the row prints it: exact in future dollars, and
        // within the conversions' own cent roundings in today's money.
        const parts = money(m.closingBalance) + money(m.superBalance) + money(m.closingNonSuperPortfolio);
        assert.ok(Math.abs(parts - money(wealthAtClose(m))) <= (basis.view === 'futureDollars' ? 0 : 2), `${where}: ${parts} vs ${money(wealthAtClose(m))}`);
      }
    }
  }
});

test('(b) Total wealth for month M is the chart’s point for M + 1, every month, but for what is booked after the close', () => {
  let exact = 0;
  for (const walk of WEALTH_WALKS) {
    const chart = chartTotals(walk);
    assert.equal(chart.length, walk.months.length);
    let checked = 0;
    for (const [i, m] of walk.months.slice(0, -1).entries()) {
      const { booked, amount } = afterTheClose(m);
      assert.equal(chart[i + 1] - wealthAtClose(m), amount, `${walk.name} ${m.month}: ${booked.map((line) => line.description).join('; ') || 'nothing booked after the close'}`);
      if (booked.length === 0) exact += 1;
      checked += 1;
    }
    // No month is skipped: every one but the last is compared.
    assert.equal(checked, walk.months.length - 1, walk.name);
  }
  assert.ok(exact > 100, 'months with nothing after the close match the chart outright');
  // Each named reason explains a real month, and the list is exactly the two named above.
  const all = WEALTH_WALKS.flatMap((walk) => walk.months.flatMap((m) => afterTheClose(m).booked));
  assert.deepEqual(AFTER_THE_CLOSE, ['Investment growth', 'Superannuation Guarantee into superannuation']);
  for (const name of AFTER_THE_CLOSE) assert.ok(all.some((line) => line.description.startsWith(`${name},`)), name);
  // The death month is NOT an exception: its benefit is already cash at the close.
  const death = EVENTFUL.find((m) => m.died !== undefined);
  const next = chartTotals(WEALTH_WALKS[3])[EVENTFUL.indexOf(death) + 1];
  assert.equal(next - wealthAtClose(death), afterTheClose(death).amount);
});

test('Total wealth is NOT the chart’s same-month figure — that is the start of the month', () => {
  const first = MONTHS[0];
  assert.equal(first.protectedAssets + first.assessableAssets, toCents(1_088_500));
  assert.notEqual(wealthAtClose(first), first.protectedAssets + first.assessableAssets);
  assert.notEqual(ROWS[0].totalWealth, formatDollars(first.protectedAssets + first.assessableAssets));
});

test('both new money columns follow the basis toggle — today’s money is not the future figure', () => {
  const moved = { investments: 0, totalWealth: 0 };
  for (const [i, row] of TODAY_ROWS.entries()) for (const key of Object.keys(moved)) if (row[key] !== ROWS[i][key]) moved[key] += 1;
  // Investments reaches $0 once the Waterfall has sold the portfolio, and $0 is $0 in either money.
  assert.ok(moved.investments > 100 && moved.totalWealth > 400, JSON.stringify(moved));
  for (const [i, row] of TODAY_ROWS.entries()) {
    const money = moneyLens(TODAY, MONTHS[i].month);
    assert.equal(row.investments, formatDollars(money(MONTHS[i].closingNonSuperPortfolio)), MONTHS[i].month);
    assert.equal(row.totalWealth, formatDollars(money(wealthAtClose(MONTHS[i]))), MONTHS[i].month);
  }
  // Whole dollars, in either money.
  for (const row of [...ROWS, ...TODAY_ROWS]) for (const key of Object.keys(moved)) assert.match(row[key], /^-?\$[\d,]+$/);
});

test('the two new headings are plain words, each with a plain sentence behind it', () => {
  const pairs = [[INVESTMENTS_LABEL, INVESTMENTS_DETAIL], [TOTAL_WEALTH_LABEL, TOTAL_WEALTH_DETAIL]];
  assert.deepEqual(pairs.map(([label]) => label), ['Investments', 'Total wealth']);
  const labels = [...pairs.map(([label]) => label), TOTAL_SUPER_LABEL, INCOME_FROM_SUPER_LABEL, AGE_PENSION_LABEL];
  assert.equal(new Set(labels).size, labels.length);
  for (const [label, detail] of pairs) {
    plainly(label, 'a summary-row heading');
    assert.ok(detail.trim().length > 40);
    plainly(detail, `the sentence behind ${label}`);
    assert.match(detail, /end of the month/, label);
  }
  // The total's sentence names its addends by their headings, the chart's clock, and what it leaves out.
  for (const words of ['Closing', TOTAL_SUPER_LABEL, INVESTMENTS_LABEL, 'start of each month', 'following month', 'investment growth', 'home loan']) {
    assert.ok(TOTAL_WEALTH_DETAIL.includes(words), words);
  }
});

test('the new Month field is ADDED and moves nothing: without it the demo digest is the one pinned before', () => {
  // RE-PINNED 2026-09-24 (T135): the demo couple's assets excess now floors to the nearest $500
  // (SSA 1991 s1064 point 1064-G7), a few cents to a few dollars of Age Pension higher in a
  // handful of months — see `test/core-age-pension.test.mjs`'s T135 tests. Both digests below are
  // the same walk hashed two ways, so both moved together.
  // RE-PINNED 2026-09-29 (LR-1 slice 2, the CGT reform from 1 July 2027): only the limb-3
  // `available` figure moved, in 94 months from 2027-08, every one DOWN. It is the whole-portfolio
  // probe, and from 1 July 2027 the part of the gain after the stamp is indexed and never halved,
  // so selling everything would cost more tax (32c a dollar at the demo's rate). Slice 2 moved no line: without Div 119 the demo's own sales in 2033 stay under the tax-free threshold.
  // RE-PINNED 2026-09-29 (LR-1 slice 3, Div 119's minimum tax): Dana sells from 2033 with no salary
  // and no Age Pension, so 30% of the later part of each gain, less LITO, is now charged: 11
  // `Income tax on capital gain, Dana` lines, 2033-03 to 2035-05 — $1,615 in FY2032-33, $2,156 in
  // FY2033-34 and $1,793 in FY2034-35, each equal to 30% of that year's later gain less $700 to the
  // dollar, replayed by hand. The last comes back in the July 2035 true-up: she is paid the pension from
  // June 2035. Each sale grows by exactly its tax, so the portfolio runs out a month sooner (2037-05),
  // and lower assets raise the Age Pension in 417 months from 2033-09. The limb-3 probe moved again,
  // DOWN in 55 months from 2031-06, once her salary stops.
  const without = MONTHS.map(({ closingNonSuperPortfolio: _p, assetsTestThresholds: _t, concessionalCapByPerson: _c, ...rest }) => rest);
  // RE-PINNED 2026-09-29 (LR-1 slice 4): no figure moved. Dana's 11 `Income tax on capital gain` lines (2033-03 to 2035-05) each gained one `determination` entry, `CGT_MINIMUM_TAX_DETERMINATION`; a whole-walk diff finds those 11 and nothing else.
  assert.equal(createHash('sha256').update(JSON.stringify(without)).digest('hex'), '806fab4f7571820896d81b56900400b22494a361327855fb0c3b271e2e0ecc81');
  // And the whole walk, new key and all — the pin the stripped digests elsewhere leave to this one.
  // 2026-09-25: `assetsTestThresholds` was ADDED; without it the walk is the one pinned before, to the byte.
  const withoutThresholds = MONTHS.map(({ assetsTestThresholds: _t, concessionalCapByPerson: _c, ...rest }) => rest);
  // RE-PINNED 2026-09-29 (LR-1 slice 4), both: the 11 minimum-tax determinations, 11 × 377 = 4,147 bytes, and nothing else.
  assert.equal(createHash('sha256').update(JSON.stringify(withoutThresholds)).digest('hex'), '8bc912e0b0ac57128b1d51ddccb7e5da759c873c58e541ca01db7af86cf59fbc');
  // P3-4b (2026-09-30): `concessionalCapByPerson` was ADDED, 200,812 bytes, and both stripped digests
  // above (which now strip it too) are unchanged: no figure moved. The old full digest is the new
  // walk without it.
  assert.equal(createHash('sha256').update(JSON.stringify(MONTHS.map(({ concessionalCapByPerson: _c, ...rest }) => rest))).digest('hex'), 'd73b27b0a9d520d4ef38da00ce082131a08a8d7cf43352f627de81836f410de5');
  assert.equal(createHash('sha256').update(JSON.stringify(MONTHS)).digest('hex'), '99b663af8dfd7dd4eb4a37d6cab18eef401fe60a0afbf07dde162e8bd82fb918');
  // O90 (2026-09-30): the SAPTO caveat names `baseRebateAmount.coupleEach`, the record actually read,
  // not the non-existent `.couple`: 4 bytes per caveat, no figure moved. Both digests above re-pinned for it.
  const renamed = JSON.stringify(MONTHS).split('baseRebateAmount.coupleEach is stamped').length - 1;
  assert.equal(JSON.stringify(MONTHS).length, 3_623_969 + 11 * 377 + renamed * 4 + 200_812);
  assert.equal(JSON.stringify(MONTHS).replaceAll('baseRebateAmount.coupleEach is stamped', 'baseRebateAmount.couple is stamped').length, 3_623_969 + 11 * 377 + 200_812);
});
