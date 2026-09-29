// P3-7, the phase limb — **which phase a superannuation interest is in, and the tax its earnings
// bear.** Register §3.1's two rows: "Fund earnings tax, Accumulation Phase / TTR — 15%" and "Fund
// earnings tax, Retirement Phase (ECPI) — 0%, ITAA 1997 ss 295-385, 295-390". Register §7 carries
// both as constants.
//
// **A TTR pension is a pension, and it is not Retirement Phase.** Its fund earnings are taxed at
// 15%, exactly like an accumulation account. The intuitive reading — "it is paying a pension, so
// its earnings are exempt" — is the one mistake this file exists to make unwriteable, because it
// makes every TTR strategy look better than it is, and whether a TTR strategy is worth running is
// a question this project is being built to answer. So a transition to retirement income stream
// does not get a phase of its own here: `transitionToRetirementInterest` **returns an
// `AccumulationInterest`**, the same type an accumulation account gets, and the rate table has two
// rows because there are two phases. Writing `phase: 'retirement'` into that constructor is a type
// error, not a wrong number.
//
// **Phase is not age, and it is not "has met a Condition of Release" either.** Three separate
// defences, none of them an assertion:
//
//   * **No age can arrive.** Every constructor below takes a `ConditionOfRelease` and, since P3-9
//     chunk 5a, an optional `DeclaredRecipient` carrying two booleans-in-all-but-name — neither of
//     which is a date, a number or an age.
//     There is no date of birth, no date, no number, and `ageAt` is not imported, so keying
//     phase off a birthday means first adding a parameter for the birthday to arrive through. That
//     is `benefitAccess`'s shape in `conditionOfRelease.ts`, deliberately, and for the same reason:
//     the `ConditionOfRelease` a constructor receives carries no age either, so nothing here can
//     read one off it. Be exact about how much that is worth *today*: nothing under `src/` calls
//     these constructors yet, so the added parameter breaks no call site and `tsc` stays silent —
//     the mutation is caught by the source canary in the tests, and it will become a compile error
//     once the projection engine calls in.
//
//   * **Meeting a Condition of Release is carried, never consulted.** `accumulationInterest` does
//     not read `release.met` at all. A Person of 67 who has retired, met the condition twice over
//     and left the money in an accumulation account is in Accumulation Phase and their earnings
//     are taxed at 15% — the money has to actually be moved into a retirement phase income stream,
//     and moving it is an act, not an anniversary. The minimal way to write the mistake —
//     `if (release.met) return retirementPhaseInterest(release)` — does not compile against the
//     declared `AccumulationInterest` return type.
//
//   * **The condition is necessary and not sufficient.** `retirementPhaseInterest` goes through
//     `requireBenefitAccess`, so a stream cannot be put in Retirement Phase for a Person whose
//     benefit is still preserved; but no route runs the other way.
//
// **What the register does not determine, and what is therefore refused or said out loud.**
//
//   * **When an income stream *enters* the retirement phase — stated by the register since
//     2026-09-09, and still not derived here.** §3.10.6 carries ITAA 1997 s 307-80's test in full:
//     the positive limb, the (3) carve-out as a conjunction, and the two conversion days —
//     **notification** for SISR Schedule 1 items 101, 102A and 103, and **automatically on the
//     65th birthday** for item 106, which (3)(b)(ii)'s enumeration omits. That last finding is an
//     `inference from an express enumeration` corroborated by a public ruling, and under ruling R6
//     it must never be recorded as bare `primary-verified`; this file states no confidence of its
//     own, so the only way it could break R6 is by deriving a phase from it. Phase therefore
//     remains **stated by the caller, per interest, and never derived here**. It arrives as a
//     choice of constructor, which is a fact about what the Person did with the money — and the
//     conversion day is a stated Setting under ruling R5, **not** derived from date of birth.
//     *(Corrected 2026-09-16 by P3-9 chunk 5b-4; this said "That Setting does not exist yet, which
//     is what `TrisRetirementPhaseNotModelledError` now refuses for want of", which stopped being
//     true at chunk 5b-2.)* The Setting is `StatedStreamSettings` in `household.ts`, R13's
//     resolution over it is `trisConversionDay.ts`, and the routing that picks a constructor from
//     the two is `trisInterestOrRefuse` in `trisInterest.ts` — **all three outside this file, and
//     none of them imported by it**, because the resolution is made of a birthday and this module
//     is the one place a birthday may not arrive. The refusal below still fires for every Person
//     that routing does not answer for, which is the 101/102A/103 route and O65's overlap.
//
//   * **Four of the seven inputs the entry test needs are absent from this module (R7).** §3.10.6
//     settles the list: (1) the time — `release.on`, present; (2) whether a benefit is payable —
//     implied by which constructor was called, and never explicit; (3) the stream kind —
//     `SuperIncomeStream`, a label the rate lookup does not read, which the entry test would make
//     the discriminant; and then the four that are not here at all — **(4) whether the recipient
//     is a reversionary beneficiary (s 307-80(3)(aa)); (5) which Schedule 1 items were satisfied
//     at or before the time (ss 307-80(2)(c), (3)(b)) — `ConditionOfRelease` carries two
//     `ReleaseGround` values and no item numbers; (6) the notification fact, which is per stream,
//     is an act rather than an anniversary, and is underivable (s 307-80(3)(b)(ii)); and (7) the
//     commutation-authority facts (s 307-80(4), s 294-50(3))**. They are recorded and not
//     invented: a field nobody reads would be worse than the gap, because it would look like the
//     test was being applied. **P3-9 chunk 1 (2026-09-15) added the two REFUSAL NAMES for inputs 4
//     and 6 — `ReversionaryStreamNotModelledError` and `TrisNotificationNotStatedError` — and no
//     fields.** Naming a refusal before the arithmetic that raises it is ruling R8's ordering.
//
//     **P3-9 chunk 5a (2026-09-16) then gave inputs 4 and 7 their fields, and both are INPUT
//     GUARDS rather than machinery: `DeclaredRecipient` below carries the reversionary fact and the
//     commutation-authority fact, and stating either of them refuses.** Nothing computes from
//     them, and nothing derives them — the register's own trigger for both is that the fact is
//     *stated* (§3.10.8), which is the only honest trigger available: a constructor handed a
//     condition of release cannot tell whether the recipient inherited the stream. **Inputs 5 and 6
//     are still absent FROM THIS MODULE**, so `TrisNotificationNotStatedError` still has no throw
//     site. *(Narrowed 2026-09-16 by P3-9 chunk 5b-4. This also said the conversion-day field
//     "waits on an open question about whether R5's Setting is required for the item-106 route" —
//     R13 answered that question on 2026-09-16: it is not required on that one route, because the
//     day is mechanically certain there, and R5 is undisturbed everywhere else.)* Both facts now
//     exist as `StatedStreamSettings` in `household.ts`, per stream, where they belong — not on
//     an interest here, and not on a `ConditionOfRelease`, which carries no stream identity.
//     **The converted case wanted its own constructor rather than a mutable phase on the TRIS
//     one, and it already had one:** a converted TRIS is a `RetirementPhaseInterest`, and
//     `retirementPhaseInterest` builds it. What was missing was not a constructor but a caller
//     that could decide a Person needed it, and `trisInterestOrRefuse` (`trisInterest.ts`,
//     chunk 5b-4) is that caller for the item-106 route alone.
//
//   * **The transfer balance cap gates how much may enter.** In real law a Person may only
//     transfer their personal transfer balance cap's worth of capital into retirement phase; the
//     excess stays in accumulation and is taxed at 15%. §3.1 carries the general cap ($2,100,000
//     for FY2026-27) and §§3.10.1–3.10.3 now carry the personal cap, its proportional indexation
//     and the highest-ever balance tracking that indexation reads — and since P3-9 chunks 1–6
//     `src/core/transferBalanceAccount.ts` BUILDS all three, plus the end-of-day breach check.
//     What is still true is narrower and is the thing this file is answerable for: **nothing in
//     this model applies any of it to a stated interest**, because no Person-level join exists
//     between an interest here and a transfer balance account there — that join is P4-1's walk.
//     *(Corrected 2026-09-16 by P3-9 chunk 6-4; this said "nothing in this model applies any of it
//     yet, because the P3-9 build has not happened", which stopped being true at chunk 1.)* This file does not
//     need it in order to be right about *a stated interest's* rate, and it deliberately offers no
//     way to ask the question it would need it for: there is no Person-level aggregation here, no
//     "how much of this balance is in retirement phase", and no total to split. What a caller
//     states as being in Retirement Phase is taken as stated and is **not checked against any
//     cap**, and every Retirement Phase result says so in its caveats rather than leaving the
//     omission to be discovered.
//
//   * **A mid-year change of phase — ANSWERED 2026-09-10 (register §3.11), and BUILT under ruling
//     R10 steps 1–3.** A stream that commences in December leaves the fund with part of the year
//     exempt and part not. Both grounds this comment used to give for refusing were wrong.
//     s 295-390 *had* been retrieved (by the P1-11 franking pass, 2026-09-04); "never retrieved by
//     any pass" was a negative nobody checked — **O70**. And the actuary's certificate is on the
//     *other* method: s 295-385(4) with reg 295-385.01 gives a **certificate-free** segregated
//     route for account-based pensions, while **s 295-390(4) requires one always**. The real
//     answer is that **there is no apportionment at all** — each dollar is traced, or one
//     proportion covers the whole year (§3.11.2) — and the only express days formula in the
//     Subdivision is s 295-410, which is for **RSAs** (T130).
//
//     So `fundEarningsTax` no longer refuses a conversion year. It takes a **`PhaseYearFraction`**
//     instead of a boolean and charges a part year at the **provable upper bound** — the
//     Accumulation Phase row on the whole year's earnings — disclosed by name in `basis` and in
//     the caveats. The bound is not a plausible default: the exempt proportion lies in [0, 1] by
//     construction (s 295-390(3)) and the s 295-385 exempt amount in [0, the year's income], so
//     `fund earnings tax ≤ 15% × taxable earnings` under **either** method — **for
//     `taxableEarnings ≥ 0`**. On a LOSS the inequality reverses and 15% is the largest notional
//     refund, not a ceiling (P3-31); `FundLossNotModelledError` is what keeps that unreachable,
//     and it is load-bearing because it is **unconditional over `coverage`**, not because of where
//     it sits. Its
//     error runs one way only — it overstates fund tax and understates the household — which is
//     why **R9's reasoning governs it and R1's does not** (§3.11.6). The naive repair, honouring
//     each interest's stated phase for the whole year, returns the register's F3 figure of
//     $4,500.00 against a statutory $7,569.86 and this bound of $11,250.00: the provable *floor*,
//     to the cent. That is what `CHARGED` below exists to make unwriteable.
//
//     `MidYearPhaseChangeError` is **narrowed, not lifted** (R10): it no longer blocks P3-8's
//     conversion limb or P4, and now fires only where the fraction was measured against a
//     different financial year — the one route by which a year containing a phase change could
//     still reach the 0% row. What the bound does **not** cover stays refused elsewhere and is
//     **not built here**: the segregated method's asset-level tracing and an unstated s 295-385(9)
//     election are R10 step 4, and they live in `ecpiMethod.ts` because they are fund-level
//     questions and this file is per-interest.
//
//   * **The SMSF/APRA discriminant — O69, ruled by R11 and carried here as `FundType`.** All of
//     Subdivision 295-F bites only for a self managed fund; for an APRA-fund member ECPI is
//     invisible. The discriminant is **on the interest** (a Person may hold one of each) and is
//     **absent by default** — no default value, and specifically not `'smsf'`, because a default
//     silently decides which of R10 step 4's refusals apply. Nothing in this file reads it:
//     `fundEarningsTax` charges the bound of §3.11.6, which is a ceiling under either method and
//     is therefore conservative for either fund type, so it needs no fund type and no existing
//     caller had to start supplying one. The one computation that turns on it is in
//     `ecpiMethod.ts`, and that is where a missing fund type is refused by name.
//
//   * **A loss.** 15% of a negative number is a refund, and a complying fund does not get one — a
//     loss is carried forward against later years' assessable income. §3 says nothing about that,
//     so a negative earnings figure is refused rather than negated.
//
// **What this file is not.** It does not compose the fund's taxable earnings — what goes into that
// base (realised gains and the one-third discount, contributions already taxed under
// `superConcessional.ts`, franked distributions) is not decided here. Franking credits inside
// super are P3-7a/b and are the next chunk: note only that Retirement Phase's 0% is an *exemption*
// (ss 295-385, 295-390), not a nil rate, which is why s 207-90 would destroy the credit but for
// s 207-110 — register §5A.3, trap T45. The TTR conversion limb of P3-8, the transfer balance cap
// (P3-9) and Division 296 are not here.
import { benefitAccess, requireBenefitAccess } from './conditionOfRelease.js'; // `.js` is correct in a `.ts` file — see tsconfig.json
import type { ConditionOfRelease } from './conditionOfRelease.js';
import { CommutationAuthorityNotModelledError } from './transferBalanceAccount.js';
import {
  daysInFinancialYear,
  daysInclusive,
  endOfFinancialYear,
  financialYearContaining,
} from './financialYear.js';
import { mergeProvenance, provenanceOf, withCaveats } from './provenance.js';
import type { ComputedProvenance, Consumed } from './provenance.js';
import { mulCents } from './money.js';
import type { Cents } from './money.js';
import { SUPERANNUATION } from '../data/assumptions/super.js';
import type { FinancialYear, IsoDate, Rate } from '../data/assumptions/types.js';

