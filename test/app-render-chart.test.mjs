// P7 (the writer's one testable seam) — `mutableChartInput`, over the same demo Scenario
// `test/app-chart-config.test.mjs` uses. `renderChart.ts` itself stays untested for the reason its
// own header gives: a chart is pixels on a canvas, and neither jsdom nor a browser is available
// (TODO.md P2-9a). But the one thing `renderChart.ts` does BEFORE it ever touches a canvas — clone
// `chartConfig()`'s frozen output into something Chart.js is allowed to write to — needs no DOM and
// no canvas, so it lives in `chartConfig.ts` (see that file's doc comment) and is asserted here.
//
// **Why this function exists at all, confirmed by a real crash.** The vendored Chart.js normalises
// the config object it is given IN PLACE at construction — it writes `config.data.datasets` itself
// — and `chartConfig()` freezes its output all the way down, on purpose, so that the 25 assertions
// in `test/app-chart-config.test.mjs` mean what they say. Handing Chart.js the frozen original
// throws `TypeError: "datasets" is read-only` before a single pixel is drawn. §1 below asserts the
// config really is frozen this deep, so the rest of this file documents WHY the clone exists rather
// than reading as ceremony.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { project } from '../dist/core/projection.js';
import { DEMO_ENTRIES, DEMO_HOUSEHOLD, DEMO_SETTINGS } from '../dist/app/demoHousehold.js';
import { statedContingencyFloor } from '../dist/core/outcomes.js';
import { monthsToSeries } from '../dist/app/monthsToSeries.js';
import { chartConfig, mutableChartInput } from '../dist/app/chartConfig.js';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const FLOOR_700K = 700_000_00;
/**
 * **The floor as a plan states it (P4-14).** `monthsToSeries` no longer takes a bare figure: a
 * floor is `Settings.contingencyFloor`, stated in TODAY'S money, and it travels with the date it is
 * stated at and the CPI that raises it to a later month's price level. Built through
 * `statedContingencyFloor` rather than as a literal, so these fixtures go through the door a page
 * goes through.
 */
const STATED_700K = statedContingencyFloor({ ...DEMO_SETTINGS, contingencyFloor: FLOOR_700K });


const MONTHS = project(DEMO_SETTINGS, DEMO_HOUSEHOLD, DEMO_ENTRIES);
const SERIES = monthsToSeries(MONTHS, DEMO_HOUSEHOLD, STATED_700K, DEMO_SETTINGS.economicSeries.agePension);
/**
 * The raw future amounts — see `test/app-chart-config.test.mjs` for why this file draws in that
 * basis. In the future-dollars view `todaysDollars.ts`'s lens is the identity, so every dataset is
 * still the series' own array, value for value, and nothing below is re-based. The today's-money
 * view is `test/app-todays-dollars.test.mjs`.
 */
const FUTURE = { view: 'futureDollars', asAtDate: DEMO_SETTINGS.asAtDate, cpi: DEMO_SETTINGS.economicSeries.cpi };
const CONFIG = chartConfig(SERIES, FUTURE);

/** Every object or array reachable from `value`, WITH `value` itself — the nodes freezing applies to. */
const nodesOf = function* (value) {
  if (value === null || typeof value !== 'object') return;
  yield value;
  const children = Array.isArray(value) ? value : Object.values(value);
  for (const child of children) yield* nodesOf(child);
};

/** Every leaf-bearing path, so value-equality is checked at the same granularity as `walkValues`
 * in `test/app-chart-config.test.mjs`. */
const walkValues = function* (value, path = '$') {
  yield [path, value];
  if (Array.isArray(value)) {
    for (const [i, item] of value.entries()) yield* walkValues(item, `${path}[${i}]`);
  } else if (value !== null && typeof value === 'object') {
    for (const [key, item] of Object.entries(value)) yield* walkValues(item, `${path}.${key}`);
  }
};

// --- §1 The premise: the frozen original is why the clone exists --------------------------------

test('the vacuity control — chartConfig()’s own output is frozen at EVERY node, not just the root', () => {
  const nodes = [...nodesOf(CONFIG)];
  assert.ok(nodes.length > 20, 'too few nodes to be a meaningful check of "every node"');
  const unfrozen = nodes.filter((node) => !Object.isFrozen(node));
  assert.deepEqual(unfrozen, [], 'a node chartConfig() left unfrozen would not have crashed Chart.js, and this test would be testing nothing');
});

// --- §2 The clone is deeply unfrozen, everywhere Chart.js writes and everywhere it might ---------

