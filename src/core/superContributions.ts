// P3-3a — the Superannuation Guarantee, and only that. Register §3.5, traps T17 and T18.
//
// Salary sacrifice as a *contribution*, personal deductible contributions, the 15% contributions
// tax, applying any of it against the caps and Division 293 are all later segments and none of
// them is here. Salary sacrifice appears below in exactly one role — as a limb of the SG earnings
// base — because that is what T17 is about.
//
// Three things here are shape rather than arithmetic.
//
//   * **The base is qualifying earnings, and a sacrificed amount is part of it** (T17, SGAA
//     ss 10A(1)(h), 10A(4)(b)). Sacrificing no longer reduces the SG base, so computing the charge
//     on the post-sacrifice figure understates the employer contribution — and the post-sacrifice
//     figure is the intuitive one, because it is what the payslip shows as gross. The defence is
//     that `QualifyingEarnings` is a brand with **no widening constructor**: the only way to obtain
//     one is to name the sacrificed amount and have it **added**. There is no argument to
//     `superGuarantee` that a bare post-sacrifice `Cents` will satisfy, and there is no field on
//     the constructor that subtracts.
//
//   * **The maximum contributions base is annual and per employer** (T18, SGAA s 10A(5)). Not
//     quarterly — the construct itself changed on 1 July 2026, so a model carrying $62,500 per
//     quarter forward is wrong from FY2026-27 on. "Per employer" is why `superGuarantee` takes a
//     list of `Employment` records and caps each one separately: two employers each below the
//     ceiling is not the same as one employer above it, and the difference is tens of thousands of
//     dollars a year. There is no code path that sums earnings before capping, because the sum is
//     taken over the already-capped charges.
//
//   * **The ceiling is derived, never stored** (§3.5). `maximumContributionsBase` lives in the
//     assumptions layer and takes the year's concessional cap, which comes from
//     `superCaps.concessionalContributionsCap` — so the ceiling moves when the cap indexes and a
//     year with no AWOTE number refuses rather than reusing FY2026-27's figure. The published
//     $270,830 is a live cross-check on the formula, not a second source of truth.
//
// A dollar amount appearing below as a literal is a bug.
import { addCents, mulCents, subCents, toCents } from './money.js'; // `.js` is correct in a `.ts` file — see tsconfig.json
import type { Cents } from './money.js';
import { compareFinancialYears } from './financialYear.js';
import { PublishedCapMismatchError, concessionalContributionsCap } from './superCaps.js';
import type { IndexNumbers } from './superCaps.js';
import { mergeProvenance, provenanceOf, withCaveats } from './provenance.js';
import type { ComputedProvenance, Consumed } from './provenance.js';
import { SUPERANNUATION, maximumContributionsBase } from '../data/assumptions/super.js';
import type { FinancialYear } from '../data/assumptions/types.js';

const SG = SUPERANNUATION.superGuarantee;

/**
 * The first financial year the qualifying earnings base applies to. SGAA s 10A(1) replaced
 * ordinary time earnings on 1 July 2026, which is the first day of FY2026-27.
 */
const QUALIFYING_EARNINGS_FROM: FinancialYear = '2026-27';

/**
 * Register O19: only the salary-sacrifice limb of SGAA s 10A(1) was read closely. The remaining
 * limbs (a)–(g) and the s 10A(3) exclusions were not, so every result says so rather than
 * implying the base is fully enumerated here.
 */
const O19_CAVEAT =
  'the qualifying earnings definition (SGAA s 10A(1)(a)–(g), s 10A(3)) was not read in full — ' +
  'register O19. Only the salary-sacrifice limb is primary-verified. Read it before forecasting ' +
  'a Person with bonuses, allowances or termination payments';

/**
 * Register O4: SGAA s 17A(2) states a flat 12 with no forward schedule and no legislated increase.
 * Applying it to a later year is not an extrapolation — there is nothing to extrapolate — but
 * holding it for the length of a Planning Horizon is an assumption about future policy.
 */