const FUND_TAX = SUPERANNUATION.fundTax;

/**
 * **Two phases, because the register has two rates.** A transition to retirement income stream is
 * not a third: it is an accumulation-phase interest that happens to be paying a pension, and there
 * is no row here for it to be given 0% through.
 */
export type EarningsPhase = 'accumulation' | 'retirement';

/** Register §3.1, both rows, keyed by the phase they belong to and read nowhere else in this file. */
const EARNINGS_TAX: Readonly<Record<EarningsPhase, Rate>> = {
  accumulation: FUND_TAX.earningsTaxAccumulation,
  retirement: FUND_TAX.earningsTaxRetirement,
};

const CONSUMED: Readonly<Record<EarningsPhase, readonly Consumed[]>> = {
  accumulation: [['superannuation.fundTax.earningsTaxAccumulation', EARNINGS_TAX.accumulation]],
  retirement: [['superannuation.fundTax.earningsTaxRetirement', EARNINGS_TAX.retirement]],
};

/**
 * **Which row of §3.1 a stated phase is actually charged at, given how much of the year it held.**
 * R10 step 3 lives here, as a total lookup rather than a guard, and that is the point: there is no
 * condition to delete. The naive repair — honour the stated phase for the whole year, register
 * §3.11.7's fixture F3, **$4,500.00 against a statutory $7,569.86 and this bound of $11,250.00** —
 * is not a line that can be removed. It has to be *written*, into the labelled cell below, over a
 * comment that says what the cell is for.
 *
 * Nor can the second index be dropped to get there: `CHARGED[interest.phase]` is a
 * `Record<YearCoverage, EarningsPhase>`, which is not an `EarningsPhase` and is not a key of
 * `EARNINGS_TAX`, so the mutation does not compile.
 */
