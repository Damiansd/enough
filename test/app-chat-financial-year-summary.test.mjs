// plan_ai.md §13 microtask 2 — the financial-year summariser, pinned on three properties:
//
//   * every flow total is EXACTLY the sum of its months, in nominal cents;
//   * every stock is its year's LAST month's value, never a sum;
//   * one row per financial year, and a year the walk covers only part of is flagged `partial`.
//
// The per-month figures below are classified HERE, by description prefix — which `src/` may not do
// (`test/core-div293-charge.test.mjs`) and a test may — so the summariser's whole-description sets
// are checked against a second, independent reading of the same lines, not against themselves.
import test from 'node:test';
import assert from 'node:assert/strict';

import { project } from '../dist/core/projection.js';
import { DEMO_ENTRIES, DEMO_HOUSEHOLD, DEMO_SETTINGS } from '../dist/app/demoHousehold.js';
import { financialYearSummaries, monthFlows } from '../dist/app/chat/tools/financialYearSummary.js';

const signed = (line, positiveWhen) => (line.direction === positiveWhen ? line.amount : -line.amount);

/** One month's flows, read by prefix and summed as plain integers — independent of the module. */
const flowsByPrefix = (month) => {
  const sum = (test, positiveWhen) =>
    month.lines.filter((line) => test(line.description)).reduce((total, line) => total + signed(line, positiveWhen), 0);
  return {
    income: {
      salary: sum((d) => d.startsWith('Salary, '), 'inflow'),
      interestOnCash: sum((d) => d.startsWith('Interest on cash, '), 'inflow'),
      incomeFromSuper: month.incomeFromSuper,
    },
    agePension: sum((d) => d === 'Age Pension', 'inflow'),
    incomeTax: sum((d) => /^Income tax(?:, | on capital gain, | year-end true-up, )/.test(d), 'outflow'),
    // All four Division 293 lines by their shared prefix: the accrual and the fund's release count
    // out, the true-up either way, and the refund on release comes back in.
    division293Tax: sum((d) => d.startsWith('Division 293 tax'), 'outflow'),
    spending: {
      household: sum((d) => d === 'Household spending', 'outflow'),
      oneOffExpenses: sum((d) => d === 'One-off expense', 'outflow'),
      mortgageRepayments: sum((d) => d.startsWith('Mortgage repayment — '), 'outflow'),
    },
    unfundedShortfall: sum((d) => d === 'Unfunded shortfall', 'inflow'),
  };
};

const addFlows = (a, b) => ({
  income: {
    salary: a.income.salary + b.income.salary,
    interestOnCash: a.income.interestOnCash + b.income.interestOnCash,
    incomeFromSuper: a.income.incomeFromSuper + b.income.incomeFromSuper,
  },
  agePension: a.agePension + b.agePension,
  incomeTax: a.incomeTax + b.incomeTax,
  division293Tax: a.division293Tax + b.division293Tax,
  spending: {
    household: a.spending.household + b.spending.household,
    oneOffExpenses: a.spending.oneOffExpenses + b.spending.oneOffExpenses,
    mortgageRepayments: a.spending.mortgageRepayments + b.spending.mortgageRepayments,
  },
  unfundedShortfall: a.unfundedShortfall + b.unfundedShortfall,
});

/** `2026-09` → `2026-27`, by string arithmetic, not through `core/financialYear.ts`. */
const fyOf = (month) => {
  const year = Number(month.slice(0, 4));
  const start = month.slice(5) >= '07' ? year : year - 1;
  return `${start}-${String((start + 1) % 100).padStart(2, '0')}`;
};

const monthsOfYear = (months, fy) => months.filter((month) => fyOf(month.month) === fy);

// --- The three properties, over any walk --------------------------------------------------------

const assertFlowsAreSums = (household, months, rows) => {
  for (const month of months) assert.deepEqual(monthFlows(household, month), flowsByPrefix(month), `month ${month.month}`);
  for (const row of rows) {
    const expected = monthsOfYear(months, row.financialYear).map(flowsByPrefix).reduce(addFlows);
    assert.deepEqual(row.flows, expected, `flows of ${row.financialYear}`);
  }
};

