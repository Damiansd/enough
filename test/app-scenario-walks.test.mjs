// P7-1 §A — **WHICH ENTRIES GET PROJECTED.** This suite exists because the page had a live
// correctness bug: `main.ts` and `planEdits.ts`'s save gate both walked `plan.entries`, the POOL,
// which is the UNION of every Scenario's entries. With one Baseline holding everything that is the
// same walk by coincidence — which is why nothing caught it — and it is the wrong walk the moment a
// second Scenario exists, which P7-1 creates.
//
// §1 is the assertion the fix is for: on a two-Scenario plan the active Scenario's walk is NOT the
// pool's walk, and it IS the walk of its own resolved entries, re-derived here rather than taken
// from the module under test.
//
// **The fixture is the committed demo plan plus ONE entry in a child Scenario** — a $250,000
// one-off expense dated 2030-03, chosen because it moves 158 of the 501 months. The final month is
// **bit-identical** on both walks ($5,681,503.87): this engine's terminal wealth has been
// insensitive to every edit type tried on this fixture, so every assertion below is made ACROSS the
// walk and never on its last month.
//
// Nothing here reads `~/.enough` — no path in it is spelled.
import test from 'node:test';
import assert from 'node:assert/strict';

import { DEMO_PLAN } from '../dist/app/demoHousehold.js';
import { parsePlan } from '../dist/core/parsePlan.js';
import { project } from '../dist/core/projection.js';
import { effectiveEntryIds } from '../dist/core/plan.js';
import { inheritedEntryIds, inheritedEntrySources, scenarioById, scenarioEntries, scenarioWalks } from '../dist/app/scenarioWalks.js';

/** The one entry the child Scenario adds. $250,000 out, dated inside the walk. */
const BIG_SPEND = Object.freeze({
  id: 'extra-1',
  date: '2030-03-01',
  type: 'ONE_OFF_EXPENSE',
  owner: 'household',
  params: { amount: 250_000_00 },
  enabled: true,
  createdAt: '2026-09-19',
});

/** The demo plan with a child Scenario adding one entry. `active` picks which Scenario is active. */
const twoScenarioPlan = (active = 'baseline') =>
  parsePlan(
    JSON.parse(
      JSON.stringify({
        ...DEMO_PLAN,
        entries: [...DEMO_PLAN.entries, BIG_SPEND],
        scenarios: [...DEMO_PLAN.scenarios, { id: 'child', name: 'Big spend', parentId: 'baseline', entryIds: [BIG_SPEND.id] }],
        activeScenarioId: active,
      }),
    ),
  );

/** The walk a Scenario ought to have, re-derived here from `effectiveEntryIds` and the pool. */
const expectedWalk = (plan, id) => {
  const scenario = plan.scenarios.find((one) => one.id === id);
  const ids = effectiveEntryIds(scenario, plan.scenarios);
  return project(plan.settings, plan.household, ids.map((entryId) => plan.entries.find((entry) => entry.id === entryId)));
};

const totals = (months) => months.map((month) => month.protectedAssets + month.assessableAssets);
const differingMonths = (a, b) => a.filter((value, index) => value !== b[index]).length;

const thrown = (fn) => {
  try { fn(); } catch (error) { return error; }
  return assert.fail('nothing was thrown');
};

// --- §0 The fixture separates the three walks at all ----------------------------------------------

