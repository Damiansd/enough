/**
 * **Death, TPD and income protection cover inside a super account, priced by age — P3-17a slice 1, P3-17b.**
 *
 * Source: Aware Super, "Insurance Handbook – Employer Sponsored and Personal", pages 17-18, fetched
 * 2026-09-24:
 * https://aware.com.au/content/dam/aware/au/en/documents/member/disclosure/pds/Insurance-Handbook-Employer-sponsored-and-Personal.pdf
 *
 * Table 1 is the age-based cover scale (dollars of cover); Table 2 is the annual premium per $1,000
 * of cover, before the insurance category factor and any loading. Both are keyed by age last
 * birthday, 15 to 69; cover ends at 70 (p.4), or at an earlier age the account states for each benefit. Neither table is indexed: they are the fund's nominal
 * schedule, so a premium scaled off them is not raised by CPI. See docs/research/p3-17a-insurance.md.
 */
import type { Cents } from './money.js';
import { toCents } from './money.js';
import type { SuperInterest } from './household.js';

/** The first age either table covers. */
export const INSURANCE_FIRST_AGE = 15;
/**
 * Death and TPD cover ends at this age (Handbook p.4) unless the account states an earlier one —
 * and it is also the latest age an account may state, because the tables stop at 69.
 */
export const INSURANCE_COVER_ENDS_AT_AGE = 70;
/** The earliest end age an account may state: cover priced at 15 alone. */
export const INSURANCE_COVER_EARLIEST_END_AGE = INSURANCE_FIRST_AGE + 1;

/** Table 1, ages 15 to 69 in order: the age-based cover scale, whole dollars. */
export const AGE_BASED_COVER_DOLLARS: readonly number[] = Object.freeze([
  27_000, 40_500, 59_700, 78_900, 87_900, 97_500, 108_300, 120_000, 132_900, 147_000,
  164_700, 177_900, 191_100, 203_100, 215_100, 224_100, 232_800, 240_900, 249_000, 255_000,
  261_000, 261_000, 261_000, 261_000, 261_000, 261_000, 249_000, 237_000, 225_000, 207_900,
  191_100, 167_200, 143_400, 124_100, 108_300, 93_600, 78_300, 63_300, 54_000, 45_000,
  36_200, 31_800, 27_400, 24_500, 19_000, 16_300, 13_800, 12_600, 12_000, 10_800,
  10_000, 10_000, 10_000, 10_000, 10_000,
]);

/** Table 2, ages 15 to 69 in order: the annual death premium per $1,000 of cover, in cents. */
export const DEATH_RATE_CENTS_PER_THOUSAND: readonly number[] = Object.freeze([
  14, 17, 21, 23, 26, 27, 26, 26, 26, 26,
  26, 26, 26, 26, 26, 26, 26, 26, 26, 26,
  27, 29, 31, 34, 36, 38, 41, 45, 48, 53,
  58, 63, 68, 75, 81, 89, 100, 112, 127, 143,
  163, 184, 207, 235, 265, 300, 338, 383, 432, 489,
  542, 591, 643, 701, 765,
]);

/** Table 2, ages 15 to 69 in order: the annual TPD premium per $1,000 of cover, in cents. */
export const TPD_RATE_CENTS_PER_THOUSAND: readonly number[] = Object.freeze([
  2, 4, 6, 8, 10, 12, 15, 16, 18, 20,
  22, 24, 26, 27, 30, 32, 35, 37, 40, 44,
  48, 56, 62, 69, 78, 87, 97, 108, 120, 132,
  145, 161, 176, 195, 213, 234, 270, 311, 359, 414,
  478, 551, 635, 732, 844, 973, 1_121, 1_293, 1_490, 1_714,
  1_714, 1_714, 1_714, 1_714, 1_714,
]);

export type InsuranceCoverKind = NonNullable<SuperInterest['statedInsuranceCoverKind']>;
export const INSURANCE_COVER_KINDS: readonly InsuranceCoverKind[] = Object.freeze(['fixed', 'age-based']);
type Benefit = 'death' | 'tpd';

