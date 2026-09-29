// P6-4 / P6-7 — the Scenario: inheritance by reference, the order it resolves in, and the four
// shapes of scenario graph the file boundary refuses.
//
// Every test here is written to fail on a specific mutation rather than to restate the code:
//
//   * **inheritance is LIVE.** The test that matters is not "a clone resolves to its parent's
//     entries" — a snapshot passes that too. It is that a clone's own `entryIds` stays EMPTY, and
//     that what it projects moves when the parent moves. A clone that copied its parent's ids at
//     the moment of forking would pass every resolution assertion and fail these two.
//   * **the order** is pinned as a list, not as a set: ancestors first, each scenario's own ids in
//     its own order. Reversing it would make a parent's spending level beat the child's, which is
//     the opposite of what a fork is for.
//   * **a cycle throws rather than hanging**, at both layers, and the resolver's throw is asserted
//     by running it — a test that only checked the parser would be green while the engine spun.
import test from 'node:test';
import assert from 'node:assert/strict';

import { effectiveEntryIds } from '../dist/core/plan.js';
import { parsePlan, PlanFileEntryError, PlanFileShapeError } from '../dist/core/parsePlan.js';
import { scenarioCloned, scenarioCreated, scenarioDeleted, scenarioRenamed } from '../dist/app/scenarioList.js';
import { planWithScenarioDeleted } from '../dist/app/planEdits.js';
import { scenarioWalks } from '../dist/app/scenarioWalks.js';
import { DEMO_PLAN } from '../dist/app/demoHousehold.js';

const scenario = (id, parentId, entryIds) => ({ id, name: id, parentId, entryIds });

const thrown = (fn) => {
  try { fn(); } catch (error) { return error; }
  return assert.fail('nothing was thrown');
};

/** The demo file as JSON, with every brand gone — the shape a file on disk has. */
const onDisk = () => JSON.parse(JSON.stringify(DEMO_PLAN));

const mutated = (edit) => {
  const file = onDisk();
  edit(file);
  return file;
};

// --- §0 Vacuity control -------------------------------------------------------------------------

test('the file every refusal below is a single mutation of is itself accepted', () => {
  const parsed = parsePlan(onDisk());
  assert.equal(parsed.scenarios.length, 1);
  assert.equal(parsed.activeScenarioId, parsed.scenarios[0].id);
  assert.ok(parsed.entries.length > 0, 'a file with no entries would make the pool checks vacuous');
  assert.deepEqual(parsed.scenarios[0].entryIds, parsed.entries.map((entry) => entry.id));
});

// --- §1 Resolution: the order, and the duplicate rule ---------------------------------------------

test('a root scenario resolves to its own ids, in its own order', () => {
  const root = scenario('root', null, ['c', 'a', 'b']);
  assert.deepEqual(effectiveEntryIds(root, [root]), ['c', 'a', 'b']);
});

test('ANCESTORS FIRST, then the scenario itself — a child\'s entries come last', () => {
  const root = scenario('root', null, ['r1', 'r2']);
  const middle = scenario('middle', 'root', ['m1']);
  const leaf = scenario('leaf', 'middle', ['l1', 'l2']);
  const all = [leaf, middle, root]; // deliberately not in chain order: position must not matter

  assert.deepEqual(effectiveEntryIds(leaf, all), ['r1', 'r2', 'm1', 'l1', 'l2']);
  assert.deepEqual(effectiveEntryIds(middle, all), ['r1', 'r2', 'm1']);
  assert.deepEqual(effectiveEntryIds(root, all), ['r1', 'r2']);
  // A set comparison would pass on the reversed order too, which is why this is a list.
  assert.notDeepEqual(effectiveEntryIds(leaf, all), ['l1', 'l2', 'm1', 'r1', 'r2']);
});

