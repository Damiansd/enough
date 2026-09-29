// P9-5 — `DOWNSIZER_CONTRIBUTION`: home sale money into the owner's own super (ITAA 1997 s 292-102).
// Cash out through the Waterfall (the sale's set-aside first), the super balance up by the same
// cents — no contributions tax (s 290-167), no cap usage (s 292-90(2)(c)(iiia)). The door refuses
// each rule by name. Research: docs/research/p9-5-downsizer-2026-09-25.md.
//
// The walk fixtures are synthetic: no salary, `cpi: 0`, `nominalReturn: 0`, `cashInterestRate: 0`,
// and every Person under Age Pension age, so each figure is the stated cents and nothing drifts.
import test from 'node:test';
import assert from 'node:assert/strict';

import { toCents } from '../dist/core/money.js';
import {
  project,
  DOWNSIZER_CONTRIBUTION_LINE,
  DownsizerContributionUnfundedError,
  INTERNAL_TRANSFER_LINES,
  downsizerContributionDescription,
} from '../dist/core/projection.js';
import { parsePlan } from '../dist/core/parsePlan.js';
import { DEMO_PLAN } from '../dist/app/demoHousehold.js';

const person = (name, dateOfBirth, superBalance = 0) => ({
  name,
  dateOfBirth,
  superInterests: [{ phase: 'accumulation', balance: toCents(superBalance) }],
  parcels: [],
  employmentIncomePerFortnight: toCents(0),
  workBonusBalance: toCents(0),
});

const SETTINGS = {
  asAtDate: '2026-10-16',
  planningHorizonAge: 70,
  economicSeries: { cpi: 0, pblci: 0, awote: 0, mtawe: 0 },
  deemingRates: { lower: 0.0175, upper: 0.0375 },
  nominalReturn: 0,
  cashInterestRate: 0,
};

const entry = (id, type, date, params = {}, owner = 'household') => ({
  id, date, owner, type, params, enabled: true, createdAt: '2026-06-01',
});
const downsizer = (id, date, amount, owner = 'personA') =>
  entry(id, 'DOWNSIZER_CONTRIBUTION', date, { amount: toCents(amount), receivingInterestIndex: 0, statedOwnedTenYears: true }, owner);

const at = (months, id) => months.find((m) => m.month === id);
const limb = (month, name) => month.notes.find((note) => note.subject === 'waterfall limb' && note.limb === name);
const descriptions = (month) => month.lines.map((line) => line.description).sort();

// Sam, 60, $100,000 of cash and $50,000 of super; sells for $900,000 in November 2026.
const SAM = { persons: [person('Sam', '1966-03-01', 50_000)], homeStatus: 'occupied', openingOffsetBalance: toCents(100_000) };
const sale = entry('sell', 'SELL_HOME', '2026-11-01', { salePrice: toCents(900_000) });

test('a $300,000 contribution after a sale: cash −$300,000, super +$300,000, one line, no tax line', () => {
  const control = project(SETTINGS, SAM, [sale]);
  const months = project(SETTINGS, SAM, [sale, downsizer('down', '2027-01-01', 300_000)]);
  const jan = at(months, '2027-01');
  const janControl = at(control, '2027-01');

  const line = jan.lines.find((l) => l.description === downsizerContributionDescription('Sam'));
  assert.deepEqual(
    { direction: line.direction, effect: line.effect, amount: line.amount, attribution: line.attribution.entryIds },
    { direction: 'outflow', effect: 'cash', amount: toCents(300_000), attribution: ['down'] },
  );
  assert.equal(downsizerContributionDescription('Sam'), `${DOWNSIZER_CONTRIBUTION_LINE}, Sam`);
  assert.ok(INTERNAL_TRANSFER_LINES.includes(DOWNSIZER_CONTRIBUTION_LINE));
  // The only line the entry adds: no fund contributions tax, no cap note, no deduction.
  assert.deepEqual(descriptions(jan), [...descriptions(janControl), downsizerContributionDescription('Sam')].sort());
  assert.deepEqual(jan.notes.filter((note) => note.subject !== 'waterfall limb'), janControl.notes.filter((note) => note.subject !== 'waterfall limb'));

  // Cash and super each move by exactly $300,000 from January's close on.
  assert.equal(jan.closingBalance, janControl.closingBalance - toCents(300_000));
  assert.equal(jan.superBalance, janControl.superBalance + toCents(300_000));
  let checked = 0;
  for (const month of months) {
    if (month.month < '2027-01') continue;
    const twin = at(control, month.month);
    assert.equal(month.closingBalance, twin.closingBalance - toCents(300_000), month.month);
    assert.equal(month.superBalance, twin.superBalance + toCents(300_000), month.month);
    // Same lines every later month, 30 June and the July true-up included: nothing taxes it later.
    if (month.month > '2027-01') assert.deepEqual(descriptions(month), descriptions(twin), month.month);
    checked += 1;
  }
  assert.ok(checked > 100, `only ${checked} months compared`);
  // Under Age Pension age both pockets are protected-vs-assessable the other way round: the cash
  // was assessable, the accumulation super is protected.
  const feb = at(months, '2027-02');
  const febControl = at(control, '2027-02');
  assert.equal(feb.protectedAssets, febControl.protectedAssets + toCents(300_000));
  assert.equal(feb.assessableAssets, febControl.assessableAssets - toCents(300_000));
});

