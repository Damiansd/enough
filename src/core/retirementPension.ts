// The switch at retirement (user ruling, 2026-09-23).
//
// When a `RETIRE` entry takes a Person out of work at or past Preservation Age, their accumulation
// super becomes a retirement-phase account-based pension on the RETIRE date, and a transition to
// retirement pension converts that day (the earliest of its early-conversion day, the RETIRE day and
// the 65th birthday — RETIRE is treated as the s 307-80(3)(b)(ii) notification, which overrides
// register R5; the register records it). An account can be kept out with
// `SuperInterest.keepInAccumulationAtRetirement`.
//
// This module says WHO switches, WHICH accounts and ON WHAT DAY, off the plan alone. It is the one
// expression of that fact: `project()` reads it, and so does the notice on the page. The one part it
// cannot answer is the transfer balance cap, because that needs the balance on the day, which only
// the walk has; `PUBLISHED_TRANSFER_BALANCE_CAP` is exported for the walk to test against.
import { conditionOfRelease } from './conditionOfRelease.js'; // `.js` is correct in a `.ts` file — see tsconfig.json
import type { Household } from './household.js';
import type { Entry } from './plan.js';
import { SUPERANNUATION } from '../data/assumptions/super.js';
import type { Cents } from './money.js';
import type { IsoDate } from '../data/assumptions/types.js';

/**
 * The general transfer balance cap as published for FY2026-27, $2,100,000. The cap is indexed and
 * never falls, so a balance at or under this figure is under the cap in every later year too. A
 * balance above it might still fit under a later, indexed cap; the walk does not convert it
 * (splitting an account between the two phases is not modelled), which is the direction that keeps
 * the Age Pension assets test from being flattered.
 */
export const PUBLISHED_TRANSFER_BALANCE_CAP: Cents = SUPERANNUATION.caps.generalTransferBalance.value;

/** What happens to one Person's super at retirement, decided from the plan. */
export type RetirementSwitch =
  | { readonly kind: 'notRetiring' }
  /** Every account is kept out, or already a pension: nothing to switch. */
  | { readonly kind: 'nothingToSwitch'; readonly retireDay: IsoDate }
  /** The RETIRE entry is dated before the plan starts: the phase stated as at the plan's date governs. */
  | { readonly kind: 'retiredBeforeThePlan'; readonly retireDay: IsoDate }
  /** Retiring before 60 releases nothing, so nothing switches. */
  | { readonly kind: 'underPreservationAge'; readonly retireDay: IsoDate; readonly slots: readonly number[] }
  /** A retirement-phase pension before this one: how much of the cap is left is not known. */
  | {
      readonly kind: 'priorRetirementPhase';
      readonly retireDay: IsoDate;
      readonly slots: readonly number[];
      readonly because: 'stated' | 'holdsAPension';
    }
  | { readonly kind: 'switches'; readonly retireDay: IsoDate; readonly slots: readonly number[] };

/**
 * **Going back to work after retiring (retire flow S3, user ruling 2026-09-29).** A
 * `WORK_PATTERN_CHANGE` with days dated strictly after the day a Person stopped work is a return to
 * work: the salary starts again. One on the stop day itself, or with zero days, is not.
 *
 * In law the return undoes nothing already released: reg 6.12(1) makes the benefits preserved "at
 * that time" unrestricted, and reg 6.18(2)(a) ties cashing to what had accrued when the condition
 * was met. New contributions are preserved until the next cessation at 60 or over (reg 6.01(7)(b)(i),
 * item 101) or age 65 (item 106). An account-based pension keeps paying (ITAA 1997 s 307-80(1)).
 */
export const returnsToWork = (entry: Entry, stoppedOn: IsoDate): boolean =>
  entry.type === 'WORK_PATTERN_CHANGE' && entry.params.daysPerWeek > 0 && entry.date > stoppedOn;

/** A Person stopping work (a `RETIRE`) or going back to it after a stop. */
export interface WorkSpellChange {
  readonly kind: 'stopped' | 'returned';
  readonly date: IsoDate;
  readonly entryId: string;
}

/**
 * Each Person's stops and returns, oldest first: the first is always a stop, and they alternate. A
 * `RETIRE` while stopped changes nothing (`retiredOn`'s rule); after a return it stops work again.
 * Entries are read in date order, so a Scenario's order within a month cannot decide which came
 * first. `project()`, the life stages strip and the still-working warning all read this.
 */
export const workSpells = (household: Household, entries: readonly Entry[]): readonly (readonly WorkSpellChange[])[] =>
  household.persons.map((_person, index) => {
    const reaching = entries
      .filter((entry) => entry.enabled && (entry.type === 'RETIRE' || entry.type === 'WORK_PATTERN_CHANGE') &&
        (entry.owner === 'household' || (entry.owner === 'personA' ? 0 : 1) === index))
      .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
    const changes: WorkSpellChange[] = [];
    let stoppedOn: IsoDate | undefined;
    for (const entry of reaching) {
      if (entry.type === 'RETIRE') {
        if (stoppedOn !== undefined) continue;
        stoppedOn = entry.date;
        changes.push(Object.freeze({ kind: 'stopped', date: entry.date, entryId: entry.id }));
      } else if (stoppedOn !== undefined && returnsToWork(entry, stoppedOn)) {
        stoppedOn = undefined;
        changes.push(Object.freeze({ kind: 'returned', date: entry.date, entryId: entry.id }));
      }
    }
    return Object.freeze(changes);
  });

/**
 * One entry per Person, in `household.persons` order. The day is the first stop (`workSpells`) that
 * releases the super, at 60 or older; with none, the first stop. A later `RETIRE` cannot postpone a
 * release (`retiredOn`'s rule), and a stop after going back to work switches nothing a second time.
 * It switches only where the first stop was before 60 and so switched nothing (retire flow S3).
 */
export const retirementSwitches = (
  household: Household,
  entries: readonly Entry[],
  asAtDate: IsoDate,
): readonly RetirementSwitch[] => {
  const spells = workSpells(household, entries);
  return household.persons.map((person, index): RetirementSwitch => {
    const releasedOn = (day: IsoDate): boolean =>
      conditionOfRelease({ dateOfBirth: person.dateOfBirth, on: day, gainfulEmployment: { ceased: true, ceasedOn: day } }).met;
    const stops = (spells[index] ?? []).filter(({ kind }) => kind === 'stopped').map(({ date }) => date);
    const retireDay = stops.find(releasedOn) ?? stops[0];
    if (retireDay === undefined) return { kind: 'notRetiring' };
    const slots = person.superInterests.flatMap((interest, slot) =>
      interest.phase !== 'accountBasedPension' && interest.keepInAccumulationAtRetirement !== true ? [slot] : []);
    if (slots.length === 0) return { kind: 'nothingToSwitch', retireDay };
    if (retireDay < asAtDate) return { kind: 'retiredBeforeThePlan', retireDay };
    const released = releasedOn(retireDay);
    if (!released) return { kind: 'underPreservationAge', retireDay, slots };
    if (person.statedPriorRetirementPhase === 'startedRetirementPhaseBeforeTheForecast') {
      return { kind: 'priorRetirementPhase', retireDay, slots, because: 'stated' };
    }
    if (person.superInterests.some((interest) => interest.phase === 'accountBasedPension')) {
      return { kind: 'priorRetirementPhase', retireDay, slots, because: 'holdsAPension' };
    }
    return { kind: 'switches', retireDay, slots };
  });
};
