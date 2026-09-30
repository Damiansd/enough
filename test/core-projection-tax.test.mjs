// P4-1 chunk 3 — the taxable-income assembly, and the discharge of register O72.
//
// Every figure below is HAND-WORKED from the register's own bracket, LITO, WATO and Medicare levy
// parameters and written out long. A test that asserted whatever the code produced would ratify a
// wrong formula as readily as a right one — and the formula here is the one nothing in `src/core`
// performed until this chunk: **assessable income, less a deduction set, is a taxable income.**
//
// Four things are defended and nothing else:
//
//   1. the salary → taxable income → tax chain produces the right DOLLARS, in BOTH FY2026-27 and
//      FY2027-28 — two years because the two limbs of ITAA 1997 s 25-130 switch on in DIFFERENT
//      years (the Div 25 taxable-income limb from FY2026-27, the s 61-155(2) WATO-base limb from
//      FY2027-28) and a single-year fixture cannot see the gate at all;
//   2. the s 25-130 deduction ACTUALLY REDUCES taxable income — asserted against the dollar figure
//      the same walk produces without it, never against a count of lines;
//   3. where salary comes from, what `RETIRE` and a zero-day `WORK_PATTERN_CHANGE` do to it, and
//      — since 2026-09-19 — that a `WORK_PATTERN_CHANGE` stating an `annualSalary` REPLACES it;
//   4. P4-1a, RE-EARNED over the new call path — `incomeTax.ts`, `incomeBases.ts` and
//      `data/assumptions/tax.ts` are all newly under `project()` — over a fixture whose output
//      carries a tax figure, so an empty walk cannot pass it vacuously.
import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { toCents } from '../dist/core/money.js';
import {
  annualSalaryFromFortnightly,
  monthlyFromAnnual,
  project,
  taxParametersCover,
  taxableIncomeFromSalary,
} from '../dist/core/projection.js';
import { taxYear } from '../dist/data/assumptions/index.js';
import { rebateIncome, reportableSuperannuationContributions } from '../dist/core/incomeBases.js';
import { personalDeductibleContributions } from '../dist/core/superConcessional.js';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

// --- The fixture ---------------------------------------------------------------------------------

/**
 * ⚠️ **`superInterests` STOPPED BEING `[]` ON 2026-09-20, AND THE WALK IS WHAT SAID SO (P6-8
 * brief 2, chunk 4).** Every `SUPER_CONTRIBUTION` below names `interestIndex: 0`, and until chunk 4
 * nothing read that index — so these fixtures stated a contribution into an account that did not
 * exist and no test in the suite could tell. They are plans `parsePlan` would have refused at the
 * door (`checkContributionTargets`); they reach `project()` directly, which is why the walk now
 * refuses the same thing by name rather than silently crediting nothing.
 *
 * The interest is given a **NIL balance**, deliberately: it is the smallest change that makes the
 * entries honest, and a nil balance moves not one figure of the walks that have no sacrifice in
 * them — every hand-worked number in this file was re-run against it unchanged. What it does is
 * give the sacrificed money somewhere to land.
 */
const person = (name, dateOfBirth, fortnightlyPay) => ({
  name,
  dateOfBirth,
  superInterests: [{ phase: 'accumulation', balance: toCents(0) }],
  parcels: [],
  employmentIncomePerFortnight: toCents(fortnightlyPay),
  workBonusBalance: toCents(0),
});

/**
 * **A working couple, deliberately in DIFFERENT tax brackets.**
 *
 * Rae is paid $3,000 a fortnight — $78,000 a year, in the 30% bracket and well past LITO's $66,667
 * cut-out, so her LITO is nil. Tom is paid $1,500 — $39,000 a year, inside the lowest marginal
 * bracket and inside LITO's stage-two taper, so his LITO is a *partial* $675 rather than the $700
 * maximum or nil. The two Persons therefore exercise different limbs of every formula in the chain,
 * and a result computed for one and reported for the other is a different NUMBER.
 *
 * Both are 47, so there is no Age Pension, no SAPTO, and no seniors Medicare threshold anywhere in
 * these figures — this fixture is about tax and about nothing else.
 *
 * The walk starts 2027-05 and ends 2028-09, which spans **three** financial years: the last two
 * months of FY2026-27, the whole of FY2027-28, and three months of FY2028-29 — the first year the
 * register does not STATE and answers from standing law instead (P2-10b).
 */
const COUPLE = {
  persons: [person('Rae', '1980-03-15', 3_000), person('Tom', '1980-09-20', 1_500)],
  homeStatus: 'occupied',
};

const SETTINGS = {
  asAtDate: '2027-05-10',
  planningHorizonAge: 48,
  // Pay rising with wages (2026-09-23) is not this fixture's subject: `awote: 0` holds every salary at the figure stated. A proved control: every figure this file asserts is the same at nil on the build before pay rose.
  economicSeries: { cpi: 0.025, pblci: 0.025, awote: 0, mtawe: 0.035 },
  deemingRates: { lower: 0.0175, upper: 0.0375 },
  nominalReturn: 0.065,
  // Interest on cash (2026-09-23) is not this fixture's subject: stated nil, the control proved byte-identical to the walk before it existed.
  cashInterestRate: 0,
};

const entry = (id, type, date, owner, params = {}) => ({
  id,
  date,
  owner,
  type,
  params,
  enabled: true,
  createdAt: '2027-01-01',
});

const monthAt = (months, isoMonth) => months.find((m) => m.month === isoMonth);

/** The financial year an `IsoMonth` falls in — July starts a new one. */
const fyOf = (isoMonth) => {
  const year = Number(isoMonth.slice(0, 4));
  const start = isoMonth.slice(5) >= '07' ? year : year - 1;
  return `${start}-${String((start + 1) % 100).padStart(2, '0')}`;
};
const amountOf = (month, description) =>
  month.lines.filter((l) => l.description === description).map((l) => l.amount);

// --- 1. Where the salary comes from ---------------------------------------------------------------

test('salary is `Person.employmentIncomePerFortnight`, annualised at 26 and reported as a twelfth', () => {
  // The ONLY income field on the model. $3,000 × 26 = $78,000 a year; a twelfth is $6,500.00.
  assert.equal(annualSalaryFromFortnightly(toCents(3_000)), 7_800_000);
  assert.equal(monthlyFromAnnual(toCents(78_000)), 650_000);
  // NOT the same rounding as a naive ÷ 12 of a fortnightly figure: $1,500 × 26 ÷ 12 = $3,250.00,
  // where $1,500 × 2 would be $3,000 — a $250 a month difference, which is why 26 is stated once.
  assert.equal(monthlyFromAnnual(annualSalaryFromFortnightly(toCents(1_500))), 325_000);

  const months = project(SETTINGS, COUPLE, []);
  assert.equal(months.length, 17);
  assert.equal(months[0].month, '2027-05');
  assert.equal(months.at(-1).month, '2028-09');
  assert.deepEqual(amountOf(monthAt(months, '2027-06'), 'Salary, Rae'), [650_000]);
  assert.deepEqual(amountOf(monthAt(months, '2027-06'), 'Salary, Tom'), [325_000]);
});

// --- 2. The hand-worked figures, across the year gate ----------------------------------------------

test('HAND-WORKED — FY2026-27: the s 25-130 deduction reduces taxable income and WATO does not exist', () => {
  const june = monthAt(project(SETTINGS, COUPLE, []), '2027-06');

  // RAE — salary $78,000.
  //   s 25-130(2): max(0, min($1,000, $78,000) − $0 reducers) = $1,000.
  //   TAXABLE INCOME = $78,000 − $1,000 = $77,000.        <-- the figure O72 was waiting for
  //   tax   ($45,000 − $18,200) × 15%  = $26,800 × 0.15 = $4,020.00
  //         ($77,000 − $45,000) × 30%  = $32,000 × 0.30 = $9,600.00   → $13,620.00
  //   LITO  $77,000 > $66,667 eligibility ceiling         → nil
  //   WATO  Subdiv 61-E does not exist before FY2027-28   → nil
  //   SAPTO 47 years old                                  → nil
  //   Medicare  family income $77,000 + $38,000 = $115,000, far above the $59,047 family upper, so
  //             no s 8(2) reduction: 2% × $77,000         = $1,540.00
  //   NET TAX  $13,620.00 + $1,540.00 = $15,160.00 → ÷ 12 = $1,263.3333… → $1,263.33
  assert.deepEqual(amountOf(june, 'Income tax, Rae'), [126_333]);

  // TOM — salary $39,000. TAXABLE INCOME = $39,000 − $1,000 = $38,000.
  //   tax   ($38,000 − $18,200) × 15% = $19,800 × 0.15 = $2,970.00
  //   LITO  $38,000 is past the $37,500 stage-one threshold: $700 − ($500 × 5%) = $675.00
  //   after offsets $2,970.00 − $675.00 = $2,295.00
  //   Medicare  2% × $38,000 = $760.00
  //   NET TAX  $3,055.00 → ÷ 12 = $254.5833… → $254.58
  assert.deepEqual(amountOf(june, 'Income tax, Tom'), [25_458]);

  // The two figures are not each other and neither is the other Person's: a result computed for one
  // and reported for the other is caught by the number, not by a shape.
  assert.notEqual(126_333, 25_458);
});

test('HAND-WORKED — FY2027-28: the SAME salaries, the SAME deduction, and a different answer', () => {
  const july = monthAt(project(SETTINGS, COUPLE, []), '2027-07');

  // The year gate is the whole point. Two things change on 1 July 2027 and NEITHER of them is
  // s 25-130, which applied from FY2026-27 and still applies:
  //   * the lowest marginal rate FALLS from 15% to 14% (legislated);
  //   * WATO — ITAA 1997 Subdiv 61-E — comes into existence, and its base is net labour income,
  //     which is the OTHER limb of the same s 25-130 deduction (s 61-155(2) limb (c)).
  //
  // RAE — TAXABLE INCOME still $78,000 − $1,000 = $77,000.
  //   tax   $26,800 × 14% = $3,752.00 + $32,000 × 30% = $9,600.00 → $13,352.00
  //   WATO  net labour income = $78,000 − $1,000 = $77,000
  //         limb (b) 14% × ($77,000 − $18,200) = 14% × $58,800 = $8,232.00
  //         s 61-160 min($250, $8,232.00) = $250.00; the s 63-10(1) item 3 cap is $13,352.00 → $250
  //   after offsets $13,352.00 − $250.00 = $13,102.00
  //   Medicare  2% × $77,000 = $1,540.00
  //   NET TAX  $14,642.00 → ÷ 12 = $1,220.1666… → $1,220.17
  assert.deepEqual(amountOf(july, 'Income tax, Rae'), [122_017]);

  // TOM — TAXABLE INCOME still $38,000.
  //   tax   $19,800 × 14% = $2,772.00
  //   WATO  net labour income $38,000; limb (b) 14% × $19,800 = $2,772.00; min($250, …) = $250.00
  //   s 63-10(1) order: item 3 (WATO) first → $2,772.00 − $250.00 = $2,522.00, then LITO $675.00
  //   after offsets $2,772.00 − $925.00 = $1,847.00
  //   Medicare  2% × $38,000 = $760.00
  //   NET TAX  $2,607.00 → ÷ 12 = $217.25 exactly
  assert.deepEqual(amountOf(july, 'Income tax, Tom'), [21_725]);

  // June and July differ for BOTH Persons, which is what a single-year fixture could not show.
  assert.notEqual(122_017, 126_333);
  assert.notEqual(21_725, 25_458);
});

test('the s 25-130 deduction is applied in FY2026-27 — one year BEFORE the WATO-base limb', () => {
  // The year gate, on the function rather than through four other formulas. $78,000 of salary:
  //   FY2025-26  the provision does not exist            → taxable income is the salary itself
  //   FY2026-27  Div 25 limb applies                     → $77,000
  //   FY2027-28  both limbs apply                        → $77,000
  assert.equal(taxableIncomeFromSalary('2025-26', toCents(78_000), toCents(0)), toCents(78_000));
  assert.equal(taxableIncomeFromSalary('2026-27', toCents(78_000), toCents(0)), toCents(77_000));
  assert.equal(taxableIncomeFromSalary('2027-28', toCents(78_000), toCents(0)), toCents(77_000));

  // s 25-130(2) limb (b) — the `min` against labour income — binds below $1,000, so a Person with
  // $600 of salary is not given a $1,000 deduction on $600 of income.
  assert.equal(taxableIncomeFromSalary('2026-27', toCents(600), toCents(0)), toCents(0));
  // And the reducers come off the CAPPED figure, not the income: $300 of reducers leaves $700 of
  // standard deduction, and the reducers are themselves deductible, so the sum telescopes to
  // $1,000 — max($300, min($1,000, $78,000)). A build that subtracted limb (c) alone would give
  // $78,000 − $700 = $77,300.
  assert.equal(taxableIncomeFromSalary('2026-27', toCents(78_000), toCents(300)), toCents(77_000));
  assert.equal(taxableIncomeFromSalary('2026-27', toCents(78_000), toCents(4_000)), toCents(74_000));
});

test('DROPPING the deduction moves a DOLLAR FIGURE, in both years, for both Persons', () => {
  // What the walk reports today, and what it would report if the s 25-130 deduction were not
  // subtracted from assessable income. Every one of the four counterfactuals is hand-worked, so a
  // mutation that deletes the deduction fails on an amount rather than on a line count.
  //
  // RAE, FY2026-27, taxable income $78,000 instead of $77,000:
  //   $4,020.00 + $33,000 × 30% = $9,900.00 → $13,920.00; Medicare 2% × $78,000 = $1,560.00
  //   NET TAX $15,480.00 → ÷ 12 = $1,290.00
  // TOM, FY2026-27, $39,000 instead of $38,000:
  //   $20,800 × 15% = $3,120.00; LITO $700 − ($1,500 × 5%) = $625.00 → $2,495.00
  //   Medicare $780.00; NET TAX $3,275.00 → ÷ 12 = $272.9166… → $272.92
  // RAE, FY2027-28, $78,000:
  //   $3,752.00 + $9,900.00 = $13,652.00; WATO $250.00 → $13,402.00; Medicare $1,560.00
  //   NET TAX $14,962.00 → ÷ 12 = $1,246.8333… → $1,246.83
  // TOM, FY2027-28, $39,000:
  //   $20,800 × 14% = $2,912.00; WATO $250.00 → $2,662.00; LITO $625.00 → $2,037.00
  //   Medicare $780.00; NET TAX $2,817.00 → ÷ 12 = $234.75 exactly
  const months = project(SETTINGS, COUPLE, []);
  const june = monthAt(months, '2027-06');
  const july = monthAt(months, '2027-07');

  assert.deepEqual(amountOf(june, 'Income tax, Rae'), [126_333]);
  assert.notDeepEqual(amountOf(june, 'Income tax, Rae'), [129_000]);
  assert.equal(129_000 - 126_333, 2_667); // $26.67 a month — $320 a year, the deduction at 30% + 2%

  assert.deepEqual(amountOf(june, 'Income tax, Tom'), [25_458]);
  assert.notDeepEqual(amountOf(june, 'Income tax, Tom'), [27_292]);
  assert.equal(27_292 - 25_458, 1_834); // $18.34 a month — 15% + 5% LITO taper + 2% on $1,000

  assert.deepEqual(amountOf(july, 'Income tax, Rae'), [122_017]);
  assert.notDeepEqual(amountOf(july, 'Income tax, Rae'), [124_683]);

  assert.deepEqual(amountOf(july, 'Income tax, Tom'), [21_725]);
  assert.notDeepEqual(amountOf(july, 'Income tax, Tom'), [23_475]);

  // The four gaps are all DIFFERENT numbers, so a mutation cannot be absorbed by one of them
  // happening to coincide with another — the trap this chunk was told to go looking for.
  assert.deepEqual(new Set([2_667, 1_834, 124_683 - 122_017, 23_475 - 21_725]).size, 4);
});

// --- 3. The parameter window ----------------------------------------------------------------------

