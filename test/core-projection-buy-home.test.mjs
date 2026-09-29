// P14-19 — `BUY_HOME`: a new home bought after a `SELL_HOME` in the same scenario. The price and
// costs are paid first from the sale's set-aside, then through the Waterfall; a purchase that cannot
// be paid in full is refused; from its month the household is a homeowner again and the
// sale-proceeds exemption (DSS Guide 4.6.3.90: it ends when "a new principal home has been
// purchased") and its deeming end.
//
// Every Household here is synthetic: one Person, no salary, no super, `cashInterestRate: 0` and
// `cpi: 0`, so a today's-money figure is the same cents at its own date and cash never drifts.
import test from 'node:test';
import assert from 'node:assert/strict';

import { toCents } from '../dist/core/money.js';
import {
  project,
  AGE_PENSION_LINE,
  HOME_PURCHASE_PRICE_LINE,
  HOME_PURCHASE_COSTS_LINE,
  HomePurchaseUnfundedError,
  monthlyFromFortnightly,
} from '../dist/core/projection.js';
import { parsePlan } from '../dist/core/parsePlan.js';
import { agePensionEntitlement } from '../dist/core/agePension.js';
import { DEMO_PLAN } from '../dist/app/demoHousehold.js';

const person = (name, dateOfBirth) => ({
  name,
  dateOfBirth,
  superInterests: [],
  parcels: [],
  employmentIncomePerFortnight: toCents(0),
  workBonusBalance: toCents(0),
});

const SETTINGS = {
  asAtDate: '2026-10-16',
  planningHorizonAge: 75,
  economicSeries: { cpi: 0, pblci: 0, awote: 0.035, mtawe: 0.035 },
  deemingRates: { lower: 0.0175, upper: 0.0375 },
  nominalReturn: 0.065,
  cashInterestRate: 0,
};

const entry = (id, type, date, params = {}, owner = 'household') => ({
  id, date, owner, type, params, enabled: true, createdAt: '2026-06-01',
});

const lineSum = (month, description) => month.lines.filter((line) => line.description === description).reduce((sum, line) => sum + line.amount, 0);
const limb = (month, name) => month.notes.find((note) => note.subject === 'waterfall limb' && note.limb === name);
const at = (months, id) => months.find((m) => m.month === id);

// $100,000 of cash; sells for $900,000 in November with $700,000 set aside for a new home.
const SAM = { persons: [person('Sam', '1955-01-01')], homeStatus: 'occupied', openingOffsetBalance: toCents(100_000) };
const sale = entry('sell', 'SELL_HOME', '2026-11-01', { salePrice: toCents(900_000), newHomeAmount: toCents(700_000) });
const cheaperBuy = entry('buy', 'BUY_HOME', '2027-01-01', { purchasePrice: toCents(600_000), purchaseCosts: toCents(30_000) });

test('a cheaper buy: price and costs leave cash in the buy month, and the rest of the set-aside stays as ordinary cash', () => {
  const months = project(SETTINGS, SAM, [sale, cheaperBuy]);
  const dec = at(months, '2026-12');
  const jan = at(months, '2027-01');
  const feb = at(months, '2027-02');

  assert.equal(lineSum(jan, HOME_PURCHASE_PRICE_LINE), toCents(600_000));
  assert.equal(lineSum(jan, HOME_PURCHASE_COSTS_LINE), toCents(30_000));
  // January pays no Age Pension (below) and spends nothing else: opening less $630,000.
  assert.equal(jan.openingBalance, dec.closingBalance);
  assert.equal(lineSum(jan, AGE_PENSION_LINE), 0);
  assert.equal(jan.closingBalance, dec.closingBalance - toCents(630_000));
  // Nothing else in the walk says "Home purchase".
  for (const month of months) {
    if (month.month === '2027-01') continue;
    assert.equal(lineSum(month, HOME_PURCHASE_PRICE_LINE) + lineSum(month, HOME_PURCHASE_COSTS_LINE), 0, month.month);
  }
  // February: homeowner again, every dollar of cash assessable — the $70,000 of set-aside the
  // purchase did not use is ordinary cash now.
  const february = agePensionEntitlement({
    household: { ...SAM, homeStatus: 'occupied', openingOffsetBalance: jan.closingBalance },
    date: '2027-02-01',
    deemingRates: SETTINGS.deemingRates,
  });
  assert.ok(february.householdRatePerFortnight > 0);
  assert.equal(lineSum(feb, AGE_PENSION_LINE), monthlyFromFortnightly(february.householdRatePerFortnight));
});