test('mutableChartInput’s result is unfrozen at the root, data, datasets, each dataset, its data array, options and the nested scales/plugins', () => {
  const clone = mutableChartInput(CONFIG);
  assert.equal(Object.isFrozen(clone), false, 'root');
  assert.equal(Object.isFrozen(clone.data), false, 'data');
  assert.equal(Object.isFrozen(clone.data.datasets), false, 'data.datasets');
  for (const [i, dataset] of clone.data.datasets.entries()) {
    assert.equal(Object.isFrozen(dataset), false, `data.datasets[${i}]`);
    assert.equal(Object.isFrozen(dataset.data), false, `data.datasets[${i}].data`);
  }
  assert.equal(Object.isFrozen(clone.options), false, 'options');
  assert.equal(Object.isFrozen(clone.options.scales), false, 'options.scales');
  assert.equal(Object.isFrozen(clone.options.scales.x), false, 'options.scales.x');
  assert.equal(Object.isFrozen(clone.options.scales.y), false, 'options.scales.y');
  assert.equal(Object.isFrozen(clone.options.plugins), false, 'options.plugins');
  assert.equal(Object.isFrozen(clone.options.plugins.legend), false, 'options.plugins.legend');
  assert.equal(Object.isFrozen(clone.options.plugins.subtitle), false, 'options.plugins.subtitle');
  assert.equal(Object.isFrozen(clone.options.plugins.decimation), false, 'options.plugins.decimation');
});

test('EVERY node reachable from the clone is unfrozen — a shallow clone passing the checks above would still fail this', () => {
  const clone = mutableChartInput(CONFIG);
  const nodes = [...nodesOf(clone)];
  assert.ok(nodes.length > 20, 'too few nodes to be a meaningful sweep');
  const stillFrozen = nodes.filter((node) => Object.isFrozen(node));
  assert.deepEqual(stillFrozen, [], 'a frozen node survived the clone — Chart.js will throw on it just as it did on the original');
});

// --- §3 The clone is value-equal to the original, and does not mutate it -------------------------

test('the clone is value-equal to the frozen original — nothing lost or reordered', () => {
  const clone = mutableChartInput(CONFIG);
  assert.deepEqual(clone, CONFIG);
  const originalPaths = [...walkValues(CONFIG)].map(([path]) => path);
  const clonePaths = [...walkValues(clone)].map(([path]) => path);
  assert.deepEqual(clonePaths, originalPaths, 'the clone visits the same paths in the same order as the original');
});

test('cloning does not mutate the original — it is still frozen, at every node, afterwards', () => {
  mutableChartInput(CONFIG);
  const unfrozen = [...nodesOf(CONFIG)].filter((node) => !Object.isFrozen(node));
  assert.deepEqual(unfrozen, [], 'the original lost its freeze after being cloned — the clone must not touch its source');
});

test('the clone is a genuine copy, not the same objects re-labelled', () => {
  const clone = mutableChartInput(CONFIG);
  assert.notEqual(clone, CONFIG);
  assert.notEqual(clone.data, CONFIG.data);
  assert.notEqual(clone.data.datasets, CONFIG.data.datasets);
  assert.notEqual(clone.data.datasets[0], CONFIG.data.datasets[0]);
  assert.notEqual(clone.data.datasets[0].data, CONFIG.data.datasets[0].data);
  assert.notEqual(clone.options, CONFIG.options);
  assert.notEqual(clone.options.scales, CONFIG.options.scales);
});

// --- §4 The ordering trap in renderChart.ts — RAW SOURCE, since neither Chart.js nor a canvas ----
//
// `renderChart()` itself cannot be called under `node:test`: it reaches `new Chart(canvas, ...)`,
// and both the vendored `Chart` global and a real `HTMLCanvasElement` need a browser, not merely a
// missing dev dependency (TODO.md P2-9a keeps `typescript` as the only one). Reordering the two
// lines so the tick callback is attached to the FROZEN `chartConfig()` output before cloning would
// throw `TypeError` at that assignment, before `new Chart` is ever reached — but nothing here can
// run that line and observe the throw. So the source text is asserted instead, the same way
// `test/app-chart-config.test.mjs`'s RAW SOURCE tests pin a rule that only exists in prose:
// `mutableChartInput(` must appear before `callback:` in the file, which is exactly the ordering
// the doc comment on `renderChart` requires.

