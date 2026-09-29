// P3-9 chunk 5b-5 — the consumer of R13's conversion day: the s 294-25(1) item 2 credit.
//
// `creditTrisConversionUnderItem106` computes nothing. It composes `trisConversionDayUnderItem106`
// with `creditOnCommencement`, so every test below is about one of three things:
//
//   1. the DAY the credit lands on is the resolved conversion day and never anything else;
//   2. the three refusals R13's resolution raises come out of this function unchanged;
//   3. one conversion makes exactly ONE entry, and the stream's original `commencementDay` — an
//      accumulation-phase fact — is never a starting day.
//
// **Where the days and the dollars come from, hand-worked, never off the implementation.**
//   * `DOB` 1961-07-01. 1961 + 65 = 2026, month and day unchanged -> 65th birthday **2026-07-01**.
//   * `LEAP_DOB` 1960-02-29. 1960 + 65 = 2025, not a leap year, so `nthBirthday` resolves to
//     **2025-03-01** — its own documented edge, and the direction that understates.
//   * The stream commenced **2019-09-01**, in accumulation phase. s 307-80(3) excluded it from
//     retirement phase on that day, so no item 2 credit arose then and none may arise for it now.
//   * The value on the conversion day is **$1,200,000** = 120,000,000 cents, a labelled synthetic
//     figure. It is deliberately NOT the commencement-day balance and not a round million, so a
//     transposed or defaulted argument reads back as a different number rather than as zero.
import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { creditTrisConversionUnderItem106 } from '../dist/core/trisConversionCredit.js';
import {
  TransferBalanceCapExceededError,
  closingBalanceOn,
  creditOnCommencement,
  openTransferBalanceAccountDays,
  openTransferBalanceLedger,
  seedPersonalTransferBalanceCap,
} from '../dist/core/transferBalanceAccount.js';
import { trisConversionDayUnderItem106 } from '../dist/core/trisConversionDay.js';
import { conditionOfRelease, schedule1ItemFor } from '../dist/core/conditionOfRelease.js';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = join(ROOT, 'src');

