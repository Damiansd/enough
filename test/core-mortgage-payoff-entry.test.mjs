// `MORTGAGE_PAYOFF` — "pay the home loan off in full this month". An `event` with params `{}`: the
// amount is not stated, it is whatever the walk says is owed plus that month's interest
// (`household.ts`'s `mortgagePayoffMonth`), charged into the month's Waterfall target where an
// ordinary repayment sits, and emitted on the SAME two mortgage lines. The loan's terms are never
// unset — only the balance goes to nil — so the headline reads "clear" and not "no loan yet".
//
// Every figure is hand-worked from `core-mortgage.test.mjs`'s $500,000 loan at 6.0%, $3,000 a
// month, with no offset and a spending target far past the pension, so the month's cash opens at
// nil and the interest is priced on the whole balance:
//   2026-09  interest $2,500.00, principal $500.00, owing $499,500.00
//   2026-10  interest $2,497.50, principal $502.50, owing $498,997.50
//   2026-11  PAYOFF: interest $498,997.50 × 0.005 = $2,494.9875 → $2,494.99 (rounded up),
//            principal $498,997.50, payment $501,492.49, owing $0.00
import test from 'node:test';
import assert from 'node:assert/strict';

import { toCents } from '../dist/core/money.js';
import { mortgagePayoffMonth } from '../dist/core/household.js';
import { MORTGAGE_INTEREST_LINE, MORTGAGE_PRINCIPAL_LINE, project } from '../dist/core/projection.js';
import { mortgagePayoff } from '../dist/core/outcomes.js';
import { mortgageHeadline } from '../dist/app/mortgageHeadline.js';
import { monthsToSeries } from '../dist/app/monthsToSeries.js';
import { moneyBasis } from '../dist/app/todaysDollars.js';
import { statedContingencyFloor } from '../dist/core/outcomes.js';

const person = (name, dateOfBirth) => ({
  name,
  dateOfBirth,
  superInterests: [],
  parcels: [],
  employmentIncomePerFortnight: toCents(0),
  workBonusBalance: toCents(0),
});

/** An eight-month walk, 2026-09 .. 2027-04: Val turns 72 in 2027-04. */
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
const spend = (annual) => entry('sc', 'SPEND_CHANGE', '2026-09-01', { annualSpend: toCents(annual) });
const payoff = (id, date) => entry(id, 'MORTGAGE_PAYOFF', date, {});
const refinance = (id, date, balance, rate, repayment) =>
  entry(id, 'MORTGAGE_REFINANCE', date, {
    openingBalance: toCents(balance), annualInterestRate: rate, monthlyRepayment: toCents(repayment),
  });
const retire = (id, date, owner) => entry(id, 'RETIRE', date, {}, owner);

const household = (mortgage) => ({
  persons: [person('Val', '1955-04-17')],
  homeStatus: 'occupied',
  ...(mortgage === undefined ? {} : { mortgage }),
});

const LOAN = Object.freeze({ openingBalance: toCents(500_000), annualInterestRate: 0.06, monthlyRepayment: toCents(3_000) });

const amountsOf = (month, description) => month.lines.filter((l) => l.description === description).map((l) => l.amount);
const interestIn = (month) => amountsOf(month, MORTGAGE_INTEREST_LINE);
const principalIn = (month) => amountsOf(month, MORTGAGE_PRINCIPAL_LINE);
const shortfallIn = (month) => amountsOf(month, 'Unfunded shortfall').reduce((a, b) => a + b, 0);
const mortgageLinesIn = (month) => month.lines.filter((l) => l.description.startsWith('Mortgage'));

const thrown = (fn) => {
  try { fn(); } catch (error) { return error; }
  return assert.fail('nothing was thrown');
};

const walk = (mortgage, ...entries) => project(SETTINGS, household(mortgage), [spend(120_000), ...entries]);

// --- the pure half --------------------------------------------------------------------------------

test('mortgagePayoffMonth: the month’s interest as usual, the whole balance as principal, and nil owing', () => {
  const month = mortgagePayoffMonth(LOAN, toCents(498_997.5), toCents(0));
  assert.deepEqual({ ...month }, {
    interest: toCents(2_494.99),
    principal: toCents(498_997.5),
    payment: toCents(501_492.49),
    closingBalance: toCents(0),
  });
  // The offset nets off the interest exactly as in an ordinary month — one shared expression.
  assert.equal(mortgagePayoffMonth(LOAN, toCents(498_997.5), toCents(98_997.5)).interest, toCents(2_000));
  // A payoff of nothing is refused, not priced as `MORTGAGE_ENDED`.
  assert.throws(() => mortgagePayoffMonth(LOAN, toCents(0), toCents(0)), RangeError);
});

