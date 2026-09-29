// P4-5 / P4-6 / P3-16 — **Shortfall Age**, **Pension-Only Age**, the **Contingency Floor** and the
// **home loan payoff**, read off the walk `project()` already produced.
//
// The fourth arrived on 2026-09-21 and is the plainest of them: `mortgagePayoff` compares one field
// with zero. It brought one thing none of the others has — `retirementMonths`, which reads the walk's
// own `appliedEntryIds` rather than the plan's entry dates, so that *"am I clear before I retire?"*
// can be answered without this file re-deciding when a retirement takes effect.
//
// The third arrived on 2026-09-18 and is the same kind of thing as the first two: a pure function
// over `Month[]` that computes nothing about money. It differs in one way worth naming here — it is
// the only one of the three that reads a figure added to `Month` FOR it (`accessibleAssets`), because
// the money a Household can reach is not derivable from the means-test split. See
// `contingencyFloorBreach` for the ruling that made that widening necessary.
//
// This module is a READING of a projection, not a part of one. It computes nothing about money: it
// looks for the `Unfunded shortfall` line P4-1 chunk 4 emits in any month the Income Waterfall could
// not meet the spending target, and turns the months carrying it into ages. That is why it is its
// own file and not more of `projection.ts` — the walk stays the walk, and the marker the chart and
// the sustainable-spend solver want is a pure function over its output.
//
// **`project()` still returns `readonly Month[]`, deliberately.** Hanging the marker off a richer
// return type would change the signature every caller and every test in this repo is written
// against, for a value that is derivable from the months without any state the walk holds privately.
// If that call is ever made it is the user's to make, not this chunk's — see TODO P4-5.
//
// **The definitions this is built to, quoted, and the ambiguity in one of them.** CONTEXT.md §
// Outcomes:
//
//   * *"**Shortfall Age**: The age at which the Income Waterfall can no longer meet the spending
//     target. The tool's headline number."*
//   * *"**Pension-Only Age**: The age at which all assets are exhausted and the Household lives on
//     Age Pension alone. A second marker, not the headline — in Australia the money never reaches
//     zero income."*
//
// concept.md §1's table says the same thing about the first in fewer words (*"when the Income
// Waterfall can no longer meet the spending target"*) and never defines the second at all — it
// appears only in the deliverables list (§ "Outputs", and the chart in step 7) as a marker to be
// drawn.
//
// **PENSION-ONLY AGE IS NOW BUILT HERE — P4-5b, 2026-09-18 — and the three reasons this file used
// to give for not building it are all discharged.** The history is kept because the reasoning was
// right when it was written, and because each retraction is a fact about the engine:
//
//   * *"in this engine no asset can be exhausted"* (written when `splitAssets` re-read the STATIC
//     `Household` and limbs 2 and 3 both drew nil) — **retracted.** P4-1 chunk 5a gave the walk a
//     per-month balance state, so the assets a month reports are that month's, and P4-3b added the
//     Offset Account to that state — the walk's running cash is now assessed and deemed like any
//     other financial investment.
//   * *"limb 2 is capped at the Schedule's MINIMUM, the minimum is a PROPORTION of the opening
//     balance, and a proportion never empties a balance"* — **retracted.** The user ruled on
//     2026-09-17 that the Sch 7 figure is a FLOOR and not a ceiling: limb 2 offers the whole account
//     balance, and a pension is spendable to nil at any return at all.
//   * *"'all assets' still includes limb 3, the Non-Super Portfolio, which draws nil"* —
//     **retracted.** P3-21f shipped 2026-09-18 and limb 3 sells parcels to need.
//
// The tempting proxy — *first month with an `Age Pension` line and no `Salary, …` line* — is still
// **refused on the record**, and `pensionOnlyAge` below is built so that it cannot reduce to it. That
// is the month the last wage stops, which is a RETIREMENT age: it would announce that a Household
// lives on the pension alone while it still holds the whole of its super. The marker reads the
// Household's ASSET AND CASH FIGURES and not only its line descriptions, and the test that proves
// the difference is a fixture whose salary stops TWENTY-EIGHT MONTHS before its money runs out.
import { ageAt } from './household.js'; // `.js` is correct in a `.ts` file — see tsconfig.json
import { AGE_PENSION_LINE, SHORTFALL_LINE, cashInterestDescription, agePensionParametersCover, firstDayOf, monthOf } from './projection.js';
import { inflateStated } from './priceLevel.js';
import type { Cents } from './money.js';
import type { Household } from './household.js';
import type { Entry, IsoMonth, Month, Settings } from './plan.js';
import type { AgePensionIndexationSeries } from '../data/assumptions/settings.js';

/** One Person's age at a month, carrying the name so a two-person answer cannot be mis-attributed. */
export interface PersonAge {
  readonly name: string;
  readonly age: number;
}

/**
 * A month of the walk, and how old each member of the Household was in it.
 *
 * **Whose age is reported: BOTH of them, and that is a judgment call no document settles.** CONTEXT.md
 * calls the Shortfall Age *"the tool's headline number"*, singular, and in a couple the two people
 * are different ages in the same month — so something has to choose, and nothing in concept.md,
 * CONTEXT.md or the ADRs says which. The choice taken here is to refuse to choose in the engine:
 *
 *   * the primary fact is the MONTH. Both ages are derived from it, and the month is what the chart
 *     actually marks (concept.md §7) and what the month table is keyed by;
 *   * `Entry.owner`'s `personA` / `personB` ordering is about which Person a stated fact belongs to,
 *     not about whose life the plan is told from, so reading a headline off `persons[0]` would be
 *     borrowing an ordering to mean something it has never meant;
 *   * the Household runs short TOGETHER — there is one Waterfall, one spending target and one
 *     balance — so an age that named one person would be describing a household event by one of the
 *     two people it happened to.
 *
 * So `ages` is every Person, in `household.persons` order, and the display layer picks the one it
 * labels. The alternative worth recording, and not taken: report the YOUNGER Person's age, on the
 * same reasoning `horizonMonth` already uses to take the LATER of the two hundredth birthdays — the
 * surviving-partner years are where a retirement plan fails. It is not taken because it would make
 * the headline silently switch people when a `DEATH` entry lands, and because it is a presentation
 * rule wearing an engine's authority.
 *
 * **The age is taken on the FIRST day of the month**, which is the convention the walk already runs
 * on: `project()` splits assets on the month's first day (ADR-0005) and assesses the Age Pension on
 * it. So a Person born on the 15th who first falls short in the month of their 88th birthday is
 * reported at 87 — the age they were when the month opened, not the one they reach inside it.
 */
export interface AgeAtMonth {
  readonly month: IsoMonth;
  /**
   * Each LIVING Person's age on the first day of `month`, in `household.persons` order. A Person
   * who has died by then has no age here (P12-1) — see `died`.
   */
  readonly ages: readonly PersonAge[];
  /**
   * **P12-1 — the Persons left out of `ages` because they have died**, as indexes into
   * `household.persons`: the same key `Month.died` carries, OMITTED while nobody has. A reader
   * labelling `ages` by position recovers each one's index from it.
   */
  readonly died?: readonly number[];
}

