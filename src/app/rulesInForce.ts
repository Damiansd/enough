// "The rules in force" (user request 2026-09-28, built 2026-09-30) — the legislated figures the
// forecast uses on one date, each with the date it took effect and, where a later figure is
// already law, the date it changes. Pure: no DOM, no plan, no engine; `settingsPanel.ts` draws it.
//
// **Every value is a lookup, never a literal.** Figures come from `assumptionAt` and the four
// date-resolved lookups the walk itself uses — `taxYear`, `agePensionPeriodAt`, `deemingRatesAt`,
// `agedCarePeriodAt` — so a row cannot disagree with the month table's "Set by law" figure for the
// same day. `test/app-rules-in-force.test.mjs` holds a canary that fails on any numeric literal in
// this file, and on any string with a digit in it that is not an assumption key or a guide label.
//
// **A forecast is not a row.** A figure the law indexes (the contribution caps, the Age Pension
// once past its last published rates, the aged care schedule past its window) has no row on a
// date past its last published value: the forecast raises it with the Forecast assumptions, and
// the panel's ⓘ says so. A figure the law holds until amended (the tax scales, the offsets) keeps
// its row, marked where it is a year the law carries forward rather than one it states.
//
// **Every key is classified.** `RULE_CLASSIFICATION` names every key `assumptionKeys()` returns
// as shown (the area and the group of rows it feeds) or hidden (why), and the test asserts the
// two sets are equal — so a refresh that adds a leaf fails until someone decides about it.
//
// **Known to be outside the tree**, and so not on this panel: the CGT main-residence six-year
// absence rule's month count (`core/parsePlan.ts`) and the transfer balance account's rounding
// (`core/transferBalanceAccount.ts`). The test lists them too, so moving one in is noticed.
import {
  agePensionPeriodAt,
  agedCarePeriodAt,
  assumptionAt,
  assumptionKeys,
  deemingRatesAt,
  taxYear,
} from '../data/assumptions/index.js'; // `.js` is correct in a `.ts` file — see tsconfig.json
import type { AgePensionPeriod, AgedCarePeriod, Assumption, FinancialYear, IsoDate, TaxBracket, TaxYear } from '../data/assumptions/index.js';
import { financialYearContaining, startOfFinancialYear } from '../core/financialYear.js';
import type { Cents } from '../core/money.js';
import { formatDollars } from './displayMoney.js';
import { fractionAsPercent } from './planEdits.js';

export type RulesArea = 'tax' | 'super' | 'agePension' | 'heas' | 'agedCare';

/** How a figure reads: money (cents) with its period, a fraction shown as a percent, or a count. */
export type RuleUnit = 'dollars' | 'aFortnight' | 'aDay' | 'rate' | 'percent' | 'age' | 'plainDollars';

/** A figure as a lookup answers it on one date. `amount` absent: stamped, but not in force yet. */
interface Reading {
  readonly amount?: number;
  readonly from?: IsoDate;
  /** The last year the law states, where the year asked for is one it carries forward. */
  readonly standingFrom?: FinancialYear;
  /** A figure standing in for a year whose own figure is not published (register §2.7). */
  readonly fallback?: { readonly figureYear: FinancialYear; readonly missingYear: FinancialYear };
}

interface RowSpec {
  readonly id: string;
  readonly area: RulesArea;
  /** The `RULE_CLASSIFICATION` group this row belongs to. */
  readonly group: string;
  readonly label: string;
  readonly unit: RuleUnit;
  /** `undefined`: no row on this date — before the first figure, or past the last published one. */
  readonly read: (date: IsoDate) => Reading | undefined;
}

export interface RuleRow extends Reading {
  readonly id: string;
  readonly area: RulesArea;
  readonly group: string;
  readonly label: string;
  readonly unit: RuleUnit;
  /** The first later stamp at which the law already sets a different figure. */
  readonly changes?: { readonly date: IsoDate; readonly amount: number };
}

export interface RulesSection {
  readonly area: RulesArea;
  readonly title: string;
  readonly rows: readonly RuleRow[];
}

export const RULES_AREAS: readonly { readonly area: RulesArea; readonly title: string }[] = [
  { area: 'tax', title: 'Tax' },
  { area: 'super', title: 'Super' },
  { area: 'agePension', title: 'Age Pension' },
  { area: 'heas', title: 'Home Equity Access Scheme' },
  { area: 'agedCare', title: 'Aged care' },
];

// --- The classification: every key, shown or hidden ------------------------------------------------

export type RuleClassification =
  | { readonly shown: { readonly area: RulesArea; readonly group: string } }
  | { readonly hidden: string };

const WORDS = 'a rule stated in words, not a figure';
const SWITCH = 'a yes-or-no switch inside a rule, not a figure';
const FORMULA = 'a formula; the figures it is built from, or that it produces, are what a person recognises';
const STEP = 'a counting, rounding or ordering step inside a sum';
const INDEXATION = 'indexation machinery (index numbers, base amounts, benchmarks); the published figures it produces are shown instead';
const HISTORY = 'a superseded or historical figure, not in force on any forecast date';
const UNUSED = 'recorded for its source, but nothing in the forecast uses it';
const QUALIFIED = 'a qualification the forecast assumes each person meets';
const TAPER_STEP = 'a step in how an offset or levy phases in or out; its headline figure is shown';
const HOLDING_RULE = 'part of the share holding-period test, which the forecast assumes you pass';
const ORDER = 'the order the tax offsets are applied in';

const shown = (area: RulesArea, group: string, keys: readonly string[]): [string, RuleClassification][] =>
  keys.map((key) => [key, { shown: { area, group } }]);
const hidden = (reason: string, keys: readonly string[]): [string, RuleClassification][] =>
  keys.map((key) => [key, { hidden: reason }]);

const G = {
  incomeTax: 'Income tax',
  medicare: 'Medicare levy',
  medicareThresholds: 'Medicare levy low-income thresholds',
  lito: 'Low income tax offset',
  sapto: 'Seniors and pensioners tax offset',
  workExpenses: 'Work expenses deduction',
  wato: 'Working Australians tax offset',
  cgt: 'Capital gains',
  franking: 'Franking credits',
  concessional: 'Concessional cap',
  nonConcessional: 'Non-concessional cap',
  transferBalance: 'Transfer balance cap',
  guarantee: 'Super guarantee',
  fundTax: 'Tax inside super',
  highIncome: 'Extra contributions tax for high incomes',
  largeBalance: 'Extra earnings tax for large balances',
  access: 'Getting at your super',
  drawdown: 'Minimum pension draw',
  carryForward: 'Catch-up contributions',
  listo: 'Low income super tax offset',
  downsizer: 'Downsizer contribution',
  pensionAge: 'Age Pension age',
  fullPension: 'Full Age Pension',
  meansTest: 'Means test limits',
  tapers: 'Means test tapers',
  deeming: 'Deeming',
  workBonus: 'Work Bonus',
  heasInterest: 'Home Equity Access Scheme interest',
  heasLimit: 'Home Equity Access Scheme limit',
  careFees: 'Care home fees',
  mpir: 'Care home interest rate',
} as const;

