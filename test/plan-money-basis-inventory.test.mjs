// **EVERY USER-STATED MONEY FIGURE IN A PLAN, AND WHICH MONEY IT IS IN** — the inventory register
// O85 asked for on 2026-09-21, once the spending level was ruled REAL.
//
// **Why a file and not a paragraph.** O85 was a defect of a CLASS, not of a field: one figure that
// a household states as a standard of living was being held flat in the engine's own future dollars.
// Fixing `annualSpend` alone would have left the same question unasked of the seventeen other money
// boxes this build collects, and the next one to be found would have been found the same way — by
// someone reading a screen and not recognising their own number. So the whole class is written down,
// each figure with the direction its current treatment runs in, and this file is the part of that
// inventory a machine can check.
//
// **THE TEST THAT DECIDES WHICH SIDE A FIGURE IS ON**, and it is the user's own: does the figure
// name *an amount of money owed or contracted* — a loan balance, a repayment, a stated debt, a
// balance held today — or *a life the user wants to buy* — spending, a floor, a target? The first is
// NOMINAL and must not be indexed; the second is REAL and must be.
//
// ⚠️ **THIS FILE FIXED NOTHING WHEN IT WAS WRITTEN AND PINS NOTHING IT BELIEVES TO BE WRONG.** Two
// figures came out of the inventory mistreated — `SuperInterest.statedAdministrationFeePerYear`
// (register O87) and `SalarySacrificeContributionParams.annualAmount` (register O88) — and each got
// a register row, a TODO item and, here, a canary that asserts the GAP and its DIRECTION rather than
// the rule. A canary of that shape is this repo's convention for a known-unsafe gap: the day
// somebody closes it the canary goes red and is replaced by the rule, which is what stops a silent
// fix from looking like a refactor.
//
// ✅ **AND THAT IS EXACTLY WHAT HAPPENED TO O87 ON 2026-09-21** — the user ruled the dollar
// administration fee REAL, §4's first canary went red, and it was REPLACED by the identity that
// states the new rule rather than deleted. §1's call-site count went from two to three in the same
// change. **O88 is still open and its canary still asserts a gap**; its question is not O87's,
// because a salary sacrifice may want the WAGE series rather than prices.
//
// The four sections:
//
//   1. the four figures that ARE indexed — three to prices and, since 2026-09-23, the salary to
//      wages — and the fact that they are the only four;
//   2. the STOCKS — balances stated as at the plan's own date — which must never be indexed;
//   3. the CONTRACTED figures — the home loan's balance and repayment — which must never be either;
//   4. the ONE remaining known gap, asserted as a gap with its direction — and beside it the
//      figure that used to be the other one, now asserted as a RULE.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { priceLevelFactor } from '../dist/core/priceLevel.js';
import { mulCents, toCents } from '../dist/core/money.js';
import { project } from '../dist/core/projection.js';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = (...parts) => readFileSync(join(ROOT, 'src', ...parts), 'utf8');

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
  asAtDate: '2026-07-01',
  planningHorizonAge: 70,
  economicSeries: { cpi: 0.025, pblci: 0.025, awote: 0.035, mtawe: 0.035 },
  deemingRates: { lower: 0.0175, upper: 0.0375 },
  nominalReturn: 0,
  // Interest on cash (2026-09-23) is not this fixture's subject: stated nil, the control proved byte-identical to the walk before it existed.
  cashInterestRate: 0,
};

const entry = (id, type, date, params, owner = 'household') => ({
  id,
  date,
  owner,
  type,
  params,
  enabled: true,
  createdAt: '2026-06-01',
});

const amountOf = (month, description) =>
  month.lines.filter((line) => line.description === description).reduce((total, line) => total + line.amount, 0);

// --- 1. THE INDEXED FIGURES, AND THE FACT THAT THEY ARE THE ONLY THREE ---------------------------