// --- 1. PAYOFF MID-LOAN ---------------------------------------------------------------------------

test('PAYOFF MID-LOAN — the whole balance goes in its month, on the SAME two lines, and nothing is charged after', () => {
  const months = walk(LOAN, payoff('clear-it', '2026-11-01'));
  const control = walk(LOAN);
  for (const month of months) assert.equal(month.openingBalance, 0, `${month.month}: an offset would move the interest`);
  assert.equal(months[2].month, '2026-11');
  // The two months before are the ordinary schedule, untouched.
  assert.deepEqual(months.slice(0, 2).map(interestIn), [[toCents(2_500)], [toCents(2_497.5)]]);
  assert.deepEqual(months.slice(0, 2).map((m) => m.mortgageBalance), [toCents(499_500), toCents(498_997.5)]);
  // The payoff month: the month's interest, then EVERYTHING owed as principal, and nil left.
  assert.deepEqual(interestIn(months[2]), [toCents(2_494.99)]);
  assert.deepEqual(principalIn(months[2]), [toCents(498_997.5)]);
  assert.equal(months[2].mortgageBalance, 0);
  // No new line description: the payout is on the existing pair and nowhere else.
  assert.deepEqual(mortgageLinesIn(months[2]).map((l) => l.description), [MORTGAGE_INTEREST_LINE, MORTGAGE_PRINCIPAL_LINE]);
  // EVERY later month: nil owing, the key still PRESENT (cleared, not "no loan"), and no charge.
  for (const month of months.slice(3)) {
    assert.equal(month.mortgageBalance, 0, month.month);
    assert.deepEqual(mortgageLinesIn(month), [], `${month.month} is still charged for a loan that was paid off`);
  }
  assert.equal(months.slice(3).filter((m) => mortgageLinesIn(m).length > 0).length, 0);
  // The control keeps paying in every one of those months — so the absence above is the payoff.
  assert.equal(control.slice(3).filter((m) => mortgageLinesIn(m).length === 2).length, 5);
  // The principal is attributed to the payoff; the interest to the terms (the household's own loan).
  const [interest, principal] = mortgageLinesIn(months[2]);
  assert.equal(interest.attribution.basis, 'none');
  assert.deepEqual([...principal.attribution.entryIds], ['clear-it']);
  // An event: cited in its own month only.
  assert.deepEqual(months.map((m) => m.appliedEntryIds.includes('clear-it')), [false, false, true, false, false, false, false, false]);
});

// --- 2. UNDERFUNDED: the shortfall absorbs it, ONE_OFF_EXPENSE's precedent -------------------------

test('AN UNFUNDABLE PAYOUT IS CHARGED IN FULL AND SHOWS AS A SHORTFALL — never a loan that vanished unpaid', () => {
  const months = walk(LOAN, payoff('clear-it', '2026-11-01'));
  const control = walk(LOAN);
  // The household holds nothing, so every cent of the extra outflow is unfunded. The difference
  // from the control is the payoff's payment less the ordinary repayment it replaces, to the cent.
  assert.equal(shortfallIn(months[2]) - shortfallIn(control[2]), toCents(501_492.49) - toCents(3_000));
  // And the lines carry the FULL payout, not the part that could be funded.
  assert.equal(interestIn(months[2])[0] + principalIn(months[2])[0], toCents(501_492.49));
  // After it, the household is $3,000 a month better off than the control: no repayment at all.
  for (const index of [3, 4, 5, 6, 7]) {
    assert.equal(shortfallIn(control[index]) - shortfallIn(months[index]), toCents(3_000), months[index].month);
  }
});