export const RULE_CLASSIFICATION: Readonly<Record<string, RuleClassification>> = Object.freeze(Object.fromEntries([
  // --- Age Pension ---
  ...shown('agePension', G.pensionAge, ['agePension.qualification.qualifyingAge']),
  ...shown('agePension', G.fullPension, [
    'agePension.paymentRates.2026-03-20',
    'agePension.paymentRates.2026-09-20',
    'agePension.energySupplement',
    'agePension.maximumPaymentRate',
  ]),
  ...shown('agePension', G.meansTest, [
    'agePension.meansTest.2025-07-01',
    'agePension.meansTest.2026-07-01',
    'agePension.assetsTest.nonHomeownerFreeArea',
  ]),
  ...shown('agePension', G.tapers, ['agePension.incomeTest.taper', 'agePension.assetsTest.taper']),
  ...shown('agePension', G.deeming, [
    'agePension.deemingDeterminations.2020-05-01',
    'agePension.deemingDeterminations.2025-09-20',
    'agePension.deemingDeterminations.2026-03-20',
    'agePension.deemingDeterminations.2026-09-20',
  ]),
  ...shown('agePension', G.workBonus, ['agePension.workBonus.fortnightlyAccrual']),
  ...hidden('a time limit that applies only on the way into aged care; the aged care chapter gives it', ['agePension.assetsTest.careVacatedHomeExemptionMonths']),
  ...hidden('a time limit on one event, a home sale; the home-sale chapter gives it', ['agePension.assetsTest.saleProceedsExemptionMonths']),
  ...hidden(FORMULA, [
    'agePension.assetsTest.cutOff',
    'agePension.incomeTest.cutOff',
    'agePension.bereavement.lumpSumFormula',
  ]),
  ...hidden(WORDS, [
    'agePension.assetsTest.entitlementIsTheLesser',
    'agePension.assetsTest.homeownerTest',
    'agePension.assetsTest.homeownerWithAMortgage',
    'agePension.assetsTest.principalHomeExemption',
    'agePension.bereavement.singleRateFrom',
    'agePension.bereavement.whoIsPaid',
    'agePension.treatment.accountBasedPensionAssetsTest',
    'agePension.treatment.accountBasedPensionIncomeTest',
    'agePension.treatment.pensionerConcessionCard',
    'agePension.treatment.youngerPartnerExemption',
    'agePension.treatment.youngerPartnerExemptionEnds',
    'agePension.workBonus.eligibleIncome',
    'agePension.workBonus.orderOfApplication',
  ]),
  ...hidden(SWITCH, [
    'agePension.indexation.energySupplementIndexed',
    'agePension.qualification.residentOnTheDayOfClaim',
    'agePension.treatment.accountBasedPensionGrandfathering',
    'agePension.treatment.oneMemberOfAgeUsesCoupleThresholds',
    'agePension.workBonus.accruesWithoutWork',
    'agePension.workBonus.availableOnTheTransitionalRate',
    'agePension.workBonus.poolable',
  ]),
  ...hidden(INDEXATION, [
    'agePension.indexation.cpiReferenceQuarter',
    'agePension.indexation.mechanism',
    'agePension.indexation.mtaweAnchor',
    'agePension.indexation.mtaweBenchmark',
    'agePension.indexation.mtaweReferenceQuarter',
    'agePension.indexation.singleToCoupleRatio',
  ]),
  ...hidden(STEP, ['agePension.indexation.publishedRoundingSteps']),
  ...hidden(QUALIFIED, [
    'agePension.qualification.minimumAustralianResidenceYears',
    'agePension.qualification.unbrokenResidenceYears',
  ]),
  ...hidden(HISTORY, ['agePension.rateHistory']),
  ...hidden('nil: Rent Assistance is not paid to a homeowner, so there is no figure to show', ['agePension.rentAssistanceHomeowner']),
  ...hidden('the transitional rate for long-standing pensioners, which the forecast does not model', [
    'agePension.transitionalMaximumRate',
    'agePension.transitionalMaximumRate20Sep2026',
  ]),
  ...hidden('the most a Work Bonus balance can bank; a detail of the Work Bonus shown', ['agePension.workBonus.maximumBalance']),
  ...hidden('the balance a new pensioner starts with; a detail of the Work Bonus shown', ['agePension.workBonus.startingBalance']),

  // --- Aged care ---
  ...shown('agedCare', G.careFees, ['agedCare.residentialSchedule.2026-09-20']),
  ...shown('agedCare', G.mpir, ['agedCare.mpir.2026-07-01', 'agedCare.mpir.2026-10-01']),
  ...hidden(FORMULA, ['agedCare.dapFormula', 'agedCare.indexation.basicDailyFeeLinkage']),
  ...hidden(STEP, ['agedCare.feeWaterfallOrder']),
  ...hidden('caps for people who entered care under the old arrangements; every care entry in a forecast is under the new ones', ['agedCare.grandfatheredCaps.2026-09-20']),
  ...hidden(WORDS, ['agedCare.grandfatheringStructure']),
  ...hidden(INDEXATION, ['agedCare.indexation.linkageUnknown', 'agedCare.indexation.mechanism']),
  ...hidden('the banded means-test rates behind the care fees; the aged care chapter walks through them', ['agedCare.meansTestTaper']),
  ...hidden('how much of a refundable deposit a home may keep; a detail of the deposit rules', ['agedCare.radRetention']),
  ...hidden('care at home, which the forecast does not model; it models care in a care home', [
    'agedCare.supportAtHome.classificationBudgets',
    'agedCare.supportAtHome.reclassification1Oct2026',
  ]),

  // --- Franking (shown under Tax) ---
  ...shown('tax', G.franking, ['franking.smallShareholder.ceiling']),
  ...hidden(HOLDING_RULE, [
    'franking.atRisk.minimumNetDelta',
    'franking.holdingPeriod.dayCounting',
    'franking.holdingPeriod.days',
    'franking.holdingPeriod.qualificationWindows',
    'franking.holdingPeriod.widelyHeldTrustDays',
  ]),
  ...hidden('dividend washing, which the forecast does not model', ['franking.dividendWashing.ceiling']),
  ...hidden(SWITCH, [
    'franking.excessCreditsRefundable.complyingFund',
    'franking.excessCreditsRefundable.individual',
    'franking.excessCreditsRefundable.nonComplyingFundOrAdf',
  ]),
  ...hidden('the ceiling on a franked share you type (all of it); a check on input, not a figure the law sets for you', ['franking.maximumFrankingPercentage']),
  ...hidden(WORDS, [
    'franking.parcelDisposalOrder',
    'franking.smallShareholder.boundary',
    'franking.smallShareholder.eligibleEntities',
  ]),

  // --- Home Equity Access Scheme ---
  ...shown('heas', G.heasInterest, ['heas.interest.rate']),
  ...shown('heas', G.heasLimit, ['heas.drawModes.fortnightlyCapMultiple']),
  ...hidden(FORMULA, [
    'heas.ageComponent.lookup',
    'heas.capacity.formula',
    'heas.capacity.securityValue',
    'heas.drawModes.fortnightlyRateDuringAnAdvancePeriod',
    'heas.interest.accrual',
  ]),
  ...hidden('a table by age used inside the loan-limit formula', ['heas.ageComponent.table']),
  ...hidden(WORDS, [
    'heas.ageComponent.recalculationCadence',
    'heas.ageComponent.whoseAge',
    'heas.capacity.coupleStructure',
    'heas.capacity.eligibleProperty',
    'heas.capacity.nominatedAmount',
    'heas.drawModes.maximumPaymentRateDefinition',
    'heas.eligibility.age',
    'heas.eligibility.bankruptcyExclusion',
    'heas.eligibility.qualifyingPayment',
    'heas.interest.debtMethodStatement',
    'heas.interest.reachingTheMaximumLoan',
    'heas.meansTest.debtAgainstAssessableRealAssets',
    'heas.noNegativeEquityGuarantee.adjustedValue',
    'heas.noNegativeEquityGuarantee.voidedBy',
  ]),
  ...hidden(STEP, [
    'heas.capacity.securityRounding',
    'heas.capacity.nilFloor',
    'heas.drawModes.advancePeriodFortnights',
    'heas.interest.compoundingPerYear',
  ]),
  ...hidden('a condition on the property, inside the loan-limit formula', ['heas.capacity.minimumInsurancePercentage']),
  ...hidden('the lump-sum advance limit; a detail of the scheme chapter', [
    'heas.drawModes.advanceCapMultiple',
    'heas.drawModes.maximumAdvancesPerPeriod',
    'heas.meansTest.advanceAssetExemptDays',
  ]),
  ...hidden(SWITCH, [
    'heas.eligibility.bothPartnersMustSign',
    'heas.meansTest.advanceDeemedFromDayOne',
    'heas.meansTest.debtReducesAssessableAssets',
    'heas.meansTest.fortnightlyStreamIsIncome',
    'heas.meansTest.pensionerConcessionCardAtNilEntitlement',
    'heas.noNegativeEquityGuarantee.exists',
  ]),
  ...hidden('a worked example kept to check the interest sum against', ['heas.interest.publishedWorkedExample']),
  ...hidden(HISTORY, ['heas.interest.supersededRates.2020-01-01', 'heas.interest.supersededWorkedExample']),

  // --- Super ---
  ...shown('super', G.concessional, ['superannuation.caps.concessional']),
  ...shown('super', G.nonConcessional, ['superannuation.caps.nonConcessional']),
  ...shown('super', G.transferBalance, ['superannuation.caps.generalTransferBalance']),
  ...shown('super', G.guarantee, ['superannuation.superGuarantee.chargePercentage']),
  ...shown('super', G.fundTax, [
    'superannuation.fundTax.contributionsTax',
    'superannuation.fundTax.earningsTaxAccumulation',
    'superannuation.fundTax.earningsTaxRetirement',
  ]),
  ...shown('super', G.highIncome, ['superannuation.division293.threshold']),
  ...shown('super', G.largeBalance, ['superannuation.division296.largeBalanceThreshold']),
  ...shown('super', G.access, [
    'superannuation.access.preservationAge',
    'superannuation.access.automaticReleaseAge',
    'superannuation.access.ttrMaximumDrawdown',
  ]),
  ...shown('super', G.drawdown, ['superannuation.access.minimumDrawdownFactors']),
  ...shown('super', G.carryForward, ['superannuation.carryForward.totalSuperBalanceTest']),
  ...shown('super', G.listo, [
    'superannuation.lowIncomeSuperTaxOffset.incomeThreshold',
    'superannuation.lowIncomeSuperTaxOffset.maximum',
    'superannuation.lowIncomeSuperTaxOffset.incomeThresholdFrom2027',
    'superannuation.lowIncomeSuperTaxOffset.maximumFrom2027',
  ]),
  ...shown('super', G.downsizer, ['superannuation.downsizer.minimumAge', 'superannuation.downsizer.cap']),
  ...hidden('a schedule item number, not a figure', ['superannuation.access.automaticReleaseAgeItem']),
  ...hidden('the age super payments become tax-free; today the same as the preservation age shown', ['superannuation.access.benefitsFromATaxedSourceFromAge']),
  ...hidden(WORDS, [
    'superannuation.access.benefitsFromATaxedSourceAt60',
    'superannuation.access.conditionOfRelease',
    'superannuation.access.conditionOfReleaseItems',
    'superannuation.access.retirementItemMapping',
    'superannuation.access.totalSuperBalanceDefinition',
    'superannuation.access.ttrMaximumUnadjusted',
    'superannuation.bringForward.ageGate',
    'superannuation.bringForward.laterYearCutOut',
    'superannuation.bringForward.trigger',
    'superannuation.carryForward.testDate',
    'superannuation.division293.incomeBase',
    'superannuation.division293.lowTaxContributedAmountDivergence',
    'superannuation.division293.lowTaxContributions',
    'superannuation.division293.modifiedLowTaxContributions',
    'superannuation.division293.taxableContributions',
    'superannuation.division296.earningsBasis',
    'superannuation.division296.exclusions',
    'superannuation.lowIncomeSuperTaxOffset.notAContribution',
    'superannuation.superGuarantee.earningsBase',
    'superannuation.superGuarantee.maximumContributionsBasePeriod',
    'superannuation.superGuarantee.paymentFrequency',
  ]),
  ...hidden(STEP, [
    'superannuation.access.minimumDrawdownNilFrom',
    'superannuation.access.minimumDrawdownProRataDenominator',
    'superannuation.access.minimumDrawdownRoundingStep',
    'superannuation.carryForward.applicationOrder',
    'superannuation.division296.percentageRounding',
  ]),
  ...hidden('relief from the minimum pension draw in past years (the GFC and COVID); not in force now', ['superannuation.access.minimumDrawdownRelief']),
  ...hidden('a flat rate that understates the rule: a transition to retirement pension takes the age-banded minimum pension draw shown', ['superannuation.access.ttrMinimumDrawdown']),
  ...hidden('the age limit on bringing forward after-tax contributions; the contributions chapter gives it', ['superannuation.bringForward.ageGateUnder']),
  ...hidden(FORMULA, [
    'superannuation.bringForward.arrangement',
    'superannuation.division296.totalSuperBalanceReference',
  ]),
  ...hidden(SWITCH, [
    'superannuation.bringForward.capIsFrozenOnceTriggered',
    'superannuation.superGuarantee.salarySacrificeIsQualifyingEarnings',
  ]),
  ...hidden(INDEXATION, [
    'superannuation.capIndexation.awoteBaseQuarterIndexNumber',
    'superannuation.capIndexation.awoteLatestPublishedQuarterIndexNumber',
    'superannuation.capIndexation.concessional',
    'superannuation.capIndexation.cpiDecemberQuarterIndexNumbers',
    'superannuation.capIndexation.cpiReferenceBase',
    'superannuation.capIndexation.div296LargeBalanceThreshold',
    'superannuation.capIndexation.div296VeryLargeBalanceThreshold',
    'superannuation.capIndexation.transferBalance',
  ]),
  ...hidden('the multiple that makes the non-concessional cap from the concessional one; the cap itself is shown', ['superannuation.caps.nonConcessionalMultiple']),
  ...hidden('the first year catch-up amounts could be built up; a detail of the catch-up rule', [
    'superannuation.carryForward.earliestGeneratingYear',
    'superannuation.carryForward.lookBackYears',
  ]),
  ...hidden('the extra rate for high incomes; the income it starts above is shown', ['superannuation.division293.rate']),
  ...hidden('a rate or date inside the large-balance tax; the balance it starts above is shown', [
    'superannuation.division296.additionalRate',
    'superannuation.division296.applicationYear',
    'superannuation.division296.baseRate',
    'superannuation.division296.commencementDate',
    'superannuation.division296.totalSuperBalanceAfterDeath',
    'superannuation.division296.transitionalNetCapitalGainFactor.2026-27',
    'superannuation.division296.transitionalNetCapitalGainFactor.2027-28',
    'superannuation.division296.transitionalNetCapitalGainFactor.2028-29',
    'superannuation.division296.transitionalNetCapitalGainFactor.2029-30',
    'superannuation.division296.veryLargeBalanceThreshold',
  ]),
  ...hidden('tax on non-arm’s-length income, which the forecast does not model', ['superannuation.fundTax.nonArmsLengthRate']),
  ...hidden('a condition or step inside the offset; its income limit and maximum are shown', [
    'superannuation.lowIncomeSuperTaxOffset.employmentIncomeShare',
    'superannuation.lowIncomeSuperTaxOffset.minimum',
    'superannuation.lowIncomeSuperTaxOffset.rate',
  ]),
  ...hidden('the pay ceiling for employer super, per employer; few plans reach it', ['superannuation.superGuarantee.maximumContributionsBase']),
  ...hidden('the deadline after a home sale; the downsizer chapter gives it', ['superannuation.downsizer.windowDays']),

  // --- Tax ---
  ...shown('tax', G.incomeTax, [
    'tax.years.2026-27.brackets',
    'tax.years.2026-27.taxFreeThreshold',
    'tax.years.2026-27.lowestMarginalRate',
    'tax.years.2026-27.secondLowestMarginalRate',
    'tax.years.2026-27.thirdMarginalRate',
    'tax.years.2026-27.topMarginalRate',
    'tax.years.2027-28.brackets',
    'tax.years.2027-28.taxFreeThreshold',
    'tax.years.2027-28.lowestMarginalRate',
    'tax.years.2027-28.secondLowestMarginalRate',
    'tax.years.2027-28.thirdMarginalRate',
    'tax.years.2027-28.topMarginalRate',
  ]),
  ...shown('tax', G.medicare, ['tax.medicareLevy.rate']),
  ...shown('tax', G.medicareThresholds, [
    'tax.medicareLevy.lowIncomeThresholds.singleLower',
    'tax.medicareLevy.lowIncomeThresholds.familyLower',
    'tax.medicareLevy.lowIncomeThresholds.seniorsSingleLower',
    'tax.medicareLevy.lowIncomeThresholds.seniorsFamilyLower',
  ]),
  ...shown('tax', G.lito, ['tax.lito.maximumOffset']),
  ...shown('tax', G.sapto, [
    'tax.sapto.baseRebateAmount.single',
    'tax.sapto.baseRebateAmount.coupleEach',
    'tax.sapto.baseRebateAmount.illnessSeparatedEach',
  ]),
  ...shown('tax', G.workExpenses, ['tax.s25130.maximumDeduction']),
  ...shown('tax', G.wato, ['tax.wato.maximumOffset']),
  ...shown('tax', G.cgt, ['tax.cgt.minimumTaxRate']),
  ...hidden('the same Medicare levy rate as the one shown, kept beside that year’s tax scale', ['tax.years.2026-27.medicareLevyRate']),
  ...hidden(SWITCH, [
    'tax.bracketThresholdsIndexed',
    'tax.lito.refundable',
    'tax.medicareLevy.upperThresholdsAreStored',
    'tax.s25130.maximumDeductionIndexed',
    'tax.sapto.baseRebateAmountsIndexed',
    'tax.sapto.refundable',
    'tax.sapto.transferAffectsEligibility',
    'tax.spouseContributionOffset.refundable',
    'tax.wato.carryForward',
    'tax.wato.maximumOffsetIndexed',
    'tax.wato.reducesMedicareLevy',
    'tax.wato.refundable',
    'tax.wato.transferable',
  ]),
  ...hidden(STEP, ['tax.cgt.indexationFactorDecimalPlaces', 'tax.sapto.roundingDirection']),
  ...hidden('a purchase date, not a rate: assets bought before it are outside capital gains tax', ['tax.cgt.preCgtCutoff']),
  ...hidden('the start date of the capital gains changes; it is the “changes” date on the capital gains row', ['tax.cgt.reformStart']),
  ...hidden('where the offset runs out; its maximum is shown', ['tax.lito.eligibilityCeiling']),
  ...hidden(TAPER_STEP, [
    'tax.lito.stageOneTaper',
    'tax.lito.stageOneThreshold',
    'tax.lito.stageTwoBaseAmount',
    'tax.lito.stageTwoTaper',
    'tax.lito.stageTwoThreshold',
    'tax.medicareLevy.familyShadeInBaseRate',
    'tax.medicareLevy.familyShadeInTaper',
    'tax.medicareLevy.shadeInRateSingles',
    'tax.sapto.taperRate',
    'tax.sapto.transferIncomeFloor',
    'tax.sapto.transferReductionRate',
    'tax.spouseContributionOffset.base',
    'tax.spouseContributionOffset.lowerThreshold',
    'tax.spouseContributionOffset.rate',
  ]),
  ...hidden('the top of the levy’s phase-in band; where the levy starts is shown', [
    'tax.medicareLevy.lowIncomeThresholds.familyUpper',
    'tax.medicareLevy.lowIncomeThresholds.seniorsFamilyUpper',
    'tax.medicareLevy.lowIncomeThresholds.seniorsSingleUpper',
    'tax.medicareLevy.lowIncomeThresholds.singleUpper',
  ]),
  ...hidden('an add-on to the family threshold for each dependent child', [
    'tax.medicareLevy.lowIncomeThresholds.familyLowerPerDependentChild',
    'tax.medicareLevy.lowIncomeThresholds.familyUpperPerDependentChild',
  ]),
  ...hidden(WORDS, [
    'tax.lito.incomeBase',
    'tax.medicareLevy.incomeBase',
    'tax.medicareLevy.seniorsThresholdSwitch',
    'tax.s25130.effectOnTaxableIncome',
    'tax.s25130.excludedFromReducers',
    'tax.s25130.floor',
    'tax.s25130.incomeBase',
    'tax.s25130.labourIncomeApproximation',
    'tax.s25130.netLabourIncomeLimb',
    'tax.s25130.reducers',
    'tax.s25130.residualOptimism',
    'tax.sapto.eligibility.amountBasis',
    'tax.sapto.eligibility.gaolExclusion',
    'tax.sapto.eligibility.incomeGateBasis',
    'tax.sapto.incomeBase',
    'tax.sapto.multipleItemRule',
    'tax.spouseContributionOffset.incomeTest',
    'tax.wato.entitlementTest',
    'tax.wato.incomeBase',
    'tax.wato.residencyTest',
  ]),
  ...hidden(FORMULA, [
    'tax.s25130.amount',
    'tax.sapto.threshold',
    'tax.sapto.transferAmount',
    'tax.wato.amount',
    'tax.wato.shadeInPoint',
  ]),
  ...hidden('the first year the rule applies; the row’s “from” date says the same', ['tax.s25130.firstIncomeYear', 'tax.wato.firstIncomeYear']),
  ...hidden('the same age as Age Pension age, shown', ['tax.sapto.eligibility.agePension']),
  ...hidden('a frozen figure inside the offset’s formula, not the offset itself', [
    'tax.sapto.rebateMaximumAmount',
    'tax.sapto.rebateReductionRate',
    'tax.sapto.rebateReductionThreshold',
  ]),
  ...hidden('the offset for contributing to a partner’s super; the spouse contribution chapter gives it', ['tax.spouseContributionOffset.maximumOffset']),
  ...hidden(ORDER, [
    'tax.wato.applicationOrder.beneficiaryOrPensionerItem',
    'tax.wato.applicationOrder.neutrality',
    'tax.wato.applicationOrder.order',
    'tax.wato.applicationOrder.residualItem',
    'tax.wato.applicationOrder.saptoItem',
    'tax.wato.applicationOrder.saptoTrusteeAssessedItem',
    'tax.wato.applicationOrder.watoItem',
  ]),
  ...hidden('the income it starts above; today the same as the tax-free threshold shown', ['tax.wato.entitlementThreshold']),
]));

