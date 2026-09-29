// P3-21f chunk 3 — `NON_SUPER_INVESTMENT` BUYS, AND A BUY IS FUNDED OR IT DOES NOT HAPPEN.
//
// `NON_SUPER_INVESTMENT` carried `UnspecifiedParams` until this chunk, so nothing could put a cent
// into the Non-Super Portfolio at all. It now carries a BUY: a parcel dated the entry's own day, at
// the amount paid, in one Person's portfolio. Still no draw, no disposal, no discount and no tax —
// those are chunks 4 to 6, and limb 3 still refuses in the same words.
//
// ⚠️ **THE TRAP THIS FILE EXISTS FOR, AND IT IS NOT THE ONE THE CHUNK PLAN NAMES: a parcel created
// without the cash moving MANUFACTURES WEALTH FROM NOTHING.** The Household ends the month richer
// for having bought an ETF — a bigger portfolio, more assessable assets, forty years of extra
// compounding — with its bank balance untouched, and every figure on screen reads perfectly. It
// flatters in the worst direction, so the assertion is a DOLLAR PAIR rather than a shape: a
// Household that buys $50,000 of ETFs is exactly $50,000 poorer in cash and exactly $50,000 richer
// in parcels, in the same month, with `closingBalance = openingBalance + Σinflow − Σoutflow` still
// reconciling to the cent.
//
// **Six things are defended here and nothing else.**
//
//   1. **The dollar pair.** $50,000 out of the cash, $50,000 into the parcels, same month, against a
//      control walk that is identical but for the entry.
//   2. **The parcel is dated the ENTRY's day and costs what was PAID.** Chunk 4's 50% discount turns
//      entirely on the day, so a day the model supplied — the walk's start, `asAtDate`, a clock —
//      would answer a tax question nobody asked, in the flattering direction.
//   3. **An unfunded buy is capped at the cash, and that is SETTLED BY PRECEDENT** (ADR-0010: the
//      Waterfall must not fund spending from money that does not exist; `SHORTFALL_LINE`: a balance
//      that went negative would be an unstated loan at an unstated rate). A month with no cash buys
//      nothing and emits no line.
//   4. **A parcel belongs to a PERSON and to exactly one** (P3-21c). A `household`-owned buy is
//      refused rather than split, and the parcel lands on the Person the line names.
//   5. **A DRAW does not compile and is refused again at run time.** Chunk 4 owns the disposal.
//   6. **Limb 3 still draws nil, in the same words** — a funded portfolio does not make it draw.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { toCents } from '../dist/core/money.js';
import {
  PORTFOLIO_PURCHASE_LINE,
  UNLEGISLATED,
  parcelsAfterPurchases,
  statedBy,
  project,
  purchaseFromBuy,
  unfundedMiddleLimbs,
} from '../dist/core/projection.js';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

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

// A couple well under Age Pension age, so no entitlement moves underneath the figures, with one
// salary and no spending level: the running cash is a straight line and every departure from it is
// the buy. 30 months, 2026-09 to 2029-02.
const SETTINGS = {
  asAtDate: '2026-09-16',
  planningHorizonAge: 51,
  // Pay rising with wages (2026-09-23) is not this fixture's subject: `awote: 0` holds every salary at the figure stated. A proved control: every figure this file asserts is the same at nil on the build before pay rose.
  economicSeries: { cpi: 0.025, pblci: 0.025, awote: 0, mtawe: 0.035 },
  deemingRates: { lower: 0.0175, upper: 0.0375 },
  nominalReturn: 0.065,
  // Interest on cash (2026-09-23) is not this fixture's subject: stated nil, the control proved byte-identical to the walk before it existed.
  cashInterestRate: 0,
};
const HOUSEHOLD = {
  persons: [
    person('Val', '1976-05-10', { employmentIncomePerFortnight: toCents(10_000) }),
    person('Ken', '1978-02-02'),
  ],
  homeStatus: 'occupied',
};
const buy = (over = {}) => ({
  id: 'buy',
  date: '2026-12-05',
  owner: 'personA',
  type: 'NON_SUPER_INVESTMENT',
  params: { direction: 'buy', amount: toCents(50_000), incidentalCostsOfAcquisition: toCents(0) },
  enabled: true,
  createdAt: '2026-06-01',
  ...over,
});
const monthAt = (months, month) => months.find((m) => m.month === month);
const reconciles = (months) => {
  for (const m of months) {
    const closing = m.lines.reduce(
      (balance, line) => balance + (line.effect !== 'cash' ? 0 : line.direction === 'inflow' ? line.amount : -line.amount),
      m.openingBalance,
    );
    assert.equal(closing, m.closingBalance, `${m.month} does not reconcile`);
  }
};
// **The parcel half of `assessableAssets`, since P4-3b.** The Offset Account — the walk's own
// running cash — is assessed at the figure the month OPENS with, so for this Household (no super,
// no other asset) `assessableAssets = parcels + openingBalance` exactly. Subtracting the opening
// cash is how this file still speaks about parcels alone, and it is NOT a way of hiding the change:
// were the Offset taken back out of the split, every one of these would read the cash as a parcel
// shortfall and fail.
const parcelsOnly = (m) => m.assessableAssets - m.openingBalance;

