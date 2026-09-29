// P7 (the decidable half of the renderer) — a `ChartSeries` turned into the plain object a chart
// library is handed, and NOTHING ELSE. No canvas, no `Chart`, no DOM: this module is importable
// under `node:test` and every claim in this header is an assertion in
// `test/app-chart-config.test.mjs`.
//
// **Why this file exists at all.** A chart draws to canvas, which is opaque pixels — nothing about
// the drawn output can ever be asserted. So everything that is DECIDABLE is moved here, ahead of
// the draw: which datasets exist, which numbers are in each, which stack each one joins, whether
// the library has been left free to drop points, and where the marker sits. `renderChart.ts` is
// then only "hand this object to the library", which is the genuinely untestable part.
//
// It computes nothing. Every number below is an element of the series handed in — there is no
// addition, no aggregation, no resampling and no interpolation anywhere in this file, and the test
// sweeps the returned object for a numeric series that is not one of the ones it was given.
//
// **THE TWO BANDS STACK; NO OVERLAY DOES.** `monthsToSeries.ts`'s header states the reason:
// `protected + assessable` IS total wealth, while `accessible` cross-cuts both (the younger
// partner's exempt super is protected AND unreachable; an Account-Based Pension is assessable AND
// reachable), and `heasDebt` (P9-1, slice 2) is a LIABILITY neither band nets (`Month.heasDebt`'s own doc, T38: it
// is not means-test asset-test income and does not belong in either). **So "IS total wealth" holds
// exactly where a walk has no `HEAS_DRAW` — where it does, the stack reads high by the debt, and
// this line is the ONLY place on the chart that debt is drawn at all**, the same asymmetry
// `MonthRow.totalWealth`'s own doc states for the table. A third stacked band would draw every
// reachable dollar twice and print a total larger than the Household owns. Two mechanisms keep the
// bands and the overlays apart, and the second is the real one:
//
//   * the stack keys are disjoint TYPES — a band's is the literal `WEALTH_STACK`, an overlay's is
//     the template type `overlay:${OverlayKey}` — so a hand edit that puts `accessible` into the
//     wealth stack does not type-check without a cast;
//   * and because types are erased and a cast is one token, the test asserts it on the returned
//     object instead. The types are a speed bump for the author; the assertion is the guard.
//
// **THE TWO ASSETS-TEST LINES ARE NOT IN THE STACK EITHER.** "Full pension up to" (the free area)
// and "No pension above" (the cut-off) are `Month.assetsTestThresholds`, drawn stepped, each in a
// stack group of its own exactly as an overlay is, and converted by `moneyLens` exactly as the bands
// are. A month with no entitlement is `null` and `spanGaps` is `false`, so a gap stays a gap.
// Assessable is the BOTTOM band, so its top edge is what these two lines are read against.
//
// **THE MONTHS ABOVE THE CUT-OFF ARE SHADED (P7-3)** by one more dataset, `aboveCutOff`: the
// assessable band's own converted figure in those months and `null` in every other, filled down to
// the dataset before it — the "No pension above" line — so the shading is exactly the stretch of
// band standing over the cut-off. It is drawn only where `series.aboveCutOff` is.
//
// Every overlay also gets one stack key EACH rather than sharing one: with a stacked axis, two
// overlays sharing a group would stack on each other, and a floor drawn at `floor + accessible` is
// as wrong as a third band.
//
// **A FLAT ALL-ZERO BAND IS NOT A BUG.** The protected band is genuinely nil in 396 of the demo
// walk's 501 months — Dana's exempt Accumulation Phase super ends 2035-05 — so the back two-thirds
// of the chart is honestly a one-band stack. Nothing here filters an empty band, hides its legend
// entry or rescales to disguise it. That flat stretch is the Household's real shape, and the test
// asserts the dataset survives with its zeros intact.
//
// **THE PHASE SKEW IS REAL AND IS PRINTED, NOT SMOOTHED.** The two band figures are the means-test
// split taken on the month's FIRST DAY; `accessibleAssets` is computed at its CLOSE (both in
// `projection.ts`). They are a few weeks out of phase, so the overlay can cross a band edge in a
// way a same-instant reading would not. Nothing here interpolates or aligns them; instead
// `PHASE_NOTE` says so on the face of the chart, and the test asserts it is still there.
import { toCents } from '../core/money.js'; // `.js` is correct in a `.ts` file — see tsconfig.json
import { formatDollars, roundToDollar } from './displayMoney.js';
import { MONEY_VIEW_BASIS, moneyLens, statedInTodaysMoneyLens } from './todaysDollars.js';
import type { MoneyBasis } from './todaysDollars.js';
import { agesCaption } from './monthsToSeries.js';
import type { Cents } from '../core/money.js';
import type {
  AgeAxis,
  ChartSeries,
  MarkerKey,
  OverlayKey,
  SeriesMarker,
  SeriesOverlay,
  SeriesThreshold,
  ThresholdKey,
  WealthBand,
  WealthBandKey,
} from './monthsToSeries.js';