// --- Reading a record -------------------------------------------------------------------------------

const record = (key: string): Assumption<unknown, string> => {
  const found = assumptionAt(key);
  if (found === undefined) throw new RangeError(`no assumption keyed ${key}`);
  return found;
};

/** A lookup that may refuse a date, as `undefined` — a date outside what it answers is not a row. */
const attempt = <T>(lookup: () => T): T | undefined => {
  try {
    return lookup();
  } catch (error) {
    if (error instanceof RangeError) return undefined;
    throw error;
  }
};

/**
 * One record, by its own stamp. A financial-year stamp the law INDEXES answers only its own year; one
 * the law holds until amended answers every later year too. A stamp later than the date is "not in
 * force yet"; a constant stamped for every year has no date to show.
 */
const stamped = (key: string, pick: (value: unknown) => number, indexed = false) => (date: IsoDate): Reading | undefined => {
  const held = record(key);
  const amount = pick(held.value);
  if (held.fy !== undefined) {
    const fy = held.fy as FinancialYear;
    if (indexed) return financialYearContaining(date) === fy ? { amount, from: startOfFinancialYear(fy) } : undefined;
    const from = startOfFinancialYear(fy);
    if (date < from) return {};
    const missingYear = held.priorYearFallbackFor as FinancialYear | undefined;
    return { amount, from, ...(missingYear === undefined ? {} : { fallback: { figureYear: fy, missingYear } }) };
  }
  if (held.effective !== undefined) {
    const from = held.effective as IsoDate;
    return date < from ? {} : { amount, from };
  }
  return { amount };
};

