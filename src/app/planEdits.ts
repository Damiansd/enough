// P6-6 — the EDIT. Two operations, and still only two: **add an entry**, and **toggle `enabled`**
// on an entry that is already there. Everything decidable about both lives here, pure: no DOM, no
// `fetch`, no `crypto`, no clock. `entryForm.ts` is the writer that supplies all three.
//
// P6-6 shipped the add for `SPEND_CHANGE` alone; the other four constructible types followed in the
// same slice. **The five are not a menu chosen here** — they are exactly the types `parsePlan`'s
// `PARAMS_PARSERS` can read, which is the same derived list `UNSPECIFIED_ENTRY_TYPES` is the
// complement of. A sixth builder written before its parser would save a file the door refuses.
//
// ⚠️ **NO IN-PLACE EDITING OF AN EXISTING ENTRY, and that is a v1 LIMITATION CHOSEN RATHER THAN
// MISSED** (user ruling, 2026-09-19, on ADR-0002). There is no `planWithEntryAmended`, and adding
// one is not a small convenience: a dated entry is a record of what was decided, and rewriting its
// date or its amount in place silently rewrites a history the projection already depended on — a
// comparison run last month stops reproducing, with nothing on screen to say so. To correct a
// mistake: **disable the wrong entry and add the right one.** That is clunkier than editing a
// field, and both facts stay in the file, which is the whole of the append-only promise.
//
// ⚠️ **SINGLE TAB, SINGLE USER — the write is an UNCONDITIONAL OVERWRITE** (user decision,
// 2026-09-19). `savePlan` sends the whole plan and the server takes it: there is no ETag, no
// version compare and no merge. Two tabs open on the same plan file is therefore a **lost update**:
// the second tab saves the plan it loaded, and whatever the first tab added between the two loads
// is gone, silently and with no banner. That is an accepted v1 assumption and it is written here
// because this is where a reader meets the write. A guard would be a compare-and-set on the
// server's side, not a check bolted on here.
//
// **One validator, and it is `parsePlan` — the same one the READ uses.** Nothing in this file
// re-implements a field check. A form value that is wrong is carried through unchanged into a
// candidate plan and refused by name at the door; a second set of checks here would drift from
// that door and produce a plan that saves and then will not load.
import { parsePlan, PLAN_FILE_VERSION, TTR_RATE_CEILING, TTR_RATE_FLOOR, UNSPECIFIED_ENTRY_TYPES } from '../core/parsePlan.js'; // `.js` is correct in a `.ts` file — see tsconfig.json
import type { PlanFile } from '../core/parsePlan.js';
import type { StatedPriorRetirementPhase, StatedStreamSettings } from '../core/household.js';
import { INCOME_PROTECTION_BENEFIT_PERIODS, INSURANCE_COVER_KINDS } from '../core/superInsurance.js';
import type { IncomeProtectionBenefitPeriod, InsuranceCoverKind } from '../core/superInsurance.js';
import { ENTRY_TYPES, resolvedEntryEnabled } from '../core/plan.js';
import type { Entry, EntryOverrides, EntryType, Month, Scenario } from '../core/plan.js';
import { CGT_REFORM_START } from '../data/assumptions/tax.js';
// Only the FORECAST ASSUMPTIONS are taken from the demo module, never its household or entries:
// see `walkthroughPlan` below, which states why that is not a back door for example figures.
import { DEMO_SETTINGS } from './demoHousehold.js';
import type { LabelledOption } from './entryLabels.js';
export type { LabelledOption };
import { PlanWriteFailure } from './loadPlan.js';
import type { ScenarioDeletion } from './scenarioList.js';
import { scenarioById, scenarioEntries, scenarioWalks } from './scenarioWalks.js';
import { catchUpOffer } from './financialYearRows.js';
import { financialYearContaining, financialYearOfMonth, financialYearsBefore, startOfFinancialYear, toFinancialYear, financialYearStartYear } from '../core/financialYear.js';
import { SUPERANNUATION } from '../data/assumptions/super.js';
import type { Cents } from '../core/money.js';
import type { FinancialYear } from '../data/assumptions/types.js';
import type { ScenarioWalks } from './scenarioWalks.js';

/**
 * **The types this build can construct — DERIVED, never listed.** An entry type is constructible
 * exactly when `parsePlan` has a params parser for it, and `UNSPECIFIED_ENTRY_TYPES` is already the
 * complement of that set, so this is its complement's complement and cannot drift from the door.
 *
 * Listing them by hand here would let a type be offered in the form before its parser existed
 * (every save refused, with a message about a type this build cannot honour) or, worse, stay
 * unoffered after one was written, which nothing would report at all. The builders below are one
 * per member; `entryForm.ts` builds its type selector from `OFFERED_ENTRY_TYPES` below and
 * `test/app-entry-form.test.mjs` checks the two sets are the same set.
 */
export const CONSTRUCTIBLE_ENTRY_TYPES: readonly EntryType[] =
  ENTRY_TYPES.filter((type) => !UNSPECIFIED_ENTRY_TYPES.includes(type));

/**
 * **The types the DOOR can read that the WALK does not act on IN FULL — the one place that gap is
 * held open, and the one place it can be closed** (P6-8 brief 1, 2026-09-19).
 *
 * `SUPER_CONTRIBUTION` gained its params and its parser before `projection.ts` gained a branch for
 * it, which is deliberate — the type had to exist before anything could be written against it —
 * and it makes "constructible" and "honoured" two different sets for the first time. Offering it in
 * the form would let a user state $20,000 a year of salary sacrifice, watch the plan save cleanly,
 * and read a forecast that is not the forecast of the plan they saved. A refused save is visible; a
 * saved fact the figures do not honour is exactly the confidently-wrong output this project exists
 * to avoid.
 *
 * ⚠️ ~~**THE GROUND NARROWED ON 2026-09-19 (P6-8 brief 2, chunk 1) AND THE LIST DID NOT.** The walk
 * now HAS a branch for `SUPER_CONTRIBUTION`: the sacrifice reduces the salary that is assessed, so
 * the income tax, the WATO base and the Medicare family income all move. ~~What still does not move
 * is the take-home pay (chunk 3) and the superannuation balance and its 15% contributions tax
 * (chunk 4) — so a Household with a sacrifice currently keeps the tax saving, keeps the cash, and
 * sends nothing to the fund. That is wrong in the FLATTERING direction, which is the one direction
 * this build may not be wrong in on screen, so the type stays unoffered until those chunks land.~~
 * **NARROWED AGAIN ON 2026-09-20 (chunk 3), AND THE LIST STILL DID NOT MOVE.** The take-home pay
 * now falls with the sacrifice too; what is left is chunk 4, the credit to the interest and its 15%
 * contributions tax. So the money leaves the pay packet and arrives nowhere, and the build is wrong
 * in the CONSERVATIVE direction — under-stating wealth by the whole arrangement instead of
 * over-stating it. **The reason to hold the type back is therefore no longer "it flatters"; it is
 * that a forecast which loses the user's money is not the forecast of the plan they saved either.**
 * The day the direction became safe was not the day the entry could be offered, and recording that
 * is the point of this paragraph.
 *
 * ⚠️ **NARROWED A THIRD TIME ON 2026-09-20 (chunk 4), AND THE LIST STILL DID NOT MOVE — but this
 * time the ground is a DIFFERENT KIND of thing.** The money path is closed: the sacrifice leaves
 * the pay packet, the fund pays its 15% (Income Tax Rates Act 1986 s 26(1)(a)) and the net amount
 * is credited to the interest the entry names. Both earlier grounds are therefore discharged — it
 * no longer flatters and it no longer loses the money. What is left is not an incomplete WALK; it
 * is an absent REFUSAL. **An over-cap sacrifice is taxed at 15% and nothing else**: ITAA 1997
 * Div 291's excess treatment — the excess into the Person's assessable income, the 15% offset, the
 * excess concessional contributions charge — is not applied anywhere, and a sacrifice larger than
 * the pay it comes out of is still silently capped with the excess dropped. That is wrong in the
 * FLATTERING direction, and it is wrong for precisely the Households most likely to reach for this
 * feature. Chunk 5 is the refusal; the type is offered the day it lands and not before.~~
 *
 * ⚠️ **CHUNK 5 LANDED ON 2026-09-20 AND THE LIST IS NOW EMPTY — the guard retires as it was
 * designed to.** The refusal is `ExcessConcessionalContributionsNotModelledError`: a stated annual
 * amount that alone exceeds the general concessional cap for the financial year the arrangement
 * takes effect in is refused by name in the walk, and a contribution into a non-accumulation
 * interest is refused at the door (`checkContributionTargets`). Every ground this list has ever
 * carried for `SUPER_CONTRIBUTION` is discharged: it does not flatter, it does not lose the
 * money, and it no longer prices a plan it cannot price.
 *
 * **What is still incomplete is incomplete CONSERVATIVELY and is labelled on screen, which is the
 * test this list applies and not "is it finished".** The Superannuation Guarantee IS contributed by
 * the walk from 2026-09-20 (brief 3, chunk 2b), net of the fund's 15%, and from the same day it
 * COUNTS TOWARDS THE CONCESSIONAL CAP (brief 3, final chunk) — the sentence here said it was
 * "measured against no contributions cap" for the length of chunk 2b and that is superseded. Two
 * gaps are left ~~and NEITHER flatters~~ from 2026-09-20: ~~Division 293's second 15% is not charged
 * on either credit~~ — it IS charged from that day (P6-9 chunk 3), out of the Person's cash, and
 * what is left of that gap is the Subdiv 293-B release election (register O84), ~~which moves no
 * wealth and only its split~~; and a sacrifice larger than the PAY it comes out of is still capped at the
 * pay with the excess dropped — a smaller arrangement than the user stated, never a larger one.
 *
 * ⚠️ **"NEITHER flatters" was wrong about the first of the two and P6-9 chunk 4 struck it.** The
 * release election does move more than a split: taking the charge from cash leaves a
 * means-test-EXEMPT accumulation interest standing and spends ASSESSED Offset cash instead, so a
 * Household whose Division 293 payer is below Age Pension age is assessed on FEWER assets than they
 * would really hold and this build OVER-states their Age Pension — and the Offset earns only the
 * plan's cash interest rate (2026-09-23) while the super interest earns the full return, so total
 * wealth runs high after the month as well wherever the return is the higher of the two. The
 * over-the-pay gap is still conservative. The direction and the bound are register O84's, which is
 * where they are argued; what belongs here is that one of the two runs the wrong way.
 * `SUPER_CONTRIBUTION_ENTRY_NOTICE` carries both to the form, along with the behaviour change the
 * cap made, and `entryForm.describeParams` carries them to the row.
 *
 * ⚠️ **AND THE RELEASE ELECTION IS MODELLED FROM 2026-09-20 (P6-10), so what the two notices carry
 * to the user CHANGED with it.** The election is performed at the year-end settlement for a Person
 * whose plan names the interest. ~~The paragraph above is left standing because its DIRECTION is
 * still the direction of what is left — **no box on this form states the election**, so for every
 * user who has not hand-edited their plan file the charge still comes out of cash and the Age
 * Pension above is still over-stated. That is register O84's residual (iii)~~ — **SUPERSEDED THE
 * SAME DAY (P6-11): the household form states it now**, one single-choice control per Person
 * (`settingsPanel.ts`, `PersonFormValues.releaseAuthorityInterest` below), so a user who would
 * elect can reach the treatment they chose in life without hand-editing anything. The paragraph
 * above still stands for the user who makes NO election, and for them it is not an error at all:
 * silence is the statutory default and this build is right to charge their cash. **What is left of
 * O84 that runs the Household's way is residual (i) alone** — a first or last PARTIAL financial
 * year never settles — and it is in the walk rather than in this module's surface.
 *
 * **The list stays, empty, and is not deleted.** It is the one place the door/walk gap can be held
 * open, and the next type to arrive parser-first will need it on day one; an empty list also keeps
 * `OFFERED_ENTRY_TYPES` derived rather than collapsing it back into `CONSTRUCTIBLE_ENTRY_TYPES`,
 * which is the drift this whole arrangement exists to prevent.
 *
 * ⚠️ **AND IT DID, ON 2026-09-22: `TRIS_EARLY_CONVERSION` ARRIVES PARSER-FIRST, EXACTLY AS
 * `SUPER_CONTRIBUTION` DID.** `parsePlan` can read it and cross-checks it fully against the
 * Household (P3-8's conversion limb, ruled by the user 2026-09-22) — ~~but nothing in
 * `projection.ts` reads it, deliberately and by this build's own instruction: wiring it into a
 * live walk is a separate, later item, so a plan holding one projects to exactly the figures it
 * would have projected without it.~~ **SUPERSEDED THE SAME DAY: `projection.ts` now reads it in
 * full** — a validating entry's `date` is the conversion day, `SuperInterest.phase` actually flips
 * from it, and the money-moving gap named above is closed. **What still holds the type back from
 * `OFFERED_ENTRY_TYPES` is narrower than before: `entryForm.ts` has no control for the params this
 * type needs (`interestIndex`, a conversion day), so the FORM cannot construct one yet.** That is
 * separate, later work (`test/app-entry-form.test.mjs`'s own `PARTIALLY_WALKED` names it), not a
 * gap in the walk — the struck text above is kept because a reader who remembers it must be able to
 * see it was true and is now superseded, not silently wrong.
 *
 * **Why the list is the right place for that and a caveat is not.** A caveat on a figure says *"this
 * number is weaker than it looks"*; this is a plan the build cannot price at all above a threshold
 * it does not check. The form is where the entry is CONSTRUCTED, so it is the only place the plan
 * can be prevented rather than annotated.
 * "Not walked" became "not walked in full" and the entry stays; it is not retired on a ground it
 * only half discharged.
 *
 * **It is a hand-written list because nothing can derive it.** `projection.ts` dispatches with
 * scattered `entry.type === …` comparisons rather than one exhaustive switch, so there is no table
 * to take the complement of. What stops it going stale is a test rather than a type:
 * `test/app-entry-form.test.mjs` reads `projection.ts`'s source and pins, name by name, WHICH of
 * these types the walk dispatches on and why it is still held back — so neither half can move
 * quietly.
 *
 * ⚠️ **`MORTGAGE_TARGET` JOINED IT ON 2026-09-22 (P3-16a microtask 1), FOR A THIRD REASON, AND LEFT
 * IT THE SAME DAY (microtask 5).** Unlike `SUPER_CONTRIBUTION` and `TRIS_EARLY_CONVERSION`, this
 * type needed NO branch in `projection.ts` at all — it is an `event`-kind entry compared
 * date-to-date against the retirement date (`outcomes.ts`), and the generic `appliedEntryIds`
 * bucketing already cites it in its own month without any type-specific code (`plan.ts`'s own doc
 * says so). What held it back was narrower still: `entryForm.ts` had no control for it. `RetireParams`
 * being `{}` made that control trivial to write — `mortgageTargetEntry` below is `retireEntry`'s
 * shape with the type name changed — so this type's stay in this list was the shortest of the three.
 *
 * ⚠️ **`RETURN_CHANGE` JOINED IT ON 2026-09-22 (P2-11 microtask 2), ON `SUPER_CONTRIBUTION`'s OWN
 * ORIGINAL GROUND, AND LEFT IT THE SAME DAY (microtask 4).** Its parser landed before `projection.ts`
 * gained a branch for it — the two flat `settings.nominalReturn` reads read the flat figure until
 * microtask 3 replaced them with `returnRate[personIndex] ?? settings.nominalReturn` (the same
 * `SPEND_CHANGE`-shaped carried level `TRIS_EARLY_CONVERSION` and `WORK_PATTERN_CHANGE` use). Once
 * the engine honoured it WHOLE — both call sites, the rate scoped to the `owner` it names, never a
 * half-built branch — `entryForm.ts` gained its control (`returnChangeEntry`, `rateAsTyped`'s own
 * shape) in the same commit, so `TRIS_EARLY_CONVERSION` is now the only type left in this list.
 *
 * ⚠️ **`ENTER_CARE` JOINED IT ON 2026-09-24 (P14-13, slice 3a), FOR `TRIS_EARLY_CONVERSION`'S OWN
 * THIRD REASON, AND LEFT IT THE SAME DAY (slice 3b).** The walk honours it WHOLE — the RAD lump
 * sum, the ongoing means-tested fees, the home protection and the NCCC cap are all wired into
 * `projection.ts` — and `entryForm.ts` gained the control for its three params (`homeValue`,
 * `radPrice`, `radPaidAsLumpSum`, `enterCareEntry` below) in the same slice.
 *
 * ⚠️ **`HEAS_DRAW` JOINED IT ON 2026-09-24 (P9-1, slice 1), FOR THE SAME THIRD REASON, AND LEFT IT
 * THE NEXT DAY (P9-1, slice 2, P6-6a/P6-6b).** The walk honours it WHOLE — the draw, the fortnightly
 * compounding debt, the capacity cap and its note are all wired into `projection.ts` — and
 * `entryForm.ts` gained the control for its params (`securityValue`'s own estimate warning,
 * `fortnightlyAmount`'s stated-or-"maximum" choice, `stopDate`, `heasDrawEntry` below) in the same
 * slice, so `TRIS_EARLY_CONVERSION` is again the only type left in this list.
 */
export const ENTRY_TYPES_NOT_YET_WALKED: readonly EntryType[] = ['TRIS_EARLY_CONVERSION'];

/**
 * **What the entry form may offer: constructible, minus the types whose money does not move yet.**
 * Derived from both lists above, so a type is offered exactly when the door can read it and the
 * walk can act on it, and neither half can be forgotten.
 */
export const OFFERED_ENTRY_TYPES: readonly EntryType[] =
  CONSTRUCTIBLE_ENTRY_TYPES.filter((type) => !ENTRY_TYPES_NOT_YET_WALKED.includes(type));

/**
 * The three fields EVERY constructible type carries, exactly as typed: strings, unchecked,
 * straight off the inputs. Each type's own interface extends this with its own params and with
 * **nothing it does not have** — see `NonSuperInvestmentBuyFormValues` and its sell counterpart,
 * which are two types rather than one with optional fields precisely so that a form cannot hand
 * over a field the parser will refuse for that branch.
 */
export interface EntryFormValues {
  /** The date the entry takes effect, as typed. Not checked here — `parsePlan` owns ISO dates. */
  readonly date: string;
  /** `personA` | `personB` | `household`, as selected. Anything else is refused by `parsePlan`. */
  readonly owner: string;
  /** Free text. Blank means the entry has no note at all — the key is omitted, never written as `""`. */
  readonly note: string;
}

/** `SPEND_CHANGE`. */
export interface SpendChangeFormValues extends EntryFormValues {
  /** The ANNUAL household spending level in DOLLARS, as typed. `SpendChangeParams.annualSpend` is annual. */
  readonly annualSpend: string;
}

/** `RETIRE` — `RetireParams` is `{}`: the date is the whole of the fact (`plan.ts`). */
export type RetireFormValues = EntryFormValues;

/**
 * `MORTGAGE_TARGET` — `MortgageTargetParams` is `{}`, on `RetireFormValues`'s own precedent
 * (P3-16a). The date is the whole of the stated fact; which milestone the user means (payoff, or
 * an offset covering the balance) belongs in the shared `note` box, never a box of its own.
 */
export type MortgageTargetFormValues = EntryFormValues;

/** `MORTGAGE_PAYOFF` — `MortgagePayoffParams` is `{}`: the amount is whatever the walk says is owed. */
export type MortgagePayoffFormValues = EntryFormValues;

/** `ILLNESS_SEPARATION` (P12-4) — `IllnessSeparationParams` is `{}`: the date is the whole of the fact. */
export type IllnessSeparationFormValues = EntryFormValues;

/** `DEATH` (P12-1) — `DeathParams` is `{}`: the owner and the date are the whole of the fact. */
export type DeathFormValues = EntryFormValues;

/**
 * `ENTER_CARE` (P14-13, slice 3b). Three boxes, all required and all the household's own estimate —
 * `EnterCareParams`'s own header: nobody can know the home's sale value, the agreed room price or
 * the lump-sum/daily split before the day they are agreed with a facility, so these are stated, not
 * looked up. `owner` (above) is `personA` or `personB` only — `household` is refused at the door.
 */
export interface EnterCareFormValues extends EntryFormValues {
  /** The whole household's home value on the day of entry, in DOLLARS, as typed. `0` for no home. */
  readonly homeValue: string;
  /** The agreed room price — the refundable accommodation deposit (RAD) — in DOLLARS, as typed. */
  readonly radPrice: string;
  /** How much of `radPrice` is paid as a lump sum on entry, in DOLLARS, as typed; the rest accrues as a daily accommodation payment. */
  readonly radPaidAsLumpSum: string;
}

