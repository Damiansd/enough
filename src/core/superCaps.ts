// P3-4 — the contribution caps: concessional, non-concessional, carry-forward, bring-forward.
// Register §3.1–§3.4, §3.8. Every figure and every derivation comes from
// `data/assumptions/super.ts`; a dollar amount appearing below as a literal is a bug.
//
// Four things here are shape rather than arithmetic, and each one is a trap the register names.
//
//   * **Indexation is never re-implemented and never chained** (T13). `indexCap` lives in the
//     assumptions layer, takes the cap's own `CapIndexationSpec`, and is called with the base
//     amount and the base-quarter index number every year. There is no code path that reads last
//     year's cap: `concessionalContributionsCap` does not take a previous cap, has no memory, and
//     computing FY2027-28 does not require FY2026-27 to have been computed first.
//
//   * **The index number is per year and per index, and it is never extrapolated** (T14). It
//     arrives as a `DecemberQuarterIndex`, which derives its own quarter from the financial year
//     it indexes, so an AWOTE figure cannot be filed against the wrong quarter. A year with no
//     number throws `MissingIndexNumberError` rather than growing the last one by an assumed rate.
//
//     ⚠️ **`forecastAwoteIndexNumbers` grows the last published level by a rate, and that is not a
//     hole in the sentence above — it is where the sentence draws its line (P6-12, 2026-09-21).**
//     The rate is the CALLER's Setting (register O5), never a figure this module or the register
//     holds; the grown level is stamped `unverified`, so every cap computed from it says so; and
//     the *cap* is still indexed cumulatively from the base amount and the base quarter, never from
//     last year's cap. What `concessionalContributionsCap` will not do is invent a number when none
//     is supplied — and it still does not.
//
//   * **A CPI factor is never computed from a mixed reference base** (O41). O11 closed on
//     2026-09-09: the December quarter CPI numbers are in the register, and the same s 960-285
//     arithmetic now reproduces all nine published general Transfer Balance Caps, 2018-19 through
//     2026-27. What survived the closure is the reference base. The ABS re-referenced the series,
//     the superseded base has no Dec 2025 number at all, and the two bases already differ in the
//     third decimal of the factor in four published years — a thousandth of which is $1,600. So
//     `generalTransferBalanceCap` takes a **`CpiSeries`**, not a list of loose index numbers, and
//     both halves of the factor are read out of that one series: a mixed pair is not something
//     this API can express. The register's own series is the default, so the caps that follow from
//     it need no argument at all.
//
//   * **The Total Super Balance carries the date it was measured at** (§3.8). Both tests in this
//     file are taken "just before the start of the financial year", and both changed definition on
//     1 July 2026. `totalSuperBalance` refuses to build one for an earlier date, because the
//     repealed accumulation phase value construct is not in the register; and every function that
//     reads one checks it against the year being computed, so last year's balance in this year's
//     test is an error rather than a plausible number.
import { addCents, mulCents, subCents, toCents } from './money.js'; // `.js` is correct in a `.ts` file — see tsconfig.json
import type { Cents } from './money.js';
import { assertIsoDate, ageAt } from './household.js';
import {
  compareFinancialYears,
  financialYearContaining,
  financialYearStartYear,
  financialYearsBefore,
  justBeforeFinancialYear,
  startOfFinancialYear,
  toFinancialYear,
} from './financialYear.js';
import { mergeProvenance, provenanceOf } from './provenance.js';
import type { ComputedProvenance, Consumed } from './provenance.js';
import {
  SUPERANNUATION,
  bringForwardArrangement,
  cpiIndexNumberAt,
  indexCap,
  indexCapFromCpiSeries,
} from '../data/assumptions/super.js';
import type { CpiSeries } from '../data/assumptions/super.js';
import type { Confidence, FinancialYear, IsoDate } from '../data/assumptions/types.js';

const CAPS = SUPERANNUATION.caps;
const SPECS = SUPERANNUATION.capIndexation;
const BRING_FORWARD = SUPERANNUATION.bringForward;
const CARRY_FORWARD = SUPERANNUATION.carryForward;
const TSB_DEFINITION = SUPERANNUATION.access.totalSuperBalanceDefinition;
const CPI_INDEX_NUMBERS = SPECS.cpiDecemberQuarterIndexNumbers;
const CPI_REFERENCE_BASE = SPECS.cpiReferenceBase;

// --- The caps, as three types that cannot stand in for one another ------------------------------
//
// The same trick `incomeBases.ts` plays on the income bases (P3-2 — five of them, and six brands,
// from FY2027-28: register T9), for the same reason: all
// three are dollar amounts, all three are per Person per year, and two of them are within a factor
// of four of each other. A non-concessional cap handed to a concessional test is a wrong number
// that looks entirely reasonable; here it is a compile error.

declare const CONCESSIONAL_CAP: unique symbol;
declare const NON_CONCESSIONAL_CAP: unique symbol;
declare const TRANSFER_BALANCE_CAP: unique symbol;

/** ITAA 1997 s 291-20(2). AWOTE-indexed in $2,500 steps from $25,000 / Dec 2016. */
export type ConcessionalCap = Cents & { readonly [CONCESSIONAL_CAP]: true };

/** ITAA 1997 s 292-85(2)(a). Four times the concessional cap — not separately indexed. */
export type NonConcessionalCap = Cents & { readonly [NON_CONCESSIONAL_CAP]: true };

/** ITAA 1997 s 294-35(3). CPI-indexed in $100,000 steps from $1,600,000 / Dec 2016. */
export type GeneralTransferBalanceCap = Cents & { readonly [TRANSFER_BALANCE_CAP]: true };

