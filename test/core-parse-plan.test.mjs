// P8-1 — `parsePlan`: the one door `unknown` comes through to become a `PlanFile`.
//
// **The finding this file exists for.** `Entry` is a nineteen-member union and only SEVEN members
// can be constructed in TypeScript; the other twelve carry `UnspecifiedParams`, whose symbol key
// no object literal can produce. That protection is **compiler-only**, and a plan file is JSON on
// a disk. `projection.ts` dispatches on `entry.type` with scattered `if`s and no exhaustive
// switch, so a `HEAS_DRAW` in a file would be **silently ignored** and the forecast would be
// confidently wrong. §3 is the assertion that the hole is shut, one named type at a time.
//
// **What "lossless" is asserted to mean.** Not `deepEqual` alone: two objects can be deeply equal
// and still project differently if a field the engine reads was dropped and re-defaulted. §1
// compares a **digest of the 501 projected months** of the reparsed plan against the in-memory
// one, which is the property that actually matters — the round trip changes no figure anywhere.
//
// **Vacuity control runs first.** A refusal test passes for free if the input it feeds was already
// invalid for some other reason, so §0 asserts that the base file this file mutates is ACCEPTED,
// and every refusal below is a single-field mutation of that same accepted object.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { monthlyFromAnnual, project } from '../dist/core/projection.js';
import { addCents } from '../dist/core/money.js';
import { ENTRY_TYPES } from '../dist/core/plan.js';
import { DEMO_PLAN } from '../dist/app/demoHousehold.js';
import {
  PLAN_FILE_VERSION,
  PlanFileAmountError,
  PlanFileDateError,
  PlanFileEntryError,
  PlanFileHouseholdError,
  PlanFileSettingsError,
  PlanFileShapeError,
  PlanFileVersionError,
  TTR_RATE_CEILING,
  TTR_RATE_FLOOR,
  UNSPECIFIED_ENTRY_TYPES,
  UnspecifiedEntryTypeError,
  parsePlan,
} from '../dist/core/parsePlan.js';

/** The file as it would be on disk — JSON, with every brand and every prototype gone. */
const onDisk = () => JSON.parse(JSON.stringify(DEMO_PLAN));

const digest = (months) => createHash('sha256').update(JSON.stringify(months)).digest('hex');

/** `assert.throws` returns nothing, and these tests read the messages. */
const thrown = (fn) => {
  try { fn(); } catch (error) { return error; }
  return assert.fail('nothing was thrown');
};

// The source sweep in §3c reads `src/` directly, on `test/core-div293-charge.test.mjs`'s pattern.
const SRC = resolve(dirname(fileURLToPath(import.meta.url)), '..', 'src');
const tsFiles = (dir) =>
  readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? tsFiles(path) : name.endsWith('.ts') ? [path] : [];
  });
/** Comments out, string literals blanked — so prose and a quoted field name cannot satisfy a pin. */
const executableCode = (text) =>
  text
    .replaceAll(/\/\*[\s\S]*?\*\//g, '')
    .replaceAll(/`(?:[^`\\]|\\.)*`|'(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*"|\/\/.*$/gm, (match) =>
      match.startsWith('//') ? '' : '""',
    );

/** Import specifiers off the RAW text. A specifier is a string literal, so the stripped code cannot hold one. */
const imports = (raw) => [...raw.matchAll(/\bfrom\s*['"]([^'"]+)['"]/g)].map(([, specifier]) => specifier);

/** Apply `edit` to a fresh copy of the demo file and return it. */
const mutated = (edit) => {
  const file = onDisk();
  edit(file);
  return file;
};

// --- §0 Vacuity control ---------------------------------------------------------------------------

test('the file every refusal below is a single mutation of is itself accepted', () => {
  const parsed = parsePlan(onDisk());
  assert.equal(parsed.version, PLAN_FILE_VERSION);
  assert.equal(parsed.entries.length, DEMO_PLAN.entries.length);
  assert.ok(parsed.entries.length > 0, 'a file with no entries would make §3 vacuous');
  assert.equal(parsed.household.persons.length, 2);
});

// --- §1 The round trip is lossless, measured on the PROJECTION ---------------------------------------

test('a plan file survives JSON and reproduces itself field for field', () => {
  assert.deepEqual(parsePlan(onDisk()), DEMO_PLAN);
});

test('the reparsed plan projects to exactly the same months as the in-memory one', () => {
  const memory = project(DEMO_PLAN.settings, DEMO_PLAN.household, DEMO_PLAN.entries);
  const reparsed = parsePlan(onDisk());
  const again = project(reparsed.settings, reparsed.household, reparsed.entries);

  assert.equal(again.length, memory.length);
  assert.ok(memory.length > 400, `the demo walk is ${memory.length} months — too short to be the real one`);
  assert.equal(digest(again), digest(memory));
});

test('parsePlan returns a NEW object and never the input with a type over it', () => {
  const file = onDisk();
  const parsed = parsePlan(file);
  assert.notEqual(parsed, file);
  assert.notEqual(parsed.household, file.household);
  assert.notEqual(parsed.entries[0], file.entries[0]);
  // An unchecked field riding along inside the returned object is the failure this guards.
  assert.deepEqual(Object.keys(parsed).sort(), ['activeScenarioId', 'entries', 'household', 'scenarios', 'settings', 'version']);
});

test('an absent optional field stays absent — the round trip does not invent keys', () => {
  const parsed = parsePlan(onDisk());
  // Dana's super interest has no `statedStreamSettings`; Ash's has one. `{ …, x: undefined }` and
  // `{ … }` are different objects, and only the second survives a second JSON round trip.
  assert.ok(!Object.hasOwn(parsed.household.persons[0].superInterests[0], 'statedStreamSettings'));
  assert.ok(Object.hasOwn(parsed.household.persons[1].superInterests[0], 'statedStreamSettings'));
  assert.deepEqual(JSON.parse(JSON.stringify(parsed)), onDisk());
});

// --- §2 The version is refused by name, never coerced ------------------------------------------------

test('the version this build reads is a bare integer', () => {
  // 1 until P6-4 (2026-09-19), which added `scenarios` and `activeScenarioId` and turned `entries`
  // into a shared pool. A v1 file is upgraded by `app/loadPlan.ts` before it ever reaches here.
  assert.equal(PLAN_FILE_VERSION, 2);
  assert.equal(typeof PLAN_FILE_VERSION, 'number');
});

test('any version but the known one is refused by name', () => {
  // `1` is in this list and it is the point of the list: `parsePlan` does NOT migrate. A v1 file
  // arriving here — because something skipped the loader — is refused by name like any other
  // shape this build does not read, and is never interpreted as a v2 file with two keys missing.
  for (const version of [0, 1, 3, 1.5, '2', null, undefined, '2.0.0', true]) {
    assert.throws(
      () => parsePlan(mutated((file) => { file.version = version; })),
      PlanFileVersionError,
      `version ${JSON.stringify(version)} was not refused`,
    );
  }
  // Absent entirely, not merely wrong.
  assert.throws(() => parsePlan(mutated((file) => { delete file.version; })), PlanFileVersionError);
});

// --- §3 The six unconstructible entry types --------------------------------------------------------

test('the unspecified set is exactly the four, and it is derived rather than copied', () => {
  // A literal SET pin, deliberately: a derived list that derived itself wrongly would still agree
  // with a derived expectation. These are the names, written out.
  //
  // **SIX → FIVE on 2026-09-24 (P14-13, slice 3a): `CARE_EVENT` is renamed `ENTER_CARE` and
  // specified** (`plan.ts`'s `EnterCareParams`), so it leaves this list the same way
  // `ILLNESS_SEPARATION` and `DEATH` did the same day.
  // **FIVE → FOUR the same day (P9-1, slice 1): `HEAS_DRAW` is specified** (`plan.ts`'s
  // `HeasDrawParams`), so it leaves this list too — engine-only, `ENTRY_TYPES_NOT_YET_WALKED`
  // holds it back from the form, not from `parsePlan`.
  // **THREE → FOUR on 2026-10-02 (GIFT slice 1): `GIFT` is named, typed and walked by the engine,
  // and has no params parser until slice 2** — so the door refuses a file holding one.
  // **FOUR → THREE the same day (GIFT slice 2): `GIFT` gains its parser and leaves the list.**
  assert.deepEqual([...UNSPECIFIED_ENTRY_TYPES].sort(), [
    'CONTRIBUTION_SPLIT',
    'DOWNSIZE',
    'VACATE_HOME',
  ]);
  assert.equal(UNSPECIFIED_ENTRY_TYPES.length, 3);
  assert.equal(ENTRY_TYPES.length, 28);
  // 19 named, 11 refused, 8 honoured. A type that gains params must leave this list in the same
  // change — `LUMP_SUM_FROM_SUPER` left it on 2026-09-19 and the three figures moved together,
  // 19/14/5 → 19/13/6, `SUPER_CONTRIBUTION` left it the same day, 19/13/6 → 19/12/7, and
  // `MORTGAGE_REFINANCE` left it on 2026-09-21 (P3-16 slice 2), 19/12/7 → 19/11/8. Each is written
  // out rather than derived from the others, so a type that gained a parser without leaving the
  // list would fail the length as well as the set. **20/11/9 from 2026-09-22**: `TRIS_EARLY_
  // CONVERSION` is the FIRST type ever added to `ENTRY_TYPES` itself rather than one that already
  // sat in it unspecified, so the first figure moved too — the table went from 19 rows to 20.
  // **20/10/10 from 2026-09-22 (P3-16a): `MORTGAGE_TARGET` leaves the list the same way the three
  // above did** — `MortgageTargetParams` is specified (`plan.ts`), so it moves to the honoured side.
  // **20/9/11 from 2026-09-22 (P2-11 microtask 2): `RETURN_CHANGE` leaves the list on the same
  // ground.** `ReturnChangeParams` is specified and `parsePlan` reads it — the type is
  // CONSTRUCTIBLE from this commit, even though `projection.ts` has no branch for it yet
  // (`app/planEdits.ts`'s `ENTRY_TYPES_NOT_YET_WALKED`, until microtask 3/4 land).
  // **20/8/12 from 2026-09-22 (P3-19 microtask 4): `SPOUSE_CONTRIBUTION` leaves the list the same
  // way.** `SpouseContributionParams` is specified and `parsePlan` reads it, checked against the
  // Household by `checkSpouseContributionTargets`.
  // **21/8/13 from 2026-09-23: `MORTGAGE_PAYOFF` is the second type ever ADDED to the table** (after
  // `TRIS_EARLY_CONVERSION`), specified on arrival, so the first and third figures move together and
  // the unspecified eight do not. **22/8/14 from 2026-09-23: `TTR_RATE_CHANGE` is the third**, on
  // the same terms.
  // **22/7/15 from 2026-09-24 (P12-4): `ILLNESS_SEPARATION` leaves the list** — it sat in the table
  // unspecified from the scaffold, so only the second and third figures move.
  // **22/6/16 from 2026-09-24 (P12-1): `DEATH` leaves the list the same way.**
  // **22/5/17 from 2026-09-24 (P14-13, slice 3a): `ENTER_CARE` (renamed from `CARE_EVENT`) leaves
  // the list the same way.**
  // **22/4/18 from 2026-09-24 (P9-1, slice 1): `HEAS_DRAW` leaves the list the same way.**
  // **23/4/19 from 2026-09-25 (P14-13): `SELL_HOME` is the FOURTH type ever ADDED to the table**
  // (after `TRIS_EARLY_CONVERSION`, `MORTGAGE_PAYOFF`, `TTR_RATE_CHANGE`), specified on arrival, so
  // the first and third figures move together and the unspecified four do not.
  // **24/4/20 the same day: `RENT_OUT_HOME` is the FIFTH type ever ADDED to the table**, on the
  // same terms.
  // **25/4/21 the same day (P14-19): `BUY_HOME`, the SIXTH, on the same terms.**
  // **25/3/22 the same day (P9-5): `DOWNSIZER_CONTRIBUTION` leaves the list.**
  // **26/3/23 the same day (P3-17a slice 3): `INSURANCE_COVER_CHANGE`, the SEVENTH added, specified on arrival.**
  // **27/3/24 on 2026-09-29 (retire flow S4): `TTR_START`, the EIGHTH added, specified on arrival.**
  // **28/3/25 on 2026-10-02 (GIFT slice 2): `GIFT`, the NINTH added, specified a slice after arrival.**
  assert.equal(ENTRY_TYPES.length - UNSPECIFIED_ENTRY_TYPES.length, 25);
  // And the seven that moved are now on the other side of the line: they are REFUSED nowhere.
  assert.ok(!UNSPECIFIED_ENTRY_TYPES.includes('LUMP_SUM_FROM_SUPER'));
  assert.ok(!UNSPECIFIED_ENTRY_TYPES.includes('SUPER_CONTRIBUTION'));
  assert.ok(!UNSPECIFIED_ENTRY_TYPES.includes('MORTGAGE_REFINANCE'));
  assert.ok(!UNSPECIFIED_ENTRY_TYPES.includes('MORTGAGE_TARGET'));
  assert.ok(!UNSPECIFIED_ENTRY_TYPES.includes('RETURN_CHANGE'));
  assert.ok(!UNSPECIFIED_ENTRY_TYPES.includes('SPOUSE_CONTRIBUTION'));
  assert.ok(!UNSPECIFIED_ENTRY_TYPES.includes('ILLNESS_SEPARATION'));
  assert.ok(!UNSPECIFIED_ENTRY_TYPES.includes('DEATH'));
  assert.ok(!UNSPECIFIED_ENTRY_TYPES.includes('ENTER_CARE'));
  assert.ok(!UNSPECIFIED_ENTRY_TYPES.includes('HEAS_DRAW'));
});

test('every one of the four refuses the WHOLE FILE, by name, one at a time', () => {
  for (const type of UNSPECIFIED_ENTRY_TYPES) {
    const file = mutated((plan) => {
      plan.entries.push({
        id: `smuggled-${type}`,
        date: '2030-01-01',
        owner: 'household',
        type,
        params: {},
        enabled: true,
        createdAt: '2026-08-20',
      });
    });
    assert.throws(() => parsePlan(file), UnspecifiedEntryTypeError, `${type} was accepted`);
    assert.match(thrown(() => parsePlan(file)).message, new RegExp(type));
  }
});

test('a disabled entry of an unhonourable type is refused too — `enabled: false` is not absence', () => {
  // ADR-0002: a disabled entry is still in the Scenario and still inherited. Reading the file must
  // not depend on the flag, or a `false` today becomes a silently dropped entry when it is flipped.
  const file = mutated((plan) => {
    plan.entries.push({
      id: 'off-for-now', date: '2030-01-01', owner: 'household', type: 'DOWNSIZE',
      params: {}, enabled: false, createdAt: '2026-08-20',
    });
  });
  assert.throws(() => parsePlan(file), UnspecifiedEntryTypeError);
});

test('nothing is ever dropped: a refused file yields no partial plan', () => {
  const file = mutated((plan) => {
    plan.entries.push({
      id: 'downsize', date: '2030-01-01', owner: 'household', type: 'DOWNSIZE',
      params: {}, enabled: true, createdAt: '2026-08-20',
    });
  });
  assert.throws(() => parsePlan(file), UnspecifiedEntryTypeError);
  // The only alternative reading — parse what you can — would have returned the other entries.
  let parsed = null;
  try { parsed = parsePlan(file); } catch { /* expected */ }
  assert.equal(parsed, null);
});

test('a type that is in no union at all is refused as a malformed entry', () => {
  assert.throws(
    () => parsePlan(mutated((plan) => { plan.entries[0].type = 'SPEND_CHNAGE'; })),
    PlanFileEntryError,
  );
});

// --- §3a SUPER_CONTRIBUTION: what it moves, and what it still does not ------------------------
//
// ⚠️ **THIS SECTION WENT RED ON PURPOSE AND WAS RE-DERIVED (P6-8 brief 2, chunk 1, 2026-09-19).**
// It used to assert *"a plan holding a SUPER_CONTRIBUTION projects, and not one FIGURE moves"* —
// brief 1 wired the door and deliberately left `projection.ts` without a branch, and that test was
// the tripwire saying so, with its own comment demanding it fail and be re-derived rather than
// relaxed. It has failed. What replaces it is not a looser identity: every figure below is worked
// from the FY2027-28 rate scale by hand, and the things chunk 1 did NOT do are pinned just as hard
// as the things it did.
//
// ⚠️ **AND IT WENT RED A SECOND TIME, FOR THE CONCESSIONAL CAP (P6-8 brief 3, final chunk,
// 2026-09-20), AND IS RE-DERIVED AGAIN.** The cap is measured against the sacrifice AND the
// employer Superannuation Guarantee from that date. Dana's Guarantee is 12% of $80,600 = **$9,672**,
// the arrangement starts in FY2027-28, and no AWOTE index number reaches that year — so what
// decides is s 960-285(4)'s floor: a TOTAL within $25,000 is within every year's cap and needs no
// index number, which leaves **$25,000 − $9,672 = $15,328** of room. The $20,000 this section used
// is $29,672 of contributions and the walk now raises `MissingIndexNumberError` by name rather than
// guessing FY2027-28's cap. The arrangement is **$15,000** and every figure below is re-worked at
// it; the mechanism, and everything this section is FOR, is untouched.
//
// **The mechanism, once, because every number below is a consequence of it.** Dana is paid
// $3,100 a fortnight — `annualSalaryFromFortnightly` makes that $80,600 a year — and sacrifices
// $15,000 a year from 2027-07. The sacrifice is made before the income is derived, so it is never
// salary or wages and never enters assessable income: the salary ASSESSED falls to $65,600 while
// the salary PAID does not move at all.
//
// Across that $15,000, in FY2027-28 and on Dana's income:
//
//   * the second marginal bracket at **30%** runs from $45,000 to $135,000 and covers the whole
//     span, so the basic liability falls by **$4,500.00**;
//   * the Medicare levy is the full **2%** at both incomes (the family income is far above the
//     shade-in at $79,600 and still above it at $64,600), so it falls by **$300.00**;
//   * LITO's second-stage taper withdraws **1.5c** in the dollar and runs out at $66,667. At the
//     gross figure Dana's LITO is nil; at the reduced one she is $2,067 inside the taper and gets
//     $325.00 − $19,600 × 1.5c = **$31.00** back;
//   * WATO is at its **$250** maximum at both incomes, so it contributes nothing to the difference.
//
// $4,500.00 + $300.00 + $31.00 = **$4,831.00 a year**, and `monthlyFromAnnual` makes that
// **$402.58 a month**. Every moved figure in this section is that one number or a consequence of it.

