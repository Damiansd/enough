// P16-1 — **the "Life stages" strip: one row per Person, Working / Retired / In aged care, derived
// from the walk plus the entries and NOTHING NEW IN THE PLAN FILE.** No DOM, no Chart.js, no canvas:
// this builds plain numbers and plain frozen objects, exactly as `monthsToSeries.ts` does, so it is
// testable with `node:test` and no browser. The renderer is `renderLifeStages.ts`.
//
// **THE THREE PHASES AND WHAT MOVES BETWEEN THEM.** `RETIRE` ends Working and begins Retired;
// `ENTER_CARE` ends whichever of the two was running and begins In aged care; `DEATH` ends the row.
// A `WORK_PATTERN_CHANGE` moves nothing here, on `plan.ts`'s own ruling: dropping to zero days is "a
// pattern, not a retirement", so a Person who drops to a nominal day a week without a `RETIRE` entry
// stays Working. The one exception is going back to work after a `RETIRE` (retire flow S3): the row
// turns Working again at "Back at work", and a later `RETIRE` marks "Retires again". Both are read
// off `workSpells`, the expression the walk pays the salary by.
//
// **A PERSON WITH NO `RETIRE` ENTRY STAYS WORKING TO THE HORIZON (TODO.md's own words).** Not because
// they are still working in fact — this file has no opinion on that — but because a `RETIRE` entry is
// the only fact that ends the phase, and there is none to read.
//
// **THE TWO EVENTS ARE READ IN CHRONOLOGICAL ORDER, NEVER ASSUMED "RETIRE THEN CARE".** A Person can
// enter care before a stated `RETIRE` date (early-onset illness while still notionally employed), and
// the transitions are sorted by the month each one takes effect rather than hard-coded in the usual
// order, so a `phase-segment` never overlaps another and a boundary is never silently dropped because
// it landed "out of turn".
//
// **A DEATH ENDS THE ROW, AND NOTHING PAST IT IS DRAWN.** `Month.died` (P12-1) already tells the walk
// who is gone from a given month; this reads it once per Person to find the FIRST such month and
// clips every segment and boundary to before it. A transition dated in or after the month of death is
// impossible in a walk `project()` produced (`DEATH`'s own refusal in `plan.ts`), but this file does
// not rely on that refusal having run — it clips defensively rather than trusting an upstream door.
//
// **POSITIONS ARE MONTH INDEXES INTO THE WALK, NEVER DATES.** The walk is one tick per month, so a
// month's fractional position along the whole timeline is `index / totalMonths` — exactly what
// produced the mock-up's own percentages (a 47-year, 564-month walk with an 8-year-in boundary sits
// at 96/564 = 17.02%, the mock's own figure). The renderer turns indexes into `%` and this file never
// touches a percentage, so a change to the box's own width moves nothing here.
import { ageAt } from '../core/household.js'; // `.js` is correct in a `.ts` file — see tsconfig.json
import { firstDayOf, monthOf } from '../core/projection.js';
import { workSpells } from '../core/retirementPension.js';
import type { Household } from '../core/household.js';
import type { Entry, IsoMonth, Month } from '../core/plan.js';

export type LifeStagePhase = 'working' | 'retired' | 'care';

/** What each phase is CALLED on the strip and in its legend — plain words, no engine terms. */
export const PHASE_LABELS: Readonly<Record<LifeStagePhase, string>> = Object.freeze({
  working: 'Working',
  retired: 'Retired',
  care: 'In aged care',
});

/** Every phase, in the order the legend reads. */
export const PHASE_ORDER: readonly LifeStagePhase[] = Object.freeze(['working', 'retired', 'care']);

export interface LifeStageSegment {
  readonly phase: LifeStagePhase;
  /** Inclusive, a month index into the walk handed to `lifeStagesTimeline`. */
  readonly fromIndex: number;
  /** Exclusive — may equal `totalMonths` for a segment that runs to the horizon. */
  readonly toIndex: number;
}

export interface LifeStageBoundary {
  /** The month index the boundary falls at — the FIRST month of the phase it introduces. */
  readonly atIndex: number;
  /** `Retires 2034 · 63`, `Aged care 2056 · 85`, `Died 2056 · 85` — year, then age, at that month. */
  readonly label: string;
}

