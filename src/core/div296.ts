// P3-5a — Division 296, the tax on earnings attributable to a large superannuation balance.
// ITAA 1997 Div 296 as inserted by C2026A00008 Sch 1, with the Superannuation (BSFSS) Imposition
// Act 2026 s 5 rates and the Income Tax (Transitional Provisions) Act 1997 ss 296-1(2) and
// 296-60(2). Register §3.7. A dollar amount, a rate or a factor appearing below as a literal is a
// bug — every one of them is read from `data/assumptions/super.ts`.
//
// Two traps decide whether this file is right, and everything about its shape follows from them.
//
//   * **T15 — this is not marginal bands over earnings.** ss 296-40 and 296-45 each compute a
//     *proportion*, from their own threshold-against-the-balance ratio, and each proportion is
//     applied to the **same** total superannuation earnings figure. The two results are then taxed
//     at 15% and 10%. The universal "30% / 40% effective" commentary framing reconciles below
//     $10m and is wrong above it, so the mistake is the intuitive one.
//
//     The defence is that `div296Tax` has **exactly one earnings parameter**, it is a branded
//     `SuperannuationEarnings` rather than a `Cents`, and both proportions are produced by one
//     closure over that single value. There is no argument through which a second earnings base
//     could arrive, and a `Cents` slice of earnings is not assignable to the brand — a band
//     calculation would have to build a second earnings figure through a public constructor, name
//     a financial year for it and give it provenance. Carving one proportion out of the other is
//     still arithmetic anyone can write; the fixture at $12,000,000 catches that, because the
//     carve-out and the addition differ only once the very large balance threshold is crossed.
//
//   * **T16 — the first year is different.** For 2026-27 only, transitional s 296-1(2) strikes the
//     opening limb out of s 296-40(2): the test is the **end-of-year balance alone**. From 2027-28
//     it is the **greater** of the opening and closing balances. That switch is not written here.
//     It lives in `div296TotalSuperBalanceReference` in the assumptions layer and is called once,
//     from `totalSuperBalanceReference` below, which is the only way to obtain a reference balance.
//     No executable line below computes a `Math.max` of two balances, and no executable line
//     compares a financial year against a year literal — the one year comparison there is reads
//     the application year off its own record. So neither T16 mutation has anywhere in `core/` to
//     be applied: both have to be made in the assumptions layer, where the rule is.
//
//     The two rules agree whenever the closing balance is the larger, which is the ordinary case —
//     so a Person whose balance fell during the year is the only fixture that can tell them apart.
//
// **What this module refuses, and why each refusal is narrow.**
//
//   * Any year before 2026-27 (T12). Sch 1 commenced 1 April 2026; the first income year it
//     applies to is 2026-27. The commencement date is in the assumptions object precisely so it is
//     not mistaken for the application year, and its record says nothing may compute from it — so
//     nothing here reads it.
//   * Any year after 2026-27, for the **thresholds only**, and **not for want of a parameter**.
//     Both are CPI-indexed from the December **2025** quarter (s 960-265 items 10B and 10C), and
//     December 2025 is the most recent December quarter the ABS has published — so the base
//     quarter is also the newest number in the series, there is no later December quarter to index
//     *to*, and the published data yields exactly one computable year. `div296Thresholds` takes a
//     `CpiSeries` precisely so that a caller holding December 2026 can compute FY2027-28 the day
//     the ABS releases it; supplied nothing, it refuses that year with `MissingIndexNumberError` —
//     a missing quarter, which is what is actually missing. (O11 closed on 2026-09-09 and this
//     module said otherwise until 2026-09-09; the general Transfer Balance Cap, which used to be
//     cited here as the precedent for having no parameter, gained one in the same pass. It indexes
//     from Dec 2016, which is why nine years are computable there and one here.) The reference
//     balance and the fund earnings — neither of which touches a threshold — are available for
//     every year.
//   * Attribution of a fund's Division 296 fund earnings to a Person, unless the Person holds the
//     whole of the fund. s 296-65(3) attributes "on a fair and reasonable basis, having regard to
//     the matters prescribed by the regulations" and s 296-65(5) prescribes a separate method for
//     small superannuation funds. **Corrected 2026-09-10: this bullet used to end "neither set of
//     regulations was retrieved", and that is false.** Open item **O17** records that
//     `F2026L00726` **was** retrieved — it carries regs 296-65.01, 296-70.01 and 296-70.02, and
//     was *not read in full* (`docs/research/p1-super-caps.md` §8 item 2) — and it is the same
//     instrument §3.7 cites at `primary-verified` for the CGT phase-in factors below. For the
//     s 296-65(3) limb no document says either way. *Retrieved but unread* is a **weaker**
//     argument from absence than *never retrieved*, and **R6** forbids recording the stronger
//     one; asserting the stronger one inside a refusal is **O70**, here in a second module. The
//     refusal is unchanged and stands on the narrower ground its message also gives: a share of
//     the fund apportioned on a basis this model invented would be a number with no source, and
//     an unread regulation cannot be implemented.
//   * Negative earnings **only where the two readings of §3.7 differ**. §3.7 guards the s 296-40
//     limb with `total_super_earnings > 0` and puts no such guard on the s 296-45 limb, so below
//     the very large balance threshold both readings give nil and this computes nil; above it one
//     reading gives nil and the other a negative charge, and this refuses rather than picking.
//   * A Person who died during the year, from 2027-28, where their opening balance was not nil.
//     s 296-50 takes the Total Super Balance after death to be nil. In 2026-27 that ends the
//     matter, because only the closing balance is tested. From 2027-28 the opening limb survives
//     on one reading and not on the other, and §3.7 does not say which.
//
// **Where the CGT phase-in attaches, and why it is only reachable at the fund.** ITTPA 1997
// s 296-60(2) discounts the **net capital gain inside the fund's relevant taxable income** — the
// first limb of the s 296-60(1) earnings definition — by a factor prescribed for each of the first
// four income years (0.2, 0.4, 0.6, 0.8; F2026L00726 reg 296-60.01), the provision being spent
// from 2030-31. The factor is the proportion of the gain that **counts**, not the proportion
// removed: the register's own sequence runs 0.2 → 0.8 and then to no discount at all, and reading
// it as the proportion removed would ramp inclusion *down* from 80% to 20% and then jump to 100%.
// s 296-60(3) excludes a small superannuation fund, which gets a 30 June 2026 cost-base reset
// instead — and the register carries no mechanics for that reset, so a small fund's stated net
// capital gain has to have it built in already, and says so in its provenance.
//
// The consequence is worth stating plainly: the phase-in applies only to funds that are **not**
// small, and attribution from a fund that is not small is exactly what s 296-65(3) leaves
// unavailable. So the discount is computed and reported at the fund, and no Person's assessment in
// this model can currently reach it. That is a gap in the register, not a gap in the arithmetic.
import { addCents, mulCents, subCents, toCents } from './money.js'; // `.js` is correct in a `.ts` file — see tsconfig.json
import type { Cents } from './money.js';
import { compareFinancialYears, endOfFinancialYear, justBeforeFinancialYear } from './financialYear.js';
import {
  MissingIndexNumberError,
  PublishedCapMismatchError,
  UnsourcedIndexBaseError,
  decemberQuarterBefore,
  decemberQuarterIndex,
} from './superCaps.js';
import type { DecemberQuarterIndex, TotalSuperBalance } from './superCaps.js';
import { mergeProvenance, provenanceOf, withCaveats } from './provenance.js';
import type { ComputedProvenance, Consumed, ProvenanceBearing } from './provenance.js';
import {
  SUPERANNUATION,
  cpiIndexNumberAt,
  div296TotalSuperBalanceReference,
  indexCapFromCpiSeries,
} from '../data/assumptions/super.js';
import type { CapIndexationSpec, CpiSeries } from '../data/assumptions/super.js';
import type { FinancialYear, IsoDate, Rate } from '../data/assumptions/types.js';

