// P4-1 chunk 0 — the shapes `project(settings, entries) → Month[]` is typed against, and nothing
// else. There is no arithmetic in this file, no `project()` body and no wiring: every downstream
// chunk types against what is here, so a field invented today is a field a later author builds on
// as though it had been specified.
//
// Four things live here, and the reason they live together is that none of them is meaningful
// without the others:
//
//   Settings  the undated base inputs that hold throughout (concept.md §4). Including `asAtDate`,
//             which is the ONLY "today" this engine has.
//   Entry     one Journal Entry, discriminated on `type` (ADR-0002).
//   Scenario  a name and a `parentId`, over a list of Entry ids (P6-4). It holds no Settings and
//             no Household: those are shared, and a Scenario differs only in its entries.
//   Month     what one monthly tick reports.
//
// **Nothing in this file reads the clock, and nothing downstream may either** (P4-1a, ADR-0002's
// 2026-09-03 note). That is not enforced by a comment: `Settings.asAtDate` is REQUIRED, so there is
// no `project()` signature that compiles without the caller stating the date, and there is no
// default for it to fall back to. A `Date.now()` under `project()` would make ADR-0002's promise —
// that a comparison run months ago still reproduces — simply false.
//
// **Money is `Cents`, never a number** (ADR-0001, `money.ts`). Rates are the only floats, and they
// are annual decimals.
//
// **What this file deliberately does NOT re-declare.** `Person`, `Household`, `HomeStatus`,
// `SuperInterest` and `AssetSplit` are in `household.ts`; `DeemingRatesSetting` and
// `EconomicSeriesSetting` are in `data/assumptions/settings.ts`. A second spelling of any of them
// would be one concept with two incompatible types and nothing to say which is meant — the exact
// failure `household.ts`'s own header calls out. They are imported, type-only.
import type { Cents } from './money.js'; // `.js` is correct in a `.ts` file — see tsconfig.json
import type { Confidence, FinancialYear, IsoDate } from '../data/assumptions/types.js';
import type { DeemingRatesSetting, EconomicSeriesSetting } from '../data/assumptions/settings.js';
import type { HomeStatus } from './household.js';

// --- Time -------------------------------------------------------------------------------------

/**
 * A month, as `YYYY-MM`. The projection ticks monthly (concept.md §4), so a `Month` is stamped with
 * a month and not with a day: there is no such thing as "the 14th" in the output.
 *
 * Like `IsoDate` this is a template literal type, so it admits `2026-3`. `household.ts` carries the
 * zero-padding guard for dates (`assertIsoDate`) because string ordering depends on it; the
 * equivalent guard for months belongs with the code that first constructs one, which does not exist
 * yet. Stated so a later author writes it rather than discovering the ordering bug.
 */
export type IsoMonth = `${number}-${number}`;

// --- Settings ---------------------------------------------------------------------------------

/**
 * The undated base inputs that hold for the whole projection (concept.md §4, and the
 * assumption/Setting boundary in `data/assumptions/settings.ts`). A Setting is a *forecast* supplied
 * by the user and living in the plan file; anything readable from a statute or an agency page today
 * is an assumption and lives in `data/assumptions/`, never here.
 *
 * Every field the forecast COMPUTES from is required. There is no partial `Settings` and no
 * defaulting layer, because a defaulted economic assumption is a forecast wearing nobody's name.
 *
 * ⚠️ **Six fields are optional — `contingencyFloor`, `investmentPayoutRate`,
 * `investmentPayoutFrankedShare`, `superIncomeYieldRate`, `superIncomeYieldFrankedShare` and
 * `cashInterestRate` — and they are the exceptions that keep the rule.** The rule is that no absent
 * field may be answered by a guess. Nothing in `src/` guesses any of the first five: absent, there
 * is no band, no breach, no payout and no super earnings tax — `project()` reads every one of them
 * where it is stated, and invents no figure where it is not. The sixth is answered by ANOTHER of
 * the user's own figures, `economicSeries.cpi`, on the user's ruling — see its own doc. Every other
 * absence here would have to be filled with a number somebody invented, which is why every other
 * field is required.
 */
export interface Settings {
  /**
   * **"Today", and the only one that exists.** P4-1a and ADR-0002's 2026-09-03 note: `project()`
   * never reads the system clock, so every age gate, every cap reset, every two-year home exemption
   * clock and every contribution year is counted from this date and from nothing else.
   *
   * It is REQUIRED and is never optional, never defaulted and never inferred. Advancing a plan to a
   * new date is an explicit edit with a visible effect, not something that happens because time
   * passed — which is also what makes golden files stable and two scenarios diffable.
   */
  readonly asAtDate: IsoDate;
  /**
   * The Planning Horizon, as an age (concept.md §1: "both modelled to a **Planning Horizon of
   * 100**"). Both members of the Household are projected to it, so the horizon is one number for the
   * plan and not one per Person.
   */
  readonly planningHorizonAge: number;
  /**
   * The forward economic series — CPI, PBLCI, AWOTE, MTAWE — as `data/assumptions/settings.ts`
   * already spells them (register O5).
   *
   * **Four knobs, not one.** ADR-0001: the Age Pension basic rate follows wages via MTAWE while its
   * own free areas and the deeming thresholds follow CPI, and the concessional cap follows AWOTE —
   * as, since 2026-09-23, does every stated salary. A
   * single "inflation" Setting cannot express a divergence between three indices, and the errors do
   * not cancel — they have opposite signs in the accumulation and the drawdown years (T23, T24).
   */
  readonly economicSeries: EconomicSeriesSetting;
  /**
   * Deeming rates, **as a manual policy input** (concept.md §4, T30, register O2).
   *
   * They are not an index and not a forecast off one: the Australian Government Actuary recommends
   * and the Minister determines by legislative instrument, and may depart from the recommendation.
   * Determinations already made are assumptions and are stored with their effective dates in
   * `data/assumptions/agePension.ts`; everything after the last determination arrives here.
   *
   * Required, on the same ground `resolveDeemingRates` throws rather than extrapolating the three
   * consecutive +0.5% steps: a caller who ignores a missing rate must not get a number back.
   */
  readonly deemingRates: DeemingRatesSetting;
  /**
   * The nominal annual investment return, as a decimal — e.g. `0.065`. Nominal, not real: the engine
   * computes in nominal dollars and converts for display (ADR-0001).
   *
   * **The FLAT, PLAN-WIDE default — and it can be overridden per Person and from a date now, by a
   * `RETURN_CHANGE` Journal Entry (P2-11, gate ruling GO-VIA-DIFFERENT-SHAPE, 2026-09-22).** This
   * field stays exactly what it always was: the figure every Person's growth reads until, and
   * unless, they state their own. `RETURN_CHANGE` is EXPLICIT and user-stated — SPEND_CHANGE's own
   * "level, carried across months until superseded" idiom — never synthesised, so a plan holding
   * none of them is byte-identical to one from before this field existed.
   *
   * ⚠️ **What this field's own doc used to promise, superseded rather than deleted, because the
   * aspiration concept.md §5.13 names is real even though this build does not construct it.**
   * concept.md §5.13's Glide Path — age bands, High Growth to Conservative, resolving into synthetic
   * `RETURN_CHANGE` entries the household never states by hand — was the ORIGINAL design for this
   * item, on the reading that returns are a *Dated Parameter* and ADR-0002's one-mechanism rule
   * requires the synthesis. The gate ruling above found that reading a false binary: the missing
   * generic mechanism (Dated Parameters resolving into synthetic entries, P6-3) is still unbuilt and
   * still deferred, untouched by this field or by `RETURN_CHANGE` — what shipped instead is the
   * third, already-precedented shape `MORTGAGE_TARGET` and `NON_SUPER_INVESTMENT` used: an ORDINARY
   * explicit entry, stated by the household directly. A user who wants three bands states three
   * `RETURN_CHANGE` entries by hand; a wizard that generates several from one input is a named,
   * separate follow-on and is not this.
   *
   * **PER-PERSON, not per-account, on THIS field's own former ground.** It used to say a shape
   * invented ahead of P2-11 would be a shape P2-11 would have to fight — `RETURN_CHANGE`'s `owner`
   * is exactly that shape now, narrowed to the Person the gate ruled rather than the account nothing
   * in `src/` yet distinguishes.
   *
   * **It has a reader from 2026-09-17 — P4-1 chunk 5a**, and until then it had none anywhere in
   * `src/`. `project()` compounds it monthly as `(1 + r)^(1/12)` (never `r / 12`) onto every
   * `SuperInterest.balance` and every parcel of every `Person.parcels`, which is what gave this
   * model its
   * first balance that can move. Which balances it reaches, and which it deliberately does not —
   * the Work Bonus balance, the Offset Account, the home — is written out at `PersonBalances` in
   * `projection.ts`, not here.
   */
  readonly nominalReturn: number;
  /**
   * **THE CONTINGENCY FLOOR — the reserve this Household wants never to spend below (concept.md §1,
   * §§53-55), STATED IN TODAY'S MONEY, and OPTIONAL.**
   *
   * Until 2026-09-21 this figure existed nowhere in a plan file: `main.ts` held a hard-coded
   * `$700,000` and drew the band against it. That was the one personal financial figure in this
   * build invented by the page, while fees, returns, spending and the home loan all refuse to guess
   * a typical value — so the user ruled it a Setting.
   *
   * ⚠️ **OPTIONAL, AND THAT IS NOT THE DEFAULTING THIS INTERFACE'S HEADER FORBIDS.** The rule above
   * is that an absent field must not be answered on the user's behalf. Nothing answers this one:
   * with no floor stated there is no band on the chart, no breach counted and no figure anywhere —
   * `monthsToSeries` emits no `floor` key and no `belowFloor`, and `contingencyFloorBreach` is not
   * asked. Absence is the only spelling of "no floor"; a stated nil is REFUSED at the door
   * (`parsePlan`), on the same ground a nil mortgage balance is, so "I have no reserve" and "I keep
   * nothing back" cannot be two spellings of one fact.
   *
   * **TODAY'S MONEY, and it is the only figure in this file that is.** Every other `Cents` here is
   * nominal, because the engine computes in the dollars of the day (ADR-0001). A household saying
   * *"$700k of buffer"* means $700k of what it buys now, and the figure is flat across a 501-month
   * walk with no month of its own to be read against. So the comparison is made by raising THIS
   * figure to each month's price level with `economicSeries.cpi` and `asAtDate`
   * (`core/priceLevel.ts`), never by deflating a balance — see `outcomes.ts`'s `contingencyFloorAt`.
   */
  readonly contingencyFloor?: Cents;
  /**
   * **WHAT THE NON-SUPER PORTFOLIO PAYS OUT EACH YEAR, AS A SHARE OF ITS VALUE — a decimal, e.g.
   * `0.04` for 4% a year. OPTIONAL. READ FROM STEP 2 (P3-22h, 2026-09-22): once a year, in the
   * final month of the financial year, the portfolio pays out this share of its own value and the
   * whole of it is taxed as ordinary, UNFRANKED income at the owning Person's marginal rate,
   * through the year-end true-up — see `projection.ts`'s distribution block. It is REINVESTED, not
   * spendable cash, so no cash line reports it; it raises the holding's cost base instead, and
   * `InvestmentDistributionNote` is where a `Month` says so.
   *
   * The gap it exists to close: `project()` grows every parcel of every `Person.parcels` and the
   * portfolio distributes **nothing** — `parcelsGrownForOneMonth` compounds market value and books
   * no income at all, so a household living off a share portfolio shows no income from it and no
   * tax on it. Stating the payout is the first of the two figures that close that, and it is a
   * **Setting** rather than an assumption because no statute says what a portfolio pays out.
   *
   * ⚠️ **A RATE, not a dollar figure, and that was ruled rather than chosen for convenience**
   * (2026-09-22): a dollar amount read off this year's distribution statement is a figure that
   * drifts across a forty-year walk, and it drifts the FLATTERING way — the portfolio compounds
   * and the stated income does not, so the tax on it falls behind every year the plan runs. A share
   * of value tracks the holding it comes from.
   *
   * **It is NOT a return, and it is not netted off `nominalReturn`.** That figure is total growth;
   * this one says how much of the holding's value is handed to the owner rather than retained. What
   * the payout then DOES — whether it is reinvested, and how it is taxed — is **step 2**, which is
   * where the first figure moves.
   */
  readonly investmentPayoutRate?: number;
  /**
   * **HOW MUCH OF THAT PAYOUT CARRIES A COMPANY-TAX CREDIT — a decimal share of the payout, 0 to 1
   * exclusive of 0. OPTIONAL, and NOTHING READS IT YET (P3-22h, step 1 of three).**
   *
   * ⚠️ **THIS IS THE USER'S FIGURE AND IT MUST NEVER BECOME A CONSTANT — register T43**, whose
   * reasoning is written out in full at `SETTINGS_NOT_ASSUMPTIONS['franking.portfolioEffectiveRate']`.
   * ITAA 1997 s 202-60(2) fixes the imputation rate to THE PAYING ENTITY, so a diversified ETF spans
   * both the 25% and the 30% payer rate at once and there is no single legislated figure for a
   * portfolio. A blended one is a forecast about what the portfolio HOLDS, which is the far side of
   * the P2-5d boundary — a Setting in the plan file, never a row in `data/assumptions/`.
   *
   * **It is the FRANKED SHARE, not a rate.** The payer rate it eventually meets is
   * `frankedDistributionFromRate`'s required, undefaulted `payerCorporateTaxRate` parameter
   * (`core/superFranking.ts`), supplied by its caller with its caller's own confidence. This field
   * answers a different question — how much of the payout is franked at all — and the two must not
   * be conflated, which is why this one is a share and is named as one.
   *
   * **Absent is the conservative answer, and that is why it is safe to ship unread.** With no share
   * stated there is no credit, so the household's tax is over-stated rather than under-stated —
   * the direction RULINGS.md R9 engineers every unsourced figure towards. It is asked for in step 1
   * alongside the payout rate so that step 3 has something to be true of: collecting only the
   * payout would make the credit nil for every user, and a step that moves no figure ships nothing.
   */
  readonly investmentPayoutFrankedShare?: number;
  /**
   * **WHAT SHARE OF EACH SUPERANNUATION BALANCE'S ANNUAL GROWTH COUNTS AS TAXABLE INCOME — a
   * decimal, e.g. `0.02` for 2% a year. OPTIONAL. READ FROM STEP 2 (P3-42, 2026-09-22): once a
   * year, in the final month of the financial year, this share of each `SuperInterest`'s own
   * balance is worked out as its income for the year, and the fund's own 15%/0% earnings tax
   * (`superPhase.ts`'s `fundEarningsTax`) is charged on it at the year-end true-up — see
   * `projection.ts`'s super income-yield block. The tax is netted OUT OF THE BALANCE ITSELF: the
   * fund pays its own tax, so no cash line reports it, and `SUPER_EARNINGS_TAX_LINE` is where a
   * `Month` says so.**
   *
   * `investmentPayoutRate`'s shape exactly, moved inside super: `nominalReturn` grows every
   * `SuperInterest.balance` as one already-net figure, and a fund's real earnings are only PART
   * income (taxed at the fund's own 15%/0% rate, register §3.1) and part unrealised capital growth
   * (untaxed until a disposal this model does not compose inside super — see `superPhase.ts`). This
   * is the SAME split `investmentPayoutRate` already draws for the non-super portfolio, moved to
   * the account that has its own legislated rate rather than the owner's marginal one.
   *
   * ⚠️ **A RATE, not a dollar figure, for `investmentPayoutRate`'s own reason**: a dollar amount
   * read off one year's earnings drifts behind a compounding balance, and it drifts the flattering
   * way. A share of the balance tracks the balance it comes from.
   *
   * **PLAN-WIDE, like `nominalReturn` — not per account.** A single fund earnings-tax structure is
   * assumed for every `SuperInterest` a Household holds, on `nominalReturn`'s own ground: nothing
   * in `src/` yet distinguishes one account's income share from another's, and a shape invented
   * ahead of that is a shape a future per-account build would have to fight.
   *
   * **Absent is the conservative answer.** With no share stated there is no fund earnings tax
   * computed at all — every `SuperInterest.balance` keeps compounding at the caller's own
   * `nominalReturn`, exactly as it always has, which OVER-states the household's net worth by
   * whatever the fund would really have paid the Commissioner. That is the flattering direction,
   * and it is why every plan written before this field existed re-projects byte-identical: the
   * absence of a key is the whole of the zero-churn proof, not a claim about it.
   */
  readonly superIncomeYieldRate?: number;
  /**
   * **HOW MUCH OF THE SUPER INCOME SHARE CARRIES A COMPANY-TAX CREDIT — a decimal share, 0 to 1
   * exclusive of 0. OPTIONAL. READ FROM STEP 3 (P3-42, 2026-09-22).**
   *
   * `investmentPayoutFrankedShare`'s shape and rule exactly, moved inside super: a SHARE of the
   * income share `superIncomeYieldRate` already produces, sized on `frankedDistributionFromShare`'s
   * own convention — `frankingCredit = taxableEarnings × frankedShare`, the WHOLE income share
   * unsplit as `frankedAmount`, never `frankedAmount × frankedShare`. It cannot be stated without
   * `superIncomeYieldRate` for the same reason the non-super sibling cannot be stated without
   * `investmentPayoutRate`: a share of a figure nobody stated is typed, saved and forever inert.
   *
   * **WHEN STATED, IT REPLACES `fundEarningsTax` FOR THAT INTEREST, RATHER THAN SITTING BESIDE
   * IT.** `superFranking.ts`'s `frankingInSuper` computes the earnings tax on the GROSSED-UP amount
   * (income share plus credit) and the credit's own offset/refund in ONE call — s 207-20(1)/(2),
   * s 207-110 (register §5A.3). Calling it AS WELL AS the plain `fundEarningsTax` on the same
   * income share would tax the same dollar twice; calling it instead of that function, on the whole
   * of the share, is the decomposition `superFranking.ts`'s own header states is exact (refundable
   * excess credits make `tax(other) + tax(grossed-up) − credit` independent of grouping).
   *
   * **Retirement Phase refunds the credit IN FULL, in cash, back into the balance — T45/T46's whole
   * point, now reachable from a live walk.** Accumulation Phase and TTR offset the credit against
   * their 15% and keep any excess; the two rows this Setting reaches are `superIncomeYieldRate`'s
   * own two rows, unchanged.
   *
   * **Absent is the conservative answer**, on `investmentPayoutFrankedShare`'s own ground: with no
   * share stated there is no credit, so the household's super tax is OVER-stated rather than
   * under-stated, the direction RULINGS.md R9 engineers every unsourced figure towards.
   */
  readonly superIncomeYieldFrankedShare?: number;
  /**
   * **WHAT THE RUNNING CASH — THE OFFSET ACCOUNT — EARNS, as an annual decimal (`0.03` is 3% a
   * year). OPTIONAL, and ABSENT MEANS `economicSeries.cpi` (user ruling, 2026-09-23).**
   *
   * The walk's running cash is the Offset Account (`Household.openingOffsetBalance`), and until
   * this field it earned nothing at all, which under-stated a cash-rich household. It earns this
   * rate on `max(0, cash − loan owing)` only: a dollar sitting against the home loan is already
   * cancelling that loan's interest (`mortgageMonth`), so each dollar either cancels loan interest
   * or earns this rate, never both. A twelfth of the annual rate a month, rounded down.
   *
   * **Absent follows inflation, and that is a ruling rather than a guess.** A deposit rate near the
   * price rise is the ordinary long-run reading; the user can state their own, and a stated nil
   * says the cash earns nothing. A stated rate is the user's own and wins untouched.
   *
   * **Taxed, and NOT Age Pension income.** Each owner's share (`Household.offsetShares`) is
   * assessable income in their own income tax. The Age Pension income test does not see it: the
   * cash itself is deemed, and deeming stands in for whatever it actually earns.
   */
  readonly cashInterestRate?: number;
}

// --- Journal Entries --------------------------------------------------------------------------

/**
 * Who an entry is about. Mandatory on every entry, because almost every Australian super and tax
 * rule is assessed per person (ADR-0002).
 *
 * `personA` / `personB` are positional and mean `Household.persons[0]` / `[1]`. They are not names:
 * a `Person` carries its own `name`, and an entry that referred to one by name would break the
 * moment the name was edited.
 */
export type EntryOwner = 'personA' | 'personB' | 'household';

/**
 * Every Journal Entry type concept.md §4's "Entry types" table names, in the table's own order.
 *
 * **`EntryType` is derived FROM this array, not written beside it.** One source, so a type cannot be
 * in the union and missing from the list or the reverse. The list is then checked against the
 * markdown table itself by `test/core-plan.test.mjs`, so adding a row to the table without adding it
 * here — or here without there — goes red.
 *
 * All of them are declared even though most carry no `params` yet: leaving a name out invites a
 * later author to invent a parallel spelling for the same event, and two names for one event is
 * worse than a name with nothing behind it.
 */