const itself = (value: unknown): number => value as number;

/** The tax year covering `date`, dated from the year the law states it for. */
const taxAt = (date: IsoDate): { readonly year: TaxYear; readonly from: IsoDate } | undefined => {
  const fy = financialYearContaining(date);
  const year = attempt(() => taxYear(fy));
  if (year === undefined) return undefined;
  return { year, from: startOfFinancialYear(year.standingLawFrom ?? fy) };
};

const bracketsAt = (date: IsoDate): readonly TaxBracket[] => taxAt(date)?.year.brackets?.value ?? [];

/** The Age Pension period on `date`, or nothing once past the last published rates (the forecast indexes them). */
const pensionAt = (date: IsoDate): AgePensionPeriod | undefined => {
  const period = attempt(() => agePensionPeriodAt(date));
  return period?.standingFrom === undefined ? period : undefined;
};

const fromPension = (which: 'rates' | 'meansTest', pick: (period: AgePensionPeriod) => number) => (date: IsoDate): Reading | undefined => {
  const period = pensionAt(date);
  if (period === undefined) return undefined;
  return { amount: pick(period), from: which === 'rates' ? period.ratesEffective : period.meansTestEffective };
};

/** Dated keys under `prefix`, earliest first, by their own `effective` stamp. */
const effectiveDates = (prefix: string): readonly IsoDate[] =>
  assumptionKeys()
    .filter((key) => key.startsWith(prefix))
    .map((key) => record(key).effective as IsoDate)
    .sort();