test('the fixture is sensitive: the pool walk, the baseline walk and the child walk are three different things', () => {
  const plan = twoScenarioPlan();
  const pool = totals(project(plan.settings, plan.household, plan.entries));
  const baseline = totals(expectedWalk(plan, 'baseline'));
  const child = totals(expectedWalk(plan, 'child'));
  assert.equal(baseline.length, 501);
  // **458 months where it was 158 (2026-09-19):** Waterfall limb 5 spends the released super both
  // walks hold, so they no longer converge on a broke household from index 200.
  // **AND 309 SINCE REGISTER O85 (2026-09-21):** the stated spending level is REAL now, both walks
  // outlive their money, and the 149 months after 2055-12 are months in which neither holds
  // anything to differ by. The fixture is still sensitive across 309 of its 501 months.
  assert.equal(158, 158, 'the pre-limb-5 count, kept beside the new one');
  assert.equal(458, 458, 'the pre-O85 count, kept beside the new one');
  // ⚠️ **AND ONE MONTH EARLIER AGAIN ON THE SAME DAY (P10-5).** The demo plan is stated as at
  // 1 September, and until then the engine paid no Account-Based Pension minimum before the
  // following 1 July — a nil with no clause behind it in SIS Reg Sch 7. Ash's pension pays that
  // opening part-year now, the money is drawn and spent ten months sooner, and every exhaustion
  // downstream of it arrives one month sooner.
  assert.equal(309, 309, 'the pre-P10-5 count, kept beside the new one');
  // ⚠️ **AND 458 AGAIN SINCE 2026-09-23.** A plan with no series now INDEXES the Age Pension on its
  // own growth rates instead of carrying the 2026 sets; neither walk runs out, so the added entry
  // moves every month from its own to the horizon.
  assert.equal(308, 308, 'the pre-2026-09-23 count, kept beside the new one');
  assert.equal(differingMonths(baseline, child), 458, 'the added entry moves 458 months — if it moves none, every assertion below is vacuous');
  // The pool is the UNION, so it agrees with the child and not with the Baseline. That is exactly
  // why projecting the pool looked correct while there was one Scenario.
  assert.deepEqual(pool, child);
  assert.notDeepEqual(pool, baseline);
  // ⚠️ **The trap this suite is written around — the LAST month used to be identical on all three,
  // and on this fixture it no longer is.** The child's released super is exhausted before the
  // horizon and the Baseline's is not. Every assertion in this file is still written over the WHOLE
  // walk rather than on the last month, because that is a property of this fixture's balances and
  // not a property of the code: a household one dollar poorer ends both walks at nil again.
  // ⚠️ **AND SINCE O85 IT IS IDENTICAL ON ALL THREE AGAIN — the trap has closed back over.** Both
  // walks spend a target that rises with prices, both run out, and both end at nil: the sentence
  // below ("a household one dollar poorer ends both walks at nil again") has come true on this very
  // fixture. Every assertion in this file is written over the WHOLE walk for exactly this reason.
  // ⚠️ **AND SINCE 2026-09-23 IT HAS OPENED AGAIN: the indexed Age Pension keeps both households
  // solvent to the horizon, and they end $507,565.04 apart.** The rule does not move with it.
  assert.notEqual(baseline.at(-1), child.at(-1));
  // ⚠️ **AND BOTH MOVED UP WITH INTEREST ON CASH (2026-09-23): the baseline by $27,297.72 to
  // $1,291,292.18 and the child by $42,617.58 to $799,047.00.** The cash earns the plan's 2.5% CPI.
  // Over the baseline walk that is $25,696.99 of interest and $1,144.95 more income tax (Dana's, while
  // she works), and $37,642.18 LESS Age Pension, because the money it leaves behind is assessed. The
  // sum of those flows is negative; terminal wealth rises anyway because the interest arrives early
  // and is spent first, sparing pension-account draws that then compound at 6.5% for decades, while
  // the pension it costs is lost late. The child's spend empties its cash in 2030, so it earns less
  // interest ($19,471.51) and loses less pension ($22,672.24) against the same tax. The direction is
  // the one a household with interest income must have; the size is that decomposition.
  // ⚠️ **AND BOTH FELL WITH THE SWITCH AT RETIREMENT (2026-09-23): the baseline to $507,268.78 and
  // the child to NIL.** Dana's account becomes an account-based pension at her RETIRE; limb 2 spends
  // it before the parcels and the Offset, and each June's unspent minimum is swept into an Offset that
  // is then never drawn, earning 2.5% instead of 6.5%. The flows are decomposed in
  // `app-comparison-series.test.mjs`, on this same pair of walks; the child runs out from 2067-03.
  // The two still end apart, so the assertion above stands.
  assert.equal(129_129_218, 129_129_218, 'the pre-switch baseline terminal figure, kept beside the new one');
  assert.equal(79_904_700, 79_904_700, 'the pre-switch child terminal figure, kept beside the new one');
  // ⚠️ **AND BOTH ROSE WITH "SPEND CASH FIRST" (later on 2026-09-23): the baseline to $921,573.75 and
  // the child from NIL to $472,110.72.** Cash not offsetting a home loan is spent straight after the
  // pension minimums and the pensions above them are drawn after the parcels, so the minimums no
  // longer pile up in cash at 2.5%. Decomposed in `app-comparison-series.test.mjs`, on this same pair.
  assert.equal(50_726_878, 50_726_878, 'the pre-order baseline terminal figure, kept beside the new one');
  // ⚠️ **AND BOTH ROSE AGAIN WHEN DANA'S RETIREMENT MONTH BEGAN PAYING HER DAYS WORKED (2026-09-23)**,
  // by $2,629.50 and $3,122.19: May 2031 pays 14/31 of her month. Decomposed flow by flow in
  // `app-comparison-series.test.mjs`, on this same pair.
  // ⚠️ **AND AGAIN SINCE PAY RISES WITH WAGES (2026-09-23)**, by $23,614.20 and $36,833.04: Dana's
  // pay rises 3.5% a year until she retires. Decomposed flow by flow in
  // `app-comparison-series.test.mjs`, on this same pair.
  // ⚠️ **AND BOTH ROSE AGAIN WITH T135 (2026-09-24): the baseline by $416.84 and the child by
  // $490.08.** The assets excess now floors to the nearest $500 (SSA 1991 s1064 point 1064-G7)
  // instead of taxing it continuously, so the Age Pension both walks are paid in every month the
  // assets test binds is a few cents to a few dollars higher, and 41+ years of that compounds.
  // ⚠️ **AND THE BASELINE FELL BY $4,492.19 WITH DIV 119 (LR-1 slice 3, 2026-09-29); the child did
  // not move.** Dana's sales from 2033 pay the minimum tax; the child sold everything in 2030 while
  // she still worked, above the 30% band's floor. Decomposed in `app-comparison-series.test.mjs`.
  assert.equal(baseline.at(-1), 92_157_375 + 262_950 + 2_361_420 + 41_684 - 449_219);
  // ⚠️ **AND THE CHILD FELL BY $1,764.87 WITH THE CGT REFORM FROM 1 JULY 2027 (LR-1 slice 2,
  // 2026-09-29)**: $892.61 more tax on its 2030-03 sale of Dana's parcel, and that sum not
  // compounding. Worked in `app-comparison-series.test.mjs`, on this same pair.
  assert.equal(child.at(-1), 47_211_072 + 312_219 + 3_683_304 + 49_008 - 176_487);
  assert.equal(126_399_446, 126_399_446, 'the pre-interest baseline terminal figure, kept beside the new one');
  assert.equal(75_642_942, 75_642_942, 'the pre-interest child terminal figure, kept beside the new one');
  assert.equal(0, 0, 'the O85 terminal figure for both, kept beside the new ones');
  assert.equal(568150387, 568150387, 'the pre-limb-5 terminal figure, kept beside the new one');
  // **$1,053,272.12 since P6-8 brief 3 chunk 2b, where it was $596,062.73.** The $457,209.39 between
  // them is Dana's employer Superannuation Guarantee: $57,223.92 by 2035-05 (re-derived from her own
  // salary in `app-months-to-series.test.mjs` §1), compounding at the walk's 6.5% for the thirty-
  // three years to 2068-05 — 1.065^33 is 7.99, and 7.99 × $57,223.92 is $457,219, which is this
  // figure to within the month-by-month flooring.
  assert.equal(59606273, 59606273, 'the pre-Guarantee terminal figure, kept beside the new one');
  // **AND $1,651,662.20 SINCE 2026-09-21 (P4-1e), where it was $1,053,272.12.** The Age Pension is
  // paid past the published window, so this Household spends less of its own capital and the rest
  // compounds: $598,390.08 more at the horizon. The child walk ends at $741,667.34 where it used to
  // end at NIL, for the same reason — a household that has spent its capital still has an income
  // now, so 'broke' is no longer an absorbing state either walk can reach.
  assert.equal(105327212, 105327212, 'the pre-P4-1e terminal figure, kept beside the new one');
  assert.equal(165166220, 165166220, 'the pre-O85 terminal figure for the Baseline, kept beside the new one');
  assert.equal(74166734, 74166734, 'and the pre-O85 one for the child');
});

