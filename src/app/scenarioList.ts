// P6-7 — the Scenario list: **create, clone, rename, delete**. Four pure functions over
// a `readonly Scenario[]`, in `planEdits.ts`'s idiom: no DOM, no `fetch`, no `crypto`, no clock.
// The caller supplies the new id, puts the result back on the plan, and sends it through
// `savePlan` — **there is no second write path, and nothing here writes anything.**
//
// ⚠️ **A CLONE STARTS EMPTY, AND THAT IS THE WHOLE OF "INHERITANCE BY REFERENCE, NEVER A COPY"**
// (ADR-0002, ADR-0006, user ruling 2026-09-19). `scenarioCloned` sets `parentId` to the source and
// gives the new Scenario **no entry ids at all**. It is not a partial implementation waiting for
// someone to fill the array in: copying the source's ids is the defect. ADR-0002's own
// justification is that comparing "extend the mortgage" against "extend the mortgage *and*
// discharge it from super" requires the two to **provably** share the first change — with copied
// ids they merely happen to agree, and they drift apart silently the first time the source is
// edited. Resolution is live (`effectiveEntryIds`), so an entry added to the source tomorrow is in
// the clone's projection tomorrow, and the clone's own list is exactly what it adds on top.
//
// **Every refusal here is a bare `RangeError`, deliberately.** These are programming errors in the
// writer — an id it made up, a duplicate it generated, a blank name it did not check — and not
// facts about the user's file, which is what a named refusal under ruling R8 is for. The same
// reading `planWithEntryOverride` gets.
//
// ⚠️ **DELETE IS FOR SCENARIOS AND FOR NOTHING ELSE (user ruling, 2026-09-19).** A Scenario is a
// CONTAINER — a name, a parent and a list of ids it adds on top — and never a record of a decision,
// so removing one destroys no history and does not touch ADR-0002's append-only journal:
// `scenarioDeleted` is a function over a `readonly Scenario[]` and the entry pool is not one of its
// arguments, which is the structural form of "your entries are still there". The
// append-only-safe delete for an ENTRY is still `enabled: false`, and there is no function here or
// anywhere that removes one. Nothing here reorders the list either: `activeScenarioId` exists
// precisely so that position carries no meaning.
//
// The three cases a delete has to answer are ruled, not designed here: a Scenario with children is
// REFUSED (a dangling `parentId` makes the file unreadable, and re-parenting the grandchildren
// would move entries between Scenarios behind the user's back), the last remaining Scenario is
// REFUSED (`parsePlan` holds that a plan file has at least one, so this would write a file that
// cannot be read back), and deleting the ACTIVE Scenario MOVES `activeScenarioId` — to the deleted
// one's parent if it has one, otherwise to the first Scenario left — and says so out loud.
import type { Scenario } from '../core/plan.js'; // `.js` is correct in a `.ts` file — see tsconfig.json

/** Every id currently in use. `parentId` and `activeScenarioId` both resolve by id, so they are unique. */
const idsOf = (scenarios: readonly Scenario[]): Set<string> => new Set(scenarios.map((scenario) => scenario.id));

/**
 * The checks the three share. A blank name is refused as well as a duplicate id: a Scenario is
 * chosen from a list by its name, and an unnamed row is one a user cannot tell from another.
 */
const checkNewScenario = (scenarios: readonly Scenario[], id: string, name: string): void => {
  if (idsOf(scenarios).has(id)) {
    throw new RangeError(`a scenario with id "${id}" is already in the list — ids resolve parentId and activeScenarioId, so they cannot repeat`);
  }
  if (name.trim() === '') throw new RangeError('a scenario needs a name — it is how the list is read');
};

/**
 * **A new ROOT Scenario, appended.** `parentId: null` and no entries: it inherits nothing and adds
 * nothing, so it projects the Household and the Settings on their own. That is the honest starting
 * point for "what if none of this happened"; a create that quietly parented itself to the active
 * Scenario would be a clone wearing another name.
 */
export const scenarioCreated = (scenarios: readonly Scenario[], id: string, name: string): readonly Scenario[] => {
  checkNewScenario(scenarios, id, name);
  return [...scenarios, { id, name, parentId: null, entryIds: [] }];
};

/**
 * **A fork of `sourceId`, appended: parented to it, and EMPTY.** See this file's header for why the
 * empty `entryIds` is the point rather than a gap.
 *
 * A source that is not in the list is refused rather than treated as a root: a clone of nothing is
 * not a root Scenario, it is a writer that lost track of which Scenario it was forking.
 */
