// P2-7 — the display gloss, and the four things it must never be.
//
// This file is the whole of the today's-money behaviour. The other `app-*` display tests draw in
// the FUTURE-dollars view on purpose (each says so where its basis constant is declared): their
// assertions are about the engine's own hand-derived figures and about the SHAPE of a config, and
// in that view `todaysDollars.ts`'s lens is the identity, so none of them was re-based when this
// landed. What moved is here, and nothing here reads an expected figure off the implementation:
// every converted amount below is re-derived from `$x × 1.025 ^ (months / 12)` written out in the
// test, which is the same arithmetic stated in `todaysDollars.ts`'s prose and nowhere else.
//
// The four failures this file exists to catch, in the order the brief named them:
//
//   * the conversion running the WRONG WAY — every future figure must get SMALLER, and a later
//     month must move further than an earlier one;
//   * the DEFAULT silently becoming the raw future amounts;
//   * the conversion creeping into the ENGINE, which ADR-0001 forbids in terms — the engine must
//     see nominal dollars or it taxes, tapers and caps against thresholds that were converted and
//     thresholds that were not;
//   * the EDIT BOUNDARY being converted. A figure written to be READ and a figure written to be
//     TYPED BACK are different jobs; deflating the second shows a household an amount they never
//     typed, in a box they are about to save from, and loses money on the round trip.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { project } from '../dist/core/projection.js';
import { formatCents } from '../dist/core/money.js';
import { formatDollars } from '../dist/app/displayMoney.js';
import { DEMO_ENTRIES, DEMO_HOUSEHOLD, DEMO_PLAN, DEMO_SETTINGS } from '../dist/app/demoHousehold.js';
import { contingencyFloorAt, contingencyFloorBreach, statedContingencyFloor } from '../dist/core/outcomes.js';
import { monthsToRows, monthToRow } from '../dist/app/monthToRows.js';
import { monthsToSeries } from '../dist/app/monthsToSeries.js';
import { chartConfig } from '../dist/app/chartConfig.js';
import { comparisonChartConfig } from '../dist/app/comparisonConfig.js';
import { comparisonSeries } from '../dist/app/comparisonSeries.js';
import { scenarioWalks } from '../dist/app/scenarioWalks.js';
import { parsePlan } from '../dist/core/parsePlan.js';
import { centsToDollars, settingsFormValues } from '../dist/app/planEdits.js';
import {
  DEFAULT_MONEY_VIEW,
  MONEY_VIEW_BASIS,
  MONEY_VIEW_LABELS,
  TODAYS_MONEY_NOTICE,
  TODAYS_MONEY_SUMMARY,
  moneyBasis,
  moneyLens,
  monthsFromAsAt,
  priceLevelFactor,
  statedInTodaysMoneyLens,
} from '../dist/app/todaysDollars.js';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = join(ROOT, 'src');
const read = (...parts) => readFileSync(join(SRC, ...parts), 'utf8');
/**
 * Import specifiers off the RAW source — the stripped form blanks string literals, and an import
 * specifier IS one, so a grep against stripped code can never find what it forbids.
 *
 * ⚠️ **ANCHORED AT `^import`, AND THAT IS NOT TIDINESS.** The looser `/\bfrom\s*['"]…/` this repo
 * uses elsewhere is matched against the unstripped file, so a wrapped prose string whose segment
 * happens to end with the word "from" — `'… hold a sum from' + ' forty years away …'` — is read as
 * an import of `" + "`. That was measured on this very pass: a reworded draft of
 * `TODAYS_MONEY_NOTICE` broke the core-import sweep below, which has nothing to do with prose.
 * These modules carry long concatenated sentences by design, so the walker that reads them is
 * anchored to a statement rather than to a keyword.
 */
