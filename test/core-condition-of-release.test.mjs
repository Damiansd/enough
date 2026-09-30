// P3-6 — the Condition of Release. Register §3.9, and §9's `metNilCashingCOR = (age >= 60)` row.
//
// There is no arithmetic to hand-work here: §3.9 gives a boolean, not a number. What has to be
// hand-worked instead is the **calendar**, and every date below is derived from the two age
// records rather than typed as a literal — `birthday(PRESERVATION_AGE)` and
// `birthday(AUTOMATIC_RELEASE_AGE)` are computed from `superannuation.access.*.value`, so moving a
// record moves every fixture with it. A Person born 1966-03-15 turns 60 on 2026-03-15 and 65 on
// 2031-03-15; the day before each birthday they are one year younger, which is where the
// off-by-one lives.
//
// **The fixture that is the whole point of the item** is the third one: 60 exactly, still working,
// not released. Nothing about that Person's balance, age or intentions differs from a released
// Person except one stated fact, and getting it wrong lets a forecast spend money that cannot
// lawfully be withdrawn.
//
// §3.9's access rules are **year-invariant by construction** — `preservationAge`,
// `conditionOfRelease` and `automaticReleaseAge` are all `kind: 'constant'` with `everyYear: true`,
// so there is no year in which the answer can differ. Rather than pretend otherwise, the
// "two financial years" requirement is met by asserting that invariance directly: the same facts
// at the same age in FY2028-29 and FY2036-37 give the identical boolean, the identical grounds and
// the identical confidence, and differ only in the financial year the provenance is stamped with.
//
// NOT covered here, and not built: accumulation versus retirement phase, TTR, the transfer balance
// cap, the minimum drawdown factors, and the tax treatment of a benefit once it is released.
import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { SUPERANNUATION } from '../dist/data/assumptions/index.js';
import {
  CessationBeforePreservationAgeError,
  PreservedBenefitError,
  benefitAccess,
  conditionOfRelease,
  requireBenefitAccess,
  schedule1ItemFor,
} from '../dist/core/conditionOfRelease.js';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = join(ROOT, 'src');

const ACCESS = SUPERANNUATION.access;
const PRESERVATION_AGE = ACCESS.preservationAge.value;
const AUTOMATIC_RELEASE_AGE = ACCESS.automaticReleaseAge.value;

const BIRTH_YEAR = 1966;
const DOB = `${BIRTH_YEAR}-03-15`;
/** The Person's birthday at `age` — 60 → 2026-03-15, 65 → 2031-03-15. */
const birthday = (age) => `${BIRTH_YEAR + age}-03-15`;
/** The day before it, where they are still `age - 1`. */
const dayBefore = (age) => `${BIRTH_YEAR + age}-03-14`;

const WORKING = { ceased: false };
const ceasedAt = (age) => ({ ceased: true, ceasedOn: birthday(age) });

const release = (on, gainfulEmployment = WORKING, dateOfBirth = DOB) =>
  conditionOfRelease({ dateOfBirth, on, gainfulEmployment });

// --- The parameters this suite reads, and where they came from ----------------------------------

test('§3.9 — Preservation Age is 60, the automatic release age is 65, and both are constants', () => {
  assert.equal(PRESERVATION_AGE, 60);
  assert.equal(AUTOMATIC_RELEASE_AGE, 65);
  assert.equal(ACCESS.preservationAge.kind, 'constant');
  assert.equal(ACCESS.automaticReleaseAge.kind, 'constant');
  assert.equal(ACCESS.conditionOfRelease.kind, 'constant');
  // Year-invariant by construction: this is why no fixture below varies by year.
  assert.equal(ACCESS.preservationAge.everyYear, true);
  assert.equal(ACCESS.automaticReleaseAge.everyYear, true);
  assert.equal(ACCESS.conditionOfRelease.everyYear, true);
  assert.match(ACCESS.conditionOfRelease.value, /independent of age/);
  // Sanity on the calendar the fixtures are built on.
  assert.equal(birthday(PRESERVATION_AGE), '2026-03-15');
  assert.equal(birthday(AUTOMATIC_RELEASE_AGE), '2031-03-15');
});

