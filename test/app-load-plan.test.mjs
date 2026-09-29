// P8 — startup: load, or report that there is no file, and the one thing that must never happen
// in between.
//
// ⚠️ **§3 IS THE ASSERTION THIS WHOLE SLICE IS FOR.** A plan file that exists and does NOT parse
// must survive a startup attempt **byte for byte**. The shortcut it is written against looks like
// ordinary error handling — *"if it won't load, write a fresh one"* — and on a plan file it is
// silent data loss: the file may have been written by a newer build, or hand-edited with one typo
// in it, and both are recoverable until something overwrites them. Absence and refusal are
// different states and the startup path must not collapse them into one — and since 2026-09-20 the
// consequence of collapsing them is worse than it was, because absence now puts a FORM on screen
// whose one button writes a whole new plan. §1 is the other half of that: absence writes nothing
// at all, so a user who has not answered the two questions has no plan file yet.
//
// The transport is real: every case below reads and writes an actual file in a temp directory, so
// "nothing was written" is asserted against the bytes on disk and not only against a spy. The
// **user's** data directory is never touched — nothing here knows `~/.enough` exists, and no
// server is started (`test/origin-provider.test.mjs` already owns port 4173).
import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, readFileSync, readdirSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { DEMO_PLAN } from '../dist/app/demoHousehold.js';
import { PlanWriteFailure, loadPlanOrNone } from '../dist/app/loadPlan.js';
import { savePlan, walkthroughPlan } from '../dist/app/planEdits.js';
import { FIRST_RUN_FINISH, FIRST_RUN_INTRO, FIRST_RUN_LABELS, FIRST_RUN_NOTICE } from '../dist/app/firstRunPanel.js';
import { RESET_WARNING, resetConfirmation } from '../dist/app/settingsPanel.js';
import { planFailureMessage, showPlanFailure } from '../dist/app/planStatus.js';
import { PlanFileVersionError, UnspecifiedEntryTypeError, parsePlan } from '../dist/core/parsePlan.js';

const SRC = resolve(dirname(fileURLToPath(import.meta.url)), '..', 'src');