const DIVISION_296 = SUPERANNUATION.division296;
const SPECS = SUPERANNUATION.capIndexation;
const CPI_INDEX_NUMBERS = SPECS.cpiDecemberQuarterIndexNumbers;
const CPI_REFERENCE_BASE = SPECS.cpiReferenceBase;

/** ITTPA 1997 s 296-1(1) — the first **income year** Div 296 applies to. Never the commencement date. */
const APPLICATION_YEAR = DIVISION_296.applicationYear.value as FinancialYear;

// --- Refusals -----------------------------------------------------------------------------------

export class Div296NotApplicableError extends RangeError {
  constructor(fy: FinancialYear) {
    super(
      `Division 296 does not apply to FY${fy}: the first income year it applies to is ` +
        `FY${APPLICATION_YEAR} (Income Tax (Transitional Provisions) Act 1997 s 296-1(1)). ` +
        'Schedule 1 of C2026A00008 commenced on 1 April 2026, but a commencement date is not an ' +
        'application year (T12) and assessing from it produces a liability three months early.',
    );
    this.name = 'Div296NotApplicableError';
  }
}

export class Div296BalanceDateError extends RangeError {
  constructor(fy: FinancialYear, limb: 'opening' | 'closing', measuredAt: IsoDate, required: IsoDate) {
    super(
      `the ${limb} Total Super Balance for FY${fy} must be measured at ${required} and this one ` +
        `was measured at ${measuredAt}: the two dates are a year apart, and the right number ` +
        'from the wrong 30 June cannot be told from a correct one by its result. The ground for ' +
        'the check differs by year, and until 2026-09-10 this message stated only the first of ' +
        'the two. From FY2027-28, ITAA 1997 s 296-40(2) reads one balance just before the start ' +
        'of the year and one at the end of it, so a mis-stamped balance is read as the wrong ' +
        `limb. In FY${APPLICATION_YEAR} it does not: transitional s 296-1(2) strikes the opening ` +
        'limb out (T16) and the opening value is discarded entirely, so that year the ground is ' +
        'the narrower one — a balance stamped with the wrong 30 June is evidence the two dates ' +
        'were swapped, which would put the opening figure into the closing limb, and the closing ' +
        'limb is the only one that year reads. The check is the same in both years; the reason ' +
        'for it is not.',
    );
    this.name = 'Div296BalanceDateError';
  }
}

export class TotalSuperBalanceAfterDeathError extends RangeError {
  constructor(fy: FinancialYear, opening: Cents) {
    super(
      `the Total Super Balance reference for FY${fy} cannot be worked out for a Person who died ` +
        `during the year while holding ${opening} cents just before it began. ITAA 1997 s 296-50 ` +
        'takes the Total Super Balance after death to be nil, and from FY2027-28 s 296-40(2) also ' +
        'reads the balance just before the start of the year — which is a balance before death. ' +
        'On one reading the opening limb survives and the reference is that balance; on the other ' +
        'the Person has no Total Super Balance at all and the reference is nil. §3.7 does not say ' +
        'which, the two readings give different tax, and this refuses rather than choosing. In ' +
        `FY${APPLICATION_YEAR} the question does not arise: only the end-of-year balance is read.`,
    );
    this.name = 'TotalSuperBalanceAfterDeathError';
  }
}