const assertStocksAreLastMonth = (months, rows) => {
  for (const row of rows) {
    const last = monthsOfYear(months, row.financialYear).at(-1);
    assert.equal(row.lastMonth, last.month, `last month of ${row.financialYear}`);
    assert.deepEqual(
      row.stocks,
      { protectedAssets: last.protectedAssets, assessableAssets: last.assessableAssets, accessibleAssets: last.accessibleAssets },
      `stocks of ${row.financialYear}`,
    );
  }
};

const assertOneRowPerYear = (months, rows) => {
  const years = [...new Set(months.map((month) => fyOf(month.month)))];
  assert.deepEqual(rows.map((row) => row.financialYear), years);
  for (const row of rows) {
    const inYear = monthsOfYear(months, row.financialYear);
    assert.equal(row.monthsCovered, inYear.length, `months in ${row.financialYear}`);
    assert.equal(row.firstMonth, inYear[0].month);
    assert.equal(row.partial, inYear.length < 12, `partial flag of ${row.financialYear}`);
  }
};

// --- The demo household -------------------------------------------------------------------------

const DEMO_MONTHS = project(DEMO_SETTINGS, DEMO_HOUSEHOLD, DEMO_ENTRIES);
const DEMO_ROWS = financialYearSummaries(DEMO_HOUSEHOLD, DEMO_MONTHS);

test('demo: every flow total is exactly the sum of its months', () => {
  assertFlowsAreSums(DEMO_HOUSEHOLD, DEMO_MONTHS, DEMO_ROWS);
});

test('demo: the flow check is not vacuous — every kind the demo walk has is non-zero somewhere', () => {
  const total = DEMO_ROWS.map((row) => row.flows).reduce(addFlows);
  for (const [kind, figure] of Object.entries({ ...total.income, agePension: total.agePension, incomeTax: total.incomeTax, household: total.spending.household, oneOff: total.spending.oneOffExpenses })) {
    assert.ok(figure > 0, `${kind} is nil across the whole demo walk`);
  }
  // The demo's year-end true-ups are refunds, so they are the case that tests the sign. Two since
  // Div 119 (LR-1 slice 3, 2026-09-29): FY2034-35's minimum tax comes back in July 2035, because
  // Dana is paid the Age Pension in that year (s 119-15).
  const refunds = DEMO_MONTHS.flatMap((month) => month.lines).filter((line) => line.description.startsWith('Income tax year-end true-up, '));
  assert.deepEqual(refunds.map((line) => line.direction), ['inflow', 'inflow']);
  assert.deepEqual(refunds.map((line) => line.description).at(-1), 'Income tax year-end true-up, Dana, 2034-35');
});

test('demo: every stock is its year\'s last month, not a sum', () => {
  assertStocksAreLastMonth(DEMO_MONTHS, DEMO_ROWS);
});

test('demo: one row per financial year; the opening and closing part-years are flagged partial', () => {
  assertOneRowPerYear(DEMO_MONTHS, DEMO_ROWS);
  assert.deepEqual(DEMO_ROWS[0], { ...DEMO_ROWS[0], financialYear: '2026-27', firstMonth: '2026-09', monthsCovered: 10, partial: true });
  assert.deepEqual(DEMO_ROWS.at(-1), { ...DEMO_ROWS.at(-1), financialYear: '2067-68', lastMonth: '2068-05', monthsCovered: 11, partial: true });
  assert.ok(DEMO_ROWS.slice(1, -1).every((row) => row.monthsCovered === 12 && !row.partial));
  assert.equal(DEMO_ROWS.length, 42);
});

// --- A small hand-built fixture -----------------------------------------------------------------
//
// SYNTHETIC: every figure here is invented to make the totals hand-checkable, and none is a claim
// about any household. Sixteen months, 2027-05 to 2028-08: two of 2026-27, all of 2027-28, two of
// 2028-29. Each month carries the same recurring lines, a Division 293 accrual among them; one-off
// lines land in 2027-28 and 2028-29, an unfunded shortfall among them; and two decoy lines per month
// that must NOT be counted as any flow.

