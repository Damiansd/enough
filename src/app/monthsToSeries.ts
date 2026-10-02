// P7 (pure half) — a walk turned into plain-number series for the chart, and NOTHING ELSE. No
// renderer, no Chart.js type, no SVG, no DOM, no canvas: which library draws this is the user's
// decision and is not taken here. Everything below is plain numbers and plain frozen objects, so
// `monthsToSeries` is testable with `node:test` and no browser (TODO.md P2-9a: one dev dependency),
// exactly as `monthToRows.ts` is, and every claim in this header is an assertion in
// `test/app-months-to-series.test.mjs`.
//
// **THE RULE THIS FILE EXISTS TO ENFORCE: `accessibleAssets` IS NEVER A THIRD STACKED BAND.**
// `plan.ts` (the `accessibleAssets` doc comment) states the two facts that make this a chart bug
// rather than a style choice:
//
//   * `protectedAssets + assessableAssets` IS TOTAL WEALTH. The two partition it — every
//     `AssetLine` `splitAssets` emits carries exactly one of the two treatments — so stacking them
//     is exactly right and their stack height is a real figure.
//   * `accessibleAssets` CROSS-CUTS BOTH. The younger partner's exempt super is protected AND
//     unreachable; an Account-Based Pension is assessable AND reachable. It is a different question
//     asked of the same money, not a third pool of it.
//
// A chart that stacked all three would draw every reachable dollar twice and print a total larger
// than the Household's whole wealth, while looking exactly as authoritative as a correct one. So the
// shape here keeps the two apart structurally rather than by convention: `bands` is a fixed
// two-member tuple whose key type admits only `'protected'` and `'assessable'`, `overlays` is a
// separate array drawn ON TOP of the stack and never in it, and there is no field anywhere in the
// return in which any two of the three figures are added. `monthToRows.ts` made the same separation
// for cash-vs-wealth and its test sweeps the key names for a summed field; this one is swept the
// same way, and its values are swept too.
//
// ⚠️ **"IS TOTAL WEALTH" NARROWED ON 2026-09-24 (P9-1, slice 1), AND NOT BY THIS FILE.**
// `Month.heasDebt`'s own doc is explicit: a `HEAS_DRAW`'s debt is real cash already counted in
// `closingBalance`, kept OUT of `protectedAssets` and `assessableAssets` entirely (T38 — the home is
// already exempt, and the debt does not reduce assessable assets a second time). So the bullet above
// is exact only where a walk holds no `HEAS_DRAW`; where it does, `protected + assessable` reads
// HIGH by the debt, the same gap `MonthRow.totalWealth` closes with `− (heasDebt ?? 0)`
// (`monthToRows.ts`). This file does not close it either — the `heasDebt` overlay (P9-1, slice 2,
// `chartConfig.ts`'s own header) draws the debt ON TOP of the stack rather than netting it out of
// either band, so a reader who wants the true total still has to read the overlay against the stack
// rather than the stack height alone.
//
// ✅ **THE `careCost` OVERLAY IS GONE (design gate, 2026-09-21) — MOVED, NOT DELETED.** From P14-15 to this
// date the four `AGED_CARE_COST_LINES` were drawn as a near-invisible dashed line on THIS chart,
// which the income/spend chart design gate named as exactly the problem: aged-care costs deserved a chart of
// their own rather than a hairline overlay competing with a wealth stack in the millions. They now
// have one — `flowSeries.ts`'s `agedCareCosts` group, on the second chart below this one
// (`main.ts`) — and this file draws total wealth alone again, as it did before P14-15.
//
// **ASSESSABLE IS THE BOTTOM BAND, PROTECTED SITS ON TOP (2026-09-25),** so the assessable band's
// top edge is read against `thresholds` — the assets test's free area ("Full pension up to") and
// cut-off ("No pension above"), straight off `Month.assetsTestThresholds`. They are two stepped
// lines drawn over the stack and never in it, with a gap (`null`) wherever the engine computed no
// entitlement. They are the assets test ONLY; the income test can cut the pension too.
//
// **THE CONTINGENCY FLOOR IS AN INPUT AND NEVER A CONSTANT.** concept.md names $100k as a default
// and `outcomes.ts` deliberately made the floor a REQUIRED positional argument. A floor is a
// personal financial figure: a Household that keeps $250k back for a nursing home must get a chart
// drawn against $250k without anyone editing this file. So `floor` is required and positional here
// too, it carries no default, and this module defines no floor constant of its own — the number it
// draws is the number it was handed.
//
// **AND `undefined` IS A REAL ANSWER TO IT: NO FLOOR AT ALL (P4-14).** `Settings.contingencyFloor`
// is optional and absence is the only spelling of "no reserve" — `parsePlan` refuses a stated nil.
// A plan that states none gets **no `floor` overlay, no `floor` key and no `belowFloor` key**, so a
// renderer cannot draw a band against a figure nobody chose and `Object.hasOwn` is the honest test
// for "was a floor stated?". Until 2026-09-21 `main.ts` passed a hard-coded $700,000 here; that was
// the page inventing the user's own risk appetite, and it is gone.
//
// **THE DRAWN FLOOR AND THE COUNTED FLOOR ARE ONE CURVE.** The overlay's values are the stated
// figure, flat, IN TODAY'S MONEY — `chartConfig.ts` puts them through `statedInTodaysMoneyLens`,
// which leaves them alone in the today's-money view and raises them to each month's price level in
// the future-dollars one. `belowFloor` compares each month's reachable money with
// `contingencyFloorAt`, which is that same raise, through the same expression in
// `core/priceLevel.ts`. So the shaded months and `contingencyFloorBreach` cannot disagree, in either
// view — which is TODO.md P4-14, settled rather than recorded.
//
// **THE SECOND OF THE THREE MARKERS IS GATED RATHER THAN CAUGHT (P7-5).** `shortfallAge` is the
// headline (CONTEXT.md) and is safe on any walk, so it is called unconditionally. `pensionOnlyAge`
// is NOT safe on any walk: it raises `RangeError` on a walk that runs past the published Age
// Pension parameter window with no `Settings.economicSeries.agePension` to index it forward — which
// the committed demo walk, and every plan file seeded from it, does.
//
// **So the question is ASKED BEFORE IT IS PUT, and it is never wrapped in a `try`/`catch`.**
// `agePensionParametersCover` (`projection.ts`) is the engine's own predicate and is checked here on
// the walk's own first and last months — the identical endpoints `pensionOnlyAge` checks — so a walk
// it would refuse is a walk this module does not ask. A `catch` would be the wrong shape twice
// over: it cannot tell *"this plan cannot answer that question"* from *"the code broke"*, and it
// turns a refusal the engine makes deliberately into a silently absent marker. This module contains
// no `try` and no `catch`, and its RAW SOURCE test says so.
//
// **AN ABSENT MARKER IS EXPLAINED, NEVER JUST ABSENT.** A chart that simply omits the Pension-Only
// rule leaves a reader unable to tell "it never happens" from "this plan cannot be asked". Those are
// different facts and they get different sentences: `notes` carries `PENSION_ONLY_UNCOMPUTABLE_NOTE`
// where the parameters do not cover the walk and `PENSION_ONLY_NEVER_NOTE` where they do and the
// Household never lives on the pension alone. `chartConfig.ts` puts them on the face of the chart.
//
// **THE THIRD MARKER — THE HOME LOAN, P3-16 slice 3 — AND WHAT IT MEANS WHERE THERE IS MORE THAN
// ONE LOAN.** `mortgagePayoff` is safe on any walk (it compares one optional field with zero and
// refuses only an empty array), so it is called unconditionally like `shortfallAge` and needs no
// gate of its own.
//
// **It is drawn at `clearForGood` and never at `firstPayoff`.** A dated `MORTGAGE_REFINANCE` after
// a payoff is a NEW loan (the walk's transition (vi)), so a plan can pay the house off and borrow
// again. An upright rule captioned *"Home loan clear"* makes a claim about every month to its
// right; drawn at the FIRST payoff of such a plan it would make that claim about months in which
// money is owed. `outcomes.ts` computes both and states the ruling; this is the consumer it was
// made for. Where there is one loan the two are the same month.
//
// **AN ABSENT PAYOFF MARKER GETS NO `notes` ENTRY, and that is a departure from the rule above.**
// The Pension-Only notes exist because a blank space is ambiguous between *"it never happens"* and
// *"this plan cannot be asked"*, and nothing else on the page says which. The home loan has no
// such ambiguity and no such silence: a plan with no loan has nothing to say (and MUST say nothing
// — a mortgage-free plan is byte-identical, exactly as the walk is), and a loan that outlives the
// forecast is said in full, in plain words and with the amount still owing, by
// `mortgageHeadline.ts` at the top of the page. A note here would be the same fact spelled a
// second way on one screen, which is how two spellings of it drift apart.
//
// **THE HOME MARKERS — P7-5, read off `Month.homeStatus` and nothing else.** One rule at every month
// the walk's home status differs from the month before (the first month against the Household's own
// stated `homeStatus`), captioned in plain words (`homeChangeLabel`). The two exemption clocks are
// already in the status — this module counts no months — so the month a two-year exemption ends is
// a change like any other, drawn under its own key, `'homeExemptionEnds'`. A walk with no home entry
// carries no `homeStatus` key and gets no home marker.
//
// **AND THE MONTHS ABOVE THE CUT-OFF (P7-3)** — `aboveCutOff`, true where the assessable figure is
// strictly over that month's "No pension above", both nominal and both off the same month, so the
// answer does not depend on the money view. Present only where some month is above it, so a walk
// that never crosses the line has nothing to shade and carries no key.
//
// `markers` is a list rather than a field per marker, so no marker's absence is a hole in the
// shape: an absent marker is simply not a member, and is never faked with index 0.
//
// **THE FOURTH MARKER — MORTGAGE_TARGET, P3-16a.** `entries` is a new, TRAILING, DEFAULTED
// parameter (`= []`): every existing caller of this function — every test fixture that predates
// this slice — need not learn about a type it never held, and gets exactly the empty-entries
// answer it always implicitly had. A caller that never passes it draws no `'mortgageTarget'`
// marker, which is the same "nothing stated, nothing drawn" rule `mortgagePayoff` already keeps.
//
// **Drawn once per enabled `MORTGAGE_TARGET` entry dated INSIDE the walk, and silently not at all
// for one dated before it.** `outcomes.ts`'s own doc on `ENTRY_KIND.MORTGAGE_TARGET` (`'event'`)
// says so: a target dated before `asAtDate` is off the left edge of the chart, and it is never
// cited in any month's `appliedEntryIds` either — there is no month to redraw it at without
// asserting a milestone on a date the user did not choose. `mortgageTargets` itself does not know
// about the walk at all, so THIS is the one place that gate is applied, exactly as
// `payoff.clearForGood !== undefined` gates the payoff marker above.
//
// **THE AGE AXIS SHOWS EVERY PERSON, NEVER JUST ONE — the trap this repo's own committed household
// already demonstrates.** `DEMO_HOUSEHOLD` is a couple nine years apart (Dana born 1968-05-14, Ash
// born 1960-02-09 — see `demoHousehold.ts`), and the Shortfall Age marker already reads "Dana 74,
// Ash 83" (`markerCaption` in `chartConfig.ts`). "Show age instead of date" is therefore not a
// neutral relabelling of the same axis: the single largest cliff a couple forecast can show is the
// YOUNGER partner's Age Pension age, because `superInterestTreatment` in `household.ts` exempts a
// Person's Accumulation Phase super from BOTH means tests only until THAT Person — not the
// household, not the older partner, not an average of the two — reaches it. An axis naming only one
// age would make that cliff look like it lands on an arbitrary date, because the reader would be
// reading the wrong person's clock.
//
// So `ageAxis` below reports EVERY Person in `household.persons` order, one age per Person per
// month, and it is written to generalise over the count rather than assume two: one Person, two, or
// (should a future Household ever hold more) three all produce one line per Person, and nothing
// here is hard-coded to a pair. There is deliberately no argument to pick a Person, average the
// ages, or otherwise collapse the axis to one number — a per-person selector is a possible LATER
// refinement and is not this one. If you are reading this because the axis feels like it wants
// simplifying to one age: it was already simplified once, on purpose, to more than one.
//
// **The age is read on the month's FIRST DAY** — the same instant `splitAssets` reads the two bands
// on (ADR-0005) — so the age axis and the wealth axis agree about which day of the month they are
// both describing; see the PHASE SKEW note in `chartConfig.ts` for the instant `accessibleAssets`
// disagrees with both. It is "age at last birthday" on that day, taken from `ageAt` (`household.ts`)
// exactly as `outcomes.ts`'s own `AgeAtMonth` is, so a Person born on the 15th steps to their next
// age on the first day of the FOLLOWING month, not in the month of the birthday itself — nothing
// here smooths, interpolates or fabricates a fractional age.
//
// **A `dateOfBirth` after the month it is read on is not a case this fixture can produce, but the
// type does not rule it out.** `ageAt` would return a negative integer, and printing a negative age
// on an axis reads as a household fact ("this person is minus three") that is not one. The honest
// choice taken here is the string `'not yet born'` rather than a number of any sign — see
// `AGE_NOT_YET_BORN` below.
import { AGE_PENSION_AGE, ageAt, hasReachedAgePensionAge } from '../core/household.js'; // `.js` is correct in a `.ts` file — see tsconfig.json
import { personOwnerLabels } from './ownerNames.js';
import { agePensionParametersCover, firstDayOf } from '../core/projection.js';
import { agesAt, contingencyFloorAt, mortgagePayoff, mortgageTargets, pensionOnlyAge, retirementMonths, shortfallAge } from '../core/outcomes.js';
import type { AgeAtMonth, PersonAge, StatedContingencyFloor } from '../core/outcomes.js';
import type { AgePensionIndexationSeries } from '../data/assumptions/settings.js';
import type { Household, HomeStatus } from '../core/household.js';
import type { Entry, Month } from '../core/plan.js';