// --- 1. THE DOLLAR PAIR --------------------------------------------------------------------------

test('a $50,000 buy with $30 of brokerage leaves the Household $50,030 poorer in cash and $50,000 richer in parcels', () => {
  // ⚠️ **REWRITTEN, not deleted (ruled 2026-09-17).** Chunk 3 asserted this pair as $50,000 and
  // $50,000, on a model with no field for incidental costs of acquisition. There is one now (ITAA
  // 1997 s 110-25): brokerage is PAID and buys NO UNITS, so the two halves of the pair part company.
  // The trap the pair defends is unchanged and is the reason it is still a pair — a parcel created
  // without the cash moving manufactures wealth from nothing.
  const without = project(SETTINGS, HOUSEHOLD, []);
  const bought = project(SETTINGS, HOUSEHOLD, [buy({ params: { direction: 'buy', amount: toCents(50_000), incidentalCostsOfAcquisition: toCents(30) } })]);

  // The control walk holds no parcels at all and never spends a cent on one. Its January assessable
  // figure is $55,906.68 — NOT nil, and it was nil until P4-3b: four months of the $13,976.67 net
  // salary is the Offset Account, and the Offset is now assessed at the balance the month opens
  // with. The parcel half is what this control is about, and it is nil.
  assert.equal(monthAt(without, '2026-12').closingBalance, 5_590_668);
  assert.equal(monthAt(without, '2027-01').openingBalance, 5_590_668);
  assert.equal(monthAt(without, '2027-01').assessableAssets, 5_590_668);
  assert.equal(parcelsOnly(monthAt(without, '2027-01')), toCents(0));
  assert.equal(
    without.flatMap((m) => m.lines).filter((l) => l.description.startsWith(PORTFOLIO_PURCHASE_LINE)).length,
    0,
  );

  // THE CASH. $50,030 leaves, in the entry's own month — and since P4-4's polish it leaves on TWO
  // lines rather than one.
  //
  // ⚠️ **REWRITTEN, NOT DELETED (2026-09-18).** This block read:
  //
  //     // THE CASH. One outflow, at the GROSS figure — $50,030, not $50,000 — in the entry's own month.
  //     assert.equal(purchase.length, 1);
  //     assert.deepEqual(purchase[0], { direction: 'outflow', effect: 'cash',
  //       description: 'Non-Super Portfolio purchase, Val', amount: 5_003_000 });
  //
  // The single gross line was the reason the fee was wealth with no line against it — the purchase
  // said $50,030 moved and the parcel said $50,000 arrived, and nothing named the $30. The purchase
  // line is the UNITS now and the fee has `PORTFOLIO_BROKERAGE_LINE` of its own. **No cash moved
  // with the rewrite**: the two lines sum to $50,030, which is what the closing balances below say,
  // and they are the figures this test asserted before the change, unchanged.
  const december = monthAt(bought, '2026-12');
  const purchase = december.lines.filter((l) => l.description === 'Non-Super Portfolio purchase, Val');
  assert.equal(purchase.length, 1);
  assert.deepEqual(purchase[0], { direction: 'outflow', effect: 'cash', description: 'Non-Super Portfolio purchase, Val', amount: 5_000_000, provenance: UNLEGISLATED.portfolioPurchase, attribution: statedBy('buy') });
  const fee = december.lines.filter((l) => l.description === 'Non-Super Portfolio brokerage, Val');
  assert.equal(fee.length, 1);
  assert.deepEqual(fee[0], { direction: 'outflow', effect: 'cash', description: 'Non-Super Portfolio brokerage, Val', amount: toCents(30), provenance: UNLEGISLATED.brokerage, attribution: statedBy('buy') });
  // $50,000.00 of units + $30.00 of fee = $50,030.00, the figure the one line used to carry.
  assert.equal(purchase[0].amount + fee[0].amount, 5_003_000);
  assert.equal(december.closingBalance, 587_668);
  assert.equal(monthAt(without, '2026-12').closingBalance - december.closingBalance, 5_003_000);

  // THE PARCELS. $50,000 — the AMOUNT alone — at the first month the means test reads them. The
  // brokerage bought no units, so it is not here, and this is the half of the pair that is still
  // $50,000 while the cash half is $50,030.
  assert.equal(parcelsOnly(december), toCents(0), 'the month is assessed on what it opened with');
  assert.equal(december.assessableAssets, 4_193_001, 'and what it opened with is three months of salary');
  assert.equal(parcelsOnly(monthAt(bought, '2027-01')), toCents(50_000));
  assert.notEqual(parcelsOnly(monthAt(bought, '2027-01')), 5_003_000);
  assert.equal(
    parcelsOnly(monthAt(bought, '2027-01')) - parcelsOnly(monthAt(without, '2027-01')),
    toCents(50_000),
  );

  // ⚠️ **AND SINCE P4-3b THE TOTAL IS ITS OWN CONSERVATION CHECK, which is a STRONGER form of the
  // trap this test exists for.** Both halves of the pair are assessable now — the cash it gave up
  // and the units it got — so buying $50,000 of ETFs moves the means test by the BROKERAGE ALONE:
  // $50,000.00 of new parcels less $50,030.00 of spent cash = **−$30.00**. Wealth manufactured from
  // nothing would show up here as a $50,000 gain in assessable assets against a control that kept
  // its money, with no offsetting fall in the cash.
  assert.equal(monthAt(bought, '2027-01').assessableAssets, 5_587_668);
  assert.equal(
    monthAt(bought, '2027-01').assessableAssets - monthAt(without, '2027-01').assessableAssets,
    -toCents(30),
  );

  // And the money did not come from nowhere: every month of both walks reconciles.
  reconciles(bought);
  reconciles(without);
  assert.equal(bought.length, 30);

  // The cash is $50,030 down for the REST of the walk, not just in December — the money left and
  // stayed gone, brokerage included.
  for (const m of bought.filter((x) => x.month >= '2026-12')) {
    assert.equal(monthAt(without, m.month).closingBalance - m.closingBalance, 5_003_000, m.month);
  }

  // The COST BASE is the gross figure, and it is $30 above the market value from the moment the
  // parcel exists: the parcel is under water by the brokerage, which is what a disposal nets off.
  const resolved = purchaseFromBuy(
    buy({ params: { direction: 'buy', amount: toCents(50_000), incidentalCostsOfAcquisition: toCents(30) } }),
    HOUSEHOLD,
    toCents(1_000_000),
  );
  assert.equal(resolved.funded, 5_003_000);
  assert.equal(resolved.parcel.costBase, 5_003_000);
  assert.equal(resolved.parcel.marketValue, 5_000_000);
  assert.equal(resolved.parcel.costBase - resolved.parcel.marketValue, toCents(30));
});

