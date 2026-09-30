// plan_ai.md §5 and §13 microtask 9 — **`explainAssumption(key)` and `listAssumptions(topic)`: the
// rule figures, read out of `data/assumptions/` with the provenance every record already carries.**
//
// `data/assumptions/index.ts`'s own `explainAssumption` does the reading: value, kind, stamp, source,
// retrieval date, confidence and register section, or a Setting's reason for not being an
// assumption. This file only makes that answer safe to hand to an outside AI, and adds nothing.
//
// **A LEGISLATED DOLLAR FIGURE IS NOT TODAY'S MONEY AND NOT FUTURE DOLLARS.** It is the figure the law
// states for the time its record is stamped with, so it is labelled with that stamp and nothing else:
// `$2,100,000.00 (as legislated for 2026-27)`. `moneyGuard.ts` accepts exactly that tag.
//
// **WHICH NUMBERS ARE MONEY IS READ OFF THE TYPES.** At run time a cent figure and a rate are both
// numbers. In the source every money figure is typed `Cents`, so `MoneyLocation` walks the type of
// `ASSUMPTIONS` and names every place a `Cents` sits; `MONEY_LOCATIONS` is that list written out, and
// the compiler holds the two equal in both directions (a key segment the type does not name, such as a
// date or a financial year, is written `*`). A money figure added to the data without a place here is
// a compile error, never a bare number of cents sent as if it were dollars.
//
// **PROSE GOES OUT WITHOUT ITS FIGURES.** A source, a note or a derivation that quotes a statute's `$`
// figure has no basis and no stamp of its own, so each figure in it is replaced by `FIGURE_OMITTED`,
// as `basisLabelled.ts` does for the register's caveats. Prose that happens to carry a Person's name
// goes out as `SOURCE_OMITTED`, as `getMonth` does.
//
// **AN UNKNOWN KEY IS REFUSED BY NAME AND NEVER GUESSED.** The refusal may list the keys under the
// topic the key starts with, so the model can ask again; it never picks the nearest one.
import { ASSUMPTIONS, SETTINGS_NOT_ASSUMPTIONS, assumptionAt, assumptionKeys, explainAssumption as explained } from '../../../data/assumptions/index.js'; // `.js` is correct in a `.ts` file — see tsconfig.json
import { formatCents } from '../../../core/money.js';
import { DEFAULT_MONEY_VIEW } from '../../todaysDollars.js';
import { figuresOmitted } from './basisLabelled.js';
import { SOURCE_OMITTED } from './getMonth.js';
import { carriesIdentity, toolOutput } from './identity.js';
import { legislatedTag } from './moneyGuard.js';
import type { Cents } from '../../../core/money.js';
import type { Household } from '../../../core/household.js';
import type { PlanFile } from '../../../core/parsePlan.js';
import type { Assumption } from '../../../data/assumptions/index.js';
import type { LegislatedStamp } from './moneyGuard.js';

/** A key segment the type names only by pattern (a date, a financial year, any string or number) is `*`. */
type Segment<K extends string | number> = {} extends Record<K, 1> ? '*' : `${K}` extends `${number}-${number}-${number}` ? '*' : `${K}`;

/** Every place a `Cents` sits inside one record's value, from `P`. */
type Within<V, P extends string> = V extends Cents
  ? P
  : V extends (...args: never[]) => unknown
    ? never
    : V extends readonly (infer U)[]
      ? Within<U, `${P}[]`>
      : V extends object
        ? { [K in Extract<keyof V, string | number>]-?: Within<V[K], `${P}.${Segment<K>}`> }[Extract<keyof V, string | number>]
        : never;

/** `key#value` for a record whose value is money, `key#value.path` for money inside one. */
type Locations<T, P extends string> = T extends { readonly value: infer V; readonly registerSection: string }
  ? Within<V, `${P}#value`>
  : T extends object
    ? { [K in Extract<keyof T, string>]-?: Locations<T[K], P extends '' ? Segment<K> : `${P}.${Segment<K>}`> }[Extract<keyof T, string>]
    : never;

