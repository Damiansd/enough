// Aged Care — register §12. SLICE 1 (P14-1/P14-3, 2026-09-24): the sourced rates and their
// indexation ONLY. No means test module, no entries, no projection change — see
// `docs/research/p14-aged-care-gate-2026-09-24.md` for the design and
// `docs/research/p14-aged-care-sources-2026-09-24.md` for every figure's source and effective
// date. P14-4 (`agedCareMeansAssessment`) is a later slice; nothing here computes a fee.
//
// Two indexation calendars, neither the Age Pension's own two:
//
//   * the residential SCHEDULE — basic daily fee, hotelling, NCCC (rate + both its caps), the
//     residential means-assessment free/asset areas, the home exemption cap and the max RAD
//     without pricing approval — all published together in the one health.gov.au PDF, on
//     20 Mar / 1 Jul / 20 Sep.
//   * MPIR, a quarterly administrative determination (1 Jan / 1 Apr / 1 Jul / 1 Oct) with no
//     announced formula linking it to CPI or wages — the same posture `agePension.ts` takes for
//     deeming rates: only determined values are recorded, and nothing here extrapolates past the
//     last one.
//
// Periods are assembled by `mergeCalendarBoundaries` (`periods.ts`), the SAME machinery
// `agePensionPeriods` uses — see that file's header for why this is one shared merge and not a
// third hand-rolled one (the P14 gate's own condition for GO).
import { toCents } from '../../core/money.js'; // `.js` is correct in a `.ts` file — see tsconfig.json
import type { Cents } from '../../core/money.js';
import { priceLevelFactor } from '../../core/priceLevel.js';
import { deepFreeze } from './types.js';
import type { Assumption, Config, Constant, Formula, IsoDate, Rate } from './types.js';
import { dayBefore, latestOnOrBefore, mergeCalendarBoundaries } from './periods.js';

const HEALTH_GOV_SCHEDULE_20_SEP_2026 = {
  source:
    'Schedule of fees and charges for residential care, 20 September 2026 · health.gov.au — https://www.health.gov.au/sites/default/files/2026-09/schedule_of_fees_and_charges_for_residential_care_20_september_2026.pdf, "Rates for 1 November 2025 fee and accommodation arrangements"',
  retrieved: '2026-09-24',
  confidence: 'primary-verified',
  registerSection: '§12.1',
} as const;

const HEALTH_GOV_GRANDFATHERED = {
  source:
    'Schedule of fees and charges for residential care, 20 September 2026 · health.gov.au, "Rates for post 1 July 2014 fee and accommodation arrangements"',
  retrieved: '2026-09-24',
  confidence: 'primary-verified',
  registerSection: '§12.4',
} as const;

const HEALTH_GOV_MPIR = {
  source:
    'Schedule of fees and charges for residential care, 20 September 2026 · health.gov.au, interest-rate table (Maximum Permissible Interest Rate)',
  retrieved: '2026-09-24',
  confidence: 'primary-verified',
  registerSection: '§12.2',
} as const;

const HEALTH_GOV_RAD_RETENTION = {
  source: 'RAD and RAC retention · health.gov.au — https://www.health.gov.au/our-work/residential-aged-care/charging/rad-and-rac-retention',
  retrieved: '2026-09-24',
  confidence: 'primary-verified',
  registerSection: '§12.4',
} as const;

const HEALTH_GOV_SUPPORT_AT_HOME = {
  source:
    'Funding classifications for Support at Home · health.gov.au — https://www.health.gov.au/our-work/support-at-home/funding-for-support-at-home/funding-classifications-for-support-at-home ("Current as of 1 July 2026")',
  retrieved: '2026-09-24',
  confidence: 'primary-verified',
  registerSection: '§12.5',
} as const;

const SUPPORT_AT_HOME_RECLASSIFICATION = {
  source:
    'health.gov.au "Personal care to be fully funded under Support at Home from October" (published 23 Apr 2026) · myagedcare.gov.au "Support at Home personal care contribution changes" (last updated 16 Jun 2026)',
  retrieved: '2026-09-24',
  confidence: 'primary-verified',
  registerSection: '§12.5',
} as const;

/**
 * SLICE 2 (P14-4/P14-9, 2026-09-24) — the means-test FORMULA itself: the five-band income and
 * assets tapers, the 364-day divisor, and the hotelling/NCCC waterfall order. `src/core/agedCare.ts`
 * is the only consumer. Two health.gov.au pages, both fetched live 2026-09-24:
 *
 *   * the five DOLLAR thresholds per band (below, in `AGED_CARE_SCHEDULE`'s new
 *     `incomeThresholds`/`assetThresholds`/`maxAccommodationSupplement` fields) — the same 20 Sep
 *     2026 schedule PDF slice 1 already cites (`HEALTH_GOV_SCHEDULE_20_SEP_2026`), which lists all
 *     five thresholds per test but never the % rate applied within each band;
 *   * the % RATE for each band, the 364-day divisor, and the hotelling/NCCC waterfall order — from
 *     a SECOND page the schedule PDF does not carry at all, below.
 */
const HEALTH_GOV_FEE_SCENARIOS_2025 = {
  source:
    'Residential aged care fee scenarios — 1 November 2025 fee arrangements · health.gov.au — https://www.health.gov.au/our-work/residential-aged-care/charging/fees/scenarios2025 ("Self-funded retiree – Sakura" and "Part pensioner – Julie"/"Part pensioner – Raj" worked examples)',
  retrieved: '2026-09-24',
  confidence: 'primary-verified',
  registerSection: '§12.6',
} as const;