// --- Reaching Preservation Age releases nothing -------------------------------------------------

test('THE TRAP — 60 exactly, still gainfully employed: NOT released', () => {
  // 1966-03-15 + 60 years = 2026-03-15. The Person is exactly at Preservation Age and has ceased
  // nothing. §3.9: "Reaching it releases nothing by itself — the Condition of Release does."
  const result = release(birthday(PRESERVATION_AGE));
  assert.equal(result.met, false);
  assert.deepEqual(result.grounds, []);
  assert.equal(benefitAccess(result).accessible, false);
});

test('every year from Preservation Age to the day before 65, still working: NOT released', () => {
  for (let age = PRESERVATION_AGE; age < AUTOMATIC_RELEASE_AGE; age += 1) {
    const result = release(birthday(age));
    assert.equal(result.met, false, `age ${age} must not be released by age alone`);
    assert.deepEqual(result.grounds, []);
  }
  // And the last day of that window: 2031-03-14, the day before the 65th birthday.
  const eve = release(dayBefore(AUTOMATIC_RELEASE_AGE));
  assert.equal(eve.met, false);
});

test('under Preservation Age, still working: NOT released, and no refusal', () => {
  const result = release(dayBefore(PRESERVATION_AGE));
  assert.equal(result.met, false);
  assert.deepEqual(result.grounds, []);
});

// --- Ceasing gainful employment after Preservation Age ------------------------------------------

test('ceased at 61, asserted at 62: released on the employment ground alone', () => {
  const result = release(birthday(62), ceasedAt(61));
  assert.equal(result.met, true);
  assert.deepEqual(result.grounds, ['ceasing gainful employment after Preservation Age']);
  const access = benefitAccess(result);
  assert.equal(access.accessible, true);
  assert.match(access.reason, /ceasing gainful employment/);
  assert.doesNotThrow(() => requireBenefitAccess(access, 'a lump sum'));
});

test('BOUNDARY — ceasing on the Preservation Age birthday itself counts', () => {
  // ageAt(1966-03-15, 2026-03-15) = 60, which is >= 60. The register says "after 60"; the day the
  // Person turns 60 is the first day they are 60, and a strict `> 60` would push it a year out.
  const result = release(birthday(PRESERVATION_AGE), ceasedAt(PRESERVATION_AGE));
  assert.equal(result.met, true);
  assert.deepEqual(result.grounds, ['ceasing gainful employment after Preservation Age']);
});

test('a cessation stated for a date after the date asked about is an error, not a release', () => {
  assert.throws(() => release(birthday(62), ceasedAt(63)), /releases nothing/);
});

// --- 65 releases regardless of anything the Person did ------------------------------------------

test('THE OTHER TRAP — 65 exactly, never ceased gainful employment: RELEASED', () => {
  const result = release(birthday(AUTOMATIC_RELEASE_AGE), WORKING);
  assert.equal(result.met, true);
  assert.deepEqual(result.grounds, ['turning the age that releases benefits by itself']);
  assert.equal(benefitAccess(result).accessible, true);
});

test('BOUNDARY — the day before the 65th birthday, still working: not released', () => {
  assert.equal(release(dayBefore(AUTOMATIC_RELEASE_AGE)).met, false);
  assert.equal(release(birthday(AUTOMATIC_RELEASE_AGE)).met, true);
});

test('at 65 both grounds can be made out, and they are reported in §3.9 order', () => {
  const result = release(birthday(AUTOMATIC_RELEASE_AGE), ceasedAt(61));
  assert.deepEqual(result.grounds, [
    'ceasing gainful employment after Preservation Age',
    'turning the age that releases benefits by itself',
  ]);
  assert.equal(result.met, true);
});

// --- The refusal, and exactly how wide it is ----------------------------------------------------

test('ceased at 58 and now 62 — §3.9 does not determine it, so it refuses', () => {
  assert.throws(() => release(birthday(62), ceasedAt(58)), CessationBeforePreservationAgeError);
});