/**
 * **The Shortfall Age, plus every fact needed to read it under a competing definition.**
 *
 * *"Can no longer meet the spending target"* is ambiguous at exactly one point and the ambiguity is
 * not resolvable from the documents: it does not say what a household that falls short and then
 * RECOVERS has done. A $30,000 roof in one month, funded out of nothing and paid back over the
 * following year, is a month the Waterfall could not meet the target and is plainly not the age at
 * which the money ran out.
 *
 * **The reading taken: the Shortfall Age is the FIRST month carrying `Unfunded shortfall`** —
 * `firstShortfall` below — and the recovery is reported beside it rather than absorbed into it.
 * Three reasons, in order of weight:
 *
 *   1. **Every other reading runs the flattering way.** Under *"the first month of the final
 *      unbroken run"* a Household that cannot fund twenty years of its retirement, and then
 *      recovers in the last month of the walk, has NO Shortfall Age at all. This engine's residuals
 *      are declared and every one of them is pointed at the household on purpose; the headline
 *      number must not be the one place that points the other way.
 *   2. **A month the plan could not fund is a month the plan failed.** The spending lines are
 *      emitted at what the Household NEEDED and never at what it could afford, precisely so that
 *      *"does the money last?"* cannot be answered *"yes, always"*. The first `Unfunded shortfall`
 *      is money the plan requires and does not have.
 *   3. **A run length would be invented.** *"Sustained"* needs an N — three months? a year? — and no
 *      document gives one. A threshold chosen here would be a policy decision made by a default.
 *
 * **And the competing reading is not discarded, it is reported.** `pointOfNoRecovery` is the first
 * month of the unbroken run of shortfall months that reaches the last month of the walk, and it is
 * `undefined` when the walk ends funded — that is, when the Household recovered. `recovered` says
 * whether any shortfall month was followed by a funded one at all. A caller that wants the stricter
 * marker has it; what it cannot do is get the stricter marker while believing it has the headline.
 */
export interface ShortfallAge {
  /**
   * `'never'` — no month of the walk carried an `Unfunded shortfall` line. **This is a real and
   * common answer, not a missing one**, and it is spelled out rather than left as an `undefined` a
   * caller could confuse with an unanswered question or with a shortfall in the last month.
   */
  readonly outcome: 'never' | 'shortfall';
  /** **THE SHORTFALL AGE.** The first month the Waterfall could not fund; `undefined` iff `outcome` is `'never'`. */
  readonly firstShortfall: AgeAtMonth | undefined;
  /**
   * The first month of the unbroken run of shortfall months ending at the LAST month of the walk —
   * the point from which the Household never recovers within the horizon. `undefined` when the walk
   * ends funded, including when it never fell short at all.
   */
  readonly pointOfNoRecovery: AgeAtMonth | undefined;
  /** Whether any shortfall month was followed, anywhere later in the walk, by a funded month. */
  readonly recovered: boolean;
  /** How many months of the walk carried the line. `0` iff `outcome` is `'never'`. */
  readonly monthsShort: number;
}

/** Whether this month's Waterfall failed to meet its target — the line, read, never recomputed. */
const fallsShort = (month: Month): boolean =>
  month.lines.some((line) => line.direction === 'inflow' && line.description === SHORTFALL_LINE);

/**
 * How old each Person is on the first day of `month` — the one expression of it, exported because
 * `app/incomeHeadline.ts` needs the ages of a month no marker names (the LAST month of a walk that
 * never ran short). A second copy of this would be a second chance to get `AgeAtMonth`'s
 * first-of-the-month convention wrong in one place only.
 */
export const agesAt = (household: Household, at: Pick<Month, 'month' | 'died'>): AgeAtMonth => {
  // **P12-1 — handed the MONTH, not its name**, so a caller cannot ask for ages without the walk's
  // own record of who has died: a Person who has died has no age.
  const died = at.died ?? [];
  return Object.freeze({
    month: at.month,
    ages: Object.freeze(
      household.persons
        .filter((_person, index) => !died.includes(index))
        .map((person) => Object.freeze({ name: person.name, age: ageAt(person.dateOfBirth, firstDayOf(at.month)) })),
    ),
    ...(died.length === 0 ? {} : { died: Object.freeze([...died]) }),
  });
};

/** The index into `household.persons` of each of `at.ages`, in order — the living, less `died`. */
export const agedPersonIndexes = (at: AgeAtMonth): readonly number[] => {
  const died = at.died ?? [];
  const indexes: number[] = [];
  for (let index = 0; indexes.length < at.ages.length; index += 1) if (!died.includes(index)) indexes.push(index);
  return indexes;
};

/**
 * Read the Shortfall Age off a projection.
 *
 * `months` must be what `project()` returned — ascending, contiguous, and non-empty; the walk
 * guarantees all three, and `pointOfNoRecovery` reads the last element as the horizon, so a
 * re-ordered or filtered array would answer a different question. An empty array is refused rather
 * than answered `'never'`: a walk with no months has not told us that the money lasted.
 */
export const shortfallAge = (months: readonly Month[], household: Household): ShortfallAge => {
  if (months.length === 0) {
    throw new RangeError('a projection with no months has no Shortfall Age — it has no answer at all');
  }
  const short = months.filter(fallsShort);
  if (short.length === 0) {
    return Object.freeze({
      outcome: 'never',
      firstShortfall: undefined,
      pointOfNoRecovery: undefined,
      recovered: false,
      monthsShort: 0,
    });
  }
  // Walk back from the horizon while the months are still short: where the last month is funded the
  // loop takes no step and there is no point of no recovery, which is the answer a recovering
  // Household must get.
  let runStart = months.length;
  while (runStart > 0 && fallsShort(months[runStart - 1]!)) runStart -= 1;
  const endsShort = runStart < months.length;
  return Object.freeze({
    outcome: 'shortfall',
    firstShortfall: agesAt(household, short[0]!),
    pointOfNoRecovery: endsShort ? agesAt(household, months[runStart]!) : undefined,
    // A shortfall month was followed by a funded one exactly when the final run does not contain
    // every short month there is.
    recovered: short.length > months.length - runStart,
    monthsShort: short.length,
  });
};