/**
 * ITAA 1997 s 292-85(2)(a): the non-concessional cap is **4 ×** the concessional cap.
 *
 * The multiple used to be written here as a literal, because the register carried it only inside
 * the words of `caps.nonConcessional.derivation` and there was nothing numeric to read. That is a
 * figure declared twice — once in prose and once in code — and the copy in code agrees with the
 * prose until the day it does not, which is T14 exactly. `caps.nonConcessionalMultiple` is now a
 * record of its own; the derivation prose stays where it was, for the reader, and this binding
 * reads the number. It is still checked at every call against the register's own published pair
 * ($32,500 and $130,000 for FY2026-27), so a wrong multiple cannot survive the year the register
 * publishes both figures.
 */
const NON_CONCESSIONAL_MULTIPLE = CAPS.nonConcessionalMultiple;

// --- Index numbers — supplied, never invented ---------------------------------------------------

/**
 * The index number for the quarter ending 31 December immediately before a financial year
 * (s 960-285(5)), with its own confidence.
 *
 * Historical figures are published (ATO Table 40 for AWOTE, ABS 6401.0 for CPI) and are
 * `primary-verified`. Anything past the last published quarter is a **forecast** and is a Setting,
 * not an assumption (register O5, `SETTINGS_NOT_ASSUMPTIONS['economic.awote']`) — supplied as
 * `unverified`, so every cap computed from it arrives saying so.
 */
export interface DecemberQuarterIndex {
  readonly index: 'AWOTE' | 'CPI';
  /** The financial year this number indexes. */
  readonly fy: FinancialYear;
  /** Derived from `fy`, never supplied — so a number cannot be filed against the wrong quarter. */
  readonly quarter: IsoDate;
  readonly indexNumber: number;
  readonly confidence: Confidence;
  readonly source: string;
}

export type IndexNumbers = readonly DecemberQuarterIndex[];

/** `2026-27` → `2025-12-31`. s 960-285(5): the quarter ending 31 December immediately before the year. */
export const decemberQuarterBefore = (fy: FinancialYear): IsoDate =>
  `${financialYearStartYear(fy) - 1}-12-31` as IsoDate;

export const decemberQuarterIndex = (input: {
  readonly index: 'AWOTE' | 'CPI';
  readonly fy: FinancialYear;
  readonly indexNumber: number;
  readonly confidence: Confidence;
  readonly source: string;
}): DecemberQuarterIndex => {
  if (!Number.isFinite(input.indexNumber) || input.indexNumber <= 0) {
    throw new RangeError(`not an index number: ${input.indexNumber}`);
  }
  return Object.freeze({ ...input, quarter: decemberQuarterBefore(input.fy) });
};

/**
 * **The forward AWOTE series, out of the caller's own wage assumption — P6-12, user ruling
 * 2026-09-21 ("do it, and label it").**
 *
 * Until today the register held one AWOTE level, the December 2016 base quarter, and every year
 * after FY2026-27 therefore had no index number at all: the cap fell back on the $25,000 base
 * amount and a perfectly legal contribution was refused. That behaviour was not cautious, it was
 * **wrong** — a cap frozen at the base amount for forty years is a known-false forecast, not a
 * pessimistic one — and the user ruled it out on that ground, accepting in terms that the
 * replacement runs in the flattering direction (larger caps, fewer refusals).
 *
 * What comes back is at most ONE number, for the year asked for, and it is built like this:
 *
 *   * **Before the anchor's own year there is nothing**, and that is deliberate. Compounding a
 *     rate *backwards* off the latest published quarter would invent a past the ABS has already
 *     published, and would invent it LOWER. An earlier year gets an empty series and
 *     `MissingIndexNumberError` exactly as before.
 *   * **The anchor's own year is the published level**, at the anchor's own confidence — so
 *     FY2026-27 is computed from `2051.10 / 1533.40`, is cross-checked against the published
 *     $32,500 by `concessionalContributionsCap`, and carries no forecast caveat.
 *   * **Every later year is the published level compounded by the Setting**, once per December
 *     quarter, and is `unverified`. The *cap* is still indexed cumulatively from the base amount
 *     and the base quarter (T13) — nothing here touches last year's cap, or last year's index
 *     number: `(1 + rate) ** years` is applied to the published anchor every time, so computing
 *     FY2035-36 does not require any other year to have been computed first.
 *
 * The rate is a Setting and is **required**: there is no default here, because a defaulted nil
 * would be this module quietly forecasting flat wages on the user's behalf.
 */
