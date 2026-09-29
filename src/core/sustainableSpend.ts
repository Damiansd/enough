// P10-1 / P10-2 — **HOW MUCH CAN THIS HOUSEHOLD SPEND AND STILL BE FUNDED IN EVERY MONTH?** A
// binary search over `project()`, answered as a FACTOR on the plan's own stated spending. ⚠️ **The
// two cases it used to REFUSE by name are both gone (2026-09-21) — see below: each named an engine
// defect, both defects are fixed, and a refusal is not left standing over a defect that no longer
// exists.**
//
// This module is a READING of the engine and never a part of it: it calls `project()` with entry
// lists it synthesises, and it changes nothing about how a walk is computed. It is pure, node
// testable and has no DOM — `app/sustainableSpendHeadline.ts` turns the answer into sentences.
//
// ---------------------------------------------------------------------------------------------
// **THE KNOB: ONE FACTOR `k` ON EVERY `SPEND_CHANGE.annualSpend`, AND NOTHING ELSE** (settled in
// advance, ADR-0004). A plan holding three spending levels — $80,000 now, $60,000 at 70, $45,000 at
// 80 — keeps that shape: every level moves by the same k. **Flattening the plan to one level is
// refused**, because the tool must not answer a question by replacing the plan the user wrote.
//
// ⚠️ **k SCALES THE STATED FIGURE, AND THE INDEXATION IS APPLIED ON TOP BY THE WALK.**
// `SpendChangeParams.annualSpend` has been a REAL figure since register O85 (`44fcbff`): the walk
// raises it to each month's price level from `settings.asAtDate`. So the candidate entry list holds
// `round(k × annualSpend)` — the figure as the user would have typed it — and `project()` inflates
// that. Scaling an already-inflated figure would compound k against the price level and would come
// out high by exactly the CPI factor of whichever month it was taken in. `test/core-sustainable-
// spend.test.mjs` pins this against a `cpi: 0` control.
//
// **THE CONVERGENCE IS NOT FINER THAN THE ENGINE CAN EXPRESS.** `monthlySpendFromAnnual` takes
// `Math.ceil(annual / 12)`, so two annual figures inside ~$12 of each other produce the same monthly
// target and the same walk, to the byte. The search therefore stops when the largest stated level
// has stopped moving by more than `RESOLUTION_CENTS`; going further would be iterations spent
// bisecting a number the walk cannot tell apart, and would print false precision.
//
// ---------------------------------------------------------------------------------------------
// **THE PASS PREDICATE: NOT ONE SHORT MONTH, ANYWHERE IN THE WALK** — `shortfallAge().outcome ===
// 'never'` — plus the Contingency Floor where the plan states one.
//
// The competing marker, `pointOfNoRecovery`, is REJECTED for the solver although `outcomes.ts`
// reports it: it is the *"final unbroken run reaching the horizon"* reading, so a plan that is short
// for twenty years and recovers in its last month passes under it. It also INVERTED on a
// portfolio-funded plan until P10-4 — 147 violations of downward closure in 1,476 samples, now 0,
// measured below. A sustainable spending level that leaves decades of unfunded months is the
// flattering answer this project is organised against, so the rejection stands on its own ground
// whatever the sweep says.
//
// **THE FLOOR LIMB, AND WHAT IT DOES WHEN NO FLOOR IS STATED (P10-2).** `Settings.contingencyFloor`
// is optional and absence is the only spelling of *"no floor"*. A plan that states one must also
// never cross it — `contingencyFloorBreach` already reads every month — and a plan that states none
// is judged on the shortfall alone. It is neither a silent pass nor a silent fail: the answer
// carries `floorApplied`, the headline says which of the two happened, and both are tested.
//
// ---------------------------------------------------------------------------------------------
// ✅ **BOTH REFUSALS ARE GONE, AND A PLAN HOLDING INVESTMENTS OUTSIDE SUPER IS ANSWERED
// (P10-4, 2026-09-21).**
//
// Until today this module refused, by name, any plan holding a parcel or stating an enabled
// `NON_SUPER_INVESTMENT`. The reason was an engine defect and it is written out here because the
// refusal is deleted rather than narrowed: when the walk sold units to pay for a month it drew only
// what the month needed and then charged the capital gains tax as a separate line against the same
// running cash, so the month reported an unfunded shortfall equal to the tax — one measured walk was
// **$566.10 short in a month the household could reach $18,088,555** — and a search over that
// converged on a number that was wrong and looked right.
//
// `project()` no longer behaves that way. Limb 3 offers what the portfolio can DELIVER, net of the
// tax selling it would cause, and grosses its draw up so that each sale funds its own tax; a
// portfolio that cannot fund a month plus that tax is a genuine shortfall and is still reported as
// one. The defect the refusal named does not exist, so `INVESTMENTS_REFUSAL`, the `holdsInvestments`
// kind, the `holdsInvestments` predicate and their tests are deleted with it. **SEVEN outcome kinds
// now, where there were nine two days ago.**
//
// ---------------------------------------------------------------------------------------------
// ✅ **AND THE OTHER REFUSAL WENT THE SAME MORNING (P10-5, 2026-09-21).**
//
// Until today a plan whose `asAtDate` was not 1 July paid NO Account-Based Pension minimum until
// the following 1 July: a retired household was unfunded through its opening months whatever it
// spent, and a search that believed those months answered far below the truth. So this module
// refused to state a figure whenever the months deciding the answer all fell in that window.
//
// The engine no longer behaves that way. SIS Reg Sch 7 cl 1(2)(a)(i) works the year's minimum out
// on the 1 July balance, cl 3 pro-rates only a year the pension COMMENCED in, and nothing in the
// Schedule makes a part-year nil — the nil was never law, it was a missing input. `project()` now
// determines that year in the walk's first month with the plan's own opening balance standing in,
// declared through `pensionAccountBalanceObservedLater` and reported in the month's notes. The
// refusal is deleted rather than narrowed, because the defect it named does not exist.
//
// The two households it was measured on answer now: $50,320 against the $19,315 the old engine
// would have converged on, and $82,210 against $36,724.
//
// ---------------------------------------------------------------------------------------------
// **MONOTONICITY, MEASURED BEFORE ANY OF THIS WAS BUILT AND RE-MEASURED WHEN THE REFUSAL WENT.** A
// bisection over a predicate that is not downward-closed in the spending level converges
// confidently on a wrong number and says it with a dollar sign, so the predicate was swept first, on
// parcel-free plans only: eleven shapes (accumulation only, retirement-phase pensions, one Person
// and two, salaries running and stopped, with and without a mortgage, with and without a stated
// floor, `asAtDate` on and off 1 July), **~2,500 samples, 0 violations and 0 candidate refusals**.
//
// ⚠️ **THE PARCEL-HOLDING SWEEP IS WHAT THE REFUSAL RESTED ON, AND IT IS NOW ZERO TOO
// (2026-09-21).** The same harness on a plan holding a $900,000 parcel on a $200,000 cost base,
// **1,476 samples from k = 0.05 to k = 3.00**, took **147 violations of `pointOfNoRecovery`'s
// downward closure before P10-4 and 0 after it** — and the two markers, which used to disagree,
// now pass on exactly the same 565 samples. The largest passing level moved from k = 0.642 to
// k = 1.178: the phantom shortfall was understating that household's sustainable spending by 83%.
//
// ⚠️ **COST, RE-MEASURED AFTER P10-4: ~48ms per walk warm over a 501-month forecast on the demo
// plan, against ~40ms before it, and ~91ms on a plan whose every month sells parcels.** The
// gross-up asks the engine's own assessment what a sale would be charged, several times in every
// month that sells, and that is what it costs. The search is still 18 walks — about 0.9 seconds on
// the demo plan, behind a button. The figure below is the pre-P10-4 measurement, kept beside it.
//
// **COST: ~37ms per walk, warm, over a 501-month forecast (74.8ms cold), measured 2026-09-21.** One
// answer is the plan as written, two bracket probes and ~15 bisections — about **18 walks, ~0.7
// seconds**, on the UI thread, behind a button the user presses. Nothing here is debounced onto
// typing and nothing is speculative: the search runs when it is asked for. `app/scenarioWalks.ts`'s
// header still says ~14ms and ADR-0002 still says microseconds; both are stale, and neither is this
// module's to correct.
import {
  DownsizerContributionUnfundedError,
  HOUSEHOLD_SPENDING_LINE,
  HomePurchaseUnfundedError,
  RadPaymentUnfundedError,
  SHORTFALL_LINE,
  monthOf,
  monthlySpendFromAnnual,
  project,
} from './projection.js'; // `.js` is correct in a `.ts` file — see tsconfig.json
import { contingencyFloorBreach, shortfallAge, statedContingencyFloor } from './outcomes.js';
import type { Cents } from './money.js';
import type { Entry, IsoMonth, Month, Settings } from './plan.js';
import type { Household } from './household.js';