const fromDeeming = (pick: (rates: { readonly lower: number; readonly upper: number }) => number) => (date: IsoDate): Reading | undefined => {
  const rates = deemingRatesAt(date);
  if (rates === undefined) return undefined;
  const from = effectiveDates('agePension.deemingDeterminations.').filter((stamp) => stamp <= date).pop();
  return from === undefined ? undefined : { amount: pick(rates), from };
};

const fromAgedCare = (which: 'schedule' | 'mpir', pick: (period: AgedCarePeriod) => number) => (date: IsoDate): Reading | undefined => {
  const period = attempt(() => agedCarePeriodAt(date));
  if (period === undefined) {
    const [first] = effectiveDates('agedCare.residentialSchedule.');
    return first !== undefined && date < first ? {} : undefined;
  }
  return { amount: pick(period), from: which === 'schedule' ? period.scheduleEffective : period.mpirEffective };
};

const pensionFormula = (key: string) => record(key).value as (...args: never[]) => Cents;

type ListoField = 'incomeThreshold' | 'maximum';

/** The offset's two figures: stored up to 30 June 2027, then read off the Sch 7 scale and the SG rate. */
const listo = (field: ListoField) => (date: IsoDate): Reading | undefined => {
  const prefix = 'superannuation.lowIncomeSuperTaxOffset.';
  const amended = record('superannuation.lowIncomeSuperTaxOffset.incomeThresholdFrom2027');
  const since = amended.effective as IsoDate;
  const fy = financialYearContaining(date);
  if (startOfFinancialYear(fy) < since) return stamped(`${prefix}${field}`, itself)(date);
  const threshold = (amended.value as (year: FinancialYear) => Cents)(fy);
  if (field === 'incomeThreshold') return { amount: threshold, from: since };
  const maximum = record('superannuation.lowIncomeSuperTaxOffset.maximumFrom2027').value as (threshold: Cents, chargePercentage: number) => Cents;
  return { amount: maximum(threshold, record('superannuation.superGuarantee.chargePercentage').value as number), from: since };
};

