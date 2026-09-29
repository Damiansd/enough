// P3-9 chunk 5b-3 — R13's conversion-day resolution.
//
// R13 (docs/research/p3-9-chunks/RULINGS.md, 2026-09-16) orders two facts and leaves one edge open:
//
//   1. a stated changeover day wins whenever it is present;
//   2. otherwise the 65th birthday, derived from date of birth, because SISR Schedule 1 item 106
//      converts a TRIS automatically on that day;
//   3. OPEN, and decided by this chunk: a stated day AFTER the 65th birthday is a contradiction and
//      is REFUSED, per chunk 6-3's precedent, rather than silently resolved by preferring either.
//
// **Where the days come from, hand-worked, never off the implementation.**
//   * 1961-07-01 + 65 years -> 1961 + 65 = 2026, month and day unchanged -> **2026-07-01**.
//   * 1960-02-29 + 65 years -> 1960 + 65 = 2025, which is not a leap year, so `nthBirthday` resolves
//     to 1 March (its own documented edge, and the direction that understates) -> **2025-03-01**.
//
// **Two dates of birth, deliberately.** A single fixture DOB makes the birthday arithmetic
// untestable in the way a single computable year makes an indexation untestable: the leap-year DOB
// is the second case, and it drives the equality boundary and the contradiction a second time.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { trisConversionDayUnderItem106 } from '../dist/core/trisConversionDay.js';
import { conditionOfRelease, schedule1ItemFor } from '../dist/core/conditionOfRelease.js';
import { nthBirthday } from '../dist/core/financialYear.js';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = join(ROOT, 'src');