/** What a candidate walk costs to answer. `project`, except under a test that counts the calls. */
export type Projector = (settings: Settings, household: Household, entries: readonly Entry[]) => readonly Month[];

// ---------------------------------------------------------------------------------------------
// ✅ **P16-3 (2026-09-25) — AN UNFUNDABLE RAD IS A FAILING CANDIDATE, NEVER A REASON TO ABANDON
// THE SEARCH.** Found by the mock-up: an `ENTER_CARE` paying a $750,000 RAD as a lump sum made
// `sustainableSpend()` refuse the plan outright — `'candidateRefused'`, no figure, three walks —
// against a plan that project()s cleanly as written.
//
// **The cause was NOT "a lower spend funds the RAD worse".** That reading was tested directly and
// is false: `project()`'s own funding of a RAD is monotone in the expected direction, worse at a
// HIGHER factor, exactly as spending more for thirty years before the RAD falls due should make it.
// The actual cause was `HIGHEST_FACTOR` (4×) genuinely emptying the household before the RAD falls
// due, which makes the RAD itself unfundable — `RadPaymentUnfundedError` — and the search treated
// THAT one candidate's exception exactly like every other refusal: abandon the whole search on the
// spot, discarding the fact that `LOWEST_FACTOR` had already passed cleanly. A household whose true
// sustainable level sits comfortably inside the range never got to see it.
//
// **The as-written walk's own `$5,505 "Unfunded shortfall"` in the RAD month is CORRECT, not a
// second bug.** `projection.ts`'s P14-18 ruling scopes the whole-Waterfall refusal to the RAD lump
// sum alone; the ONGOING aged care fees due the same month are a deliberately separate, later
// outflow that reaches the ordinary shortfall sweep on their own — "a resident whose fees the
// household cannot quite meet this month is a genuine shortfall, not a reason to refuse the whole
// plan" (`projection.ts`, P14-18). The RAD itself was funded in full in that same month; the
// shortfall is a different fact about a different limb of the same tick, and `test/core-projection-
// aged-care.test.mjs` now pins the two staying apart.
//
// **The fix is `RadPaymentUnfundedError`, named (P16-3) so `walk` can tell it apart from every
// other exception a candidate can throw.** Caught here and read back as a FAILING `Verdict` —
// `shortAt: [error.month]` — in exactly the shape an ordinary `SHORTFALL_LINE` month already takes,
// so the bisection that already knows how to work around a failing month does, with no second kind
// of failure for `boundAt`/`boundOn` or the page to learn. Every OTHER exception `project()` can
// throw is still read out as `'candidateRefused'`, unchanged — this is a narrow carve-out for the
// one ground that is a fact about the candidate rather than a sign of a broken walk.
// ---------------------------------------------------------------------------------------------

