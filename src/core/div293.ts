// P3-5 — Division 293, the second 15%. ITAA 1997 s 293-20 with the Imposition Act 2013 (No. 87,
// 2013) s 5 rate, on the income base `incomeBases.div293Income` already builds. Register §3.6.
//
// This closes the seam `superConcessional.ts` names: the fund's 15% on a concessional contribution
// is not the whole tax on it for a Person over $250,000, and until now the register decomposed
// neither the income base nor the charge.
//
// **The one thing this module exists to get right is that s 293-20(1) is a taper, not a cliff.**
//
//     taxable contributions = min(low tax contributions, (Div 293 income + low tax contributions) − 250,000)
//     Division 293 tax      = 15% × taxable contributions
//
// The 15% falls on the `min(...)`, never on the low tax contributions as a whole. The ATO's own
// worked example is the check: $240,000 of Div 293 income and $15,000 of contributions is $5,000
// over the threshold, so the tax is 15% of $5,000 = **$750**. A cliff charges 15% of $15,000 =
// $2,250 — three times too much, and wrong for every Person inside the shade-in band, which is
// exactly as wide as their own low tax contributions. At a sum of $250,001 the tax is 15 cents.
//
// s 293-20(2) — "no taxable contributions if the low tax contributions are nil" — is a redundancy
// guard rather than a second rule, and is not written as a branch below: `min(0, excess)` is
// already nil. There is no expression here in which a nil contribution produces a charge.
//
// Two structural points about the inputs.
//
//   * **The income base is a brand, so the s 293-20(1)(a) disregard cannot be skipped here.**
//     `division293Tax` takes a `Div293Income` and `SurchargeIncome` is not assignable to it. The
//     second most damaging Div 293 error — counting a salary-sacrificing Person's reportable
//     superannuation contributions once in the income base and again in the low tax contributions
//     on the same side of the same sum — is a compile error rather than a test failure.
//
//   * **Low tax contributions are a figure with provenance, not a number.** ITAA 1997 s 293-25
//     subtracts the excess concessional contributions from the s 293-30 low tax contributed
//     amounts, and the codebase can reach that by two different routes with two different
//     confidences. Deriving it as `concessional − excess` relies on a reading the sources leave
//     open (`lowTaxContributedAmountDivergence`, P3-5 U1: a SIS Act s 99G(6) refunded amount looks
//     like a low tax contributed amount that is no longer concessional, so the derivation would
//     *understate* Div 293), and that route is labelled `unverified` for it. A caller who states
//     the s 293-30 amount itself is not relying on the inference and keeps the stronger label.
//
// The counter-intuitive interaction worth knowing while reading this: **using carry-forward
// headroom increases a Person's Div 293 exposure.** A bigger cap makes a smaller excess, and
// s 293-25(b) subtracts the excess — so more of the contributions survive into the low tax
// contributions and are charged the second 15%, instead of falling out of Div 293 altogether and
// being taxed at marginal rates under Div 291.
//
// A dollar amount or a rate appearing below as a literal is a bug.
import { addCents, mulCents, subCents, toCents } from './money.js'; // `.js` is correct in a `.ts` file — see tsconfig.json
import type { Cents } from './money.js';
import { mergeProvenance, provenanceOf } from './provenance.js';
import type { ComputedProvenance, Consumed } from './provenance.js';
import type { Div293Income } from './incomeBases.js';
import { concessionalContributions } from './superConcessional.js';
import type { ConcessionalAssessment, ConcessionalContributionComponents } from './superConcessional.js';
import { SUPERANNUATION } from '../data/assumptions/super.js';
import type { FinancialYear } from '../data/assumptions/types.js';

const DIVISION_293 = SUPERANNUATION.division293;

// --- Who this machinery applies to — s 293-25 Notes 1 and 2 -------------------------------------

/**
 * The three Subdivisions that replace the low tax contributions calculation entirely, each named
 * so a Person who has one cannot be waved through as an accumulation-only member. Required rather
 * than defaulted for the same reason `personalDeductibleContributions` requires the notice of
 * intent: `false` is a fact about the Person that the caller states.
 */
