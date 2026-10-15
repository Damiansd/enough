// P18 — "Try changes": the slider sandbox's pure half. **A sandbox is an unsaved child Scenario**
// (TODO.md P18-1): the selected Scenario is its parent, each moved slider switches the parent's entry
// off through the child's `entryOverrides` and adds its own replacement to the child's `entryIds`,
// and the child's entries come after the parent's, so they win (`effectiveEntryIds`). No engine code
// and no second way of stating a change.
//
// The candidate is a whole `PlanFile` (P18-10): the plan, plus the replacement entries, plus the
// child. So `parsePlan`, `scenarioEntries` and the save door all take it unchanged, and Discard is
// dropping it. The input plan is never mutated.
//
// Which entry a slider moves (P18-10 ruling): the EARLIEST enabled entry of its kind per owner, as
// the parent resolves it through `scenarioEntries`. Later ones are left alone. The spend factor is
// the exception by design: it scales EVERY enabled `SPEND_CHANGE`, because a phased plan is never
// flattened (P10). A slider with nothing to move says why, and never invents an entry.
//
// No DOM, no clock, no randomness: ids and the creation date are handed in. Every claim here is an
// assertion in `test/app-sandbox.test.mjs`.
import { parsePlan } from '../core/parsePlan.js'; // `.js` is correct in a `.ts` file — see tsconfig.json
import { agesAt, mortgagePayoff, pensionOnlyAge, shortfallAge } from '../core/outcomes.js';
import { AGE_PENSION_LINE, firstDayOf, project } from '../core/projection.js';
import { hasReachedAgePensionAge } from '../core/household.js';
import type { AgeAtMonth } from '../core/outcomes.js';
import { RESOLUTION_CENTS } from '../core/sustainableSpend.js';
import type { SustainableSpend } from '../core/sustainableSpend.js';
import type { Cents } from '../core/money.js';
import type { Household } from '../core/household.js';
import type { Entry, EntryOwner, Month, Scenario } from '../core/plan.js';
import type { PlanFile } from '../core/parsePlan.js';
import { scenarioById, scenarioEntries } from './scenarioWalks.js';
import type { Projector } from './scenarioWalks.js';
import { formatDollars } from './displayMoney.js';
import { monthName } from './financialYearRows.js';

/** The child's name while it is unsaved, and the chart line's label. */
export const SANDBOX_NAME = 'Sandbox (unsaved)';

export const NO_RETIRE = 'No retirement date in this scenario';
export const NO_SPEND = 'No spending level in this scenario';
export const NO_REFINANCE = 'No refinance in this scenario';

/** Asked when the selected Scenario changes with sliders moved (P18-8). OK saves, Cancel discards. */
export const LEAVE_QUESTION =
  'Save these changes as a scenario, or discard?\n\nOK saves them as a new scenario. Cancel discards them.';

/** The spend factor's range (P18-2): 50% to 150%. */
export const SPEND_FACTOR_RANGE = [0.5, 1.5] as const;

/** The retirement slider's upper end: this age (P18-2). */
export const RETIRE_UP_TO_AGE = 75;

/** Where each slider sits. Offsets and factors, so "unmoved" is 0, 1 and `undefined`. */
export interface SandboxPositions {
  /** Months to move each owner's earliest `RETIRE`; a missing owner is unmoved. */
  readonly retireMonths: Readonly<Partial<Record<EntryOwner, number>>>;
  /** Every enabled `SPEND_CHANGE`'s `annualSpend` is multiplied by this. */
  readonly spendFactor: number;
  /** The earliest refinance's new `openingBalance`, or `undefined` for unmoved. */
  readonly refinanceBalance: Cents | undefined;
}

export const UNMOVED: SandboxPositions = Object.freeze({ retireMonths: Object.freeze({}), spendFactor: 1, refinanceBalance: undefined });

export interface RetireSlider {
  readonly owner: EntryOwner;
  readonly entry: Entry;
  /** Month offsets from the entry's own date: next month, and the month of age 75. Always includes 0. */
  readonly minMonths: number;
  readonly maxMonths: number;
}

export type SpendSlider =
  | { readonly kind: 'target'; readonly entries: readonly Entry[]; readonly firstYearSpend: Cents }
  | { readonly kind: 'none'; readonly reason: string };