test('the parcel is bought AT COST and grows only from the NEXT month — chunk 2, through an entry', () => {
  const bought = project(SETTINGS, HOUSEHOLD, [buy()]);
  // $50,000.00 in the first assessed month and $50,263.08 in the second: one month of 6.5% compounded
  // as (1 + r)^(1/12) on $50,000 and on nothing else. A parcel that had grown in its purchase month
  // would read $50,263.08 in January, and one carried at anything but its cost could not produce
  // either figure.
  // (`parcelsOnly` because since P4-3b the Offset is in the figure too, and it is the salary
  // accumulating at $13,976.67 a month, which has nothing to do with the growth rate under test.)
  assert.equal(parcelsOnly(monthAt(bought, '2027-01')), 5_000_000);
  assert.equal(parcelsOnly(monthAt(bought, '2027-02')), 5_026_308);
  assert.equal(parcelsOnly(monthAt(bought, '2027-03')), 5_052_754);
});

// --- 2. WHOSE, WHICH DAY, AND WHAT IT COST -------------------------------------------------------

test('`purchaseFromBuy` dates the parcel the ENTRY’s day and costs it at what was PAID', () => {
  const household = { persons: [person('Val', '1976-05-10'), person('Ken', '1978-02-02')], homeStatus: 'occupied' };
  const purchase = purchaseFromBuy(buy({ date: '2027-03-14' }), household, toCents(1_000_000));

  // The day. Chunk 4 halves the gain on a parcel held MORE THAN 12 months, so this field is the
  // difference between two tax bills, and none of the days the model could have supplied instead —
  // the walk's start, `asAtDate`, the month's first day, a clock — is this one.
  assert.equal(purchase.parcel.acquired, '2027-03-14');
  assert.notEqual(purchase.parcel.acquired, SETTINGS.asAtDate);
  assert.notEqual(purchase.parcel.acquired, '2026-09-01');
  assert.notEqual(purchase.parcel.acquired, '2027-03-01');

  // What it cost, and what it is worth: ONE figure on the day of purchase, and the same figure the
  // cash gave up. A cost base that were anything else would be a gain (or a loss) invented at the
  // moment of buying.
  assert.equal(purchase.funded, toCents(50_000));
  assert.equal(purchase.parcel.costBase, toCents(50_000));
  assert.equal(purchase.parcel.marketValue, toCents(50_000));
  assert.deepEqual(Object.keys(purchase.parcel).sort(), ['acquired', 'costBase', 'marketValue']);

  // With incidental costs stated, the three figures are three figures (s 110-25): $50,030 of cash,
  // a $50,030 cost base and $50,000 of units. `toCents(0)` above is how an entry says there were
  // none, and it is REQUIRED — "nobody stated brokerage" and "there was no brokerage" are different
  // facts, so an absent field is refused rather than read as nil.
  const withFee = purchaseFromBuy(
    buy({ params: { direction: 'buy', amount: toCents(50_000), incidentalCostsOfAcquisition: toCents(30) } }),
    household,
    toCents(1_000_000),
  );
  assert.equal(withFee.funded, 5_003_000);
  assert.equal(withFee.parcel.costBase, 5_003_000);
  assert.equal(withFee.parcel.marketValue, 5_000_000);
  // **And the fee is CARRIED and not left to be subtracted (P4-4's polish).** The caller writes two
  // lines from this one object, so the $30 it charges and the $50,000 of units it bought come from
  // the same arithmetic that set the cost base — `marketValue + incidentalCostsOfAcquisition` is
  // `funded`, by construction and not by a second calculation at the line.
  assert.equal(withFee.incidentalCostsOfAcquisition, toCents(30));
  assert.equal(withFee.parcel.marketValue + withFee.incidentalCostsOfAcquisition, withFee.funded);
  assert.equal(purchase.incidentalCostsOfAcquisition, toCents(0), 'and an entry stating no fee carries a nil, not an absent field');
  assert.deepEqual(Object.keys(withFee).sort(), ['funded', 'incidentalCostsOfAcquisition', 'parcel', 'personIndex']);
  assert.throws(
    () => purchaseFromBuy(buy({ params: { direction: 'buy', amount: toCents(50_000) } }), household, toCents(1_000_000)),
    /incidental costs of acquisition of undefined, which is not a whole number of cents/,
  );

  // Whose. `personA` is `persons[0]` and `personB` is `persons[1]` — positional, as `EntryOwner` says.
  assert.equal(purchase.personIndex, 0);
  assert.equal(purchaseFromBuy(buy({ owner: 'personB' }), household, toCents(1_000_000)).personIndex, 1);
});

