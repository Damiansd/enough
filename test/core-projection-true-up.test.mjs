// P4-2 — THE FINANCIAL YEAR AS A FIRST-CLASS BOUNDARY: the year-end true-up.
//
// Chunk 3 accrued income tax monthly on the month's own state and reconciled against nothing, and
// said so. This file defends the settlement that closes it, and the four claims it rests on.
//
//   1. **THE SETTLEMENT ITSELF, IN BOTH DIRECTIONS.** Twelve monthly accruals are reconciled against
//      ONE assessment of the year's actual income, and the difference is a `MonthLine` — an INFLOW
//      where the year was over-accrued and an OUTFLOW where it was under-accrued. One fixture below
//      produces both in the SAME month, for the two Persons of one Household.
//
//   2. ⚠️ **THE DIRECTION OF THE RESIDUAL WAS STATED FALSELY, AND THAT IS WHY THIS ITEM WAS BUILT.**
//      `projection.ts`, TODO.md and the assumptions register all said the monthly accrual ALWAYS
//      over-states tax, because "the rate scale is convex". It is not convex: **LITO's second-stage
//      taper ENDS at $66,667**, so the effective marginal rate FALLS by 1.5 percentage points there
//      and the scale is locally CONCAVE. A within-year rise across that point UNDER-charges. Both
//      halves of that are hand-worked below — the rate scale itself, and the one concavity a
//      `project()` fixture can actually reach today (the family Medicare levy), which under-charges
//      by **$633.30** on a fixture whose sibling Person is over-charged by $8,161.10 at the same
//      time.
//
//   3. **WHICH MONTH CARRIES IT: JULY, both ways.** A refund does not exist on 30 June, and an
//      amount owed is computed from a year that has not ended on 30 June either.
//
//   4. **THE DE-MINIMIS CONVENTION, AND THE PARTIAL-YEAR REFUSAL.** A gap under $1.00 is not
//      settled, because twelve rounded twelfths need not sum to the annual figure they came from
//      (four cents, every year, on a salary that never moved). A financial year the walk entered
//      part-way through is not settled at all, because nothing in this model holds the months
//      before `asAtDate`.
//
// **No `Month` field was added for any of this** — the financial year is reported IN THE LINE'S
// DESCRIPTION — and the shape of `Month` is pinned below so that it stays that way.
import test from 'node:test';
import assert from 'node:assert/strict';

import { toCents } from '../dist/core/money.js';
import {
  TAX_TRUE_UP_LINE,
  TRUE_UP_DE_MINIMIS,
  CAPITAL_GAINS_TAX_LINE,
  project,
} from '../dist/core/projection.js';
import { householdIncomeTax } from '../dist/core/incomeTax.js';
import { netLabourIncomeFromSalary, rebateIncomeFrom, taxableIncome } from '../dist/core/incomeBases.js';

// --- The fixtures ---------------------------------------------------------------------------------

const person = (name, dateOfBirth, fortnightlyPay, over = {}) => ({
  name,
  dateOfBirth,
  // P6-8 brief 3 chunk 2b: the employer Superannuation Guarantee has to land in a NAMED account,
  // so a salaried Person holds one and the walk refuses a salary with nowhere to pay it. A NIL
  // balance is the smallest change that makes the fixture honest: it moves no figure of its own.
  superInterests: [{ phase: 'accumulation', balance: toCents(0) }],
  parcels: [],
  employmentIncomePerFortnight: toCents(fortnightlyPay),
  workBonusBalance: toCents(0),
  ...over,
});
const parcel = (acquired, costBase, marketValue) => ({
  acquired,
  costBase: toCents(costBase),
  marketValue: toCents(marketValue),
});
const entry = (id, type, date, owner, params = {}) => ({
  id,
  date,
  owner,
  type,
  params,
  enabled: true,
  createdAt: '2027-01-01',
});
const sell = (id, date, amount, over = {}) => ({
  id,
  date,
  owner: 'personA',
  type: 'NON_SUPER_INVESTMENT',
  params: { direction: 'sell', amount: toCents(amount), ...over },
  enabled: true,
  createdAt: '2027-01-01',
});

/**
 * **A walk that BEGINS on 1 July**, so FY2027-28 is a complete financial year inside it and the
 * true-up is reachable at all. `nominalReturn: 0` keeps every figure below a tax figure: nothing
 * grows, so no balance movement can contribute a cent to a gap that is meant to be about income.
 */