export type RefinanceSlider =
  | { readonly kind: 'target'; readonly entry: Entry; readonly max: Cents }
  | { readonly kind: 'none'; readonly reason: string };

export interface SandboxSliders {
  /** One per owner holding an enabled `RETIRE`: household first, then personA, personB. */
  readonly retire: readonly RetireSlider[];
  /** Why there is no retirement slider; `undefined` when there is at least one. */
  readonly retireReason: string | undefined;
  readonly spend: SpendSlider;
  readonly refinance: RefinanceSlider;
}

const OWNER_ORDER: readonly EntryOwner[] = ['household', 'personA', 'personB'];

const monthIndex = (date: string): number => Number(date.slice(0, 4)) * 12 + Number(date.slice(5, 7)) - 1;

const daysIn = (year: number, month: number): number => new Date(Date.UTC(year, month, 0)).getUTCDate();

/** `date` moved by whole months, keeping the day where the month has it (31 Jan + 1 → 28/29 Feb). */
export const shiftedDate = (date: string, months: number): string => {
  const index = monthIndex(date) + months;
  const year = Math.floor(index / 12);
  const month = index - year * 12 + 1;
  const day = Math.min(Number(date.slice(8, 10)), daysIn(year, month));
  return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
};

/** Age at `date` in whole years and months: "63y 0m". */
export const ageYearsMonths = (dateOfBirth: string, date: string): string => {
  const total = monthIndex(date) - monthIndex(dateOfBirth) - (date.slice(8, 10) < dateOfBirth.slice(8, 10) ? 1 : 0);
  return `${Math.floor(total / 12)}y ${total % 12}m`;
};

/**
 * The retirement slider's label: every Person's age at a household `RETIRE`'s date, since a couple is
 * never reduced to one age (P7, P18-10) — "Alex 63y 0m · Sam 61y 0m" — or the owner's alone.
 */
export const retireAgeLabel = (household: Household, owner: EntryOwner, date: string): string => {
  const persons = owner === 'household'
    ? household.persons
    : household.persons.filter((_person, index) => OWNER_ORDER[index + 1] === owner);
  return persons.map((person) => `${person.name} ${ageYearsMonths(person.dateOfBirth, date)}`).join(' · ');
};

/** The first enabled entry of `type` per owner, earliest date first; a tie goes to the first listed. */
const earliestByOwner = (entries: readonly Entry[], type: Entry['type']): Map<EntryOwner, Entry> => {
  const earliest = new Map<EntryOwner, Entry>();
  for (const entry of entries) {
    if (entry.type !== type || !entry.enabled) continue;
    const held = earliest.get(entry.owner);
    if (held === undefined || entry.date < held.date) earliest.set(entry.owner, entry);
  }
  return earliest;
};

/** The spending level standing at `asAtDate`'s month, or the earliest one where none stands yet. */
const firstYearLevel = (spends: readonly Entry[], asAtDate: string): Entry => {
  let held: Entry | undefined;
  for (const entry of spends) {
    if (monthIndex(entry.date) > monthIndex(asAtDate)) continue;
    if (held === undefined || entry.date >= held.date) held = entry;
  }
  return held ?? [...spends].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0))[0]!;
};

