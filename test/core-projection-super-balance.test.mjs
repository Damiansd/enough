// **`Month.superBalance` — the Household's combined superannuation at the month's close.**
//
// Every interest of every Person, whatever its phase. The fixture is built so the figure has an
// independent derivation: `nominalReturn: 0`, no salary (so no Guarantee), no fees stated, and every
// interest either tax-exempt (Account-Based Pension) or earning nothing to tax. Then the only thing
// that moves any super balance is a payment OUT of it, and every such payment is a line — so
//
//     superBalance(month n) === Σ stated balances − Σ super payments in months 0..n
//
// holds to the cent. A total that dropped any one interest breaks it from month 0; a total that
// missed a payment breaks it from the month of the payment.
import test from 'node:test';
import assert from 'node:assert/strict';

import { toCents } from '../dist/core/money.js';
import { project } from '../dist/core/projection.js';

const person = (name, dateOfBirth, superInterests) => ({
  name,
  dateOfBirth,
  superInterests,
  parcels: [],
  employmentIncomePerFortnight: toCents(0),
  workBonusBalance: toCents(0),
});

const SETTINGS = {
  asAtDate: '2026-07-01',
  planningHorizonAge: 67,
  economicSeries: { cpi: 0, pblci: 0.025, awote: 0.035, mtawe: 0.035 },
  deemingRates: { lower: 0.0175, upper: 0.0375 },
  nominalReturn: 0,
};

/**
 * Ada (65, released) holds THREE interests across two phases; Bo (65, released) holds one. The
 * interests are sized differently so that no two of them can stand in for each other in a sum.
 */
const COUPLE = {
  persons: [
    person('Ada', '1961-01-10', [
      { phase: 'accumulation', balance: toCents(120_000) },
      { phase: 'accountBasedPension', balance: toCents(30_000), statedStreamSettings: { commencementDay: '2025-08-01' } },
      { phase: 'accumulation', balance: toCents(7_000) },
    ]),
    person('Bo', '1961-03-02', [{ phase: 'accumulation', balance: toCents(50_000) }]),
  ],
  homeStatus: 'occupied',
  openingOffsetBalance: toCents(20_000),
};
const STATED = toCents(207_000);

// $60,000 a year against $20,000 of Offset: the Offset empties within months and limb 5 draws the
// rest, so both routes out of super pay in this walk.
const ENTRIES = [
  { id: 'sc', date: '2026-07-01', owner: 'household', type: 'SPEND_CHANGE', params: { annualSpend: toCents(60_000) }, enabled: true, createdAt: '2026-06-01' },
];

const MONTHS = project(SETTINGS, COUPLE, ENTRIES);

// Literal descriptions, NOT the engine's constant list: this derivation must not share the
// expression it checks.
const paidOutOfSuper = (month) =>
  month.lines
    .filter((line) => /^(Account-Based Pension payment|Superannuation lump sum), /.test(line.description))
    .reduce((total, line) => total + line.amount, 0);

test('the fixture pays out of super by BOTH routes — the identity below is not vacuous', () => {
  const abp = MONTHS.filter((m) => m.lines.some((l) => l.description.startsWith('Account-Based Pension payment, '))).length;
  const lump = MONTHS.filter((m) => m.lines.some((l) => l.description.startsWith('Superannuation lump sum, '))).length;
  assert.ok(abp > 0, 'no Account-Based Pension payment');
  assert.ok(lump > 0, 'no limb 5 draw');
  assert.equal(MONTHS.flatMap((m) => m.lines).filter((l) => l.description.startsWith('Superannuation Guarantee')).length, 0);
  assert.equal(MONTHS.flatMap((m) => m.lines).filter((l) => l.description.startsWith('Investment growth')).length, 0);
});

test('superBalance is every interest of every Person, less what was paid out, in EVERY month', () => {
  let paid = 0;
  for (const month of MONTHS) {
    paid += paidOutOfSuper(month);
    assert.equal(month.superBalance, STATED - paid, `${month.month}`);
  }
  // Month 0 on its own, as a figure: $207,000 stated across all four interests less month 0's payments.
  assert.equal(MONTHS[0].superBalance, STATED - paidOutOfSuper(MONTHS[0]));
  assert.ok(MONTHS[0].superBalance > toCents(200_000), 'an interest of $7,000 or more is missing from the total');
});

test('incomeFromSuper is the month’s payments out of super — both routes, every month, nothing else', () => {
  for (const month of MONTHS) assert.equal(month.incomeFromSuper, paidOutOfSuper(month), month.month);
  assert.ok(MONTHS.filter((m) => m.incomeFromSuper === 0).length > 0, 'a nil month is present, as 0');
});

test('a Household with no super interests reports $0 of it — present and nil, never absent', () => {
  const none = project(SETTINGS, { ...COUPLE, persons: [person('Val', '1961-01-10', [])] }, ENTRIES);
  assert.ok(none.length > 0);
  for (const month of none) {
    assert.equal('superBalance' in month, true);
    assert.equal(month.superBalance, 0);
    assert.equal(month.incomeFromSuper, 0);
  }
});