export interface SuperannuationInterestFacts {
  /** Subdiv 293-D. Concessional contributions are modified by Subdiv 291-C instead — different machinery. */
  readonly definedBenefitInterest: boolean;
  /** Subdiv 293-E. */
  readonly constitutionallyProtectedStateHigherLevelOfficeHolder: boolean;
  /** Subdiv 293-F. */
  readonly commonwealthJustice: boolean;
}

/** No modification applies — the ordinary accumulation-only Person this model forecasts. */
export const ACCUMULATION_INTEREST_ONLY: SuperannuationInterestFacts = Object.freeze({
  definedBenefitInterest: false,
  constitutionallyProtectedStateHigherLevelOfficeHolder: false,
  commonwealthJustice: false,
});

/**
 * `modifiedLowTaxContributions` records that none of Subdiv 293-D, 293-E or 293-F was retrieved
 * beyond ss 293-155 and 293-200 (P3-5 U2), and instructs this model to refuse such a Person rather
 * than treat them as an accumulation-only member. Computing them from the concessional
 * contributions is not available as a fallback: Subdiv 291-C modifies *those* for the same
 * interests, by different rules, so one cannot be derived from the other.
 */
export class ModifiedLowTaxContributionsError extends RangeError {
  readonly subdivision: string;
  constructor(subdivision: string, interest: string) {
    super(
      `low tax contributions cannot be computed for a Person with ${interest}: ITAA 1997 ` +
        `Subdivision ${subdivision} modifies them (s 293-25 Notes 1 and 2) and that Subdivision ` +
        'was not retrieved (P3-5 U2). The ordinary s 293-25 subtraction is not a conservative ' +
        'approximation of it — it is a different calculation — and Subdiv 291-C modifies the ' +
        'concessional contributions for the same interest by different rules again, so the one ' +
        'cannot be derived from the other either. This refuses rather than reporting a figure ' +
        'that would look like the Person\'s.',
    );
    this.name = 'ModifiedLowTaxContributionsError';
    this.subdivision = subdivision;
  }
}

const refuseModifiedInterests = (interests: SuperannuationInterestFacts): void => {
  if (interests.definedBenefitInterest) throw new ModifiedLowTaxContributionsError('293-D', 'a defined benefit interest');
  if (interests.constitutionallyProtectedStateHigherLevelOfficeHolder) {
    throw new ModifiedLowTaxContributionsError('293-E', 'a constitutionally protected State higher level office');
  }
  if (interests.commonwealthJustice) throw new ModifiedLowTaxContributionsError('293-F', 'a Commonwealth judicial office');
};

// --- Low tax contributions — ITAA 1997 ss 293-25 and 293-30 -------------------------------------

declare const LOW_TAX_CONTRIBUTIONS: unique symbol;

export interface LowTaxContributionsFigure {
  readonly fy: FinancialYear;
  /** s 293-30. The contributions assessable to the fund, before s 293-25(b). */
  readonly lowTaxContributedAmounts: Cents;
  /** s 293-25(b). Subtracted because s 293-10 says the tax is not payable in respect of the excess. */
  readonly excessConcessionalContributions: Cents;
  /** s 293-25. Never negative: the excess cannot exceed the amounts it was measured out of. */
  readonly amount: Cents;
  readonly provenance: ComputedProvenance;
}

/**
 * Branded, so the only ways to obtain one are the two constructors below. A plain object literal
 * with an `amount` on it does not satisfy this type, which is what stops a hand-computed figure —
 * or a `ConcessionalContributions` total with the excess left in — reaching `division293Tax` with
 * a confidence it did not earn.
 */
/**
 * **Nominal, not structural — P3-41.** The brand is a `private` member of a type-only class, so a
 * spread of a real figure cannot carry it: `{ ...real, amount: lie }` is TS2741, not a
 * `LowTaxContributions`. Nothing exists at runtime; the value is still a plain frozen record.
 */
declare class LowTaxContributionsWitness { private readonly [LOW_TAX_CONTRIBUTIONS]: true }

export type LowTaxContributions = LowTaxContributionsFigure & LowTaxContributionsWitness;