test('the refusal is no wider than the ambiguity: it does not fire before 60 or from 65', () => {
  // Under Preservation Age both readings say not released — no refusal, a plain false.
  const early = release(birthday(59), ceasedAt(58));
  assert.equal(early.met, false);
  assert.deepEqual(early.grounds, []);
  // From the automatic release age both readings say released — no refusal, a plain true on the
  // age ground only, because the pre-60 cessation still does not make out the employment ground.
  const late = release(birthday(AUTOMATIC_RELEASE_AGE), ceasedAt(58));
  assert.equal(late.met, true);
  assert.deepEqual(late.grounds, ['turning the age that releases benefits by itself']);
});

// --- The gate ------------------------------------------------------------------------------------

test('a preserved benefit is refused by name, not returned as a falsy number', () => {
  const access = benefitAccess(release(birthday(62)));
  assert.throws(() => requireBenefitAccess(access, 'the mortgage discharge'), PreservedBenefitError);
  assert.throws(() => requireBenefitAccess(access, 'the mortgage discharge'), /Preservation Age satisfies nothing by itself/);
});

// --- The Schedule 1 item: 106 for the age ground, 101 for the employment ground ----------------
//
// Item 106 states an age and nothing else. Item 101 is "Retirement", and SISR reg 6.01(7), read
// 2026-09-29 (LR-2; O59 / U28 closed), says what retirement is: under paragraph (b)(i) the end of a
// gainful employment arrangement on or after the 60th birthday, with no further condition. Its
// intention limbs — (a), and (b)(ii) for a Person who stopped before 60 — are not mapped, because
// the model holds no intention fact; the (b)(ii) Person is refused by
// `CessationBeforePreservationAgeError` before any item can be asked for.

const ITEMS = ACCESS.conditionOfReleaseItems.value;
const EMPLOYMENT_GROUND = 'ceasing gainful employment after Preservation Age';
const AGE_GROUND = 'turning the age that releases benefits by itself';
/** Independent of the mapping records: each row is found by the instrument's column 2. */
const ITEM_FOR_ATTAINING_65 = ITEMS.find((row) => /attaining age/i.test(row.condition));
const ITEM_FOR_RETIREMENT = ITEMS.find((row) => row.condition === 'Retirement');

test('§3.9 carries SISR Schedule 1 Part 1 — five nil-cashing items, primary-verified', () => {
  assert.deepEqual(
    ITEMS.map((row) => row.item),
    ['101', '102', '102A', '103', '106'],
  );
  for (const row of ITEMS) assert.equal(row.cashingRestriction, 'Nil', `item ${row.item} is a nil-cashing item`);
  assert.equal(ACCESS.conditionOfReleaseItems.confidence, 'primary-verified');
  assert.equal(ACCESS.conditionOfReleaseItems.retrieved, '2026-09-09');
  assert.match(ACCESS.conditionOfReleaseItems.source, /Schedule 1/);
  assert.equal(ACCESS.automaticReleaseAgeItem.confidence, 'primary-verified');
  assert.equal(ACCESS.retirementItemMapping.confidence, 'primary-verified');
});

test('the item-101 mapping is read from reg 6.01(7)(b)(i): item 101, at a cessation age of 60', () => {
  assert.deepEqual(ACCESS.retirementItemMapping.value, { item: '101', ageAtCessation: 60 });
  assert.equal(ACCESS.retirementItemMapping.value.item, ITEM_FOR_RETIREMENT.item);
  assert.equal(ACCESS.retirementItemMapping.retrieved, '2026-09-29');
  assert.match(ACCESS.retirementItemMapping.source, /reg 6\.01\(7\)/);
  assert.doesNotMatch(ACCESS.retirementItemMapping.source, /NOT RETRIEVED/);
  // The quoted text carries both limbs of (b), and the note says which one is mapped.
  assert.match(ACCESS.retirementItemMapping.note, /the person attained that age on or before the ending/);
  assert.match(ACCESS.retirementItemMapping.note, /intends never\s+to again become gainfully employed/);
  // Preservation Age is not below the reg's 60, which is what lets the ground and item 101 coincide.
  assert.ok(PRESERVATION_AGE >= ACCESS.retirementItemMapping.value.ageAtCessation);
});

