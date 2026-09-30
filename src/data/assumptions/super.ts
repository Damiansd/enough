// Superannuation — register §3. Every figure per Person, never per Household.
//
// Three things in here are machinery rather than numbers, and the register is emphatic about
// all three:
//
//   * cap indexation is cumulative from each cap's own base amount and base quarter, never
//     chained off last year's cap (T13), and the index, base, base quarter and rounding differ
//     per cap (T14) — so the spec is per cap and the routine takes it as a parameter;
//   * the bring-forward tiers are derived from the Transfer Balance Cap and the general cap with
//     strict inequalities (T19), so they go stale the moment either indexes;
//   * the Div 296 thresholds plateau for years and then step (T11). Run the formula every year
//     and accept the flat results; smooth annual escalation is materially wrong.
//
// This module holds no tax computation. Div 296's rates, thresholds and application year are
// here; the calculation in register §3.7 belongs to P3.
import { mulCents, toCents } from '../../core/money.js'; // `.js` is correct in a `.ts` file — see tsconfig.json
import type { Cents } from '../../core/money.js';
import { startOfFinancialYear } from '../../core/financialYear.js';
import type { Consumed } from '../../core/provenance.js';
import { taxYear } from './tax.js';
import { deepFreeze } from './types.js';
import type { Assumption, Confidence, Constant, FinancialYear, Formula, Money, Rate } from './types.js';

const ATO_CAPS = {
  source: 'ATO key superannuation rates and thresholds — contributions caps · ITAA 1997 s 291-20(2)',
  retrieved: '2026-09-03',
  confidence: 'primary-verified',
  registerSection: '§3.1',
} as const;

const ITAA97_INDEXATION = {
  source: 'ITAA 1997 Subdiv 960-M ss 960-265, 960-280, 960-285',
  retrieved: '2026-09-03',
  confidence: 'primary-verified',
  registerSection: '§3.2',
} as const;

const ITAA97_292_85 = {
  source: 'ITAA 1997 s 292-85',
  retrieved: '2026-09-03',
  confidence: 'primary-verified',
  registerSection: '§3.3',
} as const;

const ITAA97_291_20 = {
  source: 'ITAA 1997 s 291-20(3)–(7)',
  retrieved: '2026-09-03',
  confidence: 'primary-verified',
  registerSection: '§3.4',
} as const;

const SGAA = {
  source: 'SGAA 1992 ss 10A, 17A(2) · ATO super guarantee',
  retrieved: '2026-09-03',
  confidence: 'primary-verified',
  registerSection: '§3.5',
} as const;

const DIV_293 = {
  source:
    'ITAA 1997 ss 293-20, 293-25, 293-30, 995-1(1) · Super (Sustaining the Superannuation ' +
    'Contribution Concession) Imposition Act 2013 (No. 87, 2013) s 5',
  retrieved: '2026-09-05',
  confidence: 'primary-verified',
  registerSection: '§3.6',
} as const;

/**
 * The one Div 293 reading the sources leave open (P3-5 U1). Carried at its own confidence so a
 * result that actually depends on it says so, instead of borrowing the primary-verified label of
 * the sections around it.
 */
const DIV_293_INFERRED = { ...DIV_293, confidence: 'unverified' } as const;

const DIV_296 = {
  source: 'Treasury Laws Amendment (Building a Stronger and Fairer Super System) Act 2026 (C2026A00008) Sch 1 · ITAA 1997 Div 296 · Superannuation (BSFSS) Imposition Act 2026 s 5',
  retrieved: '2026-09-03',
  confidence: 'primary-verified',
  registerSection: '§3.7',
} as const;

const ACCESS = {
  source: 'ITAA 1997 · SIS Regulations · P0 research pass',
  retrieved: '2026-09-03',
  confidence: 'primary-verified',
  registerSection: '§3.9',
} as const;

/**
 * P3-10's research pass — `docs/research/p3-minimum-drawdown-and-ttr.md`, read off the instrument
 * itself (the formula out of the compilation's own embedded drawing records, and again as text in
 * the ATO Legal Database). It carries the four things the P0 pass left undetermined: the rounding
 * *direction*, the rounding *order*, the *days* basis, and *which balance* a commencement year
 * uses. Register §3.9's row still says "on the 1 July balance", which Sch 7 cl 1(2)(a)(ii) makes
 * wrong for a commencement year; correcting the register is a separate chunk, so nothing here
 * restates the row — these records state the Schedule.
 */
const SISR_SCH7 = {
  source:
    'SIS Regulations 1994 reg 1.06(9A) and Sch 7 cll 1–5 (F1996B00580 Compilation No. 159, ' +
    'compilation date 1 July 2026) · ATO Legal Database REG/19940057',
  retrieved: '2026-09-08',
  confidence: 'primary-verified',
  registerSection: '§3.9',
} as const;

/**
 * The one part of the pro-rating the instrument does not state. Sch 7 cl 3 gives the numerator and
 * never names what it is a proportion *of*; the ATO does. Held at its own confidence so that a
 * part-year minimum comes out `secondary-only` and a full-year one stays `primary-verified` —
 * a blanket caveat on the whole domain would stop meaning anything.
 */
const SISR_SCH7_DENOMINATOR = {
  ...SISR_SCH7,
  source:
    SISR_SCH7.source +
    ' · ATO, Income stream (pension) rules and payments (last updated 30 April 2026) — the ' +
    'denominator is stated there and nowhere in the instrument',
  confidence: 'secondary-only',
} as const;

/**
 * The TTR maximum lives somewhere nobody would look for it. It is **not** in reg 1.06(9A) and
 * **not** in Schedule 7: it is a limb of the reg 6.01(2) *definition* of a transition to
 * retirement income stream, para (b)(ii) for a pension — "no more than 10% of the pension account
 * balance" on 1 July, or on the commencement day in the year the pension commences. Register
 * §3.9's row cites no provision at all (P3-8 D4), so the citation is made here.
 */
const SISR_TRIS = {
  source:
    'SIS Regulations 1994 reg 6.01(2)(b)(ii) — the definition of transition to retirement income ' +
    'stream (F1996B00580 Compilation No. 159, compilation date 1 July 2026) · ATO Legal Database ' +
    'REG/19940057/6.01(2)',
  retrieved: '2026-09-08',
  confidence: 'primary-verified',
  registerSection: '§3.9',
} as const;

/**
 * **An argument from the absence of a provision, and it is held at the confidence that deserves.**
 * That the maximum is not pro-rated, not rounded, not age-varying and not switched off by the
 * 1 June nil rule follows from Sch 7 cl 3 being confined by its own words to "the minimum total
 * payment" and cl 5 to "an amount determined under this Schedule", together with there being no
 * substitute anywhere in reg 6.01(2), reg 6.01AB or reg 1.06(9A). No provision *says* it. What
 * says it is ATO guidance, in three bullets, one per negative — so the reading is `secondary-only`
 * even though every provision behind it is primary-verified, and it is a record of its own so the
 * weakness rides on the maximum and not on the rest of §3.9 (P3-8 U1).
 */
const SISR_TRIS_ABSENCE = {
  ...SISR_TRIS,
  source:
    SISR_TRIS.source +
    ' read against Sch 7 cll 3, 4 and 5 · ATO, Transition to retirement income streams (TRIS) ' +
    '(last updated 2 April 2025) — "Calculating the maximum annual pension payment limit": ' +
    "don't reduce it for a part year, the 10% does not vary with age, don't round it to $10",
  confidence: 'secondary-only',
} as const;

/**
 * **SISR Schedule 1, Part 1 — the items themselves, which §3.9 carried no trace of until
 * 2026-09-09.** ITAA 1997 s 307-80(3)(b) turns on **which item** a Person satisfied, not on a
 * boolean, so the item identity is load-bearing for the phase question in §3.10 and is no longer
 * merely a citation. Columns 1–3 are reproduced verbatim for the five nil-cashing items §3.9
 * lists; the register row and this record are the same five, in the same order.
 */
const SISR_SCH1 = {
  source:
    'SIS Regulations 1994 Schedule 1, Part 1 (Regulated superannuation funds), columns 1–3 · ' +
    'ATO Legal Database REG/19940057/Sch1',
  retrieved: '2026-09-09',
  confidence: 'primary-verified',
  registerSection: '§3.9',
} as const;

/**
 * **The mapping the Schedule does not supply, read from the provision that does (LR-2, closed
 * 2026-09-29).** Schedule 1 names item 101 "Retirement" and stops; what *retirement* means is SISR
 * reg 6.01(7), retrieved 2026-09-29 (O59 / U28, closed). Its paragraph (b)(i) makes the end of an
 * arrangement of gainful employment on or after the Person's 60th birthday a retirement with no
 * further condition, and that is exactly the register’s “ceasing gainful employment after 60”
 * ground. Its own record so the mapping's citation rides on the mapping and not on the item
 * numbers, which were read from Schedule 1 on 2026-09-09.
 */
const SISR_REG_6_01_7 = {
  ...SISR_SCH1,
  source:
    SISR_SCH1.source +
    ' · SIS Regulations 1994 reg 6.01(7) ("Retirement of person"), paragraph (b)(i) · ATO Legal ' +
    'Database REG/19940057/6.01(7)',
  retrieved: '2026-09-29',
  confidence: 'primary-verified',
} as const;

