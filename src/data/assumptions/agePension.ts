// Age Pension — register §4.
//
// **The financial year contains three parameter periods, not two** (T22), and this module is
// shaped so that a flat single rate set cannot be written by accident:
//
//   * payment rates reindex on 20 March and 20 September. `PAYMENT_RATES` is keyed by
//     `RateIndexationDate`, which is the literal type `${number}-03-20 | ${number}-09-20`.
//   * free areas, assets free areas and deeming thresholds reindex on 1 July. `MEANS_TEST` is
//     keyed by `MeansTestIndexationDate`, which is `${number}-07-01`.
//
// The two key spaces are disjoint and the two value types are different, so `'2026-07-01'` will
// not typecheck as a rates key and a rate set will not typecheck as a means-test set. There is
// no object anywhere in this module that holds both under one date. A parameter period is
// *assembled* from the two calendars by `agePensionPeriods`, which merges their boundaries — so
// the three periods fall out of the calendars rather than being listed, and adding a fourth
// indexation date produces a fourth period without anyone editing a list.
//
// Two further separations are structural for the same reason:
//
//   * the Energy Supplement is not in the rate set. It has never been indexed (T23, T31), so it
//     is not part of the thing that gets reindexed.
//   * only the homeowner assets free areas are stored. The non-homeowner figures are the
//     homeowner figures plus one indexed differential — the extra allowable amount (T26) — so
//     there is a single series and nothing that can drift.
//
// Entitlement is an output, never an assumption (ADR-0003). Nothing here computes it: the
// cut-offs below are threshold derivations the register marks derived (T25), with the published
// figures as fixtures.
import { toCents } from '../../core/money.js'; // `.js` is correct in a `.ts` file — see tsconfig.json
import type { Cents } from '../../core/money.js';
import { deepFreeze } from './types.js';
import { dayAfter, dayBefore, latestOnOrBefore, mergeCalendarBoundaries } from './periods.js';
import type {
  Assumption,
  Constant,
  IsoDate,
  MeansTestIndexationDate,
  Money,
  Rate,
  RateIndexationDate,
} from './types.js';
import type {
  AgePensionIndexationSeries,
  DeemingRatesSetting,
  EconomicSeriesSetting,
  MeansTestIndexation,
  PensionRateIndexation,
} from './settings.js';

const DSS_20_MAR_2026 = {
  source: 'Services Australia · DSS rates list 20 March 2026',
  retrieved: '2026-09-03',
  confidence: 'primary-verified',
  registerSection: '§4.2',
} as const;

const DSS_20_SEP_2026 = {
  source: 'DSS rates list, 20 September 2026 indexation (published 20 Aug 2026)',
  retrieved: '2026-09-03',
  confidence: 'primary-verified',
  registerSection: '§4.2',
} as const;

const DSS_1_JUL_2026 = {
  source: 'DSS rates list, 1 July 2026 · Services Australia income and assets tests',
  retrieved: '2026-09-03',
  confidence: 'primary-verified',
  registerSection: '§4.3 / §4.4 / §4.5',
} as const;

const DSS_PRIOR = {
  source: 'DSS rates list, 20 March 2026 ("previous amount" columns) · Services Australia',
  retrieved: '2026-09-03',
  confidence: 'primary-verified',
  registerSection: '§4.3 / §4.4 / §4.5',
} as const;

// The register stamps the free areas, assets free areas and deeming thresholds in force during
// parameter period 1 as "(prior), 2026-03-20" — the start of that period. §4.1 says all three
// index on 1 July, so the date they took effect is 1 July 2025. They are keyed and stamped by
// the indexation date, which is what the period assembly needs; the values are unchanged.
const PRIOR_MEANS_TEST_NOTE =
  'Register §4.3–§4.5 label this "(prior)" against 2026-03-20, the start of parameter period 1. §4.1 says the figure indexes on 1 July, so 2025-07-01 is when it took effect; stamped by the indexation date so the period assembly can find it.';

const SSA_INDEXATION = {
  source: 'DVA indexation ready reckoner · SSA 1991 s 1195',
  retrieved: '2026-09-03',
  confidence: 'primary-verified',
  registerSection: '§4.7',
} as const;

const SERVICES_AUSTRALIA = {
  source: 'Services Australia — Age Pension income and assets tests',
  retrieved: '2026-09-03',
  confidence: 'primary-verified',
  registerSection: '§4.4',
} as const;

const SS_GUIDE_BEREAVEMENT = {
  source:
    'DSS Social Security Guide 3.1.5.70 "The lump sum bereavement payment - member of a couple" and 3.1.5.30 "Bereavement payment provisions for couples", read from the Internet Archive (the origin refuses curl)',
  retrieved: '2026-09-24',
  confidence: 'primary-via-archive',
  registerSection: '§4.11',
} as const;

const DSS_GUIDE_CARE_SITUATIONS = {
  source:
    'DSS Social Security Guide 4.6.3.70 "Exempting the principal home - care situations" · SSA 1991 s 11A(9)(b), read from the Internet Archive (the origin 403s curl) and re-verified 2026-09-25 by a direct fetch of the Guide page via the same Wayback proxy',
  retrieved: '2026-09-25',
  confidence: 'primary-via-archive',
  registerSection: '§4.4.1',
} as const;

const DSS_GUIDE_SALE_PROCEEDS = {
  source:
    'DSS Social Security Guide 4.6.3.90 "Exempting the principal home - sale proceeds (for homes sold on or after 01/01/2023)" · SSAct s 1118(1B)/(2)/(2B), read from the Internet Archive (the origin 403s curl), snapshot dated 2025-11-16, "Version 1.333 - Released 3 November 2025", "Last reviewed: 22 September 2025"',
  retrieved: '2026-09-25',
  confidence: 'primary-via-archive',
  registerSection: '§4.4.1',
} as const;

const WORK_BONUS = {
  source: 'Services Australia — Work Bonus balance · how the Work Bonus works · Work Bonus and your partner income',
  retrieved: '2026-09-03',
  confidence: 'primary-verified',
  registerSection: '§4.6',
} as const;

/** Which rate a figure applies to. The couple figures are per Person and combined, never blended. */
export type RateStatus = 'single' | 'coupleEach' | 'coupleCombined';

export type ByStatus<T> = Readonly<Record<RateStatus, T>>;

/**
 * The components that reindex on 20 March and 20 September. Three separate components, never one
 * blended number: the basic rate is MTAWE-benchmarked and the Pension Supplement is CPI-only
 * (T23). The Energy Supplement is deliberately absent — see `ENERGY_SUPPLEMENT`.
 */
export interface PaymentRateSet {
  readonly maximumBasicRate: ByStatus<Cents>;
  readonly pensionSupplementMaximum: ByStatus<Cents>;
  readonly pensionSupplementBasic: ByStatus<Cents>;
  readonly pensionSupplementMinimum: ByStatus<Cents>;
}

/** The parameters that reindex on 1 July. A different calendar, and therefore a different type. */
export interface MeansTestParameterSet {
  readonly incomeFreeArea: { readonly single: Cents; readonly coupleCombined: Cents };
  /** Homeowner only. The non-homeowner figures are derived — see `nonHomeownerAssetsFreeArea` (T26). */
  readonly assetsFreeAreaHomeowner: { readonly single: Cents; readonly coupleCombined: Cents };
  /** The single indexed differential that generates every non-homeowner assets free area. */
  readonly extraAllowableAmount: Cents;
  readonly deemingThreshold: {
    readonly single: Cents;
    readonly coupleCombined: Cents;
    /** Each member of a couple where neither is on a pension. Absent where the register does not give it. */
    readonly memberOfCoupleNeitherOnPension?: Cents;
  };
}

const fortnightly = (single: number, coupleEach: number, coupleCombined: number): ByStatus<Cents> =>
  Object.freeze({
    single: toCents(single),
    coupleEach: toCents(coupleEach),
    coupleCombined: toCents(coupleCombined),
  });

const PAYMENT_RATES: Readonly<Record<RateIndexationDate, Assumption<PaymentRateSet, RateIndexationDate>>> = {
  '2026-03-20': {
    ...DSS_20_MAR_2026,
    kind: 'config',
    effective: '2026-03-20',
    value: {
      maximumBasicRate: fortnightly(1_100.3, 829.4, 1_658.8),
      pensionSupplementMaximum: fortnightly(86.5, 65.2, 130.4),
      pensionSupplementBasic: fortnightly(30.1, 24.8, 49.6),
      pensionSupplementMinimum: fortnightly(46.6, 35.1, 70.2),
    },
    note: 'All per fortnight. The transitional rate (single $963.60, couple each $778.20) is not modelled — no pre-2009 pensioner in this Household. Those two figures are a record of their own from 2026-09-21 (`agePension.transitionalMaximumRate`), so the sentence above is a reader\'s copy and not their only home.',
  },
  '2026-09-20': {
    ...DSS_20_SEP_2026,
    kind: 'config',
    effective: '2026-09-20',
    value: {
      maximumBasicRate: fortnightly(1_135.4, 855.9, 1_711.8),
      pensionSupplementMaximum: fortnightly(88.2, 66.5, 133.0),
      pensionSupplementBasic: fortnightly(30.7, 25.3, 50.6),
      pensionSupplementMinimum: fortnightly(47.5, 35.8, 71.6),
    },
    note: 'From this date a pensioner paid outside Australia loses the Pension Supplement basic amount entirely — relevant only to a "move overseas" Scenario.',
  },
};