const O4_CAVEAT =
  'the SG charge percentage is a flat legislated 12 with no forward schedule (register O4) — ' +
  'holding it beyond the year it is stamped for is an assumption about future policy, not a fact';

export class SuperGuaranteeEarningsBaseError extends RangeError {
  constructor(fy: FinancialYear) {
    super(
      `no Superannuation Guarantee earnings base for FY${fy}: SGAA s 10A(1) replaced ordinary time ` +
        `earnings with qualifying earnings on 1 July 2026, so FY${QUALIFYING_EARNINGS_FROM} is the ` +
        'first year this computes. The register carries neither the ordinary time earnings ' +
        'definition nor a pre-2026 charge percentage. It does carry the pre-2026 maximum ' +
        'contributions base — §3.5 states "$62,500 per quarter" three lines below its own table ' +
        'and maximumContributionsBase.note repeats it — but as PROSE AND A NOTE, NOT AS A ' +
        'RECORD: no year stamp, no source of its own, nothing a computation can consume. That ' +
        'last limb is an argument from the absence of a record, checked over this repository as ' +
        'it stands rather than asserted about the world (R6). Applying the new base to an ' +
        'earlier year is trap T17 run backwards. Refusing to compute.',
    );
    this.name = 'SuperGuaranteeEarningsBaseError';
  }
}

export class DuplicateEmployerError extends RangeError {
  constructor(employer: string) {
    super(
      `two employments were supplied for ${employer}. The maximum contributions base is per ` +
        'financial year, per **employer** (SGAA s 10A(5), T18) — not per job and not per payslip, ' +
        'so two records for one employer would give that employer two ceilings. Combine them into ' +
        'one Employment. Refusing to compute.',
    );
    this.name = 'DuplicateEmployerError';
  }
}

export class EarningsBaseChangedError extends RangeError {
  constructor(base: string, salarySacrificeIsQualifyingEarnings: boolean) {
    super(
      `the register now states the SG earnings base is "${base}" and that salary sacrifice is ` +
        `${salarySacrificeIsQualifyingEarnings ? '' : 'not '}part of it. This module's types are ` +
        'built on qualifying earnings including the sacrificed amount (§3.5, T17); if that changed, ' +
        'the shape has to change with it, not just the arithmetic. Refusing to compute.',
    );
    this.name = 'EarningsBaseChangedError';
  }
}

// --- Qualifying earnings — built up, never handed over ------------------------------------------
//
// The same trick `incomeBases.ts` plays on the income bases (P3-2) and `superCaps.ts` plays
// on the three caps (P3-4), for the same reason: the wrong figure here is a plausible number, not
// an obviously broken one. A Person sacrificing $20,000 out of $170,000 has a post-sacrifice gross
// of $150,000, and $18,000 of SG looks exactly as reasonable as the correct $20,400.

declare const QUALIFYING_EARNINGS: unique symbol;

/** SGAA s 10A(1). The SG base from 1 July 2026, replacing ordinary time earnings (T17). */
export type QualifyingEarnings = Cents & { readonly [QUALIFYING_EARNINGS]: true };

/**
 * There is deliberately no `qualifyingEarningsFrom(cents)` shortcut and no default on
 * `salarySacrificedAmounts`. A Person who sacrifices nothing writes the zero, the same way
 * `surchargeIncome` requires every one of the seven s 995-1(1) limbs it names, so a nil is a
 * figure the caller states rather than one they get by omission — because a field with a default
 * of nil is a field that quietly disappears from the calculation.
 */
