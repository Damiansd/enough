// The deprived-asset amount from `GIFT` entries — SS Act 1991 ss 1126AA-1126AD (register §4.12).
//
// A gift over the gifting free areas is a DEPRIVED ASSET: s 9(1) makes it a financial asset, so it
// is counted in the assets test AND deemed, for five years from the day of the gift. The free areas
// are $10,000 in a financial year (s 1126AA / s 1126AC) and $30,000 over the financial year of the
// gift and the four before it (s 1126AB / s 1126AD), the second net of what the first already
// included. Both are nominal and never indexed, and the included amount is held flat for its five
// years (rulings J5).
//
// **One pool per Household, and the household amount is the WHOLE excess (rulings J2, J3).** A
// couple shares one $10,000 and one $30,000 (s 1126AC(2): disposals by "the person, the person's
// partner, or the person and the person's partner"), and each partner carries half, so the two
// halves are the household's whole figure. The amounts already included are taken once, at the
// household figure. After a death the survivor carries a gift they gave (or gave jointly, a
// `household` gift) in full, and nothing of a gift the deceased gave alone (s 1126AC(4)-(5)).
//
// **A gift after the death month is a single person's (s 1126AA, s 1126AB).** Its free areas count
// the survivor's own earlier gifts in full and a joint (`household`) gift at one-half (s 1126AA(3)/
// AB(3)); the deceased's own no longer use them up. The s 1126AB(2)(b) subtraction takes what those
// same gifts put in the SURVIVOR's assets: one-half of a pre-death gift's included amount (a couple
// carries it one-half each), all of a post-death one. The deceased's own past inclusions are left
// out of that subtraction — the text could be read to take the survivor's half of them too, and
// leaving them out is the reading that cannot over-state the pension. Odd cents: a counted disposal
// halves UP, a subtracted inclusion halves DOWN — both to a lower pension.
//
// **Every gift counts (ruling J4).** None of the exceptions — s 1127(b) unforeseen circumstances,
// granny flat interests, s 1126E give-backs, Special Disability Trusts, inadequate consideration —
// is modelled: the direction is conservative, a lower pension.
//
// **Pre-plan gifts are read here, not through the walk's `applied` buckets.** A `GIFT` is an `event`
// (`ENTRY_KIND`), so one dated before `asAtDate` never reaches a month — but its deprived amount still
// runs out the rest of its five years (s 1127 drops only a disposal made more than five years before).

import { addCents, mulCents, subCents, toCents } from './money.js'; // `.js` is correct in a `.ts` file — see tsconfig.json
import type { Cents } from './money.js';
import { monthOf } from './forecastWindow.js';
import type { Entry, EntryOwner, IsoMonth } from './plan.js';
import type { IsoDate } from '../data/assumptions/types.js';
import { AGE_PENSION } from '../data/assumptions/agePension.js';

/** One gift's included amount and the months it is included in. */
export interface DeprivedGift {
  readonly entryId: string;
  readonly giver: EntryOwner;
  readonly date: IsoDate;
  readonly amount: Cents;
  /** s 1126AA/AC plus s 1126AB/AD, at the household figure. Nil where the gift sat inside both areas. */
  readonly deprived: Cents;
  /**
   * The first month-start it is counted on: the month AFTER the gift's (ruling J1). The walk assesses
   * on the 1st and reads the month's opening cash, which still holds the gift in its own month.
   */
  readonly from: IsoMonth;
  /** The fifth anniversary of the gift. Counted on every month-start strictly before it. */
  readonly until: IsoDate;
}

/** The financial year a date falls in, as the calendar year it ends in. */
const financialYearEnd = (date: IsoDate): number => {
  const year = Number(date.slice(0, 4));
  return Number(date.slice(5, 7)) >= 7 ? year + 1 : year;
};

const nextMonth = (month: IsoMonth): IsoMonth => {
  const year = Number(month.slice(0, 4));
  const monthNumber = Number(month.slice(5, 7));
  return (monthNumber === 12 ? `${year + 1}-01` : `${year}-${String(monthNumber + 1).padStart(2, '0')}`) as IsoMonth;
};

