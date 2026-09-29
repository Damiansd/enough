// P3-21f chunk 4 — THE DISPOSAL, FIFO, AND THE 50% DISCOUNT.
//
// Chunk 3 could put money into the Non-Super Portfolio and nothing could take it out. This chunk
// sells: `NON_SUPER_INVESTMENT` widens to `'buy' | 'sell'`, a sale realises `proceeds − cost base`
// per parcel, the parcels go in a STATED order that defaults to oldest-first, and a parcel held MORE
// THAN 12 months is taxed on half its gain. It also carries the brokerage ruling of 2026-09-17 into
// the buy: incidental costs of acquisition are part of the cost base (ITAA 1997 s 110-25), so the
// cash out is the GROSS figure and the parcel is under water by the fee from the moment it exists.
//
// **What is defended here, and nothing else.**
//
//   1. **FIFO is a DEFAULT and it is worth a DOLLAR FIGURE.** One fixture of three parcels and one
//      $50,000 sale gives three different tax bills under the three selection rules — $10,000,
//      $5,750 and $10,625 of discounted gain on identical proceeds. Without that contrast the
//      default ships untested, because every ordering produces the same cash.
//   2. **The 12-month boundary is OFF BY ONE and it is two dollar figures, not a boolean.** Sold on
//      the anniversary: $50,000 of gain. Sold the next day: $25,000.
//   3. **A wrong acquisition day is now MONEY.** Chunks 1 and 3 disclosed that a wrong `acquired`
//      was caught only at unit level because no cost base or day reached a `Month` field. One day
//      either side of an anniversary is $25,000 here — see the test, and its honest note about what
//      is still not a `Month` field until chunk 5.
//   4. **A gain is measured from the COST BASE and never from the market value.** A parcel bought
//      with brokerage and sold at once realises a LOSS of exactly the brokerage.
//   5. **The rounding on half a cent has a stated direction: UP**, so the household is never
//      flattered. $25.01 of gain is $12.51 of discounted gain, never $12.50.
//   6. **Scope.** Limb 3 still draws nil with its refusal word for word (chunk 6). The scope line
//      that stood here — *"the gain reaches NO tax figure (chunk 5)"* — was true until chunk 5, and
//      the three assertions that carried it are REWRITTEN below rather than deleted: the gain now
//      reaches taxable income and $3,760 of tax on this file's own walk. What chunk 5 does with it is
//      defended in `test/core-non-super-gain-tax.test.mjs`; what is defended here is that a disposal
//      still reports the same sale, the same parcels and the same reconciliation it always did.
import test from 'node:test';
import assert from 'node:assert/strict';

