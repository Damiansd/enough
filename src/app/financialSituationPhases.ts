// P16-2 — **one headline sentence per phase, in Financial Situation, each carrying a small coloured
// phase label.** No DOM: this builds strings exactly as `incomeHeadline.ts`, `mortgageHeadline.ts`
// and `sustainableSpendHeadline.ts` do, and `main.ts` puts the words on the page. NOTHING here is
// decided a second time — every figure is read off the walk, off `retirementMonths` /
// `lifeStages.ts`'s own `enterCareMonths` (P16-1's own reading of the entries, reused rather than
// re-derived), or off the `SustainableSpend` search's own answer.
//
// **A PHASE THAT DOESN'T OCCUR GETS NO SENTENCE** — the absence rule `mortgageHeadline.ts`'s "no
// loan" case already keeps, extended to three phases instead of one:
//
//   * **Before retirement** and **Retirement** stand or fall TOGETHER, on whether anyone in the
//     Household has a `RETIRE` entry that reaches them at all (`retirementMonths`). `lifeStages.ts`'s
//     own ruling is that a Person with no `RETIRE` entry stays Working to the horizon — never
//     Retired — so a Household with nobody retiring never enters the Retired phase either, and
//     neither sentence has a month to be about.
//   * **Aged care** stands alone, on whether any `ENTER_CARE` entry exists at all.
//
// **BEFORE RETIREMENT — WHOSE MONTH, WHEN A COUPLE RETIRES APART.** The household's FIRST retirement
// month is the anchor (concept.md's own precedent for a household event: the earliest one that
// happens). Where every Person who retires does so in that same month, the sentence says "the
// household retires"; where only some of them do, it names the ones who do, on
// `mortgageHeadline.ts`'s own rule that a couple is never collapsed to one verdict when they differ.
//
// **RETIREMENT — THE SPENDING FIGURE IS THE EXISTING SEARCH'S, NEVER RE-RUN HERE.** `sustainableSpend`
// walks the whole forecast about eighteen times (`sustainableSpendHeadline.ts`'s own header) and this
// file is not the place that pays for a second one: `sustainableResult` is `undefined` until the user
// has pressed "Work out what I could spend" on THIS redraw, and the sentence says how to get a figure
// rather than printing a blank. Where the search refused, `result.reason` is the engine's own words,
// carried out unchanged (`sustainableSpendHeadline.ts`'s `candidateRefused` and `levelUnreadable`
// cases). The Age Pension start date is read off the walk ALREADY ON SCREEN — the first month any
// `AGE_PENSION_LINE` appears — independent of the search and of whichever spending level it settles
// on, because pairing the two would mean re-running `project()` a level this file never asked for.
//
// **AGED CARE — THE FIRST ENTER_CARE, WHERE MORE THAN ONE EXISTS.** `ENTER_CARE` is at most one per
// Person (`parsePlan`'s `checkEnterCares`), so a couple can hold two; this sentence is about the
// FIRST one to take effect, on the same "earliest household event" rule as the retirement sentence.
// A second Person entering care later is not a second Financial Situation sentence — it is a second
// row on the Life-stages strip (P16-1), which is the picture built for exactly that.
//
// ⚠️ **`W` IS THE FIRST FULL CARE YEAR'S FOUR COST LINES, SUMMED — NEVER A PREFIX MATCH.**
// `AGED_CARE_BASIC_FEE_LINE`, `AGED_CARE_HOTELLING_LINE`, `AGED_CARE_NCCC_LINE` and
// `AGED_CARE_DAP_LINE` are `flowSeries.ts`'s own `agedCareCosts` group, EXACT-MATCHED — the RAD
// payment and its refund are asset moves and are never in this sum (`flowSeries.ts`'s own header).
// Twelve months from the entry's own governing month (clamped to the walk's own end), each converted
// through ITS OWN month's lens and summed in cents — `flowSeries.ts`'s own rule for adding a year of
// figures that were never priced at one date.
import {
  AGED_CARE_BASIC_FEE_LINE,
  AGED_CARE_DAP_LINE,
  AGED_CARE_HOTELLING_LINE,
  AGED_CARE_NCCC_LINE,
  AGE_PENSION_LINE,
  firstDayOf,
} from '../core/projection.js'; // `.js` is correct in a `.ts` file — see tsconfig.json
import { ageAt } from '../core/household.js';
import { retirementMonths } from '../core/outcomes.js';
import { enterCareMonths } from './lifeStages.js';
import { formatDollars } from './displayMoney.js';
import { MONEY_VIEW_PHRASE, moneyLens } from './todaysDollars.js';
import { sustainableSpendHeadline } from './sustainableSpendHeadline.js';
import type { Cents } from '../core/money.js';
import type { Entry, Month } from '../core/plan.js';
import type { Household } from '../core/household.js';
import type { MoneyBasis } from './todaysDollars.js';
import type { SustainableSpend } from '../core/sustainableSpend.js';