// --- Indexation machinery — ITAA 1997 s 960-285 (T13, T14) -------------------------------------

export interface CapIndexationSpec {
  /** Which index applies. They are not interchangeable: swapping them is the T14 mutation. */
  readonly index: 'AWOTE' | 'CPI';
  /** The original base amount. Indexation is computed against this every year, never against last year's cap. */
  readonly baseAmount: Cents;
  /** The base quarter, as the quarter-ending date. */
  readonly baseQuarter: string;
  /** The cap is floored to a multiple of this amount. Different per cap — $2,500, $100,000, $150,000, $500,000. */
  readonly roundingAmount: Cents;
}

/** s 960-285(6): three decimal places, rounding up where the fourth decimal is 5 or more. */
const indexationFactor = (ratio: number): number => Math.floor(ratio * 1000 + 0.5) / 1000;

/**
 * s 960-285(2)–(6). Cumulative from the base amount and base quarter — T13. Multiplying last
 * year's cap by an annual factor and re-rounding drifts, because the floor-to-multiple applies
 * once, to the cumulative product.
 *
 * `indexNumber` is the index for the quarter ending 31 December immediately before the financial
 * year; `baseIndexNumber` is the index for the spec's base quarter. Neither is stored here for a
 * future year: the forward series is a Setting (register O5).
 */
export const indexCap = (spec: CapIndexationSpec, baseIndexNumber: number, indexNumber: number): Cents => {
  const factor = indexationFactor(indexNumber / baseIndexNumber);
  if (factor <= 1) return spec.baseAmount; // s 960-285(4) — no indexation this year
  const indexed = spec.baseAmount * factor;
  return toCents((Math.floor(indexed / spec.roundingAmount) * spec.roundingAmount) / 100);
};

// --- CPI index numbers — one series, one reference base (O41) ----------------------------------

/**
 * The ABS All Groups CPI, weighted average of the eight capital cities (s 960-280(1)), held as a
 * whole **series** carrying the one reference base every number in it is published on.
 *
 * The shape is register O41's instruction made structural rather than documented. The ABS has
 * re-referenced the series: the superseded base publishes Dec 2016 as **110.0** and has no Dec
 * 2025 number at all — it ends at Sep 2025 — and the two bases already differ in the **third
 * decimal of the indexation factor** in four published years. One thousandth of the factor is
 * $1,600 at the $1,600,000 base amount. A numerator and a denominator drawn from different
 * reference periods is a silent, plausible, wrong cap.
 *
 * So a CPI index number is never handed about on its own. Both halves of a factor are read out of
 * the *same* series object by `indexCapFromCpiSeries`, and there is no function anywhere that
 * takes a CPI numerator and a denominator separately — a mixed pair is not something the API can
 * express. Forecasting a later year means supplying a series, which carries its base with it and
 * its own confidence, not supplying a loose number.
 */
export interface CpiSeries {
  /** The ABS reference base. Exactly one per series: this is what makes a mixed pair unconstructible. */
  readonly referenceBase: string;
  readonly source: string;
  /** Published quarters are primary-verified; a forecast quarter is a Setting (register O5) and unverified. */
  readonly confidence: Confidence;
  /** Quarter-ending date (`2016-12-31`) → the index number **first published** for that quarter. */
  readonly indexNumbers: Readonly<Record<string, number>>;
}

const QUARTER_ENDING = /^\d{4}-\d{2}-\d{2}$/;

/** The one constructor. The reference base is required, so a series cannot exist without naming it. */
export const cpiSeries = (input: {
  readonly referenceBase: string;
  readonly source: string;
  readonly confidence: Confidence;
  readonly indexNumbers: Readonly<Record<string, number>>;
}): CpiSeries => {
  if (input.referenceBase.trim() === '') {
    throw new RangeError('a CPI series must name the reference base its numbers are published on (register O41)');
  }
  for (const [quarter, indexNumber] of Object.entries(input.indexNumbers)) {
    if (!QUARTER_ENDING.test(quarter)) throw new RangeError(`not a quarter-ending date: ${quarter}`);
    if (!Number.isFinite(indexNumber) || indexNumber <= 0) throw new RangeError(`not an index number: ${indexNumber}`);
  }
  return deepFreeze({ ...input, indexNumbers: { ...input.indexNumbers } });
};

export const cpiIndexNumberAt = (series: CpiSeries, quarter: string): number | undefined =>
  series.indexNumbers[quarter];

/**
 * s 960-285(2)–(6) for a CPI-indexed cap. **Both** index numbers come from the one series, so the
 * factor cannot be computed across reference bases (O41), and the arithmetic itself is `indexCap`
 * — there is one implementation of the rounding and the floor, not two (T13).
 */
export const indexCapFromCpiSeries = (spec: CapIndexationSpec, series: CpiSeries, quarter: string): Cents => {
  if (spec.index !== 'CPI') {
    throw new RangeError(`a ${spec.index}-indexed cap cannot be indexed from a CPI series (T14)`);
  }
  const base = cpiIndexNumberAt(series, spec.baseQuarter);
  const observed = cpiIndexNumberAt(series, quarter);
  if (base === undefined) {
    throw new RangeError(
      `the CPI series on the ${series.referenceBase} has no index number for the base quarter ${spec.baseQuarter}`,
    );
  }
  if (observed === undefined) {
    throw new RangeError(
      `the CPI series on the ${series.referenceBase} has no index number for the quarter ending ${quarter}`,
    );
  }
  return indexCap(spec, base, observed);
};

/**
 * ABS All Groups CPI, weighted average of the eight capital cities, December quarters 2016 to
 * 2025 — retrieved from the ABS SDMX data API (register §10 item 15), which is what closed O11.
 *
 * These ten numbers reproduce **all nine** published general Transfer Balance Caps, 2018-19
 * through 2026-27, from the one base amount and the one base quarter (§3.2). That is what turns
 * the s 960-285 machinery from asserted into demonstrated, and it is T13's proof: nothing is
 * chained off last year's cap.
 */
const CPI_CURRENT_BASE = cpiSeries({
  referenceBase: 'ABS CPI current reference base (SDMX dataflow ABS,CPI,2.0.0)',
  source:
    'ABS SDMX data API, dataflow ABS,CPI,2.0.0, series 1.10001.10.50.Q — All Groups CPI, ' +
    'weighted average of the eight capital cities, quarterly index numbers',
  confidence: 'primary-verified',
  indexNumbers: {
    '2016-12-31': 76.38,
    '2017-12-31': 77.87,
    '2018-12-31': 79.24,
    '2019-12-31': 80.7,
    '2020-12-31': 81.4,
    '2021-12-31': 84.23,
    '2022-12-31': 90.85,
    '2023-12-31': 94.53,
    '2024-12-31': 96.81,
    '2025-12-31': 100.32,
  },
});

const CPI_DECEMBER_QUARTER_INDEX_NUMBERS = {
  source: CPI_CURRENT_BASE.source,
  retrieved: '2026-09-09',
  confidence: CPI_CURRENT_BASE.confidence,
  registerSection: '§3.2',
  kind: 'constant',
  effective: '2016-12-31',
  value: CPI_CURRENT_BASE,
  note:
    'Closed O11. The December quarter is the one s 960-285(5) indexes off, and the numbers are ' +
    'the ones first published for each quarter (s 960-280(1)) — later ABS revisions are ignored. The ' +
    'series carries its reference base because a factor must never be computed from a mixed pair ' +
    '(O41): the superseded base gives Dec 2016 = 110.0 and has no Dec 2025 number at all.',
} satisfies Constant<CpiSeries>;

/**
 * **Which reference base supplies the s 960-285(5) index numbers — a labelled inference, and the
 * label stays** (O41 / U9).
 *
 * Its own record, at its own confidence, so that the weakness rides on the *identification of the
 * series* and not on the numbers, which came straight from the ABS. Every cap computed from a CPI
 * series consumes this and therefore arrives `unverified`; the year the ATO publishes a cap for is
 * read from the published figure and keeps its own confidence, with the computation run against it
 * as a cross-check.
 */
const CPI_REFERENCE_BASE = {
  source:
    'ITAA 1997 s 960-280(1), (3) read against the ABS re-reference of the CPI · ABS SDMX ' +
    'dataflow versions 2.0.0 (current) and 1.1.0 (superseded)',
  retrieved: '2026-09-09',
  confidence: 'unverified',
  registerSection: '§3.2',
  kind: 'constant',
  effective: '2016-12-31',
  value: 'the current-base series supplies both halves of every s 960-285(5) indexation factor',
  note:
    'O41 / U9. s 960-280(1) says the index number "first published", and the number first ' +
    'published for Dec 2016 was 110.0 on the superseded base; s 960-280(3) points at ' +
    'new-reference-period numbers after a re-reference but does not say in terms that the ' +
    'historic base quarter is restated. The current-base pair reproduces all nine published ' +
    'general Transfer Balance Caps — strong corroboration, not a statement of the rule. Four ' +
    'published years (2018-19, 2020-21, 2021-22, 2024-25) already differ in the third decimal of ' +
    'the factor on the two bases, and one thousandth is $1,600 at the $1.6m base amount. The ABS ' +
    'codelist endpoint is not authority for the base: its labels are calendar-year and do not ' +
    'reconcile with the observed series (§10 item 16).',
} satisfies Constant<string>;

