// P3-9 chunks 5b-4 and 5b-6 — §3.10.8's narrowing, done by choosing an existing door (5b-4) and by
// giving the one route with NO door its registered refusal (5b-6).
//
// `trisInterestOrRefuse` computes nothing. Everything it can return is built by a constructor in
// `superPhase.ts` and everything it can throw is raised by `superPhase.ts` or by
// `trisConversionDay.ts`, so every test below is about **which door a set of facts goes through**.
// Three routings, and the two that are not the item-106 case must behave exactly as they did
// before this file existed:
//
//   1. the condition is not met          -> the accumulation TRIS, answered;
//   2. met, automatic-release ground ALONE, and R13's day resolves -> a RetirementPhaseInterest;
//   2b. met, the employment ground WITHOUT the age ground, a STATED item of 101/102A/103, and no
//       stated notification day           -> `TrisNotificationNotStatedError` (5b-6);
//   3. met, anything else in the grounds -> `TrisRetirementPhaseNotModelledError`, unchanged.
//
// **Where the Persons come from, hand-worked, never off the implementation.** Preservation age is
// 60 and the automatic release age is 65, both read from `SUPERANNUATION.access`.
//
//   * `DOB` 1961-07-01. 65th birthday **2026-07-01**; 62nd **2023-07-01**; 61st **2022-07-01**.
//   * `LEAP_DOB` 1960-02-29. `nthBirthday` resolves the 65th to **2025-03-01** (1960 + 65 = 2025,
//     not a leap year), its own documented edge and the direction that understates.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { trisInterestOrRefuse } from '../dist/core/trisInterest.js';
import {
  ReversionaryStreamNotModelledError,
  TrisNotificationNotStatedError,
  TrisRetirementPhaseNotModelledError,
  accumulationInterest,
  retirementPhaseInterest,
  transitionToRetirementInterest,
} from '../dist/core/superPhase.js';
import { conditionOfRelease, schedule1ItemFor } from '../dist/core/conditionOfRelease.js';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = join(ROOT, 'src');

