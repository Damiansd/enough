// P3-8's conversion limb — `trisEarlyConversion`, the pure routing function beside `trisInterest.ts`
// that converts a TTR interest on a user-stated EARLY day without ever going near O65.
//
// **The finding this file exists to defend.** `trisInterest.ts`'s whole design is a routing
// decision made BY READING a Condition of Release's `.grounds` — that is what O65's non-resolution
// actually is (`trisInterest.ts`'s own header). `trisEarlyConversion` sidesteps the question
// entirely rather than answering it: it never reads `.grounds`, and it never imports
// `trisInterestOrRefuse` or `trisConversionDayUnderItem106`. §1 is the behaviour, and §2 is the
// source-text tripwire that makes the sidestep a checkable property rather than a claim.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { trisEarlyConversion } from '../dist/core/trisEarlyConversion.js';
import {
  PreservedBenefitError,
  conditionOfRelease,
} from '../dist/core/conditionOfRelease.js';
import {
  ReversionaryStreamNotModelledError,
  retirementPhaseInterest,
} from '../dist/core/superPhase.js';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = join(ROOT, 'src');

/** Comments out, string literals blanked — so prose cannot satisfy or defeat a source assertion. */
const executableCode = (text) =>
  text
    .replaceAll(/\/\*[\s\S]*?\*\//g, '')
    .replaceAll(/`(?:[^`\\]|\\.)*`|'(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*"|\/\/.*$/gm, (match) =>
      match.startsWith('//') ? '' : '""',
    );

/** Import specifiers off the RAW text. A specifier is a string literal, so the stripped code cannot hold one. */
const imports = (raw) => [...raw.matchAll(/\bfrom\s*['"]([^'"]+)['"]/g)].map(([, specifier]) => specifier);

const RAW = readFileSync(join(SRC, 'core', 'trisEarlyConversion.ts'), 'utf8');
const CODE = executableCode(RAW);

// Preservation age is 60 and the automatic release age is 65 (`SUPERANNUATION.access`), read off
// the record everywhere in this project — a Person who ceased gainful employment at 62 has met a
// Condition of Release on the EMPLOYMENT ground alone, which is a genuinely early, pre-65 case.
const DOB = '1968-05-14';
const CEASED_ON = '2030-01-01'; // Dana turns 61 on 2029-05-14, so this is after Preservation Age.
const ON = '2030-06-01';

const metEarly = (declared) =>
  conditionOfRelease({ dateOfBirth: DOB, on: ON, gainfulEmployment: { ceased: true, ceasedOn: CEASED_ON } });

const notMet = () => conditionOfRelease({ dateOfBirth: DOB, on: ON, gainfulEmployment: { ceased: false } });

// --- §1 Behaviour: a thin door in front of retirementPhaseInterest, nothing more -----------------

test('a met, early Condition of Release asserted for the stated day converts, identically to calling retirementPhaseInterest directly', () => {
  const release = metEarly();
  assert.equal(release.met, true);
  assert.equal(release.on, ON);

  const converted = trisEarlyConversion(release, ON);
  assert.equal(converted.phase, 'retirement');
  assert.equal(converted.on, ON);
  assert.deepEqual({ ...converted }, { ...retirementPhaseInterest(release) });
});

test('a mismatched day is refused — the release must be asserted FOR the stated day', () => {
  const release = metEarly();
  assert.throws(() => trisEarlyConversion(release, '2030-06-02'), RangeError);
  try {
    trisEarlyConversion(release, '2030-06-02');
    assert.fail('nothing was thrown');
  } catch (error) {
    assert.match(error.message, /2030-06-01/);
    assert.match(error.message, /2030-06-02/);
  }
});

test('an UNMET Condition of Release still refuses — this function goes THROUGH the gate, not around it', () => {
  const release = notMet();
  assert.equal(release.met, false);
  assert.throws(() => trisEarlyConversion(release, ON), RangeError);
});

test('a declared reversionary beneficiary still refuses AS that fact — the same gate, not reimplemented', () => {
  const release = metEarly();
  assert.throws(
    () => trisEarlyConversion(release, ON, { reversionaryBeneficiary: true, commutationAuthority: 'no commutation authority has been issued for this stream' }),
    ReversionaryStreamNotModelledError,
  );
});

test('the vacuity control on §1: an UNMET release really is refused for a reason other than the day mismatch', () => {
  // If `trisEarlyConversion` silently ignored `release.met`, this would still throw for the wrong
  // reason (a day mismatch) rather than the gate. Asserting the day matches AND it still throws
  // rules that out.
  const release = notMet();
  assert.equal(release.on, ON);
  assert.throws(() => trisEarlyConversion(release, ON), PreservedBenefitError);
});

// --- §2 The source tripwire: the O65 sidestep is structural, not a claim -------------------------

test('SOURCE PIN — trisEarlyConversion.ts never imports the O65-facing routing it sidesteps', () => {
  const specifiers = imports(RAW);
  assert.ok(
    !specifiers.some((s) => s.includes('trisInterest') && !s.includes('trisEarlyConversion')),
    'trisEarlyConversion.ts imports trisInterest.ts',
  );
  assert.ok(!specifiers.some((s) => s.includes('trisConversionDay')), 'trisEarlyConversion.ts imports trisConversionDay.ts');
  assert.doesNotMatch(CODE, /trisInterestOrRefuse|trisConversionDayUnderItem106/, 'trisEarlyConversion.ts calls the routing it is supposed to sidestep');
});

test('SOURCE PIN — trisEarlyConversion.ts never reads a Condition of Release’s .grounds', () => {
  assert.doesNotMatch(CODE, /\.grounds\b/, 'trisEarlyConversion.ts reads .grounds — the O65 sidestep is no longer structural');
});

test('vacuity control on §2: the walker really does find the calls and imports THIS file DOES make', () => {
  assert.ok(imports(RAW).some((s) => s.includes('superPhase')), 'the import walker found nothing — every assertion above could be vacuous');
  assert.match(CODE, /retirementPhaseInterest\(/, 'the stripped-code walker found no calls — every assertion above could be vacuous');
});
