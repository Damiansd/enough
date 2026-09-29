// P3-16 slice 1 — `Household.mortgage`: the home loan, priced month by month.
//
// Until this item there was no mortgage anywhere in the model. README listed one in scope, the
// Offset Account's "does not grow" note named the missing loan as its own reason, and a household
// still paying off its home spent nothing at all on it.
//
// **Six things are defended here, each against a named mutation:**
//
//   1. **The amortisation is real** — §1. Balance falls, interest falls, principal rises, all three
//      hand-worked from the three stated figures and none of them read off the engine.
//   2. **The offset reduces the interest and is never credited** — §2. The same loan with $100,000
//      in the offset is charged $500.00 a month less and repays $500.00 a month more.
//   3. **A repaid loan stops being charged** — §3. The four ways a mortgage ends are enumerated in
//      `mortgageMonth`'s own doc; this walks the one that happens mid-projection, plus the final
//      partial payment that gets the balance to nil rather than past it.
//   4. **A loan that never ends is refused BY NAME** — §4, at the door and in the walk.
//   5. **THE MEANS TEST DOES NOT MOVE** — §5. `agePension.ts`'s `homeownerWithAMortgage`, sourced
//      to Services Australia, is that mortgage debt is not deductible from other assets. The
//      implementation of that rule is the ABSENCE of a branch, which is the hardest kind of code to
//      keep: this section is what makes deleting it fail.
//   6. **An absent mortgage is invisible** — §6. No line, no note, no figure, no key.
import test from 'node:test';
import assert from 'node:assert/strict';

import { toCents } from '../dist/core/money.js';
import { mortgageMonth, splitAssets } from '../dist/core/household.js';
import { MORTGAGE_INTEREST_LINE, MORTGAGE_PRINCIPAL_LINE, project, withBalances } from '../dist/core/projection.js';
import { PlanFileEntryError, PlanFileHouseholdError, parsePlan } from '../dist/core/parsePlan.js';
import { DEMO_PLAN } from '../dist/app/demoHousehold.js';

const person = (name, dateOfBirth, over = {}) => ({
  name,
  dateOfBirth,
  superInterests: [],
  parcels: [],
  employmentIncomePerFortnight: toCents(0),
  workBonusBalance: toCents(0),
  ...over,
});

const SETTINGS = {
  asAtDate: '2026-09-16',
  planningHorizonAge: 72,
  economicSeries: { cpi: 0.025, pblci: 0.025, awote: 0.035, mtawe: 0.035 },
  deemingRates: { lower: 0.0175, upper: 0.0375 },
  nominalReturn: 0.065,
};

const entry = (id, type, date, params) => ({
  id,
  date,
  owner: 'household',
  type,
  params,
  enabled: true,
  createdAt: '2026-06-01',
});

const spend = (annual) => entry('sc', 'SPEND_CHANGE', '2026-09-01', { annualSpend: toCents(annual) });

/**
 * A single homeowner of 71, holding an Offset Account and nothing else — `core-offset-account`'s
 * fixture, so that `assessableAssets` is the offset and no other pool can absorb a wrong answer.
 * `mortgage` is added or left out by the caller; leaving it out is the control every section needs.
 */
const household = ({ offset, mortgage } = {}) => ({
  persons: [person('Val', '1955-04-17')],
  homeStatus: 'occupied',
  ...(offset === undefined ? {} : { openingOffsetBalance: toCents(offset) }),
  ...(mortgage === undefined ? {} : { mortgage }),
});

/** $500,000 owing at 6.0% a year, repaid at $3,000 a month. Every figure below is worked off these. */
const LOAN = Object.freeze({
  openingBalance: toCents(500_000),
  annualInterestRate: 0.06,
  monthlyRepayment: toCents(3_000),
});

const amountsOf = (month, description) => month.lines.filter((l) => l.description === description).map((l) => l.amount);
const interestIn = (month) => amountsOf(month, MORTGAGE_INTEREST_LINE);
const principalIn = (month) => amountsOf(month, MORTGAGE_PRINCIPAL_LINE);

/** `assert.throws` returns nothing, and these tests read the messages. */
const thrown = (fn) => {
  try { fn(); } catch (error) { return error; }
  return assert.fail('nothing was thrown');
};

// --- 1. THE AMORTISATION, HAND-WORKED ------------------------------------------------------------

test('THE ARITHMETIC — three months of a $500,000 loan at 6.0%, worked by hand', () => {
  // A twelfth of the annual rate, on the balance less the offset, rounded UP to the cent
  // (`mortgageMonth` points 1-3). With no offset the three months are:
  //
  //   month 1  $500,000.00 × 0.06 ÷ 12 = $2,500.00 interest; $3,000 − $2,500 = $500.00 principal;
  //            $500,000.00 − $500.00 = $499,500.00 owing
  //   month 2  $499,500.00 × 0.005 = $2,497.50 interest; $502.50 principal; $498,997.50 owing
  //   month 3  $498,997.50 × 0.005 = $2,494.9875 → $2,494.99 interest (rounded UP, against the
  //            household); $505.01 principal; $498,492.49 owing
  const first = mortgageMonth(LOAN, LOAN.openingBalance, toCents(0));
  assert.deepEqual({ ...first }, {
    interest: toCents(2_500),
    principal: toCents(500),
    payment: toCents(3_000),
    closingBalance: toCents(499_500),
  });
  const second = mortgageMonth(LOAN, first.closingBalance, toCents(0));
  assert.deepEqual({ ...second }, {
    interest: toCents(2_497.5),
    principal: toCents(502.5),
    payment: toCents(3_000),
    closingBalance: toCents(498_997.5),
  });
  const third = mortgageMonth(LOAN, second.closingBalance, toCents(0));
  assert.deepEqual({ ...third }, {
    interest: toCents(2_494.99),
    principal: toCents(505.01),
    payment: toCents(3_000),
    closingBalance: toCents(498_492.49),
  });

  // The three directions, stated as directions rather than as three more figures: a month's payment
  // is the same every month, and what it BUYS changes.
  const chain = [first, second, third];
  assert.ok(chain.every((m, i) => i === 0 || m.interest < chain[i - 1].interest), 'the interest falls');
  assert.ok(chain.every((m, i) => i === 0 || m.principal > chain[i - 1].principal), 'the principal rises');
  assert.ok(chain.every((m, i) => i === 0 || m.closingBalance < chain[i - 1].closingBalance), 'the balance falls');
  assert.equal(new Set(chain.map((m) => m.payment)).size, 1, 'one repayment, unchanged');
  for (const m of chain) assert.equal(m.interest + m.principal, m.payment, 'the halves sum to the payment');
  // The rounding is UP and it is measurable: an exact twelfth of month 3 is $2,494.9875.
  assert.equal(third.interest, Math.ceil(498_997_50 * 0.06 / 12));
  assert.notEqual(third.interest, Math.floor(498_997_50 * 0.06 / 12));
});