/**
 * **The pre-2009 TRANSITIONAL maximum rate at 20 March 2026 (P4-18, 2026-09-21).**
 *
 * These two figures existed until today only inside the words of `PAYMENT_RATES['2026-03-20'].note`,
 * which said — correctly — that the transitional rate is not modelled. **Promoting a figure is not
 * modelling it.** Nothing reads this record: `maximumPaymentRate` and both means tests go on using
 * the normal maximum basic rate, and no pre-2009 pensioner exists in this Household. What changes
 * is that the numbers now carry a source, a retrieval date and a confidence, and can be checked.
 *
 * **It is one figure, not four.** The transitional pensioner gets this maximum rate plus the Energy
 * Supplement and nothing else — no Pension Supplement — which is why this is a bare `ByStatus` and
 * not a `PaymentRateSet`.
 *
 * **What the confidence means.** The 20 March 2026 rate period is closed and the page that
 * published it has been overwritten by the 20 September one, so the figures were read off an
 * Internet Archive capture of the primary page rather than the primary page itself:
 * `primary-via-archive`, exactly as `assetsTest.homeownerTest` is. **The capture is cross-checked
 * against this file, and that is what makes it trustworthy**: the same table's NORMAL rates
 * reproduce `PAYMENT_RATES['2026-03-20'].maximumBasicRate` to the cent in all three columns, so the
 * right page, the right date and the right column were read. `test/assumptions-age-pension.test.mjs`
 * runs that cross-check.
 */
const TRANSITIONAL_MAXIMUM_RATE = {
  source:
    'Services Australia "How much you can get" (Age Pension) — Transitional rates table, page last updated 20 March 2026; read from the Internet Archive capture of 2026-05-09 (web.archive.org/web/20260509163238)',
  retrieved: '2026-09-21',
  confidence: 'primary-via-archive',
  registerSection: '§4.2',
  kind: 'config',
  effective: '2026-03-20',
  value: fortnightly(963.6, 778.2, 1_556.4),
  note: 'Per fortnight, and NOT MODELLED — no pre-2009 pensioner in this Household, and nothing in `src/` reads this. Recorded so the figures in the note beside the 20 Mar rates have a provenance instead of looking like one. The transitional pensioner receives this rate plus the Energy Supplement only; there is no Pension Supplement on this rate.',
} satisfies Assumption<ByStatus<Cents>>;

/**
 * **The same transitional maximum rate from 20 September 2026** — the second row of the same
 * table, beside the 20 March record above and in the same shape. Read from the live Services
 * Australia page (last updated 20 September 2026) and the DSS rates list of 20 September 2026,
 * whose "Previous Amount" column carries the 20 March figures above. All three columns are
 * therefore primary, not via an archive. Still NOT MODELLED, for the same reason.
 */
const TRANSITIONAL_MAXIMUM_RATE_20_SEP_2026 = {
  source:
    'Services Australia "How much you can get" (Age Pension) — Transitional rates table, page last updated 20 September 2026 · DSS rates list, 20 September 2026 (www.dss.gov.au/system/files/documents/2026-08/rates-list-20-september-2026.pdf)',
  retrieved: '2026-09-29',
  confidence: 'primary-verified',
  registerSection: '§4.2',
  kind: 'config',
  effective: '2026-09-20',
  value: fortnightly(982.9, 793.8, 1_587.6),
  note: 'Per fortnight, and NOT MODELLED — no pre-2009 pensioner in this Household, and nothing in `src/` reads this. The transitional pensioner receives this rate plus the Energy Supplement only; there is no Pension Supplement on this rate.',
} satisfies Assumption<ByStatus<Cents>>;

const MEANS_TEST: Readonly<
  Record<MeansTestIndexationDate, Assumption<MeansTestParameterSet, MeansTestIndexationDate>>
> = {
  '2025-07-01': {
    ...DSS_PRIOR,
    kind: 'config',
    effective: '2025-07-01',
    value: {
      incomeFreeArea: { single: toCents(218), coupleCombined: toCents(380) },
      assetsFreeAreaHomeowner: { single: toCents(321_500), coupleCombined: toCents(481_500) },
      extraAllowableAmount: toCents(258_000),
      deemingThreshold: { single: toCents(64_200), coupleCombined: toCents(106_200) },
    },
    note: PRIOR_MEANS_TEST_NOTE,
  },
  '2026-07-01': {
    ...DSS_1_JUL_2026,
    kind: 'config',
    effective: '2026-07-01',
    value: {
      incomeFreeArea: { single: toCents(226), coupleCombined: toCents(396) },
      assetsFreeAreaHomeowner: { single: toCents(333_000), coupleCombined: toCents(499_000) },
      extraAllowableAmount: toCents(267_000),
      deemingThreshold: {
        single: toCents(66_800),
        coupleCombined: toCents(110_600),
        memberOfCoupleNeitherOnPension: toCents(55_300),
      },
    },
    note: 'T22 — these take effect on 1 July, in the middle of the 20 Mar rate period. A parameter set spanning 20 Mar to 19 Sep is wrong from 1 July.',
  },
};

/** T23, T31: never indexed, and $14.10 / $10.60 since 2014. Payable to a new Age Pension claimant. */
const ENERGY_SUPPLEMENT: Constant<ByStatus<Cents>> = {
  source: 'Services Australia — who can get Energy Supplement · DSS rates lists',
  retrieved: '2026-09-03',
  confidence: 'primary-verified',
  registerSection: '§4.2 / §4.8',
  kind: 'constant',
  everyYear: true,
  value: fortnightly(14.1, 10.6, 21.2),
  note: 'Never indexed — worth ~1.2% of the single payment today and roughly a third of that by the end of the Planning Horizon. The 19 Sep 2016 closure applies only to Family Tax Benefit and the Commonwealth Seniors Health Card, so it IS payable to a new claimant (T31).',
};

/**
 * **The steps the PUBLISHED 1 July parameters move in (P4-18, 2026-09-21) — recorded, NOT applied.**
 *
 * These three figures existed until today only inside the words of the doc comment below, which is
 * where the model's one unsourced rounding decision is explained. The decision is unchanged and
 * correct: `indexMeansTestParameters` floors to the cent and does not step, the direction runs
 * against the household, and the residual is bounded at one cent per parameter per year. What was
 * missing is that the three numbers the explanation turns on had no provenance of their own.
 *
 * **This is the one record in this file that could not be verified, and it is stamped `unverified`
 * rather than dressed up.** What could be established: the two published transitions this file
 * already carries move in whole multiples of all three steps, and for the assets free areas and the
 * deeming thresholds the step is exactly the greatest common divisor of the published movements —
 * `test/assumptions-age-pension.test.mjs` computes that from the `MEANS_TEST` records rather than
 * restating it. What could NOT be established: **any rule that says so.** SSA 1991 s 1191's
 * indexation table carries a "rounding base" column and would settle it; the Federal Register serves
 * the Act only as multi-volume PDFs this pass could not address by volume, AustLII and the DSS
 * Social Security Guide both refuse automated retrieval (403 / Cloudflare), and no secondary source
 * was consulted either — so this is `unverified` and not `secondary-only`. **Register O74 is open on
 * exactly this**, and closing it means reading s 1191, not relabelling this record.
 *
 * Two published transitions cannot pin a step in any case: they can only fail to contradict one.
 * The income free area's movements are multiples of 8, which is consistent with a $2 step and with
 * three other step sizes as well.
 */
const PUBLISHED_ROUNDING_STEPS = {
  source:
    'Observed in the DSS published figures carried in this file — no rounding rule retrieved from SSA 1991 s 1191, the DSS Social Security Guide or any secondary source (register O74, open)',
  retrieved: '2026-09-21',
  confidence: 'unverified',
  registerSection: '§4.7',
  kind: 'constant',
  everyYear: true,
  value: Object.freeze({
    incomeFreeArea: toCents(2),
    assetsFreeArea: toCents(500),
    deemingThreshold: toCents(200),
  }),
  note: 'Per fortnight for the income free area; absolute for the other two. NOT APPLIED — `indexMeansTestParameters` floors to the cent and does not step, which is the choice O74 records and this record does not change. Unverified: the steps are read off published movements, and no rounding rule was obtained. A forward parameter set that lands off-step is expected, and is out by at most one cent.',
} satisfies Constant<Readonly<{ incomeFreeArea: Cents; assetsFreeArea: Cents; deemingThreshold: Cents }>>;

const RENT_ASSISTANCE_HOMEOWNER: Money = {
  ...SERVICES_AUSTRALIA,
  registerSection: '§5.3',
  kind: 'constant',
  everyYear: true,
  value: toCents(0),
  note: 'The Maximum Payment Rate is basic rate + Pension Supplement + Energy Supplement + Rent Assistance (SS Act s 1064, Pension Rate Calculator A Module A Step 4). Rent Assistance is nil for a homeowner Household, but `maximumPaymentRate` still takes it, so the structure does not preclude it.',
};

// --- Assembling a parameter period --------------------------------------------------------------

export interface AgePensionPeriod {
  readonly from: IsoDate;
  readonly to: IsoDate;
  /** Which 20 Mar / 20 Sep rate set applies. */
  readonly ratesEffective: RateIndexationDate;
  /** Which 1 July means-test set applies. Distinct from `ratesEffective` — that is the whole point. */
  readonly meansTestEffective: MeansTestIndexationDate;
  readonly rates: PaymentRateSet;
  readonly meansTest: MeansTestParameterSet;
  /** The deeming rates determined at the start of the period, or `undefined` once past the last determination — from there they come from a Setting (T30, register O2). */
  readonly deemingRates: DeemingRatesSetting | undefined;
  /**
   * **Absent on a period the register PUBLISHES; set on one the standing table ANSWERS FOR.**
   *
   * This is the only thing that distinguishes the two, and it has to exist because the figures
   * cannot: a standing period's rates are byte-for-byte the last published ones. Its value is the
   * last day anybody has legislated parameters for — `LAST_PUBLISHED_PARAMETER_DAY` — which is
   * what a reader needs in order to judge DISTANCE. See `STANDING_PARAMETERS_DIRECTION` for why
   * carrying them is safe, and `standingAgePensionPeriod` for what is and is not carried, and for
   * why no period reaching the walk carries this field yet.
   */
  readonly standingFrom?: IsoDate;
}