/**
 * **The Pension-Only Age, and the two things `assessableAssets === 0` is not.**
 *
 * CONTEXT.md: *"**Pension-Only Age**: The age at which all assets are exhausted and the Household
 * lives on Age Pension alone. A second marker, not the headline — in Australia the money never
 * reaches zero income."* Two halves, and the marker is built to both of them: *all assets are
 * exhausted* is read off the month's ASSET AND CASH figures, and *lives on Age Pension alone* is
 * read off its inflow lines. Neither half alone is the marker, and this is why:
 *
 * **1. `assessableAssets === 0` IS NOT "ALL ASSETS ARE EXHAUSTED", because two pools are outside it.**
 *
 *   * **The Offset Account.** `Month.openingBalance` / `closingBalance` IS the Offset (P4-3b) — the
 *     walk's running cash and Waterfall limb 4's pool. When this marker was built `splitAssets` did
 *     not see it at all, so it was in neither reported asset figure and in neither means test: the
 *     recon that scoped the marker found a Household with **nil assessable assets and $149,396.64 of
 *     drawable cash in the same month**, and a marker built on the assets figure alone would have
 *     announced that it lived on the Age Pension alone while it held six figures of spendable money.
 *     **P4-3b closed that hole from the other side** — the Offset is now assessed and deemed at the
 *     month's own running cash — but the marker's own answer does not move, because the marker month
 *     must **OPEN with nil cash** (condition 5) either way. What P4-3b did change is the STATE
 *     conditions: see `livesOnPensionAlone`, which excludes the Offset from condition 1 so that a
 *     Household banking its pension surplus does not stop living on the pension alone.
 *   * **The younger partner's exempt super.** `protectedAssets` is nil for an occupied home (the
 *     home is protected and carries no value), so requiring it to be nil costs a homeowner nothing —
 *     but Accumulation Phase super held by a Person under Age Pension age is exempt from both tests
 *     (§4.8's younger-partner exemption) and lands there at its full balance, while the OLDER partner
 *     is drawing a pension. *All* assets are not exhausted while that balance exists.
 *
 * **2. AND A WALK THE AGE PENSION PARAMETERS DO NOT REACH IS REFUSED RATHER THAN ANSWERED.**
 * The reasoning is unchanged and its REACH narrowed on 2026-09-21 (P4-1e), so the original is kept
 * and the correction is beside it. It read: *"`Settings.economicSeries.agePension` is optional; omit
 * it and the walk computes no entitlement past the published window and emits no Age Pension line at
 * all from 2027-04 on."* It does not: past the window a plan with no series now gets the last
 * published sets carried forward, so **an absent series is answerable** and this marker's first
 * real-plan appearances date from that day. What still refuses is a walk that BEGINS below the first
 * determined parameters, because §4.7 indexes forward from a published set and not backwards.
 *
 * The reason for refusing rather than answering is untouched by any of that. For the Shortfall Age
 * a missing pension line is safe and is declared safe: it makes the answer EARLIER than the truth.
 * Here it is not the same failure mode. With no pension the assets are consumed faster, so
 * exhaustion arrives earlier *and* the Household is not living on the Age Pension in the months the
 * marker would name — it is living on a line the walk declined to compute. An early Shortfall Age is
 * a conservative answer to the right question; a Pension-Only Age read off an absent pension is a
 * confident answer to a question the walk cannot answer. So the series is a REQUIRED third argument
 * and a walk the parameters do not cover is **refused**.
 *
 * **What a "pension-only month" is, exactly.** All five, and the first two are requirement 1:
 *
 *   1. `assessableAssets === 0` — nothing the means test can see;
 *   2. `protectedAssets === 0` — and nothing it cannot;
 *   3. an `Age Pension` inflow line is present — the Household is actually ON the pension;
 *   4. no inflow but the Age Pension and `Unfunded shortfall` — no wage, no pension payment, no
 *      parcel sale, nothing. The shortfall line is not income (it is money the plan requires and
 *      does not have, `SHORTFALL_LINE`), so a Household short of its target still lives on the
 *      pension alone;
 *   5. for the MARKER month only, `openingBalance === 0` — the month opened with no drawable cash.
 *
 * **(1) and (5) now OVERLAP, on purpose, and both are kept.** Since P4-3b the Offset is assessable,
 * so in the marker month — where (5) holds — the raw `assessableAssets` and the Offset-excluded
 * figure (1) actually tests are the same number: reading (1) the pre-P4-3b way would imply (5) for
 * any month built by `project()`. The redundancy is belt and braces and is stated rather than left
 * to look accidental: (1) is about what the Household HOLDS and (5) is about what the month OPENED
 * with, they come apart for a hand-built `Month`, and dropping either is still a kill — each is
 * tested on its own.
 *
 * **Why (5) is the marker's alone, and not every month's.** Exhaustion is an EVENT and living on the
 * pension is a STATE. Once a Household has opened a month with nothing and taken in nothing but its
 * pension, any cash it holds later is the pension's own surplus — it banked part of its payment — and
 * that is still living on the Age Pension alone. Requiring nil cash every month would answer
 * `'never'` for a thrifty Household: the recon's own second scenario banks $1,231.35 in its first
 * pension-only month and climbs from there, and it lives on the pension and nothing else for six
 * years. Requiring it in NO month would let a Household with a six-figure Offset be marked
 * pension-only in any month its pension happened to exceed its spending. So the marker demands the
 * event, and `monthsPensionOnly` counts the state that follows it.
 *
 * **THE FINAL RUN IS REPORTED TOO — P4-5c, 2026-09-18 — and the event is not re-tested, it is
 * DEFERRED TO.** `recoveredAt` alone named the first break and then went quiet: a Household that ran
 * out, inherited, and ran out again for good had one date saying it recovered and nothing at all
 * saying it ends the walk with nothing. `pointOfNoRecovery` is the missing half, on exactly the rule
 * `shortfallAge`'s field of the same name follows — the first month of the unbroken run of
 * pension-only months that reaches the LAST month of the walk, `undefined` when the walk ends
 * otherwise. The name is deliberately the SAME word as the Shortfall Age's, and not `pointOfNoReturn`:
 * it is the same reading of the same shape, this file already calls leaving the state *recovery*
 * (`recoveredAt`), and in both markers recovery is the good direction, so one concept keeps one name.
 *
 * It is computed by walking `livesOnPensionAlone` BACKWARD from the horizon, and **condition (5) is
 * not re-checked on the way** — for the reason (5) exists at all. The event happened once; a second
 * run is the Household back in the STATE, and cash it holds entering that run is cash a Household with
 * nothing but a pension banked or realised. The two-run fixture re-enters the state holding
 * $26,865.89 of parcel proceeds and is named at that month, four months before the first month of
 * that run to open at nil.
 *
 * **But the walk back is FLOORED at the marker, and that is not the same as re-checking (5).** The
 * state conditions 1 to 4 are satisfied by a Household with a six-figure Offset and no wage — that is
 * the whole of requirement 1 above — so a backward walk let loose on the full array reproduces the
 * refused retirement proxy exactly: in the recon's §4 Household, conditions 1 to 4 hold unbroken from
 * the month the salary stopped, twenty-eight months before the money ran out, and an unfloored walk
 * would report a point of no recovery of 2031-07 against a Pension-Only Age of 2033-11. Worse, in §3,
 * where the answer is `'never'` and $254,483.76 sits in the bank, it would name a month in a walk that
 * has no marker at all. So `pointOfNoRecovery` is never earlier than `firstPensionOnly` and is
 * `undefined` whenever `outcome` is `'never'`: before the event the Household was not living on its
 * pension alone, it merely looked that way to the means test.
 *
 * **And no boolean was added, because `recoveredAt` already is one.** `shortfallAge` needs `recovered`
 * beside `pointOfNoRecovery` because it counts months and not runs; here `recoveredAt !== undefined`
 * holds exactly when a pension-only month was followed, later in the walk, by a month that was not —
 * so a `recovered: boolean` would be a second spelling of a field already present, and a field nobody
 * needs is a field that can disagree with the one they do.
 *
 * **The ordering to Shortfall Age is not assumed, because there is none.** These are independent
 * facts — the Pension-Only Age is about ASSETS, the Shortfall Age is about the TARGET. A Household
 * that spends more than the pension falls short the instant its assets are gone and the two coincide
 * to the month; drop its spending and the same Household empties on the same date, falls short in
 * that one transition month, and then lives comfortably. Nothing here is derived from `shortfallAge`.
 */