test('THE WALK CHARGES THAT SCHEDULE, AS TWO LINES A MONTH, ADDITIONAL TO THE SPENDING TARGET', () => {
  // No offset stated and a target far past the pension, so the month's cash opens at nil in every
  // month (the shortfall sweep lands it exactly there) and the interest is priced on the whole
  // balance. That makes the walked figures the hand-worked ones above, unaltered by a moving offset.
  const months = project(SETTINGS, household({ mortgage: LOAN }), [spend(120_000)]);
  assert.equal(months.length, 8);
  for (const month of months) assert.equal(month.openingBalance, 0, month.month);

  assert.deepEqual(months.slice(0, 3).map(interestIn), [[toCents(2_500)], [toCents(2_497.5)], [toCents(2_494.99)]]);
  assert.deepEqual(months.slice(0, 3).map(principalIn), [[toCents(500)], [toCents(502.5)], [toCents(505.01)]]);
  // One of each, in every month of a loan that outlives the forecast — never two, never none.
  for (const month of months) {
    assert.equal(interestIn(month).length, 1, month.month);
    assert.equal(principalIn(month).length, 1, month.month);
  }
  // Both are CASH outflows: the money leaves the household and reaches the lender.
  for (const line of months[0].lines.filter((l) => l.description.startsWith('Mortgage'))) {
    assert.equal(line.direction, 'outflow');
    assert.equal(line.effect, 'cash');
    assert.ok(line.amount > 0, 'MonthLine.amount is always positive');
    assert.equal(line.provenance.basis, 'none');
    assert.match(line.provenance.note, /offset/i);
    assert.equal(line.attribution.basis, 'none');
  }

  // **THE RULING OF 2026-09-21: the repayment is ADDITIONAL to the stated spending level.** The
  // control states the same $120,000 a year and no loan, and its spending line is identical — the
  // mortgage did not come out of it — while the mortgaged walk is short by the whole repayment.
  const control = project(SETTINGS, household({}), [spend(120_000)]);
  const spendingIn = (m) => amountsOf(m, 'Household spending');
  assert.deepEqual(spendingIn(months[0]), spendingIn(control[0]));
  const shortfallIn = (m) => amountsOf(m, 'Unfunded shortfall').reduce((a, b) => a + b, 0);
  assert.equal(shortfallIn(months[0]) - shortfallIn(control[0]), toCents(3_000));
  assert.equal(shortfallIn(months[0]) - shortfallIn(control[0]), interestIn(months[0])[0] + principalIn(months[0])[0]);
});

// --- 2. THE OFFSET REDUCES THE INTEREST ----------------------------------------------------------

test('THE OFFSET IS READ, NOT CREDITED — $100,000 in it is $500.00 a month of interest not charged', () => {
  // $100,000 against a $500,000 loan: interest is charged on $400,000, which at 0.06 ÷ 12 is
  // $2,000.00 rather than $2,500.00 — and the repayment is unchanged, so the whole $500.00 goes on
  // to the principal instead.
  const withOffset = mortgageMonth(LOAN, LOAN.openingBalance, toCents(100_000));
  const without = mortgageMonth(LOAN, LOAN.openingBalance, toCents(0));
  assert.equal(withOffset.interest, toCents(2_000));
  assert.equal(without.interest - withOffset.interest, toCents(500));
  assert.equal(withOffset.principal - without.principal, toCents(500));
  assert.equal(withOffset.payment, without.payment, 'the household pays the same either way');
  assert.ok(withOffset.closingBalance < without.closingBalance, 'and owes less at the end of it');

  // In the walk, month 0's offset IS the stated opening balance, so the same pair appears there.
  const mortgaged = project(SETTINGS, household({ offset: 100_000, mortgage: LOAN }), [spend(60_000)]);
  const bare = project(SETTINGS, household({ mortgage: LOAN }), [spend(60_000)]);
  assert.equal(mortgaged[0].openingBalance, toCents(100_000));
  assert.deepEqual(interestIn(mortgaged[0]), [toCents(2_000)]);
  assert.deepEqual(interestIn(bare[0]), [toCents(2_500)]);

  // **NOTHING IS CREDITED TO THE OFFSET**, which is what keeps the ledger contract exact: the month
  // closes at opening plus every cash inflow less every cash outflow, with no `Offset interest`
  // line anywhere. Asserted over every month of a walk that has a loan running in all of them.
  const cash = (m) => m.lines.filter((l) => l.effect === 'cash').reduce((t, l) => t + (l.direction === 'inflow' ? l.amount : -l.amount), 0);
  for (const month of mortgaged) {
    assert.equal(month.closingBalance, month.openingBalance + cash(month), month.month);
    assert.equal(month.lines.filter((l) => /offset/i.test(l.description)).length, 0, month.month);
  }
});

test('AN OFFSET LARGER THAN THE LOAN CHARGES NIL, AND NEVER A CREDIT', () => {
  const swamped = mortgageMonth(
    { openingBalance: toCents(10_000), annualInterestRate: 0.06, monthlyRepayment: toCents(3_000) },
    toCents(10_000),
    toCents(400_000),
  );
  assert.equal(swamped.interest, 0);
  assert.ok(swamped.interest >= 0, 'max(0, …) — a household cannot earn money by owing less than it holds');
  assert.equal(swamped.principal, toCents(3_000), 'the whole repayment goes on to the balance');
  assert.equal(swamped.closingBalance, toCents(7_000));
  // And on the walk, the interest line is simply absent rather than present at nil.
  const months = project(
    SETTINGS,
    household({ offset: 400_000, mortgage: { openingBalance: toCents(10_000), annualInterestRate: 0.06, monthlyRepayment: toCents(3_000) } }),
    [spend(12_000)],
  );
  assert.deepEqual(interestIn(months[0]), []);
  assert.deepEqual(principalIn(months[0]), [toCents(3_000)]);
});