export const forecastAwoteIndexNumbers = (fy: FinancialYear, wageGrowthRate: number): IndexNumbers => {
  if (!Number.isFinite(wageGrowthRate) || wageGrowthRate <= -1) {
    throw new RangeError(
      `not a wage growth rate: ${wageGrowthRate} — a rate of -1 wipes out average weekly earnings ` +
        'entirely and anything below it makes them negative, neither of which is a wage level this ' +
        'can index a cap from. Falling wages are statable; a wage of nil is not.',
    );
  }
  const anchor = SPECS.awoteLatestPublishedQuarterIndexNumber;
  const spec = SPECS.concessional.value;
  // The year the anchor's quarter indexes, derived from the record's own date rather than written
  // here: a level filed against a quarter that is not a December quarter fails below instead of
  // being silently applied to a year it does not belong to (T14).
  const anchorFy = toFinancialYear(financialYearStartYear(financialYearContaining(assertIsoDate(anchor.effective))) + 1);
  if (decemberQuarterBefore(anchorFy) !== anchor.effective) {
    throw new RangeError(`the AWOTE anchor is stamped ${anchor.effective}, which is not a December quarter`);
  }
  const years = financialYearStartYear(fy) - financialYearStartYear(anchorFy);
  if (years < 0) return Object.freeze([]);
  if (years === 0) {
    return Object.freeze([
      decemberQuarterIndex({
        index: spec.index,
        fy,
        indexNumber: anchor.value,
        confidence: anchor.confidence,
        source: anchor.source,
      }),
    ]);
  }
  return Object.freeze([
    decemberQuarterIndex({
      index: spec.index,
      fy,
      indexNumber: anchor.value * (1 + wageGrowthRate) ** years,
      // The whole point of the label. Every cap computed from this number arrives saying it rests
      // on a figure nobody has published — see `provenanceOf`, which turns this into a caveat the
      // Person reads rather than a comment the maintainer reads.
      confidence: 'unverified',
      source: `${anchor.source}, at ${anchor.effective}, grown by the wage growth rate stated in this plan's settings — a FORECAST, not a published level`,
    }),
  ]);
};

export class MissingIndexNumberError extends RangeError {
  constructor(index: 'AWOTE' | 'CPI', fy: FinancialYear, cap: string) {
    super(
      `no ${index} index number for the quarter ending ${decemberQuarterBefore(fy)}, so the ${cap} ` +
        `for FY${fy} cannot be computed. ITAA 1997 s 960-285 indexes cumulatively from the base ` +
        'quarter, and the forward series is a Setting, not an assumption (register O5). Growing ' +
        'last year\'s cap by an assumed rate is the T13 mutation. Refusing to compute.',
    );
    this.name = 'MissingIndexNumberError';
  }
}

/**
 * The `CpiSeries` supplied to this call carries no index number for the cap's own base quarter, so
 * s 960-285 cannot be applied at all — there is no denominator. **It is a statement about the
 * argument, not about the register:** both call sites default to the register's own series, which
 * carries every base quarter either of them needs (Dec 2016 for the general Transfer Balance Cap,
 * Dec 2025 for both Division 296 thresholds), so no record of the register can reach this and a
 * caller who passes nothing cannot raise it.
 *
 * **Narrowed on 2026-09-09, when O11 closed.** It used to fire for every year but the published
 * one, on the ground that the Dec 2016 and Dec 2025 CPI numbers had not been retrieved. They have,
 * and the ground went with them: for the general Transfer Balance Cap this now fires only where
 * the *supplied* series is missing the spec's own base quarter, which is a caller error rather
 * than a gap in the register. A year with a base but no December quarter number gets
 * `MissingIndexNumberError` instead, which is the narrower and truer refusal.
 *
 * **The message was corrected on 2026-09-11, and this paragraph is why.** The 2026-09-09 narrowing
 * said here that the O11 sentence was "gone with the ground under it" while rewriting the same
 * claim into the message in new words — a comment asserting the removal, three lines above the
 * surviving copy. What it claimed was a limit on this register's coverage, and that was false from
 * the moment O11 closed: §3.2 carries ten December-quarter CPI numbers and reproduces nine
 * published caps from them, Dec 2025 among them. It is gone now, in both wordings, and nothing
 * saying the same thing has taken its place: this class's message describes the caller's argument
 * and makes no claim at all about what the register publishes or what years are to be had.
 * `test/core-super-caps.test.mjs` asserts that twice over — by absence, and by the words the
 * message may not use at all — so a third rewording fails rather than lands.
 *
 * It is **not** kept for AWOTE: no AWOTE call site exists and none can, because the AWOTE
 * base-quarter figure has been in the register all along
 * (`capIndexation.awoteBaseQuarterIndexNumber`) — a missing AWOTE number is always a missing
 * *December quarter*, which is `MissingIndexNumberError`'s business. It is kept because
 * `div296.ts` still raises it for the two CPI-indexed Division 296 thresholds — but **narrowly**,
 * and no longer for the reason first written here. Those thresholds *do* now take a `CpiSeries`
 * (closed 2026-09-09, the commit after this one), so the channel exists; what they cannot do is
 * compute a *second* year, because their base quarter is Dec 2025, which is the latest December
 * quarter the ABS has published. A missing December quarter there is `MissingIndexNumberError`;
 * this error survives for a **supplied** series that cannot furnish the base quarter itself.
 */
export class UnsourcedIndexBaseError extends RangeError {
  constructor(index: 'AWOTE' | 'CPI', fy: FinancialYear, cap: string) {
    super(
      `the ${index} index number for the base quarter is not available here, so the ${cap} cannot ` +
        `be indexed to FY${fy} — s 960-285(5) has no denominator without it, and a numerator on ` +
        'its own indexes nothing. The series handed to this call has no number for that quarter, ' +
        'and a denominator from some other series may not be substituted into it: that is the ' +
        `mixed reference-base pair O41 forbids. Refusing to compute FY${fy}.`,
    );
    this.name = 'UnsourcedIndexBaseError';
  }
}

export class PublishedCapMismatchError extends RangeError {
  constructor(cap: string, fy: FinancialYear, computed: Cents, published: Cents) {
    super(
      `the ${cap} computed for FY${fy} is ${computed} cents and the register publishes ` +
        `${published} cents. The published figure is a fixture for the machinery, not a second ` +
        'source of truth, so a disagreement means one of them is wrong. Refusing to pick.',
    );
    this.name = 'PublishedCapMismatchError';
  }
}

