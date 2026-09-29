// P10-3 — **"HOW MUCH CAN WE ACTUALLY SPEND?", ANSWERED IN WORDS.** No DOM, no canvas: this builds
// strings and `main.ts` puts them on the page, exactly as `incomeHeadline.ts` and
// `mortgageHeadline.ts` do. Every claim in this header is an assertion in
// `test/app-sustainable-spend-headline.test.mjs`.
//
// **NOTHING IS DECIDED HERE.** `core/sustainableSpend.ts` runs the search, owns both refusals and
// owns the pass predicate; this file reads its answer and says what it MEANS. It re-decides nothing
// about money, and it invents no figure the search did not return.
//
// **THE CASES, all SEVEN of them, each with its OWN sentence and its own kind.** A field that can be
// empty for seven different reasons, rendered by a layer that collapses them, is how this repo has
// shipped a blank where an answer belonged. Each is a test:
//
//   1. **`headroom`** — funded at the plan's own spending, with room above it. Says by how much.
//   2. **`reduceSpending`** — not funded at the plan's own spending. Says the figure and the gap.
//   3. **`higherThanSearched`** — still funded at four times the stated level, which is where the
//      search stops. A figure IS stated, and it is stated as a floor and never as the answer.
//   4. **`nothingWorks`** — short even at a hundredth of the stated level, so spending is not what
//      is driving it. The plan needs something other than a smaller number.
//   5. **`candidateRefused`** — a walk inside the search refused. The engine's own words are carried
//      to the page rather than swallowed, and no figure is stated.
//   6. **`nothingToScale`** — the plan states no spending level, so there is nothing to scale. A
//      printed "$0 a year" would read as an answer.
//   7. **`levelUnreadable`** — the search read a different spending level from the one the forecast
//      spent. A canary, said out loud.
//
// **There were NINE on the morning of 2026-09-21 and there are SEVEN, and both of the missing two
// were refusals over engine defects that have since been fixed.** `firstYearDecides` refused every
// retired household whose plan was not written on 1 July, because the engine paid no pension
// minimum before the first full financial year (P10-5). `holdsInvestments` refused every plan
// holding a parcel, because a month funded by selling units was reported short by exactly the tax
// on that sale (P10-4). The engine pays the minimum and the sale funds its own tax, so there is
// nothing left to refuse in either case and the two are deleted rather than left standing.
//
// ⚠️ **THE FIGURE IS NOT TOTAL OUTGOINGS, and this says so wherever a home loan is still being
// repaid.** `SpendChangeParams.annualSpend` excludes the mortgage repayment by the user's ruling of
// 2026-09-21, so a household repaying a loan pays this figure PLUS the repayment. Stated in its own
// sentence rather than folded into the number, exactly as `incomeHeadline.ts` states it.
//
// ⚠️ **A COUPLE IS NEVER REDUCED TO ONE AGE.** Where the answer names the month it is limited by,
// every Person's age in that month is given, in `household.persons` order — `AgeAtMonth.ages`'s own
// rule, and `incomeHeadline.ts`'s and `mortgageHeadline.ts`'s.
//
// **THE MONEY BASIS.** Both figures are stated at `settings.asAtDate`, which is the walk's first
// month, so the today's-money view and the engine's own dollars are the SAME number here — the
// deflation factor at the basis month is exactly 1. They still go through `moneyLens(basis, month)`
// like every other figure on this page (ADR-0001, P2-7), because a figure that bypasses the lens is
// a figure that stops agreeing with the table the day the lens changes.
//
// **THE SHAPE OF THE PLAN IS KEPT, AND THAT IS SAID.** A plan with three spending levels is scaled
// by one factor on all three, so the answer is not "live on $61,800 for ever" — it is "everything
// you planned, at 74% of the figures you wrote". Where more than one level is stated, a sentence
// says so; a reader who saw one dollar figure and had written three would reasonably assume the tool
// had flattened their plan, which is the thing ADR-0004 forbids it from doing.
//
// ⚠️ **THE FIGURE ASSUMES THE AGE PENSION KEEPS RISING WITH WAGES, AND THAT IS SAID TOO (P13-1b).**
// `indexPensionRates` (`core/agePension.ts`) takes the BETTER of a prices-only rise and a
// wages-linked benchmark, `Math.max(indexed, benchmark)`, so the rate this engine pays can never be
// below what a prices-only rise would give and is, in the ordinary case where wages outrun prices,
// above it. A comparison against Aware Super's calculator found this the largest single assumption
// behind the figure — 92% of a 17.9% gap. Said only where a month in the walk this page is already
// showing actually pays the Age Pension: a household that never draws it is not affected by how the
// law grows a rate it never receives, and the sentence would be false for it.
import { MONEY_VIEW_PHRASE, moneyLens } from './todaysDollars.js'; // `.js` is correct in a `.ts` file — see tsconfig.json
import { AGE_PENSION_LINE, MORTGAGE_INTEREST_LINE, MORTGAGE_PRINCIPAL_LINE } from '../core/projection.js';
import { agesAt } from '../core/outcomes.js';
import { formatDollars, roundToDollar } from './displayMoney.js';
import type { Cents } from '../core/money.js';
import type { Entry, Month } from '../core/plan.js';
import { hasReachedAgePensionAge, type Household } from '../core/household.js';
import type { MoneyBasis } from './todaysDollars.js';
import type { PersonAge } from '../core/outcomes.js';
import type { SustainableSpend } from '../core/sustainableSpend.js';
import type { IsoDate } from '../data/assumptions/types.js';

