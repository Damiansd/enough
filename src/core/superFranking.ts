// P3-7a and P3-7b — **franking credits received inside superannuation.** Register §5A, and §5A.3
// in particular; traps T43, T44, T45, T46, T49.
//
// The whole of §5A.3's chain, in the order the statute runs it:
//
//   s 207-20(1)   the franking credit is *added* to assessable income
//   s 207-20(2)   a tax offset equal to the same amount
//   s 207-90      denies **both** where the distribution is exempt or NANE income
//   s 207-110     Subdiv 207-E, "Exceptions to the rules in Subdivision 207-D" — disapplies
//                 s 207-90 for the ss 295-385 / 295-390 / 295-400 amounts, i.e. **for ECPI**
//   s 67-25(1)    Division 207 offsets are subject to the refundable tax offset rules
//   s 63-10(1) item 40   "You can get a refund of the remaining amount"
//
// **T45 is why this file is separate from `superPhase.ts`, and it is a sequencing trap.** Read
// Division 207 and stop at s 207-90 — which has no superannuation carve-out on its face — and a
// Retirement Phase fund gets **nothing**: no gross-up, no offset, no refund. That is not a small
// error. It is the exact inverse of the truth, which is that a Retirement Phase fund is the one
// holder in the whole model that gets the credit back **in full and in cash**, and it turns the
// best case into the worst. The rescue is one Subdivision later.
//
// **How this file is protected from that reading, structurally rather than by assertion.** There
// is **no expression here in which the offset is anything but the credit.** s 207-20(2) gives an
// offset equal to the credit; s 207-110 makes exempt current pension income a non-event for it; so
// the correct code has no exemption branch at all, and the mutation cannot be written by flipping
// a condition — it has to *add* one. Nothing below reads `interest.phase`, compares against
// `'retirement'`, or contains a zero for the offset to be set to. Phase reaches the answer through
// exactly one route: `fundEarningsTax`, which decides the **rate on the grossed-up income** and
// decides nothing else.
//
// That routing is also how the TTR trap is inherited rather than re-asserted. A transition to
// retirement income stream is an `AccumulationInterest` — `superPhase.ts` makes writing anything
// else a `tsc` error — so "a TTR fund's credits are refunded in full because it is paying a
// pension" is not a mistake this file can make. It has no opinion about TTR at all.
//
// **The two answers, in one sentence each.**
//
//   * **Retirement Phase (ECPI).** Earnings tax 0%, so there is nothing for the offset to be
//     applied against, and the whole credit is refunded in cash. The Retirement Phase rate is a
//     zero the credit is **not** multiplied by — it multiplies the *income*, not the offset.
//   * **Accumulation Phase, and a TTR pension with it.** 15% on the grossed-up amount, the credit
//     offsets it, and the excess is refunded in cash. Because both corporate rates (25% and 30%)
//     exceed 15%, a **fully** franked distribution always leaves a refund; a lightly franked one
//     need not, and this file computes both directions rather than flooring one of them away.
//
// **Why one distribution can be answered on its own.** In law the offset runs against the fund's
// whole liability for the year, not against the tax on this distribution. Decomposing it is exact
// — not an approximation — **because the excess is refundable**: `tax(other) + tax(grossed-up) −
// credit` is the same number whichever order it is assembled in, since nothing is floored at nil
// on the way through. If excess credits were *not* refundable (a non-complying fund, s 67-25(1A)),
// the decomposition would be invalid, which is why that case is refused below rather than
// computed. The only cost of decomposing is rounding: `mulCents` rounds each product to the whole
// cent, so the tax on two amounts computed separately can differ by a cent from the tax on their
// sum. Where that matters, state the fund's earnings as one figure through `fundEarningsTax` and
// use this module for the credit alone.
//
// **The gross-up rate is an input and never a figure here (T43, T44).** s 202-60(2) fixes the rate
// to *the entity making the distribution*, so a diversified portfolio spans both 25% and 30% and
// no single legislated rate exists for it. There is therefore no rate in this file, no register
// row behind one, and nothing to index: `frankedDistributionFromStatement` needs no rate at all —
// the AMMA statement reports the franked amount and the credit as two dollar figures — and
// `frankedDistributionFromRate` takes the payer's rate from the caller with the caller's own
// confidence on it, exactly as `superCaps.ts` takes a December quarter index number. Neither 0.25
// nor 0.30 appears below, and the derived route deliberately does **not** check that the rate it
// is given is one of them.
//
// Where a rate *is* used, `f × D × r/(1−r)` is computed directly. The ATO's own worked examples
// materialise the gross-up rate as 2.3333 and divide by it, which gives $42,857.75 on $100,000
// fully franked at 30% against $42,857.142857 exact — **60c wrong per $100,000**. The multiplier
// here is formed at full double precision and applied once, and the single rounding is
// `mulCents`'s, to the whole cent, half away from zero.
//
// **What is refused rather than answered with a nil credit.** s 207-110 disapplies ss 207-90 and
// 207-95 **only**. It is no shelter from the Subdivision 207-F denials, and it says nothing about
// who may be refunded. So the three facts that can destroy the credit outright are stated by the
// caller and refused when absent — never computed as a zero, because a zero produced *here* is
// indistinguishable from the T45 mistake at the point where it matters most:
//
//   * **Not a qualified person** (§5A.4, Subdiv 207-F). The 45-day holding rule is not counted in
//     this model — P3-22e assumes qualification and says so on screen — and a complying fund has
//     no small shareholder relief to fall back on.
//   * **A non-complying fund or ADF** (§5A.3, s 67-25(1A)): excess credits are not refundable, so
//     the decomposition above stops being exact.
//   * **A non-resident** (§5A.3, ss 128B(3)(ga), 128D): the distribution is NANE and s 207-90(1)(c)
//     denies gross-up and offset outright, with no s 207-110 exception to reach.
//
// **The transfer balance cap gap, and what franking does to it.** `superPhase.ts` lets a caller
// state any amount as Retirement Phase, because no cap gates it (P3-9), and every Retirement Phase
// result carries a caveat saying so. That caveat is merged into every result here. Franking
// **widens** the gap without making it unbounded: an over-stated Retirement Phase balance already
// escaped 15% of its earnings, and the earnings base is now the *grossed-up* distribution rather
// than the cash, so the same misstatement costs `1/(1−r)` times as much — about 43% more at the
// 30% rate. It does not create a new unbounded error, because the credit itself is refunded in
// full on **both** sides of the phase line (T46): the difference between the two phases is the
// 15%, and only the 15%.
//
// **Not here.** The individual side of franking (§5A is one source, P3-22 is the other consumer),
// the qualified person machinery (P3-22e), the day the refund becomes cash (P3-22g, register O28),
// the TTR conversion limb of P3-8, and the transfer balance cap (P3-9).
//
// A dollar amount or a rate appearing below as a literal is a bug.
import { addCents, mulCents, subCents, toCents } from './money.js'; // `.js` is correct in a `.ts` file — see tsconfig.json
import type { Cents } from './money.js';
import { mergeProvenance, provenanceOf, withCaveats } from './provenance.js';
import type { ComputedProvenance, Consumed, ProvenanceBearing } from './provenance.js';
import { fundEarningsTax } from './superPhase.js';
import type { FundEarningsTax, PhaseYearFraction, SuperInterest } from './superPhase.js';
import type { Confidence, FinancialYear } from '../data/assumptions/types.js';

