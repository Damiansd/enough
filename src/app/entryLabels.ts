// What the entry editor CALLS an entry type and a sell order. Pure, no DOM — the same split
// `ownerNames.ts` has with the form, and for the same reason: the label is decidable here and the
// DOM builder is not testable.
//
// ⚠️ **The stored value stays a CODE IDENTIFIER; only the label is plain English.** `EntryType` and
// `ParcelSelection` are the discriminants `plan.json` holds and `parsePlan` reads (`plan.ts`), so a
// file whose entries said "Spending change" would be refused at the door. Nothing here ever
// produces a value from a label: `value` is what is stored, `label` is what is read, and the file's
// shape is untouched by this file.
import type { EntryType, NonSuperInvestmentParams, ParcelSelection } from '../core/plan.js'; // `.js` is correct in a `.ts` file

/** One option of a selector: what the user reads, and what the file stores. */
export interface LabelledOption<T extends string> {
  readonly value: T;
  readonly label: string;
}

/**
 * Every entry type in plain words. `satisfies Record<EntryType, string>` is the point: a twentieth
 * name in `ENTRY_TYPES` breaks `tsc` here rather than reaching a screen as `NEW_THING`.
 *
 * The ten types this build cannot construct are labelled too — `parsePlan` refuses them at the
 * door so no loaded plan can show one, but exhaustiveness is what keeps that true tomorrow.
 */
export const ENTRY_TYPE_LABELS = {
  RETIRE: 'Retire',
  WORK_PATTERN_CHANGE: 'Change work hours and pay',
  SUPER_CONTRIBUTION: 'Salary sacrifice into super',
  LUMP_SUM_FROM_SUPER: 'Take a lump sum from super',
  // Plain English, no jargon (2026-09-22): banned words on screen are "TRIS", "item 106", "O65",
  // "grounds" and "Schedule 1" — the stored value and the code that reads it may use all five, but
  // a household reading this label never sees them.
  TTR_START: 'Start a transition to retirement pension',
  TRIS_EARLY_CONVERSION: 'This super account moved to the full pension early, on this date',
  TTR_RATE_CHANGE: 'Change how much a transition to retirement pension pays',
  INSURANCE_COVER_CHANGE: 'Change super insurance cover',
  // ⚠️ **NOT "refinance" (ruling, 2026-09-21).** The stored value is `MORTGAGE_REFINANCE` and does
  // not move — it is what `plan.json` holds and what `parsePlan` reads — but the word is misleading
  // on screen, because this one type also ORIGINATES a loan for a household that has none, and a
  // user taking out their first mortgage would never look under "refinance". The split between the
  // value and the label is exactly what this file is for.
  MORTGAGE_REFINANCE: 'Home loan — set or change the terms',
  // Corrected 2026-09-22 (P3-16a microtask 5) — this label was a placeholder from when the type was
  // declared but unspecified and never reached a screen. What the entry actually states: a date the
  // household is aiming for, checked against retirement — never a change to the loan's own terms.
  MORTGAGE_TARGET: 'Set a home loan payoff or offset target date',
  MORTGAGE_PAYOFF: 'Home loan — pay off in full',
  NON_SUPER_INVESTMENT: 'Buy or sell investments',
  RETURN_CHANGE: 'Change expected investment returns',
  SPEND_CHANGE: 'Spending change',
  ONE_OFF_EXPENSE: 'One-off expense',
  GIFT: 'Give money away',
  CONTRIBUTION_SPLIT: 'Move super contributions to your partner',
  SPOUSE_CONTRIBUTION: "Put money into your partner's super",
  DOWNSIZE: 'Move to a cheaper home',
  VACATE_HOME: 'Move out of the home',
  DOWNSIZER_CONTRIBUTION: 'Downsizer contribution to super',
  HEAS_DRAW: 'Borrow against the home — Home Equity Access Scheme',
  DEATH: 'Death',
  ILLNESS_SEPARATION: 'Live apart because of illness or care',
  ENTER_CARE: 'Move into aged care',
  SELL_HOME: 'Sell the home',
  RENT_OUT_HOME: 'Rent out the home',
  BUY_HOME: 'Buy a new home',
} as const satisfies Record<EntryType, string>;

/** What a row and a selector call an entry type. Total over `EntryType` by construction. */
export const entryTypeLabel = (type: EntryType): string => ENTRY_TYPE_LABELS[type];

/** The type selector's options, in the order the caller offers them. */
export const entryTypeOptions = (types: readonly EntryType[]): readonly LabelledOption<EntryType>[] =>
  types.map((type) => ({ value: type, label: entryTypeLabel(type) }));

/**
 * Which holding goes first when selling, in plain words. `satisfies Record<ParcelSelection, string>`
 * for the same reason as above — a fourth order added to the union fails the build.
 */
export const PARCEL_SELECTION_LABELS = {
  'oldest-first': 'Sell oldest first',
  'highest-cost-base-first': 'Sell the most expensive first',
  'lowest-cost-base-first': 'Sell the cheapest first',
} as const satisfies Record<ParcelSelection, string>;

/** What an entry that states no order shows. Absent means oldest first (`plan.ts`), and says so. */
export const NO_PARCEL_PREFERENCE_LABEL = 'Sell oldest first (the usual)';

export const parcelSelectionLabel = (selection: ParcelSelection): string => PARCEL_SELECTION_LABELS[selection];

/**
 * The buy/sell box, in plain words (P6-13's class, found on the entry form 2026-09-24). The key is
 * what `plan.json` stores in `direction`; `satisfies` makes a third direction fail the build.
 */
export const INVESTMENT_DIRECTION_LABELS = {
  buy: 'Buy — put cash into investments',
  sell: 'Sell — turn investments back into cash',
} as const satisfies Record<NonSuperInvestmentParams['direction'], string>;

export const INVESTMENT_DIRECTION_OPTIONS: readonly LabelledOption<NonSuperInvestmentParams['direction']>[] =
  (Object.keys(INVESTMENT_DIRECTION_LABELS) as readonly NonSuperInvestmentParams['direction'][]).map((value) => ({ value, label: INVESTMENT_DIRECTION_LABELS[value] }));

/**
 * The sell-order selector's options. The blank one is first and stores `''`, which the builder turns
 * into an ABSENT key rather than a stated order (`planEdits.ts`).
 */
export const PARCEL_SELECTION_OPTIONS: readonly LabelledOption<ParcelSelection | ''>[] = [
  { value: '', label: NO_PARCEL_PREFERENCE_LABEL },
  ...(Object.keys(PARCEL_SELECTION_LABELS) as readonly ParcelSelection[]).map((value) => ({ value, label: parcelSelectionLabel(value) })),
];

/**
 * **A super account as the page names it: counted from 1** (ruling, 2026-09-24). `plan.json` stores
 * a POSITION in `superInterests`, counted from 0, and that never changes; every place the page
 * shows one — the entry table, the month table, the settings panel's "Super account 1" — shows
 * the position plus one. The boxes that take one are typed the same way: `interestIndexAsTyped`
 * is this function's inverse.
 */
export const superAccountName = (position: number): string => `super account ${position + 1}`;
