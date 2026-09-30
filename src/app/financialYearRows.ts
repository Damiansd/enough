// P7-UX-1 — the month table grouped into Australian financial years (July–June), as plain display
// data. No DOM: `renderTable.ts` writes what this returns, exactly as it does for `MonthRow`.
//
// **Flows are SUMMED over the year's months; stocks are READ from its last month.** The same rule as
// the connector's summariser (`chat/tools/financialYearSummary.ts`), and the same grouping —
// `groupByFinancialYear` in `core/financialYear.ts` is the one both use.
//
// **Each month's flow goes through ITS OWN month's lens, in cents, and the year is the sum of those
// cents, rounded to the dollar once.** So a year row is exactly the months under it added up — in
// today's money as well as in future dollars — and never twelve rounded dollars re-added. The stocks
// are the last month's own figures, so Total wealth = Closing + Total super + Investments holds on a
// year row for the reason it holds on that month's.
//
// **P3-4b slice 2 — each Person's concessional cap room, READ from the year's last month and never
// worked out here.** `Month.concessionalCapByPerson` is the walk's own answer (its ledger, its
// $500,000 test, its oldest-first order); this file formats it and decides nothing about the law.
// Whole dollars, rounded DOWN, and in the year's own dollars whatever the money view: a cap is a
// nominal amount set by law, and the catch-up it offers is written in those dollars too.
import { groupByFinancialYear, financialYearOfMonth } from '../core/financialYear.js'; // `.js` is correct in a `.ts` file — see tsconfig.json
import { formatDollars } from './displayMoney.js';
import { ageAxis } from './monthsToSeries.js';
import { ENTRY_IDS_AS_NAMES, HOUSEHOLD_ASSETS, agePensionPaid, monthToRow, net } from './monthToRows.js';
import { moneyLens } from './todaysDollars.js';
import type { AssetsView, EntryNamer, MonthRow } from './monthToRows.js';
import type { MoneyBasis } from './todaysDollars.js';
import type { Cents } from '../core/money.js';
import type { Household } from '../core/household.js';
import type { ConcessionalCapHeadroom, Month } from '../core/plan.js';
import type { FinancialYear } from '../data/assumptions/types.js';
import { SUPERANNUATION } from '../data/assumptions/super.js';

/** One Person's catch-up room for a year, as the year row shows it. */
export interface CatchUpRoomCell {
  /** Position in `household.persons`. */
  readonly person: number;
  /** `$12,340 unused · oldest expires 2030-31`, `closed · …`, or `''` where the year has no cap. */
  readonly text: string;
  /** What "Add a catch-up" would sacrifice for the year, in whole-dollar cents; `null` where nothing is offered. */
  readonly offer: Cents | null;
  /** What the button says it will do, in words; `''` where nothing is offered. */
  readonly offerTitle: string;
}

/** The button's words. The column's heading and its ⓘ are `renderTable.ts`'s. */
export const CATCH_UP_BUTTON = 'Add a catch-up';


export interface YearRow {
  readonly financialYear: FinancialYear;
  /** `2027-28`, or `2026-27 (from Sep)` / `2066-67 (to Mar)` for a year the walk does not cover in full. */
  readonly label: string;
  readonly partial: boolean;
  /**
   * Every Person's age on the first day of the year's first month, in `household.persons` order and
   * in the age axis's own words: `58 (Dana) · 66 (Ash)`, with `died` or `not yet born` in a
   * Person's place. Never one Person for a couple.
   */
  readonly ages: string;
  /** The first month's opening. */
  readonly openingBalance: string;
  /** Sums of the months' figures, each month through its own lens, in cents, rounded once. */
  readonly cashNet: string;
  readonly incomeFromSuper: string;
  readonly agePension: string;
  /** The last month's own figures. */
  readonly closingBalance: string;
  readonly superBalance: string;
  readonly investments: string;
  readonly totalWealth: string;
  /** P3-4b slice 2: one cell per Person, in `household.persons` order. */
  readonly catchUpRoom: readonly CatchUpRoomCell[];
  readonly months: readonly MonthRow[];
}

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] as const;

export const monthName = (month: string): string => MONTH_NAMES[Number(month.slice(5, 7)) - 1] ?? month;

/** Exported for `flowSeries.ts` — the second chart's own partial-year labelling reuses this rather than rewording it (P9-2b gate condition 5). */
export const yearLabel = (financialYear: FinancialYear, first: string, last: string): string => {
  const fromStart = first.endsWith('-07');
  const toEnd = last.endsWith('-06');
  if (fromStart && toEnd) return financialYear;
  if (toEnd) return `${financialYear} (from ${monthName(first)})`;
  if (fromStart) return `${financialYear} (to ${monthName(last)})`;
  return `${financialYear} (${monthName(first)} to ${monthName(last)})`;
};