const buildLowTaxContributions = (input: {
  readonly fy: FinancialYear;
  readonly lowTaxContributedAmounts: Cents;
  readonly excessConcessionalContributions: Cents;
  readonly interests: SuperannuationInterestFacts;
  readonly provenance: ComputedProvenance;
}): LowTaxContributions => {
  refuseModifiedInterests(input.interests);
  if (input.lowTaxContributedAmounts < 0) {
    throw new RangeError(`low tax contributed amounts cannot be negative: ${input.lowTaxContributedAmounts} cents`);
  }
  if (input.excessConcessionalContributions < 0) {
    throw new RangeError(`excess concessional contributions cannot be negative: ${input.excessConcessionalContributions} cents`);
  }
  if (input.excessConcessionalContributions > input.lowTaxContributedAmounts) {
    throw new RangeError(
      `excess concessional contributions of ${input.excessConcessionalContributions} cents exceed the ` +
        `${input.lowTaxContributedAmounts} cents of low tax contributed amounts they were measured out of. ` +
        's 293-25 subtracts one from the other; a negative result means the two figures do not ' +
        'describe one Person\'s year, and clamping it to nil would hide that.',
    );
  }
  return Object.freeze({
    fy: input.fy,
    lowTaxContributedAmounts: input.lowTaxContributedAmounts,
    excessConcessionalContributions: input.excessConcessionalContributions,
    amount: subCents(input.lowTaxContributedAmounts, input.excessConcessionalContributions),
    provenance: input.provenance,
  }) as LowTaxContributions;
};

/**
 * ITAA 1997 s 293-25 on figures the caller states: the s 293-30 low tax contributed amounts as
 * reported by the fund or the ATO, less the excess concessional contributions.
 *
 * This route does **not** rely on P3-5 U1 — the caller has supplied the s 293-30 amount rather
 * than inferring it from the concessional contributions — so a result computed from it keeps the
 * primary-verified label that ss 293-25 and 293-30 carry.
 */
export const lowTaxContributions = (input: {
  readonly fy: FinancialYear;
  readonly lowTaxContributedAmounts: Cents;
  readonly excessConcessionalContributions: Cents;
  readonly interests: SuperannuationInterestFacts;
}): LowTaxContributions =>
  buildLowTaxContributions({
    ...input,
    provenance: provenanceOf(input.fy, [
      ['superannuation.division293.lowTaxContributions', DIVISION_293.lowTaxContributions],
      ['superannuation.division293.modifiedLowTaxContributions', DIVISION_293.modifiedLowTaxContributions],
    ] as readonly Consumed[]),
  });

/**
 * The records **both derived routes** consume, in one expression: the s 293-25 rule itself, the
 * P3-5 U1 / O35 divergence that makes a figure inferred from concessional contributions
 * `unverified`, and the Subdiv 293-D/E/F gate. Written once so the two constructors below cannot
 * come to carry different caveats for the same inference.
 */
const derivedRouteProvenance = (fy: FinancialYear): ComputedProvenance =>
  provenanceOf(fy, [
    ['superannuation.division293.lowTaxContributions', DIVISION_293.lowTaxContributions],
    ['superannuation.division293.lowTaxContributedAmountDivergence', DIVISION_293.lowTaxContributedAmountDivergence],
    ['superannuation.division293.modifiedLowTaxContributions', DIVISION_293.modifiedLowTaxContributions],
  ] as readonly Consumed[]);

/**
 * ITAA 1997 s 293-25 from what the forecaster already computes: `applyConcessional` returns both
 * the year's concessional contributions and the excess above the cap, and their difference is the
 * contributions **as capped** — the general cap plus whatever carry-forward increase was available.
 *
 * **This route is `unverified`, and only this route.** s 291-25 and s 293-30 have exclusion lists
 * that differ in both directions. The direction that matters is s 291-25(2)(e): a SIS Act
 * s 99G(6) refunded amount stops being a concessional contribution while, on the face of
 * s 293-30(4), remaining a low tax contributed amount. SIS s 99G was never retrieved and no ATO or
 * explanatory material addresses the asymmetry, so the consequence is inferred from the absence of
 * a matching paragraph rather than stated in terms — and it runs in the direction that
 * **understates** the tax. `lowTaxContributedAmountDivergence` carries that at its own confidence
 * and is consumed here, so the weakness lands on the numbers that actually depend on it instead of
 * on every Div 293 figure the model produces.
 *
 * The assessment's own provenance is merged in whole rather than summarised. In a forecast year it
 * carries the synthetic AWOTE index number behind the cap, and the cap is what decides the excess
 * this subtraction removes.
 */
