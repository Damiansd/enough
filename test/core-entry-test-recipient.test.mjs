// P3-9 chunk 5a — the two entry-test facts this tool refuses, and what an INPUT GUARD can honestly
// be tested for.
//
// **There is no arithmetic here, and that is the whole shape of the chunk.** R7's inputs 4
// (s 307-80(3)(aa), the reversionary beneficiary) and 7 (s 307-80(4) / s 294-50(3), the commutation
// authority) arrived on the three `superPhase.ts` constructors as an optional `DeclaredRecipient`,
// and stating either fact refuses. Nothing computes from them.
//
// **Why a DECLARED input is the only honest trigger, and why that is a limit rather than a
// weakness.** Chunk 4 settled the test: a function handed a day and an amount cannot tell what
// produced the amount. The same test applied here says a constructor handed a `ConditionOfRelease`
// — a fact about a Person, carrying no stream identity — cannot tell whether that Person inherited
// the stream, or whether the Commissioner has issued an authority over it. Register §3.10.8 states
// the trigger for both refusals as the fact being *stated*, and that is what is built. The residue
// is pinned below rather than left implied: **an UNDECLARED reversionary beneficiary is treated as
// an ordinary recipient, and no guard here can see it.**
//
// **Two financial years, every fixture.** FY2026-27 and FY2027-28, because a guard that refuses in
// one year and not the next is the failure a single-year fixture cannot see. The reversionary
// beneficiary is **45 on each of the two days** — T122's own fixture — which takes two dates of
// birth, one per year, rather than one Person who ages out of the fixture's own description.
//
// **No figure is asserted anywhere in this file, because the chunk produces none.** T122's entry in
// register §3.10.8 is explicit that the test asserts *a named refusal, not a rate*, and must fail if
// the code returns either 15% or 0%.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  ReversionaryStreamNotModelledError,
  TrisRetirementPhaseNotModelledError,
  accumulationInterest,
  retirementPhaseInterest,
  transitionToRetirementInterest,
} from '../dist/core/superPhase.js';
import { CommutationAuthorityNotModelledError } from '../dist/core/transferBalanceAccount.js';
import { PreservedBenefitError, conditionOfRelease } from '../dist/core/conditionOfRelease.js';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = join(ROOT, 'src');
const PHASE_SOURCE = readFileSync(join(SRC, 'core', 'superPhase.ts'), 'utf8');

/**
 * Comment markers off, whitespace collapsed. A claim made in a doc comment wraps across lines, so a
 * naive grep of the raw text finds it only by the accident of where the line broke.
 */
const FLATTENED_PROSE = PHASE_SOURCE.replaceAll(/^\s*(\/\/|\*|\/\*\*)/gm, ' ').replaceAll(/\s+/g, ' ');

/** `assert.throws` returns nothing, and the message is the thing under test. */
const raisedBy = (run) => {
  try {
    run();
  } catch (error) {
    return error;
  }
  return assert.fail('nothing was thrown');
};

/** The two days, one in each financial year, and the date of birth that makes the recipient 45 on it. */
const AGED_45 = [
  { on: '2026-11-03', dateOfBirth: '1981-07-01' },
  { on: '2027-08-15', dateOfBirth: '1982-07-01' },
];

/** A Person who has turned 67 on either day, so `met` is true without any act of theirs. */
const AGED_67 = '1959-07-01';

const NO_AUTHORITY = 'no commutation authority has been issued for this stream';
const AUTHORITY_ISSUED = 'a commutation authority has been issued under TAA 1953 Sch 1 Div 136';

const CONSTRUCTORS = { accumulationInterest, transitionToRetirementInterest, retirementPhaseInterest };

const preserved = (dateOfBirth, on) =>
  conditionOfRelease({ dateOfBirth, on, gainfulEmployment: { ceased: false } });

// --- T122: a reverted stream refuses, and it refuses AS a reversionary stream --------------------

test('T122 — a TRIS reverted to a 45-year-old who satisfied nothing refuses, in two financial years', () => {
  // Register §3.10.8's T122 row: "a TRIS reverts to a 45-year-old reversionary beneficiary who has
  // satisfied nothing and notified nobody. On the statute the stream IS in retirement phase. This
  // project should refuse rather than compute it — so the test asserts a named refusal, not a 0%
  // rate, and must fail if the code silently returns either 15% or 0%."
  for (const { on, dateOfBirth } of AGED_45) {
    const release = preserved(dateOfBirth, on);
    assert.equal(release.met, false, `${on}: the fixture's whole point is that nothing was satisfied`);
    const declared = { reversionaryBeneficiary: true, commutationAuthority: NO_AUTHORITY };
    for (const [name, construct] of Object.entries(CONSTRUCTORS)) {
      assert.throws(
        () => construct(release, declared),
        ReversionaryStreamNotModelledError,
        `${name} on ${on} answered instead of refusing`,
      );
    }
  }
});