test('a couple both contribute within the proceeds: each into their own account, the non-owner spouse included', () => {
  const couple = {
    persons: [person('Sam', '1966-03-01'), person('Alex', '1968-07-01')],
    homeStatus: 'occupied',
    openingOffsetBalance: toCents(20_000),
  };
  const smallSale = entry('sell', 'SELL_HOME', '2026-11-01', { salePrice: toCents(500_000) });
  const entries = [smallSale, downsizer('a', '2026-12-01', 300_000, 'personA'), downsizer('b', '2027-01-01', 200_000, 'personB')];
  const control = project(SETTINGS, couple, [smallSale]);
  const months = project(SETTINGS, couple, entries);

  const dec = at(months, '2026-12');
  const jan = at(months, '2027-01');
  assert.equal(dec.lines.find((l) => l.description === downsizerContributionDescription('Sam')).amount, toCents(300_000));
  assert.equal(jan.lines.find((l) => l.description === downsizerContributionDescription('Alex')).amount, toCents(200_000));
  assert.equal(jan.closingBalance, at(control, '2027-01').closingBalance - toCents(500_000));
  assert.equal(at(months, '2027-02').superBalance, at(control, '2027-02').superBalance + toCents(500_000));
  // The door accepts the same pair: $500,000 together, exactly the sale price.
  assert.doesNotThrow(() => parsePlan(withEntries(entries, couple, SETTINGS)));
});

test('the set-aside pays first, and what it paid is no longer protected as a new-home set-aside', () => {
  const setAsideSale = entry('sell', 'SELL_HOME', '2026-11-01', { salePrice: toCents(900_000), newHomeAmount: toCents(400_000) });
  const control = project(SETTINGS, SAM, [setAsideSale]);
  const months = project(SETTINGS, SAM, [setAsideSale, downsizer('down', '2027-01-01', 300_000)]);
  const dec = at(months, '2026-12');
  const jan = at(months, '2027-01');
  // The Waterfall is asked for nothing: the cash it is offered is already net of the $300,000.
  assert.equal(limb(jan, 'cashAboveLoan').available, dec.closingBalance - toCents(300_000));
  assert.equal(limb(jan, 'cashAboveLoan').drawn, 0);
  assert.equal(jan.closingBalance, at(control, '2027-01').closingBalance - toCents(300_000));
  // February: $100,000 of set-aside + $300,000 of super protected, against the control's $400,000
  // of set-aside — the same total; had the set-aside not shrunk, $300,000 more would be protected.
  const feb = at(months, '2027-02');
  const febControl = at(control, '2027-02');
  assert.equal(feb.protectedAssets, febControl.protectedAssets);
  assert.equal(feb.assessableAssets, febControl.assessableAssets);
});

test('a contribution the whole Waterfall cannot fund is refused, never left as a shortfall', () => {
  const poor = { ...SAM, openingOffsetBalance: toCents(50_000) };
  const preDatedSale = entry('sell', 'SELL_HOME', '2026-09-01', { salePrice: toCents(900_000) });
  assert.throws(
    () => project(SETTINGS, poor, [preDatedSale, downsizer('down', '2026-11-01', 300_000)]),
    (error) => {
      assert.ok(error instanceof DownsizerContributionUnfundedError, `expected DownsizerContributionUnfundedError, got ${error.name}`);
      assert.equal(error.month, '2026-11');
      assert.match(error.message, /entry down \(DOWNSIZER_CONTRIBUTION\)/);
      return true;
    },
  );
});

// --- The door --------------------------------------------------------------------------------

// DEMO_PLAN's couple (cpi 2.5%): Dana (personA, 1968) holds an accumulation account; Ash (personB,
// 1960) an account-based pension. `BOTH` gives Ash an accumulation account too.
const BOTH = {
  ...DEMO_PLAN.household,
  homeStatus: 'occupied',
  persons: [DEMO_PLAN.household.persons[0], { ...DEMO_PLAN.household.persons[1], superInterests: [{ phase: 'accumulation', balance: toCents(0) }] }],
};
function withEntries(entries, household = BOTH, settings = DEMO_PLAN.settings) {
  return {
    ...DEMO_PLAN,
    settings,
    household,
    entries,
    scenarios: DEMO_PLAN.scenarios.map((scenario) => ({ ...scenario, entryIds: entries.map((e) => e.id) })),
  };
}
const doorSale = entry('sell', 'SELL_HOME', '2040-07-01', { salePrice: toCents(900_000) });
const doorDown = downsizer('down', '2040-08-01', 200_000);

test('door: a valid contribution parses whole', () => {
  const parsed = parsePlan(withEntries([doorSale, doorDown]));
  assert.deepEqual(parsed.entries.at(-1).params, { amount: toCents(200_000), receivingInterestIndex: 0, statedOwnedTenYears: true });
});