export const ENTRY_TYPES = [
  'RETIRE',
  'WORK_PATTERN_CHANGE',
  'SUPER_CONTRIBUTION',
  'LUMP_SUM_FROM_SUPER',
  'TTR_START',
  'TRIS_EARLY_CONVERSION',
  'TTR_RATE_CHANGE',
  'INSURANCE_COVER_CHANGE',
  'MORTGAGE_REFINANCE',
  'MORTGAGE_TARGET',
  'MORTGAGE_PAYOFF',
  'NON_SUPER_INVESTMENT',
  'RETURN_CHANGE',
  'SPEND_CHANGE',
  'ONE_OFF_EXPENSE',
  'CONTRIBUTION_SPLIT',
  'SPOUSE_CONTRIBUTION',
  'DOWNSIZE',
  'VACATE_HOME',
  'DOWNSIZER_CONTRIBUTION',
  'HEAS_DRAW',
  'DEATH',
  'ILLNESS_SEPARATION',
  'ENTER_CARE',
  'SELL_HOME',
  'RENT_OUT_HOME',
  'BUY_HOME',
] as const;

/** The discriminant of `Entry`. Derived from `ENTRY_TYPES` so the two can never disagree. */
export type EntryType = (typeof ENTRY_TYPES)[number];

// --- Level or event: what a date BEFORE the projection means -------------------------------------

/**
 * **What an entry dated before `Settings.asAtDate` means.** The user's ruling of 2026-09-17, taken
 * against a per-entry flag and against asking the user per entry: the answer is a property of the
 * TYPE, decided once, from what the type means.
 *
 * - `level` — a standing state that is **still true**. "From 2020 we spend $90k a year" is still the
 *   spending level today, so a pre-dated one must apply **from month 0**. Dropping it would delete a
 *   fact the user stated and that has not been superseded.
 * - `event` — a thing that **already happened and was already paid**. "In 2020 we bought a car for
 *   $40k" is money that is already gone, and the Household's stated balances are stated as at
 *   `asAtDate`, so they already contain it. Replaying it in month 0 would spend it twice.
 *
 * **The discriminator is not "did it happen on a date"** — everything here happens on a date. It is
 * whether the entry's effect **persists** (a state that is still in force, or a rate that still
 * applies) or **completes** (a movement of money that is finished and already reflected in the
 * position the plan starts from).
 *
 * The consequence for entries dated INSIDE the walk is nil: both kinds apply in their own month.
 * This classification is consulted only for the before-the-walk case, and `projection.ts` is where
 * it is applied.
 */
export type EntryKind = 'level' | 'event';

/**
 * Every entry type's kind, with the reason it has that kind.
 *
 * **An unclassified type is a BUILD error, not a test failure.** `satisfies Record<EntryType,
 * EntryKind>` makes a missing key a compile error and an unknown key an excess-property error, so
 * adding a twentieth name to `ENTRY_TYPES` breaks `tsc` until somebody decides what that name
 * means. There is deliberately no `default:` branch and no `?? 'event'` anywhere on this path: a
 * fallback would answer the question by accident, and answering it wrong in the `event` direction
 * silently deletes a standing fact while answering it wrong in the `level` direction silently spends
 * money twice.
 *
 * `as const` before `satisfies` so each value keeps its literal type; the `satisfies` then checks
 * exhaustiveness without widening what the map says.
 */
export const ENTRY_KIND = {
  /** LEVEL. Retirement is a state, not a transaction: a person who retired in 2020 is still retired. */
  RETIRE: 'level',
  /** LEVEL. "Days per week **from this date**" — the roster set in 2020 is the roster still worked. */
  WORK_PATTERN_CHANGE: 'level',
  /**
   * LEVEL, and **confirmed by the specification rather than left arguable** (P6-8 brief 1,
   * 2026-09-19). concept.md's row carries a *recurring flag*, so this one name covered both a
   * standing salary-sacrifice arrangement (a level) and a single contribution (an event) — the
   * tell, as this doc said, that it was two types wearing one name. The answer taken was not to
   * split the type and not to add the flag: `SuperContributionParams` specifies the STANDING
   * arrangement, as an annual level in `annualSpend`'s idiom, and the one-off is refused by name at
   * the door. So `level` is now what every constructible `SUPER_CONTRIBUTION` is, rather than the
   * more likely of two readings. A pre-dated one is a sacrifice still being made, and applies from
   * month 0 — which is right, because the Household's stated super balance is stated as at
   * `asAtDate` and says nothing about what is still going in.
   */
  SUPER_CONTRIBUTION: 'level',
  /** EVENT. A withdrawal on a day. A 2020 lump sum is already out of the super balance and in the bank. */
  LUMP_SUM_FROM_SUPER: 'event',
  /**
   * LEVEL. "From this date this account is a transition to retirement pension" is a state of the
   * account, `TRIS_EARLY_CONVERSION`'s reasoning. The door refuses one dated before `asAtDate`: a
   * pension already running is stated under Household and settings, as the account's phase.
   */
  TTR_START: 'level',
  /**
   * LEVEL. "The stream converted to retirement phase on this day" is a state, not a payment: from
   * that day the interest IS an account-based pension, and it stays one — `RETIRE`'s reasoning
   * exactly. A conversion dated before `asAtDate` is a fact about the phase the interest is STILL
   * in today, so it applies from month 0, precisely as `Household.persons[].superInterests[].phase`
   * would already read `'accountBasedPension'` for that Person had the file been written after the
   * conversion. This is unlike `LUMP_SUM_FROM_SUPER` right above: a withdrawal is money that moved
   * once and is already reflected in a stated balance, while a phase is a standing fact the walk
   * would otherwise have to re-derive every month it is asked.
   */
  TRIS_EARLY_CONVERSION: 'level',
  /**
   * LEVEL. "From this date this TTR pays 7% a year" is a rate still in force until another replaces
   * it — `RETURN_CHANGE`'s reasoning. One dated before `asAtDate` is the rate the stream pays today.
   */
  TTR_RATE_CHANGE: 'level',
  /**
   * LEVEL. "From this date the death cover is cancelled" is a state of the account until another
   * change replaces it — `TTR_RATE_CHANGE`'s reasoning, per interest and benefit.
   */
  INSURANCE_COVER_CHANGE: 'level',
  /**
   * LEVEL. A refinance sets the loan's terms, and those terms are the terms the loan still carries.
   * **Specified by P3-16 slice 2** (`MortgageRefinanceParams`), and the broad reading this sentence
   * already took is now the built one: it SETS the terms, so it also originates a loan for a
   * Household that had none. One dated before `asAtDate` is the loan in force today and applies
   * from month 0 — which is right, because the stated `Household.mortgage` is the Day-1 statement
   * and a level dated before it is a statement about the same day or an earlier one.
   */
  MORTGAGE_REFINANCE: 'level',
  /**
   * EVENT. concept.md: "a dated payoff or offset milestone ... **drawn as a marker**". A marker is a
   * point on the time axis; one dated before the walk is off the left edge of the chart, and
   * redrawing it at month 0 would assert a milestone at a date the user did not choose.
   */
  MORTGAGE_TARGET: 'event',
  /**
   * EVENT. "Pay the home loan off in full this month" is a movement of money that completes: one
   * dated before `asAtDate` has already happened, so the Household's stated position — including
   * whether it states a `mortgage` at all — already reflects it, and replaying it in month 0 would
   * pay a loan out that the file says is still owed, or refuse one the file says is gone.
   */
  MORTGAGE_PAYOFF: 'event',
  /**
   * EVENT, and **arguable** — see the report. concept.md: "buy into or draw from the Non-Super
   * Portfolio; **a draw realises CGT**". A realisation is the completing kind: replaying a 2020 draw
   * would re-realise a gain already taxed and hand the household proceeds it already spent. The
   * arguable reading is a standing regular-investment plan, which this type would also have to carry;
   * as with `SUPER_CONTRIBUTION` that is a question for whoever specifies the params.
   *
   * **Chunk 3 specified the params and did NOT disturb this.** A buy dated before `asAtDate` is
   * money that is already gone and units that are already held, and the Household's `parcels` are
   * stated as at `asAtDate`, so they already contain that parcel — replaying it would both spend
   * the cash twice and create a second parcel with a cost base already accounted for. The standing
   * regular-investment plan is still the arguable reading and is still not expressible: there is no
   * recurring flag on `NonSuperInvestmentParams`, so every buy is one buy in one month.
   */
  NON_SUPER_INVESTMENT: 'event',
  /** LEVEL. A new return assumption from this date until the next one — the same shape as SPEND_CHANGE. */
  RETURN_CHANGE: 'level',
  /** LEVEL. `annualSpend` is explicitly "a level, not a delta" — the user's own worked example. */
  SPEND_CHANGE: 'level',
  /** EVENT. "car, travel, roof" — a single outflow, in its own month. The user's own worked example. */
  ONE_OFF_EXPENSE: 'event',
  /**
   * EVENT. A split is an application made in respect of one past financial year's contributions; it
   * has already moved the money between the two members' balances, and those balances are stated as
   * at `asAtDate`. It is not a standing instruction that keeps splitting.
   */
  CONTRIBUTION_SPLIT: 'event',
  /**
   * EVENT. A contribution made for a spouse in a year, already in the receiving balance. Unlike
   * `SUPER_CONTRIBUTION`, concept.md's row states no recurring flag, so nothing in the specification
   * says this one stands.
   */
  SPOUSE_CONTRIBUTION: 'event',
  /**
   * EVENT. "Sell and rebuy cheaper; releases equity, starts the 24-month proceeds window." A 2020
   * downsize has already released its equity into the stated financial assets, the cheaper home is
   * the home the Household now states, and the 24-month window has long expired. Applying it at
   * month 0 would release the equity a second time.
   */
  DOWNSIZE: 'event',
  /**
   * LEVEL, and **arguable** — see the report. Being out of the home is a state, and a household that
   * vacated in 2025 has not moved back in; classifying it as an event would silently re-occupy the
   * home. **The cost of the level reading is stated rather than hidden:** the entry also starts the
   * 2-year Age Pension exemption clock (P3-15a), and applying it at month 0 would restart a clock
   * that has partly or wholly run. Whoever wires that clock must read its start from the entry's own
   * `date` — which the entry still carries — and never from the month the level first applies in.
   */
  VACATE_HOME: 'level',
  /** EVENT. A once-per-lifetime contribution of up to $300k, made on a day and already in the balance. */
  DOWNSIZER_CONTRIBUTION: 'event',
  /**
   * LEVEL. "Start/stop a Home Equity Access Scheme income stream" — a stream that was started and not
   * stopped is still running, and the entry is the only thing that says so. (An HEAS *advance* is a
   * lump and reads as an event; it shares this name, and is the same "two types, one name" note as
   * `SUPER_CONTRIBUTION`.)
   */
  HEAS_DRAW: 'level',
  /**
   * LEVEL. The clearest case in the table, and the one that shows why "it happened on a date" is the
   * wrong test: a death before `asAtDate` is an event in every ordinary sense, and treating it as one
   * here would bring the person back to life for the whole projection.
   */
  DEATH: 'level',
  /** LEVEL. An illness-separated couple stays separated; it is a status the Age Pension rate is read off. */
  ILLNESS_SEPARATION: 'level',
  /**
   * LEVEL, and **specified (P14-13, slice 3a, 2026-09-24), superseding the earlier unspecified
   * `CARE_EVENT` placeholder of the same slot.** Entering permanent residential aged care is a state
   * a Person remains in — ongoing daily fees and a RAD accommodation payment continue every month
   * from the entry's date — not a single payment that completes. One dated before `asAtDate` is a
   * Person who is still in care today, and applies from month 0: the RAD lump sum is NOT re-paid
   * (it is already reflected in the Household's stated cash position), but the ongoing means
   * assessment and fees start immediately, exactly as `RETIRE`'s own reasoning for a standing state.
   */
  ENTER_CARE: 'level',
  /**
   * LEVEL, and **not** `MORTGAGE_PAYOFF`'s own precedent (an `event`), for `ENTER_CARE`'s reason:
   * selling the home does not merely move money once, it changes a STANDING STATUS — homeowner to
   * non-homeowner (DSS Guide 4.6.3.70/4.6.3.80) — that stays true every month afterwards. One dated
   * before `asAtDate` applies from month 0: the household is a non-homeowner from day 0 of the walk,
   * exactly as `ENTER_CARE`'s ongoing means assessment does, but the ONE-OFF cash proceeds are NOT
   * re-credited (`projection.ts`'s `homeSoldThisMonth` gate) — the Household's stated cash position
   * already reflects a sale that happened before the plan's own starting day, on `ENTER_CARE`'s RAD
   * lump sum precedent exactly.
   */
  SELL_HOME: 'level',
  /**
   * LEVEL, `HEAS_DRAW`'s own reason: renting out the home is a standing arrangement — rent arrives,
   * and costs are paid, every month from the entry's date until an optional `endDate` — not a single
   * event. One dated before `asAtDate` is a household already renting today, and applies from month
   * 0: the rent and costs are counted from the walk's first month, exactly as `HEAS_DRAW`'s own
   * pre-dated stream is.
   */
  RENT_OUT_HOME: 'level',
  /**
   * LEVEL, `SELL_HOME`'s own reason: buying a home changes a standing status (a homeowner again).
   * One dated before `asAtDate` applies from month 0; its price is not paid again, the stated cash
   * already reflects it.
   */
  BUY_HOME: 'level',
} as const satisfies Record<EntryType, EntryKind>;

/**
 * The kind of one entry type. A total function over `EntryType` by construction — `ENTRY_KIND` has
 * every key, checked by the compiler, so there is nothing for a default to cover.
 */
export const entryKindOf = (type: EntryType): EntryKind => ENTRY_KIND[type];

declare const PARAMS_NOT_YET_SPECIFIED: unique symbol;

/**
 * **"The params of this entry type have not been specified yet."** Not "specified as empty" — that
 * is `NoParams` below, and the two are different types on purpose.
 *
 * The symbol is `declare const`, so no value of this type can be constructed anywhere, by anyone.
 * `{}` is not assignable to it, a cast is the only way past it, and a later author who needs to
 * build one of these entries therefore cannot proceed without first replacing this with a real
 * shape. That is the whole mechanism: the compiler asks the question that the prose could only
 * request.
 *
 * The parameter carries the entry type's own name so the diagnostic says which specification is
 * missing rather than pointing at an anonymous object.
 */
export interface UnspecifiedParams<T extends EntryType> {
  readonly [PARAMS_NOT_YET_SPECIFIED]: T;
}

/**
 * **Specified, and specified as carrying nothing.** Distinct from `UnspecifiedParams`: this says the
 * question was asked and the answer is that the entry's date is the whole of the fact.
 *
 * `Record<string, never>` rather than `{}`, because `{}` in TypeScript accepts very nearly anything.
 */
export type NoParams = Record<string, never>;

/**
 * `RETIRE` — the date is the fact. Gainful employment ceases on it; nothing else is stated. The date is
 * the LAST DAY WORKED (2026-09-23): its month pays the days from the 1st up to and including it,
 * pro-rated by days, and the month after pays nothing.
 */
export type RetireParams = NoParams;

/**
 * `MORTGAGE_TARGET` — **a dated payoff or offset milestone, on `RetireParams`'s own precedent**
 * (P3-16a, gate ruling 2026-09-22). concept.md §5.12: *"records a planned payoff date or an offset
 * milestone as a dated entry ... It changes no arithmetic ... it makes an intention checkable."*
 *
 * **`NoParams`, not a `kind` discriminant between "payoff" and "offset milestone".** The gate found
 * this the one open question and concept.md answers it directly: one stated date, compared once
 * against the retirement date, with which milestone it means carried in the entry's own free-text
 * `note` — building two distinct computed checks would be NEW arithmetic, which §5.12 rules out in
 * its own words. The entry's `date` is the whole of the stated fact, exactly as `RetireParams` is.
 *
 * **This entry never enters `project()`'s walk as a money-moving branch, and needs none.** It
 * neither reads nor writes `Month.mortgageBalance`; the walk's generic `appliedEntryIds` bucketing
 * (`projection.ts`) already cites every dated entry in its own month regardless of type, which is
 * all a marker needs. See `outcomes.ts`'s comparison function and `mortgageHeadline.ts`'s sentence.
 */
export type MortgageTargetParams = NoParams;

/**
 * **`MORTGAGE_PAYOFF` — pay the home loan off in full, in the entry's own month.** `NoParams`: the
 * amount is not a figure the user states, it is whatever the walk says is owed that month plus that
 * month's interest (`household.ts`'s `mortgagePayoffMonth`), so a stated amount could only ever
 * disagree with it. The payout goes into the month's Waterfall target like any other outflow, so a
 * month that cannot fund it shows an `Unfunded shortfall` rather than a loan that vanished.
 *
 * **The loan's TERMS are not unset** — only the balance goes to nil, which is the same state a loan
 * that amortised away is in (`outcomes.ts`'s `mortgagePayoff` reads a nil balance as CLEAR and an
 * absent one as NO LOAN). A later `MORTGAGE_REFINANCE` is therefore a new loan, transition (vi).
 * A payoff with no loan in force, or with nothing owing, is refused in the walk by entry id and
 * month. Partial lump-sum repayments are still not expressible.
 */
export type MortgagePayoffParams = NoParams;

/**
 * **`ILLNESS_SEPARATION` — the couple live apart because of illness or care, from this date on**
 * (P12-4). `NoParams`: the date is the whole of the fact. It is a `level` in `ENTRY_KIND` and holds
 * for the rest of the walk; no entry ends one, so a couple who move back together cannot say so.
 *
 * **What it changes: the Age Pension, and nothing else.** From the entry's own month each Person is
 * paid the SINGLE maximum rate, against the couple's combined means and the COUPLE free areas and
 * deeming threshold (`agePension.ts`'s third path). Income tax keeps treating the pair as a couple,
 * SAPTO included — see the named limit at `projection.ts`'s tax call. `owner` is ignored, on
 * `SPEND_CHANGE`'s ruling: a separation is a fact about the couple. A Household of one Person is
 * refused at the door (`parsePlan`), because there is nobody to be separated from.
 */
export type IllnessSeparationParams = NoParams;

/**
 * **`DEATH` — the owner dies, and the other Person carries on alone** (P12-1, 2026-09-24, the user's
 * ruling "option A"). `NoParams`: the owner and the date are the whole of the fact. It is a `level`
 * in `ENTRY_KIND` — nobody comes back — and it takes effect from the first day of its own month.
 *
 * **What changes from that month.** The survivor is means-tested as a SINGLE person. Every one of
 * the deceased's super interests is cashed that month as ONE lump sum into household cash — tax-free
 * to a spouse (ITAA 1997 s 302-60), with no transfer balance account effect for the survivor. Their
 * non-super parcels pass to the survivor at their own cost base and acquisition date (ITAA 1997
 * Div 128). Their salary, the Guarantee on it, and every pension payment stop. Where both were paid
 * the Age Pension, the survivor gets the lump sum bereavement payment (`core/bereavement.ts`). Income
 * tax treats the pair as a couple to the end of the financial year of the death and the survivor as
 * single from the next. Spending is NOT changed: a household that spends less states a
 * `SPEND_CHANGE`.
 *
 * **Refused.** `owner: 'household'` and a Household of one Person at the door (`parsePlan`); in the
 * walk, a second death, a death dated before the forecast starts, a death while an
 * `ILLNESS_SEPARATION` is in force, and any entry that reaches the deceased dated in or after the
 * month of the death — see `projection.ts`'s `deathOf`.
 */
export type DeathParams = NoParams;

/**
 * **`ENTER_CARE` — one Person moves into permanent residential aged care** (P14-13, slice 3a,
 * 2026-09-24, superseding the earlier unspecified `CARE_EVENT` placeholder). `owner` is `personA`
 * or `personB` — never `household` (`parsePlan`'s `checkEnterCares`): entering care is one Person's
 * own fact.
 *
 * **Why these three fields, and no others (register §12.6, §12.8, §12.9).** The home value, the
 * RAD price and how much of it is paid as a lump sum are all facility- and market-specific facts
 * this build cannot forecast — the user ruling of 2026-09-24 is that they are ENTRY params, never
 * Settings, because unlike a legislated rate they are unknowable before the day they are agreed.
 * Everything else the means test and the fees need (the resident's own income and assets, the
 * partner's presence, the rates themselves) is already on the walk or in `data/assumptions/agedCare.ts`.
 */
export interface EnterCareParams {
  /** The WHOLE household's home value on the day of entry — never a Setting; see the header above. */
  readonly homeValue: Cents;
  /** The agreed Refundable Accommodation Deposit price for the room. */
  readonly radPrice: Cents;
  /** How much of `radPrice` is paid as a lump sum on entry; the rest accrues as a Daily Accommodation Payment. `0`..`radPrice`. */
  readonly radPaidAsLumpSum: Cents;
}

