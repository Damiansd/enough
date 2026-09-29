// plan_ai.md §5, §12.2 and §13 microtask 7 — **`runProjection`: a what-if, and the engine's own
// difference from the plan as it is.**
//
// **A WHAT-IF IS A CHILD SCENARIO OF THE ASKED ONE, in memory, for this call only.** It says
// `{ add, disable, replace }`: entries to add, entry ids to switch off, and entries to swap for a new
// one. It is built with the page's own mechanism and no second one: a Scenario whose `parentId` is
// the asked Scenario (so it inherits everything, live), whose own `entryIds` are the added and
// replacing drafts (`planWithEntry`, aimed at it by naming it active for the append), and whose
// `entryOverrides` switch off each disabled or replaced entry (`planWithEntryOverride`). A replace is
// therefore exactly a switch-off plus an add. The candidate goes through `validatedPlan`, the same
// parse door and trial walk the form's edits go through, and the difference is measured against the
// PARENT, the asked Scenario as it is. The plan is cloned at the boundary, so a deep-frozen plan
// works and the caller's is never touched; ids are made up fresh each call; nothing is kept between
// calls, and no write path is reachable from this folder (`test/import-graph.test.mjs`).
//
// **A SECOND ENTRY OF A TYPE THE WALK HONOURS ONCE IS REFUSED BY NAME** (`HONOURED_ONCE`). The walk
// takes a Person's earliest `RETIRE` (`retiredOn ?? entry.date`) and the Household's earliest
// `ILLNESS_SEPARATION` (nothing ends one), so a second is either ignored or silently moves the date
// the first one set. "Retire two years later" added beside the plan's own retirement came back "no
// change"; it now comes back refused, with the fix: replace the existing one. A `RETIRE` after going
// back to work is not a second one: it stops work again (retire flow S3, `workSpells`).
//
// **A DRAFT NAMES A SUPER ACCOUNT COUNTED FROM 1, as the page does**, and it is stored counted from 0
// (`accountsStored`). Account 0 or one the Person does not hold is refused by name before the door.
//
// **THE DIFFERENCE IS THE ENGINE'S, NEVER THE MODEL'S (§12.2 kind 3).** Each year's figures are summed
// in nominal cents for both walks, SUBTRACTED in nominal cents, and only then converted once at the
// row's `lastMonth` and labelled — the §13(b) rule applied to a difference. Converting each side and
// subtracting the labels would be out by a cent wherever the two roundings differ. Markers are not
// subtracted at all: each goes out as its before and after, with whether it changed.
//
// **A refusal comes back as a refusal, word for word except for translation.** `parsePlan`'s and the
// engine's refusals are all `RangeError`s; one is returned named, with a Person's name replaced by
// their label and any figure it carries omitted (it has no month to be labelled at). It is never
// swallowed and the baseline is never returned in its place: a what-if the engine refused is not the
// plan as it is. Anything that is not a `RangeError` is a fault in this build and is thrown.
import { planWithEntry, planWithEntryOverride, planWithScenarios, validatedPlan } from '../../planEdits.js'; // `.js` is correct in a `.ts` file — see tsconfig.json
import { scenarioById, scenarioEntries } from '../../scenarioWalks.js';
import { DEFAULT_MONEY_VIEW, MONEY_VIEW_TAG } from '../../todaysDollars.js';
import { addCents, subCents } from '../../../core/money.js';
import { workSpells } from '../../../core/retirementPension.js';
import { figuresOmitted, labelledFigure, labelledFinancialYears } from './basisLabelled.js';
import { financialYearSummaries } from './financialYearSummary.js';
import { markers } from './getMarkers.js';
import { anonymousRefusalText, carriesIdentity, personLabel, toolOutput } from './identity.js';
import { isRefusal, scenarioWalk } from './scenarioWalk.js';
import type { Cents } from '../../../core/money.js';
import type { Household } from '../../../core/household.js';
import type { PlanFile } from '../../../core/parsePlan.js';
import type { Entry, EntryType, Month } from '../../../core/plan.js';
import type { MoneyBasis } from '../../todaysDollars.js';
import type { Labelled } from './basisLabelled.js';
import type { FinancialYearRow, Flows, Stocks } from './financialYearSummary.js';
import type { Markers } from './getMarkers.js';
import type { ToolOptions, ToolRefusal } from './scenarioWalk.js';