export interface PensionOnlyAge {
  /**
   * `'never'` — no month of the walk met the test. **A real answer, not a missing one**, and the
   * common one: most Households this tool is for die holding money.
   */
  readonly outcome: 'never' | 'pensionOnly';
  /** **THE PENSION-ONLY AGE.** The first month meeting all five conditions; `undefined` iff `outcome` is `'never'`. */
  readonly firstPensionOnly: AgeAtMonth | undefined;
  /**
   * How many months the Household then lived on the pension alone — the length of the unbroken run
   * beginning at `firstPensionOnly` in which conditions 1 to 4 held. `0` iff `outcome` is `'never'`;
   * it counts the marker month itself, so `1` means the state did not survive the month it began in.
   */
  readonly monthsPensionOnly: number;
  /**
   * The first month AFTER that run — the month the Household held an asset or took in money that was
   * not the Age Pension again. `undefined` when the run reaches the horizon, which is the ordinary
   * case. **Reported rather than absorbed**, on the same rule `shortfallAge`'s `pointOfNoRecovery`
   * follows: a late-life inheritance, or a `NON_SUPER_INVESTMENT` buy out of banked pension money,
   * makes *"all assets are exhausted"* untrue again, and a caller must be able to see that rather
   * than be handed one date that quietly means less than it looks like.
   *
   * **It doubles as the boolean `shortfallAge` spells `recovered`**: present exactly when a
   * pension-only month was followed, anywhere later in the walk, by a month that was not one.
   */
  readonly recoveredAt: AgeAtMonth | undefined;
  /**
   * The first month of the unbroken run of pension-only months (conditions 1 to 4) that reaches the
   * LAST month of the walk — the point from which the Household never holds anything again within the
   * horizon. `undefined` when the walk does not end in that state, and always `undefined` when
   * `outcome` is `'never'`. Never earlier than `firstPensionOnly`: the run cannot begin before the
   * exhaustion that started it. Equal to `firstPensionOnly` in the ordinary case of one run reaching
   * the horizon, and LATER than it — naming the second run — where the Household recovered and ran
   * out again.
   */
  readonly pointOfNoRecovery: AgeAtMonth | undefined;
}

/** Conditions 1 to 4: the Household holds nothing the tests can see and takes in nothing but its pension. */
const livesOnPensionAlone = (month: Month, cashInterestLines: ReadonlySet<string>): boolean => {
  // **THE OFFSET IS EXCLUDED FROM CONDITION 1, AND THAT IS A RULING — P4-3b, 2026-09-18, applying
  // P4-5b's own event-versus-state finding. Do not "fix" this back.** Since P4-3b the Offset Account
  // is IN the means test: `splitAssets` assesses the month's running cash, so `assessableAssets`
  // includes `openingBalance` and a Household that banks part of its pension payment has non-nil
  // assessable assets from the following month on. Read literally, condition 1 would then break the
  // run after ONE month for exactly the thrifty Household P4-5b built a fixture for — the one that
  // banks $1,231.35 of its first pension-only payment and lives on the pension for six years —
  // collapsing `monthsPensionOnly` from six years to 1. P4-5b ruled that **exhaustion is an EVENT
  // and living on the pension is a STATE**: once a Household has opened a month with nothing and
  // taken in nothing but its pension, cash it holds later IS the pension's own surplus. So the run
  // continues, and the test is *"it holds nothing besides the Offset"*.
  //
  // The exclusion is scoped to this function, which is conditions 1 to 4 — the STATE. It does NOT
  // reach the marker, whose condition (5) still demands `openingBalance === 0`: the EVENT is still
  // an empty offset, and the offset is still assessable. Making the Offset non-assessable instead
  // would have been the wrong repair — it is assessable, that is the whole point of P4-3b.
  //
  // Spelled as an equality and not as `assessableAssets - openingBalance`: the question is whether
  // the ONLY assessable asset is the Offset, and the equality says so of a hand-built `Month` too,
  // where the two fields are stated independently rather than computed from one walk.
  const holdsNothingBesidesTheOffset =
    month.assessableAssets === 0 || month.assessableAssets === month.openingBalance;
  if (!holdsNothingBesidesTheOffset || month.protectedAssets !== 0) return false;
  // **CASH INFLOWS ONLY (P4-4).** Conditions 2 to 4 are about what the Household TOOK IN, and a
  // `wealth` line is not money taken in: it is a balance that moved. A Household living on its
  // pension alone holds nothing that grows — conditions 1 and 2 above have just said so — so no
  // growth line can reach here today, and this is the guard for the day a second non-cash line
  // exists. Spelled `!== 'wealth'` rather than `=== 'cash'` so that a hand-built `Month` fixture,
  // which no compiler ever sees, is read as the cashflow it was written as.
  //
  // **INTEREST ON CASH IS ADMITTED TO CONDITION 4 (2026-09-23), on the Offset's own ruling above.**
  // The cash a Household on the pension holds is the pension's own surplus, so the interest that
  // cash earns is that surplus earning; refusing it would end the thrifty Household's run after one
  // month again, which is the collapse P4-5b ruled out. It cannot reach the marker: the marker month
  // opens with nil cash, and nil cash earns nothing.
  const inflows = month.lines.filter((line) => line.direction === 'inflow' && line.effect !== 'wealth');
  return (
    inflows.some((line) => line.description === AGE_PENSION_LINE) &&
    inflows.every(
      (line) => line.description === AGE_PENSION_LINE || line.description === SHORTFALL_LINE || cashInterestLines.has(line.description),
    )
  );
};

/**
 * Read the Pension-Only Age off a projection.
 *
 * `months` must be what `project()` returned — ascending, contiguous and non-empty. `series` must be
 * the `Settings.economicSeries.agePension` that walk was run with, and it is positional and required
 * rather than optional precisely so that a caller cannot omit it and be answered anyway; pass
 * `undefined` only if the walk genuinely had none, and expect a refusal unless the walk ends inside
 * the published parameter window.
 */
