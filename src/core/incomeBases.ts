// P3-2 — the income bases, as types that cannot be substituted for one another. There are **six**
// of them from FY2027-28: P3-5 added `Div293Income` to the four T9 names, because s 293-20(1)(a)
// reads income for surcharge purposes *with one limb removed* and that is a different number, not a
// different label; P3-24 added `NetLabourIncome`, which is WATO's base and a genuine **fifth income
// base** rather than a projection of an existing one.
//
// Trap T9 is that these income figures appear in one Person's tax calculation and are routinely
// conflated:
//
//   taxable income               LITO (ITAA 1997 s 61-115(1)(a)); the Medicare levy for a single
//                                (Medicare Levy Act s 7)
//   Rebate Income                SAPTO (ITAA 1936 s 6(1), reg s 11(2))
//   family income                the Medicare levy for a Person with a spouse or dependants —
//                                the SUM of both Persons' taxable incomes (Medicare Levy Act s 8(5))
//   income for surcharge purposes  ITAA 1997 s 995-1(1) — the Medicare levy surcharge base
//   Div 293 income               the SAME components with paragraph (c) left out (s 293-20(1)(a))
//   net labour income            WATO (ITAA 1997 s 61-155(2)), from FY2027-28 — labour amounts
//                                less labour deductions, and nothing else in the Act uses it
//
// Tracking one number and reusing it is wrong in five of the six cases, and wrong quietly:
// for a Person with no reportable superannuation contributions, no investment loss and no fringe
// benefits, taxable income and Rebate Income are the same number, so the conflation is invisible
// on the demo Household and appears the first year salary sacrifice starts.
//
// The defence is structural rather than asserted. Each base is a distinct brand over `Cents`, so
// each is usable wherever `Cents` is wanted — the arithmetic in `money.ts` still applies — but
// none is assignable to another. `medicareLevy` cannot be handed a `RebateIncome` and
// `seniorsAndPensionersOffset` cannot be handed a `TaxableIncome`: those are compile errors, not
// test failures.
//
// The five derived bases have no widening constructor at all. The only way to obtain a
// `RebateIncome`, a `FamilyIncome`, a `SurchargeIncome`, a `Div293Income` or a `NetLabourIncome` is
// to build it out of `TaxableIncome` values plus its own named components, or — for net labour
// income, which is not built out of taxable income at all — out of the two s 61-155(2) amounts. So
// a relabelling cast is the only way to get one wrong, and a cast is visible in review.
// `taxableIncome` is the single boundary constructor, the same role `toCents` plays for money.
//
// `BasicIncomeTaxLiability` below is a **seventh** brand and is **not** one of the six: it is not an
// income base at all but an ITAA 1997 s 4-10(3) step-2 amount, and it lives here only because
// `data/assumptions/tax.ts` and `core/incomeTax.ts` must both see it and this file is the leaf they
// share. Do not "correct" the base or brand counts on its account (register T9).
//
// P3-5 replaced `surchargeIncome`'s single unsourced remainder with the seven components ITAA 1997
// s 995-1(1) actually names. That is what makes the Division 293 base expressible: s 293-20(1)(a)
// takes income for surcharge purposes *disregarding* paragraph (c), so `div293Income` is the same
// sum over the same components with that one limb left out — a difference by construction rather
// than a subtraction a caller has to remember. For a Person sacrificing $25,000 the two numbers
// differ by the whole $25,000.
import { addCents, subCents, toCents } from './money.js'; // `.js` is correct in a `.ts` file — see tsconfig.json
import type { Cents } from './money.js';
import type { PersonalDeductibleContributions } from './superConcessional.js';
// The one import that runs the other way. `data/assumptions/tax.ts` takes `NetLabourIncome` and
// `BasicIncomeTaxLiability` from this file as **types**, which are erased, so there is no runtime
// cycle: `dist/core/incomeBases.js` imports `dist/data/assumptions/tax.js` and that file imports
// only `money.js` and `types.js` back. It is here because the s 25-130 $1,000 is a legislated
// figure and legislated figures live in `data/assumptions/`, never in `core/` (P3-38).
import { standardDeductionAmountFor } from '../data/assumptions/tax.js';
import type { FinancialYear } from '../data/assumptions/types.js';

