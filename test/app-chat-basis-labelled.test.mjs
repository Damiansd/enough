// plan_ai.md §13 microtask 3 — every figure a tool returns names its basis, today's money by
// default, and a year's total is converted ONCE, after it is added up, at the row's `lastMonth`.
//
// The today's-money figures here are re-derived from `(1 + cpi) ^ (months / 12)` in this file, not
// read off `todaysDollars.ts`, so the lens is checked against a second statement of it.
import test from 'node:test';
import assert from 'node:assert/strict';

import { formatCents } from '../dist/core/money.js';
import { financialYearSummaries, monthFlows } from '../dist/app/chat/tools/financialYearSummary.js';
import { labelledFigure, labelledFinancialYears } from '../dist/app/chat/tools/basisLabelled.js';

// SYNTHETIC: invented, deliberately odd-cent figures, so that rounding twelve converted months
// and rounding one converted year give different cents. Twenty months, 2027-01 to 2028-08: the
// plan is stated as at 2027-01, so every row's `lastMonth` is after it.
const SETTINGS = { asAtDate: '2027-01-01', economicSeries: { cpi: 0.025 } };
const HOUSEHOLD = { persons: [{ name: 'Alex' }] };
const line = (direction, description, amount) => ({ direction, effect: 'cash', description, amount });
const MONTH_NAMES = Array.from({ length: 20 }, (_unused, i) => `${2027 + Math.floor(i / 12)}-${String((i % 12) + 1).padStart(2, '0')}`);
const MONTHS = MONTH_NAMES.map((month, i) => ({
  month,
  lines: [
    line('inflow', 'Salary, Alex', 333_337 + i),
    line('outflow', 'Household spending', 250_001),
    line('outflow', 'Income tax, Alex', 71_119),
    ...(month === '2027-07' ? [line('inflow', 'Income tax year-end true-up, Alex, 2026-27', 999_999)] : []),
  ],
  incomeFromSuper: 0,
  protectedAssets: 12_345_677 + 101 * i,
  assessableAssets: 54_321_099 + 7 * i,
  accessibleAssets: 3_000_001 + i,
}));
const NOMINAL = financialYearSummaries(HOUSEHOLD, MONTHS);

// --- The conversion, stated a second time -------------------------------------------------------

const monthsFromAsAt = (month) => (Number(month.slice(0, 4)) - 2027) * 12 + (Number(month.slice(5)) - 1);
const todaysMoney = (cents, month, cpi = SETTINGS.economicSeries.cpi) => {
  const scaled = cents * (1 / (1 + cpi) ** (monthsFromAsAt(month) / 12));
  return Math.sign(scaled) * Math.round(Math.abs(scaled));
};

/** Every figure in a row as `[path, value]`, in the same order for a nominal row and a labelled one. */
const leaves = (figures, path = '') =>
  Object.entries(figures).flatMap(([key, value]) => (typeof value === 'object' ? leaves(value, `${path}${key}.`) : [[`${path}${key}`, value]]));
const figuresOf = (row) => [...leaves(row.flows, 'flows.'), ...leaves(row.stocks, 'stocks.')];

const TODAY = / \(today’s money\)$/;
const FUTURE = / \(future dollars\)$/;

// --- The label ----------------------------------------------------------------------------------

test('by default every figure is a string in today’s money, and nothing else in the row is converted', () => {
  const rows = labelledFinancialYears(HOUSEHOLD, MONTHS, SETTINGS);
  assert.deepEqual(rows, labelledFinancialYears(HOUSEHOLD, MONTHS, SETTINGS, 'todaysDollars'));
  assert.equal(rows.length, 3);
  rows.forEach((row, index) => {
    const { flows, stocks, ...rest } = NOMINAL[index];
    assert.deepEqual({ ...row, flows: undefined, stocks: undefined }, { ...rest, flows: undefined, stocks: undefined });
    const labelled = figuresOf(row);
    assert.deepEqual(labelled.map(([path]) => path), figuresOf(NOMINAL[index]).map(([path]) => path));
    for (const [path, figure] of labelled) {
      assert.equal(typeof figure, 'string', `${row.financialYear} ${path} is bare`);
      assert.match(figure, /^-?\$[\d,]+\.\d\d \(today’s money\)$/, `${row.financialYear} ${path}`);
    }
  });
});

