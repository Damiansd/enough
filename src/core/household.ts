// P3-14 — `HomeStatus` and the `protectedAssets` / `assessableAssets` split (ADR-0005) — together
// with the classification half of P3-13, the younger-partner accumulation exemption.
//
// The split is the input the Age Pension means test consumes, so the rules that decide which side
// of it a dollar falls on live here rather than inside the calculation:
//
//   * **The home has no value.** ADR-0005 holds `HomeStatus`, not a number, as the means-test
//     primitive, and its 2026-09-03 amendment note narrows that by exactly one input: the market
//     value is a Setting read by HEAS capacity alone. There is therefore no `homeValue` field on
//     `Person` or `Household`, and nothing in this file or in `agePension.ts` can read one. That
//     is the enforcement mechanism — not a convention, an absence.
//
//   * **The younger-partner exemption** (T27): superannuation in Accumulation Phase held by a
//     Person who has not reached Age Pension age is exempt from **both** tests. It ends at the
//     earlier of that age or the fund starting to pay **any** income stream — including a TTR.
//     `superInterestTreatment` takes the phase and the age gate together for that reason: a TTR
//     is never exempt, at any age, and there is no code path that reaches the exemption without
//     first asking which phase the interest is in.
//
// Money is integer cents throughout (P2-4). Every legislated figure is read from
// `data/assumptions` — nothing here re-declares one.
import { addCents, subCents, toCents } from './money.js'; // `.js` is correct in a `.ts` file — see tsconfig.json
import type { Cents } from './money.js';
import { AGE_PENSION } from '../data/assumptions/agePension.js';
// Type-only, and both are erased by the compiler: `conditionOfRelease.ts` imports `ageAt` and
// `assertIsoDate` from this file, so a value import back would be a runtime cycle. The types are
// imported rather than restated because a second spelling of either is the failure this chunk is
// most exposed to — one register row, two incompatible types, and nothing to say which is meant.
import type { Schedule1ItemIdentification } from './conditionOfRelease.js';
import type { WithdrawalCharacterisation } from './transferBalanceAccount.js';
import type { FinancialYear, IsoDate } from '../data/assumptions/types.js';

/** Register §4.9 — 67, and a policy risk rather than an indexed parameter (register O3). */
export const AGE_PENSION_AGE: number = AGE_PENSION.qualification.qualifyingAge.value;

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * `IsoDate` is a template literal type, so it admits `2026-3-5`, which would compare wrongly
 * against `2026-03-20`. Every date entering this module is a parameter — nothing here reads the
 * clock (P4-1a) — so this is the one boundary check that keeps the string ordering sound.
 */
export const assertIsoDate = (date: string): IsoDate => {
  if (!ISO_DATE.test(date)) throw new RangeError(`not a zero-padded ISO date: ${date}`);
  return date as IsoDate;
};

/** Age at last birthday on `date`. Pure string arithmetic: no `Date`, no timezone, no clock. */
export const ageAt = (dateOfBirth: IsoDate, date: IsoDate): number => {
  assertIsoDate(dateOfBirth);
  assertIsoDate(date);
  const years = Number(date.slice(0, 4)) - Number(dateOfBirth.slice(0, 4));
  return date.slice(5) < dateOfBirth.slice(5) ? years - 1 : years;
};

// --- The Home, as a status (ADR-0005) -----------------------------------------------------------

/**
 * The time-varying exemption state of the home. Derived per month from the Journal Entries by the
 * projection engine, never stored as a fixed value — and never carrying a value.
 *
 * The two `vacated…` members are the two sides of the ADR-0005 two-year clock. Which one applies
 * on a given month is **P3-15's** job to decide from the `VACATE_HOME` date; the means test only
 * needs to know which side of the cliff the month falls on. That is the seam between the two
 * tasks, and it is why the clock itself is absent here.
 *
 * **`noHome` was reachable by nothing until P14-13 (2026-09-25): `SELL_HOME` sets it, from the
 * month it applies, once and for good — projection.ts's `homeSold` local.**
 *
 * **`noHomeSaleProceedsExempt` (P14-13c, 2026-09-25) is the ONE TEMPORARY proceeds-exemption status
 * this build models — DSS Guide 4.6.3.90's 24-month window (sales on or after 1 January 2023,
 * which every sale this forecaster can state falls under) for the part of the proceeds a household
 * states it intends for a new home (`SellHomeParams.newHomeAmount`).** "The person continues to be
 * assessed as a homeowner during the exemption period" — so `homeTreatment` reports `homeowner:
 * true` here despite there being no home, the one place in this union where the two are split apart.
 * `principalHomeExempt` is still `false`: there is no home for that flag to protect, only a cash
 * amount, and that amount's own carve-out is a line `splitAssets` adds from its
 * `saleProceedsSetAside` parameter, not this flag. The extended 12-month exemption beyond the
 * 24-month window (SSAct s 1118(2B), granted only on discretionary "reasonable attempts" /
 * "delays beyond their control" criteria) is NOT modelled: `projection.ts` reverts the household to
 * `noHome` at the 24-month cliff, unconditionally.
 *
 * **`rentedOut` — `RENT_OUT_HOME` (P14-13, 2026-09-25), the STANDALONE case only: a household that
 * rents out its home with no `ENTER_CARE` behind it at all.** DSS Guide 4.6.3.60 ("Exempting the
 * principal home — temporary vacation of property"): a household that does not intend to return
 * makes the home an assessable asset, at non-homeowner thresholds, from the day it stops living
 * there — this build treats renting the WHOLE home out as exactly that declared intention, with no
 * 12-month temporary-absence grace (the conservative, understating-entitlement reading; see
 * `projection.ts`'s `RENT_OUT_HOME` block). Where an `ENTER_CARE` entry already governs the home
 * (the household left it to enter care, not to let it), this status is never set — the EXISTING
 * `vacatedProtectedPersonRemains`/`vacatedWithinTwoYearExemption`/`vacatedBeyondTwoYearExemption`
 * clock keeps deciding the ASSETS test exactly as before, and renting only changes the INCOME test
 * (DSS Guide 4.6.3.70, see `projection.ts`). Like `vacatedBeyondTwoYearExemption`, this status
 * carries no value of its own — `RentOutHomeParams` has no `homeValue` field, by design (the
 * household's own estimate is `EnterCareParams.homeValue`'s to state) — so a plan reaching this
 * status is always `homeIsAssessableButUnvalued` (`splitAssets`) and refuses exactly as the old
 * manually-set `homeStatus` path already does: reachable, and always refusing, rather than
 * unreachable.
 *
 * `SELL_HOME` after a `RENT_OUT_HOME` is a normal sale (`noHome`/`noHomeSaleProceedsExempt`,
 * subject to the same 6-year rule `projection.ts` already applies); renting out a home that is
 * already mid-way through a sale-proceeds exemption window makes no sense — there is no home left
 * to rent — and `parsePlan` refuses it by name rather than let the two statuses collide.
 */
export type HomeStatus =
  | 'occupied'
  | 'vacatedProtectedPersonRemains'
  | 'vacatedWithinTwoYearExemption'
  | 'vacatedBeyondTwoYearExemption'
  | 'noHome'
  | 'noHomeSaleProceedsExempt'
  | 'rentedOut';

export interface HomeTreatment {
  /** Which assets free area applies. Owner-occupied with a mortgage is still a homeowner (§4.4). */
  readonly homeowner: boolean;
  /** Whether the principal home exemption covers it — the home and up to 2 hectares (§4.4). */
  readonly principalHomeExempt: boolean;
}

/**
 * The means-test treatment of a `HomeStatus`, with no value anywhere in the signature.
 *
 * A vacated home past the two-year cliff is **no longer exempt AND no longer a homeowner's home**
 * (SS Act s 11A(9)(b) — DSS Guide 4.6.3.70, "the income support recipient is treated as a
 * non-homeowner, AND principal home is an assessable asset"), and the register (T39) says it then
 * enters `assessableAssets` at its market value. Where that value has no source, ADR-0005's
 * amendment note and T42 say it never enters `assessableAssets` — a user ruling on 2026-09-04
 * **resolved T39 in favour of T42** for that case, so v1 knowingly diverges from the law on this
 * one case, and that knowing divergence is the resolution. Full assessment is Phase 14 work
 * (register §4.4.1). Absent a value, `splitAssets` flags it
 * (`AssetSplit.homeIsAssessableButUnvalued`) so `agePensionEntitlement` refuses rather than assess
 * a home at a figure it is not allowed to look at.
 *
 * **P14-5a (2026-09-25) narrows that divergence by exactly one case.** Where an `ENTER_CARE` entry
 * supplies a usable estimate, `splitAssets`'s caller (the walk) MAY pass it in — never read from
 * `Household` itself, which still carries no home value anywhere — and the refusal above is
 * replaced by an actual assessment. See ADR-0005's 2026-09-25 note and `AssetSplit.lines`.
 */
export const homeTreatment = (status: HomeStatus): HomeTreatment => {
  switch (status) {
    case 'occupied':
    case 'vacatedProtectedPersonRemains':
    case 'vacatedWithinTwoYearExemption':
      return { homeowner: true, principalHomeExempt: true };
    case 'vacatedBeyondTwoYearExemption':
      return { homeowner: false, principalHomeExempt: false };
    case 'noHome':
      return { homeowner: false, principalHomeExempt: false };
    // P14-13c — DSS Guide 4.6.3.90: "the person continues to be assessed as a homeowner during the
    // exemption period", even though there is no longer a home for `principalHomeExempt` to cover.
    case 'noHomeSaleProceedsExempt':
      return { homeowner: true, principalHomeExempt: false };
    // DSS Guide 4.6.3.60: not intending to return makes it assessable at non-homeowner thresholds —
    // the SAME treatment as `vacatedBeyondTwoYearExemption`, for a different, un-clocked reason.
    case 'rentedOut':
      return { homeowner: false, principalHomeExempt: false };
  }
};

// --- People and their money ---------------------------------------------------------------------

/**
 * A superannuation interest. The phase is what the means test turns on, not the balance:
 * Accumulation Phase is the only one the younger-partner exemption can reach (T27).
 */