// --- The facts that decide whether the credit exists at all --------------------------------------

/**
 * The three §5A.3 / §5A.4 gates, each stated by the caller and none of them defaulted, in the
 * shape `div293.ts` uses for the Subdiv 293-D/E/F interests. `false` on any of them is a fact about
 * the Household's holding, and it is refused rather than answered — see the file header.
 */
export interface FundFrankingFacts {
  /** §5A.3, ITAA 1997 s 67-25(1A). A non-complying fund's or ADF's excess credits are not refundable. */
  readonly complyingFund: boolean;
  /** §5A.3, ITAA 1936 ss 128B(3)(ga), 128D. A non-resident's franked dividend is NANE. */
  readonly australianResident: boolean;
  /** §5A.4, Subdiv 207-F. Stated, not counted: the 45-day machinery is P3-22e. */
  readonly qualifiedPerson: boolean;
}

/**
 * The Household's fund, as P3-22e models it: complying, resident, and **assumed** to satisfy the
 * 45-day holding rule. The assumption is not silent — it reaches `provenance.caveats` on every
 * result, because §5A.4 requires it to be stated where it can be read.
 */
export const COMPLYING_RESIDENT_QUALIFIED_FUND: FundFrankingFacts = Object.freeze({
  complyingFund: true,
  australianResident: true,
  qualifiedPerson: true,
});

