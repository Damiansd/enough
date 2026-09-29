// P6-8 microtask 3 — the guided template's input screen, pinned as SOURCE because it cannot be
// pinned as behaviour: `comparisonTemplateForm.ts` builds DOM and there is no `document` under
// `node:test` (TODO.md P2-9a), the same split `app-scenario-panel.test.mjs` and
// `app-entry-form.test.mjs` are built on.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const SRC = resolve(dirname(fileURLToPath(import.meta.url)), '..', 'src');
const read = (...parts) => readFileSync(join(SRC, ...parts), 'utf8');

const executableCode = (text) =>
  text
    .replaceAll(/\/\*[\s\S]*?\*\//g, '')
    .replaceAll(/`(?:[^`\\]|\\.)*`|'(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*"|\/\/.*$/gm, (match) =>
      match.startsWith('//') ? '' : '""',
    );

const literals = (raw) => [...raw.matchAll(/\/\*[\s\S]*?\*\/|`(?:[^`\\]|\\.)*`|'(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*"|\/\/.*$/gm)]
  .map(([match]) => match)
  .filter((match) => !match.startsWith('//') && !match.startsWith('/*'))
  .map((match) => match.slice(1, -1));

const imports = (raw) => [...raw.matchAll(/\bfrom\s*['"]([^'"]+)['"]/g)].map(([, specifier]) => specifier);

const FORM_RAW = read('app', 'comparisonTemplateForm.ts');
const FORM = executableCode(FORM_RAW);

// --- §0 The transform is doing what the rest of this file assumes ----------------------------------

test('the control on the transform: prose is erased, code is kept', () => {
  assert.match(FORM_RAW, /BANNED WORDS ON THIS SCREEN/, 'the header sentence this test relies on has gone');
  assert.doesNotMatch(FORM, /BANNED WORDS ON THIS SCREEN/, 'executableCode kept a comment');
  assert.match(FORM, /mountComparisonTemplateForm/, 'executableCode erased real code, so every assertion below is vacuous');
});

// --- §1 One write path, and it is the same door every other edit uses ------------------------------

test('the form writes only through host.save — no transport, no fetch, no parsePlan of its own', () => {
  for (const forbidden of [/writePlan/, /fetch\(/, /\bparsePlan\(/, /\bproject\(/]) {
    assert.doesNotMatch(FORM, forbidden, `comparisonTemplateForm.ts has its own ${forbidden}`);
  }
  assert.deepEqual(imports(FORM_RAW).filter((specifier) => specifier.includes('store/')), []);
  assert.match(FORM, /await host\.save\(candidate\)/);
});

// --- §2 The refusal is said BEFORE the candidate is even built, on the gate's own ruling -----------

test('superDestinationRefusal is checked, and returning early, before superVsInvestTemplate is ever called', () => {
  assert.match(FORM, /superDestinationRefusal\(/);
  assert.match(FORM, /superVsInvestTemplate\(/);
  const refusalCallIndex = FORM.indexOf('superDestinationRefusal(');
  const templateCallIndex = FORM.indexOf('superVsInvestTemplate(', FORM.indexOf('const build'));
  const returnBetween = FORM.slice(refusalCallIndex, FORM.indexOf('superVsInvestTemplate('));
  assert.ok(refusalCallIndex < FORM.indexOf('superVsInvestTemplate('), 'the refusal check must read before the generator is called');
  assert.match(returnBetween, /return;/, 'a refusal that does not stop execution reaches the generator anyway');
});

// --- §3 Banned words never reach the screen (the brief's own list) ---------------------------------

test('none of the banned words appear anywhere in the on-screen text', () => {
  const words = literals(FORM_RAW).join(' ');
  for (const banned of [/franking/i, /imputation/i, /\bECPI\b/, /gross-up/i, /gross up/i]) {
    assert.doesNotMatch(words, banned, `a banned word (${banned}) reached the screen`);
  }
  // Register tags (§, "O84", "T46"-shaped) and item ids ("item 106") — none in the user-visible strings.
  assert.doesNotMatch(words, /§\d/);
  assert.doesNotMatch(words, /\b[OT]\d{2,3}\b/);
  assert.doesNotMatch(words, /\bitem \d/i);
  // Positive control: the words this screen SHOULD use are there.
  assert.match(words, /extra super contributions/);
  assert.match(words, /invested outside super/);
});

// --- §4 The owner selector never offers "Household" — only the two builders this template uses -----

test('the owner selector is built from personOwnerLabels, never ownerOptions/HOUSEHOLD_OWNER_LABEL', () => {
  assert.match(FORM, /personOwnerLabels\(/);
  assert.doesNotMatch(FORM, /ownerOptions\(/);
  assert.doesNotMatch(FORM, /HOUSEHOLD_OWNER_LABEL/);
  assert.doesNotMatch(FORM, /'household'/);
});

// --- §5 A successful generate lands the reader on the comparison chart -----------------------------

test('host.showComparison() is called after a successful save, and only after it', () => {
  assert.match(FORM, /host\.showComparison\(\)/);
  const saveThen = /await host\.save\(candidate\);\s*host\.showComparison\(\);/;
  assert.match(FORM, saveThen, 'showComparison must run after save resolves, not before or independently');
});

// --- §6 It composes the existing generator and refusal, and does not re-decide either --------------

test('the eligibility rule and the entry construction are not re-implemented here', () => {
  for (const forbidden of [/interest\.phase/, /superContributionEntry\(/, /nonSuperInvestmentBuyEntry\(/, /scenarioCloned\(/]) {
    assert.doesNotMatch(FORM, forbidden, `the form re-implements part of comparisonTemplate.ts: ${forbidden}`);
  }
  assert.deepEqual(
    imports(FORM_RAW).sort(),
    ['./comparisonTemplate.js', './infoButton.js', './ownerNames.js', '../core/parsePlan.js'].sort(),
  );
});
