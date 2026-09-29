// Interest on running cash (user rulings, 2026-09-23). The Offset — the walk's running cash — earns
// `Settings.cashInterestRate`, or the plan's own CPI where none is stated, on max(0, cash − loan
// owing), a twelfth a month, rounded down. Each owner's share (`Household.offsetShares`, absent: an
// equal split for a couple) is assessable income through the ordinary income-tax path, and it is NOT
// Age Pension income: the cash is already deemed.
//
// Every figure below is worked by hand from the fixture, and each test names the mutation it exists
// to catch.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { toCents } from '../dist/core/money.js';
import { AGE_PENSION_LINE, CASH_INTEREST_LINE, MORTGAGE_INTEREST_LINE, TAX_TRUE_UP_LINE, project } from '../dist/core/projection.js';
import { offsetInterestByOwner, offsetSharesOf } from '../dist/core/household.js';
import { pensionOnlyAge } from '../dist/core/outcomes.js';
import { PlanFileHouseholdError, PlanFileSettingsError, parsePlan } from '../dist/core/parsePlan.js';
import { DEMO_PLAN } from '../dist/app/demoHousehold.js';
import {
  planWithSettings,
  planWithStatedPosition,
  positionFormValues,
  settingsFormValues,
} from '../dist/app/planEdits.js';
import { CASH_INTEREST_NOTICE, CASH_INTEREST_SUMMARY } from '../dist/app/settingsPanel.js';

const person = (name, dateOfBirth, over = {}) => ({
  name,
  dateOfBirth,
  superInterests: [],
  parcels: [],
  employmentIncomePerFortnight: toCents(0),
  workBonusBalance: toCents(0),
  ...over,
});

const SETTINGS = (over = {}) => ({
  asAtDate: '2026-07-01',
  planningHorizonAge: 52,
  // Pay rising with wages (2026-09-23) is not this fixture's subject: `awote: 0` holds every salary at the figure stated. A proved control: every figure this file asserts is the same at nil on the build before pay rose.
  economicSeries: { cpi: 0.025, pblci: 0.025, awote: 0, mtawe: 0.035 },
  deemingRates: { lower: 0.0175, upper: 0.0375 },
  nominalReturn: 0,
  ...over,
});

const entry = (id, type, date, owner, params) => ({ id, date, owner, type, params, enabled: true, createdAt: '2026-06-01' });

const amountOf = (month, description) =>
  month.lines.filter((line) => line.description === description).reduce((total, line) => total + line.amount, 0);
const interestOf = (month) =>
  month.lines.filter((line) => line.description.startsWith(`${CASH_INTEREST_LINE}, `)).reduce((total, line) => total + line.amount, 0);

/** Sam, 50, alone, no salary: nothing but the cash. */
const SAM = (cash, over = {}) => ({
  persons: [person('Sam', '1976-05-10', over)],
  homeStatus: 'occupied',
  openingOffsetBalance: toCents(cash),
});

// --- 1. A twelfth of the annual rate, on the cash above the loan -------------------------------------

test('a TWELFTH of the annual rate a month: $120,000 at 6% earns $600.00, not $7,200', () => {
  // Mutation caught: the annual rate applied monthly without dividing by 12.
  const months = project(SETTINGS({ cashInterestRate: 0.06 }), SAM(120_000), []);
  assert.equal(amountOf(months[0], `${CASH_INTEREST_LINE}, Sam`), toCents(600));
  // It is cash: it lands in the Offset, and the ledger holds — no salary, no spending, no tax
  // (annualised $7,200 is under the tax-free threshold).
  assert.equal(months[0].closingBalance, toCents(120_600));
  // And month 1 is paid on month 1's opening cash: $120,600 × 0.5% = $603.00.
  assert.equal(amountOf(months[1], `${CASH_INTEREST_LINE}, Sam`), toCents(603));
  const line = months[0].lines.find((each) => each.description === `${CASH_INTEREST_LINE}, Sam`);
  assert.deepEqual([line.direction, line.effect], ['inflow', 'cash']);
});

test('rounded DOWN: $1,000.01 at 5% is 416.67 cents a month, paid as 416', () => {
  const months = project(SETTINGS({ cashInterestRate: 0.05 }), { ...SAM(0), openingOffsetBalance: 100_001 }, []);
  assert.equal((100_001 * 0.05) / 12 > 416, true);
  assert.equal(interestOf(months[0]), 416);
});