/**
 * **The five income-test bands, quoted verbatim from Sakura's worked example (20 Mar 2026 rates,
 * reproduced to the cent by `test/core-aged-care.test.mjs`):** "50% of her income in excess of
 * [free area] up to [first] · 0% ... up to [second] · 50% ... up to [third] · 0% ... up to [fourth]
 * · 50% of her income in excess of [fourth]" — summed, then "expressing it as a daily amount
 * (dividing by 364)". The assets bands are the SAME structure at different rates: "17.5% ... up to
 * [first, the home exemption cap] · 0% ... up to [second] · 7.8% ... up to [third] · 0% ... up to
 * [fourth] · 7.8% of her assets in excess of [fourth]", divided by 364.
 *
 * **The rates themselves are NOT dated on this page or the schedule PDF** — only the five dollar
 * thresholds move with the 20 Mar/1 Jul/20 Sep indexation (confirmed: the same 50/0/50/0/50 and
 * 17.5/0/7.8/0/7.8 sequence appears against BOTH the 20 Mar 2026 figures here and is structurally
 * identical to the pre-1-Nov-2025 means-tested-care-fee formula's own tiered-taper shape). Treated
 * here as `everyYear: true`, the same posture the Age Pension's own tapers ($3/$1,000, 50c/$1) take
 * in `agePension.ts` — a rate, not a schedule figure.
 */
const MEANS_TEST_TAPER = {
  ...HEALTH_GOV_FEE_SCENARIOS_2025,
  kind: 'constant',
  everyYear: true,
  value: Object.freeze({
    /** Applied to the excess WITHIN each band, in order: free→1st, 1st→2nd, 2nd→3rd, 3rd→4th, above 4th. */
    incomeBandRates: Object.freeze([0.5, 0, 0.5, 0, 0.5]) as readonly [number, number, number, number, number],
    assetBandRates: Object.freeze([0.175, 0, 0.078, 0, 0.078]) as readonly [number, number, number, number, number],
    dailyDivisor: 364,
  }),
  note:
    'The couple column is labelled "couple, illness separated (single rate)" on BOTH the schedule PDF and this page, yet the Julie/Raj worked examples apply it to an ordinary co-resident couple (Raj not separated from Julie for illness at all) — so for aged care, unlike the Age Pension, every couple with a Person in care uses this column per Person, on their OWN (already-halved) share of combined means. There is no separate "couple living together" income column in any source found.',
} satisfies Constant<{
  readonly incomeBandRates: readonly [number, number, number, number, number];
  readonly assetBandRates: readonly [number, number, number, number, number];
  readonly dailyDivisor: number;
}>;

/**
 * **The hotelling/NCCC waterfall, quoted from Sakura's example**: hotelling contribution is "the
 * lower of: means tested amount less the maximum accommodation supplement; or [the hotelling max]";
 * NCCC is "the lesser of: means tested amount less (maximum accommodation supplement +
 * [hotelling contribution, or its max — Raj's example shows a resident whose hotelling contribution
 * is BELOW the max pays NO NCCC at all, i.e. NCCC only starts once hotelling is maxed]); or
 * [the NCCC max]". `src/core/agedCare.ts`'s `agedCareFees` is the one place this waterfall is coded.
 */
const FEE_WATERFALL_ORDER = {
  ...HEALTH_GOV_FEE_SCENARIOS_2025,
  kind: 'constant',
  everyYear: true,
  value:
    'remainder = max(0, meansTestedAmountPerDay - maxAccommodationSupplement); hotelling = min(remainder, hotellingContributionMax); nonClinicalCareContribution = min(remainder - hotelling, nonClinicalCareContribution.dailyMax), THEN further capped by the lifetime $ and 1,460-day caps',
} satisfies Constant<string>;

/** The residential schedule PDF's own three-date publication cycle (P14-3). */
export type AgedCareScheduleDate = `${number}-03-20` | `${number}-07-01` | `${number}-09-20`;

/** MPIR is redetermined quarterly on the calendar quarter, not on the schedule's own three dates. */
export type AgedCareMpirDate = `${number}-01-01` | `${number}-04-01` | `${number}-07-01` | `${number}-10-01`;

/**
 * Everything the 20 Mar / 1 Jul / 20 Sep residential schedule publishes together. `capYears` is a
 * legislated year-count (the NCCC's 1,460-day / 4-year cap), never indexed — `indexAgedCareSchedule`
 * passes it through unchanged. Stored as YEARS, not days: a bare four-digit day-count reads as an
 * unlabelled dollar figure to `test/app-chat-explain-assumption.test.mjs`'s own money-smuggling
 * check, so the day figure lives in prose (this record's `note`) and the number stored is the small
 * one.
 */