export interface SuperInterest {
  readonly phase: 'accumulation' | 'accountBasedPension' | 'ttr';
  readonly balance: Cents;
  /**
   * **The per-stream facts only the user can supply** — register ~2515, the per-stream half of the
   * §3.10.3 state table. Absent here, absent everywhere: `phase` and `balance` carry no day, no
   * Schedule 1 item and no election, so a Person holding an account-based pension today is, to this
   * model, a pension with no history at all.
   *
   * **Why it is per stream and not per Person.** s 307-80(3)(b)(ii) names *"the superannuation
   * income stream provider **for the superannuation income stream**"*, so one Person with two TRISs
   * may have notified one provider and not the other. The fact belongs on the interest.
   *
   * **Why the whole object is optional.** Same device as `statedPriorRetirementPhase` below:
   * requiring it would put the question in front of every author of a `SuperInterest`, including
   * the Age Pension and Work Bonus fixtures, which have nothing to do with Div 294. Absent means
   * *nobody was asked* — a third state, not a default answer.
   *
   * **Nothing reads this yet (P3-9 chunk 5b-2).** It is the shape, added ahead of the resolution
   * that will consume it, so that the resolution is a change to one function rather than a change
   * to every `Person` literal in the suite at the same time.
   */
  readonly statedStreamSettings?: StatedStreamSettings;
  /**
   * **WHERE THE EMPLOYER PAYS — the one fact that decides which account a Superannuation Guarantee
   * lands in when a Person holds more than one (P6-8 brief 3, chunk 2a, user ruling 2026-09-20).**
   *
   * The Guarantee must land in a NAMED account. For a Person holding exactly ONE accumulation
   * interest that account is derivable and this field is not needed: there is one candidate and
   * naming it would be ceremony. For a Person holding TWO, nothing else in this model marks one of
   * them as the fund their employer pays into — `phase` and `balance` are both silent on it — and
   * *"the one with the larger balance"* is a guess wearing the costume of a derivation. So the
   * missing fact is added rather than invented.
   *
   * **Why it is per interest and not per Person.** The same shape as `statedStreamSettings` above,
   * and for a stronger reason than symmetry: the thing being marked IS an account. An index held on
   * the `Person` would be a second way of naming an interest, and it would go stale the moment an
   * interest was inserted ahead of it — a silent renumbering, which is the failure class this
   * project has the most of. The cost of putting it on the interest is that TWO interests can each
   * claim it, and that is refused BY NAME at the door (`parsePlan.ts`), where the whole Person is
   * in hand; it is not resolved by picking one.
   *
   * **WHAT ABSENCE MEANS, enumerated — there are four kinds and three of them are legal.**
   *   1. **Stated by nobody, and the Person holds exactly ONE accumulation interest.** LEGAL, and
   *      it is the ordinary case: every plan file written before 2026-09-20 is in it, as is every
   *      fixture in this suite. The destination is that interest, derived and not guessed.
   *   2. **Stated by nobody, and the Person holds NO accumulation interest** (fully retired, or
   *      holding no super at all). LEGAL. There is no account a Guarantee could be paid into, which
   *      is a fact about the Household and not a defect in the file.
   *   3. **Stated by nobody, and the Person holds TWO OR MORE accumulation interests.** LEGAL AT
   *      THE DOOR and the destination is UNDETERMINED. It is not refused here because refusing it
   *      would reject plan files that are perfectly well formed and that predate this field, for a
   *      question their author was never put. What must not happen is a Guarantee being credited to
   *      a fund chosen by this model, and that is held by the walk, not by the door.
   *   4. **Stated on a RETIREMENT-PHASE interest, or stated on TWO interests of one Person.**
   *      ILLEGAL, both of them, refused by name at the door — the first because a retirement-phase
   *      stream is closed to contributions on exactly the ground `checkContributionTargets` already
   *      refuses a stated sacrifice into one, the second because a Person has one employer
   *      destination or none and two claims are two answers to a question with one answer.
   *
   * Stating it where it is redundant — on the single accumulation interest of case 1 — is legal and
   * changes nothing: the nomination and the derivation agree, and a user who names their fund
   * explicitly should not be punished for it.
   *
   * **The value names WHICH employer money this interest receives**, rather than being a boolean,
   * on `StatedStreamSettings`'s ground: a bare `true` would answer, silently and in whichever
   * direction the next author found convenient, a question about scope that nobody has asked. This
   * build knows one kind of employer contribution — the Guarantee — and additional employer
   * contributions beyond it have no entry type and no field anywhere (`parsePlan.ts` refuses one by
   * name), so any other value is refused rather than read as a synonym.
   *
   * **Nothing in the walk reads this yet (chunk 2a).** It is the shape and its refusals, landed
   * ahead of the crediting, so that the crediting is a change to one place rather than a change to
   * every fixture at the same time — `statedStreamSettings`'s device, used again deliberately.
   */
  readonly statedEmployerContributionDestination?: 'superannuationGuarantee';
  /**
   * **WHERE THE COMMISSIONER TAKES IT — the ITAA 1997 Subdiv 293-B election to have a Division 293
   * liability RELEASED FROM SUPERANNUATION rather than paid out of the Person's own cash (register
   * O84, P6-9 M1, user ruling 2026-09-20).**
   *
   * Subdiv 293-B lets an individual who has been assessed for the Division 293 tax give the
   * Commissioner a release authority, so that the amount comes out of a superannuation interest
   * instead of their pocket. This build ~~has always taken~~ took the statutory DEFAULT — the ATO
   * assesses the Person and the Person pays, from the same cash the salary arrived in — and held no
   * field for the election. **That is what this field ended (P6-10): from 2026-09-20 the walk
   * performs the election at the year-end settlement for a Person who states it here.** O84 was the
   * one open gap in the superannuation-contribution feature that FLATTERED the Household (the
   * released-election Person really holds less super and more cash than this build showed them, and
   * an accumulation interest below Age Pension age is means-test exempt where Offset cash is deemed
   * from the first dollar), which is why the missing fact was added rather than inferred from
   * anything — and what is LEFT of it still flatters, in ~~two residuals~~ **ONE residual** O84
   * names: a first or last PARTIAL financial year never reaches a settlement, so an electing
   * Person's accrual in such a year stands as the cash default they did not choose. ~~and no form
   * box sets this field, so only a hand-edited plan field can carry the election~~ — **SUPERSEDED
   * 2026-09-20 (P6-11): the household form states this field now** (`settingsPanel.ts`, one
   * single-choice control per Person offering their accumulation interests and an explicit "no
   * election"), which was O84's residual (iii) and is closed. The struck clause is kept because a
   * reader who remembers it must be able to see it was retired rather than lost.
   *
   * **⚠️ PRESENCE IS THE ELECTION, AND SILENCE IS NEVER "DERIVE IT" — this is the one place this
   * field's rule DIVERGES from `statedEmployerContributionDestination` above.** For the Guarantee,
   * silence on a Person holding exactly one accumulation interest is resolved BY DERIVATION: the
   * employer pays somewhere, there is one candidate, and naming it would be ceremony. Here there is
   * no "somewhere". The default is not an unnamed account, it is NO RELEASE AT ALL — s 293-65 makes
   * the individual liable and Subdiv 293-B is a thing they may choose to do — so a silent Person has
   * not omitted an account, they have declined an election, and deriving "the sole accumulation
   * interest" from their silence would invent a choice they never made. That would not merely be a
   * guess in the shape of a derivation: it would re-open O84 in the OPPOSITE direction, moving the
   * charge out of super for a Person who would really have paid it in cash, understating their
   * assessable assets' twin — their exempt super — and mispricing the means test the other way. So
   * the resolver this field is built for reads a value or reads NOTHING; it has no fallback, and
   * there is no plan file whose silence it may interpret.
   *
   * **It is a SIBLING of the employer destination, not a reuse of it**, and deliberately so: that
   * field names where the EMPLOYER CREDITS and this one names where the ATO DEBITS, which are two
   * different events with two different actors, and a Person may rationally nominate different
   * interests for each — pay the Guarantee into the fund with the insurance, take the charge out of
   * the one with the cash. Conflating them would let a nomination made for one purpose silently
   * authorise the other.
   *
   * **Why it is per interest and not per Person.** `statedEmployerContributionDestination`'s reason
   * exactly, and here it carries more weight: the release authority NAMES A SUPERANNUATION INTEREST,
   * so the thing marked IS an account. An index on the `Person` would be a second way of naming an
   * interest and would go stale the moment one was inserted ahead of it. The cost is the same — two
   * interests can each claim it — and it is refused BY NAME at the door (`parsePlan.ts`), where the
   * whole Person is in hand, not resolved by picking one.
   *
   * **WHAT ABSENCE MEANS, enumerated — six kinds, and four of them are legal.**
   *   1. **Stated by nobody, anywhere.** LEGAL, and it is EVERY plan file written before this date
   *      and every fixture in this suite. It means the statutory default: no election, the charge
   *      is paid in cash. It does NOT mean "unstated, so work it out".
   *   2. **Stated on ONE accumulation interest of a Person.** LEGAL. That is the election, and it
   *      names the interest the Commissioner's release authority is served on.
   *   3. **Stated on a RETIREMENT-PHASE interest.** ILLEGAL, refused by name at the door, on the
   *      ground `checkContributionTargets` and `checkEmployerContributionDestinations` already
   *      state from the other direction: a payment out of a retirement-phase stream is a
   *      commutation, not a withdrawal — it moves the transfer balance account, changes the pension
   *      being paid and the Schedule 7 minimum drawn from it — and this build has no path that
   *      commutes. Debiting the stream anyway would produce a balance no fund would produce.
   *   4. **Stated on TWO interests of one Person.** ILLEGAL, refused by name. A release authority
   *      is served on one interest; two claims are two answers to a question with one answer, and
   *      the alternative to refusing is this build choosing which fund is raided.
   *   5. **Stated on one interest each of TWO DIFFERENT Persons.** LEGAL. Division 293 is assessed
   *      per individual (s 293-65) and so is the election, so two Persons electing is two elections
   *      and not a conflict — the same per-Person rule the employer destination has.
   *   6. **Stated by a Person with NO Division 293 liability at all.** LEGAL AND INERT. Nothing is
   *      released because nothing is charged. It is not refused because liability is a fact about a
   *      YEAR of the walk, not about the Household: a Person under the $250,000 threshold today may
   *      cross it in any later year of a forecast that runs to age 100, and a door that refused a
   *      standing election would have to run the projection to do it.
   *
   * There is no seventh kind for "a Person holding no interest at all": the field lives ON an
   * interest, so such a Person has nowhere to state it and is case 1 by construction.
   *
   * **The value names WHICH liability may be released**, rather than being a boolean, on
   * `statedEmployerContributionDestination`'s ground: a bare `true` would answer a question about
   * scope that nobody has asked. This build knows one release authority — Division 293's — and the
   * others (an excess concessional contributions determination, Division 296) are not modelled and
   * have no field anywhere, so any other value is refused rather than read as a synonym.
   *
   * **Nothing reads this yet (M1).** It is the shape and its refusals, landed ahead of the
   * resolver and ahead of any change to the charge, so that the debit is a change to one place
   * rather than a change to every fixture at the same time.
   */
  readonly statedReleaseAuthorityDestination?: 'division293';
  /**
   * **THE ADMINISTRATION FEE'S DOLLAR LIMB — the flat part of the fee, PER YEAR (P3-17 slice 1).**
   *
   * An ordinary APRA fund quotes its administration fee in two parts — *"$X a year plus Y% of your
   * balance"* — and the two are stated separately here rather than pre-combined, because they are
   * two figures on the member's statement and combining them would need a balance, which is the
   * thing that moves. `statedAdministrationFeeRate` below is the other limb.
   *
   * **Per YEAR, and the walk is monthly.** The figure a statement quotes is annual, so this field
   * holds the annual figure and `projection.ts` owns the one division. Storing a monthly figure
   * would put the conversion at every author of a `SuperInterest`.
   *
   * **Absent means NIL, and nil means NO LINE.** This is not the third-state device
   * `statedStreamSettings` and `statedReleaseAuthorityDestination` use: there is nothing for a fund
   * to have decided and nothing for this build to derive, so *"nobody stated a fee"* and *"the fee
   * is zero"* have the same consequence to the cent — no money moves. The field is optional so that
   * every plan file and every fixture written before 2026-09-20 keeps projecting byte-identically,
   * and so that the ~1,600 existing test fixtures are not each a statement about fees.
   *
   * **⚠️ NO DEFAULT, EVER, and that is the whole of design point 4.** There is no "typical" figure
   * here and this build must not supply one: a fee is the single most plan-specific number on a
   * member's statement, it varies by more than an order of magnitude across funds, and a defaulted
   * one would be a forecast input chosen by this module rather than by the user. Silence costs the
   * Household nothing, which UNDER-states the drag — that is a known and stated incompleteness
   * (TODO P3-17), not an assumption wearing a figure.
   *
   * ⚠️ **STATED IN TODAY'S MONEY — a REAL figure, raised to each month's price level by the walk
   * (register O87, user ruling of 2026-09-21, on O85's standing principle).** A dollar fee is a
   * PRICE FOR A SERVICE charged every year for up to forty years, which is `annualSpend`'s shape
   * and not `Mortgage.monthlyRepayment`'s: the bank's repayment is contracted in dollars, a fund's
   * fee is not. Held flat, as it was until that ruling, it fell to four fifths of itself over ten
   * years and two thirds over forty, which understated a cost and so FLATTERED the household.
   *
   * **WHICH SERIES raises it changed on 2026-09-25 (P3-17 slice 4).** Until then `projection.ts`
   * raised it by `economicSeries.cpi` alone, in every phase. Aware's own fee schedule
   * (`~/.enough/verification/P13-1c-aware-soa-extract.md`, p.15) indexes THIS SAME dollar limb by
   * salary growth in accumulation phase and by price inflation in retirement phase, and this field
   * now follows that split: `monthlySuperFeesForOneMonth` raises it by `economicSeries.awote` while
   * the interest's EFFECTIVE phase for the month is `'accumulation'` or `'ttr'`, and by
   * `economicSeries.cpi` once it is `'accountBasedPension'` — through `priceLevelFactor` in
   * `core/priceLevel.ts` either way, the one expression the spending level and the Contingency Floor
   * already share, so there is still no second exponentiation of either series. See
   * `statedPensionAdministrationFeePerYear` below for the retirement-phase account's OWN dollar
   * figure, which this field is superseded by once an interest converts and states one.
   *
   * `statedAdministrationFeeRate` and `statedInvestmentFeeRate` are NOT raised and must not be: a
   * share of a balance is already in the month's own dollars, so indexing a rate would count the
   * price level twice.
   *
   * Refused at the door if negative: a negative fee is a credit, and this field names a charge.
   */
  readonly statedAdministrationFeePerYear?: Cents;
  /**
   * **THE ADMINISTRATION FEE'S PERCENTAGE LIMB — a fraction of the balance, PER YEAR (P3-17).**
   *
   * `0.0025` is 0.25% a year, the same convention `Settings.nominalReturn` and the deeming rates
   * use — a fraction, never a whole-number percentage. A float, because a rate is not money
   * (ADR-0001: `Cents` is the money type and rates are the only floats in this model).
   *
   * **WHICH balance it is charged on is NOT stated here** — it is a decision about the walk, not a
   * fact about the fund, and it is taken once in `monthlySuperFeesForOneMonth` in `projection.ts`
   * with its reasoning. Stating it here as well would be a second copy of a rule.
   *
   * **NOT raised to the price level, and that is not an omission (register O87).** The dollar limb
   * is — it is a stated price in today's money — but a rate is applied to a balance that is already
   * in the month's own nominal dollars, so this limb rises with the account on its own. Indexing it
   * as well would charge the price level twice.
   *
   * See `statedAdministrationFeePerYear` for why absent is nil, why there is no default, and why
   * the figure is annual.
   */
  readonly statedAdministrationFeeRate?: number;
  /**
   * **A CAP ON THE PERCENTAGE ADMINISTRATION FEE, PER YEAR — P3-17 slice 3, gated 2026-09-24,
   * user-approved 2026-09-25.** Caps `statedAdministrationFeeRate` alone: the yearly asset-based fee
   * is `min(statedAdministrationFeeRate × balance, statedAdministrationFeeCapPerYear)`, applied on
   * `monthlySuperFeesForOneMonth`'s existing monthly schedule (`projection.ts` carries the ruling on
   * HOW a month respects an ANNUAL cap). **It never touches `statedAdministrationFeePerYear` or
   * `statedInvestmentFeeRate`** — Aware's own schedule (`~/.enough/verification/P13-1c-aware-soa-
   * extract.md`, p.15) caps the asset-based limb only ($52 + 0.15% capped at $750 p.a., accumulation
   * phase), and this field mirrors exactly that shape rather than inventing a household-wide cap.
   *
   * **STATED, NOT DEFAULTED — a per-account input, the same ruling `statedAdministrationFeePerYear`
   * took.** A cap is a fact about ONE fund's schedule, not a policy this build could assume: two
   * funds either side of $500k charge visibly different effective rates once one of them caps and
   * the other does not, so supplying a "typical" figure would be this module choosing a fund on the
   * user's behalf, exactly the door `household.ts:352-357` already closes for the other two fees.
   *
   * **ABSENT MEANS UNCAPPED, not zero** — the P3-17 slice 1 nil idiom, held again: a plan that never
   * mentions a cap projects byte-identically to one written before this field existed, because an
   * absent cap changes nothing about `Math.min`'s other argument ever winning.
   *
   * ⚠️ **INDEXED BY CPI WHILE THE INTEREST IS IN RETIREMENT PHASE — and by WAGES otherwise, from
   * 2026-09-25 (P3-17 slice 4, user-approved).** Aware indexes its own cap by **salary growth
   * (wages)** in accumulation phase and by **price inflation (CPI)** in retirement phase (the same
   * extract, p.15). Until this ruling this build held one field for an account's whole life and one
   * price-level lens (CPI only), which was exactly right for a RETIREMENT-PHASE account's cap and a
   * labelled, FLATTERING simplification for an ACCUMULATION one — wages have historically outpaced
   * prices (this repo's own demo settings state `awote: 0.035 > cpi: 0.025`), so a CPI-raised cap sat
   * BELOW the true wage-raised one in every later month, and once the cap bound, the LOWER cap
   * charged the account LESS than the fund really would have, ADR-0009's named failure mode. **That
   * simplification is CLOSED, not merely labelled, from this ruling on**: `monthlySuperFeesForOneMonth`
   * (`projection.ts`) now indexes this field by wages while the interest's EFFECTIVE phase for the
   * month (`effectivePhaseFor`) is `'accumulation'` or `'ttr'`, and by CPI only once it has become
   * `'accountBasedPension'` — matching Aware's own split rather than approximating it. See
   * `statedPensionAdministrationFeeCapPerYear` below for the retirement-phase account's OWN cap,
   * which this field is superseded by once an interest converts.
   *
   * **Refused at the door if negative** (`nonNegativeCents`, `parsePlan.ts`), on
   * `statedAdministrationFeePerYear`'s own ground. **Refused at the door if stated with no
   * `statedAdministrationFeeRate`**: a cap with nothing to cap is not a fact about a fund's
   * schedule, it is a number with no percentage fee for it to ever bind against, and the only two
   * things it could mean — "this account has no percentage fee" or "the rate was meant to be typed
   * too" — are both better said by fixing the file than by this build guessing which.
   */
  readonly statedAdministrationFeeCapPerYear?: Cents;
  /**
   * **THE INVESTMENT FEE — a fraction of the balance, PER YEAR (P3-17).**
   *
   * **It is a SIBLING of the administration fee and not a limb of it**, on exactly
   * `statedReleaseAuthorityDestination`'s reasoning about siblings: the two are quoted separately
   * on every member statement, they are charged by different parties (the trustee's administrator
   * and the investment manager), and a member who switches investment option changes this one and
   * not the other. Summing them into one stated rate would lose which figure a user must go and
   * change, and would make the fee lines unable to say what they were.
   *
   * **There is no dollar limb.** An investment fee is quoted as a percentage of the invested
   * amount and this build holds no evidence of a flat one, so no field is offered for it — an
   * unused field would be a question with no answer rather than an answer of nil.
   *
   * ⚠️ **This is NOT the fund's earnings tax and not the contributions tax.** Those are legislated
   * charges with registers behind them (`fundEarningsTax`, `contributionsTax`); this is a fee the
   * fund charges, it carries no register, and the lines it emits say so by carrying an
   * `UNLEGISLATED` record rather than a `FigureProvenance`.
   *
   * See `statedAdministrationFeePerYear` for why absent is nil, why there is no default, and why
   * the figure is annual.
   */
  readonly statedInvestmentFeeRate?: number;
  /**
   * **THE ADMINISTRATION FEE'S DOLLAR LIMB, FOR THE ACCOUNT-BASED PENSION PHASE ONLY — P3-17 slice
   * 4, user-approved 2026-09-25.** A fund does not charge one fee for an account's whole life:
   * Aware's own schedule (`~/.enough/verification/P13-1c-aware-soa-extract.md`, p.15) charges $52 +
   * 0.15% capped at $750, wage-indexed, in accumulation phase, and a DIFFERENT $52 + 0.16% capped at
   * $1,300, CPI-indexed, once the same money is a pension. The dollar figures happen to coincide at
   * Aware; the rate and cap do not, and nothing about this shape assumes a fund where all three do.
   *
   * **Read only in every month `effectivePhaseFor` resolves this interest to `'accountBasedPension'`
   * — stated as one from the start, or converted at `RETIRE` by the switch-at-retirement rule
   * (`keepInAccumulationAtRetirement`'s own ground).** A TTR interest is never read here while it
   * remains a TTR: register ~2515 and `superPhase.ts`'s own table hold a transition-to-retirement
   * income stream OUT of retirement phase for every purpose this build prices (T27's exemption, the
   * transfer balance account, Div 293's release authority), so a TTR is charged the ACCUMULATION set
   * on `effectivePhaseFor`'s own resolution — this field is read only once THAT function says
   * `'accountBasedPension'`, which for a TTR is the day it itself converts (R10), not the day it
   * commenced.
   *
   * **ABSENT MEANS THE ACCUMULATION FIGURE CARRIES ON, not nil** — the one place this fee's nil idiom
   * differs from `statedAdministrationFeePerYear`'s. A retiree whose fund charges the identical
   * dollar fee before and after conversion (Aware's own case, $52 either side) states it once and
   * never again; only a fund that changes the figure at retirement needs this field at all. Falls
   * back to `statedAdministrationFeePerYear` — never to nil — so a plan with no pension fee fields at
   * all projects a converted account's fee exactly as it did before this field existed, and every
   * plan file and golden fixture written before 2026-09-25 stays byte-identical.
   *
   * **INDEXED BY CPI, ALWAYS, WHILE READ** — Aware's own rule for a retirement-phase account, and not
   * a simplification here: unlike the accumulation dollar fee, which needed `effectivePhaseFor` to
   * pick a series, a figure this field ever supplies is BY CONSTRUCTION being charged in retirement
   * phase, so there is exactly one series it could mean.
   *
   * See `statedAdministrationFeePerYear` for why a dollar fee is annual, why it is stated in today's
   * money, and why a negative one is refused at the door.
   */
  readonly statedPensionAdministrationFeePerYear?: Cents;
  /**
   * **THE ADMINISTRATION FEE'S PERCENTAGE LIMB, FOR THE ACCOUNT-BASED PENSION PHASE ONLY** — the
   * other half of `statedPensionAdministrationFeePerYear`'s pair, on its own ground for WHEN it is
   * read, what absence means (falls back to `statedAdministrationFeeRate`, never to nil) and why a
   * TTR never reaches it. NOT raised to the price level, for `statedAdministrationFeeRate`'s own
   * reason: a share of a balance already in the month's own dollars.
   */
  readonly statedPensionAdministrationFeeRate?: number;
  /**
   * **A CAP ON `statedPensionAdministrationFeeRate` ALONE, FOR THE ACCOUNT-BASED PENSION PHASE
   * ONLY** — `statedAdministrationFeeCapPerYear`'s pair, on the same three grounds as
   * `statedPensionAdministrationFeePerYear` above: read only once `effectivePhaseFor` resolves this
   * interest to `'accountBasedPension'`, absent falls back to `statedAdministrationFeeCapPerYear`
   * rather than to "uncapped", and refused at the door with no `statedPensionAdministrationFeeRate`
   * to limit, on `statedAdministrationFeeCapPerYear`'s own ground. Indexed by CPI, always, while
   * read — Aware's own rule for a retirement-phase account's cap (p.15), which is what closed the
   * labelled simplification this field's accumulation twin used to carry (see that field's doc).
   *
   * **There is deliberately no `statedPensionInvestmentFeeRate`.** Aware's own disclosure never
   * splits an investment fee by phase — its returns table (p.12) quotes MySuper Lifecycle
   * pre-retirement and Conservative Balanced post-retirement returns each already NET of investment
   * fees, and the SoA's own fee page (p.15) names only the administration fee as varying by phase.
   * `statedInvestmentFeeRate` above is a member's own INVESTMENT OPTION rate, which does not change
   * merely because the account starts paying an income, so it stays the one field for an interest's
   * whole life.
   */
  readonly statedPensionAdministrationFeeCapPerYear?: Cents;
  /**
   * **Death cover premium, per YEAR, off the statement — P3-17a slice 1.** Today's premium, i.e. at
   * the walk's first month. The walk carries it to each later age by the Aware table's own age factor
   * (`superInsurance.ts`); it is NOT raised by CPI, because the table is nominal. Nil from `statedDeathCoverEndsAtAge` (70 when absent), and from the month the account converts to an account-based pension (user ruling 2026-09-28; a TTR keeps cover). Refused at the door on an account stated as a pension.
   * Absent is nil. Requires `statedInsuranceCoverKind`.
   */
  readonly statedDeathPremiumPerYear?: Cents;
  /** TPD cover premium, per YEAR — `statedDeathPremiumPerYear`'s pair, scaled on TPD's own rates. */
  readonly statedTpdPremiumPerYear?: Cents;
  /**
   * **The age this account's death cover ends, off the fund's insurance terms** — a whole number, 16
   * to 70. Absent is 70, Aware's own end age and the last its tables price to (they stop at 69), so
   * a later age is refused at the door rather than priced off a rate nobody published. Read in the
   * month the age reaches it: a premium is charged while the age is BELOW it.
   */
  readonly statedDeathCoverEndsAtAge?: number;
  /** The age this account's TPD cover ends — `statedDeathCoverEndsAtAge`'s pair; many funds end TPD at 65. */
  readonly statedTpdCoverEndsAtAge?: number;
  /**
   * **How the cover amount moves with age**: `'fixed'` (the same cover every year) or `'age-based'`
   * (the fund's age-based scale). Required whenever a premium is stated — the two scale very
   * differently and this build does not guess which one the statement shows.
   */
  readonly statedInsuranceCoverKind?: 'fixed' | 'age-based';
  /**
   * The fund's flat insurance administration fee, per YEAR, in today's money, raised by CPI. Charged
   * only in a month where a premium is — death, TPD or income protection.
   */
  readonly statedInsuranceAdminFeePerYear?: Cents;
  /**
   * **Income protection premium, per YEAR, off the statement — P3-17b.** Today's premium, carried to
   * each later age by the ratio of Aware's Table 4 rates in `statedIncomeProtectionBenefitPeriod`'s
   * column (`superInsurance.ts`). IP cover is always fixed, so no cover kind is asked. NOT raised by
   * CPI. Nil from age 65, and from the month the account converts to an account-based pension (ruling 2026-09-28). Absent is nil. Stated together with the benefit period or not at all.
   */
  readonly statedIncomeProtectionPremiumPerYear?: Cents;
  /**
   * **How long the IP benefit is paid** — the one policy term that does not cancel in the ratio,
   * because Table 4's three columns are not proportional. Stated together with the premium.
   */
  readonly statedIncomeProtectionBenefitPeriod?: '2-years' | '5-years' | 'to-65';
  /**
   * **The opt-out from the switch at retirement (user ruling, 2026-09-23).** A Person's accumulation
   * account becomes a retirement-phase account-based pension on the day a `RETIRE` entry takes them
   * out of work at 60 or older, and a transition to retirement pension converts that day. `true`
   * keeps THIS account as it is at retirement. Absent, or `false`, is the switch.
   *
   * It is its own field because `phase` is required on every account and says what the account is
   * as at the plan's date: it cannot also say what the account should become later. Stated only on
   * an accumulation or TTR account — `parsePlan` refuses it on an account-based pension, which has
   * nothing left to switch.
   */
  readonly keepInAccumulationAtRetirement?: boolean;
}