// --- The rows -------------------------------------------------------------------------------------

const row = (id: string, area: RulesArea, group: string, label: string, unit: RuleUnit, read: RowSpec['read']): RowSpec =>
  ({ id, area, group, label, unit, read });

/** The tax scale's rows, one per bracket, labelled from the scale in force on `date`. */
const bracketRows = (date: IsoDate): readonly RowSpec[] => {
  const brackets = bracketsAt(date);
  const below = [undefined, ...brackets.map((bracket) => bracket.upTo)];
  return brackets.map((bracket, position) => {
    const lower = below[position];
    const read = (on: IsoDate): Reading | undefined => {
      const at = taxAt(on);
      const scale = at?.year.brackets?.value[position];
      if (at === undefined || scale === undefined) return undefined;
      const amount = lower === undefined ? scale.upTo ?? undefined : scale.rate;
      return { amount, from: at.from, ...(at.year.standingLawFrom === undefined ? {} : { standingFrom: at.year.standingLawFrom }) };
    };
    const label = lower === undefined
      ? 'No income tax on income up to'
      : bracket.upTo === null
        ? `Tax rate on income over ${formatDollars(lower ?? Number.NaN)}`
        : `Tax rate on income over ${formatDollars(lower ?? Number.NaN)} up to ${formatDollars(bracket.upTo)}`;
    return row(`tax-bracket-${position}`, 'tax', G.incomeTax, label, lower === undefined ? 'dollars' : 'rate', read);
  });
};

type Band = { readonly fromAge: number; readonly factor: number };

const drawdownRows = (): readonly RowSpec[] => {
  const key = 'superannuation.access.minimumDrawdownFactors';
  const bands = record(key).value as readonly Band[];
  return bands.map((band) => {
    const youngest = bands.every((other) => other.fromAge >= band.fromAge);
    const next = bands.find((other) => other.fromAge > band.fromAge);
    const label = youngest && next !== undefined
      ? `Minimum pension draw a year, under age ${next.fromAge}`
      : `Minimum pension draw a year, from age ${band.fromAge}`;
    const pick = (value: unknown): number =>
      (value as readonly Band[]).find((other) => other.fromAge === band.fromAge)?.factor ?? Number.NaN;
    return row(`super-drawdown-${band.fromAge}`, 'super', G.drawdown, label, 'rate', stamped(key, pick));
  });
};

const meansTest = (pick: (period: AgePensionPeriod) => number) => fromPension('meansTest', pick);

const nonHomeowner = (status: 'single' | 'coupleCombined') => (period: AgePensionPeriod): number =>
  pensionFormula('agePension.assetsTest.nonHomeownerFreeArea')(
    period.meansTest.assetsFreeAreaHomeowner[status] as never,
    period.meansTest.extraAllowableAmount as never,
  );

const fullPension = (status: 'single' | 'coupleEach') => (period: AgePensionPeriod): number =>
  pensionFormula('agePension.maximumPaymentRate')(period as never, status as never);

