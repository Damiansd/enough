// Coverage review gap 1 — cars, caravans, boats and household contents (`Household.personalAssets`).
// One stated figure in today's money, raised on CPI each month. Counted in the Age Pension ASSETS
// test only (not a financial asset, so never deemed), seen by aged care through the same assessable
// figure, and never money: not drawn, not in reported `assessableAssets` or any wealth figure.
// Source: Services Australia, Asset types (https://www.servicesaustralia.gov.au/asset-types?context=22526).
import test from 'node:test';
import assert from 'node:assert/strict';

import { toCents, mulCents } from '../dist/core/money.js';
import { priceLevelFactor } from '../dist/core/priceLevel.js';
import { splitAssets } from '../dist/core/household.js';
import { agePensionEntitlement } from '../dist/core/agePension.js';
import { DEMO_PLAN } from '../dist/app/demoHousehold.js';
import { PlanFileHouseholdError, PlanFileAmountError, parsePlan } from '../dist/core/parsePlan.js';
import {
  project,
  monthlyFromFortnightly,
  AGE_PENSION_LINE,
  AGED_CARE_BASIC_FEE_LINE,
  AGED_CARE_HOTELLING_LINE,
  AGED_CARE_NCCC_LINE,
  AGED_CARE_DAP_LINE,
} from '../dist/core/projection.js';

const entry = (id, type, date, params = {}, owner = 'household') => ({
  id, date, owner, type, params, enabled: true, createdAt: '2026-06-01',
});
const person = (name, dateOfBirth) => ({
  name,
  dateOfBirth,
  superInterests: [],
  parcels: [],
  employmentIncomePerFortnight: toCents(0),
  workBonusBalance: toCents(0),
});

const SETTINGS = {
  asAtDate: '2026-09-16',
  planningHorizonAge: 80,
  economicSeries: { cpi: 0.025, pblci: 0.025, awote: 0.035, mtawe: 0.035 },
  deemingRates: { lower: 0.0175, upper: 0.0375 },
  nominalReturn: 0.065,
  cashInterestRate: 0,
};
const DEEMING = { lower: 0.0175, upper: 0.0375 };
const at = (months, month) => months.find((m) => m.month === month);
const lineSum = (month, description) => month.lines.filter((line) => line.description === description).reduce((sum, line) => sum + line.amount, 0);

// A homeowner couple, both over pension age, with $800,000 of cash: the ASSETS test binds.
const COUPLE = { persons: [person('Alex', '1955-06-01'), person('Blair', '1955-07-01')], homeStatus: 'occupied', openingOffsetBalance: toCents(800_000) };
const SINGLE = { persons: [person('Sam', '1955-06-01')], homeStatus: 'occupied', openingOffsetBalance: toCents(500_000) };

// --- The split and the entitlement ---------------------------------------------------------------

test('splitAssets: one household line, assessable and NOT deemed, in no Person\'s figure', () => {
  const plain = splitAssets(SINGLE, '2026-10-01');
  const split = splitAssets(SINGLE, '2026-10-01', undefined, undefined, undefined, toCents(40_000));
  assert.equal(split.assessableAssets, plain.assessableAssets + toCents(40_000));
  assert.equal(split.deemedFinancialAssets, plain.deemedFinancialAssets, 'cars and contents are not financial assets');
  assert.equal(split.protectedAssets, plain.protectedAssets);
  assert.equal(split.personalAssets, toCents(40_000));
  assert.deepEqual(split.byPerson, plain.byPerson);
  assert.equal(split.lines.at(-1).description, 'Cars, contents and other things you own');
  assert.equal(split.lines.at(-1).deemed, false);
  assert.equal('personalAssets' in plain, false);
  assert.equal('personalAssets' in splitAssets(SINGLE, '2026-10-01', undefined, undefined, undefined, toCents(0)), false);
});

test('worked example: $100,000 on a couple the assets test binds takes exactly $300 a fortnight off, and the income test does not move', () => {
  const args = { date: '2026-10-01', deemingRates: DEEMING, household: COUPLE };
  const plain = agePensionEntitlement(args);
  const owned = agePensionEntitlement({ ...args, personalAssets: toCents(100_000) });
  assert.ok(plain.assetsTest.rate < plain.incomeTest.rate, 'the fixture: the assets test binds');
  assert.equal(owned.assetsTest.assessed, plain.assetsTest.assessed + toCents(100_000));
  assert.equal(owned.incomeTest.assessed, plain.incomeTest.assessed, 'not deemed');
  assert.equal(plain.householdRatePerFortnight - owned.householdRatePerFortnight, toCents(300));
  assert.equal(plain.perPersonRatePerFortnight - owned.perPersonRatePerFortnight, toCents(150), 'half each');
});

// --- The walk ------------------------------------------------------------------------------------

test('walk: month 0 carries the figure as typed, and the Age Pension line falls by $300 a fortnight', () => {
  const none = project(SETTINGS, COUPLE, []);
  const owned = project(SETTINGS, { ...COUPLE, personalAssets: toCents(100_000) }, []);
  assert.equal(owned[0].month, '2026-09');
  assert.equal(owned[0].personalAssets, toCents(100_000));
  const fall = lineSum(none[0], AGE_PENSION_LINE) - lineSum(owned[0], AGE_PENSION_LINE);
  assert.ok(Math.abs(fall - monthlyFromFortnightly(toCents(300))) <= 1, `fell ${fall} cents`);
});