const FROM_JULY = {
  asAtDate: '2027-07-01',
  planningHorizonAge: 50,
  // Pay rising with wages (2026-09-23) is not this fixture's subject: `awote: 0` holds every salary at the figure stated. A proved control: every figure this file asserts is the same at nil on the build before pay rose.
  economicSeries: { cpi: 0.025, pblci: 0.025, awote: 0, mtawe: 0.035 },
  deemingRates: { lower: 0.0175, upper: 0.0375 },
  nominalReturn: 0,
  // Interest on cash (2026-09-23) is not this fixture's subject: stated nil, the control proved byte-identical to the walk before it existed.
  cashInterestRate: 0,
};
/** The same Settings entered MID-year: FY2027-28 is a partial year here and cannot be assessed. */
const FROM_NOVEMBER = { ...FROM_JULY, asAtDate: '2027-11-01' };

/** Sol is 47 — no Age Pension, no SAPTO, no seniors threshold. $3,000 a fortnight is $78,000 a year. */
const SOLO = { persons: [person('Sol', '1980-03-15', 3_000)], homeStatus: 'occupied' };

const trueUps = (months) =>
  months.flatMap((m) =>
    m.lines
      .filter((l) => l.description.startsWith(TAX_TRUE_UP_LINE))
      .map((l) => `${m.month} ${l.direction} ${l.description} ${l.amount}`),
  );
const accruedIn = (months, who, fy) =>
  months
    .filter((m) => m.month >= `${fy.slice(0, 4)}-07` && m.month <= `${Number(fy.slice(0, 4)) + 1}-06`)
    .flatMap((m) => m.lines)
    .filter((l) => l.description === `Income tax, ${who}`)
    .reduce((total, l) => total + l.amount, 0);
const reconciles = (months) => {
  for (const m of months) {
    const movement = m.lines.reduce(
      (total, l) => total + (l.effect === 'cash' ? (l.direction === 'inflow' ? l.amount : -l.amount) : 0),
      0,
    );
    assert.equal(m.closingBalance, m.openingBalance + movement, `${m.month} does not reconcile`);
  }
};

// --- 1. The settlement, hand-worked ---------------------------------------------------------------

test('HAND-WORKED — six months of work, and $4,714.02 of over-accrued tax comes back in JULY', () => {
  // Sol earns $78,000 a year and retires at the end of 31 December 2027, half way through FY2027-28.
  // (A RETIRE date is the LAST DAY WORKED from 2026-09-23 and its month pays the days up to it, so
  // six whole months of work is a RETIRE dated 31 December; dated 1 January it would pay a day of
  // January too.)
  //
  // WHAT THE WALK CHARGED. Each of the six months it worked annualised the $78,000 in force that
  // month and reported a twelfth of a full year's tax on it:
  //   taxable income          $77,000   ($78,000 less the s 25-130 $1,000)
  //   brackets (FY2027-28)    $13,352   $26,800 @ 14% + $32,000 @ 30%
  //   LITO                        nil   cut out above $66,667
  //   WATO                      −$250   the maximum, on net labour income above the threshold
  //   Medicare levy            $1,540   2% of $77,000
  //   ⇒ $14,642.00 a year, ÷ 12 = $1,220.1666… → $1,220.17 a month, six times = $7,321.02
  //
  // WHAT THE YEAR ACTUALLY OWED. Six months of pay is $39,000 of salary, and one year's assessment
  // of it gives ONE deduction and ONE run up the brackets:
  //   taxable income          $38,000
  //   brackets                 $2,772   $19,800 @ 14%
  //   LITO                      −$675   $700 less 5c in the dollar over $37,500
  //   WATO                      −$250
  //   Medicare levy              $760   2% of $38,000
  //   ⇒ $2,607.00
  //
  // The household was charged $7,321.02 for a year in which it owed $2,607.00.
  const months = project(FROM_JULY, SOLO, [entry('r', 'RETIRE', '2027-12-31', 'personA')]);
  assert.equal(accruedIn(months, 'Sol', '2027-28'), toCents(7_321.02));
  assert.equal(toCents(1_220.17) * 6, toCents(7_321.02));
  assert.equal(toCents(13_352) - toCents(250) + toCents(1_540), toCents(14_642));
  assert.equal(toCents(2_772) - toCents(675) - toCents(250) + toCents(760), toCents(2_607));
  assert.deepEqual(trueUps(months), ['2028-07 inflow Income tax year-end true-up, Sol, 2027-28 471402']);
  assert.equal(toCents(7_321.02) - toCents(2_607), toCents(4_714.02));

  // And the $2,607.00 is not this module's opinion of the year: the SAME figure comes out of
  // `householdIncomeTax` called directly on the year's actual salary, which is the route the
  // true-up takes and a route that does not pass through the walk at all.
  const assessed = annualAssessment('single', [['Sol', 39_000]]);
  assert.equal(assessed.Sol, toCents(2_607));

  reconciles(months);
});