export interface AgedCareResidentialRateSet {
  /** Per day. */
  readonly basicDailyFee: Cents;
  /** Per day, means-tested, payable for life — uncapped, unlike the NCCC (P14 gate). */
  readonly hotellingContributionMax: Cents;
  readonly nonClinicalCareContribution: {
    readonly dailyMax: Cents;
    readonly lifetimeCap: Cents;
    /** 1,460 days = 4 years. Whichever of the lifetime cap or this binds first ends the fee. */
    readonly capYears: number;
  };
  /** Residential means-assessment thresholds. Single only — no couple figure is sourced (T-style omission, not an invention). */
  readonly thresholds: {
    readonly incomeFreeAreaSingle: Cents;
    readonly assetsFreeArea: Cents;
    /** "First asset threshold" — the cap the home's assessed value is capped AT, not exempted below. */
    readonly homeExemptionCap: Cents;
  };
  readonly maxRadWithoutPricingApproval: Cents;
  /**
   * SLICE 2 — the five-band income and assets means-test thresholds (§12.6). `single`/`couple`
   * differ only for INCOME (the couple column is lower per Person, not higher — see
   * `MEANS_TEST_TAPER`'s note); the assets thresholds are the SAME regardless of couple status,
   * because both tests already run on each Person's own (halved, for a couple) share.
   */
  readonly incomeThresholds: {
    readonly single: AgedCareMeansThresholds;
    readonly couple: AgedCareMeansThresholds;
  };
  readonly assetThresholds: AgedCareMeansThresholds;
  /** Offsets the means tested amount before the hotelling/NCCC waterfall runs (§12.6). */
  readonly maxAccommodationSupplement: Cents;
}

/** The five band-boundary dollar figures a means test tapers against — see `MEANS_TEST_TAPER` for the rates applied within each band. */
export interface AgedCareMeansThresholds {
  readonly freeArea: Cents;
  readonly first: Cents;
  readonly second: Cents;
  readonly third: Cents;
  readonly fourth: Cents;
}

const AGED_CARE_SCHEDULE: Readonly<
  Record<AgedCareScheduleDate, Assumption<AgedCareResidentialRateSet, AgedCareScheduleDate>>
> = {
  '2026-09-20': {
    ...HEALTH_GOV_SCHEDULE_20_SEP_2026,
    kind: 'config',
    effective: '2026-09-20',
    value: {
      basicDailyFee: toCents(68.93),
      hotellingContributionMax: toCents(22.15),
      nonClinicalCareContribution: {
        dailyMax: toCents(109.45),
        lifetimeCap: toCents(140_652.8),
        capYears: 4,
      },
      thresholds: {
        incomeFreeAreaSingle: toCents(36_454.6),
        assetsFreeArea: toCents(66_500.0),
        homeExemptionCap: toCents(219_858.4),
      },
      maxRadWithoutPricingApproval: toCents(789_686),
      incomeThresholds: {
        single: {
          freeArea: toCents(36_454.6),
          first: toCents(90_130.04),
          second: toCents(105_048.0),
          third: toCents(121_173.2),
          fourth: toCents(145_818.4),
        },
        couple: {
          freeArea: toCents(35_726.6),
          first: toCents(89_402.04),
          second: toCents(105_048.0),
          third: toCents(121_173.2),
          fourth: toCents(142_906.4),
        },
      },
      assetThresholds: {
        freeArea: toCents(66_500.0),
        first: toCents(219_858.4),
        second: toCents(266_000.0),
        third: toCents(369_366.66),
        fourth: toCents(552_858.4),
      },
      maxAccommodationSupplement: toCents(73.73),
    },
    note:
      'This is the only dated set this file carries — Phase 14 is unbuilt before today, so there is no earlier period to carry as a "(prior)" row the way agePension.ts does. Superseded three of concept.md\'s figures: income free area was $35,521.20/$35,313.20 (two candidates), home exemption cap $214,884/$210,555, NCCC $107.32/$105.30 — all three were the 1 Jul 2026 values, one indexation round stale (P14-1).',
  },
};

/**
 * **Grandfathered — a SEPARATE labelled set, never merged into `AGED_CARE_SCHEDULE`.** The one
 * schedule PDF carries three tiers side by side ("1 November 2025", "post 1 July 2014", "pre 1
 * July 2014"); this is the middle tier's two caps (the old means-tested care fee, not the NCCC).
 * The oldest tier is not carried here — no household fact in this project reaches it.
 */
export interface AgedCareGrandfatheredCaps {
  readonly lifetimeCap: Cents;
  readonly annualCap: Cents;
}

const AGED_CARE_GRANDFATHERED_CAPS: Readonly<
  Record<AgedCareScheduleDate, Assumption<AgedCareGrandfatheredCaps, AgedCareScheduleDate>>
> = {
  '2026-09-20': {
    ...HEALTH_GOV_GRANDFATHERED,
    kind: 'config',
    effective: '2026-09-20',
    value: { lifetimeCap: toCents(88_934.57), annualCap: toCents(37_055.98) },
    note:
      'Applies to a resident who entered 1 Jul 2014 – 31 Oct 2025 and did not opt into the 1 Nov 2025 arrangements. Supersedes concept.md\'s $86,185.23 / $35,910.43 pair, which were the 1 Jul 2026 (not 20 Sep 2026) values for these same two caps (P14-3).',
  },
};

