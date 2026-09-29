// P3-21f chunk 6 — LIMB 3 DRAWS.
//
// The last limb of the Income Waterfall that always offered nil now offers the whole market value of
// the Household's parcels and sells them when the limbs above it fall short. What that draw costs —
// which parcels, what gain, what tax — is chunks 4 and 5's, reached here through the same functions
// a user-stated sale reaches.
//
// **What is defended in this file and nothing else.**
//
//   1. **ONE capital-gains charge on the UNION**, for a Person who both drew automatically and sold
//      by a stated entry in the same month. This is the trap the chunk plan named: two routes to a
//      disposal, one annual s 102-5 computation, and a second accumulator or a second
//      reset-on-financial-year would charge twice or charge too little. It is asserted as three
//      dollar figures that a doubled or a half-blind charge could not produce.
//   2. **THE ORDER**, which is what the whole Waterfall is for: the pension's minimum and the cash
//      not offsetting a loan before limb 3, and limb 3 before the pension above its minimum and the
//      cash offsetting a loan (2026-09-23). Asserted on dollar figures inside `project()`.
//   3. **WHAT A NIL MEANS NOW.** The refusal this limb carried for the whole of the build — *"a CGT
//      disposal on a per-parcel cost base this model does not hold"* — is discharged on its own
//      stated ground, and its tripwire is REPLACED rather than deleted: a funded Household reaching
//      the nil branch is now a stated bug, because the claims are built one per Person who holds
//      anything.
import test from 'node:test';
import assert from 'node:assert/strict';

import { toCents } from '../dist/core/money.js';
import { NO_STATING_ENTRY, PENSION_MINIMUM_PROVENANCE, UNATTRIBUTED, UNLEGISLATED, nonSuperPortfolioLimb, project, statedBy, unfundedMiddleLimbs } from '../dist/core/projection.js';

const person = (name, dateOfBirth, over = {}) => ({
  name,
  dateOfBirth,
  // P6-8 brief 3 chunk 2b: the employer Superannuation Guarantee has to land in a NAMED account,
  // so a salaried Person holds one and the walk refuses a salary with nowhere to pay it. A NIL
  // balance is the smallest change that makes the fixture honest: it moves no figure of its own.
  superInterests: [{ phase: 'accumulation', balance: toCents(0) }],
  parcels: [],
  employmentIncomePerFortnight: toCents(0),
  workBonusBalance: toCents(0),
  ...over,
});

const SETTINGS = {
  asAtDate: '2026-09-16',
  planningHorizonAge: 51,
  // ⚠️ **`cpi: 0`, AND IT IS THE ALGEBRAIC CONTROL RATHER THAN A SPECIAL CASE** (register O85,
  // user ruling 2026-09-21). The stated spending level is a REAL figure now and `project()` raises it
  // to each month's own price level, so at any positive CPI every hand-worked figure below would
  // carry a `(1 + cpi) ^ (n / 12)` in it and this fixture would be arithmetic about indexation rather
  // than about what it was written for. At nil the factor is exactly 1 in every month
  // (`core/priceLevel.ts`), so every figure here is the figure it was hand-worked as. The indexation
  // itself is asserted in `test/core-projection-waterfall.test.mjs` §8, on its own fixture.
  // Pay rising with wages (2026-09-23) is not this fixture's subject: `awote: 0` holds every salary at the figure stated. A proved control: every figure this file asserts is the same at nil on the build before pay rose.
  economicSeries: { cpi: 0, pblci: 0.025, awote: 0, mtawe: 0.035 },
  deemingRates: { lower: 0.0175, upper: 0.0375 },
  nominalReturn: 0.065,
};

const monthAt = (months, month) => months.find((m) => m.month === month);
const linesAt = (months, month, prefix) =>
  monthAt(months, month).lines.filter((l) => l.description.startsWith(prefix));
const totalCapitalGainsTax = (months) =>
  months
    .flatMap((m) => m.lines)
    .filter((l) => l.description.startsWith('Income tax on capital gain'))
    .reduce((total, l) => total + l.amount, 0);

