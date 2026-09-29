// P7 (the writer) — it hands `chartConfig()`'s object to the vendored Chart.js and strokes the
// marker rule. It decides NOTHING: no arithmetic, no aggregation, no stacking choice, no label
// wording, no floor. Every number that reaches the canvas is an element of the `ChartSeries` it
// was given, and every string is a constant of `chartConfig.ts` or `monthsToSeries.ts`.
//
// **Why it is untested, stated plainly rather than papered over.** A chart is pixels on a canvas:
// there is no drawn output to assert on, with or without jsdom, and TODO.md P2-9a keeps
// `typescript` as the one dev dependency. So the split is the safety, exactly as with
// `renderTable.ts`: everything DECIDABLE — dataset lengths, which stack each dataset joins,
// decimation off, where the marker sits — is in `chartConfig.ts` and asserted in
// `test/app-chart-config.test.mjs`. What is untested here is whether the library then draws the
// object it was handed, which a single look at the page settles.
//
// **TWO VIEWS, TWO CONFIGS, TWO ENTRY POINTS (P7-1).** `renderChart` draws ONE Scenario as the
// Protected/Assessable stack; `renderComparisonChart` draws N Scenarios as N total-wealth lines
// and no stack at all. They share no config object and no plugin: the comparison view's rules
// plugin cannot draw a caption because `ComparisonRule` has none, and its config cannot name a
// stack group because `ScenarioLineDataset` declares `stack?: never` and `refuseStacking` checks
// it at run time (`comparisonConfig.ts`). Nothing in this file decides which view is shown —
// `main.ts` owns that, and destroys the live instance before either call.
//
// `Chart` is the global the vendored UMD build sets; see `chart-global.d.ts` and
// `public/vendor/PROVENANCE.md`.
import { agesTooltipTitle, chartConfig, formatAxisTick, mutableChartInput, tooltipLabel } from './chartConfig.js'; // `.js` is correct in a `.ts` file
import type { AxisMode, ChartMarker } from './chartConfig.js';
import type { AgeAxis } from './monthsToSeries.js';
import type { MoneyBasis } from './todaysDollars.js';
import { comparisonChartConfig } from './comparisonConfig.js';
import type { ComparisonRule, ComparisonView } from './comparisonConfig.js';
import type { ChartSeries } from './monthsToSeries.js';
import type { ComparisonSeries } from './comparisonSeries.js';
import { flowChartConfig } from './flowChartConfig.js';
import type { FlowSeries } from './flowSeries.js';

/**
 * The few Chart.js internals the marker plugin touches, described structurally at the one place
 * they are used rather than invented as a library-wide type. See `chart-global.d.ts`.
 */
type DrawnChart = {
  readonly ctx: CanvasRenderingContext2D;
  readonly chartArea: { readonly top: number; readonly bottom: number; readonly left: number; readonly right: number };
  readonly scales: Record<string, { getPixelForValue(value: number): number } | undefined>;
};

/** Space kept between the caption and the rule it names. */
const CAPTION_GAP = 4;
/**
 * Vertical clearance below `chartArea.top` before the caption's baseline. Bigger than a single
 * `CAPTION_GAP` on purpose: the topmost y-axis tick label sits centred ON `chartArea.top`, so a
 * caption drawn right at the top edge collides with it — this pushes the caption clear underneath.
 */
const CAPTION_TOP_CLEARANCE = 18;
/**
 * One caption per ROW, so a second marker's caption cannot land on top of the first's. Two markers
 * can be decades apart (they are 73 months apart on the fixture that pins their independence) or a
 * month apart — nothing in the engine keeps them away from each other, so the separation is made
 * here and made unconditionally rather than only when they look close: a distance test between two
 * captions is the kind of pixel comparison that produced the caption bug this plugin already fixed
 * once. Row `i` is marker `i` in `chartConfig`'s own order, and nothing else varies with it.
 */
const CAPTION_LINE_HEIGHT = 16;

/**
 * A vertical rule at each marker's index, with its caption anchored beside it. An inline plugin
 * rather than `chartjs-plugin-annotation`, because that plugin is a second dependency and is not
 * vendored — and the position it draws at is `marker.index`, handed over by the pure layer, not
 * recomputed here.
 *
 * The caption is measured with `ctx.measureText` and placed beside the rule on whichever side
 * keeps it fully inside `chartArea`, flipping to the other side of the rule when its preferred
 * side would overflow, and clamped inside the canvas as a last resort. It never anchors at the
 * chart's own left edge — only at the rule it names.
 */
