// Phase 14, SLICE 2 (P14-4/P14-9) — the Aged Care Means Assessment, its fees, and the RAD/DAP
// accommodation arithmetic. Register §12.6. PURE functions only: no entry, no `parsePlan`, no
// `project()` wiring — see `docs/research/p14-aged-care-gate-2026-09-24.md` for the design and
// `src/data/assumptions/agedCare.ts` for every rate this file reads, with its source and date.
//
// **The RAD asymmetry is the one fact this module exists to make structurally impossible to get
// backwards** (the gate's own words). A paid RAD is Centrelink-exempt but assessable in full for
// aged care — health.gov.au, quote: "A refundable accommodation deposit (RAD) or refundable
// accommodation contribution (RAC) counts as an assessable asset in the aged care means assessment"
// (https://www.health.gov.au/our-work/residential-aged-care/charging/means-assessment, retrieved
// 2026-09-24). So `AgedCareHouseholdInput` never accepts one combined "assessable assets" figure —
// it takes the RAD paid as its OWN field and this module is the only place that adds it back in.
// The caller (a future slice's `project()` wiring) is expected to compute
// `combinedAssessableAssetsExcludingHomeAndRad` from the SAME household facts `household.ts`'s
// `splitAssets` already excludes a RAD from — never by reusing `splitAssets`'s own
// `assessableAssets` scalar, which is the wrong number for this test.
//
// **Couples are split 50/50, per health.gov.au** ("Half your combined income and assets is
// included in the assessment, regardless of who earns the income or whose name the asset is held
// in" — myagedcare.gov.au/means-assessments-residential-aged-care, retrieved 2026-09-24). Unlike
// `agePensionEntitlement` (one combined test, halved once at the very end), aged care runs the
// WHOLE means test — income test, assets test, fees — separately per Person, on that Person's own
// halved share, because fees are charged per resident, not per household.
//
// **The former home**: exempt at 100% while a protected person lives there; otherwise capped at
// `homeExemptionCap` PER PERSON, applied to that Person's own (halved, for a couple) share of the
// home's net value — myagedcare.gov.au, quote: "If you are part of a couple, each partner is
// considered to own half of the home... The cap is applied to each half of the home." A protected
// person is "your partner or dependent child... a carer... living in the home with you for at least
// 2 years... a close relative... living in the home with you for at least 5 years" (same page) —
// this module takes that as one boolean (`homeIsProtected`), because working out WHICH of those
// three categories applies is a household fact this module is never handed.
import { addCents, mulCents, subCents, toCents } from './money.js'; // `.js` is correct in a `.ts` file — see tsconfig.json
import type { Cents } from './money.js';
import { AGED_CARE } from '../data/assumptions/agedCare.js';
import type { AgedCareMeansThresholds, AgedCareResidentialRateSet } from '../data/assumptions/agedCare.js';

const INCOME_BAND_RATES = AGED_CARE.meansTestTaper.value.incomeBandRates;
const ASSET_BAND_RATES = AGED_CARE.meansTestTaper.value.assetBandRates;
const DAILY_DIVISOR = AGED_CARE.meansTestTaper.value.dailyDivisor;

const minCents = (a: Cents, b: Cents): Cents => (a < b ? a : b);
const halveCents = (cents: Cents): Cents => mulCents(cents, 0.5);

/**
 * Dividing the annual band total by 364 FLOORS — it does not round half-up like `mulCents`
 * elsewhere in this codebase. Evidenced, not assumed: Raj's worked example (§12.6, the
 * "Part pensioner – Raj" scenario) gives an asset tested amount of exactly $79.77 for a band total
 * of $29,038.15 — but $29,038.15 ÷ 364 = $79.7751374…, which is ABOVE the halfway point to $79.78
 * (187/364 = 0.5137…, not 0.49…), so ordinary round-half-up would publish $79.78. Only a floor
 * reproduces the published figure. `test/core-aged-care.test.mjs` pins this exact case.
 */