export type CapBasis =
  | 'published for this financial year'
  | 'indexed from the base amount and base quarter (s 960-285)'
  | 'derived from the concessional cap (s 292-85(2)(a))';

export interface CapResult<T extends Cents> {
  readonly fy: FinancialYear;
  readonly amount: T;
  readonly basis: CapBasis;
  /** The index number the cap was computed from, or `null` where the published figure was read. */
  readonly indexNumber: DecemberQuarterIndex | null;
  readonly provenance: ComputedProvenance;
}

const indexNumberFor = (
  index: 'AWOTE' | 'CPI',
  fy: FinancialYear,
  numbers: IndexNumbers,
): DecemberQuarterIndex | undefined => numbers.find((each) => each.index === index && each.fy === fy);

/**
 * ITAA 1997 s 291-20(2), indexed by s 960-285 from $25,000 and the December 2016 quarter.
 *
 * Given the year's AWOTE number the cap is computed; for the one year the register publishes a
 * figure the two are cross-checked, so the published $32,500 is a live check on the machinery
 * rather than a comment beside it. With no number and no published figure it refuses.
 */
export const concessionalContributionsCap = (
  fy: FinancialYear,
  indexNumbers: IndexNumbers = [],
): CapResult<ConcessionalCap> => {
  const published = CAPS.concessional;
  // The index is read off the cap's own spec, never named here: `'AWOTE'` written at this call
  // site would be a second, silent declaration of a figure the assumptions layer already holds,
  // and the T14 mutation is exactly a cap looking up the wrong index.
  const spec = SPECS.concessional.value;
  const observed = indexNumberFor(spec.index, fy, indexNumbers);
  if (observed === undefined) {
    if (published.fy !== fy) throw new MissingIndexNumberError(spec.index, fy, 'concessional contributions cap');
    return Object.freeze({
      fy,
      amount: published.value as ConcessionalCap,
      basis: 'published for this financial year',
      indexNumber: null,
      provenance: provenanceOf(fy, [['superannuation.caps.concessional', published]]),
    });
  }
  const base = SPECS.awoteBaseQuarterIndexNumber;
  const amount = indexCap(spec, base.value, observed.indexNumber);
  if (published.fy === fy && amount !== published.value) {
    throw new PublishedCapMismatchError('concessional contributions cap', fy, amount, published.value);
  }
  return Object.freeze({
    fy,
    amount: amount as ConcessionalCap,
    basis: 'indexed from the base amount and base quarter (s 960-285)',
    indexNumber: observed,
    provenance: provenanceOf(fy, [
      ['superannuation.capIndexation.concessional', SPECS.concessional],
      ['superannuation.capIndexation.awoteBaseQuarterIndexNumber', base],
      [`the AWOTE index number for the quarter ending ${observed.quarter}`, observed],
    ]),
  });
};

/**
 * ITAA 1997 s 292-85(2)(a): four times the **general** concessional cap.
 *
 * Deliberately keyed on the financial year alone and not on a Person: s 291-20(4)'s carry-forward
 * increase is expressly excluded from this calculation (§3.1), and a function that never receives
 * a headroom figure cannot add one to it.
 */
export const nonConcessionalContributionsCap = (
  fy: FinancialYear,
  indexNumbers: IndexNumbers = [],
): CapResult<NonConcessionalCap> => {
  const concessional = concessionalContributionsCap(fy, indexNumbers);
  const amount = mulCents(concessional.amount, NON_CONCESSIONAL_MULTIPLE.value);
  const published = CAPS.nonConcessional;
  if (published.fy === fy && amount !== published.value) {
    throw new PublishedCapMismatchError('non-concessional contributions cap', fy, amount, published.value);
  }
  return Object.freeze({
    fy,
    amount: amount as NonConcessionalCap,
    basis: 'derived from the concessional cap (s 292-85(2)(a))',
    indexNumber: concessional.indexNumber,
    // The multiple is a figure this cap consumes, so it is cited like any other. It is
    // primary-verified and carries no year stamp, so it adds no caveat — but a day when it stops
    // being primary-verified is a day this result has to say so.
    provenance: mergeProvenance(
      provenanceOf(fy, [['superannuation.caps.nonConcessionalMultiple', NON_CONCESSIONAL_MULTIPLE]]),
      concessional.provenance,
    ),
  });
};

/**
 * ITAA 1997 s 294-35(3), indexed by s 960-285 from $1,600,000 and the December 2016 quarter, in
 * $100,000 steps **floored** — every year the series has a December quarter number for.
 *
 * The second parameter is a whole `CpiSeries` and not a list of index numbers, which is a
 * deliberate departure from the shape the concessional cap uses. O41 is an instruction: an
 * indexation factor must never be computed from a mixed reference-base pair, and the way to make
 * that unconstructible rather than merely forbidden is to give the function no way to receive a
 * numerator apart from its denominator. Both come out of the one series, which names its base once.
 *
 * The register's own series is the default, so ordinary callers pass a year and nothing else.
 *
 * Three refusals rather than a plausible figure. A series with no base quarter cannot be indexed
 * from at all (`UnsourcedIndexBaseError`); a year the series has no December quarter number for is
 * `MissingIndexNumberError`, because the forward CPI series is a Setting and not an assumption
 * (register O5) and growing last year's cap by an assumed rate is the T13 mutation; and where the
 * computed figure and the register's published figure disagree, `PublishedCapMismatchError`
 * refuses to pick between them.
 *
 * For the year the register publishes a cap for, the published figure is what is returned and the
 * computation is run against it as a **cross-check** — it is a primary-verified ATO figure and does
 * not depend on which reference base s 960-280(3) selects. Every other year is computed, and
 * consumes `cpiReferenceBase`, so it arrives carrying O41's open question in its confidence.
 */
