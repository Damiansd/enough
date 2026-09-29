// PAY RISES WITH WAGES (2026-09-23, user ruling).
//
// Every stated salary — `Person.employmentIncomePerFortnight` and a `WORK_PATTERN_CHANGE`'s
// `annualSalary` — is in the wage level of `Settings.asAtDate`, and each month pays it raised to that
// month's wage level by `economicSeries.awote`, through `core/priceLevel.ts`'s one expression:
// `(1 + awote) ^ (months since asAtDate / 12)`. It steps every month, not every July. The basis is
// `asAtDate` and never the entry's own date — `SpendChangeParams.annualSpend`'s precedent, read with
// wages instead of prices. Everything that reads the salary reads the raised figure: the cash line,
// the income tax, the Superannuation Guarantee, the Age Pension income test and the Work Bonus. A
// salary SACRIFICE is not raised (register O88): it stays the dollars stated.
import test from 'node:test';
import assert from 'node:assert/strict';

import { mulCents, toCents } from '../dist/core/money.js';
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

/** Wages at 3.5% and prices at 2.5%, stated apart so a salary raised by the wrong one is visible. */
const SETTINGS = {
  asAtDate: '2027-07-01',
  planningHorizonAge: 50,
  economicSeries: { cpi: 0.025, pblci: 0.025, awote: 0.035, mtawe: 0.035 },
  deemingRates: { lower: 0.0175, upper: 0.0375 },
  nominalReturn: 0,
  cashInterestRate: 0,
};
/** Kit is 47. $6,000 a fortnight is $156,000 a year in July 2027's wages. */
const KIT = { persons: [person('Kit', '1980-03-15', 6_000)], homeStatus: 'occupied' };

const at = (months, month) => months.find((m) => m.month === month);
const amountOf = (month, description) => month.lines.filter((l) => l.description === description).reduce((t, l) => t + l.amount, 0);
const GUARANTEE = 'Superannuation Guarantee into superannuation, Kit — Superannuation, Accumulation Phase';

test('A YEAR ON, THE SALARY IS 3.5% HIGHER — and the tax and the Guarantee are on the raised figure', () => {
  const months = project(SETTINGS, KIT, []);
  // Month 0 is `asAtDate`'s own month: the factor is exactly 1.
  assert.equal(amountOf(at(months, '2027-07'), 'Salary, Kit'), toCents(13_000));
  // 2028-07 is twelve months on: $156,000 × 1.035 = $161,460.00 a year, $13,455.00 a month.
  assert.equal(mulCents(toCents(156_000), 1.035), toCents(161_460));
  assert.equal(amountOf(at(months, '2028-07'), 'Salary, Kit'), toCents(13_455));
  // THE TAX, FY2028-29, hand-worked on the raised salary:
  //   taxable $160,460 → 26,800 × 14% + 90,000 × 30% + 25,460 × 37% = $40,172.20
  //   LITO nil;  WATO $250;  Medicare 2% = $3,209.20  ⇒ $43,131.40 a year, ÷ 12 = $3,594.28.
  assert.equal(toCents(3_752) + toCents(27_000) + toCents(9_420.20), toCents(40_172.20));
  assert.equal(toCents(40_172.20) - toCents(250) + toCents(3_209.20), toCents(43_131.40));
  assert.equal(amountOf(at(months, '2028-07'), 'Income tax, Kit'), toCents(3_594.28));
  // THE GUARANTEE: 12% of $161,460 is $19,375.20 a year, $1,614.60 a month, $1,372.41 after the fund's 15%.
  assert.equal(amountOf(at(months, '2028-07'), GUARANTEE), Math.round(toCents(1_614.60) * 0.85));
});

test('IT STEPS EVERY MONTH, NOT EVERY JULY — each month is the stated figure at its own month', () => {
  const months = project(SETTINGS, KIT, []);
  const salaries = months.map((m) => amountOf(m, 'Salary, Kit'));
  // Twelve different salaries in the first twelve months: a yearly step would give one.
  assert.equal(new Set(salaries.slice(0, 12)).size, 12);
  for (const [index, month] of months.entries()) {
    assert.equal(salaries[index], mulCents(mulCents(toCents(156_000), 1.035 ** (index / 12)), 1 / 12), month.month);
  }
});

