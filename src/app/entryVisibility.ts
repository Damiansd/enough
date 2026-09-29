// Hiding switched-off journal entries is VIEW STATE, not a plan-file decision (user ruling,
// 2026-09-19). ADR-0002 already gives `enabled: false` as the append-safe delete — the entry
// stays in `plan.json` forever — and this file only decides what a row of checkboxes on screen
// shows about that same array; nothing here is written back. `entryTable.ts` holds the one boolean
// this drives inside its `EntryTableView`, `entryForm.ts` holds that view in memory for one mount,
// and its own header says why it never reaches `savePlan`.
//
// Two pure functions over a `readonly { enabled }[]`, in `scenarioList.ts`'s idiom: no DOM, no
// clock, no randomness. `switchedOffCount` exists on its own rather than as `entries.length -
// visibleEntries(...).length`, because the indicator that names the hidden entries has to name that
// count in the state where `visibleEntries` is returning NOTHING it hid — deriving it from the
// filtered list's own length would make the label describe what is on screen, and the one thing
// this label has to survive is a version of `visibleEntries` that hides the wrong entries; a count
// computed from its output could not catch that.
//
// **Both are generic over `{ enabled: boolean }` rather than taking an `Entry`** (2026-09-22): the
// table filters `EntryRow`s, which carry an entry plus the text of its cells, and the alternative
// was a second copy of "switched off means `enabled === false`" one layer up. There is one
// expression of that fact and both callers use it.
import type { Entry } from '../core/plan.js'; // `.js` is correct in a `.ts` file — see tsconfig.json

/** Anything with the journal's switched-on flag: an `Entry`, or a table row built from one. */
export type Switchable = Pick<Entry, 'enabled'>;

/** How many entries a `showSwitchedOff: false` view is currently hiding. */
export const switchedOffCount = (entries: readonly Switchable[]): number =>
  entries.filter((entry) => !entry.enabled).length;

/**
 * The entries a view shows: all of them once `showSwitchedOff` is true, otherwise the ones still
 * switched on.
 *
 * ⚠️ **THIS FUNCTION STILL NEVER REORDERS, BUT IT IS NO LONGER THE LAST WORD ON ORDER** (user
 * ruling, 2026-09-22). This doc used to promise that the journal's own order — `plan.entries`'s
 * order — was the order on screen, on the grounds that a view which reordered while filtering would
 * make the same entry land in a different row depending on which other entries happened to be
 * switched off. That promise is superseded: the panel is a sortable table now, and
 * `entryTable.ts`'s `entryTableRows` SORTS what comes back from here — by the entry's own effective
 * date, newest first, until the user clicks a different heading.
 *
 * What replaced the old guarantee is the one that survives sorting: the sort is **total and
 * stable**, so a row's position is a function of the sort key alone, with ties broken by the
 * journal order this function preserves. Filtering therefore still cannot move a row that the
 * filter kept — which is the property the old wording was reaching for.
 */
export const visibleEntries = <T extends Switchable>(entries: readonly T[], showSwitchedOff: boolean): readonly T[] =>
  showSwitchedOff ? entries : entries.filter((entry) => entry.enabled);
