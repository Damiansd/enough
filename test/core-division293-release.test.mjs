// P6-10 M2 — `division293ReleaseDestination`: which interest a Division 293 release authority is
// served on, or the fact that there is no election (register O84).
//
// **⚠️ THE ONE DEFECT THIS WHOLE CHUNK EXISTS TO PREVENT, and §1 is built around it.** The sibling
// resolver `superGuaranteeDestination` resolves a SILENT Person holding one accumulation interest
// BY DERIVATION — the employer pays somewhere. Doing the same here would invent a Subdiv 293-B
// election nobody made and re-open O84 in the OPPOSITE direction: the charge taken out of super for
// a Person who would really have paid it in cash, understating the super that is means-test exempt
// below Age Pension age and overstating the deemed Offset cash. M1 could only defend that at the
// DOOR (11 kills, `test/core-parse-plan.test.mjs` §3c); this file is where the RESOLVER-level form
// of it first becomes expressible, and every test in §1 is behavioural — the function is pure, so a
// direct call IS its behaviour.
//
// The sections:
//   §1 silence is never derived — no interests, one accumulation interest, three of them;
//   §2 an election is read, at its own position and by object identity;
//   §3 the two illegal shapes refuse, mirroring `parsePlan.ts`'s door for the in-memory `project()`
//      caller who never passed through it (O81, and `superGuaranteeDestination`'s own precedent);
//   §4 the two results cannot be collapsed — behaviourally by their tag, and at the type level by a
//      `tsc --noEmit` probe with a positive control;
//   §5 ⚠️ SOURCE PINS. M2's "the resolver has NO caller under `src/`" RETIRED at M3, which gave
//      it one, and is replaced by a COUNT — exactly one reader, and it is the walk; and no
//      `??`/`||` fallback sits beside the field anywhere.
import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { division293ReleaseDestination } from '../dist/core/division293Release.js';
import { DEMO_PLAN } from '../dist/app/demoHousehold.js';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = join(ROOT, 'src');

const thrown = (fn) => {
  try { fn(); } catch (error) { return error; }
  return assert.fail('nothing was thrown');
};

/**
 * A Person with the interests given. **Synthetic and labelled as such**: the balances below are
 * round test numbers and not this Household's, and the resolver reads neither them nor the date of
 * birth — only `name` and `superInterests`. The demo Household's own Persons are used unmodified in
 * §1 and §5, where the claim is about the file on disk rather than about a shape.
 */
const personWith = (interests, name = 'Test Person') => ({
  name,
  dateOfBirth: '1975-04-11',
  superInterests: interests,
  parcels: [],
});

const accumulation = (extra = {}) => ({ phase: 'accumulation', balance: 100_000_00, ...extra });
const elects = { statedReleaseAuthorityDestination: 'division293' };

// --- §1 SILENCE IS NEVER DERIVED ------------------------------------------------------------------

test('a Person holding ONE accumulation interest and electing nothing has NO ELECTION', () => {
  // ⚠️ **MUTATION (1)'s target.** This is precisely the input on which the Guarantee's resolver
  // DERIVES — one candidate, no nomination — and the answer here is the opposite one. A resolver
  // that fell back to the sole accumulation interest would pass every other test in this file.
  const result = division293ReleaseDestination(personWith([accumulation()], 'Dana'));
  assert.equal(result.election, 'none');
  assert.ok(!Object.hasOwn(result, 'interest'), 'silence was resolved to an interest');
  assert.ok(!Object.hasOwn(result, 'slot'), 'silence was resolved to a position');
  // The reason is the sentence M3 reports when it takes the charge out of cash, and it says which
  // fact it is stating: a default, not a missing account.
  assert.match(result.reason, /Dana/);
  assert.match(result.reason, /Subdiv 293-B/);
  assert.match(result.reason, /paid out of their own cash/);
  assert.match(result.reason, /not an unstated account/);
});

test('THREE accumulation interests and no election is the SAME answer, not a harder question', () => {
  // The Guarantee's resolver REFUSES this shape (O82: "the larger one" and "the first one" are both
  // guesses). Here there is nothing to guess between, because nothing is being chosen: the Person
  // declined the election, and how many funds they hold does not bear on it. A resolver that
  // refused here would be treating silence as an unanswered question again — the same defect
  // wearing the other face.
  const result = division293ReleaseDestination(personWith([
    accumulation({ balance: 10_000_00 }),
    accumulation({ balance: 900_000_00 }),
    accumulation({ balance: 50_000_00 }),
  ]));
  assert.equal(result.election, 'none');
  assert.ok(!Object.hasOwn(result, 'interest'));
});

