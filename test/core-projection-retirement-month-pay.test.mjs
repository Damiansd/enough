// THE RETIREMENT MONTH PAYS THE DAYS WORKED (2026-09-23).
//
// A `RETIRE` date is the LAST DAY WORKED. The month it falls in pays the salary in force for the
// days from the 1st up to and including that date, pro-rated by days — the inclusive day count and
// single rounding SIS Reg Sch 7 cl 3 is read with for a pension's commencement year. Before this the
// whole month was nil, so a retirement on 30 June paid no June at all, while super only opened in
// July: a phantom gap of a month's pay.
//
// The share scales the in-force salary itself, both periods, so every reader of it sees one
// pro-rated pay: the cash line, the tax accrual, the Guarantee, the Age Pension income test and the
// Work Bonus. A salary sacrifice takes the same share.
import test from 'node:test';
import assert from 'node:assert/strict';

import { toCents } from '../dist/core/money.js';
import { AGE_PENSION_LINE, monthlyFromFortnightly, project } from '../dist/core/projection.js';

const person = (name, dateOfBirth, fortnightlyPay, over = {}) => ({
  name,
  dateOfBirth,
  superInterests: [{ phase: 'accumulation', balance: toCents(0) }],
  parcels: [],
  employmentIncomePerFortnight: toCents(fortnightlyPay),
  workBonusBalance: toCents(0),
  ...over,
});
const entry = (id, type, date, owner = 'personA', params = {}) => ({ id, date, owner, type, params, enabled: true, createdAt: '2027-01-01' });

/** Nothing grows and nothing earns interest, so every figure below is a pay figure. */
const SETTINGS = {
  asAtDate: '2027-07-01',
  planningHorizonAge: 49,
  // Pay rising with wages (2026-09-23) is not this fixture's subject: `awote: 0` holds every salary at the figure stated. A proved control: every figure this file asserts is the same at nil on the build before pay rose.
  economicSeries: { cpi: 0, pblci: 0.025, awote: 0, mtawe: 0.035 },
  deemingRates: { lower: 0.0175, upper: 0.0375 },
  nominalReturn: 0,
  cashInterestRate: 0,
};
/** Kit is 47 — no Age Pension, no SAPTO. $6,000 a fortnight is $156,000 a year, $13,000 a month. */
const KIT = { persons: [person('Kit', '1980-03-15', 6_000)], homeStatus: 'occupied' };

const at = (months, month) => months.find((m) => m.month === month);
const amountOf = (month, description) => month.lines.filter((l) => l.description === description).reduce((t, l) => t + l.amount, 0);
const GUARANTEE = 'Superannuation Guarantee into superannuation, Kit — Superannuation, Accumulation Phase';

test('A RETIREMENT ON 30 JUNE PAYS THE WHOLE OF JUNE — the phantom gap is closed', () => {
  const working = project(SETTINGS, KIT, []);
  const retired = project(SETTINGS, KIT, [entry('r', 'RETIRE', '2028-06-30')]);
  // June is the month the walk would have paid had Kit not retired, line for line: 30 of 30 days.
  assert.equal(amountOf(at(retired, '2028-06'), 'Salary, Kit'), toCents(13_000));
  assert.deepEqual(at(retired, '2028-06').lines, at(working, '2028-06').lines);
  // And July is the first month with no pay.
  assert.equal(amountOf(at(retired, '2028-07'), 'Salary, Kit'), 0);
  assert.equal(amountOf(at(retired, '2028-07'), GUARANTEE), 0);
});

test('A RETIREMENT ON THE 10th PAYS 10/31 OF THE MONTH — and the tax and Guarantee follow that pay', () => {
  const months = project(SETTINGS, KIT, [entry('r', 'RETIRE', '2028-03-10')]);
  const march = at(months, '2028-03');
  // $156,000 × 10/31 = $50,322.58 a year, a twelfth of which is $4,193.55.
  assert.equal(Math.round(15_600_000 * 10 / 31), 5_032_258);
  assert.equal(amountOf(march, 'Salary, Kit'), toCents(4_193.55));
  assert.equal(amountOf(at(months, '2028-02'), 'Salary, Kit'), toCents(13_000), 'February is a whole month');
  assert.equal(amountOf(at(months, '2028-04'), 'Salary, Kit'), 0);
  // THE TAX is a twelfth of the year's tax on March's own annualised pay, FY2027-28's scale:
  //   taxable $49,322.58 → 26,800 × 14% + 4,322.58 × 30% = $5,048.77
  //   LITO $325 − 1.5% × 4,322.58 = $260.16;  WATO $250;  Medicare 2% = $986.45
  //   ⇒ $5,525.06 a year, ÷ 12 = $460.42.
  assert.equal(toCents(5_048.77) - toCents(260.16) - toCents(250) + toCents(986.45), toCents(5_525.06));
  assert.equal(amountOf(march, 'Income tax, Kit'), toCents(460.42));
  // THE GUARANTEE is 12% of the same pay, less the fund's 15%: $4,193.55 × 12% = $503.23, × 85%.
  assert.equal(amountOf(march, GUARANTEE), Math.round(Math.round(toCents(50_322.58) * 0.12 / 12) * 0.85));
});