/**
 * `HEAS_DRAW` (P9-1, slice 2). `securityValue` is the household's own estimate of the home's
 * market value, exactly the way `EnterCareFormValues.homeValue` is — nobody can look it up
 * (`HEAS_DRAW_ENTRY_NOTICE` says why). `fortnightlyAmount` is the literal `'maximum'` — chosen on
 * the form, never typed — or a stated dollar figure; either way it goes to `heasDrawEntry` below as
 * TEXT, and only that text decides which the door reads. `stopDate` is the one OPTIONAL field this
 * build's entry form has met so far: **blank is "no stop", not a date to parse** — `heasDrawEntry`
 * omits the key entirely rather than hand `parsePlan` an empty string it would refuse as a malformed
 * ISO date, `EntryFormValues.note`'s own precedent for a box that may say nothing at all.
 */
/**
 * **`advanceDate`/`advanceAmount` (P9-2b) — ONE lump-sum advance, this slice.** `entryForm.ts` has
 * no repeatable-row pattern anywhere else on the form to build a real list on, so this build offers
 * exactly one advance box pair per entry rather than inventing that pattern for a single field.
 * `HeasDrawParams.advances` itself is a list — a household that genuinely wants a second advance in
 * the SAME rolling window states it by hand in the plan file, and `checkHeasDraws` still refuses a
 * third or an over-cap total there. Both boxes are optional together: blank `advanceDate` is "no
 * advance at all", `stopDate`'s own precedent, and `heasDrawEntry` below omits the key entirely
 * rather than build a one-element list nobody asked for.
 */
export interface HeasDrawFormValues extends EntryFormValues {
  /** The home's market value on the day of entry, in DOLLARS, as typed — the household's own estimate. */
  readonly securityValue: string;
  /** The literal `'maximum'`, or a stated fortnightly draw in DOLLARS, as typed. */
  readonly fortnightlyAmount: string;
  /** An ISO date, as typed, or `''` for no stop — the stream keeps running to the plan's last month. */
  readonly stopDate: string;
  /** An ISO date, as typed, or `''` for no advance at all (P9-2b). */
  readonly advanceDate: string;
  /** The lump sum, in DOLLARS, as typed. Read only when `advanceDate` is not blank. */
  readonly advanceAmount: string;
}

/**
 * `SELL_HOME` (P14-13; `newHomeAmount`/`newHomePurchaseDate` P14-13c). `salePrice` is the household's
 * own estimate of what the home will fetch — `EnterCareFormValues.homeValue`'s own reasoning,
 * entered the same way. `sellingCosts` and `newHomeAmount` are OPTIONAL, `HeasDrawFormValues.stopDate`'s
 * own idiom: **blank is omitted, not zero** at the type — `sellHomeEntry` below leaves the key out
 * entirely, and `projection.ts`/`parsePlan.ts` read nil (`sellingCosts`) or "no exemption"
 * (`newHomeAmount`) at the point of use. `owner` (above) is ignored: a home is a Household fact,
 * `MORTGAGE_REFINANCE`'s own ruling.
 *
 * **`newHomePurchaseDate` is refused by name if it is anything but blank — the purchase is a
 * `BUY_HOME` entry (P14-19).** `sellHomeEntry` below still passes whatever was typed through so that
 * refusal is reachable, on every other box's own "the door is the one judge" rule.
 */
export interface SellHomeFormValues extends EntryFormValues {
  /** What the home will fetch, in DOLLARS, as typed — the household's own estimate. */
  readonly salePrice: string;
  /** Agent's commission, conveyancing and the like, in DOLLARS, as typed, or `''` for none. */
  readonly sellingCosts: string;
  /** Of the net proceeds, how much is set aside for a new home, in DOLLARS, as typed, or `''` for none (P14-13c). */
  readonly newHomeAmount: string;
  /** An ISO date, as typed, or `''` for none. `parsePlan` refuses a stated one — use `BUY_HOME`. */
  readonly newHomePurchaseDate: string;
}

/**
 * `BUY_HOME` (P14-19). `purchasePrice` is required; `purchaseCosts` is optional, `sellingCosts`'s own
 * "blank is omitted, not zero" idiom. `owner` (above) is ignored: a home is a Household fact.
 */
export interface BuyHomeFormValues extends EntryFormValues {
  /** The new home's price, in DOLLARS, as typed — the household's own estimate. */
  readonly purchasePrice: string;
  /** Stamp duty, conveyancing and the like, in DOLLARS, as typed, or `''` for none. */
  readonly purchaseCosts: string;
}

/**
 * `RENT_OUT_HOME` (P14-13). `weeklyRent` is required, `SellHomeFormValues.salePrice`'s own
 * reasoning — the household's own estimate, entered the same way. The four annual costs are each
 * OPTIONAL, `sellingCosts`'s own "blank is omitted, not zero" idiom, one box per cost
 * (`RentOutHomeParams`'s own doc: a reader auditing a rental wants them apart). `endDate` is
 * OPTIONAL, `HeasDrawFormValues.stopDate`'s own idiom: blank means still renting. `owner` (above) is
 * ignored: a home is a Household fact, `MORTGAGE_REFINANCE`'s own ruling.
 */
export interface RentOutHomeFormValues extends EntryFormValues {
  /** What the household expects to receive each week, in DOLLARS, as typed — its own estimate. */
  readonly weeklyRent: string;
  /** Council rates for the year, in DOLLARS, as typed, or `''` for none. */
  readonly annualRates: string;
  /** Building and landlord insurance for the year, in DOLLARS, as typed, or `''` for none. */
  readonly annualInsurance: string;
  /** The property agent's commission and letting fees for the year, in DOLLARS, as typed, or `''` for none. */
  readonly annualAgentFees: string;
  /** Repairs and maintenance for the year, in DOLLARS, as typed, or `''` for none. */
  readonly annualRepairs: string;
  /** An ISO date, as typed, or `''` for no end — the tenancy keeps running to the plan's last month. */
  readonly endDate: string;
}

/**
 * `RETURN_CHANGE` (P2-11). One box, a RATE and not money — `nominalReturn`'s own settings-panel box
 * and `MortgageRefinanceFormValues.annualInterestRate`'s own shape, both typed as a decimal fraction
 * a year and read through `rateAsTyped`.
 */
export interface ReturnChangeFormValues extends EntryFormValues {
  /** A decimal fraction a year — `0.065` is 6.5% — as typed. `ReturnChangeParams.rate`'s own convention. */
  readonly rate: string;
}

/**
 * `TTR_START` (retire flow S4). Which account (counted from 1) becomes the pension, and the yearly
 * rate as a PERCENT, `TtrRateChangeFormValues`' box; blank pays the yearly minimum.
 */
export interface TtrStartFormValues extends EntryFormValues {
  readonly interestIndex: string;
  readonly drawdownRatePercent: string;
  /** RF-3: dollars to move into a new account for the pension; blank makes the named account the pension. */
  readonly amount: string;
}

/**
 * `TTR_RATE_CHANGE` (TTR build step 3). Two boxes: which account, and the new rate as a PERCENT —
 * the household editor's own TTR rate box, so the one fact is typed the same way in both places.
 */
export interface TtrRateChangeFormValues extends EntryFormValues {
  readonly interestIndex: string;
  /** A percentage a year — `7` is 7% — as typed. The file holds the fraction. */
  readonly drawdownRatePercent: string;
}

/**
 * `INSURANCE_COVER_CHANGE` (P3-17a slice 3). Which account (counted from 1), which benefit as chosen
 * (`'death'`, `'tpd'`, `'both'`; blank is refused), and the cover kept as a PERCENT — `0` cancels it.
 */
export interface InsuranceCoverChangeFormValues extends EntryFormValues {
  readonly interestIndex: string;
  readonly benefit: string;
  readonly coverPercent: string;
}

/**
 * `SPOUSE_CONTRIBUTION` (P3-19). Two boxes, both required, and **the second is not money** — the
 * same pair `LumpSumFromSuperFormValues` and `SuperContributionFormValues` take, pointing at the
 * RECEIVING spouse's account rather than the owner's own.
 */
export interface SpouseContributionFormValues extends EntryFormValues {
  /** What is paid, once, in DOLLARS, as typed. **Blank is not zero**: it becomes `NaN` and is refused. */
  readonly amount: string;
  /** Which of the RECEIVING spouse's super accounts, as typed — counted from 1; `interestIndexAsTyped` makes it THEIR position. */
  readonly receivingInterestIndex: string;
}

/**
 * `DOWNSIZER_CONTRIBUTION` (P9-5). The amount in today's money, the owner's OWN account (counted from
 * 1), and the 10-year ownership answer as typed: `'yes'` states it, anything else leaves it unstated
 * for the door to refuse.
 */
export interface DownsizerContributionFormValues extends EntryFormValues {
  readonly amount: string;
  readonly receivingInterestIndex: string;
  readonly ownedTenYears: string;
}

/** `WORK_PATTERN_CHANGE`. */
export interface WorkPatternChangeFormValues extends EntryFormValues {
  /** Days a week, as typed. A RATE, not money — it does not go through `dollarsToCents`. */
  readonly daysPerWeek: string;
  /**
   * The salary those days pay, per YEAR, in DOLLARS, as typed. **Blank is not zero** — it becomes
   * `NaN` through `dollarsToCents` and the door refuses it by name, exactly as an amount does.
   * A user who will earn nothing types `0`, and must then type `0` days beside it.
   */
  readonly annualSalary: string;
}

/**
 * `LUMP_SUM_FROM_SUPER`. Two boxes, both required, and **the second is not money** — see
 * `interestIndexAsTyped`.
 */
export interface LumpSumFromSuperFormValues extends EntryFormValues {
  /** What to withdraw, in DOLLARS, as typed. **Blank is not zero**: it becomes `NaN` and is refused. */
  readonly amount: string;
  /** Which super account, as typed — counted from 1; `interestIndexAsTyped` makes it a position. */
  readonly interestIndex: string;
}

/**
 * `SUPER_CONTRIBUTION`. Two boxes, both required, and **the second is not money** — the same pair
 * as `LumpSumFromSuperFormValues`, pointing the other way. ~~`kind` is not a box: only one of the
 * four kinds is specified (`plan.ts`), and a selector offering one value would invite the other
 * three to be added here rather than at the door.~~
 *
 * **`kind` IS A BOX FROM 2026-09-21, and it still offers none of those three** (P6-8 brief 4). The
 * selector's two options are this shape and the STOP, which states no figures at all and so has no
 * form-values type of its own — `superContributionStopEntry` takes `EntryFormValues`. The reason
 * the other three kinds stay off the selector is unchanged: they are unspecified, and the door
 * refuses each of them with the reason it is not specified.
 */
export interface SuperContributionFormValues extends EntryFormValues {
  /** What is sacrificed per YEAR, in DOLLARS, as typed. **Blank is not zero**: it becomes `NaN` and is refused. */
  readonly annualAmount: string;
  /** Which super account the money is paid INTO, as typed — counted from 1; `interestIndexAsTyped` makes it a position. */
  readonly interestIndex: string;
}

/**
 * `MORTGAGE_REFINANCE` — the home loan's terms from a date (P3-16 slice 2). **Three boxes, all
 * three required**, exactly the three the settings panel asks for the day-1 loan: `plan.ts` refuses
 * a partial change, because a figure this entry carried forward would be a figure the user never
 * restated. **Blank is not zero** in any of them — each becomes `NaN` and the door refuses it by
 * name, on `WorkPatternChangeFormValues.annualSalary`'s rule.
 */
export interface MortgageRefinanceFormValues extends EntryFormValues {
  /** What is owed from this date, in DOLLARS, as typed. A nil one is refused at the door. */
  readonly openingBalance: string;
  /** A decimal fraction a year — `0.061` is 6.1%. A RATE, not money: it goes through `rateAsTyped`. */
  readonly annualInterestRate: string;
  /** What is paid each month from this date, in DOLLARS, as typed. */
  readonly monthlyRepayment: string;
}

/** `ONE_OFF_EXPENSE`. */
export interface OneOffExpenseFormValues extends EntryFormValues {
  /** The single outflow in DOLLARS, as typed. */
  readonly amount: string;
}

/** `GIFT` (register §4.12). The owner is the giver; `household` is a gift both gave. */
export interface GiftFormValues extends EntryFormValues {
  /** What is given, in DOLLARS on the day, as typed — `ONE_OFF_EXPENSE`'s money (register O86). */
  readonly amount: string;
}

/**
 * `NON_SUPER_INVESTMENT` with `direction: 'buy'`. Carries `incidentalCostsOfAcquisition`, which is
 * REQUIRED on a buy (`plan.ts`: *"state `toCents(0)` where there were none"*) and which the sell
 * shape below does not have at all.
 */
export interface NonSuperInvestmentBuyFormValues extends EntryFormValues {
  /** What is spent on the parcel, in DOLLARS, as typed. */
  readonly amount: string;
  /** Brokerage and the rest, in DOLLARS, as typed. **Blank is not zero** — see `nonSuperInvestmentBuyEntry`. */
  readonly incidentalCostsOfAcquisition: string;
}

/**
 * `NON_SUPER_INVESTMENT` with `direction: 'sell'`. Carries `parcelSelection`, which is OPTIONAL,
 * and **does not carry `incidentalCostsOfAcquisition`, which `parsePlan` refuses on a sell.**
 */
export interface NonSuperInvestmentSellFormValues extends EntryFormValues {
  /** What is realised, in DOLLARS, as typed. */
  readonly amount: string;
  /** One of `PARCEL_SELECTIONS`, or blank for "not stated" — blank omits the KEY (`parsePlan` reads absence). */
  readonly parcelSelection: string;
}

/**
 * **Dollars as a person typed them → cents, WITHOUT rounding and WITHOUT refusing.**
 *
 * `money.ts`'s `parseAmount` throws on anything it cannot read, and a throw here would be a second
 * validator: the user would meet a bare `RangeError` from inside arithmetic instead of the plan
 * file's own named refusal. So this converts and never judges —
 *
 *   * `"84,000"` → `8_400_000`, `"84000.50"` → `8_400_050`: exact integer arithmetic on the digits,
 *     no float constructed, exactly as `parseAmount` does it;
 *   * `"84000.505"` → `8_400_050.5`: **the extra digit is kept**, so `parsePlan` can say
 *     *"is 8400050.5, and a whole number of cents was required"*. Rounding it away here would be
 *     this module deciding a half-cent on the user's behalf (ADR-0001);
 *   * `"abc"`, `""` → `NaN`, which `parsePlan` refuses as not a whole number of cents.
 *
 * The return type is `number`, not `Cents`: an unvalidated figure must not arrive branded.
 */
export const dollarsToCents = (text: string): number => {
  const match = /^\s*(-)?\$?\s*(\d[\d,]*)?(?:\.(\d+))?\s*$/.exec(text);
  if (!match || (match[2] === undefined && match[3] === undefined)) return Number.NaN;
  const whole = Number((match[2] ?? '0').replaceAll(',', ''));
  const digits = match[3] ?? '';
  // ≤ 2 decimals is whole cents by integer arithmetic; beyond that the remainder is preserved as
  // the fraction of a cent it is, because that is the number the refusal has to be able to quote.
  const cents = digits.length <= 2
    ? whole * 100 + Number(digits.padEnd(2, '0') || '0')
    : whole * 100 + Number(`${digits.slice(0, 2)}.${digits.slice(2)}`);
  return (match[1] === undefined ? 1 : -1) * cents;
};

/**
 * **A days-a-week figure as a person typed them → a number, WITHOUT refusing.** The rate twin of
 * `dollarsToCents`, and here for the same reason: `parsePlan`'s `rate` is the one judge.
 *
 * **Blank is `NaN`, deliberately, and it is the whole point of this function existing.**
 * `Number('')` is `0`, and zero days a week is not "nothing was typed" — it is the one
 * `daysPerWeek` value the engine acts on (`projection.ts`: `worksNoDays[index] = daysPerWeek === 0`,
 * which switches the salary off). A blank box that silently became a retirement would be this
 * module deciding the most consequential figure on the form on the user's behalf. So blank is a
 * figure `parsePlan` refuses by name, and a user who means no days types `0`.
 */
export const daysAsTyped = (text: string): number => (text.trim() === '' ? Number.NaN : Number(text.trim()));

/**
 * **A super account NUMBER as a person typed it → the stored position, WITHOUT refusing.** The box
 * counts from 1, as every place the page names an account does (`superAccountName`, ruling
 * 2026-09-24), and `plan.json` stores the position counted from 0 — so `1` is position `0`. The
 * third of these unjudging converters, and it exists for `daysAsTyped`'s exact reason: `Number('')`
 * is `0`, and a blank box that silently became an account would withdraw from one the user never
 * named, which is the one decision `LumpSumFromSuperParams.interestIndex` is required in order to
 * prevent. So blank is `NaN`, which `parsePlan` refuses by name; `0` becomes `-1`, refused the same way.
 */
export const interestIndexAsTyped = (text: string): number => (text.trim() === '' ? Number.NaN : Number(text.trim()) - 1);

/**
 * The fields every candidate entry shares, with the two impure ones INJECTED. Written once so that
 * five builders cannot drift apart over whether `enabled` is stated or a blank note is `""`.
 *
 * `enabled: true` is written explicitly rather than left out: `Entry.enabled` is required and
 * "nobody said" is not "enabled" (`plan.ts`).
 */
const candidateEntry = (
  values: EntryFormValues,
  type: string,
  params: unknown,
  id: string,
  createdAt: string,
): unknown => ({
  id,
  date: values.date,
  owner: values.owner,
  type,
  params,
  enabled: true,
  createdAt,
  ...(values.note.trim() === '' ? {} : { note: values.note.trim() }),
});

/**
 * A candidate `SPEND_CHANGE` entry from form values. **`unknown`, deliberately**: nothing here has
 * been checked, and a return type of `Entry` would let an unvalidated object be spread into a
 * `PlanFile` by a caller who read the signature and trusted it. `parsePlan` is what turns one of
 * these into an `Entry`, and it is the only thing that can. Every builder below returns `unknown`
 * for the same reason.
 *
 * **`id` and `createdAt` are ARGUMENTS, and that is the point of these functions being pure.**
 * `crypto.randomUUID()` and `new Date()` are the two things that would make every test of this
 * layer non-deterministic, so neither is reachable from here: the writer supplies the real ones
 * (`entryForm.ts`) and a test supplies fixed ones. There is no clock in `app/`'s pure layer for the
 * same reason there is none in `core/` — `Settings.asAtDate` is this program's only "today".
 */
export const spendChangeEntry = (values: SpendChangeFormValues, id: string, createdAt: string): unknown =>
  candidateEntry(values, 'SPEND_CHANGE', { annualSpend: dollarsToCents(values.annualSpend) }, id, createdAt);

/**
 * A candidate `RETIRE`. **`params` is `{}` and the form has no params box at all** — `RetireParams`
 * is empty (`plan.ts`: *"the date is the fact"*), and `parsePlan` refuses any key in there, so an
 * empty object is not a placeholder waiting to be filled: it is the shape.
 */
export const retireEntry = (values: RetireFormValues, id: string, createdAt: string): unknown =>
  candidateEntry(values, 'RETIRE', {}, id, createdAt);

/**
 * A candidate `MORTGAGE_TARGET` (P3-16a). `retireEntry`'s exact shape — `MortgageTargetParams` is
 * also `{}`, and the form has no params box for this type either: the date is the whole of the
 * stated fact, and which milestone it means belongs in the shared `note` box above.
 */
export const mortgageTargetEntry = (values: MortgageTargetFormValues, id: string, createdAt: string): unknown =>
  candidateEntry(values, 'MORTGAGE_TARGET', {}, id, createdAt);

/**
 * A candidate `MORTGAGE_PAYOFF`. `retireEntry`'s exact shape — no params box, because the amount is
 * not the user's to state: it is the balance the walk has reached that month plus that month's
 * interest. Whether a loan is in force that month cannot be known here; the walk refuses it.
 */
export const mortgagePayoffEntry = (values: MortgagePayoffFormValues, id: string, createdAt: string): unknown =>
  candidateEntry(values, 'MORTGAGE_PAYOFF', {}, id, createdAt);

/**
 * A candidate `ILLNESS_SEPARATION` (P12-4). `retireEntry`'s exact shape — no params box. Whether the
 * Household is a couple is the door's question (`parsePlan` refuses one for a single Person).
 */
export const illnessSeparationEntry = (values: IllnessSeparationFormValues, id: string, createdAt: string): unknown =>
  candidateEntry(values, 'ILLNESS_SEPARATION', {}, id, createdAt);

/**
 * A candidate `DEATH` (P12-1). `retireEntry`'s exact shape — no params box. That it is one Person's,
 * in a couple, is the door's question (`parsePlan`'s `checkDeaths`); which entries it rules out is
 * the walk's (`projection.ts`'s `deathOf`).
 */
export const deathEntry = (values: DeathFormValues, id: string, createdAt: string): unknown =>
  candidateEntry(values, 'DEATH', {}, id, createdAt);