export const REASON_OMITTED = 'reason omitted: carries a name';
export const NO_DRAFTS = 'No draft entries were given: this is the scenario as it is, and every difference is nil.';
export const AGAINST = 'the same scenario as it is, without this what-if';

/** How much a what-if returns: the headline differences (the default), or every figure of every year. */
export const DETAILS = ['compact', 'full'] as const;
export type Detail = (typeof DETAILS)[number];

export interface RunProjectionOptions extends ToolOptions {
  /** Absent: `'compact'`. */
  readonly detail?: Detail;
}

/** The six figures a compact year reports, each a sum of the summariser's own nominal figures. */
interface Headlines {
  readonly spending: Cents;
  readonly agePension: Cents;
  readonly incomeFromSuper: Cents;
  readonly tax: Cents;
  readonly unfundedShortfall: Cents;
  readonly totalBalances: Cents;
}

export const HEADLINES_EXPLAINED =
  "differenceByYear has each changed year's headline figures that changed, as the what-if less the plan as it is, at the year's last " +
  'month. spending: household spending, one-off expenses and home loan repayments. tax: income tax and Division 293 tax. ' +
  "totalBalances: protected and assessable assets at the year's end. Ask with detail \"full\" for every figure of every year.";

const headlinesOf = ({ flows, stocks }: FinancialYearRow): Headlines => ({
  spending: addCents(addCents(flows.spending.household, flows.spending.oneOffExpenses), flows.spending.mortgageRepayments),
  agePension: flows.agePension,
  incomeFromSuper: flows.income.incomeFromSuper,
  tax: addCents(flows.incomeTax, flows.division293Tax),
  unfundedShortfall: flows.unfundedShortfall,
  totalBalances: addCents(stocks.protectedAssets, stocks.assessableAssets),
});

/** One line per run of consecutive years with no headline difference: `2027-28 to 2033-34: no change`. */
const noChangeLines = (runs: readonly (readonly string[])[]): readonly string[] =>
  runs.map((run) => `${run.length === 1 ? run[0] : `${run[0]} to ${run.at(-1)}`}: no change`);

/** A what-if the parse door or the engine refused, in their own words. */
export interface WhatIfRefusal extends ToolRefusal {
  readonly refused: 'WHAT_IF_REFUSED';
  /** The refusal's own class, `PlanFileEntryError`, `CessationBeforePreservationAgeError` and so on. */
  readonly refusal: string;
}

/** An id no entry in `plan` has, and none given earlier in this call. */
const freshIds = (plan: PlanFile, count: number): readonly string[] => {
  const taken = new Set(plan.entries.map(({ id }) => id));
  const ids: string[] = [];
  for (let n = 1; ids.length < count; n += 1) {
    const id = `draft-${n}`;
    if (!taken.has(id)) ids.push(id);
  }
  return ids;
};

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value);

const withId = (draft: unknown, id: string): unknown => (isRecord(draft) ? { ...draft, id } : draft);

/** A what-if: entries to add, entry ids to switch off, and entries to swap for a new one. */
export interface WhatIfChanges {
  readonly add: readonly unknown[];
  readonly disable: readonly string[];
  readonly replace: readonly { readonly entryId: string; readonly with: unknown }[];
}

export const WHAT_IF_SHAPE =
  'a what-if is { add?: [entry, ...], disable?: [entry id, ...], replace?: [{ entryId, with: entry }, ...] }, each entry written as an entry in the plan file is, and each id one listEntries gives';