const CAP_SPECS = {
  concessional: {
    ...ITAA97_INDEXATION,
    kind: 'constant',
    effective: '2017-07-01',
    value: {
      index: 'AWOTE',
      baseAmount: toCents(25_000),
      baseQuarter: '2016-12-31',
      roundingAmount: toCents(2_500),
    },
    note: 's 960-265 item 9. AWOTE is the middle month of the quarter as first published — November for the December quarter — and ABS revisions are ignored (s 960-280(4), (5)).',
  } satisfies Constant<CapIndexationSpec>,
  transferBalance: {
    ...ITAA97_INDEXATION,
    kind: 'constant',
    effective: '2017-07-01',
    value: {
      index: 'CPI',
      baseAmount: toCents(1_600_000),
      baseQuarter: '2016-12-31',
      roundingAmount: toCents(100_000),
    },
    note: 's 960-265 item 10A. The CPI index numbers are in the register (§3.2, O11 closed 2026-09-09) and reproduce all nine published caps, 2018-19 to 2026-27 — the two-point check is done on both indexes. Read them through `indexCapFromCpiSeries`, never as a loose pair (O41).',
  } satisfies Constant<CapIndexationSpec>,
  div296LargeBalanceThreshold: {
    ...ITAA97_INDEXATION,
    kind: 'constant',
    effective: '2026-07-01',
    value: {
      index: 'CPI',
      baseAmount: toCents(3_000_000),
      baseQuarter: '2025-12-31',
      roundingAmount: toCents(150_000),
    },
    note: 's 960-265 item 10B. T11 — CPI must lift $3,000,000 past $3,150,000, a cumulative 5% move, before this changes at all. A different base quarter from the caps above (T14).',
  } satisfies Constant<CapIndexationSpec>,
  div296VeryLargeBalanceThreshold: {
    ...ITAA97_INDEXATION,
    kind: 'constant',
    effective: '2026-07-01',
    value: {
      index: 'CPI',
      baseAmount: toCents(10_000_000),
      baseQuarter: '2025-12-31',
      roundingAmount: toCents(500_000),
    },
    note: 's 960-265 item 10C. Steps $500,000 — also a 5% cumulative move.',
  } satisfies Constant<CapIndexationSpec>,
};

const AWOTE_BASE_QUARTER_INDEX = {
  source: 'ATO other super rates and thresholds, Table 40 — AWOTE for the December quarter',
  retrieved: '2026-09-03',
  confidence: 'primary-verified',
  registerSection: '§3.2',
  kind: 'constant',
  effective: '2016-12-31',
  value: 1_533.4,
  note: 'The concessional cap base-quarter AWOTE figure. Historical and published, so it is an assumption; every later quarter comes from the Setting (register O5).',
} satisfies Constant<number>;

/**
 * **The most recent PUBLISHED December-quarter AWOTE level — the anchor the forward series is
 * compounded from (P6-12, 2026-09-21).**
 *
 * This figure existed until today only inside the words of `CAPS.concessional.note`, as the worked
 * prose `2051.10 / 1533.40 → 1.338 → $32,500`. A number written in a comment is prose: it has no
 * source of its own, no retrieval date and no confidence, and nothing may compute from it. It is
 * promoted here, retrieved from the same ATO table the base quarter came from, so that it can be.
 *
 * It is the **anchor** and not a second base: s 960-285(5) still divides by the December 2016 base
 * quarter, always, and the cap is still computed cumulatively from the $25,000 base amount (T13).
 * What this record anchors is the *numerator* for a year the ABS has not reached yet — the Setting
 * supplies a growth rate, and a forward quarter is this level grown by it, which is a forecast and
 * arrives `unverified`.
 */
const AWOTE_LATEST_PUBLISHED_QUARTER_INDEX = {
  source: 'ATO other super rates and thresholds, Table 40 — AWOTE for the December quarter',
  retrieved: '2026-09-21',
  confidence: 'primary-verified',
  registerSection: '§3.2',
  kind: 'constant',
  effective: '2025-12-31',
  value: 2_051.1,
  note: 'The latest December quarter the ATO publishes an AWOTE level for. Read against the base quarter it reproduces the published FY2026-27 concessional cap exactly: 2051.10 / 1533.40 → 1.338 → $32,500. Later quarters are NOT published and are not here — they come from the Setting (register O5) and are forecasts.',
} satisfies Constant<number>;

// --- Contribution caps -------------------------------------------------------------------------

const CAPS = {
  concessional: {
    ...ATO_CAPS,
    kind: 'config',
    fy: '2026-27',
    value: toCents(32_500),
    note: 'AWOTE-indexed in $2,500 steps. The published figure — the source of truth is the spec plus the index; 2051.10 / 1533.40 → 1.338 → $32,500. Both halves of that ratio are records of their own from 2026-09-21 (`capIndexation.awoteLatestPublishedQuarterIndexNumber` and `capIndexation.awoteBaseQuarterIndexNumber`), so the working above is a reader\'s copy and no longer the only home of the numerator.',
  } satisfies Money,
  nonConcessional: {
    ...ATO_CAPS,
    kind: 'config-derived',
    fy: '2026-27',
    value: toCents(130_000),
    derivation: '4 × concessional contributions cap (ITAA 1997 s 292-85(2)(a))',
    note: 'Not separately indexed: it moves in $10,000 steps because it is 4× a cap that moves in $2,500 steps. The s 291-20(4) carry-forward increase is expressly excluded from this calculation.',
  } satisfies Money,
  nonConcessionalMultiple: {
    ...ITAA97_292_85,
    kind: 'constant',
    everyYear: true,
    value: 4,
    note: 'ITAA 1997 s 292-85(2)(a). Restored 2026-09-10 (P3-27) as a NUMERIC record: the multiple previously existed only inside the words of `nonConcessional.derivation`, so `core/superCaps.ts` had to declare its own literal 4 — T14 drift the assumptions layer was forcing. The derivation prose is kept beside it for the reader and the two are asserted to agree.',
  } satisfies Constant<number>,
  generalTransferBalance: {
    ...ATO_CAPS,
    kind: 'config',
    fy: '2026-27',
    value: toCents(2_100_000),
    registerSection: '§3.1',
    note: 'The ATO contributions-caps page still says $2 million in present tense; two other ATO pages and the bring-forward arithmetic ($2.1m − $260k = $1.84m) give $2,100,000 for FY2026-27.',
  } satisfies Money,
};

// --- Bring-forward — derived, not literals (T19, T20) ------------------------------------------

export interface BringForwardInputs {
  readonly generalTransferBalanceCap: Cents;
  readonly nonConcessionalCap: Cents;
  /** Total Super Balance immediately before the start of the first year. */
  readonly totalSuperBalance: Cents;
}

export interface BringForwardArrangement {
  /** The first-year cap. Once triggered it is frozen: first-year cap × the period, never a sum of indexed years (T20). */
  readonly firstYearCap: Cents;
  readonly years: 0 | 1 | 2 | 3;
}

/**
 * ITAA 1997 s 292-85(2)(b), (5). The inequalities are **strict**: at a Total Super Balance of
 * exactly $1,840,000 the Person gets the 2-year arrangement, not the 3-year.
 */
export const bringForwardArrangement = (input: BringForwardInputs): BringForwardArrangement => {
  const capSpace = input.generalTransferBalanceCap - input.totalSuperBalance;
  if (input.totalSuperBalance >= input.generalTransferBalanceCap) return { firstYearCap: toCents(0), years: 0 };
  if (capSpace > 2 * input.nonConcessionalCap) return { firstYearCap: (input.nonConcessionalCap * 3) as Cents, years: 3 };
  if (capSpace > input.nonConcessionalCap) return { firstYearCap: (input.nonConcessionalCap * 2) as Cents, years: 2 };
  return { firstYearCap: input.nonConcessionalCap, years: 1 };
};