const CHARGED: Readonly<Record<EarningsPhase, Readonly<Record<YearCoverage, EarningsPhase>>>> = {
  accumulation: { 'whole-year': 'accumulation', 'part-year': 'accumulation' },
  // The bound. A part year in Retirement Phase is charged at the ACCUMULATION row on the whole
  // year's earnings, because the exempt proportion lies in [0, 1] by construction (s 295-390(3))
  // and the s 295-385 exempt amount in [0, the year's income]: 15% of everything is therefore a
  // ceiling on the true liability under either method **for non-negative earnings** — on a loss it
  // reverses, see §3.11.6 as corrected by P3-31. Writing
  // `'retirement'` in the cell below is fixture F3, the provable floor, and mutation M-P3-25-1.
  retirement: { 'whole-year': 'retirement', 'part-year': 'accumulation' },
};

/**
 * Said on every Retirement Phase result, because the omission is load-bearing: the model has no
 * transfer balance cap yet, so the amount a caller puts in Retirement Phase is uncapped here.
 */
const UNCAPPED_ENTRY =
  'the interest is in Retirement Phase because it was stated to be, and no amount here has been ' +
  'checked against any cap. The register specifies both halves and this engine now implements one ' +
  'of them: §3.10.6 carries ITAA 1997 s 307-80’s entry test, which is built nowhere, while ' +
  '§§3.10.1–3.10.3 carry the personal transfer balance cap, its proportional indexation and the ' +
  'highest-ever balance the indexation reads — and those ARE built, in ' +
  'src/core/transferBalanceAccount.ts, along with the end-of-day breach refusal and (chunk 6-4) ' +
  'the refusal for a Person whose account predates the forecast. What is missing is the WIRING: ' +
  'nothing joins a stated Retirement Phase interest to a Person’s transfer balance account, so no ' +
  'figure this file produces is put to any of that. (Corrected 2026-09-16 by P3-9 chunk 6-4, and ' +
  'the superseded wording is kept so a reader who remembers it can see which half moved: this said ' +
  '"this engine implements neither … but the P3-9 build has not happened", which was true when it ' +
  'was written and false from chunk 1.) And the wiring is UNREACHABLE rather than merely ' +
  'unwritten, which is why it has not simply been written: measured 2026-09-18, when P4-1b part ' +
  '(A), the ledger join, was DEFERRED on exactly that ground. Nothing can construct the input a ' +
  'join would consume. No Journal Entry type commences a superannuation income stream, so a stated ' +
  'phase is a standing fact the walk never changes and the s 294-25(1) item 2 credit never fires ' +
  'inside a forecast; the only debit the ledger has is a commutation, and a pension payment is ' +
  'recorded as no movement, so the account cannot fall across a whole walk; a pension commencing ' +
  'in a year later than the published general cap year cannot be seeded at all, because the ' +
  'December quarter index number it would be seeded from is not published yet (register O40); and ' +
  'the seven per-Person Settings of §3.10.3 have no input channel into the walk. Register O57 ' +
  'states those four in full, the two conditions that CLOSE it, and the triggers that reopen the ' +
  'build decision. A stated Retirement Phase amount above the Person’s ' +
  'personal cap is therefore still reported here as wholly exempt, with no excess and no breach';

// --- Refusals -----------------------------------------------------------------------------------

/**
 * **This class IS ruling R5's mandated refusal, and P3-9 chunk 1 decided not to mint a second name
 * for it (2026-09-15).** Register §3.10.8 recorded the question and expressly left it open — *"the
 * row two above may already be this refusal … it is recorded here, not decided"*. Checked against
 * R5's own words: *"an absent conversion-day Setting for a Person holding a TRIS must raise a NAMED
 * REFUSAL, never silently skip the conversion"*. Every Person for whom a conversion could be due
 * reaches this throw site, because `transitionToRetirementInterest` refuses on
 * `release.met === true` and a Person who has **not** met a Condition of Release needs no conversion
 * day at all — the stream is squarely Accumulation Phase and the message says so. So R5's case is
 * covered, with no gap on the side that matters: silence on the cap side is what R5 forbade, and
 * there is no silence here.
 *
 * **It is covered on the BROAD side, not exactly, and §3.10.8's narrowing is now HALF DONE.**
 * This refusal still fires for every Person with `release.met === true` who reaches this
 * constructor, and that has not changed and must not: the return type below is what makes *a TRIS
 * in Retirement Phase* unwriteable here, and a narrowing that deleted the throw would delete the
 * pin with it. What changed on **2026-09-16 (P3-9 chunk 5b-4)** is that the **item-106** Person now
 * has somewhere else to go. `trisInterestOrRefuse` in `src/core/trisInterest.ts` takes the facts
 * this module is not allowed to hold — a date of birth, and the stated per-stream Settings — and
 * routes a Person whose `release.grounds` is **exactly** the automatic-release ground to
 * `retirementPhaseInterest` instead, once R13's conversion day has resolved. Everyone else it hands
 * straight back to `transitionToRetirementInterest`, which is to say: to this refusal, unchanged.
 *
 * **What is still refused here, and it is the honest residue.** (i) The **101/102A/103** route,
 * whose day turns on a notification this module does not hold — `TrisNotificationNotStatedError`
 * is its name and wiring it is chunk 5b-6's. (ii) **O65's overlap** — a Person who retired at 62 on
 * item 101, never notified, and then turns 65 carries **both** grounds at once, and §3.10.6 records
 * that the bare statutory text and the ATO's reading disagree about them. The router demands the
 * one ground *alone* precisely so that Person keeps landing here; picking a side of O65 would be a
 * finding, and neither module makes one. (iii) Anyone who calls this constructor directly.
 *
 * **The Setting is no longer absent, and this comment said it was until 2026-09-16.** Chunk 5b-2
 * built `StatedStreamSettings` in `household.ts` — the stated changeover day, the notification day
 * and the Schedule 1 item — and chunk 5b-3 built the resolution over it: **R13** makes a stated day
 * win whenever it is present and the **65th birthday** the backstop otherwise, refusing the one
 * contradiction (a stated day later than the birthday item 106 had already converted on). The open
 * question this paragraph used to record — *whether R5's conversion-day Setting is required for the
 * item-106 route specifically* — is the question R13 answered: it is not required, because on that
 * one route the day is mechanically certain. R5 is undisturbed everywhere else.
 */
