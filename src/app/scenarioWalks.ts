// P7-1 — **WHICH ENTRIES A SCENARIO PROJECTS, and the correctness bug this module exists to
// close.** Until this file, `main.ts` and `planEdits.ts`'s save gate both walked
// `plan.entries` — the POOL. With one Baseline holding every id that is the same walk by
// coincidence, and it is the wrong walk the moment a second Scenario exists: the pool is the
// UNION of every Scenario's entries, so the page would have drawn "extend the mortgage" and
// "discharge it from super" *at the same time* and called it the active Scenario's forecast. A
// chart that quietly adds another Scenario's decisions to yours is exactly the confidently-wrong
// output this project is organised against, so the resolution is done in one place, here, and
// both callers go through it.
//
// **The order is `effectiveEntryIds`'s, not the pool's.** Ancestors first, each Scenario's own ids
// in the order it lists them, each id once at its most ancestral position (`plan.ts`). That order
// is load-bearing in `project()`: level entries are last-stated-winning and entries dated in the
// same month are bucketed in input order, so re-sorting the resolved ids by their position in the
// pool would silently let a parent's spending level beat the child's.
//
// **AND WHICH OF THEM ARE SWITCHED ON — also here, and for the same reason (2026-09-22).** Until
// that date the on/off switch wrote `enabled` on the ENTRY, in the shared pool, so switching a
// change off in the Scenario in front of you switched it off in every other Scenario that listed it.
// A Scenario now states its own overrides (`plan.ts`'s `EntryOverrides`) and `scenarioEntries`
// resolves them here, handing every consumer entries whose `enabled` is already the answer FOR THIS
// SCENARIO. That is what lets `projection.ts`, `outcomes.ts` and `sustainableSpend.ts` keep reading
// a plain `entry.enabled`: this module is the only place the pool's flag and a Scenario's statement
// about it are ever both in scope.
//
// **One walk per Scenario per redraw, and the count is assertable.** `project()` is ~14ms on the
// demo walk, so four Scenarios is ~58ms of the frame — acceptable, but only once each. The
// projector is an injected parameter defaulting to `project` so that
// `test/app-scenario-walks.test.mjs` can COUNT the calls: a redraw that projected a Scenario twice
// would still draw the right chart and would quietly double the cost, which is the kind of
// regression no output can show.
import { effectiveEntryIds, resolvedEntryEnabled, scenarioAncestry } from '../core/plan.js'; // `.js` is correct in a `.ts` file — see tsconfig.json
import { project } from '../core/projection.js';
import type { Entry, Month, Scenario } from '../core/plan.js';
import type { PlanFile } from '../core/parsePlan.js';

/**
 * The Scenario `id` names, or a bare `RangeError`. `parsePlan` already refuses a file whose
 * `activeScenarioId` names nothing, so an unresolved id arriving here is a defect in the caller
 * and not a fact about the user's file — the same reading `planWithEntryOverride` gets.
 */
export const scenarioById = (plan: PlanFile, id: string): Scenario => {
  const scenario = plan.scenarios.find((candidate) => candidate.id === id);
  if (scenario === undefined) {
    throw new RangeError(`no scenario with id "${id}" — a walk must name a scenario that is in the plan`);
  }
  return scenario;
};

/**
 * **The entries this Scenario actually projects: its resolved ids, looked up in the pool, in the
 * resolved order.** Never `plan.entries` — see the header.
 *
 * An id that names no entry is refused rather than skipped. `parsePlan` already refuses such a
 * file at the door, so this is unreachable from a plan on disk; skipping it would drop a decision
 * out of the forecast with nothing on screen to say so, which is the failure the door's own
 * refusal exists for.
 *
 * **Each entry's `enabled` is THIS SCENARIO'S answer, not the pool's** — `resolvedEntryEnabled`,
 * nearest statement in the chain wins. The pool's entry object is returned unchanged when the two
 * agree, so an untouched plan hands out the identical objects it always did.
 */
export const scenarioEntries = (plan: PlanFile, scenario: Scenario): readonly Entry[] =>
  effectiveEntryIds(scenario, plan.scenarios).map((id) => {
    const entry = plan.entries.find((candidate) => candidate.id === id);
    if (entry === undefined) {
      throw new RangeError(
        `scenario "${scenario.id}" names entry "${id}", and no entry in the plan has that id — the entries are one shared pool and a scenario adds them by reference`,
      );
    }
    const enabled = resolvedEntryEnabled(entry, scenario, plan.scenarios);
    return enabled === entry.enabled ? entry : { ...entry, enabled };
  });

/** The Scenario the plan says is active. `scenarioById` on `activeScenarioId`, said once. */
export const activeScenario = (plan: PlanFile): Scenario => scenarioById(plan, plan.activeScenarioId);