/**
 * **`SELL_HOME` — the household sells its home outright (P14-13, 2026-09-25).** `owner` is ignored
 * (`MORTGAGE_REFINANCE`'s own ruling): a home is a Household fact, not one Person's. The entry's own
 * `date` is the settlement day.
 *
 * **`salePrice`/`sellingCosts`.** `salePrice` is the household's own estimate of what the home will
 * fetch — unknowable before it is agreed, `EnterCareParams.homeValue`'s own reasoning, entered the
 * same way. `sellingCosts` (agent's commission, conveyancing) is optional and defaults to nil at the
 * point of use (`Household.openingOffsetBalance`'s own idiom) rather than at the door, so the type
 * keeps the project's usual rule — absence is a fact, never silently a number — while the walk still
 * has a plain zero to add.
 *
 * **What happens on sale, all sourced (see `projection.ts`'s `SELL_HOME` block for the citations):**
 * the sale price, less selling costs, less any mortgage still owing, less any Home Equity Access
 * Scheme debt (capped at the proceeds by the No Negative Equity Guarantee, SS Act s 1144AA) lands in
 * household cash; the home's main residence CGT exemption is total (ITAA 1997 Subdiv 118-B), so no
 * capital gain is ever computed on it — there is no CGT parcel for a home to begin with (ADR-0005);
 * the household becomes a non-homeowner for the Age Pension from this month (DSS Guide 4.6.3.70/
 * 4.6.3.80 — `HomeStatus.noHome`), UNLESS `newHomeAmount` is stated (below); and the home stops
 * being an aged-care asset (its net value falls to nil in `agedCareMeansAssessment`'s `home` field),
 * so the proceeds are what the aged care means test assesses instead, with no home exemption cap to
 * apply to a home that no longer exists. The aged-care side does NOT read `newHomeAmount` — that
 * carve-out is P14-13c's own Age Pension slice, sourced to the Guide's Age Pension chapter alone.
 *
 * **`newHomeAmount` — the sale-proceeds exemption's set-aside amount, MODELLED from P14-13c
 * (2026-09-25), DSS Guide 4.6.3.90.** The part of the proceeds the household intends to apply to a
 * NEW home is excluded from the Age Pension assets test for up to 24 months from settlement (every
 * sale this forecaster can state falls under the 1 January 2023 rule; the 36-month discretionary
 * extension is NOT modelled), the household is assessed as a homeowner throughout the window
 * (`HomeStatus.noHomeSaleProceedsExempt`), and the amount is still deemed for the income test — at
 * the LOWER rate only, separately from the household's other financial assets
 * (`AgePensionEntitlement.saleProceedsSetAsideDeemedPerFortnight`). Optional; absent, nothing about
 * this exemption applies and the household is a non-homeowner from settlement, exactly as before
 * P14-13c. Checked at the door against `salePrice − sellingCosts` (`parsePlan`'s own net-proceeds
 * figure): a household cannot set aside more than it actually nets from the sale.
 *
 * **`newHomePurchaseDate` is refused by name if stated: `BUY_HOME` (P14-19, 2026-09-25) is the one
 * writer of the purchase date.** A `BUY_HOME` inside the window ends it from its own month.
 */
export interface SellHomeParams {
  /** The household's own estimate of what the home will sell for. */
  readonly salePrice: Cents;
  /** Agent's commission, conveyancing and the like. Optional; absent reads as nil at the point of use. */
  readonly sellingCosts?: Cents;
  /** The part of the net proceeds set aside for a new home (P14-13c). Optional; absent models no exemption. */
  readonly newHomeAmount?: Cents;
  /** Refused if stated — the purchase is a `BUY_HOME` entry. See the header note above. */
  readonly newHomePurchaseDate?: IsoDate;
}

/**
 * **`BUY_HOME` — the household buys a new home after selling one (P14-19, 2026-09-25).** `owner` is
 * ignored, `SellHomeParams`'s own ruling; `date` is the settlement day. Both figures are the
 * household's own estimate in TODAY's money, raised to `date` (`SellHomeParams.salePrice`'s basis).
 *
 * Slice 1: only after a `SELL_HOME` in the same scenario, at most one, and not with an `ENTER_CARE`
 * or a later `HEAS_DRAW` — all refused by name at the door (`parsePlan`'s `checkBuyHomes`). The
 * price and costs are paid first from the sale's set-aside (`newHomeAmount`, while its window is
 * open), the rest through the Waterfall; a purchase the Waterfall cannot fund in full is refused
 * (`HomePurchaseUnfundedError`). From its month the home is occupied and exempt again, and the
 * sale-proceeds exemption and its deeming end — whatever is left of the set-aside is ordinary cash.
 */
export interface BuyHomeParams {
  /** The household's own estimate of the new home's price, in today's money. */
  readonly purchasePrice: Cents;
  /** Stamp duty, conveyancing and the like, in today's money. Optional; absent reads as nil. */
  readonly purchaseCosts?: Cents;
}

/**
 * **`DOWNSIZER_CONTRIBUTION` — home sale money into super (P9-5, 2026-09-25; ITAA 1997 s 292-102).**
 * `owner` is the Person contributing — the spouse who was not on the title may contribute too
 * (s 292-102(1)(c)) — and `date` is the contribution month. `amount` is in TODAY's money, raised to
 * `date` (`SellHomeParams.salePrice`'s basis).
 *
 * Refused at the door (`parsePlan`'s `checkDownsizerContributions`): no `SELL_HOME` in the scenario,
 * a date before the sale or more than 90 days after it (s 292-102(1)(g); the Commissioner's
 * extension is not modelled), an owner under 55 on the date, more than $300,000 at the date, the
 * couple's total over the sale price (s 292-102(3)), a second one for the same Person (one sale per
 * lifetime, s 292-102(1)(i)), a receiving interest that is not accumulation, and
 * `statedOwnedTenYears` absent or false. Funded through the Waterfall, from the sale's set-aside
 * first; unfundable is `DownsizerContributionUnfundedError`. No contributions tax, no cap, no
 * deduction (s 290-167, s 292-90(2)(c)(iiia)); it reaches TSB through the balance at the next 30 June.
 */
export interface DownsizerContributionParams {
  /** In today's money; at most $300,000 once raised to `date`. */
  readonly amount: Cents;
  /** Which of the OWNER's own interests, positionally. Must be accumulation. */
  readonly receivingInterestIndex: number;
  /**
   * The 10-year ownership test (s 292-102(1)(b)), stated: no purchase date is held, so it cannot be
   * checked. Required, and `true` only.
   */
  readonly statedOwnedTenYears: true;
}

/**
 * **`RENT_OUT_HOME` — the household rents its home out, WHOLE, from `date` (P14-13, 2026-09-25).**
 * `owner` is ignored (`SellHomeParams`'s own `MORTGAGE_REFINANCE` ruling: a home is a Household
 * fact). Renting a ROOM while a Person still lives in the home is not modelled — `parsePlan`'s
 * `checkRentOutHomes` refuses this entry while the household's own `vacatedProtectedPersonRemains`
 * status holds, by name, "whole-home rental only" — and there is no field here for a partial share
 * of the home to rent.
 *
 * **The five fields, all the household's own estimate, entered like `SellHomeParams.salePrice`.**
 * `weeklyRent` is required and positive: a rental for nothing is not a rental. The four annual costs
 * — `annualRates`, `annualInsurance`, `annualAgentFees`, `annualRepairs` — are each OPTIONAL and
 * independently zero-or-absent, `SellHomeParams.sellingCosts`'s own idiom, so a household that pays
 * no agent's fee (a private letting) states nothing for it rather than a zero it has to type. Kept
 * as four separate facts rather than one combined "costs" figure, `projection.ts`'s
 * `HOME_SALE_LINE_PREFIX` precedent: a reader auditing a rental wants the rates, the insurance, the
 * agent's commission and the repairs apart, not a net figure with nothing behind it.
 *
 * **`endDate`, optional, `HeasDrawParams.stopDate`'s own idiom: the household moves back in (or the
 * tenancy simply ends) and the home reverts to being lived in.** Refused if not after `date`
 * (`checkRentOutHomes`) — a tenancy cannot end before or in the month it starts.
 *
 * **What renting does, all sourced (see `projection.ts`'s `RENT_OUT_HOME` block for the citations
 * and what is deliberately NOT modelled):** the net rent (gross rent less the four costs, floored at
 * nil for the Age Pension and aged-care means tests but NOT for income tax, where a loss can offset
 * other income — Services Australia's own "Real estate income" page, and ATO negative gearing) is
 * each owner's assessable income; it is ordinary income for the Age Pension (not deemed) and for the
 * aged-care means test; the home itself becomes an assessable, non-homeowner asset once nobody is
 * left to protect it (DSS Guide 4.6.3.60) — valued from the nearest stated estimate this build
 * holds, `EnterCareParams.homeValue`, or refused by name if there is none (`HomeStatus.rentedOut`'s
 * own doc); and a later `SELL_HOME` more than 6 years after THIS entry's `date` is refused by name —
 * the ATO's main-residence "6-year rule" (Subdiv 118-B) turns a rental of that length into a PARTIAL
 * exemption this build does not compute, so it refuses rather than approximate one.
 */
export interface RentOutHomeParams {
  /** What the household expects to receive each week, before costs. */
  readonly weeklyRent: Cents;
  /** Council rates for the year. Optional; absent reads as nil at the point of use. */
  readonly annualRates?: Cents;
  /** Building and landlord insurance for the year. Optional; absent reads as nil at the point of use. */
  readonly annualInsurance?: Cents;
  /** The property agent's commission and letting fees for the year. Optional; absent reads as nil at the point of use. */
  readonly annualAgentFees?: Cents;
  /** Repairs and maintenance for the year. Optional; absent reads as nil at the point of use. */
  readonly annualRepairs?: Cents;
  /** When the tenancy ends and the household resumes living in the home. Optional; absent is "still renting". */
  readonly endDate?: IsoDate;
}

/**
 * **`HEAS_DRAW` — the Home Equity Access Scheme's FORTNIGHTLY INCOME STREAM, PER PERSON (P9-2a,
 * 2026-09-25, superseding slice 1's household-level simplification).** `owner` is `personA` or
 * `personB` — never `household` (`parsePlan`'s `checkHeasDraws`, `ENTER_CARE`'s own precedent):
 * `data/assumptions/heas.ts`'s own `coupleStructure` fact (SS Guide-sourced, present since slice 1
 * and unchanged by this one) settles the "one joint facility or two" question the slice-1 gate left
 * open — **each Person has their own loan against their own share of the security**, both loans
 * priced off the SAME younger-partner age component. So a couple states up to TWO of these entries,
 * one per Person, never one `household`-owned entry standing for both. `ENTRY_KIND.HEAS_DRAW` is
 * still `'level'` — a stream started and not stopped is still running — and `parsePlan` refuses a
 * SECOND entry for the SAME Person, `checkEnterCares`' "no partial change" idiom narrowed (was "one
 * per file" to "one per Person".
 *
 * **`securityValue` is still the WHOLE household's home value** (ADR-0005, "Where the value
 * lives", 2026-09-04) — `EnterCareParams.homeValue`'s own shape: a shared asset stated once in
 * spirit even though the entry belongs to one Person. `checkHeasDraws` refuses a couple's two
 * entries if they disagree about it, because they price two loans against one home. Each Person's
 * OWN loan then takes their own share of it — 50-50 by default for a couple, the whole of it for a
 * Person drawing alone — and T37's $10,000 floor applies to that SHARE, not to the whole figure.
 *
 * **`fortnightlyAmount` is either a stated `Cents` or the literal `'maximum'`.** Stated is checked
 * at the door against the ABSOLUTE 150% ceiling on THIS Person's own maximum payment rate
 * (`heasFortnightlyCap`) — half the couple's combined rate for a member of a couple, the single
 * rate for a Person drawing alone — not the household's own netted allowance, which moves with the
 * Age Pension actually paid and can only be known inside the walk. `'maximum'` draws exactly that
 * netted allowance every fortnight: 150% of THIS Person's own maximum payment rate LESS the Age
 * Pension THIS Person actually receives that fortnight (`entitlement.perPersonRatePerFortnight`),
 * so a household whose pension changes has each Person's loan payment adjusted with it.
 *
 * **T36 — the age component is an ANNUAL STEP FUNCTION, not a figure fixed at the entry's start.**
 * `project()` recomputes it every month the draw is active, off the age(s) at that month
 * (F2019L00420 s 4(1)(b); SS Guide 3.4.5.30): the younger partner's age at last birthday for a
 * couple (both Persons' loans use it), or this Person's own age when they draw alone. A birthday
 * raises `capacity` and can let a clamped draw resume from that month — `HeasCapacityCapNote` is
 * emitted again each time the cap newly binds, not once for the whole walk.
 *
 * **`advances` — lump-sum advances, P9-2b, register §5.3's ambiguity resolved (T136).** Optional,
 * per Person (one `HEAS_DRAW` entry is already one Person's own loan, so a list here is that same
 * Person's own advances — never the household's). Each is paid into cash in its own fortnight and
 * joins the balance BEFORE that fortnight's interest, exactly as an ordinary draw does (s 1135(3),
 * T40's own order). `parsePlan`'s `checkHeasDraws` refuses one outside the draw's active span, a
 * THIRD advance in any rolling 26-fortnight window keyed to that window's first advance (s
 * 1134A(2)(b)), and a window total over 50% of the ANNUAL maximum payment rate (s 1134A(3)(a),
 * `heasAdvanceCap`/`heasAdvanceAvailable`). While a window is active, `project()` replaces the
 * ordinary "maximum" fortnightly draw with `heasFortnightlyDrawDuringAdvancePeriod` — `max(0,
 * (annual headroom − advances taken in the window) ÷ 26)` — for the WHOLE window, not merely the
 * fortnights after the advance (Services Australia's own "George" example, pinned to the cent).
 * **Means-test consumption is punted, deliberately (T138):** the advance is ordinary cash the
 * moment it lands — deemed and assessable from day one, with no 90-day home-security exemption
 * modelled — which is the CAUTIOUS side of §5.7's rule, never the generous one. **The part-rate-
 * pensioner floor case is UNCONFIRMED (T137)** and `project()` refuses it by name rather than guess.
 */
export interface HeasAdvance {
  /** The day the advance is paid — must fall within the draw's own active span. */
  readonly date: IsoDate;
  /** The lump sum paid, in cents — more than nothing. */
  readonly amount: Cents;
}

export interface HeasDrawParams {
  /** `home market value − outstanding Owner-Occupied Mortgage − nominated amount` (ADR-0005, T42). */
  readonly securityValue: Cents;
  /** A stated fortnightly draw, checked against the ABSOLUTE 150% cap at the door; or `'maximum'`. */
  readonly fortnightlyAmount: Cents | 'maximum';
  /** When the stream stops drawing. Interest keeps compounding on the debt already drawn (T41). */
  readonly stopDate?: IsoDate;
  /** Lump-sum advances against this SAME Person's own loan (P9-2b) — see the header note above. */
  readonly advances?: readonly HeasAdvance[];
}

/**
 * `RETURN_CHANGE` — a new PER-PERSON annual investment return assumption from this date, in the
 * idiom `SPEND_CHANGE` already uses (P2-11, gate ruling GO-VIA-DIFFERENT-SHAPE, 2026-09-22).
 *
 * **What this is NOT, said plainly because the item this ships against was designed around it.**
 * concept.md §5.13's Glide Path was drawn as a *Dated Parameter* — age bands resolving into
 * synthetic `RETURN_CHANGE` entries the household never sees stated. That generic mechanism
 * (P6-3) is still unbuilt and this entry does not build it, resolve into it, or depend on it. This
 * is the plain, explicit, user-stated shape `MORTGAGE_TARGET` and `NON_SUPER_INVESTMENT` already
 * shipped in: a household that wants three bands states three of these entries by hand, the same
 * way any other dated change works today. A wizard that generates several from one input is a
 * named, separate follow-on and is not this.
 *
 * **PER-PERSON, not per-account (the gate's first ruling).** One rate applies to all of a Person's
 * accounts and parcels together — `nominalReturn`'s own "not per-account" reasoning, narrowed by
 * one entry's `owner` rather than widened past it. Nothing in `src/` yet distinguishes one
 * account's return from another of the same Person's, and building that disambiguation ahead of
 * being asked for it is exactly the shape of invention this file's header forbids.
 */
export interface ReturnChangeParams {
  /**
   * The nominal annual investment return, as a decimal — `nominalReturn`'s own convention and
   * own units — from this entry's date until the next `RETURN_CHANGE` for the same owner, or the
   * end of the walk. A LEVEL, not a delta: this entry replaces the rate in force, it does not
   * adjust it.
   *
   * Finite is the only door check (`parsePlan`, `nominalReturn`'s own precedent) — a negative rate
   * is a real, if bleak, assumption a household can state, not a shape the engine cannot act on.
   */
  readonly rate: number;
}

/**
 * `SPOUSE_CONTRIBUTION` — **an after-tax contribution paid, once, in this entry's own month, into
 * the OTHER Person's superannuation** (P3-19, 2026-09-22). concept.md's row is "person → person";
 * the owner is the CONTRIBUTOR and the receiving spouse is the ONLY OTHER Person a Household this
 * build can hold — `owner: 'household'` is refused at the door on `LumpSumFromSuperParams`'s
 * ground, and a Household with only one Person is refused too, because there is nobody for it to
 * name. Unlike `SUPER_CONTRIBUTION` this is an `event`, on `LumpSumFromSuperParams.amount`'s own
 * idiom: it happens once, in the month the entry falls in, and does not stand as an arrangement a
 * later entry supersedes.
 *
 * **It is deliberately NOT concessional and carries no `kind`.** The money is the contributor's
 * own after-tax cash, so the fund's 15% contributions tax never applies to it (`incomeTax.ts`'s
 * `spouseContributionOffset` is the only tax effect this entry has, and it is on the
 * CONTRIBUTOR's own return, not a fund charge on the receiving interest) — `SUPER_CONTRIBUTION`'s
 * four-kind union is a different type for a different kind of money and is not reused here.
 *
 * **The tax offset is a CONSEQUENCE of this entry, never a field on it.** Whether s 290-230
 * actually produces $540, less, or nothing turns on the receiving spouse's income for the whole
 * financial year — a fact this one dated entry cannot state and the walk works out at the
 * financial year's own true-up (`projection.ts`).
 */
export interface SpouseContributionParams {
  /**
   * What is paid, once, in the month of the entry's date. Refused at nil and below
   * (`LumpSumFromSuperParams.amount`'s ground): a contribution of nothing is not a fact this entry
   * exists to state.
   */
  readonly amount: Cents;
  /**
   * **WHICH of the RECEIVING spouse's interests, positionally — `Person.superInterests[receivingInterestIndex]`**,
   * on `SalarySacrificeContributionParams.interestIndex`'s ruling and for the identical reason: a
   * Person may hold more than one interest, and an absent index would have to mean "the only one"
   * — a rule that breaks silently the day the receiving spouse opens a second. **It names the
   * OTHER Person's account, never the owner's own** — the field is spelled `receivingInterestIndex`
   * rather than `interestIndex` so that fact cannot be misread from the name alone.
   */
  readonly receivingInterestIndex: number;
}

/** `WORK_PATTERN_CHANGE` — concept.md: "person — days/week; **how TTR is expressed**". */
export interface WorkPatternChangeParams {
  /**
   * Days worked per week from this date. A fraction is allowed (0.5 of a day is a real roster), and
   * `0` is a *pattern*, not a retirement: `RETIRE` is the entry that satisfies a Condition of
   * Release, and dropping to zero days does not.
   *
   * **Descriptive of `annualSalary` from 2026-09-19, except at zero.** Once the entry states the
   * money, the days figure no longer has to be turned into money by anybody — it records WHY the
   * salary changed, and the projection reads no rate off it. Zero remains distinguished, because
   * zero days is the one pattern whose salary is known without being stated.
   */
  readonly daysPerWeek: number;
  /**
   * **The Person's salary per YEAR from this date — the field the caller states, added 2026-09-19.**
   *
   * **In TODAY's wages (2026-09-23, user ruling).** The figure is read at the wage level of
   * `Settings.asAtDate` — never the entry's own date, on `SpendChangeParams.annualSpend`'s precedent
   * — and `project()` raises it to each month's wage level by `economicSeries.awote`, every month.
   * `Person.employmentIncomePerFortnight` is read the same way.
   *
   * A LEVEL, like every other figure an entry carries: it holds until another `WORK_PATTERN_CHANGE`
   * supersedes it, and it REPLACES `Person.employmentIncomePerFortnight` annualised, for this
   * Person, from this month. `RETIRE` still wins over one dated on or before it — retirement is not
   * a work pattern. One with positive days dated strictly after the `RETIRE` is going back to work
   * and pays again (retire flow S3, 2026-09-29; `workSpells`).
   *
   * **Required, and it closes a stated gap rather than adding a convenience.** Until this field
   * existed, `projection.ts` applied a `WORK_PATTERN_CHANGE` only at `daysPerWeek === 0`, because
   * three days a week "cannot be turned into a figure without inventing a five-day baseline" — so
   * a Person who dropped to three days went on being paid their full wage for the rest of the walk,
   * over-stating salary, tax and household income in the flattering direction. Making the field
   * optional would have left that gap reachable by omission, which is the shape of defect this
   * change exists to remove; stating "3 days a week" now means stating what 3 days pays.
   *
   * **`parsePlan` refuses the two ways this can contradict `daysPerWeek`**: zero days with a
   * non-zero salary, and positive days with a nil salary. Either combination states two
   * incompatible things about one date, and the engine would honour one and ignore the other.
   */
  readonly annualSalary: Cents;
}