export class TrisRetirementPhaseNotModelledError extends RangeError {
  constructor(on: IsoDate) {
    super(
      `the phase of a transition to retirement income stream cannot be stated on ${on} for a ` +
        'Person who has already met a Condition of Release, because the day it converted has not ' +
        'been stated. While the Person has not met a condition the stream is squarely Accumulation ' +
        'Phase and its earnings are taxed at 15%; once they have, the stream stays a TRIS and its ' +
        'tax phase is what changes. Register §3.10.6 now states *when* that happens: on the day ' +
        'the provider is NOTIFIED, for SISR Schedule 1 items 101, 102A and 103 (ITAA 1997 ' +
        's 307-80(3)(b)(ii); LCR 2016/9 Example 1B), and AUTOMATICALLY on the 65th birthday for ' +
        'item 106, which (3)(b)(ii)’s enumeration omits — and that second finding is an inference ' +
        'from an express enumeration, corroborated by a public ruling, never bare primary-verified ' +
        '(R6). What is missing HERE is the fact, not the rule: the conversion day is a stated ' +
        'Setting and is NOT derived from date of birth (R5), and this module holds neither the ' +
        'notification fact nor the Schedule 1 item that would say which route the Person is on — ' +
        'it takes a Condition of Release and nothing else, so no date of birth can reach it. ' +
        'The Setting itself EXISTS as of 2026-09-16: `StatedStreamSettings` in household.ts ' +
        '(chunk 5b-2) carries the stated changeover day, the notification day and the Schedule 1 ' +
        'item, and trisConversionDay.ts (chunk 5b-3) resolves R13 over it — a stated day wins, ' +
        'otherwise the 65th birthday. Skipping the conversion silently is not the conservative ' +
        'choice it looks like — it leaves the stream at 15% instead of 0%, which understates the ' +
        'household, but it also records no transfer balance credit, so a real breach of the cap ' +
        'goes undetected, which flatters it; mixed-direction errors get a refusal. The conversion ' +
        'limb of P3-8 is built for the item 106 route ONLY, and this refusal is what every other ' +
        'Person still gets: O60 no longer blocks it independently, because under ruling R10 ' +
        '`fundEarningsTax` now charges the conversion year at the proven upper bound rather than ' +
        'refusing it. If this Person turned 65 and satisfied no other Schedule 1 item, call ' +
        '`trisInterestOrRefuse` in trisInterest.ts, which resolves the day and then goes through ' +
        '`retirementPhaseInterest` for you. If they retired and notified their provider, that is ' +
        'the 101/102A/103 route and it is not built (`TrisNotificationNotStatedError`). ' +
        'Otherwise, state the interest as `retirementPhaseInterest` if the stream has converted, ' +
        'or as `accumulationInterest` if the money is sitting in accumulation.',
    );
    this.name = 'TrisRetirementPhaseNotModelledError';
  }
}

/**
 * **Ruling R8's own name — `ReversionaryStreamNotModelledError` won over
 * `ReversionaryPensionNotModelled`** because *"Stream"* is the statutory term (s 307-80(3)(aa)
 * speaks of the beneficiary of an income **stream**, which is wider than a pension) and because the
 * `Error` suffix matches every other refusal in this codebase. The losing spelling is recorded in
 * register §3.10.8 and must stay dead.
 *
 * **A SCOPE REFUSAL** (§3.5.1's fourth kind): the rule is retrieved and is not in doubt. s 307-80(3)
 * is a **conjunction** — a listed stream kind AND not a reversionary beneficiary AND the
 * condition/notification test failed — so (aa) failing collapses it and the stream is in the
 * retirement phase regardless of the beneficiary's own conditions of release and notifications.
 * What is missing is everything **around** it: death benefits, the s 294-25(1) item 2(b) twelve-month
 * reversionary deferral, Subdiv 294-E and SISR reg 6.21 are all absent from the register.
 *
 * **Why it may not be approximated by ignoring the reversionary fact.** Modelling (aa) without the
 * rest gives 0% fund earnings tax with no cap check for a year — *the most flattering wrong answer
 * available*, in §3.10.6's own words. It is R7 input 4.
 *
 * **Reachable since P3-9 chunk 5a (2026-09-16), as an input guard and nothing more.** The field is
 * `DeclaredRecipient.reversionaryBeneficiary`, and all three constructors below refuse on it
 * **before** any other test they apply — including, in `retirementPhaseInterest`, before the
 * preservation gate. That ordering is the law, not a convenience: (3)(aa) failing collapses the
 * conjunction whatever the beneficiary's own conditions of release, so a reverted stream paid to a
 * 45-year-old who has satisfied nothing must refuse **as a reversionary stream**, not as a
 * preserved benefit (T122). **The limit, stated rather than left to be discovered: the guard
 * cannot detect an undeclared reversionary beneficiary** — the fact is stated or it is nothing,
 * which is the register's own trigger and the only one a constructor handed a condition of release
 * could honestly have.
 */
export class ReversionaryStreamNotModelledError extends RangeError {
  constructor(on: IsoDate) {
    super(
      `the phase of a superannuation income stream cannot be stated on ${on} for a reversionary ` +
        'beneficiary. ITAA 1997 s 307-80(3) is a conjunction — a listed stream kind, AND not a ' +
        'reversionary beneficiary, AND the condition/notification test failed — so paragraph ' +
        '(aa) failing puts the stream IN the retirement phase whatever the beneficiary’s own ' +
        'conditions of release and notifications, which is the opposite of the answer the rest of ' +
        'this module would give. The rule is not what is missing: death benefits, the ' +
        's 294-25(1) item 2(b) twelve-month reversionary deferral of the credit, ITAA 1997 ' +
        'Subdiv 294-E and SISR reg 6.21 are absent from the register entirely (O54, O55 / U12). ' +
        'Modelling (aa) alone would give 0% fund earnings tax with NO transfer balance cap check ' +
        'for a year, which is the most flattering wrong answer available, so it is refused. State ' +
        'the stream as the deceased member’s own interest, or wait for the death-benefits build.',
    );
    this.name = 'ReversionaryStreamNotModelledError';
  }
}

/**
 * **The 101/102A/103 half of what `TrisRetirementPhaseNotModelledError` currently refuses as one
 * (register §3.10.8) — a SCOPE REFUSAL on a missing FACT, not on a missing rule.**
 *
 * For SISR Schedule 1 items 101, 102A and 103 the stream enters the retirement phase on the day the
 * provider is **notified**, not the day the condition was satisfied (s 307-80(3)(b)(ii); LCR 2016/9
 * Example 1B ¶30D: retired 30 June 2019, notified 15 July 2019, *"The TRIS is in the retirement
 * phase on 15 July 2019"*). **A fortnight is worth a year:** retiring in one financial year and
 * notifying in the next moves the account-start year, the personal cap s 294-35(1) fixes, the
 * valuation day of the credit, and the year the fund's earnings become exempt.
 *
 * **The fact is per stream and is underivable.** s 307-80(3)(b)(ii) names *"the superannuation
 * income stream provider **for the superannuation income stream**"*, so one Person with two TRISs
 * may have notified one provider and not the other; a `ConditionOfRelease`, which carries no stream
 * identity, cannot hold it. It is an **act, not an anniversary** — no date this model holds produces
 * it — which is why it is a required Setting and never defaulted.
 *
 * **The shortcut this refusal exists to stop.** TR 2013/5 ¶71B paraphrases s 307-80(3) and drops the
 * notification requirement entirely (*"will not be in the retirement phase unless the person has met
 * a specified condition of release"*). On the operative text that paraphrase is wrong for the
 * retired-but-not-notified case, and an implementer who reaches for the shorter sentence exempts a
 * whole year's fund earnings that are taxable.
 *
 * **It must never reach the item-106 route.** Item 106 is in (3)(b)(i)'s reference and **not** in
 * (3)(b)(ii)'s, so for a member who has turned 65 there is nothing left to notify — a finding that
 * is an `inference from an express enumeration` corroborated by a public ruling and, under ruling
 * R6, never bare `primary-verified`. Routing item 106 through this refusal is trap **T80 / T117**.
 *
 * **No throw site in `src/` today**; chunk 5b routes into it, and the routing needs the Schedule 1
 * item, which this module does not hold (R7 input 5).
 */