test('the age ground IS Schedule 1 item 106, and says so with column 2 and column 3', () => {
  const result = release(birthday(AUTOMATIC_RELEASE_AGE), WORKING);
  const identified = schedule1ItemFor(result, AGE_GROUND);
  assert.equal(identified.item, ITEM_FOR_ATTAINING_65.item);
  assert.equal(identified.item, ACCESS.automaticReleaseAgeItem.value);
  assert.equal(identified.condition, 'Attaining age 65');
  assert.equal(identified.cashingRestriction, 'Nil');
  assert.equal(identified.ground, AGE_GROUND);
  assert.equal(identified.on, birthday(AUTOMATIC_RELEASE_AGE));
  assert.equal(identified.provenance.confidence, 'primary-verified');
  assert.deepEqual(identified.provenance.caveats, []);
  assert.equal(identified.provenance.fy, '2030-31');
});

test('the employment ground IS Schedule 1 item 101 — ceased at 61, asked at 62', () => {
  const result = release(birthday(62), ceasedAt(61));
  const identified = schedule1ItemFor(result, EMPLOYMENT_GROUND);
  assert.equal(identified.item, ITEM_FOR_RETIREMENT.item);
  assert.equal(identified.item, '101');
  assert.equal(identified.condition, 'Retirement');
  assert.equal(identified.cashingRestriction, 'Nil');
  assert.equal(identified.ground, EMPLOYMENT_GROUND);
  assert.equal(identified.on, birthday(62));
  assert.equal(identified.provenance.confidence, 'primary-verified');
  assert.deepEqual(identified.provenance.caveats, []);
});

test('BOUNDARY — ceasing ON the 60th birthday is item 101: reg 6.01(7)(b)(i) says "on or before"', () => {
  const result = release(birthday(PRESERVATION_AGE), ceasedAt(PRESERVATION_AGE));
  assert.equal(schedule1ItemFor(result, EMPLOYMENT_GROUND).item, '101');
});

test('BELOW 60 — ceasing the day before the 60th birthday is NOT mapped to 101: the intention limb is not held', () => {
  // reg 6.01(7)(b)(ii): a Person who stopped at 59 is retired at 60 only if the trustee is satisfied
  // they intend never to work again. The model has no such fact, so the Person is refused before any
  // item exists to ask for — and after 65 they are on the age ground, item 106, only.
  const ceasedAt59 = { ceased: true, ceasedOn: dayBefore(PRESERVATION_AGE) };
  for (const age of [PRESERVATION_AGE, 62, AUTOMATIC_RELEASE_AGE - 1]) {
    assert.throws(() => release(birthday(age), ceasedAt59), CessationBeforePreservationAgeError, `age ${age}`);
    assert.throws(() => release(birthday(age), ceasedAt59), /reg 6\.01\(7\)\(b\)\(ii\)/);
  }
  const at65 = release(birthday(AUTOMATIC_RELEASE_AGE), ceasedAt59);
  assert.deepEqual(at65.grounds, [AGE_GROUND]);
  assert.throws(() => schedule1ItemFor(at65, EMPLOYMENT_GROUND), /the grounds made out are/);
  assert.equal(schedule1ItemFor(at65, AGE_GROUND).item, '106');
});

test('a Person on both grounds gets 101 for one and 106 for the other', () => {
  const result = release(birthday(AUTOMATIC_RELEASE_AGE), ceasedAt(61));
  assert.deepEqual(result.grounds, [EMPLOYMENT_GROUND, AGE_GROUND]);
  assert.equal(schedule1ItemFor(result, AGE_GROUND).item, ITEM_FOR_ATTAINING_65.item);
  assert.equal(schedule1ItemFor(result, EMPLOYMENT_GROUND).item, ITEM_FOR_RETIREMENT.item);
});

test('a ground the Person did not make out is a caller error, and names no item', () => {
  const working = release(birthday(62), WORKING);
  assert.equal(working.met, false);
  assert.throws(() => schedule1ItemFor(working, AGE_GROUND), RangeError);
  assert.throws(() => schedule1ItemFor(working, AGE_GROUND), /no Condition of Release is met at all/);
  assert.throws(() => schedule1ItemFor(working, EMPLOYMENT_GROUND), /no Condition of Release is met at all/);
  const aged = release(birthday(AUTOMATIC_RELEASE_AGE), WORKING);
  assert.throws(() => schedule1ItemFor(aged, EMPLOYMENT_GROUND), /the grounds made out are/);
});