test('a Person holding NO interest at all has no election, and it is not an error', () => {
  // There is no seventh kind of absence: the field lives ON an interest, so such a Person has
  // nowhere to state it. Refusing here would refuse every Person with no super.
  const result = division293ReleaseDestination(personWith([]));
  assert.equal(result.election, 'none');
});

test('a retirement-phase interest that elects NOTHING is no election — not a refusal', () => {
  // The refusal in §3 is the ELECTION on such an interest, never the interest's existence. This is
  // the vacuity control for that refusal, run from this side.
  for (const phase of ['accountBasedPension', 'ttr']) {
    assert.equal(division293ReleaseDestination(personWith([{ phase, balance: 400_000_00 }])).election, 'none');
  }
});

test('EVERY Person in the demo Household has no election — the state of every plan file on disk', () => {
  const results = DEMO_PLAN.household.persons.map((person) => division293ReleaseDestination(person));
  assert.ok(results.length > 0, 'the demo Household holds no Persons, so this proves nothing');
  assert.deepEqual(results.map(({ election }) => election), results.map(() => 'none'));
  // The vacuity control: one of them really does hold exactly one accumulation interest, which is
  // the input the derivation defect needs. Without this the test above could be passing because no
  // Person here could have been mis-derived in the first place.
  assert.ok(
    DEMO_PLAN.household.persons.some((person) =>
      person.superInterests.filter(({ phase }) => phase === 'accumulation').length === 1),
    'no demo Person holds a single accumulation interest, so the derivation defect is unreachable here',
  );
});

// --- §2 An election is read, at its own position ---------------------------------------------------

test('exactly one accumulation interest marked resolves to THAT interest', () => {
  const interests = [accumulation({ ...elects, balance: 250_000_00 })];
  const result = division293ReleaseDestination(personWith(interests));
  assert.equal(result.election, 'released');
  assert.equal(result.slot, 0);
  assert.equal(result.interest, interests[0], 'the interest is a copy, not the one that was marked');
});

test('⚠️ the MARKED interest is resolved, not the first one — the mark is at position 2 of 3', () => {
  // **MUTATION (2)'s target.** A one-interest fixture cannot separate "the marked one" from "the
  // first one", so this fixture puts them at different positions on purpose, and the balances
  // differ so that a wrong resolution is visible in the figure as well as in the slot.
  const interests = [
    accumulation({ balance: 10_000_00 }),
    accumulation({ balance: 20_000_00 }),
    accumulation({ ...elects, balance: 30_000_00 }),
  ];
  const result = division293ReleaseDestination(personWith(interests));
  assert.equal(result.election, 'released');
  assert.equal(result.slot, 2);
  assert.equal(result.interest.balance, 30_000_00);
  assert.equal(result.interest, interests[2]);
});

test('the mark is read past retirement-phase interests, and the slot is the position in the whole list', () => {
  // A slot counted over the ACCUMULATION interests alone would be 0 here and would debit the
  // pension. The position is into `person.superInterests` entire.
  const interests = [
    { phase: 'accountBasedPension', balance: 800_000_00 },
    accumulation({ ...elects, balance: 30_000_00 }),
  ];
  const result = division293ReleaseDestination(personWith(interests));
  assert.equal(result.slot, 1);
  assert.equal(result.interest, interests[1]);
});

test('only `division293` is a mark — no other value, and no truthy value, elects', () => {
  for (const value of ['superannuationGuarantee', 'division296', 'div293', 'DIVISION293', true, 1, {}, '']) {
    const result = division293ReleaseDestination(personWith([accumulation({ statedReleaseAuthorityDestination: value })]));
    assert.equal(result.election, 'none', `${JSON.stringify(value)} was read as a Subdiv 293-B election`);
  }
});

test('the election is a SIBLING of the employer destination: neither field is read off the other', () => {
  // A Person may rationally pay the Guarantee into the fund with the insurance and take the charge
  // out of the one with the cash. A nomination made for one purpose must not authorise the other.
  const guaranteeOnly = personWith([accumulation({ statedEmployerContributionDestination: 'superannuationGuarantee' })]);
  assert.equal(division293ReleaseDestination(guaranteeOnly).election, 'none', 'a Guarantee nomination made the election');

  const each = personWith([
    accumulation({ statedEmployerContributionDestination: 'superannuationGuarantee', balance: 10_000_00 }),
    accumulation({ ...elects, balance: 20_000_00 }),
  ]);
  assert.equal(division293ReleaseDestination(each).slot, 1, 'the employer destination was resolved as the release destination');
});

// --- §3 The two illegal shapes refuse, mirroring the door -------------------------------------------