export const lowTaxContributionsFromConcessional = (input: {
  readonly assessment: ConcessionalAssessment;
  readonly interests: SuperannuationInterestFacts;
}): LowTaxContributions =>
  buildLowTaxContributions({
    fy: input.assessment.fy,
    lowTaxContributedAmounts: input.assessment.contributions,
    excessConcessionalContributions: input.assessment.excess,
    interests: input.interests,
    provenance: mergeProvenance(derivedRouteProvenance(input.assessment.fy), input.assessment.provenance),
  });

/**
 * ITAA 1997 s 293-25 for a caller that holds the **s 291-25 limbs** but no s 291-20 assessment —
 * the forecaster's own position (P6-9 chunk 2).
 *
 * **Why this exists rather than `lowTaxContributionsFromConcessional`.** That route wants a
 * `ConcessionalAssessment`, and one can only come from `applyConcessional`, which needs a
 * `CarryForwardHeadroom` — which needs a five-year concessional contribution history and a Total
 * Super Balance measured at the prior 30 June, and refuses BY NAME
 * (`MissingContributionHistoryError`) without them. The plan file has no field for either, so a
 * walk cannot reach that constructor at all. The choice was between inventing an assessment at the
 * call site and naming the route the caller actually has; this is the second.
 *
 * **It is the SAME inference and therefore the SAME confidence.** The amounts are derived from
 * s 291-25 contributions, so P3-5 U1 / register O35 applies in full and
 * `lowTaxContributedAmountDivergence` is consumed here exactly as it is above: a SIS Act s 99G(6)
 * refunded amount would still be a low tax contributed amount after it stopped being a concessional
 * contribution, so the derivation **understates** Division 293. Routing a walk through
 * `lowTaxContributions` — the route for a caller who has read the s 293-30 figure off a fund or ATO
 * statement — would have produced the same cents today wearing a primary-verified label it did not
 * earn.
 *
 * **The total is built by `concessionalContributions` and by nothing else**, so a caller cannot
 * hand over a sum it assembled itself: every limb is named and every limb is added, and the same
 * components object can be handed to `refuseConcessionalContributionsOverGeneralCap` so that the
 * amount measured against the cap and the amount carried into Div 293 are one expression.
 *
 * **The excess is required and stated, never defaulted.** A caller with no Div 291 assessment knows
 * its own reason for the figure it passes, and a default here would be the s 293-25(b) subtraction
 * quietly leaving the calculation for every caller that forgot it.
 */
export const lowTaxContributionsFromComponents = (input: {
  readonly fy: FinancialYear;
  readonly components: ConcessionalContributionComponents;
  readonly excessConcessionalContributions: Cents;
  readonly interests: SuperannuationInterestFacts;
}): LowTaxContributions =>
  buildLowTaxContributions({
    fy: input.fy,
    lowTaxContributedAmounts: concessionalContributions(input.components),
    excessConcessionalContributions: input.excessConcessionalContributions,
    interests: input.interests,
    provenance: derivedRouteProvenance(input.fy),
  });

// --- The charge — ITAA 1997 s 293-20 and Imposition Act 2013 s 5 --------------------------------

