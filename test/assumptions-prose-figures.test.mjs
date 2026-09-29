// P4-18's canary — a currency figure with CENTS, written in prose, that no record holds.
//
// **Why this one and not the general one.** P3-27 promoted two figures that existed only inside
// the words of other records, and added a canary — but that canary watches CODE literals, so the
// class walked straight back in through PROSE. The obvious repair is a guard on every number in
// every comment. That guard was measured at about one part in ten precision, and its false
// positives cluster on the BEST-documented records, because a note that shows its working carries
// the most figures. A guard that punishes `18,200 + 250/0.14 = 19,985.714` teaches maintainers to
// stop showing their working, and a register whose notes stop showing their working is worse off
// than one with a few unstamped figures in it.
//
// So this is the narrow one. `$` + digits + exactly two decimals is almost never a citation, a
// section number, a percentage or a count. It is money, and money in this directory belongs in a
// record. Three ways to satisfy it, and the failure message says all three:
//
//   1. promote the figure to a stamped record — the P4-18 answer;
//   2. make it derivable from records that already exist, and say so in the allowlist reason;
//   3. allowlist it with a reason, if it is neither — an illustration, a counterfactual, a trap.
//
// The allowlist is the escape hatch and it is deliberately annoying: every entry needs a sentence.
// That keeps the pressure on whoever has to write it, which is the only part of this that works.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { assumptionAt, assumptionKeys } from '../dist/data/assumptions/index.js';

const DIRECTORY = fileURLToPath(new URL('../src/data/assumptions/', import.meta.url));

/** Currency with cents. Two decimals, `$` in front, thousands separators optional. */
const CURRENCY_WITH_CENTS = /\$[\d,]+\.\d{2}/g;

/**
 * Comments and `note:` / `derivation:` strings, with the line each begins on.
 *
 * A hand-rolled scan rather than a regex, because a regex for `//` matches inside the `https://`
 * of a `source:`, and a regex for a string literal matches inside a comment. This walks the file
 * once and can be in exactly one state at a time, so neither happens.
 */
export const proseSpans = (source) => {
  const spans = [];
  const end = source.length;
  let index = 0;
  let line = 1;

  while (index < end) {
    const character = source[index];

    if (character === '\n') {
      line += 1;
      index += 1;
      continue;
    }

    if (character === '/' && source[index + 1] === '*') {
      const start = index;
      const startLine = line;
      index += 2;
      while (index < end && !(source[index] === '*' && source[index + 1] === '/')) {
        if (source[index] === '\n') line += 1;
        index += 1;
      }
      index = Math.min(end, index + 2);
      spans.push({ kind: 'block comment', text: source.slice(start, index), line: startLine });
      continue;
    }

    if (character === '/' && source[index + 1] === '/') {
      const start = index;
      while (index < end && source[index] !== '\n') index += 1;
      spans.push({ kind: 'line comment', text: source.slice(start, index), line });
      continue;
    }

    if (character === "'" || character === '"' || character === '`') {
      const quote = character;
      const start = index;
      const startLine = line;
      index += 1;
      while (index < end && source[index] !== quote) {
        if (source[index] === '\\') {
          index += 2;
          continue;
        }
        if (source[index] === '\n') line += 1;
        index += 1;
      }
      index = Math.min(end, index + 1);
      const preceding = source.slice(Math.max(0, start - 40), start).replace(/\s+$/, '');
      if (/(note|derivation):$/.test(preceding)) {
        spans.push({ kind: 'note', text: source.slice(start, index), line: startLine });
      }
      continue;
    }

    index += 1;
  }

  return spans;
};

/** Every currency-with-cents figure in a module's prose, as `{ figure, cents, file, line, kind }`. */
export const proseCurrencyFigures = (source, file = '<source>') => {
  const found = [];
  for (const span of proseSpans(source)) {
    for (const match of span.text.matchAll(CURRENCY_WITH_CENTS)) {
      const dollars = Number(match[0].slice(1).replace(/,/g, ''));
      const before = span.text.slice(0, match.index);
      found.push({
        figure: match[0],
        cents: Math.round(dollars * 100),
        dollars,
        file,
        line: span.line + (before.split('\n').length - 1),
        kind: span.kind,
      });
    }
  }
  return found;
};

/** Every number held anywhere inside any record's value, at any depth. */
const stampedNumbers = () => {
  const numbers = new Set();
  const collect = (value) => {
    if (typeof value === 'number') {
      if (Number.isFinite(value)) numbers.add(value);
      return;
    }
    if (typeof value !== 'object' || value === null) return;
    for (const child of Object.values(value)) collect(child);
  };
  for (const key of assumptionKeys()) collect(assumptionAt(key).value);
  return numbers;
};