const BRING_FORWARD = {
  arrangement: {
    ...ITAA97_292_85,
    kind: 'config-derived',
    fy: '2026-27',
    value: bringForwardArrangement,
    derivation:
      'cap_space = general Transfer Balance Cap − TSB just before the start of the first year. TSB ≥ GTBC ⇒ nil; cap_space > 2 × general NCC cap ⇒ 3 × cap, 3 years; cap_space > 1 × general NCC cap ⇒ 2 × cap, 2 years; otherwise the general cap, no bring-forward. Strict inequalities.',
    note: 'T19 — hard-coded tiers go stale the moment either cap indexes.',
  } satisfies Formula<typeof bringForwardArrangement>,
  ageGate: {
    ...ITAA97_292_85,
    kind: 'constant',
    everyYear: true,
    value: 'under 75 at any time in the first year',
  } satisfies Constant<string>,
  ageGateUnder: {
    ...ITAA97_292_85,
    kind: 'constant',
    everyYear: true,
    value: 75,
    note: 'ITAA 1997 s 292-85(3)(c), as a number to compute with. Named `ageGateUnder` because the comparison is STRICT — `age < 75`, not `<=`. The sentence in `ageGate` is kept for the reader and the two are asserted to agree; this record exists so `core/superCaps.ts` does not have to write 75 itself (P3-27).',
  } satisfies Constant<number>,
  trigger: {
    ...ITAA97_292_85,
    kind: 'constant',
    everyYear: true,
    value: 'contributing more than the general cap in the first year — not elective (s 292-85(3)(a))',
  } satisfies Constant<string>,
  capIsFrozenOnceTriggered: {
    ...ITAA97_292_85,
    kind: 'constant',
    everyYear: true,
    value: true,
    note: 'T20 — indexation during the bring-forward period does not apply. A 3-year arrangement started in FY2026-27 totals $390,000, not $410,000.',
  } satisfies Constant<boolean>,
  laterYearCutOut: {
    ...ITAA97_292_85,
    kind: 'constant',
    everyYear: true,
    value: 'remaining cap nil where TSB at the previous 30 June ≥ the general Transfer Balance Cap for that year (s 292-85(6)(a), (7)(a))',
  } satisfies Constant<string>,
};

// --- Carry-forward concessional (T21) ----------------------------------------------------------

const CARRY_FORWARD = {
  totalSuperBalanceTest: {
    ...ITAA97_291_20,
    kind: 'constant',
    everyYear: true,
    value: toCents(500_000),
    note: 'T21 — a bare figure with no indexation provision. Nominal: its real value erodes and it captures progressively more Persons across a 40-year projection. Model the creep; never inflate it.',
  } satisfies Money,
  testDate: {
    ...ITAA97_291_20,
    kind: 'constant',
    everyYear: true,
    value: 'TSB just before the start of the financial year (the immediately prior 30 June)',
  } satisfies Constant<string>,
  lookBackYears: { ...ITAA97_291_20, kind: 'constant', everyYear: true, value: 5 } satisfies Assumption<number>,
  applicationOrder: {
    ...ITAA97_291_20,
    kind: 'constant',
    everyYear: true,
    value: 'earliest year first',
  } satisfies Constant<string>,
  earliestGeneratingYear: {
    ...ITAA97_291_20,
    kind: 'constant',
    everyYear: true,
    value: '2018-19',
  } satisfies Constant<string>,
};

// --- Superannuation Guarantee (T17, T18) -------------------------------------------------------

/** SGAA s 10A(5): `floor_to_10(concessional_cap × 100 ÷ charge_percentage)`. */
export const maximumContributionsBase = (concessionalCap: Cents, chargePercentage: number): Cents =>
  toCents(Math.floor((concessionalCap * 100) / chargePercentage / 1000) * 10);

const SUPER_GUARANTEE = {
  chargePercentage: {
    ...SGAA,
    kind: 'config',
    fy: '2026-27',
    value: 12,
    note: 'A flat 12 in the Act, with no legislated increase (register O4). Holding it at 12% for 40 years is an assumption about future policy — see SETTINGS_NOT_ASSUMPTIONS.',
  } satisfies Assumption<number>,
  earningsBase: {
    ...SGAA,
    kind: 'constant',
    everyYear: true,
    value: 'qualifying earnings',
    note: 'T17 — replaced ordinary time earnings on 1 Jul 2026 (SGAA s 10A(1)). The full definition was not read in detail (register O19); read it before coding SG for any Scenario involving bonuses, allowances or termination payments.',
  } satisfies Constant<string>,
  salarySacrificeIsQualifyingEarnings: {
    ...SGAA,
    kind: 'constant',
    everyYear: true,
    value: true,
    note: 'T17 — SGAA ss 10A(1)(h), 10A(4)(b). Sacrificing salary no longer reduces the SG base, so computing SG on post-sacrifice salary understates employer contributions.',
  } satisfies Constant<boolean>,
  paymentFrequency: {
    source: 'Act No. 57, 2025 (Payday Super)',
    retrieved: '2026-09-03',
    confidence: 'primary-verified',
    registerSection: '§3.5',
    kind: 'config',
    fy: '2026-27',
    value: 'each payday',
  } satisfies Assumption<string>,
  maximumContributionsBase: {
    ...SGAA,
    kind: 'config-derived',
    fy: '2026-27',
    value: toCents(270_830),
    derivation: 'floor_to_10(concessional cap × 100 ÷ charge percentage) — 32,500 × 100 ÷ 12 = 270,833.33 → $270,830',
    note: 'T18 — annual and per employer from 1 Jul 2026. It was $62,500 per quarter before that: the construct itself changed, so a model carrying the quarterly figure forward is wrong from FY2026-27 on.',
  } satisfies Money,
  maximumContributionsBasePeriod: {
    ...SGAA,
    kind: 'constant',
    everyYear: true,
    value: 'financial year, per employer',
  } satisfies Constant<string>,
};

// --- Low income super tax offset (LR-3) --------------------------------------------------------
//
// Paid by the ATO into the Person's fund for a year in which their adjusted taxable income is at
// or under a threshold and at least a tenth of their total income is from work. It is treated as
// a Government co-contribution (Co-contribution Act s 12B), so it is not a contribution of any
// kind: it counts towards no cap, is not a low tax contribution for Division 293, and the fund
// pays no contributions tax on it. From FY2027-28 (Act No. 8 of 2026 Sch 4) the threshold is the
// top of the first rated bracket and the maximum is derived from it — neither is stored.

const LISTO_ACT = {
  source:
    'Superannuation (Government Co-contribution for Low Income Earners) Act 2003 ss 6(1)(b), 12B, 12C(1), 12E(2) · ' +
    'ITAA 1997 s 292-90(2)(c)(i) · read on the ATO legal database (PAC/20030110)',
  retrieved: '2026-09-30',
  confidence: 'primary-verified',
  registerSection: '§3.5.2',
} as const;

const LISTO_FROM_2027 = {
  source:
    'Treasury Laws Amendment (Building a Stronger and Fairer Super System) Act 2026 (C2026A00008) Sch 4 items 1–3, ' +
    'amending Co-contribution Act ss 12C(1)(b), 12E(2)(b) and inserting s 12E(3A) · Income Tax Rates Act 1986 Sch 7 Pt I · SGAA s 17A(2)',
  retrieved: '2026-09-30',
  confidence: 'secondary-only',
  registerSection: '§3.5.2',
} as const;

/** s 12C(1)(b) as amended: "the dollar amount mentioned in item 1 of the table for that income year in Part I of Schedule 7". */
export const lowIncomeSuperTaxOffsetThreshold = (fy: FinancialYear): Cents => {
  const itemOne = taxYear(fy).brackets?.value[1]?.upTo;
  if (itemOne === undefined || itemOne === null) throw new RangeError(`no Schedule 7 item 1 for FY${fy}`);
  return itemOne;
};

/** s 12E(3A): eligibility threshold amount × charge percentage ÷ 100 × 15 ÷ 100, in whole cents. */
export const lowIncomeSuperTaxOffsetMaximum = (threshold: Cents, chargePercentage: number): Cents =>
  Math.round((threshold * chargePercentage * 15) / 10_000) as Cents;

const LOW_INCOME_SUPER_TAX_OFFSET = {
  rate: {
    ...LISTO_ACT,
    kind: 'constant',
    everyYear: true,
    value: 0.15,
    note: 's 12E(2)(a) — 15% of the year\'s concessional contributions: the Guarantee, salary sacrifice and deductible personal contributions alike.',
  } satisfies Rate,
  minimum: {
    ...LISTO_ACT,
    kind: 'constant',
    everyYear: true,
    value: toCents(10),
    note: 's 12E(2)(c) — where 15% comes to less than $10, $10 is paid. Unchanged by Act No. 8 of 2026.',
  } satisfies Money,
  employmentIncomeShare: {
    ...LISTO_ACT,
    kind: 'constant',
    everyYear: true,
    value: 0.1,
    note: 's 12C(1)(c), borrowing s 6(1)(b): 10% or more of total income (assessable income plus reportable employer superannuation contributions and reportable fringe benefits, s 8) is from employment or a business.',
  } satisfies Rate,
  incomeThreshold: {
    ...LISTO_ACT,
    kind: 'config',
    effective: '2017-07-01',
    value: toCents(37_000),
    note: 's 12C(1)(b) — adjusted taxable income must not EXCEED it, so exactly the threshold qualifies. Income years to FY2026-27 only; `incomeThresholdFrom2027` replaces it.',
  } satisfies Money,
  maximum: {
    ...LISTO_ACT,
    kind: 'config',
    effective: '2017-07-01',
    value: toCents(500),
    note: 's 12E(2)(b). Income years to FY2026-27 only; `maximumFrom2027` replaces it.',
  } satisfies Money,
  incomeThresholdFrom2027: {
    ...LISTO_FROM_2027,
    kind: 'config-derived',
    effective: '2027-07-01',
    value: lowIncomeSuperTaxOffsetThreshold,
    derivation: 'the top of item 1 of the Sch 7 Pt I rate table for the income year — $45,000 for FY2027-28 and, while the brackets stay put, every year after',
    note: 'The amending text was read as the CCH note quotes it on the ATO legal database; the Act itself (legislation.gov.au) refused automated retrieval, hence secondary-only. It moves whenever the first bracket does, so it is never stored.',
  } satisfies Formula<typeof lowIncomeSuperTaxOffsetThreshold>,
  maximumFrom2027: {
    ...LISTO_FROM_2027,
    kind: 'config-derived',
    effective: '2027-07-01',
    value: lowIncomeSuperTaxOffsetMaximum,
    derivation: 'eligibility threshold amount × SG charge percentage ÷ 100 × 15 ÷ 100 — 45,000 × 12% × 15% = $810 for FY2027-28',
    note: 's 12E(3A), read as the CCH note quotes it. Follows both the first bracket and the SG charge percentage.',
  } satisfies Formula<typeof lowIncomeSuperTaxOffsetMaximum>,
  notAContribution: {
    ...LISTO_ACT,
    kind: 'constant',
    everyYear: true,
    value: 'a Government co-contribution in law (s 12B): not a concessional or non-concessional contribution, not a low tax contribution for Division 293, and not taxed as a contribution in the fund',
  } satisfies Constant<string>,
};