export class Div296AttributionBasisError extends RangeError {
  constructor(fy: FinancialYear) {
    super(
      `Division 296 fund earnings for FY${fy} cannot be attributed to a Person who does not hold ` +
        'the whole of the fund. ITAA 1997 s 296-65(3) attributes them "on a fair and reasonable ' +
        'basis, having regard to the matters prescribed by the regulations", and s 296-65(5) ' +
        'prescribes a separate method for a small superannuation fund. Those s 296-65(5) ' +
        'regulations WERE retrieved and were NOT READ IN FULL — F2026L00726, regs 296-65.01, ' +
        '296-70.01 and 296-70.02, open item O17 — and for the s 296-65(3) limb no document ' +
        'records either way. Retrieved-but-unread is the weaker argument from absence, R6 allows ' +
        'only the weaker one to be recorded, and O70 is the rule that an unchecked negative is ' +
        'never asserted inside a refusal (corrected here on 2026-09-10). The ground is the ' +
        'narrower one this message always also gave, untouched by O17: a share of the fund ' +
        'apportioned on any basis this model invented would be a number with no source, and a ' +
        'regulation nobody has read in full cannot be implemented. State the Person\'s own ' +
        'total superannuation earnings instead — `superannuationEarnings` takes the figure the ' +
        'fund or the ATO reported.',
    );
    this.name = 'Div296AttributionBasisError';
  }
}

export class Div296NegativeEarningsError extends RangeError {
  constructor(fy: FinancialYear, earnings: Cents) {
    super(
      `total superannuation earnings of ${earnings} cents for FY${fy} cannot be assessed for a ` +
        'Person whose Total Super Balance is above the very large super balance threshold. §3.7 ' +
        'guards the s 296-40 limb with "total superannuation earnings > 0", so the taxable ' +
        'superannuation earnings are nil; it puts no such guard on the s 296-45 limb, which would ' +
        'take a proportion of a negative figure and produce a negative charge. Below the very ' +
        'large balance threshold the two readings agree on nil and this computes it. Here they do ' +
        'not agree, and §3.7 does not resolve it. Refusing rather than choosing.',
    );
    this.name = 'Div296NegativeEarningsError';
  }
}

const refuseYearsBeforeApplication = (fy: FinancialYear): void => {
  if (compareFinancialYears(fy, APPLICATION_YEAR) < 0) throw new Div296NotApplicableError(fy);
};

/**
 * Cited by everything that turns on the application year, so a result carries the T12 distinction
 * rather than a reader having to know it.
 */
const APPLICATION_YEAR_CONSUMED: Consumed = ['superannuation.division296.applicationYear', DIVISION_296.applicationYear];

// --- The reference balance — s 296-40(2) and transitional s 296-1(2) (T16) -----------------------

declare const TSB_REFERENCE: unique symbol;

export interface TotalSuperBalanceReferenceFigure {
  readonly fy: FinancialYear;
  /** Measured just before the start of the year. Disregarded entirely in FY2026-27. */
  readonly opening: TotalSuperBalance;
  /** Measured at the end of the year. Taken to be nil where the Person died during it (s 296-50). */
  readonly closing: TotalSuperBalance;
  /** s 296-50. Reported because it changes which balances exist, not merely how they are read. */
  readonly deceasedDuringYear: boolean;
  /** The balance both percentages are measured against. */
  readonly value: Cents;
  /** The rule, in the assumptions layer's own words — never restated here, so it cannot drift from it. */
  readonly rule: string;
  readonly provenance: ComputedProvenance;
}

/**
 * Branded so the only way to obtain one is `totalSuperBalanceReference`, which is the only caller
 * of `div296TotalSuperBalanceReference` anywhere in `core/`. A hand-picked balance cannot reach
 * `div296Tax`, and neither can a balance built by taking the greater of two figures in a year
 * where the opening one is struck out.
 */
/**
 * **Nominal, not structural — P3-41.** The brand is a `private` member of a type-only class, so a
 * spread of a real reference cannot carry it: `{ ...real, value: lie }` is TS2741, not a
 * `TotalSuperBalanceReference`. Nothing exists at runtime; the value is still a plain frozen record.
 */
declare class TotalSuperBalanceReferenceWitness { private readonly [TSB_REFERENCE]: true }

export type TotalSuperBalanceReference = TotalSuperBalanceReferenceFigure & TotalSuperBalanceReferenceWitness;

/**
 * ITAA 1997 s 296-40(2), read with transitional s 296-1(2) — **the T16 switch, called not copied**.
 *
 * The year rule itself is `div296TotalSuperBalanceReference` in `data/assumptions/super.ts`, held
 * there as a `config-derived` record with its derivation in words. This function's whole job is to
 * check the two balances are the two balances that year actually has, apply s 296-50 where it
 * applies, and hand them over.
 */