/** What each slider would move in the parent, and its range, or why it has nothing to move. */
export const sandboxSliders = (plan: PlanFile, parentId: string): SandboxSliders => {
  const entries = scenarioEntries(plan, scenarioById(plan, parentId));
  const asAt = plan.settings.asAtDate;
  const retires = earliestByOwner(entries, 'RETIRE');
  const retire = OWNER_ORDER.flatMap((owner): RetireSlider[] => {
    const entry = retires.get(owner);
    if (entry === undefined) return [];
    const persons = owner === 'household'
      ? plan.household.persons
      : plan.household.persons.filter((_person, index) => OWNER_ORDER[index + 1] === owner);
    // A household RETIRE stops at the first Person to reach 75.
    const lastIndex = Math.min(...persons.map((person) => monthIndex(person.dateOfBirth) + RETIRE_UP_TO_AGE * 12));
    const entryIndex = monthIndex(entry.date);
    return [{
      owner,
      entry,
      minMonths: Math.min(0, monthIndex(asAt) + 1 - entryIndex),
      maxMonths: Math.max(0, lastIndex - entryIndex),
    }];
  });
  const spends = entries.filter((entry) => entry.type === 'SPEND_CHANGE' && entry.enabled);
  const spend: SpendSlider = spends.length === 0
    ? { kind: 'none', reason: NO_SPEND }
    : { kind: 'target', entries: spends, firstYearSpend: (firstYearLevel(spends, asAt).params as { annualSpend: Cents }).annualSpend };
  const refinanceEntry = [...entries]
    .filter((entry) => entry.type === 'MORTGAGE_REFINANCE' && entry.enabled)
    .reduce<Entry | undefined>((held, entry) => (held === undefined || entry.date < held.date ? entry : held), undefined);
  const refinance: RefinanceSlider = refinanceEntry?.type === 'MORTGAGE_REFINANCE'
    ? { kind: 'target', entry: refinanceEntry, max: (Math.round(refinanceEntry.params.openingBalance / 100) * 200) as Cents }
    : { kind: 'none', reason: NO_REFINANCE };
  return Object.freeze({ retire, retireReason: retire.length === 0 ? NO_RETIRE : undefined, spend, refinance });
};

/** Whether any slider is away from where it started — what decides whether leaving asks first. */
export const positionsMoved = (positions: SandboxPositions): boolean =>
  positions.spendFactor !== 1 ||
  positions.refinanceBalance !== undefined ||
  Object.values(positions.retireMonths).some((months) => months !== undefined && months !== 0);

/** The ids and date a candidate's new records carry. Handed in, so this module stays pure. */
export interface SandboxIds {
  readonly scenarioId: string;
  /** A fresh id for the replacement of the parent's entry `replacing`. */
  readonly entryId: (replacing: string) => string;
  readonly createdAt: string;
}

export type SandboxCandidate =
  | { readonly kind: 'candidate'; readonly plan: PlanFile; readonly sandboxId: string; readonly parentId: string }
  | { readonly kind: 'refused'; readonly reason: string };

const refusal = (error: unknown): { readonly kind: 'refused'; readonly reason: string } =>
  Object.freeze({ kind: 'refused', reason: error instanceof Error ? error.message : String(error) });

/**
 * **The candidate plan: the plan, the replacement entries, and one child Scenario**, or the refusal by
 * name when `parsePlan` will not take it (a refinance moved to $0, say). Only moved sliders write
 * anything. The replacement is the parent's entry with a new id, date or figure; the original stays
 * in the pool, switched off in the child only.
 */
export const sandboxCandidate = (
  plan: PlanFile,
  parentId: string,
  positions: SandboxPositions,
  ids: SandboxIds,
): SandboxCandidate => {
  const sliders = sandboxSliders(plan, parentId);
  const replacements: Entry[] = [];
  const overrides: Record<string, boolean> = {};
  const replace = (original: Entry, changed: Partial<Entry>): void => {
    const { origin: _origin, ...kept } = original;
    replacements.push({ ...kept, ...changed, id: ids.entryId(original.id), createdAt: ids.createdAt } as Entry);
    overrides[original.id] = false;
  };
  for (const slider of sliders.retire) {
    const months = positions.retireMonths[slider.owner] ?? 0;
    if (months !== 0) replace(slider.entry, { date: shiftedDate(slider.entry.date, months) } as Partial<Entry>);
  }
  if (positions.spendFactor !== 1 && sliders.spend.kind === 'target') {
    for (const entry of sliders.spend.entries) {
      if (entry.type !== 'SPEND_CHANGE') continue;
      replace(entry, { params: { annualSpend: Math.round(entry.params.annualSpend * positions.spendFactor) as Cents } } as Partial<Entry>);
    }
  }
  if (positions.refinanceBalance !== undefined && sliders.refinance.kind === 'target') {
    const entry = sliders.refinance.entry;
    if (entry.type === 'MORTGAGE_REFINANCE' && entry.params.openingBalance !== positions.refinanceBalance) {
      replace(entry, { params: { ...entry.params, openingBalance: positions.refinanceBalance } } as Partial<Entry>);
    }
  }
  const child: Scenario = {
    id: ids.scenarioId,
    name: SANDBOX_NAME,
    parentId,
    entryIds: replacements.map((entry) => entry.id),
    ...(Object.keys(overrides).length === 0 ? {} : { entryOverrides: overrides }),
  };
  try {
    const parsed = parsePlan({
      ...plan,
      entries: [...plan.entries, ...replacements],
      scenarios: [...plan.scenarios, child],
    });
    return Object.freeze({ kind: 'candidate', plan: parsed, sandboxId: ids.scenarioId, parentId });
  } catch (error) {
    return refusal(error);
  }
};