test('THE WINDOW IS OPEN ABOVE — FY2028-29 IS covered, and the window closed below still refuses', () => {
  // **This test replaces the canary that asserted `taxParametersCover('2028-29') === false`.** That
  // assertion was correct and load-bearing while `TAX.years` was the whole answer; the point of it
  // was that a forty-eight year walk could tax twenty-four months of itself, and it was written to
  // go red the day that stopped being true. It has. It is replaced rather than deleted, and what
  // stands here proves the thing it was watching for is fixed.
  assert.equal(taxParametersCover('2026-27'), true);
  assert.equal(taxParametersCover('2027-28'), true);
  assert.equal(taxParametersCover('2028-29'), true); // was `false` — Sch 7 Pt I answers for it
  assert.equal(taxParametersCover('2074-75'), true); // …and for every later year of any horizon

  // The window is still CLOSED BELOW, which is the half that did not change: Sch 7's earlier
  // tables name their years expressly, so there is no standing table running backwards.
  assert.equal(taxParametersCover('2025-26'), false);

  // AND A MEASURED FIGURE, in the month the old canary said was empty. FY2028-29 runs on the same
  // ladder as FY2027-28 — 14/30/37/45 on the never-indexed thresholds — so Rae's tax is the
  // FY2027-28 figure to the cent, which is the whole reason the marker below has to exist.
  const months = project(SETTINGS, COUPLE, []);
  const beyond = monthAt(months, '2028-07');
  assert.deepEqual(amountOf(beyond, 'Income tax, Rae'), [122_017]);
  assert.deepEqual(amountOf(beyond, 'Income tax, Tom'), [21_725]);
  assert.deepEqual(amountOf(beyond, 'Salary, Rae'), [650_000]);
  assert.deepEqual(amountOf(monthAt(months, '2027-07'), 'Income tax, Rae'), [122_017]);

  // **THE FIGURE CANNOT TELL YOU WHICH KIND OF ANSWER IT IS, and that is stated here rather than
  // left to be discovered.** FY2028-29's $1,220.17 is byte-identical to FY2027-28's, so no
  // assertion over the amounts can distinguish a year the register STATES from one it PROJECTS.
  // `standingLawFrom` is the only thing that can, and reporting it in the output is its own work.
  assert.equal(taxYear('2028-29').standingLawFrom, '2027-28');
  assert.equal(taxYear('2027-28').standingLawFrom, undefined);

  // A year below the window is still absent, never a zero — a computed zero and an uncomputed
  // liability are different facts, and that distinction survives the window opening upward.
  assert.equal(taxParametersCover('2020-21'), false);
  assert.throws(() => taxYear('2020-21'), /no tax assumptions for FY2020-21/);
});

test('A FULL FORTY-EIGHT YEAR WALK — every one of its 579 months carries a tax line', () => {
  // **The count the chunk was measured against, asserted rather than reported.** The register's
  // own 579-month demo walk is the reference length for this project; before P2-10b, 22 of those
  // 579 months fell in a covered financial year (2026-09 → 2028-06) and 557 did not. All 579 are
  // covered now, and on a Household that actually earns, all 579 carry an `Income tax` line.
  const horizon = { ...SETTINGS, asAtDate: '2026-09-16', planningHorizonAge: 100 };
  const born = {
    persons: [person('A', '1962-04-17', 3_000), person('B', '1974-11-02', 2_500)],
    homeStatus: 'occupied',
  };
  const months = project(horizon, born, []);
  assert.equal(months.length, 579, 'the reference length — B turns 100 in 2074-11');
  assert.equal(months[0].month, '2026-09');
  assert.equal(months.at(-1).month, '2074-11');

  const taxed = months.filter((m) => m.lines.some((l) => l.description.startsWith('Income tax')));
  assert.equal(taxed.length, 579);

  // NOT VACUOUS — the last month of a forty-eight year walk carries a real dollar figure, and it
  // is one the old window could not have produced at all.
  assert.deepEqual(amountOf(months.at(-1), 'Income tax, A'), [122_017]);
  assert.deepEqual(amountOf(monthAt(months, '2028-07'), 'Income tax, A'), [122_017]);

  // **THE FLATTERING FIXTURE THIS TEST EXISTS TO AVOID, stated because it nearly swallowed the
  // whole chunk.** The register's demo Household in `test/core-projection.test.mjs` is the same
  // two people with `employmentIncomePerFortnight: 0`. It emits NO salary, therefore no tax line,
  // and its count is 0 of 579 both before P2-10b and after — the entire change is invisible in the
  // fixture that owns the number. Salaries are given here for exactly that reason.
  const idle = { persons: born.persons.map((p) => ({ ...p, employmentIncomePerFortnight: toCents(0) })), homeStatus: 'occupied' };
  const idleMonths = project(horizon, idle, []);
  assert.equal(idleMonths.length, 579);
  assert.equal(idleMonths.filter((m) => m.lines.some((l) => l.description.startsWith('Income tax'))).length, 0);
  // …and that is an absence of INCOME, not an absence of parameters: every one of those months is
  // covered, so the two facts cannot be confused by reading the line count alone.
  assert.equal(idleMonths.every((m) => taxParametersCover(fyOf(m.month))), true);
});

// --- 4. What stops a salary ------------------------------------------------------------------------

test('RETIRE stops the salary, and the OTHER Person\'s tax moves because the levy is a HOUSEHOLD test', () => {
  const months = project(SETTINGS, COUPLE, [entry('r1', 'RETIRE', '2027-08-31', 'personA')]);
  // A RETIRE date is the LAST DAY WORKED (2026-09-23): its month pays the days up to and including
  // it, pro-rated by days, so dated 31 August it pays the whole of August and 2027-09 is the first
  // month with no salary. (Dated the 4th, as this fixture was before that, it would pay 4/30 of
  // September — `core-projection-retirement-month-pay.test.mjs` pins that case.)
  assert.deepEqual(amountOf(monthAt(months, '2027-08'), 'Salary, Rae'), [650_000]);
  assert.deepEqual(amountOf(monthAt(months, '2027-09'), 'Salary, Rae'), []);
  assert.deepEqual(amountOf(monthAt(months, '2027-09'), 'Income tax, Rae'), []);
  // …and it STAYS stopped. `RETIRE` is a level and there is no un-retiring entry.
  assert.deepEqual(amountOf(monthAt(months, '2028-06'), 'Salary, Rae'), []);

  // TOM'S TAX CHANGES, and that is the Act rather than a leak. Family income falls from $115,000 to
  // $38,000, below the $47,238 family lower threshold, so the s 8(2) reduction wipes his levy:
  //   tax after offsets $1,847.00 + levy NIL = $1,847.00 → ÷ 12 = $153.9166… → $153.92
  assert.deepEqual(amountOf(monthAt(months, '2027-08'), 'Income tax, Tom'), [21_725]);
  assert.deepEqual(amountOf(monthAt(months, '2027-09'), 'Income tax, Tom'), [15_392]);
  assert.equal(21_725 - 15_392, 6_333); // $760 a year of Medicare levy, ÷ 12
});

test('a zero-day WORK_PATTERN_CHANGE stops the salary and a later positive one RESTORES it, at the figure the entry STATES', () => {
  const months = project(SETTINGS, COUPLE, [
    entry('w1', 'WORK_PATTERN_CHANGE', '2027-10-01', 'personB', { daysPerWeek: 0, annualSalary: 0 }),
    entry('w2', 'WORK_PATTERN_CHANGE', '2028-02-01', 'personB', { daysPerWeek: 4, annualSalary: 3_120_000 }),
  ]);
  assert.deepEqual(amountOf(monthAt(months, '2027-09'), 'Salary, Tom'), [325_000]);
  assert.deepEqual(amountOf(monthAt(months, '2027-10'), 'Salary, Tom'), []);
  assert.deepEqual(amountOf(monthAt(months, '2028-01'), 'Salary, Tom'), []);
  // Restored — which is what makes it a PATTERN and not a retirement, and what a monotone flag
  // would get wrong. `plan.ts` allows a fractional day, and three days is not zero.
  //
  // **AND IT COMES BACK AT THE STATED FIGURE, NOT THE OLD ONE — the gap this test was planted to
  // catch, closed on 2026-09-19.** The assertion that stood here said three days a week pays the
  // same $3,250 a month as five, because no day rate and no full-time week existed in the model to
  // divide by; it was written so that "the day a rate arrives, this test goes red". No rate
  // arrived — `WorkPatternChangeParams.annualSalary` did, and the caller states the money rather
  // than the engine inventing a baseline.
  //
  // RE-DERIVED, not read off the output. Tom's Household figure is $1,500 a fortnight, which
  // `annualSalaryFromFortnightly` makes $39,000 a year and `monthlyFromAnnual` makes $3,250 a
  // month (above). `w2` states $31,200 — four fifths of it, the arithmetic the ENGINE refused to
  // do and the user may — and $31,200 ÷ 12 = $2,600.00 exactly, so no rounding stands between the
  // stated figure and the line.
  //
  // **Four days and not three, and the reason is a measurement.** At three days ($23,400) Tom's
  // taxable income is $22,400, his $700 LITO exceeds the $630 of tax on it and his levy is shaded
  // out — so there is NO income tax line at all, and every assertion below comparing tax to tax
  // would have compared two empty arrays and passed. The fixture is set where the tax line exists.
  assert.equal(3_120_000, Math.round(3_900_000 * (4 / 5)), 'the stated figure is four fifths of the Household rate');
  assert.equal(Math.round(3_120_000 / 12), 260_000);
  assert.deepEqual(amountOf(monthAt(months, '2028-02'), 'Salary, Tom'), [260_000]);
  assert.deepEqual(amountOf(monthAt(months, '2028-03'), 'Salary, Tom'), [260_000]);
  // The Household's own rate is untouched by the entry and still governs before it: the level
  // REPLACES the figure from its own month and does not rewrite the past.
  assert.deepEqual(amountOf(monthAt(months, '2027-09'), 'Salary, Tom'), [325_000]);

  // **THE TAX MOVES WITH IT, and the control is a second walk rather than a hand-worked scale.**
  // A Household whose personB states $1,200 a fortnight earns $1,200 × 26 = $31,200 a year by the
  // other route into the same figure, with no entry at all. If the stated salary is really what
  // the accrual is assessed on, Tom's income tax in these months must agree to the CENT with that
  // walk's — which pins the amount without this test owning a copy of the 2027-28 scale.
  const statedByHousehold = { ...COUPLE, persons: [COUPLE.persons[0], { ...COUPLE.persons[1], employmentIncomePerFortnight: 120_000 }] };
  const control = project(SETTINGS, statedByHousehold, []);
  assert.deepEqual(amountOf(monthAt(control, '2028-02'), 'Salary, Tom'), [260_000], 'the two routes to $31,200 disagree on the salary');
  assert.deepEqual(amountOf(monthAt(months, '2028-02'), 'Income tax, Tom'), amountOf(monthAt(control, '2028-02'), 'Income tax, Tom'));
  assert.deepEqual(amountOf(monthAt(months, '2028-03'), 'Income tax, Tom'), amountOf(monthAt(control, '2028-03'), 'Income tax, Tom'));
  // Not vacuous in either half: there IS a tax line, and it is NOT the tax on the old salary.
  assert.equal(amountOf(monthAt(months, '2028-02'), 'Income tax, Tom').length, 1);
  assert.ok(
    amountOf(monthAt(months, '2028-02'), 'Income tax, Tom')[0] < amountOf(monthAt(months, '2027-09'), 'Income tax, Tom')[0],
    'the accrual did not follow the salary down — it is still being assessed on $39,000',
  );
  // ⚠️ Only these months, and deliberately: the June true-up settles the WHOLE year, and the two
  // walks differ in the three months before `w1`, so their 2027-28 true-ups are not the same fact.
});

test('a RETIRE dated before the walk is a LEVEL: the salary never starts (chunk 2b, through chunk 3)', () => {
  const months = project(SETTINGS, COUPLE, [entry('old', 'RETIRE', '2019-02-02', 'personA')]);
  assert.deepEqual(months[0].appliedEntryIds, ['old']);
  assert.deepEqual(amountOf(months[0], 'Salary, Rae'), []);
  assert.deepEqual(amountOf(months[0], 'Salary, Tom'), [325_000]);
  // A DISABLED one is the append-only-safe delete and changes nothing at all.
  const enabled = project(SETTINGS, COUPLE, [
    { ...entry('old', 'RETIRE', '2019-02-02', 'personA'), enabled: false },
  ]);
  assert.deepEqual(amountOf(enabled[0], 'Salary, Rae'), [650_000]);
});

// --- 5. Determinism and the clock, RE-EARNED over the new call path ---------------------------------

test('project() is still pure and deterministic with the tax assembly wired in', () => {
  assert.equal(JSON.stringify(project(SETTINGS, COUPLE, [])), JSON.stringify(project(SETTINGS, COUPLE, [])));
  assert.ok(Object.isFrozen(project(SETTINGS, COUPLE, [])[0].lines));
  assert.ok(Object.isFrozen(project(SETTINGS, COUPLE, [])[0].lines[0]));
});