test('an id re-listed by a descendant is emitted ONCE, at its most ancestral position', () => {
  const root = scenario('root', null, ['shared', 'r2']);
  const leaf = scenario('leaf', 'root', ['l1', 'shared']);

  // Not ['shared','r2','l1','shared'] — an Entry is one dated fact, and a ONE_OFF_EXPENSE applied
  // twice spends the money twice. Not ['r2','l1','shared'] either: the earliest position is kept,
  // so adding a child cannot reorder what the parent already meant.
  assert.deepEqual(effectiveEntryIds(leaf, [root, leaf]), ['shared', 'r2', 'l1']);
});

test('a duplicate WITHIN one scenario is emitted once as well', () => {
  const root = scenario('root', null, ['a', 'b', 'a']);
  assert.deepEqual(effectiveEntryIds(root, [root]), ['a', 'b']);
});

test('a cycle THROWS and does not hang', () => {
  const a = scenario('a', 'b', ['a1']);
  const b = scenario('b', 'a', ['b1']);
  const error = thrown(() => effectiveEntryIds(a, [a, b]));
  assert.ok(error instanceof RangeError);
  assert.match(error.message, /own ancestor/);
  // Self-parenthood is the one-link case of the same defect.
  const self = scenario('self', 'self', []);
  assert.throws(() => effectiveEntryIds(self, [self]), RangeError);
});

test('a parentId naming no scenario throws rather than resolving to a root', () => {
  const orphan = scenario('orphan', 'gone', ['o1']);
  const error = thrown(() => effectiveEntryIds(orphan, [orphan]));
  assert.match(error.message, /names parent "gone"/);
});

// --- §2 The file boundary refuses the four graphs -------------------------------------------------

test('an empty scenarios list is refused — there would be nothing to project', () => {
  const error = thrown(() => parsePlan(mutated((file) => { file.scenarios = []; })));
  assert.ok(error instanceof PlanFileShapeError);
  assert.match(error.message, /^plan file: scenarios is empty/);
});

test('an entryIds member naming no entry in the pool is refused', () => {
  const error = thrown(() => parsePlan(mutated((file) => { file.scenarios[0].entryIds.push('never-written'); })));
  assert.ok(error instanceof PlanFileEntryError, `${error.constructor.name} was thrown`);
  assert.match(error.message, /never-written/);
  assert.match(error.message, /no entry in the file has that id/);
});

test('a parentId naming no scenario is refused', () => {
  const error = thrown(() => parsePlan(mutated((file) => { file.scenarios[0].parentId = 'ghost'; })));
  assert.ok(error instanceof PlanFileShapeError);
  assert.match(error.message, /"ghost"/);
});

test('a CYCLE in the parentId chain is refused, and the refusal returns rather than hanging', () => {
  const two = thrown(() => parsePlan(mutated((file) => {
    file.scenarios = [
      { id: 'a', name: 'A', parentId: 'b', entryIds: [] },
      { id: 'b', name: 'B', parentId: 'a', entryIds: [] },
    ];
    file.activeScenarioId = 'a';
  })));
  assert.ok(two instanceof PlanFileShapeError);
  assert.match(two.message, /loops/);

  const self = thrown(() => parsePlan(mutated((file) => {
    file.scenarios = [{ id: 'a', name: 'A', parentId: 'a', entryIds: [] }];
    file.activeScenarioId = 'a';
  })));
  assert.match(self.message, /loops/);

  // A three-link ring, in case a check only looked one or two hops up.
  const three = thrown(() => parsePlan(mutated((file) => {
    file.scenarios = [
      { id: 'a', name: 'A', parentId: 'c', entryIds: [] },
      { id: 'b', name: 'B', parentId: 'a', entryIds: [] },
      { id: 'c', name: 'C', parentId: 'b', entryIds: [] },
    ];
    file.activeScenarioId = 'a';
  })));
  assert.match(three.message, /loops/);
});

test('two scenarios with one id are refused — parentId resolves by id', () => {
  const error = thrown(() => parsePlan(mutated((file) => {
    file.scenarios.push({ ...file.scenarios[0], name: 'A second one' });
  })));
  assert.ok(error instanceof PlanFileShapeError);
  assert.match(error.message, /already has/);
});