// --- §1 The ACTIVE scenario is projected, and the union is not (mutation (a)) ----------------------

test('scenarioWalks projects the ACTIVE scenario, not the entry pool', () => {
  const plan = twoScenarioPlan('baseline');
  const walks = scenarioWalks(plan);
  const pool = totals(project(plan.settings, plan.household, plan.entries));
  assert.deepEqual(totals(walks.active), totals(expectedWalk(plan, 'baseline')));
  assert.notDeepEqual(totals(walks.active), pool, 'the active walk is the union of every scenario’s entries');
  assert.equal(differingMonths(totals(walks.active), pool), 458); // 308 until 2026-09-23 — see §0
});

test('and it follows activeScenarioId rather than array position — the same plan, the other scenario active', () => {
  const plan = twoScenarioPlan('child');
  const walks = scenarioWalks(plan);
  assert.deepEqual(totals(walks.active), totals(expectedWalk(plan, 'child')));
  assert.notDeepEqual(totals(walks.active), totals(expectedWalk(plan, 'baseline')));
});

test('every scenario is walked, each from its own resolved entries', () => {
  const plan = twoScenarioPlan();
  const walks = scenarioWalks(plan);
  assert.deepEqual([...walks.byScenarioId.keys()], ['baseline', 'child']);
  for (const id of ['baseline', 'child']) {
    assert.deepEqual(totals(walks.byScenarioId.get(id)), totals(expectedWalk(plan, id)), `scenario ${id}`);
  }
  // `active` is the same ARRAY, not a second projection of the same Scenario.
  assert.equal(walks.active, walks.byScenarioId.get('baseline'));
});

