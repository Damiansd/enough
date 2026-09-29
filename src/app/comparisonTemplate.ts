// P6-8 microtask 2 — the guided template: one dollar figure and a date range in, two visible,
// editable Scenarios out. Pure composition of already-shipped primitives — `scenarioCloned` (P6-7),
// `superContributionEntry` / `nonSuperInvestmentBuyEntry` (P6-8 brief 1 / P3-42) — and nothing here
// is new engine logic. The candidate this builds still goes through the ONE save gate
// (`planEdits.ts`'s `savePlan`, parse-then-project) like every other edit in this build; nothing
// here bypasses it.
//
// **THE STATED SCOPE DECISION: ONE ENTRY PER SIDE, AND THE TWO SIDES ARE THEREFORE SHAPED
// DIFFERENTLY IN TIME, ON PURPOSE.** `SUPER_CONTRIBUTION` is a STANDING annual rate;
// `NON_SUPER_INVESTMENT` is a single dated parcel purchase — the engine has no "standing" shape for
// money leaving the pay packet into a taxable account, only a discrete buy. So this template asks
// for a dollar-a-year figure and a date range, and:
//
//   * the SUPER side gets ONE `SUPER_CONTRIBUTION`, dated at the range's START, at the stated
//     annual rate — standing, so it keeps running PAST the range's end, exactly as a real salary
//     sacrifice would unless the user later adds a "Stop sacrificing" entry of their own (P6-8
//     brief 4). This template does not add one, because the brief that asked for it names ONE
//     entry per side, not two.
//   * the INVEST side gets ONE `NON_SUPER_INVESTMENT` buy, dated at the SAME start date, for the
//     TOTAL of the annual rate over the stated range (`annualAmount × years(start, end)`) — the
//     single-purchase analogue of "the same money, invested outside super instead".
//
// **This is a stated simplification, not a claim of equivalence, and the input screen says so
// (`comparisonTemplateForm.ts`).** The two entries are not dated the same way past the range's end
// — the super side keeps accruing, the invest side does not add to itself — and a user comparing
// a genuinely bounded commitment on both sides can still edit or disable either entry afterwards,
// exactly as every other guided template in this build proposes rather than disposes (P6-5b's own
// ruling, ADR-0004).
import { scenarioCloned } from './scenarioList.js'; // `.js` is correct in a `.ts` file — see tsconfig.json
import {
  dollarsToCents,
  interestIndexAsTyped,
  nonSuperInvestmentBuyEntry,
  superContributionEntry,
} from './planEdits.js';
// Re-exported so the input screen reads the account box the way this module does, from its one import.
export { interestIndexAsTyped };
import { monthsBetween } from '../core/priceLevel.js';
import type { Household } from '../core/household.js';
import type { Entry, Scenario } from '../core/plan.js';
import type { PlanFile } from '../core/parsePlan.js';

/** `personA` or `personB` — the two owners a `SUPER_CONTRIBUTION` can ever name (`parsePlan.ts`). */
export type TemplateOwner = 'personA' | 'personB';

/**
 * **The destination-account refusal, said BEFORE anything is generated — user ruling, precedent
 * matched, not escalated (P6-8 gate).** Mirrors the reason `parsePlan.ts`'s own door refuses a
 * `SUPER_CONTRIBUTION` naming a non-accumulation interest, in the same plain terms this build uses
 * everywhere else it refuses at the point of choice. Returns the refusal sentence, or `undefined`
 * where the destination is fine — never throws, so the input screen can show it beside the
 * selector rather than only after a Generate click.
 */
export const superDestinationRefusal = (
  household: Household,
  owner: TemplateOwner,
  interestIndex: number,
): string | undefined => {
  const person = household.persons[owner === 'personA' ? 0 : 1];
  if (person === undefined) {
    return `there is no ${owner === 'personA' ? 'first' : 'second'} person in this household to contribute for`;
  }
  const interest = person.superInterests[interestIndex];
  if (interest === undefined) {
    return `${person.name} holds ${person.superInterests.length} superannuation interest — that is not one of them`;
  }
  if (interest.phase !== 'accumulation') {
    const phaseWords = interest.phase === 'ttr' ? 'transition-to-retirement' : 'account-based pension';
    return `${person.name}'s account at that position is already paying an income stream (${phaseWords} phase) and cannot receive new contributions. Choose an accumulation account.`;
  }
  return undefined;
};