const PUBLISHED_RATE_DATES = Object.keys(PAYMENT_RATES).sort() as readonly RateIndexationDate[];
const PUBLISHED_MEANS_TEST_DATES = Object.keys(MEANS_TEST).sort() as readonly MeansTestIndexationDate[];

/**
 * The parameter periods covering a window, assembled by merging the two indexation calendars.
 * Three periods for a financial year is a consequence of the calendars, not a hard-coded list.
 *
 * The boundary merge itself lives in `periods.ts` (P14, 2026-09-24) and is shared with aged care's
 * own two-calendar assembly — this function's OUTPUT is unchanged byte-for-byte by that move.
 */
export const agePensionPeriods = (
  from: IsoDate,
  to: IsoDate,
  tables: ParameterTables = PUBLISHED_TABLES,
): readonly AgePensionPeriod[] => {
  const rateDates = Object.keys(tables.rates).sort() as readonly RateIndexationDate[];
  const meansTestDates = Object.keys(tables.meansTest).sort() as readonly MeansTestIndexationDate[];
  const boundaries = mergeCalendarBoundaries(from, to, [rateDates, meansTestDates]);

  return Object.freeze(
    boundaries.map((start, index) => {
      const next = boundaries[index + 1];
      const ratesEffective = latestOnOrBefore(rateDates, start);
      const meansTestEffective = latestOnOrBefore(meansTestDates, start);
      const rates = tables.rates[ratesEffective];
      const meansTest = tables.meansTest[meansTestEffective];
      if (rates === undefined || meansTest === undefined) throw new RangeError(`no parameters at ${start}`);
      return Object.freeze({
        from: start as IsoDate,
        to: next === undefined ? to : dayBefore(next as IsoDate),
        ratesEffective,
        meansTestEffective,
        rates,
        meansTest,
        deemingRates: deemingRatesAt(start as IsoDate),
      });
    }),
  );
};

/**
 * The two parameter calendars, as plain tables. The published ones are the register's own figures;
 * a forward table is those plus everything `indexForward` computed from the caller's series. The
 * assembly above reads a table and never a global, so an indexed set and a published set travel the
 * same path and cannot diverge in how they are turned into periods.
 */
export interface ParameterTables {
  readonly rates: Readonly<Record<string, PaymentRateSet>>;
  readonly meansTest: Readonly<Record<string, MeansTestParameterSet>>;
}

const PUBLISHED_TABLES: ParameterTables = Object.freeze({
  rates: Object.freeze(
    Object.fromEntries(Object.entries(PAYMENT_RATES).map(([date, a]) => [date, a.value])),
  ),
  meansTest: Object.freeze(
    Object.fromEntries(Object.entries(MEANS_TEST).map(([date, a]) => [date, a.value])),
  ),
});

// --- Deeming (T30) ------------------------------------------------------------------------------
//
// Rates are a discretionary Ministerial determination on a six-monthly AGA review cycle: no
// formula, no index, no announced terminal rate. Determinations already made are facts and are
// recorded; anything after the last one is a Setting, and `deemingRatesAt` returns `undefined`
// rather than extrapolating the +0.5% steps that happen to have occurred three times running.

const DEEMING_DETERMINATIONS: Readonly<Record<IsoDate, Assumption<DeemingRatesSetting>>> = {
  '2020-05-01': {
    source: 'Challenger (adviser-grade summary) — no primary text obtained',
    retrieved: '2026-09-03',
    confidence: 'secondary-only',
    registerSection: '§4.5',
    kind: 'config',
    effective: '2020-05-01',
    value: { lower: 0.0025, upper: 0.0225 },
    note: 'The COVID freeze. The only secondary-only row in the register; it stays secondary-only. Matters only if the model ever backtests (register O13).',
  },
  '2025-09-20': {
    source: 'DSS social security deeming rates',
    retrieved: '2026-09-03',
    confidence: 'primary-verified',
    registerSection: '§4.5',
    kind: 'config',
    effective: '2025-09-20',
    value: { lower: 0.0075, upper: 0.0275 },
  },
  '2026-03-20': {
    source: 'DSS social security deeming rates',
    retrieved: '2026-09-03',
    confidence: 'primary-verified',
    registerSection: '§4.5',
    kind: 'config',
    effective: '2026-03-20',
    value: { lower: 0.0125, upper: 0.0325 },
  },
  '2026-09-20': {
    source: 'AGA deeming rate recommendation September 2026 · AGA letter to the Minister 31 Jul 2026',
    retrieved: '2026-09-03',
    confidence: 'primary-verified',
    registerSection: '§4.5',
    kind: 'config',
    effective: '2026-09-20',
    value: { lower: 0.0175, upper: 0.0375 },
    note: 'Determined, not merely recommended. The last determination in existence as at 2026-09-03 — see SETTINGS_NOT_ASSUMPTIONS for everything after it.',
  },
};

const DEEMING_DATES = Object.keys(DEEMING_DETERMINATIONS).sort() as readonly IsoDate[];

/** The determined rates in force, or `undefined` past the last determination — never extrapolated. */
export const deemingRatesAt = (date: IsoDate): DeemingRatesSetting | undefined => {
  const last = DEEMING_DATES.at(-1);
  if (last === undefined || date > last) return undefined;
  return DEEMING_DETERMINATIONS[latestOnOrBefore(DEEMING_DATES, date)]?.value;
};

/** The window the register lists in full: 20 Mar 2026 → 19 Mar 2027. Three periods. */
export const AGE_PENSION_PERIODS = agePensionPeriods('2026-03-20', '2027-03-19');

/** The last day anybody has published Age Pension parameters for. Past it, see the standing table. */
export const LAST_PUBLISHED_PARAMETER_DAY: IsoDate = AGE_PENSION_PERIODS.at(-1)?.to ?? '2026-03-20';

/**
 * **THE MAXIMUM BASIC RATE AT EVERY INDEXATION DATE FROM 20 SEP 2015 TO 20 MAR 2024 — the evidence
 * `STANDING_PARAMETERS_DIRECTION` rests on, as data rather than as a sentence (2026-09-21).**
 *
 * The direction argument is load-bearing: it is the whole reason this build answers 2045 from the
 * 20 September 2026 rate set instead of emitting no Age Pension line at all, and half of it is an
 * EMPIRICAL claim — that a legislated pension rate has never fallen in nominal terms. That claim
 * is checkable only against a rate history, and until this record there was none: this file held
 * two consecutive published sets, which can evidence one movement.
 *
 * **Seventeen movements, sixteen rises and ONE FLAT.** ⚠️ The flat one is the most important row
 * in this record and it is the reason the claim is worded *never fallen* rather than *always
 * risen*: at **20 September 2020** the rate did not move at all — $860.60 before and after — the
 * first time in decades, because the CPI had gone backwards and SSA 1991's indexation floors the
 * factor at 1 rather than applying it. **A falling index produced a flat rate, not a cut**, which
 * is the legal limb of the argument showing up in the data.
 *
 * **NOT a rate table and never read as one.** Nothing computes with this. `maximumPaymentRate`
 * goes on using `PAYMENT_RATES`, and the standing table carries the 20 September 2026 set and not
 * anything here. It exists so the claim above can be CHECKED rather than believed, and
 * `test/assumptions-age-pension.test.mjs` asserts it is non-decreasing — so a future editor cannot
 * quietly add a fall and leave the argument standing above it.
 *
 * **Confidence, stated rather than dressed up.** These are the **DVA service pension** maximum
 * basic rates, which are the same pension maximum basic rate the Age Pension pays — the two
 * calendars, components and figures coincide, and CLIK files the Age Pension's own income and
 * assets limits in the same tables. Read AS AN AGE PENSION series it is nonetheless one remove
 * from the DSS publication this register's other §4.2 rows quote, so it is `secondary-only`.
 *
 * **Two cross-checks show the right table and the right column were read.** Each page carries an
 * *old rate* beside its *new rate*, and every page's old rate reproduces the previous page's new
 * rate — the chain closes through all seventeen movements. And the Energy Supplement row of the
 * same tables reads **$14.10 / $10.60** at every one of those dates, which reproduces
 * `ENERGY_SUPPLEMENT` in this file to the cent, and reproduces T23's *never indexed* as well.
 */
export const PENSION_RATE_HISTORY = {
  source:
    'DVA CLIK Compensation and Support Reference Library — "Income support payment rates" at each indexation date (clik.dva.gov.au/compensation-and-support-reference-library/payment-rates/current-payment-rates/<date>/income-support-payment-rates-<date>), service pension non-transitional, single, maximum basic rate',
  retrieved: '2026-09-21',
  confidence: 'secondary-only',
  registerSection: '§4.2',
  kind: 'constant',
  everyYear: true,
  value: Object.freeze({
    '2015-09-20': toCents(788.4),
    '2016-03-20': toCents(794.8),
    '2016-09-20': toCents(797.9),
    '2017-03-20': toCents(808.3),
    '2017-09-20': toCents(814.0),
    '2018-03-20': toCents(826.2),
    '2018-09-20': toCents(834.4),
    '2019-03-20': toCents(843.6),
    '2019-09-20': toCents(850.4),
    '2020-03-20': toCents(860.6),
    // ⚠️ The COVID year: the CPI fell, the indexation factor floored at 1, and the rate STOOD.
    '2020-09-20': toCents(860.6),
    '2021-03-20': toCents(868.3),
    '2021-09-20': toCents(882.2),
    '2022-03-20': toCents(900.8),
    '2022-09-20': toCents(936.8),
    '2023-03-20': toCents(971.5),
    '2023-09-20': toCents(1_002.5),
    '2024-03-20': toCents(1_020.6),
  }),
  note: 'Per fortnight, single, maximum basic rate only — no Pension Supplement and no Energy Supplement, so these are not payable amounts. HISTORICAL EVIDENCE for the direction claim, not a rate table: nothing in `src/` computes with it, and the standing table carries the 20 Sep 2026 published set. Seventeen movements: sixteen rises and one stand-still (20 Sep 2020), and no fall.',
} satisfies Constant<Readonly<Record<string, Cents>>>;