export const totalSuperBalanceReference = (input: {
  readonly fy: FinancialYear;
  readonly opening: TotalSuperBalance;
  readonly closing: TotalSuperBalance;
  /**
   * s 296-50. Required rather than defaulted, for the same reason `div293.ts` requires the
   * interest facts: `false` is a fact about the Person that the caller states.
   */
  readonly deceasedDuringYear: boolean;
}): TotalSuperBalanceReference => {
  const { fy, opening, closing } = input;
  refuseYearsBeforeApplication(fy);

  const openingRequired = justBeforeFinancialYear(fy);
  if (opening.measuredAt !== openingRequired) {
    throw new Div296BalanceDateError(fy, 'opening', opening.measuredAt, openingRequired);
  }
  const closingRequired = endOfFinancialYear(fy);
  if (closing.measuredAt !== closingRequired) {
    throw new Div296BalanceDateError(fy, 'closing', closing.measuredAt, closingRequired);
  }

  // s 296-50 — the balance after death is taken to be nil. The end-of-year balance of a Person who
  // died during the year is a balance after death, so it is the closing limb this lands on. Where
  // the opening limb is read at all (from FY2027-28) the two readings of the section diverge and
  // `TotalSuperBalanceAfterDeathError` says so; in FY2026-27 the opening limb is struck out, so
  // nil closing means nil reference under either reading and there is nothing to refuse.
  const afterDeath = DIVISION_296.totalSuperBalanceAfterDeath;
  const closingValue = input.deceasedDuringYear ? afterDeath.value : closing.value;
  if (input.deceasedDuringYear && fy !== APPLICATION_YEAR && opening.value > 0) {
    throw new TotalSuperBalanceAfterDeathError(fy, opening.value);
  }

  const rule = DIVISION_296.totalSuperBalanceReference;
  return Object.freeze({
    fy,
    opening,
    closing,
    deceasedDuringYear: input.deceasedDuringYear,
    value: div296TotalSuperBalanceReference(fy, opening.value, closingValue),
    rule: rule.derivation,
    provenance: provenanceOf(fy, [
      APPLICATION_YEAR_CONSUMED,
      ['superannuation.division296.totalSuperBalanceReference', rule],
      ['superannuation.division296.totalSuperBalanceAfterDeath', afterDeath],
    ] as readonly Consumed[]),
  }) as TotalSuperBalanceReference;
};

// --- Division 296 fund earnings — s 296-60, and the transitional CGT phase-in --------------------

/**
 * ITAA 1997 s 296-60(1), limb by limb. Every one of these is a fund-level figure off the fund's
 * own return, and `netCapitalGain` is **inside** `relevantTaxableIncome` at its full value — it is
 * named separately only because ITTPA 1997 s 296-60(2) discounts it.
 */
export interface Div296FundEarningsComponents {
  /** The entity's taxable income, or its tax loss expressed as a negative. */
  readonly relevantTaxableIncome: Cents;
  /** The net capital gain included in that taxable income, before the transitional discount. */
  readonly netCapitalGain: Cents;
  readonly assessableContributions: Cents;
  readonly netExemptCurrentPensionIncome: Cents;
  readonly nonArmsLengthComponent: Cents;
  readonly pooledSuperannuationTrustComponent: Cents;
}

declare const FUND_EARNINGS: unique symbol;

export interface Div296FundEarningsFigure {
  readonly fy: FinancialYear;
  readonly components: Div296FundEarningsComponents;
  readonly smallSuperannuationFund: boolean;
  /**
   * ITTPA 1997 s 296-60(2). The proportion of the net capital gain that **counts** — 1 where the
   * provision is spent, and 1 for a small superannuation fund, which s 296-60(3) excludes.
   */
  readonly netCapitalGainFactor: number;
  /** What the factor took out: `(1 − factor) × net capital gain`. Nil where the factor is 1. */
  readonly netCapitalGainDiscount: Cents;
  /** s 296-60(1) with s 296-60(2) applied. May be negative — a fund can make a loss. */
  readonly amount: Cents;
  readonly provenance: ComputedProvenance;
}

/**
 * Branded so a fund's earnings cannot be handed to `div296Tax` as if they were a Person's.
 *
 * **Nominal, not structural — P3-41.** The brand is a `private` member of a type-only class, so a
 * spread of real earnings cannot carry it: `{ ...real, amount: lie }` is TS2741, not a
 * `Div296FundEarnings`. Nothing exists at runtime; the value is still a plain frozen record.
 */
declare class Div296FundEarningsWitness { private readonly [FUND_EARNINGS]: true }

export type Div296FundEarnings = Div296FundEarningsFigure & Div296FundEarningsWitness;

const TRANSITIONAL_FACTORS: Readonly<Record<string, Rate | undefined>> = DIVISION_296.transitionalNetCapitalGainFactor;

/**
 * ITAA 1997 s 296-60(1), with the ITTPA 1997 s 296-60(2) net-capital-gain discount for the four
 * transitional years.
 *
 * The factor is looked up by financial year and there is no arithmetic on the year: the four
 * prescribed values are four separate records with four separate stamps, so shifting the phase-in
 * by a year means editing a record, not an offset. A year outside the table gets no discount,
 * which is what "the provision is spent" means from 2030-31 — and also what s 296-60(3) means for
 * a small superannuation fund in any year.
 */
