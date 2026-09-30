// plan_ai.md §5 and §13 microtask 5 — **`getMonth`: one month's whole breakdown, the source every
// citation points to.** Every line with its direction, every note, `appliedEntryIds`, the month's
// balances and each Person's age, all through the identity layer and every figure basis-labelled.
//
// **A month the walk does not hold is refused, never approximated.** A malformed month and one
// outside the forecast are two named refusals; neither is answered with the nearest month, because a
// citation to a month nobody asked for is a figure the AI would quote as the one it asked for.
//
// **PROVENANCE CARRIES NAMES, and it goes out translated or not at all.** Each caveat, determination
// and note is rewritten by the helper that wrote it (`anonymousProvenanceText`), the way the notes
// are. A sentence no helper wrote that still names a Person is replaced by `SOURCE_OMITTED` — only
// that sentence, and the output says so where it was. It is never passed through raw.
//
// **SO DOES MONEY, and the same rule holds for it.** A provenance sentence or a note's prose that
// carries a raw "N cents" figure (or a statute's untagged `$` figure) goes through `labelledProse`:
// rebuilt with labelled figures where an exported helper wrote it, and the figure alone replaced by
// `FIGURE_OMITTED` where none did. `toolOutput` refuses anything that slips past.
import { anonymousAges, anonymousDescription, anonymousNote, anonymousProvenanceText, carriesIdentity, personLabel, toolOutput } from './identity.js'; // `.js` is correct in a `.ts` file — see tsconfig.json
import { labelledFigure, labelledProse } from './basisLabelled.js';
import { DEFAULT_MONEY_VIEW, MONEY_VIEW_TAG } from '../../todaysDollars.js';
import { superAccountName } from '../../entryLabels.js';
import { ttrAccountName, ttrAccountsOpened } from '../../../core/projection.js';
import { isRefusal, scenarioWalk } from './scenarioWalk.js';
import type { Cents } from '../../../core/money.js';
import type { Household } from '../../../core/household.js';
import type { Entry, IsoMonth, LineAttribution, LineProvenance, Month, MonthNote, MonthProvenance } from '../../../core/plan.js';
import type { PlanFile } from '../../../core/parsePlan.js';
import type { MoneyBasis } from '../../todaysDollars.js';
import type { ToolOptions, ToolRefusal } from './scenarioWalk.js';

export const SOURCE_OMITTED = 'source omitted: carries a name';

/** The note fields that are numbers and NOT money. Every other number on a note is a figure and is labelled. */
const NOT_MONEY: { readonly [S in MonthNote['subject']]?: readonly Exclude<keyof Extract<MonthNote, { readonly subject: S }>, 'subject'>[] } = {
  'superannuation guarantee': ['chargePercentage'],
};

/**
 * **A super account goes out as the page names it, counted from 1** (`superAccountName`). The engine
 * holds a position in `superInterests`, counted from 0; a model handed that position would quote
 * "account 0" beside a page that says "super account 1". `null` (nothing credited) stays `null`. An
 * account the walk opened for a `TTR_START` with an amount goes out as `ttrAccountName` (RF-3).
 */
const ACCOUNT_FIELDS: Readonly<Record<string, string>> = { interestIndex: 'superAccount', interestIndexes: 'superAccounts', toInterestIndex: 'toSuperAccount' };
/** One Person's account name, by position. */
type AccountNamer = (position: number) => string;
const accountNamed = (value: unknown, name: AccountNamer): unknown =>
  typeof value === 'number' ? name(value) : Array.isArray(value) ? value.map((position: number) => name(position)) : value;

const WELL_FORMED_MONTH = /^\d{4}-(0[1-9]|1[0-2])$/;

/** A figure of this month, labelled — what a sentence's raw figure is rebuilt with. */
type Figure = (cents: Cents) => string;

const provenanceText = (household: Household, text: string, figure: Figure): string => {
  const translated = anonymousProvenanceText(household, text);
  return carriesIdentity(household, translated) ? SOURCE_OMITTED : labelledProse(translated, figure);
};

const lineProvenance = (household: Household, provenance: LineProvenance, figure: Figure): LineProvenance =>
  provenance.basis === 'legislated'
    ? {
        ...provenance,
        caveats: provenance.caveats.map((text) => provenanceText(household, text, figure)),
        determination: provenance.determination.map((text) => provenanceText(household, text, figure)),
      }
    : { ...provenance, note: provenanceText(household, provenance.note, figure) };