test('the reversionary refusal beats the preservation gate, and that order is the statute (T122)', () => {
  // The fixture Person is 45 and has met nothing, so `retirementPhaseInterest` has a second reason
  // to refuse — `PreservedBenefitError`. It must not be the one raised. s 307-80(3) is a
  // CONJUNCTION: (aa) failing collapses it and the stream is in the retirement phase regardless of
  // the beneficiary's own conditions of release, so answering "the benefit is preserved" would be
  // refusing on a ground the provision has made irrelevant, and would send a reader to fix the
  // wrong fact.
  for (const { on, dateOfBirth } of AGED_45) {
    const release = preserved(dateOfBirth, on);
    // Without the declaration, the preservation gate is what fires. This is the control, and it is
    // also the residue: the module cannot see an undeclared reversionary beneficiary.
    assert.throws(() => retirementPhaseInterest(release), PreservedBenefitError);
    assert.throws(
      () => retirementPhaseInterest(release, { reversionaryBeneficiary: true, commutationAuthority: NO_AUTHORITY }),
      ReversionaryStreamNotModelledError,
    );
  }
  // And the same precedence over `transitionToRetirementInterest`'s own met-condition refusal, for a
  // Person of 67 for whom BOTH would otherwise fire.
  for (const { on } of AGED_45) {
    const release = conditionOfRelease({ dateOfBirth: AGED_67, on, gainfulEmployment: { ceased: false } });
    assert.throws(() => transitionToRetirementInterest(release), TrisRetirementPhaseNotModelledError);
    assert.throws(
      () => transitionToRetirementInterest(release, { reversionaryBeneficiary: true, commutationAuthority: NO_AUTHORITY }),
      ReversionaryStreamNotModelledError,
    );
  }
});

test('the reversionary refusal names the day, the conjunction and the direction of the error', () => {
  for (const { on, dateOfBirth } of AGED_45) {
    const raised = raisedBy(() =>
      accumulationInterest(preserved(dateOfBirth, on), {
        reversionaryBeneficiary: true,
        commutationAuthority: NO_AUTHORITY,
      }),
    );
    assert.ok(raised instanceof ReversionaryStreamNotModelledError);
    assert.match(raised.message, new RegExp(on), 'the refusal must name the day it could not answer');
    assert.match(raised.message, /s 307-80\(3\) is a conjunction/);
    // The DIRECTION, which is why this is refused rather than approximated: modelling (aa) alone
    // gives 0% fund earnings tax with no cap check for a year.
    assert.match(raised.message, /0% fund earnings tax with NO transfer balance cap check/);
    assert.match(raised.message, /most flattering wrong answer available/);
    // And what is missing is the surrounding machinery, not the rule — so a reader does not go
    // looking for an unretrieved provision.
    assert.match(raised.message, /The rule is not what is missing/);
  }
});

// --- s 307-80(4): the authority, and the ground it cannot be approximated on ---------------------

test('a declared commutation authority refuses on every constructor, in two financial years', () => {
  for (const { on, dateOfBirth } of AGED_45) {
    const release = preserved(dateOfBirth, on);
    const declared = { reversionaryBeneficiary: false, commutationAuthority: AUTHORITY_ISSUED };
    for (const [name, construct] of Object.entries(CONSTRUCTORS)) {
      assert.throws(
        () => construct(release, declared),
        CommutationAuthorityNotModelledError,
        `${name} on ${on} answered instead of refusing`,
      );
    }
  }
});

