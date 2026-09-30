// P7-1 §D — the THIRD untested writer, pinned as SOURCE because it cannot be pinned as behaviour.
//
// `src/app/scenarioPanel.ts` builds DOM and `src/app/main.ts` runs on import: both need a
// document and there is none — `typescript` is the one dev dependency (TODO.md P2-9a). Same shape
// as `test/app-entry-form.test.mjs`, including its rule that **every absence assertion is paired
// with a positive control**: `executableCode` blanks string literals, so an absence check against
// a string the transform already erased proves nothing.
//
// What is pinned: the panel writes only through `save` (no transport of its own), it does not
// re-implement `scenarioList.ts`'s rules, it prints the Shortfall sentence the pure layer built
// rather than formatting an age itself, it never asks `pensionOnlyAge`, and main.ts's comparison
// route tears the chart down immediately before it rebuilds it. §5 says what stays unproven.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const SRC = resolve(dirname(fileURLToPath(import.meta.url)), '..', 'src');

/** Comments out, string literals blanked — so prose cannot satisfy a source assertion. */
const executableCode = (text) =>
  text
    .replaceAll(/\/\*[\s\S]*?\*\//g, '')
    .replaceAll(/`(?:[^`\\]|\\.)*`|'(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*"|\/\/.*$/gm, (match) =>
      match.startsWith('//') ? '' : '""',
    );

const read = (...parts) => readFileSync(join(SRC, ...parts), 'utf8');

const PANEL_RAW = read('app', 'scenarioPanel.ts');
const MAIN_RAW = read('app', 'main.ts');
const RENDER_RAW = read('app', 'renderChart.ts');
const PANEL = executableCode(PANEL_RAW);
const MAIN = executableCode(MAIN_RAW);
const RENDER = executableCode(RENDER_RAW);

const imports = (raw) => [...raw.matchAll(/\bfrom\s*['"]([^'"]+)['"]/g)].map(([, specifier]) => specifier);

const literals = (raw) => [...raw.matchAll(/\/\*[\s\S]*?\*\/|`(?:[^`\\]|\\.)*`|'(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*"|\/\/.*$/gm)]
  .map(([match]) => match)
  .filter((match) => !match.startsWith('//') && !match.startsWith('/*'))
  .map((match) => match.slice(1, -1));

/**
 * One exported line of prose, as the USER reads it — the source is wrapped and concatenated, so a
 * phrase split across two literals is present on screen and absent from the file. Read from the RAW
 * source rather than imported, because this module builds DOM and no DOM is available here; the
 * shape is `app-settings-panel.test.mjs`'s, deliberately, so the two panels are pinned the one way.
 */
const prose = (name) => literals(new RegExp(`export const ${name} =([\\s\\S]*?);\\n`).exec(PANEL_RAW)[1]).join('');

// --- §0 The transform is doing what the rest of this file assumes --------------------------------

test('the control on the transform: prose is erased, code is kept', () => {
  assert.match(PANEL_RAW, /THE SHORTFALL AGE IS THE COMPARISON NUMBER/, 'the header sentence this test relies on has gone');
  assert.doesNotMatch(PANEL, /THE SHORTFALL AGE IS THE COMPARISON NUMBER/, 'executableCode kept a comment');
  assert.match(PANEL, /mountScenarioPanel/, 'executableCode erased real code, so every assertion below is vacuous');
});

// --- §1 One write path, and it is the same door every other edit uses -----------------------------

test('the panel writes only through host.save — no transport, no fetch, no validation of its own', () => {
  for (const forbidden of [/writePlan/, /fetch\(/, /parsePlan/, /\bproject\(/]) {
    assert.doesNotMatch(PANEL, forbidden, `scenarioPanel.ts has its own ${forbidden}`);
  }
  assert.deepEqual(imports(PANEL_RAW).filter((specifier) => specifier.includes('store/')), []);
  // Positive control on the same walker: the imports that ARE there, as a list.
  assert.deepEqual(imports(PANEL_RAW), ['./scenarioList.js', './planEdits.js', '../core/parsePlan.js', './infoButton.js', './comparisonSeries.js']);
  // Every write is a `host.save(...)` call, and there are exactly five operations.
  const saves = [...PANEL.matchAll(/host\.save\(/g)];
  assert.equal(saves.length, 5, 'the panel has gained or lost a write — there are five: activate, rename, clone, create, delete');
  // The delete writes through the same door as the other four: it has no transport and no second
  // route, and the plan it sends is built by `planEdits.ts` rather than assembled here.
  assert.match(PANEL, /await host\.save\(planWithScenarioDeleted\(before, decided\)\)/);
});

test('the list operations come from scenarioList.ts and are not re-implemented here', () => {
  for (const call of [/scenarioCreated\(/, /scenarioCloned\(/, /scenarioRenamed\(/, /scenarioDeleted\(/, /planWithActiveScenario\(/, /planWithScenarios\(/, /planWithScenarioDeleted\(/]) {
    assert.match(PANEL, call, `the panel no longer calls ${call}`);
  }
  // The rules those functions own are not restated here: no parentId is written, no entryIds
  // array is built, and no id is compared to decide a rename.
  assert.doesNotMatch(PANEL, /parentId:/, 'the panel writes a parentId itself — scenarioList.ts owns that');
  assert.doesNotMatch(PANEL, /entryIds:/, 'the panel writes entryIds itself');
  // Nor does it decide any of the delete's three cases: no child search, no list-length test, no
  // choice of which scenario becomes active. Every one of those is `scenarioList.ts`'s.
  for (const forbidden of [/\.parentId === scenario\.id/, /scenarios\.length === 1/, /activeScenarioId =/, /\.filter\(\(one\) => one\.id !== /]) {
    assert.doesNotMatch(PANEL, forbidden, `the panel re-decides part of the delete: ${forbidden}`);
  }
  // Positive control for the group above: the panel DOES read the decision it was handed.
  assert.match(PANEL, /decided\.switchedTo === null/);
  // Positive control: it DOES read parentId, to say what a scenario inherits from.
  assert.match(PANEL, /scenario\.parentId === null/);
});

// ⚠️ **REWRITTEN, NOT WEAKENED (user ruling, 2026-09-19).** Until this slice this section asserted
// that NO control in the panel promised removal at all. A Scenario is a container and not a record
// of a decision, so deleting one was ruled to be outside ADR-0002 and the control now exists. What
// the ruling did NOT move is the journal: the two assertions below are the old one split in two —
// the panel may promise to remove a SCENARIO, and nothing anywhere may promise to remove an ENTRY.
test('the panel promises removal of a SCENARIO, and says in the control itself that entries survive', () => {
  const words = literals(PANEL_RAW);
  assert.ok(words.includes('Delete'), 'the Delete control has gone');
  // The button's own tooltip carries the fact a user is afraid of, not just the header comment.
  const tooltip = words.find((word) => word.startsWith('Removes this scenario only'));
  assert.ok(tooltip, 'the Delete control no longer says what it does NOT remove');
  assert.match(tooltip, /Every entry it listed stays in the plan/);
  // Positive control: the walker reads the labels that ARE there.
  assert.ok(words.includes('Rename'));
  assert.ok(words.includes('Clone'));
  assert.ok(words.includes('New scenario'));
});

test('NO control anywhere promises to remove an ENTRY — ADR-0002 is untouched by the scenario delete', () => {
  // The entry editor is the writer that could grow one, and it still has not: this is
  // `app-entry-form.test.mjs`'s own assertion, restated here because THIS slice is the one that
  // put the word "Delete" on the page and the two must not be allowed to bleed into each other.
  const formWords = literals(read('app', 'entryForm.ts'));
  assert.deepEqual(formWords.filter((word) => /\b(delete|remove|removed|deleted)\b/i.test(word)), []);
  // And no module offers the function such a control would call. `planWithEntryOverride` is the
  // append-only-safe delete (per scenario, since 2026-09-22) and is the only thing shaped like one.
  const edits = executableCode(read('app', 'planEdits.ts'));
  for (const forbidden of [/planWithEntryRemoved/, /planWithEntryDeleted/, /entries\.filter\(/]) {
    assert.doesNotMatch(edits, forbidden, `planEdits.ts has grown an entry delete: ${forbidden}`);
  }
  // Positive control: the scenario delete IS there, so the absences above are facts about entries
  // and not about the walker.
  assert.match(edits, /planWithScenarioDeleted/);
  assert.match(edits, /planWithEntryOverride/);
});

test('the delete announces what it did only AFTER reading the plan back — never optimistically', () => {
  // The order is the assertion: save, then a read of `currentPlan()`, then the sentence. A page
  // that set the text before the await would tell the user it switched scenarios on a write that
  // was refused at the door.
  assert.match(
    PANEL,
    /await host\.save\([\s\S]{0,120}?\);\s*if \(host\.currentPlan\(\)\.scenarios\.some\(\(one\) => one\.id === scenario\.id\)\) return;[\s\S]{0,600}?announce\.textContent =/,
    'the announcement is not gated on the plan on disk having lost the scenario',
  );
  // A refusal decided before any candidate exists goes to the banner, through the host, and the
  // decision is never taken twice: one `scenarioDeleted(` call in the file.
  assert.equal([...PANEL.matchAll(/scenarioDeleted\(/g)].length, 1);
  assert.match(PANEL, /catch \(error\) \{\s*host\.refuse\(error\);\s*return;/);
  assert.match(MAIN, /refuse: \(error\) => showEntryRefusal\(banner, error\)/);
});

// --- §2 The figure beside each scenario is the pure layer's, unchanged ----------------------------

test('the Shortfall Age printed is the sentence comparisonSeries built — the panel formats no age', () => {
  assert.match(PANEL, /host\.shortfallOf\(scenario\.id\)\?\.text \?\? NO_WALK_TEXT/);
  // That line pins the WIRING and can say nothing about the fallback's text — `executableCode`
  // blanks every literal, so it reads `NO_WALK_TEXT` as a token and stays green with the sentence
  // emptied, which would print an empty cell where the figure goes (P4-15). An empty cell beside a
  // scenario reads as a figure of nothing; the module's own comment is that this must never be
  // printed as "no shortfall", which is a figure. So: real text, saying it was not projected, and
  // carrying no digits that could be read as an age.
  const noWalk = prose('NO_WALK_TEXT');
  assert.ok(noWalk.trim().length >= 15, `the no-walk sentence is ${noWalk.trim().length} characters — an empty cell reads as a figure of nothing`);
  assert.match(noWalk, /\bnot\b|no forecast|unprojected/i, 'the no-walk sentence no longer says that nothing was projected');
  assert.doesNotMatch(noWalk, /\d/, 'the no-walk sentence carries a number — it reads as the age it stands in for');
  // It does not build the wording itself: no age arithmetic, no ages array, no join of names.
  for (const forbidden of [/\.ages\b/, /ageAt\(/, /shortfallAge\(/]) {
    assert.doesNotMatch(PANEL, forbidden, `scenarioPanel.ts formats an age itself: ${forbidden}`);
  }
  // ⚠️ And it never asks the question that THROWS on the committed fixture's walk.
  assert.doesNotMatch(PANEL, /pensionOnlyAge/, 'the panel asks pensionOnlyAge, which raises on a walk the published parameters do not cover');
  assert.doesNotMatch(MAIN, /pensionOnlyAge/);
  // Positive control for the two absence checks above: `monthsToSeries.ts` IS where it is asked,
  // behind its own predicate, so the token is findable by this walker somewhere in src/.
  assert.match(executableCode(read('app', 'monthsToSeries.ts')), /pensionOnlyAge\(/);
});

test('the panel re-projects nothing — the walks come from main.ts through the host', () => {
  assert.doesNotMatch(PANEL, /scenarioWalks\(/);
  assert.match(PANEL, /host\.shortfallOf\(/);
  assert.match(MAIN, /shortfallOf: \(scenarioId\) => comparison\.lines\.find/);
});

// --- §3 main.ts: two views, one teardown discipline, one projection per redraw ---------------------

test('both chart routes destroy the live instance IMMEDIATELY before rebuilding it', () => {
  // Every construction of a chart in main.ts, and what stands immediately before it.
  const builds = [...MAIN.matchAll(/chart = (renderChart|renderComparisonChart)\(/g)];
  assert.equal(builds.length, 2, 'main.ts builds a chart somewhere new — every route must tear down first');
  for (const build of builds) {
    const before = MAIN.slice(0, build.index);
    assert.match(before, /chart\?\.destroy\(\);\s*$/, `the ${build[1]} route does not destroy the previous chart first`);
  }
  assert.doesNotMatch(MAIN, /new Chart\(/, 'main.ts constructs Chart.js itself, bypassing mutableChartInput');
  // Positive control: renderChart.ts is where a Chart is constructed, and BOTH renderers clone
  // the frozen config before touching it.
  // THREE since the money-in/money-out chart (2026-09-25): its own route destroys first too.
  assert.equal([...RENDER.matchAll(/new Chart\(/g)].length, 3);
  assert.match(RENDER, /mutableChartInput\(flowChartConfig\(series\)\)/);
  assert.match(MAIN, /flowChart\?\.destroy\(\);\s*flowChart = renderFlowChart\(/, 'the flow chart route does not destroy the previous chart first');
  assert.match(RENDER, /mutableChartInput\(chartConfig\(series, basis, mode\)\)/);
  assert.match(RENDER, /mutableChartInput\(comparisonChartConfig\(series, basis, mode, view\)\)/);
});

test('the view toggle re-draws and re-projects NOTHING', () => {
  assert.match(MAIN, /chartView = input\.value === "" \? "" : "";\s*paintChart\(\);/);
  // The two toggles (axis and view) between them call `paintChart` and nothing heavier: no
  // `project(`, no `scenarioWalks(`, no `monthsToSeries(` inside either handler.
  // THREE since P7-6: the month table's Household/per-Person switch is the third, and it repaints
  // the TABLE. The rule is the same for all three — no walk, no series — but not the same repaint:
  // a table switch that also rebuilt the Chart.js instance would be throwing away a live chart to
  // draw the identical one.
  const handlers = [...MAIN.matchAll(/addEventListener\(""[\s\S]*?\n  \}\);/g)].map(([match]) => match);
  // FOUR since P2-7: the money toggle is the fourth, and it repaints BOTH the chart and the table
  // — which is the point of it being one toggle and not two. It is still under the same rule: the
  // figures it shows are the walk's own, converted on the way to the screen, so it re-walks
  // nothing and rebuilds no series.
  // FIVE since the Compare chart's "Scenarios shown" picker: it repaints the chart from a subset of
  // the walks `draw` already holds (`scenarioSelection.ts`), under the same no-walk rule.
  // SIX since the Compare chart's "Total wealth" / "What Centrelink counts" switch (2026-09-26):
  // it swaps which array each line reads off the walks already held, and re-walks nothing.
  assert.equal(handlers.length, 6, 'the page has gained a listener this assertion does not cover');
  for (const handler of handlers) {
    for (const heavy of [/scenarioWalks\(/, /monthsToSeries\(/, /comparisonSeries\(/, /\bproject\(/]) {
      assert.doesNotMatch(handler, heavy, `a toggle re-computes ${heavy} — a projection is ~14ms per scenario`);
    }
  }
  const chartToggles = handlers.filter((handler) => /paintChart\(\)/.test(handler));
  const tableToggles = handlers.filter((handler) => /paintTable\(/.test(handler));
  assert.equal(chartToggles.length, 5, 'the axis, view, money, scenario-picker and compare-measure toggles no longer all repaint the chart');
  assert.equal(tableToggles.length, 2, 'the Household/per-Person switch and the money toggle no longer repaint the table');
  // ⚠️ **EXACTLY ONE HANDLER DOES BOTH, AND IT IS THE MONEY ONE (P2-7).** Until this slice the
  // assertion here was that NO handler repainted both — the axis and view toggles touch only the
  // chart, the assets switch only the table. The money basis is the one thing on this page that is
  // not a property of one visual: ADR-0001 warns that a chart in one basis beside a table in
  // another is the most likely place to confuse yourself, so this toggle MUST drive both, and a
  // future change that split it into a chart toggle and a table toggle has to come through here.
  const both = handlers.filter((handler) => chartToggles.includes(handler) && tableToggles.includes(handler));
  assert.equal(both.length, 1, 'the money toggle must be the ONE handler that repaints the chart and the table together');
  assert.match(both[0], /moneyView = input\.value === "" \? "" : "";/, 'the handler that repaints both is not the money toggle');
  // It restates the basis where the page says it, too — on the chart (through `paintChart`) and in
  // the caption and the note under it. A repaint that moved the figures and left the sentence
  // saying the other thing is worse than no sentence.
  assert.match(both[0], /drawNote\(\);/);
  assert.match(both[0], /drawCaption\(plan\);/);
  for (const handler of tableToggles.filter((handler) => handler !== both[0])) {
    assert.doesNotMatch(handler, /paintChart\(\)/);
  }
});

test('the page projects ONCE at load, through scenarioWalks, and never the pool', () => {
  const walkCalls = [...MAIN.matchAll(/scenarioWalks\(/g)];
  assert.equal(walkCalls.length, 1, 'main.ts calls scenarioWalks more than once per load');
  assert.match(MAIN, /draw\(plan, scenarioWalks\(plan\)\);/);
  assert.doesNotMatch(MAIN, /\bproject\(/, 'main.ts reaches the engine directly again');
  assert.deepEqual(imports(MAIN_RAW).filter((specifier) => specifier.includes('projection')), []);
  // Positive control: the module that DOES reach the engine is imported by the module that must.
  assert.ok(imports(read('app', 'scenarioWalks.ts')).includes('../core/projection.js'));
});

test('comparison mode is only entered when there is more than one scenario to compare', () => {
  assert.match(MAIN, /chartView === "" && comparison\.lines\.length > 1/);
});

// --- §4 The comparison rules draw no text, structurally ------------------------------------------

test('the comparison plugin draws NO caption — no text call anywhere in its body', () => {
  const body = /const comparisonRules = [\s\S]*?\n\}\);/.exec(RENDER)[0];
  for (const forbidden of [/fillText/, /measureText/, /textAlign/, /ctx\.font/]) {
    assert.doesNotMatch(body, forbidden, `the comparison rules plugin draws text: ${forbidden}`);
  }
  // Positive control: the FOCUSED chart's plugin does all four, so the absence above is a fact
  // about this plugin and not about the walker.
  const focused = /const markerRule = [\s\S]*?\n\}\);/.exec(RENDER)[0];
  for (const present of [/fillText/, /measureText/, /textAlign/, /ctx\.font/]) assert.match(focused, present);
});

// --- §5 The residue, written down rather than implied ---------------------------------------------

// --- §4b The two collapsible panels — markup and the counts on their summaries -------------------

test('both editors are <details>, both start CLOSED, and each summary carries its own size', () => {
  const html = readFileSync(join(SRC, '..', 'public', 'index.html'), 'utf8');
  for (const [section, id] of [['entry-editor', 'entry-summary'], ['scenario-panel', 'scenario-summary']]) {
    const body = new RegExp(`<section id="${section}">[\\s\\S]*?</section>`).exec(html)[0];
    assert.match(body, /<details>\s*<summary>/, `#${section} is no longer a native disclosure`);
    assert.doesNotMatch(body, /<details open/, `#${section} starts open — both panels push the chart below the fold`);
    assert.match(body, new RegExp(`<summary><h2 id="${id}">`), `#${section}'s summary is not the heading main.ts writes to`);
  }
  // No script is needed for either, and none was added: the page still loads exactly one module.
  assert.equal([...html.matchAll(/<script [^>]*src=/g)].length, 2, 'the page has gained a script — the disclosure is meant to need none');
});

test('each summary is REWRITTEN from the plan on disk on every redraw, and states what it hides', () => {
  // Both counts are read off the same `shown` the caption below the chart reads, so the panel
  // heading and the caption cannot disagree about how many entries or scenarios there are.
  assert.match(MAIN, /const drawPanelSummaries = \(shown: PlanFile\): void => \{/);
  assert.match(MAIN, /drawPanelSummaries\(plan\);/);
  assert.equal([...MAIN.matchAll(/drawPanelSummaries\(/g)].length, 1, 'the summaries are written from somewhere other than the one redraw');
  assert.match(MAIN, /drawCaption\(plan\);\s*drawPanelSummaries\(plan\);/, 'the summaries are written from somewhere other than the redraw that writes the caption');
  // The wording itself, which is prose and so is read off the RAW file.
  // ⚠️ **The ACTIVE SCENARIO's entries, not the pool's (2026-09-22).** The panel below this heading
  // lists exactly the active Scenario's resolved entries, and `switched on` is that Scenario's own
  // answer: a heading counting `shown.entries` would put the union of every Scenario's changes over
  // a table listing one Scenario's.
  assert.match(MAIN_RAW, /Change the plan - \$\{activeName\} — \$\{activeEntries\.length\} entries, \$\{activeEntries\.filter\(\(entry\) => entry\.enabled\)\.length\} switched on/);
  assert.doesNotMatch(MAIN_RAW, /Change the plan - \$\{activeName\} — \$\{shown\.entries\.length\}/, 'the entry panel heading counts the shared pool again');
  assert.match(MAIN_RAW, /Scenarios \(\$\{shown\.scenarios\.length\}\) - CURRENT = \$\{activeName\}/);
  // Neither count is a literal and neither is computed twice: `entries.length` and
  // `scenarios.length` are the file's own figures.
  assert.doesNotMatch(MAIN, /scenario-summary[\s\S]{0,80}\d/);
});

test('the residue, and the page elements matched by hand', () => {
  // Settled by opening the page, not by this suite: that a click on a radio really activates that
  // scenario, that `crypto.randomUUID()` produces the id the save carries, that Chart.js draws the
  // N lines it is handed, and that six legend entries wrap rather than overflow.
  const html = readFileSync(join(SRC, '..', 'public', 'index.html'), 'utf8');
  for (const id of ['scenario-create', 'scenario-list', 'entry-summary', 'scenario-summary']) {
    assert.match(html, new RegExp(`id="${id}"`), `public/index.html has no #${id} for main.ts to find`);
    assert.match(MAIN_RAW, new RegExp(`'${id}'`), `main.ts no longer looks up #${id}`);
  }
  assert.match(html, /name="chart-view" value="focused" checked/);
  assert.match(html, /name="chart-view" value="compare"/);
  assert.match(MAIN_RAW, /input\[name="chart-view"\]:checked/);
  assert.match(PANEL_RAW, /crypto\.randomUUID\(\)/);
  // ⚠️ **WHAT THIS SLICE LEAVES UNPROVEN, said rather than implied.** No test here opens a
  // browser, so: that a click on Delete really removes the row; that `<details>` actually
  // collapses and that the two summaries are readable when it does; that the announcement is
  // visible where it is placed (it sits in the CREATE box, because the list is replaced wholesale
  // on every redraw and a sentence about what just happened cannot live in what the save
  // replaces); and that the banner a refused delete writes is noticed above a panel the user has
  // scrolled past. The DECISION under all of it — which scenario goes, which refusal is raised,
  // where the active scenario lands — is `scenarioList.ts`'s and is tested for real in
  // `test/core-scenarios.test.mjs` §5.
  assert.match(PANEL_RAW, /announce\.className = 'scenario-announce'/);
  assert.match(PANEL_RAW, /create\.replaceChildren\(buildCreate\(host\), announce\)/);
});

// --- §N THE SHARED-CHANGE WARNING — P4-15 family (C), the one that warns of a SURPRISE -----------
//
// Of the thirteen constants P4-15 found with no assertion anywhere, this is the one that matters
// most. Eleven of the others are headings and labels whose absence looks broken on screen — a
// defect that announces itself. This one announces nothing.
//
// Scenarios share their changes BY REFERENCE (ADR-0002's journal, one pool of entries), which is
// deliberate and is not what a reader assumes: the natural reading of "switch this change off" is
// that it applies to the scenario in front of you. This sentence is the only thing on the page that
// says otherwise. Delete it and the app still works perfectly, and a user switches a change off in
// one scenario and silently alters every other one — then compares them and trusts the comparison.
//
// ⚠️ **THE SUBJECT OF THIS PIN CHANGED ON 2026-09-22, AND THE PIN DID NOT GO AWAY.** The sentence
// used to warn that switching a change off reached every other scenario, which was TRUE and was a
// defect: the toggle wrote the shared pool. The toggle now writes the active Scenario's own
// overrides, so that warning became false and was rewritten rather than deleted — what is left to
// be surprised by is the half of the sharing that is still there and is still not what a reader
// assumes: inheritance is LIVE, so a change added to a parent scenario turns up in every scenario
// built from it without anyone touching those.
//
// Pinned as a PROPERTY, by SUBJECT rather than by phrase: a floor, that the switch is said to be
// scoped to the scenario in view, and that live inheritance from another scenario is named as what
// IS shared. Proved immediately below to fail on emptied or merely descriptive text.
test('the switch-scope note says the switch is LOCAL, and names live inheritance as what is shared', () => {
  const text = prose('SWITCH_SCOPE_NOTE');
  assert.ok(
    text.trim().length >= 80,
    `SWITCH_SCOPE_NOTE is ${text.trim().length} characters — too short to say anything`,
  );
  assert.ok(
    /and to no other|only the scenario|no other scenario/i.test(text),
    'SWITCH_SCOPE_NOTE no longer says switching off is confined to the scenario in view',
  );
  assert.ok(
    /built from|inherit/i.test(text) && /scenario/i.test(text),
    'SWITCH_SCOPE_NOTE no longer names live inheritance between scenarios as what IS shared',
  );
  // And the false sentence is gone by name, not merely reworded around: a constant still promising
  // the effect goes everywhere is the defect back on the page in words.
  assert.doesNotMatch(PANEL_RAW, /SHARED_CHANGE_WARNING/, 'the old pool-wide warning is back');
  // P17-6: the note is the ⓘ detail now, and the line that stays on the page still says both halves.
  const summary = prose('SWITCH_SCOPE_SUMMARY');
  assert.ok(summary.trim().length > 0, 'SWITCH_SCOPE_SUMMARY is empty');
  assert.match(summary, /this scenario only/i, 'the visible line no longer says the switch is local');
  assert.match(summary, /inherit/i, 'the visible line no longer names live inheritance');
  assert.match(PANEL_RAW, /infoButton\(SWITCH_SCOPE_SUMMARY, SWITCH_SCOPE_NOTE, 'guide:copying-a-scenario'\)/);
});

test('the switch-scope pin FAILS on emptied or merely half-said text', () => {
  const guard = (text) => {
    assert.ok(text.trim().length >= 80, 'too short');
    assert.ok(/and to no other|only the scenario|no other scenario/i.test(text), 'no longer says the switch is local');
    assert.ok(/built from|inherit/i.test(text), 'no longer names live inheritance as what IS shared');
  };
  for (const stub of [
    '',
    '   ',
    'Switch a change off to exclude it from this scenario.',
    // The half that is easiest to lose: the scope is stated, the sharing that remains is not, and a
    // reader is left believing scenarios are independent of one another.
    'Switching a change off applies to the scenario you are looking at and to no other, so you can try things here without disturbing anything else you have set up.',
  ]) {
    assert.throws(
      () => guard(stub),
      /too short|no longer says|no longer names/,
      `a stub passed the switch-scope pin, which makes it decorative (tried ${JSON.stringify(stub)})`,
    );
  }
  // Positive control: reworded but complete still passes, so this is a property and not a phrase.
  guard('Turning a change off affects only the scenario on screen and to no other. Scenarios do still share the changes themselves: anything you add to a scenario others were built from shows up in those too.');
});

// P3-20f — the ⓘ beside the Age Pension sentence: appended exactly when the pure layer attached a
// note (`agePensionSummary` decides when; `app-comparison-series` pins that), and carrying it unchanged.
test('P3-20f: the Age Pension ⓘ is appended when, and only when, the summary carries a note', () => {
  assert.match(
    PANEL_RAW,
    /if \(agePensionSummary\?\.note !== undefined\) row\.append\(infoButton\(AGE_PENSION_NOTE_SUMMARY, agePensionSummary\.note\)\);/,
  );
  assert.equal([...PANEL_RAW.matchAll(/infoButton\(AGE_PENSION_NOTE_SUMMARY/g)].length, 1);
  assert.ok(prose('AGE_PENSION_NOTE_SUMMARY').trim().length > 0);
});
