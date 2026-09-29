// plan_ai.md §13 — **`listEntries`: the Scenario's own entries, so a what-if can name one.** A model
// cannot switch off, or replace, an entry it cannot see. Each entry the Scenario projects goes out
// with its id, its type, the entry table's own wording for it, whether it is switched on IN THIS
// SCENARIO (`scenarioEntries` resolves the overrides), and the Scenario it was inherited from.
//
// **THE WORDING IS THE TABLE'S (`entrySummary`), AND ITS FIGURES ARE RELABELLED.** The table shows a
// stated figure bare, beside a form that says which money it is. Here each one is relabelled on the
// basis it was stated in (`plan.ts`): a nominal figure at the entry's own month, the spending level
// (register O85: today's money, at `asAtDate`) as itself in today's money and raised to the entry's
// month in future dollars. A salary is stated in today's WAGES, which is neither basis, so it goes
// out tagged as exactly that, `(in today’s wages)` (`TODAYS_WAGES_TAG`), in either view, and is never
// labelled as one of the two bases. The user's own note is the one part the table does
// not write: a name in it is replaced, and a figure in it has no basis to label and is omitted.
import { entrySummary } from '../../entryForm.js'; // `.js` is correct in a `.ts` file — see tsconfig.json
import { DEFAULT_MONEY_VIEW, MONEY_VIEW_TAG } from '../../todaysDollars.js';
import { scenarioAncestry } from '../../../core/plan.js';
import { formatCents } from '../../../core/money.js';
import { inflateStated } from '../../../core/priceLevel.js';
import { figuresOmitted, labelledFigure } from './basisLabelled.js';
import { anonymousRefusalText, carriesIdentity, personLabel, toolOutput } from './identity.js';
import { DOLLAR_FIGURE, TODAYS_WAGES_TAG } from './moneyGuard.js';
import { statedMark } from './figureCapture.js';
import { isRefusal, scenarioWalk } from './scenarioWalk.js';
import type { Cents } from '../../../core/money.js';
import type { Entry, EntryOwner, IsoMonth, Scenario } from '../../../core/plan.js';
import type { PlanFile } from '../../../core/parsePlan.js';
import type { MoneyBasis } from '../../todaysDollars.js';
import type { ToolOptions, ToolRefusal } from './scenarioWalk.js';

export const NOTE_OMITTED = 'note omitted: carries a name';

/**
 * How the entry states a figure (`plan.ts`): nominal at its date, today's money, or today's wages.
 * The optional third element is the figure's OWN date, where it differs from the entry's own — a
 * `HEAS_DRAW` advance's own `date` is later than the entry's `date`, and raising it as at the
 * entry's day (rather than the advance's own) would understate it. Absent, `entry.date` is used.
 */
type Stated = readonly [Cents, 'nominal' | 'todaysMoney' | 'todaysWages', string?];

