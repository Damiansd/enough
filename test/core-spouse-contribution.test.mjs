// P3-19 microtask 4 — SPOUSE_CONTRIBUTION reaches the walk: the money moves, and the tax offset
// lands at the financial year's own true-up.
//
// Every expected figure below is hand-worked from `docs/assumptions-register.md` §2.1/§2.2/§2.9
// and the working is written out beside it.
import test from 'node:test';
import assert from 'node:assert/strict';

import { toCents } from '../dist/core/money.js';
import { INTERNAL_TRANSFER_LINES, SPOUSE_CONTRIBUTION_LINE, TAX_TRUE_UP_LINE, monthlyFromAnnual, project } from '../dist/core/projection.js';

const person = (name, dateOfBirth, fortnightlyPay, openingSuperBalance = 0) => ({
  name,
  dateOfBirth,
  superInterests: [{ phase: 'accumulation', balance: toCents(openingSuperBalance) }],
  parcels: [],
  employmentIncomePerFortnight: toCents(fortnightlyPay),
  workBonusBalance: toCents(0),
});

const SETTINGS = {
  asAtDate: '2026-08-01',
  planningHorizonAge: 48,
  economicSeries: { cpi: 0, pblci: 0, awote: 0, mtawe: 0 },
  deemingRates: { lower: 0.0175, upper: 0.0375 },
  nominalReturn: 0,
};

const entry = (id, type, date, owner, params) => ({
  id,
  date,
  owner,
  type,
  params,
  enabled: true,
  createdAt: '2026-08-01',
});

const monthAt = (months, isoMonth) => months.find((m) => m.month === isoMonth);
const lineIn = (month, description) => month.lines.find((l) => l.description === description);

// --- Money movement: cash out, the RECEIVING spouse's super balance up, no fund tax ---------------

test('SPOUSE_CONTRIBUTION moves cash to the OTHER Person\'s super, untaxed, and is capped at cash on hand', () => {
  const household = {
    persons: [person('Robin', '1980-01-01', 0), person('Sasha', '1982-01-01', 0, 10_000)],
    homeStatus: 'occupied',
    openingOffsetBalance: toCents(10_000),
  };
  const entries = [entry('sc', 'SPOUSE_CONTRIBUTION', '2026-09-01', 'personA', { amount: toCents(5_000), receivingInterestIndex: 0 })];
  const months = project(SETTINGS, household, entries);

  const before = monthAt(months, '2026-08');
  const landing = monthAt(months, '2026-09');
  const after = monthAt(months, '2026-10');

  // ONE outflow line, for the funded amount, naming both Persons.
  const line = lineIn(landing, `${SPOUSE_CONTRIBUTION_LINE}, Robin → Sasha`);
  assert.ok(line, 'no Spouse contribution line was pushed');
  assert.equal(line.direction, 'outflow');
  assert.equal(line.effect, 'cash');
  assert.equal(line.amount, toCents(5_000));

  // The running cash falls by exactly the funded amount — no other line this month.
  assert.equal(landing.closingBalance, landing.openingBalance - toCents(5_000));

  // `protectedAssets` is read at the START of each month (`splitAssets` runs before this loop), so
  // the balance write-back is invisible in the LANDING month and visible in the one after it. Both
  // Persons are under Age Pension age, so Sasha's accumulation interest is protected and undeemed
  // (register §4.8): the $5,000 that left cash (assessable) reappears here, untouched by any fund
  // tax — this is NOT a concessional contribution (`SpouseContributionParams`'s own doc).
  assert.equal(before.protectedAssets, landing.protectedAssets);
  assert.equal(after.protectedAssets, landing.protectedAssets + toCents(5_000));
});

