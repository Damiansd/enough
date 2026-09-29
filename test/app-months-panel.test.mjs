// The Years and months panel (user request, 2026-09-28): the month control and the Years table sit
// in one <details>, collapsed by default, and following a chip into the table opens it first.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { installDocument, FakeElement } from './fixtures/fakeDom.mjs';
import { revealAnchor } from '../dist/app/monthAnchors.js';

const html = readFileSync(new URL('../public/index.html', import.meta.url), 'utf8');

test('the month control and the Years table sit in one collapsed panel', () => {
  const panel = /<section id="months-panel">\s*<details>([\s\S]*?)<\/details>\s*<\/section>/.exec(html);
  assert.ok(panel, 'a months-panel section holding a <details> with no `open` attribute');
  assert.match(panel[1], /<summary><h2 id="months-summary">Years and months<\/h2><\/summary>/);
  assert.match(panel[1], /<fieldset id="assets-view-toggle">[\s\S]*Position in each month/);
  assert.match(panel[1], /<div id="months"><\/div>/);
  assert.equal(html.match(/id="months"/g)?.length, 1, 'the table has one home');
});

test('following a chip into the collapsed panel opens it before scrolling', () => {
  const { document, uninstall } = installDocument();
  try {
    const details = new FakeElement('details');
    details.open = false;
    const target = new FakeElement('div');
    target.id = 'chip-target-under-test';
    details.append(target);
    document.body.append(details);
    assert.equal(revealAnchor(document, 'chip-target-under-test'), true);
    assert.equal(details.open, true, 'the panel around the target was left closed');
    assert.equal(target.scrolledIntoView, true);
  } finally {
    uninstall();
  }
});
