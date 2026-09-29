// P7-1 (the pure half of comparison mode) — N walks turned into N lines per Scenario's figure, and
// NOTHING ELSE. No canvas, no DOM, no Chart.js type: importable under `node:test`, exactly as
// `monthsToSeries.ts` is, and every claim in this header is an assertion in
// `test/app-comparison-series.test.mjs`.
//
// ⚠️ **COMPARISON MODE NEVER DRAWS THE MEANS-TEST SPLIT AS A STACK (user ruling, 2026-09-19).** The
// focused chart (one Scenario) is the Protected/Assessable stack of `monthsToSeries.ts`; the
// comparison (N Scenarios) is one LINE per Scenario, in one of two views the reader picks
// (`comparisonConfig.ts`'s `ComparisonView`):
//
//   * **total wealth** (the default) — each line the Household's TOTAL wealth, which answers
//     *"which plan is better?"*;
//   * **what Centrelink counts** — each line that walk's `assessableAssets` alone, drawn against
//     the assets test's two thresholds, which answers *"which plan does the means test see less
//     of?"*. Protected assets are left out of this view, not stacked under it.
//
// **Why the split still cannot come along as bands.** `chartConfig.ts` already warns that a THIRD
// stacked band would draw every reachable dollar twice; a second Scenario's two bands in the same
// stack is the same failure four times over — four bands adding to twice the Household's wealth,
// drawn as authoritatively as a correct chart. There is no `bands` field anywhere in this module's
// return, no `WealthBandKey` imported, and `comparisonConfig.ts` (which is the only consumer) cannot
// express a stack at all. Each line carries its two figures as two SEPARATE arrays, one per view,
// and a view draws exactly one of them. See its header for the mechanisms.
//
// **The one addition in this module, and why it is not the double-count.** `totalWealth` sums
// `protectedAssets + assessableAssets`. That is exactly the sum `plan.ts` licenses — the two
// PARTITION total wealth, every `AssetLine` carries exactly one of the two treatments — and it is
// the same figure the focused chart's stack HEIGHT already draws. What is never summed here is
// `accessibleAssets`, which cross-cuts both and is not a share of anything; it is not read by this
// module at all.
//
// **The thresholds are the walk's OWN, per Scenario.** `Month.assetsTestThresholds` depends on the
// Household's circumstances in that walk (a Scenario that sells the home moves to the non-homeowner
// figures), so every line carries its own pair and nothing here picks one Scenario's to stand for
// all. `null` where the walk computed no entitlement that month — a gap, as on the focused chart.
//
// **NO MARKER CAPTIONS IN COMPARISON MODE (user ruling, 2026-09-19).** N captions collide — the
// two markers of the focused chart already land one month apart on the committed fixture — so the
// Shortfall Age travels as TEXT, in the Scenario list beside the chart, and the chart carries at
// most a bare rule per line. `ScenarioComparisonLine` therefore has a `shortfall` with a SENTENCE
// on it and no caption anywhere, and `comparisonConfig.ts`'s rule type has no caption field to
// put one in.
//
// **`pensionOnlyAge` is not asked here at all.** It throws on a walk the published Age Pension
// parameters do not cover (`monthsToSeries.ts`'s gate), and the committed fixture is such a walk.
// `shortfallAge` is safe on any non-empty walk, which is why it is the comparison number.
import { agesCaption } from './monthsToSeries.js'; // `.js` is correct in a `.ts` file — see tsconfig.json
import { ageAxis, agePensionAgeLines } from './monthsToSeries.js';
import type { AgeAxis, AgePensionAgeLines } from './monthsToSeries.js';
import { shortfallAge } from '../core/outcomes.js';
import { AGE_PENSION_LINE } from '../core/projection.js';
import { crossoverPoint } from './crossover.js';
import type { Household } from '../core/household.js';
import type { Month, Scenario } from '../core/plan.js';
import type { PlanFile } from '../core/parsePlan.js';
import type { ScenarioWalks } from './scenarioWalks.js';
import { scenarioEntries } from './scenarioWalks.js';
import { formatDollars } from './displayMoney.js';
import type { Cents } from '../core/money.js';
import type { Entry } from '../core/plan.js';