/**
 * The x-axis label SWITCH — a Household's own choice of view, never a recomputation. Both label
 * sets exist on every `ChartSeries` already (`monthsToSeries.ts`'s `months` and `ageAxis`); `mode`
 * only decides which one `chartConfig` puts in `data.labels`. The 501 data points in every dataset
 * are unaffected either way — see `test/app-chart-config.test.mjs`'s series-identity assertion.
 */
export type AxisMode = 'date' | 'age';

/**
 * `"Age — Dana / Ash"` — named in the SAME order the tick labels list them (`AgeAxis.personNames`),
 * because a column of bare numbers with no names is unreadable, and a mismatched order would be
 * worse than that: it would put a reader's own age next to a partner's number.
 */
export const ageAxisTitle = (ageAxis: AgeAxis): string => `Age — ${ageAxis.personNames.join(' / ')}`;

/**
 * `"Age 67 (Alex) · 66 (Sam)"` — the hover title in the age view, for month `index`. Chart.js's own
 * title joins a tick's array with a bare comma (`"67,66"`), which names nobody. Each Person's label is
 * followed by the name `ageAxisTitle` gives them, in the same order; a Person not yet born or already
 * dead keeps the axis's own word in their place (`"Age died (Alex) · 70 (Sam)"`), never a number.
 */
export const agesTooltipTitle = (ageAxis: AgeAxis, index: number): string =>
  `Age ${(ageAxis.labels[index] ?? []).map((label, person) => `${label} (${ageAxis.personNames[person]})`).join(' · ')}`;

/**
 * `"Baseline: $1,291,193"` — one hover line. `cents` is the point's own value as drawn (already in the
 * page's money basis); this only prints it, through the page's one display formatter. Without it
 * Chart.js prints the raw number, which is cents: `"Baseline: 129,119,323"`.
 */
export const tooltipLabel = (datasetLabel: string, cents: number): string => `${datasetLabel}: ${formatDollars(cents)}`;

/** The one stack group the partition lives in. No overlay may carry it — see the header. */
export const WEALTH_STACK = 'wealth-partition';

export type WealthStack = typeof WEALTH_STACK;

/** An overlay's group: one each, disjoint from `WealthStack` and from each other, by type. */
export type OverlayStack = `overlay:${OverlayKey}`;

const overlayStack = (key: OverlayKey): OverlayStack => `overlay:${key}`;

/** A threshold line's group: one each, disjoint from the wealth stack and from every overlay's. */
export type ThresholdStack = `threshold:${ThresholdKey}`;

const thresholdStack = (key: ThresholdKey): ThresholdStack => `threshold:${key}`;

/**
 * Said on the face of the chart rather than in a commit message, because a reader who takes the
 * two lines as simultaneous has mis-read the crossing points.
 *
 * Kept to one short line ON PURPOSE — the full explanation lives in `#chart-note` below the chart
 * (see `main.ts`), which has the page's full width to wrap in. Chart.js draws each element of the
 * subtitle's text array as ONE unbroken line with no wrapping, so a sentence long enough to explain
 * the phase skew in full ran past the canvas's right edge and over the top tick label. This
 * constant carries only enough of it that a reader who never scrolls to the paragraph still sees
 * FIRST DAY and CLOSE named on the chart itself.
 */
export const PHASE_NOTE =
  'Shaded areas: FIRST DAY of each month. Reachable line: its CLOSE. So they don’t line up exactly.';

/** Said next to the legend for the same reason the overlay's own label spells it out. */
export const CROSS_CUT_NOTE =
  'The two shaded areas add up to everything you own. The reachable line is never part of the stack.';