/**
 * What a user can state about one superannuation income stream. Every member is a fact about an
 * ACT or a DAY, never a flag: the register's per-stream block is a set of days and identifications,
 * and a boolean in any of these slots would answer, in the flattering direction and on the user's
 * behalf, a question the user was never put.
 */
export interface StatedStreamSettings {
  /**
   * The day this stream started paying. Required *within* this object — a stated stream with no
   * commencement day is not a statement about a stream, it is an empty object — while the object
   * itself stays optional, which is where "nobody was asked" is carried.
   */
  readonly commencementDay: IsoDate;
  /**
   * **R13's stated changeover day, and it wins whenever it is present.** The day a TRIS moved to
   * retirement phase because the user says so. Absent, R13's backstop applies: the 65th birthday,
   * because SISR Sch 1 item 106 converts a TRIS automatically at 65 with no notification (R6). The
   * day itself is computed by `nthBirthday` in `financialYear.ts`; the resolution between the two
   * is not built yet and is deliberately not here.
   */
  readonly statedTrisConversionDay?: IsoDate;
  /**
   * **The 101/102A/103 route only.** On those three items the stream enters retirement phase on the
   * day the provider was **notified**, not the day the condition was satisfied — LCR 2016/9
   * Example 1B: retired 30 June 2019, notified 15 July 2019, retirement phase on 15 July 2019. A
   * fortnight is worth a year, so this day cannot be inferred from any day the model holds. On item
   * 106 there is nothing to notify and this stays absent.
   */
  readonly statedNotificationDay?: IsoDate;
  /**
   * Which item of SISR Schedule 1 the recipient satisfied for THIS stream (R7 input 5), as
   * `conditionOfRelease.ts` spells it. Absent means no item has been identified — which is not the
   * same as no item being satisfied, and neither is the same as item 106.
   */
  readonly statedSchedule1Item?: Schedule1ItemIdentification;
  /**
   * How an above-minimum withdrawal from this stream was characterised (O47) —
   * `pensionPayment` | `partialCommutation`, as `transferBalanceAccount.ts` spells it, which is
   * also where the default lives (`DEFAULT_WITHDRAWAL_CHARACTERISATION`, `pensionPayment`, the
   * direction that does not invent cap headroom). Not defaulted here: a default written twice
   * drifts from the one the ledger actually applies.
   */
  readonly statedWithdrawalCharacterisation?: WithdrawalCharacterisation;
  /**
   * **The share of the relevant-day balance a transition to retirement income stream pays each
   * financial year, as the member chose it** — a fraction, so `0.07` is 7%. Read only while the
   * interest's phase resolves to `'ttr'`. The door (`parsePlan`) refuses it outside Schedule 7's
   * lowest factor (4%) and the SISR reg 6.01(2)(b)(ii) ceiling (10%), and refuses it on an interest
   * that is not declared `'ttr'`.
   *
   * **Absent means the Schedule 7 minimum is paid**, which is what a fund pays a member who never
   * chose a figure. The walk pays `max(rate × balance, Sch 7 minimum)`, capped at the 10% ceiling;
   * in the year the stream commences the rate is pro-rated by days exactly as Sch 7 cl 3 pro-rates
   * the minimum, and the ceiling is not (see `ttrPaymentRange.ts`).
   */
  readonly statedTtrDrawdownRate?: number;
}

