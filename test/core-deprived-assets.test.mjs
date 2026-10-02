// GIFT slice 1 — gifts over the gifting free areas are a DEPRIVED ASSET (SS Act ss 1126AA-1126AD,
// register §4.12): counted in the assets test AND deemed for five years, by the Age Pension and by
// aged care, and never reported as wealth the Household still has (ruling J7).
//
// The golden test is Services Australia's own worked example ("How gifting can affect your
// payment", retrieved 2026-10-02): $8,000 on 1 May 2019 → $0; $13,000 on 1 Jun 2020 → $3,000 until
// 31 May 2025; $7,000 on 1 Apr 2021 → $0; $11,000 on 1 May 2022 → $6,000 until 30 April 2027.
import test from 'node:test';
import assert from 'node:assert/strict';

import { toCents } from '../dist/core/money.js';
import { deprivedAmountOn, deprivedGifts } from '../dist/core/deprivedAssets.js';
import { splitAssets } from '../dist/core/household.js';
import { agePensionEntitlement } from '../dist/core/agePension.js';
import {
  project,
  GIFT_LINE,
  ONE_OFF_EXPENSE_LINE,
  AGE_PENSION_LINE,
  AGED_CARE_BASIC_FEE_LINE,
  AGED_CARE_HOTELLING_LINE,
  AGED_CARE_NCCC_LINE,
  AGED_CARE_DAP_LINE,
} from '../dist/core/projection.js';
import { AGE_PENSION } from '../dist/data/assumptions/agePension.js';

const entry = (id, type, date, params = {}, owner = 'household', enabled = true) => ({
  id, date, owner, type, params, enabled, createdAt: '2026-06-01',
});
const gift = (id, date, dollars, owner = 'personA', enabled = true) => entry(id, 'GIFT', date, { amount: toCents(dollars) }, owner, enabled);

const person = (name, dateOfBirth) => ({
  name,
  dateOfBirth,
  superInterests: [],
  parcels: [],
  employmentIncomePerFortnight: toCents(0),
  workBonusBalance: toCents(0),
});

// --- The rule, against Services Australia's worked example -------------------------------------

const EXAMPLE = [
  gift('g2019', '2019-05-01', 8_000),
  gift('g2020', '2020-06-01', 13_000),
  gift('g2021', '2021-04-01', 7_000),
  gift('g2022', '2022-05-01', 11_000),
];

test('the stored free areas are $10,000 a year, $30,000 over five, for 5 years — primary-verified, §4.12', () => {
  assert.equal(AGE_PENSION.gifting.annualFreeArea.value, toCents(10_000));
  assert.equal(AGE_PENSION.gifting.rollingFreeArea.value, toCents(30_000));
  assert.equal(AGE_PENSION.gifting.deprivationYears.value, 5);
  for (const record of Object.values(AGE_PENSION.gifting)) {
    assert.equal(record.confidence, 'primary-verified');
    assert.equal(record.registerSection, '§4.12');
  }
});

test('Services Australia worked example: $0, $3,000, $0, $6,000 — the annual and the five-year excess add', () => {
  const made = deprivedGifts(EXAMPLE);
  assert.deepEqual(made.map((g) => g.deprived), [0, toCents(3_000), 0, toCents(6_000)]);
  // "until 31 May 2025" and "until 30 April 2027": the fifth anniversary is the first day it is off.
  assert.deepEqual(made.map((g) => g.until), ['2024-05-01', '2025-06-01', '2026-04-01', '2027-05-01']);
});

test('the example over time: off in the gift month, on from the month after, off at the fifth anniversary', () => {
  const made = deprivedGifts(EXAMPLE);
  const on = (date) => deprivedAmountOn(made, date);
  assert.equal(on('2020-06-01'), 0, 'the month of the gift: its cash is still in the opening balance');
  assert.equal(on('2020-07-01'), toCents(3_000));
  assert.equal(on('2022-05-01'), toCents(3_000));
  assert.equal(on('2022-06-01'), toCents(9_000));
  assert.equal(on('2024-06-01'), toCents(9_000), 'four years on, both are still counted');
  assert.equal(on('2025-05-01'), toCents(9_000), 'the last month-start before 1 June 2025');
  assert.equal(on('2025-06-01'), toCents(6_000), 'the 2020 gift is off on its fifth anniversary');
  assert.equal(on('2027-04-01'), toCents(6_000));
  assert.equal(on('2027-05-01'), 0);
});