/** On the face of the chart wherever the two assets-test lines are drawn. */
export const ASSETS_TEST_ONLY_NOTE = 'The two pension lines show the assets test only; the income test can also lower your pension.';

export const CHART_TITLE = 'Everything you own, and what counts for the Age Pension';

type BandColour = Readonly<{ border: string; background: string }>;

const BAND_COLOURS: Readonly<Record<WealthBandKey, BandColour>> = Object.freeze({
  protected: Object.freeze({ border: '#7a5cad', background: 'rgba(122, 92, 173, 0.35)' }),
  assessable: Object.freeze({ border: '#2f6f4f', background: 'rgba(47, 111, 79, 0.35)' }),
});

const OVERLAY_COLOURS: Readonly<Record<OverlayKey, string>> = Object.freeze({
  accessible: '#1b5fa8',
  floor: '#a4501f',
  heasDebt: '#8a6d00',
});

export const THRESHOLD_COLOURS: Readonly<Record<ThresholdKey, string>> = Object.freeze({
  fullPensionUpTo: '#00838f',
  noPensionAbove: '#b3261e',
});

/** Dashed, so no overlay can be mistaken for the solid edge of a band. */
const OVERLAY_DASH: Readonly<Record<OverlayKey, readonly number[]>> = Object.freeze({
  accessible: Object.freeze([6, 3]),
  floor: Object.freeze([2, 4]),
  heasDebt: Object.freeze([4, 2]),
});

export type BandDataset = {
  readonly key: WealthBandKey;
  readonly label: string;
  readonly data: readonly number[];
  /** Always the partition's group. */
  readonly stack: WealthStack;
  /**
   * The bottom band fills down to the axis; the band on top fills only down to the one below it
   * (`'-1'`). Filled from the axis, the top band would shade over the bottom one and grey it out.
   */
  readonly fill: 'origin' | '-1';
  readonly borderColor: string;
  readonly backgroundColor: string;
  readonly borderWidth: number;
  readonly pointRadius: 0;
};

export type OverlayDataset = {
  readonly key: OverlayKey;
  readonly label: string;
  readonly data: readonly number[];
  /** Never `WealthStack`, and never shared with the other overlay. */
  readonly stack: OverlayStack;
  /** Never filled: a filled overlay reads as a band even when it is not stacked as one. */
  readonly fill: false;
  readonly borderColor: string;
  readonly borderDash: readonly number[];
  readonly borderWidth: number;
  readonly pointRadius: 0;
};

export type ThresholdDataset = {
  readonly key: ThresholdKey;
  readonly label: string;
  /** `null` where the engine computed no entitlement that month — a gap, never bridged. */
  readonly data: readonly (number | null)[];
  readonly stack: ThresholdStack;
  readonly fill: false;
  /** Holds each month's figure until the next point, so an indexation reads as a step, not a slope. */
  readonly stepped: 'before';
  readonly spanGaps: false;
  readonly borderColor: string;
  readonly borderDash: readonly number[];
  readonly borderWidth: number;
  readonly pointRadius: 0;
};

/**
 * A rule the writer strokes at `index`. Carried as plain data rather than as a drawing callback so
 * that its position is assertable without a canvas; `month` is carried beside `index` so a writer
 * that mis-indexes can be caught by comparing it with `labels[index]`.
 */
/** The shading over the cut-off (P7-3). Its own group, like every line drawn over the stack. */
export type CutOffShadeDataset = {
  readonly key: 'aboveCutOff';
  readonly label: string;
  /** The assessable band's own value where it is over the cut-off, `null` everywhere else. */
  readonly data: readonly (number | null)[];
  readonly stack: 'shade:aboveCutOff';
  /** Down to the dataset before this one, which is always the "No pension above" line. */
  readonly fill: '-1';
  readonly stepped: 'before';
  readonly spanGaps: false;
  readonly borderColor: string;
  readonly backgroundColor: string;
  readonly borderWidth: 0;
  readonly pointRadius: 0;
};

export const ABOVE_CUT_OFF_LABEL = 'Above the cut-off — the assets test alone leaves no Age Pension';

export type ChartMarker = {
  readonly key: MarkerKey;
  readonly label: string;
  readonly index: number;
  readonly month: string;
  /** Both people, in `household.persons` order — `outcomes.ts` refuses to pick one, so neither does this. */
  readonly caption: string;
  readonly colour: string;
};