test('the exemption ends in the buy month itself: homeowner, no set-aside carved out, nothing deemed separately', () => {
  const months = project(SETTINGS, SAM, [sale, cheaperBuy]);
  const nov = at(months, '2026-11');
  const dec = at(months, '2026-12');
  const jan = at(months, '2027-01');

  // December, inside the window: the $700,000 is carved out and the household is a homeowner.
  const during = agePensionEntitlement({
    household: { ...SAM, homeStatus: 'noHomeSaleProceedsExempt', openingOffsetBalance: nov.closingBalance },
    date: '2026-12-01',
    deemingRates: SETTINGS.deemingRates,
    saleProceedsSetAside: toCents(700_000),
  });
  assert.equal(lineSum(dec, AGE_PENSION_LINE), monthlyFromFortnightly(during.householdRatePerFortnight));

  // January, the buy month: assessed on its OPENING cash (the purchase leaves at the close), all of
  // it assessable against the homeowner cut-off — so nil.
  const ended = agePensionEntitlement({
    household: { ...SAM, homeStatus: 'occupied', openingOffsetBalance: dec.closingBalance },
    date: '2027-01-01',
    deemingRates: SETTINGS.deemingRates,
  });
  assert.equal(ended.householdRatePerFortnight, 0);
  assert.equal(lineSum(jan, AGE_PENSION_LINE), 0);
  // The control: had the window run on through the buy month, the carve-out would pay a pension.
  const stillExempt = agePensionEntitlement({
    household: { ...SAM, homeStatus: 'noHomeSaleProceedsExempt', openingOffsetBalance: dec.closingBalance },
    date: '2027-01-01',
    deemingRates: SETTINGS.deemingRates,
    saleProceedsSetAside: toCents(700_000),
  });
  assert.ok(stillExempt.householdRatePerFortnight > 0, 'the control must differ from the walk');
});

test('the set-aside pays first: only what it cannot cover reaches the Waterfall', () => {
  // Cheaper than the set-aside: the Waterfall is asked for nothing, and the cash it is offered is
  // already net of the $630,000 the set-aside paid.
  const cheaper = project(SETTINGS, SAM, [sale, cheaperBuy]);
  const decA = at(cheaper, '2026-12');
  const janA = at(cheaper, '2027-01');
  assert.equal(limb(janA, 'cashAboveLoan').available, decA.closingBalance - toCents(630_000));
  assert.equal(limb(janA, 'cashAboveLoan').drawn, 0);
  assert.equal(limb(janA, 'salary').drawn, 0);

  // Dearer than the set-aside: $800,000 + $30,000 — $700,000 from the set-aside, the other $130,000
  // drawn from running cash by the Waterfall (no pension in January to draw first).
  const dearer = project(SETTINGS, SAM, [sale, { ...cheaperBuy, params: { purchasePrice: toCents(800_000), purchaseCosts: toCents(30_000) } }]);
  const decB = at(dearer, '2026-12');
  const janB = at(dearer, '2027-01');
  assert.equal(limb(janB, 'cashAboveLoan').available, decB.closingBalance - toCents(700_000));
  assert.equal(limb(janB, 'cashAboveLoan').drawn, toCents(130_000));
  assert.equal(janB.closingBalance, decB.closingBalance - toCents(830_000));
});

test('a buy the whole Waterfall cannot pay for is refused, never left as a shortfall', () => {
  const tooDear = { ...cheaperBuy, params: { purchasePrice: toCents(2_000_000) } };
  assert.throws(
    () => project(SETTINGS, SAM, [sale, tooDear]),
    (error) => {
      assert.ok(error instanceof HomePurchaseUnfundedError, `expected HomePurchaseUnfundedError, got ${error.name}`);
      assert.equal(error.month, '2027-01');
      assert.match(error.message, /entry buy \(BUY_HOME\)/);
      return true;
    },
  );
});

test('a buy after the 24-month window: the exemption has already lapsed, the Waterfall pays it all, and the home is exempt again from the buy month', () => {
  // Sold before the walk (2025-01-01): the window closes from 2027-01. Bought 2027-03-01.
  const seller = { ...SAM, openingOffsetBalance: toCents(850_000) };
  const preDatedSale = entry('sell', 'SELL_HOME', '2025-01-01', { salePrice: toCents(900_000), newHomeAmount: toCents(700_000) });
  const lateBuy = entry('buy', 'BUY_HOME', '2027-03-01', { purchasePrice: toCents(500_000) });
  const months = project(SETTINGS, seller, [preDatedSale, lateBuy]);
  const jan = at(months, '2027-01');
  const feb = at(months, '2027-02');
  const mar = at(months, '2027-03');

  // February: past the window, not yet bought — a non-homeowner.
  const lapsed = agePensionEntitlement({
    household: { ...seller, homeStatus: 'noHome', openingOffsetBalance: jan.closingBalance },
    date: '2027-02-01',
    deemingRates: SETTINGS.deemingRates,
  });
  assert.equal(lineSum(feb, AGE_PENSION_LINE), monthlyFromFortnightly(lapsed.householdRatePerFortnight));
  // March: a homeowner again. Nothing is set aside any more, so the cash limb is offered all of it.
  const bought = agePensionEntitlement({
    household: { ...seller, homeStatus: 'occupied', openingOffsetBalance: feb.closingBalance },
    date: '2027-03-01',
    deemingRates: SETTINGS.deemingRates,
  });
  assert.equal(lineSum(mar, AGE_PENSION_LINE), monthlyFromFortnightly(bought.householdRatePerFortnight));
  assert.equal(limb(mar, 'cashAboveLoan').available, mar.openingBalance);
  assert.equal(mar.closingBalance, mar.openingBalance + lineSum(mar, AGE_PENSION_LINE) - toCents(500_000));
  assert.ok(!mar.lines.some((line) => line.description === HOME_PURCHASE_COSTS_LINE), 'no costs stated, no costs line');
});