export interface QualifyingEarningsComponents {
  /**
   * What the employer actually paid the Person: SGAA s 10A(1)(a)–(g) as reduced by any sacrifice.
   * This is the payslip gross, and on its own it is the T17 mistake.
   */
  readonly earningsPaidToThePerson: Cents;
  /**
   * SGAA ss 10A(1)(h), 10A(4)(b): amounts sacrificed into superannuation, which are themselves
   * qualifying earnings. **Added back**, so the base is the pre-sacrifice figure. This is the one
   * limb of s 10A(1) the register read closely.
   */
  readonly salarySacrificedAmounts: Cents;
  /**
   * The remainder of s 10A(1) that register O19 leaves unenumerated — bonuses, allowances and the
   * rest. Carried as one named input so it is visible and nil by choice, not by omission.
   */
  readonly otherQualifyingEarnings: Cents;
}

const requireQualifyingEarningsBase = (): void => {
  const base = SG.earningsBase.value;
  const sacrificeCounts = SG.salarySacrificeIsQualifyingEarnings.value;
  if (base !== 'qualifying earnings' || !sacrificeCounts) {
    throw new EarningsBaseChangedError(base, sacrificeCounts);
  }
};

/** The one constructor. Every component is added; nothing here subtracts. */
export const qualifyingEarnings = (components: QualifyingEarningsComponents): QualifyingEarnings => {
  requireQualifyingEarningsBase();
  for (const [name, amount] of Object.entries(components)) {
    if (amount < 0) throw new RangeError(`qualifying earnings component ${name} cannot be negative: ${amount} cents`);
  }
  return addCents(
    components.earningsPaidToThePerson,
    addCents(components.salarySacrificedAmounts, components.otherQualifyingEarnings),
  ) as QualifyingEarnings;
};

// --- The maximum contributions base — annual, per employer, derived (T18) ------------------------

export interface MaximumContributionsBase {
  readonly fy: FinancialYear;
  /** Per financial year, per employer. Never per quarter (T18) and never across employers. */
  readonly amount: Cents;
  readonly period: string;
  readonly provenance: ComputedProvenance;
}

/**
 * SGAA s 10A(5): `floor_to_10(concessional cap × 100 ÷ charge percentage)`.
 *
 * The formula itself is `data/assumptions/super.ts`'s, not this module's. What happens here is the
 * wiring: the concessional cap comes from `superCaps.ts`, so the ceiling indexes when the cap
 * indexes, and a year with no AWOTE index number throws `MissingIndexNumberError` from there
 * rather than silently reusing FY2026-27's $270,830.
 */
export const maximumContributionsBaseFor = (
  fy: FinancialYear,
  indexNumbers: IndexNumbers = [],
): MaximumContributionsBase => {
  if (compareFinancialYears(fy, QUALIFYING_EARNINGS_FROM) < 0) throw new SuperGuaranteeEarningsBaseError(fy);
  const cap = concessionalContributionsCap(fy, indexNumbers);
  const charge = SG.chargePercentage;
  const amount = maximumContributionsBase(cap.amount, charge.value);
  const published = SG.maximumContributionsBase;
  if (published.fy === fy && amount !== published.value) {
    throw new PublishedCapMismatchError('maximum contributions base', fy, amount, published.value);
  }
  const consumed: Consumed[] = [
    ['superannuation.superGuarantee.chargePercentage', charge],
    ['superannuation.superGuarantee.maximumContributionsBasePeriod', SG.maximumContributionsBasePeriod],
  ];
  const provenance = mergeProvenance(provenanceOf(fy, consumed), cap.provenance);
  return Object.freeze({
    fy,
    amount,
    period: SG.maximumContributionsBasePeriod.value,
    provenance: charge.fy === fy ? provenance : withCaveats(provenance, O4_CAVEAT),
  });
};