export const div296FundEarnings = (input: {
  readonly fy: FinancialYear;
  readonly components: Div296FundEarningsComponents;
  /** s 296-60(3). Required, not defaulted — it decides whether the phase-in applies at all. */
  readonly smallSuperannuationFund: boolean;
}): Div296FundEarnings => {
  const { fy, components } = input;
  refuseYearsBeforeApplication(fy);
  if (components.netCapitalGain < 0) {
    throw new RangeError(
      `a net capital gain cannot be negative: ${components.netCapitalGain} cents. A net capital ` +
        'loss is not a gain and does not enter taxable income; it is carried forward by the fund ' +
        'and reduces a later year\'s gain, which is a figure this model is given, not one it works out.',
    );
  }

  // s 296-60(1): + relevant taxable income − assessable contributions + net exempt current pension
  // income − the non-arm's-length component + the pooled superannuation trust component. Two of
  // the five limbs subtract, and the arithmetic is written limb by limb so that is visible.
  const base = addCents(
    subCents(
      addCents(subCents(components.relevantTaxableIncome, components.assessableContributions), components.netExemptCurrentPensionIncome),
      components.nonArmsLengthComponent,
    ),
    components.pooledSuperannuationTrustComponent,
  );

  const prescribed = input.smallSuperannuationFund ? undefined : TRANSITIONAL_FACTORS[fy];
  const factor = prescribed?.value ?? 1;
  const discount = mulCents(components.netCapitalGain, 1 - factor);

  const consumed: Consumed[] = [
    APPLICATION_YEAR_CONSUMED,
    ['superannuation.division296.earningsBasis', DIVISION_296.earningsBasis],
  ];
  if (prescribed !== undefined) {
    consumed.push([`superannuation.division296.transitionalNetCapitalGainFactor.${fy}`, prescribed]);
  }

  const provenance = provenanceOf(fy, consumed);
  return Object.freeze({
    fy,
    components,
    smallSuperannuationFund: input.smallSuperannuationFund,
    netCapitalGainFactor: factor,
    netCapitalGainDiscount: discount,
    amount: subCents(base, discount),
    provenance: input.smallSuperannuationFund
      ? withCaveats(
          provenance,
          'the transitional net-capital-gain discount is not applied: ITTPA 1997 s 296-60(3) ' +
            'excludes a small superannuation fund, which instead resets its cost bases at ' +
            '30 June 2026. The register carries no mechanics for that reset (§3.7), so the net ' +
            'capital gain supplied must already reflect it — nothing here checks that it does',
        )
      : provenance,
  }) as Div296FundEarnings;
};

// --- The Person's total superannuation earnings — one figure, one brand (T15) --------------------

declare const SUPERANNUATION_EARNINGS: unique symbol;

export interface SuperannuationEarningsFigure {
  readonly fy: FinancialYear;
  /** The base **both** s 296-40 and s 296-45 take their proportion of. There is only ever one. */
  readonly amount: Cents;
  readonly basis: 'stated for this Person' | 'the whole of a fund whose only member is this Person (s 296-65)';
  readonly provenance: ComputedProvenance;
}

/**
 * Branded, and the reason is T15. `div296Tax` takes exactly one of these and there is no other
 * parameter a quantity of earnings could arrive through, so the two proportions cannot be applied
 * to two different bases: a `Cents` band of earnings is not assignable here, and building a second
 * figure means naming a financial year for it and giving it provenance at a public constructor.
 */
/**
 * **Nominal, not structural — P3-41.** The brand is a `private` member of a type-only class, so a
 * spread of real earnings cannot carry it: `{ ...real, amount: lie }` is TS2741, not a
 * `SuperannuationEarnings`. Nothing exists at runtime; the value is still a plain frozen record.
 */
declare class SuperannuationEarningsWitness { private readonly [SUPERANNUATION_EARNINGS]: true }

export type SuperannuationEarnings = SuperannuationEarningsFigure & SuperannuationEarningsWitness;

/**
 * The Person's total superannuation earnings for the year as reported to them — by the ATO on the
 * Division 296 assessment, or by the fund.
 *
 * `earningsBasis` is consumed rather than merely cited: it records that earnings are **realised**,
 * from the fund's taxable income, and that unrealised gains are not included as enacted. A caller
 * who computes this figure from a movement in the Total Super Balance is implementing the 2023
 * exposure draft, not the Act.
 */
export const superannuationEarnings = (input: { readonly fy: FinancialYear; readonly amount: Cents }): SuperannuationEarnings => {
  refuseYearsBeforeApplication(input.fy);
  return Object.freeze({
    fy: input.fy,
    amount: input.amount,
    basis: 'stated for this Person',
    provenance: provenanceOf(input.fy, [
      APPLICATION_YEAR_CONSUMED,
      ['superannuation.division296.earningsBasis', DIVISION_296.earningsBasis],
    ] as readonly Consumed[]),
  }) as SuperannuationEarnings;
};

/**
 * ITAA 1997 s 296-65, for the one attribution that needs no basis: the Person holds the whole of
 * the fund, so the whole of its Division 296 fund earnings are theirs.
 *
 * **This route is `unverified`, and only this route.** Even an identity attribution runs through
 * s 296-65(3)'s "matters prescribed by the regulations", and a fund with a single member's
 * interest is a small superannuation fund, for which s 296-65(5) prescribes a different method
 * again. Neither regulation has been read in full: the s 296-65(5) instrument `F2026L00726`
 * (regs 296-65.01, 296-70.01, 296-70.02) **was retrieved** and left unread — O17 — and nothing
 * records either way for s 296-65(3). Corrected 2026-09-10: this comment claimed neither
 * regulation had ever been retrieved, which O17 falsifies; R6 permits only the weaker absence,
 * and O70 is the rule against asserting an unchecked negative at all. The weakness is carried on
 * the figure that depends on it, exactly as `lowTaxContributionsFromConcessional` carries P3-5 U1,
 * so a blanket caveat on every Division 296 number does not stop meaning anything.
 */