/** A salary sacrifice Dana can actually make: she holds exactly one interest, index 0. */
const SACRIFICE = Object.freeze({
  id: 'sacrifice',
  date: '2027-07-01',
  owner: 'personA',
  type: 'SUPER_CONTRIBUTION',
  params: { kind: 'salarySacrificed', annualAmount: 1_500_000, interestIndex: 0 },
  enabled: true,
  createdAt: '2026-09-19',
});

const withSacrifice = (params = SACRIFICE.params, over = {}) =>
  mutated((file) => { file.entries.push({ ...SACRIFICE, ...over, params }); });

/** The two walks this section is about: the demo plan, and the demo plan plus the sacrifice. */
const bothWalks = (edit = (file) => file) => {
  // Interest on cash (2026-09-23) is stated nil in BOTH walks: the sacrifice leaves less cash to earn
  // it, and this section is about the tax the sacrifice moves, not about interest. Stated through
  // the door, so the nil is the one a plan file can carry.
  //
  // Pay rising with wages (2026-09-23) is stated nil here too, `awote: 0`, and for the same reason:
  // every figure below is hand-worked on Dana's flat $80,600, and the sacrifice's effect on the tax is
  // the subject, not the wage level. A proved control: every figure this section asserts is the same
  // at nil on the build before pay rose.
  const nil = (file) => edit({ ...file, settings: { ...file.settings, cashInterestRate: 0, economicSeries: { ...file.settings.economicSeries, awote: 0 } } });
  const without = parsePlan(nil(onDisk()));
  const with_ = parsePlan(nil(withSacrifice()));
  assert.equal(with_.entries.length, without.entries.length + 1);
  assert.equal(with_.entries.at(-1).type, 'SUPER_CONTRIBUTION');
  assert.equal(with_.entries.at(-1).enabled, true);
  return {
    before: project(without.settings, without.household, without.entries),
    after: project(with_.settings, with_.household, with_.entries),
  };
};

const lineIn = (month, description) => month.lines.find((line) => line.description === description);
const at = (months, month) => months.find((each) => each.month === month);

/** The one figure everything here is derived from: $4,831.00 a year, a twelfth at a time. */
const MONTHLY_TAX_SAVING = 40_258;

/** What the cap now leaves room for, and why the arrangement above is $15,000 and not $20,000. */
const ROOM_UNDER_THE_FLOOR = 25_000_00 - 9_672_00;

test('a SUPER_CONTRIBUTION parses, whole and unchanged', () => {
  const parsed = parsePlan(withSacrifice());
  const added = parsed.entries.at(-1);
  assert.deepEqual(added, SACRIFICE);
  // The params survive the door as three fields and not as two with a default — the round trip
  // invents no key and drops none.
  assert.deepEqual(Object.keys(added.params).sort(), ['annualAmount', 'interestIndex', 'kind']);
});

test('the sacrifice reduces the salary ASSESSED and reaches nothing before its own month', () => {
  const { before, after } = bothWalks();
  assert.ok(before.length > 400, `the demo walk is ${before.length} months — too short to prove anything`);
  assert.equal(after.length, before.length);

  // **The date is a boundary and not a hint.** Every month up to and including 2027-06 is
  // bit-for-bit identical, `appliedEntryIds` and all — the level is in force from its own month and
  // not a day before it, and nothing about the entry's mere presence in the plan touches the walk.
  const june = before.findIndex((month) => month.month === '2027-06');
  assert.ok(june > 0, 'the walk does not reach the month before the sacrifice starts');
  for (let index = 0; index <= june; index += 1) {
    assert.deepEqual(after[index], before[index], `${before[index].month} moved, and it is before the sacrifice`);
  }
  // The control: the very next month is NOT identical, so the loop above is a boundary and not a
  // walk that stops early.
  assert.notDeepEqual(after[june + 1], before[june + 1]);
  assert.equal(before[june + 1].month, '2027-07');
  assert.ok(after[june + 1].appliedEntryIds.includes('sacrifice'));
});

test('the income tax falls by exactly the bracket, the levy and the LITO the sacrifice moves', () => {
  const { before, after } = bothWalks();
  const july = '2027-07';
  // $80,600 assessed, $79,600 taxable: 26,800 × 14% ($3,752.00) + 34,600 × 30% ($10,380.00) =
  // $14,132.00, less LITO nil, less WATO $250.00, plus 2% of $79,600 = $1,592.00 → $15,474.00 … and
  // the walk's own monthly figure is a twelfth of the year's assessment on the same salary, which
  // is what the two literals below are.
  assert.equal(3_752_00 + 10_380_00 - 250_00 + 1_592_00, 15_474_00);
  assert.equal(Math.round(15_474_00 / 12), 128_950);
  // $65,600 assessed, $64,600 taxable: $3,752.00 + 19,600 × 30% ($5,880.00) = $9,632.00, less LITO
  // $31.00, less WATO $250.00, plus 2% of $64,600 = $1,292.00 → $10,643.00.
  assert.equal(3_752_00 + 5_880_00 - 31_00 - 250_00 + 1_292_00, 10_643_00);
  assert.equal(Math.round(10_643_00 / 12), 88_692);
  assert.equal(lineIn(at(before, july), 'Income tax, Dana').amount, 128_950);
  assert.equal(lineIn(at(after, july), 'Income tax, Dana').amount, 88_692);
  // The DIFFERENCE is the hand-worked one, and it is asserted as a difference so that a future
  // change to the rate scale moves both literals together and still has to move this by the amount
  // the mechanism says.
  assert.equal(128_950 - 88_692, MONTHLY_TAX_SAVING);
  assert.equal(Math.round(4_831_00 / 12), MONTHLY_TAX_SAVING, 'the annual figure and the monthly one disagree');

  // It is a LEVEL, so it holds without being restated — a year later, and four years later, the
  // same twelfth. (A `SUPER_CONTRIBUTION` that applied only in its own month would pass every
  // assertion above.)
  for (const month of ['2027-08', '2028-07', '2031-04']) {
    assert.equal(lineIn(at(before, month), 'Income tax, Dana').amount, 128_950, month);
    assert.equal(lineIn(at(after, month), 'Income tax, Dana').amount, 88_692, month);
  }
});

test('the CASH the salary line reports is the pay ACTUALLY RECEIVED — chunk 3', () => {
  const { before, after } = bothWalks();
  // ⚠️ **THIS TEST WENT RED ON PURPOSE (P6-8 brief 2, chunk 3, 2026-09-20) AND IS RE-DERIVED.** It
  // used to be titled *"the CASH the salary line reports does NOT move — chunk 1 leaves the pay
  // packet alone"* and pinned $6,716.67 on BOTH walks as a residual it was not proud of, saying in
  // its own comment that the day chunk 3 landed it should go red. It landed and it did.
  //
  // The figure, from the mechanism and not from the output: the sacrifice is made before the income
  // is derived, so the $15,000 is never paid to Dana. $80,600 − $15,000 = $65,600 received, and
  // `monthlyFromAnnual` makes that **$5,466.67**. The month falls by $1,250.00 of pay, against which
  // the $402.58 tax saving is small: the NET of the two is $847.42 of cash a month LESS, which is
  // the next test's subject.
  assert.equal(Math.round((80_600_00 - 15_000_00) / 12), 546_667);
  for (const month of ['2027-07', '2028-07']) {
    assert.equal(lineIn(at(before, month), 'Salary, Dana').amount, 671_667, month);
    assert.equal(lineIn(at(after, month), 'Salary, Dana').amount, 546_667, month);
    // And the cash RECEIVED plus a twelfth of the arrangement is the whole pay the employer is
    // contracted for: nothing is lost or invented between the salary ASSESSED and the salary
    // RECEIVED, which is `assessable + sacrificed === gross` read in cash.
    assert.equal(546_667 + monthlyFromAnnual(15_000_00), lineIn(at(before, month), 'Salary, Dana').amount, `${month}: cash and sacrifice do not sum to the gross`);
  }
  // ⚠️ **That sum is exact HERE and is not exact in general, which is why the walk subtracts on the
  // ANNUAL figure and rounds once.** $80,600 ÷ 12 rounds UP to $6,716.67 and $65,600 ÷ 12 rounds up
  // to $5,466.67 by the same third of a cent, so the two roundings cancel. They need not: a $20,000
  // salary with $19,000 sacrificed gives twelfths of $1,666.67 and $1,583.33, whose difference is
  // $83.34 while a twelfth of the $1,000 actually received is $83.33. The walk reports the latter —
  // it takes the sacrifice off the year and divides the remainder — so the cent lands in the
  // reported split and never in the money. Two orders below the settlement's one-dollar de-minimis.
  assert.equal(monthlyFromAnnual(20_000_00) - monthlyFromAnnual(19_000_00), monthlyFromAnnual(1_000_00) + 1, 'the two spellings no longer differ by the cent this comment is about');

  // ⚠️ ~~And nothing is paid INTO superannuation (chunk 4): the set of line descriptions in the
  // month the sacrifice starts is the same set… **From chunk 3 that absence is what makes the
  // forecast CONSERVATIVE**.~~ **SUPERSEDED BY CHUNK 4 (2026-09-20), AND THIS IS THE TRIPWIRE THAT
  // SAID SO — it went red on the set equality, which is what it was written to do.** The money now
  // arrives. Re-derived rather than relaxed: the set gains **exactly one** description, it is
  // named, and the count is asserted so a second unexpected line could not hide inside a
  // `deepEqual` that had been loosened to a subset test.
  const descriptions = (months) => at(months, '2027-07').lines.map((line) => line.description).sort();
  const CREDIT = 'Salary sacrifice into superannuation, Dana — Superannuation, Accumulation Phase';
  assert.deepEqual(descriptions(after).filter((each) => !descriptions(before).includes(each)), [CREDIT]);
  assert.deepEqual(descriptions(before).filter((each) => !descriptions(after).includes(each)), [], 'a line DISAPPEARED — chunk 4 was meant to add one, not replace one');
  assert.equal(descriptions(after).length, descriptions(before).length + 1);
  // **$15,000 a year is $1,250.00 a month, and the fund pays 15% of it (Income Tax Rates Act 1986
  // s 26(1)(a), §3.1), so $1,062.50 lands.** Worked from the arrangement, not read off the line.
  assert.equal(Math.round(15_000_00 / 12) - Math.round(Math.round(15_000_00 / 12) * 0.15), 106_250);
  assert.equal(lineIn(at(after, '2027-07'), CREDIT).amount, 106_250);
  assert.equal(lineIn(at(after, '2027-07'), CREDIT).effect, 'wealth', 'the contribution is CASH — the Waterfall can spend money the Household never held');

  // **AND THE CASH OF THIS PLAN IS UNCHANGED BY CHUNK 4, IN EVERY MONTH OF THE WALK.** The credit
  // is non-cash and Dana is 59 — under Age Pension age — so her Accumulation Phase interest is
  // exempt from both means tests (§4.8) and no Age Pension is payable to this Household anyway.
  // There is therefore no route from the contribution back to the Waterfall, and the limb figures
  // the next test pins are chunk 3's figures untouched. Asserted here as a closing-balance identity
  // over the whole walk so that a future route back would have to announce itself.
  const monthly = Math.round(15_000_00 / 12);
  for (const index of after.keys()) {
    if (after[index].month < '2027-07') continue;
    assert.equal(
      after[index].protectedAssets - before[index].protectedAssets,
      after[index].assetsByPerson[0].protectedAssets - before[index].assetsByPerson[0].protectedAssets,
      `${after[index].month}: the credit reached somebody other than Dana`,
    );
  }
  // The first month that OPENS with a credit in it, where the gap is the net amount to the cent and
  // not yet a compounded figure.
  const august = after.findIndex((month) => month.month === '2027-08');
  assert.equal(after[august].assetsByPerson[0].protectedAssets - before[august].assetsByPerson[0].protectedAssets, monthly - Math.round(monthly * 0.15));
  // **Ash receives NOTHING, and the claim is about the PROTECTED pool specifically.** His
  // assessable figure does differ between the two walks — by chunk 3's doing, not chunk 4's: the
  // pay packet is smaller, so limb 2 draws $1,124.50 a month more from his Account-Based Pension,
  // which the next test pins. What a contribution to the wrong Person would look like is a
  // protected balance appearing against a Person who holds none.
  assert.equal(after[august].assetsByPerson[1].protectedAssets, 0, 'the credit landed with Ash');
  assert.equal(before[august].assetsByPerson[1].protectedAssets, 0, 'the control: Ash holds no protected assets in either walk, so the equality above is discriminating');
});

/** The pay that never reaches the packet, a month at a time: $15,000 ÷ 12. */
const MONTHLY_SACRIFICE = 125_000;