// --- §2 One projection per scenario per redraw (mutation (d)) -------------------------------------

test('a redraw projects each scenario EXACTLY ONCE — the count, not an estimate', () => {
  const plan = twoScenarioPlan();
  const calls = [];
  const spy = (settings, household, entries) => {
    calls.push(entries.map((entry) => entry.id));
    return project(settings, household, entries);
  };
  const walks = scenarioWalks(plan, spy);
  assert.equal(calls.length, plan.scenarios.length);
  assert.equal(calls.length, 2, 'two scenarios, two projections — a third call is a scenario walked twice');
  // And the two calls were handed DIFFERENT entry lists, in the resolved order: a count of two
  // calls that both walked the pool would be the original bug with the right arithmetic.
  assert.deepEqual(calls[0], effectiveEntryIds(scenarioById(plan, 'baseline'), plan.scenarios));
  assert.deepEqual(calls[1], effectiveEntryIds(scenarioById(plan, 'child'), plan.scenarios));
  assert.notDeepEqual(calls[0], calls[1]);
  assert.deepEqual(totals(walks.active), totals(expectedWalk(plan, 'baseline')));
});

test('six scenarios is six projections, never more', () => {
  const base = twoScenarioPlan();
  const plan = parsePlan(
    JSON.parse(
      JSON.stringify({
        ...base,
        scenarios: [
          ...base.scenarios,
          ...[3, 4, 5, 6].map((n) => ({ id: `s${n}`, name: `Scenario ${n}`, parentId: 'baseline', entryIds: [] })),
        ],
      }),
    ),
  );
  let count = 0;
  scenarioWalks(plan, (settings, household, entries) => {
    count += 1;
    return project(settings, household, entries);
  });
  assert.equal(count, 6);
});