export type FinancialSituationPhase = 'working' | 'retired' | 'care';

/** What each phase chip is CALLED — `lifeStages.ts`'s own words for the first two; the third carries who and from when. */
export const PHASE_SENTENCE_LABEL: Readonly<Record<'working' | 'retired', string>> = Object.freeze({
  working: 'Before retirement',
  retired: 'Retirement',
});

export interface PhaseSentence {
  readonly phase: FinancialSituationPhase;
  /** The small coloured chip's text — `PHASE_SENTENCE_LABEL`'s for the first two; the aged-care one names who. */
  readonly label: string;
  /** The one sentence that answers this phase's question. Never empty. */
  readonly headline: string;
  /** One further sentence of context; `undefined` where the headline is the whole of the answer. */
  readonly detail: string | undefined;
}

/** `flowSeries.ts`'s own `agedCareCosts` group, exact-matched — never `AGED_CARE_LINE_PREFIX`. */
const AGED_CARE_COST_LINES: readonly string[] = Object.freeze([
  AGED_CARE_BASIC_FEE_LINE,
  AGED_CARE_HOTELLING_LINE,
  AGED_CARE_NCCC_LINE,
  AGED_CARE_DAP_LINE,
]);

const yearOf = (month: string): number => Number(month.slice(0, 4));

/** Whole dollars, through the page's one display formatter. */
const dollars = (cents: number): string => formatDollars(cents);

/** A nominal figure through the row's own lens, at `month` — `mortgageHeadline.ts`'s own idiom. */
const shown = (basis: MoneyBasis, month: string, nominal: number): string => dollars(moneyLens(basis, month)(nominal as Cents));

/**
 * **BEFORE RETIREMENT — the household's own super and total wealth at its first retirement month.**
 * `undefined` where nobody retires (`retirementMonths` finds no month for anybody) — the absence rule
 * the header describes.
 */
const beforeRetirementSentence = (months: readonly Month[], household: Household, entries: readonly Entry[], basis: MoneyBasis): PhaseSentence | undefined => {
  const retirements = retirementMonths(months, household, entries);
  const retiring = retirements.filter((person) => person.month !== undefined);
  if (retiring.length === 0) return undefined;

  const firstMonth = retiring.reduce((earliest, person) => (person.month! < earliest ? person.month! : earliest), retiring[0]!.month!);
  const atFirst = retiring.filter((person) => person.month === firstMonth);
  const everyoneAtFirst = atFirst.length === household.persons.length;
  // The anchor Person for the sentence's own age — `household.persons` order, never "whoever is older".
  const anchor = household.persons.find((person) => atFirst.some((each) => each.name === person.name))!;
  const anchorAge = atFirst.find((each) => each.name === anchor.name)!.age!;
  const who = everyoneAtFirst ? 'the household retires' : `${atFirst.map((each) => each.name).join(' and ')} retires`;

  const month = months.find((each) => each.month === firstMonth)!;
  const superShown = shown(basis, firstMonth, month.superBalance);
  const totalWealth = (month.closingBalance + month.superBalance + month.closingNonSuperPortfolio + (month.radHeld ?? 0) - (month.heasDebt ?? 0)) as Cents;
  const totalShown = shown(basis, firstMonth, totalWealth);

  return Object.freeze({
    phase: 'working',
    label: PHASE_SENTENCE_LABEL.working,
    headline: `At ${anchorAge} you’ll have ${superShown} in super and ${totalShown} in total.`,
    detail:
      `Combined, ${firstMonth}, when ${anchor.name} turns ${anchorAge} and ${who} — ${MONEY_VIEW_PHRASE[basis.view]}.`,
  });
};

/** The first month any `AGE_PENSION_LINE` appears in the walk — presence, never an amount test. */
const firstAgePensionMonth = (months: readonly Month[]): string | undefined =>
  months.find((month) => month.lines.some((line) => line.description === AGE_PENSION_LINE))?.month;

/**
 * **RETIREMENT — what the household can spend, and when the Age Pension starts.** `undefined` where
 * nobody retires — `beforeRetirementSentence`'s own condition, so the two sentences appear and vanish
 * together.
 */