/** The what-if as asked, or `undefined` if it is not one. A bare list is the entries to add. */
export const changesOf = (asked: unknown): WhatIfChanges | undefined => {
  if (asked === undefined) return { add: [], disable: [], replace: [] };
  if (Array.isArray(asked)) return { add: asked, disable: [], replace: [] };
  if (!isRecord(asked) || !Object.keys(asked).every((key) => ['add', 'disable', 'replace'].includes(key))) return undefined;
  const { add = [], disable = [], replace = [] } = asked;
  if (!Array.isArray(add) || !Array.isArray(disable) || !Array.isArray(replace)) return undefined;
  if (!disable.every((id) => typeof id === 'string')) return undefined;
  const swaps = replace.every((each) => isRecord(each) && Object.keys(each).sort().join() === 'entryId,with' && typeof each['entryId'] === 'string');
  return swaps ? { add, disable, replace } : undefined;
};

/**
 * A disable or replace that names no entry the Scenario projects, names one twice, or switches off
 * one already off. An unknown id is named by its PLACE in the what-if and never echoed: it is the
 * model's text, and whatever it carries would reach the guards.
 */
const namedEntriesRefusal = (changes: WhatIfChanges, entries: readonly Entry[], scenarioId: string): ToolRefusal | undefined => {
  const byId = new Map(entries.map((entry) => [entry.id, entry]));
  const named = [
    ...changes.disable.map((id, index) => ({ id, place: `disable[${index}]` })),
    ...changes.replace.map(({ entryId }, index) => ({ id: entryId, place: `replace[${index}].entryId` })),
  ];
  const seen = new Set<string>();
  for (const { id, place } of named) {
    if (!byId.has(id)) return { refused: 'UNKNOWN_ENTRY', reason: `${place} is not the id of an entry scenario "${scenarioId}" projects; listEntries gives the ids it does` };
    if (seen.has(id)) return { refused: 'ENTRY_NAMED_TWICE', reason: `entry "${id}" is named more than once across disable and replace; name each entry once` };
    seen.add(id);
  }
  const off = changes.disable.find((id) => !byId.get(id)!.enabled);
  return off === undefined ? undefined : { refused: 'ENTRY_ALREADY_OFF', reason: `entry "${off}" is already switched off in scenario "${scenarioId}", so switching it off changes nothing` };
};

/**
 * **The entry types the walk honours ONCE for whomever they reach** (`projection.ts`): a Person's
 * earliest `RETIRE` (`retiredOn ?? entry.date`; a later one counts only after going back to work,
 * `workSpells`) and the Household's
 * earliest `ILLNESS_SEPARATION` (`illnessSeparatedBy`, which nothing clears). A second one is ignored,
 * or silently moves the date the first one set. Every other type is a level the later one supersedes
 * or an event that acts in its own month.
 */
export const HONOURED_ONCE: readonly EntryType[] = ['RETIRE', 'ILLNESS_SEPARATION'];

/** Whom an honoured-once entry is about: each Person a `RETIRE` reaches; the Household for a separation, whose owner the walk ignores. */
const reachOf = (entry: Entry, persons: number): readonly string[] => {
  if (entry.type !== 'RETIRE') return ['the Household'];
  if (entry.owner === 'household') return Array.from({ length: persons }, (_, index) => personLabel(index));
  return [personLabel(entry.owner === 'personA' ? 0 : 1)];
};

/** A what-if that leaves two switched-on entries of an honoured-once type reaching one Person (or the Household), one of them its own. */
const honouredOnceRefusal = (entries: readonly Entry[], drafts: ReadonlySet<string>, household: Household): ToolRefusal | undefined => {
  const persons = household.persons.length;
  // A Retire that stops a Person again after going back to work is honoured (retire flow S3).
  const stopsAgain = new Set(workSpells(household, entries).flatMap((changes, index) =>
    changes.slice(1).filter(({ kind }) => kind === 'stopped').map(({ entryId }) => `${personLabel(index)}\0${entryId}`)));
  for (const type of HONOURED_ONCE) {
    const byWhom = new Map<string, Entry[]>();
    for (const entry of entries.filter((each) => each.enabled && each.type === type)) {
      for (const whom of reachOf(entry, persons)) {
        if (!stopsAgain.has(`${whom}\0${entry.id}`)) byWhom.set(whom, [...(byWhom.get(whom) ?? []), entry]);
      }
    }
    for (const [whom, found] of byWhom) {
      if (found.length < 2 || !found.some(({ id }) => drafts.has(id))) continue;
      const existing = found.filter(({ id }) => !drafts.has(id)).map(({ id }) => `"${id}"`);
      return {
        refused: 'HONOURED_ONCE',
        reason:
          `the walk honours only the earliest ${type} for ${whom}, and this what-if would leave ${found.length} switched on, so the later one would change nothing: ` +
          `replace the existing one${existing.length === 0 ? '' : ` (${existing.join(', ')})`} with replace: [{ entryId, with }] rather than adding another`,
      };
    }
  }
  return undefined;
};