export type SandboxWalk =
  | { readonly kind: 'walked'; readonly months: readonly Month[] }
  | { readonly kind: 'refused'; readonly reason: string };

/** The sandbox's own walk — the only projection a slider move costs — or the engine's refusal by name. */
export const sandboxWalk = (
  candidate: Extract<SandboxCandidate, { kind: 'candidate' }>,
  projector: Projector = project,
): SandboxWalk => {
  const { plan } = candidate;
  try {
    const months = projector(plan.settings, plan.household, scenarioEntries(plan, scenarioById(plan, candidate.sandboxId)));
    return Object.freeze({ kind: 'walked', months });
  } catch (error) {
    return refusal(error);
  }
};

/**
 * **What Save hands the save door**: the candidate with the child given `name` and made the selected
 * Scenario. It stays a live child of the parent (ADR-0002) holding only the slider entries and
 * switch-offs. A blank name is refused, `scenarioList.ts`'s rule.
 */
export const sandboxSaved = (candidate: Extract<SandboxCandidate, { kind: 'candidate' }>, name: string): PlanFile => {
  if (name.trim() === '') throw new RangeError('a scenario needs a name — it is how the list is read');
  return {
    ...candidate.plan,
    scenarios: candidate.plan.scenarios.map((scenario) =>
      scenario.id === candidate.sandboxId ? { ...scenario, name: name.trim() } : scenario),
    activeScenarioId: candidate.sandboxId,
  };
};

/**
 * **P18-9 — which sliders lost their target after a parent edit.** A slider whose entry is no longer
 * the one it was moving is reset and named, so its change is dropped rather than applied to a
 * different entry.
 */
export const reconcilePositions = (
  before: SandboxSliders,
  after: SandboxSliders,
  positions: SandboxPositions,
): { readonly positions: SandboxPositions; readonly notices: readonly string[] } => {
  const notices: string[] = [];
  const retireMonths: Partial<Record<EntryOwner, number>> = {};
  for (const [owner, months] of Object.entries(positions.retireMonths) as [EntryOwner, number | undefined][]) {
    if (months === undefined || months === 0) continue;
    const was = before.retire.find((slider) => slider.owner === owner)?.entry.id;
    const now = after.retire.find((slider) => slider.owner === owner)?.entry.id;
    if (was !== undefined && was === now) retireMonths[owner] = months;
    else notices.push('The retirement date this slider moved is gone from the scenario, so its change was dropped.');
  }
  let refinanceBalance = positions.refinanceBalance;
  if (refinanceBalance !== undefined) {
    const was = before.refinance.kind === 'target' ? before.refinance.entry.id : undefined;
    const now = after.refinance.kind === 'target' ? after.refinance.entry.id : undefined;
    if (was === undefined || was !== now) {
      refinanceBalance = undefined;
      notices.push('The refinance this slider moved is gone from the scenario, so its change was dropped.');
    }
  }
  let spendFactor = positions.spendFactor;
  if (spendFactor !== 1 && after.spend.kind === 'none') {
    spendFactor = 1;
    notices.push('The scenario no longer has a spending level, so the spend change was dropped.');
  }
  return Object.freeze({ positions: Object.freeze({ retireMonths: Object.freeze(retireMonths), spendFactor, refinanceBalance }), notices: Object.freeze(notices) });
};

// --- The four figures: Selected | Sandbox | difference (P18-4) ------------------------------------

export interface FigureRow {
  readonly label: string;
  readonly selected: string;
  /** Blank when the sandbox was refused: the last good figure is never left standing (P18-6). */
  readonly sandbox: string;
  readonly difference: string;
}

const atText = (at: AgeAtMonth): string =>
  `${monthName(at.month)} ${at.month.slice(0, 4)} (${at.ages.map((age) => `${age.name} ${age.age}`).join(', ')})`;