test('future dollars: the engine’s own cents, labelled as such', () => {
  const rows = labelledFinancialYears(HOUSEHOLD, MONTHS, SETTINGS, 'futureDollars');
  rows.forEach((row, index) => {
    const nominal = figuresOf(NOMINAL[index]);
    figuresOf(row).forEach(([path, figure], i) => {
      assert.equal(figure, `${formatCents(nominal[i][1])} (future dollars)`, `${row.financialYear} ${path}`);
    });
  });
});

// --- The conversion -----------------------------------------------------------------------------

test('today’s money: every figure is its nominal total converted once, at the row’s last month', () => {
  const rows = labelledFinancialYears(HOUSEHOLD, MONTHS, SETTINGS);
  rows.forEach((row, index) => {
    const nominal = figuresOf(NOMINAL[index]);
    figuresOf(row).forEach(([path, figure], i) => {
      assert.equal(figure, `${formatCents(todaysMoney(nominal[i][1], row.lastMonth))} (today’s money)`, `${row.financialYear} ${path}`);
    });
  });
});

test('a year is added up first: converting its months and adding them gives different cents', () => {
  const row = labelledFinancialYears(HOUSEHOLD, MONTHS, SETTINGS).find((r) => r.financialYear === '2027-28');
  const inYear = MONTHS.filter((m) => m.month >= '2027-07' && m.month <= '2028-06');
  const salaries = inYear.map((m) => monthFlows(HOUSEHOLD, m).income.salary);
  const once = todaysMoney(salaries.reduce((a, b) => a + b, 0), '2028-06');
  // Not vacuous: both month-by-month readings differ from the once-converted total in this fixture.
  const eachAtRowMonth = salaries.reduce((total, s) => total + todaysMoney(s, '2028-06'), 0);
  const eachAtOwnMonth = inYear.reduce((total, m, i) => total + todaysMoney(salaries[i], m.month), 0);
  assert.notEqual(eachAtRowMonth, once);
  assert.notEqual(eachAtOwnMonth, once);
  assert.equal(row.flows.income.salary, `${formatCents(once)} (today’s money)`);
});

test('today’s money is not the nominal figure after the plan’s own month, and is at nil inflation', () => {
  const today = labelledFinancialYears(HOUSEHOLD, MONTHS, SETTINGS);
  const future = labelledFinancialYears(HOUSEHOLD, MONTHS, SETTINGS, 'futureDollars');
  today.forEach((row, index) => {
    const nominal = figuresOf(NOMINAL[index]);
    figuresOf(row).forEach(([path, figure], i) => {
      if (nominal[i][1] === 0) return;
      assert.notEqual(figure.replace(TODAY, ''), figuresOf(future[index])[i][1].replace(FUTURE, ''), `${row.financialYear} ${path}`);
    });
  });
  // The control: at nil inflation the two views are the same figures under different labels.
  const flat = { ...SETTINGS, economicSeries: { cpi: 0 } };
  const todayFlat = labelledFinancialYears(HOUSEHOLD, MONTHS, flat).map((row) => figuresOf(row).map(([, f]) => f.replace(TODAY, '')));
  const futureFlat = labelledFinancialYears(HOUSEHOLD, MONTHS, flat, 'futureDollars').map((row) => figuresOf(row).map(([, f]) => f.replace(FUTURE, '')));
  assert.deepEqual(todayFlat, futureFlat);
});

test('a refund year reads negative, and keeps its label', () => {
  const row = labelledFinancialYears(HOUSEHOLD, MONTHS, SETTINGS).find((r) => r.financialYear === '2027-28');
  assert.equal(NOMINAL[1].flows.incomeTax, 12 * 71_119 - 999_999);
  assert.match(row.flows.incomeTax, /^-\$[\d,]+\.\d\d \(today’s money\)$/);
});

test('a single figure is converted at its own month and labelled with the view', () => {
  const basis = { view: 'todaysDollars', asAtDate: SETTINGS.asAtDate, cpi: 0.025 };
  assert.equal(labelledFigure(3_124_000, basis, '2027-01'), '$31,240.00 (today’s money)');
  assert.equal(labelledFigure(3_124_000, basis, '2037-01'), `${formatCents(todaysMoney(3_124_000, '2037-01'))} (today’s money)`);
  assert.equal(labelledFigure(5_890_000, { ...basis, view: 'futureDollars' }, '2037-01'), '$58,900.00 (future dollars)');
});
