// the income/spend chart design gate — `flowSeries.ts` turned into the plain object Chart.js is handed, in
// `chartConfig.ts`'s own style: no canvas, no `Chart` type, no DOM, so this is importable and
// assertable under `node:test` and every claim below is an assertion in
// `test/app-flow-chart-config.test.mjs`.
//
// **NO CURRENCY CONVERSION HAPPENS HERE, AND THAT IS A DELIBERATE DEPARTURE FROM `chartConfig.ts`'s
// OWN SHAPE.** The wealth chart converts per POINT, in `chartConfig.ts`, because one point is one
// month and `moneyLens` is keyed on a month. A flow-chart bar is a WHOLE FINANCIAL YEAR — twelve
// months summed — and `financialYearRows.ts` already settled how a year is allowed to add: each
// month through its OWN month's lens, THEN summed, never the other way round. So `flowSeries.ts`
// itself takes `basis` and does that summing (see its header); by the time a `FlowSeries` reaches
// this file every figure is already in the page's money view, and this module's job is exactly what
// `chartConfig.ts`'s is for the wealth chart MINUS the conversion: which datasets, which stack each
// joins, and the axis/tooltip formatting — reusing `chartConfig.ts`'s own `formatAxisTick` and
// `tooltipLabel` rather than inventing a second whole-dollar formatter.
//
// **ONE STACK FOR EVERY INCOME/OUTFLOW GROUP, AND THE SHORTFALL IN A STACK OF ITS OWN.** Chart.js
// accumulates same-signed values sharing one stack key upward and negative ones downward, so a
// single `FLOW_STACK` carries every `FlowGroup` — inflow-side groups POSITIVE, outflow-side groups
// NEGATED once here (`flowSeries.ts` stores every group's net in ITS OWN side's positive
// convention, mirroring `MonthLine.amount`'s "always positive, direction separate" rule) — and the
// bar naturally splits income above zero from outgoings below it. `shortfall` is a SEPARATE stack
// key (`SHORTFALL_STACK`) so it can never join that accumulation, which is condition 3 of the gate
// ("never a band, never summed into income") made structural exactly as `chartConfig.ts`'s
// `WealthStack`/`OverlayStack` split makes its own two rules structural.
import { formatAxisTick, tooltipLabel } from './chartConfig.js'; // `.js` is correct in a `.ts` file — see tsconfig.json
import { FLOW_GROUP_LABELS, FLOW_GROUP_ORDER, FLOW_GROUP_SIDE, SHORTFALL_LABEL } from './flowSeries.js';
import type { FlowGroupKey, FlowSeries } from './flowSeries.js';

/** The one stack every income/outflow group shares — never the shortfall's. */
export const FLOW_STACK = 'flow-partition';
export type FlowStack = typeof FLOW_STACK;

/** The shortfall's own stack, disjoint from `FLOW_STACK` by type as well as by value. */
export const SHORTFALL_STACK = 'shortfall';
export type ShortfallStack = typeof SHORTFALL_STACK;

export const CHART_TITLE = 'Money coming in and going out, by financial year';

/**
 * One colour per group, chosen so every inflow reads warm/blue-green and every outflow reads a
 * distinct family — a reader should be able to tell which side of the bar they are looking at from
 * colour alone, before reading the legend.
 */
const GROUP_COLOURS: Readonly<Record<FlowGroupKey, string>> = Object.freeze({
  pay: '#1b5fa8',
  agePension: '#2f6f4f',
  superIncome: '#5a9bd4',
  investmentIncome: '#3fa796',
  heas: '#7a5cad',
  radRefund: '#2e8b8b',
  saleProceeds: '#4472c4',
  rentalIncome: '#2f9e44',
  spending: '#a4501f',
  mortgage: '#c0392b',
  tax: '#8a1f5f',
  agedCareCosts: '#b23a6f',
  radDeposit: '#8a6d00',
  homePurchase: '#7b4a2a',
  portfolioMove: '#6d6d6d',
  spouseContribution: '#9b7a2f',
  downsizerContribution: '#5f7a2f',
});

