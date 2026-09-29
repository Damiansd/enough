// P7-1 / P7-7 (the decidable half of comparison mode) — a `ComparisonSeries` turned into the
// plain object Chart.js is handed. No canvas, no `Chart`, no DOM; importable under `node:test`,
// and every claim in this header is an assertion in `test/app-comparison-config.test.mjs`.
//
// ⚠️ **THE WEALTH STACK IS UNREACHABLE FROM THIS FILE, AND THAT IS THE POINT OF THE FILE.**
// `chartConfig.ts` already warns that a third stacked band "would draw every reachable dollar
// twice and print a total larger than it is". Pushing a second Scenario's bands into the one
// global `WEALTH_STACK` does exactly that, N times over, and a chart that silently reads double
// is the worst failure available here. Four mechanisms, and the last two are the ones that hold:
//
//   1. **There is no band here to stack.** A comparison series carries no `bands` field at all
//      (`comparisonSeries.ts`) — each Scenario is ONE line in whichever view is drawn (total
//      wealth, or the assessable figure alone) — so there is never a pair of treatments to stack.
//   2. **This module never imports `WEALTH_STACK`, `WealthStack`, `BandDataset` or any band type.**
//      Its import list is read off the RAW source and pinned; the only things it takes from
//      `chartConfig.ts` are the axis machinery both views share (`ageAxisTitle`, `xAxisTickPlan`
//      and the two axis types) and the assets-test lines' prose and colours (`ASSETS_TEST_ONLY_NOTE`,
//      `THRESHOLD_COLOURS`), none of which can carry a stack.
//   3. **`ScenarioLineDataset` and `ComparisonThresholdDataset` both declare `stack?: never`.** Not "omits `stack`" — DECLARES it as
//      `never`, which is the one form a spread cannot launder: `{ ...line, stack: WEALTH_STACK }`
//      has type `{ stack: string }` and `string` is not assignable to `never`, so `tsc` refuses it
//      (TS2322) where an excess-property check would have been defeated. `test/app-comparison-
//      config.test.mjs` runs that exact probe through `tsc --noEmit`, with a positive control.
//   4. **And because a cast is one token and types are erased, `refuseStacking` CHECKS IT AT RUN
//      TIME** on the object actually returned: any dataset carrying an own `stack` key, and any
//      y-axis left `stacked`, is a refusal rather than a chart. That is the mechanism that
//      survives a `as unknown as` — the types are the speed bump, this is the guard.
//
// **`y.stacked` IS `false` HERE, AND THAT IS A CORRECTNESS FIX, NOT A STYLE CHOICE.** Chart.js
// stacks every dataset on a `stacked: true` axis that does not name a different stack group — so
// leaving the focused chart's `stacked: true` in place would have drawn Scenario B's line at
// A + B and printed a household wealth neither plan has. The focused chart needs `stacked: true`
// because its two bands genuinely partition one total; this one must not have it, and
// `refuseStacking` is what stops it coming back.
//
// **TWO VIEWS, ONE SWITCH (`ComparisonView`).** `'totalWealth'` (the default) draws each Scenario's
// total wealth and NO threshold lines — there is no assets-test figure on that chart for a
// threshold to be read against. `'centrelink'` draws each Scenario's `assessableAssets` and the
// assets test's two stepped threshold lines, on the focused chart's labels, colours, dash, stepping
// and `spanGaps: false` — a month with no entitlement is `null` and stays a gap. The thresholds
// depend on the walk (selling the home moves a Household to the non-homeowner figures), so:
//
//   * where EVERY drawn Scenario's thresholds are identical month for month (nulls included) there
//     is ONE pair, in the focused chart's teal/red;
//   * otherwise there is one pair PER Scenario, in that Scenario's colour, the two told apart by
//     dash, and labelled with the Scenario's legend label. One Scenario's thresholds are never
//     silently drawn for all of them.
//
// Neither kind of threshold dataset carries a stack key, and `refuseStacking` sweeps them with the
// lines.
//
// **NO CAPTIONS (user ruling, 2026-09-19).** `ComparisonRule` has no `caption` field to hold one:
// N captions collide, the two markers of the focused chart already land one month apart on the
// committed fixture, and the Shortfall Ages live as TEXT in the Scenario list. The rules
// themselves are drawn, in each Scenario's own colour.
//
// **THE LEGEND IS WHAT IDENTIFIES A LINE (P7-7).** It is on, at the bottom, with no height cap: a
// capped legend silently drops the sixth Scenario, which is the same class of failure as a
// silently wrapped palette. Colours come from `scenarioStyle.ts`, keyed by Scenario ID and never
// by array position, and where two Scenarios share a NAME the legend label carries the id as well
// — two identical legend entries would make the two lines unidentifiable however distinct their
// colours are.
import { AGE_PENSION_AGE_COLOUR, ASSETS_TEST_ONLY_NOTE, THRESHOLD_COLOURS, ageAxisTitle, xAxisTickPlan } from './chartConfig.js'; // `.js` is correct in a `.ts` file
import type { AxisMode, XAxisTickPlan } from './chartConfig.js';
import { THRESHOLD_LABELS } from './monthsToSeries.js';
import type { ThresholdKey } from './monthsToSeries.js';
import { scenarioStyles } from './scenarioStyle.js';
import { MONEY_VIEW_BASIS, moneyLens } from './todaysDollars.js';
import type { MoneyBasis } from './todaysDollars.js';
import type { Cents } from '../core/money.js';
import { monthName } from './financialYearRows.js';
import { SHORTFALL_IN_LIST_NOTE } from './comparisonSeries.js';
import type { ComparisonSeries, ScenarioComparisonLine } from './comparisonSeries.js';