/**
 * A candidate `ENTER_CARE` (P14-13, slice 3b). All three boxes go through `dollarsToCents` like any
 * other money box, and none of them is judged here: `parsePlan` refuses a negative home value, a
 * negative room price, a negative lump sum and a lump sum bigger than the room price; and
 * `checkEnterCares` refuses a `household` owner, an owner not in the file and a second entry for a
 * Person who already has one.
 */
export const enterCareEntry = (values: EnterCareFormValues, id: string, createdAt: string): unknown =>
  candidateEntry(
    values,
    'ENTER_CARE',
    {
      homeValue: dollarsToCents(values.homeValue),
      radPrice: dollarsToCents(values.radPrice),
      radPaidAsLumpSum: dollarsToCents(values.radPaidAsLumpSum),
    },
    id,
    createdAt,
  );

// **P17-3 (2026-09-28): every entry's ⓘ box says what the entry does, in one or two lines, and never
// restates a figure, a threshold or a rule** — those live only in `userguide.md`, at the `guide:`
// label its `infoButton` call in `entryForm.ts` names. The doc comments on these notices still
// describe the mechanic; where one says a fact is "named on screen", the guide is now where it is named.

/**
 * **What the three aged care boxes carry, and that they are the household's own estimate — said
 * because nobody can look these figures up (user ruling, 2026-09-24).** The home's sale value, the
 * room price a facility agrees to and how much of it is paid as a lump sum are all facts that do not
 * exist until the day they are agreed, so this build cannot forecast them: type your own best guess
 * for each, in today's dollars.
 */
export const ENTER_CARE_ENTRY_SUMMARY =
  'Your estimates, in today’s money: home value, room price, lump-sum share.';

// **P12-4 pointer, added 2026-09-25** — the last sentence. Moving permanently into residential aged
// care is one of the situations the Guide to Social Security Law accepts, WITHOUT extra medical
// evidence, as supporting an "illness separated couple" — each member paid the single rate on the
// couple's COMBINED income and assets — once the couple tells Services Australia about the move; it
// is a Services Australia assessment on notification, not something granted merely by this forecast
// holding an ENTER_CARE entry. Source: Guide to Social Security Law §2.2.5.60 "Determining an
// illness separated couple" (SSAct s 4(7)) — guides.dss.gov.au blocks a plain `curl`, even with a
// Chrome User-Agent, behind a Cloudflare challenge, so this was read off the Wayback Machine's copy
// (web.archive.org/web/2024/https://guides.dss.gov.au/social-security-guide/2/2/5/60), and the
// category itself was independently confirmed live on servicesaustralia.gov.au's own rate tables
// ("A couple, separated due to illness" on /assets-test-for-age-pension; paid "each" on
// /how-much-pension-supplement-you-can-get). This build does not wire the two together — see
// `ILLNESS_SEPARATION` (`plan.ts`) for what is and is not modelled.
export const ENTER_CARE_ENTRY_NOTICE =
  'The forecast works out the fees, and the daily payment on any part of the room price not paid as a lump' +
  ' sum, from this person’s own income and assets. If one of you stays at home, you may be paid as an' +
  ' ‘illness separated’ couple: add an ‘Illness separation’ entry from the same date to see that.';

/**
 * A candidate `HEAS_DRAW` (P9-1, slice 2; P9-2a widened `owner` to a Person). `securityValue` goes
 * through `dollarsToCents` like any other money box — still the WHOLE household's home value, even
 * though `owner` (the shared select above) now names one Person's own loan against their own share
 * of it. `fortnightlyAmount` is the ONE union field this build's builders resolve by STRING rather
 * than by a second function (`enterCareEntry`'s own "always every field" shape, not
 * `superContributionEntry`/`superContributionStopEntry`'s two-builder shape): the literal text
 * `'maximum'` is passed through unchanged, and anything else goes through `dollarsToCents` — so the
 * choice the form's select makes is which STRING it hands in, not which function it calls.
 * `stopDate` is the one optional field slice 2 had: blank is omitted, `HeasDrawFormValues`'s own doc
 * says why. `advanceDate`/`advanceAmount` (P9-2b) are the same shape, together: blank `advanceDate`
 * omits `advances` entirely, and anything else builds the ONE-element list this slice's form offers
 * — `HeasDrawFormValues`'s own doc says why it is one and not a real repeatable row. Nothing here is
 * judged: `parsePlan`'s `checkHeasDraws` refuses `owner: 'household'`, the age, the homeowner status,
 * the absolute 150% ceiling on a stated amount (on THIS Person's own share, T37), a `stopDate` before
 * `date`, a second `HEAS_DRAW` for the SAME Person, two entries disagreeing on `securityValue`, a
 * `MORTGAGE_REFINANCE` dated on or after this entry (T35), an advance outside the draw's own span, a
 * third advance within 26 fortnights of the first, and a window total over 50% of the annual maximum
 * payment rate (T136).
 */
export const heasDrawEntry = (values: HeasDrawFormValues, id: string, createdAt: string): unknown =>
  candidateEntry(
    values,
    'HEAS_DRAW',
    {
      securityValue: dollarsToCents(values.securityValue),
      fortnightlyAmount: values.fortnightlyAmount === 'maximum' ? 'maximum' : dollarsToCents(values.fortnightlyAmount),
      ...(values.stopDate.trim() === '' ? {} : { stopDate: values.stopDate.trim() }),
      ...(values.advanceDate.trim() === ''
        ? {}
        : { advances: [{ date: values.advanceDate.trim(), amount: dollarsToCents(values.advanceAmount) }] }),
    },
    id,
    createdAt,
  );

/**
 * **What the Home Equity Access Scheme boxes carry, said plainly because it is a LOAN and not a
 * payment** (P9-1, slice 2, P6-6a). `securityValue` is the household's own estimate — nobody can
 * look up what a home would sell for — so everything the forecast works out from it (how much can
 * be drawn, and when the capacity cap is reached) is only as good as that estimate.
 */
export const HEAS_DRAW_ENTRY_SUMMARY =
  'A loan from the government against your home, paid to you each fortnight, with interest that compounds — not free money, and not a pension.';

export const HEAS_DRAW_ENTRY_NOTICE =
  'Type the home value, and any fixed fortnightly amount or lump sum, in today’s money, or choose “the most' +
  ' allowed”. The debt and its interest are repaid out of the home when it is sold, or out of the estate.';

/**
 * A candidate `SELL_HOME` (P14-13). `salePrice` goes through `dollarsToCents` like any other money
 * box; `sellingCosts` follows `heasDrawEntry`'s `stopDate` idiom — blank is OMITTED, not zero.
 * Nothing here is judged: `parsePlan`'s `checkSellHomes` refuses a household with no home to sell and
 * a second `SELL_HOME`; the params parser refuses a non-positive sale price and selling costs above
 * the sale price.
 */
export const sellHomeEntry = (values: SellHomeFormValues, id: string, createdAt: string): unknown =>
  candidateEntry(
    values,
    'SELL_HOME',
    {
      salePrice: dollarsToCents(values.salePrice),
      ...(values.sellingCosts.trim() === '' ? {} : { sellingCosts: dollarsToCents(values.sellingCosts) }),
      ...(values.newHomeAmount.trim() === '' ? {} : { newHomeAmount: dollarsToCents(values.newHomeAmount) }),
      // Passed through so a typed value reaches `parsePlan`'s refusal, never silently dropped.
      ...(values.newHomePurchaseDate.trim() === '' ? {} : { newHomePurchaseDate: values.newHomePurchaseDate.trim() }),
    },
    id,
    createdAt,
  );

/**
 * **What selling the home does, and does not do — said plainly because two things it does NOT model
 * are easy to assume** (P14-13, 2026-09-25). The sale price and selling costs are the household's own
 * estimate, in today's dollars.
 */
export const SELL_HOME_ENTRY_SUMMARY =
  'What’s left after loans goes to cash, unless set aside for a new home.';

export const SELL_HOME_ENTRY_NOTICE =
  'The sale price and costs are your own estimate, in today’s money. Set part of the proceeds aside if you' +
  ' plan to buy again, then add a “Buy a new home” change dated the day that purchase settles.';

/**
 * A candidate `RENT_OUT_HOME` (P14-13). `weeklyRent` goes through `dollarsToCents` like any other
 * money box; each of the four annual costs follows `sellHomeEntry`'s `sellingCosts` idiom — blank is
 * OMITTED, not zero — as does `endDate`, `heasDrawEntry`'s `stopDate` idiom. Nothing here is judged:
 * `parsePlan`'s `checkRentOutHomes` refuses a household with no home to rent, overlapping tenancies
 * and an incoherent order against a `SELL_HOME`/`ENTER_CARE`; the params parser refuses a
 * non-positive weekly rent and a negative annual cost.
 */
export const rentOutHomeEntry = (values: RentOutHomeFormValues, id: string, createdAt: string): unknown =>
  candidateEntry(
    values,
    'RENT_OUT_HOME',
    {
      weeklyRent: dollarsToCents(values.weeklyRent),
      ...(values.annualRates.trim() === '' ? {} : { annualRates: dollarsToCents(values.annualRates) }),
      ...(values.annualInsurance.trim() === '' ? {} : { annualInsurance: dollarsToCents(values.annualInsurance) }),
      ...(values.annualAgentFees.trim() === '' ? {} : { annualAgentFees: dollarsToCents(values.annualAgentFees) }),
      ...(values.annualRepairs.trim() === '' ? {} : { annualRepairs: dollarsToCents(values.annualRepairs) }),
      ...(values.endDate.trim() === '' ? {} : { endDate: values.endDate }),
    },
    id,
    createdAt,
  );

/**
 * **What renting the home out does, and does not do** (P14-13, 2026-09-25). All five figures are the
 * household's own estimate, in today's dollars.
 */
export const RENT_OUT_HOME_ENTRY_SUMMARY =
  'Net rent counts as income for tax, the Age Pension and aged care.';

// **Basis, user ruling 2026-09-25.** Unlike a RAD or a sale, fixed once at entry, rent is a
// standing figure and keeps rising every month of the tenancy — `SPEND_CHANGE`'s own footing.
export const RENT_OUT_HOME_ENTRY_NOTICE =
  'The rent and each cost are your own estimate, in today’s money, and keep rising with prices for as long' +
  ' as the tenancy runs.';

/**
 * A candidate `BUY_HOME` (P14-19), `sellHomeEntry`'s own shape. Nothing here is judged: `parsePlan`
 * refuses a purchase with no sale before it, a second one, and a non-positive price.
 */
export const buyHomeEntry = (values: BuyHomeFormValues, id: string, createdAt: string): unknown =>
  candidateEntry(
    values,
    'BUY_HOME',
    {
      purchasePrice: dollarsToCents(values.purchasePrice),
      ...(values.purchaseCosts.trim() === '' ? {} : { purchaseCosts: dollarsToCents(values.purchaseCosts) }),
    },
    id,
    createdAt,
  );

export const BUY_HOME_ENTRY_SUMMARY =
  'Buy a new home after selling this one. The household owns a home again from this date.';

export const BUY_HOME_ENTRY_NOTICE =
  'Both figures are your own estimate, in today’s money. The purchase is paid from what the sale set aside' +
  ' first, then from your other money.';

/**
 * A candidate `RETURN_CHANGE` (P2-11 microtask 4). The rate goes through `rateAsTyped`, exactly as
 * `MORTGAGE_REFINANCE`'s own rate box does — no sign check here either, on `nominalReturn`'s own
 * precedent (`parsePlan`): a negative return is a real assumption a household can state, not a shape
 * this converter judges.
 */
export const returnChangeEntry = (values: ReturnChangeFormValues, id: string, createdAt: string): unknown =>
  candidateEntry(values, 'RETURN_CHANGE', { rate: rateAsTyped(values.rate) }, id, createdAt);

/**
 * A candidate `SPOUSE_CONTRIBUTION` (P3-19). Two boxes, both required, and neither is judged here:
 * `parsePlan` refuses a nil or negative amount, an index that is not a whole position, a
 * `household` owner, a Household with only one Person, an index naming no interest of the
 * receiving spouse's, and a target that is not in the accumulation phase.
 */
export const spouseContributionEntry = (values: SpouseContributionFormValues, id: string, createdAt: string): unknown =>
  candidateEntry(
    values,
    'SPOUSE_CONTRIBUTION',
    { amount: dollarsToCents(values.amount), receivingInterestIndex: interestIndexAsTyped(values.receivingInterestIndex) },
    id,
    createdAt,
  );

/**
 * A candidate `DOWNSIZER_CONTRIBUTION` (P9-5). Nothing is judged here: `parsePlan` refuses every
 * rule `DownsizerContributionParams` lists, and an unanswered ownership question.
 */
export const downsizerContributionEntry = (values: DownsizerContributionFormValues, id: string, createdAt: string): unknown =>
  candidateEntry(
    values,
    'DOWNSIZER_CONTRIBUTION',
    {
      amount: dollarsToCents(values.amount),
      receivingInterestIndex: interestIndexAsTyped(values.receivingInterestIndex),
      ...(values.ownedTenYears === 'yes' ? { statedOwnedTenYears: true } : {}),
    },
    id,
    createdAt,
  );

export const DOWNSIZER_CONTRIBUTION_ENTRY_SUMMARY =
  'Put some of the home sale money into your own super, outside the usual contribution limits.';

export const DOWNSIZER_CONTRIBUTION_ENTRY_NOTICE =
  'The amount is in today’s money. It is paid from what the sale set aside first, then from your other' +
  ' money, into an account you are still paying into.';

/**
 * A candidate `WORK_PATTERN_CHANGE`. The days figure goes through `daysAsTyped`, which turns a
 * blank box into `NaN` rather than into the zero that would stop the salary — see there. The
 * salary goes through `dollarsToCents` like every other money box, and neither figure is judged
 * here: `parsePlan` refuses a negative one, and it refuses the two ways the pair can contradict
 * itself (no days with money, days with no money).
 */
export const workPatternChangeEntry = (
  values: WorkPatternChangeFormValues,
  id: string,
  createdAt: string,
): unknown =>
  candidateEntry(
    values,
    'WORK_PATTERN_CHANGE',
    { daysPerWeek: daysAsTyped(values.daysPerWeek), annualSalary: dollarsToCents(values.annualSalary) },
    id,
    createdAt,
  );

/**
 * **What the two work-pattern boxes carry at the point of entry, before anything is typed and
 * after.** Not put in a placeholder: a placeholder disappears the moment a value is typed, which
 * is exactly the moment this matters most.
 *
 * ⚠️ **Rewritten on 2026-09-19, and the sentence it replaces is why.** It used to read *"Only 0
 * changes the forecast today. Any other number of days is not modelled: the salary carries on
 * unchanged, so the forecast this produces is optimistic, not neutral."* That was true of the
 * engine as it then stood — `projection.ts` read `daysPerWeek` only at zero, because no day rate
 * exists in this model — and it is now FALSE: `WorkPatternChangeParams.annualSalary` states the
 * money, so a positive number of days moves the forecast by the figure the user typed. A warning
 * that has stopped being true is its own defect, and the fix removed the reason for the warning
 * rather than the warning alone.
 *
 * What it says now is the PAIRING, which is the one thing a user can get wrong here and the one
 * thing the door refuses: the salary is what the forecast uses, the days are the reason it
 * changed, and the two must agree about whether any work is being done.
 */
/** What stays on the page: the pairing, in one line. The rest of the notice opens behind it. */
export const DAYS_PER_WEEK_ENTRY_SUMMARY =
  'Yearly salary in today’s money. 0 days and 0 salary stops work.';

export const DAYS_PER_WEEK_ENTRY_NOTICE =
  'The salary replaces the pay on file from this date, and the forecast raises it with wages the same way.';

/**
 * A candidate `LUMP_SUM_FROM_SUPER`. Neither box is judged here: `parsePlan` refuses a nil or
 * negative amount and an index that is not a whole position, and `projection.ts` refuses an index
 * that names no interest of that Person, a household owner, an Account-Based Pension target, an
 * owner below the tax-free age and an owner whose benefit is still preserved. Six refusals, none of
 * them duplicated in this layer.
 */
export const lumpSumFromSuperEntry = (values: LumpSumFromSuperFormValues, id: string, createdAt: string): unknown =>
  candidateEntry(
    values,
    'LUMP_SUM_FROM_SUPER',
    { amount: dollarsToCents(values.amount), interestIndex: interestIndexAsTyped(values.interestIndex) },
    id,
    createdAt,
  );

/**
 * A candidate `MORTGAGE_REFINANCE`. The rate goes through `rateAsTyped` and the two money boxes
 * through `dollarsToCents`, and **nothing here is judged**: `parsePlan` refuses a nil or negative
 * balance, a negative rate and a nil or negative repayment, and the WALK refuses a change that
 * makes the loan unpayable in some later month — which is the one refusal the door cannot make,
 * because it depends on the offset balance in a month only `project()` knows.
 */
export const mortgageRefinanceEntry = (values: MortgageRefinanceFormValues, id: string, createdAt: string): unknown =>
  candidateEntry(
    values,
    'MORTGAGE_REFINANCE',
    {
      openingBalance: dollarsToCents(values.openingBalance),
      annualInterestRate: rateAsTyped(values.annualInterestRate),
      monthlyRepayment: dollarsToCents(values.monthlyRepayment),
    },
    id,
    createdAt,
  );

/**
 * **What the three loan boxes carry — and the four things this build does NOT model, named on
 * screen (P3-16 slice 2, and the ruling of 2026-09-21 that a gap is disclosed rather than guessed).**
 *
 * The first sentence is what the entry IS, because the stored type is called a refinance and this
 * is also how a household takes a loan out. The rest is the list: **paying PART of the loan off with
 * a lump sum is not modelled**, and neither is a redraw, an extra repayment or an interest-only
 * period. A user reaching for a balance of zero to say "we paid it out" is refused at the door and
 * pointed at `MORTGAGE_PAYOFF` ("Home loan — pay off in full"), which adds the payout to the month's
 * Waterfall target — funded like spending, from cash, investments or super.
 *
 * The last sentence is the one the door cannot enforce: a repayment must cover the interest in the
 * month the change lands, and if it does not, the whole forecast is refused rather than drawn.
 */
export const MORTGAGE_ENTRY_SUMMARY =
  'Sets the whole loan from this date; also for a new loan.';

export const MORTGAGE_ENTRY_NOTICE =
  'State all three figures even if only one is changing: nothing is carried over from before. To pay the' +
  ' whole loan off, use a “Home loan — pay off in full” entry instead.';

/**
 * **What the withdrawal boxes carry, and it is a DISCLOSURE rather than a hint.** Three facts a
 * user cannot read off the form and would otherwise meet as a refusal after saving, or — worse —
 * not meet at all:
 *
 *   * **60 is a floor this build enforces**, and below it the withdrawal is refused by name rather
 *     than estimated: the tax below 60 is computed on a taxable/tax-free component split this model
 *     does not hold, and a guess would flatter the household.
 *   * **The tax above it is nil, and that nil ASSUMES A TAXED SOURCE.** Nothing in the plan records
 *     which source an interest is from, and an untaxed-source element — in practice a legacy
 *     public-sector scheme — is taxed materially even after 60. For such a household the forecast
 *     is optimistic, and this is the sentence that says so on screen.
 *   * **The interest is named by position and the amount is capped at what it holds.** A withdrawal
 *     larger than the balance pays out what is there, and the month says which.
 */
export const LUMP_SUM_ENTRY_NOTICE =
  'Name the account by its number in that person’s list. A withdrawal larger than the balance pays out what' +
  ' is there.';

/**
 * **THE SPENDING FIGURE EXCLUDES THE MORTGAGE, AND THE FORM HAS TO SAY SO** (user ruling,
 * 2026-09-21, with P3-16 slice 1).
 *
 * The engine adds a stated home-loan repayment to the month's target ON TOP OF this level — see the
 * target in `projection.ts` — because "what we spend a year" and "what the loan costs" are two
 * facts and netting one out of the other would be this build answering, silently, a question the
 * user was never put. The risk runs the other way too: most people's own annual-spending number
 * already has the mortgage inside it, so a user who types that number AND states their loan has it
 * counted twice, and the forecast comes out worse than their life. Nothing in the file can detect
 * that — the two figures are equally plausible either way — so the only defence is this sentence,
 * on the box, before the figure is typed.
 *
 * It says nothing about a household with no loan stated, for whom the instruction is harmless: the
 * figure is simply what they spend.
 *
 * **AND IT SAYS WHICH MONEY IT IS ASKING FOR (register O85, user ruling 2026-09-21).** The stated
 * level is REAL from that date — `project()` raises it to every month's price level — so the box
 * wants today's money, and a form that did not say so would leave the user to assume the figure is
 * held flat, which is what it used to be. The `ONE_OFF_EXPENSE` box asks for the opposite (the
 * amount on the day, register O86) and the notice says that too, because two spending boxes on one
 * form that mean different things are a trap unless both are labelled.
 */
export const SPEND_CHANGE_ENTRY_SUMMARY = 'Home loan repayments are added on top';