/**
 * Which x-axis indices carry a tick — the whole of what P7-8's fix decides. `Chart.js`'s own
 * `maxTicksLimit` used to be the only knob here, and on a 501-point CATEGORY axis it does nothing
 * but arithmetic: 501 divided by 24 lands a tick on every 21st label, so the axis printed
 * `2026-09, 2028-06, 2030-03 …` — dates a reader has to do the same division to make sense of. Ticks
 * are a reading aid, not a sample of the data, so this instead anchors to a MONTH that means
 * something (July — this engine is financial-year driven, so FY boundaries are the axis's natural
 * grid) and steps in whole years.
 *
 * The step itself is DERIVED, not hard-coded: `STEP_LADDER` is tried smallest-first, and the first
 * step whose July anchors number `MAX_TICKS` or fewer wins. A step big enough to under-fill the
 * ladder never gets picked ahead of a smaller one that still fits — that is what "smallest step that
 * fits" means, and `test/app-chart-config-ticks.test.mjs` pins it for walks of several lengths.
 *
 * Depends on `months` ALONE — never on which label set (`series.months` vs `series.ageAxis.labels`)
 * a caller is about to draw — so `chartConfig`'s two modes always compute the identical plan from
 * the identical input and can never disagree about which indices tick.
 */
export type XAxisTickPlan = {
  /** A member of `STEP_LADDER`, or `0` for the single-tick fallback below `xAxisTickPlan`'s doc comment. */
  readonly stepYears: number;
  /** Indices into `series.months` / `series.ageAxis.labels` — identical set regardless of axis mode. */
  readonly indices: readonly number[];
};

/** July: the FY boundary this engine is driven by, and the one calendar month a tick anchors to. */
const ANCHOR_MONTH = 7;

/** Tried smallest-first. The smallest step whose tick COUNT fits under `MAX_TICKS` is the one used. */
const STEP_LADDER: readonly number[] = Object.freeze([1, 2, 5, 10]);

/** The ceiling `chartConfig.ts` used to hand `Chart.js` outright as `maxTicksLimit`; kept here as the
 * bound a derived step must fit under, not as a second, disconnected knob. */
const MAX_TICKS = 24;

const yearOf = (month: string): number => Number(month.slice(0, 4));
const calendarMonthOf = (month: string): number => Number(month.slice(5, 7));

/** Every index of `months` whose calendar month is `ANCHOR_MONTH`, oldest first. */
const julyIndices = (months: readonly string[]): readonly { readonly index: number; readonly year: number }[] =>
  Object.freeze(
    months
      .map((month, index) => ({ index, year: yearOf(month), calendarMonth: calendarMonthOf(month) }))
      .filter((entry) => entry.calendarMonth === ANCHOR_MONTH)
      .map((entry) => Object.freeze({ index: entry.index, year: entry.year })),
  );

/** Of the Julys handed in, the ones `stepYears` whole years apart from the FIRST one — never from a
 * calendar-round year like a multiple of ten, which would drift the anchor away from July itself. */
const anchorsAtStep = (
  julys: readonly { readonly index: number; readonly year: number }[],
  stepYears: number,
): readonly number[] => {
  const firstJuly = julys[0];
  if (firstJuly === undefined) return Object.freeze([]);
  const baseYear = firstJuly.year;
  return Object.freeze(
    julys.filter((entry) => (entry.year - baseYear) % stepYears === 0).map((entry) => entry.index),
  );
};

/**
 * The tick plan for a walk of `months` (`YYYY-MM`, ascending — `series.months`'s own shape). See the
 * type doc comment above for the ladder rule.
 *
 * **The edges are left irregular, on purpose.** The demo walk starts 2026-09, so its first July is
 * 2027-07 — the walk's own first month never gets a forced tick, and its last month (2068-05) is not
 * a July either, so the last tick is short of the walk's own end. Forcing an extra tick at either end
 * would read as a data boundary that is not one; the ticks stay strictly regular instead, at the cost
 * of not bracketing the walk.
 *
 * **The fallback.** A walk shorter than one anchor interval — or one that happens to cross no July at
 * all — has no whole-year anchor at any step in the ladder. A blank axis is worse than one honestly
 * off-anchor tick, so this returns a single tick at the walk's own first month (`stepYears: 0`,
 * meaning "no regular step", not "annual"). An empty `months` produces no tick at all: there is no
 * month left to put one on.
 */
