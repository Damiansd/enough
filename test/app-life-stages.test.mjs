// P16-1 — the "Life stages" strip's pure half: `lifeStagesTimeline` reads the walk plus the entries
// and derives Working / Retired / In aged care per Person, with nothing new stored in the plan file.
// The renderer is `app-render-life-stages.test.mjs`.
import test from 'node:test';
import assert from 'node:assert/strict';

import { toCents } from '../dist/core/money.js';
import { priceLevelFactor } from '../dist/core/priceLevel.js';
import { project } from '../dist/core/projection.js';
import { ageAt } from '../dist/core/household.js';
import { firstDayOf } from '../dist/core/projection.js';
import { lifeStagesTimeline, enterCareMonths } from '../dist/app/lifeStages.js';
import { DEMO_PLAN } from '../dist/app/demoHousehold.js';

const C = (n) => toCents(n);

const person = (over) => ({
  name: 'X',
  dateOfBirth: '1970-01-01',
  superInterests: [],
  parcels: [],
  employmentIncomePerFortnight: C(0),
  workBonusBalance: C(0),
  ...over,
});

const SETTINGS = (over = {}) => ({
  asAtDate: '2026-01-01',
  planningHorizonAge: 80,
  economicSeries: { cpi: 0.025, pblci: 0.025, awote: 0, mtawe: 0.035 },
  deemingRates: { lower: 0.0175, upper: 0.0375 },
  nominalReturn: 0.065,
  cashInterestRate: 0,
  ...over,
});

const entry = (id, type, date, params = {}, owner = 'household') => ({
  id,
  date,
  owner,
  type,
  params,
  enabled: true,
  createdAt: '2025-01-01',
});

// --- 1. THE DEMO COUPLE: one retires, the other never does -----------------------------------------

test('the demo couple: Dana retires and Ash stays Working to the horizon', () => {
  const months = project(DEMO_PLAN.settings, DEMO_PLAN.household, DEMO_PLAN.entries);
  const timeline = lifeStagesTimeline(months, DEMO_PLAN.household, DEMO_PLAN.entries);

  assert.equal(timeline.totalMonths, months.length);
  assert.equal(timeline.persons.length, 2);
  const [dana, ash] = timeline.persons;

  assert.equal(dana.name, 'Dana');
  assert.equal(dana.segments.length, 2);
  assert.equal(dana.segments[0].phase, 'working');
  assert.equal(dana.segments[0].fromIndex, 0);
  assert.equal(dana.segments[1].phase, 'retired');
  assert.equal(dana.segments[1].toIndex, months.length);
  assert.equal(dana.segments[0].toIndex, dana.segments[1].fromIndex, 'the two segments must meet with no gap and no overlap');
  assert.equal(dana.boundaries.length, 1);
  const retireMonth = months[dana.segments[0].toIndex].month;
  const retireAge = ageAt('1968-05-14', firstDayOf(retireMonth));
  assert.equal(dana.boundaries[0].label, `Retires ${retireMonth.slice(0, 4)} · ${retireAge}`);
  assert.equal(dana.diedAtIndex, undefined);
  assert.equal(dana.endLabel, undefined);

  assert.equal(ash.name, 'Ash');
  assert.equal(ash.segments.length, 1, 'Ash never retires, so there is exactly one segment');
  assert.equal(ash.segments[0].phase, 'working');
  assert.equal(ash.segments[0].fromIndex, 0);
  assert.equal(ash.segments[0].toIndex, months.length, 'a Person who never retires stays Working to the horizon');
  assert.equal(ash.boundaries.length, 0);

  // The light year axis brackets the walk.
  assert.ok(timeline.yearTicks.length >= 2);
  assert.equal(timeline.yearTicks[0].atIndex, 0);
  assert.equal(timeline.yearTicks.at(-1).atIndex, months.length - 1);
});

// --- 2. A DEATH ends that Person's row, and it is labelled -----------------------------------------