export const SPEND_CHANGE_ENTRY_NOTICE =
  'Everything the household spends in a year, in today’s money, NOT counting home loan repayments — those are' +
  ' added on top from the home loan boxes. From this date the forecast charges a twelfth of it each month and' +
  ' raises it with prices. A one-off cost is its own entry.';

/** What stays on the page. The age is the fact that changes what a user can do. */
export const LUMP_SUM_ENTRY_SUMMARY =
  'One withdrawal from super on this date. Shown with no tax — right for most funds, optimistic for some.';

/**
 * A candidate `SUPER_CONTRIBUTION` — a standing salary sacrifice, from this entry's date until
 * another one for the same Person supersedes it.
 *
 * **`kind: 'salarySacrificed'` is written HERE and is not read off the form**, for
 * `nonSuperInvestmentBuyEntry`'s reason: it is the discriminant of a four-member union of which
 * this build specifies one member, and a box offering it would be a box with one legal value.
 * `parsePlan` refuses the other three by name, each with the reason it is not specified.
 *
 * Neither figure is judged here. `parsePlan` refuses a nil or negative amount, an index that is
 * not a whole position, an index naming no interest of that Person, a `household` owner and a
 * target that is not in the accumulation phase; `projection.ts` refuses a stated amount above the
 * year's general concessional cap. Six refusals, none of them duplicated in this layer.
 */
export const superContributionEntry = (values: SuperContributionFormValues, id: string, createdAt: string): unknown =>
  candidateEntry(
    values,
    'SUPER_CONTRIBUTION',
    {
      kind: 'salarySacrificed',
      annualAmount: dollarsToCents(values.annualAmount),
      interestIndex: interestIndexAsTyped(values.interestIndex),
    },
    id,
    createdAt,
  );

/**
 * A candidate `SUPER_CONTRIBUTION` **stop** — the standing arrangement ends on this entry's date
 * (P6-8 brief 4, user ruling 2026-09-21).
 *
 * **It takes no figures at all, and that is the whole shape of it.** `EntryFormValues` is the date,
 * the owner and the note; `kind: 'stopped'` is written here for `nonSuperInvestmentSellEntry`'s
 * reason — which of the two shapes is being built is decided by which function the form called, so
 * the discriminant and the field list cannot disagree, and no amount typed into the sacrifice box
 * can ride along on a stop.
 *
 * Nothing is judged here either. `parsePlan` refuses a `household` owner, an owner who is not in
 * the file, an `annualAmount` or an `interestIndex` stated beside `stopped`, and — the one only the
 * whole file can see — a stop with no arrangement running before its date.
 */
export const superContributionStopEntry = (values: EntryFormValues, id: string, createdAt: string): unknown =>
  candidateEntry(values, 'SUPER_CONTRIBUTION', { kind: 'stopped' }, id, createdAt);

/**
 * **What the salary-sacrifice boxes carry, and it is a DISCLOSURE rather than a hint** — the same
 * job `LUMP_SUM_ENTRY_NOTICE` does for the withdrawal. Four facts a user cannot read off the form,
 * and every one of them is a direction:
 *
 *   * **The concessional cap is enforced against your sacrifice AND your employer's Superannuation
 *     Guarantee, together (changed 2026-09-20).** The Guarantee counts towards the same cap in law
 *     and this build now counts it: $27,000 sacrificed against a $150,000 salary is $45,000 of
 *     concessional contributions, not $27,000, and is refused where it was accepted before that
 *     date. A total above the year's cap is refused by name rather than forecast, because this
 *     build does not price Division 291's excess treatment. A total below it is still NOT a finding
 *     that you are inside the cap: ~~unused cap carried forward from earlier years is not applied~~
 *     (P3-4b: it is applied now, and a year before the plan counts only if its unused cap is stated)
 *     (it would give you MORE room), and personal contributions you claim a deduction for are not
 *     held by this model at all (they would use room up).
 *   * **After June 2027 the room is smaller than the cap, because the cap itself is unknown.** The
 *     only published cap is FY2026-27's $32,500; later years index on a wage figure this build does
 *     not hold, and the law guarantees only that no year's cap falls below $25,000. So from
 *     1 July 2027 an arrangement is walked when the sacrifice plus the Guarantee is inside $25,000
 *     and refused by name when it is not — refused, rather than measured against a guessed cap.
 *   * **The fund's 15% is taken, and from 2026-09-20 so is Division 293's second 15%** (P6-9
 *     chunk 3) — on the lesser of the low tax contributions and the excess over $250,000, out of
 *     the Person's own cash. ~~For an income near or above $250,000 the real tax is higher than
 *     this forecast shows.~~ ~~What remains unmodelled is the Subdiv 293-B election to have the
 *     charge released from the fund instead (register O84).~~ **SUPERSEDED 2026-09-20 (P6-10): the
 *     election IS performed, once a year at the settlement, for a Person whose plan names the
 *     interest the release authority is served on. ~~What this FORM cannot do is state it — no box
 *     here sets it, so for anyone who has not hand-edited their plan file the charge above comes
 *     out of cash, and that is O84's residual (iii), which FLATTERS.~~ **SUPERSEDED 2026-09-20
 *     (P6-11): the election is stated on the HOUSEHOLD form and not on this one, which is why this
 *     notice names the screen rather than the field — an entry notice that said "no box sets it"
 *     would now be sending a user looking for a control that exists somewhere else.**
 *   * **It is a standing arrangement.** It holds from its date until another entry for the same
 *     person replaces it. ~~and this build cannot say "stop on this date" — switch the entry off, or
 *     state a smaller one from the month it changes.~~ **SUPERSEDED 2026-09-21 (P6-8 brief 4, user
 *     ruling): it CAN say "stop on this date" — a second `SUPER_CONTRIBUTION` with "Stop
 *     sacrificing" chosen ends it from its own date and leaves every month before that alone.
 *     Switching the entry off is still a different act and still available: it removes the
 *     arrangement from the whole forecast, including the years it ran.**
 *   * **It cannot sacrifice more than the pay.** An amount above the salary is capped at the salary
 *     for that month and the rest is dropped, so the forecast is of a SMALLER arrangement than the
 *     one stated, never a larger one.
 */
export const SUPER_CONTRIBUTION_ENTRY_NOTICE =
  'To end it, add another of these entries dated the month it stops and choose "Stop sacrificing": the years' +
  ' it ran are kept. Switching this entry off takes it out of the whole forecast, including those years.';

/** What stays on the page. The employer half of the limit is what turns a plan that worked into a refusal. */
export const SUPER_CONTRIBUTION_ENTRY_SUMMARY =
  'Salary sacrifice into super, from this date until another of these entries changes or stops it.';

/**
 * **What the spouse contribution boxes carry, and the tax offset is the one thing a user cannot
 * see coming without being told** (P3-19). Three facts:
 *
 *   * **It may earn you a tax offset, up to $540 a year**, and whether it does depends on your
 *     spouse's own income for the WHOLE financial year — a fact this one dated entry cannot state,
 *     so the forecast works it out at the end of the financial year rather than in the month you
 *     add it.
 *   * **It is your OWN after-tax money**, not a before-tax arrangement like salary sacrifice: the
 *     fund takes no 15% out of it, and it is not measured against the concessional cap.
 *   * **Owner is who PAYS; the money always lands in the OTHER person's account.** A household with
 *     only one person cannot use this entry — there is nobody to pay into.
 */
export const SPOUSE_CONTRIBUTION_ENTRY_NOTICE =
  'The owner you choose above is who PAYS; the money lands in your spouse’s super account named below, which' +
  ' must be one they are still paying into.';

/** What stays on the page. */
export const SPOUSE_CONTRIBUTION_ENTRY_SUMMARY =
  'Extra super for your spouse, paid once from your own after-tax money.';

/**
 * A candidate `TTR_START`. Nothing is judged here: `parsePlan` refuses the ages, the account, a rate
 * outside `TTR_RATE_FLOOR`..`TTR_RATE_CEILING` and an amount of nothing. A blank rate box states no
 * rate, and a blank amount box no amount.
 */
export const ttrStartEntry = (values: TtrStartFormValues, id: string, createdAt: string): unknown =>
  candidateEntry(
    values,
    'TTR_START',
    {
      interestIndex: interestIndexAsTyped(values.interestIndex),
      ...(values.drawdownRatePercent.trim() === '' ? {} : { drawdownRate: percentAsFraction(values.drawdownRatePercent) }),
      ...(values.amount.trim() === '' ? {} : { amount: dollarsToCents(values.amount) }),
    },
    id,
    createdAt,
  );

export const TTR_START_ENTRY_SUMMARY =
  'Starts a transition to retirement pension from one of your super accounts, from this date.';

export const TTR_START_ENTRY_NOTICE =
  'From this date a pension is paid to you while you keep working, at the share you choose, or the yearly' +
  ' minimum if you leave it blank. Type an amount to move and the forecast opens a new account for the' +
  ' pension on this date, taking the amount out of the account you name, where your employer keeps paying.' +
  ' Leave the amount blank to turn the account you name into the pension: then it must be a second account' +
  ' you have set up, because your employer keeps paying into the other one. Until this date nothing changes;' +
  ' from it, the account also counts for the Age Pension. It becomes a normal pension when you stop work for' +
  ' good, or by itself at the age the law sets.';

/**
 * A candidate `TTR_RATE_CHANGE`. Nothing is judged here: `parsePlan` refuses a rate outside
 * `TTR_RATE_FLOOR`..`TTR_RATE_CEILING`, an index naming no account or an account that is not a TTR,
 * and a date on or after the 65th birthday; the walk refuses one dated after an earlier conversion.
 */
export const ttrRateChangeEntry = (values: TtrRateChangeFormValues, id: string, createdAt: string): unknown =>
  candidateEntry(
    values,
    'TTR_RATE_CHANGE',
    { interestIndex: interestIndexAsTyped(values.interestIndex), drawdownRate: percentAsFraction(values.drawdownRatePercent) },
    id,
    createdAt,
  );

export const TTR_RATE_CHANGE_ENTRY_NOTICE =
  'From this date the account pays the new yearly rate, until another change replaces it. The account must' +
  ' be one set to TTR under Household and settings, or one a Start a transition to retirement pension entry' +
  ' has started by this date.';

export const TTR_RATE_CHANGE_ENTRY_SUMMARY =
  'Changes how much a transition to retirement pension pays, from this date.';

/**
 * A candidate `INSURANCE_COVER_CHANGE`. Nothing is judged here: `parsePlan` refuses 100% or more,
 * an account with no premium for the benefit, and a date on or after the 70th birthday.
 */
export const insuranceCoverChangeEntry = (values: InsuranceCoverChangeFormValues, id: string, createdAt: string): unknown =>
  candidateEntry(
    values,
    'INSURANCE_COVER_CHANGE',
    { interestIndex: interestIndexAsTyped(values.interestIndex), benefit: values.benefit, coverFraction: percentAsFraction(values.coverPercent) },
    id,
    createdAt,
  );

/** The benefit select's options, as `entryForm.ts` offers them; never preselected. */
export const INSURANCE_BENEFIT_CHOICES = Object.freeze([
  { value: '', label: 'Choose' },
  { value: 'death', label: 'Death cover' },
  { value: 'tpd', label: 'TPD cover' },
  { value: 'both', label: 'Death and TPD cover' },
] as const);

export const INSURANCE_COVER_CHANGE_ENTRY_SUMMARY =
  'Cancels or cuts back the insurance inside a super account, from this date.';

export const INSURANCE_COVER_CHANGE_ENTRY_NOTICE =
  'Say what share of the account’s death or TPD (total and permanent disability) cover to keep; the premium' +
  ' falls by the same share. A later change for the same account and cover replaces this one.';

/** A candidate `ONE_OFF_EXPENSE` — one outflow, in this entry's own month. */
export const oneOffExpenseEntry = (values: OneOffExpenseFormValues, id: string, createdAt: string): unknown =>
  candidateEntry(values, 'ONE_OFF_EXPENSE', { amount: dollarsToCents(values.amount) }, id, createdAt);

/** A candidate `GIFT` — one outflow in its own month; `parsePlan` refuses a nil amount and a giver not in the file. */
export const giftEntry = (values: GiftFormValues, id: string, createdAt: string): unknown =>
  candidateEntry(values, 'GIFT', { amount: dollarsToCents(values.amount) }, id, createdAt);

export const GIFT_ENTRY_SUMMARY =
  'A gift over the gifting limits still counts against the Age Pension for five years.';

export const GIFT_ENTRY_NOTICE =
  'Enter the amount as it will be on the day. A couple shares one set of limits. Gifts from the five years' +
  ' before this plan starts count too: enter them with their real date.';

/**
 * A candidate `NON_SUPER_INVESTMENT` **buy**. `direction: 'buy'` is written here, not read off the
 * form as a string, because which of the two shapes is being built is decided by which function the
 * writer called — the discriminant and the field list cannot disagree.
 *
 * **A blank `incidentalCostsOfAcquisition` becomes `NaN` and is refused by name**, rather than
 * becoming `toCents(0)`. Zero brokerage is a claim about the trade that changes the parcel's cost
 * base and therefore the CGT on a future disposal, and it is not this module's claim to make
 * (ADR-0001, and the same reasoning as `daysAsTyped`). A user who paid nothing types `0`.
 */
export const nonSuperInvestmentBuyEntry = (
  values: NonSuperInvestmentBuyFormValues,
  id: string,
  createdAt: string,
): unknown =>
  candidateEntry(
    values,
    'NON_SUPER_INVESTMENT',
    {
      direction: 'buy',
      amount: dollarsToCents(values.amount),
      incidentalCostsOfAcquisition: dollarsToCents(values.incidentalCostsOfAcquisition),
    },
    id,
    createdAt,
  );

/**
 * A candidate `NON_SUPER_INVESTMENT` **sell**.
 *
 * ⚠️ **The two directions are two functions because they are two SHAPES** (`plan.ts`'s union, and
 * `parsePlan`'s branch on `direction`): a sell carrying `incidentalCostsOfAcquisition` is refused
 * at the door — *"carries \"incidentalCostsOfAcquisition\", which this build does not read"* — and
 * a buy without it is refused too. One flat builder with both fields optional would therefore
 * produce a plan the validator rejects on a field the user never filled in, which is a form with a
 * missing check even though the door holds. **There is no `NonSuperInvestmentFormValues` carrying
 * both, and adding one would re-open exactly that hole.**
 *
 * A blank `parcelSelection` omits the KEY, as a blank note does: it is optional (`parsePlan` reads
 * absence, and `projection.ts` falls back to `DEFAULT_PARCEL_SELECTION`), and `""` is not absence.
 */
export const nonSuperInvestmentSellEntry = (
  values: NonSuperInvestmentSellFormValues,
  id: string,
  createdAt: string,
): unknown =>
  candidateEntry(
    values,
    'NON_SUPER_INVESTMENT',
    {
      direction: 'sell',
      amount: dollarsToCents(values.amount),
      ...(values.parcelSelection.trim() === '' ? {} : { parcelSelection: values.parcelSelection.trim() }),
    },
    id,
    createdAt,
  );

/**
 * The plan with one more entry on the end. Append-only: nothing already in `entries` is touched.
 *
 * **It also names the entry in the ACTIVE Scenario, and it has to** (v2, P6-4). From version 2 the
 * `entries` array is a shared POOL and a Scenario says which of them it applies; an entry added to
 * the pool alone belongs to no Scenario and is therefore in no projection — a saved edit that
 * moves no figure and says nothing, which is the silent-difference failure this project is
 * organised against. So the id goes on the end of `activeScenarioId`'s own `entryIds`, which is
 * where an append-only journal puts a later decision.
 *
 * `id` is read off the candidate without checking it: the candidate is `unknown` here by design
 * (see `spendChangeEntry`), and `parsePlan` is the one judge of whether it is a string. An
 * unusable id becomes an `entryIds` member the door refuses by name, which is the correct outcome.
 */
export const planWithEntry = (plan: PlanFile, entry: unknown): unknown => {
  const id = typeof entry === 'object' && entry !== null ? (entry as Record<string, unknown>)['id'] : undefined;
  return {
    ...plan,
    entries: [...plan.entries, entry],
    scenarios: plan.scenarios.map((scenario) =>
      scenario.id === plan.activeScenarioId ? { ...scenario, entryIds: [...scenario.entryIds, id] } : scenario),
  };
};

/**
 * The plan with one entry switched on or off **IN ONE SCENARIO** — the entry stays in the array,
 * and the pool's own `enabled` is not touched.
 *
 * `enabled: false` IS the delete in this model (ADR-0002, and `projection.ts`'s `if (!entry.enabled)
 * continue`): a disabled entry is still in the Scenario, still ordered, still there to be switched
 * back on, and that reversibility is the only reason a "remove" control can be offered at all. A
 * `filter` here would look identical on screen and would destroy the record.
 *
 * ⚠️ **It writes `scenarios[…].entryOverrides`, NOT `entries[…].enabled`, and that is the fix this
 * function exists for (2026-09-22).** Entries are one shared pool and a Scenario holds ids, so
 * setting the flag on the entry switched the change off in every Scenario that listed it —
 * including the ones the user was about to compare against. The Scenario now states the on/off
 * itself and `resolvedEntryEnabled` reads it (`plan.ts`).
 *
 * **The override is DROPPED rather than written when it agrees with what the Scenario would inherit
 * anyway.** Switching a change back on in the Scenario that switched it off leaves a file that says
 * nothing about it, which is the state it was in before the click, so the file does not accumulate
 * a statement per click and a second copy of the entry's own flag never appears beside it. A
 * Scenario whose map empties loses the key entirely, so the file it round-trips to is the one it
 * came from.
 *
 * Two **refusals, not no-ops**: an id that is in no entry, and a scenario id the plan does not
 * hold. A toggle that silently changed nothing would leave the screen claiming a state the file
 * does not have. Bare `RangeError`s — a programming error in the writer, not a fact about the
 * user's file.
 */
export const planWithEntryOverride = (plan: PlanFile, scenarioId: string, id: string, enabled: boolean): unknown => {
  const entry = plan.entries.find((candidate) => candidate.id === id);
  if (entry === undefined) {
    throw new RangeError(`no entry with id "${id}" — a toggle must name an entry that is in the plan`);
  }
  const target = plan.scenarios.find((candidate) => candidate.id === scenarioId);
  if (target === undefined) {
    throw new RangeError(`no scenario with id "${scenarioId}" — a toggle must name a scenario that is in the plan`);
  }
  // What this entry would say here if this Scenario stated nothing about it: the inherited answer,
  // which is what decides between writing the override and dropping it.
  const withoutOwn = { ...target, entryOverrides: withoutKey(target.entryOverrides ?? {}, id) };
  const inherited = resolvedEntryEnabled(entry, withoutOwn, plan.scenarios);
  const overrides = inherited === enabled ? withoutOwn.entryOverrides : { ...withoutOwn.entryOverrides, [id]: enabled };
  return {
    ...plan,
    scenarios: plan.scenarios.map((scenario) =>
      scenario.id === scenarioId
        ? { ...scenario, ...(Object.keys(overrides).length === 0 ? { entryOverrides: undefined } : { entryOverrides: overrides }) }
        : scenario),
  };
};

/** One key removed from an override map, without mutating it. */
const withoutKey = (overrides: EntryOverrides, id: string): EntryOverrides =>
  Object.fromEntries(Object.entries(overrides).filter(([key]) => key !== id));

/**
 * **The plan with a different Scenario made active (P7-1).** The active Scenario is what the table
 * and the focused chart are drawn from, so this is a plan edit like any other and it goes through
 * the one door: the caller hands the result to `savePlan`, the file records which Scenario the
 * user is looking at, and a reload opens on the same one.
 *
 * An id that names no Scenario is a refusal rather than a no-op, on `planWithEntryOverride`'s
 * ground — and `parsePlan` would refuse the resulting file anyway, with a message about
 * `activeScenarioId` rather than about the click that caused it.
 */
export const planWithActiveScenario = (plan: PlanFile, id: string): unknown => {
  if (!plan.scenarios.some((scenario) => scenario.id === id)) {
    throw new RangeError(`no scenario with id "${id}" — the active scenario must be one the plan holds`);
  }
  return { ...plan, activeScenarioId: id };
};

/**
 * **The plan with a new scenario list.** The three pure functions in `scenarioList.ts` return a
 * list; this is how one gets back onto a plan, and it is the only route — there is no second
 * write path, and nothing here validates: `savePlan`'s door does that, as it does for an entry.
 */
export const planWithScenarios = (plan: PlanFile, scenarios: readonly Scenario[]): unknown => ({ ...plan, scenarios });

/**
 * **The plan with a Scenario deleted** — the list and `activeScenarioId` moved TOGETHER, which is
 * why this exists rather than two calls: `scenarioDeleted` decided both in one go, and a caller
 * that applied the list and kept the old active id would produce a file naming a Scenario that is
 * no longer in it.
 *
 * `entries` is spread through untouched, and that is the whole of "a deleted Scenario takes no
 * entry with it": the pool this returns is the pool it was given.
 */