const lesser = (a: Cents, b: Cents): Cents => (a < b ? a : b);
const excessOver = (sum: Cents, freeArea: Cents): Cents => (sum > freeArea ? subCents(sum, freeArea) : toCents(0));
const sum = (amounts: readonly Cents[]): Cents => amounts.reduce<Cents>((total, amount) => addCents(total, amount), toCents(0));

/**
 * Every enabled `GIFT` in `entries`, with its included amount, in the order the gifts were made —
 * by date, then by the Scenario's own order for gifts on one day.
 */
export const deprivedGifts = (
  entries: readonly Entry[],
  death?: { readonly month: IsoMonth; readonly survivor: 0 | 1 },
): readonly DeprivedGift[] => {
  const annualFreeArea = AGE_PENSION.gifting.annualFreeArea.value;
  const rollingFreeArea = AGE_PENSION.gifting.rollingFreeArea.value;
  const years = AGE_PENSION.gifting.deprivationYears.value;
  const gifts = entries
    .filter((entry): entry is Extract<Entry, { type: 'GIFT' }> => entry.type === 'GIFT' && entry.enabled)
    .map((entry, order) => ({ entry, order }))
    .sort((a, b) => (a.entry.date < b.entry.date ? -1 : a.entry.date > b.entry.date ? 1 : a.order - b.order))
    .map(({ entry }) => entry);
  const made: DeprivedGift[] = [];
  for (const entry of gifts) {
    const amount = entry.params.amount;
    const year = financialYearEnd(entry.date);
    const survivor = death === undefined || monthOf(entry.date) <= death.month ? undefined : death.survivor === 0 ? 'personA' : 'personB';
    // Each earlier gift as it counts for THIS gift's test: its disposal and its included amount.
    const halfUp = (cents: Cents): Cents => mulCents(cents, 0.5);
    const halfDown = (cents: Cents): Cents => subCents(cents, halfUp(cents));
    const counted = made.flatMap((gift) => {
      if (survivor === undefined) return [{ date: gift.date, amount: gift.amount, deprived: gift.deprived }];
      if (gift.giver !== survivor && gift.giver !== 'household') return [];
      const preDeath = monthOf(gift.date) <= (death as { readonly month: IsoMonth }).month;
      return [{
        date: gift.date,
        amount: gift.giver === 'household' ? halfUp(gift.amount) : gift.amount,
        deprived: preDeath ? halfDown(gift.deprived) : gift.deprived,
      }];
    });
    const inYear = counted.filter((gift) => financialYearEnd(gift.date) === year);
    // s 1126AB(4) / s 1126AD(6): the income year of the gift and the four before it.
    const inRollingPeriod = counted.filter((gift) => financialYearEnd(gift.date) > year - years);
    const annual = lesser(amount, excessOver(addCents(sum(inYear.map((gift) => gift.amount)), amount), annualFreeArea));
    // s 1126AB(2)(b) / s 1126AD(2)(b): less every amount already included in the period, this gift's
    // annual amount among them, so a dollar is never included twice.
    const disposed = addCents(sum(inRollingPeriod.map((gift) => gift.amount)), amount);
    const included = addCents(sum(inRollingPeriod.map((gift) => gift.deprived)), annual);
    const rolling = lesser(amount, excessOver(subCents(disposed, included), rollingFreeArea));
    made.push(
      Object.freeze({
        entryId: entry.id,
        giver: entry.owner,
        date: entry.date,
        amount,
        deprived: addCents(annual, rolling),
        from: nextMonth(monthOf(entry.date)),
        until: `${Number(entry.date.slice(0, 4)) + years}${entry.date.slice(4)}` as IsoDate,
      }),
    );
  }
  return Object.freeze(made);
};

/**
 * The deprived amount the Household carries on `date`, a month-start. `survivor` is the position of
 * the Person who carries on after a death, absent while both live (or for a Household of one).
 */
export const deprivedAmountOn = (gifts: readonly DeprivedGift[], date: IsoDate, survivor?: 0 | 1): Cents =>
  sum(
    gifts
      .filter((gift) => monthOf(date) >= gift.from && date < gift.until)
      .filter((gift) => survivor === undefined || gift.giver === 'household' || gift.giver === (survivor === 0 ? 'personA' : 'personB'))
      .map((gift) => gift.deprived),
  );