export interface SuperVsInvestTemplateInput {
  /** What the annual sacrifice (and, over the range, the equivalent lump sum) comes to, as typed. */
  readonly annualAmount: string;
  /** When the arrangement starts, and when the invested lump sum is dated — `YYYY-MM-DD`. */
  readonly startDate: string;
  /** The other end of the range — sizes the invest side's lump sum only; see the header. */
  readonly endDate: string;
  readonly owner: TemplateOwner;
  /** Which of `owner`'s super accounts, as typed and counted from 1 (`interestIndexAsTyped`) — so a blank box is refused by name, not defaulted. */
  readonly interestIndex: string;
  /**
   * Costs to buy the invest side's parcel, in DOLLARS, as typed — `nonSuperInvestmentBuyEntry`'s
   * own required field. **Not defaulted to `0` here**: zero brokerage is a claim about the trade,
   * on that function's own ground, and this template does not invent a figure the user did not
   * type (`concept.md` §5.12 and every other builder in `planEdits.ts` holds the same line). A
   * user who paid nothing types `0` on the input screen.
   */
  readonly incidentalCostsOfAcquisition: string;
  readonly note: string;
}

/** The ids and creation timestamp a caller must supply — this module has no clock and no `crypto`, on `planEdits.ts`'s precedent. */
export interface SuperVsInvestTemplateIds {
  readonly superScenarioId: string;
  readonly investScenarioId: string;
  readonly superEntryId: string;
  readonly investEntryId: string;
}

/** The plan with one entry appended to ONE named Scenario — `planEdits.ts`'s `planWithEntry`, generalised off `activeScenarioId` to an explicit target, because this template writes into two Scenarios that are neither one the active one. */
const planWithEntryInScenario = (plan: PlanFile, scenarioId: string, entry: unknown): PlanFile => {
  const id = (entry as { readonly id?: unknown }).id;
  return {
    ...plan,
    entries: [...plan.entries, entry] as readonly Entry[],
    scenarios: plan.scenarios.map((scenario) =>
      scenario.id === scenarioId ? { ...scenario, entryIds: [...scenario.entryIds, id] } : scenario) as readonly Scenario[],
  };
};

/**
 * **The whole of the template.** Refuses the destination up front (see `superDestinationRefusal`);
 * otherwise clones `sourceScenarioId` twice — once per side — and writes the one entry each side
 * gets into its own clone. Returns a candidate `unknown`, for `savePlan`'s door.
 *
 * The range must run FORWARD: `endDate` on or before `startDate` is refused rather than producing
 * a nil or negative lump sum, which `nonSuperInvestmentBuyEntry`'s own downstream check
 * (`dollarsToCents` → `parsePlan`) would otherwise catch far from where the user set the two dates.
 */
export const superVsInvestTemplate = (
  plan: PlanFile,
  sourceScenarioId: string,
  input: SuperVsInvestTemplateInput,
  ids: SuperVsInvestTemplateIds,
  createdAt: string,
): unknown => {
  const interestIndex = interestIndexAsTyped(input.interestIndex);
  const refusal = superDestinationRefusal(plan.household, input.owner, interestIndex);
  if (refusal !== undefined) throw new RangeError(refusal);

  const months = monthsBetween(input.startDate, input.endDate);
  if (months <= 0) {
    throw new RangeError(
      `the date range ends (${input.endDate}) on or before it starts (${input.startDate}) — a range has to run forward for there to be anything to compare`,
    );
  }

  const source = plan.scenarios.find((scenario) => scenario.id === sourceScenarioId);
  if (source === undefined) {
    throw new RangeError(`no scenario with id "${sourceScenarioId}" — the template must clone a scenario that is in the plan`);
  }

  const scenarios = scenarioCloned(
    scenarioCloned(plan.scenarios, sourceScenarioId, ids.superScenarioId, `${source.name} — extra super`),
    sourceScenarioId,
    ids.investScenarioId,
    `${source.name} — invest outside super`,
  );

  const superEntry = superContributionEntry(
    { date: input.startDate, owner: input.owner, note: input.note, annualAmount: input.annualAmount, interestIndex: input.interestIndex },
    ids.superEntryId,
    createdAt,
  );

  const lumpSumCents = Math.round((dollarsToCents(input.annualAmount) * months) / 12);
  const investEntry = nonSuperInvestmentBuyEntry(
    {
      date: input.startDate,
      owner: input.owner,
      note: input.note,
      amount: (lumpSumCents / 100).toFixed(2),
      incidentalCostsOfAcquisition: input.incidentalCostsOfAcquisition,
    },
    ids.investEntryId,
    createdAt,
  );

  const withScenarios: PlanFile = { ...plan, scenarios };
  const withSuper = planWithEntryInScenario(withScenarios, ids.superScenarioId, superEntry);
  return planWithEntryInScenario(withSuper, ids.investScenarioId, investEntry);
};