export const xAxisTickPlan = (months: readonly string[]): XAxisTickPlan => {
  const julys = julyIndices(months);
  for (const stepYears of STEP_LADDER) {
    const indices = anchorsAtStep(julys, stepYears);
    if (indices.length > 0 && indices.length <= MAX_TICKS) return Object.freeze({ stepYears, indices });
  }
  const widest = anchorsAtStep(julys, STEP_LADDER[STEP_LADDER.length - 1] as number);
  if (widest.length > 0) return Object.freeze({ stepYears: STEP_LADDER[STEP_LADDER.length - 1] as number, indices: widest });
  return Object.freeze({ stepYears: 0, indices: Object.freeze(months.length === 0 ? [] : [0]) });
};

export type ChartConfig = {
  readonly type: 'line';
  readonly data: {
    /**
     * `series.months` in date mode; one array of per-Person age strings per month in age mode
     * (Chart.js draws each element of a tick's own array on its own line). Never a mix of the two
     * within one config — `chartConfig`'s `mode` argument picks exactly one label set.
     */
    readonly labels: readonly string[] | readonly (readonly string[])[];
    readonly datasets: readonly (BandDataset | OverlayDataset | ThresholdDataset | CutOffShadeDataset)[];
  };
  readonly options: Record<string, unknown>;
  /** Not a Chart.js key: `renderChart.ts` takes this off and draws it itself. */
  readonly markers: readonly ChartMarker[];
  /** Not a Chart.js key either — see `XAxisTickPlan`'s doc comment. `renderChart.ts` turns this into
   * the scale's own `afterBuildTicks` filter. */
  readonly xTicks: XAxisTickPlan;
};

/**
 * **THE CHART AND THE TABLE ARE CONVERTED BY THE SAME MODULE AND MUST NEVER BE IN TWO BASES
 * (P2-7).** `monthsToSeries` hands over the engine's own nominal cents; the conversion happens here,
 * per point, against THAT point's own month, which is why `months` is passed in beside the values.
 * ADR-0001: *"Charts must state which basis they are showing — this is the most likely place to
 * confuse yourself later."* A table in today's money beside a chart in future dollars IS that
 * confusion, so `main.ts` drives both off one toggle and one `MoneyBasis`.
 */
const convert = (
  values: readonly number[],
  months: readonly string[],
  lens: (basis: MoneyBasis, month: string) => (cents: Cents) => Cents,
  basis: MoneyBasis,
): readonly number[] =>
  Object.freeze(values.map((value, index) => lens(basis, months[index] as string)(value as Cents) as number));

const bandDataset = (band: WealthBand, months: readonly string[], basis: MoneyBasis, position: number): BandDataset => {
  const colour = BAND_COLOURS[band.key];
  return Object.freeze({
    key: band.key,
    label: band.label,
    data: convert(band.values, months, moneyLens, basis),
    stack: WEALTH_STACK,
    fill: position === 0 ? 'origin' : '-1',
    borderColor: colour.border,
    backgroundColor: colour.background,
    borderWidth: 1,
    pointRadius: 0,
  });
};

/**
 * ⚠️ **THE FLOOR IS THE ONE SERIES CONVERTED THE OTHER WAY, AND THAT IS A RULING, NOT AN OVERSIGHT**
 * (user, 2026-09-21). Every other series here is a nominal figure the engine produced in a
 * particular month. The Contingency Floor is a flat line with no month of its own, stated by a
 * household that meant today's buying power — so it is drawn unchanged in the today's-money view
 * and INFLATED month by month in the future-dollars view, where it curves upward. See
 * `statedInTodaysMoneyLens` in `todaysDollars.ts`.
 *
 * ✅ **AND THE COUNT NOW AGREES WITH THE DRAWING (P4-14, settled 2026-09-21).**
 * `ChartSeries.belowFloor` used to compare against the flat NOMINAL floor — the other reading — and
 * a band shaded from it would have crossed this line in different months. Both sides now multiply
 * the stated figure by `core/priceLevel.ts`'s one factor, so this curve and `outcomes.ts`'s
 * `contingencyFloorAt` are equal to the cent in every month.
 *
 * **There is no floor dataset at all when the plan states none.** `monthsToSeries` omits the
 * overlay, so the loop below has nothing to build and no branch here has to know about it.
 *
 * The two lenses are selected BY KEY off `OverlayKey`, not by position, so an overlay added to the
 * union without a decision about which money it is stated in does not compile.
 */