// --- §3 Resolution: the order, and the two refusals ------------------------------------------------

test('a child’s entries are its ancestors’ first, then its own, looked up in the pool', () => {
  const plan = twoScenarioPlan();
  const entries = scenarioEntries(plan, scenarioById(plan, 'child'));
  assert.deepEqual(entries.map((entry) => entry.id), [...DEMO_PLAN.entries.map((entry) => entry.id), BIG_SPEND.id]);
  // Every one of them is the pool's own object — nothing here copies or rewrites an entry.
  for (const entry of entries) assert.ok(plan.entries.includes(entry));
});

test('a scenario id nobody holds is refused, on both doors', () => {
  const plan = twoScenarioPlan();
  assert.match(thrown(() => scenarioById(plan, 'nope')).message, /^no scenario with id "nope"/);
  assert.ok(thrown(() => scenarioById(plan, 'nope')) instanceof RangeError);
  assert.match(
    thrown(() => scenarioWalks({ ...plan, activeScenarioId: 'nope' })).message,
    /^no scenario with id "nope" — activeScenarioId/,
  );
});

test('an entryId naming no entry is REFUSED, never silently dropped from the walk', () => {
  const plan = twoScenarioPlan();
  // Hand-built past `parsePlan`, which refuses this at the file boundary: the point is that the
  // resolver does not quietly project a shorter journal if one ever reached it.
  const broken = { ...plan, scenarios: [{ id: 'baseline', name: 'B', parentId: null, entryIds: ['ghost'] }], activeScenarioId: 'baseline' };
  const error = thrown(() => scenarioEntries(broken, broken.scenarios[0]));
  assert.ok(error instanceof RangeError);
  assert.match(error.message, /names entry "ghost", and no entry in the plan has that id/);
});

// --- §4 SWITCHING A CHANGE OFF IS PER SCENARIO (2026-09-22) ---------------------------------------
//
// ⚠️ **THE PROPERTY THIS SUITE WAS MISSING, AND THE DEFECT IT DID NOT CATCH.** Until today the
// on/off toggle wrote `enabled: false` on the ENTRY, in the shared pool. §1 above proves the right
// ENTRIES are projected; nothing anywhere proved anything about which entries are switched ON, so a
// user could pick a scenario with its radio, switch a change off, and silently switch it off in
// every other scenario that listed it — including the one they had built to compare against, whose
// chart line then moved without a single word on screen about it.
//
// The property is asserted twice because there are two shapes of "another scenario" and they fail
// differently: two SIBLING ROOTS listing the same entry (which must not move each other at all),
// and a PARENT and its CHILD (where the parent must reach the child — that is inheritance working —
// and the child must NOT reach the parent, and must be able to say the opposite of it).
//
// Each case is measured on a DIGEST of the whole walk, not on terminal wealth: this engine's final
// month has been insensitive to every edit tried on this fixture (see the header).
import { createHash } from 'node:crypto';
import { planWithEntryOverride } from '../dist/app/planEdits.js';
import { resolvedEntryEnabled } from '../dist/core/plan.js';

const digest = (months) => createHash('sha256').update(JSON.stringify(months)).digest('hex');
const walkOf = (plan, id) => digest(project(plan.settings, plan.household, scenarioEntries(plan, scenarioById(plan, id))));

/** The entry both scenarios below switch: the demo plan's spending level, which moves every month. */
const LEVEL = 'spend-2026';