test('A RATE OF NIL IS LEGAL AND AMORTISES AS PURE PRINCIPAL', () => {
  // A family loan at no interest. It must not divide by anything and must not refuse: the repayment
  // covers an interest charge of nothing, which is every month of it.
  const free = { openingBalance: toCents(9_000), annualInterestRate: 0, monthlyRepayment: toCents(3_000) };
  const first = mortgageMonth(free, free.openingBalance, toCents(0));
  assert.deepEqual({ ...first }, { interest: 0, principal: toCents(3_000), payment: toCents(3_000), closingBalance: toCents(6_000) });
  assert.equal(mortgageMonth(free, toCents(6_000), toCents(0)).closingBalance, toCents(3_000));
  assert.equal(mortgageMonth(free, toCents(3_000), toCents(0)).closingBalance, 0);
});

// --- 3. THE LOAN ENDS, AND THE CHARGING STOPS ----------------------------------------------------

test('A REPAID LOAN STOPS BEING CHARGED — and the last payment is what is OWED, not the full repayment', () => {
  // $10,000 at no interest, $3,000 a month: three full payments and a fourth of $1,000. Nothing at
  // all in months 4 to 7 — a household that goes on paying a cleared loan for decades is the silent
  // wrong answer this test exists for.
  const loan = { openingBalance: toCents(10_000), annualInterestRate: 0, monthlyRepayment: toCents(3_000) };
  const months = project(SETTINGS, household({ mortgage: loan }), [spend(12_000)]);
  assert.equal(months.length, 8);
  assert.deepEqual(months.map(principalIn), [
    [toCents(3_000)], [toCents(3_000)], [toCents(3_000)], [toCents(1_000)], [], [], [], [],
  ]);
  assert.deepEqual(months.map(interestIn), [[], [], [], [], [], [], [], []], 'no interest at a nil rate, ever');
  // The final payment is capped at the balance: the household does not overpay into a negative one.
  assert.equal(mortgageMonth(loan, toCents(1_000), toCents(0)).closingBalance, 0);
  assert.equal(mortgageMonth(loan, toCents(1_000), toCents(0)).payment, toCents(1_000));
  // Σ paid === what was owed. Four payments, one loan, no cent over.
  assert.equal(months.flatMap(principalIn).reduce((a, b) => a + b, 0), toCents(10_000));
  // And after the last one the household is BETTER OFF by the repayment: months 4-7 keep the money.
  const control = project(SETTINGS, household({ mortgage: loan }), [spend(12_000)]);
  assert.deepEqual(months.map((m) => m.closingBalance), control.map((m) => m.closingBalance));
  assert.ok(months[4].closingBalance >= months[3].closingBalance, 'nothing leaves for the loan after it ends');

  // With interest, the final payment carries the last month's interest too: $1,000 owing at 6.0%
  // costs $5.00 for the month, so $1,005.00 leaves and the balance lands on nil.
  const last = mortgageMonth({ openingBalance: toCents(500_000), annualInterestRate: 0.06, monthlyRepayment: toCents(3_000) }, toCents(1_000), toCents(0));
  assert.deepEqual({ ...last }, { interest: toCents(5), principal: toCents(1_000), payment: toCents(1_005), closingBalance: 0 });
});

test('A BALANCE OF NIL IS PRICED AS NOTHING AT ALL, at any rate and any repayment', () => {
  const ended = mortgageMonth(LOAN, toCents(0), toCents(0));
  assert.deepEqual({ ...ended }, { interest: 0, principal: 0, payment: 0, closingBalance: 0 });
});

// --- 4. A LOAN THAT NEVER ENDS IS REFUSED --------------------------------------------------------

test('A REPAYMENT THAT DOES NOT COVER THE INTEREST IS REFUSED BY NAME, in the walk', () => {
  // $500,000 at 6.0% costs $2,500.00 a month. $2,499.99 leaves the balance a cent higher every
  // month for ever, and EQUALITY leaves it exactly where it was — which is the same never-ending
  // loan and is refused too.
  const under = { openingBalance: toCents(500_000), annualInterestRate: 0.06, monthlyRepayment: toCents(2_499.99) };
  const exact = { openingBalance: toCents(500_000), annualInterestRate: 0.06, monthlyRepayment: toCents(2_500) };
  for (const loan of [under, exact]) {
    const error = thrown(() => mortgageMonth(loan, loan.openingBalance, toCents(0)));
    assert.ok(error instanceof RangeError);
    assert.match(error.message, /never be repaid/);
    assert.match(error.message, /does not cover/);
    assert.ok(error.message.includes(String(loan.monthlyRepayment)), 'the refusal quotes the repayment');
    assert.ok(error.message.includes('250000'), 'and the interest it failed to cover');
    // And the walk refuses rather than running it.
    assert.throws(() => project(SETTINGS, household({ mortgage: loan }), [spend(12_000)]), /never be repaid/);
  }
  // A cent more, and it walks: the refusal is on the boundary and not a wide net.
  const over = { openingBalance: toCents(500_000), annualInterestRate: 0.06, monthlyRepayment: toCents(2_500.01) };
  assert.equal(mortgageMonth(over, over.openingBalance, toCents(0)).principal, toCents(0.01));
});

test('THE DOOR REFUSES THE SAME LOAN, BY THE SAME EXPRESSION, WITH THE FILE PATH ON IT', () => {
  const file = JSON.parse(JSON.stringify(DEMO_PLAN));
  file.household.openingOffsetBalance = 0;
  file.household.mortgage = { openingBalance: toCents(500_000), annualInterestRate: 0.06, monthlyRepayment: toCents(2_400) };
  const error = thrown(() => parsePlan(file));
  assert.ok(error instanceof PlanFileHouseholdError);
  assert.match(error.message, /household\.mortgage\.monthlyRepayment/);
  assert.match(error.message, /never be repaid/);

  // **The door tests it against the offset THIS FILE states**, so the same repayment is accepted
  // where the household holds enough offset to bring the interest under it: $500,000 owing with
  // $100,000 offset is charged $2,000.00, which $2,400 covers.
  const funded = JSON.parse(JSON.stringify(file));
  funded.household.openingOffsetBalance = toCents(100_000);
  assert.equal(parsePlan(funded).household.mortgage.monthlyRepayment, toCents(2_400));
});

