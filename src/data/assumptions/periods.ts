// Shared period-assembly machinery (P14, 2026-09-24) — generalised out of `agePension.ts`'s
// `agePensionPeriods`, which merges two disjoint indexation calendars (20 Mar/20 Sep rates, 1 Jul
// means test) into the three parameter periods a financial year actually has (T22). Aged care's
// own indexation calendars (register §12) are a different shape — a combined 20 Mar/1 Jul/20 Sep
// schedule and a separate quarterly MPIR determination — so the boundary-merge is pulled out here
// rather than hand-rolled a second time (the P14 gate: "generalise... not hand-roll a third").
//
// This file assembles BOUNDARIES and looks a calendar's latest entry up against one. It does not
// know what a "rate" or a "means test" is — each caller supplies its own calendars and reads its
// own tables off the dates this returns. `agePensionPeriods`'s OUTPUT is unchanged byte-for-byte;
// only the boundary computation moved, so the golden file and every existing Age Pension test stay
// green through this refactor untouched.
import type { IsoDate } from './types.js';

/** The latest of `dates` on or before `date`. Throws — never extrapolates past the earliest date. */
export const latestOnOrBefore = <D extends string>(dates: readonly D[], date: string): D => {
  const found = [...dates].reverse().find((candidate) => candidate <= date);
  if (found === undefined) throw new RangeError(`no parameters in force at ${date}`);
  return found;
};

const shiftDay = (date: IsoDate, days: number): IsoDate => {
  const stamp = new Date(`${date}T00:00:00Z`);
  stamp.setUTCDate(stamp.getUTCDate() + days);
  return stamp.toISOString().slice(0, 10) as IsoDate;
};

export const dayBefore = (date: IsoDate): IsoDate => shiftDay(date, -1);
export const dayAfter = (date: IsoDate): IsoDate => shiftDay(date, 1);

/**
 * The number of calendar days in the month `date` (the first of the month) falls in — P14-13, for
 * daily-accrual figures (aged care fees, RAD/DAP) that this project's other modules have never
 * needed a month LENGTH for. Pure calendar arithmetic over a SUPPLIED date, `shiftDay`'s own
 * `Date`-as-a-calculator idiom (never `Date.now()`, never a timezone-sensitive read).
 */
export const daysInMonth = (date: IsoDate): number => {
  const stamp = new Date(`${date}T00:00:00Z`);
  const nextMonth = new Date(Date.UTC(stamp.getUTCFullYear(), stamp.getUTCMonth() + 1, 1));
  const thisMonth = new Date(Date.UTC(stamp.getUTCFullYear(), stamp.getUTCMonth(), 1));
  return Math.round((nextMonth.getTime() - thisMonth.getTime()) / (24 * 60 * 60 * 1000));
};

/**
 * Merge any number of indexation calendars into the boundary dates of the periods they produce,
 * within `[from, to]`. `from` itself is always a boundary, whether or not any calendar names it.
 * The caller then runs `latestOnOrBefore` against each calendar at each boundary to assemble its
 * own period records — this function knows nothing about what a period is shaped like, which is
 * what lets a two-calendar module (Age Pension) and a two-calendar module of a different shape
 * (aged care: schedule + MPIR) share it without either wearing the other's key types.
 */
export const mergeCalendarBoundaries = (
  from: IsoDate,
  to: IsoDate,
  calendars: readonly (readonly string[])[],
): readonly IsoDate[] =>
  [from, ...calendars.flat()]
    .filter((date) => date >= from && date <= to)
    .filter((date, index, all) => all.indexOf(date) === index)
    .sort() as readonly IsoDate[];