/**
 * **One acquisition of one non-super investment — P3-21a's parcel, and P3-21f chunk 1.**
 *
 * A parcel is what a CGT disposal is computed ON. The three fields are the three the disposal needs
 * and no more: the day it was acquired, what it cost, and what it is worth now.
 *
 *   * **`acquired` is REQUIRED and is never defaulted.** The 50% discount turns entirely on it —
 *     *more than* 12 months, so the day either side of the anniversary is a different tax bill
 *     (P3-21b, chunk 4). A parcel with no day, or with a day supplied by the model, would answer
 *     that question on the user's behalf and in the flattering direction. `financialAssets` below
 *     re-validates it on every read for that reason: the compiler cannot reach a `.mjs` fixture or
 *     a stored plan, so the guard is a runtime one.
 *   * **`costBase` is what the gain is measured FROM**, and nothing reads it before chunk 4. It is
 *     carried, never moved: **a month's growth accrues entirely to `marketValue` and leaves this
 *     figure untouched to the cent** (P3-21f chunk 2, ruled in `parcelsGrownForOneMonth`). Growth is
 *     not a payment, so there is nothing for it to add to what was paid — and a cost base that
 *     tracked the value would make every gain vanish while every figure still looked plausible.
 *   * **`marketValue`, not units.** Units would need a price to become money, and this model holds
 *     no price series: the pool grows at `Settings.nominalReturn`, a portfolio-level rate, and the
 *     means test, deeming and a disposal are all arithmetic in dollars. A unit count is also not
 *     expressible in the money type — `Cents` is whole cents and a fractional unit would be the
 *     first float in the balance sheet (P2-4). So the parcel holds the money it is worth.
 *
 * There is deliberately no identifier, no ticker and no `Person` back-reference. A parcel is owned
 * by being IN a `Person.parcels` (P3-21c — a realised gain is that Person's and cannot be shifted
 * after the fact), so ownership is a position in the tree rather than a field that could drift out
 * of step with one.
 */