test('THE DOOR REFUSES THE FOUR MALFORMED LOANS, EACH BY NAME AND PATH', () => {
  const withMortgage = (mortgage) => {
    const file = JSON.parse(JSON.stringify(DEMO_PLAN));
    file.household.mortgage = mortgage;
    return file;
  };
  const good = { openingBalance: toCents(500_000), annualInterestRate: 0.06, monthlyRepayment: toCents(3_000) };
  // A loan owing nothing: refused, so that an ABSENT key is the one and only way to say "no loan".
  assert.match(thrown(() => parsePlan(withMortgage({ ...good, openingBalance: 0 }))).message, /openingBalance.*not a home loan/s);
  assert.match(thrown(() => parsePlan(withMortgage({ ...good, openingBalance: -1 }))).message, /openingBalance.*negative/s);
  assert.match(thrown(() => parsePlan(withMortgage({ ...good, annualInterestRate: -0.01 }))).message, /annualInterestRate/);
  assert.match(thrown(() => parsePlan(withMortgage({ ...good, monthlyRepayment: 0 }))).message, /monthlyRepayment.*never repaid/s);
  assert.match(thrown(() => parsePlan(withMortgage({ ...good, monthlyRepayment: -1 }))).message, /monthlyRepayment.*negative/s);
  // An unknown key inside the loan is refused rather than dropped, on the door's standing rule.
  assert.match(thrown(() => parsePlan(withMortgage({ ...good, termYears: 25 }))).message, /"termYears"/);
  // A missing one is refused too: three figures or no loan.
  assert.throws(() => parsePlan(withMortgage({ openingBalance: toCents(500_000), annualInterestRate: 0.06 })), PlanFileHouseholdError);
  // A nil rate IS accepted — a family loan at no interest is a real arrangement.
  assert.equal(parsePlan(withMortgage({ ...good, annualInterestRate: 0 })).household.mortgage.annualInterestRate, 0);
});

test('A MORTGAGE ROUND-TRIPS THROUGH THE FILE, AND A FILE WITHOUT ONE STILL PARSES', () => {
  const file = JSON.parse(JSON.stringify(DEMO_PLAN));
  assert.equal(file.household.mortgage, undefined, 'the demo plan states no loan');
  assert.ok(!Object.hasOwn(parsePlan(file).household, 'mortgage'), 'and the parsed household has no such key');

  file.household.mortgage = { openingBalance: toCents(500_000), annualInterestRate: 0.06, monthlyRepayment: toCents(3_000) };
  const parsed = parsePlan(file);
  assert.deepEqual(parsed.household.mortgage, { openingBalance: 50_000_000, annualInterestRate: 0.06, monthlyRepayment: 300_000 });
  // Written back out and read again: the same loan, to the byte.
  const again = parsePlan(JSON.parse(JSON.stringify(parsed)));
  assert.deepEqual(again.household.mortgage, parsed.household.mortgage);
  assert.equal(JSON.stringify(again), JSON.stringify(parsed));
});

// --- 5. THE MEANS TEST DOES NOT MOVE -------------------------------------------------------------

test('A MORTGAGE CHANGES NOTHING IN THE ASSETS TEST — the debt is not deductible from other assets', () => {
  // `agePension.ts`'s `homeownerWithAMortgage`, sourced to SERVICES_AUSTRALIA: an owner-occupier
  // with a mortgage is a homeowner, and the mortgage is netted only against the asset it secures,
  // which is itself exempt. Register T38. So the offset stays assessable at its FULL balance.
  const bare = household({ offset: 400_000 });
  const mortgaged = household({ offset: 400_000, mortgage: LOAN });
  const a = splitAssets(bare, '2026-09-01');
  const b = splitAssets(mortgaged, '2026-09-01');
  assert.equal(b.assessableAssets, toCents(400_000), 'the whole offset, undiminished by a $500,000 debt');
  assert.equal(a.assessableAssets, b.assessableAssets);
  assert.equal(a.protectedAssets, b.protectedAssets);
  assert.equal(a.deemedFinancialAssets, b.deemedFinancialAssets);
  assert.equal(a.homeowner, b.homeowner);
  assert.equal(a.homeowner, true, 'owning with a mortgage is still owning');
  assert.deepEqual(a.lines, b.lines, 'not one extra line, and none altered');
  assert.deepEqual(JSON.parse(JSON.stringify(a)), JSON.parse(JSON.stringify(b)));

  // A loan larger than everything the household holds is still not deductible: the assessable
  // figure does not fall and cannot go negative.
  const huge = splitAssets(household({ offset: 400_000, mortgage: { ...LOAN, openingBalance: toCents(5_000_000) } }), '2026-09-01');
  assert.equal(huge.assessableAssets, toCents(400_000));
});

test('AND THE WALK ASSESSES THE SAME FIGURES AND PAYS THE SAME PENSION IN THE MONTH IT OPENS', () => {
  // Month 0 is the month the two walks hold the same cash — from month 1 the mortgaged household
  // has spent its repayments, and a LOWER offset is assessed for the honest reason. So the claim is
  // tested where it is testable: same position, same assessment, same payment.
  const mortgaged = project(SETTINGS, household({ offset: 400_000, mortgage: LOAN }), [spend(60_000)]);
  const bare = project(SETTINGS, household({ offset: 400_000 }), [spend(60_000)]);
  const pension = (m) => amountsOf(m, 'Age Pension');
  assert.equal(mortgaged[0].assessableAssets, bare[0].assessableAssets);
  assert.equal(mortgaged[0].protectedAssets, bare[0].protectedAssets);
  assert.deepEqual(pension(mortgaged[0]), pension(bare[0]));
  assert.ok(pension(mortgaged[0])[0] > 0, 'a pension is actually being paid, or this proves nothing');
  assert.equal(mortgaged[0].assessableAssets, toCents(400_000));
});

test('THE MEANS-TEST VIEW OF A HOUSEHOLD CARRIES NO MORTGAGE AT ALL — the omission IS the rule', () => {
  // `withBalances` builds the Household the means test is assessed on. It leaves the field out
  // rather than substituting it, so no reader on that path can find a mortgage to net — and no
  // stale Day-1 balance can ride through on a spread.
  const view = withBalances(
    household({ offset: 400_000, mortgage: LOAN }),
    [{ superInterestBalances: [], parcels: [], workBonusBalance: toCents(0) }],
    toCents(1_234),
    [toCents(0)],
  );
  assert.equal(Object.hasOwn(view, 'mortgage'), false);
  assert.equal(view.openingOffsetBalance, toCents(1_234), 'the offset IS substituted');
  assert.equal(view.homeStatus, 'occupied', 'and everything else copied through');
  assert.equal(JSON.stringify(view).includes('mortgage'), false);
});

// --- 6. AN ABSENT MORTGAGE IS INVISIBLE ----------------------------------------------------------