export const superannuationEarningsFromWholeFund = (input: {
  readonly fund: Div296FundEarnings;
  /** Stated, never assumed. `false` is the case s 296-65(3) leaves unavailable. */
  readonly personHoldsWholeFund: boolean;
}): SuperannuationEarnings => {
  const { fund } = input;
  if (!input.personHoldsWholeFund) throw new Div296AttributionBasisError(fund.fy);
  return Object.freeze({
    fy: fund.fy,
    amount: fund.amount,
    basis: 'the whole of a fund whose only member is this Person (s 296-65)',
    provenance: mergeProvenance(
      fund.provenance,
      provenanceOf(fund.fy, [
        ['the s 296-65 attribution of Division 296 fund earnings to this Person', { confidence: 'unverified' }],
      ] as readonly Consumed[]),
    ),
  }) as SuperannuationEarnings;
};

// --- The thresholds — CPI-indexed, and the base quarter is the newest quarter there is ----------

export interface Div296Thresholds {
  readonly fy: FinancialYear;
  /** ITAA 1997 s 296-30. */
  readonly large: Cents;
  /** ITAA 1997 s 296-35. */
  readonly veryLarge: Cents;
  /**
   * The December quarter index number both thresholds were indexed to (s 960-285(5)) — one number,
   * because both specs read the same quarter. In FY2026-27 it is the base quarter's own number and
   * the factor is exactly 1.
   */
  readonly indexNumber: DecemberQuarterIndex;
  readonly provenance: ComputedProvenance;
}

/**
 * One threshold under s 960-285, and **the only place in this module a threshold amount is
 * produced**. Both thresholds come through here, so a literal substituted for the indexation is a
 * single edit that every computed year sees — which is what makes the FY2026-27 figure checkable
 * at all. Hard-coding $3,000,000 is invisible while one year is computable and visible the moment
 * two are.
 *
 * The index is read off the threshold's own spec and never written here: a threshold looking up
 * the wrong index is the T14 mutation, and `indexCapFromCpiSeries` refuses a spec that is not
 * CPI-indexed rather than quietly using a CPI series for an AWOTE cap.
 *
 * O41 is structural and stays structural. The numerator and the denominator are both read out of
 * the one `CpiSeries`, which names its reference base once, so this function has no parameter
 * through which a mixed reference-base pair could arrive — the same shape `generalTransferBalanceCap`
 * uses, for the same reason.
 */
const indexedThreshold = (input: {
  readonly fy: FinancialYear;
  readonly series: CpiSeries;
  /** For the refusal messages. */
  readonly name: string;
  readonly specKey: string;
  readonly spec: ProvenanceBearing & { readonly value: CapIndexationSpec };
  readonly publishedKey: string;
  readonly published: ProvenanceBearing & { readonly fy: FinancialYear; readonly value: Cents };
}): { readonly amount: Cents; readonly indexNumber: number; readonly consumed: readonly Consumed[] } => {
  const { fy, series, published } = input;
  const spec = input.spec.value;
  const quarter = decemberQuarterBefore(fy);

  // Two refusals on two different grounds, and the second is the one a caller meets in practice.
  // A series with no number for the spec's own base quarter cannot be indexed *from* — that is a
  // supplied-series error, since the register's own series carries December 2025. A series with no
  // number for this year's December quarter cannot be indexed *to*, which is every year after
  // FY2026-27 today: the ABS has not published December 2026, and the forward series is a Setting
  // (register O5), so growing last year's threshold by an assumed rate is the T13 mutation.
  if (cpiIndexNumberAt(series, spec.baseQuarter) === undefined) {
    throw new UnsourcedIndexBaseError(spec.index, fy, input.name);
  }
  const observed = cpiIndexNumberAt(series, quarter);
  if (observed === undefined) throw new MissingIndexNumberError(spec.index, fy, input.name);

  const amount = indexCapFromCpiSeries(spec, series, quarter);

  const consumed: Consumed[] = [
    [input.specKey, input.spec],
    [`the CPI series published on the ${series.referenceBase}`, series],
  ];
  if (published.fy === fy) {
    // The published year is a cross-check, not a second source of truth. It is a weak one by
    // construction — this year's December quarter *is* the base quarter, so the factor is 1 on any
    // series and the computation can only reproduce the spec's base amount. What it does catch is
    // the two records drifting apart: a published threshold edited without its spec, or the other
    // way round, which is exactly how a $3,150,000 base amount would arrive with a $3,000,000
    // published figure still beside it.
    if (amount !== published.value) throw new PublishedCapMismatchError(input.name, fy, amount, published.value);
    consumed.push([input.publishedKey, published]);
  }
  if (quarter !== spec.baseQuarter) {
    // O41 / U9 rides on the *identification* of the series, so it is consumed only where it can
    // change a number. At the base quarter the ratio is one number over itself and is 1 on either
    // reference base; anywhere else the base is load-bearing and the result arrives `unverified`.
    consumed.push(['superannuation.capIndexation.cpiReferenceBase', CPI_REFERENCE_BASE]);
  }
  return { amount, indexNumber: observed, consumed };
};

/**
 * ss 296-30 and 296-35, indexed by s 960-285 — CPI, from the December **2025** quarter, in
 * $150,000 and $500,000 steps (s 960-265 items 10B and 10C).
 *
 * **Exactly one year is computable from published data, and the reason is the base quarter, not a
 * missing figure.** December 2025 is the most recent December quarter the ABS has published, and
 * it is also this Division's base quarter, so FY2026-27's factor is `100.32 / 100.32 = 1` and
 * there is no later December quarter in existence to index to. FY2027-28 becomes computable the
 * day the ABS publishes December 2026 — the caller supplies the series that contains it. Contrast
 * `generalTransferBalanceCap`, which indexes from December 2016 and therefore has nine years
 * behind it: same machinery, same shape of parameter, a decade's difference in what it can reach.
 *
 * The parameter is a whole `CpiSeries` rather than an index number for the same reason it is there
 * — O41. A series names its reference base once and both halves of every factor are read out of
 * it, so a mixed pair is not something this API can express, and a forecast series carries its own
 * confidence into the result instead of being laundered into the register's.
 *
 * T11 is what the steps are for: CPI must lift $3,000,000 clear of $3,150,000 — a cumulative 5%
 * move — before the large threshold changes at all. It plateaus and then steps; it never escalates
 * smoothly.
 */