/**
 * **A draft names a super account the way the page does, counted from 1, and it is stored counted
 * from 0** (`superAccountName`, `interestIndexAsTyped`). The owner's own account, or for a spouse
 * contribution the other Person's. Account 0, a number that is not a whole one, and an account the
 * Person does not hold are refused here by name: the door's own refusal would quote the stored
 * position, counted from 0, back to a model that counts from 1.
 */
const ACCOUNT_FIELDS = { interestIndex: 'own', receivingInterestIndex: 'spouse' } as const;
export const ACCOUNTS_FROM_ONE = 'super accounts are numbered from 1, as the page numbers them';

const heldAccounts = (held: number): string => (held === 0 ? 'no super account' : held === 1 ? 'super account 1 only' : `super accounts 1 to ${held}`);

/** `draft` with each account it names stored by position, or a refusal naming the field by its place. */
export const accountsStored = (plan: PlanFile, draft: unknown, place: string): { readonly draft: unknown } | ToolRefusal => {
  if (!isRecord(draft) || !isRecord(draft['params'])) return { draft };
  const params: Record<string, unknown> = { ...draft['params'] };
  const owner = draft['owner'] === 'personA' ? 0 : draft['owner'] === 'personB' ? 1 : undefined;
  for (const [field, whose] of Object.entries(ACCOUNT_FIELDS)) {
    if (!Object.hasOwn(params, field)) continue;
    const account = params[field];
    const index = owner === undefined ? undefined : whose === 'own' ? owner : 1 - owner;
    const person = index === undefined ? undefined : plan.household.persons[index];
    const held = person?.superInterests.length;
    if (typeof account !== 'number' || !Number.isSafeInteger(account) || account < 1 || (held !== undefined && account > held)) {
      const holds = held === undefined ? '' : `; ${personLabel(index!)} holds ${heldAccounts(held)}`;
      return { refused: 'UNKNOWN_SUPER_ACCOUNT', reason: `${place}.params.${field} names no super account there is: ${ACCOUNTS_FROM_ONE}${holds}` };
    }
    params[field] = account - 1;
  }
  return { draft: { ...draft, params } };
};

/** A door refusal that quotes a draft's stored account position, re-numbered from 1 as the model wrote it. */
const accountsNumberedFromOne = (text: string): string =>
  text.replace(/(\.params\.(?:interestIndex|receivingInterestIndex)) is (\d+)(?!\d)/g, (_match, path: string, position: string) => `${path} is super account ${Number(position) + 1}`);

/** A Scenario id no Scenario in `plan` has. */
const freshScenarioId = (plan: PlanFile): string => {
  const taken = new Set(plan.scenarios.map(({ id }) => id));
  let id = 'what-if';
  for (let n = 2; taken.has(id); n += 1) id = `what-if-${n}`;
  return id;
};

const refusalOf = (plan: PlanFile, error: RangeError): WhatIfRefusal => {
  const translated = anonymousRefusalText(plan.household, accountsNumberedFromOne(error.message));
  return {
    refused: 'WHAT_IF_REFUSED',
    refusal: error.constructor.name,
    reason: carriesIdentity(plan.household, translated) ? REASON_OMITTED : figuresOmitted(translated),
  };
};

/** `after − before` over one shape of nominal cents, leaf by leaf. */
const differenceOf = <T extends object>(before: T, after: T): T =>
  Object.fromEntries(
    Object.entries(after).map(([key, value]) => [
      key,
      typeof value === 'number' ? subCents(value as Cents, (before as Record<string, Cents>)[key]!) : differenceOf((before as Record<string, object>)[key]!, value as object),
    ]),
  ) as T;