/** Alarmed on purpose — the one figure on this chart that is not money the household has. */
const SHORTFALL_COLOUR = '#c0201f';

export type FlowDataset = {
  readonly key: FlowGroupKey | 'shortfall';
  readonly label: string;
  readonly data: readonly number[];
  readonly stack: FlowStack | ShortfallStack;
  readonly backgroundColor: string;
  readonly borderWidth: number;
};

export type FlowChartConfig = {
  readonly type: 'bar';
  readonly data: {
    readonly labels: readonly string[];
    readonly datasets: readonly FlowDataset[];
  };
  readonly options: Record<string, unknown>;
};

const groupDataset = (key: FlowGroupKey, values: readonly number[]): FlowDataset =>
  Object.freeze({
    key,
    label: FLOW_GROUP_LABELS[key],
    // Outflow-side groups are stored inflow-of-their-own-side positive (`flowSeries.ts`'s own
    // convention, mirroring `MonthLine.amount`); negated here, once, so they stack BELOW zero on the
    // shared axis rather than piling on top of the inflows.
    data: Object.freeze(FLOW_GROUP_SIDE[key] === 'inflow' ? [...values] : values.map((value) => -value)),
    stack: FLOW_STACK,
    backgroundColor: GROUP_COLOURS[key],
    borderWidth: 0,
  });

const shortfallDataset = (values: readonly number[]): FlowDataset =>
  Object.freeze({
    key: 'shortfall' as const,
    label: SHORTFALL_LABEL,
    data: Object.freeze([...values]),
    stack: SHORTFALL_STACK,
    backgroundColor: SHORTFALL_COLOUR,
    borderWidth: 0,
  });

/**
 * `series` turned into the object Chart.js is handed for the second chart. Every group present in
 * `series.groups` gets a dataset, in `FLOW_GROUP_ORDER` (never `series.groups`' own order, which is
 * filtered and therefore not stable across two different walks) — so the legend and the stacking
 * order never depend on which groups happened to be non-zero.
 */
/** `2026-27 (from Sep) and 2072-73 (to Nov) are partial financial years.` — one line, or none. */
const partialYearsLine = (labels: readonly string[]): string[] =>
  labels.length === 0
    ? []
    : [labels.length === 1 ? `${labels[0]} is a partial financial year.` : `${labels.join(' and ')} are partial financial years.`];

export const flowChartConfig = (series: FlowSeries): FlowChartConfig => {
  const present = new Map(series.groups.map((group) => [group.key, group.values] as const));
  return Object.freeze({
    type: 'bar' as const,
    data: Object.freeze({
      labels: series.years.map((year) => year.label),
      datasets: Object.freeze([
        ...FLOW_GROUP_ORDER.filter((key) => present.has(key)).map((key) => groupDataset(key, present.get(key) as readonly number[])),
        shortfallDataset(series.shortfall),
      ]),
    }),
    options: Object.freeze({
      animation: false,
      responsive: true,
      maintainAspectRatio: false,
      interaction: Object.freeze({ mode: 'index', intersect: false }),
      plugins: Object.freeze({
        legend: Object.freeze({ position: 'bottom' }),
        title: Object.freeze({ display: true, text: CHART_TITLE }),
        subtitle: Object.freeze({
          display: true,
          text: Object.freeze([
            'Grouped by what each line of the plan is, not by where the money was drawn from.',
            `${SHORTFALL_LABEL} is shown separately and is never counted as income.`,
            // Both partial years (the first and the last) share one line.
            ...partialYearsLine(series.years.filter((year) => year.partial).map((year) => year.label)),
          ]),
        }),
      }),
      scales: Object.freeze({
        x: Object.freeze({ stacked: true }),
        y: Object.freeze({ stacked: true }),
      }),
    }),
  });
};

/** Re-exported so `renderChart.ts` builds its tooltip callback from one formatter, as the wealth chart does. */
export { formatAxisTick, tooltipLabel };