export const COMPARISON_TITLE = 'Total wealth, by scenario';

export const CENTRELINK_COMPARISON_TITLE = 'Assets Centrelink counts, by scenario';

/** The Centrelink view's stand-in for `COMPARISON_NOTE`, which says the split is not drawn. */
export const CENTRELINK_COMPARISON_NOTE =
  'Each line is the assets one scenario’s Age Pension assets test counts — protected assets are left out. Select a single scenario to see both.';

/** Which figure each Scenario's line is. `'totalWealth'` is the default and draws no thresholds. */
export type ComparisonView = 'totalWealth' | 'centrelink';

/**
 * The per-Scenario threshold pair's two dashes — told apart from each other by dash, since both are
 * in the Scenario's own colour. `fullPensionUpTo` keeps the focused chart's `[8, 4]`.
 */
export const PER_SCENARIO_THRESHOLD_DASH: Readonly<Record<ThresholdKey, readonly number[]>> = Object.freeze({
  fullPensionUpTo: Object.freeze([8, 4]),
  noPensionAbove: Object.freeze([2, 4]),
});

/** P6-8c — `scenarioId` on the crossover's own `ComparisonRule`. Not a real Scenario's id. */
export const CROSSOVER_RULE_SCENARIO_ID = 'crossover';

/** P6-8c — black, deliberately: neither `SCENARIO_COLOURS` nor `chartConfig.ts`'s `MARKER_COLOURS` use it. */
export const CROSSOVER_RULE_COLOUR = '#000000';

/** `scenarioId` on an Age Pension age rule. Not a real Scenario's id, and not the crossover's. */
export const AGE_PENSION_AGE_RULE_SCENARIO_ID = 'age-pension-age';

/**
 * The one subtitle line naming the bare Age Pension age rules, with their dates — the rules carry
 * no caption here, by ruling, so this is where a reader learns what the grey lines are.
 */
export const agePensionAgeRulesNote = (lines: ComparisonSeries['agePensionAge']['lines']): string =>
  `Grey upright lines: Age Pension age — ${lines.map((line) => `${line.name} (${monthName(line.month)} ${line.month.slice(0, 4)})`).join(', ')}`;

/**
 * One Scenario's line. **`stack` is declared `never` on purpose — see mechanism 3 in the header.**
 * `key` is `scenario:<id>` so that no dataset of this chart can collide with a band's or an
 * overlay's key from the focused chart.
 */
export type ScenarioLineDataset = {
  readonly key: `scenario:${string}`;
  readonly scenarioId: string;
  /** What the legend shows. The Scenario's name, plus its id where that name is not unique. */
  readonly label: string;
  readonly data: readonly number[];
  /** **Never a stack group, of any name.** There is no value of type `never` to put here. */
  readonly stack?: never;
  /** Never filled: a filled line reads as a band, and this view has no bands. */
  readonly fill: false;
  readonly borderColor: string;
  readonly borderDash: readonly number[];
  readonly borderWidth: number;
  readonly pointRadius: 0;
};

/**
 * One assets-test threshold line in the Centrelink view. `scenarioId` is absent on the shared pair
 * and present on a per-Scenario one. **`stack?: never`, as on the line above.**
 */
