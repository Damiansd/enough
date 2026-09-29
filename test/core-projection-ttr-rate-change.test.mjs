// TTR build step 3 (2026-09-23) — **a dated change of a TTR's drawdown rate** (`TTR_RATE_CHANGE`).
//
// The timing rule under test: a change inside a financial year RE-SETS THE REST OF THAT YEAR. SIS
// Reg Sch 7 cl 1-2 fix the year's minimum on its relevant day and reg 6.01(2) (para (b)(ii) of the
// TTR definition) fixes its maximum, 10% of that day's balance; reg 1.06(9A)(a) only floors the
// year's TOTAL. Nothing fixes the amount chosen between them, so the year's figure is re-priced from
// the change: `amount − the old rate's share of the days left + the new rate over the days left`.
// The 10% ceiling stays a cap on the year's total and never on one month.
//
// `nominalReturn: 0`, as in the step-1 file, so every relevant-day balance is the stated $500,000
// until a payment has been made and every figure below is worked by hand from it.
import test from 'node:test';
import assert from 'node:assert/strict';

import { toCents } from '../dist/core/money.js';
import { TTR_PAYMENT_LINE, project, ttrAnnualPaymentRevised } from '../dist/core/projection.js';

const person = (name, dateOfBirth, superInterests) => ({
  name,
  dateOfBirth,
  superInterests,
  parcels: [],
  employmentIncomePerFortnight: toCents(0),
  workBonusBalance: toCents(0),
});

const settings = (over = {}) => ({
  asAtDate: '2026-07-01',
  planningHorizonAge: 64,
  economicSeries: { cpi: 0, pblci: 0.025, awote: 0.035, mtawe: 0.035 },
  deemingRates: { lower: 0.0175, upper: 0.0375 },
  nominalReturn: 0,
  ...over,
});

/** Lee: 62 on 1 July 2026 (born 1 January 1964) — past 60, and the automatic 65 is 2029-01-01. */
const LEE_DOB = '1964-01-01';
const ttr = (streamSettings = { commencementDay: '2025-07-01' }) => ({ phase: 'ttr', balance: toCents(500_000), statedStreamSettings: streamSettings });
const lee = (...interests) => ({ persons: [person('Lee', LEE_DOB, interests)], homeStatus: 'occupied' });
const change = (id, date, interestIndex, drawdownRate) =>
  ({ id, date, owner: 'personA', type: 'TTR_RATE_CHANGE', params: { interestIndex, drawdownRate }, enabled: true, createdAt: '2026-09-23' });

const monthAt = (months, isoMonth) => months.find((m) => m.month === isoMonth);
const paidIn = (month) => month.lines.filter((l) => l.description === `${TTR_PAYMENT_LINE}, Lee`).map((l) => l.amount);
const inYear = (months, from, to) => months.filter((m) => m.month >= from && m.month <= to);
const sum = (values) => values.reduce((a, b) => a + b, 0);

// --- (b) the change is honoured, from its own month --------------------------------------------------

