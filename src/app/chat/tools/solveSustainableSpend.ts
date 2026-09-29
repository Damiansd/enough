// plan_ai.md §5 and §13 microtask 8 — **`solveSustainableSpend`: the most the plan can spend and still
// be funded in every month, as `core/sustainableSpend.ts` works it out.**
//
// Nothing is searched here. The solver owns the knob (one factor on every stated spending level), the
// pass predicate (no short month anywhere, and the Contingency Floor where one is stated) and every
// outcome kind; this reads its answer the way `sustainableSpendHeadline.ts` does for the page.
//
// **A FIGURE GOES OUT ONLY WHERE THE SEARCH CONVERGED INSIDE ITS RANGE** — `headroom` and
// `reduceSpending`. Both figures are stated at the walk's first month, labelled on the asked basis
// (at that month the two bases agree, but the label still says which one this is). The Shortfall
// Age at that spend is not assumed from the predicate: the plan is walked once more at the converged
// factor and the marker read off that walk, as `getMarkers` reads it.
//
// **EVERY OTHER KIND IS A NAMED REFUSAL WITH THE SOLVER'S OWN REASON, AND NEVER A NUMBER.** Above the
// searched range (`higherThanSearched`) the solver does carry a figure, as a floor; it is not sent,
// because the model would quote a floor as the answer. A candidate walk the engine refused carries
// the engine's words, translated like `runProjection`'s refusals, with any figure omitted.
//
// **COST: about 20 walks** — the scenario walk, the solver's ~18, and the confirming walk. Measured in
// `test/app-chat-solve-sustainable-spend.test.mjs`.
import { MORTGAGE_INTEREST_LINE, MORTGAGE_PRINCIPAL_LINE, project } from '../../../core/projection.js'; // `.js` is correct in a `.ts` file — see tsconfig.json
import { HIGHEST_FACTOR, LOWEST_FACTOR, scaledBy, sustainableSpend } from '../../../core/sustainableSpend.js';
import { DEFAULT_MONEY_VIEW, MONEY_VIEW_TAG } from '../../todaysDollars.js';
import { figuresOmitted, labelledFigure } from './basisLabelled.js';
import { markers } from './getMarkers.js';
import { anonymousAges, anonymousRefusalText, carriesIdentity, toolOutput } from './identity.js';
import { REASON_OMITTED } from './runProjection.js';
import { isRefusal, scenarioWalk } from './scenarioWalk.js';
import type { Cents } from '../../../core/money.js';
import type { PlanFile } from '../../../core/parsePlan.js';
import type { IsoMonth, Month } from '../../../core/plan.js';
import type { Projector, SustainableSpend, SustainableSpendKind } from '../../../core/sustainableSpend.js';
import type { ToolOptions, ToolRefusal } from './scenarioWalk.js';

/** The solver's kinds that state no answer, each refused under its own name. */
type RefusedKind = Exclude<SustainableSpendKind, 'headroom' | 'reduceSpending'>;

export const SEARCH_REFUSED: Readonly<Record<RefusedKind, string>> = Object.freeze({
  nothingToScale: 'NOTHING_TO_SCALE',
  levelUnreadable: 'LEVEL_UNREADABLE',
  candidateRefused: 'CANDIDATE_REFUSED',
  nothingWorks: 'NOTHING_WORKS',
  higherThanSearched: 'HIGHER_THAN_SEARCHED',
});

/** The solver's reason for each kind it has no words of its own for, in `sustainableSpend.ts`'s terms. */
export const SEARCH_REASON = Object.freeze({
  nothingToScale: 'There is no spending level in force in the first month of this forecast, so there is no stated figure for a factor to scale.',
  nothingWorks:
    `Even at ${LOWEST_FACTOR * 100}% of the stated spending, a month in this forecast goes unpaid, so spending is not what is driving it: ` +
    'look at what money is reachable in that month.',
  higherThanSearched:
    `The plan is still funded at ${HIGHEST_FACTOR} times its stated spending, which is where the search stops. The most it could ` +
    'spend is somewhere above that, and the search does not say how far above, so no figure is given.',
  candidateRefused: 'Part way through the search, the forecast refused to run one of the spending levels tried, so the search did not finish.',
});

export const LIMITED_BY = Object.freeze({
  shortfall: 'Spend more than this and this is the first month the plan asks for money it does not have.',
  floor: 'Spend more than this and by this month the money the Household can reach has dropped below the Contingency Floor. Every month is still paid for; it is the buffer that goes.',
});