const executableCode = (text) =>
  text
    .replaceAll(/\/\*[\s\S]*?\*\//g, '')
    .replaceAll(/`(?:[^`\\]|\\.)*`|'(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*"|\/\/.*$/gm, (match) =>
      match.startsWith('//') ? '' : '""',
    );

const RAW = readFileSync(join(SRC, 'core', 'trisConversionDay.ts'), 'utf8');
const CODE = executableCode(RAW);
const PHASE = executableCode(readFileSync(join(SRC, 'core', 'superPhase.ts'), 'utf8'));
const REGISTER = readFileSync(join(ROOT, 'docs', 'assumptions-register.md'), 'utf8');

const MID_YEAR_DOB = '1961-07-01';
const MID_YEAR_65TH = '2026-07-01';
const LEAP_DOB = '1960-02-29';
const LEAP_65TH = '2025-03-01';

/**
 * **T117, honoured rather than assumed.** The register requires that any fixture asserting automatic
 * conversion at 65 also state that no item 101, 102A or 103 was satisfied before the birthday —
 * otherwise it asserts a proposition s 307-80(3)(b)(ii)'s bare text denies. This builds the
 * statement out of the real constructors: a Person who NEVER ceased gainful employment
 * (`{ ceased: false }`) can have satisfied none of the retirement, terminal-illness or incapacity
 * items, and the only Schedule 1 item they hold is the one `schedule1ItemFor` names — item 106,
 * read from the record, satisfied ON the birthday and not before it.
 */
const item106For = (dateOfBirth, on) =>
  schedule1ItemFor(
    conditionOfRelease({ dateOfBirth, on, gainfulEmployment: { ceased: false } }),
    'turning the age that releases benefits by itself',
  );

test('the register passage this file honours still says what it is quoted as saying (T117 / O65)', () => {
  // Quote-checked, because every fixture below that asserts conversion at 65 is shaped by it.
  assert.ok(
    REGISTER.includes(
      'Any fixture asserting automatic conversion at 65 must state\nthat no item 101, 102A or 103 was satisfied before the birthday',
    ),
    'T117 has moved or been reworded — the fixtures below were built to its old text',
  );
  assert.ok(REGISTER.includes('**The overlap case is NOT settled — O65.**'));
  // And R13's own words for the two limbs, so the order below is not this file's invention.
  const rulings = readFileSync(join(ROOT, 'docs', 'research', 'p3-9-chunks', 'RULINGS.md'), 'utf8');
  assert.ok(rulings.includes('**A stated changeover day**'));
  assert.ok(rulings.includes('**Otherwise the 65th birthday**, derived from date of birth.'));
  assert.ok(
    rulings.includes('A stated changeover day **after** the 65th\nbirthday is a contradiction'),
    'the open edge this chunk closes',
  );
});

// --- R13 limb 1: the stated day wins ---------------------------------------------------------------

test('a stated changeover day BEFORE the 65th birthday is the answer — the derived day is not used', () => {
  // R13 limb 1, and the mutation it defends against is "prefer the derived day": that would move
  // this Person's conversion from 2024-03-15 to 2026-07-01, two years and three months late, and
  // with it the transfer balance credit and the end of the 10% TTR maximum.
  const stated = { commencementDay: '2019-09-01', statedTrisConversionDay: '2024-03-15' };
  assert.equal(trisConversionDayUnderItem106(MID_YEAR_DOB, stated), '2024-03-15');
  assert.notEqual(trisConversionDayUnderItem106(MID_YEAR_DOB, stated), MID_YEAR_65TH);

  // The leap DOB, the second computable case: stated 2011-01-31, derived 2025-03-01.
  const early = { commencementDay: '2010-07-01', statedTrisConversionDay: '2011-01-31' };
  assert.equal(trisConversionDayUnderItem106(LEAP_DOB, early), '2011-01-31');
  assert.notEqual(trisConversionDayUnderItem106(LEAP_DOB, early), LEAP_65TH);
});

// --- R13 limb 2: the 65th birthday is the backstop --------------------------------------------------

test('with nothing stated, the conversion day is the 65th birthday (T117 stated, not assumed)', () => {
  // **T117.** Both Persons here never ceased gainful employment, so no item 101, 102A or 103 was
  // satisfied before the birthday and the only item they hold is 106 — asserted, not narrated.
  const midYear = item106For(MID_YEAR_DOB, MID_YEAR_65TH);
  assert.equal(midYear.item, '106');
  assert.equal(midYear.on, MID_YEAR_65TH);
  const leap = item106For(LEAP_DOB, LEAP_65TH);
  assert.equal(leap.item, '106');

  // The day itself, hand-worked in this file's header and independent of `nthBirthday`.
  assert.equal(trisConversionDayUnderItem106(MID_YEAR_DOB, undefined), '2026-07-01');
  assert.equal(trisConversionDayUnderItem106(LEAP_DOB, undefined), '2025-03-01');

  // And a settings block that exists but states no changeover day falls to the same backstop:
  // "the object was supplied" is not "the day was answered".
  assert.equal(
    trisConversionDayUnderItem106(MID_YEAR_DOB, { commencementDay: '2019-09-01' }),
    '2026-07-01',
  );
  assert.equal(
    trisConversionDayUnderItem106(LEAP_DOB, { commencementDay: '2010-07-01' }),
    '2025-03-01',
  );

  // The derived day agrees with the one function that is allowed to compute it — a cross-check on
  // the hand-worked literals above, not a substitute for them.
  assert.equal(nthBirthday(MID_YEAR_DOB, 65), '2026-07-01');
  assert.equal(nthBirthday(LEAP_DOB, 65), '2025-03-01');
});

test('KNOWN-UNSAFE, MONITORED — the backstop cannot check T117 itself, and understates', () => {
  // The honest limit of the fixture above. `StatedStreamSettings` carries no "no item 101/102A/103
  // was satisfied" field, so a Person who retired at 62 on item 101, never notified their provider,
  // and states nothing is handed 2026-07-01 by this function with nothing refused. The register
  // implements the ATO's reading (65 converts) and carries the anomaly as O50 / O65 / U16; this
  // function inherits that inference rather than resolving it.
  //
  // **The direction, which is why it is tolerated (R13).** Modelling a conversion LATER than it
  // really happened charges 15% on fund earnings that were in fact exempt and keeps the 10% TTR
  // maximum in place — it UNDERSTATES the household. The flattering direction would be an early
  // conversion day, and this function can only produce one if the user states it.
  assert.equal(trisConversionDayUnderItem106(MID_YEAR_DOB, undefined), MID_YEAR_65TH);
  assert.ok(MID_YEAR_65TH > '2023-07-01', 'the 62nd birthday — the day the item 101 Person really converted');

  // TRIPWIRE. If `StatedStreamSettings` ever grows a field that states the T117 fact, this function
  // must read it and this test must be rewritten as the refusal (or the narrower backstop) it asks
  // for, rather than deleted.
  const household = readFileSync(join(SRC, 'core', 'household.ts'), 'utf8');
  const settings = /export interface StatedStreamSettings \{([\s\S]*?)\n\}/.exec(household)?.[1] ?? '';
  assert.ok(settings.length > 0, 'StatedStreamSettings was not found — the grep below is vacuous');
  // **Six since 2026-09-23, and the sixth is not the T117 fact.** `statedTtrDrawdownRate` is the
  // share of the balance a TTR pays each year; it says nothing about which Schedule 1 item was
  // satisfied or whether a provider was notified, so this function still has nothing to read.
  assert.equal(
    [...settings.matchAll(/\breadonly \w+\??:/g)].length,
    6,
    'StatedStreamSettings gained or lost a field — if it can now state the T117 fact, read it here',
  );
});

// --- The open edge R13 left to this chunk ----------------------------------------------------------

test('a stated day EQUAL to the 65th birthday is NOT a contradiction — it is the same fact twice', () => {
  // The boundary decision, and the reason it is `>` and not `>=`: item 106 converts ON the 65th
  // birthday, so a user stating that exact day agrees with the backstop. Refusing here would refuse
  // the most accurate statement a user on this route can make.
  assert.equal(
    trisConversionDayUnderItem106(MID_YEAR_DOB, { commencementDay: '2019-09-01', statedTrisConversionDay: MID_YEAR_65TH }),
    MID_YEAR_65TH,
  );
  assert.equal(
    trisConversionDayUnderItem106(LEAP_DOB, { commencementDay: '2010-07-01', statedTrisConversionDay: LEAP_65TH }),
    LEAP_65TH,
  );
  // The day before is likewise fine, so the accepted band is closed at the birthday and not merely
  // open below it — an `>=` would fail the two above, a `>=` shifted by a day fails these.
  assert.equal(
    trisConversionDayUnderItem106(MID_YEAR_DOB, { commencementDay: '2019-09-01', statedTrisConversionDay: '2026-06-30' }),
    '2026-06-30',
  );
  assert.equal(
    trisConversionDayUnderItem106(LEAP_DOB, { commencementDay: '2010-07-01', statedTrisConversionDay: '2025-02-28' }),
    '2025-02-28',
  );
});

test('a stated day AFTER the 65th birthday is REFUSED, not silently preferred either way', () => {
  // Chunk 6-3's precedent, applied: two Settings that cannot both be true are named together and
  // neither is chosen. Preferring the stated day would record the transfer balance credit late, at
  // a later balance against a possibly indexed cap; preferring the derived day would discard a fact
  // the user actually supplied. Neither is a finding.
  for (const [dateOfBirth, birthday, day] of [
    [MID_YEAR_DOB, MID_YEAR_65TH, '2026-07-02'], // one day after — the tightest case
    [MID_YEAR_DOB, MID_YEAR_65TH, '2029-01-15'],
    [LEAP_DOB, LEAP_65TH, '2025-03-02'], // one day after, on the leap-year DOB
  ]) {
    const settings = { commencementDay: '2010-07-01', statedTrisConversionDay: day };
    assert.throws(() => trisConversionDayUnderItem106(dateOfBirth, settings), RangeError);
    // The message names BOTH days, so a reader can see which two facts collided.
    assert.throws(() => trisConversionDayUnderItem106(dateOfBirth, settings), new RegExp(day));
    assert.throws(() => trisConversionDayUnderItem106(dateOfBirth, settings), new RegExp(birthday));
    assert.throws(() => trisConversionDayUnderItem106(dateOfBirth, settings), /contradict each other/);
    assert.throws(() => trisConversionDayUnderItem106(dateOfBirth, settings), /Drop one of them/);
  }
});

test('the contradiction is a plain RangeError — no fourteenth refusal name is minted', () => {
  // §3.10.8 is the register's one home for refusal names (R8) and `refusal-names.test.mjs` reads it
  // in both directions, so an `export class … extends RangeError` here is a name the register must
  // carry forever. This is an input-boundary consistency check over two user statements — the same
  // thing `transferBalanceAccountShape` and `transferBalanceAccountDaysAsStated` do, both with a
  // plain `RangeError` — and not a gap in the register.
  assert.doesNotMatch(CODE, /export class \w+ extends RangeError/);
  assert.equal([...CODE.matchAll(/throw new (\w+)/g)].map(([, name]) => name).join(','), 'RangeError,RangeError,RangeError');
  try {
    trisConversionDayUnderItem106(MID_YEAR_DOB, { commencementDay: '2019-09-01', statedTrisConversionDay: '2030-01-01' });
    assert.fail('the contradiction did not throw');
  } catch (error) {
    assert.equal(error.constructor, RangeError, 'exactly RangeError, not a subclass');
  }
});

// --- The scope: item 106 only, enforced rather than claimed -------------------------------------------

test('a stated NOTIFICATION day takes the stream off this route, and the backstop is unreachable', () => {
  // `household.ts`: "On item 106 there is nothing to notify and this stays absent". Its presence is
  // the 101/102A/103 route, where the day turns on a notification nothing here can derive (R5,
  // undisturbed by R13). The dangerous version is the second call: with no stated changeover day,
  // a function that checked the route only when a day was stated would hand a Person who retired at
  // 62 on item 101 the 65th birthday, silently.
  const notified = { commencementDay: '2019-09-01', statedNotificationDay: '2024-07-15' };
  assert.throws(() => trisConversionDayUnderItem106(MID_YEAR_DOB, notified), /notification day of 2024-07-15/);
  assert.throws(() => trisConversionDayUnderItem106(MID_YEAR_DOB, notified), /item 106 route/);
  assert.throws(
    () => trisConversionDayUnderItem106(MID_YEAR_DOB, { ...notified, statedTrisConversionDay: '2024-07-15' }),
    RangeError,
  );
});

test('a stated Schedule 1 item that is not the automatic-release one is off this route too', () => {
  // The ground, not the item number: `automaticReleaseAgeItem` is pinned by
  // `core-condition-of-release.test.mjs` as consumed in `conditionOfRelease.ts` and nowhere else,
  // and writing `106` here would be the second unsourced copy of an instrument's own column.
  const onItem106 = item106For(MID_YEAR_DOB, MID_YEAR_65TH);
  assert.equal(
    trisConversionDayUnderItem106(MID_YEAR_DOB, { commencementDay: '2019-09-01', statedSchedule1Item: onItem106 }),
    MID_YEAR_65TH,
    'the item-106 identification is exactly the route this function answers',
  );

  // The other ground in the union, written out by hand — which is the point: a settings block can
  // carry it however it was obtained.
  const onItem101 = { ...onItem106, item: '101', ground: 'ceasing gainful employment after Preservation Age' };
  assert.throws(
    () => trisConversionDayUnderItem106(MID_YEAR_DOB, { commencementDay: '2019-09-01', statedSchedule1Item: onItem101 }),
    /age-65 route only/,
  );
  assert.throws(
    () =>
      trisConversionDayUnderItem106(MID_YEAR_DOB, {
        commencementDay: '2019-09-01',
        statedSchedule1Item: onItem101,
        statedTrisConversionDay: '2024-03-15',
      }),
    RangeError,
    'even with a stated day: this function does not answer for that route at all',
  );
});

// --- Structural: the age stays out of superPhase.ts, and the 65 stays out of core -----------------

test('this resolution is NOT reachable from superPhase.ts', () => {
  // The grep `core-super-phase.test.mjs` installed at 5b-1 names `nthBirthday` and `birthday`; it
  // does not name this module, and importing it would walk the same birthday in one indirection
  // later. Asserted here, where the module that would be imported lives.
  assert.doesNotMatch(PHASE, /trisConversionDay/i);
  assert.doesNotMatch(PHASE, /trisConversionDayUnderItem106/);
  assert.match(CODE, /export const trisConversionDayUnderItem106/, 'the name the grep above is for');
  // And in the other direction: nothing under src/ imports this module yet (5b-5 is the consumer),
  // so the assertion above is about a door, not about an existing dependency.
  assert.doesNotMatch(PHASE, /\.\/trisConversionDay\.js/);
});

test('MUTATION — hard-coding 65 instead of reading the automatic release age record', () => {
  // The literal is currently *correct*, so no fixture above can see the substitution: every day
  // asserted in this file would be identical. The defence is that no age appears in executable code.
  assert.doesNotMatch(CODE, /\b65\b/, 'the automatic release age must be read from the record, never written');
  assert.doesNotMatch(CODE, /\b60\b/);
  assert.match(CODE, /SUPERANNUATION\.access\.automaticReleaseAge\.value/);
  assert.match(CODE, /nthBirthday\(dateOfBirth, AUTOMATIC_RELEASE_AGE\)/);
  // The Schedule 1 item numbers are read nowhere here — the ground carries the routing instead.
  for (const forbidden of [/\b101\b/, /\b102\b/, /\b103\b/, /\b106\b/]) {
    assert.doesNotMatch(CODE, forbidden, `${forbidden} must not be written into this module`);
  }
  assert.match(CODE, /satisfies ReleaseGround/, 'the ground is checked against the exported union');
  // Vacuity guard: the stripping left executable code behind.
  assert.ok(CODE.length > 500);
  assert.match(executableCode("const x = 65; // sixty-five\nconst y = 1;"), /65/);
});