/** The age this account's death or TPD cover ends: its own stated age, or 70 when none is stated. */
export const insuranceCoverEndsAtAge = (interest: SuperInterest, benefit: Benefit): number =>
  (benefit === 'death' ? interest.statedDeathCoverEndsAtAge : interest.statedTpdCoverEndsAtAge) ?? INSURANCE_COVER_ENDS_AT_AGE;

/**
 * The premium's age factor: the Table 2 rate for fixed cover, cover × rate for age-based cover.
 * Only ever used as a ratio, so the category factor, the loading and the member's multiple of the
 * scale all cancel. `undefined` from `endsAt`, the account's own end age for this benefit.
 */
const ageFactor = (kind: InsuranceCoverKind, benefit: Benefit, age: number, endsAt: number): number | undefined => {
  if (age >= endsAt) return undefined;
  const index = age - INSURANCE_FIRST_AGE;
  const rate = (benefit === 'death' ? DEATH_RATE_CENTS_PER_THOUSAND : TPD_RATE_CENTS_PER_THOUSAND)[index];
  if (rate === undefined) throw new RangeError(`no Aware premium rate for age ${age}: the table starts at ${INSURANCE_FIRST_AGE}`);
  return kind === 'fixed' ? rate : (AGE_BASED_COVER_DOLLARS[index] as number) * rate;
};

/** A stated annual premium, carried from the walk's first month's age to this month's. Nil from the account's end age. */
const scaledPremium = (
  stated: Cents | undefined,
  kind: InsuranceCoverKind,
  benefit: Benefit,
  age: number,
  ageAtStart: number,
  endsAt: number,
): number => {
  if (stated === undefined || stated === 0) return 0;
  const start = ageFactor(kind, benefit, ageAtStart, endsAt);
  if (start === undefined) {
    throw new RangeError(`a ${benefit} premium is stated at age ${ageAtStart}, and the cover ends at ${endsAt}`);
  }
  const now = ageFactor(kind, benefit, age, endsAt);
  return now === undefined ? 0 : (stated * now) / start;
};

/**
 * **Income protection (IP) cover inside a super account — P3-17b.** Same Handbook, 30 April 2026
 * edition (docs/research/p3-17b-income-protection-2026-09-28.md). Table 4 (p.20) is the annual
 * premium per $1,000 of ANNUAL IP cover at a 90-day wait, before the category factor (Table 5), the
 * waiting-period factor (Table 6) and any loading — all three constant for a policy, so they cancel
 * in the ratio. IP cover is always fixed (p.6), so the factor is the rate alone. Keyed by age last
 * birthday, 15 to 64, one column per benefit period; the columns are not proportional to each other,
 * which is why the benefit period is stated and not inferred. Cover ends at 65 (p.6, p.10). Nominal:
 * not raised by CPI.
 */
export const INCOME_PROTECTION_ENDS_AT_AGE = 65;

export type IncomeProtectionBenefitPeriod = NonNullable<SuperInterest['statedIncomeProtectionBenefitPeriod']>;
export const INCOME_PROTECTION_BENEFIT_PERIODS: readonly IncomeProtectionBenefitPeriod[] = Object.freeze(['2-years', '5-years', 'to-65']);

/** Table 4, ages 15 to 64 in order, per benefit period: the annual IP premium per $1,000 of annual cover, in cents. */
export const INCOME_PROTECTION_RATE_CENTS_PER_THOUSAND: Readonly<Record<IncomeProtectionBenefitPeriod, readonly number[]>> = Object.freeze({
  '2-years': Object.freeze([
    97, 98, 103, 104, 104, 108, 103, 100, 97, 96,
    92, 92, 96, 97, 97, 98, 102, 105, 111, 114,
    120, 128, 139, 145, 154, 165, 178, 190, 208, 225,
    244, 269, 295, 329, 366, 409, 459, 515, 579, 654,
    737, 835, 946, 1_073, 1_210, 1_365, 1_539, 1_731, 1_520, 548,
  ]),
  '5-years': Object.freeze([
    229, 231, 243, 244, 244, 256, 243, 235, 229, 228,
    219, 219, 228, 229, 229, 231, 241, 248, 262, 269,
    284, 303, 327, 342, 363, 390, 420, 448, 491, 530,
    578, 636, 696, 777, 865, 965, 1_084, 1_217, 1_368, 1_545,
    1_742, 1_971, 2_235, 2_536, 2_820, 2_692, 2_463, 2_094, 1_586, 572,
  ]),
  'to-65': Object.freeze([
    453, 453, 453, 453, 453, 453, 455, 461, 468, 475,
    482, 509, 535, 558, 580, 604, 628, 653, 684, 720,
    762, 811, 869, 936, 1_013, 1_100, 1_198, 1_306, 1_427, 1_557,
    1_699, 1_849, 2_005, 2_171, 2_340, 2_511, 2_684, 2_849, 3_009, 3_156,
    3_289, 3_390, 3_452, 3_459, 3_393, 3_239, 2_964, 2_520, 1_909, 688,
  ]),
});