export const FLOOR_APPLIED = Object.freeze({
  true: 'The Contingency Floor was part of the test: at this level every month is funded and reachable money never goes below it.',
  false: 'No Contingency Floor is stated, so this tests one thing only: that every month is paid for.',
});

export const SHAPE_KEPT =
  'The plan changes its spending more than once, and every one of those levels moves by the same factor: this is not one flat amount for the rest of the plan.';
export const HOME_LOAN_EXTRA = 'This is spending apart from the home loan. While the loan is being repaid, the repayment comes on top of it.';

/** A month the solver named, with every Person's age in it, and which limb failed there. */
const failingMonth = (plan: PlanFile, months: readonly Month[], month: IsoMonth, limb: 'shortfall' | 'floor') => ({
  month,
  // The asked walk carries who has died by then (P12-1); a death's month is the same at any spending level.
  ages: anonymousAges(plan.household, months.find((each) => each.month === month) ?? month),
  limb,
});

const refusal = (plan: PlanFile, months: readonly Month[], result: SustainableSpend): ToolRefusal & Record<string, unknown> => {
  const kind = result.kind as RefusedKind;
  const named = { refused: SEARCH_REFUSED[kind], kind };
  switch (kind) {
    case 'levelUnreadable':
      return { ...named, reason: figuresOmitted(result.reason!) };
    case 'candidateRefused': {
      const translated = anonymousRefusalText(plan.household, result.reason!);
      return { ...named, reason: SEARCH_REASON.candidateRefused, engineSaid: carriesIdentity(plan.household, translated) ? REASON_OMITTED : figuresOmitted(translated) };
    }
    case 'nothingWorks':
      return {
        ...named,
        reason: SEARCH_REASON.nothingWorks,
        ...(result.bindsAt === undefined ? {} : { firstFailingMonth: failingMonth(plan, months, result.bindsAt, result.limitedBy!) }),
      };
    case 'nothingToScale':
    case 'higherThanSearched':
      return { ...named, reason: SEARCH_REASON[kind] };
  }
};

/** The converged spend on the asked Scenario and basis, or a named refusal. `projector` is `project()` except under a test. */
export const sustainableSpendOrRefusal = (plan: PlanFile, options: ToolOptions = {}, projector: Projector = project) => {
  const walk = scenarioWalk(plan, options);
  if (isRefusal(walk)) return walk;
  const { scenarioId, entries, basis } = walk;
  const result = sustainableSpend(plan.settings, plan.household, entries, projector);
  if (result.kind !== 'headroom' && result.kind !== 'reduceSpending') return { scenarioId, ...refusal(plan, walk.months, result) };

  const atMonth = result.atMonth!;
  const figure = (cents: Cents): string => labelledFigure(cents, basis, atMonth);
  const scaled = scaledBy(entries, result.factor!);
  const atThisSpend = project(plan.settings, plan.household, scaled);
  const levels = entries.filter((entry) => entry.type === 'SPEND_CHANGE' && entry.enabled).length;
  const repaying = walk.months.some((month) =>
    month.lines.some((line) => line.effect === 'cash' && (line.description === MORTGAGE_INTEREST_LINE || line.description === MORTGAGE_PRINCIPAL_LINE)),
  );

  return {
    scenarioId,
    basis: MONEY_VIEW_TAG[basis.view],
    answer: result.kind,
    factor: result.factor!,
    sustainableAnnualSpend: figure(result.sustainableAnnualSpend!),
    statedAnnualSpend: figure(result.statedAnnualSpend!),
    statedAt: atMonth,
    shortfallAgeAtThisSpend: markers(plan, scenarioId, atThisSpend, scaled, basis).household.shortfallAge,
    ...(result.bindsAt === undefined ? {} : { limitedBy: { ...failingMonth(plan, walk.months, result.bindsAt, result.limitedBy!), meaning: LIMITED_BY[result.limitedBy!] } }),
    floorApplied: result.floorApplied,
    notes: [FLOOR_APPLIED[`${result.floorApplied}`], ...(levels > 1 ? [SHAPE_KEPT] : []), ...(repaying ? [HOME_LOAN_EXTRA] : [])],
    walks: result.walks + 1,
  };
};

/** `solveSustainableSpend` as the connector returns it: serialised, through the identity and money guards. */
export const solveSustainableSpend = (plan: PlanFile, options: ToolOptions = {}): string =>
  toolOutput(plan.household, sustainableSpendOrRefusal(plan, options), options.basis ?? DEFAULT_MONEY_VIEW);