/**
 * **WHY CARRYING THE LAST PUBLISHED PARAMETERS FORWARD CANNOT FLATTER THE HOUSEHOLD — the argument
 * this build answers 2045 on, written down (user ruling 2026-09-21: "as with other items, assume
 * current numbers continue whilst awaiting future pertinent legislation").**
 *
 * It is the same shape as `tax.ts`'s `STANDING_TABLE_DIRECTION` and it runs the OPPOSITE way,
 * which is the whole reason it needs stating: a standing tax table over-states tax, and a standing
 * pension table UNDER-states the pension. Both leave the household with less money than the law
 * would, and that is the only direction an unsourced projection may be wrong in.
 *
 * **Limb 1 — a frozen nominal RATE can only under-state the entitlement.** Two independent
 * reasons, one legal and one empirical:
 *
 *   * *legal*: the payment rates index by the greater of the CPI and PBLCI movements and are then
 *     floored at 41.76% of annualised MTAWE. The CPI factor's base is **the highest** June or
 *     December quarter index number before the reference quarter (§4.7, recorded above at
 *     `cpiReferenceQuarter`), so the factor cannot be less than 1, and the MTAWE step is a floor —
 *     `indexPensionRates` takes `Math.max` of the two. **Nothing in the mechanism can produce a
 *     lower rate than the one it started from.**
 *   * *empirical*: `PENSION_RATE_HISTORY` holds seventeen consecutive published movements, 20 Sep
 *     2015 to 20 Mar 2024. Sixteen rose. One — 20 Sep 2020, when the CPI had gone backwards —
 *     stood exactly still. **None fell.**
 *
 * So the legislated rate at any future date is at least the rate carried forward, and the standing
 * table pays at most what the law would.
 *
 * **Limb 2 — frozen means-test THRESHOLDS point the same way, and this limb needs the household to
 * be read, not just the law.** The income free area, the assets free areas and the deeming
 * thresholds index on 1 July by CPI (§4.7) and so only ever rise. Freezing them holds a cut-off
 * BELOW where the law would put it, while the household's own assets and deemed income inflate
 * against it, so more is assessed, so the entitlement is lower. Both tests run that way and so
 * does deeming: a frozen deeming threshold puts more of the financial pool at the UPPER rate and
 * raises assessed income. **T24 names this as the model's structural fact** — the payment tracks
 * wages while the tests track prices — and a frozen table exaggerates it rather than reversing it.
 *
 * **Both limbs fail in the conservative direction, so the total cannot flatter.** The entitlement
 * under a standing table is the maximum rate (frozen, therefore ≤ the legislated rate) less a
 * taper applied to an excess measured against a frozen free area (therefore ≥ the legislated
 * excess). Lower ceiling, larger reduction: a standing Age Pension is at most the legislated one.
 *
 * ⚠️ **WHERE IT DOES NOT HOLD, stated rather than buried.** Three things:
 *
 *   1. **Amendment.** Like the tax table, this is the law as read, and Parliament can cut a
 *      payment rate outright — indexation cannot, an Act can. That risk is unbounded in both
 *      directions and no history can close it. It is what the refresh cadence (§4.10) is for.
 *   2. **The magnitude is large, not marginal.** Forty years of a nominal freeze is not a rounding
 *      error: the real value of the carried rate decays to a fraction of itself, so a household
 *      that would in law be on a part pension at eighty may be shown with almost none. This
 *      under-states, which is the safe direction, but a reader must not take the late-horizon
 *      figures for a forecast of the pension. **Stating a `Settings.economicSeries.agePension` is
 *      what turns them into one**, and it still wins wherever it is supplied.
 *   3. **The deeming RATES are not part of this argument at all.** They are a discretionary
 *      Ministerial determination with no formula (T30, register O2), they are not carried forward
 *      by anything here, and past 20 September 2026 they come from a Setting exactly as before.
 *
 * ⚠️ **THIS SUPERSEDES THE POSITION THE REGISTER TOOK AT §4.7.1**, which said that carrying the
 * last determined rates forward across a forty-eight year horizon *"understates the payment by the
 * whole of wage growth while wearing an assumption's provenance"*. The first half is still exactly
 * right and is limb 1 above. **The second half is what the ruling changes**: a carried figure says
 * so, because `AgePensionPeriod.standingFrom` marks every one of them and nothing may read a
 * carried set without being able to see that it was carried — so it wears its own provenance and
 * not an assumption's. The refusal that sentence guards is untouched either way: a caller who
 * STATES a series and lets it run short still gets `MissingPensionIndexationError`, because a
 * stated series that stops is a claim with a hole in it, and that is a different thing from
 * claiming nothing.
 *
 * ⚠️ **AND FROM 2026-09-23 NO WALK CARRIES A TABLE FORWARD.** The user has since ruled that a plan
 * stating no series is indexed on its own `cpi`, `pblci` and `mtawe` (`defaultAgePensionSeries`),
 * so `project()` always passes a series and never reaches `standingAgePensionPeriod`. The argument
 * above still governs what that function returns to a direct caller who passes none.
 */
export const STANDING_PARAMETERS_DIRECTION =
  'THESE FIGURES ARE A STANDING TABLE CARRIED FORWARD, NOT LEGISLATED ONES: the Age Pension ' +
  `parameters in force on ${LAST_PUBLISHED_PARAMETER_DAY} applied unchanged to a later date, ` +
  'because nobody has published a rate for it and no forward series was given to this call — a ' +
  'projection never does this, since a plan stating no series is indexed on its own growth rates. ' +
  'THE DIRECTION IS THE CONSERVATIVE ONE, on two limbs that ' +
  'both run the same way: a frozen rate can only be at or below the legislated rate (the ' +
  'indexation factor is floored at 1 by its own base rule and again by the MTAWE benchmark, and ' +
  'no published movement has ever been a fall — sixteen rises and one stand-still in ' +
  '`agePension.rateHistory`), and frozen means-test thresholds sit below where the law would put ' +
  'them, so more is assessed. So this Household is shown AT MOST the pension it would be paid in ' +
  'law, and its money runs out no later here than it would in law. What this does NOT survive is ' +
  'an amendment, and over forty years the real value of a frozen nominal rate decays a long way — ' +
  'pass a forward series (stated, or defaultAgePensionSeries) to index them instead.';

/**
 * **THE STANDING TABLE: the last published parameters, applied to a later date.**
 *
 * Forty-eight years of a walk run past 19 March 2027, and every one of those months carried **no
 * Age Pension line at all** for a plan with no `economicSeries.agePension`. That was the defect this
 * closed, on the user's ruling of 2026-09-21. ⚠️ **Since 2026-09-23 `project()` does not reach it**:
 * a plan with no series is walked on `defaultAgePensionSeries` instead, so this answers only a
 * direct caller of `agePensionPeriodAt` who passes no series.
 *
 * ✅ **AND IT IS CONNECTED TO THE WALK FROM 2026-09-21. `agePensionPeriodAt` calls this.** It was
 * built on 2026-09-20 with the switch deliberately off, because wiring it made `project()` **throw**
 * on the demo couple when it settled **FY2030-31**: Ash is entitled, so Ash is *qualified* under
 * s 160AAAA(2)(b) and receives SAPTO; Dana, born 1968, is not; the couple therefore held two
 * different Medicare family income thresholds ($47,238 against $61,623) against a family income of
 * $66,166.70 — under 1.25 × the larger — and `MixedSaptoFamilyThresholdError` refused, because the
 * Act was read as not saying which threshold governed (research U2, register O30). **Seventy-two of
 * the eighty-four failures on that build were that one refusal.** O30 CLOSED on 2026-09-21: the
 * levy's low-income reduction is assessed **per taxpayer**, each spouse on their own family income
 * threshold, so the couple is no longer refused and the refusal is deleted. The switch is thrown.
 *
 * What exercises it is `test/assumptions-age-pension.test.mjs` on this function directly, and the
 * walk itself in `test/core-projection-age-pension.test.mjs`, where the first month past the
 * published window carries a line, a `standing parameters` note and a provenance caveat naming the
 * day the figures were determined for.
 *
 * **What is carried and what is not.** The rate set and the means-test set in force on the last
 * published day, verbatim, with their own `ratesEffective` and `meansTestEffective` keys unchanged
 * — so the provenance of a standing month names the very records it used, and a reader can see
 * that they are 20 September 2026's. **The deeming rates are NOT carried**: `deemingRatesAt` is
 * asked for the date itself and answers `undefined` past the last determination, exactly as it did
 * before, so they still come from the Setting (T30, register O2). Nothing about this rule touches
 * that one.
 *
 * **It is deliberately unbounded**, for the reason `tax.ts`'s standing table is: how far a
 * projection runs is the Planning Horizon's business, and a cut-off invented here would be a
 * boundary no source supports. The `to` of a standing period is the date asked for, because a
 * carried set has no next boundary to end at — nothing further is published to end it.
 *
 * Memoised per date, so that a date asked for twice is the same frozen object: the walk asks about
 * six hundred times and object identity matters to the provenance consolidation.
 */
const STANDING_PERIODS = new Map<IsoDate, AgePensionPeriod>();