test('TWO interests of one Person marked REFUSES — it is never resolved by picking one', () => {
  const person = personWith([
    accumulation({ ...elects, balance: 10_000_00 }),
    accumulation({ balance: 20_000_00 }),
    accumulation({ ...elects, balance: 30_000_00 }),
  ], 'Alex');
  const error = thrown(() => division293ReleaseDestination(person));
  assert.ok(error instanceof RangeError, `expected a RangeError, got ${error}`);
  assert.match(error.message, /^Alex states the Division 293 release authority destination on 2 superannuation interests/);
  // BOTH positions, because naming one would read as a verdict on which of them is the wrong one.
  assert.match(error.message, /positions 0, 2/);
  assert.match(error.message, /served on ONE interest/);
  assert.match(error.message, /statedReleaseAuthorityDestination/, 'the refusal does not say what to do');
  // The vacuity control: the same three interests with ONE mark resolve.
  assert.equal(division293ReleaseDestination(personWith([
    accumulation({ ...elects, balance: 10_000_00 }),
    accumulation({ balance: 20_000_00 }),
    accumulation({ balance: 30_000_00 }),
  ])).slot, 0);
});

test('a mark on a RETIREMENT-PHASE interest REFUSES, and says a release out of a stream is a commutation', () => {
  // **MUTATION (3)'s target.** This build has no path that commutes, so debiting the stream would
  // produce a balance no fund would produce — and, over Age Pension age, a means-test answer
  // computed off it.
  for (const phase of ['accountBasedPension', 'ttr']) {
    const person = personWith([accumulation({ balance: 5_000_00 }), { phase, balance: 400_000_00, ...elects }], 'Alex');
    const error = thrown(() => division293ReleaseDestination(person));
    assert.ok(error instanceof RangeError, `expected a RangeError for ${phase}, got ${error}`);
    assert.match(error.message, /^Alex names superannuation interest 1 /);
    assert.match(error.message, new RegExp(`in the ${phase} phase`), 'the refusal does not name the phase it found');
    assert.match(error.message, /COMMUTATION/);
    assert.match(error.message, /transfer balance account/, 'the refusal does not name what a commutation moves');
    assert.match(error.message, /statedReleaseAuthorityDestination/, 'the refusal does not say what to do');
  }
  // The vacuity control: the same two interests with the mark on the ACCUMULATION one resolve, so
  // what is refused above is the mark's placement and not the Person holding a stream.
  assert.equal(division293ReleaseDestination(personWith([
    accumulation({ ...elects, balance: 5_000_00 }),
    { phase: 'ttr', balance: 400_000_00 },
  ])).slot, 0);
});

test('the DOUBLE mark is refused before the phase is looked at, so neither refusal hides the other', () => {
  // Two marks, one of them on a stream: the count refusal is the one that fires, because the fix is
  // the same either way and a message about a phase would send the reader to the wrong interest.
  const error = thrown(() => division293ReleaseDestination(personWith([
    accumulation({ ...elects }),
    { phase: 'ttr', balance: 400_000_00, ...elects },
  ])));
  assert.match(error.message, /positions 0, 1/);
});

// --- §4 The two results cannot be collapsed ---------------------------------------------------------

test('⚠️ "no election" and "elected" are distinguishable WITHOUT reading a destination off either', () => {
  // **MUTATION (4)'s target.** A shape that reported both cases the same way — `undefined` for one,
  // or an `interest` field that is sometimes absent — would let a caller reach for the destination
  // and get nothing back, which is the reading that takes the charge out of the wrong pocket in
  // silence. The tag is the whole defence and it is asserted here on its own.
  const none = division293ReleaseDestination(personWith([accumulation()]));
  const released = division293ReleaseDestination(personWith([accumulation({ ...elects })]));
  assert.notEqual(none.election, released.election, 'the two answers carry the same tag');
  assert.deepEqual([none.election, released.election], ['none', 'released']);
  // Neither is falsy, so a truthiness test cannot stand in for the tag — a caller who writes
  // `if (result)` gets `true` in both cases and must still name which one they are handling.
  assert.ok(none && released);
  // And the absent case carries no destination in any spelling, including `undefined`-valued keys.
  assert.deepEqual(Object.keys(none).sort(), ['election', 'reason']);
  assert.deepEqual(Object.keys(released).sort(), ['election', 'interest', 'slot']);
  // Both are frozen: the walk holds the result across a month and an edit to it would restate a
  // legal election after the refusals had run.
  assert.ok(Object.isFrozen(none) && Object.isFrozen(released));
});

// ⚠️ **A TYPE-LEVEL PIN, not a behavioural test.** It asserts what the COMPILER refuses, which is a
// real property of the shipped shape but is not something the suite can observe by running.
const tsc = (body) => {
  const dir = mkdtempSync(join(ROOT, '.tsc-div293-release-'));
  try {
    const file = join(dir, 'case.ts');
    writeFileSync(file, `${body}\n`);
    let ok = true;
    let output = '';
    try {
      execFileSync(
        process.execPath,
        [
          join(ROOT, 'node_modules', 'typescript', 'bin', 'tsc'),
          '--noEmit', '--strict', '--target', 'ES2022', '--module', 'nodenext',
          '--moduleResolution', 'nodenext', '--verbatimModuleSyntax', '--noUncheckedIndexedAccess',
          file,
        ],
        { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] },
      );
    } catch (error) {
      ok = false;
      output = `${error.stdout ?? ''}${error.stderr ?? ''}`;
    }
    return { ok, output };
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
};