export const pensionOnlyAge = (
  months: readonly Month[],
  household: Household,
  series: AgePensionIndexationSeries | undefined,
): PensionOnlyAge => {
  if (months.length === 0) {
    throw new RangeError('a projection with no months has no Pension-Only Age — it has no answer at all');
  }
  // The endpoints settle the whole walk: `agePensionParametersCover` is a lower bound on the first
  // determined parameters, and since 2026-09-21 it is the ONLY bound — past the published window a
  // plan with no series gets the standing table (P4-1e), so the upper end can no longer fail. The
  // check is kept on both endpoints because the LOWER bound can still fail on either, and because a
  // walk that begins before 20 Mar 2026 is exactly the case this refusal is for. A series that
  // STOPS mid-walk needs no check here — `project()` raises `MissingPensionIndexationError` and
  // never returns.
  const first = firstDayOf(months[0]!.month);
  const last = firstDayOf(months.at(-1)!.month);
  if (!agePensionParametersCover(first) || !agePensionParametersCover(last)) {
    throw new RangeError(
      `the Age Pension is not computable across ${months[0]!.month} .. ${months.at(-1)!.month}, so this walk ` +
        'has no Pension-Only Age: the months below the first determined parameters carry no Age Pension ' +
        'line at all, and a Household cannot be found to live on a payment the walk declined to compute. ' +
        'The indexation mechanism runs FORWARD from a published set and there is no standing table ' +
        'running backwards, so a series cannot buy this walk either — start the walk on or after the ' +
        'first determined parameter day, or ask this question of a shorter walk.',
    );
  }
  const cashInterestLines = new Set(household.persons.map(cashInterestDescription));
  const markerIndex = months.findIndex((month) => month.openingBalance === 0 && livesOnPensionAlone(month, cashInterestLines));
  if (markerIndex === -1) {
    return Object.freeze({
      outcome: 'never',
      firstPensionOnly: undefined,
      monthsPensionOnly: 0,
      recoveredAt: undefined,
      pointOfNoRecovery: undefined,
    });
  }
  let end = markerIndex;
  while (end < months.length && livesOnPensionAlone(months[end]!, cashInterestLines)) end += 1;
  // And back from the horizon, for the run the Household never leaves. The floor is the marker and
  // not zero: conditions 1 to 4 hold for a Household with a full Offset and no wage, so an unfloored
  // walk would name the month the salary stopped. Where the horizon month is not pension-only the
  // loop takes no step and there is no point of no recovery.
  let runStart = months.length;
  while (runStart > markerIndex && livesOnPensionAlone(months[runStart - 1]!, cashInterestLines)) runStart -= 1;
  return Object.freeze({
    outcome: 'pensionOnly',
    firstPensionOnly: agesAt(household, months[markerIndex]!),
    monthsPensionOnly: end - markerIndex,
    recoveredAt: end < months.length ? agesAt(household, months[end]!) : undefined,
    pointOfNoRecovery: runStart < months.length ? agesAt(household, months[runStart]!) : undefined,
  });
};

/**
 * **The Contingency Floor, read as a CONTINUOUS CONSTRAINT — P4-6.**
 *
 * concept.md §1's table: *"Contingency floor — $100k, configurable — a continuous constraint"*, and
 * §§53-55: money held back *"for late-life costs"*, *"a floor the balance never crosses"*. Not a
 * final-balance test and not an average: every month of the walk either clears it or does not, and
 * one month below it is one month the plan asked the Household to spend money it had set aside.
 *
 * **WHAT THE FLOOR IS MEASURED AGAINST: `Month.accessibleAssets`, and that was escalated and ruled.**
 * The free reading was `protectedAssets + assessableAssets` — total wealth, already on every month,
 * no widening of `Month` at all — and the user refused it on 2026-09-18 knowing the cost. Total
 * wealth passes a 58-year-old with $900,000 of preserved super and $9,000 in the bank: it answers
 * *"is there a hundred thousand dollars somewhere in this Household?"* when the question is *"could
 * they pay for a new roof?"*. It fails in the FLATTERING direction, and this project's standing rule
 * is to fail toward understatement. What the floor reads is money the Household can actually reach —
 * the Offset, the Non-Super Portfolio, and super a Condition of Release has reached — which is
 * `accessibleWealth` in `projection.ts`, where the reachability rule and its residuals are written.
 *
 * **BREACH IS STRICT: `accessibleAssets < floor`.** Sitting exactly ON the floor is not crossing it.
 * *"A floor the balance never crosses"* is the document's own word, and the household that spends to
 * exactly its reserve and stops has done the thing the floor asks for. The two fixtures that pin this
 * both land a month on the floor to the cent and neither is a breach.
 *
 * **THE MARKER IS THE FIRST BREACH, on `shortfallAge`'s reasoning taken unchanged** (see its doc,
 * reasons 1 to 3, and especially the first): every other reading runs the flattering way. Under
 * *"the first month of the final unbroken run"* a Household that spends its whole contingency
 * reserve for twenty years and is handed it back in the last month of the walk has NO breach at all.
 * The strict reading is not discarded — `pointOfNoRecovery` reports it beside the marker, as the
 * first month of the unbroken run of below-floor months that reaches the horizon.
 *
 * **NO Age Pension series argument, and no refusal gate**, unlike `pensionOnlyAge` — which needs one
 * because it reads an `Age Pension` LINE, and a walk with no pension line cannot be found to live on
 * a payment the walk declined to compute. This marker reads BALANCES. A missing series makes those
 * balances fall faster, so the breach it reports is EARLIER than the truth: the conservative
 * direction, which `shortfallAge` already accepts on the record for the same reason.
 *
 * **THE FLOOR IS NOW A STATED SETTING, AND IT ARRIVES WITH THE TWO FACTS IT MUST BE READ AGAINST**
 * (P4-14, user ruling 2026-09-21). It used to be a bare `Cents` and this file used to say there was
 * no `Settings` field for it — there is one now, `Settings.contingencyFloor`, optional, and the page
 * that used to hard-code $700,000 states nothing. What the argument carries is a
 * `StatedContingencyFloor`: the figure, the date it is stated as at, and the CPI that raises it to a
 * later month's price level. Carried together, so no caller can supply two of the three and guess
 * the third, and still positional and required, which is `pensionOnlyAge`'s device *"precisely so
 * that a caller cannot omit it and be answered anyway"*.
 *
 * ⚠️ **THE FIGURE IS IN TODAY'S MONEY AND THE COMPARISON IS NOMINAL — THAT IS P4-14, SETTLED.** For
 * three days the chart DREW the floor as a real figure, inflating in the future-dollars view, while
 * this function COUNTED breaches against it as flat nominal cents; both readings were defensible and
 * they crossed the line in different months. The user ruled the stated figure REAL. So
 * `contingencyFloorAt` raises it to each month's own price level and the comparison is
 * nominal-to-nominal like every other comparison in this engine — `chartConfig.ts` draws exactly the
 * same curve, through the same one expression in `core/priceLevel.ts`. That module's header says why
 * raising a stated REAL INPUT to nominal is not the ADR-0001 direction: nothing deflated reaches a
 * threshold, a rate or a taper, and no balance is ever converted.
 */