export const standingAgePensionPeriod = (date: IsoDate): AgePensionPeriod => {
  const held = STANDING_PERIODS.get(date);
  if (held !== undefined) return held;
  const last = AGE_PENSION_PERIODS.at(-1);
  if (last === undefined) throw new RangeError('no published Age Pension parameters to carry forward');
  const period: AgePensionPeriod = Object.freeze({
    from: dayAfter(LAST_PUBLISHED_PARAMETER_DAY),
    to: date,
    ratesEffective: last.ratesEffective,
    meansTestEffective: last.meansTestEffective,
    rates: last.rates,
    meansTest: last.meansTest,
    deemingRates: deemingRatesAt(date),
    standingFrom: LAST_PUBLISHED_PARAMETER_DAY,
  });
  STANDING_PERIODS.set(date, period);
  return period;
};

/**
 * The parameter period covering `date`.
 *
 * With no `series` this is the register's published window and nothing else — 20 Mar 2026 to 19 Mar
 * 2027 — and one day past it this refuses, because the rates for that day have not been determined
 * and this project does not extrapolate a determined figure. With a `series` the window is extended
 * by running §4.7's mechanism forward over the caller's own stated CPI, PBLCI and MTAWE
 * observations (register O5); a date the series does not reach raises
 * `MissingPensionIndexationError` rather than reusing the last set it does reach.
 *
 * ✅ **AND WITH NO SERIES PAST THE PUBLISHED WINDOW, THE STANDING TABLE ANSWERS (P4-1e,
 * 2026-09-21).** The branch is `series === undefined && date > LAST_PUBLISHED_PARAMETER_DAY`, and it
 * returns `standingAgePensionPeriod(date)` — the last published sets, carried verbatim and marked
 * `standingFrom`, which is the only thing that distinguishes a carried month from the month it was
 * carried from. It waited on **register O30** until that item closed on the primary law; see that
 * function's own doc for what the wait was about.
 *
 * **A STATED SERIES STILL WINS, and the order of the two lines is what says so.** The standing
 * branch is reached only where no series was supplied, so a caller who states one gets §4.7's
 * mechanism and, where the series runs short, `MissingPensionIndexationError` — never a carried set
 * quietly substituted for the observation they did not give.
 */
export const agePensionPeriodAt = (
  date: IsoDate,
  series?: AgePensionIndexationSeries,
): AgePensionPeriod => {
  if (series === undefined && date > LAST_PUBLISHED_PARAMETER_DAY) return standingAgePensionPeriod(date);
  const periods = series === undefined ? AGE_PENSION_PERIODS : agePensionPeriodsThrough(series, date);
  const period = periods.find((candidate) => candidate.from <= date && date <= candidate.to);
  if (period === undefined) throw new RangeError(`no Age Pension parameter period covers ${date}`);
  return period;
};

// --- Derived figures (T25, T26) -----------------------------------------------------------------

const INCOME_TAPER = 0.5;
const ASSETS_TAPER_PER_THOUSAND = 3.0;
const ASSETS_CUT_OFF_ROUNDING = toCents(250);

/**
 * The Maximum Payment Rate: basic rate + Pension Supplement (maximum) + Energy Supplement, plus
 * Rent Assistance where any is payable. HEAS derives its caps from this rather than duplicating
 * the dollar figures (register §5.3), which is why it takes the period rather than a number.
 */
export const maximumPaymentRate = (
  period: AgePensionPeriod,
  status: RateStatus,
  rentAssistance: Cents = toCents(0),
): Cents =>
  (period.rates.maximumBasicRate[status] +
    period.rates.pensionSupplementMaximum[status] +
    ENERGY_SUPPLEMENT.value[status] +
    rentAssistance) as Cents;

/** T26: one indexed constant drives both thresholds. There is no second series to drift. */
export const nonHomeownerAssetsFreeArea = (homeownerFreeArea: Cents, extraAllowableAmount: Cents): Cents =>
  (homeownerFreeArea + extraAllowableAmount) as Cents;

/**
 * T25: `free_area + total_rate ÷ taper`, per fortnight. `personsAtThatRate` is 2 for an illness
 * separated couple, who are paid at the single rate against the couple free area.
 */
export const incomeTestCutOff = (freeArea: Cents, totalRate: Cents, personsAtThatRate = 1): Cents =>
  toCents((freeArea + (totalRate / INCOME_TAPER) * personsAtThatRate) / 100);

/**
 * T25: `free_area + round_up_to_250(total_rate ÷ 3.00 × 1,000)`. The round-up happens on the
 * per-Person excess before it is doubled — that is what reproduces the published illness
 * separated figures ($1,324,500, not $1,324,250).
 */
export const assetsTestCutOff = (freeArea: Cents, totalRate: Cents, personsAtThatRate = 1): Cents => {
  const excess = (totalRate / ASSETS_TAPER_PER_THOUSAND) * 1_000;
  const rounded = Math.ceil(excess / ASSETS_CUT_OFF_ROUNDING) * ASSETS_CUT_OFF_ROUNDING;
  return toCents((freeArea + rounded * personsAtThatRate) / 100);
};

// --- The indexation mechanism, which is what a 40-year projection needs (T23, T24) ---------------

export interface PensionIndexationMovements {
  /** Movement in the All Groups CPI over the reference period, as a factor — 1.012 for 1.2%. */
  readonly cpi: number;
  /** Movement in the Pensioner and Beneficiary Living Cost Index, as a factor. */
  readonly pblci: number;
  /** 52 × the ABS MTAWE weekly amount for the reference quarter, in cents. */
  readonly annualisedMtawe: Cents;
}

/**
 * SSA 1991 ss 1195, 1197, run at each 20 March and 20 September in this order:
 *
 *   combined couple basic × the **higher** of the CPI and PBLCI movements, then floored at
 *   41.76% of annualised MTAWE; the single basic rate is 66.33% of the combined couple rate;
 *   the Pension Supplement moves by CPI only and is never benchmarked; the Energy Supplement
 *   does not move at all.
 *
 * Free areas and deeming thresholds are **not** touched here — they index on 1 July, by CPI, and
 * that is the mechanism behind T24: the payment tracks wages while the means tests track prices,
 * so the tests bite harder in real terms every year, indefinitely.
 *
 * The 0.6633 ratio reproduces the published rates to within about 14 cents a fortnight rather
 * than exactly (1,135.40 ÷ 1,711.80 = 0.66327), because SSA s 1197's own rounding steps were not
 * retrieved (register O10). Rates are stored as published; this is the projection mechanism.
 */
export const indexPensionRates = (
  previous: PaymentRateSet,
  movements: PensionIndexationMovements,
): PaymentRateSet => {
  const indexed = previous.maximumBasicRate.coupleCombined * Math.max(movements.cpi, movements.pblci);
  const benchmark = (MTAWE_BENCHMARK * movements.annualisedMtawe) / 26;
  const coupleCombined = Math.max(indexed, benchmark);
  const single = coupleCombined * SINGLE_TO_COUPLE_RATIO;

  const byCpi = (rates: ByStatus<Cents>): ByStatus<Cents> =>
    Object.freeze({
      single: toCents((rates.single * movements.cpi) / 100),
      coupleEach: toCents((rates.coupleEach * movements.cpi) / 100),
      coupleCombined: toCents((rates.coupleCombined * movements.cpi) / 100),
    });

  return Object.freeze({
    maximumBasicRate: Object.freeze({
      single: toCents(single / 100),
      coupleEach: toCents(coupleCombined / 2 / 100),
      coupleCombined: toCents(coupleCombined / 100),
    }),
    pensionSupplementMaximum: byCpi(previous.pensionSupplementMaximum),
    pensionSupplementBasic: byCpi(previous.pensionSupplementBasic),
    pensionSupplementMinimum: byCpi(previous.pensionSupplementMinimum),
  });
};

const MTAWE_BENCHMARK = 0.4176;
const SINGLE_TO_COUPLE_RATIO = 0.6633;

/**
 * **The one MTAWE LEVEL this register holds — the anchor the default forward series grows from
 * (register O14, closed 2026-09-23).**
 *
 * The 41.76% benchmark is a percentage of a dollar amount, so a forward series needs an amount and
 * not only a rate. This is the ABS figure itself, retrieved — never backed out of a published
 * pension rate, which would assert that the benchmark bound. It did NOT bind on 20 Sep 2026:
 * 0.4176 × 52 × this ÷ 26 is about 89% of the $1,711.80 combined couple basic rate, so that rise
 * came from the CPI/PBLCI limb (register O14).
 *
 * Stamped with the reference QUARTER it serves (`mtaweReferenceQuarter('2026-09-20')`), not the
 * survey month: the ABS surveys in May and November, and May is the June-quarter observation.
 */
const MTAWE_JUNE_QUARTER_2026 = {
  source:
    'ABS Average Weekly Earnings, Australia, May 2026 (released 13 Aug 2026) — Males, All employees average weekly total earnings, original — https://www.abs.gov.au/statistics/labour/earnings-and-working-conditions/average-weekly-earnings-australia/latest-release',
  retrieved: '2026-09-23',
  confidence: 'primary-verified',
  registerSection: '§4.7 / O14',
  kind: 'constant',
  effective: '2026-06-30',
  value: toCents(1_832.8),
  note: 'Weekly, not annualised: the mechanism takes 52 × this. The May 2026 survey, which is the June-quarter observation §4.7 names for the 20 September 2026 indexation. Every later level is this one grown at Settings.economicSeries.mtawe and is a forecast (register O5).',
} satisfies Money;