export class TrisNotificationNotStatedError extends RangeError {
  constructor(on: IsoDate) {
    super(
      `the phase of a transition to retirement income stream cannot be stated on ${on}: the ` +
        'recipient satisfied SISR Schedule 1 item 101, 102A or 103 at or before that day, and ' +
        'whether the superannuation income stream provider was NOTIFIED of that fact has not ' +
        'been stated. On that route the notification is the conversion — the stream enters the ' +
        'retirement phase on the day the provider is notified, not the day the condition was ' +
        'satisfied (ITAA 1997 s 307-80(3)(b)(ii); LCR 2016/9 Example 1B ¶30D) — and a fortnight ' +
        'is worth a year: retiring in one financial year and notifying in the next moves the ' +
        'transfer balance account’s start year, the personal cap fixed by s 294-35(1), the ' +
        'valuation day of the credit, and the year the fund’s earnings become exempt. The fact is ' +
        'PER STREAM, because the provision names the provider "for the superannuation income ' +
        'stream", and it is an act rather than an anniversary, so no date this model holds ' +
        'produces it: it is a Setting, required and never defaulted. Do not reach for TR 2013/5 ' +
        '¶71B, which paraphrases this subsection with the notification requirement dropped and ' +
        'is wrong for the retired-but-not-notified case — taking it exempts a whole year of fund ' +
        'earnings that are taxable. This refusal does NOT apply to item 106 (attaining 65), ' +
        'which s 307-80(3)(b)(ii)’s enumeration omits, so nothing is left to notify.',
    );
    this.name = 'TrisNotificationNotStatedError';
  }
}

/**
 * **Narrowed by ruling R10, and this is what is left of it.** It no longer refuses a conversion
 * year — a part year is charged at the bound (§3.11.6) — and it is no longer the blocker on P3-8's
 * conversion limb or on P4. It fires on the one route by which a year containing a phase change
 * could still reach the Retirement Phase row: a fraction counted against a *different* financial
 * year's calendar, where 365 of 366 days would pass a whole-year test.
 */
export class MidYearPhaseChangeError extends RangeError {
  constructor(fy: FinancialYear, held: PhaseYearFraction) {
    super(
      `the FY${fy} fund earnings tax cannot be worked out from a phase fraction counted against ` +
        `FY${held.fy}: ${held.days} of ${held.daysInYear} days. A day count is a fact about one ` +
        'year’s calendar and is not evidence for another — a financial year containing 29 ' +
        'February has 366 days, so a full 365-day span carried across from a neighbouring year ' +
        'would pass the whole-year test while in truth describing a year in which the phase ' +
        'CHANGED, and a mid-year change charged at the Retirement Phase rate is exactly the ' +
        'flattering answer this refusal exists to stop. This is now the whole of what it refuses. ' +
        'It is NO LONGER a blocker on the TRIS conversion limb of P3-8 or on P4, and it no longer ' +
        'refuses a conversion year at all: under ruling R10 a phase held for part of the year is ' +
        'charged at the proven upper bound — the Accumulation Phase rate on the whole year’s ' +
        'earnings — which is disclosed by name rather than presented as the fund’s actual ECPI. ' +
        'Register §3.11 states the ground: there is NO apportionment of a part-year — each dollar ' +
        'is traced under s 295-385, or one proportion covers the whole year under s 295-390 — and ' +
        'the certificate sits on the proportionate method (s 295-390(4) always), NOT on the ' +
        'segregated one, which has a certificate-free route for account-based pensions via ' +
        's 295-385(4) and reg 295-385.01. Count the fraction against the year being computed: ' +
        'phaseHeldForTheWholeYear(fy), or phaseHeldFrom(fy, the conversion day).',
    );
    this.name = 'MidYearPhaseChangeError';
  }
}

export class FundLossNotModelledError extends RangeError {
  constructor(fy: FinancialYear, taxableEarnings: Cents) {
    super(
      `FY${fy} taxable earnings of ${taxableEarnings} cents are negative, and this model does not ` +
        'carry a fund loss. A complying fund does not receive 15% of its loss back: the loss is ' +
        "carried forward and deducted against a later year's assessable income, and the register " +
        'records no rule for that at all. Returning a negative tax would show as a refund in a ' +
        'forecast and would be spent.',
    );
    this.name = 'FundLossNotModelledError';
  }
}

export class PhaseYearMismatchError extends RangeError {
  constructor(fy: FinancialYear, on: IsoDate) {
    super(
      `the phase of this interest was stated on ${on}, which is in FY${financialYearContaining(on)}, ` +
        `and it is being applied to FY${fy}. Phase is a fact about what the Person has done with ` +
        'the money at a point in time, not a permanent property of the account — a Person can ' +
        'commute a retirement phase pension back to accumulation — so a statement made in one ' +
        'year is not evidence for another.',
    );
    this.name = 'PhaseYearMismatchError';
  }
}

// --- How much of the year the phase held (R10 step 2) --------------------------------------------
//
// **Why this is a pair of integers and not a fraction.** §3.11.2 decomposes the fund-level s 295-390
// proportion exactly into a per-interest time weight, so a fraction is the right *concept*; but the
// representation has to survive two hazards a float does not.
//
//   * **The whole-year test is an equality, and it decides between 0% and 15% on the whole year's
//     earnings.** `daysInclusive(...) / daysInFinancialYear(fy)` is a float, and a float equality
//     against 1 is the kind of comparison this project holds money in integer cents to avoid. Two
//     integers compare exactly, at any year length, for ever.
//   * **T130 — a days-based split of the year is NOT the law under either method.** The only days
//     formula in Subdivision 295-F is s 295-410, and it is for retirement savings accounts. So the
//     fraction is deliberately never *divided*: there is no float here for anyone to multiply
//     earnings by, and writing `earnings × days / daysInYear` means first constructing the number
//     the statute does not have. The day counts are carried for the audit trail and read by exactly
//     one comparison.
//
// The input is the **conversion day** — the R5 Setting, which has to exist for the transfer balance
// credit anyway — and never a second Setting stating a proportion.

/** Whether the stated phase covered the financial year, or only part of it. */
export type YearCoverage = 'whole-year' | 'part-year';

declare const PHASE_YEAR: unique symbol;

type PhaseYearFractionFigure = {
  /** The financial year the days were counted in. Not interchangeable with any other year. */
  readonly fy: FinancialYear;
  /** Days of `fy` the stated phase held, counted inclusively. */
  readonly days: number;
  /** 365, or 366 where the year contains 29 February — counted off the calendar, never stated. */
  readonly daysInYear: number;
  readonly coverage: YearCoverage;
};