test('NO MORTGAGE STATED IS NO LINE, NO NOTE AND NO WORD ANYWHERE IN THE WALK', () => {
  // The acceptance criterion of this slice, and the one a "zero-balance loan that still emits a
  // line" mutation breaks: a Household that states nothing must walk exactly as it did before this
  // field existed.
  for (const offset of [undefined, 0, 400_000]) {
    const months = project(SETTINGS, household({ offset }), [spend(60_000)]);
    assert.ok(months.length > 0);
    assert.equal(JSON.stringify(months).toLowerCase().includes('mortgage'), false, `offset ${offset}`);
    for (const month of months) {
      assert.deepEqual(interestIn(month), []);
      assert.deepEqual(principalIn(month), []);
    }
  }
  // And the demo plan — the one every other suite's figures are pinned against — states none.
  const demo = project(DEMO_PLAN.settings, DEMO_PLAN.household, DEMO_PLAN.entries.filter((e) => e.enabled));
  assert.equal(JSON.stringify(demo).toLowerCase().includes('mortgage'), false);
});

// --- 7. WHAT IS STILL OWED REACHES THE MONTH (P3-16 slice 2) -------------------------------------

test('THE OUTSTANDING BALANCE IS ON EVERY MONTH, AT THE CLOSE, AND IT IS THE HAND-WORKED ONE', () => {
  // §1's schedule, continued: the balance after each month's repayment, worked from the three
  // stated figures and not read off the engine.
  //
  //   month 0  $500,000.00 − $500.00    = $499,500.00
  //   month 1  $499,500.00 − $502.50    = $498,997.50
  //   month 2  $498,997.50 − $505.01    = $498,492.49
  //   month 3  $498,492.49 × 0.005 = $2,492.46245 → $2,492.47 interest (rounded UP), so
  //            $3,000.00 − $2,492.47 = $507.53 principal, and $498,492.49 − $507.53 = $497,984.96
  const months = project(SETTINGS, household({ mortgage: LOAN }), [spend(120_000)]);
  for (const month of months) assert.equal(month.openingBalance, 0, `${month.month}: no offset, or the interest is not the hand-worked one`);
  assert.deepEqual(months.slice(0, 4).map((m) => m.mortgageBalance), [
    toCents(499_500), toCents(498_997.5), toCents(498_492.49), toCents(497_984.96),
  ]);

  // **THE CLOSING figure and not the opening one, proved against the lines of the month itself.**
  // An opening balance would be this month's figure less no principal at all — that is, the PREVIOUS
  // month's answer — so the identity below is what an off-by-one-month emit breaks.
  for (const [i, month] of months.entries()) {
    const opening = i === 0 ? LOAN.openingBalance : months[i - 1].mortgageBalance;
    assert.equal(month.mortgageBalance, opening - principalIn(month)[0], month.month);
    assert.notEqual(month.mortgageBalance, opening, `${month.month}: the field reports the OPENING balance`);
  }
  // It falls every month and never below nil.
  for (const [i, month] of months.entries()) {
    assert.ok(i === 0 || month.mortgageBalance < months[i - 1].mortgageBalance, month.month);
    assert.ok(month.mortgageBalance >= 0, month.month);
  }
});

test('A LOAN PAID OFF REPORTS NIL EVERY MONTH AFTER — nil is CLEARED, and absence is NO LOAN', () => {
  // §3's fixture: $10,000 at no interest, $3,000 a month. Three full payments, a fourth of $1,000,
  // and then nothing. The distinction this asserts is the whole reason the field is optional rather
  // than defaulted: a household with no loan has no key, and a household that has cleared one has a
  // key reading nil — which is the answer they came for and must not read as "no data".
  const loan = { openingBalance: toCents(10_000), annualInterestRate: 0, monthlyRepayment: toCents(3_000) };
  const months = project(SETTINGS, household({ mortgage: loan }), [spend(12_000)]);
  assert.deepEqual(months.map((m) => m.mortgageBalance), [
    toCents(7_000), toCents(4_000), toCents(1_000), 0, 0, 0, 0, 0,
  ]);
  for (const month of months) assert.equal(Object.hasOwn(month, 'mortgageBalance'), true, month.month);
});

test('A HOUSEHOLD WITH NO LOAN CARRIES NO SUCH KEY IN ANY MONTH — the field is OMITTED, not nil', () => {
  for (const offset of [undefined, 0, 400_000]) {
    for (const month of project(SETTINGS, household({ offset }), [spend(60_000)])) {
      assert.equal(Object.hasOwn(month, 'mortgageBalance'), false, `offset ${offset}, ${month.month}`);
      assert.equal(month.mortgageBalance, undefined);
    }
  }
  // And the demo plan, which every other suite's figures are pinned against, states no loan — so
  // the whole of its walk is byte-identical to a build before this field existed.
  const demo = project(DEMO_PLAN.settings, DEMO_PLAN.household, DEMO_PLAN.entries.filter((e) => e.enabled));
  assert.equal(JSON.stringify(demo).includes('mortgageBalance'), false);
});

// --- 8. THE LOAN'S TERMS CAN CHANGE FROM A DATE (P3-16 slice 2) -----------------------------------
//
// `MORTGAGE_REFINANCE` was an `UnspecifiedParams` type and is now specified and walked. It is a
// `level` in `ENTRY_KIND`, so it holds from its date until another supersedes it, and it states all
// three figures — a partial change is not expressible, because the walk would have to reach back
// for whatever was in force.
//
// **The transitions enumerated beside the branch in `projection.ts` are the sections below**, one
// test each: (i) no loan throughout and (ii)/(iii) the two endings are §6 and §3 above; (iv) a
// dated change, (v) origination, (vi) a change after payoff, (vii) a change dated before
// `asAtDate`, (viii) supersession, (ix) the walk-time refusal and (x) a nil balance are here.

const refinance = (id, date, balance, rate, repayment, owner = 'household') => ({
  id,
  date,
  owner,
  type: 'MORTGAGE_REFINANCE',
  params: { openingBalance: toCents(balance), annualInterestRate: rate, monthlyRepayment: toCents(repayment) },
  enabled: true,
  createdAt: '2026-06-01',
});