/** One year's assessment on stated ANNUAL salaries, built exactly as `project()` builds it. */
const annualAssessment = (relationship, salaries, fy = '2027-28') => {
  const result = householdIncomeTax({
    fy,
    relationship,
    persons: salaries.map(([name, dollars]) => {
      const salary = toCents(dollars);
      const income = taxableIncome(Math.max(0, salary - toCents(1_000)));
      return {
        name,
        taxableIncome: income,
        rebateIncome: rebateIncomeFrom(income),
        qualifiedForAgePension: false,
        netLabourIncome: netLabourIncomeFromSalary(fy, salary, toCents(0)),
      };
    }),
  });
  return Object.fromEntries(result.persons.map((p) => [p.name, p.netTax]));
};

test('THE MONTH IS JULY, NOT JUNE — a refund that does not exist on 30 June is not spent in it', () => {
  // The year ends on 30 June and the assessment of it cannot be made before it has ended. The line
  // therefore lands in the FIRST MONTH OF THE NEXT YEAR, on the same rule that forbids the walk
  // charging a September gain in the previous July. June carries nothing at all.
  const months = project(FROM_JULY, SOLO, [entry('r', 'RETIRE', '2027-12-31', 'personA')]);
  const june = months.find((m) => m.month === '2028-06');
  const july = months.find((m) => m.month === '2028-07');
  assert.deepEqual(june.lines.filter((l) => l.description.startsWith(TAX_TRUE_UP_LINE)), []);
  assert.equal(july.lines.filter((l) => l.description.startsWith(TAX_TRUE_UP_LINE)).length, 1);
  // It is CASH and it is an INFLOW, so it is money the Waterfall may actually spend in July — the
  // closing balance of that month is $4,714.02 higher than June's opening-to-closing pattern.
  const line = july.lines.find((l) => l.description.startsWith(TAX_TRUE_UP_LINE));
  assert.equal(line.effect, 'cash');
  assert.equal(line.direction, 'inflow');
  assert.ok(line.amount > 0, 'a MonthLine amount is always positive and `direction` carries the sign');
  // Exactly once: the year is settled in one month and never again.
  assert.equal(trueUps(months).length, 1);
});