export interface Parcel {
  /** The day this parcel was acquired. Zero-padded ISO, validated on every read. */
  readonly acquired: IsoDate;
  /** What it cost, on the day it was paid. Growth never moves it (P3-21f chunk 2); a disposal is
   * what finally reads it (chunk 4). */
  readonly costBase: Cents;
  /** What it is worth today. This is the money the means test sees. */
  readonly marketValue: Cents;
  /**
   * **The parcel's market value just before 1 July 2027** — the capital proceeds of the deemed sale
   * and the cost of the deemed reacquisition (ITAA 1997 s 112-155(2)–(3)(a), s 112-175(2)–(3)(a)).
   * Present only on a parcel acquired before 1 July 2027 and held through 30 June 2027; absent on
   * every other. The walk stamps it at the start of July 2027 when the plan starts on or before
   * 1 July 2027, where it is the walk's projection and not a valuation; a plan starting later must
   * state it on every parcel acquired before 1 July 2027, and no other plan may (`parsePlan`). A
   * disposal apportions it by market value exactly as it apportions `costBase`, and every rebuild
   * of a parcel carries it.
   */
  readonly valueJustBefore1July2027?: Cents;
  /**
   * **Distributions reinvested into this parcel on or after 1 July 2027** (P3-22h), kept OUT of
   * `costBase`. The walk sets it and a plan file never states it. It joins the cost base of the part
   * from 1 July 2027, where it belongs, instead of lowering the deferred gain. It is NOT indexed,
   * because one figure cannot carry each reinvestment's own quarter (s 960-275(1B)); leaving it
   * unindexed over-states the gain, which is the safe direction. Apportioned on a disposal and
   * carried by every rebuild, exactly as the stamp is.
   */
  readonly reinvestedFromJuly2027?: Cents;
}

export interface Person {
  readonly name: string;
  readonly dateOfBirth: IsoDate;
  readonly superInterests: readonly SuperInterest[];
  /**
   * **The Non-Super Portfolio, as the parcels it is made of** (ADR-0009, P3-21f chunk 1). This
   * Household holds none, and an empty array is the expected state rather than a special case.
   *
   * **There is no `financialAssets` field beside this one, and that absence is the design.** The
   * scalar the means test consumes is `financialAssets(person)` below — a DERIVATION over these
   * parcels, computed at every read. Two spellings of the same money is this repo's oldest trap,
   * and here it would be the worst kind: the Age Pension reads the scalar, so a stored figure that
   * drifted from the parcels would have the entitlement silently assessed on money the portfolio
   * no longer holds, with both figures looking perfectly reasonable.
   */
  readonly parcels: readonly Parcel[];
  /**
   * Employment and active self-employment income per fortnight — the only income the Work Bonus
   * may touch (T29). Investment income is deemed and is outside the definition entirely.
   *
   * In TODAY's wages: `project()` raises it to each month's wage level by `economicSeries.awote`
   * (2026-09-23), exactly as it raises a `WORK_PATTERN_CHANGE`'s stated salary.
   */
  readonly employmentIncomePerFortnight: Cents;
  /** This Person's Work Bonus balance. Per Person, never poolable (T29). */
  readonly workBonusBalance: Cents;
  /**
   * **Did this Person's transfer balance account start BEFORE the forecast? A DECLARED fact, and
   * the first of the two conjuncts `UnknownPersonalTransferBalanceCapError` turns on (O42).**
   *
   * Nothing else in this model can answer it. A `SuperInterest` above is `{ phase, balance }` with
   * no start day, so a Person holding an account-based pension today may have started it in 2018 or
   * may be about to start it inside the forecast, and the two need completely different arithmetic:
   * the first needs the seven user-supplied Settings of register §3.10.3, the second is computed in
   * full from the general cap for the seeding year.
   *
   * **Why this is not inferred from the absence of those Settings.** *"Settings absent, therefore
   * refuse"* refuses precisely the Person the refusal promises to compute — register ~2530: a Person
   * who has never been a retirement phase recipient before the forecast *"is fully computable and
   * must be computed"* — and §3.10.8 names that as the one scoping mistake that would turn the
   * refusal into a regression. So the fact is stated by the user or it is not known.
   *
   * **Why a tri-state and not a boolean.** A boolean has no way to say *"nobody asked"*, so it
   * arrives as `false` by default and answers, on the user's behalf and in the flattering direction,
   * a question the user was never put. The third state is carried by the field being OPTIONAL and is
   * read out as `notStated` by `priorRetirementPhaseAsStated` in `transferBalanceAccountSettings.ts`
   * — the one place `undefined` is interpreted. `notStated` is neither answer: it does not open the
   * O42 computed path and it does not stand in for a stated pre-forecast account.
   *
   * **Why the field is optional rather than required.** Requiring it would put the question in front
   * of every author of a `Person`, which is the better prompt, at the cost of touching the fifteen
   * `Person` literals in the Age Pension and Work Bonus tests, which have nothing to do with Div 294. The safety
   * does not rest on the compiler here: it rests on `notStated` being a third outcome rather than a
   * synonym for either answer, which is asserted in `core-transfer-balance-account-settings.test.mjs`.
   */
  readonly statedPriorRetirementPhase?: StatedPriorRetirementPhase;
  /**
   * **P3-4b — the unused concessional cap myGov shows for each of the five years before the plan's
   * first financial year**, keyed by financial year (`'2024-25'`), in cents. What is left of each
   * year's cap, not what was contributed.
   *
   * **Why OPTIONAL, and what absence means.** `statedPriorRetirementPhase`'s device: a year that is
   * not stated is read as FULLY USED — nil carried forward — by the walk, and so is the plan's own
   * first year when it opens after 1 July, because the months before the plan are not known either.
   * That over-refuses a Person who really has headroom and never invents headroom they lack, which
   * is the direction `MissingContributionHistoryError` was built to hold. `parsePlan` refuses a year
   * outside the window, a negative amount, and an amount above a cap this build can state.
   */
  readonly statedUnusedConcessionalCap?: Readonly<Record<FinancialYear, Cents>>;
  /**
   * **P3-4b slice 2 — this Person's total super balance at the close of the 30 June just before the
   * plan's first financial year, as myGov shows it**, in cents. Read only for a plan whose
   * `asAtDate` is not 1 July: the $500,000 carry-forward test reads that 30 June, and such a plan's
   * own balances are stated at a later date. Absent there, the first year's carry-forward window is
   * treated as CLOSED (ruled 2026-09-30) — conservative, never an invented window. `parsePlan`
   * refuses it on a plan stated as at 1 July, whose balances already are that 30 June's.
   */
  readonly statedTotalSuperBalanceAt30June?: Cents;
}

/**
 * The two answers a user can give to *"was your transfer balance account already running before the
 * forecast starts?"*. The values spell the fact rather than `true` / `false` so that a reader of a
 * call site cannot get the polarity backwards, and so that the third state — never stated — has a
 * name of its own rather than being the falsy one of two.
 */
export type StatedPriorRetirementPhase =
  | 'startedRetirementPhaseBeforeTheForecast'
  | 'neverARetirementPhaseRecipientBeforeTheForecast';

/**
 * The couple taken together. The Age Pension means test is the Household-level assessment
 * (CONTEXT.md), which is why `agePensionEntitlement` takes this and never takes a `Person`.
 */
export interface Household {
  readonly persons: readonly [Person] | readonly [Person, Person];
  readonly homeStatus: HomeStatus;
  /**
   * **The Offset Account balance the walk OPENS with (P4-3b).** Until this field existed the walk's
   * running cash — `Month.openingBalance` / `closingBalance`, which IS the Offset Account and is
   * Waterfall limb 4's only pool — started at nil because nothing in the model could say otherwise,
   * so a Household with a real offset began the walk unable to draw on it (an earlier Shortfall Age
   * than the truth).
   *
   * **Why it is a HOUSEHOLD fact and not a `Person` one.** An offset is an account against the
   * Household's home loan, and the home is a Household fact under ADR-0005's status model, so the
   * BALANCE is one figure and is never split into per-Person balances.
   *
   * ⚠️ **It HAS owners now, for INCOME TAX ONLY (user ruling, 2026-09-23).** This said *"a per-Person
   * split would invent an ownership question the user was never asked, and then have to answer it
   * with a default"*. The question has been asked and ruled: the Offset earns interest
   * (`Settings.cashInterestRate`), income tax is per Person, so each Person is taxed on their share
   * of that interest — `offsetShares` below. Nothing else reads the shares: the means test still
   * assesses and deems the pooled balance, and `splitAssets`' `byPerson` and
   * `accessibleWealthByPerson` still leave the Offset out of every Person's own figure.
   *
   * **Why OPTIONAL.** Same reason as `Person.statedPriorRetirementPhase` and
   * `SuperInterest.statedStreamSettings`: absent is a third state — *nobody stated an offset* — and
   * it reads as nil at the one place that seeds the walk (`project()`), so a Household written
   * before this field existed behaves exactly as it did.
   *
   * **Its means-test treatment needed no new rule.** Offset cash is assessable and deemed exactly as
   * the Non-Super Portfolio already is (ADR-0009, register §4.8's financial-investment row), so
   * `splitAssets` gains a line and no branch. Note that the line is assessed at the CURRENT balance
   * and not at this stated figure: `project()` substitutes the month's own running cash through
   * `withBalances` before the split, exactly as it does for parcels and super interests.
   */
  readonly openingOffsetBalance?: Cents;
  /**
   * **WHO OWNS THE OFFSET, FOR INCOME TAX — one share per Person, positionally, summing to 1
   * (user ruling, 2026-09-23).** `offsetShares[i]` is `persons[i]`'s share of the interest the
   * running cash earns, and that share is assessable income in `persons[i]`'s own assessment.
   *
   * **Absent reads as an equal split for a couple and 100% for a single Person** — see
   * `offsetSharesOf`, the one place the absence is interpreted. That is the ruling, not a guess: the
   * page shows a couple 50/50 until they say otherwise.
   *
   * **For tax and for nothing else.** The means test is a Household assessment and deems the pooled
   * balance whoever owns it, and no per-Person wealth figure takes a share of the Offset.
   */
  readonly offsetShares?: readonly [number] | readonly [number, number];
  /**
   * **The home loan, as the three figures a statement quotes (P3-16 slice 1).** Until this field
   * existed there was no mortgage anywhere in this model — README listed one in scope and the walk
   * held none — so a household still paying off its home spent nothing on it, and the Offset
   * Account sat beside a loan that was not there. `projection.ts`'s note on why the Offset does not
   * grow named exactly this absence as its reason.
   *
   * **Why it is a HOUSEHOLD fact.** `openingOffsetBalance`'s reason, unchanged: an offset sits
   * against the home loan and the home is a Household fact under ADR-0005's status model. A
   * per-Person split would invent an ownership question the user was never asked.
   *
   * **Why OPTIONAL, and what the absence means.** Absent is *no mortgage*, and it is the ONLY
   * spelling of that: a stated mortgage owing nothing is refused at the door, so there is exactly
   * one way to say "no home loan". Every Household written before this field parses,
   * walks and reports exactly as it did — no line, no note, no figure moved.
   *
   * ⚠️ **IT DOES NOT REACH THE MEANS TEST, AND THE ABSENCE OF A BRANCH IS THE MECHANISM.**
   * `agePension.ts`'s `homeownerWithAMortgage` (sourced to Services Australia) is that an
   * owner-occupier with a mortgage is a homeowner and the debt is netted only against the asset it
   * secures, which is itself exempt — so **mortgage debt is not deductible from other assets**.
   * `splitAssets` below therefore gains NOTHING for this field: no line, no subtraction, no branch.
   * The Offset stays assessable and deemed at its full balance, which is the asymmetry the register
   * calls correct and load-bearing. `withBalances` in `projection.ts` goes one step further and
   * builds the means-test view of the Household WITHOUT this field at all, so no reader on that
   * path can find a mortgage to net.
   *
   * **The balance here is the one the walk OPENS with.** `project()` carries its own running
   * balance from month to month — see `mortgageMonth` — so this figure is the Day-1 statement and
   * never the month's own.
   */
  readonly mortgage?: Mortgage;
}

