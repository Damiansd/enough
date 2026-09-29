// P4-5d — **"WHEN DOES MY OWN MONEY STOP COVERING WHAT I WANT TO SPEND?", ANSWERED IN WORDS.** No
// DOM, no Chart.js, no canvas: this builds strings and `main.ts` puts them on the page, exactly as
// `mortgageHeadline.ts` does. Every claim in this header is an assertion in
// `test/app-income-headline.test.mjs`.
//
// **The gap this closes, in the user's own words:** *"the thing a person wants to know is 'when does
// super and pension stop covering the desired income'."* They had read the chart and found it
// disconcerting that the Age Pension did not appear to contribute to their income at all.
//
// ⚠️ **AND IT IS A SENTENCE RATHER THAN A CHART, ON PURPOSE.** The obvious answer to that question
// is an income stack — pension, salary, drawdowns, stacked against the spending line — and in THIS
// engine that picture is very nearly uninformative. The Income Waterfall funds each month by drawing
// whatever the month needs (`projection.ts`), so an income stack hugs the spending target by
// construction: flat, exactly on the line, for decades, and then it falls off a cliff. What the
// reader actually wants out of it is a DATE and a GAP, and both of those are better said than drawn.
// A chart is a separate, later piece of work and this file is not a step towards one.
//
// **THE DATE IS NOT DERIVED HERE.** `pensionOnlyAge` in `core/outcomes.ts` is *"the Household first
// opens a month with nothing but its pension"*, with the five conditions and the two things
// `assessableAssets === 0` is not, all of which are that module's rulings. This file reads its answer
// and says what it MEANS. It re-decides nothing about assets, cash or entitlement.
//
// ⚠️ **A COUPLE IS NEVER REDUCED TO ONE AGE, and this module has no way to do it.** A Household
// reaches this month TOGETHER — there is one Waterfall, one spending target and one balance — so the
// MONTH is in the lead sentence and is not per-Person. But the two people are different ages in that
// month, so `perPerson` holds one line per Person, in `household.persons` order, and there is no
// argument here that picks a Person or takes the younger. That is `AgeAtMonth.ages`'s own rule and
// `mortgageHeadline.ts`'s, for the same reason.
//
// **THE CASES, all of them, each with its OWN sentence and its own `kind`.** The list is the point
// of this module: a field that can be empty for six different reasons, rendered by a layer that
// collapses them, is how this repo has shipped a blank where an answer belonged. Each is a test.
//
//   1. **`ownMoneyLasts`** — no pension-only month AND no short month. The GOOD answer, and the
//      committed demo plan's actual one. Nothing here may be worn by case 3.
//   2. **`pensionOnlyShort`** — the headline case. The money is gone, the pension is all that comes
//      in, and it is less than the spending target. The gap is the figure the reader wants to feel.
//   3. **`moneyRunsShort`** — short months, and no pension-only month. A BAD outcome, and it must
//      never wear case 1's words. **Nothing here says why** there is no pension-only month, because
//      there are two reasons — assets remain, or no Age Pension is paid at all — and this module
//      cannot tell them apart without re-deciding `pensionOnlyAge`'s conditions. The pension note
//      (below) carries the second one for every case at once.
//   4. **`pensionOnlyCovers`** — the money is gone and the pension meets the spending target anyway.
//      A low spender, and the sentence must not imply hardship.
//   5. **`pensionOnlyNoTarget`** — the money is gone and the plan states no spending at all, so
//      there is no figure to measure the pension against. Not in the brief's list and reachable: a
//      plan with no `SPEND_CHANGE` emits no `Household spending` line, and a headline that printed
//      `$0 a year you plan to spend` would read as a plan that had answered the question.
//   6. **`notWorkedOut`** — `pensionOnlyAge` REFUSED. Narrowed on 2026-09-21 but not deleted: a walk
//      that BEGINS below the first determined Age Pension parameters still has no answer, because
//      §4.7 indexes forward from a published set and there is no table running backwards. The
//      refusal is caught and said in plain words; it is emphatically not a `'never'`.
//
// **AND THE ONE FACT THAT GOES ON EVERY CASE: how many months of the forecast are actually PAID a
// pension.** The demo couple is paid in 99 of its 501 months — they are means-tested out of it for
// most of the walk — so *"on the Age Pension alone"* can mean *"on very nearly nothing"*, and a
// Household that is never paid a cent of it must be told so whatever else its answer is. This is a
// COUNT of months carrying the line, not an entitlement calculation: the walk decided it.
//
// ⚠️ **PARTIAL ENTITLEMENT IS THE NORMAL CASE, so nothing here says "the full Age Pension"** or
// implies the maximum rate. The figure printed is the month's own pension line, annualised.
//
// **THE MONEY BASIS: the page's, stated on the face of the sentence.** Every figure goes through
// `moneyLens(basis, month)` keyed on the month it was read in, like every other figure on this page
// (ADR-0001, P2-7) — a sentence in the engine's raw cents beside a table in today's money is the
// mixed-basis screen `monthToRows.ts` exists to prevent. And the basis is NAMED in the sentence,
// because a bare "$31,754 a year" forty years out is not a figure anybody can judge.
//
// **THE FIGURES ARE ANNUAL, ROUNDED TO WHOLE DOLLARS, AND THE THREE OF THEM RECONCILE.** The pension
// is computed per fortnight inside the engine and the spending target per month; both are annualised
// ONCE here, at the edge, by multiplying the month's own line by 12 — which is exactly the convention
// `monthlyFromFortnightly` annualises at (26 ÷ 12, twelve months to the year). Cents are dropped
// because a figure that is already an annualisation of one month is not accurate to the cent and
// printing it as though it were would be a false precision; the word "about" says so. **The gap is
// subtracted from the ROUNDED figures and never from the raw ones**, so a reader who takes one
// printed number from another gets the third printed number.
//
// ⚠️ **THE SPENDING FIGURE IS NOT TOTAL OUTGOINGS, and where a loan is still being repaid this says
// so.** `SpendChangeParams.annualSpend` excludes the mortgage repayment by the user's own ruling of
// 2026-09-21 — the form asks for spending EXCLUDING it — so in a month that is still repaying, the
// household's real outgoings are the spending target PLUS the repayment, and the extra is said in its
// own sentence rather than folded into the target.
//
// ~~⚠️ **AND THE SPENDING TARGET IS FLAT IN THE ENGINE'S OWN FUTURE DOLLARS.** A `SPEND_CHANGE`
// states one figure and the walk emits a twelfth of it every month until another supersedes it —
// nothing indexes it. Shown in today's money it therefore SHRINKS the further out the marker month
// is ($150,000 a year stated in 2026 reads as $98,174 in 2043 at 2.5%), and a reader who typed
// $150,000 and is shown $98,174 will think the tool has lost their figure. So it is said out loud,
// and only where it can bite: the today's-money view, in a month that is not the one the plan is
// stated as at.~~
//
// ✅ **SUPERSEDED 2026-09-21 — register O85 is DECIDED (option (b)) and the warning is GONE.**
// `SpendChangeParams.annualSpend` is a REAL figure now: `project()` raises it to each month's price
// level through `core/priceLevel.ts`, the same expression the Contingency Floor uses. The reasoning
// above is kept rather than deleted because it is the argument that produced the ruling, and because
// it names the one thing this file must now hold to: **in the today's-money view the spending figure
// printed here IS the figure the user typed**, up to the twelfth-of-a-year rounding and the dropped
// cents, in EVERY month — the deflation and the indexation are the same factor, applied in opposite
// directions, and they cancel. `test/app-income-headline.test.mjs` asserts that agreement in place
// of the prose it used to assert. The paragraph deleted itself the day the figures stopped shrinking.
import { AGE_PENSION_LINE, HOUSEHOLD_SPENDING_LINE, MORTGAGE_INTEREST_LINE, MORTGAGE_PRINCIPAL_LINE } from '../core/projection.js'; // `.js` is correct in a `.ts` file — see tsconfig.json
import { MONEY_VIEW_PHRASE, moneyLens } from './todaysDollars.js';
import { agesAt, pensionOnlyAge, shortfallAge } from '../core/outcomes.js';
import { formatDollars, roundToDollar } from './displayMoney.js';
import { gapInWords } from './mortgageHeadline.js';
import type { AgeAtMonth, PersonAge } from '../core/outcomes.js';
import type { AgePensionIndexationSeries } from '../data/assumptions/settings.js';
import type { Cents } from '../core/money.js';
import type { Household } from '../core/household.js';
import type { Month } from '../core/plan.js';
import type { MoneyBasis } from './todaysDollars.js';