const AGED_CARE_MPIR: Readonly<Record<AgedCareMpirDate, Rate<AgedCareMpirDate>>> = {
  '2026-07-01': {
    ...HEALTH_GOV_MPIR,
    kind: 'config',
    effective: '2026-07-01',
    value: 0.0843,
    note: 'In force 1 Jul – 30 Sep 2026.',
  },
  '2026-10-01': {
    ...HEALTH_GOV_MPIR,
    kind: 'config',
    effective: '2026-10-01',
    value: 0.0851,
    note: 'In force from 1 Oct 2026 (1 Oct – 31 Dec 2026 in the source PDF). The 1 Oct 2026 row of the ATO general interest charge page (11.51%) less 3 percentage points, as Aged Care Rules 2025 s 3015 sets it; confirmed 2026-09-29.',
  },
};

const RAD_RETENTION = {
  ...HEALTH_GOV_RAD_RETENTION,
  kind: 'constant',
  everyYear: true,
  value: Object.freeze({ annualRatePercent: 2, maxYears: 5 }),
  note:
    'Quote: "calculated daily at a rate of 2% per annum and it is limited to 5 years." Applies to a resident on 1 Nov 2025 arrangements who entered on/after 1 Nov 2025 (or opted in) — the source phrases this by arrangement/entry-date, not simply "new entrants". concept.md\'s "max 10%" (5 × 2%) is DERIVED, not a quoted figure (P14-3) — the page never states 10% verbatim.',
} satisfies Constant<{ readonly annualRatePercent: number; readonly maxYears: number }>;

const DAP_FORMULA = {
  ...HEALTH_GOV_SCHEDULE_20_SEP_2026,
  kind: 'constant',
  everyYear: true,
  value: 'DAP = RAD × MPIR ÷ 365, simple daily accrual — no compounding',
  note: 'The arithmetic itself; not computed anywhere in this slice (P14-8 wires it against an actual RAD).',
} satisfies Constant<string>;

const GRANDFATHERING_STRUCTURE = {
  ...HEALTH_GOV_GRANDFATHERED,
  kind: 'constant',
  everyYear: true,
  value:
    'three tiers in the one schedule PDF: "1 November 2025" (new — hotelling + NCCC, this file\'s AGED_CARE_SCHEDULE), "post 1 July 2014" (old means-tested care fee, entered 1 Jul 2014 – 31 Oct 2025 and did not opt in — this file\'s AGED_CARE_GRANDFATHERED_CAPS) and "pre 1 July 2014" (a third, older tier, not carried here)',
} satisfies Constant<string>;

const SUPPORT_AT_HOME_CLASSIFICATION_BUDGETS = {
  ...HEALTH_GOV_SUPPORT_AT_HOME,
  kind: 'config',
  effective: '2026-07-01',
  value: Object.freeze({
    1: toCents(11_010.01),
    2: toCents(16_451.35),
    3: toCents(22_536.81),
    4: toCents(30_468.51),
    5: toCents(40_729.53),
    6: toCents(49_365.27),
    7: toCents(59_660.0),
    8: toCents(80_137.12),
  }),
  note:
    'Annual budgets, DATA ONLY (P14-2 scope) — no contribution-bucket arithmetic in this slice; P14-11 builds the three buckets (Clinical/Independence/Everyday Living) against them. Updates concept.md\'s "$10,731 to $78,106", which was the 1 Nov 2025 launch figure; both are primary-sourced, for different dates. Current as of 1 Jul 2026, next indexed 1 Jul 2027 per health.gov.au.',
} satisfies Config<Readonly<Record<1 | 2 | 3 | 4 | 5 | 6 | 7 | 8, Cents>>>;

const SUPPORT_AT_HOME_RECLASSIFICATION_1_OCT_2026 = {
  ...SUPPORT_AT_HOME_RECLASSIFICATION,
  kind: 'config',
  effective: '2026-10-01',
  value:
    'Support at Home ONLY: personal care moves from the Independence contribution bucket (5-50%) to the Clinical bucket (0%). Residential care (hotelling, NCCC) is explicitly untouched — nothing in the 20 Sep 2026 residential schedule carves out personal care (P14-2).',
} satisfies Config<string, IsoDate>;

// --- Assembling a parameter period (shared with agePension.ts via periods.ts) -------------------

export interface AgedCarePeriod {
  readonly from: IsoDate;
  readonly to: IsoDate;
  readonly scheduleEffective: AgedCareScheduleDate;
  readonly mpirEffective: AgedCareMpirDate;
  readonly rates: AgedCareResidentialRateSet;
  readonly mpir: number;
}

export interface AgedCareParameterTables {
  readonly schedule: Readonly<Record<string, AgedCareResidentialRateSet>>;
  readonly mpir: Readonly<Record<string, number>>;
}

const PUBLISHED_AGED_CARE_TABLES: AgedCareParameterTables = Object.freeze({
  schedule: Object.freeze(
    Object.fromEntries(Object.entries(AGED_CARE_SCHEDULE).map(([date, a]) => [date, a.value])),
  ),
  mpir: Object.freeze(Object.fromEntries(Object.entries(AGED_CARE_MPIR).map(([date, a]) => [date, a.value]))),
});

/**
 * The parameter periods covering a window, assembled by merging the schedule and MPIR calendars —
 * the same `mergeCalendarBoundaries` machinery `agePensionPeriods` uses (`periods.ts`).
 */