declare const TAXABLE_INCOME: unique symbol;
declare const REBATE_INCOME: unique symbol;
declare const FAMILY_INCOME: unique symbol;
declare const SURCHARGE_INCOME: unique symbol;
declare const DIV_293_INCOME: unique symbol;
declare const NET_LABOUR_INCOME: unique symbol;
declare const TOTAL_NET_INVESTMENT_LOSS: unique symbol;
declare const REPORTABLE_SUPER_CONTRIBUTIONS: unique symbol;
declare const BASIC_INCOME_TAX_LIABILITY: unique symbol;

/** ITAA 1997 s 4-15: assessable income less deductions. The base LITO and the single Medicare levy read. */
export type TaxableIncome = Cents & { readonly [TAXABLE_INCOME]: true };

/** ITAA 1936 s 6(1). The base SAPTO reads — both the gate and the amount, on different figures (T2). */
export type RebateIncome = Cents & { readonly [REBATE_INCOME]: true };

/** Medicare Levy Act s 8(5): the sum of both Persons' **taxable** incomes. Never Rebate Income. */
export type FamilyIncome = Cents & { readonly [FAMILY_INCOME]: true };

/** ITAA 1997 s 995-1(1) 'income for surcharge purposes'. All four additive limbs, less the fifth. */
export type SurchargeIncome = Cents & { readonly [SURCHARGE_INCOME]: true };

/**
 * ITAA 1997 s 293-20(1)(a): income for surcharge purposes **disregarding reportable superannuation
 * contributions**. A different number from `SurchargeIncome` and a different brand, because the
 * two are the same sum over the same components minus one limb, and swapping them double-counts a
 * salary-sacrificing Person's own contributions — once in the income and again in the low tax
 * contributions Div 293 adds on top.
 */
export type Div293Income = Cents & { readonly [DIV_293_INCOME]: true };

/**
 * ITAA 1997 s 61-155(2) 'net labour income' — **labour amounts less labour deductions**. WATO's
 * base, and the base of nothing else in the Act (register §2.8.1, T9).
 *
 * A genuine fifth income base rather than a sixth label on an existing one: it is not built out of
 * taxable income and it is not a projection of any other base. It **excludes** interest, dividends,
 * rent, net capital gains, superannuation income streams and the Age Pension, all of which are
 * inside taxable income, and it subtracts a deduction set of its own — so for a retired Person it
 * is nil while their taxable income is not, and for a wage earner with rental losses the two move
 * in opposite directions.
 */
export type NetLabourIncome = Cents & { readonly [NET_LABOUR_INCOME]: true };

/** ITAA 1997 s 995-1 'total net investment loss'. Two silos, each floored at nil, then summed. */
export type TotalNetInvestmentLoss = Cents & { readonly [TOTAL_NET_INVESTMENT_LOSS]: true };

/** ITAA 1997 s 995-1 'reportable superannuation contributions'. RESC + Subdiv 290-C, less the excess. */
export type ReportableSuperannuationContributions = Cents & { readonly [REPORTABLE_SUPER_CONTRIBUTIONS]: true };

/**
 * ITAA 1997 s 4-10(3) **step 2** — *basic income tax liability*. **Not an income base**, and it is
 * declared here only because it is the one brand two modules on opposite sides of the import DAG
 * must both see: `data/assumptions/tax.ts` produces WATO's s 61-160(b) limb and `core/incomeTax.ts`
 * produces the real thing, and `tax.ts` cannot import `incomeTax.ts` without a cycle. This file is
 * the shared leaf they both already import.
 *
 * **What the brand buys is trap 1 of P3-39.** Limb (b) of s 61-160 is the liability net labour
 * income alone would bear, **before** any tax offset: LITO and SAPTO are s 4-10(3) **step 3** and
 * cannot enter a step-2 figure. A post-offset number is still a `Cents`, so before this brand
 * existed `hypotheticalBasicIncomeTaxLiability: subCents(limbB, lito)` compiled silently and
 * returned $0 for every Person with net labour income at or below $23,200 — `0.14 × 5,000` is
 * exactly LITO's $700 maximum — which is a plausible wrong dollar, not an error. Only
 * `taxOnTaxableIncome` and `watoHypotheticalBasicIncomeTaxLiability` produce one, and neither
 * subtracts an offset, so writing the mutation now needs a visible cast.
 */
export type BasicIncomeTaxLiability = Cents & { readonly [BASIC_INCOME_TAX_LIABILITY]: true };

/**
 * The one boundary constructor. A tax loss produces a taxable income of nil, never a negative
 * one, so a negative figure here is a caller error rather than something to clamp away quietly.
 */