/**
 * Which of the six answers this is. Carried so that a renderer and a test can name the case rather
 * than matching on the prose, and so that rewording a sentence does not change what was decided.
 */
export type IncomeHeadlineKind =
  | 'ownMoneyLasts'
  | 'pensionOnlyShort'
  | 'pensionOnlyCovers'
  | 'pensionOnlyNoTarget'
  | 'moneyRunsShort'
  | 'notWorkedOut';

export interface IncomeHeadline {
  readonly kind: IncomeHeadlineKind;
  /** The one sentence that answers the question. Never empty, in any of the six cases. */
  readonly headline: string;
  /**
   * How old each Person is in the month the headline names, one line per Person in
   * `household.persons` order. Empty only where the headline names no month at all, which is the
   * refusal case — never because a Person was dropped.
   */
  readonly perPerson: readonly string[];
  /** The facts that qualify the headline, in reading order. Never contains an empty string. */
  readonly detail: readonly string[];
  /** What opens behind the headline's own ⓘ (P17-6); only where the headline has something folded away. */
  readonly headlineDetail?: string;
}

/** The month's own line, or nil where the walk emitted none. Read, never recomputed. */
const lineTotal = (month: Month, ...descriptions: readonly string[]): number =>
  month.lines
    .filter((line) => line.effect === 'cash' && descriptions.includes(line.description))
    .reduce((total, line) => total + line.amount, 0);