export const agedCarePeriods = (
  from: IsoDate,
  to: IsoDate,
  tables: AgedCareParameterTables = PUBLISHED_AGED_CARE_TABLES,
): readonly AgedCarePeriod[] => {
  const scheduleDates = Object.keys(tables.schedule).sort() as readonly AgedCareScheduleDate[];
  const mpirDates = Object.keys(tables.mpir).sort() as readonly AgedCareMpirDate[];
  const boundaries = mergeCalendarBoundaries(from, to, [scheduleDates, mpirDates]);

  return Object.freeze(
    boundaries.map((start, index) => {
      const next = boundaries[index + 1];
      const scheduleEffective = latestOnOrBefore(scheduleDates, start);
      const mpirEffective = latestOnOrBefore(mpirDates, start);
      const rates = tables.schedule[scheduleEffective];
      const mpir = tables.mpir[mpirEffective];
      if (rates === undefined || mpir === undefined) {
        throw new RangeError(`no aged care parameters at ${start}`);
      }
      return Object.freeze({
        from: start,
        to: next === undefined ? to : dayBefore(next as IsoDate),
        scheduleEffective,
        mpirEffective,
        rates,
        mpir,
      });
    }),
  );
};

/** The window this file has data for: 20 Sep 2026 (the only published schedule) through one year on. */
export const AGED_CARE_PERIODS = agedCarePeriods('2026-09-20', '2027-09-19');

/**
 * The parameter period covering `date`, looked up against `periods` — the published-only window by
 * default, so every existing caller (and `test/assumptions-aged-care.test.mjs`'s own pins against
 * the one published year) is unchanged. `project()` passes the forward-generated list
 * (`agedCarePeriodsThrough`, below) once per walk instead.
 */
export const agedCarePeriodAt = (date: IsoDate, periods: readonly AgedCarePeriod[] = AGED_CARE_PERIODS): AgedCarePeriod => {
  const period = periods.find((candidate) => candidate.from <= date && date <= candidate.to);
  if (period === undefined) throw new RangeError(`no Aged Care parameter period covers ${date}`);
  return period;
};

// --- Forward indexation past the published window (P14, 2026-09-24) -----------------------------

/**
 * **UNVERIFIED — the forward indexation LINKAGE for the residential schedule is not sourced (with
 * ONE evidenced exception, `BASIC_DAILY_FEE_LINKAGE_PROVENANCE` below), and this constant records
 * that gap and the cautious choice made in its absence, rather than burying it in a formula's
 * derivation string.**
 *
 * `docs/research/p14-aged-care-sources-2026-09-24.md` found three dated PDF snapshots, not a rule:
 * unlike the Age Pension's §4.7 (CPI, PBLCI, MTAWE, all named and cited to SSA 1991), nothing
 * retrieved states what index the hotelling contribution, the NCCC or the residential thresholds
 * are legislated to move by — hotelling is described only as "indexed in March and September each
 * year" (a calendar, not a rate link). `indexAgedCareSchedule` therefore takes the caller's own
 * CPI movement for these — never wages, which this project only ever assumes where a figure is
 * SOURCED to track them — and rounds in the direction that cannot flatter the household on either
 * side of the ledger:
 *
 *   * a figure the household PAYS — the hotelling contribution max, the NCCC lifetime cap, the
 *     grandfathered caps, and the home exemption cap (a HIGHER cap assesses more of the home, not
 *     less: it is the ceiling the home's ASSESSED value is capped AT) — rounds UP, so a forecast
 *     never UNDER-states a cost;
 *   * a figure that PROTECTS the household from assessment — the income and assets free areas, and
 *     the max RAD without pricing approval — rounds DOWN, so a forecast never OVER-states a
 *     protection. This is the same direction `agePension.ts`'s `indexMeansTestParameters` floors
 *     ITS OWN free areas in, for the identical reason.
 *
 * Both roundings are the conservative one, and the residual is bounded at one cent per figure per
 * step — the same bound `agePension.ts`'s `PUBLISHED_ROUNDING_STEPS` admission carries. Nothing in
 * `src/` calls `indexAgedCareSchedule` yet: no walk or means test consumes an aged care figure in
 * this slice.
 *
 * **The basic daily fee is NOT among these figures — see `BASIC_DAILY_FEE_LINKAGE_PROVENANCE`,
 * immediately below `AGED_CARE_INDEXATION_LINKAGE_UNKNOWN`.** It is legally linked to the Age
 * Pension's single maximum basic rate, evidenced and reproduced to the cent, and
 * `indexAgedCareSchedule` no longer indexes it by CPI at all.
 */
const INDEXATION_LINKAGE_PROVENANCE = {
  source:
    'No linkage citation retrieved — docs/research/p14-aged-care-sources-2026-09-24.md records three dated PDF snapshots, not an indexation rule',
  retrieved: '2026-09-24',
  confidence: 'unverified',
  registerSection: '§12.3',
} as const;

const AGED_CARE_INDEXATION_LINKAGE_UNKNOWN = {
  ...INDEXATION_LINKAGE_PROVENANCE,
  kind: 'constant',
  everyYear: true,
  value:
    'CPI only, never wages; cost-to-household figures round UP, protection-to-household figures round DOWN. EXCEPT the basic daily fee, which is pension-linked — see `basicDailyFeeLinkage` — and is not indexed by this constant at all.',
} satisfies Constant<string>;