export const taxableIncome = (amount: Cents): TaxableIncome => {
  if (amount < 0) throw new RangeError(`taxable income cannot be negative: ${amount} cents`);
  return amount as TaxableIncome;
};

/**
 * ITAA 1936 s 6(1). Taxable income, disregarding assessable First Home Super Saver released
 * amounts, plus reportable superannuation contributions, total net investment loss and the
 * adjusted fringe benefits total.
 *
 * The add-backs are what make this a different number from taxable income: salary sacrifice and
 * personal deductible contributions reduce taxable income and are added straight back here, so a
 * Person who starts sacrificing sees their taxable income fall and their Rebate Income hold.
 * Age Pension payments are assessable and are therefore already inside `taxableIncome` — they are
 * not an add-back (register §2.3).
 */
export interface RebateIncomeComponents {
  readonly taxableIncome: TaxableIncome;
  readonly reportableSuperContributions: Cents;
  readonly totalNetInvestmentLoss: Cents;
  readonly adjustedFringeBenefitsTotal: Cents;
  /** Disregarded by s 6(1): subtracted back out of taxable income. Nil for this Household. */
  readonly assessableFhssReleasedAmounts: Cents;
}

export const rebateIncome = (components: RebateIncomeComponents): RebateIncome => {
  const withAddBacks = addCents(
    addCents(components.taxableIncome, components.reportableSuperContributions),
    addCents(components.totalNetInvestmentLoss, components.adjustedFringeBenefitsTotal),
  );
  return subCents(withAddBacks, components.assessableFhssReleasedAmounts) as RebateIncome;
};

/** No add-backs and no FHSS — the common case, written out so callers need not spell out four zeroes. */
export const rebateIncomeFrom = (income: TaxableIncome): RebateIncome =>
  rebateIncome({
    taxableIncome: income,
    reportableSuperContributions: toCents(0),
    totalNetInvestmentLoss: toCents(0),
    adjustedFringeBenefitsTotal: toCents(0),
    assessableFhssReleasedAmounts: toCents(0),
  });

/**
 * Medicare Levy Act s 8(5). Takes `TaxableIncome` values and nothing else, which is the point:
 * a family income built from Rebate Incomes will not compile.
 */
export const familyIncome = (first: TaxableIncome, ...rest: readonly TaxableIncome[]): FamilyIncome =>
  rest.reduce<Cents>((sum, income) => addCents(sum, income), first) as FamilyIncome;

// --- The s 995-1(1) components that are terms in their own right --------------------------------

/**
 * ITAA 1997 s 995-1 'total net investment loss': the sum of
 *   (a) the amount (if any) by which deductions attributable to *financial investments exceed the
 *       gross income from those investments; and
 *   (b) the amount (if any) by which deductions attributable to rental property exceed the gross
 *       income from rental property.
 *
 * **Two silos, each independently floored at nil, then summed — never netted against each other.**
 * "The amount (if any) by which … exceed" is written twice, once per paragraph, so a financial
 * investment *profit* does not soak up a rental loss. Netting them understates the base, and it is
 * the mutation this shape exists to make impossible: the four figures go in separately and each
 * `if any` is applied before the addition, so there is no expression in which one silo's surplus
 * can reach the other. The brand stops a caller hand-computing a netted figure and passing it in.
 */
export interface TotalNetInvestmentLossComponents {
  /** Margin loan interest, borrowing costs — deductions attributable to *financial investments. */
  readonly financialInvestmentDeductions: Cents;
  readonly financialInvestmentIncome: Cents;
  readonly rentalPropertyDeductions: Cents;
  readonly rentalPropertyIncome: Cents;
}

const excessOf = (deductions: Cents, income: Cents): Cents =>
  deductions > income ? subCents(deductions, income) : toCents(0);

export const totalNetInvestmentLoss = (
  components: TotalNetInvestmentLossComponents,
): TotalNetInvestmentLoss => {
  for (const [name, amount] of Object.entries(components)) {
    if (amount < 0) throw new RangeError(`${name} cannot be negative: ${amount} cents`);
  }
  return addCents(
    excessOf(components.financialInvestmentDeductions, components.financialInvestmentIncome),
    excessOf(components.rentalPropertyDeductions, components.rentalPropertyIncome),
  ) as TotalNetInvestmentLoss;
};