const HOUSEHOLD = { persons: [{ name: 'Alex' }, { name: 'Blair' }] };
const line = (direction, description, amount, effect = 'cash') => ({ direction, effect, description, amount });
const MONTH_NAMES = Array.from({ length: 16 }, (_unused, i) => {
  const index = 4 + i; // May 2027 is month 4 of 2027, zero-based
  return `${2027 + Math.floor(index / 12)}-${String((index % 12) + 1).padStart(2, '0')}`;
});
const EXTRA = {
  '2027-07': [line('inflow', 'Income tax year-end true-up, Alex, 2026-27', 30_000), line('outflow', 'Division 293 tax year-end true-up, Alex, 2026-27', 5_000)],
  '2027-10': [line('outflow', 'One-off expense', 2_500_000)],
  '2027-11': [line('inflow', 'Unfunded shortfall', 400_000)],
  '2028-02': [line('outflow', 'Income tax on capital gain, Blair', 150_000)],
  '2028-06': [line('inflow', 'Unfunded shortfall', 900_000)],
  '2028-07': [line('outflow', 'Income tax year-end true-up, Alex, 2027-28', 45_000)],
};
const FIXTURE = MONTH_NAMES.map((month, i) => ({
  month,
  lines: [
    line('inflow', 'Salary, Alex', 500_000),
    line('inflow', 'Interest on cash, Blair', 1_000),
    line('inflow', 'Age Pension', 20_000),
    line('outflow', 'Income tax, Alex', 100_000),
    line('outflow', 'Household spending', 300_000),
    line('outflow', 'Mortgage repayment — interest', 40_000),
    line('outflow', 'Mortgage repayment — principal', 60_000),
    line('inflow', 'Non-Super Portfolio sale, Alex', 999_999),
    line('outflow', 'Division 293 tax, Alex', 777),
    line('inflow', 'Investment growth, Alex — Account-Based Pension', 12_345, 'wealth'),
    ...(EXTRA[month] ?? []),
  ],
  incomeFromSuper: 70_000,
  protectedAssets: 10_000_000 + i,
  assessableAssets: 20_000_000 + 10 * i,
  accessibleAssets: 5_000_000 + 100 * i,
}));
const FIXTURE_ROWS = financialYearSummaries(HOUSEHOLD, FIXTURE);

test('fixture: the three properties hold', () => {
  assertFlowsAreSums(HOUSEHOLD, FIXTURE, FIXTURE_ROWS);
  assertStocksAreLastMonth(FIXTURE, FIXTURE_ROWS);
  assertOneRowPerYear(FIXTURE, FIXTURE_ROWS);
});

test('fixture: the rows, written out by hand', () => {
  const flows = (months, { tax, div293 = 0, oneOff, shortfall = 0 }) => ({
    income: { salary: 500_000 * months, interestOnCash: 1_000 * months, incomeFromSuper: 70_000 * months },
    agePension: 20_000 * months,
    incomeTax: 100_000 * months + tax,
    division293Tax: 777 * months + div293,
    spending: { household: 300_000 * months, oneOffExpenses: oneOff, mortgageRepayments: 100_000 * months },
    unfundedShortfall: shortfall,
  });
  const stocks = (i) => ({ protectedAssets: 10_000_000 + i, assessableAssets: 20_000_000 + 10 * i, accessibleAssets: 5_000_000 + 100 * i });
  assert.deepEqual(FIXTURE_ROWS, [
    { financialYear: '2026-27', firstMonth: '2027-05', lastMonth: '2027-06', monthsCovered: 2, partial: true, flows: flows(2, { tax: 0, oneOff: 0 }), stocks: stocks(1) },
    // + $1,500 capital-gain tax, − $300 true-up refund, + $50 Division 293 owed, + the $25,000
    // one-off, and $4,000 + $9,000 of shortfall that is in no income figure above.
    { financialYear: '2027-28', firstMonth: '2027-07', lastMonth: '2028-06', monthsCovered: 12, partial: false, flows: flows(12, { tax: 120_000, div293: 5_000, oneOff: 2_500_000, shortfall: 1_300_000 }), stocks: stocks(13) },
    { financialYear: '2028-29', firstMonth: '2028-07', lastMonth: '2028-08', monthsCovered: 2, partial: true, flows: flows(2, { tax: 45_000, oneOff: 0 }), stocks: stocks(15) },
  ]);
});

test('an empty walk has no rows', () => {
  assert.deepEqual(financialYearSummaries(HOUSEHOLD, []), []);
});

// --- An unfunded shortfall is not income --------------------------------------------------------
//
// The walk writes `Unfunded shortfall` as an INFLOW so its cash reconciles, which is exactly how an
// income total could come to include it and make a plan that runs out look like it is paid for.