const OVERLAY_LENS: Readonly<Record<OverlayKey, typeof moneyLens>> = Object.freeze({
  accessible: moneyLens,
  floor: statedInTodaysMoneyLens,
  // `Month.heasDebt`, read straight off with no filtering — `accessible`'s own footing exactly.
  heasDebt: moneyLens,
});

const overlayDataset = (overlay: SeriesOverlay, months: readonly string[], basis: MoneyBasis): OverlayDataset =>
  Object.freeze({
    key: overlay.key,
    label: overlay.label,
    data: convert(overlay.values, months, OVERLAY_LENS[overlay.key], basis),
    stack: overlayStack(overlay.key),
    fill: false,
    borderColor: OVERLAY_COLOURS[overlay.key],
    borderDash: OVERLAY_DASH[overlay.key],
    borderWidth: 2,
    pointRadius: 0,
  });

/** The engine's own nominal thresholds, converted point by point like a band; a gap stays `null`. */
const thresholdDataset = (line: SeriesThreshold, months: readonly string[], basis: MoneyBasis): ThresholdDataset =>
  Object.freeze({
    key: line.key,
    label: line.label,
    data: Object.freeze(
      line.values.map((value, index) => (value === null ? null : (moneyLens(basis, months[index] as string)(value as Cents) as number))),
    ),
    stack: thresholdStack(line.key),
    fill: false,
    stepped: 'before',
    spanGaps: false,
    borderColor: THRESHOLD_COLOURS[line.key],
    borderDash: Object.freeze([8, 4]),
    borderWidth: 2,
    pointRadius: 0,
  });

/**
 * Built only where `series.aboveCutOff` is, and placed straight after the threshold lines so `'-1'`
 * fills to "No pension above". Each value is the assessable band's own, converted like the band.
 */
const cutOffShadeDataset = (series: ChartSeries, aboveCutOff: readonly boolean[], basis: MoneyBasis): CutOffShadeDataset => {
  const assessable = convert((series.bands.find((band) => band.key === 'assessable') as WealthBand).values, series.months, moneyLens, basis);
  return Object.freeze({
    key: 'aboveCutOff',
    label: ABOVE_CUT_OFF_LABEL,
    data: Object.freeze(assessable.map((value, index) => (aboveCutOff[index] === true ? value : null))),
    stack: 'shade:aboveCutOff',
    fill: '-1',
    stepped: 'before',
    spanGaps: false,
    borderColor: THRESHOLD_COLOURS.noPensionAbove,
    backgroundColor: 'rgba(179, 38, 30, 0.15)',
    borderWidth: 0,
    pointRadius: 0,
  });
};

/**
 * `2041-06 (Dana 74, Ash 83)` — every Person the marker carried, in the order it carried them.
 * Delegates to `monthsToSeries.ts`'s `agesCaption`, which is the one place this wording is decided:
 * the Scenario list prints the same fact for every Scenario and the two must not drift apart.
 */
export const markerCaption = (marker: SeriesMarker): string => agesCaption(marker);

/**
 * One colour per marker, and they are DIFFERENT colours: two rules in the same stroke on the same
 * chart read as one fact drawn twice. The Shortfall rule keeps the colour it has always had — the
 * floor overlay's — because those two are the same question (money running out) asked two ways;
 * Pension-Only gets its own, because it is a different question and the two can land far apart.
 */
/**
 * Grey: no other marker, the Compare view's black crossover, the assets-test teal and red, nor any
 * Scenario colour uses it. `comparisonConfig.ts` strokes its bare Age Pension age rules in it too.
 */
export const AGE_PENSION_AGE_COLOUR = '#8c8c8c';

const MARKER_COLOURS: Readonly<Record<MarkerKey, string>> = Object.freeze({
  shortfall: '#a4501f',
  pensionOnly: '#8a1f5f',
  // The home loan gets a third colour, and a green one: the other two rules mark money running out
  // and this one marks a debt ending, which is the only good news on the chart. Not the floor
  // overlay's colour — that is the Shortfall rule's, because those two are the same question.
  mortgagePayoff: '#1f6f45',
  // A fourth, distinct colour: this rule is neither money running out nor a computed payoff — it is
  // a date the user chose, and drawing it in the payoff's own green would read as the same fact.
  mortgageTarget: '#1f5f8a',
  // The home's own two: a change of status, and an exemption running out (money newly counted).
  homeStatus: '#5f4b8b',
  homeExemptionEnds: '#c2185b',
  agePensionAge: AGE_PENSION_AGE_COLOUR,
});