test('the commutation-authority refusal reproduces s 294-50(3)’s ground, both directions named', () => {
  // §3.10.8 records the reason this refusal cannot be approximated by ignoring the authority, and
  // the reason is a DISAGREEMENT rather than a gap: s 294-50(3) requires s 307-80(4) to be
  // disregarded for transfer balance cap purposes while the 60-day period runs, so the same stream
  // is out of retirement phase for ECPI and in it for the cap. One answer taken for both is wrong
  // in one direction with nothing to say which — which is precisely why R1's "refuse" and R9's
  // "keep computing at the bound" both fail here: there is no bound, because there is no single
  // direction.
  const { message } = new CommutationAuthorityNotModelledError();
  for (const provision of [/s 307-80\(4\)/, /s 294-50\(3\)/, /s 294-80\(1\) item 5/, /TAA 1953 Sch 1 Div 136/]) {
    assert.match(message, provision);
  }
  assert.match(message, /DISREGARDED while the 60 days are still running/);
  // **The modality, contiguously, and measured 2026-09-16 as the hole in the four layers above.**
  // s 294-50(3) REQUIRES the disregard; it does not permit it and it does not leave the choice to
  // the fund. Rewriting "requires s 307-80(4) to be DISREGARDED" as "leaves it to the fund to decide
  // whether s 307-80(4) is applied or DISREGARDED" kept every keyword asserted here, kept all four
  // sentences and kept each of them on topic — and failed zero tests, while stating the opposite of
  // the provision. A refusal whose stated ground is false is worse than no ground: it is what a
  // reader takes away when they go and check.
  assert.match(
    message,
    /s 294-50\(3\) requires s 307-80\(4\) to be DISREGARDED while the 60 days are still running/,
  );
  // BOTH directions, in one sentence, because naming one of them is how the disagreement gets
  // flattened into a gap.
  assert.match(message, /out of retirement phase for ECPI and in it for the cap at the same time/);
  assert.match(message, /wrong in one direction with nothing to say which/);
  // The consequence a reader could otherwise under-read: it is not one year.
  assert.match(message, /for that income year AND every later one/);

  // Topic-and-count, the layer that closes a REWORDING: every sentence must name one of this
  // refusal's own subjects, and there must be exactly four of them. A paraphrase can borrow an
  // on-topic word, but it must then be an extra sentence or displace an asserted one.
  const sentences = message.split(/\.\s+/).filter(Boolean);
  assert.equal(sentences.length, 4);
  for (const sentence of sentences) {
    assert.match(
      sentence,
      /commutation.authority|307-80|294-50|294-80|Div 136|retirement phase/,
      `a sentence of this refusal is about something else: ${sentence}`,
    );
  }
});

test('the two refusals have a fixed precedence when both facts are declared', () => {
  // Both are scope refusals and either would be correct, so the order is a choice — and an
  // unasserted choice is one a later edit reverses silently. It follows s 307-80's own order:
  // (3)(aa) is tested before (4).
  for (const { on, dateOfBirth } of AGED_45) {
    assert.throws(
      () => accumulationInterest(preserved(dateOfBirth, on), {
        reversionaryBeneficiary: true,
        commutationAuthority: AUTHORITY_ISSUED,
      }),
      ReversionaryStreamNotModelledError,
    );
  }
});

// --- The benign declaration, which is what stops the guard being vacuous -------------------------

test('declaring both facts benignly answers, and the declaration is recorded rather than dropped', () => {
  // Without this, every assertion above would pass against a constructor that refused
  // unconditionally. It also pins the R11 shape: an interest that never declared has NO `recipient`
  // property at all, rather than a defaulted one, so "stated and benign" and "never asked" stay
  // distinguishable in an audit trail.
  const declared = { reversionaryBeneficiary: false, commutationAuthority: NO_AUTHORITY };
  for (const { on, dateOfBirth } of AGED_45) {
    const preservedRelease = preserved(dateOfBirth, on);
    const accumulation = accumulationInterest(preservedRelease, declared);
    assert.equal(accumulation.phase, 'accumulation');
    assert.deepEqual(accumulation.recipient, declared);

    const tris = transitionToRetirementInterest(preservedRelease, declared);
    assert.equal(tris.phase, 'accumulation');
    assert.deepEqual(tris.recipient, declared);

    const retired = conditionOfRelease({ dateOfBirth: AGED_67, on, gainfulEmployment: { ceased: false } });
    const retirement = retirementPhaseInterest(retired, declared);
    assert.equal(retirement.phase, 'retirement');
    assert.deepEqual(retirement.recipient, declared);

    // Never asked: the property is absent, not `undefined`-valued by default. **All three
    // constructors, measured 2026-09-16 — with `transitionToRetirementInterest` left out, defaulting
    // its `recipient` to a benign declaration failed zero tests, and a figure nobody had asked the
    // question of came back carrying "no commutation authority has been issued" as though somebody
    // had.** A fact fabricated into an audit trail is worse than a missing one, because it reads as
    // evidence.
    assert.ok(!('recipient' in accumulationInterest(preservedRelease)));
    assert.ok(!('recipient' in transitionToRetirementInterest(preservedRelease)));
    assert.ok(!('recipient' in retirementPhaseInterest(retired)));
  }
});

