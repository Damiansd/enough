// Journal entries switched off in a plan stay in the file forever (ADR-0002), and hiding them from
// the list is VIEW STATE — `entryVisibility.ts`'s own header says why it never reaches `savePlan`.
// This is the PURE half of the toggle: `entryForm.ts` builds the DOM and is untested
// (`test/app-entry-form.test.mjs` pins it as source), so every property a silent regression could
// break here is asserted behaviourally instead.
//
// The shapes are real `Entry` objects off the demo fixture (`demoHousehold.ts`) rather than made up
// here — but that fixture is committed with all three entries `enabled: true` (it seeds a fresh
// plan, and a plan nobody has touched yet has nothing switched off), so it cannot exercise the
// mixed case on its own. `MIXED` below overrides `enabled` explicitly, by index, so a reader can
// see exactly which entries are meant to be hidden without re-deriving it from a count.
import test from 'node:test';
import assert from 'node:assert/strict';

import { switchedOffCount, visibleEntries } from '../dist/app/entryVisibility.js';
import { DEMO_ENTRIES } from '../dist/app/demoHousehold.js';

test('the vacuity control: the fixture this file builds on has at least two entries', () => {
  assert.ok(DEMO_ENTRIES.length >= 2, 'MIXED below needs at least one of each enabled state to distinguish "filtered" from "untouched"');
});

// entry 0 on, entry 1 off, and the rest on — one of each state, ids kept from the real fixture.
const MIXED = DEMO_ENTRIES.map((entry, index) => ({ ...entry, enabled: index !== 1 }));
const ALL_ON = DEMO_ENTRIES.map((entry) => ({ ...entry, enabled: true }));
const ALL_OFF = DEMO_ENTRIES.map((entry) => ({ ...entry, enabled: false }));

test('switchedOffCount counts exactly the disabled entries, not the enabled ones', () => {
  assert.equal(switchedOffCount(MIXED), 1);
  assert.equal(switchedOffCount([]), 0);
  assert.equal(switchedOffCount(ALL_ON), 0);
  assert.equal(switchedOffCount(ALL_OFF), DEMO_ENTRIES.length);
});

test('visibleEntries(entries, false) is exactly the switched-on subset, in the same order', () => {
  const shown = visibleEntries(MIXED, false);
  assert.equal(shown.length, MIXED.length - 1);
  assert.ok(shown.every((entry) => entry.enabled));
  assert.deepEqual(shown.map((entry) => entry.id), MIXED.filter((entry) => entry.enabled).map((entry) => entry.id));
  assert.deepEqual(visibleEntries(ALL_OFF, false), [], 'every entry is off, so nothing should show');
});

test('visibleEntries(entries, true) hides nothing — every entry comes back, switched off or not', () => {
  assert.deepEqual(visibleEntries(MIXED, true), MIXED);
  assert.deepEqual(visibleEntries(ALL_OFF, true), ALL_OFF, 'showing switched-off entries must still show the ones that are ALL switched off');
});

test('a plan with nothing switched off has nothing for the toggle to reveal, and the two views agree', () => {
  assert.equal(switchedOffCount(ALL_ON), 0);
  assert.deepEqual(visibleEntries(ALL_ON, false), ALL_ON, 'with none switched off, the hidden view and the full view must already agree');
  assert.deepEqual(visibleEntries(ALL_ON, false), visibleEntries(ALL_ON, true));
});

test('the source array is never mutated', () => {
  const before = MIXED.map((entry) => ({ ...entry }));
  visibleEntries(MIXED, false);
  visibleEntries(MIXED, true);
  switchedOffCount(MIXED);
  assert.deepEqual(MIXED, before);
});