/**
 * The part of one financial year for which an interest held the phase it states, as an **exact**
 * pair of day counts. Branded: the only way to have one is through the two constructors below, so
 * an object literal claiming `daysInYear` that the calendar does not agree with cannot be passed.
 *
 * **Nominal, not structural — P3-41.** The brand is a `private` member of a type-only class, so a
 * spread of a real fraction cannot carry it: `{ ...real, days: lie }` is TS2741, not a
 * `PhaseYearFraction`. Nothing exists at runtime; the value is still a plain frozen record.
 */
declare class PhaseYearFractionWitness { private readonly [PHASE_YEAR]: true }

export type PhaseYearFraction = PhaseYearFractionFigure & PhaseYearFractionWitness;

const phaseYearFraction = (fy: FinancialYear, days: number): PhaseYearFraction => {
  const daysInYear = daysInFinancialYear(fy);
  if (!Number.isInteger(days) || days < 0 || days > daysInYear) {
    throw new RangeError(`not a count of days in FY${fy}: ${days} of ${daysInYear}`);
  }
  const coverage: YearCoverage = days < daysInYear ? 'part-year' : 'whole-year';
  // Stated a second time, the other way round, and deliberately not factored together with the
  // line above: mutating either comparison — a part year read as whole, or a whole year read as
  // part — makes this throw instead of charging the wrong row of §3.1 to the cent.
  if ((coverage === 'whole-year') !== (days === daysInYear)) {
    throw new RangeError(`the coverage of ${days} of ${daysInYear} days in FY${fy} is not decidable`);
  }
  return Object.freeze({ fy, days, daysInYear, coverage }) as PhaseYearFraction;
};

/** The phase held all of `fy`: the case the old `phaseHeldForTheWholeYear: true` stood for. */
export const phaseHeldForTheWholeYear = (fy: FinancialYear): PhaseYearFraction =>
  phaseYearFraction(fy, daysInFinancialYear(fy));

/**
 * The phase held from `from` to 30 June, both days counted — SISR Sch 7 cl 3's inclusive count,
 * and the same one register §3.11.7 works `199 / 365` from for a 14 December conversion.
 *
 * A day outside `fy` is refused rather than clamped: a conversion day in another year is a
 * statement about that year.
 */
export const phaseHeldFrom = (fy: FinancialYear, from: IsoDate): PhaseYearFraction => {
  if (financialYearContaining(from) !== fy) throw new PhaseYearMismatchError(fy, from);
  return phaseYearFraction(fy, daysInclusive(from, endOfFinancialYear(fy)));
};

// --- The interest, and which phase it is in ------------------------------------------------------

/**
 * Reported so an audit trail can tell an accumulation account from a TTR pension, which the phase
 * deliberately cannot. It is a label on the result; nothing in the rate lookup reads it.
 */
export type SuperIncomeStream =
  | 'no income stream — the interest is in accumulation'
  | 'a transition to retirement income stream'
  | 'a superannuation income stream in the retirement phase';

/**
 * **Which kind of fund the interest is held in — ruling R11, register §3.11 / O69.** All of
 * Subdivision 295-F's machinery bites only for a self managed fund. For a member of an
 * APRA-regulated fund, exempt current pension income is invisible: the trustee computes it and the
 * member's balance simply arrives net, so the per-interest 15% / 0% model is a *modelling
 * convention* for such a member rather than a description of what the fund does.
 *
 * **Per interest, not per Person.** A Person may hold an SMSF interest and an APRA one at the same
 * time. It is the interest that carries phase, so it is the interest that carries fund type.
 *
 * **Absent by default, and there is no default value — in particular not `'smsf'`.** A default here
 * would silently decide which of the ECPI refusals apply, which is the O69 defect itself. None of
 * the three constructors below sets it; `fundEarningsTax` never reads it, because the bound of
 * §3.11.6 is a ceiling on the liability under either method and is therefore conservative for
 * either fund type. The one computation that turns on fund type is the ECPI method determination in
 * `ecpiMethod.ts`, and that is where a missing fund type is refused by name.
 */
export type FundType = 'smsf' | 'apra';

// --- The two entry-test facts this tool refuses (P3-9 chunk 5a, R7 inputs 4 and 7) ---------------
//
// Both are **declared**, never derived, and declaring either one refuses. That is not a shortcut
// taken for want of time: a constructor handed a `ConditionOfRelease` cannot tell whether the
// recipient inherited the stream or whether the Commissioner has issued an authority over it, and
// register §3.10.8 states the trigger for both refusals as the fact being *stated*. So the guard
// below has exactly one honest shape, and there is no arithmetic behind either limb.
//
// **They are on the same input object because they fail the same way.** Each is a fact that, if
// true, makes an answer this module would otherwise give confidently wrong; neither is a fact this
// module can look for. Splitting them into two optional parameters would let a caller state one and
// forget the other, which is how a guard becomes a formality.

/**
 * **R7 input 7 — ITAA 1997 s 307-80(4), and the reason the supported value is the absence of an
 * authority rather than a modelled one.**
 *
 * A stream specified in a Commissioner's commutation authority whose provider fails to pay within
 * the 60 days is not in the retirement phase for that income year **and every later one**. The
 * provision is retrieved and the rule is not in doubt; the TAA 1953 Sch 1 Div 136 chain the
 * authority issues out of is not modelled.
 *
 * **Why ignoring the authority is not a conservative approximation, in the register's own terms
 * (§3.10.8):** for transfer balance cap purposes **s 294-50(3)** requires the operation of
 * s 307-80(4) to be **disregarded** while the 60-day period is still running — so the same stream
 * is **out** of the retirement phase for ECPI and **in** it for the cap, at the same time. One
 * answer taken for both purposes is therefore wrong in one direction with nothing to say which.
 *
 * **A union of two, and the guard tests the SUPPORTED value rather than the refused one**, so a
 * third member added here refuses by default instead of falling through.
 */
export type CommutationAuthority =
  | 'no commutation authority has been issued for this stream'
  | 'a commutation authority has been issued under TAA 1953 Sch 1 Div 136';

/** The one value this tool supports. Everything else is out of scope and is refused. */
const NO_COMMUTATION_AUTHORITY: CommutationAuthority =
  'no commutation authority has been issued for this stream';

/**
 * **The entry-test facts a caller may state about the recipient of a stream — both required, so a
 * caller who states one has stated the other.**
 *
 * The object itself is **optional** on every constructor, following `fund?: FundType` (R11): an
 * interest that has never declared these facts has no `recipient` at all rather than a defaulted
 * one, and no existing caller has to supply a fact it does not need. Absence therefore means *not
 * stated*, not *false* — the module is no better informed than it was, and says so, rather than
 * recording a fact nobody asserted.
 */
export interface DeclaredRecipient {
  /**
   * **R7 input 4 — s 307-80(3)(aa).** `true` refuses. There is no supported `true` case: this tool
   * carries nothing on death benefits, the s 294-25(1) item 2(b) twelve-month reversionary deferral
   * of the credit, Subdiv 294-E or SISR reg 6.21.
   */
  readonly reversionaryBeneficiary: boolean;
  /** **R7 input 7 — s 307-80(4) / s 294-50(3).** Anything but the absence of an authority refuses. */
  readonly commutationAuthority: CommutationAuthority;
}