const executableCode = (text) =>
  text
    .replaceAll(/\/\*[\s\S]*?\*\//g, '')
    .replaceAll(/`(?:[^`\\]|\\.)*`|'(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*"|\/\/.*$/gm, (match) =>
      match.startsWith('//') ? '' : '""',
    );

const RAW = readFileSync(join(SRC, 'core', 'trisInterest.ts'), 'utf8');
const CODE = executableCode(RAW);
const DAY_RAW = readFileSync(join(SRC, 'core', 'trisConversionDay.ts'), 'utf8');
const PHASE_RAW = readFileSync(join(SRC, 'core', 'superPhase.ts'), 'utf8');
const PHASE = executableCode(PHASE_RAW);
const REGISTER = readFileSync(join(ROOT, 'docs', 'assumptions-register.md'), 'utf8');

const DOB = '1961-07-01';
const SIXTY_FIFTH = '2026-07-01';
const SIXTY_SECOND = '2023-07-01';
const LEAP_DOB = '1960-02-29';
const LEAP_SIXTY_FIFTH = '2025-03-01';

const AGE_GROUND = 'turning the age that releases benefits by itself';
const EMPLOYMENT_GROUND = 'ceasing gainful employment after Preservation Age';

/** Never ceased gainful employment, asked on `on`. The only ground they can ever hold is item 106's. */
const neverCeased = (dateOfBirth, on) =>
  conditionOfRelease({ dateOfBirth, on, gainfulEmployment: { ceased: false } });

/** Ceased on `ceasedOn`, asked on `on`. At 62 that is the employment ground — the 101 route. */
const ceasedAt = (dateOfBirth, ceasedOn, on) =>
  conditionOfRelease({ dateOfBirth, on, gainfulEmployment: { ceased: true, ceasedOn } });

const settings = (extra = {}) => ({ commencementDay: '2019-09-01', ...extra });

/**
 * A **SYNTHETIC** `Schedule1ItemIdentification`, labelled as such. Items 102A and 103 (and 102,
 * 104, 105) cannot be produced by `schedule1ItemFor`, which answers only 106 and (since LR-2,
 * 2026-09-29) 101. So a real item-106 identification is taken from the real mapping and its `item`
 * and `ground` overridden — the shape is the module's, the two fields are the test's, and nothing
 * computes the number.
 */
const syntheticItem = (item, ground = EMPLOYMENT_GROUND) => ({
  ...schedule1ItemFor(neverCeased(DOB, SIXTY_FIFTH), AGE_GROUND),
  item,
  ground,
});

/** The exact limb-2b Person: ceased at 62, asked at 63. Employment ground alone, `met` true. */
const RETIRED_AT_62 = () => ceasedAt(DOB, SIXTY_SECOND, '2024-07-01');
const ASKED_ON = '2024-07-01';

// --- The register passages this chunk acts on, quote-checked before anything is asserted ----------

test('the register still says what this chunk was built from — the narrowing, and O65', () => {
  // The instruction. `trisInterestOrRefuse` exists because of this paragraph, and a reworded
  // paragraph is a changed instruction.
  assert.ok(
    REGISTER.includes(
      '**Narrow, do not widen, the existing refusal.** `TrisRetirementPhaseNotModelledError` currently fires\nfor **every** Person with `release.met === true`.',
    ),
    'the §3.10.8 narrowing instruction has moved or been reworded',
  );
  assert.ok(
    REGISTER.includes('the\nnarrowing presupposes the overlap case of **O65** and R5\'s stated conversion day, so it must be done\nwith both in hand.'),
    'the two preconditions this chunk claims to have in hand',
  );
  // And the overlap this chunk deliberately does NOT resolve.
  assert.ok(REGISTER.includes('**The overlap case is NOT settled — O65.**'));
  assert.ok(
    REGISTER.includes('A member who retired at\n62 on **item 101**, never notified, and then turns 65 satisfies limb (b)(ii) **on its own terms**'),
    'the exact Person the fall-through below is built around',
  );
});

// --- Limb 2: the POSITIVE case, which is the whole point of the chunk -----------------------------

test('a clean item-106 Person with a resolvable day gets a RetirementPhaseInterest, not the refusal', () => {
  // **T117, stated and not assumed.** This Person never ceased gainful employment, so no item 101,
  // 102A or 103 was satisfied before the birthday and the only Schedule 1 item they hold is 106 —
  // asserted through the real mapping rather than narrated.
  const release = neverCeased(DOB, SIXTY_FIFTH);
  assert.equal(release.met, true);
  assert.deepEqual([...release.grounds], [AGE_GROUND]);
  assert.equal(schedule1ItemFor(release, AGE_GROUND).item, '106');

  // With nothing stated, R13's backstop resolves to the 65th birthday and the stream is converted.
  const converted = trisInterestOrRefuse(DOB, undefined, release);
  assert.equal(converted.phase, 'retirement');
  assert.equal(converted.incomeStream, 'a superannuation income stream in the retirement phase');
  assert.equal(converted.on, SIXTY_FIFTH);

  // The mutation this case exists to catch is the one that never lands: falling through to limb 3.
  assert.doesNotThrow(() => trisInterestOrRefuse(DOB, undefined, release));
  assert.notEqual(converted.phase, 'accumulation');

  // And the result is the existing door's, identical field for field — nothing new is minted here.
  assert.deepEqual({ ...converted }, { ...retirementPhaseInterest(release) });

  // A stated changeover day before the birthday resolves too, and it is the same door.
  const stated = settings({ statedTrisConversionDay: '2024-03-15' });
  assert.equal(trisInterestOrRefuse(DOB, stated, release).phase, 'retirement');

  // The leap-year Person, the second computable case.
  const leap = neverCeased(LEAP_DOB, LEAP_SIXTY_FIFTH);
  assert.deepEqual([...leap.grounds], [AGE_GROUND]);
  assert.equal(trisInterestOrRefuse(LEAP_DOB, undefined, leap).phase, 'retirement');
});

// --- Limb 3: the two cases that must keep refusing exactly as they do today ------------------------

test('O65 is NOT resolved — both grounds at once falls through to the existing refusal', () => {
  // The register's own Person: retired at 62 on item 101, never notified, and then turns 65. On the
  // bare text of s 307-80(3)(b)(ii) the stream never converts; on the ATO's reading it converts on
  // the birthday. `grounds` carries both, and this chunk picks neither side.
  const overlap = ceasedAt(DOB, SIXTY_SECOND, SIXTY_FIFTH);
  assert.equal(overlap.met, true);
  assert.deepEqual([...overlap.grounds], [EMPLOYMENT_GROUND, AGE_GROUND]);
  assert.ok(overlap.grounds.includes(AGE_GROUND), 'a .includes routing would convert this Person');

  assert.throws(() => trisInterestOrRefuse(DOB, undefined, overlap), TrisRetirementPhaseNotModelledError);
  // The same refusal, word for word, that calling the constructor directly has always produced.
  assert.equal(
    (() => { try { trisInterestOrRefuse(DOB, undefined, overlap); } catch (error) { return error.message; } })(),
    (() => { try { transitionToRetirementInterest(overlap); } catch (error) { return error.message; } })(),
  );
  // Not even a stated changeover day converts them: the route is what is unsettled, not the day.
  assert.throws(
    () => trisInterestOrRefuse(DOB, settings({ statedTrisConversionDay: SIXTY_FIFTH }), overlap),
    TrisRetirementPhaseNotModelledError,
  );
  // And the leap Person overlaps the same way.
  const leapOverlap = ceasedAt(LEAP_DOB, '2022-03-01', LEAP_SIXTY_FIFTH);
  assert.deepEqual([...leapOverlap.grounds], [EMPLOYMENT_GROUND, AGE_GROUND]);
  assert.throws(() => trisInterestOrRefuse(LEAP_DOB, undefined, leapOverlap), TrisRetirementPhaseNotModelledError);
});

test('a Person on the 101/102A/103 route reaches the EXISTING refusal and nothing else', () => {
  // Ceased at 62, asked at 63: the employment ground alone, `met` true, and no item 106 in sight.
  // **Nothing is STATED about this stream**, and after 5b-6 that is exactly why they still land on
  // the old refusal: limb 2b reads a stated Schedule 1 item and does not derive one. The
  // notification limb below is the same Person WITH an item stated.
  const retired = ceasedAt(DOB, SIXTY_SECOND, '2024-07-01');
  assert.equal(retired.met, true);
  assert.deepEqual([...retired.grounds], [EMPLOYMENT_GROUND]);

  assert.throws(() => trisInterestOrRefuse(DOB, undefined, retired), TrisRetirementPhaseNotModelledError);
  assert.throws(() => trisInterestOrRefuse(DOB, undefined, retired), /conversion limb of P3-8/);
  // Even with a notification day stated — 5b-6 is the chunk that reads it, and it is not this one.
  assert.throws(
    () => trisInterestOrRefuse(DOB, settings({ statedNotificationDay: '2024-07-15' }), retired),
    TrisRetirementPhaseNotModelledError,
  );
  // The refusal is the constructor's, not a second one minted here.
  assert.equal(
    (() => { try { trisInterestOrRefuse(DOB, undefined, retired); } catch (error) { return error.name; } })(),
    'TrisRetirementPhaseNotModelledError',
  );
});

// --- Limb 1: the unmet condition is answered, not refused -------------------------------------------

test('a Person who has not met a Condition of Release gets the accumulation TRIS, unchanged', () => {
  const working = neverCeased(DOB, '2022-07-01'); // 61, still working
  assert.equal(working.met, false);
  assert.deepEqual([...working.grounds], []);

  const interest = trisInterestOrRefuse(DOB, undefined, working);
  assert.equal(interest.phase, 'accumulation');
  assert.equal(interest.incomeStream, 'a transition to retirement income stream');
  assert.deepEqual({ ...interest }, { ...transitionToRetirementInterest(working) });
  // It is the TRIS constructor and not the plain accumulation one — the two differ in `reason`.
  assert.notEqual(interest.reason, accumulationInterest(working).reason);

  // A settings block that contradicts R13 is NOT consulted for this Person: no conversion is due,
  // so there is no day to contradict. The mutation is resolving the day before testing `met`.
  assert.equal(
    trisInterestOrRefuse(DOB, settings({ statedTrisConversionDay: '2030-01-01' }), working).phase,
    'accumulation',
  );
});

// --- The refusals R13 raises must PROPAGATE, never be swallowed ------------------------------------

test('the after-65 contradiction propagates out of limb 2 — it is not swallowed into a conversion', () => {
  // 5b-3's contradiction: a stated changeover day after the birthday item 106 had already converted
  // the stream on. A `try/catch` around the day resolution would hand this Person a
  // RetirementPhaseInterest over the top of two facts that cannot both be true.
  const release = neverCeased(DOB, SIXTY_FIFTH);
  for (const day of ['2026-07-02', '2029-01-15']) {
    const stated = settings({ statedTrisConversionDay: day });
    assert.throws(() => trisInterestOrRefuse(DOB, stated, release), RangeError);
    assert.throws(() => trisInterestOrRefuse(DOB, stated, release), /contradict each other/);
    assert.throws(() => trisInterestOrRefuse(DOB, stated, release), new RegExp(day));
    assert.throws(() => trisInterestOrRefuse(DOB, stated, release), new RegExp(SIXTY_FIFTH));
  }
  // Exactly a RangeError, and NOT the named refusal: this is an input-boundary contradiction over
  // two user statements, not the scope refusal. A swallowed contradiction would return instead.
  try {
    trisInterestOrRefuse(DOB, settings({ statedTrisConversionDay: '2029-01-15' }), release);
    assert.fail('the contradiction did not throw — it was swallowed');
  } catch (error) {
    assert.equal(error.constructor, RangeError);
    assert.ok(!(error instanceof TrisRetirementPhaseNotModelledError));
  }
  // The leap Person, one day past their own birthday.
  const leap = neverCeased(LEAP_DOB, LEAP_SIXTY_FIFTH);
  assert.throws(
    () => trisInterestOrRefuse(LEAP_DOB, settings({ statedTrisConversionDay: '2025-03-02' }), leap),
    /contradict each other/,
  );
});

test('clean grounds plus an OFF-ROUTE Setting is reachable, and it refuses rather than converting', () => {
  // Not a dead branch, and worth stating why. The grounds are computed per Person from age and
  // employment; the Settings are stated per stream by the user. A Person who turned 65 and never
  // ceased gainful employment has the automatic-release ground ALONE and can still have a
  // notification day, or an item-101 identification, recorded against one of their streams. The
  // two facts disagree, nothing here can say which is wrong, and 5b-3 refuses.
  const release = neverCeased(DOB, SIXTY_FIFTH);
  assert.deepEqual([...release.grounds], [AGE_GROUND]);

  assert.throws(
    () => trisInterestOrRefuse(DOB, settings({ statedNotificationDay: '2024-07-15' }), release),
    /notification day of 2024-07-15/,
  );
  const onItem101 = {
    ...schedule1ItemFor(release, AGE_GROUND),
    item: '101',
    ground: EMPLOYMENT_GROUND,
  };
  assert.throws(
    () => trisInterestOrRefuse(DOB, settings({ statedSchedule1Item: onItem101 }), release),
    /age-65 route only/,
  );
  // And the item-106 identification is exactly the route this answers, so it converts.
  assert.equal(
    trisInterestOrRefuse(DOB, settings({ statedSchedule1Item: schedule1ItemFor(release, AGE_GROUND) }), release).phase,
    'retirement',
  );
});

// --- The declared facts still refuse first (T122's ordering) -----------------------------------------

test('a declared reversionary beneficiary refuses AS that fact, ahead of the day resolution', () => {
  // s 307-80(3)(aa) failing puts the stream in retirement phase whatever item the recipient
  // satisfied, so the item-106 analysis is moot for them. Refusing them over a stated changeover
  // day would mask the declared fact with a refusal the declaration had made irrelevant (T122).
  const release = neverCeased(DOB, SIXTY_FIFTH);
  const declared = { reversionaryBeneficiary: true, commutationAuthority: 'no commutation authority has been issued for this stream' };
  assert.throws(() => trisInterestOrRefuse(DOB, undefined, release, declared), ReversionaryStreamNotModelledError);
  assert.throws(
    () => trisInterestOrRefuse(DOB, settings({ statedTrisConversionDay: '2029-01-15' }), release, declared),
    ReversionaryStreamNotModelledError,
    'the contradiction must not mask the declared fact',
  );
  // On limbs 1 and 3 the same fact refuses, because the constructor there guards first too.
  assert.throws(
    () => trisInterestOrRefuse(DOB, undefined, neverCeased(DOB, '2022-07-01'), declared),
    ReversionaryStreamNotModelledError,
  );
  assert.throws(
    () => trisInterestOrRefuse(DOB, undefined, ceasedAt(DOB, SIXTY_SECOND, SIXTY_FIFTH), declared),
    ReversionaryStreamNotModelledError,
  );
  // A benign declaration is carried through the converted door rather than dropped.
  const benign = { reversionaryBeneficiary: false, commutationAuthority: 'no commutation authority has been issued for this stream' };
  assert.deepEqual(trisInterestOrRefuse(DOB, undefined, release, benign).recipient, benign);
});

// --- MUTATION — `transitionToRetirementInterest` itself is untouched --------------------------------

test('MUTATION — the existing refusal still fires on release.met, and its return type is still pinned', () => {
  // The narrowing is done by giving the item-106 Person a DIFFERENT DOOR, never by weakening this
  // one. If `release.met` stopped being the trigger, or the return type stopped being
  // `AccumulationInterest`, the pin that makes "a TRIS in Retirement Phase" unwriteable in
  // `superPhase.ts` would have gone with it — and every Person limb 3 hands back would be answered
  // by a function that no longer refuses.
  assert.match(
    PHASE_RAW,
    /export const transitionToRetirementInterest = \(\n  release: ConditionOfRelease,\n  declared\?: DeclaredRecipient,\n\): AccumulationInterest => \{/,
  );
  assert.match(PHASE, /if \(release\.met\) throw new TrisRetirementPhaseNotModelledError\(release\.on\);/);

  // Behaviourally, from both sides of `met`, called directly and not through the new door.
  assert.throws(() => transitionToRetirementInterest(neverCeased(DOB, SIXTY_FIFTH)), TrisRetirementPhaseNotModelledError);
  assert.throws(() => transitionToRetirementInterest(ceasedAt(DOB, SIXTY_SECOND, '2024-07-01')), TrisRetirementPhaseNotModelledError);
  assert.equal(transitionToRetirementInterest(neverCeased(DOB, '2022-07-01')).phase, 'accumulation');

  // **The clean item-106 Person still refuses at the OLD door.** This is the shape of the narrowing
  // stated as a test: the refusal did not get narrower, the route around it got built.
  assert.throws(() => transitionToRetirementInterest(neverCeased(DOB, SIXTY_FIFTH)), TrisRetirementPhaseNotModelledError);
  assert.equal(trisInterestOrRefuse(DOB, undefined, neverCeased(DOB, SIXTY_FIFTH)).phase, 'retirement');
});

test('MUTATION — this module mints no refusal of its own, and holds no throw at all', () => {
  // Every refusal reachable from here is raised by `superPhase.ts` or `trisConversionDay.ts`. A
  // `throw` appearing in this file is either a fourteenth refusal name the register would have to
  // carry (R8) or a second spelling of a contradiction 5b-3 already owns.
  assert.doesNotMatch(CODE, /export class \w+ extends RangeError/);
  // **NARROWED 2026-09-16 by chunk 5b-6, and replaced rather than deleted.** This assertion was
  // `doesNotMatch(CODE, /\bthrow\b/)` — "the refusals here are inherited, never minted" — and 5b-6
  // had to give `TrisNotificationNotStatedError` a throw site, which is its own ground gone. The
  // ground that survives is the one that mattered: no refusal is MINTED here. So the census is now
  // exact — one throw, and it is the registered name, imported from `superPhase.ts`. A second
  // `throw` of any kind fails this, which is the same protection the blanket ban gave.
  const throws = [...CODE.matchAll(/\bthrow\b/g)];
  assert.equal(throws.length, 1, 'exactly one throw in this module, and 5b-6 is which one');
  assert.match(CODE, /throw new TrisNotificationNotStatedError\(release\.on\);/);
  assert.ok(
    /import \{[^}]*\bTrisNotificationNotStatedError\b[^}]*\} from '\.\/superPhase\.js';/s.test(RAW),
    'the name is superPhase.ts\'s, imported — not a second spelling declared here',
  );
  assert.doesNotMatch(CODE, /\bcatch\b/, 'a catch here is the swallowed contradiction');
  // And it computes no day and reads no record: the age arithmetic stays one module away.
  assert.doesNotMatch(CODE, /\b65\b/);
  assert.doesNotMatch(CODE, /nthBirthday/);
  assert.doesNotMatch(CODE, /SUPERANNUATION/);
  // Vacuity guard: the stripping left executable code behind.
  assert.ok(CODE.length > 400);
  assert.match(CODE, /export const trisInterestOrRefuse/);
  assert.match(executableCode('const x = 65; // sixty-five\nthrow new RangeError("x");'), /65[\s\S]*throw/);
});

test('MUTATION — the routing demands the automatic-release ground ALONE', () => {
  // `.includes` instead of the length test is the silent resolution of O65, and it is invisible in
  // every fixture except the overlap Person. Pinned in the source as well as in behaviour, because
  // the source says which mistake was avoided.
  assert.match(CODE, /grounds\.length === 1 && grounds\[0\] === AUTOMATIC_RELEASE_GROUND/);
  // **NARROWED 2026-09-16 by chunk 5b-6.** This was a blanket `doesNotMatch(CODE, /grounds\.includes/)`,
  // because in 5b-4 the only conceivable use of it was the O65-resolving mistake. Limb 2b legitimately
  // uses `.includes` twice — once to require the employment ground and once to EXCLUDE the
  // automatic-release one — so the ban is replaced by an exact census: two uses, one of each, and
  // neither of them inside `automaticReleaseAlone`, whose body is pinned above.
  const includes = [...CODE.matchAll(/grounds\.includes\((\w+)\)/g)].map(([, ground]) => ground);
  assert.deepEqual(includes, ['EMPLOYMENT_GROUND', 'AUTOMATIC_RELEASE_GROUND']);
  assert.match(
    CODE,
    /if \(grounds\.includes\(AUTOMATIC_RELEASE_GROUND\)\) return false;/,
    'the O65 exclusion is a NEGATIVE test — dropping it fires limb 2b at the overlap Person',
  );
  assert.match(CODE, /satisfies ReleaseGround/, 'the ground is checked against the exported union');

  // **The third copy of the ground literal, cross-checked against the other two.** The union has
  // two members, so a drifted copy would silently equal the OTHER one and route the employment
  // ground into limb 2 — a mistake `tsc` cannot see. Read out of both sources and compared.
  const literal = (text) => /const AUTOMATIC_RELEASE_GROUND = '([^']+)' satisfies ReleaseGround;/.exec(text)?.[1];
  assert.equal(literal(RAW), AGE_GROUND);
  assert.equal(literal(DAY_RAW), AGE_GROUND);
  assert.equal(literal(RAW), literal(DAY_RAW));
  assert.equal(
    literal(readFileSync(join(SRC, 'core', 'conditionOfRelease.ts'), 'utf8')),
    AGE_GROUND,
    'the module that owns the union spells it this way, and both copies must match it',
  );
});

// --- Structural: the dependency runs one way, and superPhase.ts stays clean -------------------------

test('superPhase.ts does not import this module, and no age arrives there by this door', () => {
  // The cycle this would be: `superPhase.ts` -> `trisInterest.ts` -> `superPhase.ts`. It would also
  // walk a date of birth into the module whose executable text is grepped for exactly that, one
  // indirection later.
  //
  // **The specifiers are read off the RAW source, and that is a correction.** `executableCode`
  // blanks every string literal, so an import specifier in it is `""` and a `doesNotMatch` against
  // the stripped text can never see one — measured 2026-09-16: adding
  // `import { trisInterestOrRefuse } from './trisInterest.js';` to `superPhase.ts` is invisible to
  // a grep of the stripped code. The same flaw is why the *positive* half below is asserted here
  // too: a walker that cannot find an import that DOES exist proves nothing about one that does not.
  const importsOf = (text) => [...text.matchAll(/\bfrom\s*['"]([^'"]+)['"]/g)].map(([, specifier]) => specifier);
  assert.ok(importsOf(PHASE_RAW).includes('./conditionOfRelease.js'), 'the walker cannot see an import that exists');
  assert.ok(!importsOf(PHASE_RAW).includes('./trisInterest.js'), 'superPhase.ts must not import the router');
  assert.ok(!importsOf(PHASE_RAW).includes('./trisConversionDay.js'), 'nor the day function, one indirection away');
  assert.doesNotMatch(PHASE, /\bdateOfBirth\b/);
  // And in this direction the import is real, so the assertion above is about a door and not about
  // a module nobody depends on.
  assert.ok(importsOf(RAW).includes('./superPhase.js'));
  assert.ok(importsOf(RAW).includes('./trisConversionDay.js'));
  // `trisConversionDay.ts` stays a day function: it must not learn about the phase model either.
  assert.ok(!importsOf(DAY_RAW).includes('./superPhase.js'));
  assert.ok(!importsOf(DAY_RAW).includes('./trisInterest.js'));
});

test('the item-106 narrowing is recorded where a reader of the CODE will find it, not only in the register', () => {
  // The register row and the class's own doc comment are updated in the same change as this file.
  // A narrowing recorded in one place only is the drift this project keeps repeating.
  assert.match(RAW, /Narrow, do not widen/);
  assert.match(RAW, /O65 is NOT resolved here/);
  assert.match(PHASE_RAW, /trisInterestOrRefuse/, 'the refusal must say which door now answers the item-106 case');
  assert.doesNotMatch(PHASE_RAW, /no such Setting exists yet/, 'chunks 5b-2 and 5b-3 built it');
  assert.ok(
    REGISTER.includes('trisInterestOrRefuse'),
    '§3.10.8 must record the mechanism, not just the fact, of the item-106 narrowing',
  );
});


// ===================================================================================================
// P3-9 chunk 5b-6 — limb 2b. The registered refusal that had no throw site until 2026-09-16.
// ===================================================================================================

test('5b-6 — the register and R13 still say what this limb was built from', () => {
  // R13's own words, which the brief for this chunk turns on: the backstop is item 106's ONLY, and
  // the three notification routes still need the stated day. A reworded ruling is a changed one.
  const rulings = readFileSync(join(ROOT, 'docs', 'research', 'p3-9-chunks', 'RULINGS.md'), 'utf8');
  assert.ok(
    rulings.includes("R5's reasoning bites on the 101/102A/103 routes, where the day depends on a\nnotification only the user knows — those still need the stated day."),
    "R13's scoping of its own backstop to item 106",
  );
  // And R13's instruction about this very name: decide it deliberately, never delete it quietly.
  assert.ok(rulings.includes('**Do not delete the name on that basis** — decide it deliberately\nwhen 5b is built'));

  // The §3.10.8 status cell, which must now say BUILT-and-wired rather than "no throw site yet".
  assert.ok(
    REGISTER.includes('**WIRED 2026-09-16 by P3-9 chunk 5b-6**, at exactly one throw site: **limb 2b of `trisInterestOrRefuse`**'),
    '§3.10.8 must name the site and the date, not merely record that one exists',
  );
  // The old claim is CORRECTED, not deleted: the cell still carries "no throw site yet" as a quote
  // of what it used to say, inside the parenthetical this register uses for a superseded ground.
  assert.ok(
    REGISTER.includes('*(This cell said, until 5b-6: **no throw site yet**'),
    'the superseded status must be recorded as superseded, not silently dropped',
  );
  assert.ok(
    !REGISTER.includes('`TrisNotificationNotStatedError`, still has **no throw site** and is chunk 5b-6\'s'),
    '§3.10.6 must no longer assert, in its own voice, that this refusal has no throw site',
  );
  // §3.10.6's corrected closing paragraph: the two limbs that are left, and no more.
  assert.ok(REGISTER.includes('**Chunk 5b is COMPLETE as of 2026-09-16.**'));
  assert.ok(REGISTER.includes('Exactly two\nlimbs remain open, and they are different in kind:**'));
  // O48's count moved by exactly one, in the direction a throw site moves it.
  assert.ok(REGISTER.includes('**FIVE are now reachable and SEVEN are not**'));
  // O65 is NOT strengthened by this chunk and must still read as open. O59 / U28 was closed on
  // 2026-09-29 by LR-2, and its §3.10.8 row must say so rather than still reading as open.
  assert.ok(REGISTER.includes('**The overlap case is NOT settled — O65.**'));
  assert.ok(
    !REGISTER.includes('The item-101 mapping stays `unverified` until SISR reg 6.01(7) is retrieved'),
    'O59 / U28 is closed and the register must not still say the mapping is unverified',
  );
  assert.ok(REGISTER.includes('**DELETED 2026-09-29 (LR-2)**'));
});

test('5b-6 — the exact trigger throws the NAMED refusal, on each of the three enumerated items', () => {
  const retired = RETIRED_AT_62();
  assert.equal(retired.met, true);
  assert.deepEqual([...retired.grounds], [EMPLOYMENT_GROUND]);
  assert.ok(!retired.grounds.includes(AGE_GROUND), 'O65 is not in play for this Person');

  for (const item of ['101', '102A', '103']) {
    const stated = settings({ statedSchedule1Item: syntheticItem(item) });
    assert.throws(() => trisInterestOrRefuse(DOB, stated, retired), TrisNotificationNotStatedError);
    // NOT the generic one. `TrisNotificationNotStatedError` does not extend it, so this is a real
    // discrimination and not a subclass coincidence.
    assert.throws(() => trisInterestOrRefuse(DOB, stated, retired), (error) => {
      assert.equal(error.name, 'TrisNotificationNotStatedError');
      assert.ok(!(error instanceof TrisRetirementPhaseNotModelledError));
      return true;
    });
    // Byte-identical to the class raised directly — a re-wording here would be a second refusal.
    assert.equal(
      (() => { try { trisInterestOrRefuse(DOB, stated, retired); } catch (error) { return error.message; } })(),
      new TrisNotificationNotStatedError(ASKED_ON).message,
    );
  }
});

test('5b-6 — the message carries the consequence and the known-bad shortcut, through THIS door', () => {
  // §3.10.8 requires the message to carry the *fortnight is worth a year* consequence and to name
  // TR 2013/5 ¶71B. `core-transfer-balance-account.test.mjs` asserts that of the constructed class;
  // this asserts it of the error a real input configuration actually produces, which is the half
  // that could rot if the throw site ever handed over a different class.
  const stated = settings({ statedSchedule1Item: syntheticItem('101') });
  const thrown = (() => {
    try { trisInterestOrRefuse(DOB, stated, RETIRED_AT_62()); } catch (error) { return error; }
    return undefined;
  })();
  assert.ok(thrown instanceof TrisNotificationNotStatedError);
  assert.match(thrown.message, /a fortnight is worth a year/);
  assert.match(thrown.message, /TR 2013\/5\s*¶71B/);
  assert.match(thrown.message, /s 307-80\(3\)\(b\)\(ii\)/);
  assert.match(thrown.message, /LCR 2016\/9 Example 1B/);
  // T80 / T117 — the trap this message exists to stop, carried through the door that now routes it.
  assert.match(thrown.message, /does NOT apply to item 106/);
  // The day the phase was asked for, which is the Condition of Release's own `on`.
  assert.match(thrown.message, new RegExp(ASKED_ON));
  assert.equal(thrown.on, undefined, 'the class carries the day in the message, not as a field');
});

test('5b-6 — NEAR MISS: no stated item at all falls through to the OLD refusal, unchanged', () => {
  // The trigger reads a STATED item. Since LR-2 (2026-09-29) `schedule1ItemFor` does map this
  // Person's employment ground onto item 101, and limb 2b still does not take the derivation:
  // routing every retiree without a stated item onto the notification refusal is a separate call.
  const retired = RETIRED_AT_62();
  for (const stated of [undefined, settings(), settings({ statedTrisConversionDay: '2023-08-01' })]) {
    assert.throws(() => trisInterestOrRefuse(DOB, stated, retired), TrisRetirementPhaseNotModelledError);
    assert.equal(
      (() => { try { trisInterestOrRefuse(DOB, stated, retired); } catch (error) { return error.message; } })(),
      (() => { try { transitionToRetirementInterest(retired); } catch (error) { return error.message; } })(),
    );
  }
  // The derivation IS available now, so the fall-through is the stated-item rule and nothing else.
  assert.equal(schedule1ItemFor(retired, EMPLOYMENT_GROUND).item, '101');
});

test('5b-6 — NEAR MISS: a STATED notification day falls through to the OLD refusal, and that is the gap', () => {
  // **The finding of this chunk, asserted rather than narrated.** This Person answered the question
  // the refusal asks. There is still no converted-101/102A/103 interest constructor in `src/` for
  // them to land on, so they get the GENERIC refusal — a worse message for the better-informed user.
  // When that constructor is built this test must be REWRITTEN, not deleted.
  const retired = RETIRED_AT_62();
  for (const item of ['101', '102A', '103']) {
    const stated = settings({ statedSchedule1Item: syntheticItem(item), statedNotificationDay: '2023-07-15' });
    assert.throws(() => trisInterestOrRefuse(DOB, stated, retired), TrisRetirementPhaseNotModelledError);
    assert.equal(
      (() => { try { trisInterestOrRefuse(DOB, stated, retired); } catch (error) { return error.name; } })(),
      'TrisRetirementPhaseNotModelledError',
    );
  }
  // Nothing in src/ builds a retirement-phase interest on a notification day, which is why.
  const sources = function* (dir) {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const path = join(dir, entry.name);
      if (entry.isDirectory()) yield* sources(path);
      else if (entry.name.endsWith('.ts')) yield path;
    }
  };
  // Every module that READS the field — `.statedNotificationDay`, which excludes `household.ts`,
  // where it is declared and not read.
  const readers = [...sources(SRC)].filter((file) =>
    /\.statedNotificationDay\b/.test(executableCode(readFileSync(file, 'utf8'))),
  );
  assert.deepEqual(
    readers.sort(),
    [join(SRC, 'core', 'trisConversionDay.ts'), join(SRC, 'core', 'trisInterest.ts')].sort(),
    'the notification day is read only to REFUSE; a third reader means someone built the converted route',
  );
  // Vacuity control for the `.`-prefixed grep: it must still find the DECLARATION's own file by the
  // undotted name, or "only two readers" would be a fact about a regex and not about the codebase.
  assert.ok(
    readFileSync(join(SRC, 'core', 'household.ts'), 'utf8').includes('statedNotificationDay'),
    'the field is declared in household.ts and the sweep above is deliberately blind to declarations',
  );
});

test('5b-6 — NEAR MISS: item 106 stated on the employment ground does NOT fire the notification limb', () => {
  // T80 / T117 from the routing side. Item 106 is in s 307-80(3)(b)(i)'s reference and not in
  // (3)(b)(ii)'s, so there is nothing to notify — a limb that tested "any Schedule 1 item" would
  // tell a Person who turned 65 that a notification is missing.
  const retired = RETIRED_AT_62();
  for (const item of ['106', '102', '104', '105(b)', '']) {
    const stated = settings({ statedSchedule1Item: syntheticItem(item) });
    assert.throws(() => trisInterestOrRefuse(DOB, stated, retired), TrisRetirementPhaseNotModelledError);
  }
  // And the enumeration is a literal SET in the source, not a range or a prefix test.
  assert.match(CODE, /const NOTIFICATION_ROUTE_ITEMS: readonly string\[\] = \[""(?:, "")*\];/);
  const items = /const NOTIFICATION_ROUTE_ITEMS: readonly string\[\] = \[([^\]]*)\];/
    .exec(RAW)[1]
    .split(',')
    .map((entry) => entry.trim().replace(/^'|'$/g, ''));
  assert.deepEqual(items, ['101', '102A', '103']);
  assert.ok(!items.includes('106'), 'T80 / T117');
});

test('5b-6 — NEAR MISS: the O65 overlap Person carrying BOTH grounds keeps the old refusal', () => {
  // O65 stays exactly as open as it was. This Person retired at 62 on item 101, never notified, and
  // then turned 65 — they hold both grounds, and they are the one fixture that can see the
  // difference between excluding the age ground and not bothering to.
  const overlap = ceasedAt(DOB, SIXTY_SECOND, SIXTY_FIFTH);
  assert.deepEqual([...overlap.grounds], [EMPLOYMENT_GROUND, AGE_GROUND]);
  assert.ok(overlap.grounds.includes(EMPLOYMENT_GROUND), 'the employment half of limb 2b matches them');

  for (const item of ['101', '102A', '103']) {
    const stated = settings({ statedSchedule1Item: syntheticItem(item) });
    assert.throws(() => trisInterestOrRefuse(DOB, stated, overlap), TrisRetirementPhaseNotModelledError);
    assert.equal(
      (() => { try { trisInterestOrRefuse(DOB, stated, overlap); } catch (error) { return error.name; } })(),
      'TrisRetirementPhaseNotModelledError',
      'dropping limb 2b\'s automatic-release exclusion picks a side of O65',
    );
  }
});

test('5b-6 — NEAR MISS: an unmet condition is still answered, never refused for a missing notification', () => {
  // Limb 1 comes first, and it must: a Person who has met no condition satisfied no Schedule 1 item,
  // so there is nothing to have notified. A stated item on such a stream is the user's mistake and
  // not this function's to refuse.
  const working = neverCeased(DOB, '2022-07-01');
  assert.equal(working.met, false);
  const stated = settings({ statedSchedule1Item: syntheticItem('101') });
  assert.equal(trisInterestOrRefuse(DOB, stated, working).phase, 'accumulation');
  assert.doesNotThrow(() => trisInterestOrRefuse(DOB, stated, working));
});

test('5b-6 — T122: a declared reversionary beneficiary refuses AS that fact, ahead of limb 2b', () => {
  // s 307-80(3)(aa) failing collapses the conjunction whatever item the recipient satisfied, so a
  // reverted stream must not be refused over a notification the declaration has made irrelevant.
  // This is limb 2's ordering taken again, and the guard is reached through `accumulationInterest`,
  // the one exported constructor that decides nothing about this Person.
  const retired = RETIRED_AT_62();
  const stated = settings({ statedSchedule1Item: syntheticItem('101') });
  const reversionary = { reversionaryBeneficiary: true, commutationAuthority: 'no commutation authority has been issued for this stream' };
  assert.throws(() => trisInterestOrRefuse(DOB, stated, retired, reversionary), ReversionaryStreamNotModelledError);
  // A benign declaration does not stop the notification refusal.
  const benign = { reversionaryBeneficiary: false, commutationAuthority: 'no commutation authority has been issued for this stream' };
  assert.throws(() => trisInterestOrRefuse(DOB, stated, retired, benign), TrisNotificationNotStatedError);
  // And no declaration at all behaves the same, so the guard is not the trigger.
  assert.throws(() => trisInterestOrRefuse(DOB, stated, retired, undefined), TrisNotificationNotStatedError);
});

test('MUTATION — the stated item is READ, never derived, and limb 2b precedes the catch-all', () => {
  // **The stated-item rule as a source assertion.** `schedule1ItemFor` is one import away. If it
  // ever appears in this module's executable text, limb 2b would fire for every retiree rather than
  // for the ones who said which item they satisfied — verified mapping or not, a routing change.
  assert.doesNotMatch(CODE, /schedule1ItemFor/);
  // `executableCode` strips block comments, line comments and string literals. The header DOES
  // discuss `schedule1ItemFor` by name — that is the reasoning, recorded — so the assertion above is
  // about executable text only, and this is the control that says the name is genuinely in the file.
  assert.match(RAW, /schedule1ItemFor/, 'the header must still record WHY the derivation is refused');
  assert.match(CODE, /stated\?\.statedSchedule1Item/);
  assert.match(CODE, /stated\?\.statedNotificationDay === undefined/);
  // The enumeration is not merely DECLARED, it is USED. A limb that widened to "any stated item"
  // would leave `NOTIFICATION_ROUTE_ITEMS` sitting in the file, correct and unconsulted, and the
  // set-contents pin above would keep passing over the top of it.
  assert.match(CODE, /!NOTIFICATION_ROUTE_ITEMS\.includes\(statedItem\.item\)/);
  // Vacuity control: the same grep DOES find the derivation where a module really does take it.
  assert.match(
    executableCode(readFileSync(join(SRC, 'core', 'conditionOfRelease.ts'), 'utf8')),
    /schedule1ItemFor/,
    'the grep cannot find a use that exists, so finding none proves nothing',
  );

  // **Reachability, as a source ordering and not only as a behaviour.** Limb 2b placed after the
  // catch-all is dead code: every Person it answers for also fails `automaticReleaseAlone`.
  const limb2b = CODE.indexOf('notificationRouteWithTheFactUnstated(release.grounds, stated)');
  const catchAll = CODE.indexOf('if (!automaticReleaseAlone(release.grounds))');
  const limb1 = CODE.indexOf('if (!release.met)');
  assert.ok(limb1 > 0 && limb2b > limb1, 'limb 2b must come after the unmet-condition test');
  assert.ok(catchAll > limb2b, 'limb 2b must come BEFORE the catch-all or it is unreachable');
});

test('MUTATION — the fourth ground literal matches the module that owns the union', () => {
  // The union has two members. A drifted EMPLOYMENT_GROUND would silently equal the automatic-release
  // one, and limb 2b would then demand the age ground and exclude it in the same breath — a
  // never-firing refusal that `tsc` cannot see and no behavioural test would distinguish from a
  // correctly-scoped one unless it asserted the positive case, which the tests above do.
  const literal = (text, name) => new RegExp(`const ${name} = '([^']+)' satisfies ReleaseGround;`).exec(text)?.[1];
  assert.equal(literal(RAW, 'EMPLOYMENT_GROUND'), EMPLOYMENT_GROUND);
  assert.equal(
    literal(readFileSync(join(SRC, 'core', 'conditionOfRelease.ts'), 'utf8'), 'EMPLOYMENT_GROUND'),
    EMPLOYMENT_GROUND,
  );
  assert.notEqual(literal(RAW, 'EMPLOYMENT_GROUND'), literal(RAW, 'AUTOMATIC_RELEASE_GROUND'));
});