export const planWithScenarioDeleted = (plan: PlanFile, deletion: ScenarioDeletion): unknown => ({
  ...plan,
  scenarios: deletion.scenarios,
  activeScenarioId: deletion.activeScenarioId,
});

// --- The base position: the Household and the Settings (P8-5) -------------------------------------

/**
 * **THE ONE CLOCK, AND WHY THE BALANCES CANNOT BE SAVED WITHOUT IT** (user ruling, 2026-09-19).
 *
 * `Settings.asAtDate` is *"Today, and the only one that exists"* (`plan.ts`): no `SuperInterest`
 * and no `Parcel` carries a valuation date of its own, and `project()` reports the stated position
 * as month 0 and starts growing it at month 1. So a user who types the balance off today's
 * statement while `asAtDate` still reads 2026-09-01 has that figure compounded forward from
 * 2026-09-01 — **growth that already happened, counted a second time, silently.** Nothing in the
 * engine can detect it: both figures are perfectly well-formed.
 *
 * The fix is structural rather than a warning. There is no builder that takes a balance, and no
 * builder that takes an as-at date: there is **one** builder that takes both, `planWithStatedPosition`,
 * and its `asAtDate` is a required member of the values object rather than an optional one. A
 * caller cannot express "this balance, and leave the date alone" — the mismatch is unconstructable
 * rather than merely discouraged. `planWithSettings` below is the other half of the same rule: it
 * carries `asAtDate` through from the plan and cannot write one, so the date has exactly one writer.
 *
 * A per-interest as-at date would be the other way to close this, and it is OUT OF SCOPE: it is a
 * change to `Household`, which is `core/`'s and the engine's, not this form's.
 */
export interface SuperInterestFormValues {
  /** One of `SUPER_PHASE_OPTIONS`, as selected. */
  readonly phase: string;
  /** The balance in DOLLARS as typed, stated as at the position's `asAtDate` and at no other date. */
  readonly balance: string;
  /**
   * **THE THREE FEE BOXES, AND A BLANK ONE OMITS ITS KEY** (P3-17 slice 1b).
   *
   * All three fields on `SuperInterest` are optional, and `projection.ts` reads absence as nil and
   * emits NOTHING for a nil component — no `MonthLine`, no note, no moved figure — so a plan
   * stating no fee is byte-identical to one written before the fields existed. A blank box that
   * wrote `0` would put three keys into every plan this form ever saves: the same forecast, a
   * different file, and the distinction between "this fund charges nothing" and "nobody has said"
   * gone for good. So blank is the ABSENT key here, and it is the one place on this form where a
   * blank is neither `NaN` nor a figure — see `statedFee`, which is the single expression of it.
   *
   * DOLLARS a year, as typed. The flat administration charge a statement quotes as an amount.
   */
  readonly administrationFeePerYear: string;
  /**
   * **A CAP ON THE PERCENTAGE ADMINISTRATION FEE, DOLLARS a year, in TODAY’S money** (P3-17 slice 3,
   * user-approved 2026-09-25). `administrationFeePerYear`'s own box, one row down: DOLLARS as typed,
   * blank omits the key exactly as the other three fee boxes do, and it is raised to each month's
   * price level the same way — see `household.ts`'s `statedAdministrationFeeCapPerYear` for the
   * ruling and the labelled simplification in its indexation. Shown beside the administration RATE
   * box because it caps that rate alone, never the dollar limb and never the investment fee.
   */
  readonly administrationFeeCapPerYear: string;
  /**
   * **A PERCENTAGE as typed — `0.15` is 0.15% a year (user ruling, 2026-09-25).** Until that ruling
   * this box took a DECIMAL fraction (`0.0035` for 0.35%), the one convention every other rate box on
   * this page still uses, and a user typing "0.15" meaning 0.15% landed a fee ten times too large — a
   * mistake worth its own box rather than a caveat, because it is a place a fee figure is quoted as a
   * PERCENTAGE on every statement this box is copied from. `percentAsFraction` converts what is typed
   * here to the fraction the plan file stores (`statedAdministrationFeeRate`, unchanged in the file,
   * so an existing plan loads exactly as it always did); `fractionAsPercent` is the inverse that fills
   * the box back in. Blank omits the key, exactly as it did as a decimal box.
   */
  readonly administrationFeeRate: string;
  /** A PERCENTAGE as typed, as `administrationFeeRate` above (2026-09-25). The charge on what the fund invests. */
  readonly investmentFeeRate: string;
  /**
   * **THE ACCOUNT-BASED PENSION PHASE'S OWN DOLLAR FEE — P3-17 slice 4, user-approved 2026-09-25.**
   * `administrationFeePerYear`'s own box, DOLLARS as typed, blank omits the key exactly as every
   * other fee box on this form does. **Blank does NOT mean nil here** — `household.ts`'s doc on
   * `statedPensionAdministrationFeePerYear` has the ruling: the accumulation figure carries on once
   * the account is a pension, so this box exists only to OVERRIDE it for a fund that charges
   * differently either side of retirement, which is Aware's own case (`~/.enough/verification/
   * P13-1c-aware-soa-extract.md`, p.15).
   */
  readonly pensionAdministrationFeePerYear: string;
  /** The pension phase's own cap, DOLLARS a year — `administrationFeeCapPerYear`'s pair. */
  readonly pensionAdministrationFeeCapPerYear: string;
  /** The pension phase's own percentage, typed as a PERCENTAGE — `administrationFeeRate`'s pair. */
  readonly pensionAdministrationFeeRate: string;
  /** P3-17a slice 1: today's death premium, DOLLARS a year; blank omits the key. */
  readonly deathPremiumPerYear: string;
  /** Today's TPD premium, DOLLARS a year; blank omits the key. */
  readonly tpdPremiumPerYear: string;
  /** One of `INSURANCE_COVER_KINDS`, or `''` for none chosen — never preselected. */
  readonly insuranceCoverKind: string;
  /** The fund's insurance administration fee, DOLLARS a year in today's money; blank omits the key. */
  readonly insuranceAdminFeePerYear: string;
  /** P3-17b: today's income protection premium, DOLLARS a year; blank omits the key. */
  readonly incomeProtectionPremiumPerYear: string;
  /** One of `INCOME_PROTECTION_BENEFIT_PERIODS`, or `''` for none chosen — never preselected. */
  readonly incomeProtectionBenefitPeriod: string;
  /** The age death cover ends, a whole number as typed; blank omits the key, which is 70. */
  readonly deathCoverEndsAtAge: string;
  /** The age TPD cover ends, as `deathCoverEndsAtAge`. */
  readonly tpdCoverEndsAtAge: string;
  /**
   * **THE TWO TRANSITION-TO-RETIREMENT BOXES (TTR build step 2).** Written only while `phase` is
   * `'ttr'` — see `ttrStreamBoxesShown`, which is both the panel's show/hide and the builder's
   * gate — and ignored otherwise, when `statedStreamSettings` is carried over from the plan.
   *
   * The day the stream started paying, `yyyy-mm-dd` as the date box gives it. Written to
   * `statedStreamSettings.commencementDay`. Read back from that key whatever the phase, because it
   * is the same stream's day: an account-based pension switched to `ttr` opens on its own day.
   */
  readonly ttrStartDate: string;
  /**
   * The yearly drawdown rate as a PERCENTAGE as typed — `6` is 6% — unlike every other rate on
   * this page, because the brief for this box asked for percent and 4–10 is how a fund quotes it.
   * Stored as the FRACTION `statedTtrDrawdownRate`. **Blank omits the key**, which the walk reads
   * as "pay the legal minimum" — `statedFee`'s blank rule, and for the same reason.
   */
  readonly ttrDrawdownRate: string;
  /**
   * **What this account does at retirement: one of `AT_RETIREMENT_OPTIONS`** (user ruling,
   * 2026-09-23). Written as `keepInAccumulationAtRetirement: true` when it says the account stays as
   * it is, and as nothing at all when it becomes a pension, which is what an absent key means. Shown
   * and written only while `phase` is not an account-based pension (`atRetirementBoxShown`).
   */
  readonly atRetirement: string;
}

/** One non-super parcel: the three fields every `Parcel` has, and its value just before 1 July 2027. */
export interface ParcelFormValues {
  readonly acquired: string;
  readonly costBase: string;
  readonly marketValue: string;
  /**
   * DOLLARS, as typed: `Parcel.valueJustBefore1July2027` (LR-1). Blank is absent. Shown and written
   * only while `valueJustBefore1July2027BoxShown` is true for the position's date, the one case the
   * door wants the figure stated: a plan starting after 1 July 2027 never walks through that day.
   */
  readonly valueJustBefore1July2027: string;
}

/**
 * One Person's editable fields. ~~**`statedPriorRetirementPhase` is NOT here and is not editable in
 * this build** — it is a transfer-balance-account fact whose refusals a form cannot explain
 * (`parsePlan`'s `PRIOR_RETIREMENT_PHASES`), so it is carried through untouched by position, which
 * is the only honest thing to do with a field the form cannot show.~~ **It is editable from
 * 2026-09-23, as `priorRetirementPhase`**: the switch at retirement reads it, and a Yes is what stops
 * the switch where the transfer balance cap left is unknowable.
 */
export interface PersonFormValues {
  readonly name: string;
  readonly dateOfBirth: string;
  /** DOLLARS per fortnight, as typed. **Blank is not zero**: it is `NaN`, and the door refuses it by name. */
  readonly employmentIncomePerFortnight: string;
  /** DOLLARS, as typed. The Work Bonus bank, which the means test draws down (P4-10). */
  readonly workBonusBalance: string;
  /**
   * P4-10a: the day the Work Bonus balance was last topped up to $4,000, as typed (`YYYY-MM-DD`).
   * Blank is not stated and writes no key; `parsePlan` judges a typed one.
   */
  readonly lastWorkBonusTopUp: string;
  readonly superInterests: readonly SuperInterestFormValues[];
  readonly parcels: readonly ParcelFormValues[];
  /**
   * **THE ITAA 1997 SUBDIV 293-B ELECTION, AS ONE CHOICE PER PERSON — register O84's residual
   * (iii), closed here (P6-11, 2026-09-20).** Until this field the election could be stated only by
   * hand-editing `plan.json`, so every plan built through the app took the Division 293 charge out
   * of cash, which is the FLATTERING direction: it leaves a means-test-exempt accumulation interest
   * standing and spends assessed Offset cash.
   *
   * It is the POSITION of the elected interest in this Person's `superInterests`, as a decimal
   * string, or **`NO_RELEASE_ELECTION` (the empty string) for "no election"** — which is a real and
   * correct answer and not an unanswered question (`core/division293Release.ts`). There is ONE of
   * these per Person and it holds ONE value, which is why the two shapes the door refuses cannot be
   * expressed here at all: two marked interests would need two fields, and a mark on a
   * retirement-phase interest is not among the positions `electableSuperInterests` offers.
   */
  readonly releaseAuthorityInterest: string;
  /**
   * **Which accumulation account this Person's employer pays into**, as a position in
   * `superInterests` (decimal string), or the empty string for "not chosen". Written as
   * `statedEmployerContributionDestination` ONLY while `employerPaysIntoShown` is true (register
   * O82): the same condition shows the select and lets it write, so a hidden select writes nothing.
   */
  readonly employerPaysInto: string;
  /**
   * **Has this Person had a retirement-phase pension before? One of `PRIOR_PENSION_OPTIONS`**, No
   * by default (user ruling, 2026-09-23). Yes is written as `statedPriorRetirementPhase:
   * 'startedRetirementPhaseBeforeTheForecast'`; No leaves an absent key absent.
   */
  readonly priorRetirementPhase: string;
  /**
   * **P3-4b slice 2 — the unused concessional cap myGov shows, DOLLARS as typed, keyed by financial
   * year** (`unusedCapYears`). Blank is NOT STATED — the year counts as fully used — and a blank box
   * writes nothing, `statedFee`'s rule. `Person.statedUnusedConcessionalCap` is the one writer.
   */
  readonly unusedConcessionalCap: Readonly<Record<string, string>>;
  /**
   * DOLLARS as typed: the Person's total super balance on the 30 June before the plan's first year.
   * Written only while `totalSuperBalanceAt30JuneBoxShown`; blank is not stated.
   */
  readonly totalSuperBalanceAt30June: string;
}

/**
 * **The whole base position, stated as at ONE date.** Every figure in here is a figure as at
 * `asAtDate`, which is the reason they travel together — see the header above.
 */
export interface StatedPositionFormValues {
  /** The one "today". REQUIRED: this is the field that makes a balance-only save unconstructable. */
  readonly asAtDate: string;
  /** One of `HOME_STATUS_OPTIONS`, as selected. */
  readonly homeStatus: string;
  /** DOLLARS, as typed. **Blank omits the KEY**, because `Household.openingOffsetBalance` is optional and "no offset account" is not "an offset account holding nil". */
  readonly openingOffsetBalance: string;
  /**
   * **The FIRST Person's share of the offset, for income tax, as a PERCENTAGE typed; the second owns
   * the rest** (`Household.offsetShares`, 2026-09-23). One box, because two shares that must add up
   * to 100 are one figure: a second box could only be typed to disagree with the first. Pre-filled
   * 50 for a couple whose plan states nothing, because that is what absence means; empty for a
   * single Person, who owns all of it and is asked nothing. Blank on a couple is `NaN`, and the door
   * refuses it by name.
   */
  readonly offsetSharePercent: string;
  /** DOLLARS in today's money, as typed. **Blank omits the KEY**: `Household.personalAssets` is optional and absent is nil. */
  readonly personalAssets: string;
  /**
   * **THE HOME LOAN, AS THREE BOXES (P3-16 slice 1) — and they stand or fall TOGETHER.**
   *
   * DOLLARS for the balance and the repayment, a DECIMAL FRACTION for the rate, all as typed.
   * `Household.mortgage` is one optional object holding three required figures, so unlike the fee
   * boxes these three cannot be omitted one at a time: a loan with no rate is not a loan.
   *
   * **All three empty writes NO `mortgage` key at all** — the household has no home loan, which is
   * the ordinary case and must re-write to a file stating none, key for key. **Any one of them
   * filled writes the key with all three figures**, so a half-filled loan reaches the door and is
   * refused there BY NAME, on the field the user left blank. Dropping what they typed because a
   * sibling box was empty would lose a stated fact silently, which is the failure this whole file
   * is written against.
   */
  readonly mortgageBalance: string;
  /** A decimal fraction a year — `0.061` is 6.1%. See `mortgageBalance`; the three travel together. */
  readonly mortgageInterestRate: string;
  /** DOLLARS a month, as typed. See `mortgageBalance`; the three travel together. */
  readonly mortgageRepayment: string;
  /** One or two. A third is refused by the door, which is where the rule lives. */
  readonly persons: readonly PersonFormValues[];
}

/** The forecast assumptions. **No `asAtDate`** — the position owns it, and it has one writer. */
export interface SettingsFormValues {
  readonly planningHorizonAge: string;
  /**
   * **THE CONTINGENCY FLOOR, IN DOLLARS OF TODAY'S MONEY, AS TYPED — and blank omits the KEY**
   * (P4-14). `statedFee`'s rule, for `statedFee`'s reason: `Settings.contingencyFloor` is optional,
   * absence is the only spelling of "I keep nothing back", and a blank box that wrote `0` would
   * write a figure the door refuses. It is the one box on this form that is money rather than a
   * rate, and the one figure in the plan file stated in today's money.
   */
  readonly contingencyFloor: string;
  /**
   * **WHAT THE INVESTMENTS PAY OUT, AS A DECIMAL SHARE OF THEIR VALUE, AS TYPED — and blank omits
   * the KEY** (P3-22h step 1). `statedFee`'s rule again: `Settings.investmentPayoutRate` is
   * optional, absence is the only spelling of "they pay me nothing", and a blank box writing `0`
   * would write a figure the door refuses.
   */
  readonly investmentPayoutRate: string;
  /**
   * **THE SHARE OF THAT PAYOUT THAT ALREADY HAS COMPANY TAX PAID ON IT, AS TYPED — blank omits the
   * KEY** (P3-22h step 1, register T43). Typed alone, with no payout rate beside it, the door
   * refuses it by name: a share of a payout nobody stated is a figure that would be saved and never
   * used. It is the USER'S figure and never a constant — see `Settings` for why no such constant
   * can exist.
   */
  readonly investmentPayoutFrankedShare: string;
  /**
   * **WHAT SHARE OF A SUPER FUND'S ANNUAL GROWTH COUNTS AS INCOME, AS TYPED — blank omits the KEY**
   * (P3-42, read live from step 2). `statedFee`'s rule again: `Settings.superIncomeYieldRate` is
   * optional, absence is the only spelling of "nothing counts as income", and a blank box writing
   * `0` would write a figure the door refuses.
   */
  readonly superIncomeYieldRate: string;
  /**
   * **HOW MUCH OF THE SUPER INCOME SHARE ALREADY HAS COMPANY TAX PAID ON IT, AS TYPED — blank
   * omits the KEY** (P3-42 step 3). `statedFee`'s rule again: optional, refused alone (no income
   * share to be a share of), and a blank box writing `0` would write a figure the door refuses.
   */
  readonly superIncomeYieldFrankedShare: string;
  /**
   * **WHAT THE RUNNING CASH EARNS, AS A DECIMAL, AS TYPED — blank omits the KEY** (2026-09-23).
   * Blank is NOT nil here: an absent `Settings.cashInterestRate` follows the CPI box, and a typed `0`
   * says the cash earns nothing. `statedFee`'s rule writes exactly that.
   */
  readonly cashInterestRate: string;
  readonly nominalReturn: string;
  readonly deemingLower: string;
  readonly deemingUpper: string;
  readonly cpi: string;
  readonly pblci: string;
  readonly awote: string;
  readonly mtawe: string;
}

type HomeStatus = PlanFile['household']['homeStatus'];
type SuperPhase = PlanFile['household']['persons'][number]['superInterests'][number]['phase'];

/**
 * The `HomeStatus` members, as options, each with the words the box SHOWS for it. Written as the
 * keys of a `Record<HomeStatus, …>` rather than as an array so that a member added to the union in
 * `household.ts` **breaks this build** instead of quietly going missing from the selector — an
 * array typed `readonly HomeStatus[]` is satisfied by a list with one member in it. `parsePlan` is
 * still the judge of what is accepted.
 *
 * The key is what `plan.json` stores and the label is what a person reads — `entryLabels.ts`'s
 * split, for the same reason (P6-13): the stored identifier never reaches the screen.
 */
export const HOME_STATUS_LABELS = {
  occupied: 'Own it and live in it',
  vacatedProtectedPersonRemains: 'Own it, moved out, a protected person still lives there',
  vacatedWithinTwoYearExemption: 'Own it, moved out, within the exemption period',
  vacatedBeyondTwoYearExemption: 'Own it, moved out, past the exemption period',
  noHome: 'Do not own a home',
  rentedOut: 'Own it, already renting it out',
  // P14-13c — a household already mid-way through the sale-proceeds exemption window on day 1.
  noHomeSaleProceedsExempt: 'Sold it, proceeds set aside for a new home (within the exemption period)',
} as const satisfies Record<HomeStatus, string>;
export const HOME_STATUS_OPTIONS: readonly HomeStatus[] = Object.keys(HOME_STATUS_LABELS) as readonly HomeStatus[];
export const HOME_STATUS_CHOICES: readonly LabelledOption<HomeStatus>[] =
  HOME_STATUS_OPTIONS.map((value) => ({ value, label: HOME_STATUS_LABELS[value] }));

/**
 * **"No election", as the one value that says it** — the value of the option a user picks to say
 * that the Division 293 charge is paid out of their own cash, which is the statutory default and a
 * decision rather than a blank. A constant because the renderer and the builder must mean the same
 * thing by it, and a second spelling of it would be a second fact.
 */
export const NO_RELEASE_ELECTION = '';

/**
 * **The interests a Division 293 release authority may be served on, by position — and the reason
 * the illegal choice is unofferable rather than refused.** A release out of a retirement-phase
 * stream is a COMMUTATION, which this build does not model: `parsePlan`'s
 * `checkReleaseAuthorityDestinations` refuses it at the door and `division293ReleaseDestination`
 * refuses it again in the walk. A form that offered it and then reported the refusal would be
 * offering a choice it knows is not available, so the retirement-phase positions are simply not in
 * this list.
 *
 * It reads the phase as the FORM currently holds it, not as the plan holds it, because the phase
 * box and the election box are on the same screen and the user may have just changed one.
 */
export const electableSuperInterests = (person: PersonFormValues): readonly number[] =>
  person.superInterests.flatMap((interest, index) => (interest.phase === 'accumulation' ? [index] : []));

