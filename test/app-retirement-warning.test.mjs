// `retirementWarning.ts` — the "still paid when the plan ends" sentence (user request, 2026-09-23).
// The first case is a common plan shape: the household Retire @ 67 switched off and an Alex-only
// Retire @ 64 added, which left Sam earning to age 100 with nothing on the page saying so.
import test from 'node:test';
import assert from 'node:assert/strict';

import { stillWorkingWarnings } from '../dist/app/retirementWarning.js';

const person = (name, perFortnight) => ({
  name, dateOfBirth: '1971-06-01', superInterests: [], parcels: [], employmentIncomePerFortnight: perFortnight, workBonusBalance: 0,
});
const household = { persons: [person('Alex', 350000), person('Sam', 150000)], homeStatus: 'occupied' };
const entry = (id, type, owner, date, enabled = true, params = {}) =>
  ({ id, type, owner, date, enabled, params, note: '', createdAt: '2026-09-23' });

const householdRetire = entry('h', 'RETIRE', 'household', '2038-06-30');
const ddRetire = entry('a', 'RETIRE', 'personA', '2035-06-30');

test('the motivating case: household Retire switched off, Alex-only Retire on — warns about Sam alone, and names the switched-off entry', () => {
  const warnings = stillWorkingWarnings(household, [{ ...householdRetire, enabled: false }, ddRetire]);
  assert.equal(warnings.length, 1);
  assert.match(warnings[0], /^Sam is still paid a salary when the plan ends/);
  assert.match(warnings[0], /switched off here \(Household, 2038-06-30\)/);
});

test('a switched-on household Retire covers both people', () => {
  assert.deepEqual(stillWorkingWarnings(household, [householdRetire]), []);
});

test('a Retire for each person covers both', () => {
  assert.deepEqual(stillWorkingWarnings(household, [ddRetire, entry('b', 'RETIRE', 'personB', '2038-06-30')]), []);
});

test('no Retire at all warns about both, and suggests adding one', () => {
  const warnings = stillWorkingWarnings(household, []);
  assert.deepEqual(warnings.map((w) => w.split(' ')[0]), ['Alex', 'Sam']);
  assert.match(warnings[1], /Add a Retire entry for Sam/);
});

test('a person with no salary is not warned about', () => {
  const noWage = { ...household, persons: [household.persons[0], person('Sam', 0)] };
  assert.deepEqual(stillWorkingWarnings(noWage, [ddRetire]), []);
});

test('the last work-pattern change decides: dropping to zero days stops the salary, a later non-zero one restarts it', () => {
  const stop = entry('w1', 'WORK_PATTERN_CHANGE', 'personB', '2040-01-01', true, { daysPerWeek: 0, annualSalary: 0 });
  assert.deepEqual(stillWorkingWarnings(household, [ddRetire, stop]), []);
  const restart = entry('w2', 'WORK_PATTERN_CHANGE', 'personB', '2041-01-01', true, { daysPerWeek: 2, annualSalary: 2000000 });
  assert.equal(stillWorkingWarnings(household, [ddRetire, stop, restart]).length, 1);
  // A zero-wage person who is given a salary by a work-pattern change is warned about too.
  const noWage = { ...household, persons: [household.persons[0], person('Sam', 0)] };
  assert.equal(stillWorkingWarnings(noWage, [ddRetire, restart]).length, 1);
});

test('"last" means latest DATE, not last in the file: a zero-day change dated later but listed first still stops the salary', () => {
  const stop = entry('w1', 'WORK_PATTERN_CHANGE', 'personB', '2045-01-01', true, { daysPerWeek: 0, annualSalary: 0 });
  const earlier = entry('w2', 'WORK_PATTERN_CHANGE', 'personB', '2041-01-01', true, { daysPerWeek: 2, annualSalary: 2000000 });
  assert.deepEqual(stillWorkingWarnings(household, [ddRetire, stop, earlier]), []);
});

test('back at work after a Retire and never stopping again is warned about, in words that say so (retire flow S3)', () => {
  const bothStop = entry('h2', 'RETIRE', 'household', '2034-06-30');
  const back = entry('w', 'WORK_PATTERN_CHANGE', 'personA', '2036-01-01', true, { daysPerWeek: 2, annualSalary: 3_000_000 });
  const warnings = stillWorkingWarnings(household, [bothStop, back]);
  assert.deepEqual(warnings, ['Alex is still paid a salary when the plan ends: Alex goes back to work on 2036-01-01 and doesn\'t stop again in this scenario. Add a later Retire entry for Alex if that isn\'t what you meant.']);
  // Stopping again covers it; a pattern dated before the Retire, or with zero days, was never a return.
  assert.deepEqual(stillWorkingWarnings(household, [bothStop, back, entry('b', 'RETIRE', 'personA', '2037-01-01')]), []);
  assert.deepEqual(stillWorkingWarnings(household, [bothStop, { ...back, date: '2030-01-01' }]), []);
  assert.deepEqual(stillWorkingWarnings(household, [bothStop, { ...back, date: '2039-01-01', params: { daysPerWeek: 0, annualSalary: 0 } }]), []);
});