/**
 * §5A.6 / register **O27**, carried at its own epistemic status and never at a bare
 * `primary-verified`. The statutory text is primary-verified — ITAA 1936 former s 160APHT(1)(a)
 * opens "the taxpayer is an individual" — but the *conclusion* that a complying fund therefore has
 * no equivalent relief at any credit level is **inferred from statutory structure, not stated in
 * terms**: the ATO's guidance frames two separate alternatives and never negates it in one
 * sentence. Accepted by user ruling and recorded at §5A/O27.
 *
 * It is consumed by `NotAQualifiedPersonError`, which is the only place it decides anything: it is
 * the reason a fund under $5,000 of credits that fails the holding rule is refused here rather
 * than waved through on the individual's relief. On the computing path it changes no number, so it
 * is carried as a caveat line rather than as a confidence downgrade on figures that do not depend
 * on it.
 */
export const NO_SMALL_SHAREHOLDER_RELIEF_FOR_SUPER: ProvenanceBearing & {
  readonly rule: string;
  readonly source: string;
  readonly registerSection: string;
} = Object.freeze({
  rule:
    'a complying superannuation fund, APRA-regulated or SMSF, has no small shareholder relief at ' +
    'any credit level and must satisfy the 45-day holding rule for every parcel',
  source: 'ITAA 1936 (former) s 160APHT(1)(a), "the taxpayer is an individual"',
  registerSection: '§5A.6 / O27',
  confidence: 'secondary-only',
});

const QUALIFICATION_ASSUMED =
  'the fund is stated to be a qualified person for this distribution: register §5A.4’s 45-day ' +
  'holding rule is not counted in this model (P3-22e), and the individual’s $5,000 small ' +
  'shareholder relief is not available to a complying fund to fall back on — a conclusion ' +
  'inferred from statutory structure, not stated in terms (§5A.6, register O27)';

// --- Refusals -------------------------------------------------------------------------------------

export class NotAQualifiedPersonError extends RangeError {
  constructor(fy: FinancialYear) {
    super(
      `the FY${fy} franking credit cannot be stated for a fund that is not a qualified person. ` +
        'ITAA 1997 s 207-110 disapplies ss 207-90 and 207-95 only — it is no shelter from the ' +
        'Subdivision 207-F denials, so exempt current pension income does not rescue a failed ' +
        `holding rule. And ${NO_SMALL_SHAREHOLDER_RELIEF_FOR_SUPER.rule}: ` +
        `${NO_SMALL_SHAREHOLDER_RELIEF_FOR_SUPER.source}, which is ` +
        `${NO_SMALL_SHAREHOLDER_RELIEF_FOR_SUPER.confidence} — inferred from statutory structure, ` +
        `not stated in terms (register ${NO_SMALL_SHAREHOLDER_RELIEF_FOR_SUPER.registerSection}). ` +
        'This refuses rather than returning a nil credit, because a nil produced by this module ' +
        'is indistinguishable from the T45 mistake it exists to prevent: the day someone reads a ' +
        'zero here and concludes that Retirement Phase destroys the credit is the day the model ' +
        'reports the best case as the worst. The 45-day count itself is P3-22e and is not built.',
    );
    this.name = 'NotAQualifiedPersonError';
  }
}

export class NonComplyingFundError extends RangeError {
  constructor(fy: FinancialYear) {
    super(
      `the FY${fy} franking outcome cannot be stated for a non-complying superannuation fund or ` +
        'an approved deposit fund. ITAA 1997 s 67-25(1A) makes their excess credits ' +
        'non-refundable (register §5A.3), and this module answers one distribution at a time — a ' +
        'decomposition that is exact only while nothing is floored at nil on the way through. ' +
        'With no refund, the credit has to be run against the fund\'s whole liability for the ' +
        'year, and neither that liability nor what happens to the unusable remainder is in the ' +
        'register.',
    );
    this.name = 'NonComplyingFundError';
  }
}