const MORTGAGE = { openingBalance: toCents(100_000), annualInterestRate: 0.06, monthlyRepayment: toCents(1_000) };

test('only the cash ABOVE the loan earns — each dollar cancels loan interest or earns this rate, never both', () => {
  // Mutation caught: interest paid on dollars that are offsetting a loan.
  // $120,000 of cash against $100,000 owed: $20,000 earns 6% / 12 = $100.00, and the loan is charged
  // nothing because the offset covers it.
  const over = project(SETTINGS({ cashInterestRate: 0.06 }), { ...SAM(120_000), mortgage: MORTGAGE }, []);
  assert.equal(interestOf(over[0]), toCents(100));
  assert.equal(amountOf(over[0], MORTGAGE_INTEREST_LINE), 0);
  // $80,000 against $100,000: the cash earns nothing and the loan is charged on $20,000 — $100.00.
  const under = project(SETTINGS({ cashInterestRate: 0.06 }), { ...SAM(80_000), mortgage: MORTGAGE }, []);
  assert.equal(interestOf(under[0]), 0);
  assert.equal(under[0].lines.some((line) => line.description.startsWith(CASH_INTEREST_LINE)), false);
  // The mirror, as one identity: with the loan and the cash at the SAME rate, the month's loan
  // interest less its cash interest is the rate on (owed − cash), whichever side of nil that falls.
  for (const [months, cash] of [[over, 120_000], [under, 80_000]]) {
    const charged = amountOf(months[0], MORTGAGE_INTEREST_LINE);
    assert.equal(charged - interestOf(months[0]), toCents(((100_000 - cash) * 0.06) / 12));
  }
});

// --- 2. Assessable income, through the ordinary income-tax path -------------------------------------

test('the MONTHLY accrual taxes it: $7,200 a year of interest on an $80,600 salary costs $192.00 a month', () => {
  // Mutation caught: interest left out of taxable income.
  // Sam is paid $3,100 a fortnight — $80,600, taxable $79,600 after the $1,000 work deduction. Month
  // 0's interest is $600, annualised $7,200, which lands wholly in the 30% bracket; LITO is nil at
  // both incomes (above $66,667) and the Medicare levy is the full 2%. 32% × $7,200 = $2,304 a year.
  const household = SAM(120_000, { employmentIncomePerFortnight: toCents(3_100), superInterests: [{ phase: 'accumulation', balance: toCents(0) }] });
  const withInterest = project(SETTINGS({ cashInterestRate: 0.06 }), household, []);
  const without = project(SETTINGS({ cashInterestRate: 0 }), household, []);
  const delta = amountOf(withInterest[0], 'Income tax, Sam') - amountOf(without[0], 'Income tax, Sam');
  assert.ok(Math.abs(delta - toCents(192)) <= 1, `the month's tax moved by ${delta} cents`);
});

test('the YEAR-END SETTLEMENT taxes the year’s actual interest: the year costs what the same sum of salary would', () => {
  // Mutation caught: interest left out of the settlement (the monthly accrual alone is annualised
  // month by month, so only the settlement sees the year's real total).
  //
  // In FY2026-27 a dollar of interest and a dollar of salary above the $1,000 work deduction reach
  // taxable income identically — no WATO exists that year, LITO and the levy read taxable income —
  // so a year of interest I on salary S must settle to exactly the tax on a salary of S + I. The walk
  // below banks its surplus, so its interest rises every month and no single month's accrual is the
  // year's figure: only the settlement can land it.
  const household = SAM(120_000, { employmentIncomePerFortnight: toCents(3_100), superInterests: [{ phase: 'accumulation', balance: toCents(0) }] });
  const fy = (month) => month.month >= '2026-07' && month.month <= '2027-06';
  const incomeTaxFor = (months) => {
    const accrued = months.filter(fy).reduce((total, month) => total + amountOf(month, 'Income tax, Sam'), 0);
    const settled = months.find((month) => month.month === '2027-07').lines
      .filter((line) => line.description === `${TAX_TRUE_UP_LINE}, Sam, 2026-27`)
      .reduce((total, line) => total + (line.direction === 'outflow' ? line.amount : -line.amount), 0);
    return accrued + settled;
  };
  const withInterest = project(SETTINGS({ cashInterestRate: 0.06 }), household, []);
  const yearInterest = withInterest.filter(fy).reduce((total, month) => total + interestOf(month), 0);
  assert.ok(yearInterest > toCents(7_200), 'the interest must rise through the year for this to test the settlement');
  const asSalary = project(SETTINGS({ cashInterestRate: 0 }), household, [
    entry('pay', 'WORK_PATTERN_CHANGE', '2026-07-01', 'personA', { daysPerWeek: 5, annualSalary: toCents(80_600) + yearInterest }),
  ]);
  // Within the settlement's own one-dollar de minimis, and the rounding of twelve twelfths.
  assert.ok(Math.abs(incomeTaxFor(withInterest) - incomeTaxFor(asSalary)) <= toCents(1), `${incomeTaxFor(withInterest)} against ${incomeTaxFor(asSalary)}`);
});

