// P2-7 — the display gloss that turns a future dollar into today's money, and NOTHING ELSE. No
// DOM, no Chart.js, no `Month`, no `PlanFile`: plain numbers and plain frozen objects, so this is
// testable with `node:test` and no browser exactly as `monthToRows.ts` and `monthsToSeries.ts` are
// (TODO.md P2-9a: one dev dependency).
//
// **THIS IS THE DISPLAY LAYER, AND ADR-0001 PUTS IT NOWHERE ELSE.** The ADR is titled *"Compute in
// nominal dollars internally, display in today's dollars"*, and the reason the engine stays nominal
// is that Australian financial parameters index on five different bases which do not cancel: tax
// brackets are not indexed at all, the transfer balance cap and the means-test free areas follow
// CPI, the Age Pension maximum rate follows wages. No single inflation knob reproduces a divergence
// between three indices, so the engine must never be handed a deflated figure — it would tax,
// taper and cap it against thresholds that were never converted. Every function here is therefore
// called by `monthToRows.ts`, `chartConfig.ts` and `comparisonConfig.ts` and by nothing in
// `src/core/`, and `test/app-todays-dollars.test.mjs` asserts that `src/core/` does not import this
// module.
//
// **THE CONVERSION IS THE FLAT CPI ASSUMPTION AND NOT THE DATED SERIES.** `Settings.economicSeries`
// carries both: the scalar `cpi` (a single assumed rate) and the dated `agePension` series (real
// published index numbers). The dated series exists for a legal-accuracy reason — the Age Pension's
// own parameters are indexed by the figures the government actually published, and a plan that
// states none gets a refusal rather than a guess. A display gloss is not a legal figure: it answers
// *"roughly what would this buy today?"*, it is the same question for every figure on the page, and
// ADR-0001 names `the CPI assumption` as what answers it. So this module reads `cpi` and nothing
// else, and it is the first reader that box has ever had (TODO.md P6-12).
//
// **EVERY FIGURE IS CONVERTED ON ITS OWN, AND A COLUMN CAN THEREFORE ADD UP A CENT DIFFERENTLY.**
// `deflate` rounds to a whole cent, and rounding is not additive: `round(a/f) − round(b/f)` and
// `round((a−b)/f)` differ by at most one cent, and a sum of n converted figures differs from the
// converted sum by at most n cents. Measured on the committed demo walk (501 months, cpi 2.5%,
// up to six cash lines in a month) the worst case actually reached is **one cent**, in 2026-11.
// The alternative — deriving a total from converted parts, or parts from a converted total — buys
// one identity by breaking the other, and leaves at least one figure on the page that is not the
// today's-money value of the figure it is labelled as. The rule here has no exception: every
// number shown is `deflate` of the nominal number it names, and the one-cent residue is said out
// loud in `TODAYS_MONEY_NOTICE` rather than hidden by a reconciliation that picks a favourite.
// `test/app-todays-dollars.test.mjs` asserts the bound in both directions over the whole walk.
//
// **THE ARITHMETIC ITSELF IS NOT HERE ANY MORE — `core/priceLevel.ts` HOLDS IT** (P4-14). One
// expression of `(1 + cpi) ^ (months / 12)`, because `outcomes.ts` now inflates the stated
// Contingency Floor to each month's price level to count breaches against it and this module
// inflates the same figure to draw it. Two copies would be a chart and a count that cross the line
// in different months. That module's header says why raising a STATED REAL INPUT to nominal is not
// the ADR-0001 violation it looks like: it is input normalisation, and nothing deflated ever
// reaches a threshold, a rate or a taper.
import { mulCents } from '../core/money.js'; // `.js` is correct in a `.ts` file — see tsconfig.json
import { inflateStated, monthsBetween, priceLevelFactor as priceLevelFactorOf } from '../core/priceLevel.js';
import type { Cents } from '../core/money.js';

/**
 * Which money a screen is showing.
 *
 *   * `'todaysDollars'` — every figure divided by the price level of its own month, so a sum in
 *     2065 is stated as what it would buy today. **The default** (user ruling, 2026-09-21).
 *   * `'futureDollars'` — the engine's own figures, untouched. What the bank statement of that
 *     month would actually say.
 */
export type MoneyView = 'todaysDollars' | 'futureDollars';

/**
 * ⚠️ **TODAY'S MONEY IS THE DEFAULT, AND THIS IS THE ONE PLACE THAT IS WRITTEN.** `public/index.html`
 * carries the `checked` attribute on the matching radio and `main.ts` reads the INITIAL mode off
 * that markup rather than naming a literal, exactly as the axis and view toggles do — so the page
 * and this constant cannot drift apart. The reason for the default is the whole of P2-7: a raw
 * `$2,148,000 in 2065` is not a figure a person can judge, and a reader who cannot tell a good
 * answer from a bad one is reading a black box.
 */
export const DEFAULT_MONEY_VIEW: MoneyView = 'todaysDollars';