/** Said on the face of the chart, because a reader arriving from focused mode saw a split here. */
export const COMPARISON_NOTE =
  'Each line is one scenario’s TOTAL wealth — the means-test split is not drawn in this view. Select a single scenario to see it.';

/** Said because the ages are deliberately NOT on the chart — see the header's ruling. */
export const SHORTFALL_IN_LIST_NOTE =
  'Each scenario’s Shortfall Age is listed beside the chart, not captioned on it: N captions on one chart collide.';

/** What a walk says about running out of money, as a line of text and as a position. */
export interface ScenarioShortfall {
  /** `'never'` is a real answer and is spelled out — see `ShortfallAge.outcome`. */
  readonly outcome: 'never' | 'shortfall';
  /** `YYYY-MM`, or `undefined` iff `outcome` is `'never'`. */
  readonly month: string | undefined;
  /** Index into `months`, or `undefined` iff `outcome` is `'never'`. Never `-1`, never faked with `0`. */
  readonly index: number | undefined;
  /** The whole fact as one sentence, for the Scenario list. Never blank. */
  readonly text: string;
}

/**
 * **P6-8b — the Age Pension entitlement dimension, beside the tax one.** A COUNT of months paid,
 * never an amount: the comparison this belongs to is about whether the pension turns up at all
 * (P6-8b's own text — "a comparison showing tax alone is confidently wrong for every year the
 * exemption is running"), and a dollar figure here would invite comparing pension INCOME across two
 * Scenarios whose spending targets, and therefore whose means-test outcomes, already differ for
 * reasons this comparison is not about. Read straight off `Month.lines` — no new engine read, on
 * `incomeHeadline.ts`'s own `monthsPaidAPension` precedent — and `pensionOnlyAge` is NOT asked here,
 * for `shortfallSummary`'s own reason: it throws on a walk the published Age Pension parameters do
 * not cover, and this fixture is one.
 */
export interface ScenarioAgePension {
  /** How many months of the walk actually paid something — never an entitlement, only a count. */
  readonly monthsPaid: number;
  /** The walk's own length, so "312 of 501" can be read without a second lookup. */
  readonly totalMonths: number;
  /** The first month it was paid, or `undefined` where it never was in this walk. */
  readonly firstMonth: string | undefined;
  /** The whole fact as one sentence, for the Scenario list, on `ScenarioShortfall.text`'s pattern. */
  readonly text: string;
}

/** Every month of `months` in which the walk paid something described `AGE_PENSION_LINE`. */
export const agePensionSummary = (months: readonly Month[]): ScenarioAgePension => {
  const paid = months.filter((month) => month.lines.some((line) => line.description === AGE_PENSION_LINE));
  const firstMonth = paid[0]?.month as string | undefined;
  const text =
    paid.length === 0
      ? 'Age Pension: not paid in any month of this plan.'
      : `Age Pension: paid in ${paid.length} of ${months.length} months, from ${firstMonth as string}.`;
  return Object.freeze({ monthsPaid: paid.length, totalMonths: months.length, firstMonth, text });
};

/**
 * **P9-1d — which home value a Scenario priced HEAS off.** The Security Value is a `HEAS_DRAW`
 * parameter, not a Setting (ADR-0005, 2026-09-04), so two Scenarios can carry two valuations — and
 * the difference moves every HEAS figure while showing nowhere else on the comparison. Absent from a
 * line whose Scenario has no switched-on `HEAS_DRAW`. One figure per Scenario: the door refuses a
 * couple's two entries disagreeing within one Scenario (`checkHeasDrawRelations`).
 */