// --- The floor under every year's ceiling, and the charge that needs no index number -------------
//
// **The problem this closes (P6-8 brief 3, chunk 2b).** `maximumContributionsBaseFor` needs the
// year's concessional cap, and the cap indexes on AWOTE, so it throws `MissingIndexNumberError`
// for every year after FY2026-27 — the one computable year. A walk that asked for the ceiling
// every month would therefore be unable to contribute a Guarantee for a Person earning $80,000 in
// 2035, when the ceiling is not within a hundred thousand dollars of mattering to them.
//
// **The argument, and it is a proof rather than an approximation.** ITAA 1997 s 960-285(4) makes
// the base amount a FLOOR on the indexed cap: `indexCap` returns `spec.baseAmount` whenever the
// factor is one or less, and returns `baseAmount × factor` floored to the rounding multiple
// otherwise, which is never below `baseAmount` for a factor above one. So the concessional cap of
// ANY year, indexed or not, is at least the spec's base amount. s 10A(5)'s ceiling,
// `floor_to_10(cap × 100 ÷ charge percentage)`, is monotone non-decreasing in the cap. Therefore
// every year's ceiling is at least the ceiling computed from the base amount — and qualifying
// earnings at or below that figure are charged in full whatever year it is.
//
// **Derived from the spec, never written down.** The figure is $208,330 today; a literal anywhere
// would be a second copy of the concessional cap's base amount, which is exactly the drift T13/T14
// are about. It moves the day either the spec's base amount or the charge percentage moves, and
// the test pins it against both.

/**
 * `floor_to_10(concessional base amount × 100 ÷ charge percentage)` — the lowest value s 10A(5)'s
 * maximum contributions base can take in any year, indexed or not. See the block above for why.
 */
export const MINIMUM_MAXIMUM_CONTRIBUTIONS_BASE: Cents = maximumContributionsBase(
  SUPERANNUATION.capIndexation.concessional.value.baseAmount,
  SG.chargePercentage.value,
);

export interface GuaranteeBelowTheFloor {
  readonly fy: FinancialYear;
  /** SGAA s 17A(2), as a percentage — 12, not 0.12. */
  readonly chargePercentage: number;
  /** `min(qualifying earnings, MINIMUM_MAXIMUM_CONTRIBUTIONS_BASE)`. */
  readonly earningsCharged: Cents;
  /** The charge on those earnings. Payable whichever year's ceiling turns out to apply. */
  readonly amount: Cents;
  /**
   * What is left above the floor — nil for almost every Person, and where it is not nil the charge
   * on it needs the year's own ceiling and may not be derivable at all. It is NOT part of `amount`.
   */
  readonly earningsAboveTheFloor: Cents;
  readonly provenance: ComputedProvenance;
}

/**
 * **The part of one employment's Guarantee that no index number is needed to prove.**
 *
 * Additive, on `feedback`'s rule for a module with consumers: `superGuarantee` is unchanged and
 * still answers the whole question for a year it can. This answers a strictly smaller question —
 * *what is owed on the first `MINIMUM_MAXIMUM_CONTRIBUTIONS_BASE` of earnings* — and consumes no
 * AWOTE index number, so it cannot raise `MissingIndexNumberError`.
 *
 * `SuperGuaranteeEarningsBaseError` still applies and still propagates: a year before FY2026-27 has
 * no qualifying earnings base and no charge percentage in this register, and the floor argument
 * says nothing about a year whose rate is unknown.
 */
export const superGuaranteeBelowTheFloor = (
  fy: FinancialYear,
  earnings: QualifyingEarnings,
): GuaranteeBelowTheFloor => {
  requireQualifyingEarningsBase();
  if (compareFinancialYears(fy, QUALIFYING_EARNINGS_FROM) < 0) throw new SuperGuaranteeEarningsBaseError(fy);
  const charge = SG.chargePercentage;
  const floor = MINIMUM_MAXIMUM_CONTRIBUTIONS_BASE;
  const earningsCharged: Cents = earnings > floor ? floor : earnings;
  const provenance = provenanceOf(fy, [
    ['superannuation.superGuarantee.chargePercentage', charge],
    ['superannuation.superGuarantee.earningsBase', SG.earningsBase],
    ['superannuation.superGuarantee.salarySacrificeIsQualifyingEarnings', SG.salarySacrificeIsQualifyingEarnings],
    ['superannuation.capIndexation.concessional', SUPERANNUATION.capIndexation.concessional],
  ] as readonly Consumed[]);
  return Object.freeze({
    fy,
    chargePercentage: charge.value,
    earningsCharged,
    amount: mulCents(earningsCharged, charge.value / 100),
    earningsAboveTheFloor: subCents(earnings, earningsCharged),
    provenance: withCaveats(charge.fy === fy ? provenance : withCaveats(provenance, O4_CAVEAT), O19_CAVEAT),
  });
};