/**
 * The figures that are NOT a defect, one reason each.
 *
 * ⚠️ An entry here is a claim, and the reason is the claim. "Derivable" means derivable from
 * records that exist today — if the record it derives from is ever removed, this entry becomes
 * false and nothing will tell you. Prefer promoting the figure.
 */
const ALLOWED = new Map([
  [
    'heas.ts $589.35',
    'EVIDENCE, not stored: Services Australia\'s "George" HEAS advance worked example (P9-2b), quoted as the paper trail for the corrected /26 formula; the test pins it independently in assumptions-heas.test.mjs, and the code never reads this prose.',
  ],
  [
    'heas.ts $15,323.10',
    'EVIDENCE, not stored: Services Australia\'s "George" HEAS advance worked example (P9-2b), quoted as the paper trail for the corrected /26 formula; the test pins it independently in assumptions-heas.test.mjs, and the code never reads this prose.',
  ],
  [
    'heas.ts $5,323.10',
    'EVIDENCE, not stored: Services Australia\'s "George" HEAS advance worked example (P9-2b), quoted as the paper trail for the corrected /26 formula; the test pins it independently in assumptions-heas.test.mjs, and the code never reads this prose.',
  ],
  [
    'heas.ts $204.73',
    'EVIDENCE, not stored: Services Australia\'s "George" HEAS advance worked example (P9-2b), quoted as the paper trail for the corrected /26 formula; the test pins it independently in assumptions-heas.test.mjs, and the code never reads this prose.',
  ],
  [
    'heas.ts $384.62',
    'EVIDENCE, not stored: Services Australia\'s "George" HEAS advance worked example (P9-2b), quoted as the paper trail for the corrected /26 formula; the test pins it independently in assumptions-heas.test.mjs, and the code never reads this prose.',
  ],
  [
    'agedCare.ts $66.80',
    'EVIDENCE, not stored: the basic daily fee before 20 Sep 2026, used with $1,100.30 to show the fee is 85% of the single basic Age Pension ÷ 14, floored. The fee is derived by basicDailyFeeFromPension, never read from this prose.',
  ],
  [
    'agedCare.ts $68.94',
    'COUNTER-EXAMPLE, not stored: what round-half-up would give at 20 Sep 2026 ($68.935), named to show the published $68.93 proves the rounding is a floor.',
  ],
  [
    'agedCare.ts $35,521.20',
    'SUPERSEDED, not stored: concept.md\'s first income-free-area candidate, confirmed right for 1 Jul 2026 but superseded by the 20 Sep 2026 indexation this file carries ($36,454.60). Kept only as the paper trail for P14-1\'s finding.',
  ],
  [
    'agedCare.ts $35,313.20',
    'SUPERSEDED, not stored: concept.md\'s SECOND (wrong) income-free-area candidate — named so a reader can see which of the two pairs P14-1 ruled out, and by how much, against the 20 Sep 2026 figure this file carries.',
  ],
  [
    'agedCare.ts $107.32',
    'SUPERSEDED, not stored: the NCCC daily rate confirmed right for 1 Jul 2026, superseded by the 20 Sep 2026 indexation this file carries ($109.45). Kept only as the paper trail for P14-1\'s finding, never computed with.',
  ],
  [
    'agedCare.ts $105.30',
    'SUPERSEDED, not stored: concept.md\'s SECOND (wrong) NCCC daily rate candidate — named so a reader can see which of the two pairs P14-1 ruled out, against the 20 Sep 2026 figure this file carries.',
  ],
  [
    'agedCare.ts $86,185.23',
    'SUPERSEDED, not stored: the grandfathered means-tested-care-fee lifetime cap at 1 Jul 2026, one indexation round stale against the 20 Sep 2026 figure this file carries ($88,934.57). Paper trail only, per P14-3.',
  ],
  [
    'agedCare.ts $35,910.43',
    'SUPERSEDED, not stored: the grandfathered means-tested-care-fee annual cap at 1 Jul 2026, one indexation round stale against the 20 Sep 2026 figure this file carries ($37,055.98). Paper trail only, per P14-3.',
  ],
  [
    'agePension.ts $66,166.70',
    'A MEASUREMENT OF THIS BUILD, not a published figure: the demo couple\'s FY2030-31 family income in the walk that wires the standing table, which is what puts them under 1.25 x the larger Medicare family threshold and trips register O30. Nothing computes with it and no source publishes it; it is there so the blocker can be reproduced. Measured 2026-09-21, and again on 2026-09-19 by the other road (TODO.md P7-5).',
  ],
  [
    'heas.ts $452.60',
    'Derivable: 0.5 × the couple-each Maximum Payment Rate at 20 Mar 2026 ($829.40 + $65.20 + $10.60 = $905.20). It is the WRONG answer, shown deliberately — T33 misread as fortnightly.',
  ],
  [
    'heas.ts $11,767.60',
    'Derivable: the same 0.5 × $905.20, annualised over 26 fortnights. The right answer beside the wrong one; both are computed by `heasAdvanceCap` and asserted in test/assumptions-heas.test.mjs.',
  ],
  [
    'heas.ts $2.27',
    'A COUNTERFACTUAL, deliberately not stored: what `annual × 14/365` would have given at the stamped balance. Computed from `heas.interest.rate` in test/assumptions-heas.test.mjs and matched against this sentence; storing it would let it agree with a wrong rate.',
  ],
  [
    'heas.ts $1,503.41',
    'A COUNTERFACTUAL: the fortnight-2 closing balance `annual × 14/365` would have produced at the stamped 3.95% rate, against the published $1,503.42. Derived in test/assumptions-heas.test.mjs.',
  ],
  [
    'heas.ts $751.30',
    'A COUNTERFACTUAL at the superseded 4.50% rate: what `annual ÷ 26` gives where Services Australia published $751.29. Derived from `heas.interest.supersededRates` in test/assumptions-heas.test.mjs.',
  ],
  [
    'heas.ts $2.60',
    'A COUNTERFACTUAL at the superseded 4.50% rate: what `annual ÷ 26` gives where Services Australia published $2.59. Derived from `heas.interest.supersededRates` in test/assumptions-heas.test.mjs.',
  ],
  [
    'heas.ts $3.89',
    'A COUNTERFACTUAL at the superseded 4.50% rate: what `annual × 14/365` gives where Services Australia published $3.90 — the fortnight that contradicts the other two. Derived in test/assumptions-heas.test.mjs.',
  ],
  [
    'super.ts $1.84',
    'Derivable: `superannuation.caps.generalTransferBalance` ($2,100,000) less two years of `superannuation.caps.nonConcessional` ($130,000), which is the bring-forward arithmetic the note is showing. Corroboration for the $2.1m figure, not a figure of its own.',
  ],
  [
    'tax.ts $6,105.01',
    'Not a legislated figure at all: the float-dust artefact `ceilToWholeDollar` exists to prevent, named so the guard clause reads. Nothing in law or in any record equals it.',
  ],
  [
    'tax.ts $19,985.71',
    'Derivable, and the note says in terms that it must NEVER be stored: tax-free threshold + WATO maximum ÷ lowest marginal rate, both of which are records, and both of which move. Budget Paper No. 2 corroborates at whole dollars.',
  ],
  [
    'tax.ts $19,985.72',
    'The same derivation as $19,985.71, rounded up instead of truncated — the two sentences state the same crossing point to different precision. Derived in test/core-income-tax.test.mjs from the two records, never stored.',
  ],
]);