export const scenarioCloned = (
  scenarios: readonly Scenario[],
  sourceId: string,
  id: string,
  name: string,
): readonly Scenario[] => {
  if (!idsOf(scenarios).has(sourceId)) {
    throw new RangeError(`no scenario with id "${sourceId}" — a clone must name the scenario it forks`);
  }
  checkNewScenario(scenarios, id, name);
  return [...scenarios, { id, name, parentId: sourceId, entryIds: [] }];
};

/**
 * **The list with one Scenario's `name` changed, and nothing else touched.** Not its id — the id is
 * what `parentId` and `activeScenarioId` point at, and renaming it would orphan every child
 * silently. A name is a label; an id is a reference, and this model never conflates the two.
 *
 * An id that names no Scenario is a refusal rather than a no-op, on `planWithEntryOverride`'s
 * ground: a rename that silently changed nothing would leave the screen claiming a state the file
 * does not have.
 */
export const scenarioRenamed = (scenarios: readonly Scenario[], id: string, name: string): readonly Scenario[] => {
  if (!idsOf(scenarios).has(id)) {
    throw new RangeError(`no scenario with id "${id}" — a rename must name a scenario that is in the list`);
  }
  if (name.trim() === '') throw new RangeError('a scenario needs a name — it is how the list is read');
  return scenarios.map((scenario) => (scenario.id === id ? { ...scenario, name } : scenario));
};

/**
 * What a delete DECIDED, before anything is written: the list without it, and which Scenario the
 * page is looking at now. Returned together because they are one decision — a caller that took the
 * new list and kept the old `activeScenarioId` would hand `parsePlan` an id naming nothing.
 */
export interface ScenarioDeletion {
  /** The list with exactly one Scenario gone, the rest untouched and in their own order. */
  readonly scenarios: readonly Scenario[];
  /** The active Scenario after the delete. Unchanged unless the deleted one WAS the active one. */
  readonly activeScenarioId: string;
  /**
   * The Scenario now being shown when the delete moved the view, and `null` when it did not. The
   * writer has to be able to SAY which one it switched to: a silent switch of what is on screen is
   * the worst version of this operation, and a caller comparing two ids to work it out would be
   * deciding it a second time.
   */
  readonly switchedTo: Scenario | null;
}

/**
 * **One Scenario removed, and the active one moved if it has to be.** Pure: no DOM, no clock, and
 * — the point of the whole shape — **no entries**. The pool is not an argument, so no deletion can
 * take an entry with it; the ids the deleted Scenario listed stay in the file, unreferenced, which
 * `parsePlan` accepts (it checks that every listed id names an entry, never that every entry is
 * listed).
 *
 * Two refusals, both about facts on the screen rather than mistakes in the writer, and both
 * therefore worded for a user to read. They are still bare `RangeError`s — the whole of this file
 * is, and a new named class needs a register row under ruling R8 — so the panel puts the message
 * in the same banner a refused edit uses.
 */
export const scenarioDeleted = (
  scenarios: readonly Scenario[],
  id: string,
  activeScenarioId: string,
): ScenarioDeletion => {
  const doomed = scenarios.find((scenario) => scenario.id === id);
  if (doomed === undefined) {
    throw new RangeError(`no scenario with id "${id}" — a delete must name a scenario that is in the list`);
  }
  if (scenarios.length === 1) {
    throw new RangeError(
      `“${doomed.name}” is the only scenario this plan has, so it cannot be deleted — a plan file holds at least one, and deleting this one would leave a file that cannot be read back. Create another scenario first.`,
    );
  }
  const children = scenarios.filter((scenario) => scenario.parentId === id);
  if (children.length > 0) {
    throw new RangeError(
      `“${doomed.name}” cannot be deleted while ${children.length} scenario(s) inherit it: ${children
        .map((child) => `“${child.name}”`)
        .join(', ')}. Delete or re-parent them first — this build will not re-parent them for you, because that would silently move which entries they project.`,
    );
  }
  const remaining = scenarios.filter((scenario) => scenario.id !== id);
  if (activeScenarioId !== id) return { scenarios: remaining, activeScenarioId, switchedTo: null };
  // The deleted Scenario was the one on screen. Its parent is the closest thing to what the user
  // was looking at — it is every entry the deleted one projected apart from its own additions —
  // and with no parent there is only "the first one left", which is said out loud rather than
  // guessed at. `remaining[0]` exists: a one-scenario list was refused above.
  const parent = doomed.parentId === null ? undefined : remaining.find((scenario) => scenario.id === doomed.parentId);
  const next = parent ?? (remaining[0] as Scenario);
  return { scenarios: remaining, activeScenarioId: next.id, switchedTo: next };
};