test('the pay packet falls by more than the tax saving, and the pension limb draws the NET', () => {
  const { before, after } = bothWalks();
  const july = '2027-07';
  // ⚠️ **THIS TEST WENT RED ON PURPOSE (P6-8 brief 2, chunk 3, 2026-09-20) AND IS RE-DERIVED.** It
  // was titled *"the tax saving is spent, and the Waterfall draws exactly that much less from the
  // pension"* and pinned the salary limb at $5,969.34 — $542.17 MORE than the walk without the
  // sacrifice — because chunk 1 kept the whole pay packet while cutting the tax. Chunk 3 takes the
  // pay packet down by $1,666.67, and the direction of the whole test turns over with it.
  //
  // The salary limb is `received` — salary plus the Age Pension where assessed, less the tax on the
  // same month's income. Two of those moved and they move OPPOSITE WAYS:
  //   cash    −$1,250.00   (a twelfth of the arrangement, and it is the larger)
  //   tax     +  $402.58   (the saving, which is spendable)
  //   → the limb offers **$847.42 LESS**, being $1,250.00 − $402.58, and that is the whole of it.
  const NET_FALL = MONTHLY_SACRIFICE - MONTHLY_TAX_SAVING;
  assert.equal(NET_FALL, 84_742);
  const limb = (months, name) => at(months, july).notes.find((note) => note.limb === name);
  // ⚠️ **AND BOTH FIGURES ROSE BY $61.71 ON 2026-09-21 (P4-1e), WHICH IS THE THIRD TERM ARRIVING
  // AND NOT THE SECOND MOVING.** They were $5,427.17 and $4,579.75. July 2027 is past 19 March
  // 2027, so until the standing table was wired this Household was paid NO Age Pension in it and
  // the limb was salary less tax alone; it is now paid $61.71 — a means-tested residue, this couple
  // being close to the assets cut-off — and the pension is assessed on GROSS salary (R14), so the
  // sacrifice cannot move it. The same amount lands in both walks and the difference between them
  // is untouched, which is what the third assertion says.
  //
  // ⚠️ **AND BOTH ROSE BY A FURTHER 56 CENTS ON 2026-09-21 (register O85), WHICH IS MEANS-TEST
  // FEEDBACK AND NOT A SACRIFICE EFFECT.** They were $5,488.88 and $4,641.46. The stated spending
  // level is REAL now, so by July 2027 this Household has spent $652.46 more than it used to — the
  // ten monthly twelfths of $84,000 raised by 1.025 ^ (n/12), summed — and, with the growth it did
  // not earn on that money, holds $728.35 less. A smaller assessable pool is a larger means-tested
  // pension: $61.71 a month becomes $62.27. **It lands in BOTH walks identically**, because the
  // pension is assessed on the same assets and on GROSS salary (R14), so the difference this test is
  // about is untouched to the cent — which is what the third and fourth assertions say.
  // ⚠️ **AND BOTH FELL BY $1.21 ON 2026-09-21 (P10-5), WHICH IS AGAIN MEANS-TEST FEEDBACK AND AGAIN
  // NOT A SACRIFICE EFFECT.** They were $5,489.44 and $4,642.02. The Account-Based Pension in this
  // Household pays its opening part financial year now, where it used to pay nothing until the
  // following 1 July, so by July 2027 the money sits in the Offset rather than in the fund — and the
  // means test assesses both, but the fund had been compounding and the Offset has not. **The
  // assessable pool is very slightly LARGER, because less of the household's own spending came out
  // of it**, and a larger pool is a smaller means-tested pension. **It lands in BOTH walks
  // identically** — it is a fact about the household's assets, not about the sacrifice — so the
  // difference this test is about is untouched to the cent, which is what the third and fourth
  // assertions say and why they are the load-bearing ones.
  // ⚠️ **AND BOTH ROSE BY $31.28 ON 2026-09-23, AGAIN IN BOTH WALKS AND AGAIN NOT A SACRIFICE
  // EFFECT.** They were $5,488.23 and $4,640.81. A plan with no series now INDEXES the Age Pension
  // on its own growth rates instead of carrying the 2026 sets, and Ash's income-tested residue moves
  // on three terms, each halved (Ash alone is eligible) and × 26 ÷ 12:
  //   the 20 March 2027 maximum   basic +$21.27 (× √1.025), Supplement +$1.65 (× √1.025) → +$24.83
  //   the 1 July 2027 free area   $396.00 × 1.025 = $405.90, +$9.90 tapered at 50c        → + $5.36
  //   the deeming threshold       $110,600 × 1.025 = $113,365, so $2,765 moves from 3.75%
  //                               to 1.75%: $55.30 a year less deemed, tapered at 50c     → + $1.15
  // $31.34, less six cents of feedback from April-to-June's larger payments sitting in the Offset.
  // The same in both walks — gross salary is assessed (R14) — so `NET_FALL` is untouched.
  assert.equal(limb(before, 'salary').available, 551_951);
  assert.equal(limb(after, 'salary').available, 467_209);
  assert.equal(551_951 - 467_209, NET_FALL);
  assert.equal(551_951 - 548_823, 3_128, 'the indexed pension, and the whole of what 2026-09-23 moved here');
  assert.equal(551_951 - 542_717, 467_209 - 457_975, 'the pension is the same in both walks, so it cancels');
  assert.equal(548_944 - 548_888, 56, 'the pension term, and the whole of what O85 moved here');
  assert.equal(548_944 - 548_823, 121, 'the pension term again, and the whole of what P10-5 moved here');
  // The spending target did not move, so the next limb down draws exactly that much MORE. This is
  // the "a tax saving turns into a bigger balance" chain of chunk 1, now running backwards: the
  // sacrifice is the bigger of the two movements, so an Account-Based Pension in the Household pays
  // for it, and it is the SAME limb and the SAME arithmetic that used to be relieved by it.
  // (Both fell by the same $61.71 on 2026-09-21, for the same reason: the spending target did not
  // move, so a pension arriving in limb 1 is a pension limb 2 does not have to draw. $1,572.83 and
  // $2,420.25 were the figures before the standing table was wired.)
  // ⚠️ **RE-DERIVED FOR REGISTER O85 (2026-09-21), AND THE MOVE IS THE SUM OF TWO KNOWN TERMS.**
  // They were $1,511.12 and $2,358.54. July 2027 is ten months past `asAtDate`, so the month's
  // target is $84,000 × 1.025 ^ (10/12) ÷ 12 = $7,145.54 rather than $7,000.00 — $145.54 more for
  // limb 2 to find — and the pension arriving in limb 1 is 56 cents larger, which is 56 cents limb 2
  // does not have to draw. $1,511.12 + $145.54 − $0.56 = $1,656.10, and the same two terms move the
  // sacrifice walk's figure by the same amount, so their difference is still exactly `NET_FALL`.
  assert.equal(lineIn(at(before, july), 'Household spending').amount, 714_554);
  assert.equal(Math.ceil(Math.round(8_400_000 * 1.025 ** (10 / 12)) / 12), 714_554);
  assert.equal(151_112 + 14_554 - 56, 165_610);
  // ⚠️ **AND P10-5 (2026-09-21) MOVED BOTH BY $1.21, WHICH IS THE MIRROR OF THE LIMB-1 MOVE ABOVE
  // AND NOT A SECOND FACT.** The target did not move, so a pension that arrives $1.21 SMALLER in
  // limb 1 is $1.21 limb 2 has to find. That the two movements are equal and opposite is the whole
  // claim of this pair of tests, and it is asserted here as an identity rather than as two numbers.
  assert.equal(165_610 + 121, 165_731);
  // And the mirror of 2026-09-23's $31.28: a pension that arrives that much larger in limb 1 is that
  // much limb 2 does not have to find.
  assert.equal(lineIn(at(before, july), 'Account-Based Pension payment, Ash').amount, 165_731 - 3_128);
  assert.equal(lineIn(at(after, july), 'Account-Based Pension payment, Ash').amount, 250_473 - 3_128);
  assert.equal(250_473 - 165_731, NET_FALL);
  assert.equal(548_944 - 548_823, 165_731 - 165_610, 'what limb 1 lost, limb 2 found — to the cent');
  assert.equal(157_283 - 151_112, 6_171, 'the pension, arriving in limb 1 and leaving limb 2');
  assert.equal(lineIn(at(before, july), 'Household spending').amount, lineIn(at(after, july), 'Household spending').amount);
  // ⚠️ **NO LIMB BOUNDARY IS CROSSED HERE, and that is asserted rather than assumed.** The extra
  // $847.42 comes out of limb 2, which has half a million dollars of Account-Based Pension to
  // offer, so limbs 3, 4 and 5 draw exactly what they drew before — nothing. The fixture where the
  // same change DOES push the Waterfall past a limb is `core-projection-tax.test.mjs`'s gain walk,
  // which starts selling parcels, and the boundary is worth naming in both places.
  for (const name of ['nonSuperPortfolio', 'offsetAccount', 'releasedSuperannuation']) {
    assert.equal(limb(after, name).drawn, limb(before, name).drawn, `limb ${name} draws a different amount than it did before the sacrifice`);
    assert.equal(limb(after, name).drawn, 0, `the control: limb ${name} drew something before the sacrifice, so the equality above proves nothing`);
  }
});

test('the year-end true-up settles the ASSESSABLE year, and its move is priced to the cent', () => {
  // ⚠️ **ON THE DEMO PLAN LESS DANA'S PARCEL, SINCE "SPEND CASH FIRST" (2026-09-23).** Cash is now
  // spent before any parcel is sold, and the sacrifice leaves Dana less cash — so in the sacrifice
  // walk the cash runs out in 2031-04 and her parcel is sold in April, May and June 2031, INSIDE
  // FY2030-31, while the walk without it sells nothing that year. A capital gain in one walk and not
  // the other is not the sacrifice's effect on the year's tax, which is what this test prices. With
  // the parcel removed from BOTH walks every figure below stands to the cent; what the parcel does
  // to the year is measured at the foot of this test.
  const withoutParcels = (file) => ({
    ...file,
    household: { ...file.household, persons: file.household.persons.map((person) => ({ ...person, parcels: [] })) },
  });
  const { before, after } = bothWalks(withoutParcels);
  // Dana retires on 2031-05-14, so FY2030-31 is the one year of this walk in which her salary
  // MOVES: ten months of pay, 14/31 of May, and a June of none. (Until 2026-09-23 May paid nothing:
  // a RETIRE date is the last day worked, and its month now pays the days up to it.) That is the year the monthly accrual cannot be the
  // year's tax, and it is the true-up this test is ABOUT — the one the sacrifice moves.
  //
  // ⚠️ **A SECOND TRUE-UP ARRIVED ON 2026-09-21 (P10-5), IN BOTH WALKS AND IDENTICALLY, AND IT IS
  // NOT ABOUT THE SACRIFICE.** Ash's Account-Based Pension pays its opening part financial year now,
  // which shifts every sale the walk makes by a month, and **FY2039-40 is now the year Dana's
  // portfolio runs out** — her last sale is $5,559.10 in 2040-06 against a full month before it.
  // A year whose income falls part way through is exactly the case the year-end true-up exists for,
  // and it settles $2,699.00 back. It is the SAME figure in both walks, so the difference this test
  // measures is untouched — which is the assertion that follows.
  //
  // ⚠️ **AND P10-4 (2026-09-21) MOVED THAT SECOND TRUE-UP BY $107.00, TO $2,592.00, BY THE SAME
  // MECHANISM ONE STEP ALONG.** Limb 3 grosses its draw up for the capital gains tax the sale
  // causes, so each month sells a little more and the portfolio is spent a month SOONER: the last
  // sale is $9,140.47 in 2040-05 against $5,559.10 in 2040-06. FY2039-40 is therefore a different
  // year's gain settled against a different year's accrual, and the true-up settles $107.00 less of
  // it. Still the same figure in both walks, and still not about the sacrifice.
  const trueUps = (months) => months.flatMap((month) => month.lines.filter((line) => line.description.startsWith('Income tax year-end true-up')).map((line) => `${month.month} ${line.direction} ${line.description} ${line.amount}`));
  //
  // ⚠️ **AND ON 2026-09-23 THAT SECOND TRUE-UP LEFT THE WALK ALTOGETHER.** A plan with no series now
  // INDEXES the Age Pension on its own growth rates instead of carrying the 2026 sets, so from 2027
  // this couple is paid more every month, limbs 2 and 3 are drawn more slowly, and Dana's first sale
  // moves from 2038-08 to 2039-05 and her last from 2040-05 to 2041-11. FY2039-40 is no longer a
  // year her portfolio runs out in, so its $2,592.00 is not settled; FY2041-42, the year it runs
  // out in now (a last sale of $3,170.25 in 2041-11), settles nothing, because no month of it
  // accrues any income tax and the year assesses none. So both walks carry the one FY2030-31 true-up this test
  // is about, and it is unmoved to the cent — the Age Pension does not reach a year Dana is paid a
  // salary in.
  assert.deepEqual(trueUps(before), ['2031-07 inflow Income tax year-end true-up, Dana, 2030-31 87049']);
  assert.deepEqual(trueUps(after), ['2031-07 inflow Income tax year-end true-up, Dana, 2030-31 133723']);
  assert.equal(trueUps(before).length, trueUps(after).length);
  assert.equal(trueUps(before)[0].split(' ').slice(0, 1)[0], trueUps(after)[0].split(' ').slice(0, 1)[0], 'the year this test measures is in both');

  // **Hand-worked, both sides, because this is the figure the accumulator decides.**
  //
  // ACCRUED, ten full months and May: before 10 × $1,289.50 + $121.50 = $13,016.50; after
  // 10 × $886.92 + $42.47 = $8,911.67. May's accrual is a twelfth of the tax on May's own
  // ANNUALISED pay, which is 14/31 of the year's: $80,600 × 14/31 = $36,400.00, and the sacrifice
  // takes the same share, $15,000 × 14/31 = $6,774.19, leaving $29,625.81 assessable.
  //   before: taxable $35,400 → 17,200 × 14% = $2,408.00 − $700 LITO − $250 WATO, and no levy —
  //           the family income is below the $47,238 family threshold → $1,458.00 ÷ 12 = $121.50;
  //   after:  taxable $28,625.81 → 10,425.81 × 14% = $1,459.61 − $700 − $250 → $509.61 ÷ 12 = $42.47.
  //
  // ASSESSED, on the year's own total of the twelve monthly twelfths — and the accumulator holds the
  // ASSESSABLE salary, so those totals are $70,200.03 ($67,166.70 + May's $3,033.33) and $57,135.52
  // ($54,666.70 + May's $2,468.82):
  //   * bracket: taxable $69,200.03 → 26,800 × 14% + 24,200.03 × 30% = $11,012.01;
  //     taxable $56,135.52 → 26,800 × 14% + 11,135.52 × 30% = $7,092.66;
  //   * LITO: nil above $66,667, against $325 − 1.5% × 11,135.52 = $157.97;
  //   * WATO: the $250.00 maximum at both, so nothing;
  //   * ⚠️ the Medicare levy: **the family shade-in**, and it is the term that makes this delta big.
  //     At $69,200.03 the family income is past the shade-in and the levy is the full 2% =
  //     $1,384.00. At $56,135.52 it is INSIDE it, and the levy is 10c in the dollar over the family
  //     threshold of $47,238.00 — $889.75. This is the concavity `projection.ts`'s chunk 3 doc names.
  // $11,012.01 + $1,384.00 − $250.00 = $12,146.01;
  // $7,092.66 + $889.75 − $157.97 − $250.00 = $7,574.44. The year's tax falls by $4,571.57.
  //
  // The true-up is accrued less assessed, so it GROWS by $4,571.57 − $4,104.83 = $466.74.
  //
  // **The move from 2026-09-23, both walks the same mechanism.** They were $1,727.16 and $2,319.32
  // while May paid nothing. May's pay adds its own accrual and raises the year's assessment:
  // before, $121.50 more accrued against $978.17 more assessed ($12,146.01 − $11,167.84), so the
  // refund falls by $856.67; after, $42.47 against $1,024.56 ($7,574.44 − $6,549.88), so it falls by
  // $982.09.
  assert.equal(1_289_50 * 10 + 121_50, 13_016_50);
  assert.equal(886_92 * 10 + 42_47, 8_911_67);
  assert.equal(Math.round(80_600_00 * 14 / 31), 36_400_00);
  assert.equal(Math.round(15_000_00 * 14 / 31), 6_774_19);
  assert.equal(Math.round(Math.round(1_459_61 - 700_00 - 250_00) / 12), 42_47);
  assert.equal(13_016_50 - 8_911_67, 4_104_83);
  assert.equal(12_146_01 - 7_574_44, 4_571_57);
  assert.equal(133_723 - 87_049, 4_571_57 - 4_104_83);
  // The shade-in limb, worked rather than asserted as a figure: 10c in the dollar above the family
  // threshold, which is where a 2% reading would give $1,122.71 and be $233 out.
  assert.equal(Math.round((56_135_52 - 47_238_00) * 0.10), 889_75);
  // And each side is the subtraction it claims to be, so neither literal can drift alone.
  assert.equal(13_016_50 - 12_146_01, 87_049);
  assert.equal(8_911_67 - 7_574_44, 133_723);
  assert.equal(172_716 - 87_049, 12_146_01 - 11_167_84 - 121_50);
  assert.equal(231_932 - 133_723, 7_574_44 - 6_549_88 - 42_47);

  // **AND WITH THE PARCEL, the sacrifice walk realises a gain in the same year.** Its cash is gone by
  // 2031-04 and it sells $211.19, $4,400.59 and $4,441.12 of Dana's parcel — $9,052.90 of proceeds
  // out of a parcel that cost $38,000 against $96,500 of value in 2026 and is worth about $128,790
  // by April 2031 (5⅓ years at 6.5%), so about 70.5% of each dollar is gain: ~$6,382, halved by
  // s 115-25 to ~$3,191. Dana's marginal rate there is 41.5c — 30% bracket, the 10c Medicare
  // shade-in and 1.5c of LITO taper — up to a taxable income of $59,047.50, where the shade-in meets
  // the 2% levy, and 33.5c above it. Her taxable income without the gain is $56,135.52, so $2,911.98
  // of the gain is taxed at 41.5c and the rest at 33.5c: ~$1,302 more tax for the year, of which
  // $24.94 was charged at the April sale and $217.62 at the May one, and the true-up refunds ~$1,059
  // LESS. Measured: $1,062.78 less.
  //
  // (Until 2026-09-23 May paid no salary and sold $6,055.13; May's pay less its tax, the $554.19 of
  // Age Pension the income test now withholds from it and the $217.62 charged on the gain is
  // $1,654.54, which is exactly how much less May sells.)
  //
  // ⚠️ **AND FROM 2026-09-29 (LR-1 slice 2, the CGT reform from 1 July 2027) THAT YEAR'S GAIN IS
  // SPLIT.** The part of each gain after the value just before 1 July 2027 is indexed (1.097: the
  // June 2031 quarter is fifteen quarters on at 2.5%) and never halved. Replayed by hand on the
  // parcel from the walk's own sales — now $213.51, $4,420.81 and $4,441.12, a little more because
  // each sale funds a little more tax — the year's net capital gain is $3,501.21 where it was
  // $3,201.15. All of the $300.06 is above $59,047.50, at 33.5c: $100.52 more tax for the year. $22.54
  // more of it is charged at the April and May sales ($27.26 and $237.84, where they were $24.94 and
  // $217.62), so the true-up refunds the other $77.98 less: $196.47.
  //
  // ⚠️ **AND FROM LR-1 SLICE 3 (Div 119's minimum tax, 2026-09-29) THE MAY SALE IS CHARGED $105.68
  // MORE AT THE EVENT, AND THE JULY TRUE-UP GIVES $92.06 OF IT BACK.** The charge at a sale stacks
  // the gain on the disposal month's ANNUALISED salary, and May's is 14/31 of a year: a taxable
  // income of about $32,000, all of it in the 14% band. The later part of each dollar sold is 13.373%
  // in April and 13.830% in May (the $101,699.43 stamp, apportioned and indexed by 1.097), so the
  // minimum tax capital gain is $28.55 + $626.00 = $654.55 and the gap is ⌊16% × $654.55⌋ = $104,
  // less the $4 April's $28.55 already put in the standing assessment, plus 14% of the $40.61 more
  // net gain the grossed-up sale realises: $105.69. On the whole year's salary Dana is in the 30%
  // band, where the gap is nil, so the year keeps only 33.5c of that $40.61 ($13.60) and the true-up
  // refunds the rest: $92.08. Measured: $105.68 and $92.06.
  //
  // FY2034-35 now settles in BOTH walks too: the minimum tax Dana's later sales pay that year
  // ($1,730.00 in the walk without the sacrifice, $218.00 with it, whose parcel runs out sooner) comes
  // back in July 2035, because she is paid the Age Pension in that year (s 119-15).
  const demo = bothWalks();
  assert.deepEqual(trueUps(demo.before), [
    '2031-07 inflow Income tax year-end true-up, Dana, 2030-31 87049',
    '2035-07 inflow Income tax year-end true-up, Dana, 2034-35 173000',
  ]);
  assert.deepEqual(trueUps(demo.after), [
    '2031-07 inflow Income tax year-end true-up, Dana, 2030-31 28853',
    '2035-07 inflow Income tax year-end true-up, Dana, 2034-35 21800',
  ]);
  const sales = (months) => months.filter((m) => m.month >= '2030-07' && m.month <= '2031-06').flatMap((m) => m.lines.filter((l) => l.description === 'Non-Super Portfolio sale, Dana').map((l) => l.amount));
  assert.deepEqual(sales(demo.before), []);
  assert.deepEqual(sales(demo.after), [21_351, 442_081 + 10_568, 444_112]);
  assert.deepEqual([21_351, 442_081, 444_112], [21_351, 442_081, 444_112], 'the pre-Div 119 sales, kept beside the new ones');
  const laterShare = (proceeds, value, stamp) => proceeds - Math.floor((stamp * proceeds / value) * 1.097);
  const aprilLater = laterShare(21_351, 21_351 + 12_857_546, 10_169_943);
  const mayLater = laterShare(452_649, 452_649 + 12_472_549, 10_169_943 * (1 - 21_351 / (21_351 + 12_857_546)));
  assert.equal(Math.floor((0.16 * (aprilLater + mayLater)) / 100) * 100 - Math.floor((0.16 * aprilLater) / 100) * 100, 10_000);
  assert.ok(Math.abs(10_000 + 0.14 * 4_061 - 10_568) < 10);
  assert.ok(Math.abs(10_568 - 0.335 * 4_061 - (28_853 - 19_647)) < 10);
  assert.deepEqual([21_119, 440_059, 444_112], [21_119, 440_059, 444_112], 'the pre-LR-1 sales, kept beside the new ones');
  assert.equal(605_513 - 440_059, 246_882 - 4_247 - 55_419 - 21_762);
  const gain = 905_290 * (1 - 38_000 / 128_790) / 2;
  const estimate = Math.round(Math.min(gain, 291_198) * 0.415 + Math.max(0, gain - 291_198) * 0.335) - 2_494 - 21_762;
  assert.ok(Math.abs((133_723 - 27_445) - estimate) < 1_000, `the pre-LR-1 move is not the size the gain predicts: ${133_723 - 27_445} against ~${estimate}`);
  assert.equal(350_121 - 320_115, 30_006);
  assert.equal(Math.round(30_006 * 0.335), 10_052);
  assert.equal((2_726 + 23_784) - (2_494 + 21_762), 2_254);
  assert.equal(27_445 - (10_052 - 2_254), 19_647);
});