/** The failure message. Its text is pinned below, because a guard that cannot explain itself is a trap. */
export const unstampedFigureMessage = (hits) =>
  [
    `${hits.length} currency figure(s) with cents appear in prose under src/data/assumptions/ and match no stamped value:`,
    ...hits.map((hit) => `  ${hit.file}:${hit.line}  ${hit.figure}  (in a ${hit.kind})`),
    '',
    'A number inside a note or a doc comment READS AS AUTHORITATIVE and carries no source, no',
    'retrieved date and no confidence, and nothing can compute with it. Three ways to satisfy this:',
    '  1. PROMOTE it to a stamped record, beside the ones already in the file (this is usually right);',
    '  2. make it DERIVABLE from records that exist, and say which ones in an allowlist reason;',
    '  3. ALLOWLIST it with a one-line reason, in test/assumptions-prose-figures.test.mjs.',
  ].join('\n');

const modules = readdirSync(DIRECTORY)
  .filter((name) => name.endsWith('.ts'))
  .sort();

const unstamped = (source, file, numbers) =>
  proseCurrencyFigures(source, file).filter(
    (hit) => !numbers.has(hit.cents) && !numbers.has(hit.dollars) && !ALLOWED.has(`${hit.file} ${hit.figure}`),
  );

test('the canary runs over every module in the directory, not the three that were audited', () => {
  // A guard aimed at the files a past audit happened to read is a guard that finds what is already
  // known. `super.ts` was never audited and is where this pass found its one unexpected hit.
  assert.ok(modules.length >= 7, `expected the whole directory, found ${modules.length} modules`);
  for (const expected of ['agePension.ts', 'franking.ts', 'heas.ts', 'settings.ts', 'super.ts', 'tax.ts', 'types.ts']) {
    assert.ok(modules.includes(expected), `${expected} is not being scanned`);
  }
});

test('no currency figure with cents lives in prose without a record or a stated reason', () => {
  const numbers = stampedNumbers();
  const hits = modules.flatMap((file) => unstamped(readFileSync(`${DIRECTORY}${file}`, 'utf8'), file, numbers));
  assert.deepEqual(hits, [], hits.length === 0 ? '' : unstampedFigureMessage(hits));
});