/** Two ROOT scenarios, each listing every entry in the pool. Neither is an ancestor of the other. */
const siblingPlan = (active = 'baseline') =>
  parsePlan(JSON.parse(JSON.stringify({
    ...DEMO_PLAN,
    scenarios: [
      ...DEMO_PLAN.scenarios,
      { id: 'sibling', name: 'The other one', parentId: null, entryIds: DEMO_PLAN.entries.map((entry) => entry.id) },
    ],
    activeScenarioId: active,
  })));

const off = (plan, scenarioId, entryId) => parsePlan(planWithEntryOverride(plan, scenarioId, entryId, false));
const on = (plan, scenarioId, entryId) => parsePlan(planWithEntryOverride(plan, scenarioId, entryId, true));

test('the fixture is sensitive: switching the spending level off moves the walk it is switched off in', () => {
  const plan = siblingPlan();
  assert.notEqual(walkOf(off(plan, 'baseline', LEVEL), 'baseline'), walkOf(plan, 'baseline'), 'the toggle reached no month — every assertion below would be vacuous');
  // Both siblings start from the same place, so "unchanged" below is a real claim about one of them
  // and not an artefact of the two never having agreed.
  assert.equal(walkOf(plan, 'sibling'), walkOf(plan, 'baseline'));
});

test('switching a change off in one ROOT scenario leaves its SIBLING’s projection untouched', () => {
  const plan = siblingPlan();
  const edited = off(plan, 'baseline', LEVEL);

  assert.equal(walkOf(edited, 'sibling'), walkOf(plan, 'sibling'), 'switching a change off in one scenario moved another scenario’s forecast');
  // And the entry itself is unmoved in the pool, which is the mechanism: there is no second place
  // the sibling could be reading a flipped flag from.
  assert.deepEqual(edited.entries, plan.entries);
});

test('the two siblings can hold OPPOSITE answers about one shared entry at the same time', () => {
  const plan = siblingPlan();
  const both = off(off(plan, 'baseline', LEVEL), 'sibling', LEVEL);
  const split = on(both, 'sibling', LEVEL);

  assert.notEqual(walkOf(split, 'baseline'), walkOf(split, 'sibling'), 'the two scenarios agree, so one of them is not stating its own answer');
  assert.equal(walkOf(split, 'sibling'), walkOf(plan, 'sibling'), 'the scenario that switched it back on is not back where it started');
  assert.equal(walkOf(split, 'baseline'), walkOf(off(plan, 'baseline', LEVEL), 'baseline'));
});

test('switching a change off in a CHILD leaves its PARENT untouched — and the parent still reaches the child', () => {
  const plan = twoScenarioPlan();
  assert.equal(scenarioById(plan, 'child').parentId, 'baseline');

  // Child → parent: nothing.
  const childOff = off(plan, 'child', LEVEL);
  assert.equal(walkOf(childOff, 'baseline'), walkOf(plan, 'baseline'), 'a child switched a change off in its parent’s forecast');
  assert.notEqual(walkOf(childOff, 'child'), walkOf(plan, 'child'), 'the child’s own forecast did not move');

  // Parent → child: everything. This is inheritance working, and it is the direction that MUST
  // still cross — a child that ignored its parent's answer would be the copy-on-write fork ADR-0002
  // refuses, arriving by the back door.
  const parentOff = off(plan, 'baseline', LEVEL);
  assert.notEqual(walkOf(parentOff, 'child'), walkOf(plan, 'child'), 'the parent’s switch did not reach the child — inheritance is broken');
  assert.equal(walkOf(parentOff, 'child'), walkOf(childOff, 'child'), 'off in the parent and off in the child are not the same walk for the child');
});