export interface ContingencyFloorBreach {
  /**
   * `'never'` — the Household's reachable money cleared the floor in every month of the walk. **A
   * real answer and the one a plan is aiming at**, spelled out rather than left as an `undefined` a
   * caller could confuse with an unanswered question.
   */
  readonly outcome: 'never' | 'breached';
  /** **THE MARKER.** The first month whose reachable money fell below the floor; `undefined` iff `outcome` is `'never'`. */
  readonly firstBreach: AgeAtMonth | undefined;
  /**
   * The first month of the unbroken run of below-floor months ending at the LAST month of the walk —
   * the point from which the reserve is never rebuilt within the horizon. `undefined` when the walk
   * ends at or above the floor, including when it never breached at all.
   */
  readonly pointOfNoRecovery: AgeAtMonth | undefined;
  /** Whether any below-floor month was followed, anywhere later in the walk, by a month at or above it. */
  readonly recovered: boolean;
  /** How many months of the walk were below the floor. `0` iff `outcome` is `'never'`. */
  readonly monthsBelowFloor: number;
}

/**
 * **The Contingency Floor as a plan states it: the figure, and the price level it is stated at.**
 *
 * Three fields carried together for `MoneyBasis`'s reason — a caller who could supply the figure
 * without the date and the rate would have to guess one of them, and a guessed CPI is a different
 * floor in every month after the first.
 */
export interface StatedContingencyFloor {
  /** `Settings.contingencyFloor` — **today's money**, at `asAtDate`. Never a nominal figure. */
  readonly todaysMoney: Cents;
  /** `Settings.asAtDate`. The month in which the stated figure and the nominal floor coincide. */
  readonly asAtDate: string;
  /** `Settings.economicSeries.cpi` — a yearly rate, e.g. `0.025`. Never defaulted. */
  readonly cpi: number;
}

/**
 * **The plan's floor, or `undefined` — the ONE place a `Settings` is turned into one.**
 *
 * `undefined` means the plan states no floor, and that is the only spelling of it: `parsePlan`
 * refuses a stated nil, so this never returns a floor of nothing. Every reader — the chart series
 * and this file's breach — takes the same object from here, so a page cannot draw a band against one
 * figure while counting breaches against another.
 */
export const statedContingencyFloor = (settings: Settings): StatedContingencyFloor | undefined =>
  settings.contingencyFloor === undefined
    ? undefined
    : Object.freeze({
        todaysMoney: settings.contingencyFloor,
        asAtDate: settings.asAtDate,
        cpi: settings.economicSeries.cpi,
      });

/**
 * **The floor in `month`'s own nominal cents — the curve, and the whole of P4-14's settlement.**
 *
 * `(1 + cpi) ^ (months since asAtDate / 12)`, rounded once by `mulCents`, in `core/priceLevel.ts`
 * where `chartConfig.ts`'s `statedInTodaysMoneyLens` reads it too. In `asAtDate`'s own month the
 * factor is exactly 1, so the floor is the figure the user typed. With `cpi` at nil the factor is 1
 * everywhere, so the real and the nominal curve coincide and the band is flat in both money views —
 * by the arithmetic, not by a special case.
 */
export const contingencyFloorAt = (floor: StatedContingencyFloor, month: IsoMonth | string): Cents =>
  inflateStated(floor.todaysMoney, floor.cpi, floor.asAtDate, month);

/**
 * Whether this month's reachable money is under the floor THAT MONTH'S PRICES ASK FOR. Strict, on
 * the ruling above, and read off the figure the walk reported rather than recomputed from the other
 * two.
 */
const belowFloor = (month: Month, floor: StatedContingencyFloor): boolean =>
  month.accessibleAssets < contingencyFloorAt(floor, month.month);

/**
 * Read the Contingency Floor breach off a projection.
 *
 * `months` must be what `project()` returned — ascending, contiguous and non-empty; an empty array
 * is refused rather than answered `'never'`, on `shortfallAge`'s precedent: a walk with no months
 * has not told us that the reserve held. `floor` must be POSITIVE, and a nil or negative one is
 * refused rather than answered `'never'` — a floor of nothing is a caller who has not set one, and
 * answering it would report that a Household kept a reserve it never had.
 *
 * **The backward walk is UNFLOORED, and that is `shortfallAge`'s shape and NOT `pensionOnlyAge`'s.**
 * `pensionOnlyAge` floors its walk at the marker because its conditions 1 to 4 are a STATE that
 * holds before the EVENT — a Household with a full Offset and no wage satisfies them from the month
 * the salary stopped, so an unfloored walk there reproduces a retirement age. There is no such split
 * here: being below the floor is a single predicate on a single figure, so the first month that
 * satisfies it is by definition the earliest month any run of it can begin at, and an unfloored walk
 * back cannot reach past it.
 */
export const contingencyFloorBreach = (
  months: readonly Month[],
  household: Household,
  floor: StatedContingencyFloor,
): ContingencyFloorBreach => {
  if (months.length === 0) {
    throw new RangeError('a projection with no months has no Contingency Floor breach — it has no answer at all');
  }
  if (floor.todaysMoney <= 0) {
    throw new RangeError(
      `a Contingency Floor of ${floor.todaysMoney} is not a floor: concept.md's reserve is an amount held back for ` +
        'late-life costs ($100k, configurable), and a nil or negative one is a caller who has not set ' +
        'one rather than a Household that needs no reserve. Pass the floor this plan is to be judged ' +
        'against, in cents.',
    );
  }
  const below = months.filter((month) => belowFloor(month, floor));
  if (below.length === 0) {
    return Object.freeze({
      outcome: 'never',
      firstBreach: undefined,
      pointOfNoRecovery: undefined,
      recovered: false,
      monthsBelowFloor: 0,
    });
  }
  // Back from the horizon while the months are still below the floor: where the last month clears it
  // the loop takes no step and there is no point of no recovery, which is the answer a Household that
  // rebuilt its reserve must get.
  let runStart = months.length;
  while (runStart > 0 && belowFloor(months[runStart - 1]!, floor)) runStart -= 1;
  const endsBelow = runStart < months.length;
  return Object.freeze({
    outcome: 'breached',
    firstBreach: agesAt(household, below[0]!),
    pointOfNoRecovery: endsBelow ? agesAt(household, months[runStart]!) : undefined,
    // A below-floor month was followed by one at or above it exactly when the final run does not
    // contain every below-floor month there is.
    recovered: below.length > months.length - runStart,
    monthsBelowFloor: below.length,
  });
};