/** What each view is CALLED on the toggle. Plain words — no "nominal", no "real terms". */
export const MONEY_VIEW_LABELS: Readonly<Record<MoneyView, string>> = Object.freeze({
  todaysDollars: 'Today’s money',
  futureDollars: 'The actual future amounts',
});

/**
 * **The same fact as `MONEY_VIEW_BASIS`, cut down to fit INSIDE a sentence.** `app/incomeHeadline.ts`
 * puts a dollar figure and its basis in one clause — *"about $31,754 a year, in today's money"* —
 * and a bare figure forty years out is not one a reader can judge. It lives here, beside the label
 * and the standing note, because the wording of a money view is this module's fact: three spellings
 * of it in three files is how two of them come to disagree.
 */
export const MONEY_VIEW_PHRASE: Readonly<Record<MoneyView, string>> = Object.freeze({
  todaysDollars: 'in today’s money',
  futureDollars: 'as the actual amount paid that year, before prices are taken off it',
});

/**
 * **The same fact cut down again, to the tag after a single figure** — `$31,240.00 (today’s
 * money)`. The connector's tools (plan_ai.md §13 microtask 3) put one on every figure they return,
 * because a figure handed to an outside AI loses whatever caption sat beside it.
 */
export const MONEY_VIEW_TAG: Readonly<Record<MoneyView, string>> = Object.freeze({
  todaysDollars: 'today’s money',
  futureDollars: 'future dollars',
});

/**
 * **What the screen SAYS ABOUT ITSELF, in whichever view it is in.** ADR-0001: *"Charts must state
 * which basis they are showing — this is the most likely place to confuse yourself later."* This is
 * not the info button's text and is not folded away behind anything: it goes on the face of the
 * chart (`chartConfig.ts`'s subtitle, `comparisonConfig.ts`'s) and in the caption under it, so a
 * reader who never opens a disclosure still knows which money they are looking at.
 *
 * ⚠️ **ONE SHORT LINE EACH, UNDER THE 110-CHARACTER BUDGET.** Chart.js draws each element of a
 * subtitle's text array as one unbroken line with no wrapping, so a sentence long enough to explain
 * this in full runs past the canvas's right edge and over the top tick label.
 * `test/app-chart-config.test.mjs` already pins that budget for the two standing notes, and these
 * two lines are measured against it by the same assertion. The full explanation is
 * `TODAYS_MONEY_NOTICE`, which opens in the page's own width below the chart.
 */
export const MONEY_VIEW_BASIS: Readonly<Record<MoneyView, string>> = Object.freeze({
  todaysDollars: 'In today’s money — what it would buy now.',
  futureDollars: 'In the actual future amounts — what a statement would say that year.',
});

/** The one line that stays on the page beside the info button. See `TODAYS_MONEY_NOTICE`. */
export const TODAYS_MONEY_SUMMARY = 'What “today’s money” means';

/**
 * **THE LAYMAN'S NOTE (user ruling, 2026-09-21), and the words it is banned from using.** Not
 * "nominal", not "real terms", not "deflate" — a person reading their own retirement forecast is
 * not obliged to know any of those, and a screen that uses them has explained nothing. Four things
 * it must land, because each of them is a way a reader could otherwise be wrong:
 *
 *   1. what the figures ARE (today's money), and what that means in terms of what it buys;
 *   2. that the sums the forecast worked with are the bigger future ones, so the tax and the
 *      pension come out right — a reader who thought the tax had been worked out on the converted
 *      figures would think the forecast had understated it;
 *   3. that only the display converts, and the toggle shows the raw amounts;
 *   4. the rounding residue, said plainly, because the table is an audit surface and a column that
 *      is out with no explanation reads as a bug in the money. Since 2026-09-24 the page prints
 *      whole dollars (`displayMoney.ts`), each figure rounded on its own, so the residue a reader can
 *      see is a dollar; the one-cent residue of the conversion itself is below what is printed.
 */
export const TODAYS_MONEY_NOTICE =
  'The amounts on this page are shown in today’s money. That means each one has been scaled back' +
  ' to what it would buy if you had it now, using the yearly price-rise figure in your settings, so' +
  ' a sum forty years away can be compared with what things cost this week. The forecast itself' +
  ' does not work in today’s money: it works in the amounts that would actually be paid and' +
  ' received in each future year, because tax brackets, the Age Pension and the super caps all' +
  ' move at their own different speeds and only the real future amounts get them right. The tax' +
  ' and the pension you see were worked out on those future amounts and then shown here scaled' +
  ' back, never the other way round. Switch to “the actual future amounts” to see the raw figures' +
  ' the forecast used. One small thing: each amount is shown rounded to the nearest dollar on' +
  ' its own, so a column of them can add up a dollar differently from the total beside it.';

/**
 * The three things a conversion needs, carried together so no caller can supply two of them and
 * guess the third. Built from a `PlanFile` by `moneyBasis` below; there is no default for `cpi` or
 * `asAtDate` anywhere in this module, because both are the user's own figures and a default on
 * either would be this file quietly inventing one.
 */