const markerRule = (markers: readonly ChartMarker[]) => ({
  id: 'enough-markers',
  afterDatasetsDraw(chart: DrawnChart): void {
    const x = chart.scales['x'];
    if (x === undefined) return;
    const { ctx, chartArea } = chart;
    for (const [row, marker] of markers.entries()) {
      const px = x.getPixelForValue(marker.index);
      ctx.save();
      ctx.beginPath();
      ctx.setLineDash([4, 3]);
      ctx.lineWidth = 2;
      ctx.strokeStyle = marker.colour;
      ctx.moveTo(px, chartArea.top);
      ctx.lineTo(px, chartArea.bottom);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = marker.colour;
      ctx.font = '12px system-ui, sans-serif';
      const text = `${marker.label} — ${marker.caption}`;
      const width = ctx.measureText(text).width;
      // Anchor beside the rule, on whichever side keeps the caption fully inside the canvas; the
      // rule marks the month, so the caption stays next to it rather than pinned to the chart's
      // own left edge. Fall back to the other side only when the preferred side overflows, and
      // clamp inside `chartArea` as a last resort so neither side can ever run off the canvas.
      const fitsRight = px + CAPTION_GAP + width <= chartArea.right;
      const fitsLeft = px - CAPTION_GAP - width >= chartArea.left;
      const alignRight = !fitsRight && (fitsLeft || px - chartArea.left > chartArea.right - px);
      ctx.textAlign = alignRight ? 'right' : 'left';
      let anchorX = alignRight ? px - CAPTION_GAP : px + CAPTION_GAP;
      anchorX = alignRight
        ? Math.min(chartArea.right, Math.max(anchorX, chartArea.left + width))
        : Math.max(chartArea.left, Math.min(anchorX, chartArea.right - width));
      ctx.fillText(text, anchorX, chartArea.top + CAPTION_TOP_CLEARANCE + row * CAPTION_LINE_HEIGHT);
      ctx.restore();
    }
  },
});

/**
 * The hover box's two callbacks, identical for both views: each line is the dataset's label and its
 * point's own value in whole dollars (`tooltipLabel`), and in the age view the title names each
 * Person's age (`agesTooltipTitle`) instead of Chart.js's comma-joined `"67,66"`. The date view keeps
 * Chart.js's own title, which is the month label as drawn.
 */
const tooltip = (ageAxis: AgeAxis, mode: AxisMode) => ({
  callbacks: {
    label: (item: { dataset: { label?: string }; raw: unknown }): string =>
      tooltipLabel(item.dataset.label ?? '', item.raw as number),
    ...(mode === 'age'
      ? { title: (items: readonly { dataIndex: number }[]): string => agesTooltipTitle(ageAxis, items[0]?.dataIndex ?? 0) }
      : {}),
  },
});

/**
 * Draws `series` into `canvas`, replacing any chart already there.
 *
 * `mode` picks the x-axis label set — `'date'` (the default) or `'age'` — by passing straight
 * through to `chartConfig`, which is where the labels-vs-data separation actually lives (see that
 * module's `AxisMode` doc comment). Switching `mode` calls this function again on the same canvas
 * rather than mutating a live chart in place: `ChartInstance.destroy()` (see `chart-global.d.ts`) is
 * the caller's tool for that, and re-running this function from scratch is the route that cannot
 * leave a live Chart.js instance half-updated. `main.ts` is the caller that owns the toggle.
 *
 * The only things added to the pure config are functions, so none can live in the plain object the
 * test inspects: the hover box's callbacks (`tooltip` above — `test/app-chart-tooltips.test.mjs`
 * reads them off the object handed to a stand-in `Chart`); the y-axis tick FORMATTER, which converts
 * nothing and only prints the figure the way the rest of the page does; and the x-axis tick FILTER, which
 * decides nothing either — `chartConfig.ts`'s `xAxisTickPlan` already chose which indices tick, and
 * this only turns that plain `indices` array into the `Chart.js` hook (`scale.options.afterBuildTicks`,
 * called after `buildTicks()` with the scale itself, letting the plan act on `scale.ticks` in place)
 * that library actually reads. Both label sets share one plan, because `xTicks` is built from
 * `series.months` and never from which of `series.months` / `series.ageAxis.labels` `mode` put in
 * `data.labels` — so date mode and age mode always tick at the identical indices.
 *
 * `chartConfig()`'s output is frozen all the way down, and Chart.js writes to `config.data.datasets`
 * itself when it normalises what it is given — so it is `mutableChartInput(chartConfig(series, mode))`,
 * a deep unfrozen COPY, that is built here and handed to `new Chart`, never the frozen original.
 * Every callback below is attached to that copy AFTER cloning, in that order and no other: a
 * function cannot survive `structuredClone`, so attaching either first and cloning second would
 * clone it away.
 */
export const renderChart = (
  canvas: HTMLCanvasElement,
  series: ChartSeries,
  basis: MoneyBasis,
  mode: AxisMode = 'date',
): ChartInstance => {
  const { markers, type, data, options, xTicks } = mutableChartInput(chartConfig(series, basis, mode));
  (options['plugins'] as Record<string, unknown>)['tooltip'] = tooltip(series.ageAxis, mode);
  const scales = options['scales'] as Record<string, Record<string, unknown>>;
  const y = scales['y'] as Record<string, unknown>;
  y['ticks'] = { callback: (value: number): string => formatAxisTick(value) };
  const x = scales['x'] as Record<string, unknown>;
  const tickIndices = new Set(xTicks.indices);
  x['afterBuildTicks'] = (scale: { ticks: { value: number }[] }): void => {
    scale.ticks = scale.ticks.filter((tick) => tickIndices.has(tick.value));
  };
  return new Chart(canvas, {
    type,
    data,
    options,
    plugins: [markerRule(markers)],
  });
};