test('P4-1a STILL HOLDS through incomeTax.ts — two fake clocks, BYTE-IDENTICAL, over a TAX figure', () => {
  // Chunk 2 re-earned this tick for `agePension.ts`; chunk 3 puts `incomeTax.ts`, `incomeBases.ts`
  // and `data/assumptions/tax.ts` on the path and must re-earn it again. The fixture is the working
  // couple, so the output carries tax figures — an empty walk would agree under any two clocks, and
  // so would a walk whose only line is an Age Pension this fixture deliberately does not have.
  const CLOCKS = ['2027-05-10T00:00:00Z', '2032-11-30T18:03:01Z'];
  const clock = `
const fixed = Date.parse(process.env.FAKE_NOW);
const Real = Date;
class Fake extends Real {
  constructor(...args) { super(...(args.length === 0 ? [fixed] : args)); }
  static now() { return fixed; }
}
globalThis.Date = Fake;
if (Date.now() !== fixed) throw new Error('the clock override did not take');
`;
  const body = `
import { project } from ${JSON.stringify(join(ROOT, 'dist', 'core', 'projection.js'))};
process.stdout.write(JSON.stringify(project(${JSON.stringify(SETTINGS)}, ${JSON.stringify(COUPLE)}, [])));
`;
  const dir = mkdtempSync(join(tmpdir(), 'enough-tax-clock-'));
  try {
    writeFileSync(join(dir, 'clock.mjs'), clock);
    const outputs = CLOCKS.map((now) => {
      const script = join(dir, `run-${Buffer.from(now).toString('hex')}.mjs`);
      writeFileSync(script, body);
      return execFileSync(process.execPath, ['--import', join(dir, 'clock.mjs'), script], {
        encoding: 'utf8',
        env: { ...process.env, FAKE_NOW: now },
      });
    });
    assert.equal(outputs[0], outputs[1], 'the income tax drifted with the system clock');
    // NOT vacuous, in BOTH years — there was really something for a clock to drift.
    assert.match(outputs[0], /"description":"Income tax, ?Rae","amount":126333/);
    assert.match(outputs[0], /"description":"Income tax, ?Rae","amount":122017/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

// --- 6. The O72 canary ------------------------------------------------------------------------------

test('O72 — the $1,000 is read from `standardDeductionAmountFor` and written NOWHERE in the walk', () => {
  // T14 drift, and the register names this by name: "reusing `standardDeductionAmountFor` — do not
  // write a second $1,000". A second literal agrees with the record today and diverges the year
  // s 25-130(2) is amended, moving no fixture in between. The compiler cannot forbid a numeric
  // literal that happens to be 1000, so this is a canary over the source and it is honest about
  // being one.
  const source = readFileSync(join(ROOT, 'src', 'core', 'projection.ts'), 'utf8');
  const code = source
    .split('\n')
    .filter((line) => !/^\s*(\*|\/\/|\/\*)/.test(line))
    .join('\n');
  assert.equal(/\b1[_,]?000\b/.test(code), false, 'a second $1,000 was written into the walk');
  assert.match(code, /standardDeductionAmountFor\(fy, salary, reducerDeductions\)/);
  // And the deduction really does reach taxable income through that call, not past it.
  assert.equal(
    taxableIncomeFromSalary('2026-27', toCents(78_000), toCents(0)) -
      taxableIncomeFromSalary('2025-26', toCents(78_000), toCents(0)),
    -100_000,
  );
});

// --- 7. The one flag the working couple cannot see: `qualifiedForAgePension` -------------------------

/**
 * **A working pensioner — the only fixture in which SAPTO can move a number.**
 *
 * Val is 71, owns her home, holds nothing else, and is still paid $1,600 a fortnight. She is the
 * only fixture in this file where the Age Pension window (2026-03-20 → 2027-03-19) and the register's
 * tax years (FY2026-27, FY2027-28) overlap AND there is a salary to tax, which makes her the only
 * one where `SaptoPerson.qualifiedForAgePension` reaches an answer. The working couple above are 47:
 * for them the flag is false however it is computed, so it could be hard-coded either way and every
 * assertion in this file outside this test would still pass.
 */
const WORKING_PENSIONER = {
  persons: [
    {
      name: 'Val',
      dateOfBirth: '1955-04-17',
      // P6-8 brief 3 chunk 2b: the employer Superannuation Guarantee has to land in a NAMED account,
      // so a salaried Person holds one and the walk refuses a salary with nowhere to pay it. A NIL
      // balance is the smallest change that makes the fixture honest: it moves no figure of its own.
      superInterests: [{ phase: 'accumulation', balance: toCents(0) }],
      parcels: [],
      employmentIncomePerFortnight: toCents(1_600),
      workBonusBalance: toCents(0),
    },
  ],
  homeStatus: 'occupied',
};
const PENSIONER_SETTINGS = { ...SETTINGS, asAtDate: '2026-09-16', planningHorizonAge: 72 };

test('HAND-WORKED — a working pensioner: the Age Pension, the salary and the tax in ONE month', () => {
  const october = monthAt(project(PENSIONER_SETTINGS, WORKING_PENSIONER, []), '2026-10');

  // AGE PENSION — 20 Sep 2026 rates, 1 Jul 2026 means test.
  //   Work Bonus: $1,600 eligible employment income less the $300 fortnightly accrual = $1,300
  //               assessed (T29 — the Work Bonus touches employment income and nothing else).
  //   **deemed income (P4-3b): October opens with $4,808.87 in the Offset — September's own pension
  //               and net pay, banked — AND, from P6-8 brief 3 chunk 2b, $353.60 of superannuation:
  //               September's employer Guarantee, 12% of $41,600 ÷ 12 = $416.00 less the fund's 15%.
  //               Val is 71, so her Accumulation Phase interest is ASSESSED and DEEMED rather than
  //               exempt (§4.8 exempts it only below Age Pension age). $5,162.47 of deemed financial
  //               investments, below the $66,800 single threshold, all at 1.75%: $90.34 a year ÷ 26
  //               = $3.47 a fortnight.**
  //   income test: excess $1,303.47 − $212.00 free area = $1,091.47 × 50% = $545.74
  //                rate $1,244.70 − $545.74 = $698.96 a fortnight
  //   assets test: $5,162.47 of assessable assets, $327,837.53 below the single homeowner free
  //                area, so it still does not bind.
  //   $698.96 × 26 ÷ 12 = $1,514.4133… → $1,514.41 a month
  assert.equal(october.openingBalance, 480_887, 'the Offset is unchanged: the Guarantee is NOT cash and never reaches this balance');
  assert.equal(october.assessableAssets, 480_887 + 35_360, 'the Offset PLUS the Guarantee already paid — Val is over Age Pension age, so her super is assessed');
  assert.deepEqual(amountOf(october, 'Age Pension'), [151_441]);
  // **The 26 cents this chunk cost her, worked separately and in the direction §4.8 predicts.**
  // Deeming $353.60 at 1.75% is $6.19 a year, $0.238 a fortnight, halved by the taper to $0.119 and
  // × 26 ÷ 12 = $0.26 a month. A Person UNDER Age Pension age loses nothing at all to the same
  // credit, which is the asymmetry `core-projection-sacrifice-credit.test.mjs` asserts both signs of.
  assert.equal(151_467 - 151_441, toCents(0.26));
  // On employment income ALONE — the figure this test asserted until 2026-09-18 — it was $1,518.18.
  // The $3.77 between them is the whole of the deeming on the banked cash and the paid Guarantee:
  // $1.74 a fortnight of extra taper, × 26 ÷ 12.
  assert.notDeepEqual(amountOf(october, 'Age Pension'), [151_818]);
  assert.equal(151_818 - 151_441, toCents(3.77));

  // SALARY — $1,600 × 26 = $41,600 a year; a twelfth is $3,466.6666… → $3,466.67
  assert.deepEqual(amountOf(october, 'Salary, Val'), [346_667]);

  // TAX — TAXABLE INCOME = $41,600 − $1,000 = $40,600.
  //   tax    ($40,600 − $18,200) × 15% = $22,400 × 0.15 = $3,360.00 — wholly inside the lowest
  //          bracket, so this Person exercises a different limb of the ladder from Rae above
  //   LITO   $700 − (($40,600 − $37,500) × 5%) = $700 − $155.00 = $545.00
  //   SAPTO  single base rebate amount $2,230; reg s 9(5) shade-out threshold
  //          $18,200 + ($445 + $2,230) ÷ 0.15 = $36,033.33 → $36,034 (reg s 9(8), round UP)
  //          $2,230 − (($40,600 − $36,034) × 12.5c) = $2,230 − $570.75 = $1,659.25 → $1,660.00
  //          (reg s 10(2) rounds the offset up too)
  //   offsets $545.00 + $1,660.00 = $2,205.00, below the $3,360.00 it reduces → all of it applies
  //   Medicare  SAPTO was RECEIVED, so the SENIORS thresholds apply (T8): $40,600 is below the
  //             $44,268 seniors single lower threshold → NIL levy
  //   NET TAX $3,360.00 − $2,205.00 = $1,155.00 → ÷ 12 = $96.25 exactly
  assert.deepEqual(amountOf(october, 'Income tax, Val'), [9_625]);

  // **What `qualifiedForAgePension: false` would report instead.** Hard-coding the flag false is
  // invisible everywhere else in this file, and here it is a factor of three:
  //   SAPTO nil → offsets $545.00 → after offsets $2,815.00
  //   Medicare  the ORDINARY single thresholds now apply — $40,600 is past the $35,013 upper, so
  //             the full 2% × $40,600 = $812.00
  //   NET TAX $3,627.00 → ÷ 12 = $302.25
  assert.notDeepEqual(amountOf(october, 'Income tax, Val'), [30_225]);
  assert.equal(30_225 - 9_625, 20_600);

  // ⚠️ **THE FLAG IS STILL ANSWERED FROM THE WALK'S OWN ENTITLEMENT, AND 2027-04 NO LONGER SHOWS
  // IT (P4-1e, 2026-09-21).** This ended: *"in 2027-04 the register's Age Pension parameters run
  // out, the pension line disappears, and the tax rises to the unqualified figure. Two facts, one
  // cause, and neither is silently carried"* — and asserted `[]` for the pension and `[30_225]` for
  // the tax. The standing table carries the parameters past 19 March 2027, so the pension does not
  // disappear and the flag does not flip. The demonstration moves rather than the rule: what April
  // shows now is that BOTH facts held together — on carried rates until 2026-09-23, and on rates
  // indexed from the plan's own growth rates since.
  const april = monthAt(project(PENSIONER_SETTINGS, WORKING_PENSIONER, []), '2027-04');
  assert.equal(amountOf(april, 'Age Pension').length, 1);
  assert.deepEqual(amountOf(april, 'Income tax, Val'), [9_625], 'still qualified, so still the SAPTO figure');
  assert.notDeepEqual(amountOf(april, 'Income tax, Val'), [30_225]);
  // No `standing parameters` note since 2026-09-23: a plan with no series now INDEXES the rates on
  // its own growth rates rather than carrying them, and the line's provenance names that series.
  assert.equal(april.notes.filter((n) => n.subject === 'standing parameters').length, 0);
  assert.ok(april.lines.find((l) => l.description === 'Age Pension').provenance.caveats.some((c) => c.includes('generated from')));
  // ⚠️ **AND APRIL IS NOW $10.12 HIGHER THAN OCTOBER, WHERE IT USED TO BE LOWER.** The argument
  // this ended on — *"the rate table behind both months is identical, so the entire difference is the
  // balance she has accumulated in between"* — held only while the tables were carried. Two things
  // move now, in opposite directions, and both are worked:
  //   the RATE   the 20 March 2027 set indexes on the plan's rates: single basic $1,135.40 → $1,149.54
  //              (0.6633 × $1,711.80 × √1.025), Supplement $88.20 → $89.30 (× √1.025, CPI) —
  //              $15.24 a fortnight more, $33.02 a month
  //   the TAPER  the Offset and her Guarantee reach $36,575.20 deemed by April, against $5,162.47 in
  //              October: $31,412.73 more at 1.75% is $21.14 a fortnight, halved by the taper to
  //              $10.57 — $22.90 a month less
  //   $33.02 − $22.90 = $10.12, and the income test still binds in both months.
  assert.equal(april.assessableAssets, 3_657_520);
  assert.deepEqual(amountOf(april, 'Age Pension'), [152_453]);
  assert.equal(152_453 - 151_441, toCents(33.02) - toCents(22.90));
  assert.ok(april.openingBalance > october.openingBalance);
});

test('an entry owned by `household` reaches BOTH Persons — the branch no other fixture exercises', () => {
  // **Found as a surviving mutation**: deleting the `owner === 'household'` limb of `ownsPerson`
  // failed ZERO tests, because every other fixture in this file owns its entries `personA` or
  // `personB`. `EntryOwner` has three members, `plan.ts` deliberately does NOT enforce concept.md's
  // owner column ("encoding it half-way would be a ruling made by accident"), and `RetireParams` is
  // `NoParams` — so a `household`-owned `RETIRE` is constructible today by anyone.
  //
  // The reading taken is that it reaches every Person, which is the direction that stops a salary
  // rather than continuing one. The alternative — ignoring it — would pay both salaries for the
  // rest of the walk on an entry the user did write, which is the flattering direction and the
  // silent one.
  const months = project(SETTINGS, COUPLE, [entry('hr', 'RETIRE', '2027-08-31', 'household')]);
  assert.deepEqual(amountOf(monthAt(months, '2027-08'), 'Salary, Rae'), [650_000]);
  assert.deepEqual(amountOf(monthAt(months, '2027-08'), 'Salary, Tom'), [325_000]);
  // **The month after is EMPTY OF EVERY EARNED LINE, and that is now a narrower claim than
  // `lines === []` (P6-8 brief 3, chunk 2b).** Both Persons have been paid a Superannuation
  // Guarantee every month of this walk, so from September they hold a balance — and a balance
  // grows whether anybody works or not. What the retirement must stop is the salary, the tax on
  // it and the Guarantee charged on it, and those three are gone; what it cannot stop is a return
  // on money already in the fund. Asserting `[]` here would have been asserting that the
  // Household owns nothing.
  const afterRetirement = monthAt(months, '2027-09');
  assert.deepEqual(afterRetirement.lines.map((line) => line.description).sort(), [
    'Investment growth, Rae — Superannuation, Accumulation Phase',
    'Investment growth, Tom — Superannuation, Accumulation Phase',
  ]);
  assert.ok(afterRetirement.lines.every((line) => line.effect === 'wealth'), 'a cash line survived the retirement');
  // Both taxes gone too — not a zero line, an absent one, on the same rule as the Age Pension.
  assert.equal(afterRetirement.appliedEntryIds.length, 1);

  // And a `household`-owned zero-day pattern does the same, so the limb is exercised on both types.
  const zeroDays = project(SETTINGS, COUPLE, [
    entry('hw', 'WORK_PATTERN_CHANGE', '2027-09-01', 'household', { daysPerWeek: 0, annualSalary: 0 }),
  ]);
  assert.deepEqual(
    monthAt(zeroDays, '2027-09').lines.map((line) => line.description.split(',')[0]).sort(),
    ['Investment growth', 'Investment growth'],
  );
});

test('a salary is an INFLOW and income tax is an OUTFLOW — the sign, on every line of every month', () => {
  // **Found as a surviving mutation**: flipping the income-tax line to `inflow` failed ZERO tests,
  // because every assertion above filters lines by DESCRIPTION and reads only the amount.
  // `MonthLine.amount` is specified as always positive and `direction` carries the whole sign, so a
  // tax line marked `inflow` is not a small labelling slip — it is money paid to the household, and
  // it would be worth twice the tax in any total that respects the field.
  // `Superannuation Guarantee into superannuation` joined the list on 2026-09-20 (P6-8 brief 3,
  // chunk 2b) and `Investment growth` with it — the fixtures now hold a super balance to grow.
  const EXPECTED = {
    Salary: 'inflow',
    'Income tax': 'outflow',
    'Age Pension': 'inflow',
    'Superannuation Guarantee into superannuation': 'inflow',
    'Investment growth': 'inflow',
    // LR-3 (2026-09-30): a completed year under the threshold pays the offset into super in July.
    'Low income super tax offset': 'inflow',
  };
  let checked = 0;
  for (const fixture of [
    project(SETTINGS, COUPLE, []),
    project(PENSIONER_SETTINGS, WORKING_PENSIONER, []),
  ]) {
    for (const month of fixture) {
      for (const line of month.lines) {
        const kind = line.description.split(',')[0];
        assert.equal(line.direction, EXPECTED[kind], `${month.month} ${line.description}`);
        assert.ok(line.amount > 0, `${month.month} ${line.description} is not positive`);
        checked += 1;
      }
    }
  }
  // Not vacuous: all three kinds of line really were seen, so this cannot pass on an empty walk.
  assert.ok(checked > 60, `only ${checked} lines were checked`);
  const kinds = new Set(
    [...project(SETTINGS, COUPLE, []), ...project(PENSIONER_SETTINGS, WORKING_PENSIONER, [])]
      .flatMap((m) => m.lines)
      .map((l) => l.description.split(',')[0]),
  );
  assert.deepEqual([...kinds].sort(), ['Age Pension', 'Income tax', 'Investment growth', 'Low income super tax offset', 'Salary', 'Superannuation Guarantee into superannuation']);
});

// --- P6-8 brief 2, chunk 1 — the salary SACRIFICED, and the four bases it does and does not move --
//
// An effective salary sacrifice arrangement is made before the income is derived, so the sacrificed
// amount is never salary or wages of the employee and never enters assessable income (ITAA 1997
// s 6-5, TR 2001/10). Chunk 1 subtracts it above every tax line. Four bases read a salary and they
// do NOT all follow it down, which is the whole of what this section defends:
//
//   * **Taxable Income** falls — and so do the brackets, LITO and the Medicare levy built on it;
//   * **Net Labour Income** falls with it, so WATO is assessed on the reduced figure;
//   * **Rebate Income does NOT fall.** It is Taxable Income plus reportable employer superannuation
//     contributions, and an effective sacrifice is exactly such a contribution — so SAPTO is
//     assessed on the figure the Person would have had without the arrangement. P6-8 chunk 2
//     replaces the reconstruction with a real add-back through `incomeBases.ts`; what chunk 1 owes
//     is that SAPTO does not silently fall, and that is what is pinned below;
//   * **the Age Pension income test does not fall either**, and for a different reason: the register
//     holds no provision on Centrelink's treatment of salary sacrifice, ~~nobody has ruled~~, and
//     leaving it on the gross assesses the Household HIGHER and therefore claims nothing.
//     **SOMEBODY HAS RULED SINCE — register §4.3.1, R14, 2026-09-19** — to the same answer and for
//     the same reason, plus a second: it is what Centrelink actually does. The ruling was taken in
//     the ABSENCE of a provision, not against one, so a sourced one supersedes it (**O76**). The
//     register still holds no provision, and that half of the sentence stands.
//
// **The fixture is a SINGLE Person, and that WAS forced rather than convenient.** A couple could
// not express this at all: the moment one spouse's SAPTO moved and the other's did not,
// `MixedSaptoFamilyThresholdError` refused the whole assessment (register O30), so every two-Person
// fixture in the discriminating range threw before it could report a dollar.
// **⚠️ SUPERSEDED 2026-09-21: O30 is CLOSED and that refusal is deleted** — the levy is computed
// per taxpayer, and a mixed couple now answers on two different family income thresholds. The
// single Person is kept because the fixture's figures are hand-worked against it and re-deriving
// them would buy nothing; the constraint is no longer a reason.

/**
 * **Ida: 68, single, home-owner, $2,200 a fortnight — $57,200 a year.**
 *
 * Chosen so that three things are true at once, and no two-Person household can make them true:
 * the Age Pension is PAYABLE (so s 160AAAA(2)(b) is satisfied and SAPTO is in play at all), her
 * Rebate Income at the gross salary is past SAPTO's cut-out (so the offset is nil), and a $20,000
 * sacrifice would drop it far enough inside the taper to be worth about $1,740 if it were allowed
 * to fall. The gap between "nil" and "$1,740" is what makes every figure below a discriminating
 * one rather than a coincidence.
 */
const SACRIFICE_HOUSEHOLD = {
  persons: [person('Ida', '1958-04-10', 2_200)],
  homeStatus: 'occupied',
};

const SACRIFICE_SETTINGS = {
  asAtDate: '2026-10-01',
  planningHorizonAge: 72,
  // Pay rising with wages (2026-09-23) is not this fixture's subject: `awote: 0` holds every salary at the figure stated. A proved control: every figure this file asserts is the same at nil on the build before pay rose.
  economicSeries: { cpi: 0.025, pblci: 0.025, awote: 0, mtawe: 0.035 },
  deemingRates: { lower: 0.0175, upper: 0.0375 },
  nominalReturn: 0.065,
  // Interest on cash (2026-09-23) is not this fixture's subject: stated nil, the control proved byte-identical to the walk before it existed.
  cashInterestRate: 0,
};

const SACRIFICE_SPEND = entry('spend', 'SPEND_CHANGE', '2026-10-01', 'household', { annualSpend: toCents(40_000) });

const sacrificeEntry = (annualAmount, date = '2026-11-01', id = 'sac') =>
  entry(id, 'SUPER_CONTRIBUTION', date, 'personA', { kind: 'salarySacrificed', annualAmount: toCents(annualAmount), interestIndex: 0 });

const sacrificeWalk = (...extra) => project(SACRIFICE_SETTINGS, SACRIFICE_HOUSEHOLD, [SACRIFICE_SPEND, ...extra]);

const idaLine = (months, month, prefix) => {
  const found = months.find((each) => each.month === month).lines.find((line) => line.description.startsWith(prefix));
  return found === undefined ? 0 : found.amount;
};

test('a sacrifice reduces the salary assessed, and the arithmetic is worked out long', () => {
  const plain = sacrificeWalk();
  const sacrificed = sacrificeWalk(sacrificeEntry(20_000));

  // **WITHOUT the sacrifice.** $57,200 assessed, less the s 25-130 deduction of $1,000 →
  // $56,200 taxable. FY2026-27: 26,800 × 15% = $4,020.00, plus 11,200 × 30% = $3,360.00 →
  // $7,380.00. LITO is $325.00 − 11,200 × 1.5c = $157.00. SAPTO is NIL at this Rebate Income, so
  // the seniors Medicare thresholds do not apply and the levy is the full 2% of $56,200 =
  // $1,124.00. WATO does not exist before FY2027-28.
  //   $7,380.00 − $157.00 + $1,124.00 = $8,347.00 a year, a twelfth of which is $695.58.
  assert.equal(4_020_00 + 3_360_00 - 157_00 + 1_124_00, 8_347_00);
  assert.equal(idaLine(plain, '2026-11', 'Income tax, Ida'), 69_558);

  // **WITH $20,000 sacrificed.** $37,200 assessed, $36,200 taxable. 18,000 × 15% = $2,700.00.
  // $36,200 is under LITO's first threshold, so the offset is the full $700.00. And the levy is
  // STILL the non-seniors full 2% — $724.00 — because Rebate Income did not move: it is the
  // $56,200 above, past SAPTO's cut-out, so no offset is received and no seniors threshold applies.
  //   $2,700.00 − $700.00 + $724.00 = $2,724.00 a year, a twelfth of which is $227.00.
  assert.equal(2_700_00 - 700_00 + 724_00, 2_724_00);
  assert.equal(idaLine(sacrificed, '2026-11', 'Income tax, Ida'), 22_700);
});

test('SAPTO does NOT follow the sacrifice down, and the same taxable income proves it', () => {
  // **The discriminator, and it is a pair of walks with the SAME taxable income.** A stated salary
  // of $37,200 and a $57,200 salary with $20,000 sacrificed both assess $36,200 of taxable income.
  // If Rebate Income fell with the sacrifice the two would pay the SAME tax. They do not, and the
  // whole of the difference is SAPTO: at a Rebate Income of $36,200 Ida is inside the taper and the
  // offset (about $1,740) wipes out her $2,700 of basic liability and takes the seniors Medicare
  // thresholds with it, which is why the stated-salary walk pays NOTHING.
  const sacrificed = sacrificeWalk(sacrificeEntry(20_000));
  const statedLow = sacrificeWalk(entry('w', 'WORK_PATTERN_CHANGE', '2026-11-01', 'personA', { daysPerWeek: 5, annualSalary: toCents(37_200) }));
  assert.equal(idaLine(statedLow, '2026-11', 'Income tax, Ida'), 0, 'the control: at a real $37,200 salary SAPTO applies and the tax is nil');
  assert.equal(idaLine(sacrificed, '2026-11', 'Income tax, Ida'), 22_700, 'SAPTO has followed the sacrifice down — Rebate Income is not being held on the gross');
  assert.notEqual(idaLine(statedLow, '2026-11', 'Income tax, Ida'), idaLine(sacrificed, '2026-11', 'Income tax, Ida'));
});

test('the Age Pension income test is left on the GROSS salary, and stays there', () => {
  const plain = sacrificeWalk();
  const sacrificed = sacrificeWalk(sacrificeEntry(20_000));
  // The FIRST month of the arrangement, because it is the only month in which the two walks still
  // hold the same balances — from the month after, the tax saving is cash and the assets test sees
  // it, so a later equality would be asserting something else.
  //
  // ⚠️ **$867.01 became $866.65 on 2026-09-20 (P6-8 brief 3, chunk 2b) and the 36 cents is
  // RE-DERIVED, not re-pasted.** Ida is over Age Pension age, so the superannuation her employer
  // now pays her is ASSESSED and DEEMED rather than exempt. October credits 12% of $57,200 = $572
  // for the month, less the fund's 15% = $486.20, which November opens with. Below the $66,800
  // single deeming threshold it deems at 1.75% — $8.51 a year, $0.327 a fortnight — and the income
  // test takes 50c in the dollar of it: $0.164 a fortnight × 26 ÷ 12 = **$0.35 a month**, plus a
  // month's growth on the credit. The direction is the one §4.8 predicts: for a Person UNDER Age
  // Pension age the same credit is exempt and the pension does not move at all.
  assert.equal(idaLine(plain, '2026-11', 'Age Pension'), 86_665);
  assert.equal(idaLine(sacrificed, '2026-11', 'Age Pension'), 86_665);
  // **And the two are still EQUAL, which is now a second finding rather than the same one.** The
  // Guarantee is charged on PRE-sacrifice qualifying earnings (T17), so the sacrificing walk gets
  // exactly the same employer contribution as the plain one — a build that computed the SG on the
  // post-sacrifice figure would credit $2,040 a year less here and the equality would break.
  //
  // The control: the income test is live and responsive, so the equality above is not the equality
  // of two figures nothing could have moved. A stated salary $20,000 lower DOES raise the pension.
  const statedLow = sacrificeWalk(entry('w', 'WORK_PATTERN_CHANGE', '2026-11-01', 'personA', { daysPerWeek: 5, annualSalary: toCents(37_200) }));
  assert.ok(idaLine(statedLow, '2026-11', 'Age Pension') > 86_665, 'the income test does not respond to salary at all — the equality above proves nothing');
});

test('a later SUPER_CONTRIBUTION SUPERSEDES the standing one and is not added to it', () => {
  const months = sacrificeWalk(sacrificeEntry(20_000), sacrificeEntry(5_000, '2027-01-01', 'sac2'));
  // November: $20,000 sacrificed, the figure derived above.
  assert.equal(idaLine(months, '2026-11', 'Income tax, Ida'), 22_700);
  // January: the level is now $5,000, so $52,200 is assessed and $51,200 is taxable.
  // 26,800 × 15% = $4,020.00 + 6,200 × 30% = $1,860.00 → $5,880.00; LITO $325.00 − 6,200 × 1.5c =
  // $232.00; levy 2% of $51,200 = $1,024.00. $5,880.00 − $232.00 + $1,024.00 = $6,672.00, a
  // twelfth of which is $556.00.
  assert.equal(4_020_00 + 1_860_00 - 232_00 + 1_024_00, 6_672_00);
  assert.equal(idaLine(months, '2027-01', 'Income tax, Ida'), 55_600);
  // ⚠️ The direction matters: the superseding level is SMALLER, so summing the two would sacrifice
  // $25,000 and the tax would go DOWN rather than up. The assertion is that it went UP.
  assert.ok(55_600 > 22_700, 'the second contribution was added to the first instead of replacing it');
  // And RESTATING the same level changes nothing at all — the second one takes the first one's
  // place, so a user who re-types the figure they already sacrifice is not sacrificing twice.
  const restated = sacrificeWalk(sacrificeEntry(20_000), sacrificeEntry(20_000, '2027-01-01', 'again'));
  assert.equal(idaLine(restated, '2026-11', 'Income tax, Ida'), 22_700);
  assert.equal(idaLine(restated, '2027-01', 'Income tax, Ida'), 22_700);
  assert.equal(idaLine(restated, '2027-06', 'Income tax, Ida'), 22_700);
});

test('a sacrifice larger than the pay it comes out of takes the salary to nil and no further', () => {
  // ⚠️ **THIS FIXTURE HAS BEEN RE-BUILT TWICE, AND THE SECOND TIME IS P6-8 BRIEF 3's FINAL CHUNK
  // (2026-09-20).** It first stated $90,000 against Ida's $57,200 of pay, and brief 2 chunk 5
  // refused that as over the FY2026-27 general concessional cap of $32,500. Chunk 5's rebuild —
  // $32,500 sacrificed against a STATED $30,000 salary, at the cap exactly — is refused in its turn
  // now that the cap is measured against the sacrifice AND the employer's Guarantee: 12% of
  // $30,000 is $3,600, so the total is $33,600 and it is $1,100 over. **Re-derived rather than
  // relaxed**, on the arithmetic the new rule makes available: a salary of S carries a Guarantee of
  // 0.12 S, so a full sacrifice of the pay is 1.12 S of concessional contributions and the rule
  // this test is FOR needs S ≤ $32,500 ÷ 1.12 = $29,017. Ida's salary is STATED at $25,000 and she
  // sacrifices $27,500: $25,000 of it is made, $3,000 of Guarantee joins it, the total is $28,000 —
  // inside the cap — and $2,500 of the arrangement is more than she is paid.
  //
  // The two rules do not overlap. The cap is $32,500 and a Person may earn far less than that, so
  // an arrangement can be inside the cap and still bigger than the pay packet, which is what this
  // fixture is.
  //
  // Nothing yet refuses an arrangement bigger than the salary (TODO P6-8). Until then it is capped
  // at the month's own gross, which is the only reading that keeps taxable income non-negative —
  // ITAA 1997 s 4-15(1) gives no negative taxable income — and keeps `assessable + sacrificed`
  // equal to the gross exactly, which is what lets Rebate Income add the sacrifice back without a
  // floor to slip through.
  const lowSalary = entry('w', 'WORK_PATTERN_CHANGE', '2026-11-01', 'personA', { daysPerWeek: 5, annualSalary: toCents(25_000) });
  const months = sacrificeWalk(lowSalary, sacrificeEntry(27_500));
  // The cap arithmetic above, as a walk: a dollar more of salary and the same full sacrifice is
  // over the cap once the Guarantee is counted, so the headroom this fixture sits in is real.
  assert.equal(Math.round(25_000_00 * 1.12), 28_000_00);
  assert.throws(
    () => sacrificeWalk(entry('w', 'WORK_PATTERN_CHANGE', '2026-11-01', 'personA', { daysPerWeek: 5, annualSalary: toCents(30_000) }), sacrificeEntry(32_500)),
    { name: 'ExcessConcessionalContributionsNotModelledError' },
  );
  // **AT THE CAP EXACTLY IS ACCEPTED, and this walk is the proof that it is walked and not merely
  // tolerated.** s 291-20(1) is exceeded only ABOVE the cap; the boundary is pinned to the cent in
  // the sacrifice-credit file, and this is the behavioural half of it.
  assert.equal(idaLine(months, '2026-11', 'Income tax, Ida'), 0);
  // Ida sacrifices the WHOLE pay packet: $32,500 stated against a $30,000 salary, capped at the
  // month's own gross, leaves $0.00 received. The walk emits a `Salary` line only when the month's
  // pay is positive, so there is no line at all — `idaLine` returns 0 for an absent line, and the
  // assertion beside it says the line is genuinely ABSENT rather than present and nil, because
  // those are different claims about a Household with no wages.
  assert.equal(idaLine(months, '2026-11', 'Salary, Ida'), 0);
  assert.equal(monthAt(months, '2026-11').lines.filter((line) => line.description.startsWith('Salary,')).length, 0, 'a nil Salary line is being emitted rather than omitted');
  assert.equal(monthAt(months, '2026-10').lines.filter((line) => line.description.startsWith('Salary,')).length, 1, 'the control: the month BEFORE the sacrifice has a Salary line, so the absence above is the sacrifice’s doing');

  // **And the excess is STILL silently dropped rather than clawed back — the cap is a cap.** A
  // $32,500 arrangement against $30,000 of pay takes the pay to nil and stops: the cash line is
  // absent, not negative, and no further $2,500 is pursued from anywhere. Nothing in the month
  // distinguishes it from a $30,000 arrangement, which is the residual chunk 5 does NOT close —
  // the cap refusal is about the concessional cap and says nothing about the pay packet.
  const exactlyTheSalary = sacrificeWalk(lowSalary, sacrificeEntry(25_000));
  assert.deepEqual(monthAt(months, '2026-11').lines, monthAt(exactlyTheSalary, '2026-11').lines, 'the excess above the salary is doing something — it must be dropped whole');

  // **AND THE EXCESS NEVER REACHES THE FUND EITHER, which is chunk 4's half of the same rule.** The
  // credit is a twelfth of the $25,000 actually sacrificed, less the fund's 15%: $2,083.33 − 15% =
  // $1,770.83, and the $27,500 arrangement credits exactly that and not a cent of the $2,500 it
  // states over the salary.
  assert.equal(Math.round(2_500_000 / 12), 208_333);
  assert.equal(208_333 - Math.round(208_333 * 0.15), 177_083);
  assert.equal(idaLine(months, '2026-11', 'Salary sacrifice into superannuation, Ida'), 177_083);

  // ⚠️ **LIMB 1 IS THE AGE PENSION ALONE FROM THE MONTH THE PAY GOES, and that is the assertion
  // rather than a figure: the salary limb draws exactly the Age Pension line.** The Household's
  // whole spending target came out of limb 1 while the pay packet was intact; with the pay gone,
  // limb 1 has only the pension in it and the Waterfall runs down the cash it had been sweeping
  // into. Ida owes no home loan, so since 2026-09-23 that cash is `cashAboveLoan` — none of it is
  // offsetting a loan — and the Offset limb proper offers nothing.
  const limb = (month, name) => monthAt(months, month).notes.find((note) => note.limb === name).drawn;
  assert.equal(limb('2026-11', 'salary'), idaLine(months, '2026-11', 'Age Pension'), 'limb 1 is drawing more than the pension — the pay packet has not gone');
  assert.ok(limb('2026-10', 'salary') > idaLine(months, '2026-10', 'Age Pension'), 'the control: in October limb 1 holds wages as well as the pension');
  assert.ok(limb('2026-11', 'cashAboveLoan') > 0, 'the cash funded nothing — the month is not being made up from the swept surplus');
  assert.equal(limb('2026-11', 'offsetAccount'), 0);

  // ⚠️ **THE FIRST CREDIT LANDS AT THE END OF ITS OWN TICK, AFTER THE WATERFALL HAS RUN, and this
  // is the ordering that says so.** November has a contribution line and limb 5 draws NOTHING from
  // it; December draws on it. Ida is 68, so her superannuation is released and limb 5 can reach it
  // — the Household is not better off for any of this: it has paid 15% to get money into a fund
  // and drawn it straight back out to buy groceries, which is what an arrangement bigger than the
  // pay packet IS.
  assert.equal(limb('2026-11', 'releasedSuperannuation'), 0, 'limb 5 funded the month the arrangement started — the credit is landing before the Waterfall');
  assert.ok(limb('2026-12', 'releasedSuperannuation') > 0, 'limb 5 never draws on the contribution at all');
  assert.ok(limb('2026-12', 'releasedSuperannuation') < 177_083 * 2, 'limb 5 drew more than two months of contributions have put in');
  // And no month is unfunded, which is a CHANGE from the fixture this replaced and is explained by
  // it: the income test is on the GROSS salary, so a Person stating $30,000 rather than $57,200 is
  // paid a much larger pension — $2,000.33 against $868.18 — and that, with the Offset Account,
  // covers the target without the sacrifice being drawn back in the month it is made.
  assert.equal(idaLine(months, '2026-11', 'Unfunded shortfall'), 0);
  assert.ok(idaLine(months, '2026-11', 'Age Pension') > idaLine(months, '2026-10', 'Age Pension'), 'the pension did not rise when the stated salary fell — the income test is not on the stated gross');
});

test('the year-end true-up settles the ASSESSABLE year, so a mid-year start charges nothing spurious', () => {
  const trueUps = (months) => months.flatMap((each) => each.lines.filter((line) => line.description.startsWith('Income tax year-end true-up')).map((line) => `${each.month} ${line.direction} ${line.amount}`));
  // A flat salary settles to nothing at all: the only gap is the arithmetic residue of twelve
  // roundings, which the one-dollar de-minimis absorbs. Same for a sacrifice that ran the WHOLE
  // year — the accrual and the year agree because both are on the reduced salary.
  assert.deepEqual(trueUps(sacrificeWalk()), []);
  assert.deepEqual(trueUps(sacrificeWalk(sacrificeEntry(15_000, '2027-07-01'))), []);

  // ⚠️ **$15,000, AND THE CONSTRAINT THAT CHOSE IT HAS MOVED TWICE (P6-8 brief 3, 2026-09-20; then
  // P6-12, 2026-09-21).** What stood here: *"these walks are dated in FY2027-28, which has no AWOTE
  // index number — so the floor does the deciding … the most she can sacrifice is $25,000 − $6,864 =
  // $18,136 … the $20,000 this test used until then now raises `MissingIndexNumberError` by name."*
  // FY2027-28 has a cap again — a DERIVED one, $32,500, indexed off December 2025's published wage
  // level at the plan's own 3.5% (and at the `awote: 0` this fixture states since 2026-09-23 it is the
  // same $32,500: 2051.10 ÷ 1533.40 is a factor of about 1.338, and $25,000 × 1.338 floors to the
  // same $2,500 step) — so
  // the room is $32,500 − $6,864 = **$25,636**, the $20,000 walks
  // once more, and the refusal for want of an index number is gone from this fixture entirely. The
  // constraint is stated in both its forms because the fixture was re-derived under the old one and
  // the figures below are still the $15,000 ones: they are inside both rooms, so the walk this test
  // is actually about did not move a cent.
  assert.equal(25_000_00 - Math.round(57_200_00 * 0.12), 18_136_00);
  assert.equal(32_500_00 - Math.round(57_200_00 * 0.12), 25_636_00);
  assert.ok(sacrificeWalk(sacrificeEntry(20_000, '2027-07-01')).length > 0, 'the derived cap is not reaching the walk — $20,000 is inside FY2027-28\'s room');
  // The boundary is still a cent wide, and it is now the derived cap's boundary rather than the
  // floor's — so a build that quietly went back to the base amount fails on the first of these.
  assert.ok(sacrificeWalk(sacrificeEntry(25_636, '2027-07-01')).length > 0);
  assert.throws(
    () => sacrificeWalk(sacrificeEntry(25_637, '2027-07-01')),
    { name: 'ExcessConcessionalContributionsNotModelledError' },
  );

  // **A sacrifice starting in NOVEMBER 2027 — four months of FY2027-28 at the gross figure and
  // eight at the reduced one — and this is the figure the accumulator decides.**
  //
  // THE MONTHLY ACCRUALS, both levels, on the FY2027-28 scale:
  //   gross    $57,200 assessed, $56,200 taxable: 26,800 × 14% = $3,752.00 + 11,200 × 30% =
  //            $3,360.00 → $7,112.00; LITO $325.00 − 11,200 × 1.5c = $157.00; WATO $250.00; levy
  //            2% of $56,200 = $1,124.00 ⇒ $7,829.00 a year, a twelfth of which is $652.42.
  //   reduced  $42,200 assessed, $41,200 taxable: 23,000 × 14% = $3,220.00; LITO is the FIRST-stage
  //            taper here — $700.00 − 3,700 × 5c = $515.00; WATO $250.00; levy 2% of $41,200 =
  //            $824.00 ⇒ $3,279.00 a year, a twelfth of which is $273.25 exactly.
  // ACCRUED: 4 × $652.42 + 8 × $273.25 = $2,609.68 + $2,186.00 = $4,795.68.
  // THE YEAR'S ASSESSABLE SALARY: 4 × $4,766.67 + 8 × $3,516.67 = $47,200.04 — and the year's
  // SACRIFICED total, 8 × $1,250.00 = $10,000.00, is carried beside it so that Rebate Income can
  // add it back: $46,200.04 + $10,000.00 is past SAPTO's $36,034 shade-out, which is why SAPTO is
  // still nil in the settlement and the seniors Medicare threshold does not apply.
  // ASSESSED on $47,200.04, taxable $46,200.04: 26,800 × 14% = $3,752.00 + 1,200.04 × 30% =
  // $360.01 → $4,112.01; LITO $325.00 − 1,200.04 × 1.5c = $307.00; WATO $250.00; levy 2% of
  // $46,200.04 = $924.00.
  //   $4,112.01 − $307.00 − $250.00 + $924.00 = $4,479.01.
  // The true-up is accrued less assessed: $4,795.68 − $4,479.01 = $316.67, and it comes BACK.
  assert.equal(3_752_00 + 3_360_00 - 157_00 - 250_00 + 1_124_00, 7_829_00);
  assert.equal(Math.round(7_829_00 / 12), 652_42);
  assert.equal(3_220_00 - 515_00 - 250_00 + 824_00, 3_279_00);
  assert.equal(Math.round(3_279_00 / 12), 273_25);
  assert.equal(652_42 * 4 + 273_25 * 8, 4_795_68);
  assert.equal(Math.round(57_200_00 / 12) * 4 + Math.round(42_200_00 / 12) * 8, 47_200_04);
  assert.equal(4_112_01 - 307_00 - 250_00 + 924_00, 4_479_01);
  assert.deepEqual(trueUps(sacrificeWalk(sacrificeEntry(15_000, '2027-11-01'))), ['2028-07 inflow 31667']);
  assert.equal(4_795_68 - 4_479_01, 31_667);
  // ⚠️ **The tripwire this test is really for.** Had the year's accumulator held the GROSS salary,
  // the settlement would have assessed $57,200.04 — eight months of dollars that never entered
  // assessable income, $7,829.01 of tax — and billed the difference: a CHARGE of about $3,033 in
  // the July of a year in which nothing went wrong. The assertion above is an inflow, and its
  // magnitude is the one the assessable year predicts.
  assert.equal(7_829_01 - 4_795_68, 3_033_33);
  const [only] = trueUps(sacrificeWalk(sacrificeEntry(15_000, '2027-11-01')));
  assert.match(only, /inflow/, 'the mid-year start is producing a CHARGE — the year is being assessed on the gross salary');
});

test('the sacrifice is one Person’s, and the other Person’s tax does not move', () => {
  // `checkContributionTargets` refuses a `household`-owned contribution at the door, so the walk
  // only ever has one Person to apply it to. This is that split, seen from the walk: the COUPLE
  // fixture at the top of this file, with Rae sacrificing and Tom untouched.
  const withSacrifice = project(SETTINGS, COUPLE, [entry('sac', 'SUPER_CONTRIBUTION', '2027-07-01', 'personA', { kind: 'salarySacrificed', annualAmount: toCents(10_000), interestIndex: 0 })]);
  const without = project(SETTINGS, COUPLE, []);
  const tax = (months, month, name) => idaLine(months, month, `Income tax, ${name}`);
  assert.ok(tax(withSacrifice, '2027-07', 'Rae') < tax(without, '2027-07', 'Rae'), 'the sacrifice reached nobody');
  assert.ok(tax(without, '2027-07', 'Tom') > 0, 'the control: Tom pays tax, so the equality below is not 0 === 0');
  assert.equal(tax(withSacrifice, '2027-07', 'Tom'), tax(without, '2027-07', 'Tom'));
  // And it reaches Rae from its own month and not the month before.
  assert.equal(tax(withSacrifice, '2027-06', 'Rae'), tax(without, '2027-06', 'Rae'));
});

// --- P6-8 brief 2, chunk 2 — the add-back is the ACT's, and where it parts company with chunk 1 ---
//
// Chunk 1 held Rebate Income up by re-running the assessment on `salary + sacrificed` — the right
// answer by the wrong mechanism, as its own author wrote. Chunk 2 does what ITAA 1936 s 6(1) says:
// Rebate Income is TAXABLE INCOME PLUS *reportable superannuation contributions*, and an effective
// salary sacrifice is a *reportable employer superannuation contribution* (ITAA 1997 s 995-1(1),
// TAA 1953 Sch 1 s 16-182(1)(c)/(d)), so the sacrifice is added back to the reduced figure and the
// gross is never rebuilt.
//
// **The two spellings differ by exactly `min($1,000, assessable) − min($1,000, gross)`**, because
// s 25-130(2)'s standard deduction is capped at the salary it is measured against and chunk 1 ran
// it against the GROSS. That is nil for every fixture in this repo and for every Person who leaves
// themselves at least $1,000 of assessable pay — which is why nothing in the suite moved when the
// mechanism was replaced — and it is up to $1,000 of Rebate Income for a Person who sacrifices
// almost the lot. Below that line chunk 1 handed out up to $1,000 of work deduction against less
// work income than that, holding Rebate Income too LOW and shading SAPTO out too little: the
// flattering direction. The two tests below are that difference, in dollars.

/**
 * **Ida again, but sacrificing nearly the whole of a stated $20,000 salary, and selling a parcel.**
 *
 * The capital gain is not decoration — it is the only way the disagreement is VISIBLE at all, and
 * that is worth stating. Below $1,000 of assessable salary the s 25-130 deduction takes taxable
 * income to nil under either spelling, and a nil taxable income has nothing for SAPTO to reduce. So
 * a Person can only show the difference if some OTHER assessable amount carries a liability for the
 * offset to bite on, and in this model the only other assessable amount is a net capital gain
 * (s 102-5), which enters taxable income AFTER the deduction and so survives it.
 *
 * `nominalReturn: 0` so the parcel is worth what it says: a $20,000 cost base and an $80,000 market
 * value, held since 2015, sold whole — a $60,000 nominal gain, discounted by half to a **$30,000
 * net capital gain**, in FY2026-27.
 */
const GAIN_HOUSEHOLD = {
  persons: [{
    name: 'Ida',
    dateOfBirth: '1958-04-10',
    // Nil, for the reason on `person` above: the sacrifice names interest 0 and the walk refuses an
    // index that names nothing. It stays nil in the plain walk and the parcel is still the only
    // asset this Household starts with.
    superInterests: [{ phase: 'accumulation', balance: toCents(0) }],
    parcels: [{ acquired: '2015-01-05', costBase: toCents(20_000), marketValue: toCents(80_000) }],
    employmentIncomePerFortnight: toCents(2_200),
    workBonusBalance: toCents(0),
  }],
  homeStatus: 'occupied',
};

const GAIN_SETTINGS = { ...SACRIFICE_SETTINGS, planningHorizonAge: 70, nominalReturn: 0 };

/** The salary is STATED rather than derived from the fortnightly figure, because $500 either way decides this test. */
const gainWalk = (annualAmount) =>
  project(GAIN_SETTINGS, GAIN_HOUSEHOLD, [
    SACRIFICE_SPEND,
    entry('w', 'WORK_PATTERN_CHANGE', '2026-10-01', 'personA', { daysPerWeek: 5, annualSalary: toCents(20_000) }),
    entry('sac', 'SUPER_CONTRIBUTION', '2026-10-01', 'personA', { kind: 'salarySacrificed', annualAmount: toCents(annualAmount), interestIndex: 0 }),
    entry('sell', 'NON_SUPER_INVESTMENT', '2026-12-15', 'personA', { direction: 'sell', amount: toCents(80_000) }),
  ]);

test('the sacrifice is added back to the REDUCED income, and the last $500 of assessable salary is worth $63', () => {
  // **The SAPTO parameters this fixture turns on, derived and not looked up.** FY2026-27, single:
  // reg s 9(5) gives T = $18,200 + ($445 + $2,230) ÷ 0.15 = $36,033.33, which does not exceed the
  // $37,000 rebate reduction threshold, so the s 9(6) branch is not reached and the shade-out is
  // $36,034 after the s 9(8) round-up. The taper is 12.5c (reg s 11(2)(b)) and the offset itself
  // rounds UP to the whole dollar too (reg s 10(2)) — which is why the answer below is $63.00 and
  // not the $62.50 the taper alone gives.
  const SHADE_OUT = 36_034_00;
  assert.equal(Math.ceil((18_200_00 + (445_00 + 2_230_00) / 0.15) / 100) * 100, SHADE_OUT);

  const gainTax = (months) =>
    months.find((each) => each.month === '2026-12').lines
      .find((line) => line.description.startsWith('Income tax on capital gain')).amount;
  /** Every charge on a gain in FY2026-27, because from chunk 3 the disposals are no longer all in December. */
  const gainTaxForTheYear = (months) => months
    .filter((each) => each.month >= '2026-07' && each.month <= '2027-06')
    .flatMap((each) => each.lines.filter((line) => line.description.startsWith('Income tax on capital gain')))
    .reduce((total, line) => total + line.amount, 0);
  // ⚠️ **CHUNK 3 CHANGED WHERE THE PARCEL IS SOLD AND NOT WHAT IT COSTS.** With the pay packet
  // reduced, limb 1 no longer covers the spending target, so limb 3 sells a slice of the parcel
  // every month from October — see the test below, which is about that crossing. The December
  // figure is nevertheless still the WHOLE year's charge, and for a reason worth writing down: the
  // year's assessment is telescoped, and October's and November's slices each realise a few hundred
  // dollars of discounted gain against a nil salary, which is under the tax-free threshold, so the
  // increment they add is nil. The equality below is what says so — if a future change makes those
  // months carry tax, the December figure alone would silently under-state and this would catch it.
  for (const level of [19_500, 19_000, 18_000]) {
    assert.equal(gainTax(gainWalk(level)), gainTaxForTheYear(gainWalk(level)), `${level}: the year's charge on the gain is no longer all in December`);
  }

  // **$19,500 sacrificed out of $20,000 — $500 of assessable salary left.** Taxable income from
  // salary is nil ($500 less a $500 deduction, capped by limb (b) of the `min`), so taxable income
  // is the $30,000 net capital gain alone. Rebate Income is that PLUS the $19,500 added back:
  //   basic liability  ($30,000 − $18,200) × 15%          = $1,770.00
  //   LITO             the full $700 below $37,500        = −$700.00
  //   SAPTO            $2,230 − ($49,500 − $36,034) × 12.5c = $546.75, rounded up to $547.00
  //   Medicare levy    $30,000 is under the $44,268 seniors single threshold = nil
  // → $523.00, and it is charged whole in the month of the disposal.
  const sapto = (rebate) => Math.ceil((2_230_00 - (rebate - SHADE_OUT) * 0.125) / 100) * 100;
  assert.equal(sapto(49_500_00), 547_00);
  assert.equal(1_770_00 - 700_00 - 547_00, 523_00);
  assert.equal(gainTax(gainWalk(19_500)), 523_00);

  // **$19,000 sacrificed — $1,000 of assessable salary left.** Taxable income is unchanged: $1,000
  // less the full $1,000 deduction is still nil, so this walk differs from the one above in ONE
  // figure only, the amount added back. Rebate Income is $500 lower, SAPTO $63.00 higher after the
  // round-up, and the tax $63.00 lower.
  assert.equal(sapto(49_000_00), 610_00);
  assert.equal(1_770_00 - 700_00 - 610_00, 460_00);
  assert.equal(gainTax(gainWalk(19_000)), 460_00);
  assert.equal(gainTax(gainWalk(19_500)) - gainTax(gainWalk(19_000)), 63_00);

  // ⚠️ **THIS PAIR IS THE TRIPWIRE ON CHUNK 1's SHORTCUT, and nothing else in the suite is.** Under
  // `rebateIncomeFrom(taxableIncomeFromSalary(fy, salary + sacrificed, …))` both walks assess the
  // same $20,000 gross, take the same $1,000 deduction and reach the same $49,000 of Rebate Income,
  // so both pay $460.00 and the $63.00 above is $0.00. The first assertion is the one that goes red.

  // **And the region where the two spellings AGREE, kept in the same test so the boundary is one
  // fact and not two.** $18,000 sacrificed leaves $2,000 assessable, the deduction is the whole
  // $1,000 either way, and taxable income is $1,000 + $30,000 = $31,000:
  //   ($31,000 − $18,200) × 15% = $1,920.00, less $700.00 of LITO, less SAPTO on a Rebate Income of
  //   $31,000 + $18,000 = $49,000 — the SAME $610.00 as the walk above, reached from a different
  //   taxable income — → $610.00.
  assert.equal(1_920_00 - 700_00 - 610_00, 610_00);
  assert.equal(gainTax(gainWalk(18_000)), 610_00);

  // ⚠️ **THE CONTROL BELOW LOST ITS PREMISE TO CHUNK 3 (2026-09-20) AND IS RE-EXPRESSED, BECAUSE
  // THE ISOLATION IT RESTED ON CANNOT BE RESTORED.** It read: *"the Age Pension is IDENTICAL across
  // all three walks, so nothing above is a means-test artefact"*, and that was true while the pay
  // packet ignored the sacrifice — the three walks then differed in tax alone, and their tax was
  // nil. From chunk 3 the three walks differ in CASH by construction ($41.67 and $125.00 a month),
  // so their assets differ, so the means test must differ: there is no fixture in which three
  // different sacrifices produce three identical asset paths, and pretending otherwise would mean
  // a control that no longer controls anything. What the control was FOR — that the $63.00 is
  // SAPTO and not the pension — is defended instead by PRICING the pension's movement and showing
  // it is two orders of magnitude too small, and by the fact that the Age Pension is not assessable
  // income in this model and so cannot reach a tax figure at all.
  //
  // **The price, from the mechanism.** By December the walks have run two months of differing cash,
  // so their assessable assets differ by twice the monthly cash gap. Ida's financial assets are
  // ~$78,000 — above the single deeming threshold — so the MARGINAL dollar is deemed at the UPPER
  // rate, and 50c of every deemed dollar is withdrawn:
  //   Δpension per month = Δassets × 3.75% × 50c ÷ 12 = Δassets × 0.0015625.
  const pension = (months) => idaLine(months, '2026-12', 'Age Pension');
  const assets = (months) => monthAt(months, '2026-12').assessableAssets;
  // Sacrificing MORE leaves FEWER assets and so a HIGHER pension: the gap below is signed that way
  // round, and the sign is the direction claim, not a detail of the subtraction.
  const tapered = (months) => Math.round((assets(months) - assets(gainWalk(19_500))) * 0.0375 * 0.5 / 12);
  for (const level of [19_000, 18_000]) {
    const walk = gainWalk(level);
    assert.ok(assets(walk) > assets(gainWalk(19_500)), `${level}: sacrificing less must leave MORE assets — the cash is not reaching the balance`);
    assert.equal(pension(gainWalk(19_500)) - pension(walk), tapered(walk), `${level}: the pension gap is not the taper on the asset gap`);
    // …and it is small: 13c and 39c against the $63.00 this test is about, so no arrangement of the
    // means test could be producing that figure. Asserted as a ratio so the two move together.
    assert.ok(Math.abs(pension(gainWalk(19_500)) - pension(walk)) * 100 < 63_00, `${level}: the pension gap is within two orders of the SAPTO difference — it can no longer be ruled out as its cause`);
  }
  assert.ok(pension(gainWalk(19_500)) > 0, 'no pension is payable, so SAPTO’s s 160AAAA(2)(b) limb is not even satisfied');
});

test('chunk 3 pushes this Household past limb 1, and the Non-Super Portfolio starts selling', () => {
  // **A behavioural change, named rather than absorbed into a moved number (P6-8 brief 2, chunk 3).**
  // Before chunk 3 this fixture funded its whole $3,333.34 target out of limb 1 and swept the
  // surplus into the Offset Account; the parcel sat untouched until the stated December sale. With
  // $1,625.00 a month leaving the pay packet, limb 1 offers $2,390.51 — salary $41.67 plus an Age
  // Pension of $2,348.84, no tax — and the Waterfall goes down the limbs for the first time in this
  // fixture's life. There is no Account-Based Pension, so limb 2 is nil and **limb 3 sells**.
  const months = gainWalk(19_500);
  const october = monthAt(months, '2026-10');
  const limb = (name) => october.notes.find((note) => note.limb === name);
  assert.equal(limb('salary').available, 4_167 + 234_884);
  assert.equal(limb('salary').available, 239_051);
  assert.ok(limb('salary').available < 333_334, 'limb 1 still covers the target — the crossing this test is about has gone');
  assert.equal(limb('accountBasedPensionMinimum').drawn, 0, 'this Household holds no Account-Based Pension, so limb 2 must be skipped');
  // The shortfall is what limb 3 sells, to the cent, and the portfolio is where it comes from.
  assert.equal(333_334 - 239_051, 94_283);
  assert.equal(limb('nonSuperPortfolio').drawn, 94_283);
  assert.equal(idaLine(months, '2026-10', 'Non-Super Portfolio sale'), 94_283);
  assert.equal(limb('offsetAccount').drawn, 0, 'the Offset Account is funding this — it should be empty, the surplus that used to fill it is gone');
  // ⚠️ **AND THE CONTROL THAT MAKES THIS A CROSSING RATHER THAN A FACT ABOUT THE FIXTURE.** The same
  // Household with no sacrifice at all funds October entirely out of limb 1 and sells NOTHING, so
  // the disposals above are the sacrifice's doing and not the spending level's.
  const noSacrifice = project(GAIN_SETTINGS, GAIN_HOUSEHOLD, [
    SACRIFICE_SPEND,
    entry('w', 'WORK_PATTERN_CHANGE', '2026-10-01', 'personA', { daysPerWeek: 5, annualSalary: toCents(20_000) }),
  ]);
  const plainLimb = (name) => monthAt(noSacrifice, '2026-10').notes.find((note) => note.limb === name);
  assert.equal(plainLimb('salary').available, 401_551);
  assert.ok(plainLimb('salary').available > 333_334);
  assert.equal(plainLimb('nonSuperPortfolio').drawn, 0);
  // **What it does NOT change: the tax on the gain.** The whole parcel is still disposed of inside
  // FY2026-27 — three monthly slices and the stated December sale — so the year's net capital gain
  // is the same $30,000 it was when December sold the lot, and the charge above is unmoved. Only
  // the timing of the disposals changed, and the annual computation of s 102-5 does not care.
  const proceeds = months
    .filter((each) => each.month >= '2026-10' && each.month <= '2027-06')
    .flatMap((each) => each.lines.filter((line) => line.description.startsWith('Non-Super Portfolio sale')))
    .reduce((total, line) => total + line.amount, 0);
  assert.equal(proceeds, 80_000_00, 'the parcel is no longer wholly disposed of in the year the $30,000 gain is worked out for');
});

test('the two spellings of the add-back, as arithmetic, with the boundary between them', () => {
  // The same fact as the walk above, at the two functions themselves, so the boundary is stated
  // where it can be read without a fixture. `sacrificed` is added to the taxable income of the
  // ASSESSABLE salary; chunk 1 assessed the gross instead.
  const added = (assessable, sacrificed) =>
    rebateIncome({
      taxableIncome: taxableIncomeFromSalary('2026-27', toCents(assessable), toCents(0)),
      reportableSuperContributions: reportableSuperannuationContributions({
        salarySacrificed: toCents(sacrificed),
        otherReportableEmployerContributions: toCents(0),
        personalDeductible: personalDeductibleContributions(toCents(0), { noticeOfIntentAcknowledged: false }),
        excessConcessionalContributions: toCents(0),
      }),
      totalNetInvestmentLoss: toCents(0),
      adjustedFringeBenefitsTotal: toCents(0),
      assessableFhssReleasedAmounts: toCents(0),
    });
  const reconstructed = (assessable, sacrificed) =>
    taxableIncomeFromSalary('2026-27', toCents(assessable + sacrificed), toCents(0));

  // At or above the $1,000 standard deduction the two agree to the cent, whatever is sacrificed —
  // which is the whole of why replacing the mechanism moved no figure in this repo.
  for (const [assessable, sacrificed] of [[1_000, 19_000], [2_000, 18_000], [37_200, 20_000], [57_200, 0]]) {
    assert.equal(added(assessable, sacrificed), reconstructed(assessable, sacrificed), `${assessable} + ${sacrificed}`);
  }
  // Below it they part, by `min($1,000, assessable) − min($1,000, gross)` and never by more than
  // $1,000 — and the add-back is the HIGHER figure, so chunk 1 was the flattering one.
  assert.equal(added(500, 19_500) - reconstructed(500, 19_500), 500_00);
  assert.equal(added(0, 20_000) - reconstructed(0, 20_000), 1_000_00);
  assert.ok(added(500, 19_500) > reconstructed(500, 19_500));
});

// --- P6-8 brief 2, chunk 6 — a mid-year start settles CORRECTLY, and it can settle EITHER WAY ---
//
// Chunk 1 threaded the ASSESSABLE salary into the year's accumulator and pinned it with the
// mutation: had the GROSS gone in, a November start would have been billed in July for eight
// months of dollars that never entered assessable income. That test asserts an INFLOW, and an
// inflow is the shape a reader will generalise from — "a mid-year start always refunds". **It does
// not.** This section is the correctness half, and it is two walks of the SAME arrangement — same
// Person, same $18,000, same November start — whose true-up has the OPPOSITE SIGN, decided by
// nothing but where the two salary levels sit against LITO's $66,667 cut-out.
//
// **THE MECHANISM, WRITTEN ONCE.** The walk accrues each month by annualising the salary IN FORCE
// that month, assessing a whole year of it and reporting a twelfth. The settlement assesses ONE
// year of the salary that was actually assessable. So for a year of four months at a gross `G` and
// eight at a reduced `R`, with `T` the annual tax function:
//
//     accrued  = ⁴⁄₁₂·T(G) + ⁸⁄₁₂·T(R)     — a point on the CHORD between T(R) and T(G)
//     assessed = T(⁴⁄₁₂·G + ⁸⁄₁₂·R)        — the CURVE at the same place
//     true-up  = accrued − assessed, an INFLOW where it is positive
//
// A mid-year start is therefore a Jensen gap and nothing else: **convex T refunds, concave T
// charges**, and the rate scale in this build is both in different places. FY2027-28's effective
// marginal rate, with the 2% Medicare levy included:
//
//     $18,200 – $37,500   14%                      = 16.0%
//     $37,500 – $45,000   14% + LITO's 5c          = 21.0%   ← convex step UP
//     $45,000 – $66,667   30% + LITO's 1.5c        = 33.5%   ← convex step UP
//     above    $66,667    30%, LITO exhausted      = 32.0%   ← ⚠️ CONCAVE step DOWN
//
// The $66,667 point is the one the register's own P4-2 note names: LITO's second-stage taper ENDS
// there, so the effective rate FALLS by 1.5 points and the scale is locally concave. A year that
// straddles it under-accrues.
//
// **THE FIXTURE IS 47 AND SINGLE, AND THAT IS LOAD-BEARING TWICE.** No Age Pension, so chunk 4's
// means-test feedback loop — less pension, less cash swept, a different opening balance next month
// — cannot put a term in any figure below; and no SAPTO, so chunk 2's add-back is inert and the
// year is decided by taxable income alone. `nominalReturn: 0` keeps every balance still. What is
// left is the settlement and the rate scale, which is what this section is about.
//
// **THE AMOUNT IS $15,000 AND THE YEAR IS FY2027-28, WHICH IS A CONSTRAINT, NOT A CHOICE.** The
// walk refuses concessional contributions above the year's general cap, and the only published cap
// is FY2026-27's $32,500; s 960-285(4)'s base amount is a FLOOR, so a TOTAL within $25,000 is
// within every year's cap whatever the index numbers do, and anything above it dated FY2027-28 or
// later raises `MissingIndexNumberError` instead.
//
// ⚠️ **AND THE TOTAL IS WHAT CROSSES THE FLOOR FROM 2026-09-20 (P6-8 brief 3, final chunk).** This
// section used $18,000, which is under $25,000 on its own — and Cass's employer Guarantee is 12% of
// $78,000 = $9,360, so the total is $27,360 and the walk now asks for FY2027-28's cap and refuses
// by name. The room left is $25,000 − $9,360 = $15,640, so the arrangement is $15,000 and every
// figure below is re-derived at it. **The compromise this forces is worth stating: the concavity
// below cannot be reached by a LARGER sacrifice out of a much larger salary** — a $40,000
// arrangement against $150,000 would straddle $66,667 far more violently and is unwalkable in this
// build, twice over. The straddle here is bought with a modest salary instead, and the gap is
// correspondingly small ($46.68); the SIGN is the
// finding, not the size.

const MIDYEAR_SETTINGS = {
  asAtDate: '2027-07-01',
  planningHorizonAge: 49,
  // Pay rising with wages (2026-09-23) is not this fixture's subject: `awote: 0` holds every salary at the figure stated. A proved control: every figure this file asserts is the same at nil on the build before pay rose.
  economicSeries: { cpi: 0.025, pblci: 0.025, awote: 0, mtawe: 0.035 },
  deemingRates: { lower: 0.0175, upper: 0.0375 },
  nominalReturn: 0,
  // Interest on cash (2026-09-23) is not this fixture's subject: stated nil, the control proved byte-identical to the walk before it existed.
  cashInterestRate: 0,
};

/** Cass is 47 — no Age Pension, no SAPTO, no seniors Medicare threshold. $3,000 a fortnight is $78,000. */
const MIDYEAR_HOUSEHOLD = { persons: [person('Cass', '1980-03-15', 3_000)], homeStatus: 'occupied' };

/** $15,000 from 1 November 2027: four months of FY2027-28 at the gross salary and eight at the reduced one. */
const NOVEMBER_SACRIFICE = entry('sac', 'SUPER_CONTRIBUTION', '2027-11-01', 'personA', {
  kind: 'salarySacrificed',
  annualAmount: toCents(15_000),
  interestIndex: 0,
});

/** The gross salary, STATED from the first month of the walk, so the straddle can be moved. */
const statedSalary = (annual) =>
  entry('w', 'WORK_PATTERN_CHANGE', '2027-07-01', 'personA', { daysPerWeek: 5, annualSalary: toCents(annual) });

const midYearWalk = (...extra) => project(MIDYEAR_SETTINGS, MIDYEAR_HOUSEHOLD, [...extra, NOVEMBER_SACRIFICE]);
const taxIn = (months, month) => {
  const found = monthAt(months, month).lines.find((line) => line.description === 'Income tax, Cass');
  return found === undefined ? 0 : found.amount;
};
const settlements = (months) =>
  months.flatMap((each) =>
    each.lines
      .filter((line) => line.description.startsWith('Income tax year-end true-up'))
      .map((line) => `${each.month} ${line.direction} ${line.amount}`),
  );

test('HAND-WORKED — a November start on a $78,000 salary UNDER-accrues, and July CHARGES $46.68', () => {
  const months = midYearWalk();
  // The constraint the amount is chosen under, and it has moved twice. On 2026-09-20 it was the
  // $25,000 FLOOR: $15,000 was the largest round arrangement inside it once Cass's $9,360 Guarantee
  // was counted, and the $18,000 this fixture used before that date was refused by name for want of
  // a cap. From 2026-09-21 FY2027-28 has a derived cap of $32,500 (at this fixture's `awote: 0` as at
  // 3.5%: 2051.10 ÷ 1533.40 is about 1.338, and $25,000 × 1.338 floors to $32,500), so the room is $23,140 and
  // $18,000 walks again. **The fixture keeps $15,000**, which is inside both rooms, so every
  // hand-worked figure below is the one it was written against.
  assert.equal(25_000_00 - Math.round(78_000_00 * 0.12), 15_640_00);
  assert.equal(32_500_00 - Math.round(78_000_00 * 0.12), 23_140_00);
  assert.ok(
    project(MIDYEAR_SETTINGS, MIDYEAR_HOUSEHOLD, [entry('sac', 'SUPER_CONTRIBUTION', '2027-11-01', 'personA', { kind: 'salarySacrificed', annualAmount: toCents(18_000), interestIndex: 0 })]).length > 0,
  );
  // And over the derived cap it is still refused — by the cap's own name, not for want of one.
  assert.throws(
    () => project(MIDYEAR_SETTINGS, MIDYEAR_HOUSEHOLD, [entry('sac', 'SUPER_CONTRIBUTION', '2027-11-01', 'personA', { kind: 'salarySacrificed', annualAmount: toCents(23_141), interestIndex: 0 })]),
    { name: 'ExcessConcessionalContributionsNotModelledError' },
  );

  // **THE FOUR GROSS MONTHS.** $78,000 assessed, less the s 25-130 $1,000 → $77,000 taxable.
  //   brackets   $13,352.00   $26,800 @ 14% ($3,752.00) + $32,000 @ 30% ($9,600.00)
  //   LITO             nil    $77,000 is past the $66,667 cut-out
  //   WATO          −$250.00  the maximum
  //   levy         $1,540.00  2% of $77,000
  //   ⇒ $14,642.00 a year, ÷ 12 = $1,220.1666… → $1,220.17 a month.
  assert.equal(3_752_00 + 9_600_00 - 250_00 + 1_540_00, 14_642_00);
  for (const month of ['2027-07', '2027-08', '2027-09', '2027-10']) {
    assert.equal(taxIn(months, month), 1_220_17, month);
  }

  // **THE EIGHT SACRIFICED MONTHS.** $78,000 − $15,000 = $63,000 assessed, $62,000 taxable.
  //   brackets    $8,852.00   $26,800 @ 14% ($3,752.00) + $17,000 @ 30% ($5,100.00)
  //   LITO           −$70.00  $325.00 − $17,000 × 1.5c — the second-stage taper, nearly exhausted
  //   WATO          −$250.00
  //   levy         $1,240.00  2% of $62,000
  //   ⇒ $9,772.00 a year, ÷ 12 = $814.3333… → $814.33 a month.
  assert.equal(3_752_00 + 5_100_00 - 70_00 - 250_00 + 1_240_00, 9_772_00);
  for (const month of ['2027-11', '2028-01', '2028-06']) {
    assert.equal(taxIn(months, month), 814_33, month);
  }

  // ACCRUED over the year: 4 × $1,220.17 + 8 × $814.33 = $4,880.68 + $6,514.64 = $11,395.32.
  assert.equal(1_220_17 * 4 + 814_33 * 8, 11_395_32);

  // **THE YEAR'S ASSESSABLE SALARY.** Four twelfths of $78,000 and eight of $63,000 —
  // 4 × $6,500.00 + 8 × $5,250.00 = $68,000.00, every twelfth exact, so no rounding residue
  // reaches the settlement. Taxable: $67,000.00.
  //   brackets   $10,352.00   $26,800 @ 14% ($3,752.00) + $22,000 @ 30% ($6,600.00)
  //   LITO             nil    ⚠️ $67,000 is PAST the $66,667 cut-out — the year's average sits just
  //                           above it, where both the accrual levels straddle it
  //   WATO          −$250.00
  //   levy         $1,340.00  2% of $67,000
  //   ⇒ $11,442.00.
  assert.equal(6_500_00 * 4 + 5_250_00 * 8, 68_000_00);
  assert.equal(3_752_00 + 6_600_00 - 250_00 + 1_340_00, 11_442_00);

  // **THE SETTLEMENT IS A CHARGE**, because $11,395.32 was accrued against $11,442.00 owed:
  // $11,442.00 − $11,395.32 = $46.68, and it lands in the July after the year, as an OUTFLOW.
  assert.equal(11_442_00 - 11_395_32, 46_68);
  assert.deepEqual(settlements(months), ['2028-07 outflow 4668']);

  // **AND THE $46.68 IS THE CONCAVITY, ARITHMETICALLY.** The accrual is the chord between
  // T($62,000) and T($77,000) at $67,000: a slope of ($9,772.00 → $14,642.00) over $15,000 is
  // 32.4666…c in the dollar, and 5,000 × that is $1,623.33 above $9,772.00 → $11,395.33, the
  // accrual to the cent the monthly roundings allow. The CURVE climbs faster than that up to
  // $66,667 — 33.5c, being 30c of bracket, 1.5c of LITO taper and 2c of levy — and only then falls
  // to 32c: $4,667 × 33.5c = $1,563.45, then $333 × 32c = $106.56, which is $1,670.01 and lands on
  // $11,442.01 — the assessment to the cent the $66,667 cut-out itself is rounded to.
  assert.equal(Math.round(9_772_00 + 5_000_00 * ((14_642_00 - 9_772_00) / 15_000_00)), 11_395_33);
  assert.equal(Math.round(4_667_00 * 0.335) + Math.round(333_00 * 0.32), 1_670_01);
  assert.equal(9_772_00 + 1_670_01 - 11_442_00, 1, 'the curve and the assessment part company by more than the cut-out’s own rounding');
});

test('THE SIGN IS THE SALARY’S DOING — the same $15,000 from the same November REFUNDS $83.32 below $66,667', () => {
  // The identical arrangement, against a $60,000 stated salary instead of $78,000. Now BOTH levels
  // and the year's average sit below LITO's cut-out, the scale is convex across them, and the same
  // machinery settles the other way. This is the control that says the charge above is the rate
  // scale and not the mid-year start.
  const months = midYearWalk(statedSalary(60_000));

  // FOUR GROSS MONTHS: $60,000 assessed, $59,000 taxable.
  //   brackets    $7,952.00   $26,800 @ 14% ($3,752.00) + $14,000 @ 30% ($4,200.00)
  //   LITO         −$115.00   $325.00 − $14,000 × 1.5c
  //   WATO         −$250.00
  //   levy        $1,180.00   2% of $59,000
  //   ⇒ $8,767.00 a year, ÷ 12 = $730.5833… → $730.58.
  // EIGHT SACRIFICED MONTHS: $45,000 assessed, $44,000 taxable.
  //   brackets    $3,612.00   $25,800 @ 14%
  //   LITO         −$375.00   $700.00 − $6,500 × 5c — the FIRST-stage taper, not the second
  //   WATO         −$250.00
  //   levy           $880.00  2% of $44,000
  //   ⇒ $3,867.00 a year, ÷ 12 = $322.25 exactly.
  assert.equal(3_752_00 + 4_200_00 - 115_00 - 250_00 + 1_180_00, 8_767_00);
  assert.equal(3_612_00 - 375_00 - 250_00 + 880_00, 3_867_00);
  assert.equal(taxIn(months, '2027-07'), 730_58);
  assert.equal(taxIn(months, '2027-11'), 322_25);
  // ACCRUED: 4 × $730.58 + 8 × $322.25 = $2,922.32 + $2,578.00 = $5,500.32.
  assert.equal(730_58 * 4 + 322_25 * 8, 5_500_32);

  // THE YEAR: 4 × $5,000.00 + 8 × $3,750.00 = $50,000.00 assessable, $49,000.00 taxable.
  //   brackets    $4,952.00   $26,800 @ 14% + $4,000 @ 30%
  //   LITO         −$265.00   $325.00 − $4,000 × 1.5c
  //   WATO         −$250.00
  //   levy           $980.00  2% of $49,000
  //   ⇒ $5,417.00, against $5,500.32 accrued: a REFUND of $83.32.
  assert.equal(5_000_00 * 4 + 3_750_00 * 8, 50_000_00);
  assert.equal(3_752_00 + 1_200_00 - 265_00 - 250_00 + 980_00, 5_417_00);
  assert.equal(5_500_32 - 5_417_00, 83_32);
  assert.deepEqual(settlements(months), ['2028-07 inflow 8332']);
});

test('the two settlements are ONE mechanism — the sign follows the straddle, and a whole year settles nothing', () => {
  // Stated as a pair, because either alone reads as a property of mid-year starts.
  const [concave] = settlements(midYearWalk());
  const [convex] = settlements(midYearWalk(statedSalary(60_000)));
  assert.match(concave, /outflow/, 'the $78,000 straddle of $66,667 is no longer under-accruing');
  assert.match(convex, /inflow/, 'the $60,000 walk is no longer over-accruing');

  // ⚠️ **THE TRIPWIRE ON CHUNK 1'S ACCUMULATOR, INDEPENDENTLY OF CHUNK 1'S FIXTURE.** Were the
  // GROSS salary accumulated, the year would be assessed on $78,000 — $14,642.00 against $11,395.32
  // accrued — and July would charge about $3,246.68 rather than $46.68. The sizes are what separate
  // the two readings: a settlement of this magnitude is the year's own concavity; one of THAT
  // magnitude is eight months of dollars that were never assessable.
  assert.equal(14_642_00 - 11_395_32, 3_246_68);
  assert.ok(4668 < 100_00, 'the settlement is the size a gross-salary accumulator would produce');

  // And a sacrifice that ran the WHOLE year settles to nothing at all: the accrual and the
  // assessment are then the same figure on the same salary, and there is no chord to be off.
  assert.deepEqual(
    settlements(project(MIDYEAR_SETTINGS, MIDYEAR_HOUSEHOLD, [
      entry('sac', 'SUPER_CONTRIBUTION', '2027-07-01', 'personA', { kind: 'salarySacrificed', annualAmount: toCents(15_000), interestIndex: 0 }),
    ])),
    [],
  );
});

// --- P6-8 brief 2, chunk 6 — the register rows this build rests on, read by something ----------
//
// ⚠️ **MEASURED FIRST, THEN WRITTEN.** The six §8 rows and the R14 ruling this chunk added to
// `docs/assumptions-register.md` were canaried only after deleting one of them was run against the
// whole suite and failed **ZERO** tests. That is this project's recurring defect — a rule consumed
// by nothing — and the answer it has taken before is to make something read it
// (`test/refusal-names.test.mjs` is the same move for refusal names). What is enforced here is
// **existence and DIRECTION**, not wording: a caveat that does not say which way its error runs is
// half a record, and half a record is what the next author silently flips.
//
// The register is hard-wrapped, so every claim below is matched against a FLATTENED copy — a naive
// grep of the raw text matches nothing and passes vacuously.

const REGISTER_TEXT = readFileSync(join(ROOT, 'docs', 'assumptions-register.md'), 'utf8');
const FLAT_REGISTER = REGISTER_TEXT.replace(/^>\s?/gm, '').replace(/\s+/g, ' ');

test('R14 is in the register, says GROSS in one breath, and says it was taken WITHOUT a source', () => {
  // The ruling's own home, named once.
  assert.equal([...REGISTER_TEXT.matchAll(/#### 4\.3\.1 /g)].length, 1);
  assert.match(REGISTER_TEXT, /#### 4\.3\.1 Salary sacrifice and the income test — RULED \(R14\)/);

  // **SUBJECT + VERB + OBJECT, CONTIGUOUSLY.** A bag of keywords survives the rewrite that matters:
  // "the income test MAY assess the gross salary, which is a question for the caller" keeps every
  // word and reverses the ruling. The claim is pinned as one span, and the hedges that reversal
  // cannot be written without are banned from the ruling's own paragraph.
  assert.match(
    FLAT_REGISTER,
    /RULED \(R14\), 2026-09-19 — the Age Pension INCOME TEST assesses the GROSS salary, unreduced by salary sacrifice\./,
  );
  const ruling = FLAT_REGISTER.slice(FLAT_REGISTER.indexOf('RULED (R14)'), FLAT_REGISTER.indexOf('**Where it is in the code:**'));
  for (const hedge of ['may assess', 'might', 'is a question for', 'either answer']) {
    assert.doesNotMatch(ruling, new RegExp(hedge, 'i'), `R14 has been hedged with "${hedge}" — the ruling is a ruling or it is nothing`);
  }

  // **THE MODALITY OF THE GROUND, which is the half a keyword pin loses.** R14 is a placeholder
  // taken where the register is SILENT, not a finding against a source, and that is exactly what
  // decides whether a future provision has to overturn it or merely supersede it.
  assert.match(ruling, /ABSENCE of a source/);
  assert.match(ruling, /SUPERSEDES this ruling; it does not have to overturn it/);
  // And the direction, in the ruling itself rather than only in §8.
  assert.match(ruling, /UNDERSTATES the Age Pension/);

  // **THE SUPERSEDED SENTENCE SURVIVES, EXACTLY ONCE PER FILE, INSIDE ITS CORRECTION FRAME.** This
  // project keeps the false sentence beside the correction rather than editing it away, so the
  // claim is canaried by COUNT, not by absence — and `src/` must carry NO live copy of it.
  //
  // The comment wraps, so the source is flattened by removing the `//` CONTINUATIONS — a plain
  // whitespace collapse leaves the marker sitting inside the sentence and the match silently fails.
  const projectionSource = readFileSync(join(ROOT, 'src', 'core', 'projection.ts'), 'utf8');
  const flatSource = projectionSource.replace(/\n\s*\/\/ ?/g, ' ').replace(/\s+/g, ' ');
  assert.equal([...flatSource.matchAll(/nobody has ruled/g)].length, 1, 'the walk states "nobody has ruled" more than once, or not at all');
  assert.match(flatSource, /nobody has ruled\* — half of which is still true/);
  assert.match(projectionSource, /R14/);
  assert.match(projectionSource, /O76/);
});

test('the six §8 rows this brief opened are in the register, and every one states its DIRECTION', () => {
  // The row, and the phrase that carries which way its error runs. Deleting a row fails here;
  // deleting the DIRECTION sentence out of a surviving row fails here too, which is the half that
  // matters — see [the confidence-label rule] §8 keeps repeating.
  const rows = {
    O76: [/Centrelink's treatment of salary sacrifice is recorded NOWHERE/, /AGAINST the Household/],
    // ⚠️ **O77 lost its flattering limb on 2026-09-20 (P6-9 chunk 3).** The direction phrase this
    // row was canaried on — *"understates the TAX and so OVERSTATES the Household"* — is now a
    // STRUCK sentence, and the live direction is the conservative one. The pair below reads the
    // live claim; the struck one is counted in the test that follows.
    O77: [/ONE UNDERSTATING gap/, /the one gap left understates the Household's superannuation/],
    O78: [/Carry-forward is not run/, /Direction: conservative/],
    O79: [/ONE computable year/, /the base amount is a FLOOR/i],
    O80: [/is UNREACHABLE, not RIGHT/, /it would OVERSTATE Rebate Income/],
    O81: [/checked at the DOOR only/, /Direction: it OVERSTATES the Household/],
  };
  for (const [id, [subject, direction]] of Object.entries(rows)) {
    const row = REGISTER_TEXT.split('\n').find((line) => line.startsWith(`| ${id} |`));
    assert.ok(row, `§8 has no ${id} row`);
    assert.match(row, subject, `${id} is not the item it was opened as`);
    assert.match(row, direction, `${id} no longer states which way its error runs`);
  }
  // The vacuity control: the same lookup over an id nobody has opened finds nothing, so the loop
  // above is reading rows rather than matching the whole document.
  assert.equal(REGISTER_TEXT.split('\n').find((line) => line.startsWith('| O99 |')), undefined);
});

// ⚠️ **O77 WENT FROM THREE GAPS TO TWO ON 2026-09-20 (P6-8 brief 3), AND THE COUNT IS CANARIED BOTH
// WAYS.** The row's own subject line is asserted above; what is asserted here is that the count, the
// enumeration and the struck sentence agree with each other — a row saying "TWO" that still lists
// three limbs is the drift this pairing exists to catch, and a superseded claim left standing
// unstruck is the other half.
test('O77 counts ONE live gap, lists one, and keeps BOTH closed ones struck through exactly once', () => {
  const row = REGISTER_TEXT.split('\n').find((line) => line.startsWith('| O77 |'));
  assert.ok(row, '§8 has no O77 row');
  // The count in the prose, and the count of the LIVE limbs it enumerates, derived from the row
  // itself. Bounded at the direction sentence, which refers to the limbs again by number and would
  // otherwise be counted as further limbs. A struck limb reads `**~~(ii)` and is deliberately not
  // matched here: this regex counts what is still OPEN.
  const enumeration = row.slice(0, row.indexOf('**The direction'));
  assert.ok(enumeration.length > 500 && row.includes('**The direction'), 'the row no longer states a direction, or the slice above found nothing');
  const limbs = [...enumeration.matchAll(/\*\*\((i+)\)/g)].map(([, numeral]) => numeral);
  assert.deepEqual(limbs, ['iii'], 'O77 enumerates a different number of OPEN gaps than it lists');
  assert.match(row, /\*\*ONE UNDERSTATING gap/);
  assert.doesNotMatch(row, /\*\*TWO UNDERSTATING gaps/, 'the row is back to two gaps');
  assert.doesNotMatch(row, /\*\*Three UNDERSTATING gaps/, 'the row is back to three gaps');
  // ⚠️ **THE NUMERALS ARE NEVER REUSED.** (ii) closed on 2026-09-20 and the over-the-pay limb was
  // briefly renumbered from (ii) to (i) that day, which put three limbs labelled (i) in one row.
  // This is the assertion that stops it happening again: the live limb is (iii) and the two closed
  // ones keep their own numerals, struck in place.
  assert.match(row, /~~\(i\) The Superannuation Guarantee/);
  assert.match(row, /~~\(ii\) Division 293's second 15% is not charged~~/);
  assert.match(row, /THE NUMBERING IS NEVER REUSED/);
  // **THE CLOSED ONES ARE STRUCK, NOT DELETED, AND EACH APPEARS EXACTLY ONCE.** This project keeps a
  // superseded sentence beside its correction, so the claim is canaried by COUNT and not by
  // absence: one occurrence, inside `~~ ~~`, and no live copy anywhere in the register.
  for (const closed of [
    'The Superannuation Guarantee is not contributed by the walk',
    "Division 293's second 15% is not charged",
  ]) {
    assert.equal([...REGISTER_TEXT.matchAll(new RegExp(closed, 'g'))].length, 1, `${closed}: stated more than once, or deleted`);
    assert.match(row, new RegExp(`~~\\((i+)\\) ${closed}~~`), `${closed} is no longer struck through — it reads as live`);
  }
  assert.match(row, /CLOSED 2026-09-20 \(P6-9 chunk 3\)/);
  // And the flattering gap is gone, said in terms — with the superseded claim struck beside it, so
  // a reader who remembers the old row can see it was retired rather than lost.
  // ⚠️ **AND THE REPLACEMENT CLAIM WAS ITSELF TOO BROAD, struck in turn by P6-9 chunk 4.** The row
  // may say what is true of ITS OWN limbs; it may not say the FEATURE has no flattering gap, because
  // the residual it hands to O84 is one. Both struck sentences are counted, so neither can come back
  // as a live claim and neither can be quietly dropped.
  assert.match(row, /~~no gap in this feature now flatters the Household~~/);
  assert.equal([...REGISTER_TEXT.matchAll(/no gap in this feature now flatters the Household/g)].length, 1);
  assert.match(row, /no gap LISTED IN THIS ROW flatters the Household, but the residual O84 — which POCKET pays the Division 293 charge — DOES flatter/);
  assert.match(row, /~~\*\*\(ii\) understates the TAX and so OVERSTATES the Household\*\*/);
  assert.doesNotMatch(row, /the ONLY flattering gap left in this feature/);
  // The residual is named and pointed at its own row rather than folded back into this one.
  assert.match(row, /What is left of it is \*\*O84\*\*/);
});

// ⚠️ **O84's DIRECTION WAS STATED BACKWARDS WHEN THE ROW WAS OPENED, AND P6-9 CHUNK 4 REVERSED IT.**
// The row said this build assesses a released-election Person on MORE assets and so UNDER-states
// their Age Pension, and called that conservative. It is the other way round: the charge comes out
// of ASSESSED Offset cash and leaves EXEMPT superannuation standing (§4.8, the younger-partner
// exemption), so the build assesses FEWER assets and OVER-states the payment — and the Offset does
// not grow in this model while the interest does, so total wealth runs high after the month too.
// This was the one open gap in the superannuation-contribution feature that FLATTERS the Household,
// which makes its direction sentence the single most load-bearing sentence in §8, and §8 is prose
// enforced by nothing unless a test reads it.
//
// ⚠️ **AND P6-10 NARROWED IT ON 2026-09-20 WITHOUT CLOSING IT, which is the harder thing to keep
// true.** The election is performed now, so the row's SUBJECT is struck; ~~but two residuals still
// flatter — an electing Person's first or last partial financial year never settles, and no screen
// states the election at all~~ **— and P6-11 closed the second of those the same day, so ONE
// residual flatters: the partial financial year.** The row and the roll-up must go on saying that
// the feature has a gap running the Household's way, and must now say WHICH ONE, because a row
// that keeps a closed residual alive is as false as one that drops a live one. Closing it because
// closing is tidy is the failure mode this test is pointed at, so the direction of EACH residual is
// pinned separately below.
test('O84 is NARROWED not closed, and the row still says which way what is LEFT of it runs', () => {
  const o84 = REGISTER_TEXT.split('\n').find((line) => line.startsWith('| O84 |'));
  assert.ok(o84, '§8 has no O84 row for the Subdiv 293-B election');
  assert.match(o84, /Subdivision 293-B/);

  // ⚠️ **THE SUBJECT CHANGED ON 2026-09-20 (P6-10 M4), AND THE OLD ONE IS STRUCK IN PLACE.** The row
  // was opened as *"the election ... is not modelled"*; the election is PERFORMED now, so that
  // phrase may appear in this row exactly once and only inside its strike. A row that still read as
  // live would be §8 asserting a negative the engine contradicts — the P3-29 failure, inverted.
  assert.match(o84, /~~is not modelled~~ IS PERFORMED from 2026-09-20 \(P6-10\)/);
  assert.equal([...o84.matchAll(/is not modelled/g)].length, 1, 'O84 states "is not modelled" outside its strike, or has lost the struck copy');
  assert.match(o84, /~~This build holds no field for that election and does not offer it, so it always takes the first route\.~~/);
  assert.match(o84, /NARROWED, NOT CLOSED/);
  // The three things P6-10 actually shipped, so "narrowed" is a claim with a mechanism under it.
  assert.match(o84, /`SuperInterest\.statedReleaseAuthorityDestination` carries the election \(M1\)/);
  assert.match(o84, /NEVER derives one from silence \(M2\)/);
  assert.match(o84, /the whole assessed liability is debited to the one interest they nominated \(M3\)/);

  // **THE DIRECTION, UNCHANGED AND UNSTRUCK, because it is now the direction of the RESIDUALS.**
  // Each limb as one contiguous subject-verb-object rather than a bag of words: a reversal keeps
  // every keyword, which is how this row was written backwards in the first place.
  assert.match(o84, /MORE superannuation and LESS cash/);
  assert.match(o84, /assesses a released-election Person on FEWER assets than they would really hold, which OVER-states their Age Pension/);
  assert.match(o84, /total wealth runs HIGH thereafter/);
  assert.match(o84, /THE DIRECTION ARGUMENT THAT FOLLOWS IS UNCHANGED AND NOT STRUCK/);

  // ⚠️ **THE THREE RESIDUALS, AND THE DIRECTION OF EACH ONE SEPARATELY.** This is the half a
  // "closed" row loses: M3 left two residuals that FLATTER and one that is conservative, and a row
  // that named them without their directions would read as a tidy ending. Each is pinned as its own
  // span, so dropping one — or softening one from FLATTERS to conservative — fails here.
  // ⚠️ **THE COUNT OF FLATTERING RESIDUALS FELL FROM TWO TO ONE ON 2026-09-20 (P6-11), and the old
  // count is struck in place rather than overwritten.** Both halves: the live claim, and the struck
  // one — a row that quietly re-widened to "two" would be claiming a gap that is closed, and one
  // that dropped the strike would lose the fact that it ever was two.
  assert.match(o84, /~~TWO OF THE THREE FLATTER~~ ONE OF THE THREE FLATTERS — IT WAS TWO UNTIL 2026-09-20, WHEN \(iii\) WAS CLOSED BY A CONTROL ON THE HOUSEHOLD FORM \(P6-11\)/);
  assert.equal([...REGISTER_TEXT.matchAll(/TWO OF THE THREE FLATTER/g)].length, 1, 'the two-residual count is stated twice, or has been deleted instead of struck');
  assert.match(o84, /\*\*\(i\) THE PARTIAL FINANCIAL YEAR — FLATTERS\.\*\*/);
  assert.match(o84, /never reaches a\s*settlement at all/);
  assert.match(o84, /\*\*\(ii\) THE TIMING — CONSERVATIVE\.\*\*/);
  // ⚠️ **(iii) IS CLOSED AND ITS HEADING IS STRUCK IN PLACE (P6-11, 2026-09-20).** The numbering is
  // never reused and a closed limb keeps its numeral — O77's rule, learnt the hard way.
  assert.match(o84, /~~\(iii\) THE ELECTION MUST BE STATED, AND NO SCREEN OFFERS IT — FLATTERS\.~~ \(iii\) THE ELECTION MUST BE STATED, AND A SCREEN OFFERS IT FROM 2026-09-20 — CLOSED \(P6-11\)/);
  // And (iii)'s argument, which is the one the close-out had to make rather than assume: silence is
  // a DECLINED election and the engine is right to honour it, and the gap was in the SURFACE. That
  // half is NOT struck — it is why the closure is a control and not a change to the walk.
  assert.match(o84, /\*\*In the ENGINE that is correct and is not a gap\*\*/);
  assert.match(o84, /~~\*\*In the PRODUCT it is a gap\*\*/);
  assert.match(o84, /~~.{0,400}no form box anywhere sets it/s, 'the closed claim is live again, or the strike has been dropped');
  assert.equal([...REGISTER_TEXT.matchAll(/no form box anywhere sets it/g)].length, 1);
  // ⚠️ **AND THE CLOSURE IS A CLAIM ABOUT A FILE, so it is checked against that file.** A register
  // row saying "a screen offers it" is worth nothing if the control is deleted tomorrow and only
  // the prose remains: this is the cross-check that makes the row fail with the code.
  const panel = readFileSync(join(ROOT, 'src', 'app', 'settingsPanel.ts'), 'utf8');
  assert.match(o84, /one single-choice `<select>` per Person\*\* in `src\/app\/settingsPanel\.ts` \(`electionRow`\)/);
  assert.match(panel, /const electionRow = \(person: PersonFormValues\): HTMLElement =>/, 'the register says a screen offers the election and the control is gone');
  assert.match(panel, /for \(const position of electableSuperInterests\(person\)\)/);
  assert.match(panel, /chooser\.value = elected === undefined \? NO_RELEASE_ELECTION : String\(elected\);/,
    'the control pre-selects an election the plan does not state — the derivation O84 exists to refuse');

  // ⚠️ **The two superseded sentences are KEPT, struck, and counted — never deleted.** One copy of
  // the reversed direction in the whole register, inside `~~ ~~`; and the blanket "this is the one
  // open gap" claim struck in the row beside the narrowed one that replaced it. The phrase itself
  // appears TWICE in the row — once struck, once live — so neither a quiet deletion nor a silent
  // widening back to the whole election passes.
  assert.equal([...REGISTER_TEXT.matchAll(/UNDER-states their Age Pension/g)].length, 1);
  assert.match(o84, /~~so this build assesses a released-election Person on MORE assets than they would really hold, which UNDER-states their Age Pension\. That is the conservative direction~~/);
  assert.equal([...o84.matchAll(/THE ONE OPEN GAP IN THE SUPERANNUATION-CONTRIBUTION FEATURE THAT FLATTERS/g)].length, 2);
  assert.match(o84, /~~⚠️ \*\*THIS IS THE ONE OPEN GAP IN THE SUPERANNUATION-CONTRIBUTION FEATURE THAT FLATTERS THE HOUSEHOLD\*\*/);
  assert.match(o84, /⚠️ \*\*WHAT IS LEFT OF THIS ROW IS STILL THE ONE OPEN GAP IN THE SUPERANNUATION-CONTRIBUTION FEATURE THAT FLATTERS THE HOUSEHOLD\*\* — ~~residuals \(i\) and \(iii\) above~~ \*\*residual \(i\) ALONE from 2026-09-20 \(P6-11\), the partial financial year, \(iii\) having been closed by the control described above\*\*/);
  assert.equal([...REGISTER_TEXT.matchAll(/residuals \(i\) and \(iii\) above/g)].length, 1, 'the superseded pair is stated twice, or deleted instead of struck');
  // The word the reversal cannot be written without, counted where it is load-bearing: in the
  // DIRECTION argument, twice and both accounted for — once inside the struck sentence, once in the
  // denial of it. The count is taken on that span alone, because residual (ii) is conservative on
  // its own ground and the close-out column says so again.
  const direction = o84.slice(0, o84.indexOf('THE THREE RESIDUALS'));
  assert.ok(direction.length > 1500, 'the direction slice found nothing — the row has been restructured');
  assert.equal([...direction.matchAll(/conservative/g)].length, 2, 'O84 calls itself conservative somewhere other than the struck sentence and the denial of it');
  assert.match(o84, /Both limbs run the same way and neither is conservative/);

  // **AND THE CLOSE-OUT COLUMN.** The instruction this row carried — *"a second consumer of
  // `superLumpSum.ts`'s refusals"* — was WRONG, and M3 found it wrong. It is struck with the rest
  // rather than deleted, because a discharged instruction that simply vanishes is one the next
  // person writes again.
  assert.match(o84, /~~Needs a field on the Person \(or on the entry\) stating the election/);
  assert.match(o84, /is not a member benefit,\s*so `superLumpSum\.ts` is not a consumer of it \(M3\)/);

  // ⚠️ **THE §8 ROLL-UP.** A direction scattered across nine rows is a direction nobody adds up, so
  // §8 states them all in one paragraph below the table. The paragraph must go on naming what runs
  // the wrong way — a roll-up is exactly where a finding gets quietly lost, because it reads as a
  // summary and summaries are the first thing softened. **It said "the ONE open gap" of the
  // ELECTION; it now says it of the election's two flattering RESIDUALS, and the superseded form is
  // struck beside it.** A reword claiming that nothing in this feature flatters fails here.
  const rollUp = REGISTER_TEXT.split('\n').find((line) => line.startsWith("**THE SUPERANNUATION-CONTRIBUTION FEATURE'S OPEN GAPS"));
  assert.ok(rollUp, '§8 has no direction roll-up for the superannuation-contribution feature');
  assert.match(rollUp, /\*\*O84\*\* the Subdiv 293-B release election — \*\*PERFORMED from 2026-09-20 \(P6-10\), and NARROWED TWICE rather than closed \(P6-11 the same day\)\*\*/);
  // ⚠️ **AND THE ROLL-UP SAYS EXACTLY WHICH ONE IS LEFT, WHICH IS THE POINT OF A ROLL-UP.** After
  // P6-11 there is ONE flattering gap in the whole of this paragraph — residual (i), the partial
  // financial year — and the roll-up must say so in those terms rather than in the plural it
  // inherited. The struck pair beside it keeps the history.
  assert.match(rollUp, /⚠️ \*\*ITS ONE REMAINING FLATTERING RESIDUAL — \(i\), THE PARTIAL FINANCIAL YEAR — IS THE ONLY GAP IN THIS WHOLE ROLL-UP THAT RUNS IN THE HOUSEHOLD'S FAVOUR\*\*/);
  assert.match(rollUp, /Every other item listed above is conservative, neutral, refused by name, or unreachable, and none of them runs the Household's way/);
  assert.match(rollUp, /~~ITS TWO FLATTERING RESIDUALS ARE THE ONE OPEN GAP IN THIS FEATURE THAT RUNS IN THE HOUSEHOLD'S FAVOUR~~/);
  // The residual that remains, named rather than pointed at: a roll-up that says "see the row" is
  // the softening this pairing exists to catch.
  assert.match(rollUp, /first or last PARTIAL financial year never reaches a settlement/);
  // And the closed one, struck exactly once — never live, never gone.
  assert.match(rollUp, /~~NO SCREEN OFFERS THE ELECTION, so only a hand-edited plan file can make it~~/);
  assert.equal([...REGISTER_TEXT.matchAll(/NO SCREEN OFFERS THE ELECTION/g)].length, 1);
  assert.match(rollUp, /~~FLATTERS: it is the ONE open gap in this feature that runs in the Household's favour~~/);
  assert.equal([...rollUp.matchAll(/it is the ONE open gap in this feature that runs in the Household's favour/g)].length, 1,
    'the superseded roll-up claim is stated twice, or has been deleted instead of struck');
  for (const id of ['O76', 'O77(iii)', 'O78', 'O79', 'O80', 'O81', 'O82', 'O83']) {
    assert.ok(rollUp.includes(id), `${id} has no direction in the roll-up`);
  }
  // And the refusal P6-10 added, in the roll-up's own list of what is refused rather than guessed.
  assert.match(rollUp, /Division293ReleaseInsufficientBalanceError/);
});