// --- 3. NOT Age Pension income -----------------------------------------------------------------------

test('the Age Pension does NOT count it: month 0 pays the same pension at 0% and at 20%', () => {
  // Mutation caught: interest counted in the Age Pension income test.
  // Pat, 71, a homeowner holding $500,000 of cash. Month 0 is assessed on the cash the month opens
  // with, which the rate cannot touch, so the pension must be identical — while 20% pays $8,333.33 of
  // interest that month, far more than would be needed to close the pension through the income test.
  const pat = { persons: [person('Pat', '1955-03-01')], homeStatus: 'occupied', openingOffsetBalance: toCents(500_000) };
  const settings = (rate) => SETTINGS({ asAtDate: '2026-09-01', planningHorizonAge: 72, cashInterestRate: rate });
  const nil = project(settings(0), pat, []);
  const high = project(settings(0.2), pat, []);
  assert.ok(amountOf(nil[0], AGE_PENSION_LINE) > 0, 'the control: Pat is paid a pension');
  assert.equal(interestOf(high[0]), 833_333);
  assert.equal(amountOf(high[0], AGE_PENSION_LINE), amountOf(nil[0], AGE_PENSION_LINE));
});

// --- 4. Ownership: the shares, and their absence ------------------------------------------------------

const COUPLE = (shares) => ({
  persons: [person('Ann', '1976-05-10'), person('Ben', '1976-05-10', { employmentIncomePerFortnight: toCents(5_000), superInterests: [{ phase: 'accumulation', balance: toCents(0) }] })],
  homeStatus: 'occupied',
  openingOffsetBalance: toCents(120_000),
  ...(shares === undefined ? {} : { offsetShares: shares }),
});

test('each owner is paid their SHARE, on their own line, and taxed on it as their own income', () => {
  // Mutation caught: shares ignored, all of it to Person 1.
  // $600 at 25/75: Ann $150.00, Ben $450.00. Ben is paid $130,000 — taxable $129,000 — so his $5,400
  // a year stays in the 30% bracket with the full 2% levy: 32% × $5,400 = $1,728, $144.00 a month.
  // Ann's $1,800 a year is under the tax-free threshold and costs her nothing.
  const walk = project(SETTINGS({ cashInterestRate: 0.06 }), COUPLE([0.25, 0.75]), []);
  const nil = project(SETTINGS({ cashInterestRate: 0 }), COUPLE([0.25, 0.75]), []);
  assert.equal(amountOf(walk[0], `${CASH_INTEREST_LINE}, Ann`), toCents(150));
  assert.equal(amountOf(walk[0], `${CASH_INTEREST_LINE}, Ben`), toCents(450));
  const benDelta = amountOf(walk[0], 'Income tax, Ben') - amountOf(nil[0], 'Income tax, Ben');
  assert.ok(Math.abs(benDelta - toCents(144)) <= 1, `Ben's tax moved by ${benDelta}`);
  assert.equal(amountOf(walk[0], 'Income tax, Ann'), 0);
});

test('ABSENT shares are an equal split for a couple and the whole for one Person', () => {
  const walk = project(SETTINGS({ cashInterestRate: 0.06 }), COUPLE(undefined), []);
  assert.equal(amountOf(walk[0], `${CASH_INTEREST_LINE}, Ann`), toCents(300));
  assert.equal(amountOf(walk[0], `${CASH_INTEREST_LINE}, Ben`), toCents(300));
  assert.deepEqual(offsetSharesOf(COUPLE(undefined)), [0.5, 0.5]);
  assert.deepEqual(offsetSharesOf(SAM(1)), [1]);
  // An odd cent goes to the last owner, so the parts always sum to the whole.
  assert.deepEqual(offsetInterestByOwner(COUPLE(undefined), 101), [50, 51]);
  assert.deepEqual(offsetInterestByOwner(COUPLE([1 / 3, 2 / 3]), 100), [33, 67]);
});

