// P13-7 — ONE HAND-WORKED CGT DISPOSAL, RECONCILED INDEPENDENTLY OF THE ENGINE.
//
// The full working is in docs/verification/P13-7-cgt.md, committed BEFORE this file existed
// (see its own commit). Every figure below is copied from that document, not derived here — this
// file's only job is to build the SAME case through the real walk (`project()`) and check the
// engine's own `CAPITAL_GAINS_TAX_LINE` against the hand figure to the cent.
//
// Priya, single, not SAPTO-eligible: salary $41,600.00/yr, one parcel (cost base $20,000.00,
// market value $50,000.00, acquired 2024-01-15 — well over 12 months before the sale), sold whole
// on 2026-11-20 inside FY2026-27 for $50,000.00. `nominalReturn: 0` so the parcel's value does not
// move with the calendar (the same fixture device `test/core-non-super-gain-tax.test.mjs` uses).
//
//   gross gain               $30,000.00  ($50,000.00 − $20,000.00)
//   net capital gain (50% discount, held > 12 months)  $15,000.00
//   s 25-130 standard deduction on the $41,600.00 salary  −$1,000.00 (register §2.8.2)
//   tax WITHOUT the gain, on $40,600.00 salary (after the deduction)  $3,627.00
//   tax WITH the gain, on $55,600.00                                 $8,146.00
//   tax the disposal causes                                          $4,519.00
//
// The first pass of docs/verification/P13-7-cgt.md omitted the s 25-130 deduction and got
// $4,634.00 — $115.00 high. The re-check that found the omission is recorded in that document; the
// figure below is the corrected one, and it is what this test asserts.
import test from 'node:test';
import assert from 'node:assert/strict';

import { toCents } from '../dist/core/money.js';
import { CAPITAL_GAINS_TAX_LINE, project } from '../dist/core/projection.js';

const person = (name, dateOfBirth, over = {}) => ({
  name,
  dateOfBirth,
  superInterests: [{ phase: 'accumulation', balance: toCents(0) }],
  parcels: [],
  employmentIncomePerFortnight: toCents(0),
  workBonusBalance: toCents(0),
  ...over,
});
const parcel = (acquired, costBase, marketValue) => ({
  acquired,
  costBase: toCents(costBase),
  marketValue: toCents(marketValue),
});
const SETTINGS = {
  asAtDate: '2026-09-01',
  planningHorizonAge: 47,
  economicSeries: { cpi: 0, pblci: 0, awote: 0, mtawe: 0 },
  deemingRates: { lower: 0.0175, upper: 0.0375 },
  nominalReturn: 0,
  cashInterestRate: 0,
};
const sell = (id, date, amount) => ({
  id,
  date,
  owner: 'personA',
  type: 'NON_SUPER_INVESTMENT',
  params: { direction: 'sell', amount: toCents(amount) },
  enabled: true,
  createdAt: '2026-06-01',
});

const PRIYA = parcel('2024-01-15', 20_000, 50_000);
const HOUSEHOLD = {
  persons: [
    person('Priya', '1981-03-01', {
      employmentIncomePerFortnight: toCents(1_600),
      parcels: [PRIYA],
    }),
  ],
  homeStatus: 'occupied',
};

test('P13-7 HAND-WORKED — a 12-month-plus parcel sold part-way through a year with salary: $4,519.00', () => {
  // Step 1 — the discount, checked in isolation first.
  const gross = toCents(30_000);
  assert.equal(toCents(50_000) - toCents(20_000), gross);
  assert.equal(gross / 2, toCents(15_000));

  const months = project(SETTINGS, HOUSEHOLD, [sell('sell', '2026-11-20', 50_000)]);
  const gainLines = months.flatMap((m) => m.lines.filter((l) => l.description.startsWith(CAPITAL_GAINS_TAX_LINE)));
  assert.equal(gainLines.length, 1, 'exactly one month should carry the capital gains tax line');
  assert.equal(gainLines[0].amount, toCents(4_519), 'the engine’s figure does not match the hand-worked $4,519.00 — see docs/verification/P13-7-cgt.md');

  // Reconciliation, closing the loop the identity: closing balances still balance.
  for (const m of months) {
    const closing = m.lines.reduce(
      (balance, line) => balance + (line.effect !== 'cash' ? 0 : line.direction === 'inflow' ? line.amount : -line.amount),
      m.openingBalance,
    );
    assert.equal(closing, m.closingBalance, `${m.month} does not reconcile`);
  }
});