export interface PersonLifeStages {
  readonly name: string;
  /** Never empty and never overlapping; ascending, and the last one's `toIndex` is where the row ends. */
  readonly segments: readonly LifeStageSegment[];
  /** One per phase change this Person's row actually shows; `Died` is NOT one of these — see `endLabel`. */
  readonly boundaries: readonly LifeStageBoundary[];
  /** The month index the row ends at, if it ends in death; `undefined` if the row reaches the horizon. */
  readonly diedAtIndex: number | undefined;
  /** `Died 2056 · 85` — `undefined` unless this Person's row ends in death. */
  readonly endLabel: string | undefined;
}

export interface YearTick {
  readonly atIndex: number;
  readonly year: number;
}

export interface LifeStagesTimeline {
  readonly persons: readonly PersonLifeStages[];
  /** The walk's own length — every index above is `0..totalMonths` inclusive of the upper bound. */
  readonly totalMonths: number;
  readonly yearTicks: readonly YearTick[];
}

const yearOf = (month: string): number => Number(month.slice(0, 4));

/** `ENTER_CARE`'s own door rule (`parsePlan`'s `checkEnterCares`): `personA`/`personB` only, never `household`. */
const careReaches = (owner: Entry['owner'], index: number): boolean =>
  owner === 'personA' ? index === 0 : owner === 'personB' ? index === 1 : false;

/**
 * **Exported for `financialSituationPhases.ts` to reuse (P16-2)** — the one place this walk is read
 * for "which month did each Person's `ENTER_CARE` first govern", so the aged-care headline and this
 * strip cannot name two different months for the same Person.
 *
 * `entries` must be the Scenario's own resolved entries — `retirementMonths`'s own requirement,
 * restated here because this reads `Month.appliedEntryIds` the identical way.
 */
export const enterCareMonths = (
  months: readonly Month[],
  household: Household,
  entries: readonly Entry[],
): readonly (IsoMonth | undefined)[] => {
  const cares = new Map<string, Entry>();
  for (const entry of entries) {
    if (entry.enabled && entry.type === 'ENTER_CARE') cares.set(entry.id, entry);
  }
  const found: (IsoMonth | undefined)[] = household.persons.map(() => undefined);
  for (const month of months) {
    for (const id of month.appliedEntryIds) {
      const entry = cares.get(id);
      if (entry === undefined) continue;
      household.persons.forEach((_person, index) => {
        if (careReaches(entry.owner, index) && found[index] === undefined) found[index] = month.month;
      });
    }
  }
  return Object.freeze(found);
};

/** The first month `Month.died` (P12-1) names each Person, one per `household.persons` index. */
const deathMonths = (months: readonly Month[], household: Household): readonly (IsoMonth | undefined)[] =>
  Object.freeze(household.persons.map((_person, index) => months.find((month) => month.died?.includes(index))?.month));

/**
 * **The light year axis.** The walk's own first and last calendar years, always ticked, plus every
 * round year at a step chosen to keep the axis readable over the span — never July-anchored
 * (`chartConfig.ts`'s `xAxisTickPlan` is that, for the wealth chart's own reasons) because this axis
 * is read as "roughly when", not against the FY the engine is driven by.
 */
const yearTicksFor = (months: readonly Month[]): readonly YearTick[] => {
  if (months.length === 0) return Object.freeze([]);
  const startYear = yearOf(months[0]!.month);
  const endYear = yearOf(months[months.length - 1]!.month);
  const span = endYear - startYear;
  const step = span > 20 ? 10 : span > 8 ? 5 : span > 3 ? 2 : 1;
  const seen = new Set<number>();
  const ticks: YearTick[] = [];
  const addTick = (year: number, index: number): void => {
    if (seen.has(year) || index === -1) return;
    seen.add(year);
    ticks.push({ atIndex: index, year });
  };
  // The start and the end are always ticked, at the walk's own first and LAST index — never the
  // first month `findIndex` happens to match, which for the end year is only right when the walk
  // ends in January of it. The round-step years between the two are found by their own first month.
  addTick(startYear, 0);
  for (let year = startYear + step; year < endYear; year += step) {
    addTick(year, months.findIndex((month) => yearOf(month.month) === year));
  }
  addTick(endYear, months.length - 1);
  return Object.freeze(ticks);
};

interface Transition {
  readonly index: number;
  readonly phase: LifeStagePhase;
  readonly label: string;
}

/**
 * **THE ANSWER.** `months` is the walk, `household` the one it was run for, and `entries` the
 * Scenario's own resolved entries (`scenarioWalks.ts`) — never the pool, `retirementMonths`'s own
 * requirement.
 */
