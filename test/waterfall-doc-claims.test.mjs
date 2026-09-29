// CONTEXT.md's and concept.md's factual claims about the Income Waterfall's LENGTH, canaried
// against `WATERFALL_LIMBS` — the engine's own single source of truth for the order.
//
// P13-9's 2026-09-20 audit found CONTEXT.md's `Income Waterfall` and `Offset Account` entries and
// concept.md's two copies of "Offset is last" all describing a FOUR-limb Waterfall, a fortnight
// after a fifth limb (released superannuation) had been added. The false claims were struck in
// place, never deleted, but nothing canaried them, so nothing stopped a recurrence — and one has
// already happened: `WATERFALL_LIMBS` grew from five limbs to seven on 2026-09-23 (idle cash and
// the Account-Based Pension were each split into a below- and above-threshold limb), and neither
// file was told.
//
// WHAT IS PINNED HERE — only a claim with a computable truth value: the number of limbs
// `WATERFALL_LIMBS` currently lists, and that the limb it lists LAST is the one both files name as
// drawn last (released superannuation). Names and internal order of the other limbs are NOT pinned
// — a test that pinned full prose would be a test somebody deletes the first time they improve a
// sentence, exactly as README's canary (`test/readme-claims.test.mjs`) already argues.
//
// Struck text (`~~…~~`) is history, not a claim, and is stripped before this file reads either
// document — a stale count word left there on purpose (e.g. the true "a four-limb Waterfall" that
// was accurate before 2026-09-19) must never fail this test, and a *live* stale count word must
// always fail it.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { WATERFALL_LIMBS } from '../dist/core/projection.js';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

/** Struck text is history, not a live claim — dropped before either document is read. */
const stripStrikes = (text) => text.replace(/~~[^~]*~~/g, '');
const flatten = (text) => stripStrikes(text).replace(/\s+/g, ' ');

const CONTEXT = flatten(readFileSync(join(ROOT, 'CONTEXT.md'), 'utf8'));
const CONCEPT = flatten(readFileSync(join(ROOT, 'concept.md'), 'utf8'));

/** README writes small counts as words, as the rest of this project's prose does. */
const WORDS = [
  'zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten',
  'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen',
  'nineteen', 'twenty',
];
const inWords = (n) => {
  assert.ok(n < WORDS.length, `no word for ${n} — extend WORDS`);
  return WORDS[n];
};

/** Prose name for the limb both documents describe as drawn last. Names are NOT pinned for the
 * other six — see the module header — so this is the only entry this test needs. */
const LAST_LIMB_NAME = { releasedSuperannuation: 'released superannuation' };

test('CONTEXT.md and concept.md state the current number of Waterfall limbs, and it is the number WATERFALL_LIMBS lists', () => {
  const lastLimb = WATERFALL_LIMBS[WATERFALL_LIMBS.length - 1];
  assert.ok(
    lastLimb in LAST_LIMB_NAME,
    `WATERFALL_LIMBS's last limb is now ${lastLimb} — give it a prose name in LAST_LIMB_NAME above`,
  );
  const expected =
    `\`WATERFALL_LIMBS\` now lists ${inWords(WATERFALL_LIMBS.length)} limbs, and ` +
    `${LAST_LIMB_NAME[lastLimb]} is the last of them`;

  for (const [name, text] of [['CONTEXT.md', CONTEXT], ['concept.md', CONCEPT]]) {
    assert.ok(
      text.includes(expected),
      `${name} must say "${expected}" (live, not struck) — WATERFALL_LIMBS ` +
        `(src/core/projection.ts) lists ${WATERFALL_LIMBS.length} limbs, last of which is ` +
        `${lastLimb}. Counted, not guessed.`,
    );
  }
});

test('concept.md carries the claim in both places it duplicates the Waterfall order', () => {
  const occurrences = CONCEPT.split('WATERFALL_LIMBS` now lists').length - 1;
  assert.equal(
    occurrences,
    2,
    'concept.md states the Income Waterfall order twice (§4 and the super-vs-non-super section) ' +
      '— both copies must carry the current limb count, or they will disagree again',
  );
});

// Added at review: pinning the presence of ONE correct sentence does not catch a SECOND, stale count
// elsewhere in live text ("the four-limb Waterfall"). Every live "N-limb" / "N limbs" in either file
// must be the current count.
test('no live count of Waterfall limbs in CONTEXT.md or concept.md disagrees with WATERFALL_LIMBS', () => {
  const count = WATERFALL_LIMBS.length;
  // "split into two limbs" describes one limb becoming two, not the Waterfall's length: skipped.
  const pattern = new RegExp(`(?<!into )\\b(${WORDS.join('|')}|\\d+)[- ]limbs?\\b`, 'gi');
  for (const [name, text] of [['CONTEXT.md', CONTEXT], ['concept.md', CONCEPT]]) {
    for (const match of text.matchAll(pattern)) {
      const word = match[1].toLowerCase();
      const n = /^\d+$/.test(word) ? Number(word) : WORDS.indexOf(word);
      assert.equal(n, count, `${name} says "${match[0]}" in live text, but WATERFALL_LIMBS lists ${count}`);
    }
  }
});