export const div296Thresholds = (fy: FinancialYear, series: CpiSeries = CPI_INDEX_NUMBERS.value): Div296Thresholds => {
  refuseYearsBeforeApplication(fy);
  const large = indexedThreshold({
    fy,
    series,
    name: 'large super balance threshold',
    specKey: 'superannuation.capIndexation.div296LargeBalanceThreshold',
    spec: SPECS.div296LargeBalanceThreshold,
    publishedKey: 'superannuation.division296.largeBalanceThreshold',
    published: DIVISION_296.largeBalanceThreshold,
  });
  const veryLarge = indexedThreshold({
    fy,
    series,
    name: 'very large super balance threshold',
    specKey: 'superannuation.capIndexation.div296VeryLargeBalanceThreshold',
    spec: SPECS.div296VeryLargeBalanceThreshold,
    publishedKey: 'superannuation.division296.veryLargeBalanceThreshold',
    published: DIVISION_296.veryLargeBalanceThreshold,
  });
  return Object.freeze({
    fy,
    large: large.amount,
    veryLarge: veryLarge.amount,
    indexNumber: decemberQuarterIndex({
      index: SPECS.div296LargeBalanceThreshold.value.index,
      fy,
      indexNumber: large.indexNumber,
      confidence: series.confidence,
      source: series.source,
    }),
    provenance: provenanceOf(fy, [...large.consumed, ...veryLarge.consumed]),
  });
};

// --- The charge — ss 296-40 and 296-45, and Imposition Act 2026 s 5 ------------------------------

/**
 * One threshold's proportion of the year's earnings, and the tax on it. Two of these are produced
 * per assessment, from the same earnings figure and the same reference balance, differing only in
 * the threshold each is measured against and the rate each is taxed at.
 */
export interface Div296EarningsProportion {
  readonly section: 's 296-40' | 's 296-45';
  readonly threshold: Cents;
  /** `(reference − threshold) ÷ reference × 100`, to 2 dp, rounded up at the third (ss 296-40(3), 296-45(3)). Nil at or below the threshold. */
  readonly percentage: number;
  /** `percentage ÷ 100 × the year's earnings` — **the same earnings for both proportions**. */
  readonly amount: Cents;
  /** Imposition Act 2026 s 5: 15% on the s 296-40 proportion, a further 10% on the s 296-45 one. */
  readonly rate: number;
  readonly tax: Cents;
}

export interface Div296Assessment {
  readonly fy: FinancialYear;
  readonly totalSuperBalanceReference: TotalSuperBalanceReference;
  readonly earnings: SuperannuationEarnings;
  readonly thresholds: Div296Thresholds;
  /** The section that removes liability, or `null`. ss 296-20 and 296-25. */
  readonly excludedBy: string | null;
  /** Empty where the Person is excluded, or where the reference balance is at or below the large threshold. */
  readonly proportions: readonly Div296EarningsProportion[];
  /** s 296-40. The 15% base. */
  readonly taxableSuperannuationEarnings: Cents;
  /** s 296-45. The additional 10% base — an **extra slice of the same earnings**, not a band above the first. */
  readonly veryLargeBalanceEarningsComponent: Cents;
  readonly tax: Cents;
  readonly provenance: ComputedProvenance;
}

/**
 * ss 296-20 and 296-25 — the two Persons Division 296 does not reach at all. Required rather than
 * defaulted, as `ACCUMULATION_INTEREST_ONLY` is in `div293.ts`: `false` twice is a statement about
 * the Person, not an absence of information.
 */
export interface Div296ExclusionFacts {
  /** s 296-20. A child recipient of a superannuation income stream **at any time in the year**. */
  readonly childRecipientOfSuperannuationIncomeStream: boolean;
  /** s 296-25. A structured settlement contribution **ever** made in respect of the Person. */
  readonly structuredSettlementContributionEverMade: boolean;
}

export const NO_DIV_296_EXCLUSION: Div296ExclusionFacts = Object.freeze({
  childRecipientOfSuperannuationIncomeStream: false,
  structuredSettlementContributionEverMade: false,
});

/**
 * ss 296-40(3) and 296-45(3): two decimal places, rounding **up** where the third decimal is 5 or
 * more. The same shape as `indexationFactor` in the assumptions layer, at two places instead of
 * three. Truncating instead understates every percentage that is not exact — 14.2857% becomes
 * 14.28% rather than 14.29%, and the difference reaches the cent on any real balance.
 */
const roundPercentage = (percent: number): number => Math.floor(percent * 100 + 0.5) / 100;