/**
 * **How close is close enough, in cents a year on the largest stated level.** $12, because
 * `monthlySpendFromAnnual`'s `Math.ceil(annual / 12)` cannot express anything finer: twelve months
 * of a one-cent-a-month difference is the smallest change that can move a single walk.
 */
export const RESOLUTION_CENTS = 1_200;

/** The lowest and highest factors searched. Outside them the answer is reported, never extrapolated. */
export const LOWEST_FACTOR = 0.01;
export const HIGHEST_FACTOR = 4;

/**
 * Which answer this is. Carried so that a renderer and a test can name the case rather than matching
 * on prose — SEVEN of them, and every one has its own sentence in the headline. (Nine on the
 * morning of 2026-09-21: `firstYearDecides` went with P10-5 and `holdsInvestments` with P10-4, each
 * deleted rather than left standing over a defect that no longer exists.)
 */
export type SustainableSpendKind =
  /** There is no `SPEND_CHANGE` in force, so there is no stated figure for a factor to scale. */
  | 'nothingToScale'
  /** The level this module read is not the level the walk emitted — a canary, never a guess. */
  | 'levelUnreadable'
  /** A candidate walk REFUSED. The engine's own message is carried out; no figure is stated. */
  | 'candidateRefused'
  /** Even the lowest factor searched is short. Spending is not what is driving this. */
  | 'nothingWorks'
  /** The highest factor searched is still funded. The answer is above the range, not inside it. */
  | 'higherThanSearched'
  /** Funded at the plan's own spending, with room above it: `factor >= 1`. */
  | 'headroom'
  /** Not funded at the plan's own spending: `factor < 1`. */
  | 'reduceSpending';