export interface SustainableSpendHeadline {
  /** The kind the search returned, carried through so a test names the case and not the prose. */
  readonly kind: SustainableSpend['kind'];
  /** The one sentence that answers the question. Never empty, in any of the nine cases. */
  readonly headline: string;
  /** Each Person's age in the month the answer is limited by. Empty where no month is named. */
  readonly perPerson: readonly string[];
  /** The facts that qualify the headline, in reading order. Never contains an empty string. */
  readonly detail: readonly string[];
}

/** Whole dollars, through the page's one display formatter (`displayMoney.ts`). */
const dollars = (cents: number): string => formatDollars(cents);

/** The displayed figure, in whole dollars, as a NUMBER — so a difference can be taken from it. */
const shown = (basis: MoneyBasis, month: string, nominal: number): number =>
  roundToDollar(moneyLens(basis, month)(nominal as Cents));

/** `Dana will be 75.` One per Person, and there is no argument here that picks one of them. */
const agedThen = (age: PersonAge): string => `${age.name} will be ${age.age}.`;

/** `26% less` / `13% more` — the factor as a reader would say it, never as a decimal. */
const asPercentage = (factor: number): string =>
  factor >= 1 ? `${Math.round((factor - 1) * 100)}% more` : `${Math.round((1 - factor) * 100)}% less`;

/**
 * **THE ANSWER, and there is always one.** Nine kinds, nine sentences, and no branch that returns an
 * empty string: a search that could not answer says why it could not, in the same shape as a search
 * that did.
 *
 * `result` is what `sustainableSpend` returned, `months` the walk the page is already showing (read
 * only for whether a home loan is being repaid), `household` the one both were run for, and `basis`
 * the page's money view.
 */