// --- 1. TWO ROUTES TO A DISPOSAL, ONE ANNUAL COMPUTATION -----------------------------------------
//
// Val is 50, earns $260,000, and holds exactly two parcels — both acquired in March 2015, so both
// are past s 115-25's *more than 12 months* and the discount question is settled identically for
// each. What is NOT identical is which way they are under water:
//
//   P1  cost $80,000   value $40,000   a $40,000 capital LOSS
//   P2  cost $10,000   value $60,000   a $50,000 capital GAIN, discountable
//
// P1 is the older by a day, so FIFO — the only selection an automatic draw can state — takes it
// first. That is the whole of the fixture's design: **the automatic draw realises the LOSS and the
// stated entry realises the GAIN, in the same month, against the same Person, in the same financial
// year.** s 102-5 nets them at step 1, BEFORE the step 3 discount, so the answer depends entirely on
// the two reaching one accumulator.
const P1_LOSS = { acquired: '2015-03-03', costBase: toCents(80_000), marketValue: toCents(40_000) };
const P2_GAIN = { acquired: '2015-03-04', costBase: toCents(10_000), marketValue: toCents(60_000) };
const VAL = {
  persons: [person('Val', '1976-05-10', { employmentIncomePerFortnight: toCents(10_000), parcels: [P1_LOSS, P2_GAIN] })],
  homeStatus: 'occupied',
};
// $53,976.67 a month of spending against $21,666.67 of salary less $7,300 of income tax and $390 of
// Division 293 tax leaves a gap of exactly $40,000 — which is P1's whole market value, so the
// automatic draw takes P1 and stops.
//
// ⚠️ **THE SPENDING LEVEL WAS RE-DERIVED ON 2026-09-20, NOT RE-BASED (P6-9 chunk 3).** It was
// $652,400 a year, which left the same $40,000 gap when Val's only charges were the $7,300 of
// income tax. Charging Division 293's second 15% on her $31,200 Guarantee takes another $390 a
// month out of the same pay packet, so the OLD level left a $40,390 gap — and the fixture's whole
// design is that the automatic draw is exactly P1's market value, takes P1 and stops. The
// constraint is stated as arithmetic and the level chosen inside it: `annualSpend` must satisfy
// `ceil(annualSpend ÷ 12) − (21,666.67 − 7,300 − 390) = 40,000`, so `annualSpend = $647,720`.
const SHORT = { id: 'sc', date: '2026-09-01', owner: 'household', type: 'SPEND_CHANGE', params: { annualSpend: toCents(647_720) }, enabled: true, createdAt: '2026-06-01' };
const COMFORTABLE = { ...SHORT, params: { annualSpend: toCents(120_000) } };
const sell = (amount, over = {}) => ({
  id: 'sell', date: '2026-09-20', owner: 'personA', type: 'NON_SUPER_INVESTMENT',
  params: { direction: 'sell', amount: toCents(amount), ...over }, enabled: true, createdAt: '2026-06-01',
});