const floorDailyAmount = (cents: Cents, divisor: number): Cents => Math.floor(cents / divisor) as Cents;

/**
 * The five-band waterfall both the income test and the assets test share (§12.6, health.gov.au's
 * "Self-funded retiree – Sakura" worked example): the rate at index `i` applies to whatever part of
 * `assessed` lies between `boundaries[i]` and `boundaries[i + 1]` (or, for the last band, above
 * `boundaries[4]`), summed and divided by `DAILY_DIVISOR` (364, quoted — NOT 365), FLOORED per
 * `floorDailyAmount` above.
 */
const bandedDailyAmount = (assessed: Cents, thresholds: AgedCareMeansThresholds, rates: readonly [number, number, number, number, number]): Cents => {
  const boundaries: readonly Cents[] = [thresholds.freeArea, thresholds.first, thresholds.second, thresholds.third, thresholds.fourth];
  let total = toCents(0);
  for (let band = 0; band < rates.length; band += 1) {
    const lower = boundaries[band] as Cents;
    const upperBoundary = boundaries[band + 1];
    const bandTop = upperBoundary === undefined ? assessed : minCents(assessed, upperBoundary);
    if (bandTop > lower) {
      const excess = subCents(bandTop, lower);
      total = addCents(total, mulCents(excess, rates[band] as number));
    }
  }
  return floorDailyAmount(total, DAILY_DIVISOR);
};

export interface AgedCareHome {
  /** The WHOLE household's net home value — this module halves it for a couple, never the caller. `0` for a non-homeowner. */
  readonly netValue: Cents;
  /** True whenever a protected person (partner, dependent child, or a qualifying carer/relative) occupies the home — see the file header. */
  readonly homeIsProtected: boolean;
}

export interface AgedCareHouseholdInput {
  readonly couple: boolean;
  readonly personNames: readonly [string] | readonly [string, string];
  /** The WHOLE household's assessable income for the year — halved by this module for a couple. */
  readonly combinedAssessableIncome: Cents;
  /** Everything EXCEPT the home and a paid RAD — see the file header for why a RAD is its own field. */
  readonly combinedAssessableAssetsExcludingHomeAndRad: Cents;
  /** A RAD/RAC this household has paid, assessable in FULL for aged care (Centrelink-exempt — the asymmetry this module exists to hold apart). `0` if none paid. */
  readonly combinedRadPaid: Cents;
  readonly home: AgedCareHome;
}

export interface AgedCarePersonMeans {
  readonly name: string;
  /** This Person's own (halved, for a couple) share of the household's assessable income. */
  readonly assessableIncome: Cents;
  /** This Person's own share of the home, AFTER the protected-person exemption and the home exemption cap. */
  readonly homeAssessedValue: Cents;
  /** This Person's own share of every OTHER assessable asset, including their share of a paid RAD. */
  readonly otherAssessableAssets: Cents;
  readonly totalAssessableAssets: Cents;
  readonly incomeTestedAmountPerDay: Cents;
  readonly assetTestedAmountPerDay: Cents;
  /** The sum of the two tests — what `agedCareFees` and the accommodation means status are both taken on. */
  readonly meansTestedAmountPerDay: Cents;
}

export interface AgedCareMeansAssessmentResult {
  readonly couple: boolean;
  readonly perPerson: readonly [AgedCarePersonMeans] | readonly [AgedCarePersonMeans, AgedCarePersonMeans];
}

/**
 * The Aged Care Means Assessment (residential care, 1 November 2025 arrangements) for a Household,
 * per Person. See the file header for the RAD asymmetry, the 50/50 split, and the home treatment —
 * all three are applied here and nowhere else, which is the point.
 */