test('OVER-BROAD CANARY — a caller who never asks for the item is never refused over one', () => {
  // The item accessor is additive or it is a regression. Every path that existed before it — the
  // boolean, the gate, the throw-on-preserved — must be reachable without asking for an item.
  for (let age = PRESERVATION_AGE - 5; age <= AUTOMATIC_RELEASE_AGE + 5; age += 1) {
    for (const employment of [WORKING, ceasedAt(PRESERVATION_AGE), ceasedAt(61)]) {
      if (employment !== WORKING && Number(employment.ceasedOn.slice(0, 4)) > BIRTH_YEAR + age) continue;
      let result;
      assert.doesNotThrow(() => {
        result = release(birthday(age), employment);
      }, `age ${age} must not be refused an item it never asked for`);
      assert.ok(!('item' in result), 'the item is not a field on the figure');
      const access = benefitAccess(result);
      if (access.accessible) assert.doesNotThrow(() => requireBenefitAccess(access, 'a lump sum'));
      else assert.throws(() => requireBenefitAccess(access, 'a lump sum'), PreservedBenefitError);
    }
  }
});

// --- Year invariance, stated rather than faked ---------------------------------------------------

test('the same facts at the same age give the same answer in FY2028-29 and FY2036-37', () => {
  // Two Persons, both 62 and both still working, eight financial years apart. §3.9's access
  // records are `everyYear` constants, so there is no year in which these may differ.
  const first = conditionOfRelease({ dateOfBirth: '1966-03-15', on: '2028-07-01', gainfulEmployment: WORKING });
  const second = conditionOfRelease({ dateOfBirth: '1974-03-15', on: '2036-07-01', gainfulEmployment: WORKING });
  assert.equal(first.met, second.met);
  assert.deepEqual(first.grounds, second.grounds);
  assert.equal(first.rule, second.rule);
  assert.equal(first.provenance.confidence, second.provenance.confidence);
  assert.deepEqual(first.provenance.caveats, second.provenance.caveats);
  assert.equal(first.provenance.fy, '2028-29');
  assert.equal(second.provenance.fy, '2036-37');
});

test('provenance is stamped with the financial year the date falls in, and 1 July is the boundary', () => {
  assert.equal(release('2031-06-30').provenance.fy, '2030-31');
  assert.equal(release('2031-07-01').provenance.fy, '2031-32');
});

test('the result carries §3.9 primary-verified with no caveats, and the register\'s own words', () => {
  const result = release(birthday(62), ceasedAt(61));
  assert.equal(result.provenance.confidence, 'primary-verified');
  assert.deepEqual(result.provenance.caveats, []);
  assert.equal(result.rule, ACCESS.conditionOfRelease.value);
});

// --- The mutations that must not compile ---------------------------------------------------------
//
// Same harness as `core-income-tax-mutations.test.mjs`: a scratch file compiled by `tsc` against
// the real sources, with a positive control so a probe failing for an unrelated reason cannot make
// every case below pass for the wrong reason.

