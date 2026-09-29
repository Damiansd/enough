// P6-4 — the v1 → v2 migration, on load, automatically, and **through the same gate every other
// write clears**.
//
// ⚠️ **§4 IS THE ASSERTION THIS SLICE IS FOR.** An automatic upgrade is the one operation that
// rewrites a file the user never asked to have rewritten, so the property that makes it safe is
// not "the migration is correct" — it is that **a migration producing a plan the engine will not
// accept is a refused edit**: `savePlan` runs `parsePlan` AND `project()` before the transport is
// named at all, so nothing is written, the transport is called ZERO times, and the original bytes
// survive. That is asserted here against a real file on disk and against a spy that counts.
//
// **The v1 fixture is committed** (`test/fixtures/plan-v1.json`) and is the exact shape of a real
// v1 file: the four keys `{version, settings, household, entries}`, three entries, 2,086 bytes.
// Nothing here reads `~/.enough` — the user's own data directory is not touched by this suite and
// no path in it is even spelled.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, mkdtempSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { DEMO_PLAN } from '../dist/app/demoHousehold.js';
import { loadPlanOrNone, migratePlanV1toV2 } from '../dist/app/loadPlan.js';
import { planWithEntry, savePlan, spendChangeEntry } from '../dist/app/planEdits.js';
import { scenarioCloned } from '../dist/app/scenarioList.js';
import { effectiveEntryIds } from '../dist/core/plan.js';
import { parsePlan, PlanFileShapeError, PlanFileVersionError } from '../dist/core/parsePlan.js';
import { project } from '../dist/core/projection.js';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const V1_TEXT = readFileSync(join(ROOT, 'test', 'fixtures', 'plan-v1.json'), 'utf8');
const v1 = () => JSON.parse(V1_TEXT);

const DATA_DIR = mkdtempSync(join(tmpdir(), 'enough-scenarios-'));
let n = 0;

/** The same real-file transport `app-load-plan.test.mjs` uses: temp file, then `rename`. */
const onDisk = (contents) => {
  const path = join(DATA_DIR, `plan-${(n += 1)}.json`);
  if (contents !== undefined) writeFileSync(path, contents);
  const writes = [];
  return {
    path,
    writes,
    bytes: () => (existsSync(path) ? readFileSync(path) : null),
    transport: {
      readPlan: async () => (existsSync(path) ? JSON.parse(readFileSync(path, 'utf8')) : null),
      writePlan: async (plan) => {
        writes.push(plan);
        writeFileSync(`${path}.tmp`, JSON.stringify(plan, null, 2));
        renameSync(`${path}.tmp`, path);
      },
    },
  };
};

const thrown = async (fn) => {
  try { await fn(); } catch (error) { return error; }
  return assert.fail('nothing was thrown');
};

const digest = (months) => createHash('sha256').update(JSON.stringify(months)).digest('hex');

/** What a scenario projects: the pool, filtered and ordered by the resolved ids. */
const monthsOf = (plan, scenarioId) => {
  const scenario = plan.scenarios.find((one) => one.id === scenarioId);
  const ids = effectiveEntryIds(scenario, plan.scenarios);
  const entries = ids.map((id) => plan.entries.find((entry) => entry.id === id));
  return project(plan.settings, plan.household, entries);
};

// --- §0 The fixture is the shape it claims to be --------------------------------------------------

test('the committed v1 fixture is a v1 file, and the shape a real one has', () => {
  const file = v1();
  assert.deepEqual(Object.keys(file), ['version', 'settings', 'household', 'entries']);
  assert.equal(file.version, 1);
  assert.equal(file.entries.length, 3);
  assert.equal(Buffer.byteLength(V1_TEXT), 2086);
  // And it is NOT already a v2 file with the new keys hidden somewhere.
  assert.ok(!Object.hasOwn(file, 'scenarios'));
  assert.ok(!Object.hasOwn(file, 'activeScenarioId'));
  assert.throws(() => parsePlan(file), PlanFileVersionError, 'a v1 file must not parse');
});