test('(iv) A DATED CHANGE REPLACES ALL THREE FIGURES FROM ITS OWN MONTH, hand-worked across the join', () => {
  // The §1 loan for three months, then $400,000 at 4.8% repaid at $2,500 from 2026-12:
  //
  //   month 3  $400,000.00 × 0.048 ÷ 12 = $1,600.00 interest; $2,500 − $1,600 = $900.00 principal;
  //            $400,000.00 − $900.00 = $399,100.00 owing
  //   month 4  $399,100.00 × 0.004 = $1,596.40 interest; $903.60 principal; $398,196.40 owing
  //   month 5  $398,196.40 × 0.004 = $1,592.79 (rounded UP from $1,592.7856); $907.21 principal;
  //            $397,289.19 owing
  const months = project(SETTINGS, household({ mortgage: LOAN }), [spend(120_000), refinance('new-loan', '2026-12-01', 400_000, 0.048, 2_500)]);
  for (const month of months) assert.equal(month.openingBalance, 0, `${month.month}: an offset would move the interest`);
  assert.equal(months[3].month, '2026-12');
  // The three months BEFORE are the slice-1 schedule, untouched: a level does not act before its date.
  assert.deepEqual(months.slice(0, 3).map(interestIn), [[toCents(2_500)], [toCents(2_497.5)], [toCents(2_494.99)]]);
  assert.deepEqual(months.slice(0, 3).map((m) => m.mortgageBalance), [toCents(499_500), toCents(498_997.5), toCents(498_492.49)]);
  // And from the entry's own month all three figures are the entry's.
  assert.deepEqual(months.slice(3, 6).map(interestIn), [[toCents(1_600)], [toCents(1_596.4)], [toCents(1_592.79)]]);
  assert.deepEqual(months.slice(3, 6).map(principalIn), [[toCents(900)], [toCents(903.6)], [toCents(907.21)]]);
  assert.deepEqual(months.slice(3, 6).map((m) => m.mortgageBalance), [toCents(399_100), toCents(398_196.4), toCents(397_289.19)]);
  // **The BALANCE is reset and not carried**: $498,492.49 was owing the month before and $400,000
  // is owing now. A build that kept the running balance would price the new rate on the old debt.
  assert.notEqual(months[3].mortgageBalance, months[2].mortgageBalance - principalIn(months[3])[0]);
  assert.equal(months[3].mortgageBalance, toCents(400_000) - principalIn(months[3])[0]);
  // The repayment is the entry's from its month and the household's before it — one figure, twice.
  assert.deepEqual(months.map((m) => interestIn(m)[0] + principalIn(m)[0]).slice(0, 5), [
    toCents(3_000), toCents(3_000), toCents(3_000), toCents(2_500), toCents(2_500),
  ]);
  // **The lines are ATTRIBUTED to the entry that set the terms, and only from its month.** Before
  // it, the loan is the household's own and no entry states it.
  for (const month of months.slice(0, 3)) {
    for (const line of month.lines.filter((l) => l.description.startsWith('Mortgage'))) assert.equal(line.attribution.basis, 'none');
  }
  for (const month of months.slice(3)) {
    for (const line of month.lines.filter((l) => l.description.startsWith('Mortgage'))) {
      assert.equal(line.attribution.basis, 'entries');
      assert.deepEqual([...line.attribution.entryIds], ['new-loan']);
    }
  }
  // And the entry is CITED in every month it governs, not only in its own — `ENTRY_KIND` is `level`.
  assert.deepEqual(months.map((m) => m.appliedEntryIds.includes('new-loan')), [false, false, false, true, true, true, true, true]);
});

test('(iv) EACH of the three figures can be the one that moves — rate, repayment, balance', () => {
  // The change states all three every time; these three plans differ from the standing loan in one
  // figure each, so the effect of each is visible on its own.
  const base = (...entries) => project(SETTINGS, household({ mortgage: LOAN }), [spend(120_000), ...entries]);
  const unchanged = base(refinance('same', '2026-12-01', 498_492.49, 0.06, 3_000));
  // Restating the loan exactly as it stands changes nothing at all — the control for the other two.
  assert.deepEqual(unchanged.slice(3, 5).map(interestIn), [[toCents(2_492.47)], [toCents(2_489.93)]]);
  const rateOnly = base(refinance('rate', '2026-12-01', 498_492.49, 0.03, 3_000));
  assert.deepEqual(interestIn(rateOnly[3]), [toCents(1_246.24)], 'half the rate on the same balance is half the interest, rounded up');
  const repaymentOnly = base(refinance('repay', '2026-12-01', 498_492.49, 0.06, 4_000));
  assert.deepEqual(principalIn(repaymentOnly[3]), [toCents(1_507.53)], '$4,000 − $2,492.47');
  const balanceOnly = base(refinance('balance', '2026-12-01', 250_000, 0.06, 3_000));
  assert.deepEqual(interestIn(balanceOnly[3]), [toCents(1_250)], 'half the balance at the same rate');
  assert.equal(balanceOnly[3].mortgageBalance, toCents(248_250));
});

test('(v) ORIGINATION — a household with NO loan today can have one from a date', () => {
  // The case the user asked for, and it costs no branch: the terms in force start `undefined`, and
  // an entry sets them. Before the date there is no line and no key at all; from it there is a loan.
  const months = project(SETTINGS, household({}), [spend(120_000), refinance('first-home', '2026-12-01', 400_000, 0.048, 2_500)]);
  for (const month of months.slice(0, 3)) {
    assert.equal(Object.hasOwn(month, 'mortgageBalance'), false, month.month);
    assert.deepEqual(interestIn(month), []);
    assert.deepEqual(principalIn(month), []);
  }
  assert.deepEqual(months.slice(3, 5).map((m) => m.mortgageBalance), [toCents(399_100), toCents(398_196.4)]);
  assert.deepEqual(months.slice(3, 5).map(interestIn), [[toCents(1_600)], [toCents(1_596.4)]]);
  // The months before the entry are the walk of a household with no loan at all, to the byte.
  const noLoan = project(SETTINGS, household({}), [spend(120_000)]);
  assert.equal(JSON.stringify(months.slice(0, 3)), JSON.stringify(noLoan.slice(0, 3)));
});

