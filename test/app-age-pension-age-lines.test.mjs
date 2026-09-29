// The Age Pension age lines on the wealth chart — one per Person, never only the eldest, at the FIRST
// walk month whose first day `hasReachedAgePensionAge` says yes to (the engine's own predicate and
// date convention), with a note for every Person who gets no line. Focused chart: a marker keyed
// `agePensionAge`. Compare chart: bare rules in the same grey, named with dates in one subtitle note.
//
// The fixture is the demo couple, whose ages differ by eight years: Dana (born 1968-05-14) turns 67
// on 2035-05-14, so her first month is 2035-06; Ash (born 1960-02-09) turns 67 on 2027-02-09, so his
// is 2027-03.
import test from 'node:test';
import assert from 'node:assert/strict';
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { project, firstDayOf } from '../dist/core/projection.js';
import { AGE_PENSION_AGE, hasReachedAgePensionAge } from '../dist/core/household.js';
import { parsePlan } from '../dist/core/parsePlan.js';
import { DEMO_ENTRIES, DEMO_HOUSEHOLD, DEMO_PLAN, DEMO_SETTINGS } from '../dist/app/demoHousehold.js';
import {
  agePensionAgeAlreadyNote,
  agePensionAgeLines,
  agePensionAgeNeverNote,
  monthsToSeries,
} from '../dist/app/monthsToSeries.js';
import { AGE_PENSION_AGE_COLOUR, THRESHOLD_COLOURS, chartConfig } from '../dist/app/chartConfig.js';
import { scenarioWalks } from '../dist/app/scenarioWalks.js';
import { comparisonSeries } from '../dist/app/comparisonSeries.js';
import {
  AGE_PENSION_AGE_RULE_SCENARIO_ID,
  CROSSOVER_RULE_COLOUR,
  comparisonChartConfig,
} from '../dist/app/comparisonConfig.js';
import { SCENARIO_COLOURS } from '../dist/app/scenarioStyle.js';
import { moneyBasis } from '../dist/app/todaysDollars.js';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const FUTURE = moneyBasis('futureDollars', DEMO_SETTINGS);
const MONTHS = project(DEMO_SETTINGS, DEMO_HOUSEHOLD, DEMO_ENTRIES);
const SERIES = monthsToSeries(MONTHS, DEMO_HOUSEHOLD, undefined, DEMO_SETTINGS.economicSeries.agePension, DEMO_ENTRIES);
const agePensionMarkers = (series) => series.markers.filter((marker) => marker.key === 'agePensionAge');

/** Straight off the engine's predicate, on the engine's date: the first month it says yes to. */
const firstEligible = (months, person) => months.findIndex((month) => hasReachedAgePensionAge(person, firstDayOf(month.month)));

test('ONE LINE PER PERSON, in household order, each at the first month the engine counts them of age', () => {
  const markers = agePensionMarkers(SERIES);
  assert.deepEqual(
    markers.map((marker) => [marker.label, marker.month]),
    [['Age Pension age — Dana', '2035-06'], ['Age Pension age — Ash', '2027-03']],
    'every Person gets a line — never only the eldest',
  );
  DEMO_HOUSEHOLD.persons.forEach((person, personIndex) => {
    const marker = markers[personIndex];
    const expected = firstEligible(MONTHS, person);
    assert.equal(marker.index, expected, `${person.name}'s line is ${marker.index - expected} months off the engine`);
    assert.equal(marker.month, MONTHS[expected].month);
    assert.equal(hasReachedAgePensionAge(person, firstDayOf(MONTHS[marker.index].month)), true);
    assert.equal(hasReachedAgePensionAge(person, firstDayOf(MONTHS[marker.index - 1].month)), false, 'the line is late');
  });
  // The rules fall inside the walk, so nothing is explained away for either Person.
  assert.equal(SERIES.notes.some((note) => note.includes('Age Pension age')), false);
});

test('focused chart: drawn like the other markers, in a colour no other line on either chart uses', () => {
  const config = chartConfig(SERIES, FUTURE);
  const drawn = config.markers.filter((marker) => marker.key === 'agePensionAge');
  assert.equal(drawn.length, 2);
  for (const marker of drawn) assert.equal(marker.colour, AGE_PENSION_AGE_COLOUR);
  const otherKeys = ['shortfall', 'pensionOnly', 'mortgagePayoff', 'mortgageTarget', 'homeStatus', 'homeExemptionEnds'];
  const template = agePensionMarkers(SERIES)[0];
  const otherColours = chartConfig({ ...SERIES, markers: otherKeys.map((key) => ({ ...template, key })) }, FUTURE).markers.map(
    (marker) => marker.colour,
  );
  const taken = [...otherColours, CROSSOVER_RULE_COLOUR, ...Object.values(THRESHOLD_COLOURS), ...SCENARIO_COLOURS];
  assert.ok(!taken.map((colour) => colour.toLowerCase()).includes(AGE_PENSION_AGE_COLOUR.toLowerCase()));
});