test('what the sacrifice does NOT reach: the Age Pension income test, and every month before it', () => {
  const { before, after } = bothWalks();
  // The register holds no provision on Centrelink's treatment of salary sacrifice, ~~and nobody has
  // ruled~~ — **R14 ruled on 2026-09-19 (register §4.3.1), to the same answer** — so
  // `inForceIncomePerFortnight` is left on the GROSS figure: the assessed-higher direction, which
  // claims nothing. The ruling was taken in the absence of a provision rather than against one, so
  // a sourced provision supersedes it (**O76**). The demo walk cannot show it (its Age Pension is outside the
  // published parameter window, and every month says so in `notes`), so the pin lives in
  // `test/core-projection-tax.test.mjs` where the entitlement is actually computed. What IS
  // assertable here is that the window refusal itself did not move.
  const windowNote = (months, month) => at(months, month).notes.find((note) => note.subject === 'parameter window');
  for (const month of ['2027-07', '2031-04']) {
    assert.deepEqual(windowNote(after, month), windowNote(before, month), month);
  }
});

test('the three kinds this build cannot honour are refused BY NAME, each with its own reason', () => {
  const reasons = {
    employer: /Superannuation Guarantee is COMPUTED/,
    employerContributions: /Superannuation Guarantee is COMPUTED/,
    superGuarantee: /Superannuation Guarantee is COMPUTED/,
    personalDeductible: /notice of intent/,
    nonConcessional: /bring-forward|LUMP/,
  };
  for (const [kind, reason] of Object.entries(reasons)) {
    const file = withSacrifice({ kind, annualAmount: 2_000_000, interestIndex: 0 });
    assert.throws(() => parsePlan(file), PlanFileEntryError, `kind "${kind}" was accepted`);
    assert.match(thrown(() => parsePlan(file)).message, reason, `kind "${kind}" is refused without its reason`);
  }
  // And an unknown one is refused too, against the single value this build reads.
  for (const kind of ['SALARYSACRIFICED', 'salary-sacrificed', 'sacrifice', '', null, undefined, 3]) {
    assert.throws(() => parsePlan(withSacrifice({ kind, annualAmount: 2_000_000, interestIndex: 0 })), PlanFileEntryError, `kind ${JSON.stringify(kind)} was accepted`);
  }
});

test('nil and negative are both refused — a contribution of nothing is not how you stop one', () => {
  for (const annualAmount of [0, -1, -2_000_000]) {
    const file = withSacrifice({ kind: 'salarySacrificed', annualAmount, interestIndex: 0 });
    assert.throws(() => parsePlan(file), PlanFileEntryError, `${annualAmount} cents was accepted`);
    assert.match(thrown(() => parsePlan(file)).message, /more than nothing/);
  }
  // The positive control: one cent more than nothing is accepted, so the bound is where it says.
  assert.ok(parsePlan(withSacrifice({ kind: 'salarySacrificed', annualAmount: 1, interestIndex: 0 })));
});

test('the interest is REQUIRED, is a position, and must name an interest the Person holds', () => {
  for (const interestIndex of [undefined, null, '0', 0.5, -1, Number.NaN]) {
    assert.throws(
      () => parsePlan(withSacrifice({ kind: 'salarySacrificed', annualAmount: 2_000_000, interestIndex })),
      PlanFileEntryError,
      `interestIndex ${JSON.stringify(interestIndex)} was accepted`,
    );
  }
  // A well-formed position naming no account: refused at the DOOR, not left for a walk that has no
  // branch to refuse it in. Dana holds one interest, so 1 is one past the end.
  const dangling = withSacrifice({ kind: 'salarySacrificed', annualAmount: 2_000_000, interestIndex: 1 });
  assert.throws(() => parsePlan(dangling), PlanFileEntryError);
  assert.match(thrown(() => parsePlan(dangling)).message, /holds 1 superannuation interest/);
});

test('the target must be in the ACCUMULATION phase, and a retirement-phase stream is refused', () => {
  // **P6-8 brief 2, chunk 5.** A contribution is paid into an accumulation interest; an
  // account-based pension and a transition-to-retirement stream are retirement-phase products
  // closed to contributions, and a fund receiving one would open a NEW accumulation interest
  // rather than add to the stream. This build has no path that opens an interest, so before this
  // check the walk credited the stream — a balance no fund would produce, and over Age Pension age
  // a means-test answer computed off it.
  //
  // It is a DOOR check because the phase is a fact about the Household, exactly as the index is:
  // static for the whole walk, so a month is never the place to discover it.
  for (const phase of ['accountBasedPension', 'ttr']) {
    const file = mutated((file) => {
      file.household.persons[0].superInterests[0].phase = phase;
      // A TTR is refused at the door without a commencement day (2026-09-23), so it is given one —
      // Dana's 60th birthday, her preservation age — or this would test that refusal, not this one.
      if (phase === 'ttr') file.household.persons[0].superInterests[0].statedStreamSettings = { commencementDay: '2028-05-14' };
      file.entries.push(SACRIFICE);
    });
    assert.throws(() => parsePlan(file), PlanFileEntryError, `a ${phase} interest accepted a contribution`);
    assert.match(thrown(() => parsePlan(file)).message, /closed to contributions/);
  }
  // **The vacuity control, and it is the one that matters here**: the same file with the phase
  // changed and NO contribution parses, so the refusal above is the contribution and not the
  // phase surgery. (Dana's interest is in accumulation in the demo plan, which is why the walk of
  // the unmutated file with a sacrifice in it — every other test in this section — is legal.)
  assert.ok(parsePlan(mutated((file) => { file.household.persons[0].superInterests[0].phase = 'accountBasedPension'; })));
  assert.ok(parsePlan(withSacrifice()), 'the control: an ACCUMULATION target is accepted');
});

test('a dangling owner THROWS by name — the P4-12 silent no-op is not inherited', () => {
  // The whole point of doing this at the door: `projection.ts` has no branch for this type, so
  // there is nowhere else it could be caught, and an entry owned by nobody would contribute
  // nothing for forty years with nothing on screen to say so.
  const onePerson = mutated((file) => {
    file.household.persons = [file.household.persons[0]];
    file.entries.push({ ...SACRIFICE, owner: 'personB' });
  });
  assert.throws(() => parsePlan(onePerson), PlanFileEntryError);
  assert.match(thrown(() => parsePlan(onePerson)).message, /this Household has 1 Person/);
  // The vacuity control: the same one-person file WITHOUT the entry parses, so the refusal above is
  // the owner and not the surgery.
  assert.ok(parsePlan(mutated((file) => { file.household.persons = [file.household.persons[0]]; })));

  // `household` is refused on its own ground: every cap and both 15%s are per person.
  const shared = withSacrifice(SACRIFICE.params, { owner: 'household' });
  assert.throws(() => parsePlan(shared), PlanFileEntryError);
  assert.match(thrown(() => parsePlan(shared)).message, /assessed per person/);
});

// --- §3b-tris  TRIS_EARLY_CONVERSION: an early, user-stated TTR-to-retirement-phase day ---------
//
// P3-8's conversion limb, ruled and re-ruled by the user 2026-09-22. Dana's `dateOfBirth` in the
// demo plan is `1968-05-14`, so her 65th birthday is `2033-05-14` — every case below is anchored
// on that day. The demo plan holds no TTR interest at all (Dana's is `accumulation`, Ash's is
// `accountBasedPension`), so the success cases below put Dana's into TTR first.

/**
 * Dana's one interest, put into TTR — the demo plan holds no TTR interest to begin with. Since
 * 2026-09-23 a TTR needs a commencement day at the door, so it commences on her 60th birthday
 * (2028-05-14, her preservation age), before every early-conversion day below.
 */
const withDanaInTris = (edit) =>
  mutated((file) => {
    file.household.persons[0].superInterests[0].phase = 'ttr';
    file.household.persons[0].superInterests[0].statedStreamSettings = { commencementDay: '2028-05-14' };
    edit(file);
  });

/** A day comfortably inside Preservation Age–to–64 for Dana (born 1968-05-14). */
const TRIS_EARLY = Object.freeze({
  id: 'tris-early',
  date: '2030-01-01',
  owner: 'personA',
  type: 'TRIS_EARLY_CONVERSION',
  params: { interestIndex: 0 },
  enabled: true,
  createdAt: '2026-09-22',
});

test('a stated day strictly before the 65th birthday is accepted, whole and unchanged', () => {
  const file = withDanaInTris((file) => { file.entries.push(TRIS_EARLY); });
  const parsed = parsePlan(file);
  assert.deepEqual(parsed.entries.at(-1), TRIS_EARLY);
});

test('one day before the 65th birthday still parses — the vacuity control the boundary tests below need', () => {
  const file = withDanaInTris((file) => { file.entries.push({ ...TRIS_EARLY, date: '2033-05-13' }); });
  assert.ok(parsePlan(file));
});

test('the day ON the 65th birthday itself is refused — it is not EARLY, it is the automatic day', () => {
  // R13's own `>` boundary treats the stated day EQUAL to the automatic day as agreement, not a
  // contradiction. This entry asks a different question — is this genuinely EARLY — and the answer
  // on the birthday itself is no, so the boundary here is one comparison stricter: `>=`.
  const file = withDanaInTris((file) => { file.entries.push({ ...TRIS_EARLY, date: '2033-05-14' }); });
  assert.throws(() => parsePlan(file), PlanFileEntryError);
  assert.match(thrown(() => parsePlan(file)).message, /2033-05-14/);
});

test('a day AFTER the 65th birthday is refused too, same ground as the day itself', () => {
  const file = withDanaInTris((file) => { file.entries.push({ ...TRIS_EARLY, date: '2034-01-01' }); });
  assert.throws(() => parsePlan(file), PlanFileEntryError);
  assert.match(thrown(() => parsePlan(file)).message, /65th birthday/);
});

test('interestIndex is REQUIRED, a position, and must name an interest the Person holds', () => {
  for (const interestIndex of [undefined, null, '0', 0.5, -1, Number.NaN]) {
    const file = withDanaInTris((file) => { file.entries.push({ ...TRIS_EARLY, params: { interestIndex } }); });
    assert.throws(() => parsePlan(file), PlanFileEntryError, `interestIndex ${JSON.stringify(interestIndex)} was accepted`);
  }
  // A well-formed position naming no account: refused at the DOOR, not left for a walk that has no
  // branch to refuse it in. Dana holds one interest, so 1 is one past the end.
  const dangling = withDanaInTris((file) => { file.entries.push({ ...TRIS_EARLY, params: { interestIndex: 1 } }); });
  assert.throws(() => parsePlan(dangling), PlanFileEntryError);
  assert.match(thrown(() => parsePlan(dangling)).message, /holds 1 superannuation interest/);
});

test('the target must be a TTR interest — accumulation and account-based pension are both refused', () => {
  for (const phase of ['accumulation', 'accountBasedPension']) {
    const file = mutated((file) => {
      file.household.persons[0].superInterests[0].phase = phase;
      file.entries.push(TRIS_EARLY);
    });
    assert.throws(() => parsePlan(file), PlanFileEntryError, `a ${phase} interest was accepted`);
    assert.match(thrown(() => parsePlan(file)).message, /not transition-to-retirement/);
  }
  // The vacuity control: Dana's interest put into `ttr` and nothing else changed does parse, so
  // the two refusals above are the phase and not some other surgery.
  assert.ok(parsePlan(withDanaInTris((file) => { file.entries.push(TRIS_EARLY); })));
});

test('a household owner is refused — the interest belongs to one Person, on LUMP_SUM_FROM_SUPER’s ground', () => {
  const file = withDanaInTris((file) => { file.entries.push({ ...TRIS_EARLY, owner: 'household' }); });
  assert.throws(() => parsePlan(file), PlanFileEntryError);
  assert.match(thrown(() => parsePlan(file)).message, /belongs to one Person/);
});

test('a dangling owner THROWS by name — the P4-12 silent no-op is not inherited', () => {
  const onePerson = withDanaInTris((file) => {
    file.household.persons = [file.household.persons[0]];
    file.entries.push({ ...TRIS_EARLY, owner: 'personB' });
  });
  assert.throws(() => parsePlan(onePerson), PlanFileEntryError);
  assert.match(thrown(() => parsePlan(onePerson)).message, /this Household has 1 Person/);
  // The vacuity control: the same one-person file WITHOUT the entry parses.
  assert.ok(parsePlan(mutated((file) => { file.household.persons = [file.household.persons[0]]; })));
});

test('the routing this door check does not concern itself with the SOURCE MODULE it defers to', () => {
  // A structural check that this door NEVER imports the O65-facing modules — see the pure routing
  // module beside `trisInterest.ts` for the corresponding tripwire on the routing function itself.
  // Read off the RAW source for the import specifiers (string literals `executableCode` blanks),
  // and off the STRIPPED code for `.grounds`, so neither this test's own comments nor a prose
  // mention can satisfy or defeat it.
  const raw = readFileSync(join(SRC, 'core', 'parsePlan.ts'), 'utf8');
  const specifiers = imports(raw);
  assert.ok(!specifiers.some((s) => s.includes('trisInterest') || s.includes('trisConversionDay')), 'parsePlan.ts imports the O65-facing routing this entry is supposed to sidestep');
  assert.doesNotMatch(executableCode(raw), /trisInterestOrRefuse|trisConversionDayUnderItem106/, 'parsePlan.ts calls the O65-facing routing this entry is supposed to sidestep');
  assert.doesNotMatch(executableCode(raw), /\.grounds\b/, 'parsePlan.ts reads a Condition of Release’s .grounds');
});

// --- §3a-stop  A STOP is the second member of the union, and it must have something to stop -----
//
// **P6-8 brief 4, user ruling 2026-09-21: "make it stoppable to accommodate user financial choices
// and situation".** `kind: 'stopped'` ends the standing arrangement from its own date. Nil was NOT
// used to say it and is still refused — the test below that a nil `annualAmount` is rejected is
// unchanged and is now load-bearing in a second way, because it is what keeps the two spellings of
// "no more sacrifice" from becoming one.
//
// The whole of what only the door can check is the ORDERING, and one rule decides all of it: the
// most recent `SUPER_CONTRIBUTION` for the same Person strictly before a stop must be an
// arrangement.

/** A stop for Dana. No amount and no account — the date is the whole of the fact. */
const STOP = Object.freeze({ ...SACRIFICE, id: 'stop', date: '2029-01-01', params: { kind: 'stopped' } });

// Into the baseline Scenario as well as the pool: a stop is checked against the arrangements in
// ITS OWN Scenario since 2026-09-25, so a pool-only entry would be checked against nothing.
const withEntries = (...added) => mutated((file) => {
  file.entries.push(...added);
  file.scenarios[0].entryIds.push(...added.map((one) => one.id));
});

test('a stop parses as two fields — the discriminant and nothing else', () => {
  const parsed = parsePlan(withEntries(SACRIFICE, STOP));
  assert.deepEqual(parsed.entries.at(-1), STOP);
  assert.deepEqual(Object.keys(parsed.entries.at(-1).params), ['kind']);
  // And the arrangement beside it is untouched: adding a member to the union changed no existing
  // member, which is `NON_SUPER_INVESTMENT`'s precedent and the reason this shape was chosen.
  assert.deepEqual(parsed.entries.at(-2), SACRIFICE);
});