/**
 * **A principal-and-interest home loan, in the three figures a mortgage statement quotes** (P3-16
 * slice 1). There is no term, no fixed/variable flag and no start date: the term is *implied* by
 * the three figures, which is what makes the arithmetic closed — see `mortgageMonth`.
 *
 * **Nothing here is defaulted, and there is no "typical" loan.** A rate this build supplied would
 * be a forecast wearing a fact's clothes, and a repayment it supplied would decide when the loan
 * ends. All three are the user's own figures or there is no mortgage.
 *
 * **What this deliberately cannot express**, each because it is a rule nobody has stated: an
 * interest-only period, a redraw, an extra or PART lump repayment (paying the WHOLE loan out is
 * `MORTGAGE_PAYOFF`, priced by `mortgagePayoffMonth` below), a payoff target (`MORTGAGE_TARGET` is an `UnspecifiedParams` entry type), and any of the
 * reverse-mortgage family (HEAS, and the no-negative-equity guarantee).
 *
 * ⚠️ **A REFINANCE IS NO LONGER ON THAT LIST (P3-16 slice 2).** `MORTGAGE_REFINANCE` is specified
 * and walked: it states all three of these figures again from a date, so it SETS the loan's terms —
 * and, for a Household that states none here, originates one. So *"a loan stated here has exactly
 * one trajectory from the day it is stated"* now reads: **until an entry states another one.** What
 * is stated here is the loan in force on day 1 and nothing more.
 */
export interface Mortgage {
  /** What is owed on the day the plan is stated as at. Whole cents, and greater than nil. */
  readonly openingBalance: Cents;
  /**
   * The rate as a DECIMAL fraction a year — `0.061` is 6.1% a year — on every other rate in this
   * model's convention. **Nil is legal**: a loan from family at no interest is a real arrangement,
   * and it amortises as pure principal rather than dividing by anything.
   */
  readonly annualInterestRate: number;
  /**
   * What is paid each month, in whole cents. It must cover the month's interest — see
   * `mortgageMonth`, which refuses a repayment that does not, by name, rather than walking a loan
   * that grows forever.
   */
  readonly monthlyRepayment: Cents;
}

/** One month of a home loan: what was paid, what of it was interest, and what is left owing. */
export interface MortgageMonth {
  /** The month's interest charge, after the Offset Account has been netted off the balance. */
  readonly interest: Cents;
  /** What came off the balance. `payment − interest`, and never negative. */
  readonly principal: Cents;
  /** What left the Household's cash: `interest + principal`. */
  readonly payment: Cents;
  /** What is owed once this payment is made. Nil is the loan ending. */
  readonly closingBalance: Cents;
}

/** Nothing owing, nothing paid — the answer for a month after the loan has ended. */
const MORTGAGE_ENDED: MortgageMonth = Object.freeze({
  interest: toCents(0),
  principal: toCents(0),
  payment: toCents(0),
  closingBalance: toCents(0),
});

/**
 * Point 1, point 2 and point 3 of `mortgageMonth`, in one expression: the offset nets off the
 * balance, the annual rate is divided by twelve, and the cent goes against the household. ONE
 * expression for both `mortgageMonth` and `mortgagePayoffMonth`, so a month's interest cannot be
 * priced one way on an ordinary repayment and another way on the month the loan is paid out.
 */
const monthsInterest = (balance: Cents, offsetBalance: Cents, annualRate: number): Cents =>
  Math.ceil((Math.max(0, balance - offsetBalance) * annualRate) / 12) as Cents;

/**
 * **ONE MONTH OF A HOME LOAN — P3-16 slice 1, and every ruling it takes is here rather than at the
 * call site.** `balance` is what is owed at the start of the month and `offsetBalance` is the cash
 * sitting against it; neither is defaulted, for `monthlySuperFeesForOneMonth`'s reason.
 *
 * ---
 *
 * **1. THE OFFSET IS READ AND NEVER CREDITED.** `interest = max(0, balance − offset) × rate / 12`.
 * That is the whole of what an offset account does: the cash stays the Household's, stays spendable,
 * stays assessable, and simply is not charged interest. **Nothing is paid INTO the offset here**,
 * which is what keeps `projection.ts`'s ledger contract — `closingBalance = opening + Σinflow −
 * Σoutflow` — exact. An offset larger than the balance charges NIL and never a credit: `max(0, …)`
 * is what makes that so, and a household cannot earn money by owing less than it holds.
 *
 * **2. A TWELFTH, ARITHMETIC — `rate / 12` and never the geometric twelfth.** Australian lenders
 * quote a nominal annual rate and accrue a monthly (in practice daily) slice of it; this is the fee
 * convention in `monthlySuperFeesForOneMonth`, not the return convention in `monthlyGrowthFactor`,
 * and for the same reason: a charge is not a compounding return. It is the larger of the two
 * readings, which is the non-flattering side.
 *
 * **3. THE ROUNDING IS UP.** `Math.ceil`, because the interest is an OUTFLOW measured against the
 * Household — the rule `monthlySpendFromAnnual` and the super fees already take. At most a cent a
 * month against the household, and it can never round a charge away to nothing.
 *
 * **4. THE FINAL PAYMENT IS WHAT IS OWED, NOT THE FULL REPAYMENT.** `payment = min(repayment,
 * balance + interest)`, so the last month pays the balance plus its last month of interest and the
 * balance lands on nil rather than going negative. A household does not overpay a closed loan.
 *
 * **5. A LOAN THAT NEVER ENDS IS REFUSED BY NAME AND NOT WALKED.** Where the repayment does not
 * cover the month's interest the balance grows, every month, forever — a forecast of a mortgage
 * that is never repaid, drawn as though it were an ordinary plan. `parsePlan` refuses it at the
 * door on the stated figures, and this throws if the walk ever reaches such a month (an offset can
 * fall, so a loan that covers its interest in month 1 need not in month 300). A plain `RangeError`,
 * in `soleOwnerIndex`'s idiom: it is an input-shape fact about THIS loan and not a register row.
 *
 * ---
 *
 * **HOW A MORTGAGE CAN END, all of it, in one place.** (i) It amortises to nil — point 4, and the
 * walk emits nothing at all from the following month. (ii) The forecast ends first, with a balance
 * still owing: nothing special happens, the last month simply pays. (iii) It never ends: refused,
 * point 5. (iv) It was never stated: absent, and the walk is byte-identical to a build without this
 * field. (v) It was stated as owing nothing: refused at the door, so absence has one spelling. A
 * rate of nil (legal) and an offset above the balance (point 1) both make the loan end EARLIER and
 * are not separate endings. Nothing else ends it — no sale, no refinance, no death, no payoff
 * target — because none of those is modelled.
 *
 * Pure, and it decides nothing about where the money comes from: the caller charges the payment
 * against the month's cash and carries the closing balance to the next month.
 */
export const mortgageMonth = (mortgage: Mortgage, balance: Cents, offsetBalance: Cents): MortgageMonth => {
  const { annualInterestRate: annualRate, monthlyRepayment: repayment } = mortgage;
  if (!Number.isSafeInteger(balance) || balance < 0) {
    throw new RangeError(`not a mortgage balance in whole cents: ${balance}`);
  }
  if (!Number.isSafeInteger(offsetBalance) || offsetBalance < 0) {
    throw new RangeError(`not an offset balance in whole cents: ${offsetBalance}`);
  }
  if (!Number.isFinite(annualRate) || annualRate < 0) {
    throw new RangeError(`not a mortgage interest rate: ${annualRate}`);
  }
  if (!Number.isSafeInteger(repayment) || repayment <= 0) {
    throw new RangeError(`not a monthly mortgage repayment in whole cents: ${repayment}`);
  }
  // The loan has ended. Checked before the interest so that a paid-off loan cannot be charged a
  // cent of anything, and so that point 5's refusal is never raised against a nil balance.
  if (balance === 0) return MORTGAGE_ENDED;
  const interest = monthsInterest(balance, offsetBalance, annualRate);
  // Point 5. Equality is refused too: a repayment that exactly meets the interest leaves the
  // balance where it was, every month, which is the same loan that never ends.
  if (repayment <= interest) {
    throw new RangeError(
      `a monthly repayment of ${repayment} cents does not cover the ${interest} cents of interest on a balance of ${balance} cents ` +
        `at ${annualRate} a year (offset ${offsetBalance} cents): the balance would grow every month and the loan would never be repaid, ` +
        'so it is refused rather than forecast',
    );
  }
  // Point 4.
  const payment = Math.min(repayment, balance + interest) as Cents;
  const principal = (payment - interest) as Cents;
  return Object.freeze({
    interest,
    principal,
    payment,
    closingBalance: (balance - principal) as Cents,
  });
};

