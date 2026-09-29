// P3-16 slice 3 (pure half) — **"AM I CLEAR BEFORE I RETIRE?", ANSWERED IN WORDS.** No DOM, no
// Chart.js, no canvas: this builds strings and `main.ts` puts them on the page, exactly as
// `monthToRows.ts` and `monthsToSeries.ts` build their own halves. Every claim in this header is an
// assertion in `test/app-mortgage-headline.test.mjs`.
//
// **The gap this closes, in the user's own words:** *"I manually trawled the months and saw the
// balance at 0 but didn't know where else to see it in the ui."* `Month.mortgageBalance` has
// reached every month since P3-16 slice 2 and nothing summarised it. A marker on the chart
// (`monthsToSeries.ts`) says WHEN; this says what it MEANS, which is the question that was asked —
// the payoff juxtaposed with retirement, never merely stated.
//
// ⚠️ **A COUPLE IS NEVER REDUCED TO ONE NUMBER, and this module has no way to do it.** Two people
// retire in different months, so *"before you retire"* has two answers. `perPerson` holds one
// sentence per Person, in `household.persons` order, and there is no argument here that picks a
// Person, averages two retirement dates or takes the earlier of them. That is the rule
// `outcomes.ts`'s `AgeAtMonth.ages` and `monthsToSeries.ts`'s `ageAxis` already keep, for the same
// reason: a sentence that silently chose one spouse would be describing a household event by one of
// the two people it happened to, and the reader has no way to tell which.
//
// **`headline` is the lead and `perPerson` is the evidence, and the lead never carries a figure a
// person's name is not attached to.** Where somebody still owes money when they retire, the amount
// is in THEIR sentence — not summed with the other's, not shown as the larger of the two.
//
// **THE CASES, all of them, each answered explicitly.** They are the seven the brief named plus one
// it did not, and each is a test:
//
//   1. **No loan at all** — `undefined` is returned, the page renders nothing, and a mortgage-free
//      plan is byte-identical to a build before this file existed. Absence is the only spelling of
//      "no loan" (`plan.ts`), so this is decided by `mortgagePayoff`'s `'noLoan'` and by nothing
//      else — never by a balance of zero.
//   2. **Paid off before retirement** — the happy case; the gap is said in years and months.
//   3. **Still owing at retirement** — the amount owed IN THAT PERSON'S OWN retirement month, first
//      thing in their sentence. This is the case the user is really asking about.
//   4. **Never repaid inside the forecast** — said plainly, with what is still owing in the last
//      month the forecast covers. No payoff date is invented and the chart draws no marker.
//   5. **Nobody retires** — there is nothing to compare against, so the payoff is stated ALONE and
//      the absence of a retirement date is said out loud rather than left as a missing clause.
//   6. **A loan that starts later** (`MORTGAGE_REFINANCE` origination) — the payoff is of THAT
//      loan, because the months before it carry no `mortgageBalance` key at all and a month with no
//      key is never read as a month in which the loan was clear. A Person who retires before the
//      loan begins is told that, and not told they are "clear".
//   7. **Paid off, then a new loan from a later date** — see `tail` below, and `outcomes.ts`'s
//      ruling on which payoff the marker means.
//   8. **ONE of a couple retires and the other has no `RETIRE` entry** — not in the brief's list
//      and a real plan: `retirementMonths` answers `undefined` for that Person, their sentence says
//      so, and the headline is decided on the Persons who do retire. The alternative — treating a
//      Household as "nobody retires" because one member has no date — would drop the answer for the
//      member who has one.
import { agesCaption } from './monthsToSeries.js'; // `.js` is correct in a `.ts` file — see tsconfig.json
import { formatDollars } from './displayMoney.js';
import { moneyLens } from './todaysDollars.js';
import { mortgagePayoff, mortgageTargets, retirementMonths } from '../core/outcomes.js';
import type { Cents } from '../core/money.js';
import type { Entry, Month } from '../core/plan.js';
import type { Household } from '../core/household.js';
import type { MoneyBasis } from './todaysDollars.js';