test('A FUNDABLE PAYOUT IS IN THE WATERFALL’S TARGET — the pension account is drawn for it, and nothing falls short', () => {
  // ⚠️ The test above CANNOT see the target: `Unfunded shortfall` is swept at the month's close, so
  // a household holding nothing shows the same shortfall whether or not the payout was ever asked
  // of the Waterfall. The target is visible only where a limb would have funded it — here an
  // Account-Based Pension of $1,000,000 that limb 2 draws only as far as the target asks.
  const rich = {
    ...household(LOAN),
    persons: [person('Val', '1955-04-17')].map((p) => ({
      ...p,
      superInterests: [{ phase: 'accountBasedPension', balance: toCents(1_000_000), statedStreamSettings: { commencementDay: '2020-07-01' } }],
    })),
  };
  const run = (...entries) => project(SETTINGS, rich, [spend(60_000), ...entries]);
  const months = run(payoff('clear-it', '2026-11-01'));
  const control = run();
  const drawIn = (month) => amountsOf(month, 'Account-Based Pension payment, Val').reduce((a, b) => a + b, 0);
  assert.equal(months[2].mortgageBalance, 0);
  assert.equal(months.filter((m) => shortfallIn(m) > 0).length, 0, 'a payout the pension account could fund fell short');
  // The extra drawn in the payoff month is EXACTLY the payout less the repayment it replaces.
  assert.equal(drawIn(months[2]) - drawIn(control[2]), toCents(501_492.49) - toCents(3_000));
});

// --- 3. PAYOFF THEN RE-BORROW ---------------------------------------------------------------------

test('PAYOFF, THEN BORROW AGAIN — the later change is a new loan, and both payoff readings stay right', () => {
  const months = walk(LOAN, payoff('clear-it', '2026-11-01'), refinance('new-home', '2027-01-01', 100_000, 0.06, 3_000));
  assert.deepEqual(months.map((m) => m.mortgageBalance), [
    toCents(499_500), toCents(498_997.5), 0, 0,
    // $100,000 × 0.005 = $500 interest, $2,500 principal; then $97,500 × 0.005 = $487.50 …
    toCents(97_500), toCents(94_987.5), toCents(92_462.44), toCents(89_924.76),
  ]);
  const read = mortgagePayoff(months, household(LOAN));
  assert.equal(read.outcome, 'stillOwing');
  assert.equal(read.firstPayoff.month, '2026-11');
  assert.equal(read.clearForGood, undefined);
  // Paid off a second time, and the marker's month is the SECOND payoff.
  const twice = walk(LOAN, payoff('clear-it', '2026-11-01'), refinance('new-home', '2027-01-01', 100_000, 0.06, 3_000), payoff('clear-again', '2027-03-01'));
  assert.deepEqual(twice.slice(6).map((m) => m.mortgageBalance), [0, 0]);
  const again = mortgagePayoff(twice, household(LOAN));
  assert.equal(again.outcome, 'clear');
  assert.equal(again.firstPayoff.month, '2026-11');
  assert.equal(again.clearForGood.month, '2027-03');
});

// --- 4. NO LOAN IN FORCE: refused by entry id and month --------------------------------------------

test('A PAYOFF WITH NO LOAN IN FORCE IS REFUSED, BY THE ENTRY’S ID AND THE MONTH', () => {
  const none = thrown(() => walk(undefined, payoff('nothing-owed', '2026-12-01')));
  assert.ok(none instanceof RangeError);
  assert.match(none.message, /"nothing-owed"/);
  assert.match(none.message, /2026-12/);
  assert.match(none.message, /no home loan is in force/);
  // A loan that has already amortised to nil: the terms are in force and nothing is owed.
  // $10,000 at no interest, $3,000 a month: 7,000 / 4,000 / 1,000 / 0 by 2026-12.
  const small = { openingBalance: toCents(10_000), annualInterestRate: 0, monthlyRepayment: toCents(3_000) };
  const nil = thrown(() => walk(small, payoff('too-late', '2027-02-01')));
  assert.ok(nil instanceof RangeError);
  assert.match(nil.message, /"too-late"/);
  assert.match(nil.message, /2027-02/);
  assert.match(nil.message, /nothing is owed/);
  // A second payoff after the first is the same refusal, not a second payout.
  assert.match(thrown(() => walk(LOAN, payoff('once', '2026-11-01'), payoff('twice', '2027-01-01'))).message, /"twice".*2027-01.*nothing is owed/s);
  // The control: the SAME small loan paid off while it still owes something is accepted.
  assert.equal(walk(small, payoff('in-time', '2026-11-01'))[2].mortgageBalance, 0);
});