test('a Person already at or over the age when the walk starts gets NO line and a NOTE naming them', () => {
  const household = { ...DEMO_HOUSEHOLD, persons: [DEMO_HOUSEHOLD.persons[0], { ...DEMO_HOUSEHOLD.persons[1], dateOfBirth: '1950-02-09' }] };
  const series = monthsToSeries(project(DEMO_SETTINGS, household, DEMO_ENTRIES), household, undefined, DEMO_SETTINGS.economicSeries.agePension, DEMO_ENTRIES);
  assert.deepEqual(agePensionMarkers(series).map((marker) => marker.label), ['Age Pension age — Dana']);
  assert.ok(series.notes.includes(agePensionAgeAlreadyNote('Ash')), 'Ash is left off the chart without a word');
  assert.match(agePensionAgeAlreadyNote('Ash'), /^Ash is already at or over Age Pension age/);
});

test('a Person who never reaches the age inside the walk gets NO line and a NOTE naming them', () => {
  const short = MONTHS.slice(0, 60);
  const series = monthsToSeries(short, DEMO_HOUSEHOLD, undefined, DEMO_SETTINGS.economicSeries.agePension, DEMO_ENTRIES);
  assert.deepEqual(agePensionMarkers(series).map((marker) => marker.label), ['Age Pension age — Ash']);
  assert.ok(series.notes.includes(agePensionAgeNeverNote('Dana')), 'Dana is left off the chart without a word');
});

test('compare chart: ONE bare grey rule per Person across all scenarios, named with dates in one subtitle note', () => {
  const list = [
    { id: 'baseline', name: 'Baseline', parentId: null, entryIds: DEMO_PLAN.entries.map((entry) => entry.id) },
    { id: 'fork', name: 'Fork', parentId: 'baseline', entryIds: [] },
  ];
  const plan = parsePlan(JSON.parse(JSON.stringify({ ...DEMO_PLAN, scenarios: list, activeScenarioId: 'baseline' })));
  const series = comparisonSeries(plan, scenarioWalks(plan));
  const note = 'Grey upright lines: Age Pension age — Dana (Jun 2035), Ash (Mar 2027)';
  for (const view of ['totalWealth', 'centrelink']) {
    const config = comparisonChartConfig(series, FUTURE, 'date', view);
    const rules = config.rules.filter((rule) => rule.scenarioId === AGE_PENSION_AGE_RULE_SCENARIO_ID);
    assert.deepEqual(rules.map((rule) => [rule.month, rule.index]), agePensionMarkers(SERIES).map((marker) => [marker.month, marker.index]));
    for (const rule of rules) {
      assert.equal(rule.colour, AGE_PENSION_AGE_COLOUR);
      assert.deepEqual(Object.keys(rule).sort(), ['colour', 'index', 'month', 'scenarioId'], 'a caption crept onto a Compare rule');
    }
    assert.ok(!list.some((scenario) => scenario.id === AGE_PENSION_AGE_RULE_SCENARIO_ID));
    assert.equal(config.options.plugins.subtitle.text.filter((line) => line === note).length, 1, `${view}: the rules are not named once`);
  }
});

test('compare chart: an over-age Person is SAID in the subtitle, not silently left without a rule', () => {
  const household = { ...DEMO_PLAN.household, persons: [DEMO_PLAN.household.persons[0], { ...DEMO_PLAN.household.persons[1], dateOfBirth: '1950-02-09' }] };
  const plan = parsePlan(JSON.parse(JSON.stringify({ ...DEMO_PLAN, household })));
  const config = comparisonChartConfig(comparisonSeries(plan, scenarioWalks(plan)), FUTURE);
  assert.equal(config.rules.filter((rule) => rule.scenarioId === AGE_PENSION_AGE_RULE_SCENARIO_ID).length, 1);
  assert.ok(config.options.plugins.subtitle.text.includes('Grey upright lines: Age Pension age — Dana (Jun 2035)'));
  assert.ok(config.options.plugins.subtitle.text.includes(agePensionAgeAlreadyNote('Ash')));
});

test('the age is AGE_PENSION_AGE, not a literal: swap it to 70 in a copy of dist and the lines move three years', async () => {
  assert.equal(AGE_PENSION_AGE, 67, 'this test swaps 67 for 70; re-pick the swap if the legislated age moves');
  const dir = mkdtempSync(join(ROOT, '.tmp-age-pension-age-'));
  try {
    cpSync(join(ROOT, 'dist'), dir, { recursive: true });
    const file = join(dir, 'core', 'household.js');
    const source = readFileSync(file, 'utf8');
    const line = 'export const AGE_PENSION_AGE = AGE_PENSION.qualification.qualifyingAge.value;';
    assert.equal(source.split(line).length, 2, 'the AGE_PENSION_AGE line in dist moved — update this swap');
    writeFileSync(file, source.replace(line, 'export const AGE_PENSION_AGE = 70;'));
    const swapped = await import(pathToFileURL(join(dir, 'app', 'monthsToSeries.js')).href);
    const lines = swapped.agePensionAgeLines(MONTHS, DEMO_HOUSEHOLD);
    assert.deepEqual(lines.lines.map((each) => [each.name, each.month]), [['Dana', '2038-06'], ['Ash', '2030-03']]);
    assert.deepEqual(agePensionAgeLines(MONTHS, DEMO_HOUSEHOLD).lines.map((each) => each.month), ['2035-06', '2027-03']);
    assert.match(swapped.agePensionAgeNeverNote('Dana'), /\(70\)/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