export const AGE_PENSION = deepFreeze({
  paymentRates: PAYMENT_RATES,
  rateHistory: PENSION_RATE_HISTORY,
  transitionalMaximumRate: TRANSITIONAL_MAXIMUM_RATE,
  transitionalMaximumRate20Sep2026: TRANSITIONAL_MAXIMUM_RATE_20_SEP_2026,
  energySupplement: ENERGY_SUPPLEMENT,
  rentAssistanceHomeowner: RENT_ASSISTANCE_HOMEOWNER,
  meansTest: MEANS_TEST,
  deemingDeterminations: DEEMING_DETERMINATIONS,

  maximumPaymentRate: {
    ...DSS_20_MAR_2026,
    kind: 'config-derived',
    effective: '2026-03-20',
    value: maximumPaymentRate,
    registerSection: '§4.2 / §5.3',
    derivation: 'maximum basic rate + Pension Supplement (maximum) + Energy Supplement + Rent Assistance',
    note: 'T23 — three separately indexed components plus one that never indexes. Holding the total as a single figure and indexing it at CPI understates the payment; indexing it at wage growth overstates it.',
  },

  incomeTest: {
    taper: {
      ...DSS_1_JUL_2026,
      kind: 'constant',
      everyYear: true,
      value: INCOME_TAPER,
      registerSection: '§4.3',
      note: '50c per $1 over the free area, applied to COMBINED couple income producing a COMBINED reduction. The 25c each that Services Australia publishes is a presentation step, not a per-Person test.',
    } satisfies Rate,
    cutOff: {
      ...DSS_1_JUL_2026,
      kind: 'config-derived',
      effective: '2026-07-01',
      value: incomeTestCutOff,
      registerSection: '§4.3',
      derivation: 'free area + total rate ÷ 0.50, per fortnight; × 2 on the single rate for an illness separated couple',
      note: 'T25 — moves on all three indexation dates. The published cut-offs are fixtures, never stored values.',
    },
  },

  assetsTest: {
    taper: {
      ...SERVICES_AUSTRALIA,
      kind: 'constant',
      everyYear: true,
      value: ASSETS_TAPER_PER_THOUSAND,
      note: '$3.00 per fortnight per $1,000 above the free area. Primary-verified by exact derivation from two published figures; no verbatim primary quotation was obtained (register O9). Applied in a $250-per-Person step, not continuously — SSA 1991 s1064 point 1064-G7 (P13-4) — so a couple\'s COMBINED excess floors to the nearest $500 (each half floors to $250) and a single Person\'s floors to the nearest $250; see `runAssetsTest`.',
    } satisfies Rate,
    cutOff: {
      ...SERVICES_AUSTRALIA,
      kind: 'config-derived',
      effective: '2026-07-01',
      value: assetsTestCutOff,
      derivation: 'free area + round_up_to_$250(total rate ÷ $3.00 × $1,000); the round-up applies to the per-Person excess before doubling',
      note: 'T25.',
    },
    nonHomeownerFreeArea: {
      ...DSS_1_JUL_2026,
      kind: 'config-derived',
      effective: '2026-07-01',
      value: nonHomeownerAssetsFreeArea,
      registerSection: '§4.4',
      derivation: 'homeowner assets free area + the extra allowable amount',
      note: 'T26 — one constant plus an offset. Two independent series would drift apart. concept.md\'s "~$250k" was stale by $17,000.',
    },
    principalHomeExemption: {
      ...SERVICES_AUSTRALIA,
      kind: 'constant',
      everyYear: true,
      value: 'the home and up to the first 2 hectares of adjacent land on the same title',
    } satisfies Constant<string>,
    homeownerWithAMortgage: {
      ...SERVICES_AUSTRALIA,
      kind: 'constant',
      everyYear: true,
      value: 'owner-occupied with a mortgage is a homeowner; the mortgage is netted only against the asset it secures, which is itself exempt',
      note: 'The asymmetry is correct and load-bearing: mortgage debt is not deductible from other assets.',
    } satisfies Constant<string>,
    homeownerTest: {
      ...SERVICES_AUSTRALIA,
      kind: 'constant',
      everyYear: true,
      value: 'a right or interest in the occupied home giving reasonable security of tenure',
      confidence: 'primary-via-archive',
      note: 'Primary-verified in substance; the exact "security of tenure" test is in Social Security Guide 4.6.3, which is 403-blocked (register O12). Not load-bearing — this Household is unambiguously a homeowner.',
    } satisfies Constant<string>,
    careVacatedHomeExemptionMonths: {
      ...DSS_GUIDE_CARE_SITUATIONS,
      kind: 'constant',
      everyYear: true,
      value: 24,
      note:
        'P14-5a — SSA 1991 s 11A(9)(b): once a person is "in a care situation or residential care", the home stays exempt for "the period of 2 years beginning when the person started to be in a care situation" (flat, irrespective of an intention to return); "if, after 2 years, an income support recipient has not returned to their principal home the: income support recipient is treated as a non-homeowner, AND principal home is an assessable asset." This is the CARE-SITUATION period only (s 11A(9)(b)/(f)) — a general temporary absence is 12 months (s 11A(9)(a), `research/p6-5-home-absence.md`), not this figure, and v1 still does not model that case (VACATE_HOME, P3-15).',
    } satisfies Constant<number>,
    saleProceedsExemptionMonths: {
      ...DSS_GUIDE_SALE_PROCEEDS,
      kind: 'constant',
      everyYear: true,
      value: 24,
      note:
        'P14-13c — SSAct s 1118(1B)/(2): "the portion of the [sale] proceeds intended to be used for the new principal home can be exempt from the assets test for up to 24 months" from settlement, for homes sold on or after 1 January 2023 (every sale this forecaster can state falls under that date). "The person continues to be assessed as a homeowner during the exemption period." The Guide also carries a discretionary EXTENSION of up to a further 12 months (s 1118(2B), maximum 36 months total) on "reasonable attempts" / "delays beyond their control" criteria requiring documentary evidence — NOT modelled: this figure is the flat 24-month window only, and `projection.ts` reverts the household to `noHome` at it unconditionally. Homes sold before 1 January 2023 had a 12-month window (extendable to 24) — moot for this forecaster, which only ever states present-or-future sale dates.',
    } satisfies Constant<number>,
    entitlementIsTheLesser: {
      ...SERVICES_AUSTRALIA,
      kind: 'constant',
      everyYear: true,
      value: 'the lesser of the income-test and assets-test results, computed on COMBINED Household means then halved',
      note: 'Per-Person calculation is the classic couple bug. Entitlement is an output, never an assumption (ADR-0003).',
    } satisfies Constant<string>,
  },

  indexation: {
    mechanism: {
      ...SSA_INDEXATION,
      kind: 'config-derived',
      effective: '2026-03-20',
      value: indexPensionRates,
      derivation:
        '20 Mar and 20 Sep, in order: combined couple basic × max(CPI movement, PBLCI movement); floor at 41.76% of annualised MTAWE; single = 0.6633 × combined couple; Pension Supplement × CPI only; Energy Supplement unchanged. Separately, on 1 July: free areas, assets free areas and deeming thresholds × CPI.',
      note: 'T23, T24. The forward CPI, PBLCI and MTAWE series are Settings (register O5) — nothing here may hard-code them.',
    },
    mtaweBenchmark: {
      ...SSA_INDEXATION,
      kind: 'constant',
      everyYear: true,
      value: MTAWE_BENCHMARK,
      note: '41.76% of annualised MTAWE for the combined couple rate. The mechanism is primary-verified from DVA; SSA 1991 s 1195 itself is secondary-only as retrieved (register O10).',
      confidence: 'secondary-only',
    } satisfies Rate,
    singleToCoupleRatio: {
      ...SSA_INDEXATION,
      kind: 'constant',
      everyYear: true,
      value: SINGLE_TO_COUPLE_RATIO,
      note: 'Published rates reconcile at 0.66327 (20 Sep 2026) and 0.66332 (20 Mar 2026), both rounding to 0.6633. The residual is SSA s 1197 rounding, not retrieved (register O10) — which is why the rates are stored as published rather than derived from this ratio.',
    } satisfies Rate,
    mtaweAnchor: MTAWE_JUNE_QUARTER_2026,
    mtaweReferenceQuarter: {
      ...SSA_INDEXATION,
      kind: 'constant',
      everyYear: true,
      value: 'December quarter for 20 March; June quarter for 20 September',
    } satisfies Constant<string>,
    cpiReferenceQuarter: {
      ...SSA_INDEXATION,
      kind: 'constant',
      everyYear: true,
      value: 'December (for 20 Mar) and June (for 20 Sep); the base is the highest June or December quarter before the reference quarter',
    } satisfies Constant<string>,
    publishedRoundingSteps: PUBLISHED_ROUNDING_STEPS,
    energySupplementIndexed: {
      ...SSA_INDEXATION,
      kind: 'constant',
      everyYear: true,
      value: false,
      registerSection: '§4.7',
      note: 'T23 — never. It is not part of `PaymentRateSet` for exactly this reason.',
    } satisfies Constant<boolean>,
  },

  workBonus: {
    startingBalance: { ...WORK_BONUS, kind: 'config', effective: '2026-07-21', value: toCents(4_000) } satisfies Money,
    fortnightlyAccrual: { ...WORK_BONUS, kind: 'config', effective: '2026-07-21', value: toCents(300) } satisfies Money,
    maximumBalance: { ...WORK_BONUS, kind: 'config', effective: '2026-07-21', value: toCents(11_800) } satisfies Money,
    poolable: {
      ...WORK_BONUS,
      kind: 'constant',
      everyYear: true,
      value: false,
      note: 'T29 — per Person, never poolable across the Household. The benefit reaches the Household only through the combined income test.',
    } satisfies Constant<boolean>,
    eligibleIncome: {
      ...WORK_BONUS,
      kind: 'constant',
      everyYear: true,
      value: 'employment and self-employment income earned from active participation',
      note: 'T29 — investment income is assessed under deeming and is outside the definition entirely.',
    } satisfies Constant<string>,
    orderOfApplication: {
      ...WORK_BONUS,
      kind: 'constant',
      everyYear: true,
      value: 'applied to eligible income BEFORE the income test',
    } satisfies Constant<string>,
    accruesWithoutWork: { ...WORK_BONUS, kind: 'constant', everyYear: true, value: true } satisfies Constant<boolean>,
    availableOnTheTransitionalRate: {
      ...WORK_BONUS,
      kind: 'constant',
      everyYear: true,
      value: false,
    } satisfies Constant<boolean>,
  },

  treatment: {
    accountBasedPensionAssetsTest: {
      source: 'Services Australia — income streams',
      retrieved: '2026-09-03',
      confidence: 'primary-verified',
      registerSection: '§4.8',
      kind: 'constant',
      everyYear: true,
      value: 'assessed at the account balance',
    } satisfies Constant<string>,
    accountBasedPensionIncomeTest: {
      source: 'Services Australia — income streams',
      retrieved: '2026-09-03',
      confidence: 'primary-verified',
      registerSection: '§4.8',
      kind: 'constant',
      everyYear: true,
      value: 'assessed as a financial asset under the deeming rules',
    } satisfies Constant<string>,
    accountBasedPensionGrandfathering: {
      source: 'Services Australia — income streams',
      retrieved: '2026-09-03',
      confidence: 'primary-verified',
      registerSection: '§4.8',
      kind: 'constant',
      everyYear: true,
      value: false,
      note: 'T28 — needs BOTH limbs: commenced before 1 Jan 2015 and continuously on a pension or allowance since 31 Dec 2014. Structurally unreachable for this Household, so it is hard-coded false. Exposing it as a Setting invites a silent, undetectable overstatement of Age Pension.',
    } satisfies Constant<boolean>,
    youngerPartnerExemption: {
      source: 'Services Australia — superannuation',
      retrieved: '2026-09-03',
      confidence: 'primary-verified',
      registerSection: '§4.8',
      kind: 'constant',
      everyYear: true,
      value: 'super in Accumulation Phase held by a Person under Age Pension age is exempt from both tests, including when assessing the older partner claim',
    } satisfies Constant<string>,
    youngerPartnerExemptionEnds: {
      source: 'Services Australia — superannuation',
      retrieved: '2026-09-03',
      confidence: 'primary-verified',
      registerSection: '§4.8',
      kind: 'constant',
      everyYear: true,
      value: 'the earlier of the younger Person reaching 67, or the fund starting to pay ANY income stream — including a TTR',
      note: 'T27 — starting a TTR for the younger Person before the older Person claims destroys the exemption early, at any age.',
    } satisfies Constant<string>,
    oneMemberOfAgeUsesCoupleThresholds: {
      source: 'DSS rates list · Services Australia',
      retrieved: '2026-09-03',
      confidence: 'primary-verified',
      registerSection: '§4.8',
      kind: 'constant',
      everyYear: true,
      value: true,
      note: 'Means assessed on combined Household income and assets at the couple thresholds, on the explicit "Couple (combined), including where only one partner is eligible" row.',
    } satisfies Constant<boolean>,
    pensionerConcessionCard: {
      source: 'CONTEXT.md · SS Guide 3.4.5.60 (Wayback Machine)',
      retrieved: '2026-09-03',
      confidence: 'primary-via-archive',
      registerSection: '§4.8',
      kind: 'constant',
      everyYear: true,
      value: 'comes with any Age Pension entitlement, however small — but NOT via HEAS at $0 entitlement',
      note: 'T32 — the card goal and the HEAS lever are independent.',
    } satisfies Constant<string>,
  },

  qualification: {
    qualifyingAge: {
      source: 'Services Australia — who can get Age Pension ("There are no plans to change this.")',
      retrieved: '2026-09-03',
      confidence: 'primary-verified',
      registerSection: '§4.9',
      kind: 'config',
      fy: '2026-27',
      value: 67,
      note: 'The staged increase completed 1 Jul 2023 and no further increase is legislated. A policy risk, not an indexed parameter (register O3).',
    } satisfies Assumption<number>,
    minimumAustralianResidenceYears: {
      source: 'Services Australia — residence rules for Age Pension',
      retrieved: '2026-09-03',
      confidence: 'primary-verified',
      registerSection: '§4.9',
      kind: 'config',
      fy: '2026-27',
      value: 10,
    } satisfies Assumption<number>,
    unbrokenResidenceYears: {
      source: 'Services Australia — residence rules for Age Pension',
      retrieved: '2026-09-03',
      confidence: 'primary-verified',
      registerSection: '§4.9',
      kind: 'config',
      fy: '2026-27',
      value: 5,
    } satisfies Assumption<number>,
    residentOnTheDayOfClaim: {
      source: 'Services Australia — residence rules for Age Pension',
      retrieved: '2026-09-03',
      confidence: 'primary-verified',
      registerSection: '§4.9',
      kind: 'constant',
      everyYear: true,
      value: true,
    } satisfies Constant<boolean>,
  },

  // **P12-1 — when one of a couple dies (register §4.11).** Read by `core/bereavement.ts` and by
  // the walk's `DEATH` branch; nothing here computes a payment.
  bereavement: {
    lumpSumFormula: {
      ...SS_GUIDE_BEREAVEMENT,
      kind: 'constant',
      everyYear: true,
      value: { fortnights: 6, daysInEntitlementPeriod: 14 },
      note:
        'SS Guide 3.1.5.70, prompt notification (NEPED = 0): "LBP = (6 multiplied by (CCR minus NR)) plus (NDEP multiplied by (CCR minus NR) then divided by 14)". CCR is the combined couple rate that would have been payable but for the death; NR the survivor\'s new single rate; NDEP the days from the death to the end of the entitlement period, inclusive. The Guide never says "14 weeks": that reading is an inference from these constants.',
    } satisfies Constant<{ readonly fortnights: number; readonly daysInEntitlementPeriod: number }>,
    whoIsPaid: {
      ...SS_GUIDE_BEREAVEMENT,
      kind: 'constant',
      everyYear: true,
      value: 'the survivor, where the couple were both pensioners (or both long-term social security recipients, or the survivor one and the deceased a pensioner) and the survivor\'s single rate is LESS than the couple\'s combined rate',
      note: 'SS Guide 3.1.5.70 summary and 3.1.5.30 table: a single rate MORE than the couple received pays arrears from the death and no lump sum; a single rate of NIL still pays the lump sum. Only the Age Pension is modelled, so here it is both members being paid it.',
    } satisfies Constant<string>,
    singleRateFrom: {
      ...SS_GUIDE_BEREAVEMENT,
      kind: 'constant',
      everyYear: true,
      value: 'the day of the partner\'s death, where both were pensioners',
      note: 'SS Guide 3.1.5.30. The walk has months, so the survivor is assessed as single from the first day of the month the death is dated in.',
    } satisfies Constant<string>,
  },
});