test('(vi) A CHANGE DATED AFTER THE LOAN IS REPAID IS A NEW LOAN, not a refusal', () => {
  // $10,000 at no interest, $3,000 a month: cleared in month 3 (§3). A change dated 2027-01 — month
  // 4, after it is clear — starts a $50,000 loan at 6.0% repaid at $1,000:
  //
  //   month 4  $50,000.00 × 0.005 = $250.00 interest; $750.00 principal; $49,250.00 owing
  //   month 5  $49,250.00 × 0.005 = $246.25 interest; $753.75 principal; $48,496.25 owing
  const paidOff = { openingBalance: toCents(10_000), annualInterestRate: 0, monthlyRepayment: toCents(3_000) };
  // Spending far past the pension, so the month's cash opens at nil and the interest is priced on
  // the whole balance — the same device §1 uses to keep the walked figures the hand-worked ones.
  const months = project(SETTINGS, household({ mortgage: paidOff }), [spend(120_000), refinance('borrow-again', '2027-01-01', 50_000, 0.06, 1_000)]);
  for (const month of months) assert.equal(month.openingBalance, 0, month.month);
  assert.equal(months[4].month, '2027-01');
  // Cleared, then nothing for one month, then owing again — and nil was never mistaken for "no loan".
  assert.deepEqual(months.map((m) => m.mortgageBalance), [
    toCents(7_000), toCents(4_000), toCents(1_000), 0,
    toCents(49_250), toCents(48_496.25), toCents(47_738.74), toCents(46_977.44),
  ]);
  assert.deepEqual(months.map(principalIn), [
    [toCents(3_000)], [toCents(3_000)], [toCents(3_000)], [toCents(1_000)],
    [toCents(750)], [toCents(753.75)], [toCents(757.51)], [toCents(761.30)],
  ]);
  assert.deepEqual(interestIn(months[3]), [], 'the old loan was interest-free and had ended');
  assert.deepEqual(interestIn(months[4]), [toCents(250)]);
});

test('(vii) A CHANGE DATED BEFORE `asAtDate` IS THE LOAN IN FORCE, and applies from month 0', () => {
  // `ENTRY_KIND.MORTGAGE_REFINANCE` is `level`, so a pre-dated one is a standing fact that is still
  // true (P4-1d) and it supersedes the Household's own stated loan from the first month:
  //
  //   month 0  $200,000.00 × 0.05 ÷ 12 = $833.3333… → $833.34 interest (UP); $1,166.66 principal;
  //            $198,833.34 owing
  //   month 1  $198,833.34 × 0.05 ÷ 12 = $828.4722… → $828.48; $1,171.52; $197,661.82 owing
  const months = project(SETTINGS, household({ mortgage: LOAN }), [spend(120_000), refinance('old-refi', '2020-01-01', 200_000, 0.05, 2_000)]);
  assert.deepEqual(months.slice(0, 2).map(interestIn), [[toCents(833.34)], [toCents(828.48)]]);
  assert.deepEqual(months.slice(0, 2).map((m) => m.mortgageBalance), [toCents(198_833.34), toCents(197_661.82)]);
  // Not one month of the walk is on the Household's stated $500,000 loan.
  for (const month of months) assert.ok(month.mortgageBalance < toCents(200_000), month.month);
  assert.deepEqual(months.map((m) => m.appliedEntryIds.includes('old-refi')), months.map(() => true));
});

test('(viii) TWO CHANGES — the one in force is the last to have applied, and the earlier one still governed its own months', () => {
  const months = project(SETTINGS, household({ mortgage: LOAN }), [
    spend(120_000),
    refinance('first', '2026-10-01', 300_000, 0.06, 3_000),
    refinance('second', '2026-12-01', 100_000, 0.06, 3_000),
  ]);
  // Month 0 the household's own loan; months 1-2 the first entry; months 3+ the second.
  assert.equal(months[0].mortgageBalance, toCents(499_500));
  assert.equal(months[1].mortgageBalance, toCents(298_500), '$300,000 less ($3,000 − $1,500) of principal');
  assert.equal(months[3].mortgageBalance, toCents(97_500), '$100,000 less ($3,000 − $500)');
  // The attribution follows the terms, month by month — a superseded entry does not keep the line.
  const attributed = (m) => m.lines.filter((l) => l.description.startsWith('Mortgage')).map((l) => (l.attribution.basis === 'entries' ? l.attribution.entryIds[0] : null));
  assert.deepEqual(attributed(months[0]), [null, null]);
  assert.deepEqual(attributed(months[1]), ['first', 'first']);
  assert.deepEqual(attributed(months[3]), ['second', 'second']);
  // Both are cited from their own month on, because both are levels; only one sets the figure.
  assert.deepEqual(months.map((m) => m.appliedEntryIds.includes('second')), [false, false, false, true, true, true, true, true]);
});

test('(ix) AN UNPAYABLE DATED CHANGE IS REFUSED IN THE WALK, BY THE ENTRY’S ID AND THE MONTH', () => {
  // $500,000 at 6.0% costs $2,500.00 a month and $2,400 does not cover it — the §4 refusal, reached
  // through an entry this time. **The door cannot refuse this**: the interest depends on the offset
  // balance in 2026-12, which is an output of `project()`. So the file parses and the walk refuses.
  const entries = [spend(120_000), refinance('too-small', '2026-12-01', 500_000, 0.06, 2_400)];
  const error = thrown(() => project(SETTINGS, household({}), entries));
  assert.ok(error instanceof RangeError, 'the refusal is a RangeError, in `mortgageMonth`’s own idiom');
  assert.match(error.message, /"too-small"/, 'the refusal does not name the entry the user has to fix');
  assert.match(error.message, /2026-12/, 'the refusal does not name the month it failed in');
  assert.match(error.message, /never be repaid/, '`mortgageMonth`’s own words are kept, not reworded');
  assert.ok(error.message.includes('240000') && error.message.includes('250000'), 'the two figures are kept');
  // **And the door really does let it through** — which is the gap `parsePlan` states plainly.
  const file = JSON.parse(JSON.stringify(DEMO_PLAN));
  file.entries.push(refinance('too-small', '2040-01-01', 5_000_000, 0.06, 2_400));
  file.scenarios[0].entryIds.push('too-small');
  assert.equal(parsePlan(file).entries.at(-1).id, 'too-small', 'the door refused a loan it cannot price');

  // The Household's OWN loan still names itself rather than an entry, and still says the month.
  const stated = thrown(() => project(SETTINGS, household({ mortgage: { openingBalance: toCents(500_000), annualInterestRate: 0.06, monthlyRepayment: toCents(2_400) } }), [spend(12_000)]));
  assert.match(stated.message, /stated on the household itself/);
  assert.match(stated.message, /2026-09/);
  assert.doesNotMatch(stated.message, /entry/);
});