test('a mid-month gift runs to the last month-start before its anniversary', () => {
  const made = deprivedGifts([gift('g', '2022-05-15', 25_000)]);
  assert.equal(deprivedAmountOn(made, '2022-05-01'), 0);
  assert.equal(deprivedAmountOn(made, '2022-06-01'), toCents(15_000));
  assert.equal(deprivedAmountOn(made, '2027-05-01'), toCents(15_000));
  assert.equal(deprivedAmountOn(made, '2027-06-01'), 0);
});

test('the financial year turns on 1 July: $10,000 on 30 June and $10,000 on 1 July are two years, inside both areas', () => {
  assert.deepEqual(deprivedGifts([gift('a', '2025-06-30', 10_000), gift('b', '2025-07-01', 10_000)]).map((g) => g.deprived), [0, 0]);
  assert.deepEqual(deprivedGifts([gift('a', '2025-07-01', 10_000), gift('b', '2026-06-30', 10_000)]).map((g) => g.deprived), [0, toCents(10_000)]);
});

test('the five-year test reaches back four financial years and no further', () => {
  // FY 2020-21 is the fourth year before FY 2024-25: still in, so the fourth $10,000 makes $40,000.
  const reach = deprivedGifts(['2020-08-01', '2021-08-01', '2022-08-01', '2024-08-01'].map((date, i) => gift(`g${i}`, date, 10_000)));
  assert.deepEqual(reach.map((g) => g.deprived), [0, 0, 0, toCents(10_000)]);
  // FY 2019-20 is the fifth year before: out, so the same four gifts a year earlier total $30,000.
  const beyond = deprivedGifts(['2019-08-01', '2021-08-01', '2022-08-01', '2024-08-01'].map((date, i) => gift(`g${i}`, date, 10_000)));
  assert.deepEqual(beyond.map((g) => g.deprived), [0, 0, 0, 0]);
});

test('a gift larger than the excess includes no more than the gift itself (the "lesser of")', () => {
  // Two $10,000 gifts already fill the year; a $1,000 third gift is all excess, not $11,000 of it.
  const made = deprivedGifts([gift('a', '2025-08-01', 10_000), gift('b', '2025-09-01', 10_000), gift('c', '2025-10-01', 1_000)]);
  assert.deepEqual(made.map((g) => g.deprived), [0, toCents(10_000), toCents(1_000)]);
});

test('a couple shares ONE $10,000, and the household carries the whole excess, not half', () => {
  const made = deprivedGifts([gift('a', '2025-08-01', 6_000, 'personA'), gift('b', '2025-09-01', 6_000, 'personB')]);
  assert.deepEqual(made.map((g) => g.deprived), [0, toCents(2_000)]);
  assert.equal(deprivedAmountOn(made, '2025-10-01'), toCents(2_000));
});

test('after a death: the survivor carries their own and joint gifts in full, and nothing the deceased gave alone', () => {
  const made = deprivedGifts([gift('a', '2025-08-01', 20_000, 'personA'), gift('h', '2026-08-01', 15_000, 'household')]);
  assert.equal(deprivedAmountOn(made, '2026-09-01'), toCents(15_000));
  assert.equal(deprivedAmountOn(made, '2026-09-01', 0), toCents(15_000), 'personA survives: their gift and the joint one');
  assert.equal(deprivedAmountOn(made, '2026-09-01', 1), toCents(5_000), 'personB survives: the joint gift only');
});

test('a disabled gift is no gift', () => {
  assert.deepEqual(deprivedGifts([gift('g', '2025-08-01', 50_000, 'personA', false)]), []);
});

// --- splitAssets and the entitlement ---------------------------------------------------------------

const SINGLE = { persons: [person('Sam', '1955-06-01')], homeStatus: 'occupied', openingOffsetBalance: toCents(300_000) };

test('splitAssets: the deprived amount is ONE household line, assessable AND deemed, in no Person\'s figure', () => {
  const plain = splitAssets(SINGLE, '2026-10-01');
  const split = splitAssets(SINGLE, '2026-10-01', undefined, undefined, toCents(40_000));
  assert.equal(split.assessableAssets, plain.assessableAssets + toCents(40_000));
  assert.equal(split.deemedFinancialAssets, plain.deemedFinancialAssets + toCents(40_000));
  assert.equal(split.protectedAssets, plain.protectedAssets);
  assert.equal(split.deprivedAssets, toCents(40_000));
  assert.deepEqual(split.byPerson, plain.byPerson);
  assert.deepEqual(split.lines.at(-1).description, 'Deprived assets (gifts)');
  assert.equal('deprivedAssets' in plain, false, 'no gift, no key');
  assert.equal('deprivedAssets' in splitAssets(SINGLE, '2026-10-01', undefined, undefined, toCents(0)), false);
});