test('SPOUSE_CONTRIBUTION is capped at cash on hand, on `purchaseFromBuy`\'s own precedent', () => {
  const household = {
    persons: [person('Robin', '1980-01-01', 0), person('Sasha', '1982-01-01', 0, 0)],
    homeStatus: 'occupied',
    openingOffsetBalance: toCents(3_000),
  };
  const entries = [entry('sc', 'SPOUSE_CONTRIBUTION', '2026-09-01', 'personA', { amount: toCents(5_000), receivingInterestIndex: 0 })];
  const months = project(SETTINGS, household, entries);
  const landing = monthAt(months, '2026-09');
  const line = lineIn(landing, `${SPOUSE_CONTRIBUTION_LINE}, Robin → Sasha`);
  // Funded to the $3,000 on hand, not the $5,000 stated — `min(stated, cash)`.
  assert.equal(line.amount, toCents(3_000));
  assert.equal(landing.closingBalance, 0);
  const after = monthAt(months, '2026-10');
  assert.equal(after.protectedAssets, landing.protectedAssets + toCents(3_000));
});

test('SPOUSE_CONTRIBUTION is an INTERNAL TRANSFER — money moving between the Household\'s own pools', () => {
  assert.ok(INTERNAL_TRANSFER_LINES.includes(SPOUSE_CONTRIBUTION_LINE));
});

// --- Walk-time refusals, on `LUMP_SUM_FROM_SUPER`'s "defence in depth" precedent -------------------
//
// `parsePlan`'s `checkSpouseContributionTargets` refuses these at the door; `project()` is called
// directly by every fixture in this suite and by every caller that built a `Household` in code, so
// the walk refuses them again, by name, rather than silently moving nothing.

test('a household owner is refused — the money is paid BY one Person INTO the other\'s own interest', () => {
  const household = {
    persons: [person('Robin', '1980-01-01', 0), person('Sasha', '1982-01-01', 0)],
    homeStatus: 'occupied',
    openingOffsetBalance: toCents(10_000),
  };
  const entries = [entry('sc', 'SPOUSE_CONTRIBUTION', '2026-09-01', 'household', { amount: toCents(5_000), receivingInterestIndex: 0 })];
  assert.throws(() => project(SETTINGS, household, entries), /SPOUSE_CONTRIBUTION.*household/s);
});

test('a single-Person Household is refused — there is no spouse for the contribution to go to', () => {
  const household = {
    persons: [person('Robin', '1980-01-01', 0)],
    homeStatus: 'occupied',
    openingOffsetBalance: toCents(10_000),
  };
  const entries = [entry('sc', 'SPOUSE_CONTRIBUTION', '2026-09-01', 'personA', { amount: toCents(5_000), receivingInterestIndex: 0 })];
  assert.throws(() => project(SETTINGS, household, entries), /this Household has 1 Person/);
});

test('an interest that does not exist on the receiving spouse is refused by name', () => {
  const household = {
    persons: [person('Robin', '1980-01-01', 0), person('Sasha', '1982-01-01', 0)],
    homeStatus: 'occupied',
    openingOffsetBalance: toCents(10_000),
  };
  const entries = [entry('sc', 'SPOUSE_CONTRIBUTION', '2026-09-01', 'personA', { amount: toCents(5_000), receivingInterestIndex: 3 })];
  assert.throws(() => project(SETTINGS, household, entries), /names superannuation interest 3.*Sasha holds 1/s);
});