// --- §1 What the migration produces ---------------------------------------------------------------

test('a v1 file becomes a v2 file with ONE root scenario holding every id in the pool', () => {
  const plan = parsePlan(migratePlanV1toV2(v1()));

  assert.equal(plan.version, 2);
  assert.equal(plan.scenarios.length, 1);
  assert.equal(plan.scenarios[0].parentId, null);
  assert.equal(plan.scenarios[0].name, 'Baseline');
  assert.equal(plan.activeScenarioId, plan.scenarios[0].id);
  assert.deepEqual(plan.scenarios[0].entryIds, v1().entries.map((entry) => entry.id));
  // The pool itself is untouched — the migration adds, it does not rewrite.
  assert.deepEqual(plan.entries.map((entry) => entry.id), v1().entries.map((entry) => entry.id));
  assert.deepEqual(plan.settings, parsePlan(migratePlanV1toV2(v1())).settings);
});

test('THE MIGRATION MOVES NO FIGURE — the migrated plan projects to the same months, by digest', () => {
  const before = v1();
  // The v1 plan as it was walked: `entries` was *the* list, in file order.
  const was = project(before.settings, before.household, before.entries);
  const plan = parsePlan(migratePlanV1toV2(before));
  const now = monthsOf(plan, plan.activeScenarioId);

  assert.ok(was.length > 400, `the demo walk is ${was.length} months — too short to be the real one`);
  assert.equal(now.length, was.length);
  assert.equal(digest(now), digest(was), 'the Baseline scenario changed a figure');
});

test('a v2 file is returned UNTOUCHED — the migration is not re-run on its own output', () => {
  const once = migratePlanV1toV2(v1());
  const twice = migratePlanV1toV2(once);
  assert.equal(twice, once, 'a v2 file was migrated a second time');

  // And on a v2 file whose scenarios are NOT what a migration would produce: re-running would
  // flatten a real scenario tree back to one Baseline, which is the damage this guards.
  const forked = { ...DEMO_PLAN, scenarios: scenarioCloned(DEMO_PLAN.scenarios, 'baseline', 'fork', 'A fork'), activeScenarioId: 'fork' };
  assert.equal(migratePlanV1toV2(forked), forked);
});

test('a version this build does not know is returned untouched, for parsePlan to refuse by name', () => {
  for (const version of [3, 0, '1', null, undefined, 1.5]) {
    const file = { ...v1(), version };
    assert.equal(migratePlanV1toV2(file), file, `version ${JSON.stringify(version)} was migrated`);
  }
  assert.equal(migratePlanV1toV2(null), null);
  assert.equal(migratePlanV1toV2(42), 42);
});

// --- §2 On load: automatic, once, and written back ------------------------------------------------

test('loading a v1 file upgrades it, writes it back, and says that it did', async () => {
  const store = onDisk(V1_TEXT);

  const loaded = await loadPlanOrNone(store.transport);

  assert.equal(loaded.migrated, true);
  // An upgrade is not a first run, and a first run is the one thing the loader no longer does: it
  // reports absence as `null` and writes nothing (`test/app-load-plan.test.mjs` §1).
  assert.notEqual(loaded, null, 'a file that exists was reported as absence');
  assert.equal(store.writes.length, 1);
  assert.equal(loaded.plan.version, 2);
  // The user's own figures, not the seed's: a loader that wrote the fixture would pass a test
  // whose fixture and file agreed, so this checks the entry ids that came off the disk.
  assert.deepEqual(loaded.plan.entries.map((entry) => entry.id), v1().entries.map((entry) => entry.id));

  // What landed is a plan this build reads back, and the second startup is a plain load.
  const again = await loadPlanOrNone(store.transport);
  assert.equal(again.migrated, false);
  assert.equal(store.writes.length, 1, 'the second startup migrated a file that was already v2');
  assert.deepEqual(again.plan, loaded.plan);
});

