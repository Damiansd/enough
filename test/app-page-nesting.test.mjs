// **THE PAGE'S BLOCK NESTING — every panel closes where it opens, and sits at the top level.**
//
// Added 2026-09-25 after a panel move left Financial Situation's `</details></section>` behind at its
// old spot: every later panel rendered INSIDE it, and all 330 suites that read `index.html` stayed
// green, because each pins its own ids by substring or document order, and none of that notices a
// closing tag in the wrong place. Only a screenshot caught it.
//
// Two checks, because either alone misses a case:
//   1. The container tags balance as a STACK (a closer before its opener fails, even when the counts
//      match — which is exactly what the stray `</details></section>` looked like).
//   2. Each named panel's parent is <body>. A well-formed page can still nest one panel in another
//      if a closer merely moves DOWN; this pins which panels are siblings.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const HTML = readFileSync(join(ROOT, 'public', 'index.html'), 'utf8');

/** Tags whose end tag is required, so a stack over them is exact. `<p>`, `<li>` etc. are left out: their end tags are optional. */
const CONTAINERS = new Set(['body', 'section', 'details', 'summary', 'div', 'fieldset', 'legend']);

/**
 * Walks the body's container tags as a stack. Returns `{ errors, parentOf }` where `parentOf` maps
 * each element id to its nearest container ancestor's tag and id ("body" for a top-level panel).
 */
const walk = (html) => {
  // The REAL <body> tag, at the start of a line: the stylesheet's own comments mention `<body>` too.
  const body = html.slice(html.search(/^<body\b/m), html.lastIndexOf('</body>') + '</body>'.length);
  // Comments and scripts can hold tag-like text; they are not markup.
  const markup = body.replace(/<!--[\s\S]*?-->/g, '').replace(/<script\b[\s\S]*?<\/script>/g, '');
  const errors = [];
  const parentOf = new Map();
  const stack = [];
  for (const match of markup.matchAll(/<(\/?)([a-zA-Z][a-zA-Z0-9]*)\b([^>]*)>/g)) {
    const [, closing, rawName, attrs] = match;
    const name = rawName.toLowerCase();
    if (!CONTAINERS.has(name)) continue;
    if (closing) {
      const top = stack.pop();
      if (top === undefined) errors.push(`</${name}> closes nothing`);
      else if (top.name !== name) errors.push(`</${name}> closes <${top.name}${top.id ? ` id="${top.id}"` : ''}>`);
      continue;
    }
    const id = /\bid="([^"]+)"/.exec(attrs)?.[1];
    const parent = stack.at(-1);
    if (id) parentOf.set(id, parent ? (parent.name === 'body' ? 'body' : `${parent.name}#${parent.id ?? '?'}`) : 'none');
    stack.push({ name, id });
  }
  for (const open of stack) errors.push(`<${open.name}${open.id ? ` id="${open.id}"` : ''}> is never closed`);
  return { errors, parentOf };
};

/** The panels that must be siblings at the top of the page, never inside one another. */
const TOP_LEVEL = [
  'financial-situation',
  'first-run',
  'chat-host',
  'settings-panel',
  'chat-settings-panel',
  'entry-editor',
  'scenario-panel',
  'phase-timeline',
  'comparison-template-panel',
  'transactions-panel',
  'money-view-toggle',
  'chart-view-toggle',
  'chart-axis-toggle',
  'chart-box',
  'sandbox-panel',
];

test('the page\'s container tags open and close as a stack — no stray, crossed or unclosed tag', () => {
  assert.deepEqual(walk(HTML).errors, []);
});

test('every named panel sits at the top level of <body>, not inside another panel', () => {
  const { parentOf } = walk(HTML);
  for (const id of TOP_LEVEL) {
    assert.ok(parentOf.has(id), `#${id} is gone from the page — update TOP_LEVEL if that was deliberate`);
    assert.equal(parentOf.get(id), 'body', `#${id} is nested inside ${parentOf.get(id)}`);
  }
});

test('not vacuous: the 2026-09-25 bug, and a closer merely moved down, are both caught', () => {
  // (a) The actual bug: Financial Situation's closers left at the top of the page.
  const panelClose = '    <section id="sustainable-spend"></section>\n  </details>\n</section>\n';
  assert.ok(HTML.includes(panelClose), 'mutation setup failed — the Financial Situation close has moved');
  const leftBehind = HTML.replace(panelClose, '    <section id="sustainable-spend"></section>\n')
    .replace('<p id="caption">…</p>\n', '<p id="caption">…</p>\n  </details>\n</section>\n');
  assert.notEqual(leftBehind, HTML, 'mutation (a) did not apply');
  assert.notDeepEqual(walk(leftBehind).errors, [], 'stray closers before their openers were not reported');

  // (b) Well-formed but wrongly nested: the closers moved to just after Life stages, so Life stages
  // is swallowed into Financial Situation. The stack balances; only the parent pin sees it.
  const lifeStagesClose = '  <div id="phase-timeline-body"></div>\n</section>\n';
  assert.ok(HTML.includes(lifeStagesClose), 'mutation setup failed — the Life stages close has moved');
  const swallowed = HTML.replace(panelClose, '    <section id="sustainable-spend"></section>\n')
    .replace(lifeStagesClose, `${lifeStagesClose}  </details>\n</section>\n`);
  assert.notEqual(swallowed, HTML, 'mutation (b) did not apply');
  const result = walk(swallowed);
  assert.deepEqual(result.errors, [], 'mutation (b) should stay well-formed — the parent check is what must catch it');
  assert.notEqual(result.parentOf.get('phase-timeline'), 'body', 'a panel nested in another was not caught');
});
