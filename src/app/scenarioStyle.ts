// P7-7 — **HOW A SCENARIO GETS ITS COLOUR, and why it is keyed by ID and never by position.**
//
// ⚠️ **AN INDEX-KEYED PALETTE SILENTLY RE-LABELS A CHART SOMEBODY IS MID-WAY THROUGH READING.**
// `PALETTE[i]` over the scenario array looks fine until a Scenario is created, cloned or (one day)
// removed: every Scenario after it in the array changes colour, so the blue line the reader was
// following is now somebody else's plan. Nothing on the page says so, and the legend agrees with
// the lie. So the style is a function of the Scenario's **id** — the same thing `parentId` and
// `activeScenarioId` resolve by — and of the SET of ids drawn, never of their order in the array.
// `test/app-scenario-style.test.mjs` asserts the whole thing is invariant under a reordering of
// the input, which is the assertion an index-keyed implementation cannot pass.
//
// **Two channels, so six scenarios are still six lines.** A style is a COLOUR and a DASH pattern
// together: eight colours × four dashes = 32 distinct styles. The colour alone would collide at
// about six lines by the birthday bound, and two lines a reader cannot tell apart are worse than
// no chart at all.
//
// **Collisions are resolved, not accepted.** Two ids can hash to one slot. The set is assigned in
// LEXICOGRAPHIC id order — not array order, or the whole point above is lost — and a contended
// slot is resolved by probing forward, so the colliding id that sorts EARLIER keeps its natural
// slot. That is as stable as a finite palette allows — see the residue below for what it does
// NOT promise.
//
// **THE RESIDUE, STATED RATHER THAN IMPLIED.** Adding a Scenario whose preferred slot is FREE
// moves nothing — that is the common case and it is asserted. Adding one that CONTENDS for a
// taken slot can displace another Scenario's style, and a chain of contentions can displace more
// than one. That is the price of a finite palette: the alternative is two Scenarios drawn
// identically, which is a comparison a reader cannot make at all. `preferredSlot` is exported so
// the two cases can be told apart in a test rather than guessed at.
//
// **WHEN THE PALETTE RUNS OUT IT REFUSES.** More than 32 Scenarios drawn at once and there is no
// free slot, so `scenarioStyles` throws rather than wrapping: a wrapped palette draws two
// Scenarios identically and lets a reader compare a line with itself. A bare `RangeError` and not
// a named refusal under ruling R8 — 33 Scenarios is not a fact about the user's file that this
// build disputes, it is this renderer's own limit, and the message says which.

/** The style one Scenario's line is drawn in. `slot` is the palette position both channels come from. */
export interface ScenarioStyle {
  /** The slot this id was assigned — `0 .. STYLE_SLOTS - 1`. Carried so a test can pin the assignment. */
  readonly slot: number;
  readonly colour: string;
  /** `[]` is a solid line. Chart.js reads this as `borderDash`. */
  readonly dash: readonly number[];
}

/**
 * Eight, chosen to stay distinguishable side by side. They deliberately do NOT include the two
 * band colours or the two marker colours of `chartConfig.ts`: comparison mode draws no bands, but
 * a reader who switches between the two views should not meet the assets-test purple standing for
 * a Scenario.
 */
export const SCENARIO_COLOURS: readonly string[] = Object.freeze([
  '#1d4ed8',
  '#c0392b',
  '#0b6e4f',
  '#b8860b',
  '#6b21a8',
  '#0e7490',
  '#9a3412',
  '#374151',
]);

/** Four, in increasing visual weight. `[]` (solid) first, so the smallest plan gets plain lines. */
export const SCENARIO_DASHES: readonly (readonly number[])[] = Object.freeze([
  Object.freeze([]),
  Object.freeze([6, 3]),
  Object.freeze([2, 3]),
  Object.freeze([10, 3, 2, 3]),
]);

/** How many Scenarios this renderer can identify at once. Beyond it, `scenarioStyles` refuses. */
export const STYLE_SLOTS = SCENARIO_COLOURS.length * SCENARIO_DASHES.length;

/**
 * FNV-1a, 32-bit, over the id's UTF-16 code units. Any deterministic hash would do; what matters
 * is that it depends on the id ALONE — no clock, no counter, no array position — so the same id
 * asks for the same slot on every redraw, in every session, on every machine.
 */
const hashOf = (id: string): number => {
  let hash = 0x811c9dc5;
  for (let index = 0; index < id.length; index += 1) {
    hash ^= id.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash >>> 0;
};

const styleAt = (slot: number): ScenarioStyle =>
  Object.freeze({
    slot,
    colour: SCENARIO_COLOURS[slot % SCENARIO_COLOURS.length] as string,
    dash: SCENARIO_DASHES[Math.floor(slot / SCENARIO_COLOURS.length)] as readonly number[],
  });

/**
 * The slot an id ASKS for, before anyone else is considered — a function of the id and nothing
 * else. Exported so a test can tell the two cases apart: a Scenario that kept its own slot, and
 * one that was displaced by a collision. Without it a stability test cannot say whether it passed
 * because the code is stable or because the ids it picked happened not to contend.
 */
export const preferredSlot = (id: string): number => hashOf(id) % STYLE_SLOTS;

/**
 * **One style per id, decided by the ids alone.** See the header for the three properties this is
 * built to have: keyed by id, invariant under reordering, and a refusal rather than a wrap when
 * the palette is full.
 *
 * A duplicate id is refused: ids are what everything here resolves by, and assigning one style to
 * two entries of the same key would quietly drop one of them.
 */
export const scenarioStyles = (ids: readonly string[]): ReadonlyMap<string, ScenarioStyle> => {
  if (new Set(ids).size !== ids.length) {
    throw new RangeError('two scenarios share an id — a style is keyed by id, so a duplicate would be one line drawn twice');
  }
  if (ids.length > STYLE_SLOTS) {
    throw new RangeError(
      `${ids.length} scenarios is more than the ${STYLE_SLOTS} this chart can tell apart (${SCENARIO_COLOURS.length} colours × ${SCENARIO_DASHES.length} dash patterns) — two lines drawn the same way is a comparison a reader cannot make. Compare fewer scenarios`,
    );
  }
  const taken = new Map<number, string>();
  const styles = new Map<string, ScenarioStyle>();
  // Lexicographic, NEVER the order they arrived in — see the header. This is the one line that
  // makes the result invariant under a reordering of `ids`.
  for (const id of [...ids].sort()) {
    let slot = preferredSlot(id);
    while (taken.has(slot)) slot = (slot + 1) % STYLE_SLOTS;
    taken.set(slot, id);
    styles.set(id, styleAt(slot));
  }
  return styles;
};