/**
 * ITAA 1997 s 995-1 'reportable superannuation contributions' — the sum of
 *   (a) *reportable employer superannuation contributions; and
 *   (b) deductions under Subdivision 290-C,
 * **reduced (but not below zero)** by any *excess concessional contributions for the corresponding
 * financial year.
 *
 * It is not "reportable *employer* superannuation contributions", and the difference matters: this
 * is the limb Division 293 then disregards, so its scope decides which of the Person's own
 * contributions are stripped out of the income base.
 *
 * **There is no Superannuation Guarantee limb, deliberately.** TAA 1953 Sch 1 s 16-182(1)(c)/(d)
 * makes an employer contribution reportable only to the extent the Person can influence its size,
 * or influence how it is contributed so as to reduce their assessable income. Compulsory SG at the
 * legislated rate fails both tests; a sacrificed amount and a negotiated above-SG amount pass. An
 * SG figure therefore has no field to be filed under.
 */
export interface ReportableSuperannuationContributionComponents {
  /** A *reportable employer superannuation contribution — s 16-182(1)(c)/(d) is satisfied by construction. */
  readonly salarySacrificed: Cents;
  /** Any other above-SG employer amount the Person negotiated. A Setting: not derivable from a forecast. */
  readonly otherReportableEmployerContributions: Cents;
  /** Subdiv 290-C deductions, branded so an unacknowledged personal contribution cannot be filed here. */
  readonly personalDeductible: PersonalDeductibleContributions;
  /** s 995-1: the sum is *reduced, but not below zero*, by this. `applyConcessional` computes it. */
  readonly excessConcessionalContributions: Cents;
}

export const reportableSuperannuationContributions = (
  components: ReportableSuperannuationContributionComponents,
): ReportableSuperannuationContributions => {
  for (const [name, amount] of Object.entries(components)) {
    if (amount < 0) throw new RangeError(`${name} cannot be negative: ${amount} cents`);
  }
  const reportable = addCents(
    addCents(components.salarySacrificed, components.otherReportableEmployerContributions),
    components.personalDeductible,
  );
  const net = reportable - components.excessConcessionalContributions;
  return (net > 0 ? net : 0) as ReportableSuperannuationContributions;
};

// --- Income for surcharge purposes, and Division 293's reading of it -----------------------------

/**
 * ITAA 1997 s 995-1(1), all of it: four additive limbs, two disregards inside paragraph (a), and a
 * subtractive fifth amount. P3-5 sourced the list from the statute and the ATO's own plain-English
 * decomposition agrees on every limb *and* on every sign, so the enumeration below is closed —
 * this is no longer one unsourced remainder.
 *
 * **Four of these the forecaster cannot derive, and the seam closes by asking rather than by
 * computing.** The reportable fringe benefits total is grossed up by the employer against a
 * 31 March FBT year behind a $2,000 entry test; both investment-loss silos need a geared portfolio
 * the model does not have; and the above-SG employer remainder is a fact about the Person's
 * package. Every one of them is a required field, so nil is a choice the caller states rather than
 * something they get by omission — the same reason `qualifyingEarnings` has no default sacrifice
 * limb and `concessionalContributions` has no default remainder.
 */
export interface SurchargeIncomeComponents {
  /** Paragraph (a) — ITAA 1997 s 4-15. */
  readonly taxableIncome: TaxableIncome;
  /**
   * Paragraph (a)'s first disregard: the s 313-20 *assessable FHSS released amount. **Subtracts.**
   * Setting, nil by default — `rebateIncome` already carries the same field.
   */
  readonly assessableFhssReleasedAmount: Cents;
  /**
   * Paragraph (a)'s second disregard: ITAA 1936 Sch 2F s 271-105(1) *reduces* assessable income by
   * the amount family trust distribution tax has been paid on, and disregarding that subsection
   * adds the reduction back. **Adds.** The ATO's own list has the same sign ("net amount on which
   * family trust distribution tax has been paid", added). Setting, nil by default.
   */
  readonly familyTrustDistributionTaxReduction: Cents;
  /**
   * Paragraph (b) — FBTAA s 135N, the sum across employers of the s 135P reportable amounts. Each
   * is grossed up by `1 ÷ (1 − 0.47)` and only arises where the individual fringe benefits amount
   * for the FBT year ending 31 March exceeds $2,000. **Setting: the Person reads it off their
   * income statement.** Nothing in a salary forecast can produce it.
   */
  readonly reportableFringeBenefitsTotal: Cents;
  /** Paragraph (c). The limb **Division 293 disregards** — s 293-20(1)(a). */
  readonly reportableSuperannuationContributions: ReportableSuperannuationContributions;
  /** Paragraph (d). */
  readonly totalNetInvestmentLoss: TotalNetInvestmentLoss;
  /**
   * The subtractive fifth amount: s 301-20(3), where the Person is entitled to the s 301-20(2)
   * offset. That is the 0%-taxed slice of a superannuation lump sum taken between preservation age
   * and 60, capped at the low rate cap (s 307-345). **Subtracts.** The 15% slice above the low rate
   * cap is not removed. Lump sums are not modelled, so this is a Setting, nil by default.
   */
  readonly lowRateCapLumpSumComponent: Cents;
}