/**
 * **The Person's election as a position, or `undefined` for "no election" — the one reading of the
 * box, used by the renderer and by the builder alike.**
 *
 * An election that names a position `electableSuperInterests` does not offer resolves to
 * `undefined`: that is reachable in one way only — the user marks an accumulation interest and then
 * changes that interest's phase — and the two answers to it are dropping the election or writing a
 * plan the door refuses. It is dropped, and the renderer redraws on a phase change so that the box
 * shows "no election" the moment it becomes one, rather than at the save.
 */
export const electedReleaseInterest = (person: PersonFormValues): number | undefined => {
  if (person.releaseAuthorityInterest.trim() === NO_RELEASE_ELECTION) return undefined;
  const position = Number(person.releaseAuthorityInterest.trim());
  return electableSuperInterests(person).includes(position) ? position : undefined;
};

/**
 * **Whether the "employer pays into" select is on the page, and the ONE condition that also lets it
 * write** (register O82, like the 1 Jul 2027 box): the Person has a salary and two or more accumulation
 * accounts. With one account the door's default already names it, and without a salary no employer
 * pays anywhere, so nothing is asked and nothing is written.
 */
/**
 * Shown for two or more accumulation accounts, WITH OR WITHOUT a salary today. A Person with no
 * salary now can go back to work later in the walk (retire flow S3), and the O82 check then needs
 * the nomination; gating on today's salary would drop it on every save in between, and the select
 * is its only writer. `_salaryText` is kept so the callers' shape does not move. (LIZ, 2026-09-29.)
 */
export const employerPaysIntoShown = (_salaryText: string, accounts: readonly { readonly phase: string }[]): boolean =>
  accounts.filter((account) => account.phase === 'accumulation').length >= 2;

/** One accumulation account as the "employer pays into" list names it, as the Super account rows number them. */
export const employerPaysIntoOptionLabel = (position: number): string => `Super account ${position + 1} (accumulation)`;

/** The select's blank option: the plan names no account, and saving it is refused by name (O82). */
export const EMPLOYER_PAYS_INTO_UNCHOSEN_LABEL = 'Choose an account';

/** The three `SuperInterest` phases and what the box shows for each, on the same ground as `HOME_STATUS_LABELS`. */
export const SUPER_PHASE_LABELS = {
  accumulation: 'Still building up (accumulation)',
  accountBasedPension: 'Paying you an income (account-based pension)',
  ttr: 'Paying you while you still work (transition to retirement pension)',
} as const satisfies Record<SuperPhase, string>;
export const SUPER_PHASE_OPTIONS: readonly SuperPhase[] = Object.keys(SUPER_PHASE_LABELS) as readonly SuperPhase[];
export const SUPER_PHASE_CHOICES: readonly LabelledOption<SuperPhase>[] =
  SUPER_PHASE_OPTIONS.map((value) => ({ value, label: SUPER_PHASE_LABELS[value] }));

/**
 * **Whole cents → the dollars text a box is filled with. The exact inverse of `dollarsToCents`,
 * and the two are asserted against each other as a round trip** (`test/app-settings-panel.test.mjs`).
 *
 * Not `formatCents`, and the difference matters: `formatCents` writes a figure to be READ
 * (`$412,000.00`) and this writes one to be EDITED and typed back. Integer arithmetic only — the
 * whole dollars and the remainder are taken separately, so no float is constructed on the way out
 * any more than one is on the way in (ADR-0001).
 */
export const centsToDollars = (cents: number): string => {
  const abs = Math.abs(cents);
  return `${cents < 0 ? '-' : ''}${Math.trunc(abs / 100)}.${String(abs % 100).padStart(2, '0')}`;
};

/**
 * **A rate as a person typed it → a number, WITHOUT refusing.** The third sibling of
 * `dollarsToCents` and `daysAsTyped`, and it exists for `daysAsTyped`'s exact reason, restated
 * because the consequence is different here: `Number('')` is `0`, and **0 is a real rate** — a
 * nil `nominalReturn` is a portfolio that never grows and a nil `cpi` is a world without
 * inflation. Either would be a consequential forecast input chosen by an empty box. So blank is
 * `NaN`, which `parsePlan` refuses by name as not a finite number.
 */
export const rateAsTyped = (text: string): number => (text.trim() === '' ? Number.NaN : Number(text.trim()));

/**
 * **A fee box → its key, or NOTHING AT ALL. The one expression of "blank omits the key".**
 *
 * Written once and called three times rather than spelled out per field, because the rule is one
 * fact about all three: every fee field on `SuperInterest` is optional, absence is nil, and nil
 * emits nothing from the walk (`projection.ts`). Three copies of a `trim() === ''` test is three
 * chances for one of them to drift into writing `0`, which is the mistake this slice exists not to
 * make — a plan stating no fee must re-write to a file stating no fee, key for key.
 *
 * It does not judge the figure: `dollarsToCents` and `rateAsTyped` convert without refusing and
 * `parsePlan` is the one judge, exactly as for every other box on this form. `negativeFeeObjection`
 * below is the single exception and it is a form-level courtesy, not a second door.
 */
const statedFee = (key: string, typed: string, convert: (text: string) => number): Record<string, number> =>
  (typed.trim() === '' ? {} : { [key]: convert(typed) });

/** The inverse: a stated fee → the box it is typed back into, and an ABSENT one → an empty box. */
const feeBox = (stated: number | undefined, show: (value: number) => string): string =>
  (stated === undefined ? '' : show(stated));

/**
 * **Whether an interest in this phase has the two transition-to-retirement boxes.** One expression
 * for two readers: the panel hides the boxes when this is false, and `planWithStatedPosition` does
 * not read them when it is false, so a box nobody can see can never write anything.
 */
export const ttrStreamBoxesShown = (phase: string): boolean => phase === 'ttr';

/** P3-17a slice 1: the cover-type box. The empty first option is "not chosen", never a default. */
const INSURANCE_COVER_LABELS = {
  fixed: 'Fixed cover (the same amount every year)',
  'age-based': 'Age-based cover (the fund’s age scale)',
} as const satisfies Record<InsuranceCoverKind, string>;
export const INSURANCE_COVER_CHOICES: readonly LabelledOption<string>[] = [
  { value: '', label: '—' },
  ...INSURANCE_COVER_KINDS.map((value) => ({ value, label: INSURANCE_COVER_LABELS[value] })),
];

/** P3-17b: the income protection benefit-period box. The empty first option is "not chosen", never a default. */
const INCOME_PROTECTION_BENEFIT_PERIOD_LABELS = {
  '2-years': 'Paid for up to 2 years',
  '5-years': 'Paid for up to 5 years',
  'to-65': 'Paid up to age 65',
} as const satisfies Record<IncomeProtectionBenefitPeriod, string>;
export const INCOME_PROTECTION_BENEFIT_PERIOD_CHOICES: readonly LabelledOption<string>[] = [
  { value: '', label: '—' },
  ...INCOME_PROTECTION_BENEFIT_PERIODS.map((value) => ({ value, label: INCOME_PROTECTION_BENEFIT_PERIOD_LABELS[value] })),
];

/** The two answers to "what does this account do at retirement", as the box shows them. */
export const AT_RETIREMENT_SWITCH = 'Becomes a pension';
export const AT_RETIREMENT_KEEP = 'Stays as it is';
export const AT_RETIREMENT_OPTIONS: readonly string[] = [AT_RETIREMENT_SWITCH, AT_RETIREMENT_KEEP];
/** Already plain words, so each option shows exactly what it stores. */
export const AT_RETIREMENT_CHOICES: readonly LabelledOption<string>[] = AT_RETIREMENT_OPTIONS.map((value) => ({ value, label: value }));

/** An account-based pension has nothing to switch at retirement, so it has no box. */
export const atRetirementBoxShown = (phase: string): boolean => phase !== 'accountBasedPension';

/**
 * **Whether a parcel has the "worth just before 1 July 2027" box.** One expression for two readers,
 * `ttrStreamBoxesShown`'s rule: the panel hides the box when this is false, and
 * `planWithStatedPosition` does not write it when it is false. `parsePlan` wants the figure exactly
 * when the plan starts after 1 July 2027 (before that the forecast takes it itself, and a stated one
 * is refused), so a hidden box can never write a figure the door would refuse.
 */
export const valueJustBefore1July2027BoxShown = (asAtDate: string): boolean => asAtDate > CGT_REFORM_START;

/** `financialYearContaining` for a date as typed: `undefined` rather than a throw for a half-typed one. */
const firstYearOf = (asAtDate: string): FinancialYear | undefined => {
  try {
    return financialYearContaining(asAtDate as Parameters<typeof financialYearContaining>[0]);
  } catch {
    return undefined;
  }
};

/**
 * **P3-4b slice 2 — the years an unused concessional cap can be typed for: the five before the
 * plan's first financial year**, earliest first. The window `parsePlan` checks, read off the same
 * register figure, so the form offers exactly the years the door accepts.
 */
export const unusedCapYears = (asAtDate: string): readonly FinancialYear[] => {
  const first = firstYearOf(asAtDate);
  return first === undefined ? [] : financialYearsBefore(first, SUPERANNUATION.carryForward.lookBackYears.value);
};

/**
 * **Whether the "Total super balance on 30 June" box is shown, and so whether it writes** —
 * `valueJustBefore1July2027BoxShown`'s rule. Only for a plan NOT dated 1 July: a 1 July plan's own
 * balances are that 30 June's, and the door refuses a second figure there.
 */
export const totalSuperBalanceAt30JuneBoxShown = (asAtDate: string): boolean => {
  const first = firstYearOf(asAtDate);
  return first !== undefined && asAtDate !== startOfFinancialYear(first);
};

/** The calendar year of the 30 June that box asks about: the one just before the plan's first year. */
export const thirtyJuneYear = (asAtDate: string): number | undefined => {
  const first = firstYearOf(asAtDate);
  return first === undefined ? undefined : financialYearStartYear(first);
};

/** The two answers to "has this Person had a retirement-phase pension before". No is the default. */
export const PRIOR_PENSION_NO = 'No';
export const PRIOR_PENSION_YES = 'Yes';
export const PRIOR_PENSION_OPTIONS: readonly string[] = [PRIOR_PENSION_NO, PRIOR_PENSION_YES];
/** Already plain words, so each option shows exactly what it stores. */
export const PRIOR_PENSION_CHOICES: readonly LabelledOption<string>[] = PRIOR_PENSION_OPTIONS.map((value) => ({ value, label: value }));

/**
 * The at-retirement box → its key. A held value that says the same thing is kept as held, so a
 * plan re-writes key for key; otherwise "stays as it is" is `true` and "becomes a pension" is absent.
 */
const keptAtRetirement = (interest: SuperInterestFormValues, held: boolean | undefined): Record<string, boolean> => {
  if (!atRetirementBoxShown(interest.phase)) return {};
  const keep = interest.atRetirement === AT_RETIREMENT_KEEP;
  if (held !== undefined && held === keep) return { keepInAccumulationAtRetirement: held };
  return keep ? { keepInAccumulationAtRetirement: true } : {};
};

/**
 * The prior-pension box → `statedPriorRetirementPhase`. Yes states the pension; No leaves an absent
 * key absent and turns a held Yes into the stated No. A form with no such box carries the held key.
 */
const priorRetirementPhase = (person: PersonFormValues, held: StatedPriorRetirementPhase | undefined): Record<string, StatedPriorRetirementPhase> => {
  if (person.priorRetirementPhase === PRIOR_PENSION_YES) return { statedPriorRetirementPhase: 'startedRetirementPhaseBeforeTheForecast' };
  if (held === undefined) return {};
  if (person.priorRetirementPhase === PRIOR_PENSION_NO && held === 'startedRetirementPhaseBeforeTheForecast') {
    return { statedPriorRetirementPhase: 'neverARetirementPhaseRecipientBeforeTheForecast' };
  }
  return { statedPriorRetirementPhase: held };
};

/**
 * **A percentage as typed → the fraction the plan file holds. Blank is `NaN`, as `rateAsTyped`.**
 *
 * `toPrecision(12)` is `fractionAsPercent`'s own device, run in the other direction, and for the
 * same reason: `0.35 / 100` is `0.0034999999999999996` in floating point, not `0.0035`, so the file
 * would hold a fraction one bit off the figure the user typed — a residue this build must not write
 * (ADR-0001). Twelve SIGNIFICANT digits is far beyond any fee this box will ever see (a fee quoted
 * to four decimal places of a percent needs six of a fraction) and is the same bound the inverse
 * conversion already uses, so a value survives box → file → box with nothing left to round away.
 */
export const percentAsFraction = (typed: string): number => Number((rateAsTyped(typed) / 100).toPrecision(12));

/**
 * The inverse: a fraction → the percentage a box shows. `toPrecision(12)` is what makes the round
 * trip exact: `0.07 * 100` is `7.000000000000001` in floating point and must come back as `7`.
 */
export const fractionAsPercent = (fraction: number): string => String(Number((fraction * 100).toPrecision(12)));

/** The door's two rate bounds as the percentages the box is typed in: `['4', '10']`. */
export const TTR_RATE_RANGE_PERCENT = [fractionAsPercent(TTR_RATE_FLOOR), fractionAsPercent(TTR_RATE_CEILING)] as const;

/** What each transition-to-retirement box says when it cannot be saved. Absent key: nothing to say. */
export interface TtrBoxObjections {
  readonly ttrStartDate?: string;
  readonly ttrDrawdownRate?: string;
}

/**
 * **The two TTR boxes, judged on the form rather than at the door** — `negativeFeeObjection`'s
 * courtesy, and for its reason: the door's sentence names `statedStreamSettings.commencementDay`
 * and a fraction, which is right for a hand-edited file and wrong beside a box. The range is the
 * door's own two figures, imported, so the form cannot let through a rate the door refuses or
 * refuse one it takes. Nothing is said about an interest that is not in the `ttr` phase.
 */
export const ttrBoxObjections = (interest: SuperInterestFormValues): TtrBoxObjections => {
  if (!ttrStreamBoxesShown(interest.phase)) return {};
  const fraction = percentAsFraction(interest.ttrDrawdownRate);
  const rateOutOfRange = interest.ttrDrawdownRate.trim() !== '' && !(fraction >= TTR_RATE_FLOOR && fraction <= TTR_RATE_CEILING);
  return {
    ...(interest.ttrStartDate.trim() === ''
      ? { ttrStartDate: 'Type the date this income stream started paying you. Each year’s payment is worked out from that date, so it cannot be left empty.' }
      : {}),
    ...(rateOutOfRange
      ? {
          ttrDrawdownRate: `A transition to retirement income stream pays between ${TTR_RATE_RANGE_PERCENT[0]}% and` +
            ` ${TTR_RATE_RANGE_PERCENT[1]}% of its balance each year. Type a number in that range, such as 6 for 6%,` +
            ' or leave the box empty to be paid the legal minimum.',
        }
      : {}),
  };
};

/**
 * **A salaried Person moving their only accumulation account to TTR OR an account-based pension, said
 * beside the phase box.** (Widened from TTR alone on 2026-09-23: the walk refuses both the same way.) The
 * door accepts the file and the WALK refuses it (`projection.ts`'s `superGuaranteeDestination`): the
 * employer's Superannuation Guarantee has no accumulation account to be paid into, and a pension
 * account is closed to contributions. The walk's sentence names `superInterests` and is right for a
 * hand-edited file; this is the same rule, asked of the boxes as typed, in words for this page.
 * Said on each non-accumulation interest of a Person with a salary above nil and no accumulation interest.
 */
export const EMPLOYER_ACCOUNT_NEEDED =
  'Your employer’s super needs an accumulation account to go into. Add one before switching this account to TTR.';
export const EMPLOYER_ACCOUNT_NEEDED_PENSION =
  'Your employer’s super needs an accumulation account to go into. Add one before switching this account to an account-based pension.';

export const employerAccountObjection = (person: PersonFormValues, index: number): string | undefined => {
  const phase = person.superInterests[index]?.phase;
  if (phase === undefined || phase === 'accumulation') return undefined;
  if (dollarsToCents(person.employmentIncomePerFortnight) <= 0) return undefined;
  if (person.superInterests.some((interest) => interest.phase === 'accumulation')) return undefined;
  return phase === 'ttr' ? EMPLOYER_ACCOUNT_NEEDED : EMPLOYER_ACCOUNT_NEEDED_PENSION;
};

/**
 * **`statedStreamSettings` for one interest: the two boxes written in, and nothing else dropped.**
 *
 * For a `ttr` interest the held settings are spread FIRST and the two boxes laid over them, so the
 * conversion day, notification day, Schedule 1 item and withdrawal characterisation all survive a
 * save. The held rate is taken out before the spread because the rate box is its one writer: an
 * emptied box must remove the rate, not leave the old one standing.
 *
 * For any other phase the held settings are carried as before, less the rate — the door refuses a
 * rate on an interest that is not a TTR, so a TTR switched to an account-based pension would
 * otherwise be unsaveable with no box on screen that could fix it.
 */
const streamSettings = (interest: SuperInterestFormValues, held: StatedStreamSettings | undefined): Record<string, unknown> => {
  const { statedTtrDrawdownRate: _heldRate, ...kept } = held ?? {};
  if (ttrStreamBoxesShown(interest.phase)) {
    return {
      statedStreamSettings: {
        ...kept,
        commencementDay: interest.ttrStartDate,
        ...(interest.ttrDrawdownRate.trim() === '' ? {} : { statedTtrDrawdownRate: percentAsFraction(interest.ttrDrawdownRate) }),
      },
    };
  }
  return held === undefined ? {} : { statedStreamSettings: kept };
};

/**
 * **Two fee-form courtesies checked before a save is attempted, on the same ground** (P3-17 slice
 * 1b, widened for the cap in slice 3, 2026-09-25).
 *
 * `parsePlan` already refuses both by name and by path, and that refusal is the authority — this
 * changes nothing about it and adds no new rule. What it adds is the sentence a person can act on
 * *before* a save is attempted: the door's message names a field and a path
 * (`household.persons[0].superInterests[1].statedInvestmentFeeRate`), which is the right thing for a
 * hand-edited file and the wrong thing for somebody looking at a box they just typed into.
 *
 * **1. A fee below nil.** Judges the SIGN and nothing else. `NaN` — a box holding "half a percent"
 * — is not negative and falls straight through to the door, which says what it is far better than
 * this could.
 *
 * **2. A cap with no rate to cap.** `statedAdministrationFeeCapPerYear` only ever limits
 * `statedAdministrationFeeRate` (`household.ts`'s own doc on the field), so a cap box holding a
 * figure while the rate box beside it is empty is refused at the door — this says so before the
 * save, naming the account rather than a path a box-typing user did not write.
 *
 * Returns `undefined` when there is nothing to say, so a caller reads it as "may I save".
 */
export const negativeFeeObjection = (values: StatedPositionFormValues): string | undefined => {
  for (const [index, person] of values.persons.entries()) {
    const who = person.name.trim() === '' ? `person ${index + 1}` : person.name.trim();
    for (const [position, interest] of person.superInterests.entries()) {
      const charged: readonly [string, number][] = [
        ['administration fee in dollars a year', dollarsToCents(interest.administrationFeePerYear) / 100],
        ['administration fee cap in dollars a year', dollarsToCents(interest.administrationFeeCapPerYear) / 100],
        ['administration fee rate', rateAsTyped(interest.administrationFeeRate)],
        ['investment fee rate', rateAsTyped(interest.investmentFeeRate)],
        // **P3-17 slice 4 (2026-09-25).** The pension-phase set, checked on the same three grounds.
        ['pension administration fee in dollars a year', dollarsToCents(interest.pensionAdministrationFeePerYear) / 100],
        ['pension administration fee cap in dollars a year', dollarsToCents(interest.pensionAdministrationFeeCapPerYear) / 100],
        ['pension administration fee rate', rateAsTyped(interest.pensionAdministrationFeeRate)],
        ['death insurance premium in dollars a year', dollarsToCents(interest.deathPremiumPerYear) / 100],
        ['TPD insurance premium in dollars a year', dollarsToCents(interest.tpdPremiumPerYear) / 100],
        ['insurance administration fee in dollars a year', dollarsToCents(interest.insuranceAdminFeePerYear) / 100],
        ['income protection premium in dollars a year', dollarsToCents(interest.incomeProtectionPremiumPerYear) / 100],
      ];
      for (const [what, figure] of charged) {
        if (figure < 0) {
          return `A fee is a charge, so it cannot be less than nothing. Super account ${position + 1} for ${who}` +
            ` states ${figure} as its ${what}. Type the charge as a positive figure, or leave the box empty if the` +
            ' fund does not charge it.';
        }
      }
      if (interest.administrationFeeCapPerYear.trim() !== '' && interest.administrationFeeRate.trim() === '') {
        return `A cap limits the administration fee’s percentage, so it needs that percentage typed too. Super account` +
          ` ${position + 1} for ${who} states a cap with no percentage. Type the percentage as well, or leave the cap` +
          ' box empty if the fund charges no percentage fee.';
      }
      if (interest.pensionAdministrationFeeCapPerYear.trim() !== '' && interest.pensionAdministrationFeeRate.trim() === '') {
        return `A cap limits the administration fee’s percentage, so it needs that percentage typed too. Super account` +
          ` ${position + 1} for ${who} states an after-retirement cap with no after-retirement percentage. Type the` +
          ' percentage as well, or leave the cap box empty if the fund charges no percentage fee after retirement.';
      }
      if ((interest.deathPremiumPerYear.trim() !== '' || interest.tpdPremiumPerYear.trim() !== '') && interest.insuranceCoverKind === '') {
        return `An insurance premium changes with age differently for fixed and age-based cover. Super account` +
          ` ${position + 1} for ${who} states a premium with no cover type. Choose fixed or age-based, as the statement shows.`;
      }
      if ((interest.incomeProtectionPremiumPerYear.trim() !== '') !== (interest.incomeProtectionBenefitPeriod !== '')) {
        return `An income protection premium changes with age differently for each benefit period, so the two are given` +
          ` together. Super account ${position + 1} for ${who} states one without the other. Type the premium and` +
          ' choose how long the benefit is paid, as the statement shows, or leave both empty.';
      }
    }
  }
  return undefined;
};

