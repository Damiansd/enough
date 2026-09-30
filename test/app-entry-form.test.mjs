// P6-6 — the two UNTESTED writers, pinned as SOURCE because they cannot be pinned as behaviour.
//
// `src/app/entryForm.ts` builds DOM and `src/app/main.ts` is a top-level module that runs on
// import: both need a document, and there is none — `typescript` is the one dev dependency
// (TODO.md P2-9a). So what a behavioural test would have caught is caught here instead, by reading
// the files as text. This is weaker than a test and it is written to be honest about which
// properties it can and cannot carry; §5 says what stays unproven.
//
// Every absence assertion below is paired with a POSITIVE CONTROL — a token the same walker DOES
// find — because "found none" in a string the transform may have erased proves nothing
// (`core-tris-conversion-day.test.mjs` shipped exactly that bug: import specifiers are string
// literals, and `executableCode` blanks them). Import lists are therefore read off the RAW source
// and compared as lists, never grepped for in the stripped code.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { CONSTRUCTIBLE_ENTRY_TYPES, ENTER_CARE_ENTRY_NOTICE, ENTRY_TYPES_NOT_YET_WALKED, MORTGAGE_ENTRY_NOTICE, MORTGAGE_ENTRY_SUMMARY, OFFERED_ENTRY_TYPES } from '../dist/app/planEdits.js';
import { ENTRY_TYPE_LABELS, entryTypeLabel, entryTypeOptions } from '../dist/app/entryLabels.js';
import { DEFAULT_ENTRY_TABLE_VIEW } from '../dist/app/entryTable.js';
import { ENTRY_TYPES } from '../dist/core/plan.js';
import { MORTGAGE_NOTICE } from '../dist/app/settingsPanel.js';
import { entrySummary } from '../dist/app/entryForm.js';
import { downsizerContributionEntry, lumpSumFromSuperEntry, planWithEntry, spouseContributionEntry, superContributionEntry } from '../dist/app/planEdits.js';
import { INVESTMENT_DIRECTION_LABELS, INVESTMENT_DIRECTION_OPTIONS, superAccountName } from '../dist/app/entryLabels.js';
import { DEMO_PLAN } from '../dist/app/demoHousehold.js';
import { parsePlan } from '../dist/core/parsePlan.js';
import * as planEdits from '../dist/app/planEdits.js';
import * as retireChoice from '../dist/app/retireChoice.js';

const SRC = resolve(dirname(fileURLToPath(import.meta.url)), '..', 'src');