test('a purchase joins the portfolio of the Person it names, and of NO other (P3-21c)', () => {
  const val = [{ acquired: '2019-02-14', costBase: toCents(120_000), marketValue: toCents(250_000) }];
  const ken = [];
  const purchase = {
    personIndex: 1,
    funded: toCents(50_000),
    parcel: { acquired: '2026-12-05', costBase: toCents(50_000), marketValue: toCents(50_000) },
  };
  const after = parcelsAfterPurchases([val, ken], [purchase]);

  // A dollar figure on each side, not a shape: Val's portfolio is untouched at $250,000 and Ken's is
  // $50,000 that was not there before. A parcel written to the other Person moves both numbers.
  assert.equal(after[0].reduce((sum, p) => sum + p.marketValue, 0), toCents(250_000));
  assert.equal(after[1].reduce((sum, p) => sum + p.marketValue, 0), toCents(50_000));
  assert.equal(after[0].length, 1);
  assert.deepEqual(after[1], [purchase.parcel]);
  // The input is not mutated — the walk carries these arrays across months.
  assert.equal(val.length, 1);
  assert.equal(ken.length, 0);

  // And the same purchase against person 0 is the other answer, so the assertion above is not
  // passing for the wrong reason.
  const swapped = parcelsAfterPurchases([val, ken], [{ ...purchase, personIndex: 0 }]);
  assert.equal(swapped[0].reduce((sum, p) => sum + p.marketValue, 0), toCents(300_000));
  assert.equal(swapped[1].length, 0);

  assert.throws(() => parcelsAfterPurchases([val], [purchase]), /names person 1, who holds no carried parcels/);
});

