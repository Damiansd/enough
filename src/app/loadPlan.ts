// P8 — startup: load the plan from disk, or report that there is none. The whole of the app's
// state arrives through this function.
//
// ⚠️ **THERE IS NO SEEDING WRITE HERE ANY MORE (2026-09-20).** Until this slice a first run wrote
// `DEMO_PLAN` to disk before the user had agreed to anything, and the demo couple's figures became
// *their* plan file without being asked for. Absence is now REPORTED — `null` comes back and
// **nothing at all is written** — and `main.ts` puts a two-question form on screen instead. The
// only plan a first run can produce is the one the user typed the answers to.
//
// ⚠️ **ABSENCE AND REFUSAL ARE DIFFERENT STATES AND MUST NOT COLLAPSE INTO ONE.** There is no file
// → say so, in one word the caller cannot mistake for a plan, and write nothing. There is a file
// and it does not parse → **show the error and leave the file exactly as it is.** Never the other
// way round, and never both through one branch. **Absence is `stored === null` and nothing else:**
// the origin provider answers an absent file with 200 and the literal `null` (`server/index.mjs`)
// and `store/files.ts` passes it through, so the signal is end-to-end and unambiguous — and there
// is no `catch` around the load, because a `catch` is exactly how the two states collapse. If a
// refused plan were ever reported as absence the first-run form would appear over the top of it,
// and the first thing that form does is write.
//
// The shortcut this is written against looks like sensible error handling: *"if it won't load,
// write a fresh one."* On a plan file it is data loss. A file that fails to parse is still the
// user's plan — it may be a file written by a newer build, a file this build has a bug about, or a
// file with one hand-edited typo in it, and all three are recoverable **until something overwrites
// them**. A plan we merely declined to read must survive the next startup byte for byte, and there
// is no `catch` anywhere near a write. `test/app-load-plan.test.mjs` proves the bytes are
// untouched against a real file.
//
// ⚠️ **Two sentences here have been superseded and are quoted once each, so a reader who remembers
// them knows they changed on purpose.** *"the seeding write lives in the `null` branch alone"* was
// true until P6-4, when the migration became a second write. *"There is no file → write the seed"*
// was true until 2026-09-20: the `null` branch now writes NOTHING, and the migration is the only
// write in this module. What neither sentence's replacement touches is the property both were
// standing in for: a file this build cannot read is never written to.
//
// **P6-4 added ONE write to the non-null branch, and it is the migration — read this before
// touching it.** The paragraph above is unchanged in every respect that matters: a file this build
// cannot read is still never written to, and there is still no `catch` near a write. What is new
// is that a file this build CAN upgrade is upgraded and saved back, once, on load — and it is
// saved through `savePlan`, the same door every edit goes through, which runs `parsePlan` AND
// `project()` before the transport is named at all. So the safety property is unchanged in form:
// **a migration that produces a plan the engine will not accept is a refused edit, the transport
// is not called, and the original bytes survive untouched.** A migration written unchecked would
// be the worst version of the shortcut this module is written against — not "if it will not load,
// write a fresh one", but "if it will not load, write a DIFFERENT one".
//
// The transport is injected rather than imported so this is testable without a browser, a server
// or a socket — `store/files.ts` is what `main.ts` passes in.
import { parsePlan, PLAN_FILE_VERSION } from '../core/parsePlan.js'; // `.js` is correct in a `.ts` file — see tsconfig.json
import type { PlanFile } from '../core/parsePlan.js';
// A cycle: `planEdits.ts` imports `PlanWriteFailure` from here. It is deliberate and it is the
// alternative to a second write path — the brief's own constraint, and the one the save gate
// exists to enforce. Nothing is referenced across it at module-evaluation time.
import { savePlan } from './planEdits.js';

export interface PlanTransport {
  /** The stored plan as parsed JSON, or `null` when no file exists yet. */
  readonly readPlan: () => Promise<unknown>;
  readonly writePlan: (plan: unknown) => Promise<void>;
}

export interface LoadedPlan {
  readonly plan: PlanFile;
  /**
   * True when the stored file was a version this build can upgrade, and the upgraded plan was
   * written back. Reported rather than silent: the file on disk is no longer the file the user
   * last saw, and a caller that wants to say so on screen needs to know it happened.
   */
  readonly migrated: boolean;
}

