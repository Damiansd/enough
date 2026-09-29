// plan_ai.md §5 and §13 microtask 6 — **`getMarkers`: `outcomes.ts`'s answers about a whole walk.**
//
// **Household verdicts stay the Household's.** The Shortfall Age, the Pension-Only Age, the
// Contingency Floor and the home loan are one Waterfall, one target, one balance and one loan, so
// each dated verdict is a month and BOTH Persons' ages in it (`AgeAtMonth`), never one Person's.
// **Per-person markers stay per Person:** one retirement per Person, and one outcome per Person under
// each mortgage target, labelled A and B by position and never merged.
//
// **An absent marker says WHY it is absent.** `outcomes.ts` spells every absence as its own value
// ("never" is a real answer; a walk the Age Pension parameters do not reach is refused; no floor is
// stated; there is no loan) and each is kept as its own status here, with a sentence. None of them
// is sent as a null, because "it never happens" and "it could not be worked out" are different facts.
import { PENSION_ONLY_NEVER_NOTE, PENSION_ONLY_UNCOMPUTABLE_NOTE } from '../../monthsToSeries.js'; // `.js` is correct in a `.ts` file — see tsconfig.json
import {
  agedPersonIndexes,
  contingencyFloorAt,
  contingencyFloorBreach,
  mortgagePayoff,
  mortgageTargets,
  pensionOnlyAge,
  retirementMonths,
  shortfallAge,
  statedContingencyFloor,
} from '../../../core/outcomes.js';
import { agePensionParametersCover, firstDayOf } from '../../../core/projection.js';
import { labelledFigure } from './basisLabelled.js';
import { personLabel, toolOutput } from './identity.js';
import { DEFAULT_MONEY_VIEW, MONEY_VIEW_TAG } from '../../todaysDollars.js';
import { isRefusal, scenarioWalk } from './scenarioWalk.js';
import type { AgeAtMonth, StatedContingencyFloor } from '../../../core/outcomes.js';
import type { IsoMonth } from '../../../core/plan.js';
import type { PlanFile } from '../../../core/parsePlan.js';
import type { MoneyBasis } from '../../todaysDollars.js';
import type { ToolOptions, ToolRefusal } from './scenarioWalk.js';

/** Why each marker, or each part of one, is absent — one sentence per distinct fact. */
export const ABSENT = Object.freeze({
  shortfallNever: 'No Shortfall Age: the plan meets the spending target in every month of the forecast.',
  shortfallRecovers: 'None: the forecast ends with the spending target met again.',
  pensionOnlyUncomputable: PENSION_ONLY_UNCOMPUTABLE_NOTE,
  pensionOnlyNever: PENSION_ONLY_NEVER_NOTE,
  pensionOnlyToTheEnd: 'None: the Household lives on the Age Pension alone from then to the end of the forecast.',
  pensionOnlyEndsOtherwise: 'None: the forecast does not end with the Household living on the Age Pension alone.',
  noFloorStated: 'No Contingency Floor: this plan states none, so there is nothing to fall below.',
  floorNever: 'No breach: the money the Household can reach stays at or above the Contingency Floor in every month of the forecast.',
  floorRebuilt: 'None: the forecast ends with the reachable money back at or above the floor.',
  noLoan: 'No home loan payoff: no home loan is in force in any month of the forecast.',
  loanNeverPaidOff: 'Never: the home loan is not paid off within the forecast.',
  loanStillOwing: 'None: money is still owed on the home loan in the last month it is reported.',
  noRetirement: 'No retirement: no retirement entry reaches this Person in this scenario.',
  noMortgageTarget: 'No mortgage target: no mortgage target entry is switched on in this scenario.',
});

/** A dated Household verdict: the month, and every Person's age in it, by label. */
const dated = (at: AgeAtMonth) => {
  // A Person who has died has no age in `at.ages` (P12-1); each age keeps its own Person's label.
  const indexes = agedPersonIndexes(at);
  return { month: at.month, ages: at.ages.map(({ age }, position) => ({ person: personLabel(indexes[position] ?? position), age })) };
};

const orAbsent = (at: AgeAtMonth | undefined, why: string) => (at === undefined ? why : dated(at));