/**
 * The two figures that PARTITION total wealth, and therefore the only two that may be stacked.
 * `'accessible'` is deliberately not a member: a band cannot be given that key without editing this
 * union, and editing it is the change a reviewer must see.
 */
export type WealthBandKey = 'protected' | 'assessable';

/** The figures drawn OVER the stack. None is a share of it, and none may be added to it. */
export type OverlayKey = 'accessible' | 'floor' | 'heasDebt' | 'deprivedAssets' | 'personalAssets';

/**
 * The assets test's two thresholds, drawn as stepped lines over the stack and never in it. Read off
 * `Month.assetsTestThresholds`, the engine's own per-month figures — nothing here re-derives a rule.
 */
export type ThresholdKey = 'fullPensionUpTo' | 'noPensionAbove';

/**
 * Which marker a `SeriesMarker` is. Four of them; `'pensionOnly'` appears only where it is
 * computable, `'mortgagePayoff'` only where the walk holds a home loan that is paid off inside it,
 * and `'mortgageTarget'` once per enabled `MORTGAGE_TARGET` entry dated inside the walk (P3-16a).
 * `markers` is a LIST, so no absence is a hole in the shape, and `'mortgageTarget'` can appear more
 * than once — a plan may state more than one milestone.
 */
export type MarkerKey =
  | 'shortfall'
  | 'pensionOnly'
  | 'mortgagePayoff'
  | 'mortgageTarget'
  | 'homeStatus'
  | 'homeExemptionEnds'
  | 'agePensionAge';