const imports = (raw) => [...raw.matchAll(/^import\b[^'"]*?from\s*['"]([^'"]+)['"]/gm)].map(([, specifier]) => specifier);

const MONTHS = project(DEMO_SETTINGS, DEMO_HOUSEHOLD, DEMO_ENTRIES);
const FLOOR_700K = 700_000_00;
/**
 * **The floor as a plan states it (P4-14).** `monthsToSeries` no longer takes a bare figure: a
 * floor is `Settings.contingencyFloor`, stated in TODAY'S money, and it travels with the date it is
 * stated at and the CPI that raises it to a later month's price level. Built through
 * `statedContingencyFloor` rather than as a literal, so these fixtures go through the door a page
 * goes through.
 */
const STATED_700K = statedContingencyFloor({ ...DEMO_SETTINGS, contingencyFloor: FLOOR_700K });

const SERIES = monthsToSeries(MONTHS, DEMO_HOUSEHOLD, STATED_700K, DEMO_SETTINGS.economicSeries.agePension);

const TODAY = moneyBasis('todaysDollars', DEMO_SETTINGS);
const FUTURE = moneyBasis('futureDollars', DEMO_SETTINGS);

/**
 * **THE MODEL, WRITTEN OUT BY HAND AND NEVER READ OFF THE CODE.** `DEMO_SETTINGS` states
 * `asAtDate: '2026-09-01'` and `cpi: 0.025`, so a month `m` months after 2026-09 has prices
 * `1.025 ^ (m / 12)` times today's. Rounding is `money.ts`'s own rule — half away from zero, to a
 * whole cent — restated here rather than imported, so that a change to either one is a failure
 * rather than a silent agreement.
 */
const monthIndex = (yyyymm) => Number(yyyymm.slice(0, 4)) * 12 + Number(yyyymm.slice(5, 7));
const elapsed = (yyyymm) => monthIndex(yyyymm) - monthIndex('2026-09');
const factor = (yyyymm) => 1.025 ** (elapsed(yyyymm) / 12);
const round = (n) => Math.sign(n) * Math.round(Math.abs(n));
const inTodaysMoney = (cents, yyyymm) => round(cents / factor(yyyymm));

const FIRST = MONTHS[0].month;
const MID = MONTHS[250].month;
const LAST = MONTHS.at(-1).month;
/**
 * ⚠️ **THE LAST MONTH THIS HOUSEHOLD STILL HOLDS SOMETHING — index 351, 2055-12 (register O85,
 * 2026-09-21).** The demo walk used to end holding money, and two assertions below read
 * `MONTHS.at(-1)` for a late, non-nil figure. Since the stated spending level became a REAL figure
 * the demo household's money runs out in 2055-12 and the last 149 months are nil, which would make
 * both of them vacuous — `$0.00` satisfies any lens at all. Found by looking rather than stated as a
 * literal, so the next walk that moves moves this with it; the assertion that it is LATE is what
 * makes it the fixture those two tests need.
 */
const LAST_HOLDING = MONTHS.reduce((latest, month) => (month.assessableAssets > 0 ? month : latest), MONTHS[0]);

// --- §0 The model is the engine's, and the fixture is not degenerate -----------------------------

test('the fixture this file rests on: 501 months, a NON-ZERO cpi, and a month 0 that is the as-at month', () => {
  // Every measurement below is vacuous on a fixture whose cpi is 0 (the factor would be 1 in every
  // month and the two views would coincide by construction, not by correctness). Asserted first.
  assert.equal(DEMO_SETTINGS.economicSeries.cpi, 0.025);
  assert.ok(DEMO_SETTINGS.economicSeries.cpi > 0, 'a zero cpi makes every assertion in this file vacuous');
  assert.equal(DEMO_SETTINGS.asAtDate, '2026-09-01');
  assert.equal(MONTHS.length, 501);
  assert.equal(FIRST, '2026-09');
  assert.equal(LAST, '2068-05');
  assert.equal(elapsed(FIRST), 0);
  assert.equal(elapsed(LAST), 500);
});

test('the price level: 1 in month 0, and the hand-worked figure at three later months', () => {
  assert.equal(monthsFromAsAt(TODAY, FIRST), 0);
  assert.equal(priceLevelFactor(TODAY, FIRST), 1, 'month 0 must be EXACTLY 1, not approximately');
  // 2027-09 is twelve months on: 1.025 ^ 1.
  assert.equal(priceLevelFactor(TODAY, '2027-09'), 1.025);
  // 2028-09 is twenty-four: 1.025 ^ 2 = 1.050625.
  assert.equal(priceLevelFactor(TODAY, '2028-09'), 1.025 ** 2);
  // And the far end: 500 months is 1.025 ^ (500/12) ≈ 2.7979, so $1,000,000 in 2068-05 is about
  // $357,400 of today's money — the figure that makes the feature necessary at all.
  assert.ok(Math.abs(priceLevelFactor(TODAY, LAST) - 2.797871) < 1e-5, priceLevelFactor(TODAY, LAST));
  assert.equal(inTodaysMoney(1_000_000_00, LAST), 35_741_459);
  assert.equal(formatCents(moneyLens(TODAY, LAST)(1_000_000_00)), '$357,414.59');
});

test('a price level cannot be asked of an impossible cpi, or of a date that is not one', () => {
  assert.throws(() => priceLevelFactor({ ...TODAY, cpi: -1 }, LAST), RangeError);
  assert.throws(() => priceLevelFactor({ ...TODAY, cpi: -2 }, LAST), RangeError);
  assert.throws(() => priceLevelFactor(TODAY, 'next year'), RangeError);
  assert.throws(() => priceLevelFactor(TODAY, '2026-9'), RangeError);
  // The positive control: a cpi just inside the bound is a number, not a refusal.
  assert.ok(Number.isFinite(priceLevelFactor({ ...TODAY, cpi: -0.99 }, LAST)));
});

// --- §1 The default -------------------------------------------------------------------------------

test('TODAY’S MONEY IS THE DEFAULT, with no toggle interaction — and the markup agrees', () => {
  assert.equal(DEFAULT_MONEY_VIEW, 'todaysDollars');
  const html = readFileSync(join(ROOT, 'public', 'index.html'), 'utf8');
  const radios = [...html.matchAll(/<input type="radio" name="money-view" value="(\w+)"( checked)?>/g)];
  assert.equal(radios.length, 2, 'the money toggle is not two radios in the markup');
  assert.deepEqual(radios.map(([, value]) => value), ['todaysDollars', 'futureDollars']);
  assert.deepEqual(
    radios.map(([, , checked]) => checked !== undefined),
    [true, false],
    'the markup no longer starts the page in today’s money',
  );
  // `main.ts` reads the initial mode off that markup and falls back to the SAME default when no
  // radio is checked — a page that named `'futureDollars'` as its fallback would open in the other
  // view the moment the markup changed.
  const main = read('app', 'main.ts');
  assert.match(main, /let moneyView: MoneyView = checkedMoneyInput\?\.value === 'futureDollars' \? 'futureDollars' : 'todaysDollars';/);
});

// --- §2 Month 0 is identical in both views — the cleanest proof the maths is right ----------------

test('MONTH 0 is IDENTICAL in both views, figure for figure, across the whole row', () => {
  const today = monthToRow(MONTHS[0], TODAY);
  const future = monthToRow(MONTHS[0], FUTURE);
  assert.deepEqual(today, future, 'the factor in the as-at month is 1, so nothing in the row may move');
  // And not vacuously: the row carries real money, in several fields.
  assert.notEqual(today.openingBalance, '$0');
  assert.notEqual(today.protectedAssets, '$0');
  assert.ok(today.cashLines.length > 0);
});

test('month 0 is identical in the CHART too, in every dataset including the floor', () => {
  const today = chartConfig(SERIES, TODAY);
  const future = chartConfig(SERIES, FUTURE);
  for (const key of ['protected', 'assessable', 'accessible', 'floor']) {
    const at = (config) => config.data.datasets.find((dataset) => dataset.key === key).data[0];
    assert.equal(at(today), at(future), `${key} moved in month 0`);
  }
});

// --- §3 The DIRECTION, and that a later month moves further than an earlier one -------------------

test('every future figure gets SMALLER in today’s money — not one moves the other way', () => {
  let strictlySmaller = 0;
  let unchanged = 0;
  for (const month of MONTHS) {
    const lens = moneyLens(TODAY, month.month);
    for (const cents of [month.openingBalance, month.closingBalance, month.protectedAssets, month.assessableAssets, month.accessibleAssets, ...month.lines.map((line) => line.amount)]) {
      const converted = lens(cents);
      assert.ok(Math.abs(converted) <= Math.abs(cents), `${month.month}: ${cents} grew to ${converted}`);
      if (Math.abs(converted) < Math.abs(cents)) strictlySmaller += 1;
      else unchanged += 1;
    }
  }
  // The count matters as much as the direction: a lens that returned its argument would pass the
  // inequality above on every figure and this file would be proving nothing.
  assert.ok(strictlySmaller > 3_000, `only ${strictlySmaller} figures moved — the lens is barely doing anything`);
  // The unchanged ones are month 0 and the nil figures, and nothing else.
  assert.ok(unchanged > 0 && unchanged < strictlySmaller, `${unchanged} unchanged`);
});

test('a LATE month moves further than a MID month, which moves further than month 0', () => {
  // The same nominal amount, put through three months' lenses. $1,000,000 chosen as a round figure,
  // not read off the walk.
  const at = (month) => moneyLens(TODAY, month)(1_000_000_00);
  assert.equal(at(FIRST), 1_000_000_00);
  assert.equal(at(MID), inTodaysMoney(1_000_000_00, MID));
  assert.equal(at(LAST), inTodaysMoney(1_000_000_00, LAST));
  assert.ok(at(LAST) < at(MID), `${at(LAST)} is not below ${at(MID)}`);
  assert.ok(at(MID) < at(FIRST), `${at(MID)} is not below ${at(FIRST)}`);
  // And on the walk's own figures: the last month's wealth, in today's money, is strictly below the
  // same month's raw amount, by the factor and by nothing else. `assessableAssets` and not
  // `protectedAssets` — by 2068 both Persons are past Age Pension age and nothing is protected any
  // more, and a $0.00 figure would satisfy any lens at all.
  const last = LAST_HOLDING;
  assert.ok(last.assessableAssets > 0, 'the fixture’s last holding month holds nothing — this assertion is vacuous');
  assert.ok(MONTHS.indexOf(last) > 300, 'and it must be LATE, or the factor it is read against is small');
  // ⚠️ **AND ONE MONTH EARLIER AGAIN ON THE SAME DAY (P10-5).** The demo plan is stated as at
  // 1 September, and until then the engine paid no Account-Based Pension minimum before the
  // following 1 July — a nil with no clause behind it in SIS Reg Sch 7. Ash's pension pays that
  // opening part-year now, the money is drawn and spent ten months sooner, and every exhaustion
  // downstream of it arrives one month sooner.
  // ⚠️ **AND THE LAST MONTH OF THE WALK SINCE 2026-09-23.** The Age Pension indexes on the plan's own
  // growth rates now and the demo couple never runs out, so its last holding month is the horizon
  // itself — later, and read against a larger factor, which makes this assertion stronger.
  assert.equal(last.month, '2068-05');
  assert.equal(last, MONTHS.at(-1));
  assert.equal(monthToRow(last, TODAY).assessableAssets, formatDollars(inTodaysMoney(last.assessableAssets, last.month)));
  assert.notEqual(monthToRow(last, TODAY).assessableAssets, monthToRow(last, FUTURE).assessableAssets);
});

test('every figure in a row is the SAME row’s lens applied to the engine’s own figure', () => {
  // Re-derived from the model, month by month, for all 501 — not sampled, and not compared against
  // the other view, so a lens that was merely CONSISTENT would not survive this.
  for (const month of MONTHS) {
    const row = monthToRow(month, TODAY);
    assert.equal(row.protectedAssets, formatDollars(inTodaysMoney(month.protectedAssets, month.month)), month.month);
    assert.equal(row.assessableAssets, formatDollars(inTodaysMoney(month.assessableAssets, month.month)), month.month);
    assert.equal(row.accessibleAssets, formatDollars(inTodaysMoney(month.accessibleAssets, month.month)), month.month);
    assert.equal(row.openingBalance, formatDollars(inTodaysMoney(month.openingBalance, month.month)), month.month);
    assert.equal(row.closingBalance, formatDollars(inTodaysMoney(month.closingBalance, month.month)), month.month);
    const cash = month.lines.filter((line) => line.effect === 'cash');
    assert.equal(row.cashLines.length, cash.length);
    cash.forEach((line, index) => {
      assert.equal(row.cashLines[index].amount, formatDollars(inTodaysMoney(line.amount, month.month)), `${month.month} line ${index}`);
    });
  }
});

test('the cash reconciliation survives the conversion — exactly in one view, within a CENT in the other, within the printed DOLLAR on the page', () => {
  // **Two levels since 2026-09-24, when the page stopped printing cents.** The converted figures
  // themselves reconcile exactly in the raw view and within a cent in today's money — that is the
  // lens, and it is asserted on the lens's own output. The page then prints each of the three to
  // the dollar ON ITS OWN (`displayMoney.ts`; the total is never re-added from rounded parts), so
  // the PRINTED opening + net can sit a dollar away from the printed closing, in either view.
  const cents = (text) => Math.round(Number(text.replace(/[$,]/g, '')) * 100);
  const cashNet = (month) =>
    month.lines.filter((line) => line.effect === 'cash').reduce((sum, line) => sum + (line.direction === 'inflow' ? line.amount : -line.amount), 0);
  let worst = 0;
  let worstPrinted = 0;
  for (const month of MONTHS) {
    const future = moneyLens(FUTURE, month.month);
    assert.equal(
      future(month.openingBalance) + future(cashNet(month)),
      future(month.closingBalance),
      `${month.month}: the raw view must reconcile to the cent`,
    );
    const today = moneyLens(TODAY, month.month);
    const drift = today(month.openingBalance) + today(cashNet(month)) - today(month.closingBalance);
    assert.ok(Math.abs(drift) <= 1, `${month.month}: ${drift} cents out, and the rounding bound is 1`);
    worst = Math.max(worst, Math.abs(drift));
    for (const basis of [FUTURE, TODAY]) {
      const row = monthToRow(month, basis);
      const printed = cents(row.openingBalance) + cents(row.cashNet) - cents(row.closingBalance);
      assert.ok(Math.abs(printed) <= 100, `${month.month}: the printed figures are ${printed} cents out, and the bound is a dollar`);
      worstPrinted = Math.max(worstPrinted, Math.abs(printed));
    }
  }
  // The bound is REACHED on this fixture, so the assertion above is not passing because the drift
  // is always nil. `todaysDollars.ts` states this residue and `TODAYS_MONEY_NOTICE` says it on the
  // page; if this ever reads 0, the note is claiming something that no longer happens.
  assert.equal(worst, 1, 'the one-cent rounding residue is no longer reached — check the note still tells the truth');
  assert.equal(worstPrinted, 100, 'no printed month is a dollar out — check TODAYS_MONEY_NOTICE still tells the truth');
});

// --- §4 cpi = 0: the algebraic control ------------------------------------------------------------

test('cpi = 0 makes the two views IDENTICAL everywhere — table, chart and comparison chart', () => {
  const flatSettings = { ...DEMO_SETTINGS, economicSeries: { ...DEMO_SETTINGS.economicSeries, cpi: 0 } };
  const flatToday = moneyBasis('todaysDollars', flatSettings);
  const flatFuture = moneyBasis('futureDollars', flatSettings);
  assert.equal(priceLevelFactor(flatToday, LAST), 1);
  assert.deepEqual(monthsToRows(MONTHS, flatToday), monthsToRows(MONTHS, flatFuture));
  const today = chartConfig(SERIES, flatToday);
  const future = chartConfig(SERIES, flatFuture);
  assert.deepEqual(today.data.datasets.map((d) => [...d.data]), future.data.datasets.map((d) => [...d.data]));
  // The vacuity control: at the plan's REAL cpi the same comparison fails. Without this, a lens
  // that ignored its basis entirely would pass the assertions above.
  assert.notDeepEqual(
    chartConfig(SERIES, TODAY).data.datasets.map((d) => [...d.data]),
    chartConfig(SERIES, FUTURE).data.datasets.map((d) => [...d.data]),
  );
  assert.notDeepEqual(monthsToRows(MONTHS, TODAY), monthsToRows(MONTHS, FUTURE));
});

// --- §5 One toggle, both visuals, and no second walk ----------------------------------------------

test('the toggle changes BOTH the table and the chart, off ONE basis and ONE walk', () => {
  // The same `MONTHS` array and the same `SERIES` object produce both views: nothing below
  // re-projects, re-walks or rebuilds a series, which is the whole reason the toggle is cheap.
  const rowsToday = monthsToRows(MONTHS, TODAY);
  const rowsFuture = monthsToRows(MONTHS, FUTURE);
  const chartToday = chartConfig(SERIES, TODAY);
  const chartFuture = chartConfig(SERIES, FUTURE);
  assert.notDeepEqual(rowsToday.at(-1), rowsFuture.at(-1), 'the table did not move');
  assert.notDeepEqual(
    [...chartToday.data.datasets[0].data],
    [...chartFuture.data.datasets[0].data],
    'the chart did not move',
  );
  // And the two agree with each other: the table's assessable figure for the last month IS the
  // chart's last assessable point, in whichever view. Two figures on one screen that disagreed
  // about which money they are in is the failure ADR-0001 names.
  for (const [rows, config, basis] of [[rowsToday, chartToday, 'today'], [rowsFuture, chartFuture, 'future']]) {
    const point = config.data.datasets.find((dataset) => dataset.key === 'assessable').data.at(-1);
    assert.equal(rows.at(-1).assessableAssets, formatDollars(point), `the ${basis} table and chart disagree`);
  }
  // The comparison chart moves with them, off the same basis — one toggle for the page, not one
  // per visual.
  const plan = parsePlan(DEMO_PLAN);
  const comparison = comparisonSeries(plan, scenarioWalks(plan));
  assert.notDeepEqual(
    [...comparisonChartConfig(comparison, TODAY).data.datasets[0].data],
    [...comparisonChartConfig(comparison, FUTURE).data.datasets[0].data],
    'the comparison chart is left in the other money',
  );
});

test('only the NUMBERS move — the shape of the config is identical in both views', () => {
  const shapeOf = (config) => ({
    keys: config.data.datasets.map((dataset) => dataset.key),
    stacks: config.data.datasets.map((dataset) => dataset.stack),
    labels: config.data.datasets.map((dataset) => dataset.label),
    markers: config.markers.map((marker) => [marker.key, marker.index, marker.month]),
    ticks: [...config.xTicks.indices],
    lengths: config.data.datasets.map((dataset) => dataset.data.length),
  });
  assert.deepEqual(shapeOf(chartConfig(SERIES, TODAY)), shapeOf(chartConfig(SERIES, FUTURE)));
  // The row shape too: the same fields, the same line and note counts, the same entry ids.
  const shapeOfRow = (row) => ({
    month: row.month,
    keys: Object.keys(row),
    lines: [row.cashLines.length, row.wealthLines.length],
    notes: row.notes.map((note) => note.subject),
    entries: [...row.appliedEntryIds],
  });
  assert.deepEqual(monthsToRows(MONTHS, TODAY).map(shapeOfRow), monthsToRows(MONTHS, FUTURE).map(shapeOfRow));
});

// --- §6 The Contingency Floor, which runs the OTHER way -------------------------------------------

test('THE FLOOR IS STATED IN TODAY’S MONEY — flat in this view, curving UP in the raw one', () => {
  const floorOf = (config) => [...config.data.datasets.find((dataset) => dataset.key === 'floor').data];
  const today = floorOf(chartConfig(SERIES, TODAY));
  const future = floorOf(chartConfig(SERIES, FUTURE));
  // Flat, and flat at the figure the page handed in — the chart holds no floor of its own.
  assert.deepEqual(today, MONTHS.map(() => FLOOR_700K));
  // Rising, month by month, at the price level and nothing else. Re-derived from the model.
  assert.deepEqual(future, MONTHS.map((month) => round(FLOOR_700K * factor(month.month))));
  assert.equal(future[0], FLOOR_700K, 'the as-at month must be the stated figure in BOTH views');
  assert.ok(future.at(-1) > future[250] && future[250] > future[0], 'the raw-view floor does not curve upward');
  // ⚠️ It is the ONLY series that runs this way — the reachable line it is compared against falls
  // in today's money while the floor stands still, which is the comparison the ruling intends.
  const accessibleToday = [...chartConfig(SERIES, TODAY).data.datasets.find((d) => d.key === 'accessible').data];
  const accessibleFuture = [...chartConfig(SERIES, FUTURE).data.datasets.find((d) => d.key === 'accessible').data];
  // Read at the last month the household can still REACH something (2055-11, one month before
  // `LAST_HOLDING` — the last of its super is assessable in the month it is drawn and reachable in
  // the month before): since register O85 the walk ends at nil, and nil is nil in both views, so at
  // `at(-1)` this comparison would be true of a lens that did nothing at all.
  const held = MONTHS.reduce((latest, month, index) => (month.accessibleAssets > 0 ? index : latest), 0);
  assert.ok(accessibleFuture[held] > 0, 'the control: this month must hold something in the raw view');
  assert.ok(accessibleToday[held] < accessibleFuture[held], 'the reachable line must fall, not rise, in today’s money');
  assert.equal(statedInTodaysMoneyLens(TODAY, LAST)(FLOOR_700K), FLOOR_700K);
  assert.equal(statedInTodaysMoneyLens(FUTURE, LAST)(FLOOR_700K), round(FLOOR_700K * factor(LAST)));
  // The two lenses are each other's opposite in direction, on the same view, which is the property
  // that makes "which money is this figure already in?" the only question a caller has to answer.
  assert.ok(moneyLens(TODAY, LAST)(FLOOR_700K) < FLOOR_700K);
  assert.ok(statedInTodaysMoneyLens(FUTURE, LAST)(FLOOR_700K) > FLOOR_700K);
});

// --- §7 The EDIT BOUNDARY is not converted, and cannot be ------------------------------------------

test('THE EDIT BOXES ARE UNAFFECTED by the toggle — the round trip is still exact', () => {
  const plan = parsePlan(DEMO_PLAN);
  const values = settingsFormValues(plan);
  // The settings form is built from the plan and knows nothing about a view: there is no basis to
  // hand it, and the figures it holds are the ones on disk.
  assert.equal(settingsFormValues.length, 1, 'the settings form has grown a second argument — is it a money basis?');
  assert.deepEqual(settingsFormValues(plan), values);
  // `centsToDollars` is the edit-side formatter and it is a pure function of the cents: same figure
  // in, same text out, whatever the page is showing elsewhere on screen.
  assert.equal(centsToDollars(700_000_00), '700000.00');
  assert.equal(centsToDollars.length, 1, 'centsToDollars has grown an argument — is it a money basis?');
  // And a late-dated figure is NOT deflated by it — the same number of cents that the chart draws
  // at barely a third of its size comes back here at full value, ready to be typed over.
  assert.equal(centsToDollars(1_000_000_00), '1000000.00');
  assert.notEqual(centsToDollars(1_000_000_00), centsToDollars(inTodaysMoney(1_000_000_00, LAST)));
  assert.equal(formatCents(moneyLens(TODAY, LAST)(1_000_000_00)), '$357,414.59');
});

test('STRUCTURAL — the edit-side modules do not import the display gloss at all', () => {
  for (const module of ['planEdits.ts', 'entryForm.ts', 'settingsPanel.ts', 'firstRunPanel.ts']) {
    assert.ok(
      !imports(read('app', module)).some((specifier) => specifier.includes('todaysDollars')),
      `${module} imports the display gloss — a figure to be TYPED BACK must never be converted`,
    );
  }
  // The positive control: the walker DOES find the import in the modules that legitimately have it,
  // so "found none" above is a fact about those files and not about the regex.
  for (const module of ['monthToRows.ts', 'chartConfig.ts', 'comparisonConfig.ts', 'main.ts']) {
    assert.ok(
      imports(read('app', module)).some((specifier) => specifier.includes('todaysDollars')),
      `${module} no longer converts anything`,
    );
  }
});

test('STRUCTURAL — NOTHING IN src/core IMPORTS THE DISPLAY GLOSS (ADR-0001)', () => {
  // The whole of ADR-0001 in one assertion. The engine must never see a converted figure: tax
  // brackets are not indexed, the transfer balance cap is indexed to CPI and the Age Pension rate
  // to wages, so a deflated dollar handed to `src/core/` is taxed, tapered and capped against
  // thresholds that were never converted, and the errors do not cancel.
  //
  // The inventory is DISCOVERED from the directory rather than listed, so a core module added
  // tomorrow is covered without anyone remembering to add it here.
  const core = readdirSync(join(SRC, 'core')).filter((name) => name.endsWith('.ts'));
  assert.ok(core.length > 20, `only ${core.length} core modules found — the sweep is reading the wrong directory`);
  for (const name of core) {
    for (const specifier of imports(readFileSync(join(SRC, 'core', name), 'utf8'))) {
      assert.ok(!specifier.includes('todaysDollars'), `src/core/${name} imports the display gloss`);
      assert.ok(!specifier.includes('/app/'), `src/core/${name} imports an app module`);
    }
  }
  // The other direction, and the positive control for the walker: the gloss itself imports exactly
  // two things, both from `src/core/` — the money type it is doing arithmetic in, and (P4-14) the
  // ONE expression of the price level, which `outcomes.ts` shares so that the floor this module
  // DRAWS and the floor the engine COUNTS against cannot be two curves.
  assert.deepEqual(imports(read('app', 'todaysDollars.ts')), [
    '../core/money.js',
    '../core/priceLevel.js',
    '../core/money.js',
  ]);
  // And `priceLevel.ts` is core, so it may not reach back: the direction of the dependency is the
  // whole of why this is not the ADR-0001 violation it looks like.
  assert.deepEqual(
    imports(readFileSync(join(SRC, 'core', 'priceLevel.ts'), 'utf8')).filter((s) => !s.endsWith('money.js')),
    [],
  );
});

// --- §8 The words on the page ---------------------------------------------------------------------

/**
 * A pin on an EXPLANATION, not on its wording — the same shape `app-settings-panel.test.mjs` uses.
 * Each subject is a name and one or more concept groups; every group must match and any alternative
 * within a group satisfies it. Reworded plainer, this moves nothing; emptied or cut to a stub, the
 * length floor and every subject fail at once. The floor is part of the assertion: without it this
 * degenerates into "some string is present", which is the vacuous pin this repo has shipped before.
 */
const explains = (what, text, subjects, minimum = 120) => {
  assert.equal(typeof text, 'string', `${what} is not a string at all`);
  assert.ok(
    text.trim().length >= minimum,
    `${what} is ${text.trim().length} characters — too short to be the explanation it stands in for`,
  );
  for (const [subject, ...groups] of subjects) {
    for (const alternatives of groups) {
      assert.ok(
        alternatives.some((pattern) => pattern.test(text)),
        `${what} no longer explains ${subject} — nothing in it matches ${alternatives.join(' or ')}`,
      );
    }
  }
};

const NOTICE_SUBJECTS = [
  ['that the figures are in today’s money and what that buys',
    [/today’s money|today's money/i],
    [/would buy|buy if you had|what things cost|compared with what/i]],
  ['that the forecast itself works in the future amounts',
    [/does not work in today’s money|works in the amounts|actually be paid|future year/i],
    [/tax|Age Pension|caps/i]],
  ['that the tax and the pension were worked out on those amounts, not on the converted ones',
    [/worked out on those|then shown here|never the other way/i]],
  ['that the toggle shows the raw amounts',
    [/switch to|toggle/i],
    [/actual future amounts|raw figures/i]],
  ['the rounding residue',
    [/nearest dollar/i],
    [/a dollar differently|add up a dollar|dollar differently/i]],
];

test('THE LAYMAN’S NOTE explains what it has to, and the summary stands on its own', () => {
  explains('the today’s-money notice', TODAYS_MONEY_NOTICE, NOTICE_SUBJECTS, 600);
  explains('the today’s-money summary', TODAYS_MONEY_SUMMARY, [['what it is about', [/today’s money|today's money/i]]], 15);
  // Distinct from each other, and from the one-line basis statements: three different jobs, three
  // different sentences, and a copy-paste of one into another is caught here.
  const all = [TODAYS_MONEY_SUMMARY, TODAYS_MONEY_NOTICE, MONEY_VIEW_BASIS.todaysDollars, MONEY_VIEW_BASIS.futureDollars];
  assert.equal(new Set(all).size, 4);
  assert.ok(!TODAYS_MONEY_NOTICE.includes(MONEY_VIEW_BASIS.todaysDollars));
});

test('NO JARGON — the banned words appear nowhere a person can read them', () => {
  // The user's ruling, by name: not "nominal", not "real terms", not "deflate". A screen that uses
  // them has explained nothing to the person it is for.
  const onScreen = [
    TODAYS_MONEY_SUMMARY,
    TODAYS_MONEY_NOTICE,
    MONEY_VIEW_BASIS.todaysDollars,
    MONEY_VIEW_BASIS.futureDollars,
    MONEY_VIEW_LABELS.todaysDollars,
    MONEY_VIEW_LABELS.futureDollars,
  ];
  for (const text of onScreen) {
    for (const banned of [/\bnominal\b/i, /\breal terms\b/i, /\bdeflat/i, /\bCPI\b/, /\bindexation\b/i, /\breal dollars\b/i]) {
      assert.doesNotMatch(text, banned, `“${text}” uses a word the ruling bans on screen`);
    }
  }
  // The positive control: those words ARE in the module, in its prose, where an engineer reads them
  // — so the sweep above is a fact about the exported strings and not about the whole file.
  const source = read('app', 'todaysDollars.ts');
  assert.match(source, /nominal/i);
});

test('the BASIS is stated on the face of BOTH charts, in BOTH views, always', () => {
  for (const [basis, expected] of [[TODAY, MONEY_VIEW_BASIS.todaysDollars], [FUTURE, MONEY_VIEW_BASIS.futureDollars]]) {
    const subtitle = [...chartConfig(SERIES, basis).options.plugins.subtitle.text];
    assert.equal(subtitle[0], expected, 'the basis is not the first line of the focused chart’s subtitle');
    // Even when the chart has nothing else to say.
    assert.deepEqual([...chartConfig({ ...SERIES, notes: [] }, basis).options.plugins.subtitle.text][0], expected);
  }
  const plan = parsePlan(DEMO_PLAN);
  const comparison = comparisonSeries(plan, scenarioWalks(plan));
  assert.equal([...comparisonChartConfig(comparison, TODAY).options.plugins.subtitle.text][0], MONEY_VIEW_BASIS.todaysDollars);
  assert.equal([...comparisonChartConfig(comparison, FUTURE).options.plugins.subtitle.text][0], MONEY_VIEW_BASIS.futureDollars);
  // The two say different things — a basis line that read the same in both views would state
  // nothing at all, which is the failure mode ADR-0001 is warning about.
  assert.notEqual(MONEY_VIEW_BASIS.todaysDollars, MONEY_VIEW_BASIS.futureDollars);
  // Both are one short line: Chart.js does not wrap a subtitle element, and the budget the two
  // standing notes are held to is 110 characters.
  for (const line of [MONEY_VIEW_BASIS.todaysDollars, MONEY_VIEW_BASIS.futureDollars]) {
    assert.ok(line.length <= 110, `"${line}" is ${line.length} chars`);
    assert.ok(line.trim().length > 0, 'a basis line is empty');
  }
  // P17-6: short by ruling, so the floor is the key phrase each one must still carry.
  assert.match(MONEY_VIEW_BASIS.todaysDollars, /today’s money/);
  assert.match(MONEY_VIEW_BASIS.futureDollars, /actual future amounts/);
});

test('the basis and the note reach the PAGE, not only the config', () => {
  const main = read('app', 'main.ts');
  // The explanation opens from an ⓘ under the chart. The basis line itself is on the face of the
  // chart (its subtitle, pinned in app-chart-config) and in the caption below, NOT repeated under
  // the chart (user, 2026-09-29: it was said twice).
  assert.match(main, /chartNote\.append\(infoButton\(TODAYS_MONEY_SUMMARY, TODAYS_MONEY_NOTICE, 'guide:todays-money-switch'\)\);/);
  // And in the caption at the top of the page, which is the table's only basis statement.
  assert.match(main, /\$\{MONEY_VIEW_BASIS\[moneyView\]\}/);
});

// --- §9 P4-14: THE DRAWN FLOOR AND THE COUNTED FLOOR ARE ONE CURVE ---------------------------------
//
// Until 2026-09-21 they were two. The chart drew the floor as a REAL figure, inflating in the raw
// view; `ChartSeries.belowFloor` and `outcomes.ts`'s `contingencyFloorBreach` compared against the
// flat NOMINAL figure. Neither reached a screen, so nothing contradicted anything — but a shaded
// band drawn from one under a line drawn from the other would have crossed it in different months.
// The user ruled the stated figure REAL and the comparison NOMINAL-to-NOMINAL, and these are the
// assertions that make the two impossible to separate again.

test('P4-14 — the floor the chart DRAWS is, to the cent, the floor the engine COUNTS against', () => {
  // In the RAW view the drawn floor is already nominal, so the two are compared directly, month by
  // month, over the whole 501-month walk. `contingencyFloorAt` is the engine's expression and
  // `chartConfig` is the page's; they share one factor in `core/priceLevel.ts` and that is the only
  // reason this passes.
  const drawn = [...chartConfig(SERIES, FUTURE).data.datasets.find((d) => d.key === 'floor').data];
  const counted = MONTHS.map((month) => contingencyFloorAt(STATED_700K, month.month));
  assert.equal(drawn.length, MONTHS.length);
  assert.deepEqual(drawn, counted);
  // Vacuity control: the curve actually moves, so "they agree" is not "they are both flat".
  assert.ok(new Set(counted).size > 400, 'the counted floor is flat — this comparison proves nothing');

  // In the TODAY'S-MONEY view the drawn floor is flat, and the line it is compared against is the
  // deflated reachable money. Same inequality, both sides divided by the same factor — so the
  // SHADING a renderer would compute from the picture agrees with `belowFloor` in that view too.
  const flat = [...chartConfig(SERIES, TODAY).data.datasets.find((d) => d.key === 'floor').data];
  const reachableToday = [...chartConfig(SERIES, TODAY).data.datasets.find((d) => d.key === 'accessible').data];
  const reachableRaw = [...chartConfig(SERIES, FUTURE).data.datasets.find((d) => d.key === 'accessible').data];
  const belowInTodaysView = reachableToday.map((value, index) => value < flat[index]);
  const belowInRawView = reachableRaw.map((value, index) => value < drawn[index]);
  assert.deepEqual(belowInTodaysView, [...SERIES.belowFloor]);
  assert.deepEqual(belowInRawView, [...SERIES.belowFloor]);
  // And the two views agree with EACH OTHER, which is the thing a user switching the toggle sees:
  // a month cannot be under the floor in one money and over it in the other.
  assert.deepEqual(belowInTodaysView, belowInRawView);
  assert.ok(belowInRawView.some(Boolean) && belowInRawView.some((below) => !below), 'the walk is entirely on one side of the floor');
});

test('P4-14 — and `contingencyFloorBreach` counts the same months the chart would shade', () => {
  // The third reader of the same curve. `monthsToSeries` computes `belowFloor` and `outcomes.ts`
  // computes the breach independently; they agree because they inflate the same stated figure, not
  // because either copies the other.
  const breach = contingencyFloorBreach(MONTHS, DEMO_HOUSEHOLD, STATED_700K);
  assert.equal(SERIES.belowFloor.filter(Boolean).length, breach.monthsBelowFloor);
  assert.equal(MONTHS[SERIES.belowFloor.indexOf(true)].month, breach.firstBreach.month);
  assert.ok(breach.monthsBelowFloor > 0 && breach.monthsBelowFloor < MONTHS.length);
  // The flat-nominal reading — the one this settlement retired — is a DIFFERENT set of months, so
  // the agreement above is a fact about the reading and not a fact that holds either way.
  const flatReading = MONTHS.map((month) => month.accessibleAssets < FLOOR_700K);
  assert.notDeepEqual(flatReading, [...SERIES.belowFloor]);
  assert.ok(
    flatReading.filter(Boolean).length < breach.monthsBelowFloor,
    'a floor that rises with prices must be crossed in MORE months, never fewer',
  );
});