/** Comments out, string literals blanked — so prose cannot satisfy a source assertion. */
const executableCode = (text) =>
  text
    .replaceAll(/\/\*[\s\S]*?\*\//g, '')
    .replaceAll(/`(?:[^`\\]|\\.)*`|'(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*"|\/\/.*$/gm, (match) =>
      match.startsWith('//') ? '' : '""',
    );

const read = (...parts) => readFileSync(join(SRC, ...parts), 'utf8');

const FORM_RAW = read('app', 'entryForm.ts');
const MAIN_RAW = read('app', 'main.ts');
const EDITS_RAW = read('app', 'planEdits.ts');
const FORM = executableCode(FORM_RAW);
const MAIN = executableCode(MAIN_RAW);
const EDITS = executableCode(EDITS_RAW);

/** Import specifiers off the RAW text. A specifier is a string literal, so the stripped code cannot hold one. */
const imports = (raw) => [...raw.matchAll(/\bfrom\s*['"]([^'"]+)['"]/g)].map(([, specifier]) => specifier);

/**
 * Every string LITERAL in the raw source. The complement of `executableCode`, and needed for the
 * same reason: a question about the WORDS a user sees cannot be asked of the stripped code, which
 * blanks every literal, nor of the raw file, where a comment explaining the wording would answer it.
 */
const literals = (raw) => [...raw.matchAll(/\/\*[\s\S]*?\*\/|`(?:[^`\\]|\\.)*`|'(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*"|\/\/.*$/gm)]
  .map(([match]) => match)
  // Comments are matched FIRST and discarded, in the same single pass `executableCode` uses: a
  // quoted word inside a comment is not a word a user reads, and this file's own header quotes one.
  .filter((match) => !match.startsWith('//') && !match.startsWith('/*'))
  .map((match) => match.slice(1, -1));

// --- §1 The transform is doing what the rest of this file assumes ------------------------------

test('the control on the transform itself: prose is erased, code is kept', () => {
  assert.match(FORM_RAW, /never called "Delete"/, 'the header sentence this test relies on has gone');
  assert.doesNotMatch(FORM, /never called "Delete"/, 'executableCode kept a comment, so every assertion below could be satisfied by prose');
  assert.match(FORM, /planWithEntryOverride/, 'executableCode erased real code, so every assertion below is vacuous');
});

// --- §2 The toggle sets a flag; it does not remove anything (mutation (d)) ----------------------

test('the writer’s toggle calls planWithEntryOverride with the NEGATION of the entry’s own flag', () => {
  assert.match(FORM, /planWithEntryOverride\(\s*plan,\s*plan\.activeScenarioId,\s*entry\.id,\s*!entry\.enabled\s*\)/);
});

// --- §2b The toggle is SCOPED — the 2026-09-22 defect, pinned at its two ends -------------------
//
// The bug had two independent halves and either one alone reproduces it: the write went to the
// shared pool, and the list was drawn from the shared pool. Both are pinned here because both are
// one edit away from coming back, and neither shows on screen — the table looks scenario-scoped
// whether or not it is.
test('the toggle writes the ACTIVE SCENARIO’s override and never the entry’s own flag', () => {
  // The write names activeScenarioId. A toggle that named any other scenario — or none — is the bug.
  assert.match(FORM, /planWithEntryOverride\(\s*plan,\s*plan\.activeScenarioId,/);
  // And nothing in this writer reaches for the function that set the pool's flag, which no longer
  // exists: the name is pinned so a reintroduction has to be deliberate.
  assert.doesNotMatch(FORM_RAW, /planWithEntryEnabled/, 'the pool-wide toggle is back in the entry editor');
});

test('the list is built from the ACTIVE SCENARIO’s resolved entries, never from plan.entries', () => {
  assert.match(FORM, /activeScenarioEntries\(plan\)/, 'entryRows no longer resolves the active scenario');
  // The pool read is what the defect was. `plan.entries` anywhere in the executable half of this
  // writer puts another scenario's changes back in the table.
  assert.doesNotMatch(FORM, /plan\.entries/, 'the entry editor reads the shared pool again');
});

test('nothing in either writer removes an entry from the array', () => {
  // On the RAW source, not the stripped code: `executableCode` erases template literals whole, and
  // a `${entries.splice(…)}` inside one would still run. Raw over-matches into comments, which is
  // the direction that fails loudly rather than the direction that misses.
  for (const [name, raw] of [['entryForm.ts', FORM_RAW], ['main.ts', MAIN_RAW], ['planEdits.ts', EDITS_RAW]]) {
    assert.doesNotMatch(raw, /\.splice\(/, `${name} splices an array`);
    assert.doesNotMatch(raw, /entries\s*\.\s*filter\(\s*\(?\s*entry\s*\)?\s*=>\s*entry\.id/, `${name} filters an entry out by id`);
    assert.doesNotMatch(raw, /entries:\s*[A-Za-z.]*\.filter/, `${name} writes a filtered entries list`);
  }
  // Positive control: the same walker finds the `.filter(` that IS there — the caption's count of
  // switched-on entries, which lives inside a template literal.
  assert.match(MAIN_RAW, /activeEntries\.filter\(\(entry\) => entry\.enabled\)\.length/, 'the caption no longer counts enabled entries — if this has gone, the absence checks above prove nothing');
});

test('no control in the editor promises removal, and the one that exists is reversible in both directions', () => {
  // Over the string LITERALS, which is the only place a word a user reads can be: the stripped
  // code has blanked them all, and the raw file carries a header explaining why the word is
  // avoided — so asking either of those two would answer the wrong question.
  const words = literals(FORM_RAW);
  const promising = words.filter((word) => /\b(delete|remove|removed|deleted)\b/i.test(word));
  assert.deepEqual(promising, [], 'a control that promises removal would be lying: the entry stays in the file');
  assert.ok(words.includes('Switch off'), 'the positive control: the walker reads the labels that ARE there');
  assert.ok(words.includes('Switch back on'));
  assert.match(FORM_RAW, /disable: 'Switch off'/);
  assert.match(FORM_RAW, /enable: 'Switch back on'/);
  assert.match(FORM, /entry\.enabled \? TOGGLE_LABELS\.disable : TOGGLE_LABELS\.enable/);
});

// --- §2b Sorting and filtering are VIEW STATE: hidden by default, a live count, a way back, no save

// ⚠️ **WHAT THESE THREE TESTS PINNED BEFORE 2026-09-22, AND WHY THEY MOVED.** The panel was a list
// of `<div>`s in the plan array's order with one button that revealed the switched-off rows, and
// this section read the button's two labels (`${hidden} switched off — show` / `— hide`), the
// `if (hidden > 0)` that skipped it, and the `let showSwitchedOff = false` behind it. The panel is
// a sortable, filterable TABLE now (user ruling, 2026-09-22): the flag became an `EntryTableView`,
// the count became a sentence that is on the page in every state, and the reveal became a checkbox
// plus a "Reset filters" button. Every one of those old pins is therefore restated against the new
// surface rather than dropped — **the PROPERTY each one carried is unchanged**: the default hides,
// the user can always see what is hidden, they can get it back in one click, and none of it saves.
// The count and the order are decided in `entryTable.ts`, which is pure, so what used to be pinned
// here as text is asserted as behaviour in `test/app-entry-table.test.mjs`; what stays here is that
// this file WIRES that module rather than deciding any of it again.

test('switched-off entries are hidden by default, and only the redraw runs on a view change (mutation (a))', () => {
  // The default is a named constant in the pure module now — `DEFAULT_ENTRY_TABLE_VIEW`, whose
  // `showSwitchedOff: false` and `date`/`descending` are asserted as values next door. What is
  // pinned here is that this file starts from it and does not build its own opening view.
  assert.match(FORM, /let view = DEFAULT_ENTRY_TABLE_VIEW;/, 'the mount no longer opens at the shared default — mutation (a)');
  assert.doesNotMatch(FORM, /let view = \{/, 'the mount hand-rolls an opening view instead of using the default');
  assert.equal(DEFAULT_ENTRY_TABLE_VIEW.showSwitchedOff, false, 'the default stopped hiding switched-off rows — mutation (a)');
  // The view handler replaces the view and redraws — it does not touch `host.save`, which is the
  // whole of "this is view state, not a plan edit".
  const mount = /export const mountEntryEditor[\s\S]*?\n\};/.exec(FORM)[0];
  assert.match(mount, /view = next;\s*redraw\(\);/);
  assert.doesNotMatch(mount, /host\.save/, 'changing the view calls the save path — mutation (c)');
});

test('the table always says what it is hiding, and the way back is always on the page (mutation (b))', () => {
  const body = /const filterControls[\s\S]*?\n\};/.exec(FORM)[0];
  // ⚠️ The guardrail, in its two halves. The count is UNCONDITIONAL — no `if` guards it, which is
  // the change from the old button, because a control that disappears when it has nothing to say
  // also disappears the fact that it would have said something. And the reset is DISABLED rather
  // than hidden for the same reason.
  assert.match(body, /hiddenSummary\(rows, view\)/, 'the hidden-count indicator is gone — switching an entry off now looks like deleting it');
  assert.match(body, /summary\.setAttribute\(""\, ""\)/, 'the count is not announced — a screen reader user cannot tell rows went away');
  assert.match(body, /reset\.addEventListener\(""\, \(\) => onView\(filtersReset\(view\)\)\)/, 'the reset no longer clears the filters');
  assert.match(body, /reset\.disabled = filtersAreOpen\(view\)/, 'the reset is not on the page in every state');
  assert.doesNotMatch(body, /if \([^)]*\)\s*\{?\s*(?:box\.append|summary)/, 'the indicator is drawn conditionally — it has to be readable without touching anything');
  // The rows shown come from the pure module, over the rows built from `plan.entries` — not from a
  // list some control already trimmed.
  const list = /const renderEntryList[\s\S]*?\n\};/.exec(FORM)[0];
  assert.match(list, /const rows = entryRows\(plan\);/);
  assert.match(list, /const shown = entryTableRows\(rows, view\);/);
  // The indicator's WORDS are `entryTable.ts`'s and are asserted there; what is read off the
  // literals here is the label on the way back, which is this file's own.
  const words = literals(FORM_RAW);
  assert.ok(words.includes('Reset filters'), 'the one-click way back has lost its label');
  assert.ok(words.includes('Show switched off '), 'the control that reveals switched-off rows has lost its label');
});

test('the view decisions are imported from the pure module, not reimplemented here', () => {
  const namedImports = /import \{([\s\S]*?)\} from '\.\/entryTable\.js';/.exec(FORM_RAW)[1];
  for (const name of ['DEFAULT_ENTRY_TABLE_VIEW', 'ENTRY_TABLE_COLUMNS', 'ariaSortFor', 'entryTableRows', 'filtersReset', 'hiddenSummary', 'withSortKey']) {
    assert.match(namedImports, new RegExp(`\\b${name}\\b`), `entryForm.ts no longer imports ${name}`);
  }
  // And the pure module is the one that owns the switched-off decision, still expressed once.
  const tableImports = /import \{([\s\S]*?)\} from '\.\/entryVisibility\.js';/.exec(read('app', 'entryTable.ts'))[1];
  assert.match(tableImports, /\bswitchedOffCount\b/);
  assert.match(tableImports, /\bvisibleEntries\b/);
  // No second filter over `.enabled`, and no second sort, reimplementing either decision inline.
  assert.equal([...FORM.matchAll(/\.filter\(\s*\(?\s*(?:entry|row)\s*\)?\s*=>\s*\w+\.enabled\)/g)].length, 0, 'the row loop filters entries itself instead of calling the pure module');
  assert.doesNotMatch(FORM, /\.sort\(/, 'the writer sorts the rows itself — the order is `entryTable.ts`’s to decide');
});

test('the table offers five columns and no way to reach `createdAt` (user ruling, 2026-09-22)', () => {
  // The columns are the pure module's list and their order is asserted there. What is pinned here
  // is that the writer draws THAT list rather than its own headings, and that the row it builds
  // carries the entry's EFFECTIVE date and no provenance for a sort to reach.
  const rows = /const entryRows = [\s\S]*?\n  \}\)\);/.exec(FORM)[0];
  assert.match(rows, /date: entry\.date,/, 'the row no longer carries the entry’s effective date');
  assert.doesNotMatch(rows, /createdAt/, 'the table carries `createdAt` — the ruling is that when an entry was TYPED IN is not on it');
  assert.match(FORM, /for \(const column of ENTRY_TABLE_COLUMNS\) headRow\.append/, 'the headings are not drawn from the shared column list');
  // The positive control on the same absence: this file DOES still write a `createdAt`, on the
  // entry it builds in the add form, so "no createdAt in the row" is not a walker finding nothing.
  assert.match(FORM, /build\(crypto\.randomUUID\(\), createdAt\)/, 'the control: nothing in this file mentions createdAt at all');
});

// --- §3 The save path: validate, then re-project, then re-render (mutations (a) and (b)) --------

test('the page’s only write goes through savePlan, and nowhere else calls writePlan', () => {
  assert.match(MAIN, /savePlan\(\{ writePlan \}, candidate\)/);
  // `loadOrSeedPlan` is handed the transport too — that is the first-run seed, and it is the only
  // other writer. What must not exist is a third: a bare `writePlan(` call site.
  const bareWrites = [...MAIN.matchAll(/(?<![.\w{ ])writePlan\(/g)];
  assert.deepEqual(bareWrites.map(([match]) => match), [], 'main.ts calls the transport directly, bypassing the validator');
  assert.deepEqual(imports(FORM_RAW).filter((specifier) => specifier.includes('store/')), [], 'the DOM writer has its own transport');
  // Positive control on the same walker: it finds the imports that ARE there.
  // `./entryTable.js` replaced `./entryVisibility.js` here on 2026-09-22: the table's own pure
  // module is what this file talks to, and IT imports the visibility pair (asserted in §2b).
  // `./scenarioWalks.js` joined the list on 2026-09-22: the table lists the ACTIVE Scenario's
  // resolved entries, and that module is the one place a Scenario's entries and its on/off
  // overrides are resolved (§2b).
  // `./retirementWarning.js` joined on 2026-09-23: the "still paid when the plan ends" sentence
  // above the table. Pure — it reads a Household and entries and writes nothing.
  // `./displayMoney.js` replaced `../core/money.js` on 2026-09-24: the rows print whole dollars
  // through the page's one display formatter instead of `formatCents`. Pure as well.
  // `./careRoutes.js` joined on 2026-09-25 (P14-14): the "Compare ways to pay for care" control.
  // Pure — it returns a candidate, and this file still writes only through `host.save`.
  // `./radDeposit.js` joined on 2026-09-25 (P14-10): the deposit headline. Pure, and writes nothing.
  // `./downsizerAgePension.js` joined on 2026-09-25 (P9-6): the Age Pension trade-off sentence. Pure, and writes nothing.
  assert.deepEqual(imports(FORM_RAW), ['./planEdits.js', './entryTable.js', './scenarioWalks.js', './infoButton.js', './entryLabels.js', './ownerNames.js', './retirementWarning.js', './retireChoice.js', '../core/parsePlan.js', '../core/plan.js', './displayMoney.js', './careRoutes.js', './radDeposit.js', './downsizerAgePension.js']);
});

test('savePlan validates BEFORE it writes, and the parse is not skippable (mutation (a))', () => {
  // The order in the source is the order at run time: `validatedPlan` is called, and only then is
  // `writePlan` named. A version that wrote first could not match this.
  assert.match(EDITS, /const validated = validatedPlan\(candidate\);\s*try \{\s*await transport\.writePlan\(validated\.plan\);/);
  assert.match(EDITS, /const plan = parsePlan\(candidate\);/);
  // **P7-1 replaced the walk half's ARGUMENT, and this assertion moved with it.** It used to read
  // `project(plan.settings, plan.household, plan.entries)` — the POOL, which is the union of every
  // Scenario's entries and is the active Scenario's own walk only while there is one Scenario. The
  // gate now walks every Scenario from its RESOLVED entries (`scenarioWalks.ts`), so what is pinned
  // here is that planEdits no longer reaches the engine at all, and that the module which does
  // reaches it once per Scenario with that Scenario's resolved entries.
  assert.match(EDITS, /const walks = scenarioWalks\(plan\);/);
  assert.doesNotMatch(EDITS, /project\(/, 'planEdits.ts projects something itself again — the walk must come from scenarioWalks');
  const WALKS = executableCode(read('app', 'scenarioWalks.ts'));
  assert.match(WALKS, /projector\(plan\.settings, plan\.household, scenarioEntries\(plan, scenario\)\)/);
  assert.doesNotMatch(WALKS, /projector\(plan\.settings, plan\.household, plan\.entries\)/, 'the walk is the pool again');
});

test('a successful save re-projects and re-renders (mutation (b))', () => {
  // The three things that must happen after the write resolved, in one block: the banner goes, the
  // page's copy of the plan becomes what was STORED, and the whole view is redrawn from the walk
  // savePlan handed back — not from the old `months`, and not by patching the table alone.
  // P7-1: the redraw is handed the WALKS (one per Scenario, projected once each) rather than one
  // month array, and the Scenario list is rebuilt with everything else — a list still showing the
  // Shortfall Ages of the plan before the save would be the screen disagreeing with the disk.
  assert.match(MAIN, /clearPlanStatus\(banner\);\s*plan = stored\.plan;\s*draw\(plan, stored\.walks\);\s*redrawEntries\(\);\s*redrawScenarios\(\);/);
  assert.match(MAIN, /const draw = \(plan: PlanFile, walked: ScenarioWalks\): void => \{/);
  // And the ACTIVE Scenario's walk is what the table and the focused chart read — never the pool,
  // and never another Scenario's walk out of the same map.
  assert.match(MAIN, /months = walked\.active;/);
  assert.doesNotMatch(MAIN, /project\(plan\.settings, plan\.household, plan\.entries\)/, 'main.ts projects the entry pool again');
  // P7-6 put the table's own call behind `paintTable`, because the Household/per-Person switch has
  // to redraw the table without redrawing anything else. The redraw still goes through it.
  for (const call of [/months = walked\.active;/, /series = monthsToSeries\(/, /paintTable\(plan\)/, /drawNote\(\)/, /drawCaption\(plan\)/]) {
    assert.match(MAIN, call, 'the redraw no longer rebuilds every part of the view from the same walk');
  }
  // And there is exactly ONE `renderTable` call on the page: the switch must not grow a second
  // route to the table that the redraw does not share.
  assert.equal(MAIN.match(/renderTable\(/g).length, 1);
  assert.match(MAIN, /const paintTable = \(shown: PlanFile\): void => \{\s*renderTable\(\s*container,\s*financialYearRows\(\s*months,/);
  // The per-Person view's labels come from the plan's own persons, BY POSITION: `personLabels` is
  // handed the array and nothing here matches a Person by name.
  assert.match(MAIN, /labels: personLabels\(shown\.household\.persons\)/);
});

test('the chart is destroyed and rebuilt, and Chart.js is only ever reached through renderChart', () => {
  assert.match(MAIN, /chart\?\.destroy\(\);\s*chart = renderChart\(canvas, series, moneyBasis\(moneyView, plan\.settings\), axisMode\);/);
  // The frozen-config trap (67f0ba3): nothing but `renderChart` may construct a Chart, because
  // `renderChart` is where `mutableChartInput` is applied.
  assert.doesNotMatch(MAIN, /new Chart\(/, 'main.ts constructs Chart.js itself, bypassing mutableChartInput');
  const RENDER = executableCode(read('app', 'renderChart.ts'));
  assert.match(RENDER, /new Chart\(/, 'the positive control: renderChart.ts is where Chart is constructed');
  assert.match(RENDER, /mutableChartInput\(chartConfig\(series, basis, mode\)\)/);
});

// --- §4 A failed write is visible, and says which of the three things happened (mutation (c)) ---

test('every way a save can fail ends on the banner', () => {
  assert.match(
    MAIN,
    /\} catch \(error\) \{\s*if \(error instanceof PlanWriteFailure\) showPlanFailure\(banner, error\);\s*else showEntryRefusal\(banner, error\);\s*return;\s*\}/,
    'a save can now fail without the user being told',
  );
  // And the failure path must NOT redraw: the figures on screen are the stored plan's own, and
  // redrawing from a plan that was never written would be the screen lying.
  // The SAVE path's catch, not the loader's: `MAIN` holds two, and the loader's own rethrow is
  // `test/app-load-plan.test.mjs`'s business.
  const catchBlock = /instanceof PlanWriteFailure[\s\S]*?\n  \}/.exec(MAIN)[0];
  assert.doesNotMatch(catchBlock, /draw\(/);
  assert.doesNotMatch(catchBlock, /plan = /);
});

test('the banner element is the one that already exists — no second notification mechanism', () => {
  assert.match(MAIN, /getElementById\(""\)/, 'the banner is still looked up by id'); // the id is a blanked literal here
  assert.match(MAIN_RAW, /getElementById\('plan-status'\)/);
  // FIVE, not four, since the scenario delete (2026-09-19): a delete the pure layer refuses never
  // reaches `savePlan`, so the panel is handed `refuse` and it writes to THIS banner. SEVEN, not
  // five, since the first run (2026-09-20): the first-run form's own save can be refused by the
  // door or fail to land, and both go to THIS banner rather than to a screen of its own. Raised
  // deliberately each time — the count is here so that a second notification MECHANISM cannot be
  // added quietly, and every one of the seven is the same mechanism reused. EIGHT since P3-4b slice 2
  // (2026-09-30): a catch-up the pure layer refuses never reaches `save`, and its refusal goes to THIS banner.
  assert.deepEqual([...MAIN.matchAll(/(showPlanFailure|showEntryRefusal|clearPlanStatus)\(banner/g)].length, 8);
  // And the two that were added are the first run's, inside the branch that returns before the
  // page is mounted — not a second reporter somewhere in the ordinary path.
  const firstRun = /if \(loaded === null\) \{[\s\S]*?\n  \}/.exec(MAIN)[0];
  assert.match(firstRun, /if \(error instanceof PlanWriteFailure\) showPlanFailure\(banner, error\);\s*else showEntryRefusal\(banner, error\);/);
  assert.doesNotMatch(firstRun, /alert\(|console\./, 'the first run reports a failure somewhere other than the banner');
  assert.match(MAIN, /refuse: \(error\) => showEntryRefusal\(banner, error\)/);
  assert.doesNotMatch(FORM, /alert\(|console\./, 'the writer reports a failure somewhere other than the banner');
});

// --- §5 The pure layer has no clock and no randomness, and the writer is where both live --------

test('planEdits.ts reaches for no clock, no randomness and no transport of its own', () => {
  for (const forbidden of [/new Date\(/, /Date\.now\(/, /randomUUID/, /Math\.random/, /fetch\(/, /document\./]) {
    assert.doesNotMatch(EDITS, forbidden, `planEdits.ts is no longer pure: ${forbidden}`);
  }
  assert.deepEqual(imports(EDITS_RAW), ['../core/parsePlan.js', '../core/parsePlan.js', '../core/household.js', '../core/superInsurance.js', '../core/superInsurance.js', '../core/plan.js', '../core/plan.js', '../data/assumptions/tax.js', './demoHousehold.js', './entryLabels.js', './loadPlan.js', './scenarioList.js', './scenarioWalks.js', './financialYearRows.js', '../core/financialYear.js', '../data/assumptions/super.js', '../core/money.js', '../data/assumptions/types.js', './scenarioWalks.js']);
  // P3-4b slice 2 (the catch-up): `./financialYearRows.js` for `catchUpOffer`, pure; `../core/financialYear.js`
  // for year arithmetic, pure; `../data/assumptions/super.js` for the look-back length, a constant;
  // `../core/money.js` and `../data/assumptions/types.js` are TYPE-only.
  // `../core/superInsurance.js` (P3-17a slice 1): the cover kinds for the cover-type box — a frozen list and its type, pure.
  // `../data/assumptions/tax.js` (LR-1 slice 4): `CGT_REFORM_START`, one date constant, pure.
  // `./scenarioList.js` is a TYPE-only import (`ScenarioDeletion`) and brings no impurity with it.
  assert.match(EDITS_RAW, /import type \{ ScenarioDeletion \}/);
  // `../core/household.js` is TYPE-only too (`StatedStreamSettings`, TTR build step 2; and
  // `StatedPriorRetirementPhase` from 2026-09-23, for the prior-pension box).
  assert.match(EDITS_RAW, /import type \{ StatedPriorRetirementPhase, StatedStreamSettings \} from '\.\.\/core\/household\.js';/);
  // `./entryLabels.js` is TYPE-only too (`LabelledOption`, P6-13, 2026-09-24): the settings
  // dropdowns split what they show from what they store the way the entry type selector does.
  assert.match(EDITS_RAW, /import type \{ LabelledOption \} from '\.\/entryLabels\.js';/);
});

test('the writer is where the id and the timestamp are made, and EVERY builder is passed them', () => {
  assert.match(FORM, /new Date\(\)/, 'the positive control for the absence assertions above');
  assert.match(FORM, /crypto\.randomUUID\(\)/);
  // Strictly stronger than P6-6's single `spendChangeEntry(values, crypto.randomUUID(), createdAt)`
  // check, which it replaces: there are six builders now, and the property has to hold for all six.
  // Every call to one of them ends in the SAME two injected arguments …
  const builderCalls = [...FORM.matchAll(/\b([a-zA-Z]+Entry)\(([\s\S]*?)\bid,\s*createdAt,?\s*\)/g)].map(([, name]) => name);
  assert.deepEqual(
    [...new Set(builderCalls)].sort(),
    // TEN from 2026-09-21 (P6-8 brief 4): `superContributionStopEntry` is the second shape of
    // `SUPER_CONTRIBUTION`, chosen the way the buy/sell pair is, and it is passed the same two
    // injected facts as every other builder. ELEVEN from 2026-09-22 (P3-16a microtask 5):
    // `mortgageTargetEntry` joins them, `retireEntry`'s own shape. TWELVE the same day (P2-11
    // microtask 4): `returnChangeEntry` joins them, `mortgageRefinanceEntry`'s rate-box shape.
    // THIRTEEN the same day (P3-19 microtask 4): `spouseContributionEntry` joins them,
    // `lumpSumFromSuperEntry`'s own two-box shape pointed at the other Person's account.
    // FOURTEEN from 2026-09-23: `mortgagePayoffEntry` joins them, `retireEntry`'s own shape.
    // FIFTEEN the same day: `ttrRateChangeEntry` (TTR build step 3).
    // SIXTEEN from 2026-09-24: `illnessSeparationEntry` (P12-4), `retireEntry`'s own shape.
    // SEVENTEEN the same day: `deathEntry` (P12-1), `retireEntry`'s own shape.
    // EIGHTEEN the same day (P14-13, slice 3b): `enterCareEntry`, `mortgageRefinanceEntry`'s
    // three-required-boxes shape. NINETEEN from 2026-09-25 (P9-1, slice 2): `heasDrawEntry`, the
    // union resolved by which STRING `fortnightlyAmount` is rather than by a second function.
    // TWENTY the same day (P14-13): `sellHomeEntry`, `mortgageRefinanceEntry`'s own shape again.
    // TWENTY-ONE the same day (P14-13): `rentOutHomeEntry`, `sellHomeEntry`'s own shape again.
    // TWENTY-TWO the same day (P14-19): `buyHomeEntry`, `sellHomeEntry`'s own shape again.
    // TWENTY-THREE the same day (P9-5): `downsizerContributionEntry`, `spouseContributionEntry`'s shape.
    // TWENTY-FOUR the same day (P3-17a slice 3): `insuranceCoverChangeEntry`, `ttrRateChangeEntry`'s shape.
    // TWENTY-THREE from 2026-09-29 (retire flow S1): `retireEntry` leaves — the Retire answer is
    // built in `retireChoice.ts`, whose `retireChoiceEntries` is handed a fresh id per entry below.
    // TWENTY-FOUR again on 2026-09-29 (retire flow S4): `ttrStartEntry`, `ttrRateChangeEntry`'s shape.
    ['buyHomeEntry', 'deathEntry', 'downsizerContributionEntry', 'enterCareEntry', 'heasDrawEntry', 'illnessSeparationEntry', 'insuranceCoverChangeEntry', 'lumpSumFromSuperEntry', 'mortgagePayoffEntry', 'mortgageRefinanceEntry', 'mortgageTargetEntry', 'nonSuperInvestmentBuyEntry', 'nonSuperInvestmentSellEntry', 'oneOffExpenseEntry', 'rentOutHomeEntry', 'returnChangeEntry', 'sellHomeEntry', 'spendChangeEntry', 'spouseContributionEntry', 'superContributionEntry', 'superContributionStopEntry', 'ttrRateChangeEntry', 'ttrStartEntry', 'workPatternChangeEntry'],
    'a builder is called with something other than the injected id and createdAt',
  );
  // … and `id` and `createdAt` are the two impure facts, made at the one submit site — `createdAt`
  // ONCE (both HEAS_DRAW entries a "Both of us" save writes share one timestamp), `id` per entry
  // written, which is THREE calls now the submit handler can write two entries in the one save
  // (P9-1e, "Both of us"): the ordinary one-entry path's own `build(crypto.randomUUID(), createdAt)`,
  // and the two per-person `heasDrawEntry(…, crypto.randomUUID(), createdAt)` calls below.
  assert.match(FORM, /build\(crypto\.randomUUID\(\), createdAt\)/);
  // FOUR from 2026-09-29 (retire flow S1): the Retire answer's `() => crypto.randomUUID()`, called
  // once per entry the answer writes.
  assert.match(FORM, /\(\) => crypto\.randomUUID\(\),\s*createdAt,?\s*\)/);
  assert.equal([...FORM.matchAll(/crypto\.randomUUID\(\)/g)].length, 4, 'an id is minted somewhere other than the four known entry-writing sites');
  assert.equal([...FORM.matchAll(/new Date\(\)/g)].length, 1);
});

// --- P9-1e "Both of us" — a couple's two HEAS_DRAW entries, written from one save --------------
//
// T37 (`core/parsePlan.ts`'s `checkHeasDraws`) made HEAS a loan PER PERSON: a couple states two
// entries, never one `household`-owned one. Typing the same boxes twice, under two different Owner
// selections, is the two-entry-per-save UX this file offers instead — a sentinel Owner value the
// door never sees, resolved into the couple's two per-person entries by the submit handler alone.

test('"Both of us" is offered for HEAS_DRAW only, and only for a two-Person Household', () => {
  assert.match(FORM, /HEAS_DRAW_BOTH_OWNER = ""/, 'the sentinel Owner value is not defined as a string literal');
  const fillOwnersBody = /const fillOwners = \([\s\S]*?\n\};/.exec(FORM)[0];
  assert.match(fillOwnersBody, /offerBoth && household\.persons\.length === 2/, 'the sentinel is offered without both gates: HEAS_DRAW chosen, and a couple');
  assert.match(fillOwnersBody, /value: HEAS_DRAW_BOTH_OWNER, label: ""/, '"Both of us" is not built the way every other <option> here is — see the sweep test above');
  // The gate is TYPE-scoped, and refreshed on a type change — an "offered while HEAS_DRAW is chosen"
  // control that a type switch does not silently update would leave the sentinel selected and
  // unreachable once the user picks a different type.
  assert.match(FORM, /fillOwners\(owner, host\.currentPlan\(\)\.household, type\.value === ""\)/);
  assert.match(FORM, /type\.addEventListener\("", refreshOwners\)/);
});

test('"Both of us" writes BOTH per-person entries, from the SAME boxes, in ONE save — a mutation that drops one goes red', () => {
  // The whole branch, off the RAW source (not `executableCode`'s `FORM`): the two Owner literals
  // this test tells apart, 'personA' and 'personB', are exactly what stripping blanks to `""`, so
  // distinguishing "personA built" from "personB built" needs the literals intact.
  const bothBranch = /if \(type\.value === 'HEAS_DRAW' && owner\.value === HEAS_DRAW_BOTH_OWNER\) \{([\s\S]*?)\n {4}\}/.exec(FORM_RAW)[1];
  // MUTATION PROBE: a change that builds personA twice, or drops personB's build or its
  // `planWithEntry`, fails one of the assertions below. Each is independently necessary — together
  // they are what "write only one → red" tests.
  assert.match(bothBranch, /const personA = heasDrawEntry\(\{ \.\.\.heasValues, owner: 'personA' \}/, "personA's entry is not built from heasValues — the two entries could disagree about securityValue");
  assert.match(bothBranch, /const personB = heasDrawEntry\(\{ \.\.\.heasValues, owner: 'personB' \}/, "personB's entry is not built from heasValues — the two entries could disagree about securityValue");
  // Both go into ONE candidate plan (two `planWithEntry` calls chained, not two `host.save` calls):
  // `savePlan` validates the WHOLE candidate before writing, so this is what makes the write atomic.
  assert.match(bothBranch, /planWithEntry\(host\.currentPlan\(\), personA\)/, 'personA never reaches planWithEntry — it would never be saved');
  assert.match(bothBranch, /planWithEntry\(withPersonA, personB\)/, 'personB never reaches planWithEntry — it would never be saved');
  assert.equal([...bothBranch.matchAll(/host\.save\(/g)].length, 1, 'the two entries are written in more than one host.save call — the write is no longer atomic');
});

test('the form offers exactly the types parsePlan can read AND the walk acts on', () => {
  // The selector is built from `OFFERED_ENTRY_TYPES` — the list the door itself derives — and the
  // labels are a display layer over it (`entryLabels.ts`). A hand-written option list here would
  // drift from what `parsePlan` accepts; a raw `EntryType` reaching the screen is what the label
  // layer exists to stop. Both halves are pinned, so neither can be dropped without this failing.
  assert.match(FORM, /labelledSelect\([^)]*entryTypeOptions\(OFFERED_ENTRY_TYPES\)\)/, 'the type selector is no longer built from the derived list');
  // The BUILDERS record is keyed by the same names, read out of the source and compared to the
  // list the door itself derives. A type with a parser and no builder is an option that cannot be
  // submitted; a builder for a type with no parser is a save that always fails.
  const record = /const BUILDERS[\s\S]*?\n  \};/.exec(FORM)[0];
  const keys = [...record.matchAll(/^    ([A-Z_]+):/gm)].map(([, key]) => key);
  // RETIRE is built in the submit handler's own branch (retire flow S1, 2026-09-29): its answer
  // decides WHICH entries are written, so it has no single-entry builder here.
  assert.match(FORM, /if \(type\.value === ""\) \{\s*const plan = host\.currentPlan\(\);\s*const chosen = retireChoiceEntries\(/, 'the Retire branch is gone from the submit handler');
  assert.deepEqual([...keys, 'RETIRE'].sort(), [...OFFERED_ENTRY_TYPES].sort());
  assert.deepEqual([...OFFERED_ENTRY_TYPES].sort(), ['BUY_HOME', 'DEATH', 'DOWNSIZER_CONTRIBUTION', 'ENTER_CARE', 'HEAS_DRAW', 'ILLNESS_SEPARATION', 'INSURANCE_COVER_CHANGE', 'LUMP_SUM_FROM_SUPER', 'MORTGAGE_PAYOFF', 'MORTGAGE_REFINANCE', 'MORTGAGE_TARGET', 'NON_SUPER_INVESTMENT', 'ONE_OFF_EXPENSE', 'RENT_OUT_HOME', 'RETIRE', 'RETURN_CHANGE', 'SELL_HOME', 'SPEND_CHANGE', 'SPOUSE_CONTRIBUTION', 'SUPER_CONTRIBUTION', 'TTR_RATE_CHANGE', 'TTR_START', 'WORK_PATTERN_CHANGE'], 'the control: the offered list is the twenty-three, so the comparison above is not two empty arrays');
  // ⚠️ ~~**The set that moved 6 → 7 is CONSTRUCTIBLE, and the offered set did NOT move with it**
  // (P6-8 brief 1, 2026-09-19).~~ **THE TWO SETS ARE THE SAME SET AGAIN FROM 2026-09-20 (P6-8
  // brief 2, chunk 5), AND THIS TEST WENT RED SAYING SO.** `SUPER_CONTRIBUTION` is walked whole and
  // its two refusals are in place — the concessional cap in the walk, the phase of the target at
  // the door — so the ground that held it back is discharged and `ENTRY_TYPES_NOT_YET_WALKED` is
  // EMPTY. Re-derived rather than relaxed: the numbers are written out, so a type slipping back
  // into the held-back list without a paragraph fails here.
  // **7 → 8 on 2026-09-21 (P3-16 slice 2), and the new one is offered on the day it is
  // constructible**: `MORTGAGE_REFINANCE` has a parser AND a branch in the walk, so it never passes
  // through `ENTRY_TYPES_NOT_YET_WALKED`.
  // **8 → 9 on 2026-09-22, and the offered set did NOT move with it.** `TRIS_EARLY_CONVERSION`
  // (P3-8's conversion limb) has a parser and the door cross-checks it fully against the
  // Household, and `projection.ts` has no branch for it — the same gap `SUPER_CONTRIBUTION` first
  // opened on 2026-09-19, held open again in the same one place. The numbers are written out
  // rather than derived, so a tenth type cannot be added without a paragraph here saying what it
  // is.
  // **9 → 10 the same day (P3-16a microtask 1), and the offered set STILL did not move.**
  // `MORTGAGE_TARGET` has a parser and needs no branch in `projection.ts` at all — the generic
  // `appliedEntryIds` bucketing already cites it — but `entryForm.ts` had no control for it yet, so
  // it joined `TRIS_EARLY_CONVERSION` in `ENTRY_TYPES_NOT_YET_WALKED` for the form-only reason that
  // entry's own paragraph in `planEdits.ts` gave.
  // **8 → 9 the same day (P3-16a microtask 5).** `RetireParams` being `{}` made the control trivial
  // — `mortgageTargetEntry` is `retireEntry`'s own shape — so `MORTGAGE_TARGET` leaves
  // `ENTRY_TYPES_NOT_YET_WALKED` and the offered set moves with it, unlike every earlier entry in
  // this list: `test/app-entry-form.test.mjs`'s dispatch test below asserts it is offered WITHOUT
  // ever being dispatched on, which is the whole point of this type needing no walk branch.
  // **10 → 11 on 2026-09-22 (P2-11 microtask 2), and the offered set did NOT move with it.**
  // `RETURN_CHANGE` gained a parser before `projection.ts` gained a branch for it —
  // `SUPER_CONTRIBUTION`'s own original ground — so it joined `TRIS_EARLY_CONVERSION` in
  // `ENTRY_TYPES_NOT_YET_WALKED`.
  // **9 → 10 the same day (P2-11 microtask 4).** The engine branch landed (microtask 3) and
  // `entryForm.ts` gained a control for it (`returnChangeEntry`) — `MORTGAGE_REFINANCE`'s own
  // rate-box shape, a decimal fraction — so `RETURN_CHANGE` leaves `ENTRY_TYPES_NOT_YET_WALKED` and
  // the offered set moves with it, TRIS_EARLY_CONVERSION's own precedent from being left alone.
  // **11 → 12 / 10 → 11 on 2026-09-22 (P3-19 microtask 4), and the offered set moved WITH it.**
  // `SPOUSE_CONTRIBUTION` gained a parser AND a dedicated `projection.ts` branch in the same change
  // — it never passed through `ENTRY_TYPES_NOT_YET_WALKED` at all, `MORTGAGE_REFINANCE`'s own
  // precedent for a type shipped whole in one step.
  // **12 → 13 / 11 → 12 on 2026-09-23, and the offered set moved WITH it.** `MORTGAGE_PAYOFF`
  // gained its parser, its branch in the walk and its form control in one change —
  // `MORTGAGE_REFINANCE`'s precedent for a type shipped whole.
  // **13 → 14 / 12 → 13 the same day: `TTR_RATE_CHANGE`, shipped whole the same way.**
  // **14 → 15 / 13 → 14 on 2026-09-24: `ILLNESS_SEPARATION` (P12-4), shipped whole the same way.**
  // **15 → 16 / 14 → 15 the same day: `DEATH` (P12-1), shipped whole the same way.**
  // **16 → 17 on 2026-09-24 (P14-13, slice 3a), and the offered set did NOT move with it.**
  // `ENTER_CARE` (renamed from the unspecified `CARE_EVENT` placeholder) gained a parser and a
  // walk branch honouring it WHOLE in the same change — `TRIS_EARLY_CONVERSION`'s own third reason
  // — but `entryForm.ts` had no control for its three params yet, so it joined
  // `ENTRY_TYPES_NOT_YET_WALKED` (`planEdits.ts`) rather than moving straight to offered.
  // **15 → 16 the same day (slice 3b).** `entryForm.ts` gained the control (`enterCareEntry`,
  // `MORTGAGE_REFINANCE`'s own three-required-boxes shape) and `ENTER_CARE` leaves
  // `ENTRY_TYPES_NOT_YET_WALKED`, the offered set moving with it.
  // **Then 17 → 18 constructible (P9-1, slice 1), offered unchanged:** `HEAS_DRAW` gained a parser and a
  // walk branch but no form control, so it joined `ENTRY_TYPES_NOT_YET_WALKED`.
  // **16 → 17 the next day (P9-1, slice 2).** `entryForm.ts` gained the control (`heasDrawEntry`,
  // `sacrificeKind`'s own union-by-select shape) and `HEAS_DRAW` leaves `ENTRY_TYPES_NOT_YET_WALKED`,
  // the offered set moving with it — `TRIS_EARLY_CONVERSION` is again the only name left in it.
  // **18 → 19 / 17 → 18 the same day (P14-13): `SELL_HOME` gained its parser, its branch in the
  // walk and its form control in one change — `MORTGAGE_REFINANCE`'s own precedent for a type
  // shipped whole.**
  // **19 → 20 / 18 → 19 the same day (P14-13): `RENT_OUT_HOME`, shipped whole the same way.**
  // **20 → 21 / 19 → 20 the same day (P14-19): `BUY_HOME`, shipped whole the same way.**
  // **21 → 22 / 20 → 21 the same day (P9-5): `DOWNSIZER_CONTRIBUTION`, shipped whole the same way.**
  // **22 → 23 / 21 → 22 the same day (P3-17a slice 3): `INSURANCE_COVER_CHANGE`, shipped whole the same way.**
  // **23 → 24 / 22 → 23 on 2026-09-29 (retire flow S4): `TTR_START`, shipped whole the same way.**
  assert.equal(CONSTRUCTIBLE_ENTRY_TYPES.length, 24);
  assert.equal(OFFERED_ENTRY_TYPES.length, 23);
  assert.deepEqual([...ENTRY_TYPES_NOT_YET_WALKED], ['TRIS_EARLY_CONVERSION']);
  // The loop below is what the blanket equality above used to be while the list was empty: the
  // list is the one place the door/walk gap can be held open, and it is not empty any more.
  for (const type of ENTRY_TYPES_NOT_YET_WALKED) {
    assert.ok(CONSTRUCTIBLE_ENTRY_TYPES.includes(type), `${type} is held back from a form that was never going to offer it`);
    assert.ok(!OFFERED_ENTRY_TYPES.includes(type), `${type} is offered and the walk does not act on it`);
  }
  // And the complement holds exactly: every constructible type not held back IS offered.
  const heldBack = new Set(ENTRY_TYPES_NOT_YET_WALKED);
  assert.deepEqual(
    [...CONSTRUCTIBLE_ENTRY_TYPES].filter((type) => !heldBack.has(type)).sort(),
    [...OFFERED_ENTRY_TYPES].sort(),
    'a constructible type is neither held back nor offered',
  );
});

test('the walk dispatches on the six it honours WHOLE, plus exactly one it honours in part', () => {
  // The list is hand-written because nothing can derive it — `projection.ts` dispatches with
  // scattered `entry.type === …` comparisons and no exhaustive switch.
  //
  // ⚠️ **THIS TEST NARROWED ON 2026-09-19 AND WAS NOT DELETED (P6-8 brief 2, chunk 1).** It used to
  // read *"the walk dispatches on the six and on nothing else"* and to fail the moment any
  // not-yet-walked name appeared in a dispatch, with the instruction "take it out of
  // ENTRY_TYPES_NOT_YET_WALKED and give the form its builder". That rule assumed dispatch is all or
  // nothing. Chunk 1 broke the assumption: `projection.ts` now reads a `SUPER_CONTRIBUTION` and
  // reduces the salary it ASSESSES, ~~while the pay packet (chunk 3) and the fund balance (chunk 4)
  // are untouched~~ — **and from chunk 3 (2026-09-20) the pay packet falls too, leaving only the
  // fund balance and its 15% (chunk 4). The money now LEAVES and does not ARRIVE, so the half that
  // is missing has flipped the build's error from flattering to conservative without making the
  // type offerable.** Half a branch is not a reason to offer the type — it is the reason not to — so
  // the rule the test defends is now the narrower one: **a held-back type may be dispatched on, and
  // the partial set is written out by name here.** Widen it by one more name only with the same
  // kind of paragraph saying what is half-done.
  //
  // Read off the RAW source, because the names are string literals and `executableCode` blanks
  // them. The stripped source is the positive control that the dispatch is real code and not prose.
  const raw = read('core', 'projection.ts');
  const dispatched = new Set([...raw.matchAll(/entry\.type (?:===|!==) '([A-Z_]+)'/g)].map(([, name]) => name));
  assert.ok(executableCode(raw).includes('entry.type ==='), 'projection.ts no longer dispatches on entry.type in CODE — this check is reading comments');
  // ⚠️ **`MORTGAGE_TARGET` NARROWS THIS RULE ON ITS OWN GROUND, 2026-09-22 (P3-16a microtask 5) —
  // NOT "half a branch", a FOURTH reason, and the opposite direction from every one above: it is
  // offered and dispatched on NOWHERE, by design.** `outcomes.ts`'s `mortgageTargets` never reads a
  // walked `Month` at all — the comparison is the entry's own `date` against `retirementMonths`'s
  // answer — and the generic `appliedEntryIds` bucketing (`projection.ts`) already cites the entry
  // in its own month with no `entry.type === 'MORTGAGE_TARGET'` anywhere. So this is also the
  // tripwire against the mistake the brief that built this named directly: a later author adding a
  // dispatch branch "to be safe" would make this assertion fail, not pass.
  const NO_BRANCH_NEEDED = ['MORTGAGE_TARGET'];
  assert.ok(!dispatched.has('MORTGAGE_TARGET'), 'MORTGAGE_TARGET gained a walk branch it was ruled not to need');
  // Every OTHER type the form offers IS dispatched on: a builder for a type the walk ignores is the
  // original defect and it is still asserted, unnarrowed.
  for (const type of OFFERED_ENTRY_TYPES) {
    if (NO_BRANCH_NEEDED.includes(type)) continue;
    assert.ok(dispatched.has(type), `the form offers ${type} and projection.ts never looks at it`);
  }
  // And the only name dispatched on beyond the offered types is one held back in part — **which
  // from 2026-09-20 (chunk 5) was NONE, and is ONE again from 2026-09-22.**
  //
  // ⚠️ **`TRIS_EARLY_CONVERSION` (P3-8's conversion limb) is dispatched on, and the reason it is
  // held back is NOT the "half a branch" reason this list's name describes.** The walk honours the
  // entry WHOLE: a validating entry's `date` is the conversion day, exactly as stated, and
  // `SuperInterest.phase` actually flips from it — the money-moving defect this type existed to fix
  // is closed, not half-closed. What is still missing is a FORM BUILDER: `entryForm.ts` offers no
  // control for `interestIndex` or a conversion day for this type, so `OFFERED_ENTRY_TYPES` cannot
  // move without also shipping one, and building that UI is separate, later work (not part of the
  // core wiring this item was). So this is a NEW third reason a type sits in
  // `ENTRY_TYPES_NOT_YET_WALKED` beside "no parser" and "half a branch": **fully walked, held back
  // by the form alone** — and it is written out here rather than silently reusing the "half-done"
  // language the array's name suggests, on this test's own precedent for naming what changed.
  //
  // ⚠️ **`RETURN_CHANGE` PASSED THROUGH THIS SAME BUCKET FOR ONE COMMIT, 2026-09-22 (P2-11
  // microtask 3), AND LEFT IT THE NEXT (microtask 4).** Its engine branch landed here first — the
  // same "parser before a branch, and a branch before a form control" order `TRIS_EARLY_CONVERSION`
  // took — and once `entryForm.ts` gained `returnChangeEntry` it moved to `OFFERED_ENTRY_TYPES` and
  // out of this list, so it is asserted in the main loop above rather than named here.
  //
  // ⚠️ **`ENTER_CARE` (P14-13, slice 3a) PASSED THROUGH THIS SAME BUCKET, ONE DAY, AND LEFT IT
  // THE SAME DAY (slice 3b)** once `entryForm.ts` gained its control; it is asserted in the main loop.
  //
  // ⚠️ **`HEAS_DRAW` (P9-1, slice 1) PASSED THROUGH THIS SAME BUCKET, ONE DAY, AND LEFT IT THE
  // NEXT (slice 2)** once `entryForm.ts` gained its control; it is asserted in the main loop above.
  const PARTIALLY_WALKED = ['TRIS_EARLY_CONVERSION'];
  const extra = [...dispatched].filter((type) => !OFFERED_ENTRY_TYPES.includes(type));
  assert.deepEqual(extra.sort(), PARTIALLY_WALKED, 'the walk and the form disagree about which entry types this build honours');
  for (const type of PARTIALLY_WALKED) {
    assert.ok(ENTRY_TYPES_NOT_YET_WALKED.includes(type), `${type} is dispatched on and nothing holds it back from the form`);
  }
  // The tripwire that replaces the deleted one, and it is SHARPER rather than looser: the things
  // the chunks leave undone are named as source facts, and **one of the two has now fired.**
  //
  // ⚠️ **IT WENT RED ON 2026-09-20 AND WAS RE-DERIVED, WHICH IS WHAT IT WAS FOR.** It used to read
  // `monthlyFromAnnual(salaries[index] …)` and say *"the cash Salary line is no longer a twelfth of
  // the GROSS salary — chunk 3 has landed"*. Chunk 3 landed. The line is now a twelfth of
  // `assessableSalaries` — the salary ACTUALLY RECEIVED — so the assertion is inverted rather than
  // deleted: the gross must not come back, and the second `doesNotMatch` is the half that says so,
  // because a regression here pays the household money it never held and hands it to the Waterfall.
  // The description moved into `salaryDescription` on 2026-09-23 (plan_ai.md §13 microtask 2), so
  // the financial-year summariser reads the same expression the walk writes; the pin follows it.
  assert.match(raw, /description: salaryDescription\(person\.name\), amount: monthly/, 'the Salary line no longer reads the figure this tripwire watches');
  assert.match(raw, /const monthly = monthlyFromAnnual\(assessableSalaries\[index\] \?\? toCents\(0\)\)/, 'the cash Salary line is no longer a twelfth of the salary RECEIVED — has chunk 3 been reverted?');
  assert.doesNotMatch(executableCode(raw), /monthlyFromAnnual\(salaries\[index\]/, 'the GROSS salary is being paid out as cash again');
  // ⚠️ **The count is taken over the STRIPPED source from P6-8 brief 2 chunk 2, and it fell from
  // five to four without a line of code changing.** Chunk 1 counted the raw file, and one of its
  // five was a sentence in a comment — `asSaptoPerson`'s note that the sacrifice is capped at the
  // pay it comes out of — which chunk 2 rewrote when it replaced the gross reconstruction with a
  // real add-back. A tripwire that a paragraph can trip says nothing about where the money goes, so
  // it now counts the four places the identifier is CODE: where it is computed, where it is taken
  // off the assessable salary, where it is handed to `assessHousehold` for the add-back, and where
  // the year's accumulator banks a twelfth of it. Crediting a fund balance or charging the 15%
  // would be a fifth.
  //
  // ⚠️ **CHUNK 3 DID NOT MOVE THIS COUNT, AND THAT IS A PROPERTY OF THE FIX RATHER THAN AN
  // OVERSIGHT.** Taking the sacrifice out of the pay packet is spelled as *reading
  // `assessableSalaries` a second time*, not as *subtracting `sacrificedThisMonth` a second time*:
  // one subtraction exists in the walk, so the cash and the assessment cannot round differently or
  // drift apart, and `assessable + sacrificed === gross` is still one expression's worth of
  // arithmetic. A fifth site would therefore still be chunk 4 crediting the fund, which is exactly
  // what this count is watching for.
  //
  // ⚠️ **AND CHUNK 4 MOVED IT TO FIVE ON 2026-09-20 — THE SITE IS NAMED, NOT COUNTED.** The fifth
  // reading is `monthlyFromAnnual(sacrificedThisMonth[personIndex] ?? toCents(0))` in
  // `contributionsThisMonth`, which is the month's sacrifice on its way into
  // `concessionalContributions` and then into the interest the entry named. It is a READING, like
  // chunk 3's: the amount contributed is the amount already removed, so there is still exactly one
  // `Math.min` and one annual→monthly division of the LEVEL in the walk, and the pay packet and the
  // fund cannot disagree by a rounding. **A SIXTH site would be a new fact and should be argued
  // for, not absorbed** — the cap (chunk 5) is expected to read the arrangement, not this figure.
  //
  // ⚠️ **AND BRIEF 3 CHUNK 1 ARGUED FOR A SIXTH ON 2026-09-20, WHICH IS WHAT THE PARAGRAPH ABOVE
  // ASKED FOR.** The sixth reading is `sacrificedThisMonth[index] ?? toCents(0)` in the
  // Superannuation Guarantee block, where it is the s 10A(1)(h) limb of the SG earnings base —
  // **added back**, so the Guarantee is charged on the PRE-sacrifice figure (T17). It qualifies on
  // the same ground as the fourth and the fifth: it is a READING of the figure the one `Math.min`
  // above already decided, not a second derivation of it, so the amount removed from the pay and
  // the amount added back to the earnings base cannot differ by a cent. It moves NO money — chunk 1
  // credits the Guarantee to nothing and surfaces it in `Month.notes` — so the count rose without
  // any figure in any walk moving. A SEVENTH site is chunk 2 crediting the Guarantee, and it should
  // be argued for here in the same way.
  //
  // ⚠️ **AND BRIEF 3'S FINAL CHUNK ARGUED FOR THE SEVENTH — NOT THE ONE THAT WAS PREDICTED.**
  // Chunk 2b credited the Guarantee without reading this figure at all (it reads
  // `salarySacrificedAmounts`, the sixth site, which it already had). The seventh is
  // `salarySacrificed: sacrificedThisMonth[index] ?? toCents(0)` in the CONCESSIONAL CAP check,
  // where it is the s 291-25 sacrifice limb of the total measured against the year's general cap.
  // It qualifies on the same ground as the fourth, fifth and sixth: a READING of the figure the one
  // `Math.min` already decided, not a second derivation — so the amount contributed and the amount
  // measured against the cap cannot differ by a cent, and a Person whose stated arrangement is
  // larger than their pay is tested on what this build will actually contribute. The paragraph
  // above predicted the cap would read *the arrangement* rather than this figure; it reads this
  // figure, deliberately, and the reason is recorded at the call site. **An EIGHTH site is a new
  // fact and should be argued for here in the same way.**
  assert.match(executableCode(raw), /monthlyFromAnnual\(sacrificedThisMonth\[personIndex\] \?\? toCents\(0\)\)/, 'the fund credit no longer reads the sacrifice this tripwire counts — has chunk 4 been reverted?');
  assert.match(executableCode(raw), /const salarySacrificedAmounts = sacrificedThisMonth\[index\] \?\? toCents\(0\)/, 'the SG earnings base no longer reads the sacrifice — has the T17 add-back been reverted?');
  //
  // ⚠️ **AND P6-9 CHUNK 3 ARGUED FOR THE EIGHTH, AS THE PARAGRAPH ABOVE ASKED.** Two things moved
  // on 2026-09-20. The seventh site is no longer spelled `salarySacrificed: sacrificedThisMonth…`
  // but as the second argument to `concessionalComponentsOf(…)`, because the cap check and the
  // year-end Division 293 settlement now build the four s 291-25 limbs through ONE helper instead
  // of two object literals — the same figure, named once instead of twice. And the EIGHTH reading
  // is `div293IncomesOn(fy, assessableSalaries, sacrificedThisMonth, …)`, where the month's
  // sacrifice is handed to the Division 293 income base for the add-back — the same ground as the
  // third site, which hands it to `assessHousehold` for Rebate Income's. It is a READING of the
  // figure the one `Math.min` already decided, so the amount taken out of the pay, the amount
  // measured against the cap, the amount contributed and the amount added back into the Division
  // 293 base cannot differ by a cent. **A NINTH site is a new fact and should be argued for here in
  // the same way.**
  assert.match(executableCode(raw), /concessionalComponentsOf\(\n\s*guaranteeForTheYear\[index\] \?\? toCents\(0\),\n\s*sacrificedThisMonth\[index\] \?\? toCents\(0\),\n\s*\)/, 'the concessional cap check no longer reads the month’s sacrifice');
  // The fourth argument was `NO_CAPITAL_GAIN` until 2026-09-23 and is the month's annualised
  // interest on cash now — taxable income, so in the base. `RENT_OUT_HOME`'s net rent joined the
  // base too (P14-13, 2026-09-25), through a SIXTH argument rather than folded into the fourth: a
  // rental LOSS is negative, and `gains` feeds a capital-gain slot that s 102-5 forbids from ever
  // being negative (`asSaptoPerson`'s own `otherIncome` parameter). The sacrifice argument is unchanged.
  assert.match(executableCode(raw), /div293IncomesOn\(fy, assessableSalaries, sacrificedThisMonth, cashInterestAnnualised, qualifiedThisMonth, rentAnnualised\)/, 'the Division 293 income base no longer reads the month’s sacrifice');
  assert.equal([...executableCode(raw).matchAll(/sacrificedThisMonth/g)].length, 8, 'the sacrifice reaches a different number of places in CODE than P6-9 chunk 3 left it in');
});

test('the buy branch and the sell branch cannot reach each other’s inputs', () => {
  // The union's shape, as source: `incidentalCostsOfAcquisition` is read in the BUY call and
  // nowhere else, `parcelSelection` in the SELL call and nowhere else. A single flat call carrying
  // both would produce a plan the door refuses on a field the user never filled in —
  // `test/app-plan-edits.test.mjs` §9 shows that refusal happening.
  const buyCall = /nonSuperInvestmentBuyEntry\([\s\S]*?createdAt,\s*\)/.exec(FORM)[0];
  const sellCall = /nonSuperInvestmentSellEntry\([\s\S]*?createdAt,\s*\)/.exec(FORM)[0];
  assert.match(buyCall, /incidentalCostsOfAcquisition: incidentalCostsOfAcquisition\.value/);
  assert.doesNotMatch(buyCall, /parcelSelection/, 'the buy reads the sell’s box');
  assert.match(sellCall, /parcelSelection: parcelSelection\.value/);
  assert.doesNotMatch(sellCall, /incidentalCostsOfAcquisition/, 'the sell reads the buy’s box — parsePlan refuses that entry');
  // Which of the two runs is decided by the discriminant itself, not by a field being blank.
  assert.match(FORM, /direction\.value === ""/);
  // And the fields a branch does not own are not on the page either.
  assert.match(FORM, /buyFields\.hidden = direction\.value !== ""/);
  assert.match(FORM, /sellFields\.hidden = direction\.value !== ""/);
});

// --- §5b The work-pattern boxes: `planEdits.ts` decides the words, this file only wires them in -

test('the entry-point notice is read off planEdits.ts, not a second copy of the words', () => {
  // Named import, not a duplicated string literal: two copies of the same guidance can drift, and
  // the whole point of deciding the words in the pure layer is that there is exactly one of them.
  const namedImports = /import \{([\s\S]*?)\} from '\.\/planEdits\.js';/.exec(FORM_RAW)[1];
  assert.match(namedImports, /\bDAYS_PER_WEEK_ENTRY_NOTICE\b/, 'entryForm.ts no longer imports the entry-point notice');
  assert.match(FORM, /daysPerWeekNotice = infoButton\(DAYS_PER_WEEK_ENTRY_SUMMARY, DAYS_PER_WEEK_ENTRY_NOTICE, ""\)/, 'the notice element no longer carries the imported text (mutation a)');
  // It sits with the work-pattern boxes, not off on its own where a user filling in the form would
  // never see it — the field group is the one place read before every submit.
  assert.match(FORM, /group\(label\(""\, daysPerWeek\), label\(""\, annualSalary\), daysPerWeekNotice\)/, 'the notice is no longer placed with the work-pattern fields');
});

test('the withdrawal notice is read off planEdits.ts too, and sits with the withdrawal boxes', () => {
  // The second notice, wired exactly as the first: one copy of the words, in the pure layer, in
  // the field group the user reads before submitting — not a tooltip and not a banner they meet
  // only after a refusal.
  const namedImports = /import \{([\s\S]*?)\} from '\.\/planEdits\.js';/.exec(FORM_RAW)[1];
  assert.match(namedImports, /\bLUMP_SUM_ENTRY_NOTICE\b/, 'entryForm.ts no longer imports the withdrawal notice');
  assert.match(FORM, /lumpSumNotice = infoButton\(LUMP_SUM_ENTRY_SUMMARY, LUMP_SUM_ENTRY_NOTICE, ""\)/, 'the notice element no longer carries the imported text');
  assert.match(FORM, /group\(label\(""\, lumpSumAmount\), label\(""\, interestIndex\), lumpSumNotice\)/, 'the notice is no longer placed with the withdrawal fields');
  // The builder reads ITS OWN boxes: the withdrawal amount is not the one-off expense's box.
  const call = /lumpSumFromSuperEntry\([\s\S]*?createdAt,\s*\)/.exec(FORM)[0];
  assert.match(call, /amount: lumpSumAmount\.value/);
  assert.match(call, /interestIndex: interestIndex\.value/);
});

test('the salary-sacrifice notice is read off planEdits.ts too, and sits with its own boxes', () => {
  // The third notice, wired exactly as the first two (P6-8 brief 2 chunk 5). It is the only place
  // on the page that says what the cap refusal does NOT cover — the Superannuation Guarantee, Div
  // 293, and an amount above the pay — so a copy of the words here rather than an import is the
  // drift that would leave the form and the row saying different things.
  const namedImports = /import \{([\s\S]*?)\} from '\.\/planEdits\.js';/.exec(FORM_RAW)[1];
  assert.match(namedImports, /\bSUPER_CONTRIBUTION_ENTRY_NOTICE\b/, 'entryForm.ts no longer imports the salary-sacrifice notice');
  assert.match(FORM, /contributionNotice = infoButton\(SUPER_CONTRIBUTION_ENTRY_SUMMARY, SUPER_CONTRIBUTION_ENTRY_NOTICE, ""\)/, 'the notice element no longer carries the imported text');
  // **The placement moved on 2026-09-21 and the pin moved WITH it rather than being dropped**
  // (P6-8 brief 4). The two figure boxes are now a group of their own, because the stop branch
  // hides them; the notice sits beside the whole thing, which is where a user meets it before
  // submitting either shape.
  assert.match(FORM, /sacrificeAmountFields = group\([\s\S]*?label\(""\, sacrificeAmount\),\s*label\(""\, contributionInterestIndex\),\s*\)/, 'the two figure boxes are no longer one group');
  assert.match(FORM, /sacrificeFields = group\(label\(""\, sacrificeKind\), sacrificeAmountFields, sacrificeStopFields, contributionNotice\)/, 'the notice is no longer placed with the salary-sacrifice fields');
  // The builder reads ITS OWN boxes: the amount sacrificed is not the withdrawal's box, and the
  // interest it pays INTO is not the interest the withdrawal comes OUT of.
  const call = /superContributionEntry\([\s\S]*?createdAt,\s*\)/.exec(FORM)[0];
  assert.match(call, /annualAmount: sacrificeAmount\.value/);
  assert.match(call, /interestIndex: contributionInterestIndex\.value/);
  assert.doesNotMatch(call, /lumpSumAmount|\binterestIndex\.value/, 'the contribution is reading the withdrawal’s boxes');
  // ~~`kind` is written by the pure layer and is not a box on the form: three of the four kinds are
  // refused by name at the door, and a selector here would invite them back.~~
  //
  // **THERE IS A `kind` SELECTOR FROM 2026-09-21 (P6-8 brief 4), AND THE PROPERTY THE OLD PIN HELD
  // IS THE ONE RE-STATED HERE: the three unspecified kinds are still not offerable.** The selector
  // carries exactly two values — the arrangement and the stop — and the assertion is over the
  // option VALUES read off the raw source, because the stripped code has blanked them.
  //
  // ⚠️ **SCOPED TO THE `sacrificeKind` SELECTOR'S OWN BLOCK FROM 2026-09-25 (P9-1, slice 2).** A
  // sweep of the WHOLE file would also catch `heasFortnightlyKind`'s two options (`'stated'`,
  // `'maximum'`) — a second, unrelated selector built the same way — so the block is isolated first.
  const sacrificeKindBlock = /sacrificeKind = labelledSelect\('sacrificeKind', \[([\s\S]*?)\]\)/.exec(FORM_RAW)[1];
  const options = [...sacrificeKindBlock.matchAll(/value: '([a-zA-Z]+)', label: '[^']*'/g)].map(([, value]) => value);
  assert.deepEqual(options, ['salarySacrificed', 'stopped'], 'the kind selector offers something other than the arrangement and the stop');
  for (const unspecified of ['employer', 'personalDeductible', 'nonConcessional', 'superGuarantee']) {
    assert.ok(!options.includes(unspecified), `the form offers kind "${unspecified}", which the door refuses by name`);
  }
  // The stop's builder takes the date, the owner and the note and NOTHING else — no amount box can
  // ride along on it, which is the property hiding the boxes exists to give.
  const stop = /superContributionStopEntry\([\s\S]*?createdAt\)/.exec(FORM)[0];
  assert.doesNotMatch(stop, /sacrificeAmount|contributionInterestIndex/, 'a stop is reading the arrangement’s boxes');
});

test('the WORK_PATTERN_CHANGE builder reads BOTH boxes, and the row states the salary it wrote', () => {
  // ⚠️ **What this replaces, and why (2026-09-19).** Two tests stood here: one that a non-zero
  // `daysPerWeek` is labelled "not modelled" in the journal row, and one that the row carries a
  // `data-not-modelled` attribute for the stylesheet. Both pinned a disclosure whose subject was
  // that a positive number of days reached no figure at all. The entry now states an
  // `annualSalary`, `projection.ts` applies it, and a row painted as unmodelled would be telling
  // the reader to distrust a correct figure. So the pins move to the two properties that took the
  // warning's place: the second box is READ, and the row shows the money.
  const builder = /WORK_PATTERN_CHANGE: \(id, createdAt\) =>[\s\S]*?\),\n/.exec(FORM)[0];
  assert.match(builder, /daysPerWeek: daysPerWeek\.value/, 'the days box is no longer read');
  assert.match(builder, /annualSalary: annualSalary\.value/, 'the salary box is not read — the form would post an entry the door refuses');

  // The row's text is a template literal, so it is read off `literals` and not off the stripped
  // code, which blanks every literal it finds (§1's transform, and this file's own header on why).
  const words = literals(FORM_RAW).join('\n');
  assert.match(words, /Add entry/, 'the positive control: `literals` found no words at all');
  assert.match(words, /\$\{entry\.params\.daysPerWeek\} days a week at \$\{formatDollars\(entry\.params\.annualSalary\)\} a year/, 'the row no longer says how many days at what salary — and the salary has no other place on the page');

  // AND THE RETIRED WARNING IS GONE FROM BOTH SURFACES. The positive control first: this file does
  // still write dataset attributes, so "no `notModelled`" is not an artefact of a walker finding
  // nothing at all.
  const renderEntryListBody = /const renderEntryList[\s\S]*?\n\};/.exec(FORM)[0];
  assert.match(renderEntryListBody, /tr\.dataset\[""\] = /, 'the positive control: no dataset write remains at all, so the absence below proves nothing');
  assert.doesNotMatch(renderEntryListBody, /notModelled/, 'the row flags a WORK_PATTERN_CHANGE as not modelled again');
  assert.doesNotMatch(FORM, /workPatternChangeDisclosure/, 'the disclosure is called again');
  const html = readFileSync(join(SRC, '..', 'public', 'index.html'), 'utf8');
  // `div.entry` became `tr.entry` on 2026-09-22 when the list became a table; the row still
  // carries `data-enabled`, and the stylesheet still paints a switched-off one differently.
  assert.match(html, /#entry-list tr\.entry\[data-enabled="false"\]/, 'the positive control: index.html no longer styles the journal rows at all');
  assert.doesNotMatch(html, /data-not-modelled="true"\]/, 'the warning colour is back on a row that is now fully modelled');
});

// --- §6 What this file does NOT prove ----------------------------------------------------------

test('the residue, written down rather than implied', () => {
  // Stated as an assertion so it cannot rot silently: these files are read as text here, and the
  // things below are settled by opening the page, not by this suite.
  //
  //   * that `date.value`, `annualSpend.value`, `owner.value` and `note.value` are the values the
  //     user typed — the form is built and read in the same function, and nothing here runs it;
  //   * that the submit handler's `preventDefault` stops the browser navigating;
  //   * that `mountEntryEditor` is reached at all: `main.ts` mounts it only when both boxes exist
  //     in `public/index.html`, and the ids are matched by hand below;
  //   * that Chart.js draws what it is handed (`renderChart.ts`'s own header).
  const html = readFileSync(join(SRC, '..', 'public', 'index.html'), 'utf8');
  for (const id of ['entry-form', 'entry-list', 'plan-status', 'months', 'chart']) {
    assert.match(html, new RegExp(`id="${id}"`), `public/index.html has no #${id} for main.ts to find`);
    assert.match(MAIN_RAW, new RegExp(`'${id}'`), `main.ts no longer looks up #${id}`);
  }
  assert.match(FORM, /event\.preventDefault\(\)/);
});

// --- §6 The home loan's entry — what it is CALLED and what it DISCLOSES (P3-16 slice 2) ---------

test('the loan entry is NOT called a refinance on screen, and the stored value is untouched', () => {
  // The ruling of 2026-09-21: "refinance" is misleading, because this one type also takes a loan
  // OUT for a household that has none, and someone buying their first home would never look under
  // it. The split `entryLabels.ts` exists for — the value is the code identifier the file stores,
  // the label is the sentence a person reads.
  assert.equal(entryTypeLabel('MORTGAGE_REFINANCE'), 'Home loan — set or change the terms');
  assert.equal(ENTRY_TYPE_LABELS.MORTGAGE_REFINANCE, entryTypeLabel('MORTGAGE_REFINANCE'));
  const pinsLabel = (text) => {
    assert.ok(text.trim().length > 20, `the loan entry label is a stub: ${JSON.stringify(text)}`);
    assert.doesNotMatch(text, /refinanc/i, 'the loan entry is called a refinance on screen');
    assert.match(text, /home loan/i, 'the label does not say what it is about');
    assert.equal(new Set(Object.values(ENTRY_TYPE_LABELS)).size, Object.values(ENTRY_TYPE_LABELS).length, 'two entry types share one label');
  };
  pinsLabel(ENTRY_TYPE_LABELS.MORTGAGE_REFINANCE);
  // The pin fails on emptied text and on the wording it replaced — otherwise it is about nothing.
  assert.throws(() => pinsLabel(''), /stub/);
  assert.throws(() => pinsLabel('Refinance the home loan'), /called a refinance/);
  assert.throws(() => pinsLabel('Set or change the terms'), /what it is about/);
  // ⚠️ The VALUE is what `plan.json` holds and what `parsePlan` reads. It does not move.
  assert.ok(ENTRY_TYPES.includes('MORTGAGE_REFINANCE'));
  assert.deepEqual(
    entryTypeOptions(['MORTGAGE_REFINANCE']),
    [{ value: 'MORTGAGE_REFINANCE', label: 'Home loan — set or change the terms' }],
  );
});

test('the loan entry names the four things it cannot do, and the pin fails on emptied text', () => {
  // Ruling 4 of 2026-09-21: an early discharge is NOT modelled and must be named beside the redraw
  // and the extra repayment, because a user reaching for a balance of zero to say "we paid it out"
  // meets a refusal and must be told why it is a refusal and not a bug. ⚠️ **P17-3 (2026-09-28)
  // moved the list of four to the guide section the box links to** — a box no longer restates a
  // rule — so the pin moved with it: the box says what the entry does and points at the payoff
  // entry; the guide names what it cannot do. Both halves still fail on emptied text.
  const GUIDE = readFileSync(join(SRC, '..', 'userguide.md'), 'utf8');
  const guide = GUIDE.slice(GUIDE.indexOf('{#refinancing}'), GUIDE.indexOf('{#selling-the-home}'));
  const pinsGuide = (text) => {
    assert.ok(text.trim().length > 400, `the guide's loan-terms section is a stub: ${JSON.stringify(text)}`);
    assert.match(text, /lump sum/i, 'the guide does not name paying the loan out early');
    assert.match(text, /redraw/i, 'the guide does not name a redraw');
    assert.match(text, /extra repayments?/i, 'the guide does not name an extra repayment');
    assert.match(text, /interest-only/i, 'the guide does not name an interest-only period');
    assert.match(text, /Paying part of the loan/, 'the guide says a whole-loan payout is not modelled');
  };
  pinsGuide(guide);
  assert.throws(() => pinsGuide(''), /stub/);
  assert.throws(() => pinsGuide(guide.replaceAll('lump sum', 'something')), /paying the loan out early/);
  assert.throws(() => pinsGuide(guide.replaceAll('redrawing', 'reborrowing')), /a redraw/);
  const pinsNotice = (text) => {
    assert.ok(text.trim().length > 100, `the loan entry notice is a stub: ${JSON.stringify(text)}`);
    assert.match(text, /all three/i, 'the notice does not say that all three figures must be stated');
    assert.match(text, /Home loan — pay off in full/, 'the notice does not point at the payoff entry');
    assert.notEqual(text, MORTGAGE_ENTRY_SUMMARY);
  };
  pinsNotice(MORTGAGE_ENTRY_NOTICE);
  assert.throws(() => pinsNotice(''), /stub/);
  // The summary is the line that stays on the page: short, and it says the entry also makes a loan.
  assert.ok(MORTGAGE_ENTRY_SUMMARY.trim().length > 40 && MORTGAGE_ENTRY_SUMMARY.length < 200, MORTGAGE_ENTRY_SUMMARY);
  assert.match(MORTGAGE_ENTRY_SUMMARY, /new loan/i);
  assert.doesNotMatch(MORTGAGE_ENTRY_SUMMARY, /refinanc/i);
  // The notice reaches the form: the boxes, the builder and the button are all wired to this type,
  // and the box links to the guide section the four things are named in.
  assert.match(FORM, /MORTGAGE_REFINANCE: group\(/);
  assert.match(FORM_RAW, /MORTGAGE_ENTRY_SUMMARY, MORTGAGE_ENTRY_NOTICE, 'guide:refinancing'/);
  // ⚠️ **The day-1 loan's own notice had a sentence that STOPPED BEING TRUE and was rewritten**:
  // it said there was no way to say that the rate changes or to refinance. Both are sayable now.
  assert.doesNotMatch(MORTGAGE_NOTICE, /no way yet to say that the[\s\S]*rate changes/);
  assert.match(MORTGAGE_NOTICE, /Home loan — set or change the terms/, 'the settings panel does not point at the entry that changes the loan');
  assert.match(MORTGAGE_NOTICE, /Home loan — pay off in full/, 'the settings panel does not point at the entry that pays the loan off');
});

// --- Super accounts are numbered from 1 wherever the page shows one (ruling, 2026-09-24) -----------
//
// The settings panel already said "Super account 1"; the entry form asked for "0 is the first" and
// the entry table echoed the stored position. The file keeps the position counted from 0.

test('the entry table names a super account from 1, while the entry stores its position from 0', () => {
  assert.equal(superAccountName(0), 'super account 1');
  const made = (type, params) => ({ id: type, date: '2030-01-01', owner: 'personA', type, params, enabled: true, createdAt: '2026-09-24' });
  const rows = [
    [made('LUMP_SUM_FROM_SUPER', { amount: 5_000_000, interestIndex: 0 }), ' out of super account 1'],
    [made('SUPER_CONTRIBUTION', { kind: 'salarySacrificed', annualAmount: 1_000_000, interestIndex: 1 }), ' salary sacrificed into super account 2'],
    [made('SPOUSE_CONTRIBUTION', { amount: 300_000, receivingInterestIndex: 0 }), " into your spouse's super account 1"],
    [made('TTR_RATE_CHANGE', { interestIndex: 2, drawdownRate: 0.07 }), 'super account 3 pays 7%'],
    [made('INSURANCE_COVER_CHANGE', { interestIndex: 0, benefit: 'death', coverFraction: 0 }), 'super account 1: death cover cancelled'],
    [made('INSURANCE_COVER_CHANGE', { interestIndex: 1, benefit: 'both', coverFraction: 0.5 }), 'super account 2: death and TPD cover cut to 50%'],
  ];
  for (const [entry, words] of rows) {
    const summary = entrySummary(entry);
    assert.ok(summary.includes(words), `${entry.type} reads: ${summary}`);
    assert.doesNotMatch(summary, /super account 0|interest \d/, `${entry.type} shows the stored position: ${summary}`);
  }
});

test('the boxes that take a super account count from 1, and the file holds the same position it always did', () => {
  for (const [file, raw] of [['entryForm.ts', FORM_RAW], ['comparisonTemplateForm.ts', read('app', 'comparisonTemplateForm.ts')]]) {
    assert.doesNotMatch(raw, /0 is the first|0 for the first|Superannuation interest /, `${file} still counts from 0`);
  }
  assert.equal([...FORM_RAW.matchAll(/— 1 is the first'|— 1 is the first"/g)].length, 8, 'the eight account boxes do not all say where they count from');
  // Typed 1 → stored 0, for each builder that takes an account; and the file round-trips unchanged.
  const plan = parsePlan(DEMO_PLAN);
  const built = [
    lumpSumFromSuperEntry({ date: '2033-01-01', owner: 'personA', amount: '50,000', interestIndex: '1', note: '' }, 'ls', '2026-09-24'),
    superContributionEntry({ date: '2026-11-01', owner: 'personA', annualAmount: '20,000', interestIndex: '1', note: '' }, 'sc', '2026-09-24'),
    spouseContributionEntry({ date: '2033-01-01', owner: 'personB', amount: '3,000', receivingInterestIndex: '1', note: '' }, 'sp', '2026-09-24'),
    downsizerContributionEntry({ date: '2033-02-01', owner: 'personA', amount: '100,000', receivingInterestIndex: '1', ownedTenYears: 'yes', note: '' }, 'dc', '2026-09-24'),
  ];
  const sold = planWithEntry(plan, { id: 'sold', date: '2033-01-01', owner: 'household', type: 'SELL_HOME', params: { salePrice: 90_000_000 }, enabled: true, createdAt: '2026-09-24' });
  for (const entry of built) {
    const saved = parsePlan(planWithEntry(entry.type === 'DOWNSIZER_CONTRIBUTION' ? sold : plan, entry));
    const stored = saved.entries.at(-1).params;
    assert.equal(stored.interestIndex ?? stored.receivingInterestIndex, 0, `${entry.type}: typed account 1 is not stored as position 0`);
    const text = JSON.stringify(saved);
    assert.equal(JSON.stringify(parsePlan(JSON.parse(text))), text, `${entry.type} does not round-trip byte-identical`);
  }
});

// --- No option shows its stored value (P6-13's class, swept 2026-09-24) -----------------------------
//
// The buy/sell box put `buy` and `sell` on the screen through an unlabelled `select(name, values)`
// that made each value its own text. That builder is gone; this sweep pins every place `src/app`
// makes an `<option>`, and what each one shows.

test('the buy/sell box shows plain words and stores buy and sell', () => {
  assert.deepEqual(INVESTMENT_DIRECTION_OPTIONS.map((option) => option.value), ['buy', 'sell']);
  for (const { value, label } of INVESTMENT_DIRECTION_OPTIONS) {
    assert.equal(label, INVESTMENT_DIRECTION_LABELS[value]);
    assert.notEqual(label.toLowerCase(), value, `${value} is shown as itself`);
    assert.match(label, /^[A-Z].* /, `${value}'s label is not a phrase: ${label}`);
  }
  assert.match(FORM, /const direction = labelledSelect\("", INVESTMENT_DIRECTION_OPTIONS\);/);
});

test('every <option> in src/app shows a label, never the value it stores, and there are no others', () => {
  // The option-making sites, file by file. A new one fails this count and must be audited here.
  // `transactionsPanel.ts` (P11-3, 2026-09-28): the money-out/in choice shows a phrase over `out`/`in`;
  // the three Categories are shown as the words they store, which ARE plain words (CONTEXT.md §Category).
  // P11-5 (2026-09-28): the subcategory `<datalist>` suggestion in `transactionsPanel.ts` is the ONE
  // audited exception — a datalist option IS the text it puts in the box, so it has a value and no label.
  const expected = { 'entryForm.ts': 2, 'settingsPanel.ts': 5, 'comparisonTemplateForm.ts': 1, 'transactionsPanel.ts': 2 };
  const DATALIST = { file: 'transactionsPanel.ts', name: 'suggestion' };
  const found = {};
  for (const file of readdirSync(join(SRC, 'app')).filter((name) => name.endsWith('.ts'))) {
    // Found on the RAW text, where the tag name survives stripping; the text assignment is code either way.
    const raw = read('app', file);
    const sites = [...raw.matchAll(/(\w+) = document\.createElement\('option'\);/g)];
    if (sites.length === 0) continue;
    found[file] = sites.length;
    for (const site of sites) {
      const name = site[1];
      const after = raw.slice(site.index, site.index + 400);
      if (file === DATALIST.file && name === DATALIST.name) {
        assert.match(after, /suggestion\.value = name;\s*list\.append\(suggestion\);/, 'the audited datalist site no longer goes into a datalist');
        assert.doesNotMatch(after.split('list.append(suggestion)')[0], /suggestion\.textContent/);
        assert.match(raw.slice(site.index - 600, site.index), /document\.createElement\('datalist'\)/);
        continue;
      }
      const shown = new RegExp(`${name}\\.textContent = ([^;]+);`).exec(after);
      assert.ok(shown, `${file}: an <option> named ${name} is given no text`);
      const stored = new RegExp(`${name}\\.value = ([^;]+);`).exec(after);
      assert.ok(stored, `${file}: an <option> named ${name} stores no value`);
      assert.notEqual(shown[1].trim(), stored[1].trim(), `${file}: an <option> shows exactly what it stores (${shown[1]})`);
      assert.doesNotMatch(shown[1], /value|^option$|^values?\b/, `${file}: an <option> shows its stored value (${shown[1]})`);
    }
  }
  assert.deepEqual(found, expected);
  // The unlabelled builder is not coming back under any name.
  assert.doesNotMatch(FORM, /const select = /);
  assert.doesNotMatch(FORM, /label: value\b/, 'a value is made its own label again');
});

// --- P12-4 — the ENTER_CARE notice points at illness separation, and does not auto-wire it ------
//
// Guide to Social Security Law §2.2.5.60 "Determining an illness separated couple" (SSAct s 4(7)):
// moving permanently into residential aged care is accepted, without extra medical evidence, as
// supporting an illness separated couple — each paid the single rate on the couple's COMBINED
// income and assets — once Services Australia is told. Confirmed live on servicesaustralia.gov.au's
// own rate tables ("A couple, separated due to illness" on /assets-test-for-age-pension; paid
// "each" on /how-much-pension-supplement-you-can-get); guides.dss.gov.au itself sits behind a
// Cloudflare challenge that blocks a plain `curl`, even with a Chrome User-Agent, so §2.2.5.60 was
// read off the Wayback Machine's copy of that same government page.

test('the ENTER_CARE notice points at illness separation, in plain English, and does not wire it', () => {
  const pinsNotice = (text) => {
    assert.ok(text.trim().length > 20, `the illness-separation sentence is a stub: ${JSON.stringify(text)}`);
    assert.match(text, /illness separated/i, 'the notice does not name the illness separated couple');
    assert.match(text, /Illness separation.*entry/, 'the notice does not point at the ILLNESS_SEPARATION entry by its own on-screen name');
    assert.match(text, /same date/, 'the notice does not say the illness separation should be dated the same as the care entry');
  };
  pinsNotice(ENTER_CARE_ENTRY_NOTICE);
  assert.throws(() => pinsNotice(''), /stub/);
  assert.throws(() => pinsNotice(ENTER_CARE_ENTRY_NOTICE.replace(/illness separated/gi, 'something')), /illness separated couple/);
  // **Not auto-wired — a pointer, not a builder.** `enterCareEntry` never reaches for
  // `illnessSeparationEntry`, so a household reads the sentence and decides for itself.
  const enterCareBuilder = /export const enterCareEntry = [\s\S]*?\);\n/.exec(EDITS)[0];
  assert.doesNotMatch(enterCareBuilder, /illnessSeparationEntry/, 'ENTER_CARE now builds an ILLNESS_SEPARATION entry itself — the notice promised a pointer, not automatic wiring');
});

// --- P17-3: every entry's ⓘ box links to the guide, and none restates a figure ---------------------
//
// The rule (TODO.md P17-3, 2026-09-28): a box says what the entry does in a line or two and NEVER
// restates a figure, a threshold or a rule; those live only in `userguide.md`. A dollar amount, a
// percentage or a two-digit number (an age, a year, a count) in a box is the shape a restated rule
// takes; the one-digit input instructions ("0 days", "50 halves it") are how to type the box.
test('P17-3 — every entry’s ⓘ box names a guide page, and no box restates a figure', () => {
  const calls = [...FORM_RAW.matchAll(/infoButton\(([A-Z_]+|'[^']*'), ([A-Z_]+)(?:, '(guide:[a-z0-9-]+)')?\)/g)];
  // 15 → 17 on 2026-09-29 (retire flow S1): one box behind each Retire answer, their words in `retireChoice.ts`.
  // 17 → 18 the same day (retire flow S4): `TTR_START`'s own box.
  assert.equal(calls.length, 18, 'the form no longer has the 18 ⓘ boxes this pass covered');
  // P17-6: plus the switch at retirement, whose line and detail are built per plan by
  // `retirementWarning.ts` (pinned in core-retirement-pension-switch.test.mjs), not constants.
  assert.match(FORM_RAW, /infoButton\(line\.summary, line\.detail, 'guide:becomes-a-pension'\)/);
  assert.equal([...FORM_RAW.matchAll(/infoButton\(/g)].length, calls.length + 1, 'an ⓘ box is built some other way');
  const restated = /\$\s?\d|\d(?:\.\d+)?\s?%|\b\d{2,}\b/;
  for (const [, summary, notice, guide] of calls) {
    assert.ok(guide !== undefined, `${notice} links to no page of the guide`);
    for (const name of [summary, notice].filter((word) => !word.startsWith("'"))) {
      const text = planEdits[name] ?? retireChoice[name] ?? /const [A-Z_]+ =([\s\S]*?);\n/.exec(FORM_RAW.slice(FORM_RAW.indexOf(`const ${name} =`)))?.[1];
      assert.equal(typeof text, 'string', `${name} is not a string the test can read`);
      assert.doesNotMatch(text, restated, `${name} restates a figure: ${text}`);
    }
  }
  assert.match('up to $300,000 of the sale', restated, 'the pattern misses a dollar figure');
  assert.match('from age 60 only', restated, 'the pattern misses an age');
});