const retirementSentence = (
  months: readonly Month[],
  household: Household,
  entries: readonly Entry[],
  basis: MoneyBasis,
  sustainableResult: SustainableSpend | undefined,
): PhaseSentence | undefined => {
  const retirements = retirementMonths(months, household, entries);
  if (retirements.every((person) => person.month === undefined)) return undefined;

  const pensionMonth = firstAgePensionMonth(months);
  const pensionClause = pensionMonth === undefined ? 'this plan is never paid the Age Pension in this forecast' : `the Age Pension starts in ${yearOf(pensionMonth)}`;

  if (sustainableResult === undefined) {
    return Object.freeze({
      phase: 'retired',
      label: PHASE_SENTENCE_LABEL.retired,
      // P17-6: the button is right below; the sentence says only what is already known.
      headline: `${pensionClause.charAt(0).toUpperCase()}${pensionClause.slice(1)}.`,
      detail: undefined,
    });
  }

  if (sustainableResult.reason !== undefined) {
    return Object.freeze({
      phase: 'retired',
      label: PHASE_SENTENCE_LABEL.retired,
      headline: sustainableResult.reason,
      detail: undefined,
    });
  }

  if (sustainableResult.kind === 'headroom' || sustainableResult.kind === 'reduceSpending' || sustainableResult.kind === 'higherThanSearched') {
    const amount = shown(basis, sustainableResult.atMonth!, sustainableResult.sustainableAnnualSpend!);
    return Object.freeze({
      phase: 'retired',
      label: PHASE_SENTENCE_LABEL.retired,
      headline: `You can spend about ${amount} a year, and ${pensionClause}.`,
      detail: undefined,
    });
  }

  // `nothingToScale` / `nothingWorks` — no figure to state; `sustainableSpendHeadline` already says
  // why in plain words, and this does not re-decide it.
  return Object.freeze({
    phase: 'retired',
    label: PHASE_SENTENCE_LABEL.retired,
    headline: sustainableSpendHeadline(sustainableResult, months, household, entries, basis).headline,
    detail: undefined,
  });
};

/**
 * **AGED CARE — the first year's own cost lines, and the RAD that is refunded rather than spent.**
 * `undefined` where no `ENTER_CARE` entry exists at all.
 */
const agedCareSentence = (months: readonly Month[], household: Household, entries: readonly Entry[], basis: MoneyBasis): PhaseSentence | undefined => {
  const cares = enterCareMonths(months, household, entries);
  const indexOf = new Map(months.map((month, index) => [month.month as string, index]));

  // The FIRST `ENTER_CARE` to take effect — the household's own earliest such event, on the header's rule.
  let firstIndex = -1;
  let personIndex = -1;
  cares.forEach((month, index) => {
    if (month === undefined) return;
    const at = indexOf.get(month) ?? -1;
    if (at !== -1 && (firstIndex === -1 || at < firstIndex)) {
      firstIndex = at;
      personIndex = index;
    }
  });
  if (firstIndex === -1) return undefined;

  const person = household.persons[personIndex]!;
  const entryMonth = months[firstIndex]!.month;
  const owner = personIndex === 0 ? 'personA' : 'personB';
  const entry = entries.find((each) => each.enabled && each.type === 'ENTER_CARE' && each.owner === owner)!;
  const radPaidAsLumpSum = (entry.params as { readonly radPaidAsLumpSum: Cents }).radPaidAsLumpSum;
  const ageAtEntry = ageAt(person.dateOfBirth, firstDayOf(entryMonth));

  const lastIndex = Math.min(firstIndex + 11, months.length - 1);
  let costCents = 0;
  for (let index = firstIndex; index <= lastIndex; index += 1) {
    const month = months[index]!;
    const lens = moneyLens(basis, month.month);
    for (const line of month.lines) {
      if (AGED_CARE_COST_LINES.includes(line.description)) costCents += lens(line.amount as Cents);
    }
  }

  const costShown = dollars(costCents);
  const radShown = shown(basis, entryMonth, radPaidAsLumpSum);

  return Object.freeze({
    phase: 'care',
    label: `Aged care (${person.name} from ${ageAtEntry})`,
    headline: `About ${costShown} a year in care costs; the ${radShown} room deposit is refunded to the estate.`,
    detail:
      `In ${person.name}’s first year in care (${yearOf(entryMonth)}, ${MONEY_VIEW_PHRASE[basis.view]}): the basic` +
      ` daily fee, the hotelling contribution and the means-tested contributions together come to about` +
      ` ${costShown} a year. The ${radShown} Refundable Accommodation Deposit is not spent — it is held on` +
      ` ${person.name}’s behalf and paid back, less any retention, when ${person.name} dies.`,
  });
};

/**
 * **THE THREE SENTENCES, in reading order, each present only where its phase occurs.** `months` is
 * the walk currently on screen, `entries` the active Scenario's own resolved entries
 * (`retirementMonths`'s and `enterCareMonths`'s own requirement), `basis` the page's money view, and
 * `sustainableResult` the last search this redraw has run, or `undefined` if none has.
 */
export const financialSituationPhases = (
  months: readonly Month[],
  household: Household,
  entries: readonly Entry[],
  basis: MoneyBasis,
  sustainableResult: SustainableSpend | undefined,
): readonly PhaseSentence[] =>
  Object.freeze(
    [
      beforeRetirementSentence(months, household, entries, basis),
      retirementSentence(months, household, entries, basis, sustainableResult),
      agedCareSentence(months, household, entries, basis),
    ].filter((sentence): sentence is PhaseSentence => sentence !== undefined),
  );