export interface SustainableSpend {
  readonly kind: SustainableSpendKind;
  /**
   * **THE FACTOR.** Every `SPEND_CHANGE.annualSpend` multiplied by this is the most the plan can
   * state and still be funded in every month. `undefined` in every kind that states no figure.
   */
  readonly factor: number | undefined;
  /** The spending level standing in the walk's FIRST month, exactly as the plan states it. */
  readonly statedAnnualSpend: Cents | undefined;
  /** That same level, times the factor — the figure the headline prints. */
  readonly sustainableAnnualSpend: Cents | undefined;
  /** The month both figures are stated at: the first month of the walk, which is `asAtDate`'s. */
  readonly atMonth: IsoMonth | undefined;
  /** The first month that fails, just above the answer — what the answer is limited BY. */
  readonly bindsAt: IsoMonth | undefined;
  /**
   * WHICH limb `bindsAt` failed on: a month that could not be paid for, or reachable money going
   * under the stated Contingency Floor. Two different sentences on screen, so they are two different
   * facts here rather than one month a renderer has to guess about.
   */
  readonly limitedBy: 'shortfall' | 'floor' | undefined;
  /** Whether a stated Contingency Floor took part in the test. `false` means the plan states none. */
  readonly floorApplied: boolean;
  /** The refusal's own words, on `candidateRefused` and on `levelUnreadable`. */
  readonly reason: string | undefined;
  /** How many times `project()` was called. Asserted in the tests, so the cost cannot drift silently. */
  readonly walks: number;
}

/**
 * **A candidate: every `SPEND_CHANGE` scaled by one factor, and every other entry untouched.** A new
 * array of new objects — the caller's list is never mutated, so a search cannot leave the plan it
 * was asked about scaled by whatever factor it stopped on.
 *
 * A disabled `SPEND_CHANGE` is scaled too: it does not apply, so scaling it changes no walk, and
 * skipping it would make a re-enabled level the one figure the answer did not cover.
 */
export const scaledBy = (entries: readonly Entry[], factor: number): readonly Entry[] =>
  entries.map((entry) =>
    entry.type === 'SPEND_CHANGE'
      ? { ...entry, params: { ...entry.params, annualSpend: Math.round(entry.params.annualSpend * factor) as Cents } }
      : entry,
  );

/** The spending level standing in `month`: latest date wins, and a tie goes to the last stated. */
const standingLevel = (entries: readonly Entry[], month: IsoMonth): Entry | undefined => {
  let held: Entry | undefined;
  for (const entry of entries) {
    if (entry.type !== 'SPEND_CHANGE' || !entry.enabled) continue;
    if (monthOf(entry.date) > month) continue;
    if (held === undefined || entry.date >= held.date) held = entry;
  }
  return held;
};

/**
 * What one candidate walk decided. **The two limbs are kept APART rather than summed into one list
 * of failing months**, because they are two different failures and the page says two different
 * sentences about them: a month that could not be paid for is not the same fact as reachable money
 * going under a buffer the household set. (They were kept apart originally because P10-5's refusal
 * turned on the first and not the second; that refusal is gone and the separation outlived it,
 * because `limitedBy` still names which one bound the answer.)
 */
interface Verdict {
  readonly passed: boolean;
  /** Every month carrying an unfunded shortfall, ascending. */
  readonly shortAt: readonly IsoMonth[];
  /** The first month reachable money went under a stated floor, or `undefined`. */
  readonly breachAt: IsoMonth | undefined;
}