/** The money figures `entrySummary` writes for `entry`, in the order it writes them. */
const statedFigures = (entry: Entry): readonly Stated[] => {
  switch (entry.type) {
    case 'SPEND_CHANGE':
      return [[entry.params.annualSpend, 'todaysMoney']];
    case 'WORK_PATTERN_CHANGE':
      return [[entry.params.annualSalary, 'todaysWages']];
    case 'ONE_OFF_EXPENSE':
    case 'LUMP_SUM_FROM_SUPER':
    case 'SPOUSE_CONTRIBUTION':
      return [[entry.params.amount, 'nominal']];
    case 'SUPER_CONTRIBUTION':
      return entry.params.kind === 'stopped' ? [] : [[entry.params.annualAmount, 'nominal']];
    case 'MORTGAGE_REFINANCE':
      return [[entry.params.openingBalance, 'nominal'], [entry.params.monthlyRepayment, 'nominal']];
    case 'NON_SUPER_INVESTMENT':
      return entry.params.direction === 'buy'
        ? [[entry.params.amount, 'nominal'], [entry.params.incidentalCostsOfAcquisition, 'nominal']]
        : [[entry.params.amount, 'nominal']];
    // `entryForm.ts`'s `describeParams` own order: home value, room price (RAD), the lump sum.
    // **All three are TODAY's money (user ruling, 2026-09-25, superseding the earlier 'nominal'
    // reading), `SpendChangeParams.annualSpend`'s own basis** — raised to the entry's own day before
    // display, the SAME `inflateStated` the engine itself now raises them by.
    case 'ENTER_CARE':
      return [[entry.params.homeValue, 'todaysMoney'], [entry.params.radPrice, 'todaysMoney'], [entry.params.radPaidAsLumpSum, 'todaysMoney']];
    // `entryForm.ts`'s `describeParams` own order: the security value, then a STATED draw — **TODAY's
    // money too (user ruling, 2026-09-25)**. `'maximum'` is not a `Cents` figure at all, so a
    // household drawing the most allowed carries only the one figure.
    // **The advance (P9-2b) is LAST, always** — `proposeEntries.ts`'s HEAS_DRAW case reconstructs
    // only the FIRST advance (the entry form offers one this slice) and appends its own money box
    // after `securityValue`/`fortnightlyAmount`, so its figure must be appended here in the SAME
    // position or the two money-box lists misalign and a later entry's amount is mislabelled.
    case 'HEAS_DRAW': {
      const base: Stated[] =
        entry.params.fortnightlyAmount === 'maximum'
          ? [[entry.params.securityValue, 'todaysMoney']]
          : [[entry.params.securityValue, 'todaysMoney'], [entry.params.fortnightlyAmount, 'todaysMoney']];
      const firstAdvance = entry.params.advances?.[0];
      return firstAdvance === undefined ? base : [...base, [firstAdvance.amount, 'todaysMoney', firstAdvance.date]];
    }
    // `entryForm.ts`'s `describeParams` own order: the sale price, then selling costs where stated,
    // then the new-home set-aside where stated (P14-13c) — **all three TODAY's money (user ruling,
    // 2026-09-25)**.
    case 'SELL_HOME': {
      const figures: Stated[] = [[entry.params.salePrice, 'todaysMoney']];
      if (entry.params.sellingCosts !== undefined) figures.push([entry.params.sellingCosts, 'todaysMoney']);
      if (entry.params.newHomeAmount !== undefined) figures.push([entry.params.newHomeAmount, 'todaysMoney']);
      return figures;
    }
    // `entryForm.ts`'s `describeParams` own order: the weekly rent, then each annual cost that was
    // stated, `HEAS_DRAW`'s "only where there is something to say" idiom — **all five TODAY's money
    // (user ruling, 2026-09-25), and — unlike the other three types above, fixed once at entry — rent
    // keeps rising every month of the tenancy, exactly as `SPEND_CHANGE.annualSpend` does.** `endDate`
    // is a date, not a money box.
    case 'RENT_OUT_HOME':
      return [
        [entry.params.weeklyRent, 'todaysMoney'],
        ...(entry.params.annualRates === undefined ? [] : [[entry.params.annualRates, 'todaysMoney'] as const]),
        ...(entry.params.annualInsurance === undefined ? [] : [[entry.params.annualInsurance, 'todaysMoney'] as const]),
        ...(entry.params.annualAgentFees === undefined ? [] : [[entry.params.annualAgentFees, 'todaysMoney'] as const]),
        ...(entry.params.annualRepairs === undefined ? [] : [[entry.params.annualRepairs, 'todaysMoney'] as const]),
      ];
    // `describeParams`' own order: the price, then the costs where stated — today's money.
    case 'DOWNSIZER_CONTRIBUTION':
      return [[entry.params.amount, 'todaysMoney']];
    case 'BUY_HOME':
      return entry.params.purchaseCosts === undefined
        ? [[entry.params.purchasePrice, 'todaysMoney']]
        : [[entry.params.purchasePrice, 'todaysMoney'], [entry.params.purchaseCosts, 'todaysMoney']];
    default:
      return [];
  }
};