test('a DEATH ends that Person\'s row, labelled, and does not touch the survivor', () => {
  const household = { persons: [person({ name: 'Ren' }), person({ name: 'Sky' })], homeStatus: 'occupied' };
  const entries = [
    entry('r1', 'RETIRE', '2030-01-01', {}, 'personA'),
    entry('d1', 'DEATH', '2033-06-01', {}, 'personB'),
  ];
  const months = project(SETTINGS(), household, entries);
  const timeline = lifeStagesTimeline(months, household, entries);
  const [ren, sky] = timeline.persons;

  // Ren (personA) retires and lives to the horizon — untouched by Sky's death.
  assert.equal(ren.segments.at(-1).toIndex, months.length);
  assert.equal(ren.diedAtIndex, undefined);
  assert.equal(ren.endLabel, undefined);

  // Sky (personB) dies in 2033-06, and the row stops there.
  const deathIndex = months.findIndex((month) => month.month === '2033-06');
  assert.ok(deathIndex > 0);
  assert.equal(sky.diedAtIndex, deathIndex);
  assert.equal(sky.segments.at(-1).toIndex, deathIndex, 'the row must not extend past the month of death');
  assert.ok(sky.segments.every((segment) => segment.toIndex <= deathIndex));
  const deathAge = ageAt(household.persons[1].dateOfBirth, firstDayOf('2033-06'));
  assert.equal(sky.endLabel, `Died 2033 · ${deathAge}`);
  // "Died" is carried on `endLabel`, never mixed into the ordinary boundary list.
  assert.ok(sky.boundaries.every((boundary) => !boundary.label.startsWith('Died')));
});

// --- 3. NEVER RETIRING: Working, unbroken, to the horizon -------------------------------------------

test('a Person with no RETIRE entry at all stays Working, one unbroken segment, to the horizon', () => {
  const household = { persons: [person({ name: 'Nomi' })], homeStatus: 'occupied' };
  const months = project(SETTINGS(), household, []);
  const timeline = lifeStagesTimeline(months, household, []);
  const [nomi] = timeline.persons;

  assert.deepEqual(nomi.segments, [{ phase: 'working', fromIndex: 0, toIndex: months.length }]);
  assert.equal(nomi.boundaries.length, 0);
  assert.equal(nomi.diedAtIndex, undefined);
});

// --- 4. A COUPLE WHERE ONLY ONE ENTERS CARE: the other gets no care segment at all ------------------

test('only one of a couple enters care: the other Person has no care segment', () => {
  const household = { persons: [person({ name: 'Alex', dateOfBirth: '1955-03-01' }), person({ name: 'Blair', dateOfBirth: '1955-09-01' })], homeStatus: 'occupied' };
  // `radPrice`/`radPaidAsLumpSum` are stated in TODAY's money and raised to the entry's own day
  // (user ruling, 2026-09-25) — this fixture has no super and no income once both retire, so the
  // $300,000 the household can actually fund from six years of Age Pension is the NOMINAL figure at
  // 2032-04; the stated (today's-money) figure is `priceLevelFactor`'s own inverse of that.
  const radStated = Math.round(300_000 / priceLevelFactor(0.025, '2026-01-01', '2032-04'));
  const entries = [
    entry('r1', 'RETIRE', '2026-06-01', {}, 'personA'),
    entry('r2', 'RETIRE', '2026-06-01', {}, 'personB'),
    entry('ec', 'ENTER_CARE', '2032-04-01', { homeValue: C(900_000), radPrice: C(radStated), radPaidAsLumpSum: C(radStated) }, 'personA'),
  ];
  const months = project(SETTINGS({ planningHorizonAge: 90 }), household, entries);
  const timeline = lifeStagesTimeline(months, household, entries);
  const [alex, blair] = timeline.persons;

  const careMonths = enterCareMonths(months, household, entries);
  assert.equal(careMonths[0], '2032-04');
  assert.equal(careMonths[1], undefined);

  assert.ok(alex.segments.some((segment) => segment.phase === 'care'), 'Alex must show a care segment');
  assert.equal(alex.segments.at(-1).phase, 'care');
  assert.equal(alex.segments.at(-1).toIndex, months.length);
  assert.ok(alex.boundaries.some((boundary) => boundary.label.startsWith('Aged care 2032')));

  assert.ok(!blair.segments.some((segment) => segment.phase === 'care'), 'Blair has no ENTER_CARE and must show no care segment');
  assert.equal(blair.segments.at(-1).phase, 'retired');
  assert.equal(blair.segments.at(-1).toIndex, months.length);
});

