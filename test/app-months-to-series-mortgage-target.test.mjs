// P3-16a microtask 3 — **the `'mortgageTarget'` marker**, wired into `monthsToSeries.ts` on
// `'mortgagePayoff'`'s exact per-scenario pattern (not the comparison-scoped mechanism P6-8 built
// the same day — see the gate). The comparison itself is `core-mortgage-target.test.mjs`; this is
// only the chart-facing half: does the right month get a marker, and does the wrong one get none.
//
// **Every walk here is hand-worked and short**, on `core-mortgage-payoff.test.mjs`'s own precedent:
// an eight-month walk from an interest-free household, so every month and every index can be
// checked by counting rather than trusting the engine.
import test from 'node:test';
import assert from 'node:assert/strict';

import { toCents } from '../dist/core/money.js';
import { project } from '../dist/core/projection.js';
import { monthsToSeries, MARKER_LABELS } from '../dist/app/monthsToSeries.js';

const person = (name, dateOfBirth) => ({
  name,
  dateOfBirth,
  superInterests: [],
  parcels: [],
  employmentIncomePerFortnight: toCents(0),
  workBonusBalance: toCents(0),
});

/** An eight-month walk, 2026-09 to 2027-04 — Val turns 72 (the planning horizon) in 2027-04. */
const SETTINGS = {
  asAtDate: '2026-09-16',
  planningHorizonAge: 72,
  economicSeries: { cpi: 0.025, pblci: 0.025, awote: 0.035, mtawe: 0.035 },
  deemingRates: { lower: 0.0175, upper: 0.0375 },
  nominalReturn: 0.065,
};

const HOUSEHOLD = Object.freeze({ persons: [person('Val', '1955-04-17')], homeStatus: 'occupied' });

const entry = (id, type, date, params, owner = 'household') => ({
  id,
  date,
  owner,
  type,
  params,
  enabled: true,
  createdAt: '2026-06-01',
});

const spend = (annual) => entry('sc', 'SPEND_CHANGE', '2026-09-01', { annualSpend: toCents(annual) });
const retire = (id, date, owner = 'personA') => entry(id, 'RETIRE', date, {}, owner);
const target = (id, date, enabled = true) => ({ ...entry(id, 'MORTGAGE_TARGET', date, {}), enabled });

const walk = (entries) => project(SETTINGS, HOUSEHOLD, [spend(60_000), ...entries]);
const series = (months, entries) => monthsToSeries(months, HOUSEHOLD, undefined, undefined, entries);

test('a MORTGAGE_TARGET dated inside the walk, after the retirement it is compared with, draws its own marker', () => {
  const entries = [retire('r1', '2026-11-01'), target('t1', '2027-01-15')];
  const months = walk(entries);
  const drawn = series(months, entries);
  const targetMarkers = drawn.markers.filter((m) => m.key === 'mortgageTarget');
  assert.equal(targetMarkers.length, 1);
  const marker = targetMarkers[0];
  assert.equal(marker.month, '2027-01');
  assert.equal(months[marker.index].month, '2027-01', 'the index does not point at the month it names');
  assert.equal(marker.label, MARKER_LABELS.mortgageTarget);
  assert.deepEqual(marker.ages.map((a) => a.name), ['Val']);
});

test('a MORTGAGE_TARGET dated BEFORE asAtDate draws no marker at all — off the left edge, not an error', () => {
  const entries = [retire('r1', '2026-11-01'), target('early', '2026-06-01')];
  const months = walk(entries);
  const drawn = series(months, entries);
  assert.deepEqual(drawn.markers.filter((m) => m.key === 'mortgageTarget'), []);
});

test('a DISABLED MORTGAGE_TARGET draws no marker — ADR-0002s append-only-safe-delete', () => {
  const entries = [retire('r1', '2026-11-01'), target('off', '2027-01-15', false)];
  const months = walk(entries);
  const drawn = series(months, entries);
  assert.deepEqual(drawn.markers.filter((m) => m.key === 'mortgageTarget'), []);
});

test('two MORTGAGE_TARGET entries draw two markers, each at its own month', () => {
  const entries = [retire('r1', '2026-11-01'), target('t1', '2026-10-01'), target('t2', '2027-02-01')];
  const months = walk(entries);
  const drawn = series(months, entries);
  const targetMarkers = drawn.markers.filter((m) => m.key === 'mortgageTarget');
  assert.equal(targetMarkers.length, 2);
  assert.deepEqual(targetMarkers.map((m) => m.month), ['2026-10', '2027-02']);
});

test('a caller that passes no `entries` at all draws no mortgageTarget marker — the trailing default', () => {
  const entries = [retire('r1', '2026-11-01'), target('t1', '2027-01-15')];
  const months = walk(entries);
  const drawn = monthsToSeries(months, HOUSEHOLD, undefined, undefined);
  assert.deepEqual(drawn.markers.filter((m) => m.key === 'mortgageTarget'), []);
});

test('a plan with no MORTGAGE_TARGET entries at all is byte-identical to one with an empty entries list', () => {
  const entries = [retire('r1', '2026-11-01')];
  const months = walk(entries);
  assert.deepEqual(series(months, entries), series(months, []));
});