const chartMarker = (marker: SeriesMarker): ChartMarker =>
  Object.freeze({
    key: marker.key,
    label: marker.label,
    index: marker.index,
    month: marker.month,
    caption: markerCaption(marker),
    colour: MARKER_COLOURS[marker.key],
  });

// `10 ** 3` / `10 ** 6` rather than `1_000_00` / `1_000_000_00`: this file's own RAW SOURCE test
// bans a four-digit-or-longer numeric literal as a personal financial figure the module must not
// hold. A unit of currency (a thousand, a million) is not a household figure — but it is still
// written as an expression no literal in it is four digits long, rather than carved out an
// exception in the sweep.
const THOUSAND_CENTS = toCents(10 ** 3);
const MILLION_CENTS = toCents(10 ** 6);

/**
 * `absCents` expressed as a whole or one-decimal multiple of `unitCents`, or `undefined` if it
 * cannot be written that way WITHOUT LOSS. Never more than one decimal place — abbreviation is
 * meant to be short, not merely lossless — and never a fractional cent, which the whole-cents
 * `Cents` type rules out already. No thousands separator on the abbreviated digits: that is what
 * abbreviating is FOR, so a count wide enough to want one has already stopped being a short form.
 */
const tryAbbreviate = (absCents: number, unitCents: number, suffix: string): string | undefined => {
  if (absCents % unitCents === 0) return `${absCents / unitCents}${suffix}`;
  const tenthUnit = unitCents / 10;
  if (absCents % tenthUnit === 0) {
    const tenths = absCents / tenthUnit;
    return `${Math.trunc(tenths / 10)}.${tenths % 10}${suffix}`;
  }
  return undefined;
};

/**
 * Money for an axis tick, in the page's whole dollars. The tick is rounded to the dollar by
 * `roundToDollar` (the page's one rounding site, `displayMoney.ts`) and then abbreviated to `k` or `M`
 * ONLY when that is exact — $1,234,567 is not `$1.2M`, so it falls back to the full figure through
 * `formatDollars` instead of printing a number the Household does not have. `0` prints as `$0`.
 */
export const formatAxisTick = (cents: number): string => {
  const dollars = roundToDollar(cents);
  const abs = Math.abs(dollars);
  if (abs < THOUSAND_CENTS) return formatDollars(dollars);
  const sign = dollars < 0 ? '-' : '';
  const short =
    abs < MILLION_CENTS ? tryAbbreviate(abs, THOUSAND_CENTS, 'k') : tryAbbreviate(abs, MILLION_CENTS, 'M');
  return short === undefined ? formatDollars(dollars) : `${sign}$${short}`;
};

/**
 * The whole of what a renderer is allowed to know.
 *
 * `plugins.decimation.enabled` is `false` EXPLICITLY, and the test asserts every dataset is still
 * the full length of the series. Chart.js can sample a long dataset down; this series is 501 points
 * with a marker at a fixed index, so a library that silently dropped points would leave the marker
 * on the wrong month — confidently wrong, which is worse than absent.
 */
/** `chartConfig`'s output, with every `readonly` stripped, all the way down. See `mutableChartInput`. */
type DeepMutable<T> = T extends readonly (infer U)[]
  ? DeepMutable<U>[]
  : T extends object
    ? { -readonly [K in keyof T]: DeepMutable<T[K]> }
    : T;