/** The seven limbs, named once so a missing one is detected by absence rather than by its effect. */
const SURCHARGE_INCOME_COMPONENTS = [
  'taxableIncome',
  'assessableFhssReleasedAmount',
  'familyTrustDistributionTaxReduction',
  'reportableFringeBenefitsTotal',
  'reportableSuperannuationContributions',
  'totalNetInvestmentLoss',
  'lowRateCapLumpSumComponent',
] as const;

/**
 * Four of the seven limbs are Settings, so an omitted one is the likely mistake, and the type
 * system does not see it: these components arrive from stored user Settings and from JavaScript
 * callers. Without this the omission propagates as `NaN` through the additions and surfaces three
 * frames away as `not a whole number of cents: NaN`, naming neither the limb nor this function.
 */
export class MissingSurchargeComponentError extends RangeError {
  readonly component: string;
  constructor(component: string) {
    super(
      `income for surcharge purposes is missing the component "${component}". ITAA 1997 ` +
        's 995-1(1) names seven limbs and four of them cannot be derived from a salary forecast, ' +
        'so every one is required: a nil is a figure the caller states, never one they get by ' +
        'leaving the field out.',
    );
    this.name = 'MissingSurchargeComponentError';
    this.component = component;
  }
}

/**
 * The one sum, written once. `surchargeIncome` passes paragraph (c); `div293Income` passes nil.
 * That single argument *is* the s 293-20(1)(a) disregard, so the two bases cannot drift apart in
 * any limb other than the one the statute names.
 */
const sumSurchargeComponents = (
  components: SurchargeIncomeComponents,
  reportableSuperannuationContributionsLimb: Cents,
): Cents => {
  for (const name of SURCHARGE_INCOME_COMPONENTS) {
    const amount = components[name] as number | undefined;
    if (!Number.isFinite(amount)) throw new MissingSurchargeComponentError(name);
    if ((amount as number) < 0) {
      throw new RangeError(`surcharge income component ${name} cannot be negative: ${amount} cents`);
    }
  }
  const added = addCents(
    addCents(components.taxableIncome, components.familyTrustDistributionTaxReduction),
    addCents(
      addCents(components.reportableFringeBenefitsTotal, reportableSuperannuationContributionsLimb),
      components.totalNetInvestmentLoss,
    ),
  );
  const total = subCents(
    subCents(added, components.assessableFhssReleasedAmount),
    components.lowRateCapLumpSumComponent,
  );
  if (total < 0) {
    throw new RangeError(
      `income for surcharge purposes cannot be negative: ${total} cents. The two subtractive ` +
        'amounts — the assessable FHSS released amount and the s 301-20(3) low rate cap component ' +
        '— are both already inside taxable income, so subtracting more than the whole of it means ' +
        'the components do not describe one Person\'s year.',
    );
  }
  return total;
};

/** ITAA 1997 s 995-1(1). The Medicare levy surcharge base; **not** Division 293's. */
export const surchargeIncome = (components: SurchargeIncomeComponents): SurchargeIncome =>
  sumSurchargeComponents(components, components.reportableSuperannuationContributions) as SurchargeIncome;

/**
 * ITAA 1997 s 293-20(1)(a) — the same components with paragraph (c) left out.
 *
 * Forgetting this disregard is the second most damaging Div 293 error there is: for a Person
 * sacrificing $25,000 it counts that $25,000 once in the income base and again in the low tax
 * contributions on the other side of the same sum, and pulls Persons over $250,000 who are not
 * over it. Here it is one argument at one call site rather than a subtraction spread across the
 * callers.
 */