test('a stop states NO amount and NO account, and a figure beside it is refused rather than dropped', () => {
  // A figure this parser ignored would be a figure the user typed and the forecast never used.
  for (const params of [
    { kind: 'stopped', annualAmount: 0 },
    { kind: 'stopped', annualAmount: 1_500_000 },
    { kind: 'stopped', interestIndex: 0 },
  ]) {
    assert.throws(() => parsePlan(withEntries(SACRIFICE, { ...STOP, params })), PlanFileEntryError, `${JSON.stringify(params)} was accepted`);
  }
  assert.match(thrown(() => parsePlan(withEntries(SACRIFICE, { ...STOP, params: { kind: 'stopped', annualAmount: 1 } }))).message, /a stop states no amount/);
  assert.match(thrown(() => parsePlan(withEntries(SACRIFICE, { ...STOP, params: { kind: 'stopped', interestIndex: 0 } }))).message, /a stop names no account/);
});

test('a stop with nothing to stop is REFUSED — before the arrangement, in the same month, or twice', () => {
  // ⚠️ **The three orderings, and they are one rule.** A level states what is in force from its own
  // date and does not reach forward to cancel a later one, so each of these would sit in the plan,
  // be listed, be owned, and change no figure ever — the P4-12 silent no-op.
  const before = withEntries(SACRIFICE, { ...STOP, date: '2027-01-01' });
  assert.throws(() => parsePlan(before), PlanFileEntryError, 'a stop dated before the arrangement was accepted');
  assert.match(thrown(() => parsePlan(before)).message, /no salary sacrifice running on that date/);
  // The same DAY is refused too: the alternative is resolving it by position in the entry list,
  // which is an order the user cannot see and did not choose.
  assert.throws(() => parsePlan(withEntries(SACRIFICE, { ...STOP, date: SACRIFICE.date })), PlanFileEntryError, 'a stop on the arrangement’s own day was accepted');
  // A stop with no arrangement anywhere in the file.
  assert.throws(() => parsePlan(withEntries(STOP)), PlanFileEntryError, 'a stop with no arrangement at all was accepted');
  // A SECOND stop: by the time it takes effect nothing is running.
  const twice = withEntries(SACRIFICE, STOP, { ...STOP, id: 'stop2', date: '2029-06-01' });
  assert.throws(() => parsePlan(twice), PlanFileEntryError, 'a second stop was accepted');
  assert.match(thrown(() => parsePlan(twice)).message, /is itself a stop/);
  // **The vacuity control, and the restart rule in the same assertion**: a stop AFTER an
  // arrangement is accepted, and so is a second stop once an arrangement has been stated again.
  assert.ok(parsePlan(withEntries(SACRIFICE, STOP)));
  assert.ok(parsePlan(withEntries(
    SACRIFICE,
    STOP,
    { ...SACRIFICE, id: 'again', date: '2029-06-01' },
    { ...STOP, id: 'stop2', date: '2029-09-01' },
  )), 'a stop after a restart is refused, and a restart is the only way back');
});

test('the ordering is read off the CALENDAR, not off the order the entries were written down', () => {
  // The same two entries, listed with the stop FIRST. It is still a stop after an arrangement,
  // because what decides is `date` — a file written in any order means the same thing.
  assert.ok(parsePlan(withEntries(STOP, SACRIFICE)));
  // And the control: reversing the DATES makes the same two entries a refusal.
  assert.throws(() => parsePlan(withEntries({ ...STOP, date: '2027-01-01' }, SACRIFICE)), PlanFileEntryError);
});

test('a stop belongs to ONE Person, and the other Person’s arrangement is not one it can stop', () => {
  // Every cap, the fund's 15% and Division 293 are per person, so `household` is refused here for
  // the same reason it is refused on an arrangement — and a stop owned by personB does not reach
  // personA's arrangement, which is what "the same Person" in the rule means.
  assert.throws(() => parsePlan(withEntries(SACRIFICE, { ...STOP, owner: 'household' })), PlanFileEntryError);
  assert.throws(() => parsePlan(withEntries(SACRIFICE, { ...STOP, owner: 'personB' })), PlanFileEntryError, 'a stop reached the other Person’s arrangement');
});

test('an unknown kind is refused against BOTH readable values, so a mistyped stop is findable', () => {
  const typo = withEntries(SACRIFICE, { ...STOP, params: { kind: 'stop' } });
  assert.throws(() => parsePlan(typo), PlanFileEntryError);
  const message = thrown(() => parsePlan(typo)).message;
  assert.match(message, /"salarySacrificed"/);
  assert.match(message, /"stopped"/);
});

// --- §3b The employer contribution destination (P6-8 brief 3, chunk 2a) -----------------------
//
// `SuperInterest.statedEmployerContributionDestination` marks the account a Person's employer pays
// the Superannuation Guarantee into. It exists because *"the one with the larger balance"* is a
// guess wearing the costume of a derivation, and the user ruled on 2026-09-20 that the missing
// fact be added rather than invented.
//
// **The four kinds of absence, and which are legal.** Every one of them is exercised below.
//   1. Stated by nobody, ONE accumulation interest — LEGAL, and it is what Dana is.
//   2. Stated by nobody, NO accumulation interest — LEGAL, and it is what Ash is.
//   3. Stated by nobody, TWO accumulation interests — LEGAL AT THE DOOR, destination undetermined.
//   4. Stated on a retirement-phase interest, or on two interests of one Person — REFUSED BY NAME.
//
// ⚠️ **The over-refusal is the mutation this section is built around.** A door that demanded the
// field wherever it could be stated would reject every plan file on every disk and every fixture in
// this suite, for a question their authors were never put. `legacy` below is exactly that file.

/** The demo file with the field nowhere in it — which is every plan written before 2026-09-20. */
const legacy = () => {
  const file = onDisk();
  for (const person of file.household.persons) {
    for (const interest of person.superInterests) delete interest.statedEmployerContributionDestination;
  }
  return file;
};

test('a plan file with no destination ANYWHERE still loads — absence is legal, and no migration is owed', () => {
  // The vacuity control first: the field really is absent, so what is asserted below is absence and
  // not a value that happens to be acceptable.
  const file = legacy();
  const stated = file.household.persons.flatMap((person) =>
    person.superInterests.map((interest) => interest.statedEmployerContributionDestination));
  assert.deepEqual(stated, [undefined, undefined]);
  assert.ok(stated.length > 0, 'the file holds no super interests at all, so this proves nothing');
  assert.ok(!JSON.stringify(file).includes('statedEmployerContributionDestination'), 'the key survived the delete');

  // It loads, the key is not invented on the way through, and the version is untouched: a v2 file
  // with no destination is a v2 file, not a v1 file needing an upgrade.
  const parsed = parsePlan(file);
  assert.equal(parsed.version, PLAN_FILE_VERSION);
  for (const person of parsed.household.persons) {
    for (const interest of person.superInterests) {
      assert.ok(!Object.hasOwn(interest, 'statedEmployerContributionDestination'), 'the door invented a destination');
    }
  }
  // Dana is case 1 — one accumulation interest, nothing stated — and Ash is case 2, no accumulation
  // interest at all. Neither is refused and neither is defaulted.
  assert.deepEqual(parsed.household.persons.map((person) => person.superInterests.map((interest) => interest.phase)),
    [['accumulation'], ['accountBasedPension']]);
});

test('case 3: TWO accumulation interests and nobody nominated is accepted, and the destination is simply undetermined', () => {
  // Refusing this would be the over-refusal in its most damaging form: a file that was well formed
  // yesterday, rejected today, because a field it could not have known about is absent. What must
  // not happen — a Guarantee credited to a fund this build chose — is held where the crediting is.
  const parsed = parsePlan(mutated((file) => {
    file.household.persons[0].superInterests.push({ phase: 'accumulation', balance: 90_000_00 });
  }));
  assert.equal(parsed.household.persons[0].superInterests.length, 2);
  for (const interest of parsed.household.persons[0].superInterests) {
    assert.equal(interest.statedEmployerContributionDestination, undefined);
  }
});

test('a stated destination on an accumulation interest is READ, carried, and changes no figure', () => {
  const file = mutated((file) => {
    file.household.persons[0].superInterests[0].statedEmployerContributionDestination = 'superannuationGuarantee';
  });
  const parsed = parsePlan(file);
  assert.equal(parsed.household.persons[0].superInterests[0].statedEmployerContributionDestination, 'superannuationGuarantee');
  // Stating it where it is REDUNDANT — Dana holds exactly one accumulation interest — is legal: the
  // nomination and the derivation agree, and a user who names their fund is not punished for it.
  assert.equal(parsed.household.persons[0].superInterests.length, 1);
  // And the walk is byte-identical to the walk of the same plan without it. Chunk 2a credits
  // NOTHING; the day this fails is the day the crediting landed, and it must land with an argument.
  assert.equal(
    digest(project(parsed.settings, parsed.household, parsed.entries)),
    digest(project(DEMO_PLAN.settings, DEMO_PLAN.household, DEMO_PLAN.entries)),
    'nominating the destination moved a figure — chunk 2a credits nothing',
  );
});

test('case 4a: a destination on a RETIREMENT-PHASE interest is refused by name, with the reason', () => {
  // Ash holds an account-based pension. The ground is `checkContributionTargets`'s exactly: a
  // retirement-phase stream is closed to contributions, a real fund would open a NEW accumulation
  // interest, and this build has no path that opens one.
  for (const phase of ['accountBasedPension', 'ttr']) {
    const file = mutated((each) => {
      each.household.persons[1].superInterests[0].phase = phase;
      each.household.persons[1].superInterests[0].statedEmployerContributionDestination = 'superannuationGuarantee';
    });
    assert.throws(() => parsePlan(file), PlanFileHouseholdError, `a destination on a ${phase} interest was accepted`);
    const message = thrown(() => parsePlan(file)).message;
    assert.match(message, /household\.persons\[1\]\.superInterests\[0\]\.statedEmployerContributionDestination/);
    assert.match(message, /closed to contributions/, 'the refusal does not say why');
    assert.match(message, phase === 'ttr' ? /transition-to-retirement/ : /account-based pension/, 'the refusal does not name the phase it found');
    assert.match(message, /Name an accumulation interest/, 'the refusal does not say what to do');
  }
});

test('case 4b: TWO interests of one Person claiming it is refused by name — never resolved by picking one', () => {
  const file = mutated((each) => {
    each.household.persons[0].superInterests[0].statedEmployerContributionDestination = 'superannuationGuarantee';
    each.household.persons[0].superInterests.push({
      phase: 'accumulation', balance: 90_000_00, statedEmployerContributionDestination: 'superannuationGuarantee',
    });
  });
  assert.throws(() => parsePlan(file), PlanFileHouseholdError);
  const message = thrown(() => parsePlan(file)).message;
  assert.match(message, /household\.persons\[0\]\.superInterests /);
  // It names BOTH positions, because a message naming one would read as a verdict on which is wrong.
  assert.match(message, /positions 0, 1/);
  assert.match(message, /one fund their employer pays into, or none/);
  assert.match(message, /Name exactly one/);
});

test('the rule is PER PERSON: one destination each is two destinations in the file, and is accepted', () => {
  const parsed = parsePlan(mutated((file) => {
    file.household.persons[0].superInterests[0].statedEmployerContributionDestination = 'superannuationGuarantee';
    file.household.persons[1].superInterests[0].phase = 'accumulation';
    delete file.household.persons[1].superInterests[0].statedStreamSettings;
    file.household.persons[1].superInterests[0].statedEmployerContributionDestination = 'superannuationGuarantee';
  }));
  assert.deepEqual(
    parsed.household.persons.map((person) => person.superInterests[0].statedEmployerContributionDestination),
    ['superannuationGuarantee', 'superannuationGuarantee'],
  );
});

test('any other value is refused against the one kind of employer money this build knows', () => {
  for (const value of [
    'superGuarantee', 'employerContributions', 'employer', 'SUPERANNUATIONGUARANTEE', '', true, 1, null,
  ]) {
    const file = mutated((each) => {
      each.household.persons[0].superInterests[0].statedEmployerContributionDestination = value;
    });
    assert.throws(() => parsePlan(file), PlanFileHouseholdError, `${JSON.stringify(value)} was accepted as a destination`);
  }
  // `null` is not absence anywhere else in this door and it is not absence here either.
  assert.match(
    thrown(() => parsePlan(mutated((file) => { file.household.persons[0].superInterests[0].statedEmployerContributionDestination = null; }))).message,
    /statedEmployerContributionDestination/,
  );
});

// --- §3c The Division 293 release authority destination (register O84, P6-9 M1) ---------------
//
// `SuperInterest.statedReleaseAuthorityDestination` carries the ITAA 1997 Subdiv 293-B election:
// the Person has told the Commissioner to take their Division 293 liability out of THIS interest
// rather than out of their own cash. O84 is the ONE open gap in the superannuation-contribution
// feature that FLATTERS the Household, and this field is the shape that will close it.
//
// ⚠️ **PRESENCE IS THE ELECTION, AND SILENCE IS NEVER "DERIVE IT" — the one rule that makes this
// field different from §3b's, and the one this section is built around.** For the Guarantee,
// silence plus a single accumulation interest RESOLVES BY DERIVATION: the employer pays somewhere.
// Here the default is not an unnamed account, it is NO RELEASE AT ALL, so a silent Person has not
// omitted an account — they have declined an election. Deriving "the sole accumulation interest"
// from their silence would invent a choice they never made and re-open O84 in the opposite
// direction, moving the charge out of super for a Person who would really have paid it in cash.
//
// **The six kinds of absence, and which four are legal.** Each is exercised below.
//   1. Stated by nobody, anywhere — LEGAL, and it is every plan file written before this date.
//   2. Stated on ONE accumulation interest — LEGAL, and it is the election.
//   3. Stated on a RETIREMENT-PHASE interest — REFUSED BY NAME.
//   4. Stated on TWO interests of one Person — REFUSED BY NAME.
//   5. Stated on one interest each of two DIFFERENT Persons — LEGAL: the rule is per Person.
//   6. Stated by a Person with NO Division 293 liability — LEGAL AND INERT.
//
// ⚠️ **THE HONEST LIMIT OF THIS SECTION, and M2 moved it.** The tests below defend the DOOR and the
// PERSISTENCE and nothing else. When M1 wrote them nothing under `src/` READ the field, so "no
// resolver derives it from silence" could not be defended behaviourally at all and the source sweep
// at the end of this section stood in for it. `core/division293Release.ts`'s
// `division293ReleaseDestination` now exists and that claim is a behavioural one, in
// `test/core-division293-release.test.mjs` §1. The sweep here is narrowed to what it can still say:
// which modules read the field, and that none of them defaults it.

/** The demo file with the release election nowhere in it — every plan written before this date. */
const noElection = () => {
  const file = onDisk();
  for (const person of file.household.persons) {
    for (const interest of person.superInterests) delete interest.statedReleaseAuthorityDestination;
  }
  return file;
};

test('case 1: a plan file with no release election ANYWHERE loads, and the door invents none', () => {
  // The vacuity control first: the key really is absent, so what is asserted is absence and not a
  // value that happens to be acceptable.
  const file = noElection();
  const stated = file.household.persons.flatMap((person) =>
    person.superInterests.map((interest) => interest.statedReleaseAuthorityDestination));
  assert.deepEqual(stated, [undefined, undefined]);
  assert.ok(stated.length > 0, 'the file holds no super interests at all, so this proves nothing');
  assert.ok(!JSON.stringify(file).includes('statedReleaseAuthorityDestination'), 'the key survived the delete');

  // ⚠️ **THE DEFECT THIS FIELD EXISTS TO PREVENT, in the one form M1 can reach.** A door that
  // filled the key in from the Person's sole accumulation interest — Dana holds exactly one — would
  // be making the Subdiv 293-B election on the user's behalf. `Object.hasOwn`, not `=== undefined`:
  // a defaulted `'division293'` and a defaulted `undefined` are both failures and only the former
  // would be caught by a value check.
  const parsed = parsePlan(file);
  assert.equal(parsed.version, PLAN_FILE_VERSION);
  for (const person of parsed.household.persons) {
    for (const interest of person.superInterests) {
      assert.ok(!Object.hasOwn(interest, 'statedReleaseAuthorityDestination'), 'the door made an election nobody made');
    }
  }
  assert.deepEqual(parsed.household.persons.map((person) => person.superInterests.map((interest) => interest.phase)),
    [['accumulation'], ['accountBasedPension']]);
});

test('case 2: a stated election on an accumulation interest is READ, carried, and moves no figure', () => {
  const parsed = parsePlan(mutated((file) => {
    file.household.persons[0].superInterests[0].statedReleaseAuthorityDestination = 'division293';
  }));
  assert.equal(parsed.household.persons[0].superInterests[0].statedReleaseAuthorityDestination, 'division293');
  // ⚠️ M1 DEBITS NOTHING. The day this fails is the day the release path landed, and it must land
  // with an argument — the charge stops coming out of cash and starts coming out of the fund.
  assert.equal(
    digest(project(parsed.settings, parsed.household, parsed.entries)),
    digest(project(DEMO_PLAN.settings, DEMO_PLAN.household, DEMO_PLAN.entries)),
    'electing release moved a figure — M1 is the shape and its refusals, and debits nothing',
  );
});

test('case 6: an election by a Person with NO Division 293 liability is accepted, and is inert', () => {
  // Dana earns far less than the $250,000 threshold, so this election can never fire. It is not
  // refused, because whether a Person is charged is a fact about a YEAR OF THE WALK — income moves,
  // and the threshold is crossed or not in each year of a forecast that runs to age 100 — so a door
  // that refused a standing election would have to run the projection to know it was idle.
  const parsed = parsePlan(mutated((file) => {
    file.household.persons[0].superInterests[0].statedReleaseAuthorityDestination = 'division293';
  }));
  const charged = project(parsed.settings, parsed.household, parsed.entries)
    .flatMap((month) => month.lines)
    .filter((line) => line.description.includes('Division 293'));
  assert.deepEqual(charged, [], 'the demo Household is charged Division 293, so "inert" proves nothing here');
});