test('a buy owned by the HOUSEHOLD is REFUSED, not split (P3-21c)', () => {
  // Whose name the gain is in is decided years before it matters and cannot be shifted after the
  // fact, so there is no household portfolio to put this in and no split this loop may invent.
  assert.throws(
    () => project(SETTINGS, HOUSEHOLD, [buy({ owner: 'household' })]),
    /owned by the household, but a non-super parcel belongs to a Person and to exactly one \(P3-21c\)/,
  );
  // And a Person who is not there is refused rather than silently dropped.
  const single = { persons: [HOUSEHOLD.persons[0]], homeStatus: 'occupied' };
  assert.throws(
    () => project(SETTINGS, single, [buy({ owner: 'personB' })]),
    /owned by personB, and this Household has 1 Person/,
  );
  // The control: the same entry against a Person projects perfectly well.
  assert.equal(parcelsOnly(monthAt(project(SETTINGS, HOUSEHOLD, [buy()]), '2027-01')), toCents(50_000));
});

// --- 3. THE MONEY HAS TO BE THERE ----------------------------------------------------------------

test('a buy is funded to the CASH ON HAND and never past it — the unstated loan this model refuses', () => {
  // ADR-0010: the Waterfall must not fund spending from a refund before the refund exists.
  // `SHORTFALL_LINE`: this model has no borrowing facility, and a balance that went negative would
  // be an unstated loan at an unstated rate. A buy funded past the cash is that loan, wearing a
  // parcel — so `min(stated, cash)`, exactly as every Waterfall limb takes `min(available, outstanding)`.
  const months = project(SETTINGS, HOUSEHOLD, [buy({ date: '2026-10-20' })]);
  const october = monthAt(months, '2026-10');
  const purchase = october.lines.find((l) => l.description === 'Non-Super Portfolio purchase, Val');

  // $50,000 was stated and $27,953.34 was in the account: the line carries what actually moved.
  assert.equal(purchase.amount, 2_795_334);
  assert.notEqual(purchase.amount, toCents(50_000));
  assert.equal(october.closingBalance, toCents(0));
  assert.equal(monthAt(months, '2026-11').assessableAssets, 2_795_334, 'the parcel is the money that moved');
  reconciles(months);

  // Never negative, in any month.
  for (const m of months) assert.ok(m.closingBalance >= 0, m.month);

  // At the unit: nil cash buys nothing at all, and there is nothing for the caller to emit a line
  // for. `undefined` is not a $0 purchase — a month in which no ETF was bought has no line saying
  // one was.
  const household = { persons: [person('Val', '1976-05-10')], homeStatus: 'occupied' };
  assert.equal(purchaseFromBuy(buy(), household, toCents(0)), undefined);
  assert.equal(purchaseFromBuy(buy(), household, toCents(50_000)).funded, toCents(50_000));
  assert.equal(purchaseFromBuy(buy(), household, toCents(49_999.99)).funded, toCents(49_999.99));
  assert.equal(purchaseFromBuy(buy(), household, toCents(50_000.01)).funded, toCents(50_000));

  // **THE CAP IS ON THE GROSS COST, and that is the ruling of 2026-09-17 in one figure.** A
  // Household holding $50,010 that states a $50,000 buy with $30 of brokerage cannot pay $50,030. It
  // pays the $50,010 it has: the fee is paid first and the units take what is left, so the parcel is
  // a $50,010 cost base over $49,980 of units. Capping on the NET would have it pay $50,030 out of
  // $50,010 — the unstated loan this model refuses, wearing a parcel.
  const fee = buy({ params: { direction: 'buy', amount: toCents(50_000), incidentalCostsOfAcquisition: toCents(30) } });
  const capped = purchaseFromBuy(fee, household, toCents(50_010));
  assert.equal(capped.funded, 5_001_000);
  assert.notEqual(capped.funded, 5_003_000);
  assert.equal(capped.parcel.costBase, 5_001_000);
  assert.equal(capped.parcel.marketValue, 4_998_000);
  // And cash that is all fee and no units buys nothing at all — there is no trade to emit a line for.
  assert.equal(purchaseFromBuy(fee, household, toCents(30)), undefined);
  assert.equal(purchaseFromBuy(fee, household, toCents(30.01)).parcel.marketValue, toCents(0.01));

  // **And the PARCEL is the money that moved, not the money that was stated.** A cost base of
  // $50,000 against $30,000 actually paid would hand the household a $20,000 loss to realise in
  // chunk 4 — a tax deduction manufactured by a buy it could not afford.
  const short = purchaseFromBuy(buy(), household, toCents(30_000));
  assert.equal(short.funded, toCents(30_000));
  assert.equal(short.parcel.costBase, toCents(30_000));
  assert.equal(short.parcel.marketValue, toCents(30_000));
  assert.notEqual(short.parcel.costBase, toCents(50_000));
});