test('A WORK_PATTERN_CHANGE SALARY IS IN TODAY’S WAGES — raised from `asAtDate`, not from its own date', () => {
  // $100,000 stated for January 2028, six months after `asAtDate`. Read in TODAY's wages it pays
  // $100,000 × 1.035 ^ (6/12) = $101,734.95 a year that month — the same factor the pay on file gets
  // — and not the $100,000 a reading in the entry's own wages would pay.
  const months = project(SETTINGS, KIT, [entry('w', 'WORK_PATTERN_CHANGE', '2028-01-01', 'personA', { daysPerWeek: 4, annualSalary: toCents(100_000) })]);
  assert.equal(mulCents(toCents(100_000), 1.035 ** (6 / 12)), toCents(101_734.95));
  assert.equal(amountOf(at(months, '2028-01'), 'Salary, Kit'), mulCents(toCents(101_734.95), 1 / 12));
  assert.notEqual(amountOf(at(months, '2028-01'), 'Salary, Kit'), mulCents(toCents(100_000), 1 / 12));
});

test('A SALARY SACRIFICE IS NOT RAISED — the same dollars come out of a rising pay', () => {
  const sacrifice = entry('s', 'SUPER_CONTRIBUTION', '2027-07-01', 'personA', { kind: 'salarySacrificed', annualAmount: toCents(12_000), interestIndex: 0 });
  const plain = project(SETTINGS, KIT, []);
  const months = project(SETTINGS, KIT, [sacrifice]);
  const line = 'Salary sacrifice into superannuation, Kit — Superannuation, Accumulation Phase';
  // $1,000 a month, $850 landing after the fund's 15%, in every month — the pay rising beside it.
  assert.deepEqual([...new Set(months.map((m) => amountOf(m, line)))], [toCents(850)]);
  for (const month of ['2027-07', '2028-01', '2028-07', '2029-06']) {
    assert.equal(amountOf(at(plain, month), 'Salary, Kit') - amountOf(at(months, month), 'Salary, Kit'), toCents(1_000), month);
  }
});

test('THE INCOME TEST AND THE WORK BONUS READ THE RAISED FORTNIGHT', () => {
  // Ray is 70, working, $1,500 a fortnight. Month 0 is identical with and without wage growth, so
  // month 1 opens on identical assets and the ONLY difference the income test can see is the wage:
  // $1,500 × 1.035 ^ (1/12) = $1,504.31, $4.31 more. Past the Work Bonus's $300 every extra dollar
  // is assessed, at 50c, so the pension is $2.155 a fortnight less, which the rate's rounding to the
  // cent takes as $2.15 — $4.66 a month.
  const ray = { persons: [person('Ray', '1956-06-15', 1_500)], homeStatus: 'occupied' };
  const settings = (awote) => ({
    asAtDate: '2026-07-01',
    planningHorizonAge: 71,
    economicSeries: { cpi: 0, pblci: 0.025, awote, mtawe: 0.035 },
    deemingRates: { lower: 0.0175, upper: 0.0375 },
    nominalReturn: 0.065,
  });
  const spend = entry('sc', 'SPEND_CHANGE', '2026-07-01', 'household', { annualSpend: toCents(30_000) });
  const flat = project(settings(0), ray, [spend]);
  const rising = project(settings(0.035), ray, [spend]);
  assert.deepEqual(at(rising, '2026-07'), at(flat, '2026-07'), 'month 0 moved — its wage factor is not 1');
  assert.equal(at(rising, '2026-08').openingBalance, at(flat, '2026-08').openingBalance);
  assert.equal(at(rising, '2026-08').assessableAssets, at(flat, '2026-08').assessableAssets);
  assert.equal(mulCents(toCents(1_500), 1.035 ** (1 / 12)), toCents(1_504.31));
  const fall = amountOf(at(flat, '2026-08'), AGE_PENSION_LINE) - amountOf(at(rising, '2026-08'), AGE_PENSION_LINE);
  assert.equal(fall, monthlyFromFortnightly(toCents(2.15)), `the pension fell by ${fall}c, not by 50c in the dollar of $4.31`);
  assert.ok(fall > 0);
});