/**
 * **The plan with the base position restated, AND the date it is stated as at, in one object.**
 *
 * Four fields travel through untouched because the form cannot show them and dropping them would
 * silently change the forecast:
 *
 *   * `SuperInterest.statedStreamSettings` — the commencement day a Schedule 7 minimum is keyed
 *     off, plus the TRIS conversion and notification days. Matched **by position**: the nth
 *     interest of the nth Person keeps the nth interest's settings, so an interest ADDED at the
 *     end inherits nothing, which is correct — it is a new interest and nobody has stated its
 *     commencement day. **Since TTR build step 2 a `ttr` interest's day and rate are WRITTEN from
 *     the two boxes over the carried object** — see `streamSettings` — and the rest is carried.
 *   * `SuperInterest.statedEmployerContributionDestination` (P6-8 brief 3, chunk 2a), matched by
 *     interest position for the same reason and carried for a sharper one: a Person who nominated
 *     the fund their employer pays into, and then edited a balance, would have the nomination
 *     dropped by a rebuild that did not carry it — and the file would still parse, still project
 *     and still draw a chart, with the destination silently back to undetermined.
 *   * ~~`SuperInterest.statedReleaseAuthorityDestination` (register O84, P6-9 M1), matched the same
 *     way and for the sharpest reason of the four: PRESENCE IS THE ELECTION there, so dropping the
 *     key does not leave a question unanswered — it silently ANSWERS it.~~ **SUPERSEDED 2026-09-20
 *     (P6-11, O84 residual (iii)): it is no longer carried by position, because the form STATES it
 *     now.** `PersonFormValues.releaseAuthorityInterest` is the box, and this builder writes the
 *     key from that box and from nothing else. The hazard the struck sentence describes is not
 *     gone, it has MOVED: a rebuild that dropped the box would answer the election just as
 *     silently, which is why the round trip through `positionFormValues` and back is asserted
 *     twice over in `test/app-settings-panel.test.mjs`. **Carrying it by position as well would be
 *     WORSE than either**: the carried key and the box would be two writers of one fact, and
 *     clearing the box would leave the charge coming out of the fund anyway.
 *   * ~~`Person.statedPriorRetirementPhase`, matched by Person position, for the same reason.~~
 *     **Written from its own box from 2026-09-23** (`priorRetirementPhase`), which keeps the held key
 *     wherever the box says the same thing.
 *   * `SuperInterest.keepInAccumulationAtRetirement` is written from the at-retirement box, not
 *     carried (`keptAtRetirement`).
 *
 * ⚠️ The pairing rule this function exists for is in the header on `SuperInterestFormValues`: it
 * takes the balances and the date TOGETHER, and there is no second function that takes either one
 * alone. Nothing here validates — `savePlan`'s door does, as it does for an entry.
 */
export const planWithStatedPosition = (plan: PlanFile, values: StatedPositionFormValues): unknown => ({
  ...plan,
  settings: { ...plan.settings, asAtDate: values.asAtDate },
  household: {
    persons: values.persons.map((person, index) => {
      const held = plan.household.persons[index];
      const elected = electedReleaseInterest(person);
      return {
        name: person.name,
        dateOfBirth: person.dateOfBirth,
        superInterests: person.superInterests.map((interest, position) => {
          const heldInterest = held?.superInterests[position];
          const heldSettings = heldInterest?.statedStreamSettings;
          const employerPays = employerPaysIntoShown(person.employmentIncomePerFortnight, person.superInterests)
            && person.employerPaysInto.trim() === String(position);
          return {
            phase: interest.phase,
            balance: dollarsToCents(interest.balance),
            ...streamSettings(interest, heldSettings),
            // One writer: the select, and only while it is shown (`employerPaysIntoShown`).
            ...(employerPays ? { statedEmployerContributionDestination: 'superannuationGuarantee' } : {}),
            // **P3-17 slice 1b — THE THREE FEES ARE STATED ON THE FORM, and the carry-by-position
            // slice 1 used is GONE.** It was there because no box stated a fee: a user who
            // hand-edited one into their plan and then saved a balance here would have had all
            // three keys dropped, and the file would still parse, still project and still draw a
            // chart with the fund silently free of charge. The box closes that, and keeping the
            // carry AS WELL would be worse than either — the carried key and the box would be two
            // writers of one fact, so clearing a box would leave the fee being charged anyway, the
            // user's own instruction ignored in the flattering direction. That is the same ruling
            // the Division 293 election is under, three lines below. One writer: the box.
            ...statedFee('statedAdministrationFeePerYear', interest.administrationFeePerYear, dollarsToCents),
            // **P3-17 slice 3 (2026-09-25).** DOLLARS, exactly like the flat fee box above.
            ...statedFee('statedAdministrationFeeCapPerYear', interest.administrationFeeCapPerYear, dollarsToCents),
            // **PERCENT AS TYPED, converted at this one boundary (user ruling, 2026-09-25).** The
            // box takes `0.15` for 0.15% a year; `percentAsFraction` is what turns that into the
            // fraction the file has always stored, so a plan written before this ruling loads and
            // re-saves through the SAME field with no format change to the file at all.
            ...statedFee('statedAdministrationFeeRate', interest.administrationFeeRate, percentAsFraction),
            ...statedFee('statedInvestmentFeeRate', interest.investmentFeeRate, percentAsFraction),
            // **P3-17 slice 4 (2026-09-25).** The account-based pension phase's own fee set, on the
            // same one-writer ground as the four above: the box is the only writer, and clearing it
            // must drop the key rather than leave a stale override standing.
            ...statedFee('statedPensionAdministrationFeePerYear', interest.pensionAdministrationFeePerYear, dollarsToCents),
            ...statedFee('statedPensionAdministrationFeeCapPerYear', interest.pensionAdministrationFeeCapPerYear, dollarsToCents),
            ...statedFee('statedPensionAdministrationFeeRate', interest.pensionAdministrationFeeRate, percentAsFraction),
            // P3-17a slice 1: insurance, one writer per key; an unchosen kind writes nothing.
            ...statedFee('statedDeathPremiumPerYear', interest.deathPremiumPerYear, dollarsToCents),
            ...statedFee('statedTpdPremiumPerYear', interest.tpdPremiumPerYear, dollarsToCents),
            ...(interest.insuranceCoverKind === '' ? {} : { statedInsuranceCoverKind: interest.insuranceCoverKind }),
            ...statedFee('statedInsuranceAdminFeePerYear', interest.insuranceAdminFeePerYear, dollarsToCents),
            // P3-17b: income protection, the same one writer per key.
            ...statedFee('statedIncomeProtectionPremiumPerYear', interest.incomeProtectionPremiumPerYear, dollarsToCents),
            ...(interest.incomeProtectionBenefitPeriod === '' ? {} : { statedIncomeProtectionBenefitPeriod: interest.incomeProtectionBenefitPeriod }),
            // The age each cover ends: blank is 70, and `parsePlan` judges the figure.
            ...statedFee('statedDeathCoverEndsAtAge', interest.deathCoverEndsAtAge, (text) => Number(text.trim())),
            ...statedFee('statedTpdCoverEndsAtAge', interest.tpdCoverEndsAtAge, (text) => Number(text.trim())),
            // **THE KEY IS ABSENT, NEVER PRESENT AND UNDEFINED**, because presence IS the election:
            // the door reads the key and `division293ReleaseDestination` filters on its value, and
            // `JSON.stringify` drops an undefined-valued key on the way to disk, so a plan whose
            // election was cleared must not carry the key at all rather than carry an empty one.
            ...(elected === position ? { statedReleaseAuthorityDestination: 'division293' } : {}),
            ...keptAtRetirement(interest, heldInterest?.keepInAccumulationAtRetirement),
          };
        }),
        parcels: person.parcels.map((parcel) => ({
          acquired: parcel.acquired,
          costBase: dollarsToCents(parcel.costBase),
          marketValue: dollarsToCents(parcel.marketValue),
          // One writer, the box. A blank one shown is left out, and the door refuses it by name.
          ...(valueJustBefore1July2027BoxShown(values.asAtDate)
            ? statedFee('valueJustBefore1July2027', parcel.valueJustBefore1July2027, dollarsToCents)
            : {}),
        })),
        employmentIncomePerFortnight: dollarsToCents(person.employmentIncomePerFortnight),
        workBonusBalance: dollarsToCents(person.workBonusBalance),
        ...(person.lastWorkBonusTopUp.trim() === '' ? {} : { statedLastWorkBonusTopUp: person.lastWorkBonusTopUp.trim() }),
        ...priorRetirementPhase(person, held?.statedPriorRetirementPhase),
        // P3-4b slice 2: one writer each, the boxes. Only typed years are written; none is no key.
        ...statedUnusedCap(person.unusedConcessionalCap),
        ...(totalSuperBalanceAt30JuneBoxShown(values.asAtDate)
          ? statedFee('statedTotalSuperBalanceAt30June', person.totalSuperBalanceAt30June, dollarsToCents)
          : {}),
      };
    }),
    homeStatus: values.homeStatus,
    ...(values.openingOffsetBalance.trim() === '' ? {} : { openingOffsetBalance: dollarsToCents(values.openingOffsetBalance) }),
    ...statedOffsetShares(plan, values),
    ...(values.personalAssets.trim() === '' ? {} : { personalAssets: dollarsToCents(values.personalAssets) }),
    // **The three loan boxes, written as ONE key or not at all** — see `mortgageBalance` on
    // `StatedPositionFormValues` for why they cannot be omitted one at a time. Nothing is judged
    // here: a blank box among filled ones converts to `NaN`, the key is written anyway, and
    // `parsePlan` refuses it by field and by path. That is this file's standing rule — one judge,
    // and it is the door.
    ...statedMortgage(values),
  },
});

/** The unused-cap boxes → `statedUnusedConcessionalCap`, or no key when every box is blank. */
const statedUnusedCap = (boxes: Readonly<Record<string, string>>): Record<string, unknown> => {
  const typed = Object.entries(boxes).filter(([, text]) => text.trim() !== '');
  return typed.length === 0 ? {} : { statedUnusedConcessionalCap: Object.fromEntries(typed.map(([year, text]) => [year, dollarsToCents(text)])) };
};

/**
 * **A couple's offset share box → `offsetShares`, or nothing at all.** A single Person owns the
 * whole offset and has no box. A couple's box is written as two fractions whenever the plan already
 * stated shares or the box says anything but 50 — so a plan that never stated them re-writes to a
 * file that still does not, key for key, and an equal split typed back over a stated one is kept as
 * stated. Nothing is judged here: a share outside 0 to 100 goes to the door as typed.
 */
const statedOffsetShares = (plan: PlanFile, values: StatedPositionFormValues): Record<string, unknown> => {
  if (values.persons.length !== 2) return {};
  const first = rateAsTyped(values.offsetSharePercent);
  if (plan.household.offsetShares === undefined && first === 50) return {};
  // Out of the percentage, not `1 − share`: `(100 − 30) / 100` is 0.7 where `1 − 0.3` need not be.
  return { offsetShares: [first / 100, (100 - first) / 100] };
};

/** What a couple's share box holds when the plan states no shares, or a Person was just added: an equal split. */
export const EQUAL_SHARE_PERCENT = '50';

/**
 * **A home loan → its key, or nothing at all.** The `statedFee` shape, for a group of three rather
 * than for one field: `some` rather than `every` is the whole of the decision, and it is the one
 * that loses nothing the user typed.
 */
const statedMortgage = (values: StatedPositionFormValues): Record<string, unknown> => {
  const typed = [values.mortgageBalance, values.mortgageInterestRate, values.mortgageRepayment];
  if (typed.every((box) => box.trim() === '')) return {};
  return {
    mortgage: {
      openingBalance: dollarsToCents(values.mortgageBalance),
      annualInterestRate: rateAsTyped(values.mortgageInterestRate),
      monthlyRepayment: dollarsToCents(values.mortgageRepayment),
    },
  };
};

/**
 * **The plan with the forecast assumptions restated — and NOT the clock.** `asAtDate` is read off
 * the plan and written back unchanged: this is the half of the pairing rule that stops the date
 * having a second writer, and a settings form that could move it would re-open exactly the
 * double-counted-growth hole `planWithStatedPosition` closes.
 *
 * `economicSeries.agePension` travels through untouched and is not editable in this build: it is
 * two nested arrays of dated indexation figures, and a plan that states one currently makes
 * `project()` throw on register item O30 — a control that can brick the page is worse than no
 * control. Carrying it through means a plan that already has one keeps it.
 */
export const planWithSettings = (plan: PlanFile, values: SettingsFormValues): unknown => ({
  ...plan,
  settings: {
    asAtDate: plan.settings.asAtDate,
    planningHorizonAge: rateAsTyped(values.planningHorizonAge),
    economicSeries: {
      cpi: rateAsTyped(values.cpi),
      pblci: rateAsTyped(values.pblci),
      awote: rateAsTyped(values.awote),
      mtawe: rateAsTyped(values.mtawe),
      ...(plan.settings.economicSeries.agePension === undefined
        ? {}
        : { agePension: plan.settings.economicSeries.agePension }),
    },
    deemingRates: { lower: rateAsTyped(values.deemingLower), upper: rateAsTyped(values.deemingUpper) },
    nominalReturn: rateAsTyped(values.nominalReturn),
    // Blank writes NO KEY, which is the plan saying there is no reserve to draw a band against. A
    // typed figure goes to the door as typed — a nil or a negative one is refused there by name.
    ...statedFee('contingencyFloor', values.contingencyFloor, dollarsToCents),
    // **P3-22h step 1.** Blank writes NO KEY on either — the plan saying its investments pay out
    // nothing, and saying nothing about what is credited. Nothing in `src/core/projection.ts` reads
    // either figure yet; this is the path that keeps a user's stated figures alive until it does.
    ...statedFee('investmentPayoutRate', values.investmentPayoutRate, rateAsTyped),
    ...statedFee('investmentPayoutFrankedShare', values.investmentPayoutFrankedShare, rateAsTyped),
    // **P3-42 step 2.** Blank writes NO KEY — the plan saying nothing about a fund's income share.
    ...statedFee('superIncomeYieldRate', values.superIncomeYieldRate, rateAsTyped),
    ...statedFee('superIncomeYieldFrankedShare', values.superIncomeYieldFrankedShare, rateAsTyped),
    // Blank writes NO KEY — the cash then follows the CPI box. A typed 0 is kept: it says the cash
    // earns nothing, which is a different fact.
    ...statedFee('cashInterestRate', values.cashInterestRate, rateAsTyped),
  },
});

/** The plan's own position, as the boxes hold it. The inverse of `planWithStatedPosition`. */
export const positionFormValues = (plan: PlanFile): StatedPositionFormValues => ({
  asAtDate: plan.settings.asAtDate,
  homeStatus: plan.household.homeStatus,
  openingOffsetBalance:
    plan.household.openingOffsetBalance === undefined ? '' : centsToDollars(plan.household.openingOffsetBalance),
  offsetSharePercent:
    plan.household.persons.length !== 2 ? '' : fractionAsPercent(plan.household.offsetShares?.[0] ?? 0.5),
  personalAssets: plan.household.personalAssets === undefined ? '' : centsToDollars(plan.household.personalAssets),
  // **An absent loan is THREE empty boxes, never three zeros** — `feeBox`'s rule, and what makes
  // the round trip byte-identical for the households that have no mortgage, which is most of them.
  mortgageBalance: feeBox(plan.household.mortgage?.openingBalance, centsToDollars),
  mortgageInterestRate: feeBox(plan.household.mortgage?.annualInterestRate, String),
  mortgageRepayment: feeBox(plan.household.mortgage?.monthlyRepayment, centsToDollars),
  persons: plan.household.persons.map((person) => ({
    name: person.name,
    dateOfBirth: person.dateOfBirth,
    employmentIncomePerFortnight: centsToDollars(person.employmentIncomePerFortnight),
    workBonusBalance: centsToDollars(person.workBonusBalance),
    lastWorkBonusTopUp: person.statedLastWorkBonusTopUp ?? '',
    superInterests: person.superInterests.map((interest) => ({
      phase: interest.phase,
      balance: centsToDollars(interest.balance),
      // **An absent fee is an EMPTY box, never a `0` one** — the inverse of `statedFee`. A fund
      // that charges nothing and a fund nobody has been asked about are the same empty box here
      // and the same absent key on the way back, which is what makes the round trip byte-identical.
      administrationFeePerYear: feeBox(interest.statedAdministrationFeePerYear, centsToDollars),
      administrationFeeCapPerYear: feeBox(interest.statedAdministrationFeeCapPerYear, centsToDollars),
      // **PERCENT, not the stored fraction (2026-09-25).** `fractionAsPercent` is `ttrDrawdownRate`'s
      // own inverse, reused rather than reinvented: `0.0035` in the file fills the box as `0.35`.
      administrationFeeRate: feeBox(interest.statedAdministrationFeeRate, fractionAsPercent),
      investmentFeeRate: feeBox(interest.statedInvestmentFeeRate, fractionAsPercent),
      pensionAdministrationFeePerYear: feeBox(interest.statedPensionAdministrationFeePerYear, centsToDollars),
      pensionAdministrationFeeCapPerYear: feeBox(interest.statedPensionAdministrationFeeCapPerYear, centsToDollars),
      pensionAdministrationFeeRate: feeBox(interest.statedPensionAdministrationFeeRate, fractionAsPercent),
      deathPremiumPerYear: feeBox(interest.statedDeathPremiumPerYear, centsToDollars),
      tpdPremiumPerYear: feeBox(interest.statedTpdPremiumPerYear, centsToDollars),
      insuranceCoverKind: interest.statedInsuranceCoverKind ?? '',
      insuranceAdminFeePerYear: feeBox(interest.statedInsuranceAdminFeePerYear, centsToDollars),
      incomeProtectionPremiumPerYear: feeBox(interest.statedIncomeProtectionPremiumPerYear, centsToDollars),
      incomeProtectionBenefitPeriod: interest.statedIncomeProtectionBenefitPeriod ?? '',
      deathCoverEndsAtAge: feeBox(interest.statedDeathCoverEndsAtAge, String),
      tpdCoverEndsAtAge: feeBox(interest.statedTpdCoverEndsAtAge, String),
      ttrStartDate: interest.statedStreamSettings?.commencementDay ?? '',
      ttrDrawdownRate: feeBox(interest.statedStreamSettings?.statedTtrDrawdownRate, fractionAsPercent),
      atRetirement: interest.keepInAccumulationAtRetirement === true ? AT_RETIREMENT_KEEP : AT_RETIREMENT_SWITCH,
    })),
    employerPaysInto: (() => {
      const named = person.superInterests.findIndex(
        (interest) => interest.statedEmployerContributionDestination === 'superannuationGuarantee');
      return named === -1 ? '' : String(named);
    })(),
    priorRetirementPhase:
      person.statedPriorRetirementPhase === 'startedRetirementPhaseBeforeTheForecast' ? PRIOR_PENSION_YES : PRIOR_PENSION_NO,
    // Every year the form offers, blank where nothing is stated, and any stated year besides — so a
    // figure is never dropped by a box that is not drawn.
    unusedConcessionalCap: Object.fromEntries([
      ...unusedCapYears(plan.settings.asAtDate).map((year) => [year, ''] as const),
      ...Object.entries(person.statedUnusedConcessionalCap ?? {}).map(([year, amount]) => [year, centsToDollars(amount)] as const),
    ]),
    totalSuperBalanceAt30June: feeBox(person.statedTotalSuperBalanceAt30June, centsToDollars),
    // **The election as the box holds it, and NOT pre-selected when there is none** (register O84,
    // residual (iii)): a Person with one accumulation interest and no election comes back as
    // `NO_RELEASE_ELECTION`, exactly like a Person with none, because silence is a DECLINED
    // election and deriving the sole interest from it would re-open O84 in the opposite direction.
    // `findIndex` returns -1 for that case and it is mapped to the no-election value, never to 0.
    releaseAuthorityInterest: (() => {
      const elected = person.superInterests.findIndex(
        (interest) => interest.statedReleaseAuthorityDestination === 'division293');
      return elected === -1 ? NO_RELEASE_ELECTION : String(elected);
    })(),
    parcels: person.parcels.map((parcel) => ({
      acquired: parcel.acquired,
      costBase: centsToDollars(parcel.costBase),
      marketValue: centsToDollars(parcel.marketValue),
      valueJustBefore1July2027: feeBox(parcel.valueJustBefore1July2027, centsToDollars),
    })),
  })),
});