// --- §3 `activeScenarioId` is required and must name a scenario -----------------------------------

test('activeScenarioId naming no scenario is refused', () => {
  const error = thrown(() => parsePlan(mutated((file) => { file.activeScenarioId = 'not-here'; })));
  assert.ok(error instanceof PlanFileShapeError);
  assert.match(error.message, /^plan file: activeScenarioId is "not-here"/);
  assert.match(error.message, /reordered/); // the ruling's own ground reaches the user
});

test('activeScenarioId is REQUIRED — absent is refused, not defaulted to the first scenario', () => {
  const error = thrown(() => parsePlan(mutated((file) => { delete file.activeScenarioId; })));
  assert.ok(error instanceof PlanFileShapeError);
  // And it is refused for being absent, not for being an unknown key.
  assert.match(error.message, /^plan file: activeScenarioId /);
});

test('a scenario missing a field, or carrying one this build does not read, is refused', () => {
  for (const edit of [
    (file) => { delete file.scenarios[0].name; },
    (file) => { delete file.scenarios[0].parentId; },
    (file) => { delete file.scenarios[0].entryIds; },
    (file) => { file.scenarios[0].colour = 'blue'; },
    (file) => { file.scenarios[0].entryIds = 'spend-2026'; },
    (file) => { file.scenarios[0].id = 7; },
    (file) => { file.scenarios = {}; },
  ]) {
    assert.throws(() => parsePlan(mutated(edit)), PlanFileShapeError);
  }
});

test('parentId must be a string or null — absent is NOT read as a root', () => {
  const error = thrown(() => parsePlan(mutated((file) => { delete file.scenarios[0].parentId; })));
  assert.match(error.message, /an absent parentId is not the same claim/);
});

// --- §4 create / clone / rename, as pure functions over the list ----------------------------------

const LIST = [scenario('base', null, ['e1', 'e2'])];

test('create appends a ROOT scenario with no entries, and touches nothing already there', () => {
  const next = scenarioCreated(LIST, 'fresh', 'From scratch');

  assert.deepEqual(LIST, [scenario('base', null, ['e1', 'e2'])], 'the input array was mutated');
  assert.equal(next.length, 2);
  assert.deepEqual(next[0], LIST[0]);
  assert.deepEqual(next[1], { id: 'fresh', name: 'From scratch', parentId: null, entryIds: [] });
});

test('CLONE sets parentId to the source and starts EMPTY — never a copy of its entries', () => {
  const next = scenarioCloned(LIST, 'base', 'fork', 'Plus the discharge');

  assert.equal(next[1].parentId, 'base');
  // The assertion the whole ruling turns on. `['e1','e2']` here is the snapshot defect, and every
  // resolution test in §1 would still pass with it in place.
  assert.deepEqual(next[1].entryIds, [], 'the clone copied its parent’s entries');
  assert.deepEqual(effectiveEntryIds(next[1], next), ['e1', 'e2'], 'and it still projects them, by reference');
});

test('a clone inherits LIVE: an entry added to the parent afterwards is in the child', () => {
  const forked = scenarioCloned(LIST, 'base', 'fork', 'Fork');
  const before = effectiveEntryIds(forked[1], forked);

  // The parent gains an entry after the fork — the case ADR-0002 says a copy gets silently wrong.
  const later = forked.map((one) => (one.id === 'base' ? { ...one, entryIds: [...one.entryIds, 'e3'] } : one));
  const after = effectiveEntryIds(later[1], later);

  assert.deepEqual(before, ['e1', 'e2']);
  assert.deepEqual(after, ['e1', 'e2', 'e3']);
  assert.deepEqual(later[1].entryIds, [], 'the child’s own list is still empty — inheritance is the mechanism');
});