export interface ScenarioHeas {
  /** The entry's own `securityValue`, in today's money, as stated. */
  readonly securityValue: Cents;
  readonly text: string;
}

/** The switched-on `HEAS_DRAW` in `entries` (one Scenario's resolved list), or `undefined`. */
export const heasSummary = (entries: readonly Entry[]): ScenarioHeas | undefined => {
  const draw = entries.find((entry): entry is Extract<Entry, { type: 'HEAS_DRAW' }> => entry.enabled && entry.type === 'HEAS_DRAW');
  if (draw === undefined) return undefined;
  const securityValue = draw.params.securityValue;
  return Object.freeze({
    securityValue,
    text: `HEAS: priced off a home valued at ${formatDollars(securityValue)} in today's money — your own estimate.`,
  });
};

/** One walk's two assets-test thresholds, month by month; `null` where it computed no entitlement. */
export interface ScenarioThresholds {
  readonly fullPensionUpTo: readonly (number | null)[];
  readonly noPensionAbove: readonly (number | null)[];
}

/**
 * One Scenario's line. `values` is total wealth in cents, one per month, in the walk's order;
 * `assessableValues` is the same walk's `assessableAssets` alone, for the "what Centrelink counts"
 * view. Never added together, and never drawn in the same view.
 */
export interface ScenarioComparisonLine {
  readonly scenarioId: string;
  /** The Scenario's own name, as the plan spells it. Disambiguated for the LEGEND, not here. */
  readonly name: string;
  readonly values: readonly number[];
  readonly assessableValues: readonly number[];
  readonly thresholds: ScenarioThresholds;
  readonly shortfall: ScenarioShortfall;
  readonly agePension: ScenarioAgePension;
  /** See `ScenarioHeas`. Absent where this Scenario draws no HEAS loan. */
  readonly heas?: ScenarioHeas;
}

/**
 * **P6-8c — which of the ONE PAIR of Scenarios this comparison has is ahead by total after-tax
 * spendable wealth, and stays ahead: `crossover.ts`'s `crossoverPoint`, on `Month.accessibleAssets`.**
 * Present only where `crossoverPairOf` finds a single unambiguous pair (see its own doc — either the
 * whole comparison is two Scenarios, or it is more than two and exactly one SIBLING PAIR among them
 * shares a parent) and `crossoverPoint` reports `'crossed'` for that pair. Every other case —
 * no pair, more than one candidate pair, or `crossoverPoint` reporting `'aLeadsThroughout'`,
 * `'bLeadsThroughout'` or `'noStableCrossing'` — is "there is nothing to mark", on the same
 * absent-marker convention `pensionOnlyAge` already uses (`monthsToSeries.ts`). There is NO caption
 * field here — `comparisonConfig.ts` draws this as a bare rule, the same shape as a Shortfall Age
 * rule, and for the same ruling: this module's own `notes` field is never a reason for something
 * that IS drawn, and a marker with no caption needs no sentence to duplicate its date.
 */
export interface ComparisonCrossover {
  /** Index into `months` — the first month the leader does not change again before the walk ends. */
  readonly index: number;
  readonly month: string;
  /** Which Scenario is ahead from `index` onward — the FIRST or SECOND of the two lines compared. */
  readonly leaderScenarioId: string;
}

