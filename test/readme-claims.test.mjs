// README's load-bearing FACTUAL claims, derived from the code and then checked against the prose.
//
// The register stayed accurate for a fortnight of daily changes because a stale row fails a test.
// README drifted because nothing enforced it: on 2026-09-20 it still said "all five entry types
// this build can honour" and named five of the seven, said "the other fourteen types … are refused
// at the door" when twelve are, and said the app "cannot create a second [Scenario] to compare"
// four commits after the comparison chart shipped. Every one of those is a COUNT or a NAME, and a
// count is exactly what a test can hold.
//
// WHAT IS PINNED HERE — only claims with a computable truth value:
//   1. the number of entry types the form offers, and every one of their names;
//   2. the number refused at the door;
//   3. that the ADR index lists every file in docs/adr/ and no file that is not there.
//
// WHAT IS DELIBERATELY NOT PINNED: the status prose, the description of what each feature does, and
// the limits section. Those legitimately vary in wording, and a test that pins wording is a test
// that gets deleted the first time somebody improves a sentence. The limits are canaried where they
// are authoritative — in the register, by `assumptions-register*.test.mjs` — and README points at
// the register rather than copying it, which is what keeps the two from disagreeing.
//
// It ratchets both ways: offering a new entry type without editing README fails here, and editing
// README's count without the type existing fails here too.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { OFFERED_ENTRY_TYPES } from '../dist/app/planEdits.js';
import { UNSPECIFIED_ENTRY_TYPES } from '../dist/core/parsePlan.js';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const README = readFileSync(join(ROOT, 'README.md'), 'utf8');
const flat = README.replace(/\s+/g, ' ');

/** README writes small counts as words, as the rest of this project's prose does. */
const WORDS = [
  'zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten',
  'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen',
  'nineteen', 'twenty', 'twenty-one', 'twenty-two', 'twenty-three', 'twenty-four', 'twenty-five',
];
const inWords = (n) => {
  assert.ok(n < WORDS.length, `no word for ${n} — extend WORDS`);
  return WORDS[n];
};

test('README states the number of entry types the form offers, and it is the number offered', () => {
  const expected = `the ${inWords(OFFERED_ENTRY_TYPES.length)} entry types this build can honour`;
  assert.ok(
    flat.includes(expected),
    `README must say "${expected}" — ${OFFERED_ENTRY_TYPES.length} types are offered by ` +
      'OFFERED_ENTRY_TYPES. Counted, not guessed.',
  );
});

test('README names every offered entry type, and names no type that is not offered', () => {
  for (const type of OFFERED_ENTRY_TYPES) {
    assert.ok(flat.includes(`\`${type}\``), `README does not name the offered entry type ${type}`);
  }
  for (const type of UNSPECIFIED_ENTRY_TYPES) {
    assert.ok(
      !flat.includes(`\`${type}\``),
      `README names ${type} as though the form offered it — it is refused at the door`,
    );
  }
});

test('README states the number of entry types refused at the door, and it is the number refused', () => {
  const expected = `The other ${inWords(UNSPECIFIED_ENTRY_TYPES.length)} types named in \`plan.ts\` are refused at the door`;
  assert.ok(
    flat.includes(expected),
    `README must say "${expected}" — ${UNSPECIFIED_ENTRY_TYPES.length} types have no params parser.`,
  );
});

test('the ADR index lists every decision record, and no record that does not exist', () => {
  const files = readdirSync(join(ROOT, 'docs', 'adr')).filter((f) => f.endsWith('.md')).sort();
  const linked = [...README.matchAll(/\]\(\.\/docs\/adr\/([^)]+\.md)\)/g)].map((m) => m[1]);
  for (const file of files) {
    assert.ok(linked.includes(file), `README's "Decisions on record" omits docs/adr/${file}`);
  }
  for (const link of linked) {
    assert.ok(files.includes(link), `README links docs/adr/${link}, which does not exist`);
  }
});
