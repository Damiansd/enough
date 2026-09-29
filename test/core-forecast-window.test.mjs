// P4-1b part (B) — **the forecast window, named**, and the two things naming it has to preserve.
//
// The window is not new behaviour: `project()` has always walked from `asAtDate`'s month to the
// Planning Horizon month and always refused an entry dated past it. What is new is that the boundary
// is a VALUE, with one producer, that a module outside the walk can read — which is what lets
// `transferBalanceAccountSettings.ts` corroborate a stated account start day against it instead of
// declaring the check impossible.
//
// So the tests here are about two risks, and neither is arithmetic:
//   * the window disagreeing with the walk it was extracted from (every figure below is checked
//     against `project()`'s own output, not against a number typed out here); and
//   * the horizon coming from the wrong Person, which a couple born in the same decade would hide.
//     The fixture couple are twelve years and seven months apart, so "the LATER of the two" is
//     151 months wide.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { toCents } from '../dist/core/money.js';
import {
  assertIsoMonth,
  dayFallsInsideForecast,
  dayPrecedesForecast,
  forecastWindow,
  horizonMonth,
  monthOf,
} from '../dist/core/forecastWindow.js';
import * as projection from '../dist/core/projection.js';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SOURCE = readFileSync(join(ROOT, 'src', 'core', 'forecastWindow.ts'), 'utf8');

const person = (name, dateOfBirth) => ({
  name,
  dateOfBirth,
  superInterests: [],
  parcels: [],
  employmentIncomePerFortnight: toCents(0),
  workBonusBalance: toCents(0),
});

// A born 1962-04-17, B born 1974-11-02 — twelve years and seven months apart.
const HOUSEHOLD = Object.freeze({
  persons: Object.freeze([person('A', '1962-04-17'), person('B', '1974-11-02')]),
  homeStatus: 'occupied',
});

const SETTINGS = Object.freeze({
  asAtDate: '2026-09-16',
  planningHorizonAge: 100,
  economicSeries: Object.freeze({ cpi: 0.025, pblci: 0.025, awote: 0.035, mtawe: 0.035 }),
  deemingRates: Object.freeze({ lower: 0.0175, upper: 0.0375 }),
  nominalReturn: 0.065,
});

test('the window carries the first DAY, the first month and the last month, each hand-worked', () => {
  const window = forecastWindow(SETTINGS, HOUSEHOLD);
  // The first day is `asAtDate` itself and nothing else: there is no rounding to the 1st here,
  // because a stated day is before the forecast or inside it by the DAY (the month cannot say).
  assert.equal(window.firstDay, '2026-09-16');
  assert.equal(window.firstMonth, '2026-09');
  // B is the younger, so the horizon is B's hundredth birthday — 2 November 2074 — and the month
  // containing it is emitted (inclusive). A's would be 2062-04 — 151 months, twelve years and seven
  // months, short.
  assert.equal(window.lastMonth, '2074-11');
  assert.notEqual(window.lastMonth, '2062-04');
  assert.ok(Object.isFrozen(window));
});

test('the LATER of the two Persons decides the horizon, whichever order they are listed in', () => {
  // The mutation this is written against: taking `persons[0]`, or the earliest birthday, instead of
  // the latest. Both are a window 151 months short and both leave the younger partner unmodelled for
  // the twelve years a retirement plan is most likely to fail in.
  const reversed = { persons: [HOUSEHOLD.persons[1], HOUSEHOLD.persons[0]], homeStatus: 'occupied' };
  assert.equal(horizonMonth(SETTINGS, HOUSEHOLD), '2074-11');
  assert.equal(horizonMonth(SETTINGS, reversed), '2074-11');
  assert.equal(horizonMonth(SETTINGS, { persons: [HOUSEHOLD.persons[0]] }), '2062-04');
  assert.equal(horizonMonth(SETTINGS, { persons: [HOUSEHOLD.persons[1]] }), '2074-11');
  // 2062-04 → 2074-11 is 151 months (twelve years and seven months), a length of walk not a label.
  const months = (from, to) =>
    (Number(to.slice(0, 4)) - Number(from.slice(0, 4))) * 12 + (Number(to.slice(5, 7)) - Number(from.slice(5, 7)));
  assert.equal(months('2062-04', '2074-11'), 151);
  assert.equal(12 * 12 + 7, 151);
});