export type ComparisonThresholdDataset = {
  readonly key: `threshold:${ThresholdKey}` | `threshold:${ThresholdKey}:${string}`;
  readonly scenarioId?: string;
  readonly label: string;
  /** `null` where the walk computed no entitlement that month — a gap, never bridged. */
  readonly data: readonly (number | null)[];
  readonly stack?: never;
  readonly fill: false;
  readonly stepped: 'before';
  readonly spanGaps: false;
  readonly borderColor: string;
  readonly borderDash: readonly number[];
  readonly borderWidth: number;
  readonly pointRadius: 0;
};

/**
 * A bare vertical rule at one Scenario's Shortfall Age, in that Scenario's own colour. **There is
 * no caption field, by ruling** — the age is in the Scenario list as text.
 */
export type ComparisonRule = {
  readonly scenarioId: string;
  /** Index into `series.months`. Never negative, never faked when there is no shortfall. */
  readonly index: number;
  /** The month `index` points at, carried so a writer that mis-indexes can be caught. */
  readonly month: string;
  readonly colour: string;
};

export type ComparisonChartConfig = {
  readonly type: 'line';
  readonly data: {
    readonly labels: readonly string[] | readonly (readonly string[])[];
    readonly datasets: readonly (ScenarioLineDataset | ComparisonThresholdDataset)[];
  };
  readonly options: Record<string, unknown>;
  /** Not a Chart.js key: `renderChart.ts` takes this off and strokes it. */
  readonly rules: readonly ComparisonRule[];
  /** Not a Chart.js key either — see `chartConfig.ts`'s `XAxisTickPlan`. */
  readonly xTicks: XAxisTickPlan;
};

/**
 * **The run-time half of "the stack is unreachable" — mechanism 4.** Exported so the guard itself
 * can be tested with a dataset the type system would never have allowed: a cast is one token, and
 * a guard that is only ever called on honest input is a guard nothing has measured.
 *
 * Two things are refused, because there are two ways to stack: a dataset that names a stack GROUP,
 * and a y-axis left `stacked`, on which Chart.js stacks every dataset that names no group at all.
 * The second is the one an author would reach for by copying the focused chart's options.
 */
export const refuseStacking = (datasets: readonly object[], yStacked: unknown): void => {
  for (const dataset of datasets) {
    if (Object.prototype.hasOwnProperty.call(dataset, 'stack')) {
      throw new RangeError(
        'a scenario line carries a stack group — comparison mode draws one line per scenario, and stacking them would print a figure no scenario has',
      );
    }
  }
  if (yStacked !== false) {
    throw new RangeError(
      `the comparison chart's y-axis is stacked (${String(yStacked)}) — Chart.js stacks every dataset that names no group, so each scenario would be drawn on top of the last`,
    );
  }
};

/**
 * The legend label for every line. The Scenario's own name, EXCEPT where another Scenario in the
 * same comparison has that name too — then both carry their id as well. Nothing here renames a
 * Scenario; this is what the legend prints, and `comparisonSeries.ts` still holds the name as the
 * plan spells it.
 */
const legendLabels = (series: ComparisonSeries): ReadonlyMap<string, string> => {
  const counts = new Map<string, number>();
  for (const line of series.lines) counts.set(line.name, (counts.get(line.name) ?? 0) + 1);
  return new Map(
    series.lines.map((line) => [line.scenarioId, (counts.get(line.name) ?? 0) > 1 ? `${line.name} (${line.scenarioId})` : line.name]),
  );
};

const THRESHOLD_KEYS: readonly ThresholdKey[] = Object.freeze(['fullPensionUpTo', 'noPensionAbove'] as const);

const sameThresholds = (a: ScenarioComparisonLine, b: ScenarioComparisonLine): boolean =>
  THRESHOLD_KEYS.every((key) => a.thresholds[key].length === b.thresholds[key].length && a.thresholds[key].every((value, index) => value === b.thresholds[key][index]));

const hasThresholds = (line: ScenarioComparisonLine): boolean =>
  THRESHOLD_KEYS.some((key) => line.thresholds[key].some((value) => value !== null));

/**
 * The Centrelink view's threshold lines — one shared pair where every drawn Scenario's are
 * identical, one pair per Scenario otherwise (see the header). Converted point by point like a
 * line; a `null` stays `null`.
 */