test('loading a v2 file writes NOTHING and leaves its scenarios exactly as they were', async () => {
  const forked = {
    ...DEMO_PLAN,
    scenarios: scenarioCloned(DEMO_PLAN.scenarios, 'baseline', 'fork', 'Discharge the mortgage'),
    activeScenarioId: 'fork',
  };
  const contents = JSON.stringify(forked, null, 2);
  const store = onDisk(contents);

  const loaded = await loadPlanOrNone(store.transport);

  assert.equal(loaded.migrated, false);
  assert.equal(store.writes.length, 0, 'a v2 file was written on load');
  assert.equal(store.bytes().toString(), contents, 'the bytes on disk changed');
  assert.equal(loaded.plan.scenarios.length, 2);
  assert.equal(loaded.plan.activeScenarioId, 'fork');
  assert.deepEqual(loaded.plan.scenarios[1].entryIds, []);
});

test('an unrecognised version is refused by name on load, and NOTHING is written', async () => {
  const contents = JSON.stringify({ ...v1(), version: 3 }, null, 2);
  const store = onDisk(contents);

  const error = await thrown(() => loadPlanOrNone(store.transport));

  assert.ok(error instanceof PlanFileVersionError);
  assert.equal(store.writes.length, 0);
  assert.equal(store.bytes().toString(), contents);
  assert.ok(!existsSync(`${store.path}.tmp`));
});

// --- §3 A scenario the app can actually use -------------------------------------------------------

test('an entry added to the plan lands in the ACTIVE scenario, not only in the pool', () => {
  const plan = parsePlan(migratePlanV1toV2(v1()));
  const candidate = planWithEntry(plan, spendChangeEntry(
    { date: '2030-01-01', owner: 'household', note: '', annualSpend: '120,000' },
    'went-up',
    '2026-09-19',
  ));
  const next = parsePlan(candidate);

  assert.ok(next.entries.some((entry) => entry.id === 'went-up'));
  assert.ok(next.scenarios[0].entryIds.includes('went-up'), 'the entry belongs to no scenario, so nothing projects it');
  assert.equal(next.scenarios[0].entryIds.at(-1), 'went-up', 'a later decision goes on the end');
  assert.notEqual(digest(monthsOf(next, next.activeScenarioId)), digest(monthsOf(plan, plan.activeScenarioId)));
});

test('a clone inherits live through the FILE, not only in memory', () => {
  const base = parsePlan(migratePlanV1toV2(v1()));
  const cloned = parsePlan({ ...base, scenarios: scenarioCloned(base.scenarios, 'baseline', 'fork', 'A fork') });
  const beforeMonths = monthsOf(cloned, 'fork');
  assert.equal(digest(beforeMonths), digest(monthsOf(cloned, 'baseline')), 'an empty fork projects its parent');

  // The PARENT gains an entry after the fork exists. A clone that had copied ids would be frozen
  // at the moment of forking; this one is not, because it holds none of its own.
  const withNew = parsePlan(planWithEntry(cloned, spendChangeEntry(
    { date: '2032-06-01', owner: 'household', note: '', annualSpend: '150,000' },
    'parent-spends-more',
    '2026-09-19',
  )));

  assert.equal(withNew.activeScenarioId, 'baseline');
  assert.deepEqual(withNew.scenarios[1].entryIds, [], 'the clone still holds no ids of its own');
  assert.ok(effectiveEntryIds(withNew.scenarios[1], withNew.scenarios).includes('parent-spends-more'));
  assert.notEqual(digest(monthsOf(withNew, 'fork')), digest(beforeMonths), 'the child did not see its parent’s new entry');
  assert.equal(digest(monthsOf(withNew, 'fork')), digest(monthsOf(withNew, 'baseline')));
});

// --- §4 THE SAFETY PROPERTY: a migration the engine refuses is never written ----------------------

