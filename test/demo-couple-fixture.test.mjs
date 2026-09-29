// P2-8 — **the synthetic demo couple fixture, `fixtures/demo-couple.plan.json`.**
//
// User ruling, 2026-09-24: the fixture is a MADE-UP couple with a realistic set of events (a
// mortgage refinance, a household RETIRE on the 63rd birthday, a mortgage payoff and seven
// SPEND_CHANGE levels) and invented round figures. Nothing in this suite reads a real plan file, and
// no real figure is typed below — a labelled invented figure is the house style and a real one
// never belongs in `src/` or `test/`.
//
// Three things pinned:
//   1. the file loads through the app's own door (`parsePlan`) with no refusal, and `project()`
//      walks it to the planning horizon with no refusal;
//   2. the file is actually TRACKED — `.gitignore`'s `*.plan.json` rule would otherwise silently
//      swallow it, and P8-4b's negation is the only thing standing in the way (P8-4c);
//   3. the fixture's own DOBs are the INVENTED ones. This is a structural pin on the fixture's own
//      stated values, not a search for the real DOBs — writing the real DOBs here to assert their
//      absence would itself put real personal data in the repository, which is the exact failure
//      this fixture exists to avoid.
import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { parsePlan } from '../dist/core/parsePlan.js';
import { project } from '../dist/core/projection.js';

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const FIXTURE_PATH = join(REPO, 'fixtures', 'demo-couple.plan.json');

const readFixture = () => JSON.parse(readFileSync(FIXTURE_PATH, 'utf8'));

test('demo couple fixture loads through parsePlan with no refusal', () => {
  const raw = readFixture();
  const plan = parsePlan(raw);
  assert.equal(plan.scenarios.length, 1);
  assert.equal(plan.activeScenarioId, 'baseline');
  assert.equal(plan.entries.length, 10);
});

test('demo couple fixture projects to the planning horizon with no refusal', () => {
  const plan = parsePlan(readFixture());
  const months = project(plan.settings, plan.household, plan.entries);
  assert.ok(months.length > 0);
  // Sam is the younger Person (DOB 1973-01-01) and `planningHorizonAge` is 100, so the walk must
  // reach Sam's 100th birthday month.
  assert.equal(months[months.length - 1].month, '2073-01');
  assert.equal(months[0].month, '2026-09');
});

test('P8-4c: the fixture path is actually tracked, not swallowed by .gitignore', () => {
  const result = spawnSync('git', ['check-ignore', 'fixtures/demo-couple.plan.json'], { cwd: REPO, encoding: 'utf8' });
  // `git check-ignore` exits 0 (and prints the path) when the path IS ignored, and exits 1 when it
  // is NOT ignored — the tracked, committed case this fixture is required to be in (P8-4a/b).
  assert.equal(result.status, 1, `expected "not ignored" (exit 1), got exit ${result.status} with stdout "${result.stdout}"`);
});

test('the fixture states the INVENTED DOBs, structurally — never a real person’s', () => {
  const plan = parsePlan(readFixture());
  const dobs = plan.household.persons.map((person) => person.dateOfBirth).sort();
  assert.deepEqual(dobs, ['1971-01-01', '1973-01-01']);
});

test('the fixture states the invented round-number balances, structurally', () => {
  const plan = parsePlan(readFixture());
  const balances = plan.household.persons
    .flatMap((person) => person.superInterests.map((interest) => interest.balance))
    .sort((a, b) => a - b);
  assert.deepEqual(balances, [5_000_000, 50_000_000]);
  assert.equal(plan.household.mortgage?.openingBalance, 25_000_000);
  assert.equal(plan.household.openingOffsetBalance, 1_000_000);
});