/** The plan's own assumptions, as the boxes hold them. Rates are decimals, as the file states them. */
export const settingsFormValues = (plan: PlanFile): SettingsFormValues => ({
  planningHorizonAge: String(plan.settings.planningHorizonAge),
  // **An absent floor is an EMPTY box, never a `0` one** — `feeBox`'s rule again, and what makes a
  // plan stating no floor re-write to a file stating none, key for key.
  contingencyFloor: feeBox(plan.settings.contingencyFloor, centsToDollars),
  // **An absent payout is an EMPTY box, never a `0` one** — `feeBox` again, and it is what makes
  // every plan written before 2026-09-22 re-write to a file stating neither figure, key for key.
  investmentPayoutRate: feeBox(plan.settings.investmentPayoutRate, String),
  investmentPayoutFrankedShare: feeBox(plan.settings.investmentPayoutFrankedShare, String),
  superIncomeYieldRate: feeBox(plan.settings.superIncomeYieldRate, String),
  superIncomeYieldFrankedShare: feeBox(plan.settings.superIncomeYieldFrankedShare, String),
  // An absent rate is an EMPTY box — the cash follows CPI — and never the CPI figure written in.
  cashInterestRate: feeBox(plan.settings.cashInterestRate, String),
  nominalReturn: String(plan.settings.nominalReturn),
  deemingLower: String(plan.settings.deemingRates.lower),
  deemingUpper: String(plan.settings.deemingRates.upper),
  cpi: String(plan.settings.economicSeries.cpi),
  pblci: String(plan.settings.economicSeries.pblci),
  awote: String(plan.settings.economicSeries.awote),
  mtawe: String(plan.settings.economicSeries.mtawe),
});

/**
 * **ADDING is the only structural change this build makes, and REMOVING is deliberately absent.**
 *
 * An add creates no orphan: nothing in the file points at a Person by index except an entry's
 * `owner`, and adding a second Person gives `personB` something to name where before it named
 * nothing. A REMOVE is the opposite, and it is unsafe TODAY for a reason recorded as a live defect
 * in TODO.md (P4-12): `RETIRE` and `WORK_PATTERN_CHANGE` are applied by iterating the Persons that
 * exist, so an entry owned by a Person who is no longer there **silently does nothing** — the plan
 * parses, projects, and reports a plausible wrong forecast with no refusal and nothing on screen.
 * (`LUMP_SUM_FROM_SUPER` and `NON_SUPER_INVESTMENT` do throw on the same dangling owner; the
 * asymmetry is the whole point.) So there is no `positionWithPersonRemoved` here, no such control
 * in `settingsPanel.ts`, and `test/app-settings-panel.test.mjs` fails if either appears.
 */
export const positionWithPerson = (values: StatedPositionFormValues, person: PersonFormValues): StatedPositionFormValues => ({
  ...values,
  persons: [...values.persons, person],
  // A household that has just become a couple starts at an equal split of the offset — what an
  // absent `offsetShares` means — rather than at a blank the door would refuse.
  offsetSharePercent: values.offsetSharePercent === '' ? EQUAL_SHARE_PERCENT : values.offsetSharePercent,
});

/** A Person with every box empty. Blank is `NaN` in every money box, so an unfilled row is refused by name rather than saved as nil. */
export const BLANK_PERSON: PersonFormValues = {
  name: '',
  dateOfBirth: '',
  employmentIncomePerFortnight: '',
  workBonusBalance: '',
  lastWorkBonusTopUp: '',
  superInterests: [],
  parcels: [],
  // **NO ELECTION, and it is not a placeholder for one.** A new Person has made no Subdiv 293-B
  // election, and the only alternative a blank form could offer — the sole accumulation interest,
  // which a blank Person does not have either — is the derivation register O84 exists to refuse.
  releaseAuthorityInterest: NO_RELEASE_ELECTION,
  employerPaysInto: '',
  priorRetirementPhase: PRIOR_PENSION_NO,
  unusedConcessionalCap: {},
  totalSuperBalanceAt30June: '',
};

/**
 * **The whole plan a walkthrough writes, built from a NAME and a DATE OF BIRTH and nothing else.**
 * It lives here and not in `settingsPanel.ts` because this is where every candidate plan is built;
 * the panel collects the two strings and hands them over.
 *
 * Nothing personal is borrowed from the demo module. `DEMO_SETTINGS` is reused because forecast
 * assumptions (return, CPI, deeming, horizon) are impersonal starting numbers a user can edit on
 * the same page, and the alternative — a second copy of them here — would be two sets to keep in
 * step. `DEMO_HOUSEHOLD`, `DEMO_ENTRIES` and the demo scenario's `entryIds` are deliberately NOT
 * reached for: the journal starts empty and the baseline Scenario holds nothing.
 *
 * ⚠️ The two money boxes are stated as `'0'` and NOT inherited from `BLANK_PERSON`, whose blanks
 * are `NaN` by design (see it below) and would be refused by the door. A person with no employment
 * income stated has nil of it, which is a figure and not an empty box.
 *
 * Nothing here validates: a blank or impossible date of birth is `parsePlan`'s refusal, and one
 * past the planning horizon is `project()`'s, both said in their own words at the save door.
 */
export const walkthroughPlan = (person: { readonly name: string; readonly dateOfBirth: string }): unknown => {
  // ⚠️ `Household.persons` is a tuple of ONE or TWO and there is no way to spell "nobody yet" in
  // that type — but nobody yet is exactly what this skeleton holds. The person is put in it on the
  // next call, by the one builder that writes a household; that builder carries nothing over from
  // a person who is not there, and `parsePlan` at the save door decides whether the result is a
  // plan at all. Inventing a placeholder Person to satisfy the type would be example data and a
  // second writer of a household in one stroke, which is worse than this one narrow cast.
  const noPersonsYet = [] as unknown as PlanFile['household']['persons'];
  const skeleton: PlanFile = {
    version: PLAN_FILE_VERSION,
    settings: DEMO_SETTINGS,
    household: { persons: noPersonsYet, homeStatus: 'noHome' },
    entries: [],
    scenarios: [{ id: 'baseline', name: 'Baseline', parentId: null, entryIds: [] }],
    activeScenarioId: 'baseline',
  };
  return planWithStatedPosition(skeleton, {
    // The skeleton's own date, so the walkthrough plan states it once: `planWithStatedPosition`
    // overwrites `settings.asAtDate` with whatever it is handed, and handing it anything else here
    // would be a second source for one clock.
    asAtDate: skeleton.settings.asAtDate,
    homeStatus: 'noHome',
    openingOffsetBalance: '',
    offsetSharePercent: '',
    personalAssets: '',
    // The walkthrough does not ask about a home loan (P3-16 slice 1 asks for it on the settings
    // panel and nowhere else), and three empty boxes are how a plan states it has none.
    mortgageBalance: '',
    mortgageInterestRate: '',
    mortgageRepayment: '',
    persons: [{
      ...BLANK_PERSON,
      name: person.name,
      dateOfBirth: person.dateOfBirth,
      employmentIncomePerFortnight: '0',
      workBonusBalance: '0',
    }],
  });
};

/** A super interest with no balance typed. `accumulation` is the phase that states no stream and needs no commencement day. */
export const BLANK_SUPER_INTEREST: SuperInterestFormValues =
  {
    phase: 'accumulation', balance: '',
    administrationFeePerYear: '', administrationFeeCapPerYear: '', administrationFeeRate: '', investmentFeeRate: '',
    pensionAdministrationFeePerYear: '', pensionAdministrationFeeCapPerYear: '', pensionAdministrationFeeRate: '',
    deathPremiumPerYear: '', tpdPremiumPerYear: '', insuranceCoverKind: '', insuranceAdminFeePerYear: '',
    incomeProtectionPremiumPerYear: '', incomeProtectionBenefitPeriod: '',
    deathCoverEndsAtAge: '', tpdCoverEndsAtAge: '',
    ttrStartDate: '', ttrDrawdownRate: '', atRetirement: AT_RETIREMENT_SWITCH,
  };

/** A parcel with every box empty. */
export const BLANK_PARCEL: ParcelFormValues = { acquired: '', costBase: '', marketValue: '', valueJustBefore1July2027: '' };

/** The position with one more super interest on the end of the nth Person's list. Out-of-range leaves it alone. */
export const positionWithSuperInterest = (
  values: StatedPositionFormValues,
  personIndex: number,
  interest: SuperInterestFormValues,
): StatedPositionFormValues => ({
  ...values,
  persons: values.persons.map((person, index) =>
    index === personIndex ? { ...person, superInterests: [...person.superInterests, interest] } : person),
});

/** The position with one more parcel on the end of the nth Person's list. */
export const positionWithParcel = (
  values: StatedPositionFormValues,
  personIndex: number,
  parcel: ParcelFormValues,
): StatedPositionFormValues => ({
  ...values,
  persons: values.persons.map((person, index) =>
    index === personIndex ? { ...person, parcels: [...person.parcels, parcel] } : person),
});

/**
 * **What moved, by path, between two plans — `settings` and `household` only.** Deliberately a
 * structural diff rather than a list the form keeps: a form that reported what it THINKS it
 * changed would go on reporting it after a builder stopped writing the field, which is the silent
 * half of every edit bug. This reads the plan that is now on disk against the one that was.
 *
 * Entries and scenarios are out of frame because this panel cannot touch them; a path that
 * appeared from either would be a defect in a builder, not something to announce.
 */
export const changedPositionPaths = (before: PlanFile, after: PlanFile): readonly string[] => {
  const found: string[] = [];
  const walk = (left: unknown, right: unknown, path: string): void => {
    if (Array.isArray(left) && Array.isArray(right)) {
      for (let index = 0; index < Math.max(left.length, right.length); index += 1) {
        walk(left[index], right[index], `${path}[${index}]`);
      }
      return;
    }
    const isRecord = (value: unknown): value is Record<string, unknown> =>
      typeof value === 'object' && value !== null && !Array.isArray(value);
    if (isRecord(left) && isRecord(right)) {
      for (const key of [...new Set([...Object.keys(left), ...Object.keys(right)])]) {
        walk(left[key], right[key], `${path}.${key}`);
      }
      return;
    }
    if (left !== right) found.push(path);
  };
  walk(before.settings, after.settings, 'settings');
  walk(before.household, after.household, 'household');
  return found;
};

/**
 * **The sentence the panel prints after a save landed, and the second half of it is the point**
 * (user ruling, 2026-09-19).
 *
 * A Household and a Settings are the base position every Scenario applies its entries to
 * (ADR-0002): there is one of each in the file, and every Scenario shares them. So an edit here is
 * never an edit to the Scenario on screen — **every forecast in the plan has just moved**, and a
 * user who has three Scenarios and reads only the chart in front of them would have no way to know
 * that. It is said in the panel, after the write, in terms of the count the file actually holds.
 *
 * The changed paths are read off the two plans rather than off the form (`changedPositionPaths`),
 * so "nothing changed" is a state this can report rather than a state it cannot tell from success.
 */
export const positionSaveConfirmation = (before: PlanFile, after: PlanFile): string => {
  const changed = changedPositionPaths(before, after);
  const count = after.scenarios.length;
  const what =
    changed.length === 0
      ? 'Saved. Nothing moved — every figure was already what the file held.'
      : `Saved. Changed: ${changed.join(', ')}.`;
  return (
    `${what} Every scenario was recomputed: all ${count} of them share this one household and these` +
    ` settings (ADR-0002), so all ${count} forecasts were rebuilt by this save, not just the one on screen.`
  );
};

/** A plan this build can read back AND walk, with the walks it produced. */
export interface ValidatedPlan {
  readonly plan: PlanFile;
  /** The ACTIVE Scenario's walk — the same array `walks.active` holds, never a second projection. */
  readonly months: readonly Month[];
  /** Every Scenario's walk, one projection each — see `scenarioWalks.ts`. */
  readonly walks: ScenarioWalks;
}

/**
 * **The gate every write goes through: `parsePlan`, and then the engine itself.**
 *
 * The parse half is requirement one — the file that is about to be written must be a file this
 * build would accept on the way back in, checked by the very same function, so the two cannot
 * drift.
 *
 * The walk half is here because **`parsePlan` accepting a plan does not mean `project()` can walk
 * it**, and the gap is reachable from this form with one keystroke: an entry dated after the
 * Planning Horizon parses perfectly and makes `project()` throw (`projection.ts`: *"after the
 * Planning Horizon … Disable it, or move the horizon"*). Written to disk unchecked, that plan
 * **bricks the page** — the next load parses it, throws inside `project()`, and there is no banner
 * for a crash that happens after loading succeeded. Walking it first turns that into a refused edit
 * with the engine's own sentence on screen and nothing written. It is not a second validator: it is
 * the consumer, run early, and its result is the one the caller redraws with rather than a repeat.
 *
 * **EVERY Scenario is walked, not just the active one (P7-1).** The walk half is here to stop a
 * plan that parses and then throws at the point of drawing; a Scenario that is not the active one
 * is one click away from being drawn, so a save that only walked the active one would write a file
 * that bricks the page as soon as the user selects the other Scenario. And it is the walk of the
 * ACTIVE Scenario's own resolved entries — never `plan.entries`, the pool, which is the union of
 * every Scenario's decisions (`scenarioWalks.ts`). The walks are handed back so the caller draws
 * from them rather than projecting again.
 */
export const validatedPlan = (candidate: unknown): ValidatedPlan => {
  const plan = parsePlan(candidate);
  const walks = scenarioWalks(plan);
  return { plan, months: walks.active, walks };
};

// --- P3-4b slice 2: the offered catch-up (ADR-0004: offered, never bound) ------------------------

/**
 * **Why a catch-up was not written, by name.** Thrown before anything reaches `savePlan`, so the
 * page shows it on the same banner as any refused edit and the file is untouched.
 */
export class CatchUpRefusedError extends RangeError {
  constructor(message: string) {
    super(message);
    this.name = 'CatchUpRefusedError';
  }
}

/**
 * **The catch-up as a PAIR of entries: a salary sacrifice from 1 July of the year and its stop on
 * the next 1 July** — `superContributionEntry` and `superContributionStopEntry`, the form's own two
 * builders, so the file holds nothing a user could not have typed. It lands in the account the
 * employer pays into where one is named, else the Person's first accumulation account. Appended to
 * the active Scenario, like every entry. Nothing here validates: `checkedCatchUp` walks it.
 */
export const planWithCatchUp = (
  plan: PlanFile,
  catchUp: { readonly person: number; readonly financialYear: FinancialYear; readonly amount: Cents },
  ids: readonly [string, string],
  createdAt: string,
): unknown => {
  const holder = plan.household.persons[catchUp.person];
  const named = holder?.superInterests.findIndex((interest) => interest.statedEmployerContributionDestination === 'superannuationGuarantee') ?? -1;
  const into = named !== -1 ? named : holder?.superInterests.findIndex((interest) => interest.phase === 'accumulation') ?? -1;
  const owner = catchUp.person === 0 ? 'personA' : 'personB';
  const next = toFinancialYear(financialYearStartYear(catchUp.financialYear) + 1);
  const note = `Catch-up for FY${catchUp.financialYear}, sized to the unused cap the forecast showed.`;
  const start = superContributionEntry(
    { date: startOfFinancialYear(catchUp.financialYear), owner, note, annualAmount: centsToDollars(catchUp.amount), interestIndex: String(into + 1) },
    ids[0],
    createdAt,
  );
  const stop = superContributionStopEntry({ date: startOfFinancialYear(next), owner, note }, ids[1], createdAt);
  return planWithEntry(planWithEntry(plan, start) as PlanFile, stop);
};

/**
 * **The catch-up for one Person's year, WALKED before it is offered to `save`.** Sized by
 * `catchUpOffer` off the walk on screen (`months`, the active Scenario's), then the candidate is
 * parsed and projected — `validatedPlan`, the save door's own two halves — and the new walk has to
 * show three things, or the catch-up is refused by name and nothing is written:
 *
 *   * **no sacrifice of that Person already running into the year or changing inside it.** A new
 *     arrangement REPLACES a standing one, and the stop would then end it for good;
 *   * **the year's contributions rose by the whole amount.** Less means the pay could not carry it
 *     (the walk drops what is above the salary);
 *   * **the year stayed inside its total cap.** A twelfth of a whole-dollar amount can round a few
 *     cents up; one dollar less is tried once before refusing.
 *
 * Returns the candidate for the caller to hand to `save`, which parses and walks it once more.
 */
export const checkedCatchUp = (
  plan: PlanFile,
  months: readonly Month[],
  person: number,
  financialYear: FinancialYear,
  ids: readonly [string, string],
  createdAt: string,
): unknown => {
  const name = plan.household.persons[person]?.name ?? `Person ${person + 1}`;
  const yearOf = (walk: readonly Month[]): readonly Month[] => walk.filter((month) => financialYearOfMonth(month.month) === financialYear);
  const offered = catchUpOffer(yearOf(months), person);
  if (offered === null) {
    throw new CatchUpRefusedError(`${name} has no carried-forward cap room to catch up in FY${financialYear}, so nothing was added.`);
  }
  const owner = person === 0 ? 'personA' : 'personB';
  const start = startOfFinancialYear(financialYear);
  const end = startOfFinancialYear(toFinancialYear(financialYearStartYear(financialYear) + 1));
  const sacrifices = scenarioEntries(plan, scenarioById(plan, plan.activeScenarioId))
    .filter((entry): entry is Extract<Entry, { type: 'SUPER_CONTRIBUTION' }> =>
      entry.enabled && entry.type === 'SUPER_CONTRIBUTION' && entry.owner === owner && entry.date <= end);
  const standing = sacrifices.filter((entry) => entry.date < start).at(-1);
  if (sacrifices.some((entry) => entry.date >= start) || (standing !== undefined && standing.params.kind !== 'stopped')) {
    throw new CatchUpRefusedError(
      `${name} already has a salary sacrifice running in FY${financialYear}. A catch-up would replace it for the year and its stop would end it, so nothing was added: change that arrangement instead.`,
    );
  }
  const before = yearOf(months).at(-1)?.concessionalCapByPerson[person];
  let amount = offered;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const candidate = planWithCatchUp(plan, { person, financialYear, amount }, ids, createdAt);
    const after = yearOf(validatedPlan(candidate).months).at(-1)?.concessionalCapByPerson[person];
    if (before === null || before === undefined || after === null || after === undefined) {
      throw new CatchUpRefusedError(`The forecast has no concessional cap for ${name} in FY${financialYear}, so nothing was added.`);
    }
    const added = after.usedSoFar - before.usedSoFar;
    // A twelfth a month is rounded to the cent, so twelve of them can differ from the year by a few.
    if (added < amount - 12) {
      throw new CatchUpRefusedError(
        `${name}'s pay in FY${financialYear} cannot carry a ${centsToDollars(amount)} dollar sacrifice: the forecast would sacrifice only ${centsToDollars(added)} of it. Nothing was added.`,
      );
    }
    if (after.usedSoFar <= after.generalCap + after.carriedForwardAvailable) return candidate;
    amount = (amount - 100) as Cents;
  }
  throw new CatchUpRefusedError(`A catch-up for ${name} in FY${financialYear} would take the year over its total concessional cap, so nothing was added.`);
};

/** The one thing `savePlan` needs off `store/files.ts`. Injected, so this is testable without a socket. */
export interface PlanWriter {
  readonly writePlan: (plan: unknown) => Promise<void>;
}

/**
 * Validate, then write. **A candidate that does not validate is never PUT** — the refusal is thrown
 * before `writePlan` is named, so the transport is not merely sent something harmless, it is not
 * called at all. That ordering is the requirement, and `test/app-plan-edits.test.mjs` asserts it
 * against a spy that counts its own calls.
 *
 * Throws `parsePlan`'s named refusal (or the engine's) when the edit is not a plan; throws
 * `PlanWriteFailure` when the plan was fine and the DISK did not take it. The two are different
 * states with different fixes and `planStatus.ts` says which happened.
 *
 * Returns what was stored, so the caller re-projects nothing: the months handed back are the walk
 * of the plan that is now on disk.
 */
export const savePlan = async (transport: PlanWriter, candidate: unknown): Promise<ValidatedPlan> => {
  const validated = validatedPlan(candidate);
  try {
    await transport.writePlan(validated.plan);
  } catch (cause) {
    throw new PlanWriteFailure('the plan file could not be written', { cause });
  }
  return validated;
};