/**
 * ITAA 1997 ss 296-40 and 296-45 with the Superannuation (BSFSS) Imposition Act 2026 s 5 rates.
 *
 * **The one thing this function exists to get right is that there is a single earnings base.** The
 * two proportions below are built by one `map` over a two-row rule table, through one closure over
 * `earnings.amount`; the s 296-45 slice is *added to* the s 296-40 slice, never carved out of it.
 * Below $10,000,000 the two structures agree, which is why the commentary framing survives — above
 * it they do not, and the difference is the whole of T15.
 *
 * **Rounding.** The register prescribes rounding for the percentages only. Each proportion's dollar
 * amount is rounded to the whole cent, and the tax on it is rounded to the whole cent again, so
 * `taxableSuperannuationEarnings` and `veryLargeBalanceEarningsComponent` are reportable figures
 * rather than intermediate floats. Nothing else rounds.
 */
export const div296Tax = (input: {
  readonly reference: TotalSuperBalanceReference;
  readonly earnings: SuperannuationEarnings;
  readonly exclusions: Div296ExclusionFacts;
  /**
   * The CPI series the two thresholds are indexed from, defaulting to the register's own. A whole
   * series and never a loose index number (O41), and the only way to assess a year after FY2026-27:
   * until the ABS publishes December 2026 there is no such series, and the assessment refuses with
   * `MissingIndexNumberError` rather than assessing this year's thresholds under a later year's label.
   */
  readonly cpiSeries?: CpiSeries;
}): Div296Assessment => {
  const { reference, earnings } = input;
  const fy = reference.fy;
  if (earnings.fy !== fy) {
    throw new RangeError(
      `the total superannuation earnings supplied are for FY${earnings.fy} and the Total Super ` +
        `Balance reference is for FY${fy}. s 296-40 measures one year's earnings against that ` +
        'same year\'s balance; one year\'s earnings against another year\'s balance is not a Person.',
    );
  }

  const rate = DIVISION_296.baseRate;
  const additionalRate = DIVISION_296.additionalRate;
  const rounding = DIVISION_296.percentageRounding;
  const exclusions = DIVISION_296.exclusions;

  const thresholds = div296Thresholds(fy, input.cpiSeries);
  const base = provenanceOf(fy, [
    ['superannuation.division296.baseRate', rate],
    ['superannuation.division296.additionalRate', additionalRate],
    ['superannuation.division296.percentageRounding', rounding],
    ['superannuation.division296.exclusions', exclusions],
  ] as readonly Consumed[]);
  const provenance = mergeProvenance(base, thresholds.provenance, reference.provenance, earnings.provenance);

  // ss 296-20 and 296-25: no liability at all, whatever the balance and whatever the earnings.
  const excludedBy = input.exclusions.childRecipientOfSuperannuationIncomeStream
    ? 's 296-20 — a child recipient of a superannuation income stream at some time in the year'
    : input.exclusions.structuredSettlementContributionEverMade
      ? 's 296-25 — a structured settlement contribution has been made in respect of the Person'
      : null;
  const nil = toCents(0);
  if (excludedBy !== null) {
    return Object.freeze({
      fy,
      totalSuperBalanceReference: reference,
      earnings,
      thresholds,
      excludedBy,
      proportions: Object.freeze([]),
      taxableSuperannuationEarnings: nil,
      veryLargeBalanceEarningsComponent: nil,
      tax: nil,
      provenance,
    });
  }

  if (earnings.amount < 0 && reference.value > thresholds.veryLarge) {
    throw new Div296NegativeEarningsError(fy, earnings.amount);
  }

  // The proportion of the year's earnings one threshold reaches. `earnings.amount` is closed over
  // rather than passed: there is one earnings figure in this function and every proportion is a
  // proportion of it. A band calculation would need a second base, and there is not one to have.
  const proportionOfTheYearsEarnings = (
    section: Div296EarningsProportion['section'],
    threshold: Cents,
    proportionRate: number,
  ): Div296EarningsProportion => {
    const percentage = reference.value > threshold
      ? roundPercentage((subCents(reference.value, threshold) / reference.value) * 100)
      : 0;
    const amount = mulCents(earnings.amount, percentage / 100);
    return Object.freeze({ section, threshold, percentage, amount, rate: proportionRate, tax: mulCents(amount, proportionRate) });
  };

  // §3.7 guards the s 296-40 limb with "total superannuation earnings > 0". Nil and negative
  // earnings alike produce no taxable superannuation earnings; the negative case above the very
  // large balance threshold has already been refused, because there §3.7's two readings differ.
  const proportions: readonly Div296EarningsProportion[] =
    earnings.amount > 0 && reference.value > thresholds.large
      ? Object.freeze([
          proportionOfTheYearsEarnings('s 296-40', thresholds.large, rate.value),
          proportionOfTheYearsEarnings('s 296-45', thresholds.veryLarge, additionalRate.value),
        ])
      : Object.freeze([]);

  const find = (section: Div296EarningsProportion['section']): Cents =>
    proportions.find((each) => each.section === section)?.amount ?? nil;

  return Object.freeze({
    fy,
    totalSuperBalanceReference: reference,
    earnings,
    thresholds,
    excludedBy,
    proportions,
    taxableSuperannuationEarnings: find('s 296-40'),
    veryLargeBalanceEarningsComponent: find('s 296-45'),
    // Imposition Act 2026 s 5: 15% of the s 296-40 proportion **plus** 10% of the s 296-45 one.
    // The second is an addition, never a replacement and never a band carved out of the first.
    tax: proportions.reduce((total, each) => addCents(total, each.tax), nil),
    provenance: earnings.amount < 0
      ? withCaveats(
          provenance,
          'the year\'s total superannuation earnings are negative and nothing carries the loss ' +
            'forward: §3.7 records no rule for a Division 296 loss, so this model reduces no ' +
            'later year by it and may over-state a later year\'s Division 296 tax',
        )
      : provenance,
  });
};