test('the entitlement: a deprived $40,000 is assessed and deemed exactly as $40,000 more cash would be', () => {
  const args = { date: '2026-10-01', deemingRates: { lower: 0.0175, upper: 0.0375 } };
  const plain = agePensionEntitlement({ ...args, household: SINGLE });
  const gifted = agePensionEntitlement({ ...args, household: SINGLE, deprivedAssets: toCents(40_000) });
  const richer = agePensionEntitlement({ ...args, household: { ...SINGLE, openingOffsetBalance: toCents(340_000) } });
  assert.equal(gifted.assetsTest.assessed, richer.assetsTest.assessed);
  assert.equal(gifted.incomeTest.assessed, richer.incomeTest.assessed);
  assert.ok(gifted.assetsTest.assessed > plain.assetsTest.assessed, 'the assets test sees it');
  assert.ok(gifted.incomeTest.assessed > plain.incomeTest.assessed, 'deeming sees it');
  assert.equal(gifted.householdRatePerFortnight, richer.householdRatePerFortnight);
  assert.ok(gifted.householdRatePerFortnight < plain.householdRatePerFortnight);
});

// --- The walk ------------------------------------------------------------------------------------

// $600,000 of cash: over the assets-test free area, so a dollar more or less moves the pension.
const WALKER = { ...SINGLE, openingOffsetBalance: toCents(600_000) };
const SETTINGS = {
  asAtDate: '2026-09-16',
  planningHorizonAge: 77,
  economicSeries: { cpi: 0.025, pblci: 0.025, awote: 0.035, mtawe: 0.035 },
  deemingRates: { lower: 0.0175, upper: 0.0375 },
  nominalReturn: 0.065,
  cashInterestRate: 0,
};
const at = (months, month) => months.find((m) => m.month === month);
const lineSum = (month, description) => month.lines.filter((line) => line.description === description).reduce((sum, line) => sum + line.amount, 0);
const amountsByDescription = (month, without) =>
  Object.fromEntries(month.lines.filter((line) => line.description !== without).map((line) => [line.description, line.amount]));

test('walk: a $50,000 gift leaves cash in its month, and from the next month the means test sees the $40,000 excess', () => {
  const months = project(SETTINGS, WALKER, [gift('g', '2026-11-15', 50_000)]);
  // The counterfactual: $10,000 spent instead — the same cash plus the same deprived amount.
  const spent = project(SETTINGS, WALKER, [entry('o', 'ONE_OFF_EXPENSE', '2026-11-15', { amount: toCents(10_000) })]);
  const none = project(SETTINGS, WALKER, []);
  const nov = at(months, '2026-11');
  assert.equal(lineSum(nov, GIFT_LINE), toCents(50_000));
  assert.equal('deprivedAssets' in nov, false, 'no double count in the gift month');
  assert.deepEqual(nov.assessableAssets, at(none, '2026-11').assessableAssets);

  const dec = at(months, '2026-12');
  assert.equal(dec.deprivedAssets, toCents(40_000));
  // Wealth stays real: the reported figure fell by exactly the gift.
  assert.equal(at(none, '2026-12').assessableAssets - dec.assessableAssets, toCents(50_000));
  assert.equal(dec.assessableAssets + dec.deprivedAssets, at(spent, '2026-12').assessableAssets);
  // And the pension is the one $40,000 of real cash would get.
  assert.equal(lineSum(dec, AGE_PENSION_LINE), lineSum(at(spent, '2026-12'), AGE_PENSION_LINE));
  assert.ok(lineSum(dec, AGE_PENSION_LINE) > lineSum(at(none, '2026-12'), AGE_PENSION_LINE), 'only the $10,000 inside the free area is gone from the means test');
});

test('walk: the deprived amount runs to the last month before the fifth anniversary, then the key is gone', () => {
  const months = project(SETTINGS, WALKER, [gift('g', '2026-11-15', 50_000)]);
  assert.equal(at(months, '2031-11').deprivedAssets, toCents(40_000));
  assert.equal('deprivedAssets' in at(months, '2031-12'), false);
});