test('a CHILD can switch an inherited change back ON — the NEAREST statement wins', () => {
  // The case a disable-only list cannot express, and the reason the override is a boolean map: the
  // parent says "stop spending at that level", the child asks "what if I do not".
  const plan = twoScenarioPlan();
  const parentOff = off(plan, 'baseline', LEVEL);
  const childBackOn = on(parentOff, 'child', LEVEL);

  assert.equal(walkOf(childBackOn, 'baseline'), walkOf(parentOff, 'baseline'), 'the child’s answer reached its parent');
  assert.equal(walkOf(childBackOn, 'child'), walkOf(plan, 'child'), 'the child did not get the entry back');
  assert.notEqual(walkOf(childBackOn, 'child'), walkOf(childBackOn, 'baseline'));
  // Both statements are in the file at once — the child's is not written by deleting the parent's.
  assert.equal(childBackOn.scenarios.find((one) => one.id === 'baseline').entryOverrides[LEVEL], false);
  assert.equal(childBackOn.scenarios.find((one) => one.id === 'child').entryOverrides[LEVEL], true);
});

test('the resolver itself: nearest statement wins, and an absent one is not `false`', () => {
  const plan = twoScenarioPlan();
  const entry = plan.entries.find((one) => one.id === LEVEL);
  const chain = (overrides) =>
    plan.scenarios.map((one) => (overrides[one.id] === undefined ? one : { ...one, entryOverrides: overrides[one.id] }));

  const stated = (overrides, id) => {
    const scenarios = chain(overrides);
    return resolvedEntryEnabled(entry, scenarios.find((one) => one.id === id), scenarios);
  };

  // Nothing said anywhere: the entry's own flag, which is what every plan file written before this
  // field existed says about every entry it holds.
  assert.equal(stated({}, 'child'), entry.enabled);
  assert.equal(stated({}, 'baseline'), entry.enabled);
  // An EMPTY map is the same claim as no map at all — "this scenario states nothing".
  assert.equal(stated({ child: {} }, 'child'), entry.enabled);
  // A statement about a DIFFERENT entry is not a statement about this one.
  assert.equal(stated({ child: { 'not-this-entry': false } }, 'child'), entry.enabled);
  // The ancestor's, when the child says nothing; the child's, when it says anything at all.
  assert.equal(stated({ baseline: { [LEVEL]: false } }, 'child'), false);
  assert.equal(stated({ baseline: { [LEVEL]: false }, child: { [LEVEL]: true } }, 'child'), true);
  assert.equal(stated({ baseline: { [LEVEL]: true }, child: { [LEVEL]: false } }, 'child'), false);
  // And the child's statement never reaches upwards.
  assert.equal(stated({ child: { [LEVEL]: false } }, 'baseline'), entry.enabled);
});

test('a scenario’s resolved entries carry ITS answer, and the pool’s objects are reused when they agree', () => {
  const plan = off(twoScenarioPlan(), 'child', LEVEL);
  const childEntries = scenarioEntries(plan, scenarioById(plan, 'child'));
  const baselineEntries = scenarioEntries(plan, scenarioById(plan, 'baseline'));

  assert.equal(childEntries.find((entry) => entry.id === LEVEL).enabled, false);
  assert.equal(baselineEntries.find((entry) => entry.id === LEVEL).enabled, true);
  assert.equal(plan.entries.find((entry) => entry.id === LEVEL).enabled, true);
  // Only the overridden entry is a new object; every other one is the pool's own, so an untouched
  // scenario hands the engine exactly what it always did.
  for (const entry of baselineEntries) assert.ok(plan.entries.includes(entry));
  assert.equal(childEntries.filter((entry) => !plan.entries.includes(entry)).length, 1);
});

// --- §5 The file boundary: an absent override map is INHERIT, and round-trips ----------------------

test('a plan file with no entryOverrides anywhere round-trips byte-identical', () => {
  // The migration question: every plan.json on disk today was written before this field existed.
  const before = JSON.stringify(parsePlan(DEMO_PLAN), null, 2);
  assert.equal(JSON.stringify(parsePlan(JSON.parse(before)), null, 2), before);
  assert.doesNotMatch(before, /entryOverrides/, 'the parser invented a key the file did not have');
});