test('the DESCRIPTION names the financial year, and `Month` still has no financial-year field', () => {
  // The year is in the description because the line is about a year that is NOT the month's own,
  // and nothing else in a `Month` says which year was settled.
  const months = project(FROM_JULY, SOLO, [entry('r', 'RETIRE', '2027-12-31', 'personA')]);
  const line = months.find((m) => m.month === '2028-07').lines.find((l) => l.description.startsWith(TAX_TRUE_UP_LINE));
  assert.equal(line.description, 'Income tax year-end true-up, Sol, 2027-28');
  assert.equal(line.description.endsWith(', 2027-28'), true, 'the settled year, not the reporting month');

  // **The precedent this item was required to keep**: no `Month.financialYear`, because the year is
  // `financialYearContaining(firstDayOf(month))` and a field would be a second spelling of it. This
  // is the structural half — a field added for P4-2 would fail here rather than in a dollar figure.
  // **P4-4's polish added `notes` (2026-09-18) and the pin GREW by one name.** The pin is about a
  // `financialYear` field and not about the count: `notes` carries what did NOT move — the four
  // Waterfall limbs and any register that does not reach the month — and a year is still
  // `financialYearContaining(firstDayOf(month))` and still spelled nowhere on a `Month`.
  // **P5-3 limb 2 added `provenance` (2026-09-18) and the pin GREW by a second name — and this is
  // the one widening that had to be argued rather than noted.** `Month.provenance.stamps` holds
  // financial years. It is NOT `Month.financialYear` under another name, and THIS month is the
  // proof: the stamps are the years the month's FIGURES were computed under, so July 2028 carries
  // TWO of them — `2028-29` for its own accrual and `2027-28` for the year it settles — and a
  // single `financialYearContaining(firstDayOf(month))` field could only ever have said the first.
  assert.deepEqual(Object.keys(months[0]).sort(), [
    'accessibleAssets',
    'appliedEntryIds',
    'assessableAssets',
    // P7-6 (2026-09-19) added a THIRD name, and the pin's point survives it untouched: a
    // per-Person breakdown of the three asset figures carries no financial year either.
    'assetsByPerson',
    // 2026-09-25: the assets test's free area and cut-off this month. Two thresholds, not a year.
    'assetsTestThresholds',
    'closingBalance',
    // 2026-09-24: the Non-Super Portfolio at the close. A balance, not a year.
    'closingNonSuperPortfolio',
    // 2026-09-30 (P3-4b): each Person's concessional cap headroom. Per-Person figures for the
    // month's year; the one year it names is when the oldest unused amount EXPIRES, not the month's.
    'concessionalCapByPerson',
    // 2026-09-23: cash paid out of super this month. A sum of lines, not a year.
    'incomeFromSuper',
    'lines',
    'month',
    'notes',
    'openingBalance',
    'protectedAssets',
    'provenance',
    // 2026-09-23: the Household's combined super at the close. A balance, not a year.
    'superBalance',
  ]);
  assert.equal(months[0].notes.some((n) => 'financialYear' in n), false, 'and no note smuggles one in');
  assert.equal('financialYear' in months[0], false, 'and no field does either');
  assert.equal('fy' in months[0].provenance, false, 'and `provenance` carries a SET of stamps, never the month’s own year');

  // Sol has retired, so July 2028 accrues no tax of its own and the true-up is the only legislated
  // figure in it: the month's ONLY stamp is `2027-28`, in a month whose own year is `2028-29`.
  const july = months.find((m) => m.month === '2028-07');
  assert.deepEqual([...july.provenance.stamps], ['2027-28']);
  // LR-3 (2026-09-30): half a year's pay is under the threshold, so the low income super tax offset
  // for FY2027-28 lands in the same July — a second legislated figure, stamped with the same settled year.
  assert.deepEqual([...july.provenance.registers], ['income tax year-end true-up', 'low income superannuation tax offset']);
  assert.equal(line.provenance.basis, 'legislated');
  assert.equal(line.provenance.register, 'income tax year-end true-up');
  // The stamp on the LINE is the settled year and not the reporting month's year — P5-4, over the
  // one figure in the build where the two disagree.
  assert.equal(line.provenance.fy, '2027-28');
  assert.notEqual(line.provenance.fy, '2028-29');
  assert.deepEqual([...line.provenance.determination], ['assessed once on the twelve months of FY2027-28']);
});

// --- 2. The direction: the scale is NOT convex ------------------------------------------------------