const PRELUDE = [
  "import { division293ReleaseDestination } from '../src/core/division293Release.js';",
  "import type { Person } from '../src/core/household.js';",
  'declare const person: Person;',
];

test('tsc REFUSES a destination read off the un-narrowed result — TS2339, with a positive control', () => {
  const bad = tsc([...PRELUDE, 'const slot: number = division293ReleaseDestination(person).slot;'].join('\n'));
  assert.equal(bad.ok, false, 'a caller can read `.slot` without naming which case they are in');
  assert.match(bad.output, /TS2339/, `expected a missing-property error, got:\n${bad.output}`);
  assert.match(bad.output, /NoDivision293ReleaseElection/, `the diagnostic does not name the case that has no slot:\n${bad.output}`);

  // The positive control: the SAME read compiles once the tag has been named, so what fails above
  // is the missing narrowing and not the prelude, the import or the probe's compiler flags.
  const good = tsc([
    ...PRELUDE,
    'const result = division293ReleaseDestination(person);',
    "const slot: number = result.election === 'released' ? result.slot : -1;",
  ].join('\n'));
  assert.equal(good.ok, true, `the narrowed read does not compile, so the probe proves nothing:\n${good.output}`);
});

// --- §5 ⚠️ SOURCE PINS — stopgaps, recorded in TODO.md ---------------------------------------------

/** Comments out, string literals blanked — so prose and a quoted name cannot satisfy a pin. */
const executableCode = (text) =>
  text
    .replaceAll(/\/\*[\s\S]*?\*\//g, '')
    .replaceAll(/`(?:[^`\\]|\\.)*`|'(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*"|\/\/.*$/gm, (match) =>
      match.startsWith('//') ? '' : '""',
    );

const tsFiles = (dir) =>
  readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? tsFiles(path) : name.endsWith('.ts') ? [path] : [];
  });

test('⚠️ SOURCE PIN (M2\u2019s no-caller pin, RETIRED AND REPLACED by M3): EXACTLY ONE caller under src/', () => {
  // **M2 pinned that the resolver had NO caller under `src/`, and M3 discharged that pin on its own
  // stated ground**: the pin said in terms that "the day this fails is the day the release path was
  // wired, and it must land with an argument". It landed \u2014 `projection.ts` calls the resolver at
  // the year-end settlement and the charge now comes out of a fund \u2014 so the absence is gone and
  // the pin cannot be kept as it stood.
  //
  // **It is REPLACED and not deleted.** What M2's pin was really protecting is that the election has
  // ONE reader: a second module that resolved it \u2014 a renderer, a plan edit, a future
  // means-test path \u2014 would be a second place where silence could be read as a choice, which is
  // the whole defect M1 and M2 were built against. So the claim becomes a COUNT, and the count is
  // one, and it is the walk.
  const callers = tsFiles(SRC)
    .filter((path) => path !== join(SRC, 'core', 'division293Release.ts'))
    .filter((path) => /\bdivision293ReleaseDestination\b/.test(executableCode(readFileSync(path, 'utf8'))));
  assert.deepEqual(
    callers.map((path) => path.slice(SRC.length + 1)),
    ['core/projection.ts'],
    'a module other than the walk now resolves the Division 293 release election \u2014 there must be exactly one reader of it',
  );
  // The positive control: the same walker DOES find the declaration in the module itself, so the
  // list above is a reading and not a broken walker.
  assert.ok(/\bdivision293ReleaseDestination\b/.test(executableCode(readFileSync(join(SRC, 'core', 'division293Release.ts'), 'utf8'))));
});

test('⚠️ SOURCE PIN: nothing under src/ defaults the election, in any spelling', () => {
  // The behavioural half of this — that the RESOLVER does not derive from silence — is §1 above.
  // What is left is every OTHER module: a `?? 'division293'` in the door, in `planEdits.ts` or in
  // a module written next year would make the election somewhere this suite is not looking.
  for (const path of tsFiles(SRC)) {
    const code = executableCode(readFileSync(path, 'utf8'));
    assert.doesNotMatch(code, /statedReleaseAuthorityDestination\s*(?:\?\?|\|\|)/, `${path} defaults the election`);
    assert.doesNotMatch(code, /(?:\?\?|\|\|)\s*["']*\s*division293/, `${path} falls back to an election`);
  }
});