test('an automatic draw and a stated sale in one month are ONE capital gains charge, on the union', () => {
  const both = project(SETTINGS, VAL, [SHORT, sell(60_000)]);

  // Both disposals happened, in the order the tick runs them: the Waterfall's draw first, then the
  // entry the user stated. $40,000 of P1 and then $60,000 of P2.
  assert.deepEqual(
    linesAt(both, '2026-09', 'Non-Super Portfolio').map((l) => l.amount),
    [toCents(40_000), toCents(60_000)],
  );
  // The portfolio is spent — both parcels gone. Since P4-3b `assessableAssets` also carries the
  // Offset Account at the balance the month OPENS with, and October opens with $57,650.00: the
  // stated sale's $60,000 of proceeds less the $2,350 of tax charged below, which is the money the
  // automatic draw did not need. So the portfolio's emptiness is the DIFFERENCE, and it is nil.
  assert.equal(monthAt(both, '2026-10').openingBalance, toCents(57_650));
  assert.equal(monthAt(both, '2026-10').assessableAssets, toCents(57_650));
  assert.equal(
    monthAt(both, '2026-10').assessableAssets - monthAt(both, '2026-10').openingBalance,
    toCents(0),
    'the portfolio is spent',
  );

  // ⚠️ **ONE LINE, AND IT IS THE UNION'S FIGURE.** Gross gains $50,000; capital losses $40,000;
  // s 102-5 step 1 leaves $10,000, step 3 halves it to a $5,000 net capital gain, and Val's marginal
  // rate is 45c plus the 2% levy — $2,350.
  // The dollar pin is taken WITHOUT the record (P5-3 limb 2): a CGT line carries the year's
  // Medicare-threshold caveats, which are not what this assertion is about. The record itself is
  // pinned in `core-projection-provenance.test.mjs`; the register is asserted here.
  assert.deepEqual(
    linesAt(both, '2026-09', 'Income tax on capital gain').map(({ provenance, attribution, ...line }) => line),
    [{ direction: 'outflow', effect: 'cash', description: 'Income tax on capital gain, Val', amount: toCents(2_350) }],
  );
  assert.equal(linesAt(both, '2026-09', 'Income tax on capital gain')[0].provenance.register, 'income tax on capital gain');
  assert.equal(totalCapitalGainsTax(both), toCents(2_350), 'a second month charged the same gain again');

  // **THE FIGURE A SECOND ACCUMULATOR WOULD PRODUCE, pinned so that it is a different number and not
  // a different shape.** Route the two disposals separately and the loss never reaches the gain: the
  // draw's $40,000 loss is a NIL net capital gain and charges nothing at all, and the entry's
  // $50,000 gain is discounted to $25,000 and charged in full — $11,750, five times the truth. The
  // same is true of a second reset-on-financial-year, which would empty the accumulator between the
  // two and leave whichever ran second assessed from a standing start.
  const gainAlone = project(SETTINGS, VAL, [COMFORTABLE, sell(60_000, { parcelSelection: 'lowest-cost-base-first' })]);
  assert.deepEqual(
    linesAt(gainAlone, '2026-09', 'Income tax on capital gain').map(({ provenance, attribution, ...line }) => line),
    [{ direction: 'outflow', effect: 'cash', description: 'Income tax on capital gain, Val', amount: toCents(11_750) }],
  );

  // **AND THE LOSS ALONE CHARGES NOTHING**, which is what makes the $2,350 above a NETTING and not a
  // coincidence: the automatic draw on its own realises a $40,000 loss, and a nil net capital gain
  // is not a line.
  const lossAlone = project(SETTINGS, VAL, [SHORT]);
  assert.deepEqual(linesAt(lossAlone, '2026-09', 'Income tax on capital gain'), []);

  // **ROUTE-INDEPENDENCE, which is the structural claim rather than the arithmetic one.** The same
  // two parcels disposed of by ONE stated sale — no shortfall, no automatic draw, one call into
  // `chargeCapitalGain` instead of two — pay the identical $2,350. A model in which the way a parcel
  // came to be sold changed the tax on it would have two answers to one question.
  const oneRoute = project(SETTINGS, VAL, [COMFORTABLE, sell(100_000)]);
  assert.equal(linesAt(oneRoute, '2026-09', 'Non-Super Portfolio').length, 1);
  const oneRouteCgt = linesAt(oneRoute, '2026-09', 'Income tax on capital gain');
  assert.deepEqual(
    oneRouteCgt.map(({ provenance, attribution, ...line }) => line),
    [{ direction: 'outflow', effect: 'cash', description: 'Income tax on capital gain, Val', amount: toCents(2_350) }],
  );
  // **And route-independence holds of the RECORD too, not only the dollar.** The two routes are
  // re-projected here rather than compared against a figure pasted from the other test, so this is
  // a comparison of two live walks and not of one walk against itself.
  const twoRoutes = project(SETTINGS, VAL, [COMFORTABLE, sell(60_000, { parcelSelection: 'lowest-cost-base-first' }), sell(40_000)]);
  assert.deepEqual(
    oneRouteCgt[0].provenance,
    linesAt(twoRoutes, '2026-09', 'Income tax on capital gain')[0].provenance,
  );
  assert.equal(oneRouteCgt[0].provenance.register, 'income tax on capital gain');
});

