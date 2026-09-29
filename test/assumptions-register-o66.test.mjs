// O66 — the register's own count of which transfer balance cap traps have a §9 mutation test.
//
// §1's preamble used to say "the 68 transfer balance cap traps T58–T125 have no §9 mutation tests".
// That was true on 2026-09-09 and stopped being true on 2026-09-16, and nothing failed when it
// stopped: a number written in prose is checked by nobody. This file makes the four figures in that
// paragraph — 68 traps, 27 ruled out by R1, 41 in scope, and the covered/outstanding split —
// DERIVED from §1's trap rows, from R1's RECORDED-NOT-LIVE range and from the Trap column of §9's
// "Transfer balance cap" tables, and then asserts that the prose agrees with what was derived.
//
// It ratchets both ways on purpose. Adding a §9 row without editing the preamble fails here, and so
// does editing the preamble without adding the row — which is the difference between a count that
// is maintained and a count that is merely written down.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const REGISTER = readFileSync(join(ROOT, 'docs', 'assumptions-register.md'), 'utf8');

/** The cluster O66 is about. Both ends come from §1's own "68 traps, T58–T125" heading note. */
const FIRST = 58;
const LAST = 125;

const flat = (text) => text.replace(/\s+/g, ' ');

/** `T59–T64, T66` → [59, 60, 61, 62, 63, 64, 66]. The register writes ranges with an en dash. */
const trapsIn = (prose) => {
  const ids = [];
  for (const [, from, to] of prose.matchAll(/\bT(\d+)(?:\s*[–-]\s*T(\d+))?/g)) {
    for (let n = Number(from); n <= Number(to ?? from); n += 1) ids.push(n);
  }
  return ids;
};

/**
 * The section of the register between one heading and the next of the same or higher level.
 *
 * `from` is not optional decoration: **"### Transfer balance cap" is a heading in §1 as well as in
 * §9**, and reading the §1 one instead produced a plausible 8 rather than a wrong-looking zero.
 */