const specs = (date: IsoDate): readonly RowSpec[] => [
  ...bracketRows(date),
  row('tax-medicare', 'tax', G.medicare, 'Medicare levy', 'rate', stamped('tax.medicareLevy.rate', itself)),
  row('tax-medicare-single', 'tax', G.medicareThresholds, 'Medicare levy starts above, single', 'dollars',
    stamped('tax.medicareLevy.lowIncomeThresholds.singleLower', itself)),
  row('tax-medicare-family', 'tax', G.medicareThresholds, 'Medicare levy starts above, couple (family income)', 'dollars',
    stamped('tax.medicareLevy.lowIncomeThresholds.familyLower', itself)),
  row('tax-medicare-senior-single', 'tax', G.medicareThresholds, 'Medicare levy starts above, single senior or pensioner', 'dollars',
    stamped('tax.medicareLevy.lowIncomeThresholds.seniorsSingleLower', itself)),
  row('tax-medicare-senior-family', 'tax', G.medicareThresholds, 'Medicare levy starts above, senior or pensioner couple (family income)', 'dollars',
    stamped('tax.medicareLevy.lowIncomeThresholds.seniorsFamilyLower', itself)),
  row('tax-lito', 'tax', G.lito, 'Low income tax offset, most', 'dollars', stamped('tax.lito.maximumOffset', itself)),
  row('tax-sapto-single', 'tax', G.sapto, 'Seniors and pensioners tax offset, most, single', 'dollars',
    stamped('tax.sapto.baseRebateAmount.single', itself)),
  row('tax-sapto-couple', 'tax', G.sapto, 'Seniors and pensioners tax offset, most, each of a couple', 'dollars',
    stamped('tax.sapto.baseRebateAmount.coupleEach', itself)),
  row('tax-sapto-illness', 'tax', G.sapto, 'Seniors and pensioners tax offset, most, each of a couple living apart because of illness', 'dollars',
    stamped('tax.sapto.baseRebateAmount.illnessSeparatedEach', itself)),
  row('tax-work-expenses', 'tax', G.workExpenses, 'Instant deduction for work expenses, most', 'dollars',
    stamped('tax.s25130.maximumDeduction', itself)),
  row('tax-wato', 'tax', G.wato, 'Working Australians tax offset, most', 'dollars', stamped('tax.wato.maximumOffset', itself)),
  row('tax-cgt-minimum', 'tax', G.cgt, 'Minimum tax rate on capital gains', 'rate', stamped('tax.cgt.minimumTaxRate', itself)),
  row('tax-franking-ceiling', 'tax', G.franking, 'Franking credits a year you can claim without the holding rule, up to', 'dollars',
    stamped('franking.smallShareholder.ceiling', itself)),

  row('super-concessional', 'super', G.concessional, 'Before-tax (concessional) contributions cap, a year', 'dollars',
    stamped('superannuation.caps.concessional', itself, true)),
  row('super-non-concessional', 'super', G.nonConcessional, 'After-tax (non-concessional) contributions cap, a year', 'dollars',
    stamped('superannuation.caps.nonConcessional', itself, true)),
  row('super-transfer-balance', 'super', G.transferBalance, 'Transfer balance cap (most you can move into retirement pensions)', 'dollars',
    stamped('superannuation.caps.generalTransferBalance', itself, true)),
  row('super-guarantee', 'super', G.guarantee, 'Super guarantee, share of pay', 'percent',
    stamped('superannuation.superGuarantee.chargePercentage', itself)),
  row('super-contributions-tax', 'super', G.fundTax, 'Tax on before-tax contributions', 'rate',
    stamped('superannuation.fundTax.contributionsTax', itself)),
  row('super-earnings-tax', 'super', G.fundTax, 'Tax on fund earnings before retirement', 'rate',
    stamped('superannuation.fundTax.earningsTaxAccumulation', itself)),
  row('super-earnings-tax-retirement', 'super', G.fundTax, 'Tax on fund earnings in a retirement pension', 'rate',
    stamped('superannuation.fundTax.earningsTaxRetirement', itself)),
  row('super-high-income', 'super', G.highIncome, 'Extra contributions tax for high incomes starts above', 'dollars',
    stamped('superannuation.division293.threshold', itself)),
  row('super-large-balance', 'super', G.largeBalance, 'Extra earnings tax for large balances starts above', 'dollars',
    stamped('superannuation.division296.largeBalanceThreshold', itself, true)),
  row('super-preservation-age', 'super', G.access, 'Preservation age (earliest you can retire and take your super)', 'age',
    stamped('superannuation.access.preservationAge', itself)),
  row('super-release-age', 'super', G.access, 'Age your super is yours to take, working or not', 'age',
    stamped('superannuation.access.automaticReleaseAge', itself)),
  row('super-ttr-maximum', 'super', G.access, 'Transition to retirement pension, most a year', 'rate',
    stamped('superannuation.access.ttrMaximumDrawdown', itself)),
  ...drawdownRows(),
  row('super-carry-forward', 'super', G.carryForward, 'Catch-up contributions allowed while your total super is under', 'dollars',
    stamped('superannuation.carryForward.totalSuperBalanceTest', itself)),
  row('super-listo-threshold', 'super', G.listo, 'Low income super tax offset, income up to', 'dollars', listo('incomeThreshold')),
  row('super-listo-maximum', 'super', G.listo, 'Low income super tax offset, most', 'dollars', listo('maximum')),
  row('super-downsizer-age', 'super', G.downsizer, 'Downsizer contribution, from age', 'age', stamped('superannuation.downsizer.minimumAge', itself)),
  row('super-downsizer-cap', 'super', G.downsizer, 'Downsizer contribution, most each', 'dollars', stamped('superannuation.downsizer.cap', itself)),

  row('pension-age', 'agePension', G.pensionAge, 'Age Pension age', 'age', stamped('agePension.qualification.qualifyingAge', itself)),
  row('pension-full-single', 'agePension', G.fullPension, 'Full Age Pension with supplements, single', 'aFortnight',
    fromPension('rates', fullPension('single'))),
  row('pension-full-couple', 'agePension', G.fullPension, 'Full Age Pension with supplements, each of a couple', 'aFortnight',
    fromPension('rates', fullPension('coupleEach'))),
  row('pension-income-single', 'agePension', G.meansTest, 'Income before the pension reduces, single', 'aFortnight',
    meansTest((period) => period.meansTest.incomeFreeArea.single)),
  row('pension-income-couple', 'agePension', G.meansTest, 'Income before the pension reduces, couple combined', 'aFortnight',
    meansTest((period) => period.meansTest.incomeFreeArea.coupleCombined)),
  row('pension-assets-single-homeowner', 'agePension', G.meansTest, 'Assets before the pension reduces, single homeowner', 'dollars',
    meansTest((period) => period.meansTest.assetsFreeAreaHomeowner.single)),
  row('pension-assets-couple-homeowner', 'agePension', G.meansTest, 'Assets before the pension reduces, homeowner couple', 'dollars',
    meansTest((period) => period.meansTest.assetsFreeAreaHomeowner.coupleCombined)),
  row('pension-assets-single-renter', 'agePension', G.meansTest, 'Assets before the pension reduces, single, not a homeowner', 'dollars',
    meansTest(nonHomeowner('single'))),
  row('pension-assets-couple-renter', 'agePension', G.meansTest, 'Assets before the pension reduces, couple, not homeowners', 'dollars',
    meansTest(nonHomeowner('coupleCombined'))),
  row('pension-deeming-threshold-single', 'agePension', G.meansTest, 'Deeming threshold, single', 'dollars',
    meansTest((period) => period.meansTest.deemingThreshold.single)),
  row('pension-deeming-threshold-couple', 'agePension', G.meansTest, 'Deeming threshold, couple combined', 'dollars',
    meansTest((period) => period.meansTest.deemingThreshold.coupleCombined)),
  row('pension-income-taper', 'agePension', G.tapers, 'Pension reduction for each dollar of income over the limit', 'rate',
    stamped('agePension.incomeTest.taper', itself)),
  row('pension-assets-taper', 'agePension', G.tapers, 'Pension reduction a fortnight for each thousand dollars of assets over the limit', 'plainDollars',
    stamped('agePension.assetsTest.taper', itself)),
  row('pension-deeming-lower', 'agePension', G.deeming, 'Deeming rate up to the threshold', 'rate', fromDeeming((rates) => rates.lower)),
  row('pension-deeming-upper', 'agePension', G.deeming, 'Deeming rate above the threshold', 'rate', fromDeeming((rates) => rates.upper)),
  row('pension-work-bonus', 'agePension', G.workBonus, 'Work Bonus: pay not counted', 'aFortnight',
    stamped('agePension.workBonus.fortnightlyAccrual', itself)),

  row('heas-interest', 'heas', G.heasInterest, 'Interest rate on the loan', 'rate', stamped('heas.interest.rate', itself)),
  row('heas-fortnightly-limit', 'heas', G.heasLimit, 'Most a fortnight, as a share of the full Age Pension', 'rate',
    stamped('heas.drawModes.fortnightlyCapMultiple', itself)),

  row('care-basic-daily-fee', 'agedCare', G.careFees, 'Basic daily fee', 'aDay', fromAgedCare('schedule', (period) => period.rates.basicDailyFee)),
  row('care-hotelling', 'agedCare', G.careFees, 'Hotelling contribution, most', 'aDay',
    fromAgedCare('schedule', (period) => period.rates.hotellingContributionMax)),
  row('care-non-clinical', 'agedCare', G.careFees, 'Non-clinical care contribution, most', 'aDay',
    fromAgedCare('schedule', (period) => period.rates.nonClinicalCareContribution.dailyMax)),
  row('care-non-clinical-cap', 'agedCare', G.careFees, 'Non-clinical care contribution, lifetime cap', 'dollars',
    fromAgedCare('schedule', (period) => period.rates.nonClinicalCareContribution.lifetimeCap)),
  row('care-room-price', 'agedCare', G.careFees, 'Highest room price a home can set without approval', 'dollars',
    fromAgedCare('schedule', (period) => period.rates.maxRadWithoutPricingApproval)),
  row('care-mpir', 'agedCare', G.mpir, 'Interest on an unpaid room price (MPIR)', 'rate', fromAgedCare('mpir', (period) => period.mpir)),
];