const plural = (count: number, unit: string): string => `${count} ${unit}${count === 1 ? '' : 's'}`;

/**
 * A gap between two dated figures in plain words: "2 years 3 months later", "5 months earlier". Later is
 * the sandbox's date minus the selected one, whatever the row: the reader judges good or bad.
 */
export const monthsText = (months: number): string => {
  if (months === 0) return 'same';
  const size = Math.abs(months);
  const years = Math.floor(size / 12);
  const parts = [...(years === 0 ? [] : [plural(years, 'year')]), ...(size % 12 === 0 ? [] : [plural(size % 12, 'month')])];
  return `${parts.join(' ')} ${months > 0 ? 'later' : 'earlier'}`;
};

/** One dated figure read off a walk: shown text, and the month it falls in (for the difference). */
interface Dated {
  readonly text: string;
  readonly month: string | undefined;
}

/** What to say when only ONE side has a date: it now happens (sandbox dated) or no longer does. */
interface OneSided {
  readonly nowDated: string;
  readonly noLongerDated: string;
}

const CANT = 'Can’t be worked out';

const difference = (selected: Dated, sandbox: Dated, words: OneSided): string => {
  if (selected.month !== undefined && sandbox.month !== undefined) {
    return monthsText(monthIndex(sandbox.month) - monthIndex(selected.month));
  }
  if (selected.text === sandbox.text) return 'same';
  // A side that cannot be read gives nothing to compare, and a guess would be a figure we don't have.
  if (selected.text === CANT || sandbox.text === CANT) return '';
  if (sandbox.month !== undefined) return words.nowDated;
  if (selected.month !== undefined) return words.noLongerDated;
  return '';
};

type Reader = (months: readonly Month[]) => Dated;
type RowSpec = readonly [label: string, read: Reader, words: OneSided];

const readers = (household: Household, series: PlanFile['settings']['economicSeries']['agePension']): readonly RowSpec[] => [
  ['Money lasts until', (months) => {
    const answer = shortfallAge(months, household);
    return answer.firstShortfall === undefined
      ? { text: 'The whole way', month: undefined }
      : { text: atText(answer.firstShortfall), month: answer.firstShortfall.month };
  }, { nowDated: 'now runs out', noLongerDated: 'now lasts the whole way' }],
  ['Living on the Age Pension alone from', (months) => {
    try {
      const answer = pensionOnlyAge(months, household, series);
      return answer.firstPensionOnly === undefined
        ? { text: 'Never', month: undefined }
        : { text: atText(answer.firstPensionOnly), month: answer.firstPensionOnly.month };
    } catch {
      return { text: CANT, month: undefined };
    }
  }, { nowDated: 'now happens', noLongerDated: 'no longer happens' }],
  ['Mortgage paid off', (months) => {
    const answer = mortgagePayoff(months, household);
    if (answer.outcome === 'noLoan') return { text: 'No home loan', month: undefined };
    if (answer.clearForGood === undefined) return { text: `Still owing ${formatDollars(answer.owedAtHorizon ?? 0)}`, month: undefined };
    return { text: atText(answer.clearForGood), month: answer.clearForGood.month };
  }, { nowDated: 'now paid off', noLongerDated: 'no longer paid off' }],
];

/**
 * **"Qualify for Pension from Pension age?"** (user request, 2026-10-15). Pension age is the first month
 * any living Person is Age Pension age on its first day — the engine's own test — or the walk's first
 * month if someone already is. "Yes" when the walk pays an `Age Pension` line in that month; otherwise
 * "No", with the month it is first paid, if ever. The line is the HOUSEHOLD's, so in a couple this
 * answers for whoever reaches pension age first: a payment cannot be attributed to one Person.
 */
interface Qualifies {
  readonly text: string;
  readonly qualifies: boolean | undefined;
  readonly firstPaid: string | undefined;
}