export const BAND_LABELS: Readonly<Record<WealthBandKey, string>> = Object.freeze({
  protected: 'Protected — excluded from the assets test',
  assessable: 'Counted for the Age Pension',
});

/**
 * Spelled out rather than labelled `'Accessible'`, because a reader who takes the overlay for a
 * third slice of the stack has mis-read the chart in the flattering direction.
 */
export const OVERLAY_LABELS: Readonly<Record<OverlayKey, string>> = Object.freeze({
  accessible: 'Reachable money — not added to the shaded areas',
  floor: 'Contingency buffer',
  // **P9-1, slice 2 — the HEAS debt at this month's CLOSE, `accessible`'s own footing exactly**
  // (`Month.heasDebt`, read straight off with no filtering): kept OUT of `protectedAssets` and
  // `assessableAssets` (T38, `plan.ts`'s own doc on `Month.heasDebt`), so the stack above does not
  // fall as the debt grows — this line is the only place on the chart the debt is drawn at all.
  heasDebt: 'Home loan from HEAS (debt) — owed against the home, not part of either band',
  // `Month.deprivedAssets` (register §4.12): money already given away, so in neither band — and
  // counted by the assets test on top of the "Counted for the Age Pension" band.
  deprivedAssets: 'Gifts still counted by Centrelink — already given away, not part of either band',
  // `Month.personalAssets`: counted by the assets test, but not money — so in neither band.
  personalAssets: 'Cars, contents and other things you own — counted by Centrelink, not part of either band',
});