export const generalTransferBalanceCap = (
  fy: FinancialYear,
  series: CpiSeries = CPI_INDEX_NUMBERS.value,
): CapResult<GeneralTransferBalanceCap> => {
  const published = CAPS.generalTransferBalance;
  // As with the concessional cap, `'CPI'` is never written at this call site: the index, the base
  // amount, the base quarter and the $100,000 step are all read off the cap's own spec (T14).
  const spec = SPECS.transferBalance.value;
  const quarter = decemberQuarterBefore(fy);
  if (cpiIndexNumberAt(series, spec.baseQuarter) === undefined) {
    throw new UnsourcedIndexBaseError(spec.index, fy, 'general Transfer Balance Cap');
  }
  const asPublished = (): CapResult<GeneralTransferBalanceCap> =>
    Object.freeze({
      fy,
      amount: published.value as GeneralTransferBalanceCap,
      basis: 'published for this financial year',
      indexNumber: null,
      provenance: provenanceOf(fy, [['superannuation.caps.generalTransferBalance', published]]),
    });

  const observed = cpiIndexNumberAt(series, quarter);
  if (observed === undefined) {
    if (published.fy !== fy) throw new MissingIndexNumberError(spec.index, fy, 'general Transfer Balance Cap');
    return asPublished();
  }
  const amount = indexCapFromCpiSeries(spec, series, quarter);
  if (published.fy === fy) {
    if (amount !== published.value) {
      throw new PublishedCapMismatchError('general Transfer Balance Cap', fy, amount, published.value);
    }
    return asPublished();
  }
  return Object.freeze({
    fy,
    amount: amount as GeneralTransferBalanceCap,
    basis: 'indexed from the base amount and base quarter (s 960-285)',
    indexNumber: decemberQuarterIndex({
      index: spec.index,
      fy,
      indexNumber: observed,
      confidence: series.confidence,
      source: series.source,
    }),
    // The series is cited as itself, not as the register record: a caller-supplied forecast series
    // carries its own confidence into the result and is not laundered into a register figure.
    provenance: provenanceOf(fy, [
      ['superannuation.capIndexation.transferBalance', SPECS.transferBalance],
      ['superannuation.capIndexation.cpiReferenceBase', CPI_REFERENCE_BASE],
      [`the CPI series published on the ${series.referenceBase}`, series],
    ] as readonly Consumed[]),
  });
};

// --- Total Super Balance — a value with the date it was measured at (§3.8) -----------------------

/**
 * ITAA 1997 s 307-230A, inserted by C2026A00008 Sch 2 and applying from just before 1 July 2026:
 * the total superannuation benefits that would become payable if the Person voluntarily caused the
 * interest to cease.
 *
 * It is a record and not a branded `Cents` because the date is half the figure. Three different
 * tests in this file read a Total Super Balance at three different moments, and each one has to be
 * the balance at *its own* 30 June; a bare dollar amount cannot be checked against the year it is
 * being used for, and "the right number from the wrong year" is the failure this carries the date
 * to prevent.
 */
export interface TotalSuperBalance {
  /** The 30 June the withdrawal benefit was measured at. */
  readonly measuredAt: IsoDate;
  readonly value: Cents;
}

/**
 * The first date the s 307-230A definition applies to — "just before 1 July 2026".
 *
 * Derived rather than written down. The record carries `effective: '2026-07-01'`, and "just
 * before" the start of a financial year is not a coincidence of dates here: it is the same phrase
 * §3.8 uses for both Total Super Balance tests, and `justBeforeFinancialYear` is the function that
 * already means it. A hand-written `'2026-06-30'` is a second copy of the record's own date, one
 * day off, with nothing to notice if the record moves.
 *
 * The derivation is only sound for an effective date that *is* the start of a financial year —
 * `financialYearContaining` maps every day of FY2026-27 to the same year, so a mid-year commencement
 * would be silently pulled back to the previous 30 June. So it is checked rather than assumed, at
 * module load, where a wrong date cannot be reached by any caller.
 */
const TSB_DEFINITION_FY = financialYearContaining(TSB_DEFINITION.effective);
if (TSB_DEFINITION.effective !== startOfFinancialYear(TSB_DEFINITION_FY)) {
  throw new RangeError(
    `superannuation.access.totalSuperBalanceDefinition is effective ${TSB_DEFINITION.effective}, ` +
      'which is not the start of a financial year. "Just before" it is therefore not the 30 June ' +
      `before FY${TSB_DEFINITION_FY}, and this module derives that date rather than writing it ` +
      'down. Refusing to load with a definition date it cannot derive from.',
  );
}
const TSB_DEFINITION_FROM: IsoDate = justBeforeFinancialYear(TSB_DEFINITION_FY);

export class TotalSuperBalanceDefinitionError extends RangeError {
  constructor(measuredAt: IsoDate) {
    super(
      `no Total Super Balance definition for ${measuredAt}: ITAA 1997 s 307-230A applies from just ` +
        `before 1 July 2026 (${TSB_DEFINITION_FROM}), and the accumulation phase value construct it ` +
        'replaced is repealed and is not carried in the register (§3.8). A balance measured earlier ' +
        'is a different quantity under a different definition. Refusing to build one.',
    );
    this.name = 'TotalSuperBalanceDefinitionError';
  }
}