export interface ComparisonSeries {
  /** `YYYY-MM`, ascending. Every line is this long, and every walk agreed about it. */
  readonly months: readonly string[];
  /** The same axis `monthsToSeries` builds — the Household is shared by every Scenario (ADR-0002). */
  readonly ageAxis: AgeAxis;
  /** One per Scenario walked, in the plan's own scenario order. Never empty. */
  readonly lines: readonly ScenarioComparisonLine[];
  /**
   * The ids the palette is assigned over (`scenarioStyle.ts`) — every Scenario in the plan, which
   * can be more than `lines` when only some are drawn (`scenarioSelection.ts`). A line's style is a
   * function of this set, so it must not shrink when a line is left out.
   */
  readonly styleIds: readonly string[];
  /** The standing sentences for this view. Never a reason for something that IS drawn. */
  readonly notes: readonly string[];
  /**
   * Each Person's Age Pension age month — ONE set for every Scenario, because the People are the
   * same in all of them. Read off the first Scenario's walk, as `ageAxis` is.
   */
  readonly agePensionAge: AgePensionAgeLines;
  /** See `ComparisonCrossover`. `undefined` unless there are exactly two lines AND they cross stably. */
  readonly crossover?: ComparisonCrossover;
}

/**
 * **A walk's Shortfall Age as a sentence.** The list shows this beside every Scenario, which is
 * the comparison number people actually want and the reason it is text rather than another mark
 * on a chart that already has N lines on it.
 *
 * `shortfallAge` refuses an empty walk and the refusal is passed through rather than caught: a
 * Scenario with no months has not told us the money lasted.
 */
export const shortfallSummary = (months: readonly Month[], household: Household): ScenarioShortfall => {
  const shortfall = shortfallAge(months, household);
  const at = shortfall.firstShortfall;
  if (at === undefined) {
    return Object.freeze({
      outcome: 'never' as const,
      month: undefined,
      index: undefined,
      text: 'No shortfall in any month.',
    });
  }
  const index = months.findIndex((month) => month.month === at.month);
  if (index === -1) {
    // Unreachable through `project()`: the Shortfall Age is a month of the walk it was read off.
    throw new RangeError(
      `the Shortfall Age is ${at.month}, which is not a month of the walk handed in — these months are not the walk it was read off`,
    );
  }
  return Object.freeze({
    outcome: 'shortfall' as const,
    month: at.month as string,
    index,
    text: `Shortfall Age ${agesCaption(at)}`,
  });
};

/**
 * **The pair `crossoverPoint` is asked about, or `undefined` where there is no single unambiguous
 * one — P6-8c.**
 *
 * Two rules, either one enough to answer, both structural:
 *
 *   * **Exactly two Scenarios in the whole comparison.** The simple case — a user looking at two
 *     plans and nothing else, however the two came to exist.
 *   * **Exactly one SIBLING PAIR — two Scenarios sharing one non-null `parentId`, and no third
 *     Scenario shares it.** This is the shape `superVsInvestTemplate` (P6-8 microtask 2) actually
 *     produces: two clones of one source, alongside the source itself and whatever else the plan
 *     already held — three-or-more Scenarios in total, but still exactly one pair anyone generated
 *     together on purpose. A plan holding two DIFFERENT sibling pairs (two guided comparisons run
 *     back to back) answers neither — refusing to guess which pair a reader means, on the same
 *     ground `crossoverPoint` itself refuses to guess a leader out of a tied final month.
 *
 * A plan of exactly two ROOT Scenarios is caught by the first rule and never reaches the second —
 * the second only groups Scenarios with a non-null `parentId`, so it cannot double-count them.
 */
const crossoverPairOf = (scenarios: readonly Scenario[]): readonly [Scenario, Scenario] | undefined => {
  if (scenarios.length === 2) return [scenarios[0] as Scenario, scenarios[1] as Scenario];
  const siblings = new Map<string, Scenario[]>();
  for (const scenario of scenarios) {
    if (scenario.parentId === null) continue;
    const group = siblings.get(scenario.parentId) ?? [];
    group.push(scenario);
    siblings.set(scenario.parentId, group);
  }
  const pairs = [...siblings.values()].filter((group) => group.length === 2);
  return pairs.length === 1 ? [pairs[0]?.[0] as Scenario, pairs[0]?.[1] as Scenario] : undefined;
};