// --- 2. THE ORDER — the pension's minimum, cash, the portfolio, the pension above its minimum -------
//
// The Waterfall's whole purpose is the ORDER, and an order is only tested by a fixture in which more
// than one limb COULD have paid. Since 2026-09-23 ("spend cash first") the order around the portfolio
// is: what is still owed of the pension's minimum → cash NOT offsetting a home loan → the portfolio →
// the pension above its minimum → cash that IS offsetting a home loan. This Household has four that
// could pay February's $50,000:
//
//   the pension   $12,807.58 by February 2027, of which FY2026-27's minimum is $490.00
//   the portfolio a little over $51,000
//   the cash      $62,836.69 — on its own, more than enough
//
// Val works to the end of January at $260,000 and spends $5,000 a month, which is what builds the
// cash; from 1 February she works no days and spends $50,000 a month, which is the shortfall.
//
// **Whether the cash is spent before the portfolio turns on ONE fact: whether it is offsetting a
// home loan.** With no loan (`orderHousehold`) it earns only the cash rate and is spent straight
// after the minimum. With a loan larger than the cash (`WITH_LOAN`) every dollar of it is cancelling
// loan interest, and it is kept until the portfolio and the rest of the pension are spent (concept.md
// §5.12). The loan is interest-free with a $100 repayment so that it moves nothing but the order: a
// $100 line a month, and cash that is $700 lower by February.
//
// The parcel's cost base is its purchase market value, so the disposals realise only the growth and
// no `Income tax on capital gain` line falls due — which is why the cash can be asserted to the cent.
const ORDER_SETTINGS = { ...SETTINGS, asAtDate: '2026-07-01' };
const orderHousehold = (pensionBalance) => ({
  persons: [
    person('Val', '1976-05-10', {
      employmentIncomePerFortnight: toCents(10_000),
      superInterests: [
        { phase: 'accountBasedPension', balance: toCents(pensionBalance), statedStreamSettings: { commencementDay: '2020-07-01' } },
        // P6-8 brief 3 chunk 2b: Val is paid, so her employer's Guarantee needs an account that can
        // receive it — a retirement-phase interest cannot. Nil, so it adds no assets of its own.
        { phase: 'accumulation', balance: toCents(0) },
      ],
      parcels: [{ acquired: '2015-03-03', costBase: toCents(50_000), marketValue: toCents(50_000) }],
    }),
  ],
  homeStatus: 'occupied',
});
const ORDER_ENTRIES = [
  { id: 'sc1', date: '2026-07-01', owner: 'household', type: 'SPEND_CHANGE', params: { annualSpend: toCents(60_000) }, enabled: true, createdAt: '2026-06-01' },
  { id: 'wp', date: '2027-02-01', owner: 'personA', type: 'WORK_PATTERN_CHANGE', params: { daysPerWeek: 0, annualSalary: toCents(0) }, enabled: true, createdAt: '2026-06-01' },
  { id: 'sc2', date: '2027-02-01', owner: 'household', type: 'SPEND_CHANGE', params: { annualSpend: toCents(600_000) }, enabled: true, createdAt: '2026-06-01' },
];

const WITH_LOAN = (pensionBalance) => ({
  ...orderHousehold(pensionBalance),
  mortgage: { openingBalance: toCents(100_000), annualInterestRate: 0, monthlyRepayment: toCents(100) },
});
const limbOf = (month, name) => month.notes.find((n) => n.subject === 'waterfall limb' && n.limb === name);
const cashLines = (month) => month.lines.filter((l) => l.effect === 'cash').map((l) => [l.description, l.amount]);