export const THRESHOLD_LABELS: Readonly<Record<ThresholdKey, string>> = Object.freeze({
  fullPensionUpTo: 'Full pension up to (assets test)',
  noPensionAbove: 'No pension above (assets test)',
});

export const MARKER_LABELS: Readonly<Record<MarkerKey, string>> = Object.freeze({
  shortfall: 'Shortfall Age — the plan can no longer cover the spending target',
  pensionOnly: 'Pension-Only Age — the Household first opens a month with nothing but its pension',
  mortgagePayoff: 'Home loan clear — nothing is owed on it from this month on',
  mortgageTarget: 'Mortgage target — the date a MORTGAGE_TARGET entry aims for',
  // The two home keys' generic labels; a drawn home marker carries `homeChangeLabel`'s own words.
  homeStatus: 'Home status changes',
  homeExemptionEnds: 'An exemption ends — the home or the sale money is now counted for the Age Pension',
  agePensionAge: 'Age Pension age',
});

/**
 * The plain-English label for a home status change, and which of the two home keys it is drawn
 * under. The two "exemption ends" transitions are the walk's own two-year clocks running out.
 */
const homeChange = (from: HomeStatus, to: HomeStatus): { readonly key: MarkerKey; readonly label: string } => {
  switch (to) {
    case 'vacatedBeyondTwoYearExemption':
      return { key: 'homeExemptionEnds', label: 'Home now counted for the Age Pension' };
    case 'noHome':
      return from === 'noHomeSaleProceedsExempt'
        ? { key: 'homeExemptionEnds', label: 'Money kept for a new home now counted for the Age Pension' }
        : { key: 'homeStatus', label: 'Home sold' };
    case 'noHomeSaleProceedsExempt':
      return { key: 'homeStatus', label: 'Home sold' };
    case 'occupied':
      return { key: 'homeStatus', label: from === 'rentedOut' ? 'Home no longer rented out' : 'New home bought' };
    case 'rentedOut':
      return { key: 'homeStatus', label: 'Home rented out' };
    case 'vacatedProtectedPersonRemains':
      return { key: 'homeStatus', label: 'Moved into care — partner still at home' };
    case 'vacatedWithinTwoYearExemption':
      return { key: 'homeStatus', label: 'Home left empty — not counted for two years' };
  }
};

/**
 * **Why the Pension-Only rule is not on this chart — the plan was never able to be asked.** Said in
 * the reader's own terms rather than as a parameter-window date, because the fix is a plan edit.
 *
 * ⚠️ **ITS REACH AND ITS WORDS BOTH CHANGED ON 2026-09-21 (P4-1e), AND THE OLD SENTENCE IS KEPT
 * HERE BECAUSE IT IS NOW FALSE RATHER THAN MERELY OLD.** It read: *"No Pension-Only Age: this plan
 * says nothing about future Age Pension rates, so they run out mid-forecast."* They do not run out
 * any more — past the published window the last determined sets are carried forward — so the only
 * walk that cannot be asked is one that BEGINS before the first determination this register holds
 * (20 March 2026), because the indexation mechanism runs forward from a published set and not
 * backwards. That is a walk whose `asAtDate` is in the past, and the fix is still a plan edit,
 * which is why this note survives the narrowing instead of being deleted with it.
 */