test('cloning something that is not in the list is a refusal, not a new root', () => {
  assert.throws(() => scenarioCloned(LIST, 'nobody', 'fork', 'Fork'), RangeError);
});

test('a duplicate id is refused by both create and clone', () => {
  assert.throws(() => scenarioCreated(LIST, 'base', 'Another base'), RangeError);
  assert.throws(() => scenarioCloned(LIST, 'base', 'base', 'Another base'), RangeError);
});

test('a blank name is refused — a scenario is chosen from a list by its name', () => {
  assert.throws(() => scenarioCreated(LIST, 'fresh', '   '), RangeError);
  assert.throws(() => scenarioRenamed(LIST, 'base', ''), RangeError);
});

test('rename changes the name and NOTHING else — id, parentId and entryIds are untouched', () => {
  const next = scenarioRenamed(LIST, 'base', 'The baseline');

  assert.deepEqual(next, [{ id: 'base', name: 'The baseline', parentId: null, entryIds: ['e1', 'e2'] }]);
  assert.deepEqual(LIST[0].name, 'base', 'the input array was mutated');
});

test('renaming an id that is in no scenario is a refusal, never a silent no-op', () => {
  assert.throws(() => scenarioRenamed(LIST, 'nobody', 'Whatever'), RangeError);
});

test('the three produce a list the door accepts', () => {
  const file = onDisk();
  const withFork = scenarioCloned(file.scenarios, file.activeScenarioId, 'fork', 'A fork');
  const parsed = parsePlan({ ...file, scenarios: scenarioRenamed(withFork, 'fork', 'Renamed') });

  assert.equal(parsed.scenarios.length, 2);
  assert.equal(parsed.scenarios[1].name, 'Renamed');
  assert.equal(parsed.scenarios[1].parentId, file.activeScenarioId);
});

// --- §5 DELETE: a container goes, the journal does not --------------------------------------------
//
// A Scenario is a container — a name, a parent and the ids it adds on top — so deleting one is not
// a destructive edit of the journal and does not touch ADR-0002. The property that makes that true
// is structural and is asserted as such: `scenarioDeleted` takes a `readonly Scenario[]` and does
// not take the pool at all, so §5's pool assertions are about the plan-level wrapper, which spreads
// `entries` through untouched. Each of the two refusals is asserted by NAME in the message, because
// "that cannot be deleted" with no subject is a refusal a user cannot act on.

const TREE = [
  scenario('base', null, ['e1', 'e2']),
  scenario('fork', 'base', ['e3']),
  scenario('leaf', 'fork', []),
];

test('deleting a LEAF removes it and nothing else — the other scenarios are untouched', () => {
  const after = scenarioDeleted(TREE, 'leaf', 'base');

  assert.deepEqual(after.scenarios, [scenario('base', null, ['e1', 'e2']), scenario('fork', 'base', ['e3'])]);
  assert.equal(after.scenarios.length, TREE.length - 1);
  assert.equal(TREE.length, 3, 'the input array was mutated');
  // The view did not move, and the writer is told so rather than left to compare two ids.
  assert.equal(after.activeScenarioId, 'base');
  assert.equal(after.switchedTo, null);
});

test('a scenario with CHILDREN is refused, and the refusal names the children in the way', () => {
  const error = thrown(() => scenarioDeleted(TREE, 'fork', 'base'));

  assert.ok(error instanceof RangeError);
  assert.match(error.message, /“fork”/, 'the refusal does not name the scenario that cannot go');
  assert.match(error.message, /“leaf”/, 'the refusal does not name the child that is in the way');
  assert.match(error.message, /1 scenario\(s\) inherit it/);
  // It refuses rather than re-parenting: nothing in the message offers to move the grandchildren,
  // because that would silently change which entries they project.
  assert.match(error.message, /will not re-parent them for you/);
  // And it is a refusal, not a partial edit: `base` still has the child it had.
  assert.deepEqual(TREE[1], scenario('fork', 'base', ['e3']));
});