test('a change to 10% dated 1 January re-sets the rest of FY2026-27, and "Income from super" moves from January', () => {
  // No stated rate: the minimum, 4% × $500,000 = $20,000.00, twelfths of $1,666.67 July–December
  // ($10,000.02 paid). From January the year is re-priced over the 181 days 1 Jan–30 Jun 2027:
  //   old share = $20,000.00 × 181/365 = $9,917.808… → $9,917.81
  //   new share = $500,000 × 10% × 181/365 = $24,794.520… → $24,794.52
  //   year      = $20,000.00 − $9,917.81 + $24,794.52 = $34,876.71  (≥ $20,000 minimum, ≤ $50,000)
  // Left: $34,876.71 − $10,000.02 = $24,876.69 over six months, $4,146.115 → $4,146.12 January to
  // May ($20,730.60), and June pays the last $4,146.09.
  const months = project(settings(), lee(ttr()), [change('up', '2027-01-01', 0, 0.1)]);
  const year = inYear(months, '2026-07', '2027-06');
  assert.deepEqual(year.slice(0, 6).map(paidIn), Array(6).fill([toCents(1_666.67)]));
  assert.deepEqual(year.slice(6, 11).map(paidIn), Array(5).fill([toCents(4_146.12)]));
  assert.deepEqual(paidIn(monthAt(months, '2027-06')), [toCents(4_146.09)]);
  assert.equal(sum(year.flatMap(paidIn)), toCents(34_876.71));
  // The figure the table shows moves in the change's own month, and not before it.
  assert.equal(monthAt(months, '2026-12').incomeFromSuper, toCents(1_666.67));
  assert.equal(monthAt(months, '2027-01').incomeFromSuper, toCents(4_146.12));

  // FY2027-28 is set on its own 1 July at the rate then in force: $500,000 − $34,876.71 =
  // $465,123.29 × 10% = $46,512.33, twelfths of $3,876.03.
  assert.deepEqual(paidIn(monthAt(months, '2027-07')), [toCents(3_876.03)]);

  // The control: without the entry, January pays the minimum's twelfth.
  const unchanged = project(settings(), lee(ttr()), []);
  assert.equal(monthAt(unchanged, '2027-01').incomeFromSuper, toCents(1_666.67));
});

test('a change dated mid-month governs from that month, and a change down re-sets the rest lower', () => {
  // Stated 10% ($50,000.00, twelfths $4,166.67). Changed to 4% on 15 January: January's month.
  //   old share = $50,000.00 × 181/365 = $24,794.52; new = $500,000 × 4% × 181/365 = $9,917.81
  //   year = $50,000.00 − $24,794.52 + $9,917.81 = $35,123.29; paid $25,000.02; left $10,123.27
  //   over six: $1,687.21 January to May ($8,436.05), June $1,687.22.
  const months = project(settings(), lee(ttr({ commencementDay: '2025-07-01', statedTtrDrawdownRate: 0.1 })), [change('down', '2027-01-15', 0, 0.04)]);
  const year = inYear(months, '2026-07', '2027-06');
  assert.deepEqual(paidIn(monthAt(months, '2026-12')), [toCents(4_166.67)]);
  assert.deepEqual(year.slice(6, 11).map(paidIn), Array(5).fill([toCents(1_687.21)]));
  assert.deepEqual(paidIn(monthAt(months, '2027-06')), [toCents(1_687.22)]);
  assert.equal(sum(year.flatMap(paidIn)), toCents(35_123.29));
});

// --- (a) per interest, never per Person --------------------------------------------------------------

test('TWO TTR accounts of ONE Person each keep their own pre-dated change — neither is lost to the other', () => {
  // Both changes are dated before the walk, so both are levels in force from month 0. The shared
  // levels machinery keeps one pre-dated entry per type+owner and would drop account 0's 7%.
  //   account 0: 7% × $500,000 = $35,000.00, twelfths $2,916.67
  //   account 1: 9% × $500,000 = $45,000.00, twelfths $3,750.00
  const months = project(settings(), lee(ttr(), ttr()), [change('a0', '2026-01-01', 0, 0.07), change('a1', '2026-03-01', 1, 0.09)]);
  assert.deepEqual(paidIn(monthAt(months, '2026-07')), [toCents(2_916.67), toCents(3_750)]);
  const year = inYear(months, '2026-07', '2027-06');
  assert.equal(sum(year.map((m) => paidIn(m)[0])), toCents(35_000));
  assert.equal(sum(year.map((m) => paidIn(m)[1])), toCents(45_000));
});

test('a change to one account inside the walk leaves the other account at its own rate', () => {
  // Account 1 is changed to 10% from January; account 0 stays at its minimum all year.
  const months = project(settings(), lee(ttr(), ttr()), [change('a1', '2027-01-01', 1, 0.1)]);
  const year = inYear(months, '2026-07', '2027-06');
  assert.equal(sum(year.map((m) => paidIn(m)[0])), toCents(20_000));
  assert.equal(sum(year.map((m) => paidIn(m)[1])), toCents(34_876.71));
});