export const div293Income = (components: SurchargeIncomeComponents): Div293Income =>
  sumSurchargeComponents(components, toCents(0)) as Div293Income;

// --- Net labour income — ITAA 1997 s 61-155(2), WATO's base (P3-24) ------------------------------

/**
 * s 61-155(2): **`Labour amounts − Labour deductions`**, and nothing else. Register §2.8.1.
 *
 * `labour amounts` are amounts **included in assessable income**: `*assessable labour income` (each
 * amount from which an amount must be withheld under TAA 1953 Sch 1 ss 12-35, 12-40, 12-45, 12-47,
 * 12-50, Subdiv 12-C or para 12-110(1)(ca) — s 25-130(4)), sole-trader business income (expressly
 * **not** partnership or trust business income), `*personal services income`, s 83A-25 ESS discounts
 * and TAA 1953 Sch 1 s 12-60 labour-hire payments. `labour deductions` are the matching work
 * deductions and business outgoings, the s 25-130 standard deduction, s 40-25 and Subdiv 328-D
 * decline in value on work assets, and s 25-130(2)(d)–(g) amounts.
 *
 * **Neither limb is derivable from a salary forecast**, which is why there are two required fields
 * and no default: the split of assessable income into labour and non-labour, and of deductions into
 * labour and non-labour, are facts about the Person's return. They arrive as a Setting —
 * `SETTINGS_NOT_ASSUMPTIONS['tax.wato.netLabourIncomeSplit']` — whose stated default is
 * `netLabourIncomeFromSalary`, and a nil is therefore a figure the caller states rather than one
 * they get by leaving a field out. Same seam, and the same reason, as `SurchargeIncomeComponents`.
 */
export interface NetLabourIncomeComponents {
  /** s 61-155(2) `labour amounts` — the sum of the five paragraphs, counted once each (s 61-155(3)). */
  readonly labourAmounts: Cents;
  /** s 61-155(2) `labour deductions` — the sum of the six paragraphs, including s 25-130 (limb (c)). */
  readonly labourDeductions: Cents;
}

/** Named once so an omitted limb is detected by absence rather than by arriving as `NaN`. */
const NET_LABOUR_INCOME_COMPONENTS = ['labourAmounts', 'labourDeductions'] as const;

/**
 * The exact counterpart of `MissingSurchargeComponentError`, and it was a **bare, unnamed
 * `RangeError`** until 2026-09-15 — the naming-discipline gap the register records at §3.9 Medicare
 * finding 3 and R8 settles, reproduced inside this file between two adjacent guards doing the same
 * job on the same shape of input.
 *
 * Both limbs are required `Cents` on `NetLabourIncomeComponents`, so within TypeScript this is
 * unreachable; it exists because the split arrives from a stored **Setting**
 * (`tax.wato.netLabourIncomeSplit`) and from JavaScript callers, which is the population §3.6 says
 * the tool must ask. Without it an omission propagates as `NaN` and surfaces as *"not a whole
 * number of cents: NaN"*, naming neither the limb nor this function.
 */
export class MissingNetLabourIncomeComponentError extends RangeError {
  readonly component: string;
  constructor(component: string) {
    super(
      `net labour income is missing the component "${component}". ITAA 1997 s 61-155(2) names two ` +
        'amounts and the tool can derive neither, so both are required: a nil is a figure the ' +
        'caller states, never one they get by leaving the field out.',
    );
    this.name = 'MissingNetLabourIncomeComponentError';
    this.component = component;
  }
}

/**
 * The subtraction, exactly as the formula states it, with **no floor at nil**. The statute states
 * none, and nothing depends on one: a Person whose labour deductions exceed their labour amounts
 * cannot *exceed* the tax-free threshold under s 61-155(1)(b) on any reading, so a negative figure
 * and a nil figure both produce no entitlement. Flooring here would be a decision the provision
 * does not make, and it would hide a caller who has passed the two limbs the wrong way round.
 */
export const netLabourIncome = (components: NetLabourIncomeComponents): NetLabourIncome => {
  for (const name of NET_LABOUR_INCOME_COMPONENTS) {
    const amount = components[name] as number | undefined;
    if (!Number.isFinite(amount)) throw new MissingNetLabourIncomeComponentError(name);
    if ((amount as number) < 0) {
      throw new RangeError(`net labour income component ${name} cannot be negative: ${amount} cents`);
    }
  }
  return subCents(components.labourAmounts, components.labourDeductions) as NetLabourIncome;
};