export interface LowIncomeSuperTaxOffsetInputs {
  readonly fy: FinancialYear;
  /** The year's concessional contributions: SG, salary sacrifice and deductible personal contributions. */
  readonly concessional: Cents;
  /** Adjusted taxable income (Family Assistance Act Sch 3, disregarding cll 3 and 3A). */
  readonly ati: Cents;
  /** The share of total income from employment or a business, 0 to 1. */
  readonly employmentShare: number;
}

export interface LowIncomeSuperTaxOffset {
  readonly fy: FinancialYear;
  /** Nil where the year does not qualify. */
  readonly amount: Cents;
  readonly threshold: Cents;
  readonly minimum: Cents;
  readonly maximum: Cents;
  readonly consumed: readonly Consumed[];
}

/** Co-contribution Act ss 12C(1) and 12E(2), for one Person and one income year. Residency (s 6(1)(f)) is the caller's. */
export const lowIncomeSuperTaxOffset = (input: LowIncomeSuperTaxOffsetInputs): LowIncomeSuperTaxOffset => {
  const rules = LOW_INCOME_SUPER_TAX_OFFSET;
  const amended = startOfFinancialYear(input.fy) >= rules.incomeThresholdFrom2027.effective;
  const threshold = amended ? rules.incomeThresholdFrom2027.value(input.fy) : rules.incomeThreshold.value;
  const maximum = amended ? rules.maximumFrom2027.value(threshold, SUPER_GUARANTEE.chargePercentage.value) : rules.maximum.value;
  const payable = input.concessional > 0 && input.ati <= threshold && input.employmentShare >= rules.employmentIncomeShare.value;
  const fifteen = mulCents(input.concessional, rules.rate.value);
  const amount = !payable ? toCents(0) : fifteen > maximum ? maximum : fifteen < rules.minimum.value ? rules.minimum.value : fifteen;
  const consumed: Consumed[] = [
    ['superannuation.lowIncomeSuperTaxOffset.rate', rules.rate],
    ['superannuation.lowIncomeSuperTaxOffset.minimum', rules.minimum],
    ['superannuation.lowIncomeSuperTaxOffset.employmentIncomeShare', rules.employmentIncomeShare],
    ...(amended
      ? ([
        ['superannuation.lowIncomeSuperTaxOffset.incomeThresholdFrom2027', rules.incomeThresholdFrom2027],
        ['superannuation.lowIncomeSuperTaxOffset.maximumFrom2027', rules.maximumFrom2027],
        ['superannuation.superGuarantee.chargePercentage', SUPER_GUARANTEE.chargePercentage],
      ] as const)
      : ([
        ['superannuation.lowIncomeSuperTaxOffset.incomeThreshold', rules.incomeThreshold],
        ['superannuation.lowIncomeSuperTaxOffset.maximum', rules.maximum],
      ] as const)),
  ];
  return Object.freeze({ fy: input.fy, amount, threshold, minimum: rules.minimum.value, maximum, consumed: Object.freeze(consumed) });
};

// --- Division 293 (T21) ------------------------------------------------------------------------

const DIVISION_293 = {
  threshold: {
    ...DIV_293,
    kind: 'constant',
    everyYear: true,
    value: toCents(250_000),
    note:
      'T21 — CONFIRMED frozen, on three independent grounds, not merely "no provision found": no ' +
      'indexation language anywhere in any of the 30 sections of Div 293; absent from the ' +
      's 960-265 table that s 960-270(1) makes the gateway, while the concessional cap (item 9), ' +
      'the CGT cap (10), the transfer balance cap (10A), BOTH Div 296 thresholds (10B, 10C) and ' +
      'the low rate cap (11) are all listed; and it has only ever moved by textual amendment ' +
      '($300,000 to $250,000, No 81 of 2016 Sch 2 items 14-18, rewriting all five occurrences at ' +
      'once). Never index it: the nominal creep is the behaviour, not a bug. This freeze is ' +
      'WEAKER than the ITAA 1936 s 160APHT $5,000 small shareholder exemption\'s and the two must ' +
      'not be filed under one label — s 293-20 is live, amendable law and indexing it needs one ' +
      'new item in the s 960-265 table, whereas the $5,000 sits in a provision repealed in 2006 ' +
      'and imported as a frozen 30 June 2002 snapshot, structurally incapable of indexation.',
  } satisfies Money,
  rate: {
    ...DIV_293,
    kind: 'constant',
    everyYear: true,
    value: 0.15,
    note:
      'Imposition Act s 5: 15% of *taxable contributions* — the min() output of s 293-20(1) — and ' +
      'never of the low tax contributions as a whole. Multiplying the whole of them overstates ' +
      'the tax for every Person inside the shade-in band.',
  } satisfies Rate,
  incomeBase: {
    ...DIV_293,
    kind: 'constant',
    everyYear: true,
    value: 'income for surcharge purposes (disregarding reportable superannuation contributions) plus low tax contributions',
    note:
      'T9 — a fifth income base, tracked separately from taxable income and Rebate Income. ' +
      's 995-1(1) decomposes into four additive limbs — (a) taxable income, (b) reportable fringe ' +
      'benefits total, (c) reportable superannuation contributions, (d) total net investment loss ' +
      '— less the s 301-20(3) amount, with two disregards inside (a): the assessable FHSS ' +
      'released amount (subtracts) and the ITAA 1936 Sch 2F s 271-105(1) reduction (adds back). ' +
      'Div 293 then disregards limb (c). Limb (c) is reportable superannuation contributions — ' +
      'RESC plus Subdiv 290-C deductions, reduced not below zero by the excess concessional — ' +
      'NOT "reportable employer" contributions. Four components are Settings the forecaster ' +
      'cannot derive: the reportable fringe benefits total, the above-SG employer remainder, and ' +
      'each of the two net investment loss silos.',
  } satisfies Constant<string>,
  taxableContributions: {
    ...DIV_293,
    kind: 'constant',
    everyYear: true,
    value: 'the lesser of low tax contributions and the excess over the threshold',
    note:
      'A TAPER, not a cliff. s 293-20(1) charges the LESSER of the two, so at a sum of $250,001 ' +
      'the tax is 15 cents, and the shade-in band is exactly as wide as the Person\'s low tax ' +
      'contributions. The ATO\'s own worked example: $240,000 of income and $15,000 of ' +
      'contributions gives $750, not the $2,250 a cliff would charge — three times too much. ' +
      's 293-20(2) is a redundancy guard, not a step: min(0, excess) is already nil.',
  } satisfies Constant<string>,
  lowTaxContributions: {
    ...DIV_293,
    kind: 'constant',
    everyYear: true,
    value: 'low tax contributed amounts (s 293-30) less excess concessional contributions (s 293-25)',
    note:
      'The excess is subtracted because it is separately in the Person\'s assessable income under ' +
      'Div 291 — s 293-10 says "the tax is not payable in respect of excess concessional ' +
      'contributions". The counter-intuitive consequence: using carry-forward headroom INCREASES ' +
      'Div 293 exposure, because a larger cap makes a smaller excess, so more survives into the ' +
      'low tax contributions. ATO: "if your concessional contributions cap has increased due to ' +
      'the use of carried-forward amounts, all contributions included in your higher cap amount ' +
      'are counted for Division 293 purposes."',
  } satisfies Constant<string>,
  lowTaxContributedAmountDivergence: {
    ...DIV_293_INFERRED,
    kind: 'constant',
    everyYear: true,
    value: 'the s 291-25 and s 293-30 exclusion lists differ in both directions, so low tax contributed amounts are only NEARLY the concessional contributions',
    note:
      'P3-5 U1. Primary-verified that the two lists differ: s 293-30(4)(c) excludes an SGAA Pt 8 ' +
      'amnesty charge payment that s 291-25 does not, and s 291-25(2)(e) excludes a SIS Act ' +
      // The clause order here is load-bearing. test/import-graph.test.mjs finds import specifiers
      // with a deliberately blunt regex that reads straight across a string concatenation, so any
      // concatenated line ENDING in the word that introduces a module specifier makes the
      // following ` +` parse as one and fails the layering test. Keep that word mid-line.
      's 99G(6) refunded amount that s 293-30(4) has no counterpart for. What is INFERRED is the ' +
      'consequence, drawn from the absence of a matching paragraph rather than stated in terms: ' +
      'that such a refund stays a low tax contributed amount while ceasing to be concessional, ' +
      'so "concessional less excess" would UNDERSTATE Div 293 in that year. SIS Act s 99G was ' +
      'not retrieved and no ATO or explanatory material addresses the asymmetry. Both amounts ' +
      'can only enter this model through `otherConcessional`, which is itself unenumerated.',
  } satisfies Constant<string>,
  modifiedLowTaxContributions: {
    ...DIV_293,
    kind: 'constant',
    everyYear: true,
    value: 'modified by Subdiv 293-D (defined benefit interests), Subdiv 293-E (constitutionally protected State higher level office holders) and Subdiv 293-F (Commonwealth justices)',
    note:
      's 293-25 Notes 1 and 2. Different machinery from Subdiv 291-C, which modifies concessional ' +
      'contributions for the same interests — so for a Person with a defined benefit interest one ' +
      'cannot be computed from the other. P3-5 U2: none of the three Subdivisions was retrieved ' +
      'beyond ss 293-155 and 293-200, so this model refuses such a Person rather than treating ' +
      'them as an accumulation-only member.',
  } satisfies Constant<string>,
};