export class NonResidentFrankedDistributionError extends RangeError {
  constructor(fy: FinancialYear) {
    super(
      `the FY${fy} franked distribution is to a non-resident, and there is no gross-up and no ` +
        'offset to compute. ITAA 1936 ss 128B(3)(ga) and 128D make it non-assessable non-exempt ' +
        'income, and ITAA 1997 s 207-90(1)(c) denies both outright — this is the one route on ' +
        'which s 207-90 is the end of the chain, with no s 207-110 exception to reach (register ' +
        '§5A.3). It is refused rather than answered as nil so that no nil credit is ever produced ' +
        'here, and the residence of the fund is not something this model tracks.',
    );
    this.name = 'NonResidentFrankedDistributionError';
  }
}

export class FrankingYearMismatchError extends RangeError {
  constructor(fy: FinancialYear, distributionFy: FinancialYear) {
    super(
      `the franked distribution supplied is for FY${distributionFy} and is being applied to ` +
        `FY${fy}. A franking credit is an offset in the year the distribution is made, and the ` +
        'fund earnings tax it is set against is a figure for one year — one year\'s credit ' +
        'against another year\'s liability is not a fund\'s return.',
    );
    this.name = 'FrankingYearMismatchError';
  }
}

const refuseDeniedDistributions = (fy: FinancialYear, facts: FundFrankingFacts): void => {
  if (!facts.complyingFund) throw new NonComplyingFundError(fy);
  if (!facts.australianResident) throw new NonResidentFrankedDistributionError(fy);
  if (!facts.qualifiedPerson) throw new NotAQualifiedPersonError(fy);
};

// --- The distribution — ITAA 1997 ss 207-20(1), 202-60(2), 203-35 ----------------------------------

declare const FRANKED_DISTRIBUTION: unique symbol;

export interface FrankedDistributionFigure {
  readonly fy: FinancialYear;
  /** `D` — the frankable distribution, in cash. */
  readonly frankedAmount: Cents;
  /** The credit attached to it. Either reported on the statement or `f × D × r/(1−r)`. */
  readonly frankingCredit: Cents;
  /** s 207-20(1): `D + credit`. **An addition of the credit, not a rate applied to the cash.** */
  readonly grossedUpAmount: Cents;
  /** Which route produced the credit, so an audit trail can tell whether any rate was used at all. */
  readonly creditRoute:
    | 'the credit as reported, with no rate used at all'
    | 'derived from the payer’s corporate tax rate for imputation purposes';
  readonly provenance: ComputedProvenance;
}

/**
 * Branded, so the only ways to obtain one are the two constructors below. A plain object with a
 * `frankingCredit` on it does not satisfy this type — which is what stops a credit computed by
 * dividing a distribution by 2.3333 arriving here wearing a confidence it did not earn.
 *
 * **Nominal, not structural — P3-41.** The brand is a `private` member of a type-only class, so a
 * spread of a real distribution cannot carry it: `{ ...real, frankingCredit: lie }` is TS2741, not
 * a `FrankedDistribution`. Nothing exists at runtime; the value is still a plain frozen record.
 */
declare class FrankedDistributionWitness { private readonly [FRANKED_DISTRIBUTION]: true }

export type FrankedDistribution = FrankedDistributionFigure & FrankedDistributionWitness;

const buildDistribution = (input: {
  readonly fy: FinancialYear;
  readonly frankedAmount: Cents;
  readonly frankingCredit: Cents;
  readonly creditRoute: FrankedDistributionFigure['creditRoute'];
  readonly provenance: ComputedProvenance;
}): FrankedDistribution => {
  if (!Number.isSafeInteger(input.frankedAmount) || input.frankedAmount < 0) {
    throw new RangeError(`a franked distribution is a whole number of cents and is not negative: ${input.frankedAmount}`);
  }
  if (!Number.isSafeInteger(input.frankingCredit) || input.frankingCredit < 0) {
    throw new RangeError(`a franking credit is a whole number of cents and is not negative: ${input.frankingCredit}`);
  }
  return Object.freeze({
    ...input,
    grossedUpAmount: addCents(input.frankedAmount, input.frankingCredit),
  }) as FrankedDistribution;
};

/**
 * The caveat a stated franked amount carries: its `source`, whole. Exported because a source can
 * name a Person, and the connector translates the sentence by calling this (plan_ai.md §13).
 */
export const statedFrankingCaveat = (source: string): string =>
  `the franked amount and the franking credit are stated from ${source}, not derived ` + 'from any rate (register §5A.1, T43)';