// --- (c) the 10% is a cap on the YEAR, not on a month ------------------------------------------------

test('THE CAP IS ON THE YEAR: in the walk\'s opening part-year a month may pay more than a twelfth of 10%', () => {
  // The walk opens 1 January 2027. The year's minimum, $20,000.00, is owed in full inside the walk
  // (`annualPensionMinimum`: the months before asAtDate were paid outside it). January–March pay
  // $1,666.67 ($5,000.01). From April, over the 91 days to 30 June:
  //   old share = $20,000.00 × 91/365 = $4,986.30; new = $500,000 × 10% × 91/365 = $12,465.75
  //   year = $20,000.00 − $4,986.30 + $12,465.75 = $27,479.45 — 4% for 274 days and 10% for 91
  //   left $22,479.44 over three: $7,493.15 April and May, June $7,493.14.
  // Each of those is above $4,166.67, a twelfth of the $50,000 ceiling, and lawful: the year's total
  // is well under 10%. A cap measured per month would pay $4,166.67 a month and lose $9,979.43.
  const months = project(settings({ asAtDate: '2027-01-01' }), lee(ttr()), [change('up', '2027-04-01', 0, 0.1)]);
  const year = inYear(months, '2027-01', '2027-06');
  assert.deepEqual(year.slice(3, 5).map(paidIn), Array(2).fill([toCents(7_493.15)]));
  assert.deepEqual(paidIn(monthAt(months, '2027-06')), [toCents(7_493.14)]);
  assert.equal(sum(year.flatMap(paidIn)), toCents(27_479.45));
  assert.ok(sum(year.flatMap(paidIn)) <= toCents(50_000));
});

test('the pure figure: floored at the minimum and at what is already paid, capped at 10% of the year', () => {
  const base = {
    fy: '2026-27', commencementDay: '2025-07-01', balanceOnRelevantDay: toCents(500_000),
    balanceObservedOn: '2026-07-01', minimum: toCents(20_000),
  };
  // From 1 July at 15% (a caller past the door): the whole year re-priced, $75,000 capped at $50,000.
  assert.equal(ttrAnnualPaymentRevised({ ...base, from: '2026-07-01', amount: toCents(20_000), paidSoFar: toCents(0), drawdownRate: 0.15 }), toCents(50_000));
  // From January to nil: $20,000 − $9,917.81 = $10,082.19, below the $20,000 minimum, so the minimum.
  assert.equal(ttrAnnualPaymentRevised({ ...base, from: '2027-01-01', amount: toCents(20_000), paidSoFar: toCents(10_000.02), drawdownRate: 0 }), toCents(20_000));
  // Already paid more than the re-set figure: never below what has left the account.
  assert.equal(ttrAnnualPaymentRevised({ ...base, from: '2027-01-01', amount: toCents(50_000), paidSoFar: toCents(40_000), drawdownRate: 0.04 }), toCents(40_000));
});

// --- the refusals the walk alone can make ------------------------------------------------------------

test('refused by name: a change dated on or after the account\'s conversion day in this scenario', () => {
  const converts = { id: 'conv', date: '2027-01-01', owner: 'personA', type: 'TRIS_EARLY_CONVERSION', params: { interestIndex: 0 }, enabled: true, createdAt: '2026-09-23' };
  // The control: dated the month before, it walks.
  assert.ok(project(settings(), lee(ttr()), [converts, change('early', '2026-12-01', 0, 0.07)]));
  for (const date of ['2027-01-01', '2027-03-01']) {
    assert.throws(
      () => project(settings(), lee(ttr()), [converts, change('late', date, 0, 0.07)]),
      (error) => error instanceof RangeError && /2027-01-01, the day that account becomes a full pension/.test(error.message),
    );
  }
});

test('refused by name: a change on an account that is not a TTR', () => {
  const household = lee({ phase: 'accumulation', balance: toCents(500_000) });
  assert.throws(
    () => project(settings(), household, [change('acc', '2027-01-01', 0, 0.07)]),
    (error) => error instanceof RangeError && /not a transition to retirement pension/.test(error.message),
  );
});