test('THE DIRECTION of an under-funded buy — the disclosure is DISCHARGED: cash and parcels are assessed alike', () => {
  // ⚠️ **THIS TEST USED TO PIN A FLATTERING RESIDUAL, AND P4-3b DISCHARGED IT.** It read: $50,000
  // was stated and $27,953.34 was paid, the unspent money stays in the running cash, the running
  // cash is not an asset anywhere in this model (nothing in `household.ts` held an offset balance),
  // so the means test sees less than the Household has and pays a LARGER Age Pension than the truth
  // — *"here as a number so that the day an Offset Account field lands, this test says what it was
  // worth."* **That day was 2026-09-18.** `Household.openingOffsetBalance` exists, the walk's
  // running cash is substituted into it every month, and `splitAssets` assesses it. So the residual
  // is worth nothing: cash and parcels are now assessed at the same figure, and the test asserts
  // THAT rather than the gap it used to measure.
  const capped = project(SETTINGS, HOUSEHOLD, [buy({ date: '2026-10-20' })]);
  const november = monthAt(capped, '2026-11');
  assert.equal(november.openingBalance, toCents(0), 'the unspent cash is nil here only because the cap took it all');
  assert.equal(november.assessableAssets, 2_795_334, 'two months of salary, all of it turned into units');
  assert.equal(parcelsOnly(november), 2_795_334);

  // **The control, and it is the discharge.** A household that simply keeps the money — no buy at
  // all — holds $27,953.34 of cash in November and is now assessed on **every cent of it**, at the
  // same $27,953.34 the buyer is assessed on. It reported NIL until P4-3b. Two months of the
  // $13,976.67 net salary is $27,953.34 either way; what changed is that the means test can see it.
  const kept = monthAt(project(SETTINGS, HOUSEHOLD, []), '2026-11');
  assert.equal(kept.openingBalance, 2_795_334);
  assert.equal(kept.assessableAssets, 2_795_334);
  assert.equal(parcelsOnly(kept), toCents(0), 'and not because it holds a parcel — it holds none');
  assert.equal(kept.assessableAssets - november.assessableAssets, toCents(0), 'buying changed nothing the test can see');
});

test('a Household that cannot fund its groceries buys NO ETFs — the buy is charged after the Waterfall', () => {
  // Spending is met first: $600,000 a year against one salary is an `Unfunded shortfall` every
  // month, the running cash is nil by construction, and the buy therefore finds nothing to spend.
  // The other order — folding the buy into the spending target — would report a household that
  // cannot eat BECAUSE it chose to invest, and P4-5 reads the Shortfall Age off that very line.
  const spend = {
    id: 'sc',
    date: '2026-09-01',
    owner: 'household',
    type: 'SPEND_CHANGE',
    params: { annualSpend: toCents(600_000) },
    enabled: true,
    createdAt: '2026-06-01',
  };
  const months = project(SETTINGS, HOUSEHOLD, [spend, buy({ date: '2026-10-20' })]);
  const october = monthAt(months, '2026-10');
  assert.ok(october.lines.some((l) => l.description === 'Unfunded shortfall' && l.amount > 0));
  assert.equal(october.lines.filter((l) => l.description.startsWith(PORTFOLIO_PURCHASE_LINE)).length, 0);
  assert.equal(october.closingBalance, toCents(0));
  // No parcel was created either — the whole walk holds nothing assessable.
  assert.deepEqual([...new Set(months.map((m) => m.assessableAssets))], [toCents(0)]);
  reconciles(months);

  // Not vacuous: the same buy without the spending level funds in full.
  assert.equal(
    monthAt(project(SETTINGS, HOUSEHOLD, [buy({ date: '2026-10-20' })]), '2026-10').lines.filter((l) =>
      l.description.startsWith(PORTFOLIO_PURCHASE_LINE),
    ).length,
    1,
  );
});

