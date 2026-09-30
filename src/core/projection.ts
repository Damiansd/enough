// P4-1 chunks 1, 2, 2b, 3, 4, 5a and 5b — `project()`'s month walk, the domain calculations wired
// into it, what an entry dated before the walk begins means, the Income Waterfall that turns separate
// reported lines into an actual cashflow, the first balances in this model that can move, and the
// first one that can FALL.
//
// **Chunk 1** gave the walk the shape of time: which months exist, in which order, and which
// Journal Entries fall in each of them. **Chunk 2** wires in `agePensionEntitlement` — the means
// test, run per month on that month's own parameters — and populates `protectedAssets`,
// `assessableAssets` and an `Age Pension` line from its result. **Chunk 2b** reads `plan.ts`'s
// `ENTRY_KIND` to decide what an entry dated BEFORE `settings.asAtDate` means, replacing chunk 1's
// blanket refusal of every such entry — see `project()`'s own doc below.
//
// **Chunk 3 is the taxable-income assembly, and it is what discharges register O72.** From
// FY2026-27 ITAA 1997 s 25-130 has two independent effects: it is `labour deductions` limb (c) of
// s 61-155(2), which P3-38 wired into WATO's base, and it is a Division 25 deduction, which reduces
// TAXABLE INCOME. The second limb had no call site anywhere in `src/core` — `taxableIncome()` is a
// bare boundary constructor over a number the caller already holds and `SaptoPerson.taxableIncome`
// is a required input — because nothing in this codebase computed assessable income LESS
// deductions. `taxableIncomeFromSalary` below is that computation, and it reuses
// `standardDeductionAmountFor` rather than writing a second $1,000, which is what O72 asks for by
// name. The result feeds `householdIncomeTax` and comes back out as per-Person `Income tax` lines.
//
// **Chunk 4 is the INCOME WATERFALL** (concept.md §4 and §5.12, TODO P4-3/P4-3a, ADR-0009):
//
//     salary → Account-Based Pension to its minimum → Non-Super Portfolio → Offset Account
//
// with the Age Pension applied wherever assessed. It brings the spending target (a twelfth of
// `SpendChangeParams.annualSpend`, with the rounding decision that field's doc asks for by name,
// taken once in `monthlySpendFromAnnual`), `ONE_OFF_EXPENSE` charged in its own month, the SHORTFALL
// condition P4-5's Shortfall Age will be read off, and — for the first time since chunk 0 —
// `openingBalance` and `closingBalance` that mean something. They mean exactly one thing and it is
// assertable: **`closingBalance` = `openingBalance` + Σ inflow − Σ outflow**, checked every month of
// every fixture in `test/core-projection-waterfall.test.mjs`.
//
// **All four limbs are built, named and ordered.** Chunk 4 left two of them drawing nothing; chunk
// 5b funds limb 2, so **only limb 3 is still nil** — and every nil still says which kind of nothing
// it is (`unfundedMiddleLimbs`, which now has three of them for limb 2 alone). A limb that is absent
// because it happens to be empty is a limb the next author does not know to fill.
//
// ✅ **THE RESIDUAL THAT FLATTERED IS CLOSED (P2-10b).** It used to read, here, that `TAX.years`
// carried FY2026-27 and FY2027-28 and nothing else, so that from FY2028-29 the walk emitted no
// income-tax line and the Waterfall spent the GROSS salary — about $1,220 a month of tax drag that
// was not there, for forty-six years of a forty-eight year walk, OVER-stating the household.
//
// The cause was a false premise rather than a missing figure. Income Tax Rates Act 1986 Sch 7 Pt I
// cl 1(b)'s third table is headed *“for the 2027-28 year of income OR A LATER YEAR OF INCOME”*, so
// the ladder past FY2027-28 was never unknown — it was unread (register O8). It has been read, and
// `taxYear` now answers for every later year from that sentence. **Every month of the walk from
// FY2026-27 onward carries its tax line**, and `test/core-projection-waterfall.test.mjs` asserts it
// as a dollar figure — the same test that used to assert the hole, replaced rather than deleted.
//
// What remains is **distance, not absence**: a FY2060-61 figure is the law as it stood on
// 2026-09-17 projected thirty-four years. `taxYear(fy).standingLawFrom` marks every such year, and
// the residual risk runs the safe way (every movement in this ladder on record is a cut, which
// OVER-states tax). Surfacing that distance in the output is its own piece of work; nothing in
// this module hides it.
//
// **Chunk 5a is BALANCES THAT MOVE, and it is growth only.** Until it, nothing in this model had a
// balance that could change: `splitAssets` re-read the STATIC `Household` every month, so month 0
// and month 575 reported identical assets, and `Settings.nominalReturn` was read nowhere in `src/`.
// The walk now carries a per-month balance state — plain mutable locals inside `project()`, exactly
// as `retiredOn`, `worksNoDays`, `annualSpend` and `openingBalance` already are — and synthesises a
// month-specific `Household` from it for the means test. `splitAssets` is reused VERBATIM: the
// operand is substituted (`withBalances`), the operation is not forked, because one concept with two
// incompatible types is the failure `household.ts`'s own header names.
//
// **P4-3b widened that substitution to a FOURTH pool: the Offset Account.** `Household` now carries
// an optional `openingOffsetBalance`, the walk seeds its running cash from it, and the running cash
// is substituted through `withBalances` before the split — so the Offset is in the means test, at
// the figure the month OPENS with, and `splitAssets` sees it like any other financial investment.
//
// The rate is `(1 + r)^(1/12)` and never `r / 12`, rounded DOWN; which balances grow and which do
// not is written out at `PersonBalances`, with the reason for each.
//
// ✅ **THE RESIDUAL THIS CHUNK ADDED IS CLOSED — P4-4, 2026-09-18.** It read, here, that growth
// moved `assessableAssets` with NO `MonthLine` against it: unrealised growth entered the Age
// Pension means test while no line in the month said where it came from, so a `Month` reported a
// larger assessable figure than the sum of its own lines could explain. The absence was asserted
// in `test/core-projection-growth.test.mjs` so that it would go red the day somebody closed it,
// and it did.
//
// **What closed it is `MonthLine.effect`, a SECOND axis beside `direction`** — `'cash' | 'wealth'`
// — rather than two more `direction`s, which would have reclassified a growth line as neither an
// inflow nor an outflow for every consumer that already switches on the two. Growth is emitted as
// one `effect: 'wealth'` line per Person per pool (see the block that writes them), and
// `cashMovement` is the single expression every cash reduction in this module goes through, so
// chunk 4's identity is now exactly what it always claimed to be: **`closingBalance` =
// `openingBalance` + Σ cash inflow − Σ cash outflow**, with the wealth lines beside it and outside
// it. Not one closing balance in the suite moved.
//
// ⚠️ **What a wealth line does NOT reconcile to, and it is measured rather than asserted.**
// `Σ(wealth lines) = Δ(protectedAssets + assessableAssets)` is FALSE — in 90 of 90 transitions of
// the fixture in `test/core-projection-growth-lines.test.mjs` — because `protected + assessable` is
// TOTAL WEALTH and therefore moves whenever money enters or leaves the Household at all. The exact
// identity needs four terms (Δ offset, the internal transfers, and the incidental costs of
// acquisition that leave with no line of their own) and is written out in full in that file.
//
// **Chunk 5b is THE FIRST BALANCE THAT FALLS: Waterfall limb 2, the Account-Based Pension minimum.**
// `minimumDrawdown.ts` is CALLED, not reimplemented — the band, the age on the relevant day, cl 3's
// day-count pro-rate, cl 4's nil and cl 5's single $10 rounding all stay inside it — and three
// rulings are taken out here, each in one place with a test:
//
//   * **DRAWDOWN FIRST, THEN GROWTH** (the user, 2026-09-17), in `balanceAfterDrawdownAndGrowth` and
//     nowhere else. A declared convention rather than a discovered fact — the engine has no
//     day-level calendar, so it must pick an end of a bracket, and this is the conservative end. It
//     **slightly UNDER-states a real household's balance**, by one month's growth on the payment.
//   * **THE ANNUAL MINIMUM IS A FLOOR ON THE YEAR, NOT A MONTHLY CAP**, in
//     `pensionAvailableThisMonth` and `minimumStillDueThisMonth`. Unlike chunk 4's twelfths and
//     chunk 2's fortnights, the source figure is neither a cap nor a rate per period: it is a
//     legislated MINIMUM on a year's total payments, so its monthly expression is a running
//     remainder that must be PAID by the year's end, and never a slice.
//   * **A STATED COMMENCEMENT DAY, OR NOTHING.** `StatedStreamSettings.commencementDay` is read;
//     where it is absent the limb stays nil with its own note and refuses to guess 1 July.
//
// ✅ **THE MINIMUM IS A FLOOR, NOT A CEILING — the user's ruling of 2026-09-17, and it closed BOTH
// ends of the seam that stood here.** Until that day limb 2 offered what was LEFT of the year's
// minimum and no more, which was wrong in two opposite directions at once and for one reason:
// withdrawals were decided from NEED alone rather than from what the law requires plus what is
// needed.
//
//   * **It capped the household below its own money.** A Household with $600,000 in an Account-Based
//     Pension and nothing else drew exactly 5.00% against a $64,370 spending target and was reported
//     as $125,452 "unfunded" across the walk while the balance ROSE. Nothing in the law caps a
//     drawdown. Limb 2 now offers the whole account balance, and a household that needs more than
//     the minimum draws it.
//   * **And it under-paid at the other end.** reg 1.06(9A)(a) requires the minimum to be PAID,
//     needed or not; a month whose other income met the target drew nothing, so part of the year's
//     legislated minimum was never paid ($9,140.00 of $28,000.00 on the order fixture) and the
//     household ended RICHER than the law allows. The residue is now swept out in the last month of
//     the financial year and lands in the Waterfall's running cash, exactly as limb 1's surplus
//     already does — settled by precedent, not a new holding place.
//
// ⚠️ **The residual the FLOOR leaves, in place of the one it closed: the same direction, and far
// smaller.** The residue is swept on the last month of the financial
// year rather than spread across it, because reg 1.06(9A)(a) requires the payment *at least
// annually* and a monthly schedule is exactly the invention `minimumStillDueThisMonth` rejects. So
// money a monthly-paying household would have moved into the (non-growing) Offset in July sits in
// the (growing) pension until June, and this model's household is richer by up to one year's growth
// on the unneeded part of one year's minimum — where before the ruling it was the whole of that
// residue, compounding for ever. It is bounded, it is stated, and a walk that ends mid-year never
// sweeps its last part-year at all.
//
// **THE POOL CAN NOW BE FUNDED, AND ONLY FUNDED — P3-21f chunk 3.** `NON_SUPER_INVESTMENT` has real
// params for the first time, and they express a BUY alone: an entry creates a parcel dated the
// entry's own day, at the amount paid, in one Person's portfolio (P3-21c), and the money comes OUT
// of the running cash as a `Non-Super Portfolio purchase` outflow — see `purchaseFromBuy`, which
// holds the trap that makes the funding non-negotiable and the precedent that settles a buy the
// month cannot afford. A disposal is chunk 4 and is refused here, in the type and again at run time.
//
// **AND THE POOL CAN NOW BE SOLD — P3-21f chunk 4.** `NON_SUPER_INVESTMENT` widens to
// `'buy' | 'sell'`. A sale realises `proceeds − cost base` per parcel against the parcels the Person
// actually holds, oldest first by default and in a stated order where the entry says so
// (`DEFAULT_PARCEL_SELECTION`, P3-21a ruled 2026-09-17), and a parcel held MORE THAN 12 months is
// discounted by half (s 115-25). The proceeds are an inflow into the running cash; the discounted
// gain is CARRIED and reaches no tax base, which is chunk 5. Brokerage arrives with it: an
// incidental cost of acquisition is part of the cost base (s 110-25), so a buy's cash outflow is the
// GROSS figure while its market value is the units alone — see `purchaseFromBuy`, where the
// invariant chunk 3 asserted is rewritten rather than deleted.
//
// ⚠️ **An entry-driven disposal is NOT limb 3.** The Waterfall still draws nil from the portfolio and
// still says why, word for word. A household that is short does not reach for its parcels here; it
// reaches for them in chunk 6. What this is, is a user who stated a sale.
//
// ⚠️ **AND LIMB 3'S SALE FUNDS ITS OWN CAPITAL GAINS TAX — P10-4, user ruling of 2026-09-21.** Until
// that day the limb sold exactly what the month was short and the tax on the sale was charged
// afterwards, against the same cash — so a month funded by a sale came up short by exactly its own
// tax, however much the Household could reach. It was measured at **$566.10 short beside
// $18,088,555**, and it was not only a solver problem: the Shortfall Age on the page was wrong, in
// the alarming direction, wherever selling investments was the marginal source. The limb now offers
// what the portfolio can DELIVER — market value less the tax selling it would cause — and grosses
// the draw up to deliver it. **Selling more realises more gain, which is more tax**, so the answer
// is circular; it is solved by a fixed point from below with a bisection behind it, to the cent, in
// a bounded number of probes, and BOTH halves of the circle come out of one function so the figure
// sold to cover the tax is the figure charged. The method, the termination proof and the iteration
// bound are written out in `project()` at the block headed *THE SALE FUNDS ITS OWN TAX*. A stated
// sale is NOT grossed up — the user said the amount — and a portfolio that cannot fund the month
// plus its own tax is a genuine shortfall and is still reported as one.
//
// **What is still deliberately absent.** No Non-Super Portfolio draw (limb 3, blocked on P3-21's
// CGT ruling), so a Household whose pension is exhausted has no other pool to reach at all — an
// UNDER-statement; no mortgage, no CGT, no franking, and no O57 transfer-balance ledger join. Limb
// 3 is the visible edge of all of that.
// **And no income other than salary reaches taxable income**, which is stated with its direction at
// `project()`'s doc: the Age Pension is assessable and is NOT in it, which under-states tax and
// flatters the household. It has no ruling behind it — it is simply unbuilt — and with the
// tax-year residual and the unpaid-minimum residual both closed above, it is now the LARGEST
// residual in this module running that way.
//
// **The clock (P4-1a, ADR-0002's 2026-09-03 note).** Nothing here reads the system clock. There is
// no `Date.now()`, no `new Date()`, no `Date` at all: the walk is string arithmetic on `YYYY-MM`,
// exactly as `household.ts`'s `ageAt` is string arithmetic on `YYYY-MM-DD`. "Today" is
// `settings.asAtDate` and there is no other. This is asserted twice in
// `test/core-projection.test.mjs` — once by running the same fixture under two different faked
// system clocks and requiring byte-identical output, and once as a source-text canary over this
// module — and both assertions carry a vacuity control, because a clock test that passes whether
// or not the clock was faked proves nothing.
//
// **The signature takes a `Household`, which ADR-0002's `project(settings, entries)` does not.**
// This is a finding, not a liberty. The horizon is an AGE — `Settings.planningHorizonAge`, 100 —
// and turning an age into a date needs a date of birth. `Settings` carries no `Person` and no
// `dateOfBirth`, and `household.ts` is where both live. The alternatives were to widen `Settings`
// with a Person (which would give `Person` and `Household` a second home, the exact failure
// `household.ts`'s header names) or to take a bare `dateOfBirth` (which would be a third spelling
// of a fact `Household` already holds, and would not survive chunk 2, where the means test needs
// the whole `Household` anyway). So the `Household` is a parameter. `Settings` is untouched. Chunk
// 2 confirms it: `agePensionEntitlement` takes the whole `Household`.
//
// **The clock, through the new call paths.** `agePension.ts` reaches
// `data/assumptions/agePension.ts`, whose `dayBefore` calls `new Date(...)`. That is a constructor
// over a SUPPLIED string, never `Date.now()`, so the walk stays clock-free — and that is asserted
// behaviourally, not by reading the source: `test/core-projection-age-pension.test.mjs` runs an
// entitlement-bearing fixture under two fake clocks five years apart and requires byte-identical
// output, exactly as chunk 1 does for the bare walk. Chunk 3 puts `incomeTax.ts`,
// `incomeBases.ts` and `data/assumptions/tax.ts` on the path and **re-earns the same tick rather
// than inheriting it**: `test/core-projection-tax.test.mjs` runs the two-clock harness over a
// fixture that produces a tax figure, and asserts that figure is in the output, so an empty walk
// cannot pass it vacuously.
import { addCents, formatCents, mulCents, subCents, toCents } from './money.js'; // `.js` is correct in a `.ts` file — see tsconfig.json
import { FULL_COVER, monthlySuperInsuranceForOneMonth } from './superInsurance.js';
import type { CoverKept } from './superInsurance.js';
import { ageAt, assertIsoDate, financialAssets, homeTreatment, isCouple, mortgageMonth, mortgagePayoffMonth, offsetInterestByOwner, splitAssets } from './household.js';
import { CessationBeforePreservationAgeError, benefitAccess, conditionOfRelease } from './conditionOfRelease.js';
import type { GainfulEmployment } from './conditionOfRelease.js';
import { TTR_PAYMENT_TAX_NOTE, releasedInPartClaimNote, releasedSuperannuationOffer, requireTtrPaymentAge, superLumpSumWithdrawal, underTaxFreeAgeClaimNote } from './superLumpSum.js';
import { ttrAnnualCeiling } from './ttrPaymentRange.js';
import { accumulationInterest, fundEarningsTax, phaseHeldForTheWholeYear, phaseHeldFrom, retirementPhaseInterest } from './superPhase.js';
import type { EarningsPhase, PhaseYearFraction, SuperInterest as FundEarningsSuperInterest } from './superPhase.js';
import { COMPLYING_RESIDENT_QUALIFIED_FUND, frankedDistributionFromStatement, frankingInSuper } from './superFranking.js';
import { compareFinancialYears, daysInFinancialYear, daysInclusive, endOfFinancialYear, financialYearContaining, nthBirthday, startOfFinancialYear } from './financialYear.js';
import { trisConversionDayUnderItem106 } from './trisConversionDay.js';
import { PUBLISHED_TRANSFER_BALANCE_CAP, retirementSwitches, workSpells } from './retirementPension.js';
import type { WorkSpellChange } from './retirementPension.js';
import { minimumDrawdown, pensionAccountBalance, pensionAccountBalanceObservedLater } from './minimumDrawdown.js';
import { UnvaluedAssessableHomeError, agePensionEntitlement } from './agePension.js';
import { BEREAVEMENT_DAYS_TO_PERIOD_END, bereavementLumpSum } from './bereavement.js';
import { applyWorkBonus } from './workBonus.js';
import { AGE_PENSION, AGE_PENSION_PERIODS, STANDING_PARAMETERS_DIRECTION, agePensionPeriodsThrough, agePensionPeriodAt, defaultAgePensionSeries, maximumPaymentRate } from '../data/assumptions/agePension.js';
import type { RateStatus } from '../data/assumptions/agePension.js';
import { agedCareAccommodationPayment, agedCareFees, agedCareMeansAssessment, agedCareRadRetentionDeduction, startingNcccCapBalance } from './agedCare.js';
import type { AgedCareNcccCapBalance, AgedCarePersonMeans } from './agedCare.js';
import { AGED_CARE, AGED_CARE_PERIODS, agedCarePeriodAt, agedCarePeriodsThrough } from '../data/assumptions/agedCare.js';
import type { AgedCarePeriod } from '../data/assumptions/agedCare.js';
import { daysInMonth } from '../data/assumptions/periods.js';
import { HEAS, heasAccrueFortnight, heasAgeComponent, heasFortnightlyCap, heasFortnightlyDraw, heasFortnightlyDrawDuringAdvancePeriod, personMaximumLoanAvailable } from '../data/assumptions/heas.js';
import { mergeProvenance, provenanceOf } from './provenance.js';
import { ENTRY_KIND } from './plan.js';
import { householdIncomeTax } from './incomeTax.js';
import { frankedDistributionFromShare, frankingForIndividual, qualifiedResidentIndividual } from './individualFranking.js';
import { div293Income, netLabourIncomeFromSalary, rebateIncome, reportableSuperannuationContributions, taxableIncome, totalNetInvestmentLoss } from './incomeBases.js';
import { concessionalContributions, concessionalContributionsOverGeneralCap, contributionsTax, personalDeductibleContributions, refuseConcessionalContributionsOverGeneralCap } from './superConcessional.js';
import { ACCUMULATION_INTEREST_ONLY, division293Tax, lowTaxContributionsFromComponents } from './div293.js';
import { division293ReleaseDestination, refuseReleaseAboveBalance } from './division293Release.js';
import { SuperGuaranteeEarningsBaseError, qualifyingEarnings, superGuarantee, superGuaranteeBelowTheFloor } from './superContributions.js';
import { MissingIndexNumberError, forecastAwoteIndexNumbers } from './superCaps.js';
import type { IndexNumbers } from './superCaps.js';
import { CGT_REFORM_START, INDEXATION_FACTOR_DECIMAL_PLACES, PRE_CGT_CUTOFF, standardDeductionAmountFor, taxYearAvailable } from '../data/assumptions/tax.js';
import type { Cents } from './money.js';
import type { AssetSplit, Household, HomeStatus, Mortgage, MortgageMonth, Parcel, Person, PersonAssetSplit, SuperInterest } from './household.js';
import type { QualifyingEarnings } from './superContributions.js';
import type { ConcessionalContributionComponents, ContributionsTax } from './superConcessional.js';
import type { Entry, FigureProvenance, HeasCapacityCapNote, IsoMonth, LineAttribution, Month, MonthLine, MonthNote, MonthProvenance, ParameterWindowNote, ParcelSelection, PensionAtRetirementNote, ProvenanceRegister, Settings, StandingParametersNote, StatedByEntries, SuperGuaranteeNote, UncarriedProvenance, UnattributedFigure, UnlegislatedFigure, UnstatedFigure, WaterfallLimbNote } from './plan.js';
import type { ComputedProvenance, Consumed, ProvenanceBearing } from './provenance.js';
import type { AgePensionEntitlement } from './agePension.js';
import type { MinimumTaxFacts, SaptoPerson } from './incomeTax.js';
import type { Div293Income, ReportableSuperannuationContributions, TaxableIncome } from './incomeBases.js';
import type { LowTaxContributions } from './div293.js';
import type { AgePensionIndexationSeries } from '../data/assumptions/settings.js';
import type { FinancialYear, IsoDate } from '../data/assumptions/types.js';
import { assertIsoMonth, forecastWindow, monthOf } from './forecastWindow.js';
import { inflateStated, monthsBetween, priceLevelFactor } from './priceLevel.js';

/** The `ENTER_CARE` member of `Entry`, narrowed once here rather than cast at every read site. */
type EnterCareEntry = Extract<Entry, { readonly type: 'ENTER_CARE' }>;

/** The `HEAS_DRAW` member of `Entry`, `EnterCareEntry`'s own precedent. */
type HeasDrawEntry = Extract<Entry, { readonly type: 'HEAS_DRAW' }>;

/** The `SELL_HOME` member of `Entry`, `EnterCareEntry`'s own precedent. */
type SellHomeEntry = Extract<Entry, { readonly type: 'SELL_HOME' }>;

/** The `RENT_OUT_HOME` member of `Entry`, `SellHomeEntry`'s own precedent. */
type RentOutHomeEntry = Extract<Entry, { readonly type: 'RENT_OUT_HOME' }>;

/** The `BUY_HOME` member of `Entry`, `SellHomeEntry`'s own precedent. */
type BuyHomeEntry = Extract<Entry, { readonly type: 'BUY_HOME' }>;

/** The `DOWNSIZER_CONTRIBUTION` member of `Entry`, `SellHomeEntry`'s own precedent. */
type DownsizerContributionEntry = Extract<Entry, { readonly type: 'DOWNSIZER_CONTRIBUTION' }>;

// **`assertIsoMonth` and `monthOf` were DEFINED here until P4-1b part (B) and are now re-exported.**
// They moved to `forecastWindow.ts` with the window they build, because that module has to sit below
// the transfer balance account modules — which part (A) will let `project()` import — and a module
// cannot sit below something it imports. Re-exported rather than relocated silently: every existing
// importer of `monthOf` from this module keeps working, and there is still exactly one definition.
export { assertIsoMonth, forecastWindow, horizonMonth, monthOf } from './forecastWindow.js';
export type { ForecastWindow } from './forecastWindow.js';

/** The month after `month`. Pure string arithmetic on `YYYY-MM`: no calendar object, no timezone, no clock. */
export const nextMonth = (month: IsoMonth): IsoMonth => {
  const year = Number(assertIsoMonth(month).slice(0, 4));
  const ordinal = Number(month.slice(5, 7));
  if (ordinal < 1 || ordinal > 12) throw new RangeError(`not a month of the year: ${month}`);
  const [nextYear, nextOrdinal] = ordinal === 12 ? [year + 1, 1] : [year, ordinal + 1];
  return assertIsoMonth(`${String(nextYear).padStart(4, '0')}-${String(nextOrdinal).padStart(2, '0')}`);
};

/**
 * The day a month's parameters are read on: its FIRST day.
 *
 * **A ruling the tick forces, and nothing in `plan.ts` settles.** `Month` is stamped `YYYY-MM` and
 * every Age Pension parameter is stamped `YYYY-MM-DD`, so the walk must name a day. The 1st is
 * chosen, and the consequence is stated rather than hidden: the payment rates reindex on 20 March
 * and 20 September and the age gates turn on a birthday, so **anything that takes effect after the
 * 1st is recognised from the FOLLOWING month.** A 20 September uplift first appears in the October
 * tick; a Person who turns 67 on the 20th is first paid in the month after.
 *
 * The alternatives were the last day (which applies a 20 September rate to the nineteen days before
 * it) and a within-month apportionment (which is the accurate answer and needs a day-count calendar
 * this module deliberately does not have — it is string arithmetic on `YYYY-MM`). The lag is at most
 * one month, it is uniform across every parameter and every age gate, and it is visible here.
 */
export const firstDayOf = (month: IsoMonth): IsoDate => `${assertIsoMonth(month)}-01` as IsoDate;

/**
 * **The fortnight → month conversion, in exactly one place.**
 *
 * `agePensionEntitlement` returns a rate **per fortnight**; a `Month` reports a month. There is no
 * exact conversion, because a fortnight does not divide a month and the real payment is 26
 * instalments landing on a cycle anchored to a claim date this model does not hold. So this is a
 * **stated convention, not an arithmetic fact**:
 *
 *   monthly = fortnightly × 26 ÷ 12
 *
 * i.e. **annualise at 26 fortnights, then take a twelfth**, rounded to the cent by `mulCents`
 * (half away from zero).
 *
 * **Why 26 and not 365.25 ÷ 14.** 26 fortnights is 364 days, so this under-states a calendar year by
 * about 1.4 days — roughly 0.27%, about $80 a year on a full single pension. It is chosen anyway,
 * for two reasons that a day-count convention cannot match. First, 26 is the convention the source
 * uses: DSS and Services Australia annualise their own fortnightly rate tables at 26, so the annual
 * figure this produces is the annual figure the published material states, and a user checking the
 * tool against Services Australia's own page finds agreement rather than a $80 discrepancy nobody
 * can source. Second, it makes twelve monthly figures sum to exactly the annual entitlement at a
 * constant rate, which is the invariant every chart and every total in this tool is read against;
 * 365.25 ÷ 14 gives a monthly figure whose twelve-fold is a year of no particular length.
 *
 * **The precedent this follows.** `SpendChangeParams.annualSpend` stores an ANNUAL figure by the
 * user's ruling of 2026-09-16, "precisely so the engine does the dividing", and its doc says whoever
 * first divides owes a single rounding decision with a test. This is the same unit — a twelfth of a
 * year — and the same discipline: one function, one rounding, one test
 * (`test/core-projection-age-pension.test.mjs`), and no factor written at a call site.
 *
 * **What is NOT claimed.** That this ties to a Centrelink payment summary to the cent. It does not,
 * and cannot: `deemedIncome` records the same gap for its own ÷26 (the register states no
 * fortnightly rounding convention, register O22's sibling). This is a monthly projection of an
 * annualised rate, and it is presented as one.
 */
export const FORTNIGHTS_PER_YEAR = 26;

export const monthlyFromFortnightly = (perFortnight: Cents): Cents =>
  mulCents(perFortnight, FORTNIGHTS_PER_YEAR / 12);

/**
 * **How many fortnights a month contributes — the SAME convention as `monthlyFromFortnightly`,
 * applied to a COUNT rather than to a dollar figure (P4-10).**
 *
 * The Work Bonus is a fortnightly mechanism with a fortnightly cap ($300 accrued or used per
 * fortnight, §4.6), and the walk ticks monthly. Carrying its balance across monthly ticks needs a
 * stated number of fortnights per month, and there is no arithmetic fact to appeal to: 26 does not
 * divide by 12. Scaling a fortnight's *movement* by 26 ÷ 12 — the dollar convention above — is not
 * available here, because 2.1667 applications of a per-fortnight cap is not a quantity: a $300 cap
 * applied 2.1667 times banks $650, which is not a thing the register permits in any fortnight.
 *
 * So the residual is carried in the COUNT instead of smeared into the figure:
 *
 *   fortnights in month n = ⌊26(n + 1) ÷ 12⌋ − ⌊26n ÷ 12⌋
 *
 * which is **2, 2, 2, 2, 2, 3, 2, 2, 2, 2, 2, 3** — twenty-six per twelve months, exactly, with
 * every fortnight a whole one so every per-fortnight cap binds as the register states it. It is the
 * same claim `monthlyFromFortnightly` makes (annualise at 26, take a twelfth) and the same invariant
 * (twelve months sum to the year), and it keeps the same thing unclaimed: this does NOT tie to a
 * Centrelink payment cycle, which is anchored to a claim date this model does not hold. The third
 * fortnight lands in the sixth and twelfth month of the WALK, not of the calendar or of the cycle.
 *
 * **What this leaves as a residual, stated rather than hidden.** The entitlement for a month is
 * computed once, from the balance the month OPENS with (the standing convention — a month is
 * assessed on what it opens with, `firstDayOf` and `openingBalance` both). A balance that empties on
 * the month's second fortnight therefore still shelters the month's whole assessment. Direction:
 * **the month in which a balance runs out is assessed too generously**, by at most one month of the
 * relief the exhausted balance was giving. It is the last month of an over-statement P4-10 otherwise
 * removes entirely, and it is bounded by one tick rather than running to the end of the walk.
 */
export const fortnightsInWalkMonth = (index: number): number =>
  Math.floor(((index + 1) * FORTNIGHTS_PER_YEAR) / 12) - Math.floor((index * FORTNIGHTS_PER_YEAR) / 12);

/**
 * **One Person's Work Bonus balance at the END of a walk month — P4-10's write-back.**
 *
 * `applyWorkBonus` is the only thing that moves this balance, and it moves it one fortnight at a
 * time: $300 of accrual applied to the fortnight's eligible income, the excess drawn from the
 * balance, the unused part of the $300 banked, and the whole capped at $11,800 (§4.6). This runs it
 * once per fortnight the month contributes (`fortnightsInWalkMonth`), feeding each fortnight's
 * `balanceAfter` into the next, and returns the last one. **Both halves are load-bearing**: a loop
 * that kept the draw and dropped the accrual would leave a Person who stopped work with no banked
 * entitlement (the UNDER-stating half of the gap), and one that kept the accrual and dropped the
 * draw would shelter a full wage forever (the OVER-stating half P4-10 names).
 *
 * **The cap is not enforced here and must not be.** `applyWorkBonus` clamps its own `balanceAfter`
 * to `WORK_BONUS_MAXIMUM_BALANCE`, so a balance iterated through it cannot pass $11,800 however
 * many fortnights are iterated; a second clamp written at this call site would be the same figure
 * enforced in two places, and the one that drifted would be the one nobody read.
 *
 * `eligible` is passed straight through and is NOT decided here — it is the flag
 * `agePensionEntitlement` already computed for this Person on this date, gated on Age Pension age
 * alone. An ineligible Person's balance comes back untouched, which is `applyWorkBonus`'s own
 * early return and not a rule added by the walk.
 */
export const workBonusBalanceAfterMonth = (person: Person, eligible: boolean, fortnights: number): Cents => {
  let balance = person.workBonusBalance;
  for (let fortnight = 0; fortnight < fortnights; fortnight += 1) {
    balance = applyWorkBonus({ ...person, workBonusBalance: balance }, eligible).balanceAfter;
  }
  return balance;
};

const FIRST_PARAMETER_DAY: IsoDate | undefined = AGE_PENSION_PERIODS[0]?.from;
const LAST_PARAMETER_DAY: IsoDate | undefined = AGE_PENSION_PERIODS.at(-1)?.to;

/**
 * **Whether Age Pension parameters exist for `date` at all — the boundary this chunk discovered.**
 *
 * `agePensionEntitlement` needs only `{ household, date, deemingRates }`, with no missing operand
 * and no open ruling, which is why it is the first domain module wired in. What it ALSO needs, and
 * what no operand list says, is a **parameter period**: `AGE_PENSION_PERIODS` is assembled from the
 * register's published window and covers 2026-03-20 → 2027-03-19 and nothing else. One day past it
 * `agePensionPeriodAt` throws, because the rates for that day have not been determined and this
 * project does not extrapolate a determined figure (the same rule `deemingRatesAt` already applies).
 *
 * A projection runs to age 100. So for a horizon of forty-eight years, the Age Pension was computable
 * for the first seven months and not for the remaining five hundred and seventy-two.
 *
 * **P4-1c closed that, and it closed it with a Setting rather than a figure.**
 * `Settings.economicSeries.agePension` carries the caller's own dated CPI, PBLCI and MTAWE
 * observations (register O5), and `agePensionEntitlement` now takes them and runs §4.7's mechanism
 * forward to the month it is asked for. Supply the series and every month of the walk computes;
 * supply none and the published window was all there was, exactly as before.
 *
 * ⚠️ **AND FROM 2026-09-21 (P4-1e) SUPPLYING NONE COMPUTES TOO, ON A STANDING TABLE.** The user has
 * ruled that current numbers stand while the legislation is awaited, so past 19 March 2027 a plan
 * with no series gets the last published sets carried forward and **marked as carried** — on the
 * period, on the entitlement, in the month's `notes` and in the line's provenance caveats. The
 * sentence that stood here, *"what cannot happen either way is a flat carry-forward"*, is superseded
 * for the no-series case and is **untouched for the stated-series case**, which is the half that was
 * always the point: a series that stops mid-walk still raises `MissingPensionIndexationError` from
 * the date it stops, and that refusal is deliberately NOT caught here. A projection that quietly
 * dropped the Age Pension line for the last twenty years because the user's series ran short would
 * be the silent flattening this whole item exists against — and so would one that silently
 * substituted a carried set for the observation they claimed to be giving.
 *
 * ⚠️ **AND FROM 2026-09-23 THE WALK CARRIES NOTHING EITHER WAY.** The user has ruled that a plan
 * stating no series is indexed on its own `cpi`, `pblci` and `mtawe` rather than held at 2026 values,
 * so `project()` passes `stated ?? generated` (`defaultAgePensionSeries`) and the standing table is
 * reached only by a direct caller of `agePensionEntitlement` who passes no series at all.
 *
 * **What the walk does BELOW the window, and why.** It emits the month, it reports
 * `protectedAssets` and `assessableAssets` (which are `splitAssets(household, date)` and need no
 * period), and it emits **no Age Pension line at all**. It does not emit a zero: a zero would be a
 * computed entitlement, and this is an absent one. (Until 2026-09-21 this was also what it did
 * ABOVE the window, which is what the standing table changed.) Two alternatives were weighed and rejected on the
 * record. *Refusing outright* — the posture this codebase prefers, and the one
 * `UnvaluedAssessableHomeError` takes — would make `project()` throw for every realistic horizon and
 * would delete chunk 1's month walk along with its tests, so the refusal would cost more than the
 * approximation it prevents. *A zero-amount line saying "not computed"* would at least be visible in
 * the month's own breakdown, and was rejected because `MonthLine.amount` is specified as always
 * positive.
 *
 * ⚠️ **THE SECOND HALF OF THAT REJECTION IS SUPERSEDED (P4-4's polish, 2026-09-18), and the
 * SENTENCE IS KEPT because the reasoning it records is still right.** It read: *"`Month` has no slot
 * for 'not computed' — which is itself a finding about the shape, and `plan.ts` is not this chunk's
 * to widen."* The finding was acted on. `plan.ts` now carries `MonthNote`, `Month.notes` holds them,
 * and an uncomputed month emits `PARAMETER_WINDOW_NOTES['Age Pension']` beside its empty `lines` —
 * so *"nobody has legislated it"* and *"nil"* are no longer the same output. What did NOT change is
 * the rejection of the zero-amount line: a note is not a movement, and none was manufactured.
 */
export const agePensionParametersCover = (date: IsoDate): boolean =>
  // The lower bound holds whatever the caller supplies: §4.7 indexes FORWARD from a published set,
  // and running it backwards to reach 2019 would be an extrapolation in the other direction. It is
  // the ONLY bound left. **The upper bound went on 2026-09-21 with the standing table (P4-1e):**
  // past the published window a plan with no series now gets the last published sets carried
  // forward, marked as carried, so there is no date above the window that cannot be computed.
  //
  // **THE `series` PARAMETER WENT WITH IT, and was not left unread.** It had one job — to say that
  // with a series the upper bound is the series' own reach — and with no upper bound it decided
  // nothing. An unread parameter here would be worse than a dead one: a caller passing a SHORT
  // series would read a `true` as an assurance that their series reaches this date, which it never
  // was and now could not be. A short series still raises `MissingPensionIndexationError` out of
  // the walk, deliberately uncaught, and that refusal is the only thing that ever guarded it.
  FIRST_PARAMETER_DAY !== undefined && date >= FIRST_PARAMETER_DAY;

/**
 * The last month whose Age Pension parameters were **published**. Exported so the boundary above is
 * a value a caller and a test can read, rather than a date written twice.
 *
 * ⚠️ **RENAMED 2026-09-21 from `LAST_AGE_PENSION_MONTH`, and the rename is the point.** Under that
 * name it meant *the last month for which any Age Pension figure can be computed*, and with the
 * standing table wired (P4-1e) that sentence became false: every later month computes, on the last
 * published sets carried forward and marked as carried. The constant still holds a true and useful
 * fact — it is the month the carrying starts from — but a name that still promised the old one
 * would be a figure the code could hand a caller while meaning something else. Nothing in `src/`
 * read it either way; the rename is so that nothing starts.
 */
export const LAST_PUBLISHED_AGE_PENSION_MONTH: IsoMonth | undefined =
  LAST_PARAMETER_DAY === undefined ? undefined : monthOf(LAST_PARAMETER_DAY);

/**
 * **P14-17 — whether `date` is on or after the FIRST published aged care schedule, and only that.**
 * Until 2026-09-25 this also checked an upper bound, because forward indexation past the one
 * published year was unbuilt and a resident in care past it was refused outright — the defect
 * `agedCareScheduleThrough`/`agedCarePeriodsThrough` (`data/assumptions/agedCare.ts`) close, on
 * `agePensionParametersCover`'s own precedent immediately above: the mechanism runs FORWARD from a
 * published set and never backwards, so the lower bound is the only one that can ever refuse. A
 * date below it is refused because nothing has been published for it to extrapolate from at all, not
 * because a forecast was declined.
 */
export const agedCareParametersCover = (date: IsoDate): boolean => {
  const first = AGED_CARE_PERIODS[0];
  return first !== undefined && date >= first.from;
};

// --- Chunk 3: salary, taxable income and the Household's income tax ------------------------------

/**
 * **Where salary comes from, and the finding that goes with it.**
 *
 * `Person.employmentIncomePerFortnight` is the only income field anywhere on the model, and it is
 * the one this chunk reads. It was added for the Work Bonus (T29) and its doc says what it holds:
 * *"Employment and active self-employment income per fortnight"* — which is exactly the s 25-130(4)
 * / s 61-155(2) labour base this chunk needs, stated per fortnight.
 *
 * **A Journal Entry CAN now state a salary, and the caller states it — 2026-09-19.** The gap this
 * paragraph used to record is closed: `WORK_PATTERN_CHANGE` once carried `daysPerWeek` alone, and
 * because no rate per day and no full-time week exist anywhere in the model, `daysPerWeek: 3`
 * could not be turned into a figure without inventing a five-day baseline. It was therefore not
 * applied at all, and a Person who cut their days went on being paid their whole wage — which
 * **over-stated** salary, tax and household income, the flattering direction. The remedy was
 * always "a field the caller states" rather than a baseline invented here, and that field is
 * `WorkPatternChangeParams.annualSalary`: "3 days a week" is now stated as "$60,000 a year from
 * this date". `daysPerWeek` is still read for the zero case and is otherwise descriptive — nothing
 * below divides by it or multiplies by it.
 *
 * **What a `WORK_PATTERN_CHANGE` does to the salary, and what still beats it:**
 *
 *   * a STATED `annualSalary` replaces the annualised `employmentIncomePerFortnight` for that
 *     Person from that month, as a LEVEL: it holds until another `WORK_PATTERN_CHANGE` supersedes
 *     it, exactly as the zero-day pattern is superseded by a positive-day one;
 *   * `RETIRE` wins over it wherever both stand, in either order, with ONE exception: a
 *     positive-days pattern dated strictly after the day the Person stopped work is a return to
 *     work (retire flow S3, 2026-09-29, `workSpells`), and pays again. One dated on or before the
 *     stop is overruled by it, so the ordering below tests the stop first.
 *
 * **The two cases that need no stated figure are applied on their own**, because both drive salary
 * to nil and nil needs no baseline:
 *
 *   * `RETIRE`, whose `RetireParams` doc is explicit — *"the date is the fact. Gainful employment
 *     ceases on it"*. Ignoring it would pay a retired Person a salary for the remaining forty
 *     years of the walk, which is the largest over-statement this chunk could make.
 *   * `WORK_PATTERN_CHANGE` with `daysPerWeek === 0`. Zero days is zero labour income whatever the
 *     day rate is. `plan.ts` is right that this is *"a pattern, not a retirement"* — it satisfies
 *     no Condition of Release and this module draws no other conclusion from it — but a Person
 *     working no days is not being paid for them. Unlike `RETIRE` it is reversible: a later
 *     `WORK_PATTERN_CHANGE` with positive days restores a salary, because the entry is a LEVEL.
 *     `parsePlan` refuses a zero-day entry that also states money, so the two cannot disagree.
 */
export const annualSalaryFromFortnightly = (perFortnight: Cents): Cents =>
  mulCents(perFortnight, FORTNIGHTS_PER_YEAR);

/**
 * **The annual → month conversion.** Deliberately a second function rather than a reuse of
 * `monthlyFromFortnightly`: composing the two would round twice, and chunk 2's hand-worked Age
 * Pension figures are computed from `× 26 ÷ 12` in ONE rounding. One twelfth, `mulCents`-rounded
 * (half away from zero), so twelve identical months sum to the annual figure to within six cents.
 */
export const monthlyFromAnnual = (perYear: Cents): Cents => mulCents(perYear, 1 / 12);

/**
 * **The annual → fortnight conversion, and the ONE place a stated salary is divided (P4-8).**
 *
 * The means test is assessed per fortnight and the only in-force salary that is not already a
 * fortnightly figure is a `WORK_PATTERN_CHANGE`'s STATED `annualSalary`. This is the inverse of
 * `annualSalaryFromFortnightly` and it is **not exact in integer cents**: $60,000.01 a year is
 * $2,307.69 a fortnight and 26 of those is $59,999.94. That is inherent — a stated annual figure
 * need not be 26 times any whole number of cents — and it is why the walk does NOT round-trip:
 * where nobody has stated a salary the means test is handed `employmentIncomePerFortnight` itself,
 * untouched, so the ordinary case has no rounding at all, and where a salary IS stated the
 * division happens exactly once, here, against the stated figure. Dividing the ANNUALISED figure
 * back down would put a rounding error in a means test that no entry asked for.
 *
 * The income tax assessment keeps the stated ANNUAL figure and never this one, so the two readings
 * of a stated salary differ by at most 26 half-cents a year and neither is derived from the other.
 */
export const fortnightlyFromAnnual = (perYear: Cents): Cents => mulCents(perYear, 1 / FORTNIGHTS_PER_YEAR);

/**
 * **`tax.s25130.reducerDeductions` at its documented nil default**, written once, here.
 *
 * The Setting exists — `SETTINGS_NOT_ASSUMPTIONS['tax.s25130.reducerDeductions']` — and `Settings`
 * in `plan.ts` carries no field for it. Adding one is a widening of `plan.ts`'s public contract and
 * is reported rather than taken: it would have to be per-Person (s 25-130 is assessed per Person),
 * which makes it a `Person` field and therefore a `household.ts` change too. Until a caller can
 * state it, the register's own default stands, and the direction is the one
 * `netLabourIncomeFromSalary` already records: for a Person with real work deductions above
 * $1,000, a nil here **under-states** the deduction and so over-states tax.
 *
 * It is threaded through both limbs below rather than dropped, so the day the Setting arrives the
 * change is this constant becoming a lookup and nothing else.
 */
const REDUCER_DEDUCTIONS: Cents = toCents(0);

/**
 * **Whether income tax is computable for `fy` at all — chunk 3's version of chunk 2's parameter
 * window. P2-10b opened it upward and it now covers the whole walk.**
 *
 * This used to be `Object.keys(TAX.years).includes(fy)`, which was right only while every
 * answerable year was a key. It no longer is. `data/assumptions/tax.ts` answers for FY2026-27 and
 * FY2027-28 from stated records and for **every later year** from Income Tax Rates Act 1986 Sch 7
 * Pt I's own *“the 2027-28 year of income or a later year of income”* table, so the question
 * “can tax be computed for this year” has exactly one owner and it is that module. This function
 * is that owner's answer, restated nowhere.
 *
 * **The window is still closed BELOW.** A year before FY2026-27 is refused, because Sch 7's
 * earlier tables name their years expressly and there is no standing table running backwards. In
 * such a month the walk emits no tax line at all — absent, never a zero, exactly as chunk 2 treats
 * an Age Pension month outside its own window, and for the same reason: a computed zero and an
 * uncomputed liability are different facts.
 *
 * **A covered year is not the same as a STATED year.** Past FY2027-28 the answer is projected from
 * standing law, and `taxYear(fy).standingLawFrom` is what says so. This function deliberately does
 * not conflate the two — reporting that distinction in the output is its own piece of work.
 *
 * The salary line is emitted either way. Salary is a fact about the Household that this model
 * holds; the tax on it is a fact about a year the register may not reach.
 */
export const taxParametersCover = (fy: FinancialYear): boolean => taxYearAvailable(fy);

/**
 * **The assembly O72 has been waiting for: assessable income, less a deduction set, is a taxable
 * income.** ITAA 1997 s 4-15(1).
 *
 * Assessable income is the annualised salary, and it is the whole of it — this chunk models no
 * other income, which is stated at `project()`'s doc with its direction.
 *
 * The deduction set is s 25-130's, and it is the SUM OF TWO LIMBS, for exactly the reason
 * `netLabourIncomeFromSalary` gives at length: the caller's own work deductions are themselves
 * deductible quite apart from being s 25-130(2) reducers, and subtracting only the standard
 * deduction would over-state taxable income by the whole reducer sum for a caller who answered the
 * Setting truthfully. The sum telescopes to `max(reducers, min($1,000, salary))`.
 *
 * **The $1,000 is NOT written here.** `standardDeductionAmountFor` holds it, keyed to its own first
 * income year, and register O72 names that reuse as the requirement: a second `toCents(1_000)` at
 * this call site is T14 drift — it agrees with the record today and diverges the year s 25-130(2)
 * is amended, moving no fixture in between.
 *
 * **The year gate is `standardDeductionAmountFor`'s, not a second one.** Before FY2026-27 it
 * returns nil because the provision does not exist, so taxable income is the salary itself; from
 * FY2026-27 the deduction bites. That is one year EARLIER than WATO's FY2027-28, and the two limbs
 * of s 25-130 therefore switch on in different years — which is why a single-year fixture cannot
 * see this at all.
 *
 * Floored at nil: ITAA 1997 s 4-15(1) gives no negative taxable income, and `taxableIncome()`
 * refuses one. It is unreachable while `REDUCER_DEDUCTIONS` is nil (the deduction is capped at the
 * salary by limb (b) of the `min`) and it is written anyway, because the floor is what makes the
 * statement true rather than the current value of a constant.
 */
export const taxableIncomeFromSalary = (
  fy: FinancialYear,
  salary: Cents,
  reducerDeductions: Cents,
): TaxableIncome => {
  const deductions = reducerDeductions + standardDeductionAmountFor(fy, salary, reducerDeductions);
  return taxableIncome(Math.max(0, salary - deductions) as Cents);
};

/**
 * **ITAA 1997 s 102-5(1): the net capital gain is included in assessable income — P3-21f chunk 5.**
 *
 * The second assessable amount this model holds, and it arrives the way `project()`'s doc said the
 * others would: through taxable income, and nowhere else. From here the four T9 bases follow on
 * their own — the brackets and LITO read `TaxableIncome` directly, the Medicare levy reads it as the
 * single and as the family figure, and SAPTO reads the Rebate Income built out of it.
 *
 * **It is ADDED AFTER the deduction set rather than inside the salary limb, and that is the
 * difference between this and a second `taxableIncomeFromSalary` call.** s 25-130's standard
 * deduction is a WORK-expense provision measured against work income; folding a capital gain into
 * the figure the deduction is computed on would hand a retired Person up to $1,000 of work deduction
 * against a share sale, understating the gain and the tax. The gain therefore enters the sum and not
 * the deduction base.
 *
 * **It does NOT reach net labour income, and that is enforced by ABSENCE rather than by a
 * subtraction.** `netLabourIncomeFromSalary` takes a salary and this function is not on its path:
 * a capital gain is not a labour amount under ITAA 1997 s 61-155(2) — `NetLabourIncome`'s own doc
 * names net capital gains among the things it excludes — so a gain in WATO's base would be a wrong
 * offset in law, not merely a wrong dollar.
 */
export const taxableIncomeWithNetCapitalGain = (
  salaryIncome: TaxableIncome,
  gain: Cents,
): TaxableIncome => {
  if (!Number.isSafeInteger(gain) || gain < 0) {
    throw new RangeError(
      `a net capital gain is nil or positive and a whole number of cents, and ${gain} is not: s 102-5 has no negative result — where the losses exceed the gains the net capital gain is nil (see \`netCapitalGain\`)`,
    );
  }
  return taxableIncome((salaryIncome + gain) as Cents);
};

/**
 * **ITAA 1997 s 293-20(1)(a) on the walk's own limbs — the Division 293 income base, and NOTHING
 * ELSE (P6-9 chunk 1).** No charge is computed HERE — this function builds the base and stops, so
 * that the wiring that charges it was reviewed against a base that already had a test and a
 * hand-derived figure. ⚠️ **Chunk 1's further claim — that `division293Tax` is called from nowhere
 * and no `Division 293 tax` line exists — was true until 2026-09-20 and is now FALSE.** P6-9
 * chunk 3 charges it, out of this very base, through `div293IncomesOn` below.
 *
 * **The income is the SAME `TaxableIncome` the rest of the assessment reads, and the reportable
 * superannuation contributions are the SAME figure Rebate Income adds back** — both are passed in
 * by `asSaptoPerson` from the two it has already built. A second derivation of either would be the
 * drift T9 exists to stop, and for limb (c) it would be worse than drift: that limb decides what is
 * stripped OUT of this base, and a figure built here from the salary rather than from the one the
 * Person's `reportableSuperannuationContributions` returned could disagree with the one the charge
 * will later add back on the other side of the same sum.
 *
 * **Limb (c) is passed at its REAL value, not nil.** `div293Income` performs the s 293-20(1)(a)
 * disregard itself — it hands `sumSurchargeComponents` a nil for that one argument — so the caller's
 * job is to state the Person's true reportable superannuation contributions and let the one
 * disregard happen in the one place. Passing nil here would produce the right number today by a
 * wrong route, and would silently become the right number by NO route the day this same components
 * object is also read for the Medicare levy surcharge.
 *
 * **The other four limbs are nil, and each nil is a structural absence of this model rather than a
 * convenience — the same rationale, in the same vocabulary, as the three nils `rebateIncome` is
 * given in `asSaptoPerson`.** They are written out rather than defaulted for the reason
 * `SurchargeIncomeComponents` gives: a nil is a figure the caller states, never one they get by
 * leaving the field out.
 */
export const div293IncomeForWalk = (
  income: TaxableIncome,
  reportable: ReportableSuperannuationContributions,
): Div293Income =>
  div293Income({
    // Paragraph (a). The Person's own taxable income, sacrifice-REDUCED and with any net capital
    // gain in it, exactly as the brackets, LITO and the Medicare levy read it.
    taxableIncome: income,
    // Paragraph (a)'s first disregard. Nothing in this walk releases an FHSS amount: there is no
    // entry type for a First Home Super Saver release and no line that pays one.
    assessableFhssReleasedAmount: toCents(0),
    // Paragraph (a)'s second disregard. No entry states a family trust distribution, so there is no
    // ITAA 1936 Sch 2F s 271-105(1) reduction in this model to be added back.
    familyTrustDistributionTaxReduction: toCents(0),
    // Paragraph (b). A reportable fringe benefits total is a fact about the Person's employment that
    // no entry states and no salary forecast can produce — it is grossed up by the employer against
    // a 31 March FBT year behind a $2,000 entry test. Nil here understates the base, which is the
    // direction a known gap is allowed to be wrong in.
    reportableFringeBenefitsTotal: toCents(0),
    // Paragraph (c) — the limb `div293Income` itself disregards. Stated truthfully all the same,
    // for the reason above.
    reportableSuperannuationContributions: reportable,
    // Paragraph (d). Both s 995-1 silos need something this model does not have: no limb of this
    // walk produces a geared financial investment and none produces a rental property, so both the
    // deductions and the income of each silo are nil and the sum of the two "amount (if any)"
    // excesses is nil. Built through `totalNetInvestmentLoss` rather than branded by hand, so the
    // day a silo exists it cannot be netted against the other.
    totalNetInvestmentLoss: totalNetInvestmentLoss({
      financialInvestmentDeductions: toCents(0),
      financialInvestmentIncome: toCents(0),
      rentalPropertyDeductions: toCents(0),
      rentalPropertyIncome: toCents(0),
    }),
    // The subtractive fifth amount — s 301-20(3), the 0%-taxed slice of a lump sum taken between
    // preservation age and 60. Nil, and **consistent rather than convenient**: `superLumpSum.ts`
    // REFUSES BY NAME (`LumpSumBelowTaxFreeAgeError`) every withdrawal below the tax-free age, so no
    // lump sum this model pays is ever in the s 301-20(2) offset's range, and the one it does pay is
    // taxed at nil at 60+ and never enters taxable income at all. Subtracting an amount here that
    // paragraph (a) never added would take the base BELOW the Person's own income.
    lowRateCapLumpSumComponent: toCents(0),
  });

/**
 * **THE FOUR s 291-25 LIMBS AS THIS WALK HOLDS THEM — ONE OBJECT LITERAL, TWO CALLERS, AND FROM
 * P6-9 CHUNK 3 THERE ARE THREE (the cap refusal, the month's low tax contributions, and the year's
 * at the settlement).**
 *
 * It was an inline literal inside the month loop until the settlement needed the same four limbs
 * over the year's accumulated totals. A second literal there would have been a second statement of
 * which contributions this model holds — so the day a personal deductible contribution becomes
 * statable, one call site would have got it and the other would not. Two of the four limbs are
 * arguments because only the caller knows them; the other two are nil HERE, once, with the reason.
 */
const concessionalComponentsOf = (
  employerContributions: Cents,
  salarySacrificed: Cents,
): ConcessionalContributionComponents => ({
  employerContributions,
  salarySacrificed,
  // Nil, and NAMED nil: this model holds no field for a personal deductible contribution and none
  // for an employer contribution beyond the Guarantee. Both would RAISE the total, so their absence
  // is why a silent return from the cap check is still not a finding of compliance — and why the
  // Division 293 charge built from the same limbs is a LOWER bound on the Person's real one.
  personalDeductible: personalDeductibleContributions(toCents(0), { noticeOfIntentAcknowledged: false }),
  otherConcessional: toCents(0),
});

// --- Chunk 4: the Income Waterfall, the spending target, and the balances ------------------------

/**
 * **A twelfth of an annual spending figure, and the rounding decision `SpendChangeParams` asks for
 * by name.** Its doc: *"whoever first divides this owes a decision on the remainder — twelfths of an
 * annual cent figure do not divide evenly, and the rounding belongs in one place with a test, not at
 * each call site."* This is that one place, and this is the decision.
 *
 * **The decision: round UP, every month, to the whole cent.** `Math.ceil`, not half-away-from-zero.
 *
 * **Why not the `mulCents` rounding `monthlyFromAnnual` uses.** Deliberately a different rule from
 * the twelfth of an Age Pension or a tax liability, and the difference is the direction. Those two
 * are INFLOWS and a half-cent either way is a payment convention. This is an OUTFLOW and it is the
 * figure the whole Shortfall Age (P4-5) is measured against, so the residual is pointed AT the
 * household rather than away from it: a plan that runs out one month early is a warning, and a plan
 * that runs out one month late is the fluent, plausible, wrong answer this project is organised
 * against.
 *
 * **What twelve of them sum to, stated rather than wished away.** Exactly the annual figure when 12
 * divides it, and otherwise between 1 and 11 cents MORE — never less. `$60,000.01` a year is
 * `$5,000.01` a month, and twelve of those are `$60,000.12`. An exact-summing alternative exists
 * (give the remainder to one nominated month) and is rejected: the walk begins at `asAtDate`, which
 * is mid-year for every real plan, and a `SPEND_CHANGE` may arrive in any month, so **there is no
 * "the twelve months" for a remainder to be given to**. A rule that needs a year boundary the walk
 * does not have would be a rule that silently picked one.
 *
 * So the invariant this file can honestly state is not equality but a bound, and it is tested as
 * one: `0 ≤ 12 × monthlySpendFromAnnual(a) − a ≤ 11`.
 *
 * Refuses a negative: spending is not a receipt, and a negative annual figure reaching here is a
 * data error that would otherwise become an inflow through the Waterfall's `max(0, …)`.
 */
export const monthlySpendFromAnnual = (annualSpend: Cents): Cents => {
  if (!Number.isSafeInteger(annualSpend) || annualSpend < 0) {
    throw new RangeError(`not a spending level in whole cents: ${annualSpend}`);
  }
  return Math.ceil(annualSpend / 12) as Cents;
};

/**
 * **The Income Waterfall's limbs, in the order they are drawn — and this is the ONE place the order
 * is written down.** `drawWaterfall` iterates this array and nothing else, so the order cannot be
 * stated in one place and applied in another.
 *
 *   salary
 *   → Account-Based Pension, up to what is still owed of this year's minimum
 *   → cash that is NOT offsetting the home loan
 *   → Non-Super Portfolio
 *   → Account-Based Pension, above this year's minimum
 *   → cash that IS offsetting the home loan (the Offset Account proper)
 *   → released accumulation super
 *
 * **Why, in plain words (the user's ruling of 2026-09-23: "spend cash first").** Each dollar is
 * spent in order of what it costs to spend:
 *
 *   * **The pension's minimum comes first because it has to be paid anyway.** Schedule 7 makes the
 *     year's minimum a payment the fund MUST make by 30 June. Money that is leaving the pension
 *     whether or not it is needed is the cheapest money there is, so it is spent before anything
 *     else is touched. What is still owed is paid in June regardless (`minimumStillDueThisMonth`),
 *     exactly as before.
 *   * **Then cash that is not offsetting a loan.** It earns only the cash rate (`max(0, cash − loan
 *     owing)`, the same split the interest on running cash is paid on), while the portfolio and the
 *     pension earn the investment return. Until 2026-09-23 this cash was drawn LAST, so each June's
 *     unspent minimum piled up in cash earning CPI while investments earning more were sold to pay
 *     the bills.
 *   * **Then the portfolio, then the rest of the pension.** The minimum is a FLOOR and not a cap
 *     (ruled 2026-09-17): the pension account can be drawn in full. What is above the minimum is
 *     drawn after the portfolio — money in a pension account grows untaxed, so it is the dearer of
 *     the two to spend.
 *   * **Then cash that IS offsetting the loan, and this is the old reason the Offset was last, kept
 *     for exactly the dollars it applies to** (concept.md §5.12): while a loan is owing, a dollar in
 *     the offset cancels the mortgage rate on a dollar of loan — risk-free and untaxed — which makes
 *     it the most expensive dollar the Household holds. With no loan, no cash is offsetting one, and
 *     it is all spent early, as cash not offsetting the loan.
 *
 * **One pension account, two limbs, one balance.** `accountBasedPensionMinimum` and
 * `accountBasedPensionAboveMinimum` read the same claims and split each account's balance at what is
 * still owed of its minimum; together they offer the whole account, as the one limb did before.
 *
 * **Cash on hand, two limbs, one balance.** `cashAboveLoan` and `offsetAccount` split the Waterfall's
 * running cash at what is owed on the home loan this month; together they offer the whole of it.
 *
 * ⚠️ **"Limb 2", "limb 3", "limb 4" and "limb 5" elsewhere in this file, in the tests, TODO.md and the
 * register are NAMES and not positions** — the Account-Based Pension, the Non-Super Portfolio, the
 * Offset Account and released superannuation, as they were numbered before 2026-09-23. The two limbs
 * added that day are called by name only.
 *
 * **concept.md §4's own wording is "salary → Account-Based Pension to its minimum → Non-Super
 * Portfolio → Offset Account"**, and it is left as the source document has it so that the quotation
 * stays a quotation; this array supersedes it.
 *
 * ---
 *
 * **RELEASED SUPERANNUATION IS LAST. THE ORDER IS A USER RULING OF 2026-09-19 AND THIS IS WHERE THE
 * REASONING LIVES, because concept.md §5.12 expressly declines to arbitrate it.**
 *
 * The limb exists to stop the engine reporting a household as SHORT while it holds money it can
 * lawfully reach (`accessibleWealth`'s residual 2, and `superLumpSum.ts`'s opening paragraph). That
 * is a **last-resort job**, and the position matches the job:
 *
 *   * placed last, it fires only when every limb above it is exhausted — which is exactly the case
 *     being fixed, and nothing else;
 *   * every forecast that was already sensible is untouched. Drawing super BEFORE the Offset would
 *     change drawdown behaviour for households that were never in trouble, which is a far larger
 *     behavioural change than the defect warrants.
 *
 * ⚠️ **The competing reading is acknowledged and NOT adopted.** §5.12 ranks dollars by what they
 * cost to spend, and on that axis released accumulation super (15% on earnings) is CHEAPER than the
 * Offset (the mortgage rate, risk-free and untaxed) — which would put this limb before it. §5.12's
 * own warning is why that reading is not taken as settled: *"the asymmetry has a date on it, and the
 * answer flips when it passes"*. Under Age Pension age, super is exempt from BOTH means tests, so
 * spending it first is the expensive choice; from Age Pension age it is assessed either way and the
 * tax reading wins. The correct position therefore flips at each owner's Age Pension age and
 * differs per Person, and **one slot in a static array cannot express that**. A per-person,
 * date-dependent position is a future refinement — recorded here, deliberately not built — and
 * until it exists the static, disclosed, conservative position is last.
 */
export const WATERFALL_LIMBS = [
  'salary',
  'accountBasedPensionMinimum',
  'cashAboveLoan',
  'nonSuperPortfolio',
  'accountBasedPensionAboveMinimum',
  'offsetAccount',
  'releasedSuperannuation',
] as const;

export type WaterfallLimb = (typeof WATERFALL_LIMBS)[number];

/**
 * What one limb can supply this month, and **why that is the figure**.
 *
 * `note` is not decoration. Two of the four limbs supply nil in every projection this engine can
 * currently run, and a limb that is absent because it happens to be empty today is a limb the next
 * author will not know to fill. The note is where the limb says which of the two it is — *"this
 * Household has no Account-Based Pension"* is a different fact from *"this limb is not built"*, and
 * a nil with no note cannot tell them apart.
 */
export interface WaterfallSource {
  /** The most this limb can supply toward this month's target. Never negative. */
  readonly available: Cents;
  /** Why `available` is that figure — above all, why it is nil. */
  readonly note: string;
}

export type WaterfallSources = { readonly [L in WaterfallLimb]: WaterfallSource };

/**
 * **The limb names are spelled TWICE, and this object ties the two spellings together in BOTH
 * directions — P4-4's polish.** `plan.ts`'s `WaterfallLimbNote` has to name the limbs as a
 * type, and it cannot import them from here: `projection.ts` imports `plan.ts`, and the arrow does
 * not run the other way. So the names exist in two files and something has to make a rename in
 * either one a compile error rather than a silently empty note.
 *
 * The key set is mapped over the NOTE's union, so a limb added to `WATERFALL_LIMBS` alone leaves
 * this object unindexable at the emission site below (TS7053); the value type is
 * `Extract<WaterfallLimb, L>`, which is `never` for a name the Waterfall does not have, so a name
 * added to the NOTE's union alone has no value that can be written for it (TS2322). A plain
 * `Record<…, WaterfallLimb>` would catch only the first: `bogus: 'salary'` would satisfy it.
 */
const WATERFALL_LIMB_NOTE_NAMES: { readonly [L in WaterfallLimbNote['limb']]: Extract<WaterfallLimb, L> } =
  Object.freeze({
    salary: 'salary',
    accountBasedPensionMinimum: 'accountBasedPensionMinimum',
    cashAboveLoan: 'cashAboveLoan',
    nonSuperPortfolio: 'nonSuperPortfolio',
    accountBasedPensionAboveMinimum: 'accountBasedPensionAboveMinimum',
    offsetAccount: 'offsetAccount',
    releasedSuperannuation: 'releasedSuperannuation',
  });

/** What one limb actually supplied, carrying its own `available` and `note` so a draw is auditable alone. */
export interface WaterfallDraw {
  readonly limb: WaterfallLimb;
  readonly available: Cents;
  readonly drawn: Cents;
  readonly note: string;
}

export interface WaterfallResult {
  /** What the month had to fund: the spending level plus this month's one-off expenses. */
  readonly target: Cents;
  /** One entry per limb, in `WATERFALL_LIMBS` order, including the limbs that drew nothing. */
  readonly draws: readonly WaterfallDraw[];
  /** The sum of `drawn`. Equal to `target` unless the Household ran out. */
  readonly funded: Cents;
  /**
   * `target − funded`: what the Waterfall could not meet. **Nil is the ordinary case and a positive
   * figure is the Shortfall condition** that P4-5's Shortfall Age is the first month of. P4-5 is not
   * this chunk; the condition it reads is.
   */
  readonly shortfall: Cents;
}

/**
 * **Draw `target` from the limbs, in order, taking from each only what the ones before it could
 * not meet.** This is the Income Waterfall, and it is the only place the order is applied.
 *
 * **Every limb appears in the result, including the ones that drew nothing**, which is the seam this
 * chunk is mostly built to leave. A projection that reported three limbs because the fourth was
 * empty would make an unfunded limb and an absent limb look identical, and the next author would
 * have to rediscover that the fourth exists.
 *
 * **An empty limb is not a special case and never short-circuits.** ADR-0009's consequence in its own
 * words: *"A Household holding no investments outside super must project identically to one modelled
 * before this decision: no waterfall step that fires on zero."* Drawing nil from nil is the same
 * arithmetic as drawing nil from a million, so there is no branch here to get wrong.
 *
 * **What this function deliberately does NOT know.** Where the money lives, what drawing it costs, or
 * what it does to a means test. A draw on the Non-Super Portfolio is a CGT disposal (ADR-0009,
 * concept.md §5.12, TODO P3-20c/P3-21) and a draw on an Account-Based Pension moves a super balance;
 * neither consequence is computable in this chunk, and neither is silently applied here. The caller
 * states `available` and owns what a draw against it means.
 */
export const drawWaterfall = (target: Cents, sources: WaterfallSources): WaterfallResult => {
  if (!Number.isSafeInteger(target) || target < 0) {
    throw new RangeError(`not a spending target in whole cents: ${target}`);
  }
  let outstanding: number = target;
  const draws: WaterfallDraw[] = [];
  for (const limb of WATERFALL_LIMBS) {
    const source = sources[limb];
    if (!Number.isSafeInteger(source.available) || source.available < 0) {
      throw new RangeError(`the ${limb} limb offered ${source.available}, which is not a whole number of available cents`);
    }
    const drawn = Math.min(source.available, outstanding);
    outstanding -= drawn;
    draws.push(Object.freeze({ limb, available: source.available, drawn: drawn as Cents, note: source.note }));
  }
  return Object.freeze({
    target,
    draws: Object.freeze(draws),
    funded: (target - outstanding) as Cents,
    shortfall: outstanding as Cents,
  });
};

/**
 * **The Waterfall's own record of the month, turned into `Month.notes` — P4-4's polish, and it is
 * where `available`, `drawn` and `note` STOP being discarded.**
 *
 * `drawWaterfall` has computed all three for all four limbs since P4-1 chunk 4, and until now
 * `project()` read `drawn` off two of the draws and threw the rest away — so *"which kind of nothing
 * limb 2 supplied this month"*, the fact `unfundedMiddleLimbs` exists to state and has three
 * different answers for, existed for the length of one tick and died in the loop.
 *
 * **One note per limb, every month, including the limbs that drew nothing.** That is
 * `drawWaterfall`'s own doctrine taken unchanged: a projection reporting three limbs because the
 * fourth was empty would make an unfunded limb and an absent limb look identical. The array is
 * `result.draws` mapped one-for-one, so it is in `WATERFALL_LIMBS` order and it is complete by
 * construction rather than by a loop somebody has to keep in step.
 *
 * These are NOT lines. A note carries no money into the reconciliation and no zero-amount
 * `MonthLine` is manufactured to hold one — see `MonthNote` in `plan.ts` for why that is a rule
 * rather than a preference.
 */
export const waterfallLimbNotes = (result: WaterfallResult): readonly WaterfallLimbNote[] =>
  Object.freeze(
    result.draws.map((draw) =>
      Object.freeze({
        subject: 'waterfall limb' as const,
        limb: WATERFALL_LIMB_NOTE_NAMES[draw.limb],
        available: draw.available,
        drawn: draw.drawn,
        note: draw.note,
      }),
    ),
  );

/**
 * **What a month says when NOBODY HAS LEGISLATED IT — P4-4's polish, and it is the disease
 * `unfundedMiddleLimbs` was written to cure, in the two places it had survived.**
 *
 * Outside either parameter window the walk emits no line, which is correct (`MonthLine.amount` is
 * always positive, and a computed zero is a different fact from an uncomputed one) and which left
 * *"nil"* and *"nobody has determined this"* indistinguishable to a reader holding the `Month`.
 * These are the notes that tell them apart, and each one states **which way the absence runs**,
 * because an absence that flatters the Household and an absence that penalises it are not the same
 * finding and a reader cannot recover the difference from a missing line.
 *
 * Constant text, in a frozen record rather than built at the call site, for `unfundedMiddleLimbs`'s
 * own reason: a note whose only expression is a literal inside a loop cannot be tested, and the
 * whole point of saying which kind of nothing this is, is that somebody can read it back.
 */
export const PARAMETER_WINDOW_NOTES: { readonly [R in ParameterWindowNote['register']]: ParameterWindowNote } =
  Object.freeze({
    'Age Pension': Object.freeze({
      subject: 'parameter window' as const,
      register: 'Age Pension' as const,
      // ⚠️ **ITS REACH NARROWED ON 2026-09-21 AND THE SENTENCE FOLLOWED IT (P4-1e).** It used to
      // fire above the published window as well, and said so: *"the published rate parameters do
      // not reach it, and no indexation series was supplied that carries them forward"*. The
      // standing table carries them forward now, so the only months left are the ones BELOW the
      // window — before the first determination this register holds — and above it a figure is
      // computed and carries a `StandingParametersNote` instead. The direction is unchanged, which
      // is why the rest of the sentence is.
      note: 'no Age Pension was computed for this month and NOTHING WAS ASSESSED AT NIL: this month falls BELOW the first determination the register holds, and the indexation mechanism runs forward from a published set and not backwards, so the entitlement is UNDETERMINED rather than nil — the direction is that this Household has its income UNDER-stated, and so runs out of money earlier in this walk than it would in law',
    }),
    'income tax': Object.freeze({
      subject: 'parameter window' as const,
      register: 'income tax' as const,
      note: 'no income tax was assessed for this financial year and NOTHING WAS COMPUTED AT NIL: the rate scale does not reach the year, whose window is closed BELOW at FY2026-27, so the liability is UNDETERMINED rather than nil — the direction is the FLATTERING one, since this Household keeps tax it would owe in law and so its money lasts longer in this walk than it should',
    }),
  });

/**
 * **What a month says when its figure came from a table carried forward — P4-1e, 2026-09-21.**
 *
 * The opposite half of `PARAMETER_WINDOW_NOTES` and built for the same reason: a figure computed on
 * parameters published eighteen years earlier and a figure computed on this month's own parameters
 * are **identical to the cent**, so nothing in the numbers can tell a reader which they are holding.
 * The note is the only place the distance exists.
 *
 * **The sentence is `STANDING_PARAMETERS_DIRECTION`, imported and not rewritten.** That constant is
 * the argument the user's ruling was taken on — the two limbs, and the direction they both run in —
 * and it lives beside the table it licenses. A second sentence here saying the same thing in other
 * words is the drift this repo keeps finding in pairs; the only thing added is the date, which is
 * this month's own fact and not the argument's.
 *
 * Memoised per `standingFrom`, so a walk of six hundred carried months holds one object: the value
 * depends on nothing else, and object identity is what the provenance consolidation compares.
 */
const STANDING_NOTES = new Map<IsoDate, StandingParametersNote>();

export const standingParametersNote = (standingFrom: IsoDate): StandingParametersNote => {
  const held = STANDING_NOTES.get(standingFrom);
  if (held !== undefined) return held;
  const note: StandingParametersNote = Object.freeze({
    subject: 'standing parameters' as const,
    register: 'Age Pension' as const,
    standingFrom,
    note: `THE AGE PENSION IN THIS MONTH WAS COMPUTED FROM THE PARAMETERS IN FORCE ON ${standingFrom}, carried forward unchanged. ${STANDING_PARAMETERS_DIRECTION}`,
  });
  STANDING_NOTES.set(standingFrom, note);
  return note;
};

/**
 * **The sentence every Superannuation Guarantee note carries, and it is the whole of chunk 1's
 * honesty (P6-8 brief 3).** The figure beside it has been computed and has been paid to nobody, and
 * a reader who took it for money that had arrived would be reading the Household as richer than
 * this walk says it is. It is a constant rather than a literal in a loop for
 * `PARAMETER_WINDOW_NOTES`'s reason: the point of saying which kind of nothing this is, is that a
 * test can read it back.
 */
export const SUPER_GUARANTEE_CREDITED =
  'THE EMPLOYER SUPERANNUATION GUARANTEE IS PAID INTO SUPERANNUATION BY THIS BUILD (P6-8 brief 3, ' +
  'chunk 2b), net of the fund\'s 15% contributions tax, into the interest the plan names or derives. ' +
  'IT COUNTS TOWARDS THE GENERAL CONCESSIONAL CAP (brief 3, final chunk): where a salary sacrifice ' +
  'is stated, the cap is measured against the sacrifice and this figure together, and an ' +
  'arrangement over it is refused by name. On its own it cannot breach the cap, because SGAA ' +
  's 10A(5)\'s maximum contributions base is derived from that cap. AND FROM 2026-09-20 (P6-9 ' +
  'chunk 3) DIVISION 293\'S FURTHER 15% IS CHARGED ON IT: where the Person\'s Division 293 income ' +
  'and their low tax contributions together exceed $250,000, the second 15% is taken on the LESSER ' +
  'of those contributions and the excess, on its own monthly line and out of the Person\'s own ' +
  'cash. AND FROM 2026-09-20 (P6-10) THE ITAA 1997 SUBDIV 293-B ELECTION TO HAVE THAT CHARGE ' +
  'RELEASED FROM THE FUND INSTEAD IS PERFORMED, for a Person whose plan names the interest a release ' +
  'authority is served on: their year of monthly cash accruals is refunded in the following July and ' +
  'the year\'s assessed liability comes out of that interest instead. THE ELECTION IS STATED ON THE ' +
  'HOUSEHOLD FORM (P6-11, 2026-09-20): choose the account it comes out of beside the person who pays ' +
  'the charge, or leave it at "no election" and the charge is paid from cash, which is what the law ' +
  'does if you do nothing. It could be stated only by hand-editing the plan file until that day. What ' +
  'is still NOT done with it, and it is the LAST thing about this feature that runs in the ' +
  'Household\'s favour: a first or last PARTIAL financial year never reaches a settlement, because the ' +
  'settlement needs all twelve of the year\'s months, so an electing Person\'s accrual in such a year ' +
  'stands as the cash default they did not choose. In that year alone this walk holds more ' +
  'superannuation and less cash than a Person who makes the election (register O84, residual (i)).';

/**
 * **What a month's Superannuation Guarantee arriving in a fund is called (P6-8 brief 3, chunk 2b).**
 * The amount on the line is what LANDS — the month's twelfth of the year's charge, less the fund's
 * 15% — on `SALARY_SACRIFICE_LINE`'s convention and for its reasons: the gross and the tax are in
 * the line's `determination`, and the fund pays the tax out of money the Household never holds.
 */
export const SUPER_GUARANTEE_LINE = 'Superannuation Guarantee into superannuation';

/**
 * The one sentence that turns a derived ceiling into a labelled one. Empty where the year's index
 * number is a published level (FY2026-27) — there is nothing to disclose — and empty where there is
 * no index number at all, because that branch refuses in its own words rather than quoting a figure.
 */
const forecastCeilingSentence = (indexNumbers: IndexNumbers): string =>
  indexNumbers.some((each) => each.confidence !== 'primary-verified')
    ? ' That ceiling is NOT a published figure for this year: it follows the concessional contributions cap, which is indexed to average weekly earnings, and nobody has published the wage level for this year — so it was grown from the last published level at the wage growth rate stated in this plan. It is a forecast, and it is yours.'
    : '';

/**
 * **One Person's Superannuation Guarantee for the year, off the module that owns it.**
 *
 * The earnings are built by the caller because only the caller knows the two limbs; what is decided
 * here is the year's charge, the ceiling, and what to do when the ceiling cannot be derived.
 *
 * ⚠️ **TWO REFUSALS ARE CAUGHT AND THEY ARE THE TWO THAT SAY "NOT THIS YEAR".**
 * `MissingIndexNumberError` — the ceiling is derived from the concessional cap, which indexes on
 * AWOTE, so a year with no index number refuses rather than reusing another year's ceiling (T13).
 * ~~so from FY2027-28 the year refuses~~ — **struck 2026-09-21 (P6-12): the walk now supplies a
 * forward series out of the plan's own wage growth rate, so no year it can reach is without one and
 * this branch is unreachable from `project()`.** It is kept because `superGuarantee` is a public
 * function and a caller who supplies no series still reaches it, and because a year BEFORE the last
 * published December quarter would still have none — such a year fails earlier, on the refusal
 * below. And `SuperGuaranteeEarningsBaseError` — qualifying earnings replaced ordinary time earnings on
 * 1 July 2026 and this register holds neither the old definition nor a pre-2026 charge percentage,
 * so a walk that opens in FY2025-26 has months with no computable Guarantee at all. Both become
 * the note's `null` and the module's OWN sentence, verbatim: nothing is credited, so no figure
 * hangs on either, and turning a refusal into a nil is the one thing that would be dishonest.
 *
 * Every other refusal propagates. `EarningsBaseChangedError`, `DuplicateEmployerError` and a
 * negative limb are statements that this build's SHAPE is wrong, not that a year is out of reach,
 * and a walk that swallowed them would be reporting a Guarantee it had no basis to report.
 */
const superGuaranteeYear = (
  fy: FinancialYear,
  person: string,
  earnings: QualifyingEarnings,
  indexNumbers: IndexNumbers,
): {
  readonly chargePercentage: number | null;
  readonly annualAmount: Cents | null;
  readonly annualAmountCredited: Cents | null;
  readonly provenance: ComputedProvenance | null;
  readonly sentence: string;
} => {
  let floorOnly;
  try {
    // **THE FLOOR FIRST, AND THE CEILING ONLY IF THE EARNINGS REACH IT.** This call consumes no
    // AWOTE index number and cannot raise `MissingIndexNumberError`; `SuperGuaranteeEarningsBaseError`
    // is the one refusal left on it and it is a statement about the YEAR, caught below.
    floorOnly = superGuaranteeBelowTheFloor(fy, earnings);
  } catch (error) {
    if (!(error instanceof SuperGuaranteeEarningsBaseError)) throw error;
    return {
      chargePercentage: null,
      annualAmount: null,
      annualAmountCredited: null,
      provenance: null,
      sentence: `For FY${fy} the Guarantee is NOT COMPUTED AT ALL, which is not a Guarantee of nil and not a Guarantee of nothing — it is this build declining to state one, in its own words: ${error.message}`,
    };
  }
  const base = `${floorOnly.chargePercentage}% of ${earnings} cents of SGAA s 10A(1) qualifying earnings — which INCLUDE any amount sacrificed, added back (T17), so sacrificing does not reduce it`;
  if (floorOnly.earningsAboveTheFloor <= 0) {
    return {
      chargePercentage: floorOnly.chargePercentage,
      annualAmount: floorOnly.amount,
      annualAmountCredited: floorOnly.amount,
      provenance: floorOnly.provenance,
      sentence: `${floorOnly.amount} cents a year, being ${base}. The earnings are at or below ${floorOnly.earningsCharged === earnings ? 'the lowest value SGAA s 10A(5)\'s maximum contributions base can take in any year' : 'that floor'}, so no ceiling and no index number is needed to state this figure. Caveats on it: ${floorOnly.provenance.caveats.join(' ')}`,
    };
  }
  try {
    // One employment, and the employer is named for the ceiling's sake rather than reported as a
    // fact about the world — see the walk's own note on why one is the conservative reading.
    const charge = superGuarantee(fy, [{ employer: `${person}'s employer`, qualifyingEarnings: earnings }], indexNumbers);
    return {
      chargePercentage: charge.chargePercentage,
      annualAmount: charge.amount,
      annualAmountCredited: charge.amount,
      provenance: charge.provenance,
      // **THE CEILING IS LABELLED WHERE IT IS A FORECAST (P6-12).** SGAA s 10A(5)'s maximum
      // contributions base is derived from the year's concessional cap, so from FY2027-28 it moves
      // with the wage growth rate this plan states and is the Household's own figure rather than a
      // published one. Said in the note's own words as well as in the caveats, because a reader who
      // sees a ceiling quoted to the cent should not have to infer that nobody has published it.
      sentence: `${charge.amount} cents a year, being ${base}, capped at this year's maximum contributions base of ${charge.maximumContributionsBase.amount} cents (SGAA s 10A(5), annual and per employer — T18).${forecastCeilingSentence(indexNumbers)} Caveats on the figure: ${charge.provenance.caveats.join(' ')}`,
    };
  } catch (error) {
    if (!(error instanceof MissingIndexNumberError)) throw error;
    return {
      chargePercentage: floorOnly.chargePercentage,
      annualAmount: null,
      annualAmountCredited: floorOnly.amount,
      provenance: floorOnly.provenance,
      sentence:
        `${floorOnly.amount} cents a year is PAID and is provably owed — it is ${base}, taken on the first ${floorOnly.earningsCharged} cents, which is the lowest value SGAA s 10A(5)'s maximum contributions base can take in any year. ` +
        `The charge on the remaining ${floorOnly.earningsAboveTheFloor} cents is REFUSED rather than guessed, because FY${fy}'s own ceiling cannot be derived: ${error.message} ` +
        'So the Guarantee credited here is a LOWER bound on the one owed, never an upper one. ' +
        `Caveats on what was paid: ${floorOnly.provenance.caveats.join(' ')}`,
    };
  }
};

/**
 * **WHICH INTEREST THE GUARANTEE IS PAID INTO — derived where the plan determines it, refused where
 * it does not, and never guessed (P6-8 brief 3, chunk 2b; register O82).**
 *
 * Three cases resolve and two refuse, and the refusals are in the WALK rather than at the door on
 * `checkContributionTargets`' precedent inverted: the door has to keep loading plan files written
 * before the field existed, whose authors were never put the question. This is the point at which
 * the question can no longer be deferred, because money is about to move.
 *
 *   * Exactly one accumulation interest and no nomination — the ordinary case, and every plan file
 *     written before 2026-09-20 — resolves to that interest with nothing stated and nothing guessed.
 *   * A nomination is taken at its word, including where it is redundant.
 *   * **Two or more accumulation interests and no nomination is REFUSED.** "The larger one" and
 *     "the first one" are both available and both are guesses; the alternative to refusing is this
 *     build choosing which fund a Person's employer pays into.
 *   * **No accumulation interest at all, with a salary, is REFUSED.** The Guarantee must land in a
 *     named account and there is none. This build will not invent an interest, and crediting a
 *     retirement-phase interest is what `checkContributionTargets` refuses at the door.
 *
 * Two further refusals mirror the door for the direct-`project()` caller, who never passed through
 * `parsePlan`: two interests both claiming the destination, and a claim on a non-accumulation
 * interest.
 */
const superGuaranteeDestination = (
  person: Person,
  // Accounts a TTR_START names: a TTR is paid from them, so the Guarantee never lands there, and one
  // other accumulation account is then the destination by derivation (retire flow S4). Back at work
  // after retiring, the accounts that became a pension at retirement are closed the same way (S3).
  ttrStarted: readonly (IsoDate | undefined)[] = [],
): { readonly slot: number; readonly interest: SuperInterest } => {
  const indexed = person.superInterests.map((interest, slot) => ({ interest, slot })).filter(({ slot }) => ttrStarted[slot] === undefined);
  const nominated = indexed.filter(
    ({ interest }) => interest.statedEmployerContributionDestination === 'superannuationGuarantee',
  );
  const howToFix =
    'state `statedEmployerContributionDestination: "superannuationGuarantee"` on exactly one ' +
    'accumulation interest in that Person\'s `superInterests`';
  if (nominated.length > 1) {
    throw new RangeError(
      `${person.name} states the employer contribution destination on ${nominated.length} superannuation interests — positions ${nominated.map(({ slot }) => slot).join(', ')}. A Person has one fund their employer pays into, or none; two are two answers to a question with one answer. ${howToFix}`,
    );
  }
  const claimed = nominated[0];
  if (claimed !== undefined) {
    if (claimed.interest.phase !== 'accumulation') {
      throw new RangeError(
        `${person.name} states the employer contribution destination on superannuation interest ${claimed.slot}, which is in the ${claimed.interest.phase} phase. A retirement-phase interest is closed to contributions and this build has no path that opens the accumulation interest a real fund would open instead. ${howToFix}`,
      );
    }
    return claimed;
  }
  const accumulation = indexed.filter(({ interest }) => interest.phase === 'accumulation');
  const only = accumulation[0];
  if (accumulation.length === 1 && only !== undefined) return only;
  if (accumulation.length === 0) {
    throw new RangeError(
      `${person.name} is paid a salary and holds no accumulation superannuation interest, so the employer Superannuation Guarantee this build computes for them has nowhere to be paid. It is refused rather than dropped: crediting nothing would understate this Household by 12% of a salary every month with nothing on screen to say so, and inventing an account would be this build stating a fact about the world that the plan does not. Give ${person.name} the accumulation interest their employer pays into — a balance of nil is a statement, and is enough`,
    );
  }
  throw new RangeError(
    `${person.name} holds ${accumulation.length} accumulation superannuation interests and has nominated none of them as the employer Superannuation Guarantee's destination, so which account it is paid into is UNDETERMINED (register O82). "The larger one" and "the first one" are both guesses, and the balance a guess produces is one a real fund would not. To resolve it, ${howToFix}`,
  );
};

/**
 * One month's Guarantee, resolved: whose it is, which interest it goes into, and what the fund
 * charged on it. Carried from the note builder to the two places the money is reported and written,
 * so that all three read one `ContributionsTax`.
 */
interface SuperGuaranteeCredit {
  readonly personIndex: number;
  readonly person: Person;
  readonly slot: number;
  readonly interest: SuperInterest;
  readonly tax: ContributionsTax;
  /** The Guarantee's own record — SGAA's charge percentage, the earnings base, register O19. */
  readonly provenance: ComputedProvenance;
}

/**
 * **One Person's Superannuation Guarantee for the month: the year's charge, the destination, the
 * fund's 15%, and the note that reports all three.**
 *
 * One expression, two readers. The `SuperGuaranteeNote` this returns and the `MonthLine` the walk
 * pushes are both read off the SAME `ContributionsTax`, so the note's `creditedToSuperannuation`
 * and the line's amount cannot disagree, and neither can disagree with the amount written back to
 * the balance.
 *
 * ⚠️ **TWO REFUSALS ARE CAUGHT AND THEY ARE THE TWO THAT SAY "NOT THIS YEAR".** They are caught in
 * `superGuaranteeYear`, they are caught NARROWLY, and neither of them stops the walk:
 * `SuperGuaranteeEarningsBaseError` (a year before FY2026-27 has no qualifying earnings base at all
 * — nothing is computed and nothing is credited) and `MissingIndexNumberError` (the year's ceiling
 * cannot be derived — the floor-safe part of the charge is credited and the part above it is
 * reported as refused). Every other refusal propagates, including both destination refusals: they
 * are statements that this build cannot say where a Person's money goes, and a walk that swallowed
 * one would be reporting a Household whose employer contributions had vanished.
 */
const superGuaranteeThisMonth = (
  fy: FinancialYear,
  person: Person,
  personIndex: number,
  earnings: QualifyingEarnings,
  salarySacrificedAmounts: Cents,
  indexNumbers: IndexNumbers,
  ttrStarted: readonly (IsoDate | undefined)[],
): { readonly note: SuperGuaranteeNote; readonly credit: SuperGuaranteeCredit | undefined } => {
  const year = superGuaranteeYear(fy, person.name, earnings, indexNumbers);
  const shared = {
    subject: 'superannuation guarantee' as const,
    person: person.name,
    qualifyingEarnings: earnings as Cents,
    salarySacrificedAmounts,
    chargePercentage: year.chargePercentage,
    annualAmount: year.annualAmount,
    annualAmountCredited: year.annualAmountCredited,
  };
  const monthly = year.annualAmountCredited === null ? toCents(0) : monthlyFromAnnual(year.annualAmountCredited);
  if (monthly <= 0) {
    return {
      note: Object.freeze({
        ...shared,
        interestIndex: null,
        creditedToSuperannuation: toCents(0),
        note: `${SUPER_GUARANTEE_CREDITED} ${year.sentence} Nothing is credited this month: there is no amount to credit.`,
      }),
      credit: undefined,
    };
  }
  const { slot, interest } = superGuaranteeDestination(person, ttrStarted);
  // **THE 15% IS CHARGED HERE, ON THE EMPLOYER LIMB, AND THE GROSS IS NEVER CREDITED.** An SG
  // contribution is an assessable contribution of the fund (ITAA 1997 s 295-160) and s 26(1)(a)'s
  // 15% falls on it exactly as it falls on a sacrifice. Crediting the gross would overstate this
  // Household's superannuation by 15% of every employer contribution for the length of the walk,
  // which is the flattering direction and the one this build refuses.
  //
  // **This is the `employerContributions` limb the walk has hard-coded at nil since chunk 4 of
  // brief 2, now stated.** It is a SEPARATE `ConcessionalContributions` from the sacrifice's, and
  // separate on purpose: the 15% is a flat rate on assessable contributions, so the charge on these
  // dollars is the same whether it is computed on its own or inside a larger total, and each of the
  // two lines then reports the tax on ITS OWN money. What a combined total changes is the CAP — and
  // THAT total is built once, further down the tick, out of this same year's figure and the month's
  // sacrifice, and measured against the year's general cap there.
  const tax = contributionsTax(
    fy,
    concessionalContributions({
      employerContributions: monthly,
      salarySacrificed: toCents(0),
      personalDeductible: personalDeductibleContributions(toCents(0), { noticeOfIntentAcknowledged: false }),
      otherConcessional: toCents(0),
    }),
  );
  return {
    note: Object.freeze({
      ...shared,
      interestIndex: slot,
      creditedToSuperannuation: tax.netOfTax,
      note: `${SUPER_GUARANTEE_CREDITED} ${year.sentence} This month ${monthly} cents of it was paid into interest ${slot} (${superPoolName(interest.phase)}), less ${tax.amount} cents of contributions tax at ${tax.rate}.`,
    }),
    credit: Object.freeze({ personIndex, person, slot, interest, tax, provenance: year.provenance as ComputedProvenance }),
  };
};

/**
 * **Which interests limb 2 is about, in one predicate.** `phase` is the field the means test itself
 * turns on, so it is the field this reads: an `accumulation` interest is not an Account-Based
 * Pension however large it is, and a `ttr` interest is NOT one either — a TRIS has its own maximum
 * as well as a minimum (reg 6.01(2)(b)(ii), P3-8) and `minimumDrawdown.ts`'s header says in terms
 * that nothing in it may be reused for that. Drawing a TRIS here would apply half of a two-sided
 * rule.
 *
 * **Takes a `phase`, not a `SuperInterest` (P3-8's conversion limb, wired 2026-09-22).** A TTR that
 * has converted is an Account-Based Pension from its conversion day, and `effectivePhaseFor` is
 * what knows the day; this predicate stays a pure question about a phase VALUE so a call site can
 * hand it either the stated phase (where no conversion day is in play) or the resolved one.
 */
const isAccountBasedPension = (phase: SuperInterest['phase']): boolean => phase === 'accountBasedPension';

/**
 * **The stream's commencement day, READ and never guessed.** `StatedStreamSettings.commencementDay`
 * is required *within* that object and the object itself is optional, which is exactly the third
 * state `household.ts` built it to carry: absent means *nobody was asked*, not 1 July.
 */
const statedCommencementDay = (interest: SuperInterest): IsoDate | undefined =>
  interest.statedStreamSettings?.commencementDay;

/**
 * **The two middle limbs of the Waterfall when they draw NOTHING — and the three different kinds of
 * nothing limb 2 now has.**
 *
 * It is a function rather than two literals inside the walk for one reason: a limb whose only
 * expression is a nil inside a loop cannot be tested, and the whole point of building an empty limb
 * is that the next author finds it. Here the `note` a funded Household would get is reachable from a
 * test, so *"this Household has none"* and *"this limb is not built"* are assertable facts and not
 * one silent zero.
 *
 * **LIMB 2 IS NO LONGER UNFUNDED, and this function is now only the nil half of it (P4-1 chunk 5b).**
 * `project()` draws the SIS Reg Sch 7 minimum through `accountBasedPensionMinimumLimb`, which falls
 * back to the note below whenever the figure it can offer this month is nil. Three branches, and
 * each of them is a different fact with a different fix:
 *
 *   1. **no Account-Based Pension in this Household** — read off `phase`, which is the field the
 *      means test itself turns on, and not off `superInterests` being non-empty;
 *   2. **one is held and NO commencement day is stated for it.** Sch 7 keys the balance day, the age
 *      and the cl 3 pro-rate off the commencement day, `StatedStreamSettings.commencementDay` is
 *      where a user states it, and this model **refuses to guess one**. A guessed day changes a
 *      legislated figure — 1 August against 1 July is $36,940 against $40,360 on $1,009,078 — so the
 *      limb stays nil and says which input is missing. The direction is the one chunk 4 recorded:
 *      such a Household has its income UNDER-stated by the whole minimum, so its Shortfall Age is
 *      too early rather than too late;
 *   3. **one is held WITH a stated commencement day and nothing is available from it this month** —
 *      it has not commenced yet, or cl 4 made its commencement year nil, or the account is EMPTY.
 *      **"the year's minimum is already drawn" left this list on 2026-09-17**: the minimum is a
 *      floor, so a pension that has paid it in full still offers its balance. **"the walk never
 *      opened the day Sch 7 reads the balance on" left it on 2026-09-21 (P10-5)**: that was the
 *      opening part financial year of every walk not beginning on 1 July, it had no clause behind
 *      it in the Schedule, and such a year is now determined in the walk's first month on a
 *      declared stand-in balance.
 *
 * **LIMB 3 IS NO LONGER UNFUNDED EITHER, and this function is now only the nil half of it (P3-21f
 * chunk 6).** The refusal that stood here for the whole of this build — *"a Non-Super Portfolio is
 * held, and drawing it is a CGT disposal on a per-parcel cost base this model does not hold"* — is
 * **discharged on its own stated ground**, and every clause of it went: chunk 1 gave the pool a cost
 * base per parcel, chunk 3 gave `NON_SUPER_INVESTMENT` params an entry can state, chunk 4 made the
 * disposal and the s 115-25 discount, chunk 5 put the gain through s 102-5 into taxable income, and
 * chunk 6 makes `nonSuperPortfolioLimb` offer the whole market value and `project()` sell against it.
 * Drawing it without its tax was the flattering half ADR-0009 exists to forbid; the tax is now a
 * line in the month of the disposal, so there is nothing left of the refusal to keep.
 *
 * **What a nil DOES still mean, which is one thing and no longer two:** this Household holds no
 * parcels. That is ADR-0009's expected state and it is a fact about the Household, not about the
 * model — a Household with an empty portfolio projects exactly as one modelled before limb 3 existed,
 * and a test pins that to the byte.
 *
 * ⚠️ **THE TRIPWIRE IS REPLACED RATHER THAN DELETED.** The funded branch below is no longer a
 * refusal, because there is nothing to refuse; it is now an assertion that it should be UNREACHABLE.
 * `nonSuperPortfolioLimb` falls back to this text only where its claims summed to nil, and the claims
 * are one per Person holding anything — so a funded Household arriving here means the claims and the
 * note were built from two different Households, which is exactly the bug a deleted branch would
 * have hidden.
 */
export const unfundedMiddleLimbs = (
  household: Household,
): Pick<WaterfallSources, 'accountBasedPensionMinimum' | 'nonSuperPortfolio'> =>
  Object.freeze({
    accountBasedPensionMinimum: Object.freeze({
      available: toCents(0),
      note: !household.persons.some((person) => person.superInterests.some((interest) => isAccountBasedPension(interest.phase)))
        ? 'no Account-Based Pension in this Household'
        : household.persons.some((person) =>
              person.superInterests.some(
                (interest) => isAccountBasedPension(interest.phase) && statedCommencementDay(interest) !== undefined,
              ),
            )
          ? 'an Account-Based Pension with a stated commencement day is held and nothing is available from it this month: it has not commenced yet, or cl 4 made its commencement year nil, or the account is EMPTY — a spent annual minimum is not one of these, because the minimum is a floor and not a cap on what may be drawn, and "the walk never opened the day Sch 7 reads the balance on" is not one either since P10-5: a walk opening after its own 1 July determines that year anyway, on a stated stand-in balance'
          : 'an Account-Based Pension is held and no commencement day is stated for it: SIS Reg Sch 7 keys the balance day, the age and the cl 3 pro-rate off that day, and this model will not guess one — state `statedStreamSettings.commencementDay` (P4-1 chunk 5b)',
    }),
    nonSuperPortfolio: Object.freeze({
      available: toCents(0),
      note: household.persons.some((person) => financialAssets(person) > 0)
        ? 'a Non-Super Portfolio IS held, so this note is a BUG and not a fact: limb 3 draws from P3-21f chunk 6, and `nonSuperPortfolioLimb` reaches this text only where its claims summed to nil — so the claims and the note were built from two different Households'
        : 'no Non-Super Portfolio in this Household: limb 3 is built and it draws, so a nil here is a Household holding no parcels and never a disposal this model cannot compute',
    }),
  });

/**
 * **The line a month carries when the Waterfall could not meet the target.**
 *
 * It is an `inflow`, and that reads wrong until the reconciliation is written out, so it is written
 * out here. `closingBalance = openingBalance + Σinflow − Σoutflow` is the assertion `Month` exists to
 * support, and the spending lines are emitted at what the Household NEEDED, not at what it could
 * afford — a plan that quietly reduced the grocery bill to what was in the account would answer
 * *"does the money last?"* with *"yes, always"*. So the gap needs a name on the other side of the
 * equation. This is that name, and it means **money the plan requires and does not have**, never
 * money received.
 *
 * The consequence is deliberate: with this line present, `closingBalance` **never goes negative**.
 * The model has no borrowing facility — no overdraft, no redraw, and no way for the walk to raise
 * money it was not told about — and a negative balance would be an unstated loan at an unstated
 * rate. ⚠️ **`MORTGAGE_REFINANCE` is specified from P3-16 slice 2 and is NOT a counter-example**:
 * it states a loan the USER chose, on a date they chose, at figures they typed, and it pays no cash
 * into the household — the balance it sets is a debt to be repaid and never a deposit. There is
 * still no facility the WALK can reach for. The debt shows up as a
 * named line in the month it arises instead, where P4-5 can read it and a user can see it.
 */
export const SHORTFALL_LINE = 'Unfunded shortfall';

/**
 * **THE SPENDING TARGET's own line** — a twelfth of the standing `SpendChangeParams.annualSpend`
 * RAISED TO THE MONTH'S OWN PRICE LEVEL (register O85, 2026-09-21: the stated figure is REAL),
 * emitted in every month a level is in force. Named rather than left as a literal because
 * `app/incomeHeadline.ts` reads it to state what the Household planned to spend in the month its own
 * money ran out, and a reader of that sentence must be able to find the line it came from.
 *
 * ⚠️ **IT IS NOT TOTAL OUTGOINGS.** The home loan repayment is ADDITIONAL to it (user ruling,
 * 2026-09-21 — see the target's three parts below), as are `ONE_OFF_EXPENSE`s and every tax line.
 */
export const HOUSEHOLD_SPENDING_LINE = 'Household spending';

/**
 * **P14-13, slice 3a — the aged care line descriptions, one per fee/payment kind.** Each is its own
 * line rather than one merged figure for `HOUSEHOLD_SPENDING_LINE`'s own reason: a reader auditing
 * $340 a day wants to see the basic fee, hotelling, the non-clinical care contribution and the daily
 * accommodation payment as four separate facts, not one number with nothing behind it. `AGED_CARE_RAD_PAYMENT_LINE`
 * is the one-off lump sum; the other four recur every month a resident is in care.
 *
 * ⚠️ **Plain English, no bare acronym (2026-09-24, slice 3b): "RAD" never stands alone.** Every line
 * that names the Refundable Accommodation Deposit says "accommodation deposit (RAD)" — the words
 * beside the letters — on the same ruling `entryForm.ts`'s boxes carry.
 */
export const AGED_CARE_LINE_PREFIX = 'Aged care — ';
export const AGED_CARE_RAD_PAYMENT_LINE = `${AGED_CARE_LINE_PREFIX}accommodation deposit (RAD) paid as a lump sum`;
export const AGED_CARE_BASIC_FEE_LINE = `${AGED_CARE_LINE_PREFIX}basic daily fee`;
export const AGED_CARE_HOTELLING_LINE = `${AGED_CARE_LINE_PREFIX}hotelling contribution`;
export const AGED_CARE_NCCC_LINE = `${AGED_CARE_LINE_PREFIX}non-clinical care contribution`;
export const AGED_CARE_DAP_LINE = `${AGED_CARE_LINE_PREFIX}daily accommodation payment`;
/**
 * **P14-16 — the two lines the RAD's own lifecycle needed and slice 3a never wrote.** Retention is
 * `effect: 'wealth'`, not `'cash'`: it is the facility withholding part of a REFUND years away, not
 * a payment the household makes today (health.gov.au, "RAD and RAC retention" — "calculated daily
 * at a rate of 2% per annum... limited to 5 years"). The refund is `effect: 'cash'`, in the month of
 * the resident's DEATH: a departure from care is not modelled, so this is the only route a RAD ever
 * leaves the ledger it was credited to.
 */
export const AGED_CARE_RAD_RETENTION_LINE = `${AGED_CARE_LINE_PREFIX}accommodation deposit (RAD) retention`;
export const AGED_CARE_RAD_REFUND_LINE = `${AGED_CARE_LINE_PREFIX}accommodation deposit (RAD) refunded`;

/**
 * **P14-18b's RAD refusal, NAMED (P16-3) so a caller can tell it apart from every other refusal a
 * walk can throw.** `sustainableSpend`'s search needs to treat this ONE ground as a candidate
 * FAILING — exactly as it treats an ordinary shortfall or a Contingency Floor breach — rather than
 * as a reason to abandon the whole search, because it is not a sign of a broken walk: a household
 * that has spent more for thirty years genuinely has less left to fund a RAD with, and that is a
 * fact about the candidate, not a defect. `Division293ReleaseInsufficientBalanceError`'s own
 * precedent for a class that carries `name` and nothing else in its body — the message is still
 * built entirely at the throw site, which is where the entry id and the figures are in scope — plus
 * `month`, which is the one fact a caller needs back and cannot safely re-parse out of the message.
 */
export class RadPaymentUnfundedError extends RangeError {
  override readonly name = 'RadPaymentUnfundedError';
  constructor(
    message: string,
    readonly month: IsoMonth,
  ) {
    super(message);
  }
}

/**
 * **P14-19 — a `BUY_HOME` the whole Waterfall cannot pay for in full, `RadPaymentUnfundedError`'s
 * own shape and reason:** refused rather than left as a shortfall, and read by `sustainableSpend()`
 * as a failing candidate, not a broken walk.
 */
export class HomePurchaseUnfundedError extends RangeError {
  override readonly name = 'HomePurchaseUnfundedError';
  constructor(
    message: string,
    readonly month: IsoMonth,
  ) {
    super(message);
  }
}

/** P9-5 — a `DOWNSIZER_CONTRIBUTION` the whole Waterfall cannot fund in full; `HomePurchaseUnfundedError`'s shape and reason. */
export class DownsizerContributionUnfundedError extends RangeError {
  override readonly name = 'DownsizerContributionUnfundedError';
  constructor(
    message: string,
    readonly month: IsoMonth,
  ) {
    super(message);
  }
}

/**
 * **P9-1, slice 1 — the Home Equity Access Scheme's two line descriptions.** `HEAS_DRAW_LINE` is
 * the fortnightly cash the household actually receives; `HEAS_INTEREST_LINE` is the same
 * `effect: 'wealth'` idiom `AGED_CARE_RAD_RETENTION_LINE` uses — the debt growing with no cash
 * changing hands, so the movement still shows in `wealthNet` rather than vanishing into
 * `Month.heasDebt` with no line behind it.
 *
 * **`HEAS_ADVANCE_LINE` (P9-2b) is its own description, not folded into `HEAS_DRAW_LINE`** — the
 * two are means-test DIFFERENT (T34: the fortnightly stream is not income, an advance is deemed
 * from day one), so keeping them separate in `Month.lines` is what lets a reader — or a later
 * means-test wiring — tell them apart without re-deriving which cents were which from the entry's
 * own `advances` list.
 */
export const HEAS_DRAW_LINE = 'Home Equity Access Scheme — loan payment';
export const HEAS_ADVANCE_LINE = 'Home Equity Access Scheme — lump-sum advance';
export const HEAS_INTEREST_LINE = 'Home Equity Access Scheme — interest';

/**
 * **P14-13 — `SELL_HOME`'s four line descriptions, `AGED_CARE_LINE_PREFIX`'s own reason: a reader
 * auditing a sale wants the gross proceeds, the selling costs, the mortgage repaid and any Home
 * Equity Access Scheme debt repaid as four separate facts, not one net figure with nothing behind
 * it.** Only the proceeds line is unconditional; the other three are omitted where nil (no selling
 * costs stated, no mortgage, no HEAS debt) — `MORTGAGE_INTEREST_LINE`'s own "emit only what moved".
 */
export const HOME_SALE_LINE_PREFIX = 'Home sale — ';
export const HOME_SALE_PROCEEDS_LINE = `${HOME_SALE_LINE_PREFIX}proceeds`;
export const HOME_SALE_SELLING_COSTS_LINE = `${HOME_SALE_LINE_PREFIX}selling costs`;
export const HOME_SALE_MORTGAGE_REPAID_LINE = `${HOME_SALE_LINE_PREFIX}mortgage repaid`;
export const HOME_SALE_HEAS_REPAID_LINE = `${HOME_SALE_LINE_PREFIX}Home Equity Access Scheme debt repaid`;

/** P14-19 — `BUY_HOME`'s two lines, in its own month only; the costs line is omitted where nil. */
export const HOME_PURCHASE_LINE_PREFIX = 'Home purchase — ';
export const HOME_PURCHASE_PRICE_LINE = `${HOME_PURCHASE_LINE_PREFIX}price`;
export const HOME_PURCHASE_COSTS_LINE = `${HOME_PURCHASE_LINE_PREFIX}stamp duty and costs`;

/**
 * **P14-13 — `RENT_OUT_HOME`'s five line descriptions, `HOME_SALE_LINE_PREFIX`'s own reason: a
 * reader auditing a rental wants the gross rent and each of the four costs apart, not one net figure
 * with nothing behind it.** Only the rent line is unconditional; the four cost lines are omitted
 * where nil — `HOME_SALE_SELLING_COSTS_LINE`'s own "emit only what moved" — and, unlike the sale's
 * lines, ALL FIVE recur every month the entry is active, not once in the entry's own month.
 */
export const RENT_OUT_HOME_LINE_PREFIX = 'Rental income — ';
export const RENT_OUT_HOME_RENT_LINE = `${RENT_OUT_HOME_LINE_PREFIX}rent`;
export const RENT_OUT_HOME_RATES_LINE = `${RENT_OUT_HOME_LINE_PREFIX}council rates`;
export const RENT_OUT_HOME_INSURANCE_LINE = `${RENT_OUT_HOME_LINE_PREFIX}insurance`;
export const RENT_OUT_HOME_AGENT_FEES_LINE = `${RENT_OUT_HOME_LINE_PREFIX}agent’s fees`;
export const RENT_OUT_HOME_REPAIRS_LINE = `${RENT_OUT_HOME_LINE_PREFIX}repairs`;

/**
 * **What the Age Pension is called in a month's `lines`.** Exported because `outcomes.ts`'s
 * Pension-Only Age is defined in terms of this description — *"the Household lives on Age Pension
 * alone"* is read off the lines — and a marker that matched a string spelled independently of the
 * walk's own would silently answer `'never'` the day the wording changed.
 */
export const AGE_PENSION_LINE = 'Age Pension';

/** P12-1 — the lump sum paid to the survivor of a couple who were both on the Age Pension. */
export const AGE_PENSION_BEREAVEMENT_LINE = 'Age Pension bereavement payment';

/**
 * **Interest the running cash earns, one line per owner — `Interest on cash, <name>` (2026-09-23).**
 * Paid on `max(0, cash − loan owing)` at `Settings.cashInterestRate` (absent: `economicSeries.cpi`),
 * a twelfth a month, rounded down, and split by `Household.offsetShares`. A cash inflow, so it lands
 * in the Offset and the ledger contract holds; assessable income for its owner; never Age Pension
 * income, because the cash it comes from is already deemed.
 */
export const CASH_INTEREST_LINE = 'Interest on cash';

/** One owner's `CASH_INTEREST_LINE` description — the one expression the walk writes and `outcomes.ts` reads. */
export const cashInterestDescription = (person: Person): string => `${CASH_INTEREST_LINE}, ${person.name}`;

/**
 * **What a `NON_SUPER_INVESTMENT` buy is called in a month's `lines`** — one outflow per entry, at
 * the amount the month could actually fund, named for the Person whose portfolio it lands in.
 *
 * It is an `outflow`, and that is the whole of P3-21f chunk 3's trap: a parcel created without the
 * cash moving would make the Household RICHER for having bought an ETF, and the figure would read
 * perfectly — more assessable assets, more growth, a larger portfolio and an unchanged bank balance.
 * The line and the parcel are ONE change, computed once from one figure, exactly as limb 2's
 * payment line and its balance write-back are.
 */
export const PORTFOLIO_PURCHASE_LINE = 'Non-Super Portfolio purchase';
export const portfolioPurchaseDescription = (name: string): string => `${PORTFOLIO_PURCHASE_LINE}, ${name}`;

/**
 * **What the incidental costs of acquisition are called in a month's `lines` — P4-4's polish, and
 * the purchase line is NET of it from this pass on.**
 *
 * ⚠️ **THE FIGURE THIS LINE MOVES IS THE PURCHASE LINE'S, and no cash moved.** Until now one
 * outflow carried the GROSS cost — `amount` plus the fee — and the parcel it created was worth the
 * amount alone, so the fee was the one movement in this walk with no line against it: wealth that
 * left the Household and bought nothing, visible only as a hole in a reconciliation. The two lines
 * together are the same cash to the cent (`funded`), so no closing balance, no assessable figure and
 * no Shortfall Age moves; what moves is that a user can now see the fee.
 *
 * **It is EXTERNAL and the purchase is INTERNAL, which is the whole point.** A purchase moves money
 * between two of the Household's own pools and total wealth does not change; the fee leaves the
 * Household altogether. Separating them is what retired the fourth term of the wealth identity in
 * `test/core-projection-growth-lines.test.mjs` — with the fee named, the identity closes on three
 * terms and every one of them is reconstructable from the `Month`.
 *
 * **No line where there was no fee.** `MonthLine.amount` is specified as always positive, and an
 * entry stating `toCents(0)` incidental costs paid nothing — a nil fee is a fact about the trade,
 * not a payment of nothing (the rule the Age Pension and the tax lines already take).
 */
export const PORTFOLIO_BROKERAGE_LINE = 'Non-Super Portfolio brokerage';
export const portfolioBrokerageDescription = (name: string): string => `${PORTFOLIO_BROKERAGE_LINE}, ${name}`;

/**
 * **Which `Person` a per-Person entry is about, refusing the two owners that name no single one.**
 *
 * `ownsPerson` answers *"does this entry reach person i"*, which is the right question for a
 * `RETIRE` or a `WORK_PATTERN_CHANGE`: a `household`-owned one reaches both, and two retirements is
 * a coherent reading of *"we retired"*. A BUY is not like that. A parcel belongs to a Person and to
 * exactly one (P3-21c — a realised gain is that Person's, and whose name it is in is decided years
 * before it matters and cannot be shifted after the fact), so `household` here would have to mean
 * *split this money between them*, and any split is a rule about whose gain it is, invented by the
 * entry loop, where nobody would ever look for it. `plan.ts` deliberately leaves `EntryOwner`
 * unconstrained by concept.md's owner column ("encoding it half-way would be a ruling made by
 * accident"), so the refusal belongs here, at the one type that cannot read a household owner.
 */
const soleOwnerIndex = (entry: Entry, household: Household): number => {
  if (entry.owner === 'household') {
    throw new RangeError(
      `entry ${entry.id} (${entry.type}) is owned by the household, but a non-super parcel belongs to a Person and to exactly one (P3-21c). State it against personA or personB`,
    );
  }
  const index = entry.owner === 'personA' ? 0 : 1;
  if (household.persons[index] === undefined) {
    throw new RangeError(
      `entry ${entry.id} (${entry.type}) is owned by ${entry.owner}, and this Household has ${household.persons.length} Person`,
    );
  }
  return index;
};

/** One `NON_SUPER_INVESTMENT` buy, resolved: whose it is, what it cost, and the parcel it creates. */
export interface PortfolioPurchase {
  /** The index into `Household.persons` whose portfolio this parcel joins. Never the Household. */
  readonly personIndex: number;
  /**
   * What the month could actually PAY — the outflow line's amount, and the parcel's whole COST BASE.
   * It is the **gross** figure: the units plus the incidental costs of acquisition. It is no longer
   * the parcel's market value, because brokerage is paid and buys no units (s 110-25).
   */
  readonly funded: Cents;
  /**
   * **The fee inside `funded`, carried rather than left to be subtracted — P4-4's polish.** It is
   * `funded − parcel.marketValue` and the caller could compute it; carrying it is what makes the
   * brokerage line and the units line ONE change from ONE figure, on `funded`'s own discipline.
   * It is the whole of the fee where the cash covered the trade and less than the stated fee
   * nowhere: the fee is paid FIRST out of what the cap leaves, so a capped buy pays it in full and
   * the units take the remainder.
   */
  readonly incidentalCostsOfAcquisition: Cents;
  readonly parcel: Parcel;
}

/**
 * **One `NON_SUPER_INVESTMENT` buy, against the cash that is actually there — P3-21f chunk 3.**
 *
 * Everything a buy decides is decided here, in one exported function, so that each of it is a fact
 * a test can assert directly rather than an accident of where a loop body happens to put a literal:
 * whose parcel it is, what day it was acquired on, what it cost, and how much of the stated amount
 * the month could fund.
 *
 * ⚠️ **THE TRAP, and it is why the funding is in this function rather than beside it: a parcel
 * created without the cash moving MANUFACTURES WEALTH FROM NOTHING.** The Household would end the
 * month richer for having bought an ETF — a bigger portfolio, more assessable assets, forty years of
 * extra compounding — with its bank balance untouched and every figure on screen perfectly
 * plausible. So `funded` is the ONE figure: the caller emits it as an outflow and writes the parcel
 * from the same number, and neither half can be written without the other.
 *
 * **`acquired` is the ENTRY's date and is never the walk's start, never `asAtDate` and never a
 * clock.** Chunk 4's 50% discount turns entirely on it — *more than* 12 months, so the day either
 * side of the anniversary is a different tax bill — and a day the model supplied would answer a tax
 * question nobody asked, in the flattering direction. It is also why the entry is passed whole
 * rather than as a date and an amount: there is no call site that could hand this function a
 * different day.
 *
 * ⚠️ **`costBase` and `marketValue` ARE NOT THE SAME FIGURE, and chunk 3 asserted that they were.**
 * That held only while there was no field for brokerage. Incidental costs of acquisition are part of
 * a CGT cost base (ITAA 1997 s 110-25, ruled 2026-09-17), and they are **paid** while buying **no
 * units**, so the three figures part at the moment of purchase:
 *
 *   * `funded` — the cash outflow and the line's amount — is the **GROSS** cost, `amount` plus
 *     `incidentalCostsOfAcquisition`;
 *   * `parcel.costBase` is that same gross figure, because every cent of it was paid to acquire;
 *   * `parcel.marketValue` is the **amount alone**. The parcel is under water by the brokerage from
 *     the moment it exists, which is correct, and is what a real disposal nets off.
 *
 * ⚠️ **The funding cap is therefore on the GROSS cost.** A Household holding $50,010 that states a
 * $50,000 buy with $30 of brokerage cannot pay $50,030, and capping on the net would have it buy a
 * parcel it cannot afford — the unstated loan two paragraphs down, to the cent. **The brokerage is
 * paid FIRST out of what the cap leaves**, and the units take the remainder ($49,980 here): a broker
 * charges the fee on the trade whether or not the trade was the size the user asked for, and the
 * alternative — scaling the fee down with the trade — would be a rule about a fee schedule this
 * model does not hold. Where the cash does not cover the brokerage there is no trade at all: cash
 * that is all fee and no units buys nothing, and no line says otherwise.
 *
 * **The PORTFOLIO the means test reads does not move.** `splitAssets` reads `marketValue`, which
 * brokerage does not raise, so the fee never becomes an asset. Since P4-3b the total does move by
 * the fee — the money left the Offset Account, and the Offset is assessed — but it moves DOWN and by
 * the fee exactly, never up to the cost base.
 *
 * `costBase` and `marketValue` part further at the next growth tick, because growth accrues to the
 * market value and never to what was paid (chunk 2).
 *
 * ⚠️ **WHAT HAPPENS WHEN THE CASH IS NOT THERE IS SETTLED BY PRECEDENT, not newly ruled.** The buy
 * is funded to `cashOnHand` and no further — `min(stated, cash)`, the very shape every Waterfall
 * limb already takes in `drawWaterfall` (`min(available, outstanding)`) — and where there is no cash
 * there is no purchase and the caller emits no line at all. Two precedents point the same way and
 * neither is this chunk's to re-open: ADR-0010's *"the Income Waterfall must not fund spending from
 * a refund before the refund exists"*, and `SHORTFALL_LINE`'s own ground that this model has no
 * borrowing facility, so money spent that the Household does not have would be an unstated loan at
 * an unstated rate. **A buy funded past the cash is exactly that loan, wearing a parcel.**
 *
 * **The direction was MIXED and HALF OF IT IS NOW DISCHARGED (P4-3b).** A buy the month cannot fund
 * is silently smaller than the user stated. What is not bought stays in the running cash — and the
 * running cash IS in `assessableAssets` now, at the balance each month opens with, so the means test
 * sees it and the old flattering residual is worth nothing. What remains is the other half, which
 * runs the safe way: an under-executed buy under-states the portfolio's compounding. Neither is
 * hidden: the line
 * carries the money that actually moved, so a buy that did not fully happen is visible in the
 * month's own breakdown rather than to be inferred from a total.
 *
 * **A DRAW is refused here as well as being a compile error.** `NonSuperInvestmentParams` admits
 * `direction: 'buy'` alone, so no TypeScript call site can state a disposal; a `.mjs` fixture and a
 * stored plan file never meet the compiler, and this is the guard for them. Chunk 4 is where a
 * disposal becomes expressible, and it arrives with the FIFO selection, the 50% discount and the CGT
 * — never as a negative buy.
 */
export const purchaseFromBuy = (
  entry: Extract<Entry, { type: 'NON_SUPER_INVESTMENT' }>,
  household: Household,
  cashOnHand: Cents,
): PortfolioPurchase | undefined => {
  const params = entry.params;
  if (params.direction !== 'buy') {
    throw new RangeError(
      `entry ${entry.id} (NON_SUPER_INVESTMENT) states direction ${JSON.stringify(params.direction)}: \`purchaseFromBuy\` is the BUY door, and a disposal goes through \`disposalFromSell\` — it realises CGT and is never a negative buy`,
    );
  }
  const stated = params.amount;
  if (!Number.isSafeInteger(stated) || stated < 0) {
    throw new RangeError(
      `entry ${entry.id} (NON_SUPER_INVESTMENT) buys ${stated}, which is not a whole number of cents`,
    );
  }
  const incidental = params.incidentalCostsOfAcquisition;
  if (!Number.isSafeInteger(incidental) || incidental < 0) {
    throw new RangeError(
      `entry ${entry.id} (NON_SUPER_INVESTMENT) states incidental costs of acquisition of ${incidental}, which is not a whole number of cents — state \`toCents(0)\` where there were none (ITAA 1997 s 110-25)`,
    );
  }
  const personIndex = soleOwnerIndex(entry, household);
  const funded = Math.min(stated + incidental, Math.max(0, cashOnHand)) as Cents;
  // The fee is paid out of the cash before any units are, so what is left buys the units. Both of
  // these are nil-or-worse where the cash could not even cover the fee, and then nothing was bought.
  const units = (funded - incidental) as Cents;
  if (units <= 0) return undefined; // nothing to pay with, so nothing was bought, and no line says one was.
  return Object.freeze({
    personIndex,
    funded,
    incidentalCostsOfAcquisition: incidental,
    parcel: Object.freeze({ acquired: entry.date, costBase: funded, marketValue: units }),
  });
};

/**
 * **The other half of the outflow line: the parcels each Person holds once this month's purchases
 * have landed**, in `Household.persons` order and taking the parcel from the very same
 * `PortfolioPurchase` the line's amount and the line's name came from.
 *
 * A purchase joins the portfolio of `personIndex` and of no other — P3-21c, and the reason this is a
 * function rather than two lines inside the walk is that *"the parcel went to the right Person"* is
 * then an assertable fact with a dollar figure against it, instead of an index expression buried in
 * a loop that nothing can see.
 *
 * It is applied AFTER the month's growth, so a parcel bought in month n earns its first return in
 * month n + 1. That is the convention every balance in this walk takes — a month reports what it
 * opened with — and it is what keeps a parcel at `costBase === marketValue` for the whole of the
 * month it was bought in.
 */
export const parcelsAfterPurchases = (
  parcelsPerPerson: readonly (readonly Parcel[])[],
  purchases: readonly PortfolioPurchase[],
): readonly (readonly Parcel[])[] => {
  const held = parcelsPerPerson.map((parcels) => [...parcels]);
  for (const purchase of purchases) {
    const person = held[purchase.personIndex];
    if (person === undefined) {
      throw new RangeError(`a purchase names person ${purchase.personIndex}, who holds no carried parcels`);
    }
    person.push(purchase.parcel);
  }
  return Object.freeze(held.map((parcels) => Object.freeze(parcels)));
};

// --- Chunk 4 (P3-21f): THE DISPOSAL, FIFO, AND THE 50% DISCOUNT ---------------------------------

/**
 * **What a `NON_SUPER_INVESTMENT` sell is called in a month's `lines`** — one INFLOW per entry, at
 * the proceeds the Person's parcels could actually supply, named for the Person they came out of.
 *
 * It is the mirror of `PORTFOLIO_PURCHASE_LINE` and it is one line for the same reason: the cash and
 * the parcels are ONE change computed from one figure, so a portfolio cannot shrink without the
 * money arriving, and money cannot arrive without the portfolio shrinking.
 */
export const PORTFOLIO_SALE_LINE = 'Non-Super Portfolio sale';
export const portfolioSaleDescription = (name: string): string => `${PORTFOLIO_SALE_LINE}, ${name}`;

/**
 * **The tax a disposal causes — P3-21f chunk 5, and a line of its OWN rather than a bigger
 * `Income tax` line.**
 *
 * The two are different facts and they are charged on different schedules. `Income tax, <name>` is a
 * twelfth of a year's assessment on a recurring salary and appears in all twelve months;
 * `Income tax on capital gain, <name>` is the WHOLE of the increment a realised net capital gain adds
 * to that year's assessment, and it appears once, in the month of the disposal that caused it. Merging
 * them would leave a user unable to see either — the salary line would jump for one month with nothing
 * to attribute it to, and the audit trail from `s 102-5` to the money would be gone.
 *
 * It begins with `Income tax` on purpose: it IS income tax, assessed through the same brackets, the
 * same LITO, the same SAPTO and the same Medicare levy as everything else the Person earns, and the
 * gain is not taxed on a schedule of its own.
 */
export const CAPITAL_GAINS_TAX_LINE = 'Income tax on capital gain';

/**
 * **The year-end settlement line — P4-2, and the financial year is REPORTED IN IT.**
 *
 * `Income tax year-end true-up, <name>, <financial year>`: what the walk charged that Person for that
 * financial year, less the tax the completed year's own assessment says was due. It appears at most
 * once per Person per financial year, in the JULY that follows the year it names.
 *
 * **The year is in the description because the line is the one place the boundary is reported.**
 * `Month` carries no financial year — a field would be a second spelling of
 * `financialYearContaining(firstDayOf(month))` — and this line is about a year that is NOT the
 * month's own. Without the year in it, a reader of a July month cannot tell which year was settled,
 * and that is the whole content of the audit trail from twelve accruals to one assessment.
 *
 * It begins with `Income tax` for the same reason `CAPITAL_GAINS_TAX_LINE` does: it IS income tax,
 * on the same brackets, the same LITO, the same SAPTO and the same Medicare levy. ⚠️ **It is the
 * only income-tax line in this module that can be an INFLOW**, so a consumer that sums income tax
 * by description prefix must read `direction`, which carries the whole sign — the rule
 * `MonthLine.amount` already states and `test/core-projection-tax.test.mjs` already enforces.
 */
export const TAX_TRUE_UP_LINE = 'Income tax year-end true-up';

/**
 * **The per-Person line descriptions the walk writes and a reader sums by (plan_ai.md §13
 * microtask 2).** Each is the one expression its push site uses, so a consumer comparing whole
 * descriptions — `test/core-div293-charge.test.mjs` forbids prefix matching under `src/` — reads
 * exactly what the walk wrote, and rewording a line cannot silently drop it from a total.
 */
export const SALARY_LINE = 'Salary';
export const salaryDescription = (name: string): string => `${SALARY_LINE}, ${name}`;
export const INCOME_TAX_LINE = 'Income tax';
export const incomeTaxDescription = (name: string): string => `${INCOME_TAX_LINE}, ${name}`;
export const capitalGainsTaxDescription = (name: string): string => `${CAPITAL_GAINS_TAX_LINE}, ${name}`;
export const taxTrueUpDescription = (name: string, fy: FinancialYear): string => `${TAX_TRUE_UP_LINE}, ${name}, ${fy}`;
export const ONE_OFF_EXPENSE_LINE = 'One-off expense';

/**
 * **THE SECOND 15% — P6-9 chunk 3, and it is NOT an income-tax line.**
 *
 * `Division 293 tax, <name>`: a twelfth of the year's ITAA 1997 s 293-20 charge on the Division 293
 * income and the low tax contributions in force this month, accrued in every month the Person is
 * over the threshold and trued up when the walk leaves the year — the same two-part shape, and the
 * same de-minimis, as `Income tax, <name>` and `TAX_TRUE_UP_LINE`, because the question *"what did
 * the walk charge for a year it could only see a month at a time"* is the same question.
 *
 * **It does NOT begin with `Income tax`, and that is the opposite decision to `CAPITAL_GAINS_TAX_LINE`
 * for the opposite reason.** A capital gain IS income, taxed through the same brackets, the same LITO
 * and the same Medicare levy. Division 293 tax is a DIFFERENT TAX: its own base (s 293-20(1)(a),
 * which is not taxable income), its own flat rate in its own Imposition Act, its own frozen $250,000
 * threshold, and no bracket, offset or levy in common with the rate scale. A consumer summing
 * `/^Income tax/` must not pick it up.
 *
 * ⚠️ **WHO PAYS IT, AND WHAT IS NOT MODELLED: it is charged to the INDIVIDUAL, out of the same cash
 * the salary arrives in — the statutory default, and a `cash` outflow exactly like income tax.**
 * ITAA 1997 Subdiv 293-B lets the Person elect to have the ATO release the amount from their
 * superannuation interest instead, which leaves them with MORE cash and LESS superannuation by the
 * same cents. ~~That election is **not modelled** (register O84)~~ — **SUPERSEDED 2026-09-20 BY
 * P6-10 M3.** The election is now performed, ONCE A YEAR, at the settlement: see
 * `DIVISION_293_RELEASE_REFUND_LINE` and `DIVISION_293_RELEASE_LINE`. **THIS MONTHLY LINE IS STILL
 * CASH FOR EVERYBODY** — it is a running estimate, and the amount a release authority can name is
 * the year's assessed liability — so for an electing Person it is refunded in full in the following
 * July and the fund pays instead. The note on every line says which of the two it is, rather than
 * leaving a reader to infer a treatment from a dollar figure.
 *
 * ⚠️ **Its direction is not neutral, and it is not conservative** (register O84, corrected by P6-9
 * chunk 4). Taking the charge from cash leaves a means-test-EXEMPT accumulation interest standing
 * and spends ASSESSED Offset cash instead, so a Household whose Division 293 payer is below Age
 * Pension age is assessed on FEWER assets than they would really hold and this build OVER-states
 * their Age Pension. The error is nil for a Person who does not make the election — which is the
 * statutory default and what this line models — and nil again at and above the payer's own Age
 * Pension age, where both pools are assessed alike.
 */
export const DIVISION_293_LINE = 'Division 293 tax';

/**
 * **The year-end settlement of the line above** — `Division 293 tax year-end true-up, <name>,
 * <financial year>`, on `TAX_TRUE_UP_LINE`'s conventions in every respect: the completed year is
 * assessed ONCE on the salary the Person actually received and the contributions actually made in
 * it, the difference against everything already accrued is settled in the following JULY, either
 * direction, and a gap under `TRUE_UP_DE_MINIMIS` is dropped.
 *
 * It exists as a separate settlement rather than as part of the income-tax one because it settles a
 * separate tax: merging the two would net a Division 293 under-accrual against an income-tax refund
 * and report a figure that is neither.
 */
export const DIVISION_293_TRUE_UP_LINE = 'Division 293 tax year-end true-up';

/**
 * **THE ELECTION, PERFORMED — P6-10 M3, and the first half of it is an UNDOING.**
 *
 * `Division 293 tax accrual refunded on release, <name>, <financial year>`: a `cash` INFLOW for
 * every cent of `DIVISION_293_LINE` this walk charged the Person during the year that has just
 * ended, written in the same July as the settlement below and only for a Person whose
 * `division293ReleaseDestination` reports an election.
 *
 * **Why the monthly accrual is taken in cash for EVERYBODY and reversed here, rather than being
 * routed at the time.** The accrual is a running estimate of an ANNUAL charge — a twelfth of a full
 * year assessed on the state in force this month — and the amount the Commissioner actually
 * assesses, and therefore the amount a release authority can name, is not known until the year is
 * assessed. Debiting a fund monthly would serve twelve release authorities for twelve amounts, none
 * of which is the liability; it would also make the month's super balance, and so the means test
 * read off it, depend on an estimate. So the walk accrues one way for everyone and settles once.
 *
 * ⚠️ **THE RESIDUAL THAT LEAVES, and it is named rather than fixed (register O84).** A FIRST or
 * LAST PARTIAL financial year never reaches the true-up at all — the settlement requires all twelve
 * of the year's months — so an electing Person's accrual in such a year is never refunded and never
 * released: it silently stands as the cash default, which is the treatment they did not choose. The
 * direction is the one `DIVISION_293_LINE` records for the unmodelled election: for a payer below
 * Age Pension age this build then holds LESS assessed cash and MORE exempt superannuation than the
 * election would leave them with, so their Age Pension is OVER-stated for those months. It is
 * bounded by one year's charge at each end of the walk, and it is the same shape of hole the
 * partial year already leaves in the income-tax settlement.
 */
export const DIVISION_293_RELEASE_REFUND_LINE = 'Division 293 tax accrual refunded on release';

/**
 * **THE ELECTION, PERFORMED — the money that actually leaves, and it leaves a FUND and not a
 * pocket.**
 *
 * `Division 293 tax released from superannuation, <name>, <financial year>`: an `effect: 'wealth'`
 * OUTFLOW for the year's settled ITAA 1997 s 293-20 liability, matched cent for cent by a debit to
 * the interest the Person nominated under Subdiv 293-B. It is `'wealth'` and never `'cash'` for the
 * same reason the two contribution credits are: the Household never holds this money. It goes from
 * the fund to the Commissioner, and a `'cash'` line would put a year's liability into the Offset
 * Account and let the Income Waterfall spend it on groceries — the released amount taken as cash
 * AND the fund debited, which is the same money twice.
 *
 * **It replaces the cash true-up rather than joining it.** An electing Person's year is settled by
 * this pair — the whole accrual back, the whole liability out of the fund — and no
 * `DIVISION_293_TRUE_UP_LINE` is written for them, because the gap that line reports is the
 * residual of a CASH settlement that did not happen.
 *
 * ⚠️ **THE TIMING RESIDUAL, named rather than fixed.** This debits the fund in the JULY the year is
 * settled in. A real release follows the Commissioner's Division 293 assessment notice and the
 * release authority given on the back of it, which is months later — so this build takes the money
 * out of the fund EARLIER than it really goes, and the fund is denied those months' compounding on
 * it. The error is bounded by one year's charge times a fraction of a year's return (at 6.5%
 * nominal and a six-month lag, under 3.3% of one year's Division 293 tax) and it runs in the
 * CONSERVATIVE direction: the Household's superannuation is under-stated, never over-stated, by the
 * anticipation.
 */
export const DIVISION_293_RELEASE_LINE = 'Division 293 tax released from superannuation';

/** The four Division 293 lines' whole descriptions, each the one expression its push site writes (plan_ai.md §13). */
export const division293Description = (name: string): string => `${DIVISION_293_LINE}, ${name}`;
export const division293TrueUpDescription = (name: string, fy: FinancialYear): string => `${DIVISION_293_TRUE_UP_LINE}, ${name}, ${fy}`;
export const division293ReleaseRefundDescription = (name: string, fy: FinancialYear): string => `${DIVISION_293_RELEASE_REFUND_LINE}, ${name}, ${fy}`;
export const division293ReleaseDescription = (name: string, fy: FinancialYear): string => `${DIVISION_293_RELEASE_LINE}, ${name}, ${fy}`;

/** The release lines' determinations that name the Person, each the one expression its push site writes (plan_ai.md §13). */
export const division293RefundedInFullDetermination = (name: string, fy: Fact): string =>
  `every cent of Division 293 tax this walk charged ${name} in cash during FY${fy}, refunded in full`;
export const division293AccrualUndoneDetermination = (name: string, slot: Fact): string =>
  `${name} elected under ITAA 1997 Subdiv 293-B to have the liability released from superannuation interest ${slot}, so the monthly cash accrual — which is taken in cash from every Person, because the amount a release authority can name is the YEAR's assessed liability — is undone here and the liability is paid by the fund on its own line`;
export const division293PaidByFundDetermination = (name: string, slot: Fact): string =>
  `PAID BY THE FUND: ${name} elected under ITAA 1997 Subdiv 293-B to have the amount released from superannuation interest ${slot}, so it is debited to that interest and never to the Household's cash (register O84). The release is modelled at this settlement; a real one follows the Commissioner's assessment notice months later, so this build anticipates it and denies the fund those months' compounding`;

/** The `source` of a franked amount stated from a Person's own share — the super side and the individual side (plan_ai.md §13). */
export const superIncomeFrankingSource = (name: string): string => `${name}'s own stated share of this interest's income already taxed at company level`;
export const portfolioPayoutFrankingSource = (name: string): string => `${name}'s own stated share of their Non-Super Portfolio's payout already taxed at company level`;

/**
 * **The de-minimis floor on a year-end true-up: one dollar, DECLARED rather than discovered.**
 *
 * A gap smaller than this is not settled and not carried forward. `monthlyFromAnnual` rounds each
 * twelfth to the cent, so twelve months of an UNCHANGED salary sum to the annual assessment only to
 * within six cents; settling that residue would write a four-cent line into every June-to-July of
 * every flat-salary walk for as long as the walk runs, and would report arithmetic rounding as a
 * reconciliation. One dollar is two orders of magnitude clear of the six cents it exists to absorb
 * and far below any gap a real change of income within a year produces.
 *
 * It applies in BOTH directions, so up to a dollar a year per Person is dropped rather than
 * refunded or collected. That is stated rather than hidden: the alternative — accumulating the
 * suppressed cents across years — would make one year's reported figure depend on the rounding of
 * every year before it.
 */
export const TRUE_UP_DE_MINIMIS: Cents = toCents(1);

/**
 * **Twelve, as the length of a financial year in months** — the count a year-end true-up requires
 * the walk to have SEEN before it will assess that year. It is not `monthlyFromAnnual`'s twelfth
 * wearing a different name: that one is a conversion of an amount, this one is a length of time,
 * and the day either changes the other does not follow.
 */
const MONTHS_IN_A_FINANCIAL_YEAR = 12;

/**
 * **Oldest parcel first — FIFO, and it is the DEFAULT rather than the policy (P3-21a, ruled
 * 2026-09-17).**
 *
 * Named and exported so that the default is a value a test can assert and a caller can see, never a
 * `??` buried inside a branch. `NonSuperInvestmentSellParams.parcelSelection` overrides it per
 * disposal, because P3-21d's sequencing lever is exactly the case for choosing against FIFO in a
 * low-income year, and ADR-0004 says a model proposes and does not dispose.
 */
export const DEFAULT_PARCEL_SELECTION: ParcelSelection = 'oldest-first';

/**
 * **How many steps of the P10-4 gross-up's fixed point are tried before the bisection takes over.**
 *
 * The iteration `xₖ₊₁ = need + tax(xₖ)` contracts at the marginal tax rate on a dollar of proceeds —
 * well under a half, because only part of a sale is gain and only part of a gain is taxed — so every
 * case measured so far settles in two or three steps and lands on `net(x) = need` exactly. This cap
 * is not a tolerance and nothing is approximated when it is reached: the bisection that follows is
 * the guarantee, it is bounded at 53 halvings of an integer bracket, and it answers to the cent. Both
 * halves and the proof are at the block headed *THE SALE FUNDS ITS OWN TAX* in `project()`.
 */
export const GROSS_UP_FIXED_POINT_STEPS = 8;

/** The three selection rules, as a value — a stored plan and a `.mjs` fixture never meet the compiler. */
export const PARCEL_SELECTIONS: readonly ParcelSelection[] = Object.freeze([
  'oldest-first',
  'highest-cost-base-first',
  'lowest-cost-base-first',
]);

/**
 * **Which parcel goes first, and it decides a TAX BILL rather than an order of traversal.**
 *
 * The same $50,000 of proceeds out of the same three parcels realises three different gains under
 * the three rules — that is the whole reason the rule is a stated field and not a convention, and
 * `test/core-non-super-disposal.test.mjs` pins all three figures against one fixture.
 *
 * Ties keep the Household's stated order, because `Array.prototype.sort` is stable (ES2019) and the
 * stated order is the only other fact available: inventing a tie-break — by market value, by size,
 * by position reversed — would be a selection policy written where nobody would look for one.
 */
export const parcelsInSelectionOrder = (
  parcels: readonly Parcel[],
  selection: ParcelSelection,
): readonly Parcel[] => Object.freeze(indexedInSelectionOrder(parcels, selection).map(({ parcel }) => parcel));

const indexedInSelectionOrder = (
  parcels: readonly Parcel[],
  selection: ParcelSelection,
): readonly { index: number; parcel: Parcel }[] => {
  if (!PARCEL_SELECTIONS.includes(selection)) {
    throw new RangeError(
      `unknown parcel selection ${JSON.stringify(selection)}: state one of ${PARCEL_SELECTIONS.join(', ')}, or nothing at all for the default (${DEFAULT_PARCEL_SELECTION})`,
    );
  }
  const indexed = parcels.map((parcel, index) => ({ index, parcel }));
  if (selection === 'oldest-first') {
    return indexed.sort((a, b) => (a.parcel.acquired < b.parcel.acquired ? -1 : a.parcel.acquired > b.parcel.acquired ? 1 : 0));
  }
  const sign = selection === 'highest-cost-base-first' ? -1 : 1;
  return indexed.sort((a, b) => sign * (a.parcel.costBase - b.parcel.costBase));
};

/**
 * **Held MORE THAN 12 months — the whole of the 50% discount's gate (P3-21b, ITAA 1997 s 115-25).**
 *
 * ⚠️ **Exactly 12 months does NOT qualify.** A parcel acquired on 30 June 2026 and disposed of on 30
 * June 2027 is one day short of *more than* 12 months and is taxed on the whole gain; the next day it
 * is taxed on half. The two are different tax bills, not a boolean, and the test file asserts them as
 * two dollar figures either side of the anniversary.
 *
 * The anniversary is `nthBirthday(acquired, 1)` rather than new calendar arithmetic, so 29 February
 * is settled once, in the one module that owns the calendar: a parcel acquired on 29 February 2028
 * completes its year on 1 March 2029, which is the day it has actually been held the whole year, and
 * the direction of that choice is the conservative one there as here — a day later, never a day
 * earlier, so the discount never arrives before it is earned.
 */
export const heldMoreThanTwelveMonths = (acquired: IsoDate, disposedOn: IsoDate): boolean =>
  assertIsoDate(disposedOn) > nthBirthday(assertIsoDate(acquired), 1);

/**
 * **Half the gain, ROUNDED TOWARDS THE HOUSEHOLD PAYING MORE — the stated rounding direction.**
 *
 * A 50% discount on an odd number of cents is half a cent, and money here is whole cents (P2-4), so
 * a direction has to be chosen rather than fallen into. The discounted gain is rounded **UP**: a
 * $25.01 gain is discounted to $12.51, not $12.50. The discount itself is therefore the floor.
 *
 * **Why up.** The discounted figure is what chunk 5 puts into taxable income, so rounding it up can
 * only ever charge the household MORE tax than the exact half-cent would, never less. Rounding down
 * would flatter by half a cent per disposal — unmeasurable in dollars and in precisely the direction
 * this build is organised against. There is nothing to trade: the cost of the safe direction is at
 * most one cent of tax base per parcel disposed of.
 *
 * Only a GAIN is discounted. A loss is carried at its full face value — s 115-25 discounts a capital
 * gain and there is no such thing as a discounted capital loss — and `disposalFromSell` applies this
 * function only where the nominal gain is positive.
 *
 * **From 1 July 2027 it halves the DEFERRED part only** (`netCapitalGainFromJuly2027` step 5): the
 * gain after that day is indexed instead and never discounted (s 115-100(f)).
 */
export const discountedCapitalGain = (nominalGain: Cents): Cents => {
  if (!Number.isSafeInteger(nominalGain) || nominalGain <= 0) {
    throw new RangeError(`the 50% discount applies to a capital GAIN, and ${nominalGain} is not one (s 115-25)`);
  }
  return (nominalGain - Math.floor(nominalGain / 2)) as Cents;
};

/** What one parcel (or one part of one parcel) realised on a disposal. */
export interface ParcelRealisation {
  /** The day the parcel was acquired — the field the discount turns on, carried so it can be shown. */
  readonly acquired: IsoDate;
  /** The market value taken out of this parcel: its whole `marketValue`, or the part the sale needed. */
  readonly proceeds: Cents;
  /** The part of the parcel's cost base that went with those proceeds. */
  readonly costBase: Cents;
  /** `proceeds − costBase`. NEGATIVE where the parcel is under water — a brokerage-only loss, say. */
  readonly nominalGain: Cents;
  /** Whether s 115-25's *more than 12 months* was met, on `heldMoreThanTwelveMonths`. */
  readonly discountApplies: boolean;
  /** The nominal gain, halved where `discountApplies`. A loss appears here unchanged. Nil where
   * `preCgtDisregarded`. */
  readonly gain: Cents;
  /**
   * **A pre-CGT parcel disposed of before 1 July 2027: its gain or loss is DISREGARDED** (ITAA 1997
   * s 104-10(5)(a)). `nominalGain` still shows `proceeds − costBase`; `gain` is nil, `discountApplies`
   * is false, and `netCapitalGain` counts neither the gain nor the loss. From 1 July 2027 the parcel
   * is deemed reacquired (s 112-175(2)), so a disposal on or after that day is never disregarded.
   */
  readonly preCgtDisregarded: boolean;
  /** The disposed part of `Parcel.valueJustBefore1July2027`, apportioned as `costBase` is. Absent
   * where the parcel carries none. */
  readonly valueJustBefore1July2027?: Cents;
  /** The disposed part of `Parcel.reinvestedFromJuly2027`, apportioned as `costBase` is. Absent
   * where the parcel carries none. */
  readonly reinvestedFromJuly2027?: Cents;
}

/** One `NON_SUPER_INVESTMENT` sell, resolved: whose it is, what it realised, and what is left. */
export interface PortfolioDisposal {
  /** The index into `Household.persons` whose parcels were sold. A gain is that Person's (P3-21c). */
  readonly personIndex: number;
  /** The market value that actually left the portfolio — the inflow line's amount. */
  readonly proceeds: Cents;
  /** One entry per parcel touched, in the order the selection rule took them. */
  readonly realisations: readonly ParcelRealisation[];
  /** `Σ nominalGain`, losses signed. The figure BEFORE any discount. */
  readonly nominalGain: Cents;
  /** `Σ gain` — the discounted figure. See the s 102-5 caveat on `disposalOfAmount`. */
  readonly discountedGain: Cents;
  /** Every Person's parcels as they stand after the disposal, in `Household.persons` order. */
  readonly parcelsAfter: readonly (readonly Parcel[])[];
}

/**
 * **A disposal of `amount` against one Person's parcels — the whole of what a disposal DECIDES, and
 * it does not know what asked for it (P3-21f chunk 6a).**
 *
 * Everything a disposal decides is decided here, in one exported function, so that each of it is a
 * fact a test can assert with a dollar figure against it: which parcels, what the gain is, and
 * whether the 50% discount reaches it. **Whose** parcels is the caller's, because the two callers
 * answer it from different places and neither answer belongs in the arithmetic: an entry-driven sell
 * reads `soleOwnerIndex` off the entry (`disposalFromSell`, below), and an automatic limb 3 draw has
 * no entry at all and allocates across the Household's stated order. Splitting them was chunk 6a and
 * it moved no figure — a draw and a stated sale realise the same gain out of the same parcels, and if
 * they could not, one of the two would be the flattering one.
 *
 * **The parcels are passed for EVERY Person and the function picks**, exactly as `parcelsAfterPurchases`
 * takes them all. A disposal that read one Person's parcels and wrote another's would be a gain
 * shifted after the fact, which P3-21c forbids and which no `Month` field would show — so there is no
 * call site that could hand this function the wrong Person's portfolio.
 *
 * **The disposal day is READ and never guessed**, for the same reason the acquisition day is: the
 * discount turns on the span between them, so a day the model supplied would answer a tax question
 * nobody asked. An entry passes its own date; limb 3 passes the month it drew in.
 *
 * **Capped at what is HELD.** `min(stated, holdings)` — the shape every Waterfall limb takes and the
 * shape a buy's funding takes. A Person holding less than was asked for sells what there is, and a
 * Person holding nothing sells nothing and returns `undefined`, so the caller emits no line rather
 * than a $0 sale.
 *
 * **A PART of a parcel can be sold, and the cost base is apportioned by MARKET VALUE.** Selling
 * $10,000 out of a $20,000 parcel disposes of half of it and half of its cost base. The arithmetic is
 * done in `BigInt` and truncated, never in floats: `costBase × sold ÷ marketValue` overflows
 * `Number.MAX_SAFE_INTEGER` on portfolio-sized figures long before it is inexact, and a cost base one
 * cent out is a gain one cent out.
 *
 * ⚠️ **Truncation is the safe direction and the residue goes to the RETAINED part.** The disposed
 * cost base is floored, so it is never more than its true share and the gain realised now is never
 * less than the truth; the cent stays in the retained parcel's cost base, where it reduces a later
 * gain by the same cent. The total cost base is conserved exactly — nothing is created or destroyed —
 * so the cumulative realised gain is greater than or equal to the truth at every point in the walk
 * and exactly equal once the parcel is fully sold.
 *
 * ⚠️ **THE SELECTION RULE IS THE CALLER'S, and an automatic draw has only one it can state.**
 * `NonSuperInvestmentSellParams.parcelSelection` overrides the default per disposal because P3-21d's
 * sequencing lever is exactly the case for choosing against FIFO in a low-income year — but limb 3
 * has no entry to carry an override, so it passes `DEFAULT_PARCEL_SELECTION` and nothing else. The
 * parameter is required here rather than defaulted so that neither caller can leave the question to a
 * `??` buried in the arithmetic.
 *
 * ⚠️ **INCIDENTAL COSTS OF DISPOSAL ARE NOT CARRIED, and this is the line chunk 3 left owing.**
 * s 110-25 covers the *acquisition* side, which chunk 4 now records; brokerage on the way OUT reduces
 * the capital proceeds instead (or, equivalently, joins the second element of the cost base). Symmetry
 * argues for carrying it and it is deliberately not carried here, on one ground: each parcel is its
 * own CGT asset, so a single sale's disposal costs would have to be **apportioned across the parcels
 * sold**, and no apportionment of a whole number of cents across parcels with different discount
 * status is exact — the residual cent lands on a discounted parcel or an undiscounted one and moves
 * the taxable figure by half a cent in a direction that depends on the fixture. That is a rounding
 * ruling and not a modelling choice, and this chunk does not have it. **The direction of leaving them
 * out is stated and it is the conservative one:** proceeds are un-reduced, so the gain and the tax are
 * OVER-stated, never under. `NonSuperInvestmentSellParams` therefore has no field for them, so a
 * stated figure cannot be silently ignored.
 *
 * ⚠️ **`discountedGain` is a SUM, and the s 102-5 method statement is not a sum.** Where every parcel
 * realises a gain the two agree. Where a disposal realises a LOSS as well, s 102-5 applies the loss
 * against gross gains *before* the discount, and which gain it is applied to first is the taxpayer's
 * choice — so the correct net capital gain can be higher than the figure summed here. Both figures
 * are carried (`nominalGain` and `discountedGain`) precisely so chunk 5 can do the ordering; **chunk
 * 4 does not put either of them into taxable income**, and a test asserts that realising a gain moves
 * no tax figure at all.
 */
export const disposalOfAmount = (
  personIndex: number,
  stated: Cents,
  disposedOn: IsoDate,
  parcelsPerPerson: readonly (readonly Parcel[])[],
  selection: ParcelSelection,
): PortfolioDisposal | undefined => {
  const held = parcelsPerPerson[personIndex];
  if (held === undefined) {
    throw new RangeError(`a sale names person ${personIndex}, who holds no carried parcels`);
  }
  const holdings = held.reduce((sum, parcel) => sum + parcel.marketValue, 0);
  const proceeds = Math.min(stated, Math.max(0, holdings)) as Cents;
  if (proceeds <= 0) return undefined; // nothing held, so nothing was sold, and no line says one was.

  const realisations: ParcelRealisation[] = [];
  const replacements = new Map<number, Parcel | undefined>();
  let outstanding: number = proceeds;
  for (const { index, parcel } of indexedInSelectionOrder(held, selection)) {
    if (outstanding <= 0) break;
    if (parcel.marketValue <= 0) continue; // a worthless parcel supplies no proceeds and cannot be reached by a sale stated in dollars.
    const sold = Math.min(outstanding, parcel.marketValue) as Cents;
    const whole = sold === parcel.marketValue;
    const costBase = (
      whole ? parcel.costBase : Number((BigInt(parcel.costBase) * BigInt(sold)) / BigInt(parcel.marketValue))
    ) as Cents;
    const stamp = parcel.valueJustBefore1July2027;
    const stampSold = (
      stamp === undefined || whole ? stamp : Number((BigInt(stamp) * BigInt(sold)) / BigInt(parcel.marketValue))
    ) as Cents | undefined;
    const reinvested = parcel.reinvestedFromJuly2027;
    const reinvestedSold = (
      reinvested === undefined || whole ? reinvested : Number((BigInt(reinvested) * BigInt(sold)) / BigInt(parcel.marketValue))
    ) as Cents | undefined;
    const nominalGain = (sold - costBase) as Cents;
    const preCgtDisregarded = parcel.acquired < PRE_CGT_CUTOFF && disposedOn < CGT_REFORM_START;
    const discountApplies = !preCgtDisregarded && nominalGain > 0 && heldMoreThanTwelveMonths(parcel.acquired, disposedOn);
    realisations.push(
      Object.freeze({
        acquired: parcel.acquired,
        proceeds: sold,
        costBase,
        nominalGain,
        discountApplies,
        gain: preCgtDisregarded ? toCents(0) : discountApplies ? discountedCapitalGain(nominalGain) : nominalGain,
        preCgtDisregarded,
        ...(stampSold === undefined ? {} : { valueJustBefore1July2027: stampSold }),
        ...(reinvestedSold === undefined ? {} : { reinvestedFromJuly2027: reinvestedSold }),
      }),
    );
    replacements.set(
      index,
      whole
        ? undefined
        : Object.freeze({
            acquired: parcel.acquired,
            costBase: (parcel.costBase - costBase) as Cents,
            marketValue: (parcel.marketValue - sold) as Cents,
            ...(stamp === undefined ? {} : { valueJustBefore1July2027: (stamp - (stampSold as Cents)) as Cents }),
            ...(reinvested === undefined ? {} : { reinvestedFromJuly2027: (reinvested - (reinvestedSold as Cents)) as Cents }),
          }),
    );
    outstanding -= sold;
  }

  const remaining = held.flatMap((parcel, index) => {
    if (!replacements.has(index)) return [parcel];
    const replacement = replacements.get(index);
    return replacement === undefined ? [] : [replacement];
  });
  return Object.freeze({
    personIndex,
    proceeds,
    realisations: Object.freeze(realisations),
    nominalGain: realisations.reduce((sum, realisation) => sum + realisation.nominalGain, 0) as Cents,
    discountedGain: realisations.reduce((sum, realisation) => sum + realisation.gain, 0) as Cents,
    parcelsAfter: Object.freeze(
      parcelsPerPerson.map((parcels, index) => Object.freeze(index === personIndex ? remaining : [...parcels])),
    ),
  });
};

/**
 * **One `NON_SUPER_INVESTMENT` sell — the ENTRY door onto `disposalOfAmount`, and nothing else.**
 *
 * It answers the three questions an entry is the authority on and then stops: is this the sell door,
 * is the stated amount a whole number of cents, and whose parcels (`soleOwnerIndex`, which refuses a
 * `household`-owned sale rather than guessing a Person). The day is the entry's own and the selection
 * rule is the entry's own where it states one. What the disposal then REALISES is not an entry
 * question, and after chunk 6a it is not asked here: limb 3's automatic draw goes through the very
 * same arithmetic with no entry in front of it.
 */
export const disposalFromSell = (
  entry: Extract<Entry, { type: 'NON_SUPER_INVESTMENT' }>,
  household: Household,
  parcelsPerPerson: readonly (readonly Parcel[])[],
): PortfolioDisposal | undefined => {
  const params = entry.params;
  if (params.direction !== 'sell') {
    throw new RangeError(
      `entry ${entry.id} (NON_SUPER_INVESTMENT) states direction ${JSON.stringify(params.direction)}: \`disposalFromSell\` is the SELL door, and a purchase goes through \`purchaseFromBuy\``,
    );
  }
  const stated = params.amount;
  if (!Number.isSafeInteger(stated) || stated < 0) {
    throw new RangeError(
      `entry ${entry.id} (NON_SUPER_INVESTMENT) sells ${stated}, which is not a whole number of cents`,
    );
  }
  return disposalOfAmount(
    soleOwnerIndex(entry, household),
    stated,
    entry.date,
    parcelsPerPerson,
    params.parcelSelection ?? DEFAULT_PARCEL_SELECTION,
  );
};

// --- Chunk 5 (P3-21f): ITAA 1997 s 102-5, which is a METHOD STATEMENT and not a sum --------------

/**
 * **Which gain a capital LOSS is applied to, and it is the taxpayer's own choice — so it is stated
 * here rather than fallen into (ADR-0004).**
 *
 * s 102-5(1) step 1 reduces capital gains by capital losses and says nothing about the order; the
 * ATO's own guidance is explicit that the taxpayer chooses. The order is money because step 3 halves
 * what is LEFT of a discountable gain: a dollar of loss applied to an undiscountable gain removes a
 * whole dollar from the net capital gain, and the same dollar applied to a discountable one removes
 * fifty cents.
 */
export const CAPITAL_LOSS_APPLICATIONS = ['discountable-gains-first', 'undiscountable-gains-first'] as const;

export type CapitalLossApplication = (typeof CAPITAL_LOSS_APPLICATIONS)[number];

/**
 * **The stated default: losses go against the DISCOUNTABLE gains first, which is the order that
 * leaves the household paying MORE tax.**
 *
 * It is deliberately **not** the taxpayer-optimal order, and the precedent is P3-21a's FIFO ruling
 * of the same week: a tactic that minimises one year's tax is not a default worth running silently
 * for forty. The optimising order is available by name and a caller that wants it says so, exactly
 * as a caller that wants `highest-cost-base-first` parcels says so.
 *
 * **The direction is the one this build is required to be wrong in:** the default over-states the net
 * capital gain and therefore the tax, never under-states it. On the fixture in
 * `test/core-non-super-gain-tax.test.mjs` it is $8,000 against the $7,000 the optimising order gives
 * and the $6,500 a naive sum of per-parcel discounted gains gives — and $705 of tax between the
 * first and the last.
 */
export const DEFAULT_CAPITAL_LOSS_APPLICATION: CapitalLossApplication = 'discountable-gains-first';

/**
 * **ITAA 1997 s 102-5(1) — the net capital gain, worked as the method statement and NOT as a sum of
 * per-parcel discounted gains.**
 *
 * `PortfolioDisposal.discountedGain` is that sum, and chunk 4 disclosed in writing that the two are
 * different numbers wherever a loss is realised alongside a gain: the Act applies losses to **gross**
 * gains at step 1 and only halves what survives at step 3, so a loss netted after the discount is
 * worth twice what the Act gives it and the summed figure comes out too LOW. This is the function
 * that does it in the statutory order, and it is the one whose result reaches taxable income.
 *
 *   step 1  reduce the capital gains by the capital losses made in the income year
 *   step 2  apply any unapplied net capital losses from earlier years — **none exist in this model**
 *   step 3  reduce each surviving *discount capital gain* by the discount percentage
 *   step 4  the small business concessions — out of scope (Div 152 is not modelled)
 *   step 5  add up what is left
 *
 * **What is NOT carried, with its direction, because leaving it silent is how a gain goes missing:**
 *
 *   * **No prior-year net capital loss** (step 2). Nothing in `Household` holds one and inventing a
 *     field would be inventing a balance the user never stated. A household that really has one pays
 *     LESS than this model says, so the omission over-states the tax.
 *   * **Unused current-year losses are DISCARDED, not carried forward.** Where the losses exceed the
 *     gains the net capital gain is nil and the excess would in law reduce a LATER year's gains.
 *     Same direction again: the later year's tax is over-stated. Carrying it forward is a ledger
 *     across financial years, which is P4-2's boundary and not this chunk's.
 *
 * **The caller decides what set of realisations this is.** `project()` passes every realisation of
 * one Person for one FINANCIAL YEAR, because s 102-5 is an annual computation over all of a
 * taxpayer's CGT events — netting one disposal at a time would strand a loss made in March against a
 * gain made in September of the same year.
 *
 * **An income year before 1 July 2027 only.** From then the walk uses `netCapitalGainFromJuly2027`,
 * the method statement as Act No. 49 of 2026 substituted it.
 */
export const netCapitalGain = (
  realisations: readonly ParcelRealisation[],
  application: CapitalLossApplication = DEFAULT_CAPITAL_LOSS_APPLICATION,
): Cents => {
  if (!CAPITAL_LOSS_APPLICATIONS.includes(application)) {
    throw new RangeError(
      `unknown capital loss application ${JSON.stringify(application)}: state one of ${CAPITAL_LOSS_APPLICATIONS.join(', ')}, or nothing at all for the default (${DEFAULT_CAPITAL_LOSS_APPLICATION})`,
    );
  }
  // Step 1's raw material: the GROSS gains, each remembering whether step 3 will reach it, and the
  // losses as one figure — a loss has no discount status, because s 115-25 discounts a gain and
  // there is no such thing as a discounted capital loss.
  // A pre-CGT parcel's gain or loss before 1 July 2027 is disregarded (s 104-10(5)(a)), so it
  // reaches neither list.
  const counted = realisations.filter((realisation) => !realisation.preCgtDisregarded);
  const gains = counted
    .filter((realisation) => realisation.nominalGain > 0)
    .map((realisation) => ({ gross: realisation.nominalGain as number, discountApplies: realisation.discountApplies }));
  let losses = counted.reduce(
    (total, realisation) => total + (realisation.nominalGain < 0 ? -realisation.nominalGain : 0),
    0,
  );
  const first = application === 'discountable-gains-first';
  // A stable partition rather than a comparator over a boolean: gains within a class keep the order
  // they were realised in, so the answer does not depend on the sort's tie-breaking.
  const ordered = [
    ...gains.filter((gain) => gain.discountApplies === first),
    ...gains.filter((gain) => gain.discountApplies !== first),
  ];
  for (const gain of ordered) {
    if (losses <= 0) break;
    const applied = Math.min(losses, gain.gross);
    gain.gross -= applied;
    losses -= applied;
  }
  // Step 3 and step 5. `discountedCapitalGain` is chunk 4's, so the half-cent still rounds towards
  // the household paying more, and it is applied to the gain as REDUCED — which is the whole point.
  return ordered.reduce(
    (total, gain) => total + (gain.gross <= 0 ? 0 : gain.discountApplies ? discountedCapitalGain(gain.gross as Cents) : gain.gross),
    0,
  ) as Cents;
};

// --- LR-1 slice 1: the CGT reform from 1 July 2027 (Act No. 49 of 2026 Sch 1), register §2.10 ----
//
// Pure arithmetic. Slice 2 wires it: the walk stamps `Parcel.valueJustBefore1July2027` at the
// opening of July 2027, and `assessCapitalGainCharge` routes a disposal on or after 1 July 2027
// through `realisationFromJuly2027` and `netCapitalGainFromJuly2027`. Slice 3 carries the minimum tax
// capital gain into Div 119.

/** `YYYY-MM` of the first month of the calendar quarter containing `day` — the index-number quarter
 * of s 960-275(1B), which is a March, June, September or December quarter. */
const firstMonthOfQuarter = (day: IsoDate): string => {
  const [year, month] = assertIsoDate(day).split('-').map(Number) as [number, number];
  return `${year}-${String(month - ((month - 1) % 3)).padStart(2, '0')}`;
};

/** The factor in thousandths, so a cost base is indexed in whole-number arithmetic. */
const INDEXATION_SCALE = 10 ** INDEXATION_FACTOR_DECIMAL_PLACES;

const indexationFactorScaled = (cpi: number, expenditureDay: IsoDate, eventDay: IsoDate): number =>
  Math.round(priceLevelFactor(cpi, firstMonthOfQuarter(expenditureDay), firstMonthOfQuarter(eventDay)) * INDEXATION_SCALE);

/**
 * **The s 960-275(1B) indexation factor: the index number for the quarter of the CGT event over the
 * index number for the quarter the expenditure was incurred in, to 3 decimal places, a fourth
 * decimal of 5 or more rounding UP (s 960-275(5)).**
 *
 * The index number is the All Groups CPI (s 960-280(1)). No quarter this can need (September 2027 or
 * later) is published today, so both are forecast on `Settings.economicSeries.cpi` through
 * `priceLevelFactor`, the one price-level expression. Because the factor is a ratio only the gap in
 * QUARTERS matters, so each day is taken to the first month of its quarter before the gap is
 * measured: two days in the same quarter give exactly 1. Label: forecast, not primary.
 *
 * `Math.round` on the thousandths is the statutory rule and not an approximation of it: rounding
 * half up at the third decimal turns only on the fourth. No floor at 1 — a negative `cpi` gives a
 * factor below 1, applied as the law writes it.
 *
 * TODO (LR-1 follow-up): once a plan's `asAtDate` passes the first publication of the September 2027
 * quarter, the published index numbers are the legal figures for past quarters, and a quarterly
 * published CPI series is needed.
 */
export const cgtIndexationFactor = (cpi: number, expenditureDay: IsoDate, eventDay: IsoDate): number =>
  indexationFactorScaled(cpi, expenditureDay, eventDay) / INDEXATION_SCALE;

/**
 * **A parcel acquired before 1 July 2027 reached a realisation on or after it with no value just
 * before 1 July 2027.** The deemed sale's capital proceeds (s 112-155(3)(a), s 112-175(3)(a)) are
 * that market value, and without it neither the deferred gain nor the gain from 1 July 2027 exists.
 * Refused rather than guessed: the cost base would erase the deferred gain and the proceeds would
 * erase the later one, and either stand-in flatters in one of the two.
 */
export class MissingValueJustBefore1July2027Error extends RangeError {
  constructor(acquired: IsoDate, disposedOn: IsoDate) {
    super(
      `a parcel acquired on ${acquired} and disposed of on ${disposedOn} was held through 30 June 2027, ` +
        'so ITAA 1997 s 112-155 (or s 112-175 for a pre-CGT parcel) deems it sold just before 1 July 2027 ' +
        'at its market value and reacquired for the same amount — but the parcel carries no ' +
        '`valueJustBefore1July2027`. Without it the gain cannot be split into the deferred part and the ' +
        'part from 1 July 2027, so the disposal is refused rather than taxed on a guess.',
    );
    this.name = 'MissingValueJustBefore1July2027Error';
  }
}

/**
 * **What a capital gains tax line from 1 July 2027 says about its indexation.** Every index number
 * the factor can need is a forecast on the plan's own `cpi`, not a published one (see
 * `cgtIndexationFactor`, and its TODO for a published quarterly series).
 */
export const CGT_INDEXATION_FORECAST_DETERMINATION =
  "the gain after 1 July 2027 is indexed on this plan's forecast CPI (Settings.economicSeries.cpi), not a published index number";

/**
 * **What a capital gains tax line says when Div 119's minimum tax is in it** (LR-1 slice 4). Only
 * where the Person's assessment carries a positive gap, and in the rule's own terms: the figure is
 * the ladder topped up, and the exemption is by income year, so a charge made before the Age
 * Pension starts in that year is given back in July.
 */
export const CGT_MINIMUM_TAX_DETERMINATION =
  'includes the 30% minimum tax on the gain after 1 July 2027 (ITAA 1997 s 119-10): the ordinary tax on that gain came to less ' +
  'than 30% of it, so the difference is charged, rounded down to the dollar. It is not payable for an income year in which the ' +
  'Age Pension is received (s 119-15), so a charge made before the pension starts in the same year comes back at the July true-up';

/** One `ParcelRealisation` from a CGT event on or after 1 July 2027, split as Act 49 splits it. */
export interface ReformedRealisation {
  readonly acquired: IsoDate;
  readonly proceeds: Cents;
  /** The disposed part of the ORIGINAL cost base. */
  readonly costBase: Cents;
  /** The disposed part of the stamp. Absent for a parcel acquired on or after 1 July 2027. */
  readonly valueJustBefore1July2027?: Cents;
  /** The disposed part of `Parcel.reinvestedFromJuly2027`: cost base of the later part, unindexed. */
  readonly reinvestedFromJuly2027?: Cents;
  /**
   * **The deferred gain or loss** (s 112-160(3)–(4)): `valueJustBefore1July2027 − costBase`, signed,
   * made in the year of the realisation. Nil for a parcel acquired on or after 1 July 2027 (no deemed
   * sale) and for a pre-CGT parcel (s 112-175(2): disregarded, s 104-10(5)). Never indexed: the
   * deemed event happens before 1 July 2027, outside s 110-36(1A)(a).
   */
  readonly deferredGain: Cents;
  /** s 112-160(3)(a)(ii) and (c): a discount capital gain if held more than 12 months from the
   * ORIGINAL acquisition to the REALISATION day. */
  readonly deferredDiscountApplies: boolean;
  /** s 960-275(1B), 3 decimal places; exactly 1 where s 114-10(1) is not met. */
  readonly indexationFactor: number;
  /** The cost base of the part from 1 July 2027, indexed and floored to the cent (the floor raises
   * the gain, the conservative direction). */
  readonly indexedCostBase: Cents;
  /**
   * **The gain or loss from 1 July 2027** (s 112-155(2)(b), s 110-36(1A)): a gain where the proceeds
   * exceed the INDEXED cost base; a loss where they fall short of the UNINDEXED one, because
   * indexation never reaches the reduced cost base (s 114-5(1) note 2); nil in between. Never a
   * discount capital gain (s 115-100(f)), and a non-residential capital gain (s 102-6(1)).
   */
  readonly postGain: Cents;
}

/**
 * **Split one realisation from a CGT event on or after 1 July 2027 into the deferred part and the
 * part from 1 July 2027 (ITAA 1997 ss 112-155, 112-160, 112-175, 110-36(1A), 114-10, 960-275(1B)).**
 *
 *   * **Held through 30 June 2027, not pre-CGT** (s 112-155): deemed sold just before 1 July 2027 for
 *     `valueJustBefore1July2027` and reacquired for the same. The deferred gain is that value less
 *     the cost base, discounted on the realisation day. The later part runs from that value.
 *   * **Pre-CGT on 30 June 2027** (s 112-175): the same deemed sale and reacquisition, and the
 *     deferred gain is nil — the pre-reform part is disregarded.
 *   * **Acquired on or after 1 July 2027**: no deemed sale. The whole gain is the later part, from the
 *     cost base and indexed from the quarter of acquisition.
 *
 * **The 12-month rule for indexation reads the ORIGINAL acquisition day** (s 114-10(9) disregards
 * the deemed reacquisition), on `heldMoreThanTwelveMonths` — "more than", the P3-21b reading, where
 * s 114-10(1) says "at least": one day later, never earlier, so indexation never arrives early. A gain
 * held 12 months or less is not indexed and is still a capital gain.
 *
 * **A distribution reinvested on or after 1 July 2027** (`Parcel.reinvestedFromJuly2027`) joins the
 * later part's cost base and leaves the deferred gain alone, as new units would. It is added AFTER
 * indexation, unindexed: one figure cannot carry each reinvestment's own quarter, and an unindexed
 * cost base over-states the gain, never under.
 *
 * `cpi` is required: indexation is a forecast, and a defaulted rate would be an answer nobody gave.
 */
export const realisationFromJuly2027 = (
  realisation: ParcelRealisation,
  disposedOn: IsoDate,
  cpi: number,
): ReformedRealisation => {
  if (assertIsoDate(disposedOn) < CGT_REFORM_START) {
    throw new RangeError(
      `a disposal on ${disposedOn} is before ${CGT_REFORM_START}: the gain is worked out by \`netCapitalGain\` under the law before the reform`,
    );
  }
  const { acquired, proceeds, costBase } = realisation;
  const stamp = realisation.valueJustBefore1July2027;
  const heldThrough = acquired < CGT_REFORM_START;
  if (heldThrough && stamp === undefined) throw new MissingValueJustBefore1July2027Error(acquired, disposedOn);
  if (!heldThrough && stamp !== undefined) {
    throw new RangeError(
      `a parcel acquired on ${acquired} was not held on 30 June 2027 and cannot carry a value just before 1 July 2027`,
    );
  }
  const preCgt = acquired < PRE_CGT_CUTOFF;
  const deferredGain = (heldThrough && !preCgt ? (stamp as Cents) - costBase : 0) as Cents;
  // s 112-160(3)(c): the deemed event is taken to happen on the realisation day.
  const deferredDiscountApplies = deferredGain > 0 && heldMoreThanTwelveMonths(acquired, disposedOn);
  const reinvested = realisation.reinvestedFromJuly2027 ?? 0;
  const base = heldThrough ? (stamp as Cents) : costBase;
  // s 114-10(1) and (9): at least 12 months from the ORIGINAL acquisition.
  const indexed = heldMoreThanTwelveMonths(acquired, disposedOn);
  const scaled = indexed
    ? indexationFactorScaled(cpi, heldThrough ? CGT_REFORM_START : acquired, disposedOn)
    : INDEXATION_SCALE;
  const indexedCostBase = (Number(
    (BigInt(base) * BigInt(scaled)) / BigInt(INDEXATION_SCALE),
  ) + reinvested) as Cents;
  const reducedCostBase = base + reinvested;
  const postGain = (
    proceeds > indexedCostBase ? proceeds - indexedCostBase : proceeds < reducedCostBase ? proceeds - reducedCostBase : 0
  ) as Cents;
  return Object.freeze({
    acquired,
    proceeds,
    costBase,
    ...(stamp === undefined ? {} : { valueJustBefore1July2027: stamp }),
    ...(realisation.reinvestedFromJuly2027 === undefined ? {} : { reinvestedFromJuly2027: realisation.reinvestedFromJuly2027 }),
    deferredGain,
    deferredDiscountApplies,
    indexationFactor: scaled / INDEXATION_SCALE,
    indexedCostBase,
    postGain,
  });
};

/** The net capital gain for an income year from 1 July 2027, and the base of Div 119's minimum tax. */
export interface NetCapitalGainFromJuly2027 {
  /** s 102-5(1) step 7. */
  readonly netGain: Cents;
  /**
   * **The minimum tax capital gain** (s 119-5): the non-residential and residential capital gains
   * remaining after the method statement, EXCLUDING the deferred ones. Undiscounted by construction.
   * Divs 30 and 31 are not modelled, so nothing is subtracted.
   */
  readonly minimumTaxCapitalGain: Cents;
}

/**
 * **ITAA 1997 s 102-5(1) as substituted by Act 49 Sch 1 item 5, for an income year from 1 July 2027.**
 *
 * Step 1 now fixes the ORDER across categories: current-year losses (deferred and later, neither
 * indexed) reduce (a) deferred non-residential gains first, then (c) non-residential gains. (b) and
 * (d), the residential categories, are nil: a home has no parcel (ADR-0005). Within a category the
 * taxpayer chooses (step 1 note 3), so `application` survives only among the deferred gains, with
 * the same default as `netCapitalGain` for the same reason. Steps 2–4 and 6 are nil here as there;
 * step 5 halves what is left of each deferred discount capital gain, rounding up.
 *
 * The caller passes every realisation of one Person for one financial year, as for `netCapitalGain`.
 */
export const netCapitalGainFromJuly2027 = (
  realisations: readonly ReformedRealisation[],
  application: CapitalLossApplication = DEFAULT_CAPITAL_LOSS_APPLICATION,
): NetCapitalGainFromJuly2027 => {
  if (!CAPITAL_LOSS_APPLICATIONS.includes(application)) {
    throw new RangeError(
      `unknown capital loss application ${JSON.stringify(application)}: state one of ${CAPITAL_LOSS_APPLICATIONS.join(', ')}, or nothing at all for the default (${DEFAULT_CAPITAL_LOSS_APPLICATION})`,
    );
  }
  const deferred = realisations
    .filter((realisation) => realisation.deferredGain > 0)
    .map((realisation) => ({ gross: realisation.deferredGain as number, discountApplies: realisation.deferredDiscountApplies }));
  const nonResidential = realisations
    .filter((realisation) => realisation.postGain > 0)
    .map((realisation) => ({ gross: realisation.postGain as number, discountApplies: false }));
  let losses = realisations.reduce(
    (total, realisation) =>
      total + (realisation.deferredGain < 0 ? -realisation.deferredGain : 0) + (realisation.postGain < 0 ? -realisation.postGain : 0),
    0,
  );
  const first = application === 'discountable-gains-first';
  const ordered = [
    ...deferred.filter((gain) => gain.discountApplies === first),
    ...deferred.filter((gain) => gain.discountApplies !== first),
    ...nonResidential,
  ];
  for (const gain of ordered) {
    if (losses <= 0) break;
    const applied = Math.min(losses, gain.gross);
    gain.gross -= applied;
    losses -= applied;
  }
  return Object.freeze({
    netGain: ordered.reduce(
      (total, gain) => total + (gain.gross <= 0 ? 0 : gain.discountApplies ? discountedCapitalGain(gain.gross as Cents) : gain.gross),
      0,
    ) as Cents,
    minimumTaxCapitalGain: nonResidential.reduce((total, gain) => total + Math.max(0, gain.gross), 0) as Cents,
  });
};

/**
 * **Buy or sell, decided ONCE and refused where it is neither.**
 *
 * `NonSuperInvestmentParams` is a two-member union, so a TypeScript call site cannot state a third
 * direction; a `.mjs` fixture and a stored plan file never meet the compiler, which is what this is
 * for. It is one function rather than a branch in the walk so that the refusal is the same refusal
 * wherever the entry is read.
 */
export const nonSuperInvestmentDirection = (
  entry: Extract<Entry, { type: 'NON_SUPER_INVESTMENT' }>,
): 'buy' | 'sell' => {
  const direction = entry.params.direction as string;
  if (direction !== 'buy' && direction !== 'sell') {
    throw new RangeError(
      `entry ${entry.id} (NON_SUPER_INVESTMENT) states direction ${JSON.stringify(direction)}: a Non-Super Portfolio entry is a 'buy' or a 'sell', and a disposal is never a negative buy`,
    );
  }
  return direction;
};

// --- Chunk 5a: balances that move ---------------------------------------------------------------

/**
 * **One month of `Settings.nominalReturn`, COMPOUNDED — `(1 + r)^(1/12)`, never `1 + r/12`.**
 *
 * The Setting is a NOMINAL ANNUAL rate, so the month that composes twelve times into exactly that
 * year is the twelfth root and nothing else. `r / 12` is the other reading and it is wrong in a
 * direction: `(1 + r/12)^12 > 1 + r` for every positive `r`, so a simple twelfth compounds to MORE
 * than the annual rate the user stated — at `r = 6.5%` it is 6.697% a year, which over a
 * forty-eight year walk is about 9.9% more terminal wealth than the Setting says. It would
 * over-state growth and flatter the household, which is the direction this build is organised
 * against. Exactness here happens also to be the conservative choice, so there is nothing to trade.
 *
 * **This function itself still takes ONE rate and compounds it — that contract is unchanged.** What
 * changed is which rate a CALLER hands it. `Settings.nominalReturn` is the flat, plan-wide default;
 * since **P2-11** (gate ruling GO-VIA-DIFFERENT-SHAPE, 2026-09-22) a Person who has stated a
 * `RETURN_CHANGE` gets THEIR OWN rate here instead, read at the call site as
 * `returnRate[personIndex] ?? settings.nominalReturn` — never per-account, and never synthesised:
 * `RETURN_CHANGE` is an explicit, user-stated Journal Entry, `SPEND_CHANGE`'s own carried-level
 * idiom, not a Dated Parameter resolving into one. This function still does not read `Household` or
 * `owner` itself and still invents no rate of its own — it takes what it is given, one call at a
 * time, which is unchanged by where that figure came from.
 *
 * ⚠️ **This paragraph used to say the rate was a Dated Parameter and arrived as a SYNTHETIC entry —
 * superseded rather than deleted, because the generic mechanism it named is real and still
 * unbuilt.** concept.md §5.13's Glide Path (age bands resolving into synthetic `RETURN_CHANGE`
 * entries) is P6-3's still-deferred job; see `Settings.nominalReturn`'s own doc for the finding in
 * full.
 *
 * A return of −100% or worse is refused rather than returning zero or a complex root: it would take
 * the whole balance and more in a year, and no `Settings` this model can defend states one.
 */
export const monthlyGrowthFactor = (nominalReturn: number): number => {
  if (!Number.isFinite(nominalReturn)) throw new RangeError(`not a finite nominal return: ${nominalReturn}`);
  if (nominalReturn <= -1) {
    throw new RangeError(`a nominal return of ${nominalReturn} loses the whole balance in a year: not a rate this model applies`);
  }
  return (1 + nominalReturn) ** (1 / 12);
};

/**
 * One month's growth on one balance, in whole cents.
 *
 * **The rounding decision, taken here and stated rather than defaulted: round DOWN, every month, to
 * the whole cent.** `Math.floor`, not `mulCents`' half-away-from-zero.
 *
 * **Why a different rule from `monthlyFromAnnual`.** Same discipline as `monthlySpendFromAnnual`,
 * which rounds UP for the mirror-image reason. This is the one figure in the walk whose rounding
 * residual accumulates in the SAME direction five hundred and seventy-six times against the same
 * balance, and it accrues to the household's WEALTH. Rounding half away from zero would let it drift
 * upward; rounding down means the model can never report a balance larger than the arithmetic
 * supports. The cost is bounded and tiny: at most one cent per balance per month — under $5.76 over
 * a forty-eight year walk — against balances in the hundreds of thousands.
 *
 * **What the floor does to a very small balance, stated rather than discovered.** A balance whose
 * month's growth is under a cent does not grow at all: 100 cents at 6.5% gains 0.53 of a cent and
 * stays at 100 cents. That is an under-statement, it is the safe direction, and it is degenerate —
 * the balance has to be under about $1.90 for it to bite at all at this rate.
 *
 * **Compounding is on the CARRIED balance, not recomputed from the stated one.** `grownForOneMonth`
 * is applied to last month's rounded figure, which is what a ledger does and what chunk 5b needs: a
 * balance a drawdown has taken from has no "original × factor^n" to be recomputed from.
 */
export const grownForOneMonth = (balance: Cents, nominalReturn: number): Cents => {
  if (!Number.isSafeInteger(balance) || balance < 0) {
    throw new RangeError(`not a balance in whole cents: ${balance}`);
  }
  const grown = Math.floor(balance * monthlyGrowthFactor(nominalReturn));
  if (!Number.isSafeInteger(grown)) {
    throw new RangeError(`a balance of ${balance} grew past the safe integer range`);
  }
  return grown as Cents;
};

/**
 * One month's growth on one Person's Non-Super Portfolio, parcel by parcel.
 *
 * **THE RULING, P3-21f chunk 2: a month's return accrues ENTIRELY to `marketValue`, and `costBase`
 * does not move by one cent.** A cost base is what was paid, on the day it was paid. Growth is not
 * a payment, so there is nothing for it to add to the cost base — every cent of it is unrealised
 * gain, and the gain a disposal computes (chunks 4 and 5) is `proceeds − costBase` measured from
 * that untouched figure.
 *
 * ⚠️ **THE TRAP THIS RULING EXISTS AGAINST, and it is the P3-21a flavour: growing the cost base
 * alongside the market value makes every gain VANISH while every figure on screen stays plausible.**
 * A parcel whose cost base tracks its value has a gain that never grows, so the household's CGT bill
 * shrinks toward zero across a forty-year walk with no exception, no mismatch, and no line to
 * notice. It flatters the household, which is the direction this build is organised against. **It is
 * also invisible to the byte-identical fixtures** — no cost base reaches a `Month` field before
 * chunk 4, so the digests pass unchanged under exactly that mutation. It is defended instead by
 * dollar assertions in `test/core-parcel-growth.test.mjs`, which pin the cost base as a FIGURE after
 * a year of growth, not as a shape.
 *
 * **The write is field by field rather than a spread, and that is deliberate.** `{ ...parcel,
 * marketValue }` would carry a cost base by accident; naming all three says that exactly one of them
 * moves. A new REQUIRED field is a compile error here rather than a silent drop; an OPTIONAL one is
 * not, which is why `valueJustBefore1July2027` is carried by name and pinned by a test (LR-1 M10).
 *
 * **The flooring residue, and the direction is SETTLED (chunk 2).** For a Person holding ONE parcel
 * this is the same call on the same figure as the scalar it replaced: `grownForOneMonth` on the
 * pool. For several, the floor falls once per parcel rather than once on the total, so the pool
 * comes out `⌊f·Σvᵢ⌋ − Σ⌊vᵢf⌋` lower than the scalar would have. **That difference is never
 * negative and it is bounded by one cent short of the parcel count.** Each term loses under a cent
 * to its own floor, and `Σ⌊vᵢf⌋` is an integer no greater than `f·Σvᵢ`, hence no greater than
 * `⌊f·Σvᵢ⌋` — so `0 ≤ ⌊f·Σvᵢ⌋ − Σ⌊vᵢf⌋ ≤ n − 1` cents per month, for every `f ≥ 0` and every split.
 * Magnitude: $100,000 in three parcels is **2 cents** a month behind the same money in one.
 * **Direction: UNDER-states the household**, the same safe direction `grownForOneMonth`'s own floor
 * runs in, and this build takes the understating side every time. It is accepted here rather than
 * corrected — a redistribution of the lost cents across parcels would be a rule about which parcel
 * gets a cent it did not earn, and that rule would then be visible in a disposal's cost base
 * comparison. It is pinned as a figure and swept for direction in `test/core-parcel-growth.test.mjs`
 * rather than left to be discovered.
 */
export const parcelsGrownForOneMonth = (parcels: readonly Parcel[], nominalReturn: number): readonly Parcel[] =>
  Object.freeze(
    parcels.map((parcel) =>
      Object.freeze({
        acquired: parcel.acquired,
        costBase: parcel.costBase,
        marketValue: grownForOneMonth(parcel.marketValue, nominalReturn),
        ...(parcel.valueJustBefore1July2027 === undefined ? {} : { valueJustBefore1July2027: parcel.valueJustBefore1July2027 }),
        ...(parcel.reinvestedFromJuly2027 === undefined ? {} : { reinvestedFromJuly2027: parcel.reinvestedFromJuly2027 }),
      }),
    ),
  );

/**
 * **THE YEAR'S DISTRIBUTION OFF ONE PERSON'S HOLDING — P3-22h step 2.** `payoutRate × the parcels'
 * own market value`, on the SAME rate-to-pool relationship `Settings.nominalReturn` already has to
 * this holding, and computed on the value the pool opens the month with — before this SAME month's
 * `parcelsGrownForOneMonth`, on the fee convention already ruled for super (`monthlySuperFeesForOneMonth`'s
 * doc): a rate must not be charged, or in this case paid, on a return it has not yet earned. Since
 * the distribution moves no `marketValue` (see `parcelsAfterDistribution`), the two operations do
 * not interact and this could equally be computed after growth; before is chosen only because it is
 * the SAME base every other once-a-month rate in this walk reads.
 *
 * **`Math.floor`, not `mulCents`'s half-away-from-zero — `grownForOneMonth`'s own convention**, kept
 * for the same reason: this is a rate applied to a balance, not a rounding of a figure already
 * fixed, and every such application in this file floors rather than rounds. Nil where the holding is
 * empty or worth nothing, so a Person with no parcels pays nothing and owes nothing — never a
 * negative distribution from a negative rate, because `investmentPayoutRate` has no ceiling but no
 * floor below nil either (P3-22h step 1, `parsePlan.ts`'s refusal on a nil-or-negative rate).
 */
export const distributionFromPortfolio = (parcels: readonly Parcel[], payoutRate: number): Cents => {
  if (!Number.isFinite(payoutRate) || payoutRate < 0) {
    throw new RangeError(`not a payout rate: ${payoutRate}`);
  }
  const totalMarketValue = parcels.reduce((sum, parcel) => sum + parcel.marketValue, 0);
  if (totalMarketValue <= 0) return toCents(0);
  return Math.floor(totalMarketValue * payoutRate) as Cents;
};

/**
 * **THE YEAR'S INCOME SHARE OFF ONE SUPER INTEREST'S BALANCE — P3-42 step 2.**
 * `Settings.superIncomeYieldRate × balance`, on `distributionFromPortfolio`'s own precedent and for
 * the same reason: this is a RATE applied to a balance the walk already holds, not a rounding of a
 * figure already fixed, so it FLOORS rather than rounds half away from zero (`mulCents`'s own
 * convention is deliberately not used here). Nil where the balance is nil or negative, and never a
 * negative income share from a negative rate — `parsePlan.ts` already refuses a nil-or-negative
 * `superIncomeYieldRate` at the door, so this function's own guard is the same defence
 * `distributionFromPortfolio` carries for a caller who bypasses it.
 */
export const superIncomeYieldFor = (balance: Cents, incomeYieldRate: number): Cents => {
  if (!Number.isFinite(incomeYieldRate) || incomeYieldRate < 0) {
    throw new RangeError(`not an income-yield rate: ${incomeYieldRate}`);
  }
  if (balance <= 0) return toCents(0);
  return Math.floor(balance * incomeYieldRate) as Cents;
};

/**
 * **THE REINVESTMENT — P3-22h step 2, and the ruling is that it moves `costBase` and NOTHING else**
 * — or, after the CGT reform start, `reinvestedFromJuly2027` in its place (LR-1, see the body).
 *
 * A real reinvested distribution drops the holding's market value by the distribution (the
 * ex-distribution fall) and buys new units back with it at once, so the ROUND TRIP leaves market
 * value exactly where it was and raises the cost base by what was reinvested — see P3-22h's own
 * ruling, "nothing about spending capacity changes". This function applies only the net of that
 * round trip: `marketValue` is untouched to the cent on every parcel, and the distribution is added
 * to `costBase`, split across the Person's held parcels in proportion to each parcel's OWN market
 * value — the same split every unit of a pooled fund receives, because a distribution is paid per
 * unit and not per parcel. `acquired` is untouched: this is not a new acquisition, it is the SAME
 * holding costing more than it did, and a parcel's own discount eligibility is unaffected by it.
 *
 * **The remainder is put on the LAST parcel**, on `parcelsGrownForOneMonth`'s own flooring-residue
 * precedent: the BigInt split can lose at most `parcels.length − 1` cents to rounding, and putting
 * the whole of that residue on one named parcel is simpler than a rule for spreading a few cents
 * further and no less arbitrary than any other place to put it.
 */
export const parcelsAfterDistribution = (parcels: readonly Parcel[], distribution: Cents): readonly Parcel[] => {
  if (distribution <= 0) return parcels;
  const totalMarketValue = parcels.reduce((sum, parcel) => sum + parcel.marketValue, 0);
  if (totalMarketValue <= 0) return parcels;
  const lastIndex = parcels.length - 1;
  let allocated = 0;
  return Object.freeze(
    parcels.map((parcel, index) => {
      const share = (
        index === lastIndex
          ? distribution - allocated
          : Number((BigInt(distribution) * BigInt(parcel.marketValue)) / BigInt(totalMarketValue))
      ) as Cents;
      allocated += share;
      // LR-1: a parcel stamped at 1 July 2027, or acquired on or after it, is reinvesting after the
      // reform start. That money is cost base of the part from 1 July 2027, so it goes to
      // `reinvestedFromJuly2027` and not to `costBase`, where it would lower the deferred gain.
      const afterReform = parcel.valueJustBefore1July2027 !== undefined || parcel.acquired >= CGT_REFORM_START;
      return Object.freeze({
        acquired: parcel.acquired,
        costBase: (afterReform ? parcel.costBase : parcel.costBase + share) as Cents,
        marketValue: parcel.marketValue,
        ...(parcel.valueJustBefore1July2027 === undefined ? {} : { valueJustBefore1July2027: parcel.valueJustBefore1July2027 }),
        ...(afterReform ? { reinvestedFromJuly2027: ((parcel.reinvestedFromJuly2027 ?? 0) + share) as Cents } : {}),
      });
    }),
  );
};

/**
 * One Person's moving balances, in that Person's own order.
 *
 * **Which balances are here is the whole of the ruling, so both halves are written out.**
 *
 * **GROWS — `SuperInterest.balance`.** Superannuation is invested money and `nominalReturn` is the
 * investment return. It grows in EVERY phase and on BOTH sides of the means-test split: the
 * younger-partner exemption (T27) is a statement about what the Age Pension may assess, not about
 * whether the money earns, so Accumulation Phase super held by a Person under Age Pension age grows
 * exactly as an Account-Based Pension does. That is why `protectedAssets` moves as well as
 * `assessableAssets`, and it is asserted as a figure.
 *
 * **GROWS — `Person.parcels`.** ADR-0009's Non-Super Portfolio: *"financial investments outside
 * superannuation"*, deemed for the income test. Invested money, same rate. It was a scalar until
 * P3-21f chunk 1 and is now the parcels the scalar is derived from — see `parcelsGrownForOneMonth`,
 * and read the ⚠️ there before touching it: **chunk 2 owns the growth ruling**, and chunk 1 is only
 * keeping the pool moving at the figure it already moved at.
 *
 * **DOES NOT GROW — `Person.workBonusBalance`.** It is not an investment and not a pool of money:
 * it is an accrued income-test concession measured in dollars, and §4.6 already says exactly how it
 * moves — $300 a fortnight banked, drawn down by employment income, capped at $11,800. That is
 * growth **already modelled elsewhere**, in `applyWorkBonus`, and a second rate applied to it here
 * would be one concept moving under two rules. (It is observable: the balance reaches the income
 * test through `WorkBonusResult.fromBalance`, so a rate applied to it would shift an entitlement.)
 * **It does not grow, and since P4-10 it IS carried** — under §4.6's rule and no other, in
 * `workBonusBalanceAfterMonth`. "Already modelled elsewhere" was true of the arithmetic and false of
 * the walk: until 2026-09-19 `applyWorkBonus` was handed the Day-1 stated figure every month and
 * `balanceAfter` was thrown away, so a balance was neither grown NOR spent. See the field below.
 *
 * **DOES NOT GROW — the Offset Account, i.e. `Month.openingBalance` / `closingBalance`. AND THE
 * REASON IT DOES NOT IS NOW THE RIGHT ONE (P3-16 slice 1, 2026-09-21).** The text that stood here
 * gave two reasons. The FIRST — *"this model holds no mortgage balance and no mortgage rate"* — is
 * SUPERSEDED: `Household.mortgage` holds all three figures, and the walk prices a month of the loan
 * every tick. The SECOND still stands and is now the whole of it: chunk 4's contract is
 * `closingBalance = openingBalance + Σinflow − Σoutflow`, asserted every month of every fixture, and
 * interest CREDITED to the offset without a `MonthLine` would break it.
 *
 * **What an offset account actually does, and this build now does it.** A dollar in an offset does
 * not earn the mortgage rate as income — it CANCELS the mortgage rate as a charge, which is the
 * whole of concept.md §5.12 and the reason the Offset is drawn last. `mortgageMonth` charges
 * interest on `max(0, balance − offset)`, so the offset is READ to size the charge and nothing is
 * paid into it. The household is better off by exactly the interest it was not charged, and that
 * shows up as a smaller `MORTGAGE_INTEREST_LINE` rather than as a bigger balance.
 *
 * ~~**So the residual this note used to declare is CLOSED, and only its converse remains.** A
 * household with an offset and no mortgage … still earns nothing on it … **Direction: that
 * UNDER-states such a household**.~~ **CLOSED TOO (2026-09-23): the cash above the loan EARNS
 * INTEREST, as a line.** `Settings.cashInterestRate` (absent: the plan's own CPI) is paid on
 * `max(0, cash − loan owing)` — the mirror of `mortgageMonth`'s `max(0, balance − offset)`, so each
 * dollar either cancels loan interest or earns this rate and never both, and nothing jumps at
 * payoff. It is still not GROWTH: it arrives as a `CASH_INTEREST_LINE` cash inflow per owner
 * (`Household.offsetShares`), so the ledger contract above holds exactly, and it is taxed through
 * the same assessment as salary.
 *
 * **DOES NOT GROW — the home.** ADR-0005: it carries no value anywhere in this model, so there is
 * nothing to apply a rate to. An absence, not a rule.
 */
export interface PersonBalances {
  /** One per `Person.superInterests` entry, in the same order. The lengths must match. */
  readonly superInterestBalances: readonly Cents[];
  /**
   * This Person's Non-Super Portfolio, carried as the parcels themselves and NOT as a total.
   *
   * The walk has to carry what the Household is made of, not a summary of it: `withBalances` builds
   * a real `Person` out of this, and a `Person` holds parcels. Carrying a scalar here would mean
   * inventing parcels to put it back into — a rule about how a total spreads across parcels, made
   * by the balance carrier, where nobody would ever look for it.
   */
  readonly parcels: readonly Parcel[];
  /**
   * **This Person's Work Bonus balance, as at the month this is carried into (P4-10).**
   *
   * The fourth carried balance and the last of the stale-static-balance family: super interests and
   * parcels were fixed in chunk 5a, the Offset in P4-3b, and this one was still the Day-1 stated
   * figure in month 575. It moves under §4.6 alone — $300 a fortnight banked, drawn down by
   * employment income, capped at $11,800 — and `applyWorkBonus` is the only thing that moves it.
   */
  readonly workBonusBalance: Cents;
}

/**
 * A `Household` identical to `household` except that its balances are the ones carried in
 * `balances` and `offsetBalance`, and its employment income is the walk's IN-FORCE figure.
 * Everything else — names, dates of birth, stated stream settings, the home status — is copied
 * through unchanged.
 *
 * **`phase` is the SIXTH substitution, and it is OPTIONAL (P3-8's conversion limb, wired
 * 2026-09-22).** Absent, it is copied through unchanged exactly as it always was — every existing
 * caller of this function, direct or through a fixture, is unaffected to the byte. Supplied, a
 * TTR interest reads whichever phase `effectivePhase` resolves for it, which is how `splitAssets`
 * (called on the Household this function returns, never edited itself) comes to state the correct
 * means-test reason for an interest that has converted, and how `accessibleWealthByPerson` comes
 * to gate on the correct phase too — both without either module reading a conversion day itself.
 *

 * **The Work Bonus balance is the FIFTH substitution (P4-10), and it used to be in that list.** It
 * was copied through unchanged, which is exactly what made it stale: the means test read the Day-1
 * stated figure in every month of the walk, so a balance was never depleted by the wage it was
 * sheltering and never credited with the accrual a Person who stopped work had banked. It arrives
 * on `PersonBalances` rather than as a sixth parameter because it is a balance and it is carried
 * from month to month, which is what that type is for.
 *
 * **`employmentIncomePerFortnight` is the fourth substitution and it is REQUIRED (P4-8).** It is
 * not a balance, and it is here for exactly the reason the Offset is: this `Household` is what the
 * means test is assessed on, and a spread of `...person` carries the Day-1 STATED salary into
 * month 575 whatever the Journal says. That was the live defect — `applyWorkBonus` reads
 * `Person.employmentIncomePerFortnight` raw, so a Person who retired in 2030 went on being
 * assessed on their working wage for the next thirty years, and their pension came out too low.
 * The walk already knows the in-force figure (`RETIRE` and a zero-day `WORK_PATTERN_CHANGE` drive
 * it to nil, a stated `annualSalary` replaces it); this is the one channel by which it arrives.
 * Required rather than optional so that a caller cannot forget it and be handed the stale wage
 * silently — the same reasoning, and the same failure, as `offsetBalance`.
 *
 * **`offsetBalance` is the third balance and it is REQUIRED (P4-3b).** `Household.openingOffsetBalance`
 * is the figure the walk OPENED with; the means test must see the figure the Household holds NOW, and
 * a spread of `...household` would carry the Day-1 figure into month 575 — the stale-static-balance
 * defect chunk 5a fixed for parcels and super, reintroduced through the one pool it did not cover.
 * It is a required parameter rather than an optional one precisely so that a caller cannot forget
 * it and be handed the stale figure silently.
 *
 * **This is what makes the walk reuse `splitAssets` VERBATIM.** The alternative was a second
 * asset-splitting function taking a month and a balance table, and that is the "one concept, two
 * incompatible types" failure `household.ts`'s own header names — one register row, two spellings,
 * nothing to say which is meant. There is exactly one `AssetSplit` and one function that produces
 * it; this substitutes the operand rather than forking the operation.
 *
 * Pure: it builds a new frozen `Household` and mutates nothing it is given.
 */
export const withBalances = (
  household: Household,
  balances: readonly PersonBalances[],
  offsetBalance: Cents,
  employmentIncomePerFortnight: readonly Cents[],
  effectivePhase?: (personIndex: number, slot: number) => SuperInterest['phase'],
  switchedOn?: (personIndex: number, slot: number) => IsoDate | undefined,
): Household => {
  const substituted = household.persons.map((person, index): Person => {
    const held = balances[index];
    if (held === undefined) throw new RangeError(`no carried balances for person ${index} (${person.name})`);
    const inForceIncome = employmentIncomePerFortnight[index];
    if (inForceIncome === undefined) {
      throw new RangeError(`no in-force employment income for person ${index} (${person.name})`);
    }
    if (held.workBonusBalance === undefined) {
      throw new RangeError(`no carried Work Bonus balance for person ${index} (${person.name})`);
    }
    if (held.superInterestBalances.length !== person.superInterests.length) {
      throw new RangeError(
        `${person.name} holds ${person.superInterests.length} superannuation interests but ${held.superInterestBalances.length} balances were carried`,
      );
    }
    return Object.freeze({
      ...person,
      employmentIncomePerFortnight: inForceIncome,
      workBonusBalance: held.workBonusBalance,
      parcels: held.parcels,
      superInterests: Object.freeze(
        person.superInterests.map((interest, slot) =>
          Object.freeze({
            ...interest,
            balance: held.superInterestBalances[slot] as Cents,
            ...(effectivePhase === undefined ? {} : { phase: effectivePhase(index, slot) }),
            // An account that switched at retirement commenced its pension on the switch day, and
            // that is the day it carries from then on — so the Household says what the walk knows.
            ...((day) => (day === undefined ? {} : { statedStreamSettings: { ...interest.statedStreamSettings, commencementDay: day } }))(
              switchedOn?.(index, slot),
            ),
          }),
        ),
      ),
    });
  });
  const [personA, personB] = substituted;
  if (personA === undefined) throw new RangeError('a Household has at least one Person');
  // **THE MORTGAGE IS LEFT OUT, AND THE OMISSION IS THE ENFORCEMENT (P3-16 slice 1).**
  //
  // This is the Household the MEANS TEST is assessed on, and the means test may not see a mortgage:
  // `agePension.ts`'s `homeownerWithAMortgage`, sourced to Services Australia, is that an
  // owner-occupier with a mortgage is a homeowner and the debt is netted only against the asset it
  // secures — which is itself exempt — so mortgage debt is NOT deductible from other assets. The
  // asymmetry is deliberate and load-bearing (register T38).
  //
  // Spreading `...household` would carry the field through, and a spread carries the DAY-1 stated
  // balance, so every month of the walk would offer `splitAssets` a figure that is both stale and
  // forbidden — the stale-static-balance defect and a means-test error in one field. The walk
  // carries its own running balance in a local; nothing on this path needs one. So the field is
  // absent here rather than substituted, and a future reader inside the means test cannot find a
  // mortgage to net because there is none to find.
  const { mortgage: _mortgageNotInTheMeansTest, ...meansTestFacts } = household;
  return Object.freeze({
    ...meansTestFacts,
    openingOffsetBalance: offsetBalance,
    persons: personB === undefined ? Object.freeze([personA] as const) : Object.freeze([personA, personB] as const),
  });
};

/**
 * **P4-6 — `Month.accessibleAssets`: the money this Household could actually SPEND, on `date`.**
 *
 * concept.md §1's contingency floor is *"$100k, configurable"* held back *"for late-life costs"*
 * (§§53-55) — *"a floor the balance never crosses"*. The user ruled on 2026-09-18 that the balance
 * the floor is measured against is **REACHABLE MONEY, not total wealth**, and paid a `Month`
 * widening for it. The free alternative was `protectedAssets + assessableAssets`, and it was refused
 * because it fails in the FLATTERING direction: a 58-year-old with $900,000 of preserved super and
 * $9,000 in the bank clears a $100,000 floor on that reading while being unable to spend a cent of
 * the $900,000 on a new roof. This engine's standing rule is to fail toward understatement.
 *
 * **What is IN, and which module decided it.**
 *
 *   * **The Offset Account** — `household.openingOffsetBalance`, which inside the walk is the
 *     month's own running cash, and which Waterfall limb 4 already spends.
 *   * **The Non-Super Portfolio** — `financialAssets(person)`, the same derivation the means test
 *     and limb 3 read, so a parcel cannot be reachable here and unreachable there.
 *   * **Superannuation a Condition of Release has reached.** The decision is NOT made here:
 *     `conditionOfRelease` in `conditionOfRelease.ts` decides it and `benefitAccess` is the gate,
 *     exactly as `superPhase.ts` uses them. No age comparison is written in this function, and none
 *     can be: `benefitAccess` takes a `ConditionOfRelease` and nothing else, and the branded figure
 *     can only come from `conditionOfRelease`.
 *   * **An Account-Based Pension, unconditionally.** A retirement-phase income stream exists only
 *     where a benefit was payable — `retirementPhaseInterest` goes through `requireBenefitAccess` —
 *     and this walk's own limb 2 already offers its WHOLE BALANCE to the Waterfall (the 2026-09-17
 *     ruling that Sch 7's minimum is a floor and not a ceiling). Money the engine itself spends
 *     cannot be money the Household cannot reach. Deciding an ABP on the age gate instead would
 *     strip the pension of a 58-year-old retired on permanent incapacity, whose stream is real.
 *
 * **What is OUT, and the two residuals, both declared and both in the SAFE direction.**
 *
 *   * **Preserved super is out** — an Accumulation Phase or TTR balance whose owner has met no
 *     Condition of Release. That is the whole point of the figure.
 *   * **RESIDUAL 1 IS DISCHARGED ON ITS OWN STATED GROUND (P4-11, 2026-09-19). THE SUPERSEDED TEXT
 *     IS KEPT BECAUSE ITS SECOND HALF IS STILL LIVE:** *"the employment ground is never made out
 *     here, because this model holds no cessation date. `GainfulEmployment` is a required
 *     discriminated union and the only value this walk can honestly supply is `{ ceased: false }`:
 *     `Person` carries no day on which gainful employment ceased … So the only ground that can fire
 *     is the automatic one — turning the age that releases benefits by itself — and a 62-year-old
 *     who genuinely retired at 61 has their super counted as preserved when it is not. **That
 *     UNDER-states reachable money, which makes a floor breach EARLIER than the truth** … It is not
 *     guessed the other way: inferring a cessation from a `RETIRE` entry would also make
 *     `CessationBeforePreservationAgeError` a live refusal inside `project()` for every Household
 *     that retired before Preservation Age, which is a new refusal invented by a marker."*
 *
 *     **The ground was that this function is handed no cessation. It is handed one now, and it is
 *     not a fourth copy of the rule** — `gainfulEmploymentFor` below is `project()`'s own
 *     `gainfulEmploymentAsAt`, the ONE expression the `LUMP_SUM_FROM_SUPER` entry path and
 *     Waterfall limb 5 already read. The defect that forced it was the one the old text called
 *     merely conservative: limb 5 asks the real cessation day and SPENDS a released accumulation
 *     balance, so this figure was reporting money unreachable in the very month the engine spent
 *     it — two answers to one question, which is worse than a cautious answer.
 *
 *     **The refusal the old text feared is real and is CAUGHT, not invented and not resolved.**
 *     `CessationBeforePreservationAgeError` is now reachable here for a Household that retired
 *     before Preservation Age and is in the 60–64 window; it is caught exactly where `lumpSumGate`
 *     catches it for limb 5, the interest is left OUT, and nothing new is refused by name. A
 *     reported figure may not take a chart down, and it may not decide what `conditionOfRelease`
 *     declined to decide. The direction of the catch is the old conservative one.
 *
 *     ⚠️ **WHAT IS LEFT OF IT: the walk still knows only what an ENTRY told it.** A Person who
 *     retired before the walk with no `RETIRE` entry at all is still `{ ceased: false }` here, and
 *     their super is still counted as preserved until the automatic ground fires. That residue is
 *     the same in all three readers — the engine has one cessation fact and it is the entry's —
 *     so it can no longer put two figures out of step with each other, only all three out of step
 *     with a household that did not say it had retired. Still the safe direction.
 *   * **RESIDUAL 2 IS DISCHARGED ON ITS OWN STATED GROUND (2026-09-19), AND WHAT IS LEFT IS
 *     NARROWER THAN IT WAS.** The ground was that *"no limb draws an Accumulation Phase balance"*,
 *     so a released account raised this figure and funded no month of the Waterfall by itself.
 *     **Waterfall limb 5 now draws it** — last, after the Offset, through the same
 *     `conditionOfRelease` gate this function uses — so an `Unfunded shortfall` beside a released
 *     balance is no longer a state this engine can produce, and `accessibleAssets` and the walk
 *     agree about that money at last.
 *
 *     ⚠️ **The two are still not the same set, and the remainder is stated rather than quietly
 *     dropped — but it is ONE difference now, not two.** This figure counts a released TTR balance
 *     and limb 5 does not sweep one (a TRIS has a maximum as well as a minimum, and an automatic
 *     draw cannot honour a ceiling nobody stated), so for a TRIS this figure is the LARGER of the
 *     two. The second difference is gone: the superseded text read *"this figure is computed with
 *     `{ ceased: false }` under residual 1 while limb 5 is given the walk's real `RETIRE` date, so
 *     a household retired at 63 has MORE reachable in the Waterfall than here"*, and P4-11 closed
 *     exactly that — the two read one `gainfulEmploymentAsAt` and cannot answer differently about
 *     a cessation. What is left is a difference of PHASE, which is a statement about what an
 *     automatic draw may safely do and not about what the household can reach.
 *
 * Pure, and it reads balances only: hand it the Household as at the month's CLOSE and it answers for
 * the close, which is what `project()` does.
 */
export const accessibleWealth = (
  household: Household,
  date: IsoDate,
  /**
   * **The walk's cessation fact, per Person, HANDED IN — residual 1's discharge and the whole of
   * P4-11.** Required and undefaulted: a default here would be the fourth copy of the rule this
   * fix exists to prevent. `project()` passes its own `gainfulEmploymentAsAt`, the same expression
   * the `LUMP_SUM_FROM_SUPER` entry path and Waterfall limb 5 read, so the three readers cannot
   * answer differently about the same Person on the same day.
   */
  gainfulEmploymentFor: (personIndex: number) => GainfulEmployment,
  /**
   * **RF-1: a Person back at work after a stop that freed their super reaches a fixed part of each
   * account, not none of it.** `project()` passes the same released amount the entry path and limb 5
   * are capped to; `undefined` where nothing is released that way.
   */
  releasedWhileBackAtWorkFor: (personIndex: number, slot: number) => Cents | undefined,
): Cents =>
  // **The Household figure is the per-Person figures plus the shared Offset, and it is nothing else
  // (P7-6).** The rule — which super a Condition of Release has reached — is written once, below.
  // The Offset is added HERE and only here, because it is a Household account under P4-3b and no
  // Person owns a share of it.
  accessibleWealthByPerson(household, date, gainfulEmploymentFor, releasedWhileBackAtWorkFor).reduce<Cents>(
    (sum, own) => addCents(sum, own),
    household.openingOffsetBalance ?? toCents(0),
  );

/**
 * **`accessibleWealth`, per Person and WITHOUT the Offset Account (P7-6).** `[i]` is the reachable
 * wealth of `household.persons[i]`, positionally — the Non-Super Portfolio plus whatever super that
 * Person can lawfully reach on `date`.
 *
 * Every word of `accessibleWealth`'s doc above applies to it, because this IS that function: the
 * Household figure is this array summed onto the Offset, so the two cannot answer differently about
 * a cessation, a phase or a balance.
 *
 * **The Offset is deliberately absent.** It belongs to the Household, not to a Person, and it is
 * already reported on every `Month` as `openingBalance` / `closingBalance`. Splitting it across the
 * couple would answer an ownership question the user was never asked.
 *
 * Reads balances only: hand it the Household as at the month's CLOSE and it answers for the close.
 */
export const accessibleWealthByPerson = (
  household: Household,
  date: IsoDate,
  gainfulEmploymentFor: (personIndex: number) => GainfulEmployment,
  releasedWhileBackAtWorkFor: (personIndex: number, slot: number) => Cents | undefined,
): readonly Cents[] => {
  assertIsoDate(date);
  return household.persons.map((person, personIndex) => {
    let total: Cents = financialAssets(person);
    // The gate, per Person and per month — never an age, and never a phase standing in for one.
    let released: boolean;
    try {
      released = benefitAccess(
        conditionOfRelease({
          dateOfBirth: person.dateOfBirth,
          on: date,
          gainfulEmployment: gainfulEmploymentFor(personIndex),
        }),
      ).accessible;
    } catch (refusal) {
      // **The one refusal a real cessation puts in this figure's path, caught exactly as limb 5
      // catches it** (`lumpSumGate`): a Person who ceased before Preservation Age and is now 60–64
      // is a state `conditionOfRelease` declines to resolve. A REPORTED figure may not take the
      // chart down over it, and it may not resolve what that module refused to, so the interest is
      // left OUT — the conservative reading, and the same nil limb 5 offers on the same facts.
      if (!(refusal instanceof CessationBeforePreservationAgeError)) throw refusal;
      released = false;
    }
    person.superInterests.forEach((interest, slot) => {
      if (interest.phase === 'accountBasedPension' || released) {
        total = addCents(total, interest.balance);
        return;
      }
      const inPart = releasedWhileBackAtWorkFor(personIndex, slot);
      if (inPart !== undefined) total = addCents(total, Math.min(inPart, interest.balance) as Cents);
    });
    return total;
  });
};

// --- Chunk 5b: the Account-Based Pension minimum, and the first balance that FALLS ---------------

/**
 * **THE INTRA-MONTH ORDER, and it lives here and nowhere else: DRAWDOWN FIRST, THEN GROWTH.**
 *
 * Within a month the payment comes out, and only what remains earns that month's return. Every
 * super balance in the walk moves through this function once per tick, so there is exactly one
 * place the order can be got wrong and exactly one place to change it.
 *
 * **It is a DECLARED CONVENTION, not a discovered fact, and the user ruled it on 2026-09-17.** The
 * truth is a bracket this engine cannot reach: a real pension payment lands on a day, and the
 * balance earns for the days before it and not for the days after. The engine has no day-level
 * calendar — the tick is a month and `firstDayOf` is the only day it names — so it must pick an end
 * of the bracket. The two ends are:
 *
 *   * **drawdown then growth** (this one): the whole month's return is earned on the POST-payment
 *     balance, as though the payment were made on the first of the month;
 *   * *growth then drawdown*: the whole month's return is earned on the PRE-payment balance, as
 *     though the payment were made on the last day.
 *
 * **This is the conservative end, and it SLIGHTLY UNDER-STATES a real household's balance.** A real
 * household paid mid-month earns a part-month's return on the money it still held, and this model
 * credits it none. The size is one month's growth on the payment: at 6.5% and a $40,000 annual
 * minimum drawn evenly, about $17 a month of foregone return, under a fifth of a percent of the
 * payment. It runs the safe way — a smaller balance is a smaller pension next year, an earlier
 * Shortfall Age, and never a plan that lasts longer than it should.
 *
 * Refuses a draw larger than the balance rather than returning a negative one: a pension cannot pay
 * out money the account does not hold, and the caller floors the draw at the balance before it gets
 * here. A negative balance flowing on would be an unstated loan inside a superannuation fund.
 */
export const balanceAfterDrawdownAndGrowth = (balance: Cents, drawn: Cents, nominalReturn: number): Cents => {
  if (!Number.isSafeInteger(balance) || balance < 0) {
    throw new RangeError(`not a balance in whole cents: ${balance}`);
  }
  if (!Number.isSafeInteger(drawn) || drawn < 0) {
    throw new RangeError(`not a drawdown in whole cents: ${drawn}`);
  }
  if (drawn > balance) {
    throw new RangeError(`a drawdown of ${drawn} cents cannot be paid from a balance of ${balance} cents`);
  }
  return grownForOneMonth((balance - drawn) as Cents, nominalReturn);
};

/**
 * One month's fees on one superannuation interest, itemised — the two figures the two fee lines
 * carry and the two figures the balance falls by. There is no third member and no total: a total
 * would be a second spelling of `administration + investment` and the call site needs the parts.
 */
export interface MonthlySuperFees {
  /** The flat annual charge's twelfth PLUS the administration percentage, as one figure. */
  readonly administration: Cents;
  /** The investment percentage. */
  readonly investment: Cents;
}

/** No fee at all, shared rather than rebuilt: the answer for every interest that states none. */
const NO_SUPER_FEES: MonthlySuperFees = Object.freeze({ administration: toCents(0), investment: toCents(0) });

/**
 * **ONE MONTH'S FEES ON ONE SUPERANNUATION INTEREST — P3-17 slice 1, and every ruling it takes is
 * here rather than at the call site.**
 *
 * `base` is the balance the fee is charged on, supplied by the caller and NOT defaulted. Five
 * decisions are taken in this function and each is written out below.
 *
 * ---
 *
 * **1. WHICH BALANCE — `base` is the POST-DRAWDOWN, PRE-GROWTH balance, and it is the SAME figure
 * growth is then applied to.** The caller passes `balance − drawn`, once, and hands the same number
 * to this function and to `balanceAfterDrawdownAndGrowth`. Both percentages use it; the admin % and
 * the investment % are never charged on two different bases, which is design point 5's consistency
 * requirement met by there being only one figure to be consistent about.
 *
 * *Why not the OPENING balance.* `balanceAfterDrawdownAndGrowth` already rules that the month's
 * pension payment is treated as made on the first of the month — *"as though the payment were made
 * on the first"* — so the money the fund holds for this month is the post-payment figure. Charging a
 * percentage on the opening balance would charge a fee on money the fund did not hold, which is not
 * a conservative reading, it is a different (and wrong) one. Direction, stated rather than left to
 * be discovered: this gives a SMALLER fee than the opening-balance reading, by one month's rate on
 * the payment — at 0.5% a year on a $40,000 annual drawdown, about **14 cents a month**. That is the
 * flattering direction and it is accepted here because the ordering it follows is already ruled;
 * the conservative-direction rule (point 2 below) governs where nothing else settles the question,
 * and here something does.
 *
 * **2. THE FEE COMES OFF BEFORE GROWTH IS APPLIED, so the fee does not itself earn a return.** The
 * caller enforces this by handing `drawn + administration + investment` to
 * `balanceAfterDrawdownAndGrowth`, which subtracts and only then grows. Real funds deduct fees
 * through the month and the money charged earns a part-month somewhere; this build credits it none.
 * *Why this end of the bracket:* ADR-0009's named failure mode is a model that flatters the
 * Household, and of the two defensible orderings this is the one that produces the SMALLER balance —
 * a smaller balance is a smaller pension next year, an earlier Shortfall Age, and never a plan that
 * lasts longer than it should. It is the same choice, for the same reason, that
 * `balanceAfterDrawdownAndGrowth` makes about the drawdown.
 *
 * **3. A TWELFTH, ARITHMETIC — `rate / 12` and NEVER `(1 + rate)^(1/12) − 1`.** `monthlyGrowthFactor`
 * uses the geometric twelfth because a RETURN compounds: a fund that earns 6.5% over a year earns it
 * on its own accumulating earnings. A FEE is not a return, it is a periodic charge, and a fund
 * quoting 0.25% a year deducts a pro-rata slice each period rather than compounding one. Direction,
 * since the two differ: `rate / 12` is strictly LARGER than the geometric twelfth for any positive
 * rate, so this reading charges slightly MORE — the non-flattering side, which is where this build
 * takes its residuals.
 *
 * **4. THE ROUNDING IS UP, PER COMPONENT, and it is `monthlySpendFromAnnual`'s rule rather than
 * `monthlyFromAnnual`'s.** A fee is an OUTFLOW measured against the household, exactly as a spending
 * level is, so the sub-cent residual is pointed AT the Household: `Math.ceil`. The three components
 * — the flat twelfth, the admin percentage, the investment percentage — are each ceiled on their
 * OWN figure rather than summed and ceiled once, because each is a separately stated user figure
 * whose monthly expression a reader must be able to reproduce from the one number they typed. The
 * cost is bounded and stated: at most **2 cents a month** more than a single ceil on the total, and
 * it makes the three-fees-together fixture exactly the sum of the three one-fee fixtures.
 *
 * **5. THE FEE CANNOT EXCEED THE BALANCE, and the cap is ordered rather than pro-rated.** An account
 * cannot pay out money it does not hold, and `balanceAfterDrawdownAndGrowth` would throw on a
 * deduction larger than the balance. So the administration fee is capped at `base`, and the
 * investment fee at whatever is left after it — the order a fund's own ledger imposes, one charge
 * after another. A PRO-RATA split of the shortfall was the alternative and is rejected: it would be
 * a rule about which fee goes unpaid, invented here, visible only in a degenerate month. The cap
 * binds only on an account worth less than a year's fees, and it drives the balance to nil rather
 * than negative, which is the honest outcome.
 *
 * ---
 *
 * **ABSENT IS NIL AND NIL EMITS NOTHING.** Every field is optional on `SuperInterest` and none is
 * defaulted to anything but zero; the caller emits no line for a nil component, so an interest
 * stating no fee is byte-identical to one written before this field existed. That is the acceptance
 * criterion P3-17 slice 1 was built against.
 *
 * ---
 *
 * **6. THE DOLLAR FEE IS A REAL FIGURE AND ARRIVES ALREADY RAISED TO THE MONTH'S PRICE LEVEL —
 * register O87, user ruling of 2026-09-21, on O85's own standing principle (*"as we agreed earlier
 * we'd always reflect cpi impacts"*).**
 *
 * A fund's dollar administration fee is a STATED PRICE FOR A SERVICE, charged every year for as
 * long as the forecast runs — `annualSpend`'s exact shape and not `Mortgage.monthlyRepayment`'s.
 * Held flat in nominal cents, as it was until that ruling, the household was modelled paying less
 * and less in real terms every year: about a fifth of the stated fee gone over ten years and a
 * third over forty. **That UNDERSTATES a cost and therefore FLATTERS the plan**, which is the
 * direction O85 was fixed for.
 *
 * **`raisedByWages`/`raisedByCpi` are how it gets here, and each is a LENS rather than a figure or a
 * date.** The caller supplies `(stated) => inflateStated(stated, awote, asAtDate, month)` and the
 * same with `cpi` — `priceLevel.ts`, the one expression the Contingency Floor and the spending level
 * already share, so there is still no second `(1 + rate) ^ (n / 12)` in this codebase for either
 * series. A lens and not a pre-raised amount because this function must go on being the ONLY reader
 * of `statedAdministrationFeePerYear` and its pension-phase pair: handing in a number would let a
 * caller pass one interest's fee against another interest's balance, and a lens cannot be
 * mismatched. `raisedByWages` is REQUIRED, not optional with an identity default, because a default
 * here would silently restore the flat fee — the very defect this point closes. `raisedByCpi`
 * DEFAULTS TO `raisedByWages` — not to an identity — so that every call written before point 8
 * (below) existed, which passed one lens for one undivided fee, keeps meaning exactly what it did:
 * an accumulation-phase interest never reads the CPI lens at all, so a caller with nothing to say
 * about a pension-phase account may go on passing one.
 *
 * **Raised BEFORE the twelfth is taken**, for `monthlySpendFromAnnual`'s reason: the ceil at the end
 * is the one rounding decision and it must stay the LAST operation, or `mulCents`'s round-to-nearest
 * would sit after it and give the cent back.
 *
 * **The PERCENTAGE limbs are untouched and must stay untouched.** A share of the balance indexes
 * itself: the balance is in the month's own nominal dollars already, so `base × rate / 12` rises
 * with the account without anybody applying a factor to it. Raising the rate as well would be
 * counting the price level twice. Only the DOLLAR limb is a stated figure in today's money.
 *
 * ---
 *
 * **7. THE PERCENTAGE ADMIN FEE MAY BE CAPPED, PER YEAR — P3-17 slice 3.** `statedAdministration-
 * FeeCapPerYear` caps the ADMIN PERCENTAGE limb alone: the yearly asset-based fee is
 * `min(base × administrationRate, cap)`, and this is that yearly figure — never the flat dollar
 * limb, never the investment fee, which is `household.ts`'s own ground for the field.
 *
 * **HOW A MONTH RESPECTS AN ANNUAL CAP.** A fund's cap is a yearly figure and this walk has no
 * year-boundary accrual — no running year-to-date total is carried from one month to the next, for
 * either fee limb. So the cap is applied the way the dollar limb's annual figure already is:
 * `min(...)` is taken on the ANNUALISED figure — this month's balance × the rate, exactly what a
 * full year would charge if nothing about the account changed — and ONLY THEN is the existing
 * twelfth-and-ceil schedule applied, on `point 3` and `point 4`'s own rules. This is a
 * simplification against a fund that truly accrues and true-ups once a year: a balance that grows
 * through the year will, near the cap, be charged a hair differently than a single end-of-year
 * reconciliation would — but there is no other figure this function could recompute the cap
 * against without inventing a year-boundary this engine does not have, and re-deriving the month's
 * charge from the STATED cap and THAT month's own balance alone is this repo's standing rule for
 * every fee limb here (`inflateStated`'s composability — see the identity test in
 * `test/plan-money-basis-inventory.test.mjs`).
 *
 * **RAISED BY THE SAME LENS AS THE DOLLAR FEE, deliberately** — whichever lens point 8 below has
 * chosen for this month's EFFECTIVE phase, so the cap and the dollar limb of one phase's fee set are
 * never raised two different ways. `household.ts`'s own doc on `statedAdministrationFeeCapPerYear`
 * has the direction argument that used to live here, now CLOSED rather than merely labelled.
 *
 * **ABSENT IS UNCAPPED, and `Math.min` with no second argument is what "uncapped" IS** — there is no
 * second branch here to keep byte-identical to the pre-slice-3 walk, because an absent cap simply
 * never wins the `Math.min` below.
 *
 * ---
 *
 * **8. TWO FEE SETS, ONE PER PHASE — P3-17 slice 4, user-approved 2026-09-25.** `phase` is the
 * interest's EFFECTIVE phase for THIS month (`effectivePhaseFor`, or the interest's own declared
 * `phase` when a caller has nothing more specific — see the trailing default below), and it decides
 * BOTH which three figures are read and which lens raises them.
 *
 * **`phase === 'accountBasedPension'`: the PENSION set, indexed by CPI.** `statedPensionAdministration-
 * FeePerYear`/`Rate`/`CapPerYear` are read FIRST, and any of the three that is absent falls back to
 * its ACCUMULATION twin (`statedAdministrationFeePerYear`/`Rate`/`CapPerYear`) rather than to nil —
 * `household.ts`'s own doc on the pension fields has the full ruling. Aware's own schedule indexes a
 * retirement-phase account's dollar fee and cap by CPI (p.15 of the extract cited there), so
 * `raisedByCpi` is used whichever set actually supplied the figure.
 *
 * **Any other `phase` (`'accumulation'` or `'ttr'`): the ACCUMULATION set, indexed by WAGES.** A TTR
 * is not a retirement-phase account for any purpose this build prices (`household.ts`'s doc on
 * `statedPensionAdministrationFeePerYear` has the citation), so it is charged exactly as an
 * accumulation interest is, through `raisedByWages` — the CPI-for-everything simplification
 * `statedAdministrationFeeCapPerYear`'s doc used to carry is CLOSED by this point, not merely
 * labelled: an accumulation-phase account's dollar fee and cap now rise with the wage series Aware
 * itself indexes them by, rather than with prices.
 *
 * **The investment fee is read from `statedInvestmentFeeRate` regardless of `phase`, and is never
 * indexed either way** — `household.ts`'s doc on `statedPensionAdministrationFeeCapPerYear` has the
 * source for why there is no pension-phase investment fee field: Aware's own disclosure never splits
 * an investment fee by phase.
 *
 * **`phase` DEFAULTS TO `interest.phase`** — the DECLARED literal, not a computed effective one —
 * because that is the one phase this function can always see without a caller reaching into the
 * walk's own conversion-day machinery: an interest declared `'accountBasedPension'` is one from the
 * first month regardless of any conversion, and `effectivePhaseFor` agrees with the declared literal
 * for every interest that has not yet converted. A caller that DOES know a conversion has happened
 * passes the effective phase explicitly (`projection.ts`'s own main loop does); one that does not —
 * every call written before this point existed — gets the SAME answer it always got, because none of
 * those fixtures state a phase that ever converts within the call.
 *
 * ---
 *
 * Refuses a negative rate, a negative flat fee and a negative cap, in EITHER set. A negative fee is a
 * credit and these fields name charges; `parsePlan` refuses all six at the door as well, so a plan
 * file never reaches this throw. The refusal is on the STATED figure, before the lens, so the message
 * quotes the number the user typed rather than a raised one they would not recognise.
 */
export const monthlySuperFeesForOneMonth = (
  base: Cents,
  interest: SuperInterest,
  raisedByWages: (stated: Cents) => Cents,
  raisedByCpi: (stated: Cents) => Cents = raisedByWages,
  phase: SuperInterest['phase'] = interest.phase,
): MonthlySuperFees => {
  if (!Number.isSafeInteger(base) || base < 0) {
    throw new RangeError(`not a balance in whole cents: ${base}`);
  }
  // Point 8: the pension set applies ONLY in retirement phase, and each of its three figures falls
  // back to its accumulation twin rather than to nil — a fund that charges the same figure either
  // side of retirement (or that the user has not told this build otherwise) is stated once.
  const pensionPhase = phase === 'accountBasedPension';
  const raisedToPriceLevel = pensionPhase ? raisedByCpi : raisedByWages;
  const statedFlatPerYear = (pensionPhase ? interest.statedPensionAdministrationFeePerYear : undefined)
    ?? interest.statedAdministrationFeePerYear ?? toCents(0);
  if (!Number.isSafeInteger(statedFlatPerYear) || statedFlatPerYear < 0) {
    throw new RangeError(`not an annual administration fee in whole cents: ${statedFlatPerYear}`);
  }
  // Point 6. A nil fee raises to nil whatever the price level is, so an interest stating none is
  // still byte-identical to one written before this field existed.
  const flatPerYear = raisedToPriceLevel(statedFlatPerYear);
  const administrationRate = (pensionPhase ? interest.statedPensionAdministrationFeeRate : undefined)
    ?? interest.statedAdministrationFeeRate ?? 0;
  const investmentRate = interest.statedInvestmentFeeRate ?? 0;
  if (!Number.isFinite(administrationRate) || administrationRate < 0) {
    throw new RangeError(`not an administration fee rate: ${administrationRate}`);
  }
  if (!Number.isFinite(investmentRate) || investmentRate < 0) {
    throw new RangeError(`not an investment fee rate: ${investmentRate}`);
  }
  const statedCapPerYear = (pensionPhase ? interest.statedPensionAdministrationFeeCapPerYear : undefined)
    ?? interest.statedAdministrationFeeCapPerYear;
  if (statedCapPerYear !== undefined && (!Number.isSafeInteger(statedCapPerYear) || statedCapPerYear < 0)) {
    throw new RangeError(`not an annual administration fee cap in whole cents: ${statedCapPerYear}`);
  }
  // Point 7: the yearly asset-based figure, capped BEFORE the twelfth — the same order the dollar
  // limb's own annual figure is raised in before its twelfth is taken.
  const uncappedAnnualPercentage = base * administrationRate;
  const annualPercentage = statedCapPerYear === undefined
    ? uncappedAnnualPercentage
    : Math.min(uncappedAnnualPercentage, raisedToPriceLevel(statedCapPerYear));
  // Point 4: each component ceiled on its own figure. Point 3: an arithmetic twelfth of the rate.
  const administrationCharged = Math.ceil(flatPerYear / 12) + Math.ceil(annualPercentage / 12);
  // Point 5: ordered, never pro-rated.
  const administration = Math.min(administrationCharged, base);
  const investment = Math.min(Math.ceil((base * investmentRate) / 12), base - administration);
  return Object.freeze({ administration: administration as Cents, investment: investment as Cents });
};

/**
 * **Sch 7 cl 1(2)(b)'s withdrawal benefit at a DECLARED, CAVEATED default — the ordinary APRA fund
 * case, written once, here.**
 *
 * `pensionAccountBalance` requires the figure and never defaults it, deliberately: *"a default would
 * decide that question silently (P3-10 U6)"*. So this is not a silent default — it is the same
 * device `REDUCER_DEDUCTIONS` above is: one named constant-shaped function, at the one call site,
 * standing in for a Setting no caller can state yet, with the case it assumes and the direction of
 * being wrong both written down.
 *
 * **What it assumes:** the case `pensionAccountBalance`'s own doc names — *"for an ordinary
 * account-based pension in an APRA fund it equals the account balance and cl 1(2)(b) is inert"*.
 *
 * **When it is wrong and which way:** cl 1(2)(b) substitutes the withdrawal benefit only where it
 * EXCEEDS the account balance — an unallocated reserve or a surrender value above the account. Using
 * the balance therefore returns a figure that is never larger than the true one, so the minimum is
 * never OVER-stated, so the balance never falls faster than the Schedule requires. A household whose
 * fund genuinely has the two apart has its drawdown, and so its spendable income, UNDER-stated.
 * There is no field on `SuperInterest` for it and `household.ts` is not this chunk's to widen.
 */
const withdrawalBenefitOf = (accountBalance: Cents): Cents => accountBalance;

/**
 * **Sch 7's relevant day for `fy`** — the day the balance is read on and the age is taken at, per
 * cl 1(2)(a): the commencement day in the year the pension commences, 1 July in every other year.
 * `undefined` where the pension has not commenced by the end of `fy`, which is not a nil minimum —
 * it is a year in which there is no pension to determine one for (`PensionNotCommencedError`).
 *
 * Detected with `financialYearContaining`, which is how chunk 3 already finds the walk's financial
 * year. **No dependency is taken on P4-2's settlement machinery**: the year is string arithmetic on
 * a date the month already carries, and the relevant day is one more line of it.
 */
export const schedule7RelevantDay = (fy: FinancialYear, commencementDay: IsoDate): IsoDate | undefined => {
  const commencementYear = financialYearContaining(commencementDay);
  if (compareFinancialYears(commencementYear, fy) > 0) return undefined;
  return commencementYear === fy ? commencementDay : startOfFinancialYear(fy);
};

/**
 * **The whole of `minimumDrawdown.ts`, called — not reimplemented.** One financial year's minimum
 * total payment for one Account-Based Pension, from the balance on the day Sch 7 names.
 *
 * Everything the Schedule decides is decided in that module and nothing is decided here: the band
 * and the age at the relevant day, cl 3's DAY-count pro-rate in a commencement year, cl 4's nil for
 * a stream commencing on or after 1 June, cl 4A/4B's relief, and the single cl 5 rounding to the
 * nearest $10 applied once and last. **The part-year rule is handled INSIDE it** — this call passes
 * a commencement day and a year, never a proportion, a month count or a day count, because that
 * module takes none.
 *
 * `commutedOrRolledOverDuringYear` is stated `false` because nothing in this model can express a
 * commutation or a rollover: `plan.ts` has no entry type that performs one. Passing `true` would be
 * a refusal (`MidYearProportioningError`) over a fact no `Scenario` can carry.
 */
export const annualPensionMinimum = (input: {
  readonly fy: FinancialYear;
  readonly dateOfBirth: IsoDate;
  readonly commencementDay: IsoDate;
  /** The balance on `balanceObservedOn`, whether or not that is the day the Schedule names. */
  readonly balanceOnRelevantDay: Cents;
  readonly relevantDay: IsoDate;
  /**
   * **The day the balance above really is a balance on** — `relevantDay` in every walk that opened
   * it, and the walk's FIRST day where the Schedule's day is behind the forecast (P10-5). Required,
   * never defaulted: a default would let the one substituted input in this calculation be made by
   * omission at a call site, which is the whole thing `PensionBalanceDateError` was written to stop.
   */
  readonly balanceObservedOn: IsoDate;
}): Cents =>
  minimumDrawdown({
    fy: input.fy,
    dateOfBirth: input.dateOfBirth,
    commencementDay: input.commencementDay,
    balance:
      input.balanceObservedOn === input.relevantDay
        ? pensionAccountBalance({
            measuredAt: input.relevantDay,
            accountBalance: input.balanceOnRelevantDay,
            withdrawalBenefit: withdrawalBenefitOf(input.balanceOnRelevantDay),
          })
        : pensionAccountBalanceObservedLater({
            requiredDay: input.relevantDay,
            observedOn: input.balanceObservedOn,
            accountBalance: input.balanceOnRelevantDay,
            withdrawalBenefit: withdrawalBenefitOf(input.balanceOnRelevantDay),
          }),
    commutedOrRolledOverDuringYear: false,
  }).amount;

/**
 * **One financial year's payment from a transition to retirement income stream** —
 * `max(rate × balance, Sch 7 minimum)`, never more than the reg 6.01(2)(b)(ii) ceiling.
 *
 *   * **No stated rate: the minimum**, which is what a fund pays a member who chose nothing.
 *   * **In the year the stream commences the chosen rate is pro-rated by DAYS, exactly as Sch 7 cl 3
 *     pro-rates the minimum** (ruling, 2026-09-23): days from the commencement day to 30 June
 *     inclusive over the days in the year, and not at all for a 1 July commencement. Neither cl 4's
 *     June nil nor cl 5's $10 rounding is applied to it — those are rules about the Schedule's
 *     minimum, not about a rate a member chose — so the product is rounded once, to the cent.
 *   * **The ceiling is NOT pro-rated** (`ttrPaymentRange.ts` sets out why). With a door-validated
 *     rate it cannot bind — 10% of the whole balance is above any pro-rated rate of at most 10% and
 *     above the 4% minimum — and it is applied anyway, so a direct `project()` caller stating more
 *     is capped rather than paid past the point at which the stream would cease for tax purposes.
 *
 * `balanceObservedOn` is `annualPensionMinimum`'s own: where the walk opens after the relevant day
 * the plan's opening balance stands in for it, for the rate and the ceiling as for the minimum, and
 * the month's `PensionMinimumBasisNote` says so.
 */
export const ttrAnnualPayment = (input: {
  readonly fy: FinancialYear;
  readonly commencementDay: IsoDate;
  readonly balanceOnRelevantDay: Cents;
  readonly balanceObservedOn: IsoDate;
  /** `annualPensionMinimum`'s figure for the same year, stream and balance. */
  readonly minimum: Cents;
  readonly statedDrawdownRate: number | undefined;
}): Cents => {
  const { fy, commencementDay, balanceOnRelevantDay, minimum, statedDrawdownRate } = input;
  const ceiling = ttrAnnualCeiling({ measuredAt: input.balanceObservedOn, accountBalance: balanceOnRelevantDay });
  if (statedDrawdownRate === undefined) return Math.min(minimum, ceiling) as Cents;
  const chosen = ttrRateOverDays(balanceOnRelevantDay, statedDrawdownRate, daysInclusive(ttrYearOpens(fy, commencementDay), endOfFinancialYear(fy)), fy);
  return Math.min(Math.max(chosen, minimum), ceiling) as Cents;
};

/** The first day a TTR's year pays for: its commencement day in the year it commences, else 1 July. */
const ttrYearOpens = (fy: FinancialYear, commencementDay: IsoDate): IsoDate =>
  financialYearContaining(commencementDay) === fy && commencementDay > startOfFinancialYear(fy) ? commencementDay : startOfFinancialYear(fy);

/** `rate × balance × days / days in the year`, rounded once to the cent, in exact arithmetic. */
const ttrRateOverDays = (balance: Cents, drawdownRate: number, days: number, fy: FinancialYear): number => {
  const scale = 1_000_000;
  const scaledRate = Math.round(drawdownRate * scale);
  if (scaledRate / scale !== drawdownRate || scaledRate < 0) {
    throw new RangeError(`a TTR drawdown rate of ${drawdownRate} is not a non-negative fraction exact at this scale`);
  }
  const numerator = BigInt(balance) * BigInt(scaledRate) * BigInt(days);
  const denominator = BigInt(scale) * BigInt(daysInFinancialYear(fy));
  return Number((numerator * 2n + denominator) / (denominator * 2n));
};

/**
 * **A TTR year re-set by a `TTR_RATE_CHANGE` that takes effect inside it** (TTR build step 3).
 *
 * The year's figure keeps what the rate it was set at buys up to `from`, and the days from `from` to
 * 30 June are re-priced at the new rate: `amount − old share of the rest + new rate over the rest`,
 * where the old share is the year's figure pro-rated over the days it pays for. Days, as
 * `ttrAnnualPayment` pro-rates a commencement year.
 *
 * **Why the remaining months move rather than waiting for 1 July.** SIS Reg Sch 7 cl 1-2 fix the
 * year's MINIMUM on its relevant day and reg 6.01(2) (the "transition to retirement income stream"
 * definition, para (b)(ii)) fixes its MAXIMUM, 10% of the balance on that same day. reg 1.06(9A)(a)
 * requires only that the year's TOTAL payments reach the minimum. What a member draws between those
 * two figures is not fixed on the relevant day by anything, so a change can govern the rest of the
 * year. The bounds cannot move: the result is floored at the year's minimum and at what has already
 * been paid, and capped at the 10% ceiling on the YEAR'S TOTAL, not on any one month.
 *
 * Measured off the year's figure rather than off what the walk has paid, because in the walk's
 * opening part-year the months before `asAtDate` were paid outside it (`annualPensionMinimum`).
 */
export const ttrAnnualPaymentRevised = (input: {
  readonly fy: FinancialYear;
  readonly commencementDay: IsoDate;
  /** The first day the new rate governs: the first day of the month the change applies in. */
  readonly from: IsoDate;
  /** The year's figure before the change. */
  readonly amount: Cents;
  readonly paidSoFar: Cents;
  readonly balanceOnRelevantDay: Cents;
  readonly balanceObservedOn: IsoDate;
  readonly minimum: Cents;
  readonly drawdownRate: number;
}): Cents => {
  const { fy, amount, balanceOnRelevantDay } = input;
  const opens = ttrYearOpens(fy, input.commencementDay);
  const rest = daysInclusive(input.from > opens ? input.from : opens, endOfFinancialYear(fy));
  const oldShare = Math.round((amount * rest) / daysInclusive(opens, endOfFinancialYear(fy)));
  const newShare = ttrRateOverDays(balanceOnRelevantDay, input.drawdownRate, rest, fy);
  const ceiling = ttrAnnualCeiling({ measuredAt: input.balanceObservedOn, accountBalance: balanceOnRelevantDay });
  return Math.min(Math.max(amount - oldShare + newShare, input.minimum, input.paidSoFar), ceiling) as Cents;
};

/**
 * **THE ANNUAL-MINIMUM-AGAINST-A-MONTHLY-TICK DECISION, in one place, with a test — and the whole
 * of it is that the Schedule 7 minimum is a FLOOR and never a ceiling** (the user's ruling,
 * 2026-09-17).
 *
 * `minimumDrawdown` returns an **annual** figure and reg 1.06(9A)(a) makes it a floor on the year's
 * TOTAL payments — *"at least annually"*. The tick is a month, so two different questions have to be
 * answered and they are answered by two different functions:
 *
 *   * **what limb 2 may supply** — this function — which is the ACCOUNT BALANCE, because nothing in
 *     the law caps a drawdown from an Account-Based Pension; and
 *   * **what limb 2 must PAY whether or not the household needs it** — `minimumStillDueThisMonth`.
 *
 * **Why the balance and not the minimum.** Capping the limb at the year's remaining minimum stopped
 * a household reaching its own money: $600,000 in a pension, nothing else, a $64,370 spending
 * target, and the walk reported $125,452 of `Unfunded shortfall` while the balance ROSE. The
 * Schedule determines a payment a fund MUST make, not the most a member may take, and P4-7's finding
 * was that until this changed no scenario spending above the floor could be compared against any
 * external authority — which is nearly every real retirement.
 *
 * **A twelfth is still NOT taken, at either end.** Schedule 7 determines a total and says nothing
 * about when it is paid; reg 1.06(9A)(a) requires one payment a year. Dividing would invent a
 * payment schedule, would manufacture an `Unfunded shortfall` for a household with a $30,000 bill in
 * August and a million dollars of pension behind it, and would have no year to give the remainder
 * to — the walk starts at `asAtDate`, which is mid-year for every real plan. The single rounding
 * this figure needs was taken inside `minimumDrawdown` (cl 5's nearest $10) and a division here
 * would round a second time, which that module's header forbids by name.
 *
 * **Where a super balance becomes EXHAUSTIBLE, and it is now the ordinary case rather than a
 * catastrophe.** The limb can be drawn to nil in a single month, and nil is a real state: a nil
 * balance offers nothing, `minimumDrawdown` determines a nil minimum off it next 1 July, and
 * `balanceAfterDrawdownAndGrowth` grows nil to nil. Nothing here throws on an empty account.
 */
export const pensionAvailableThisMonth = (balance: Cents): Cents => {
  if (!Number.isSafeInteger(balance) || balance < 0) {
    throw new RangeError(`not a balance in whole cents: ${balance}`);
  }
  return balance;
};

/**
 * **What the pension must PAY this month whether or not the household needs a cent of it** — the
 * other half of the floor, and the close of the residual that flattered.
 *
 * reg 1.06(9A)(a) requires the minimum to be paid; the Waterfall draws to NEED. Before 2026-09-17
 * those two came apart and the model kept the difference: a month whose other income met the target
 * drew nothing, so $9,140.00 of a $28,000.00 legislated minimum was never paid on the order fixture
 * and the household ended richer than the law allows. This is where the difference is paid.
 *
 * **WHEN it is paid: the last month of the financial year, and not one month earlier.** The
 * obligation is annual — *"at least annually"* — so a household that has already drawn more than the
 * minimum owes nothing, and one that has drawn less owes the remainder by 30 June. Sweeping it in
 * July instead would be the same invented schedule a twelfth would be, and in the opposite
 * direction. `isFinalMonthOfTheYear` is the caller's fact about the walk, because this function has
 * no calendar.
 *
 * **Floored at the balance, and the balance is what is LEFT after this month's needed draw.** A
 * pension cannot pay out money the account does not hold, whatever the Schedule determined at
 * 1 July; an account already emptied by the household's own spending owes nothing further, and a
 * near-empty one pays what it has. The consequence is that in a year the account runs out, the
 * minimum is simply not met — which is a fact about the account, not a modelling choice, and it is
 * the state reg 1.06(9A)'s own machinery ends in.
 *
 * **What the payment then IS: cash in the Household's hands.** It leaves the pension and lands in
 * the Waterfall's running cash — the Offset, under P4-3b's stand-in — exactly as limb 1's surplus
 * already does, and by the same precedent. It is not held anywhere new.
 */
export const minimumStillDueThisMonth = (
  remainingForYear: Cents,
  balance: Cents,
  isFinalMonthOfTheYear: boolean,
): Cents => {
  if (!Number.isSafeInteger(remainingForYear) || remainingForYear < 0) {
    throw new RangeError(`not a remaining annual minimum in whole cents: ${remainingForYear}`);
  }
  if (!Number.isSafeInteger(balance) || balance < 0) {
    throw new RangeError(`not a balance in whole cents: ${balance}`);
  }
  return (isFinalMonthOfTheYear ? Math.min(remainingForYear, balance) : 0) as Cents;
};

/**
 * **The `MonthLine` a drawdown emits, and it is HALF of one change.** The other half is the
 * write-back through `balanceAfterDrawdownAndGrowth`, and they carry the same number, computed once,
 * in `project()`'s allocation loop.
 *
 * **Why that matters enough to be written here.** Chunk 4's reconciliation —
 * `closingBalance = openingBalance + Σinflow − Σoutflow` — is computed from `lines`. A draw that
 * moved a balance with no line against it would leave the identity arithmetically true and no longer
 * MEANING what its doc claims: the month's assets would fall for a reason the month's own lines
 * cannot explain. (That is exactly the reporting gap chunk 5a declared for growth, and this chunk is
 * required not to add a second one.) The two are therefore one change and are tested together.
 *
 * It is an **inflow**: the payment is money arriving in the household's hands, exactly as salary is.
 * The super balance it came out of is not a `Month` field — it reaches the output as
 * `assessableAssets` — so the fall is visible there and the cash is visible here.
 */
/*
 * **Renamed 2026-09-23 from `'Account-Based Pension minimum'` (user ruling).** The old words said the
 * payment was the minimum. It is not: limb 2 offers the WHOLE balance, and the Sch 7 minimum is only
 * the floor the June sweep tops up to (2026-09-17). The constant keeps its name so every reader moves
 * with it; the register the payment is priced under is still `'Account-Based Pension minimum'`,
 * because that is the rule's name and the rule is the floor.
 */
export const PENSION_MINIMUM_LINE = 'Account-Based Pension payment';

/**
 * **The words a minimum resting on a stand-in balance is reported in — P10-5, 2026-09-21.**
 *
 * Constant text in one place, for `PARAMETER_WINDOW_NOTES`' reason: a sentence whose only expression
 * is a literal inside a loop cannot be tested, and the whole point of saying which figure this rests
 * on is that somebody can read it back. `PensionMinimumBasisNote` in `plan.ts` says why the note
 * exists and why it states a SIZE rather than a direction.
 */
export const PENSION_MINIMUM_PROXY_NOTE =
  'SIS Reg Sch 7 cl 1(2)(a)(i) works this year\u2019s minimum out on the pension account balance ON 1 JULY, and this ' +
  'forecast opens after it, so that balance was never observed. The balance the plan states at its own opening day ' +
  'has been used in its place \u2014 the nearest observation there is, and the only input in the calculation that is ' +
  'not the Schedule\u2019s own. Nothing else is substituted: the age is taken at the day the Schedule names, the ' +
  'percentage factor is that day\u2019s band, and the year is NOT pro-rated, because cl 3 proportions only the year a ' +
  'pension commences in and this one commenced earlier. THE DIRECTION IS NOT KNOWN \u2014 an account takes payments ' +
  'out and earnings in over those weeks and either can be the larger \u2014 but the size is bounded by the percentage ' +
  'factor times that movement. The behaviour this replaced determined no minimum at all, which understated the ' +
  'household by the whole of it and has no clause behind it in the Schedule.';

/**
 * **What money coming OUT of superannuation is called in a month's `lines`** — one INFLOW per
 * withdrawal, at what the interest could actually pay, named for the Person whose interest it came
 * out of.
 *
 * **Two paths push it and the description does not distinguish them, deliberately** (2026-09-19):
 * a stated `LUMP_SUM_FROM_SUPER`, and Waterfall limb 5's automatic draw on a released balance. They
 * are the same act out of the same account for the same household, so they read alike; what tells
 * them apart is `attribution`, which names the entry for the first and
 * `NO_STATING_ENTRY.automaticSuperWithdrawal` for the second. That is limb 3's precedent for the
 * stated sale and the automatic one, taken unchanged.
 *
 * It is the same discipline `PENSION_MINIMUM_LINE` states above and it is half of one change: the
 * write-back to `balances[personIndex].superInterestBalances[slot]` happens at the same statement,
 * off the same `SuperWithdrawal`, so a super balance cannot fall here without a line to explain it
 * and no line can be written that no balance moved by. There is **no second copy of the balance**:
 * this is the seam Waterfall limbs 2 and 3 already write through, which is what makes `splitAssets`
 * and `accessibleWealth` see the withdrawal without either of them being told about it.
 *
 * **No tax line accompanies it, and that is asserted rather than assumed.** At the only age this
 * build honours the tax is nil (`superLumpSum.ts`), and the month carries a `SuperWithdrawalNote`
 * that says so in terms — a nil the engine stated, not a question it never asked.
 */
export const SUPER_LUMP_SUM_LINE = 'Superannuation lump sum';

/**
 * **P12-1 — what the deceased's superannuation is called when it is paid out to the survivor**: ONE
 * cash inflow in the month of the death, named for the Person who died, carrying every one of their
 * interests together. Half of one change, `SUPER_LUMP_SUM_LINE`'s discipline: the balances go to nil
 * at the same statement that decides this amount (the walk's death-month block). Tax-free to a
 * spouse — ITAA 1997 s 302-60 — so no tax line accompanies it.
 */
export const SUPER_DEATH_BENEFIT_LINE = 'Superannuation death benefit';

/**
 * **The first day of the capital gains tax regime.** A parcel acquired before it passes on a death
 * at its market value as its cost base, and is treated as acquired on the death (ATO, "Cost base of
 * inherited assets"; ITAA 1997 s 128-15).
 */
const CGT_START = PRE_CGT_CUTOFF;

/**
 * **What a transition to retirement income stream's own payment is called in a month's `lines`** —
 * one cash INFLOW per interest per month it pays, named for the Person, and HALF of one change on
 * `PENSION_MINIMUM_LINE`'s discipline: the balance write-back is made at the same statement off the
 * same figure.
 *
 * The amount is a twelfth of the year's payment (`ttrAnnualPayment`) in every month but the last of
 * the financial year, which pays what is left of it. A TTR that converts inside the year keeps that
 * year's figure: from its conversion day it is paid through limb 2 as an Account-Based Pension, and
 * what is still owed of the year's amount is that limb's floor — the same stream in law, so the
 * same year. A fresh pension year starts the next 1 July.
 */
export const TTR_PAYMENT_LINE = 'Transition to retirement pension';

/**
 * **What money going INTO the receiving spouse's superannuation, paid from the Household's own
 * cash, is called in a month's `lines`** (P3-19). ONE outflow line, on `PORTFOLIO_PURCHASE_LINE`'s
 * own shape and for the same reason: the balance write-back happens at the same statement, off the
 * same `Entry`, so a super balance cannot rise here without a line to explain it and the money is
 * never counted twice — once as cash spent and once as a balance that simply appeared.
 *
 * **Capped at cash on hand, never at a spending target** — `purchaseFromBuy`'s own precedent, taken
 * unchanged: a contribution is a movement between two of the Household's own pockets, not a living
 * cost, so it is funded AFTER the Waterfall and takes what is left rather than creating an
 * `Unfunded shortfall` a household that chose to top up a spouse's super did not actually run into.
 */
export const SPOUSE_CONTRIBUTION_LINE = 'Spouse contribution';
/** Who paid, then whose super it went into. */
export const spouseContributionDescription = (contributorName: string, receiverName: string): string =>
  `${SPOUSE_CONTRIBUTION_LINE}, ${contributorName} → ${receiverName}`;

/**
 * **P9-5 — a `DOWNSIZER_CONTRIBUTION` leaving cash for the owner's own super**, `SPOUSE_CONTRIBUTION_LINE`'s
 * shape: one cash outflow, the balance credited at the same statement, no fund tax and no cap.
 */
export const DOWNSIZER_CONTRIBUTION_LINE = 'Downsizer contribution to super';
/** Whose super it went into. */
export const downsizerContributionDescription = (name: string): string => `${DOWNSIZER_CONTRIBUTION_LINE}, ${name}`;

/**
 * **The single source of truth for which cash lines move money between the Household's OWN
 * pools, as opposed to money entering or leaving the Household — P4-13, 2026-09-22.**
 *
 * A test that checks the wealth identity (`Δ(protected + assessable) = Σ wealth lines + Δ offset
 * − Σ internal transfers`) has to classify every cash line as internal or external, and used to do
 * it with a hand-copied regex. Two independent copies drifted apart within two days of each other
 * (`test/core-projection-growth-lines.test.mjs` was missing `SUPER_LUMP_SUM_LINE`, silently, because
 * no fixture in that file ever drew on released super). **Anyone adding a new line shaped like a
 * transfer between the Household's own pools must add it here, and nowhere else** — a list built
 * from the line constants cannot go stale the way a copied pattern can.
 */
export const INTERNAL_TRANSFER_LINES: readonly string[] = [
  PENSION_MINIMUM_LINE,
  TTR_PAYMENT_LINE,
  PORTFOLIO_SALE_LINE,
  PORTFOLIO_PURCHASE_LINE,
  SUPER_LUMP_SUM_LINE,
  SPOUSE_CONTRIBUTION_LINE,
  DOWNSIZER_CONTRIBUTION_LINE,
];

/**
 * **Which lines are money paid OUT of superannuation into the Household's cash** — the month's
 * "income from super". Every one of them is a `cash` inflow written beside a debit to a super
 * interest, and there are exactly three, because every route out of a fund writes one of these three
 * descriptions:
 *
 *   * `PENSION_MINIMUM_LINE` — Waterfall limb 2's Account-Based Pension draw plus the swept Schedule 7
 *     minimum, including a TTR interest from the day it converts;
 *   * `TTR_PAYMENT_LINE` — a transition to retirement income stream's own payment, before it converts;
 *   * `SUPER_LUMP_SUM_LINE` — a stated `LUMP_SUM_FROM_SUPER` AND Waterfall limb 5's automatic draw on
 *     released super. The two share the description; `attribution` tells them apart.
 *
 * NOT in it: contributions going in (`SUPER_GUARANTEE_LINE`, `SALARY_SACRIFICE_LINE`,
 * `SPOUSE_CONTRIBUTION_LINE`), and `DIVISION_293_RELEASE_LINE`, which leaves a fund for the
 * Commissioner and never reaches the Household. **A new line that moves super into cash must be
 * added here** — `INTERNAL_TRANSFER_LINES`' rule, for its reason.
 */
export const INCOME_FROM_SUPER_LINES = [PENSION_MINIMUM_LINE, TTR_PAYMENT_LINE, SUPER_LUMP_SUM_LINE, SUPER_DEATH_BENEFIT_LINE] as const;

/**
 * **The one way a payment out of super is described**, used by every site that writes one AND by
 * the set `Month.incomeFromSuper` is summed over. The total therefore compares descriptions WHOLE
 * (`test/core-div293-charge.test.mjs` forbids prefix matching under `src/`), and rewording the
 * line cannot silently drop it from the total, because both read this.
 */
export const superPaymentDescription = (line: (typeof INCOME_FROM_SUPER_LINES)[number], person: Person): string =>
  `${line}, ${person.name}`;

/**
 * **WHAT ONE LINE DOES TO THE RUNNING CASH — and a `wealth` line does NOTHING to it (P4-4).**
 *
 * Every reduction over a month's `lines` in `project()` goes through this and no other expression:
 * the Waterfall's `received`, the cash a buy can draw on, the pre-sweep deficit, and
 * `closingBalance` itself. `MonthLine.effect` is what it consults, never `description` — a
 * whitelist of names would have to be edited by every future line and would absorb the one somebody
 * forgot.
 *
 * ⚠️ **This filter is the whole reason `effect` exists.** Investment growth moves a balance without
 * a dollar moving; counted as cash it would add a month's unrealised return to every
 * `closingBalance` in the walk — a household spending a gain it has not realised, which is the
 * flattering direction and precisely what P4-4 is built not to do. The mutation that deletes the
 * `effect` test is the one this design is measured by.
 */
const cashMovement = (line: MonthLine): number =>
  line.effect !== 'cash' ? 0 : line.direction === 'inflow' ? line.amount : -line.amount;

/**
 * **P4-4 — the name of the line unrealised investment growth is reported as, and it is the first
 * `effect: 'wealth'` line in this model.**
 *
 * It closes the residual chunk 5a declared and named this item by: a balance that grew with no
 * `MonthLine` against it, so a `Month` reported more `assessableAssets` than its own lines could
 * explain. It is NOT a cashflow — `cashMovement` above returns nil for it, so not one
 * `closingBalance` in the suite moves because of it — and it is not income: nothing here reaches
 * taxable income, because unrealised growth is not a CGT event (s 104-10 needs a disposal) and the
 * gain is charged when the parcel is sold, by `chargeCapitalGain`.
 *
 * **ONE LINE PER PERSON PER POOL, never a merged household figure**, on the rule limb 2's payment
 * and chunk 5's capital-gains charge already follow: a merged figure cannot be audited against the
 * balances it came out of, and the pools are assessed differently (the younger-partner exemption
 * puts one Person's Accumulation super in `protectedAssets` and the rest in `assessableAssets`).
 * The pools are the Non-Super Portfolio and each superannuation interest separately — the same
 * lines, with the same names, that `splitAssets` reports the money under.
 *
 * **The direction is not assumed.** A positive month is an `inflow` of wealth and a negative one an
 * `outflow`; a nil month emits no line at all, on chunk 2's rule that `MonthLine.amount` is always
 * positive. `monthlyGrowthFactor` admits a negative `nominalReturn` (down to, and excluding, −1), so
 * the outflow case is reachable from a Setting a user can state today.
 */
export const GROWTH_LINE = 'Investment growth';

/**
 * **What a month's administration fee on one superannuation interest is called — P3-17 slice 1.**
 *
 * ONE line carrying BOTH limbs of the administration fee: the twelfth of the flat annual dollar
 * charge and the twelfth of the administration percentage, added. They are one fee quoted in two
 * parts on a member's statement ("$78 a year plus 0.20%"), a member pays them as one deduction, and
 * splitting them here would put two rows on the screen for one charge.
 *
 * **But NOT merged with the investment fee** — that has its own line below, because the two are
 * charged by different parties and a member who switches investment option moves one and not the
 * other. `MonthLine.provenance` cannot itemise (`UnlegislatedFigure` is `basis` and a shared
 * `note`; only a `'legislated'` record carries a `determination`), so a fee that cannot be seen on
 * its own line cannot be seen at all.
 *
 * **`effect: 'wealth'`, never `'cash'`.** The fee is deducted inside the fund; the Household never
 * holds the money, exactly as it never holds the contributions tax or a month's growth. A cash line
 * would take the fee out of the Offset Account — a real bank balance falling for a deduction that
 * happened in a superannuation fund.
 *
 * **NO LINE WHERE THERE WAS NO FEE**, on `PORTFOLIO_BROKERAGE_LINE`'s rule and `growthLine`'s
 * precedent: `MonthLine.amount` is specified as always positive, and an interest stating no fee paid
 * nothing — a nil fee is a fact about the account, not a payment of nothing. ⚠️ **And the converse
 * is load-bearing: a NONZERO fee must emit this line or the P4-4 wealth identity breaks**, because
 * the money leaves a balance the means test reads. That is the failure
 * `PORTFOLIO_BROKERAGE_LINE`'s doc records against the brokerage fee — *"the one movement in this
 * walk with no line against it"* — and `test/core-projection-growth-lines.test.mjs` is what catches
 * it.
 */
export const SUPER_ADMINISTRATION_FEE_LINE = 'Superannuation administration fee';

/**
 * **What a month's investment fee on one superannuation interest is called — P3-17 slice 1.**
 *
 * `SUPER_ADMINISTRATION_FEE_LINE`'s shape and every one of its rules; see it for why the fee is a
 * `'wealth'` outflow, why a nil fee emits nothing, and why the two fees are two lines.
 *
 * ⚠️ **It is not the fund's 15% earnings tax.** That is legislated, is computed by `fundEarningsTax`
 * and carries a register; this is a fee, carries `UNLEGISLATED.superFees`, and a reader must be able
 * to tell the two apart from the row alone.
 */
export const SUPER_INVESTMENT_FEE_LINE = 'Superannuation investment fee';

/**
 * **A month's death/TPD/income protection insurance on one superannuation interest — P3-17a slice 1,
 * P3-17b.** Premiums plus the insurance admin fee, one line; `SUPER_ADMINISTRATION_FEE_LINE`'s rules otherwise ('wealth',
 * no line when nil, and a nonzero charge must emit it or the wealth identity breaks).
 */
export const SUPER_INSURANCE_LINE = 'Superannuation insurance';

/**
 * **The fund's own 15%/0% earnings tax on one `SuperInterest`'s income share — P3-42 step 2, the
 * line `SUPER_INVESTMENT_FEE_LINE`'s own doc named ahead of this build.**
 *
 * `'wealth'`, never `'cash'`, on `SUPER_ADMINISTRATION_FEE_LINE`'s own reasoning: the tax is paid by
 * the FUND, out of the balance itself, and the Household never holds the money for it to leave a
 * cash account. It is LEGISLATED — `fundEarningsTax` (`superPhase.ts`), register §3.1 — and carries
 * `taxProvenance('superannuation fund earnings tax', …)`, never `UNLEGISLATED.superFees`, which is
 * the one thing that tells this line and the two fee lines above it apart from the row alone.
 *
 * **NO LINE WHERE THERE WAS NO TAX**, on the same rule the fee lines and `growthLine` already take:
 * `Settings.superIncomeYieldRate` absent, a nil balance, or a Retirement Phase interest held for the
 * whole year all produce a nil `fundEarningsTax().tax`, and a nil is a fact about the year, not a
 * payment of nothing.
 */
export const SUPER_EARNINGS_TAX_LINE = 'Superannuation fund earnings tax';

/**
 * **The excess of a franking credit over the earnings tax it was set against, refunded IN CASH to
 * the interest itself — P3-42 step 3, `frankingInSuper`'s own `refund` field, s 63-10(1) item 40.**
 *
 * `'wealth'`, `'inflow'`: the refund is paid TO the fund, and the fund is not the Household's own
 * cash. `frankingInSuper`'s own invariant makes this line and `SUPER_EARNINGS_TAX_LINE` mutually
 * exclusive for one interest in one year — exactly one of `taxPayableAfterOffset` and `refund` is
 * non-nil — so a reader never sees both for the same interest in the same July.
 *
 * **Retirement Phase reaches this line on EVERY franked interest, not only a lightly-franked
 * one** (T45/T46, register §5A.3): at 0% there is no liability for the credit to offset at all, so
 * the whole credit is always the excess.
 */
export const SUPER_FRANKING_CREDIT_REFUND_LINE = 'Superannuation franking credit refund';

/**
 * **The two halves of one home-loan repayment, as they appear on a month — P3-16 slice 1.**
 *
 * They are `'cash'` outflows and they sum to `MortgageMonth.payment` by construction, because both
 * are read off the one `MortgageMonth` the balance is written back from. A household with no
 * mortgage, and a household whose loan has been repaid, emit NEITHER — `MonthLine.amount` is
 * specified as always positive, and a payment of nothing is not a payment.
 *
 * ⚠️ **The split is the audit trail and it is not decoration.** The interest line is the only place
 * the Offset Account's effect is visible: the same balance, against the same loan, with $80,000 in
 * the offset rather than nil, is the same principal line and a smaller interest one. A single
 * merged "Mortgage repayment" row would be the same number every month for thirty years and would
 * say nothing about whether the loan was being repaid.
 *
 * ⚠️ **Neither line is a WEALTH movement, and the principal one arguably should be.** Paying
 * principal swaps cash for a smaller debt, so a household's net position falls by the interest
 * alone — but ADR-0005 holds no value for the home and therefore no net position against it, so
 * there is nothing here for a `'wealth'` line to move. The figures fall by the whole repayment.
 * Direction: this UNDER-states the household, which is where this build takes its residuals.
 */
export const MORTGAGE_INTEREST_LINE = 'Mortgage repayment — interest';

/** The principal half. See `MORTGAGE_INTEREST_LINE` for every rule the pair is under. */
export const MORTGAGE_PRINCIPAL_LINE = 'Mortgage repayment — principal';

/**
 * **`mortgageMonth`, with the MONTH and the ENTRY on the refusal — P3-16 slice 2.**
 *
 * `mortgageMonth` refuses a repayment that does not cover the month's interest (its point 5) with a
 * `RangeError` that quotes the three figures and names nothing else. That was enough while a loan
 * could only come from `Household.mortgage`, because `parsePlan` refused the same loan at the door
 * with a JSON path on it and no user could reach the walk's copy. **A dated `MORTGAGE_REFINANCE`
 * has no such door**: the interest depends on the Offset Account balance in the month the change
 * takes effect, and that balance is an output of `project()` — so the first place an unpayable
 * dated change can be known is here, in the month it fails.
 *
 * So this wraps and re-throws. It adds two facts and changes nothing else:
 *   * **the month**, because a change can be payable in one month and not in a later one (an offset
 *     that falls raises the interest), and the user's question is *when*;
 *   * **the entry's id**, or the fact that the loan is the Household's own stated one — because a
 *     plan may hold several `MORTGAGE_REFINANCE`s and *which one to fix* is the whole of what the
 *     user needs.
 *
 * ⚠️ **What is lost, and it is not papered over.** There is no pre-flight, path-bearing,
 * form-showable refusal for a dated change: the user meets this after saving, as a thrown error,
 * rather than as a message on the box they typed. `parsePlan`'s own doc records the same gap from
 * the other side. The day-1 check at the door is untouched and is still valid for the loan it can
 * see.
 *
 * A plain `RangeError`, in `mortgageMonth`'s own idiom: it is a fact about the SHAPE of a stated
 * loan and not an unanswered question about the law, so it takes no register row and no named class
 * (ruling R8).
 */
const mortgageMonthOrRefuse = (
  mortgage: Mortgage,
  balance: Cents,
  offsetBalance: Cents,
  month: IsoMonth,
  entryId: string | undefined,
): MortgageMonth => {
  try {
    return mortgageMonth(mortgage, balance, offsetBalance);
  } catch (refusal) {
    // The original message is kept WORD FOR WORD and appended to: it carries the three figures and
    // the offset, and re-wording it here would be a second account of the same refusal.
    throw new RangeError(
      `the home loan in force in ${month}, ${entryId === undefined
        ? 'the one stated on the household itself'
        : `set by the entry "${entryId}"`}, cannot be paid that month: ${refusal instanceof Error ? refusal.message : String(refusal)}`,
    );
  }
};

/**
 * **What a month's salary sacrifice arriving in a fund is called — P6-8 brief 2 chunk 4.** The
 * amount on the line is what LANDS: the sacrifice net of the fund's 15%. The gross and the tax are
 * both in the line's `determination`, so the row can be read as an arithmetic without the figure on
 * it ever being one the interest did not receive. A second line for the tax was the alternative and
 * was rejected: the fund pays that tax, the Household never holds it, and a `'wealth'` outflow for
 * money that was never in a balance would be a movement of nothing.
 */
export const SALARY_SACRIFICE_LINE = 'Salary sacrifice into superannuation';

/** The Non-Super Portfolio's pool name in a `GROWTH_LINE`, as `splitAssets` names the same money. */
export const PORTFOLIO_POOL = 'Financial investments outside superannuation';

/**
 * One superannuation interest's pool name in a `GROWTH_LINE`. The three strings are `splitAssets`'
 * own descriptions for the same three phases, so a growth line and the means-test line it moved can
 * be read against each other by name. They are spelled here rather than imported because
 * `household.ts` builds them inline and exports no mapping; the pairing is asserted in the tests
 * rather than trusted.
 */
export const superPoolName = (phase: SuperInterest['phase']): string =>
  phase === 'accumulation'
    ? 'Superannuation, Accumulation Phase'
    : phase === 'ttr'
      ? 'Superannuation, TTR'
      : 'Account-Based Pension';

/**
 * The named lines that carry a pool. Each is the ONE way its line is described, used by the walk
 * and by the chat connector's translation to Person A / Person B (`app/chat/tools/identity.ts`).
 */
type Phase = SuperInterest['phase'];
/** `pool` is `PORTFOLIO_POOL` or a `superPoolName`. */
export const growthDescription = (name: string, pool: string): string => `${GROWTH_LINE}, ${name} — ${pool}`;
export const superGuaranteeDescription = (name: string, phase: Phase): string => `${SUPER_GUARANTEE_LINE}, ${name} — ${superPoolName(phase)}`;
export const salarySacrificeDescription = (name: string, phase: Phase): string => `${SALARY_SACRIFICE_LINE}, ${name} — ${superPoolName(phase)}`;
export const superAdministrationFeeDescription = (name: string, phase: Phase): string => `${SUPER_ADMINISTRATION_FEE_LINE}, ${name} — ${superPoolName(phase)}`;
export const superInvestmentFeeDescription = (name: string, phase: Phase): string => `${SUPER_INVESTMENT_FEE_LINE}, ${name} — ${superPoolName(phase)}`;
export const superInsuranceDescription = (name: string, phase: Phase): string => `${SUPER_INSURANCE_LINE}, ${name} — ${superPoolName(phase)}`;
export const superEarningsTaxDescription = (name: string, phase: Phase, fy: FinancialYear): string =>
  `${SUPER_EARNINGS_TAX_LINE}, ${name} — ${superPoolName(phase)}, ${fy}`;
export const superFrankingCreditRefundDescription = (name: string, phase: Phase, fy: FinancialYear): string =>
  `${SUPER_FRANKING_CREDIT_REFUND_LINE}, ${name} — ${superPoolName(phase)}, ${fy}`;

// --- NOTE PROSE THAT NAMES A PERSON --------------------------------------------------------------
//
// Each is the ONE way its sentence is written, used by the walk and by the chat connector's
// translation to Person A / Person B (`app/chat/tools/identity.ts`), which matches a note against
// these WHOLE. A figure is `string | number` because it is only ever interpolated.

type Fact = string | number;

export const salarySacrificeStoppedNoteText = (name: string, stoppedFrom: Fact): string =>
  `${name} ended their salary sacrifice arrangement from ${stoppedFrom}, so nothing is sacrificed this month. ` +
  'The months before that date are untouched: what was contributed then stays contributed, and stays counted against those ' +
  "years' concessional cap. From this date the whole salary is taxed as income again, the cap is free of the arrangement, and " +
  "the employer's Superannuation Guarantee is unaffected — it never depended on the sacrifice.";

export const concessionalCapExceededNoteText = (
  name: string,
  fy: Fact,
  total: Fact,
  month: Fact,
  guarantee: Fact,
  sacrificed: Fact,
  excess: Fact,
  cap: Fact,
  capSource: Fact,
): string =>
  `${name}'s concessional contributions in FY${fy} reached ${total} cents by ${month} — ` +
  `${guarantee} cents of employer Superannuation Guarantee and ${sacrificed} cents salary sacrificed — ` +
  `${excess} cents over the year's general concessional cap of ${cap} cents ` +
  `(ITAA 1997 s 291-20(2); ${capSource}). A salary sacrifice is checked against the cap in the month it ` +
  'is stated, at that month\'s pay; this is what the year actually contributed, and pay rising with ' +
  'wages lifts the Guarantee while the sacrifice stays fixed. ' +
  'Division 291 is not modelled: it would put the excess into assessable income with a 15% offset, and this ' +
  `build charges it the fund's 15% and no more. Every figure from this month is therefore FLATTERING by ${name}'s ` +
  'marginal rate less 15% on the excess, and on every concessional dollar still to go in this year. ' +
  'To stay within the cap, state a smaller sacrifice from this year.';

/** `frankedShare` is `Settings.investmentPayoutFrankedShare`, and absent is the unfranked sentence. */
export const investmentDistributionNoteText = (name: string, distribution: Fact, payoutRate: Fact, frankedShare: Fact | undefined): string =>
  frankedShare === undefined
    ? `${name}'s Non-Super Portfolio paid out a distribution of ${distribution} cents this month — ` +
      `${payoutRate} of its own market value — and the whole of it was reinvested. No cash reached the ` +
      `Offset Account and no line reports one, because none moved: what moved is the holding's cost base, ` +
      `raised by the same amount, which lowers a future capital gain on this portfolio by what is taxed ` +
      `here. It is ordinary, UNFRANKED income — no credit for company tax already paid is applied yet ` +
      `(P3-22h step 3) — and it is charged at ${name}'s own marginal rate through the ordinary ` +
      `${TAX_TRUE_UP_LINE} the following July, on the completed financial year's actual total.`
    : `${name}'s Non-Super Portfolio paid out a distribution of ${distribution} cents this month — ` +
      `${payoutRate} of its own market value — and the whole of it was reinvested. No cash reached the ` +
      `Offset Account and no line reports one, because none moved: what moved is the holding's cost base, ` +
      `raised by the same amount, which lowers a future capital gain on this portfolio by what is taxed ` +
      `here. It is ordinary income, a ${frankedShare} share of it stated to ` +
      `already carry a credit for company tax paid — and it is charged, credit and all, at ` +
      `${name}'s own marginal rate through the ordinary ${TAX_TRUE_UP_LINE} the following July, ` +
      `on the completed financial year's actual total.`;

/** One sentence per `PensionAtRetirementNote['outcome']`. `accounts` is "super account 1", "super accounts 1 and 2". */
export const PENSION_AT_RETIREMENT_NOTE_TEXT = Object.freeze({
  'retired before the plan': (name: string, retireDay: Fact, asAtDate: Fact): string =>
    `${name} retired on ${retireDay}, before this plan starts on ${asAtDate}, so each super account stays in the phase the plan states for it today.`,
  'under 60': (name: string, retireDay: Fact, accounts: Fact): string =>
    `${name} retires on ${retireDay}, before turning 60. Retiring before 60 does not release super, so ${accounts} stay as they are and do not become a pension.`,
  'prior pension': (name: string, stated: boolean, accounts: Fact, retireDay: Fact): string =>
    `${stated ? `${name} already had a super pension before this plan` : `${name} already has an account-based pension`}, so how much of the transfer balance cap is left is not known. ${accounts} stay in accumulation at retirement on ${retireDay}.`,
  'over the cap': (name: string, credit: Fact, retireDay: Fact, accounts: Fact, ttr: 'none' | 'all' | 'some' = 'none'): string =>
    `${name}'s super comes to ${credit} at retirement on ${retireDay}, over the ${formatCents(PUBLISHED_TRANSFER_BALANCE_CAP)} transfer balance cap, so ` +
    (ttr === 'all'
      ? `the transition to retirement pension in ${accounts} keeps paying until ${name} turns 65`
      : ttr === 'some'
        ? `${accounts} stay as they are: a transition to retirement pension keeps paying until ${name} turns 65, and any other account stays in accumulation`
        : `${accounts} stay in accumulation`) +
    ': splitting an account between a pension and accumulation is not modelled.',
  switched: (name: string, retireDay: Fact, accounts: Fact, oneAccount: boolean): string =>
    `At retirement on ${retireDay}, ${name}'s ${accounts} became an account-based pension, so ${oneAccount ? 'its' : 'their'} earnings are no longer taxed. Each year's minimum is paid, and what is not spent goes to cash. The pension counts in the Age Pension assets test.`,
  'back at work': (name: string, freed: boolean, returnDay: Fact, stopDay: Fact): string =>
    `${name} goes back to work on ${returnDay}, after stopping on ${stopDay}, so the salary starts again and any pension keeps paying. ` +
    (freed
      ? `The super ${name} had when stopping stays free to take out, less anything taken out since, and that amount is fixed: it does not grow. Only the money paid in since, and the earnings, are locked until ${name} stops work again at 60 or older, or turns 65.`
      : `${name} stopped before 60, which freed no super, so it stays locked until ${name} stops work again at 60 or older, or turns 65.`),
  'stopped again': (name: string, stopDay: Fact): string =>
    `${name} stops work again on ${stopDay}. At 60 or older this frees the super paid in since going back to work. The forecast doesn't turn any super into a pension at this stop: each super account stays as it is.`,
  'stopped again, TTR converted': (name: string, stopDay: Fact, accounts: Fact, oneAccount: boolean): string =>
    `${name} stops work again on ${stopDay}. At 60 or older this frees the super paid in since going back to work. The transition to retirement pension in ${name}'s ${accounts} becomes a full account-based pension on this day, so ${oneAccount ? 'its' : 'their'} earnings are no longer taxed and the 10% yearly limit on payments ends. Every other super account stays as it is.`,
} satisfies { readonly [O in PensionAtRetirementNote['outcome']]: (name: string, ...facts: never[]) => string });

/**
 * The `MonthLine` one pool's month of growth is reported as, or `undefined` where it did not move.
 *
 * `movement` is the change in the pool's value with the month's cash movements ALREADY TAKEN OUT —
 * for a super interest, the balance after this month's `PENSION_MINIMUM_LINE` payment; for a
 * portfolio, the parcels that survived this month's disposals. A line that carried the gross balance
 * instead, or the fall a drawdown caused, would double-count money that already has a cash line
 * against it.
 */
const growthLine = (description: string, movement: number): MonthLine | undefined =>
  movement === 0
    ? undefined
    : Object.freeze({
        direction: movement > 0 ? 'inflow' : 'outflow',
        effect: 'wealth',
        description,
        amount: Math.abs(movement) as Cents,
        provenance: UNLEGISLATED.growth,
        attribution: NO_STATING_ENTRY.growth,
      });

// --- P5-3 limb 2 / P5-4: the provenance a line carries ------------------------------------------
//
// **What this closes.** Thirteen core modules return a `ComputedProvenance`, and until this item
// `projection.ts` computed `householdIncomeTax(...).provenance` every month and threw it away — the
// value was manufactured ~580 times a walk and reached nobody. ADR-0006 makes provenance a hard
// gate on output and writes the citation PER ROW ("month table, Mar-2034, Age Pension row, from the
// assets test"), so the record goes on the `MonthLine` and is merged upward to the `Month`, not the
// other way about.
//
// **Every line carries one and none may omit it.** See `LineProvenance`: a figure with no register
// behind it says so, a figure with one that this build does not carry says *that*, and the three
// are different facts.

/**
 * The `'none'` records, one per family of line. Frozen module constants rather than object literals
 * at the emit sites: the same note appears in ~580 months, so one object is shared by every line
 * that means it and a change to the wording cannot reach half the walk.
 */
export const UNLEGISLATED = Object.freeze({
  salary: Object.freeze({ basis: 'none', note: 'A salary stated by the Scenario in today’s wages and raised each month by the plan’s wage growth (AWOTE) Setting; no register figure stands behind it.' } as const),
  growth: Object.freeze({ basis: 'none', note: 'A Setting-supplied return applied to a stated balance; no register figure stands behind it.' } as const),
  spending: Object.freeze({ basis: 'none', note: 'A spending level stated by the Scenario; no register figure stands behind it.' } as const),
  oneOff: Object.freeze({ basis: 'none', note: 'A one-off amount stated by the Scenario; no register figure stands behind it.' } as const),
  shortfall: Object.freeze({ basis: 'none', note: 'An accounting residual — what the Waterfall could not fund; no register figure stands behind it.' } as const),
  portfolioSale: Object.freeze({ basis: 'none', note: 'A disposal of stated parcels at stated values; the tax on the gain is its own line and carries the register.' } as const),
  portfolioPurchase: Object.freeze({ basis: 'none', note: 'A purchase amount stated by the Scenario; no register figure stands behind it.' } as const),
  brokerage: Object.freeze({ basis: 'none', note: 'A brokerage rate stated as a Setting; no register figure stands behind it.' } as const),
  // **P14-13 — the RAD lump sum itself is a market fact the household agreed with the facility
  // (`plan.ts`'s `EnterCareParams` doc), unlike the FEES `agedCareProvenance` computes from it —
  // the price is stated, never legislated.**
  agedCareRad: Object.freeze({ basis: 'none', note: 'A Refundable Accommodation Deposit lump sum stated by the Scenario\'s ENTER_CARE entry, agreed with the facility; no register figure stands behind the price itself. The FEES it feeds carry the Aged Care register.' } as const),
  // **P14-16 — the refund is the same unlegislated price, returned.** What IS legislated — that the
  // deposit is refundable, and by how much retention may reduce it — is the Aged Care register's own
  // fact, carried by the retention line's provenance and not repeated here.
  agedCareRadRefund: Object.freeze({ basis: 'none', note: 'The balance of a Refundable Accommodation Deposit, returned to household cash on the resident’s death, less any retention withheld; no register figure stands behind the RAD price itself. The retention deducted from it carries the Aged Care register on its own line.' } as const),
  // **P3-17 — and the note's job is to keep this apart from the two charges that DO carry a
  // register.** A fund deducts contributions tax and fund earnings tax as well as its fees, and all
  // three fall on a superannuation balance; only the fees are a commercial price with nothing
  // legislated behind them. A reader who saw `basis: 'none'` with a generic note could not tell
  // which of the three they were looking at, so the note names the other two by exclusion.
  superFees: Object.freeze({ basis: 'none', note: 'A fee the fund charges, stated on the account from the member’s own statement; no register figure stands behind it. It is not the fund’s 15% contributions tax and not the 15% earnings tax — those are legislated and carry their own registers.' } as const),
  // P3-17a slice 1.
  superInsurance: Object.freeze({ basis: 'none', note: 'Death, TPD and income protection premiums stated on the account from the member’s own statement, carried to each later age by the ratio of Aware Super’s published age-rated premium tables (Insurance Handbook, pp.17-18 for death and TPD; p.20 for income protection, in the stated benefit period’s column), plus the fund’s insurance administration fee. The premium tables are the fund’s own nominal schedule, so the premiums are NOT raised by CPI; the administration fee is. Death and TPD cover, and so their charge, each end at the age the account states for them, from the fund’s own insurance terms, or at 70 where none is stated; income protection ends at 65. The administration fee is charged while any one of the three premiums is. All of it, the administration fee included, ends for good in the month the account becomes a retirement-phase account-based pension, because the fund offers cover on its accumulation account only (Insurance Handbook, 30 April 2026; user ruling 2026-09-28); a transition-to-retirement stream keeps it until it converts. No register figure stands behind any of it.' } as const),
  automaticSuperWithdrawal: Object.freeze({ basis: 'none', note: 'An automatic Waterfall draw on released superannuation; no register figure stands behind the amount, which is what the four limbs above it could not meet. What §3.9 governs is whether it may be paid at all and what it is taxed at — the gate is conditionOfRelease’s and the tax is nil, reported in the month’s super withdrawal note.' } as const),
  superLumpSum: Object.freeze({ basis: 'none', note: 'A withdrawal amount stated by the Scenario; no register figure stands behind the amount. What §3.9 governs is whether it may be paid at all and what it is taxed at — the gate is conditionOfRelease’s and the tax is nil, reported in the month’s super withdrawal note.' } as const),
  // **P12-1 — the amount is the deceased's balances and nothing legislates a balance; the TAX is
  // legislated, and it is nil**, which is why the note names the section rather than a register row.
  superDeathBenefit: Object.freeze({ basis: 'none', note: 'Every one of the deceased’s superannuation balances, cashed as one lump sum in the month of the death; no register figure stands behind the amount. Paid to a spouse, a death benefits dependant, it is tax-free (ITAA 1997 s 302-60) and has no transfer balance account effect, because a lump sum is not an income stream.' } as const),
  // **P3-16 — a commercial loan at a commercial price, and the note has to keep it apart from the
  // one charge on this page that IS legislated.** A user reading a "Mortgage repayment — interest"
  // row beside an "Income tax" row must be able to tell which figure a register decided. Nothing
  // legislates a mortgage rate: the lender sets it and the user types it.
  mortgage: Object.freeze({ basis: 'none', note: 'A home-loan balance, rate and repayment stated by the household from its own loan statement; no register figure stands behind any of them. The interest is charged on the balance less the offset account, at a twelfth of the stated annual rate.' } as const),
  // **P3-19 — the transfer itself carries no register figure; the tax OFFSET it can earn is a
  // separate line, computed by `incomeTax.ts` and reported at the financial year's own true-up.**
  spouseContribution: Object.freeze({ basis: 'none', note: 'An after-tax contribution amount stated by the Scenario, paid into the receiving spouse’s own superannuation interest; no register figure stands behind the amount. The tax offset it may earn (ITAA 1997 Subdiv 290-D) is computed separately and reported on the year-end true-up line, not here.' } as const),
  cashInterest: Object.freeze({ basis: 'none', note: 'Interest on the running cash above what is owed on the home loan, at the plan’s cash interest rate or, where none is stated, its CPI figure; no register figure stands behind the rate. Split by the offset account’s stated ownership shares, assessable income of each owner, and not Age Pension income — the cash itself is deemed.' } as const),
  // **P14-13 — the sale price and selling costs are the household's own market estimate, `agedCareRad`'s
  // own reason; the mortgage repaid from the proceeds is `mortgage`'s own commercial-price note.**
  // What the sale changes for the Age Pension (homeowner status) and CGT (the home was never a CGT
  // asset, ADR-0005) is not a figure on this line at all — nothing here charges either.
  homeSale: Object.freeze({ basis: 'none', note: 'The household’s own estimate of what the home would sell for, less its own estimate of the selling costs, less any mortgage still owing; no register figure stands behind any of the three. The main residence CGT exemption applies in full (ITAA 1997 Subdiv 118-B) — there is no CGT parcel for a home to begin with — so no capital gain line is ever produced.' } as const),
  // **P14-13 — the weekly rent and the four yearly costs are the household's own market estimate,
  // `homeSale`'s own reason.** What the rent changes for tax, the Age Pension and aged care is
  // computed separately (`UNLEGISLATED.salary`'s own "the figure is a fact, the tax on it is a
  // separate line" split) and is not itself a figure on this line.
  downsizerContribution: Object.freeze({ basis: 'none', note: 'The household’s own downsizer contribution from a home sale, stated in today’s money; no register figure stands behind the amount. It is not deductible (ITAA 1997 s 290-167), so the fund takes no contributions tax, and it counts towards neither contributions cap (s 292-90(2)(c)(iiia)). It enters the Total Superannuation Balance through the balance at the next 30 June.' } as const),
  homePurchase: Object.freeze({ basis: 'none', note: 'The household’s own estimate of the new home’s price and of the stamp duty and fees on buying it; no register figure stands behind either. The home is exempt again from the month it is bought, so neither figure is an assessable asset.' } as const),
  rentOutHome: Object.freeze({ basis: 'none', note: 'The household’s own estimate of the weekly rent and the yearly council rates, insurance, agent’s fees and repairs; no register figure stands behind any of the five. Net of the four costs, this is assessable income for tax and for the Age Pension and aged-care means tests — never deemed — and a net loss is floored at nil for the two means tests but not for tax.' } as const),
}) satisfies Readonly<Record<string, UnlegislatedFigure>>;

/**
 * **The one `'not carried'` record in the build, and it is named rather than generic.** The payment
 * line carries the year's Schedule 7 minimum and the Waterfall's own draw as one payment, which is
 * what a fund actually pays; `annualPensionMinimum` returns `minimumDrawdown(...).amount` and drops
 * the `ComputedProvenance` beside it, so no stamp can reach here without changing that signature.
 */
export const PENSION_MINIMUM_PROVENANCE: UncarriedProvenance = Object.freeze({
  basis: 'not carried',
  register: 'Account-Based Pension minimum',
  note: 'Schedule 7 governs the minimum and this payment also carries what the Waterfall drew; annualPensionMinimum returns the amount without minimumDrawdown’s provenance, so no stamp reaches the line.',
});

/**
 * **A TTR payment's record, `'not carried'` for `PENSION_MINIMUM_PROVENANCE`'s reason** — the
 * Schedule 7 floor inside it comes through `annualPensionMinimum`, which drops `minimumDrawdown`'s
 * provenance — and it carries the tax nil and the taxed-source assumption under it, because no tax
 * line is written beside the payment and silence about a tax is not a tax of nil.
 */
export const TTR_PAYMENT_PROVENANCE: UncarriedProvenance = Object.freeze({
  basis: 'not carried',
  register: 'transition to retirement income stream',
  note:
    'The year’s payment is the stated drawdown rate on the relevant-day balance, or the Schedule 7 minimum where that is more or no rate is stated, and never more than the SISR reg 6.01(2)(b)(ii) 10% ceiling; annualPensionMinimum returns the minimum without minimumDrawdown’s provenance, so no stamp reaches the line. ' +
    TTR_PAYMENT_TAX_NOTE,
});

/**
 * **Past the published window the Age Pension parameters are a FORECAST, and they arrive saying so.**
 * `agePensionPeriodsThrough` runs §4.7's mechanism over a CPI/PBLCI/MTAWE series — the caller's own
 * where one is stated, and otherwise the one `project()` generates from the plan's growth rates
 * (2026-09-23). Register O5 makes either a Setting, with no confidence of its own, so an indexed
 * period is `unverified` here, the weakest rank, and every pension figure computed from one says
 * which series made it weak: the two keys below name WHO made the claim, and are never swapped.
 */
const AGE_PENSION_FORWARD_SERIES: ProvenanceBearing = Object.freeze({ confidence: 'unverified' });
const AGE_PENSION_FORWARD_KEY = 'economic.agePension (the caller-stated forward indexation series, register O5)';
/** The same forecast rank, and a different claim: nobody stated this series, the walk generated it. */
const AGE_PENSION_GENERATED_KEY =
  "economic.agePension (not stated — generated from this plan's cpi, pblci and mtawe growth rates and agePension.indexation.mtaweAnchor, register O5 / O14)";

/**
 * **The series a plan that states none is walked on, one object per rates-and-horizon.** Identity
 * matters: `agePensionPeriodsThrough` caches its chain on the series object, so a fresh object per
 * walk would rebuild the chain per walk. Built through the horizon's LAST day and the chain warmed
 * to it once, so no month of the walk extends it.
 */
const GENERATED_SERIES = new Map<string, AgePensionIndexationSeries>();

const generatedAgePensionSeries = (settings: Settings, lastMonth: IsoMonth): AgePensionIndexationSeries => {
  const { cpi, pblci, mtawe } = settings.economicSeries;
  const [year, month] = lastMonth.split('-').map(Number) as [number, number];
  const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const days = month === 2 ? (leap ? 29 : 28) : [4, 6, 9, 11].includes(month) ? 30 : 31;
  const through = `${lastMonth}-${days}` as IsoDate;
  const key = `${cpi}|${pblci}|${mtawe}|${through}`;
  const held = GENERATED_SERIES.get(key);
  if (held !== undefined) return held;
  const series = defaultAgePensionSeries({ cpi, pblci, mtawe }, through);
  agePensionPeriodsThrough(series, through);
  GENERATED_SERIES.set(key, series);
  return series;
};

/**
 * **WHICH TEST BOUND, in words — the third claim in ADR-0006's citation sentence.** It is read off
 * `AgePensionEntitlement.bindingTest`, which `agePension.ts` derives from the two rates rather than
 * asserting, so this cannot disagree with the figure it describes.
 */
const bindingTestSentence = (binding: AgePensionEntitlement['bindingTest']): string =>
  binding === 'neither'
    ? 'neither test bound — the maximum payment rate is payable'
    : binding === 'both'
      ? 'the income and assets tests bound equally'
      : `the ${binding} test bound`;

/** The Age Pension line's record: the two parameter sets it consumed, and which test decided it. */
const agePensionProvenance = (fy: FinancialYear, entitlement: AgePensionEntitlement, seriesGenerated: boolean): FigureProvenance => {
  // `AgePensionEntitlement` widens both keys to `string`, and a forward-indexed period's key is
  // genuinely not in either table, so the lookup is typed as the partial record it is.
  const paymentRates: Readonly<Record<string, ProvenanceBearing | undefined>> = AGE_PENSION.paymentRates;
  const meansTests: Readonly<Record<string, ProvenanceBearing | undefined>> = AGE_PENSION.meansTest;
  const rates = paymentRates[entitlement.ratesEffective];
  const meansTest = meansTests[entitlement.meansTestEffective];
  const consumed: Consumed[] = [];
  // A forward-indexed period has no record under either key, and BOTH are then forecasts. The
  // published and the indexed cases are not mixed: the assembly indexes the two calendars together.
  if (rates === undefined || meansTest === undefined) {
    consumed.push([seriesGenerated ? AGE_PENSION_GENERATED_KEY : AGE_PENSION_FORWARD_KEY, AGE_PENSION_FORWARD_SERIES]);
  }
  if (rates !== undefined) consumed.push([`agePension.paymentRates.${entitlement.ratesEffective}`, rates]);
  if (meansTest !== undefined) consumed.push([`agePension.meansTest.${entitlement.meansTestEffective}`, meansTest]);
  const own = provenanceOf(fy, consumed);
  // **THE CARRIED-FORWARD CAVEAT (P4-1e).** `rates effective 2026-09-20` is true of a month in 2045
  // and says nothing about the distance, because the carried set IS the published one — so without
  // this the line's own provenance would read exactly as a September 2026 line's does. It is a
  // caveat and not a confidence downgrade: the records consumed are the published ones and their
  // confidence is unchanged; what is uncertain is their APPLICABILITY to this date, which is a
  // different axis and is the one caveats carry (the same separation `standingLawFrom` makes).
  const carried =
    entitlement.standingFrom === undefined
      ? []
      : [
          `agePension.paymentRates.${entitlement.ratesEffective} and agePension.meansTest.` +
            `${entitlement.meansTestEffective} are the last PUBLISHED sets, in force on ` +
            `${entitlement.standingFrom} and carried forward unchanged to ${entitlement.date} — ` +
            'nobody has published parameters for this date, and the direction is the conservative ' +
            'one: a standing Age Pension is AT MOST the legislated one',
        ];
  return Object.freeze({
    basis: 'legislated',
    register: 'Age Pension',
    fy,
    confidence: own.confidence,
    caveats: Object.freeze([...own.caveats, ...carried]),
    determination: Object.freeze([
      bindingTestSentence(entitlement.bindingTest),
      `rates effective ${entitlement.ratesEffective}`,
      `means test effective ${entitlement.meansTestEffective}`,
      ...(entitlement.standingFrom === undefined ? [] : [`carried forward from ${entitlement.standingFrom}`]),
    ]),
  });
};

/**
 * **P12-1 — the bereavement payment's record: both rates' Age Pension records, plus the formula's.**
 * The couple rate and the single rate are each a means-test figure with its own stamp, and the lump
 * sum is a formula over the pair, so it carries the weaker of all three — and says in its
 * determination that NDEP is a declared bound, which no register record can say for it.
 */
const bereavementProvenance = (
  fy: FinancialYear,
  couple: AgePensionEntitlement,
  single: AgePensionEntitlement,
  seriesGenerated: boolean,
): FigureProvenance => {
  const coupleRecord = agePensionProvenance(fy, couple, seriesGenerated);
  const singleRecord = agePensionProvenance(fy, single, seriesGenerated);
  const formula = provenanceOf(fy, [
    ['agePension.bereavement.lumpSumFormula', AGE_PENSION.bereavement.lumpSumFormula],
    ['agePension.bereavement.whoIsPaid', AGE_PENSION.bereavement.whoIsPaid],
  ]);
  if (coupleRecord.basis !== 'legislated' || singleRecord.basis !== 'legislated') throw new RangeError('an Age Pension record is always legislated');
  const merged = mergeProvenance({ fy, confidence: coupleRecord.confidence, caveats: coupleRecord.caveats }, { fy, confidence: singleRecord.confidence, caveats: singleRecord.caveats }, formula);
  return Object.freeze({
    basis: 'legislated',
    register: 'Age Pension',
    fy,
    confidence: merged.confidence,
    caveats: merged.caveats,
    determination: Object.freeze([
      `SS Guide 3.1.5.70: 6 × (couple rate − single rate) + NDEP × (couple rate − single rate) / 14, per fortnight`,
      `couple rate ${couple.householdRatePerFortnight} cents a fortnight, as the two would have been paid had both lived: ${bindingTestSentence(couple.bindingTest)}`,
      `single rate ${single.householdRatePerFortnight} cents a fortnight: ${bindingTestSentence(single.bindingTest)}`,
      `NDEP taken at ${BEREAVEMENT_DAYS_TO_PERIOD_END}, its least value: the days to the end of the entitlement period need a payday calendar this walk does not have, so the payment is never overstated`,
    ]),
  });
};

/**
 * A tax register's line record, straight off the `ComputedProvenance` the assessment returned.
 *
 * **`computed.fy` and never the month's own year.** The year-end true-up is assessed under the
 * parameters of the year the walk LEFT, so its stamp is that year — which is the whole reason
 * `FigureProvenance.fy` exists instead of a `Month.financialYear`. Taking the stamp from anywhere
 * but the assessment that produced the figure would put the current year's name on the old year's
 * arithmetic.
 */
const taxProvenance = (
  register: ProvenanceRegister,
  computed: ComputedProvenance,
  determination: readonly string[] = [],
): FigureProvenance =>
  Object.freeze({
    basis: 'legislated',
    register,
    fy: computed.fy,
    confidence: computed.confidence,
    caveats: computed.caveats,
    determination: Object.freeze([...determination]),
  });

/**
 * **P14-17 — a generated (not published) aged care schedule is a FORECAST, and says so.**
 * `agePensionProvenance`'s `AGE_PENSION_GENERATED_KEY` precedent exactly: nobody published a
 * schedule for this date, `agedCareScheduleThrough` generated it from this plan's own CPI growth
 * rate and the walk's own projected Age Pension single maximum basic rate, and the confidence that
 * makes true is `unverified`, the weakest rank.
 */
const AGED_CARE_FORWARD_SERIES: ProvenanceBearing = Object.freeze({ confidence: 'unverified' });
const AGED_CARE_GENERATED_KEY =
  "agedCare.indexation.mechanism (not published — generated from this plan's own cpi growth rate and " +
  "the walk's projected Age Pension single maximum basic rate, register §12.3/O5)";

/**
 * **P14-13, slice 3a — the Aged Care register's line record**, `agePensionProvenance`'s own shape
 * for a second, structurally independent test (`agedCare.ts`'s header). Consumes the residential
 * schedule and the MPIR in force for `period`, plus the three rate/order constants
 * `agedCareMeansAssessment`/`agedCareFees`/`agedCareRadRetentionDeduction` read unconditionally —
 * the same records every aged care line in a month shares, so one call serves the RAD payment, the
 * RAD retention line (P14-16) and every fee line alike.
 *
 * ⚠️ **P14-17 — `schedule` MAY BE `undefined` NOW, and that is no longer a bug.** A period past the
 * one published year has no entry under `AGED_CARE.residentialSchedule` because it was generated,
 * not published — `agePensionProvenance`'s own branch for the identical case. `mpirRecord` still
 * cannot be missing: the MPIR table is never extended (`agedCarePeriodsThrough`'s own doc), so
 * `period.mpirEffective` always resolves to a key the STATIC table holds, and its absence would be a
 * real bug in the merge, not a generated period.
 */
const agedCareProvenance = (fy: FinancialYear, period: AgedCarePeriod): FigureProvenance => {
  const schedule = AGED_CARE.residentialSchedule[period.scheduleEffective];
  const mpirRecord = AGED_CARE.mpir[period.mpirEffective];
  if (mpirRecord === undefined) {
    throw new RangeError(`no aged care MPIR provenance record at ${period.mpirEffective}`);
  }
  const consumed: Consumed[] =
    schedule === undefined
      ? [[AGED_CARE_GENERATED_KEY, AGED_CARE_FORWARD_SERIES]]
      : [[`agedCare.residentialSchedule.${period.scheduleEffective}`, schedule]];
  consumed.push(
    [`agedCare.mpir.${period.mpirEffective}`, mpirRecord],
    ['agedCare.meansTestTaper', AGED_CARE.meansTestTaper],
    ['agedCare.feeWaterfallOrder', AGED_CARE.feeWaterfallOrder],
    ['agedCare.radRetention', AGED_CARE.radRetention],
  );
  const computed = provenanceOf(fy, consumed);
  return Object.freeze({
    basis: 'legislated',
    register: 'Aged care',
    fy: computed.fy,
    confidence: computed.confidence,
    caveats: computed.caveats,
    determination: Object.freeze([
      `schedule effective ${period.scheduleEffective}`,
      `MPIR effective ${period.mpirEffective}`,
      ...(schedule === undefined
        ? [
            "the residential schedule for this date is PROJECTED, not published — generated from this " +
              "plan's own CPI growth rate and the walk's projected Age Pension single maximum basic rate",
          ]
        : []),
    ]),
  });
};

/**
 * **P9-1, slice 1 — the Home Equity Access Scheme register's line record**, `agedCareProvenance`'s
 * own shape for a THIRD, structurally independent register (register §5, ProvenanceRegister's own
 * doc on why 'Home Equity Access Scheme' is not filed under 'Age Pension' even though the
 * fortnightly cap reads a Maximum Payment Rate that register produces). Consumes the interest rate,
 * the fortnightly cap multiple and the capacity formula unconditionally — the three every HEAS line
 * in a month shares — and adds one caveat by hand for `securityValue`, which none of those three
 * records carries: it is the user's own ESTIMATE (ADR-0005, T42) and has no `confidence` field to
 * fold in, so it is named explicitly rather than silently read as sourced.
 */
const heasProvenance = (fy: FinancialYear): FigureProvenance => {
  const computed = provenanceOf(fy, [
    ['heas.interest.rate', HEAS.interest.rate],
    ['heas.interest.compoundingPerYear', HEAS.interest.compoundingPerYear],
    ['heas.drawModes.fortnightlyCapMultiple', HEAS.drawModes.fortnightlyCapMultiple],
    ['heas.capacity.formula', HEAS.capacity.formula],
    ['heas.capacity.securityRounding', HEAS.capacity.securityRounding],
  ]);
  return Object.freeze({
    basis: 'legislated',
    register: 'Home Equity Access Scheme',
    fy: computed.fy,
    confidence: computed.confidence,
    caveats: Object.freeze([
      ...computed.caveats,
      'heas.capacity.securityValue is the user\'s own estimate of the home\'s market value, with no source and no confidence rating (ADR-0005, register T42)',
    ]),
    determination: Object.freeze(['SS Act Pt 3.12 Div 4', 'F2026L00945 (3.95%, compounding fortnightly)']),
  });
};

/**
 * **The month's record, merged upward — and merging is a UNION, never a flattening.**
 *
 * The caveats are set-unioned as strings, so P5-4a's borrowed Medicare thresholds arrive at the
 * `Month` in the same sentence `provenanceOf` wrote — *"…carried as a prior-year fallback for
 * FY2026-27 — no FY2026-27 figure exists"*. That sentence and the ordinary out-of-year one
 * ("…was applied to FY…") come from mutually exclusive branches of `provenanceOf`, so a borrowed
 * figure cannot acquire the ordinary wording on the way up, and a union cannot drop it.
 *
 * `confidence` is the WEAKEST of the carried lines, computed with `mergeProvenance` rather than by a
 * second ordering written here — one `CONFIDENCE_ORDER` in the build, and `rank` throws rather than
 * ranking an unknown value as stronger than primary-verified.
 */
const monthProvenance = (lines: readonly MonthLine[]): MonthProvenance => {
  const carried = lines.map((line) => line.provenance).filter((p): p is FigureProvenance => p.basis === 'legislated');
  const uncarried = lines
    .map((line) => line.provenance)
    .filter((p): p is UncarriedProvenance => p.basis === 'not carried')
    .map((p) => p.register);
  const first = carried[0];
  const merged =
    first === undefined
      ? undefined
      : mergeProvenance(
          { fy: first.fy, confidence: first.confidence, caveats: first.caveats },
          ...carried.slice(1).map((p) => ({ fy: p.fy, confidence: p.confidence, caveats: p.caveats })),
        );
  return Object.freeze({
    registers: Object.freeze([...new Set(carried.map((p) => p.register))]),
    uncarried: Object.freeze([...new Set(uncarried)]),
    stamps: Object.freeze([...new Set(carried.map((p) => p.fy))].sort()),
    confidence: merged === undefined ? 'nothing carried' : merged.confidence,
    caveats: merged === undefined ? Object.freeze([]) : merged.caveats,
  });
};

// --- P5-3: the ENTRIES a line is attributed to --------------------------------------------------
//
// **What this closes.** `Month.appliedEntryIds` cites every entry that GOVERNS a month — since P4-4
// that includes a `SPEND_CHANGE` dated 2019 standing behind month 200 — and a month citing eight ids
// left the reader of one row to guess which of them set it. The id was already in scope at the emit
// site; this is what carries it to the line.
//
// **THE RULE, stated once so that fifteen emit sites cannot each take their own.** A line is
// attributed to the entries whose STATEMENT IS THE FIGURE — the entry whose params are the amount,
// or whose supersession decided that the line exists at all. It is NOT attributed to every entry in
// the causal chain: the wide rule ends with the spending level cited on the shortfall, the portfolio
// sale, the pension payment and the capital-gains charge of every month, which is an attribution
// that distinguishes nothing and would make the field a second, noisier `appliedEntryIds`.
//
// **What the narrow rule costs, recorded rather than hidden.** A limb-3 sale and a shortfall read
// `'none'`, and a reader who wants to know WHY the Household was short must read the spending line
// of the same month. That is a real limitation and it is the reason `UnstatedFigure.note` says what
// decided the figure instead, rather than merely saying that nothing did.

/**
 * The `'none'` records, one per family of line — frozen module constants for `UNLEGISLATED`'s
 * reason: the same sentence appears in hundreds of months and one object must carry all of them.
 */
export const NO_STATING_ENTRY = Object.freeze({
  agePension: Object.freeze({ basis: 'none', note: 'A legislated entitlement: the means test decides it and no Journal Entry states an Age Pension.' } as const),
  salary: Object.freeze({ basis: 'none', note: 'The Person’s stated employment income; no Entry type in this model states a salary, and none was in force to stop it.' } as const),
  incomeTax: Object.freeze({ basis: 'none', note: 'Assessed on the Person’s stated employment income; no entry was in force over the pattern that produced it.' } as const),
  growth: Object.freeze({ basis: 'none', note: 'A Setting-supplied return applied to a stated balance; no Journal Entry states a return.' } as const),
  automaticPortfolioSale: Object.freeze({ basis: 'none', note: 'An automatic Waterfall draw against the month’s target — no entry states this sale. The target’s own entry is on the spending line of this month.' } as const),
  automaticSuperWithdrawal: Object.freeze({ basis: 'none', note: 'An automatic Waterfall draw on released superannuation against the month’s target — no entry states this withdrawal. The target’s own entry is on the spending line of this month.' } as const),
  superannuationGuarantee: Object.freeze({ basis: 'none', note: 'A legislated employer obligation: SGAA s 17A(2) charges it on the Person’s own qualifying earnings, and no Entry type in this model states a Superannuation Guarantee — a stated one would be a second copy of a figure this engine derives.' } as const),
  division293Tax: Object.freeze({ basis: 'none', note: 'A legislated charge on the Person’s own income and their own low tax contributions: ITAA 1997 s 293-20 decides it and no Entry type in this model states a Division 293 liability. The salary-sacrifice entry that produced part of the contributions, where there is one, is on this month’s own lines.' } as const),
  shortfall: Object.freeze({ basis: 'none', note: 'An accounting residual — what the month could not fund. No entry states it; the entries that set the target are on this month’s own lines.' } as const),
  // **P3-17 — a fee is a standing fact about the ACCOUNT, and no Entry type in this model states
  // one.** It is `growth`'s situation exactly: the figure is stated on the `SuperInterest` and
  // applied every month of the walk, so there is no entry to name and none was in force to stop it.
  // P3-17a slice 3's `INSURANCE_COVER_CHANGE` attributes the insurance line to itself while it is in
  // force (`statedBy`); this record is the line with no change in force.
  superFees: Object.freeze({ basis: 'none', note: 'A fee rate and dollar charge stated on the superannuation interest itself; no Entry type in this model states or changes a fee.' } as const),
  superInsurance: Object.freeze({ basis: 'none', note: 'Insurance premiums stated on the superannuation interest itself; no INSURANCE_COVER_CHANGE is in force for it.' } as const),
  // **P3-42 step 2 — `superFees`'s shape exactly, and NOT a true-up.** A rate applied to a balance
  // the walk already holds, charged once a year with no monthly pre-accrual to reconcile against —
  // unlike the income-tax and Division 293 true-ups, which merge twelve months of ENTRY-STATED
  // salary and contributions against a single annual assessment. No Entry type in this model states
  // or changes a fund earnings tax, in any month, so `'none'` is the honest answer and not a merge.
  superEarningsTax: Object.freeze({ basis: 'none', note: 'A legislated charge on the interest’s own income share: register §3.1 (ITAA 1997 ss 295-385, 295-390) decides it and no Entry type in this model states or changes a fund earnings tax.' } as const),
  // **P3-16 — the mortgage as a standing fact about the HOUSEHOLD, and this record is now the
  // NARROWER of two cases.** Slice 1's sentence — *"`MORTGAGE_REFINANCE` and `MORTGAGE_TARGET` are
  // both `UnspecifiedParams`, so no entry in this build can change a loan"* — is SUPERSEDED for the
  // first of the two: slice 2 specifies it, and a repayment governed by one is attributed to that
  // entry with `statedBy`. This record is what remains — a loan stated on the Household itself with
  // no entry in force over it — and the note says exactly that rather than the old absolute.
  mortgage: Object.freeze({ basis: 'none', note: 'A home loan stated on the household itself, with no entry in force over it: none has been stated that changes this loan, so the repayment is the one the household gave.' } as const),
  // A TTR payment's rate is stated on the superannuation interest itself, or absent and the
  // Schedule 7 minimum paid — `superFees`' situation: a standing fact about the account.
  ttrPayment: Object.freeze({ basis: 'none', note: 'A transition to retirement income stream payment at the drawdown rate stated on the superannuation interest itself, or its Schedule 7 minimum where none is stated; no Entry type in this model states or changes a TTR payment.' } as const),
  cashInterest: Object.freeze({ basis: 'none', note: 'Interest at a rate stated in the plan’s settings, on a balance the walk carries; no Entry type in this model states or changes it.' } as const),
}) satisfies Readonly<Record<string, UnstatedFigure>>;

/**
 * The `'not attributed'` records. All three lines MERGE something an entry states with something no
 * entry states, or aggregate across months the walk no longer holds the causes of; see
 * `UnattributedFigure` for why neither of the other two members would be true of them.
 */
export const UNATTRIBUTED = Object.freeze({
  capitalGainsTax: Object.freeze({
    basis: 'not attributed',
    note: 'Charged as the increment one disposal added to the YEAR’s accumulated net capital gain; the accumulator holds realisations from earlier months and from automatic draws, and not the entries behind them.',
  } as const),
  taxTrueUp: Object.freeze({
    basis: 'not attributed',
    note: 'Assessed on twelve months of salary, whose movements only an entry can cause; taxYearToDate accumulates the figures and not the entries that moved them.',
  } as const),
  division293TrueUp: Object.freeze({
    basis: 'not attributed',
    note: 'Assessed on twelve months of salary AND twelve months of concessional contributions, whose movements only an entry can cause; taxYearToDate accumulates the figures and not the entries that moved them.',
  } as const),
  pensionMinimum: Object.freeze({
    basis: 'not attributed',
    note: 'One payment merging a Schedule 7 minimum no entry states with a draw to a target an entry does state; the line carries no split, and half a line is not attributable.',
  } as const),
}) satisfies Readonly<Record<string, UnattributedFigure>>;

/**
 * **The ONLY constructor of an attributed line, and it REFUSES an empty list.**
 *
 * `StatedByEntries.entryIds` is specified as never empty, and a specification a caller can violate
 * by passing `[]` is the conflation this union exists to end — an empty array would read as "no
 * entry" to one consumer and "we did not work it out" to the next. The refusal is a `RangeError`
 * rather than a silent fall-back to `'none'`, because falling back would answer the question wrongly
 * and quietly, which is the one direction this field must never be wrong in.
 */
export const statedBy = (...entryIds: readonly string[]): StatedByEntries => {
  if (entryIds.length === 0) {
    throw new RangeError('an attributed line names at least one entry: use NO_STATING_ENTRY or UNATTRIBUTED');
  }
  return Object.freeze({ basis: 'entries', entryIds: Object.freeze([...entryIds]) });
};

/**
 * What one Account-Based Pension interest can supply this month, and which interest it is.
 *
 * `available` is the ACCOUNT BALANCE (`pensionAvailableThisMonth`): the Schedule sets a floor on what
 * must be paid and no ceiling on what may be drawn. `towardMinimum` is the part of it that is still
 * owed of this financial year's minimum — `min(balance, remaining)` — and it is where the two
 * pension limbs split the account: the first offers `towardMinimum`, the second the rest.
 */
export interface PensionClaim {
  readonly personIndex: number;
  readonly slot: number;
  readonly available: Cents;
  readonly towardMinimum: Cents;
}

/**
 * **The first pension limb's `WaterfallSource`: what is still owed of this year's minimum.** Drawn
 * straight after salary, because that money leaves the pension by 30 June whether or not it is
 * needed. The rest of each account is `accountBasedPensionAboveMinimumLimb`'s.
 *
 * A nil where an account still holds money means the year's minimum is already paid, and says so;
 * every other nil delegates to `unfundedMiddleLimbs`, so the three kinds of "no pension to draw"
 * are stated in exactly one place.
 *
 * **What this limb does NOT carry: the minimum that must be paid when nobody needs it.** That is
 * `minimumStillDueThisMonth`, swept after the Waterfall has run, because a `WaterfallSource` can
 * only offer money toward a target, and that payment is made whether or not there is a target left
 * to meet.
 */
export const accountBasedPensionMinimumLimb = (
  household: Household,
  fy: FinancialYear,
  claims: readonly PensionClaim[],
): WaterfallSource => {
  const available = claims.reduce<number>((total, claim) => total + claim.towardMinimum, 0) as Cents;
  return Object.freeze({
    available,
    note:
      available > 0
        ? `what is still owed of the Account-Based Pension's minimum for FY${fy}: it has to be paid by 30 June whether or not it is needed, so it is spent first, after salary`
        : claims.length > 0
          ? `the Account-Based Pension's minimum for FY${fy} is already paid in full: the rest of the account is still there to draw, after cash and investments`
          : unfundedMiddleLimbs(household).accountBasedPensionMinimum.note,
  });
};

/**
 * **The second pension limb's `WaterfallSource`: the balance above what is still owed of the
 * minimum.** The minimum is a FLOOR and not a cap (2026-09-17), so the whole of what is left is
 * offered — after cash not offsetting the loan and after the portfolio (`WATERFALL_LIMBS`).
 */
export const accountBasedPensionAboveMinimumLimb = (
  household: Household,
  fy: FinancialYear,
  claims: readonly PensionClaim[],
): WaterfallSource => {
  const available = claims.reduce<number>((total, claim) => total + claim.available - claim.towardMinimum, 0) as Cents;
  return Object.freeze({
    available,
    note:
      available > 0
        ? `the Account-Based Pension balance above what is still owed of its minimum for FY${fy}: the minimum is a floor and not a cap, so the rest of the account can be drawn, after cash and investments`
        : claims.length > 0
          ? `all that is left in the Account-Based Pension is still owed as its minimum for FY${fy}, and it is offered first, straight after salary`
          : unfundedMiddleLimbs(household).accountBasedPensionMinimum.note,
  });
};

/**
 * **The two cash limbs' `WaterfallSource`s, split at what is owed on the home loan.** `cash` is the
 * Waterfall's running cash this month; `loanOwing` is the SAME figure the interest on running cash is
 * paid above, so the dollars spent early here are exactly the dollars that earn the cash rate, and
 * the dollars kept back are exactly the ones cancelling loan interest. Together the two offer the
 * whole of `cash`.
 */
export const cashLimbs = (cash: Cents, loanOwing: Cents): Pick<WaterfallSources, 'cashAboveLoan' | 'offsetAccount'> => {
  const above = Math.max(0, cash - loanOwing) as Cents;
  const offsetting = (cash - above) as Cents;
  return Object.freeze({
    cashAboveLoan: Object.freeze({
      available: above,
      note:
        above > 0
          ? loanOwing > 0
            ? 'running cash above what is owed on the home loan: it earns only the cash rate, so it is spent before any investment is sold'
            : 'running cash, with no home loan owing for it to offset: it earns only the cash rate, so it is spent before any investment is sold'
          : cash > 0
            ? 'all of the running cash is offsetting the home loan, so none of it is spent this early'
            : 'no running cash this month',
    }),
    offsetAccount: Object.freeze({
      available: offsetting,
      note:
        offsetting > 0
          ? 'running cash that is offsetting the home loan: each dollar cancels a dollar of loan interest, so it is spent only after investments and the rest of the pension'
          : loanOwing > 0
            ? 'no running cash this month to offset the home loan'
            : 'no home loan is owing, so no cash is offsetting one: all of it is offered earlier, as cash not offsetting the loan',
    }),
  });
};

/**
 * What one Person's Non-Super Portfolio can supply this month.
 *
 * `available` is `financialAssets(person)` — the sum of that Person's parcels' MARKET VALUES, which is
 * the same scalar the means test reads, and not some net-of-tax figure. The tax a draw causes is
 * charged as a line in the month it happens; it does not shrink what the portfolio can offer.
 */
export interface PortfolioClaim {
  readonly personIndex: number;
  readonly available: Cents;
}

/**
 * **Limb 3's `WaterfallSource` — P3-21f chunk 6, and the limb that drew nil for the whole of this
 * build until now.**
 *
 * ⚠️ **THE FIGURE IS NET OF THE TAX THE SALE WOULD CAUSE — the P10-4 ruling of 2026-09-21, and it
 * reverses what this doc used to say.** The claims are still each Person's WHOLE portfolio at market
 * value; `offer` is what selling the whole of it would leave AFTER the capital gains tax that sale
 * is charged, and it is the caller's figure because only the walk can ask the year's own assessment
 * what the charge would be. The superseded direction, in its own words, was: *"Nothing is held back
 * for the CGT a draw realises … the tax is charged where it falls … Draw to NEED; let the liability
 * land in its own month; let `SHORTFALL_LINE` report it honestly if the household cannot meet it."*
 * What that cost was a phantom: the tax was no part of the target, so a month funded by a sale came
 * up short by exactly its own tax however much the Household could reach — **$566.10 short holding
 * $18,088,555**. A sale that does not fund its own tax is not a sale a person would make.
 *
 * **So the limb offers what it can DELIVER and the draw is grossed up to deliver it.** Where the
 * whole portfolio still cannot fund the month, this figure is everything it has and the limbs below
 * limb 3 are offered the rest — a genuine shortfall is reported exactly as it always was. The
 * gross-up, the circularity it closes and the proof that it terminates are in `project()`, at the
 * block headed *THE SALE FUNDS ITS OWN TAX*.
 *
 * **`offer > held` throws.** Tax on a gain cannot exceed the proceeds that realised it, so a net
 * figure above the market value is unreachable; it is a tripwire on a caller that computed the offer
 * some other way, not a case with a fixture.
 *
 * The nil note delegates to `unfundedMiddleLimbs`, exactly as limb 2's does, so that what a nil MEANS
 * is stated in one place and cannot drift between the two.
 */
export const nonSuperPortfolioLimb = (
  household: Household,
  claims: readonly PortfolioClaim[],
  offer: Cents,
): WaterfallSource => {
  const held = claims.reduce<number>((total, claim) => total + claim.available, 0) as Cents;
  if (offer > held) {
    throw new RangeError(
      `limb 3 was offered ${offer} cents net of tax out of a portfolio holding ${held}: a sale cannot contribute more than it realises`,
    );
  }
  return Object.freeze({
    available: offer,
    note:
      held > 0
        ? 'the whole market value of the Non-Super Portfolio, LESS the capital gains tax selling the whole of it would cause: a draw is a CGT DISPOSAL, the disposal — which parcels, what gain, what tax — is decided below in the month it happens, and the draw is grossed up there so that the sale funds its own tax (P10-4)'
        : unfundedMiddleLimbs(household).nonSuperPortfolio.note,
  });
};

/**
 * What ONE superannuation interest can supply to limb 5 this month, and which interest it is.
 *
 * `available` is `releasedSuperannuationOffer`'s figure and nothing computed here: the whole
 * balance where the gate is open, nil where it is not. A Person's second interest is a second
 * claim, because release is per interest's phase and the draw is priced per interest.
 */
export interface ReleasedSuperClaim {
  readonly personIndex: number;
  readonly slot: number;
  readonly available: Cents;
  /** `releasedSuperannuationOffer`'s note for this interest, funded or not. */
  readonly note: string;
}

/** What limb 5's note joins its claims' notes with. */
export const CLAIM_NOTE_SEPARATOR = '; ';

/**
 * **Limb 5's `WaterfallSource` — the released superannuation the household could always reach in
 * law and could not spend in this engine (2026-09-19).**
 *
 * The figure is the sum of the claims, each of which is `superLumpSum.ts`'s own offer for one
 * interest. **Nothing is held back for tax**, and that is limb 3's settled direction rather than an
 * omission: at the only age this limb can fire the tax is nil, that nil is asserted by
 * `superLumpSumWithdrawal` and carried into the month's `SuperWithdrawalNote` with the taxed-source
 * assumption it rests on.
 *
 * **The note is the claims' own notes and is never composed here**, so every reason a nil can have
 * — under the tax-free age, no Condition of Release, a TRIS, an Account-Based Pension that belongs
 * to limb 2, an empty released account — is stated by the module that owns the rule. A Household
 * holding no superannuation at all makes no claim, and that is the one sentence this function
 * writes: it is a fact about the Household and not about the engine.
 */
export const releasedSuperannuationLimb = (claims: readonly ReleasedSuperClaim[]): WaterfallSource => {
  const available = claims.reduce<number>((total, claim) => total + claim.available, 0) as Cents;
  const reasons = [...new Set(claims.filter((claim) => claim.available <= 0).map((claim) => claim.note))];
  return Object.freeze({
    available,
    note:
      available > 0
        ? claims
            .filter((claim) => claim.available > 0)
            .map((claim) => claim.note)
            .join(CLAIM_NOTE_SEPARATOR)
        : claims.length === 0
          ? 'no superannuation interest in this Household: limb 5 is built and it draws, so a nil here is a Household with no super and never a balance this model refused to look at'
          : reasons.join(CLAIM_NOTE_SEPARATOR),
  });
};

/** Which `Person` an entry's `owner` names. `household` names every one of them. */
const ownsPerson = (owner: Entry['owner'], index: number): boolean =>
  owner === 'household' || (owner === 'personA' ? index === 0 : index === 1);

/**
 * **Which Persons a `RETIRE` or a `WORK_PATTERN_CHANGE` reaches — refusing an owner who is not in
 * the Household at all (P4-12, the fix for a LIVE DEFECT).**
 *
 * Until this existed both types were applied by iterating the Persons that EXIST and asking
 * `ownsPerson` of each, so a `personB`-owned entry in a one-Person Household matched nobody: the
 * loop body never ran, the walk completed, and the page drew a plausible forecast in which a stated
 * retirement never happened. No refusal, no `Month.note`, nothing on screen — the confidently-wrong
 * output arriving through a loop that reads as obviously correct. The engine already held the
 * ruling that a per-Person entry naming no Person is an error: `soleOwnerIndex` throws on it for a
 * BUY or a SELL and the `LUMP_SUM_FROM_SUPER` loop throws on it for a withdrawal. It was applied at
 * two of the four per-Person types and missing at the other two.
 *
 * **It is a separate function from `soleOwnerIndex` and must stay one.** That one ALSO refuses
 * `owner: 'household'`, on a ground that belongs to share parcels alone — a non-super parcel belongs
 * to a Person and to exactly one (P3-21c), so a household-owned buy would have to invent a split.
 * Retiring is not like that: *"we retired"* is a coherent statement about two people, and
 * `test/core-projection-tax.test.mjs`'s *"an entry owned by `household` reaches BOTH Persons"* holds
 * that reading deliberately, against a surviving mutation. So `household` here returns every index
 * the Household has and refuses nothing. What is refused is narrower and is the defect itself: an
 * owner that names a Person the file does not contain.
 *
 * A plain `RangeError`, not a named class and not a register row: this is an input-shape guard about
 * THIS entry against THIS Household, the shape `soleOwnerIndex` and the `LUMP_SUM_FROM_SUPER`
 * refusals already take. The wording is `checkContributionTargets`'s, which is the best statement of
 * the reason — the door refuses a dangling `SUPER_CONTRIBUTION` owner in the same terms.
 */
const personsReachedBy = (entry: Entry, household: Household): readonly number[] => {
  if (entry.owner === 'household') return household.persons.map((_person, index) => index);
  const index = entry.owner === 'personA' ? 0 : 1;
  if (household.persons[index] === undefined) {
    throw new RangeError(
      `entry ${entry.id} (${entry.type}) is owned by ${entry.owner}, and this Household has ${household.persons.length} Person — ` +
        'the entry names somebody who is not in the file. It is refused rather than skipped: an entry nobody owns would do nothing, ' +
        'forever, with nothing on screen to say so. State it against a Person the Household has',
    );
  }
  return [index];
};

/** P12-1 — the one `DEATH` a walk can hold, resolved against the Scenario's entries by `deathOf`. */
interface Death {
  readonly entryId: string;
  /** Who died, and who carries on — indexes into `household.persons`. */
  readonly index: 0 | 1;
  readonly survivor: 0 | 1;
  /** The entry's own day — the day a pre-CGT parcel is re-acquired on. */
  readonly date: IsoDate;
  /** The month the death takes effect in, from its first day. */
  readonly month: IsoMonth;
  /** The financial year of that month: income tax treats the pair as a couple to its end. */
  readonly fy: FinancialYear;
}

/**
 * The entry types a `household`-owned entry may still be after a death: the facts that belong to
 * the Household rather than to each Person. Every other `household`-owned entry reaches BOTH
 * Persons (`personsReachedBy`), and one of them has died.
 */
const HOUSEHOLD_FACTS: ReadonlySet<Entry['type']> = new Set([
  'SPEND_CHANGE', 'ONE_OFF_EXPENSE', 'MORTGAGE_REFINANCE', 'MORTGAGE_TARGET', 'MORTGAGE_PAYOFF',
  // **P14-13 — selling the home is the household's own fact, not the deceased's**: a survivor can
  // still sell the family home after the other partner has died, exactly as they can still refinance
  // or pay off the loan on it.
  'SELL_HOME',
  // **P14-13 — renting the home out is the household's own fact too, `SELL_HOME`'s own reason.**
  'RENT_OUT_HOME',
  'BUY_HOME',
]);

/**
 * **P12-1 — the `DEATH` in this Scenario, if there is one, and every refusal that depends on which
 * entries the walk sees.** The door (`parsePlan`'s `checkDeaths`) has already refused a death owned
 * by the Household and a death in a Household of one; what is left depends on the Scenario:
 *
 *   * **a second death** — both of a couple dying leaves no survivor, and the Guide's own formula
 *     for that case (3.1.5.40) is not built;
 *   * **a death dated before the forecast starts** — the Household is stated as at `asAtDate`, so a
 *     death that has already happened is a Household of one, stated as one;
 *   * **a death beside an `ILLNESS_SEPARATION`** — the bereavement payment for an illness-separated
 *     couple is a different formula (SS Guide 3.1.5.70) and is not built; after the death there is
 *     no couple to be separated;
 *   * **an entry dated in or after the month of the death that reaches the deceased** — owned by
 *     them, or owned by the Household and reaching both Persons — and a `SPOUSE_CONTRIBUTION` into
 *     a spouse who has died. From that month the deceased holds nothing and earns nothing, so such
 *     an entry would do nothing, silently.
 */
const deathOf = (entries: readonly Entry[], household: Household, first: IsoMonth): Death | undefined => {
  const enabled = entries.filter((entry) => entry.enabled);
  const deaths = enabled.filter((entry) => entry.type === 'DEATH');
  if (deaths.length === 0) return undefined;
  const [entry, second] = deaths as [Entry, Entry | undefined];
  if (second !== undefined) {
    throw new RangeError(
      `entries ${entry.id} and ${second.id} are both DEATH: a second death leaves nobody to carry on, and both of a couple dying is not modelled. Switch one of them off`,
    );
  }
  if (entry.owner === 'household' || household.persons.length !== 2) {
    throw new RangeError(`entry ${entry.id} (DEATH) is owned by ${entry.owner} in a Household of ${household.persons.length} Person(s): a death is one Person's, in a couple`);
  }
  const index = entry.owner === 'personA' ? 0 : 1;
  const survivor = index === 0 ? 1 : 0;
  const name = (household.persons[index] as Person).name;
  const month = monthOf(entry.date);
  if (month < first) {
    throw new RangeError(
      `entry ${entry.id} (DEATH) is dated ${entry.date}, before the forecast starts in ${first}: the Household is stated as it stands on that day, so a death that has already happened is a Household of one Person — state it that way`,
    );
  }
  for (const other of enabled) {
    if (other.id === entry.id) continue;
    if (other.type === 'ILLNESS_SEPARATION') {
      throw new RangeError(
        `entries ${other.id} (ILLNESS_SEPARATION) and ${entry.id} (DEATH) are both switched on: the bereavement payment for a couple living apart because of illness is worked out differently (SS Guide 3.1.5.70) and is not modelled`,
      );
    }
    if (monthOf(other.date) < month) continue;
    const reachesTheDeceased =
      other.owner === entry.owner || (other.owner === 'household' && !HOUSEHOLD_FACTS.has(other.type)) || other.type === 'SPOUSE_CONTRIBUTION';
    if (reachesTheDeceased) {
      throw new RangeError(
        `entry ${other.id} (${other.type}) is dated ${other.date}, in or after ${month}, the month ${name} dies (entry ${entry.id}): ` +
          `from then ${name} holds nothing, earns nothing and has no spouse's super to be paid into, so the entry would do nothing. ` +
          'Switch it off, date it before the death, or state it for the Person who carries on',
      );
    }
  }
  return Object.freeze({ entryId: entry.id, index, survivor, date: entry.date, month, fy: financialYearContaining(firstDayOf(month)) });
};

/**
 * Project a Household forward from `settings.asAtDate` to the Planning Horizon, one `Month` per
 * calendar month, in ascending order with no gaps.
 *
 * **What every `Month` currently reports.** Its `month`; the ids of the entries that applied in it;
 * `protectedAssets` and `assessableAssets`, split by `household.ts` on the month's first day
 * (ADR-0005); where there is one, a single `Age Pension` inflow line; and, from chunk 3, a
 * `Salary, <name>` inflow and an `Income tax, <name>` outflow per Person, each where positive.
 * From chunk 4 it also reports a `Household spending` outflow where a `SPEND_CHANGE` level stands,
 * one `One-off expense` outflow per `ONE_OFF_EXPENSE` dated in that month, an `Unfunded shortfall`
 * inflow where the Waterfall could not meet the target, and an `openingBalance` and
 * `closingBalance` that reconcile to those lines exactly. From P3-21f chunk 3 it reports one
 * `Non-Super Portfolio purchase, <name>` OUTFLOW per `NON_SUPER_INVESTMENT` buy the month could
 * fund: a buy is money leaving the running cash and arriving in a Person's parcels, never a parcel
 * appearing beside an untouched balance. From chunk 4 it reports one `Non-Super Portfolio sale, <name>`
 * INFLOW per `NON_SUPER_INVESTMENT` sell the Person's parcels could supply, at the market value that
 * actually left the portfolio — the mirror of the purchase, and the same one-change discipline. From
 * chunk 5 it reports an `Income tax on capital gain, <name>` OUTFLOW in the month a disposal raises
 * that Person's assessment, and from **chunk 6** it reports a `Non-Super Portfolio sale, <name>`
 * INFLOW per Person for the Waterfall's OWN draw, with no entry behind it at all.
 *
 * **The INCOME WATERFALL, and what `openingBalance` / `closingBalance` actually are.** The order is
 * concept.md §4's — salary → Account-Based Pension → Non-Super Portfolio → Offset Account, with the
 * Age Pension applied wherever assessed — and `drawWaterfall` is the one place it is applied. Limb 2
 * is funded from P4-1 chunk 5b and **limb 3 from P3-21f chunk 6, so ALL FOUR LIMBS NOW DRAW.**
 * `unfundedMiddleLimbs` is what is left of the two middle limbs' nils — the three ways limb 2 can
 * still be nil, and the one way limb 3 can: a Household that holds no parcels.
 *
 * **The order is worth a figure rather than a diagram, and `test/core-non-super-limb-3.test.mjs`
 * pins one:** a Household short $50,000 in a month, holding a $12,807.58 pension, a portfolio and a
 * $65,566.69 Offset balance, draws the pension to nil and the portfolio for $37,192.42 and leaves
 * the Offset untouched to the cent. Limb 3 before limb 4 and limb 2 before limb 3, in one number
 * neither adjacent transposition can produce.
 *
 * **Limb 2 is "to its minimum" no longer, and that is the user's ruling of 2026-09-17: the minimum
 * is a FLOOR.** The limb offers the whole pension balance, so a household that needs more than the
 * Schedule's figure draws it and a pension account can now be spent to nil in the ordinary course;
 * and what is left of the year's minimum is PAID in the last month of the financial year whether the
 * household needs it or not, landing in the running cash exactly as a surplus wage does.
 * The running balance **IS the Offset Account**: it is where a surplus month's cash goes and the
 * last place a deficit month draws from, which is what an offset account is. **It is seeded from
 * `Household.openingOffsetBalance` (P4-3b)** — the finding that it could only ever start at nil is
 * discharged, the field is optional, and a Household that states one can draw on it in the walk's
 * first month. It is also IN THE MEANS TEST from that chunk on: `withBalances` substitutes the
 * month's own running cash into the Household `splitAssets` reads, so the Offset is assessed and
 * deemed at the figure the month opens with, like any other financial investment.
 *
 * **A shortfall is a LINE, never a negative balance.** This model has no borrowing facility, so
 * `closingBalance` floors at nil and the unmet amount appears as an `Unfunded shortfall` inflow in
 * the month it arises — where the reconciliation stays exact, a user can see it, and P4-5 can read
 * the Shortfall Age off it without recomputing anything.
 *
 * ✅ **THE RESIDUAL THAT FLATTERED IS CLOSED (P2-10b).** It stood here that the register carried
 * tax parameters for FY2026-27 and FY2027-28 only, so that from FY2028-29 there was no income-tax
 * line and the Waterfall spent the GROSS salary. Sch 7 Pt I's table for *“the 2027-28 year of
 * income or a later year of income”* supplies every later year, so **every month of the walk from
 * FY2026-27 on now carries its tax line and the Waterfall spends net pay.** What is left is
 * distance from the last stated year, which `taxYear(fy).standingLawFrom` marks — see the module
 * header.
 *
 * **The tax is the HOUSEHOLD's assessment reported per Person, never two separate ones.** The
 * Medicare levy's s 8(3) family reduction reads the other Person's taxable income and SAPTO reads
 * the couple's combined Rebate Income, so one Person retiring changes the other Person's tax. That
 * is not a side effect to be tidied away; it is the Act, and `householdIncomeTax` is called once
 * per month with both Persons for exactly that reason.
 *
 * **The one residual in chunk 3 that flatters the household, stated here because it is the only
 * one.** Taxable income is built from SALARY ALONE. The Age Pension is assessable income
 * (register §2.3 — it is inside `taxableIncome`, never an add-back), and this chunk does not put
 * it there, so a pensioner's taxable income and tax are both UNDER-stated. In practice SAPTO and
 * the seniors Medicare thresholds absorb most of it for a Household on a full pension, and nothing
 * here relies on that: it is scope — chunk 3 is the assembly, and the other assessable amounts
 * (the Age Pension, super pension payments, deemed and actual investment income, franked
 * distributions) arrive with the chunks that compute them. Any of them added later goes into
 * `taxableIncomeFromSalary`'s assessable limb and nowhere else.
 *
 * **ADR-0005 is enforced here, not merely observed.** The two asset figures come from the very
 * `AssetSplit` the means test was run on, and the walk asserts every month that the assets test
 * assessed `assessableAssets` and not `protectedAssets`. If that ever stops being true — in this
 * file or in `agePension.ts` — the projection throws rather than reporting a figure whose
 * provenance it can no longer vouch for.
 *
 * **What that guard does NOT catch, and it is worth saying because chunk 5a is the change that made
 * it matter.** It compares the two means-test call sites against each other, so it fires when they
 * DISAGREE. It cannot fire when both are uniformly stale — which is exactly the state the walk was
 * in before 5a, and exactly what a half-done wiring of it would restore. That is caught by a figure
 * instead: `test/core-projection-growth.test.mjs` and
 * `test/core-projection-age-pension.test.mjs` both hand-work balances that MOVE, inside the Age
 * Pension parameter window and outside it.
 *
 * **BALANCES MOVE (chunk 5a), and the convention is stated.** Every `SuperInterest.balance` and
 * every parcel of every `Person.parcels` grows at `settings.nominalReturn`, compounded monthly as
 * `(1 + r)^(1/12)` and floored to the cent — see `grownForOneMonth` for the rounding decision and
 * `PersonBalances` for which balances grow, which do not, and why. Growth is applied at the END of
 * each tick, so **month 0 reports the Household exactly as the user stated it** (`Settings.asAtDate`
 * is the day the balances are stated as at) and month n reports n months of compounding. That is
 * the same convention `firstDayOf` takes for the Age Pension parameters: a month is assessed on what
 * it opens with.
 *
 * **AND BALANCES FALL (chunk 5b), and the intra-month order IS settled: drawdown first, then
 * growth.** Limb 2 of the Waterfall draws the SIS Reg Sch 7 minimum, the drawn amount is emitted as
 * an `Account-Based Pension payment, <name>` inflow AND subtracted from the interest it came out of
 * — one number, computed once, so chunk 4's reconciliation keeps meaning what it says — and only
 * what remains earns the month's return. The month is still ASSESSED on what it opened with, so the
 * fall reaches the means test from the following month, exactly as growth does.
 *
 * ✅ **And the residual it added is CLOSED (P4-4): growth is a `MonthLine` carrying
 * `effect: 'wealth'`, one per Person per pool.** It moves no cash figure — every reduction in this
 * function goes through `cashMovement`, which is nil for a wealth line — so `assessableAssets` no
 * longer moves for a reason the month's own lines cannot explain. See the module header.
 *
 * **The Age Pension is computed per month, on that month's own parameters**, so a 20 March or 20
 * September reindexation appears in the walk as a step rather than one frozen figure carried
 * forward. Where no parameters exist there is no line at all — see `agePensionParametersCover`,
 * which is where that boundary and its consequences are written down.
 *
 * **`enabled: false` is the append-only-safe delete (ADR-0002), so a disabled entry NEVER appears
 * in any `appliedEntryIds`.** It is still in the Scenario and still ordered; it simply does not
 * apply. There is no other way to remove an entry from a projection.
 *
 * **An entry dated BEFORE the walk is answered by its type's kind, not refused** (chunk 2b; chunk
 * 1 refused every such entry because `plan.ts` could not tell the two cases apart, and that refusal
 * is what this replaces). `ENTRY_KIND` classifies each of the nineteen types once, from what the
 * type means:
 *
 *   * a **level** dated before `asAtDate` is a standing state that is still true, so it applies
 *     from **month 0** — a 2020 `SPEND_CHANGE` is still this household's spending level;
 *   * an **event** dated before `asAtDate` already happened and was already paid, so it applies
 *     **nowhere** and is NOT refused — a 2020 `ONE_OFF_EXPENSE` is money that is already gone, and
 *     the Household's balances are stated as at `asAtDate` and already reflect it.
 *
 * **Superseded levels do not double-apply.** Three `SPEND_CHANGE`s dated 2019, 2021 and 2024 are one
 * standing level at month 0, not three: only the latest by date survives, per `type` **and**
 * `owner`. The owner is part of the key because a `RETIRE` for each of two people is two standing
 * facts, not one superseding the other. A tie on date is broken by the Scenario's own order, last
 * stated winning, which is the only reading append-only editing supports.
 *
 * **An entry dated AFTER the horizon is still REFUSED, naming it.** The before-case had a meaning to
 * recover and this one does not: a level dated after the last month has no month to stand from and
 * an event has no month to occur in, so there is no reading under which the stated fact affects the
 * projection. That makes it far more likely to be a data error — a mistyped year — than an
 * intention, and silently dropping it would hide the typo in the one place the user cannot see it.
 * A user who genuinely means "ignore this" already has `enabled: false`.
 *
 * A DISABLED entry outside the horizon does not throw: it does not apply anywhere at all, so there
 * is nothing about it to refuse, and throwing would make disabling an entry unable to silence the
 * very problem disabling exists for.
 *
 * Pure and side-effect free (ADR-0002 — the sustainable-spend solver calls this in a loop), and
 * deterministic: identical input yields byte-identical output, on any machine, on any day.
 */
export const project = (
  settings: Settings,
  household: Household,
  entries: readonly Entry[],
): readonly Month[] => {
  // **P4-1b part (B): the window is NAMED, and this is the only place the walk learns its bounds.**
  // Both refusals below quote `first` and `last`, and both now get them from `forecastWindow` rather
  // than deriving a private copy — so the boundary this function refuses an entry against and the
  // boundary another module checks a stated day against cannot drift apart. Destructured rather than
  // held as a record because the walk below reads these two months a dozen times and nothing else
  // about the window.
  const { firstMonth: first, lastMonth: last } = forecastWindow(settings, household);
  // **THE PRICE A HOUSEHOLD TYPES ON A FUTURE-DATED ENTRY IS IN TODAY'S MONEY (user ruling,
  // 2026-09-25), `SpendChangeParams.annualSpend`'s own basis** — a room price, a sale estimate, a
  // security value or a weekly rent is a fact about what something is worth NOW, not a nominal
  // banknote figure the household is somehow quoting for a decade hence. `core/priceLevel.ts`'s
  // `inflateStated` is the one expression every such figure below is raised by: to the ENTRY's own
  // day for a fact fixed at one moment (a RAD, a sale, a HEAS security — never re-inflated after),
  // or to THIS MONTH for a figure that keeps rising through a standing arrangement (rent, a HEAS
  // fortnightly draw, an advance), on `atWageLevel`'s own idiom below but taking an explicit date
  // because callers need both. A debt stays nominal (register O86) and is never passed through this.
  const atTodaysMoney = (stated: Cents, atDate: IsoDate | IsoMonth): Cents =>
    inflateStated(stated, settings.economicSeries.cpi, settings.asAtDate, atDate);
  // Every description a payment out of super can carry in this Household — `Month.incomeFromSuper`.
  const paidOutOfSuper = new Set(
    household.persons.flatMap((person) => INCOME_FROM_SUPER_LINES.map((line) => superPaymentDescription(line, person))),
  );
  if (last < first) {
    throw new RangeError(
      `the Planning Horizon (${last}) is before asAtDate (${first}) — every member of the Household has already passed age ${settings.planningHorizonAge}`,
    );
  }
  // A stated series wins untouched; with none, the Age Pension indexes forward on this plan's own
  // growth rates (user ruling 2026-09-23) rather than standing at the last published sets.
  const seriesGenerated = settings.economicSeries.agePension === undefined;
  const indexationSeries = settings.economicSeries.agePension ?? generatedAgePensionSeries(settings, last);

  // **P14-17 — the aged care schedule, generated forward once per walk and only if ever needed.**
  // Built lazily (most walks have no `ENTER_CARE` at all) and cached in this closure so a resident in
  // care for five hundred months gets one generated table, not five hundred. The horizon is `last`'s
  // OWN final day — `agePensionPeriodsThrough`'s identical reasoning against rebuilding the chain
  // short and extending it piecemeal. `singleMaximumBasicRateAt` reads the SAME `indexationSeries`
  // the Age Pension line above is paid from, so the basic fee tracks the pension this walk actually
  // pays rather than a second, independent forecast of it (`basicDailyFeeFromPension`'s own doc).
  let agedCareExtendedPeriodsCache: readonly AgedCarePeriod[] | undefined;
  const agedCareExtendedPeriods = (): readonly AgedCarePeriod[] => {
    if (agedCareExtendedPeriodsCache === undefined) {
      const horizon = `${last}-${daysInMonth(`${last}-01` as IsoDate)}` as IsoDate;
      agedCareExtendedPeriodsCache = agedCarePeriodsThrough(
        horizon,
        settings.economicSeries.cpi,
        (date) => agePensionPeriodAt(date, indexationSeries).rates.maximumBasicRate.single,
      );
    }
    return agedCareExtendedPeriodsCache;
  };

  // Bucketed once, so the walk is a lookup per month rather than a scan of every entry per month —
  // and so that an out-of-horizon entry is caught before any month is emitted, rather than at
  // whichever tick happens to notice.
  const applied = new Map<IsoMonth, Entry[]>();
  // The levels dated before the walk, keyed by what one of them supersedes: `type` AND `owner`.
  // Whatever is in here when the loop ends is the standing state at month 0.
  const standing = new Map<string, Entry>();
  for (const entry of entries) {
    if (!entry.enabled) continue; // ADR-0002: the append-only-safe delete.
    const month = monthOf(entry.date);
    if (month > last) {
      throw new RangeError(
        `entry ${entry.id} (${entry.type}) is dated ${entry.date}, after the Planning Horizon ${last} — outside the projection ${first}..${last}. Disable it, or move the horizon`,
      );
    }
    if (month < first) {
      // Chunk 2b's ruling, and the ONLY place it is consulted. `ENTRY_KIND` is exhaustive over
      // `EntryType` by construction, so there is no default to take and no unclassified type to
      // take it: a twentieth entry type breaks the build here rather than falling through.
      if (ENTRY_KIND[entry.type] === 'event') continue; // already happened, already paid.
      const key = `${entry.type}\u0000${entry.owner}`;
      const held = standing.get(key);
      // `>=` and not `>`: on an equal date the later-stated entry wins, which is the Scenario's own
      // order (ADR-0002) and the only reading an append-only journal supports.
      if (held === undefined || entry.date >= held.date) standing.set(key, entry);
      continue;
    }
    const bucket = applied.get(month);
    if (bucket === undefined) applied.set(month, [entry]);
    else bucket.push(entry); // input order, which is the Scenario's own order (ADR-0002).
  }

  // The surviving levels apply in month 0, oldest first, ahead of anything dated in month 0 itself
  // — so the month reads in the order the facts were established. `sort` is stable in Node, so two
  // levels of different kinds sharing a date keep the Scenario's order.
  const carried = [...standing.values()].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
  if (carried.length > 0) {
    applied.set(first, [...carried, ...(applied.get(first) ?? [])]);
  }

  const relationship = isCouple(household) ? 'couple' : 'single';
  // **P12-1 — the death in this Scenario, resolved once, with every refusal that turns on which
  // entries are switched on.** `undefined` for every Household that states none, and then nothing
  // below reads it: each site it reaches is a branch on `deceasedNow`, which is `undefined` too.
  const death = deathOf(entries, household, first);
  // Two standing facts per Person, carried ACROSS months because both arrive as levels: a level
  // applies from its month until something supersedes it, and a `Map` keyed by month cannot say so.
  // Whether a Person is stopped (retired) in a month is NOT carried here: `workSpells` answers it,
  // because a return to work after a `RETIRE` (retire flow S3) turns on the dates of both entries and
  // the levels machinery above keeps only the latest pre-walk entry of each type. `worksNoDays` is a
  // pattern: a later `WORK_PATTERN_CHANGE` with positive days restores the salary.
  // **WHEN they retired, beside WHETHER — and it is read by THREE consumers (P4-11, 2026-09-19).**
  // `conditionOfRelease` takes a `GainfulEmployment`, whose `ceased: true` arm requires the DAY,
  // and the walk has it: a `RETIRE` entry carries its own date, including a pre-walk one applied as
  // a level in month 0. The three readers are the `LUMP_SUM_FROM_SUPER` entry path, Waterfall
  // limb 5, and `accessibleWealth`, all through the one `gainfulEmploymentAsAt` below.
  //
  // ⚠️ **The superseded scoping is kept because it is what P4-11 had to undo:** *"`accessibleWealth`
  // cannot use this — it is handed a `Household` and no entries, so `{ ceased: false }` is the only
  // fact it can attest to, and its residual 1 is unchanged. The improvement is scoped to
  // `LUMP_SUM_FROM_SUPER` and to nothing else: a Household that states no withdrawal reaches no
  // call site that reads this, so no existing figure can move."* Limb 5 broke that scoping the
  // same day — it spends this money without any entry — and leaving `accessibleWealth` outside it
  // made two figures contradict each other. It is HANDED the fact now rather than deriving one.
  // The FIRST cessation is kept, not the last: the ground is *the day gainful employment ceased*,
  // which a second `RETIRE` cannot postpone. A stop AFTER going back to work is a new cessation, and
  // its readers take it from `spellIn` rather than from here (retire flow S3).
  const retiredOn: (IsoDate | undefined)[] = household.persons.map(() => undefined);
  const worksNoDays = household.persons.map(() => false);
  // **The THIRD level, beside the two above (2026-09-19): the salary the caller STATED.** A
  // `WORK_PATTERN_CHANGE` now carries `annualSalary`, and it replaces the Person's annualised
  // `employmentIncomePerFortnight` from its own month. Carried across months for the same reason
  // as the other two — it is a level, and a `Map` keyed by month cannot say "and every month
  // after". `undefined` is "nobody has stated a salary for this Person", which is NOT nil: it
  // means the Household's own stated fortnightly figure still governs, and that distinction is the
  // whole of the ordering in `salaries` below.
  const statedSalary: (Cents | undefined)[] = household.persons.map(() => undefined);
  // **P5-3 — and WHICH ENTRY last set that pattern, per Person, for `spending`'s reason.** A salary
  // line exists because no entry stopped it or because a `WORK_PATTERN_CHANGE` with positive days
  // restored it, and the entry that decided that is the one applied last — not every
  // `WORK_PATTERN_CHANGE` key standing in `governing`. `undefined` is "nobody has ever stated this
  // Person's work pattern", which is not the same fact as an entry stating that they work five days,
  // and only the second is attributable.
  const workPattern: (string | undefined)[] = household.persons.map(() => undefined);
  // **P2-11 — the PER-PERSON investment return level, in `statedSalary`'s own idiom.** A
  // `RETURN_CHANGE` carries a `rate` that REPLACES `settings.nominalReturn` for this Person from
  // its own month, until another `RETURN_CHANGE` for the same owner supersedes it — a level, exactly
  // as `ENTRY_KIND` says. `undefined` is "nobody has ever stated a return for this Person", which is
  // NOT nil: it means the Household's own flat `nominalReturn` still governs, the same reading
  // `statedSalary`'s `undefined` gets against the Household's stated fortnightly figure.
  const returnRate: (number | undefined)[] = household.persons.map(() => undefined);
  // **The FOURTH level: what this Person sacrifices into super per YEAR (P6-8 brief 2, chunk 1).**
  // `SUPER_CONTRIBUTION` is a `level` in `ENTRY_KIND`, so it is carried across months exactly as
  // the three above are, and a later one for the same owner REPLACES this figure rather than adding
  // to it — the assignment below IS the supersession, and summing would double a user's arrangement
  // the moment they re-stated it.
  //
  // `undefined` is "nobody has stated a sacrifice for this Person", and nil is unreachable from the
  // door (`SuperContributionParams.annualAmount` is refused at nil and below, because zero is not
  // this model's off switch — `enabled: false` is). It is still written as an absence test rather
  // than defaulted to nil, on the same rule as `statedSalary`: a personal financial figure never
  // gets a default in source.
  //
  // **P6-8 brief 2 chunk 4 widened this from a `Cents` to the WHOLE ARRANGEMENT, and that is what
  // makes "the only one" unable to break silently.** The money now has to arrive somewhere, and
  // where it arrives is a fact the entry states: `interestIndex`. Reading it off the entry — rather
  // than crediting interest 0, or the Person's only interest, or the first one in accumulation
  // phase — is the difference between a forecast that pays the account the user named and one that
  // happens to agree with it while the Person holds a single interest. `entryId` rides along for
  // the same reason `workPattern` and `spending` carry theirs: the credit is a figure an entry
  // STATES, so its line can name the entry instead of saying nobody did.
  interface SacrificeArrangement {
    readonly annualAmount: Cents;
    /** The interest the money is paid into. Checked against the Person at the door — `checkContributionTargets`. */
    readonly interestIndex: number;
    readonly entryId: string;
  }
  const sacrificeLevel: (SacrificeArrangement | undefined)[] = household.persons.map(() => undefined);
  // **The FIFTH level, and it is the absence of the fourth said out loud (P6-8 brief 4,
  // 2026-09-21).** A `SUPER_CONTRIBUTION` with `kind: 'stopped'` clears `sacrificeLevel` above and
  // writes here, so from that month the Person sacrifices nothing — and this is the only thing that
  // distinguishes those months from the ones before they ever arranged anything, from the ones
  // where the arrangement has not started yet, and from the ones where they are simply not being
  // paid. It is carried across months because the stop is a LEVEL: it holds until an arrangement
  // supersedes it, which is how a user restarts.
  //
  // It exists to be REPORTED — `SalarySacrificeStoppedNote` — and no figure is computed from it.
  const sacrificeStoppedBy: ({ readonly entryId: string; readonly stoppedFrom: IsoDate } | undefined)[] =
    household.persons.map(() => undefined);
  // **The Household's spending level, carried across months for the same reason.** `SPEND_CHANGE` is
  // a LEVEL (chunk 2b): it holds until another one supersedes it, so it cannot live in a `Map` keyed
  // by month. `undefined` is not zero — it is "no `SPEND_CHANGE` was ever stated", which is the state
  // every fixture written before this chunk is in, and it emits no spending line at all rather than a
  // line for nothing.
  //
  // **P5-3 — the LEVEL AND ITS AUTHOR ARE ONE VALUE, and that is what makes the attribution exact.**
  // `governing` holds one id per `type`+`owner` key, and `SPEND_CHANGE` deliberately ignores `owner`
  // (see the tick below), so a Household that states a `household`-owned level and a `personA`-owned
  // one has TWO governing ids and only one of them set the figure — the one applied last. Reading
  // the attribution off `governing` would cite both and be wrong about one; writing the id at the
  // same statement that writes the amount cannot be.
  let spending: { readonly annualSpend: Cents; readonly entryId: string } | undefined = undefined;
  // **P12-4 — the couple live apart because of illness or care, from the entry's own month.** A
  // `level` like `spending` above, and a plain `let` for its reason: the entry loop sets it and the
  // means test reads it. `undefined` is a couple living together; nothing sets it back, because no
  // entry ends a separation. It reaches the Age Pension alone — the tax assessment keeps
  // `relationship` as a couple (see `assessHousehold`).
  let illnessSeparatedBy: string | undefined = undefined;
  // **P14-13, slice 3a — per-Person aged care state, positional with `household.persons` exactly
  // as `retiredOn`/`workPattern` are.** `careOn[i]` is the `ENTER_CARE` entry's own `date` once one
  // has been applied for that Person, and `undefined` for the rest of the walk otherwise — never
  // reset, on `retiredOn`'s own reasoning: nothing in this build's ENTER_CARE model lets a resident
  // leave care. `careEntry[i]` carries the whole entry (never just its id) because the RAD/DAP
  // arithmetic needs `radPrice` every month a resident is in care, not only in the entry's own
  // month. `radBalance[i]` is the RAD this Person's care has actually paid — the ONE ledger the
  // asymmetry (`agedCare.ts`'s header) turns on: it is credited only from the Waterfall/cash block
  // below and is NEVER added to `balances[i].parcels` or `openingBalance`, which is what keeps it
  // structurally invisible to `splitAssets`/`agePensionEntitlement` (the Age Pension side of the
  // asymmetry) while `agedCareMeansAssessment` reads it explicitly (the aged care side). `ncccCap[i]`
  // is the running lifetime-$/day balance, carried month to month exactly as the Work Bonus balance
  // is (P4-10's own precedent) — `undefined` until the Person's first month in care, when it is
  // seeded from `startingNcccCapBalance`.
  const careOn: (IsoDate | undefined)[] = household.persons.map(() => undefined);
  const careEntry: (EnterCareEntry | undefined)[] = household.persons.map(() => undefined);
  // **P14-13 — `SELL_HOME`, a HOUSEHOLD fact (`careOn`'s own reasoning, but never reset and never
  // per-Person: `checkSellHomes` has already refused a second one, so at most one entry ever sets
  // this).** `homeSold` drives `derivedHomeStatus` below to `noHome` from the month it applies, and
  // zeroes `mortgageBalance` in the SAME entry loop pass — `MORTGAGE_REFINANCE`'s own "the balance
  // is RESET, not carried" idiom, because a sold home's loan is discharged, not merely amortising.
  let homeSold = false;
  // **P14-13 — every `RENT_OUT_HOME` this walk has seen so far, a HOUSEHOLD fact
  // (`careEntry`'s own reasoning), ACCUMULATED rather than a single `let`: `checkRentOutHomes`
  // allows more than one, non-overlapping, across the file (a household that reoccupies and later
  // rents again).** Read fresh every month, below, for whichever one covers it — never reset.
  const rentOutHomeEntries: RentOutHomeEntry[] = [];
  // **P14-13c — the SAME entry, kept for the whole walk, so the sale-proceeds exemption window
  // (`newHomeAmount`'s own 24 months from `entry.date`) can be checked every month after the sale,
  // not only in its own month — `homeSold`'s own reasoning: `checkSellHomes` refuses a second
  // `SELL_HOME`, so at most one entry ever sets this.**
  let homeSoldEntry: SellHomeEntry | undefined = undefined;
  // **P14-19 — the `BUY_HOME`, from its own month on (`checkBuyHomes` allows one, after the sale).**
  let homeBoughtEntry: BuyHomeEntry | undefined = undefined;
  // P9-5 — what downsizer contributions have taken from the sale's set-aside so far.
  let setAsideSpentByDownsizer: Cents = toCents(0);
  const radBalance: Cents[] = household.persons.map(() => toCents(0));
  // **P14-16 — the RAD's own lifecycle: retained, then refunded.** `radRetentionWithheld[i]` is the
  // CUMULATIVE cents retained from Person i's RAD so far — health.gov.au's "calculated daily at a
  // rate of 2% per annum... limited to 5 years", read off `agedCareRadRetentionDeduction` (already
  // built in slice 2, unused until now) rather than reimplemented. `radDaysHeld[i]` is the running
  // day count that function needs; it is seeded and advanced only from the month a RAD is actually
  // paid, on `ncccCap`'s own precedent below. Both are read alongside `radBalance[i]` wherever the
  // RAD's REFUNDABLE balance (paid less retained) is needed — the retention never touches
  // `radBalance[i]` itself, which stays what `agedCareMeansAssessment` asserts in full, on the
  // asymmetry `radBalance`'s own comment turns on.
  const radRetentionWithheld: Cents[] = household.persons.map(() => toCents(0));
  const radDaysHeld: number[] = household.persons.map(() => 0);
  const ncccCap: (AgedCareNcccCapBalance | undefined)[] = household.persons.map(() => undefined);
  // **P9-2a — the Home Equity Access Scheme, PER PERSON now (T36, T37)** (`careOn`/`careEntry`'s
  // own positional-array shape, `radBalance`'s own precedent for why per-Person rather than one
  // household scalar). `heas.ts`'s own `coupleStructure` fact — already in the codebase since
  // slice 1, SS Guide-sourced — settles the "one facility or two" question this slice was gated
  // on: **each Person has their own loan against their own share of the security** (50-50 by
  // default for a couple, the whole of it for a Person drawing alone), both loans priced off the
  // SAME younger-partner age component. So `HEAS_DRAW`'s `owner` is now `personA`/`personB` only,
  // exactly as `ENTER_CARE`'s is (`checkHeasDraws`, `checkEnterCares`' own precedent), and at most
  // one entry per Person rather than one per file.
  //
  // `heasEntry[i]` is set once and never reset, on `careEntry[i]`'s own precedent. `heasDebt[i]` is
  // Person i's own running balance, `heasAccrueFortnight` compounds fortnight by fortnight — never
  // summed with the other Person's until `Month.heasDebt` is emitted. There is no cached capacity
  // local any more: T36 turns the age component into an ANNUAL STEP FUNCTION (F2019L00420 s
  // 4(1)(b); SS Guide 3.4.5.30; `heas.ts`'s `whoseAge`/`recalculationCadence`), so it is
  // recomputed fresh EVERY month the draw block below runs, off `ageAt` at that month — which
  // IS the step function, because `ageAt` only changes the month a birthday falls in. `heasCapped[i]`
  // replaces the old "emitted once ever" flag: it is `true` while Person i's draw is CURRENTLY
  // clamped, cleared the first month room reopens (a birthday lifting the cap), so the note fires
  // again the next time the cap newly binds rather than once for the whole walk.
  const heasEntry: (HeasDrawEntry | undefined)[] = household.persons.map(() => undefined);
  const heasDebt: Cents[] = household.persons.map(() => toCents(0));
  const heasCapped: boolean[] = household.persons.map(() => false);
  // **P9-2b — the rolling 26-fortnight advance window, per Person (s 1133AA(1), register T136).**
  // `heasAdvanceWindowStart[i]` is the date of the CURRENT window's own first advance, or `undefined`
  // before any advance has been taken; `heasAdvanceWindowTotal[i]` is the cents advanced within that
  // window so far. Walked chronologically alongside the month loop below: a new advance either joins
  // the open window or, once `daysInclusive` from the old `windowStart` exceeds 26 fortnights (364
  // days), starts a fresh one — `checkHeasDraws`'s own door-time windowing, replayed here because the
  // walk needs to know, EVERY month, whether "now" still sits inside the window that governs the
  // fortnightly-suppression formula (`heasFortnightlyDrawDuringAdvancePeriod`), not only at the
  // moment an advance is paid.
  const heasAdvanceWindowStart: (IsoDate | undefined)[] = household.persons.map(() => undefined);
  const heasAdvanceWindowTotal: Cents[] = household.persons.map(() => toCents(0));
  // **The running Offset Account balance, seeded from the Household's stated opening figure
  // (P4-3b).** See the Waterfall block below for why this figure IS the Offset Account. It no longer
  // starts at nil unless the Household says so: `Household.openingOffsetBalance` is optional, and
  // absent reads as nil here — which is the ONLY place the field seeds the walk. Limb 4 and the
  // month-to-month carry-forward read this local and nothing else.
  let openingBalance: Cents = household.openingOffsetBalance ?? toCents(0);
  // **The running home-loan balance, seeded from the Household's stated opening figure (P3-16
  // slice 1)** — `openingBalance` above, exactly. It falls by the month's principal and by nothing
  // else, and the day it reaches nil the walk stops charging a repayment: a household that goes on
  // paying a loan it has cleared is the silent wrong answer this carry exists to prevent. A
  // Household stating no mortgage leaves it at nil for the whole walk, and nil emits nothing.
  let mortgageBalance: Cents = household.mortgage?.openingBalance ?? toCents(0);
  // **THE LOAN'S TERMS IN FORCE — P3-16 slice 2, and it is a plain `let` for `spending`'s reason.**
  // The mortgage stopped being a standing fact from day one when `MORTGAGE_REFINANCE` was
  // specified: it is a `level` in `ENTRY_KIND`, so the terms hold from an entry's date until
  // another supersedes them, and this local is the whole of that. `household.mortgage` seeds it and
  // is read NOWHERE ELSE in the month loop from here on — the direct reads that used to sit at the
  // pricing site and at the `Month` emit now read this.
  //
  // **`undefined` is "no loan in force", and it is the SAME third state slice 1 already had.** A
  // Household that states none starts here at `undefined` and an entry can originate one; a loan
  // that amortises to nil leaves the terms standing with `mortgageBalance` at nil, which is how a
  // later entry can be recognised as a NEW loan rather than a refusal.
  //
  // ⚠️ **There is no shared "find the level in force" helper, and this deliberately does not build
  // one.** `SPEND_CHANGE` is a per-type `let` reassigned by one branch below, and so is this. The
  // generic `governing` Map exists only for provenance (`appliedEntryIds`) and decides no figure.
  let mortgage: Mortgage | undefined = household.mortgage;
  // **Which entry set the terms, or `undefined` for the Household's own stated loan.** Carried
  // beside the terms rather than read back off `governing`, on P5-3's ruling: the level and its
  // author are ONE value, written at the same statement, so a repayment line cannot be attributed
  // to an entry that did not set the figure it carries. It is also what the walk-time refusal
  // quotes, so an unpayable month can name the entry the user has to fix.
  let mortgageEntryId: string | undefined = undefined;
  // **Chunk 5a — the balances that move.** One entry per Person in `household.persons` order, each
  // holding that Person's super interest balances in their own order. Plain mutable locals, exactly
  // as `retiredOn`, `worksNoDays`, `annualSpend` and `openingBalance` above: an accumulator LOCAL to
  // the call is what keeps `project()` pure (ADR-0002 — the solver calls it in a loop), and a
  // module-level one would not be. They start at the figures the user STATED, which are stated as at
  // `settings.asAtDate`, so month 0 reports the Household exactly as given. See `PersonBalances` for
  // which balances are in here and, just as deliberately, which are not.
  const balances: { parcels: readonly Parcel[]; workBonusBalance: Cents; readonly superInterestBalances: Cents[] }[] =
    household.persons.map((person) => ({
      parcels: person.parcels,
      workBonusBalance: person.workBonusBalance,
      superInterestBalances: person.superInterests.map((interest) => interest.balance),
    }));

  // **Chunk 5b — the year's Sch 7 minimum, per Account-Based Pension interest, and what is LEFT of
  // it.** Same shape and same reason as `balances` above: a plain mutable local, so `project()` stays
  // pure. `undefined` means *not determined for any year yet*; a stored `fy` that is not the month's
  // financial year means *not determined for THIS year*, which is a different fact again and is the
  // the opening financial year of a walk that has not reached its determination month yet — see the
  // determination block inside the loop, which since P10-5 makes that month the walk's FIRST where
  // Sch 7's own day is behind the forecast.
  // **Chunk 5 — the realised gains, per Person and per FINANCIAL YEAR, and what has already been
  // charged on them.** A disposal's realisations are accumulated here rather than recomputed at the
  // assessment because the parcels they were computed from are gone by then: a disposal is the one
  // event in this walk that destroys its own inputs.
  //
  // `fy` is the year the realisations belong to and the accumulator is emptied when the walk crosses
  // into a new one — s 102-5 is an ANNUAL computation, so a loss realised in July has no business
  // netting against a gain realised the previous June. `charged` is the net capital gain already
  // reflected in an `Income tax on capital gain` line, so a second disposal in the same year is
  // assessed on top of the first and never from a standing start: the increments telescope to one
  // year's tax on one year's net capital gain.
  // From FY2027-28 a realisation is split on the day it happens (LR-1 slice 2) and kept in
  // `reformed`; `realisations` holds a year before the reform. A financial year is one or the other,
  // because the reform starts on a 1 July.
  const capitalGains = household.persons.map(() => ({
    fy: undefined as FinancialYear | undefined,
    realisations: [] as ParcelRealisation[],
    reformed: [] as ReformedRealisation[],
    charged: toCents(0),
    minimumTaxCharged: toCents(0),
  }));
  /** The monthly accrual's gain vector: nil for every Person, written once so the shape cannot drift. */
  const NO_CAPITAL_GAIN: readonly Cents[] = Object.freeze(household.persons.map(() => toCents(0)));

  // `instalment` is set only when a `TTR_RATE_CHANGE` re-sets a TTR year part-way (the remaining
  // figure spread over the months left), and `ttr` carries what that re-set needs from the relevant day.
  const pensionYears: ({
    fy: FinancialYear;
    amount: Cents;
    remaining: Cents;
    instalment?: Cents;
    ttr?: { rate: number | undefined; balanceOnRelevantDay: Cents; balanceObservedOn: IsoDate; minimum: Cents };
  } | undefined)[][] = household.persons.map((person) => person.superInterests.map(() => undefined));

  // **P3-8's conversion limb, WIRED (2026-09-22): each TTR interest's conversion day, resolved
  // ONCE and carried as a walk-level fact exactly like `retiredOn` above** — the EARLY override
  // where a validating `TRIS_EARLY_CONVERSION` entry names this interest, otherwise R13's
  // automatic-65 backstop (`trisConversionDayUnderItem106`). `undefined` for every slot that is not,
  // and never becomes, a TTR: an accumulation or already-account-based-pension interest never asks
  // "has this converted yet".
  //
  // **Read directly off `entries`, keyed by (personIndex, slot) — NOT through the `standing` /
  // `carried` levels machinery above.** That machinery dedupes a pre-dated level by `type \0 owner`,
  // which is the right rule for `RETIRE` and `WORK_PATTERN_CHANGE`: a later entry of the same type
  // SUPERSEDES an earlier one for the same Person. `TRIS_EARLY_CONVERSION` is not that kind of
  // level — two different interests of the SAME Person may each carry their own independent
  // conversion day — and deduping by owner alone would silently drop one interest's fact in favour
  // of the other's, the P4-12 silent-no-op shape this build refuses. So this is resolved directly,
  // keyed by the interest itself rather than by `type`+`owner`.
  //
  // **The 65th-birthday boundary is NOT re-checked here.** `checkTrisEarlyConversionTargets`
  // (`parsePlan.ts`) already refuses a stated day on or after the Person's 65th birthday, at the
  // door, by name. Re-deriving that boundary here would be a redundant check standing in front of
  // the door's own refusal — this function trusts the entry's `date` exactly as `retiredOn` trusts
  // a `RETIRE` entry's, and a direct `project()` caller who bypasses the door is on their own, on
  // `LUMP_SUM_FROM_SUPER`'s own precedent for the structural checks (owner, index) it DOES repeat.
  const conversionDay: (IsoDate | undefined)[][] = household.persons.map((person) => person.superInterests.map(() => undefined));
  for (const entry of entries) {
    if (!entry.enabled || entry.type !== 'TRIS_EARLY_CONVERSION') continue;
    if (entry.owner === 'household') {
      throw new RangeError(
        `entry ${entry.id} (TRIS_EARLY_CONVERSION) is owned by "household", and a superannuation interest converting early belongs to one Person's account: the two members hold separate interests, separately preserved. State personA or personB`,
      );
    }
    const personIndex = entry.owner === 'personA' ? 0 : 1;
    const person = household.persons[personIndex];
    if (person === undefined) {
      throw new RangeError(`entry ${entry.id} (TRIS_EARLY_CONVERSION) is owned by ${entry.owner}, and this Household has ${household.persons.length} Person(s)`);
    }
    const slot = entry.params.interestIndex;
    if (person.superInterests[slot] === undefined) {
      throw new RangeError(
        `entry ${entry.id} (TRIS_EARLY_CONVERSION) names superannuation interest ${slot}, and ${person.name} holds ${person.superInterests.length}: the interest is stated positionally and this position is not one of them`,
      );
    }
    const row = conversionDay[personIndex] as (IsoDate | undefined)[];
    // First-stated wins, on `retiredOn`'s own precedent — this build has no rule for two entries
    // naming the same interest and this is not the place to invent one.
    row[slot] = row[slot] ?? entry.date;
  }
  // **TTR_START (retire flow S4): an accumulation account becomes a TTR from a date.** The account is
  // one the plan already states, so nothing is opened mid-walk: `effectivePhaseFor` reads it as
  // accumulation before the day and `'ttr'` from it, and it converts on `conversionDay` exactly as a
  // stated TTR does (item 106 at 65 below, or the RETIRE day in the switch after). Keyed by (Person,
  // interest), `conversionDay`'s reason. The door refuses the rest; the two refusals that need the
  // Scenario are repeated here for a direct `project()` caller.
  //
  // **RF-2: a start after a return to work (SISR Sch 1 item 110 turns on age, not work).** Refused
  // only while stopped: the latest stop or return on or before the day is a stop. It converts at the
  // NEXT stop after it, or at 65, whichever is first, and that stop converts only this account
  // (`ttrConvertsAtStop`). An account the first stop already switched is a pension, so it is refused.
  const switches = retirementSwitches(household, entries, settings.asAtDate);
  const spells = workSpells(household, entries);
  const ttrConvertsAtStop: (IsoDate | undefined)[][] = household.persons.map((person) => person.superInterests.map(() => undefined));
  const ttrAt65: (IsoDate | undefined)[][] = household.persons.map((person) => person.superInterests.map(() => undefined));
  const ttrStartDay: (IsoDate | undefined)[][] = household.persons.map((person) => person.superInterests.map(() => undefined));
  const ttrStartRate: (number | undefined)[][] = household.persons.map((person) => person.superInterests.map(() => undefined));
  for (const entry of entries) {
    if (!entry.enabled || entry.type !== 'TTR_START') continue;
    const personIndex = entry.owner === 'personB' ? 1 : 0;
    const person = entry.owner === 'household' ? undefined : household.persons[personIndex];
    const slot = entry.params.interestIndex;
    if (person === undefined || person.superInterests[slot]?.phase !== 'accumulation') {
      throw new RangeError(`entry ${entry.id} (TTR_START) names super account ${slot} of ${entry.owner}, and this Household holds no accumulation account there`);
    }
    const row = ttrStartDay[personIndex] as (IsoDate | undefined)[];
    if (row[slot] !== undefined) {
      throw new RangeError(`entry ${entry.id} (TTR_START) is a second start for ${person.name}'s super account ${slot + 1} in this scenario. An account starts its transition to retirement pension once`);
    }
    const latest = (spells[personIndex] ?? []).filter((change) => change.date <= entry.date).at(-1);
    if (latest?.kind === 'stopped') {
      throw new RangeError(`entry ${entry.id} (TTR_START) starts ${person.name}'s transition to retirement pension on ${entry.date}, on or after their Retire entry dated ${latest.date}. Stopping work already turns the super into a full pension, so the pension can't start after it. After going back to work one can start again: date it on or after the return`);
    }
    const decided = switches[personIndex];
    if (decided?.kind === 'switches' && decided.slots.includes(slot) && decided.retireDay <= entry.date) {
      throw new RangeError(`entry ${entry.id} (TTR_START) starts a transition to retirement pension from ${person.name}'s super account ${slot + 1} on ${entry.date}, and that account already became a full pension when ${person.name} stopped work on ${decided.retireDay}. Choose an account kept in accumulation at retirement`);
    }
    row[slot] = entry.date;
    (ttrStartRate[personIndex] as (number | undefined)[])[slot] = entry.params.drawdownRate;
  }
  household.persons.forEach((person, personIndex) => {
    person.superInterests.forEach((interest, slot) => {
      const startsOn = ttrStartDay[personIndex]?.[slot];
      if (startsOn !== undefined) {
        // R13's backstop for a started TTR: the 65th birthday, read off the day it started.
        const at65 = trisConversionDayUnderItem106(person.dateOfBirth, { commencementDay: startsOn });
        const changes = spells[personIndex] ?? [];
        // RF-2: after a stop, the next stop after the start converts it, where that is before 65.
        const nextStop = changes.some((change) => change.kind === 'stopped' && change.date < startsOn)
          ? changes.find((change) => change.kind === 'stopped' && change.date > startsOn)?.date
          : undefined;
        if (nextStop !== undefined && nextStop < at65) {
          (ttrConvertsAtStop[personIndex] as (IsoDate | undefined)[])[slot] = nextStop;
          (ttrAt65[personIndex] as (IsoDate | undefined)[])[slot] = at65;
        }
        (conversionDay[personIndex] as (IsoDate | undefined)[])[slot] = nextStop !== undefined && nextStop < at65 ? nextStop : at65;
        return;
      }
      if (interest.phase !== 'ttr') return; // never asked: not a TTR today, so nothing to convert
      const row = conversionDay[personIndex] as (IsoDate | undefined)[];
      if (row[slot] !== undefined) return; // the early override above already resolved it
      // R13's backstop. May itself refuse — a stated notification day, a non-automatic Schedule 1
      // item, or a stated changeover day after the 65th birthday — and that refusal is EXPECTED and
      // deliberately not caught: a household that stated a notification-based retirement rather than
      // relying on turning 65 is a case this build does not yet model automatically (chunk 5b-6), and
      // silently guessing past it would be the confidently-wrong output this whole build exists to
      // stop. `trisConversionDayUnderItem106` is read here for its calendar arithmetic, unchanged.
      row[slot] = trisConversionDayUnderItem106(person.dateOfBirth, interest.statedStreamSettings);
    });
  });

  // **THE SWITCH AT RETIREMENT (user ruling, 2026-09-23).** A `RETIRE` at 60 or older turns each of
  // that Person's accumulation accounts into a retirement-phase account-based pension on the RETIRE
  // day, and brings a TTR's conversion forward to that day where it is earlier than the day above.
  // `retirementPension.ts` decides who, which accounts and which day, off the plan; it is the same
  // expression the notice on the page reads. The transfer balance cap is the one test it cannot
  // make, because it needs the balance on the day: the tick for the RETIRE month makes it below and
  // puts the day back where it was (`beforeSwitch`) if the balance is over.
  // **Stops and returns to work (retire flow S3, user ruling 2026-09-29).** A second stop does not
  // switch anything: `switches` reads the first `RETIRE`, an account kept in accumulation stays kept
  // out, and no new account is opened. A return in the same month as the stop is refused: the month
  // would have to pay part of itself on each side of the break. `spells` is read above.
  spells.forEach((changes, personIndex) => {
    changes.forEach((change, at) => {
      const stop = changes[at - 1];
      if (change.kind !== 'returned' || stop === undefined || monthOf(change.date) !== monthOf(stop.date) || monthOf(change.date) < first) return;
      throw new RangeError(
        `entry ${change.entryId} (WORK_PATTERN_CHANGE) has ${household.persons[personIndex]?.name ?? `person ${personIndex + 1}`} going back to work on ${change.date}, in the same month as stopping work on ${stop.date}. The forecast works a month at a time and can't pay part of a month on each side of the break. Move the return into a later month`,
      );
    });
  });
  /** The latest stop or return in force in `month`, and its place in the Person's list; one dated before the plan counts from its first month. */
  const spellIn = (personIndex: number, month: IsoMonth): { readonly change: WorkSpellChange; readonly at: number } | undefined => {
    const changes = spells[personIndex] ?? [];
    for (let at = changes.length - 1; at >= 0; at -= 1) {
      const change = changes[at] as WorkSpellChange;
      if (monthOf(change.date) <= month) return { change, at };
    }
    return undefined;
  };
  // Over the cap, a TTR_START after a return (RF-2) goes back to its 65th birthday, not its stop.
  const beforeSwitch: readonly (readonly (IsoDate | undefined)[])[] = conversionDay.map((row, personIndex) => row.map((day, slot) => ttrAt65[personIndex]?.[slot] ?? day));
  /** RF-2: the accounts a TTR_START after a return started converts on this stop. */
  const ttrConvertingOn = (personIndex: number, stopDay: IsoDate): readonly number[] =>
    (ttrConvertsAtStop[personIndex] ?? []).flatMap((day, slot) => (day === stopDay ? [slot] : []));
  switches.forEach((decided, personIndex) => {
    if (decided.kind !== 'switches') return;
    const row = conversionDay[personIndex] as (IsoDate | undefined)[];
    for (const slot of decided.slots) {
      const held = row[slot];
      row[slot] = held === undefined || decided.retireDay < held ? decided.retireDay : held;
    }
  });
  // The balance each in-walk conversion credited to the Person's transfer balance account, taken the
  // month it happened. Read only by the cap test at retirement: a TTR that converted earlier has
  // already used that much of the cap.
  const creditedAtConversion: (Cents | undefined)[][] = household.persons.map((person) => person.superInterests.map(() => undefined));
  /**
   * **The commencement day Sch 7 keys the minimum off.** A stated stream's own day; for an account
   * that was in accumulation, the day it switched — including cl 4's nil year for a June start.
   * Without this an account that switched would have no minimum determined, limb 2 would never draw
   * it, and every month after retirement would show a shortfall beside the money.
   */
  const commencementDayFor = (personIndex: number, slot: number): IsoDate | undefined => {
    const interest = household.persons[personIndex]?.superInterests[slot];
    if (interest === undefined) return undefined;
    // A started TTR keeps its own start as the day it commenced, through its conversion too: the same
    // stream in law, as a stated TTR keeps its stated day.
    const startsOn = ttrStartDay[personIndex]?.[slot];
    if (startsOn !== undefined) return startsOn;
    return interest.phase === 'accumulation' ? conversionDay[personIndex]?.[slot] : statedCommencementDay(interest);
  };

  // **TTR build step 3: each TTR interest's dated drawdown-rate changes, keyed by (Person, interest).**
  // Read off `entries` directly, `conversionDay`'s reason: the `standing` levels above keep one
  // pre-dated entry per `type`+`owner`, so a Person's second TTR account's change would be dropped.
  // Refused here, by the entry's id, where the door cannot see it: a change dated on or after the
  // interest's conversion day in THIS Scenario — a full pension has no rate to change.
  const ttrRateChanges: { readonly date: IsoDate; readonly rate: number }[][][] =
    household.persons.map((person) => person.superInterests.map(() => []));
  for (const entry of entries) {
    if (!entry.enabled || entry.type !== 'TTR_RATE_CHANGE') continue;
    const personIndex = entry.owner === 'personB' ? 1 : 0;
    const person = entry.owner === 'household' ? undefined : household.persons[personIndex];
    const slot = entry.params.interestIndex;
    const interest = person?.superInterests[slot];
    if (person === undefined || interest === undefined) {
      throw new RangeError(`entry ${entry.id} (TTR_RATE_CHANGE) names super account ${slot} of ${entry.owner}, and this Household holds no such account`);
    }
    const startsOn = ttrStartDay[personIndex]?.[slot];
    if (interest.phase !== 'ttr' && (startsOn === undefined || entry.date < startsOn)) {
      throw new RangeError(`entry ${entry.id} (TTR_RATE_CHANGE) changes the drawdown rate of ${person.name}'s super account ${slot}, which is not a transition to retirement pension${startsOn === undefined ? '' : ` until ${startsOn}`}. Only a transition to retirement pension has a drawdown rate to change`);
    }
    const convertsOn = conversionDay[personIndex]?.[slot];
    if (convertsOn !== undefined && entry.date >= convertsOn) {
      throw new RangeError(
        `The change to ${person.name}'s transition to retirement pension dated ${entry.date} comes on or after ${convertsOn}, the day that account becomes a full pension in this scenario. A full pension has no drawdown rate to change: date the change before ${convertsOn}, or remove it`,
      );
    }
    ttrRateChanges[personIndex]?.[slot]?.push({ date: entry.date, rate: entry.params.drawdownRate });
  }
  // Stable sort: two changes on one day keep the Scenario's order, and the later-stated one governs.
  for (const row of ttrRateChanges) for (const changes of row) changes.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
  /** The rate in force for a month: the last change dated in or before it, else the stated setting. */
  const ttrRateInForce = (personIndex: number, slot: number, month: IsoMonth): number | undefined => {
    const changes = ttrRateChanges[personIndex]?.[slot] ?? [];
    const governing = changes.filter((change) => monthOf(change.date) <= month).at(-1);
    if (governing !== undefined) return governing.rate;
    if (ttrStartDay[personIndex]?.[slot] !== undefined) return ttrStartRate[personIndex]?.[slot];
    return household.persons[personIndex]?.superInterests[slot]?.statedStreamSettings?.statedTtrDrawdownRate;
  };

  // **P3-17a slice 3: each interest's dated insurance cover changes, keyed by (Person, interest)** —
  // `ttrRateChanges`' shape and reason. Per benefit, the latest change in force governs; `'both'`
  // sets the two at once. The door has refused a missing account; this is the walk's own guard.
  const coverChanges: { readonly date: IsoDate; readonly benefit: 'death' | 'tpd' | 'both'; readonly fraction: number; readonly id: string }[][][] =
    household.persons.map((person) => person.superInterests.map(() => []));
  for (const entry of entries) {
    if (!entry.enabled || entry.type !== 'INSURANCE_COVER_CHANGE') continue;
    const changes = entry.owner === 'household' ? undefined : coverChanges[entry.owner === 'personB' ? 1 : 0]?.[entry.params.interestIndex];
    if (changes === undefined) {
      throw new RangeError(`entry ${entry.id} (INSURANCE_COVER_CHANGE) names super account ${entry.params.interestIndex} of ${entry.owner}, and this Household holds no such account`);
    }
    changes.push({ date: entry.date, benefit: entry.params.benefit, fraction: entry.params.coverFraction, id: entry.id });
  }
  for (const row of coverChanges) for (const changes of row) changes.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
  /** The cover kept on one interest in a month, and the entries that set it; full cover and none before any. */
  const coverInForce = (personIndex: number, slot: number, month: IsoMonth): { readonly cover: CoverKept; readonly entryIds: readonly string[] } => {
    const inForce = (coverChanges[personIndex]?.[slot] ?? []).filter((change) => monthOf(change.date) <= month);
    if (inForce.length === 0) return { cover: FULL_COVER, entryIds: [] };
    const governing = (benefit: 'death' | 'tpd') => inForce.filter((change) => change.benefit === benefit || change.benefit === 'both').at(-1);
    const [death, tpd] = [governing('death'), governing('tpd')];
    return {
      cover: { death: death?.fraction ?? 1, tpd: tpd?.fraction ?? 1 },
      entryIds: [...new Set([death?.id, tpd?.id].filter((id): id is string => id !== undefined))],
    };
  };

  /**
   * **THE one place `SuperInterest.phase` is resolved for a MONTH, rather than read off the stated
   * literal.** Every site below that used to read `interest.phase` directly now asks this instead,
   * for interests the conversion above can reach: `'ttr'` until `date` reaches `conversionDay`, then
   * `'accountBasedPension'` from that day on and forever after (a conversion does not un-happen).
   * **From 2026-09-23 an `'accumulation'` interest can convert too** — the switch at retirement —
   * and reads the same map the same way. A stated account-based pension passes straight through.
   */
  const effectivePhaseFor = (personIndex: number, slot: number, date: IsoDate): SuperInterest['phase'] => {
    const interest = household.persons[personIndex]?.superInterests[slot];
    if (interest === undefined) throw new RangeError(`no superannuation interest ${slot} for person ${personIndex}`);
    if (interest.phase === 'accountBasedPension') return interest.phase;
    const day = conversionDay[personIndex]?.[slot];
    if (day !== undefined && date >= day) return 'accountBasedPension';
    const startsOn = ttrStartDay[personIndex]?.[slot];
    return startsOn !== undefined && date >= startsOn ? 'ttr' : interest.phase;
  };

  /**
   * The day an accumulation account stopped building up — it switched at retirement, or a TTR_START
   * made it a TTR — once `date` has reached it; otherwise nothing. It is the day the pension
   * commenced, and the day from which the account takes no contributions.
   */
  const switchedOn = (personIndex: number, slot: number, date: IsoDate): IsoDate | undefined => {
    if (household.persons[personIndex]?.superInterests[slot]?.phase !== 'accumulation') return undefined;
    const day = ttrStartDay[personIndex]?.[slot] ?? conversionDay[personIndex]?.[slot];
    return day !== undefined && date >= day ? day : undefined;
  };

  /**
   * The phase the pension payment reads for a month. `effectivePhaseFor` asks on the month's first
   * day, so a TTR_START dated later in its month would pay nothing in its first month, and its first
   * year — determined in the commencement month — would never be set. A start inside the month is
   * a TTR for the payment, as the switch at retirement already is (`switchesThisMonth`).
   */
  const ttrPhaseForPayment = (personIndex: number, slot: number, date: IsoDate): SuperInterest['phase'] => {
    const phase = effectivePhaseFor(personIndex, slot, date);
    const startsOn = ttrStartDay[personIndex]?.[slot];
    return phase === 'accumulation' && startsOn !== undefined && monthOf(startsOn) === monthOf(date) ? 'ttr' : phase;
  };

  /**
   * **A contribution into an account that switched at retirement is refused, not paid into a
   * pension.** A pension account is closed to contributions, and the three routes in (the employer's
   * Guarantee, a salary sacrifice, a spouse contribution) all resolve their account off the phase the
   * plan STATES, which is still accumulation. This only arises where money is paid in after the
   * RETIRE date — work resumed, or an entry dated after it.
   *
   * **The retirement month's own pay is not refused (2026-09-23).** That month pays the days worked
   * up to and including the RETIRE date, and the account switches ON that date, so a retirement on
   * the 1st would otherwise refuse the Guarantee and sacrifice on its one day of pay. They are for
   * work done before the pension began, and are credited to the account as it is.
   */
  const refuseContributionAfterSwitch = (personIndex: number, slot: number, date: IsoDate, what: string, fromFinalPay = false): void => {
    const day = switchedOn(personIndex, slot, date);
    if (day === undefined || (fromFinalPay && monthOf(day) === monthOf(date))) return;
    const name = household.persons[personIndex]?.name ?? `person ${personIndex + 1}`;
    if (ttrStartDay[personIndex]?.[slot] === day) {
      throw new RangeError(
        `${what} for ${name} on ${date} would go into super account ${slot + 1}, which became a transition to retirement pension on ${day}. A pension account cannot take contributions. Pay it into ${name}'s other accumulation account instead`,
      );
    }
    throw new RangeError(
      `${what} for ${name} on ${date} would go into super account ${slot + 1}, which became an account-based pension at retirement on ${day}. A pension account cannot take contributions. Tick "Keep in accumulation at retirement" on that account, or give ${name} another accumulation account for it`,
    );
  };

  /**
   * **P3-42 step 2 — which row of register §3.1 completes fund earnings tax for one `SuperInterest`
   * over a COMPLETED financial year, and how much of that year it held that row.** Reuses the SAME
   * `conversionDay` map `effectivePhaseFor` just above closes over — R10's resolution, as the
   * re-gate note of 2026-09-22 requires, and not a second phase-for-year resolver.
   *
   * **The DECLARED literal decides which branch, not `effectivePhaseFor`'s month-by-month read**,
   * because a completed YEAR is being asked about as a whole and not one day of it. A declared
   * `'accountBasedPension'` interest carries no conversion day (`conversionDay` never sets one for
   * it) and is treated as Retirement Phase for the whole of every completed year — the same
   * convention `accessibleWealthByPerson` already gives it (unconditionally reachable, no gate
   * re-derived). ~~A declared `'accumulation'` interest never converts and is Accumulation Phase for
   * every year.~~ **False from 2026-09-23: an accumulation interest converts at retirement, and is
   * resolved exactly as a TTR is below.**
   *
   * **A declared `'ttr'` (or `'accumulation'`) interest reads `conversionDay`.** Absent, or dated in a financial year
   * AFTER the one being assessed: still Accumulation Phase, whole year — the conversion has not
   * happened by the close of the year in question. Dated WITHIN the assessed year: Retirement
   * Phase, and R10's bound — `phaseHeldFrom`, which `superPhase.ts`'s `CHARGED` table resolves to
   * the Accumulation rate on the WHOLE year's earnings, disclosed as a proven ceiling rather than
   * the fund's actual ECPI. Dated in a financial year BEFORE the one being assessed (already
   * converted before the assessed year opened): Retirement Phase, whole year — the interest held
   * that phase for the whole of the year being assessed, so there is no part-year bound to apply.
   */
  const fundTaxPhaseForYear = (
    personIndex: number,
    slot: number,
    completedFy: FinancialYear,
  ): { readonly phase: EarningsPhase; readonly phaseHeldFor: PhaseYearFraction } => {
    const declared = household.persons[personIndex]?.superInterests[slot]?.phase;
    if (declared === undefined) throw new RangeError(`no superannuation interest ${slot} for person ${personIndex}`);
    if (declared === 'accountBasedPension') {
      return { phase: 'retirement', phaseHeldFor: phaseHeldForTheWholeYear(completedFy) };
    }
    const day = conversionDay[personIndex]?.[slot];
    if (day !== undefined && financialYearContaining(day) === completedFy) {
      return { phase: 'retirement', phaseHeldFor: phaseHeldFrom(completedFy, day) };
    }
    if (day !== undefined && day <= endOfFinancialYear(completedFy)) {
      return { phase: 'retirement', phaseHeldFor: phaseHeldForTheWholeYear(completedFy) };
    }
    return { phase: 'accumulation', phaseHeldFor: phaseHeldForTheWholeYear(completedFy) };
  };

  /**
   * **The branded `superPhase.ts` interest `fundEarningsTax` requires, for one Person's interest in
   * one resolved phase, over a COMPLETED financial year.** `on` is the close of that year: the tax
   * is being worked out for the year as a whole, and the year's own close is the one date every
   * part of it agrees the phase is being asked about as at.
   *
   * **Accumulation Phase never reads `release.met`** — `accumulationInterest`'s own gate, and the
   * SAME row `fundEarningsTax` charges a `'ttr'`-declared interest that has never converted — so a
   * minimal, always-succeeding release (nobody has ceased gainful employment) is enough: the rate
   * this function's caller reaches does not turn on whether that release is real.
   *
   * **Retirement Phase DOES read `release.met`** — `retirementPhaseInterest`'s own gate — so the
   * REAL cessation fact this walk already carries is the one it is asked with: `retiredOn`'s own
   * array, the SAME fact `gainfulEmploymentAsAt` below reads, just asked about the completed year's
   * close rather than about `date`. A Person genuinely released by then — by age, or by a real
   * cessation on or before that close — passes; one this walk cannot establish a release for
   * throws, which is a genuine gap in what the model can answer for THIS Person's Retirement Phase
   * interest, not a defect this function introduces by asking.
   */
  const fundTaxInterestFor = (
    personIndex: number,
    phase: EarningsPhase,
    completedFy: FinancialYear,
  ): FundEarningsSuperInterest => {
    const person = household.persons[personIndex];
    if (person === undefined) throw new RangeError(`no Person ${personIndex}`);
    const on = endOfFinancialYear(completedFy);
    if (phase === 'accumulation') {
      return accumulationInterest(conditionOfRelease({ dateOfBirth: person.dateOfBirth, on, gainfulEmployment: { ceased: false } }));
    }
    // A stop after going back to work (retire flow S3) is its own cessation: where the first was
    // before 60, it is the one that released the pension.
    const again = (spells[personIndex] ?? []).filter((change, at) => at > 0 && change.kind === 'stopped' && change.date <= on).at(-1);
    const ceasedOn = again?.date ?? retiredOn[personIndex];
    const gainfulEmployment: GainfulEmployment = ceasedOn === undefined || ceasedOn > on ? { ceased: false } : { ceased: true, ceasedOn };
    return retirementPhaseInterest(conditionOfRelease({ dateOfBirth: person.dateOfBirth, on, gainfulEmployment }));
  };

  // **P4-2 — ONE Person's tax inputs, for ONE STATED financial year, at ONE STATED annual salary.**
  //
  // **Hoisted OUT of the month loop by P4-2, and the reason is the THIRD call site.** Chunk 5 had
  // already hoisted this out of the tax block because a disposal assesses the same Household twice;
  // the year-end true-up below assesses it a third time — for a financial year that has ENDED, on
  // that year's own total salary, from inside the month that follows it. A function that closed over
  // the month's `fy` and the month's `salaries` could not be asked that question at all, so the year
  // and the salary became parameters. Nothing else changed: the monthly accrual passes the month's
  // own `fy` and its own annualised salaries, exactly as it did when they were captured.
  //
  // One function rather than two: a second spelling of which base a gain, a deduction or an offset
  // reaches is exactly the drift T9 exists to stop.
  //
  // `gain` is the s 102-5 figure for the financial year — nil in the monthly accrual, the year's
  // accumulated figure at a disposal, and the year's FINAL figure in the true-up.
  const asSaptoPerson = (
    person: Person,
    assessmentFy: FinancialYear,
    salary: Cents,
    sacrificed: Cents,
    gain: Cents,
    qualifiedForAgePension: boolean,
    spouseContributionMade: Cents = toCents(0),
    // **P14-13 — `RENT_OUT_HOME`'s net rent, NOT folded into `gain`: a capital gain can never be
    // negative (s 102-5, `taxableIncomeWithNetCapitalGain`'s own refusal — a loss is already nil by
    // the time it reaches `gain`), and a real rental LOSS is not.** Applied AFTER the ordinary
    // salary-and-gain figure is computed, on `netLabourIncome`'s own reason for staying separate
    // from `salary`: WATO's base must stay pure labour income, and folding rent into `salary` would
    // put it there too. The COMBINED total is re-floored at nil — this build does not carry a tax
    // loss forward, ordinary income tax's own floor (s 4-15) rather than something this task adds.
    otherIncome: Cents = toCents(0),
    // **LR-1 slice 3 — Div 119's facts for the year**, absent where there is no minimum tax capital
    // gain (the monthly accrual). Passed straight through to `householdIncomeTax`.
    minimumTax: MinimumTaxFacts | undefined = undefined,
  ): SaptoPerson & { readonly div293Income: Div293Income } => {
    const income = taxableIncome(
      Math.max(0, taxableIncomeWithNetCapitalGain(taxableIncomeFromSalary(assessmentFy, salary, REDUCER_DEDUCTIONS), gain) + otherIncome) as Cents,
    );
    // **REBATE INCOME HOLDS WHILE TAXABLE INCOME FALLS, AND FROM P6-8 BRIEF 2 CHUNK 2 IT HOLDS BY
    // THE MECHANISM THE ACT NAMES.** ITAA 1936 s 6(1) "rebate income" is taxable income PLUS
    // *reportable superannuation contributions*, and ITAA 1997 s 995-1(1) makes an amount sacrificed
    // under an effective arrangement a *reportable employer superannuation contribution* — TAA 1953
    // Sch 1 s 16-182(1)(c)/(d) is satisfied by construction, because the Person chose its size. So
    // the sacrifice is ADDED BACK to the reduced taxable income. It is not that the gross is
    // assessed, and the difference between those two sentences is a real number, below.
    //
    // ⚠️ **THIS SUPERSEDES CHUNK 1's `addCents(salary, sacrificed)` RECONSTRUCTION**, which its own
    // author called the right answer by the wrong mechanism. The two agree wherever the ASSESSABLE
    // salary is at or above s 25-130(2)'s $1,000 standard deduction — which is every fixture in this
    // repo — and they differ by exactly `min($1,000, assessable) − min($1,000, gross)` below it,
    // because the reconstruction ran the deduction against the GROSS. A Person sacrificing all but
    // $500 of their pay was given $1,000 of work deduction out of $500 of work income, and a Rebate
    // Income $500 too LOW: an offset shaded out too little, in the flattering direction. Here the
    // deduction lands on the salary actually derived and the whole sacrifice is added back after it,
    // so the add-back is exact whatever is sacrificed and there is no gross to reconstruct — which
    // also retires chunk 1's second known divergence, that a gross rebuilt from twelve rounded
    // twelfths of each half could sit cents away from the year's real gross.
    //
    // The other three add-backs are nil and are WRITTEN nil rather than defaulted: no limb of this
    // walk produces a net investment loss, a reportable fringe benefit or an assessable FHSS
    // released amount. `rebateIncomeFrom` — the shortcut that says all four are nil in one word — is
    // no longer the honest spelling here, because one of the four is not.
    const reportable = reportableSuperannuationContributions({
      // The one live limb. `sacrificed` is the amount taken out of the pay before the income was
      // derived, capped at that pay, so it is never more than the Person actually sacrificed.
      salarySacrificed: sacrificed,
      // A negotiated above-SG employer amount is a fact about the Person's package that no entry
      // states. Compulsory SG at the legislated rate is not reportable at all (s 16-182(1)(c)/(d)),
      // so it has no limb here to be wrongly filed under and its absence is not an omission.
      otherReportableEmployerContributions: toCents(0),
      // Nil, and nil with the notice UNACKNOWLEDGED. Nothing in this walk makes a personal
      // contribution, and `personalDeductibleContributions` is asked rather than the brand reused,
      // so the day one exists it cannot be deducted without the s 290-170 acknowledgement.
      personalDeductible: personalDeductibleContributions(toCents(0), { noticeOfIntentAcknowledged: false }),
      // ⚠️ **s 995-1 reduces the sum, but not below zero, by the year's EXCESS concessional
      // contributions — so a sacrifice over the cap is NOT reportable in full.** Nothing in this
      // walk computes a cap position (P6-8 chunk 5 owns the excess, and refuses rather than prices
      // it), so this is nil, and while it is nil an over-cap sacrifice is added back whole and
      // Rebate Income is OVER-stated. That shades SAPTO out further and claims nothing, which is the
      // direction a known gap is allowed to be wrong in.
      excessConcessionalContributions: toCents(0),
    });
    return {
      name: person.name,
      taxableIncome: income,
      // Built through `rebateIncome` rather than by reusing the `TaxableIncome` brand, because the
      // two are different bases (T9) and their equality — where nothing is sacrificed — is a
      // property of THAT fixture and not of the model.
      rebateIncome: rebateIncome({
        taxableIncome: income,
        reportableSuperContributions: reportable,
        totalNetInvestmentLoss: toCents(0),
        adjustedFringeBenefitsTotal: toCents(0),
        assessableFhssReleasedAmounts: toCents(0),
      }),
      // **s 160AAAA(2)(b) — "qualified for", not "receiving"** — answered by the caller from the
      // walk's OWN Age Pension figure and never from a second determination. The monthly accrual
      // passes the month's own answer; the true-up passes the year's, on the rule stated there.
      qualifiedForAgePension,
      // Always supplied, though the field is optional and `householdIncomeTax` ignores it in
      // every year before FY2027-28. Omitting it in a WATO year raises
      // `NetLabourIncomeNotSuppliedError`, and a walk that spans the FY2027-28 boundary would
      // start throwing in July 2027 on a fixture that had computed happily all the year before.
      netLabourIncome: netLabourIncomeFromSalary(assessmentFy, salary, REDUCER_DEDUCTIONS),
      // **P6-9 chunk 1 — the Division 293 income base, built and carried, and CHARGED NOWHERE.**
      // `householdIncomeTax` does not read this field and no line is emitted from it, so this chunk
      // moves no figure: the whole of Div 293 is still the flattering gap O77(ii) records.
      //
      // It is computed HERE, on every Person of every assessment — the monthly accrual, a disposal
      // and the year-end true-up alike — rather than at the wiring's own call site, because the two
      // figures it is built from are the two this function has just derived, and because a base
      // computed only where it is charged would be exercised only by the fixtures that cross the
      // threshold. Computed on every walk, a wrong limb cannot hide: `div293Income` refuses a
      // missing, a non-finite, a negative or a net-negative component by name, so a mis-wired limb
      // throws out of the month it was assessed in instead of understating a charge nobody checks.
      div293Income: div293IncomeForWalk(income, reportable),
      // **P3-19 — this Person's OWN income, for when they are the RECEIVING spouse of a
      // `SPOUSE_CONTRIBUTION`.** Assembled from figures this function has already derived — `income`
      // stands for assessable income while `REDUCER_DEDUCTIONS` is nil (`incomeTax.ts`'s own note on
      // `SpouseIncomeTestComponents`), fringe benefits are nil for the same reason they are
      // everywhere else in this walk (no field holds one), and `reportable` is the SAME figure
      // Rebate Income just added back. Always supplied, on `netLabourIncome`'s "always supplied"
      // convention — it costs nothing extra to assemble and a wrong limb cannot hide behind an
      // absence nobody exercises.
      spouseIncomeTest: { assessableIncome: income, reportableFringeBenefitsTotal: toCents(0), reportableSuperannuationContributions: reportable },
      // **P3-19 — what THIS Person paid into their SPOUSE's superannuation this financial year.**
      // Nil in the monthly accrual and at a disposal (both pass the default), and the year's own
      // total only at the true-up, on `gain`'s own "settled once, at July" footing.
      spouseContributionMade,
      ...(minimumTax === undefined ? {} : { minimumTax }),
    };
  };

  // **The Household's assessment, on a stated year, stated annual salaries and a stated net capital
  // gain per Person.** One function, three call sites: the monthly accrual passes the month's
  // annualised salaries and nil gains, a disposal passes the financial year's gains, and the
  // year-end true-up passes the completed year's actual totals. The tax on a gain is therefore a
  // DIFFERENCE between two runs of this same assessment and never a separate rate applied to a gain
  // — which is what makes the gain ordinary taxable income here, taxed at the Person's own marginal
  // rate on top of their own salary, rather than something on a schedule of its own.
  //
  // `annualSalaries` is the ASSESSABLE salary — gross less this year's salary sacrifice — and
  // `annualSacrificed` is the amount taken out of it, carried alongside because Rebate Income adds
  // it back (see `asSaptoPerson`). They are two figures rather than one gross because the base that
  // FALLS and the base that does NOT are different bases, and deriving either from the other at the
  // call site would be the second spelling T9 exists to stop.
  const assessHousehold = (
    assessmentFy: FinancialYear,
    annualSalaries: readonly Cents[],
    annualSacrificed: readonly Cents[],
    gains: readonly Cents[],
    qualified: readonly boolean[],
    // **P3-19 — nil by default (the trailing-defaulted-param convention `MORTGAGE_TARGET` used),
    // so the monthly accrual call site below needs no change at all.** Only the true-up passes a
    // real array — see its own call site, and `asSaptoPerson`'s doc on why the accrual is nil here.
    spouseContributionsMade: readonly Cents[] = [],
    // **P14-13 — `RENT_OUT_HOME`'s net rent, per Person, nil by default (`spouseContributionsMade`'s
    // own trailing-defaulted-param convention) — see `asSaptoPerson`'s own doc for why this is not
    // folded into `gains`.**
    otherIncomes: readonly Cents[] = [],
    // **LR-1 slice 3 — Div 119's facts per Person, none by default** (the same trailing-defaulted
    // convention): a disposal passes the year's minimum tax capital gain so far, the true-up the
    // year's final one.
    minimumTax: readonly MinimumTaxFacts[] = [],
  ) => {
    const [personA, personB] = household.persons.map((person, index) =>
      asSaptoPerson(
        person,
        assessmentFy,
        annualSalaries[index] ?? toCents(0),
        annualSacrificed[index] ?? toCents(0),
        gains[index] ?? toCents(0),
        qualified[index] === true,
        spouseContributionsMade[index] ?? toCents(0),
        otherIncomes[index] ?? toCents(0),
        minimumTax[index],
      ),
    );
    if (personA === undefined) throw new RangeError('a Household has at least one Person');
    // **P12-1 — from the financial year AFTER a death the survivor is assessed as a single person**,
    // and the deceased, who has no income in it, as the single nil assessment they are. The result
    // stays positional, because every caller reads `persons[index]`. The year OF the death stays a
    // couple's — see the named limit at the call below.
    if (death !== undefined && compareFinancialYears(assessmentFy, death.fy) > 0 && personB !== undefined) {
      const alone = [personA, personB].map((person) => householdIncomeTax({ fy: assessmentFy, relationship: 'single', persons: [person] }));
      const survivorResult = alone[death.survivor] as ReturnType<typeof householdIncomeTax>;
      return Object.freeze({
        ...survivorResult,
        persons: Object.freeze(alone.map((result) => result.persons[0] as ReturnType<typeof householdIncomeTax>['persons'][number])),
      });
    }
    return householdIncomeTax({
      fy: assessmentFy,
      // ⚠️ **A NAMED LIMIT, NOT AN OVERSIGHT (P12-4, register §8 O90).** `ILLNESS_SEPARATION` is
      // walked from 2026-09-24 and moves the Age Pension alone: an illness-separated couple is still
      // assessed here as a `couple`, SAPTO included, and the third `Relationship` stays unreachable
      // from `project()`. The separated base amount is sourced; what is not is how a year the
      // separation starts part way through is assessed (O16), so no year is given it. The couple
      // amount is the smaller ($1,602 each against $2,040), so this OVERSTATES tax — the cautious
      // direction, pinned on the tax each Person pays by `test/core-illness-separation.test.mjs`.
      relationship,
      persons: personB === undefined ? [personA] : [personA, personB],
    });
  };

  /**
   * **THE s 293-20(1)(a) INCOME BASE PER PERSON, on the same stated year, salaries, sacrifice and
   * gains `assessHousehold` is asked about — P6-9 chunk 3, and it consumes chunk 1's field.**
   *
   * It runs `asSaptoPerson` and reads the `div293Income` off it rather than deriving the base a
   * second way, so there is exactly one expression of what the Division 293 income of a Person in
   * this walk IS (`div293IncomeForWalk`, called in exactly one place) and the base the charge is
   * computed on cannot drift from the base chunk 1 built and tested. `householdIncomeTax` does not
   * carry the field through — its results are `TaxPersonResult`s — so this reaches past the
   * assessment to the Person it was assembled from, which is also why the figure is not simply
   * taken off `assessedOn`.
   *
   * **`qualified` is passed although it cannot move the answer.** SAPTO qualification decides an
   * offset and no limb of s 293-20(1)(a); it is threaded so that this call and the assessment
   * beside it are asked the SAME question about the same Person, and a future limb that does read
   * it is not handed a `false` invented here.
   */
  const div293IncomesOn = (
    assessmentFy: FinancialYear,
    annualSalaries: readonly Cents[],
    annualSacrificed: readonly Cents[],
    gains: readonly Cents[],
    qualified: readonly boolean[],
    // **P14-13 — `RENT_OUT_HOME`'s net rent, `assessHousehold`'s own trailing-defaulted-param
    // convention, threaded to `asSaptoPerson`'s `otherIncome` and not into `gains`.**
    otherIncomes: readonly Cents[] = [],
  ): readonly Div293Income[] =>
    household.persons.map(
      (person, index) =>
        asSaptoPerson(
          person,
          assessmentFy,
          annualSalaries[index] ?? toCents(0),
          annualSacrificed[index] ?? toCents(0),
          gains[index] ?? toCents(0),
          qualified[index] === true,
          toCents(0),
          otherIncomes[index] ?? toCents(0),
        ).div293Income,
    );

  // **P4-2 — THE FINANCIAL YEAR TO DATE, so that the year can be SETTLED when the walk leaves it.**
  //
  // Same shape and same reason as `balances` and `pensionYears` above: a plain mutable local, so
  // `project()` stays pure. `undefined` means *no financial year has been entered yet*, which is the
  // state before the walk's first month and nothing else — the first month initialises it.
  //
  // What each field is, and why it is the thing accumulated rather than something re-derivable:
  //   * `months` — how many of the year's months THIS WALK saw. A year the walk entered part-way
  //     through is not a year this model can assess, and this counter is the only thing that knows.
  //   * `salary` — the sum of the MONTHLY salary figures actually reported, per Person, and not the
  //     annual figure they were computed from. It is what the household actually received, so a
  //     Person who worked five months of the year has five months of pay in it and a Person whose
  //     pay never moved has twelve twelfths of an annual figure — which is the annual figure to
  //     within the rounding of `monthlyFromAnnual`, and that residue is exactly what the de-minimis
  //     rule below exists to absorb.
  //   * `accrued` — every cent of income tax this walk has CHARGED for the year, per Person: the
  //     twelve monthly accruals PLUS every `Income tax on capital gain` increment. Both are income
  //     tax on the same year's taxable income, so both belong on the same side of the reconciliation.
  //   * `gain` — the year's net capital gain per Person as last charged, carried here rather than
  //     read off `capitalGains` at settlement time, because that accumulator is keyed by the year of
  //     the last disposal and says nothing at all about a year in which nobody sold.
  //   * `qualified` — s 160AAAA(2)(b) over the YEAR; see the settlement for the reading taken.
  //   * `distributed` — P3-22h step 2's non-super portfolio distribution, per Person, ADDED TO
  //     (never assigned, unlike `gain`) because it is credited once, in the year's final month, and
  //     never re-stated the way a disposal's running `netGain` is. It is combined with `gain` only
  //     AT THE SETTLEMENT, never written into `gain` itself, because the two are different facts —
  //     a distribution is never a capital gain — and folding one into the other here would leave a
  //     mid-year disposal's own `reportCapitalGainCharge` assignment silently overwrite it.
  let taxYearToDate:
    | {
        fy: FinancialYear;
        months: number;
        readonly salary: Cents[];
        // **The year's SACRIFICED total, per Person (P6-8 brief 2, chunk 1)** — the second half of
        // `salary`, which is the ASSESSABLE figure. Both are accumulated because both are needed at
        // the settlement: the assessable one is what the year's tax is computed on, and the pair is
        // what Rebate Income adds back. Accumulating the gross and subtracting at the settlement
        // would spell the subtraction a second time.
        readonly sacrificed: Cents[];
        readonly accrued: Cents[];
        /**
         * **P6-9 chunk 3 — the year's EMPLOYER Superannuation Guarantee, per Person**, accumulated
         * as the twelve monthly twelfths actually credited rather than read off the annual figure
         * in force in any one month. It is here for the same reason `sacrificed` is: the settlement
         * needs the year's own s 291-25 limbs, and a Person whose salary moved in March has a
         * year's Guarantee that no single month's annual figure states.
         */
        readonly guarantee: Cents[];
        /** Whether this year's `ConcessionalCapExceededNote` has been emitted for the Person yet: once a year. */
        readonly capExceeded: boolean[];
        /** Every cent of Division 293 tax this walk has CHARGED for the year, per Person. */
        readonly div293Accrued: Cents[];
        readonly gain: Cents[];
        /** LR-1 slice 3 — the year's minimum tax capital gain (s 119-5) as last charged, beside `gain`. */
        readonly minimumTaxCapitalGain: Cents[];
        readonly qualified: boolean[];
        /** LR-1 slice 3 — s 119-15(1): paid the Age Pension in ANY month of the year. See `receivesAgePensionThisMonth`. */
        readonly receivedAgePension: boolean[];
        readonly distributed: Cents[];
        /**
         * **P3-42 step 2 — each `SuperInterest`'s income share for the year, per Person AND per
         * interest slot**, on `distributed`'s own shape and for the same reason: credited ONCE, in
         * the year's final month, before that month's own growth, and never re-stated. Per
         * INTEREST and not per Person, unlike `distributed`, because the fund tax rate is a fact
         * about the interest (its own phase) and two interests of one Person can be on opposite
         * sides of §3.1's two rows.
         */
        readonly superYield: Cents[][];
        /**
         * **P3-19 — the year's total `SPOUSE_CONTRIBUTION` payments, per CONTRIBUTING Person's
         * index**, on `distributed`'s own shape: ADDED TO across the year (a Household can state
         * more than one `SPOUSE_CONTRIBUTION` for the same owner in one financial year, and the
         * offset's own $540 cap is per income year, not per entry) and read only at the settlement,
         * never inside the monthly accrual — the offset is a fact about the WHOLE year's income
         * test, on the same "settle it once, at July" footing `distributed` and `gain` are on.
         */
        readonly spouseContributionsMade: Cents[];
        /**
         * **The year's interest on cash, per OWNER (2026-09-23)** — the cents actually paid on each
         * owner's `CASH_INTEREST_LINE`, summed. `distributed`'s shape: assessable income that joins
         * the year's taxable income at the settlement, and never a capital gain.
         */
        readonly cashInterest: Cents[];
        /**
         * **The year's net rent from `RENT_OUT_HOME`, per OWNER (P14-13)** — `cashInterest`'s own
         * shape: assessable income that joins the year's taxable income at the settlement, and never
         * a capital gain. UNFLOORED, unlike the two means tests: a year with more loss than income
         * carries a negative total here, on purpose (negative gearing, `assessedOn`'s own doc).
         */
        readonly rent: Cents[];
      }
    | undefined = undefined;

  // **P4-4 — THE LEVELS IN FORCE, so that a month can cite the entries that GOVERN it and not only
  // the ones dated in it.** Keyed exactly as `standing` above is, by `type` AND `owner`, because
  // that is what one level supersedes; the value is the id that is currently in force under that
  // key. Until P4-4 a `SPEND_CHANGE` dated 2019 appeared in month 0's `appliedEntryIds` and nowhere
  // else, so month 200's `Household spending` line had no traceable cause in its own `Month` — the
  // audit-trail hole ADR-0002 and ADR-0006 ask this array to close.
  //
  // A `Map`'s iteration order is insertion order, and a supersession `delete`s before it `set`s, so
  // the standing run reads oldest-governing first with a superseding level taking the superseded
  // one's place at the END. The month's own entries come first in the array and this run is appended
  // to them, so the widening cannot reorder or drop anything a consumer already read.
  const governing = new Map<string, string>();
  // **RF-1: the super a stop freed, per Person and account, as a fixed dollar figure** (SISR 6.03,
  // 6.10(1), 6.18(2)). Set at a stop that met a condition of release to each account's balance at
  // the start of that month, then reduced by every draw until the return and cut to the balance on
  // it. It never grows: earnings on it after the stop are preserved. While back at work it is all
  // that can be taken out of that account, and it is cut to the balance after every debit.
  // `undefined` is nothing freed (today's reading: all of it locked). `releasedBy` is the stop that freed it.
  // A stop is read from the month after it, so what it captures waits in `atStop` for a month: in
  // the month of a stop after a return the Person is still back at work on the 1st.
  const releasedSuper: (Cents | undefined)[][] = household.persons.map((person) => person.superInterests.map(() => undefined));
  const releasedBy: (IsoDate | undefined)[] = household.persons.map(() => undefined);
  const atStop: ({ readonly by: IsoDate | undefined; readonly released: (Cents | undefined)[] } | undefined)[] = household.persons.map(() => undefined);
  const months: Month[] = [];
  for (let month = first; month <= last; month = nextMonth(month)) {
    const date = firstDayOf(month);
    // **P12-1 — who has died by the first of this month.** The per-month "living persons" notion,
    // and the only one: every site the death reaches reads this.
    const deceasedNow = death !== undefined && month >= death.month ? death.index : undefined;
    // **The year this month is walked under.** Declared here rather than at chunk 3b, where it used
    // to sit, because P5-3 limb 2 stamps the Age Pension line in chunk 2 and a second
    // `financialYearContaining(date)` would be a second spelling of the same string arithmetic. Its
    // reasoning — why no `Month.financialYear` field exists — is unchanged and is kept at chunk 3b.
    const fy = financialYearContaining(date);
    // **LR-1 slice 2 — the value just before 1 July 2027, stamped once, at the OPENING of July 2027.**
    // Growth lands at the end of each tick, so a parcel's `marketValue` here is its value at the
    // close of June 2027: "just before 1 July 2027" (s 112-155(3)(a), s 112-175(3)(a)). A plan that
    // starts ON 1 July 2027 takes its stated opening values as that figure, by convention. A plan
    // starting later states the figure itself (`parsePlan` requires it), so it is never stamped here.
    if (month === monthOf(CGT_REFORM_START) && settings.asAtDate <= CGT_REFORM_START) {
      for (const held of balances) {
        held.parcels = Object.freeze(held.parcels.map((parcel) =>
          parcel.acquired < CGT_REFORM_START ? Object.freeze({ ...parcel, valueJustBefore1July2027: parcel.marketValue }) : parcel,
        ));
      }
    }
    // **THE YEAR'S AWOTE LEVEL, OUT OF THIS PLAN'S OWN WAGE ASSUMPTION — P6-12, 2026-09-21.**
    // The concessional contributions cap and SGAA s 10A(5)'s maximum contributions base both index
    // on AWOTE, and the register publishes one December quarter past the base: December 2025. Every
    // later quarter is a FORECAST and a Setting (register O5), so it is supplied from here — the one
    // place that holds the Settings — rather than invented in a core module. Two consequences are
    // stated because they are behaviour, not plumbing: from FY2027-28 the cap this walk measures a
    // sacrifice against is the user's OWN forecast and says so in every caveat it carries; and a
    // year before FY2026-27 still gets nothing, because compounding a rate backwards would invent a
    // past the ABS has already published.
    const awoteIndexNumbers = forecastAwoteIndexNumbers(fy, settings.economicSeries.awote);
    const entriesThisMonth = applied.get(month) ?? [];
    // **WHICH PERSON STATED A SACRIFICE THIS MONTH, and it is an entry id rather than a boolean.**
    // The concessional cap is checked ONCE, in the month the level is stated, and the check needs
    // both the arrangement and the month's Superannuation Guarantee — which is 12% of a salary that
    // is not derived until every entry in the month has been applied. So the entry loop records the
    // question here and the answer is taken below, where both limbs exist. Per month, because a
    // level stated in March is not re-checked in April: the cap is a year's figure and the check is
    // an act of statement, not a running test.
    const sacrificeStatedThisMonth: (string | undefined)[] = household.persons.map(() => undefined);
    // **WHICH ENTRY PAYS THE HOME LOAN OFF IN FULL THIS MONTH, if one does (`MORTGAGE_PAYOFF`).**
    // Recorded here and acted on at the pricing site, where the month's offset is known. Per month,
    // because a payoff is an `event`: it acts once, in its own month, and never again.
    let mortgagePayoffEntryId: string | undefined = undefined;
    // **WHICH PERSON'S RAD LUMP SUM IS DUE THIS MONTH, if any (`ENTER_CARE`).** Recorded here and
    // paid at the Waterfall/cash block below, on `mortgagePayoffEntryId`'s own precedent. Per
    // month, and gated to the entry's OWN month (`monthOf(entry.date) === month`) rather than every
    // month it is applied: a `level` dated before `asAtDate` starts the ongoing means assessment
    // from month 0 (`ENTRY_KIND.ENTER_CARE`'s own doc), but its RAD lump sum is money the
    // Household's stated cash position already reflects, and paying it again here would spend it
    // twice — `MORTGAGE_REFINANCE`'s balance-reset is not a precedent for this one field.
    const careEnteredThisMonth: (EnterCareEntry | undefined)[] = household.persons.map(() => undefined);
    // **P14-13 — `SELL_HOME`'s own month, `careEnteredThisMonth`'s own precedent: the mortgage and
    // Home Equity Access Scheme balances SETTLED are captured here, where `mortgageBalance`/`heasDebt`
    // are still this month's OPENING figures, and the cash lines are pushed later, once `lines`
    // exists.** `undefined` where no `SELL_HOME` applies THIS month — a pre-dated one still sets
    // `homeSold` below, every month, but never repopulates these three.
    let homeSoldThisMonth: SellHomeEntry | undefined = undefined;
    let homeSaleMortgageRepaid: Cents = toCents(0);
    let homeSaleHeasRepaid: Cents = toCents(0);
    // P14-19 — set only in the purchase's own month; a pre-dated one is already paid for.
    let homeBoughtThisMonth: BuyHomeEntry | undefined = undefined;
    const downsizersThisMonth: DownsizerContributionEntry[] = [];
    for (const entry of entriesThisMonth) {
      // `ENTRY_KIND` again, and for the same reason chunk 2b consults it: a level holds until
      // something supersedes it, an event happens once. An event is cited in its own month alone.
      if (ENTRY_KIND[entry.type] === 'level') {
        const key = `${entry.type} ${entry.owner}`;
        governing.delete(key);
        governing.set(key, entry.id);
      }
    }
    for (const entry of entriesThisMonth) {
      // **`SPEND_CHANGE` ignores `owner`, and that is a ruling rather than an oversight.**
      // `SpendChangeParams.annualSpend` is "the HOUSEHOLD's total spending per YEAR", so there is no
      // such thing as one Person's spending level to keep separately; concept.md's own table gives
      // the row the owner `household`. `plan.ts` deliberately does not enforce that column ("encoding
      // it half-way would be a ruling made by accident"), so a `personA`-owned one is constructible,
      // and the reading taken is that it sets the same single level. The alternative — two levels
      // summed — would double the target for a user who re-stated the household figure against a
      // person, which is the direction that invents a shortfall.
      if (entry.type === 'SPEND_CHANGE') spending = { annualSpend: entry.params.annualSpend, entryId: entry.id };
      // `owner` ignored, on `SPEND_CHANGE`'s ruling: a separation is a fact about the couple.
      if (entry.type === 'ILLNESS_SEPARATION') illnessSeparatedBy = entry.id;
      // **P14-13 — `ENTER_CARE`.** `checkEnterCares` (`parsePlan`) has already refused a
      // `household`-owned one and a second entry for the same Person, so `personIndex` below is
      // always exactly one Person's. `careOn`/`careEntry` are set once and never superseded — the
      // door's own refusal is what keeps that true, not a `??` guard doing the work here.
      if (entry.type === 'ENTER_CARE') {
        const personIndex = entry.owner === 'personA' ? 0 : 1;
        careOn[personIndex] = entry.date;
        careEntry[personIndex] = entry;
        if (monthOf(entry.date) === month) careEnteredThisMonth[personIndex] = entry;
      }
      // **P9-2a — `HEAS_DRAW`, per Person.** `checkHeasDraws` (`parsePlan`) has already refused
      // `owner: 'household'` and a second entry for the SAME Person, `ENTER_CARE`'s own precedent
      // just above, so this sets at most one of `heasEntry[0]`/`heasEntry[1]`, never both from one
      // entry. No age or capacity is computed here any more — T36 makes both a function of the
      // MONTH, not the entry's own start date, so they are worked out fresh in the draw block below.
      if (entry.type === 'HEAS_DRAW') {
        const personIndex = entry.owner === 'personA' ? 0 : 1;
        heasEntry[personIndex] = entry;
      }
      // **THE HOME LOAN'S TERMS, FROM THIS MONTH — P3-16 slice 2, and it is `SPEND_CHANGE`'s one
      // line plus the balance.** All three figures are stated on the entry (`plan.ts`: a partial
      // change would make this branch reach back for whatever was in force), so the assignment
      // REPLACES the loan entirely and carries nothing forward — including the balance, which is
      // the figure a refinance moves and which the running carry would otherwise keep.
      //
      // **`owner` is ignored, on `SPEND_CHANGE`'s ruling and for its reason.** A mortgage is a
      // Household fact under ADR-0005 (`Household.mortgage` is not per-Person, because an offset
      // sits against the home and nobody was asked who owns a share of it), so there is no such
      // thing as one Person's home loan to keep separately. A `personA`-owned one sets the same
      // single loan; the alternative — two loans summed — would double a household's debt for a
      // user who stated the same loan against a person.
      //
      // ⚠️ **EVERY TRANSITION THIS ONE ASSIGNMENT HAS TO GET RIGHT, enumerated here as slice 1
      // enumerated the endings in `mortgageMonth`. Each is a test in `core-mortgage.test.mjs`.**
      //   (i)   *No loan throughout* — no Household `mortgage`, no entry: `mortgage` stays
      //         `undefined`, no line, no key, and the walk is byte-identical to a build before any
      //         of this existed.
      //   (ii)  *A stated loan amortises to nil* — unchanged from slice 1: the pricing site below
      //         gates on `mortgageBalance <= 0` and charges nothing from the following month.
      //   (iii) *A stated loan runs past the forecast end* — unchanged: the last month simply pays.
      //   (iv)  *A dated change to the rate, the repayment or the balance* — this branch, in the
      //         entry's own month. The month it is dated in is priced on the NEW terms, because the
      //         entry loop runs at the top of the tick and the pricing is below it.
      //   (v)   *ORIGINATION from no loan* — the same branch and no extra code: `mortgage` was
      //         `undefined` and is now a loan. This is the case the user actually asked for, and
      //         `plan.ts` takes the ruling.
      //   (vi)  *A change dated AFTER the loan was repaid* — a NEW loan, not a refusal. The balance
      //         is set from the entry, so a nil running balance is simply overwritten. Refusing it
      //         would block "pay the house off, then borrow again", and a mis-dated one only ever
      //         ADDS debt, so it cannot flatter.
      //   (vii) *A change dated BEFORE `asAtDate`* — `ENTRY_KIND.MORTGAGE_REFINANCE` is `'level'`,
      //         so `applied` puts it in month 0 (P4-1d) and it supersedes the Household's own
      //         stated loan from the first month of the walk.
      //   (viii)*Two or more changes* — the last one to be applied is the one in force, by plain
      //         reassignment. `governing` keys on `type`+`owner`, so `appliedEntryIds` cites the
      //         last per owner; the FIGURE is decided here and by nothing else.
      //   (ix)  *A change that creates an unpayable loan* — refused in the walk, by the entry's id
      //         and the month, at the pricing site below. The door cannot know it: see `parsePlan`.
      //   (x)   *A stated balance of nil* — refused at the door, so absence stays the one spelling
      //         of "no loan" and an early discharge cannot be invented by writing zero.
      if (entry.type === 'MORTGAGE_REFINANCE') {
        // **A payoff stated EARLIER in the same month is REFUSED, not superseded (ruling,
        // 2026-09-23).** Superseding it would drop the old loan's payout with no money leaving the
        // household — the flattering direction. The user meant either "roll the old loan into the
        // new one" (state the refinance alone) or "pay it out in cash, then borrow" (date the new
        // loan the following month); the walk cannot tell which, so it names both entries.
        if (mortgagePayoffEntryId !== undefined) {
          throw new RangeError(
            `in ${month} the entry "${mortgagePayoffEntryId}" pays the home loan off and the later entry "${entry.id}" then sets a new loan in the same month: the payout would never be charged. To roll the old loan into the new one, remove the payoff; to pay it out and then borrow afresh, date the new loan the following month`,
          );
        }
        mortgage = {
          openingBalance: entry.params.openingBalance,
          annualInterestRate: entry.params.annualInterestRate,
          monthlyRepayment: entry.params.monthlyRepayment,
        };
        // The balance is RESET and not carried: transition (iv) and transition (vi) are one
        // assignment, and the running figure from the superseded loan has no claim on the new one.
        mortgageBalance = entry.params.openingBalance;
        mortgageEntryId = entry.id;
        // The reverse order — a refinance then a payoff — pays THIS loan off in full, below. Both
        // orders are pinned in `core-mortgage-payoff-entry.test.mjs`.
      }
      // **`MORTGAGE_PAYOFF` — the loan is paid off in full at the pricing site below**, where the
      // month's offset is in scope for the interest. `owner` is ignored, on `MORTGAGE_REFINANCE`'s
      // ruling: a home loan is a Household fact.
      if (entry.type === 'MORTGAGE_PAYOFF') mortgagePayoffEntryId = entry.id;
      // **P14-13 — `SELL_HOME`.** `checkSellHomes` (`parsePlan`) has already refused a second one, so
      // `homeSold` is set at most once across the whole walk. `owner` is ignored, `MORTGAGE_REFINANCE`'s
      // own ruling: a home is a Household fact.
      //
      // **The mortgage is CLEARED here, unconditionally, whatever month this runs in** — a sold home's
      // loan is discharged, not merely amortising, so it is not left to the "balance reaches nil"
      // pricing path below to notice. A pre-dated `SELL_HOME` (a sale that happened before
      // `asAtDate`) clears it from month 0: the loan the file still states would already have been
      // paid out by the real sale, and `derivedHomeStatus` below reads `homeSold` the same way,
      // regardless of which month set it.
      //
      // **The cash proceeds, the mortgage repaid and any Home Equity Access Scheme debt repaid are
      // captured ONLY in the entry's own month** (`monthOf(entry.date) === month`), `careEnteredThisMonth`'s
      // own reasoning: a pre-dated sale's proceeds are already reflected in the Household's stated
      // cash position, and crediting them again here would count them twice. The HEAS debt is capped
      // at the sale price — the No Negative Equity Guarantee, SS Act s 1144AA: the scheme never
      // recovers more than the security realises — and, whatever it settles, the WHOLE debt is
      // discharged by the sale: there is no security left for it to run against.
      if (entry.type === 'SELL_HOME') {
        homeSold = true;
        homeSoldEntry = entry;
        if (monthOf(entry.date) === month) {
          homeSoldThisMonth = entry;
          homeSaleMortgageRepaid = mortgage === undefined ? toCents(0) : mortgageBalance;
          const heasOwing = household.persons.reduce<Cents>(
            (total, _person, personIndex) => addCents(total, heasDebt[personIndex] as Cents),
            toCents(0),
          );
          // **`salePrice` is stated in TODAY's money (user ruling, 2026-09-25) — `atTodaysMoney`
          // raises it to THIS entry's own settlement day, the nominal proceeds the sale actually
          // realises, before the No Negative Equity Guarantee caps the HEAS debt repaid at them.**
          const salePriceThisMonth = atTodaysMoney(entry.params.salePrice, entry.date);
          homeSaleHeasRepaid = (heasOwing < salePriceThisMonth ? heasOwing : salePriceThisMonth) as Cents;
          household.persons.forEach((_person, personIndex) => {
            heasDebt[personIndex] = toCents(0);
          });
        }
        mortgageBalance = toCents(0);
      }
      // **P14-13 — `RENT_OUT_HOME`.** `checkRentOutHomes` (`parsePlan`) has already refused an
      // overlapping tenancy, so pushing every one seen is enough for "find the one covering THIS
      // month" below to be unambiguous. `owner` is ignored, `SELL_HOME`'s own ruling.
      if (entry.type === 'RENT_OUT_HOME') rentOutHomeEntries.push(entry);
      if (entry.type === 'BUY_HOME') {
        homeBoughtEntry = entry;
        if (monthOf(entry.date) === month) homeBoughtThisMonth = entry;
      }
      if (entry.type === 'DOWNSIZER_CONTRIBUTION') downsizersThisMonth.push(entry);
      // **The two types that used to be able to name nobody (P4-12).** They are resolved through
      // `personsReachedBy` rather than by asking `ownsPerson` of each Person who happens to exist,
      // because the second question cannot tell *"this entry is about the other one of you"* from
      // *"this entry is about a Person who is not in this file"* — it answers `false` to both and
      // the walk carries on. `household` still reaches every Person; a dangling `personA`/`personB`
      // is now an error rather than a silently missing retirement.
      if (entry.type === 'RETIRE' || entry.type === 'WORK_PATTERN_CHANGE') {
        for (const index of personsReachedBy(entry, household)) {
          if (entry.type === 'RETIRE') {
            retiredOn[index] = retiredOn[index] ?? entry.date;
          } else {
            worksNoDays[index] = entry.params.daysPerWeek === 0;
            statedSalary[index] = entry.params.annualSalary;
            workPattern[index] = entry.id;
          }
        }
      }
      // **P2-11 — the third type on `personsReachedBy`'s own reading of `owner`, and NOT folded
      // into the pair above.** A `RETURN_CHANGE` carries a `rate` and neither `RETIRE` nor
      // `WORK_PATTERN_CHANGE`'s branch has a slot for a third kind of payload, so this is its own
      // `if` rather than a third arm wedged into theirs. `household` reaches every Person — "our
      // return assumption changed" is a coherent statement about a couple, `RETIRE`'s own ground,
      // and not `SUPER_CONTRIBUTION`'s: there is no cap or split a household-owned rate would have
      // to invent, because it sets the SAME level for every Person it reaches rather than dividing
      // one figure between them.
      if (entry.type === 'RETURN_CHANGE') {
        for (const index of personsReachedBy(entry, household)) {
          returnRate[index] = entry.params.rate;
        }
      }
      household.persons.forEach((person, index) => {
        if (!ownsPerson(entry.owner, index)) return;
        // **A salary sacrifice, from this month until another one supersedes it.** `owner` is
        // `personA` or `personB` and never `household` — `checkContributionTargets` refuses the
        // third at the door, because every cap, the fund's 15% and Division 293 are per person and
        // a household-owned one would have to invent a split. So `ownsPerson` above selects exactly
        // one Person here, and this assignment is the whole of the supersession.
        //
        // ⚠️ ~~**`params.interestIndex` is read by NOTHING in this chunk.** The door has already
        // checked that it names an interest the Person holds; chunk 1 reduces the salary that is
        // ASSESSED and credits no balance at all, so which account the money lands in is a fact the
        // walk carries and does not yet act on. That is P6-8 chunk 4's, and until it lands the
        // sacrificed dollars leave the tax base and arrive nowhere — see the residual stated at the
        // assessable-salary computation in chunk 3.~~ **SUPERSEDED BY CHUNK 4 (2026-09-20): the
        // whole arrangement is carried now, `interestIndex` included, and the end of the tick pays
        // the net-of-tax amount into THAT interest.** The supersession rule is unchanged — a later
        // entry replaces the whole record, so restating the amount and the account together is one
        // statement and cannot leave an old account holding a new figure.
        if (entry.type === 'SUPER_CONTRIBUTION') {
          // **THE CAP IS NOT CHECKED HERE ANY MORE, AND THE MOVE IS THE WHOLE OF BRIEF 3'S LAST
          // CHUNK (2026-09-20).** Until this chunk `refuseStatedContributionOverGeneralCap` was
          // called on this line, against the stated sacrifice ALONE, because the Superannuation
          // Guarantee was stranded and every total the walk could build understated the Person's
          // real one. Chunk 2b credits the Guarantee, so the walk can build a REAL concessional
          // total — and the Guarantee is 12% of a SALARY, which is not known at this point in the
          // tick: `inForceSalary` is derived below, after every entry in the month has been
          // applied, because a `RETIRE` and a `WORK_PATTERN_CHANGE` dated in the same month as this
          // entry both change it. So the check moved to the one place both limbs exist, just after
          // the month's Guarantee is computed, and this line records only that the question is to
          // be asked for this Person.
          //
          // ⚠️ **WHAT THE MOVE CHANGED ABOUT PRE-EMPTION, stated rather than discovered later.**
          // The refusal now runs AFTER this month's means test, its Work Bonus write-back, the
          // salary and income-tax lines, and — the one that matters — after
          // `superGuaranteeDestination`, whose two refusals (two accumulation interests and no
          // nomination; a salary and no accumulation interest at all) therefore pre-empt it. A
          // Household that trips both now hears about the destination first. It still pre-empts
          // everything after it in the tick, including the Waterfall and the credit itself, and it
          // still stops the walk before the month it fires in is pushed, so no `Month` is ever
          // produced for a year this build refuses to price.
          // **THE STOP, and the two assignments below are ONE STATEMENT** (P6-8 brief 4, user
          // ruling 2026-09-21). `kind: 'stopped'` ends the standing arrangement from this entry's
          // date: the level goes back to "nobody has stated a sacrifice for this Person", which is
          // the state every month before the first arrangement was already in, and the whole of the
          // rest of the tick follows from that one absence — `sacrificedThisMonth` is nil, the
          // salary assessed is the gross again, the cap check is not asked (nothing was stated),
          // Division 293 reads the nil, and no contribution line is emitted.
          //
          // **`stoppedBy` is set at the SAME statement that clears the level, and cleared at the
          // same statement that sets one.** The two are one fact read two ways — *is anything
          // running* and *did the user end it* — and writing them apart is how they would come to
          // disagree, which is this project's most-repeated defect. The invariant they hold between
          // them: `stoppedBy` is defined only where `sacrificeLevel` is `undefined`, and it is what
          // tells a stopped month from the five other months that also sacrifice nothing (see
          // `SuperContributionParams`).
          //
          // ⚠️ **Nothing here erases the months already walked.** The cap, Division 293, the fund's
          // 15% and the year's accumulators are all computed month by month off what was in force
          // in THAT month and are never recomputed, so stopping in March releases the cap from
          // March and leaves July-to-February's contributions exactly where they were paid.
          if (entry.params.kind === 'stopped') {
            sacrificeLevel[index] = undefined;
            sacrificeStoppedBy[index] = { entryId: entry.id, stoppedFrom: entry.date };
          } else {
            sacrificeStatedThisMonth[index] = entry.id;
            sacrificeLevel[index] = {
              annualAmount: entry.params.annualAmount,
              interestIndex: entry.params.interestIndex,
              entryId: entry.id,
            };
            sacrificeStoppedBy[index] = undefined;
          }
        }
      });
    }

    // **THIS MONTH'S IN-FORCE SALARY, both ways round, decided ONCE (P4-8).**
    //
    // **Three levels, in the one order they can be read in (2026-09-19).** A stop first, because
    // `RETIRE` beats a work pattern dated on or before it and a stated salary is not a Condition of
    // Release (a pattern dated after it is a return to work, and `spellIn` is then no stop); then the zero-day pattern; then the STATED salary, which replaces the Household's
    // own annualised figure and is what closes the flattering gap recorded on
    // `annualSalaryFromFortnightly`. A stated nil is unreachable here — the door refuses positive
    // days with no salary, and zero days is already caught one line up — but reading a stated nil
    // as "nothing stated" would be a silent substitution, so it is written as the absence test it is.
    //
    // **Why it is computed HERE, above the means test, and why it carries BOTH periods.** The
    // income tax wants a year and the income test wants a fortnight, and the defect this fixes
    // (P4-8) was that the income test never saw this ordering at all — it read the Household's
    // Day-1 stated wage for every month of the walk, so a retired Person was assessed on a salary
    // they had stopped earning. Neither period is derived from the other: where no entry has
    // stated a salary the fortnightly figure is `employmentIncomePerFortnight` and the annual one is
    // 26 times it; where an entry HAS stated an annual salary, that figure is the annual one and
    // `fortnightlyFromAnnual` divides it once. Each is then raised to the month's wage level on its
    // own, below. Round-tripping either way would put a rounding error into a means test.
    //
    // **PAY RISES WITH WAGES (2026-09-23, user ruling).** Every stated salary — the Household's own
    // `employmentIncomePerFortnight` and a `WORK_PATTERN_CHANGE`'s `annualSalary` alike — is in the
    // wage level of `asAtDate`, and this month pays it raised to this month's wage level by
    // `economicSeries.awote`. It is `core/priceLevel.ts`'s `inflateStated`, the one expression
    // `SpendChangeParams.annualSpend` is raised by with the CPI, handed the WAGE rate: the basis is
    // `asAtDate` and never the entry's own date, so a `WORK_PATTERN_CHANGE` dated 2030 stating
    // $40,000 is $40,000 of TODAY's wages — the money every box on the page takes (P2-7) — and pays
    // $40,000 × (1 + awote) ^ (months since asAtDate / 12) in each month it governs. The factor steps
    // every month, not every July. Everything downstream reads the raised figure: the cash line, the
    // tax, the Guarantee, Division 293, the income test and the Work Bonus. A salary SACRIFICE is not
    // raised (register O88, ruled nominal): it is the same dollars every year.
    //
    // **THE RETIREMENT MONTH PAYS THE DAYS WORKED (2026-09-23).** A `RETIRE` date is the last day
    // worked, so the month it falls in pays the salary in force for the days from the 1st up to and
    // including that date, pro-rated by DAYS — the same inclusive day count and the same single
    // rounding SIS Reg Sch 7 cl 3 is read with for a commencement year (`daysInclusive`,
    // `ttrRateOverDays`). Before this the whole month was nil, so a retirement on 30 June paid no
    // June at all while super opened only in July: a phantom gap. The share scales the in-force
    // figure itself, both periods, so every reader of it — the cash line, the tax accrual, the
    // Guarantee, the income test and the Work Bonus — sees one pro-rated pay; the sacrifice below
    // takes the same share. A retirement before `asAtDate` pays nothing: it happened before the plan.
    const workedShare = household.persons.map((person, index): { days: number; of: number } | undefined => {
      const spell = spellIn(index, month);
      const day = spell === undefined || spell.at === 0 ? retiredOn[index] : spell.change.date;
      if (spell?.change.kind !== 'stopped' || day === undefined || day < settings.asAtDate || monthOf(day) !== month) return undefined;
      return { days: daysInclusive(date, day), of: daysInclusive(date, firstDayOf(nextMonth(month))) - 1 };
    });
    const overDaysWorked = (amount: Cents, index: number): Cents => {
      const share = workedShare[index];
      if (share === undefined) return amount;
      const denominator = BigInt(share.of) * 2n;
      return Number((BigInt(amount) * BigInt(share.days) * 2n + BigInt(share.of)) / denominator) as Cents;
    };
    const atWageLevel = (stated: Cents): Cents => inflateStated(stated, settings.economicSeries.awote, settings.asAtDate, month);
    const salaryIfAlive = household.persons.map((person, index): { perYear: Cents; perFortnight: Cents } => {
      if ((spellIn(index, month)?.change.kind === 'stopped' && workedShare[index] === undefined) || worksNoDays[index] === true) {
        return { perYear: toCents(0), perFortnight: toCents(0) };
      }
      const stated = statedSalary[index];
      const perYear = stated ?? annualSalaryFromFortnightly(person.employmentIncomePerFortnight);
      const perFortnight = stated === undefined ? person.employmentIncomePerFortnight : fortnightlyFromAnnual(stated);
      return { perYear: overDaysWorked(atWageLevel(perYear), index), perFortnight: overDaysWorked(atWageLevel(perFortnight), index) };
    });
    // **P12-1 — the deceased is paid nothing from the month of the death**, and so nothing is
    // sacrificed and no Guarantee is owed on it. `salaryIfAlive` is kept for the one reader that
    // needs the counterfactual: the couple rate the bereavement payment is measured from.
    const inForceSalary =
      deceasedNow === undefined ? salaryIfAlive : salaryIfAlive.map((salary, index) => (index === deceasedNow ? { perYear: toCents(0), perFortnight: toCents(0) } : salary));
    const inForceIncomePerFortnight = inForceSalary.map((salary) => salary.perFortnight);

    // **The Household AS AT THIS MONTH (chunk 5a, widened by P4-3b)** — every field of `household`
    // copied through except the balances, which are this month's carried figures: the super
    // interests, the parcels, and the Offset Account, which is `openingBalance`, this month's own
    // running cash. It is what BOTH means-test call sites below take, and it must be both of them:
    // the ADR-0005 guard a few lines down compares the two against each other, so switching ONE
    // would throw loudly and switching NEITHER would pass silently with the walk still reporting
    // month 0's assets in month 575. Nothing else in the tick reads a balance — salary, retirement
    // and the spending level are all balance-free — so this is the complete set of readers.
    //
    // **AND, from P3-8's conversion limb (2026-09-22), the PHASE as at this month too.** This is
    // what makes `splitAssets(householdThisMonth, date)` below state the correct means-test reason
    // for an interest that has converted, and `accessibleWealthByPerson(householdAtClose, …)` later
    // in the tick gate on the correct phase — neither module reads a conversion day itself.
    // **THE SWITCH AT RETIREMENT, in the RETIRE month — before anything this month reads a phase.**
    // The transfer balance cap is tested here, on the balance the month opens with: what each account
    // switching holds, plus what any TTR of theirs already credited when it converted. Over the
    // published cap, the switch is undone for the whole Person — splitting an account between a
    // pension and accumulation is not modelled — and the note says so. Every other outcome that is
    // not a switch was decided from the plan and is only reported here.
    const retirementNotes: PensionAtRetirementNote[] = [];
    switches.forEach((decided, personIndex) => {
      const person = household.persons[personIndex];
      if (person === undefined || decided.kind === 'notRetiring' || decided.kind === 'nothingToSwitch') return;
      if ((decided.kind === 'retiredBeforeThePlan' ? first : monthOf(decided.retireDay)) !== month) return;
      const held = balances[personIndex]?.superInterestBalances ?? [];
      // RF-2: a TTR converting on the day of the switch switches with it, and counts toward the cap.
      const slots = decided.kind === 'retiredBeforeThePlan'
        ? []
        : decided.kind === 'switches'
          ? [...decided.slots, ...ttrConvertingOn(personIndex, decided.retireDay).filter((slot) => !decided.slots.includes(slot))].sort((a, b) => a - b)
          : decided.slots;
      const accounts = `${slots.length === 1 ? 'super account' : 'super accounts'} ${slots.map((slot) => slot + 1).join(' and ')}`;
      const report = (outcome: PensionAtRetirementNote['outcome'], note: string): void => {
        retirementNotes.push(Object.freeze({
          subject: 'pension at retirement' as const,
          person: person.name,
          retireDay: decided.retireDay,
          outcome,
          interestIndexes: Object.freeze([...slots]),
          note,
        }));
      };
      if (decided.kind === 'retiredBeforeThePlan') {
        report('retired before the plan', PENSION_AT_RETIREMENT_NOTE_TEXT['retired before the plan'](person.name, decided.retireDay, settings.asAtDate));
        return;
      }
      if (decided.kind === 'underPreservationAge') {
        report('under 60', PENSION_AT_RETIREMENT_NOTE_TEXT['under 60'](person.name, decided.retireDay, accounts));
        return;
      }
      if (decided.kind === 'priorRetirementPhase') {
        report('prior pension', PENSION_AT_RETIREMENT_NOTE_TEXT['prior pension'](person.name, decided.because === 'stated', accounts, decided.retireDay));
        return;
      }
      const alreadyCredited = (creditedAtConversion[personIndex] ?? []).reduce<number>((total, credit) => total + (credit ?? 0), 0);
      const credit = slots.reduce<number>((total, slot) =>
        total + (creditedAtConversion[personIndex]?.[slot] === undefined ? (held[slot] ?? 0) : 0), alreadyCredited) as Cents;
      if (credit > PUBLISHED_TRANSFER_BALANCE_CAP) {
        const row = conversionDay[personIndex] as (IsoDate | undefined)[];
        for (const slot of slots) row[slot] = beforeSwitch[personIndex]?.[slot];
        const ttrs = decided.kind === 'switches' ? slots.filter((slot) => !decided.slots.includes(slot)) : [];
        report('over the cap', PENSION_AT_RETIREMENT_NOTE_TEXT['over the cap'](person.name, formatCents(credit), decided.retireDay, accounts, ttrs.length === 0 ? 'none' as const : ttrs.length === slots.length ? 'all' as const : 'some' as const));
        return;
      }
      report('switched', PENSION_AT_RETIREMENT_NOTE_TEXT.switched(person.name, decided.retireDay, accounts, slots.length === 1));
    });
    // Retire flow S3: a return to work, and a stop after one, each say what they do to the super in
    // the month they take effect (the plan's first month for one dated before it).
    spells.forEach((changes, personIndex) => {
      const person = household.persons[personIndex];
      changes.forEach((change, at) => {
        const stop = changes[at - 1];
        if (person === undefined || stop === undefined) return;
        if ((monthOf(change.date) < first ? first : monthOf(change.date)) !== month) return;
        // A stop that is itself the switch (the first was before 60) is reported by the switch above,
        // and so is a TTR converting with it (RF-2).
        const decided = switches[personIndex];
        const converting = change.kind === 'stopped' ? ttrConvertingOn(personIndex, change.date) : [];
        const isSwitch = change.kind === 'stopped' && decided !== undefined && decided.kind !== 'notRetiring' && decided.retireDay === change.date;
        if (isSwitch && (decided?.kind === 'switches' || converting.length === 0)) return;
        if (converting.length > 0) {
          // RF-2: the TTR converting at this stop is tested against the cap as the switch is, its
          // own balance included; over it, it stays a TTR until 65.
          const held = balances[personIndex]?.superInterestBalances ?? [];
          const accounts = `${converting.length === 1 ? 'super account' : 'super accounts'} ${converting.map((slot) => slot + 1).join(' and ')}`;
          const alreadyCredited = (creditedAtConversion[personIndex] ?? []).reduce<number>((total, credit) => total + (credit ?? 0), 0);
          const credit = converting.reduce<number>((total, slot) =>
            total + (creditedAtConversion[personIndex]?.[slot] === undefined ? (held[slot] ?? 0) : 0), alreadyCredited) as Cents;
          const over = credit > PUBLISHED_TRANSFER_BALANCE_CAP;
          if (over) {
            const row = conversionDay[personIndex] as (IsoDate | undefined)[];
            for (const slot of converting) row[slot] = beforeSwitch[personIndex]?.[slot];
          }
          retirementNotes.push(Object.freeze({
            subject: 'pension at retirement' as const,
            person: person.name,
            retireDay: change.date,
            outcome: over ? 'over the cap' as const : 'stopped again, TTR converted' as const,
            interestIndexes: Object.freeze([...converting]),
            note: over
              ? PENSION_AT_RETIREMENT_NOTE_TEXT['over the cap'](person.name, formatCents(credit), change.date, accounts, 'all')
              : PENSION_AT_RETIREMENT_NOTE_TEXT['stopped again, TTR converted'](person.name, change.date, accounts, converting.length === 1),
          }));
          return;
        }
        const locked = person.superInterests.flatMap((_interest, slot) => (effectivePhaseFor(personIndex, slot, date) === 'accumulation' ? [slot] : []));
        retirementNotes.push(Object.freeze({
          subject: 'pension at retirement' as const,
          person: person.name,
          retireDay: change.kind === 'returned' ? stop.date : change.date,
          outcome: change.kind === 'returned' ? 'back at work' as const : 'stopped again' as const,
          interestIndexes: Object.freeze(change.kind === 'returned' ? locked : []),
          note: change.kind === 'returned'
            ? PENSION_AT_RETIREMENT_NOTE_TEXT['back at work'](
              person.name,
              conditionOfRelease({ dateOfBirth: person.dateOfBirth, on: stop.date, gainfulEmployment: { ceased: true, ceasedOn: stop.date } }).met,
              change.date,
              stop.date,
            )
            : PENSION_AT_RETIREMENT_NOTE_TEXT['stopped again'](person.name, change.date),
        }));
      });
    });
    // RF-1: taken here, at the start of the month, before any flow of the month moves a balance.
    household.persons.forEach((person, personIndex) => {
      const row = releasedSuper[personIndex] as (Cents | undefined)[];
      const held = balances[personIndex];
      if (held === undefined) return;
      const captured = atStop[personIndex];
      if (captured !== undefined) {
        releasedBy[personIndex] = captured.by;
        captured.released.forEach((released, slot) => { row[slot] = released; });
        atStop[personIndex] = undefined;
      }
      if (conditionOfRelease({ dateOfBirth: person.dateOfBirth, on: date, gainfulEmployment: { ceased: false } }).met) {
        releasedBy[personIndex] = undefined;
        row.fill(undefined);
        return;
      }
      const spell = spellIn(personIndex, month);
      if (spell === undefined || monthOf(spell.change.date) !== month) return;
      if (spell.change.kind === 'stopped') {
        const stopDay = spell.change.date;
        const freed = conditionOfRelease({ dateOfBirth: person.dateOfBirth, on: stopDay, gainfulEmployment: { ceased: true, ceasedOn: stopDay } }).met;
        atStop[personIndex] = { by: freed ? stopDay : undefined, released: held.superInterestBalances.map((balance) => (freed ? balance : undefined)) };
      } else {
        row.forEach((released, slot) => { if (released !== undefined) row[slot] = Math.min(released, held.superInterestBalances[slot] ?? 0) as Cents; });
      }
    });
    /** Back at work on the 1st: after a return, including the month of a next stop dated after the 1st. */
    const backAtWork = (personIndex: number): boolean => {
      const spell = spellIn(personIndex, month);
      return spell?.change.kind === 'returned' || (spell !== undefined && spell.at > 0 && monthOf(spell.change.date) === month && spell.change.date > date);
    };
    /** While back at work, the stop that freed this account's released amount and that amount; otherwise `undefined`. */
    const releasedWhileBackAtWork = (personIndex: number, slot: number): { readonly gainfulEmployment: GainfulEmployment; readonly released: Cents } | undefined => {
      const released = releasedSuper[personIndex]?.[slot];
      const ceasedOn = releasedBy[personIndex];
      if (!backAtWork(personIndex) || released === undefined || ceasedOn === undefined || isAccountBasedPension(effectivePhaseFor(personIndex, slot, date))) return undefined;
      return { gainfulEmployment: { ceased: true, ceasedOn }, released };
    };
    /** A draw out of an account comes out of its released amount first. */
    const drawReleased = (personIndex: number, slot: number, paid: Cents): void => {
      for (const row of [releasedSuper[personIndex], atStop[personIndex]?.released]) {
        const released = row?.[slot];
        if (row !== undefined && released !== undefined) row[slot] = Math.max(0, released - paid) as Cents;
      }
    };
    /** After a debit while back at work, the released amount is never more than the balance. */
    const clampReleased = (personIndex: number, slot: number, to: number = balances[personIndex]?.superInterestBalances[slot] ?? 0): void => {
      const row = releasedSuper[personIndex];
      const released = row?.[slot];
      if (backAtWork(personIndex) && row !== undefined && released !== undefined) row[slot] = Math.max(0, Math.min(released, to)) as Cents;
    };
    conversionDay.forEach((row, personIndex) => row.forEach((day, slot) => {
      const credited = creditedAtConversion[personIndex];
      if (day === undefined || monthOf(day) !== month || credited === undefined || credited[slot] !== undefined) return;
      credited[slot] = (balances[personIndex]?.superInterestBalances[slot] ?? toCents(0)) as Cents;
    }));

    // --- P12-1: THE MONTH OF THE DEATH ----------------------------------------------------------
    //
    // **Everything the deceased held moves on the first day of the month, before the means test.**
    // The couple as they would have been had they lived is taken first — it is the CCR the
    // bereavement payment is measured from (SS Guide 3.1.5.70) — and then:
    //
    //   * **every super interest is cashed as ONE lump sum** — reg 6.21(1) SIS Regulations, "as soon
    //     as practicable" — tax-free to a spouse (ITAA 1997 s 302-60), and with no transfer balance
    //     account effect for the survivor, because a lump sum is not an income stream. The balances
    //     go to nil here and the same cents arrive as `SUPER_DEATH_BENEFIT_LINE`, a cash line, below:
    //     one amount, written once, so it can neither vanish nor be counted twice. Until the line
    //     lands in the month's cash, the means test counts it as cash already (`meansTestCash`);
    //   * **every non-super parcel passes to the survivor at its own cost base and acquisition date**
    //     — ITAA 1997 s 128-15; a gain at death is disregarded (s 128-10). A parcel the deceased
    //     acquired before 20 September 1985 takes its market value at death as its cost base, and
    //     the death as its acquisition day (ATO, "Cost base of inherited assets");
    //   * **the pension years stop**: nothing is owed of a minimum on an account that no longer exists.
    let coupleHadTheyLived: Household | undefined = undefined;
    let deathBenefit: Cents = toCents(0);
    // **P14-16 — the RAD is refundable, and a death is the only route this build models out of
    // care.** health.gov.au: the balance "less any amount owing... is paid to the estate" — read
    // here as "less retention withheld to date", the only deduction this build carries. **A
    // departure FROM care with no death is NOT modelled** — `ENTER_CARE`'s own doc already says
    // nothing in this build lets a resident leave care alive, and this is the other half of that:
    // the only way a paid RAD ever reaches cash again is through this block.
    let radRefund: Cents = toCents(0);
    if (death !== undefined && month === death.month) {
      coupleHadTheyLived = withBalances(household, balances, openingBalance, salaryIfAlive.map((salary) => salary.perFortnight), (personIndex, slot) =>
        effectivePhaseFor(personIndex, slot, date), (personIndex, slot) => switchedOn(personIndex, slot, date),
      );
      const held = balances[death.index] as (typeof balances)[number];
      const heir = balances[death.survivor] as (typeof balances)[number];
      // **Refused, not dropped: the part-year fund earnings tax.** With `superIncomeYieldRate` stated
      // the walk taxes an interest's income share once a year, on its balance in June; an account
      // paid out before June would never be taxed for the months it earned. That is nil for an
      // Account-Based Pension (retirement phase, 0%) and 15% for anything else — a gap in the
      // flattering direction, so it is refused by name rather than left.
      if (settings.superIncomeYieldRate !== undefined) {
        const deceased = household.persons[death.index] as Person;
        const taxed = deceased.superInterests.findIndex(
          (_interest, slot) => (held.superInterestBalances[slot] ?? 0) > 0 && !isAccountBasedPension(effectivePhaseFor(death.index, slot, date)),
        );
        if (taxed !== -1) {
          throw new RangeError(
            `entry ${death.entryId} (DEATH): ${deceased.name}'s super account ${taxed + 1} is not an Account-Based Pension, and with the super income yield Setting stated its earnings are taxed once a year, in June — ` +
              `paid out at the death, the months it earned in ${fy} would never be taxed. That part-year fund earnings tax is not modelled, so this death is refused rather than understated. Clear the super income yield Setting, or date the death after the account has become an Account-Based Pension`,
          );
        }
      }
      deathBenefit = held.superInterestBalances.reduce<Cents>((total, balance) => addCents(total, balance), toCents(0));
      held.superInterestBalances.fill(toCents(0));
      releasedSuper[death.index]?.fill(undefined);
      releasedBy[death.index] = undefined;
      atStop[death.index] = undefined;
      // **LR-1: from 1 July 2027 nothing is pre-CGT any more** (s 112-175(2) deems every such asset
      // reacquired on that day), so the re-acquisition at death is limited to earlier deaths, and a
      // later one passes the parcel on unchanged (s 128-15(4)). **Ruling R1 (user, 2026-09-29,
      // option b):** that includes a parcel stamped at 30 June 2027 — the survivor takes over its
      // stamp, its deferred gain (s 112-160) and its later cost base, and the deferred gain is taxed
      // when the survivor sells, Div 128's own pattern (the death is disregarded, the heir inherits).
      // Act 49 does not amend Div 128, so this is a reading, not a settled answer. The discount on
      // the deferred part keeps the ORIGINAL acquisition day: s 115-30(1) item 4 treats an asset
      // that passes to a beneficiary as acquired "when the deceased acquired the asset".
      const reformed = death.date >= CGT_REFORM_START;
      heir.parcels = [
        ...heir.parcels,
        ...held.parcels.map((parcel) =>
          !reformed && parcel.acquired < CGT_START ? Object.freeze({ acquired: death.date, costBase: parcel.marketValue, marketValue: parcel.marketValue }) : parcel,
        ),
      ];
      held.parcels = [];
      pensionYears[death.index]?.fill(undefined);
      // **The RAD refund, on `deathBenefit`'s own footing** — the deceased's `radBalance` is what
      // was actually paid; `radRetentionWithheld` is what the facility has withheld from it so far,
      // which by construction cannot exceed it (`agedCareRadRetentionDeduction` retains at most 10%
      // of `radPaid`, `AGED_CARE.radRetention.value` — 2%/year × 5 years). Zeroed here, on
      // `held.superInterestBalances.fill(toCents(0))`'s own precedent: the ledger this money leaves
      // must say so, or the next resident's fee arithmetic would double-count it.
      const radOwed = radBalance[death.index] as Cents;
      if (radOwed > 0) {
        radRefund = subCents(radOwed, radRetentionWithheld[death.index] as Cents);
        radBalance[death.index] = toCents(0);
        radRetentionWithheld[death.index] = toCents(0);
      }
    }
    // The month's opening cash plus the death benefit AND the RAD refund on their way into it — the
    // means test's view of the Household's cash, and nothing else's. Nil but in the month of a
    // death (P14-16 widens this from `deathBenefit` alone): once refunded, the RAD is ordinary
    // household cash and is assessed for the Age Pension from this SAME month, exactly as the
    // deceased's super is.
    const meansTestCash = addCents(addCents(openingBalance, deathBenefit), radRefund);

    // --- P14-5a — the Age Pension side of a home nobody lives in any more ------------------------
    //
    // **Driven by the SAME `careOn`/`death` facts the aged-care means test reads below, and by
    // NOTHING ELSE once any `ENTER_CARE` entry has applied** — a Household stating both an
    // `ENTER_CARE` and a manually-set `homeStatus` would disagree with itself the moment care
    // starts, so the derived status further down REPLACES the stated one rather than layering on
    // it, and only from the month an `ENTER_CARE` has actually applied.
    //
    // SS Act s 11A(9)(b) / DSS Guide 4.6.3.70 (`docs/research/p6-5-home-absence.md`, re-verified
    // 2026-09-25 by a direct fetch of the Guide page): the home stays exempt for 2 years from the
    // date nobody protecting it remains, "irrespective of whether the recipient intends to return",
    // and from the day after the second anniversary "the recipient is treated as a non-homeowner,
    // AND principal home is an assessable asset" (`AGE_PENSION.assetsTest.careVacatedHomeExemptionMonths`).
    // A Person stops protecting the home the moment they are EITHER dead OR in care, whichever is
    // earlier; the home is unprotected once EVERY Person is one or the other, from the LATEST of
    // those individual dates — the couple case where the second partner also enters care, and
    // s 11A(9)(c)/(e)'s "a fresh period starts" where a death removes the last person still at
    // home. `undefined` where some Person is neither: the home stays protected indefinitely,
    // exactly as before this task. Recomputed fresh every month from `careOn`/`deceasedNow`, which
    // themselves only ever move forward, so this can only ever move forward too.
    const protectorRemovedOn = (personIndex: number): IsoDate | undefined => {
      const careDate = careOn[personIndex];
      const deathDate = deceasedNow === personIndex ? death?.date : undefined;
      if (careDate === undefined) return deathDate;
      if (deathDate === undefined) return careDate;
      return careDate < deathDate ? careDate : deathDate;
    };
    const removalDates = household.persons.map((_person, index) => protectorRemovedOn(index));
    const homeUnprotectedFrom: IsoDate | undefined = removalDates.every((removed) => removed !== undefined)
      ? (removalDates.reduce((latest, removed) => ((removed as IsoDate) > (latest as IsoDate) ? removed : latest)) as IsoDate)
      : undefined;
    const homeIsProtected = homeUnprotectedFrom === undefined;
    // **The stated `ENTER_CARE` home value, if any — a Household fact, never per-Person, on the
    // aged-care block below's own precedent (`careEntry.find`).** Read once, here, so the Age
    // Pension side and the aged-care side compose the SAME figure (the brief's "one ledger").
    const careHomeEntry = careEntry.find((entry) => entry !== undefined);
    const homePastCliff =
      homeUnprotectedFrom !== undefined &&
      monthsBetween(homeUnprotectedFrom, month) >= AGE_PENSION.assetsTest.careVacatedHomeExemptionMonths.value;
    // **Past the second anniversary, the stated value carried to THIS month's dollars on CPI (a
    // labelled assumption: the home holds its real value, on this project's always-reflect-CPI
    // principle for a stated figure — `core/priceLevel.ts`'s `inflateStated`, the ONE expression
    // every other carried figure in this walk uses) and netted against the mortgage still owing
    // (`household.mortgage`'s own doctrine, `agePension.ts`'s `homeownerWithAMortgage`: "the debt is
    // netted only against the asset it secures" — once the home is no longer exempt, it is).**
    // **FROM `settings.asAtDate`, not the entry's own day (user ruling, 2026-09-25, superseding
    // P14-5a's original choice of basis): `EnterCareParams.homeValue` is stated in TODAY's money,
    // `SpendChangeParams.annualSpend`'s own basis, so raising it from `asAtDate` straight to `month`
    // IS the entry-date-nominal figure carried forward — the same one `atTodaysMoney` computes for
    // the RAD/DAP arithmetic below, telescoped into a single multiplication rather than two.**
    // `undefined` where there is no `ENTER_CARE` entry to read a value from at all — the pre-existing
    // `homeStatus`-only path (`VACATE_HOME`, P3-15) still supplies none and still refuses (P3-15b).
    // **The month's OPENING HEAS debt, both Persons (s 1121(5)(b)(ii): a couple's jointly charged
    // home), read before the draw block below writes to `heasDebt` — `mortgageBalance`'s timing.**
    // Deducted in full from the home once it is assessable (SS Act s 1121(5); DSS Guide 3.4.5.20:
    // no apportionment), never while it is exempt. A debt above the home reduces the home only —
    // whether the excess reaches other assets is UNSOURCED, so the nil floor stays.
    const heasDebtOpening = household.persons.reduce<Cents>(
      (total, _person, personIndex) => addCents(total, heasDebt[personIndex] as Cents),
      toCents(0),
    );
    const careVacatedHomeAssessment: Cents | undefined =
      homePastCliff && careHomeEntry !== undefined
        ? (Math.max(0, inflateStated(careHomeEntry.params.homeValue, settings.economicSeries.cpi, settings.asAtDate, month) - mortgageBalance - heasDebtOpening) as Cents)
        : undefined;
    // **The care-derived status, isolated as its own local (P14-13) so `RENT_OUT_HOME` below can ask
    // "is the home still exempt" without re-deriving this ternary — the SAME fact, read once.**
    const careDerivedStatus: HomeStatus | undefined = careEntry.some((entry) => entry !== undefined)
      ? homeIsProtected
        ? 'vacatedProtectedPersonRemains'
        : homePastCliff
          ? 'vacatedBeyondTwoYearExemption'
          : 'vacatedWithinTwoYearExemption'
      : undefined;

    // **P14-13c — the sale-proceeds exemption window, DSS Guide 4.6.3.90.** Active from the sale's own
    // month (month 0 of the window) up to, but not including, the 24th month after it —
    // `homePastCliff`'s own `>=` idiom for "past the cliff" — and only where `newHomeAmount` was
    // actually stated: a plain `SELL_HOME` with no set-aside is `HomeStatus.noHome` from the sale,
    // exactly as before this task. The discretionary extension beyond 24 months (SSAct s 1118(2B))
    // is NOT modelled — this window closes unconditionally at the cliff.
    const saleProceedsExemptionMonths = AGE_PENSION.assetsTest.saleProceedsExemptionMonths.value;
    const newHomeAmountStated = homeSoldEntry?.params.newHomeAmount;
    const saleProceedsWindowOpen =
      homeSoldEntry !== undefined &&
      newHomeAmountStated !== undefined &&
      monthsBetween(homeSoldEntry.date, month) < saleProceedsExemptionMonths;
    // P14-19 — a purchase ends the window from its own month (DSS Guide 4.6.3.90: "a new principal
    // home has been purchased"); what is left of the set-aside is ordinary cash from then on.
    const saleProceedsWindowActive = saleProceedsWindowOpen && homeBoughtEntry === undefined;
    // **`newHomeAmount` is stated in TODAY's money too (user ruling, 2026-09-25) — raised to the
    // SAME settlement day `salePriceThisMonth` above uses, once, and held at that nominal figure for
    // the whole 24-month window (`newHomeAmount`'s own doc: a set-aside amount, not a re-priced one).**
    // P9-5 — less what downsizer contributions have already taken from it.
    const saleProceedsSetAsideThisMonth: Cents | undefined =
      saleProceedsWindowActive && homeSoldEntry !== undefined
        ? (Math.max(0, subCents(atTodaysMoney(newHomeAmountStated as Cents, homeSoldEntry.date), setAsideSpentByDownsizer)) as Cents)
        : undefined;

    // --- P14-13 — `RENT_OUT_HOME`'s home-status and income-test consequences ----------------------
    //
    // The most recent tenancy whose span covers this month — `checkRentOutHomes`'s own "at most one
    // active at a time" door refusal is what makes "the" singular correct.
    const activeRentOutHome: RentOutHomeEntry | undefined = rentOutHomeEntries.find(
      (entry) => monthOf(entry.date) <= month && (entry.params.endDate === undefined || monthOf(entry.params.endDate) >= month),
    );
    // **Whole-home rental only (the user's own ruling), enforced HERE and not at the door: whether
    // `vacatedProtectedPersonRemains` holds on a given month depends on `careOn`/`death`, which only
    // the walk resolves.** DSS Guide 4.6.3.70: "if the person's partner continues to live in the
    // home, the home remains exempt while the partner continues to live in it" — a partner actually
    // living there is a room this build has no field to rent out and no field to say is vacant.
    if (activeRentOutHome !== undefined && careDerivedStatus === 'vacatedProtectedPersonRemains') {
      throw new RangeError(
        `${month}: RENT_OUT_HOME entry ${activeRentOutHome.id} is active while a partner still lives in the home (DSS Guide 4.6.3.70) — renting a room while a partner lives there is not modelled. Whole-home rental only`,
      );
    }
    // **DSS Guide 4.6.3.70 (live, 2026-09-25): while `ENTER_CARE` keeps the home exempt from the
    // ASSETS test, its rent is ALSO exempt from the Age Pension INCOME test — "the rent received...
    // is exempt from the income test for the period that the principal home is exempt."** Once the
    // home is past its own cliff, or there is no `ENTER_CARE` at all (the standalone case,
    // `HomeStatus.rentedOut`), the exemption does not apply and the rent is ordinary income.
    const rentIsExemptFromAgePensionIncomeTest =
      careDerivedStatus !== undefined && homeTreatment(careDerivedStatus).principalHomeExempt;
    // Gross rent, annualised at 52 weeks (a stated convention — real estate's own "rent a week × 52",
    // `RentOutHomeParams`'s own doc) less the four costs, each read as nil where absent
    // (`SellHomeParams.sellingCosts`'s own idiom). CAN BE NEGATIVE: a real rental loss.
    //
    // **`weeklyRent` and the four annual costs are stated in TODAY's money (user ruling, 2026-09-25),
    // and — unlike the RAD/sale figures above, fixed once at their entry's own day — they keep RISING
    // with CPI every month of the tenancy: a rent is a standing, recurring fact of the kind
    // `SpendChangeParams.annualSpend` already is, not a one-off price agreed on a single day.**
    // `atTodaysMoney(…, month)` is the SAME expression `annualSpend` is raised by, applied here per
    // figure rather than to one combined total, so each of the five cost lines below stays legible.
    const netRentAnnual: Cents =
      activeRentOutHome === undefined
        ? toCents(0)
        : subCents(
            mulCents(atTodaysMoney(activeRentOutHome.params.weeklyRent, month), 52),
            addCents(
              addCents(atTodaysMoney(activeRentOutHome.params.annualRates ?? toCents(0), month), atTodaysMoney(activeRentOutHome.params.annualInsurance ?? toCents(0), month)),
              addCents(atTodaysMoney(activeRentOutHome.params.annualAgentFees ?? toCents(0), month), atTodaysMoney(activeRentOutHome.params.annualRepairs ?? toCents(0), month)),
            ),
          );
    // **Services Australia's own "Real estate income" page: "If you make a loss... we count that
    // income as zero... You can't offset this loss against... any other source of income."** Floored
    // HERE, at the combined household figure, before either means test sees it — income TAX is the
    // one place a loss is not floored (below, `assessedOn` adds `netRentAnnual` itself, unfloored).
    const netRentAnnualForMeansTests: Cents = (netRentAnnual > 0 ? netRentAnnual : 0) as Cents;
    // **This walk's own "26 fortnights a year" convention (`firstDayOf`'s own doc) — the SAME
    // conversion `agedCareMeansAssessment`'s call below reverses.** Exempt while
    // `rentIsExemptFromAgePensionIncomeTest`; the aged-care call below adds it back in regardless.
    const rentPerFortnightForAgePension: Cents = rentIsExemptFromAgePensionIncomeTest ? toCents(0) : mulCents(netRentAnnualForMeansTests, 1 / 26);
    // **`homeSold` takes PRIORITY over both the `ENTER_CARE` clock and `rentedOut` — a sold home has
    // nothing left to rent (`checkRentOutHomes` refuses that ordering) or to run a care clock on, for
    // the same "a household stating both would disagree with itself" reason (P14-13/P14-13c).** Once
    // sold, the status is `noHome` UNLESS the sale-proceeds exemption window is active (P14-13c),
    // which reports as a homeowner still, DSS Guide 4.6.3.90's own "continues to be assessed as a
    // homeowner" ruling. Short of a sale, `ENTER_CARE`'s own status takes priority over `rentedOut` —
    // a home `ENTER_CARE` already governs keeps ITS OWN status, and renting it changes the INCOME
    // test above, never the ASSETS test (`HomeStatus.rentedOut`'s own doc).
    // P14-19 — a purchase outranks the sale: occupied and exempt again from its own month.
    const derivedHomeStatus: HomeStatus | undefined = homeBoughtEntry !== undefined
      ? 'occupied'
      : homeSold
      ? (saleProceedsWindowActive ? 'noHomeSaleProceedsExempt' : 'noHome')
      : careDerivedStatus !== undefined
        ? careDerivedStatus
        : activeRentOutHome !== undefined
          ? 'rentedOut'
          : undefined;

    const householdThisMonth = ((base: Household): Household =>
      derivedHomeStatus === undefined ? base : Object.freeze({ ...base, homeStatus: derivedHomeStatus }))(
      withBalances(household, balances, meansTestCash, inForceIncomePerFortnight, (personIndex, slot) =>
        effectivePhaseFor(personIndex, slot, date), (personIndex, slot) => switchedOn(personIndex, slot, date),
      ),
    );
    // **P12-1 — the survivor is means-tested as a SINGLE person from the month of the death**: one
    // Person, so `agePensionEntitlement` takes the single rate, free areas and deeming threshold.
    // The home is the Household's and is unchanged. The deceased's position stays in
    // `householdThisMonth` — every per-Person array below is positional — holding nothing.
    const meansTestHousehold: Household =
      deceasedNow === undefined
        ? householdThisMonth
        : (() => {
            const { offsetShares: _sharesAreForTax, ...rest } = householdThisMonth;
            return Object.freeze({ ...rest, persons: Object.freeze([householdThisMonth.persons[death?.survivor ?? 0] as Person] as const) });
          })();

    // **What did NOT move this month, and why — P4-4's polish.** A plain mutable local beside
    // `lines`, filled at the three points in this tick where the walk knows something a line cannot
    // carry: here, where a register may not reach the month; at the tax accrual, for the same
    // reason; and after the Waterfall, where all four limbs report what they could offer and why.
    // Nothing reads it back — it is output — so nothing downstream can come to depend on the order
    // by accident.
    const notes: MonthNote[] = [...retirementNotes];

    // The means test, on this month's own parameters — or nothing at all, where none exist. Past
    // the published window the parameters are indexed from `settings.economicSeries.agePension`, or
    // from the series generated from the plan's own rates where none is stated (2026-09-23); where a
    // STATED series does not reach, the call refuses rather than returning a stale set.
    //
    // **AND THE ABSENCE NOW SAYS SO (P4-4's polish).** `agePensionParametersCover`'s own doc used to
    // end *"`Month` has no slot for 'not computed'... and `plan.ts` is not this chunk's to widen"*;
    // it is widened, the slot is `Month.notes`, and that sentence is superseded there rather than
    // deleted. The note is emitted from the SAME boolean the entitlement is decided by, so a month
    // cannot be silently uncomputed and unannotated.
    const agePensionComputable = agePensionParametersCover(date);
    if (!agePensionComputable) notes.push(PARAMETER_WINDOW_NOTES['Age Pension']);
    const entitlement = agePensionComputable
      ? agePensionEntitlement({
          household: meansTestHousehold,
          date,
          deemingRates: settings.deemingRates,
          indexationSeries,
          ...(illnessSeparatedBy === undefined ? {} : { illnessSeparated: true }),
          ...(careVacatedHomeAssessment === undefined ? {} : { careVacatedHomeAssessment }),
          ...(activeRentOutHome === undefined ? {} : { otherAssessableIncomePerFortnight: rentPerFortnightForAgePension }),
          ...(saleProceedsSetAsideThisMonth === undefined ? {} : { saleProceedsSetAside: saleProceedsSetAsideThisMonth }),
        })
      : undefined;

    // **AND A MONTH COMPUTED FROM A CARRIED TABLE SAYS SO (P4-1e).** Unreachable from this walk since
    // 2026-09-23 — `indexationSeries` is never undefined here, so no period is carried — and kept,
    // because it is the entitlement's own field that decides it. The note is emitted from the
    // entitlement's own `standingFrom` — the field the period set — so a month cannot be computed
    // from carried parameters and left unannotated, and cannot be annotated on a month that was
    // not. It is the same discipline the window note above is emitted under, applied to the
    // opposite case: there a figure is missing, here a figure is present and OLD.
    if (entitlement?.standingFrom !== undefined) notes.push(standingParametersNote(entitlement.standingFrom));

    // Outside the window `agePensionEntitlement` never ran, so its refusals never ran either. The
    // vacated-home refusal is not conditional on a rate table, so it is taken here too: a Household
    // this tool refuses to model in March 2027 is one it refuses to model in April 2027.
    // After a death the entitlement's own split is the survivor's alone, one Person long; the month
    // reports both positions, so it is split again on the whole Household — the same figures, since
    // the deceased holds nothing (the ADR-0005 assertion below checks exactly that).
    const assets: AssetSplit =
      deceasedNow === undefined
        ? (entitlement?.assets ?? splitAssets(householdThisMonth, date, careVacatedHomeAssessment))
        : splitAssets(householdThisMonth, date, careVacatedHomeAssessment);
    if (entitlement === undefined && assets.homeIsAssessableButUnvalued) {
      throw new UnvaluedAssessableHomeError();
    }

    // ADR-0005, asserted: "the Age Pension calculation consumes the assessable figure only."
    if (entitlement !== undefined && entitlement.assetsTest.assessed !== assets.assessableAssets) {
      throw new RangeError(
        `ADR-0005 is broken at ${month}: the assets test assessed ${entitlement.assetsTest.assessed} ` +
          `but assessableAssets is ${assets.assessableAssets} (protectedAssets is ${assets.protectedAssets}). ` +
          'The means test consumes the assessable figure and never the protected one.',
      );
    }

    // **P4-10 — the Work Bonus balance is written back, and this is `balanceAfter`'s only consumer.**
    // The means test above read the balance the month OPENED with; here the month's fortnights are
    // run through §4.6 and the closing figure becomes next month's opening one. Two things are
    // deliberate. First, it happens AFTER the entitlement and reads nothing the entitlement did not
    // already see, so the assessment cannot depend on a balance a later fortnight of the same month
    // produced. Second, **a month outside the parameter window holds the balance still** rather than
    // accruing through it: `eligible` is the flag `agePensionEntitlement` computed, and where no
    // entitlement was computed there is no flag — inventing one would be this walk asserting an
    // accrual in a month it has just declined to model at all.
    if (entitlement !== undefined) {
      const fortnights = fortnightsInWalkMonth(months.length);
      entitlement.workBonus.forEach((result, assessedIndex) => {
        // After a death the means test assessed the survivor alone, so its only result is theirs.
        const personIndex = deceasedNow === undefined ? assessedIndex : (death?.survivor ?? assessedIndex);
        const held = balances[personIndex];
        const assessed = householdThisMonth.persons[personIndex];
        if (held === undefined || assessed === undefined) return;
        held.workBonusBalance = workBonusBalanceAfterMonth(assessed, result.eligible, fortnights);
      });
    }

    const lines: MonthLine[] = [];
    const agePension =
      entitlement === undefined
        ? toCents(0)
        : monthlyFromFortnightly(entitlement.householdRatePerFortnight);
    // Only a positive figure becomes a line: `MonthLine.amount` is specified as always positive, and
    // a nil entitlement is a fact about the means test, not a payment of nothing.
    if (agePension > 0) {
      lines.push(
        Object.freeze({
          direction: 'inflow',
          effect: 'cash',
          description: AGE_PENSION_LINE,
          amount: agePension,
          // `entitlement` is defined here: `agePension > 0` is unreachable without it.
          provenance: agePensionProvenance(fy, entitlement as AgePensionEntitlement, seriesGenerated),
          // Legislated, and nobody's entry: the figure is the means test's, computed from balances
          // that entries may have moved. See `NO_STATING_ENTRY` for why the causal chain is not
          // walked backwards into an attribution.
          attribution: NO_STATING_ENTRY.agePension,
        }),
      );
    }

    // **P12-1 — the lump sum bereavement payment, in the month of the death.** Paid where the couple
    // had they lived were BOTH being paid the Age Pension (`AGE_PENSION.bereavement.whoIsPaid`), on
    // the couple's combined rate against the survivor's new single rate — the entitlement above.
    // A line beside the Age Pension's own, because it is Age Pension money: it reaches the Waterfall
    // the same way, and income tax treats it the same way (the Age Pension is not in taxable income,
    // `project()`'s doc and register §8).
    if (coupleHadTheyLived !== undefined && entitlement !== undefined && death !== undefined) {
      const couple = agePensionEntitlement({
        household: coupleHadTheyLived,
        date,
        deemingRates: settings.deemingRates,
        indexationSeries,
      });
      const bothPensioners = couple.eligiblePersons.length === 2 && couple.perPersonRatePerFortnight > 0;
      const amount = bothPensioners
        ? bereavementLumpSum({ coupleRatePerFortnight: couple.householdRatePerFortnight, singleRatePerFortnight: entitlement.householdRatePerFortnight })
        : toCents(0);
      if (amount > 0) {
        lines.push(
          Object.freeze({
            direction: 'inflow',
            effect: 'cash',
            description: AGE_PENSION_BEREAVEMENT_LINE,
            amount,
            provenance: bereavementProvenance(fy, couple, entitlement, seriesGenerated),
            attribution: statedBy(death.entryId),
          }),
        );
      }
    }

    // --- P14-13 — `SELL_HOME`'s cash lines, in the entry's OWN month only -------------------------
    //
    // **Four separate facts, `AGED_CARE_RAD_PAYMENT_LINE`'s own reasoning: a reader auditing a sale
    // wants the gross proceeds, the selling costs, the mortgage repaid and any Home Equity Access
    // Scheme debt repaid apart, not one net figure with nothing behind it.** Only the proceeds line
    // is unconditional; the other three are omitted where nil — no selling costs stated, no mortgage,
    // no HEAS debt — `MORTGAGE_INTEREST_LINE`'s own "emit only what moved". No CGT line is produced:
    // the main residence exemption is total (ITAA 1997 Subdiv 118-B) and there is no CGT parcel for a
    // home to begin with (ADR-0005), so there is nothing to compute a gain on.
    if (homeSoldThisMonth !== undefined) {
      // **`salePrice`/`sellingCosts` are stated in TODAY's money (user ruling, 2026-09-25) —
      // `atTodaysMoney` raises both to THIS entry's own settlement day, `salePriceThisMonth` above's
      // own precedent (computed independently here: this block runs unconditionally on `homeSoldThisMonth`,
      // that one only inside the HEAS-repayment branch).**
      const salePrice = atTodaysMoney(homeSoldThisMonth.params.salePrice, homeSoldThisMonth.date);
      const sellingCosts = atTodaysMoney(homeSoldThisMonth.params.sellingCosts ?? toCents(0), homeSoldThisMonth.date);
      lines.push(
        Object.freeze({
          direction: 'inflow',
          effect: 'cash',
          description: HOME_SALE_PROCEEDS_LINE,
          amount: salePrice,
          provenance: UNLEGISLATED.homeSale,
          attribution: statedBy(homeSoldThisMonth.id),
        }),
      );
      if (sellingCosts > 0) {
        lines.push(
          Object.freeze({
            direction: 'outflow',
            effect: 'cash',
            description: HOME_SALE_SELLING_COSTS_LINE,
            amount: sellingCosts,
            provenance: UNLEGISLATED.homeSale,
            attribution: statedBy(homeSoldThisMonth.id),
          }),
        );
      }
      if (homeSaleMortgageRepaid > 0) {
        lines.push(
          Object.freeze({
            direction: 'outflow',
            effect: 'cash',
            description: HOME_SALE_MORTGAGE_REPAID_LINE,
            amount: homeSaleMortgageRepaid,
            provenance: UNLEGISLATED.mortgage,
            attribution: statedBy(homeSoldThisMonth.id),
          }),
        );
      }
      if (homeSaleHeasRepaid > 0) {
        lines.push(
          Object.freeze({
            direction: 'outflow',
            effect: 'cash',
            description: HOME_SALE_HEAS_REPAID_LINE,
            amount: homeSaleHeasRepaid,
            provenance: heasProvenance(fy),
            attribution: statedBy(homeSoldThisMonth.id),
          }),
        );
      }
    }

    // --- P14-13 — `RENT_OUT_HOME`'s cash lines, EVERY month the tenancy is active -------------------
    //
    // **Five separate facts, `HOME_SALE_LINE_PREFIX`'s own reasoning: a reader auditing a rental
    // wants the gross rent and each of the four costs apart, not one net figure with nothing behind
    // it.** Only the rent line is unconditional; the four cost lines are omitted where nil — a cost
    // never stated reads as nil, `SellHomeParams.sellingCosts`'s own idiom. Unlike `SELL_HOME`'s
    // ONE-OFF proceeds, these five recur every month `activeRentOutHome` is defined, not once in the
    // entry's own month — a tenancy is a standing arrangement, `HEAS_DRAW`'s own fortnightly stream.
    if (activeRentOutHome !== undefined) {
      // Stated in TODAY's money and raised to THIS month, `netRentAnnual`'s own conversion above,
      // applied afresh here for the cash lines (user ruling, 2026-09-25).
      const monthlyRent = monthlyFromAnnual(mulCents(atTodaysMoney(activeRentOutHome.params.weeklyRent, month), 52));
      lines.push(
        Object.freeze({
          direction: 'inflow',
          effect: 'cash',
          description: RENT_OUT_HOME_RENT_LINE,
          amount: monthlyRent,
          provenance: UNLEGISLATED.rentOutHome,
          attribution: statedBy(activeRentOutHome.id),
        }),
      );
      const costLine = (description: string, annual: Cents | undefined) => {
        const monthly = monthlyFromAnnual(atTodaysMoney(annual ?? toCents(0), month));
        if (monthly <= 0) return;
        lines.push(
          Object.freeze({
            direction: 'outflow',
            effect: 'cash',
            description,
            amount: monthly,
            provenance: UNLEGISLATED.rentOutHome,
            attribution: statedBy((activeRentOutHome as RentOutHomeEntry).id),
          }),
        );
      };
      costLine(RENT_OUT_HOME_RATES_LINE, activeRentOutHome.params.annualRates);
      costLine(RENT_OUT_HOME_INSURANCE_LINE, activeRentOutHome.params.annualInsurance);
      costLine(RENT_OUT_HOME_AGENT_FEES_LINE, activeRentOutHome.params.annualAgentFees);
      costLine(RENT_OUT_HOME_REPAIRS_LINE, activeRentOutHome.params.annualRepairs);
    }

    // --- INTEREST ON RUNNING CASH (user rulings, 2026-09-23) ----------------------------------------
    //
    // **What earns it: the cash the month OPENS with, less what is owed on the home loan, never below
    // nil.** The mirror of `mortgageMonth`'s `max(0, balance − offset)`: a dollar sitting against the
    // loan is already cancelling that loan's interest, so each dollar either cancels loan interest or
    // earns this rate and never both, and neither figure jumps on the day the loan is paid off. The
    // loan read is the one `mortgageMonth` prices this month — the terms in force after this month's
    // entries — so the two sides agree on what is owed.
    //
    // **The rate is the plan's own**: `Settings.cashInterestRate`, or `economicSeries.cpi` where none
    // is stated. A twelfth of it a month (`mortgageMonth`'s arithmetic convention), rounded DOWN
    // because this is money arriving, and a rate at or below nil pays nothing.
    //
    // **Split by `Household.offsetShares`, one cash line per owner**, so the month rows show whose
    // it is and the income tax below can assess each owner's share as their own income. It is NOT
    // handed to the means test: the cash itself is deemed, which stands in for what it earns.
    const cashInterestRate = settings.cashInterestRate ?? settings.economicSeries.cpi;
    const loanOwing = mortgage === undefined ? 0 : mortgageBalance;
    const cashEarning = Math.max(0, openingBalance - loanOwing);
    const cashInterest = Math.max(0, Math.floor((cashEarning * cashInterestRate) / 12)) as Cents;
    // After a death all of the cash is the survivor's, and so is all of what it earns.
    const cashInterestThisMonth =
      deceasedNow === undefined ? offsetInterestByOwner(household, cashInterest) : household.persons.map((_person, index) => (index === deceasedNow ? toCents(0) : cashInterest));
    const cashInterestAnnualised = cashInterestThisMonth.map((amount) => (amount * 12) as Cents);
    // **P14-13 — `RENT_OUT_HOME`'s net rent, split 50/50 for a couple and wholly to a single Person —
    // a HARD-CODED default, deliberately, and NOT `Household.offsetShares`.** `offsetShares` is
    // stated "for income tax ONLY" on the OFFSET ACCOUNT (`household.ts`'s own doc); reusing it here
    // would apply a share the user stated about their CASH to a different asset, the home, which is
    // not what they were asked. `RentOutHomeParams` carries no ownership-share field of its own (the
    // task's own params list), so "a couple owns the home jointly, 50/50" is asserted here and
    // "unless stated" is NOT modelled — a scope decision, not an oversight. After a death all of it
    // is the survivor's, `cashInterestThisMonth`'s own precedent (rounding as `offsetInterestByOwner`
    // does: every share but the last is floored, the last gets what is left).
    const rentSplitByOwner = (amount: Cents): readonly Cents[] => {
      if (household.persons.length === 1) return [amount];
      const half = Math.floor(amount / 2) as Cents;
      return [half, subCents(amount, half)];
    };
    const monthlyNetRent = monthlyFromAnnual(netRentAnnual);
    const rentThisMonth: readonly Cents[] =
      deceasedNow === undefined
        ? rentSplitByOwner(monthlyNetRent)
        : household.persons.map((_person, index) => (index === deceasedNow ? toCents(0) : monthlyNetRent));
    const rentAnnualised = rentThisMonth.map((amount) => (amount * 12) as Cents);
    household.persons.forEach((person, index) => {
      const amount = cashInterestThisMonth[index] ?? toCents(0);
      if (amount <= 0) return;
      lines.push(
        Object.freeze({
          direction: 'inflow',
          effect: 'cash',
          description: cashInterestDescription(person),
          amount,
          provenance: UNLEGISLATED.cashInterest,
          attribution: NO_STATING_ENTRY.cashInterest,
        }),
      );
    });

    // --- Chunk 3: salary, taxable income, and the Household's income tax ---------------------------
    //
    // **The annual-versus-monthly decision, taken here and stated rather than defaulted.** Income
    // tax is an ANNUAL assessment on a year's taxable income; the tick is monthly; and `Month`
    // carries no financial year, because chunk 0 left the financial year as a first-class boundary
    // to P4-2. Two shapes were available and this is the one chosen:
    //
    //   (i)  **ACCRUE MONTHLY, on the month's own state.** Each month annualises the salary in force
    //        in THAT month, computes a full year's tax on it under the rules of the financial year
    //        that month falls in, and reports a twelfth. Chosen — and since P4-2 the accrual is
    //        SETTLED at the year's end rather than left standing (chunk 3b below).
    //   (ii) *Compute one annual figure per financial year and slice it across the months.* Rejected:
    //        it needs a year the walk can complete — and the walk begins at `asAtDate`, which is
    //        mid-year for every real plan, so the first financial year is a PARTIAL one whose annual
    //        figure is not defined by anything the model holds. It would also have to decide what a
    //        salary that changes in November means, which is the same question (i) answers per month.
    //
    // **The accrual is not the year, and chunk 3b below SETTLES the difference (P4-2).** The sum of
    // twelve monthly-annualised figures is not the tax on the year's actual income whenever the
    // income moves during the year. It is nil for a Person whose salary does not move within a
    // financial year, which is the modal case; where it is not nil, the year-end true-up reconciles
    // it against one annual assessment, in whichever direction it falls.
    //
    // ⚠️ **AND WHICH DIRECTION IT FALLS IN WAS STATED FALSELY HERE UNTIL 2026-09-18 — the reason
    // P4-2 was built rather than deferred again.** The superseded sentence, kept once so that the
    // correction has something to point at, read: *“the direction is not a guess: the rate scale is
    // CONVEX (marginal rates are non-decreasing, and LITO's taper only steepens it), so by Jensen's
    // inequality `(1/12)·ΣT(yₘ) ≥ T((1/12)·Σyₘ)`. Taxing each month as though its rate ran all year
    // OVER-states the tax and therefore UNDER-states the household — the direction this build is
    // required to be wrong in.”*
    //
    // **The premise is wrong: the scale is NOT convex everywhere, because LITO's taper ENDS.** The
    // second-stage taper withdraws 1.5c in the dollar and it runs out at a taxable income of
    // **$66,667**, so at that point the effective marginal rate FALLS by 1.5 percentage points and
    // the scale is locally CONCAVE. Jensen therefore runs the other way across it, and a within-year
    // RISE that crosses it **UNDER-charges**: half a year at $45,000 and half at $78,000 is
    // **$15.00** short of the tax on the $61,500 year it averages to — $80 of bracket convexity
    // against $95 of LITO concavity — where a convex scale could only ever over-charge. ($14.98 once
    // each twelfth is rounded to the cent.)
    //
    // **Two things are true at once and both are stated.** The low-income end of the scale IS convex,
    // and the cases the walk can actually express by a salary path — a `RETIRE`, a drop to no days —
    // over-charge at every income and every month count, because no entry in `plan.ts` STATES a
    // salary and a Person's pay can therefore only move between its own figure and nil. But "the
    // monthly residual always over-states tax" was a claim about every Household this model can
    // express, and the walk reaches a concavity by another road: the Medicare levy's FAMILY shade-in
    // flattens above the family threshold, so a Household whose months straddle it is UNDER-charged —
    // **$633.30** on the fixture in `test/core-projection-true-up.test.mjs`, in the same month as an
    // $8,161.10 refund to the other Person. That file pins both with hand-worked arithmetic.
    //
    // The s 25-130 deduction runs the other way from the scale and always the same way: a Person
    // working half the year receives the full $1,000 against each half-year's annualised income but
    // keeps only a twelfth of each month's benefit, so half the deduction — an under-stated
    // deduction and an over-stated tax, in every case. The true-up settles that too, because it
    // assesses the year's actual salary with the year's one deduction.
    //
    // **`Month` does NOT need a financial year for this, and that is why none was added.** The year
    // is `financialYearContaining(firstDayOf(month))` — pure string arithmetic on data the `Month`
    // already carries, and a field would be a second spelling of it. **P4-2 BUILT THE SETTLEMENT AND
    // STILL ADDED NO FIELD**: the annual figure is reported as a `MonthLine` whose description names
    // the year it settles (`TAX_TRUE_UP_LINE`), so `plan.ts` is untouched — chunk 3's proposal that
    // P4-2 *may* widen `plan.ts` turned out not to need the permission. Chunk 3 owns the monthly
    // accrual; chunk 3b owns the financial year as a reported boundary and the year-end true-up.
    //
    // **`fy` itself is now bound at the top of the tick (P5-3 limb 2)** — the Age Pension line is
    // stamped with it in chunk 2, which runs earlier — and nothing above changed but the line it is
    // declared on. The paragraph it used to sit under stays here, because it is about why `Month`
    // has no financial-year FIELD and that is still true.
    // **WHAT STANDS BEHIND A PAY PACKET — P5-3, and the answer is usually NOTHING.** The figure is
    // `Person.employmentIncomePerFortnight` unless an entry has stated one: what an entry does to
    // it is switch it off (`RETIRE`, a `WORK_PATTERN_CHANGE` to no days), switch it back on, or —
    // since 2026-09-19 — replace it with a stated `annualSalary`. So a Person whose work pattern
    // nobody has ever stated gets `'none'` with
    // a note saying so, and a Person whose pattern IS stated gets that entry — it is the reason the
    // line exists in a walk where a retirement or a no-days pattern could have ended it. The same
    // answer serves the income tax line, which is assessed on this salary and no other income, and
    // the two differ only in the sentence they carry when nobody has stated anything.
    const workPatternAttribution = (index: number, unstated: UnstatedFigure): LineAttribution => {
      const stated = workPattern[index];
      return stated === undefined ? unstated : statedBy(stated);
    };
    // The annual half of `inForceSalary`, decided at the top of the tick because the means test
    // runs before this point and is assessed on the SAME three levels (P4-8). One ordering, read
    // twice, so the income tax and the income test cannot disagree about who is working.
    const salaries = inForceSalary.map((salary) => salary.perYear);
    // **THE SACRIFICE THIS MONTH, AND THE SALARY THAT IS ASSESSED AFTER IT (P6-8 brief 2, chunk 1).**
    //
    // An effective salary sacrifice arrangement is made BEFORE the income is derived, so the
    // sacrificed amount is never salary or wages of the employee and never enters assessable income
    // (ITAA 1997 s 6-5; TR 2001/10). It is therefore subtracted here, ABOVE every tax line, and the
    // three bases that read a salary fall with it: Taxable Income, Net Labour Income (and so WATO),
    // and the Family Income the Medicare levy's family threshold reads. Rebate Income does NOT fall
    // — the sacrifice is added back to it — and that is handled in `asSaptoPerson`.
    //
    // **`Math.min` is the whole of the over-sacrifice rule in this chunk, and it is deliberate.**
    // Nothing yet refuses an arrangement larger than the pay it comes out of, or larger than the
    // concessional cap (P6-8 chunk 5 owns both). Capping at the month's own gross is the only
    // reading that keeps taxable income non-negative AND keeps the identity
    // `assessable + sacrificed === gross` exact. **Chunk 2 changed what that identity is FOR and did
    // not weaken it**: Rebate Income no longer reconstructs the gross, but it adds `sacrificed` back
    // to the figure `assessable` was taxed on, so the day a floor or a second clamp makes the two
    // stop summing to the gross, the add-back over- or under-states by exactly that slippage.
    // A Person who states a sacrifice of $80,000 against a
    // $60,000 salary therefore sacrifices $60,000 here and the excess is silently dropped — a real
    // residual, and the reason chunk 5 is a refusal and not a clamp.
    //
    // ⚠️ ~~**CHUNK 1 IS KNOWN-INCOMPLETE IN THE FLATTERING DIRECTION, and it is stated rather than
    // hidden.** The tax falls here, and in this chunk NOTHING else moves: the `Salary` line below
    // still reports the GROSS cash (chunk 3), and no super interest is credited and no 15%
    // contributions tax is charged (chunk 4). So between this commit and those, a Household with a
    // sacrifice keeps the tax saving AND keeps the cash AND the money never reaches a fund — it is
    // better off by the whole sacrifice, which is the direction this build is not allowed to be
    // wrong in.~~ **SUPERSEDED BY CHUNK 3 (2026-09-20): the cash line below now reports the salary
    // ACTUALLY RECEIVED, so the flattering half is gone and the remaining gap is chunk 4's — the
    // money leaves the pay packet and does not yet arrive in the fund, which UNDER-states wealth by
    // the whole sacrifice. The build is still incomplete; it is now incomplete conservatively.**
    // It is committed in this state because the alternative is one unreviewable change,
    // and TODO.md P6-8 carries the outstanding limbs. The Age Pension income test is NOT touched
    // here and still reads the gross fortnightly figure.
    //
    // ⚠️ **THE GROUND UNDER THAT CHANGED ON 2026-09-19 AND THE ANSWER DID NOT.** This said
    // *the register holds no provision on Centrelink's treatment of salary sacrifice and nobody has
    // ruled* — half of which is still true. The register still holds no provision; somebody HAS
    // now ruled. Register §4.3.1 **R14** settles that the Age Pension income test assesses the
    // GROSS salary, unreduced by salary sacrifice, on two grounds: it is what Centrelink does, and
    // it is the direction that assesses higher and so claims nothing. It was taken in the ABSENCE
    // of a source rather than against one, so a sourced provision supersedes it whichever way it
    // runs (register **O76**). Until then this line is a ruling rather than a silence.
    const sacrificedThisMonth = salaries.map((gross, index) =>
      Math.min(gross, overDaysWorked(sacrificeLevel[index]?.annualAmount ?? toCents(0), index)) as Cents,
    );
    const assessableSalaries = salaries.map((gross, index) =>
      subCents(gross, sacrificedThisMonth[index] ?? toCents(0)),
    );

    // **WHICH KIND OF NOTHING, for the one kind no other part of this `Month` can say** (P6-8 brief
    // 4, 2026-09-21). Five of the six reasons a Person sacrifices nothing in a month are already
    // legible somewhere — the entry list, the entry's date, `appliedEntryIds`, the salary line's
    // absence, the switched-off count. The sixth is not: an arrangement the user ENDED leaves
    // nothing behind at all, because the entry that ended it moves no money and so has no line.
    // This is that entry's only mark on the walk, and it is emitted in every month the stop
    // governs rather than in the stop's own month, because the reader asking the question is
    // reading THIS month.
    //
    // It is pushed here, before the Guarantee's own notes, so a stopped Person's two notes read in
    // the order the money does: nothing sacrificed, and then the employer's 12% that is paid
    // anyway — and it is the Guarantee that shows the stop did not touch the employer's half.
    household.persons.forEach((person, index) => {
      const stopped = sacrificeStoppedBy[index];
      if (stopped === undefined || index === deceasedNow) return;
      notes.push(
        Object.freeze({
          subject: 'salary sacrifice stopped',
          person: person.name,
          entryId: stopped.entryId,
          stoppedFrom: stopped.stoppedFrom,
          note: salarySacrificeStoppedNoteText(person.name, stopped.stoppedFrom),
        } as const),
      );
    });

    // --- P6-8 brief 3 chunks 1 AND 2B: THE SUPERANNUATION GUARANTEE, COMPUTED AND CREDITED -------
    //
    // `superContributions.ts` was stranded from P3-3a until chunk 1: it reached no part of this
    // walk, and every chunk of brief 2 had to say so on the line it was writing. Chunk 1 called the
    // module and moved no money; **chunk 2b credits the answer, net of the fund's 15%, to the
    // interest the plan states or derives** — the largest understatement this model carried.
    //
    // **THE CREDIT IS NET AND NEVER GROSS.** The Guarantee is an assessable contribution of the
    // fund and s 26(1)(a)'s 15% falls on it; a gross credit would overstate every salaried
    // Household's superannuation by 15% of every employer contribution, compounding, which is the
    // flattering direction. The charge is taken in `superGuaranteeThisMonth`, through the same
    // `contributionsTax` the salary-sacrifice credit goes through.
    //
    // **AND THE FINAL CHUNK OF BRIEF 3 COUNTS IT AGAINST THE CAP.** The sentence that stood here —
    // *"the Guarantee is measured against no contributions cap ... so a Person whose sacrifice PLUS
    // Guarantee is over the cap is not refused"* — was true for the length of chunk 2b and is now
    // false: `refuseConcessionalContributionsOverGeneralCap` is called below on the SUM of this
    // figure and the month's sacrifice. What it costs is stated where it is spent: a total above
    // $25,000 needs the year's own cap, and from FY2027-28 there is none.
    //
    // **THE EARNINGS BASE IS PRE-SACRIFICE, AND THAT IS TRAP T17 (SGAA ss 10A(1)(h), 10A(4)(b)).**
    // From 1 July 2026 the base is qualifying earnings, and a sacrificed amount is qualifying
    // earnings. So the two limbs below are ADDED — the salary the Person is actually paid, which
    // chunk 1 of brief 2 already reduced by the sacrifice, plus the sacrifice itself, added back —
    // and their sum is the gross the month started from. Computing the SG on the post-sacrifice
    // figure is the intuitive mistake (it is what a payslip calls gross) and it understates the
    // employer contribution by 12% of the whole arrangement. `QualifyingEarnings` is a brand with
    // no widening constructor precisely so that this call cannot be made without naming both limbs.
    //
    // **THE THIRD LIMB IS NIL AND IT IS STATED, NOT OMITTED (register O19).** Bonuses, allowances,
    // termination payments and the rest of s 10A(1)(a)–(g) are not enumerated by this register and
    // are not held by this model — so the nil is this build's own figure and travels with the
    // module's O19 caveat on every note below. `QualifyingEarningsComponents` has no default for
    // the same reason `surchargeIncome` has none: a field that can be left out is a field that
    // disappears from the calculation.
    //
    // **ONE EMPLOYMENT PER PERSON, because that is all this model holds — and the direction is
    // conservative.** The maximum contributions base is per financial year *per employer* (T18), so
    // a Person paid $300,000 by two employers has two ceilings and a larger Guarantee than the same
    // Person paid $300,000 by one. This walk carries a single salary with no employer identity, so
    // it charges a single ceiling: at or below the ceiling the two readings agree exactly, and
    // above it this one is the LOWER, which is the direction an uncredited figure may be wrong in.
    //
    // **A YEAR WHOSE CEILING CANNOT BE DERIVED REFUSES THE EXCESS ALONE, NOT THE PERSON.** The
    // ceiling is `floor_to_10(concessional cap × 100 ÷ charge percentage)` and the cap indexes on
    // AWOTE, so a year with no index number raises `MissingIndexNumberError`. ~~from FY2027-28~~ —
    // **struck 2026-09-21 (P6-12): this tick supplies a forward series from the plan's own wage
    // growth rate, so every year the walk reaches from FY2026-27 has one and this path is taken by
    // no year the walk can reach.** The floor-first shape below is kept: it is what a year before
    // the published wage level relies on, and it is the argument the whole section stands on.
    // Before chunk 2b that made the whole Guarantee `null`; refusing a whole Household's employer
    // contributions from July 2027 because a ceiling nine-tenths of Persons never reach cannot be
    // derived would have been the over-refusal this register keeps having to record. So the walk
    // asks `superGuaranteeBelowTheFloor` FIRST: s 960-285(4) makes the concessional cap's base
    // amount a floor, the ceiling is monotone in the cap, and therefore 12% of the first
    // `MINIMUM_MAXIMUM_CONTRIBUTIONS_BASE` of earnings is owed in EVERY year, indexed or not, with
    // no index number consumed. That part is credited; only the charge on earnings above the floor
    // is reported as refused, in the register's own words, per employment.
    // **THE YEAR'S GUARANTEE PER PERSON, kept for the cap check twenty lines below — and it is
    // `annualAmountCredited`, the figure this walk actually pays in, not `annualAmount`.** Where the
    // year's ceiling cannot be derived the two differ, and the credited figure is the lower: the
    // concessional total is then a LOWER bound, which can still prove a breach and is the direction
    // this check is allowed to be wrong in. Reading the same field the credit is taken from is also
    // the only way the amount measured against the cap and the amount paid into the fund cannot
    // drift apart.
    const guaranteeForTheYear: Cents[] = household.persons.map(() => toCents(0));
    const guaranteesThisMonth = household.persons.flatMap((person, index) => {
      const earningsPaidToThePerson = assessableSalaries[index] ?? toCents(0);
      const salarySacrificedAmounts = sacrificedThisMonth[index] ?? toCents(0);
      // Nobody employs them this month, so there is no Guarantee and no note. The gate is the SUM
      // of the two limbs and not the paid half: a Person sacrificing the whole of their salary has
      // nothing paid to them and is still owed 12% of the lot, which is T17 in its purest form.
      if (addCents(earningsPaidToThePerson, salarySacrificedAmounts) <= 0) return [];
      // **Back at work after retiring (retire flow S3), and in the month they stop again: an account
      // that became a pension at retirement is closed to the Guarantee**, as a started TTR is, so an account kept in
      // accumulation is its destination by derivation. With none left, a real fund opens a new
      // accumulation account; the walk cannot, so it refuses by name.
      const spell = spellIn(index, month);
      const closed = spell !== undefined && spell.at > 0
        ? person.superInterests.map((_interest, slot) => {
          // Switched at THIS stop: the month's final pay is for work before it, and is credited as it is.
          const switched = switchedOn(index, slot, date);
          return ttrStartDay[index]?.[slot] ?? (switched !== undefined && monthOf(switched) < month ? switched : undefined);
        })
        : ttrStartDay[index] ?? [];
      if (spell?.change.kind === 'returned' && !person.superInterests.some((interest, slot) => interest.phase === 'accumulation' && closed[slot] === undefined)) {
        throw new RangeError(
          `${person.name} goes back to work on ${spell.change.date}, and every super account of ${person.name}'s is a pension by then. A pension account can't take contributions, so the employer's super has nowhere to go. A real fund would open a new accumulation account; the forecast can't open one part-way through the plan. To model it, give ${person.name} a second super account with a nil balance that stays as it is at retirement, and say which account the employer pays into`,
        );
      }
      const { note, credit } = superGuaranteeThisMonth(
        fy,
        person,
        index,
        qualifyingEarnings({ earningsPaidToThePerson, salarySacrificedAmounts, otherQualifyingEarnings: toCents(0) }),
        salarySacrificedAmounts,
        awoteIndexNumbers,
        closed,
      );
      if (credit !== undefined) refuseContributionAfterSwitch(index, credit.slot, date, 'The employer’s super', workedShare[index] !== undefined);
      guaranteeForTheYear[index] = note.annualAmountCredited ?? toCents(0);
      notes.push(note);
      return credit === undefined ? [] : [credit];
    });

    // --- P6-8 brief 3, final chunk: THE CONCESSIONAL CAP, AGAINST THE REAL TOTAL -----------------
    //
    // **The check brief 2 chunk 5 built, moved here and widened to what it was always meant to
    // measure.** It ran in the entry loop above, against the stated sacrifice ALONE, and its own
    // comment said why: the Guarantee was stranded, so every total the walk could build understated
    // the Person's real one, and a check that can only understate can prove a breach and never
    // compliance. Chunk 2b discharged that ground by crediting the Guarantee, so the total below is
    // the one the walk will actually contribute — the sacrifice and the employer's 12%, the two
    // limbs of s 291-25 this model holds — and it is measured against the cap for the year the
    // arrangement takes effect in.
    //
    // **THE SACRIFICE LIMB IS `sacrificedThisMonth` AND NOT THE STATED AMOUNT**, which is the
    // month's `Math.min(gross, stated)`: the amount that will actually leave the pay packet and
    // arrive in the fund. Testing the stated figure would measure dollars this build never
    // contributes, against a cap those dollars never consume. The direction is recorded: for a
    // Person who states more than their pay, the total tested is SMALLER than the stated
    // arrangement, so the over-pay gap (register O77 (iii)) makes this check weaker and never
    // stricter — and it is the same clamp, read a second time, so the two cannot disagree.
    //
    // ⚠️ **A SACRIFICE THAT WAS LEGAL YESTERDAY CAN BE REFUSED TODAY, and that is the change, not a
    // defect.** $27,000 sacrificed against a $150,000 salary is $27,000 + $18,000 of Guarantee =
    // $45,000 of concessional contributions, which is $12,500 over FY2026-27's $32,500 cap. Brief 2
    // walked it, because it looked only at the $27,000. The user-facing notice says so in terms.
    //
    // ⚠️ **AND THE FLOOR IS CROSSED BY TOTALS THAT NO SINGLE LIMB CROSSES.** s 960-285(4) floors
    // every year's cap at $25,000, so a total within that needs no AWOTE number; a total above it
    // needs the year's own cap. ~~and from FY2027-28 there is none, so the walk raises
    // `MissingIndexNumberError` BY NAME rather than reusing FY2026-27's figure … a plan that walked
    // before this chunk now refuses in any year after FY2026-27.~~ **Struck 2026-09-21 (P6-12): the
    // year's own cap is now DERIVED from the plan's wage growth rate beyond the published year, so
    // the $10,000-against-$130,000 case measured here walks again — against a larger cap, which is
    // the flattering direction the user ruled for.** What is refused now is a total above the
    // DERIVED cap, and the refusal says in terms that the cap it used was a forecast. Guessing a cap
    // silently is still the one thing this build will not do: the guess is the user's, it is stated
    // in their settings, and it is labelled everywhere it is spent.
    //
    // ⚠️ **THE GUARANTEE ON ITS OWN IS NEVER CHECKED, AND IT CANNOT BREACH THE CAP.** A Person who
    // states no sacrifice reaches no check at all. That is not a hole: SGAA s 10A(5)'s maximum
    // contributions base is DERIVED in this build as `floor_to_10(cap × 100 ÷ charge percentage)`,
    // so 12% of it is at most the cap itself, and an employer Guarantee alone is within the cap by
    // construction whatever the salary. The check therefore fires exactly where a breach is
    // possible: where something has been added to it.
    //
    // --- P6-9 chunk 2: THE LOW TAX CONTRIBUTIONS, OUT OF THE SAME COMPONENTS, AND CHARGED NOWHERE -
    //
    // ⚠️ **~~`division293Tax` is still called from nowhere.~~ SUPERSEDED 2026-09-20 BY CHUNK 3**,
    // which multiplies the two limbs together below: this figure is now READ, the charge is a line
    // in every month a Person is over the threshold, and the walk's notes say so. The sentence is
    // struck rather than deleted because chunk 2 was committed on it.
    //
    // **ONE components object, read twice — by the cap refusal and by the Div 293 figure.** The
    // total measured against the general cap and the total carried into Division 293 are the same
    // expression, not two honest derivations of one fact: the second copy is the defect even when
    // the two copies agree, because the day the Guarantee limb or the sacrifice clamp moves, only
    // one of them follows. `concessionalContributions` does the adding on both paths, inside
    // `lowTaxContributionsFromComponents`, so neither call site can sum the limbs its own way.
    //
    // **THE EXCESS IS NIL, AND IT IS NIL BY CONSTRUCTION RATHER THAN BY ASSUMPTION — so s 293-25(b)
    // is UNREACHABLE FROM `project()` (register O83).** The line above refuses this Household, by
    // name, whenever these same components exceed the year's general cap, and it refuses before any
    // `Month` is returned — so nothing that reaches this expression has an excess. It is exact
    // rather than conservative in both directions: s 291-20 measures the excess against the TOTAL
    // cap, which is the general cap plus any carry-forward increase and so never smaller, and a
    // Person within the general cap is within the total cap whatever their history.
    // ⚠️ **NARROWED 2026-09-23: an excess is now REACHABLE.** The refusal runs in the stated month
    // only; a year whose actual contributions go over later — pay rising under a fixed sacrifice —
    // is walked with a `'concessional cap exceeded'` note (below, after the year's accumulators),
    // and the nil here then overstates the low tax contributions by that excess. The direction is
    // the conservative one: s 293-25(b) would take the excess OUT, so Division 293 is overcharged
    // by at most 15% of it, and only for a Person also over the $250,000 threshold.
    //
    // **THE DIRECTION, since a nil that is wrong would be silent.** With the excess necessarily nil,
    // the low tax contributions equal the low tax contributed amounts exactly, so the unreachability
    // neither understates nor overstates this figure by a cent — it removes a subtraction that has
    // nothing to subtract. What it does do is hold the figure at its MAXIMUM: the subtraction only
    // ever runs downward, so if the Div 291 refusal is ever lifted and an over-cap Person is walked,
    // a build that dropped the branch would charge the second 15% on the excess as well — which
    // s 293-10 says it is not payable on. The branch is kept and unit-tested in `div293.ts` for
    // exactly that day, and the excess is passed here rather than defaulted so that the day someone
    // has one, they must say so.
    const lowTaxContributionsForTheYear: (LowTaxContributions | undefined)[] = household.persons.map(() => undefined);
    //
    // ⚠️ **WIDENED BY CHUNK 3 TO THE PERSON WHO SACRIFICES NOTHING, and that is the whole reason
    // this build can charge Division 293 at all.** Chunk 2 built the figure only where a sacrifice
    // was stated, which was enough for a limb nobody read; a Person's EMPLOYER Superannuation
    // Guarantee is a low tax contributed amount under s 293-30(1) whether or not they ever
    // sacrificed a cent, and at $260,000 of salary the Guarantee ALONE is $31,200 — more Division
    // 293 exposure than any sacrifice this build can accept, because SGAA s 10A(5)'s maximum
    // contributions base leaves a Person on that salary about $1,300 of room under the cap. A
    // charge wired only to the sacrificing Person would therefore have missed the ordinary high
    // earner entirely and charged only the rare one.
    //
    // **The CAP CHECK is not widened with it, and the asymmetry is deliberate.** The refusal is an
    // act of statement — it fires where somebody arranged something — and the paragraph above says
    // why the Guarantee alone cannot breach the cap in any case. So the check still runs exactly
    // where a sacrifice was stated this month, and the FIGURE is built for every Person who has
    // contributions at all.
    household.persons.forEach((person, index) => {
      const entryId = sacrificeStatedThisMonth[index];
      const components = concessionalComponentsOf(
        guaranteeForTheYear[index] ?? toCents(0),
        sacrificedThisMonth[index] ?? toCents(0),
      );
      // Nobody contributes anything for this Person this month: no employment, no Guarantee, no
      // arrangement. There is no s 293-30 amount, and `undefined` says that rather than a nil
      // figure saying the model looked and found none.
      if (entryId === undefined && concessionalContributions(components) <= 0) return;
      if (entryId !== undefined) {
        refuseConcessionalContributionsOverGeneralCap({
          fy,
          components,
          statedBy: `entry ${entryId} (SUPER_CONTRIBUTION), ${person.name}`,
          indexNumbers: awoteIndexNumbers,
        });
      }
      lowTaxContributionsForTheYear[index] = lowTaxContributionsFromComponents({
        fy,
        components,
        // s 293-25(b) — nil, and unreachable: see the paragraph above the loop.
        excessConcessionalContributions: toCents(0),
        // **Subdiv 293-D, 293-E and 293-F, all stated false, and that is a claim about the Person
        // rather than a convenience.** This model holds no field for a defined benefit interest, a
        // constitutionally protected fund or a Commonwealth judicial office: a `SuperInterest`
        // carries a phase and a balance. So the walk asserts what its own data type can only
        // describe — an ordinary accumulation member — and the day any of the three becomes
        // statable the `false` here becomes the field, and `div293.ts` refuses such a Person by
        // name instead of computing an ordinary s 293-25 figure for them.
        interests: ACCUMULATION_INTEREST_ONLY,
      });
    });

    household.persons.forEach((person, index) => {
      // **THE CASH IS THE SALARY ACTUALLY RECEIVED, NOT THE GROSS (P6-8 brief 2, chunk 3).** An
      // effective sacrifice is made before the income is derived, so the sacrificed dollars are
      // never paid to the employee: they are not take-home pay, and a line that reported them as
      // cash would let the Waterfall spend money the Household never held. This is the SAME
      // `assessableSalaries` the tax lines above are assessed on, read a second time rather than
      // subtracted a second time — `assessable + sacrificed === gross` is then one subtraction's
      // worth of arithmetic and the cash and the assessment cannot drift apart.
      //
      // ⚠️ **AFTER CHUNK 3 THE MONEY VANISHES, DELIBERATELY AND ONLY FOR NOW.** It leaves the pay
      // packet here and chunk 4 has not yet credited it to a superannuation interest or charged the
      // 15% contributions tax, so a Household with a sacrifice is short by the whole arrangement and
      // its wealth is UNDER-stated. That is the conservative direction and the reverse of the state
      // chunk 1 left (tax saved, cash kept, nothing contributed — better off by the whole
      // sacrifice). `SUPER_CONTRIBUTION` stays out of `OFFERED_ENTRY_TYPES` either way: an
      // incomplete forecast is not offerable because it flatters, and it is not offerable now.
      //
      // A full sacrifice leaves nothing to report and the `> 0` gate below drops the line entirely,
      // which is right — there is no pay packet — but note what follows: limb 1 is then the Age
      // Pension alone, and a Household that was funded out of wages can become unfunded.
      const monthly = monthlyFromAnnual(assessableSalaries[index] ?? toCents(0));
      // Emitted whether or not the year is computable for tax: the salary is a fact this model
      // holds, and the tax on it is a fact about a year the register may not have determined.
      if (monthly > 0) {
        lines.push(
          Object.freeze({ direction: 'inflow', effect: 'cash', description: salaryDescription(person.name), amount: monthly, provenance: UNLEGISLATED.salary, attribution: workPatternAttribution(index, NO_STATING_ENTRY.salary) }),
        );
      }
    });

    // **THIS MONTH's answer to s 160AAAA(2)(b) — "qualified for", not "receiving" — read off the
    // walk's OWN Age Pension figure and never from a second determination.** Where the month's
    // entitlement is not computable at all (outside chunk 2's parameter window) nothing qualifies,
    // which denies SAPTO and so over-states tax: the conservative direction, and it moves with the
    // Age Pension line rather than against it. The means test is included through
    // `householdRatePerFortnight > 0` — the same test `pensionerConcessionCard` uses (ADR-0003) —
    // which is conservative at exactly one boundary: a Person whose entitlement is assessed at nil
    // is "qualified for" on s 160AAAA(2)(b)'s words and is denied SAPTO here.
    // **P12-1 — the deceased is not in this month's means test, and in the year of the death they
    // are still "qualified at any time during the year" (s 160AAAA(2)(b)) if they were before it** —
    // the true-up's own reading, `year.qualified`, OR-ed over the months. The accrual takes that
    // year-to-date answer for them, so it estimates on the basis the year will be settled on.
    //
    // **LR-1 slice 3 — the SAME expression, under its own name, answers s 119-15(1)'s "receive".**
    // The two coincide only because this model qualifies a Person on a rate above nil. Div 119's
    // exemption reads `receivesAgePensionThisMonth` and never `qualifiedThisMonth`, so a later
    // widening of SAPTO's "qualified for" cannot widen the exemption with it. The deceased receives
    // nothing after the death; what they received before it is in `taxYearToDate.receivedAgePension`.
    // ⚠️ The pension is paid fortnightly in ARREARS, so an entitlement starting late in June may be
    // first received in July: at monthly granularity the year is then exempted one year early. That
    // flatters, and is bounded to the minimum tax of a year in which the pension starts in late June.
    const receivesAgePensionThisMonth = household.persons.map(
      (person, index) =>
        index !== deceasedNow &&
        entitlement !== undefined &&
        entitlement.householdRatePerFortnight > 0 &&
        entitlement.eligiblePersons.includes(person.name),
    );
    const qualifiedThisMonth = household.persons.map((_person, index) =>
      index === deceasedNow
        ? taxYearToDate !== undefined && taxYearToDate.fy === fy && taxYearToDate.qualified[index] === true
        : receivesAgePensionThisMonth[index] === true,
    );
    // The month's own view of `assessHousehold` above: THIS year, THIS month's annualised salaries,
    // THIS month's Age Pension answer, and whatever gain the caller states.
    //
    // **Interest on cash rides on every one of those assessments (2026-09-23)**, annualised from
    // THIS month's interest on the salary's own convention — a twelfth of a year assessed on the
    // income in force this month — and added to taxable income beside whatever gain the caller
    // states. Riding here rather than at each caller is what keeps a capital gain's increment
    // measured on top of the interest, and the monthly accrual and the gain's charge on one income.
    //
    // **`RENT_OUT_HOME`'s net rent rides the SAME way (P14-13)** — UNFLOORED, unlike the two means
    // tests above: a rental loss reduces this owner's other income exactly as any negatively geared
    // rental does, on the ATO's own ordinary rules (`UNLEGISLATED.rentOutHome`'s own doc).
    //
    // **LR-1 slice 3 — and the minimum tax capital gain the caller states, with s 119-15(1)'s
    // exemption read over the year TO DATE and this month.** A Person first paid the pension later in
    // the year is charged now and refunded at the July true-up, which reads the whole year.
    const assessedOn = (gains: readonly Cents[], minimumTaxCapitalGains: readonly Cents[] = NO_CAPITAL_GAIN) =>
      assessHousehold(
        fy,
        assessableSalaries,
        sacrificedThisMonth,
        gains.map((gain, index) => addCents(gain, cashInterestAnnualised[index] ?? toCents(0))),
        qualifiedThisMonth,
        [],
        rentAnnualised,
        minimumTaxCapitalGains.map((capitalGain, index) => ({
          capitalGain,
          receivedExemptPayment:
            receivesAgePensionThisMonth[index] === true ||
            (taxYearToDate !== undefined && taxYearToDate.fy === fy && taxYearToDate.receivedAgePension[index] === true),
        })),
      );

    // **THE CAPITAL-GAINS CHARGE, IN ONE FUNCTION AND ONE ACCUMULATOR — and from chunk 6 it has TWO
    // callers, which is the whole reason it is a function (P3-21f chunk 6d).**
    //
    // A Person can have two disposals in the same month by two different routes: limb 3's automatic
    // draw, decided above when the Household came up short, and a `NON_SUPER_INVESTMENT` sell the
    // user stated, applied below. s 102-5 is an ANNUAL computation over ALL of that Person's CGT
    // events, so those two must land in the SAME year's accumulator and be assessed together — and
    // `charged` must telescope, so the second call charges only the increment the first did not.
    //
    // ⚠️ **The trap this shape exists to close is a DOUBLE or an UNDER charge, and both of them look
    // plausible.** A second accumulator for the automatic path would net each route's losses only
    // against its own gains (under, or over, depending on the fixture) and would charge each route
    // from a standing start (double). A second copy of the reset-on-`fy`-change would empty the
    // accumulator twice in the first month of a year, so whichever route ran second would lose the
    // other's realisations entirely. There is one accumulator, one reset, and one place the
    // `Income tax on capital gain` line is written.
    //
    // **WHEN the gain enters the year, decided here because the tick forces a decision.** The monthly
    // `Income tax` line above is a twelfth of a whole year's assessment, so a gain put into that
    // assessment would be charged a twelfth at a time — and a gain realised in September would then
    // have only ten twelfths of its tax charged before the year ended, which under-states the year and
    // flatters the household. The two shapes on offer were:
    //
    //   (i)   *raise the whole financial year's assessment, every month of it.* Annually correct
    //         and NOT AVAILABLE: months before the disposal are already in `months`, and the
    //         only way to know a September gain in the previous July is to run the walk twice —
    //         where the second run's tax changes the cash, which changes what the portfolio must
    //         sell, which changes the gain. It would also charge tax on a gain that has not
    //         happened, which is the register's refusal to let the Waterfall spend a refund
    //         before the refund exists, read in the other direction.
    //   (ii)  **from the disposal month onward — and the disposal month carries the WHOLE of the
    //         year's increment. Chosen.** No month before the disposal carries a cent of it, no
    //         month after it carries a cent of it, and the financial year's total is exactly the
    //         tax on that year's taxable income including the gain.
    //         `test/core-non-super-gain-tax.test.mjs` pins both halves: the dollar figure in the
    //         disposal month, and every other month's `Income tax` line identical to the walk
    //         with no disposal in it.
    //
    // **Charged in FULL and at once, rather than spread over the months that remain, for two
    // reasons.** A gain is an EVENT and not a flow: annualising it would model twelve equal
    // capital gains that did not happen. And spreading dies on the calendar — a disposal on
    // 30 June has no later month in its own financial year to be spread into, so the tax would
    // simply vanish for every June sale. Charging at the event has no such boundary and needs no
    // year-end settlement to be annually correct on its own terms — P4-2's true-up settles what the
    // event-time assessment could not know (a later loss, and a salary that moved after the sale),
    // and never re-charges the gain itself.
    //
    // ⚠️ **THE LIABILITY IS STILL A LINE AGAINST THE RUNNING CASH, AND SINCE P10-4 THE SALE THAT
    // CAUSED IT IS BIG ENOUGH TO PAY IT (2026-09-21).** This block read: *"the liability is a LINE
    // against the running cash and is not grossed into the sale … a household that cannot meet it
    // reports an `Unfunded shortfall` in some later month rather than quietly selling more … it is
    // what forbids limb 3 grossing its draw up for a tax not yet owed."* What that cost was a
    // phantom shortfall of exactly the tax in every month a sale was the marginal funding —
    // **$566.10 short in a month the Household could reach $18,088,555** — and the user ruled the
    // other way. **Nothing about the CHARGE changed**: it is still one line, still in the disposal's
    // own month, still the increment on the year to date. What changed is upstream of it, at the
    // block headed *THE SALE FUNDS ITS OWN TAX*: limb 3 asks this same function what the sale will
    // be charged and sells enough to cover it. An ENTRY-driven sale is not grossed up and cannot be
    // — the user stated the amount — so the sweep below the Waterfall still has work to do.
    //
    // **The residual, stated: the salary the gain stacks on is the DISPOSAL MONTH's annualised
    // salary**, on the same convention as the monthly accrual above. For a Person who retires
    // later in the same year the marginal rate applied is the one they were on when they sold,
    // which is the higher of the two and so the conservative direction; for a Person who starts
    // work later in the year it is the lower, which is not. P4-2's true-up owns the difference.
    /**
     * **One Person's year of realisations, and what has been charged on them** — the shape of a
     * member of `capitalGains`, named so that a COPY of the array has a type. The copy is what
     * P10-4's gross-up probes against: *what would this sale be charged?* has to be answerable
     * without charging it, and a probe that ran against the live accumulator would leave a
     * hypothetical disposal's realisations in the year it never happened in.
     */
    type GainAccumulator = {
      fy: FinancialYear | undefined;
      realisations: ParcelRealisation[];
      reformed: ReformedRealisation[];
      charged: Cents;
      /** LR-1 slice 3 — the minimum tax capital gain already reflected in a charge, on `charged`'s rule. */
      minimumTaxCharged: Cents;
    };

    /** A charge, DECIDED and not yet reported: the year's net gain and the per-Person increments. */
    interface CapitalGainCharge {
      /** s 102-5 over the whole financial year to date, this disposal included. */
      readonly netGain: Cents;
      /** s 119-5 over the same realisations: nil in a year before 1 July 2027 (LR-1 slice 3). */
      readonly minimumTaxCapitalGain: Cents;
      /**
       * One member per Person whose tax ROSE, in `household.persons` order, and the amount it rose
       * by. Empty is the ordinary case. The INDEX is carried beside the name because the name is
       * what the line says and the index is what the year's accumulator is keyed by — a Household
       * may hold two Persons of the same name, and a lookup by name would charge one of them twice.
       */
      readonly increments: readonly {
        readonly personIndex: number;
        readonly name: string;
        readonly amount: Cents;
        /** Whether this Person's raised assessment carries a Div 119 gap: the line says so. */
        readonly minimumTax: boolean;
      }[];
      /** The assessment the increments were subtracted out of, for the line's stamp. */
      readonly provenance: ReturnType<typeof assessedOn>['provenance'] | undefined;
      /** A year from 1 July 2027, whose gain is indexed on the plan's FORECAST cpi (LR-1 slice 2). */
      readonly indexedOnForecastCpi: boolean;
    }

    /** `Σ increment` — what the Household is actually charged for one disposal, in one expression. */
    const chargedTotal = (charge: CapitalGainCharge | undefined): Cents =>
      (charge?.increments ?? []).reduce<number>((total, each) => total + each.amount, 0) as Cents;

    /**
     * **THE CHARGE, DECIDED — against a stated accumulator, which is the live one or a copy of it
     * (P10-4).** Everything below the divider that was one function is now two, split on exactly
     * one seam: this half DECIDES what a disposal adds to the year's assessment and mutates only the
     * accumulator it was handed; `reportCapitalGainCharge` below writes the lines and the year's
     * totals. The split exists so that the gross-up and the charge are **one expression asked twice**
     * — the figure limb 3 sells to cover is the figure this walk goes on to charge, by construction,
     * and not a second estimate of it.
     *
     * `undefined` means *no charge was decided at all*: no such Person, or a financial year this
     * build's tax parameters do not cover. It is distinct from a charge of nil, which is a year whose
     * net gain has not risen above what is already charged — a later loss, most often — and which
     * still has a `netGain` the year-end true-up must see.
     */
    const assessCapitalGainCharge = (
      state: readonly GainAccumulator[],
      personIndex: number,
      realisations: readonly ParcelRealisation[],
      disposedOn: IsoDate,
    ): CapitalGainCharge | undefined => {
      const gains = state[personIndex];
      if (gains === undefined) return undefined;
      if (gains.fy !== fy) {
        gains.fy = fy;
        gains.realisations = [];
        gains.reformed = [];
        gains.charged = toCents(0);
        gains.minimumTaxCharged = toCents(0);
      }
      // **LR-1 slice 2: from 1 July 2027 the split and the new s 102-5(1) decide the gain.** Each
      // realisation is split on its own disposal day, with the indexation factor forecast on this
      // plan's `cpi` (`cgtIndexationFactor`: every quarter it can need is a forecast).
      const reform = disposedOn >= CGT_REFORM_START;
      if (reform) {
        gains.reformed.push(...realisations.map((realisation) => realisationFromJuly2027(realisation, disposedOn, settings.economicSeries.cpi)));
      } else {
        gains.realisations.push(...realisations);
      }
      // s 102-5 over the whole financial year to date — NOT `disposal.discountedGain`, which is
      // a sum of per-parcel discounted gains and is a different, lower number wherever a loss is
      // in the set. See `netCapitalGain`.
      const reformed = reform ? netCapitalGainFromJuly2027(gains.reformed) : undefined;
      const netGain = reformed === undefined ? netCapitalGain(gains.realisations) : reformed.netGain;
      // **LR-1 slice 3 — Div 119's base rides beside the net gain, on the same telescoping rule.**
      // It can rise while the net gain does not (a deferred loss absorbs a deferred gain and leaves a
      // later gain whole), so either rising is a charge. Each is held at the most yet charged, so the
      // assessment is never lowered at an event; the July true-up settles the year's final figures.
      const minimumTaxCapitalGain = reformed === undefined ? toCents(0) : reformed.minimumTaxCapitalGain;
      if (!taxParametersCover(fy)) return undefined;
      if (netGain <= gains.charged && minimumTaxCapitalGain <= gains.minimumTaxCharged) {
        return { netGain, minimumTaxCapitalGain, increments: [], provenance: undefined, indexedOnForecastCpi: reform };
      }
      const before = state.map((held) => held.charged);
      const minimumBefore = state.map((held) => held.minimumTaxCharged);
      const after = before.map((charged, index) => (index === personIndex && netGain > charged ? netGain : charged));
      const minimumAfter = minimumBefore.map((charged, index) =>
        index === personIndex && minimumTaxCapitalGain > charged ? minimumTaxCapitalGain : charged,
      );
      const raised = assessedOn(after, minimumAfter);
      const unraised = assessedOn(before, minimumBefore);
      gains.charged = after[personIndex] as Cents;
      gains.minimumTaxCharged = minimumAfter[personIndex] as Cents;
      // **One increment per Person, not one for the seller**, and that is the Act rather than a
      // convenience: the family Medicare levy reads the other Person's taxable income and SAPTO
      // reads the couple's combined Rebate Income, so one Person's capital gain can move the
      // OTHER Person's tax. `householdIncomeTax` is called for the Household for exactly that
      // reason, and the difference is reported the same way.
      //
      // **Only a POSITIVE increment survives, and P4-2 is what makes that safe.** The register
      // forbids the walk spending a refund before it exists, so a NEGATIVE increment — a loss
      // realised after a charge in the same year, or one Person's gain LOWERING the other's
      // assessment through the family levy or SAPTO — is not paid out at the event. It is not
      // dropped either, and that is what changed in P4-2: the year's `charged` total and the year's
      // final net capital gain both go into `taxYearToDate`, so the over-charge comes back in the
      // following JULY as a true-up, once the year it belongs to has actually ended. ⚠️ **In a
      // first, PARTIAL financial year there is no true-up (chunk 3b's refusal), so there the
      // over-charge still stands** — the conservative direction, stated rather than closed.
      const increments: CapitalGainCharge['increments'][number][] = [];
      raised.persons.forEach((result, index) => {
        const increment = subCents(result.netTax, unraised.persons[index]?.netTax ?? toCents(0));
        if (increment > 0) increments.push({ personIndex: index, name: result.name, amount: increment, minimumTax: result.minimumTaxGap > 0 });
      });
      return { netGain, minimumTaxCapitalGain, increments, provenance: raised.provenance, indexedOnForecastCpi: reform };
    };

    /**
     * **THE CHARGE, REPORTED** — the year's accumulator updated and one `Income tax on capital gain`
     * line per Person whose tax rose. The other half of `assessCapitalGainCharge`, and the ONLY
     * caller that writes anything outside the gains accumulator, so a probe cannot emit a line.
     *
     * **P4-2 — the tax CHARGED on the gain goes into the year's accumulator too**, so that the
     * true-up reconciles against ONE figure covering both kinds of income tax: twelve monthly
     * accruals and every increment charged at a disposal. `taxYearToDate` is the month's own year
     * here and cannot be undefined — chunk 3b runs earlier in the same month and initialises it,
     * and no disposal happens outside a month.
     *
     * **The year's net capital gain is recorded BEFORE the increments, and that is what closes the
     * never-refunded loss (P4-2).** A charge of nil still carries a `netGain`, which is exactly the
     * case a later loss creates; recording the figure only where something was charged would leave
     * the year's accumulator holding the gain as it stood at the last CHARGE rather than as it
     * stands at the year's end, and the true-up would reconcile against a gain the taxpayer no
     * longer has.
     */
    const reportCapitalGainCharge = (personIndex: number, charge: CapitalGainCharge | undefined): void => {
      if (charge === undefined) return;
      const year = taxYearToDate;
      if (year !== undefined && year.fy === fy) {
        year.gain[personIndex] = charge.netGain;
        year.minimumTaxCapitalGain[personIndex] = charge.minimumTaxCapitalGain;
      }
      charge.increments.forEach((increment) => {
        if (year !== undefined && year.fy === fy) {
          year.accrued[increment.personIndex] = addCents(year.accrued[increment.personIndex] ?? toCents(0), increment.amount);
        }
        lines.push(
          Object.freeze({
            direction: 'outflow',
            effect: 'cash',
            description: capitalGainsTaxDescription(increment.name),
            amount: increment.amount,
            // The SAME assessment the increment was subtracted out of, so the stamp and the
            // caveats belong to the arithmetic that produced this figure and not to a second read.
            provenance: taxProvenance('income tax on capital gain', charge.provenance!, [
              `charged as the increment one disposal added to the year's assessment`,
              ...(charge.indexedOnForecastCpi ? [CGT_INDEXATION_FORECAST_DETERMINATION] : []),
              ...(increment.minimumTax ? [CGT_MINIMUM_TAX_DETERMINATION] : []),
            ]),
            attribution: UNATTRIBUTED.capitalGainsTax,
          }),
        );
      });
    };

    /** The two halves above, run one after the other on the LIVE accumulator: the ordinary path. */
    const chargeCapitalGain = (personIndex: number, realisations: readonly ParcelRealisation[], disposedOn: IsoDate): void => {
      reportCapitalGainCharge(personIndex, assessCapitalGainCharge(capitalGains, personIndex, realisations, disposedOn));
    };

    // This month's accrual, per Person and in `household.persons` order — nil for every Person in a
    // year the parameters do not cover, where no tax line is emitted at all.
    const accruedThisMonth = household.persons.map(() => toCents(0));
    // **And the year the scale does not reach says so (P4-4's polish)** — one note, from the same
    // boolean the accrual is decided by, and its text states the direction: an unassessed year is
    // tax the Household keeps, which is the flattering absence and the one a reader must not
    // mistake for a nil liability.
    const taxComputable = taxParametersCover(fy);
    if (!taxComputable) notes.push(PARAMETER_WINDOW_NOTES['income tax']);
    if (taxComputable) {
      const tax = assessedOn(NO_CAPITAL_GAIN);
      tax.persons.forEach((result, index) => {
        const monthly = monthlyFromAnnual(result.netTax);
        accruedThisMonth[index] = monthly;
        // Only a positive figure becomes a line, on chunk 2's rule: `MonthLine.amount` is specified
        // as always positive, and a nil liability is a fact about the assessment rather than a
        // payment of nothing. `netTax` is tax after offsets PLUS the Medicare levy — the figure the
        // household actually parts with, not the s 4-10(3) step 2 liability.
        if (monthly > 0) {
          lines.push(
            Object.freeze({
              direction: 'outflow',
              effect: 'cash',
              description: incomeTaxDescription(result.name),
              amount: monthly,
              // A twelfth of a full year's tax on the salary in force THIS month, under THIS year's
              // rules — chunk 3's stated accrual shape, said on the line so a reader is not left to
              // infer it from a monthly figure that is not a monthly assessment.
              provenance: taxProvenance('income tax', tax.provenance, [
                'a twelfth of a full year assessed on the salary in force this month',
              ]),
              // Assessed on the salary line's own figure and on no other income, so it carries the
              // salary line's own attribution.
              attribution: workPatternAttribution(index, NO_STATING_ENTRY.incomeTax),
            }),
          );
        }
      });
    }

    // --- P6-9 CHUNK 3: THE SECOND 15%, CHARGED — the last flattering gap in this feature ---------
    //
    // `division293Tax` has existed since P3-5 and was called from nowhere: chunk 1 built the
    // s 293-20(1)(a) income base, chunk 2 built the s 293-20(1)(b) low tax contributions, and every
    // note this walk emitted said in terms that the further 15% was not charged. **It is charged
    // here.** A Person over the $250,000 threshold was taxed at 15% on their concessional
    // contributions where the law charges 30%, which OVERSTATED their wealth — the one gap in this
    // feature that ran in the flattering direction (register O77).
    //
    // **THE TAPER, and it is the whole of what this call must get right.** s 293-20(1) charges 15%
    // of the LESSER of the low tax contributions and the amount by which the SUM of the two limbs
    // exceeds $250,000 — never 15% of the contributions as a whole once the threshold is crossed.
    // Both limbs really bind in this walk and the difference is money: a Person on $260,000 has
    // $259,000 of base and $31,200 of Guarantee, so the excess is $40,200 and the CONTRIBUTIONS
    // bind at $4,680 of tax; a Person on $231,400 has $230,400 and $27,768, so the EXCESS binds at
    // $8,168 and the tax is $1,225.20 where a cliff would charge $4,165.20. `div293.ts` owns the
    // `min` and reports which limb bound; nothing here re-derives it.
    //
    // **A TWELFTH A MONTH, on the state in force this month, settled when the year ends — the
    // `Income tax` line's shape, for the `Income tax` line's reason.** Both limbs of s 293-20(1)
    // are ANNUAL quantities this walk holds a monthly view of: the income base is assessed on the
    // annualised salary in force this month, and the contributions are the year's Guarantee and
    // arrangement as they stand this month. Charging the whole year's tax in the month the Person
    // crosses the threshold would put a $4,680 line in one month of a salary that never moved; the
    // true-up below settles the difference between twelve monthly views and the year's own.
    //
    // ⚠️ **NO CHARGE AT A DISPOSAL, and that is a DEPARTURE from the income-tax lines above.** A net
    // capital gain is in taxable income and therefore in the s 293-20(1)(a) base, so a large gain
    // can push a Person over the threshold or deepen an excess — and the monthly accrual assesses
    // nil gains, exactly as the monthly income-tax accrual does. Income tax charges the increment at
    // the disposal because a gain is an event; Division 293 does NOT, because the increment it would
    // charge is capped by the low tax contributions and is therefore bounded by the year's
    // contributions, and the settlement below assesses the year on `completed.gain` and collects it
    // in the following July. **The direction is stated: the charge on a gain is DEFERRED to the
    // true-up, never dropped — and in a first, partial financial year there is no true-up, so there
    // it IS dropped and the Household keeps it.** That is the same hole chunk 3b's refusal already
    // owns for income tax, and it is the flattering direction.
    //
    // **WHO PAYS: the individual, out of cash.** The line is an ordinary `cash` outflow, so it
    // reduces what the Waterfall has to spend exactly as income tax does. ITAA 1997 Subdiv 293-B's
    // election to release the amount from the superannuation interest instead is NOT modelled
    // (register O84) and the determination on every line says so, because a reader cannot recover
    // from a dollar figure which of the two treatments produced it.
    const div293AccruedThisMonth = household.persons.map(() => toCents(0));
    /**
     * **P6-10 M3 — the release authorities served in THIS month, queued between the line and the
     * debit.** The `DIVISION_293_RELEASE_LINE` is written in the year-end settlement below, and the
     * interest it names is debited at the very END of the tick, beside the two contribution
     * credits — after this month's growth, on the same convention. So the two halves of one change
     * are separated by the whole of the month's Waterfall, and this array is what carries the
     * figure between them. **It is written once and read once**: nothing recomputes the amount, so
     * the line on screen and the cents the balance moves by cannot drift apart.
     */
    const div293ReleasesThisMonth: {
      readonly person: Person;
      readonly personIndex: number;
      readonly slot: number;
      readonly amount: Cents;
      readonly fy: string;
    }[] = [];
    if (taxComputable) {
      // The same year, salaries, sacrifice and gains the monthly income-tax accrual was assessed on
      // — `NO_CAPITAL_GAIN` included, for the reason above.
      // Interest on cash is taxable income and so in the s 293-20(1)(a) base, annualised as the
      // income-tax accrual annualises it. `RENT_OUT_HOME`'s net rent joins the base too (P14-13),
      // through the SAME `otherIncomes` channel `assessedOn` uses — never folded into `gains`,
      // `asSaptoPerson`'s own reason (a loss would break s 102-5's non-negative capital gain).
      const bases = div293IncomesOn(fy, assessableSalaries, sacrificedThisMonth, cashInterestAnnualised, qualifiedThisMonth, rentAnnualised);
      household.persons.forEach((person, index) => {
        const contributions = lowTaxContributionsForTheYear[index];
        const base = bases[index];
        // No contributions at all this month, so there is no s 293-20(1)(b) limb and no charge.
        // A Person with contributions and an income under the threshold DOES reach the call below
        // and is assessed at nil by the taper itself — the threshold test belongs to `div293.ts`
        // and is not spelled a second time here.
        if (contributions === undefined || base === undefined) return;
        const assessment = division293Tax({ fy, income: base, lowTaxContributions: contributions });
        const monthly = monthlyFromAnnual(assessment.tax);
        div293AccruedThisMonth[index] = monthly;
        if (monthly > 0) {
          lines.push(
            Object.freeze({
              direction: 'outflow',
              effect: 'cash',
              description: division293Description(person.name),
              amount: monthly,
              provenance: taxProvenance('Division 293 tax', assessment.provenance, [
                'a twelfth of a full year charged on the Division 293 income and low tax contributions in force this month',
                // **Which limb of the taper bound, in the register's own terms** — the
                // `determination` field's whole purpose, and the one fact a reader cannot recover
                // from the dollar figure. `binding` is `div293.ts`'s own answer, not a second read.
                `the ${assessment.binding} limb bound: 15% of ${assessment.taxableContributions} cents, being the lesser of ${assessment.lowTaxContributions.amount} cents of low tax contributions and the ${assessment.excess} cents by which ${assessment.sum} exceeds the ${assessment.threshold} cent threshold`,
                // **PROVISIONAL, and it says so — the sentence that stood here said the election
                // was NOT MODELLED and stopped being true at P6-10 M3.** The accrual is taken in
                // cash from EVERY Person, electing or not, because the amount a release authority
                // can name is the YEAR's assessed liability and no monthly figure is that.
                'PAID BY THE INDIVIDUAL OUT OF CASH, AND THIS ACCRUAL IS PROVISIONAL FOR EVERY PERSON: the ITAA 1997 Subdiv 293-B election to have the amount released from a superannuation interest instead is performed at the YEAR-END SETTLEMENT (P6-10 M3, register O84), where an electing Person has every cent of this line refunded and the year’s assessed liability debited to the interest they nominated. In a FIRST or LAST PARTIAL financial year there is no settlement, so this cash treatment stands there even for a Person who elected',
              ]),
              attribution: workPatternAttribution(index, NO_STATING_ENTRY.division293Tax),
            }),
          );
        }
      });
    }

    // --- Chunk 3b: THE YEAR-END TRUE-UP — P4-2, and it is the settlement chunk 3 deliberately left
    // --- undone --------------------------------------------------------------------------------
    //
    // Chunk 3 accrues monthly on the month's own state and reconciles against nothing. This settles
    // it: when the walk LEAVES a financial year, the year it left is assessed ONCE, on the salary
    // that Person actually received in it and the net capital gain they actually realised in it, and
    // the difference against everything already charged becomes a `MonthLine` in either direction.
    // There is one assessment function (`assessHousehold`), so the true-up is the same law the
    // accrual is, read over a year instead of a month.
    //
    // ⚠️ **THE DIRECTION OF THE RESIDUAL WAS STATED WRONGLY UNTIL P4-2, AND IT IS CORRECTED ABOVE.**
    // The superseded claim — that the monthly residual ALWAYS over-states tax — is quoted and
    // refuted in chunk 3's own header. The scale is NOT convex throughout: LITO's 1.5c taper ENDS
    // at a taxable income of $66,667, so the marginal rate FALLS there, and the Medicare levy's
    // family shade-in flattens above the family threshold. Both are concave corners and both
    // UNDER-charge. That is the half of this that cannot be waved through as conservative, and it is
    // the reason this item was built rather than deferred again.
    //
    // **WHICH MONTH CARRIES IT: JULY, the first month of the NEXT year, for a refund and for an
    // amount owed alike.** A refund of over-accrued tax does not exist on 30 June — the year has not
    // ended, no assessment has been made, and the register forbids the Waterfall spending a refund
    // before the refund exists (the same rule that forbids charging a September gain in the previous
    // July). An amount OWED settles on the same convention rather than the opposite one, because the
    // convention is about WHEN THE YEAR CAN BE ASSESSED and not about which way the money moves; a
    // liability put in June would be a liability computed from months that had not happened when the
    // month it lands in was walked. Both therefore land in the month the walk first reads under the
    // new year's date, which is the month this block runs in.
    //
    // **THE FIRST, PARTIAL FINANCIAL YEAR IS REFUSED, and it is a refusal rather than a rounding.**
    // A walk beginning at `asAtDate` enters its first financial year part-way through, and this
    // model holds nothing at all about the months before it: no salary, no deduction, no realised
    // gain. Assessing those months as though they were nil would invent a year's income, and
    // assessing the part-year as a whole year would invent a rate scale. So the true-up requires the
    // walk to have seen ALL TWELVE of the year's months — the same shape of refusal as chunk 5b's
    // Sch 7 1-July rule, which will not read a 1 August balance as a 1 July one. The consequences
    // are stated because they are real: a mid-year salary change in the first part-year is never
    // settled, and neither is a capital loss realised after a charge in it. The direction is the
    // conservative one in the ordinary case (the accrual over-charges, and the over-charge stands).
    //
    // A year the walk leaves through its own LAST month needs no rule: the walk never enters the
    // following year, so this block never runs for it, and the final part-year is unsettled for the
    // same reason the first one is.
    if (taxYearToDate !== undefined && taxYearToDate.fy !== fy) {
      const completed = taxYearToDate;
      taxYearToDate = undefined;
      if (completed.months === MONTHS_IN_A_FINANCIAL_YEAR && taxParametersCover(completed.fy)) {
        // **s 160AAAA(2)(b) over a YEAR: qualified in ANY month of it.** The Act asks whether the
        // Person was qualified for the pension during the YEAR OF INCOME, so a Person qualified in
        // one month of it was; the monthly accrual's month-by-month answer is a within-year proxy
        // for that question and not a second reading of it. The alternative readings — the state on
        // 30 June, or qualified in every month — differ only for a Person who LOSES qualification
        // part-way through a year, and both would deny an offset the year's own words allow. The
        // direction is stated: this is the reading that grants SAPTO in a transition year, so where
        // it is wrong it under-states tax.
        //
        // **P3-22h step 2 — the year's distribution joins the year's gain HERE, at the settlement,
        // and nowhere upstream.** `assessHousehold`'s `gains` parameter is added, undiscounted, onto
        // taxable income (`taxableIncomeWithNetCapitalGain`) with no separate schedule of its own —
        // exactly the ordinary-income treatment a distribution needs, and exactly why the CGT
        // discount already folded into `completed.gain` is untouched by this addition: the two
        // figures are summed, never blended, so neither the capital gain's own discount nor a
        // (nonexistent) discount on the distribution is applied twice or to the wrong figure. A
        // Person with no distribution this year keeps `completed.gain` byte-identical, unchanged.
        //
        // **Interest on cash joins it the same way (2026-09-23)**: the year's actual interest per
        // owner, ordinary assessable income, summed onto the figure and never blended into the gain.
        // **`RENT_OUT_HOME`'s net rent does NOT join this figure (P14-13)** — it can be negative (a
        // rental loss), and `distributedGains` feeds `taxableIncomeWithNetCapitalGain`'s `gain`
        // argument below, which refuses a negative value (s 102-5). It rides the settlement's
        // `assessHousehold` call the SAME way the monthly accrual does instead — `otherIncomes`,
        // `asSaptoPerson`'s own new parameter, applied AFTER this figure and re-floored at nil.
        const distributedGains = completed.gain.map((gain, index) =>
          addCents(addCents(gain, completed.distributed[index] ?? toCents(0)), completed.cashInterest[index] ?? toCents(0)));

        // --- P3-22h step 3 — THE CREDIT ON A STATED SHARE OF THE YEAR'S DISTRIBUTION ---------------
        //
        // **Absent `Settings.investmentPayoutFrankedShare` ⇒ `frankingCredit` is nil for every
        // Person and `distributedGains` below is untouched — byte-identical to step 2's own,
        // credit-free figure**, which is the zero-regression anchor
        // `test/core-investment-distribution.test.mjs` and `test/app-settings-panel.test.mjs` both
        // pin. `frankingForIndividual` is called once per Person who has a distribution this year,
        // for its own `offset` — s 207-20(2)'s credit, unconditionally refundable (T46) — and its
        // provenance; it is NOT what raises the year's assessed tax. That is done by folding the
        // credit into `distributedGains` itself, alongside the gain and the raw distribution,
        // BEFORE the ONE `assessHousehold` call below — the same call every other tax effect in
        // this settlement already goes through — so a couple's family Medicare levy and combined
        // SAPTO Rebate Income see the credit exactly once, on the SAME figure, and the OTHER
        // Person's spillover (register O27/T46's own finding, `individualFranking.ts`'s header)
        // needs no code of its own: it falls out of `householdIncomeTax`'s own family-level
        // arithmetic and is reported on THEIR OWN `TAX_TRUE_UP_LINE`, exactly as the brief asks.
        const frankingCredit: Cents[] = completed.gain.map(() => toCents(0));
        const frankingOffset: Cents[] = completed.gain.map(() => toCents(0));
        if (settings.investmentPayoutFrankedShare !== undefined) {
          const frankedShare = settings.investmentPayoutFrankedShare;
          // The SAME two expressions the local `asSaptoPerson` above builds a Person's own
          // assessment from, called again on the SAME inputs — not a second fact, the same one.
          // The baseline is every income but the distribution: salary, the gain, interest on cash and
          // net rent — the last of those applied AFTER and re-floored, `asSaptoPerson`'s own reason
          // (a loss cannot reach `taxableIncomeWithNetCapitalGain`'s `gain` argument).
          const baselineTaxableIncome = (index: number): TaxableIncome =>
            taxableIncome(
              Math.max(
                0,
                taxableIncomeWithNetCapitalGain(
                  taxableIncomeFromSalary(completed.fy, completed.salary[index] ?? toCents(0), REDUCER_DEDUCTIONS),
                  addCents(completed.gain[index] ?? toCents(0), completed.cashInterest[index] ?? toCents(0)),
                ) + (completed.rent[index] ?? toCents(0)),
              ) as Cents,
            );
          const rebateIncomeAddBacksOf = (index: number) => ({
            reportableSuperContributions: reportableSuperannuationContributions({
              salarySacrificed: completed.sacrificed[index] ?? toCents(0),
              otherReportableEmployerContributions: toCents(0),
              personalDeductible: personalDeductibleContributions(toCents(0), { noticeOfIntentAcknowledged: false }),
              excessConcessionalContributions: toCents(0),
            }),
            totalNetInvestmentLoss: toCents(0),
            adjustedFringeBenefitsTotal: toCents(0),
            assessableFhssReleasedAmounts: toCents(0),
          });
          const frankingPersons = household.persons.map((person, index) => ({
            name: person.name,
            taxableIncome: baselineTaxableIncome(index),
            rebateIncomeAddBacks: rebateIncomeAddBacksOf(index),
            qualifiedForAgePension: completed.qualified[index] === true,
            netLabourIncome: netLabourIncomeFromSalary(completed.fy, completed.salary[index] ?? toCents(0), REDUCER_DEDUCTIONS),
          }));
          const [frankingPersonA, frankingPersonB] = frankingPersons;
          if (frankingPersonA === undefined) throw new RangeError('a Household has at least one Person');
          household.persons.forEach((person, personIndex) => {
            const distributed = completed.distributed[personIndex] ?? toCents(0);
            if (distributed <= 0) return;
            const distribution = frankedDistributionFromShare({
              fy: completed.fy,
              distribution: distributed,
              frankedShare,
              source: portfolioPayoutFrankingSource(person.name),
              confidence: 'unverified',
            });
            if (distribution.frankingCredit <= 0) return;
            frankingCredit[personIndex] = distribution.frankingCredit;
            const outcome = frankingForIndividual({
              fy: completed.fy,
              relationship,
              persons: frankingPersonB === undefined ? [frankingPersonA] : [frankingPersonA, frankingPersonB],
              recipient: personIndex as 0 | 1,
              distribution,
              // §5A.4's 45-day holding rule is P3-22e's assumption, unchanged here: the qualifying
              // year's total is this ONE distribution's own credit, because this model's portfolio
              // pays out once a year and nothing else in the walk carries a franking credit.
              facts: qualifiedResidentIndividual(distribution.frankingCredit),
            });
            frankingOffset[personIndex] = outcome.offset;
          });
        }
        const assessed = assessHousehold(
          completed.fy,
          completed.salary,
          completed.sacrificed,
          distributedGains.map((gain, index) => addCents(gain, frankingCredit[index] ?? toCents(0))),
          completed.qualified,
          completed.spouseContributionsMade,
          completed.rent,
          // **LR-1 slice 3 — Div 119 on the year's final figures**, and s 119-15(1) on the WHOLE
          // year: a Person paid the Age Pension in any month of it is exempt for all of it, so a
          // minimum tax charged at a sale before the pension started comes back here.
          completed.minimumTaxCapitalGain.map((capitalGain, index) => ({
            capitalGain,
            receivedExemptPayment: completed.receivedAgePension[index] === true,
          })),
        );
        assessed.persons.forEach((result, index) => {
          // Positive: the year was OVER-accrued and the excess comes back. Negative: it was
          // UNDER-accrued and the balance is owed. One subtraction, one sign, and the two lines
          // differ only in `direction` — `MonthLine.amount` is specified as always positive, so the
          // magnitude is what is reported and the sign is carried by the field that carries signs.
          // **The credit is added back here, UNCONDITIONALLY** — s 63-10(1) item 40, T46: excess
          // franking credits are refunded in cash with no floor, so the offset is never clamped
          // against this Person's own liability the way LITO/SAPTO/WATO are inside `incomeTax.ts`.
          const gap = addCents(
            subCents(completed.accrued[index] ?? toCents(0), result.netTax),
            frankingOffset[index] ?? toCents(0),
          );
          // **THE DE-MINIMIS CONVENTION, DECLARED: a gap under one dollar is not settled.** It is a
          // stated convention and not a discovered fact. `monthlyFromAnnual` rounds a twelfth to the
          // cent, so twelve of them need not sum to the annual figure they came from: a Person whose
          // pay never moved all year has a gap of a few cents that is ARITHMETIC RESIDUE and not a
          // reconciliation, and settling it would put a four-cent line in every June-to-July of
          // every flat-salary walk forever. The threshold is one dollar because twelve roundings
          // cannot exceed six cents, so a dollar is two orders of magnitude clear of the residue it
          // is there to absorb and far below any gap a real change of income produces. The
          // suppressed cents are NOT carried forward — they are dropped, in whichever direction they
          // fall, and a walk's lifetime total is therefore out by up to a dollar a year per Person.
          if (Math.abs(gap) < TRUE_UP_DE_MINIMIS) return;
          lines.push(
            Object.freeze({
              direction: gap > 0 ? 'inflow' : 'outflow',
              effect: 'cash',
              description: taxTrueUpDescription(result.name, completed.fy),
              amount: Math.abs(gap) as Cents,
              // **`assessed.provenance.fy` is `completed.fy` and NOT the month's own year** — this
              // line lands in July and is assessed under the year that ended in June. A stamp taken
              // from `fy` here would put the new year's name on the old year's rate scale.
              provenance: taxProvenance('income tax year-end true-up', assessed.provenance, [
                `assessed once on the twelve months of FY${completed.fy}`,
              ]),
              attribution: UNATTRIBUTED.taxTrueUp,
            }),
          );
        });

        // --- P6-9 chunk 3: THE SAME SETTLEMENT FOR THE SECOND 15% ------------------------------
        //
        // Every convention above is taken unchanged — the completed year assessed ONCE, in the
        // JULY after it ended, under its own parameters, in either direction, with gaps under
        // `TRUE_UP_DE_MINIMIS` dropped — because the question is the same question. What differs is
        // only what is assessed: the year's OWN s 293-20(1)(a) base (which is where a capital gain
        // the monthly accrual never saw arrives — and, from P3-22h step 2, where a non-super
        // distribution does too, through the SAME `distributedGains` the income-tax settlement above
        // computed, because s 293-20(1)(a) income is taxable income and a distribution IS assessable
        // income before any deduction touches it) and the year's OWN s 291-25 limbs.
        //
        // **It is a SEPARATE line and not a term in the income-tax gap.** Netting a Division 293
        // under-accrual against an income-tax refund would report one figure that is neither tax,
        // under one register stamp that would be wrong for half of it.
        //
        // ⚠️ **THE EXCESS IS NIL HERE TOO, AND HERE IT IS AN ASSUMPTION RATHER THAN A CONSTRUCTION
        // — this is the one place the two differ.** The cap refusal is an act of STATEMENT: it
        // tests the sacrifice plus the Guarantee in force in the month the arrangement is stated,
        // so a Person whose SALARY later rises within the same year can end the year with a
        // Guarantee, and therefore a concessional total, above the cap that was tested. A nil
        // excess then over-states the low tax contributions by the amount s 293-25(b) would have
        // subtracted, and so OVER-charges Division 293 — the conservative direction, and the same
        // direction the unreachable branch above runs in. It is stated rather than defaulted for
        // exactly this reason (register O83).
        const settledBases = div293IncomesOn(completed.fy, completed.salary, completed.sacrificed, distributedGains, completed.qualified, completed.rent);
        household.persons.forEach((person, index) => {
          // **P6-10 M3 — WHICH POCKET, resolved ONCE A YEAR and BEFORE the figures.** It is read
          // here rather than beside the debit because the two illegal shapes (a mark on a
          // retirement-phase interest, two marked interests) must refuse for a Person whose
          // liability is nil as well as for one whose is not: a plan that names a pension as the
          // release destination is wrong whether or not this year happened to charge anything, and
          // a refusal that only fires when money moves is a refusal nobody meets until it costs
          // them. The in-memory `project()` caller never passed the door (O81), so this IS the
          // check for them.
          const release = division293ReleaseDestination(person);
          const base = settledBases[index];
          if (base === undefined) return;
          const contributions = lowTaxContributionsFromComponents({
            fy: completed.fy,
            // The year's OWN limbs, through the one helper the monthly figure and the cap check
            // also read, so the settlement cannot come to hold a different view of what a
            // concessional contribution is than the accrual it is settling.
            components: concessionalComponentsOf(completed.guarantee[index] ?? toCents(0), completed.sacrificed[index] ?? toCents(0)),
            excessConcessionalContributions: toCents(0),
            interests: ACCUMULATION_INTEREST_ONLY,
          });
          const settled = division293Tax({ fy: completed.fy, income: base, lowTaxContributions: contributions });
          const accrued = completed.div293Accrued[index] ?? toCents(0);

          // --- P6-10 M3: THE SUBDIV 293-B ELECTION, PERFORMED -------------------------------
          //
          // **This is the ONLY place in the walk where which pocket pays is decided, and it is a
          // WHOLE-YEAR decision.** The monthly accrual above took the charge in cash from
          // everybody, because the amount a release authority can name is the year's assessed
          // liability and nothing monthly is that. So for an electing Person the year is settled in
          // two movements rather than by a residual: every cent accrued comes BACK as cash, and the
          // whole settled liability goes OUT of the nominated interest. The two are written as two
          // lines and not netted, because they are movements of different KINDS — one is the
          // Household's own money returning to its own account, the other is a fund paying the
          // Commissioner — and a net figure would be neither.
          //
          // **No `DIVISION_293_TRUE_UP_LINE` is written for them.** That line reports the residual
          // of a cash settlement, and for this Person the cash settlement is reversed in full.
          //
          // **No de-minimis applies to either line.** `TRUE_UP_DE_MINIMIS` exists to absorb the
          // rounding residue of twelve twelfths against one annual figure; neither amount here is a
          // residue. Both are the full amounts, and suppressing a 40-cent refund would leave the
          // Person paying in cash a liability this walk simultaneously took out of their fund.
          if (release.election === 'released') {
            if (accrued > 0) {
              lines.push(
                Object.freeze({
                  direction: 'inflow',
                  effect: 'cash',
                  description: division293ReleaseRefundDescription(person.name, completed.fy),
                  amount: accrued,
                  provenance: taxProvenance('Division 293 tax year-end true-up', settled.provenance, [
                    division293RefundedInFullDetermination(person.name, completed.fy),
                    division293AccrualUndoneDetermination(person.name, release.slot),
                  ]),
                  attribution: UNATTRIBUTED.division293TrueUp,
                }),
              );
            }
            if (settled.tax > 0) {
              lines.push(
                Object.freeze({
                  direction: 'outflow',
                  effect: 'wealth',
                  description: division293ReleaseDescription(person.name, completed.fy),
                  amount: settled.tax,
                  provenance: taxProvenance('Division 293 tax year-end true-up', settled.provenance, [
                    `assessed once on the twelve months of FY${completed.fy}`,
                    `the ${settled.binding ?? 'no'} limb bound: 15% of ${settled.taxableContributions} cents`,
                    division293PaidByFundDetermination(person.name, release.slot),
                  ]),
                  attribution: UNATTRIBUTED.division293TrueUp,
                }),
              );
              div293ReleasesThisMonth.push({ person, personIndex: index, slot: release.slot, amount: settled.tax, fy: completed.fy });
            }
            return;
          }

          // Positive: OVER-accrued, and the excess comes back. Negative: owed. One subtraction, one
          // sign, `MonthLine.amount` always positive — `TAX_TRUE_UP_LINE`'s rule, unchanged.
          const gap = subCents(accrued, settled.tax);
          if (Math.abs(gap) < TRUE_UP_DE_MINIMIS) return;
          lines.push(
            Object.freeze({
              direction: gap > 0 ? 'inflow' : 'outflow',
              effect: 'cash',
              description: division293TrueUpDescription(person.name, completed.fy),
              amount: Math.abs(gap) as Cents,
              provenance: taxProvenance('Division 293 tax year-end true-up', settled.provenance, [
                `assessed once on the twelve months of FY${completed.fy}`,
                `the ${settled.binding ?? 'no'} limb bound: 15% of ${settled.taxableContributions} cents`,
                // **The election's own sentence, and M2 wrote it for exactly this line.** The old
                // text here said the Subdiv 293-B election was NOT MODELLED, which stopped being
                // true at P6-10 M3. What is true now is narrower and is a fact about this Person:
                // they made no election, so the statutory default stands and they pay in cash.
                `PAID BY THE INDIVIDUAL OUT OF CASH: ${release.reason}`,
              ]),
              attribution: UNATTRIBUTED.division293TrueUp,
            }),
          );
        });

        // --- P3-42 step 2 (and step 3's credit, folded in) — THE YEAR'S SUPER EARNINGS TAX -----
        //
        // Every interest whose income share was accumulated in the year's final month is charged
        // here, in the SAME settlement this chunk already runs. Fund tax is a fund-level, PER-
        // INTEREST liability the fund pays itself, in cash out of its OWN balance — a flat 0%/15%
        // rate on a figure this walk already has, with no monthly pre-accrual to true up against —
        // so nothing here reads `assessed` or `settledBases`, and there is no de-minimis: that
        // convention exists to absorb twelve roundings of a TWELFTH against an annual figure
        // (`TRUE_UP_DE_MINIMIS`'s own doc), and this charge is never divided into twelve.
        //
        // **`Settings.superIncomeYieldFrankedShare`, step 3 — REPLACES this charge for an
        // interest, rather than sitting beside it.** `frankingInSuper` computes the earnings tax on
        // the GROSSED-UP income share (the share plus its own credit) and the credit's offset/
        // refund in ONE call; calling plain `fundEarningsTax` on the same share AS WELL would tax
        // the same dollar twice. `superFranking.ts`'s own header states the alternative —
        // decomposing this distribution and the remainder into two SEPARATE, disjoint calls — is
        // exact only because refundable excess credits make the two calls independent of grouping.
        // Here there is no remainder to decompose off: the whole of the interest's income share is
        // either plain-taxed (no franked share stated) or wholly run through `frankingInSuper` (a
        // franked share IS stated), never both.
        household.persons.forEach((person, personIndex) => {
          person.superInterests.forEach((interest, slot) => {
            const taxableEarnings = completed.superYield[personIndex]?.[slot] ?? toCents(0);
            if (taxableEarnings <= 0) return;
            const resolved = fundTaxPhaseForYear(personIndex, slot, completed.fy);
            const fundInterest = fundTaxInterestFor(personIndex, resolved.phase, completed.fy);
            const held = balances[personIndex];
            const frankedShare = settings.superIncomeYieldFrankedShare;
            if (frankedShare === undefined) {
              const outcome = fundEarningsTax({
                fy: completed.fy,
                interest: fundInterest,
                taxableEarnings,
                phaseHeldFor: resolved.phaseHeldFor,
              });
              if (outcome.tax <= 0) return;
              // **Netted out of the balance HERE, as a real cost** — and BEFORE this month's
              // growth: the settlement runs early in July's tick, `balances` is the SAME mutable
              // array growth reads at the end of it, and there is no second write seam for a super
              // balance (`SUPER_LUMP_SUM_LINE`'s own precedent).
              if (held !== undefined) {
                held.superInterestBalances[slot] = subCents(held.superInterestBalances[slot] ?? toCents(0), outcome.tax) as Cents;
                clampReleased(personIndex, slot);
              }
              lines.push(
                Object.freeze({
                  direction: 'outflow',
                  effect: 'wealth',
                  description: superEarningsTaxDescription(person.name, effectivePhaseFor(personIndex, slot, endOfFinancialYear(completed.fy)), completed.fy),
                  amount: outcome.tax,
                  provenance: taxProvenance('superannuation fund earnings tax', outcome.provenance, [
                    `assessed once on FY${completed.fy}'s income share of this interest's own growth: ${outcome.taxableEarnings} cents at ${outcome.rate}`,
                    outcome.basis,
                  ]),
                  attribution: NO_STATING_ENTRY.superEarningsTax,
                }),
              );
              return;
            }
            // **`frankedAmount` is the WHOLE income share, UNSPLIT — `frankedDistributionFromShare`'s
            // own convention (`individualFranking.ts`), restated with `frankedDistributionFromStatement`
            // directly rather than importing a helper built for the individual side.** The credit is
            // `taxableEarnings × frankedShare`, never a fraction of the income share carved out first.
            const distribution = frankedDistributionFromStatement({
              fy: completed.fy,
              frankedAmount: taxableEarnings,
              frankingCredit: mulCents(taxableEarnings, frankedShare),
              source: superIncomeFrankingSource(person.name),
              confidence: 'unverified',
            });
            const outcome = frankingInSuper({
              fy: completed.fy,
              interest: fundInterest,
              distribution,
              // §5A.4's 45-day holding rule is P3-22e's assumption, unchanged here — the SAME
              // constant `investmentPayoutFrankedShare`'s own individual-side wiring assumes.
              facts: COMPLYING_RESIDENT_QUALIFIED_FUND,
              phaseHeldFor: resolved.phaseHeldFor,
            });
            // **Exactly one of `taxPayableAfterOffset` and `refund` is non-nil** —
            // `frankingInSuper`'s own invariant — so the two branches below never both fire.
            if (outcome.taxPayableAfterOffset > 0) {
              if (held !== undefined) {
                held.superInterestBalances[slot] = subCents(held.superInterestBalances[slot] ?? toCents(0), outcome.taxPayableAfterOffset);
                clampReleased(personIndex, slot);
              }
              lines.push(
                Object.freeze({
                  direction: 'outflow',
                  effect: 'wealth',
                  description: superEarningsTaxDescription(person.name, effectivePhaseFor(personIndex, slot, endOfFinancialYear(completed.fy)), completed.fy),
                  amount: outcome.taxPayableAfterOffset,
                  provenance: taxProvenance('superannuation fund earnings tax', outcome.provenance, [
                    `assessed once on FY${completed.fy}'s income share of this interest's own growth, grossed up ` +
                      `for a ${frankedShare} stated franked share: ${outcome.earningsTax.taxableEarnings} cents at ${outcome.earningsTax.rate}, ` +
                      `less the ${outcome.offset} cent credit`,
                    outcome.earningsTax.basis,
                  ]),
                  attribution: NO_STATING_ENTRY.superEarningsTax,
                }),
              );
            }
            if (outcome.refund > 0) {
              if (held !== undefined) {
                held.superInterestBalances[slot] = addCents(held.superInterestBalances[slot] ?? toCents(0), outcome.refund);
              }
              lines.push(
                Object.freeze({
                  direction: 'inflow',
                  effect: 'wealth',
                  description: superFrankingCreditRefundDescription(person.name, effectivePhaseFor(personIndex, slot, endOfFinancialYear(completed.fy)), completed.fy),
                  amount: outcome.refund,
                  provenance: taxProvenance('superannuation fund earnings tax', outcome.provenance, [
                    `the ${outcome.offset} cent credit exceeded the ${outcome.earningsTax.tax} cent liability it was set against; ` +
                      's 63-10(1) item 40 refunds the excess in cash',
                  ]),
                  attribution: NO_STATING_ENTRY.superEarningsTax,
                }),
              );
            }
          });
        });
      }
    }
    if (taxYearToDate === undefined) {
      taxYearToDate = {
        fy,
        months: 0,
        salary: household.persons.map(() => toCents(0)),
        sacrificed: household.persons.map(() => toCents(0)),
        accrued: household.persons.map(() => toCents(0)),
        guarantee: household.persons.map(() => toCents(0)),
        capExceeded: household.persons.map(() => false),
        div293Accrued: household.persons.map(() => toCents(0)),
        gain: household.persons.map(() => toCents(0)),
        minimumTaxCapitalGain: household.persons.map(() => toCents(0)),
        qualified: household.persons.map(() => false),
        receivedAgePension: household.persons.map(() => false),
        distributed: household.persons.map(() => toCents(0)),
        superYield: household.persons.map((person) => person.superInterests.map(() => toCents(0))),
        spouseContributionsMade: household.persons.map(() => toCents(0)),
        cashInterest: household.persons.map(() => toCents(0)),
        rent: household.persons.map(() => toCents(0)),
      };
    }
    taxYearToDate.months += 1;
    household.persons.forEach((_person, index) => {
      const year = taxYearToDate as NonNullable<typeof taxYearToDate>;
      // **The ASSESSABLE salary, not the gross (P6-8 brief 2, chunk 1)** — and the distinction is
      // load-bearing, not tidiness. The settlement below assesses this total as the year's income;
      // accumulating the gross here would have the true-up charge tax on dollars that never entered
      // assessable income, so a sacrifice starting in NOVEMBER would produce a spurious charge in
      // the following July on eight months of sacrifice it had never accrued tax on.
      //
      // Each half is rounded to the cent by `monthlyFromAnnual` independently, so twelve assessable
      // twelfths plus twelve sacrificed twelfths can sit a few cents from twelve gross ones. That is
      // the same arithmetic residue the settlement's one-dollar de-minimis exists to absorb, two
      // orders of magnitude below it.
      year.salary[index] = addCents(year.salary[index] ?? toCents(0), monthlyFromAnnual(assessableSalaries[index] ?? toCents(0)));
      year.sacrificed[index] = addCents(year.sacrificed[index] ?? toCents(0), monthlyFromAnnual(sacrificedThisMonth[index] ?? toCents(0)));
      year.accrued[index] = addCents(year.accrued[index] ?? toCents(0), accruedThisMonth[index] ?? toCents(0));
      // The two Division 293 accumulators, on `salary`'s convention: the month's TWELFTH of each
      // annual figure, so a Person employed for five months of the year carries five twelfths of a
      // Guarantee and not a year of one.
      year.guarantee[index] = addCents(year.guarantee[index] ?? toCents(0), monthlyFromAnnual(guaranteeForTheYear[index] ?? toCents(0)));
      year.div293Accrued[index] = addCents(year.div293Accrued[index] ?? toCents(0), div293AccruedThisMonth[index] ?? toCents(0));
      year.qualified[index] = (year.qualified[index] ?? false) || qualifiedThisMonth[index] === true;
      year.receivedAgePension[index] = (year.receivedAgePension[index] ?? false) || receivesAgePensionThisMonth[index] === true;
      year.cashInterest[index] = addCents(year.cashInterest[index] ?? toCents(0), cashInterestThisMonth[index] ?? toCents(0));
      year.rent[index] = addCents(year.rent[index] ?? toCents(0), rentThisMonth[index] ?? toCents(0));
    });

    // --- THE WHOLE YEAR AGAINST THE YEAR'S CAP (2026-09-23) --------------------------------------
    //
    // The refusal above runs only in the month an arrangement is STATED, on that month's pay and
    // that year's cap. Pay rises with wages every month, so the Guarantee grows through the year
    // and into later ones while a stated sacrifice stays fixed, and an arrangement at the edge of
    // the room goes over the cap later with nothing having looked. This checks the year's ACTUAL
    // contributions to date — the same two accumulators the Division 293 settlement reads — in
    // every month of every year, against the same comparison the refusal makes.
    //
    // **A NOTE, NOT A THROW**, on the switch build's precedent (`retirementPension.ts`): the user
    // changed nothing, and a forecast that walked must not stop because wages grew. The excess is
    // still walked at the fund's 15% (Division 291 is not modelled), so the note says in terms that
    // the forecast is flattering from here and by how much. The first year of a walk opening after
    // 1 July holds only the months walked, so its total is a LOWER bound: a note is a breach, and
    // no note is not a finding of compliance.
    household.persons.forEach((person, index) => {
      const year = taxYearToDate as NonNullable<typeof taxYearToDate>;
      if (year.capExceeded[index] === true) return;
      const guarantee = year.guarantee[index] ?? toCents(0);
      const sacrificed = year.sacrificed[index] ?? toCents(0);
      const over = concessionalContributionsOverGeneralCap({ fy: year.fy, components: concessionalComponentsOf(guarantee, sacrificed), indexNumbers: awoteIndexNumbers });
      if (over === undefined) return;
      year.capExceeded[index] = true;
      const capSource =
        over.cap.indexNumber === null
          ? 'the figure the register publishes'
          : over.cap.indexNumber.confidence === 'primary-verified'
            ? 'computed from the published wage level'
            : 'a FORECAST derived from the wage growth rate this plan states, not the law';
      notes.push(
        Object.freeze({
          subject: 'concessional cap exceeded' as const,
          person: person.name,
          financialYear: year.fy,
          contributedThisYear: over.total,
          generalCap: over.cap.amount,
          excessSoFar: over.excess,
          note: concessionalCapExceededNoteText(person.name, year.fy, over.total, month, guarantee, sacrificed, over.excess, over.cap.amount, capSource),
        }),
      );
    });

    // --- Chunk 4: the spending target, the Income Waterfall, and the balances ---------------------
    //
    // Everything above this line is INCOME and TAX: what the Household receives and what it must
    // hand over. Everything below is what it SPENDS and where the money comes from.

    // **THE TARGET, IN THREE PARTS — and the third one arrived with P3-16 slice 1 (2026-09-21).**
    // The sentence that stood here said *"in two parts and no more"*, and it is amended rather than
    // quietly outgrown: the home loan is the third part, and it is the first outflow in this build
    // that the Household must pay and did not choose month by month.
    //
    // The level is a twelfth of the standing `annualSpend` — RAISED TO THIS MONTH'S PRICE LEVEL
    // first, see below — with the one rounding decision
    // `monthlySpendFromAnnual` owns; the events are this month's `ONE_OFF_EXPENSE`s, each charged in
    // its own month, once. There is no replay: a `ONE_OFF_EXPENSE` is an `event` in `ENTRY_KIND`, so
    // one dated before the walk was already paid and never reaches `entriesThisMonth`, and one dated
    // inside the walk is in exactly one month's bucket.
    //
    // ⚠️ **THE REPAYMENT IS ADDITIONAL TO THE STATED SPENDING LEVEL (user ruling, 2026-09-21), AND
    // THE FORM SAYS SO.** Most people's mental "annual spending" figure already has their mortgage
    // inside it, so adding a repayment on top of such a figure double-counts it and reports a
    // household poorer than it is. The ruling is that the two are separate and the SCREEN carries
    // the burden of saying so: `MORTGAGE_NOTICE` and the spending box's own label tell the user to
    // type spending EXCLUDING the mortgage. A build that silently netted the repayment out of the
    // stated level would be answering, on the user's behalf, a question they were never put.
    //
    // **The interest is priced against the month's OPENING cash**, which is the Offset Account —
    // the same balance the month is assessed on and limb 4 draws from, read at the month's own
    // beginning on this walk's standing convention. Nothing is credited to the offset: see
    // `mortgageMonth`, which is where every ruling about the loan lives.
    //
    // ⚠️ **THE STATED SPENDING LEVEL IS A REAL FIGURE AND IS RAISED TO EACH MONTH'S PRICE LEVEL —
    // register O85, user ruling of 2026-09-21, option (b): *"as we agreed earlier we'd always
    // reflect cpi impacts"*.**
    //
    // Until that ruling the walk emitted the same nominal cents in month 0 and in month 500, so a
    // household that said "$150,000 a year" was modelled getting quietly poorer every year of the
    // forecast: the target fell in real terms the whole way, the money therefore lasted longer than
    // it would, and Shortfall Age came out LATER than the truth. That is the flattering direction
    // and the opposite of this project's standing conservative rule. A user who types $150,000
    // means a STANDARD OF LIVING, not a quantity of banknotes.
    //
    // **The mechanism is `core/priceLevel.ts`'s `inflateStated` and there is no second one** — the
    // same expression `Settings.contingencyFloor` has been raised by since P4-14. Raising a stated
    // REAL INPUT to the month's nominal dollars is input normalisation and not display, so ADR-0001
    // is intact: nothing deflated reaches a threshold, a rate or a taper, and the Waterfall goes on
    // comparing nominal with nominal. That paragraph is written out in full in `priceLevel.ts`'s
    // header, where the next reader who sees a `(1 + cpi)` in `src/core/` will look.
    //
    // **The basis is `settings.asAtDate` and NOT the entry's own date**, which is a decision and not
    // an accident. Every figure this build shows a user defaults to today's money (P2-7), so the box
    // they type into is a today's-money box whatever date the entry carries; reading a `SPEND_CHANGE`
    // dated 2040 as 2040 dollars would mean the page showed back a figure smaller than the one just
    // typed — the very complaint that raised O85. One basis also keeps two `SPEND_CHANGE`s
    // comparable: $84,000 stated for 2026 and $84,000 stated for 2040 are the same standard of
    // living, which is what a reader of the entry list assumes.
    //
    // **Raised BEFORE the twelfth is taken, so `monthlySpendFromAnnual` keeps the only rounding
    // decision.** Its doc justifies rounding UP as the one direction that points the residual at the
    // household, and it must stay the last operation: inflating an already-rounded twelfth would put
    // `mulCents`'s round-to-nearest after it and give the cent back.
    //
    // **`ONE_OFF_EXPENSE` is DELIBERATELY NOT raised** and sits in this same target as the nominal
    // cents the entry states — see `OneOffExpenseParams` for the reasoning and register O86, which
    // the user CLOSED on 2026-09-21 on that reading: an amount as at a date, so indexation is not
    // relevant to it. The same ruling covers the non-super buy and sell amounts. A one-off is frequently a PRICE ("the $40,000 car, in 2030"), which
    // is a nominal fact about a dated purchase, where the spending level is a standard of living.
    // The two are not the same kind of figure and this build does not guess the second one.
    const spendingLevel: { readonly annualSpend: Cents; readonly entryId: string } | undefined = spending;
    const monthlySpend =
      spendingLevel === undefined
        ? toCents(0)
        : monthlySpendFromAnnual(inflateStated(spendingLevel.annualSpend, settings.economicSeries.cpi, settings.asAtDate, month));
    const oneOffs = entriesThisMonth.filter((entry) => entry.type === 'ONE_OFF_EXPENSE');
    const oneOffTotal = oneOffs.reduce<number>((total, entry) => total + entry.params.amount, 0) as Cents;
    // **`undefined` where there is no loan to pay, and it is a THIRD state rather than a nil one.**
    // A Household that states no mortgage and a loan that has amortised to nil both land here, and
    // neither emits a line, a note or a cent — which is what keeps every walk written before this
    // field byte-identical.
    //
    // **It reads the TERMS IN FORCE and never `household.mortgage` (P3-16 slice 2)** — see the
    // `mortgage` local above. A Household that states none and an entry that has not arrived yet
    // are the same `undefined` here, which is what makes origination cost no branch.
    //
    // ⚠️ **THE WALK-TIME REFUSAL, AND WHY IT IS RE-THROWN RATHER THAN LEFT ALONE (slice 2).**
    // `mortgageMonth` refuses a repayment that does not cover the month's interest — a loan that
    // would grow for ever — with a `RangeError` that quotes the figures and names no entry and no
    // month. For `Household.mortgage` that was enough, because `parsePlan` had already refused the
    // same loan at the door with a JSON path on it. **For a dated change it is not enough and
    // cannot be**: the door has no way to test a change dated ten years out, because the interest
    // depends on the Offset Account balance in that month and that balance is an output of this
    // function. So the refusal is caught HERE, where the entry id and the month are both in scope,
    // and re-thrown with both attached — the user cannot be shown the offending box, and they can
    // at least be told which entry and which month to look at. A refusal that said only "a
    // repayment of 240000 cents does not cover 250000 cents" against a plan with four entries
    // would be a puzzle, not a refusal.
    //
    // **A `MORTGAGE_PAYOFF` month prices the WHOLE balance** (`mortgagePayoffMonth`): the month's
    // interest as usual, the entire opening balance as principal, and a nil close. Its payment sits
    // in `target` exactly where an ordinary repayment does, so a month that cannot fund it shows an
    // `Unfunded shortfall` (`ONE_OFF_EXPENSE`'s precedent) rather than a loan that vanished unpaid.
    // A payoff with no loan in force, or with nothing owing, is refused by entry id and month in
    // `mortgageMonthOrRefuse`'s idiom — ignoring it would draw a plan the user did not state.
    if (mortgagePayoffEntryId !== undefined && (mortgage === undefined || mortgageBalance <= 0)) {
      throw new RangeError(
        `the entry "${mortgagePayoffEntryId}" pays the home loan off in full in ${month}, but ${mortgage === undefined
          ? 'no home loan is in force that month'
          : 'nothing is owed on the home loan that month — it has already been paid off'}: a payoff of nothing is refused rather than ignored`,
      );
    }
    const mortgageThisMonth: MortgageMonth | undefined =
      mortgage === undefined || mortgageBalance <= 0
        ? undefined
        : mortgagePayoffEntryId !== undefined
          ? mortgagePayoffMonth(mortgage, mortgageBalance, openingBalance)
          : mortgageMonthOrRefuse(mortgage, mortgageBalance, openingBalance, month, mortgageEntryId);
    // **P14-18b — the RAD lump sum joins `target`, on `MORTGAGE_PAYOFF`'s own precedent, not
    // `NON_SUPER_INVESTMENT`'s.** A RAD is a discrete, one-off admission decision like a payoff, not
    // a discretionary purchase capped at whatever running cash happens to hold: most retirees pay it
    // out of superannuation, and `target` is the one figure the WHOLE Waterfall — salary, both
    // Account-Based Pension limbs, the Non-Super Portfolio, running cash, and (last) a released
    // superannuation lump sum — funds. `careEnteredThisMonth` is already fully populated (chunk 2b,
    // above), so this is knowable before the Waterfall runs, exactly as `mortgageThisMonth.payment`
    // is. The refusal this used to be ("cash on hand") moves to just after the Waterfall runs, below
    // — same REFUSAL, wider funding source, never an `Unfunded shortfall`.
    // **`radPaidAsLumpSum` is stated in TODAY's money too (user ruling, 2026-09-25) — `atTodaysMoney`
    // raises it to THIS Person's own entry day, `entered.date`, which is THIS month
    // (`careEnteredThisMonth` is only ever populated in the entry's own month).**
    const radPaidThisMonth = household.persons.reduce<Cents>((total, _person, personIndex) => {
      const entered = careEnteredThisMonth[personIndex];
      return entered === undefined ? total : addCents(total, atTodaysMoney(entered.params.radPaidAsLumpSum, entered.date));
    }, toCents(0));
    // **P14-19 — the purchase: paid first from the sale's set-aside (while its window was open),
    // the rest joins `target` for the whole Waterfall, `radPaidThisMonth`'s own route.** The
    // set-aside is running cash, so what it pays is taken off the cash limbs below.
    const homePurchaseThisMonth: Cents =
      homeBoughtThisMonth === undefined
        ? toCents(0)
        : addCents(
            atTodaysMoney(homeBoughtThisMonth.params.purchasePrice, homeBoughtThisMonth.date),
            atTodaysMoney(homeBoughtThisMonth.params.purchaseCosts ?? toCents(0), homeBoughtThisMonth.date),
          );
    // **P9-5 — a downsizer contribution takes the same route, from the set-aside first while it is
    // open** (a purchase in an earlier month has closed it). Set-aside first is the cautious order:
    // what is left protected under DSS Guide 4.6.3.90 shrinks, never ordinary cash.
    const downsizerThisMonth: Cents = downsizersThisMonth.reduce<Cents>(
      (total, entry) => addCents(total, atTodaysMoney(entry.params.amount, entry.date)),
      toCents(0),
    );
    const setAsideAtPurchase: Cents =
      (homeBoughtThisMonth !== undefined || downsizerThisMonth > 0) &&
      saleProceedsWindowOpen &&
      homeSoldEntry !== undefined &&
      (homeBoughtEntry === undefined || homeBoughtThisMonth !== undefined)
        ? (Math.max(0, subCents(atTodaysMoney(newHomeAmountStated as Cents, homeSoldEntry.date), setAsideSpentByDownsizer)) as Cents)
        : toCents(0);
    const paidFromSetAside = Math.max(0, Math.min(homePurchaseThisMonth + downsizerThisMonth, setAsideAtPurchase, openingBalance)) as Cents;
    if (downsizerThisMonth > 0) setAsideSpentByDownsizer = addCents(setAsideSpentByDownsizer, paidFromSetAside);
    const target = (monthlySpend + oneOffTotal + (mortgageThisMonth?.payment ?? 0) + radPaidThisMonth + homePurchaseThisMonth + downsizerThisMonth - paidFromSetAside) as Cents;

    // --- Chunk 5b: LIMB 2, the Account-Based Pension minimum -------------------------------------
    //
    // **Determine the year's minimum on the day Sch 7 names, and only on that day.** cl 1(2)(a)
    // reads the balance on 1 July, or on the commencement day in the year the pension commences,
    // and `minimumDrawdown` REFUSES a balance measured on any other day (`PensionBalanceDateError`)
    // rather than multiplying the wrong number by the right factor. So the determination happens in
    // the month that day falls in and nowhere else, off the balance the month OPENS with — which is
    // the balance on every day of that month, because in this model balances move only at month
    // boundaries.
    //
    // ⚠️ **AND WHERE THAT DAY IS BEHIND THE FORECAST, THE DETERMINATION IS MADE IN THE WALK'S FIRST
    // MONTH ON THE BALANCE THE PLAN STATES — P10-5, 2026-09-21, and it replaced a nil with no clause
    // behind it.** A walk beginning on 1 September never opens its first year's 1 July, and until
    // this line that year's minimum was never determined at all: limb 2 offered NOTHING for ten
    // months, so a retired household could not reach its own pension and the walk reported it short
    // by tens of thousands a month with hundreds of thousands of dollars sitting in the account. The
    // old text called that *"the safe direction"*. It was not a direction, it was the whole figure,
    // and **Schedule 7 contains no nil of that kind**: the only nil in it is cl 4's, which turns on
    // the commencement day and says nothing about when a forecast opens. A pension that commenced in
    // 2021 owes its FULL FY2026-27 minimum whatever month a plan is written in — cl 3 pro-rates
    // *"the year in which the commencement day … occurs"* and no other.
    //
    // **What is missing is the INPUT, and exactly one of them**: the balance on that 1 July, which
    // is a day before the walk. `pensionAccountBalanceObservedLater` is the single declared route by
    // which the plan's own opening balance stands in for it, and it refuses any direction but
    // forward and any year but that one. The error it admits is the account's movement over those
    // few weeks — unsigned, because payments out and earnings in both happen, and bounded by the
    // factor times that movement. What it replaced was an error of 100%.
    //
    // **The full annual minimum is owed, not a slice of it.** Payments the fund made between 1 July
    // and `asAtDate` are invisible to this walk, and crediting the household with one would be
    // inventing a payment. reg 1.06(9A)(a) floors the year's TOTAL, the June sweep below pays
    // whatever the household has not drawn by then, and the money lands in the Offset exactly as
    // limb 1's surplus does — so a sweep larger than the fund would really have required moves cash
    // between two accounts the means test assesses alike, and creates none.
    //
    // **AND A TRANSITION TO RETIREMENT INCOME STREAM IS DETERMINED HERE TOO, into the SAME
    // `pensionYears` slot** (2026-09-23). Its year is `ttrAnnualPayment` — the stated rate or the
    // Schedule 7 minimum, whichever is more, capped at 10% — on the same day and the same balance.
    // Because the slot is shared, a TTR that converts inside the year finds its year already
    // determined when it becomes an Account-Based Pension and keeps it (ruling: the same stream in
    // law); the next 1 July determines it afresh as an Account-Based Pension. The block runs BEFORE
    // `received` so a TTR's payment below is in this month's income, and before any stated lump sum,
    // so the determination reads the balance the month opened with, which is the relevant day's.
    household.persons.forEach((person, personIndex) => {
      if (personIndex === deceasedNow) return; // P12-1: their accounts were paid out at the death.
      person.superInterests.forEach((interest, slot) => {
        // An accumulation account switching at retirement part-way through THIS month is determined
        // this month, on the balance the month opens with: its commencement day is in it, and the
        // month after would be too late to read that day's year.
        const switchDay = conversionDay[personIndex]?.[slot];
        const switchesThisMonth = interest.phase === 'accumulation' && switchDay !== undefined && monthOf(switchDay) === month;
        const phase = switchesThisMonth ? 'accountBasedPension' : ttrPhaseForPayment(personIndex, slot, date);
        if (!isAccountBasedPension(phase) && phase !== 'ttr') return;
        const commencementDay = commencementDayFor(personIndex, slot);
        if (commencementDay === undefined) return; // stated by nobody: `unfundedMiddleLimbs` says so.
        const held = pensionYears[personIndex]?.[slot];
        if (held !== undefined && held.fy === fy) return; // already determined for this year.
        const relevantDay = schedule7RelevantDay(fy, commencementDay);
        if (relevantDay === undefined) return; // the pension has not commenced: no year to determine.
        // The month the Schedule's day falls in — or the walk's first month where that day is
        // behind it, which can only be the walk's opening financial year. `first` is the same
        // window `forecastWindow` gave the loop, so there is no second spelling of "month one".
        const determinedIn = monthOf(relevantDay) < first ? first : monthOf(relevantDay);
        if (determinedIn !== month) return;
        const balanceObservedOn = determinedIn === monthOf(relevantDay) ? relevantDay : firstDayOf(first);
        const balanceOnRelevantDay = balances[personIndex]?.superInterestBalances[slot] as Cents;
        const minimum = annualPensionMinimum({
          fy,
          dateOfBirth: person.dateOfBirth,
          commencementDay,
          relevantDay,
          balanceObservedOn,
          balanceOnRelevantDay,
        });
        const rate = phase === 'ttr' ? ttrRateInForce(personIndex, slot, month) : undefined;
        const amount =
          phase === 'ttr'
            ? ttrAnnualPayment({
                fy,
                commencementDay,
                balanceOnRelevantDay,
                balanceObservedOn,
                minimum,
                statedDrawdownRate: rate,
              })
            : minimum;
        if (balanceObservedOn !== relevantDay) {
          notes.push(
            Object.freeze({
              subject: 'pension minimum basis' as const,
              person: person.name,
              interestIndex: slot,
              financialYear: fy,
              schedule7Day: relevantDay,
              balanceObservedOn,
              minimumForTheYear: minimum,
              note: PENSION_MINIMUM_PROXY_NOTE,
            }),
          );
        }
        (pensionYears[personIndex] ?? [])[slot] = {
          fy,
          amount,
          remaining: amount,
          ...(phase === 'ttr' ? { ttr: { rate, balanceOnRelevantDay, balanceObservedOn, minimum } } : {}),
        };
      });
    });

    // --- THE TTR PAYMENT: a twelfth a month, the rest in June ------------------------------------
    //
    // A TTR pays whether or not the household needs it — it is income, like the Age Pension, not a
    // limb the Waterfall may decline — so it is paid here, before `received`, and limb 1 spends it.
    // A twelfth of the year's figure (`monthlyFromAnnual`) in every month but the last of the
    // financial year, which pays whatever is left, so the year's total is the determined figure to
    // the cent. Capped at what is left of the year and at the balance: an emptied account pays
    // nothing further. The balance is written back HERE, off the same `paid`, on the stated lump
    // sum's precedent, so a later limb in this tick offers only what is left.
    //
    // **Refused below the tax-free age** (`requireTtrPaymentAge`): the payment is assessable on a
    // taxable component this model does not hold. Asked only where a payment is about to be made,
    // and on the day it can first be made — the month's first day, or the commencement day where
    // the stream starts inside the month — so a stream commencing on the 60th birthday is paid.
    const finalMonthOfTheYear = monthOf(endOfFinancialYear(fy));
    household.persons.forEach((person, personIndex) => {
      if (personIndex === deceasedNow) return; // P12-1: their accounts were paid out at the death.
      person.superInterests.forEach((interest, slot) => {
        if (ttrPhaseForPayment(personIndex, slot, date) !== 'ttr') return;
        const held = pensionYears[personIndex]?.[slot];
        const holding = balances[personIndex];
        const commencementDay = commencementDayFor(personIndex, slot);
        if (held === undefined || held.fy !== fy || holding === undefined || commencementDay === undefined) return;
        // **A dated rate change re-sets the rest of the year** (`ttrAnnualPaymentRevised` gives the
        // law): the year's figure is re-priced from this month, and what is left of it is spread
        // evenly over the months to June.
        const rate = ttrRateInForce(personIndex, slot, month);
        if (held.ttr !== undefined && rate !== undefined && rate !== held.ttr.rate) {
          const paidSoFar = subCents(held.amount, held.remaining);
          const amount = ttrAnnualPaymentRevised({
            fy,
            commencementDay,
            from: date,
            amount: held.amount,
            paidSoFar,
            balanceOnRelevantDay: held.ttr.balanceOnRelevantDay,
            balanceObservedOn: held.ttr.balanceObservedOn,
            minimum: held.ttr.minimum,
            drawdownRate: rate,
          });
          held.amount = amount;
          held.remaining = subCents(amount, paidSoFar);
          held.instalment = Math.round(held.remaining / (monthsBetween(month, finalMonthOfTheYear) + 1)) as Cents;
          held.ttr = { ...held.ttr, rate };
        }
        const balance = holding.superInterestBalances[slot] as Cents;
        const due = month === finalMonthOfTheYear ? held.remaining : Math.min(held.instalment ?? monthlyFromAnnual(held.amount), held.remaining);
        const paid = Math.min(due, balance) as Cents;
        if (paid <= 0) return;
        requireTtrPaymentAge({ personName: person.name, dateOfBirth: person.dateOfBirth, on: commencementDay > date ? commencementDay : date });
        held.remaining = subCents(held.remaining, paid);
        holding.superInterestBalances[slot] = subCents(balance, paid);
        drawReleased(personIndex, slot, paid);
        clampReleased(personIndex, slot);
        lines.push(
          Object.freeze({
            direction: 'inflow',
            effect: 'cash',
            description: superPaymentDescription(TTR_PAYMENT_LINE, person),
            amount: paid,
            provenance: TTR_PAYMENT_PROVENANCE,
            attribution: NO_STATING_ENTRY.ttrPayment,
          }),
        );
      });
    });

    // **The salary limb is the month's NET income, and the name is the concept.md one.** Two things
    // are folded into it and both are forced:
    //   * income tax, because a dollar withheld is not a dollar that can buy groceries. The tax lines
    //     are already above, so subtracting them here is a re-reading of the same figures, not a
    //     second computation;
    //   * the **Age Pension**, because concept.md's order is "salary → ABP to its minimum →
    //     Non-Super Portfolio → Offset Account, **with Age Pension applied wherever assessed**". It
    //     is applied, not drawn: a pension payment arrives whether or not the target needs it, so it
    //     is not a limb with a cap and putting it in as one would let the Waterfall decline it.
    // **Floored at nil, and the floor is a DECLARED SURVIVOR.** A month whose tax exceeded its
    // receipts would be a month with nothing to spend from wages, not a month with a negative wage.
    // Deleting the `Math.max(0, …)` fails ZERO tests and no fixture can be written that would change
    // that: `received` is salary plus the Age Pension less the tax on the same month's salary, and no
    // Australian rate scale takes more than 100% of the income it is applied to, so `received < 0` is
    // unreachable from any `Household` this model can express. It is written because the floor is
    // what makes the sentence true rather than the current shape of the tax rules, and it is recorded
    // as unreachable rather than patched with a fixture that proves nothing.
    const received = lines.reduce<number>((total, line) => total + cashMovement(line), 0);
    const netIncome = Math.max(0, received) as Cents;

    // --- LUMP_SUM_FROM_SUPER: the money the household took OUT of super, because it said to -------
    //
    // **P4-6's second residual, closed where it said it would be closed** (2026-09-19).
    // `accessibleWealth` records it: released super is reachable in LAW and unspendable in THIS
    // ENGINE, because no limb draws an Accumulation Phase balance — so a Household could report
    // `Unfunded shortfall` for months on end beside a balance it was entitled to withdraw, and
    // Shortfall Age reported the date CASH ran out rather than the date MONEY ran out.
    //
    // **It is an ENTRY and NOT a fifth limb** (user ruling). The withdrawal happens because the
    // household said so, in the entry's own month, once — `LUMP_SUM_FROM_SUPER` is an `event` in
    // `ENTRY_KIND`, so one dated before the walk is money already in the stated balances and never
    // reaches `entriesThisMonth`. Nothing sweeps super automatically, and the four limbs and their
    // four notes are exactly what they were.
    //
    // **WHERE IT SITS IN THE TICK, and both sides of it are deliberate.** AFTER `netIncome`, so the
    // withdrawal is not read as wages by limb 1 — it is not income, it is the household's own
    // capital — and BEFORE `drawWaterfall`, so the cash is *there to be spent this month*: it raises
    // limb 4's `available`, which is the running cash the line has by then put it into. Placing it
    // after the Waterfall would have funded nothing: the shortfall is decided by then, and the month
    // would report both a withdrawal and the shortfall it was made to meet.
    //
    // **Every refusal on this path belongs to a module that already owned the question**
    // (`superLumpSum.ts`): the phase of the target, the tax age, and `requireBenefitAccess` over a
    // `conditionOfRelease`. What is decided HERE is only what the walk knows and that module cannot:
    // whose interest it is, which one, what it holds this month — and the two refusals below are
    // input-shape guards about THIS entry against THIS Household, which is why they are plain
    // `RangeError`s in the style of `nonSuperInvestmentDirection`'s and not named refusals.
    // **THE WALK'S CESSATION FACT, in ONE expression, read by the entry path and by limb 5.**
    //
    // A `RETIRE` carries its own day and the walk applies it in the month that day falls in, so in
    // that FIRST month the cessation has not happened yet on the day everything else is asserted
    // for — `date`, the first of the month, which is the day the means test is assessed on and the
    // day a release is asked about. `conditionOfRelease` refuses a cessation dated after the day it
    // is asked about, by name and in terms: *"a cessation that has not happened yet releases
    // nothing"*. So the month a Person retires reports them as still employed, which is the walk's
    // standing convention (a month is read at its own beginning) and the conservative direction:
    // release arrives the FOLLOWING month, never a month early.
    //
    // **Back at work after retiring (retire flow S3): not ceased, from the month of the return until
    // the next stop.** In law only what was unrestricted at the stop stays cashable, as a fixed
    // dollar figure (SISR 6.03, 6.10(1), 6.18(2)); money paid in since, and all earnings after the
    // stop, are preserved until they stop again at 60 or over or turn 65. So this says not ceased,
    // and the three readers (the entry path, limb 5, `accessibleWealth`) each ask
    // `releasedWhileBackAtWork` for that account's released amount (RF-1) and reach that much and no
    // more. An account-based pension is not gated here at all. A stop after a return is its own cessation.
    const gainfulEmploymentAsAt = (personIndex: number): GainfulEmployment => {
      const spell = spellIn(personIndex, month);
      if (spell?.change.kind === 'returned') return { ceased: false };
      const ceasedOn = spell === undefined || spell.at === 0 ? retiredOn[personIndex] : spell.change.date;
      return ceasedOn === undefined || ceasedOn > date ? { ceased: false } : { ceased: true, ceasedOn };
    };

    let withdrawnFromSuper: Cents = toCents(0);
    for (const entry of entriesThisMonth) {
      if (entry.type !== 'LUMP_SUM_FROM_SUPER') continue;
      if (entry.owner === 'household') {
        throw new RangeError(
          `entry ${entry.id} (LUMP_SUM_FROM_SUPER) is owned by the household, and a lump sum comes out of ONE Person's superannuation interest: ` +
            'the two members hold separate interests, separately preserved and separately taxed, and there is no household account to pay it from. State personA or personB',
        );
      }
      const personIndex = entry.owner === 'personA' ? 0 : 1;
      const person = household.persons[personIndex];
      const held = balances[personIndex];
      if (person === undefined || held === undefined) {
        throw new RangeError(`entry ${entry.id} (LUMP_SUM_FROM_SUPER) is owned by ${entry.owner}, and this Household has ${household.persons.length} Person(s)`);
      }
      const slot = entry.params.interestIndex;
      const interest = person.superInterests[slot];
      if (interest === undefined) {
        throw new RangeError(
          `entry ${entry.id} (LUMP_SUM_FROM_SUPER) names superannuation interest ${slot}, and ${person.name} holds ${person.superInterests.length}: ` +
            'the interest is stated positionally and this position is not one of them. Which interest the money comes out of is refused rather than guessed — the phase of the target decides whether this build can honour the withdrawal at all',
        );
      }
      // RF-1: back at work, the gate sees only the released amount, so a larger request is capped
      // to it exactly as one larger than the balance is capped to the balance.
      const partly = releasedWhileBackAtWork(personIndex, slot);
      const heldInSlot = held.superInterestBalances[slot] as Cents;
      const withdrawal = superLumpSumWithdrawal({
        personName: person.name,
        dateOfBirth: person.dateOfBirth,
        on: date,
        // **The walk's REAL retirement fact, and this is the one path that has one.** A `RETIRE`
        // entry applied for this Person by this month states the day gainful employment ceased;
        // where none has, `{ ceased: false }` is not a default but the same statement
        // `accessibleWealth` makes. A cessation before Preservation Age in the 60–64 window raises
        // `CessationBeforePreservationAgeError` out of `conditionOfRelease` — the register's
        // refusal, reached only by a Household that stated a withdrawal.
        gainfulEmployment: partly?.gainfulEmployment ?? gainfulEmploymentAsAt(personIndex),
        slot,
        phase: effectivePhaseFor(personIndex, slot, date),
        balance: partly === undefined ? heldInSlot : Math.min(partly.released, heldInSlot) as Cents,
        requested: entry.params.amount,
      });
      // **THE LINE AND THE WRITE-BACK, off the one `SuperWithdrawal`** — limb 2's discipline, and
      // through limb 2's own seam. `splitAssets`, `accessibleWealth` and next month's growth all
      // read this array, so there is no second copy of the balance to keep in step. The real balance
      // less what was paid, never the capped figure the gate saw.
      held.superInterestBalances[slot] = subCents(heldInSlot, withdrawal.paid);
      drawReleased(personIndex, slot, withdrawal.paid);
      clampReleased(personIndex, slot);
      withdrawnFromSuper = addCents(withdrawnFromSuper, withdrawal.paid);
      if (withdrawal.paid > 0) {
        lines.push(
          Object.freeze({
            direction: 'inflow',
            effect: 'cash',
            description: superPaymentDescription(SUPER_LUMP_SUM_LINE, person),
            amount: withdrawal.paid,
            provenance: UNLEGISLATED.superLumpSum,
            attribution: statedBy(entry.id),
          }),
        );
      }
      // **The note is pushed whether or not a cent moved**, because the two facts a line cannot
      // carry are exactly the ones a reader needs: the tax, which is a computed nil resting on a
      // taxed source this model cannot verify, and the gap between what was asked for and what the
      // interest could pay. A drained interest pays nothing and says so.
      notes.push(
        Object.freeze({
          subject: 'super withdrawal',
          person: person.name,
          interestIndex: slot,
          entryId: entry.id,
          requested: withdrawal.requested,
          paid: withdrawal.paid,
          taxWithheld: withdrawal.taxWithheld,
          note: withdrawal.taxNote,
        }),
      );
    }


    // **P12-1 — the death benefit arrives here, beside a stated lump sum and for its reason**: it is
    // the household's capital, not income, so it lands after `netIncome`, and it is there to be
    // spent this month through the cash limbs. The amount was decided, and the balances zeroed, in
    // the death-month block at the top of the tick.
    if (deathBenefit > 0 && death !== undefined) {
      lines.push(
        Object.freeze({
          direction: 'inflow',
          effect: 'cash',
          description: superPaymentDescription(SUPER_DEATH_BENEFIT_LINE, household.persons[death.index] as Person),
          amount: deathBenefit,
          provenance: UNLEGISLATED.superDeathBenefit,
          attribution: statedBy(death.entryId),
        }),
      );
      withdrawnFromSuper = addCents(withdrawnFromSuper, deathBenefit);
    }

    // **P14-16 — the RAD refund, beside the death benefit and for the same reason**: household
    // capital arriving the same month it is decided, spendable through the cash limbs below. Not
    // `paidOutOfSuper` — a RAD was never inside superannuation — so it does not join
    // `withdrawnFromSuper`/`Month.incomeFromSuper`.
    if (radRefund > 0 && death !== undefined) {
      lines.push(
        Object.freeze({
          direction: 'inflow',
          effect: 'cash',
          description: AGED_CARE_RAD_REFUND_LINE,
          amount: radRefund,
          provenance: UNLEGISLATED.agedCareRadRefund,
          attribution: statedBy(death.entryId),
        }),
      );
    }

    // What each interest can supply, in `persons` × `superInterests` order — which is also the order
    // the draw is allocated back in, below. One ordering, stated once: a pro-rata split across
    // interests would need a second rounding decision, and the Schedule determines a minimum per
    // stream rather than per Household, so drawing them in the Household's own stated order is the
    // rule that invents least.
    //
    // **The capacity is the BALANCE, and that is the 2026-09-17 ruling** (`pensionAvailableThisMonth`):
    // the Sch 7 minimum is a floor on what must be paid, not a ceiling on what may be drawn. What the
    // year's minimum still governs is WHERE in the order each dollar is offered — what is still owed
    // of it first, the rest after the portfolio (`WATERFALL_LIMBS`, 2026-09-23) — and the payment that
    // must be made whether or not it is needed, which is swept below, after the Waterfall has run.
    //
    // **An interest is claimable only where a minimum HAS been determined for `fy`** — `held.fy === fy`.
    // That keeps the two refusals above exactly where they were: a pension with no stated commencement
    // day, and a walk that never opened its first 1 July, are not drawn at all. Both under-state the
    // household, which is the safe direction, and both are the subject of their own tests.
    const pensionClaims: PensionClaim[] = [];
    household.persons.forEach((person, personIndex) => {
      if (personIndex === deceasedNow) return; // P12-1: their accounts were paid out at the death.
      person.superInterests.forEach((interest, slot) => {
        if (!isAccountBasedPension(effectivePhaseFor(personIndex, slot, date))) return;
        const held = pensionYears[personIndex]?.[slot];
        if (held === undefined || held.fy !== fy) return;
        const available = pensionAvailableThisMonth(balances[personIndex]?.superInterestBalances[slot] as Cents);
        if (available > 0) pensionClaims.push({ personIndex, slot, available, towardMinimum: Math.min(available, held.remaining) as Cents });
      });
    });

    // **Limb 3's claims, in the Household's own stated order** — the same ordering rule limb 2's
    // claims take, and for the same reason: whose parcels sell first is settled by precedent as the
    // Household's stated order, and a pro-rata split across two portfolios would need a second
    // rounding decision to answer a question nobody asked. One claim per Person who holds anything;
    // a Person holding nothing is absent rather than present at nil, so the allocation loop below
    // cannot emit a $0 sale line.
    //
    // The parcels are read off `householdThisMonth`, which carries THIS month's balances — so the
    // limb offers what is held now and not what was held in month 0, and it offers it at the market
    // value the means test was assessed on at the top of this same month.
    const portfolioClaims: PortfolioClaim[] = [];
    householdThisMonth.persons.forEach((person, personIndex) => {
      const available = financialAssets(person);
      if (available > 0) portfolioClaims.push({ personIndex, available });
    });

    // --- P10-4: THE SALE FUNDS ITS OWN TAX, AND HOW THE CIRCLE IS CLOSED -------------------------
    //
    // ⚠️ **THE DEFECT THIS CLOSES, MEASURED BEFORE IT WAS FIXED.** Limb 3 used to draw to NEED and
    // `chargeCapitalGain` charged the tax on that sale afterwards, as a line against the same running
    // cash. The tax was no part of what the month set out to fund, so a month whose marginal funding
    // was a parcel sale came up short by exactly its own tax: one measured walk reported an
    // `Unfunded shortfall` of **$566.10** beside an `Income tax on capital gain` of $946.15 in a
    // month the Household could reach **$18,088,555**. It was not only a solver problem — the
    // Shortfall Age on the page was wrong, in the ALARMING direction, wherever selling investments
    // was the marginal source. **The user's ruling of 2026-09-21 is that limb 3 GROSSES ITS DRAW UP
    // for the tax that draw causes**, so that each sale is self-funding, which is what a real person
    // does. Funding the charge from the limbs below limb 3 was the other reading and was rejected.
    //
    // **THE CIRCULARITY, NAMED.** Selling more realises more gain, which is more tax, which needs
    // more selling. The relationship is not linear: the marginal rate steps at bracket boundaries and
    // at the Medicare shade-in, the s 115-25 discount reaches only parcels held more than twelve
    // months, and FIFO decides WHICH parcels go — so the gain per dollar of proceeds changes as the
    // sale grows. Nothing here models any of that. It asks the engine.
    //
    // **THE METHOD, IN TWO PHASES, AND IT TERMINATES.** Write `A` for what the claims hold in total,
    // `tax(x)` for what this walk would charge on a sale of `x` out of them, and `net(x) = x − tax(x)`.
    //
    //   1. **`net(A)` is what limb 3 OFFERS the Waterfall**, not `A` — the most the portfolio can
    //      contribute to the target after paying for itself. So the draw `d` the Waterfall takes is
    //      one limb 3 can actually deliver, and where it cannot deliver the whole target the limbs
    //      BELOW it are offered the rest rather than being skipped past a phantom.
    //   2. **The gross-up looks for an `x` with `net(x) ≥ d`, as small as it can find**, by a fixed
    //      point from below — `x₀ = d`, `xₖ₊₁ = d + tax(xₖ)` — falling back to a bisection of
    //      `[d, A]` if that walks the wrong way.
    //
    // **TERMINATION AND THE ITERATION BOUND.**
    //   * Before 1 July 2027 `tax` is non-decreasing over a set of parcels realising gains, and one
    //     more cent of proceeds can never add MORE than a cent of tax (every rate in the scale is
    //     marginal and below 100%). So `net` is non-decreasing there.
    //   * The fixed point runs upward: while `tax` is non-decreasing, `xₖ ≤ x*` implies
    //     `xₖ₊₁ = d + tax(xₖ) ≤ d + tax(x*) = x*`, so no iterate can overshoot, and each step either
    //     stops (`xₖ₊₁ = xₖ`, which IS `net(x) = d` exactly, to the cent) or rises by at least one
    //     cent. It is capped at `GROSS_UP_FIXED_POINT_STEPS` because the contraction is geometric in
    //     the marginal rate and every case met so far settles in two or three.
    //   * A parcel realising a LOSS can make `tax` FALL as the sale grows, and there the iteration
    //     could step down or cycle. It is detected — `next < x` — and the bisection takes over.
    //   * **So can indexation, by one cent (LR-1 slice 2).** From 1 July 2027 one more cent of
    //     proceeds can carry one more cent of the apportioned stamp, and the indexed cost base, which
    //     is floored, then rises by up to two: the gain can FALL by a cent. `tax` can therefore dip a
    //     cent, `net` can rise by two, and the least `x` can cover the draw with a cent to spare.
    //   * ⚠️ **From 1 July 2027 Div 119 makes `net` NON-MONOTONE, by up to a dollar (LR-1 slice 3).**
    //     The minimum tax gap is rounded DOWN to whole dollars (s 119-10(2) step 6). While part of the
    //     later gain sits below the 30% band the gap grows as the sale does, so one more cent of
    //     proceeds can add a whole dollar of tax and `net` FALLS by ~99 cents. With taxable income in
    //     the 37% band the gap shrinks as the sale grows, so one more cent can take a dollar OFF, and
    //     `tax` falls. So neither "least `x`" nor "`tax` non-decreasing" holds in those months, and
    //     the search does not claim them. What it still guarantees is what the Waterfall needs:
    //     `net(x) ≥ d` at the `x` it returns. The fixed point returns only on equality; a dip is
    //     `next < x`, which hands over to the bisection; and the bisection's invariant — `net(high)
    //     ≥ d`, true at `A` because `d ≤ net(A)` — needs no monotonicity at all, only that it starts
    //     true. What is lost is minimality: the sale can fund the draw with up to a dollar to spare,
    //     which lands in cash. `test/core-cgt-reform-2027-minimum-tax.test.mjs` pins both steps and
    //     the spare cents.
    //   * **The bisection is the guarantee.** It halves an integer bracket inside
    //     `[d, A] ⊆ [0, Number.MAX_SAFE_INTEGER]`, so it stops in at most **53** probes, and it
    //     stops on `lo === hi` rather than on a tolerance. No loop here is controlled by a
    //     floating-point comparison, so the iteration count cannot drift with rounding and the walk
    //     stays digest-stable. Worst case is `GROSS_UP_FIXED_POINT_STEPS + 53` probes in a month
    //     that sells; a month that sells nothing runs none of it.
    //
    // ⚠️ **A GENUINE SHORTFALL IS STILL A SHORTFALL.** Where the whole portfolio cannot fund the
    // month plus its own tax, `net(A) < target` and limb 3 offers `net(A)` — everything it has — and
    // the limbs below it, and then `SHORTFALL_LINE`, deal with what is left. There is no case in
    // which the search is asked for an `x` that does not exist: `d ≤ net(A)` by the Waterfall's own
    // `min(available, outstanding)`, and `net` reaches `d` somewhere in `[d, A]`.
    //
    // **The tax figure grossed up for is the tax figure CHARGED**, because both come out of
    // `assessCapitalGainCharge` — the same function, the same accumulator shape, the same year to
    // date, the same household assessment. There is no second estimate of the liability anywhere in
    // this walk. The year-end true-up is untouched in kind: it sees a larger realised gain and a
    // larger charge, both through the accumulator `reportCapitalGainCharge` writes.
    const portfolioHeld = portfolioClaims.reduce<number>((total, claim) => total + claim.available, 0) as Cents;

    /**
     * **What a limb-3 draw of `gross` would sell, realise and be charged.** The allocation across the
     * claims is the Household's stated order, each share goes through `disposalOfAmount` — the SAME
     * arithmetic a stated `NON_SUPER_INVESTMENT` sell goes through — and each disposal's charge is
     * decided against `state`, which is the live accumulator when this is the real sale and a copy of
     * it when it is a probe.
     */
    const portfolioSaleOf = (
      gross: number,
      state: readonly GainAccumulator[],
      from: readonly (readonly Parcel[])[],
    ) => {
      let outstanding = gross;
      let parcels = from;
      let proceeds = 0;
      let tax = 0;
      const steps: { readonly claim: PortfolioClaim; readonly disposal: PortfolioDisposal; readonly charge: CapitalGainCharge | undefined }[] = [];
      for (const claim of portfolioClaims) {
        if (outstanding <= 0) break;
        const share = Math.min(claim.available, outstanding) as Cents;
        outstanding -= share;
        const disposal = disposalOfAmount(claim.personIndex, share, date, parcels, DEFAULT_PARCEL_SELECTION);
        if (disposal === undefined) continue;
        parcels = disposal.parcelsAfter;
        proceeds += disposal.proceeds;
        const charge = assessCapitalGainCharge(state, claim.personIndex, disposal.realisations, date);
        tax += chargedTotal(charge);
        steps.push({ claim, disposal, charge });
      }
      return { proceeds: proceeds as Cents, tax: tax as Cents, net: (proceeds - tax) as Cents, parcels, steps };
    };

    /** The same sale, asked about rather than made: a COPY of the year's accumulators, nothing kept. */
    const probePortfolioSale = (gross: number) =>
      portfolioSaleOf(
        gross,
        capitalGains.map((held) => ({
          fy: held.fy,
          realisations: [...held.realisations],
          reformed: [...held.reformed],
          charged: held.charged,
          minimumTaxCharged: held.minimumTaxCharged,
        })),
        balances.map((held) => held.parcels),
      );

    /**
     * **`net(A)` — what limb 3 can contribute to this month's target after paying for itself.**
     * Computed for every month that holds a parcel, drawn on or not, because it is the figure the
     * limb REPORTS as well as the figure it can draw: a note saying the portfolio offers its whole
     * market value would be saying something this walk has stopped believing.
     */
    // (The `> 0` is a COST guard and not a correctness one: `portfolioSaleOf(0, …)` breaks on its
    // first claim and returns nil anyway, and a Household holding nothing has no claims to break on.
    // Deleting it breaks no test, which is measured and is the right answer — offering ONE CENT here
    // instead breaks 394, which is what defends the parcel-free walk.)
    const portfolioOffer = portfolioHeld > 0 ? probePortfolioSale(portfolioHeld).net : toCents(0);

    /**
     * **A sale that funds `needed` and the tax it causes** — the least one before 1 July 2027, and
     * from then within a dollar of it (Div 119's whole-dollar floor). The two phases, and the proof
     * of both, are in the block above. `ceiling` is what the claims hold: the search never proposes a sale
     * larger than the portfolio, and never has to, because `needed ≤ net(ceiling)` at every call.
     */
    const grossedUpSale = (needed: Cents, ceiling: Cents): Cents => {
      let standing: number = needed;
      for (let step = 0; step < GROSS_UP_FIXED_POINT_STEPS; step += 1) {
        const next = needed + probePortfolioSale(standing).tax;
        if (next === standing) return standing as Cents;
        if (next < standing || next > ceiling) break;
        standing = next;
      }
      let low: number = needed;
      let high: number = ceiling;
      while (low < high) {
        const middle = low + Math.floor((high - low) / 2);
        if (probePortfolioSale(middle).net >= needed) high = middle;
        else low = middle + 1;
      }
      return low as Cents;
    };

    // **LIMB 5'S CLAIMS — released superannuation, offered LAST (2026-09-19).**
    //
    // **The balances are read off `balances` and NOT off `householdThisMonth`, and that is what
    // makes the double-draw unwriteable.** `householdThisMonth` is the month's OPENING position,
    // taken before this tick's `LUMP_SUM_FROM_SUPER` entries ran; `balances` is the live array the
    // entry loop above has already written its withdrawal back into. So a household that states an
    // entry for the whole of an interest has nothing left to offer this limb in the same month, by
    // construction rather than by a flag — and a partial entry leaves exactly the remainder.
    //
    // **Every gate is `superLumpSum.ts`'s and none is re-derived here** (`releasedSuperannuationOffer`
    // → `lumpSumGate`, the same one `superLumpSumWithdrawal` throws out of). What is decided HERE is
    // only what the walk knows and that module cannot: whose interest it is, which one, what it
    // holds this month, and the Person's REAL cessation — `retiredOn`, the same fact the entry path
    // states, and the reason a closed gate must be a nil offer rather than a throw: a `RETIRE` before
    // Preservation Age puts `CessationBeforePreservationAgeError` in the path of a hundred
    // consecutive months of a household that asked for nothing.
    const releasedSuperClaims: ReleasedSuperClaim[] = [];
    household.persons.forEach((person, personIndex) => {
      if (personIndex === deceasedNow) return; // P12-1: their accounts were paid out at the death.
      person.superInterests.forEach((_interest, slot) => {
        const partly = releasedWhileBackAtWork(personIndex, slot);
        const heldInSlot = balances[personIndex]?.superInterestBalances[slot] as Cents;
        const phase = effectivePhaseFor(personIndex, slot, date);
        const offer = releasedSuperannuationOffer({
          personName: person.name,
          dateOfBirth: person.dateOfBirth,
          on: date,
          gainfulEmployment: partly?.gainfulEmployment ?? gainfulEmploymentAsAt(personIndex),
          slot,
          phase,
          balance: partly === undefined ? heldInSlot : Math.min(partly.released, heldInSlot) as Cents,
        });
        // RF-2: a TTR started after the return is offered nothing, and its own note says why.
        const note = partly === undefined || phase === 'ttr' || offer.note === underTaxFreeAgeClaimNote(person.name) ? offer.note : releasedInPartClaimNote(person.name, slot);
        releasedSuperClaims.push({ personIndex, slot, available: offer.available, note });
      });
    });

    const result = drawWaterfall(target, {
      salary: {
        available: netIncome,
        note: 'salary and the Age Pension where assessed, less the income tax on them',
      },
      ...unfundedMiddleLimbs(householdThisMonth),
      // **LIMB 2, funded from chunk 5b, and split in two on 2026-09-23.** The order of this object's
      // keys is irrelevant — `drawWaterfall` iterates `WATERFALL_LIMBS` and nothing else — but the
      // override is written AFTER the spread so that the nil note and the funded figure cannot both
      // be in force. The two halves read the SAME claims: what is still owed of the minimum, and the
      // rest of the balance.
      accountBasedPensionMinimum: accountBasedPensionMinimumLimb(householdThisMonth, fy, pensionClaims),
      accountBasedPensionAboveMinimum: accountBasedPensionAboveMinimumLimb(householdThisMonth, fy, pensionClaims),
      // **LIMB 3, funded from chunk 6.** Written AFTER the spread for the same reason limb 2's
      // override is: the nil note and the funded figure cannot both be in force.
      nonSuperPortfolio: nonSuperPortfolioLimb(householdThisMonth, portfolioClaims, portfolioOffer),
      // **THE RUNNING CASH, split at what is owed on the home loan (2026-09-23).** `openingBalance`
      // IS the Offset Account: it is where a surplus month's cash goes and where a deficit month's
      // cash comes from, seeded from `Household.openingOffsetBalance` (P4-3b). Any
      // `LUMP_SUM_FROM_SUPER` this month paid into it is added: its line is already in `lines`
      // above, so the cash genuinely is in the running balance by now. The split is `loanOwing`, the
      // one figure the interest on running cash above is paid on, so a dollar spent early is a
      // dollar that was earning the cash rate and a dollar kept back is one cancelling loan interest.
      // **Except in a `MORTGAGE_PAYOFF` month (2026-09-24):** the payoff clears the loan within this
      // tick, so no cash is left offsetting anything — the split is at the CLOSING balance, nil.
      // Splitting at `loanOwing` there held the cash back behind the portfolio and the pension.
      ...cashLimbs(
        subCents(addCents(openingBalance, withdrawnFromSuper), paidFromSetAside),
        (mortgagePayoffEntryId !== undefined ? (mortgageThisMonth?.closingBalance ?? 0) : loanOwing) as Cents,
      ),
      // **LIMB 5, and it is LAST for the reason written out at `WATERFALL_LIMBS`** — a last-resort
      // limb in a last-resort position. It offers what `superLumpSum.ts`'s gate has already passed
      // and it is reached only where the limbs above it left something outstanding.
      releasedSuperannuation: releasedSuperannuationLimb(releasedSuperClaims),
    });

    // **P14-18b — the RAD refusal, moved here from the cash-only check it used to be.** A RAD lump
    // sum is folded into `target` above, so `result.shortfall` is now the true test of "can the
    // WHOLE Waterfall fund it", covering salary, both pension limbs, the Non-Super Portfolio,
    // running cash and a released superannuation lump sum — not running cash alone. Gated to a
    // month a RAD is actually due (`radPaidThisMonth > 0`): a household with an unrelated shortfall
    // in a month with no RAD due still gets the ordinary `Unfunded shortfall` line below, unchanged.
    // Thrown before any write-back below runs, on `mortgageMonthOrRefuse`'s own precedent for a
    // refusal caught where the entry id and the month are both in scope.
    if (radPaidThisMonth > 0 && result.shortfall > 0) {
      const radEntries = household.persons
        .map((_person, personIndex) => careEnteredThisMonth[personIndex])
        .filter((entered): entered is EnterCareEntry => entered !== undefined && entered.params.radPaidAsLumpSum > 0);
      const ids = radEntries.map((entered) => entered.id).join(', ');
      throw new RadPaymentUnfundedError(
        `${ids.length > 0 ? `entry ${ids} (ENTER_CARE)` : 'an ENTER_CARE entry'} pays a Refundable Accommodation Deposit lump sum of ${radPaidThisMonth} cents in ${month}, and the Waterfall could fund only ${result.funded} of the ${result.target} cents this month needed in full: a RAD payment that cannot be funded in full is refused rather than left as an "${SHORTFALL_LINE}"`,
        month,
      );
    }

    if (homeBoughtThisMonth !== undefined && result.shortfall > 0) {
      throw new HomePurchaseUnfundedError(
        `entry ${homeBoughtThisMonth.id} (BUY_HOME) buys a home for ${homePurchaseThisMonth} cents in ${month}, price and costs, ${paidFromSetAside} of it from the sale's set-aside, and the Waterfall could fund only ${result.funded} of the ${result.target} cents this month needed: a purchase that cannot be paid in full is refused rather than left as an "${SHORTFALL_LINE}"`,
        month,
      );
    }

    if (downsizerThisMonth > 0 && result.shortfall > 0) {
      throw new DownsizerContributionUnfundedError(
        `entry ${downsizersThisMonth.map((entry) => entry.id).join(', ')} (DOWNSIZER_CONTRIBUTION) pays ${downsizerThisMonth} cents into super in ${month}, ${paidFromSetAside} of the month's outgoings from the sale's set-aside, and the Waterfall could fund only ${result.funded} of the ${result.target} cents this month needed: a contribution that cannot be paid in full is refused rather than left as an "${SHORTFALL_LINE}"`,
        month,
      );
    }

    // **AND ALL FOUR LIMBS REPORT — P4-4's polish.** `available`, `drawn` and `note` are computed
    // for every limb by `drawWaterfall` and were read for two of them and discarded; they are the
    // month's output now. One note per limb, in `WATERFALL_LIMBS` order, whether or not it drew:
    // *"this Household has no Account-Based Pension"* and *"this limb is not built"* are different
    // facts, `unfundedMiddleLimbs` has three answers for limb 2 alone, and until this line every one
    // of them lived for the length of a tick and died here.
    notes.push(...waterfallLimbNotes(result));

    // **THE DRAW, ALLOCATED BACK — and this is where the line and the write-back become ONE change.**
    // `drawn` is what the Waterfall took from limb 2; it is spread over the claims in the order they
    // were offered, and each interest's share is used TWICE and computed ONCE: it becomes a
    // `MonthLine` here and it is subtracted from that interest's balance at the end of the tick. A
    // share that moved a balance without a line would leave chunk 4's reconciliation true and
    // meaningless, so neither half can be written without the other.
    // **Both pension limbs are allocated back over the SAME claims**: the first limb's draw against
    // each account's `towardMinimum`, the second's against the rest of its balance. The second can
    // draw only once the first is exhausted, so no account is ever asked for more than it holds.
    const drawnOf = (limb: WaterfallLimb): Cents => {
      const draw = result.draws.find((candidate) => candidate.limb === limb);
      if (draw === undefined) throw new RangeError(`the Waterfall did not report the ${limb} limb`);
      return draw.drawn;
    };
    const drawnPerInterest: number[][] = household.persons.map((person) => person.superInterests.map(() => 0));
    for (const [limb, capacityOf] of [
      ['accountBasedPensionMinimum', (claim: PensionClaim) => claim.towardMinimum],
      ['accountBasedPensionAboveMinimum', (claim: PensionClaim) => claim.available - claim.towardMinimum],
    ] as const) {
      let toAllocate: number = drawnOf(limb);
      for (const claim of pensionClaims) {
        if (toAllocate <= 0) break;
        const share = Math.min(capacityOf(claim), toAllocate);
        toAllocate -= share;
        const row = drawnPerInterest[claim.personIndex];
        if (row !== undefined) row[claim.slot] = (row[claim.slot] ?? 0) + share;
        const held = pensionYears[claim.personIndex]?.[claim.slot];
        if (held !== undefined) held.remaining = Math.max(0, held.remaining - share) as Cents;
      }
      // **A THIRD DECLARED SURVIVOR, in chunk 4's own style, and unreachable for a provable reason.**
      // `drawWaterfall` takes `min(available, outstanding)` from each pension limb, and `available`
      // is the sum of `capacityOf` over `pensionClaims`, so the draw is at most that sum — and the
      // loop above hands out `min(capacityOf(claim), toAllocate)` from each claim in turn, which
      // exhausts `toAllocate` before it runs out of claims. Deleting this `throw` fails **ZERO**
      // tests and always will, for as long as those two facts hold. It is written because it is what
      // makes the line total and the write-back total provably the SAME number, and it is recorded
      // as unreachable rather than defended with a fixture that proves nothing.
      if (toAllocate !== 0) {
        throw new RangeError(`${month}: ${toAllocate} cents of the ${limb} draw were not allocated to an interest`);
      }
    }

    // **THE FLOOR, SWEPT — reg 1.06(9A)(a)'s payment that nobody needs, made anyway.**
    // The loop above paid what the household NEEDED. This pays what the LAW requires on top of it,
    // in the last month of the financial year and nowhere else, out of what each account has left
    // after that need was met. Where the household has already drawn the whole minimum — the
    // ordinary case now that the limb offers its balance — `remaining` is nil and this sweeps
    // nothing at all.
    //
    // **Where the money goes is settled by precedent and is not a new decision:** the payment is an
    // inflow like any other, so it reaches `closingBalance` through the same reconciliation, and
    // `closingBalance` IS the Offset Account (P4-3b). It is exactly what limb 1's surplus already
    // does in a month the wage exceeds the target. There is nowhere else in this model for it to be,
    // and inventing somewhere would be inventing an account.
    household.persons.forEach((person, personIndex) => {
      if (personIndex === deceasedNow) return; // P12-1: their accounts were paid out at the death.
      person.superInterests.forEach((interest, slot) => {
        if (!isAccountBasedPension(effectivePhaseFor(personIndex, slot, date))) return;
        const held = pensionYears[personIndex]?.[slot];
        if (held === undefined || held.fy !== fy) return;
        const row = drawnPerInterest[personIndex];
        const alreadyDrawn = row?.[slot] ?? 0;
        const stillHeld = ((balances[personIndex]?.superInterestBalances[slot] as Cents) - alreadyDrawn) as Cents;
        const due = minimumStillDueThisMonth(held.remaining, stillHeld, month === finalMonthOfTheYear);
        if (due <= 0) return;
        held.remaining = (held.remaining - due) as Cents;
        if (row !== undefined) row[slot] = alreadyDrawn + due;
      });
    });

    // **ONE LINE PER INTEREST PER MONTH, and it carries the whole of that interest's payment** —
    // what the household needed plus what the law required. The two halves are decided separately
    // and reported together because they are one payment out of one account: a member's fund makes a
    // pension payment, not a "needed" one and a "compliance" one. The line is still HALF of one
    // change — the other half is the write-back at the end of the tick, off the very same
    // `drawnPerInterest` figure, so a balance can never move without a line to explain it.
    household.persons.forEach((person, personIndex) => {
      person.superInterests.forEach((_interest, slot) => {
        const amount = drawnPerInterest[personIndex]?.[slot] ?? 0;
        if (amount <= 0) return;
        lines.push(
          Object.freeze({
            direction: 'inflow',
            effect: 'cash',
            description: superPaymentDescription(PENSION_MINIMUM_LINE, person),
            amount: amount as Cents,
            provenance: PENSION_MINIMUM_PROVENANCE,
            attribution: UNATTRIBUTED.pensionMinimum,
          }),
        );
      });
    });

    // --- P3-22h step 2: THE NON-SUPER PORTFOLIO'S DISTRIBUTION, REINVESTED -------------------------
    //
    // **Once a year, in the SAME final month the pension floor above sweeps — precedent, not a
    // second date.** `distributionFromPortfolio` is `payoutRate × the Person's own held parcels'
    // market value`, computed BEFORE this month's own growth for the reason its own doc gives; the
    // Person's holding is `balances[personIndex]`, the same split every capital-gains disposal
    // already reads per Person (P3-21c: a parcel is owned by being in ONE Person's array).
    //
    // **Absent `Settings.investmentPayoutRate` ⇒ this whole block does not run.** `balances`,
    // `notes` and `taxYearToDate` are exactly what they were before step 2 existed — the zero
    // fixture-churn step 1 promised, and step 2's own proof of it (see
    // `test/core-investment-distribution.test.mjs`).
    if (settings.investmentPayoutRate !== undefined && month === finalMonthOfTheYear) {
      const payoutRate = settings.investmentPayoutRate;
      // Captured into a local `const`, on `reportCapitalGainCharge`'s own idiom just below: a
      // closure over the outer `let taxYearToDate` cannot be trusted narrowed, so the accumulator
      // this block writes to is re-checked here rather than asserted.
      const year = taxYearToDate;
      household.persons.forEach((person, personIndex) => {
        const held = balances[personIndex];
        if (held === undefined) return;
        const distribution = distributionFromPortfolio(held.parcels, payoutRate);
        if (distribution <= 0) return;
        held.parcels = parcelsAfterDistribution(held.parcels, distribution);
        // **The year this belongs to is settled the following July, on `TAX_TRUE_UP_LINE`'s own
        // conventions — INCLUDING the gap those conventions already accept.** A distribution paid
        // in a walk's first, PARTIAL financial year is never taxed: `completed.months ===
        // MONTHS_IN_A_FINANCIAL_YEAR` refuses the settlement outright (chunk 3b's own refusal,
        // unchanged, and this accumulator is simply discarded with the rest of `taxYearToDate` when
        // it fails). For a capital gain that refusal only ever drops a RESIDUAL, because the gain is
        // charged in cash at the disposal regardless of the year's completeness; a distribution has
        // no such event-time charge, so the WHOLE of a first-partial-year distribution goes untaxed.
        // UNDER-states the household, and it is accepted rather than closed for chunk 3b's own
        // reason: assessing a part-year invents either a year's income or a year's rate scale.
        if (year !== undefined && year.fy === fy) {
          year.distributed[personIndex] = addCents(year.distributed[personIndex] ?? toCents(0), distribution);
        }
        notes.push(
          Object.freeze({
            subject: 'investment distribution' as const,
            person: person.name,
            distributed: distribution,
            note: investmentDistributionNoteText(person.name, distribution, payoutRate, settings.investmentPayoutFrankedShare),
          }),
        );
      });
    }

    // --- P3-42 step 2: SUPER'S INCOME SHARE, ACCUMULATED FOR THE YEAR-END TRUE-UP ------------------
    //
    // Same shape as the block just above and the same reason: once a year, in the SAME final month,
    // BEFORE this month's own growth. `superIncomeYieldFor` is `Settings.superIncomeYieldRate ×
    // balance` — the income share; the untaxed remainder is the rest of the balance, left alone.
    // Nothing about GROWTH changes here: the whole balance still compounds at
    // `Settings.nominalReturn` this month and every month, because the split below answers a TAX
    // question about what already grew, not a smaller return.
    //
    // **Absent `Settings.superIncomeYieldRate` ⇒ this whole block does not run.** `balances`,
    // `notes` and `taxYearToDate` are exactly what they were before this step existed — the
    // zero-churn step 1 promised, and this is step 2's own proof of it.
    if (settings.superIncomeYieldRate !== undefined && month === finalMonthOfTheYear) {
      const incomeYieldRate = settings.superIncomeYieldRate;
      const year = taxYearToDate;
      household.persons.forEach((person, personIndex) => {
        const held = balances[personIndex];
        if (held === undefined) return;
        person.superInterests.forEach((_interest, slot) => {
          const balance = held.superInterestBalances[slot] ?? toCents(0);
          const yieldAmount = superIncomeYieldFor(balance, incomeYieldRate);
          if (yieldAmount <= 0) return;
          // **The year this belongs to is settled the following July**, on the SAME
          // first-partial-year gap chunk 3b's own refusal already accepts for the payout block just
          // above: `completed.months === MONTHS_IN_A_FINANCIAL_YEAR` discards a part year's
          // accumulator with the rest of `taxYearToDate`, so an income share accrued in a walk's
          // first, partial financial year goes untaxed. UNDER-states the household, the conservative
          // direction, and the reason is the same: assessing a part-year invents either a year's
          // earnings or a year's rate scale.
          if (year !== undefined && year.fy === fy) {
            const row = year.superYield[personIndex] as Cents[];
            row[slot] = addCents(row[slot] ?? toCents(0), yieldAmount);
          }
        });
      });
    }

    // **LIMB 3'S DRAW, ALLOCATED BACK — and this is where the limb stops being a promise (chunk 6).**
    //
    // `drawn` is what the Waterfall took from limb 3; it is spread over the claims in the order they
    // were offered — the Household's own stated order, the same rule limb 2's allocation takes — and
    // each Person's share is then put through `disposalOfAmount`, which is the SAME arithmetic a
    // stated `NON_SUPER_INVESTMENT` sell goes through. The share is used twice and computed once: it
    // becomes a `PORTFOLIO_SALE_LINE` inflow here and it is the parcels written back here, off the
    // one `disposal` object, so no parcel can leave a portfolio without a line to explain it.
    //
    // **The selection rule is `DEFAULT_PARCEL_SELECTION` and it CANNOT be anything else.** P3-21a's
    // override lives on `NonSuperInvestmentSellParams` and an automatic draw has no entry to carry
    // one; FIFO is the registry default and the ruling of 2026-09-17, and inventing a second, hidden
    // selection policy for the automatic path is exactly the ADR-0004 failure — a model disposing
    // rather than proposing.
    //
    // **The disposal day is `date`, the first day of the month**, which is the day this month's
    // balances are as at and the day the means test was assessed on a few lines above. The parcels
    // have not grown yet this tick (growth runs at the end of it), so the proceeds are the market
    // value the parcel carried when the month OPENED — the same pricing an entry-driven sell gets,
    // and the same day the discount's *more than 12 months* is measured to.
    //
    // **The tax goes through `assessCapitalGainCharge` and nowhere else**, so a Person who draws here
    // AND sells by a stated entry later in this very month is assessed ONCE, on the union of both
    // disposals' realisations for the financial year.
    //
    // ⚠️ **THE SALE IS GROSSED UP TO FUND ITS OWN TAX (P10-4, 2026-09-21).** `drawn` is what the
    // Waterfall is counting on limb 3 for; `grossedUpSale` is what has to be SOLD to hand over that
    // much after the capital gains tax the sale itself causes. The draw and the sale are therefore
    // two different figures for the first time, and the difference is the tax, to the cent. The
    // method and the proof that it terminates are at the block headed *THE SALE FUNDS ITS OWN TAX*,
    // above.
    const portfolioDraw = result.draws.find((draw) => draw.limb === 'nonSuperPortfolio');
    if (portfolioDraw === undefined) throw new RangeError('the Waterfall did not report the Non-Super Portfolio limb');
    if (portfolioDraw.drawn > 0) {
      const sale = portfolioSaleOf(
        grossedUpSale(portfolioDraw.drawn, portfolioHeld),
        // The LIVE accumulator: this is the sale, not a probe, so the realisations belong to the year.
        capitalGains,
        balances.map((held) => held.parcels),
      );
      // **THE CONSERVATION IDENTITY, ASSERTED IN THE ENGINE AND NOT ONLY IN A FIXTURE: the proceeds
      // of an automatic sale, less the tax that sale is charged, are what the Waterfall drew.** It is
      // an equality in every month whose parcels all realise a gain and are sold before 1 July 2027; a
      // parcel realising a LOSS can make the year's tax FALL as the sale grows, and so, by a cent, can
      // the floored indexed cost base from 1 July 2027, and by up to a dollar either way Div 119's
      // whole-dollar gap. There the sale found can cover a little more than the draw, which lands in
      // the running cash as a surplus. So the test is `<`, and
      // what it forbids is the defect this work closed: a month that sold to NEED and then met a tax
      // bill it had set nothing aside for.
      //
      // **It is a DECLARED SURVIVOR and it has been measured as one:** making this branch
      // unreachable breaks ZERO tests, because `grossedUpSale` cannot return an `x` with
      // `net(x) < needed` — the fixed point exits only on equality and the bisection keeps
      // `net(high) >= needed` as its invariant — and `needed <= net(A)` holds by the Waterfall's own
      // `min(available, outstanding)` against an offer that IS `net(A)`. It is written because it is
      // what makes the identity a fact about this walk rather than a fact about the search, and it
      // is recorded as unreachable rather than defended with a fixture that proves nothing.
      if (sale.net < portfolioDraw.drawn) {
        throw new RangeError(
          `${month}: an automatic sale of ${sale.proceeds} cents was charged ${sale.tax} of capital gains tax and so funded only ${sale.net} of the ${portfolioDraw.drawn} the Waterfall drew from limb 3`,
        );
      }
      balances.forEach((held, personIndex) => {
        held.parcels = sale.parcels[personIndex] as readonly Parcel[];
      });
      // One line per Person who sold, and the charge reported immediately after it — the same order
      // the two happened in, and the same `sale.steps` the parcels were written back from, so no
      // parcel can leave a portfolio without a line to explain it and no charge can be reported that
      // no sale caused.
      sale.steps.forEach((step) => {
        lines.push(
          Object.freeze({
            direction: 'inflow',
            effect: 'cash',
            description: portfolioSaleDescription((household.persons[step.claim.personIndex] as Person).name),
            amount: step.disposal.proceeds,
            provenance: UNLEGISLATED.portfolioSale,
            // ⚠️ **NOT the stated sell's attribution, and the two lines share a description.** This
            // one is the Waterfall's own draw: no entry told the Household to sell. The entry-driven
            // sell in chunk 4 below cites its `NON_SUPER_INVESTMENT`, and a walk in which these two
            // agreed would mean the automatic path had acquired an author.
            attribution: NO_STATING_ENTRY.automaticPortfolioSale,
          }),
        );
        reportCapitalGainCharge(step.claim.personIndex, step.charge);
      });
    }

    // **LIMB 5'S DRAW, ALLOCATED BACK — and the money finally comes out of super without an entry
    // to ask for it (2026-09-19).**
    //
    // `drawn` is what the Waterfall took from limb 5, and it is spread over the claims in the
    // Household's own stated order — the same ordering rule limbs 2 and 3 take, and for the same
    // reason: a pro-rata split across two interests would need a second rounding decision to answer
    // a question nobody asked.
    //
    // **Each share goes through `superLumpSumWithdrawal`, which is the ENTRY's own priced
    // withdrawal and not a copy of it.** So the gate runs a second time on the very money the offer
    // was made from — and if the offer and the gate ever disagreed, this walk would throw rather
    // than draw, which is the cheapest possible detector for a drifted limb. The tax comes back
    // asserted at nil with its taxed-source assumption, and it reaches the month as a note.
    //
    // **The write-back is through `balances[personIndex].superInterestBalances[slot]`, the ONE
    // seam** limbs 2 and 3 and the entry all use: `splitAssets`, `accessibleWealth`, this month's
    // growth line and next month's opening balance all read that array, so there is no second copy
    // of the balance to keep in step and no balance can move without the line beside it.
    //
    // **The line and the note are half of one change each**, exactly as `SUPER_LUMP_SUM_LINE` says:
    // the line is pushed off the same `SuperWithdrawal` object the balance is written back from.
    const releasedSuperDraw = result.draws.find((draw) => draw.limb === 'releasedSuperannuation');
    if (releasedSuperDraw === undefined) throw new RangeError('the Waterfall did not report the released superannuation limb');
    let toWithdraw: number = releasedSuperDraw.drawn;
    for (const claim of releasedSuperClaims) {
      if (toWithdraw <= 0) break;
      if (claim.available <= 0) continue;
      const share = Math.min(claim.available, toWithdraw) as Cents;
      toWithdraw -= share;
      const person = household.persons[claim.personIndex] as Person;
      const held = balances[claim.personIndex] as { superInterestBalances: Cents[] };
      const partly = releasedWhileBackAtWork(claim.personIndex, claim.slot);
      const heldInSlot = held.superInterestBalances[claim.slot] as Cents;
      const withdrawal = superLumpSumWithdrawal({
        personName: person.name,
        dateOfBirth: person.dateOfBirth,
        on: date,
        gainfulEmployment: partly?.gainfulEmployment ?? gainfulEmploymentAsAt(claim.personIndex),
        slot: claim.slot,
        phase: effectivePhaseFor(claim.personIndex, claim.slot, date),
        balance: partly === undefined ? heldInSlot : Math.min(partly.released, heldInSlot) as Cents,
        requested: share,
      });
      held.superInterestBalances[claim.slot] = subCents(heldInSlot, withdrawal.paid);
      drawReleased(claim.personIndex, claim.slot, withdrawal.paid);
      clampReleased(claim.personIndex, claim.slot);
      lines.push(
        Object.freeze({
          direction: 'inflow',
          effect: 'cash',
          description: superPaymentDescription(SUPER_LUMP_SUM_LINE, person),
          amount: withdrawal.paid,
          provenance: UNLEGISLATED.automaticSuperWithdrawal,
          // ⚠️ **NOT the stated withdrawal's attribution, and the two lines share a description** —
          // limb 3's automatic sale precedent, word for word. This one is the Waterfall's own draw:
          // no entry told the household to withdraw. A walk in which these two agreed would mean
          // the automatic path had acquired an author.
          attribution: NO_STATING_ENTRY.automaticSuperWithdrawal,
        }),
      );
      // **The note appears in the months this limb DRAWS and in no others.** A `WaterfallLimbNote`
      // already reports limb 5 every month, drawing or not, which is the every-month fact; this is
      // the per-withdrawal one, and it carries what a line cannot: the tax, nil and asserted, and
      // the taxed-source assumption underneath it.
      notes.push(
        Object.freeze({
          subject: 'super withdrawal',
          person: person.name,
          interestIndex: claim.slot,
          // No entry stated this one. `null` is the ONLY value that can appear here for an
          // automatic draw, and it is a different fact from an id — see `SuperWithdrawalNote`.
          entryId: null,
          requested: withdrawal.requested,
          paid: withdrawal.paid,
          taxWithheld: withdrawal.taxWithheld,
          note: withdrawal.taxNote,
        }),
      );
    }
    // **A FIFTH DECLARED SURVIVOR, in the style of limbs 2 and 3, and unreachable for the same
    // provable reason.** `drawWaterfall` takes `min(available, outstanding)` from limb 5, and
    // `available` is the sum of the claims' offers, so `releasedSuperDraw.drawn ≤ Σ claim.available`
    // — and the loop hands out `min(claim.available, toWithdraw)` from each claim in turn, which
    // exhausts `toWithdraw` before it runs out of claims. Deleting this `throw` fails ZERO tests
    // and always will, for as long as those two facts hold.
    if (toWithdraw !== 0) {
      throw new RangeError(`${month}: ${toWithdraw} cents of the released superannuation draw were not allocated to an interest`);
    }

    if (monthlySpend > 0) {
      // **THE HEADLINE OF THIS ITEM.** `spendingLevel` is defined here — `monthlySpend > 0` is
      // unreachable without it — and the id it carries is the `SPEND_CHANGE` that set the level,
      // which may have been dated decades before this month. That is the whole of what P4-4 left
      // the reader to guess at: month 200's spending row now names the 2019 entry itself.
      lines.push(
        Object.freeze({
          direction: 'outflow',
          effect: 'cash',
          description: HOUSEHOLD_SPENDING_LINE,
          amount: monthlySpend,
          provenance: UNLEGISLATED.spending,
          attribution: statedBy((spendingLevel as { readonly entryId: string }).entryId),
        }),
      );
    }
    // --- P3-16 slice 1: THE HOME LOAN, PAID — and the write-back is the other half of it ---------
    //
    // **TWO lines, and they sum to the repayment by construction.** `PORTFOLIO_PURCHASE_LINE` and
    // `PORTFOLIO_BROKERAGE_LINE`'s precedent, taken for the same reason: both halves are read off
    // the ONE `MortgageMonth` the balance is written back from, so the cash and the balance are one
    // change. One merged line would be a constant figure on the screen every month for thirty years
    // with nothing to say why the loan is or is not shrinking — and the Offset Account's whole
    // effect, which is the reason this build prices a mortgage at all, is visible ONLY in the
    // interest half.
    //
    // **Both are `'cash'`.** The money leaves the Household and reaches the lender. The principal
    // half also extinguishes a debt, and this model cannot report that: ADR-0005 holds no value for
    // the home, so it holds no net position against it either, and the wealth figures therefore
    // fall by the whole repayment rather than by the interest alone. **Direction, stated: this
    // UNDER-states the household**, which is the side this build takes its residuals on.
    //
    // **A month that cannot afford it still pays it.** The repayment is in `target`, so the
    // Waterfall funds it like any other outflow and an `Unfunded shortfall` says what could not be
    // met. A mortgage that quietly went unpaid in a bad month would be the flattering answer.
    if (mortgageThisMonth !== undefined) {
      if (mortgageThisMonth.interest > 0) {
        lines.push(
          Object.freeze({
            direction: 'outflow',
            effect: 'cash',
            description: MORTGAGE_INTEREST_LINE,
            amount: mortgageThisMonth.interest,
            provenance: UNLEGISLATED.mortgage,
            // **P3-16 slice 2 — the entry that set the terms, where one did.** Written from the
            // very local the figures were priced off, so a repayment cannot be attributed to an
            // entry that did not set it; `undefined` is the Household's own stated loan, which no
            // entry states, and keeps slice 1's `'none'` record.
            attribution: mortgageEntryId === undefined ? NO_STATING_ENTRY.mortgage : statedBy(mortgageEntryId),
          }),
        );
      }
      if (mortgageThisMonth.principal > 0) {
        lines.push(
          Object.freeze({
            direction: 'outflow',
            effect: 'cash',
            description: MORTGAGE_PRINCIPAL_LINE,
            amount: mortgageThisMonth.principal,
            provenance: UNLEGISLATED.mortgage,
            // A payoff month's principal is the whole balance, and the entry that decided that
            // figure is the payoff, not the entry that set the terms. The interest above is still
            // the terms' own, priced as in any other month.
            attribution: mortgagePayoffEntryId !== undefined
              ? statedBy(mortgagePayoffEntryId)
              : mortgageEntryId === undefined ? NO_STATING_ENTRY.mortgage : statedBy(mortgageEntryId),
          }),
        );
      }
      // **The other half of the same change**, off the same object the lines were written from, so
      // the balance cannot fall by an amount no line reported. The month after this reaches nil,
      // `mortgageThisMonth` is `undefined` and the household pays nothing at all.
      mortgageBalance = mortgageThisMonth.closingBalance;
    }
    // One line per entry, not one summed line: two one-offs in a month are two facts the user stated
    // and `appliedEntryIds` cites both, so a single merged figure would be unauditable against them.
    for (const entry of oneOffs) {
      if (entry.params.amount > 0) {
        lines.push(
          Object.freeze({ direction: 'outflow', effect: 'cash', description: ONE_OFF_EXPENSE_LINE, amount: entry.params.amount, provenance: UNLEGISLATED.oneOff, attribution: statedBy(entry.id) }),
        );
      }
    }
    if (result.shortfall > 0) {
      lines.push(
        Object.freeze({ direction: 'inflow', effect: 'cash', description: SHORTFALL_LINE, amount: result.shortfall, provenance: UNLEGISLATED.shortfall, attribution: NO_STATING_ENTRY.shortfall }),
      );
    }

    // --- Chunk 3 (P3-21f): NON_SUPER_INVESTMENT — the BUY, and it is FUNDED or it does not happen --
    //
    // **Where the money comes from: the Waterfall's running cash, which IS the Offset Account**
    // (P4-3b — `Household.openingOffsetBalance` seeds it and `openingBalance` carries it).
    // The buy is an OUTFLOW against exactly the balance an `ONE_OFF_EXPENSE` is charged against, and
    // there is nowhere else in this model for the money to come from: inventing somewhere would be
    // inventing an account. Every decision the buy makes — whose it is, what day, what it cost, and
    // how much of it the month could fund — is `purchaseFromBuy`'s, where the trap it exists for and
    // the precedent that settles an unfunded buy are written out.
    //
    // **AFTER the Waterfall rather than inside it, and that is a decision.** A buy is not a spending
    // target: folding it in would make an `Unfunded shortfall` — the line P4-5 reads the Shortfall Age
    // off — appear because the Household chose to invest, reporting a household that cannot eat when
    // what happened is that it moved money between two of its own pockets. Spending is met first, and
    // the buy takes what is left. Where a shortfall was recorded there is nothing left by
    // construction, so a household that could not fund its groceries buys no ETFs.
    const purchases: PortfolioPurchase[] = [];
    for (const entry of entriesThisMonth) {
      if (entry.type !== 'NON_SUPER_INVESTMENT') continue;
      // --- Chunk 4 (P3-21f): the SELL, and it happens HERE rather than at the end of the month ----
      //
      // **A sold parcel does not earn the month's return.** The month's growth runs at the end of
      // the tick, below, over whatever is left after this — so a disposal is priced at the market
      // value the parcel carried when the month OPENED, which is the same value the means test was
      // assessed on at the top of this month, and the parcel is gone before the return is applied.
      // The mirror of a purchase, which lands AFTER the growth and so earns nothing in its own month.
      //
      // **The proceeds are an INFLOW into the running cash**, exactly where a surplus wage and limb
      // 1's surplus already go, and they are available to a buy dated later in the same month
      // because this loop takes the entries in the Household's stated order.
      //
      // ⚠️ **This is an ENTRY-driven disposal and it is NOT limb 3.** The Waterfall has already run,
      // above, and its third limb still draws nil with its refusal note word for word — a household
      // that is short does not reach for its portfolio here, it reaches for it in chunk 6. What this
      // is, is a user who stated a sale.
      if (nonSuperInvestmentDirection(entry) === 'sell') {
        const disposal = disposalFromSell(entry, household, balances.map((held) => held.parcels));
        if (disposal === undefined) continue;
        balances.forEach((held, personIndex) => {
          held.parcels = disposal.parcelsAfter[personIndex] as readonly Parcel[];
        });
        lines.push(
          Object.freeze({
            direction: 'inflow',
            effect: 'cash',
            description: portfolioSaleDescription((household.persons[disposal.personIndex] as Person).name),
            amount: disposal.proceeds,
            provenance: UNLEGISLATED.portfolioSale,
            attribution: statedBy(entry.id),
          }),
        );
        // --- Chunk 5 (P3-21f): the gain reaches the tax bases ------------------------------------
        //
        // The whole of it is `chargeCapitalGain`, above — the SAME function and the SAME per-Person,
        // per-financial-year accumulator limb 3's automatic draw goes through. A Person who both
        // drew the portfolio automatically and sold it by a stated entry in the one month is
        // assessed ONCE, on the union of the two disposals' realisations.
        chargeCapitalGain(disposal.personIndex, disposal.realisations, entry.date);
        continue;
      }
      // The cash the month has left at this point: the opening balance plus every line so far. It is
      // `closingBalance` as it stands here, recomputed below from the same `lines` — so a purchase
      // can never move one of the two without moving the other.
      const cash = lines.reduce<number>(
        (balance, line) => balance + cashMovement(line),
        openingBalance,
      ) as Cents;
      const purchase = purchaseFromBuy(entry, household, cash);
      if (purchase === undefined) continue;
      purchases.push(purchase);
      // **ONE LINE PER ENTRY, not one summed line** — the rule the one-off expenses above already
      // follow: two buys in a month are two facts the user stated and `appliedEntryIds` cites both.
      // The name is the Person the parcel went to, read off the same `personIndex` the parcel is
      // written with, so a parcel that landed on the wrong portfolio says so in the month's lines.
      //
      // ⚠️ **TWO LINES PER BUY SINCE P4-4's POLISH, AND THEY SUM TO `funded` BY CONSTRUCTION.** The
      // purchase line carries the UNITS — `parcel.marketValue`, the money that became an asset — and
      // the fee gets `PORTFOLIO_BROKERAGE_LINE` of its own. Both halves are read off the ONE
      // `PortfolioPurchase` the parcel was written from, so the cash and the parcel are still the
      // single change `purchaseFromBuy`'s doc requires: `marketValue + incidentalCostsOfAcquisition
      // === funded` is the same arithmetic that built them. The superseded shape — *one outflow at
      // the gross figure* — is quoted in `PORTFOLIO_BROKERAGE_LINE` with what it cost.
      const buyerName = (household.persons[purchase.personIndex] as Person).name;
      lines.push(
        Object.freeze({
          direction: 'outflow',
          effect: 'cash',
          description: portfolioPurchaseDescription(buyerName),
          amount: purchase.parcel.marketValue,
          provenance: UNLEGISLATED.portfolioPurchase,
          attribution: statedBy(entry.id),
        }),
      );
      if (purchase.incidentalCostsOfAcquisition > 0) {
        lines.push(
          Object.freeze({
            direction: 'outflow',
            effect: 'cash',
            description: portfolioBrokerageDescription(buyerName),
            amount: purchase.incidentalCostsOfAcquisition,
            provenance: UNLEGISLATED.brokerage,
            // The fee is half of ONE purchase and carries the same entry as the units it bought.
            attribution: statedBy(entry.id),
          }),
        );
      }
    }

    // --- SPOUSE_CONTRIBUTION — after-tax cash into the OTHER Person's superannuation (P3-19) ------
    //
    // **Same funding rule as a `NON_SUPER_INVESTMENT` buy, and for the same reason.** This is a
    // movement between two of the Household's own pockets, not a living cost: it runs AFTER the
    // Waterfall and is capped at whatever cash is left, on `purchaseFromBuy`'s precedent, rather
    // than folded into the spending target and reported as an `Unfunded shortfall`.
    //
    // **The write-back is DIRECT, on `SALARY_SACRIFICE`'s own convention for money that does not
    // pass through a `PortfolioPurchase`-shaped record** — `held.superInterestBalances[slot]` moves
    // at the same statement the line is pushed at, so the balance cannot rise here without a line
    // that explains it. It is credited BEFORE the month's growth, matching the purchase convention:
    // money that arrives this month earns its first return next month.
    for (const entry of entriesThisMonth) {
      if (entry.type !== 'SPOUSE_CONTRIBUTION') continue;
      // **REFUSED BY NAME, on `LUMP_SUM_FROM_SUPER`'s precedent — the door is `parsePlan`, and
      // `project()` is called directly by every fixture in the suite.** `checkSpouseContributionTargets`
      // already refuses these at the door; this is the walk's own defence in depth, not a duplicate
      // of the door's message.
      if (entry.owner === 'household') {
        throw new RangeError(
          `entry ${entry.id} (SPOUSE_CONTRIBUTION) is owned by the household, and a contribution into a spouse's superannuation is made by one Person into the OTHER Person's own interest: state it against personA or personB`,
        );
      }
      const contributorIndex = entry.owner === 'personA' ? 0 : 1;
      const contributor = household.persons[contributorIndex];
      const receivingIndex = 1 - contributorIndex;
      const receiver = household.persons[receivingIndex];
      if (contributor === undefined || receiver === undefined) {
        throw new RangeError(
          `entry ${entry.id} (SPOUSE_CONTRIBUTION) is owned by ${entry.owner}, and this Household has ${household.persons.length} Person(s): there is no spouse for the contribution to go to`,
        );
      }
      const slot = entry.params.receivingInterestIndex;
      const interest = receiver.superInterests[slot];
      if (interest === undefined) {
        throw new RangeError(
          `entry ${entry.id} (SPOUSE_CONTRIBUTION) names superannuation interest ${slot} of ${receiver.name}'s, and ${receiver.name} holds ${receiver.superInterests.length}: the interest is stated positionally and this position is not one of them`,
        );
      }
      refuseContributionAfterSwitch(receivingIndex, slot, date, `A spouse contribution (entry ${entry.id})`);
      // The cash the month has left at this point — `purchaseFromBuy`'s own reading, recomputed
      // fresh for each entry so a contribution dated later in the same month sees what an earlier
      // one in it already spent.
      const cashOnHand = lines.reduce<number>((balance, line) => balance + cashMovement(line), openingBalance) as Cents;
      const funded = Math.min(entry.params.amount, Math.max(0, cashOnHand)) as Cents;
      if (funded <= 0) continue; // nothing to pay with, so nothing was paid, and no line says one was.
      const held = balances[receivingIndex];
      if (held === undefined) continue; // unreachable while `balances` is built one-for-one with `household.persons`.
      held.superInterestBalances[slot] = addCents(held.superInterestBalances[slot] ?? toCents(0), funded);
      lines.push(
        Object.freeze({
          direction: 'outflow',
          effect: 'cash',
          description: spouseContributionDescription(contributor.name, receiver.name),
          amount: funded,
          provenance: UNLEGISLATED.spouseContribution,
          attribution: statedBy(entry.id),
        }),
      );
      // The year's running total, read at the financial year's own true-up (`asSaptoPerson`'s
      // `spouseContributionMade`) — nil in the monthly accrual, on `distributed`'s own footing.
      const year = taxYearToDate;
      if (year !== undefined && year.fy === fy) {
        year.spouseContributionsMade[contributorIndex] = addCents(
          year.spouseContributionsMade[contributorIndex] ?? toCents(0),
          funded,
        );
      }
    }

    // **P14-16 — the RAD's OPENING net-of-retention balance, taken before anything below mutates
    // `radBalance`/`radRetentionWithheld` this month** — the same clock `assets`/`entitlement`
    // above were read on (P4-4's "a month is assessed on what it OPENS with"). `Month.protectedAssets`
    // is emitted from `assets.protectedAssets`, computed at that same earlier point in the tick, so
    // adding the RAD to it here, at the CLOSING figures `radBalance` will hold once this block runs,
    // would silently move the two out of step — a paid-this-month RAD would inflate `protectedAssets`
    // a month before the Age Pension exemption it rides on actually starts (the walk below, and
    // `test/core-projection-aged-care.test.mjs`'s own "identical in the entry's OWN month, STRICTLY
    // HIGHER from the FOLLOWING one"). Read once, here, and carried to the `Month` emit untouched.
    const radHeldOpening: readonly Cents[] = household.persons.map(
      (_person, personIndex) => subCents(radBalance[personIndex] as Cents, radRetentionWithheld[personIndex] as Cents),
    );

    // --- P14-13, slice 3a: `ENTER_CARE` — the RAD lump sum, the ongoing means assessment and fees -
    //
    // **P14-18b — the RAD lump sum is now IN `target` and the refusal has already been taken, just
    // after the Waterfall ran (above), on `result.shortfall` rather than running cash alone: a RAD
    // is funded through the WHOLE Waterfall — salary, both pension limbs, the Non-Super Portfolio,
    // running cash and (last) a released superannuation lump sum — the way most retirees actually
    // pay one, on `MORTGAGE_PAYOFF`'s own precedent rather than `NON_SUPER_INVESTMENT`'s. By the
    // time this loop runs, a month with a RAD due has already been refused if the Waterfall could
    // not fund it in full, so pushing the line here is unconditional — the household either did not
    // reach this line at all, or `target` (RAD included) was funded in full.** The ongoing fees
    // below are a genuinely separate, later outflow, still left to reach the SECOND SHORTFALL SWEEP
    // beneath this block: a resident whose fees the household cannot quite meet this month is a
    // genuine shortfall, not a reason to refuse the whole plan.
    for (let personIndex = 0; personIndex < household.persons.length; personIndex += 1) {
      const entered = careEnteredThisMonth[personIndex];
      if (entered === undefined) continue;
      // Nominal at THIS entry's own day (user ruling, 2026-09-25) — `radPaidThisMonth` above's own
      // conversion, re-derived per Person rather than shared, since `target`'s own total is already spent.
      const radPaid = atTodaysMoney(entered.params.radPaidAsLumpSum, entered.date);
      if (radPaid > 0) {
        lines.push(
          Object.freeze({
            direction: 'outflow',
            effect: 'cash',
            description: AGED_CARE_RAD_PAYMENT_LINE,
            amount: radPaid,
            provenance: UNLEGISLATED.agedCareRad,
            attribution: statedBy(entered.id),
          }),
        );
      }
      radBalance[personIndex] = addCents(radBalance[personIndex] as Cents, radPaid);
    }

    // --- P14-19 — `BUY_HOME`'s cash lines, its own month only; already funded in full above -------
    if (homeBoughtThisMonth !== undefined) {
      const purchasePrice = atTodaysMoney(homeBoughtThisMonth.params.purchasePrice, homeBoughtThisMonth.date);
      const purchaseCosts = atTodaysMoney(homeBoughtThisMonth.params.purchaseCosts ?? toCents(0), homeBoughtThisMonth.date);
      lines.push(
        Object.freeze({
          direction: 'outflow',
          effect: 'cash',
          description: HOME_PURCHASE_PRICE_LINE,
          amount: purchasePrice,
          provenance: UNLEGISLATED.homePurchase,
          attribution: statedBy(homeBoughtThisMonth.id),
        }),
      );
      if (purchaseCosts > 0) {
        lines.push(
          Object.freeze({
            direction: 'outflow',
            effect: 'cash',
            description: HOME_PURCHASE_COSTS_LINE,
            amount: purchaseCosts,
            provenance: UNLEGISLATED.homePurchase,
            attribution: statedBy(homeBoughtThisMonth.id),
          }),
        );
      }
    }

    // --- P9-5 — `DOWNSIZER_CONTRIBUTION`: cash into the owner's own super, already funded above ----
    //
    // `SPOUSE_CONTRIBUTION`'s write-back: the balance moves at the statement the line is pushed at.
    // No fund contributions tax, no cap usage and no deduction (s 290-167, s 292-90(2)(c)(iiia)).
    for (const entry of downsizersThisMonth) {
      if (entry.owner === 'household') {
        throw new RangeError(`entry ${entry.id} (DOWNSIZER_CONTRIBUTION) is owned by the household: a downsizer contribution goes into one Person's own super. State it against personA or personB`);
      }
      const ownerIndex = entry.owner === 'personA' ? 0 : 1;
      const owner = household.persons[ownerIndex];
      const slot = entry.params.receivingInterestIndex;
      if (owner?.superInterests[slot] === undefined) {
        throw new RangeError(`entry ${entry.id} (DOWNSIZER_CONTRIBUTION) names super interest ${slot} of ${entry.owner}, and there is no such interest in this Household`);
      }
      refuseContributionAfterSwitch(ownerIndex, slot, date, `A downsizer contribution (entry ${entry.id})`);
      const amount = atTodaysMoney(entry.params.amount, entry.date);
      const held = balances[ownerIndex];
      if (held === undefined) continue; // unreachable while `balances` is built one-for-one with `household.persons`.
      held.superInterestBalances[slot] = addCents(held.superInterestBalances[slot] ?? toCents(0), amount);
      lines.push(
        Object.freeze({
          direction: 'outflow',
          effect: 'cash',
          description: downsizerContributionDescription(owner.name),
          amount,
          provenance: UNLEGISLATED.downsizerContribution,
          attribution: statedBy(entry.id),
        }),
      );
    }

    // **The ongoing means assessment and fees, every month at least one Person is alive and in
    // care.** `deceasedNow` excludes a Person who has died — there is no more care to fee, whatever
    // `careOn` still says — on `DEATH`'s own precedent for reading the walk's other per-Person
    // state after a death.
    const residentsInCare = household.persons
      .map((_person, index) => index)
      .filter((index) => careOn[index] !== undefined && deceasedNow !== index);
    if (residentsInCare.length > 0) {
      if (!agedCareParametersCover(date)) {
        throw new RangeError(
          `${month}: a resident is in permanent aged care before ${AGED_CARE_PERIODS[0]?.from}, the first published aged care schedule — nothing is published before that date and this build does not extrapolate backwards`,
        );
      }
      if (entitlement === undefined) {
        throw new RangeError(
          `${month}: a resident is in permanent aged care, and the Aged Care Means Assessment needs the Household's assessable income, which the Age Pension test also computes and this month falls outside its parameter window — see the Age Pension parameter-window note above`,
        );
      }
      const period = agedCarePeriodAt(date, agedCareExtendedPeriods());
      const feeProvenance = agedCareProvenance(fy, period);
      // **A death makes this a SINGLE-person test from the survivor's own month on** — `assets` and
      // `entitlement` are already the survivor's alone by that point (see `meansTestHousehold`
      // above), so this mirrors that rather than re-deriving it.
      const enterCareCouple = household.persons.length === 2 && deceasedNow === undefined;
      const survivor = deceasedNow === undefined ? (household.persons[0] as Person) : (household.persons[death?.survivor ?? 0] as Person);
      const partner = household.persons[1] as Person | undefined;
      const personNames = (
        enterCareCouple ? [survivor.name, (partner as Person).name] : [survivor.name]
      ) as readonly [string] | readonly [string, string];
      // **The home, from whichever `ENTER_CARE` entry states it (P14-13) — a Household fact, never
      // per-Person, on `Household.mortgage`'s own ADR-0005 footing.** `mortgageBalance` nets off the
      // loan still owing, so `netValue` is what ADR-0005 would call the home's own equity.
      // `careHomeEntry` and `homeIsProtected` are the SAME two facts P14-5a's Age Pension side reads
      // above, computed once, not a second copy of the same rule.
      // **P14-13 — once `homeSold`, the home no longer exists: no net value, no protection, no home
      // exemption cap to apply. Its sale proceeds are already inside `assets.assessableAssets` below
      // (they are ordinary household cash), so this is the whole of what aged care needs to know.**
      const homeEntry = careHomeEntry as EnterCareEntry;
      // **`homeValue` is stated in TODAY's money (user ruling, 2026-09-25) — `atTodaysMoney` raises
      // it to THIS entry's own day, the same nominal-at-entry basis the RAD/DAP arithmetic below
      // uses. Frozen there, not carried further with the walk (unlike the Age Pension side's own
      // `careVacatedHomeAssessment`, which keeps rising): nothing in this build's aged-care means
      // test re-prices the home after entry, and this task changes only its BASIS, not that.**
      // **The opening HEAS debt comes off BEFORE `agedCare.ts` halves and caps it: AC Act 2024
      // s 330(8) caps the value "after applying subsection (1)", and (1) imports SS Act Part 3.12
      // Div 1, s 1121(5) included.** Asymmetry: the home is frozen at entry, the debt keeps growing
      // — whether that growth alone re-determines the assessment (s 331) is unsourced.
      const homeNetValue = homeSold ? toCents(0) : (Math.max(0, atTodaysMoney(homeEntry.params.homeValue, homeEntry.date) - mortgageBalance - heasDebtOpening) as Cents);
      const combinedRadPaid = radBalance.reduce<Cents>((total, balance) => addCents(total, balance), toCents(0));
      // **`assets.assessableAssets` is computed EARLY in this month's tick, off the balance the
      // month OPENED with — before a RAD lump sum due THIS month has left cash (the RAD/cash block
      // above runs later).** Left unadjusted, a RAD paid this month would be counted TWICE: once
      // still inside `assets.assessableAssets` (the cash has not yet fallen) and once again via
      // `combinedRadPaid` (`radBalance` is already written back). Subtracting exactly what left
      // cash THIS month nets it to the true post-payment figure, and every later month needs no
      // adjustment at all — `openingBalance` has already carried the fall forward by then.
      // `radPaidThisMonth` itself is the SAME figure `target` was built from, above — one fact, not
      // a second copy of it (P14-18b).
      // **P14-13 — aged care assesses `RENT_OUT_HOME`'s net rent REGARDLESS of whether the Age
      // Pension income test does (Services Australia's own "Real estate income" page: rent counts in
      // the income test, and nothing in the post-1-Nov-2025 aged-care rules exempts a home under
      // `ENTER_CARE`'s own protection the way DSS Guide 4.6.3.70 exempts it for the Age Pension).**
      // Read back off the Age Pension's own fortnightly figure (`entitlement.incomeTest.assessed`,
      // `Σ ×26` this walk's own reverse of the ÷26 convention above) and the rent added back in ONLY
      // when it was excluded from THAT figure — a household with no `RENT_OUT_HOME` reads no addition
      // at all, byte-identical to before this task.
      const agedCareCombinedAssessableIncome = addCents(
        mulCents(entitlement.incomeTest.assessed, 26),
        rentIsExemptFromAgePensionIncomeTest ? netRentAnnualForMeansTests : toCents(0),
      );
      const assessment = agedCareMeansAssessment(
        {
          couple: enterCareCouple,
          personNames,
          combinedAssessableIncome: agedCareCombinedAssessableIncome,
          combinedAssessableAssetsExcludingHomeAndRad: subCents(assets.assessableAssets, radPaidThisMonth),
          combinedRadPaid,
          home: { netValue: homeNetValue, homeIsProtected: homeSold ? false : homeIsProtected },
        },
        period.rates,
      );
      const perPerson = assessment.perPerson as readonly AgedCarePersonMeans[];
      const days = daysInMonth(date);
      for (const residentIndex of residentsInCare) {
        const means = enterCareCouple ? perPerson[residentIndex] : perPerson[0];
        const entry = careEntry[residentIndex] as EnterCareEntry;
        if (means === undefined) continue; // unreachable: `perPerson` is built one-for-one with `personNames`.
        let basicTotal = toCents(0);
        let hotellingTotal = toCents(0);
        let ncccTotal = toCents(0);
        let cap = ncccCap[residentIndex] ?? startingNcccCapBalance(period.rates);
        for (let day = 0; day < days; day += 1) {
          const dayFees = agedCareFees(means.meansTestedAmountPerDay, period.rates, cap);
          basicTotal = addCents(basicTotal, dayFees.basicDailyFee);
          hotellingTotal = addCents(hotellingTotal, dayFees.hotellingContribution);
          ncccTotal = addCents(ncccTotal, dayFees.nonClinicalCareContribution);
          cap = dayFees.ncccCapBalanceAfter;
        }
        ncccCap[residentIndex] = cap;
        // **`radPrice` is stated in TODAY's money (user ruling, 2026-09-25) — `atTodaysMoney` raises
        // it to THIS resident's own entry day, once, and the DAP arithmetic runs on that nominal
        // figure for the life of the stay, exactly as `radBalance` (below) already accrues in
        // nominal RAD dollars fixed at entry.**
        const accommodation = agedCareAccommodationPayment(atTodaysMoney(entry.params.radPrice, entry.date), radBalance[residentIndex] as Cents, period.mpir);
        const dapTotal = (accommodation.dap * days) as Cents;
        if (basicTotal > 0) {
          lines.push(Object.freeze({ direction: 'outflow', effect: 'cash', description: AGED_CARE_BASIC_FEE_LINE, amount: basicTotal, provenance: feeProvenance, attribution: statedBy(entry.id) }));
        }
        if (hotellingTotal > 0) {
          lines.push(Object.freeze({ direction: 'outflow', effect: 'cash', description: AGED_CARE_HOTELLING_LINE, amount: hotellingTotal, provenance: feeProvenance, attribution: statedBy(entry.id) }));
        }
        if (ncccTotal > 0) {
          lines.push(Object.freeze({ direction: 'outflow', effect: 'cash', description: AGED_CARE_NCCC_LINE, amount: ncccTotal, provenance: feeProvenance, attribution: statedBy(entry.id) }));
        }
        if (dapTotal > 0) {
          lines.push(Object.freeze({ direction: 'outflow', effect: 'cash', description: AGED_CARE_DAP_LINE, amount: dapTotal, provenance: feeProvenance, attribution: statedBy(entry.id) }));
        }
        // **P14-16 — RAD retention, on the SAME `radBalance[residentIndex]` the accommodation payment
        // above just read, and for the SAME resident-by-resident reason.** Nil where no lump sum was
        // paid (`agedCareRadRetentionDeduction(0, …)` is nil), so a DAP-only resident's radBalance
        // and this line stay silent together. `radDaysHeld` only advances while a RAD is actually
        // held — `days` is THIS month's whole count, on the fee loop's own granularity (a resident
        // admitted mid-month is still charged, and retained against, for the whole month, exactly as
        // `AGED_CARE_BASIC_FEE_LINE` already is). `effect: 'wealth'`: the facility withholds this from
        // a REFUND years away, not a payment the household makes today — no cash moves.
        const radPaidByResident = radBalance[residentIndex] as Cents;
        if (radPaidByResident > 0) {
          radDaysHeld[residentIndex] = (radDaysHeld[residentIndex] as number) + days;
          const cumulativeRetention = agedCareRadRetentionDeduction(
            radPaidByResident,
            radDaysHeld[residentIndex] as number,
            AGED_CARE.radRetention.value,
          );
          const retentionThisMonth = subCents(cumulativeRetention, radRetentionWithheld[residentIndex] as Cents);
          radRetentionWithheld[residentIndex] = cumulativeRetention;
          if (retentionThisMonth > 0) {
            lines.push(Object.freeze({ direction: 'outflow', effect: 'wealth', description: AGED_CARE_RAD_RETENTION_LINE, amount: retentionThisMonth, provenance: feeProvenance, attribution: statedBy(entry.id) }));
          }
        }
      }
    }

    // --- P9-2a: `HEAS_DRAW` — the fortnightly draw, and the debt it compounds into, PER PERSON ----
    //
    // **AFTER the Waterfall, `ENTER_CARE`'s own footing**: a HEAS draw is money ARRIVING, never
    // drawn from anything the Waterfall produced, so it is added straight to `lines` here rather
    // than routed through a second Waterfall call. `entitlement` (computed earlier this tick, the
    // SAME call the Age Pension line above reads) is consulted, never recomputed.
    //
    // **Walked FORTNIGHT BY FORTNIGHT within the month** (`fortnightsInWalkMonth`, P4-10's own
    // precedent for a fortnightly mechanism inside a monthly tick): interest compounds on a balance
    // a draw has already grown, so two draws a month cannot be priced as one double draw plus one
    // interest charge without under-stating the debt.
    //
    // **PER PERSON, looped by position, `careEntry`'s own shape** (T37 — the security floor is per
    // Person on that Person's own share, and `heas.ts`'s `coupleStructure` fact makes clear there
    // are TWO loans for a couple, not one split at the end). Both loans price off the SAME
    // younger-partner age component (T36, `heas.ts`'s `whoseAge`) — recomputed EVERY month, off
    // `ageAt` at THIS month's first day, which is what turns it into the annual step function the
    // law states rather than a figure frozen at the entry's own start date: a birthday raises
    // `capacity` for both Persons' loans at once, and a loan that was clamped can draw again from
    // that month.
    for (let personIndex = 0; personIndex < household.persons.length; personIndex += 1) {
      const entry = heasEntry[personIndex];
      if (entry === undefined || monthOf(entry.date) > month) continue;
      // **P14-13 — once the home is sold there is no more security to draw against or accrue
      // interest on: the debt was discharged in full at the sale (the entry loop above), and this
      // loop must not quietly redraw or reaccrue it the same month.** `homeSold` is set at most once
      // (`checkSellHomes`) and never cleared, so this Person's stream is over for the rest of the
      // walk from here — `stopDate`'s own effect, reached structurally rather than stated.
      if (homeSold) continue;
      const drawGoverns = entry.params.stopDate === undefined || month <= monthOf(entry.params.stopDate);
      // T36 — the younger of the two ages for a couple (both Persons' loans use it, `heas.ts`'s
      // `whoseAge`), or this Person's own age when they draw alone. `ageAt` at the FIRST DAY of
      // THIS month, `checkHeasDraws`'s own precedent for reading an age off a date, recomputed on
      // every pass through this loop rather than cached — the step function IS this recomputation.
      const asAtThisMonth = firstDayOf(month);
      const ageForCapacity =
        household.persons.length === 2
          ? Math.min(...(household.persons.map((person) => ageAt(person.dateOfBirth, asAtThisMonth)) as [number, number]))
          : ageAt((household.persons[personIndex] as Person).dateOfBirth, asAtThisMonth);
      // T37 — this Person's own share of the WHOLE household security (`entry.params.securityValue`,
      // `checkHeasDraws`'s own note that a couple's two entries must AGREE on it): 50-50 by default
      // for a couple, the whole of it for a Person drawing alone. `personMaximumLoanAvailable`
      // floors the SHARE at $10,000, not the whole security value (T37).
      const ownershipShare = household.persons.length === 2 ? 0.5 : 1;
      // **`securityValue` is stated in TODAY's money (user ruling, 2026-09-25) — `atTodaysMoney`
      // raises it to THIS entry's own day, once, and the capacity cap runs on that nominal figure
      // for the life of the loan, `ENTER_CARE`'s `homeValue`-at-entry precedent.**
      const capacity = personMaximumLoanAvailable(heasAgeComponent(ageForCapacity), atTodaysMoney(entry.params.securityValue, entry.date), ownershipShare);
      // **P9-2b — this month's advances, and the rolling 26-fortnight window they open or extend
      // (s 1133AA(1), T136).** `checkHeasDraws` has already refused a THIRD advance in any window and
      // a window total over the dollar cap, so this is bookkeeping, not a second judgement: an
      // advance either joins the OPEN window or, once more than `windowDays` have passed since that
      // window's own first advance, starts a fresh one — walked chronologically because `entry.date`
      // through `month` only ever advances. Updated BEFORE `desiredFortnightlyDraw` below, because
      // Services Australia's own "George" example applies the reduced rate to the SAME fortnight the
      // advance is taken, not merely to the fortnights after it.
      const advancesDueThisMonth = (entry.params.advances ?? []).filter((advance) => monthOf(advance.date) === month);
      const windowFortnights = HEAS.drawModes.advancePeriodFortnights.value;
      const windowDays = windowFortnights * 14;
      let advanceDueThisMonth: Cents = toCents(0);
      for (const advance of [...advancesDueThisMonth].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0))) {
        const currentWindowStart = heasAdvanceWindowStart[personIndex];
        if (currentWindowStart === undefined || daysInclusive(currentWindowStart, advance.date) > windowDays) {
          heasAdvanceWindowStart[personIndex] = advance.date;
          heasAdvanceWindowTotal[personIndex] = toCents(0);
        }
        // `advance.amount` is stated in TODAY's money (user ruling, 2026-09-25) — `atTodaysMoney`
        // raises it to THIS advance's own day, its own payment date.
        const advanceAmount = atTodaysMoney(advance.amount, advance.date);
        heasAdvanceWindowTotal[personIndex] = addCents(heasAdvanceWindowTotal[personIndex] as Cents, advanceAmount);
        advanceDueThisMonth = addCents(advanceDueThisMonth, advanceAmount);
      }
      // **Is THIS month inside an active advance window?** `referenceDate` is the LATER of the
      // window's own start and this month's first day, so a window that opened THIS month (the
      // `daysInclusive` call above would otherwise be asked for a span running backwards) is always
      // trivially active, and a window from an earlier month is checked against `firstDayOf(month)`
      // exactly as `checkHeasDraws` checks a fresh advance against it at the door.
      const heasWindowStart = heasAdvanceWindowStart[personIndex];
      const windowActive =
        heasWindowStart !== undefined &&
        daysInclusive(heasWindowStart, heasWindowStart > asAtThisMonth ? heasWindowStart : asAtThisMonth) <= windowDays;
      // **The desired fortnightly draw, BEFORE the capacity cap clamps it — computed ONCE for the
      // month, off this month's OPENING entitlement, exactly as the Age Pension line above prices
      // the whole month from one assessment.** A stated figure needs nothing further; "maximum"
      // needs the entitlement this month actually reached, and refuses (`ENTER_CARE`'s own
      // precedent) rather than guess where the parameter window does not reach. The 150% cap and
      // the pension "actually received" are THIS PERSON's own share — `entitlement.perPersonRatePerFortnight`
      // already is that share (the combined rate halved for a couple, itself for a Person alone),
      // and the maximum payment rate is halved the same way for a couple's own member's rate.
      let desiredFortnightlyDraw: Cents = toCents(0);
      if (drawGoverns) {
        if (entry.params.fortnightlyAmount === 'maximum') {
          if (entitlement === undefined) {
            throw new RangeError(
              `${month}: a HEAS_DRAW is drawing "maximum", which needs the Household's Age Pension entitlement to net the fortnightly cap against, and this month falls outside the Age Pension's parameter window — see the Age Pension parameter-window note above`,
            );
          }
          const personMaximumPaymentRate =
            household.persons.length === 2 ? mulCents(entitlement.maximumPaymentRate, 0.5) : entitlement.maximumPaymentRate;
          const uncappedFortnightlyDraw = heasFortnightlyDraw(personMaximumPaymentRate, entitlement.perPersonRatePerFortnight);
          if (windowActive) {
            // **T137 RESOLVED (P16-4, docs/research/p9-2b-part-rate-advances-2026-09-25.md) —
            // `heasFortnightlyDrawDuringAdvancePeriod` is already correct for a genuine PART-RATE
            // pensioner and needed no change.** Neither of Services Australia's published examples
            // covers `0 < perPersonRatePerFortnight < personMaximumPaymentRate`, so T137 could not be
            // settled by extension — but the Act's own numbers settle it directly: given the 50%
            // annual cap `checkHeasDraws` already enforces at the door (s 1134A(3)(a), `parsePlan.ts`),
            // `combined_fn = pension_fn + max(0, headroom − advances)/26 ≥ MPR_fn` for ANY
            // `pension_fn` in `[0, MPR_fn]`, with equality exactly at the legislated maximum advance —
            // the "greater of MPR" floor in s 1134(1A)(b)(i) is automatically satisfied by the plain
            // unfloored formula, so the two candidate readings the research doc set out to
            // disambiguate were never actually different outcomes. The guard this replaced refused a
            // full-rate and a nil-entitlement Person through unchanged (the `>` and `<` bounds were
            // never both true for either), so deleting it changes behaviour for genuine part-rate
            // Persons only.
            desiredFortnightlyDraw = heasFortnightlyDrawDuringAdvancePeriod(uncappedFortnightlyDraw, heasAdvanceWindowTotal[personIndex] as Cents);
          } else {
            desiredFortnightlyDraw = uncappedFortnightlyDraw;
          }
        } else {
          // A STATED `fortnightlyAmount` is in TODAY's money (user ruling, 2026-09-25) — `atTodaysMoney`
          // raises it to THIS month, a recurring drawn figure on `annualSpend`'s own footing.
          // `'maximum'` is untouched: it is already netted off THIS month's own entitlement, above.
          desiredFortnightlyDraw = atTodaysMoney(entry.params.fortnightlyAmount, month);
        }
      }
      const fortnights = fortnightsInWalkMonth(months.length);
      let drawnThisMonth: Cents = toCents(0);
      let advancedThisMonth: Cents = toCents(0);
      let clampedThisMonth = false;
      const debtBeforeThisMonth = heasDebt[personIndex] as Cents;
      for (let fortnight = 0; fortnight < fortnights; fortnight += 1) {
        // **The advance is paid FIRST, in the first fortnight this month contributes, joining the
        // balance BEFORE that fortnight's interest — s 1135(3) Step 1A, T40's own order for an
        // ordinary draw (P9-2b).** This build does not carry a calendar day PER FORTNIGHT within a
        // month (`fortnightsInWalkMonth`'s own header: the walk is not anchored to a claim date), so
        // the smallest honest placement for a lump sum landing somewhere in this month is the first
        // fortnight it contributes, ahead of that fortnight's own draw. Clamped by the SAME capacity
        // room a draw is (T41: "the capacity cap stops draws" — an advance is a draw too, s
        // 1134A(3)(c)).
        if (fortnight === 0 && advanceDueThisMonth > 0) {
          const room = Math.max(0, capacity - (heasDebt[personIndex] as Cents)) as Cents;
          const advanceDrawn = Math.min(advanceDueThisMonth, room) as Cents;
          if (advanceDrawn < advanceDueThisMonth) clampedThisMonth = true;
          heasDebt[personIndex] = addCents(heasDebt[personIndex] as Cents, advanceDrawn);
          advancedThisMonth = advanceDrawn;
        }
        // **The capacity cap stops DRAWS, never interest** (T41, `heas.ts`'s
        // `reachingTheMaximumLoan`: "payments stop, compounding does not").
        const room = Math.max(0, capacity - (heasDebt[personIndex] as Cents)) as Cents;
        const draw = Math.min(desiredFortnightlyDraw, room) as Cents;
        if (draw < desiredFortnightlyDraw) clampedThisMonth = true;
        drawnThisMonth = addCents(drawnThisMonth, draw);
        heasDebt[personIndex] = heasAccrueFortnight(heasDebt[personIndex] as Cents, draw);
      }
      const interestThisMonth = subCents(subCents(subCents(heasDebt[personIndex] as Cents, debtBeforeThisMonth), drawnThisMonth), advancedThisMonth);
      const provenance = heasProvenance(fy);
      if (drawnThisMonth > 0) {
        lines.push(
          Object.freeze({
            direction: 'inflow',
            effect: 'cash',
            description: HEAS_DRAW_LINE,
            amount: drawnThisMonth,
            provenance,
            attribution: statedBy(entry.id),
          }),
        );
      }
      if (advancedThisMonth > 0) {
        // **Ordinary cash, means-test-wise, in v1 — deliberately (T138).** The advance's own
        // means-test treatment (deemed from day one, assessable after 90 days only where the home was
        // the security, §5.7) is punted per the gate: the whole means test stays blind to HEAS in this
        // build (T39/T42), so this cash is assessed the same as any other cash — from day one, on
        // both tests, with no 90-day exemption. That is the CAUTIOUS reading, never the generous one.
        lines.push(
          Object.freeze({
            direction: 'inflow',
            effect: 'cash',
            description: HEAS_ADVANCE_LINE,
            amount: advancedThisMonth,
            provenance,
            attribution: statedBy(entry.id),
          }),
        );
      }
      if (interestThisMonth > 0) {
        lines.push(
          Object.freeze({
            direction: 'outflow',
            effect: 'wealth',
            description: HEAS_INTEREST_LINE,
            amount: interestThisMonth,
            provenance,
            attribution: statedBy(entry.id),
          }),
        );
      }
      // **`HeasCapacityCapNote` — emitted every time this Person's draw newly binds, not once for
      // the whole walk (P9-2a).** `heasCapped[personIndex]` is `true` while the LAST processed
      // month was clamped; a month that draws everything it wanted (room reopened, most often a
      // birthday raising `capacity`) clears it, so the NEXT month the cap binds again is read as a
      // fresh binding and notes again, `ConcessionalCapExceededNote`'s "emitted once" precedent
      // narrowed to "once per binding episode".
      if (clampedThisMonth) {
        if (!heasCapped[personIndex]) {
          heasCapped[personIndex] = true;
          notes.push(
            Object.freeze({
              subject: 'HEAS capacity cap reached',
              entryId: entry.id,
              capacity,
              debtAfter: heasDebt[personIndex] as Cents,
              note:
                `The Home Equity Access Scheme loan reached its capacity cap of ${formatCents(capacity)} this month ` +
                '(age component × this Person\'s own share of the security value, SS Act s 1135A(1)). Payments stop from here; ' +
                'interest keeps compounding on the debt already drawn (T41). A birthday that raises the age component ' +
                '(T36) can reopen room and let draws resume; this build does not model a repayment event.',
            }),
          );
        }
      } else {
        heasCapped[personIndex] = false;
      }
    }

    // **THE SECOND SHORTFALL SWEEP — the tax on a disposal is owed in a month the Waterfall has
    // already closed its books on, and this is where that is reported rather than absorbed
    // (P3-21f chunk 6, TODO P3-21f's trap-with-no-chunk-of-its-own).**
    //
    // `result.shortfall` above is what the Waterfall could not meet, and it is known BEFORE the
    // month's post-Waterfall outflows exist. The largest of those is `Income tax on capital gain`.
    //
    // ⚠️ **AND SINCE P10-4 (2026-09-21) THE AUTOMATIC DRAW NO LONGER REACHES THIS SWEEP.** It read:
    // *"limb 3 draws to NEED, so its proceeds are exactly the gap and there is nothing behind them
    // for the tax the disposal just realised. The settled direction is that the draw is NOT grossed
    // up for it."* That direction is reversed — limb 3 sells enough to fund its own tax — so every
    // month whose only disposal was the Waterfall's own now balances without this line. **What still
    // reaches it is a sale the USER stated**: a `NON_SUPER_INVESTMENT` sell names its own amount, and
    // a household that states one and cannot meet the tax on it is genuinely short. The sweep is
    // therefore NARROWED and not deleted.
    //
    // ⚠️ **AND IT IS NOW A DECLARED SURVIVOR, MEASURED: renaming this line's description breaks
    // ZERO tests.** No fixture in the suite reaches it any more, and the reason is arithmetic rather
    // than luck — a stated sale brings its own proceeds and is charged less than them, because no
    // rate in this Act takes more than 100% of the gain it applies to, and a buy funded later in the
    // month is already capped at the cash the charge has left. What could still reach it is an
    // outflow the Waterfall's limbs never saw: the year-end true-up is one, and it is pushed before
    // limb 1 reads the month's receipts, so a bill bigger than the month's income and the Offset
    // together would land here. The sweep is kept for that day and for the next author who pushes a
    // line after the Waterfall, not to catch a case that exists today.
    //
    // It is the SAME line and the same name, because it is the same fact: money the plan requires and
    // does not have. P4-5's Shortfall Age reads `SHORTFALL_LINE` and will therefore read this one
    // too, which is the honest answer — a household whose portfolio only just covers its spending
    // cannot also cover the CGT, and a Shortfall Age that ignored the tax would be later than the
    // truth. A month can carry two of these lines and they are not merged: one is what the Waterfall
    // could not fund and one is what the month's own tax outran, and merging them would lose which.
    const beforeSweep = lines.reduce<number>(
      (balance, line) => balance + cashMovement(line),
      openingBalance,
    );
    if (beforeSweep < 0) {
      lines.push(
        Object.freeze({ direction: 'inflow', effect: 'cash', description: SHORTFALL_LINE, amount: -beforeSweep as Cents, provenance: UNLEGISLATED.shortfall, attribution: NO_STATING_ENTRY.shortfall }),
      );
    }

    // --- P4-4: THE MONTH'S INVESTMENT GROWTH, AND IT IS NOW A LINE --------------------------------
    //
    // **This is the residual chunk 5a declared, closed where it said it would be closed.** Until
    // P4-4 every balance in this walk grew in silence at the end of the tick, so `assessableAssets`
    // and `protectedAssets` moved for a reason no line of the `Month` could explain. The growth is
    // still applied exactly where it was — at the END of the tick, after this month has been
    // assessed and reported — and it is now COMPUTED here, once, so that the line and the
    // write-back below are the same number. That is limb 2's discipline, taken unchanged: a balance
    // cannot move without a line to explain it, and a line cannot be written that no balance moved
    // by.
    //
    // **The figures are the post-transaction ones.** Parcels: whatever survived this month's
    // disposals, before this month's purchases, which land after the growth. Super: the balance less
    // the payment its `PENSION_MINIMUM_LINE` already reported. So the fall a drawdown caused is on
    // the cash side once and is not restated here.
    //
    // **Placed AFTER the shortfall sweep and BEFORE `closingBalance`, deliberately.** Every cash
    // decision of the month — the Waterfall, the buys, both sweeps — is behind us, so no wealth line
    // can reach one of them; and `closingBalance` is computed from `lines` WITH these lines in it,
    // through `cashMovement`, so the filter that keeps them out of the cash total is exercised by
    // every month of every walk rather than by a test that has to remember to look.
    // **P2-11 — grown at THIS Person's `returnRate`, falling back to the flat `settings.nominalReturn`
    // when nobody has ever stated a `RETURN_CHANGE` for them.** `returnRate[personIndex]` is
    // `undefined` for exactly that "nobody has ever stated" case, on `statedSalary`'s own reading —
    // a plan with no `RETURN_CHANGE` entries at all leaves every element `undefined`, so every
    // Person's growth is byte-identical to the flat figure this replaces.
    const grownParcels = balances.map((held, personIndex) =>
      parcelsGrownForOneMonth(held.parcels, returnRate[personIndex] ?? settings.nominalReturn),
    );
    // --- P3-17 slice 1: THE MONTH'S FEES, COMPUTED BEFORE THE GROWTH THEY MUST NOT EARN ----------
    //
    // **The insertion point, and why it is here and not inside `balanceAfterDrawdownAndGrowth`.**
    // That function takes a balance, a deduction and a rate; it knows nothing of a `SuperInterest`
    // and it must not, because it is also the one place the drawdown-then-growth convention lives
    // and widening it would put two rulings in one signature. So the fee is computed here, ADDED to
    // the month's draw, and handed to that function as one deduction — which means the ordering
    // ruling (deduct, then grow) is still stated in exactly one place and the fee inherits it.
    //
    // **`base` is `balance − drawn`, computed ONCE and read three times** — by the fee function, by
    // the two lines below, and (as `drawn + fees`) by the growth. One expression, three readers: a
    // second derivation of the base is how the fee on the line and the fee off the balance would
    // come to differ. See `monthlySuperFeesForOneMonth` for which balance and why.
    //
    // Mapped over `household.persons` rather than over `balances`, because the FEE is stated on the
    // `SuperInterest` and the BALANCE is carried beside it: iterating the source of the fee keeps
    // `interest` and `slot` in step by construction rather than by a lookup that could be off by one.
    //
    // ⚠️ **THE DOLLAR FEE IS RAISED TO THIS MONTH'S PRICE LEVEL — register O87, user ruling of
    // 2026-09-21, and BY WHICH SERIES DEPENDS ON PHASE from 2026-09-25 (P3-17 slice 4).** A fund's
    // stated `$X a year` is a price for a service and prices rise; held flat the walk charged less
    // and less in real terms every year, which understates a cost and so flatters the plan. Aware's
    // own schedule indexes an accumulation-phase account by wages and a retirement-phase one by CPI
    // (`~/.enough/verification/P13-1c-aware-soa-extract.md`, p.15), so BOTH lenses are built once for
    // the month and `monthlySuperFeesForOneMonth` (design point 8) picks between them per interest —
    // each is `core/priceLevel.ts`'s `inflateStated`, the SAME expression the spending level above
    // and the Contingency Floor in `outcomes.ts` go through, so there is still no second copy of
    // either factor.
    //
    // **The basis is `settings.asAtDate`, exactly as it is for the spending level**, and for the
    // reason written out at that call site: every box on this page takes today's money (P2-7), so
    // the fee box does too, and the settings panel now says so on the label.
    //
    // The PERCENTAGE limbs are not touched by this — a share of the balance is already in the
    // month's own dollars. See design point 6 in `monthlySuperFeesForOneMonth`.
    const raisedByWages = (stated: Cents): Cents =>
      inflateStated(stated, settings.economicSeries.awote, settings.asAtDate, month);
    const raisedByCpi = (stated: Cents): Cents =>
      inflateStated(stated, settings.economicSeries.cpi, settings.asAtDate, month);
    const feesSuper = household.persons.map((person, personIndex) =>
      person.superInterests.map((interest, slot) => {
        const balance = balances[personIndex]?.superInterestBalances[slot] ?? toCents(0);
        const drawn = drawnPerInterest[personIndex]?.[slot] ?? 0;
        // **THE EFFECTIVE PHASE, not the declared one** — `effectivePhaseFor` is what already
        // decides whether a converted accumulation account or a converted TTR is charged as a
        // pension everywhere else this month (the growth pool, the description, the earnings tax),
        // and the fee set follows the SAME resolution rather than a second one.
        const phase = effectivePhaseFor(personIndex, slot, date);
        return monthlySuperFeesForOneMonth((balance - drawn) as Cents, interest, raisedByWages, raisedByCpi, phase);
      }),
    );
    // P3-17a slice 1: insurance, charged on what the admin and investment fees left — last in the
    // balance-cap order — and before growth, with them. Slice 3: scaled by the cover kept.
    const coverSuper = household.persons.map((person, personIndex) =>
      person.superInterests.map((_, slot) => coverInForce(personIndex, slot, month)));
    // **Cover ends when the interest becomes a retirement-phase Account-Based Pension (user ruling
    // 2026-09-28)**: Aware scopes all cover to the accumulation account (Insurance Handbook, 30 April
    // 2026). Read off `effectivePhaseFor`, so a TTR keeps its cover until IT converts, an account
    // kept in accumulation at retirement keeps it for good, and a conversion never un-happens. The
    // conversion month itself is already uninsured, as `switchesThisMonth` treats it for the minimum.
    const insuranceEnded = (personIndex: number, slot: number): boolean => {
      const day = conversionDay[personIndex]?.[slot];
      return isAccountBasedPension(effectivePhaseFor(personIndex, slot, date)) || (day !== undefined && monthOf(day) === month);
    };
    const insuranceSuper = household.persons.map((person, personIndex) =>
      person.superInterests.map((interest, slot) => {
        if (insuranceEnded(personIndex, slot)) return toCents(0);
        const fees = feesSuper[personIndex]?.[slot] ?? NO_SUPER_FEES;
        const balance = balances[personIndex]?.superInterestBalances[slot] ?? toCents(0);
        const available = (balance - (drawnPerInterest[personIndex]?.[slot] ?? 0) - fees.administration - fees.investment) as Cents;
        return monthlySuperInsuranceForOneMonth(
          available,
          interest,
          ageAt(person.dateOfBirth, date),
          ageAt(person.dateOfBirth, firstDayOf(first)),
          raisedByCpi,
          coverSuper[personIndex]?.[slot]?.cover,
        );
      }),
    );
    const grownSuper = balances.map((held, personIndex) =>
      held.superInterestBalances.map((balance, slot) => {
        const fees = feesSuper[personIndex]?.[slot] ?? NO_SUPER_FEES;
        return balanceAfterDrawdownAndGrowth(
          balance,
          // The draw and the month's fees leave as ONE deduction, so the fee is out of the account
          // before the return is applied and earns nothing (design point 2, ruled in the fee
          // function's doc). Every cent of it is on the two lines below.
          ((drawnPerInterest[personIndex]?.[slot] ?? 0) + fees.administration + fees.investment + (insuranceSuper[personIndex]?.[slot] ?? 0)) as Cents,
          // P2-11, `grownParcels`' own fallback: this Person's stated `RETURN_CHANGE` level, or the
          // flat `settings.nominalReturn` when nobody has ever stated one.
          returnRate[personIndex] ?? settings.nominalReturn,
        );
      }),
    );
    const marketValueOf = (parcels: readonly Parcel[]): number =>
      parcels.reduce((sum, parcel) => sum + parcel.marketValue, 0);
    household.persons.forEach((person, personIndex) => {
      const held = balances[personIndex];
      if (held === undefined) return;
      const portfolio = growthLine(
        growthDescription(person.name, PORTFOLIO_POOL),
        marketValueOf(grownParcels[personIndex] ?? []) - marketValueOf(held.parcels),
      );
      if (portfolio !== undefined) lines.push(portfolio);
      // One line per INTEREST and not one per Person: two interests are two pools, assessed
      // separately by `splitAssets` and possibly on opposite sides of its split.
      person.superInterests.forEach((interest, slot) => {
        const paid = drawnPerInterest[personIndex]?.[slot] ?? 0;
        const after = grownSuper[personIndex]?.[slot] ?? 0;
        const fees = feesSuper[personIndex]?.[slot] ?? NO_SUPER_FEES;
        // **P3-17 — THE FEES, BEFORE THE GROWTH LINE, because that is the order they happened in.**
        // Each is `'wealth'` and `'outflow'`: the money leaves a superannuation balance and reaches
        // nobody in this Household, so `closingBalance` must not move by a cent of it —
        // `cashMovement` is what enforces that and every month of every walk exercises it.
        //
        // **No line where there was no fee**, per each constant's doc: an interest stating none, or
        // stating one whose twelfth rounded to nothing, emits nothing at all. That is what keeps
        // every pre-P3-17 fixture byte-identical.
        if (fees.administration > 0) {
          lines.push(Object.freeze({
            direction: 'outflow',
            effect: 'wealth',
            description: superAdministrationFeeDescription(person.name, effectivePhaseFor(personIndex, slot, date)),
            amount: fees.administration,
            provenance: UNLEGISLATED.superFees,
            attribution: NO_STATING_ENTRY.superFees,
          }));
        }
        if (fees.investment > 0) {
          lines.push(Object.freeze({
            direction: 'outflow',
            effect: 'wealth',
            description: superInvestmentFeeDescription(person.name, effectivePhaseFor(personIndex, slot, date)),
            amount: fees.investment,
            provenance: UNLEGISLATED.superFees,
            attribution: NO_STATING_ENTRY.superFees,
          }));
        }
        const insurance = insuranceSuper[personIndex]?.[slot] ?? toCents(0);
        if (insurance > 0) {
          lines.push(Object.freeze({
            direction: 'outflow',
            effect: 'wealth',
            description: superInsuranceDescription(person.name, effectivePhaseFor(personIndex, slot, date)),
            amount: insurance,
            provenance: UNLEGISLATED.superInsurance,
            attribution: coverSuper[personIndex]?.[slot]?.entryIds.length
              ? statedBy(...(coverSuper[personIndex]?.[slot]?.entryIds ?? []))
              : NO_STATING_ENTRY.superInsurance,
          }));
        }
        const line = growthLine(
          growthDescription(person.name, superPoolName(effectivePhaseFor(personIndex, slot, date))),
          // **The fees come OFF the base the growth is measured from**, exactly as the month's
          // payment already does. A growth line measured from the pre-fee balance would report the
          // fee as negative growth and the two lines would double-count it — the same
          // double-counting `growthLine`'s own doc forbids for a drawdown.
          after - ((held.superInterestBalances[slot] ?? 0) - paid - fees.administration - fees.investment - insurance),
        );
        if (line !== undefined) lines.push(line);
      });
    });

    // --- P6-8 brief 2 chunk 4: THE SACRIFICED MONEY ARRIVES, LESS THE FUND'S 15% -----------------
    //
    // Chunk 3 took the sacrifice out of the pay packet and left it nowhere. This is the other side:
    // the amount `sacrificedThisMonth` already decided is paid into the interest the entry named,
    // net of the contributions tax the fund pays on it.
    //
    // **The month's sacrifice is the FIFTH and last reading of `sacrificedThisMonth`, and it is a
    // reading rather than a recomputation.** One figure leaves the salary and one figure arrives
    // here; there is no second `Math.min`, no second annual→monthly division of the LEVEL, and so
    // no way for the amount removed and the amount contributed to disagree by a rounding. The
    // twelfth is taken here because `sacrificedThisMonth` is an ANNUAL figure — the same
    // `monthlyFromAnnual` the cash `Salary` line and the year's accumulator take.
    //
    // ⚠️ **`employerContributions` IS NIL ON THIS LINE AND THAT IS A SPLIT, NOT A GAP.** The
    // Guarantee has its own `ConcessionalContributions` and its own line, twenty lines below, and
    // each of the two reports the fund's tax on ITS OWN money: s 26(1)(a)'s 15% is a flat rate on
    // assessable contributions, so the charge on the sacrificed dollars is the same computed alone
    // or inside a larger total. What a split total cannot answer is the CAP, which is not a flat
    // rate on anything — and the cap is therefore measured on the SUM, once, earlier in this tick,
    // in the month the arrangement is stated. Nothing here calls `applyConcessional`: that is the
    // full s 291-20 assessment and it needs a contribution history the plan file has no field for.
    //
    // ⚠️ **AN OVER-CAP ARRANGEMENT NEVER REACHES THIS LINE (P6-8 brief 3, final chunk).** The
    // sentence that stood here — *"nothing here refuses an over-cap sacrifice"* — described the
    // build between brief 2 chunks 4 and 5 and is twice superseded: chunk 5 refused the stated
    // sacrifice above the cap, and this chunk refuses the sacrifice plus the Guarantee above it. A
    // Person over the cap is refused by name in the month they state the arrangement, because Div
    // 291's excess treatment — the excess into the Person's assessable income, the 15% offset, the
    // excess concessional contributions charge — is priced nowhere in this build and taxing the lot
    // at 15% and stopping is the FLATTERING direction.
    //
    // ⚠️ **AND NOTHING HERE CHECKS THE PHASE OF THE TARGET — a second residual, recorded in
    // TODO.md P6-8 and deliberately not closed in this chunk.** A contribution is made to an
    // ACCUMULATION interest; an account-based pension is closed to contributions, and a real fund
    // would open a new accumulation interest rather than add to the stream. This build credits
    // whatever interest the entry names, so a plan pointing a sacrifice at a pension-phase interest
    // gets a balance a fund would not produce — and, over Age Pension age, a means-test answer off
    // that balance. It is left because the phase gate needs a ruling on what the walk should DO
    // with the money (open an interest? refuse the plan?) and inventing that here would be the
    // half-ruling this project is organised against.
    //
    // **Non-cash, in the P4-4 sense, and the Waterfall must never be able to reach it.** The
    // Household never holds this money: it goes from the employer to the fund. A `'cash'` line
    // would put it into `closingBalance` and hand the Offset Account a balance that would then be
    // spent on groceries — which is the same money twice, since limb 1 was already reduced by the
    // sacrifice in chunk 3.
    //
    // **Placed with the growth lines and written back AFTER the growth, on the purchase
    // convention.** A contribution made in month n earns its first return in month n + 1, exactly
    // as a parcel bought in month n does; crediting before the growth would pay a month's return on
    // money that arrived at the end of it.
    const contributionsThisMonth = household.persons.flatMap((person, personIndex) => {
      const arrangement = sacrificeLevel[personIndex];
      if (arrangement === undefined) return [];
      const monthly = monthlyFromAnnual(sacrificedThisMonth[personIndex] ?? toCents(0));
      if (monthly <= 0) return [];
      const interest = person.superInterests[arrangement.interestIndex];
      // **REFUSED BY NAME, on `LUMP_SUM_FROM_SUPER`'s precedent twenty lines of this file below,
      // and NOT skipped.** `checkContributionTargets` already refuses this at the door — but the
      // door is `parsePlan`, and `project()` is called directly by every fixture in the suite and
      // by every caller that built a `Household` in code. Returning `[]` here would make a
      // contribution into an account that does not exist do NOTHING, forever, with nothing on
      // screen to say so: the P4-12 silent no-op, which this build refuses in the walk for
      // `LUMP_SUM_FROM_SUPER` and `NON_SUPER_INVESTMENT` and refuses here for the same reason.
      //
      // ⚠️ **It went off the moment it was written**: every `SUPER_CONTRIBUTION` fixture in
      // `test/core-projection-tax.test.mjs` names `interestIndex: 0` against a Person whose
      // `superInterests` is `[]`. They were plans `parsePlan` would have refused, and they passed
      // through chunks 1-3 because nothing read the index. That is the tripwire working.
      if (interest === undefined) {
        throw new RangeError(
          `entry ${arrangement.entryId} (SUPER_CONTRIBUTION) names superannuation interest ${arrangement.interestIndex}, and ${person.name} holds ${person.superInterests.length}: ` +
            'the interest is stated positionally and this position is not one of them. Which account the contribution is paid into is refused rather than guessed — crediting "the only one" is a rule that goes wrong the day the Person opens a second',
        );
      }
      refuseContributionAfterSwitch(personIndex, arrangement.interestIndex, date, `A salary sacrifice (entry ${arrangement.entryId})`, workedShare[personIndex] !== undefined);
      const tax = contributionsTax(
        fy,
        concessionalContributions({
          employerContributions: toCents(0),
          salarySacrificed: monthly,
          personalDeductible: personalDeductibleContributions(toCents(0), { noticeOfIntentAcknowledged: false }),
          otherConcessional: toCents(0),
        }),
      );
      return [{ person, personIndex, slot: arrangement.interestIndex, interest, tax, entryId: arrangement.entryId }];
    });
    contributionsThisMonth.forEach(({ person, interest, tax, entryId }) => {
      lines.push(
        Object.freeze({
          direction: 'inflow',
          effect: 'wealth',
          description: salarySacrificeDescription(person.name, interest.phase),
          amount: tax.netOfTax,
          // The rate IS carried — this is not a `'not carried'` line — and the caveat
          // `contributionsTax` attaches travels with it: Division 293's second 15% is not priced
          // here, and for a Person over the threshold the fund's charge is not the whole tax.
          provenance: taxProvenance('superannuation contributions tax', tax.provenance, [
            `${tax.assessableContributions} cents sacrificed, less ${tax.amount} cents of contributions tax at ${tax.rate}`,
            'this Person’s Superannuation Guarantee is contributed on its own line and taxed on its own dollars (P6-8 brief 3, chunk 2b); the 15% is flat, so the charge on the sacrificed amount is the same either way. The CAP is measured on the two TOGETHER (brief 3, final chunk) — this arrangement plus the Guarantee, against the general concessional cap for the year it started in — so this figure is not an unchecked one. It is still not a finding that the Person has no excess: carry-forward headroom is not run, and a personal deductible contribution is a limb this model holds no field for',
          ]),
          attribution: statedBy(entryId),
        }),
      );
    });

    // --- P6-8 brief 3 chunk 2b: THE GUARANTEE ARRIVES, LESS THE FUND'S 15% ----------------------
    //
    // The other half of the note pushed at the top of this tick, and the same shape as the
    // sacrifice credit immediately above it for the same reasons: `'wealth'` and never `'cash'`,
    // because the money goes from the employer to the fund and the Household never holds it — a
    // cash line would put a year's employer contributions into the Offset Account and let the
    // Waterfall spend them on groceries — and written back AFTER the growth, on the purchase
    // convention, so a contribution made in month n earns its first return in month n + 1.
    //
    // **The amount is `tax.netOfTax` and there is no second arithmetic anywhere.** The note, this
    // line and the write-back below all read one `ContributionsTax`, computed once in
    // `superGuaranteeThisMonth`, so the figure on screen is the figure the balance moved by.
    guaranteesThisMonth.forEach(({ person, interest, slot, tax, provenance }) => {
      lines.push(
        Object.freeze({
          direction: 'inflow',
          effect: 'wealth',
          description: superGuaranteeDescription(person.name, interest.phase),
          amount: tax.netOfTax,
          // BOTH records travel: the fund's 15% from `contributionsTax`, and the Guarantee's own —
          // SGAA s 17A(2)'s charge percentage and register O19's unread earnings limbs — from the
          // module that computed the year's figure. A line carrying only the tax record would
          // report a 15% whose base had no provenance at all.
          provenance: taxProvenance('superannuation contributions tax', mergeProvenance(tax.provenance, provenance), [
            `${tax.assessableContributions} cents of employer Superannuation Guarantee, less ${tax.amount} cents of contributions tax at ${tax.rate}`,
            `paid into superannuation interest ${slot}, which is where this plan states or derives that this Person’s employer pays (register O82)`,
            'it counts towards the general concessional cap, and where this Person states a salary sacrifice the two are measured against that cap together (P6-8 brief 3, final chunk). On its own it cannot exceed the cap, because SGAA s 10A(5)’s maximum contributions base is derived from the cap itself',
          ]),
          attribution: NO_STATING_ENTRY.superannuationGuarantee,
        }),
      );
    });

    // **The reconciliation, computed here and asserted in the tests**: a `Month`'s closing balance is
    // its opening balance plus every inflow less every outflow, and nothing else. `Month` reports both
    // ends precisely so that the lines between them can be checked rather than trusted.
    const closingBalance = lines.reduce<number>(
      (balance, line) => balance + cashMovement(line),
      openingBalance,
    ) as Cents;
    // The `SHORTFALL_LINE` makes this exact rather than hopeful: what the Waterfall could not fund is
    // on the inflow side, so the balance lands at nil instead of going negative. A negative here would
    // be an unstated loan at an unstated rate.
    //
    // **This refusal is the second DECLARED SURVIVOR, and it is unreachable for a provable reason.**
    // The reason is now the sweep immediately above and nothing subtler: every line of the month has
    // been pushed by the time it runs, it computes the same reduction this one does, and it pushes an
    // inflow for exactly the deficit where there is one — so `closingBalance` is `max(0, beforeSweep)`
    // by construction. (Before chunk 6 the argument was arithmetic about the Waterfall alone, and
    // chunk 6 is what broke it: limb 3's draw was to NEED and the CGT it realised was an outflow the
    // Waterfall never saw, so the old proof's "nothing after the Waterfall pushes an OUTFLOW" clause
    // is simply false now. The guard did not become wrong — its defence moved. P10-4 closed the limb
    // 3 half of that on 2026-09-21, but an entry-driven sale still charges tax after the Waterfall,
    // so the sweep is still what this guard rests on.) Deleting this `throw`
    // therefore fails ZERO tests and always will, for as long as the sweep runs last: this guard
    // exists to go off on the day somebody pushes a line after it, not to catch a case that exists
    // today.
    if (closingBalance < 0) {
      throw new RangeError(
        `the Waterfall left ${month} with a closing balance of ${closingBalance} — a shortfall was not recorded`,
      );
    }

    // **THE HOUSEHOLD AS AT THIS MONTH'S CLOSE — P4-6, and it is a SECOND substitution rather than a
    // second model.** `householdThisMonth` above is the month's OPENING position, which is what the
    // means test is assessed on (ADR-0005, first day of the month). `Month.accessibleAssets` is
    // specified at the CLOSE, consistent with `closingBalance`, so it needs the balances as they
    // stand after this month's payments — and it gets them through the same `withBalances` the
    // opening view goes through, so there is one `Household` shape and no parallel reading of it.
    //
    // Three differences from the opening view, each the other half of a line already pushed above:
    //   * the Offset is `closingBalance` and not `openingBalance`;
    //   * each super balance is less this month's `drawnPerInterest` share — the same figure the
    //     `PENSION_MINIMUM_LINE` carries, so a balance cannot fall here without a line to explain it;
    //   * the parcels are the ones that survived this month's disposals, PLUS the ones this month's
    //     buys acquired. The buy is the reason this cannot simply read `balances`: the cash left the
    //     Offset inside `closingBalance` and the parcel is not written back until after the growth
    //     step below, so omitting it would report a Household that spent the money and got nothing.
    //
    // **What is deliberately NOT in it: this month's investment growth.** The return is applied at
    // the END of the tick under the walk's standing convention — a month is assessed on what it
    // OPENS with — so the closing figure here is the month's transactions and no return, exactly as
    // `closingBalance` is (the Offset has no growth step: its interest is a cash line, already inside
    // `closingBalance`, 2026-09-23). A figure that carried the growth would
    // be next month's opening position wearing this month's date.
    const closingParcels =
      purchases.length > 0
        ? parcelsAfterPurchases(balances.map((held) => held.parcels), purchases)
        : balances.map((held) => held.parcels);
    const superAtClose = balances.map((held, personIndex) =>
      held.superInterestBalances.map((balance, slot) =>
        subCents(balance, (drawnPerInterest[personIndex]?.[slot] ?? 0) as Cents),
      ),
    );
    const householdAtClose = withBalances(
      household,
      balances.map((held, personIndex) => ({
        parcels: closingParcels[personIndex] as readonly Parcel[],
        // Already this month's CLOSING figure: the write-back above ran before any line was pushed.
        workBonusBalance: held.workBonusBalance,
        superInterestBalances: superAtClose[personIndex] as readonly Cents[],
      })),
      closingBalance,
      inForceIncomePerFortnight,
      (personIndex, slot) => effectivePhaseFor(personIndex, slot, date),
      (personIndex, slot) => switchedOn(personIndex, slot, date),
    );
    const releasedAtClose = (personIndex: number, slot: number): Cents | undefined => releasedWhileBackAtWork(personIndex, slot)?.released;
    // The reachable figure per Person, on the CLOSING Household — the same argument, on the same
    // day, that `accessibleAssets` below is computed with.
    const accessibleAtClose = accessibleWealthByPerson(householdAtClose, date, gainfulEmploymentAsAt, releasedAtClose);

    months.push(
      Object.freeze({
        month,
        openingBalance,
        closingBalance,
        lines: Object.freeze(lines),
        // **P4-4's polish — what did NOT move, beside what did.** Four Waterfall limbs every month
        // plus a note for each register that does not reach this one. `lines` is unchanged by its
        // presence: a note is not a money movement and none is manufactured as a zero-amount line.
        notes: Object.freeze(notes),
        // **This month's own entries, then the levels still in force, deduplicated (P4-4) — and the
        // widening is strictly an APPEND.** Every month's array is exactly the array it was before
        // P4-4 with the standing levels added at the end; no id moves, none is dropped, and a month
        // whose entries are all dated in it is byte-identical to what it always was. The order is
        // therefore *what happened this month, then what was already standing*, and each half keeps
        // its own order — the Scenario's for the first, oldest-governing-first for the second.
        appliedEntryIds: Object.freeze([
          ...new Set([...entriesThisMonth.map((entry) => entry.id), ...governing.values()]),
        ]),
        // **P14-16 — the RAD, net of retention, added in at OPENING (`radHeldOpening` above) rather
        // than left the walk-local `radBalance` slice 3a kept it in.** It is EXEMPT from the Age
        // Pension assets test (the asymmetry `radBalance`'s own comment turns on) and so belongs in
        // `protectedAssets` and never `assessableAssets`, exactly as an exempt super interest already
        // does — this is an ADDITION beside `assets.protectedAssets`, never a change to `assets`
        // itself, so the ADR-0005 assertion above (which reads `assets.assessableAssets` alone) and
        // `agedCareMeansAssessment`'s own combined `assessableAssetsExcludingHomeAndRad` are
        // untouched by it.
        protectedAssets: addCents(
          assets.protectedAssets,
          radHeldOpening.reduce<Cents>((total, held) => addCents(total, held), toCents(0)),
        ),
        assessableAssets: assets.assessableAssets,
        // **P4-11: the THIRD reader of the one cessation expression** (2026-09-19). Handed the
        // same `gainfulEmploymentAsAt` the entry path and limb 5 read, so this figure cannot
        // report money unreachable while the Waterfall above it spends that very balance.
        accessibleAssets: accessibleWealth(householdAtClose, date, gainfulEmploymentAsAt, releasedAtClose),
        // **P7-6 — the three figures above, per Person, in `household.persons` order.** The
        // protected and assessable halves come from the very `AssetSplit` the two scalars above are
        // read off, so a member cannot disagree with the total it is part of; the reachable half is
        // `accessibleWealthByPerson` on the SAME closing Household `accessibleAssets` is computed
        // from, so the two cannot answer differently about a cessation or a phase. The Offset is in
        // neither: it is the Household's, and it is `closingBalance` on this very object.
        // **The RAD addition above is repeated per Person here, on the SAME `radHeldOpening[i]`, so
        // the members still sum to the scalar exactly (P7-6's own invariant) — a household's RAD is
        // its resident's own asset, never pooled onto a partner who paid none of it.**
        assetsByPerson: Object.freeze(
          household.persons.map((_person, personIndex) =>
            Object.freeze({
              protectedAssets: addCents(
                (assets.byPerson[personIndex] as PersonAssetSplit).protectedAssets,
                radHeldOpening[personIndex] as Cents,
              ),
              assessableAssets: (assets.byPerson[personIndex] as PersonAssetSplit).assessableAssets,
              accessibleAssets: accessibleAtClose[personIndex] as Cents,
            }),
          ),
        ) as Month['assetsByPerson'],
        // **Every interest of every Person, on the SAME closing balances `householdAtClose` was built
        // from** — so this total and `accessibleAssets` cannot disagree about which super is there.
        superBalance: superAtClose.flat().reduce((total, balance) => addCents(total, balance), toCents(0)),
        // **Every Person's Non-Super Portfolio at market value, on that same closing Household** —
        // this month's sales out and buys in, and no growth, exactly as `closingBalance` and
        // `superBalance` are read, so the three add up to total wealth at the close.
        closingNonSuperPortfolio: householdAtClose.persons.reduce<Cents>(
          (total, person) => addCents(total, financialAssets(person)),
          toCents(0),
        ),
        // **Cash paid OUT of super this month** — the lines `paidOutOfSuper` names, summed whole.
        incomeFromSuper: lines
          .filter((line) => paidOutOfSuper.has(line.description))
          .reduce((total, line) => addCents(total, line.amount), toCents(0)),
        // **WHAT IS STILL OWED, at this month's close (P3-16 slice 2).** The local the walk already
        // carries, read AFTER the write-back above, so the figure here is the closing balance the
        // month's own two mortgage lines took the household to and not the one it opened with.
        //
        // **The key is OMITTED where there is no loan, and that is the whole of the widening's
        // safety.** A Household that states no mortgage emits no key in any month — so every walk
        // written before this field is byte-identical, word for word, and `core-mortgage.test.mjs`
        // pins that the string "mortgage" appears nowhere in such a walk. Nil is NOT that case: a
        // loan that has amortised to nil keeps reporting `0`, which is the loan CLEARED.
        ...(mortgage === undefined ? {} : { mortgageBalance }),
        // **P14-16 — the RAD held, net of retention, at THIS month's CLOSE** (`radBalance`/
        // `radRetentionWithheld` already carry this month's own payment/retention/refund by this
        // point in the tick) — `mortgageBalance`'s own terms: OMITTED for a walk with no
        // `ENTER_CARE`, so it stays byte-identical, and reported from the entry's own month on even
        // where it reads nil (a DAP-only resident, or the household after a refund) — nil is the
        // loan-cleared reading `mortgageBalance` already established, not absence. This is the
        // figure `Month.closingBalance + Month.superBalance + Month.closingNonSuperPortfolio +
        // Month.radHeld` (the app's "Total wealth" column) adds in, on `closingBalance`'s own clock —
        // deliberately the CLOSING figure and not `radHeldOpening` above, which is `protectedAssets`'s.
        ...(careEntry.some((entered) => entered !== undefined)
          ? {
              radHeld: household.persons.reduce<Cents>(
                (total, _person, personIndex) =>
                  addCents(total, subCents(radBalance[personIndex] as Cents, radRetentionWithheld[personIndex] as Cents)),
                toCents(0),
              ),
            }
          : {}),
        // **P9-2a — the HEAS debt at THIS month's CLOSE, summed across Persons** (`heasDebt[i]`
        // already carries this month's own draw and interest by this point in the tick, `radHeld`'s
        // own per-Person reduce just above) — `mortgageBalance`'s own terms: OMITTED for a walk
        // with no `HEAS_DRAW`, so it stays byte-identical, and reported from the entry's own month
        // on. This is the figure `Month.heasDebt`'s own doc says total wealth SUBTRACTS — the
        // opposite of `radHeld`, and for the reason stated there.
        ...(heasEntry.some((entered) => entered !== undefined)
          ? { heasDebt: household.persons.reduce<Cents>((total, _person, personIndex) => addCents(total, heasDebt[personIndex] as Cents), toCents(0)) }
          : {}),
        // **P12-1 — who has died, OMITTED while nobody has**, on `mortgageBalance`'s own terms: a
        // walk with no death carries no key and is byte-identical.
        ...(deceasedNow === undefined ? {} : { died: Object.freeze([deceasedNow]) }),
        // **The assets test's two thresholds, off the SAME entitlement the pension above was paid
        // from** — omitted where none was computed (outside the parameter window).
        ...(entitlement === undefined
          ? {}
          : {
              assetsTestThresholds: Object.freeze({
                fullPensionUpTo: entitlement.assetsTest.freeArea,
                noPensionAbove: entitlement.assetsTest.cutOff,
              }),
            }),
        // **P7-5 — the derived home status, omitted where no entry governs the home.**
        ...(derivedHomeStatus === undefined ? {} : { homeStatus: derivedHomeStatus }),
        // **P5-3 limb 2 — the lines' records merged upward, after `lines` is complete.** Derived
        // from the array beside it and from nothing else, so a line that gained a stamp cannot fail
        // to reach the month and the month cannot claim a register no line of it carries.
        provenance: monthProvenance(lines),
      }),
    );
    // Next month opens where this one closed. The single place the balance moves between months.
    openingBalance = closingBalance;
    // **And the investment balances grow, once, at the END of the tick.** The ordering convention,
    // stated because the tick forces one: a month is assessed on the balances it OPENS with, so
    // month 0 is the Household as stated at `settings.asAtDate` and month n is n months of
    // compounding. It is the same convention `firstDayOf` already takes for the Age Pension
    // parameters — the month reads its inputs at its own beginning — and it is the reason a
    // reindexation and a return both appear from the following month rather than within the month.
    //
    // **The intra-month ordering question does NOT arise here and is NOT settled here.** Growth
    // versus drawdown — whether a month's minimum is paid out of the opening or the grown balance —
    // is a real question with a real answer and it needs a drawdown to be a question at all. There
    // is none in this chunk, so it is left to 5b rather than decided early by an accident of where
    // this loop happens to put a `for`.
    //
    // **AND CHUNK 5B SETTLED IT: DRAWDOWN FIRST, THEN GROWTH.** The paragraph above stood until
    // 2026-09-17, when the user ruled. Every super balance goes through
    // `balanceAfterDrawdownAndGrowth`, which subtracts the month's draw and grows what is left, so
    // the month's return is earned on the post-payment balance. The whole ruling is in that
    // function's doc, including the direction: it slightly UNDER-states a real household's balance.
    //
    // **P4-4 — the figures are no longer computed here.** `grownParcels` and `grownSuper` were
    // computed above, where the `GROWTH_LINE`s were written off them, and this is the write-back
    // half of that one change. Recomputing them here would let the line and the balance drift apart,
    // which is the half-of-one-change failure `PENSION_MINIMUM_LINE`'s doc names.
    balances.forEach((held, personIndex) => {
      held.parcels = grownParcels[personIndex] as readonly Parcel[];
      for (let slot = 0; slot < held.superInterestBalances.length; slot += 1) {
        // RF-1: the fees and insurance come out before the growth, and a loss is a debit too.
        clampReleased(personIndex, slot, (held.superInterestBalances[slot] ?? 0) - (drawnPerInterest[personIndex]?.[slot] ?? 0) - (feesSuper[personIndex]?.[slot]?.administration ?? 0) - (feesSuper[personIndex]?.[slot]?.investment ?? 0) - (insuranceSuper[personIndex]?.[slot] ?? 0));
        held.superInterestBalances[slot] = grownSuper[personIndex]?.[slot] as Cents;
        clampReleased(personIndex, slot);
      }
    });
    // **AND THE MONTH'S SALARY SACRIFICE ARRIVES AFTER THAT GROWTH (P6-8 brief 2, chunk 4)** — the
    // parcel-purchase convention immediately below, taken for the same reason: money that arrives
    // during month n earns its first return in month n + 1. This is the OTHER HALF of the line
    // written above, off the very same `tax.netOfTax`, so the balance cannot move by an amount no
    // line reported. **AND THE GUARANTEE ARRIVES BESIDE IT (P6-8 brief 3, chunk 2b)**, in the same
    // place, on the same convention and off its own `tax.netOfTax`. These two are the only places
    // in the walk a super balance goes UP other than growth.
    [...contributionsThisMonth, ...guaranteesThisMonth].forEach(({ personIndex, slot, tax }) => {
      const held = balances[personIndex];
      if (held === undefined) return;
      held.superInterestBalances[slot] = addCents(held.superInterestBalances[slot] ?? toCents(0), tax.netOfTax);
    });
    // **AND THE DIVISION 293 RELEASE AUTHORITY IS SERVED — P6-10 M3, the third and only DOWNWARD
    // movement of a super balance outside a drawdown.**
    //
    // The other half of the `DIVISION_293_RELEASE_LINE` written in this month's year-end
    // settlement, off the very same figure, so the balance cannot fall by an amount no line
    // reported. **Placed LAST and deliberately**: after the growth, so the fund earns its month on
    // the money before the authority takes it; and after the two credits, so the balance tested
    // below is every cent the interest holds when the authority is served rather than a reading
    // taken before this month's contribution arrived. Being last also means a Person whose only
    // money is this month's own Guarantee can meet the liability out of it.
    //
    // **The nominated slot and nothing else.** `release.slot` came from
    // `division293ReleaseDestination`, which is the one reader of the election; nothing here scans
    // for "the accumulation one" or falls back to zero, because a release debited to the wrong
    // interest is money taken out of an account nobody nominated — and where the interests sit on
    // opposite sides of `splitAssets`, out of a differently ASSESSED one.
    //
    // ⚠️ **NO SILENT NO-OP, and the `?? toCents(0)` is what makes that so.** A missing Person or a
    // missing slot reads as a balance of NIL, which cannot meet a positive liability, so the
    // refusal fires by name instead of the debit quietly doing nothing (P4-12's defect, which this
    // build refuses in the walk wherever it can be reached).
    div293ReleasesThisMonth.forEach(({ person, personIndex, slot, amount, fy: releasedFy }) => {
      const held = balances[personIndex];
      const balance = held?.superInterestBalances[slot] ?? toCents(0);
      refuseReleaseAboveBalance({ person, slot, fy: releasedFy, balance, amount });
      (held as NonNullable<typeof held>).superInterestBalances[slot] = subCents(balance, amount);
      clampReleased(personIndex, slot);
    });
    // **AND THE PARCELS BOUGHT THIS MONTH ARRIVE AFTER THAT GROWTH.** A parcel bought in month n earns
    // its first return in month n + 1 — the same convention as every other balance here (a month is
    // assessed on what it opens with), and what keeps a parcel at `costBase === marketValue` for the
    // whole of its purchase month. The write is the OTHER HALF of the outflow line above, taken from
    // the very same `funded` figure, so no parcel can appear without the cash having moved.
    if (purchases.length > 0) {
      const afterPurchases = parcelsAfterPurchases(balances.map((held) => held.parcels), purchases);
      balances.forEach((held, personIndex) => {
        held.parcels = afterPurchases[personIndex] as readonly Parcel[];
      });
    }
  }
  return Object.freeze(months);
};