/** Comments out, string literals blanked — so prose cannot satisfy a source assertion. */
const executableCode = (text) =>
  text
    .replaceAll(/\/\*[\s\S]*?\*\//g, '')
    .replaceAll(/`(?:[^`\\]|\\.)*`|'(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*"|\/\/.*$/gm, (match) =>
      match.startsWith('//') ? '' : '""',
    );

const readSrc = (...parts) => readFileSync(join(SRC, ...parts), 'utf8');
const MAIN_RAW = readSrc('app', 'main.ts');
const MAIN = executableCode(MAIN_RAW);
const LOADER = executableCode(readSrc('app', 'loadPlan.ts'));
const PANEL_RAW = readSrc('app', 'firstRunPanel.ts');
const PANEL = executableCode(PANEL_RAW);

const DATA_DIR = mkdtempSync(join(tmpdir(), 'enough-plan-'));
let n = 0;

/**
 * A transport over a real file, and it writes the way the origin provider does — temp file then
 * `rename` — so a partial write cannot be mistaken for an untouched file.
 */
const onDisk = (contents) => {
  const path = join(DATA_DIR, `plan-${(n += 1)}.json`);
  if (contents !== undefined) writeFileSync(path, contents);
  const writes = [];
  return {
    path,
    writes,
    bytes: () => (existsSync(path) ? readFileSync(path) : null),
    transport: {
      // The server answers an absent file with `null` (`server/index.mjs`), and `files.ts` passes
      // that through untouched. `JSON.parse` on a corrupt file throws, exactly as `response.json()`
      // would in the browser.
      readPlan: async () => (existsSync(path) ? JSON.parse(readFileSync(path, 'utf8')) : null),
      writePlan: async (plan) => {
        writes.push(plan);
        writeFileSync(`${path}.tmp`, JSON.stringify(plan, null, 2));
        renameSync(`${path}.tmp`, path);
      },
    },
  };
};

const thrown = async (fn) => {
  try { await fn(); } catch (error) { return error; }
  return assert.fail('nothing was thrown');
};

// --- §1 First run: no file at all, and NOTHING IS WRITTEN ---------------------------------------------

// ⚠️ This section replaced "no file: the demo fixture is written to disk and returned" on
// 2026-09-20, and the reversal is the point of the slice: a brand-new user used to get `DEMO_PLAN`
// on their disk before they had agreed to anything, and the demo couple's house, super and income
// became *their* plan file. Absence is now REPORTED and the caller asks two questions instead.
// `DEMO_PLAN` survives as the fixture every case below is built from — it is no longer a seed.

test('no file: nothing is written, and the no-plan sentinel comes back', async () => {
  const store = onDisk();
  assert.equal(store.bytes(), null);

  const loaded = await loadPlanOrNone(store.transport);

  assert.equal(loaded, null, 'absence must be reported as null and as nothing else');
  assert.equal(store.writes.length, 0, 'a first run wrote a plan the user has not asked for yet');
  assert.equal(store.bytes(), null, 'a file exists after a load that found none');
  assert.ok(!existsSync(`${store.path}.tmp`), 'a temp file was left behind');
});

test('reading an absent file twice still writes nothing — there is no "seed on the second try"', async () => {
  const store = onDisk();

  assert.equal(await loadPlanOrNone(store.transport), null);
  assert.equal(await loadPlanOrNone(store.transport), null);

  assert.equal(store.writes.length, 0);
  assert.equal(store.bytes(), null);
});

test('the first plan a new user gets is built from their two answers, and written by the SAVE door', async () => {
  // The other half of "nothing is written until Finish": what Finish writes. `walkthroughPlan` is
  // the one builder — `firstRunPanel.ts` assembles nothing — and it borrows no personal figure from
  // the demo fixture, so the plan a first run produces holds the person who was asked for and an
  // empty journal. The write itself is `savePlan`'s, which is `parsePlan` then `project()` before
  // the transport is named at all.
  const store = onDisk();
  assert.equal(await loadPlanOrNone(store.transport), null);

  const saved = await savePlan(store.transport, walkthroughPlan({ name: 'Jordan Blake', dateOfBirth: '1970-06-15' }));

  assert.equal(store.writes.length, 1, 'Finish wrote something other than once');
  assert.deepEqual(saved.plan.household.persons.map((person) => person.name), ['Jordan Blake']);
  assert.deepEqual(saved.plan.entries, [], 'a first-run plan arrived holding journal entries nobody typed');
  assert.notDeepEqual(saved.plan.household, DEMO_PLAN.household, 'the first-run plan is the demo household after all');
  // And it is a plan this build reads back off the disk it just wrote.
  assert.deepEqual(parsePlan(JSON.parse(readFileSync(store.path, 'utf8'))), saved.plan);
});

// --- §2 Every run after the first: the user's own file, never the fixture ------------------------------

test('a valid file is read and the fixture is not consulted', async () => {
  // Deliberately NOT the demo's own figures: a loader that ignored the file and returned the seed
  // would pass a test whose fixture and file agreed.
  const theirs = { ...DEMO_PLAN, settings: { ...DEMO_PLAN.settings, asAtDate: '2027-04-01', nominalReturn: 0.041 } };
  const store = onDisk(JSON.stringify(theirs));

  const loaded = await loadPlanOrNone(store.transport);

  assert.notEqual(loaded, null, 'a file that exists was reported as absence');
  assert.equal(loaded.migrated, false);
  assert.equal(loaded.plan.settings.asAtDate, '2027-04-01');
  assert.equal(loaded.plan.settings.nominalReturn, 0.041);
  assert.notEqual(loaded.plan.settings.asAtDate, DEMO_PLAN.settings.asAtDate);
  assert.equal(store.writes.length, 0, 'a successful load must not write');
});

// --- §3 A file that will not load is NEVER overwritten -------------------------------------------------

const UNREADABLE = {
  // 3, not 2: 2 is the version this build reads (P6-4), and 1 is the version it UPGRADES, so
  // neither of them is an unknown one any more. The case this row is for is a file from a build
  // that does not exist yet.
  'an unknown version': JSON.stringify({ ...DEMO_PLAN, version: 3 }, null, 2),
  // `DOWNSIZE` (not `HEAS_DRAW`, from P9-1 slice 1, 2026-09-24 — that type is specified now): still
  // one of the three genuinely unspecified types, `UNSPECIFIED_ENTRY_TYPES`'s own live set.
  'an entry type this build cannot honour': JSON.stringify(
    { ...DEMO_PLAN, entries: [...DEMO_PLAN.entries, { id: 'downsize', date: '2035-01-01', owner: 'household', type: 'DOWNSIZE', params: {}, enabled: true, createdAt: '2026-08-20' }] },
    null,
    2,
  ),
  'a malformed household': JSON.stringify({ ...DEMO_PLAN, household: { ...DEMO_PLAN.household, homeStatus: 'rented' } }, null, 2),
  'money that is not whole cents': JSON.stringify({ ...DEMO_PLAN, entries: [{ ...DEMO_PLAN.entries[0], params: { annualSpend: 8400000.5 } }, ...DEMO_PLAN.entries.slice(1)] }, null, 2),
  'a date that is not zero-padded': JSON.stringify({ ...DEMO_PLAN, settings: { ...DEMO_PLAN.settings, asAtDate: '2026-9-1' } }, null, 2),
  'JSON that does not parse at all': '{"version": 1, "settings": {,,,\n',
  'a hand-edited file with a comment in it': '// my plan\n{"version":1}\n',
};

for (const [description, contents] of Object.entries(UNREADABLE)) {
  test(`a file with ${description} survives a startup attempt byte for byte`, async () => {
    const store = onDisk(contents);
    const before = store.bytes();

    await thrown(() => loadPlanOrNone(store.transport));

    assert.equal(store.writes.length, 0, 'the seeding path wrote over a file it merely failed to read');
    assert.deepEqual(store.bytes(), before, 'the bytes on disk changed');
    assert.equal(store.bytes().toString(), contents);
    assert.ok(!existsSync(`${store.path}.tmp`), 'a temp file was left beside the plan');

    // A second startup — the user reopening the page — must not wear it down either.
    await thrown(() => loadPlanOrNone(store.transport));
    assert.equal(store.writes.length, 0);
    assert.deepEqual(store.bytes(), before);
  });
}

test('the refusal that comes back names what is wrong, and is the parser\'s own', async () => {
  const version = onDisk(JSON.stringify({ ...DEMO_PLAN, version: 7 }));
  assert.ok((await thrown(() => loadPlanOrNone(version.transport))) instanceof PlanFileVersionError);

  const unspecified = onDisk(UNREADABLE['an entry type this build cannot honour']);
  const error = await thrown(() => loadPlanOrNone(unspecified.transport));
  assert.ok(error instanceof UnspecifiedEntryTypeError);
  assert.match(error.message, /DOWNSIZE/);
});

test('nothing at all was written into the temp directory beyond the files these tests made', () => {
  // A stray `plan.json` here would mean some path wrote to a name it chose itself.
  const strays = readdirSync(DATA_DIR).filter((name) => !/^plan-\d+\.json$/.test(name));
  assert.deepEqual(strays, []);
});

// --- §4 A write that does not land is VISIBLE (P8-2b) ----------------------------------------------------

test('a first-run write that does not land is surfaced as a failure, not swallowed', async () => {
  // The seeding write this case used to be about is gone; the write it is about now is the one the
  // first-run form makes on Finish. The property is the same and it is the dangerous one: a save
  // that silently did not land leaves a user looking at a plan that is on no disk anywhere.
  const store = onDisk();
  const broken = {
    readPlan: store.transport.readPlan,
    writePlan: async () => { throw new Error('write failed: /api/plan 507'); },
  };

  assert.equal(await loadPlanOrNone(broken), null);
  const error = await thrown(() => savePlan(broken, walkthroughPlan({ name: 'Jordan Blake', dateOfBirth: '1970-06-15' })));

  assert.ok(error instanceof PlanWriteFailure);
  assert.equal(error.cause.message, 'write failed: /api/plan 507'); // the transport's own reason survives
  assert.equal(store.bytes(), null, 'a failed write must not leave a file behind');
});

test('the banner says which of the two failures happened, because the fixes differ', () => {
  const save = planFailureMessage(new PlanWriteFailure('the plan file could not be written'));
  const load = planFailureMessage(new PlanFileVersionError('plan file: the file states version 2'));

  assert.match(save, /could NOT be saved/);
  assert.match(save, /not what is on disk/);
  assert.ok(!/was not loaded/.test(save));

  assert.match(load, /was not loaded/);
  assert.match(load, /has NOT been changed/);
  assert.match(load, /states version 2/); // the refusal's own words reach the screen
  assert.ok(!/could NOT be saved/.test(load));
});

test('the failure is put on the page, not only on the console', () => {
  const banner = { textContent: '', hidden: true };
  showPlanFailure(banner, new PlanFileVersionError('plan file: the file states version 2'));
  assert.equal(banner.hidden, false);
  assert.match(banner.textContent, /was not loaded/);
});

// --- §5 THE BOOT: absence is one branch, refusal is another, and the form is behind the first ----

// The disaster this section exists against: the first-run form's one button WRITES A WHOLE PLAN.
// If a file that merely failed to parse were ever reported as absence, that form would be put on
// screen over the user's own plan, and the next thing it did would overwrite it. §3 above proves
// the loader does not write; this proves it does not LIE about which state it is in either.

test('a file that will not load is refused, and never reported as the absence the form writes over', async () => {
  for (const [description, contents] of Object.entries(UNREADABLE)) {
    const store = onDisk(contents);
    // Outcome as data, so "it resolved to null" and "it threw" can be told apart in one assertion
    // rather than by a `try` that swallows the difference.
    const outcome = await loadPlanOrNone(store.transport).then((plan) => ({ plan }), (error) => ({ error }));

    assert.ok(!Object.hasOwn(outcome, 'plan'), `${description} RESOLVED — the first-run form would be put over this file`);
    assert.ok(outcome.error instanceof Error, `${description} came back as something other than a refusal`);
    assert.equal(store.writes.length, 0);
    assert.equal(store.bytes().toString(), contents);
  }
  // Vacuity control: the same call on a file that really is absent resolves, and resolves to null.
  assert.equal(await loadPlanOrNone(onDisk().transport), null);
});

test('absence is the stored null and nothing else — there is no catch anywhere near the load', () => {
  assert.match(LOADER, /if \(stored === null\) return null;/, 'the absence branch is no longer the stored null alone');
  assert.equal([...LOADER.matchAll(/return null;/g)].length, 1, 'something else in the loader can return the no-plan sentinel');
  // A catch-all is exactly how the two states collapse: every refusal below the read would come
  // back as "there is no file", and the caller would write over it.
  for (const forbidden of [/\btry\b/, /\bcatch\b/]) {
    assert.doesNotMatch(LOADER, forbidden, `loadPlan.ts has grown a ${forbidden} around the load`);
  }
  // Positive controls: the walker really is reading the loader, and the loader really does refuse.
  assert.match(LOADER, /const loadPlanOrNone = async/);
  assert.match(LOADER, /parsePlan\(stored\)/);
});

test('the first-run branch RETURNS before draw and before every panel the page mounts', () => {
  const branch = MAIN.indexOf('if (loaded === null) {');
  assert.ok(branch > 0, 'main.ts no longer branches on the no-plan sentinel at all');
  const branchEnd = MAIN.indexOf('\n  }', MAIN.indexOf('mountFirstRunPanel(', branch));
  assert.ok(branchEnd > branch);
  assert.match(MAIN.slice(branch, branchEnd + 4), /\n    return;\n  \}$/, 'the first-run branch falls through into the page');

  // The four things that must not run when there is no plan. Each reads a `PlanFile` that does not
  // exist yet — three of them synchronously, as they mount — so each is asserted to sit AFTER the
  // branch that returns, not merely to be guarded by something.
  for (const site of ['draw(plan, scenarioWalks(plan))', 'mountEntryEditor(', 'mountScenarioPanel(', 'mountSettingsPanel(']) {
    const at = MAIN.indexOf(site);
    assert.ok(at > 0, `main.ts no longer calls ${site} at all — this assertion would be vacuous`);
    assert.equal(MAIN.indexOf(site, at + 1), -1, `${site} is called twice; only one of them is ordered by this test`);
    assert.ok(at > branchEnd, `${site} runs before the no-plan branch returns, on a plan that does not exist`);
  }
  // And the fourth mount — the first run's own — is INSIDE the branch and nowhere else.
  assert.equal([...MAIN.matchAll(/mountFirstRunPanel\(/g)].length, 1);
  assert.ok(MAIN.indexOf('mountFirstRunPanel(') < branchEnd);
});

test('nothing is written on absence until Finish: the branch reaches the disk through the save door only', () => {
  const branch = MAIN.indexOf('if (loaded === null) {');
  const block = MAIN.slice(branch, MAIN.indexOf('\n  }', MAIN.indexOf('mountFirstRunPanel(', branch)));
  assert.match(block, /await savePlan\(\{ writePlan \}, candidate\)/, 'the first run writes by some route other than the save door');
  const bareWrites = [...block.matchAll(/(?<!savePlan\(\{ )\bwritePlan\(/g)];
  assert.deepEqual(bareWrites.map(([match]) => match), [], 'the first-run branch calls the transport directly, past the validator');
  // The panel itself holds no transport, no validator and no engine — it collects two strings.
  for (const forbidden of [/writePlan/, /fetch\(/, /parsePlan/, /\bproject\(/, /localStorage/, /version:/]) {
    assert.doesNotMatch(PANEL, forbidden, `firstRunPanel.ts has its own ${forbidden}`);
  }
  assert.equal([...PANEL.matchAll(/host\.save\(/g)].length, 1, 'the panel has grown a second write path');
  assert.equal([...PANEL.matchAll(/walkthroughPlan\(/g)].length, 1, 'the panel builds a candidate somewhere other than the one builder');
  // The write is in the Finish handler and nowhere else: mounting the form must write nothing.
  const finishHandler = /const finish = button\([\s\S]*?\n  \}\);/.exec(PANEL)[0];
  assert.match(finishHandler, /const candidate = walkthroughPlan\(\{ name: name\.value, dateOfBirth: dateOfBirth\.value \}\);\s*void host\.save\(candidate\)/,
    'the panel no longer hands its two typed fields straight to the one builder and the one door');
});

test('the first-run copy is its OWN, and says nothing about a plan being destroyed', () => {
  // A first run has nothing to destroy, so the wizard's warning would be false here: `RESET_WARNING`
  // says the plan is replaced and cannot be undone, and `resetConfirmation` says the old plan is
  // gone. Both are true of the "start again" control and neither is true of a computer with no
  // plan file on it.
  const DESTRUCTIVE = [/your old plan/i, /cannot be undone/i, /no backup/i, /\breplaces?\b/i, /\bdeletes?\b/i, /\bgone\b/i];
  const copy = [FIRST_RUN_INTRO, FIRST_RUN_NOTICE, FIRST_RUN_FINISH, FIRST_RUN_LABELS.name, FIRST_RUN_LABELS.dateOfBirth];
  for (const sentence of copy) {
    assert.ok(sentence.trim().length > 0, 'an empty string satisfies every assertion below it');
    for (const destructive of DESTRUCTIVE) {
      assert.doesNotMatch(sentence, destructive, `the first-run copy says ${destructive} about a plan that does not exist`);
    }
    assert.notEqual(sentence, RESET_WARNING);
  }
  // Positive control, so the list above is known to be able to fire: the wizard's own warning and
  // its confirmation both trip it, which is why they are not reused here.
  assert.ok(DESTRUCTIVE.some((destructive) => destructive.test(RESET_WARNING)));
  assert.ok(DESTRUCTIVE.some((destructive) => destructive.test(resetConfirmation(DEMO_PLAN))));
  // And the two panels do not share a sentence by import either: what the first-run form takes
  // from `settingsPanel.ts` is its four element builders, which hold no copy at all.
  for (const borrowed of [/RESET_WARNING/, /resetConfirmation/, /WALKTHROUGH_NOTICE/, /WALKTHROUGH_INVITATION/, /RESET_LABELS/]) {
    assert.doesNotMatch(PANEL, borrowed, `the first-run panel has borrowed ${borrowed} — the wizard's copy, on a screen where it is false`);
  }
  assert.match(PANEL_RAW, /import \{ button, input, label, paragraph \} from '\.\/settingsPanel\.js';/);
  // What the copy DOES say: there is nothing here yet, and nothing is written until the button.
  assert.match(FIRST_RUN_INTRO, /no plan on this computer yet/);
  assert.match(FIRST_RUN_INTRO, /nothing is written until you press/);
});

test.after(() => rmSync(DATA_DIR, { recursive: true, force: true }));