test('(x) A CHANGE STATING A NIL BALANCE IS REFUSED AT THE DOOR — and it points at MORTGAGE_PAYOFF', () => {
  const file = JSON.parse(JSON.stringify(DEMO_PLAN));
  const withParams = (params) => {
    const copy = JSON.parse(JSON.stringify(file));
    copy.entries.push({ ...refinance('r', '2030-01-01', 0, 0.06, 3_000), params });
    copy.scenarios[0].entryIds.push('r');
    return copy;
  };
  const nil = thrown(() => parsePlan(withParams({ openingBalance: 0, annualInterestRate: 0.06, monthlyRepayment: toCents(3_000) })));
  assert.ok(nil instanceof PlanFileEntryError);
  assert.match(nil.message, /openingBalance/);
  // NARROWED 2026-09-23: this used to say a lump-sum payout was "not modelled". It is modelled now,
  // as its own entry, so the refusal names that entry instead — still a refusal, never a nil loan.
  assert.match(nil.message, /MORTGAGE_PAYOFF/, 'the refusal does not point at the entry that pays a loan off');
  assert.match(nil.message, /Home loan — pay off in full/, 'the refusal does not name the entry as the form labels it');
  assert.doesNotMatch(nil.message, /not modelled/, 'the refusal still says a payoff is not modelled');
  // The other three refusals, each by name and path — the same three `parseMortgage` makes.
  assert.match(thrown(() => parsePlan(withParams({ openingBalance: -1, annualInterestRate: 0.06, monthlyRepayment: toCents(3_000) }))).message, /openingBalance.*negative/s);
  assert.match(thrown(() => parsePlan(withParams({ openingBalance: toCents(1), annualInterestRate: -0.01, monthlyRepayment: toCents(3_000) }))).message, /annualInterestRate/);
  assert.match(thrown(() => parsePlan(withParams({ openingBalance: toCents(1), annualInterestRate: 0.06, monthlyRepayment: 0 }))).message, /monthlyRepayment.*never repaid/s);
  assert.match(thrown(() => parsePlan(withParams({ openingBalance: toCents(1), annualInterestRate: 0.06, monthlyRepayment: -1 }))).message, /monthlyRepayment.*negative/s);
  // A missing figure is refused: three or nothing, because a partial change is not expressible.
  assert.throws(() => parsePlan(withParams({ openingBalance: toCents(400_000), annualInterestRate: 0.06 })), PlanFileEntryError);
  assert.throws(() => parsePlan(withParams({ openingBalance: toCents(400_000), monthlyRepayment: toCents(3_000) })), PlanFileEntryError);
  assert.throws(() => parsePlan(withParams({ annualInterestRate: 0.06, monthlyRepayment: toCents(3_000) })), PlanFileEntryError);
  // An unknown key is refused rather than dropped, on the door's standing rule.
  assert.match(thrown(() => parsePlan(withParams({ openingBalance: toCents(1), annualInterestRate: 0.06, monthlyRepayment: toCents(3_000), termYears: 25 }))).message, /"termYears"/);
  // A nil RATE is accepted here exactly as it is on the Household — a family loan at no interest.
  assert.equal(parsePlan(withParams({ openingBalance: toCents(400_000), annualInterestRate: 0, monthlyRepayment: toCents(3_000) })).entries.at(-1).params.annualInterestRate, 0);
});

test('A PLAN WITH NO MORTGAGE ENTRY IS BYTE-IDENTICAL — a switched-off change moves nothing', () => {
  // `enabled: false` is the append-only delete (ADR-0002), so the same plan with the entry switched
  // off must walk exactly as the plan without it — which is the proof that the branch is reached by
  // an applied entry and by nothing else.
  const without = project(SETTINGS, household({ mortgage: LOAN }), [spend(120_000)]);
  const disabled = project(SETTINGS, household({ mortgage: LOAN }), [spend(120_000), { ...refinance('off', '2026-12-01', 400_000, 0.048, 2_500), enabled: false }]);
  assert.equal(JSON.stringify(disabled), JSON.stringify(without));
  // And a household with no loan and no entry still says nothing about a mortgage anywhere.
  const none = project(SETTINGS, household({}), [spend(60_000)]);
  assert.equal(JSON.stringify(none).toLowerCase().includes('mortgage'), false);
});

test('(viii, and a transition the brief did not list) TWO CHANGES IN THE SAME MONTH — the later-stated one wins', () => {
  // A case worth pinning because nothing else in the walk decides it: two `MORTGAGE_REFINANCE`
  // entries on the SAME date. They land in one month's bucket in the plan's own order (ADR-0002's
  // append-only journal), the branch is a plain reassignment, so the LAST one stated is the one in
  // force. The alternative readings — the first wins, or the two are summed — would both make the
  // forecast depend on something the user cannot see.
  const months = project(SETTINGS, household({}), [
    spend(120_000),
    refinance('stated-first', '2026-11-01', 300_000, 0.06, 3_000),
    refinance('stated-second', '2026-11-01', 100_000, 0.06, 3_000),
  ]);
  assert.equal(months[2].month, '2026-11');
  assert.equal(months[2].mortgageBalance, toCents(97_500), 'the second entry’s $100,000 less ($3,000 − $500)');
  assert.deepEqual(interestIn(months[2]), [toCents(500)], 'not the first entry’s $1,500');
  const attributed = months[2].lines.filter((l) => l.description.startsWith('Mortgage')).map((l) => l.attribution.entryIds[0]);
  assert.deepEqual(attributed, ['stated-second', 'stated-second']);
  // Reversing the plan's order reverses the answer — which is what makes the claim above a claim
  // about ORDER and not an accident of these two figures.
  const reversed = project(SETTINGS, household({}), [
    spend(120_000),
    refinance('stated-second', '2026-11-01', 100_000, 0.06, 3_000),
    refinance('stated-first', '2026-11-01', 300_000, 0.06, 3_000),
  ]);
  assert.equal(reversed[2].mortgageBalance, toCents(298_500));
});

test('(and one more) A PRE-DATED CHANGE BEATS THE HOUSEHOLD’S OWN STATED LOAN, and two pre-dated ones resolve by date', () => {
  // `Household.mortgage` is the Day-1 statement; a `level` dated before `asAtDate` is a fact that is
  // still true and applies from month 0, so it supersedes it. Two pre-dated ones: the LATER date is
  // the one in force (`standing` keeps the later, and on an equal date the later-stated).
  const months = project(SETTINGS, household({ mortgage: LOAN }), [
    spend(120_000),
    refinance('older', '2018-01-01', 300_000, 0.06, 3_000),
    refinance('newer', '2020-01-01', 200_000, 0.05, 2_000),
  ]);
  assert.equal(months[0].mortgageBalance, toCents(198_833.34), 'the 2020 entry, not the 2018 one and not the household’s');
  assert.deepEqual(interestIn(months[0]), [toCents(833.34)]);
});