export class TotalSuperBalanceDateError extends RangeError {
  constructor(fy: FinancialYear, measuredAt: IsoDate, required: IsoDate) {
    super(
      `the Total Super Balance for FY${fy} must be measured at ${required} — just before the start ` +
        `of the year — and this one was measured at ${measuredAt}. Both the s 291-20(3) ` +
        'carry-forward test and the s 292-85(3)(e) cap space read that date and no other.',
    );
    this.name = 'TotalSuperBalanceDateError';
  }
}

/**
 * The one constructor. The argument is named for the definition it must be built from, so a caller
 * reaching for the repealed accumulation phase value has to rename it to pass it.
 */
export const totalSuperBalance = (measuredAt: IsoDate, withdrawalBenefit: Cents): TotalSuperBalance => {
  assertIsoDate(measuredAt);
  if (measuredAt < TSB_DEFINITION_FROM) throw new TotalSuperBalanceDefinitionError(measuredAt);
  if (withdrawalBenefit < 0) throw new RangeError(`a Total Super Balance cannot be negative: ${withdrawalBenefit} cents`);
  return Object.freeze({ measuredAt, value: withdrawalBenefit });
};

const requireMeasuredJustBefore = (fy: FinancialYear, tsb: TotalSuperBalance): Cents => {
  const required = justBeforeFinancialYear(fy);
  if (tsb.measuredAt !== required) throw new TotalSuperBalanceDateError(fy, tsb.measuredAt, required);
  return tsb.value;
};

// --- Carry-forward concessional — the five-year rolling headroom (P3-4b) -------------------------

export interface ConcessionalYearHistory {
  readonly fy: FinancialYear;
  /** That year's **general** cap. Branded, so a non-concessional cap cannot be filed here. */
  readonly cap: ConcessionalCap;
  readonly concessionalContributions: Cents;
}

export interface CarryForwardYear {
  readonly fy: FinancialYear;
  readonly cap: Cents;
  readonly used: Cents;
  /** What this year *generated*: nil where the cap was exceeded — an excess year generates no headroom. */
  readonly unused: Cents;
  /**
   * What survives of `unused` once the later years in the window have taken theirs (s 291-20(7),
   * earliest year first). **This, not `unused`, is what is still available.** The two differ
   * whenever some year inside the window contributed above its own general cap.
   */
  readonly remaining: Cents;
  /** The last financial year this unused amount can still be used in: five years after it arose. */
  readonly lastYearUsable: FinancialYear;
}

export interface CarryForwardHeadroom {
  readonly fy: FinancialYear;
  readonly generalCap: ConcessionalCap;
  readonly totalSuperBalance: Cents;
  readonly totalSuperBalanceMeasuredAt: IsoDate;
  /** s 291-20(3): **< $500,000**, and never indexed (T21). Nominal, so the window closes on its own. */
  readonly eligibilityThreshold: Cents;
  readonly eligible: boolean;
  /** The look-back window, **earliest first** — which is also the order it is consumed in. */
  readonly window: readonly CarryForwardYear[];
  /** Nil where the Person fails the Total Super Balance test, however much is unused. */
  readonly unusedAvailable: Cents;
  /** The number a Person acts on: the general cap plus whatever carry-forward is actually available. */
  readonly headroom: Cents;
  readonly provenance: ComputedProvenance;
}

export class MissingContributionHistoryError extends RangeError {
  constructor(fy: FinancialYear, missing: readonly FinancialYear[]) {
    super(
      `no concessional contribution history for FY${missing.join(', FY')}, which fall inside the ` +
        `five-year look-back window for FY${fy}. A missing year is not an empty year: treating it ` +
        'as nil contributions would manufacture a full cap of headroom and invite a deduction the ' +
        'Person is not entitled to. Refusing to compute a headroom figure.',
    );
    this.name = 'MissingContributionHistoryError';
  }
}

const EARLIEST_GENERATING_YEAR = CARRY_FORWARD.earliestGeneratingYear.value as FinancialYear;

/**
 * s 291-20(3)–(7). The five-year rolling headroom, per Person per year, as a figure to show rather
 * than an internal (P3-4b).
 *
 * Two refusals rather than a plausible number: a look-back year with no history throws, and a
 * Total Super Balance measured at any date but the prior 30 June throws. Both are cases where the
 * arithmetic would happily produce a larger headroom than the Person has.
 */
