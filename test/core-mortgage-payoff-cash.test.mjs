// A `MORTGAGE_PAYOFF` month splits its running cash against what is owed at the month's CLOSE — nil —
// and not against the opening balance. The payoff clears the loan within the tick, so no dollar of
// cash is offsetting it by the time the Waterfall runs: every dollar is `cashAboveLoan`, spent before
// the portfolio and the pension above its minimum. Every other month still splits at the opening
// balance, which is the figure the cash interest is paid above.
//
// The fixture: Val, 71, an Account-Based Pension of $1,000,000 commenced 2020-07-01, spending
// $60,000 a year (about $5,000 a month), a $120,000 loan at 6.0% repaid $1,000 a month and paid off in
// 2026-11. Before this fix the 2026-11 month (fixture A) offered only $32,000 of cash, drew $52,837.18
// of pension above the minimum, and closed holding $118,000 — exactly the loan just cleared.
import test from 'node:test';
import assert from 'node:assert/strict';

import { toCents } from '../dist/core/money.js';
import { project } from '../dist/core/projection.js';

const SETTINGS = {
  asAtDate: '2026-09-16',
  planningHorizonAge: 72,
  economicSeries: { cpi: 0.025, pblci: 0.025, awote: 0.035, mtawe: 0.035 },
  deemingRates: { lower: 0.0175, upper: 0.0375 },
  nominalReturn: 0.065,
};

const entry = (id, type, date, params, owner = 'household') => ({
  id, date, owner, type, params, enabled: true, createdAt: '2026-06-01',
});
const spend = entry('sc', 'SPEND_CHANGE', '2026-09-01', { annualSpend: toCents(60_000) });
const payoff = entry('clear-it', 'MORTGAGE_PAYOFF', '2026-11-01', {});
const lumpSum = (amount) => entry('lump', 'LUMP_SUM_FROM_SUPER', '2026-11-01', { amount: toCents(amount), interestIndex: 0 }, 'personA');

const household = (cash) => ({
  persons: [{
    name: 'Val',
    dateOfBirth: '1955-04-17',
    superInterests: [{ phase: 'accountBasedPension', balance: toCents(1_000_000), statedStreamSettings: { commencementDay: '2020-07-01' } }],
    parcels: [],
    employmentIncomePerFortnight: toCents(0),
    workBonusBalance: toCents(0),
  }],
  homeStatus: 'occupied',
  openingOffsetBalance: toCents(cash),
  mortgage: { openingBalance: toCents(120_000), annualInterestRate: 0.06, monthlyRepayment: toCents(1_000) },
});

const limb = (month, name) => month.notes.find((n) => n.subject === 'waterfall limb' && n.limb === name);
const pensionPaid = (month) =>
  month.lines.filter((l) => l.description === 'Account-Based Pension payment, Val').reduce((a, l) => a + l.amount, 0);
const spent = (month) => month.lines.filter((l) => l.description === 'Household spending').reduce((a, l) => a + l.amount, 0);
const payoffPayment = (month) =>
  month.lines.filter((l) => l.description.startsWith('Mortgage')).reduce((a, l) => a + l.amount, 0);

test('A PAYOFF MONTH WITH MORE CASH THAN THE LOAN — all of it is free cash, and no pension above the minimum is drawn', () => {
  const months = project(SETTINGS, household(150_000), [spend, payoff]);
  const month = months[2];
  assert.equal(month.month, '2026-11');
  assert.equal(month.openingBalance, toCents(150_000));
  assert.equal(month.mortgageBalance, 0);
  // The $150,000 offset the $118,000 owed, so the payoff month's interest is nil and the payout is
  // the balance alone.
  assert.equal(payoffPayment(month), toCents(118_000));
  // The split: the whole of the cash is above the (now nil) loan, and none is offsetting it.
  // Before: cashAboveLoan $32,000, offsetAccount $118,000.
  assert.equal(limb(month, 'cashAboveLoan').available, toCents(150_000));
  assert.equal(limb(month, 'offsetAccount').available, 0);
  // The need is the month's spending ($5,020.62, indexed) + $118,000. Salary's limb (the $66.66 of
  // cash interest) and the minimum still owed ($38,116.78) go first, as always; free cash covers
  // every cent of the rest, so nothing above the minimum is drawn.
  // Before: $52,837.18 above the minimum, and a pension payment of $90,953.96.
  const minimum = limb(month, 'accountBasedPensionMinimum').drawn;
  assert.equal(minimum, toCents(38_116.78));
  assert.equal(limb(month, 'accountBasedPensionAboveMinimum').drawn, 0);
  assert.equal(pensionPaid(month), minimum);
  const fromCash = spent(month) + payoffPayment(month) - limb(month, 'salary').drawn - minimum;
  assert.equal(limb(month, 'cashAboveLoan').drawn, fromCash);
  assert.equal(fromCash, toCents(84_837.18));
  // And the month no longer closes holding the cleared loan's worth of cash (before: $118,000).
  assert.equal(month.closingBalance, toCents(150_000) - fromCash);
  assert.equal(month.closingBalance, toCents(65_162.82));
});

test('A PAYOFF MONTH FUNDED BY A LUMP SUM FROM SUPER — the lump sum counts as free cash too', () => {
  // $50,000 opening cash + $100,000 lump sum, against $118,696.75 owed. The offset priced the
  // payoff's interest on the OPENING cash: ($118,696.75 − $50,000) × 0.005 = $343.48375 → $343.49.
  const months = project(SETTINGS, household(50_000), [spend, payoff, lumpSum(100_000)]);
  const month = months[2];
  assert.equal(month.month, '2026-11');
  assert.equal(month.mortgageBalance, 0);
  assert.equal(payoffPayment(month), toCents(119_040.24));
  // Before: cashAboveLoan $31,303.25, offsetAccount $118,696.75.
  assert.equal(limb(month, 'cashAboveLoan').available, toCents(150_000));
  assert.equal(limb(month, 'offsetAccount').available, 0);
  // Before: $54,767.91 drawn above the minimum.
  const minimum = limb(month, 'accountBasedPensionMinimum').drawn;
  assert.equal(limb(month, 'accountBasedPensionAboveMinimum').drawn, 0);
  assert.equal(limb(month, 'cashAboveLoan').drawn, spent(month) + payoffPayment(month) - limb(month, 'salary').drawn - minimum);
});

test('AN ORDINARY MORTGAGE MONTH STILL SPLITS AT THE OPENING BALANCE — not at what is owed after the repayment', () => {
  const months = project(SETTINGS, household(150_000), [spend, payoff]);
  // 2026-09 opens owing $120,000 and closes owing $119,000; 2026-10 opens owing $119,000.
  assert.deepEqual(months.slice(0, 2).map((m) => m.mortgageBalance), [toCents(119_000), toCents(118_000)]);
  assert.deepEqual(months.slice(0, 2).map((m) => limb(m, 'cashAboveLoan').available), [toCents(30_000), toCents(31_000)]);
  assert.deepEqual(months.slice(0, 2).map((m) => limb(m, 'offsetAccount').available), [toCents(120_000), toCents(119_000)]);
  // And the pension is drawn to its minimum only, as the control of the payoff month above.
  for (const m of months.slice(0, 2)) assert.equal(limb(m, 'accountBasedPensionAboveMinimum').drawn, 0, m.month);
});