const executableCode = (text) =>
  text
    .replaceAll(/\/\*[\s\S]*?\*\//g, '')
    .replaceAll(/`(?:[^`\\]|\\.)*`|'(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*"|\/\/.*$/gm, (match) =>
      match.startsWith('//') ? '' : '""',
    );

const RAW = readFileSync(join(SRC, 'core', 'trisConversionCredit.ts'), 'utf8');
const CODE = executableCode(RAW);
const REGISTER = readFileSync(join(ROOT, 'docs', 'assumptions-register.md'), 'utf8');

const sources = function* (dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) yield* sources(path);
    else if (entry.name.endsWith('.ts')) yield path;
  }
};

/** Dollars to cents, so every expected figure below reads as the register writes it. */
const $ = (dollars) => dollars * 100;

const DOB = '1961-07-01';
const SIXTY_FIFTH = '2026-07-01';
const SIXTY_SECOND = '2023-07-01';
const LEAP_DOB = '1960-02-29';
const LEAP_SIXTY_FIFTH = '2025-03-01';
const COMMENCED = '2019-09-01';
/** SYNTHETIC — not a retrieved figure. The value of the supporting interest on the conversion day. */
const VALUE_ON_CONVERSION_DAY = $(1_200_000);
const AGE_GROUND = 'turning the age that releases benefits by itself';
const EMPLOYMENT_GROUND = 'ceasing gainful employment after Preservation Age';
const ITEM_2 = 'credit — s 294-25(1) item 2: a superannuation income stream started';

const settings = (extra = {}) => ({ commencementDay: COMMENCED, ...extra });

/**
 * **T117, honoured rather than assumed.** A fixture asserting automatic conversion at 65 must state
 * that no item 101, 102A or 103 was satisfied before the birthday, or it asserts a proposition
 * s 307-80(3)(b)(ii)'s bare text denies. Built from the real constructors: a Person who never
 * ceased gainful employment can have satisfied none of them.
 */
const neverCeased = (dateOfBirth, on) =>
  conditionOfRelease({ dateOfBirth, on, gainfulEmployment: { ceased: false } });

const ceasedAt = (dateOfBirth, ceasedOn, on) =>
  conditionOfRelease({ dateOfBirth, on, gainfulEmployment: { ceased: true, ceasedOn } });

const messageOf = (run) => {
  try {
    run();
  } catch (error) {
    return error.message;
  }
  return undefined;
};

// --- The register passage this chunk implements, quote-checked before anything is asserted --------

test('the register still says the conversion day IS the item 2 starting day', () => {
  // The whole content of this module is this sentence. A reworded row is a changed instruction.
  assert.ok(
    REGISTER.includes(
      'the conversion day is the **starting day** for s 294-25(1) item 2; the credit is the **value on that day of the WHOLE superannuation interest** supporting the stream',
    ),
    'the §3.10.6 conversion-credit row has moved or been reworded',
  );
  // And the item 2 row of §3.10.4's credits table, which fixes both the day and the figure.
  assert.ok(
    REGISTER.includes('| **2** | **you start to be** a retirement phase recipient on a day (the **starting day**) on or after 1 July 2017 | **the value ON THE STARTING DAY** of the superannuation interest that supports the stream'),
    'the s 294-25(1) item 2 row is the one this credit claims to be',
  );
  // O62 is a LABELLED INFERENCE and stays one — this chunk does not re-research how value is
  // measured, and the module says so rather than launders it.
  assert.ok(REGISTER.includes('**It is an inference from the words plus consistent ruling usage, not a stated rule.**'));
  assert.match(RAW, /labelled inference\*\* \(U17 \/ U25 \/ O56 \/ O62\)/);
});

// --- The positive case: exactly one credit, on the resolved day, at the supplied value ------------

test('a clean item-106 conversion credits ONCE, on the 65th birthday, at the value supplied', () => {
  const release = neverCeased(DOB, SIXTY_FIFTH);
  assert.equal(release.met, true);
  assert.deepEqual([...release.grounds], [AGE_GROUND]);
  assert.equal(schedule1ItemFor(release, AGE_GROUND).item, '106');

  // The account starts on the conversion day — s 294-15(2)(b), the first day this Person is a
  // retirement phase recipient — so the ledger is empty and the credit is its first entry.
  const empty = openTransferBalanceLedger(SIXTY_FIFTH);
  assert.equal(empty.entries.length, 0);
  assert.equal(empty.transferBalance, 0);

  const ledger = creditTrisConversionUnderItem106(empty, DOB, settings(), {
    valueOfSupportingInterestOnTheConversionDay: VALUE_ON_CONVERSION_DAY,
  });

  assert.equal(ledger.entries.length, 1, 'one conversion, one credit');
  const [entry] = ledger.entries;
  assert.equal(entry.day, SIXTY_FIFTH); // hand-worked above, not read off the resolver
  assert.equal(entry.event, ITEM_2);
  assert.equal(entry.amount, $(1_200_000));
  assert.equal(entry.movement, $(1_200_000));
  assert.equal(ledger.transferBalance, $(1_200_000));
  assert.equal(ledger.throughDay, SIXTY_FIFTH);
  assert.equal(closingBalanceOn(SIXTY_FIFTH, ledger), $(1_200_000));
  // The credit is DATED, not merely present: `closingBalanceOn` refuses any day before the last
  // entry (s 294-40(2)(a) closes a day once), so the day before the conversion cannot be read at
  // all rather than reading back zero. Pinned, because a credit dated a day early would be readable.
  assert.throws(() => closingBalanceOn('2026-06-30', ledger), /no longer the CLOSING balance/);

  // And it is the SAME line `creditOnCommencement` writes for the same day and value — nothing new
  // is minted here, which is what makes this a composition and not a second credit function.
  assert.deepEqual(
    ledger.entries,
    creditOnCommencement(openTransferBalanceLedger(SIXTY_FIFTH), {
      startingDay: SIXTY_FIFTH,
      valueOfSupportingInterestOnStartingDay: VALUE_ON_CONVERSION_DAY,
    }).entries,
  );
  // The input ledger is untouched: the ledger is immutable and this returns a new one.
  assert.equal(empty.entries.length, 0);
  assert.equal(empty.transferBalance, 0);
});

test('a STATED changeover day wins, and the credit lands on it rather than on the birthday', () => {
  // R13 limb 1. The stated day is years before the 65th birthday, so a credit dated on the birthday
  // would be a credit years late, at a balance that had grown in the meantime.
  const stated = settings({ statedTrisConversionDay: '2024-03-15' });
  const ledger = creditTrisConversionUnderItem106(openTransferBalanceLedger('2024-03-15'), DOB, stated, {
    valueOfSupportingInterestOnTheConversionDay: VALUE_ON_CONVERSION_DAY,
  });
  assert.equal(ledger.entries.length, 1);
  assert.equal(ledger.entries[0].day, '2024-03-15');
  assert.notEqual(ledger.entries[0].day, SIXTY_FIFTH);
  assert.equal(closingBalanceOn('2024-03-15', ledger), $(1_200_000));
  assert.equal(ledger.throughDay, '2024-03-15');
});

test('the leap-year Person is the second computable case, and it resolves to 1 March', () => {
  const leap = neverCeased(LEAP_DOB, LEAP_SIXTY_FIFTH);
  assert.deepEqual([...leap.grounds], [AGE_GROUND]);
  const ledger = creditTrisConversionUnderItem106(openTransferBalanceLedger(LEAP_SIXTY_FIFTH), LEAP_DOB, undefined, {
    valueOfSupportingInterestOnTheConversionDay: $(850_000), // SYNTHETIC, and a different figure from the other fixture
  });
  assert.equal(ledger.entries.length, 1);
  assert.equal(ledger.entries[0].day, LEAP_SIXTY_FIFTH);
  assert.equal(ledger.entries[0].amount, $(850_000));
  assert.equal(ledger.transferBalance, $(850_000));
  // Absent Settings entirely — "nobody was asked" — is the backstop's own case and it still works.
  assert.equal(trisConversionDayUnderItem106(LEAP_DOB, undefined), LEAP_SIXTY_FIFTH);
});

// --- The three refusals, one test each, propagating UNCHANGED --------------------------------------

test('REFUSAL 1 — a stated notification day takes the stream off this route, and no credit is made', () => {
  const stated = settings({ statedNotificationDay: '2024-07-15' });
  const empty = openTransferBalanceLedger(SIXTY_FIFTH);
  const credit = () =>
    creditTrisConversionUnderItem106(empty, DOB, stated, {
      valueOfSupportingInterestOnTheConversionDay: VALUE_ON_CONVERSION_DAY,
    });

  assert.throws(credit, RangeError);
  assert.throws(credit, /notification day of 2024-07-15 is stated for this stream/);
  // Word for word 5b-3's, not a re-wording: the refusal is inherited, never restated here.
  assert.equal(messageOf(credit), messageOf(() => trisConversionDayUnderItem106(DOB, stated)));
  // And the ledger is untouched — the day is resolved BEFORE anything is appended.
  assert.equal(empty.entries.length, 0);
  assert.equal(empty.transferBalance, 0);
});

test('REFUSAL 2 — a Schedule 1 item that is not the automatic-release one refuses, and no credit is made', () => {
  const release = neverCeased(DOB, SIXTY_FIFTH);
  const onItem101 = { ...schedule1ItemFor(release, AGE_GROUND), item: '101', ground: EMPLOYMENT_GROUND };
  const stated = settings({ statedSchedule1Item: onItem101 });
  const empty = openTransferBalanceLedger(SIXTY_FIFTH);
  const credit = () =>
    creditTrisConversionUnderItem106(empty, DOB, stated, {
      valueOfSupportingInterestOnTheConversionDay: VALUE_ON_CONVERSION_DAY,
    });

  assert.throws(credit, RangeError);
  assert.throws(credit, /age-65 route only/);
  assert.equal(messageOf(credit), messageOf(() => trisConversionDayUnderItem106(DOB, stated)));
  assert.equal(empty.entries.length, 0);

  // The item-106 identification is the route this answers, so the same shape converts and credits.
  const onItem106 = settings({ statedSchedule1Item: schedule1ItemFor(release, AGE_GROUND) });
  const ledger = creditTrisConversionUnderItem106(empty, DOB, onItem106, {
    valueOfSupportingInterestOnTheConversionDay: VALUE_ON_CONVERSION_DAY,
  });
  assert.equal(ledger.entries.length, 1);
  assert.equal(ledger.entries[0].day, SIXTY_FIFTH);
  // T117: this Person satisfied no other item before the birthday, stated through the constructors.
  assert.deepEqual([...ceasedAt(DOB, SIXTY_SECOND, SIXTY_FIFTH).grounds], [EMPLOYMENT_GROUND, AGE_GROUND]);
});

test('REFUSAL 3 — a stated day AFTER the 65th birthday is a contradiction, and no credit is made', () => {
  // The flattering failure this is against: swallowing the contradiction and crediting on ONE of
  // the two days would move a $1,200,000 credit by years, across a cap that indexes in between.
  const stated = settings({ statedTrisConversionDay: '2029-01-15' });
  const empty = openTransferBalanceLedger(SIXTY_FIFTH);
  const credit = () =>
    creditTrisConversionUnderItem106(empty, DOB, stated, {
      valueOfSupportingInterestOnTheConversionDay: VALUE_ON_CONVERSION_DAY,
    });

  assert.throws(credit, /contradict each other/);
  assert.throws(credit, /2029-01-15/);
  assert.throws(credit, new RegExp(SIXTY_FIFTH));
  assert.equal(messageOf(credit), messageOf(() => trisConversionDayUnderItem106(DOB, stated)));
  // Exactly a RangeError and nothing named: an input-boundary contradiction over two user
  // statements, as 5b-3 built it. A swallowed contradiction would have returned a ledger instead.
  try {
    credit();
    assert.fail('the contradiction did not throw — it was swallowed and a credit was made');
  } catch (error) {
    assert.equal(error.constructor, RangeError);
  }
  assert.equal(empty.entries.length, 0);

  // Equality is NOT a contradiction — the stated day and the derived day are the same fact twice —
  // so the boundary case still credits, exactly once, on the birthday.
  const onTheDay = creditTrisConversionUnderItem106(empty, DOB, settings({ statedTrisConversionDay: SIXTY_FIFTH }), {
    valueOfSupportingInterestOnTheConversionDay: VALUE_ON_CONVERSION_DAY,
  });
  assert.equal(onTheDay.entries.length, 1);
  assert.equal(onTheDay.entries[0].day, SIXTY_FIFTH);
  // And one day past it refuses, which is what makes `>` rather than `>=` load-bearing here too.
  assert.throws(
    () =>
      creditTrisConversionUnderItem106(empty, DOB, settings({ statedTrisConversionDay: '2026-07-02' }), {
        valueOfSupportingInterestOnTheConversionDay: VALUE_ON_CONVERSION_DAY,
      }),
    /contradict each other/,
  );
});

// --- The double-count guard, written as an assertion rather than as a comment ----------------------

test('the stream\'s own commencementDay is an ACCUMULATION-phase fact and is never a starting day', () => {
  // The future risk this guards, stated in dollars: the TRIS commenced 2019-09-01 and converted on
  // 2026-07-01. Item 2 credits ONCE, on the conversion day. A caller that also credited the
  // commencement day would record $2,400,000 against a $2,000,000-era cap on a Person who moved
  // $1,200,000 into retirement phase — the §3.10.9 "Ledger, not balance" failure with the sign
  // reversed, and it would read as a breach that never happened.
  const stated = settings({ statedTrisConversionDay: undefined });
  assert.equal(stated.commencementDay, COMMENCED);
  const ledger = creditTrisConversionUnderItem106(openTransferBalanceLedger(SIXTY_FIFTH), DOB, stated, {
    valueOfSupportingInterestOnTheConversionDay: VALUE_ON_CONVERSION_DAY,
  });

  assert.equal(ledger.entries.length, 1);
  assert.deepEqual(ledger.entries.map((entry) => entry.day), [SIXTY_FIFTH]);
  assert.ok(
    ledger.entries.every((entry) => entry.day !== COMMENCED),
    'the commencement day must never carry an item 2 credit',
  );
  assert.equal(ledger.transferBalance, $(1_200_000));
  assert.notEqual(ledger.transferBalance, $(2_400_000));
  // Nothing is dated on or before the commencement day at all, on any reading of the trail.
  assert.ok(ledger.entries.every((entry) => entry.day > COMMENCED));
  assert.throws(() => closingBalanceOn(COMMENCED, ledger), /no longer the CLOSING balance/);

  // **And structurally: this module never reads the field.** The behavioural half above would pass
  // on a module that read `commencementDay` and happened to discard it; this half is the one that
  // would fail the moment it were wired to the credit. Comments and strings are stripped, so the
  // header's prose about the commencement day does not satisfy it.
  assert.doesNotMatch(CODE, /commencementDay/);
  // Vacuity guard, both ways: the stripper leaves executable text behind, and the same grep DOES
  // find the field where it is declared — so "found none" is a fact about this module.
  assert.match(CODE, /export const creditTrisConversionUnderItem106/);
  assert.match(
    executableCode(readFileSync(join(SRC, 'core', 'household.ts'), 'utf8')),
    /commencementDay/,
    'the grep cannot find the field where it IS declared, so finding none here proves nothing',
  );
});

// --- Structural: what this module is, and what it may not become ------------------------------------

test('MUTATION — the module mints no refusal, catches nothing, and credits exactly once', () => {
  // Every refusal reachable from here is `trisConversionDay.ts`'s. A `catch` is the swallowed
  // contradiction; a second `creditOnCommencement` call is the double count; a `throw` is either a
  // fourteenth refusal name the register would have to carry (R8) or a second spelling of a
  // contradiction 5b-3 already owns.
  assert.doesNotMatch(CODE, /\bthrow\b/, 'the refusals here are inherited, never minted');
  assert.doesNotMatch(CODE, /\bcatch\b/, 'a catch here is the swallowed contradiction');
  assert.doesNotMatch(CODE, /export class \w+ extends RangeError/);
  assert.equal([...CODE.matchAll(/creditOnCommencement\(/g)].length, 1, 'one call, so one credit');
  assert.equal([...CODE.matchAll(/trisConversionDayUnderItem106\(/g)].length, 1);
  // The day is resolved BEFORE the ledger is touched — a ledger grown first would have to be
  // discarded, or would be returned by a caller who caught the throw.
  assert.ok(
    CODE.indexOf('trisConversionDayUnderItem106(') < CODE.indexOf('creditOnCommencement('),
    'the day must resolve before anything is appended',
  );
  // No day arithmetic and no age: both stay one module away, as they do in `trisInterest.ts`.
  assert.doesNotMatch(CODE, /\b65\b/);
  assert.doesNotMatch(CODE, /nthBirthday/);
  assert.doesNotMatch(CODE, /SUPERANNUATION/);
});

test('the value arrives in a NAMED field, so a dayless balance cannot be passed positionally', () => {
  // `creditOnCommencement`'s own discipline, mirrored: `value` on its own is the name of the
  // mistake. The only balance this codebase holds for a TRIS is `SuperInterest.balance`, which
  // carries no day at all, and both figures are `Cents` — so the compiler can only tell them apart
  // if the caller has to type the day into the parameter name.
  assert.match(CODE, /readonly valueOfSupportingInterestOnTheConversionDay: Cents;/);
  assert.match(CODE, /conversion: Item106ConversionValue,/);
  assert.match(CODE, /valueOfSupportingInterestOnStartingDay: conversion\.valueOfSupportingInterestOnTheConversionDay,/);
  // The discipline it mirrors is still there to mirror.
  assert.match(
    executableCode(readFileSync(join(SRC, 'core', 'transferBalanceAccount.ts'), 'utf8')),
    /readonly valueOfSupportingInterestOnStartingDay: Cents;/,
  );
  // **The runtime does NOT defend this, and saying so is the point.** A bare `Cents` in the fourth
  // position has no `valueOfSupportingInterestOnTheConversionDay`, so the amount is `undefined`, the
  // running total becomes `NaN` and the ledger is returned rather than refused. Measured, not
  // supposed. The defence is the compiler's alone, and the probe below is where it is proved.
  const corrupted = creditTrisConversionUnderItem106(openTransferBalanceLedger(SIXTY_FIFTH), DOB, settings(), $(1_200_000));
  assert.ok(Number.isNaN(corrupted.transferBalance), 'the runtime half is a NaN, not a refusal');
  assert.equal(corrupted.entries.length, 1);
  assert.equal(corrupted.entries[0].amount, undefined);
});

test('the day function stays a day function — the dependency runs one way only', () => {
  // Specifiers are read off the RAW source: `executableCode` blanks every string literal, so an
  // import specifier in the stripped text is `""` and a `doesNotMatch` against it can never see
  // one. The positive control is the other half — a walker that cannot find an import that DOES
  // exist proves nothing about one that does not.
  const importsOf = (text) => [...text.matchAll(/\bfrom\s*['"]([^'"]+)['"]/g)].map(([, specifier]) => specifier);
  const dayRaw = readFileSync(join(SRC, 'core', 'trisConversionDay.ts'), 'utf8');
  assert.ok(importsOf(RAW).includes('./trisConversionDay.js'), 'the walker cannot see an import that exists');
  assert.ok(importsOf(RAW).includes('./transferBalanceAccount.js'));
  // `trisConversionDay.ts` must not learn about the ledger, and the ledger must not learn about
  // dates of birth or per-stream Settings. This module is the only place the two meet.
  assert.ok(!importsOf(dayRaw).includes('./transferBalanceAccount.js'));
  assert.ok(!importsOf(dayRaw).includes('./trisConversionCredit.js'));
  const ledgerRaw = readFileSync(join(SRC, 'core', 'transferBalanceAccount.ts'), 'utf8');
  assert.ok(!importsOf(ledgerRaw).includes('./trisConversionDay.js'));
  assert.ok(!importsOf(ledgerRaw).includes('./household.js'));
  assert.ok(!importsOf(ledgerRaw).includes('./trisConversionCredit.js'));
});

test('TRIPWIRE — this ships with NO production caller, and that is O57, not coverage', () => {
  // **A finding, recorded as one.** `trisInterestOrRefuse` has no ledger and no dated value in
  // scope, and supplying one would mean inventing a figure — which is the O57 join the register
  // assigns to P4-1 by name. So this function is registered, tested and unreachable from any
  // Household: the O72 / P3-38 pattern, where the register carries the thing and the wiring is
  // someone else's item.
  //
  // **When P4-1 wires it, this test does not get deleted — it gets rewritten** as the assertion
  // that the caller passes the value it actually measured on the conversion day, and O57's row
  // stops saying that nothing joins a stated Retirement Phase interest to a transfer balance
  // account. A deleted tripwire is a residue nobody is tracking any more.
  //
  // **P4-1b part (B) landed on 2026-09-18 and did NOT wire it — recorded here so "P4-1" does not
  // read as discharged by the item's own number.** Part (B) named the forecast window
  // (`src/core/forecastWindow.ts`) and used it to corroborate a stated transfer balance account
  // start day; it created no production caller for anything in this file, and `projection.ts` still
  // imports neither `superPhase.ts` nor the transfer balance modules. **The owner is P4-1b part (A),
  // the ledger join**, which is the change that has a dated value in scope to hand this function.
  const callers = [];
  let filesRead = 0;
  for (const file of sources(SRC)) {
    filesRead += 1;
    if (file.endsWith(join('core', 'trisConversionCredit.ts'))) continue;
    if (/\bcreditTrisConversionUnderItem106\b/.test(readFileSync(file, 'utf8'))) callers.push(file);
  }
  assert.ok(filesRead > 10, `only ${filesRead} sources walked`);
  assert.deepEqual(callers, [], 'a production caller appeared — rewrite this test, and correct O57');
  // The router still drops the day, because it still has nothing to hand this function.
  assert.match(
    readFileSync(join(SRC, 'core', 'trisInterest.ts'), 'utf8'),
    /void trisConversionDayUnderItem106\(dateOfBirth, stated\);/,
  );
  // And the register says so, on this chunk's own ground rather than on the one 6-4 left.
  assert.ok(
    REGISTER.includes('`creditTrisConversionUnderItem106`'),
    'O57 and §3.10.6 must name the function whose absence of a caller they now turn on',
  );
});

// --- The compiler's half of the naming discipline, PROVED rather than claimed -----------------------

/**
 * The scratch-file harness `test/brand-spread-sweep.test.mjs` uses: one file compiled by
 * `tsc --noEmit` against `src/` (not `dist/`, where the types are erased), under the flags of the
 * project build. `lines` gives the 1-based `case.ts` lines that carried a diagnostic, so several
 * independent probes are decided by one invocation.
 */
const tsc = (body) => {
  const dir = mkdtempSync(join(ROOT, '.tsc-tris-credit-'));
  try {
    const file = join(dir, 'case.ts');
    writeFileSync(file, `${body}\n`);
    let output = '';
    let ok = true;
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
    } catch (error) {
      ok = false;
      output = `${error.stdout ?? ''}${error.stderr ?? ''}`;
    }
    return { ok, output, lines: new Set([...output.matchAll(/case\.ts\((\d+),/g)].map(([, line]) => Number(line))) };
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
};

test('MUTATION (tsc) — the dayless balance and the transposed arguments will not COMPILE', () => {
  // Three of this chunk's named mutations are type errors rather than wrong numbers, and a claim
  // that something "will not compile" is worth nothing until `tsc` has said so. Each probe sits on
  // its own line and the two POSITIVE controls sit beside them: a probe set with no line that MUST
  // compile passes vacuously the moment the prelude stops building.
  const prelude = [
    "import { toCents } from '../src/core/money.js';",
    "import { openTransferBalanceLedger, creditOnCommencement } from '../src/core/transferBalanceAccount.js';",
    "import { creditTrisConversionUnderItem106 } from '../src/core/trisConversionCredit.js';",
    "import type { SuperInterest } from '../src/core/household.js';",
    "const ledger = openTransferBalanceLedger('2026-07-01');",
    "const stated = { commencementDay: '2019-09-01' } as const;",
    // `household.ts`'s dayless carrier — a balance measured on no day at all.
    "const interest: SuperInterest = { phase: 'ttr', balance: toCents(1_200_000) };",
  ];
  const probes = [
    // 8 — POSITIVE CONTROL: the honest call compiles.
    "creditTrisConversionUnderItem106(ledger, '1961-07-01', stated, { valueOfSupportingInterestOnTheConversionDay: interest.balance });",
    // 9 — the dayless balance passed positionally, which is the runtime NaN above.
    "creditTrisConversionUnderItem106(ledger, '1961-07-01', stated, interest.balance);",
    // 10 — the field named for the amount rather than for the day.
    "creditTrisConversionUnderItem106(ledger, '1961-07-01', stated, { value: interest.balance });",
    // 11 — POSITIVE CONTROL: the composed call inside the module compiles as written.
    "creditOnCommencement(ledger, { startingDay: '2026-07-01', valueOfSupportingInterestOnStartingDay: interest.balance });",
    // 12 — the day and the value TRANSPOSED into `creditOnCommencement`, which is the mutation the
    // module's one call site could carry and no fixture would see as anything but a wrong number.
    "creditOnCommencement(ledger, { startingDay: interest.balance, valueOfSupportingInterestOnStartingDay: '2026-07-01' });",
  ];
  const { lines, output } = tsc([...prelude, ...probes].join('\n'));
  assert.ok(!lines.has(8), `the honest call must compile:\n${output}`);
  assert.ok(!lines.has(11), `the composed call must compile:\n${output}`);
  assert.ok(lines.has(9), `a dayless balance must not be passable positionally:\n${output}`);
  assert.ok(lines.has(10), `the amount-shaped field name must not compile:\n${output}`);
  assert.ok(lines.has(12), `transposing the day and the value must not compile:\n${output}`);
});

// --- T125: entering the retirement phase is not an act the member chooses --------------------------

test('T125 — a member who does nothing is credited $2,400,000 on their birthday, and breaches by $300,000', () => {
  // §1's T125 row: "a member with a $2.4m TRIS who turns 65 in FY2026-27 and does nothing must show
  // a $2.4m credit on their birthday, an excess transfer balance against the $2,100,000 cap, and —
  // under s 294-40(1)(b) — permanent loss of proportional indexation. A model that only creates
  // credits when the user commences a pension shows this member as compliant forever." The
  // transcriber's note on that row is honoured below: under R1 the excess makes the year a refused
  // year, so what is asserted after the credit is the refusal, not a tax.
  //
  // **Measured 2026-09-16 by O66 batch 3.** Gating the credit on a stated changeover day —
  // `if (stated?.statedTrisConversionDay === undefined) return ledger;`, which is exactly "only
  // create a credit when the user says they did something" — fails five tests, and this fixture is
  // the one that prices it: the difference between crediting and not crediting is a $300,000 excess
  // that is either refused or invisible.
  const settingsStatingNothingAtAll = settings();
  assert.equal(settingsStatingNothingAtAll.statedTrisConversionDay, undefined, 'the member did nothing, which is the fixture');
  assert.equal(settingsStatingNothingAtAll.statedNotificationDay, undefined);
  assert.equal(neverCeased(DOB, SIXTY_FIFTH).grounds.length, 1, 'no item 101, 102A or 103 was satisfied first (T117)');

  const credited = creditTrisConversionUnderItem106(
    openTransferBalanceLedger(SIXTY_FIFTH),
    DOB,
    settingsStatingNothingAtAll,
    { valueOfSupportingInterestOnTheConversionDay: $(2_400_000) },
  );
  assert.equal(credited.entries.length, 1);
  assert.equal(credited.entries[0].day, SIXTY_FIFTH, 'the credit is on the birthday, which nobody chose');
  assert.equal(credited.entries[0].event, ITEM_2);
  assert.equal(closingBalanceOn(SIXTY_FIFTH, credited), $(2_400_000));

  // The seeding cap for an account that starts on 1 July 2026 is the FY2026-27 general cap.
  const seed = seedPersonalTransferBalanceCap(SIXTY_FIFTH);
  assert.equal(seed.fy, '2026-27');
  assert.equal(seed.cap, $(2_100_000));

  // And closing the birthday against it is the refusal — $2,400,000 − $2,100,000 = $300,000.
  let message = '';
  assert.throws(
    () => openTransferBalanceAccountDays(SIXTY_FIFTH, seed.cap, closingBalanceOn(SIXTY_FIFTH, credited)),
    (error) => {
      message = error.message;
      return error instanceof TransferBalanceCapExceededError;
    },
  );
  assert.match(message, /\$2,400,000\.00/);
  assert.match(message, /\$2,100,000\.00/);
  assert.match(message, /by \$300,000\.00/);
  // The second consequence, which is T114's and is the reason this member cannot be left uncredited:
  // the refusal is the only thing standing between "does nothing" and a permanent loss.
  assert.match(message, /s 294-40\(1\)\(b\)/);
  assert.match(message, /permanently\s+disqualifies/);

  // The control, and it is the whole trap: a model that waits for the member to act sees an empty
  // ledger, a $0 balance and no breach at all — compliant forever, on the same facts.
  const uncredited = openTransferBalanceLedger(SIXTY_FIFTH);
  assert.equal(closingBalanceOn(SIXTY_FIFTH, uncredited), 0);
  assert.doesNotThrow(() => openTransferBalanceAccountDays(SIXTY_FIFTH, seed.cap, closingBalanceOn(SIXTY_FIFTH, uncredited)));
});
