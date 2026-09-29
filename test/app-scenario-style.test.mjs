// P7-7 §A — **A SCENARIO'S COLOUR IS KEYED BY ITS ID, NEVER BY ITS POSITION.**
//
// The failure being tested for is silent and nasty: with `PALETTE[i]` over the scenario array,
// creating or cloning a Scenario re-colours every Scenario after it, so the blue line a reader is
// following becomes somebody else's plan with nothing on screen to say so. §1 is the assertion an
// index-keyed implementation cannot pass — the styles are invariant under a REORDERING of the same
// ids — and §2 is the one a set-order-dependent implementation cannot pass.
//
// §3 measures the thing a finite palette can actually promise: six Scenarios get six distinct
// (colour, dash) pairs, and the 33rd is a refusal rather than a silent wrap.
import test from 'node:test';
import assert from 'node:assert/strict';

import {
  SCENARIO_COLOURS,
  SCENARIO_DASHES,
  STYLE_SLOTS,
  preferredSlot,
  scenarioStyles,
} from '../dist/app/scenarioStyle.js';

const styleOf = (map, id) => {
  const style = map.get(id);
  return `${style.colour}|${style.dash.join(',')}`;
};

const all = (map) => [...map.entries()].map(([id, style]) => [id, style.slot, style.colour, style.dash.join(',')]).sort();

const thrown = (fn) => {
  try { fn(); } catch (error) { return error; }
  return assert.fail('nothing was thrown');
};

/** Six ids of the shape the app actually makes — `crypto.randomUUID()` — plus the seeded baseline. */
const SIX = Object.freeze([
  'baseline',
  '2b0a0b4e-0e2a-4d7a-9b2f-0b6a6e4b1c01',
  '7f3c1d90-5a11-4f2b-8c3d-9e0a1b2c3d4e',
  'c1d2e3f4-a5b6-4c7d-8e9f-0a1b2c3d4e5f',
  '11111111-2222-4333-8444-555555555555',
  'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee',
]);

// --- §1 Keyed by id: reordering the input changes nothing at all ----------------------------------

test('the styles are invariant under a REORDERING of the same ids (mutation: key by array index)', () => {
  const forwards = scenarioStyles(SIX);
  const backwards = scenarioStyles([...SIX].reverse());
  const shuffled = scenarioStyles([SIX[3], SIX[0], SIX[5], SIX[1], SIX[4], SIX[2]]);
  assert.deepEqual(all(backwards), all(forwards));
  assert.deepEqual(all(shuffled), all(forwards));
  // Positive control on the comparison itself: it CAN tell two assignments apart.
  assert.notDeepEqual(all(scenarioStyles([...SIX.slice(0, 5), 'zzzz-different'])), all(forwards));
});

test('the same id gets the same style on every call — no clock, no counter, no randomness', () => {
  const once = scenarioStyles(SIX);
  const twice = scenarioStyles(SIX);
  assert.deepEqual(all(twice), all(once));
  for (const id of SIX) assert.equal(styleOf(twice, id), styleOf(once, id));
});

// --- §2 Adding a scenario does not re-label the ones already on screen ----------------------------

/** An id whose preferred slot is free in `SIX` — the case the stability promise is about. */
const UNCONTENDED = (() => {
  const taken = new Set(SIX.map((id) => scenarioStyles(SIX).get(id).slot));
  for (let n = 0; n < 500; n += 1) {
    const id = `added-${n}`;
    if (!taken.has(preferredSlot(id))) return id;
  }
  return assert.fail('no uncontended id found — the search is broken, not the palette');
})();

test('adding a seventh scenario that contends with nobody leaves all six styles untouched — including at the FRONT of the array', () => {
  const before = scenarioStyles(SIX);
  const appended = scenarioStyles([...SIX, UNCONTENDED]);
  const prepended = scenarioStyles([UNCONTENDED, ...SIX]);
  for (const id of SIX) {
    assert.equal(styleOf(appended, id), styleOf(before, id), `${id} changed colour when a scenario was added`);
    assert.equal(styleOf(prepended, id), styleOf(before, id), `${id} changed colour when a scenario was added at the front`);
  }
  // The control that this fixture would have caught an index-keyed palette at all: the six ids
  // are at six DIFFERENT positions in the two arrays above.
  for (const id of SIX) assert.notEqual([...SIX].indexOf(id), [UNCONTENDED, ...SIX].indexOf(id));
  // And the seventh is really uncontended, rather than merely lucky.
  assert.equal(appended.get(UNCONTENDED).slot, preferredSlot(UNCONTENDED));
});

test('removing a scenario does not re-label the survivors either', () => {
  const before = scenarioStyles(SIX);
  const without = scenarioStyles(SIX.filter((id) => id !== SIX[2]));
  for (const id of SIX.filter((one) => one !== SIX[2])) assert.equal(styleOf(without, id), styleOf(before, id));
});