export const lifeStagesTimeline = (
  months: readonly Month[],
  household: Household,
  entries: readonly Entry[],
): LifeStagesTimeline => {
  if (months.length === 0) {
    return Object.freeze({ persons: Object.freeze([]), totalMonths: 0, yearTicks: Object.freeze([]) });
  }
  const totalMonths = months.length;
  const indexOf = new Map(months.map((month, index) => [month.month as string, index]));
  const spells = workSpells(household, entries);
  const cares = enterCareMonths(months, household, entries);
  const deaths = deathMonths(months, household);

  const persons = household.persons.map((person, index) => {
    const careMonth = cares[index];
    const careIndex = careMonth === undefined ? undefined : indexOf.get(careMonth);
    const deathMonth = deaths[index];
    const deathIndex = deathMonth === undefined ? undefined : indexOf.get(deathMonth);
    const endIndex = deathIndex ?? totalMonths;

    const transitions: Transition[] = [];
    // Each stop and return from the month it takes effect; one dated before the walk counts from its
    // first month, and of two that land in the same month only the later is drawn.
    const changes = (spells[index] ?? []).map((change, at) => {
      const month = monthOf(change.date) < months[0]!.month ? months[0]!.month : monthOf(change.date);
      return { change, at, month, index: indexOf.get(month) };
    });
    changes.forEach(({ change, at, month, index: changeIndex }, position) => {
      if (changeIndex === undefined || changes[position + 1]?.index === changeIndex) return;
      const when = `${yearOf(month)} · ${ageAt(person.dateOfBirth, firstDayOf(month))}`;
      transitions.push(
        change.kind === 'returned'
          ? { index: changeIndex, phase: 'working', label: `Back at work ${when}` }
          : { index: changeIndex, phase: 'retired', label: `${at === 0 ? 'Retires' : 'Retires again'} ${when}` },
      );
    });
    if (careIndex !== undefined) {
      transitions.push({
        index: careIndex,
        phase: 'care',
        label: `Aged care ${yearOf(careMonth!)} · ${ageAt(person.dateOfBirth, firstDayOf(careMonth!))}`,
      });
    }
    // Chronological, never the order the two `if`s above happen to run in — a Person can enter care
    // before a stated `RETIRE` date, and a boundary dated earlier must be drawn earlier.
    transitions.sort((a, b) => a.index - b.index);

    const segments: LifeStageSegment[] = [];
    const boundaries: LifeStageBoundary[] = [];
    let cursor = 0;
    let phase: LifeStagePhase = 'working';
    for (const transition of transitions) {
      // A transition at or after death is not drawn — DEATH's own refusal in `plan.ts` means a walk
      // never actually produces one, but this reads defensively rather than trusting that door.
      // One strictly BEFORE the running cursor (two transitions this walk somehow dated out of order
      // relative to each other after sorting cannot occur, but a transition at the SAME month as the
      // last one is real — RETIRE and ENTER_CARE dated together — and still changes the phase without
      // opening a zero-width segment).
      // One that does not change the phase is not drawn either: a stop and a return both dated
      // before the plan leave the row Working from its first month, with no label.
      if (transition.index < cursor || transition.index >= endIndex || transition.phase === phase) continue;
      if (transition.index > cursor) segments.push({ phase, fromIndex: cursor, toIndex: transition.index });
      boundaries.push({ atIndex: transition.index, label: transition.label });
      cursor = transition.index;
      phase = transition.phase;
      // **`ENTER_CARE` IS PERMANENT (`plan.ts`'s own word), so nothing after it changes the phase
      // again.** A `RETIRE` entry dated after a Person has already entered care states a fact the
      // walk still applies (for tax and the means test), but it is not a life stage this strip draws
      // a second boundary for — a Person does not leave aged care to become merely "Retired".
      if (phase === 'care') break;
    }
    if (endIndex > cursor) segments.push({ phase, fromIndex: cursor, toIndex: endIndex });

    const endLabel =
      deathIndex === undefined
        ? undefined
        : `Died ${yearOf(deathMonth!)} · ${ageAt(person.dateOfBirth, firstDayOf(deathMonth!))}`;

    return Object.freeze({
      name: person.name,
      segments: Object.freeze(segments),
      boundaries: Object.freeze(boundaries),
      diedAtIndex: deathIndex,
      endLabel,
    });
  });

  return Object.freeze({
    persons: Object.freeze(persons),
    totalMonths,
    yearTicks: yearTicksFor(months),
  });
};