// --- Division 296 (T11, T12, T15, T16) ---------------------------------------------------------

/**
 * T16. For 2026-27 only, transitional s 296-1(2) strikes out the opening limb of s 296-40(2):
 * the test uses the end-of-year balance alone. From 2027-28 it is `max(opening, closing)`.
 * A single rule applied to every year is wrong in the first year — the one most likely to be
 * hand-checked.
 */
export const div296TotalSuperBalanceReference = (fy: FinancialYear, opening: Cents, closing: Cents): Cents =>
  fy === '2026-27' ? closing : (Math.max(opening, closing) as Cents);

const DIVISION_296 = {
  applicationYear: {
    ...DIV_296,
    kind: 'config',
    fy: '2026-27',
    value: '2026-27',
    note: 'T12 — Sch 1 of C2026A00008 commenced 1 Apr 2026, but the first income year it applies to is 2026-27 (ITTPA 1997 s 296-1(1)). A commencement date in the assumptions object produces a liability three months early.',
  } satisfies Assumption<string>,
  commencementDate: {
    ...DIV_296,
    kind: 'constant',
    effective: '2026-04-01',
    value: '2026-04-01',
    note: 'Recorded so it is not mistaken for the application year. Nothing may compute from it.',
  } satisfies Constant<string>,
  largeBalanceThreshold: {
    ...DIV_296,
    kind: 'config',
    fy: '2026-27',
    value: toCents(3_000_000),
    note: 'T11 — plateaus, then steps $150,000. Never model it as smooth annual escalation.',
  } satisfies Money,
  veryLargeBalanceThreshold: {
    ...DIV_296,
    kind: 'config',
    fy: '2026-27',
    value: toCents(10_000_000),
    note: 'T11 — plateaus, then steps $500,000.',
  } satisfies Money,
  baseRate: { ...DIV_296, kind: 'constant', everyYear: true, value: 0.15 } satisfies Rate,
  additionalRate: {
    ...DIV_296,
    kind: 'constant',
    everyYear: true,
    value: 0.1,
    note: 'T15 — this is an additional slice on the SAME total earnings figure, not a marginal band. ss 296-40 and 296-45 each take a proportion of one earnings base; the universal "30% / 40%" commentary framing reconciles below $10m and is wrong above it.',
  } satisfies Rate,
  earningsBasis: {
    ...DIV_296,
    kind: 'constant',
    everyYear: true,
    value: 'realised — from the fund taxable income. Unrealised gains are NOT included as enacted (s 296-60(1)).',
  } satisfies Constant<string>,
  totalSuperBalanceReference: {
    ...DIV_296,
    kind: 'config-derived',
    fy: '2026-27',
    value: div296TotalSuperBalanceReference,
    derivation: '2026-27: the 30 June 2027 balance alone (transitional s 296-1(2)). From 2027-28: max(opening, closing) (s 296-40(2)).',
    note: 'T16.',
  } satisfies Formula<typeof div296TotalSuperBalanceReference>,
  totalSuperBalanceAfterDeath: {
    ...DIV_296,
    kind: 'constant',
    everyYear: true,
    value: toCents(0),
    note: 'ITAA 1997 s 296-50 — taken to be nil.',
  } satisfies Money,
  exclusions: {
    ...DIV_296,
    kind: 'constant',
    everyYear: true,
    value: 'child recipient of a superannuation income stream at any time in the year; a structured settlement contribution ever made (ss 296-20, 296-25)',
  } satisfies Constant<string>,
  percentageRounding: {
    ...DIV_296,
    kind: 'constant',
    everyYear: true,
    value: '2 decimal places, rounding up where the third decimal is 5 or more',
  } satisfies Constant<string>,
  transitionalNetCapitalGainFactor: {
    '2026-27': {
      source: 'Income Tax (Transitional Provisions) Act 1997 s 296-60(2) · reg 296-60.01 of the Income Tax Assessment (1997 Act) Regulations 2021 (inserted by F2026L00726, repealed 2026-09-09 as spent; the rule now sits in the 2021 Regulations)',
      retrieved: '2026-09-03',
      confidence: 'primary-verified',
      registerSection: '§3.7',
      kind: 'config',
      fy: '2026-27',
      value: 0.2,
      note: 'Does not apply to a small superannuation fund (s 296-60(3)); SMSFs get a cost-base reset at 30 Jun 2026 instead.',
    } satisfies Rate,
    '2027-28': {
      source: 'Income Tax (Transitional Provisions) Act 1997 s 296-60(2) · reg 296-60.01 of the Income Tax Assessment (1997 Act) Regulations 2021 (inserted by F2026L00726, repealed 2026-09-09 as spent; the rule now sits in the 2021 Regulations)',
      retrieved: '2026-09-03',
      confidence: 'primary-verified',
      registerSection: '§3.7',
      kind: 'config',
      fy: '2027-28',
      value: 0.4,
    } satisfies Rate,
    '2028-29': {
      source: 'Income Tax (Transitional Provisions) Act 1997 s 296-60(2) · reg 296-60.01 of the Income Tax Assessment (1997 Act) Regulations 2021 (inserted by F2026L00726, repealed 2026-09-09 as spent; the rule now sits in the 2021 Regulations)',
      retrieved: '2026-09-03',
      confidence: 'primary-verified',
      registerSection: '§3.7',
      kind: 'config',
      fy: '2028-29',
      value: 0.6,
    } satisfies Rate,
    '2029-30': {
      source: 'Income Tax (Transitional Provisions) Act 1997 s 296-60(2) · reg 296-60.01 of the Income Tax Assessment (1997 Act) Regulations 2021 (inserted by F2026L00726, repealed 2026-09-09 as spent; the rule now sits in the 2021 Regulations)',
      retrieved: '2026-09-03',
      confidence: 'primary-verified',
      registerSection: '§3.7',
      kind: 'config',
      fy: '2029-30',
      value: 0.8,
      note: 'Spent from 2030-31 — no discount applies after this year.',
    } satisfies Rate,
  },
};

// --- Fund tax and access constants -------------------------------------------------------------

const FUND_TAX = {
  contributionsTax: {
    source: 'Income Tax Rates Act 1986 s 26(1)(a)',
    retrieved: '2026-09-03',
    confidence: 'primary-verified',
    registerSection: '§3.1',
    kind: 'constant',
    everyYear: true,
    value: 0.15,
    note: 'The fund low tax component rate. Never wire it to a marginal rate — Div 293 adds its second 15% separately.',
  } satisfies Rate,
  nonArmsLengthRate: {
    source: 'Income Tax Rates Act 1986',
    retrieved: '2026-09-03',
    confidence: 'primary-verified',
    registerSection: '§3.1',
    kind: 'constant',
    everyYear: true,
    value: 0.45,
  } satisfies Rate,
  earningsTaxAccumulation: {
    source: 'ITAA 1997',
    retrieved: '2026-09-03',
    confidence: 'primary-verified',
    registerSection: '§3.1',
    kind: 'constant',
    everyYear: true,
    value: 0.15,
    note: 'Accumulation Phase and TTR alike.',
  } satisfies Rate,
  earningsTaxRetirement: {
    source: 'ITAA 1997 ss 295-385, 295-390 (ECPI)',
    retrieved: '2026-09-03',
    confidence: 'primary-verified',
    registerSection: '§3.1',
    kind: 'constant',
    everyYear: true,
    value: 0,
  } satisfies Rate,
};

export interface MinimumDrawdownBand {
  /** Lowest age the factor applies to. */
  readonly fromAge: number;
  readonly factor: number;
}