test('the LAST remaining scenario is refused by name — parsePlan holds that a plan has at least one', () => {
  const only = [scenario('base', null, ['e1'])];
  const error = thrown(() => scenarioDeleted(only, 'base', 'base'));

  assert.ok(error instanceof RangeError);
  assert.match(error.message, /“base”/, 'the refusal does not name the scenario');
  assert.match(error.message, /only scenario this plan has/);
  // The reason is the door's own rule, said before the door would have to say it.
  assert.throws(() => parsePlan({ ...onDisk(), scenarios: [] }), PlanFileShapeError);
});

test('deleting the ACTIVE scenario moves activeScenarioId to its PARENT, and says which', () => {
  const after = scenarioDeleted(TREE, 'leaf', 'leaf');

  assert.equal(after.activeScenarioId, 'fork');
  assert.equal(after.switchedTo?.id, 'fork');
  assert.equal(after.switchedTo?.name, 'fork', 'the writer is handed the scenario, so it can say the NAME');
});

test('deleting the ACTIVE ROOT moves to the FIRST remaining scenario — never to nothing', () => {
  const roots = [scenario('first', null, ['e1']), scenario('second', null, ['e2']), scenario('third', null, [])];
  const after = scenarioDeleted(roots, 'second', 'second');

  assert.equal(after.activeScenarioId, 'first');
  assert.equal(after.switchedTo?.id, 'first');
  // And a root whose delete leaves the first one as the deleted one's successor by position only:
  // deleting `first` goes to `second`, which is the first of what is LEFT.
  assert.equal(scenarioDeleted(roots, 'first', 'first').activeScenarioId, 'second');
});

test('deleting a scenario that is NOT active leaves the active one exactly where it was', () => {
  assert.equal(scenarioDeleted(TREE, 'leaf', 'base').activeScenarioId, 'base');
  assert.equal(scenarioDeleted(TREE, 'leaf', 'fork').activeScenarioId, 'fork');
});

test('deleting an id that is in no scenario is a refusal, never a silent no-op', () => {
  assert.throws(() => scenarioDeleted(TREE, 'nobody', 'base'), RangeError);
});

test('THE ENTRY POOL IS UNTOUCHED BY A DELETE — and the function cannot reach it', () => {
  const file = onDisk();
  const pool = JSON.parse(JSON.stringify(file.entries));
  const withFork = scenarioCloned(file.scenarios, file.activeScenarioId, 'fork', 'A fork');
  // ⚠️ The fork is given an entry **NO OTHER SCENARIO LISTS** — the base's list loses it in the
  // same breath. That is what makes this test sensitive: with the entry also listed by the base,
  // a delete that "tidied the pool" of everything the deleted scenario held would remove nothing
  // and the assertion below would pass on a plan that had in fact eaten an entry.
  const moved = pool[0].id;
  const listed = withFork.map((one) =>
    one.id === 'fork'
      ? { ...one, entryIds: [moved] }
      : { ...one, entryIds: one.entryIds.filter((entryId) => entryId !== moved) },
  );
  assert.ok(!listed.some((one) => one.id !== 'fork' && one.entryIds.includes(moved)), 'the moved entry is still listed elsewhere, so this test cannot see a tidy-up');
  const deletion = scenarioDeleted(listed, 'fork', file.activeScenarioId);
  const next = planWithScenarioDeleted(parsePlan({ ...file, scenarios: listed }), deletion);
  const parsed = parsePlan(JSON.parse(JSON.stringify(next)));

  assert.equal(parsed.scenarios.length, 1);
  assert.deepEqual(
    parsed.entries.map((entry) => entry.id),
    pool.map((entry) => entry.id),
    'an entry left the pool when a scenario was deleted',
  );
  assert.equal(parsed.entries.length, pool.length);
  assert.ok(parsed.entries.some((entry) => entry.id === moved), 'the entry only the deleted scenario listed was taken with it');
  assert.ok(
    !parsed.scenarios.some((one) => one.entryIds.includes(moved)),
    'the entry is no longer an orphan, so the assertion above is not about an orphan',
  );
  // Structural, and the assertion the whole ruling rests on: the pure function is not given the
  // pool, so no wording in it can be the thing that keeps an entry safe.
  assert.equal(scenarioDeleted.length, 3, 'scenarioDeleted has gained an argument — if it is the entry pool, ADR-0002 is in play');
});