test('case 3: an election on a RETIREMENT-PHASE interest is refused by name, with the reason', () => {
  // The ground is `checkContributionTargets`'s read from the other direction: a payment out of a
  // retirement-phase stream to satisfy a release authority is a COMMUTATION, and this build has no
  // path that commutes.
  for (const phase of ['accountBasedPension', 'ttr']) {
    const file = mutated((each) => {
      each.household.persons[1].superInterests[0].phase = phase;
      each.household.persons[1].superInterests[0].statedReleaseAuthorityDestination = 'division293';
    });
    assert.throws(() => parsePlan(file), PlanFileHouseholdError, `an election on a ${phase} interest was accepted`);
    const message = thrown(() => parsePlan(file)).message;
    assert.match(message, /household\.persons\[1\]\.superInterests\[0\]\.statedReleaseAuthorityDestination/);
    assert.match(message, /commutation/i, 'the refusal does not say why');
    assert.match(message, /transfer balance account/, 'the refusal does not name what a commutation moves');
    assert.match(message, phase === 'ttr' ? /transition-to-retirement/ : /account-based pension/, 'the refusal does not name the phase it found');
    assert.match(message, /Name an accumulation interest/, 'the refusal does not say what to do');
  }
  // The vacuity control: the same Person, same phase, WITHOUT the election, parses. So the refusal
  // above is the election and not the surgery.
  assert.ok(parsePlan(mutated((each) => { each.household.persons[1].superInterests[0].phase = 'ttr'; })));
});

test('case 4: TWO interests of one Person electing is refused — never resolved by picking one', () => {
  const file = mutated((each) => {
    each.household.persons[0].superInterests[0].statedReleaseAuthorityDestination = 'division293';
    each.household.persons[0].superInterests.push({
      phase: 'accumulation', balance: 90_000_00, statedReleaseAuthorityDestination: 'division293',
    });
  });
  assert.throws(() => parsePlan(file), PlanFileHouseholdError);
  const message = thrown(() => parsePlan(file)).message;
  assert.match(message, /household\.persons\[0\]\.superInterests /);
  // It names BOTH positions, because a message naming one would read as a verdict on which is wrong.
  assert.match(message, /positions 0, 1/);
  assert.match(message, /a release authority is served on one interest/);
  assert.match(message, /Name exactly one/);
  // The vacuity control: the same two interests with ONE election parse.
  assert.ok(parsePlan(mutated((each) => {
    each.household.persons[0].superInterests[0].statedReleaseAuthorityDestination = 'division293';
    each.household.persons[0].superInterests.push({ phase: 'accumulation', balance: 90_000_00 });
  })));
});

test('case 5: the rule is PER PERSON — one election each is two elections in the file, and is accepted', () => {
  const parsed = parsePlan(mutated((file) => {
    file.household.persons[0].superInterests[0].statedReleaseAuthorityDestination = 'division293';
    file.household.persons[1].superInterests[0].phase = 'accumulation';
    delete file.household.persons[1].superInterests[0].statedStreamSettings;
    file.household.persons[1].superInterests[0].statedReleaseAuthorityDestination = 'division293';
  }));
  assert.deepEqual(
    parsed.household.persons.map((person) => person.superInterests[0].statedReleaseAuthorityDestination),
    ['division293', 'division293'],
  );
});

test('it is a SIBLING of the employer destination, not a reuse: the two are read independently', () => {
  // ⚠️ The whole reason for a second field. `statedEmployerContributionDestination` says where the
  // EMPLOYER CREDITS; this says where the ATO DEBITS. A Person may rationally nominate different
  // interests for each, so neither may be read off the other in either direction.
  const both = parsePlan(mutated((file) => {
    file.household.persons[0].superInterests[0].statedEmployerContributionDestination = 'superannuationGuarantee';
    file.household.persons[0].superInterests[0].statedReleaseAuthorityDestination = 'division293';
  }));
  assert.equal(both.household.persons[0].superInterests[0].statedEmployerContributionDestination, 'superannuationGuarantee');
  assert.equal(both.household.persons[0].superInterests[0].statedReleaseAuthorityDestination, 'division293');

  // Nominating the employer destination does NOT make the election.
  const employerOnly = parsePlan(mutated((file) => {
    file.household.persons[0].superInterests[0].statedEmployerContributionDestination = 'superannuationGuarantee';
  }));
  assert.ok(!Object.hasOwn(employerOnly.household.persons[0].superInterests[0], 'statedReleaseAuthorityDestination'),
    'a Guarantee nomination was read as a Subdiv 293-B election');
  // And the election does NOT nominate the employer's destination.
  const electionOnly = parsePlan(mutated((file) => {
    file.household.persons[0].superInterests[0].statedReleaseAuthorityDestination = 'division293';
  }));
  assert.ok(!Object.hasOwn(electionOnly.household.persons[0].superInterests[0], 'statedEmployerContributionDestination'),
    'a Subdiv 293-B election was read as a Guarantee nomination');

  // Each field is refused against its OWN vocabulary — the two unions do not leak into each other.
  for (const [key, wrong] of [
    ['statedReleaseAuthorityDestination', 'superannuationGuarantee'],
    ['statedEmployerContributionDestination', 'division293'],
  ]) {
    assert.throws(
      () => parsePlan(mutated((file) => { file.household.persons[0].superInterests[0][key] = wrong; })),
      PlanFileHouseholdError,
      `${key} accepted the other field's value`,
    );
  }
});

test('any other release authority is refused against the one this build knows', () => {
  // An excess concessional contributions determination and a Division 296 liability are each
  // releasable in law and neither is modelled, so naming one would state a fact no figure is
  // computed from.
  for (const value of [
    'division296', 'excessConcessional', 'div293', 'DIVISION293', 'Division293', '', true, 1, null, {},
  ]) {
    assert.throws(
      () => parsePlan(mutated((file) => { file.household.persons[0].superInterests[0].statedReleaseAuthorityDestination = value; })),
      PlanFileHouseholdError,
      `${JSON.stringify(value)} was accepted as a release authority destination`,
    );
  }
  // `null` is not absence anywhere else in this door and it is not absence here either.
  assert.match(
    thrown(() => parsePlan(mutated((file) => { file.household.persons[0].superInterests[0].statedReleaseAuthorityDestination = null; }))).message,
    /statedReleaseAuthorityDestination/,
  );
});