/**
 * Sch 7 cl 4A/4B — the GFC and COVID drawdown relief, as an exact rational so it can be applied
 * inside the single cl 5 rounding rather than through a float.
 */
/**
 * One row of SISR Schedule 1, Part 1, as the instrument writes it: column 1 the item number,
 * column 2 the condition of release, column 3 the cashing restriction. Kept as three strings
 * rather than a number and an enum because `102A` is not a number and `Nil` is the instrument’s
 * word, not a zero.
 */
export interface Schedule1CashingItem {
  readonly item: string;
  readonly condition: string;
  readonly cashingRestriction: string;
}

export interface MinimumDrawdownRelief {
  readonly numerator: number;
  readonly denominator: number;
}

const HALVED: MinimumDrawdownRelief = { numerator: 1, denominator: 2 };
const THREE_QUARTERS: MinimumDrawdownRelief = { numerator: 3, denominator: 4 };

const ACCESS_RULES = {
  preservationAge: {
    ...ACCESS,
    kind: 'constant',
    everyYear: true,
    value: 60,
    note: '60 for everyone now. Reaching it releases nothing by itself — the Condition of Release does.',
  } satisfies Assumption<number>,
  conditionOfRelease: {
    ...ACCESS,
    kind: 'constant',
    everyYear: true,
    value: 'a boolean per Person, independent of age — ceasing gainful employment after 60, or turning 65',
    note: 'Structural. Setting it to `age >= 60` is a P13-5 mutation: a Person of 60–64 still working must be blocked, and the same Person at 65 released regardless of work status.',
  } satisfies Constant<string>,
  automaticReleaseAge: {
    ...ACCESS,
    kind: 'constant',
    everyYear: true,
    value: 65,
    note:
      'The second limb of the register §3.9 Condition of Release row — "or turning 65" — given a ' +
      'number of its own so nothing has to hard-code one. It is the only age that releases super ' +
      'by itself; `preservationAge` is not, and the two are deliberately separate records so a ' +
      'reader cannot slide from one to the other.',
  } satisfies Assumption<number>,
  conditionOfReleaseItems: {
    ...SISR_SCH1,
    kind: 'constant',
    everyYear: true,
    value: [
      { item: '101', condition: 'Retirement', cashingRestriction: 'Nil' },
      { item: '102', condition: 'Death', cashingRestriction: 'Nil' },
      { item: '102A', condition: 'Terminal medical condition', cashingRestriction: 'Nil' },
      { item: '103', condition: 'Permanent incapacity', cashingRestriction: 'Nil' },
      { item: '106', condition: 'Attaining age 65', cashingRestriction: 'Nil' },
    ],
    note:
      'Register §3.9’s Condition of Release row, from 2026-09-09: the Schedule 1 ITEM as well as ' +
      'the boolean. s 307-80(3)(b) turns on which item was satisfied, so the item identity decides ' +
      'the phase question (§3.10) and a `met` that carries no item cannot answer it. Column 3 is ' +
      '"Nil" for all five, which is what makes them the nil-cashing set reg 6.01(2)’s "unless" ' +
      'limb turns off the TTR 10% ceiling for. This model reaches only two of them: item 106 by ' +
      'age, and item 101 by the employment ground under reg 6.01(7)(b)(i) — see ' +
      '`retirementItemMapping`. Items ' +
      '102, 102A and 103 are carried because the set is what makes the gap countable, not because ' +
      'anything computes them.',
  } satisfies Constant<readonly Schedule1CashingItem[]>,
  automaticReleaseAgeItem: {
    ...SISR_SCH1,
    kind: 'constant',
    everyYear: true,
    value: '106',
    note:
      '§3.9’s second limb — "or turning 65" — is Schedule 1 item 106, "Attaining age 65", and ' +
      'THAT mapping is primary-verified: the item states the age and nothing else, so there is no ' +
      'definition elsewhere for it to depend on. Its own record so the item number is never ' +
      'written into `core/`, exactly as `automaticReleaseAge` keeps the 65 out. Contrast ' +
      '`retirementItemMapping`, which needed reg 6.01(7) as well as the Schedule to answer.',
  } satisfies Constant<string>,
  retirementItemMapping: {
    ...SISR_REG_6_01_7,
    kind: 'constant',
    everyYear: true,
    value: { item: '101', ageAtCessation: 60 },
    note:
      'The employment ground — "ceasing gainful employment after Preservation Age" — is Schedule 1 ' +
      'item 101 (Retirement). reg 6.01(7): "For the purposes of Schedule 1, the retirement of a ' +
      'person is taken to occur: … (b) in the case of a person who has attained the age of 60 - an ' +
      'arrangement under which the member was gainfully employed has come to an end, and either of ' +
      'the following circumstances apply: (i) the person attained that age on or before the ending ' +
      'of the employment; or (ii) the trustee is reasonably satisfied that the person intends never ' +
      'to again become gainfully employed, either on a full-time or a part-time basis." ' +
      '`ageAtCessation` is paragraph (b)(i)\'s 60, and it is the ONLY route this model maps: it needs ' +
      'no fact beyond the day employment ended. The two routes that turn on the trustee being ' +
      'satisfied of an intention never to work again are NOT mapped, because the model holds no such ' +
      'fact: paragraph (a), for a preservation age under 60 (Preservation Age is 60 here, so it cannot ' +
      'arise, and `conditionOfRelease.ts` refuses to load if it ever could), and paragraph (b)(ii), a ' +
      'Person who stopped work before 60 — which `CessationBeforePreservationAgeError` still refuses. ' +
      'The item decides s 307-80(3)(b): a Person on item 101 is on the (b)(ii) notification limb.',
  } satisfies Constant<{ readonly item: string; readonly ageAtCessation: number }>,
  ttrMaximumDrawdown: {
    ...SISR_TRIS,
    kind: 'constant',
    everyYear: true,
    value: 0.1,
    note:
      'reg 6.01(2)(b)(ii): total payments in a financial year of "no more than 10% of the pension ' +
      'account balance" on 1 July, or on the commencement day in the year the pension commences. ' +
      'Flat, never indexed, and **the mirror image of the minimum in nothing else**: it is not ' +
      'pro-rated for a part year, not rounded to $10, does not vary with age, is not switched off ' +
      "by Sch 7 cl 4's 1 June nil rule and takes the plain account balance without cl 1(2)(b)'s " +
      'withdrawal-benefit substitution — Schedule 7\'s machinery is confined to Schedule 7. The ' +
      'reading of those negatives is `ttrMaximumUnadjusted`, which is where their confidence ' +
      'lives. The limb falls away entirely once the pensioner meets a nil-cashing-restriction ' +
      'Condition of Release ("unless" in reg 6.01(2)), which is the conversion limb of P3-8.',
  } satisfies Rate,
  ttrMaximumUnadjusted: {
    ...SISR_TRIS_ABSENCE,
    kind: 'constant',
    everyYear: true,
    value:
      'the 10% maximum is not pro-rated for a part year, not rounded to $10, does not vary with ' +
      'age, and is not switched off where the income stream commenced on or after 1 June',
    note:
      'Sch 7 cl 3 pro-rates "the minimum total payment" and cl 5 rounds "an amount determined ' +
      'under this Schedule"; the maximum is determined under reg 6.01(2), so neither clause ' +
      'reaches it, and reg 6.01(2) supplies no replacement. That is an argument from the absence ' +
      'of a provision (P3-8 U1) — corroborated explicitly and three ways by ATO guidance, with no ' +
      'competing reading found, but corroborated by nothing primary. An ATO ruling, or the ' +
      'Explanatory Statement to the 2005 regulation that inserted the TRIS definition, would ' +
      'close it; neither was retrieved. Consumed by every TTR maximum, because the number a ' +
      'maximum reports *is* the unadjusted one — in a commencement year Schedule 7\'s machinery ' +
      'would give a visibly different answer ($50,000 against $37,397 on a 1 October start), and ' +
      'the difference rests on this reading rather than on a provision.',
  } satisfies Constant<string>,
  ttrMinimumDrawdown: {
    ...ACCESS,
    kind: 'constant',
    everyYear: true,
    value: 0.04,
    note:
      '**Understates the rule, and nothing in `src/` consumes it — do not start.** A TRIS carries ' +
      'the whole of Schedule 7, pulled in by reg 6.01(2)(b)(i) → reg 1.06(9A): the minimum is the ' +
      'full age-banded table, pro-rated, rounded and nil for a June commencement, exactly like ' +
      'any other account-based pension. 4% is merely the band that applies below 65. The floor of ' +
      'a TTR payment range is `minimumDrawdown(...)` reading `minimumDrawdownFactors`; a second ' +
      '4% in the codebase would drift from the table and would be wrong the moment a TRIS is held ' +
      'at 65. **Register §3.9 was corrected on 2026-09-09** (P3-8 D2): its row now reads "the whole ' +
      'of Schedule 7", and the superseded "4% (under 65)" is preserved there marked corrected. This ' +
      'record is kept rather than deleted, and kept at 0.04, because the guard is what makes it ' +
      'safe: a test asserts nothing under src/ imports it, and a record nobody consumes cannot ' +
      'drift, while a deleted one takes the guard with it and leaves the next reader to reinvent ' +
      'the flat 4% from the register\'s own history.',
  } satisfies Rate,
  benefitsFromATaxedSourceAt60: {
    ...ACCESS,
    kind: 'constant',
    everyYear: true,
    value: 'tax-free, no PAYG',
  } satisfies Constant<string>,
  benefitsFromATaxedSourceFromAge: {
    ...ACCESS,
    kind: 'constant',
    everyYear: true,
    value: 60,
    note:
      'The "60+" of the record above, given a number of its own so no consumer has to write one. ' +
      'Register §3.9: "Benefits from a taxed source at 60+ — tax-free, no PAYG". It is a TAX age ' +
      'and it is deliberately a THIRD record beside `preservationAge` and `automaticReleaseAge`, ' +
      'not a second reading of either: those two decide whether a benefit may be PAID (SIS), this ' +
      'one decides what it is TAXED at (ITAA 1997 Div 301). They happen to share the number 60 ' +
      'with preservation age today and they answer different questions, so a consumer that read ' +
      'the release age for a tax test would be right by coincidence and wrong the moment one of ' +
      'them moves. **Below it nothing here says what the tax IS**: that needs the taxable/tax-free ' +
      'component split (ss 301-20, 307-345, the low rate cap), which this model does not hold — ' +
      'see `LumpSumBelowTaxFreeAgeError` in `src/core/superLumpSum.ts`, which refuses rather than ' +
      'guessing it.',
  } satisfies Assumption<number>,
  minimumDrawdownFactors: {
    ...ACCESS,
    kind: 'constant',
    fy: '2026-27',
    value: [
      { fromAge: 0, factor: 0.04 },
      { fromAge: 65, factor: 0.05 },
      { fromAge: 75, factor: 0.06 },
      { fromAge: 80, factor: 0.07 },
      { fromAge: 85, factor: 0.09 },
      { fromAge: 90, factor: 0.11 },
      { fromAge: 95, factor: 0.14 },
    ],
    note:
      'SIS Regs 1994 Sch 7 table. The bands are the whole rule this record carries; every '  +
      'adjustment around them lives in its own record and its own clause. Corrected 2026-09-09: '  +
      'this note previously read "applied to the 1 July balance, rounded to $10, pro-rated for '  +
      'part-years", which is the superseded register §3.9 sentence. A commencement year takes the '  +
      'COMMENCEMENT-DAY balance with the full annual factor (cl 1(2)(a)(ii)); the rounding is to '  +
      'the nearest $10 with ties UP (cl 5), applied ONCE and LAST, after the cl 3 pro-rate; the '  +
      'pro-rate counts DAYS that include and follow the commencement day; and the factor is chosen '  +
      'on age at the COMMENCEMENT DAY, not at 1 July. The cl 4 nil for an income stream commencing '  +
      'on or after 1 June is real and lives in `minimumDrawdownNilFrom`.',
  } satisfies Assumption<readonly MinimumDrawdownBand[]>,
  minimumDrawdownRoundingStep: {
    ...SISR_SCH7,
    kind: 'constant',
    everyYear: true,
    value: toCents(10),
    note:
      'Sch 7 cl 5, in full: "An amount determined under this Schedule is to be rounded to the ' +
      'nearest 10 whole dollars. If the amount ends in an exact 5 dollars, it is to be rounded up ' +
      'to the next 10 whole dollars." Nearest with ties up — not a ceiling: $987,654.32 at 5% is ' +
      '$49,380, not $49,390. And it is "an amount determined under this Schedule", so it fires ' +
      'once, after cl 3 has pro-rated, never on the un-pro-rated annual figure.',
  } satisfies Money,
  minimumDrawdownNilFrom: {
    ...SISR_SCH7,
    kind: 'constant',
    everyYear: true,
    value: '06-01',
    note:
      'Sch 7 cl 4: "If the commencement day of the annuity or pension is on or after 1 June in a ' +
      'financial year, no payment is required to be made for that financial year." Month and day ' +
      'in the second calendar year of the financial year. Operative, not permissive — contrast ' +
      'reg 1.06(9) for a market-linked pension — so a 1 June commencement is itself nil.',
  } satisfies Constant<string>,
  minimumDrawdownProRataDenominator: {
    ...SISR_SCH7_DENOMINATOR,
    kind: 'constant',
    everyYear: true,
    value: 'the number of days in the financial year — 365, or 366 where it contains 29 February',
    note:
      'Sch 7 cl 3 states only the numerator — "the number of days in the financial year that ' +
      'include and follow the commencement day" — and never says what it is a proportion of. The ' +
      'ATO supplies 365/366 (P3-10 U2). Only a part-year minimum consumes this, which is why it ' +
      'is a record of its own: a full-year minimum does not depend on it and must not carry its ' +
      'confidence.',
  } satisfies Constant<string>,
  minimumDrawdownRelief: {
    ...SISR_SCH7,
    kind: 'config',
    fy: '2026-27',
    value: {
      '2008-09': HALVED,
      '2009-10': HALVED,
      '2010-11': HALVED,
      '2011-12': THREE_QUARTERS,
      '2012-13': THREE_QUARTERS,
      '2019-20': HALVED,
      '2020-21': HALVED,
      '2021-22': HALVED,
      '2022-23': HALVED,
    },
    note:
      'Sch 7 cll 4A and 4B — half, and 75%, of the cl 1 amount for the named years and no others. ' +
      'Both are closed enumerations, not sunset clauses: they were extended five times by adding ' +
      'a year, last by F2022L00498 (2 April 2022), and FY2026-27 is in neither list, so its ' +
      'multiplier is 1. Kept as a slot rather than deleted as spent history — the shape of a ' +
      'shock to this number is settled (a year-keyed multiplier on the formula output, applied ' +
      "before the cl 5 rounding, never a change to the table), so the next relief year is a data " +
      'change. A year that is absent gets the full amount, which is what the enumerations mean. ' +
      'Stamped FY2026-27 because that is the compilation the list was read from: using it for ' +
      'another year is applying this list to that year, and the provenance says so.',
  } satisfies Assumption<Readonly<Record<string, MinimumDrawdownRelief>>>,
  totalSuperBalanceDefinition: {
    source: 'ITAA 1997 s 307-230A, inserted by C2026A00008 Sch 2',
    retrieved: '2026-09-03',
    confidence: 'primary-verified',
    registerSection: '§3.8',
    kind: 'constant',
    effective: '2026-07-01',
    value: 'the total superannuation benefits that would become payable if the Person voluntarily caused the interest to cease',
    note: 'A withdrawal-benefit test, replacing the repealed accumulation phase value. For ordinary Accumulation Phase accounts and Account-Based Pensions it is the account balance — but it now feeds the bring-forward test, the carry-forward test and Division 296 alike.',
  } satisfies Constant<string>,
};