export const PENSION_ONLY_UNCOMPUTABLE_NOTE =
  'No Pension-Only Age: this plan starts before the earliest Age Pension rates anybody has published, so the forecast cannot work them out for its first months.';

/**
 * **Why it is not on this chart when the plan COULD be asked — a different fact, and a good one.**
 * Kept separate from the note above on purpose: "never happens" and "cannot be computed" are the two
 * things a blank space is ambiguous between, and collapsing them is the black box this chart avoids.
 */
export const PENSION_ONLY_NEVER_NOTE =
  'No Pension-Only Age: the Age Pension is never all you have.';

/**
 * One Person's Age Pension age month: the FIRST month of the walk whose first day
 * `hasReachedAgePensionAge` says yes to — the engine's own predicate on the engine's own date
 * (`firstDayOf`), so the line cannot land a month off the month the means test starts counting them.
 */
export interface AgePensionAgeLine {
  /** Position in `household.persons`. */
  readonly personIndex: number;
  /** `ownerNames.ts`'s label for the Person — the name the rest of the page uses. */
  readonly name: string;
  readonly index: number;
  readonly month: string;
}

export interface AgePensionAgeLines {
  /** One per Person who reaches the age inside the walk, in `household.persons` order. */
  readonly lines: readonly AgePensionAgeLine[];
  /** One per Person who gets NO line, saying why. Never empty-handed for a Person left out. */
  readonly notes: readonly string[];
}

export const agePensionAgeAlreadyNote = (name: string): string =>
  `${name} is already at or over Age Pension age (${AGE_PENSION_AGE}) when this plan starts, so no Age Pension age line is drawn for them.`;
export const agePensionAgeNeverNote = (name: string): string =>
  `${name} does not reach Age Pension age (${AGE_PENSION_AGE}) within this plan, so no Age Pension age line is drawn for them.`;
export const agePensionAgeDiedNote = (name: string): string =>
  `${name} dies before reaching Age Pension age (${AGE_PENSION_AGE}), so no Age Pension age line is drawn for them.`;

/** Every Person, never only the eldest: one line each, or one note each saying why there is none. */
export const agePensionAgeLines = (months: readonly Month[], household: Household): AgePensionAgeLines => {
  const names = personOwnerLabels(household);
  const lines: AgePensionAgeLine[] = [];
  const notes: string[] = [];
  household.persons.forEach((person, personIndex) => {
    const name = names[personIndex] ?? person.name;
    const index = months.findIndex((month) => hasReachedAgePensionAge(person, firstDayOf(month.month)));
    if (index === -1) notes.push(agePensionAgeNeverNote(name));
    else if (index === 0) notes.push(agePensionAgeAlreadyNote(name));
    else if ((months[index]!.died ?? []).includes(personIndex)) notes.push(agePensionAgeDiedNote(name));
    else lines.push(Object.freeze({ personIndex, name, index, month: months[index]!.month as string }));
  });
  return Object.freeze({ lines: Object.freeze(lines), notes: Object.freeze(notes) });
};

/** Integer cents, one per month of the walk, in the walk's own order. */
export interface WealthBand {
  readonly key: WealthBandKey;
  readonly label: string;
  readonly values: readonly number[];
}

export interface SeriesOverlay {
  readonly key: OverlayKey;
  readonly label: string;
  readonly values: readonly number[];
}

/**
 * One threshold per month, in the walk's own order: integer cents where the engine computed an
 * entitlement that month, and `null` where it did not — a gap, never a zero and never a carried value.
 */
export interface SeriesThreshold {
  readonly key: ThresholdKey;
  readonly label: string;
  readonly values: readonly (number | null)[];
}

export interface SeriesMarker {
  readonly key: MarkerKey;
  readonly label: string;
  /** Index into `months` — the position a renderer draws the rule at. Never negative. */
  readonly index: number;
  /** The same month `months[index]` holds, carried so a renderer cannot mis-index it silently. */
  readonly month: string;
  /**
   * Every living Person's age in that month, in `household.persons` order — `outcomes.ts` refuses to
   * pick one. A Person who has died by then is not in it (P12-1).
   */
  readonly ages: readonly PersonAge[];
}

/** Printed instead of a negative age — see the header's note on a `dateOfBirth` after the month. */
export const AGE_NOT_YET_BORN = 'not yet born';

/**
 * Printed instead of an age for a Person who has died by that month (P12-1) — `AGE_NOT_YET_BORN`'s
 * own device: a word, not a number, in the Person's own place on the axis.
 */
export const AGE_DIED = 'died';

/**
 * `2041-06 (Dana 74, Ash 83)` — a dated fact about the Household, naming EVERY Person the fact
 * carried, in the order it carried them. `outcomes.ts` refuses to pick one Person, so neither does
 * this: a single age on a couple's marker is the reader looking at the wrong person's clock.
 *
 * The one place this wording is decided. `chartConfig.ts`'s `markerCaption` (the chart's rule
 * captions) and `comparisonSeries.ts`'s Shortfall sentence (the Scenario list) both come through
 * here, so the same fact cannot be spelled two ways on one page.
 */