// --- 5. The rate: absent follows CPI, a stated rate wins, a stated nil earns nothing -----------------

test('ABSENT means the plan’s own CPI; a stated rate wins; a stated 0 earns nothing', () => {
  // Mutation caught: absent treated as 0 instead of CPI.
  const cpi = (rate, over = {}) => SETTINGS({ economicSeries: { cpi: rate, pblci: 0.025, awote: 0.035, mtawe: 0.035 }, ...over });
  // $120,000 × 3% / 12 = $300.00; × 4% / 12 = $400.00.
  assert.equal(interestOf(project(cpi(0.03), SAM(120_000), [])[0]), toCents(300));
  assert.equal(interestOf(project(cpi(0.04), SAM(120_000), [])[0]), toCents(400));
  assert.equal(interestOf(project(cpi(0.03, { cashInterestRate: 0.05 }), SAM(120_000), [])[0]), toCents(500));
  const nil = project(cpi(0.03, { cashInterestRate: 0 }), SAM(120_000), []);
  assert.equal(nil.flatMap((month) => month.lines).filter((line) => line.description.startsWith(CASH_INTEREST_LINE)).length, 0);
});

// --- 6. Living on the pension is still living on the pension -----------------------------------------

test('interest on a pensioner’s banked surplus does not end a Pension-Only run', () => {
  // Two pensioners with nothing, spending less than the pension: the run opens in month 0 and the
  // surplus is banked from then on, so every later month earns interest on it. P4-5b ruled that cash
  // a Household on the pension holds IS the pension's own surplus; its interest is that surplus
  // earning, and the run must be the same length with it as without it.
  const pair = {
    persons: [person('Kim', '1955-03-01'), person('Lee', '1956-04-01')],
    homeStatus: 'occupied',
  };
  const spend = [entry('s', 'SPEND_CHANGE', '2026-09-01', 'household', { annualSpend: toCents(30_000) })];
  const walk = (rate) => project(SETTINGS({ asAtDate: '2026-09-01', planningHorizonAge: 75, cashInterestRate: rate }), pair, spend);
  const earning = walk(0.03);
  assert.ok(earning.slice(1).every((month) => interestOf(month) > 0), 'the control: every month after the first earns interest');
  const withInterest = pensionOnlyAge(earning, pair, undefined);
  const without = pensionOnlyAge(walk(0), pair, undefined);
  assert.equal(without.monthsPensionOnly, earning.length);
  assert.equal(withInterest.monthsPensionOnly, without.monthsPensionOnly);
});

// --- 7. The door ------------------------------------------------------------------------------------

const onDisk = () => JSON.parse(JSON.stringify(DEMO_PLAN));
const withSettings = (over) => { const file = onDisk(); Object.assign(file.settings, over); return file; };
const withShares = (shares) => { const file = onDisk(); file.household.offsetShares = shares; return file; };

test('the door: a rate from nil up is read, a negative one is refused by name', () => {
  assert.equal(parsePlan(withSettings({ cashInterestRate: 0 })).settings.cashInterestRate, 0);
  assert.equal(parsePlan(withSettings({ cashInterestRate: 0.045 })).settings.cashInterestRate, 0.045);
  assert.equal(Object.hasOwn(parsePlan(onDisk()).settings, 'cashInterestRate'), false);
  assert.throws(() => parsePlan(withSettings({ cashInterestRate: -0.01 })), (error) => error instanceof PlanFileSettingsError && /cashInterestRate/.test(error.message));
  assert.throws(() => parsePlan(withSettings({ cashInterestRate: '3%' })), PlanFileSettingsError);
});