/**
 * Which of the answers this is. Carried so that a renderer and a test can name the case rather than
 * matching on the prose, and so that rewording a sentence does not change what the module decided.
 */
export type MortgageHeadlineKind = 'clear' | 'stillOwing' | 'paidOffNoRetirement' | 'neverRepaid';

export interface MortgageHeadline {
  readonly kind: MortgageHeadlineKind;
  /** The one sentence that answers the question. Never empty. */
  readonly headline: string;
  /** One sentence per Person, in `household.persons` order. Empty only where nobody retires. */
  readonly perPerson: readonly string[];
  /**
   * The fact that belongs to neither the lead nor any one Person: money still owed at the end of the
   * forecast. Present whenever the loan is not clear in the last month that reports one — including
   * the case the lead calls good news, where the house was paid off before retirement and the plan
   * borrows again afterwards. `undefined` where the loan ends clear.
   */
  readonly tail: string | undefined;
}

/** `6 years and 2 months`, `4 months`, `the same month`. Plain words, no decimals, no "0 years". */
export const gapInWords = (months: number): string => {
  if (months <= 0) return 'the same month';
  const years = Math.floor(months / 12);
  const rest = months % 12;
  const yearPart = years === 1 ? '1 year' : `${years} years`;
  const monthPart = rest === 1 ? '1 month' : `${rest} months`;
  if (years === 0) return monthPart;
  return rest === 0 ? yearPart : `${yearPart} and ${monthPart}`;
};

/**
 * **What a Person's retirement month is CALLED, and it always carries their name and their age.**
 * `2040-01` alone is a date a reader has to count back from; `Dana retires in 2040-01, aged 72` is
 * the sentence they would say. The month is the `YYYY-MM` the rest of this page uses (the caption,
 * the marker captions, the month table), so no second date format is invented here.
 */
const retiresIn = (name: string, month: string, age: number): string => `${name} retires in ${month}, aged ${age}`;

/** Whole dollars (`displayMoney.ts`) through the row's own lens — see the money note on `mortgageHeadline`. */
const money = (basis: MoneyBasis, month: string, cents: number): string =>
  formatDollars(moneyLens(basis, month)(cents as Cents));

/**
 * **THE ANSWER, or `undefined` where there is no loan to answer about.**
 *
 * `months` is the walk, `entries` the entries THAT walk was run from (a Scenario's resolved entries
 * — `scenarioWalks.ts` — never the pool), and `basis` the page's money view.
 *
 * ⚠️ **EVERY DOLLAR FIGURE GOES THROUGH THE ROW'S OWN LENS**, `moneyLens(basis, month)`, keyed on
 * the month the figure was read in — the retirement month for an amount owed at retirement, the
 * last reported month for the tail. Today's money is the page default, so a sentence that printed
 * the engine's raw cents would put a future amount in the middle of a page of today's ones, which
 * is the mixed-basis row `monthToRows.ts`'s header exists to prevent. Month 0 converts to itself,
 * so a fixture that proves this must use a LATER month.
 */