export const agesCaption = (at: { readonly month: string; readonly ages: readonly PersonAge[] }): string =>
  `${at.month} (${at.ages.map((age) => `${age.name} ${age.age}`).join(', ')})`;

/**
 * The label set for the age view of the x-axis — a SWITCH on `months` above, not a second
 * computation: both label sets are read off the same walk, so a renderer toggling between them
 * moves no data point.
 *
 * `labels[i]` holds one string per Person, in `household.persons` order, for `months[i]` — so a
 * one-person Household has one line per tick and a couple has two, and the axis title
 * (`chartConfig.ts`) names them in the same order so a reader can tell which line is whose.
 */
export interface AgeAxis {
  /** Every Person this axis reports, in the order every `labels` entry lists them. */
  readonly personNames: readonly string[];
  /** One entry per month, each entry one age string per Person — see `personNames`. */
  readonly labels: readonly (readonly string[])[];
}

/** One Person's age-axis label for one month's first day — see the header for the two edge rules. */
const ageLabel = (dateOfBirth: Parameters<typeof ageAt>[0], monthFirstDay: ReturnType<typeof firstDayOf>): string => {
  const age = ageAt(dateOfBirth, monthFirstDay);
  return age < 0 ? AGE_NOT_YET_BORN : String(age);
};

/**
 * Build the age label set for every month of the walk, for every Person the Household holds — see
 * the header's case against picking one. Takes only `month.month` and `month.died` from each
 * `Month`; nothing else in `Month` is read, so a caller can hand this bare `{ month }` objects in a
 * test. A Person who has died by a month is labelled `AGE_DIED` there, in their own place (P12-1).
 */
export const ageAxis = (months: readonly Month[], household: Household): AgeAxis =>
  Object.freeze({
    personNames: Object.freeze(household.persons.map((person) => person.name)),
    labels: Object.freeze(
      months.map((month) => {
        const day = firstDayOf(month.month);
        return Object.freeze(
          household.persons.map((person, index) => ((month.died ?? []).includes(index) ? AGE_DIED : ageLabel(person.dateOfBirth, day))),
        );
      }),
    ),
  });

export interface ChartSeries {
  /** `YYYY-MM`, ascending, one per month of the walk. Every series below is this long. */
  readonly months: readonly string[];
  /**
   * The SAME months, as ages — one label set per Person, in `household.persons` order. A renderer
   * switches between this and `months` above to change the axis view; neither the bands, the
   * overlays nor the markers below move when it does. See the header on why every Person is named
   * rather than one.
   */
  readonly ageAxis: AgeAxis;
  /**
   * **THE STACK, and the whole of it.** Exactly two, and their heights add to total wealth. A third
   * member here would double-count — see the header. **Assessable FIRST, so it is the bottom band:**
   * a stacked chart draws its first dataset at the base, and the assets-test thresholds are read
   * against the assessable figure alone, so that band has to start at zero for them to line up.
   */
  readonly bands: readonly [WealthBand, WealthBand];
  /** Drawn OVER the stack, never in it. Not shares of anything, and not summable with the bands. */
  readonly overlays: readonly SeriesOverlay[];
  /**
   * The assets test's free area and cut-off (`THRESHOLD_LABELS`), or EMPTY where no month of the walk
   * computed an entitlement. Drawn over the stack like an overlay, never in it.
   */
  readonly thresholds: readonly SeriesThreshold[];
  /** Empty when the walk has no marker to draw. An absent marker is never faked with index 0. */
  readonly markers: readonly SeriesMarker[];
  /**
   * One short sentence per marker this chart CANNOT draw, saying which and why — see
   * `PENSION_ONLY_UNCOMPUTABLE_NOTE` and `PENSION_ONLY_NEVER_NOTE`. Empty when every marker the
   * chart knows about is present. Never a reason for a marker that IS drawn.
   */
  readonly notes: readonly string[];
  /**
   * The floor this chart was drawn against, in cents **of today's money**, as handed in — never
   * defaulted here. **ABSENT, key and all, when the plan states no floor**, which is why it is read
   * with `Object.hasOwn` and not against a sentinel: there is no figure standing for "none".
   */
  readonly floor?: number;
  /**
   * Whether the reachable money was UNDER the floor that month — strict, and against the floor at
   * THAT MONTH'S price level, which is the same comparison `outcomes.ts`'s `belowFloor` makes and
   * the same curve `chartConfig.ts` draws. Absent, key and all, when no floor was stated: it travels
   * with `floor` and neither appears without the other.
   */
  readonly belowFloor?: readonly boolean[];
  /**
   * Whether the assessable figure was strictly over that month's assets-test cut-off (P7-3). Absent,
   * key and all, where no month is — see the header.
   */
  readonly aboveCutOff?: readonly boolean[];
}

const band = (key: WealthBandKey, values: readonly number[]): WealthBand =>
  Object.freeze({ key, label: BAND_LABELS[key], values: Object.freeze(values) });

const overlay = (key: OverlayKey, values: readonly number[]): SeriesOverlay =>
  Object.freeze({ key, label: OVERLAY_LABELS[key], values: Object.freeze(values) });