test('two buys in one month are two lines and two parcels, each against its own owner', () => {
  const months = project(SETTINGS, HOUSEHOLD, [
    buy({ id: 'b1', params: { direction: 'buy', amount: toCents(20_000), incidentalCostsOfAcquisition: toCents(0) } }),
    buy({ id: 'b2', owner: 'personB', params: { direction: 'buy', amount: toCents(10_000), incidentalCostsOfAcquisition: toCents(0) } }),
  ]);
  const december = monthAt(months, '2026-12');
  assert.deepEqual(
    december.lines.filter((l) => l.description.startsWith(PORTFOLIO_PURCHASE_LINE)),
    [
      { direction: 'outflow', effect: 'cash', description: 'Non-Super Portfolio purchase, Val', amount: toCents(20_000), provenance: UNLEGISLATED.portfolioPurchase, attribution: statedBy('b1') },
      { direction: 'outflow', effect: 'cash', description: 'Non-Super Portfolio purchase, Ken', amount: toCents(10_000), provenance: UNLEGISLATED.portfolioPurchase, attribution: statedBy('b2') },
    ],
  );
  assert.deepEqual(december.appliedEntryIds, ['b1', 'b2']);
  assert.equal(december.closingBalance, 2_590_668);
  assert.equal(parcelsOnly(monthAt(months, '2027-01')), toCents(30_000));
  assert.equal(monthAt(months, '2027-01').assessableAssets, 5_590_668, '$30,000 of parcels on top of December’s $25,906.68 of cash');
  reconciles(months);
});

// --- 4. STILL NO DRAW ----------------------------------------------------------------------------

test('a direction that is neither a BUY nor a SELL is refused at run time (chunk 4 widened the union)', () => {
  // `NonSuperInvestmentParams` is a two-member union from chunk 4 — `'buy' | 'sell'` — so no
  // TypeScript call site can state a third direction (`test/core-plan.test.mjs` compiles the probe).
  // A `.mjs` fixture and a stored plan file never meet the compiler, which is what this guard is for.
  for (const direction of ['draw', 'BUY', 'SELL', undefined]) {
    assert.throws(
      () => project(SETTINGS, HOUSEHOLD, [buy({ params: { direction, amount: toCents(1_000) } })]),
      /a Non-Super Portfolio entry is a 'buy' or a 'sell', and a disposal is never a negative buy/,
    );
  }
  // `'sell'` is no longer one of them: it projects, and it is `core-non-super-disposal.test.mjs`'s.
  assert.doesNotThrow(() => project(SETTINGS, HOUSEHOLD, [buy({ params: { direction: 'sell', amount: toCents(1_000) } })]));
  // A malformed amount is refused on the same ground `household.ts` refuses a malformed parcel:
  // fixtures and stored plans are not typechecked, and half a cent is not money.
  for (const amount of [100.5, -1, Number.NaN]) {
    assert.throws(
      () => project(SETTINGS, HOUSEHOLD, [buy({ params: { direction: 'buy', amount, incidentalCostsOfAcquisition: toCents(0) } })]),
      /which is not a whole number of cents/,
    );
  }
});

test('a BUY is not a draw: the walk that buys never sells, and limb 3’s nil branch is now a bug', () => {
  const holder = {
    persons: [
      { ...HOUSEHOLD.persons[0], parcels: [{ acquired: '2026-12-05', costBase: toCents(50_000), marketValue: toCents(50_000) }] },
      HOUSEHOLD.persons[1],
    ],
    homeStatus: 'occupied',
  };
  const limbs = unfundedMiddleLimbs(holder);
  assert.equal(limbs.nonSuperPortfolio.available, toCents(0));
  // ⚠️ **The refusal quoted here until P3-21f chunk 6 is discharged**, so the nil branch of a FUNDED
  // Household is now a stated bug rather than a fact — `nonSuperPortfolioLimb` builds one claim per
  // Person who holds anything and can only reach this text where they summed to nil.
  assert.match(limbs.nonSuperPortfolio.note, /this note is a BUG and not a fact/);
  // And nothing in a walk that buys ever draws the portfolio down: the only portfolio line in 30
  // months is the purchase itself, and the assessable assets only ever rise.
  const months = project(SETTINGS, HOUSEHOLD, [buy()]);
  const portfolioLines = months.flatMap((m) => m.lines).filter((l) => l.description.startsWith('Non-Super Portfolio'));
  assert.deepEqual(portfolioLines, [
    { direction: 'outflow', effect: 'cash', description: 'Non-Super Portfolio purchase, Val', amount: toCents(50_000), provenance: UNLEGISLATED.portfolioPurchase, attribution: statedBy('buy') },
  ]);
  const assets = months.filter((m) => m.month >= '2027-01').map((m) => m.assessableAssets);
  assert.deepEqual([...assets].sort((a, b) => a - b), assets);
});

// --- 5. A Household with no such entry is UNTOUCHED -----------------------------------------------