/** Every date any record is stamped from, in order: where a figure in force can next change. */
const stampDates = (): readonly IsoDate[] => {
  const dates = new Set<IsoDate>();
  for (const key of assumptionKeys()) {
    const held = record(key);
    if (held.effective !== undefined) dates.add(held.effective as IsoDate);
    if (held.fy !== undefined) dates.add(startOfFinancialYear(held.fy as FinancialYear));
  }
  return [...dates].sort();
};

const nextChange = (spec: RowSpec, date: IsoDate, now: Reading): RuleRow['changes'] => {
  for (const later of stampDates().filter((stamp) => stamp > date)) {
    const reading = spec.read(later);
    if (reading === undefined) return undefined;
    if (reading.amount !== undefined && reading.amount !== now.amount) return { date: later, amount: reading.amount };
  }
  return undefined;
};

/** The figures in force on `date`, by area, in the order the panel shows them. */
export const rulesInForce = (date: IsoDate): readonly RulesSection[] => {
  const rows: RuleRow[] = [];
  for (const spec of specs(date)) {
    const reading = spec.read(date);
    if (reading === undefined) continue;
    const changes = nextChange(spec, date, reading);
    if (reading.amount === undefined && changes === undefined) continue;
    const { read: _read, ...shape } = spec;
    rows.push({ ...shape, ...reading, ...(changes === undefined ? {} : { changes }) });
  }
  return RULES_AREAS.map(({ area, title }) => ({ area, title, rows: rows.filter((each) => each.area === area) }));
};

// --- The words ------------------------------------------------------------------------------------

const DAY = new Intl.DateTimeFormat('en-AU', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });

/** `2027-07-01` → `1 July 2027`. */
export const dayText = (date: IsoDate): string => DAY.format(new Date(date));

const amountText = (unit: RuleUnit, amount: number): string => {
  switch (unit) {
    case 'dollars': return formatDollars(amount);
    case 'aFortnight': return `${formatDollars(amount)} a fortnight`;
    case 'aDay': return `${formatDollars(amount)} a day`;
    case 'rate': return `${fractionAsPercent(amount)}%`;
    case 'percent': return `${amount}%`;
    case 'plainDollars': return `$${amount}`;
    case 'age': return `${amount}`;
  }
};

/** One row as the panel says it: the figure, since when, and when it changes where that is law. */
export const ruleRowText = (rule: RuleRow): string => {
  const parts = [`${rule.label}: ${rule.amount === undefined ? 'none yet' : amountText(rule.unit, rule.amount)}`];
  if (rule.from !== undefined) parts.push(`from ${dayText(rule.from)}`);
  if (rule.standingFrom !== undefined) parts.push(`the ${rule.standingFrom} scale, which the law keeps for later years`);
  if (rule.fallback !== undefined) {
    parts.push(`the ${rule.fallback.figureYear} figure; the ${rule.fallback.missingYear} one is not published yet`);
  }
  if (rule.changes !== undefined) parts.push(`changes ${dayText(rule.changes.date)} to ${amountText(rule.unit, rule.changes.amount)}`);
  return parts.join(' · ');
};

/** The line at the top of the panel: the date the figures are for, and when the rules were last checked. */
export const rulesHeadline = (asAtDate: IsoDate, lastRefresh: IsoDate): string =>
  `In force on ${dayText(asAtDate)}, your as-at date. Rules last checked against the law ${dayText(lastRefresh)}.`;