const section = (heading, from = 0) => {
  const start = REGISTER.indexOf(heading, from);
  assert.notEqual(start, -1, `the register no longer contains the heading ${heading}`);
  const rest = REGISTER.slice(start + heading.length);
  const end = rest.search(/\n#{1,3} /);
  return rest.slice(0, end === -1 ? undefined : end);
};

/** Where §9 starts, so a §9 subsection is never confused with the §1 subsection of the same name. */
const SECTION_NINE = REGISTER.indexOf('## 9. Proposed mutation tests');

test('the trap cluster O66 is about is 68 rows, contiguous, and numbered T58 to T125', () => {
  const numbered = new Set(
    [...REGISTER.matchAll(/^\| (T\d+) \| /gm)].map(([, id]) => Number(id.slice(1))),
  );
  const cluster = [...numbered].filter((n) => n >= FIRST && n <= LAST).sort((a, b) => a - b);
  assert.equal(cluster.length, 68, 'a trap row was added to or removed from T58–T125');
  assert.deepEqual(cluster[0], FIRST);
  assert.deepEqual(cluster[cluster.length - 1], LAST);
  // Contiguous — no gap, which is what makes "68" a count and not a range width.
  assert.deepEqual(cluster, Array.from({ length: 68 }, (_, i) => FIRST + i));
  // Vacuity control: the same walker must see the traps outside the cluster too.
  assert.ok(numbered.has(1) && numbered.has(57), 'the trap-row walker matched nothing outside the cluster');
});

test('R1 rules 27 of them out of scope, and the register says which', () => {
  const marker = flat(REGISTER).match(/\*\*RECORDED-NOT-LIVE \(R1\)\*\* — \*\*(T\d+[–-]T\d+)\*\*/);
  assert.ok(marker, "R1's RECORDED-NOT-LIVE marker is no longer in §1's transfer balance cap note");
  const notLive = trapsIn(marker[1]);
  assert.deepEqual(notLive, Array.from({ length: 27 }, (_, i) => 87 + i));
  // R1's instruction is the reason they are excluded rather than merely absent, so pin the words.
  assert.match(flat(REGISTER), /Do not schedule tests for them; do not remove them\./);
});

test("§9's Trap column and §1's prose agree on how many of the 41 in-scope traps are covered", () => {
  const notLive = new Set(Array.from({ length: 27 }, (_, i) => 87 + i));
  const inScope = Array.from({ length: 68 }, (_, i) => FIRST + i).filter((n) => !notLive.has(n));
  assert.equal(inScope.length, 41);

  // The Trap column only — the "Must fail against" cells cite traps too, and citing is not covering.
  const covered = new Set();
  assert.notEqual(SECTION_NINE, -1, '§9 has been renamed');
  for (const line of section('### Transfer balance cap', SECTION_NINE).split('\n')) {
    if (!line.startsWith('|') || line.startsWith('|---') || line.startsWith('| Mutation ')) continue;
    for (const n of trapsIn(line.split('|')[2])) if (n >= FIRST && n <= LAST) covered.add(n);
  }
  const outstanding = inScope.filter((n) => !covered.has(n));
  assert.equal(covered.size + outstanding.length, inScope.length, 'a §9 row cites a trap R1 ruled out of scope');

  // Now the prose, in §1's preamble, computed rather than quoted.
  const preamble = flat(section('## 1. Traps'));
  assert.ok(preamble.includes('There are **68** of them, but **27 are deliberately untested**'));
  assert.ok(preamble.includes('That leaves **41 in scope**'));
  assert.ok(
    preamble.includes(`so **${covered.size} are covered and ${outstanding.length} are outstanding**`),
    `§1's preamble does not state the ${covered.size}/${outstanding.length} split §9's Trap column produces`,
  );

  // And the two lists of trap ids the preamble names must BE the covered set — a count agreeing with
  // a count while the names drift is the failure this pairing exists to catch.
  const named = [...preamble.matchAll(/\(([^()]*T\d+[^()]*)\)/g)].map(([, list]) => list);
  const fromChunkSix = named.find((list) => list.startsWith('T58,'));
  const fromBatchOne = named.find((list) => list.startsWith('T59'));
  assert.ok(fromChunkSix && fromBatchOne, "§1's preamble no longer names which traps are covered");
  assert.deepEqual(
    [...trapsIn(fromChunkSix), ...trapsIn(fromBatchOne)].sort((a, b) => a - b),
    [...covered].sort((a, b) => a - b),
  );

  // §8's O66 row names the remainder, and it must be the complement of the same set.
  //
  // **The zero case is not the same sentence with a `0` in it, and this is the second hardcoded
  // anchor this file has had to lose.** Batch 2 replaced a literal `22`; the phrase it left behind
  // — `still true of the N left:` — is unwritable at N = 0 without saying something false, because
  // a row that reads "still true of the 0 left:" followed by nothing is a sentence no editor would
  // leave in place. So the anchor branches on the derived figure rather than on a number typed
  // here, and BOTH branches ratchet: with traps outstanding the row must name exactly them, and
  // with none outstanding the row must say so IN TERMS and must name no trap id after saying it.
  const o66 = REGISTER.split('\n').find((line) => line.startsWith('| O66 |'));
  assert.ok(o66, 'the O66 row has gone from §8');
  const NONE_LEFT = 'there is no such trap left: all 41 in-scope traps carry at least one §9 row';
  const anchor = outstanding.length === 0 ? NONE_LEFT : `still true of the ${outstanding.length} left:`;
  const at = o66.indexOf(anchor);
  assert.notEqual(at, -1, `§8's O66 row does not carry the phrase "${anchor}" §9's Trap column requires`);
  // Only the clause the anchor introduces — the row goes on to name the ECPI traps it does NOT
  // close, and those are Exception 2's, not this cluster's. The clause ends at the next bold run.
  const rest = o66.slice(at + anchor.length);
  const boundary = rest.indexOf('**');
  assert.deepEqual(trapsIn(boundary === -1 ? rest : rest.slice(0, boundary)).sort((a, b) => a - b), outstanding);
});

/**
 * **§1's Exception 2, derived the same way, because it drifted for six days and nobody noticed.**
 *
 * Until 2026-09-16 the preamble said the ECPI traps T126–T134 *"carry exactly one mutation test
 * between them, M-P3-25-1, which asserts T132"*. By then §9 also carried rows for T126, T129, T130
 * and T133, so the sentence had been false since those rows landed — the same failure mode the
 * transfer balance cap half of this file exists to prevent, one exception along. Discharging
 * Exception 1 is exactly when a reader is most likely to take the rest of the paragraph on trust,
 * so the rest of the paragraph is now computed too.
 */
test("§1's Exception 2 states the ECPI split §9's Trap column actually produces", () => {
  const ECPI = Array.from({ length: 9 }, (_, i) => 126 + i);
  const covered = new Set();
  for (const heading of ['### Income tax and offsets', '### Superannuation', '### Transfer balance cap']) {
    for (const line of section(heading, SECTION_NINE).split('\n')) {
      if (!line.startsWith('|') || line.startsWith('|---') || line.startsWith('| Mutation ')) continue;
      for (const n of trapsIn(line.split('|')[2])) if (ECPI.includes(n)) covered.add(n);
    }
  }
  const outstanding = ECPI.filter((n) => !covered.has(n));
  // Vacuity control: the walk must find SOME of them, or an empty covered set would pass by silence.
  assert.ok(covered.size > 0, 'the §9 walk found no ECPI trap at all — the subsection has been renamed');

  const preamble = flat(section('## 1. Traps'));
  const spelled = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine'];
  assert.ok(
    preamble.includes(`Of the nine, **${spelled[covered.size]} carry a §9 row**`),
    `§1's Exception 2 does not state that ${covered.size} of the nine are covered`,
  );
  const tail = preamble.slice(preamble.indexOf('and **' + spelled[outstanding.length] + ' do not:'));
  assert.ok(tail.length > 0, "§1's Exception 2 no longer names the ECPI traps that are outstanding");
  assert.deepEqual(trapsIn(tail.slice(0, tail.indexOf('**', 6))).sort((a, b) => a - b), outstanding);
  // The preamble names the SAME ECPI set a second time, in its closing "the opening claim is true
  // of ..." sentence. Exception 2's own list was pinned above and that sentence's was not, so the
  // two could drift apart — which is the whole defect this file exists to stop, reproduced inside
  // it. Measured 2026-09-16: dropping T129 from the closing sentence alone failed nothing.
  const claim = preamble.slice(preamble.indexOf('So the opening claim is true of'));
  assert.ok(claim.includes('not** yet true of'), "§1's preamble no longer closes by naming what the opening claim is and is not true of");
  assert.deepEqual(
    trapsIn(claim.slice(0, claim.indexOf('not** yet true of'))).filter((n) => ECPI.includes(n)).sort((a, b) => a - b),
    [...covered].sort((a, b) => a - b),
    "§1's closing sentence and Exception 2 disagree about which ECPI traps are covered",
  );

  // Exception 2 must not be read as discharged along with Exception 1.
  assert.ok(preamble.includes('and it STANDS'), "§1 no longer says Exception 2 survives O66's discharge");
  assert.ok(preamble.includes('Discharging Exception 1 discharges nothing here.'));
});