export type MoneyLocation = Locations<typeof ASSUMPTIONS, ''>;

/** Every `MoneyLocation`, written out. Held equal to the type below. */
export const MONEY_LOCATIONS = [
  'agePension.meansTest.*#value.incomeFreeArea.single',
  'agePension.meansTest.*#value.incomeFreeArea.coupleCombined',
  'agePension.meansTest.*#value.deemingThreshold.single',
  'agePension.meansTest.*#value.deemingThreshold.coupleCombined',
  'agePension.meansTest.*#value.deemingThreshold.memberOfCoupleNeitherOnPension',
  'agePension.meansTest.*#value.assetsFreeAreaHomeowner.single',
  'agePension.meansTest.*#value.assetsFreeAreaHomeowner.coupleCombined',
  'agePension.meansTest.*#value.extraAllowableAmount',
  'agePension.workBonus.startingBalance#value',
  'agePension.workBonus.fortnightlyAccrual#value',
  'agePension.workBonus.maximumBalance#value',
  'agePension.paymentRates.*#value.maximumBasicRate.single',
  'agePension.paymentRates.*#value.maximumBasicRate.coupleEach',
  'agePension.paymentRates.*#value.maximumBasicRate.coupleCombined',
  'agePension.paymentRates.*#value.pensionSupplementMaximum.single',
  'agePension.paymentRates.*#value.pensionSupplementMaximum.coupleEach',
  'agePension.paymentRates.*#value.pensionSupplementMaximum.coupleCombined',
  'agePension.paymentRates.*#value.pensionSupplementBasic.single',
  'agePension.paymentRates.*#value.pensionSupplementBasic.coupleEach',
  'agePension.paymentRates.*#value.pensionSupplementBasic.coupleCombined',
  'agePension.paymentRates.*#value.pensionSupplementMinimum.single',
  'agePension.paymentRates.*#value.pensionSupplementMinimum.coupleEach',
  'agePension.paymentRates.*#value.pensionSupplementMinimum.coupleCombined',
  'agePension.rateHistory#value.*',
  'agePension.transitionalMaximumRate#value.single',
  'agePension.transitionalMaximumRate#value.coupleEach',
  'agePension.transitionalMaximumRate#value.coupleCombined',
  'agePension.transitionalMaximumRate20Sep2026#value.single',
  'agePension.transitionalMaximumRate20Sep2026#value.coupleEach',
  'agePension.transitionalMaximumRate20Sep2026#value.coupleCombined',
  'agePension.energySupplement#value.single',
  'agePension.energySupplement#value.coupleEach',
  'agePension.energySupplement#value.coupleCombined',
  'agePension.rentAssistanceHomeowner#value',
  'agePension.indexation.mtaweAnchor#value',
  'agePension.indexation.publishedRoundingSteps#value.incomeFreeArea',
  'agePension.indexation.publishedRoundingSteps#value.assetsFreeArea',
  'agePension.indexation.publishedRoundingSteps#value.deemingThreshold',
  'tax.years.*.taxFreeThreshold#value',
  'tax.years.*.brackets#value[].upTo',
  'tax.sapto.baseRebateAmount.single#value',
  'tax.sapto.baseRebateAmount.coupleEach#value',
  'tax.sapto.baseRebateAmount.illnessSeparatedEach#value',
  'tax.sapto.rebateMaximumAmount#value',
  'tax.sapto.rebateReductionThreshold#value',
  'tax.sapto.transferIncomeFloor#value',
  'tax.lito.maximumOffset#value',
  'tax.lito.stageOneThreshold#value',
  'tax.lito.stageTwoThreshold#value',
  'tax.lito.stageTwoBaseAmount#value',
  'tax.lito.eligibilityCeiling#value',
  'tax.medicareLevy.lowIncomeThresholds.singleLower#value',
  'tax.medicareLevy.lowIncomeThresholds.singleUpper#value',
  'tax.medicareLevy.lowIncomeThresholds.seniorsSingleLower#value',
  'tax.medicareLevy.lowIncomeThresholds.seniorsSingleUpper#value',
  'tax.medicareLevy.lowIncomeThresholds.familyLower#value',
  'tax.medicareLevy.lowIncomeThresholds.familyUpper#value',
  'tax.medicareLevy.lowIncomeThresholds.seniorsFamilyLower#value',
  'tax.medicareLevy.lowIncomeThresholds.seniorsFamilyUpper#value',
  'tax.medicareLevy.lowIncomeThresholds.familyLowerPerDependentChild#value',
  'tax.medicareLevy.lowIncomeThresholds.familyUpperPerDependentChild#value',
  'tax.wato.maximumOffset#value',
  'tax.wato.entitlementThreshold#value',
  'tax.s25130.maximumDeduction#value',
  'tax.spouseContributionOffset.base#value',
  'tax.spouseContributionOffset.lowerThreshold#value',
  'tax.spouseContributionOffset.maximumOffset#value',
  'superannuation.division293.threshold#value',
  'superannuation.carryForward.totalSuperBalanceTest#value',
  'superannuation.superGuarantee.maximumContributionsBase#value',
  'superannuation.lowIncomeSuperTaxOffset.minimum#value',
  'superannuation.lowIncomeSuperTaxOffset.incomeThreshold#value',
  'superannuation.lowIncomeSuperTaxOffset.maximum#value',
  'superannuation.downsizer.cap#value',
  'superannuation.caps.nonConcessional#value',
  'superannuation.caps.concessional#value',
  'superannuation.caps.generalTransferBalance#value',
  'superannuation.capIndexation.transferBalance#value.baseAmount',
  'superannuation.capIndexation.transferBalance#value.roundingAmount',
  'superannuation.capIndexation.concessional#value.baseAmount',
  'superannuation.capIndexation.concessional#value.roundingAmount',
  'superannuation.capIndexation.div296LargeBalanceThreshold#value.baseAmount',
  'superannuation.capIndexation.div296LargeBalanceThreshold#value.roundingAmount',
  'superannuation.capIndexation.div296VeryLargeBalanceThreshold#value.baseAmount',
  'superannuation.capIndexation.div296VeryLargeBalanceThreshold#value.roundingAmount',
  'superannuation.division296.largeBalanceThreshold#value',
  'superannuation.division296.veryLargeBalanceThreshold#value',
  'superannuation.division296.totalSuperBalanceAfterDeath#value',
  'superannuation.access.minimumDrawdownRoundingStep#value',
  'heas.interest.publishedWorkedExample#value.drawPerFortnight',
  'heas.interest.publishedWorkedExample#value.balanceAfterFortnight1',
  'heas.interest.publishedWorkedExample#value.balanceBeforeInterestFortnight2',
  'heas.interest.publishedWorkedExample#value.publishedInterestFortnight2',
  'heas.interest.publishedWorkedExample#value.balanceAfterFortnight2',
  'heas.interest.publishedWorkedExample#value.balanceAfterFortnight3',
  'heas.interest.supersededWorkedExample#value.drawPerFortnight',
  'heas.interest.supersededWorkedExample#value.balanceAfterFortnight1',
  'heas.interest.supersededWorkedExample#value.balanceBeforeInterestFortnight2',
  'heas.interest.supersededWorkedExample#value.publishedInterestFortnight2',
  'heas.interest.supersededWorkedExample#value.balanceAfterFortnight2',
  'heas.interest.supersededWorkedExample#value.balanceAfterFortnight3',
  'heas.interest.supersededWorkedExample#value.publishedInterestFortnight3',
  'heas.ageComponent.table#value.*',
  'heas.capacity.securityRounding#value',
  'heas.capacity.nilFloor#value',
  'franking.smallShareholder.ceiling#value',
  'franking.dividendWashing.ceiling#value',
  'agedCare.residentialSchedule.*#value.basicDailyFee',
  'agedCare.residentialSchedule.*#value.hotellingContributionMax',
  'agedCare.residentialSchedule.*#value.nonClinicalCareContribution.dailyMax',
  'agedCare.residentialSchedule.*#value.nonClinicalCareContribution.lifetimeCap',
  'agedCare.residentialSchedule.*#value.thresholds.incomeFreeAreaSingle',
  'agedCare.residentialSchedule.*#value.thresholds.assetsFreeArea',
  'agedCare.residentialSchedule.*#value.thresholds.homeExemptionCap',
  'agedCare.residentialSchedule.*#value.maxRadWithoutPricingApproval',
  'agedCare.residentialSchedule.*#value.incomeThresholds.single.freeArea',
  'agedCare.residentialSchedule.*#value.incomeThresholds.single.first',
  'agedCare.residentialSchedule.*#value.incomeThresholds.single.second',
  'agedCare.residentialSchedule.*#value.incomeThresholds.single.third',
  'agedCare.residentialSchedule.*#value.incomeThresholds.single.fourth',
  'agedCare.residentialSchedule.*#value.incomeThresholds.couple.freeArea',
  'agedCare.residentialSchedule.*#value.incomeThresholds.couple.first',
  'agedCare.residentialSchedule.*#value.incomeThresholds.couple.second',
  'agedCare.residentialSchedule.*#value.incomeThresholds.couple.third',
  'agedCare.residentialSchedule.*#value.incomeThresholds.couple.fourth',
  'agedCare.residentialSchedule.*#value.assetThresholds.freeArea',
  'agedCare.residentialSchedule.*#value.assetThresholds.first',
  'agedCare.residentialSchedule.*#value.assetThresholds.second',
  'agedCare.residentialSchedule.*#value.assetThresholds.third',
  'agedCare.residentialSchedule.*#value.assetThresholds.fourth',
  'agedCare.residentialSchedule.*#value.maxAccommodationSupplement',
  'agedCare.maxAccommodationSupplementFrom2027#value',
  'agedCare.grandfatheredCaps.*#value.lifetimeCap',
  'agedCare.grandfatheredCaps.*#value.annualCap',
  'agedCare.supportAtHome.classificationBudgets#value.1',
  'agedCare.supportAtHome.classificationBudgets#value.2',
  'agedCare.supportAtHome.classificationBudgets#value.3',
  'agedCare.supportAtHome.classificationBudgets#value.4',
  'agedCare.supportAtHome.classificationBudgets#value.5',
  'agedCare.supportAtHome.classificationBudgets#value.6',
  'agedCare.supportAtHome.classificationBudgets#value.7',
  'agedCare.supportAtHome.classificationBudgets#value.8',
] as const satisfies readonly MoneyLocation[];

