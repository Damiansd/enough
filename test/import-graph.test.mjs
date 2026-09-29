// P2-9b — the module boundary, asserted rather than assumed:
//
//   core/  pure logic, no I/O        ← never imports store/ or app/
//   data/  frozen assumption modules ← never imports store/ or app/
//   store/ reads and writes files
//   app/   UI
//
// A boundary nobody tests is a boundary that erodes in the first hurried week (ADR-0007).
// This reads the TypeScript sources directly — no parser, no dependency.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const SRC = resolve(dirname(fileURLToPath(import.meta.url)), '..', 'src');
const PURE = ['core', 'data'];
const FORBIDDEN = ['store', 'app'];

const sources = function* (dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) yield* sources(path);
    else if (entry.name.endsWith('.ts')) yield path;
  }
};

// `from '...'`, bare `import '...'`, and `import('...')`. Deliberately blunt: it over-matches
// into comments and strings sooner than it silently misses a real import.
const specifiers = (text) => [...text.matchAll(/\bfrom\s*['"]([^'"]+)['"]|\bimport\s*\(?\s*['"]([^'"]+)['"]/g)]
  .map(([, a, b]) => a ?? b);

const layerOf = (path) => relative(SRC, path).split(sep)[0];

test('every source file sits in a known layer', () => {
  for (const file of sources(SRC)) {
    assert.ok([...PURE, ...FORBIDDEN].includes(layerOf(file)), `${relative(SRC, file)} is outside the module layout`);
  }
});

test('core/ and data/ never import store/ or app/', () => {
  const crossings = [];
  for (const file of sources(SRC)) {
    if (!PURE.includes(layerOf(file))) continue;
    for (const specifier of specifiers(readFileSync(file, 'utf8'))) {
      const target = specifier.startsWith('.')
        ? layerOf(resolve(dirname(file), specifier))
        : specifier.split('/')[0]; // a bare specifier can only be a runtime dependency, and there are none
      if (FORBIDDEN.includes(target) || !PURE.includes(target)) {
        crossings.push(`${relative(SRC, file)} → ${specifier}`);
      }
    }
  }
  assert.deepEqual(crossings, []);
});

test('the check actually catches a crossing', () => {
  const layer = layerOf(resolve(join(SRC, 'core'), '../store/files.js'));
  assert.equal(layer, 'store');
  assert.ok(FORBIDDEN.includes(layer));
  assert.deepEqual(specifiers("import { writePlan } from '../store/files.js';"), ['../store/files.js']);
});

// --- The ledger tripwire — tripped 2026-09-28, and Reset now asks about the ledger separately ---
//
// `store/files.ts` exports `readLedger`/`writeLedger` for Phase 11's transaction ledger (TODO.md
// P11-1a), which does not exist as user data yet: nothing in `src/` calls `writeLedger`, and this
// app has never written a `ledger.json`. That absence is load-bearing for `settingsPanel.ts`'s
// Reset control, whose own header says it replaces the plan file "WHOLE" and is "NOT AN EXCEPTION"
// to the add-only rule — a claim that is true only because `plan.json` is the whole of a user's
// state. The day something in `src/` starts calling `writeLedger`, that stops being true: Reset
// would put `plan.json` back to the first-run example while a ledger recording everything the
// household ever bought sat untouched on disk beside it — the "reset" leaves state behind, which is
// a HALF reset wearing a WHOLE reset's confirmation text (`resetConfirmation`, `RESET_WARNING`) and
// its "nothing is on disk to go back to" claim.
//
// **If this test fails, the correct response is to EXTEND `settingsPanel.ts`'s Reset to also
// overwrite the ledger, not to delete this test.** A caller of `writeLedger` appearing anywhere in
// `src/` is the signal that the ledger has become real user state, and from that day the Reset
// control's one write is no longer the whole of what "starting again" must clear.
//
// **NARROWED 2026-09-28 (P11-1 slice 1), on the tripwire's own ground and no wider.** The ground is
// "the ledger has become real user state", and that happens when something reaches the DISK — which
// only `store/files.ts`'s `writeLedger` does. Slice 1 added `app/ledgerStore.ts`, whose save path
// calls `transport.writeLedger(` on an INJECTED transport (the `loadPlan.ts` pattern) and which no
// file in `src/` wires to the store yet: the running app still writes no `ledger.json`. So the
// callers list is pinned to that one file, and the real signal — anything IMPORTING `writeLedger`
// out of `store/files.ts` — is pinned to nothing. Slice 2's wiring trips the second assertion, and
// the Reset question comes due that day.
//
// **CAME DUE 2026-09-28 (P11-1 slice 2), AND THE RESET WAS EXTENDED, PER THIS TEST'S OWN
// INSTRUCTION.** `main.ts` now imports `writeLedger` and hands it to the Transactions panel, so the
// ledger IS real user state. User ruling, same day: "Start again" asks separately "Also delete my
// transaction history?", default NO. No leaves the ledger untouched; Yes replaces it with the empty
// ledger through `replaceWithEmptyLedger` — the one sanctioned non-extension write, a distinct named
// function so `requireExtension` stays strict on every other write. From here the test pins exactly
// that wiring: one importer, one file of callers, two transport writes and which is which, one
// caller of the empty-ledger write, reached only after the plan landed and only on a ticked box
// that starts unticked, and never offered over a ledger that did not load.
test('writeLedger reaches the disk from main.ts through the ledger store only, and Reset clears it only on an explicit Yes', () => {
  const FILES_TS = join('store', 'files.ts');
  const callers = [];
  const importers = [];
  const emptiers = [];
  for (const file of sources(SRC)) {
    if (relative(SRC, file) === FILES_TS) continue; // the definition site, not a caller
    const text = readFileSync(file, 'utf8');
    if (/\bwriteLedger\(/.test(text)) callers.push(relative(SRC, file));
    if (/import\s*\{[^}]*\bwriteLedger\b[^}]*\}\s*from\s*['"][^'"]*store\/files\.js['"]/.test(text)) importers.push(relative(SRC, file));
    if (/\breplaceWithEmptyLedger\(/.test(text)) emptiers.push(relative(SRC, file));
  }
  assert.deepEqual(
    importers,
    [join('app', 'main.ts')],
    'writeLedger is imported out of store/files.ts somewhere other than main.ts — a second route to the ledger file, ' +
      "which settingsPanel.ts's Reset question does not know about. EXTEND Reset; do not delete this test.",
  );
  assert.deepEqual(
    callers,
    [join('app', 'ledgerStore.ts')],
    'a writeLedger call outside the ledger store — either a second ledger writer, or the ledger reaching the disk by a route the importer check above does not see',
  );
  const MAIN = readFileSync(join(SRC, 'app', 'main.ts'), 'utf8');
  assert.match(MAIN, /transport: \{ readLedger, writeLedger \}/, 'main.ts no longer hands the real transport to the Transactions panel');

  // The store: exactly two transport writes — the strict one behind requireExtension, and the named empty one.
  const STORE = readFileSync(join(SRC, 'app', 'ledgerStore.ts'), 'utf8');
  assert.equal([...STORE.matchAll(/transport\.writeLedger\(/g)].length, 2, 'the ledger store has a third write, or has lost one');
  const save = /export const saveLedger = [\s\S]*?\n\};/.exec(STORE)[0];
  assert.match(save, /const ledger = requireExtension\(lastLoaded, parseLedger\(candidate\)\);\s*try \{\s*await transport\.writeLedger\(ledger\);/, 'saveLedger writes without requireExtension first');
  const empty = /export const replaceWithEmptyLedger = [\s\S]*?\n\};/.exec(STORE)[0];
  assert.match(empty, /const ledger = emptyLedger\(\);\s*try \{\s*await transport\.writeLedger\(ledger\);/, 'the non-extension write writes something other than the empty ledger');
  assert.doesNotMatch(empty, /candidate|lastLoaded/, 'the non-extension write takes a ledger from its caller');

  // The one caller of the empty write: the Transactions panel's Start again question, on a ticked box that starts unticked.
  assert.deepEqual(emptiers.filter((file) => file !== join('app', 'ledgerStore.ts')), [join('app', 'transactionsPanel.ts')]);
  const PANEL = readFileSync(join(SRC, 'app', 'transactionsPanel.ts'), 'utf8');
  assert.equal([...PANEL.matchAll(/\breplaceWithEmptyLedger\(/g)].length, 1, 'the empty-ledger write is reachable from a second place in the panel');
  const question = /startAgainQuestion: \(\) => \{[\s\S]*?\n    \},\n  \};/.exec(PANEL)[0];
  assert.match(question, /^startAgainQuestion: \(\) => \{\s*if \(ledger === undefined\) return undefined;/, 'Start again is offered over a ledger that did not load');
  assert.match(question, /tick\.checked = false;/, 'the "also delete" box no longer starts unticked');
  assert.match(question, /if \(!tick\.checked\) return [^;]*;\s*try \{\s*ledger = await replaceWithEmptyLedger\(host\.transport\);/, 'the empty write is not behind the tick');

  // And settingsPanel.ts acts on the answer only after the new plan LANDED.
  const SETTINGS = readFileSync(join(SRC, 'app', 'settingsPanel.ts'), 'utf8');
  assert.equal([...SETTINGS.matchAll(/afterPlanReplaced\(\)/g)].length, 1);
  assert.match(SETTINGS, /\.then\(async \(landed\) => \{\s*if \(landed && also\) announce\.textContent \+= ` \$\{await also\.afterPlanReplaced\(\)\}`;/);

  // Positive controls: every regex above DOES find the shapes it is for.
  assert.match('await writeLedger(ledger);', /\bwriteLedger\(/);
  assert.match("import { readLedger, writeLedger } from '../store/files.js';", /import\s*\{[^}]*\bwriteLedger\b[^}]*\}\s*from\s*['"][^'"]*store\/files\.js['"]/);
  assert.doesNotMatch(readFileSync(join(SRC, FILES_TS), 'utf8'), /\bwriteLedger\(/, 'the definition itself now reads as a call — the exclusion above is load-bearing after all');
});

// --- app/chat/ reads the engine and never writes the plan (plan_ai.md §13 microtask 1, §14 stage 3) ---
//
// ADR-0011: nothing the AI does writes the plan, and the connector has no write function. The tools
// sit under `app/` because they need `todaysDollars`, `scenarioWalks` and `planEdits`, so `PURE`
// cannot hold them; this is the extra rule for that one folder. It is blunt on purpose: a writer's
// name anywhere in a tool file — comment, string or call — fails it, because an import renamed on
// the way in (`import { savePlan as keep }`) still has to spell the name once. Stage 3 widened it from
// `chat/tools/` to the whole of `chat/`: the figure store, the chips and the guard are held to it too.
const TOOLS = join(SRC, 'app', 'chat');
const WRITERS = /\b(?:savePlan|writePlan)\b/g;

const toolViolations = (file, text) => [
  ...specifiers(text)
    .filter((specifier) => specifier.startsWith('.') && layerOf(resolve(dirname(file), specifier)) === 'store')
    .map((specifier) => `${relative(SRC, file)} → ${specifier}`),
  ...[...text.matchAll(WRITERS)].map(([name]) => `${relative(SRC, file)} names ${name}`),
];

test('app/chat/ never imports store/ and never names savePlan or writePlan', () => {
  const files = [...sources(TOOLS)];
  assert.ok(files.some((file) => dirname(file) === TOOLS), 'no file directly under app/chat/ was read');
  assert.ok(files.some((file) => dirname(file) === join(TOOLS, 'tools')), 'no file under app/chat/tools/ was read, so the empty result below would prove nothing');
  assert.deepEqual(files.flatMap((file) => toolViolations(file, readFileSync(file, 'utf8'))), []);
});

test('the tools rule actually catches a store/ import and a writer reference', () => {
  const file = join(TOOLS, 'tools', 'anyTool.ts');
  assert.deepEqual(toolViolations(file, "import { readPlan } from '../../../store/files.js';"), [
    `${join('app', 'chat', 'tools', 'anyTool.ts')} → ../../../store/files.js`,
  ]);
  assert.deepEqual(toolViolations(join(TOOLS, 'chips.ts'), "import { readPlan } from '../../store/files.js';"), [`${join('app', 'chat', 'chips.ts')} → ../../store/files.js`]);
  assert.equal(toolViolations(file, 'await savePlan({ writePlan }, plan);').length, 2);
  assert.deepEqual(toolViolations(file, "import { todaysDollars } from '../../todaysDollars.js';"), []);
});