/** `58 (Dana) · 66 (Ash)` — `chartConfig.ts`'s `agesTooltipTitle` pieces, for a year. */
const agesText = (month: Month, household: Household): string => {
  const axis = ageAxis([month], household);
  const labels = axis.labels[0] ?? [];
  return labels.map((label, person) => `${label} (${axis.personNames[person]})`).join(' · ');
};

const wholeDollarsDown = (cents: Cents): Cents => (Math.floor(cents / 100) * 100) as Cents;

/** The words for one Person's cap room, off the Month field alone. */
export const catchUpRoomText = (cap: ConcessionalCapHeadroom | null): string => {
  if (cap === null) return '';
  if (cap.closedByTotalSuperBalance) {
    return cap.totalSuperBalance === null
      ? 'closed · 30 June balance not stated'
      : `closed · super ${formatDollars(SUPERANNUATION.carryForward.totalSuperBalanceTest.value)} or more`;
  }
  const unused = `${formatDollars(wholeDollarsDown(cap.remaining))} unused`;
  return cap.oldestUnusedUsableUntil === null ? unused : `${unused} · oldest expires ${cap.oldestUnusedUsableUntil}`;
};

/**
 * **The catch-up a year can take, sized by the walk and never by this file (ADR-0004: offered,
 * never bound).** The year's last month holds what the forecast's own contributions for the WHOLE
 * year — the Guarantee and any sacrifice already planned — left of the total cap; that, rounded down
 * to whole dollars, is the offer, so the year stays inside the cap. Only for a year walked whole
 * from 1 July (a one-year arrangement starting then), with carried-forward room open, and for a
 * Person contributing that year at all: with no pay there is nothing to sacrifice from.
 */
export const catchUpOffer = (group: readonly Month[], person: number): Cents | null => {
  const first = group[0];
  const last = group.at(-1);
  if (first === undefined || last === undefined || group.length !== 12 || !first.month.endsWith('-07')) return null;
  const cap = last.concessionalCapByPerson[person] ?? null;
  if (cap === null || cap.closedByTotalSuperBalance || cap.carriedForwardAvailable <= 0 || cap.usedSoFar <= 0) return null;
  const offer = wholeDollarsDown(cap.remaining);
  return offer > 0 ? offer : null;
};

const summed = (group: readonly Month[], basis: MoneyBasis, figure: (month: Month) => Cents): string =>
  formatDollars(group.reduce((sum, month) => sum + moneyLens(basis, month.month)(figure(month)), 0));

/** One row per financial year the walk touches, earliest first, each holding its months' own rows. */
export const financialYearRows = (
  months: readonly Month[],
  basis: MoneyBasis,
  household: Household,
  view: AssetsView = HOUSEHOLD_ASSETS,
  name: EntryNamer = ENTRY_IDS_AS_NAMES,
): readonly YearRow[] =>
  Object.freeze(
    groupByFinancialYear(months).map((group) => {
      const first = group[0] as Month;
      const last = group.at(-1) as Month;
      const rows = Object.freeze(group.map((month) => monthToRow(month, basis, view, name)));
      const firstRow = rows[0] as MonthRow;
      const lastRow = rows.at(-1) as MonthRow;
      return Object.freeze({
        financialYear: financialYearOfMonth(first.month),
        label: yearLabel(financialYearOfMonth(first.month), first.month, last.month),
        partial: group.length < 12,
        ages: agesText(first, household),
        openingBalance: firstRow.openingBalance,
        cashNet: summed(group, basis, (month) => net(month.lines, 'cash')),
        incomeFromSuper: summed(group, basis, (month) => month.incomeFromSuper),
        agePension: summed(group, basis, (month) => agePensionPaid(month.lines)),
        closingBalance: lastRow.closingBalance,
        superBalance: lastRow.superBalance,
        investments: lastRow.investments,
        totalWealth: lastRow.totalWealth,
        catchUpRoom: Object.freeze(household.persons.map((person, index): CatchUpRoomCell => {
          const text = catchUpRoomText(last.concessionalCapByPerson[index] ?? null);
          const offer = catchUpOffer(group, index);
          return Object.freeze({
            person: index,
            text: text === '' || household.persons.length === 1 ? text : `${person.name}: ${text}`,
            offer,
            offerTitle: offer === null
              ? ''
              : `Adds a salary sacrifice of ${formatDollars(offer)} for ${financialYearOfMonth(first.month)} only, 1 July to 1 July, ` +
                'for this scenario. Saved only if the forecast accepts it.',
          });
        })),
        months: rows,
      });
    }),
  );