test('⚠️ THE RATE SCALE IS LOCALLY CONCAVE AT $66,667 — the accrual can UNDER-charge, by $15.00', () => {
  // **The claim this replaces, quoted so the correction has something to point at**: that the
  // monthly residual always over-states tax, because "marginal rates are non-decreasing, and LITO's
  // taper only steepens it", so by Jensen `(1/12)·ΣT(yₘ) ≥ T((1/12)·Σyₘ)`.
  //
  // LITO's second-stage taper withdraws 1.5c in the dollar from $45,000 and REACHES NIL AT $66,667
  // ($325 of LITO at $45,000, less 1.5% of $21,667). Above that point it withdraws nothing, so the
  // effective marginal rate FALLS by 1.5 percentage points and the scale is concave across it.
  //
  // Half a year at $45,000 and half at $78,000 — an average of $61,500 — is the smallest legible
  // demonstration:
  //   T($45,000): taxable $44,000 → $3,612 brackets − $375 LITO − $250 WATO + $880 levy = $3,867.00
  //   T($78,000): taxable $77,000 → $13,352      −   nil     − $250      + $1,540    = $14,642.00
  //   T($61,500): taxable $60,500 → $8,402       − $92.50    − $250      + $1,210    = $9,269.50
  //   average of the endpoints $9,254.50, against a true year of $9,269.50 → **−$15.00**
  //
  // And the $15.00 decomposes exactly, which is what makes this the LITO taper and not an accident:
  //   brackets   average $8,482.00 against $8,402.00 → +$80.00   (the brackets ARE convex)
  //   LITO       average $187.50   against $92.50    → −$95.00   (the taper's END is concave)
  //   levy/WATO  linear in this range              →   nil
  //   ⇒ the concavity beats the convexity by $15.00, and the household is UNDER-charged.
  const T = (dollars) => annualAssessment('single', [['X', dollars]]).X;
  assert.equal(T(45_000), toCents(3_867));
  assert.equal(T(78_000), toCents(14_642));
  assert.equal(T(61_500), toCents(9_269.5));
  assert.equal(toCents(3_612) - toCents(375) - toCents(250) + toCents(880), toCents(3_867));
  assert.equal(toCents(13_352) - toCents(250) + toCents(1_540), toCents(14_642));
  assert.equal(toCents(8_402) - toCents(92.5) - toCents(250) + toCents(1_210), toCents(9_269.5));
  // The LITO figures the concavity is made of, each from the published taper.
  assert.equal(toCents(700) - toCents(0.05 * 6_500), toCents(375)); // $44,000, stage one
  assert.equal(toCents(325) - toCents(0.015 * 15_500), toCents(92.5)); // $60,500, stage two
  assert.ok(0.015 * (66_667 - 45_000) >= 325, 'the 1.5c taper exhausts LITO by a taxable income of $66,667');
  // THE SIGN, which is the whole of the correction: the average of the two endpoint years is BELOW
  // the tax on the average year. A convex scale cannot do this.
  assert.equal((T(45_000) + T(78_000)) / 2, toCents(9_254.5));
  assert.equal(toCents(9_254.5) - toCents(9_269.5), toCents(-15));
  assert.ok((T(45_000) + T(78_000)) / 2 < T(61_500), 'the scale is concave across $66,667');
  // The decomposition, asserted rather than asserted-in-prose.
  assert.equal((toCents(3_612) + toCents(13_352)) / 2 - toCents(8_402), toCents(80));
  assert.equal(toCents(92.5) - (toCents(375) + toCents(0)) / 2, toCents(-95));
  assert.equal(toCents(80) - toCents(95), toCents(-15));

  // **Why this is pinned against `householdIncomeTax` and not against a `project()` walk.** When it
  // was written, no entry type in `plan.ts` STATED a salary: `WORK_PATTERN_CHANGE` carried
  // `daysPerWeek` and there was no day rate, and `RETIRE` only stops one. A Person's salary could
  // therefore only move between its stated figure and nil, and for that pair the residual is
  // over-charging at every income and every month count this model can express — so the concavity
  // was real and unreachable through the walk by a salary path, the reachable one being the family
  // Medicare levy below.
  //
  // ⚠️ **That ground went on 2026-09-19**: `WorkPatternChangeParams.annualSalary` states a salary,
  // so a mid-year move between two POSITIVE incomes is now expressible and this IS reachable
  // through `project()`. The figure above is what such a fixture must produce, and P4-9's test
  // immediately below is that fixture. The assertion here is untouched and still stands on
  // `householdIncomeTax`.
  // (Twelve ROUNDED twelfths make it $14.98 rather than $15.00: $1,220.17 × 6 + $322.25 × 6
  // is four cents above the annual figure on one side and two cents below on the other.)
  assert.equal(toCents(1_220.17) * 6 + toCents(322.25) * 6 - T(61_500), toCents(-14.98));
});