export interface MoneyBasis {
  readonly view: MoneyView;
  /** `Settings.asAtDate`, `YYYY-MM-DD`. Its MONTH is "now": a figure in that month converts to itself. */
  readonly asAtDate: string;
  /** `Settings.economicSeries.cpi` — a yearly rate, e.g. `0.025`. Never defaulted here. */
  readonly cpi: number;
}

/**
 * Build the basis from a view and the plan's own settings. One expression, so the table, the
 * focused chart and the comparison chart cannot each pick up a different `cpi` or a different
 * "now" — see the one-fact-one-expression rule this repo keeps relearning.
 */
export const moneyBasis = (
  view: MoneyView,
  settings: { readonly asAtDate: string; readonly economicSeries: { readonly cpi: number } },
): MoneyBasis => Object.freeze({ view, asAtDate: settings.asAtDate, cpi: settings.economicSeries.cpi });

/** Months from the basis's own "now" to `month`. Negative for a month before it — see `priceLevelFactor`. */
export const monthsFromAsAt = (basis: MoneyBasis, month: string): number =>
  monthsBetween(basis.asAtDate, month);

/**
 * **How much more a dollar of `month` costs than a dollar of today — `(1 + cpi) ^ (months / 12)`.**
 *
 * Always ≥ 0, and exactly `1` in the basis's own month, whatever `cpi` is: that is the arithmetic
 * that makes month 0 identical in both views, and it is the cleanest proof the conversion is the
 * right way round. `cpi = 0` gives `1` in every month, so the two views coincide everywhere — the
 * algebraic control.
 *
 * A month BEFORE `asAtDate` gives a factor below 1, so a figure from it reads LARGER in today's
 * money, which is right — `project()` never produces such a month, but `MoneyBasis` does not forbid
 * one and a silently wrong answer would be worse than a defined one.
 *
 * A `cpi` at or below `-1` has no real power and is refused rather than returned as `NaN`. It is a
 * bare `RangeError` and not a named refusal: `parsePlan` accepts any finite rate, nothing in the
 * engine consults this figure, and no register row governs what a display gloss does with an
 * impossible one.
 *
 * The arithmetic is `core/priceLevel.ts`'s; this is the `MoneyBasis`-shaped way in to it.
 */
export const priceLevelFactor = (basis: MoneyBasis, month: string): number =>
  priceLevelFactorOf(basis.cpi, basis.asAtDate, month);

/** A conversion already bound to one month. Every figure in one row goes through one of these. */
export type MoneyLens = (cents: Cents) => Cents;

/**
 * **The lens a NOMINAL figure goes through — the engine's own figures, and everything on the page
 * except the Contingency Floor.**
 *
 * In `'futureDollars'` it is the identity and is not merely a factor of 1: the figure is returned
 * unchanged, so the raw view cannot be a rounding away from the engine's own cents.
 *
 * In `'todaysDollars'` it DIVIDES by the price level — `mulCents(cents, 1 / factor)`. Dividing is
 * the whole direction of the feature: a future amount buys LESS than the same number of dollars
 * today, so every future figure gets smaller, and a later month moves further than an earlier one.
 * Multiplying instead would inflate the forecast and read as an enormous windfall.
 */
export const moneyLens = (basis: MoneyBasis, month: string): MoneyLens => {
  if (basis.view === 'futureDollars') return (cents) => cents;
  const factor = priceLevelFactor(basis, month);
  return (cents) => mulCents(cents, 1 / factor);
};

/**
 * **The lens a figure ALREADY STATED IN TODAY'S MONEY goes through, and it runs the other way.**
 *
 * The Contingency Floor is the one such figure this page draws. It is a single number carried flat
 * across the whole walk (`monthsToSeries.ts`), so it has no month of its own to be converted
 * against — and when a household says *"I want $700,000 of buffer"* they mean $700,000 of what it
 * buys now, not $700,000 of 2065 money. So it stays put in the today's-money view and is INFLATED
 * month by month in the future-dollars view, where it curves upward: keeping the same buying power
 * in 2065 takes more dollars than it does this year.
 *
 * ✅ **`ChartSeries.belowFloor` AND `outcomes.ts`'s `contingencyFloorBreach` NOW AGREE WITH THIS
 * READING — TODO.md P4-14, settled by the user's ruling of 2026-09-21.** They used to compare the
 * month's reachable money to the flat floor in NOMINAL cents, which is the other reading — a floor
 * of $700,000 of whatever a dollar is worth that year — and the two curves crossed the line in
 * different months. The stated figure is REAL, and the comparison is made nominal-to-nominal by
 * raising the floor to each month's price level (`outcomes.ts`'s `contingencyFloorAt`). Both sides
 * multiply by `core/priceLevel.ts`'s one factor and round once through `mulCents`, so the drawn
 * curve and the counted curve are equal to the cent in every month — asserted in
 * `test/app-todays-dollars.test.mjs` and `test/app-months-to-series.test.mjs`.
 */
export const statedInTodaysMoneyLens = (basis: MoneyBasis, month: string): MoneyLens => {
  if (basis.view === 'todaysDollars') return (cents) => cents;
  return (cents) => inflateStated(cents, basis.cpi, basis.asAtDate, month);
};