test('NO LOAN: the minimum, then the cash, and only then limb 3 — and a loan the cash offsets keeps it to the cent', () => {
  // **WITHOUT A LOAN.** February's $50,000: the FY2026-27 minimum first — 4% of the $12,345.67
  // the pension held on 1 July 2026 is $493.83, and cl 5's nearest $10 makes it $490.00, none of it
  // drawn while Val was paid — then the cash for the other $49,510.00. The portfolio is not sold.
  const months = project(ORDER_SETTINGS, orderHousehold(12_345.67), ORDER_ENTRIES);
  const february = monthAt(months, '2027-02');
  assert.equal(february.openingBalance, toCents(62_836.69));
  assert.deepEqual(cashLines(february), [
    ['Account-Based Pension payment, Val', toCents(490)],
    ['Household spending', toCents(50_000)],
  ]);
  assert.equal(limbOf(february, 'cashAboveLoan').drawn, toCents(49_510));
  assert.equal(february.closingBalance, toCents(62_836.69) - toCents(49_510));
  assert.equal(february.closingBalance, toCents(13_326.69));
  assert.equal(limbOf(february, 'nonSuperPortfolio').drawn, toCents(0));
  // …so the whole parcel earns February's return, exactly as the pension-only walk below does:
  //   ⌊5_187_088 × 1.005261694277⌋ − 5_187_088 = 27_292 cents = $272.92
  assert.deepEqual(february.lines.filter((l) => l.description.startsWith('Investment growth, Val — Financial')).map((l) => l.amount), [toCents(272.92)]);
  // March: the last $13,326.69 of cash, and the portfolio pays the remaining $36,673.31.
  const march = monthAt(months, '2027-03');
  assert.equal(limbOf(march, 'cashAboveLoan').drawn, toCents(13_326.69));
  assert.deepEqual(march.lines.filter((l) => l.description.startsWith('Non-Super Portfolio')).map((l) => l.amount), [toCents(36_673.31)]);
  assert.equal(toCents(13_326.69) + toCents(36_673.31), toCents(50_000));
  assert.equal(march.closingBalance, toCents(0));

  // **WITH A LOAN THE CASH OFFSETS.** The same walk, owing $100,000 at nil interest. February's cash
  // is $700 lower ($62,136.69: seven $100 repayments) and every dollar of it is against the $99,300
  // still owed, so none is spent this early: the minimum, and then the PORTFOLIO pays the other
  // $49,610.00 (the target is $50,100 with the repayment). The cash closes where it opened.
  const loaned = project(ORDER_SETTINGS, WITH_LOAN(12_345.67), ORDER_ENTRIES);
  const lFebruary = monthAt(loaned, '2027-02');
  assert.equal(lFebruary.openingBalance, toCents(62_136.69));
  assert.equal(limbOf(lFebruary, 'cashAboveLoan').available, toCents(0));
  assert.equal(limbOf(lFebruary, 'offsetAccount').available, toCents(62_136.69));
  assert.deepEqual(cashLines(lFebruary), [
    ['Account-Based Pension payment, Val', toCents(490)],
    ['Non-Super Portfolio sale, Val', toCents(49_610)],
    ['Household spending', toCents(50_000)],
    ['Mortgage repayment — principal', toCents(100)],
  ]);
  assert.equal(lFebruary.closingBalance, toCents(62_136.69), 'the cash offsetting the loan was spent before the portfolio');
  // March: the rest of the portfolio ($2,260.88 left, grown to $2,272.77), then the pension ABOVE
  // its minimum — all $12,382.39 of it — and only then the offsetting cash, for the last $35,444.84.
  const lMarch = monthAt(loaned, '2027-03');
  assert.deepEqual(cashLines(lMarch), [
    ['Account-Based Pension payment, Val', toCents(12_382.39)],
    ['Non-Super Portfolio sale, Val', toCents(2_272.77)],
    ['Household spending', toCents(50_000)],
    ['Mortgage repayment — principal', toCents(100)],
  ]);
  assert.equal(limbOf(lMarch, 'accountBasedPensionAboveMinimum').drawn, toCents(12_382.39));
  assert.equal(limbOf(lMarch, 'offsetAccount').drawn, toCents(35_444.84));
  assert.equal(toCents(50_100) - toCents(2_272.77) - toCents(12_382.39), toCents(35_444.84));
  assert.equal(lMarch.closingBalance, toCents(62_136.69) - toCents(35_444.84));
});

test('limb 3 is sold BEFORE the pension above its minimum, however large the pension is', () => {
  // The same walk with a $600,000 pension instead of a $12,345.67 one. Its FY2026-27 minimum is 4%
  // of $600,000 = $24,000.00, none of it drawn while Val was paid, so February draws that first and
  // the cash for the other $26,000.00. Until 2026-09-23 the pension paid the whole $50,000 here and
  // the portfolio was never sold.
  const months = project(ORDER_SETTINGS, orderHousehold(600_000), ORDER_ENTRIES);
  const february = monthAt(months, '2027-02');
  assert.deepEqual(cashLines(february), [
    ['Account-Based Pension payment, Val', toCents(24_000)],
    ['Household spending', toCents(50_000)],
  ]);
  assert.equal(february.closingBalance, toCents(62_836.69) - toCents(26_000));
  // March: the $36,836.69 of cash left, then the PORTFOLIO for $13,163.31 — while $601,599.85 of
  // pension above its minimum sits untouched. The pension above the minimum is the dearer dollar:
  // it grows untaxed.
  const march = monthAt(months, '2027-03');
  assert.equal(limbOf(march, 'cashAboveLoan').drawn, toCents(36_836.69));
  assert.deepEqual(march.lines.filter((l) => l.description.startsWith('Non-Super Portfolio')).map((l) => l.amount), [toCents(13_163.31)]);
  assert.equal(toCents(36_836.69) + toCents(13_163.31), toCents(50_000));
  assert.equal(limbOf(march, 'accountBasedPensionAboveMinimum').available, toCents(601_599.85));
  assert.equal(limbOf(march, 'accountBasedPensionAboveMinimum').drawn, toCents(0));
  // April: the portfolio is sold out ($39,185.59) and only then does the pension pay the rest.
  const april = monthAt(months, '2027-04');
  assert.deepEqual(cashLines(april), [
    ['Account-Based Pension payment, Val', toCents(10_814.41)],
    ['Non-Super Portfolio sale, Val', toCents(39_185.59)],
    ['Household spending', toCents(50_000)],
  ]);
  assert.equal(limbOf(april, 'nonSuperPortfolio').available, toCents(39_185.59));
});