const lineAttribution = (household: Household, attribution: LineAttribution, figure: Figure): LineAttribution =>
  attribution.basis === 'entries' ? attribution : { ...attribution, note: provenanceText(household, attribution.note, figure) };

const monthProvenance = (household: Household, provenance: MonthProvenance, figure: Figure): MonthProvenance => ({
  ...provenance,
  caveats: provenance.caveats.map((text) => provenanceText(household, text, figure)),
});

/** A note: every number that is money labelled, and its prose rebuilt or its raw figures omitted (`labelledProse`). */
const labelledNote = (household: Household, note: MonthNote, figure: Figure, entries: readonly Entry[]): Record<string, unknown> => {
  const notMoney: readonly string[] = NOT_MONEY[note.subject] ?? [];
  const opened = 'person' in note ? ttrAccountsOpened(household, entries)[household.persons.findIndex((person) => person.name === note.person)] ?? [] : [];
  const name: AccountNamer = (position) => {
    const from = opened.find((each) => each.slot === position)?.from;
    return from === undefined ? superAccountName(position) : ttrAccountName(from);
  };
  return Object.fromEntries(
    Object.entries(anonymousNote(household, note)).map(([key, value]) =>
      Object.hasOwn(ACCOUNT_FIELDS, key)
        ? [ACCOUNT_FIELDS[key]!, accountNamed(value, name)]
        : [key, typeof value === 'number' && !notMoney.includes(key) ? figure(value as Cents) : typeof value === 'string' ? labelledProse(value, figure) : value],
    ),
  );
};

const monthDetail = (household: Household, scenarioId: string, month: Month, basis: MoneyBasis, entries: readonly Entry[]) => {
  const figure: Figure = (cents) => labelledFigure(cents, basis, month.month);
  return {
    scenarioId,
    month: month.month,
    basis: MONEY_VIEW_TAG[basis.view],
    ages: anonymousAges(household, month),
    appliedEntryIds: month.appliedEntryIds,
    lines: month.lines.map((line) => ({
      description: anonymousDescription(household, month.month, line.description),
      direction: line.direction,
      effect: line.effect,
      amount: figure(line.amount),
      provenance: lineProvenance(household, line.provenance, figure),
      attribution: lineAttribution(household, line.attribution, figure),
    })),
    notes: month.notes.map((note) => labelledNote(household, note, figure, entries)),
    incomeFromSuper: figure(month.incomeFromSuper),
    balances: {
      openingBalance: figure(month.openingBalance),
      closingBalance: figure(month.closingBalance),
      protectedAssets: figure(month.protectedAssets),
      assessableAssets: figure(month.assessableAssets),
      accessibleAssets: figure(month.accessibleAssets),
      superBalance: figure(month.superBalance),
      mortgageBalance: month.mortgageBalance === undefined ? 'no home loan in force this month' : figure(month.mortgageBalance),
      byPerson: month.assetsByPerson.map((assets, index) => ({
        person: personLabel(index),
        protectedAssets: figure(assets.protectedAssets),
        assessableAssets: figure(assets.assessableAssets),
        accessibleAssets: figure(assets.accessibleAssets),
      })),
    },
    provenance: monthProvenance(household, month.provenance, figure),
  };
};

export type MonthDetail = ReturnType<typeof monthDetail>;

/** One month of the Scenario's walk, or a named refusal. */
export const monthOrRefusal = (plan: PlanFile, month: string, options: ToolOptions = {}): MonthDetail | ToolRefusal => {
  if (!WELL_FORMED_MONTH.test(month)) return { refused: 'MALFORMED_MONTH', reason: 'a month is written YYYY-MM, for example 2031-07' };
  const walk = scenarioWalk(plan, options);
  if (isRefusal(walk)) return walk;
  const found = walk.months.find((each) => each.month === (month as IsoMonth));
  if (found === undefined) {
    return {
      refused: 'MONTH_OUTSIDE_FORECAST',
      reason: `the forecast runs from ${walk.months[0]?.month} to ${walk.months.at(-1)?.month}, and ${month} is not in it`,
    };
  }
  return monthDetail(plan.household, walk.scenarioId, found, walk.basis, walk.entries);
};

/** `getMonth` as the connector returns it: serialised, through the identity guard. */
export const getMonth = (plan: PlanFile, month: string, options: ToolOptions = {}): string =>
  toolOutput(plan.household, monthOrRefusal(plan, month, options), options.basis ?? DEFAULT_MONEY_VIEW);