// --- The charge, per employment then summed -----------------------------------------------------

export interface Employment {
  /** Identity, because the ceiling is per employer. Two records for one employer is an error. */
  readonly employer: string;
  readonly qualifyingEarnings: QualifyingEarnings;
}

export interface EmploymentSuperGuarantee {
  readonly employer: string;
  readonly qualifyingEarnings: QualifyingEarnings;
  /** Qualifying earnings, capped at **this employer's** maximum contributions base. */
  readonly earningsCharged: Cents;
  readonly cappedByMaximumContributionsBase: boolean;
  readonly amount: Cents;
}

export interface SuperGuaranteeResult {
  readonly fy: FinancialYear;
  /** SGAA s 17A(2), as a percentage — 12, not 0.12. */
  readonly chargePercentage: number;
  readonly maximumContributionsBase: MaximumContributionsBase;
  /** One line per employer, each capped on its own. */
  readonly employments: readonly EmploymentSuperGuarantee[];
  /** The sum of the per-employer charges — never the charge on the summed earnings (T18). */
  readonly amount: Cents;
  readonly provenance: ComputedProvenance;
}

/**
 * SGAA ss 10A, 17A(2). The employer's Superannuation Guarantee for the year, per Person.
 *
 * Payday Super makes this payable each payday rather than quarterly (§3.5,
 * `superGuarantee.paymentFrequency`); the annual total is unaffected and the payment timing is a
 * cash-flow question for a later segment. What is *not* deferred is the ceiling's period: it is
 * annual now, and that is T18.
 */
export const superGuarantee = (
  fy: FinancialYear,
  employments: readonly Employment[],
  indexNumbers: IndexNumbers = [],
): SuperGuaranteeResult => {
  requireQualifyingEarningsBase();
  const ceiling = maximumContributionsBaseFor(fy, indexNumbers);
  const charge = SG.chargePercentage;
  const seen = new Set<string>();
  const lines: EmploymentSuperGuarantee[] = [];
  for (const employment of employments) {
    if (seen.has(employment.employer)) throw new DuplicateEmployerError(employment.employer);
    seen.add(employment.employer);
    // The cap is applied here, inside the per-employer loop, and the total below is a sum of these
    // charges. Capping the total instead would be the T18 "combined employers" mutation.
    const capped = employment.qualifyingEarnings > ceiling.amount;
    const earningsCharged: Cents = capped ? ceiling.amount : employment.qualifyingEarnings;
    lines.push(
      Object.freeze({
        employer: employment.employer,
        qualifyingEarnings: employment.qualifyingEarnings,
        earningsCharged,
        cappedByMaximumContributionsBase: capped,
        amount: mulCents(earningsCharged, charge.value / 100),
      }),
    );
  }
  const provenance = mergeProvenance(
    provenanceOf(fy, [
      ['superannuation.superGuarantee.chargePercentage', charge],
      ['superannuation.superGuarantee.earningsBase', SG.earningsBase],
      ['superannuation.superGuarantee.salarySacrificeIsQualifyingEarnings', SG.salarySacrificeIsQualifyingEarnings],
    ]),
    ceiling.provenance,
  );
  return Object.freeze({
    fy,
    chargePercentage: charge.value,
    maximumContributionsBase: ceiling,
    employments: Object.freeze(lines),
    amount: lines.reduce<Cents>((sum, line) => addCents(sum, line.amount), toCents(0)),
    provenance: withCaveats(provenance, O19_CAVEAT),
  });
};