const labelledAt = <T extends object>(figures: T, basis: MoneyBasis, month: string): Labelled<T> =>
  Object.fromEntries(
    Object.entries(figures).map(([key, value]) => [key, typeof value === 'number' ? labelledFigure(value as Cents, basis, month as Month['month']) : labelledAt(value as object, basis, month)]),
  ) as Labelled<T>;

const summariesOf = (plan: PlanFile, before: readonly Month[], after: readonly Month[]) => {
  const was = financialYearSummaries(plan.household, before);
  const is = financialYearSummaries(plan.household, after);
  if (was.length !== is.length || was.some((row, index) => row.financialYear !== is[index]!.financialYear)) {
    throw new RangeError('a what-if walk covers different financial years from the walk it is compared with');
  }
  return { was, is };
};

const yearDifferences = (was: readonly FinancialYearRow[], is: readonly FinancialYearRow[], basis: MoneyBasis) =>
  is.map((row, index) => ({
    financialYear: row.financialYear,
    lastMonth: row.lastMonth,
    flows: labelledAt<Flows>(differenceOf(was[index]!.flows, row.flows), basis, row.lastMonth),
    stocks: labelledAt<Stocks>(differenceOf(was[index]!.stocks, row.stocks), basis, row.lastMonth),
  }));

/** The years whose headline figures moved, with only the ones that moved; every other year, as runs of "no change". */
const headlineDifferences = (was: readonly FinancialYearRow[], is: readonly FinancialYearRow[], basis: MoneyBasis) => {
  const changedYears: ({ financialYear: string } & Partial<Labelled<Headlines>>)[] = [];
  const runs: string[][] = [];
  let run: string[] | undefined;
  is.forEach((row, index) => {
    const moved = Object.entries(differenceOf(headlinesOf(was[index]!), headlinesOf(row))).filter(([, cents]) => cents !== 0);
    if (moved.length === 0) {
      if (run === undefined) runs.push((run = []));
      run.push(row.financialYear);
      return;
    }
    run = undefined;
    changedYears.push({ financialYear: row.financialYear, ...Object.fromEntries(moved.map(([key, cents]) => [key, labelledFigure(cents, basis, row.lastMonth)])) });
  });
  return { headlines: HEADLINES_EXPLAINED, differenceByYear: changedYears, unchangedYears: noChangeLines(runs) };
};

const pair = <T>(before: T, after: T) => ({ before, after, changed: JSON.stringify(before) !== JSON.stringify(after) });

const markerPairs = (before: Markers, after: Markers) => ({
  household: {
    shortfallAge: pair(before.household.shortfallAge, after.household.shortfallAge),
    pensionOnlyAge: pair(before.household.pensionOnlyAge, after.household.pensionOnlyAge),
    contingencyFloor: pair(before.household.contingencyFloor, after.household.contingencyFloor),
    mortgagePayoff: pair(before.household.mortgagePayoff, after.household.mortgagePayoff),
  },
  perPerson: {
    retirements: pair(before.perPerson.retirements, after.perPerson.retirements),
    mortgageTargets: pair(before.perPerson.mortgageTargets, after.perPerson.mortgageTargets),
  },
});

/** Every marker pair, with an unchanged marker sent once rather than twice: the compact view leaves the copy out. */
const compactMarkerPairs = (pairs: ReturnType<typeof markerPairs>) =>
  Object.fromEntries(
    Object.entries(pairs).map(([group, markers]) => [
      group,
      Object.fromEntries(Object.entries(markers).map(([name, marker]) => [name, marker.changed ? marker : { changed: false, beforeAndAfter: marker.before }])),
    ]),
  );