// --- Forward indexation past the published window (P4-1c) ---------------------------------------
//
// The register publishes Age Pension parameters to 19 March 2027. A projection runs to age 100, so
// for a forty-eight year horizon the published window covers seven months and nothing else. The
// mechanism for the remaining five hundred and seventy-two is already stated in §4.7 and already
// written above as `indexPensionRates`; what was missing is a **series to run it over**, and the
// series is a Setting, not an assumption (register O5). Nothing below invents a number: every
// figure comes either from the register's published sets or from the caller's own observations.
//
// **What this deliberately will not do.** Carry the last determined rates forward. A nominal freeze
// over four decades understates the payment by roughly the whole of forty years of wage growth and
// arrives wearing an assumption's provenance, which is the failure this directory exists against.
// Where the series stops, the model stops. (From 2026-09-23 a plan that states no series is given
// one — `defaultAgePensionSeries`, below — built from its own growth rates and the ABS MTAWE anchor;
// a stated series that stops still stops the model.)

/**
 * **A scope refusal** — §3.5.1's and §3.11.9's fourth kind, and the same variety as
 * `MissingIndexNumberError`: the rule is retrieved and stated in full (§4.7, SSA 1991 ss 1195,
 * 1197) and the input is perfectly well formed (a date). What is missing is **a number that does
 * not exist yet**. It is not a rule of law — no provision forbids anything here — and it is not an
 * input-shape guard: a date in 2041 and a series that stops in 2035 describe one coherent request
 * and nothing is mis-shaped.
 *
 * **One refusal, two throw sites, one home** (R8): the sites guard the two indexation calendars,
 * not two different refusals, and §4.7's mechanism is one mechanism run on two dates.
 */
export class MissingPensionIndexationError extends RangeError {
  constructor(effective: string, indexes: string) {
    super(
      `the Age Pension series has no observation for ${effective}, so ${indexes} cannot be indexed ` +
        'to that date and no parameters exist from it onward. Register §4.7 states the mechanism ' +
        'and the forward CPI, PBLCI and MTAWE series is a Setting, not an assumption (O5, ' +
        "SETTINGS_NOT_ASSUMPTIONS['economic.agePensionIndexation']), so supplying it is the " +
        "caller's act. Carrying the last determined rates forward is a nominal freeze wearing an " +
        "assumption's provenance, and over a forty-year horizon it understates the payment by " +
        'the whole of wage growth. Refusing to compute.',
    );
    this.name = 'MissingPensionIndexationError';
  }
}

/**
 * §4.7: the December quarter for a 20 March indexation, the June quarter for a 20 September one.
 * **Derived from the indexation date and never supplied**, so a June figure cannot be filed against
 * a March date — the same discipline `decemberQuarterIndex` applies in `superCaps.ts`.
 */
export const mtaweReferenceQuarter = (effective: RateIndexationDate): IsoDate => {
  const year = Number(effective.slice(0, 4));
  return effective.endsWith('-03-20') ? (`${year - 1}-12-31` as IsoDate) : (`${year}-06-30` as IsoDate);
};