const judge = (months: readonly Month[], household: Household, settings: Settings): Verdict => {
  const shortAt = months
    .filter((each) => each.lines.some((line) => line.direction === 'inflow' && line.description === SHORTFALL_LINE))
    .map((each) => each.month);
  const floor = statedContingencyFloor(settings);
  const breach = floor === undefined ? undefined : contingencyFloorBreach(months, household, floor);
  const breachAt = breach === undefined || breach.outcome === 'never' ? undefined : breach.firstBreach!.month;
  return Object.freeze({ passed: shortAt.length === 0 && breachAt === undefined, shortAt: Object.freeze(shortAt), breachAt });
};

/** What the answer is limited BY — the first short month, or the floor where nothing was short. */
const boundAt = (verdict: Verdict): IsoMonth | undefined => verdict.shortAt[0] ?? verdict.breachAt;

/** Which limb `boundAt` names. `undefined` only where the candidate passed and nothing bound it. */
const boundOn = (verdict: Verdict): 'shortfall' | 'floor' | undefined =>
  verdict.shortAt.length > 0 ? 'shortfall' : verdict.breachAt === undefined ? undefined : 'floor';

const answer = (over: Partial<SustainableSpend> & Pick<SustainableSpend, 'kind' | 'walks' | 'floorApplied'>): SustainableSpend =>
  Object.freeze({
    factor: undefined,
    statedAnnualSpend: undefined,
    sustainableAnnualSpend: undefined,
    atMonth: undefined,
    bindsAt: undefined,
    limitedBy: undefined,
    reason: undefined,
    ...over,
  });

/**
 * **The sustainable spending level for one Scenario's resolved entries.**
 *
 * `entries` must be what the Scenario actually projects — `app/scenarioWalks.ts`'s resolved list,
 * never `plan.entries`, which is the pool every Scenario draws from. This module cannot tell the two
 * apart, and a search run over the pool would answer for a plan nobody wrote.
 *
 * Never throws for a plan `project()` can walk: a candidate that refuses comes back as
 * `'candidateRefused'` carrying the engine's own words. A plan `project()` refuses AS WRITTEN is a
 * different thing — the page is already showing that refusal — and it is not caught here.
 */
