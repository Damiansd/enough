// P4-14 — the price level, as ONE expression, because two readers now need it and they must never
// disagree by a cent.
//
// **WHAT THIS IS FOR, AND WHY IT IS IN `src/core/` WITHOUT BREAKING ADR-0001.** The ADR is titled
// *"Compute in nominal dollars internally, display in today's dollars"*, and the rule it carries is
// that the engine must never be handed a DEFLATED figure: five indexation bases (unindexed tax
// brackets, CPI, PBLCI, wages, discretion) do not cancel, so a today's-money dollar taxed, tapered
// and capped against thresholds that were never converted is a wrong number that looks right. That
// forbids the nominal → real direction anywhere but the display layer, and `todaysDollars.ts` is
// where that direction lives.
//
// **This module is the OTHER direction: real → nominal, applied to an INPUT.** The Contingency
// Floor is the one figure a user states in today's money (`Settings.contingencyFloor`), and the
// only way to compare it with a month's balance is to put both on the same price level. Raising the
// stated figure to the month's own nominal dollars is **input normalisation**, not display: nothing
// deflated ever reaches a threshold, a rate or a taper, and the comparison that results is
// nominal-to-nominal like every other comparison the engine makes. Stated here because the next
// reader will otherwise see a `(1 + cpi)` in `src/core/` and read it as the ADR being broken.
//
// `todaysDollars.ts` is built ON this file rather than beside it: the chart DRAWS the floor by
// inflating it (`statedInTodaysMoneyLens`) and `outcomes.ts` COUNTS breaches against it by inflating
// it, and the two must be the same curve to the cent. Two copies of `(1 + cpi) ^ (months / 12)` is
// exactly the one-fact-two-expressions failure this repo keeps paying for.
import { mulCents } from './money.js'; // `.js` is correct in a `.ts` file — see tsconfig.json
import type { Cents } from './money.js';

/** `YYYY-MM` or `YYYY-MM-DD` → a count of months, so two of them can be subtracted. */
export const monthOrdinal = (date: string): number => {
  const match = /^(\d{4})-(\d{2})(?:-\d{2})?$/.exec(date);
  if (match === null) throw new RangeError(`not a YYYY-MM or YYYY-MM-DD date: ${date}`);
  return Number(match[1]) * 12 + Number(match[2]);
};

/** Months from `from` to `to`. Negative where `to` is the earlier of the two — see `priceLevelFactor`. */
export const monthsBetween = (from: string, to: string): number => monthOrdinal(to) - monthOrdinal(from);

/**
 * **How much more a dollar of `month` costs than a dollar of `asAtDate` — `(1 + cpi) ^ (months / 12)`.**
 *
 * Always ≥ 0, and exactly `1` in `asAtDate`'s own month, whatever `cpi` is. `cpi = 0` gives `1` in
 * every month, so a stated figure and its nominal curve coincide everywhere — the algebraic control,
 * and the answer to "what happens with no inflation assumed" without a special case anywhere.
 *
 * A month BEFORE `asAtDate` gives a factor below 1. `project()` never produces such a month, but
 * nothing here forbids one and a defined answer is better than a silently wrong one.
 *
 * A `cpi` at or below `-1` has no real power and is refused rather than returned as `NaN`. A bare
 * `RangeError` and not a named refusal: `parsePlan` accepts any finite rate and no register row
 * governs an impossible one.
 */
export const priceLevelFactor = (cpi: number, asAtDate: string, month: string): number => {
  if (!(cpi > -1)) {
    throw new RangeError(`prices cannot fall by more than all of themselves: cpi is ${cpi}`);
  }
  return (1 + cpi) ** (monthsBetween(asAtDate, month) / 12);
};

/**
 * **A figure STATED IN TODAY'S MONEY, raised to what `month` would charge for the same buying
 * power.** The one expression both readers of the Contingency Floor use: `chartConfig.ts` draws the
 * curve through `statedInTodaysMoneyLens`, which is this multiplication, and `outcomes.ts` counts
 * breaches against `contingencyFloorAt`, which is this function. Rounded to the whole cent by
 * `mulCents`, once, so neither reader can round differently from the other.
 */
export const inflateStated = (cents: Cents, cpi: number, asAtDate: string, month: string): Cents =>
  mulCents(cents, priceLevelFactor(cpi, asAtDate, month));