const thresholdDatasets = (
  series: ComparisonSeries,
  basis: MoneyBasis,
  styleOf: (scenarioId: string) => { readonly colour: string },
  labelOf: (scenarioId: string) => string,
): readonly ComparisonThresholdDataset[] => {
  const convert = (values: readonly (number | null)[]): readonly (number | null)[] =>
    Object.freeze(values.map((value, index) => (value === null ? null : (moneyLens(basis, series.months[index] as string)(value as Cents) as number))));
  const first = series.lines[0] as ScenarioComparisonLine;
  if (series.lines.every((line) => sameThresholds(line, first))) {
    if (!hasThresholds(first)) return [];
    return THRESHOLD_KEYS.map((key) =>
      Object.freeze({
        key: `threshold:${key}` as const,
        label: THRESHOLD_LABELS[key],
        data: convert(first.thresholds[key]),
        fill: false as const,
        stepped: 'before' as const,
        spanGaps: false as const,
        borderColor: THRESHOLD_COLOURS[key],
        borderDash: Object.freeze([8, 4]),
        borderWidth: 2,
        pointRadius: 0 as const,
      }),
    );
  }
  return series.lines.filter(hasThresholds).flatMap((line) =>
    THRESHOLD_KEYS.map((key) =>
      Object.freeze({
        key: `threshold:${key}:${line.scenarioId}` as const,
        scenarioId: line.scenarioId,
        label: `${THRESHOLD_LABELS[key]} — ${labelOf(line.scenarioId)}`,
        data: convert(line.thresholds[key]),
        fill: false as const,
        stepped: 'before' as const,
        spanGaps: false as const,
        borderColor: styleOf(line.scenarioId).colour,
        borderDash: PER_SCENARIO_THRESHOLD_DASH[key],
        borderWidth: 2,
        pointRadius: 0 as const,
      }),
    ),
  );
};

/**
 * `series` turned into the object Chart.js is handed. `mode` picks the label set exactly as
 * `chartConfig` does, and moves no data point.
 *
 * **THE ONE THING THAT IS COMPUTED HERE IS THE MONEY BASIS (P2-7), AND IT HAD TO BE.** Until this
 * slice the claim above was *"nothing is computed here"* — every number in every dataset was an
 * element of the `ComparisonSeries` it was given. It no longer is: each point is divided by the
 * price level of its OWN month, exactly as `chartConfig`'s bands and reachable line are, and by
 * calling the same `moneyLens`. Leaving this one chart nominal was the alternative, and it is the
 * worse one — the page would then answer *"which plan is better?"* in future dollars while the
 * table and the focused chart answered *"what can Centrelink see?"* in today's money, off the same
 * toggle. ADR-0001 names a chart whose basis disagrees with its neighbour as the most likely place
 * to confuse yourself, so both charts move together or neither does.
 *
 * What is still true, and is still swept by the test, is that every point is `moneyLens` applied to
 * one element of the series at that element's own index — nothing is summed, smoothed or dropped,
 * and in the `'futureDollars'` view the lens is the identity, so the datasets are the series'
 * own arrays value for value.
 *
 * There is no Contingency Floor in this chart, so the other lens does not appear here.
 *
 * `view` picks which of each line's two arrays is drawn, and whether the thresholds are — see the
 * header.
 */