test('the guard is an INPUT guard — no existing caller is on a path that can reach it', () => {
  // The over-broad-refusal mutation, which is the one a refusal added to a module with consumers
  // invites: fire it on the path callers already use. The declaration is optional and every
  // existing call site omits it, so this asserts the additive promise directly rather than by
  // reading the diff.
  for (const { on, dateOfBirth } of AGED_45) {
    const release = preserved(dateOfBirth, on);
    assert.doesNotThrow(() => accumulationInterest(release));
    assert.doesNotThrow(() => transitionToRetirementInterest(release));
  }
});

// --- Source canaries: the two mutations no runtime assertion above can see ------------------------

test('the authority guard tests the SUPPORTED value, so a third union member refuses by default', () => {
  // `commutationAuthority !== NO_COMMUTATION_AUTHORITY` and not `=== AUTHORITY_ISSUED`. The
  // difference is invisible today — the union has two members — and decides the answer the day it
  // gains a third: a comparison against the refused literal falls THROUGH for anything new, which
  // is the direction that answers where it should refuse.
  assert.match(
    PHASE_SOURCE,
    /if \(declared\.commutationAuthority !== NO_COMMUTATION_AUTHORITY\) \{/,
  );
  assert.match(
    PHASE_SOURCE,
    /const NO_COMMUTATION_AUTHORITY: CommutationAuthority =\n\s+'no commutation authority has been issued for this stream';/,
  );
  // And the union is exactly two members today, so the canary above is not guarding a set that has
  // already moved on without it.
  const union = /export type CommutationAuthority =([\s\S]*?);/.exec(PHASE_SOURCE)?.[1] ?? '';
  assert.equal([...union.matchAll(/\|\s*'/g)].length, 2);
});

test('each of the two refusals has exactly one throw site in src/, and it is the guard', () => {
  // The other side of `core-transfer-balance-account.test.mjs`'s tripwire, which this chunk struck
  // these two names from. That test asserts the other nine still have NO throw site; this one
  // asserts these two have exactly one each, so the strike cannot be widened to a refusal nobody
  // wired. Both sites sit inside `requireModelledRecipient`, which is the shape claim: an input
  // guard, in one place, not a condition sprinkled through three constructors.
  const sources = function* (dir) {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const path = join(dir, entry.name);
      if (entry.isDirectory()) yield* sources(path);
      else if (entry.name.endsWith('.ts')) yield path;
    }
  };
  const sites = new Map([
    ['ReversionaryStreamNotModelledError', []],
    ['CommutationAuthorityNotModelledError', []],
  ]);
  let filesRead = 0;
  for (const file of sources(SRC)) {
    filesRead += 1;
    const text = readFileSync(file, 'utf8');
    for (const [name, found] of sites) {
      for (const _ of text.matchAll(new RegExp(`\\bnew ${name}\\b`, 'g'))) found.push(file);
    }
  }
  assert.ok(filesRead > 10, `only ${filesRead} sources walked`);
  for (const [name, found] of sites) {
    assert.equal(found.length, 1, `${name} has ${found.length} throw sites`);
    assert.match(found[0], /core[/\\]superPhase\.ts$/, `${name} is not thrown where the entry test is`);
  }
  const guard = /const requireModelledRecipient = [\s\S]*?\n\};/.exec(PHASE_SOURCE)?.[0] ?? '';
  assert.ok(guard.length > 0);
  for (const name of sites.keys()) assert.match(guard, new RegExp(`throw new ${name}\\(`));
  // Called first in all three constructors: a guard placed after another refusal is a guard the
  // other refusal masks, which is the T122 ordering defect stated as a source property.
  assert.equal([...PHASE_SOURCE.matchAll(/requireModelledRecipient\(release\.on, declared\);/g)].length, 3);
});

test('the module records that an UNDECLARED reversionary beneficiary is not detected', () => {
  // A limit that is only true of the code is a limit the next agent removes by accident. The
  // residue is in the prose a reader of this file sees, not only in the register.
  assert.match(FLATTENED_PROSE, /cannot detect an undeclared reversionary beneficiary/);
  assert.match(FLATTENED_PROSE, /the fact is stated or it is nothing/);
  // Vacuity guard: the flattening must not have eaten the file. A block of pure `match`es on a
  // derived string is worth nothing if the derivation quietly produced something else.
  assert.match(FLATTENED_PROSE, /export const retirementPhaseInterest/);
  assert.ok(FLATTENED_PROSE.length > 5000);
  // And the honest scope of the chunk: guards, not machinery. Nothing counts the 60 days.
  assert.doesNotMatch(PHASE_SOURCE, /const \w*[Ss]ixtyDay/);
});