// A `Cents` in the data with no place above fails to compile here.
const everyLocationListed: [Exclude<MoneyLocation, (typeof MONEY_LOCATIONS)[number]>] extends [never] ? true : never = true;
void everyLocationListed;

/** `#` is a separator too, so a `*` before `#value` is a whole segment. */
const segmentsOf = (location: string): readonly string[] => location.split(/[.#]/);
const LOCATION_SEGMENTS = MONEY_LOCATIONS.map(segmentsOf);

/** Whether a figure at `path` (`key#value.…`, real keys) is at one of `MONEY_LOCATIONS`. */
const isMoneyAt = (path: string): boolean => {
  const segments = segmentsOf(path);
  return LOCATION_SEGMENTS.some((pattern) => pattern.length === segments.length && pattern.every((part, index) => part === '*' || part === segments[index]));
};

export const FORMULA_VALUE = 'a formula, not a figure: see derivation';

/** One legislated figure, labelled with its record's own stamp. */
export const legislatedFigure = (cents: Cents, stamp: LegislatedStamp): string => `${formatCents(cents)} (${legislatedTag(stamp)})`;

/** Prose from the register: its figures omitted, and the whole of it omitted if it carries a name. */
const prose = (household: Household, text: string): string => {
  const omitted = figuresOmitted(text);
  return carriesIdentity(household, omitted) ? SOURCE_OMITTED : omitted;
};

const valueAt = (household: Household, value: unknown, path: string, stamp: LegislatedStamp): unknown => {
  if (typeof value === 'function') return FORMULA_VALUE;
  if (typeof value === 'number') return isMoneyAt(path) ? legislatedFigure(value as Cents, stamp) : value;
  if (typeof value === 'string') return prose(household, value);
  if (Array.isArray(value)) return value.map((each) => valueAt(household, each, `${path}[]`, stamp));
  if (typeof value === 'object' && value !== null) {
    return Object.fromEntries(Object.entries(value).map(([key, child]) => [key, valueAt(household, child, `${path}.${key}`, stamp)]));
  }
  return value;
};

/** Every topic: the first segment of any assumption key or Setting key. */
export const assumptionTopics = (): readonly string[] =>
  [...new Set([...assumptionKeys(), ...Object.keys(SETTINGS_NOT_ASSUMPTIONS)].map((key) => key.split('.')[0]!))].sort();

const underTopic = (keys: readonly string[], topic: string): readonly string[] => keys.filter((key) => key.split('.')[0] === topic).sort();

const topicsRefusal = () => ({ refused: 'UNKNOWN_TOPIC', reason: 'no assumption is filed under that topic', topics: assumptionTopics() });

/** One record, or a Setting's reason for not being one, made safe to send — or a named refusal. */
export const assumptionOrRefusal = (plan: PlanFile, key: string) => {
  const { household } = plan;
  if (typeof key !== 'string' || (assumptionAt(key) === undefined && !Object.hasOwn(SETTINGS_NOT_ASSUMPTIONS, key))) {
    // The key is not echoed: it is the model's text, and may carry anything.
    const topic = typeof key === 'string' ? key.split('.')[0]! : '';
    const refusal = { refused: 'UNKNOWN_ASSUMPTION', reason: 'no assumption or Setting has that key, and none is guessed in its place' };
    return assumptionTopics().includes(topic)
      ? { ...refusal, keysUnderThisTopic: underTopic(assumptionKeys(), topic), settingsUnderThisTopic: underTopic(Object.keys(SETTINGS_NOT_ASSUMPTIONS), topic) }
      : { ...refusal, topics: assumptionTopics() };
  }
  const explanation = explained(key);
  if (explanation.kind === 'setting') {
    return { key, kind: explanation.kind, reason: prose(household, explanation.reason), registerSection: explanation.registerSection };
  }
  const record = assumptionAt(key) as Assumption<unknown, string>;
  return {
    key,
    kind: explanation.kind,
    value: valueAt(household, record.value, `${key}#value`, record),
    stamp: explanation.stamp,
    source: prose(household, explanation.source),
    retrieved: explanation.retrieved,
    confidence: explanation.confidence,
    registerSection: explanation.registerSection,
    ...(explanation.note === undefined ? {} : { note: prose(household, explanation.note) }),
    ...(explanation.derivation === undefined ? {} : { derivation: prose(household, explanation.derivation) }),
    isFormula: explanation.isFormula,
  };
};

/** The keys under one topic, or a named refusal listing the topics. */
export const assumptionKeysOrRefusal = (topic: string) =>
  typeof topic === 'string' && assumptionTopics().includes(topic)
    ? { topic, keys: underTopic(assumptionKeys(), topic), settings: underTopic(Object.keys(SETTINGS_NOT_ASSUMPTIONS), topic) }
    : topicsRefusal();

/** `explainAssumption` as the connector returns it: serialised, through the identity and money guards. */
export const explainAssumption = (plan: PlanFile, key: string): string => toolOutput(plan.household, assumptionOrRefusal(plan, key), DEFAULT_MONEY_VIEW);

/** `listAssumptions` as the connector returns it: serialised, through the identity and money guards. */
export const listAssumptions = (plan: PlanFile, topic: string): string => toolOutput(plan.household, assumptionKeysOrRefusal(topic), DEFAULT_MONEY_VIEW);