/**
 * **§12.3's ONE evidenced exception — the basic daily fee IS legally linked, primary-verified
 * 2026-09-24.** `indexAgedCareSchedule` used to index this figure by CPI along with everything
 * else in the residential schedule "because no linkage citation was found" — but one was never
 * looked for on the fee-facing page, only on the legislation. myagedcare.gov.au's "Aged care home
 * costs and fees" states it in one sentence: *"The basic daily fee is set at 85% of the single
 * person rate of the basic age pension. The government indexes it on 20 March and 20 September
 * each year."* — the same two dates `agePension.ts`'s `PAYMENT_RATES` reindexes on, which is not a
 * coincidence: the fee moves BECAUSE the pension does, not on a schedule of its own.
 *
 * **Two known points reproduce the published fee to the cent, which is what makes this
 * `primary-verified` rather than resting on the quote alone:**
 *
 *   * 20 Sep 2026: 0.85 × $1,135.40 (`agePension.ts` `PAYMENT_RATES['2026-09-20'].maximumBasicRate.single`)
 *     ÷ 14 = $68.935, floored to $68.93 — the published 20 Sep 2026 fee.
 *   * 20 Mar 2026: 0.85 × $1,100.30 (`PAYMENT_RATES['2026-03-20'].maximumBasicRate.single`) ÷ 14 =
 *     $66.8032..., floored to $66.80 — the published 20 Mar 2026 fee.
 *
 * **The rounding is FLOOR, not round-half-up, and the 20 Sep 2026 point is what proves it**:
 * 68.935 is exactly halfway, and the published figure is $68.93, not $68.94.
 *
 * **This changes the forecast's direction, not just its accuracy.** The Age Pension's basic rate
 * is MTAWE-benchmarked (§4.7) and rises with WAGES; CPI has historically run below wage growth, so
 * indexing this fee by CPI alone understated it — the flattering direction register §12.3
 * elsewhere works to avoid. `basicDailyFeeFromPension` replaces the CPI limb for this one figure;
 * `indexAgedCareSchedule` now takes the Age Pension's own projected single maximum basic rate for
 * the period as an explicit parameter (reusing `agePension.ts`'s `indexPensionRates` / period
 * lookup — the caller's business, never this file's) rather than the caller's CPI movement.
 *
 * **Nothing else on this page is claimed.** The hotelling supplement is "means tested and indexed
 * in March and September each year" on the same page — a calendar, not a rate link — and no
 * income/assets free area or RAD figure is described there at all. Those stay on cautious CPI, as
 * built, per `AGED_CARE_INDEXATION_LINKAGE_UNKNOWN`.
 */
const BASIC_DAILY_FEE_LINKAGE_PROVENANCE = {
  source:
    'myagedcare.gov.au — "Aged care home costs and fees" (https://www.myagedcare.gov.au/aged-care-home-costs-and-fees), quote: "The basic daily fee is set at 85% of the single person rate of the basic age pension. The government indexes it on 20 March and 20 September each year." Cross-checked against agePension.ts: 0.85 × $1,135.40 ÷ 14 = $68.93 (20 Sep 2026, floored) and 0.85 × $1,100.30 ÷ 14 = $66.80 (20 Mar 2026, floored) both reproduce the published fee to the cent.',
  retrieved: '2026-09-24',
  confidence: 'primary-verified',
  registerSection: '§12.3',
} as const;

const BASIC_DAILY_FEE_PENSION_SHARE = 0.85;
const BASIC_DAILY_FEE_DAYS_PER_FORTNIGHT = 14;

/**
 * 0.85 × the Age Pension single maximum basic rate ÷ 14, floored to the cent —
 * `BASIC_DAILY_FEE_LINKAGE_PROVENANCE` is the evidence and the two known points it reproduces.
 * `singleMaximumBasicRate` is per fortnight, the same shape as
 * `agePension.ts`'s `PaymentRateSet.maximumBasicRate.single` — this function does not read that
 * module; the caller supplies whichever period's rate applies (published or its own forward
 * projection via `indexPensionRates`), exactly as the Age Pension module itself never hard-codes
 * a forward CPI/PBLCI/MTAWE series but takes one from its caller.
 */
export const basicDailyFeeFromPension = (singleMaximumBasicRate: Cents): Cents =>
  toCents(
    Math.floor((singleMaximumBasicRate * BASIC_DAILY_FEE_PENSION_SHARE) / BASIC_DAILY_FEE_DAYS_PER_FORTNIGHT) / 100,
  );

const upCents = (cents: Cents, factor: number): Cents => {
  if (!Number.isFinite(factor)) throw new RangeError(`not a finite CPI movement: ${factor}`);
  return toCents(Math.ceil(cents * factor) / 100);
};

const downCents = (cents: Cents, factor: number): Cents => {
  if (!Number.isFinite(factor)) throw new RangeError(`not a finite CPI movement: ${factor}`);
  return toCents(Math.floor(cents * factor) / 100);
};

/**
 * Index the residential schedule forward. **The basic daily fee is the one figure NOT indexed by
 * CPI** — `basicDailyFeeFromPension` (`BASIC_DAILY_FEE_LINKAGE_PROVENANCE`, §12.3) derives it from
 * `singleMaximumBasicRate`, the Age Pension's own projected single maximum basic rate for this
 * period; everything else moves on the caller's CPI movement per
 * `AGED_CARE_INDEXATION_LINKAGE_UNKNOWN`. `capYears` is a legislated year-count, not a dollar
 * figure, and passes through unchanged.
 */