const threshold = (key: ThresholdKey, values: readonly (number | null)[]): SeriesThreshold =>
  Object.freeze({ key, label: THRESHOLD_LABELS[key], values: Object.freeze(values) });

/** Shown wherever a HEAS debt is owed: the bands do not take it off, so they read high by the debt. */
export const HEAS_DEBT_NOTE =
  'A Home Equity Access Scheme loan is owed: the shaded areas do not take it off, so total wealth is the shaded areas less the loan line.';

/**
 * The one place a marker object is built, so neither marker can be assembled slightly differently
 * from the other. `at` is the marker's own `AgeAtMonth`, read off `outcomes.ts`; the index is found
 * by MONTH rather than assumed, and a month that is not in this walk is refused rather than drawn.
 */
const markerAt = (
  months: readonly Month[],
  key: MarkerKey,
  at: AgeAtMonth,
  markerName: string,
  label: string = MARKER_LABELS[key],
): SeriesMarker => {
  const index = months.findIndex((month) => month.month === at.month);
  if (index === -1) {
    // Unreachable through `project()`: the marker's month is one of these months by construction.
    // Refused rather than drawn at `-1`, which a renderer would put at the left edge of the chart.
    throw new RangeError(
      `the ${markerName} is ${at.month}, which is not a month of the walk handed in — these months are not the walk the marker was read off`,
    );
  }
  return Object.freeze({
    key,
    label,
    index,
    month: at.month as string,
    ages: Object.freeze([...at.ages]),
  });
};

/**
 * Turn a walk into the chart's data.
 *
 * `months` must be what `project()` returned — ascending, contiguous and non-empty; an empty array
 * is refused by `shortfallAge` and the refusal is passed through rather than caught, because a walk
 * with no months has no chart and a chart of nothing is worse than none. `floor` is the Contingency
 * Floor in cents and is required: see the header.
 *
 * `agePensionSeries` is `Settings.economicSeries.agePension` — the walk's OWN series, the one
 * `project()` was run with. It is positional and required rather than optional for the reason
 * `pensionOnlyAge` gives for its own third argument: a caller who may omit it is a caller who will,
 * and the marker would then go missing for a plan that could have answered. Pass `undefined` only
 * where the plan genuinely states none, and get the Pension-Only note instead of the marker.
 *
 * `entries` is the Scenario's resolved entries this walk was run from — never the pool, on
 * `retirementMonths`'s own requirement — and it is the one TRAILING, DEFAULTED parameter here: see
 * the header's note on the fourth marker for why a default is right where the others' is not.
 */
