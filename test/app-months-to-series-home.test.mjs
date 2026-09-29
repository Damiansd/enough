// P7-5 — the home markers, and P7-3 — the months above the assets-test cut-off (2026-09-25).
//
// A home marker is drawn at every month the walk's own `Month.homeStatus` changes, and nowhere else;
// the two two-year exemptions ending are changes of status too, drawn under `'homeExemptionEnds'`.
// Every Household here is synthetic: one Person, no salary, no super, `cpi: 0`.
import test from 'node:test';
import assert from 'node:assert/strict';

import { toCents } from '../dist/core/money.js';
import { project } from '../dist/core/projection.js';
import { DEMO_ENTRIES, DEMO_HOUSEHOLD, DEMO_SETTINGS } from '../dist/app/demoHousehold.js';
import { monthsToSeries } from '../dist/app/monthsToSeries.js';
import { chartConfig, markerCaption } from '../dist/app/chartConfig.js';
import { moneyBasis } from '../dist/app/todaysDollars.js';

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
  economicSeries: { cpi: 0, pblci: 0, awote: 0, mtawe: 0 },
  deemingRates: { lower: 0.0175, upper: 0.0375 },
  nominalReturn: 0.065,
  cashInterestRate: 0,
};

const entry = (id, type, date, params = {}, owner = 'household') => ({
  id, date, owner, type, params, enabled: true, createdAt: '2026-06-01',
});

const SAM = { persons: [person('Sam', '1955-01-01')], homeStatus: 'occupied', openingOffsetBalance: toCents(100_000) };
const HOME_KEYS = new Set(['homeStatus', 'homeExemptionEnds']);

const homeMarkers = (household, entries) => {
  const months = project(SETTINGS, household, entries);
  const series = monthsToSeries(months, household, undefined, undefined, entries);
  return {
    months,
    series,
    drawn: series.markers.filter((marker) => HOME_KEYS.has(marker.key)).map((marker) => [marker.key, marker.month, marker.label]),
  };
};

/** Every month whose status differs from the one before — read off the walk, not off this file. */
const changesOf = (months, household) =>
  months.flatMap((month, index) => {
    const before = index === 0 ? household.homeStatus : (months[index - 1].homeStatus ?? household.homeStatus);
    return (month.homeStatus ?? household.homeStatus) === before ? [] : [month.month];
  });

test('SELL_HOME with nothing set aside: one marker, "Home sold", in the sale month', () => {
  const { months, drawn } = homeMarkers(SAM, [entry('sell', 'SELL_HOME', '2027-03-01', { salePrice: toCents(900_000) })]);
  assert.deepEqual(drawn, [['homeStatus', '2027-03', 'Home sold']]);
  assert.equal(months.find((m) => m.month === '2027-03').homeStatus, 'noHome');
  assert.equal(Object.hasOwn(months.find((m) => m.month === '2027-02'), 'homeStatus'), false, 'a month before the sale carries a status');
  assert.deepEqual(changesOf(months, SAM), ['2027-03']);
});

test('SELL_HOME with money set aside, then BUY_HOME: "Home sold", then "New home bought"', () => {
  const sale = entry('sell', 'SELL_HOME', '2026-11-01', { salePrice: toCents(900_000), newHomeAmount: toCents(700_000) });
  const buy = entry('buy', 'BUY_HOME', '2027-06-01', { purchasePrice: toCents(600_000) });
  const { months, drawn } = homeMarkers(SAM, [sale, buy]);
  assert.deepEqual(drawn, [
    ['homeStatus', '2026-11', 'Home sold'],
    ['homeStatus', '2027-06', 'New home bought'],
  ]);
  assert.equal(months.find((m) => m.month === '2027-05').homeStatus, 'noHomeSaleProceedsExempt');
  assert.equal(months.find((m) => m.month === '2027-06').homeStatus, 'occupied');
});

test('EXEMPTION EXPIRY — money set aside and no home bought: counted from the 24th month after the sale', () => {
  const sale = entry('sell', 'SELL_HOME', '2026-11-01', { salePrice: toCents(900_000), newHomeAmount: toCents(700_000) });
  const { months, drawn } = homeMarkers(SAM, [sale]);
  assert.deepEqual(drawn, [
    ['homeStatus', '2026-11', 'Home sold'],
    ['homeExemptionEnds', '2028-11', 'Money kept for a new home now counted for the Age Pension'],
  ]);
  assert.equal(months.find((m) => m.month === '2028-10').homeStatus, 'noHomeSaleProceedsExempt');
  assert.equal(months.find((m) => m.month === '2028-11').homeStatus, 'noHome');
});

// **SYNTHETIC.** A standalone `RENT_OUT_HOME` is refused by the walk (the rented-out home is
// assessable and this model holds no value for it), and beside an `ENTER_CARE` the care status
// outranks it — so no real walk reaches `rentedOut` today. The status is spliced into a plain walk
// here so the two labels are pinned for the day one does.
test('RENT_OUT_HOME (synthetic status): "Home rented out", then "Home no longer rented out"', () => {
  const plain = project(SETTINGS, SAM, []);
  const months = plain.map((month) => (month.month >= '2027-01' && month.month <= '2027-12' ? { ...month, homeStatus: 'rentedOut' } : month));
  const drawn = monthsToSeries(months, SAM, undefined, undefined)
    .markers.filter((marker) => HOME_KEYS.has(marker.key))
    .map((marker) => [marker.key, marker.month, marker.label]);
  assert.deepEqual(drawn, [
    ['homeStatus', '2027-01', 'Home rented out'],
    ['homeStatus', '2028-01', 'Home no longer rented out'],
  ]);
});