/** `SPEND_CHANGE` — a new Household ANNUAL spending level from this date (concept.md: household, phasing). */
export interface SpendChangeParams {
  /**
   * The Household's total spending per YEAR from this date until the next `SPEND_CHANGE`. A level,
   * not a delta, so a `SPEND_CHANGE` can be read on its own without replaying every earlier one.
   *
   * ⚠️ **STATED IN TODAY'S MONEY — a REAL figure, raised to each month's price level by the walk
   * (register O85, user ruling of 2026-09-21).** It is the second field in this file that is, after
   * `Settings.contingencyFloor`, and for the same reason: a household saying *"we live on $84,000"*
   * is naming a standard of living, not a quantity of future banknotes. `project()` multiplies it by
   * `priceLevelFactor(economicSeries.cpi, asAtDate, month)` before taking the twelfth — one
   * expression, `core/priceLevel.ts`, shared with the Contingency Floor. Held flat, as it was until
   * that ruling, it fell in real terms across the whole walk and made the money last longer than it
   * would, which is the flattering direction.
   *
   * The basis is `Settings.asAtDate` and NOT this entry's own date; the reason is at the target in
   * `projection.ts`. `OneOffExpenseParams.amount` is NOT indexed — see it.
   *
   * **Annual by the user's ruling of 2026-09-16, against a monthly first draft.** The tick is
   * monthly and the monthly figure is what the Waterfall spends, so the projection MUST divide —
   * and the division is the point: the spending history this is seeded from derives a
   * **trailing-12-month** baseline, and a household states its own spending in annual terms.
   * Storing the monthly figure would mean the number the user typed is nowhere in the plan file
   * and every display of it is a reconstruction. Whoever first divides this owes a decision on
   * the remainder — twelfths of an annual cent figure do not divide evenly, and the rounding
   * belongs in one place with a test, not at each call site.
   *
   * A go-go / slow-go / no-go preset is not a field here. ADR-0004: presets **generate visible
   * entries** rather than applying a hidden curve, so a preset is several of these and each one is
   * separately visible and overridable.
   */
  readonly annualSpend: Cents;
}

/** `ONE_OFF_EXPENSE` — a single outflow in this entry's month (concept.md: "car, travel, roof"). */
export interface OneOffExpenseParams {
  /**
   * Spent once, in the month of the entry's date. What it was for goes in the entry's `note`.
   *
   * ⚠️ **NOMINAL — the cents stated here are the cents charged, in whatever month the entry falls,
   * and nothing indexes them.** Left as it was when `SpendChangeParams.annualSpend` was ruled REAL
   * (register O85, 2026-09-21), deliberately and not by omission: a one-off is very often a PRICE
   * someone has been quoted for a dated purchase — *"the $40,000 car I will buy in 2030"* — which is
   * a nominal fact, where a spending level is a standard of living and therefore a real one. Nothing
   * in this field distinguishes the two readings, and guessing would be this build answering a
   * question the user was never put.
   *
   * **Stated with its direction, because it has one: read as today's money it UNDERSTATES a dated
   * cost and therefore flatters the plan** — a $38,000 roof in 2029 buys $35,142 of 2026 roofing at
   * 2.5% CPI. ~~Register **O86** carries the open question~~ — ✅ **O86 is CLOSED from 2026-09-21 by
   * user ruling and the answer is NOMINAL: *a one-off is an amount as at a date, so indexation is
   * not relevant to it.*** Nothing here changed with that ruling; what changed is that the reading
   * above is now decided rather than assumed, and the FORM carries it — *"Amount, as it will cost
   * on the day"* is what tells the user which figure the box wants, so the direction recorded above
   * is the direction a reader who ignores the label would be flattered in, not a defect in the
   * model. The label is the ruling and must not be softened.
   */
  readonly amount: Cents;
}

/**
 * `NON_SUPER_INVESTMENT` — **a BUY into the Non-Super Portfolio or a SELL out of it** (P3-20c,
 * P3-21f chunks 3 and 4). concept.md's row is "buy into **or draw from** the Non-Super Portfolio; a
 * draw realises CGT", and from chunk 4 both halves are specified.
 *
 * **`direction` is the DISCRIMINANT of a two-member union, and the two members do not share their
 * fields.** A buy states the incidental costs of *acquisition* (s 110-25) and a sell states which
 * parcels to select; neither field is constructible on the other, so `incidentalCostsOfAcquisition`
 * on a sell is a compile error rather than a figure nobody reads. Anything that is neither `'buy'`
 * nor `'sell'` — `'draw'`, `'BUY'`, an absent field — does not compile, and `projection.ts` refuses
 * it again at run time, because a stored plan and a `.mjs` fixture never meet the compiler.
 *
 * **A buy must be FUNDED and a sell must be HELD, and neither is expressible here** — both are facts
 * about the month the entry falls in rather than about the entry. `project()` charges a buy against
 * the Waterfall's running cash as an outflow, exactly as it charges an `ONE_OFF_EXPENSE`, and pays a
 * sale's proceeds into the same running cash; see the `NON_SUPER_INVESTMENT` block there.
 */
export type NonSuperInvestmentParams = NonSuperInvestmentBuyParams | NonSuperInvestmentSellParams;

/** `NON_SUPER_INVESTMENT` with `direction: 'buy'` — money leaving the cash and arriving as a parcel. */
export interface NonSuperInvestmentBuyParams {
  readonly direction: 'buy';
  /**
   * **What the UNITS cost**, in the month of the entry's date — the consideration for the asset
   * itself, brokerage excluded. It becomes the parcel's `marketValue`; the parcel's `costBase` is
   * this plus `incidentalCostsOfAcquisition`.
   *
   * ⚠️ **They are NOT the same figure, and chunk 3's doc said they were.** That sentence was true
   * only while there was no field for brokerage: an incidental cost of acquisition is **paid** and
   * **buys no units**, so a $50,000 buy with $30 of brokerage is $50,030 of cash out, a $50,030 cost
   * base and a $50,000 market value. The parcel is under water by the brokerage from the moment it
   * exists, which is correct, and is what a real disposal nets off.
   */
  readonly amount: Cents;
  /**
   * **Brokerage and every other incidental cost of acquisition — ITAA 1997 s 110-25, ruled
   * 2026-09-17.** Part of the CGT cost base, so it raises the cost base and lowers the taxable gain.
   * It is **paid** — the cash outflow is `amount + this` — and it buys nothing: the means test reads
   * `marketValue`, which this does not raise, so no Age Pension figure moves because a buy carried
   * brokerage.
   *
   * **Required, and `toCents(0)` is how an entry says there was none.** "Nobody stated brokerage"
   * and "there was no brokerage" are different facts and only one of them belongs in a file that
   * must still mean the same thing in five years — the same ground `enabled` above is required on.
   * The default this replaces (ignoring incidental costs) over-stated the gain and the tax; the user
   * chose accuracy over that conservatism.
   */
  readonly incidentalCostsOfAcquisition: Cents;
}

/**
 * **Which parcel a disposal sells first.** `Parcel[]` order is the Household's stated order and is
 * never a policy; this field is the policy, per disposal.
 *
 *   * `oldest-first` — **FIFO, and the DEFAULT (P3-21a, ruled 2026-09-17).** The registry default,
 *     and the one that maximises the chance a parcel has passed the 12-month mark and so earns the
 *     50% discount.
 *   * `highest-cost-base-first` — minimise the gain realised this year.
 *   * `lowest-cost-base-first` — realise gain deliberately, in a year that can absorb it.
 *
 * ⚠️ **The two alternatives are TACTICS FOR A PARTICULAR YEAR rather than defaults worth running
 * silently for forty**, which is exactly why FIFO is the default and this field exists: P3-21d's
 * sequencing lever is the case for choosing against FIFO in a low-income year, and ADR-0004 says a
 * model proposes and does not dispose. It is **optional** because a stated default is the one thing
 * a user should not have to restate on every disposal — and `projection.ts` exports
 * `DEFAULT_PARCEL_SELECTION` so the default is a named value rather than a `??` buried in a branch.
 */
export type ParcelSelection = 'oldest-first' | 'highest-cost-base-first' | 'lowest-cost-base-first';

/** `NON_SUPER_INVESTMENT` with `direction: 'sell'` — a CGT disposal, never a negative buy. */
export interface NonSuperInvestmentSellParams {
  readonly direction: 'sell';
  /**
   * **The PROCEEDS wanted**, in the month of the entry's date — market value out of the portfolio
   * and cash into the running balance. Capped at what the Person actually holds, exactly as a buy is
   * capped at the cash on hand; a Person holding less sells what there is, and one holding nothing
   * sells nothing and emits no line.
   *
   * ⚠️ **Incidental costs of DISPOSAL are deliberately NOT a field here, and that is chunk 4's
   * stated choice rather than an omission.** See `disposalFromSell` in `projection.ts`, where the
   * reasoning and the direction of the residual are written out.
   */
  readonly amount: Cents;
  /** Which parcel goes first. Absent means `DEFAULT_PARCEL_SELECTION` — FIFO. See `ParcelSelection`. */
  readonly parcelSelection?: ParcelSelection;
}

/**
 * `LUMP_SUM_FROM_SUPER` — **a withdrawal out of ONE superannuation interest, stated by the
 * household** (P4-6's residual, specified 2026-09-19).
 *
 * concept.md's row is "person — amount; condition of release gated", and both halves are here: the
 * amount is below, and the gating is `superLumpSum.ts`'s, which goes through `conditionOfRelease`
 * and refuses rather than guessing. What this type deliberately does NOT carry is any tax figure —
 * the tax is computed (and, at the age this build supports, computed as an asserted nil), never
 * stated.
 *
 * **The owner must be a Person.** `owner: 'household'` is refused at the door and again in the
 * walk: a lump sum is paid out of one member's interest, the two members' interests are taxed and
 * means-tested separately, and a household-owned one would have to guess whose money it was.
 */
export interface LumpSumFromSuperParams {
  /**
   * What the Person asks to withdraw, in the month of the entry's date.
   *
   * Capped at the interest's balance rather than refused — the reasoning is on `SuperWithdrawal.paid`
   * in `superLumpSum.ts`, and the short of it is that the balance in the entry's month is forty
   * years of this walk's own arithmetic away and the author cannot know it. The month reports both
   * figures, so a capped withdrawal is visible as one.
   */
  readonly amount: Cents;
  /**
   * **WHICH interest, positionally — `Person.superInterests[interestIndex]`.**
   *
   * **Required, and the ambiguity is refused rather than resolved** (user ruling, 2026-09-19). A
   * Person may hold more than one interest; they may be in different phases, and the phase decides
   * whether this build can honour the withdrawal at all. An absent index would have to be read as
   * "the only one" — which is a rule that works until the day a second interest is added to the
   * Household, and then silently withdraws from a different account than it did yesterday. There
   * is no default here for the same reason `Entry.enabled` has none.
   *
   * An index that names no interest is refused in `projection.ts`, by the entry's id: the length of
   * `superInterests` is a fact about the Household and not about the entry, so the door cannot see
   * it.
   */
  readonly interestIndex: number;
}

/**
 * `TRIS_EARLY_CONVERSION` — **a user-stated EARLY conversion of one Transition-to-Retirement
 * interest to a full Account-Based Pension (Retirement Phase), before that Person's 65th
 * birthday** (P3-8's "conversion limb" sub-item; ruled and re-ruled by the user 2026-09-22).
 *
 * **The entry's own `date` IS the conversion day.** There is no second date field, on `RETIRE`'s
 * and `MORTGAGE_TARGET`'s idiom: a dated Journal Entry already says when the thing it states
 * happened, and a nested day would be a second, driftable copy of the one fact this entry exists
 * to carry.
 *
 * **What this build actually adds is narrower than a full conversion mechanism.** A silent
 * household — no entry at all — still converts automatically at the 65th birthday under EXISTING,
 * ALREADY-CORRECT logic (`trisConversionDayUnderItem106`, R13, `trisConversionDay.ts`), which this
 * type does not touch and does not replace. What this type adds is the one thing that logic
 * cannot supply on its own: a household genuinely converted EARLIER, from Preservation Age up to
 * (but not including) 65, and said so on a specific day. The two halves are wired together only
 * when a live projection is built to read this entry — deliberately not yet done (see
 * `planEdits.ENTRY_TYPES_NOT_YET_WALKED`).
 *
 * **A stated day ON OR AFTER the named Person's 65th birthday is refused at the door, by name**
 * (`parsePlan.ts`). Item 106 has already converted the stream automatically by that day, with no
 * notification and no election, so a "conversion" stated for that day or later states a fact that
 * is either redundant with the automatic backstop (on the birthday itself) or impossible (after
 * it) — `trisConversionDay.ts`'s own R13 contradiction, restated at this entry's own door rather
 * than resolved a second way.
 *
 * **What this type deliberately sidesteps, rather than resolves: O65** — the open legal question
 * over a Person who meets two different legal grounds for release at different times
 * (`trisInterest.ts`'s own header). The pure function that turns this entry's facts into a
 * converted interest (beside `trisInterest.ts`, not inside it) never reads a Condition of
 * Release's `.grounds` and never imports `trisInterestOrRefuse` or
 * `trisConversionDayUnderItem106`. Which side of O65 a Person would fall on is simply never asked:
 * a caller who states their own early day has made the routing decision themselves.
 */
export interface TrisEarlyConversionParams {
  /**
   * **WHICH interest, positionally — `Person.superInterests[interestIndex]`.**
   *
   * Required, on `LumpSumFromSuperParams.interestIndex`'s ruling and for the same reason: a Person
   * may hold more than one interest, and an absent index would have to mean "the only one" — a
   * rule that breaks silently the day a second interest is added.
   *
   * `parsePlan` cross-checks it against the Household: an index that names no interest is refused
   * by name, and so is an index naming an interest whose stated `phase` is not `'ttr'` — this
   * entry converts a transition-to-retirement income stream, and nothing else.
   */
  readonly interestIndex: number;
}

/**
 * `TTR_START` — **from `date`, one of the owner's accumulation accounts becomes a transition to
 * retirement income stream** (retire flow S4, user ruling 2026-09-29: "need a start ttr date").
 *
 * **The mechanism is a phase change of an account the plan already states, never a new account.**
 * The walk cannot open an account part-way through, so the money the member will move into the TTR
 * is stated today as a second accumulation account, and this entry names it. Before `date` it is
 * accumulation in every respect (the younger-partner exemption, earnings tax, fees); from `date` the
 * walk reads it as `'ttr'` (paid between the Schedule 7 minimum and 10%, still taxed as
 * accumulation, assessed and deemed for the Age Pension, closed to contributions); it converts to an
 * account-based pension at the earliest of a later `RETIRE` and the 65th birthday (item 106). That is
 * the same `conversionDay` map the switch at retirement writes, so there is one expression of when
 * an account changes phase. A `ttr` phase written straight into the Household would be assessed for
 * the Age Pension from month 0, before the stream exists; this entry is what avoids that.
 *
 * Refused at the door (`checkTtrStartTargets`): a `household` owner, an account that is not in the
 * file or is not accumulation, the account the employer's Guarantee is nominated into, a Person with
 * no other accumulation account (the Guarantee still needs one), a date before the plan starts,
 * before the 60th birthday or on or after the 65th. Refused in the walk, where the Scenario is known:
 * two starts for one account, and a start on or after that Person's `RETIRE`.
 */
export interface TtrStartParams {
  /** Which of the owner's accumulation interests becomes the TTR, positionally. */
  readonly interestIndex: number;
  /** The yearly rate chosen (0.07 is 7%), `TtrRateChangeParams.drawdownRate`'s range. Absent pays the Schedule 7 minimum. */
  readonly drawdownRate?: number;
}

/**
 * `TTR_RATE_CHANGE` — **a new yearly drawdown rate for ONE transition to retirement income stream,
 * from the entry's `date` until another entry for the same interest replaces it** (TTR build step 3,
 * 2026-09-23). Before any entry, the interest's `statedStreamSettings.statedTtrDrawdownRate` is the
 * rate in force (absent = the Schedule 7 minimum).
 *
 * **Per INTEREST, not per Person.** Two TTR interests of one Person may each change rate on their own
 * day, so the walk resolves these keyed by (Person, interest) — `TRIS_EARLY_CONVERSION`'s shape —
 * and never through the `type`+`owner` levels machinery, which would keep only one of them.
 *
 * **A change inside a financial year re-sets that year's REMAINING payments.** SIS Reg Sch 7 cl 1-2
 * fixes the year's MINIMUM on its relevant day and reg 6.01(2) ("transition to retirement income
 * stream", para (b)(ii)) fixes the MAXIMUM, 10% of the balance on that same day; reg 1.06(9A)(a) only
 * requires that the year's TOTAL lies above the minimum. Nothing fixes the amount chosen between
 * the two, so a member may vary it mid-year, and the 10% stays a cap on the year's total.
 */
export interface TtrRateChangeParams {
  /** Which interest, positionally — required, on `LumpSumFromSuperParams.interestIndex`'s ruling. */
  readonly interestIndex: number;
  /** The new rate as a fraction a year (0.07 is 7%), between `parsePlan`'s `TTR_RATE_FLOOR` and `TTR_RATE_CEILING`. */
  readonly drawdownRate: number;
}

/**
 * `INSURANCE_COVER_CHANGE` — **cancel or scale back the death and/or TPD cover on ONE super interest,
 * from `date` until another change for the same interest and benefit replaces it** (P3-17a slice 3,
 * 2026-09-25). The premium for that benefit from then on is the stated premium, carried to each age
 * by `superInsurance.ts`'s ratio, × `coverFraction`: the category factor and loading cancel in the
 * ratio, so scaling the cover scales the premium. The insurance admin fee stops once every premium
 * on the account — death, TPD and income protection — is nil. Resolved per (Person, interest, benefit) off `entries` — `TTR_RATE_CHANGE`'s shape — and
 * `'both'` sets the two benefits at once.
 *
 * Refused at the door (`checkInsuranceCoverChangeTargets`): a `household` owner, an account that is
 * not in the file, no premium stated for the benefit (for `'both'`, for either), a date on or after
 * the birthday the account's cover for that benefit ends (`statedDeathCoverEndsAtAge` /
 * `statedTpdCoverEndsAtAge`, 70 when absent; for `'both'`, whichever ends first), and `coverFraction` of 1 or more — raising
 * cover needs underwriting, not modelled.
 */
export interface InsuranceCoverChangeParams {
  /** Which of the owner's interests, positionally. */
  readonly interestIndex: number;
  readonly benefit: 'death' | 'tpd' | 'both';
  /** The share of today's cover kept, 0 ≤ f < 1; 0 cancels it. */
  readonly coverFraction: number;
}