const tsc = (body) => {
  const dir = mkdtempSync(join(ROOT, '.tsc-mutation-'));
  try {
    const file = join(dir, 'case.ts');
    writeFileSync(
      file,
      "import { benefitAccess, conditionOfRelease } from '../src/core/conditionOfRelease.js';\n" +
        "const RELEASE = conditionOfRelease({ dateOfBirth: '1966-03-15', on: '2031-03-15', gainfulEmployment: { ceased: false } });\n" +
        'void RELEASE; void benefitAccess; void conditionOfRelease;\n' +
        `${body}\n`,
    );
    try {
      execFileSync(
        process.execPath,
        [
          join(ROOT, 'node_modules', 'typescript', 'bin', 'tsc'),
          '--noEmit',
          '--strict',
          '--target', 'ES2022',
          '--module', 'nodenext',
          '--moduleResolution', 'nodenext',
          '--verbatimModuleSyntax',
          '--noUncheckedIndexedAccess',
          file,
        ],
        { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] },
      );
      return { ok: true, output: '' };
    } catch (error) {
      return { ok: false, output: `${error.stdout ?? ''}${error.stderr ?? ''}` };
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
};

test('the compile probe is not vacuous — the CORRECT usage compiles clean', () => {
  const result = tsc('const access = benefitAccess(RELEASE); void access.accessible;');
  assert.equal(result.ok, true, result.output);
});

test('MUTATION — "give me the age and I will tell you if super is accessible" WILL NOT COMPILE', () => {
  // The trap in one line. `benefitAccess` has one parameter and it is a branded Condition of
  // Release, so there is nowhere for an age to arrive: this is a type error, not a wrong boolean.
  const result = tsc('const access = benefitAccess(65); void access;');
  assert.equal(result.ok, false, 'an age must not be assignable where a Condition of Release is wanted');
  assert.match(result.output, /number/);
});

test('MUTATION — a hand-built Condition of Release WILL NOT COMPILE', () => {
  // The brand is what keeps `conditionOfRelease` the only route in. Without it, a caller who had
  // decided that 60 was enough could assemble the shape and skip the rule entirely.
  const result = tsc(
    "const faked = { on: '2026-03-15' as const, met: true, grounds: [], rule: '', provenance: RELEASE.provenance };\n" +
      'const access = benefitAccess(faked); void access;',
  );
  assert.equal(result.ok, false, 'only `conditionOfRelease` may produce a Condition of Release');
});

test('MUTATION — omitting the employment facts WILL NOT COMPILE', () => {
  // The facts are a required discriminated union, so "we do not know whether they stopped working"
  // cannot silently become "they did not".
  const result = tsc("void conditionOfRelease({ dateOfBirth: '1966-03-15', on: '2028-07-01' });");
  assert.equal(result.ok, false, 'the gainful employment facts must be required');
  assert.match(result.output, /gainfulEmployment/);
});

test('MUTATION — reading a Schedule 1 item off the Condition of Release WILL NOT COMPILE', () => {
  // The item is deliberately NOT a field on the figure. If it were, every existing consumer would
  // acquire it silently, and the ground whose item is unverified would need a value to put there.
  const result = tsc('void RELEASE.item; void RELEASE.grounds;');
  assert.equal(result.ok, false, 'the Schedule 1 item must not be readable off a Condition of Release');
  assert.match(result.output, /item/);
});

test('MUTATION — asking for the item of an invented ground WILL NOT COMPILE', () => {
  // `ReleaseGround` is a closed union, so "item 101" cannot arrive as a ground the register does
  // not have, and the refusal cannot be sidestepped by spelling the ground differently.
  const result = tsc(
    "import { schedule1ItemFor } from '../src/core/conditionOfRelease.js';\n" +
      "void schedule1ItemFor(RELEASE, 'retirement');",
  );
  assert.equal(result.ok, false, 'the ground must be one of the two the register states');
});

// --- The record-not-consumed canary --------------------------------------------------------------

/** Comments and strings name the ages on purpose; the greps below are about the *code*. */
const executableCode = (text) =>
  text
    .replaceAll(/\/\*[\s\S]*?\*\//g, '')
    .replaceAll(/`(?:[^`\\]|\\.)*`|'(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*"|\/\/.*$/gm, (match) =>
      match.startsWith('//') ? '' : '""',
    );

const CODE = executableCode(readFileSync(join(SRC, 'core', 'conditionOfRelease.ts'), 'utf8'));

test('the source grep is not vacuous — stripping leaves the executable code behind', () => {
  assert.match(CODE, /\bexport const conditionOfRelease\b/);
  assert.match(CODE, /\bexport const benefitAccess\b/);
  assert.ok(CODE.length > 500);
  assert.match(executableCode("const x = 1; // preservation\nconst preservation = 2;"), /preservation/);
});

test('MUTATION — hard-coding 60 or 65 instead of reading ACCESS_RULES', () => {
  // Both literals are currently *correct*, so no fixture above can see this substitution: the
  // arithmetic is blind to it, exactly as the Div 296 threshold canary is. The defence is that the
  // ages appear nowhere in executable code, so the substitution is visible in the diff and here.
  assert.doesNotMatch(CODE, /\b60\b/, 'the Preservation Age must be read from the record, never written');
  assert.doesNotMatch(CODE, /\b65\b/, 'the automatic release age must be read from the record, never written');
  assert.match(CODE, /ACCESS\.preservationAge\.value/);
  assert.match(CODE, /ACCESS\.automaticReleaseAge\.value/);
});

test('neither age is exported, so no call site can write the comparison', () => {
  assert.doesNotMatch(CODE, /export const PRESERVATION_AGE/);
  assert.doesNotMatch(CODE, /export const AUTOMATIC_RELEASE_AGE/);
  // And the gate takes exactly one parameter, which is not a date and not a number.
  assert.match(CODE, /export const benefitAccess = \(release: ConditionOfRelease\)/);
});

test('MUTATION — writing a Schedule 1 item number instead of reading the record', () => {
  // Same shape as the age canary above, and the same reason it is needed: `106` is currently
  // correct, so no fixture can see it being written by hand rather than read — and the same holds
  // for `101` now that the employment ground maps to it.
  for (const forbidden of [/\b101\b/, /\b102\b/, /\b102A\b/, /\b103\b/, /\b106\b/]) {
    assert.doesNotMatch(CODE, forbidden, `${forbidden} must be read from the register, never written`);
  }
  assert.match(CODE, /ACCESS\.conditionOfReleaseItems\.value/);
  assert.match(CODE, /ACCESS\.automaticReleaseAgeItem\.value/);
  assert.match(CODE, /ACCESS\.retirementItemMapping\.value\.item/);
  // And the item is looked up in the Schedule 1 table rather than returned bare, so a record that
  // drifted to an item the instrument does not contain is an error and not an answer.
  assert.match(CODE, /SCHEDULE_1_ITEMS\.find/);
});

test('LR-2 — the item-101 refusal is gone, and the intention limb is refused at load instead', () => {
  // `ConditionOfReleaseItemNotIdentifiedError` refused the employment ground until reg 6.01(7) was
  // read. With the ground mapped, no case was left for it; the one the mapping cannot make —
  // reg 6.01(7)(a), a preservation age under 60 — is a load-time guard on the two records.
  assert.doesNotMatch(CODE, /ConditionOfReleaseItemNotIdentifiedError/);
  assert.match(CODE, /if \(PRESERVATION_AGE < ACCESS\.retirementItemMapping\.value\.ageAtCessation\) \{\s*throw new RangeError/);
  // The guard sits at module level, before any function, so no Condition of Release exists without it.
  const guard = CODE.indexOf('if (PRESERVATION_AGE < ACCESS.retirementItemMapping');
  assert.ok(guard > 0 && guard < CODE.indexOf('export const conditionOfRelease'));
  // The mapping must not join CONSUMED: a Condition of Release does not depend on which item it is.
  assert.doesNotMatch(CODE, /CONSUMED: readonly Consumed\[\] = \[[^\]]*retirementItemMapping/);
  assert.match(CODE, /ITEM_CONSUMED\[ground\]/);
});

test('the three Schedule 1 records are consumed, and only here', () => {
  // A record in src/data/assumptions/ that nothing under src/ imports is this project's recurring
  // bug signature — and this whole chunk exists because the register named a refusal that no code
  // implemented, which is the same defect wearing the other hat.
  const sources = function* (dir) {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const path = join(dir, entry.name);
      if (entry.isDirectory()) yield* sources(path);
      else if (entry.name.endsWith('.ts')) yield path;
    }
  };
  // The rules-in-force panel (src/app/rulesInForce.ts) names every register key to classify it for
  // display; it reads, never computes. Consumption means computation, so it is left out here.
  const declaration = join(SRC, 'data', 'assumptions', 'super.ts');
  for (const key of ['conditionOfReleaseItems', 'automaticReleaseAgeItem', 'retirementItemMapping']) {
    const importers = [...sources(SRC)].filter(
      (file) => file !== declaration && file !== join(SRC, 'app', 'rulesInForce.ts') && readFileSync(file, 'utf8').includes(key),
    );
    assert.deepEqual(importers, [join(SRC, 'core', 'conditionOfRelease.ts')], `${key} must be consumed, and here`);
  }
});