/**
 * **THE MONTH A HOME LOAN IS PAID OFF IN FULL — `MORTGAGE_PAYOFF`.** `mortgageMonth`'s month with
 * point 4 replaced: the payment is not the stated repayment but everything owed, so the whole
 * opening balance is the principal and the loan closes at nil.
 *
 * **The month's interest is still charged, and by the same expression** (`monthsInterest`). A loan
 * paid out during a month has accrued that month's interest, and a payout that skipped it would be
 * the flattering answer. It is priced on the whole opening balance less the offset, exactly as an
 * ordinary month is — this build has no day within a month to pro-rate against.
 *
 * **Point 5 cannot arise**: the payment covers the interest by construction, so an otherwise
 * unpayable repayment is never consulted here and the stated repayment is not read at all.
 *
 * **A nil balance is REFUSED, not answered with `MORTGAGE_ENDED`.** `mortgageMonth` prices a nil
 * balance as nothing because a loan that has amortised away is an ordinary state; a PAYOFF of a loan
 * that owes nothing is an entry that cannot mean what it says, and the caller (`projection.ts`)
 * names the entry and the month on its own refusal before this is ever reached.
 */
export const mortgagePayoffMonth = (mortgage: Mortgage, balance: Cents, offsetBalance: Cents): MortgageMonth => {
  const { annualInterestRate: annualRate } = mortgage;
  if (!Number.isSafeInteger(balance) || balance <= 0) {
    throw new RangeError(`not a mortgage balance that can be paid off: ${balance} cents`);
  }
  if (!Number.isSafeInteger(offsetBalance) || offsetBalance < 0) {
    throw new RangeError(`not an offset balance in whole cents: ${offsetBalance}`);
  }
  if (!Number.isFinite(annualRate) || annualRate < 0) {
    throw new RangeError(`not a mortgage interest rate: ${annualRate}`);
  }
  const interest = monthsInterest(balance, offsetBalance, annualRate);
  return Object.freeze({
    interest,
    principal: balance,
    payment: (balance + interest) as Cents,
    closingBalance: toCents(0),
  });
};

export const isCouple = (household: Household): boolean => household.persons.length === 2;

/** How far a stated pair of shares may sit from 1 and still be read as summing to it: `0.3 + 0.7` in floating point. */
const SHARE_SUM_TOLERANCE = 1e-9;

/**
 * **The Offset's owners for income tax — `Household.offsetShares`, with its absence read.** Absent
 * is an equal split for a couple and 100% for a single Person (user ruling, 2026-09-23). A stated
 * list must have one share per Person, each from nil to 1, summing to 1; anything else is refused
 * by name rather than normalised, because rescaling a list that does not add up would pick an
 * answer the user did not give. `parsePlan` calls this at the door and `project()` in the walk.
 */
export const offsetSharesOf = (household: Household): readonly number[] => {
  const stated = household.offsetShares;
  if (stated === undefined) return household.persons.length === 2 ? [0.5, 0.5] : [1];
  if (stated.length !== household.persons.length) {
    throw new RangeError(
      `the offset account's ownership states ${stated.length} share(s) and the household has ${household.persons.length} person(s): state one share for each person`,
    );
  }
  for (const share of stated) {
    if (!Number.isFinite(share) || share < 0 || share > 1) {
      throw new RangeError(`an offset account ownership share of ${share} is not a share: each person owns from 0 to 1 of it`);
    }
  }
  const sum = stated.reduce((total, share) => total + share, 0);
  if (Math.abs(sum - 1) > SHARE_SUM_TOLERANCE) {
    throw new RangeError(
      `the offset account's ownership shares add up to ${sum}, not 1: between them the people in the household own all of it, so the shares must add up to exactly 1 (0.5 and 0.5 for an equal split)`,
    );
  }
  return stated;
};

/**
 * **One month's interest on the Offset, split into each owner's cents.** Every Person but the last
 * gets their share rounded DOWN and the last gets what is left, so the parts always add up to the
 * whole to the cent and no rounding creates or loses money.
 */
export const offsetInterestByOwner = (household: Household, interest: Cents): readonly Cents[] => {
  const shares = offsetSharesOf(household);
  let allocated = 0;
  return shares.map((share, index) => {
    const part = index === shares.length - 1 ? interest - allocated : Math.floor(interest * share);
    allocated += part;
    return part as Cents;
  });
};

export const hasReachedAgePensionAge = (person: Person, date: IsoDate): boolean =>
  ageAt(person.dateOfBirth, date) >= AGE_PENSION_AGE;

/**
 * What ONE parcel is worth, with the parcel checked as it is read.
 *
 * The three checks are the three ways a parcel can be malformed and still look like an object: no
 * acquisition day (or one the model supplied), a value that is not whole cents, and a negative
 * figure. Validating on READ rather than on construction is deliberate — parcels arrive from `.mjs`
 * fixtures and from stored plans, neither of which the compiler ever sees, so a type is not a
 * guard here. The cost is one string test per parcel per month, which is nothing.
 */
const parcelValue = (parcel: Parcel, owner: string): Cents => {
  assertIsoDate(parcel.acquired as string);
  for (const [field, amount] of [
    ['marketValue', parcel.marketValue],
    ['costBase', parcel.costBase],
  ] as const) {
    if (!Number.isSafeInteger(amount) || amount < 0) {
      throw new RangeError(`${owner} holds a parcel whose ${field} is not a whole number of cents: ${amount}`);
    }
  }
  return parcel.marketValue;
};

/**
 * **`financialAssets` is a FUNCTION, and that is the whole of chunk 1's structural claim.**
 *
 * The Non-Super Portfolio's scalar — the figure `splitAssets` assesses and deeming reaches — is the
 * sum of the market values of that Person's parcels, computed here every time it is wanted. It was
 * a stored field on `Person` until P3-21f chunk 1, and it cannot be one again without this function
 * being deleted: there is no field left for a caller to read.
 *
 * **Why the derivation and not a kept total.** The means test reads the scalar and the portfolio
 * holds the parcels. If both existed, a disposal (chunk 4) that moved one and not the other would
 * produce an Age Pension assessed on money the Household no longer holds — no exception, no
 * mismatch to notice, just a wrong entitlement that reads perfectly.
 *
 * A Person who states no `parcels` at all is REFUSED rather than read as holding nothing: absent is
 * not the same fact as empty, and the whole point of the field is that the pool is now stated as
 * parcels. `[]` is how a Household says it holds no investments outside super, and that is the
 * expected state (ADR-0009).
 */
export const financialAssets = (person: Person): Cents => {
  if (!Array.isArray(person.parcels)) {
    throw new RangeError(`${person.name} states no non-super parcels: an empty portfolio is \`parcels: []\`, not an absent field`);
  }
  return person.parcels.reduce<Cents>((sum, parcel) => addCents(sum, parcelValue(parcel, person.name)), toCents(0));
};

// --- The split ----------------------------------------------------------------------------------

export interface AssetLine {
  readonly owner: string;
  readonly description: string;
  readonly amount: Cents;
  readonly treatment: 'protected' | 'assessable';
  /** Whether deeming reaches it in the income test. Financial investments only. */
  readonly deemed: boolean;
  /** Why it landed on that side, in the register's terms. Carried through to P5 auditability. */
  readonly reason: string;
}

/**
 * **One Person's own share of the split (P7-6).** The two figures `AssetSplit` already reports for
 * the Household, restricted to the lines that Person owns.
 *
 * **It carries no name.** The Person is identified POSITIONALLY: `byPerson[i]` is the split of
 * `household.persons[i]`, and nothing here may be matched back by `owner`, because two Persons of a
 * Household may be given the same name and a name match would then silently pool them.
 *
 * **The Offset Account is in NEITHER member.** It is a Household fact under P4-3b — an account
 * against the Household's home loan — and attributing it to a Person would invent an ownership
 * question the user was never asked. So the two members plus the Offset make up the Household
 * figures, and the members alone do not.
 */
export interface PersonAssetSplit {
  readonly protectedAssets: Cents;
  readonly assessableAssets: Cents;
}

export interface AssetSplit {
  /**
   * Wealth excluded from the assets test, **as valued**. The home is protected and deliberately
   * carries no value (ADR-0005), so it contributes nothing here — see `homeIsProtectedButUnvalued`.
   */
  readonly protectedAssets: Cents;
  /** The only figure the entitlement calculation consumes (CONTEXT.md). */
  readonly assessableAssets: Cents;
  /** The subset of `assessableAssets` deeming applies to in the income test. */
  readonly deemedFinancialAssets: Cents;
  readonly homeowner: boolean;
  /** True whenever the home is exempt: it is Protected, and it has no value in this model. */
  readonly homeIsProtectedButUnvalued: boolean;
  /**
   * T39's law against T42's v1 scope, resolved 2026-09-04 in favour of T42. Makes `agePensionEntitlement` refuse
   * — UNLESS the caller supplied `splitAssets`'s `careVacatedHomeAssessment` (P14-5a), in which case this is
   * `false` and the figure is added into `assessableAssets` as its own line instead.
   */
  readonly homeIsAssessableButUnvalued: boolean;
  /**
   * **P14-13c — the part of `Household.openingOffsetBalance` carved out of the Offset Account line and
   * reported separately, because it is deemed differently, not because it is a different pool of
   * cash.** Present only where `splitAssets`'s `saleProceedsSetAside` parameter is supplied AND
   * greater than nil — absent, never nil, `careVacatedHomeAssessment`'s own idiom, so a Household
   * that never sold its home (the overwhelming majority) reports exactly what it always has.
   * Clamped to the offset actually held (never invented, never negative): a household that has since
   * spent the money it once set aside cannot have more of it protected than it currently holds.
   * `agePensionEntitlement` deems this figure SEPARATELY, at the LOWER deeming rate only, whatever
   * the household's other financial assets and the pooled threshold say (DSS Guide 4.6.3.90) — see
   * `AgePensionEntitlement.saleProceedsSetAsideDeemedPerFortnight`.
   */
  readonly saleProceedsSetAside?: Cents;
  readonly lines: readonly AssetLine[];
  /**
   * **The same two figures, per Person, positionally (P7-6).** `byPerson[i]` belongs to
   * `household.persons[i]` and the tuple union mirrors `Household.persons` so that a one-Person
   * Household cannot be handed a two-member answer.
   *
   * **A widening and nothing else.** Every member is the SAME `total()` expression the Household
   * scalars above are, run over that Person's own lines instead of over all of them — not a second
   * derivation of the treatment rules, which are decided once, where the lines are pushed.
   */
  readonly byPerson: readonly [PersonAssetSplit] | readonly [PersonAssetSplit, PersonAssetSplit];
}

/**
 * The `AssetLine.reason` of Accumulation Phase super held by a Person under Age Pension age —
 * exported so the comparison surface (P3-20f) shows the engine's own words and not a second copy.
 */
export const YOUNGER_PARTNER_EXEMPTION_REASON =
  'Younger-partner exemption: Accumulation Phase super held by a Person under Age Pension age is exempt from BOTH tests, including when assessing the older partner claim (§4.8).';