test('A POOL ENTRY NO SCENARIO NAMES still parses AND still walks — orphaning is not corruption', () => {
  const file = onDisk();
  const orphan = file.scenarios[0].entryIds[file.scenarios[0].entryIds.length - 1];
  file.scenarios[0].entryIds = file.scenarios[0].entryIds.slice(0, -1);

  const parsed = parsePlan(file);
  assert.equal(parsed.entries.length, onDisk().entries.length, 'the pool lost the entry no scenario names');
  assert.ok(parsed.entries.some((entry) => entry.id === orphan), 'the orphaned entry is not in the pool the door returned');
  assert.ok(!effectiveEntryIds(parsed.scenarios[0], parsed.scenarios).includes(orphan), 'the orphan is still projected');

  const walked = scenarioWalks(parsed);
  assert.ok(walked.active.length > 0, 'a plan with an orphaned pool entry does not walk');
});

// --- §6 The home and care checks run PER SCENARIO (P14-14, ruling 2026-09-25) --------------------
//
// `checkEnterCares`, `checkSellHomes` and `checkRentOutHomes` read each Scenario's own effective,
// switched-on entries, never the pool — so sibling Scenarios can hold rival care decisions. An entry
// no Scenario has switched on is still checked, alone.

const careFile = (entries, scenarios, activeScenarioId = scenarios[0].id) => ({
  ...onDisk(),
  household: {
    persons: [{ name: 'Sam', dateOfBirth: '1957-06-01', superInterests: [], parcels: [], employmentIncomePerFortnight: 0, workBonusBalance: 0 }],
    homeStatus: 'occupied',
    openingOffsetBalance: 20_000_000,
  },
  entries,
  scenarios,
  activeScenarioId,
});
const careEntry = (id, owner = 'personA', enabled = true) => ({
  id, date: '2040-07-01', owner, type: 'ENTER_CARE', params: { homeValue: 90_000_000, radPrice: 50_000_000, radPaidAsLumpSum: 0 }, enabled, createdAt: '2026-06-01',
});
const homeEntry = (id, type, date, params) => ({ id, date, owner: 'household', type, params, enabled: true, createdAt: '2026-06-01' });

test('two ENTER_CAREs for one Person in SIBLING scenarios are accepted — each scenario holds one', () => {
  const file = careFile([careEntry('c1'), careEntry('c2')], [scenario('root', null, []), scenario('a', 'root', ['c1']), scenario('b', 'root', ['c2'])]);
  assert.equal(parsePlan(file).entries.length, 2);
});

test('a SELL_HOME in one sibling and a RENT_OUT_HOME in another are accepted', () => {
  const file = careFile(
    [homeEntry('sell', 'SELL_HOME', '2040-07-01', { salePrice: 90_000_000 }), homeEntry('rent', 'RENT_OUT_HOME', '2040-07-01', { weeklyRent: 60_000 })],
    [scenario('root', null, []), scenario('a', 'root', ['sell']), scenario('b', 'root', ['rent'])],
  );
  assert.equal(parsePlan(file).entries.length, 2);
  // The control: the same two in ONE scenario are still refused.
  const together = careFile(file.entries, [scenario('root', null, ['sell', 'rent'])]);
  assert.throws(() => parsePlan(together), /There is no home left to rent once it is sold/);
});