export const indexAgedCareSchedule = (
  previous: AgedCareResidentialRateSet,
  movements: { readonly cpi: number },
  singleMaximumBasicRate: Cents,
): AgedCareResidentialRateSet => {
  const { cpi } = movements;
  return Object.freeze({
    basicDailyFee: basicDailyFeeFromPension(singleMaximumBasicRate),
    hotellingContributionMax: upCents(previous.hotellingContributionMax, cpi),
    nonClinicalCareContribution: Object.freeze({
      dailyMax: upCents(previous.nonClinicalCareContribution.dailyMax, cpi),
      lifetimeCap: upCents(previous.nonClinicalCareContribution.lifetimeCap, cpi),
      capYears: previous.nonClinicalCareContribution.capYears,
    }),
    thresholds: Object.freeze({
      incomeFreeAreaSingle: downCents(previous.thresholds.incomeFreeAreaSingle, cpi),
      assetsFreeArea: downCents(previous.thresholds.assetsFreeArea, cpi),
      homeExemptionCap: upCents(previous.thresholds.homeExemptionCap, cpi),
    }),
    maxRadWithoutPricingApproval: downCents(previous.maxRadWithoutPricingApproval, cpi),
    // The five-band thresholds and the accommodation supplement all PROTECT the household (a
    // higher threshold keeps more of a band at a lower or zero rate; a higher supplement offsets
    // more of the means tested amount before hotelling/NCCC start) — same DOWN direction as the
    // free areas above, per AGED_CARE_INDEXATION_LINKAGE_UNKNOWN. `assetThresholds.first` is a
    // distinct field from `thresholds.homeExemptionCap` even though they are numerically equal
    // today (§12.6) — the home cap rounds UP (it is a cost-side figure, home_exemption_cap's own
    // documented direction) while this is a protection-side band boundary.
    incomeThresholds: Object.freeze({
      single: Object.freeze({
        freeArea: downCents(previous.incomeThresholds.single.freeArea, cpi),
        first: downCents(previous.incomeThresholds.single.first, cpi),
        second: downCents(previous.incomeThresholds.single.second, cpi),
        third: downCents(previous.incomeThresholds.single.third, cpi),
        fourth: downCents(previous.incomeThresholds.single.fourth, cpi),
      }),
      couple: Object.freeze({
        freeArea: downCents(previous.incomeThresholds.couple.freeArea, cpi),
        first: downCents(previous.incomeThresholds.couple.first, cpi),
        second: downCents(previous.incomeThresholds.couple.second, cpi),
        third: downCents(previous.incomeThresholds.couple.third, cpi),
        fourth: downCents(previous.incomeThresholds.couple.fourth, cpi),
      }),
    }),
    assetThresholds: Object.freeze({
      freeArea: downCents(previous.assetThresholds.freeArea, cpi),
      first: downCents(previous.assetThresholds.first, cpi),
      second: downCents(previous.assetThresholds.second, cpi),
      third: downCents(previous.assetThresholds.third, cpi),
      fourth: downCents(previous.assetThresholds.fourth, cpi),
    }),
    maxAccommodationSupplement: downCents(previous.maxAccommodationSupplement, cpi),
  });
};

// --- Forward periods (P14-17, 2026-09-25): the defect this closes is that NOTHING called ---------
// `indexAgedCareSchedule` — a resident entering care outside the one published year was refused
// outright. `agePension.ts`'s own answer to the identical problem (a published window a handful of
// months long against a forty-year projection) is mirrored here: generate forward, mark what was
// generated, never silently extrapolate a stale table.

/** Every 20 March / 1 July / 20 September strictly after `after` and on or before `to`, in order — the residential schedule's own three-date calendar, `agePension.ts`'s `rateDatesAfter` shape with a third date. */
const agedCareScheduleDatesAfter = (after: AgedCareScheduleDate, to: IsoDate): readonly AgedCareScheduleDate[] => {
  const dates: AgedCareScheduleDate[] = [];
  for (let year = Number(after.slice(0, 4)); year <= Number(to.slice(0, 4)); year += 1) {
    for (const date of [`${year}-03-20`, `${year}-07-01`, `${year}-09-20`] as readonly AgedCareScheduleDate[]) {
      if (date > after && date <= to) dates.push(date);
    }
  }
  return dates;
};

/**
 * **The residential schedule extended past 20 Sep 2026 (the one published set) through `to`.** One
 * step per 20 Mar / 1 Jul / 20 Sep, each set indexed from the one immediately before it by
 * `indexAgedCareSchedule` — cumulative, the same chain `agePension.ts`'s `indexForward` runs, so the
 * per-step rounding bound (§12.3's "one cent per figure per step") is what actually accrues rather
 * than a single multi-year jump wearing a one-step error bound it never earned.
 *
 * `cpi` is the plan's own flat annual rate (`Settings.economicSeries.cpi`) — aged care carries no
 * caller-stated DATED series the way the Age Pension does (register O5 is an Age Pension setting
 * only), and every other CPI-carried figure in this project (the Contingency Floor, cash interest,
 * stated spending) already reads that same flat Setting. The per-step movement is
 * `core/priceLevel.ts`'s `priceLevelFactor` — the one CPI-compounding expression this project has
 * (`feedback-one-fact-one-expression` in agent memory) — run from the PREVIOUS schedule date to the
 * new one, never re-derived from the 2026-09-20 origin, so a 20 Mar → 1 Jul → 20 Sep chain compounds
 * exactly the elapsed months between each pair and no more.
 *
 * `singleMaximumBasicRateAt` is the caller's own projected Age Pension single maximum basic rate for
 * each generated date — `basicDailyFeeFromPension`'s own doc explains why this file never reads
 * `agePension.ts` directly. `project()` supplies the SAME projected series the walk pays the pension
 * line from, so the basic fee tracks the pension the walk actually pays rather than a second,
 * independent forecast of it.
 */