// --- The door --------------------------------------------------------------------------------

const withEntries = (entries, household = { ...DEMO_PLAN.household, homeStatus: 'occupied' }) => ({
  ...DEMO_PLAN,
  household,
  entries,
  scenarios: DEMO_PLAN.scenarios.map((scenario) => ({ ...scenario, entryIds: entries.map((e) => e.id) })),
});
const doorSale = entry('sell', 'SELL_HOME', '2040-07-01', { salePrice: toCents(900_000), newHomeAmount: toCents(500_000) });
const doorBuy = entry('buy', 'BUY_HOME', '2040-10-01', { purchasePrice: toCents(600_000), purchaseCosts: toCents(25_000) });

test('door: a valid BUY_HOME after a sale parses whole, purchaseCosts omitted when blank', () => {
  const parsed = parsePlan(withEntries([doorSale, doorBuy]));
  assert.deepEqual(parsed.entries.at(-1).params, { purchasePrice: toCents(600_000), purchaseCosts: toCents(25_000) });
  const bare = parsePlan(withEntries([doorSale, { ...doorBuy, params: { purchasePrice: toCents(600_000) } }]));
  assert.ok(!Object.hasOwn(bare.entries.at(-1).params, 'purchaseCosts'));
});

test('door: a BUY_HOME with no SELL_HOME in its scenario is refused by name', () => {
  assert.throws(() => parsePlan(withEntries([doorBuy])), /buying a first home without a sale isn't modelled/);
});

test('door: a second BUY_HOME after one sale is refused', () => {
  const second = { ...doorBuy, id: 'buy2', date: '2041-01-01' };
  assert.throws(() => parsePlan(withEntries([doorSale, doorBuy, second])), /a SECOND BUY_HOME entry \(the first is "buy"\)/);
});

test('door: a purchase settling in the sale month or before it is refused', () => {
  assert.throws(() => parsePlan(withEntries([doorSale, { ...doorBuy, date: '2040-07-20' }])), /must settle in a later month than the sale/);
  assert.throws(() => parsePlan(withEntries([doorSale, { ...doorBuy, date: '2040-01-01' }])), /must settle in a later month than the sale/);
});

test('door: a non-positive price or negative costs are refused', () => {
  assert.throws(() => parsePlan(withEntries([doorSale, { ...doorBuy, params: { purchasePrice: 0 } }])), /a home bought for nothing or less is not a purchase/);
  assert.throws(() => parsePlan(withEntries([doorSale, { ...doorBuy, params: { purchasePrice: toCents(600_000), purchaseCosts: -1 } }])), /purchase costs are money leaving the household/);
});

test('door: an ENTER_CARE in the same scenario, or a HEAS_DRAW on or after the purchase, is refused', () => {
  const care = entry('care', 'ENTER_CARE', '2040-01-01', { homeValue: toCents(900_000), radPrice: toCents(500_000), radPaidAsLumpSum: toCents(0) }, 'personA');
  assert.throws(() => parsePlan(withEntries([care, doorSale, doorBuy])), /buying a new home with anyone in aged care isn't modelled/);
  const heas = entry('heas', 'HEAS_DRAW', '2041-01-01', { securityValue: toCents(600_000), fortnightlyAmount: 'maximum' }, 'personA');
  assert.throws(() => parsePlan(withEntries([doorSale, doorBuy, heas])), /a Home Equity Access Scheme loan against the new home isn't modelled/);
});

test('door: the sale and the purchase in sibling scenarios do not meet — the purchase has no sale in its own', () => {
  const [base] = DEMO_PLAN.scenarios;
  const plan = {
    ...withEntries([doorSale, doorBuy]),
    scenarios: [
      { ...base, entryIds: [doorSale.id] },
      { ...base, id: 'sibling', name: 'Sibling', entryIds: [doorBuy.id] },
    ],
  };
  assert.throws(() => parsePlan(plan), /buying a first home without a sale isn't modelled/);
});

test('door: a BUY_HOME switched on in no scenario is not refused for want of a sale', () => {
  const plan = { ...withEntries([doorSale, doorBuy]), scenarios: DEMO_PLAN.scenarios.map((scenario) => ({ ...scenario, entryIds: [doorSale.id] })) };
  assert.doesNotThrow(() => parsePlan(plan));
});

test('door: a SellHomeParams.newHomePurchaseDate is still refused, and the message names BUY_HOME', () => {
  assert.throws(
    () => parsePlan(withEntries([{ ...doorSale, params: { salePrice: toCents(900_000), newHomePurchaseDate: '2041-01-01' } }])),
    /newHomePurchaseDate.*BUY_HOME entry/s,
  );
});