// --- 3. WHAT A NIL MEANS NOW ---------------------------------------------------------------------

test('the limb’s note says the portfolio is offered NET OF THE TAX, and a nil means no parcels are held', () => {
  const empty = { persons: [person('Val', '1976-05-10')], homeStatus: 'occupied' };
  const holder = orderHousehold(600_000);

  // ⚠️ **THE OFFER IS THE CALLER'S FIGURE AND IT IS NET OF TAX (P10-4, 2026-09-21).** The claims are
  // still each Person's whole market value; what the limb OFFERS is what selling the whole of it
  // would leave once the capital gains tax on that sale is paid, because that is what limb 3 can
  // actually hand the month. Until this day the offer WAS the sum of the claims and the note said
  // the disposal was *"decided below in the month it happens rather than deferred or netted off
  // here"* — and the month that drew on it came up short by exactly its own tax.
  const funded = nonSuperPortfolioLimb(holder, [{ personIndex: 0, available: toCents(51_000) }], toCents(46_000));
  assert.equal(funded.available, toCents(46_000));
  assert.match(funded.note, /the whole market value of the Non-Super Portfolio, LESS the capital gains tax selling the whole of it would cause/);
  assert.match(funded.note, /the draw is grossed up there so that the sale funds its own tax/);
  // **A net figure ABOVE the market value is a caller's bug and is refused by name**, because tax on
  // a gain cannot exceed the proceeds that realised it. The tripwire is the replacement for the old
  // note's promise that nothing was ever held back.
  assert.throws(
    () => nonSuperPortfolioLimb(holder, [{ personIndex: 0, available: toCents(51_000) }], toCents(51_000.01)),
    /a sale cannot contribute more than it realises/,
  );
  // And the whole of the market value IS a legal offer: a portfolio realising no gain at all — every
  // parcel at its cost base — is charged nothing and hands over every cent.
  assert.equal(nonSuperPortfolioLimb(holder, [{ personIndex: 0, available: toCents(51_000) }], toCents(51_000)).available, toCents(51_000));

  // ⚠️ **The refusal that stood for the whole of this build is GONE, and gone on its own stated
  // ground.** No note anywhere in the limb still claims the model cannot compute the disposal.
  const notes = [funded.note, nonSuperPortfolioLimb(empty, [], toCents(0)).note, unfundedMiddleLimbs(empty).nonSuperPortfolio.note];
  for (const note of notes) assert.doesNotMatch(note, /cost base this model does not hold|CGT disposal on a per-parcel/);

  // A nil now means ONE thing: no parcels. The limb delegates it to `unfundedMiddleLimbs` so that it
  // is stated in exactly one place, as limb 2's nil already is.
  assert.equal(nonSuperPortfolioLimb(empty, [], toCents(0)).available, toCents(0));
  assert.equal(nonSuperPortfolioLimb(empty, [], toCents(0)).note, unfundedMiddleLimbs(empty).nonSuperPortfolio.note);
  assert.match(nonSuperPortfolioLimb(empty, [], toCents(0)).note, /^no Non-Super Portfolio in this Household: limb 3 is built and it draws/);

  // ⚠️ **The tripwire was REPLACED, not deleted.** A funded Household reaching the nil branch is now
  // a stated BUG rather than a refusal, because `nonSuperPortfolioLimb` builds one claim per Person
  // who holds anything — so the only way here is claims and a note built from two Households.
  assert.match(unfundedMiddleLimbs(holder).nonSuperPortfolio.note, /this note is a BUG and not a fact/);
  assert.notEqual(unfundedMiddleLimbs(holder).nonSuperPortfolio.note, unfundedMiddleLimbs(empty).nonSuperPortfolio.note);
});