/**
 * `SUPER_CONTRIBUTION` — **a STANDING contribution into one superannuation interest, and for now
 * the salary-sacrificed kind alone** (P6-8 brief 1, specified 2026-09-19).
 *
 * **`kind` is the discriminant, and it is not decoration.** The four things concept.md's one row
 * covers — employer Superannuation Guarantee, salary sacrifice, personal deductible and
 * non-concessional — are taxed differently (the fund's 15% falls on three of them and not on the
 * fourth) and counted against caps that differ by a factor of four. A single untyped `amount`
 * would therefore be a lie in whichever direction the reader guessed, so the kind is stated and
 * every kind this build cannot honour is refused **by name** at the door rather than folded into
 * the one it can. The names are `superConcessional.ts`'s own
 * (`ConcessionalContributionComponents.salarySacrificed`), not a parallel vocabulary.
 *
 * **Only `salarySacrificed` is specified, and that is chunk 3's precedent rather than an
 * omission**: `NON_SUPER_INVESTMENT` shipped as the buy alone with `direction` already the
 * discriminant, and gained its sell later without any member changing shape. The three kinds left
 * out are left out for a stated reason, not for want of typing:
 *
 *   * **employer SG is COMPUTED, never stated.** `superContributions.superGuarantee` derives it
 *     from the Person's qualifying earnings, and an entry that also stated it would be a second
 *     copy of a fact this engine already owns — the shape that has caused three defects here.
 *   * **personal deductible needs an acknowledged notice of intent** (s 290-170), which is a fact
 *     about the Person's year rather than a figure, and `personalDeductibleContributions` refuses
 *     without it. It belongs on that branch of this union when the branch is written, required and
 *     undefaulted, because defaulting it to `true` hands the Person a deduction they may not have.
 *   * **non-concessional is typically a LUMP, not a level** — $120,000, or $360,000 under a
 *     bring-forward — and this type has no way to say "once". Running one as an annual level would
 *     contribute it every year to the horizon.
 *
 * **It is a LEVEL, in the idiom `SPEND_CHANGE` and `WORK_PATTERN_CHANGE` already use**: an annual
 * figure that holds from this entry's date until another one supersedes it. No `recurring` flag —
 * the flag on concept.md's row is what `ENTRY_KIND` calls "two types wearing one name", and the
 * answer taken here is to specify the standing arrangement and refuse the one-off rather than to
 * make one name mean both. `ENTRY_KIND.SUPER_CONTRIBUTION` is `level`, and this specification is
 * the confirmation that doc asked for.
 *
 * ⚠️ ~~**STOPPING a standing arrangement on a date is NOT expressible today, and nil is deliberately
 * not the way to say it.** `annualAmount` of zero is refused, because an entry called a
 * contribution that contributes nothing would still be listed, still be owned, and still be
 * assessed against a cap. `enabled: false` switches the arrangement off for the WHOLE walk rather
 * than from a date. Recorded as a gap in TODO P6-8 rather than closed by overloading zero.~~
 *
 * **CLOSED 2026-09-21 (P6-8 brief 4, user ruling "make it stoppable to accommodate user financial
 * choices and situation") — and closed by a SECOND MEMBER OF THIS UNION, not by overloading zero.**
 * `StopSalarySacrificeParams` is `kind: 'stopped'`: a dated entry in the same type that says the
 * standing arrangement ends here. Both refusals above stand exactly as they were — a nil
 * `annualAmount` is still refused, and `enabled: false` still means the whole walk — because the
 * new member says the thing neither of them could say, and says it in its own words.
 *
 * **Why a member of this union rather than a new entry type or an `endsOn` field on the
 * arrangement.** `NON_SUPER_INVESTMENT` is the precedent named three paragraphs above: it shipped
 * with `direction` already the discriminant and gained its second shape later without any existing
 * member changing. The same move here costs no existing plan a byte, and the discriminant is
 * already switched on by the parser, the walk and the form, so the compiler names every reader
 * that must decide what a stop means. An `endsOn` on the arrangement would make this the one level
 * type in the file that terminates itself — every other one is superseded by a later dated entry,
 * and a reader who learned the self-terminating idiom here would look for it on `SPEND_CHANGE`. A
 * separate entry type would split one arrangement across two names, which `ENTRY_KIND`'s own doc
 * refused when it declined to split this type into the level and the one-off.
 *
 * ⚠️ **SIX REASONS A MONTH CAN SHOW NO SACRIFICE, AND NO TWO OF THEM ARE ONE VALUE.** This is the
 * hazard the design is measured against, and it is stated here because this type is where five of
 * the six are decided:
 *   1. **Never stated** — no `SUPER_CONTRIBUTION` for that Person anywhere in the plan.
 *   2. **Stated, not yet started** — an arrangement dated later than this month. It is on the entry
 *      list with its own date, and `Month.appliedEntryIds` does not cite it.
 *   3. **Stated and running** — there is a contribution line, and `appliedEntryIds` cites it.
 *   4. **Stopped by the user from a date** — `kind: 'stopped'`, and the month carries a
 *      `SalarySacrificeStoppedNote` naming the entry and the date it stopped from. That note is the
 *      positive marker: it is the only one of the six that says *"an arrangement existed and the
 *      user ended it"*, and without it a stopped month and a retired month would look alike.
 *   5. **Running, contributing nil because earnings are nil** — the arrangement is still in force
 *      and `Math.min(salary, annualAmount)` is nil. There is no stop note, `appliedEntryIds` still
 *      cites the arrangement, and the absent salary line says why.
 *   6. **Switched off for the whole walk** — `enabled: false`. The entry is in the file and in no
 *      month at all: no note, no citation, and the entry list's own switched-off count.
 */
export type SuperContributionParams = SalarySacrificeContributionParams | StopSalarySacrificeParams;

/**
 * **`SUPER_CONTRIBUTION` with `kind: 'stopped'` — the standing arrangement ENDS from this entry's
 * date** (P6-8 brief 4, user ruling 2026-09-21).
 *
 * **The date is the whole of the fact, and that is why there is no other field.** It carries no
 * `annualAmount` — a stop is not a contribution of nothing — and no `interestIndex`, because a
 * Person holds at most one standing arrangement at a time (the walk keeps one level per Person, and
 * a later arrangement replaces the whole record), so there is nothing for a stop to choose between.
 * A field naming the account would invite *"stop only the part going into interest 2"*, which this
 * model cannot express and must not appear to.
 *
 * **It is a LEVEL, like the arrangement it stops.** From its date the Person sacrifices nothing,
 * until another `SUPER_CONTRIBUTION` for that Person supersedes it — and one stating an amount is
 * how a user RESTARTS. The months before it are untouched: the cap, Division 293 and the fund's 15%
 * are all computed month by month off what was in force in that month, so a stop releases the cap
 * from its own date forward and the years the arrangement did run keep every dollar they ran.
 *
 * **What is refused, at the door, in `checkContributionTargets`: a stop with nothing to stop.** The
 * most recent `SUPER_CONTRIBUTION` for the same Person strictly before this one must be an
 * arrangement. That single rule settles all three ordering questions at once — a stop dated before
 * the arrangement it means to stop (it would stop nothing, and it does NOT pre-empt a later
 * arrangement, because that is not what a level does), a second stop after a first (nothing is
 * running by then), and a stop dated in the same month as the arrangement (refused rather than
 * resolved by list order, which is not a thing a user can see).
 */
export interface StopSalarySacrificeParams {
  readonly kind: 'stopped';
}

/** `SUPER_CONTRIBUTION` with `kind: 'salarySacrificed'` — an effective salary sacrifice arrangement. */
export interface SalarySacrificeContributionParams {
  /**
   * `superConcessional.ts`'s name for this limb, spelled identically so that the entry and the rule
   * module cannot drift into two vocabularies for one thing.
   */
  readonly kind: 'salarySacrificed';
  /**
   * **What the Person sacrifices per YEAR from this date** until another `SUPER_CONTRIBUTION`
   * supersedes it. Annual for `annualSpend`'s reason: it is the figure a person states about
   * themselves, and storing a twelfth of it would mean the number the user typed is nowhere in the
   * plan file.
   *
   * ⚠️ **It does NOT reduce the Superannuation Guarantee base** (SGAA ss 10A(1)(h), 10A(4)(b), trap
   * T17). The employer still computes 12% of earnings that include this amount, and these dollars
   * go in on top. Whoever wires this into the walk gets the two totals from two separate paths —
   * `superGuarantee` and `concessionalContributions` — and netting one off the other is the trap.
   *
   * Refused at nil and below: a negative sacrifice is a withdrawal wearing the wrong entry type,
   * and see the note on stopping above for why zero is not the off switch.
   */
  readonly annualAmount: Cents;
  /**
   * **WHICH interest the money lands in, positionally — `Person.superInterests[interestIndex]`.**
   *
   * Required, on `LumpSumFromSuperParams.interestIndex`'s ruling and for the same reason: a Person
   * may hold more than one interest, reading an absent index as "the only one" works until a second
   * interest is added and then silently pays into a different account than it did yesterday. Here
   * it also decides whether the contribution can be accepted at all — a retirement-phase interest
   * cannot receive one without being commuted first.
   */
  readonly interestIndex: number;
}

/**
 * **`MORTGAGE_REFINANCE` — the home loan's TERMS, from a date (P3-16 slice 2).** The user's own
 * words for what this is for: the loan *"will change when someone buys / sells a home"*. Slice 1's
 * `Household.mortgage` was a standing fact from day one with exactly one trajectory; this is the
 * dated level that replaces it, in the idiom `SPEND_CHANGE` already uses — it holds from its date
 * until another one supersedes it, and `ENTRY_KIND.MORTGAGE_REFINANCE` is already `'level'`.
 *
 * ⚠️ **THE THREE FIGURES ARE ALL REQUIRED, AND A PARTIAL CHANGE IS NOT EXPRESSIBLE (ruling,
 * 2026-09-21).** "The rate goes to 6.4% and everything else stays" is not sayable here: state the
 * balance and the repayment again beside it. Two reasons, and they are the same two that put all
 * three on `Mortgage` itself:
 *   * *"Nothing here is defaulted, and there is no 'typical' loan"* — a figure this entry carried
 *     forward would be a figure the user did not restate and cannot see on the entry;
 *   * a partial change would make the walk reach back for *"whatever was in force"*, which is the
 *     implicit carry this codebase refuses everywhere else — `WORK_PATTERN_CHANGE` states the days
 *     AND the salary and cross-validates the pair for exactly this reason.
 * Every specified level type here replaces its whole state atomically. This one does too.
 *
 * ⚠️ **IT ALSO ORIGINATES A LOAN, and the name is the only thing that says "re" (ruling,
 * 2026-09-21).** A Household with no `mortgage` at all can acquire one from a date — the walk's
 * running loan simply starts absent, exactly as `spending` does — and because all three figures are
 * required, one entry fully specifies the loan. `ENTRY_KIND`'s own doc already took the broad
 * reading: *"A refinance SETS the loan's terms"*. The screen must not say "refinance" for it:
 * `entryLabels.ts` calls it *"Home loan — set or change the terms"*, the type name being what the
 * file stores and the label being what a person reads.
 *
 * **A change dated after the loan has been repaid is a NEW LOAN, not a refusal** — it follows from
 * origination, and refusing it would block "pay the house off, then borrow again", which is a plan
 * people really have. A mis-dated one only ever ADDS debt, so it cannot flatter the forecast.
 *
 * **What it still cannot say**, each because nobody has stated the rule: an interest-only period, a
 * redraw, an extra repayment, and — the one this type looks like it should cover — **paying a loan
 * OUT with a lump sum**, which is its own entry, `MORTGAGE_PAYOFF`, and only for the WHOLE balance. `openingBalance` of nil is refused here exactly as it is on `Mortgage`,
 * so absence stays the one spelling of "no loan" and a discharge cannot be invented by writing
 * zero. `settingsPanel.ts` and the entry form say all four on screen.
 */
export interface MortgageRefinanceParams {
  /** What is owed from this date. Whole cents, and greater than nil — see the doc above on why. */
  readonly openingBalance: Cents;
  /** The rate as a DECIMAL fraction a year, `Mortgage.annualInterestRate`'s convention. Nil is legal. */
  readonly annualInterestRate: number;
  /**
   * What is paid each month from this date, in whole cents. It must cover the month's interest —
   * and ⚠️ **the door cannot check that for a dated change**, because the interest depends on the
   * Offset Account balance AT THAT MONTH, which is an output of `project()`. `parsePlan` checks the
   * shape; the walk refuses an unpayable month by this entry's id. See `parsePlan.parseEntry`.
   */
  readonly monthlyRepayment: Cents;
}

/**
 * One Journal Entry — `{ id, date, owner, type, params, note, enabled, createdAt }` (concept.md §4).
 *
 * `Entry` itself is the discriminated union below; this is the shape every member shares.
 */
interface EntryBase<T extends EntryType, P> {
  /** Stable identity. A Scenario is a list of these, and `Month.appliedEntryIds` cites them. */
  readonly id: string;
  /** When the entry takes effect. The projection is anchored at `Settings.asAtDate`, never here. */
  readonly date: IsoDate;
  readonly owner: EntryOwner;
  readonly type: T;
  readonly params: P;
  /** Free text from the user. Optional because a user may genuinely have nothing to add. */
  readonly note?: string;
  /**
   * **`false` is the append-only-safe delete** (ADR-0002). A disabled entry is still in the
   * Scenario, still ordered, still inherited by child Scenarios, and simply does not apply — which
   * is what keeps a comparison run months ago reproducible. There is no removal operation anywhere
   * in this model, and adding one would break the reproducibility promise rather than tidy it.
   *
   * Required, and not optional-defaulting-to-true: "nobody said" and "enabled" are different facts
   * and only one of them belongs in a file that must still mean the same thing in five years.
   */
  readonly enabled: boolean;
  /** When the entry was authored — provenance, not a projection input. Never read by `project()`. */
  readonly createdAt: IsoDate;
  /**
   * The chat turn behind an entry the user accepted from a chat suggestion (plan_ai.md §7.3, P15-13;
   * ADR-0006, "turns that changed the plan are persisted"). Provenance like `createdAt`: never read
   * by `project()`, and never given back to the model. Absent on every entry made any other way.
   */
  readonly origin?: EntryOrigin;
}

/** The turn an accepted chat suggestion came from, as it was on screen when the user accepted it. */
export interface EntryOrigin {
  /** The user's question, as typed. */
  readonly question: string;
  /** The chat's reply as plain text, each figure the engine's own value in whole dollars as the page showed it. */
  readonly reply: string;
  /** The model name from the chat settings when the question was asked. */
  readonly model: string;
  /** When the reply came back: an ISO 8601 UTC timestamp, `Date.prototype.toISOString`'s form. */
  readonly date: string;
}

/**
 * A Journal Entry. Discriminated on `type`, so narrowing on the discriminant narrows `params` too
 * and there is no `params: unknown` anywhere for a consumer to cast its way out of.
 *
 * **The TWENTY-THREE specified members.** Four are the minimal first slice — the no-super,
 * salary-and-spend case — the fifth is `NON_SUPER_INVESTMENT`, specified for the buy alone by
 * P3-21f chunk 3 and for the sell by chunk 4, the sixth is `LUMP_SUM_FROM_SUPER` (P4-6), the
 * seventh is `SUPER_CONTRIBUTION`, specified for the salary-sacrificed kind alone by P6-8 brief 1,
 * the eighth is `MORTGAGE_REFINANCE` (P3-16 slice 2), which sets or originates a home loan, the
 * ninth is `TRIS_EARLY_CONVERSION` (P3-8's conversion limb, 2026-09-22), an early, user-stated
 * TTR-to-retirement-phase conversion day, the tenth is `MORTGAGE_TARGET` (P3-16a, 2026-09-22),
 * a dated payoff or offset milestone checked against the retirement date, the eleventh is
 * `RETURN_CHANGE` (P2-11, 2026-09-22), a per-Person investment return level in `SPEND_CHANGE`'s own
 * idiom, and the twelfth is `SPOUSE_CONTRIBUTION` (P3-19, 2026-09-22), a one-off after-tax
 * contribution into the OTHER Person's superannuation, the thirteenth is `MORTGAGE_PAYOFF`,
 * paying the home loan off in full in one month, the fourteenth is `ILLNESS_SEPARATION` (P12-4,
 * 2026-09-24), the couple living apart because of illness or care, the fifteenth is `DEATH`
 * (P12-1, 2026-09-24), the sixteenth is `ENTER_CARE` (P14-13, slice 3a, 2026-09-24), one Person
 * moving into permanent residential aged care, the seventeenth is `HEAS_DRAW` (P9-1, slice 1,
 * 2026-09-24), the Home Equity Access Scheme's fortnightly income stream, and the eighteenth is
 * `SELL_HOME` (P14-13, 2026-09-25), selling the home outright — proceeds net of the mortgage and
 * any Home Equity Access Scheme debt land in household cash, and the household becomes a
 * non-homeowner from that date — and the nineteenth is `RENT_OUT_HOME` (P14-13, 2026-09-25),
 * renting the whole home out from a date to an optional end date: the net rent is assessable income
 * for tax, the Age Pension and aged care, and the home becomes an assessable asset once nobody is
 * left to protect it — and the twentieth is `BUY_HOME` (P14-19, 2026-09-25), buying a new home
 * after a sale — and the twenty-first is `DOWNSIZER_CONTRIBUTION` (P9-5, 2026-09-25), home sale
 * money into super — and the twenty-second is `INSURANCE_COVER_CHANGE` (P3-17a slice 3,
 * 2026-09-25), cancelling or scaling back super insurance cover — and the twenty-third is `TTR_START`
 * (retire flow S4, 2026-09-29), an accumulation account becoming a transition to retirement pension
 * from a date. The other three carry `UnspecifiedParams`, which is unconstructable:
 * they can be *named* and *narrowed on*, and they cannot be *built* until someone specifies them.
 *
 * ⚠️ **Specified is not walked.** `SUPER_CONTRIBUTION` can be built and `parsePlan` accepts it, and
 * `projection.ts` has no branch for it yet — so a plan holding one projects to exactly the figures
 * it would have projected without it. That gap is deliberate and is held open on purpose in ONE
 * place, `planEdits.ENTRY_TYPES_NOT_YET_WALKED`, which keeps the entry form from offering a type
 * whose money does not move.
 *
 * **What this union deliberately does NOT enforce: the owner.** concept.md's table assigns each type
 * an owner ("person", "household", "person → person"), and that column is not expressed here.
 * `VACATE_HOME` is "person/household" and still unspecified. The two "person → person" rows split
 * from 2026-09-22: `SPOUSE_CONTRIBUTION`'s target is not a field at all — a Household this build
 * can hold has at most two Persons, so `owner` names the contributor and the receiving spouse is
 * simply the other one — while `CONTRIBUTION_SPLIT` remains unspecified and would need an explicit
 * target field the day it is. Encoding the column half-way for the rest would be a ruling made by
 * accident. It is left open, on the record, for whoever specifies those `params`.
 */
export type Entry =
  // --- specified: the minimal first slice, and the buy (P3-21f chunk 3) ---
  | EntryBase<'RETIRE', RetireParams>
  | EntryBase<'WORK_PATTERN_CHANGE', WorkPatternChangeParams>
  | EntryBase<'SPEND_CHANGE', SpendChangeParams>
  | EntryBase<'ONE_OFF_EXPENSE', OneOffExpenseParams>
  | EntryBase<'NON_SUPER_INVESTMENT', NonSuperInvestmentParams>
  | EntryBase<'LUMP_SUM_FROM_SUPER', LumpSumFromSuperParams>
  | EntryBase<'TTR_START', TtrStartParams>
  | EntryBase<'TRIS_EARLY_CONVERSION', TrisEarlyConversionParams>
  | EntryBase<'TTR_RATE_CHANGE', TtrRateChangeParams>
  | EntryBase<'INSURANCE_COVER_CHANGE', InsuranceCoverChangeParams>
  | EntryBase<'SUPER_CONTRIBUTION', SuperContributionParams>
  | EntryBase<'MORTGAGE_REFINANCE', MortgageRefinanceParams>
  | EntryBase<'MORTGAGE_TARGET', MortgageTargetParams>
  | EntryBase<'MORTGAGE_PAYOFF', MortgagePayoffParams>
  | EntryBase<'RETURN_CHANGE', ReturnChangeParams>
  | EntryBase<'SPOUSE_CONTRIBUTION', SpouseContributionParams>
  | EntryBase<'ILLNESS_SEPARATION', IllnessSeparationParams>
  | EntryBase<'DEATH', DeathParams>
  | EntryBase<'ENTER_CARE', EnterCareParams>
  | EntryBase<'HEAS_DRAW', HeasDrawParams>
  | EntryBase<'SELL_HOME', SellHomeParams>
  | EntryBase<'RENT_OUT_HOME', RentOutHomeParams>
  | EntryBase<'BUY_HOME', BuyHomeParams>
  | EntryBase<'DOWNSIZER_CONTRIBUTION', DownsizerContributionParams>
  // --- named, and NOT yet specified. `UnspecifiedParams` cannot be constructed; see its doc. ---
  | EntryBase<'CONTRIBUTION_SPLIT', UnspecifiedParams<'CONTRIBUTION_SPLIT'>>
  | EntryBase<'DOWNSIZE', UnspecifiedParams<'DOWNSIZE'>>
  | EntryBase<'VACATE_HOME', UnspecifiedParams<'VACATE_HOME'>>;

// --- Scenarios ----------------------------------------------------------------------------------