test('⚠️ SOURCE PIN (NARROWED in M2): the field has exactly four readers, and nothing defaults it', () => {
  // **This is a source pin and not a behavioural defence, and it is recorded as a stopgap in
  // TODO.md.** ⚠️ **M2 RETIRED THE HALF OF IT THAT MATTERED.** When M1 wrote this, no resolver
  // existed, so "no resolver derives the election from silence" could not be shown by running
  // anything and this count was the whole defence of it. `core/division293Release.ts` now exists
  // and IS called: that claim is defended behaviourally in `test/core-division293-release.test.mjs`
  // §1 — a Person holding one accumulation interest and electing nothing resolves to NO ELECTION,
  // which is the exact input the Guarantee's resolver derives from.
  //
  // What is left here is the RATCHET, and it is kept on its own ground: the field appears in
  // exactly four modules and in exactly the executable positions M1 and M2 put it in, so the day a
  // FIFTH module reads it the reader is sent to the rule at the top of this section before they
  // write the read.
  const counts = new Map();
  for (const path of tsFiles(SRC)) {
    const hits = [...executableCode(readFileSync(path, 'utf8')).matchAll(/\bstatedReleaseAuthorityDestination\b/g)].length;
    if (hits > 0) counts.set(path.slice(SRC.length + 1), hits);
  }
  //
  // ⚠️ **What this counts is what survives the strip**, and the strip blanks string literals — so
  // the door's allowed-key list, its two `optionally`/`optional` arguments and the path in its
  // refusal messages are all invisible here, and so would a consumer be that reached the field as
  // `interest['statedReleaseAuthorityDestination']`. Those are behaviourally defended above (a key
  // dropped from the allowed list is refused by the door; a value dropped is read back as absent)
  // and the numbers below are the PROPERTY ACCESSES, derived by hand and not read off a build:
  assert.deepEqual([...counts.entries()].sort(), [
    // The declaration, once.
    ['core/household.ts', 1],
    // The resolver (P6-10 M2): one property read, in `division293ReleaseDestination`'s filter. It
    // is the only module that turns the field into an answer, and it has no `??` beside it — see
    // the test above and `test/core-division293-release.test.mjs` §1.
    ['core/division293Release.ts', 1],
    // The door: one property read, in `checkReleaseAuthorityDestinations`'s filter. Everything else
    // it does with the field it does through a string literal.
    ['core/parsePlan.ts', 1],
    // The carry-through by position — persistence, not consumption: the read off the held interest
    // and the key written back.
    ['app/planEdits.ts', 2],
  ].sort(), 'the release election has gained (or lost) a reader under src/');

  // **And no default, in any of its spellings.** The one thing that must never appear is the field
  // being filled in when it is absent.
  for (const path of tsFiles(SRC)) {
    const code = executableCode(readFileSync(path, 'utf8'));
    assert.doesNotMatch(code, /statedReleaseAuthorityDestination\s*(?:\?\?|\|\|)/, `${path} defaults the election`);
    assert.doesNotMatch(code, /(?:\?\?|\|\|)\s*["']*\s*division293/, `${path} falls back to an election`);
  }
});

// --- §3d SPOUSE_CONTRIBUTION: money paid BY one Person INTO the other's own interest (P3-19) -----
//
// Ash (personB) holds an `accountBasedPension` interest and Dana (personA) holds an `accumulation`
// one, so every fixture below pays FROM Ash TO Dana — the one direction the demo Household can
// receive a contribution at all, `checkContributionTargets`'s own phase rule read for the receiver
// instead of the owner.

const spouseContributionEntryFixture = Object.freeze({
  id: 'spouse-contribution',
  date: '2033-01-01',
  owner: 'personB',
  type: 'SPOUSE_CONTRIBUTION',
  params: { amount: 300_000, receivingInterestIndex: 0 },
  enabled: true,
  createdAt: '2026-09-22',
});

const withSpouseContribution = (params = spouseContributionEntryFixture.params, over = {}) =>
  mutated((file) => { file.entries.push({ ...spouseContributionEntryFixture, ...over, params }); });

test('a SPOUSE_CONTRIBUTION parses, whole and unchanged', () => {
  const parsed = parsePlan(withSpouseContribution());
  const added = parsed.entries.at(-1);
  assert.deepEqual(added, spouseContributionEntryFixture);
});

test('a nil or negative amount is refused — a contribution of nothing is not a fact this entry states', () => {
  for (const amount of [0, -1, -500_00]) {
    assert.throws(
      () => parsePlan(withSpouseContribution({ amount, receivingInterestIndex: 0 })),
      PlanFileEntryError,
      `${amount} cents was accepted`,
    );
  }
});

test('receivingInterestIndex must be a whole, non-negative position — the same door LUMP_SUM_FROM_SUPER holds', () => {
  for (const receivingInterestIndex of [-1, 0.5, 'zero', null, undefined]) {
    assert.throws(
      () => parsePlan(withSpouseContribution({ amount: 300_000, receivingInterestIndex })),
      PlanFileEntryError,
      `${JSON.stringify(receivingInterestIndex)} was accepted`,
    );
  }
});

test('a household owner is refused — the contribution is paid BY one Person INTO the other\'s own interest', () => {
  const file = withSpouseContribution(spouseContributionEntryFixture.params, { owner: 'household' });
  assert.throws(() => parsePlan(file), PlanFileEntryError);
  assert.match(thrown(() => parsePlan(file)).message, /household/);
});

test('a single-Person Household is refused — there is nobody for the contribution to go to', () => {
  const onePerson = mutated((file) => {
    file.household.persons = [file.household.persons[0]];
    file.entries = file.entries.filter((entry) => entry.owner !== 'personB');
    file.entries.push({ ...spouseContributionEntryFixture, owner: 'personA' });
    for (const scenario of file.scenarios) scenario.entryIds = scenario.entryIds.filter((id) => file.entries.some((entry) => entry.id === id));
  });
  assert.throws(() => parsePlan(onePerson), PlanFileEntryError);
  assert.match(thrown(() => parsePlan(onePerson)).message, /this Household has only one Person/);
});

test('an interest that does not exist on the RECEIVING spouse is refused, naming their own count', () => {
  const file = withSpouseContribution({ amount: 300_000, receivingInterestIndex: 5 });
  assert.throws(() => parsePlan(file), PlanFileEntryError);
  assert.match(thrown(() => parsePlan(file)).message, /Dana holds 1 superannuation interest/);
});

test('a receiving interest that is NOT in accumulation phase is refused, on `checkContributionTargets`\'s own rule', () => {
  // Reversed from the fixture above: Dana pays INTO Ash's account-based pension, which cannot
  // receive a contribution at all.
  const file = mutated((each) => {
    each.entries.push({ ...spouseContributionEntryFixture, owner: 'personA', params: { amount: 300_000, receivingInterestIndex: 0 } });
  });
  assert.throws(() => parsePlan(file), PlanFileEntryError);
  assert.match(thrown(() => parsePlan(file)).message, /account-based pension/);
  assert.match(thrown(() => parsePlan(file)).message, /Name an accumulation interest/);
});

// --- §4 Settings, Household, entries ---------------------------------------------------------------

test('a malformed Settings is refused by name', () => {
  const cases = [
    (file) => { delete file.settings.nominalReturn; },
    (file) => { file.settings.nominalReturn = '0.065'; },
    (file) => { file.settings.economicSeries = { cpi: 0.025, pblci: 0.025, awote: 0.035 }; },
    (file) => { delete file.settings.deemingRates; },
    (file) => { file.settings.deemingRates.upper = null; },
    (file) => { file.settings.planningHorizonAge = 100.5; },
    (file) => { file.settings.planningHorizonAge = -1; },
    (file) => { file.settings.inflation = 0.03; }, // a key this build would never read
    (file) => { file.settings = null; },
  ];
  for (const [index, edit] of cases.entries()) {
    assert.throws(() => parsePlan(mutated(edit)), PlanFileSettingsError, `settings case ${index} was accepted`);
  }
});

test('a malformed Household is refused by name', () => {
  const cases = [
    (file) => { delete file.household.persons; },
    (file) => { file.household.persons = []; },
    (file) => { file.household.persons.push(file.household.persons[0]); }, // three people
    (file) => { file.household.homeStatus = 'rented'; },
    (file) => { file.household.persons[0].name = 42; },
    (file) => { file.household.persons[0].workBonusBalance = null; },
    (file) => { file.household.persons[0].superInterests[0].phase = 'pension'; },
    (file) => { file.household.persons[0].parcels[0].acquired = undefined; },
    (file) => { file.household.persons[0].nickname = 'Dee'; },
    (file) => { file.household.persons[1].superInterests[0].statedStreamSettings.statedWithdrawalCharacterisation = 'commutation'; },
  ];
  for (const [index, edit] of cases.entries()) {
    assert.throws(() => parsePlan(mutated(edit)), PlanFileHouseholdError, `household case ${index} was accepted`);
  }
});

test('P4-10a: a stated last Work Bonus top-up is a real day, on or before the plan date, not before 2024', () => {
  const asAt = onDisk().settings.asAtDate;
  const stating = (day) => mutated((file) => { file.household.persons[0].statedLastWorkBonusTopUp = day; });
  // Accepted and kept, at both ends of the window; absent stays absent.
  assert.equal(parsePlan(stating('2024-01-01')).household.persons[0].statedLastWorkBonusTopUp, '2024-01-01');
  assert.equal(parsePlan(stating(asAt)).household.persons[0].statedLastWorkBonusTopUp, asAt);
  assert.equal('statedLastWorkBonusTopUp' in parsePlan(onDisk()).household.persons[0], false);
  // Refused by name: not a date (the date door's own refusal), the day after the plan date, the day
  // before the $4,000 began.
  const dayAfter = new Date(Date.parse(`${asAt}T00:00:00Z`) + 86_400_000).toISOString().slice(0, 10);
  for (const [day, Kind] of [['2025-2-1', PlanFileDateError], [20250201, PlanFileHouseholdError], [dayAfter, PlanFileHouseholdError], ['2023-12-31', PlanFileHouseholdError]]) {
    assert.throws(() => parsePlan(stating(day)),
      (error) => error instanceof Kind && error.message.includes('household.persons[0].statedLastWorkBonusTopUp'),
      `${day} was accepted`);
  }
});

test('two people is a household and three is not', () => {
  assert.equal(parsePlan(onDisk()).household.persons.length, 2);
  const one = mutated((file) => { file.household.persons = [file.household.persons[0]]; });
  assert.equal(parsePlan(one).household.persons.length, 1);
});

test('a malformed entry is refused by name', () => {
  const cases = [
    (file) => { delete file.entries[0].id; },
    (file) => { file.entries[0].owner = 'personC'; },
    (file) => { delete file.entries[0].enabled; },
    (file) => { file.entries[0].enabled = 'true'; },
    (file) => { file.entries[0].params = {}; }, // SPEND_CHANGE without its annualSpend
    (file) => { file.entries[0].params.annualSpend = '84000'; },
    (file) => { file.entries[0].params.monthlySpend = 700000; },
    (file) => { file.entries[1].params = { daysPerWeek: 3 }; }, // RETIRE takes no params
    (file) => { file.entries = {}; },
  ];
  for (const [index, edit] of cases.entries()) {
    assert.throws(() => parsePlan(mutated(edit)), PlanFileEntryError, `entry case ${index} was accepted`);
  }
});

test('a WORK_PATTERN_CHANGE states the days AND the money, and the door refuses a pair that cannot both be true', () => {
  // **The one cross-field check in this file (2026-09-19), and the reason it is here rather than
  // in a named refusal class.** `annualSalary` was added so that "three days a week" can say what
  // three days pay — before it, `projection.ts` applied a `WORK_PATTERN_CHANGE` only at zero days
  // and a Person who cut their hours went on drawing their whole wage. An entry that states no
  // days AND a salary, or days AND no salary, says two incompatible things about one date, and the
  // engine would honour one of them and drop the other: the same silent mismatch the field exists
  // to end. It is a well-formedness fault in one entry, not an unanswered question about the law,
  // so it is refused inline as `PlanFileEntryError` exactly as a negative `daysPerWeek` is.
  const pattern = (params) => mutated((file) => {
    file.entries.push({
      id: 'pattern', date: '2032-01-01', owner: 'personA', type: 'WORK_PATTERN_CHANGE',
      params, enabled: true, createdAt: '2026-08-20',
    });
  });
  const entries = DEMO_PLAN.entries.length + 1;

  // ACCEPTED — the two consistent pairs, and they are the vacuity control for every refusal below.
  assert.equal(parsePlan(pattern({ daysPerWeek: 0, annualSalary: 0 })).entries.length, entries);
  assert.equal(parsePlan(pattern({ daysPerWeek: 3, annualSalary: 6_000_000 })).entries.length, entries);
  assert.equal(parsePlan(pattern({ daysPerWeek: 0.5, annualSalary: 1 })).entries.length, entries, 'a fractional day and a one-cent salary are odd, not contradictory');
  assert.deepEqual(parsePlan(pattern({ daysPerWeek: 3, annualSalary: 6_000_000 })).entries.at(-1).params, { daysPerWeek: 3, annualSalary: 6_000_000 });

  // REFUSED — the field itself.
  assert.throws(() => parsePlan(pattern({ daysPerWeek: 3 })), PlanFileEntryError, 'the salary is optional after all');
  assert.throws(() => parsePlan(pattern({ daysPerWeek: 3, annualSalary: '60000' })), PlanFileEntryError);
  assert.throws(() => parsePlan(pattern({ daysPerWeek: 3, annualSalary: -1 })), PlanFileEntryError);
  assert.throws(() => parsePlan(pattern({ daysPerWeek: -1, annualSalary: 1 })), PlanFileEntryError);
  assert.throws(() => parsePlan(pattern({ daysPerWeek: 3, annualSalary: 6_000_000, hoursPerDay: 8 })), PlanFileEntryError);

  // REFUSED — the PAIR, in both directions, and the message names the field to change and the
  // figure that is wrong. Both halves matter: either one of them can be the one the user meant.
  const noDaysWithMoney = thrown(() => parsePlan(pattern({ daysPerWeek: 0, annualSalary: 6_000_000 })));
  assert.ok(noDaysWithMoney instanceof PlanFileEntryError);
  assert.match(noDaysWithMoney.message, /annualSalary/);
  assert.match(noDaysWithMoney.message, /6000000/, 'the message does not quote the figure the user has to change');
  const daysWithNoMoney = thrown(() => parsePlan(pattern({ daysPerWeek: 3, annualSalary: 0 })));
  assert.ok(daysWithNoMoney instanceof PlanFileEntryError);
  assert.match(daysWithNoMoney.message, /annualSalary/);
  assert.notEqual(noDaysWithMoney.message, daysWithNoMoney.message, 'both directions give the same sentence — one of them is telling the user the wrong thing');
});

test('a RETURN_CHANGE states a rate, on nominalReturn\'s own sign precedent — negative is permitted', () => {
  // P2-11 microtask 2. `SPEND_CHANGE`'s own parser shape: one field, read with the same `rate`
  // helper `nominalReturn` itself goes through, and NO sign check — a negative return is a bleak
  // but real assumption, not a shape `projection.ts` cannot act on.
  const change = (params, owner = 'personA') => mutated((file) => {
    file.entries.push({
      id: 'return-change', date: '2032-01-01', owner, type: 'RETURN_CHANGE',
      params, enabled: true, createdAt: '2026-08-20',
    });
  });
  const entries = DEMO_PLAN.entries.length + 1;

  assert.equal(parsePlan(change({ rate: 0.065 })).entries.length, entries);
  assert.deepEqual(parsePlan(change({ rate: 0.065 })).entries.at(-1).params, { rate: 0.065 });
  // ACCEPTED — nil, and negative. Neither is a shape the engine cannot act on: a nil return is a
  // real (if unlikely) assumption and a negative one is a bleaker one, exactly as `nominalReturn`
  // is not refused at either.
  assert.equal(parsePlan(change({ rate: 0 })).entries.length, entries);
  assert.equal(parsePlan(change({ rate: -0.02 })).entries.length, entries);
  assert.deepEqual(parsePlan(change({ rate: -0.02 })).entries.at(-1).params, { rate: -0.02 });

  // REFUSED — not a finite number.
  assert.throws(() => parsePlan(change({ rate: '0.065' })), PlanFileEntryError);
  assert.throws(() => parsePlan(change({})), PlanFileEntryError, 'rate is required');
  assert.throws(() => parsePlan(change({ rate: Number.POSITIVE_INFINITY })), PlanFileEntryError);
  assert.throws(() => parsePlan(change({ rate: 0.065, note2: 'extra' })), PlanFileEntryError, 'an unknown field is not silently dropped');

  // A household-owned entry is accepted too — it reaches every Person (`projection.ts`'s
  // `personsReachedBy`), on `RETIRE`'s own precedent rather than `SUPER_CONTRIBUTION`'s: "our
  // return assumption changed" is a coherent statement, unlike a per-person cap.
  assert.equal(parsePlan(change({ rate: 0.05 }, 'household')).entries.length, entries);
});

test('a NON_SUPER_INVESTMENT sell cannot carry a buy-only param, exactly as it cannot compile', () => {
  const sell = (params) => mutated((file) => {
    file.entries.push({
      id: 'sell', date: '2032-01-01', owner: 'personA', type: 'NON_SUPER_INVESTMENT',
      params, enabled: true, createdAt: '2026-08-20',
    });
  });
  assert.equal(parsePlan(sell({ direction: 'sell', amount: 1000 })).entries.length, 4);
  assert.equal(parsePlan(sell({ direction: 'sell', amount: 1000, parcelSelection: 'oldest-first' })).entries.length, 4);
  assert.throws(() => parsePlan(sell({ direction: 'sell', amount: 1000, incidentalCostsOfAcquisition: 30 })), PlanFileEntryError);
  assert.throws(() => parsePlan(sell({ direction: 'buy', amount: 1000 })), PlanFileEntryError); // a buy owes its brokerage
  assert.throws(() => parsePlan(sell({ direction: 'draw', amount: 1000 })), PlanFileEntryError);
  assert.equal(parsePlan(sell({ direction: 'buy', amount: 1000, incidentalCostsOfAcquisition: 0 })).entries.length, 4);
});

// --- §5 The two leaf guards, and the rule they must not drift from -------------------------------------

// **`PlanFileAmountError` is for a NUMBER that is not whole cents.** A money field that is absent
// or holds a string is a malformed field and is refused by the section that owns it — the two are
// different faults and a user fixes them differently.
test('money that is not whole cents is refused by name, wherever it appears', () => {
  const places = [
    (file) => { file.entries[0].params.annualSpend = 8400000.5; },
    (file) => { file.household.persons[0].superInterests[0].balance = 1e20; },
    (file) => { file.household.persons[0].parcels[0].costBase = -0.5; },
    (file) => { file.household.openingOffsetBalance = NaN; }, // JSON cannot hold it; an in-memory caller can
    (file) => { file.entries[2].params.amount = Infinity; },
  ];
  for (const [index, edit] of places.entries()) {
    assert.throws(() => parsePlan(mutated(edit)), PlanFileAmountError, `amount case ${index} was accepted`);
  }
});

test('the whole-cents rule here is the SAME rule money.ts enforces', () => {
  // `parsePlan` restates `assertWhole` rather than importing it, because the refusal needs a name.
  // This is the pin that keeps the two from drifting: for every candidate, accepting in one place
  // and rejecting in the other is a failure.
  for (const value of [0, 1, -1, 84_000_00, 9007199254740991, 0.5, -0.5, 1e20, NaN, Infinity]) {
    let moneyAccepts = true;
    try { addCents(value, 0); } catch { moneyAccepts = false; }

    let planAccepts = true;
    try { parsePlan(mutated((file) => { file.entries[2].params.amount = value; })); } catch (error) {
      if (!(error instanceof PlanFileAmountError)) throw error;
      planAccepts = false;
    }
    assert.equal(planAccepts, moneyAccepts, `money.ts and parsePlan disagree about ${value}`);
  }
});

test('a date that is not zero-padded is refused by name, wherever it appears', () => {
  const places = [
    (file) => { file.settings.asAtDate = '2026-9-1'; },
    (file) => { file.household.persons[0].dateOfBirth = '1968-5-14'; },
    (file) => { file.household.persons[1].superInterests[0].statedStreamSettings.commencementDay = 'yesterday'; },
    (file) => { file.household.persons[0].parcels[0].acquired = '2014-03-11T00:00:00Z'; },
    (file) => { file.entries[0].date = '2026-09'; },
    (file) => { file.entries[0].createdAt = ''; },
  ];
  for (const [index, edit] of places.entries()) {
    assert.throws(() => parsePlan(mutated(edit)), PlanFileDateError, `date case ${index} was accepted`);
  }
});

// --- §6 The file itself ------------------------------------------------------------------------------

test('a file that is not a plan file is refused before anything else is read', () => {
  for (const value of [null, 42, 'a plan', [], [DEMO_PLAN], undefined, true]) {
    assert.throws(() => parsePlan(value), PlanFileShapeError, `${JSON.stringify(value)} was accepted`);
  }
});

test('a top-level key this build does not read is refused rather than dropped', () => {
  assert.throws(() => parsePlan(mutated((file) => { file.ledger = []; })), PlanFileShapeError);
  assert.throws(() => parsePlan(mutated((file) => { file.scenarioName = 'base'; })), PlanFileShapeError);
});

test('every refusal is a RangeError, so one catch can hold them all', () => {
  for (const Kind of [
    PlanFileShapeError, PlanFileVersionError, PlanFileSettingsError, PlanFileHouseholdError,
    PlanFileEntryError, PlanFileAmountError, PlanFileDateError, UnspecifiedEntryTypeError,
  ]) {
    assert.ok(new Kind('x') instanceof RangeError, `${Kind.name} is not a RangeError`);
  }
});

test('every refusal says "plan file" and where in it, so a message can be acted on', () => {
  const error = thrown(() => parsePlan(mutated((file) => { file.household.persons[1].parcels = 3; })));
  assert.match(error.message, /^plan file: household\.persons\[1\]\.parcels /);
});

/** The thrown refusal, so its CLASS and its MESSAGE can both be asserted. */
const refusal = (fn) => {
  try { fn(); } catch (error) { return error; }
  return assert.fail('nothing was thrown');
};

// --- §12 The Contingency Floor at the door — P4-14 -------------------------------------------------
//
// `Settings.contingencyFloor` was the only optional field on `Settings` until P3-22h step 1 added
// two more (§13 below), it is stated in TODAY'S
// money, and absence is the only spelling of "no floor". The three things the door owes: an existing
// file that predates the field still parses and re-writes unchanged, a stated figure survives whole,
// and a nil is refused rather than accepted as a floor of nothing.

test('A FILE WRITTEN BEFORE THE FIELD EXISTED STILL PARSES — and re-writes with no key', () => {
  // The demo plan states no floor, which is what every plan file on disk today looks like.
  const file = onDisk();
  assert.equal(Object.hasOwn(file.settings, 'contingencyFloor'), false, 'the fixture states a floor — this test proves nothing');
  const parsed = parsePlan(file);
  assert.equal(Object.hasOwn(parsed.settings, 'contingencyFloor'), false, 'the door invented a floor');
  // Byte for byte on the SETTINGS, not merely deep-equal: a key set to `undefined` would pass
  // `deepEqual` here and change what `JSON.stringify` writes back to the user's disk. (The whole
  // file is compared with `deepEqual` because `parseEntry` re-orders an entry's own keys, which is
  // §1's business and not this field's.)
  assert.equal(JSON.stringify(parsed.settings), JSON.stringify(file.settings));
  assert.deepEqual(JSON.parse(JSON.stringify(parsed)), DEMO_PLAN);
});

test('a STATED floor survives the round trip whole, and is whole cents', () => {
  const file = mutated((plan) => { plan.settings.contingencyFloor = 700_000_00; });
  const parsed = parsePlan(file);
  assert.equal(parsed.settings.contingencyFloor, 700_000_00);
  assert.equal(JSON.stringify(parsed.settings), JSON.stringify(file.settings));
  // The same rule every other money field is under: whole cents, or a refusal by name.
  assert.throws(
    () => parsePlan(mutated((plan) => { plan.settings.contingencyFloor = 700_000.5; })),
    (error) => error instanceof PlanFileAmountError && /settings\.contingencyFloor/.test(error.message),
  );
  assert.throws(
    () => parsePlan(mutated((plan) => { plan.settings.contingencyFloor = '700000'; })),
    (error) => error instanceof PlanFileSettingsError && /settings\.contingencyFloor/.test(error.message),
  );
});

test('a NIL or NEGATIVE floor is REFUSED — one spelling of "no floor", and it is absence', () => {
  for (const stated of [0, -1, -700_000_00]) {
    const error = refusal(() => parsePlan(mutated((plan) => { plan.settings.contingencyFloor = stated; })));
    assert.ok(error instanceof PlanFileSettingsError, `${stated} was not refused by the settings section`);
    assert.match(error.message, /settings\.contingencyFloor/);
    assert.match(error.message, /Leave the whole "contingencyFloor" key out/);
  }
  // The control, one cent away: a floor of $0.01 is a floor and is accepted, so the refusal above
  // is about nil and not about the field being unreadable.
  assert.equal(parsePlan(mutated((plan) => { plan.settings.contingencyFloor = 1; })).settings.contingencyFloor, 1);
});

test('`null` is not absence here either — a file that says null said something', () => {
  const error = refusal(() => parsePlan(mutated((plan) => { plan.settings.contingencyFloor = null; })));
  assert.ok(error instanceof PlanFileSettingsError);
  assert.match(error.message, /settings\.contingencyFloor/);
});

// --- §13 What the portfolio pays out, at the door — P3-22h step 1 ---------------------------------
//
// Two optional Settings, on `contingencyFloor`'s precedent and for its reason: `project()` reads
// neither, absence answers nothing, and a stated NIL is refused rather than accepted as a second
// spelling of absence. What is new here is the pairing — `investmentPayoutFrankedShare` is a share
// OF `investmentPayoutRate`, so stated alone it would be a figure the user typed, the file kept,
// and nothing could ever be true of. The door refuses it and names the box to fill.

test('an ABSENT payout is the plan this build has always projected — no key, and nothing invented', () => {
  const parsed = parsePlan(onDisk());
  assert.equal(Object.hasOwn(parsed.settings, 'investmentPayoutRate'), false);
  assert.equal(Object.hasOwn(parsed.settings, 'investmentPayoutFrankedShare'), false);
  assert.equal(parsed.settings.investmentPayoutRate, undefined);
  assert.equal(parsed.settings.investmentPayoutFrankedShare, undefined);
  // And absent means ABSENT on the way back out: a re-written file states neither key, so every
  // plan saved before 2026-09-22 round-trips byte for byte.
  assert.equal(JSON.stringify(parsed.settings), JSON.stringify(onDisk().settings));
});

test('a STATED payout and share survive the round trip whole, as the decimals they were typed as', () => {
  const file = mutated((plan) => {
    plan.settings.investmentPayoutRate = 0.042;
    plan.settings.investmentPayoutFrankedShare = 0.8;
  });
  const parsed = parsePlan(file);
  assert.equal(parsed.settings.investmentPayoutRate, 0.042);
  assert.equal(parsed.settings.investmentPayoutFrankedShare, 0.8);
  assert.equal(JSON.stringify(parsed.settings), JSON.stringify(file.settings));
  // The payout alone is a complete answer: a portfolio may pay out with nothing credited on it.
  const alone = parsePlan(mutated((plan) => { plan.settings.investmentPayoutRate = 0.042; }));
  assert.equal(alone.settings.investmentPayoutRate, 0.042);
  assert.equal(Object.hasOwn(alone.settings, 'investmentPayoutFrankedShare'), false);
  // Neither is money, so neither is under the whole-cents rule — but both must be finite numbers,
  // and a string that looks like one is refused by name rather than coerced.
  for (const key of ['investmentPayoutRate', 'investmentPayoutFrankedShare']) {
    const error = refusal(() => parsePlan(mutated((plan) => {
      plan.settings.investmentPayoutRate = 0.042;
      plan.settings[key] = '0.5';
    })));
    assert.ok(error instanceof PlanFileSettingsError);
    assert.match(error.message, new RegExp(`settings\\.${key}`));
  }
});

test('a NIL or NEGATIVE payout is REFUSED — one spelling of "they pay me nothing", and it is absence', () => {
  for (const stated of [0, -0.04, -1]) {
    const error = refusal(() => parsePlan(mutated((plan) => { plan.settings.investmentPayoutRate = stated; })));
    assert.ok(error instanceof PlanFileSettingsError, `${stated} was not refused by the settings section`);
    assert.match(error.message, /settings\.investmentPayoutRate/);
    assert.match(error.message, /Leave the whole "investmentPayoutRate" key out/);
  }
  // No ceiling, and that is deliberate: a payout above the whole value in a year is a strange
  // portfolio and not an impossible one, and a door that refused it would refuse on a figure
  // nobody legislated. The control is that a large one is ACCEPTED, so the nil refusal above is
  // about nil and not about the field being unreadable.
  assert.equal(parsePlan(mutated((plan) => { plan.settings.investmentPayoutRate = 1.5; })).settings.investmentPayoutRate, 1.5);
  assert.equal(parsePlan(mutated((plan) => { plan.settings.investmentPayoutRate = 0.0001; })).settings.investmentPayoutRate, 0.0001);
});

test('the SHARE is refused at nil, above the whole, and — the new one — with no payout to be a share OF', () => {
  const withRate = (share) => mutated((plan) => {
    plan.settings.investmentPayoutRate = 0.042;
    plan.settings.investmentPayoutFrankedShare = share;
  });
  for (const stated of [0, -0.1, 1.0001, 2]) {
    const error = refusal(() => parsePlan(withRate(stated)));
    assert.ok(error instanceof PlanFileSettingsError, `${stated} was not refused by the settings section`);
    assert.match(error.message, /settings\.investmentPayoutFrankedShare/);
  }
  // The ceiling is STRUCTURAL — a part of a thing cannot exceed the thing — which is why this
  // field has one and the payout rate does not. Exactly 1 is a share and is accepted.
  assert.equal(parsePlan(withRate(1)).settings.investmentPayoutFrankedShare, 1);
  // ⚠️ The pairing refusal. A share with nothing to be a share of would be typed, saved, shown
  // back and forever inert — the defect class this project has been bitten by twice.
  const orphan = refusal(() => parsePlan(mutated((plan) => { plan.settings.investmentPayoutFrankedShare = 0.8; })));
  assert.ok(orphan instanceof PlanFileSettingsError);
  assert.match(orphan.message, /settings\.investmentPayoutFrankedShare/);
  assert.match(orphan.message, /no "investmentPayoutRate" is stated/);
});

test('`null` is not absence for either payout field either — a file that says null said something', () => {
  for (const key of ['investmentPayoutRate', 'investmentPayoutFrankedShare']) {
    const error = refusal(() => parsePlan(mutated((plan) => {
      plan.settings.investmentPayoutRate = 0.042;
      plan.settings[key] = null;
    })));
    assert.ok(error instanceof PlanFileSettingsError);
    assert.match(error.message, new RegExp(`settings\\.${key}`));
  }
});

// --- §14 What share of a super fund's growth is income, at the door — P3-42 step 1 ----------------
//
// One optional Setting, on `investmentPayoutRate`'s precedent exactly: `project()` reads it
// nowhere yet (step 1 of three), absence answers nothing, and a stated nil is refused rather than
// accepted as a second spelling of absence. Unlike `investmentPayoutFrankedShare` there is no
// pairing to enforce — this rate stands alone, the way `investmentPayoutRate` itself does.

test('an ABSENT income-yield rate is the plan this build has always projected — no key, and nothing invented', () => {
  const parsed = parsePlan(onDisk());
  assert.equal(Object.hasOwn(parsed.settings, 'superIncomeYieldRate'), false);
  assert.equal(parsed.settings.superIncomeYieldRate, undefined);
  // And absent means ABSENT on the way back out: a re-written file states no key, so every plan
  // saved before 2026-09-22 round-trips byte for byte.
  assert.equal(JSON.stringify(parsed.settings), JSON.stringify(onDisk().settings));
});

test('a STATED income-yield rate survives the round trip whole, as the decimal it was typed as', () => {
  const file = mutated((plan) => { plan.settings.superIncomeYieldRate = 0.021; });
  const parsed = parsePlan(file);
  assert.equal(parsed.settings.superIncomeYieldRate, 0.021);
  assert.equal(JSON.stringify(parsed.settings), JSON.stringify(file.settings));
  // Not money, so not under the whole-cents rule — but it must be a finite number, and a string
  // that looks like one is refused by name rather than coerced.
  const error = refusal(() => parsePlan(mutated((plan) => { plan.settings.superIncomeYieldRate = '0.021'; })));
  assert.ok(error instanceof PlanFileSettingsError);
  assert.match(error.message, /settings\.superIncomeYieldRate/);
});

test('a NIL or NEGATIVE income-yield rate is REFUSED — one spelling of "nothing counts as income", and it is absence', () => {
  for (const stated of [0, -0.02, -1]) {
    const error = refusal(() => parsePlan(mutated((plan) => { plan.settings.superIncomeYieldRate = stated; })));
    assert.ok(error instanceof PlanFileSettingsError, `${stated} was not refused by the settings section`);
    assert.match(error.message, /settings\.superIncomeYieldRate/);
    assert.match(error.message, /Leave the whole "superIncomeYieldRate" key out/);
  }
  // No ceiling, on `investmentPayoutRate`'s own ground: a large one is ACCEPTED, so the nil refusal
  // above is about nil and not about the field being unreadable.
  assert.equal(parsePlan(mutated((plan) => { plan.settings.superIncomeYieldRate = 1.5; })).settings.superIncomeYieldRate, 1.5);
  assert.equal(parsePlan(mutated((plan) => { plan.settings.superIncomeYieldRate = 0.0001; })).settings.superIncomeYieldRate, 0.0001);
});

test('`null` is not absence for the income-yield rate either — a file that says null said something', () => {
  const error = refusal(() => parsePlan(mutated((plan) => { plan.settings.superIncomeYieldRate = null; })));
  assert.ok(error instanceof PlanFileSettingsError);
  assert.match(error.message, /settings\.superIncomeYieldRate/);
});

test('an unknown key beside superIncomeYieldRate is still refused by the door — no allowlist leak', () => {
  const error = refusal(() => parsePlan(mutated((plan) => {
    plan.settings.superIncomeYieldRate = 0.021;
    plan.settings.superIncomeYieldRateTypo = 0.021;
  })));
  assert.ok(error instanceof PlanFileSettingsError);
  assert.match(error.message, /superIncomeYieldRateTypo/);
});

// --- §15 How much of the super income share is franked, at the door — P3-42 step 3 ----------------
//
// `investmentPayoutFrankedShare`'s pairing precedent exactly, moved inside super: a SHARE of
// `superIncomeYieldRate`'s own figure, refused alone.

test('a STATED super franked share survives the round trip whole, and is refused alone', () => {
  const file = mutated((plan) => {
    plan.settings.superIncomeYieldRate = 0.021;
    plan.settings.superIncomeYieldFrankedShare = 0.65;
  });
  const parsed = parsePlan(file);
  assert.equal(parsed.settings.superIncomeYieldFrankedShare, 0.65);
  assert.equal(JSON.stringify(parsed.settings), JSON.stringify(file.settings));

  const orphan = refusal(() => parsePlan(mutated((plan) => { plan.settings.superIncomeYieldFrankedShare = 0.65; })));
  assert.ok(orphan instanceof PlanFileSettingsError);
  assert.match(orphan.message, /settings\.superIncomeYieldFrankedShare/);
  assert.match(orphan.message, /no "superIncomeYieldRate" is stated/);
});

test('the super franked share is refused at nil, above the whole, and at exactly 1 it is accepted', () => {
  const withRate = (share) => mutated((plan) => {
    plan.settings.superIncomeYieldRate = 0.021;
    plan.settings.superIncomeYieldFrankedShare = share;
  });
  for (const stated of [0, -0.1, 1.0001, 2]) {
    const error = refusal(() => parsePlan(withRate(stated)));
    assert.ok(error instanceof PlanFileSettingsError, `${stated} was not refused by the settings section`);
    assert.match(error.message, /settings\.superIncomeYieldFrankedShare/);
  }
  assert.equal(parsePlan(withRate(1)).settings.superIncomeYieldFrankedShare, 1);
});

// --- §16 A TTR at the door: a commencement day, and a drawdown rate inside the law's range ---------
//
// TTR build step 1 (2026-09-23). The walk pays a TTR its year's figure from the stream's
// commencement day, and never guesses one; a TTR stated with no day would be walked as a stream
// that pays nothing, so the door refuses it by name. The chosen rate is optional — absent, the
// Schedule 7 minimum is paid — and when stated it must lie between Schedule 7's lowest factor (4%)
// and the SISR reg 6.01(2)(b)(ii) ceiling (10%).

/** Dana's one interest as a TTR — the demo plan holds none — with the stream settings given. */
const danaTtr = (streamSettings) => mutated((plan) => {
  plan.household.persons[0].superInterests[0].phase = 'ttr';
  if (streamSettings !== undefined) plan.household.persons[0].superInterests[0].statedStreamSettings = streamSettings;
});

test('a TTR with NO commencement day is REFUSED by name, not walked as a stream paying nothing', () => {
  const error = thrown(() => parsePlan(danaTtr(undefined)));
  assert.ok(error instanceof PlanFileHouseholdError, `refused by the wrong section: ${error}`);
  assert.match(error.message, /household\.persons\[0\]\.superInterests\[0\]\.statedStreamSettings is absent/);
  assert.match(error.message, /would pay nothing/, 'the refusal does not say what silence would have cost');
  assert.match(error.message, /State statedStreamSettings\.commencementDay/, 'the refusal does not say what to do');
  // The vacuity control: the same TTR WITH a day parses, so the refusal above is the missing day
  // and not the phase surgery.
  assert.ok(parsePlan(danaTtr({ commencementDay: '2028-05-14' })));
  // And the refusal is the TTR's only: an account-based pension without a day still parses, as it
  // always has (limb 2 says so in its note), because this ruling was made for the TTR alone.
  assert.ok(parsePlan(mutated((plan) => { plan.household.persons[0].superInterests[0].phase = 'accountBasedPension'; })));
});

test('a stated TTR drawdown rate survives the round trip whole, at both ends of the range', () => {
  for (const stated of [0.04, 0.07, 0.1]) {
    const file = danaTtr({ commencementDay: '2028-05-14', statedTtrDrawdownRate: stated });
    const parsed = parsePlan(file);
    assert.equal(parsed.household.persons[0].superInterests[0].statedStreamSettings.statedTtrDrawdownRate, stated);
    assert.equal(JSON.stringify(parsed.household), JSON.stringify(file.household));
  }
  // Absent is absent: no key is invented on the way through.
  const parsed = parsePlan(danaTtr({ commencementDay: '2028-05-14' }));
  assert.equal(Object.hasOwn(parsed.household.persons[0].superInterests[0].statedStreamSettings, 'statedTtrDrawdownRate'), false);
});

test('a TTR drawdown rate below 4% or above 10% is REFUSED by name, one step either side', () => {
  for (const stated of [0.0399, 0.1001, 0, -0.05, 0.15, 1]) {
    const error = thrown(() => parsePlan(danaTtr({ commencementDay: '2028-05-14', statedTtrDrawdownRate: stated })));
    assert.ok(error instanceof PlanFileHouseholdError, `${stated} was not refused by the household section`);
    assert.match(error.message, /superInterests\[0\]\.statedStreamSettings\.statedTtrDrawdownRate/);
    assert.match(error.message, /between 0\.04 .* and 0\.1 /, 'the refusal does not state the range');
    assert.match(error.message, /reg 6\.01\(2\)\(b\)\(ii\)/, 'the ceiling is not cited to the regulation that sets it');
  }
});

test('a TTR drawdown rate on an interest that is NOT a TTR is refused — nothing would read it', () => {
  // Ash's interest is an account-based pension with a commencement day in the demo plan.
  const error = thrown(() => parsePlan(mutated((plan) => {
    plan.household.persons[1].superInterests[0].statedStreamSettings.statedTtrDrawdownRate = 0.05;
  })));
  assert.ok(error instanceof PlanFileHouseholdError);
  assert.match(error.message, /persons\[1\]\.superInterests\[0\]\.statedStreamSettings\.statedTtrDrawdownRate/);
  assert.match(error.message, /account-based pension phase/);
});

// --- TTR_RATE_CHANGE: a dated drawdown rate for one TTR interest (TTR build step 3) --------------
//
// Dana (born 1968-05-14) put into TTR by `withDanaInTris`; her 65th birthday is 2033-05-14.

const TTR_RATE = Object.freeze({
  id: 'ttr-rate',
  date: '2030-01-01',
  owner: 'personA',
  type: 'TTR_RATE_CHANGE',
  params: { interestIndex: 0, drawdownRate: 0.07 },
  enabled: true,
  createdAt: '2026-09-23',
});

test('TTR_RATE_CHANGE: a rate change on a TTR interest before 65 is accepted, whole and unchanged', () => {
  const parsed = parsePlan(withDanaInTris((file) => { file.entries.push(TTR_RATE); }));
  assert.deepEqual(parsed.entries.at(-1), TTR_RATE);
});

test('TTR_RATE_CHANGE: the rate has the household box bounds, 4% to 10% inclusive, from the same constants', () => {
  for (const drawdownRate of [TTR_RATE_FLOOR, 0.07, TTR_RATE_CEILING]) {
    assert.ok(parsePlan(withDanaInTris((file) => { file.entries.push({ ...TTR_RATE, params: { interestIndex: 0, drawdownRate } }); })));
  }
  for (const drawdownRate of [0.039, 0.101, 7, undefined, '0.07']) {
    const file = withDanaInTris((file) => { file.entries.push({ ...TTR_RATE, params: { interestIndex: 0, drawdownRate } }); });
    assert.throws(() => parsePlan(file), PlanFileEntryError, `drawdownRate ${JSON.stringify(drawdownRate)} was accepted`);
  }
});

test('TTR_RATE_CHANGE: refused by name on an interest that is not a TTR', () => {
  for (const phase of ['accumulation', 'accountBasedPension']) {
    const file = mutated((file) => {
      file.household.persons[0].superInterests[0].phase = phase;
      file.entries.push(TTR_RATE);
    });
    assert.throws(() => parsePlan(file), PlanFileEntryError, `a ${phase} interest was accepted`);
    assert.match(thrown(() => parsePlan(file)).message, /not a transition to retirement pension/);
  }
});

test('TTR_RATE_CHANGE: refused by name on or after the 65th birthday, the day the stream becomes a full pension', () => {
  assert.ok(parsePlan(withDanaInTris((file) => { file.entries.push({ ...TTR_RATE, date: '2033-05-13' }); })));
  for (const date of ['2033-05-14', '2034-01-01']) {
    const file = withDanaInTris((file) => { file.entries.push({ ...TTR_RATE, date }); });
    assert.throws(() => parsePlan(file), PlanFileEntryError);
    assert.match(thrown(() => parsePlan(file)).message, /65th birthday/);
  }
});

test('TTR_RATE_CHANGE: a household owner and an index naming no account are refused', () => {
  const shared = withDanaInTris((file) => { file.entries.push({ ...TTR_RATE, owner: 'household' }); });
  assert.throws(() => parsePlan(shared), PlanFileEntryError);
  const dangling = withDanaInTris((file) => { file.entries.push({ ...TTR_RATE, params: { interestIndex: 1, drawdownRate: 0.07 } }); });
  assert.throws(() => parsePlan(dangling), PlanFileEntryError);
  assert.match(thrown(() => parsePlan(dangling)).message, /has 1 super account/);
});

// --- GIFT slice 2 (register §4.12): the door --------------------------------------------------------

const GIFT = { id: 'gift-1', date: '2028-07-01', owner: 'personA', type: 'GIFT', params: { amount: 2_500_000 }, enabled: true, createdAt: '2026-10-02' };

test('GIFT: a positive whole-cent amount from a Person or the household is read back exactly', () => {
  for (const owner of ['personA', 'personB', 'household']) {
    const parsed = parsePlan(mutated((file) => { file.entries.push({ ...GIFT, owner }); }));
    assert.deepEqual(parsed.entries.at(-1), { ...GIFT, owner });
  }
  // A pre-plan gift is a real date too: it still counts against the pension (s 1127).
  assert.ok(parsePlan(mutated((file) => { file.entries.push({ ...GIFT, date: '2024-03-01' }); })));
});

test('GIFT: a nil or negative amount is refused by name, and a fraction of a cent as money', () => {
  for (const amount of [0, -100]) {
    const file = mutated((file) => { file.entries.push({ ...GIFT, params: { amount } }); });
    assert.throws(() => parsePlan(file), PlanFileEntryError, `amount ${amount} was accepted`);
    assert.match(thrown(() => parsePlan(file)).message, /a gift is more than nothing/);
  }
  assert.throws(() => parsePlan(mutated((file) => { file.entries.push({ ...GIFT, params: { amount: 100.5 } }); })), PlanFileAmountError);
  assert.throws(() => parsePlan(mutated((file) => { file.entries.push({ ...GIFT, params: {} }); })), PlanFileEntryError);
  assert.throws(() => parsePlan(mutated((file) => { file.entries.push({ ...GIFT, params: { amount: 100, to: 'Sam' } }); })), PlanFileEntryError);
});

test('GIFT: a giver who is not in the file is refused; the household always is', () => {
  const single = (owner) => mutated((file) => {
    file.household.persons = file.household.persons.slice(0, 1);
    file.entries = file.entries.filter((entry) => entry.owner !== 'personB');
    file.scenarios = file.scenarios.map((scenario) => ({ ...scenario, entryIds: scenario.entryIds.filter((id) => file.entries.some((entry) => entry.id === id)) }));
    file.entries.push({ ...GIFT, owner });
  });
  assert.ok(parsePlan(single('household')));
  assert.ok(parsePlan(single('personA')));
  assert.throws(() => parsePlan(single('personB')), PlanFileEntryError);
  assert.match(thrown(() => parsePlan(single('personB'))).message, /names a giver who is not in the file/);
});