test('a migration whose output will not PARSE writes nothing and calls the transport zero times', async () => {
  // A v1 file with an owner nobody can be. It is a well-formed v1 shape, so the migration runs and
  // produces a v2 object — which `parsePlan` then refuses inside the save gate.
  const broken = v1();
  broken.entries[0].owner = 'everyone';
  const contents = JSON.stringify(broken, null, 2);
  const store = onDisk(contents);
  const before = store.bytes();

  const error = await thrown(() => loadPlanOrNone(store.transport));

  assert.ok(error instanceof RangeError);
  assert.match(error.message, /everyone/);
  assert.equal(store.writes.length, 0, 'the transport was called for a plan that does not parse');
  assert.deepEqual(store.bytes(), before, 'the bytes on disk changed');
  assert.equal(store.bytes().toString(), contents);
  assert.ok(!existsSync(`${store.path}.tmp`));
});

test('a migration whose output parses but will not WALK writes nothing either — the gate is both', async () => {
  // This is the half a `parsePlan`-only gate would let through, and it is the one that bricks the
  // page: an entry dated after the Planning Horizon parses perfectly and makes `project()` throw.
  const broken = v1();
  broken.entries.push({
    id: 'past-the-horizon',
    date: '2999-01-01',
    owner: 'household',
    type: 'ONE_OFF_EXPENSE',
    params: { amount: 100 },
    enabled: true,
    createdAt: '2026-08-20',
  });
  const contents = JSON.stringify(broken, null, 2);
  const store = onDisk(contents);
  const before = store.bytes();

  // Vacuity control: the migrated plan really does PARSE, so this test is about the walk.
  assert.doesNotThrow(() => parsePlan(migratePlanV1toV2(JSON.parse(contents))));

  const error = await thrown(() => loadPlanOrNone(store.transport));

  assert.match(error.message, /Planning Horizon/);
  assert.equal(store.writes.length, 0, 'a plan the engine cannot walk was written to disk');
  assert.deepEqual(store.bytes(), before);
  assert.ok(!existsSync(`${store.path}.tmp`));
});

test('the same property against a counting spy: zero calls, and the read is not repaired either', async () => {
  const calls = [];
  const broken = v1();
  broken.entries[0].params.annualSpend = 8_400_000.5; // not whole cents

  const error = await thrown(() => loadPlanOrNone(
    { readPlan: async () => broken, writePlan: async (plan) => { calls.push(plan); } },
  ));

  assert.ok(error instanceof RangeError);
  assert.deepEqual(calls, []);
  // The object handed to the loader is the object it was given back: nothing was mutated in place.
  assert.equal(broken.version, 1);
  assert.ok(!Object.hasOwn(broken, 'scenarios'));
});

test('a migrated plan that the gate accepts is written through savePlan, not past it', async () => {
  // The positive control for the three above: when the migration IS good, exactly one write
  // happens, and what lands is a plan the door reads back to the same object.
  const store = onDisk(V1_TEXT);
  const loaded = await loadPlanOrNone(store.transport);

  assert.equal(store.writes.length, 1);
  assert.deepEqual(parsePlan(JSON.parse(readFileSync(store.path, 'utf8'))), loaded.plan);
  // And the gate is the shared one: the same candidate through `savePlan` gives the same plan.
  const spy = { writePlan: async () => {} };
  const saved = await savePlan(spy, migratePlanV1toV2(v1()));
  assert.deepEqual(saved.plan, loaded.plan);
});

test('a migrated plan whose scenario graph is broken is refused by the gate as well', async () => {
  // Not reachable from `migratePlanV1toV2` as written — it is what a future edit to it would look
  // like, and the gate is what stops that edit reaching the disk.
  const store = onDisk(V1_TEXT);
  const candidate = { ...migratePlanV1toV2(v1()), activeScenarioId: 'a-scenario-that-is-not-there' };
  const calls = [];

  const error = await thrown(() => savePlan({ writePlan: async (plan) => { calls.push(plan); } }, candidate));

  assert.ok(error instanceof PlanFileShapeError);
  assert.deepEqual(calls, []);
  assert.equal(store.bytes().toString(), V1_TEXT);
});

test.after(() => rmSync(DATA_DIR, { recursive: true, force: true }));