/**
 * Index the 1 July means-test parameters by CPI (§4.1, §4.7). Two movements, not one: the income
 * free area references the **March** quarter and the assets free areas the **December** quarter.
 *
 * **Rounded DOWN, to the cent, and that is a decision the register does not make.** The published
 * figures move in steps — $2 a fortnight for the income free area, $500 for the assets free areas,
 * $200 for the deeming thresholds — and §4.7 states no rounding rule for any of them, so the step
 * is not modelled. Those three step sizes are a record of their own from 2026-09-21
 * (`agePension.indexation.publishedRoundingSteps`, and it is stamped `unverified` — read its note
 * before relying on it); the sentence above is a reader's copy and not their only home.
 * Flooring is chosen because a free area that is too HIGH raises the entitlement:
 * the residual error here runs **against** the household, by at most one cent per parameter per
 * year, which is the direction an unsourced choice is required to run.
 */
export const indexMeansTestParameters = (
  previous: MeansTestParameterSet,
  movements: { readonly cpiMarchQuarter: number; readonly cpiDecemberQuarter: number },
): MeansTestParameterSet => {
  const down = (cents: Cents, factor: number): Cents => {
    if (!Number.isFinite(factor)) throw new RangeError(`not a finite CPI movement: ${factor}`);
    return toCents(Math.floor(cents * factor) / 100);
  };
  const march = movements.cpiMarchQuarter;
  const december = movements.cpiDecemberQuarter;
  const threshold = previous.deemingThreshold.memberOfCoupleNeitherOnPension;
  return Object.freeze({
    incomeFreeArea: Object.freeze({
      single: down(previous.incomeFreeArea.single, march),
      coupleCombined: down(previous.incomeFreeArea.coupleCombined, march),
    }),
    assetsFreeAreaHomeowner: Object.freeze({
      single: down(previous.assetsFreeAreaHomeowner.single, december),
      coupleCombined: down(previous.assetsFreeAreaHomeowner.coupleCombined, december),
    }),
    extraAllowableAmount: down(previous.extraAllowableAmount, december),
    deemingThreshold: Object.freeze({
      single: down(previous.deemingThreshold.single, december),
      coupleCombined: down(previous.deemingThreshold.coupleCombined, december),
      ...(threshold === undefined ? {} : { memberOfCoupleNeitherOnPension: down(threshold, december) }),
    }),
  });
};

/** Every 20 March / 20 September strictly after `after` and on or before `to`, in order. */
const rateDatesAfter = (after: RateIndexationDate, to: IsoDate): readonly RateIndexationDate[] => {
  const dates: RateIndexationDate[] = [];
  for (let year = Number(after.slice(0, 4)); year <= Number(to.slice(0, 4)); year += 1) {
    for (const date of [`${year}-03-20`, `${year}-09-20`] as readonly RateIndexationDate[]) {
      if (date > after && date <= to) dates.push(date);
    }
  }
  return dates;
};

/** Every 1 July strictly after `after` and on or before `to`, in order. */
const julyDatesAfter = (
  after: MeansTestIndexationDate,
  to: IsoDate,
): readonly MeansTestIndexationDate[] => {
  const dates: MeansTestIndexationDate[] = [];
  for (let year = Number(after.slice(0, 4)); year <= Number(to.slice(0, 4)); year += 1) {
    const date = `${year}-07-01` as MeansTestIndexationDate;
    if (date > after && date <= to) dates.push(date);
  }
  return dates;
};

const rateObservation = (
  series: AgePensionIndexationSeries,
  effective: RateIndexationDate,
): PensionRateIndexation => {
  const found = series.rateIndexations.find((each) => each.effective === effective);
  if (found === undefined) {
    throw new MissingPensionIndexationError(
      effective,
      'the maximum basic rate and the Pension Supplement',
    );
  }
  return found;
};

const meansTestObservation = (
  series: AgePensionIndexationSeries,
  effective: MeansTestIndexationDate,
): MeansTestIndexation => {
  const found = series.meansTestIndexations.find((each) => each.effective === effective);
  if (found === undefined) {
    throw new MissingPensionIndexationError(
      effective,
      'the income and assets free areas and the deeming thresholds',
    );
  }
  return found;
};

/**
 * The published tables, extended to `to` by running §4.7 forward over the caller's series.
 *
 * Each step indexes the set that the previous step produced, so the chain is cumulative — which is
 * what makes a missing observation a stop rather than a gap: there is no set to index from on the
 * far side of it.
 */
const indexForward = (series: AgePensionIndexationSeries, to: IsoDate): ParameterTables => {
  const rates: Record<string, PaymentRateSet> = { ...PUBLISHED_TABLES.rates };
  const lastRateDate = PUBLISHED_RATE_DATES.at(-1);
  let carriedRates = lastRateDate === undefined ? undefined : rates[lastRateDate];
  if (lastRateDate !== undefined && carriedRates !== undefined) {
    for (const effective of rateDatesAfter(lastRateDate, to)) {
      const observation = rateObservation(series, effective);
      carriedRates = indexPensionRates(carriedRates, {
        cpi: observation.cpi,
        pblci: observation.pblci,
        annualisedMtawe: observation.annualisedMtawe as Cents,
      });
      rates[effective] = carriedRates;
    }
  }

  const meansTest: Record<string, MeansTestParameterSet> = { ...PUBLISHED_TABLES.meansTest };
  const lastJuly = PUBLISHED_MEANS_TEST_DATES.at(-1);
  let carriedMeansTest = lastJuly === undefined ? undefined : meansTest[lastJuly];
  if (lastJuly !== undefined && carriedMeansTest !== undefined) {
    for (const effective of julyDatesAfter(lastJuly, to)) {
      const observation = meansTestObservation(series, effective);
      carriedMeansTest = indexMeansTestParameters(carriedMeansTest, observation);
      meansTest[effective] = carriedMeansTest;
    }
  }

  return Object.freeze({ rates: Object.freeze(rates), meansTest: Object.freeze(meansTest) });
};

/**
 * **The forward series a plan gets when it states none (user ruling, 2026-09-23).** Generated from
 * the plan's own `cpi`, `pblci` and `mtawe` growth rates, so an Age Pension rate and its cut-offs
 * RISE past the published window instead of standing at 2026 values.
 *
 * Each 20 March and 20 September takes a half-year of each rate — √(1 + rate) — and the MTAWE level
 * is the ABS anchor grown to that date's reference quarter. Each 1 July takes a whole year of CPI on
 * both reference quarters. The chain starts after the last published sets (20 Sep 2026 rates, 1 Jul
 * 2026 means test) and runs through `through`, and no further: a stated series is still the
 * caller's, and this only ever stands in for its absence.
 */
export const defaultAgePensionSeries = (
  economicSeries: Pick<EconomicSeriesSetting, 'cpi' | 'pblci' | 'mtawe'>,
  through: IsoDate,
): AgePensionIndexationSeries => {
  const { cpi, pblci, mtawe } = economicSeries;
  for (const [name, value] of [['cpi', cpi], ['pblci', pblci], ['mtawe', mtawe]] as const) {
    if (!Number.isFinite(value) || value <= -1) {
      throw new RangeError(`not a growth rate the Age Pension can be indexed by: ${name} ${value}`);
    }
  }
  const lastRates = PUBLISHED_RATE_DATES.at(-1);
  const lastJuly = PUBLISHED_MEANS_TEST_DATES.at(-1);
  if (lastRates === undefined || lastJuly === undefined) throw new RangeError('no published Age Pension parameters to generate a series over');
  const anchor = MTAWE_JUNE_QUARTER_2026;
  if (mtaweReferenceQuarter(lastRates) !== anchor.effective) {
    throw new RangeError(`the MTAWE anchor is stamped ${anchor.effective}, which is not the reference quarter of ${lastRates}`);
  }
  const halfYears = (quarter: IsoDate): number =>
    ((Number(quarter.slice(0, 4)) - Number(anchor.effective.slice(0, 4))) * 12 +
      Number(quarter.slice(5, 7)) - Number(anchor.effective.slice(5, 7))) / 6;
  return Object.freeze({
    rateIndexations: Object.freeze(
      rateDatesAfter(lastRates, through).map((effective) =>
        Object.freeze({
          effective,
          cpi: Math.sqrt(1 + cpi),
          pblci: Math.sqrt(1 + pblci),
          annualisedMtawe: Math.round(52 * anchor.value * Math.sqrt(1 + mtawe) ** halfYears(mtaweReferenceQuarter(effective))),
        }),
      ),
    ),
    meansTestIndexations: Object.freeze(
      julyDatesAfter(lastJuly, through).map((effective) =>
        Object.freeze({ effective, cpiMarchQuarter: 1 + cpi, cpiDecemberQuarter: 1 + cpi }),
      ),
    ),
  });
};

// The forward chain is cumulative, so recomputing it for each of five hundred and seventy-nine
// months would be quadratic. Keyed on the series OBJECT — a caller who passes a different series
// gets a different chain, and a `WeakMap` keeps nothing alive. The cached horizon only ever grows,
// so a later date extends the chain rather than rebuilding it from a different base.
const CHAINS = new WeakMap<AgePensionIndexationSeries, { to: IsoDate; periods: readonly AgePensionPeriod[] }>();

/**
 * Every parameter period from the start of the published window through `to`, indexed forward over
 * the caller's series. Raises `MissingPensionIndexationError` on the first indexation date the
 * series does not carry.
 */
export const agePensionPeriodsThrough = (
  series: AgePensionIndexationSeries,
  to: IsoDate,
): readonly AgePensionPeriod[] => {
  const cached = CHAINS.get(series);
  if (cached !== undefined && cached.to >= to) return cached.periods;
  const from = PUBLISHED_RATE_DATES[0];
  if (from === undefined) throw new RangeError('no published Age Pension rate set to index from');
  // Built to exactly the date asked for and never one day further. Extending the chain past `to`
  // as a speed-up would make the refusal fire EARLY — a series stopping in 2041 would refuse a
  // 2035 date because the pre-build ran into 2041 — and a refusal that fires on a date it can
  // answer is worse than a slow one. The cache absorbs the repetition instead.
  const periods = agePensionPeriods(from, to, indexForward(series, to));
  CHAINS.set(series, { to, periods });
  return periods;
};