test('the window IS the walk: `project()` starts and ends exactly where the window says', () => {
  // The vacuity control for everything above — a window that agreed with itself and not with the
  // engine would be the second boundary the whole extraction exists to prevent.
  const window = forecastWindow(SETTINGS, HOUSEHOLD);
  const months = projection.project(SETTINGS, HOUSEHOLD, []).map((m) => m.month);
  assert.equal(months[0], window.firstMonth);
  assert.equal(months[months.length - 1], window.lastMonth);
  assert.ok(months.length > 500, `only ${months.length} months walked`);
});

test('`monthOf` and `assertIsoMonth` moved here and are the SAME functions `projection.ts` exports', () => {
  // The move is a relocation and not a fork: identity, not merely equal behaviour. A second copy
  // living on in `projection.ts` is exactly how two spellings of a month guard start to disagree.
  assert.equal(projection.monthOf, monthOf);
  assert.equal(projection.assertIsoMonth, assertIsoMonth);
  assert.equal(projection.horizonMonth, horizonMonth);
  assert.equal(projection.forecastWindow, forecastWindow);
  assert.equal(monthOf('2026-09-16'), '2026-09');
  assert.throws(() => assertIsoMonth('2026-9'), /not a zero-padded ISO month/);
  assert.throws(() => monthOf('2026-9-16'), /not a zero-padded ISO date/);
});

test('before and inside PARTITION the days: the first day is inside the forecast, not before it', () => {
  const window = forecastWindow(SETTINGS, HOUSEHOLD);
  assert.equal(dayPrecedesForecast(window, '2026-09-15'), true);
  assert.equal(dayPrecedesForecast(window, '2026-09-16'), false); // the boundary, and it is exclusive
  assert.equal(dayFallsInsideForecast(window, '2026-09-16'), true);
  assert.equal(dayFallsInsideForecast(window, '2026-09-15'), false);
  // No day is both, and no day up to the horizon is neither.
  for (const day of ['2017-07-01', '2026-09-15', '2026-09-16', '2026-09-30', '2040-01-01', '2074-11-30']) {
    assert.notEqual(dayPrecedesForecast(window, day), dayFallsInsideForecast(window, day), day);
  }
  // Past the horizon a day is neither before the window nor inside it — the third state, and it is
  // why `dayFallsInsideForecast` is not spelled `!dayPrecedesForecast`.
  assert.equal(dayPrecedesForecast(window, '2074-12-01'), false);
  assert.equal(dayFallsInsideForecast(window, '2074-12-01'), false);
  // The horizon month is inclusive to its last day, which is the ruling `horizonMonth` records.
  assert.equal(dayFallsInsideForecast(window, '2074-11-01'), true);
  assert.equal(dayFallsInsideForecast(window, '2074-11-30'), true);
  // A malformed day is refused rather than string-compared: '2026-9-16' sorts after '2026-09-16'.
  assert.throws(() => dayPrecedesForecast(window, '2026-9-16'), /not a zero-padded ISO date/);
});

test('CANARY — the window module reads no clock either, and states the two rulings it inherited', () => {
  const executable = SOURCE.split('\n')
    .filter((line) => {
      const t = line.trimStart();
      return !t.startsWith('//') && !t.startsWith('*') && !t.startsWith('/*');
    })
    .join('\n');
  assert.match(executable, /export const forecastWindow =/, 'the comment filter removed the module itself');
  assert.ok(executable.length > 500, `the filter left only ${executable.length} characters`);
  assert.equal(/\bDate\b/.test(executable), false, 'the window mentions Date — this is string arithmetic');
  // The two judgment calls travelled with the code they belong to, rather than being left behind in
  // `projection.ts` where the function no longer is.
  assert.match(SOURCE, /The later of the two, not the earlier/);
  assert.match(SOURCE, /Inclusive.\*? The month containing the hundredth birthday is emitted/);
  // And the reason this is a module of its own is recorded, because part (A) is the thing that would
  // otherwise re-merge it into `projection.ts` and discover the cycle.
  assert.match(SOURCE, /Exporting the window from `projection.ts` would make\n\/\/ that join a cycle/);
});