test('a shortfall is its own figure and is in no income or spending total', () => {
  const month = { month: '2030-03', lines: [line('inflow', 'Unfunded shortfall', 1_234_500)], incomeFromSuper: 0, protectedAssets: 0, assessableAssets: 0, accessibleAssets: 0 };
  assert.deepEqual(monthFlows(HOUSEHOLD, month), {
    income: { salary: 0, interestOnCash: 0, incomeFromSuper: 0 },
    agePension: 0,
    incomeTax: 0,
    division293Tax: 0,
    spending: { household: 0, oneOffExpenses: 0, mortgageRepayments: 0 },
    unfundedShortfall: 1_234_500,
  });
});

// --- Division 293, counted once whoever pays it -------------------------------------------------
//
// Real walks, from `test/core-division293-release-charge.test.mjs`'s Val (SYNTHETIC: $10,000 a
// fortnight, one accumulation interest). The same Val twice: electing nothing, and electing a
// release from super. The monthly accrual is $390 ($4,680 a year) in both, and the settlement is the
// July after a full year. The tax is the same in both walks, and the summariser must say so:
//
//   * electing nothing: accruals, then a cash true-up of the gap (none when the year was flat);
//   * electing a release: accruals, then in July the whole accrual REFUNDED and the settled
//     liability RELEASED from the fund. Counting the release without the refund is the tax twice.

const VAL_SETTINGS = {
  asAtDate: '2026-07-01',
  planningHorizonAge: 52,
  economicSeries: { cpi: 0.025, pblci: 0.025, awote: 0, mtawe: 0.035 },
  deemingRates: { lower: 0.0175, upper: 0.0375 },
  nominalReturn: 0.065,
  cashInterestRate: 0,
};
const valHousehold = (interestOver) => ({
  persons: [{
    name: 'Val',
    dateOfBirth: '1976-05-10',
    superInterests: [{ phase: 'accumulation', balance: 30_000_000, ...interestOver }],
    parcels: [],
    employmentIncomePerFortnight: 1_000_000,
    workBonusBalance: 0,
  }],
  homeStatus: 'occupied',
});
const valEntries = (stopsWork) => [
  { id: 'spend', date: '2026-07-01', owner: 'household', type: 'SPEND_CHANGE', params: { annualSpend: 6_000_000 }, enabled: true, createdAt: '2026-01-01' },
  { id: 'stop', date: stopsWork, owner: 'personA', type: 'WORK_PATTERN_CHANGE', params: { daysPerWeek: 0, annualSalary: 0 }, enabled: true, createdAt: '2026-01-01' },
];
const ELECTS = { statedReleaseAuthorityDestination: 'division293' };

const div293ByYear = (household, months) =>
  Object.fromEntries(financialYearSummaries(household, months).map((row) => [row.financialYear, row.flows.division293Tax]));

for (const [label, stopsWork, expected] of [
  // A full year of $390 accruals settled at exactly $4,680: nothing to true up, and for the
  // elector a $4,680 refund against a $4,680 release.
  ['a flat year', '2027-07-01', { '2026-27': 468_000, '2027-28': 0 }],
  // She stops in January: six accruals, $2,340, against a settled liability of nil (half a year's
  // salary is under the threshold). Electing nothing, a $2,340 cash refund; electing a release, the
  // $2,340 accrual refunded and nothing released. Nil tax overall, both ways.
  ['a year that settles at nil', '2027-01-01', { '2026-27': 234_000, '2027-28': -234_000 }],
]) {
  test(`Division 293, ${label}: the same tax whether or not the fund pays it`, () => {
    const control = project(VAL_SETTINGS, valHousehold({}), valEntries(stopsWork));
    const elected = project(VAL_SETTINGS, valHousehold(ELECTS), valEntries(stopsWork));
    // Not vacuous: the elector's July really has the refund, and a release when a liability settled.
    const july = elected.find((m) => m.month === '2027-07').lines.map((l) => l.description);
    assert.ok(july.includes('Division 293 tax accrual refunded on release, Val, 2026-27'));
    assert.equal(july.includes('Division 293 tax released from superannuation, Val, 2026-27'), expected['2026-27'] === 468_000);
    assert.deepEqual(div293ByYear(valHousehold({}), control), expected, 'electing nothing');
    assert.deepEqual(div293ByYear(valHousehold(ELECTS), elected), expected, 'electing a release');
    for (const [household, months] of [[valHousehold({}), control], [valHousehold(ELECTS), elected]]) {
      assertFlowsAreSums(household, months, financialYearSummaries(household, months));
    }
  });
}