test('the door: shares must be one per Person, each 0 to 1, summing to 1 — or the plan is refused by name', () => {
  assert.deepEqual(parsePlan(withShares([0.3, 0.7])).household.offsetShares, [0.3, 0.7]);
  assert.deepEqual(parsePlan(withShares([1, 0])).household.offsetShares, [1, 0]);
  for (const shares of [[0.5, 0.4], [0.5], [0.5, 0.5, 0], [1.2, -0.2], [0.5, '0.5']]) {
    assert.throws(
      () => parsePlan(withShares(shares)),
      (error) => error instanceof PlanFileHouseholdError && /offsetShares/.test(error.message),
      `${JSON.stringify(shares)} was accepted`,
    );
  }
  // And the walk refuses the same shapes itself, for a caller who never came through the door.
  assert.throws(() => project(SETTINGS({ cashInterestRate: 0.06 }), COUPLE([0.6, 0.6]), []), /add up to/);
});

// --- 8. The page --------------------------------------------------------------------------------------

test('the Settings box: blank follows CPI and writes no key, a typed 0 is kept', () => {
  const plan = parsePlan(onDisk());
  const values = settingsFormValues(plan);
  assert.equal(values.cashInterestRate, '');
  assert.deepEqual(planWithSettings(plan, values).settings, plan.settings, 'a blank box re-writes the settings key for key');
  assert.equal(planWithSettings(plan, { ...values, cashInterestRate: '0' }).settings.cashInterestRate, 0);
  assert.equal(planWithSettings(plan, { ...values, cashInterestRate: '0.035' }).settings.cashInterestRate, 0.035);
  assert.equal(settingsFormValues(parsePlan(withSettings({ cashInterestRate: 0.02 }))).cashInterestRate, '0.02');
});

test('the share box: a couple is pre-filled 50, which writes no key; anything else writes both shares', () => {
  const plan = parsePlan(onDisk());
  assert.equal(plan.household.persons.length, 2);
  const values = positionFormValues(plan);
  assert.equal(values.offsetSharePercent, '50');
  assert.equal(Object.hasOwn(planWithStatedPosition(plan, values).household, 'offsetShares'), false);
  assert.deepEqual(planWithStatedPosition(plan, { ...values, offsetSharePercent: '30' }).household.offsetShares, [0.3, 0.7]);
  const stated = parsePlan(withShares([0.3, 0.7]));
  assert.equal(positionFormValues(stated).offsetSharePercent, '30');
  assert.deepEqual(planWithStatedPosition(stated, positionFormValues(stated)).household.offsetShares, [0.3, 0.7]);
  // An equal split typed back over STATED shares is kept as stated, not dropped.
  assert.deepEqual(planWithStatedPosition(stated, { ...values, offsetSharePercent: '50' }).household.offsetShares, [0.5, 0.5]);
  // A blank box on a couple is not an answer: the door refuses it by name.
  assert.throws(() => parsePlan(planWithStatedPosition(plan, { ...values, offsetSharePercent: '' })), (error) => error instanceof PlanFileHouseholdError && /offsetShares/.test(error.message));
  // A single Person owns the whole of it and is asked nothing.
  const single = { ...plan, household: { ...plan.household, persons: [plan.household.persons[0]] } };
  assert.equal(positionFormValues(single).offsetSharePercent, '');
});

test('the box says what blank means, and the guide says the three things the user asked for: inflation, how it is taxed, and the Age Pension', () => {
  // The user asked (2026-09-23) for three things to be said beside this box. P17-3 (2026-09-28, also
  // the user's ruling) took every rule out of the ⓘ boxes and into the guide, so the box keeps what
  // blank means and the three are pinned on the guide instead.
  assert.match(CASH_INTEREST_SUMMARY, /CPI/);
  assert.match(CASH_INTEREST_SUMMARY, /empty/i);
  assert.match(CASH_INTEREST_NOTICE, /each month/);
  const guide = readFileSync(new URL('../userguide.md', import.meta.url), 'utf8');
  const section = (from, to) => guide.slice(guide.indexOf(`{#${from}}`), guide.indexOf(to, guide.indexOf(`{#${from}}`)));
  const otherAssumptionBoxes = section('other-assumption-boxes', '\n### ');
  assert.match(otherAssumptionBoxes, /Leave it empty and it matches price rises/);
  // P17-3a: that only cash ABOVE the home loan owing earns this interest.
  assert.match(otherAssumptionBoxes, /above what you still owe on your home loan/i);
  assert.match(section('offset-account', '\n### '), /whose income the interest is, for tax/);
  assert.match(section('deeming', '\n### '), /doesn't ask what your savings/);
});