const qualifiesAtPensionAge = (months: readonly Month[], household: Household): Qualifies => {
  const paid = (month: Month): boolean => month.lines.some((line) => line.description === AGE_PENSION_LINE);
  const start = months.findIndex((month) =>
    household.persons.some((person, index) => !(month.died ?? []).includes(index) && hasReachedAgePensionAge(person, firstDayOf(month.month))));
  if (start === -1) return { text: 'Nobody reaches pension age', qualifies: undefined, firstPaid: undefined };
  const at = months[start] as Month;
  if (paid(at)) return { text: `Yes — ${atText(agesAt(household, at))}`, qualifies: true, firstPaid: at.month };
  const later = months.slice(start).find(paid);
  return later === undefined
    ? { text: 'No — never paid', qualifies: false, firstPaid: undefined }
    : { text: `No — first paid ${atText(agesAt(household, later))}`, qualifies: false, firstPaid: later.month };
};

const qualifiesRow = (household: Household, selected: readonly Month[], sandbox: readonly Month[] | undefined): FigureRow => {
  const left = qualifiesAtPensionAge(selected, household);
  const right = sandbox === undefined ? undefined : qualifiesAtPensionAge(sandbox, household);
  const gap = (): string => {
    if (right === undefined) return '';
    if (left.qualifies !== right.qualifies) return right.qualifies === true ? 'now qualifies' : 'no longer qualifies';
    if (left.firstPaid !== undefined && right.firstPaid !== undefined) {
      const moved = monthIndex(right.firstPaid) - monthIndex(left.firstPaid);
      return moved === 0 ? 'same' : `first paid ${monthsText(moved)}`;
    }
    if (left.firstPaid === right.firstPaid) return 'same';
    return right.firstPaid === undefined ? 'no longer paid' : 'now paid';
  };
  return Object.freeze({ label: 'Qualify for Pension from Pension age?', selected: left.text, sandbox: right?.text ?? '', difference: gap() });
};

/**
 * The three live figures, Selected against Sandbox. `sandbox` is `undefined` when it was refused, and
 * then its column and the difference are blank.
 */
export const sandboxFigures = (
  household: Household,
  series: PlanFile['settings']['economicSeries']['agePension'],
  selected: readonly Month[],
  sandbox: readonly Month[] | undefined,
): readonly FigureRow[] =>
  readers(household, series).flatMap(([label, read, words]) => {
    const left = read(selected);
    const right = sandbox === undefined ? undefined : read(sandbox);
    const row: FigureRow = Object.freeze({
      label,
      selected: left.text,
      sandbox: right?.text ?? '',
      difference: right === undefined ? '' : difference(left, right, words),
    });
    // Asked beside the other Age Pension row, ahead of it: first payment before pension-only.
    return label === 'Living on the Age Pension alone from' ? [qualifiesRow(household, selected, sandbox), row] : [row];
  });

export const UPDATING = 'updating…';

/** A sustainable spend search result, a search still running, or nothing (refused). */
export type SustainableCell = SustainableSpend | 'updating' | undefined;

const sustainableText = (cell: SustainableCell): string => {
  if (cell === undefined) return '';
  if (cell === 'updating') return UPDATING;
  return cell.sustainableAnnualSpend === undefined ? 'Can’t be worked out' : `${formatDollars(cell.sustainableAnnualSpend)} a year`;
};

/** The fourth figure, worked out after dragging stops (P18-4). Whole dollars. */
export const sustainableRow = (selected: SustainableCell, sandbox: SustainableCell): FigureRow => {
  const left = typeof selected === 'object' ? selected.sustainableAnnualSpend : undefined;
  const right = typeof sandbox === 'object' ? sandbox.sustainableAnnualSpend : undefined;
  const gap = left !== undefined && right !== undefined ? right - left : undefined;
  return Object.freeze({
    label: 'Sustainable spend',
    selected: sustainableText(selected),
    sandbox: sustainableText(sandbox),
    difference:
      sandbox === undefined ? ''
      : sandbox === 'updating' || selected === 'updating' ? UPDATING
      : gap === undefined ? ''
      // Within the search's own resolution the two answers cannot be told apart: "−$2" would be noise.
      : Math.abs(gap) <= RESOLUTION_CENTS ? 'same'
      : `${gap > 0 ? '+' : '−'}${formatDollars(Math.abs(gap))}`,
  });
};

/** The spend slider's label: the resulting first-year spend, whole dollars. */
export const spendLabel = (slider: SpendSlider, factor: number): string =>
  slider.kind === 'none'
    ? slider.reason
    : `${Math.round(factor * 100)}% — ${formatDollars(Math.round(slider.firstYearSpend * factor))} a year in the first year`;