export const mortgageHeadline = (
  months: readonly Month[],
  household: Household,
  entries: readonly Entry[],
  basis: MoneyBasis,
): MortgageHeadline | undefined => {
  const payoff = mortgagePayoff(months, household);
  // Case 1, and the whole of it. Not `owedAtHorizon === 0`, not "no mortgage line anywhere": the
  // engine's own answer for "this Household has no loan", which is absence of the key.
  if (payoff.outcome === 'noLoan') return undefined;

  const balances = months.map((month) => month.mortgageBalance);
  const indexOf = new Map(months.map((month, index) => [month.month as string, index]));
  const firstLoanIndex = balances.findIndex((balance) => balance !== undefined);
  const retirements = retirementMonths(months, household, entries);

  // P17-6: a couple retiring in the same month owes the same loan on the same day, so they get one
  // sentence naming both rather than two that differ only in the name.
  const first = retirements[0];
  const together =
    retirements.length > 1 &&
    retirements.every((person) => person.month !== undefined && person.age !== undefined && person.month === first?.month);
  const speakers = together
    ? [{
        name: retirements.map((person) => person.name).join(' and '),
        month: first?.month,
        age: first?.age,
        said: `${retirements.map((person) => person.name).join(' and ')} retire in ${first?.month}, aged ${retirements.map((person) => person.age).join(' and ')}`,
      }]
    : retirements.map((person) => ({
        ...person,
        said: person.month === undefined || person.age === undefined ? '' : retiresIn(person.name, person.month, person.age),
      }));

  const perPerson: string[] = [];
  let anyoneOwing = false;
  let anyoneRetires = false;
  for (const person of speakers) {
    if (person.month === undefined || person.age === undefined) {
      // Case 8. Said, not skipped: a blank where a sentence should be reads as an oversight.
      perPerson.push(`${person.name} has no retirement date in this plan, so there is nothing to compare the loan with.`);
      continue;
    }
    anyoneRetires = true;
    const at = indexOf.get(person.month);
    const owed = at === undefined ? undefined : balances[at];
    const said = person.said;
    if (at === undefined || owed === undefined) {
      // Case 6 from the retiring Person's side. They are NOT "clear": the loan has not started yet,
      // and calling that clear would answer a different question in the flattering direction.
      const starts = firstLoanIndex === -1 ? undefined : months[firstLoanIndex]?.month;
      perPerson.push(
        `${said}, and there is no home loan yet — the loan in this plan does not start until ${starts ?? 'later'}.`,
      );
      continue;
    }
    if (owed === 0) {
      // Back to the start of the run of nil months this retirement sits in — the payoff that made
      // THIS Person clear, which in a plan that borrows again is not necessarily the first one.
      let since = at;
      while (since > 0 && balances[since - 1] === 0) since -= 1;
      perPerson.push(
        `${said}, with the home loan already paid off — it was clear in ${months[since]?.month}, ${gapInWords(at - since)} earlier.`,
      );
      continue;
    }
    // Case 3, and the amount comes FIRST in the clause that matters.
    anyoneOwing = true;
    const later = balances.findIndex((balance, index) => index > at && balance === 0);
    const after =
      later === -1
        ? ` It is still not paid off by ${payoff.lastReported}, the last month this forecast covers.`
        : ` It is not paid off until ${months[later]?.month}, ${gapInWords(later - at)} after that.`;
    perPerson.push(`${said}, with ${money(basis, person.month, owed)} still owing on the home loan.${after}`);
  }

  const owedAtEnd = payoff.owedAtHorizon ?? 0;
  const tail =
    payoff.outcome === 'clear' || payoff.lastReported === undefined
      ? undefined
      : `${money(basis, payoff.lastReported, owedAtEnd)} is still owing on the home loan in ${payoff.lastReported}, the last month this forecast covers.`;

  // Case 5 — nobody has a retirement date, so the payoff is stated alone rather than compared with
  // a date this plan does not hold. Cases 4 and 5 can both be true at once, and the never-repaid
  // reading wins: there is no payoff to state.
  if (!anyoneRetires) {
    // The per-Person sentences are DROPPED here, and only here. Each of them would say "X has no
    // retirement date in this plan", which is exactly what the headline has just said once about
    // the Household — the same fact spelled `persons.length + 1` times on one screen. Where only
    // SOME of a couple retire the sentence stays, because then it is the difference between them.
    perPerson.length = 0;
    if (payoff.clearForGood === undefined) {
      return Object.freeze({
        kind: 'neverRepaid',
        headline: 'Your home loan is never paid off inside this forecast — it is still being repaid in the last month shown.',
        perPerson: Object.freeze(perPerson),
        tail,
      });
    }
    return Object.freeze({
      kind: 'paidOffNoRetirement',
      headline:
        `Your home loan is paid off in ${agesCaption(payoff.clearForGood)}. Nobody retires in this plan,` +
        ' so there is no retirement date here to compare that with.',
      perPerson: Object.freeze(perPerson),
      tail,
    });
  }

  if (anyoneOwing) {
    return Object.freeze({
      kind: 'stillOwing',
      headline: 'Your home loan is NOT paid off before you retire.',
      perPerson: Object.freeze(perPerson),
      tail,
    });
  }
  return Object.freeze({
    kind: 'clear',
    headline: 'Your home loan is paid off before you retire — nothing is owed on it by then.',
    perPerson: Object.freeze(perPerson),
    tail,
  });
};