/**
 * **T43's preferred route, and the one that needs no rate.** An AMMA or annual tax statement
 * reports the franked amount and the franking credit as two separate dollar figures, after which
 * `grossed_up = franked + credit` is an addition and nothing else — no franking percentage, no
 * corporate rate, no gross-up rate, and so nothing for a portfolio-level constant to creep into.
 *
 * The statement is the caller's document, not a register figure, so it carries its own source and
 * its own confidence through to every result computed from it.
 */
export const frankedDistributionFromStatement = (input: {
  readonly fy: FinancialYear;
  readonly frankedAmount: Cents;
  readonly frankingCredit: Cents;
  readonly source: string;
  readonly confidence: Confidence;
}): FrankedDistribution =>
  buildDistribution({
    fy: input.fy,
    frankedAmount: input.frankedAmount,
    frankingCredit: input.frankingCredit,
    creditRoute: 'the credit as reported, with no rate used at all',
    provenance: withCaveats(
      provenanceOf(input.fy, [
        ['the franked amount and credit as reported', { confidence: input.confidence }],
      ] as readonly Consumed[]),
      statedFrankingCaveat(input.source),
    ),
  });

/**
 * `f × D × r/(1−r)` — ITAA 1997 s 203-35 with s 202-60(2), computed **directly**.
 *
 * `payerCorporateTaxRate` is `r`, and it is **the rate of the entity making the distribution**,
 * for the income year the distribution is made — not the fund's, and not a market-wide rate. It is
 * supplied by the caller with its own confidence, because s 202-60(2) leaves no portfolio-level
 * rate to legislate: a diversified holding spans both the 25% and the 30% rate at once, so what
 * the Household supplies is a **forecast** (register §5A.1's last row, T43, P3-22h) and every
 * figure derived from it inherits that confidence.
 *
 * The rate is validated as a rate and **not** against 0.25 or 0.30. Checking it against the two
 * legislated figures would put them in this file, which is precisely what T43 forbids, and would
 * reject the blended rate a portfolio actually has.
 */
export const frankedDistributionFromRate = (input: {
  readonly fy: FinancialYear;
  readonly frankedAmount: Cents;
  /** `f`, the franking percentage as a fraction: 1 is fully franked. */
  readonly frankingPercentage: number;
  /** `r`, the **payer's** corporate tax rate for imputation purposes. */
  readonly payerCorporateTaxRate: number;
  readonly source: string;
  readonly confidence: Confidence;
}): FrankedDistribution => {
  const { frankingPercentage: f, payerCorporateTaxRate: r } = input;
  if (!Number.isFinite(f) || f < 0 || f > 1) {
    throw new RangeError(
      `a franking percentage is a fraction between 0 and 1, not ${f}. s 203-35(2) takes anything ` +
        'above 100% to be 100%, but a value above 1 here is far more likely a percentage supplied ' +
        'as 60 than a genuinely over-franked distribution, and clamping it would hide that.',
    );
  }
  if (!Number.isFinite(r) || r <= 0 || r >= 1) {
    throw new RangeError(
      `a corporate tax rate for imputation purposes is a fraction strictly between 0 and 1, not ` +
        `${r}. At 1 the gross-up r/(1−r) does not exist; at 0 there is no credit to attach.`,
    );
  }
  return buildDistribution({
    fy: input.fy,
    frankedAmount: input.frankedAmount,
    // The multiplier is formed at full double precision and applied once. Materialising the
    // gross-up rate (1−r)/r as a rounded decimal and dividing by it is T44 — 2.3333 is 60c wrong
    // per $100,000 at the 30% rate. The only rounding is `mulCents`'s, to the whole cent.
    frankingCredit: mulCents(input.frankedAmount, (f * r) / (1 - r)),
    creditRoute: 'derived from the payer’s corporate tax rate for imputation purposes',
    provenance: withCaveats(
      provenanceOf(input.fy, [
        ['the payer’s corporate tax rate for imputation purposes', { confidence: input.confidence }],
      ] as readonly Consumed[]),
      `the franking credit was derived from a corporate tax rate supplied as ${input.source}: ` +
        'ITAA 1997 s 202-60(2) fixes the rate to the entity making the distribution, so there is ' +
        'no portfolio-level rate in law and this one is a forecast input, not a register figure ' +
        '(register §5A.1, T43)',
    ),
  });
};

// --- The outcome — s 207-20(2), s 207-90, s 207-110, s 63-10(1) item 40 -----------------------------