/** A monthly figure at a yearly rate — the one annualisation in this file. See the header. */
const perYear = (perMonth: number): number => perMonth * 12;

/** Whole dollars, through the page's one display formatter (`displayMoney.ts`). */
const dollars = (cents: number): string => formatDollars(cents);

/** The displayed figure, in whole dollars, as a NUMBER — so the gap can be subtracted from it. */
const shownCents = (basis: MoneyBasis, month: string, nominal: number): number =>
  roundToDollar(moneyLens(basis, month)(nominal as Cents));

/** `Dana will be 75.` One per Person, and there is no argument here that picks one of them. */
const agedThen = (age: PersonAge): string => `${age.name} will be ${age.age}.`;

/** How many months of the walk the Age Pension was actually paid in — a COUNT, not an entitlement. */
const monthsPaidAPension = (months: readonly Month[]): number =>
  months.filter((month) => month.lines.some((line) => line.description === AGE_PENSION_LINE)).length;

/**
 * **What the Household is told about how often it is paid at all**, on every one of the six answers.
 * Three readings, because "you end up on the Age Pension" means three different things depending on
 * which one holds, and the difference between them is the difference between a safety net and none.
 *
 * ⚠️ **NO REASON IS GIVEN FOR AN UNPAID MONTH, and the first draft of this gave one.** It said the
 * unpaid months were months *"what you own or earn keeps you above the limits Centrelink applies"* —
 * which is false for every month in which the Person is simply not old enough yet, and those are most
 * of the unpaid months in a plan written before retirement. The count is a fact the walk decided; the
 * reason is a second calculation this file is not doing.
 */
const pensionNote = (months: readonly Month[]): string => {
  const paid = monthsPaidAPension(months);
  if (paid === 0) {
    return (
      'You are paid no Age Pension at all in this forecast. Not one month of it pays you a cent.' +
      ' There is no pension underneath this plan.'
    );
  }
  if (paid === months.length) {
    return (
      `You are paid some Age Pension in every one of the ${months.length} months this forecast covers, though` +
      ' it is often a part payment rather than the full rate.'
    );
  }
  return `Some Age Pension in ${paid} of ${months.length} months, nothing in the rest — often a part payment, not the full rate.`;
};

/** `2043-11` plus how old everybody is — the lead's month, never one Person's. */
const monthOf = (at: AgeAtMonth): string => at.month;