test('EXACTLY TEN figures/call sites in `src/core` raise a stated figure to a month’s (or an entry’s own) level, and here they are', () => {
  // `inflateStated` is the only way a stated figure becomes nominal — `priceLevel.ts` is the one
  // expression and `todaysDollars.ts` is the other direction. So the call sites ARE the inventory's
  // "real" column, and counting them is how a TENTH figure cannot be indexed without this test going
  // red and somebody having to write the row.
  //
  // **It was TWO until 2026-09-21 and it is THREE because a ruling was made, not because a counter
  // was in the way.** Register O87 moved `SuperInterest.statedAdministrationFeePerYear` into this
  // column. **FOUR since 2026-09-23** (pay rises with wages). **FIVE since 2026-09-25 (P14-5a)**
  // (ENTER_CARE's vacated-home value). **It is EIGHT since 2026-09-25 (this ruling: a price a
  // household TYPES on a future-dated entry is in TODAY's money, `SpendChangeParams.annualSpend`'s
  // own basis) — THREE new sites, not four, because `ENTER_CARE`'s RAD/DAP/entry-home-value,
  // `SELL_HOME`'s three figures, `RENT_OUT_HOME`'s five, `HEAS_DRAW`'s securityValue/fortnightlyAmount
  // and its advances ALL go through ONE new shared lens, `projection.ts`'s own `atTodaysMoney` —
  // itself a single `inflateStated` call, on `atWageLevel`'s own idiom — plus TWO sites in
  // `parsePlan.ts`, where a STATED `HEAS_DRAW` fortnightlyAmount/advance must be raised to nominal
  // before it can be checked against a nominal legislated cap at the door.** The count is the whole
  // device: raising a figure is a deliberate act with a register row attached, and the day somebody
  // **NINE since 2026-09-25 (P3-17 slice 4):** the fund's dollar fee is raised by WAGES in accumulation
  // and by CPI in the pension phase (the fund's own schedule, ~/.enough/verification/P13-1c-aware-soa-extract.md p.15),
  // so `monthlySuperFeesForOneMonth`'s one CPI closure became two, one per series.
  // finds themselves loosening this assertion to get a build green is the day the device is working.
  const sources = ['core/projection.ts', 'core/outcomes.ts', 'core/priceLevel.ts', 'core/parsePlan.ts'];
  const calls = sources.flatMap((file) =>
    read(...file.split('/'))
      .split('\n')
      .map((line, i) => [file, i + 1, line])
      .filter(([, , line]) => /inflateStated\(/.test(line) && !/^\s*(\/\/|\*|import|export const inflateStated)/.test(line)),
  );
  assert.deepEqual(
    calls.map(([file]) => file),
    [
      'core/projection.ts', 'core/projection.ts', 'core/projection.ts', 'core/projection.ts', 'core/projection.ts', 'core/projection.ts',
      'core/outcomes.ts',
      'core/parsePlan.ts', 'core/parsePlan.ts', 'core/parsePlan.ts',
    ],
    'a tenth figure is being raised to a month’s (or an entry’s) level — it needs a register row and a ruling, not just a call',
  );
  // Each is the figure the inventory says it is, in the order the files state them.
  //
  // **`projection.ts`, top to bottom:**
  //   1. `atTodaysMoney` — the ONE new shared lens this ruling adds (2026-09-25): every
  //      ENTER_CARE/SELL_HOME/RENT_OUT_HOME/HEAS_DRAW figure below reads THROUGH this, never a second
  //      `inflateStated` call of its own.
  assert.match(calls[0][2], /inflateStated\(stated, settings\.economicSeries\.cpi, settings\.asAtDate, atDate\)/, 'projection.ts no longer defines the ONE shared today\'s-money lens, atTodaysMoney');
  //   2. the salary, to WAGES (2026-09-23) — unchanged by this ruling.
  assert.match(calls[1][2], /stated, settings\.economicSeries\.awote/, 'projection.ts no longer raises the SALARY to the wage level');
  //   3. ENTER_CARE's stated `homeValue`, P14-5a's vacated-home assessment — **FROM `settings.asAtDate`
  //      now, not `careHomeEntry.date` (superseded by this ruling: the figure is TODAY's money, so
  //      raising it straight from `asAtDate` to the month IS the entry-date-nominal figure carried
  //      forward, telescoped into one multiplication).**
  assert.match(calls[2][2], /careHomeEntry\.params\.homeValue, settings\.economicSeries\.cpi, settings\.asAtDate, month/, 'projection.ts no longer carries the care-vacated HOME VALUE on CPI from asAtDate');
  assert.doesNotMatch(calls[2][2], /careHomeEntry\.date/, 'the vacated-home CPI base has regressed to the entry\'s own day — register O85/this ruling\'s basis, not P14-5a\'s original one');
  //   4. the spending level (O85) — unchanged.
  assert.match(calls[3][2], /annualSpend/, 'projection.ts no longer indexes the SPENDING LEVEL');
  //   5-6. the fund's dollar administration fee (O87), ONE CALL PER SERIES since P3-17 slice 4: by WAGES
  //   (accumulation/TTR), then by CPI (pension phase). `monthlySuperFeesForOneMonth` picks by phase.
  assert.match(calls[4][2], /stated, settings\.economicSeries\.awote/, 'projection.ts no longer raises the fund’s dollar fee by WAGES');
  assert.match(calls[5][2], /stated, settings\.economicSeries\.cpi/, 'projection.ts no longer raises the fund’s dollar fee by CPI');
  // **`outcomes.ts`:** the Contingency Floor (P4-14) — unchanged.
  assert.match(calls[6][2], /floor\.todaysMoney/, 'outcomes.ts no longer indexes the CONTINGENCY FLOOR');
  // **`parsePlan.ts`, the door's own two checks — new, this ruling:** a STATED `HEAS_DRAW`
  // `fortnightlyAmount` raised to the entry's own day before the 150% ceiling check, and each
  // `advance.amount` raised to its own day before it joins the window total the 50%-of-annual-maximum
  // cap checks. Both compare a now-nominal figure against a nominal legislated cap — the SAME basis
  // on both sides of the comparison, which is the whole reason these two calls exist.
  assert.match(calls[7][2], /entry\.params\.fortnightlyAmount, settings\.economicSeries\.cpi, settings\.asAtDate, entry\.date/, 'parsePlan.ts no longer raises a STATED fortnightlyAmount to nominal at the door');
  assert.match(calls[8][2], /advance\.amount, settings\.economicSeries\.cpi, settings\.asAtDate, advance\.date/, 'parsePlan.ts no longer raises an advance amount to nominal at the door');
  // **TEN since 2026-09-25 (P9-5):** `downsizerNominal`, the door's one lens for a DOWNSIZER_CONTRIBUTION
  // amount against the $300,000 cap (not indexed) and the couple's total against the sale price —
  // the same basis on both sides, the HEAS pair's reason.
  assert.match(calls[9][2], /inflateStated\(stated, settings\.economicSeries\.cpi, settings\.asAtDate, date\)/, 'parsePlan.ts no longer raises a downsizer amount to nominal at the door');
  // The fee's lens is built for the fee and for nothing else, so the line above is not a second
  // spending call misread: the only caller of `raisedToPriceLevel` is the super-fee function.
  assert.match(read('core', 'projection.ts'), /monthlySuperFeesForOneMonth\(\(balance - drawn\) as Cents, interest, raisedByWages, raisedByCpi, phase\)/);
  // Every one of `atTodaysMoney`'s OWN callers goes through it rather than calling `inflateStated`
  // a second time — the count above would already have caught a bypass, but the four entry types are
  // named here so a reader does not have to re-derive which figures the shared lens actually reaches.
  const projectionSource = read('core', 'projection.ts');
  assert.match(projectionSource, /atTodaysMoney\(entered\.params\.radPaidAsLumpSum, entered\.date\)/, 'ENTER_CARE\'s radPaidAsLumpSum no longer goes through atTodaysMoney');
  assert.match(projectionSource, /atTodaysMoney\(entry\.params\.radPrice, entry\.date\)/, 'ENTER_CARE\'s radPrice no longer goes through atTodaysMoney');
  assert.match(projectionSource, /atTodaysMoney\(homeEntry\.params\.homeValue, homeEntry\.date\)/, 'ENTER_CARE\'s own aged-care homeValue no longer goes through atTodaysMoney');
  assert.match(projectionSource, /atTodaysMoney\(entry\.params\.salePrice, entry\.date\)/, 'SELL_HOME\'s salePrice no longer goes through atTodaysMoney');
  assert.match(projectionSource, /atTodaysMoney\(homeSoldThisMonth\.params\.salePrice, homeSoldThisMonth\.date\)/, 'SELL_HOME\'s salePrice cash line no longer goes through atTodaysMoney');
  assert.match(projectionSource, /atTodaysMoney\(newHomeAmountStated as Cents, homeSoldEntry\.date\)/, 'SELL_HOME\'s newHomeAmount no longer goes through atTodaysMoney');
  assert.match(projectionSource, /atTodaysMoney\(activeRentOutHome\.params\.weeklyRent, month\)/, 'RENT_OUT_HOME\'s weeklyRent no longer goes through atTodaysMoney');
  assert.match(projectionSource, /atTodaysMoney\(entry\.params\.securityValue, entry\.date\)/, 'HEAS_DRAW\'s securityValue no longer goes through atTodaysMoney');
  assert.match(projectionSource, /atTodaysMoney\(entry\.params\.fortnightlyAmount, month\)/, 'HEAS_DRAW\'s STATED fortnightlyAmount no longer goes through atTodaysMoney');
  assert.match(projectionSource, /atTodaysMoney\(advance\.amount, advance\.date\)/, 'HEAS_DRAW\'s advance amounts no longer go through atTodaysMoney');
  assert.match(projectionSource, /atTodaysMoney\(entry\.params\.amount, entry\.date\)/, 'DOWNSIZER_CONTRIBUTION\'s amount no longer goes through atTodaysMoney');
  // The two of them go through ONE expression, which is the rule P4-14 wrote and this change has now
  // paid for a third time: a `cpi` raised to a power appears in `priceLevel.ts` and nowhere else in
  // `src/`. Other exponentiations are legitimate and are not swept — `(1 + nominalReturn) ** (1/12)`
  // is the monthly growth factor, and a fee is a twelfth rather than a root. It is the CPI that must
  // have one expression, because two of it is the one-fact-two-expressions failure this repo keeps
  // paying.
  const everywhere = ['core/projection.ts', 'core/outcomes.ts', 'core/parsePlan.ts', 'app/todaysDollars.ts', 'app/chartConfig.ts', 'app/monthsToSeries.ts', 'app/comparisonSeries.ts']
    .map((file) => read(...file.split('/')))
    .join('\n')
    .replaceAll(/\/\*[\s\S]*?\*\//g, '')
    .replaceAll(/\/\/.*$/gm, '');
  assert.doesNotMatch(everywhere, /cpi[^\n]*\*\*|\*\*[^\n]*cpi/i, 'a second exponentiation of the CPI has appeared outside priceLevel.ts');
  assert.match(read('core', 'priceLevel.ts'), /\(1 \+ cpi\) \*\* \(monthsBetween/, 'the one expression is no longer in priceLevel.ts');
});

// --- 2. THE STOCKS: stated as at the plan's own date, and never indexed --------------------------

test('A BALANCE STATED AS AT THE PLAN’S DATE IS THAT BALANCE — no figure a user holds is indexed', () => {
  // Every one of these is a stock the user reads off a statement on `asAtDate`: it is already in the
  // money of that day, so raising it would be counting the price level twice. `nominalReturn: 0`
  // isolates the claim from growth — the only thing that may move a stock is the return.
  const held = {
    persons: [
      person('Sam', '1975-06-15', {
        superInterests: [{ phase: 'accumulation', balance: toCents(300_000) }],
        parcels: [{ acquired: '2019-03-01', costBase: toCents(40_000), marketValue: toCents(90_000) }],
        workBonusBalance: toCents(4_000),
      }),
    ],
    homeStatus: 'occupied',
    openingOffsetBalance: toCents(50_000),
  };
  const months = project({ ...SETTINGS, planningHorizonAge: 62 }, held, []);
  assert.ok(months.length > 100, 'the walk must be long enough for a price level to have done something');
  // Month 0 reports what was typed, to the cent: super + parcel + offset = $440,000.
  assert.equal(months[0].openingBalance, toCents(50_000));
  assert.equal(months[0].protectedAssets + months[0].assessableAssets, toCents(440_000));
  // And so does the LAST month, 132 months later, where a 2.5% factor would have added 31%. Nothing
  // grows (the return is nil) and nothing is indexed, so the figure is the figure.
  assert.equal(months.at(-1).protectedAssets + months.at(-1).assessableAssets, toCents(440_000));
  assert.equal(months.at(-1).openingBalance, toCents(50_000));
  assert.ok(1.025 ** (months.length / 12) > 1.3, 'the control: a price level applied here would be visible');
});

test('✅ EMPLOYMENT INCOME IS IN TODAY’S WAGES, and a month’s salary DEFLATES by the WAGE rate to the figure typed', () => {
  // **This test REPLACES the canary that asserted the gap**, on O87's pattern. Until 2026-09-23 it
  // read *"EMPLOYMENT INCOME IS A STANDING NOMINAL FIGURE — the wage question is its own, and is
  // open"* and asserted `new Set(salaries).size === 1`, so that a salary indexed by the back door —
  // and above all at the CPI — would be a visible change. The user ruled: pay rises with wages,
  // `economicSeries.awote`, from the wage level of `asAtDate`. What stands here is that rule.
  // The accumulation interest is what the employer Guarantee is paid into: the walk refuses a salary
  // with nowhere to pay it, by name, and a nil balance is a statement.
  const worker = {
    persons: [
      person('Ada', '1980-01-05', {
        employmentIncomePerFortnight: toCents(3_000),
        superInterests: [{ phase: 'accumulation', balance: toCents(0) }],
      }),
    ],
    homeStatus: 'occupied',
  };
  const months = project({ ...SETTINGS, planningHorizonAge: 50 }, worker, []);
  const salaries = months.map((month) => amountOf(month, 'Salary, Ada'));
  assert.ok(months.length > 36);
  // Month 0 is `asAtDate`'s own month, so the factor is exactly 1: $3,000 a fortnight is $6,500 a
  // month on the 26 ÷ 12 convention, as it always was.
  assert.equal(salaries[0], toCents(6_500));
  assert.ok(new Set(salaries).size > 36, 'the salary is flat again — the wage ruling has been undone, not refactored');
  // THE RULE, from the stated figure and the month's own WAGE factor alone, in every month: the
  // $78,000 a year raised by `awote` to the month, then a twelfth. Nothing is carried from the month
  // before, so there is nothing for an error to accumulate in.
  for (const [index, month] of months.entries()) {
    const fromStatedAlone = mulCents(mulCents(toCents(78_000), priceLevelFactor(SETTINGS.economicSeries.awote, SETTINGS.asAtDate, month.month)), 1 / 12);
    assert.equal(salaries[index], fromStatedAlone, `${month.month}: the salary is not the stated figure raised to this month's wage level`);
  }
  // AND IT IS THE WAGE RATE, NOT THE PRICE RATE: the fixture states the two apart (3.5% and 2.5%),
  // and the last month's salary is the wage figure and not the CPI one.
  assert.notEqual(SETTINGS.economicSeries.awote, SETTINGS.economicSeries.cpi);
  const last = months.at(-1).month;
  assert.equal(salaries.at(-1), mulCents(mulCents(toCents(78_000), priceLevelFactor(0.035, SETTINGS.asAtDate, last)), 1 / 12));
  assert.notEqual(salaries.at(-1), mulCents(mulCents(toCents(78_000), priceLevelFactor(0.025, SETTINGS.asAtDate, last)), 1 / 12));
});

// --- 3. THE CONTRACTED FIGURES: a debt is a number of dollars ------------------------------------

test('THE HOME LOAN’S REPAYMENT IS FLAT NOMINAL, and that is the CONTRACT rather than an omission', () => {
  // The user's own test, applied: a repayment is an amount of money owed under an agreement, not a
  // life the household is buying. $3,000 a month is $3,000 a month until the loan is gone — the
  // bank does not index it, and a forecast that raised it would be modelling a loan nobody has.
  // The same reasoning covers `Mortgage.openingBalance` and `MortgageRefinanceParams`' three figures.
  const borrower = {
    persons: [
      person('Kit', '1975-02-02', {
        employmentIncomePerFortnight: toCents(4_000),
        superInterests: [{ phase: 'accumulation', balance: toCents(0) }],
      }),
    ],
    homeStatus: 'occupied',
    openingOffsetBalance: toCents(20_000),
    mortgage: { openingBalance: toCents(400_000), annualInterestRate: 0.06, monthlyRepayment: toCents(3_000) },
  };
  // Pay rising with wages (2026-09-23) is not this test's subject: `awote: 0` holds Kit's salary flat.
  // A rising salary banks more cash against the loan and pays it off inside the walk, and the last,
  // smaller payment would be a second figure for a reason that is not the price level.
  const months = project({ ...SETTINGS, planningHorizonAge: 66, economicSeries: { ...SETTINGS.economicSeries, awote: 0 } }, borrower, [
    entry('sc', 'SPEND_CHANGE', '2026-07-01', { annualSpend: toCents(30_000) }),
  ]);
  const payments = months.map((month) => amountOf(month, 'Mortgage repayment — interest') + amountOf(month, 'Mortgage repayment — principal'));
  const paying = payments.filter((payment) => payment > 0);
  assert.ok(paying.length > 100, 'the fixture must actually repay a loan for a hundred months or more');
  assert.equal(new Set(paying).size, 1, 'the repayment moved — a contracted figure must not follow the price level');
  assert.equal(paying[0], toCents(3_000));
  // The control on the same walk: the SPENDING in it does rise, so a "nothing in this fixture moves"
  // explanation is not available for the flatness above.
  const spending = months.map((month) => amountOf(month, 'Household spending'));
  assert.ok(new Set(spending).size > 100, 'the spending level is not indexed on this fixture — the contrast is the point');
  assert.equal(spending[0], toCents(2_500));
  assert.ok(spending.at(-1) > spending[0]);
});

test('A GIFT IS NOMINAL ON THE DAY, `ONE_OFF_EXPENSE`’s family (O86), and so are the free areas it is measured against', () => {
  // The user's test, applied: a gift is an amount of money handed over on a day, priced for that
  // day — the box says "as it will be on the day". And the $10,000 / $30,000 it is measured against
  // are literals in the Act, never indexed (register §4.12), so the deprived amount is the stated
  // excess to the cent, held flat for its five years. Nothing on either side follows the price level.
  const giver = {
    persons: [person('Kit', '1955-02-02')],
    homeStatus: 'occupied',
    openingOffsetBalance: toCents(400_000),
  };
  const months = project({ ...SETTINGS, planningHorizonAge: 85 }, giver, [
    entry('sc', 'SPEND_CHANGE', '2026-07-01', { annualSpend: toCents(30_000) }),
    entry('g', 'GIFT', '2034-03-15', { amount: toCents(25_000) }, 'personA'),
  ]);
  const gifted = months.filter((month) => amountOf(month, 'Gift') > 0);
  assert.deepEqual(gifted.map((month) => [month.month, amountOf(month, 'Gift')]), [['2034-03', toCents(25_000)]], 'the gift was raised, or charged in another month');
  const deprived = months.filter((month) => month.deprivedAssets !== undefined);
  assert.equal(deprived.length, 60, 'five years of months carry it');
  assert.deepEqual([...new Set(deprived.map((month) => month.deprivedAssets))], [toCents(15_000)], 'the excess moved — neither the gift nor the free area follows prices');
  // The control: the spending on the same walk does rise, eight years on.
  assert.ok(amountOf(gifted[0], 'Household spending') > toCents(2_500));
});

// --- 4. THE ONE REMAINING GAP, and the one that CLOSED, now asserted as a RULE -------------------

test('✅ O87 — A FUND’S DOLLAR ADMINISTRATION FEE IS REAL, and a month’s fee DEFLATES to the figure typed', () => {
  // **This test REPLACES the canary that asserted O87's gap, and that is the point of the shape.**
  // Until 2026-09-21 the assertion here was `new Set(fees).size === 1` with the direction written
  // beside it — *"it UNDERSTATES a cost and therefore FLATTERS the household"* — so that a silent
  // fix could not look like a refactor. The user ruled, the fee is raised to each month's price
  // level, that canary went red, and what stands in its place is the RULE it was guarding.
  //
  // **WHICH SERIES it deflates by changed on 2026-09-25 (P3-17 slice 4).** `Ida`'s interest is
  // ACCUMULATION and never converts in this walk, so from that ruling its dollar fee is raised by
  // WAGES (`economicSeries.awote`), not CPI — Aware's own schedule indexes an accumulation-phase
  // account's dollar fee by salary growth (`~/.enough/verification/P13-1c-aware-soa-extract.md`,
  // p.15). Every figure below is worked on `awote`, not `cpi`; see the pension-phase account in
  // `test/core-super-fees.test.mjs`'s "WAGE VS CPI INDEXATION, PER PHASE" test for the CPI side of
  // this same identity.
  //
  // **THE CONSERVATION IDENTITY, and it is `annualSpend`'s own** (O85): deflate a month's fee line
  // by that month's own factor and twelve of them are the annual figure the user typed — in EVERY
  // month, with a residue that is bounded and does not grow with the walk. In today's money the
  // charged fee IS the stated fee, which is the whole of what "REAL" means here.
  const saver = {
    persons: [
      person('Ida', '1970-08-08', {
        superInterests: [{ phase: 'accumulation', balance: toCents(200_000), statedAdministrationFeePerYear: toCents(1_200) }],
      }),
    ],
    homeStatus: 'occupied',
  };
  const months = project({ ...SETTINGS, planningHorizonAge: 66 }, saver, []);
  const fees = months.map((month) => amountOf(month, 'Superannuation administration fee, Ida — Superannuation, Accumulation Phase'));
  assert.ok(fees.every((fee) => fee > 0), 'the fee line is missing — this test is measuring nothing');
  assert.equal(months.length - 1, 121);

  // Month 0 is `asAtDate`'s own month, so its factor is exactly 1 and the fee is the plain twelfth.
  assert.equal(fees[0], toCents(100), 'a twelfth of $1,200 — `monthlySuperFeesForOneMonth`');
  assert.ok(new Set(fees).size > 100, 'the fee is flat again — O87 has been undone, not refactored');
  // It never falls, and every step is upward or level: a price level is monotonic and a fee that
  // wobbled would mean something other than `inflateStated` had got into this line.
  for (let i = 1; i < fees.length; i += 1) assert.ok(fees[i] >= fees[i - 1], `${months[i].month}: the fee fell`);

  // THE IDENTITY. `residue` is the fee in today's money less the twelfth the user typed, in cents.
  // Its bounds are arithmetic rather than observed: `mulCents` rounds to nearest (±0.5c on the
  // annual figure, so ±0.042c on the twelfth) and the twelfth is then ceiled AT the household
  // (+1c at most), and both are then divided by a factor of at least 1. So the residue lies in
  // (−0.05, +1.05) in every month of any walk, whatever its length.
  const residues = months.map((month, index) => fees[index] / priceLevelFactor(0.035, SETTINGS.asAtDate, month.month) - toCents(100));
  for (const [index, residue] of residues.entries()) {
    assert.ok(residue > -0.05 && residue < 1.05, `${months[index].month}: the fee deflates to ${residue + 10_000}c, not 10,000c`);
  }
  // **AND IT CANNOT DRIFT, which is asserted as a STRUCTURE rather than as a tolerance.** The
  // residue is not monotone — it wanders inside its bounds as the twelfth falls nearer or further
  // from a whole cent, and on this walk it runs from −0.02c to +0.85c with no trend. What rules
  // drift out is that each month's fee is a pure function of the STATED figure and that month's own
  // factor: nothing is carried from the previous month, so there is nothing for an error to
  // accumulate in. Re-derived here from those two inputs alone, in every month, to the cent — the
  // first assertion in this repo that would fail if the walk ever started indexing last month's fee
  // instead of the typed one, which is the cheap mistake this identity exists to forbid.
  for (const [index, month] of months.entries()) {
    const fromStatedAlone = Math.ceil(mulCents(toCents(1_200), priceLevelFactor(0.035, SETTINGS.asAtDate, month.month)) / 12);
    assert.equal(fees[index], fromStatedAlone, `${month.month}: the fee is not the stated figure raised to this month`);
  }

  // **THE DIRECTION THE FIX RUNS IN, stated as the old row stated its gap.** Over 121 months at
  // 3.5% wage growth the price level is 1.41465, so the last month's charge is $141.47 where the flat
  // fee charged $100.00 — the household now pays 41% more nominal cents at the end of this walk,
  // which is 41% more than it was paying and exactly the same fee in real, wage-relative terms. Money
  // out is money the forecast no longer has, so every figure downstream moves the CONSERVATIVE way.
  assert.equal(fees.at(-1), toCents(141.47));
  assert.ok(Math.abs(1.035 ** (121 / 12) - 1.41465) < 0.0005, 'the wage level has moved — restate the figures above');
});

test('✅ P3-17 SLICE 3/4 — THE ADMINISTRATION FEE CAP RIDES ITS PHASE’S OWN LENS, and that is NOT a seventh call site', () => {
  // **THIS IS THE "NEW CALL" REGISTER O87 ASKED THIS FILE TO PIN, and it is deliberately NOT a
  // seventh `inflateStated(` occurrence.** `statedAdministrationFeeCapPerYear` and its pension-phase
  // pair are raised by handing whichever of the TWO closures `monthlySuperFeesForOneMonth` already
  // holds for the dollar limb (design point 8) to a second argument, so §1's count of source-level
  // calls stays FIVE in `projection.ts` — the cap is a second CALLER of an existing closure, never a
  // third or fourth expression of the rule.
  assert.match(
    read('core', 'projection.ts'),
    /Math\.min\(uncappedAnnualPercentage, raisedToPriceLevel\(statedCapPerYear\)\)/,
    'the cap is no longer raised through the phase’s own lens — a seventh call site needs a register row of its own',
  );

  // **THE RULING, as arithmetic.** A fund's cap is a REAL figure exactly as its dollar admin fee is
  // (O87), so a stated cap deflates to the SAME figure every month once its own month's price level
  // is divided back out — the O87 identity, applied to the cap instead of the dollar limb.
  //
  // **`Cap`'s interest is ACCUMULATION and never converts, so from 2026-09-25 (P3-17 slice 4) its own
  // cap is raised by WAGES** — Aware's own schedule indexes an accumulation-phase account's cap by
  // salary growth (`~/.enough/verification/P13-1c-aware-soa-extract.md`, p.15), and the
  // CPI-for-everything simplification `household.ts` used to carry for this field is CLOSED, not
  // merely labelled, by this ruling.
  const capped = {
    persons: [
      person('Cap', '1968-02-02', {
        superInterests: [{ phase: 'accumulation', balance: toCents(1_000_000), statedAdministrationFeeRate: 0.01, statedAdministrationFeeCapPerYear: toCents(480) }],
      }),
    ],
    homeStatus: 'occupied',
  };
  const months = project({ ...SETTINGS, planningHorizonAge: 66 }, capped, []);
  const charged = months.map((month) => amountOf(month, 'Superannuation administration fee, Cap — Superannuation, Accumulation Phase'));
  assert.ok(charged.every((fee) => fee > 0), 'the capped fee line is missing — this test is measuring nothing');
  // The cap must actually be BINDING, or this is a test of the uncapped rate limb instead: at $1m
  // and 1% the uncapped figure is $10,000/yr, far above the $480/yr cap.
  assert.ok(charged.every((fee) => fee < toCents(300)), 'the cap is not binding — this fixture is not testing the cap at all');
  assert.ok(new Set(charged).size > 1, 'the capped fee is flat — the cap is not being indexed');
  for (const [index, month] of months.entries()) {
    const raisedCap = Math.ceil(mulCents(toCents(480), priceLevelFactor(0.035, SETTINGS.asAtDate, month.month)) / 12);
    assert.equal(charged[index], raisedCap, `${month.month}: the cap is not the stated figure raised by WAGES to this month`);
  }

  // ⚠️ **THE CPI SIDE, ON A GENUINE PENSION-PHASE INTEREST — the split Aware's own schedule states
  // (p.15), now both halves built.** A DECLARED `accountBasedPension` account, restated at the same
  // balance, rate and cap, is charged the SAME uncapped figure but a DIFFERENTLY-raised cap: CPI is
  // the fund's OWN rule for a retirement-phase account, not a simplification, so this identity uses
  // `economicSeries.cpi` and the two must diverge — a wage-raised cap outpaces a CPI-raised one on
  // this repo's own demo settings (`awote: 0.035 > cpi: 0.025`).
  const pension = {
    persons: [
      person('CapPension', '1958-02-02', {
        superInterests: [{
          phase: 'accountBasedPension',
          balance: toCents(1_000_000),
          statedStreamSettings: { commencementDay: '2022-08-01' },
          statedAdministrationFeeRate: 0.01,
          statedAdministrationFeeCapPerYear: toCents(480),
        }],
      }),
    ],
    homeStatus: 'occupied',
  };
  const pensionMonths = project({ ...SETTINGS, planningHorizonAge: 90 }, pension, []);
  const pensionCharged = pensionMonths.map((month) => amountOf(month, 'Superannuation administration fee, CapPension — Account-Based Pension'));
  for (const [index, month] of pensionMonths.entries()) {
    const raisedCap = Math.ceil(mulCents(toCents(480), priceLevelFactor(0.025, SETTINGS.asAtDate, month.month)) / 12);
    assert.equal(pensionCharged[index], raisedCap, `${month.month}: the PENSION cap is not the stated figure raised by CPI to this month`);
  }
  // Compared at the SAME month — ten years out — rather than at each walk's own last month, which
  // differ because the two Persons are different ages: the claim is about the two SERIES, not about
  // which walk happens to run longer.
  const tenYearsOut = '2036-07';
  const wageRaisedCap = Math.ceil(mulCents(toCents(480), priceLevelFactor(0.035, SETTINGS.asAtDate, tenYearsOut)) / 12);
  const cpiRaisedCap = Math.ceil(mulCents(toCents(480), priceLevelFactor(0.025, SETTINGS.asAtDate, tenYearsOut)) / 12);
  assert.ok(wageRaisedCap > cpiRaisedCap, 'the wage-indexed cap is not larger than the CPI one on this repo’s own settings — restate the claim above');
});

test('⚠️ O88 — A STANDING SALARY SACRIFICE IS FLAT NOMINAL, and the direction UNDERSTATES', () => {
  // `SalarySacrificeContributionParams.annualAmount` is the other recurring stated figure, and it
  // was written in `annualSpend`'s own idiom — its doc says so by name. A person who says "I put
  // $20,000 a year into super" means a share of a life, not a quantity of banknotes, and the cap it
  // is measured against indexes on AWOTE (P6-12) while this does not.
  //
  // **DIRECTION: it puts LESS into super than the household means to and therefore UNDERSTATES the
  // plan** — the conservative direction, which is why it is a row and not a defect. It is also the
  // one figure in this inventory whose correct index may not be CPI at all: a sacrifice is usually
  // thought of against a WAGE. **This test asserts the GAP.**
  const sacrificer = {
    persons: [
      person('Ray', '1972-04-04', {
        superInterests: [{ phase: 'accumulation', balance: toCents(100_000) }],
        employmentIncomePerFortnight: toCents(5_000),
      }),
    ],
    homeStatus: 'occupied',
  };
  const months = project({ ...SETTINGS, planningHorizonAge: 66 }, sacrificer, [
    entry('ss', 'SUPER_CONTRIBUTION', '2026-07-01', { kind: 'salarySacrificed', annualAmount: toCents(12_000), interestIndex: 0 }, 'personA'),
  ]);
  const sacrificed = months.map((month) => amountOf(month, 'Salary sacrifice into superannuation, Ray — Superannuation, Accumulation Phase'));
  assert.ok(sacrificed.every((amount) => amount > 0), 'the sacrifice line is missing — this canary is measuring nothing');
  assert.equal(new Set(sacrificed).size, 1, 'the sacrifice now MOVES — if it was indexed, close O88 and rewrite this test');
  // $850, not $1,000: the line is what ARRIVES in the interest, and the fund takes the 15%
  // contributions tax on the way in. The stated figure is the gross twelfth and it is flat.
  assert.equal(sacrificed[0], toCents(850));
  assert.equal(toCents(1_000) - Math.round(toCents(1_000) * 0.15), toCents(850));
  assert.ok(months.length > 100, 'the walk must be long enough for a price level to have done something');
});