test('P4-9 — THE CONCAVITY THROUGH `project()`: a mid-year pay rise is UNDER-accrued, and July collects $14.98', () => {
  // Sol's pay is set by two `WORK_PATTERN_CHANGE`s: $45,000 from 1 July 2027 and $78,000 from
  // 1 January 2028 — the test above's two endpoint years, half a year each, through the walk.
  //
  // WHAT THE WALK ACCRUED. Each month annualises the salary in force and charges a twelfth:
  //   July–December   T($45,000) = $3,867.00 ÷ 12 = $322.25 exactly,      × 6 = $1,933.50
  //   January–June    T($78,000) = $14,642.00 ÷ 12 = $1,220.1666… → $1,220.17, × 6 = $7,321.02
  //   ⇒ $9,254.52 accrued — the average of the two endpoint years' tax ($9,254.50) plus two cents
  //     of rounding.
  //
  // WHAT THE YEAR OWED. The year's ACTUAL salary is 6 × $3,750 + 6 × $6,500 = $61,500, assessed
  // ONCE: taxable $60,500 → $8,402 brackets − $92.50 LITO − $250 WATO + $1,210 levy = $9,269.50.
  //
  // THE TRUE-UP: $9,254.52 accrued − $9,269.50 owed = −$14.98, an OUTFLOW in July 2028. A convex
  // scale could only refund here; the LITO taper's end at $66,667 makes the household owe.
  const work = (id, date, salary) =>
    entry(id, 'WORK_PATTERN_CHANGE', date, 'personA', { daysPerWeek: 5, annualSalary: toCents(salary) });
  const months = project(FROM_JULY, SOLO, [work('w1', '2027-07-01', 45_000), work('w2', '2028-01-01', 78_000)]);
  const fy = months.filter((m) => m.month >= '2027-07' && m.month <= '2028-06');
  const perMonth = (description) => fy.map((m) => m.lines.filter((l) => l.description === description).reduce((t, l) => t + l.amount, 0));

  // The inputs the walk actually used, month by month.
  assert.deepEqual(perMonth('Salary, Sol'), [...Array(6).fill(toCents(3_750)), ...Array(6).fill(toCents(6_500))]);
  assert.deepEqual(perMonth('Income tax, Sol'), [...Array(6).fill(toCents(322.25)), ...Array(6).fill(toCents(1_220.17))]);
  const yearSalary = perMonth('Salary, Sol').reduce((t, a) => t + a, 0);
  assert.equal(yearSalary, toCents(61_500));
  assert.equal(accruedIn(months, 'Sol', '2027-28'), toCents(9_254.52));
  assert.equal(toCents(322.25) * 6 + toCents(1_220.17) * 6, toCents(9_254.52));

  // The year assessed ONCE, on the ACTUAL $61,500 — one line, in July, and never again.
  const T = (dollars) => annualAssessment('single', [['X', dollars]]).X;
  assert.equal(T(yearSalary / 100), toCents(9_269.5));
  assert.deepEqual(trueUps(months), ['2028-07 outflow Income tax year-end true-up, Sol, 2027-28 1498']);
  const line = months.find((m) => m.month === '2028-07').lines.find((l) => l.description.startsWith(TAX_TRUE_UP_LINE));
  assert.deepEqual([...line.provenance.determination], ['assessed once on the twelve months of FY2027-28']);
  // The line IS (tax on the actual year) − (sum of the accruals), to the cent.
  assert.equal(line.amount, T(61_500) - accruedIn(months, 'Sol', '2027-28'));
  assert.equal(toCents(9_269.5) - toCents(9_254.52), toCents(14.98));
  // Not the year-end salary annualised ($78,000 → $14,642.00 − $9,254.52 = $5,387.48), and not the
  // opening one ($45,000 → a $5,387.52 refund): the assessment reads the year, not a month of it.
  assert.notEqual(line.amount, T(78_000) - toCents(9_254.52));
  assert.notEqual(line.amount, toCents(9_254.52) - T(45_000));

  // THE CONCAVITY, FROM THE WALK'S OWN INPUTS. The accrual is, up to rounding, the average of the
  // tax on each half's annualised salary; the assessment is the tax on the average salary. The two
  // differ by the $15.00 the test above decomposes (+$80.00 brackets, −$95.00 LITO), and the line
  // is that $15.00 less the two cents twelve rounded twelfths ran over by.
  const halves = [...new Set(fy.map((m) => m.lines.find((l) => l.description === 'Salary, Sol').amount * 12))];
  assert.deepEqual(halves, [toCents(45_000), toCents(78_000)]);
  const averageOfTaxes = halves.reduce((t, s) => t + T(s / 100), 0) / halves.length;
  const taxOfAverage = T(halves.reduce((t, s) => t + s, 0) / halves.length / 100);
  assert.equal(averageOfTaxes, toCents(9_254.5));
  assert.equal(taxOfAverage, toCents(9_269.5));
  assert.equal(taxOfAverage - averageOfTaxes, toCents(15));
  assert.equal(accruedIn(months, 'Sol', '2027-28') - averageOfTaxes, toCents(0.02));
  assert.equal(line.amount, taxOfAverage - averageOfTaxes - toCents(0.02));

  reconciles(months);
});