// --- The downsizer contribution — ITAA 1997 s 292-102 (P9-5) --------------------------------------
// Moved here from `core/parsePlan.ts`'s three literals (2026-09-30), unchanged in value, so the
// rules-in-force panel can show them and a refresh finds them in the one tree.

const ITAA97_292_102 = {
  source: 'ITAA 1997 s 292-102 (ATO legal database PAC/19970038/292-102) · ATO "Downsizer super contributions" (dateModified 2026-04-23)',
  retrieved: '2026-09-25',
  confidence: 'primary-verified',
  registerSection: '§3.12',
} as const;

const DOWNSIZER = {
  minimumAge: {
    ...ITAA97_292_102,
    kind: 'constant',
    everyYear: true,
    value: 55,
    note: 's 292-102(1)(a): 55 or older when the contribution is made.',
  } satisfies Constant<number>,
  cap: {
    ...ITAA97_292_102,
    kind: 'constant',
    everyYear: true,
    value: toCents(300_000),
    note: 's 292-102(3)(a): per Person, in dollars of the day — the Act does not index it.',
  } satisfies Money,
  windowDays: {
    ...ITAA97_292_102,
    kind: 'constant',
    everyYear: true,
    value: 90,
    note: 's 292-102(1)(g): within 90 days after the change of ownership. The Commissioner\'s extension is not modelled.',
  } satisfies Constant<number>,
};

export const SUPERANNUATION = deepFreeze({
  caps: CAPS,
  capIndexation: {
    ...CAP_SPECS,
    awoteBaseQuarterIndexNumber: AWOTE_BASE_QUARTER_INDEX,
    awoteLatestPublishedQuarterIndexNumber: AWOTE_LATEST_PUBLISHED_QUARTER_INDEX,
    cpiDecemberQuarterIndexNumbers: CPI_DECEMBER_QUARTER_INDEX_NUMBERS,
    cpiReferenceBase: CPI_REFERENCE_BASE,
  },
  bringForward: BRING_FORWARD,
  carryForward: CARRY_FORWARD,
  superGuarantee: SUPER_GUARANTEE,
  lowIncomeSuperTaxOffset: LOW_INCOME_SUPER_TAX_OFFSET,
  division293: DIVISION_293,
  division296: DIVISION_296,
  fundTax: FUND_TAX,
  access: ACCESS_RULES,
  downsizer: DOWNSIZER,
});
