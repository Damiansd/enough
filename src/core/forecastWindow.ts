// P4-1b part (B) — **THE FORECAST WINDOW, NAMED**, and the two month primitives it is built out of.
//
// **What was here before this file, and why it was not enough.** `project()` has always DERIVED the
// window — `monthOf(settings.asAtDate)` and `horizonMonth(settings, household)`, two locals inside
// one 1,200-line function — and has always refused an entry dated past it. So the window existed as
// *behaviour* and not as a *thing*: `horizonMonth` was module-private, the first day never left
// `project()`, and any other module that needed to ask "is this day inside the forecast?" had either
// to invent a second boundary or to do without. `transferBalanceAccountSettings.ts` did without, and
// said so in terms (see the correction in that file's classifier doc).
//
// **Why a module of its own, rather than an export from `projection.ts`.** The transfer balance
// account modules must be able to read the window, and P4-1b part (A) — the ledger join, NOT built
// here — will make `projection.ts` read *them*. Exporting the window from `projection.ts` would make
// that join a cycle. So the window sits below both, and `projection.ts` re-exports the two month
// primitives it used to own so that every existing importer of `monthOf` is untouched.
//
// **The ordering refusal is NOT here.** A window whose last month precedes its first is refused by
// `project()`, in `project()`'s own words ("every member of the Household has already passed age N"):
// that message names the Planning Horizon age and belongs to the walk that reads it. Constructing
// the record does not re-check it, so this file adds no second refusal saying the same thing worse.
import { assertIsoDate } from './household.js'; // `.js` is correct in a `.ts` file — see tsconfig.json
import { nthBirthday } from './financialYear.js';
import type { Household } from './household.js';
import type { IsoMonth, Settings } from './plan.js';
import type { IsoDate } from '../data/assumptions/types.js';

const ISO_MONTH = /^\d{4}-\d{2}$/;

/**
 * **The zero-padding guard `plan.ts` said belonged with the code that first constructs an
 * `IsoMonth`.** It lived in `projection.ts` until P4-1b, which moved it — with `monthOf` — to the
 * module the window is built in, because the window is now the first `IsoMonth` any caller sees.
 * `projection.ts` re-exports both, so the move is invisible to every existing importer.
 *
 * `IsoMonth` is a template literal type, so the compiler admits `2026-3`, which sorts before
 * `2026-11` and after `2026-1` — and the walk compares months as strings. Every month this codebase
 * emits goes through here, so a mis-padded month throws at the point it is built rather than flowing
 * on as a string that only looks like a month.
 */
export const assertIsoMonth = (month: string): IsoMonth => {
  if (!ISO_MONTH.test(month)) throw new RangeError(`not a zero-padded ISO month: ${month}`);
  return month as IsoMonth;
};

/** The month an `IsoDate` falls in. The tick is monthly, so the day is dropped, not rounded. */
export const monthOf = (date: IsoDate): IsoMonth => assertIsoMonth(assertIsoDate(date).slice(0, 7));

/**
 * The last month of the projection: the month in which the LAST member of the Household attains
 * `settings.planningHorizonAge`, inclusive of that month.
 *
 * **Two judgment calls, neither of them settled by a spec, both taken here on the record.**
 *
 * (i) *The later of the two, not the earlier.* concept.md §1 says the couple are "**both** modelled
 * to a Planning Horizon of 100". A walk that stopped when the older partner turned 100 would not
 * model the younger one to 100 at all, and the surviving-partner years are precisely where a
 * retirement plan fails. So the horizon is the maximum over `household.persons`.
 *
 * (ii) *Inclusive.* The month containing the hundredth birthday is emitted. A horizon of 100 that
 * stopped the month before would make the last modelled age 99, and "modelled to 100" would be
 * false by one tick — the kind of off-by-one that is invisible in a chart and wrong in a total.
 */
export const horizonMonth = (settings: Settings, household: Household): IsoMonth => {
  const birthdays = household.persons.map((person) =>
    monthOf(nthBirthday(person.dateOfBirth, settings.planningHorizonAge)),
  );
  return birthdays.reduce((latest, month) => (month > latest ? month : latest));
};

/**
 * **The stretch of time this plan is about, as one value.** Everything in it is derived from the
 * Settings and the Household — there is no field a caller can set independently, so there is no way
 * for a window to disagree with the walk that is run from the same two inputs.
 *
 * It carries the first DAY as well as the first month because the two answer different questions.
 * A `Month` is stamped `YYYY-MM` and the walk's own boundary is a month; but a stated *day* —
 * a transfer balance account start day, for instance — is before the forecast or inside it by the
 * day, and `2026-09` cannot decide a day in the middle of September 2026.
 */
export interface ForecastWindow {
  /** `settings.asAtDate`: "today", and the only one that exists (ADR-0002). */
  readonly firstDay: IsoDate;
  /** The month `firstDay` falls in — the walk's first tick. */
  readonly firstMonth: IsoMonth;
  /** The Planning Horizon month, inclusive. See `horizonMonth`. */
  readonly lastMonth: IsoMonth;
}

/** The window's one producer. Frozen, so a caller cannot move the boundary it was handed. */
export const forecastWindow = (settings: Settings, household: Household): ForecastWindow =>
  Object.freeze({
    firstDay: assertIsoDate(settings.asAtDate),
    firstMonth: monthOf(settings.asAtDate),
    lastMonth: horizonMonth(settings, household),
  });

/**
 * Is `day` over and done with before the forecast begins? Strict: a day ON `firstDay` is the first
 * day of the forecast and is therefore INSIDE it, not before it — which is what makes these two
 * predicates a partition of the days up to the horizon rather than an overlapping pair.
 */
export const dayPrecedesForecast = (window: ForecastWindow, day: IsoDate): boolean =>
  assertIsoDate(day) < window.firstDay;

/** Is `day` one of the days this plan walks — from `firstDay` to the end of `lastMonth`, inclusive? */
export const dayFallsInsideForecast = (window: ForecastWindow, day: IsoDate): boolean =>
  !dayPrecedesForecast(window, day) && monthOf(day) <= window.lastMonth;