test('A SALARY SACRIFICE TAKES THE SAME SHARE of the retirement month — and stays at its stated figure', () => {
  const sacrifice = entry('s', 'SUPER_CONTRIBUTION', '2027-07-01', 'personA', { kind: 'salarySacrificed', annualAmount: toCents(12_000), interestIndex: 0 });
  const months = project(SETTINGS, KIT, [sacrifice, entry('r', 'RETIRE', '2028-03-10')]);
  const line = 'Salary sacrifice into superannuation, Kit — Superannuation, Accumulation Phase';
  // A whole month: $1,000 sacrificed, $850 landing after the fund's 15%.
  assert.equal(amountOf(at(months, '2028-02'), line), toCents(850));
  // March: $12,000 × 10/31 = $3,870.97 a year, a twelfth $322.58, $274.19 landing.
  assert.equal(Math.round(1_200_000 * 10 / 31), 387_097);
  assert.equal(amountOf(at(months, '2028-03'), line), toCents(274.19));
  // And the pay received is the pro-rated gross less the pro-rated sacrifice.
  assert.equal(amountOf(at(months, '2028-03'), 'Salary, Kit'), Math.round((5_032_258 - 387_097) / 12));
});

test('THE INCOME TEST AND THE WORK BONUS READ THE PRO-RATED FORTNIGHT', () => {
  // Ray is 70 and paid $1,500 a fortnight; he last works on 20 November 2026, so November's pay is
  // 20/30 of the month and the income test reads $1,000.00 a fortnight. Hand-worked, on November's
  // own opening assets (the same as a working November's, so $7.06 of deemed income):
  //   $1,000.00 − $300 Work Bonus = $700.00 + $7.06 deemed = $707.06 − $226.00 free area = $481.06
  //   at 50c = $240.53 off the $1,237.70 maximum → $997.17/fn × 26 ÷ 12 = $2,160.535, which the
  //   walk's one fortnight-to-month conversion lands a hair under the half cent: $2,160.53 a month.
  // Paid the whole month it would be $1,618.87; paid nothing, $2,681.68.
  const ray = {
    persons: [person('Ray', '1956-06-15', 1_500)],
    homeStatus: 'occupied',
  };
  const settings = {
    asAtDate: '2026-07-01',
    planningHorizonAge: 71,
    // Pay rising with wages (2026-09-23) is not this fixture's subject: `awote: 0` holds every salary at the figure stated. A proved control: every figure this file asserts is the same at nil on the build before pay rose.
    economicSeries: { cpi: 0, pblci: 0.025, awote: 0, mtawe: 0.035 },
    deemingRates: { lower: 0.0175, upper: 0.0375 },
    nominalReturn: 0.065,
  };
  const spend = entry('sc', 'SPEND_CHANGE', '2026-07-01', 'household', { annualSpend: toCents(30_000) });
  const months = project(settings, ray, [spend, entry('r', 'RETIRE', '2026-11-20', 'household')]);
  const november = at(months, '2026-11');
  assert.equal(amountOf(november, 'Salary, Ray'), toCents(2_166.67), '$39,000 × 20/30 ÷ 12');
  assert.equal(monthlyFromFortnightly(toCents(997.17)), toCents(2_160.53));
  assert.equal(amountOf(november, AGE_PENSION_LINE), toCents(2_160.53));
  assert.equal(toCents(1_237.70) - Math.round((toCents(1_000) - toCents(300) + toCents(7.06) - toCents(226)) / 2), toCents(997.17));
});

test('A RETIREMENT ON THE 1st PAYS ONE DAY, and its Guarantee is credited though the account switched that day', () => {
  // Lou is 62, so a RETIRE switches her accumulation account to an account-based pension ON the
  // RETIRE date. The one day of August she worked still earns a Guarantee: it is for work done
  // before the pension began, so it is credited rather than refused.
  const lou = { persons: [person('Lou', '1965-01-01', 3_100, { superInterests: [{ phase: 'accumulation', balance: toCents(100_000) }] })], homeStatus: 'occupied' };
  const months = project({ ...SETTINGS, planningHorizonAge: 64 }, lou, [entry('r', 'RETIRE', '2027-08-01')]);
  const august = at(months, '2027-08');
  // $80,600 × 1/31 = $2,600.00 a year, a twelfth of which is $216.67.
  assert.equal(amountOf(august, 'Salary, Lou'), toCents(216.67));
  assert.ok(august.lines.some((l) => l.description.startsWith('Superannuation Guarantee into superannuation, Lou')));
  assert.equal(amountOf(at(months, '2027-09'), 'Salary, Lou'), 0);
  assert.ok(months.flatMap((m) => m.notes).some((n) => n.subject === 'pension at retirement' && n.outcome === 'switched'));
});

test('A RETIREMENT BEFORE THE PLAN STARTS pays nothing, even in the walk\'s first month', () => {
  const months = project({ ...SETTINGS, asAtDate: '2027-07-15' }, KIT, [entry('r', 'RETIRE', '2027-07-10')]);
  assert.equal(months[0].month, '2027-07');
  assert.equal(months.reduce((t, m) => t + amountOf(m, 'Salary, Kit'), 0), 0);
});
