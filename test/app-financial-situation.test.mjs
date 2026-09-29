// **"FINANCIAL SITUATION" — THE BOX THE THREE ANSWERS LIVE IN.**
//
// The income headline, the home loan headline and the sustainable-spend search are three separate
// answers, but they are ONE question to a reader: what is our financial situation? They are grouped
// in a single `<details>` so they read as one block and can be folded away together.
//
// This suite exists because the grouping is pure markup — no module owns it, so nothing else would
// notice if a refactor unwrapped the three and left them loose again. Every other suite that
// touches these sections pins them by their own `<section id="…">` string and by document order,
// and ALL of those pins stay green when the wrapper is deleted. Containment is the gap.
//
// ⚠️ The pins here are CONTAINMENT pins, not substring pins: each id must fall strictly inside the
// wrapper's own open/close span. `assert.ok(HTML.includes('financial-situation'))` would be
// satisfied by the wrapper sitting anywhere on the page, including after all three sections.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const HTML = readFileSync(join(ROOT, 'public', 'index.html'), 'utf8');

/** The markup between `<section id="financial-situation">` and its matching `</section>`. */
const enclosure = () => {
  const open = HTML.indexOf('<section id="financial-situation">');
  assert.notEqual(open, -1, 'the Financial Situation section is gone from the page');
  const close = HTML.indexOf('</section>', HTML.indexOf('</details>', open));
  assert.notEqual(close, -1, 'the Financial Situation section is never closed');
  return HTML.slice(open, close);
};

const ENCLOSED = ['income-headline', 'mortgage-headline', 'sustainable-spend'];

test('the three answers are ENCLOSED by the Financial Situation section, not merely near it', () => {
  const inside = enclosure();
  for (const id of ENCLOSED) {
    assert.ok(inside.includes(`id="${id}"`), `${id} has been unwrapped out of Financial Situation`);
  }
  // Not vacuous: the span is a slice of the page, so a section moved out of the wrapper — even by
  // one line — leaves the id in HTML but not in `inside`. Proven by the mutation below.
  assert.ok(inside.length < HTML.length, 'the enclosure is the whole page, so containment proves nothing');
  const unwrapped = HTML.replace('<section id="income-headline"></section>', '') + '<section id="income-headline"></section>';
  assert.ok(unwrapped.includes('id="income-headline"'), 'mutation setup failed');
  assert.ok(!unwrapped.slice(unwrapped.indexOf('<section id="financial-situation">'), unwrapped.indexOf('</details>', unwrapped.indexOf('<section id="financial-situation">'))).includes('id="income-headline"'),
    'moving a section out of the wrapper did not break containment — this pin is vacuous');
});

test('it is a native disclosure, titled, and OPEN on load', () => {
  const inside = enclosure();
  // Native <details>/<summary>: no script, keyboard-operable for free.
  assert.match(inside, /<details open>/);
  assert.match(inside, /<summary><h2 id="financial-situation-summary">Financial Situation<\/h2><\/summary>/);
  // ⚠️ `open` is load-bearing. These are the answers the page exists to give; a plan whose headline
  // is folded shut on load looks like a plan with no answer.
  assert.doesNotMatch(inside, /<details>\s*<summary><h2 id="financial-situation-summary"/);
});

test('it wears the same chrome as the panels below it', () => {
  // The box the user asked for: the rule the Settings / Change the plan / Scenarios panels use.
  const box = /#financial-situation \{ border: 1px solid #ddd; padding: 0\.75rem 1rem; margin: 0 0 1\.5rem; \}/;
  assert.match(HTML, box);
  const sibling = HTML.match(/#settings-panel \{ ([^}]*) \}/);
  assert.ok(sibling, 'the panel this one copies its chrome from is gone');
  assert.match(HTML, new RegExp(`#financial-situation \\{ ${sibling[1].replace(/[.*+?^${}()|[\]\\]/g, '\\$&')} \\}`),
    'Financial Situation has drifted from the chrome of the panels below it');
});

test('the three sections keep their own left-rule styling inside the box', () => {
  // Wrapping them must not have restyled them: each still carries its own coloured left rule.
  assert.match(HTML, /#income-headline \{ border-left: 3px solid/);
  assert.match(HTML, /#mortgage-headline \{ border-left: 3px solid/);
  // …and the home loan block keeps its right to hide itself when a plan has no loan.
  assert.match(HTML, /<section id="mortgage-headline" hidden><\/section>/);
});