/**
 * **The comparison view's rules: N bare strokes, and NO TEXT AT ALL (user ruling, 2026-09-19).**
 *
 * `markerRule` above measures a caption and places it beside its rule; this one cannot, because
 * `ComparisonRule` has no caption to draw and this function calls no text method. N captions on
 * one chart collide — the focused chart's two markers already land one month apart on the
 * committed fixture, which is why that one staggers them by row — and six staggered rows of text
 * over a six-line chart is not a legible way to answer "which plan is better". The Shortfall Ages
 * are in the Scenario list beside the chart instead, as text, where they can be read side by side.
 *
 * Each rule is stroked in its own Scenario's colour, which is keyed by Scenario ID
 * (`scenarioStyle.ts`) and is the same colour as that Scenario's line, so the rule is identified
 * by the thing it belongs to rather than by a label.
 */
const comparisonRules = (rules: readonly ComparisonRule[]) => ({
  id: 'enough-comparison-rules',
  afterDatasetsDraw(chart: DrawnChart): void {
    const x = chart.scales['x'];
    if (x === undefined) return;
    const { ctx, chartArea } = chart;
    for (const rule of rules) {
      const px = x.getPixelForValue(rule.index);
      ctx.save();
      ctx.beginPath();
      ctx.setLineDash([4, 3]);
      ctx.lineWidth = 2;
      ctx.strokeStyle = rule.colour;
      ctx.moveTo(px, chartArea.top);
      ctx.lineTo(px, chartArea.bottom);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();
    }
  },
});

/**
 * Draws a COMPARISON of N Scenarios into `canvas`, replacing any chart already there — one line
 * per Scenario (total wealth, or what Centrelink counts, by `view`) and no means-test stack anywhere (see `comparisonSeries.ts` for the
 * ruling, and `comparisonConfig.ts` for how the stack is made unreachable rather than merely
 * avoided).
 *
 * The same shape as `renderChart` above, deliberately: clone FIRST with `mutableChartInput`, then
 * attach the two callbacks to the clone, then construct. `comparisonChartConfig()`'s output is
 * frozen all the way down for the same reason `chartConfig()`'s is, and Chart.js normalises the
 * config it is handed in place — so the frozen original is never the thing passed to `new Chart`.
 * The caller destroys the previous instance; `main.ts` owns that, as it does for the focused view.
 */
export const renderComparisonChart = (
  canvas: HTMLCanvasElement,
  series: ComparisonSeries,
  basis: MoneyBasis,
  mode: AxisMode = 'date',
  view: ComparisonView = 'totalWealth',
): ChartInstance => {
  const { rules, type, data, options, xTicks } = mutableChartInput(comparisonChartConfig(series, basis, mode, view));
  (options['plugins'] as Record<string, unknown>)['tooltip'] = tooltip(series.ageAxis, mode);
  const scales = options['scales'] as Record<string, Record<string, unknown>>;
  const y = scales['y'] as Record<string, unknown>;
  y['ticks'] = { callback: (value: number): string => formatAxisTick(value) };
  const x = scales['x'] as Record<string, unknown>;
  const tickIndices = new Set(xTicks.indices);
  x['afterBuildTicks'] = (scale: { ticks: { value: number }[] }): void => {
    scale.ticks = scale.ticks.filter((tick) => tickIndices.has(tick.value));
  };
  return new Chart(canvas, {
    type,
    data,
    options,
    plugins: [comparisonRules(rules)],
  });
};

/**
 * Draws the second chart — "Money coming in and going out, by financial year" (design gate, 2026-09-21) —
 * into `canvas`, replacing any chart already there. No marker plugin and no age axis: this chart has
 * neither, and `flowChartConfig()`'s output is the whole of what it draws.
 *
 * The tooltip is the one addition, on `renderChart`'s own precedent: every figure `flowChartConfig`
 * hands over is already whole cents in the page's money basis (`flowSeries.ts`'s own header says
 * why the conversion happens there and not per-point here), so the callback only prints it through
 * `tooltipLabel`, in WHOLE DOLLARS — never the raw cents Chart.js would otherwise show.
 */
export const renderFlowChart = (canvas: HTMLCanvasElement, series: FlowSeries): ChartInstance => {
  const { type, data, options } = mutableChartInput(flowChartConfig(series));
  (options['plugins'] as Record<string, unknown>)['tooltip'] = {
    callbacks: {
      label: (item: { dataset: { label?: string }; raw: unknown }): string => tooltipLabel(item.dataset.label ?? '', item.raw as number),
    },
  };
  const scales = options['scales'] as Record<string, Record<string, unknown>>;
  const y = scales['y'] as Record<string, unknown>;
  y['ticks'] = { callback: (value: number): string => formatAxisTick(value) };
  return new Chart(canvas, { type, data, options });
};