/**
 * **THE HOME LOAN PAYOFF — P3-16 slice 3 — and it is read off `Month.mortgageBalance` alone.**
 *
 * The question this answers is the one the user actually asked of the screen: *"am I clear before I
 * retire?"*. `Month.mortgageBalance` has been on every month since P3-16 slice 2 and nothing
 * summarised it, so the only way to find the payoff was to open the months one by one until a
 * `$0.00` appeared. This is that scan, done once.
 *
 * **ABSENCE IS THE ONLY SPELLING OF "NO LOAN", and nil is not absence.** `plan.ts` says it of the
 * field and `parsePlan` enforces it at the door (a stated balance of nil is refused): a month with
 * no `mortgageBalance` key is a month with no loan in force, and `0` is a loan that has been
 * CLEARED. So a walk in which no month carries the key answers `'noLoan'` — a real answer — and
 * every consumer of this marker draws nothing at all for it. That is what keeps a mortgage-free
 * plan byte-identical on the page as well as in the walk.
 *
 * **TWO PAYOFF DATES ARE REPORTED, BECAUSE A PLAN CAN HOLD MORE THAN ONE LOAN.** A
 * `MORTGAGE_REFINANCE` dated after the loan is repaid is a NEW loan and not a refusal (the walk's
 * transition (vi), ruled 2026-09-21), so *"the first month the balance reaches nil"* and *"the month
 * from which nothing is owed again"* are different months in a plan that pays the house off and
 * borrows again:
 *
 *   * `firstPayoff` is the first month the balance reaches nil. It is the literal payoff and it is
 *     what a reader who has one loan means by the word.
 *   * `clearForGood` is the first month of the unbroken run of nil months that reaches the end of
 *     the loan's reporting — the month from which the Household never owes anything again inside
 *     this forecast.
 *
 * **THE CHART DRAWS `clearForGood`, and that is this module's ruling** (`monthsToSeries.ts` states
 * it at the call site too). A chart draws ONE upright rule and captions it *"the home loan is
 * clear"*; drawn at `firstPayoff` in a plan that borrows again, that rule makes a claim about every
 * month to its right, and in some of them the Household owes money. The reading that answers the
 * question asked — *"am I clear before I retire?"* — is the one that cannot be undone by a later
 * entry. In the ordinary case of a single loan the two months are the same month, and neither is
 * absorbed into the other: `firstPayoff` is reported beside it, on the rule `shortfallAge` follows
 * for its own competing reading.
 *
 * **`=== 0` and not `<= 0`.** `mortgageMonth` caps the final payment at what is owed (its point 4)
 * and refuses a negative balance outright, so nil is exactly nil; a `<=` here would be reading
 * against a value the engine cannot produce and would hide it if it ever did.
 *
 * **It is a DEBT and nothing here nets it** — `plan.ts` on the field, and `agePension.ts`'s
 * `homeownerWithAMortgage`. This function adds nothing to anything: it compares one figure with
 * zero and reports months.
 */
export interface MortgagePayoff {
  /**
   * `'noLoan'` — no month of this walk carried a home loan at all. **A real answer, not a missing
   * one**, and the one a mortgage-free Household must get: nothing is drawn and nothing is said.
   * `'clear'` — the loan was reported and the last month reporting it owed nothing.
   * `'stillOwing'` — the last month reporting it still owed money.
   */
  readonly outcome: 'noLoan' | 'clear' | 'stillOwing';
  /** The FIRST month the balance reached nil; `undefined` where it never did (including `'noLoan'`). */
  readonly firstPayoff: AgeAtMonth | undefined;
  /**
   * **THE MARKER.** The first month of the unbroken run of nil months reaching the last month that
   * reports a loan — the month from which nothing is owed again within the forecast. `undefined`
   * exactly when `outcome` is not `'clear'`. Equal to `firstPayoff` in the ordinary single-loan
   * case, and later than it where the Household paid one loan off and took another.
   */
  readonly clearForGood: AgeAtMonth | undefined;
  /**
   * What was still owed in the last month that reported a loan — `0` when `outcome` is `'clear'`,
   * and `undefined` only for `'noLoan'`, where there is no loan to owe anything on. In a walk from
   * `project()` that month is the horizon, because the terms in force are never unset once stated.
   */
  readonly owedAtHorizon: Cents | undefined;
  /** The month `owedAtHorizon` was read in; `undefined` iff `outcome` is `'noLoan'`. */
  readonly lastReported: IsoMonth | undefined;
}

/**
 * Read the home loan payoff off a projection.
 *
 * `months` must be what `project()` returned — ascending, contiguous and non-empty; an empty array
 * is refused rather than answered `'noLoan'`, on `shortfallAge`'s precedent, because a walk with no
 * months has not told us that there is no loan.
 */
export const mortgagePayoff = (months: readonly Month[], household: Household): MortgagePayoff => {
  if (months.length === 0) {
    throw new RangeError('a projection with no months has no home loan payoff — it has no answer at all');
  }
  // The LAST month carrying the key, rather than the last month of the walk. In a walk they are the
  // same month; in a hand-built array they need not be, and reading the horizon unconditionally
  // would report `undefined` (which this type spells "there is no loan") for a Household that has
  // one.
  let lastIndex = -1;
  for (const [index, month] of months.entries()) {
    if (month.mortgageBalance !== undefined) lastIndex = index;
  }
  if (lastIndex === -1) {
    return Object.freeze({
      outcome: 'noLoan',
      firstPayoff: undefined,
      clearForGood: undefined,
      owedAtHorizon: undefined,
      lastReported: undefined,
    });
  }
  const last = months[lastIndex]!;
  const paidOff = months.find((month) => month.mortgageBalance === 0);
  // Back from the last reported month while the balance is still nil. A month with NO key stops the
  // walk as surely as a month with a balance does — it is not a month in which the loan was clear,
  // it is a month before the loan existed — so an originated loan floors this walk at its own first
  // month without needing to be told where that is.
  let runStart = lastIndex + 1;
  while (runStart > 0 && months[runStart - 1]!.mortgageBalance === 0) runStart -= 1;
  const clear = last.mortgageBalance === 0;
  return Object.freeze({
    outcome: clear ? 'clear' : 'stillOwing',
    firstPayoff: paidOff === undefined ? undefined : agesAt(household, paidOff),
    clearForGood: clear ? agesAt(household, months[runStart]!) : undefined,
    owedAtHorizon: last.mortgageBalance,
    lastReported: last.month,
  });
};