/**
 * **The whole of chunk 5a's logic.** Two refusals, no arithmetic, and the order is the statute's:
 * (3)(aa) is tested before anything else because it collapses the conjunction regardless of the
 * recipient's own conditions of release, and (4) sits after the phase test in s 307-80 itself.
 *
 * Called **first** in all three constructors, ahead of `transitionToRetirementInterest`'s met-condition
 * check and ahead of `retirementPhaseInterest`'s preservation gate, so a declared fact cannot be
 * masked by a refusal about the Person that the fact has made irrelevant.
 */
const requireModelledRecipient = (on: IsoDate, declared: DeclaredRecipient | undefined): void => {
  if (declared === undefined) return;
  if (declared.reversionaryBeneficiary) throw new ReversionaryStreamNotModelledError(on);
  if (declared.commutationAuthority !== NO_COMMUTATION_AUTHORITY) {
    throw new CommutationAuthorityNotModelledError();
  }
};

interface SuperInterestFigure {
  /** The date the phase is asserted for. Phase is a fact on a date, like the condition itself. */
  readonly on: IsoDate;
  readonly incomeStream: SuperIncomeStream;
  /** Evidence, carried for the audit trail. `accumulationInterest` never reads `met` off it. */
  readonly release: ConditionOfRelease;
  /**
   * **Optional, and optional is the point (R11).** An interest that has not been through
   * `heldInFund` has no fund type at all, rather than a defaulted one. Nothing in this file reads
   * it.
   */
  readonly fund?: FundType | undefined;
  /**
   * **Optional for the same reason `fund` is, and carried for the audit trail only.** An interest
   * that reaches here has declared facts that did *not* refuse — the recipient is not a reversionary
   * beneficiary and no commutation authority has been issued — and that is worth recording, because
   * "stated and benign" and "never asked" are different states and only one of them is evidence.
   * Nothing in this file reads it.
   */
  readonly recipient?: DeclaredRecipient | undefined;
  readonly reason: string;
  readonly provenance: ComputedProvenance;
}

declare const SUPER_INTEREST: unique symbol;

/**
 * **Nominal, not structural — P3-41.** The brand is a `private` member of a type-only class, so a
 * spread of a real interest cannot carry it: `{ ...real, phase: lie }` is TS2741, not an
 * `AccumulationInterest`. Nothing exists at runtime; the value is still a plain frozen record. A
 * separate witness per type, below, keeps the two interests from ever being nominally the same
 * class — only their (identically-named) private key is shared.
 */
declare class AccumulationInterestWitness { private readonly [SUPER_INTEREST]: true }
declare class RetirementPhaseInterestWitness { private readonly [SUPER_INTEREST]: true }

/**
 * An interest whose earnings are taxed — an accumulation account, **or a TTR pension**. The two
 * share a type because register §3.1 gives them one row and one rate.
 */
export type AccumulationInterest = SuperInterestFigure & { readonly phase: 'accumulation' } & AccumulationInterestWitness;

/** An interest whose earnings are exempt current pension income. */
export type RetirementPhaseInterest = SuperInterestFigure & { readonly phase: 'retirement' } & RetirementPhaseInterestWitness;

export type SuperInterest = AccumulationInterest | RetirementPhaseInterest;

/**
 * **An accumulation account.** The Condition of Release is carried and is not consulted: whether
 * the Person may take the money out is a different question from what the fund pays on the
 * earnings while it is in there, and conflating them taxes a retired Person's untouched
 * accumulation balance at 0%.
 */
export const accumulationInterest = (
  release: ConditionOfRelease,
  declared?: DeclaredRecipient,
): AccumulationInterest => {
  requireModelledRecipient(release.on, declared);
  return Object.freeze({
    on: release.on,
    phase: 'accumulation',
    incomeStream: 'no income stream — the interest is in accumulation',
    release,
    ...(declared === undefined ? {} : { recipient: declared }),
    reason:
      'an interest that is not paying a retirement phase income stream is in Accumulation Phase, ' +
      'whatever the Person\'s age and whether or not they have met a Condition of Release',
    provenance: release.provenance,
  }) as AccumulationInterest;
};

/**
 * **A transition to retirement income stream, and its phase is `'accumulation'`.** The return type
 * is the defence: there is no way to say "a TRIS is in Retirement Phase" here that survives `tsc`.
 *
 * Refuses for a Person who has met a Condition of Release, because that is the point at which the
 * stream stops being a TRIS in the accumulation sense and the register stops determining the
 * answer.
 */
export const transitionToRetirementInterest = (
  release: ConditionOfRelease,
  declared?: DeclaredRecipient,
): AccumulationInterest => {
  requireModelledRecipient(release.on, declared);
  if (release.met) throw new TrisRetirementPhaseNotModelledError(release.on);
  return Object.freeze({
    on: release.on,
    phase: 'accumulation',
    incomeStream: 'a transition to retirement income stream',
    release,
    ...(declared === undefined ? {} : { recipient: declared }),
    reason:
      'a transition to retirement income stream is not in the retirement phase: register §3.1 ' +
      'taxes its fund earnings at the Accumulation Phase rate, and paying a pension does not ' +
      'exempt them',
    provenance: release.provenance,
  }) as AccumulationInterest;
};

/**
 * **A superannuation income stream in the retirement phase**, stated by the caller. A met
 * Condition of Release is necessary — checked here through the one gate the model has — and is
 * nowhere sufficient: nothing calls this function on a Person's behalf.
 */
export const retirementPhaseInterest = (
  release: ConditionOfRelease,
  declared?: DeclaredRecipient,
): RetirementPhaseInterest => {
  // Before the preservation gate, and that order is s 307-80(3) itself: (aa) failing collapses the
  // conjunction whatever the beneficiary's own conditions of release, so a reverted stream must
  // refuse AS a reversionary stream and not as a preserved benefit (T122).
  requireModelledRecipient(release.on, declared);
  requireBenefitAccess(benefitAccess(release), 'a superannuation income stream in the retirement phase');
  return Object.freeze({
    on: release.on,
    phase: 'retirement',
    incomeStream: 'a superannuation income stream in the retirement phase',
    release,
    ...(declared === undefined ? {} : { recipient: declared }),
    reason:
      'a superannuation income stream in the retirement phase: its earnings are exempt current ' +
      'pension income under ITAA 1997 ss 295-385 and 295-390, which register §3.1 states as a 0% ' +
      'fund earnings tax',
    provenance: withCaveats(release.provenance, UNCAPPED_ENTRY),
  }) as RetirementPhaseInterest;
};

/**
 * **States the fund an interest is held in (R11).** Additive on purpose: stating the fund type is a
 * separate act from constructing the interest, so no existing caller has to supply a fact it does
 * not need, and an interest that has never been through here has **no** `fund` property at all
 * rather than a defaulted one. The three constructors above are unchanged, and `fundEarningsTax`
 * still does not read the field.
 */
export const heldInFund = <Interest extends SuperInterest>(
  interest: Interest,
  fund: FundType,
): Interest => Object.freeze({ ...interest, fund } as Interest);

// --- The tax --------------------------------------------------------------------------------------

/**
 * **Which of §3.11.6's two answers a result is, by name.** Not a boolean and not a caveat only: a
 * caller can branch on it, and a reader of an audit trail can see that a *bound* was applied where
 * the fund's actual ECPI is not knowable without a certificate or an asset ledger.
 */