test('⚠️ THE UNDER-CHARGE, REACHED THROUGH THE WALK — Tom OWES $633.30 while Rae is refunded $8,161.10', () => {
  // The Medicare levy's FAMILY shade-in (s 8(2)) is the concavity a `project()` fixture can reach:
  // above the family threshold the levy is a flat 2% of the Person's OWN taxable income and stops
  // depending on family income altogether, so the function flattens — and a flattening is a concave
  // corner. Averaging twelve months either side of it under-states the year.
  //
  // Rae earns $195,000 and last works on 31 August 2027; Tom earns $39,000 and does not. (Dated
  // 4 September, as it was before a RETIRE month paid its days worked, it would pay four days of
  // September and move every figure below; the subject is the levy, so the date moved instead.)
  //
  // TOM, THE UNDER-CHARGE. In July and August the month's annualised family income is $234,000, so
  // Tom accrues his full levy: $2,607.00 ÷ 12 = $217.25. From September the walk reads a family
  // income of $39,000 — below the family lower threshold — and the s 8(2) reduction wipes his levy
  // entirely: $1,847.00 ÷ 12 = $153.92. The difference, $63.33, is a twelfth of his $760 levy.
  //   accrued  2 × $217.25 + 10 × $153.92 = $1,973.70
  //   owed     $1,847.00 + $760.00        = $2,607.00   (the year's family income is $69,500 —
  //                                                      Rae's $31,500 taxable plus Tom's $38,000 —
  //                                                      which is above every family threshold)
  //   ⇒ the walk charged Tom TEN MONTHS of levy too little: $633.30.
  //
  // RAE, THE OVER-CHARGE, IN THE SAME MONTH. Two months at $4,711.00 is $9,422.00 accrued against a
  // year's assessment of $1,260.90 — $912.00 after offsets ($1,862 brackets − $700 LITO − $250 WATO)
  // plus a levy of $348.90, shaded because the FAMILY income is what her levy is tested against too.
  const couple = {
    persons: [person('Rae', '1980-03-15', 7_500), person('Tom', '1980-09-20', 1_500)],
    homeStatus: 'occupied',
  };
  const months = project(FROM_JULY, couple, [entry('r', 'RETIRE', '2027-08-31', 'personA')]);
  assert.equal(accruedIn(months, 'Tom', '2027-28'), toCents(1_973.70));
  assert.equal(toCents(217.25) * 2 + toCents(153.92) * 10, toCents(1_973.70));
  assert.equal(toCents(217.25) - toCents(153.92), toCents(63.33));
  assert.equal(accruedIn(months, 'Rae', '2027-28'), toCents(9_422));

  // BOTH DIRECTIONS, IN ONE MONTH, FOR ONE HOUSEHOLD.
  assert.deepEqual(trueUps(months), [
    '2028-07 inflow Income tax year-end true-up, Rae, 2027-28 816110',
    '2028-07 outflow Income tax year-end true-up, Tom, 2027-28 63330',
  ]);

  // Each against the year's own assessment, reached without the walk.
  const owed = annualAssessment('couple', [['Rae', 32_500], ['Tom', 39_000]]);
  assert.equal(owed.Tom, toCents(2_607));
  assert.equal(owed.Rae, toCents(1_260.9));
  assert.equal(toCents(1_973.70) - toCents(2_607), toCents(-633.30));
  assert.equal(toCents(9_422) - toCents(1_260.9), toCents(8_161.10));
  // Tom's gap is the ten unbilled months of levy, less the four cents twelve rounded twelfths of his
  // base assessment ran over by: $633.34 − $0.04.
  assert.equal(toCents(760) - toCents(63.33) * 2, toCents(633.34));
  assert.equal(toCents(153.92) * 12 - toCents(1_847), toCents(0.04));
  assert.equal(toCents(633.34) - toCents(0.04), toCents(633.30));

  reconciles(months);
});

// --- 3. The de-minimis convention -------------------------------------------------------------------

test('A FLAT SALARY IS NEVER TRUED UP — the four-cent residue of twelve roundings is not a settlement', () => {
  // $78,000 all the way through a walk that spans three 1 Julys. The year's true assessment is
  // $14,642.00 and the twelve rounded twelfths sum to $14,642.04, because $1,220.1666… rounds up
  // every month. That four cents is ARITHMETIC and not a reconciliation, and settling it would put
  // a line in every July of every flat-salary walk forever.
  const months = project({ ...FROM_JULY, planningHorizonAge: 51 }, SOLO, []);
  assert.ok(months.length >= 36, `the walk must span several 1 Julys — it is ${months.length} months`);
  assert.deepEqual(trueUps(months), []);
  assert.equal(accruedIn(months, 'Sol', '2027-28'), toCents(14_642.04));
  assert.equal(annualAssessment('single', [['Sol', 78_000]]).Sol, toCents(14_642));
  assert.equal(toCents(14_642.04) - toCents(14_642), toCents(0.04));

  // THE CONVENTION, PINNED BY VALUE. One dollar, in both directions, dropped rather than carried
  // forward. Twelve roundings of a half-cent cannot exceed six cents, so the threshold is two orders
  // of magnitude clear of the residue it absorbs — and far below the smallest real gap this file
  // produces, which is the $77.00 capital-gains refund below.
  assert.equal(TRUE_UP_DE_MINIMIS, toCents(1));
  assert.ok(toCents(0.04) < TRUE_UP_DE_MINIMIS, 'the rounding residue is suppressed');
  assert.ok(toCents(0.005) * 12 < TRUE_UP_DE_MINIMIS, 'twelve half-cents cannot reach the threshold');
  assert.ok(toCents(77) > TRUE_UP_DE_MINIMIS, 'the smallest real gap in this file is settled');
});