test('A PAYOFF DATED BEFORE asAtDate IS DROPPED — an event already happened (`ENTRY_KIND` precedent)', () => {
  // The stated Household loan is the position AFTER anything that happened before `asAtDate`, so a
  // pre-dated payoff is neither replayed in month 0 nor refused: the walk is byte-identical.
  const without = walk(LOAN);
  const predated = walk(LOAN, payoff('last-year', '2025-06-01'));
  assert.equal(JSON.stringify(predated), JSON.stringify(without));
  // Nor is it refused when the file states no loan at all — it has already been paid.
  assert.equal(JSON.stringify(walk(undefined, payoff('last-year', '2025-06-01'))), JSON.stringify(walk(undefined)));
});

// --- 5. SAME MONTH AS A REFINANCE: plan order decides, both orders pinned --------------------------

test('A PAYOFF AND A REFINANCE IN THE SAME MONTH — the later-stated one decides, transition (viii)', () => {
  // Refinance THEN payoff: the new $100,000 loan is paid off in full in its own first month.
  //   $100,000 × 0.005 = $500 interest; principal $100,000; nil owing.
  const refiFirst = walk(LOAN, refinance('new-terms', '2026-11-01', 100_000, 0.06, 3_000), payoff('clear-it', '2026-11-01'));
  assert.deepEqual(interestIn(refiFirst[2]), [toCents(500)]);
  assert.deepEqual(principalIn(refiFirst[2]), [toCents(100_000)]);
  assert.equal(refiFirst[2].mortgageBalance, 0);
  assert.deepEqual(refiFirst.slice(3).map((m) => m.mortgageBalance), [0, 0, 0, 0, 0]);
  // Payoff THEN refinance: REFUSED, naming both entries — superseding would drop the payout.
  assert.throws(() => walk(LOAN, payoff('clear-it', '2026-11-01'), refinance('new-terms', '2026-11-01', 100_000, 0.06, 3_000)),
    (e) => e instanceof RangeError && /"clear-it"/.test(e.message) && /"new-terms"/.test(e.message) && /2026-11/.test(e.message));
  // And with NO loan beforehand: refinance-then-payoff originates and clears; the reverse is refused.
  assert.equal(walk(undefined, refinance('first', '2026-11-01', 100_000, 0.06, 3_000), payoff('p', '2026-11-01'))[2].mortgageBalance, 0);
  assert.throws(() => walk(undefined, payoff('p', '2026-11-01'), refinance('first', '2026-11-01', 100_000, 0.06, 3_000)), RangeError);
});

// --- 6. THE HEADLINE AND THE MARKER read "clear", never "no loan yet" -----------------------------

test('THE HEADLINE AND THE MARKER READ A PAID-OFF LOAN AS CLEAR — never as "no home loan yet"', () => {
  // $100,000 repaid at $3,000 is still owing at the horizon; a payoff in 2026-11 clears it.
  const outlives = { openingBalance: toCents(100_000), annualInterestRate: 0, monthlyRepayment: toCents(3_000) };
  const couple = {
    persons: [person('Val', '1955-04-17'), person('Bea', '1954-08-09')],
    homeStatus: 'occupied',
    mortgage: outlives,
  };
  const entries = [spend(120_000), payoff('clear-it', '2026-11-01'), retire('r', '2027-03-01', 'household')];
  const months = project(SETTINGS, couple, entries);
  const basis = moneyBasis('todaysDollars', SETTINGS);
  const found = mortgageHeadline(months, couple, entries, basis);
  assert.notEqual(found, undefined, 'a paid-off loan was read as no loan at all');
  assert.equal(found.kind, 'clear');
  for (const sentence of found.perPerson) {
    assert.doesNotMatch(sentence, /no home loan yet/);
    assert.match(sentence, /already paid off — it was clear in 2026-11, 4 months earlier/);
  }
  assert.equal(found.tail, undefined);
  const payoffRead = mortgagePayoff(months, couple);
  assert.equal(payoffRead.outcome, 'clear');
  assert.equal(payoffRead.clearForGood.month, '2026-11');
  const floor = statedContingencyFloor({ ...SETTINGS, contingencyFloor: toCents(700_000) });
  const markers = monthsToSeries(months, couple, floor, undefined).markers.filter((m) => m.key === 'mortgagePayoff');
  assert.equal(markers.length, 1);
  assert.equal(markers[0].month, '2026-11');
  // The control: without the payoff the same plan is still owing when they retire.
  const control = [spend(120_000), retire('r', '2027-03-01', 'household')];
  assert.equal(mortgageHeadline(project(SETTINGS, couple, control), couple, control, basis).kind, 'stillOwing');
});