/**
 * **A write that did not land (P8-2b).** Not a `RangeError`, and that is the point: ADR-0004's
 * refusals are RangeErrors and say *"this input is not something I will act on"*. This says the
 * opposite — the input was fine and the DISK did not take it — and the two must not arrive under
 * one kind, because the user's next action differs (fix the plan vs fix the disk). A silent failed
 * save is worse than no save: the screen would keep showing figures that are not on disk.
 */
export class PlanWriteFailure extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = 'PlanWriteFailure';
  }
}

/** The version this build can upgrade FROM. One integer, one migration — there is no chain. */
const MIGRATABLE_VERSION = 1;

/** The id and the name the one Scenario a v1 file becomes is given. */
const MIGRATED_BASELINE_ID = 'baseline';

/**
 * **A version 1 plan file → a version 2 one, or the input back unchanged.** Pure: no transport, no
 * clock, no `crypto`. It does not validate and it does not write — `parsePlan` and the save gate
 * do both, after.
 *
 * A v1 file is `{version, settings, household, entries}` and its `entries` are *the* list the
 * projection walks. A v2 file's `entries` are a shared POOL, and a `Scenario` names the ones it
 * adds. The upgrade that preserves the meaning exactly is therefore **one root Scenario holding
 * every id in the pool**: `effectiveEntryIds` then resolves to the pool in pool order, so the
 * migrated plan projects to the same months, figure for figure. That equality is asserted, not
 * assumed (`test/app-scenarios.test.mjs`).
 *
 * ⚠️ **A version this function does not recognise is returned UNTOUCHED, and that is the whole of
 * its forward-compatibility contract.** It does not re-migrate a v2 file — `version !== 1` is the
 * gate, so a second pass over its own output is a no-op — and it does not guess at a v3 one. An
 * unrecognised version reaches `parsePlan` exactly as it arrived and is refused there by name,
 * with nothing written. A migration that ran on anything it did not understand would rewrite a
 * file from a newer build into a shape that build never wrote.
 */
export const migratePlanV1toV2 = (stored: unknown): unknown => {
  if (typeof stored !== 'object' || stored === null || Array.isArray(stored)) return stored;
  const file = stored as Record<string, unknown>;
  if (file['version'] !== MIGRATABLE_VERSION) return stored;
  const entries = file['entries'];
  // Ids are read off whatever is there and never repaired: a malformed entry is `parsePlan`'s to
  // refuse by name, and a migration that fixed one would be deciding what the user meant.
  const entryIds = Array.isArray(entries)
    ? (entries as readonly unknown[]).map((entry) =>
        typeof entry === 'object' && entry !== null ? (entry as Record<string, unknown>)['id'] : entry)
    : [];
  return {
    ...file,
    version: PLAN_FILE_VERSION,
    scenarios: [{ id: MIGRATED_BASELINE_ID, name: 'Baseline', parentId: null, entryIds }],
    activeScenarioId: MIGRATED_BASELINE_ID,
  };
};

/**
 * **The plan as stored, the plan as upgraded, or `null` — and `null` means there is no file.**
 *
 * The three outcomes are three different things and the caller gets three different answers:
 *
 *   * `null` — no file. **Nothing is read into, nothing is guessed at and nothing is written.** It
 *     is the ONLY value that means absence, and it is returned from the `stored === null` branch
 *     and from nowhere else.
 *   * a `LoadedPlan` — the file parsed, or it was a v1 file this build upgraded and saved back.
 *   * a throw — one of `parsePlan`'s named refusals when a file exists and is not a plan this build
 *     reads (**without writing anything**), or `PlanWriteFailure` when a write itself fails.
 *
 * ⚠️ The third of those must never arrive as the first. There is no `try` in this function: a
 * refusal propagates to `main.ts`, which banners it and stops, leaving the user's bytes alone.
 */
export const loadPlanOrNone = async (transport: PlanTransport): Promise<LoadedPlan | null> => {
  const stored = await transport.readPlan();
  // No file. The caller is told so and decides what to ask the user for — this function does not
  // write a plan nobody asked for, and it does not invent one to return.
  if (stored === null) return null;
  const upgraded = migratePlanV1toV2(stored);
  if (upgraded === stored) return { plan: parsePlan(stored), migrated: false };
  // `savePlan` is the gate: `parsePlan`, then `project()`, and only then the transport. A
  // migration whose output either would refuse throws HERE, before `writePlan` is named — so the
  // user's file is left exactly as it was and the refusal reaches the banner.
  const saved = await savePlan(transport, upgraded);
  return { plan: saved.plan, migrated: true };
};