test('the canary FIRES on a planted figure, in a note and in a doc comment alike', () => {
  const numbers = stampedNumbers();

  const inANote = "const X = { note: 'the Household pays $4,321.09 a year for this' };";
  const plantedNote = unstamped(inANote, 'planted.ts', numbers);
  assert.equal(plantedNote.length, 1);
  assert.equal(plantedNote[0].figure, '$4,321.09');
  assert.equal(plantedNote[0].kind, 'note');
  assert.equal(plantedNote[0].line, 1);

  const inAComment = ['/**', ' * The threshold is $9,876.54 from 1 July.', ' */', 'const Y = 1;'].join('\n');
  const plantedComment = unstamped(inAComment, 'planted.ts', numbers);
  assert.equal(plantedComment.length, 1);
  assert.equal(plantedComment[0].figure, '$9,876.54');
  assert.equal(plantedComment[0].kind, 'block comment');
  assert.equal(plantedComment[0].line, 2, 'the line reported must be the line the figure is on');

  const inALineComment = 'const Z = 1; // stale: was $1,111.11\n';
  assert.equal(unstamped(inALineComment, 'planted.ts', numbers)[0].kind, 'line comment');

  // And the figures it must NOT fire on: a stamped one, a whole-dollar one, a version number.
  const stamped = "const A = { note: 'the transitional rate is $963.60 a fortnight' };";
  assert.deepEqual(unstamped(stamped, 'planted.ts', numbers), []);
  assert.deepEqual(unstamped("const B = { note: 'a step of $500 a year' };", 'planted.ts', numbers), []);
  assert.deepEqual(unstamped('// see LCR 2016/9 ¶17.20 and s 1135.14\n', 'planted.ts', numbers), []);
});

test('the canary is blind to everything that is not prose', () => {
  // Code is out of scope by design: a currency figure in code is a literal, and P3-27's canary
  // already watches those. This one exists because that one could not see a sentence.
  const numbers = stampedNumbers();
  assert.deepEqual(unstamped("const price = '$4,321.09';", 'planted.ts', numbers), []);
  assert.deepEqual(unstamped("const url = { source: 'https://x/y?a=$4,321.09' };", 'planted.ts', numbers), []);

  // A `//` inside a string is a string, not a comment — which is the reason for the hand scan.
  assert.deepEqual(unstamped("const s = { source: 'https://example/$4,321.09' };", 'planted.ts', numbers), []);
});

test('every allowlist entry names a real figure, and carries a reason worth reading', () => {
  // An allowlist that outlives its figures is a lie that accumulates. Each entry must still be
  // found in the file it names, so deleting the sentence deletes the exemption.
  const everyHit = new Set(
    modules.flatMap((file) =>
      proseCurrencyFigures(readFileSync(`${DIRECTORY}${file}`, 'utf8'), file).map((hit) => `${hit.file} ${hit.figure}`),
    ),
  );

  for (const [entry, reason] of ALLOWED) {
    assert.ok(everyHit.has(entry), `the allowlist exempts ${entry}, which no longer appears in prose`);
    assert.ok(reason.length > 60, `${entry} is allowlisted with ${reason.length} characters of reason — say why`);
    assert.match(reason, /[.!]$/, `${entry}'s reason is not a sentence`);
  }

  // Nothing is allowlisted that a record would have covered anyway — that would hide a promotion.
  const numbers = stampedNumbers();
  for (const entry of ALLOWED.keys()) {
    const figure = entry.slice(entry.indexOf(' $') + 1);
    const dollars = Number(figure.slice(1).replace(/,/g, ''));
    assert.ok(
      !numbers.has(Math.round(dollars * 100)) && !numbers.has(dollars),
      `${entry} is allowlisted AND stamped — drop the allowlist entry`,
    );
  }
});

test('the failure message tells the next person all three ways out', () => {
  // ⚠️ The message is the whole value of this guard to someone who did not write it. Emptying it
  // must fail, which is what this test is: it reads the real function, not a copy.
  const message = unstampedFigureMessage([
    { file: 'somewhere.ts', line: 42, figure: '$1,234.56', kind: 'note' },
  ]);

  assert.match(message, /somewhere\.ts:42/, 'the file and line, or nobody can find it');
  assert.match(message, /\$1,234\.56/, 'the figure itself');
  assert.match(message, /in a note/);
  assert.match(message, /PROMOTE it to a stamped record/);
  assert.match(message, /make it DERIVABLE/);
  assert.match(message, /ALLOWLIST it with a one-line reason/);
  assert.match(message, /test\/assumptions-prose-figures\.test\.mjs/, 'where the allowlist is');
  assert.ok(message.split('\n').length >= 6, 'a one-line message cannot carry three remedies');
});