test('walk: a pre-plan gift reaches month 0 and expires on its own schedule, with no cash line', () => {
  const months = project(SETTINGS, WALKER, [gift('g', '2026-03-10', 30_000)]);
  const none = project(SETTINGS, WALKER, []);
  assert.equal(months[0].month, '2026-09');
  assert.equal(months[0].deprivedAssets, toCents(20_000));
  assert.equal(lineSum(months[0], GIFT_LINE), 0, 'the cash is already gone from the stated balances');
  assert.equal(months[0].assessableAssets, none[0].assessableAssets);
  assert.ok(lineSum(months[0], AGE_PENSION_LINE) < lineSum(none[0], AGE_PENSION_LINE));
  assert.equal(at(months, '2031-03').deprivedAssets, toCents(20_000));
  assert.equal('deprivedAssets' in at(months, '2031-04'), false);
});

test('walk: a gift older than five years, and a disabled gift, change nothing at all', () => {
  const none = project(SETTINGS, WALKER, []);
  assert.deepEqual(project(SETTINGS, WALKER, [gift('old', '2021-08-01', 90_000)]), none);
  assert.deepEqual(project(SETTINGS, WALKER, [gift('off', '2026-11-15', 90_000, 'personA', false)]), none);
});

test('walk: a plan with no gift has no deprivedAssets key in any month', () => {
  assert.ok(project(SETTINGS, WALKER, []).every((month) => !('deprivedAssets' in month)));
});

test('walk: a gift bigger than the cash takes the one-off shortfall path, and still counts', () => {
  const poor = { ...WALKER, openingOffsetBalance: toCents(20_000) };
  const months = project(SETTINGS, poor, [gift('g', '2026-11-15', 50_000)]);
  const spent = project(SETTINGS, poor, [entry('o', 'ONE_OFF_EXPENSE', '2026-11-15', { amount: toCents(50_000) })]);
  assert.deepEqual(amountsByDescription(at(months, '2026-11'), GIFT_LINE), amountsByDescription(at(spent, '2026-11'), ONE_OFF_EXPENSE_LINE));
  assert.equal(at(months, '2026-12').deprivedAssets, toCents(40_000));
});

test('walk: after the giver dies the deprived amount ends; the survivor\'s own gift carries on in full', () => {
  const couple = { persons: [person('Alex', '1955-06-01'), person('Blair', '1955-07-01')], homeStatus: 'occupied', openingOffsetBalance: toCents(600_000) };
  const death = entry('d', 'DEATH', '2027-06-10', {}, 'personA');
  const byAlex = project(SETTINGS, couple, [gift('g', '2026-11-15', 50_000, 'personA'), death]);
  assert.equal(at(byAlex, '2027-05').deprivedAssets, toCents(40_000));
  assert.equal('deprivedAssets' in at(byAlex, '2027-06'), false);
  const byBlair = project(SETTINGS, couple, [gift('g', '2026-11-15', 50_000, 'personB'), death]);
  assert.equal(at(byBlair, '2027-06').deprivedAssets, toCents(40_000));
});

test('aged care sees the deprived amount through the shared assessable figure', () => {
  const couple = { persons: [person('Alex', '1955-06-01'), person('Blair', '1955-07-01')], homeStatus: 'occupied', openingOffsetBalance: toCents(700_000) };
  const care = entry('ec', 'ENTER_CARE', '2026-10-01', { homeValue: toCents(900_000), radPrice: toCents(300_000), radPaidAsLumpSum: toCents(0) }, 'personA');
  const months = project(SETTINGS, couple, [gift('g', '2026-09-20', 150_000), care]);
  const spent = project(SETTINGS, couple, [entry('o', 'ONE_OFF_EXPENSE', '2026-09-20', { amount: toCents(10_000) }), care]);
  const none = project(SETTINGS, couple, [care]);
  const month = '2026-12';
  assert.equal(at(months, month).deprivedAssets, toCents(140_000));
  const FEES = [AGED_CARE_BASIC_FEE_LINE, AGED_CARE_HOTELLING_LINE, AGED_CARE_NCCC_LINE, AGED_CARE_DAP_LINE];
  const careLines = (m) => Object.fromEntries(FEES.map((d) => [d, lineSum(at(m, month), d)]));
  assert.ok(careLines(months)[AGED_CARE_HOTELLING_LINE] + careLines(months)[AGED_CARE_DAP_LINE] > 0, 'the month has means-tested fees to compare');
  assert.deepEqual(careLines(months), careLines(spent));
  assert.notDeepEqual(careLines(months), careLines(none));
});