export type EarningsTaxBasis =
  | 'the phase stated for the interest, held for the whole financial year'
  | 'ITAA 1997 Subdiv 295-F upper bound (R10): the Accumulation Phase rate on the whole year’s earnings';

const BASIS: Readonly<Record<YearCoverage, EarningsTaxBasis>> = {
  'whole-year': 'the phase stated for the interest, held for the whole financial year',
  'part-year':
    'ITAA 1997 Subdiv 295-F upper bound (R10): the Accumulation Phase rate on the whole year’s earnings',
};

/** R10 step 3's disclosure, in the register's own words (§3.11.6). Said on every bounded result. */
const CONVERSION_YEAR_BOUND =
  'the conversion year is charged at the accumulation rate on the whole year’s earnings. This is a ' +
  'proven upper bound on the fund’s liability under both ss 295-385 and 295-390, not the fund’s ' +
  'actual ECPI; the true figure requires an actuary’s certificate (s 295-390(4)) or asset-level ' +
  'tracing (s 295-385(1)(b)). It understates the household.';

export interface FundEarningsTax {
  readonly fy: FinancialYear;
  readonly interest: SuperInterest;
  /** The phase the interest states. Not necessarily the row it was charged at — see `chargedAs`. */
  readonly phase: EarningsPhase;
  /** How much of `fy` that phase held, as exact day counts. Never divided; see the note above. */
  readonly heldFor: PhaseYearFraction;
  /** The §3.1 row actually applied. Differs from `phase` on, and only on, the bounded part year. */
  readonly chargedAs: EarningsPhase;
  readonly basis: EarningsTaxBasis;
  /** The record's rate, as stored. A constant — `everyYear: true`, and never indexed. */
  readonly rate: number;
  /** What the rate was applied to. Never composed here; stated by the caller. */
  readonly taxableEarnings: Cents;
  readonly tax: Cents;
  /** `taxableEarnings − tax`, the earnings the interest keeps. */
  readonly netEarnings: Cents;
  readonly provenance: ComputedProvenance;
}

/**
 * **The fund earnings tax on one interest for one financial year.**
 *
 * The rate comes from the phase and from how much of the year that phase held, and from nothing
 * else — not from the income stream label, not from the Condition of Release, and not from any
 * age, none of which is in scope at the lookup.
 *
 * A part year is **not apportioned** (there is no apportionment to do — §3.11.2) and is **not
 * refused**. It is charged at the bound: the Accumulation Phase row on the whole year's earnings,
 * with `basis` and a caveat saying so by name. The error runs one way — it overstates the fund's
 * tax and understates the household — which is why R9's reasoning governs it (§3.11.6).
 *
 * The only rounding is `mulCents`, which rounds the product to the whole cent, half away from
 * zero. Retirement Phase never reaches it in any meaningful sense: a rate of 0 gives 0 exactly.
 *
 * **The 0% row re-earns its preconditions here, because the type cannot carry them.** A symbol
 * brand on `RetirementPhaseInterest` says only that its fields were computed together; it survives
 * an object spread, so `{ ...transitionToRetirementInterest(release), phase: 'retirement' }`
 * typechecks and walks under all three constructors' guards. This is not fixable with a type. So
 * before the rate lookup, a `phase === 'retirement'` interest is put back through the two checks
 * chunk 5a already built — `requireModelledRecipient` on its own `recipient`, and
 * `requireBenefitAccess(benefitAccess(interest.release), …)` — re-derived out of the evidence the
 * interest already carries. **No new refusal name**: the same `PreservedBenefitError`,
 * `ReversionaryStreamNotModelledError` and `CommutationAuthorityNotModelledError` are re-raised at
 * the point where the money is decided rather than only where the object was built.
 *
 * **What that does and does not reach, stated as a partition over spreads onto `phase:
 * 'retirement'`:**
 *
 *   * **From a TRIS** (`release.met === false`, guaranteed because `transitionToRetirementInterest`
 *     throws otherwise) — the preservation gate fails and the call is refused. **That is the whole
 *     of the priced attack: $100,000 of fund earnings is $15,000 honestly and was $0 laundered.**
 *   * **From an accumulation interest on an unmet release** — the same gate, the same refusal.
 *   * **From an accumulation interest on a MET release that passes the gate — NOT caught, and it
 *     launders nothing.** `retirementPhaseInterest(thatRelease)` would have returned the same 0%
 *     honestly, so no dollar moves. What is lost is disclosure: the spread skips the
 *     `UNCAPPED_ENTRY` caveat that constructor attaches. A caveat missing is a real loss and it is
 *     named here rather than papered over, but it is not a wrong number.
 *
 * Structural impossibility would be better than this check and is not available: every route into
 * the branded type can be spread. Saying so plainly beats a guard that pretends otherwise.
 */
export const fundEarningsTax = (input: {
  readonly fy: FinancialYear;
  readonly interest: SuperInterest;
  readonly taxableEarnings: Cents;
  /**
   * Required, never defaulted, and counted against this same year — `phaseHeldForTheWholeYear(fy)`
   * or `phaseHeldFrom(fy, day)`. A count taken in another year is refused, not rescaled.
   */
  readonly phaseHeldFor: PhaseYearFraction;
}): FundEarningsTax => {
  const { fy, interest, taxableEarnings, phaseHeldFor } = input;
  if (phaseHeldFor.fy !== fy) throw new MidYearPhaseChangeError(fy, phaseHeldFor);
  if (financialYearContaining(interest.on) !== fy) throw new PhaseYearMismatchError(fy, interest.on);
  if (!Number.isSafeInteger(taxableEarnings)) {
    throw new RangeError(`taxable earnings must be a whole number of cents: ${taxableEarnings}`);
  }
  if (taxableEarnings < 0) throw new FundLossNotModelledError(fy, taxableEarnings);

  const { phase } = interest;
  // The re-derivation described above. Ordered as s 307-80 orders it, and as the constructors do:
  // (3)(aa) before the preservation gate. `interest.recipient` may be absent, which means the fact
  // was never stated — `requireModelledRecipient` returns on `undefined`, exactly as at construction.
  if (phase === 'retirement') {
    requireModelledRecipient(interest.on, interest.recipient);
    requireBenefitAccess(
      benefitAccess(interest.release),
      'a superannuation income stream in the retirement phase',
    );
  }
  const { coverage } = phaseHeldFor;
  const chargedAs = CHARGED[phase][coverage];
  const record = EARNINGS_TAX[chargedAs];
  const tax = mulCents(taxableEarnings, record.value);

  // Read off the same `coverage` the charge was, so a result cannot be charged at the bound
  // without disclosing it, or disclose it without being charged at it.
  const stated = provenanceOf(fy, CONSUMED[chargedAs]);
  const disclosed = coverage === 'whole-year' ? stated : withCaveats(stated, CONVERSION_YEAR_BOUND);

  return Object.freeze({
    fy,
    interest,
    phase,
    heldFor: phaseHeldFor,
    chargedAs,
    basis: BASIS[coverage],
    rate: record.value,
    taxableEarnings,
    tax,
    netEarnings: (taxableEarnings - tax) as Cents,
    provenance: mergeProvenance(disclosed, interest.provenance),
  });
};