const labelledStated = ([cents, stated, ownDate]: Stated, basis: MoneyBasis, entryDate: string): string => {
  const date = ownDate ?? entryDate;
  const asAt = basis.asAtDate.slice(0, 7);
  const month = (date.slice(0, 7) < asAt ? asAt : date.slice(0, 7)) as IsoMonth;
  if (stated === 'todaysWages') return `${formatCents(cents)} (${TODAYS_WAGES_TAG})`;
  if (stated === 'nominal') return labelledFigure(cents, basis, date.slice(0, 7) as IsoMonth);
  return basis.view === 'todaysDollars'
    ? `${formatCents(cents)} (${MONEY_VIEW_TAG.todaysDollars})${statedMark(cents, month)}`
    : labelledFigure(inflateStated(cents, basis.cpi, basis.asAtDate, month), basis, month);
};

/** Each money figure `entry` states, in `entrySummary`'s order: its cents, and it labelled as `listEntries` labels it on `basis`. */
export const labelledEntryFigures = (entry: Entry, basis: MoneyBasis): readonly { readonly cents: Cents; readonly labelled: string }[] =>
  statedFigures(entry).map((stated) => ({ cents: stated[0], labelled: labelledStated(stated, basis, entry.date) }));

/** The table's wording without the note, each figure relabelled; a figure count that disagrees is a fault in this build. */
const labelledWording = (entry: Entry, basis: MoneyBasis): string => {
  const { note: _note, ...withoutNote } = entry;
  const text = entrySummary(withoutNote as Entry);
  const figures = statedFigures(entry);
  const found = text.match(DOLLAR_FIGURE) ?? [];
  if (found.length !== figures.length) throw new RangeError(`a ${entry.type} entry's wording carries ${found.length} figures, and ${figures.length} were expected`);
  let index = 0;
  return text.replace(DOLLAR_FIGURE, () => labelledStated(figures[index++]!, basis, entry.date));
};

const noteOf = (plan: PlanFile, note: string): string => {
  const translated = anonymousRefusalText(plan.household, note);
  return carriesIdentity(plan.household, translated) ? NOTE_OMITTED : figuresOmitted(translated);
};

const ownerOf = (owner: EntryOwner): string => (owner === 'household' ? 'household' : personLabel(owner === 'personA' ? 0 : 1));

/** Each inherited id to the NEAREST ancestor Scenario that lists it, by id; the Scenario's own ids are absent. */
const inheritedFrom = (plan: PlanFile, scenario: Scenario): ReadonlyMap<string, string> => {
  const own = new Set(scenario.entryIds);
  const sources = new Map<string, string>();
  for (const link of scenarioAncestry(scenario, plan.scenarios)) {
    if (link.id === scenario.id) continue;
    for (const id of link.entryIds) if (!own.has(id)) sources.set(id, link.id);
  }
  return sources;
};

/** The Scenario's resolved entries, each as the table words it, or a named refusal. */
export const entriesOrRefusal = (plan: PlanFile, options: ToolOptions = {}) => {
  const walk = scenarioWalk(plan, options);
  if (isRefusal(walk)) return walk;
  const scenario = plan.scenarios.find(({ id }) => id === walk.scenarioId)!;
  const sources = inheritedFrom(plan, scenario);
  return {
    scenarioId: walk.scenarioId,
    basis: MONEY_VIEW_TAG[walk.basis.view],
    entries: walk.entries.map((entry) => {
      const wording = labelledWording(entry, walk.basis);
      return {
        id: entry.id,
        type: entry.type,
        owner: ownerOf(entry.owner),
        wording: entry.note === undefined || entry.note === '' ? wording : `${wording} — ${noteOf(plan, entry.note)}`,
        enabled: entry.enabled,
        inheritedFrom: sources.get(entry.id) ?? null,
      };
    }),
  };
};

export type ListedEntries = Exclude<ReturnType<typeof entriesOrRefusal>, ToolRefusal>;

/** `listEntries` as the connector returns it: serialised, through the identity and money guards. */
export const listEntries = (plan: PlanFile, options: ToolOptions = {}): string =>
  toolOutput(plan.household, entriesOrRefusal(plan, options), options.basis ?? DEFAULT_MONEY_VIEW);