/** The what-if on the asked Scenario, its difference from that Scenario as it is, or a named refusal. */
export const whatIfOrRefusal = (plan: PlanFile, asked: unknown = undefined, options: RunProjectionOptions = {}) => {
  const base = structuredClone(plan);
  const detail = options.detail ?? 'compact';
  if (!DETAILS.includes(detail)) return { refused: 'UNKNOWN_DETAIL', reason: `detail is one of ${DETAILS.join(', ')}` };
  const changes = changesOf(structuredClone(asked));
  if (changes === undefined) return { refused: 'MALFORMED_DRAFTS', reason: WHAT_IF_SHAPE };
  const baseline = scenarioWalk(base, options);
  if (isRefusal(baseline)) return baseline;
  const { scenarioId, basis } = baseline;
  const named = namedEntriesRefusal(changes, baseline.entries, scenarioId);
  if (named !== undefined) return named;

  const stored = [
    ...changes.add.map((draft, index) => accountsStored(base, draft, `add[${index}]`)),
    ...changes.replace.map((swap, index) => accountsStored(base, swap.with, `replace[${index}].with`)),
  ];
  const unknownAccount = stored.find(isRefusal);
  if (unknownAccount !== undefined) return unknownAccount;
  const drafts = stored.map((each) => (each as { readonly draft: unknown }).draft);
  const ids = freshIds(base, drafts.length);
  const switchedOff = [...changes.disable, ...changes.replace.map(({ entryId }) => entryId)];
  const childId = freshScenarioId(base);
  const child = { id: childId, name: 'What-if', parentId: scenarioId, entryIds: [] };
  const withDrafts = drafts.reduce<PlanFile>(
    (plan, draft, index) => planWithEntry(plan, withId(draft, ids[index]!)) as PlanFile,
    { ...(planWithScenarios(base, [...base.scenarios, child]) as PlanFile), activeScenarioId: childId },
  );
  const candidate = switchedOff.reduce<PlanFile>((plan, id) => planWithEntryOverride(plan, childId, id, false) as PlanFile, withDrafts);
  let validated;
  try {
    validated = validatedPlan({ ...candidate, activeScenarioId: base.activeScenarioId });
  } catch (error) {
    if (!(error instanceof RangeError)) throw error;
    return refusalOf(base, error);
  }
  const whatIf = validated.walks.byScenarioId.get(childId)!;
  const whatIfEntries = scenarioEntries(validated.plan, scenarioById(validated.plan, childId));
  const once = honouredOnceRefusal(whatIfEntries, new Set(ids), base.household);
  if (once !== undefined) return once;
  const before = markers(base, scenarioId, baseline.months, baseline.entries, basis);
  const after = markers(validated.plan, scenarioId, whatIf, whatIfEntries, basis);
  const { was, is } = summariesOf(base, baseline.months, whatIf);
  const nil = drafts.length === 0 && switchedOff.length === 0 ? { nil: NO_DRAFTS } : {};
  const asAsked = {
    draftEntryIds: ids,
    disabledEntryIds: changes.disable,
    replacedEntryIds: changes.replace.map(({ entryId }, index) => ({ entryId, by: ids[changes.add.length + index]! })),
  };

  if (detail === 'compact') {
    return {
      scenarioId,
      basis: MONEY_VIEW_TAG[basis.view],
      detail,
      ...asAsked,
      difference: {
        against: AGAINST,
        ...nil,
        markers: compactMarkerPairs(markerPairs(before, after)),
        ...headlineDifferences(was, is, basis),
      },
    };
  }
  return {
    scenarioId,
    basis: MONEY_VIEW_TAG[basis.view],
    ...asAsked,
    financialYears: labelledFinancialYears(validated.plan.household, whatIf, validated.plan.settings, basis.view),
    markers: after,
    difference: {
      against: AGAINST,
      ...nil,
      financialYears: yearDifferences(was, is, basis),
      markers: markerPairs(before, after),
    },
  };
};

export type WhatIf = Exclude<ReturnType<typeof whatIfOrRefusal>, ToolRefusal>;

/** `runProjection` as the connector returns it: serialised, through the identity and money guards. */
export const runProjection = (plan: PlanFile, whatIf?: unknown, options: RunProjectionOptions = {}): string =>
  toolOutput(plan.household, whatIfOrRefusal(plan, whatIf, options), options.basis ?? DEFAULT_MONEY_VIEW);
