// P16-1 — the "Life stages" strip's DOM half: `renderLifeStages` paints exactly what
// `lifeStagesTimeline` (`app-life-stages.test.mjs`) decided, and nothing more. Driven through the
// stand-in DOM (`fixtures/fakeDom.mjs`), on `app-chat-panel.test.mjs`'s own precedent.
import test from 'node:test';
import assert from 'node:assert/strict';

import { renderLifeStages } from '../dist/app/renderLifeStages.js';
import { installDocument } from './fixtures/fakeDom.mjs';

const TIMELINE = {
  totalMonths: 200,
  yearTicks: [
    { atIndex: 0, year: 2026 },
    { atIndex: 100, year: 2034 },
    { atIndex: 199, year: 2043 },
  ],
  persons: [
    {
      name: 'Alex',
      segments: [
        { phase: 'working', fromIndex: 0, toIndex: 40 },
        { phase: 'retired', fromIndex: 40, toIndex: 140 },
        { phase: 'care', fromIndex: 140, toIndex: 200 },
      ],
      boundaries: [
        { atIndex: 40, label: 'Retires 2029 · 63' },
        { atIndex: 140, label: 'Aged care 2038 · 72' },
      ],
      diedAtIndex: undefined,
      endLabel: undefined,
    },
    {
      name: 'Sam',
      segments: [
        { phase: 'working', fromIndex: 0, toIndex: 50 },
        { phase: 'retired', fromIndex: 50, toIndex: 90 },
      ],
      boundaries: [{ atIndex: 50, label: 'Retires 2030 · 61' }],
      diedAtIndex: 90,
      endLabel: 'Died 2033 · 64',
    },
  ],
};

test('one .phase-row per Person, in order, each carrying its own name', () => {
  const { document, uninstall } = installDocument();
  try {
    const box = document.createElement('div');
    renderLifeStages(box, TIMELINE);
    const rows = box.querySelectorAll('div.phase-row');
    assert.equal(rows.length, 2);
    assert.equal(rows[0].querySelector('span.phase-name').textContent, 'Alex');
    assert.equal(rows[1].querySelector('span.phase-name').textContent, 'Sam');
  } finally {
    uninstall();
  }
});

test('every segment is drawn with its own phase class, left and width as a percentage of totalMonths', () => {
  const { document, uninstall } = installDocument();
  try {
    const box = document.createElement('div');
    renderLifeStages(box, TIMELINE);
    const [alexRow] = box.querySelectorAll('div.phase-row');
    const segments = alexRow.querySelectorAll('div.phase-segment');
    assert.equal(segments.length, 3);
    assert.equal(segments[0].classList.contains('working'), true);
    assert.equal(segments[0].style.left, '0%');
    assert.equal(segments[0].style.width, '20%'); // 40/200
    assert.equal(segments[1].classList.contains('retired'), true);
    assert.equal(segments[1].style.left, '20%'); // 40/200
    assert.equal(segments[1].style.width, '50%'); // (140-40)/200
    assert.equal(segments[2].classList.contains('care'), true);
    assert.equal(segments[2].style.left, '70%'); // 140/200
    assert.equal(segments[2].style.width, '30%'); // (200-140)/200
    assert.equal(segments[2].textContent, 'In aged care');
  } finally {
    uninstall();
  }
});

test('a boundary is a labelled span positioned at its own month, and a death is drawn as one too', () => {
  const { document, uninstall } = installDocument();
  try {
    const box = document.createElement('div');
    renderLifeStages(box, TIMELINE);
    const [alexRow, samRow] = box.querySelectorAll('div.phase-row');
    const alexBoundaries = alexRow.querySelectorAll('span.phase-boundary');
    assert.equal(alexBoundaries.length, 2);
    assert.equal(alexBoundaries[0].textContent, 'Retires 2029 · 63');
    assert.equal(alexBoundaries[0].style.left, '20%');
    assert.equal(alexBoundaries[1].textContent, 'Aged care 2038 · 72');

    const samBoundaries = samRow.querySelectorAll('span.phase-boundary');
    // Sam's own RETIRE boundary, plus the Died boundary — two, and the death one carries the label.
    assert.equal(samBoundaries.length, 2);
    assert.equal(samBoundaries[1].textContent, 'Died 2033 · 64');
    assert.equal(samBoundaries[1].style.left, '45%'); // 90/200
  } finally {
    uninstall();
  }
});

test('the year axis draws one span per tick, positioned and labelled by year', () => {
  const { document, uninstall } = installDocument();
  try {
    const box = document.createElement('div');
    renderLifeStages(box, TIMELINE);
    const axis = box.querySelector('div#phase-axis');
    const spans = axis.querySelectorAll('span');
    assert.equal(spans.length, 3);
    assert.equal(spans[0].textContent, '2026');
    assert.equal(spans[0].style.left, '0%');
    assert.equal(spans[2].textContent, '2043');
  } finally {
    uninstall();
  }
});

test('the legend carries all three phases, in order, each with its own swatch class', () => {
  const { document, uninstall } = installDocument();
  try {
    const box = document.createElement('div');
    renderLifeStages(box, TIMELINE);
    const legend = box.querySelector('div#phase-legend');
    const swatches = legend.querySelectorAll('span.swatch');
    assert.deepEqual(
      swatches.map((swatch) => swatch.className.split(' ').filter((name) => name !== 'swatch')[0]),
      ['working', 'retired', 'care'],
    );
    assert.equal(legend.textContent, ' Working Retired In aged care');
  } finally {
    uninstall();
  }
});

test('a redraw REPLACES the box rather than appending to it', () => {
  const { document, uninstall } = installDocument();
  try {
    const box = document.createElement('div');
    renderLifeStages(box, TIMELINE);
    renderLifeStages(box, TIMELINE);
    assert.equal(box.querySelectorAll('div.phase-row').length, 2);
  } finally {
    uninstall();
  }
});