test('walk: the figure is today\'s money, raised on CPI in every month from the stated figure alone', () => {
  const months = project(SETTINGS, { ...COUPLE, personalAssets: toCents(100_000) }, []);
  assert.ok(months.length > 100);
  for (const month of months) {
    assert.equal(month.personalAssets, mulCents(toCents(100_000), priceLevelFactor(SETTINGS.economicSeries.cpi, SETTINGS.asAtDate, month.month)), month.month);
  }
  assert.ok(months.at(-1).personalAssets > toCents(120_000), 'the control: prices did rise');
});

test('walk: it is never wealth — reported assessable assets, the band and everything spendable are untouched', () => {
  // Under pension age for the whole walk, so the figure can move no pension, and then it moves nothing.
  const young = { persons: [person('Kit', '1975-02-02')], homeStatus: 'occupied', openingOffsetBalance: toCents(300_000) };
  const settings = { ...SETTINGS, planningHorizonAge: 60 };
  const spend = [entry('sc', 'SPEND_CHANGE', '2026-07-01', { annualSpend: toCents(30_000) })];
  const none = project(settings, young, spend);
  const owned = project(settings, { ...young, personalAssets: toCents(50_000) }, spend);
  assert.ok(owned.every((month) => month.personalAssets > 0));
  assert.deepEqual(owned.map(({ personalAssets, ...rest }) => rest), none);
  // And on a pensioner, month 0's reported wealth is the same figure with or without it.
  const pension = project(SETTINGS, { ...COUPLE, personalAssets: toCents(100_000) }, []);
  const plain = project(SETTINGS, COUPLE, []);
  assert.equal(pension[0].assessableAssets, plain[0].assessableAssets);
  assert.equal(pension[0].accessibleAssets, plain[0].accessibleAssets - (lineSum(plain[0], AGE_PENSION_LINE) - lineSum(pension[0], AGE_PENSION_LINE)));
});

test('walk: a plan without it has no personalAssets key in any month', () => {
  assert.ok(project(SETTINGS, COUPLE, []).every((month) => !('personalAssets' in month)));
});

test('walk: after a death the survivor carries all of it, not half', () => {
  const single = { ...SINGLE, persons: [person('Alex', '1955-06-01'), person('Blair', '1955-07-01')] };
  const death = [entry('d', 'DEATH', '2026-09-20', {}, 'personA')];
  const none = project(SETTINGS, single, death);
  const owned = project(SETTINGS, { ...single, personalAssets: toCents(100_000) }, death);
  const month = '2026-11';
  const full = mulCents(toCents(100_000), priceLevelFactor(SETTINGS.economicSeries.cpi, SETTINGS.asAtDate, month));
  assert.equal(at(owned, month).personalAssets, full);
  // A single person's taper is $3 a fortnight per $1,000: all of it, give or take the $250 step and
  // the few weeks of pension the two walks' cash has drifted by.
  const fall = lineSum(at(none, month), AGE_PENSION_LINE) - lineSum(at(owned, month), AGE_PENSION_LINE);
  const expected = monthlyFromFortnightly(mulCents(full, 3 / 1000));
  assert.ok(Math.abs(fall - expected) < toCents(20), `fell ${fall} cents a month, the whole figure is ${expected}`);
});

test('aged care sees it through the shared assessable figure', () => {
  const care = entry('ec', 'ENTER_CARE', '2026-10-01', { homeValue: toCents(900_000), radPrice: toCents(300_000), radPaidAsLumpSum: toCents(0) }, 'personA');
  // $500,000 of cash: below the hotelling contribution's asset threshold, so a stated figure lifts it.
  const modest = { ...COUPLE, openingOffsetBalance: toCents(500_000) };
  const none = project(SETTINGS, modest, [care]);
  const owned = project(SETTINGS, { ...modest, personalAssets: toCents(150_000) }, [care]);
  const FEES = [AGED_CARE_BASIC_FEE_LINE, AGED_CARE_HOTELLING_LINE, AGED_CARE_NCCC_LINE, AGED_CARE_DAP_LINE];
  const fees = (months) => FEES.reduce((sum, d) => sum + lineSum(at(months, '2026-10'), d), 0);
  assert.ok(fees(none) > 0, 'the fixture: care is charged');
  // The two walks' cash differs by one month of pension (about $650), which could move a fee by a
  // few dollars at most. $150,000 more counted moves the means-tested fees by far more.
  assert.ok(fees(owned) - fees(none) > toCents(100), `fees rose ${fees(owned) - fees(none)} cents`);
});

// --- The door ------------------------------------------------------------------------------------

const onDisk = () => JSON.parse(JSON.stringify(DEMO_PLAN));
const thrown = (fn) => {
  try { fn(); } catch (error) { return error; }
  return assert.fail('nothing was thrown');
};

test('parsePlan: whole cents of nil or more are accepted, a negative or a fraction is refused by path', () => {
  const file = onDisk();
  file.household.personalAssets = 4_000_000;
  assert.equal(parsePlan(file).household.personalAssets, 4_000_000);
  file.household.personalAssets = 0;
  assert.equal(parsePlan(file).household.personalAssets, 0);
  assert.equal('personalAssets' in parsePlan(onDisk()).household, false);
  file.household.personalAssets = -1;
  const negative = thrown(() => parsePlan(file));
  assert.ok(negative instanceof PlanFileHouseholdError);
  assert.match(negative.message, /household\.personalAssets/);
  file.household.personalAssets = 10.5;
  assert.ok(thrown(() => parsePlan(file)) instanceof PlanFileAmountError);
});