test('ENTER_CARE, single: the home left empty, then — two years on — "Home now counted for the Age Pension"', () => {
  const care = entry('care', 'ENTER_CARE', '2026-11-01', { homeValue: toCents(700_000), radPrice: toCents(500_000), radPaidAsLumpSum: toCents(0) }, 'personA');
  const { months, series, drawn } = homeMarkers(SAM, [care]);
  assert.deepEqual(drawn, [
    ['homeStatus', '2026-11', 'Home left empty — not counted for two years'],
    ['homeExemptionEnds', '2028-11', 'Home now counted for the Age Pension'],
  ]);
  assert.equal(months.find((m) => m.month === '2028-10').homeStatus, 'vacatedWithinTwoYearExemption');
  assert.equal(months.find((m) => m.month === '2028-11').homeStatus, 'vacatedBeyondTwoYearExemption');
  // Every home marker is at a change of the walk's status, and every change has one.
  assert.deepEqual(drawn.map(([, month]) => month), changesOf(months, SAM));
  // Its index addresses its month, and its caption carries the Person's age like every other rule.
  const expiry = series.markers.find((marker) => marker.key === 'homeExemptionEnds');
  assert.equal(series.months[expiry.index], '2028-11');
  assert.equal(markerCaption(expiry), '2028-11 (Sam 73)');
});

test('the chart draws the home rules with their plain-English labels and a colour each', () => {
  const care = entry('care', 'ENTER_CARE', '2026-11-01', { homeValue: toCents(700_000), radPrice: toCents(500_000), radPaidAsLumpSum: toCents(0) }, 'personA');
  const { series } = homeMarkers(SAM, [care]);
  const config = chartConfig(series, moneyBasis('futureDollars', SETTINGS));
  const home = config.markers.filter((marker) => HOME_KEYS.has(marker.key));
  assert.deepEqual(home.map((marker) => marker.label), ['Home left empty — not counted for two years', 'Home now counted for the Age Pension']);
  assert.notEqual(home[0].colour, home[1].colour);
  for (const marker of home) assert.equal(config.data.labels[marker.index], marker.month);
});

test('A PLAN WITH NO HOME ENTRY gets no home marker, and the demo walk carries no home status at all', () => {
  assert.deepEqual(homeMarkers(SAM, []).drawn, []);
  const months = project(DEMO_SETTINGS, DEMO_HOUSEHOLD, DEMO_ENTRIES);
  assert.equal(months.some((month) => Object.hasOwn(month, 'homeStatus')), false);
  const series = monthsToSeries(months, DEMO_HOUSEHOLD, undefined, DEMO_SETTINGS.economicSeries.agePension, DEMO_ENTRIES);
  // Only the two Age Pension age rules (one per Person) — no home marker.
  assert.deepEqual(series.markers.map((marker) => marker.key), ['agePensionAge', 'agePensionAge']);
});

// --- P7-3: the months above the cut-off ------------------------------------------------------------

const DEMO_MONTHS = project(DEMO_SETTINGS, DEMO_HOUSEHOLD, DEMO_ENTRIES);
const DEMO_SERIES = monthsToSeries(DEMO_MONTHS, DEMO_HOUSEHOLD, undefined, DEMO_SETTINGS.economicSeries.agePension);
const over = (month) => month.assetsTestThresholds !== undefined && month.assessableAssets > month.assetsTestThresholds.noPensionAbove;

test('ABOVE THE CUT-OFF — flagged in exactly the months the assessable figure is over "No pension above"', () => {
  assert.deepEqual([...DEMO_SERIES.aboveCutOff], DEMO_MONTHS.map(over));
  const flagged = DEMO_MONTHS.filter(over).map((month) => month.month);
  assert.equal(flagged.length, 28, 'the demo walk no longer crosses the cut-off — this test proves less');
  assert.equal(flagged[0], '2031-06');
  assert.equal(flagged.at(-1), '2033-09');
});

test('ABOVE THE CUT-OFF — the shading is the assessable band itself in those months and a gap in every other, filled to the cut-off line', () => {
  for (const view of ['todaysDollars', 'futureDollars']) {
    const config = chartConfig(DEMO_SERIES, moneyBasis(view, DEMO_SETTINGS));
    const datasets = config.data.datasets;
    const at = datasets.findIndex((dataset) => dataset.key === 'aboveCutOff');
    const shade = datasets[at];
    assert.equal(shade.fill, '-1');
    assert.equal(datasets[at - 1].key, 'noPensionAbove', 'the shading fills down to something other than the cut-off');
    const assessable = datasets.find((dataset) => dataset.key === 'assessable').data;
    const cutOff = datasets[at - 1].data;
    shade.data.forEach((value, index) => {
      if (DEMO_SERIES.aboveCutOff[index]) {
        assert.equal(value, assessable[index], `${DEMO_SERIES.months[index]}: the shading is not the band's own figure`);
        assert.ok(value > cutOff[index], `${DEMO_SERIES.months[index]}: shaded but not above the cut-off`);
      } else {
        assert.equal(value, null, `${DEMO_SERIES.months[index]} is shaded while under the cut-off`);
      }
    });
    assert.equal(shade.data.filter((value) => value !== null).length, 28);
  }
});

test('ABOVE THE CUT-OFF — a walk that never crosses it carries no flag and no shading', () => {
  const series = monthsToSeries(project(SETTINGS, SAM, []), SAM, undefined, undefined);
  assert.equal(Object.hasOwn(series, 'aboveCutOff'), false);
  const config = chartConfig(series, moneyBasis('futureDollars', SETTINGS));
  assert.equal(config.data.datasets.some((dataset) => dataset.key === 'aboveCutOff'), false);
});