/**
 * **WHEN EACH PERSON RETIRES, read off the walk's OWN provenance and never re-bucketed here.**
 *
 * The payoff above is only half of *"am I clear before I retire?"*; this is the other half, and it
 * is deliberately not a second copy of `project()`'s entry handling. `RETIRE` is an `ENTRY_KIND`
 * `level`, so the walk cites it in `Month.appliedEntryIds` from the month it takes effect onward
 * (`plan.ts`: *"applied means GOVERNED"*) — including a `RETIRE` dated before `asAtDate`, which the
 * walk applies in month 0. So the month a retirement takes effect is the FIRST month of the walk
 * that cites the entry, and nothing here has to know about the horizon clamp, the level/event
 * split, or which of two stated retirements superseded the other. The walk decided all three
 * already and this reads its answer.
 *
 * ⚠️ **A COUPLE IS NOT COLLAPSED TO ONE DATE.** Two people retire in different months, so
 * *"before you retire"* has two answers and this returns both, one per Person, in
 * `household.persons` order — the rule `AgeAtMonth.ages` already takes and for the same reason. A
 * Person with no `RETIRE` entry at all gets a `month` of `undefined`, which is a fact about the
 * plan and not a missing value to be filled in from the other Person's.
 *
 * `entries` must be the entries THIS walk was run from — a Scenario's resolved entries
 * (`scenarioWalks.ts`), never the pool. An id cited by a month is looked up in them; an entry that
 * is not cited by any month reached no month, and a disabled entry is cited by none.
 */
export interface PersonRetirement {
  readonly name: string;
  /** The first month of the walk governed by a `RETIRE` reaching this Person; `undefined` if none. */
  readonly month: IsoMonth | undefined;
  /** Their age on that month's first day, `AgeAtMonth`'s own convention; `undefined` iff `month` is. */
  readonly age: number | undefined;
}

/**
 * Which Persons a `RETIRE` reaches. `projection.ts`'s `ownsPerson` rule, restated because it is not
 * exported and because this is a reading of a walk that has ALREADY applied these entries — the
 * refusal `personsReachedBy` makes for an owner naming nobody has therefore already been made, and
 * making it again here would refuse a walk the engine accepted.
 */
const retireReaches = (owner: Entry['owner'], index: number): boolean =>
  owner === 'household' || (owner === 'personA' ? index === 0 : index === 1);

export const retirementMonths = (
  months: readonly Month[],
  household: Household,
  entries: readonly Entry[],
): readonly PersonRetirement[] => {
  const retirements = new Map<string, Entry>();
  for (const entry of entries) {
    if (entry.enabled && entry.type === 'RETIRE') retirements.set(entry.id, entry);
  }
  const found: (IsoMonth | undefined)[] = household.persons.map(() => undefined);
  // Ascending, so the first month that cites a reaching entry is the earliest one — which is the
  // walk's own `retiredOn[index] ?? entry.date`, the first retirement applied wins.
  for (const month of months) {
    for (const id of month.appliedEntryIds) {
      const entry = retirements.get(id);
      if (entry === undefined) continue;
      household.persons.forEach((_person, index) => {
        if (retireReaches(entry.owner, index) && found[index] === undefined) found[index] = month.month;
      });
    }
  }
  return Object.freeze(
    household.persons.map((person, index) => {
      const month = found[index];
      return Object.freeze({
        name: person.name,
        month,
        age: month === undefined ? undefined : ageAt(person.dateOfBirth, firstDayOf(month)),
      });
    }),
  );
};

/**
 * **P3-16a — `MORTGAGE_TARGET`, compared against `retirementMonths`'s own answer.**
 *
 * concept.md §5.12: *"a dated payoff or offset milestone ... checked against the retirement date
 * ... It changes no arithmetic ... it makes an intention checkable."* The gate's one open question
 * — whether "payoff" and "offset milestone" need two separately-computed checks — is answered by
 * that sentence directly: ONE comparison, date against date, with which milestone the user means
 * carried in the entry's own free-text `note` and read nowhere here. `MortgageTargetParams` is
 * `NoParams` (`plan.ts`) for exactly this reason.
 *
 * **It never reads `months` or `Month.mortgageBalance`.** Unlike `mortgagePayoff`, this is not a
 * question about the walk's own arithmetic — it never checks whether the loan is actually clear by
 * the stated date, only whether the date the user picked falls before or after each Person's own
 * retirement. That is the whole of "changes no arithmetic": two dates, compared.
 *
 * ⚠️ **A COUPLE IS NOT COLLAPSED TO ONE VERDICT, on `retirementMonths`'s own precedent.** Two
 * people retire in different months, so one target date can fall before one Person's retirement and
 * after the other's; `perPerson` carries one outcome per Person rather than a single answer that
 * would silently pick one of them. `entry.owner` is not consulted — `MORTGAGE_REFINANCE` already
 * establishes that the home loan is a Household fact no entry's owner gates (`projection.ts`'s own
 * `entry.type === 'MORTGAGE_REFINANCE'` branch never reads it), and concept.md's own table names
 * `MORTGAGE_TARGET`'s owner as "household" for the same reason.
 *
 * **Retiring in the SAME month the target falls in counts as `retiresAfterTarget`, not before —
 * ⚠️ THE SIGN IS AS WRITTEN, NOT THE ONE A CASUAL READING GUESSES.** The person is compared
 * against a milestone that has not yet been reached partway through that month, so retiring inside
 * the target's own month is retiring before the milestone is achieved, never after it. The tie is
 * resolved once, here, in a strict `<`, rather than left for a caller to break two ways.
 */
export type MortgageTargetOutcome = 'retiresBeforeTarget' | 'retiresAfterTarget' | 'noRetirementDate';

export interface PersonMortgageTargetOutcome {
  readonly name: string;
  readonly outcome: MortgageTargetOutcome;
}

export interface MortgageTargetComparison {
  /** The entry this comparison was read off — `mortgageHeadline.ts` and the chart marker key on it. */
  readonly entryId: string;
  /** The target's own month, from the entry's `date` — the whole of what it states (`plan.ts`). */
  readonly month: IsoMonth;
  /** One outcome per Person, in `household.persons` order — `retirementMonths`'s own order. */
  readonly perPerson: readonly PersonMortgageTargetOutcome[];
}

/**
 * `entries` is the Scenario's resolved entries the walk `retirements` was read off — never the
 * pool, on `retirementMonths`'s own requirement, and it need not be pre-filtered: this filters to
 * the enabled `MORTGAGE_TARGET` entries itself, `retirementMonths`'s own idiom for `RETIRE`.
 */
export const mortgageTargets = (
  entries: readonly Entry[],
  retirements: readonly PersonRetirement[],
): readonly MortgageTargetComparison[] =>
  Object.freeze(
    entries
      .filter((entry) => entry.enabled && entry.type === 'MORTGAGE_TARGET')
      .map((entry) => {
        const month = monthOf(entry.date);
        return Object.freeze({
          entryId: entry.id,
          month,
          perPerson: Object.freeze(
            retirements.map((person) =>
              Object.freeze({
                name: person.name,
                outcome:
                  person.month === undefined
                    ? ('noRetirementDate' as const)
                    : person.month < month
                      ? ('retiresBeforeTarget' as const)
                      : ('retiresAfterTarget' as const),
              }),
            ),
          ),
        });
      }),
  );