/**
 * **One Scenario: a name, a parent, and the entries it adds** (concept.md §4, ADR-0002).
 *
 * `Scenario = { id, name, parentId, entryIds[] }`, exactly as concept.md writes it. A Scenario is
 * NOT a copy of the base inputs with some values changed, and it is not a copy of its parent's
 * entries either: it holds **ids**, and the entries themselves live in one pool on the plan file
 * (`PlanFile.entries`). A `Household` and a `Settings` are not per-Scenario at all — ADR-0002's
 * 2026-09-16 note settles that: the Household is the base position the entries are applied *to*,
 * so every Scenario in a file shares one of each and differs only in which entries apply.
 *
 * **`parentId` is INHERITANCE, resolved fresh at projection time — never a snapshot taken at the
 * moment of forking** (user ruling, 2026-09-19). ADR-0002's own justification is the reason:
 * comparing "extend the mortgage" against "extend the mortgage *and* discharge it from super"
 * requires the two to **provably** share the first change. A child that copied its parent's entry
 * ids when it was created would merely *happen* to agree with the parent, and would drift apart
 * silently the first time the parent is edited — which is the failure the overlay design exists to
 * prevent. So an entry added to a parent today is in every descendant's projection today.
 *
 * `parentId: null` is a root Scenario, and it is required rather than optional: "nobody said"
 * is not "has no parent" (the same reading `Entry.enabled` gets).
 */
export interface Scenario {
  readonly id: string;
  readonly name: string;
  /** The Scenario this one extends, or `null` for a root. Resolved live — see above. */
  readonly parentId: string | null;
  /** The entries THIS Scenario adds, by id, in its own order. Its ancestors' are inherited. */
  readonly entryIds: readonly string[];
  /**
   * **Which inherited-or-own entries this Scenario switches on or off FOR ITSELF** (2026-09-22).
   * Entry id -> `true` (on here) / `false` (off here); an id with no member states nothing and
   * inherits. See `EntryOverrides` and `resolvedEntryEnabled` below for why this is the one
   * optional field in the Scenario, and why it is a boolean map rather than a disable list.
   */
  readonly entryOverrides?: EntryOverrides;
}

/**
 * **A Scenario's on/off statements about entries it projects — the THIRD state is the absent key.**
 *
 * `Entry.enabled` is the entry's own switch and is required, because "nobody said" and "switched
 * on" are different facts. This map is the opposite case and the difference is the whole design:
 * here "nobody said" IS a claim, and it is the claim the model acts on — *this Scenario has no
 * opinion, take whatever the chain above it says*. So a missing key means **inherit**, an absent
 * map means the Scenario states nothing about any entry, and the two are the same thing said at
 * different scales. That is why the field is optional and why `parsePlan` does not fill it in: a
 * plan file written before this field existed states no overrides, which is exactly true of it, and
 * it round-trips byte-identical (`JSON.stringify` drops an undefined-valued key).
 *
 * **A boolean map and NOT a list of ids to disable.** A disable-only list can only ever subtract,
 * and a child must be able to switch an inherited entry back ON — the parent says "stop working in
 * 2030" and the child is "what if I do not". With a subtractive list the only way to express that
 * is to stop inheriting, which is the copy-on-write fork ADR-0002 exists to refuse.
 */
export type EntryOverrides = Readonly<Record<string, boolean>>;

/**
 * **The entry ids a Scenario actually projects: its ancestors', oldest first, then its own.**
 *
 * *Order.* The chain is walked from the ROOT down to `scenario`, and each Scenario's own
 * `entryIds` are emitted in the order it lists them. So a child's entries come **after** every
 * entry it inherited. That is the only order an append-only journal can be read in — a child is a
 * later decision than its parent, and the level entries (`ENTRY_KIND`) are resolved
 * last-stated-winning, so a child that sets a new spending level must be able to supersede the one
 * it inherited. Reversing this would silently make the parent win.
 *
 * *Duplicates.* An id is emitted **exactly once, at its most ancestral position**. A descendant
 * re-listing an id its parent already lists is not a second application of that entry: an `Entry`
 * is one dated fact, and applying a `ONE_OFF_EXPENSE` twice would spend the money twice. Keeping
 * the earliest position rather than the latest is what makes a parent's meaning stable when a
 * child is added below it.
 *
 * *A cycle throws rather than hanging.* `parsePlan` refuses a cyclic `parentId` chain at the file
 * boundary, so this should be unreachable from a plan on disk; it is checked here anyway because
 * the alternative is an infinite loop in the projection path, and a function that hangs reports
 * nothing at all. A bare `RangeError`: a cycle arriving here is a defect in the caller that built
 * the array, not a fact about the user's file, and the file's own refusal has a name of its own.
 *
 * A `parentId` naming no Scenario in `scenarios` throws for the same reason and on the same ground.
 */
/**
 * **The Scenario chain, ROOT FIRST, ending with `scenario` itself.** The one walk of `parentId`
 * there is: `effectiveEntryIds` reads it forwards (an ancestor's entries come first) and
 * `resolvedEntryEnabled` reads it backwards (the nearest statement wins). Written once because the
 * two must not be able to disagree about what a Scenario's ancestry is — an override resolved
 * against one chain and an entry list resolved against another would switch off an entry the
 * forecast never had.
 *
 * *A cycle throws rather than hanging*, and a `parentId` naming no Scenario throws too — see
 * `effectiveEntryIds` below for both grounds.
 */
export const scenarioAncestry = (scenario: Scenario, scenarios: readonly Scenario[]): readonly Scenario[] => {
  const chain: Scenario[] = [];
  const seen = new Set<string>();
  let current: Scenario | undefined = scenario;
  while (current !== undefined) {
    if (seen.has(current.id)) {
      throw new RangeError(
        `scenario "${current.id}" is its own ancestor — a parentId chain that loops has no root, and resolving it would not terminate`,
      );
    }
    seen.add(current.id);
    chain.unshift(current);
    const parentId: string | null = current.parentId;
    if (parentId === null) break;
    const parent: Scenario | undefined = scenarios.find((candidate) => candidate.id === parentId);
    if (parent === undefined) {
      throw new RangeError(`scenario "${current.id}" names parent "${parentId}", and no scenario has that id`);
    }
    current = parent;
  }
  return chain;
};

export const effectiveEntryIds = (scenario: Scenario, scenarios: readonly Scenario[]): readonly string[] => {
  const chain = scenarioAncestry(scenario, scenarios);
  const resolved: string[] = [];
  const emitted = new Set<string>();
  for (const link of chain) {
    for (const id of link.entryIds) {
      if (emitted.has(id)) continue;
      emitted.add(id);
      resolved.push(id);
    }
  }
  return resolved;
};

/**
 * **IS THIS ENTRY SWITCHED ON, FOR THIS SCENARIO? The one place that question is answered**
 * (2026-09-22).
 *
 * The NEAREST statement in the chain wins: `scenario`'s own `entryOverrides` first, then its
 * parent's, and so on to the root; if nothing in the chain names the entry, the answer is the
 * entry's own `enabled`. Nearest-wins is the same shape as the journal's own last-stated-winning
 * rule for levels — a child is a later decision than its parent, so a child that says "on" must
 * beat a parent that says "off", or a scenario could not ask "what if I do not do that".
 *
 * ⚠️ **Nothing outside this function may read `entry.enabled` to decide whether an entry applies.**
 * `app/scenarioWalks.ts`'s `scenarioEntries` calls it once per entry and hands the ENGINE entries
 * whose `enabled` is already resolved for the Scenario being walked, which is why `projection.ts`,
 * `outcomes.ts` and `sustainableSpend.ts` can keep their plain `entry.enabled` tests and still be
 * right. A second direct read of the pool's flag anywhere on a decision path is the way this
 * feature ships looking correct on screen and doing nothing in the forecast.
 */
export const resolvedEntryEnabled = (entry: Entry, scenario: Scenario, scenarios: readonly Scenario[]): boolean => {
  const chain = scenarioAncestry(scenario, scenarios);
  for (let index = chain.length - 1; index >= 0; index -= 1) {
    const stated = chain[index]?.entryOverrides?.[entry.id];
    if (stated !== undefined) return stated;
  }
  return entry.enabled;
};

// --- What a month reports -----------------------------------------------------------------------

/**
 * **WHICH REGISTER DECIDED A FIGURE — P5-3 limb 2.** Named registers rather than free text, so a
 * consumer can switch on one; the two names `ParameterWindowNote.register` already uses are spelled
 * the same way here on purpose, because a month that reports *"income tax did not reach this
 * month"* in `notes` and *"income tax"* in a line's provenance is talking about one register.
 *
 * **The sixth member arrived with P6-8 brief 2 chunk 4 (2026-09-20), and it is a SIXTH rather than
 * a reuse of `'income tax'`.** The fund's 15% on a concessional contribution is register §3.1 —
 * Income Tax Rates Act 1986 s 26(1)(a), the fund low tax component rate — and it is levied on the
 * FUND, not on the member: filing it under `'income tax'` would put the member's marginal
 * assessment and the fund's flat charge behind one name, which is precisely the confusion
 * `superConcessional.ts` is built around refusing. It is also the only register in this list whose
 * figure reaches a WEALTH line rather than a cash one.
 */
export type ProvenanceRegister =
  | 'Age Pension'
  | 'income tax'
  | 'income tax on capital gain'
  | 'income tax year-end true-up'
  // **P6-9 chunk 3.** Division 293 is its OWN register and not a limb of 'income tax': ITAA 1997
  // Div 293 is a separate tax with its own base, its own threshold and its own Imposition Act, and
  // a line stamped 'income tax' would attribute the second 15% to the rate scale — which is exactly
  // the confusion `superConcessional.ts`'s caveat exists to prevent.
  | 'Division 293 tax'
  | 'Division 293 tax year-end true-up'
  | 'Account-Based Pension minimum'
  | 'superannuation contributions tax'
  // **P3-42 step 2.** The fund's 15%/0% tax on the INCOME SHARE of a `SuperInterest`'s own growth
  // (register §3.1's two "Fund earnings tax" rows, `superPhase.ts`'s `fundEarningsTax`) is a
  // SEVENTH register and not a reuse of `'superannuation contributions tax'`: the two are different
  // bases under the same Act — one taxes money ARRIVING at the fund, the other taxes what the fund
  // EARNS on money already there — and filing an earnings-tax line under the contributions register
  // would put a false base behind the citation ADR-0006 requires.
  | 'superannuation fund earnings tax'
  // A TTR payment is governed by two provisions at once — Schedule 7's floor, pulled in by SISR
  // reg 6.01(2)(b)(i), and reg 6.01(2)(b)(ii)'s 10% ceiling — so it is its own register and not a
  // reuse of 'Account-Based Pension minimum', which has no ceiling.
  | 'transition to retirement income stream'
  // **P14-13, slice 3a.** The Aged Care Means Assessment (register §12.6) and the fees/RAD/DAP
  // arithmetic it feeds are a SECOND, structurally independent means test from the Age Pension's —
  // `agedCare.ts`'s own header — with its own thresholds, its own taper and its own treatment of
  // the home and a paid RAD, which diverge from Centrelink's on exactly those two figures. Filing a
  // line under 'Age Pension' would put the wrong register behind a fee this test alone produced.
  | 'Aged care'
  // **P9-1, slice 1.** The Home Equity Access Scheme (register §5, SS Act Pt 3.12 Div 4) is its
  // own register for `agePensionProvenance`'s own reason: it has its own rate (3.95%, compounding
  // fortnightly), its own 150% cap and its own capacity formula, none of which are Age Pension
  // figures even though the fortnightly cap READS one (the maximum payment rate) as an input.
  | 'Home Equity Access Scheme';

/**
 * **THE LEGISLATED BASIS OF ONE FIGURE — ADR-0006's citation form, which is PER ROW.**
 *
 * ADR-0006 §"Provenance is a hard gate on output" writes the citation the chat must be able to make
 * as *"$1,240 a fortnight of Age Pension in Mar-2034, **from the assets test** — month table,
 * Mar-2034, Age Pension row"*. Three separate claims live in that sentence — a figure, a register,
 * and **which limb of that register decided it** — and none of them is derivable from a dollar
 * amount. A single merged caveat set per `Month` would have been cheaper and would have lost the
 * second and third; the ADR committed to the per-row form in prose before this type existed.
 */
export interface FigureProvenance {
  readonly basis: 'legislated';
  /** Which register computed the figure. */
  readonly register: ProvenanceRegister;
  /**
   * **P5-4 — the financial year whose PARAMETERS produced the figure, and it is not always the
   * month's own year.** A July line settling the year the walk just left is assessed under the OLD
   * year's rate scale, so the stamp on that line reads `2027-28` in a `2028-07` month. That is the
   * whole reason the stamp sits on the figure and not on the `Month`: a `Month.financialYear` field
   * would be `financialYearContaining(firstDayOf(month))` under another name and would say the
   * wrong thing about exactly the line that most needs it.
   */
  readonly fy: FinancialYear;
  /** The weakest confidence of any figure this one consumed — `provenance.ts`'s ordering. */
  readonly confidence: Confidence;
  /**
   * One line per consumed figure that is not primary-verified *for the year computed*, verbatim
   * from `provenanceOf`. **A prior-year fallback is its own sentence and is never the ordinary
   * out-of-year one** (`provenance.ts` emits the two from mutually exclusive branches), which is
   * what makes P5-4a's borrowed Medicare thresholds still read as borrowed after the merge to the
   * `Month`: merging is a set union of these strings and unions do not flatten.
   */
  readonly caveats: readonly string[];
  /**
   * **Which limb of the register decided the figure, in that register's own terms** — "the assets
   * test bound", "rates effective 2026-09-20". **Required and possibly EMPTY**: a register that
   * states no such fact says so with `[]` rather than by omitting the field, on `MonthLine.effect`'s
   * reasoning — "nobody said" and "there was nothing to say" are different facts.
   */
  readonly determination: readonly string[];
}

/**
 * **NOTHING LEGISLATED STANDS BEHIND THE FIGURE, and the line SAYS so rather than omitting it.**
 *
 * `MonthLine.provenance` is required, never optional, on exactly `MonthLine.effect`'s and
 * `Entry.enabled`'s reasoning: an absent field and an empty one must not be the same value. A
 * salary is a figure the Scenario stated in today's wages and the AWOTE Setting raises every month
 * (2026-09-23; flat in dollars before that, whatever this sentence said); investment growth is a Setting
 * applied to a stated balance; household spending is a `SPEND_CHANGE`. None of them has a register
 * behind it, and a reader must be able to tell that from *"the register was not consulted"*.
 */
export interface UnlegislatedFigure {
  readonly basis: 'none';
  /** What the figure rests on instead. */
  readonly note: string;
}

/**
 * **A figure that IS legislated and whose provenance this build does not bring to the line — a
 * THIRD member, for `MonthNote`'s reason.**
 *
 * The Account-Based Pension minimum is the whole of the case at P5-3 limb 2. `minimumDrawdown`
 * computes a `ComputedProvenance` for the Schedule 7 factors; `annualPensionMinimum` returns
 * `.amount` and drops it, and the payment line then carries the year's minimum and the Waterfall's
 * own draw as ONE payment, which is what a member's fund actually makes. Filing that line under
 * `'none'` would state that no register stands behind a Schedule 7 minimum, which is false — and
 * collapsing "nobody legislated it" into "somebody did and we did not carry it" is the same
 * confusion `Month.notes` exists to end.
 */
export interface UncarriedProvenance {
  readonly basis: 'not carried';
  /** Which register governs the figure, so the gap is named and not merely admitted. */
  readonly register: ProvenanceRegister;
  /** Why it is not carried, and what would have to change. */
  readonly note: string;
}

/** What one `MonthLine` can say about where its figure came from. Required on every line. */
export type LineProvenance = FigureProvenance | UnlegislatedFigure | UncarriedProvenance;

/**
 * **WHICH JOURNAL ENTRIES STATED THIS FIGURE — P5-3's line → entry attribution.**
 *
 * `Month.appliedEntryIds` says which entries GOVERN the month; it does not say which of them set
 * WHICH figure. A month citing eight ids leaves a reader of the `Household spending` row to guess
 * that the 2019 `SPEND_CHANGE` is the one that set it — and guessing is the black box concept.md §2
 * names as the failure mode this whole breakdown exists to avoid.
 *
 * **`entryIds` is NEVER empty.** An empty array would have to mean both *"no entry states this
 * figure"* and *"an entry does and this build cannot say which"*, which is the same conflation
 * `LineProvenance`, `Month.notes` and `Entry.enabled` each refused in turn. So the two are separate
 * members of a discriminated union and the array only exists on the member that has ids to put in
 * it; `projection.ts`'s constructor throws on an empty list, so the value cannot be built.
 *
 * **An ARRAY and not one id**, though no emit site in the build of 2026-09-18 produces two: the
 * shape is what a line under both a `WORK_PATTERN_CHANGE` and a `RETIRE` would need, and narrowing
 * it to a scalar would have to be undone by whoever first writes such a line. See
 * `attributionOf` in `projection.ts` for the rule that decides the ids, and the residual recorded
 * with it.
 */
export interface StatedByEntries {
  readonly basis: 'entries';
  /**
   * The ids of the entries whose statement IS this figure, in the order the walk established them.
   * **Never empty, and always a subset of the `Month.appliedEntryIds` of the month it appears in** —
   * a line cannot cite an entry the month does not, and a disabled entry reaches neither (ADR-0002).
   */
  readonly entryIds: readonly string[];
}

/**
 * **NO JOURNAL ENTRY STATES THIS FIGURE, and the line says so rather than carrying an empty list.**
 *
 * The Age Pension is the case that makes this a member and not an absence: it is legislated, and
 * nobody's entry produced it. So are a Setting-supplied return, a Person's stated employment income
 * (no `Entry` in this model can state a salary), and the Waterfall's own automatic draw.
 *
 * ⚠️ **"No entry STATES it" is not "no entry mattered".** A limb-3 sale happens because the
 * Household came up short against a target a `SPEND_CHANGE` set, and that entry is cited on the
 * spending line of the same month and in `Month.appliedEntryIds`. The rule attributed here is the
 * narrow one — whose *statement is the figure* — because the wide one ends with every line of every
 * month citing the spending level, which is attribution that distinguishes nothing.
 */
export interface UnstatedFigure {
  readonly basis: 'none';
  /** What decided the figure instead — a register, a Setting, the Waterfall, the Household. */
  readonly note: string;
}

/**
 * **AN ENTRY IS BEHIND THIS FIGURE AND THIS BUILD CANNOT SAY WHICH — the third member, for
 * `UncarriedProvenance`'s reason.**
 *
 * Three lines are in it and all three are lines that MERGE. The capital-gains charge is an increment
 * on a year's accumulated net gain, whose realisations may come from disposals in earlier months and
 * from an automatic draw no entry states; the year-end true-up is assessed on twelve months of
 * salary whose movements `taxYearToDate` records as figures and not as causes; and the pension
 * payment carries a Schedule 7 minimum no entry states TOGETHER with a draw to a target an entry
 * does state, with no split on the line to attribute half of.
 *
 * Filing any of them under `'none'` would state that nothing in the Scenario produced them, which is
 * false; filing them under `'entries'` would name an entry for a figure it only partly caused.
 */
export interface UnattributedFigure {
  readonly basis: 'not attributed';
  /** Why the entries are not determinable here, and what would have to change to determine them. */
  readonly note: string;
}

/** What one `MonthLine` can say about which entries produced it. Required on every line. */
export type LineAttribution = StatedByEntries | UnstatedFigure | UnattributedFigure;

/**
 * **THE MONTH'S OWN PROVENANCE — the per-line records merged upward, and merging is a UNION.**
 *
 * Not a replacement for the per-line records and not a summary that could be computed instead of
 * them: this answers *"how good is anything in this month, and what could it not vouch for"* in one
 * read, which is the question a month-table row asks before a reader expands it.
 *
 * It is a single shape rather than a union, because every field below has a truthful empty value and
 * a month with no legislated figure in it is an ORDINARY month — a Household under both thresholds
 * with no assessable income has one every month of its walk.
 */
export interface MonthProvenance {
  /**
   * The registers that produced a figure carried to a line this month, in line order, deduplicated.
   * Empty where none did.
   */
  readonly registers: readonly ProvenanceRegister[];
  /**
   * The registers that governed a figure this month whose provenance did NOT reach its line — the
   * union of the month's `'not carried'` lines. A month that listed only `registers` would read as
   * though it had vouched for everything it reported.
   */
  readonly uncarried: readonly ProvenanceRegister[];
  /**
   * Every financial year a carried figure of this month was computed under, ascending. Usually one;
   * **two in a July that settles the year the walk just left**, whose true-up is assessed under the
   * old year's parameters while the same month's accrual is assessed under the new one. Empty
   * exactly when `registers` is.
   */
  readonly stamps: readonly FinancialYear[];
  /**
   * The weakest confidence of any carried figure, or the literal `'nothing carried'` where there is
   * none. **That literal is deliberately NOT a `Confidence`**: `provenance.ts`'s `rank` throws on a
   * value outside `CONFIDENCE_ORDER`, so a month with nothing in it cannot be ranked as though it
   * were primary-verified — which is the one direction this field must never be wrong in.
   */
  readonly confidence: Confidence | 'nothing carried';
  /** The union of every carried line's caveats, deduplicated, in line order. */
  readonly caveats: readonly string[];
}