export const sustainableSpendHeadline = (
  result: SustainableSpend,
  months: readonly Month[],
  household: Household,
  entries: readonly Entry[],
  basis: MoneyBasis,
): SustainableSpendHeadline => {
  const detail: string[] = [];
  const at = result.atMonth ?? months[0]?.month ?? '';
  const perPerson =
    // The page's own walk carries who has died by then (P12-1); a death's month is the same at any
    // spending level, so the solver's month is read off it.
    result.bindsAt === undefined
      ? []
      : agesAt(household, months.find((month) => month.month === result.bindsAt) ?? { month: result.bindsAt }).ages.map(agedThen);

  // The facts that qualify EVERY answer carrying a figure, gathered before the branches so that no
  // case can quietly ship without them.
  const levels = entries.filter((entry) => entry.type === 'SPEND_CHANGE' && entry.enabled).length;
  const repaying = months.some((month) =>
    month.lines.some(
      (line) => line.effect === 'cash' && (line.description === MORTGAGE_INTEREST_LINE || line.description === MORTGAGE_PRINCIPAL_LINE),
    ),
  );
  // P13-1b — only true where this walk actually pays the Age Pension somewhere; see the header.
  const paidInThisWalk = months.some((month) => month.lines.some((line) => line.effect === 'cash' && line.description === AGE_PENSION_LINE));
  // …OR it may be paid at the level the headline quotes. A HIGHER level (factor above 1) runs the savings
  // down faster, and that can bring a pension this walk never pays within reach. The solver keeps none
  // of its walks, so where anyone reaches Age Pension age inside the horizon, the caveat is said anyway.
  // Saying it once too often is the cautious error; leaving it out would flatter the figure.
  const lastMonth = months.at(-1)?.month;
  const reachableAtHigherLevel =
    (result.factor ?? 0) > 1 &&
    lastMonth !== undefined &&
    household.persons.some((person) => hasReachedAgePensionAge(person, `${lastMonth}-01` as IsoDate));
  const agePensionPaid = paidInThisWalk || reachableAtHigherLevel;
  const qualifications = (): readonly string[] => {
    const out: string[] = [];
    if (levels > 1) {
      out.push(
        `Your plan changes your spending ${levels} times, and this keeps that shape: every one of those figures moves` +
          ' by the same proportion. It is not a suggestion that you live on one flat amount for the rest of the plan.',
      );
    }
    if (repaying) {
      out.push(
        'This figure is what you spend APART FROM the home loan. While the loan is being repaid, the repayment comes' +
          ' on top of it, so your actual outgoings in those months are higher than the number above.',
      );
    }
    if (agePensionPaid) {
      out.push(
        'This assumes the Age Pension keeps rising with wages, as the law sets it. If it only rose with prices, this' +
          ' figure would be lower.',
      );
    }
    out.push(
      result.floorApplied
        ? 'Your contingency floor was part of this test: at this level you stay funded every month AND never dip below' +
            ' the buffer you set.'
        : 'You have not set a contingency floor, so this answer tests one thing only — that every month is paid for. It' +
            ' leaves nothing set aside on top of that. If you want a buffer held back, set one in the settings and ask' +
            ' again.',
    );
    return out;
  };

  /**
   * **What the answer is limited BY, and the two limbs get two different sentences.** A month that
   * cannot be paid for and a month whose reachable money dips under the buffer the user set are not
   * the same news, and a single sentence covering both would tell half of its readers the wrong
   * thing about their own plan.
   */
  const boundBy = (): string | undefined => {
    if (result.bindsAt === undefined) return undefined;
    return result.limitedBy === 'floor'
      ? `Spend more than that and by ${result.bindsAt} the money you could actually reach has dropped below the` +
          ' contingency floor you set. Every month is still paid for — it is the buffer that goes.'
      : `Spend more than that and ${result.bindsAt} is the first month this plan asks for money it does not have.`;
  };

  switch (result.kind) {
    case 'candidateRefused':
      return Object.freeze({
        kind: result.kind,
        headline:
          'This could not be worked out. Part way through trying spending levels, the forecast refused to run one of' +
          ' them, and no figure is worth showing you from a search that did not finish.',
        perPerson: Object.freeze([]),
        detail: Object.freeze([`What it said was: ${result.reason}`]),
      });

    case 'nothingToScale':
      return Object.freeze({
        kind: result.kind,
        headline:
          'This plan does not say what you spend, so there is no spending figure here to test. Add what you spend in a' +
          ' year and this can be answered.',
        perPerson: Object.freeze([]),
        detail: Object.freeze([]),
      });

    case 'levelUnreadable':
      return Object.freeze({
        kind: result.kind,
        headline: result.reason!,
        perPerson: Object.freeze([]),
        detail: Object.freeze([]),
      });

    case 'nothingWorks': {
      const bound = boundBy();
      return Object.freeze({
        kind: result.kind,
        headline:
          'There is no spending level this plan can afford. Even at a hundredth of what you have written down, a month' +
          ' in this forecast goes unpaid — so what is driving it is something other than how much you spend.',
        perPerson: Object.freeze(perPerson),
        detail: Object.freeze([
          ...(bound === undefined
            ? []
            : [
                result.limitedBy === 'floor'
                  ? `Your contingency floor is already broken by ${result.bindsAt} whatever you spend: the money you` +
                    ' can reach is under it from the start, so no spending figure can restore it.'
                  : `The first month that cannot be paid for is ${result.bindsAt}, and cutting your spending does not move it.`,
              ]),
          'Look at what money is reachable in that month rather than at the spending figure: money locked in super' +
            ' before a condition of release is met is not money this forecast can spend.',
        ]),
      });
    }

    case 'higherThanSearched': {
      const level = shown(basis, at, result.sustainableAnnualSpend!);
      return Object.freeze({
        kind: result.kind,
        headline:
          `Your plan is funded every month at ${dollars(level)} a year — four times what you have written down — and` +
          ' this search stops looking there. The most you could spend is somewhere above that, and this will not guess' +
          ' how far above.',
        perPerson: Object.freeze([]),
        detail: Object.freeze([
          `That is a floor and not the answer: it means the plan is comfortable, not that ${dollars(level)} is your` +
            ' limit.',
          ...qualifications(),
        ]),
      });
    }

    case 'headroom':
    case 'reduceSpending': {
      const stated = shown(basis, at, result.statedAnnualSpend!);
      const level = shown(basis, at, result.sustainableAnnualSpend!);
      const where = MONEY_VIEW_PHRASE[basis.view];
      const bound = boundBy();
      const headline =
        result.kind === 'headroom'
          ? `You could spend about ${dollars(level)} a year, ${where}, and still pay for every month of this forecast —` +
            ` ${asPercentage(result.factor!)} than the ${dollars(stated)} a year your plan states.`
          : `To pay for every month of this forecast you would have to spend about ${dollars(level)} a year, ${where} —` +
            ` ${asPercentage(result.factor!)} than the ${dollars(stated)} a year your plan states, about` +
            ` ${dollars(stated - level)} a year less.`;
      detail.push(...(bound === undefined ? [] : [bound]), ...qualifications());
      return Object.freeze({
        kind: result.kind,
        headline,
        perPerson: Object.freeze(perPerson),
        detail: Object.freeze(detail),
      });
    }
  }
};