/**
 * **THE ANSWER, and there is always one** — unlike `mortgageHeadline`, which returns `undefined` for
 * a Household with no loan. Every plan has a date at which its own money stops covering its spending,
 * or a stated reason there is no such date, and a blank here would be the screen declining to answer
 * the question the user asked of it.
 *
 * `months` is the walk, `household` the one it was run for, `series` the
 * `Settings.economicSeries.agePension` that walk was run with — positional and required, for
 * `pensionOnlyAge`'s own reason — and `basis` the page's money view.
 */
export const incomeHeadline = (
  months: readonly Month[],
  household: Household,
  series: AgePensionIndexationSeries | undefined,
  basis: MoneyBasis,
): IncomeHeadline => {
  const last = months[months.length - 1]?.month ?? '';
  const paid = pensionNote(months);

  // Case 6. The refusal is CAUGHT and said, never allowed to reach the page as an error and never
  // quietly turned into a `'never'` — `outcomes.ts` refuses precisely because a Pension-Only Age read
  // off an absent pension is a confident answer to a question the walk cannot answer.
  let pension;
  try {
    pension = pensionOnlyAge(months, household, series);
  } catch {
    return Object.freeze({
      kind: 'notWorkedOut',
      headline:
        'This forecast cannot tell you when your own savings and super stop covering your spending,' +
        ' because it starts before the earliest Age Pension rates we hold — so there are months in it' +
        ' where we would have to guess what the pension paid, and we will not guess.',
      perPerson: Object.freeze([]),
      detail: Object.freeze([
        'The rates are set by the government on a published date and carried forward from there; there' +
          ' is no way to run them backwards. Moving the date your figures are stated as at forward, or' +
          ' shortening the forecast, is what makes this answerable.',
        paid,
      ]),
    });
  }

  const short = shortfallAge(months, household);

  if (pension.outcome === 'never') {
    if (short.outcome === 'never') {
      // Case 1 — the good one, and the committed demo plan's own answer.
      return Object.freeze({
        kind: 'ownMoneyLasts',
        headline: `Your own savings and super cover everything you plan to spend, to ${last}, the end of the forecast.`,
        perPerson: Object.freeze(agesAt(household, months[months.length - 1]!).ages.map(agedThen)),
        detail: Object.freeze([paid]),
        headlineDetail: 'You never reach a month where the Age Pension is all you have.',
      });
    }
    // Case 3 — and it must not wear case 1's words. Nothing here explains WHY there is no
    // pension-only month; see the header.
    const first = short.firstShortfall!;
    return Object.freeze({
      kind: 'moneyRunsShort',
      headline:
        `From ${monthOf(first)} this plan asks for money it does not have. ` +
        (short.monthsShort === months.length
          ? `Every one of the ${months.length} months this forecast covers is short, starting with that one.`
          : `${short.monthsShort} of the ${months.length} months this forecast covers are short, and the first of them is that one.`),
      perPerson: Object.freeze(first.ages.map(agedThen)),
      detail: Object.freeze([
        short.recovered
          ? 'Some of the short months are followed by months that are covered again, so this is not one' +
            ' unbroken run — but a month the plan could not pay for is a month the plan did not work.'
          : 'Once it starts, it does not let up inside this forecast.',
        'This forecast never reaches a month where the Age Pension is the only money coming in. That is' +
          ' not good news here: it just means the shape of the shortfall is something other than' +
          ' savings running dry and a pension carrying you.',
        paid,
      ]),
    });
  }

  // Cases 2, 4 and 5 — the money is gone and the Age Pension is all that comes in.
  const at = pension.firstPensionOnly!;
  const month = months.find((each) => each.month === at.month)!;
  const detail: string[] = [];

  // How long it lasts, and whether anything ever comes in again.
  detail.push(
    pension.recoveredAt === undefined
      ? `It stays that way for ${gapInWords(pension.monthsPensionOnly)}, to ${last}, where this forecast stops.`
      : `It stays that way for ${gapInWords(pension.monthsPensionOnly)}, until ${monthOf(pension.recoveredAt)}, when` +
        ' money that is not the pension comes in again.',
  );

  // Case 8 of the brief: the two dates in either order, or the same month. Computed, never assumed —
  // `outcomes.ts` is explicit that there is no ordering between these two markers.
  if (short.outcome === 'never') {
    detail.push('Up to then, and after it, the plan pays for everything you ask of it.');
  } else {
    const first = short.firstShortfall!;
    const gap = months.findIndex((each) => each.month === at.month) - months.findIndex((each) => each.month === first.month);
    if (gap > 0) {
      detail.push(
        `Your spending had already outrun your money before that: ${monthOf(first)} is the first month this` +
          ` plan asks for money it does not have, ${gapInWords(gap)} earlier.`,
      );
    } else if (gap === 0) {
      detail.push('That is also the first month this plan asks for money it does not have.');
    } else {
      detail.push(
        `The pension stretches far enough for a while: the first month this plan asks for money it does` +
          ` not have is ${monthOf(first)}, ${gapInWords(-gap)} later.`,
      );
    }
  }

  // Still repaying a home loan in that month? Then the spending figure is not total outgoings, and
  // saying so is this file's job — `annualSpend` excludes the repayment by the user's own ruling.
  const repayment = perYear(lineTotal(month, MORTGAGE_INTEREST_LINE, MORTGAGE_PRINCIPAL_LINE));
  if (repayment > 0) {
    detail.push(
      `You are still repaying the home loan then. That is about ${dollars(shownCents(basis, at.month, repayment))} a` +
        ' year on top of the spending figure above, because the spending figure in this plan is what you' +
        ' spend apart from the loan.',
    );
  }

  // ~~The flat-target warning, and only where it can bite.~~ **Removed 2026-09-21 with the ruling on
  // register O85: the target is raised with prices now, so in today's money the figure above IS the
  // one the user typed and there is nothing left to warn about.** Nothing replaces it — a sentence
  // saying "this figure does rise with prices" would be telling the reader that a number they
  // recognise is the number they recognise.

  detail.push(paid);

  const perPerson = Object.freeze(at.ages.map(agedThen));
  const pensionShown = shownCents(basis, at.month, perYear(lineTotal(month, AGE_PENSION_LINE)));
  const spendNominal = perYear(lineTotal(month, HOUSEHOLD_SPENDING_LINE));
  const where = MONEY_VIEW_PHRASE[basis.view];

  // Case 5 — no spending target at all, so there is nothing to measure the pension against and a
  // printed `$0 a year you plan to spend` would read as an answer rather than as an absence.
  if (spendNominal === 0) {
    return Object.freeze({
      kind: 'pensionOnlyNoTarget',
      headline:
        `From ${monthOf(at)} your own savings and super are gone, and the Age Pension is the only money` +
        ` coming in — about ${dollars(pensionShown)} a year, ${where}. This plan sets out no spending of its` +
        ' own, so there is nothing here to measure that against.',
      perPerson,
      detail: Object.freeze(detail),
    });
  }

  const spendShown = shownCents(basis, at.month, spendNominal);
  // Case 4 — the pension covers it. No hardship is implied and no gap is printed, because there is
  // none to print.
  if (pensionShown >= spendShown) {
    return Object.freeze({
      kind: 'pensionOnlyCovers',
      headline:
        `From ${monthOf(at)} your own savings and super are gone, and the Age Pension is the only money` +
        ` coming in. It comes to about ${dollars(pensionShown)} a year, ${where}, and you plan to spend about` +
        ` ${dollars(spendShown)} a year — so the pension covers it.`,
      perPerson,
      detail: Object.freeze(detail),
    });
  }

  // Case 2 — the headline case, and the gap is the whole point of the sentence. It is subtracted
  // from the two figures as PRINTED, so the three of them add up on the page.
  return Object.freeze({
    kind: 'pensionOnlyShort',
    headline:
      `From ${monthOf(at)} your own savings and super are gone, and the Age Pension is the only money coming` +
      ` in — about ${dollars(pensionShown)} a year, ${where}, against the ${dollars(spendShown)} a year you plan` +
      ` to spend. That leaves you about ${dollars(spendShown - pensionShown)} a year short.`,
    perPerson,
    detail: Object.freeze(detail),
  });
};