/**
 * **The ACTIVE Scenario's entries, resolved** — the list the journal table lists and the list the
 * focused chart was walked from, which are required to be the same list. `main.ts` and
 * `entryForm.ts` both call this rather than either one reaching for `plan.entries`: the pool is the
 * UNION of every Scenario's decisions, so a table drawn from it shows a user rows that are in
 * somebody else's plan and offers them a switch on each one.
 */
export const activeScenarioEntries = (plan: PlanFile): readonly Entry[] =>
  scenarioEntries(plan, activeScenario(plan));

/**
 * **Which of a Scenario's entries came from an ANCESTOR rather than from the Scenario itself.**
 *
 * Inheritance is live (`plan.ts`), so this is a fact about the plan as it stands now and not about
 * what was true when the Scenario was forked. The journal table marks these rows: a user looking at
 * a child Scenario needs to be able to tell which changes are its own and which are its parent's,
 * because the two behave differently when the parent is edited — and nothing about a row's date,
 * type or figures says which kind it is.
 */
export const inheritedEntryIds = (plan: PlanFile, scenario: Scenario): ReadonlySet<string> => {
  const own = new Set(scenario.entryIds);
  const inherited = new Set<string>();
  for (const link of scenarioAncestry(scenario, plan.scenarios)) {
    if (link.id === scenario.id) continue;
    for (const id of link.entryIds) if (!own.has(id)) inherited.add(id);
  }
  return inherited;
};

/**
 * **Which ancestor each inherited entry came from, by name** — the id of the entry to the name of
 * the NEAREST ancestor Scenario that lists it.
 *
 * `inheritedEntryIds` says only *that* a row is inherited, which a border down its left edge can
 * state but cannot explain; a reader who has not been told what the border means reads it as
 * decoration (user, 2026-09-22). Naming the ancestor is what makes the mark self-describing, and it
 * is the fact the reader actually needs: "this change is Baseline's, and editing it there will move
 * this scenario too".
 *
 * *Nearest, not the root.* Where a chain is more than two deep the same id can be listed by more
 * than one ancestor, and the one worth naming is the closest — that is the Scenario whose edit
 * reaches here first, and the one a reader would go to. The walk is root-first, so a later link
 * overwrites an earlier one and the last write is the nearest.
 *
 * The Scenario's own entries are absent from the map, exactly as they are from `inheritedEntryIds`.
 */
export const inheritedEntrySources = (plan: PlanFile, scenario: Scenario): ReadonlyMap<string, string> => {
  const own = new Set(scenario.entryIds);
  const sources = new Map<string, string>();
  for (const link of scenarioAncestry(scenario, plan.scenarios)) {
    if (link.id === scenario.id) continue;
    for (const id of link.entryIds) if (!own.has(id)) sources.set(id, link.name);
  }
  return sources;
};

/** Every Scenario's walk, and which of them the plan says is active. */
export interface ScenarioWalks {
  /** `activeScenarioId`'s own walk — the one the focused chart and the table are drawn from. */
  readonly active: readonly Month[];
  /** One walk per Scenario in the plan, by id. Exactly `plan.scenarios.length` members. */
  readonly byScenarioId: ReadonlyMap<string, readonly Month[]>;
}

/** What `scenarioWalks` calls to walk one Scenario. `project`, except under a test that counts. */
export type Projector = (
  settings: PlanFile['settings'],
  household: PlanFile['household'],
  entries: readonly Entry[],
) => readonly Month[];

/**
 * **Every Scenario in the plan, walked EXACTLY ONCE, from its own resolved entries.**
 *
 * The active Scenario is not walked a second time to fill `active`: it is the same array object the
 * map holds, so the focused chart and the comparison chart cannot disagree about the Scenario they
 * are both drawing.
 *
 * The Household and the Settings are shared by every Scenario (ADR-0002), so every walk covers the
 * identical forecast window and the series line up index for index — `comparisonSeries` checks that
 * rather than assuming it.
 */
export const scenarioWalks = (plan: PlanFile, projector: Projector = project): ScenarioWalks => {
  const byScenarioId = new Map<string, readonly Month[]>();
  for (const scenario of plan.scenarios) {
    byScenarioId.set(scenario.id, projector(plan.settings, plan.household, scenarioEntries(plan, scenario)));
  }
  const active = byScenarioId.get(plan.activeScenarioId);
  if (active === undefined) {
    throw new RangeError(
      `no scenario with id "${plan.activeScenarioId}" — activeScenarioId must name a scenario that is in the plan`,
    );
  }
  return Object.freeze({ active, byScenarioId });
};