export const agedCareMeansAssessment = (input: AgedCareHouseholdInput, rates: AgedCareResidentialRateSet): AgedCareMeansAssessmentResult => {
  const { couple, personNames, combinedAssessableIncome, combinedAssessableAssetsExcludingHomeAndRad, combinedRadPaid, home } = input;
  if (couple && personNames.length !== 2) throw new RangeError('a couple needs two person names');
  if (!couple && personNames.length !== 1) throw new RangeError('a single Household needs exactly one person name');

  const perPersonIncome = couple ? halveCents(combinedAssessableIncome) : combinedAssessableIncome;
  const combinedOtherAssets = addCents(combinedAssessableAssetsExcludingHomeAndRad, combinedRadPaid);
  const perPersonOtherAssets = couple ? halveCents(combinedOtherAssets) : combinedOtherAssets;
  const perPersonHomeShare = couple ? halveCents(home.netValue) : home.netValue;
  const homeAssessedValue = home.homeIsProtected ? toCents(0) : minCents(perPersonHomeShare, rates.thresholds.homeExemptionCap);
  const totalAssessableAssets = addCents(homeAssessedValue, perPersonOtherAssets);
  const incomeThresholds = couple ? rates.incomeThresholds.couple : rates.incomeThresholds.single;

  const buildPerson = (name: string): AgedCarePersonMeans => {
    const incomeTestedAmountPerDay = bandedDailyAmount(perPersonIncome, incomeThresholds, INCOME_BAND_RATES);
    const assetTestedAmountPerDay = bandedDailyAmount(totalAssessableAssets, rates.assetThresholds, ASSET_BAND_RATES);
    return Object.freeze({
      name,
      assessableIncome: perPersonIncome,
      homeAssessedValue,
      otherAssessableAssets: perPersonOtherAssets,
      totalAssessableAssets,
      incomeTestedAmountPerDay,
      assetTestedAmountPerDay,
      meansTestedAmountPerDay: addCents(incomeTestedAmountPerDay, assetTestedAmountPerDay),
    });
  };

  const perPerson = (couple ? [buildPerson(personNames[0]), buildPerson(personNames[1] as string)] : [buildPerson(personNames[0])]) as
    | readonly [AgedCarePersonMeans]
    | readonly [AgedCarePersonMeans, AgedCarePersonMeans];

  return Object.freeze({ couple, perPerson: Object.freeze(perPerson) });
};

/** The NCCC's two caps, carried month-to-month like the Work Bonus balance (P4-10's pattern) — never re-derived from history. */
export interface AgedCareNcccCapBalance {
  readonly lifetimeCapRemaining: Cents;
  /** Days on which a non-clinical care contribution has actually been PAID, remaining before the 1,460-day cap binds. */
  readonly daysRemaining: number;
}

/** A fresh entrant's starting NCCC balances, from `rates`' own lifetime cap and `capYears`. */
export const startingNcccCapBalance = (rates: AgedCareResidentialRateSet): AgedCareNcccCapBalance =>
  Object.freeze({
    lifetimeCapRemaining: rates.nonClinicalCareContribution.lifetimeCap,
    daysRemaining: rates.nonClinicalCareContribution.capYears * 365,
  });

export interface AgedCareFeesResult {
  readonly basicDailyFee: Cents;
  readonly hotellingContribution: Cents;
  readonly nonClinicalCareContribution: Cents;
  readonly ncccCapBalanceAfter: AgedCareNcccCapBalance;
}

/**
 * The basic daily fee (flat, uncomputed here — it is simply `rates.basicDailyFee`) plus the
 * hotelling contribution and NCCC, both taken off `meansTestedAmountPerDay` in the ONE waterfall
 * order `FEE_WATERFALL_ORDER` quotes (§12.6): the accommodation supplement offsets first, then
 * hotelling fills up to its own (uncapped-for-life) maximum, then whatever is left funds the NCCC —
 * itself stopped by whichever of its lifetime $ cap or its 1,460-day cap binds first.
 */