export const markers = (plan: PlanFile, scenarioId: string, months: Parameters<typeof shortfallAge>[0], entries: Parameters<typeof retirementMonths>[2], basis: MoneyBasis) => {
  const { household, settings } = plan;
  const first = months[0]!;
  const last = months.at(-1)!;

  const shortfall = shortfallAge(months, household);
  const shortfallMarker =
    shortfall.outcome === 'never'
      ? { status: 'never' as const, why: ABSENT.shortfallNever }
      : {
          status: 'shortfall' as const,
          firstShortfall: dated(shortfall.firstShortfall!),
          pointOfNoRecovery: orAbsent(shortfall.pointOfNoRecovery, ABSENT.shortfallRecovers),
          recovered: shortfall.recovered,
          monthsShort: shortfall.monthsShort,
        };

  // `monthsToSeries`'s gate, asked as a predicate: the question `pensionOnlyAge` would refuse.
  const pensionComputable = agePensionParametersCover(firstDayOf(first.month)) && agePensionParametersCover(firstDayOf(last.month));
  const pensionOnly = pensionComputable ? pensionOnlyAge(months, household, settings.economicSeries.agePension) : undefined;
  const pensionOnlyMarker =
    pensionOnly === undefined
      ? { status: 'uncomputable' as const, why: ABSENT.pensionOnlyUncomputable }
      : pensionOnly.outcome === 'never'
        ? { status: 'never' as const, why: ABSENT.pensionOnlyNever }
        : {
            status: 'pensionOnly' as const,
            firstPensionOnly: dated(pensionOnly.firstPensionOnly!),
            monthsPensionOnly: pensionOnly.monthsPensionOnly,
            recoveredAt: orAbsent(pensionOnly.recoveredAt, ABSENT.pensionOnlyToTheEnd),
            pointOfNoRecovery: orAbsent(pensionOnly.pointOfNoRecovery, ABSENT.pensionOnlyEndsOtherwise),
          };

  const floor = statedContingencyFloor(settings);
  // The floor in that month's nominal cents (the figure the breach compares), then the page's lens.
  const floorIn = (stated: StatedContingencyFloor, month: IsoMonth): string => labelledFigure(contingencyFloorAt(stated, month), basis, month);
  const floorMarker = (() => {
    if (floor === undefined) return { status: 'noFloorStated' as const, why: ABSENT.noFloorStated };
    const breach = contingencyFloorBreach(months, household, floor);
    if (breach.outcome === 'never') return { status: 'never' as const, floor: floorIn(floor, first.month), why: ABSENT.floorNever };
    const at = breach.firstBreach!;
    return {
      status: 'breached' as const,
      firstBreach: dated(at),
      floorThatMonth: floorIn(floor, at.month),
      pointOfNoRecovery: orAbsent(breach.pointOfNoRecovery, ABSENT.floorRebuilt),
      recovered: breach.recovered,
      monthsBelowFloor: breach.monthsBelowFloor,
    };
  })();

  const payoff = mortgagePayoff(months, household);
  const payoffMarker =
    payoff.outcome === 'noLoan'
      ? { status: 'noLoan' as const, why: ABSENT.noLoan }
      : {
          status: payoff.outcome,
          firstPayoff: orAbsent(payoff.firstPayoff, ABSENT.loanNeverPaidOff),
          clearForGood: orAbsent(payoff.clearForGood, ABSENT.loanStillOwing),
          owedAtHorizon: labelledFigure(payoff.owedAtHorizon!, basis, payoff.lastReported!),
          lastReported: payoff.lastReported!,
        };

  const retirements = retirementMonths(months, household, entries);
  const targets = mortgageTargets(entries, retirements);

  return {
    scenarioId,
    basis: MONEY_VIEW_TAG[basis.view],
    forecast: { firstMonth: first.month, lastMonth: last.month },
    household: {
      shortfallAge: shortfallMarker,
      pensionOnlyAge: pensionOnlyMarker,
      contingencyFloor: floorMarker,
      mortgagePayoff: payoffMarker,
    },
    perPerson: {
      retirements: retirements.map((retirement, index) =>
        retirement.month === undefined
          ? { person: personLabel(index), status: 'noRetirement' as const, why: ABSENT.noRetirement }
          : { person: personLabel(index), status: 'retires' as const, month: retirement.month, age: retirement.age! },
      ),
      mortgageTargets:
        targets.length === 0
          ? { status: 'none' as const, why: ABSENT.noMortgageTarget }
          : {
              status: 'stated' as const,
              targets: targets.map((target) => ({
                entryId: target.entryId,
                month: target.month,
                perPerson: target.perPerson.map(({ outcome }, index) => ({ person: personLabel(index), outcome })),
              })),
            },
    },
  };
};

export type Markers = ReturnType<typeof markers>;

/** The Scenario's markers, or a named refusal. */
export const markersOrRefusal = (plan: PlanFile, options: ToolOptions = {}): Markers | ToolRefusal => {
  const walk = scenarioWalk(plan, options);
  if (isRefusal(walk)) return walk;
  return markers(plan, walk.scenarioId, walk.months, walk.entries, walk.basis);
};

/** `getMarkers` as the connector returns it: serialised, through the identity guard. */
export const getMarkers = (plan: PlanFile, options: ToolOptions = {}): string =>
  toolOutput(plan.household, markersOrRefusal(plan, options), options.basis ?? DEFAULT_MONEY_VIEW);