/** T27, and the register §4.8 treatment rules. Exemption needs the phase *and* the age gate. */
const superInterestTreatment = (
  interest: SuperInterest,
  ownerHasReachedAgePensionAge: boolean,
): { readonly treatment: 'protected' | 'assessable'; readonly deemed: boolean; readonly reason: string } => {
  if (interest.phase === 'accumulation') {
    return ownerHasReachedAgePensionAge
      ? {
          treatment: 'assessable',
          deemed: true,
          reason: 'Accumulation Phase super held by a Person of Age Pension age — assessed at the balance and deemed for income.',
        }
      : { treatment: 'protected', deemed: false, reason: YOUNGER_PARTNER_EXEMPTION_REASON };
  }
  return {
    treatment: 'assessable',
    deemed: true,
    reason:
      interest.phase === 'ttr'
        ? 'A TTR is an income stream, so the younger-partner exemption has ended at any age (T27). Assessed at the balance and deemed for income — the register states the treatment for an Account-Based Pension and does not restate it for a TTR, so the treatment itself is UNVERIFIED.'
        : 'Account-Based Pension: assessed at the account balance for assets and as a financial asset under the deeming rules for income (§4.8). Grandfathering is hard-coded false (T28).',
  };
};

/**
 * Split the Household's wealth into Protected and Assessable on `date`.
 *
 * The home still reaches this function only as a `HomeStatus`; `Household` itself carries no home
 * value anywhere, and this function never reads one off it.
 *
 * **P14-5a (2026-09-25) is the one narrow exception, and it is a THIRD PARAMETER, not a `Household`
 * field.** `careVacatedHomeAssessment`, supplied only where `homeStatus` is
 * `vacatedBeyondTwoYearExemption` AND the caller (the walk) has an `ENTER_CARE`-stated figure to
 * hand it — already carried to `date`'s own dollars on CPI and netted against any mortgage, by the
 * caller, never by this function. Absent, the cliff status still reports
 * `homeIsAssessableButUnvalued: true` and adds nothing, exactly as before this task.
 *
 * **P14-13c (2026-09-25) adds a FOURTH parameter on `careVacatedHomeAssessment`'s own footing:
 * `saleProceedsSetAside`** — the part of a sale's proceeds a `SELL_HOME` entry states is intended
 * for a new home, still within DSS Guide 4.6.3.90's 24-month window. Supplied by the caller (the
 * walk), never read off `Household` itself: `Household` carries no `SELL_HOME` fact, only the cash
 * the sale already left in `openingOffsetBalance`. This function carves that amount OUT of the
 * Offset Account line rather than adding a second claim on the same cash — see the Offset Account
 * block below.
 */
export const splitAssets = (household: Household, date: IsoDate, careVacatedHomeAssessment?: Cents, saleProceedsSetAside?: Cents): AssetSplit => {
  assertIsoDate(date);
  const home = homeTreatment(household.homeStatus);
  // **The lines are collected per Person and flattened, rather than tagged and filtered (P7-6).**
  // The array these push into is chosen by POSITION in `household.persons`, so `byPerson` below is
  // built from the same push the Household figures are and no `owner` string is ever matched on —
  // two Persons may share a name, and a name match would pool them into one.
  const ownLines: AssetLine[][] = household.persons.map(() => []);
  const sharedLines: AssetLine[] = [];

  household.persons.forEach((person, personIndex) => {
    const lines = ownLines[personIndex] as AssetLine[];
    const ofAge = hasReachedAgePensionAge(person, date);
    // ONE line for the whole of this Person's portfolio, at the sum of its parcels' market values —
    // the same line, at the same figure, that the stored scalar produced before chunk 1. A line per
    // parcel would be a different means-test report for the same money, and nothing in the assets
    // test or in deeming turns on which parcel a dollar sits in; what does turn on it is a disposal,
    // and that reads `person.parcels` directly rather than reading this split.
    const portfolio = financialAssets(person);
    if (portfolio !== 0) {
      lines.push({
        owner: person.name,
        description: 'Financial investments outside superannuation',
        amount: portfolio,
        treatment: 'assessable',
        deemed: true,
        reason: 'A financial investment: assessable, and deemed for the income test.',
      });
    }
    for (const interest of person.superInterests) {
      const { treatment, deemed, reason } = superInterestTreatment(interest, ofAge);
      lines.push({
        owner: person.name,
        description:
          interest.phase === 'accumulation'
            ? 'Superannuation, Accumulation Phase'
            : interest.phase === 'ttr'
              ? 'Superannuation, TTR'
              : 'Account-Based Pension',
        amount: interest.balance,
        treatment,
        deemed,
        reason,
      });
    }
  });

  // **The Offset Account — ONE line, outside the loop, because it belongs to the Household (P4-3b).**
  // It is assessable and deemed on exactly the rule the portfolio line above takes: offset cash is a
  // financial investment, so no new rule and no branch — only the same `!== 0` guard, so a Household
  // holding no offset reports no line rather than a line for nothing.
  //
  // **The figure is whatever the caller's Household carries, which inside `project()` is THIS
  // MONTH's running cash** — `withBalances` substitutes it the same way it substitutes parcels and
  // super balances. Reading the user's stated opening figure here every month would report the Day-1
  // offset in month 575, which is the stale-static-balance defect P4-1 chunk 5a fixed for the other
  // pools.
  //
  // `owner` names the people the Household is made of. It is audit-only: nothing in the assets test,
  // the income test or `deeming.ts` reads it, all three consume the pooled scalars below.
  const offset = household.openingOffsetBalance ?? toCents(0);
  // **P14-13c — the requested set-aside, clamped to what the household actually holds.** A household
  // that has since spent the money it once set aside for a new home cannot have more of it protected
  // than it currently holds; this model has one pool of cash, not a segregated "new home" account, so
  // the clamp is the honest reading rather than an invented negative balance elsewhere.
  const requestedSetAside = saleProceedsSetAside ?? toCents(0);
  const protectedSetAside = (requestedSetAside < offset ? requestedSetAside : offset) as Cents;
  const assessableOffset = subCents(offset, protectedSetAside);
  if (assessableOffset !== 0) {
    sharedLines.push({
      owner: household.persons.map((person) => person.name).join(' and '),
      description: 'Offset Account',
      amount: assessableOffset,
      treatment: 'assessable',
      deemed: true,
      reason: 'A financial investment: assessable, and deemed for the income test. Offset cash is cash (ADR-0009).',
    });
  }
  // **P14-13c — the part of that same cash set aside for a new home, DSS Guide 4.6.3.90.** `treatment:
  // 'protected'` keeps it out of `assessableAssets` for up to 24 months from the sale's settlement
  // (`AGE_PENSION.assetsTest.saleProceedsExemptionMonths`, applied by the caller). `deemed: true`
  // documents that the income test still reaches it — but `deemedFinancialAssets` below only pools
  // ASSESSABLE deemed lines, so this figure never joins that pooled calculation; the caller
  // (`agePensionEntitlement`) deems it separately, at the LOWER rate only, off `saleProceedsSetAside`.
  if (protectedSetAside !== 0) {
    sharedLines.push({
      owner: household.persons.map((person) => person.name).join(' and '),
      description: 'Sale proceeds set aside for a new home',
      amount: protectedSetAside,
      treatment: 'protected',
      deemed: true,
      reason:
        'DSS Guide 4.6.3.90 / SSAct s 1118(1B): the part of principal home sale proceeds intended for a new home is exempt from the assets test for up to 24 months from settlement, and the household is assessed as a homeowner throughout. It is still deemed for the income test, at the LOWER rate only, separate from the household\'s other financial assets.',
    });
  }

  // **P14-5a — the vacated home, past its care-situation cliff, at the caller's supplied figure.**
  // A HOUSEHOLD line, on the Offset Account's own precedent just above: the home is
  // `Household.mortgage`'s own fact, never one Person's. `deemed: false` — real property is not a
  // financial asset (§4.6.5 is a different register section from §4.4's deeming rules), unlike the
  // Offset's cash — so it reaches the assets test and not the income test's deeming.
  const homeIsNowValued = household.homeStatus === 'vacatedBeyondTwoYearExemption' && careVacatedHomeAssessment !== undefined;
  if (homeIsNowValued && careVacatedHomeAssessment !== 0) {
    sharedLines.push({
      owner: household.persons.map((person) => person.name).join(' and '),
      description: 'Former home, past its Age Pension care-situation exemption',
      amount: careVacatedHomeAssessment as Cents,
      treatment: 'assessable',
      deemed: false,
      reason:
        'SS Act s 11A(9)(b) / DSS Guide 4.6.3.70 (P14-5a): 2 years after nobody remained to protect it, the home is an assessable asset at its market value and the Household a non-homeowner — carried on CPI and netted against any mortgage by the caller, and real property, so not deemed for the income test.',
    });
  }

  // Every Person's lines in the Household's order, then the shared Offset and (P14-5a) home lines —
  // which is the order the single `lines` array was pushed in before P7-6, so no line moves.
  const lines: AssetLine[] = [...ownLines.flat(), ...sharedLines];

  // **ONE expression, given a different set of lines (P7-6).** The Household figures pass the whole
  // array and a Person's figures pass that Person's own; the treatment, the deeming flag and the
  // arithmetic are read from the same place in both, so a per-Person figure cannot be computed by a
  // rule the Household figure does not use.
  const total = (from: readonly AssetLine[], treatment: 'protected' | 'assessable', deemedOnly = false): Cents =>
    from
      .filter((line) => line.treatment === treatment && (!deemedOnly || line.deemed))
      .reduce<Cents>((sum, line) => addCents(sum, line.amount), toCents(0));

  return Object.freeze({
    protectedAssets: total(lines, 'protected'),
    assessableAssets: total(lines, 'assessable'),
    deemedFinancialAssets: total(lines, 'assessable', true),
    homeowner: home.homeowner,
    homeIsProtectedButUnvalued: home.principalHomeExempt,
    // **P14-13 — `rentedOut` joins `vacatedBeyondTwoYearExemption` here, and NEVER joins
    // `homeIsNowValued` above: `RentOutHomeParams` carries no value field, by design (see
    // `HomeStatus`'s own doc), so a household reaching `rentedOut` is always unvalued and always
    // refuses — `agePensionEntitlement`'s `UnvaluedAssessableHomeError`, reused rather than
    // reinvented for a second scope refusal that says the same thing for a different reason.**
    homeIsAssessableButUnvalued:
      (household.homeStatus === 'vacatedBeyondTwoYearExemption' || household.homeStatus === 'rentedOut') &&
      careVacatedHomeAssessment === undefined,
    ...(protectedSetAside === 0 ? {} : { saleProceedsSetAside: protectedSetAside }),
    lines: Object.freeze(lines),
    byPerson: Object.freeze(
      ownLines.map((own) =>
        Object.freeze({ protectedAssets: total(own, 'protected'), assessableAssets: total(own, 'assessable') }),
      ),
    ) as AssetSplit['byPerson'],
  });
};