export const monthsToSeries = (
  months: readonly Month[],
  household: Household,
  floor: StatedContingencyFloor | undefined,
  agePensionSeries: AgePensionIndexationSeries | undefined,
  entries: readonly Entry[] = [],
): ChartSeries => {
  const shortfall = shortfallAge(months, household);
  const markers: SeriesMarker[] = [];
  if (shortfall.firstShortfall !== undefined) {
    markers.push(markerAt(months, 'shortfall', shortfall.firstShortfall, 'Shortfall Age'));
  }
  // **THE GATE, AND IT IS A PREDICATE AND NOT A `catch` — see the header.** The two endpoints are
  // the ones `pensionOnlyAge` itself tests, so this asks exactly the question that function would
  // refuse to answer. A series that STOPS mid-walk needs no test here either: `project()` raises
  // `MissingPensionIndexationError` and never returns the walk, so a walk in hand with a series is
  // a walk the series reached the end of.
  const notes: string[] = [];
  // P9-1 slice 2 review: neither band nets out a HEAS debt (T38 keeps it out of the means-test split), so
  // wherever one is owed, "the bands add to total wealth" overstates it. Say so on the chart itself.
  if (months.some((month) => (month.heasDebt ?? 0) > 0)) notes.push(HEAS_DEBT_NOTE);
  const firstDay = months[0] === undefined ? undefined : firstDayOf(months[0].month);
  const lastMonth = months.at(-1);
  const coversTheWalk =
    firstDay !== undefined &&
    lastMonth !== undefined &&
    agePensionParametersCover(firstDay) &&
    agePensionParametersCover(firstDayOf(lastMonth.month));
  if (!coversTheWalk) {
    notes.push(PENSION_ONLY_UNCOMPUTABLE_NOTE);
  } else {
    const pensionOnly = pensionOnlyAge(months, household, agePensionSeries);
    if (pensionOnly.firstPensionOnly === undefined) {
      notes.push(PENSION_ONLY_NEVER_NOTE);
    } else {
      markers.push(markerAt(months, 'pensionOnly', pensionOnly.firstPensionOnly, 'Pension-Only Age'));
    }
  }
  // `clearForGood` is `undefined` for a walk with no loan AND for a loan still owing at the end of
  // it, and those two are the same thing to a chart: there is no month at which this Household
  // became clear, so there is no rule to draw. See the header for why the second case is not a
  // note either.
  const payoff = mortgagePayoff(months, household);
  if (payoff.clearForGood !== undefined) {
    markers.push(markerAt(months, 'mortgagePayoff', payoff.clearForGood, 'home loan payoff'));
  }
  // One marker per enabled `MORTGAGE_TARGET` dated inside the walk — see the header. A target
  // dated before `asAtDate` is never a month of `months`, so `monthIndex` is `-1` for it and it is
  // silently not drawn, on the same "off the left edge" reading `outcomes.ts` states for it.
  const retirements = retirementMonths(months, household, entries);
  for (const target of mortgageTargets(entries, retirements)) {
    const monthIndex = months.findIndex((month) => month.month === target.month);
    if (monthIndex === -1) continue;
    markers.push(markerAt(months, 'mortgageTarget', agesAt(household, months[monthIndex]!), 'mortgage target'));
  }
  // One rule per change of the walk's home status — see the header. The first month is compared
  // with the Household's stated status, so an entry dated before the walk is drawn at month 0.
  months.forEach((month, index) => {
    const from = index === 0 ? household.homeStatus : (months[index - 1]!.homeStatus ?? household.homeStatus);
    const to = month.homeStatus ?? household.homeStatus;
    if (to === from) return;
    const change = homeChange(from, to);
    markers.push(markerAt(months, change.key, agesAt(household, month), 'home status change', change.label));
  });
  // One rule per Person at their Age Pension age — see `agePensionAgeLines`.
  const agePensionAge = agePensionAgeLines(months, household);
  for (const line of agePensionAge.lines) {
    markers.push(
      markerAt(months, 'agePensionAge', agesAt(household, months[line.index]!), 'Age Pension age', `Age Pension age — ${line.name}`),
    );
  }
  notes.push(...agePensionAge.notes);
  const aboveCutOff = months.map(
    // What the assets test SAW: the band plus any gift still counted (register §4.12).
    (month) => month.assetsTestThresholds !== undefined && month.assessableAssets + (month.deprivedAssets ?? 0) + (month.personalAssets ?? 0) > month.assetsTestThresholds.noPensionAbove,
  );
  // Drawn only where a HEAS debt is owed: a plan with no HEAS loan gets no loan line and no legend entry,
  // the same rule the home loan follows (app-mortgage-headline's absence test).
  const heasOverlay = months.some((month) => (month.heasDebt ?? 0) > 0)
    ? [overlay('heasDebt', months.map((month) => (month.heasDebt ?? 0) as number))]
    : [];
  // Drawn only where a gift is still counted, on the HEAS line's own rule.
  const deprivedOverlay = months.some((month) => month.deprivedAssets !== undefined)
    ? [overlay('deprivedAssets', months.map((month) => (month.deprivedAssets ?? 0) as number))]
    : [];
  // Drawn only where cars and contents are stated, on the same rule.
  const personalOverlay = months.some((month) => month.personalAssets !== undefined)
    ? [overlay('personalAssets', months.map((month) => (month.personalAssets ?? 0) as number))]
    : [];
  return Object.freeze({
    months: Object.freeze(months.map((month) => month.month as string)),
    ageAxis: ageAxis(months, household),
    bands: Object.freeze([
      band('assessable', months.map((month) => month.assessableAssets as number)),
      band('protected', months.map((month) => month.protectedAssets as number)),
    ]) as readonly [WealthBand, WealthBand],
    overlays: Object.freeze(
      floor === undefined
        ? [overlay('accessible', months.map((month) => month.accessibleAssets as number)), ...heasOverlay, ...deprivedOverlay, ...personalOverlay]
        : [
            overlay('accessible', months.map((month) => month.accessibleAssets as number)),
            // Flat, and IN TODAY'S MONEY — `chartConfig.ts`'s `OVERLAY_LENS` is what puts it on the
            // month's own price level, and `belowFloor` below compares against exactly that curve.
            overlay('floor', months.map(() => floor.todaysMoney as number)),
            ...heasOverlay,
            ...deprivedOverlay,
            ...personalOverlay,
          ],
    ),
    thresholds: Object.freeze(
      months.some((month) => month.assetsTestThresholds !== undefined)
        ? [
            threshold('fullPensionUpTo', months.map((month) => month.assetsTestThresholds?.fullPensionUpTo ?? null)),
            threshold('noPensionAbove', months.map((month) => month.assetsTestThresholds?.noPensionAbove ?? null)),
          ]
        : [],
    ),
    markers: Object.freeze(markers),
    notes: Object.freeze(notes),
    // **THE TWO FLOOR FIELDS ARE PRESENT OR ABSENT TOGETHER, and absent is not `undefined`.** A key
    // set to `undefined` survives `Object.hasOwn` and is dropped by `JSON.stringify`, so the two
    // tests for "was a floor stated?" would give different answers. Spread, so there is no key.
    ...(floor === undefined
      ? {}
      : {
          floor: floor.todaysMoney as number,
          belowFloor: Object.freeze(
            months.map((month) => month.accessibleAssets < contingencyFloorAt(floor, month.month)),
          ),
        }),
    ...(aboveCutOff.includes(true) ? { aboveCutOff: Object.freeze(aboveCutOff) } : {}),
  });
};