// --- 5. CARE BEFORE A LATER STATED RETIRE: transitions are chronological, never assumed -------------

test('entering care before a later stated RETIRE date is read in chronological order', () => {
  const household = { persons: [person({ name: 'Cam' })], homeStatus: 'occupied' };
  const entries = [
    entry('ec', 'ENTER_CARE', '2028-02-01', { homeValue: C(0), radPrice: C(100_000), radPaidAsLumpSum: C(0) }, 'personA'),
    entry('r1', 'RETIRE', '2031-01-01', {}, 'personA'),
  ];
  const months = project(SETTINGS(), household, entries);
  const timeline = lifeStagesTimeline(months, household, entries);
  const [cam] = timeline.persons;

  // Working, then care from 2028-02 onward — the RETIRE dated afterwards changes nothing this strip
  // draws, because entering care already ended the phase that could have transitioned to Retired.
  assert.equal(cam.segments[0].phase, 'working');
  const careIndex = months.findIndex((month) => month.month === '2028-02');
  assert.equal(cam.segments[0].toIndex, careIndex);
  assert.equal(cam.segments[1].phase, 'care');
  assert.equal(cam.segments[1].fromIndex, careIndex);
  assert.equal(cam.segments[1].toIndex, months.length);
  assert.equal(cam.boundaries.length, 1);
  assert.ok(cam.boundaries[0].label.startsWith('Aged care 2028'));
});

// --- 6. BACK AT WORK after a Retire (retire flow S3, 2026-09-29) ------------------------------------

test('a return to work turns the row Working again, and a later Retire marks it retired again', () => {
  // The demo couple, Dana stopping at 59 in 2028, back at work in 2030, and stopping on the demo's
  // own Retire in 2031. Dana's one account switches at that second stop (the first freed nothing).
  const entries = [
    ...DEMO_PLAN.entries,
    entry('early', 'RETIRE', '2028-01-01', {}, 'personA'),
    entry('back', 'WORK_PATTERN_CHANGE', '2030-01-01', { daysPerWeek: 3, annualSalary: C(40_000) }, 'personA'),
  ];
  const months = project(DEMO_PLAN.settings, DEMO_PLAN.household, entries);
  const [dana] = lifeStagesTimeline(months, DEMO_PLAN.household, entries).persons;
  assert.deepEqual(dana.segments.map((segment) => segment.phase), ['working', 'retired', 'working', 'retired']);
  assert.deepEqual(dana.boundaries.map((boundary) => boundary.label), ['Retires 2028 · 59', 'Back at work 2030 · 61', 'Retires again 2031 · 62']);
  const index = (month) => months.findIndex((each) => each.month === month);
  assert.deepEqual(dana.boundaries.map((boundary) => boundary.atIndex), [index('2028-01'), index('2030-01'), index('2031-05')]);
  // The strip follows the walk: salary in the Working segments only.
  const paid = months.map((month, i) => [i, month.lines.some((line) => line.description === 'Salary, Dana')]);
  for (const segment of dana.segments) {
    for (const [i, earns] of paid.filter(([i]) => i > segment.fromIndex && i < segment.toIndex - 1)) {
      assert.equal(earns, segment.phase === 'working', `month ${months[i].month} in a ${segment.phase} segment`);
    }
  }
});

test('a stop and a return both before the plan starts show the row Working from the start, with no label', () => {
  const household = { persons: [person({ name: 'Pat', dateOfBirth: '1962-01-01', employmentIncomePerFortnight: C(2_000), superInterests: [{ phase: 'accumulation', balance: C(100_000), keepInAccumulationAtRetirement: true }] })], homeStatus: 'occupied' };
  const entries = [
    entry('r', 'RETIRE', '2023-01-01', {}, 'personA'),
    entry('w', 'WORK_PATTERN_CHANGE', '2024-01-01', { daysPerWeek: 2, annualSalary: C(30_000) }, 'personA'),
  ];
  const months = project(SETTINGS(), household, entries);
  const [pat] = lifeStagesTimeline(months, household, entries).persons;
  assert.deepEqual(pat.segments.map((segment) => segment.phase), ['working']);
  assert.deepEqual(pat.boundaries, []);
});