export const sustainableSpend = (
  settings: Settings,
  household: Household,
  entries: readonly Entry[],
  projector: Projector = project,
): SustainableSpend => {
  const floorApplied = statedContingencyFloor(settings) !== undefined;

  // The plan AS WRITTEN — one walk, and the only one whose refusal is allowed out of this function.
  const asWritten = projector(settings, household, entries);
  let walks = 1;
  const atMonth = asWritten[0]!.month;
  const standing = standingLevel(entries, atMonth);
  if (standing === undefined || standing.type !== 'SPEND_CHANGE') {
    return answer({ kind: 'nothingToScale', walks, floorApplied, atMonth });
  }
  const statedAnnualSpend = standing.params.annualSpend;

  // **The canary.** The level read above is a second expression of a rule `project()` owns, so it is
  // checked against the walk's own first month rather than trusted: at `asAtDate` the price level is
  // exactly 1, so the emitted line IS `monthlySpendFromAnnual` of the stated figure. A disagreement
  // means this module is reading a different plan from the engine, and it says so instead of scaling
  // a figure nobody is spending.
  const emitted = asWritten[0]!.lines
    .filter((line) => line.effect === 'cash' && line.description === HOUSEHOLD_SPENDING_LINE)
    .reduce((total, line) => total + line.amount, 0);
  if (emitted !== monthlySpendFromAnnual(statedAnnualSpend)) {
    return answer({
      kind: 'levelUnreadable',
      walks,
      floorApplied,
      atMonth,
      statedAnnualSpend,
      reason:
        'This forecast is spending a different figure in its first month from the one this plan states, so a' +
        ' sustainable level cannot be worked out from it. Check whether more than one spending level is in force' +
        ' on the same date.',
    });
  }

  const biggestLevel = entries.reduce<number>(
    (largest, entry) => (entry.type === 'SPEND_CHANGE' && entry.enabled ? Math.max(largest, entry.params.annualSpend) : largest),
    statedAnnualSpend,
  );
  /** In factor terms, the point past which two candidates are the same walk. See the header. */
  const resolution = RESOLUTION_CENTS / biggestLevel;

  const walk = (factor: number): Verdict | string => {
    walks += 1;
    try {
      return judge(projector(settings, household, scaledBy(entries, factor)), household, settings);
    } catch (error) {
      // **P16-3 — an unfundable RAD is a FAILING candidate, not a reason to give up the search.**
      // Every other refusal `project()` can throw is a genuine engine defect or a plan shape this
      // search cannot make sense of (see `refused` below), and the search is right to stop and hand
      // the message back unread. This ONE ground is different: `RadPaymentUnfundedError` fires
      // exactly when a candidate has spent so much of its own money that the Waterfall cannot reach
      // a lump sum due later — a fact about that factor, in the same family as an ordinary shortfall
      // or a Contingency Floor breach, and the bisection already knows how to work around a month
      // that fails. Read back as `shortAt: [error.month]` so `boundAt`/`boundOn` name it exactly as
      // they would a `SHORTFALL_LINE` month, with no second failing-month kind for the page to learn.
      // An unfundable BUY_HOME (P14-19) or DOWNSIZER_CONTRIBUTION (P9-5) is the same kind of fact about the candidate.
      if (error instanceof RadPaymentUnfundedError || error instanceof HomePurchaseUnfundedError || error instanceof DownsizerContributionUnfundedError) {
        return Object.freeze({ passed: false, shortAt: Object.freeze([error.month]), breachAt: undefined });
      }
      return error instanceof Error ? error.message : String(error);
    }
  };

  const refused = (message: string): SustainableSpend =>
    answer({ kind: 'candidateRefused', walks, floorApplied, atMonth, statedAnnualSpend, reason: message });

  const lowest = walk(LOWEST_FACTOR);
  if (typeof lowest === 'string') return refused(lowest);
  if (!lowest.passed) {
    // Nothing in the range works. **Until P10-5 landed this branch had a second outcome** — a
    // household that failed only in its opening part-year, which the engine could not fund because
    // it determined no pension minimum for that year. That is fixed in `project()`, so a plan that
    // is short at a hundredth of its spending is now short for a reason about the plan.
    return answer({
      kind: 'nothingWorks',
      walks,
      floorApplied,
      atMonth,
      statedAnnualSpend,
      bindsAt: boundAt(lowest),
      limitedBy: boundOn(lowest),
    });
  }

  const highest = walk(HIGHEST_FACTOR);
  if (typeof highest === 'string') return refused(highest);
  if (highest.passed) {
    return answer({
      kind: 'higherThanSearched',
      walks,
      floorApplied,
      atMonth,
      statedAnnualSpend,
      factor: HIGHEST_FACTOR,
      sustainableAnnualSpend: Math.round(statedAnnualSpend * HIGHEST_FACTOR) as Cents,
    });
  }

  // Bisection, with the invariant that `low` passes and `high` does not — both established above, so
  // there is no candidate here whose side is assumed. `failing` is always the verdict at `high`, so
  // the months that limit the answer are the months of a walk that was actually run.
  let low = LOWEST_FACTOR;
  let high = HIGHEST_FACTOR;
  let failing: Verdict = highest;
  while (high - low > resolution) {
    const middle = (low + high) / 2;
    const verdict = walk(middle);
    if (typeof verdict === 'string') return refused(verdict);
    if (verdict.passed) low = middle;
    else {
      high = middle;
      failing = verdict;
    }
  }

  // `low` and never `high`: the answer is the largest factor that PASSED, so a reader who takes this
  // figure back to the plan gets a walk with no short month in it. Rounding it up to the bracket's
  // failing end would hand back a level this engine has just said does not work.
  return answer({
    kind: low >= 1 ? 'headroom' : 'reduceSpending',
    walks,
    floorApplied,
    atMonth,
    statedAnnualSpend,
    factor: low,
    sustainableAnnualSpend: Math.round(statedAnnualSpend * low) as Cents,
    bindsAt: boundAt(failing),
    limitedBy: boundOn(failing),
  });
};