/**
 * **P3-16a — one sentence per `MORTGAGE_TARGET` entry, mirroring `mortgageHeadline`'s own shape.**
 *
 * ⚠️ **THIS IS NOT A VERDICT ON THE LOAN, AND THAT IS THE WHOLE DIFFERENCE FROM THE FUNCTION
 * ABOVE.** `mortgageHeadline` checks whether the loan the ENGINE computes is actually clear by
 * retirement; this checks nothing about the loan at all — `mortgageTargets` never reads
 * `Month.mortgageBalance` — it states a date the user picked and says plainly whether each Person's
 * own retirement falls before or after it (concept.md §5.12: *"changes no arithmetic"*). So there
 * is no "good news"/"bad news" framing here: `headline` states the target plainly and `perPerson`
 * says where each Person's retirement falls against it, never which is better.
 *
 * ⚠️ **A COUPLE IS NOT COLLAPSED TO ONE VERDICT, on `mortgageHeadline`'s own precedent.** One
 * target date can fall before one Person's retirement and after the other's, so there is no single
 * "met"/"not met" this function could report without silently picking a Person — `perPerson` is
 * the whole of the answer for each of them, exactly as `mortgageHeadline.perPerson` is.
 *
 * `months` and `entries` must be the walk and the Scenario's resolved entries it was read off from
 * — `retirementMonths`'s own requirement, restated here rather than assumed.
 */
export type MortgageTargetHeadlineLine = { readonly name: string; readonly sentence: string };

export interface MortgageTargetHeadline {
  readonly entryId: string;
  /** States the target date alone — never a verdict, on the doc above. */
  readonly headline: string;
  /** One sentence per Person, in `household.persons` order — `retirementMonths`'s own order. */
  readonly perPerson: readonly MortgageTargetHeadlineLine[];
  /**
   * **The one line here that reads the loan (2026-09-23, user ruling).** Non-null exactly when the
   * walk still has money owing at the END of the target month. A target is a date and nothing
   * more: it moves no money, and a user who set one beside a lump sum from super believed the loan
   * would be cleared by it — the forecast carried the loan on for years and nothing on the page said
   * so. This is a FACT about the walk, not a verdict: the target may mean "covered by the Offset",
   * so the sentence says what is owing and what would clear it, and does not call the target missed.
   * Null when the loan is clear then, when no loan is in force that month (no `mortgageBalance`
   * key), and when the target falls outside the walk.
   */
  readonly stillOwing: string | null;
}

export const mortgageTargetHeadlines = (
  months: readonly Month[],
  household: Household,
  entries: readonly Entry[],
  basis: MoneyBasis,
): readonly MortgageTargetHeadline[] => {
  const retirements = retirementMonths(months, household, entries);
  const owingAt = (month: string): number | undefined => months.find((m) => m.month === month)?.mortgageBalance;
  return Object.freeze(
    mortgageTargets(entries, retirements).map((comparison) => {
      const owing = owingAt(comparison.month);
      return Object.freeze({
        entryId: comparison.entryId,
        headline: `This plan aims to have the home loan cleared, or covered by the Offset, by ${comparison.month}.`,
        stillOwing:
          owing === undefined || owing <= 0
            ? null
            : `At the end of ${comparison.month} the loan still has ${money(basis, comparison.month, owing)} owing — this target date moves no money, and nothing in this plan pays the loan off by then. To clear it, add a “Home loan — pay off in full” entry dated that month.`,
        perPerson: Object.freeze(
          comparison.perPerson.map(({ name, outcome }) => {
            if (outcome === 'noRetirementDate') {
              return Object.freeze({
                name,
                sentence: `${name} has no retirement date in this plan, so there is nothing to compare this target with.`,
              });
            }
            const direction = outcome === 'retiresBeforeTarget' ? 'before' : 'after';
            return Object.freeze({ name, sentence: `${name}'s plan currently has them retiring ${direction} that.` });
          }),
        ),
      });
    }),
  );
};