export const carryForwardHeadroom = (input: {
  readonly fy: FinancialYear;
  readonly cap: CapResult<ConcessionalCap>;
  readonly totalSuperBalance: TotalSuperBalance;
  readonly priorYears: readonly ConcessionalYearHistory[];
}): CarryForwardHeadroom => {
  const { fy, cap, totalSuperBalance: tsb, priorYears } = input;
  if (cap.fy !== fy) throw new RangeError(`the concessional cap supplied is for FY${cap.fy}, not FY${fy}`);
  const balance = requireMeasuredJustBefore(fy, tsb);

  const lookBack = financialYearsBefore(fy, CARRY_FORWARD.lookBackYears.value).filter(
    (each) => compareFinancialYears(each, EARLIEST_GENERATING_YEAR) >= 0,
  );
  const byYear = new Map<FinancialYear, ConcessionalYearHistory>();
  for (const year of priorYears) {
    if (compareFinancialYears(year.fy, fy) >= 0) {
      throw new RangeError(`FY${year.fy} is not before FY${fy}: contribution history is prior years only`);
    }
    if (byYear.has(year.fy)) throw new RangeError(`FY${year.fy} appears twice in the contribution history`);
    byYear.set(year.fy, year);
  }
  const missing = lookBack.filter((each) => !byYear.has(each));
  if (missing.length > 0) throw new MissingContributionHistoryError(fy, missing);

  const arising = lookBack.map((each) => {
    const year = byYear.get(each) as ConcessionalYearHistory;
    const used = year.concessionalContributions;
    if (used < 0) throw new RangeError(`FY${each} concessional contributions cannot be negative`);
    return {
      fy: each,
      cap: year.cap as Cents,
      used,
      unused: used >= year.cap ? toCents(0) : subCents(year.cap, used),
      overCap: used > year.cap ? subCents(used, year.cap) : toCents(0),
      lastYearUsable: toFinancialYear(financialYearStartYear(each) + CARRY_FORWARD.lookBackYears.value),
    };
  });

  // s 291-20(7) — the increase is applied **earliest year first**, and that is not merely a display
  // order. A year inside the window whose contributions ran over its own general cap did not
  // thereby make an excess contribution: it spent the oldest unused amount then standing. Adding up
  // each year's gross `cap − contributions` keeps offering headroom that has already been consumed,
  // so the naive sum runs *high* — and an over-stated headroom is exactly what causes the excess
  // contributions determination this figure exists to avoid. The assumptions layer has carried
  // `carryForward.applicationOrder` all along; this loop is the thing that consumes it.
  //
  // Where an over-cap year needs more than the window still holds, the balance is left alone: it
  // may have spent an unused amount that has since rolled out of the window, or it may have been a
  // real excess contribution, and the history cannot tell the two apart. Both readings leave the
  // remaining window at nil, which is the same answer.
  const remaining: Cents[] = arising.map((year) => year.unused);
  for (let index = 0; index < arising.length; index += 1) {
    let outstanding = arising[index]?.overCap ?? toCents(0);
    for (let earlier = 0; earlier < index && outstanding > 0; earlier += 1) {
      const available = remaining[earlier] ?? toCents(0);
      const taken = (available < outstanding ? available : outstanding) as Cents;
      remaining[earlier] = subCents(available, taken);
      outstanding = subCents(outstanding, taken);
    }
  }

  const window = arising.map((year, index): CarryForwardYear =>
    Object.freeze({
      fy: year.fy,
      cap: year.cap,
      used: year.used,
      unused: year.unused,
      remaining: remaining[index] ?? toCents(0),
      lastYearUsable: year.lastYearUsable,
    }),
  );

  const eligible = balance < CARRY_FORWARD.totalSuperBalanceTest.value;
  const unusedAvailable = eligible
    ? window.reduce<Cents>((sum, year) => addCents(sum, year.remaining), toCents(0))
    : toCents(0);

  return Object.freeze({
    fy,
    generalCap: cap.amount,
    totalSuperBalance: balance,
    totalSuperBalanceMeasuredAt: tsb.measuredAt,
    eligibilityThreshold: CARRY_FORWARD.totalSuperBalanceTest.value,
    eligible,
    window: Object.freeze(window),
    unusedAvailable,
    headroom: addCents(cap.amount, unusedAvailable),
    // The cap's own provenance is *merged*, not re-derived from its confidence: rebuilding it from
    // `cap.provenance.confidence` alone keeps the weakest-wins ranking but silently drops every
    // caveat behind it — including a cross-year stamp, which carries no confidence penalty at all
    // and would vanish without trace. `mergeProvenance` is the one path that cannot lose a line.
    provenance: mergeProvenance(
      provenanceOf(fy, [
        ['superannuation.carryForward.totalSuperBalanceTest', CARRY_FORWARD.totalSuperBalanceTest],
        ['superannuation.carryForward.lookBackYears', CARRY_FORWARD.lookBackYears],
        ['superannuation.carryForward.applicationOrder', CARRY_FORWARD.applicationOrder],
        ['superannuation.carryForward.earliestGeneratingYear', CARRY_FORWARD.earliestGeneratingYear],
        ['superannuation.access.totalSuperBalanceDefinition', TSB_DEFINITION],
      ] as readonly Consumed[]),
      cap.provenance,
    ),
  });
};

// --- Bring-forward — derived, and frozen once triggered (T19, T20) -------------------------------

export interface BringForwardResult {
  readonly fy: FinancialYear;
  /** s 292-85(3)(c): under 75 at any time in the first year, i.e. under 75 on 1 July. */
  readonly ageAtStartOfYear: number;
  readonly ageGateMet: boolean;
  readonly generalCap: NonConcessionalCap;
  readonly transferBalanceCap: GeneralTransferBalanceCap;
  /** s 292-85(3)(e): the Transfer Balance Cap less the Total Super Balance. Nil where negative. */
  readonly capSpace: Cents;
  /**
   * The whole amount available across the arrangement, **frozen** at the first year's figures
   * (T20): three years at FY2026-27 is $390,000, not the sum of three separately indexed years.
   */
  readonly periodCap: Cents;
  /** 3, 2, 1 (no bring-forward available) or 0 (no non-concessional cap at all). */
  readonly years: 0 | 1 | 2 | 3;
  /** s 292-85(3)(a): triggered by contributing more than the general cap. Not elective. */
  readonly triggeredAbove: NonConcessionalCap;
  readonly provenance: ComputedProvenance;
}