export const agedCareScheduleThrough = (
  cpi: number,
  singleMaximumBasicRateAt: (date: IsoDate) => Cents,
  to: IsoDate,
): Readonly<Record<string, AgedCareResidentialRateSet>> => {
  const publishedDates = Object.keys(AGED_CARE_SCHEDULE).sort() as readonly AgedCareScheduleDate[];
  const lastPublished = publishedDates.at(-1);
  const schedule: Record<string, AgedCareResidentialRateSet> = { ...PUBLISHED_AGED_CARE_TABLES.schedule };
  if (lastPublished === undefined) return Object.freeze(schedule);
  let carried = schedule[lastPublished];
  let previousDate: IsoDate = lastPublished;
  if (carried !== undefined) {
    for (const effective of agedCareScheduleDatesAfter(lastPublished, to)) {
      const movement = priceLevelFactor(cpi, previousDate, effective);
      carried = indexAgedCareSchedule(carried, { cpi: movement }, singleMaximumBasicRateAt(effective));
      schedule[effective] = carried;
      previousDate = effective;
    }
  }
  return Object.freeze(schedule);
};

/**
 * **Every parameter period from the published window through `to`.** The schedule is extended
 * forward (`agedCareScheduleThrough`, above); the MPIR is NOT — nothing retrieved states a forward
 * rule for it (§12.2), and it is fixed per resident at the entry's own date anyway
 * (`agedCareAccommodationPayment` reads the resident's entry-date rate, never the walk's current
 * one), so it is simply left to hold at its last determined quarter. That holding needs no code of
 * its own: `agedCarePeriods` already resolves each boundary's MPIR by `latestOnOrBefore` against the
 * (unextended) MPIR table, which is exactly "the last determined quarter" for any date past it — the
 * SAME shared `mergeCalendarBoundaries` machinery (`periods.ts`) this whole file's header points to,
 * doing the holding without a second, aged-care-only copy of the rule.
 */
export const agedCarePeriodsThrough = (
  to: IsoDate,
  cpi: number,
  singleMaximumBasicRateAt: (date: IsoDate) => Cents,
): readonly AgedCarePeriod[] => {
  const first = AGED_CARE_PERIODS[0];
  if (first === undefined) throw new RangeError('no published Aged Care parameters to start the forward indexation');
  return agedCarePeriods(
    first.from,
    to,
    Object.freeze({ schedule: agedCareScheduleThrough(cpi, singleMaximumBasicRateAt, to), mpir: PUBLISHED_AGED_CARE_TABLES.mpir }),
  );
};

export const AGED_CARE = deepFreeze({
  residentialSchedule: AGED_CARE_SCHEDULE,
  grandfatheredCaps: AGED_CARE_GRANDFATHERED_CAPS,
  grandfatheringStructure: GRANDFATHERING_STRUCTURE,
  radRetention: RAD_RETENTION,
  mpir: AGED_CARE_MPIR,
  dapFormula: DAP_FORMULA,
  meansTestTaper: MEANS_TEST_TAPER,
  feeWaterfallOrder: FEE_WATERFALL_ORDER,
  supportAtHome: {
    classificationBudgets: SUPPORT_AT_HOME_CLASSIFICATION_BUDGETS,
    reclassification1Oct2026: SUPPORT_AT_HOME_RECLASSIFICATION_1_OCT_2026,
  },
  indexation: {
    linkageUnknown: AGED_CARE_INDEXATION_LINKAGE_UNKNOWN,
    basicDailyFeeLinkage: {
      ...BASIC_DAILY_FEE_LINKAGE_PROVENANCE,
      kind: 'config-derived',
      effective: '2026-09-20',
      value: basicDailyFeeFromPension,
      derivation:
        '0.85 × the Age Pension single maximum basic rate (per fortnight) ÷ 14, floored to the cent — reproduces $68.93 (20 Sep 2026) and $66.80 (20 Mar 2026) exactly from agePension.ts\'s own published rates',
    } satisfies Formula<typeof basicDailyFeeFromPension, AgedCareScheduleDate>,
    mechanism: {
      ...INDEXATION_LINKAGE_PROVENANCE,
      kind: 'config-derived',
      effective: '2026-09-20',
      value: indexAgedCareSchedule,
      derivation:
        'every figure EXCEPT the basic daily fee (see basicDailyFeeLinkage) × the caller-supplied CPI movement; cost-to-household figures (the hotelling contribution max, the NCCC dailyMax and lifetimeCap, the grandfathered caps, the home exemption cap) round UP to the cent, protection-to-household figures (the income and assets free areas, the max RAD without pricing approval) round DOWN; capYears is not a dollar figure and does not move',
    } satisfies Formula<typeof indexAgedCareSchedule, AgedCareScheduleDate>,
  },
});