export const agedCareFees = (
  meansTestedAmountPerDay: Cents,
  rates: AgedCareResidentialRateSet,
  ncccCapBalanceBefore: AgedCareNcccCapBalance,
): AgedCareFeesResult => {
  const remainder =
    meansTestedAmountPerDay > rates.maxAccommodationSupplement
      ? subCents(meansTestedAmountPerDay, rates.maxAccommodationSupplement)
      : toCents(0);
  const hotellingContribution = minCents(remainder, rates.hotellingContributionMax);
  const afterHotelling = subCents(remainder, hotellingContribution);
  const ncccBeforeCaps = minCents(afterHotelling, rates.nonClinicalCareContribution.dailyMax);

  const capExhausted = ncccCapBalanceBefore.daysRemaining <= 0 || ncccCapBalanceBefore.lifetimeCapRemaining <= 0;
  const nonClinicalCareContribution = capExhausted ? toCents(0) : minCents(ncccBeforeCaps, ncccCapBalanceBefore.lifetimeCapRemaining);

  const ncccCapBalanceAfter: AgedCareNcccCapBalance = Object.freeze({
    lifetimeCapRemaining: subCents(ncccCapBalanceBefore.lifetimeCapRemaining, nonClinicalCareContribution),
    daysRemaining: nonClinicalCareContribution > 0 ? ncccCapBalanceBefore.daysRemaining - 1 : ncccCapBalanceBefore.daysRemaining,
  });

  return Object.freeze({
    basicDailyFee: rates.basicDailyFee,
    hotellingContribution,
    nonClinicalCareContribution,
    ncccCapBalanceAfter,
  });
};

export interface AgedCareAccommodationPayment {
  /** The daily accommodation payment on whatever part of the agreed room price is NOT paid as a RAD. */
  readonly dap: Cents;
  readonly radOutstanding: Cents;
}

/**
 * `DAP = (agreed room price − RAD paid) × MPIR ÷ 365` (health.gov.au, quoted in
 * `src/data/assumptions/agedCare.ts`'s `DAP_FORMULA`, reproduced to the cent by
 * `test/core-aged-care.test.mjs` against Sakura's and Raj's worked examples). `mpir` is the rate
 * fixed at the entry/agreement date (`AGED_CARE.mpir`'s period lookup) — the caller's job to supply,
 * exactly as `agePensionEntitlement` takes its period rather than reading a clock.
 */
export const agedCareAccommodationPayment = (agreedRoomPrice: Cents, radPaid: Cents, mpir: number): AgedCareAccommodationPayment => {
  if (radPaid < 0) throw new RangeError(`RAD paid cannot be negative: ${radPaid}`);
  if (radPaid > agreedRoomPrice) throw new RangeError(`RAD paid (${radPaid}) exceeds the agreed room price (${agreedRoomPrice})`);
  const radOutstanding = subCents(agreedRoomPrice, radPaid);
  const dap = mulCents(radOutstanding, mpir / 365);
  return Object.freeze({ dap, radOutstanding });
};

/**
 * RAD retention: 2% per annum of the RAD paid, accrued daily, for up to 5 years — quoted verbatim
 * in `src/data/assumptions/agedCare.ts`'s `RAD_RETENTION`. Applies only to a new entrant (or an
 * opted-in resident) on 1 November 2025 arrangements; that eligibility is the caller's fact to check
 * before calling this, not this function's.
 */
export const agedCareRadRetentionDeduction = (
  radPaid: Cents,
  daysHeld: number,
  retention: { readonly annualRatePercent: number; readonly maxYears: number },
): Cents => {
  if (daysHeld < 0) throw new RangeError(`daysHeld cannot be negative: ${daysHeld}`);
  const cappedDays = Math.min(daysHeld, retention.maxYears * 365);
  return mulCents(radPaid, (retention.annualRatePercent / 100) * (cappedDays / 365));
};