// --- 4. The partial financial year is refused --------------------------------------------------------

test('THE FIRST, PARTIAL FINANCIAL YEAR IS NOT SETTLED — and the same walk settles the next one', () => {
  // The walk opens on 1 November 2027, so it holds nothing at all about July–October: not the
  // salary, not the deduction, not a realised gain. Assessing those four months as nil would invent
  // a year's income. The refusal is the same shape as chunk 5b's Sch 7 rule, which will not read a
  // 1 August balance as a 1 July one.
  //
  // Sol last works on 31 December 2027, so FY2027-28 has a real mid-year gap in it — eight months' pay
  // accrued at a full year's rate — and it is REFUSED anyway, because the walk saw only eight of
  // that year's twelve months. The direction is the conservative one: the over-charge stands.
  const months = project(FROM_NOVEMBER, SOLO, [entry('r', 'RETIRE', '2027-12-31', 'personA')]);
  assert.equal(months[0].month, '2027-11');
  assert.equal(accruedIn(months, 'Sol', '2027-28'), toCents(1_220.17) * 2, 'November and December only');
  assert.deepEqual(
    trueUps(months).filter((l) => l.endsWith('2027-28')),
    [],
    'a year the walk entered in November is not a year this model can assess',
  );

  // And the refusal is NARROW: the very next financial year, which this walk sees all twelve months
  // of, is settled — so this is a rule about what the model holds, not a rule that never fires.
  const later = project({ ...FROM_NOVEMBER, planningHorizonAge: 50 }, SOLO, [
    entry('r', 'RETIRE', '2028-12-31', 'personA'),
  ]);
  assert.deepEqual(trueUps(later), ['2029-07 inflow Income tax year-end true-up, Sol, 2028-29 471402']);
});

// --- 5. THE CAPITAL-GAINS REFUND, which chunk 5 deferred to this item BY NAME -------------------------

test('A LOSS REALISED AFTER A CHARGE IS REFUNDED AT YEAR END — $77.00 back in the following July', () => {
  // `chargeCapitalGain` emits a line only where the year's net capital gain has RISEN above what it
  // has already charged, because the register forbids the walk spending a refund before it exists.
  // So a loss realised after a charge in the same year left the household permanently $77.00 poorer
  // than an annual assessment would, and `test/core-non-super-gain-tax.test.mjs` pinned it.
  //
  // This is that hole closed, in the only place a refund can honestly land: the following July.
  //   2027-08  a $50,000 sale realises a $23,750 net capital gain → $77.00 charged
  //            (FY2027-28: ($23,750 − $18,200) × 14% − $700 LITO, Ken having no other income)
  //   2027-10  a $20,000 sale of the high-cost-base parcel realises a $40,000 LOSS, so the YEAR's
  //            net capital gain is nil and no further charge is made
  //   2028-07  the year is assessed: nil taxable income, nil tax, $77.00 accrued → $77.00 back
  const held = [parcel('2015-03-03', 10_000, 200_000), parcel('2026-12-05', 60_000, 20_000)];
  const ken = { persons: [person('Ken', '1978-02-02', 0, { parcels: held })], homeStatus: 'occupied' };
  const months = project({ ...FROM_JULY, planningHorizonAge: 52 }, ken, [
    sell('g', '2027-08-10', 50_000),
    sell('l', '2027-10-20', 20_000, { parcelSelection: 'highest-cost-base-first' }),
  ]);
  assert.deepEqual(
    months.flatMap((m) =>
      m.lines.filter((l) => l.description.startsWith(CAPITAL_GAINS_TAX_LINE)).map((l) => `${m.month} ${l.amount}`),
    ),
    ['2027-08 7700'],
  );
  assert.equal(Math.round(toCents(23_750 - 18_200) * 0.14) - toCents(700), toCents(77));
  assert.deepEqual(trueUps(months), ['2028-07 inflow Income tax year-end true-up, Ken, 2027-28 7700']);

  // **It is the YEAR's gain that is reconciled, not the charge reversed.** A walk with the gain and
  // NO loss is charged the same $77.00 and keeps it: the true-up is nil there, because the year's
  // assessment agrees with what was charged.
  const noLoss = project({ ...FROM_JULY, planningHorizonAge: 52 }, ken, [sell('g', '2027-08-10', 50_000)]);
  assert.deepEqual(trueUps(noLoss), []);

  reconciles(months);
});