/**
 * The Setting's stated default: **all salary is labour income, and the only labour deduction is the
 * ITAA 1997 s 25-130 standard deduction the Person is entitled to by law.**
 *
 * It was *"labour deductions are nil"* until 2026-09-15, and that one quoted copy of the superseded
 * wording is the only one this file keeps. P3-38 wired s 25-130 — `labour deductions` limb (c) of
 * s 61-155(2) — so from FY2026-27 the default subtracts `max(0, min($1,000, salary) − reducers)`
 * instead of nothing at all. Before FY2026-27 the provision does not exist and the deduction is nil
 * as a matter of law rather than as an approximation.
 *
 * **The P3-39 ACCEPTED OPTIMISM is DISCHARGED for the modal case, and only NARROWED for the rest.**
 * §2.8.1's acceptance was written about exactly the Person this function is for — a wage earner
 * with no other work deductions — and for that Person, passing `reducerDeductions` of nil, this is
 * now **exact** rather than optimistic. What survives is narrower and gets its own dated acceptance:
 *
 * **ACCEPTED 2026-09-15 (P3-38), known, and detectable by no refusal.** For a Person who leaves the
 * Setting at its nil default while having real work deductions, this subtracts $1,000 where the
 * truth is `max(actual, $1,000)`. So it **under-states** labour deductions, **over-states** net
 * labour income, **over-states** WATO and **flatters the household** — the direction RULINGS.md R9
 * disfavours.
 *
 * **The residual is exactly `(actual − $1,000)` and it is nil for every Person with $1,000 or less
 * of real work deductions**, which is the modal wage earner and is precisely the population
 * §2.8.1's acceptance was written about. So that acceptance is **discharged**, not relabelled. What
 * remains is the same error **less $1,000** — strictly narrower, and unlike the version it replaces
 * it is nil rather than merely small for the common case. **It is not bounded above**: a Person
 * with $4,000 of real deductions is over-stated by $3,000, and any record claiming a $1,000 ceiling
 * on this residual would be wrong. What bounds it in *this* build is the WATO limb it feeds, which
 * is capped at $250 in total.
 *
 * It is accepted rather than refused because **the tool cannot identify that population at all**:
 * it has one aggregate reducer figure and no way to test whether the caller's nil is true, so a
 * refusal would fire on every caller and block the answer for the common case. It does **not**
 * inherit §2.8.1's acceptance: the register carries its own dated paragraph and
 * `TAX.s25130.residualOptimism` its own record.
 *
 * **`labourDeductions` is the SUM of two limbs and not the standard deduction alone.** The reducers
 * the caller states are the Person's actual s 8-1 work deductions, Div 28 car expenses, s 25-100
 * travel, work-asset repairs and decline in value — and every one of those is *itself* a
 * `labour deduction` under s 61-155(2) limbs (a) and (b), quite apart from being a s 25-130(2)
 * reducer. Subtracting only limb (c) would over-state net labour income by the whole of the stated
 * reducer sum, for a caller who answered the Setting **truthfully**, which would be a new error
 * introduced by the very change that removes an old one. The sum telescopes:
 *
 *     reducers + max(0, min($1,000, salary) − reducers)  ===  max(reducers, min($1,000, salary))
 *
 * — which is the measure's own shape, a **floor of $1,000** under a wage earner's work deductions.
 *
 * All three arguments are **required**. The year, because the deduction has a first income year and
 * a caller who does not state one cannot be given a figure; the reducer sum, because a nil is a
 * figure the caller states and never one they get by leaving a field out — the same doctrine
 * `NetLabourIncomeComponents` enforces one line up.
 */
export const netLabourIncomeFromSalary = (
  fy: FinancialYear,
  salary: Cents,
  reducerDeductions: Cents,
): NetLabourIncome =>
  netLabourIncome({
    labourAmounts: salary,
    // Plain integer addition rather than `addCents`, for the reason `standardDeductionAmount`
    // gives: both terms are whole cents, so the sum is exact, and an omitted `reducerDeductions`
    // must reach `netLabourIncome`'s NAMED guard below rather than die inside `assertWhole` as an
    // anonymous "not a whole number of cents: NaN" (R8, register §3.9 Medicare finding 3).
    labourDeductions: (reducerDeductions + standardDeductionAmountFor(fy, salary, reducerDeductions)) as Cents,
  });