test('two ENTER_CAREs for one Person in ONE scenario are still refused — own or inherited', () => {
  const own = careFile([careEntry('c1'), careEntry('c2')], [scenario('root', null, ['c1', 'c2'])]);
  assert.throws(() => parsePlan(own), /is a SECOND ENTER_CARE entry for Sam/);
  const inherited = careFile([careEntry('c1'), careEntry('c2')], [scenario('root', null, ['c1']), scenario('kid', 'root', ['c2'])]);
  assert.throws(() => parsePlan(inherited), /is a SECOND ENTER_CARE entry for Sam/);
  // Switched off in the child, the inherited one leaves it: the chain is the walk's.
  const overridden = careFile(inherited.entries, [scenario('root', null, ['c1']), { ...scenario('kid', 'root', ['c2']), entryOverrides: { c1: false } }]);
  assert.equal(parsePlan(overridden).entries.length, 2);
});

test('a malformed entry switched on in NO scenario is still refused — alone', () => {
  const offInItsOnlyScenario = careFile([careEntry('bad', 'household')], [{ ...scenario('root', null, ['bad']), entryOverrides: { bad: false } }]);
  assert.throws(() => parsePlan(offInItsOnlyScenario), /is "household", and entering permanent residential aged care/);
  const offInThePool = careFile([careEntry('bad', 'household', false)], [scenario('root', null, ['bad'])]);
  assert.throws(() => parsePlan(offInThePool), /is "household", and entering permanent residential aged care/);
  const inNoScenario = careFile([careEntry('bad', 'household')], [scenario('root', null, [])]);
  assert.throws(() => parsePlan(inNoScenario), /is "household", and entering permanent residential aged care/);
});

// --- §7 Every door check that RELATES entries runs per Scenario (2026-09-25) ---------------------
//
// The class §6 fixed for three care checks: a relation between entries ("one per Person", "X needs
// a Y before it") read over the pool refuses a legitimate alternative in a sibling. `checkHeasDraws`'
// three relations and the contribution stop joined them. Each is pinned both ways: siblings
// accepted, the same pair in ONE scenario still refused.

const coupleFile = (entries, scenarios) => ({
  ...careFile(entries, scenarios),
  household: {
    persons: [
      { name: 'Alex', dateOfBirth: '1957-06-01', superInterests: [], parcels: [], employmentIncomePerFortnight: 0, workBonusBalance: 0 },
      { name: 'Blair', dateOfBirth: '1957-06-15', superInterests: [], parcels: [], employmentIncomePerFortnight: 0, workBonusBalance: 0 },
    ],
    homeStatus: 'occupied',
    openingOffsetBalance: 20_000_000,
  },
});
const heasEntry = (id, owner = 'personA', securityValue = 90_000_000, date = '2030-07-01') => ({
  id, date, owner, type: 'HEAS_DRAW', params: { securityValue, fortnightlyAmount: 'maximum' }, enabled: true, createdAt: '2026-06-01',
});
const refinance = homeEntry('refi', 'MORTGAGE_REFINANCE', '2031-07-01', { openingBalance: 20_000_000, annualInterestRate: 0.06, monthlyRepayment: 150_000 });
const siblings = (a, b) => [scenario('root', null, []), scenario('a', 'root', a), scenario('b', 'root', b)];

test('two HEAS_DRAWs for one Person in SIBLING scenarios are accepted; in ONE scenario, own or inherited, refused', () => {
  const entries = [heasEntry('h1'), heasEntry('h2')];
  assert.equal(parsePlan(careFile(entries, siblings(['h1'], ['h2']))).entries.length, 2);
  assert.throws(() => parsePlan(careFile(entries, [scenario('root', null, ['h1', 'h2'])])), /is a SECOND HEAS_DRAW entry for Sam in one scenario/);
  assert.throws(() => parsePlan(careFile(entries, [scenario('root', null, ['h1']), scenario('kid', 'root', ['h2'])])), /is a SECOND HEAS_DRAW entry for Sam/);
});

