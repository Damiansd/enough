// P6-8 microtask 1 — the crossover compute: given two Scenarios' walks, which one is AHEAD, by
// TOTAL AFTER-TAX SPENDABLE WEALTH, at every month, and the one date after which that answer stops
// changing.
//
// ⚠️ **THE METRIC IS `Month.accessibleAssets`, RULED BY THE USER 2026-09-22, AND IT IS NOT THE
// FIGURE `comparisonSeries.ts` ALREADY DRAWS.** `comparisonSeries.ts`'s own line is
// `protectedAssets + assessableAssets` — TOTAL wealth, deliberately, for the "which plan is
// better" chart. The P6-8 ruling asks a narrower question for the crossover marker specifically:
// "cash, liquid investments, and whatever super rules currently let this Person draw" — which is
// `accessibleAssets`'s own definition in `plan.ts`, word for word ("the money the Household could
// actually SPEND … Preserved super is NOT in it"). A super balance locked behind a Condition of
// Release counts in the comparison LINE (it is real wealth) but must NOT count in the crossover
// decision (it cannot be spent), so this module reads a different field from the one the chart
// above it draws — see `test/app-crossover.test.mjs` §3 for a fixture where the two disagree.
//
// **THE TIE-BREAKING RULE, STATED PLAINLY (a single sign-change crossing, not every wobble).** A
// walk can have A ahead, then B ahead, then A ahead again — three "crossings" by a naive reading.
// This module reports the LAST of them: the earliest month from which the leading side does not
// change again before the walk ends. That is the only reading that satisfies the brief's own
// wording — "first overtakes the other's, AND STAYS AHEAD" — because a crossing that later
// reverses did not stay ahead. Mechanically this is "the start of the final run of one constant,
// non-zero sign", which is the same index as "the last sign flip in the series": scanning from the
// END for the longest run sharing the final month's sign, and reporting where that run began.
// **The alternative choice — the FIRST sign flip from the series' own opening sign, taken naively
// and without requiring it to hold — is a real, different, and WRONG answer whenever the series
// wobbles**, and is exactly what mutation (a) in this module's test file substitutes to prove the
// two diverge on an oscillating fixture.
//
// **A series that ends EXACTLY TIED has no stable crossing, and this module refuses to guess one.**
// `outcome: 'noStableCrossing'` rather than picking a side arbitrarily — a tied final month means
// the walk itself never settled the question, and reporting a winner would be inventing a fact the
// walk does not contain.
//
// **Months are CHECKED to line up, not assumed to — `comparisonSeries.ts`'s own convention.** Two
// walks of different lengths, or whose months disagree at any index, are refused rather than
// compared past the point they diverge: a crossing computed against misaligned months would name
// the wrong date for both series.
import type { Cents } from '../core/money.js';
import type { Month } from '../core/plan.js';

/** The one figure this module reads off a month — never the whole `Month`, so a hand fixture needs no other field. */
export type CrossoverMonth = Pick<Month, 'month' | 'accessibleAssets'>;

export type CrossoverOutcome =
  /** `a` is ahead in every month of the walk — never overtaken, so there is nothing to mark. */
  | { readonly outcome: 'aLeadsThroughout' }
  /** `b` is ahead in every month of the walk. */
  | { readonly outcome: 'bLeadsThroughout' }
  /**
   * `leader` is ahead from `index` (inclusive) to the end of the walk, and was not before it.
   * `month` is `leader`'s own walk's `month` value at `index`, carried so a caller that mis-indexes
   * is caught, exactly as `comparisonSeries.ts`'s `ScenarioShortfall.month` is.
   */
  | { readonly outcome: 'crossed'; readonly index: number; readonly month: string; readonly leader: 'a' | 'b' }
  /** The two walks are exactly tied in the last month compared — no side is ahead to report. */
  | { readonly outcome: 'noStableCrossing' };

const sign = (cents: number): -1 | 0 | 1 => (cents > 0 ? 1 : cents < 0 ? -1 : 0);

/**
 * **The crossover, by `accessibleAssets` — see the header for why that field and no other.**
 *
 * `a` and `b` must be the same length and share the same `month` at every index — the same check
 * `comparisonSeries.ts` makes of two scenario walks, made here too because this module is called
 * independently of it (`test/app-crossover.test.mjs` calls it on hand fixtures that never touch
 * `comparisonSeries`).
 */
export const crossoverPoint = (a: readonly CrossoverMonth[], b: readonly CrossoverMonth[]): CrossoverOutcome => {
  if (a.length === 0 || b.length === 0) {
    throw new RangeError('a crossover needs at least one month in each walk — there is nothing to compare');
  }
  if (a.length !== b.length || a.some((month, index) => month.month !== b[index]?.month)) {
    throw new RangeError(
      'the two walks cover different months — the crossover is computed month by month against one shared axis, and a pair that disagreed would name the wrong date',
    );
  }
  const diffs = a.map((month, index) => (month.accessibleAssets as number) - ((b[index] as CrossoverMonth).accessibleAssets as number));
  const tailSign = sign(diffs[diffs.length - 1] as number);
  if (tailSign === 0) return Object.freeze({ outcome: 'noStableCrossing' as const });
  let start = diffs.length - 1;
  while (start > 0 && sign(diffs[start - 1] as number) === tailSign) start -= 1;
  const leader: 'a' | 'b' = tailSign === 1 ? 'a' : 'b';
  if (start === 0) {
    return Object.freeze({ outcome: leader === 'a' ? ('aLeadsThroughout' as const) : ('bLeadsThroughout' as const) });
  }
  return Object.freeze({
    outcome: 'crossed' as const,
    index: start,
    month: (leader === 'a' ? a[start] : b[start])?.month as string,
    leader,
  });
};