/**
 * One line of a month's breakdown. concept.md §2 makes this a v1 requirement ahead of the chart:
 * "every row expandable to opening balance, each inflow/outflow, and which Journal Entries applied.
 * Without this the tool is a black box."
 */
export interface MonthLine {
  readonly direction: 'inflow' | 'outflow';
  /**
   * **WHAT THE LINE MOVED — P4-4, and it is a SECOND axis rather than two more `direction`s.**
   *
   *   * `'cash'` — money the Household received or parted with. These, and only these, reconcile
   *     `openingBalance` to `closingBalance`: `project()` sums `effect === 'cash'` and nothing else.
   *   * `'wealth'` — a balance that moved with no cash behind it. Unrealised investment growth is
   *     the first and, at P4-4, the only one: it changes what the Household owns (and what the Age
   *     Pension assesses) without a dollar arriving in or leaving the Offset Account.
   *
   * **Why not `direction: 'gain' | 'loss'`, which was the alternative and was rejected.**
   * `direction` is named in concept.md §2 and read by every consumer of a month's breakdown; adding
   * members to it would silently reclassify a growth line as neither an inflow nor an outflow for
   * code that already switches on the two, and the sign and the nature of a movement are different
   * questions. A growth line is an `inflow` of `wealth`; a fall in value is an `outflow` of it.
   *
   * **Required, and not optional-defaulting-to `'cash'`**, on exactly `Entry.enabled`'s reasoning:
   * "nobody said" and "it was cash" are different facts, and only one of them belongs in a file that
   * must still mean the same thing in five years. A default here would also make the reconciliation
   * above silently absorb the next non-cash movement somebody adds.
   */
  readonly effect: 'cash' | 'wealth';
  /** What it was, in the user's terms — "Salary, Person A", "Mortgage repayment", "Age Pension". */
  readonly description: string;
  /** Always positive; `direction` carries the sign, so a negative inflow cannot masquerade as an outflow. */
  readonly amount: Cents;
  /**
   * **WHERE THE FIGURE CAME FROM — P5-3 limb 2, and it is REQUIRED on every line.** See
   * `LineProvenance`: a line with no register behind it says so with `basis: 'none'` and does not
   * omit the field, because ADR-0006 makes provenance a hard gate on output and a missing field
   * would let a figure through the gate by saying nothing.
   */
  readonly provenance: LineProvenance;
  /**
   * **WHICH ENTRIES PRODUCED THE FIGURE — P5-3's line → entry attribution, and it is REQUIRED on
   * every line.** See `LineAttribution`: a line no entry states says so, a line whose entries this
   * build cannot determine says *that*, and neither of them is an empty array. `provenance` answers
   * *which register decided it*; this answers *which of the month's entries did* — a figure can have
   * both (a spending line under a `SPEND_CHANGE`, with no register behind it) or neither.
   */
  readonly attribution: LineAttribution;
}

/**
 * **WHICH KIND OF NOTHING — P4-4's third part, and it is a NOTE rather than a line.**
 *
 * A `MonthLine` is a MOVEMENT: `amount` is specified as always positive, and `project()` reconciles
 * `openingBalance` to `closingBalance` across them. So the one thing a line can never say is *"no
 * money moved, and here is why not"* — and that sentence is the whole of the audit trail for a
 * Waterfall limb that supplied nil and for a month no register reaches. Manufacturing a zero-amount
 * line to carry it would break `MonthLine`'s own contract and put a payment of nothing into the
 * reconciliation; so this is a second array, and the two do not overlap.
 *
 * It is a **discriminated union on `subject`** rather than a bag of strings, for `Entry`'s reason:
 * the two kinds of note answer different questions and carry different evidence, and a shape that
 * made a limb's `available`/`drawn` optional so that a parameter-window note could omit them would
 * make *"nobody supplied a figure"* and *"the figure was nil"* the same value again — which is the
 * exact confusion the array exists to end.
 *
 * **Nil is the ORDINARY case for both, and neither is an error.** A Household with no Account-Based
 * Pension gets a limb-2 note in all 575 months of its walk, and that is the note doing its job.
 */
export interface WaterfallLimbNote {
  readonly subject: 'waterfall limb';
  /**
   * Which limb. The seven names are `projection.ts`'s `WATERFALL_LIMBS`, which is the single source
   * of the Waterfall's ORDER; this is the same set spelled as a type, and the two are tied to each
   * other in both directions at the top of `projection.ts` so neither can gain or lose a member
   * alone. The names are spelled here rather than imported because `projection.ts` imports this
   * file, and the arrow may not run the other way.
   */
  readonly limb:
    | 'salary'
    | 'accountBasedPensionMinimum'
    | 'cashAboveLoan'
    | 'nonSuperPortfolio'
    | 'accountBasedPensionAboveMinimum'
    | 'offsetAccount'
    | 'releasedSuperannuation';
  /** The most this limb could have supplied toward the month's target. Never negative. */
  readonly available: Cents;
  /** What the Waterfall actually took from it. Never more than `available`. */
  readonly drawn: Cents;
  /** Why `available` is that figure — above all, why it is nil. */
  readonly note: string;
}

export interface ParameterWindowNote {
  readonly subject: 'parameter window';
  /** Whose parameters did not reach this month. */
  readonly register: 'Age Pension' | 'income tax';
  /**
   * Why nothing was computed, and **which way the absence runs** — an unlegislated Age Pension
   * under-states the Household's income, an unlegislated tax year under-states what it owes, and a
   * reader who cannot tell those apart from a nil cannot tell whether the walk flatters them.
   */
  readonly note: string;
}

/**
 * **A `LUMP_SUM_FROM_SUPER` that was applied this month, and what the engine decided about its
 * tax** (2026-09-19). The money it moved IS a line — the withdrawal is an inflow like any other —
 * so this note carries only the facts a line cannot: what was asked for beside what was paid, and
 * the tax, which is nil.
 *
 * **It exists so that the nil is an ASSERTED nil.** A withdrawal at this build's supported age
 * carries no tax, and a `Month` that simply had no tax line would say the same thing as a month in
 * which nobody thought about the tax at all — the *which kind of nothing* confusion this array
 * exists to end, in its sharpest form: silence about a tax is indistinguishable from a tax of nil,
 * and only one of them is a claim.
 */
export interface SuperWithdrawalNote {
  readonly subject: 'super withdrawal';
  /** Whose interest it came out of, by name — the same name the withdrawal's line carries. */
  readonly person: string;
  /** Which of that Person's interests, positionally: the entry's own `interestIndex`. */
  readonly interestIndex: number;
  /**
   * The entry that stated it, and the line carries the same id in its `attribution` — or **`null`
   * where NO entry stated it**, which from 2026-09-19 is the automatic Waterfall limb 5 drawing
   * released superannuation against a month the limbs above it could not fund.
   *
   * `null` is the only value that can mean that, and it is a different fact from an id rather than
   * a missing one: the two paths differ in who decided the amount, which is the whole of what a
   * reader needs from this field. The line's own `attribution` says the same thing in the union
   * that exists for it (`NO_STATING_ENTRY.automaticSuperWithdrawal`), so the note and the line
   * cannot disagree about whether anybody asked for this money.
   */
  readonly entryId: string | null;
  /** What the entry asked for. */
  readonly requested: Cents;
  /** What the interest could pay — less than `requested` exactly where the balance ran out. */
  readonly paid: Cents;
  /** **Nil on every path that can produce this note**, and reported so that the nil is visible. */
  readonly taxWithheld: Cents;
  /** Why the tax is nil, and the taxed-source assumption underneath it. */
  readonly note: string;
}

/**
 * **THE SUPERANNUATION GUARANTEE THIS WALK COMPUTED — AND, SINCE CHUNK 2B, PAID.**
 *
 * The employer's SG is computed from this month's own earnings. Chunk 1 credited it to NOTHING and
 * said so; **chunk 2b credits it, net of the fund's 15%, to the interest the destination rules
 * resolve to**, so the note is no longer a record of a movement that did not happen. It stays a
 * note rather than becoming only a line because most of what it carries still is not a movement:
 * the YEAR's charge, the earnings it was computed on, the sacrifice added back into them, and —
 * where the year's ceiling cannot be derived — the part of the charge this build cannot prove.
 *
 * **IT IS COUNTED AGAINST THE CONCESSIONAL CAP FROM 2026-09-20 (brief 3, final chunk).** The
 * sentence here said the opposite for the length of chunk 2b — *"it is not counted against any
 * contributions cap ... so a Person whose sacrifice plus Guarantee exceeds the cap is not refused"*
 * — and the cap check now measures the sacrifice and this figure together. What is still not done
 * with it, stated on the note itself: ~~Division 293's second 15% is not charged on it~~ — **and
 * that sentence became false on 2026-09-20 (P6-9 chunk 3), which is why it is struck rather than
 * quietly dropped.** The second 15% IS now charged, as its own monthly `Division 293 tax` line
 * against the Person's own cash, trued up when the walk leaves the year. ~~What is still NOT modelled
 * is the Subdiv 293-B election to have the charge released from the fund instead (register O84)~~ —
 * **and that sentence became false on 2026-09-20 (P6-10 M3), which is why it is struck rather than
 * quietly dropped.** The election IS performed for a Person whose plan names the interest: at the
 * year-end settlement the whole year's cash accrual is refunded and the year's assessed liability
 * is debited to that interest. What is left of O84 is three residuals, ~~two of which FLATTER~~
 * **ONE of which flatters from 2026-09-20 (P6-11), the second having been closed by a control on
 * the household form** — ~~and no screen offers the election, so only a hand-edited plan file can
 * make it~~, which is struck rather than dropped because it was true for as long as the election
 * had no box. What is left is the first: a first or last PARTIAL financial year never settles. Its
 * direction is NOT neutral: taking the charge from cash
 * leaves a means-test-exempt accumulation interest standing and spends assessed Offset cash, which
 * OVER-states the Age Pension of a Household whose payer is below Age Pension age. O84 argues it
 * and states its bounds.
 *
 * ⚠️ **Every figure here is ANNUAL except `creditedToSuperannuation`**, because the earnings limbs
 * are the walk's annualised salary levels and the SG and its ceiling are annual quantities (SGAA
 * s 10A(5), T18 — the ceiling stopped being quarterly on 1 July 2026). `creditedToSuperannuation`
 * is THIS MONTH's movement and is the same figure as the month's own Guarantee line, to the cent,
 * because both are read off one `contributionsTax` result. A consumer that adds the annual figures
 * to a month's lines is adding a year to a month.
 */
export interface SuperGuaranteeNote {
  readonly subject: 'superannuation guarantee';
  /** Whose employment, by name — the same name their `Salary` line carries. */
  readonly person: string;
  /**
   * SGAA s 10A(1) qualifying earnings for the year, and **PRE-sacrifice** (T17): the salary the
   * Person is actually paid PLUS the amount they sacrificed, added back. Sacrificing no longer
   * reduces the SG base, so this figure does not fall when `salarySacrificedAmounts` rises.
   */
  readonly qualifyingEarnings: Cents;
  /**
   * The s 10A(1)(h) limb of the figure above — what was sacrificed and added back. Nil for a
   * Person with no arrangement, and reported so the add-back is visible rather than implied.
   */
  readonly salarySacrificedAmounts: Cents;
  /**
   * SGAA s 17A(2), as a percentage — 12, not 0.12 — or **`null` where the year could not be
   * computed at all**, which is a different fact from a rate of nil and is why this is nullable
   * rather than zero.
   */
  readonly chargePercentage: number | null;
  /**
   * The year's WHOLE charge, or `null` where this build cannot state it. There are two such
   * branches and they are different facts from a nil: a year before FY2026-27 has no qualifying
   * earnings base and no charge percentage at all; and a Person whose earnings exceed
   * `MINIMUM_MAXIMUM_CONTRIBUTIONS_BASE` in a year with no AWOTE index number has a ceiling that
   * cannot be derived, so the charge on the earnings ABOVE that floor is unknown. In the second
   * case `annualAmountCredited` below is still a figure — the part that needs no index number.
   */
  readonly annualAmount: Cents | null;
  /**
   * **What this walk actually pays in over the year, before the fund's 15%** — equal to
   * `annualAmount` wherever that is stated, and the floor-safe part of it where the ceiling could
   * not be derived. `null` only where nothing at all could be computed. It is never more than
   * `annualAmount`, and where the two differ the difference is a Guarantee this build has declined
   * to state rather than one it says is not owed.
   */
  readonly annualAmountCredited: Cents | null;
  /**
   * Which of the Person's `superInterests` received it, by position — `null` where nothing was
   * credited. The destination is derived or stated, never guessed: see
   * `SuperInterest.statedEmployerContributionDestination`.
   */
  readonly interestIndex: number | null;
  /**
   * **THIS MONTH's credit, net of the fund's 15%** — the one figure on this note that is not
   * annual, and the same figure as the month's Guarantee line. Nil where nothing was credited.
   */
  readonly creditedToSuperannuation: Cents;
  /** What was computed, what was NOT done with it, and the module's own caveats on the figure. */
  readonly note: string;
}

/**
 * **A figure computed from a STANDING TABLE: parameters published for an earlier date, applied to
 * this one** (P4-1e, 2026-09-21).
 *
 * The money DID move and it is a line — this note carries the one fact the line cannot, which is
 * the **distance** between the month and the last determination behind its figure. That distance is
 * invisible in the numbers by construction: a carried rate is the published rate, to the cent, so a
 * reader comparing figures can never find it.
 *
 * **It is a fifth `MonthNote` and not a second `ParameterWindowNote`, and the two are near-opposites.**
 * A parameter-window note says *nothing was computed for this month*; this says *something was, on
 * old parameters*. Filing them under one subject would put "no figure" and "a figure you should
 * discount" behind one name, and a reader switching on `subject` would have to read the text to
 * tell which they had — the exact failure `Month.notes` exists to end.
 */
export interface StandingParametersNote {
  readonly subject: 'standing parameters';
  /**
   * Whose parameters were carried. **Only the Age Pension today, and that is a scope fact rather
   * than a design one:** `tax.ts` has carried standing law forward since P2-10b and marks it with
   * `standingLawFrom`, but surfacing that in the output is its own piece of work (see
   * `taxParametersCover`'s doc) and none of it is done here. A second member is added the day it is.
   */
  readonly register: 'Age Pension';
  /** The last day the parameters behind this month's figure were PUBLISHED for. */
  readonly standingFrom: IsoDate;
  /**
   * What was carried and **which way it runs** — the same requirement `ParameterWindowNote.note`
   * carries, and for the same reason. A standing Age Pension is at most the legislated one, so this
   * Household's income is UNDER-stated and never flattered; a reader who cannot tell the direction
   * cannot tell whether to discount the figure up or down.
   */
  readonly note: string;
}

/**
 * One fact about a month that moved NO money — or, for the third and fifth members, one fact ABOUT
 * money that moved which no line can carry. See `WaterfallLimbNote` for why these are not lines.
 */
export type MonthNote =
  | WaterfallLimbNote
  | ParameterWindowNote
  | SuperWithdrawalNote
  | SuperGuaranteeNote
  | StandingParametersNote
  | SalarySacrificeStoppedNote
  | PensionMinimumBasisNote
  | InvestmentDistributionNote
  | PensionAtRetirementNote
  | ConcessionalCapExceededNote
  | HeasCapacityCapNote;

/**
 * **A Person's concessional contributions so far this financial year went over the year's general
 * concessional cap (2026-09-23).** Emitted once per Person per year, in the month the year-to-date
 * total first exceeds the cap. An arrangement is refused in the month it is stated if it is over
 * the cap then; this is the later month when the year's actual contributions got there anyway —
 * pay rising with wages lifts the employer Guarantee while a stated sacrifice stays fixed.
 *
 * A note and not a refusal, because the user changed nothing: a forecast that walked must not stop
 * because wages grew. ⚠️ **The excess is still walked at the fund's 15% and no more** — Division 291
 * is not modelled — so every figure after this month is flattering by the Person's marginal rate
 * less 15% on the excess, and `note` says so.
 */
export interface ConcessionalCapExceededNote {
  readonly subject: 'concessional cap exceeded';
  /** Whose contributions, by name. */
  readonly person: string;
  readonly financialYear: FinancialYear;
  /** The year's employer Guarantee and salary sacrifice contributed up to and including this month. */
  readonly contributedThisYear: Cents;
  /** The year's general concessional cap (ITAA 1997 s 291-20(2)), published or derived. */
  readonly generalCap: Cents;
  /** `contributedThisYear` less `generalCap`, so far; the rest of the year's contributions add to it. */
  readonly excessSoFar: Cents;
  readonly note: string;
}

/**
 * **What happened to a Person's super at retirement (user ruling, 2026-09-23).** Emitted once, in
 * the month of the `RETIRE` entry, for a Person with an account the switch could reach: either it
 * switched to a retirement-phase account-based pension, or it did not, and why not. A note and not a
 * line, because the switch itself moves no money — the account's balance is the same the day after.
 *
 * `outcome` names which of the five things happened. The four that are not `'switched'` leave every
 * account in the phase the plan states, so the walk is what it was before this rule existed.
 */
export interface PensionAtRetirementNote {
  readonly subject: 'pension at retirement';
  /** Whose super, by name. */
  readonly person: string;
  /** The RETIRE entry's date: the day the accounts switch, or would have. For `back at work`, the stop it follows; for `stopped again`, the new stop. */
  readonly retireDay: IsoDate;
  /** `back at work` and `stopped again` are retire flow S3's (2026-09-29): a return to work after a `RETIRE`, and a stop after that. */
  readonly outcome: 'switched' | 'under 60' | 'over the cap' | 'prior pension' | 'retired before the plan' | 'back at work' | 'stopped again';
  /** The accounts the outcome is about, by position in `superInterests`; for `back at work`, the accumulation accounts it locks. */
  readonly interestIndexes: readonly number[];
  /** What happened, in plain words. */
  readonly note: string;
}

/**
 * **A year's Account-Based Pension minimum that rests on a STAND-IN balance (P10-5, 2026-09-21).**
 *
 * SIS Reg Sch 7 cl 1(2)(a)(i) works the minimum out on the balance *on 1 July*. A plan written on
 * any other day cannot supply that balance: the day is behind the forecast. The law is complete and
 * the input is missing, and this note is where the difference is said out loud — it is emitted only
 * in the one month a substitution was actually made, and never on a walk that opens on 1 July.
 *
 * **It is a note and not a line because no money moved for it**, in `WaterfallLimbNote`'s sense: the
 * payments it governs have their own `Account-Based Pension payment` lines in the months they are
 * made. What this carries is which figure the year's floor was computed from, and which day it was
 * really observed on, so a reader can tell a determined minimum from a determined-on-a-stand-in one.
 *
 * ⚠️ **The direction is NOT stated, because it is not knowable and saying one would be worse than
 * saying none.** Between 1 July and the day the plan opens an account takes payments out and
 * earnings in; whichever was larger decides whether this minimum is high or low. What IS bounded is
 * the size — the percentage factor times the account's movement over those weeks — and `note` says
 * so. That is the rule this project applies to every figure it cannot sign.
 */
export interface PensionMinimumBasisNote {
  readonly subject: 'pension minimum basis';
  /** Whose pension, by name — the same name the payment lines carry. */
  readonly person: string;
  /** Which of that Person's `superInterests`, by position. */
  readonly interestIndex: number;
  /** The financial year whose minimum this is. */
  readonly financialYear: FinancialYear;
  /** The day Sch 7 cl 1(2)(a) required a balance on, and which this walk never opened. */
  readonly schedule7Day: IsoDate;
  /** The day the balance used really is a balance on — the walk's first day. */
  readonly balanceObservedOn: IsoDate;
  /**
   * The year's minimum total payment as determined, in cents. **Named for the fact and never
   * `amount`**: a `MonthNote` carrying a bare `amount` is a line wearing a note's name, and
   * `core-projection-month-notes.test.mjs` refuses the field by that name across the whole union.
   * Nothing moved for this note — the payments it floors have their own lines.
   */
  readonly minimumForTheYear: Cents;
  /** What was substituted, why there was no alternative, and how big the error can be. */
  readonly note: string;
}

/**
 * **A NON-SUPER PORTFOLIO DISTRIBUTION, REINVESTED — P3-22h step 2, 2026-09-22.**
 *
 * `Settings.investmentPayoutRate` pays out once a year, in the financial year's final month, and
 * the money is reinvested rather than spent — P3-22h's own ruling: nothing about spending capacity
 * changes. It is a note and not a line in `WaterfallLimbNote`'s sense: what moves is the parcel's
 * `costBase`, a figure no `Month` field surfaces before a disposal, and neither `'cash'` (nothing
 * left the Offset Account) nor `'wealth'` (the means test's own `marketValue` does not move by a
 * cent) is a true label for it. The tax the distribution eventually causes IS a line — the ordinary
 * `Income tax year-end true-up` the following July, on `TAX_TRUE_UP_LINE`'s own conventions —
 * because that money the Household actually pays.
 *
 * **`investmentPayoutFrankedShare` is read from 2026-09-22 (P3-22h step 3), and NOT by this note or
 * the mechanism above it.** The note's own text says so, either way: absent the Setting, the whole
 * of `distributed` is ordinary, unfranked income, exactly as this note describes; stated, a credit
 * for a share of it is applied through the SAME year-end true-up, via `individualFranking.ts`'s
 * `frankingForIndividual` — and that is a fact about the SETTLEMENT the following July, not about
 * this note, which still reports only what moved this month: nothing spendable, ever.
 */