test('a DISABLED buy is the append-only-safe delete: byte-identical to no entry at all', () => {
  // ADR-0002. The chunk 1 digests (`core-non-super-parcels.test.mjs`) hold the same bar for a
  // Household that never had such an entry; this holds it for one that has a disabled one.
  assert.equal(
    JSON.stringify(project(SETTINGS, HOUSEHOLD, [buy({ enabled: false })])),
    JSON.stringify(project(SETTINGS, HOUSEHOLD, [])),
  );
  assert.notEqual(
    JSON.stringify(project(SETTINGS, HOUSEHOLD, [buy()])),
    JSON.stringify(project(SETTINGS, HOUSEHOLD, [])),
  );
});

test('a buy dated BEFORE the walk applies nowhere — it is an `event`, already paid and already held', () => {
  // `ENTRY_KIND.NON_SUPER_INVESTMENT` is `event`: the money is gone and the parcel is already in the
  // Household's stated `parcels`. Replaying it would spend the cash twice AND create a second parcel
  // with a cost base already accounted for.
  assert.equal(
    JSON.stringify(project(SETTINGS, HOUSEHOLD, [buy({ date: '2020-04-01' })])),
    JSON.stringify(project(SETTINGS, HOUSEHOLD, [])),
  );
});

// --- 6. STRUCTURAL: there is exactly ONE place a parcel is built from a buy -----------------------

test('STRUCTURAL — every `acquired` in `projection.ts` is an ENTRY’s day or a carried-through one', () => {
  // The dollar assertions above go through `purchaseFromBuy` and `parcelsAfterPurchases`, which is
  // only worth anything if the walk cannot build a parcel beside them. A hand-built parcel literal
  // anywhere else in this file — with a day the model chose, or a cost base that is not the money
  // that moved — is a line this pin does not allow.
  const source = readFileSync(join(ROOT, 'src', 'core', 'projection.ts'), 'utf8')
    .replaceAll(/\/\*[\s\S]*?\*\//g, '')
    .replaceAll(/\/\/.*$/gm, '');
  const built = source.split('\n').filter((line) => /\bacquired:/.test(line)).map((line) => line.trim());
  assert.deepEqual(built, [
    // The ONE construction from an entry, and it takes the day off the entry (`purchaseFromBuy`).
    'parcel: Object.freeze({ acquired: entry.date, costBase: funded, marketValue: units }),',
    // The discount's gate, which is a parameter list and builds nothing.
    'export const heldMoreThanTwelveMonths = (acquired: IsoDate, disposedOn: IsoDate): boolean =>',
    // `ParcelRealisation.acquired` — a field declaration, not a value.
    'readonly acquired: IsoDate;',
    // Four carries-through, each of an EXISTING parcel's own day: chunk 2's growth, chunk 4's
    // realisation record, chunk 4's retained remainder of a part-sold parcel, and — from 2026-09-22
    // (P3-22h step 2) — `parcelsAfterDistribution`, which raises a parcel's cost base and touches
    // its day not at all. None of the four can supply a day the model chose, which is the property
    // this pin exists for.
    'acquired: parcel.acquired,',
    'acquired: parcel.acquired,',
    // LR-1 slice 1, 2026-09-29: the refusal's parameter list and `ReformedRealisation.acquired`'s
    // declaration. Neither builds a parcel; `realisationFromJuly2027` carries the realisation's own
    // day through by shorthand.
    'constructor(acquired: IsoDate, disposedOn: IsoDate) {',
    // (The July 2027 stamp rebuilds a parcel by spread, so it carries the parcel's own day and has no
    // `acquired:` to pin. The R1 death refusal's parameter list stood here until R1 was ruled,
    // 2026-09-29: an inherited parcel now passes to the survivor unchanged, its own day with it.)
    'readonly acquired: IsoDate;',
    'acquired: parcel.acquired,',
    'acquired: parcel.acquired,',
    // P12-1, 2026-09-24: a parcel the deceased bought before CGT began passes on at its market value,
    // acquired on the death (ITAA 1997 s 128-15). The day is the DEATH entry's own, not one the
    // model chose — so the property this pin exists for still holds. From LR-1 slice 2 only a death
    // before 1 July 2027 does this (s 112-175(2): nothing is pre-CGT after it).
    '!reformed && parcel.acquired < CGT_START ? Object.freeze({ acquired: death.date, costBase: parcel.marketValue, marketValue: parcel.marketValue }) : parcel,',
  ]);
  // And the walk hands `purchaseFromBuy` the ENTRY, so there is no call site that could pass it
  // some other day.
  assert.match(source, /purchaseFromBuy\(entry, household, cash\)/);
  assert.ok(/\bacquired:/.test('  parcel: { acquired: settings.asAtDate },'), 'the pin would not catch a hand-built parcel');
});