/** A stated annual IP premium, carried from the walk's first month's age to this month's. Nil from 65. */
const incomeProtectionPremium = (
  stated: Cents | undefined,
  period: IncomeProtectionBenefitPeriod | undefined,
  age: number,
  ageAtStart: number,
): number => {
  if (stated === undefined || stated === 0 || period === undefined) return 0;
  const rates = INCOME_PROTECTION_RATE_CENTS_PER_THOUSAND[period];
  const rate = (at: number): number | undefined => {
    if (at >= INCOME_PROTECTION_ENDS_AT_AGE) return undefined;
    const found = rates[at - INSURANCE_FIRST_AGE];
    if (found === undefined) throw new RangeError(`no Aware income protection rate for age ${at}: the table starts at ${INSURANCE_FIRST_AGE}`);
    return found;
  };
  const start = rate(ageAtStart);
  if (start === undefined) {
    throw new RangeError(`an income protection premium is stated at age ${ageAtStart}, and the cover ends at ${INCOME_PROTECTION_ENDS_AT_AGE}`);
  }
  const now = rate(age);
  return now === undefined ? 0 : (stated * now) / start;
};

/** The share of each benefit's cover still held, 0 to 1. */
export interface CoverKept {
  readonly death: number;
  readonly tpd: number;
}
export const FULL_COVER: CoverKept = Object.freeze({ death: 1, tpd: 1 });

/**
 * One month's insurance on one interest: death + TPD + income protection premiums + the insurance
 * admin fee, each a ceiled twelfth, capped at `available` (the balance left after the admin and
 * investment fees). The admin fee is charged only while a premium — any of the three — is. An
 * `INSURANCE_COVER_CHANGE` acts on death and TPD only; income protection is never scaled by it.
 * Premiums are not CPI-raised; the admin fee is, through `raisedByCpi`. `cover` is the share of
 * each benefit's cover kept by an `INSURANCE_COVER_CHANGE` (P3-17a slice 3): the category factor
 * and loading cancel in the ratio, so the scaled premium is the scaled cover's premium.
 */
export const monthlySuperInsuranceForOneMonth = (
  available: Cents,
  interest: SuperInterest,
  age: number,
  ageAtStart: number,
  raisedByCpi: (stated: Cents) => Cents,
  cover: CoverKept = FULL_COVER,
): Cents => {
  const kind = interest.statedInsuranceCoverKind;
  const death = kind === undefined ? 0
    : scaledPremium(interest.statedDeathPremiumPerYear, kind, 'death', age, ageAtStart, insuranceCoverEndsAtAge(interest, 'death')) * cover.death;
  const tpd = kind === undefined ? 0
    : scaledPremium(interest.statedTpdPremiumPerYear, kind, 'tpd', age, ageAtStart, insuranceCoverEndsAtAge(interest, 'tpd')) * cover.tpd;
  const incomeProtection = incomeProtectionPremium(
    interest.statedIncomeProtectionPremiumPerYear,
    interest.statedIncomeProtectionBenefitPeriod,
    age,
    ageAtStart,
  );
  const admin = death > 0 || tpd > 0 || incomeProtection > 0 ? raisedByCpi(interest.statedInsuranceAdminFeePerYear ?? toCents(0)) : 0;
  const charged = Math.ceil(death / 12) + Math.ceil(tpd / 12) + Math.ceil(incomeProtection / 12) + Math.ceil(admin / 12);
  return Math.min(charged, available) as Cents;
};