export interface InvestmentDistributionNote {
  readonly subject: 'investment distribution';
  /** Whose portfolio, by name — the same name their `GROWTH_LINE` for it carries. */
  readonly person: string;
  /**
   * What was distributed and reinvested this year, in cents. **Named for the fact and never
   * `amount`** — see `PensionMinimumBasisNote` for why: nothing here is a line's figure, because
   * nothing here is a movement `'cash'` or `'wealth'` can truthfully name.
   */
  readonly distributed: Cents;
  /** Why no line reports it, and what it does to next year's tax. */
  readonly note: string;
}

/**
 * **A standing salary sacrifice that the user ENDED, in every month after they ended it** (P6-8
 * brief 4, 2026-09-21).
 *
 * It is a `MonthNote` for the reason the array exists: a month in which a stopped Person sacrifices
 * nothing looks exactly like a month in which they never arranged anything, a month before their
 * arrangement starts, a month in which they earn nothing, and a month in which the entry is
 * switched off. `SuperContributionParams` lists all six of those; this note is the one that says
 * *the user stopped it, on this date, with this entry* — the only one of the six no other part of a
 * `Month` can carry, because the entry that stopped it is not a contribution and moves no money.
 *
 * **Emitted in every month the stop governs, not only in its own month.** A reader asking "why is
 * there no sacrifice in March 2036?" is asking about March 2036, and a note filed in January 2035
 * does not answer them. It is the same rule `WaterfallLimbNote` follows for a limb that pays
 * nothing in all 575 months of a walk.
 *
 * **No money field, and no `amount`.** Nothing moved: the whole content is which entry, and from
 * when.
 */
export interface SalarySacrificeStoppedNote {
  readonly subject: 'salary sacrifice stopped';
  /** Whose arrangement, by name — the same name their `Salary` line carries. */
  readonly person: string;
  /** The `SUPER_CONTRIBUTION` with `kind: 'stopped'` that ended it. */
  readonly entryId: string;
  /** That entry's own date — the first month in which nothing was sacrificed. */
  readonly stoppedFrom: IsoDate;
  /** What this does and does not mean, above all for the months BEFORE it. */
  readonly note: string;
}

/**
 * **`HEAS_DRAW` reached its capacity cap — the age component × this Person's own share of the
 * security (SS Act s 1135A(1), T37)** (P9-2a, one note stream per Person's own `HEAS_DRAW` entry).
 * Emitted each time the draw NEWLY binds — the first month it clamps, and again after a birthday
 * (T36) or any other reopening of room lets it draw freely for a while before it clamps again — on
 * `ConcessionalCapExceededNote`'s own "not a silent stop" precedent, narrowed (was "once ever" to
 * "once per binding episode": the draw is clamped to whatever headroom is left that month (possibly
 * nil) and stays clamped while `capacity` does not move, while interest keeps compounding on the
 * debt already drawn (T41, `heas.ts`'s `reachingTheMaximumLoan`).
 */
export interface HeasCapacityCapNote {
  readonly subject: 'HEAS capacity cap reached';
  /** The `HEAS_DRAW` entry this cap belongs to — one Person's own entry (T37). */
  readonly entryId: string;
  /** The age component × `floor(this Person's own share of securityValue ÷ $10,000)` — recomputed every month (T36). */
  readonly capacity: Cents;
  /** This Person's own debt at the close of this month, clamped at `capacity` by the draws stopping here. */
  readonly debtAfter: Cents;
  readonly note: string;
}

/**
 * **One Person's share of a month's three asset figures (P7-6).** The three `Month` scalars, each
 * restricted to the wealth that Person holds — see `Month.assetsByPerson` for what is and is not in
 * them, and for why a Person is identified by position rather than by name.
 */
export interface PersonAssetFigures {
  readonly protectedAssets: Cents;
  readonly assessableAssets: Cents;
  readonly accessibleAssets: Cents;
}

/**
 * One monthly tick of the projection. `project(settings, entries) → Month[]` returns these in
 * ascending `month` order.
 *
 * **Nothing here is derived at display time.** A month that reported only a closing balance would
 * make the tool a black box, which concept.md §2 names as the one failure mode that would lose the
 * trust a mortgage-discharge decision needs.
 */
export interface Month {
  readonly month: IsoMonth;
  /** The Household's total position at the start of the month; `lines` reconcile it to `closingBalance`. */
  readonly openingBalance: Cents;
  /** The same figure after the month's lines. Reported rather than left derivable, so the reconciliation is assertable. */
  readonly closingBalance: Cents;
  /** Every inflow and outflow, itemised (concept.md §2). */
  readonly lines: readonly MonthLine[];
  /**
   * **What did NOT move, and why — P4-4.** One entry per Waterfall limb every month, including the
   * limbs that drew nothing, plus one per register whose parameters do not reach this month — and,
   * since P4-1e (2026-09-21), one where a register's parameters reached it only by being CARRIED.
   * See `MonthNote`: these are not lines, they carry no money into the reconciliation, and `lines`
   * remains the whole of what moved.
   *
   * The order is the order the walk decided each fact: the Age Pension's window or standing note is
   * answered at the top of the tick, the income-tax window note at the accrual, and the five limbs
   * follow in `WATERFALL_LIMBS` order once the Waterfall has run.
   */
  readonly notes: readonly MonthNote[];
  /**
   * The `Entry.id`s that applied this month, including the synthetic entries a Dated Parameter
   * resolved into (ADR-0002: "an explicit entry supersedes the synthetic one"). A disabled entry
   * never appears here.
   *
   * **P4-4: "applied" means GOVERNED, not "took effect in".** A `SPEND_CHANGE` dated 2019 is the
   * standing spending level of every month of the walk, so it is cited in every month of the walk
   * and not only in the first — before P4-4 a month 200 `Household spending` line had no traceable
   * cause anywhere in its own `Month`, which is the audit-trail hole ADR-0002 and ADR-0006 ask this
   * array to close. The same holds for `RETIRE` and `WORK_PATTERN_CHANGE`: every `ENTRY_KIND`
   * `level` is cited from the month it takes effect until the month something supersedes it, and an
   * `event` is cited in its own month alone.
   *
   * **ORDERED and DEDUPLICATED, as before.** The levels in force come first, oldest-governing first
   * — a level that supersedes another takes the superseded one's place at the end of the standing
   * run, so the order reads as "the facts that were established, in the order they were established"
   * — and then the month's own entries in the Scenario's order. An id appears at most once. A
   * consumer reads this as provenance, so the order is part of what it means.
   */
  readonly appliedEntryIds: readonly string[];
  /**
   * Wealth excluded from the assets test, as valued — ADR-0005 and `household.ts`'s `AssetSplit`.
   * The home is protected and carries no value, so it contributes nothing to this figure.
   */
  readonly protectedAssets: Cents;
  /**
   * **The only figure the Age Pension consumes** (concept.md §4, ADR-0005). Reported separately from
   * `protectedAssets` every month — not summed, not netted — because the separation is what the
   * means test is computed from and what a user has to be able to audit.
   */
  readonly assessableAssets: Cents;
  /**
   * **P4-6 — the money the Household could actually SPEND on a late-life cost, at this month's
   * CLOSING position.** The Offset Account (`closingBalance`), plus the Non-Super Portfolio, plus
   * any superannuation a Condition of Release has reached. Preserved super is NOT in it.
   *
   * **This is a third figure and not a re-arrangement of the other two, and the difference is the
   * whole reason it exists.** `protectedAssets + assessableAssets` is TOTAL WEALTH, and total wealth
   * answers the contingency-floor question in the flattering direction: a 58-year-old with $900,000
   * of preserved super and $9,000 in the bank clears a $100,000 floor on that reading and cannot
   * spend a cent of the $900,000 on a new roof. The means-test split is about what CENTRELINK can
   * see; this is about what the HOUSEHOLD can reach, and the two disagree in both directions — the
   * younger partner's exempt super is protected AND unreachable, while an Account-Based Pension is
   * assessable AND reachable.
   *
   * Computed by `accessibleWealth` in `projection.ts`, which is where the reachability rule is
   * written and where its residuals are declared.
   */
  readonly accessibleAssets: Cents;
  /**
   * **P7-6 — the same three figures, per Person, positionally.** `assetsByPerson[i]` belongs to
   * `household.persons[i]`: the tuple union mirrors `Household.persons`, so a one-Person Household
   * cannot be given a two-member answer and a couple cannot be given one member.
   *
   * **A WIDENING and not a replacement.** The three Household scalars above are untouched and are
   * what every consumer still reads; this is the breakdown beside them, and the figures in it are
   * the ones the scalars were already computed from — `splitAssets` builds its lines per Person
   * before pooling them, and `accessibleWealthByPerson` is the function `accessibleWealth` is made
   * of. Nothing here is a second derivation of a rule.
   *
   * **THE MEMBERS DO NOT SUM TO THE SCALARS: the Offset Account is missing from them, by
   * decision.** The Offset is a Household account (P4-3b, ADR-0009) and no Person owns a share of
   * it, so attributing it would answer an ownership question the user was never asked. It is
   * already reported in full, every month, as `openingBalance` / `closingBalance`. So the identity
   * is `Σ assetsByPerson[i].x + the Offset === x` for the assessable and the accessible figures,
   * and `Σ assetsByPerson[i].protectedAssets === protectedAssets` exactly, the Offset being
   * assessable and never protected.
   *
   * **No name.** A Person is identified by POSITION and never by `owner`, because two Persons of a
   * Household may be given the same name and a name match would silently pool them.
   */
  readonly assetsByPerson: readonly [PersonAssetFigures] | readonly [PersonAssetFigures, PersonAssetFigures];
  /**
   * **The Household's combined superannuation, at this month's CLOSE** — every interest of every
   * Person, whatever its phase (accumulation, TTR, Account-Based Pension), preserved or not and
   * exempt from the means test or not. It is not a fourth split of total wealth: it cross-cuts
   * `protectedAssets` and `assessableAssets` (the younger partner's accumulation super is in the
   * first, an Account-Based Pension in the second) and must never be stacked with either.
   *
   * **On `accessibleAssets`' clock, from the same balances:** after this month's drawdowns and
   * withdrawals, before this month's growth, and before the Guarantee, a salary sacrifice or a
   * Division 293 release reaches the fund — all four are written back after the close and so first
   * appear in the next month's figure.
   *
   * **Required, and nil where no Person holds an interest.** Unlike `mortgageBalance`, absence would
   * say nothing a nil does not: a Household with no super holds none of it.
   */
  readonly superBalance: Cents;
  /**
   * **Every Person's Non-Super Portfolio at market value, at this month's CLOSE** — the point
   * `closingBalance` and `superBalance` are read at: after this month's sales and buys, before the
   * growth the walk applies at the end of the tick. So
   * `closingBalance + superBalance + closingNonSuperPortfolio` is the Household's total wealth at
   * the close — the home and any home loan excluded, as `protectedAssets + assessableAssets` does.
   */
  readonly closingNonSuperPortfolio: Cents;
  /**
   * **Cash paid OUT of superannuation into the Household this month** — the sum of the month's
   * `INCOME_FROM_SUPER_LINES` (`projection.ts`): Account-Based Pension payments, a stated lump sum
   * and Waterfall limb 5's draw on released super. Contributions going IN are not in it, and nor is a
   * Division 293 release, which goes from the fund to the Commissioner. Nil where nothing was paid.
   *
   * It is a sum of lines already in `lines`, reported rather than left derivable for
   * `closingBalance`'s reason — and because the lines carry a Person's name, a consumer could only
   * pick them out by taking the description apart.
   */
  readonly incomeFromSuper: Cents;
  /**
   * **What is still OWED on the home loan at this month's close (P3-16 slice 2).** Slice 1 charged
   * the repayment and carried the balance as a local of `project()` that reached nothing, so the
   * screen could say what a household PAYS and not what it still owes — on a forecast whose whole
   * question is whether the loan is clear before the money has to last.
   *
   * **OPTIONAL, and ABSENT is "there is no loan", exactly as `Household.mortgage` is absent.**
   * A month of a Household that states none, and a month before a dated loan begins, carry no key
   * at all — so a walk without a mortgage is byte-identical to a build before this field existed
   * (`test/core-mortgage.test.mjs` pins that the word does not appear anywhere in such a walk).
   * **Nil is NOT absence here**: once a loan has been stated, `0` is the loan CLEARED, which is the
   * answer the user came for, and it is reported every month from then on.
   *
   * **The CLOSING balance, on `closingBalance`'s clock** — what is owed after this month's
   * repayment, read off the very `MortgageMonth` the month's two mortgage lines were written from.
   * The opening figure would disagree with the lines beside it by one month of principal.
   *
   * ⚠️ **It is a DEBT and nothing nets it.** ADR-0005 holds no value for the home, so this figure
   * is not subtracted from `protectedAssets`, `assessableAssets` or `accessibleAssets`, and it
   * reaches the means test not at all (`agePension.ts`'s `homeownerWithAMortgage`). It is reported
   * beside those three and is never one of them.
   */
  readonly mortgageBalance?: Cents;
  /**
   * **P12-1 — who has died by the first day of this month**, as indexes into `household.persons`.
   * The key is OMITTED while everyone is alive — `mortgageBalance`'s own widening, so every walk
   * without a `DEATH` is byte-identical. Every per-Person figure on this `Month` stays positional,
   * the deceased's at nil; this is what a display reads to stop showing an age for them
   * (`outcomes.ts`'s `agesAt`).
   */
  readonly died?: readonly number[];
  /**
   * **P14-16 — the combined Refundable Accommodation Deposit still held, net of retention withheld,
   * at this month's CLOSE.** Slice 3a (P14-13) kept this in a walk-local `radBalance` no `Month`
   * reported, so it vanished from every wealth figure the day it was paid and was never refunded —
   * found at review, 2026-09-24 (TODO.md). It is CENTRELINK-EXEMPT (the asymmetry
   * `agedCare.ts`'s header states) and structurally invisible to `splitAssets`/`agePensionEntitlement`
   * — this figure is reported beside that exemption, never fed back into it — and it is NOT
   * spendable: the Waterfall never reads it, because `radBalance` is never added to a Person's
   * `parcels` or to `openingBalance` in `project()`.
   *
   * **OPTIONAL, and ABSENT is "no `ENTER_CARE` has ever applied"**, `mortgageBalance`'s own terms —
   * so a walk with no aged care is byte-identical to a build before this field existed. Nil is NOT
   * absence: reported from the entry's own month on, including a DAP-only admission (no lump sum
   * paid, so this reads nil throughout) and a household whose RAD has already been refunded (nil
   * from the refund month on, since the refund becomes ordinary cash — see `closingBalance`).
   *
   * **The CLOSING figure, on `closingBalance`'s own clock** — this month's own payment and
   * retention already applied. `protectedAssets` carries the OPENING figure instead (before this
   * month's payment/retention), matching `assets.protectedAssets`'s own clock; the two figures can
   * therefore differ in the very month a RAD is paid or retained, exactly as `closingBalance` and
   * `protectedAssets`/`assessableAssets` already can (`test/app-month-to-rows.test.mjs`, "Total
   * wealth is NOT the chart's same-month figure — that is the start of the month").
   *
   * **What it is FOR: total wealth.** `Month.closingBalance + Month.superBalance +
   * Month.closingNonSuperPortfolio + (Month.radHeld ?? 0) - (Month.heasDebt ?? 0)` is what the
   * app's "Total wealth" table column and the stacked chart (via `protectedAssets`, above) now both
   * include the RAD in, so a resident entering care no longer makes the household look poorer by
   * the whole deposit, and no longer stays that way forever: the RAD is refunded (less retention) to
   * household cash in the month of the resident's DEATH — the only route out of care this build
   * models. A departure from care with no death is NOT modelled. `heasDebt` is the SUBTRACTED
   * sibling this same total needs from P9-1, slice 1 — see its own doc for why the sign differs.
   */
  readonly radHeld?: Cents;
  /**
   * **The Home Equity Access Scheme debt at this month's CLOSE, SUMMED across Persons (P9-2a):
   * what has been drawn, compounded fortnightly at 3.95% (`heasAccrueFortnight`), on each Person's
   * OWN loan (T37) and added together for this one household-wide figure.** A LIABILITY, and the
   * opposite of
   * `radHeld` for exactly one reason: a HEAS draw is real spendable cash that lands in
   * `closingBalance` every fortnight it runs, unlike a RAD (which never touches cash going in) or a
   * mortgage (`mortgageBalance`, which finances a home this model holds no value for and so nets
   * against nothing). Leaving this debt unreported beside the cash it produced would let a household
   * look richer by exactly what it borrowed — the flattering-without-basis failure this project is
   * organised against — so it is SUBTRACTED from total wealth: `Month.closingBalance +
   * Month.superBalance + Month.closingNonSuperPortfolio + (Month.radHeld ?? 0) − (Month.heasDebt ?? 0)`.
   *
   * **Kept OUT of `protectedAssets`, `assessableAssets` and `accessibleAssets` — none of them net
   * it, `mortgageBalance`'s own terms** — and OUT of the Age Pension's assessable assets entirely
   * (T38: where the home is the only security, the debt does not reduce assessable assets, because
   * the home is already exempt and was never in them to begin with; this field is not read by
   * `splitAssets` or `agePensionEntitlement`, and no code path connects it to either).
   *
   * **The No Negative Equity Guarantee bounds this at the SECURITY VALUE, not at whatever this
   * build projects.** Until P14-13 (2026-09-25) this slice modelled no repayment event, so a
   * projection that ran long enough could, in principle, show a figure interest had compounded past
   * the entry's `securityValue` — the capacity cap (`HeasCapacityCapNote`) stops new DRAWS well under
   * it, but does not stop interest. **`SELL_HOME` is now the one route out**: selling the home
   * repays the whole debt from the proceeds, CAPPED at the sale price — the NNEG applied, not merely
   * stated — and this field falls to nil that month. Absent a `SELL_HOME`, the debt still runs
   * unclamped exactly as before (no death-triggered repayment is built, unlike `radHeld`'s refund);
   * the NNEG remains a fact about the real scheme in that case, not yet enforced by this build.
   *
   * **OPTIONAL, and ABSENT is "no `HEAS_DRAW` has ever applied"**, `mortgageBalance`'s own terms — a
   * walk with no `HEAS_DRAW` is byte-identical to a build before this field existed. Nil is NOT
   * absence: reported from the entry's own month on.
   */
  readonly heasDebt?: Cents;
  /**
   * **The Age Pension ASSETS TEST's two thresholds this month, read straight off the entitlement
   * the walk computed** (`AgePensionEntitlement.assetsTest.freeArea` and `.cutOff`), combined for
   * the Household exactly as `assessableAssets` is. `fullPensionUpTo` is the free area — assessable
   * assets at or under it take nothing off the pension; `noPensionAbove` is the cut-off, above which
   * the assets test alone leaves no pension at all. Nominal cents, this month's own parameters, so
   * they step on indexation, on a couple becoming single and on a homeowner becoming a non-homeowner.
   *
   * **The assets test ONLY.** The income test can cut the pension below what these two imply.
   *
   * **OPTIONAL, and ABSENT is "no entitlement was computed this month"** — outside the Age Pension
   * parameter window. Never a default and never a carried figure from another month.
   */
  readonly assetsTestThresholds?: Readonly<{ fullPensionUpTo: Cents; noPensionAbove: Cents }>;
  /**
   * **P7-5 — the home status the walk DERIVED this month from a `SELL_HOME`, `BUY_HOME`,
   * `ENTER_CARE` or `RENT_OUT_HOME`**, the same status the means test was run on. The two-year
   * clocks are already in it: `vacatedWithinTwoYearExemption` → `vacatedBeyondTwoYearExemption`
   * and `noHomeSaleProceedsExempt` → `noHome` are the month each exemption ends.
   *
   * **OPTIONAL, and ABSENT is "no entry governs the home this month"** — the Household's stated
   * `homeStatus` applies unchanged, so a walk with none of those entries is byte-identical.
   */
  readonly homeStatus?: HomeStatus;
  /**
   * **P5-3 limb 2 / P5-4 — the month's `lines` provenance, merged upward.** See `MonthProvenance`.
   * It is derived from `lines` and reported rather than left derivable, for `closingBalance`'s
   * reason: a consumer that had to recompute it would be free to recompute it differently.
   */
  readonly provenance: MonthProvenance;
}