test('switching a change off and back on again leaves the FILE as it was, not merely the forecast', () => {
  const plan = siblingPlan();
  const there = off(plan, 'baseline', LEVEL);
  const back = on(there, 'baseline', LEVEL);

  assert.match(JSON.stringify(there), /entryOverrides/);
  assert.deepEqual(back, plan);
  assert.doesNotMatch(JSON.stringify(back), /entryOverrides/, 'the reversal left a statement behind — the file now carries one per click');
});

test('an override naming no entry in the pool is REFUSED at the door, with the id in the message', () => {
  const plan = siblingPlan();
  const broken = {
    ...plan,
    scenarios: plan.scenarios.map((one) => (one.id === 'baseline' ? { ...one, entryOverrides: { ghost: false } } : one)),
  };
  assert.match(thrown(() => parsePlan(JSON.parse(JSON.stringify(broken)))).message, /entryOverrides."ghost" names no entry in the file/);
});

test('an override value that is not a boolean is REFUSED — a "false" string is not a switch', () => {
  const plan = siblingPlan();
  const broken = {
    ...plan,
    scenarios: plan.scenarios.map((one) => (one.id === 'baseline' ? { ...one, entryOverrides: { [LEVEL]: 'false' } } : one)),
  };
  assert.match(thrown(() => parsePlan(JSON.parse(JSON.stringify(broken)))).message, new RegExp(`entryOverrides.${LEVEL} is string "false"`));
});

// §6 — **WHERE AN INHERITED ROW CAME FROM.** The table marks inherited rows with a border down the
// left edge, and a user read that border as decoration (2026-09-22): a mark that says "this row is
// different" without saying HOW leaves the reader to invent a meaning. `inheritedEntrySources`
// names the ancestor, so the row explains its own mark. Pure, so it is testable here even though
// the markup that consumes it is not.

test('an inherited row names the scenario it came from, and a scenario’s OWN rows name nobody', () => {
  const plan = siblingPlan();
  const child = parsePlan(JSON.parse(JSON.stringify({
    ...plan,
    scenarios: [...plan.scenarios, { id: 'child', name: 'Baseline (copy)', parentId: 'baseline', entryIds: [] }],
  })));

  const sources = inheritedEntrySources(child, scenarioById(child, 'child'));
  assert.equal(sources.get(LEVEL), 'Baseline', 'an inherited entry did not name the scenario it is inherited from');
  // The parent's view of its own entries: inherited from nobody, so the table marks nothing.
  assert.equal(inheritedEntrySources(child, scenarioById(child, 'baseline')).size, 0);
});

test('a three-deep chain names the NEAREST ancestor, not the root', () => {
  const plan = siblingPlan();
  // `middle` re-lists the entry itself, so both it and the root are ancestors that hold the id. The
  // one worth naming is the closer of the two: it is the scenario whose edit reaches here first.
  const deep = parsePlan(JSON.parse(JSON.stringify({
    ...plan,
    scenarios: [
      ...plan.scenarios,
      { id: 'middle', name: 'The middle one', parentId: 'baseline', entryIds: [LEVEL] },
      { id: 'leaf', name: 'The far one', parentId: 'middle', entryIds: [] },
    ],
  })));

  assert.equal(inheritedEntrySources(deep, scenarioById(deep, 'leaf')).get(LEVEL), 'The middle one');
});

test('the sources map and the inherited-id set agree about which rows are inherited', () => {
  // Two functions answering halves of one question; the table asks both, once per redraw, and a row
  // bordered as inherited with no name beside it is exactly the state the user reported.
  const plan = siblingPlan();
  const child = parsePlan(JSON.parse(JSON.stringify({
    ...plan,
    scenarios: [...plan.scenarios, { id: 'child', name: 'Baseline (copy)', parentId: 'baseline', entryIds: [] }],
  })));

  for (const id of ['child', 'baseline', 'sibling']) {
    const scenario = scenarioById(child, id);
    assert.deepEqual(
      [...inheritedEntrySources(child, scenario).keys()].sort(),
      [...inheritedEntryIds(child, scenario)].sort(),
      `the border and the label disagree about ${id}`,
    );
  }
});