export interface Division293Assessment {
  readonly fy: FinancialYear;
  /** s 293-20(1)(a). Income for surcharge purposes **disregarding** paragraph (c). */
  readonly income: Div293Income;
  /** s 293-20(1)(b). */
  readonly lowTaxContributions: LowTaxContributions;
  /** The two limbs added — the figure the threshold is tested against. Not the income alone. */
  readonly sum: Cents;
  /** $250,000, frozen. Reported so the taper can be read off the result. */
  readonly threshold: Cents;
  /** The amount of the excess, nil where the sum does not *exceed* the threshold. */
  readonly excess: Cents;
  /** s 293-20(1): **the lesser** of the low tax contributions and the excess. The taper. */
  readonly taxableContributions: Cents;
  /** Which limb of the `min` bound, or `null` below the threshold. The shape of the taper, made visible. */
  readonly binding: 'excess' | 'low tax contributions' | null;
  /** Imposition Act 2013 s 5. 0.15, applied to the taxable contributions and to nothing else. */
  readonly rate: number;
  readonly tax: Cents;
  readonly provenance: ComputedProvenance;
}

/**
 * ITAA 1997 s 293-20 with the Imposition Act 2013 s 5 rate.
 *
 * The threshold is read from `division293.threshold`, which is `everyYear: true` and frozen: it is
 * absent from the s 960-265 indexation table s 960-270(1) makes the gateway, there is no
 * indexation language anywhere in Div 293, and it has only ever moved by textual amendment. Its
 * erosion across a 40-year nominal projection is the behaviour the projection exists to show (T21)
 * — a Person on $180,000 today crosses it in about a decade at 3.5% wage growth. `fy` therefore
 * reaches the threshold through nothing: there is no year argument to any indexation call here,
 * because there is no indexation call.
 */
export const division293Tax = (input: {
  readonly fy: FinancialYear;
  readonly income: Div293Income;
  readonly lowTaxContributions: LowTaxContributions;
}): Division293Assessment => {
  const { fy, income } = input;
  const contributions = input.lowTaxContributions;
  if (contributions.fy !== fy) {
    throw new RangeError(
      `the low tax contributions supplied are for FY${contributions.fy}, not FY${fy}. s 293-20(1) ` +
        'reads paragraph (a) over an income year and paragraph (b) over the corresponding ' +
        'financial year, and for a natural person those coincide — one year\'s contributions ' +
        'against another year\'s income is not a Person.',
    );
  }

  const threshold = DIVISION_293.threshold;
  const rate = DIVISION_293.rate;

  // s 293-20(1): the sum of paragraphs (a) and (b), tested against $250,000. The contributions sit
  // on the SAME side of the comparison as the income — a Person with $235,000 of Div 293 income
  // and $20,000 of contributions is over the threshold on $255,000.
  const sum = addCents(income, contributions.amount);

  // "exceeds": strictly. A sum of exactly $250,000 is not over it.
  const excess = sum > threshold.value ? subCents(sum, threshold.value) : toCents(0);

  // The taper, and the whole point of the module: **the lesser** of the two. Charging the rate on
  // the whole of the low tax contributions once the threshold is crossed is the cliff error, and
  // it overstates by 3× on the ATO's own worked example.
  const taxableContributions = (contributions.amount < excess ? contributions.amount : excess) as Cents;

  return Object.freeze({
    fy,
    income,
    lowTaxContributions: contributions,
    sum,
    threshold: threshold.value,
    excess,
    taxableContributions,
    binding: excess <= 0 ? null : contributions.amount < excess ? 'low tax contributions' : 'excess',
    rate: rate.value,
    tax: mulCents(taxableContributions, rate.value),
    // `incomeBase` and `taxableContributions` are consumed rather than merely cited: they are the
    // two structural records this function implements — the composition of the sum above, and the
    // `min` that makes it a taper. The low tax contributions carry their own provenance, which is
    // where the P3-5 U1 weakness lives when it lives anywhere, and it is merged rather than
    // rebuilt so its caveat lines survive into the result.
    provenance: mergeProvenance(
      provenanceOf(fy, [
        ['superannuation.division293.threshold', threshold],
        ['superannuation.division293.rate', rate],
        ['superannuation.division293.incomeBase', DIVISION_293.incomeBase],
        ['superannuation.division293.taxableContributions', DIVISION_293.taxableContributions],
      ] as readonly Consumed[]),
      contributions.provenance,
    ),
  });
};