test('door: no SELL_HOME in the scenario is refused; one switched on nowhere is not', () => {
  assert.throws(() => parsePlan(withEntries([doorDown])), /DOWNSIZER_CONTRIBUTION with no SELL_HOME in the same scenario/);
  const plan = { ...withEntries([doorSale, doorDown]), scenarios: DEMO_PLAN.scenarios.map((scenario) => ({ ...scenario, entryIds: [doorSale.id] })) };
  assert.doesNotThrow(() => parsePlan(plan));
});

test('door: before the sale, or more than 90 days after it, is refused; day 90 is not', () => {
  const window = /within 90 days of it \(ITAA 1997 s 292-102\(1\)\(g\)\)/;
  assert.throws(() => parsePlan(withEntries([doorSale, { ...doorDown, date: '2040-06-30' }])), window);
  assert.throws(() => parsePlan(withEntries([doorSale, { ...doorDown, date: '2040-09-30' }])), window);
  assert.doesNotThrow(() => parsePlan(withEntries([doorSale, { ...doorDown, date: '2040-09-29' }])));
  assert.doesNotThrow(() => parsePlan(withEntries([doorSale, { ...doorDown, date: '2040-07-01' }])));
});

test('door: an owner under 55 on the date is refused; on the 55th birthday is not', () => {
  const young = { ...BOTH, persons: [{ ...BOTH.persons[0], dateOfBirth: '1985-08-15' }, BOTH.persons[1]] };
  assert.throws(() => parsePlan(withEntries([doorSale, doorDown], young)), /before Dana turns 55 on 2040-08-15/);
  assert.doesNotThrow(() => parsePlan(withEntries([doorSale, { ...doorDown, date: '2040-08-15' }], young)));
});

test('door: over $300,000 once raised to the date is refused — the cap is not indexed', () => {
  const cap = /over the 30000000 cent downsizer cap/;
  // At asAtDate a today's-money figure is the day's own: one cent over is refused.
  const early = { ...doorSale, date: '2026-09-01' };
  assert.throws(() => parsePlan(withEntries([early, { ...doorDown, date: '2026-10-01', params: { ...doorDown.params, amount: toCents(300_000) + 1 } }])), cap);
  assert.doesNotThrow(() => parsePlan(withEntries([early, { ...doorDown, date: '2026-09-01', params: { ...doorDown.params, amount: toCents(300_000) } }])));
  // Fourteen years out at 2.5% a year, $250,000 of today's money is well over $300,000.
  assert.throws(() => parsePlan(withEntries([doorSale, { ...doorDown, params: { ...doorDown.params, amount: toCents(250_000) } }])), cap);
});

test('door: a couple over the sale price together is refused; at or under it is not', () => {
  const cheap = { ...doorSale, params: { salePrice: toCents(350_000) } };
  const a = downsizer('a', '2040-08-01', 200_000, 'personA');
  const over = downsizer('b', '2040-08-01', 160_000, 'personB');
  assert.throws(() => parsePlan(withEntries([cheap, a, over])), /together, a couple's downsizer contributions cannot exceed what the home sold for/);
  // Each alone is within the sale price; it is only the pair that is over.
  assert.doesNotThrow(() => parsePlan(withEntries([cheap, over])));
  const under = downsizer('b', '2040-08-01', 140_000, 'personB');
  assert.doesNotThrow(() => parsePlan(withEntries([cheap, a, under])));
});

test('door: a second contribution for the same Person is refused', () => {
  const second = downsizer('down2', '2040-09-01', 50_000);
  assert.throws(() => parsePlan(withEntries([doorSale, doorDown, second])), /a SECOND DOWNSIZER_CONTRIBUTION for personA \(the first is "down"\)/);
});

test('door: a receiving interest in retirement phase, or none, is refused', () => {
  const ash = downsizer('ash', '2040-08-01', 100_000, 'personB');
  assert.throws(() => parsePlan(withEntries([doorSale, ash], { ...DEMO_PLAN.household, homeStatus: 'occupied' })), /account-based pension phase\. A downsizer contribution goes into an accumulation account/);
  assert.throws(() => parsePlan(withEntries([doorSale, { ...doorDown, params: { ...doorDown.params, receivingInterestIndex: 3 } }])), /names an account that is not in the file/);
});

test('door: the 10-year ownership test must be stated true', () => {
  const { statedOwnedTenYears: _, ...unstated } = doorDown.params;
  assert.throws(() => parsePlan(withEntries([doorSale, { ...doorDown, params: unstated }])), /statedOwnedTenYears.*is absent.*10 years or more/s);
  assert.throws(() => parsePlan(withEntries([doorSale, { ...doorDown, params: { ...unstated, statedOwnedTenYears: false } }])), /statedOwnedTenYears.*is false/s);
});

test('door: a household-owned contribution is refused', () => {
  assert.throws(() => parsePlan(withEntries([doorSale, { ...doorDown, owner: 'household' }])), /goes into one Person's own super account/);
});