// --- The tax offset, reaching the household through the financial year's own true-up --------------
//
// **THE MECHANISM, once, because every figure below is a consequence of it.** Robin earns $39,000
// a year (Tom's own salary from `core-projection-tax.test.mjs`'s COUPLE fixture) and is not
// SAPTO-qualified, so FY2026-27 tax has exactly three moving parts: the s 25-130 standard
// deduction (P3-38 — $1,000 off ASSESSABLE income from FY2026-27, `REDUCER_DEDUCTIONS` is nil so
// the full $1,000 is taken), the bracket ladder, and LITO (WATO does not exist before FY2027-28,
// register §2.8.1). **Family income (Robin's $38,000 taxable + Sasha's nil) is below the ordinary
// family lower threshold ($47,238), so the Medicare levy is nil for BOTH Persons in EITHER walk**
// (s 8(1)'s nil band) — chosen deliberately so the levy, which the offset never touches, cannot
// enter this fixture's arithmetic at all. Sasha earns nothing, so her income for the spouse-income
// test is nil — well under the $37,000 lower threshold — and the $5,000 Robin pays her is well
// over the $3,000 base, so the RAW entitlement is the full $540 (register §2.9). The monthly
// accrual never sees this offset (`asSaptoPerson`'s own doc: nil during the accrual, the year's
// total only at the July true-up), so the true-up carries the WHOLE of it in one line.
//
//   taxable income        = $39,000 − $1,000 (s 25-130, in full: $39,000 ≥ $1,000)  = $38,000.00
//   gross tax on $38,000  = (38,000 − 18,200) × 15% = 19,800 × 0.15                 =  $2,970.00
//   LITO on $38,000       = 700 − (38,000 − 37,500) × 5% = 700 − 25                 =    $675.00
//   WITHOUT the entry:      net tax = 2,970.00 − 675.00                            =  $2,295.00
//   WITH the entry:         net tax = 2,970.00 − 675.00 − 540.00                   =  $1,755.00
//
// Twelve monthly accruals of `monthlyFromAnnual($2,295.00)` total the SAME figure in EITHER walk —
// the offset is invisible to the accrual — computed here from the named rounding primitive, never
// pasted from a run. ($2,295.00 divides into twelve whole cents exactly — $191.25 a month — so this
// fixture happens to carry NO rounding residue at all; the true-up gap below is the $540 alone.)
const ACCRUED_FOR_THE_YEAR = monthlyFromAnnual(toCents(2_295)) * 12;

const yearWalk = (spouseContribution) => {
  const household = {
    persons: [person('Robin', '1980-01-01', 1_500), person('Sasha', '1982-01-01', 0)],
    homeStatus: 'occupied',
    openingOffsetBalance: toCents(20_000),
  };
  const entries = spouseContribution
    ? [entry('sc', 'SPOUSE_CONTRIBUTION', '2026-09-01', 'personA', { amount: toCents(5_000), receivingInterestIndex: 0 })]
    : [];
  // `asAtDate` is the first of FY2026-27 exactly, so the walk's first financial year is COMPLETE
  // (July through June) and the true-up settlement runs rather than being refused as a partial year.
  return project({ ...SETTINGS, asAtDate: '2026-07-01', planningHorizonAge: 49 }, household, entries);
};

test('HAND-WORKED — the true-up carries the full $540 offset EXACTLY, in the July after the year it belongs to', () => {
  const withEntry = monthAt(yearWalk(true), '2027-07');
  const trueUp = lineIn(withEntry, `${TAX_TRUE_UP_LINE}, Robin, 2026-27`);
  assert.ok(trueUp, 'no true-up line for Robin, 2026-27');
  assert.equal(trueUp.direction, 'inflow', 'the year was over-accrued and the excess comes back');
  // $2,295.00 carries no rounding residue at all (confirmed below), so the gap IS the offset, to
  // the cent: `ACCRUED_FOR_THE_YEAR` (= $2,295.00) less the year's own assessed net tax ($1,755.00).
  assert.equal(ACCRUED_FOR_THE_YEAR, toCents(2_295), 'the no-residue fixture this test relies on has drifted — pick different salary figures');
  assert.equal(trueUp.amount, ACCRUED_FOR_THE_YEAR - toCents(1_755));
  assert.equal(trueUp.amount, toCents(540));
});

test('and the SAME month carries NO true-up line at all when nobody states a SPOUSE_CONTRIBUTION', () => {
  // Without the entry, accrued ($2,295.00, no residue) equals the year's own assessed net tax
  // ($2,295.00) exactly, so the gap is nil and the true-up emits nothing — the control that proves
  // the $540 line above is the offset and not an artefact of this fixture's own arithmetic.
  const withoutEntry = monthAt(yearWalk(false), '2027-07');
  assert.equal(lineIn(withoutEntry, `${TAX_TRUE_UP_LINE}, Robin, 2026-27`), undefined);
});

// --- Zero fixture churn: a Household stating no SPOUSE_CONTRIBUTION is untouched -------------------

test('a Household with no SPOUSE_CONTRIBUTION entry never emits the line, at all, anywhere in the walk', () => {
  const months = yearWalk(false);
  for (const month of months) {
    assert.equal(lineIn(month, `${SPOUSE_CONTRIBUTION_LINE}, Robin → Sasha`), undefined);
  }
});