/**
 * ITAA 1997 s 292-85(2)(b), (5), through the assumptions layer's `bringForwardArrangement` — the
 * tiers are computed from this year's two caps every time, never held as literals (T19), and the
 * inequalities inside it are strict, so a Total Super Balance of exactly $1,840,000 takes the
 * 2-year arrangement.
 *
 * Every year both caps can be computed for. The general Transfer Balance Cap now indexes off the
 * register's CPI series, so the tiers move with it; a year with no December quarter CPI number
 * throws `MissingIndexNumberError` rather than reusing this year's tiers under a later year's
 * label. The Transfer Balance Cap's own provenance is merged in, so a computed year arrives
 * carrying O41's open reference base rather than the published figure's confidence.
 */
export const bringForward = (input: {
  readonly fy: FinancialYear;
  readonly dateOfBirth: IsoDate;
  readonly totalSuperBalance: TotalSuperBalance;
  readonly indexNumbers?: IndexNumbers;
}): BringForwardResult => {
  const { fy, dateOfBirth, totalSuperBalance: tsb } = input;
  const balance = requireMeasuredJustBefore(fy, tsb);
  const general = nonConcessionalContributionsCap(fy, input.indexNumbers ?? []);
  const transferBalance = generalTransferBalanceCap(fy);

  const ageAtStartOfYear = ageAt(dateOfBirth, startOfFinancialYear(fy));
  const ageGateMet = ageAtStartOfYear < BRING_FORWARD.ageGateUnder.value;

  const arrangement = bringForwardArrangement({
    generalTransferBalanceCap: transferBalance.amount,
    nonConcessionalCap: general.amount,
    totalSuperBalance: balance,
  });
  // The age gate removes the *bring-forward*, never the general cap underneath it.
  const years = ageGateMet || arrangement.years === 0 ? arrangement.years : 1;
  const periodCap = years === arrangement.years ? arrangement.firstYearCap : general.amount;

  return Object.freeze({
    fy,
    ageAtStartOfYear,
    ageGateMet,
    generalCap: general.amount,
    transferBalanceCap: transferBalance.amount,
    capSpace: balance >= transferBalance.amount ? toCents(0) : subCents(transferBalance.amount, balance),
    periodCap,
    years,
    triggeredAbove: general.amount,
    provenance: mergeProvenance(
      provenanceOf(fy, [
        ['superannuation.bringForward.arrangement', BRING_FORWARD.arrangement],
        ['superannuation.bringForward.ageGate', BRING_FORWARD.ageGate],
        ['superannuation.bringForward.ageGateUnder', BRING_FORWARD.ageGateUnder],
        ['superannuation.bringForward.capIsFrozenOnceTriggered', BRING_FORWARD.capIsFrozenOnceTriggered],
        ['superannuation.access.totalSuperBalanceDefinition', TSB_DEFINITION],
        ...(general.indexNumber === null
          ? ([['superannuation.caps.concessional', CAPS.concessional]] as const)
          : ([[`the AWOTE index number for the quarter ending ${general.indexNumber.quarter}`, general.indexNumber]] as const)),
      ] as readonly Consumed[]),
      transferBalance.provenance,
    ),
  });
};

declare const NON_CONCESSIONAL_CONTRIBUTIONS: unique symbol;

/**
 * ITAA 1997 s 292-90. A contribution made from money the Person has already been taxed on, counted
 * against the non-concessional cap and **not** assessable to the fund.
 *
 * Branded because the two kinds of contribution are not interchangeable and the substitution is a
 * plausible number rather than an obvious break: a personal contribution the Person has claimed a
 * deduction for is concessional, bears the fund's 15% and eats the concessional cap; the same
 * dollars without an acknowledged notice of intent are non-concessional, bear nothing and eat a cap
 * four times the size. `superConcessional.ts`'s figures cannot be filed here, and this one cannot
 * be taxed there. The widening constructor exists, so a deliberate relabelling still compiles — but
 * it has to be written down, and a cast is visible in review.
 */
export type NonConcessionalContributions = Cents & { readonly [NON_CONCESSIONAL_CONTRIBUTIONS]: true };

export const nonConcessionalContributions = (amount: Cents): NonConcessionalContributions => {
  if (amount < 0) throw new RangeError(`non-concessional contributions cannot be negative: ${amount} cents`);
  return amount as NonConcessionalContributions;
};

export interface NonConcessionalAssessment {
  readonly fy: FinancialYear;
  readonly contributions: NonConcessionalContributions;
  /** The cap actually applied: the general cap, or the frozen bring-forward period cap. */
  readonly cap: Cents;
  readonly bringForwardTriggered: boolean;
  readonly years: 0 | 1 | 2 | 3;
  readonly excess: Cents;
  readonly provenance: ComputedProvenance;
}

/**
 * s 292-85(3)(a): the arrangement triggers on contributing **more than the general cap**, and it is
 * not elective — a Person who contributes $130,001 has triggered it whether they meant to or not.
 * The excess is reported and its consequences are not computed: Division 292's excess
 * non-concessional treatment (release authority, associated earnings) is not in the register.
 */
export const applyNonConcessional = (
  arrangement: BringForwardResult,
  contributions: NonConcessionalContributions,
): NonConcessionalAssessment => {
  if (contributions < 0) throw new RangeError(`non-concessional contributions cannot be negative`);
  const triggered = contributions > arrangement.generalCap && arrangement.years > 1;
  const cap = triggered ? arrangement.periodCap : arrangement.years === 0 ? toCents(0) : arrangement.generalCap;
  return Object.freeze({
    fy: arrangement.fy,
    contributions,
    cap,
    bringForwardTriggered: triggered,
    years: triggered ? arrangement.years : arrangement.years === 0 ? 0 : 1,
    excess: contributions > cap ? subCents(contributions, cap) : toCents(0),
    provenance: arrangement.provenance,
  });
};