test('a COLLISION is resolved, not shared: both ids are drawn differently and the earlier one keeps its slot', () => {
  // A real pair, found rather than asserted: two ids that ask for the same slot.
  const wanted = new Map();
  let pair;
  for (let n = 0; n < 5000 && pair === undefined; n += 1) {
    const id = `collide-${n}`;
    const slot = preferredSlot(id);
    const held = wanted.get(slot);
    if (held !== undefined) pair = [held, id].sort();
    else wanted.set(slot, id);
  }
  assert.ok(pair !== undefined, 'no colliding pair found — this test measured nothing');
  assert.equal(preferredSlot(pair[0]), preferredSlot(pair[1]));
  const styles = scenarioStyles(pair);
  assert.notEqual(styleOf(styles, pair[0]), styleOf(styles, pair[1]), 'two colliding scenarios are drawn identically');
  // The lexicographically EARLIER id keeps what it asked for; the other probes forward. That rule
  // is what makes the outcome independent of which was added first.
  assert.equal(styles.get(pair[0]).slot, preferredSlot(pair[0]));
  assert.equal(styles.get(pair[1]).slot, (preferredSlot(pair[1]) + 1) % STYLE_SLOTS);
  assert.deepEqual(
    [...scenarioStyles([pair[1], pair[0]]).entries()].map(([id, style]) => [id, style.slot]).sort(),
    [...styles.entries()].map(([id, style]) => [id, style.slot]).sort(),
  );
});

// --- §3 Six scenarios are six distinguishable lines, and the palette's end is a refusal ------------

test('six scenarios yield six DISTINCT, non-repeating identifications', () => {
  const styles = scenarioStyles(SIX);
  assert.equal(styles.size, 6);
  const pairs = SIX.map((id) => styleOf(styles, id));
  assert.equal(new Set(pairs).size, 6, `two scenarios are drawn identically: ${pairs.join(' / ')}`);
  const slots = SIX.map((id) => styles.get(id).slot);
  assert.equal(new Set(slots).size, 6);
  for (const slot of slots) assert.ok(slot >= 0 && slot < STYLE_SLOTS);
});

test('and so does a FULL palette — 32 ids, 32 styles, none repeated', () => {
  const ids = Array.from({ length: STYLE_SLOTS }, (_, index) => `scenario-${index}`);
  const styles = scenarioStyles(ids);
  const pairs = ids.map((id) => styleOf(styles, id));
  assert.equal(new Set(pairs).size, STYLE_SLOTS);
  assert.deepEqual(
    [...new Set(ids.map((id) => styles.get(id).colour))].sort(),
    [...SCENARIO_COLOURS].sort(),
    'every colour in the palette is used before any is reused with a new dash',
  );
});

test('the 33rd scenario is REFUSED, not wrapped onto a colour already in use', () => {
  const ids = Array.from({ length: STYLE_SLOTS + 1 }, (_, index) => `scenario-${index}`);
  const error = thrown(() => scenarioStyles(ids));
  assert.ok(error instanceof RangeError);
  assert.match(error.message, /33 scenarios is more than the 32 this chart can tell apart/);
  assert.match(error.message, /Compare fewer scenarios/);
  assert.equal(STYLE_SLOTS, SCENARIO_COLOURS.length * SCENARIO_DASHES.length);
  assert.equal(STYLE_SLOTS, 32);
});

test('a duplicate id is refused — a style is keyed by id, so one of them would be lost', () => {
  assert.match(thrown(() => scenarioStyles(['a', 'b', 'a'])).message, /two scenarios share an id/);
});

test('the palette itself: eight colours, four dashes, the first of them solid', () => {
  assert.equal(SCENARIO_COLOURS.length, 8);
  assert.equal(new Set(SCENARIO_COLOURS).size, 8);
  for (const colour of SCENARIO_COLOURS) assert.match(colour, /^#[0-9a-f]{6}$/);
  assert.equal(SCENARIO_DASHES.length, 4);
  assert.deepEqual([...SCENARIO_DASHES[0]], [], 'the first dash pattern is solid');
  assert.equal(new Set(SCENARIO_DASHES.map((dash) => dash.join(','))).size, 4);
  // None of the scenario colours is one of the focused chart's band or marker colours: a reader
  // switching views must not meet the assets-test purple standing for a plan.
  for (const taken of ['#7a5cad', '#8a1f5f']) assert.ok(!SCENARIO_COLOURS.includes(taken));
});

test('one scenario gets a style too, and it is the slot its id asked for', () => {
  const alone = scenarioStyles(['baseline']);
  assert.equal(alone.size, 1);
  assert.equal(alone.get('baseline').slot, preferredSlot('baseline'));
});