export interface FrankingInSuper {
  readonly fy: FinancialYear;
  readonly interest: SuperInterest;
  readonly distribution: FrankedDistribution;
  /**
   * The phase's earnings tax on the **grossed-up** amount. This is the only thing the phase
   * decides, and the only place `superPhase.ts` is consulted.
   */
  readonly earningsTax: FundEarningsTax;
  /** s 207-20(2). Equal to the credit. There is no route here on which it is anything else. */
  readonly offset: Cents;
  /** s 63-10(1) item 40: the offset beyond the liability, in cash. Nil where the tax exceeds it. */
  readonly refund: Cents;
  /** What is left to pay after the offset. Nil where the credit covers it — which it usually does. */
  readonly taxPayableAfterOffset: Cents;
  /** `franked amount + refund − tax payable`: the cash the distribution is worth to the fund. */
  readonly netCash: Cents;
  /**
   * The chain, in statutory order, so a reader can see that s 207-90 was reached **and
   * disapplied** rather than never read. Narrative only — no amount hangs off it.
   */
  readonly chain: readonly string[];
  readonly provenance: ComputedProvenance;
}

const CHAIN: readonly string[] = Object.freeze([
  's 207-20(1): the franking credit is included in assessable income — an addition, not a rate',
  's 207-20(2): a tax offset equal to the franking credit',
  's 207-90: denies the gross-up and the offset on exempt or NANE income, with no super carve-out',
  's 207-110(2)(b), Subdiv 207-E: disapplies s 207-90 for the ss 295-385/295-390/295-400 exempt ' +
    'current pension income — which is why a Retirement Phase fund keeps the credit in full (T45)',
  's 67-25(1) with s 63-10(1) item 40: the offset is refundable, and the remainder is paid in cash',
]);

/**
 * **The franking outcome for one franked distribution received by one superannuation interest.**
 *
 * The offset is the credit, unconditionally. The phase changes the **tax on the grossed-up
 * income** and changes nothing else, which is the whole of the difference between the two answers:
 * Retirement Phase pays 0% and is refunded the lot, Accumulation Phase — and a TTR pension with it
 * — pays 15% and is refunded whatever is left over.
 */
export const frankingInSuper = (input: {
  readonly fy: FinancialYear;
  readonly interest: SuperInterest;
  readonly distribution: FrankedDistribution;
  readonly facts: FundFrankingFacts;
  /** Passed straight through to `fundEarningsTax`. Required there, and not defaulted here either. */
  readonly phaseHeldFor: PhaseYearFraction;
}): FrankingInSuper => {
  const { fy, interest, distribution, facts } = input;
  if (distribution.fy !== fy) throw new FrankingYearMismatchError(fy, distribution.fy);
  refuseDeniedDistributions(fy, facts);

  // Everything the phase decides, decided in one place, by the module that owns it.
  const earningsTax = fundEarningsTax({
    fy,
    interest,
    taxableEarnings: distribution.grossedUpAmount,
    phaseHeldFor: input.phaseHeldFor,
  });

  // s 207-20(2), and s 207-110 is what lets this line stand unqualified for exempt income.
  const offset = distribution.frankingCredit;
  const liability = earningsTax.tax;

  // Both directions are computed. Flooring the refund away — offsetting the credit against the
  // 15% and keeping only `max(0, tax − offset)` — is the T46 mutation, and on a fully franked
  // distribution in Accumulation Phase it deletes the entire benefit: 25% and 30% both exceed 15%,
  // so there is always something left over. Exactly one of these two is non-nil.
  const refund = offset > liability ? subCents(offset, liability) : toCents(0);
  const taxPayableAfterOffset = liability > offset ? subCents(liability, offset) : toCents(0);

  return Object.freeze({
    fy,
    interest,
    distribution,
    earningsTax,
    offset,
    refund,
    taxPayableAfterOffset,
    netCash: subCents(addCents(distribution.frankedAmount, refund), taxPayableAfterOffset),
    chain: CHAIN,
    // The earnings tax's provenance is merged in whole rather than summarised, so the Retirement
    // Phase caveat that no transfer balance cap has been applied survives into the franking result
    // — it is more load-bearing here, not less, because a mis-stated Retirement Phase balance now
    // escapes 15% of the *grossed-up* amount rather than 15% of the cash.
    provenance: withCaveats(
      mergeProvenance(earningsTax.provenance, distribution.provenance),
      QUALIFICATION_ASSUMED,
    ),
  });
};