const RENDER_SOURCE = readFileSync(join(ROOT, 'src', 'app', 'renderChart.ts'), 'utf8');
const RENDER_CODE = RENDER_SOURCE.replaceAll(/\/\*[\s\S]*?\*\//g, '').replaceAll(/\/\/.*$/gm, '');

test('RAW SOURCE — renderChart.ts clones the config before it attaches the tick callback, not after', () => {
  const cloneAt = RENDER_CODE.indexOf('mutableChartInput(');
  const callbackAt = RENDER_CODE.indexOf('callback:');
  assert.ok(cloneAt >= 0, 'mutableChartInput is no longer called from renderChart.ts');
  assert.ok(callbackAt >= 0, 'the tick callback is no longer attached in renderChart.ts');
  assert.ok(
    cloneAt < callbackAt,
    'the tick callback is attached at or before the clone — a function cannot survive structuredClone, and the frozen original throws on the write',
  );
});

// --- §4b P7-8's x-axis tick filter — the SAME ordering trap, on the SECOND function this file
// attaches to the clone. `xTicks` (the pure layer's decision, `chartConfig.ts`) reaches Chart.js only
// through `scale.options.afterBuildTicks`, a function, so it is subject to the identical clone-first
// rule as the y-axis formatter above. Genuinely UNPROVEN here, and left explicitly so rather than
// hidden: that Chart.js actually calls `afterBuildTicks` with the scale object this code assumes
// (`{ ticks: [{ value }] }`), that `scale.ticks[i].value` really is the category index and not
// something else, and that reassigning `scale.ticks` in place is enough to change what is drawn —
// none of that can be exercised without the vendored library and a canvas, and stays for a human
// looking at the rendered page to confirm.

test('RAW SOURCE — the x-axis tick filter is also attached to the CLONE, after `mutableChartInput`, never before', () => {
  const afterBuildTicksAt = RENDER_CODE.indexOf('afterBuildTicks');
  assert.ok(afterBuildTicksAt >= 0, 'the x-axis tick filter is no longer wired in renderChart.ts');
  const cloneAt = RENDER_CODE.indexOf('mutableChartInput(');
  assert.ok(
    cloneAt < afterBuildTicksAt,
    'afterBuildTicks is attached at or before the clone — the frozen original would throw on the write',
  );
});

test('RAW SOURCE — the tick filter reads `xTicks` off the SAME clone the rest of the config comes from, not a second call to `chartConfig`', () => {
  const destructureAt = RENDER_CODE.search(/const\s*\{[^}]*\bxTicks\b[^}]*\}\s*=\s*mutableChartInput\(/);
  assert.ok(destructureAt >= 0, 'xTicks is not destructured from the same mutableChartInput(...) call as markers/type/data/options');
});

// --- §5 The marker caption — RAW SOURCE, for the same reason as §4 -------------------------------
//
// This is a genuine visual defect fix (the caption ran off the left edge of the canvas and
// collided with the topmost y-axis tick label) in a file this project's own header says cannot be
// asserted by drawing: no canvas, no jsdom (TODO.md P2-9a). So, as with the ordering trap in §4,
// the fix is pinned as a property of the SOURCE TEXT rather than of a rendered pixel. This proves
// the mechanism is present; it does NOT prove the caption lands in the right place on screen —
// that half of the fix remains for a human to confirm by looking at the page.

test('RAW SOURCE — the caption is measured, not guessed, before it is placed', () => {
  assert.match(RENDER_CODE, /ctx\.measureText\(/, 'a caption placed without measuring its width cannot know whether it overflows');
});

test('RAW SOURCE — the old bug is gone: text alignment no longer compares an x-pixel against a y-axis midpoint', () => {
  // The defect: `ctx.textAlign = px > (chartArea.top + chartArea.bottom) / 2 ? 'right' : 'left'` —
  // `px` is a HORIZONTAL pixel, compared against a midpoint of two VERTICAL bounds. That produced
  // the wrong side often enough to run captions off the left edge. This must never come back.
  assert.doesNotMatch(
    RENDER_CODE,
    /chartArea\.top\s*\+\s*chartArea\.bottom/,
    'the caption’s side is being decided from a vertical midpoint again — this is the exact bug that clipped the caption',
  );
});

test('RAW SOURCE — the caption is clamped inside BOTH horizontal bounds of the chart area', () => {
  assert.match(RENDER_CODE, /chartArea\.left/, 'no reference to the chart’s left bound — nothing stops the caption running off it');
  assert.match(RENDER_CODE, /chartArea\.right/, 'no reference to the chart’s right bound — nothing stops the caption running off it');
  assert.match(RENDER_CODE, /Math\.max\(/, 'no lower clamp found');
  assert.match(RENDER_CODE, /Math\.min\(/, 'no upper clamp found');
});

test('RAW SOURCE — the caption anchors beside the marker’s OWN pixel, not at a fixed chart-relative offset', () => {
  // `px` is `x.getPixelForValue(marker.index)` — the rule’s own position. The caption’s anchor
  // must be built from it, not from a constant, or every caption again drifts to one edge.
  assert.match(RENDER_CODE, /anchorX\s*=\s*alignRight\s*\?\s*px/, 'the caption’s anchor is not derived from the marker’s own pixel');
});

test('RAW SOURCE — the caption is drawn with more clearance below the top than a single caption-gap, to clear the topmost tick label', () => {
  const gap = Number(/const CAPTION_GAP = (\d+);/.exec(RENDER_CODE)?.[1]);
  const clearance = Number(/const CAPTION_TOP_CLEARANCE = (\d+);/.exec(RENDER_CODE)?.[1]);
  assert.ok(Number.isFinite(gap) && Number.isFinite(clearance), 'CAPTION_GAP or CAPTION_TOP_CLEARANCE is no longer a plain numeric constant');
  assert.ok(clearance > gap, 'the caption’s vertical clearance is no bigger than its horizontal gap — too little room to clear the top tick label');
});