import { toCents } from '../dist/core/money.js';
import {
  CAPITAL_GAINS_TAX_LINE,
  DEFAULT_PARCEL_SELECTION,
  PARCEL_SELECTIONS,
  PORTFOLIO_SALE_LINE,
  NO_STATING_ENTRY,
  UNATTRIBUTED,
  UNLEGISLATED,
  statedBy,
  disposalFromSell,
  discountedCapitalGain,
  heldMoreThanTwelveMonths,
  netCapitalGain,
  netCapitalGainFromJuly2027,
  parcelsInSelectionOrder,
  project,
  realisationFromJuly2027,
} from '../dist/core/projection.js';

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
const HOUSEHOLD = {
  persons: [
    person('Val', '1976-05-10', { employmentIncomePerFortnight: toCents(10_000) }),
    person('Ken', '1978-02-02'),
  ],
  homeStatus: 'occupied',
};
const sell = (over = {}) => ({
  id: 'sell',
  date: '2027-06-30',
  owner: 'personA',
  type: 'NON_SUPER_INVESTMENT',
  params: { direction: 'sell', amount: toCents(50_000) },
  enabled: true,
  createdAt: '2026-06-01',
  ...over,
});
const parcel = (acquired, costBase, marketValue) => ({
  acquired,
  costBase: toCents(costBase),
  marketValue: toCents(marketValue),
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
// running cash — is assessed at the figure the month OPENS with, so for these Households (no super)
// `assessableAssets = parcels + openingBalance` exactly. Subtracting the opening cash is how this
// file still speaks about the portfolio alone; it hides nothing, because taking the Offset back out
// of the split would make every one of these read the month's cash as a portfolio shortfall.
const parcelsOnly = (m) => m.assessableAssets - m.openingBalance;

// --- 1. FIFO, AND THE TWO ORDERINGS THAT COULD NOT PRODUCE ITS FIGURE ----------------------------

// Three parcels, hand-chosen so that each selection rule takes a DIFFERENT SET and the three sets
// realise three different gains. Total holdings $90,000; the sale is $50,000, so every rule sells one
// parcel whole and part of a second — which also exercises the cost-base apportionment three times.
//
//   P1  2020-01-15   cost $10,000   value $20,000    held > 12 months at the sale
//   P2  2026-09-01   cost $28,000   value $30,000    held 10 months — NO discount
//   P3  2015-03-03   cost $25,000   value $40,000    held > 12 months
const THREE = [parcel('2020-01-15', 10_000, 20_000), parcel('2026-09-01', 28_000, 30_000), parcel('2015-03-03', 25_000, 40_000)];
const SELLER = { persons: [person('Val', '1976-05-10', { parcels: THREE }), person('Ken', '1978-02-02')], homeStatus: 'occupied' };

test('FIFO is worth a DOLLAR FIGURE the other two selection rules could not produce', () => {
  // OLDEST FIRST (the default, P3-21a ruled 2026-09-17): P3 whole, then half of P1.
  //   P3  $40,000 − $25,000 = $15,000 nominal, held since 2015 → $7,500 discounted
  //   P1  half of it: $10,000 − $5,000 = $5,000 nominal, held since 2020 → $2,500 discounted
  //   ⇒ $20,000 nominal, $10,000 discounted
  const fifo = disposalFromSell(sell(), SELLER, [THREE, []]);
  assert.equal(fifo.proceeds, toCents(50_000));
  assert.equal(fifo.nominalGain, toCents(20_000));
  assert.equal(fifo.discountedGain, toCents(10_000));
  assert.deepEqual(fifo.realisations.map((r) => r.acquired), ['2015-03-03', '2020-01-15']);

  // HIGHEST COST BASE FIRST — minimise the gain this year: P2 whole, then half of P3.
  //   P2  $30,000 − $28,000 = $2,000 nominal, bought 2026-09-01 and sold 2027-06-30 → NO discount
  //   P3  half of it: $20,000 − $12,500 = $7,500 nominal → $3,750 discounted
  //   ⇒ $9,500 nominal, $5,750 discounted
  const minimise = disposalFromSell(sell({ params: { direction: 'sell', amount: toCents(50_000), parcelSelection: 'highest-cost-base-first' } }), SELLER, [THREE, []]);
  assert.equal(minimise.nominalGain, toCents(9_500));
  assert.equal(minimise.discountedGain, toCents(5_750));
  assert.deepEqual(minimise.realisations.map((r) => r.acquired), ['2026-09-01', '2015-03-03']);
  assert.deepEqual(minimise.realisations.map((r) => r.discountApplies), [false, true]);

  // LOWEST COST BASE FIRST — realise gain deliberately: P1 whole, then three quarters of P3.
  //   P1  $20,000 − $10,000 = $10,000 nominal → $5,000 discounted
  //   P3  three quarters: $30,000 − $18,750 = $11,250 nominal → $5,625 discounted
  //   ⇒ $21,250 nominal, $10,625 discounted
  const realise = disposalFromSell(sell({ params: { direction: 'sell', amount: toCents(50_000), parcelSelection: 'lowest-cost-base-first' } }), SELLER, [THREE, []]);
  assert.equal(realise.nominalGain, toCents(21_250));
  assert.equal(realise.discountedGain, toCents(10_625));

  // THE CONTRAST, stated as the thing it is: three tax bills, ONE cash figure. Nothing in the
  // month's lines can tell these apart — which is exactly why the default needed a dollar figure.
  assert.deepEqual(
    [fifo.discountedGain, minimise.discountedGain, realise.discountedGain],
    [toCents(10_000), toCents(5_750), toCents(10_625)],
  );
  assert.equal(new Set([fifo.discountedGain, minimise.discountedGain, realise.discountedGain]).size, 3);
  assert.deepEqual([fifo.proceeds, minimise.proceeds, realise.proceeds], [toCents(50_000), toCents(50_000), toCents(50_000)]);
});

test('the DEFAULT is oldest-first, it is a named value, and it is OVERRIDABLE per disposal', () => {
  // ADR-0004: a model proposes and does not dispose. The rule must be visible (a named export, not a
  // `??` in a branch) and overridable (P3-21d's sequencing lever is the case for choosing against it).
  assert.equal(DEFAULT_PARCEL_SELECTION, 'oldest-first');
  assert.deepEqual([...PARCEL_SELECTIONS], ['oldest-first', 'highest-cost-base-first', 'lowest-cost-base-first']);

  // Stating the default explicitly and stating nothing at all are the same disposal, to the cent.
  const implied = disposalFromSell(sell(), SELLER, [THREE, []]);
  const stated = disposalFromSell(sell({ params: { direction: 'sell', amount: toCents(50_000), parcelSelection: 'oldest-first' } }), SELLER, [THREE, []]);
  assert.deepEqual(implied.realisations, stated.realisations);
  assert.equal(stated.discountedGain, toCents(10_000));

  // And the ordering itself, so a rule that merely LOOKED at the field would still be caught.
  assert.deepEqual(parcelsInSelectionOrder(THREE, 'oldest-first').map((p) => p.acquired), ['2015-03-03', '2020-01-15', '2026-09-01']);
  assert.deepEqual(parcelsInSelectionOrder(THREE, 'highest-cost-base-first').map((p) => p.costBase), [toCents(28_000), toCents(25_000), toCents(10_000)]);
  assert.deepEqual(parcelsInSelectionOrder(THREE, 'lowest-cost-base-first').map((p) => p.costBase), [toCents(10_000), toCents(25_000), toCents(28_000)]);

  // A tie keeps the Household's stated order — the only other fact available. Any invented
  // tie-break would be a selection policy written where nobody would look for one.
  const tied = [parcel('2020-01-15', 5_000, 9_000), parcel('2020-01-15', 5_000, 7_000)];
  assert.deepEqual(parcelsInSelectionOrder(tied, 'oldest-first').map((p) => p.marketValue), [toCents(9_000), toCents(7_000)]);
  assert.deepEqual(parcelsInSelectionOrder(tied, 'highest-cost-base-first').map((p) => p.marketValue), [toCents(9_000), toCents(7_000)]);

  // A fourth rule does not compile (`core-plan.test.mjs`) and is refused here too, for the `.mjs`
  // fixtures and stored plans the compiler never sees.
  assert.throws(
    () => disposalFromSell(sell({ params: { direction: 'sell', amount: toCents(1_000), parcelSelection: 'smallest-first' } }), SELLER, [THREE, []]),
    /unknown parcel selection "smallest-first": state one of oldest-first, highest-cost-base-first, lowest-cost-base-first/,
  );
});

// --- 2. THE 12-MONTH BOUNDARY, AS TWO DOLLAR FIGURES ---------------------------------------------

const ANNIVERSARY = [parcel('2026-06-30', 100_000, 150_000)];
const ANNIVERSARY_HOUSEHOLD = { persons: [person('Val', '1976-05-10', { parcels: ANNIVERSARY })], homeStatus: 'occupied' };
const soldOn = (date, parcels = ANNIVERSARY) =>
  disposalFromSell(sell({ date, params: { direction: 'sell', amount: toCents(150_000) } }), ANNIVERSARY_HOUSEHOLD, [parcels]);

test('EXACTLY 12 months does NOT qualify: $50,000 on the anniversary, $25,000 the next day', () => {
  // s 115-25 requires the asset to have been held for MORE THAN 12 months. Acquired 30 June 2026:
  //   sold 30 June 2027 — one day short — $150,000 − $100,000 = $50,000, and the whole of it is taxed
  //   sold  1 July 2027 — more than 12 months — the same $50,000 nominal, HALVED to $25,000
  // Two dollar figures, not a boolean: a build that had the comparison the wrong way round would
  // still report a `discountApplies` flag that read perfectly.
  const onTheDay = soldOn('2027-06-30');
  const theNextDay = soldOn('2027-07-01');
  assert.equal(onTheDay.nominalGain, toCents(50_000));
  assert.equal(onTheDay.discountedGain, toCents(50_000));
  assert.equal(theNextDay.nominalGain, toCents(50_000));
  assert.equal(theNextDay.discountedGain, toCents(25_000));
  assert.equal(onTheDay.discountedGain - theNextDay.discountedGain, toCents(25_000));

  // A day BEFORE the anniversary is the undiscounted figure too, so the boundary is pinned on both
  // sides and the test is not passing because the discount never applies at all.
  assert.equal(soldOn('2027-06-29').discountedGain, toCents(50_000));
  assert.equal(soldOn('2028-06-30').discountedGain, toCents(25_000));
  // **From 1 July 2027 the gain is split (LR-1), and these two sales are after it**, so a parcel held
  // through 30 June 2027 must carry its value just before that day. At $150,000 — no growth after
  // it — the whole $50,000 is the deferred gain, discounted on the REALISATION day (s 112-160(3)(c)),
  // and the later part is nil: $150,000 is between the value and the value indexed. The same $25,000.
  for (const day of ['2027-07-01', '2028-06-30']) {
    const stamped = soldOn(day, [{ ...ANNIVERSARY[0], valueJustBefore1July2027: toCents(150_000) }]);
    const reformed = stamped.realisations.map((r) => realisationFromJuly2027(r, day, 0.025));
    assert.equal(netCapitalGainFromJuly2027(reformed).netGain, toCents(25_000), day);
  }

  assert.equal(heldMoreThanTwelveMonths('2026-06-30', '2027-06-30'), false);
  assert.equal(heldMoreThanTwelveMonths('2026-06-30', '2027-07-01'), true);
  // 29 February settles where the calendar lives (`nthBirthday`): the year is completed on 1 March,
  // so the discount arrives a day later rather than a day earlier.
  assert.equal(heldMoreThanTwelveMonths('2028-02-29', '2029-03-01'), false);
  assert.equal(heldMoreThanTwelveMonths('2028-02-29', '2029-03-02'), true);
});

test('A WRONG ACQUISITION DAY IS NOW MONEY — the weakness chunks 1 and 3 carried forward', () => {
  // Chunk 3 stated it plainly: a wrong `acquired` was caught only at unit level, because no
  // acquisition day reached a `Month` field. It is a DOLLAR FIGURE from this chunk on — one day
  // earlier on the same parcel is $25,000 of discounted gain against $50,000.
  const stated = soldOn('2027-06-30');
  const oneDayEarlier = soldOn('2027-06-30', [parcel('2026-06-29', 100_000, 150_000)]);
  assert.equal(stated.discountedGain, toCents(50_000));
  assert.equal(oneDayEarlier.discountedGain, toCents(25_000));
  assert.equal(stated.discountedGain - oneDayEarlier.discountedGain, toCents(25_000));
  // Honest about what is still NOT closed: the proceeds, the cash and the parcels are identical
  // across those two walks, so the figure that moved is the one chunk 5 puts into taxable income.
  // A wrong day is money at this function and is still invisible in a `Month` until then.
  assert.equal(stated.proceeds, oneDayEarlier.proceeds);
  assert.deepEqual(stated.parcelsAfter, oneDayEarlier.parcelsAfter);
});

// --- 3. THE GAIN IS MEASURED FROM THE COST BASE --------------------------------------------------

test('a gain is `proceeds − COST BASE`, never `proceeds − market value`', () => {
  // The two figures are equal on a parcel bought without a fee, which is exactly why this fixture
  // uses one bought WITH a fee: $50,000 of units with $30 of brokerage is a $50,030 cost base over
  // $50,000 of market value, so selling it at once realises a LOSS of $30 — and a build that
  // measured the gain against the market value would realise nil.
  const underWater = [parcel('2026-12-05', 50_030, 50_000)];
  const household = { persons: [person('Val', '1976-05-10', { parcels: underWater })], homeStatus: 'occupied' };
  const disposal = disposalFromSell(sell({ params: { direction: 'sell', amount: toCents(50_000) } }), household, [underWater]);
  assert.equal(disposal.proceeds, toCents(50_000));
  assert.equal(disposal.nominalGain, toCents(-30));
  assert.equal(disposal.discountedGain, toCents(-30));
  assert.notEqual(disposal.nominalGain, toCents(0));
  // A loss is NOT discounted — there is no such thing as a discounted capital loss (s 115-25) —
  // even though this parcel is well past 12 months by the time it is sold.
  assert.equal(disposal.realisations[0].discountApplies, false);
  assert.equal(heldMoreThanTwelveMonths('2026-12-05', '2027-06-30'), false);
  const later = disposalFromSell(sell({ date: '2028-06-30', params: { direction: 'sell', amount: toCents(50_000) } }), household, [underWater]);
  assert.equal(later.realisations[0].discountApplies, false);
  assert.equal(later.discountedGain, toCents(-30));
  // After 1 July 2027 (LR-1), with the value just before it at $50,000: the $30 is the DEFERRED loss
  // (s 112-160(4)), never discounted, and the later part is nil.
  const stamped = disposalFromSell(sell({ date: '2028-06-30', params: { direction: 'sell', amount: toCents(50_000) } }), household, [[{ ...underWater[0], valueJustBefore1July2027: toCents(50_000) }]]);
  const [reformed] = stamped.realisations.map((r) => realisationFromJuly2027(r, '2028-06-30', 0.025));
  assert.deepEqual([reformed.deferredGain, reformed.deferredDiscountApplies, reformed.postGain], [toCents(-30), false, toCents(0)]);
});

test('⚠️ `discountedGain` is a SUM and s 102-5 is not — both figures are carried for chunk 5', () => {
  // Where a loss is realised alongside a gain, the Act applies the loss to gross gains BEFORE the
  // discount and lets the taxpayer choose which gain first. This chunk does NOT do that ordering; it
  // carries the raw material and says so. Here: a $10,000 discounted gain and a $30 loss.
  const mixed = [parcel('2015-03-03', 25_000, 40_000), parcel('2026-12-05', 50_030, 50_000)];
  const household = { persons: [person('Val', '1976-05-10', { parcels: mixed })], homeStatus: 'occupied' };
  const disposal = disposalFromSell(sell({ params: { direction: 'sell', amount: toCents(90_000) } }), household, [mixed]);
  assert.equal(disposal.nominalGain, toCents(14_970)); // $15,000 − $30
  assert.equal(disposal.discountedGain, toCents(7_470)); // $7,500 − $30, summed
  // The s 102-5 method statement on the same facts nets first: ($15,000 − $30) ÷ 2 = $7,485, which
  // is $15 MORE than the sum above. Chunk 4 wrote that figure down as a prediction and chunk 5 now
  // computes it — and it is the netted one, never `discountedGain`, that reaches taxable income.
  assert.equal(netCapitalGain(disposal.realisations), toCents(7_485));
  assert.equal(netCapitalGain(disposal.realisations) - disposal.discountedGain, toCents(15));
  // With no undiscountable gain in the set there is nowhere else for the loss to go, so the
  // taxpayer's choice makes no difference HERE. It makes $1,000 of difference where there is —
  // see `test/core-non-super-gain-tax.test.mjs`.
  assert.equal(netCapitalGain(disposal.realisations, 'undiscountable-gains-first'), toCents(7_485));
  assert.deepEqual(disposal.realisations.map((r) => r.nominalGain), [toCents(15_000), toCents(-30)]);
  assert.deepEqual(disposal.realisations.map((r) => r.discountApplies), [true, false]);
});

// --- 4. THE ROUNDING, WITH ITS DIRECTION ---------------------------------------------------------

test('half a cent rounds UP — $25.01 of gain is $12.51 discounted, never $12.50', () => {
  // The direction is stated where the code is: the discounted figure is what chunk 5 puts into
  // taxable income, so rounding it UP can only ever charge the household more tax than the exact
  // half-cent, never less. Rounding down would flatter by half a cent per parcel disposed of.
  assert.equal(discountedCapitalGain(2_501), 1_251);
  assert.notEqual(discountedCapitalGain(2_501), 1_250);
  assert.equal(discountedCapitalGain(1), 1);
  assert.equal(discountedCapitalGain(2), 1);
  assert.equal(discountedCapitalGain(3), 2);
  assert.equal(discountedCapitalGain(toCents(50_000)), toCents(25_000));

  // And it is reached through a real disposal, not only at the unit: a $1,000.00 parcel sold for
  // $1,025.01 is $25.01 of gain and $12.51 of discounted gain.
  const odd = [parcel('2015-03-03', 1_000, 1_025.01)];
  const household = { persons: [person('Val', '1976-05-10', { parcels: odd })], homeStatus: 'occupied' };
  const disposal = disposalFromSell(sell({ params: { direction: 'sell', amount: toCents(1_025.01) } }), household, [odd]);
  assert.equal(disposal.nominalGain, 2_501);
  assert.equal(disposal.discountedGain, 1_251);

  // A loss is refused rather than halved.
  assert.throws(() => discountedCapitalGain(-100), /applies to a capital GAIN, and -100 is not one \(s 115-25\)/);
  assert.throws(() => discountedCapitalGain(0), /applies to a capital GAIN/);
});

test('a PART of a parcel apportions the cost base by market value, and conserves it EXACTLY', () => {
  // $10,000 out of a $30,000 parcel whose cost base is $100.01 — chosen so the share does not divide:
  // $10,001 × 10,000 ÷ 30,000 = 3,333.67 cents, TRUNCATED to 3,333.
  const awkward = [{ acquired: '2015-03-03', costBase: 10_001, marketValue: toCents(30_000) }];
  const household = { persons: [person('Val', '1976-05-10', { parcels: awkward })], homeStatus: 'occupied' };
  const disposal = disposalFromSell(sell({ params: { direction: 'sell', amount: toCents(10_000) } }), household, [awkward]);
  assert.equal(disposal.realisations[0].costBase, 3_333);
  assert.equal(disposal.realisations[0].proceeds, toCents(10_000));
  assert.equal(disposal.realisations[0].nominalGain, 996_667);

  // The residue stays with the RETAINED part, so the cost base is conserved to the cent: the gain
  // realised now is never less than the truth, and the cent it keeps reduces a later gain by the
  // same cent. Nothing is created and nothing is destroyed.
  const retained = disposal.parcelsAfter[0][0];
  assert.equal(retained.costBase, 6_668);
  assert.equal(retained.marketValue, toCents(20_000));
  assert.equal(disposal.realisations[0].costBase + retained.costBase, 10_001);
  assert.equal(retained.acquired, '2015-03-03', 'the retained part keeps the original acquisition day');

  // Selling the rest realises the remainder exactly: $20,000 − $66.68, and the two disposals
  // together have realised $30,000 − $100.01 of gain, which is the whole parcel and not a cent more.
  const rest = disposalFromSell(sell({ params: { direction: 'sell', amount: toCents(20_000) } }), household, [disposal.parcelsAfter[0]]);
  assert.equal(rest.realisations[0].costBase, 6_668);
  assert.equal(disposal.nominalGain + rest.nominalGain, toCents(30_000) - 10_001);
  assert.deepEqual(rest.parcelsAfter[0], []);
});

// --- 5. THE SALE IN A WALK -----------------------------------------------------------------------

const HOLDER = {
  persons: [
    person('Val', '1976-05-10', { employmentIncomePerFortnight: toCents(10_000), parcels: [parcel('2015-03-03', 60_000, 100_000)] }),
    person('Ken', '1978-02-02'),
  ],
  homeStatus: 'occupied',
};

test('a sale is an INFLOW, the parcels shrink by the same money, and the month reconciles', () => {
  const without = project(SETTINGS, HOLDER, []);
  const sold = project(SETTINGS, HOLDER, [sell({ date: '2026-09-20', params: { direction: 'sell', amount: toCents(40_000) } })]);
  const september = monthAt(sold, '2026-09');

  assert.deepEqual(
    september.lines.filter((l) => l.description.startsWith('Non-Super Portfolio')),
    [{ direction: 'inflow', effect: 'cash', description: 'Non-Super Portfolio sale, Val', amount: toCents(40_000), provenance: UNLEGISLATED.portfolioSale, attribution: statedBy('sell') }],
  );
  // REWRITTEN by chunk 5. It read "$40,000 UP on the control" while the gain reached no tax figure.
  // The $40,000 sale realises $16,000 of nominal gain on a $24,000 apportioned cost base and $8,000
  // of net capital gain, which Val — on $260,000 of salary — is taxed $3,760 on: 45c in the dollar
  // plus the 2% Medicare levy. So the cash is $36,240 up, in that month and every month after it.
  for (const m of sold.filter((x) => x.month >= '2026-09')) {
    assert.equal(m.closingBalance - monthAt(without, m.month).closingBalance, toCents(36_240), m.month);
  }
  // **P5-3 limb 2 (2026-09-18): the dollar pin is taken WITHOUT `provenance`, and the record is
  // asserted separately below.** A CGT line's record carries the year's Medicare-threshold caveats,
  // which are five sentences that have nothing to do with the $3,760 this assertion is about;
  // inlining them here would put the register's weaknesses inside a cashflow pin, where a change to
  // either would read as a change to the other. `core-projection-provenance.test.mjs` is where the
  // record itself is pinned.
  const cgtLines = september.lines.filter((l) => l.description === 'Income tax on capital gain, Val');
  assert.deepEqual(
    cgtLines.map(({ provenance, attribution, ...line }) => line),
    [{ direction: 'outflow', effect: 'cash', description: 'Income tax on capital gain, Val', amount: toCents(3_760) }],
  );
  // The attribution is dropped from the dollar pin for the same reason and asserted here: a charge
  // on the YEAR's accumulated gain cannot name the disposal that caused this cent of it.
  assert.deepEqual(cgtLines[0].attribution, UNATTRIBUTED.capitalGainsTax);
  assert.equal(cgtLines[0].provenance.basis, 'legislated');
  assert.equal(cgtLines[0].provenance.register, 'income tax on capital gain');
  assert.equal(cgtLines[0].provenance.fy, '2026-27');
  reconciles(sold);

  // And the portfolio is $40,000 down. The month is assessed on what it OPENED with, so September
  // still reads $100,000; October reads the remaining $60,000 grown one month — 6.5% compounded as
  // (1 + r)^(1/12) is 1.0052616942…, so $60,000 → $60,315.70 (chunk 2 floors each parcel's growth).
  // The SOLD parcel earns nothing: the sale happens before the month's growth, and the whole
  // $100,000 grown would have been $100,526.16.
  assert.equal(september.assessableAssets, toCents(100_000), 'September opens with nil cash, so the two halves coincide');
  assert.equal(parcelsOnly(monthAt(sold, '2026-10')), 6_031_570);
  assert.equal(parcelsOnly(monthAt(without, '2026-10')), 10_052_616);
  assert.notEqual(parcelsOnly(monthAt(sold, '2026-10')), 10_052_616 - toCents(40_000));

  // **And the TOTAL, which since P4-3b carries the proceeds as well as the portfolio.** The seller's
  // October opens with $50,216.67 of cash and the control's with $13,976.67, and both figures are
  // now assessed: $60,315.70 + $50,216.67 = $110,532.37 against $100,526.16 + $13,976.67 =
  // $114,502.83. The seller is assessed on LESS than the holder by $3,970.46 — which is the $3,760
  // of tax the sale cost plus the $210.46 of growth the sold units did not earn, and is the whole of
  // what a disposal does to the means test now that the proceeds do not vanish from it.
  assert.equal(monthAt(sold, '2026-10').assessableAssets, 11_053_237);
  assert.equal(monthAt(without, '2026-10').assessableAssets, 11_450_283);
  assert.equal(
    monthAt(without, '2026-10').assessableAssets - monthAt(sold, '2026-10').assessableAssets,
    toCents(3_760) + 21_046,
  );
});

test('a sale is capped at what is HELD, and a Person holding nothing sells nothing', () => {
  // `min(stated, holdings)` — the shape a buy's funding takes and the shape every Waterfall limb
  // takes. $250,000 stated against $100,000 held is a $100,000 sale and an empty portfolio.
  const everything = project(SETTINGS, HOLDER, [sell({ date: '2026-09-20', params: { direction: 'sell', amount: toCents(250_000) } })]);
  const line = monthAt(everything, '2026-09').lines.find((l) => l.description === 'Non-Super Portfolio sale, Val');
  assert.equal(line.amount, toCents(100_000));
  // The portfolio is EMPTY for the rest of the walk. The total is not nil and has not been since
  // P4-3b — it is the proceeds, sitting in the Offset and assessed there — so the emptiness is
  // asserted on the parcel half, and the proceeds are asserted on their own below.
  assert.deepEqual([...new Set(everything.filter((m) => m.month > '2026-09').map(parcelsOnly))], [toCents(0)]);
  assert.equal(monthAt(everything, '2026-10').assessableAssets, 10_457_667, 'the whole $104,576.67 of proceeds, now assessed as cash');
  assert.equal(monthAt(everything, '2026-10').assessableAssets, monthAt(everything, '2026-10').openingBalance);
  reconciles(everything);

  // Ken holds nothing: no line at all, rather than a $0 sale — and every figure in the walk is the
  // walk without the entry. The one difference is `appliedEntryIds`, which still cites the entry:
  // it applied and sold nothing, which is a different fact from its never having been read.
  assert.equal(disposalFromSell(sell({ owner: 'personB' }), HOLDER, [HOLDER.persons[0].parcels, []]), undefined);
  const kensSale = project(SETTINGS, HOLDER, [sell({ date: '2026-09-20', owner: 'personB' })]);
  const strip = (months) => JSON.stringify(months.map(({ appliedEntryIds, ...rest }) => rest));
  assert.equal(strip(kensSale), strip(project(SETTINGS, HOLDER, [])));
  assert.deepEqual(monthAt(kensSale, '2026-09').appliedEntryIds, ['sell']);
  assert.equal(kensSale.flatMap((m) => m.lines).filter((l) => l.description.startsWith('Non-Super Portfolio')).length, 0);

  // A sale owned by the HOUSEHOLD is refused rather than split across two people (P3-21c).
  assert.throws(
    () => project(SETTINGS, HOLDER, [sell({ date: '2026-09-20', owner: 'household' })]),
    /owned by the household, but a non-super parcel belongs to a Person and to exactly one \(P3-21c\)/,
  );
});

test('a sale funds a buy dated later in the same month, and the two doors refuse each other', () => {
  // The proceeds land in the running cash, where a surplus wage and limb 1's surplus already go, so
  // a buy that follows finds them: Val sells $40,000 and Ken buys $40,000 the same month, and the
  // household's cash ends where it started while $40,000 of parcels change hands.
  const buy = {
    id: 'buy',
    date: '2026-09-25',
    owner: 'personB',
    type: 'NON_SUPER_INVESTMENT',
    params: { direction: 'buy', amount: toCents(40_000), incidentalCostsOfAcquisition: toCents(0) },
    enabled: true,
    createdAt: '2026-06-01',
  };
  const months = project(SETTINGS, HOLDER, [sell({ date: '2026-09-20', params: { direction: 'sell', amount: toCents(40_000) } }), buy]);
  const september = monthAt(months, '2026-09');
  assert.deepEqual(september.lines.filter((l) => l.description.startsWith('Non-Super Portfolio')), [
    { direction: 'inflow', effect: 'cash', description: 'Non-Super Portfolio sale, Val', amount: toCents(40_000), provenance: UNLEGISLATED.portfolioSale, attribution: statedBy('sell') },
    { direction: 'outflow', effect: 'cash', description: 'Non-Super Portfolio purchase, Ken', amount: toCents(40_000), provenance: UNLEGISLATED.portfolioPurchase, attribution: statedBy('buy') },
  ]);
  // REWRITTEN by chunk 5. It read "the household's cash ends where it started"; it no longer does,
  // because the sale realised a gain and the tax on it — $3,760 — is charged in this very month and
  // BEFORE the buy, so the buy is funded out of cash already net of it.
  assert.equal(
    monthAt(project(SETTINGS, HOLDER, []), '2026-09').closingBalance - september.closingBalance,
    toCents(3_760),
  );
  reconciles(months);

  // Each door refuses the other direction: neither is reachable as a negative of the other.
  assert.throws(() => disposalFromSell({ ...buy, id: 'b' }, HOLDER, [[], []]), /`disposalFromSell` is the SELL door/);
});

// --- 6. SCOPE: NO TAX, NO LIMB 3, NO AGE PENSION MOVED BY BROKERAGE ------------------------------

test('⚠️ INVERTED BY CHUNK 5 — realising a gain now MOVES a tax figure, and by a stated dollar', () => {
  // The gain above is $40,000 of proceeds against a $24,000 apportioned cost base — a $16,000
  // nominal gain and $8,000 discounted — and not a cent of it reaches taxable income in this chunk.
  const disposal = disposalFromSell(
    sell({ date: '2026-09-20', params: { direction: 'sell', amount: toCents(40_000) } }),
    HOLDER,
    [HOLDER.persons[0].parcels, []],
  );
  assert.equal(disposal.nominalGain, toCents(16_000));
  assert.equal(disposal.discountedGain, toCents(8_000));

  // This test stood at chunk 4 as "every `Income tax` line in the walk that sells is identical to the
  // walk that does not", and it was the pin that said the gain reached nothing. Chunk 5 REWRITES it
  // rather than deleting it, because the thing worth pinning is the same thing — which lines move
  // and which do not — and only the answer has changed.
  const sold = project(SETTINGS, HOLDER, [sell({ date: '2026-09-20', params: { direction: 'sell', amount: toCents(40_000) } })]);
  const without = project(SETTINGS, HOLDER, []);
  const taxLines = (months) => months.flatMap((m) => m.lines.filter((l) => l.description.startsWith('Income tax')).map((l) => `${m.month} ${l.description} ${l.amount}`));
  assert.notDeepEqual(taxLines(sold), taxLines(without));
  assert.ok(taxLines(without).length > 0, 'the comparison would be vacuous with no tax lines at all');

  // And EXACTLY one line differs: the $8,000 net capital gain is charged whole, in the month of the
  // disposal, at Val's own marginal rate — 45c plus the 2% levy on $260,000 of salary — and the
  // twelve monthly salary `Income tax, Val` lines are untouched, to the cent, in every month of the
  // walk including September's. See the timing decision in `project()`'s disposal block.
  const added = taxLines(sold).filter((line) => !taxLines(without).includes(line));
  assert.deepEqual(added, [`2026-09 Income tax on capital gain, Val ${toCents(3_760)}`]);
  assert.deepEqual(taxLines(without).filter((line) => !taxLines(sold).includes(line)), []);
});

test('a household that CANNOT meet its target now reaches for the portfolio — and stops when it is gone', () => {
  // ⚠️ **This test asserted the OPPOSITE until chunk 6, and the flip is the whole of chunk 6.** It
  // read *"limb 3 still draws NIL, word for word, for a Household that has just SOLD"*, and it was
  // true: a household short of its target sat beside $100,000 of ETFs and reported an
  // `Unfunded shortfall` every month of the walk. That is no longer the model — an entry-driven sale
  // is still not the Waterfall drawing, but the Waterfall now draws on its own account.
  //
  // $600,000 a year against one $260,000 salary, and Val holds ONE parcel worth $100,000 on a
  // $60,000 cost base. So there are three phases and the assertions are about the seams between
  // them: the portfolio is drawn to NEED PLUS THE TAX THAT DRAW CAUSES (P10-4, 2026-09-21 — it was
  // drawn to need alone until then, and the month was short by the tax), the portfolio runs out
  // mid-month against a need it cannot meet, and the shortfall resumes alone.
  const spend = {
    id: 'sc', date: '2026-09-01', owner: 'household', type: 'SPEND_CHANGE',
    params: { annualSpend: toCents(600_000) }, enabled: true, createdAt: '2026-06-01',
  };
  const months = project(SETTINGS, HOLDER, [spend]);
  reconciles(months);

  // ⚠️ **TO NEED PLUS THE TAX THAT SALE CAUSES, AND THAT IS THE P10-4 RULING OF 2026-09-21.** This
  // assertion read **$36,023.33** until then — the gap and not a cent more — and the sentence under
  // it read *"a limb that grossed the draw up for the tax it realises would have sold more than the
  // gap. It sells the gap."* It sells more than the gap now, and the difference is the tax.
  //
  // **THE MECHANISM, AS ARITHMETIC.** $50,000 of monthly spending against $21,666.67 of salary less
  // $7,300 of income tax and $390 of Division 293 tax leaves a gap of **$36,023.33**. The parcel is
  // worth $100,000 on a $60,000 cost base, so 40c in every dollar of proceeds is a nominal gain, s
  // 115-25 halves it to 20c, and Val's marginal rate on $260,000 is 45c plus the 2% levy — **9.4c of
  // tax per dollar sold**. A sale of `x` hands over `0.906x`, so the sale that hands over the gap is
  // `36,023.33 ÷ 0.906 = $39,760.85`, and the tax on it is `$3,737.52`. Both figures below are that
  // arithmetic and neither was pasted from a run.
  const september = monthAt(months, '2026-09');
  assert.deepEqual(
    september.lines.filter((l) => l.description.startsWith('Non-Super Portfolio')),
    [{ direction: 'inflow', effect: 'cash', description: 'Non-Super Portfolio sale, Val', amount: toCents(39_760.85), provenance: UNLEGISLATED.portfolioSale, attribution: NO_STATING_ENTRY.automaticPortfolioSale }],
  );

  // ⚠️ **AND THE MONTH IS NOT SHORT — the defect, in dollars, and it is gone.** This assertion read
  // *"the tax it realises IS the month's whole shortfall"* and pinned an `Unfunded shortfall` of
  // $3,386.19 beside an `Income tax on capital gain` of $3,386.19: the draw met the target to the
  // cent, so the tax on it had nothing behind it. The sale funds the tax now.
  assert.deepEqual(
    september.lines
      .filter((l) => l.description === 'Unfunded shortfall' || l.description.startsWith('Income tax on capital'))
      // Without the record, for the reason given at the first CGT pin above.
      .map(({ provenance, attribution, ...line }) => line),
    [{ direction: 'outflow', effect: 'cash', description: 'Income tax on capital gain, Val', amount: toCents(3_737.52) }],
  );

  // **THE CONSERVATION IDENTITY, AS AN IDENTITY.** The proceeds less the tax are what limb 3 drew,
  // in every month of this walk that sold anything — asserted off the month's own Waterfall note
  // rather than against a second list of dollar figures, so a month this test never thought of is
  // covered by it too.
  const limb3 = (month) => month.notes.find((n) => n.subject === 'waterfall limb' && n.limb === 'nonSuperPortfolio');
  const sold = months.filter((m) => m.lines.some((l) => l.description.startsWith('Non-Super Portfolio sale')));
  assert.ok(sold.length > 0, 'the identity would be vacuous with no sale in the walk');
  for (const month of sold) {
    const proceeds = month.lines.filter((l) => l.description.startsWith('Non-Super Portfolio sale')).reduce((t, l) => t + l.amount, 0);
    const tax = month.lines.filter((l) => l.description.startsWith('Income tax on capital gain')).reduce((t, l) => t + l.amount, 0);
    assert.equal(proceeds - tax, limb3(month).drawn, `${month.month}: the sale did not fund its own tax`);
  }

  // ⚠️ **THE BOUNDARY: A PORTFOLIO THAT CANNOT FUND THE MONTH PLUS ITS OWN TAX IS A GENUINE
  // SHORTFALL, AND IS STILL REPORTED AS ONE.** By November the parcel is worth $20,872.07, and
  // selling every cent of it hands over only $18,879.37 once the 9.4c is paid. So limb 3 OFFERS
  // $18,879.37 — its whole net capacity, not its market value — the whole of it is drawn, the
  // portfolio is liquidated, and the $17,143.96 that is left over is short. The fix must not turn a
  // real shortfall into a silent liquidation or a loop, and this is the month that says so.
  const november = monthAt(months, '2026-11');
  assert.equal(november.lines.find((l) => l.description.startsWith('Non-Super Portfolio sale')).amount, toCents(20_872.07));
  assert.equal(limb3(november).available, toCents(18_879.37));
  assert.equal(limb3(november).drawn, toCents(18_879.37));
  assert.deepEqual(
    november.lines.filter((l) => l.description === 'Unfunded shortfall'),
    [{ direction: 'inflow', effect: 'cash', description: 'Unfunded shortfall', amount: toCents(17_143.96), provenance: UNLEGISLATED.shortfall, attribution: NO_STATING_ENTRY.shortfall }],
  );
  // $36,023.33 − $18,879.37 is what the Waterfall could not meet, to the cent, and it is ONE line:
  // the second sweep below the Waterfall has nothing left to report, because the tax was funded.
  assert.equal(toCents(36_023.33) - limb3(november).available, toCents(17_143.96));

  // THREE draws in the whole walk and then nothing: the portfolio is spent, not merely unreported,
  // and every month after it is shortfall alone at the full $36,023.33.
  assert.equal(months.flatMap((m) => m.lines).filter((l) => l.description.startsWith('Non-Super Portfolio')).length, 3);
  assert.equal(monthAt(months, '2026-12').assessableAssets, toCents(0), 'the portfolio is gone, not merely unreported');
  assert.deepEqual(
    monthAt(months, '2027-01').lines.filter((l) => l.description === 'Unfunded shortfall'),
    [{ direction: 'inflow', effect: 'cash', description: 'Unfunded shortfall', amount: toCents(36_023.33), provenance: UNLEGISLATED.shortfall, attribution: NO_STATING_ENTRY.shortfall }],
  );
  // ⚠️ **AND THE FIRST TWO MONTHS ARE NOT SHORT AT ALL.** This read *"every month of the walk carries
  // a shortfall"* and it was the defect speaking: September and October were short by exactly their
  // own tax. They are funded now, and everything from November on — where the money really does run
  // out — still is not.
  const short = (m) => m.lines.some((l) => l.description === 'Unfunded shortfall' && l.amount > 0);
  assert.deepEqual(months.filter((m) => !short(m)).map((m) => m.month), ['2026-09', '2026-10']);
  assert.ok(months.slice(2).every(short));
});

test('BROKERAGE MOVES NO AGE PENSION FIGURE — the PORTFOLIO the means test reads is market value', () => {
  // The ruling of 2026-09-17 raises the cost base and the cash outflow and NOT the market value, so
  // the assets test and the deemed income test see the same PORTFOLIO either way. A single
  // pensioner of 71 with no other assets, buying $2,000 of ETFs out of accumulated pension money,
  // with and without a $100 fee.
  //
  // **Narrowed by P4-3b, and the narrowing is in the title.** The claim used to be that the whole
  // `assessableAssets` figure was identical in the two walks. It is not, because the fee is cash
  // that left and the Offset Account is assessed now. What survives — and what the test was always
  // for — is that the fee does not raise the PORTFOLIO to $2,100, and that no Age Pension figure
  // moves.
  const pensioner = { persons: [person('Val', '1955-04-17')], homeStatus: 'occupied' };
  const settings = { ...SETTINGS, planningHorizonAge: 73 };
  const buy = (fee) => ({
    id: 'buy', date: '2027-02-10', owner: 'personA', type: 'NON_SUPER_INVESTMENT',
    params: { direction: 'buy', amount: toCents(2_000), incidentalCostsOfAcquisition: toCents(fee) },
    enabled: true, createdAt: '2026-06-01',
  });
  const free = project(settings, pensioner, [buy(0)]);
  const charged = project(settings, pensioner, [buy(100)]);

  const pensionLines = (months) => months.map((m) => m.lines.filter((l) => l.description === 'Age Pension').map((l) => l.amount).join(','));
  assert.deepEqual(pensionLines(charged), pensionLines(free));
  assert.ok(pensionLines(free).filter((amount) => Number(amount) > 0).length >= 6, 'a walk with no entitlement would pass this vacuously');
  // The portfolio the means test sees is the $2,000 of units in both walks — the fee bought none.
  assert.deepEqual(charged.map(parcelsOnly), free.map(parcelsOnly));
  assert.equal(parcelsOnly(monthAt(charged, '2027-03')), toCents(2_000));

  // ⚠️ **THE TOTAL IS NOT EQUAL, AND SINCE P4-3b IT CANNOT BE: the fee is $100 of cash that LEFT,
  // and cash is assessed now.** From the buy's month on, the charged walk is assessed at exactly
  // $100 less — the fee, to the cent, and never the $2,100 a cost-base reading would give. That the
  // title still holds is therefore a claim about the TAPERS and not about the split: $18,702.55 of
  // assessable assets is $314,297.45 below the $333,000 single-homeowner free area, so $100 either
  // way is $100 of nothing. At $3.00 a fortnight per $1,000 it would be **30c a fortnight** if the
  // assets test bound at all, and the pension lines above are identical to the cent.
  assert.equal(monthAt(charged, '2027-03').assessableAssets, 1_591_035);
  for (const m of charged.filter((x) => x.month >= '2027-03')) {
    assert.equal(monthAt(free, m.month).assessableAssets - m.assessableAssets, toCents(100), m.month);
  }
  for (const m of charged.filter((x) => x.month < '2027-03')) {
    assert.equal(monthAt(free, m.month).assessableAssets, m.assessableAssets, m.month);
  }
  // And the cash is $100 lower for the rest of the walk, so the fee was paid and not ignored.
  for (const m of charged.filter((x) => x.month >= '2027-02')) {
    assert.equal(monthAt(free, m.month).closingBalance - m.closingBalance, toCents(100), m.month);
  }
  reconciles(charged);
});

test('the SALE LINE is named for the Person it came out of, and chunk 5 adds exactly ONE more name', () => {
  assert.equal(PORTFOLIO_SALE_LINE, 'Non-Super Portfolio sale');
  const months = project(SETTINGS, HOLDER, [sell({ date: '2026-09-20', params: { direction: 'sell', amount: toCents(40_000) } })]);
  const names = [...new Set(months.flatMap((m) => m.lines).map((l) => l.description))].sort();
  // REWRITTEN by chunk 5, not extended by guesswork: the sale now also causes a tax line, and it is
  // named for the same Person the sale was, so a gain taxed in the wrong Person's brackets says so
  // in the month's own lines.
  // **And P4-4 adds exactly ONE more again, for the same reason: it is the pool that moved, named
  // for the Person who owns it.** Val's parcels grow every month, so the walk now carries a
  // `wealth` line saying so — under the name `splitAssets` gives the same money, so the line and
  // the means-test figure it moved can be read against each other.
  // **And P6-8 brief 3 chunk 2b adds TWO more, both of them Val's and both of them `wealth`:** her
  // employer's Superannuation Guarantee, and the growth on the interest it accumulates in. Named
  // for the pool and the Person on the same rule as the others.
  // **AND P6-9 CHUNK 3 ADDS EXACTLY ONE MORE, a CASH outflow: `Division 293 tax, Val`.** Val is paid
  // $260,000, so her employer's Guarantee alone is $31,200 of low tax contributions against a
  // $259,000 Division 293 income base — $290,200 against a $250,000 threshold — and the second 15%
  // is charged. It is named for the Person, like the others, and it does NOT begin with
  // `Income tax`: Division 293 is a separate tax and a consumer summing the income-tax lines must
  // not pick it up.
  assert.deepEqual(names, [
    'Division 293 tax, Val',
    'Income tax on capital gain, Val',
    'Income tax, Val',
    'Investment growth, Val — Financial investments outside superannuation',
    'Investment growth, Val — Superannuation, Accumulation Phase',
    'Non-Super Portfolio sale, Val',
    'Salary, Val',
    'Superannuation Guarantee into superannuation, Val — Superannuation, Accumulation Phase',
  ]);
  // The new names are the only `wealth` lines in the walk, and every other line is cash.
  assert.deepEqual(
    [...new Set(months.flatMap((m) => m.lines).filter((l) => l.effect === 'wealth').map((l) => l.description))].sort(),
    [
      'Investment growth, Val — Financial investments outside superannuation',
      'Investment growth, Val — Superannuation, Accumulation Phase',
      'Superannuation Guarantee into superannuation, Val — Superannuation, Accumulation Phase',
    ],
  );
  assert.equal(CAPITAL_GAINS_TAX_LINE, 'Income tax on capital gain');
});
