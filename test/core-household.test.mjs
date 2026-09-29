// P3-14 — `HomeStatus` and the `protectedAssets` / `assessableAssets` split, and the
// classification half of P3-13, the younger-partner accumulation exemption.
//
// Every Household below is synthetic and obviously fake: round numbers, placeholder names.
import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { toCents } from '../dist/core/money.js';
import {
  AGE_PENSION_AGE,
  ageAt,
  assertIsoDate,
  hasReachedAgePensionAge,
  homeTreatment,
  isCouple,
  splitAssets,
} from '../dist/core/household.js';

const SRC = resolve(dirname(fileURLToPath(import.meta.url)), '..', 'src');

/** Every `.ts` file under `src/`, discovered rather than listed — a new module must not hide. */
const walk = function* (dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(path);
    else if (entry.name.endsWith('.ts')) yield path;
  }
};

/**
 * The scratch-file harness `test/brand-spread-sweep.test.mjs` uses: a file compiled by
 * `tsc --noEmit` against `src/` — not `dist/`, where the types are erased — under the flags of the
 * project build. `lines` is the set of 1-based line numbers that carried a diagnostic, so one
 * invocation decides several independent probes at once.
 */
const typecheck = (body) => {
  const root = resolve(SRC, '..');
  const dir = mkdtempSync(join(root, '.tsc-household-'));
  try {
    const file = join(dir, 'case.ts');
    writeFileSync(file, `${body}\n`);
    let output = '';
    try {
      execFileSync(
        process.execPath,
        [
          join(root, 'node_modules', 'typescript', 'bin', 'tsc'),
          '--noEmit',
          '--strict',
          '--target', 'ES2022',
          '--module', 'nodenext',
          '--moduleResolution', 'nodenext',
          '--verbatimModuleSyntax',
          '--noUncheckedIndexedAccess',
          file,
        ],
        { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] },
      );
    } catch (error) {
      output = `${error.stdout ?? ''}${error.stderr ?? ''}`;
    }
    return { lines: new Set([...output.matchAll(/case\.ts\((\d+),/g)].map(([, line]) => Number(line))), output };
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
};

const relativeToSrc = (path) => path.slice(SRC.length + 1).replaceAll('\\', '/');

const person = (name, dateOfBirth, overrides = {}) => ({
  name,
  dateOfBirth,
  superInterests: [],
  parcels: [],
  employmentIncomePerFortnight: toCents(0),
  workBonusBalance: toCents(0),
  ...overrides,
});

// Alex is 71 on the fixture dates; Blair turns 67 on 2026-11-15. Both inside the register's
// documented parameter window, so the cliff is testable end to end in P3-11's tests.
const ALEX = person('Alex', '1955-01-01', {
  superInterests: [{ phase: 'accountBasedPension', balance: toCents(300_000) }],
});
const BLAIR = person('Blair', '1959-11-15', {
  superInterests: [{ phase: 'accumulation', balance: toCents(600_000) }],
});

const household = (persons, homeStatus = 'occupied') => ({ persons, homeStatus });

// One parcel of a Non-Super Portfolio (P3-21f chunk 1). The cost base is NOT the market value: no
// figure in this file may read a cost base, and a fixture where the two agree could not show it.
const ALEX_PARCEL = { acquired: '2015-03-02', costBase: toCents(60_000), marketValue: toCents(250_000) };

test('age is computed from parameters, never from the clock', () => {
  assert.equal(ageAt('1959-11-15', '2026-11-14'), 66);
  assert.equal(ageAt('1959-11-15', '2026-11-15'), 67);
  assert.equal(ageAt('1959-11-15', '2026-11-16'), 67);
  assert.equal(ageAt('1959-01-01', '2026-12-31'), 67);
  assert.equal(AGE_PENSION_AGE, 67, 'register §4.9 — 67, and no further increase is legislated');

  // A non-padded date would compare wrongly against '2026-03-20' and is refused at the boundary.
  assert.throws(() => assertIsoDate('2026-3-5'), RangeError);
  assert.throws(() => ageAt('1959-11-15', '2026-11-5'), RangeError);
});

test('the exemption ends on the birthday, to the day', () => {
  assert.equal(hasReachedAgePensionAge(BLAIR, '2026-11-14'), false);
  assert.equal(hasReachedAgePensionAge(BLAIR, '2026-11-15'), true);
  assert.equal(hasReachedAgePensionAge(ALEX, '2026-11-14'), true);
});

test('T27 — a Person under Age Pension age has their Accumulation Phase super exempt from both tests', () => {
  const before = splitAssets(household([ALEX, BLAIR]), '2026-11-14');
  assert.equal(before.protectedAssets, toCents(600_000));
  assert.equal(before.assessableAssets, toCents(300_000));
  // Exempt from BOTH tests, so it is not a deemed financial asset either.
  assert.equal(before.deemedFinancialAssets, toCents(300_000));

  const after = splitAssets(household([ALEX, BLAIR]), '2026-11-15');
  assert.equal(after.protectedAssets, toCents(0));
  assert.equal(after.assessableAssets, toCents(900_000));
  assert.equal(after.deemedFinancialAssets, toCents(900_000));
});

test('T27 — a TTR destroys the exemption at any age, and the exemption never runs past 67', () => {
  const onTtr = { ...BLAIR, superInterests: [{ phase: 'ttr', balance: toCents(600_000) }] };
  // Blair is 66 here. Under the accumulation rule the balance would be Protected.
  const split = splitAssets(household([ALEX, onTtr]), '2026-11-14');
  assert.equal(split.protectedAssets, toCents(0));
  assert.equal(split.assessableAssets, toCents(900_000));

  // And an Account-Based Pension is assessed at any age too — the exemption is Accumulation only.
  const onAbp = { ...BLAIR, superInterests: [{ phase: 'accountBasedPension', balance: toCents(600_000) }] };
  assert.equal(splitAssets(household([ALEX, onAbp]), '2026-11-14').assessableAssets, toCents(900_000));

  // Ending the exemption at 65 or at Preservation Age (60) would make these Protected. They are not.
  const younger = person('Blair', '1963-11-15', { superInterests: [{ phase: 'ttr', balance: toCents(600_000) }] });
  assert.equal(ageAt(younger.dateOfBirth, '2026-11-14'), 62);
  assert.equal(splitAssets(household([ALEX, younger]), '2026-11-14').assessableAssets, toCents(900_000));
});

test('the exemption is not a couple-only rule — it turns on the owner, phase by phase', () => {
  const mixed = person('Blair', '1959-11-15', {
    superInterests: [
      { phase: 'accumulation', balance: toCents(600_000) },
      { phase: 'ttr', balance: toCents(50_000) },
    ],
  });
  const split = splitAssets(household([ALEX, mixed]), '2026-11-14');
  assert.equal(split.protectedAssets, toCents(600_000));
  assert.equal(split.assessableAssets, toCents(350_000));
});

test('every asset line carries the reason it landed on its side of the split', () => {
  const split = splitAssets(household([ALEX, BLAIR]), '2026-11-14');
  assert.equal(split.lines.length, 2);
  for (const line of split.lines) {
    assert.ok(line.reason.length > 20, 'a split with no stated reason is not auditable');
    assert.ok(['protected', 'assessable'].includes(line.treatment));
  }
  assert.equal(split.lines.find((line) => line.owner === 'Blair').treatment, 'protected');
});

test('P3-21f chunk 1 — the portfolio reaches the split as ONE line, at the sum of its parcels', () => {
  const holder = person('Alex', '1955-01-01', {
    superInterests: [{ phase: 'accountBasedPension', balance: toCents(300_000) }],
    parcels: [ALEX_PARCEL, { acquired: '2021-08-19', costBase: toCents(30_000), marketValue: toCents(50_000) }],
  });
  const split = splitAssets(household([holder, BLAIR]), '2026-11-14');
  const portfolio = split.lines.filter((line) => line.description === 'Financial investments outside superannuation');

  // One line, not one per parcel: nothing in the assets test or in deeming turns on which parcel a
  // dollar sits in, and the figure is the same figure the stored scalar produced before chunk 1.
  assert.equal(portfolio.length, 1);
  assert.equal(portfolio[0].amount, toCents(300_000));
  assert.equal(portfolio[0].owner, 'Alex');
  assert.equal(portfolio[0].treatment, 'assessable');
  assert.equal(portfolio[0].deemed, true);
  // Assessable and deemed from the first dollar, on top of Alex's $300,000 pension.
  assert.equal(split.assessableAssets, toCents(600_000));
  assert.equal(split.deemedFinancialAssets, toCents(600_000));
  assert.equal(split.protectedAssets, toCents(600_000));

  // The $90,000 of cost base across the two parcels reaches NOTHING here. Swapping it for any other
  // figure leaves the whole split byte-identical — a cost base is a CGT input, never a means-test one.
  const different = person('Alex', '1955-01-01', {
    superInterests: [{ phase: 'accountBasedPension', balance: toCents(300_000) }],
    parcels: holder.parcels.map((parcel) => ({ ...parcel, costBase: toCents(1) })),
  });
  assert.deepEqual(splitAssets(household([different, BLAIR]), '2026-11-14'), split);

  // A Person holding no parcels emits no line at all — the empty pool is the expected state
  // (ADR-0009) and it is silent, exactly as the zero scalar was.
  assert.deepEqual(
    splitAssets(household([ALEX, BLAIR]), '2026-11-14').lines.map((line) => line.description),
    ['Account-Based Pension', 'Superannuation, Accumulation Phase'],
  );
});

test('ADR-0005 — the home is a status, and every status resolves without a value', () => {
  assert.deepEqual(homeTreatment('occupied'), { homeowner: true, principalHomeExempt: true });
  assert.deepEqual(homeTreatment('vacatedProtectedPersonRemains'), { homeowner: true, principalHomeExempt: true });
  assert.deepEqual(homeTreatment('vacatedWithinTwoYearExemption'), { homeowner: true, principalHomeExempt: true });
  // P14-5a (2026-09-25): past the cliff the recipient is a non-homeowner too (SS Act s 11A(9)(b) /
  // DSS Guide 4.6.3.70 — "the income support recipient is treated as a non-homeowner, AND principal
  // home is an assessable asset"). Was `homeowner: true` before this correction.
  assert.deepEqual(homeTreatment('vacatedBeyondTwoYearExemption'), { homeowner: false, principalHomeExempt: false });
  assert.deepEqual(homeTreatment('noHome'), { homeowner: false, principalHomeExempt: false });
});

test('T26 — the homeowner flag is what selects the free area, and the home contributes no value', () => {
  for (const status of ['occupied', 'vacatedProtectedPersonRemains', 'vacatedWithinTwoYearExemption']) {
    const split = splitAssets(household([ALEX, BLAIR], status), '2026-11-14');
    assert.equal(split.homeowner, true);
    assert.equal(split.homeIsProtectedButUnvalued, true);
    assert.equal(split.homeIsAssessableButUnvalued, false);
    // The home is Protected, and Protected Assets is $600,000 — Blair's exempt super and nothing
    // else. If a home value could reach the split it would have to show up here.
    assert.equal(split.protectedAssets, toCents(600_000));
    assert.equal(split.assessableAssets, toCents(300_000));
  }

  const nonHomeowner = splitAssets(household([ALEX, BLAIR], 'noHome'), '2026-11-14');
  assert.equal(nonHomeowner.homeowner, false);
  assert.equal(nonHomeowner.assessableAssets, toCents(300_000));
});

test('ADR-0005 / T42 — no home value exists anywhere in the means-test path', () => {
  // The Household type has no field for it, so a fixture cannot supply one; and the source files
  // never name it. This is the structural enforcement, asserted rather than assumed.
  //
  // ⚠️ **NARROWED 2026-09-17 by P3-21f chunk 1, on its own stated ground and no wider.** The
  // canary used to forbid the identifier `marketValue` outright in all four files. A `Parcel` has a
  // market value — it is the money the Non-Super Portfolio is worth, and the CGT gain is measured
  // against it (ADR-0009: *"nothing here gives the means test a path to a house price"*, and a
  // parcel is a different pool with a different treatment). So the blanket ban is retired for
  // `household.ts` ALONE and is replaced, not dropped, by a pin on the exact set of code lines that
  // may name one. A home value added to this file — `homeValue`, or a `marketValue` on the home,
  // the Household or a Person — is a line not in the set, and fails. The other three files keep the
  // blanket ban: nothing downstream of the split has any business naming a value of any kind.
  const stripped = (file) => {
    let text;
    try {
      text = readFileSync(join(SRC, file), 'utf8');
    } catch {
      return undefined; // written in a later commit of this task
    }
    // Comments name the trap by name, so the grep has to read the code and not the prose.
    return text.replaceAll(/\/\*[\s\S]*?\*\//g, '').replaceAll(/\/\/.*$/gm, '');
  };

  for (const file of ['core/agePension.ts', 'core/deeming.ts', 'core/workBonus.ts']) {
    const code = stripped(file);
    if (code === undefined) continue;
    assert.doesNotMatch(code, /marketValue|homeValue/i, `${file} must never read a home value`);
  }

  const household = stripped('core/household.ts');
  assert.doesNotMatch(household, /homeValue/i, 'core/household.ts must never read a home value');
  assert.deepEqual(
    household.split('\n').filter((line) => /marketValue/i.test(line)).map((line) => line.trim()),
    [
      'readonly marketValue: Cents;',
      "['marketValue', parcel.marketValue],",
      'return parcel.marketValue;',
    ],
    'core/household.ts names a market value somewhere new — if it is a HOME value, ADR-0005 is broken',
  );
  // And the pin is not vacuous: every one of those lines is about a PARCEL, and the only type that
  // holds one is `Parcel`, whose fields are exactly these three.
  assert.deepEqual(Object.keys(ALEX_PARCEL).sort(), ['acquired', 'costBase', 'marketValue']);
});

test('a single-Person Household is not a couple, and the shape says so', () => {
  assert.equal(isCouple(household([ALEX])), false);
  assert.equal(isCouple(household([ALEX, BLAIR])), true);
});

// --- The per-stream stated carrier (P3-9 chunk 5b-2) -----------------------------------------------
//
// Register ~2515's per-stream block: each stream's commencement day; the TRIS conversion day and,
// on the 101/102A/103 route, the notification day; the Schedule 1 item; the reversionary flag
// (already built, on `DeclaredRecipient`); and each above-minimum withdrawal's characterisation.
//
// This chunk adds the SHAPE and nothing else — no resolution, no refusal, no computation. So the
// tests are about the shape: that the facts are facts and not flags, that the types are the ones
// the other two modules already declare rather than second spellings of them, and that the fields
// are optional so that the fifteen `Person` literals in the Age Pension and Work Bonus fixtures
// stay valid.

const HOUSEHOLD_SOURCE = readFileSync(join(SRC, 'core', 'household.ts'), 'utf8');

/** Comments quote the register at length; these greps are about the code. */
const householdCode = HOUSEHOLD_SOURCE.replaceAll(/\/\*[\s\S]*?\*\//g, '').replaceAll(/\/\/.*$/gm, '');

test('the per-stream Settings are optional, so every existing fixture is still a Person', () => {
  // `statedStreamSettings` absent is the third state — nobody was asked — exactly as
  // `statedPriorRetirementPhase` absent is. The device is the same one, not a second convention.
  assert.match(householdCode, /readonly statedStreamSettings\?: StatedStreamSettings;/);
  assert.match(householdCode, /readonly statedPriorRetirementPhase\?: StatedPriorRetirementPhase;/);
  // Every fixture in this file is built without it and still splits, which is the regression the
  // optionality is protecting: a required field here would have had to be answered by fifteen
  // Person literals that have nothing to do with Div 294.
  for (const person of [ALEX, BLAIR]) {
    assert.equal('statedStreamSettings' in person.superInterests[0], false);
  }
  assert.ok(splitAssets(household([ALEX, BLAIR]), '2026-07-01').assessableAssets >= 0);
});

test('MUTATION — no boolean stands in for a day, an item or a characterisation', () => {
  // A boolean has no way to say "nobody asked", so it arrives as `false` and answers the question
  // in the flattering direction. Every member of the carrier is a day, an identification or a
  // named characterisation; none is a `boolean`, and this fails if one becomes one.
  const body = /export interface StatedStreamSettings \{([\s\S]*?)\n\}/.exec(householdCode)?.[1] ?? '';
  assert.ok(body.includes('commencementDay'), 'the interface was not found — the greps below would be vacuous');
  const members = [...body.matchAll(/readonly (\w+)(\??): ([\w<>[\] |'-]+);/g)].map(([, name, optional, type]) => ({
    name,
    optional: optional === '?',
    type,
  }));
  assert.deepEqual(members, [
    { name: 'commencementDay', optional: false, type: 'IsoDate' },
    { name: 'statedTrisConversionDay', optional: true, type: 'IsoDate' },
    { name: 'statedNotificationDay', optional: true, type: 'IsoDate' },
    { name: 'statedSchedule1Item', optional: true, type: 'Schedule1ItemIdentification' },
    { name: 'statedWithdrawalCharacterisation', optional: true, type: 'WithdrawalCharacterisation' },
    // 2026-09-23: a rate, not a flag — and absent means the Schedule 7 minimum, not "no payment".
    { name: 'statedTtrDrawdownRate', optional: true, type: 'number' },
  ]);
  // **A COUNT as well as the list**, because the matcher above is type-shaped: a member whose type
  // carries a character outside its class — `Readonly<{ notified: boolean }>` — produces no match
  // at all and the `deepEqual` still sees exactly the five expected entries.
  assert.equal([...body.matchAll(/\breadonly \w+\??:/g)].length, 6, 'StatedStreamSettings gained or lost a member');
  assert.doesNotMatch(body, /\bboolean\b/);
});

test('MUTATION — exactly one declaration of the two borrowed types exists in src/', () => {
  // The failure this is about is not a wrong number, it is two incompatible types for one register
  // row. `household.ts` imports both rather than restating them, and a second declaration anywhere
  // in `src/` — under this name or an obvious variant of it — fails here.
  const declarations = (pattern) => {
    const found = [];
    for (const file of walk(SRC)) {
      const text = readFileSync(file, 'utf8').replaceAll(/\/\*[\s\S]*?\*\//g, '').replaceAll(/\/\/.*$/gm, '');
      for (const [, kind, name] of text.matchAll(/\b(?:export )?(type|interface|enum) (\w+)\b/g)) {
        if (pattern.test(name)) found.push(`${relativeToSrc(file)}: ${kind} ${name}`);
      }
    }
    return found.sort();
  };
  assert.deepEqual(declarations(/characterisation/i), ['core/transferBalanceAccount.ts: type WithdrawalCharacterisation']);
  // `Schedule1CashingItem` in the assumptions is NOT a second spelling and is listed here rather
  // than excluded by a narrower pattern: it is the register ROW — three strings, columns 1 to 3 —
  // which `Schedule1ItemIdentification` quotes back alongside the day, the ground and a
  // provenance. A third name appearing beside these two is what this fails on.
  assert.deepEqual(declarations(/schedule.?1|scheduleone/i), [
    'core/conditionOfRelease.ts: interface Schedule1ItemIdentification',
    'data/assumptions/super.ts: interface Schedule1CashingItem',
  ]);
  // And `household.ts` reaches them by import, which is what makes the single declaration binding
  // rather than coincidental.
  assert.match(householdCode, /import type \{ Schedule1ItemIdentification \} from '\.\/conditionOfRelease\.js';/);
  assert.match(householdCode, /import type \{ WithdrawalCharacterisation \} from '\.\/transferBalanceAccount\.js';/);
});

test('the carrier has exactly ONE reader, and P4-1 chunk 5b is it', () => {
  // **This assertion used to read `deepEqual(readers, [])`** — *"nothing computes from the new
  // carrier yet; it is a shape, not a behaviour"* — which was true from 5b-2 (2026-09-16) until
  // P4-1 chunk 5b (2026-09-17). It was written as an ABSENCE precisely so that it would go RED when
  // somebody built the first reader, rather than going quiet, and that is what happened.
  //
  // What it defends now is narrower and still worth defending: the fields are read in ONE place. A
  // second reader is a second answer to what silence means — and silence here is *nobody was asked*,
  // not a default — so a new name in this list is a question to be answered, not a diff to be
  // accepted. `projection.ts` reads `commencementDay` alone, and refuses to guess it where absent.
  //
  // **Two lists, since P8 (2026-09-19), and the reason is that the second one exists at all.**
  // `core/parsePlan.ts` MENTIONS all five members — it is the plan-file validator, and a field it
  // does not name is a field it would refuse the file over. It READS none of them: every mention
  // is a string key or a `${path}.statedStreamSettings` trail inside a literal, it copies what is
  // there, and it leaves an absent member absent. So it answers nothing about what silence means,
  // which is the thing this test defends. Stripping literals is what separates the two, and BOTH
  // lists are pinned: a third file mentioning the carrier at all still fails here.
  const stripped = (text) => text
    .replaceAll(/\/\*[\s\S]*?\*\//g, '')
    .replaceAll(/\/\/.*$/gm, '');
  // ⚠️ **The literal strip must understand an ESCAPED QUOTE, and it did not until P8-5.** The
  // naive `/'[^']*'/` form terminates early on `person\'s` — which `app/planEdits.ts` has had
  // inside `LUMP_SUM_ENTRY_NOTICE` since P6-6c — mis-pairs every quote after it and swallows the
  // rest of the file, so a genuine occurrence in the code below it reads as ZERO. That is a
  // derivation that fails OPEN: the list it produces is short, the `deepEqual` passes, and
  // nothing says why. One alternation per quote style, each allowing `\\.`, and the vacuity
  // controls below are what prove the strip still leaves real code standing.
  const withoutLiterals = (text) => stripped(text)
    .replaceAll(/`(?:[^`\\]|\\.)*`/g, '``')
    .replaceAll(/'(?:[^'\\]|\\.)*'/g, "''")
    .replaceAll(/"(?:[^"\\]|\\.)*"/g, '""');

  //
  // **THREE lists, since P8-5 (2026-09-19), and the reason is the same one that made it two.**
  // `app/settingsPanel.ts`'s household editor rebuilds every `SuperInterest` out of two boxes, so
  // `app/planEdits.ts` has to CARRY the carrier: it copies `statedStreamSettings` from the nth
  // interest of the nth Person onto the nth interest it builds, and leaves it absent where it was
  // absent. That is a move, not a reading — it takes no member and it decides nothing about what
  // silence means — so widening `readers` to admit it would have thrown away the very distinction
  // this test exists for. `readers` is therefore narrowed to files that take a MEMBER off the
  // carrier (`.statedStreamSettings?.commencementDay`), which is the act that answers the silence
  // question, and the file that merely moves the object whole is pinned in its own list. All
  // three ratchet: a new name in any of them fails here.
  const readers = [];
  const carriers = [];
  const mentions = [];
  for (const file of walk(SRC)) {
    const text = readFileSync(file, 'utf8');
    if (/\.statedStreamSettings\b/.test(stripped(text))) mentions.push(relativeToSrc(file));
    if (/\.statedStreamSettings\b/.test(withoutLiterals(text))) carriers.push(relativeToSrc(file));
    if (/\.statedStreamSettings\s*\??\.\w/.test(withoutLiterals(text))) readers.push(relativeToSrc(file));
  }
  // ⚠️ **`app/planEdits.ts` joined `readers` on 2026-09-23 (TTR build step 2)**, and it is the
  // question this list exists to ask, answered: it takes `commencementDay` and
  // `statedTtrDrawdownRate` off the carrier to fill the two TTR boxes, and maps silence to an EMPTY
  // BOX in both cases — never to a day or a rate — and an empty box writes the key back absent. So
  // it gives silence no meaning of its own; it shows it. Its member set is pinned below.
  // ⚠️ **`app/retireChoice.ts` joined all three on 2026-09-29 (retire flow S1)**, answered the same
  // way: it takes `commencementDay` alone, to offer the TTR answer only for a TTR already running at
  // the plan's date, and maps silence to "not running", so the answer is refused and nothing is
  // written. That is the walk's own reading (it refuses to guess an absent day), never a day.
  assert.deepEqual(readers, ['app/planEdits.ts', 'app/retireChoice.ts', 'core/projection.ts']);
  assert.deepEqual(carriers, ['app/planEdits.ts', 'app/retireChoice.ts', 'core/projection.ts']);
  assert.deepEqual(mentions, ['app/planEdits.ts', 'app/retireChoice.ts', 'core/parsePlan.ts', 'core/projection.ts']);
  assert.deepEqual(
    [...readFileSync(join(SRC, 'app', 'retireChoice.ts'), 'utf8').matchAll(/\.statedStreamSettings\.(\w+)/g)].map(([, member]) => member),
    ['commencementDay'],
    'the Retire answer reads a new member of the carrier',
  );
  // The carrier that is NOT a reader takes no member off it: it copies the whole object or it
  // writes nothing. This is what keeps the two lists meaning different things.
  const edits = withoutLiterals(readFileSync(join(SRC, 'app', 'planEdits.ts'), 'utf8'));
  assert.match(edits, /\.statedStreamSettings\b/, 'the vacuity control for the carrier list');
  assert.deepEqual(
    [...edits.matchAll(/\.statedStreamSettings\?\.(\w+)( \?\? ''|, fractionAsPercent)/g)].map(([, member, absent]) => `${member}${absent}`),
    ["commencementDay ?? ''", 'statedTtrDrawdownRate, fractionAsPercent'],
    'the household editor reads a new member of the carrier, or no longer maps an absent one to an empty box',
  );
  assert.equal([...edits.matchAll(/\.statedStreamSettings\s*\??\.\w/g)].length, 2);
  assert.match(edits, /const feeBox = \(stated: number \| undefined, show: \(value: number\) => string\): string =>\s*\(stated === undefined \? '' : show\(stated\)\);/);
  // Vacuity control on the strip: it must not have deleted the reader it is meant to leave standing.
  assert.match(withoutLiterals(readFileSync(join(SRC, 'core', 'projection.ts'), 'utf8')), /\.statedStreamSettings\?\./);

  // And it reads the TWO members it has a rule for. The other four are still unread: R13's
  // resolution, the notification day, the Schedule 1 item and the withdrawal characterisation all
  // have their own owners, and none of them is the Income Waterfall. The second member arrived on
  // 2026-09-23 — `statedTtrDrawdownRate`, read at the one TTR determination, where absence has a
  // rule of its own (the Schedule 7 minimum is paid) rather than a default. `parsePlan.ts` now
  // takes that member off its own parsed local to refuse it on a non-TTR interest; it reaches it
  // through the local, not through `.statedStreamSettings`, so it stays out of `readers` above, and
  // it answers only whether the file may state it, not what its silence means.
  const projection = readFileSync(join(SRC, 'core', 'projection.ts'), 'utf8')
    .replaceAll(/\/\*[\s\S]*?\*\//g, '')
    .replaceAll(/\/\/.*$/gm, '');
  assert.deepEqual(
    [...new Set([...projection.matchAll(/\.statedStreamSettings\?\.(\w+)/g)].map(([, member]) => member))],
    ['commencementDay', 'statedTtrDrawdownRate'],
  );
});

test('the shape is enforced by the compiler, not only by the greps above', () => {
  // The greps read `household.ts` as text. This reads it as TYPES, which is the defence that
  // actually holds: every `Person` fixture in this suite is `.mjs` and could not fail to construct
  // however required the new field became, so "the fixtures still build" has to be asked of `tsc`.
  //
  // One invocation, four probes, each one line, decided by which line numbers carry a diagnostic.
  const probes = [
    // 1 — a SuperInterest with no stated settings at all: the fifteen existing Person literals.
    `const a: SuperInterest = { phase: 'accumulation', balance: 0 as Cents };`,
    // 2 — the commencement day alone, every other member silent.
    `const b: SuperInterest = { phase: 'ttr', balance: 0 as Cents, statedStreamSettings: { commencementDay: '2026-07-01' as IsoDate } };`,
    // 3 — a boolean where the characterisation goes. Must NOT compile.
    `const c: StatedStreamSettings = { commencementDay: '2026-07-01' as IsoDate, statedWithdrawalCharacterisation: true };`,
    // 4 — settings with no commencement day: a statement about a stream that names no stream.
    `const d: StatedStreamSettings = { statedTrisConversionDay: '2026-07-01' as IsoDate };`,
  ];
  const body = [
    `import type { Cents } from '${join(SRC, 'core', 'money.js').replaceAll('\\', '/')}';`,
    `import type { IsoDate } from '${join(SRC, 'data', 'assumptions', 'types.js').replaceAll('\\', '/')}';`,
    `import type { StatedStreamSettings, SuperInterest } from '${join(SRC, 'core', 'household.js').replaceAll('\\', '/')}';`,
    ...probes,
    `void [a, b, c, d];`,
  ].join('\n');
  const first = body.split('\n').length - probes.length - 1;
  const { lines, output } = typecheck(body);
  assert.equal(lines.has(first + 1), false, `an interest with no stated settings must still compile:\n${output}`);
  assert.equal(lines.has(first + 2), false, `the commencement day alone must compile:\n${output}`);
  assert.equal(lines.has(first + 3), true, 'a boolean characterisation must not compile');
  assert.equal(lines.has(first + 4), true, 'settings without a commencement day must not compile');
});