/**
 * A deep, unfrozen, structural COPY of `config` — nothing decided, nothing recomputed, every value
 * unchanged. It exists for one reason: Chart.js normalises the config object it is given IN PLACE
 * at construction (it writes `config.data.datasets` itself), and `chartConfig()`'s output is frozen
 * all the way down on purpose (see the header above and `test/app-chart-config.test.mjs`). Handing
 * Chart.js the frozen original throws `"datasets" is read-only` the moment it tries to write to it.
 *
 * This belongs here rather than in `renderChart.ts` for the same reason everything else in this
 * file does: it needs no canvas and no DOM, so it is importable and assertable under `node:test`
 * exactly like `chartConfig` itself — see `test/app-render-chart.test.mjs`. `renderChart.ts` stays
 * the file with nothing testable in it.
 *
 * `structuredClone` is available and correct here only because `chartConfig()`'s output is asserted
 * elsewhere to be plain data with no function in it anywhere (see the "no function is hidden in it"
 * test) — a function is not structured-cloneable. `renderChart.ts` must therefore clone FIRST and
 * attach its tick-callback function to the clone afterwards, never the other way round.
 *
 * **Generic over the config, so comparison mode gets the identical door (P7-1).**
 * `comparisonConfig.ts`'s output is frozen the same way and must be cloned the same way; a second
 * copy of this function for the second config would be a second chance to forget the clone. It
 * decides nothing about either shape — it is `structuredClone` and a type — so there is nothing
 * here for the two chart types to disagree about.
 */
export const mutableChartInput = <T>(config: T): DeepMutable<T> => structuredClone(config) as DeepMutable<T>;

/**
 * `series` turned into the object Chart.js is handed. `mode` picks which of `series.months` /
 * `series.ageAxis.labels` becomes `data.labels`, defaulting to the date view — nothing else in the
 * config changes with it: the datasets are built from `series.bands` / `series.overlays` exactly as
 * before, so the two modes are provably the same 501 data points under two different labels (see
 * `test/app-chart-config.test.mjs`).
 */
export const chartConfig = (series: ChartSeries, basis: MoneyBasis, mode: AxisMode = 'date'): ChartConfig =>
  Object.freeze({
    type: 'line' as const,
    data: Object.freeze({
      labels: mode === 'age' ? series.ageAxis.labels : series.months,
      datasets: Object.freeze([
        ...series.bands.map((band, position) => bandDataset(band, series.months, basis, position)),
        ...series.overlays.map((overlay) => overlayDataset(overlay, series.months, basis)),
        ...series.thresholds.map((line) => thresholdDataset(line, series.months, basis)),
        ...(series.aboveCutOff === undefined ? [] : [cutOffShadeDataset(series, series.aboveCutOff, basis)]),
      ]),
    }),
    options: Object.freeze({
      animation: false,
      normalized: true,
      responsive: true,
      maintainAspectRatio: false,
      interaction: Object.freeze({ mode: 'index', intersect: false }),
      plugins: Object.freeze({
        // OFF, and asserted. See the doc comment above.
        decimation: Object.freeze({ enabled: false }),
        legend: Object.freeze({ position: 'bottom' }),
        title: Object.freeze({ display: true, text: CHART_TITLE }),
        // **`series.notes` IS ON THE FACE OF THE CHART, not only in the DOM paragraph below it.**
        // Each note says which marker is missing and why (`monthsToSeries.ts`), and a reader who
        // never scrolls past the canvas is exactly the reader who would otherwise read a missing
        // rule as "this never happens". Appended rather than substituted: the two standing notes
        // are about what IS drawn and do not stop applying because something else is not.
        subtitle: Object.freeze({
          display: true,
          // `MONEY_VIEW_BASIS` IS FIRST, and is on the face of the chart in every state — ADR-0001
          // requires a chart to declare which money it is drawing, and a basis stated only inside a
          // disclosure is a blank space to every reader who does not open it.
          text: Object.freeze([
            MONEY_VIEW_BASIS[basis.view],
            CROSS_CUT_NOTE,
            PHASE_NOTE,
            ...(series.thresholds.length > 0 ? [ASSETS_TEST_ONLY_NOTE] : []),
            ...series.notes,
          ]),
        }),
      }),
      scales: Object.freeze({
        // `maxTicksLimit` used to live here and is gone: it divided the point COUNT, which is why
        // the axis used to read `2026-09, 2028-06, 2030-03 …`. `xTicks` below (built from `months`,
        // never from which label set `mode` chose) is what `renderChart.ts` now filters ticks by.
        x: Object.freeze(
          mode === 'age' ? { title: Object.freeze({ display: true, text: ageAxisTitle(series.ageAxis) }) } : {},
        ),
        // The bands stack here. Each overlay is in a group of its own, so it stacks on nothing.
        y: Object.freeze({ stacked: true, beginAtZero: true }),
      }),
    }),
    markers: Object.freeze(series.markers.map(chartMarker)),
    xTicks: xAxisTickPlan(series.months),
  });