export const comparisonChartConfig = (
  series: ComparisonSeries,
  basis: MoneyBasis,
  mode: AxisMode = 'date',
  view: ComparisonView = 'totalWealth',
): ComparisonChartConfig => {
  const styles = scenarioStyles(series.styleIds);
  const labels = legendLabels(series);
  const styleOf = (scenarioId: string) => {
    const style = styles.get(scenarioId);
    if (style === undefined) throw new RangeError(`scenario "${scenarioId}" has no style — every line drawn must be identifiable`);
    return style;
  };
  const lineDatasets: readonly ScenarioLineDataset[] = series.lines.map((line) => {
    const style = styleOf(line.scenarioId);
    return Object.freeze({
      key: `scenario:${line.scenarioId}` as const,
      scenarioId: line.scenarioId,
      label: labels.get(line.scenarioId) ?? line.name,
      data: Object.freeze(
        (view === 'centrelink' ? line.assessableValues : line.values).map(
          (value, index) => moneyLens(basis, series.months[index] as string)(value as Cents) as number,
        ),
      ),
      fill: false as const,
      borderColor: style.colour,
      borderDash: style.dash,
      borderWidth: 2,
      pointRadius: 0 as const,
    });
  });
  const thresholds =
    view === 'centrelink' ? thresholdDatasets(series, basis, styleOf, (scenarioId) => labels.get(scenarioId) ?? scenarioId) : [];
  const datasets: readonly (ScenarioLineDataset | ComparisonThresholdDataset)[] = Object.freeze([...lineDatasets, ...thresholds]);
  const notes = [
    ...(view === 'centrelink'
      ? [CENTRELINK_COMPARISON_NOTE, SHORTFALL_IN_LIST_NOTE, ...(thresholds.length > 0 ? [ASSETS_TEST_ONLY_NOTE] : [])]
      : series.notes),
    ...(series.agePensionAge.lines.length > 0 ? [agePensionAgeRulesNote(series.agePensionAge.lines)] : []),
    ...series.agePensionAge.notes,
  ];
  const rules: readonly ComparisonRule[] = Object.freeze([
    ...series.lines.flatMap((line) => {
      const index = line.shortfall.index;
      const month = line.shortfall.month;
      if (index === undefined || month === undefined) return [];
      const style = styles.get(line.scenarioId);
      if (style === undefined) return [];
      return [Object.freeze({ scenarioId: line.scenarioId, index, month, colour: style.colour })];
    }),
    // P6-8c — the crossover, reusing the SAME bare-rule mechanism as a Shortfall Age rule above
    // (`renderChart.ts`'s `comparisonRules` plugin draws every member of this array identically).
    // Present only where `comparisonSeries.ts` found a stable crossing between exactly two lines —
    // see `ComparisonCrossover`'s own doc. `CROSSOVER_RULE_COLOUR` is neither Scenario's own colour
    // (`scenarioStyle.ts`'s eight never include it) nor a focused-chart marker colour
    // (`chartConfig.ts`'s `MARKER_COLOURS`) — a reader switching between the two views must not
    // meet the assets-test purple, or a Scenario's own line colour, standing for a different fact.
    ...(series.crossover === undefined
      ? []
      : [Object.freeze({
          scenarioId: CROSSOVER_RULE_SCENARIO_ID,
          index: series.crossover.index,
          month: series.crossover.month,
          colour: CROSSOVER_RULE_COLOUR,
        })]),
    // One bare rule per Person at their Age Pension age, in the focused chart's own grey — named,
    // with dates, in the subtitle above rather than captioned (captions are banned here).
    ...series.agePensionAge.lines.map((line) =>
      Object.freeze({ scenarioId: AGE_PENSION_AGE_RULE_SCENARIO_ID, index: line.index, month: line.month, colour: AGE_PENSION_AGE_COLOUR }),
    ),
  ]);
  const yStacked = false;
  refuseStacking(datasets, yStacked);
  return Object.freeze({
    type: 'line' as const,
    data: Object.freeze({
      labels: mode === 'age' ? series.ageAxis.labels : series.months,
      datasets,
    }),
    options: Object.freeze({
      animation: false,
      normalized: true,
      responsive: true,
      maintainAspectRatio: false,
      interaction: Object.freeze({ mode: 'index', intersect: false }),
      plugins: Object.freeze({
        // OFF for the reason `chartConfig.ts` gives: a library that dropped points would leave a
        // rule on the wrong month, which is confidently wrong rather than absent.
        decimation: Object.freeze({ enabled: false }),
        // No `maxHeight`: a capped legend drops entries silently, and an unidentifiable line is
        // the whole failure P7-7 is about. Six scenarios wrap onto a second row instead.
        legend: Object.freeze({ display: true, position: 'bottom', labels: Object.freeze({ boxWidth: 30, padding: 10 }) }),
        title: Object.freeze({ display: true, text: view === 'centrelink' ? CENTRELINK_COMPARISON_TITLE : COMPARISON_TITLE }),
        // The basis is FIRST and is on the face of this chart too — see `chartConfig.ts`'s subtitle.
        subtitle: Object.freeze({ display: true, text: Object.freeze([MONEY_VIEW_BASIS[basis.view], ...notes]) }),
      }),
      scales: Object.freeze({
        x: Object.freeze(
          mode === 'age' ? { title: Object.freeze({ display: true, text: ageAxisTitle(series.ageAxis) }) } : {},
        ),
        // **`false`, and `refuseStacking` above has already checked it.** See the header.
        y: Object.freeze({ stacked: yStacked, beginAtZero: true }),
      }),
    }),
    rules,
    xTicks: xAxisTickPlan(series.months),
  });
};