/**
 * **N walks → N lines, each carrying both views' figures.**
 *
 * `walks` must be `scenarioWalks(plan)`'s own output — one walk per Scenario in `plan.scenarios`,
 * each projected from that Scenario's RESOLVED entries and not from the pool. A missing walk is
 * refused rather than skipped: a comparison silently missing one of the plans being compared is
 * the worst possible answer to "which is better".
 *
 * **The months are CHECKED to line up, not assumed to.** Every Scenario shares the Household and
 * the Settings, so every walk covers the identical forecast window — but the lines are drawn
 * against one shared label array, so a pair of walks that disagreed by one month would draw two
 * scenarios' figures against each other's dates with nothing on screen to say so.
 */
export const comparisonSeries = (plan: PlanFile, walks: ScenarioWalks): ComparisonSeries => {
  const first = walks.byScenarioId.get(plan.scenarios[0]?.id ?? '');
  if (plan.scenarios.length === 0 || first === undefined) {
    throw new RangeError('a comparison needs at least one scenario walk — there is nothing to compare');
  }
  const months = first.map((month) => month.month as string);
  const lines = plan.scenarios.map((scenario) => {
    const walk = walks.byScenarioId.get(scenario.id);
    if (walk === undefined) {
      throw new RangeError(`scenario "${scenario.id}" has no walk — every scenario being compared must have been projected`);
    }
    if (walk.length !== months.length || walk.some((month, index) => month.month !== months[index])) {
      throw new RangeError(
        `scenario "${scenario.id}" covers different months from "${plan.scenarios[0]?.id}" — the lines share one axis, so a walk over other months would be drawn against the wrong dates`,
      );
    }
    const heas = heasSummary(scenarioEntries(plan, scenario));
    return Object.freeze({
      scenarioId: scenario.id,
      name: scenario.name,
      // The partition's own total — see the header on why this sum is the licensed one.
      values: Object.freeze(walk.map((month) => (month.protectedAssets as number) + (month.assessableAssets as number))),
      assessableValues: Object.freeze(walk.map((month) => month.assessableAssets as number)),
      thresholds: Object.freeze({
        fullPensionUpTo: Object.freeze(walk.map((month) => (month.assetsTestThresholds?.fullPensionUpTo ?? null) as number | null)),
        noPensionAbove: Object.freeze(walk.map((month) => (month.assetsTestThresholds?.noPensionAbove ?? null) as number | null)),
      }),
      shortfall: shortfallSummary(walk, plan.household),
      agePension: agePensionSummary(walk),
      ...(heas === undefined ? {} : { heas }),
    });
  });
  // P6-8c — the crossover, only where there is a single, unambiguous PAIR to ask about. See
  // `ComparisonCrossover`'s own doc for why the other three `crossoverPoint` outcomes draw nothing.
  let crossover: ComparisonCrossover | undefined;
  const pair = crossoverPairOf(plan.scenarios);
  if (pair !== undefined) {
    const [scenarioA, scenarioB] = pair;
    const walkA = walks.byScenarioId.get(scenarioA.id);
    const walkB = walks.byScenarioId.get(scenarioB.id);
    if (walkA !== undefined && walkB !== undefined) {
      const outcome = crossoverPoint(walkA, walkB);
      if (outcome.outcome === 'crossed') {
        crossover = Object.freeze({
          index: outcome.index,
          month: outcome.month,
          leaderScenarioId: (outcome.leader === 'a' ? scenarioA : scenarioB).id,
        });
      }
    }
  }

  return Object.freeze({
    months: Object.freeze(months),
    ageAxis: ageAxis(first, plan.household),
    agePensionAge: agePensionAgeLines(first, plan.household),
    lines: Object.freeze(lines),
    styleIds: Object.freeze(plan.scenarios.map((scenario) => scenario.id)),
    notes: Object.freeze([COMPARISON_NOTE, SHORTFALL_IN_LIST_NOTE]),
    ...(crossover === undefined ? {} : { crossover }),
  });
};