test('a couple’s HEAS_DRAWs disagreeing on securityValue are accepted in SIBLINGS, refused in ONE scenario', () => {
  const entries = [heasEntry('h1', 'personA', 90_000_000), heasEntry('h2', 'personB', 80_000_000)];
  assert.equal(parsePlan(coupleFile(entries, siblings(['h1'], ['h2']))).entries.length, 2);
  assert.throws(() => parsePlan(coupleFile(entries, [scenario('root', null, ['h1', 'h2'])])), /cannot disagree about what it is worth/);
});

test('a MORTGAGE_REFINANCE after a HEAS_DRAW voids the NNEG only in its OWN scenario (T35)', () => {
  const entries = [heasEntry('h1'), refinance];
  assert.equal(parsePlan(careFile(entries, siblings(['h1'], ['refi']))).entries.length, 2);
  assert.throws(() => parsePlan(careFile(entries, [scenario('root', null, ['h1', 'refi'])])), /VOIDS the No Negative Equity Guarantee/);
  // Switched off in the scenario, the refinance is not in its walk and voids nothing.
  assert.equal(parsePlan(careFile(entries, [{ ...scenario('root', null, ['h1', 'refi']), entryOverrides: { refi: false } }])).entries.length, 2);
});

test('a HEAS_DRAW malformed on its own is still refused when switched on nowhere — the split kept that part pool-wide', () => {
  const offEverywhere = careFile([{ ...heasEntry('bad'), owner: 'household', enabled: false }], [scenario('root', null, [])]);
  assert.throws(() => parsePlan(offEverywhere), /the Home Equity Access Scheme is a loan PER PERSON/);
});

// The demo's personA holds one accumulation interest, index 0.
const sacrifice = (id, date) => ({ id, date, owner: 'personA', type: 'SUPER_CONTRIBUTION', params: { kind: 'salarySacrificed', annualAmount: 1_500_000, interestIndex: 0 }, enabled: true, createdAt: '2026-09-19' });
const stop = (id, date) => ({ id, date, owner: 'personA', type: 'SUPER_CONTRIBUTION', params: { kind: 'stopped' }, enabled: true, createdAt: '2026-09-19' });
const stopFile = (added, scenarios) => {
  const file = onDisk();
  const baseIds = file.scenarios[0].entryIds;
  file.entries.push(...added);
  file.scenarios = [scenario('root', null, baseIds), ...scenarios];
  file.activeScenarioId = 'root';
  return file;
};

test('a stop is read against the arrangements in ITS OWN scenario — both directions', () => {
  // Each sibling: an arrangement, then a stop. Over the pool, b's 2028 stop becomes a's governing
  // entry and a's 2029 stop "is itself a stop".
  const added = [sacrifice('sa', '2027-07-01'), stop('xa', '2029-01-01'), sacrifice('sb', '2027-07-01'), stop('xb', '2028-01-01')];
  assert.ok(parsePlan(stopFile(added, [scenario('a', 'root', ['sa', 'xa']), scenario('b', 'root', ['sb', 'xb'])])));
  assert.throws(() => parsePlan(stopFile(added, [scenario('a', 'root', ['sa', 'xa', 'sb', 'xb'])])), /is itself a stop/);
  // The other direction: a stop whose only arrangement is in a sibling stops nothing in its walk.
  const split = [sacrifice('sa', '2027-07-01'), stop('xb', '2029-01-01')];
  assert.throws(() => parsePlan(stopFile(split, [scenario('a', 'root', ['sa']), scenario('b', 'root', ['xb'])])), /no salary sacrifice running on that date/);
  // An inherited arrangement is running in the child.
  assert.ok(parsePlan(stopFile(split, [scenario('a', 'root', ['sa']), scenario('b', 'a', ['xb'])])));
  // And the 2026-09-21 ruling stands: the stop reads `date`, never `enabled` — an arrangement
  // switched off in the scenario still gives its stop something to stop.
  assert.ok(parsePlan(stopFile(split, [{ ...scenario('a', 'root', ['sa', 'xb']), entryOverrides: { sa: false } }])));
});
