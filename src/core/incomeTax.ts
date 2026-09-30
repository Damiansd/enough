// P3-1 — income tax, the Medicare levy, LITO and SAPTO. Register §2.
//
// `data/assumptions/tax.ts` holds every figure and the two derivations the regulation states
// (the SAPTO thresholds, reg s 9; the spouse transfer, reg s 12). Nothing is re-declared here:
// this module is arithmetic over those records and nothing else. If a dollar amount or a rate
// appears below as a literal, it is a bug.
//
// Three orderings in this file are load-bearing, and each is enforced by the shape of the code
// rather than by a comment telling the reader to be careful:
//
//   * **SAPTO eligibility is decided before any transfer exists** (T3). `assess` runs the gate
//     against the untransferred base rebate amount and freezes the answer; `transfersInto` reads
//     that frozen answer and can only ever change an *amount*. There is no code path from a
//     transferred figure back to the gate.
//
//   * **The gate and the amount read different income figures** (T2). The gate reads half the
//     couple's combined Rebate Income; the amount reads the Person's own. Both go through the
//     same `saptoOffset`, so the difference is visibly the income argument and not two formulas
//     that might drift apart.
//
//   * **SAPTO is computed before the Medicare levy, because the levy consumes the offset** (T8).
//     `MedicareLevyInput` carries `saptoReceived`, a dollar amount, and carries no eligibility
//     flag at all — so the seniors threshold switch cannot be keyed off eligibility here, because
//     eligibility is not reachable from here.
//
// The income bases are `core/incomeBases.ts` (P3-2): five bases and six brands from FY2027-28,
// when WATO's net labour income joins them (register T9, §2.8.1). Every income parameter below is
// one of those branded types, so passing the wrong base is a compile error rather than a wrong
// number. **All five bases appear here as of P3-39 (2026-09-15)**: net labour income arrives on the
// Person and is required from FY2027-28, and this module computes WATO.
//
//   * **WATO is s 63-10(1) item 3 and is applied FIRST**, ahead of SAPTO at item 5 and LITO in
//     item 20's residual. The aggregate is order-blind while every excess is lost, but the
//     attribution is not — `watoComputed` and `watoApplied` are reported separately because the
//     difference between them is the offset the item 3 cap threw away.
//   * **WATO has NO Medicare-levy limb** (s 63-10(1), unlike items 21 and 22), and that is enforced
//     by ABSENCE: `MedicareLevyInput` carries no WATO field of any kind, and no generic
//     offsets-applied field either, so there is no parameter through which a WATO amount could be
//     threaded into the levy. Making it reduce the levy requires a visible interface change — the
//     same pattern `saptoReceived` uses in reverse, and P3-1a's.
//
// What this module refuses to do:
//
//   * compute tax for a year whose `TaxYear` record carries no bracket table at all. NO YEAR IN
//     THIS BUILD is such a year: R12 supplied FY2027-28's table and P2-10b extended it to every
//     later year from Sch 7 Pt I's own words, and a year BELOW the window raises `taxYear`'s bare,
//     nameless `RangeError` first (FY2025-26 — the example year moved down as the window opened
//     upward). `brackets` is an optional field, so `MissingBracketTableError` survives as
//     defence in depth and is exercised through `bracketTableOf` by a synthetic year record.
//
// **The Medicare levy low-income reduction is computed PER TAXPAYER, and a mixed-SAPTO couple
// therefore holds two different family income thresholds against one family income — which is the
// Act's own outcome and not a conflict** (register **O30**, closed 2026-09-21 on the primary law).
// Until that date this module refused such a couple outright, with a `MixedSaptoFamilyThreshold-
// Error` that has been DELETED on a reversed premise: the supposed constraint it guarded — that
// the two spouses' reductions sum to one household `raw` — is an artefact of the SYMMETRIC case
// and was never a rule. Every operative limb of s 8 is framed on "a person"/"the relevant person";
// "family income threshold" is expressly defined "in relation to a person" while "family income"
// is expressly the shared sum; s 8(5)(b) shows the drafter's technique for pulling a spouse's
// circumstances into a per-person term ("the relevant person **or the spouse of the relevant
// person**", for the child uplift) and **s 8(7) does not use it**; and s 8(7) uses the identical
// "a person who is entitled to a rebate under section 160AAAA" formula as s 3(1)'s `threshold
// amount` and `phase-in limit`, which this module has always applied per Person. So the senior
// spouse can be nil under s 8(1) while the other pays a full s 7 levy, each spouse has their own
// phase-in band ($77,028.75 senior, $59,047.50 not), and s 8(3)'s ratio TI(spouse)/family income
// contains no threshold at all, so asymmetric reduction amounts apportion perfectly well.
//
// Nothing here reads the clock: the financial year is a parameter (P4-1a).
import { addCents, mulCents, subCents, toCents } from './money.js'; // `.js` is correct in a `.ts` file — see tsconfig.json
import type { Cents } from './money.js';
import {
  MINIMUM_TAX_RATE,
  TAX,
  ceilToWholeDollar,
  entitledToWorkingAustraliansOffset,
  saptoThreshold,
  saptoTransferAmount,
  taxYear,
  watoAppliesToYear,
  watoHypotheticalBasicIncomeTaxLiabilityFor,
  watoOffsetAmount,
} from '../data/assumptions/tax.js';
import type { SaptoThreshold, TaxBracket, TaxYear } from '../data/assumptions/tax.js';
import type { Assumption, Confidence, FinancialYear } from '../data/assumptions/types.js';
import type {
  BasicIncomeTaxLiability,
  FamilyIncome,
  NetLabourIncome,
  RebateIncome,
  ReportableSuperannuationContributions,
  TaxableIncome,
} from './incomeBases.js';
import { familyIncome, taxableIncome } from './incomeBases.js';

// --- Provenance carried through the arithmetic --------------------------------------------------
//
// A computed number is only as good as the weakest figure that went into it, and the register
// deliberately holds two weak ones inside the Planning Horizon: the FY2027-28 second-lowest
// marginal rate (`unverified`) and the Medicare levy low-income thresholds (FY2025-26 carried as
// a labelled prior-year fallback, register O1 / TODO P1-6). Neither may reach a result silently.

type Record_ = readonly [key: string, record: Assumption<unknown, string>];

const CONFIDENCE_ORDER: readonly Confidence[] = [
  'primary-verified',
  'primary-via-archive',
  'secondary-only',
  'unverified',
];

export interface TaxProvenance {
  readonly fy: FinancialYear;
  /** The weakest confidence of any assumption this result consumed. */
  readonly confidence: Confidence;
  /** One line per consumed figure that is not primary-verified *for this year*. */
  readonly caveats: readonly string[];
}

const provenanceOf = (fy: FinancialYear, consumed: readonly Record_[]): TaxProvenance => {
  const caveats: string[] = [];
  let confidence: Confidence = 'primary-verified';
  for (const [key, record] of consumed) {
    if (CONFIDENCE_ORDER.indexOf(record.confidence) > CONFIDENCE_ORDER.indexOf(confidence)) {
      confidence = record.confidence;
    }
    if (record.confidence !== 'primary-verified') {
      caveats.push(`${key} is ${record.confidence}`);
    }
    if (record.fy !== undefined) {
      if (record.priorYearFallbackFor !== undefined) {
        caveats.push(
          `${key} is stamped FY${record.fy} and carried as a prior-year fallback for ` +
            `FY${record.priorYearFallbackFor} — no FY${record.priorYearFallbackFor} figure exists`,
        );
      } else if (record.fy !== fy) {
        caveats.push(`${key} is stamped FY${record.fy} and was applied to FY${fy}`);
      }
    }
  }
  return Object.freeze({ fy, confidence, caveats: Object.freeze([...new Set(caveats)]) });
};

/** The weakest confidence and the union of the caveats. A result is as weak as its weakest input. */
const mergeProvenance = (first: TaxProvenance, ...rest: readonly TaxProvenance[]): TaxProvenance => {
  let confidence = first.confidence;
  const caveats = new Set(first.caveats);
  for (const other of rest) {
    if (CONFIDENCE_ORDER.indexOf(other.confidence) > CONFIDENCE_ORDER.indexOf(confidence)) {
      confidence = other.confidence;
    }
    for (const caveat of other.caveats) caveats.add(caveat);
  }
  return Object.freeze({ fy: first.fy, confidence, caveats: Object.freeze([...caveats]) });
};

// --- Income tax on taxable income ---------------------------------------------------------------

export class MissingBracketTableError extends RangeError {
  constructor(fy: FinancialYear) {
    super(
      `no bracket table for FY${fy}: the register carries one for every year this build computes ` +
        '— FY2026-27 and FY2027-28 as stated years, and every later year from Income Tax Rates ' +
        'Act 1986 Sch 7 Pt I\'s own "2027-28 year of income or a later year of income" table. This ' +
        'year carries none, so there is nothing to apply and no ladder to derive one from. ' +
        'Refusing to compute — see register §2.1.1.',
    );
    this.name = 'MissingBracketTableError';
  }
}

/**
 * The bracket-table guard, narrowed by R12 and kept as defence in depth.
 *
 * It takes the year RECORD rather than fetching it, and that is the whole point: no year the build
 * can reach omits `brackets` — R12 supplied FY2027-28's and P2-10b supplies every later year from
 * Sch 7 Pt I — and a year below the window raises `taxYear`'s bare `RangeError` before reaching
 * here. So no real input can fire this refusal — and a guard no test can reach is decoration, which this project has paid for
 * once already. `brackets` remains an optional field, so the guard must survive; taking the
 * record as a parameter gives `test/core-income-tax.test.mjs` a seam to drive it with a clearly
 * labelled SYNTHETIC year record that carries no table.
 */
export const bracketTableOf = (fy: FinancialYear, year: TaxYear): Assumption<readonly TaxBracket[]> => {
  const table = year.brackets;
  if (table === undefined) throw new MissingBracketTableError(fy);
  return table;
};

const bracketTableFor = (fy: FinancialYear): Assumption<readonly TaxBracket[]> => bracketTableOf(fy, taxYear(fy));

const bracketsFor = (fy: FinancialYear): readonly TaxBracket[] => bracketTableFor(fy).value;

/**
 * Income Tax Rates Act 1986 Sch 7 Pt I, as the register's bracket table. Marginal: each bracket's
 * rate applies to the slice of income inside it, never to the whole.
 *
 * No rounding rule: the law states none for tax payable, LITO, WATO or the Medicare levy (register
 * §2.1, row "Rounding of tax payable, LITO, WATO and the Medicare levy", P3-1d) — the result is
 * whole cents, each slice rounded by `mulCents`. Only SAPTO rounds (up, reg ss 9(8), 10(2)).
 */
export const taxOnTaxableIncome = (fy: FinancialYear, income: TaxableIncome): BasicIncomeTaxLiability => {
  let tax = toCents(0);
  let lower = toCents(0);
  for (const bracket of bracketsFor(fy)) {
    if (income <= lower) break;
    const upper: Cents = bracket.upTo ?? income;
    const capped: Cents = income < upper ? income : upper;
    tax = addCents(tax, mulCents(subCents(capped, lower), bracket.rate));
    lower = upper;
  }
  // ITAA 1997 s 4-10(3) **step 2**, and the brand says so. Nothing above subtracts an offset —
  // step 3 is the caller's business — so this is the one place in the module that mints the brand
  // out of the ladder, and `watoOffsetAmount`'s limb (b) parameter cannot be fed a post-offset
  // figure without a visible cast (P3-39 trap 1).
  return tax as BasicIncomeTaxLiability;
};

// --- LITO — ITAA 1997 Subdiv 61-D ---------------------------------------------------------------

const LITO = TAX.lito;

/**
 * s 61-115(1)'s step function on **taxable income** (T9 — not Rebate Income), with the s 61-110(1)(b)
 * eligibility ceiling applied as its own gate as well as the amount table.
 *
 * The two are implemented separately even though they agree: at the $66,667 ceiling the stage-2
 * limb computes to −$0.005, so the clamp and the gate each independently produce $0 there, and a
 * change to either is visible against the other. Not indexed — it moves only by amendment, which
 * is why there is no financial year in this signature.
 */
export const lowIncomeTaxOffset = (income: TaxableIncome): Cents => {
  if (income > LITO.eligibilityCeiling.value) return toCents(0);
  if (income <= LITO.stageOneThreshold.value) return LITO.maximumOffset.value;
  const raw =
    income <= LITO.stageTwoThreshold.value
      ? subCents(
          LITO.maximumOffset.value,
          mulCents(subCents(income, LITO.stageOneThreshold.value), LITO.stageOneTaper.value),
        )
      : subCents(
          LITO.stageTwoBaseAmount.value,
          mulCents(subCents(income, LITO.stageTwoThreshold.value), LITO.stageTwoTaper.value),
        );
  return raw <= 0 ? toCents(0) : raw;
};

// --- WATO — ITAA 1997 Subdiv 61-E, from FY2027-28 (P3-39) ----------------------------------------

const WATO = TAX.wato;

/**
 * s 61-155(1)'s two limbs applied to a Person, and nothing else: the year gate and the
 * *exceeds the tax-free threshold* test in `entitledToWorkingAustraliansOffset`, then s 61-160's
 * `min`. **Mirrors `lowIncomeTaxOffset`: it returns the RAW ENTITLEMENT.** The s 63-10(1) item 3
 * usability cap is not applied here, because it is a cap against the Person's *actual* basic income
 * tax liability on their *actual* taxable income — a figure this function is not given and must not
 * guess. `householdIncomeTax` applies it once, centrally, where both numbers exist.
 *
 * **Three separate figures, which is the trap §2.8.1 tabulates.** Entitlement reads net labour
 * income; limb (b) reads net labour income *treated as if it were the whole taxable income*; the
 * usability cap reads actual taxable income. Only the first two are here.
 *
 * **Entitled-but-zero is real and is not a bug.** At a net labour income of $18,200.01 the
 * entitlement gate passes — s 61-155(1)(b) says *exceeds* — and limb (b) is 14% of one cent, which
 * rounds to nil. The gate and the amount are separate provisions and they disagree over a cent-wide
 * window; collapsing them would be inventing a boundary the Act does not draw.
 *
 * **No refusal for FY2026-27 or earlier, and that is a positive statement.** The offset does not
 * exist in law before FY2027-28 (Act No. 49 of 2026 Sch 3 Pt 2 item 4), so $0 is a FACT for those
 * years and not an estimate. This is the opposite case from a missing bracket table, where the true
 * figure exists and is unknown to the register and `MissingBracketTableError` refuses.
 */
export const workingAustraliansTaxOffset = (fy: FinancialYear, income: NetLabourIncome): Cents => {
  if (!entitledToWorkingAustraliansOffset(fy, income)) return toCents(0);
  return watoOffsetAmount({
    maximumOffset: WATO.maximumOffset.value,
    hypotheticalBasicIncomeTaxLiability: watoHypotheticalBasicIncomeTaxLiabilityFor(fy, income),
  });
};

/**
 * From FY2027-28 a Person's net labour income is load-bearing and the tool cannot derive it, so a
 * Person who arrives without one is refused by name rather than treated as having nil.
 *
 * **Deliberately narrow, on two axes.** It fires only where the field is `undefined` — a stated
 * nil computes an honest $0 — and only in a year the offset exists in. Making `netLabourIncome`
 * unconditionally required would break every FY2026-27 caller for no benefit in a year WATO cannot
 * apply, which is the over-broad-refusal shape this project has paid for before. The same doctrine
 * `incomeBases.ts` states for the two s 61-155(2) limbs: *a nil is a figure the caller states,
 * never one they get by leaving the field out*.
 */
export class NetLabourIncomeNotSuppliedError extends RangeError {
  readonly person: string;
  constructor(person: string, fy: FinancialYear) {
    super(
      `${person} has no net labour income for FY${fy}, and from FY2027-28 the Working Australians ` +
        'tax offset is measured on it (ITAA 1997 s 61-155(2), register §2.8.1). It is a fifth ' +
        'income base: neither limb is derivable from a taxable income or a salary forecast, so ' +
        'omitting the field cannot be read as a nil. Supply `netLabourIncome` — ' +
        '`netLabourIncome({ labourAmounts, labourDeductions })`, or ' +
        '`netLabourIncomeFromSalary(fy, salary, reducerDeductions)` for the Setting\'s default — ' +
        'using `netLabourIncomeFromSalary(fy, toCents(0), toCents(0))` where the Person genuinely ' +
        'has none.',
    );
    this.name = 'NetLabourIncomeNotSuppliedError';
    this.person = person;
  }
}

/** The field, refused by name where the year needs it and it is absent. Never inferred. */
const netLabourIncomeOf = (fy: FinancialYear, person: SaptoPerson): NetLabourIncome | undefined => {
  if (!watoAppliesToYear(fy)) return undefined;
  if (person.netLabourIncome === undefined) throw new NetLabourIncomeNotSuppliedError(person.name, fy);
  return person.netLabourIncome;
};

// --- SAPTO — ITAA 1936 s 160AAAA and the 2025 Regulations Pt 5 Div 1 ss 9–12 ---------------------

const SAPTO = TAX.sapto;
const SAPTO_TAPER: number = SAPTO.taperRate.value;

/**
 * Reg s 9(2)(a) items. Reg s 9(3): a *permanently* separated Person is not a spouse and takes the
 * `single` amount; an *illness* separation keeps them spouses on a higher amount. Reg s 9(2)(b)'s
 * multiple-item rule (take the greatest where more than one item applied during the year) is met by
 * the caller: the projection holds one relationship for a whole year, and a year with an illness
 * separation in any month of it is `illnessSeparated` (O90) — item 3's amount is the greatest.
 */
export type Relationship = 'single' | 'couple' | 'illnessSeparated';

export interface SaptoPerson {
  readonly name: string;
  /** Reg s 11(2) — the base the *amount* reads. */
  readonly rebateIncome: RebateIncome;
  /** Reg s 12(3)(b)(ii) — the base the *transfer* reads. A different figure (T9). */
  readonly taxableIncome: TaxableIncome;
  /** s 160AAAA(2)(b): "qualified for", not "receiving". A $0 Age Pension entitlement still qualifies. */
  readonly qualifiedForAgePension: boolean;
  /** s 160AAAA(2): no offset for a Person in gaol for the whole year. */
  readonly inGaolForTheWholeYear?: boolean;
  /**
   * ITAA 1997 s 61-155(2) — WATO's base, and a **fifth** income base (T9). Optional on the type and
   * **required from FY2027-28**, where an omission raises `NetLabourIncomeNotSuppliedError`: the
   * offset does not exist before that year, so demanding it of an FY2026-27 caller would refuse an
   * answer the register has. Never derived from `taxableIncome` — for a Person with rental losses
   * or an income stream the two move apart, and for a wage earner they agree, which is what makes
   * the substitution invisible to fixtures.
   */
  readonly netLabourIncome?: NetLabourIncome;
  /**
   * **P3-19 — this Person's OWN income, for when they are the RECEIVING spouse of a
   * `SPOUSE_CONTRIBUTION`.** `householdIncomeTax` reads it off the OTHER Person, never off this
   * one's own `spouseContributionMade` — the two fields point in opposite directions, on
   * `netLabourIncome`'s own "always supplied" convention: it costs nothing to assemble alongside
   * `rebateIncome` at the one call site that builds a `SaptoPerson`, so it is supplied
   * unconditionally rather than only where a contribution happens to land, and a wrong limb cannot
   * hide behind an absence nobody exercises.
   */
  readonly spouseIncomeTest?: SpouseIncomeTestComponents;
  /**
   * **P3-19 — what THIS Person paid, after tax, into their spouse's superannuation this financial
   * year.** `undefined` is "nobody contributed", which is the overwhelming common case
   * (`NON_SUPER_INVESTMENT`/`LUMP_SUM_FROM_SUPER`'s "absence is a supported state" convention, not
   * `netLabourIncome`'s "absence is refused" one — most Households never state a
   * `SPOUSE_CONTRIBUTION` at all). `householdIncomeTax` reads the OTHER Person's `spouseIncomeTest`
   * against it.
   */
  readonly spouseContributionMade?: Cents;
  /**
   * **Div 119 — the minimum tax on capital gains from 1 July 2027 (LR-1 slice 3).** Absent is no
   * minimum tax capital gain. Both facts travel together, so a gain cannot arrive without the
   * exemption having been answered.
   */
  readonly minimumTax?: MinimumTaxFacts;
}

/** One Person's Div 119 facts for an income year. */
export interface MinimumTaxFacts {
  /** s 119-5: the gains from 1 July 2027 left after losses, deferred gains excluded, undiscounted. */
  readonly capitalGain: Cents;
  /**
   * s 119-15(1): the Person RECEIVED a listed payment "at any time during the income year". Of the
   * listed payments this build models only the age pension, so this is "was paid the age pension in
   * any month of the year". Per Person: a partner's pension does not exempt them.
   */
  readonly receivedExemptPayment: boolean;
}

/**
 * **ITAA 1997 s 119-10(2), the minimum tax gap amount**, for a Person who is not exempt.
 *
 * Step 1 is 30% of the minimum tax capital gain. Steps 2–4 are the tax the ordinary scale already
 * charges on it: the tax on taxable income less the tax on taxable income reduced by the gain, not
 * below nil. Step 5 subtracts, step 6 rounds DOWN to the whole dollar, and step 7 keeps it only if
 * it is more than nil. Worked in thousandths of a cent so that 30% of an odd cent is not rounded
 * before the dollar floor.
 */
export const minimumTaxGapAmount = (fy: FinancialYear, income: TaxableIncome, minimumTaxCapitalGain: Cents): Cents => {
  if (minimumTaxCapitalGain <= 0) return toCents(0);
  const step2 = taxOnTaxableIncome(fy, income);
  const step3 = taxOnTaxableIncome(fy, taxableIncome(Math.max(0, income - minimumTaxCapitalGain) as Cents));
  const step4 = step2 - step3;
  const step5Millicents = minimumTaxCapitalGain * Math.round(MINIMUM_TAX_RATE * 1_000) - step4 * 1_000;
  const step6Dollars = Math.floor(step5Millicents / 100_000);
  return (step6Dollars > 0 ? step6Dollars * 100 : 0) as Cents;
};

export interface SaptoEligibility {
  readonly qualifiedForAgePension: boolean;
  readonly inGaolForTheWholeYear: boolean;
  /**
   * s 160AAAA(4). Own Rebate Income for a Person who was not a spouse at any time; **half** the
   * couple's combined Rebate Income for a partnered Person (T2).
   */
  readonly incomeTested: Cents;
  readonly basis: 'own Rebate Income' | 'half combined Rebate Income';
  /** Derived from the **untransferred** base rebate amount. A transfer never re-opens this (T3). */
  readonly cutOut: Cents;
  readonly passed: boolean;
}

export interface SaptoTransferIn {
  readonly from: string;
  readonly amount: Cents;
}

export interface SaptoPersonResult {
  readonly name: string;
  readonly eligibility: SaptoEligibility;
  /** The reg s 9(2) item amount, before any transfer. */
  readonly baseRebateAmount: Cents;
  readonly transferReceived: SaptoTransferIn | null;
  /** `BRA*` — own plus transferred. The threshold is re-derived on this, never read off a table (T4). */
  readonly augmentedBaseRebateAmount: Cents;
  readonly thresholdBeforeTransfer: SaptoThreshold;
  readonly threshold: SaptoThreshold;
  /** Reg s 11(2), on the Person's **own** Rebate Income. Never on the gate figure (T2). */
  readonly offset: Cents;
}

export interface SaptoResult {
  readonly relationship: Relationship;
  readonly combinedRebateIncome: RebateIncome;
  readonly persons: readonly SaptoPersonResult[];
  readonly provenance: TaxProvenance;
}

const baseRebateAmountFor = (relationship: Relationship): Cents =>
  relationship === 'single'
    ? SAPTO.baseRebateAmount.single.value
    : relationship === 'illnessSeparated'
      ? SAPTO.baseRebateAmount.illnessSeparatedEach.value
      : SAPTO.baseRebateAmount.coupleEach.value;

const thresholdFor = (fy: FinancialYear, baseRebateAmount: Cents): SaptoThreshold => {
  const year = taxYear(fy);
  return saptoThreshold({
    taxFreeThreshold: year.taxFreeThreshold.value,
    lowestMarginalRate: year.lowestMarginalRate.value,
    secondLowestMarginalRate: year.secondLowestMarginalRate.value,
    rebateMaximumAmount: SAPTO.rebateMaximumAmount.value,
    rebateReductionRate: SAPTO.rebateReductionRate.value,
    rebateReductionThreshold: SAPTO.rebateReductionThreshold.value,
    baseRebateAmount,
  });
};

/**
 * Reg s 11(2): the base rebate amount reduced by 12.5c per $1 of income over the shade-out
 * threshold, rounded up to the whole dollar (reg s 10(2)) and clamped at nil.
 *
 * One function, two callers. The eligibility gate calls it with **half combined** Rebate Income
 * and the untransferred amount; the entitlement calls it with the Person's **own** Rebate Income
 * and `BRA*`. Keeping one formula makes T2 a difference in arguments, which is visible, instead
 * of a difference between two similar-looking functions, which is not.
 */
const saptoOffset = (baseRebateAmount: Cents, shadeOut: Cents, income: RebateIncome): Cents => {
  const excess = income > shadeOut ? subCents(income, shadeOut) : toCents(0);
  const raw = baseRebateAmount - excess * SAPTO_TAPER;
  return raw <= 0 ? toCents(0) : ceilToWholeDollar(raw);
};

/**
 * Half the couple's combined Rebate Income — s 160AAAA(4)'s gate figure, and only ever that.
 *
 * Halved Rebate Income is still Rebate Income, so it keeps the brand, and `saptoOffset` takes
 * `RebateIncome` rather than `Cents`. Both of SAPTO's income arguments are therefore checked:
 * neither the gate nor the amount can be handed a taxable income even from inside this file (T9).
 */
const halfCombined = (persons: readonly SaptoPerson[]): RebateIncome =>
  mulCents(
    persons.reduce<Cents>((sum, person) => addCents(sum, person.rebateIncome), toCents(0)),
    0.5,
  ) as RebateIncome;

/**
 * SAPTO for a Household. Household-level because s 160AAAA(4)'s gate and reg s 12's transfer both
 * need both Persons — there is no per-Person entry point to call by accident, for the same reason
 * `agePensionEntitlement` takes a `Household`.
 *
 * Order: eligibility from untransferred figures, then the untransferred amounts, then the
 * transfer, then the transferee's amount on a re-derived threshold. Steps 1 and 2 never read
 * anything produced by steps 3 and 4.
 */
export const seniorsAndPensionersOffset = (input: {
  readonly fy: FinancialYear;
  readonly relationship: Relationship;
  readonly persons: readonly [SaptoPerson] | readonly [SaptoPerson, SaptoPerson];
}): SaptoResult => {
  const { fy, relationship, persons } = input;
  if ((relationship === 'single') !== (persons.length === 1)) {
    throw new RangeError(
      `relationship '${relationship}' does not match ${persons.length} Person(s): reg s 9(3) — a ` +
        'Person who was not a spouse at any time takes the single amount, and a couple takes two ' +
        'partnered amounts.',
    );
  }

  const baseRebateAmount = baseRebateAmountFor(relationship);
  const combinedRebateIncome = persons.reduce<Cents>(
    (sum, person) => addCents(sum, person.rebateIncome),
    toCents(0),
  ) as RebateIncome;
  const untransferredThreshold = thresholdFor(fy, baseRebateAmount);

  // --- 1. The gate, on untransferred figures (T2, T3) --------------------------------------------
  const gateIncome = relationship === 'single' ? combinedRebateIncome : halfCombined(persons);
  const assessed = persons.map((person) => {
    const inGaol = person.inGaolForTheWholeYear ?? false;
    const eligibility: SaptoEligibility = Object.freeze({
      qualifiedForAgePension: person.qualifiedForAgePension,
      inGaolForTheWholeYear: inGaol,
      incomeTested: gateIncome,
      basis: relationship === 'single' ? 'own Rebate Income' : 'half combined Rebate Income',
      cutOut: untransferredThreshold.cutOut,
      passed:
        person.qualifiedForAgePension &&
        !inGaol &&
        saptoOffset(baseRebateAmount, untransferredThreshold.shadeOut, gateIncome) > 0,
    });
    // --- 2. The amount, on the Person's OWN Rebate Income, before any transfer -------------------
    return {
      person,
      eligibility,
      offset: eligibility.passed
        ? saptoOffset(baseRebateAmount, untransferredThreshold.shadeOut, person.rebateIncome)
        : toCents(0),
    };
  });

  // --- 3. The transfer (reg s 12) ---------------------------------------------------------------
  // All five preconditions, in cheapest-first order so the tax-payable test — the only one needing
  // a bracket table — is reached last. Both directions are evaluated from step-2 figures only,
  // exactly as the regulation does; the conditions are self-limiting, because a Person whose own
  // offset already equals their base rebate amount cannot be transferred to.
  const transferInto = (index: number): SaptoTransferIn | null => {
    if (relationship === 'single') return null;
    const to = assessed[index];
    const from = assessed[1 - index];
    if (to === undefined || from === undefined) return null;
    if (!from.eligibility.passed || !to.eligibility.passed) return null;
    if (to.offset >= baseRebateAmount) return null;
    // Reg s 12(1)(b)'s "tax payable ... (disregarding any credits or rebates)" is read as GROSS
    // basic income tax liability, before every offset: `taxOnTaxableIncome` subtracts none. That
    // reading is a registered INFERENCE, not a verified rule (register §2.6, opened by O73) — the
    // instrument defines neither "rebate" nor "tax payable". It is pre-existing, not new: LITO has
    // never been deducted here either, and WATO would be treated the same way.
    if (baseRebateAmount <= taxOnTaxableIncome(fy, from.person.taxableIncome)) return null;
    const amount = saptoTransferAmount(baseRebateAmount, from.person.taxableIncome);
    return amount > 0 ? Object.freeze({ from: from.person.name, amount }) : null;
  };

  // --- 4. The transferee's amount, on a threshold re-derived from BRA* (T4) ----------------------
  const results = assessed.map((entry, index): SaptoPersonResult => {
    const transferReceived = transferInto(index);
    const augmented =
      transferReceived === null ? baseRebateAmount : addCents(baseRebateAmount, transferReceived.amount);
    const threshold = transferReceived === null ? untransferredThreshold : thresholdFor(fy, augmented);
    return Object.freeze({
      name: entry.person.name,
      eligibility: entry.eligibility,
      baseRebateAmount,
      transferReceived,
      augmentedBaseRebateAmount: augmented,
      thresholdBeforeTransfer: untransferredThreshold,
      threshold,
      offset: entry.eligibility.passed
        ? saptoOffset(augmented, threshold.shadeOut, entry.person.rebateIncome)
        : toCents(0),
    });
  });

  const year = taxYear(fy);
  const usedSecondLowestRate = results.some(
    (result) => result.threshold.branch === 'reg-s-9(6)' || result.thresholdBeforeTransfer.branch === 'reg-s-9(6)',
  );
  return Object.freeze({
    relationship,
    combinedRebateIncome,
    persons: Object.freeze(results),
    provenance: provenanceOf(fy, [
      [`tax.years.${fy}.taxFreeThreshold`, year.taxFreeThreshold],
      [`tax.years.${fy}.lowestMarginalRate`, year.lowestMarginalRate],
      ...(usedSecondLowestRate
        ? ([[`tax.years.${fy}.secondLowestMarginalRate`, year.secondLowestMarginalRate]] as const)
        : []),
      ['tax.sapto.rebateMaximumAmount', SAPTO.rebateMaximumAmount],
      ['tax.sapto.rebateReductionThreshold', SAPTO.rebateReductionThreshold],
      // The key names the record actually read, so a caveat or an explanation can find it.
      ...((item: 'single' | 'coupleEach' | 'illnessSeparatedEach') => [[`tax.sapto.baseRebateAmount.${item}`, SAPTO.baseRebateAmount[item]]] as const)(
        relationship === 'single' ? 'single' : relationship === 'couple' ? 'coupleEach' : 'illnessSeparatedEach',
      ),
    ]),
  });
};

// --- Spouse contribution offset — ITAA 1997 Subdiv 290-D (P3-19) --------------------------------

const SPOUSE_OFFSET = TAX.spouseContributionOffset;

/**
 * **The three components s 290-230(2) reads to test the RECEIVING spouse's income** — never the
 * contributor's, and never simply their taxable income (`data/assumptions/tax.ts`'s own header on
 * this offset).
 *
 * `assessableIncome` is typed `TaxableIncome` rather than a fourth income-base brand: this build's
 * `REDUCER_DEDUCTIONS` is nil everywhere (`projection.ts`), so assessable income and taxable income
 * are the same figure for every Person this walk can construct, and the equivalence is exact rather
 * than approximate while that holds. `reportableFringeBenefitsTotal` is a plain `Cents`, on
 * `SurchargeIncomeComponents`'s own precedent (`incomeBases.ts`) — this codebase holds no field
 * anywhere for a stated fringe benefits figure, so it is nil for every Household this build can
 * project. `reportableSuperannuationContributions` reuses the existing branded figure
 * (`incomeBases.reportableSuperannuationContributions`) computed for Rebate Income, rather than a
 * second name for the same concept.
 */
export interface SpouseIncomeTestComponents {
  readonly assessableIncome: TaxableIncome;
  readonly reportableFringeBenefitsTotal: Cents;
  readonly reportableSuperannuationContributions: ReportableSuperannuationContributions;
}

/**
 * s 290-230(1)–(2): 18% of the lesser of (a) $3,000 reduced dollar-for-dollar once the receiving
 * spouse's income exceeds $37,000, cutting to nil at $40,000, and (b) the contribution actually
 * made — capped at $540 for the income year (s 290-235).
 *
 * **Mirrors `lowIncomeTaxOffset` and `workingAustraliansTaxOffset`: it returns the RAW
 * ENTITLEMENT**, before the s 63-10(1) item 20 usability cap `householdIncomeTax` applies
 * alongside LITO. No eligibility gate beyond the income test lives here — the two exclusions this
 * offset carries in law (a permanently separated couple; a contribution already claimed as a
 * personal deduction) are both structural facts about what `SPOUSE_CONTRIBUTION` can even state,
 * recorded in `data/assumptions/tax.ts`'s own header, and neither needs a runtime gate here.
 */
export const spouseContributionOffset = (
  spouseIncome: SpouseIncomeTestComponents,
  contributionMade: Cents,
): Cents => {
  const income = addCents(
    addCents(spouseIncome.assessableIncome, spouseIncome.reportableFringeBenefitsTotal),
    spouseIncome.reportableSuperannuationContributions,
  );
  const reduction = income > SPOUSE_OFFSET.lowerThreshold.value ? subCents(income, SPOUSE_OFFSET.lowerThreshold.value) : toCents(0);
  const taperedBase = SPOUSE_OFFSET.base.value > reduction ? subCents(SPOUSE_OFFSET.base.value, reduction) : toCents(0);
  const lesser = taperedBase < contributionMade ? taperedBase : contributionMade;
  const raw = mulCents(lesser, SPOUSE_OFFSET.rate.value);
  return raw > SPOUSE_OFFSET.maximumOffset.value ? SPOUSE_OFFSET.maximumOffset.value : raw;
};

// --- The Medicare levy — Medicare Levy Act 1986 ss 3(1), 7, 8 ------------------------------------

const MEDICARE = TAX.medicareLevy;
const THRESHOLDS = MEDICARE.lowIncomeThresholds;

/**
 * **s 8(7) is a per-Person test, and that is now the construction rather than a reason to refuse.**
 * Each spouse applies THEIR OWN family income threshold to the SHARED family income, so a couple
 * one birthday apart holds $61,623 and $47,238 at once and both figures are simultaneously
 * correct. A `MixedSaptoFamilyThresholdError` stood here until **2026-09-21** and refused every
 * such couple; it was deleted, not narrowed, because its premise was reversed rather than
 * bounded — see this module's header and register **O30**. Nothing below branches on the couple
 * being mixed, and there is no per-couple reconciliation step, because the Act asks for none: the
 * per-Person threshold is simply `familyLower` below, read off this Person's own `saptoReceived`.
 */

/**
 * s 8(3) and s 8(4) are irreducibly two-Person: whether the reduction is apportioned at all turns
 * on whether the *spouse* would themselves be liable. A caller who asks for a family levy inside
 * the shade-in band without saying who the spouse is gets a refusal, not the unapportioned answer
 * — that answer is right only when there is no spouse, and being wrong about which it is doubles
 * or halves a real household's benefit. `null` is how a Person with dependants and no spouse says
 * so; outside the band the spouse cannot change the number and may be omitted.
 *
 * **The message was corrected on 2026-09-11 (P3-35).** It used to paraphrase its own firing
 * condition, and the paraphrase was about 13.5 times too narrow. The condition is `raw > 0` — the
 * band itself, an excess under a quarter of the threshold — and it holds all the way to the point
 * where the reduction runs out: at the last firing cent the reduction left is **four cents**
 * against an excess of more than eleven thousand dollars, and the message used to call that excess
 * the smaller of the two. It now states the condition rather than restating it in other terms, and
 * `test/core-medicare-family-shade-in.test.mjs` forbids the paraphrase coming back.
 */
export class FamilySpouseNotSuppliedError extends RangeError {
  constructor(assessed: Cents, threshold: Cents) {
    super(
      `family income of ${assessed} cents exceeds the family income threshold of ${threshold} ` +
        'cents by less than a quarter of that threshold, so s 8(2) still leaves a reduction to ' +
        'grant — that is the condition this is thrown on, and near the top of the band the ' +
        'reduction still to be granted is cents while the excess over the threshold is ' +
        'thousands. The levy therefore depends on the spouse: s 8(3) apportions the reduction ' +
        'only where the spouse would themselves be liable to levy. ' +
        'Pass `spouse`, or `spouse: null` where there is no spouse and the Person is on the ' +
        'family path through dependants alone.',
    );
    this.name = 'FamilySpouseNotSuppliedError';
  }
}

/** The other Person, as s 8(3) needs them: their own taxable income and their own T8 switch. */
export interface MedicareLevySpouse {
  /** s 8(3)(c), s 8(5)(a) — the spouse's own taxable income. Never Rebate Income (T9). */
  readonly taxableIncome: TaxableIncome;
  /**
   * T8 again, and for the same reason: s 3(1)'s `threshold amount` and s 8(7)'s family threshold
   * are both keyed to SAPTO entitlement **per Person**, so the s 8(3)(c) gate reads the spouse's
   * own switch. This is the SAPTO the spouse receives, and there is no eligibility field here
   * either.
   */
  readonly saptoReceived: Cents;
}

interface MedicareLevyPerson {
  readonly fy: FinancialYear;
  /** s 7 — the Person's own taxable income. Not Rebate Income (T9). */
  readonly taxableIncome: TaxableIncome;
  /**
   * T8. The SAPTO the Person **actually receives**, from `seniorsAndPensionersOffset`. There is
   * deliberately no eligibility field on this interface: the half-combined gate can make a Person
   * eligible while their own Rebate Income reduces the offset to nil, and such a Person takes the
   * ordinary thresholds. Keying the switch off eligibility is not a wrong line of code here — it
   * is a line that cannot be written, because eligibility never crosses this boundary.
   */
  readonly saptoReceived: Cents;
  readonly dependentChildren?: number;
}

/**
 * Either a Person assessed alone under s 7, or a Person on the family path — and on the family
 * path `spouse` is **required**, because s 8(3) cannot be evaluated without it. That is the
 * union's whole job: `{ familyIncome }` without `spouse` does not type-check, so a family levy
 * computed in ignorance of the spouse is not a bad line of code here, it is a line that cannot
 * be written.
 */
export type MedicareLevyInput =
  | (MedicareLevyPerson & { readonly familyIncome?: undefined; readonly spouse?: undefined })
  | (MedicareLevyPerson & {
      /** s 8(5) — the sum of both Persons' taxable incomes, or the Person's own where none. */
      readonly familyIncome: FamilyIncome;
      /** `null` where the Person had no spouse on the last day of the year: s 8(3)(b) then fails. */
      readonly spouse: MedicareLevySpouse | null;
    });

export interface MedicareLevyResult {
  readonly levy: Cents;
  /** s 3(1) / s 8(7): true iff `saptoReceived > 0`, never iff the Person was merely eligible (T8). */
  readonly seniorsThresholds: boolean;
  readonly basis: 's 7 — the Person alone' | 's 8 — family income';
  readonly incomeTested: Cents;
  readonly lowerThreshold: Cents;
  readonly upperThreshold: Cents;
  readonly band: 'below the lower threshold' | 'shade-in' | 'full levy';
  /**
   * s 7(2)'s ceiling on this Person's levy — 10% of their own taxable income's excess over their
   * own s 3(1) threshold amount. Present whenever their own income sits in their own shade-in
   * range and a levy is charged, **including on the family path**, where `band` describes the
   * family test and this is the only thing that explains the amount. Absent otherwise.
   */
  readonly sevenTwoCeiling?: Cents;
  /** Present iff s 8(2) left a reduction to grant — i.e. iff `band` is `shade-in`. */
  readonly familyShadeIn?: FamilyShadeIn;
  readonly provenance: TaxProvenance;
}

/** The s 8(2)–(4) working, reported because a levy below the s 7 figure is otherwise unexplained. */
export interface FamilyShadeIn {
  /** s 8(2) — `0.02 × FIT − 0.08 × (FI − FIT)`, before any apportionment. Positive by construction. */
  readonly raw: Cents;
  /** s 8(3) — true iff the spouse would themselves be liable to levy, which is what engages it. */
  readonly apportioned: boolean;
  /** What this Person keeps of `raw`: `raw − raw × TI(spouse)/FI` where apportioned, else all of it. */
  readonly reduction: Cents;
  /** s 8(4) — the part of `reduction` that exceeded this Person's own levy, and passes to the spouse. */
  readonly excessToSpouse: Cents;
  /** s 8(4) from the other side. Only `householdMedicareLevy` can set this; `medicareLevy` sees one Person. */
  readonly excessFromSpouse: Cents;
}

const uplift = (base: Cents, perChild: Cents, children: number): Cents =>
  children === 0 ? base : addCents(base, mulCents(perChild, children));

/**
 * The levy, with the s 7(1) nil test, the s 7(2) shade-in — which applies to a Person with a
 * spouse exactly as it does to one assessed alone — and the whole of s 8: the s 8(1) nil band,
 * the s 8(2) reduction, the s 8(3) apportionment and s 8(4)'s excess.
 *
 * **s 8(2) reduces a levy; it is not a levy on family income.** The base being reduced is this
 * Person's own levy on their own taxable income, after s 7. Family income enters only through the
 * reduction, which is one household figure — `0.02 × FIT − 0.08 × (FI − FIT)`, floored at nil —
 * and which s 8(3) then splits pro-rata by taxable income, *but only if the spouse would
 * themselves be liable to levy*. Where the spouse is not liable this Person keeps all of it. That
 * gate is the whole difference between the ATO's own worked example ($92.90) and apportioning
 * unconditionally ($229.76), and for a seniors couple it never opens inside the band.
 *
 * `medicareLevy` returns everything but s 8(4), which needs both spouses — see
 * `householdMedicareLevy`.
 *
 * s 7 has no married-person carve-out and runs before s 8. s 7(2) reads: "Where the taxable
 * income of a person exceeds the threshold amount but does not exceed the phase-in limit, the
 * amount of levy payable by the person upon that taxable income **but for sections 8 and 9**
 * shall not exceed 10% of the amount of the excess." Three things follow, and each is a bug this
 * function had until 2026-09-04:
 *
 *   * the ceiling is computed **before** any family test, so having a spouse cannot remove it;
 *   * "the threshold amount" is the s 3(1) single/seniors figure — never the s 8(5) family
 *     threshold, which is a different defined term with its own dollar amounts;
 *   * "shall not exceed" is a ceiling, not a substitute: the levy is the **lesser** of the s 7(2)
 *     figure and the 2% levy. The two coincide at the phase-in limit only because every published
 *     upper threshold is `lower × 1.25` truncated (register §2.7).
 *
 * The seniors threshold switch is `saptoReceived > 0` and nothing else — ATO's operative wording
 * is that a Person must be entitled to at least $1 of SAPTO to use the seniors threshold, and
 * that a Person whose SAPTO is reduced to zero is not (T8, register §2.7).
 *
 * All thresholds are FY2025-26 figures carried as a labelled prior-year fallback: the FY2026-27
 * set is legislated retrospectively and does not exist as at 2026-09-03 (T10, register O1, TODO
 * P1-6). The fallback is not hidden — `provenance.caveats` names every row that carries it, so a
 * levy figure computed for FY2026-27 arrives saying which year its thresholds came from.
 */
export const medicareLevy = (input: MedicareLevyInput): MedicareLevyResult => {
  const { fy, taxableIncome: income, familyIncome: family, spouse } = input;
  const children = input.dependentChildren ?? 0;
  const seniors = input.saptoReceived > 0;

  const singleLower = seniors ? THRESHOLDS.seniorsSingleLower : THRESHOLDS.singleLower;
  const singleUpper = seniors ? THRESHOLDS.seniorsSingleUpper : THRESHOLDS.singleUpper;
  const consumed: Record_[] = [
    ['tax.medicareLevy.rate', MEDICARE.rate],
    [seniors ? 'tax.medicareLevy.lowIncomeThresholds.seniorsSingleLower' : 'tax.medicareLevy.lowIncomeThresholds.singleLower', singleLower],
    [seniors ? 'tax.medicareLevy.lowIncomeThresholds.seniorsSingleUpper' : 'tax.medicareLevy.lowIncomeThresholds.singleUpper', singleUpper],
  ];

  const full = (): Cents => mulCents(income, MEDICARE.rate.value);

  // Set by `levyBeforeFamilyReduction` when s 7(2) is in play, and reported so that a family-path
  // levy below 2% is explicable from the result alone.
  let sevenTwoCeiling: Cents | undefined;
  const inSevenTwoRange = (): boolean => income <= singleUpper.value;
  /**
   * s 7 alone: 2% of taxable income, capped by s 7(2) where the Person's own income is between
   * their own threshold amount and their own phase-in limit. s 8 may only reduce this further.
   */
  const levyBeforeFamilyReduction = (): Cents => {
    const twoPercent = full();
    if (!inSevenTwoRange()) return twoPercent;
    consumed.push(['tax.medicareLevy.shadeInRateSingles', MEDICARE.shadeInRateSingles]);
    sevenTwoCeiling = mulCents(subCents(income, singleLower.value), MEDICARE.shadeInRateSingles.value);
    return sevenTwoCeiling < twoPercent ? sevenTwoCeiling : twoPercent;
  };

  const done = (
    levy: Cents,
    basis: MedicareLevyResult['basis'],
    incomeTested: Cents,
    lowerThreshold: Cents,
    upperThreshold: Cents,
    band: MedicareLevyResult['band'],
    familyShadeIn?: FamilyShadeIn,
  ): MedicareLevyResult =>
    Object.freeze({
      levy,
      seniorsThresholds: seniors,
      basis,
      incomeTested,
      lowerThreshold,
      upperThreshold,
      band,
      ...(sevenTwoCeiling === undefined ? {} : { sevenTwoCeiling }),
      ...(familyShadeIn === undefined ? {} : { familyShadeIn: Object.freeze(familyShadeIn) }),
      provenance: provenanceOf(fy, consumed),
    });

  // s 7(1) applies whoever the Person is: no levy where their own taxable income is at or below
  // the threshold amount, whether or not a family test would also reach them.
  if (income <= singleLower.value) {
    return done(toCents(0), 's 7 — the Person alone', income, singleLower.value, singleUpper.value, 'below the lower threshold');
  }

  if (family === undefined) {
    const band = inSevenTwoRange() ? 'shade-in' : 'full levy';
    const levy = levyBeforeFamilyReduction();
    return done(levy, 's 7 — the Person alone', income, singleLower.value, singleUpper.value, band);
  }

  const lowerRecord = seniors ? THRESHOLDS.seniorsFamilyLower : THRESHOLDS.familyLower;
  const upperRecord = seniors ? THRESHOLDS.seniorsFamilyUpper : THRESHOLDS.familyUpper;
  consumed.push(
    [seniors ? 'tax.medicareLevy.lowIncomeThresholds.seniorsFamilyLower' : 'tax.medicareLevy.lowIncomeThresholds.familyLower', lowerRecord],
    [seniors ? 'tax.medicareLevy.lowIncomeThresholds.seniorsFamilyUpper' : 'tax.medicareLevy.lowIncomeThresholds.familyUpper', upperRecord],
  );
  if (children > 0) {
    consumed.push(
      ['tax.medicareLevy.lowIncomeThresholds.familyLowerPerDependentChild', THRESHOLDS.familyLowerPerDependentChild],
      ['tax.medicareLevy.lowIncomeThresholds.familyUpperPerDependentChild', THRESHOLDS.familyUpperPerDependentChild],
    );
  }
  const familyLower = uplift(lowerRecord.value, THRESHOLDS.familyLowerPerDependentChild.value, children);
  const familyUpper = uplift(upperRecord.value, THRESHOLDS.familyUpperPerDependentChild.value, children);

  // s 8(5)(a) defines family income as the sum of the two taxable incomes, and s 8(5)(b) as the
  // Person's own where there is no spouse. A `FamilyIncome` that is neither is a caller error:
  // inside the band it would put s 8(3)'s denominator and s 8(2)'s taper on different households.
  if (spouse !== undefined) {
    const summed = spouse === null ? (income as Cents) : addCents(income, spouse.taxableIncome);
    if (summed !== (family as Cents)) {
      throw new RangeError(
        `family income of ${family} cents is not this Person's ${income} cents plus their ` +
          `spouse's — s 8(5) defines it as exactly that sum, and got ${summed} cents`,
      );
    }
  }

  // s 8(2), read from the formula itself (research §1.2). It decides both bands on this path, so
  // it is read before either: the reduction runs out at family income = 1.25 × the threshold
  // exactly, and every published upper threshold is that figure rounded — three truncated, one
  // rounded up. `raw > 0` is the Act's own test, it is exact in integer cents, and it is why
  // `familyUpper` below is reported and never tested against.
  consumed.push(
    ['tax.medicareLevy.familyShadeInBaseRate', MEDICARE.familyShadeInBaseRate],
    ['tax.medicareLevy.familyShadeInTaper', MEDICARE.familyShadeInTaper],
  );
  const reductionFor = (threshold: Cents): Cents =>
    subCents(
      mulCents(threshold, MEDICARE.familyShadeInBaseRate.value),
      mulCents(subCents(family, threshold), MEDICARE.familyShadeInTaper.value),
    );

  // O30, closed 2026-09-21: where one spouse receives SAPTO and the other does not, the two hold
  // two DIFFERENT family income thresholds against this one family income, and both are correct.
  // There is deliberately no branch here for that couple — `familyLower` is already this Person's
  // own threshold, off their own `saptoReceived`, and every limb below reads it. The couple is
  // mixed nowhere in this function's control flow, which is the point: s 8 never asks.

  if (family <= familyLower) {
    return done(toCents(0), 's 8 — family income', family, familyLower, familyUpper, 'below the lower threshold');
  }

  const raw = reductionFor(familyLower);
  if (raw <= 0) {
    // "the amount (if any)" — a negative reduction is nil, not a negative. s 8 grants nothing and
    // what the Person pays is what s 7 left: 2% of their own taxable income, capped by their own
    // s 7(2) ceiling where it bites.
    const levy = levyBeforeFamilyReduction();
    return done(levy, 's 8 — family income', family, familyLower, familyUpper, 'full levy');
  }

  if (spouse === undefined) throw new FamilySpouseNotSuppliedError(family, familyLower);

  // s 8(3). The gate is (a) a reduction exists, (b) the Person was married on the last day, and
  // (c) "but for this section and section 9, the spouse … would be liable to pay levy upon the
  // taxable income of the spouse". **s 7 is not in that exclusion**, so a spouse at or below
  // their own s 3(1) threshold amount is not liable, the gate does not open, and this Person
  // keeps the whole reduction. For a seniors couple the gate can never open inside the band:
  // both liable needs each above $44,268, i.e. a family income above $88,536, which is past the
  // top of the band. Apportioning unconditionally would halve a real retiree household's benefit.
  const spouseLiable =
    spouse !== null &&
    spouse.taxableIncome > (spouse.saptoReceived > 0 ? THRESHOLDS.seniorsSingleLower : THRESHOLDS.singleLower).value;

  // The statute subtracts the SPOUSE's share and keeps the remainder, which is this Person's own
  // share of combined taxable income. Computing `raw × TI(self)/FI` directly is algebraically the
  // same and can differ by a cent once rounded (research U5); the statutory order is the
  // defensible one, and the two spouses' reductions then still sum to `raw`.
  const reduction =
    spouseLiable && spouse !== null ? subCents(raw, mulCents(raw, spouse.taxableIncome / family)) : raw;

  const base = levyBeforeFamilyReduction();
  const levy = reduction >= base ? toCents(0) : subCents(base, reduction);
  // s 8(4) — the excess passes to the spouse, but only where s 8(3) applied (s 8(4)(a)).
  // `householdMedicareLevy` is what can deliver it; one Person cannot.
  const excessToSpouse = spouseLiable && reduction > base ? subCents(reduction, base) : toCents(0);
  return done(levy, 's 8 — family income', family, familyLower, familyUpper, 'shade-in', {
    raw,
    apportioned: spouseLiable,
    reduction,
    excessToSpouse,
    excessFromSpouse: toCents(0),
  });
};

/**
 * s 8(4): where a Person's s 8(3) reduction exceeds their own levy, "the amount of levy payable by
 * **the spouse** of the person … shall be reduced by the amount of the excess". One Person's levy
 * can therefore only be finished once both have been computed, which is what this exists for.
 *
 * The spillover is mutual, and where both spouses generate an excess at once the statute is
 * circular — it does not say whose excess is applied to what. It is applied here in a single
 * non-recursive pass, from the pre-spillover levies. That is a choice, and it is unobservable:
 * every case in which both excesses arise leaves both levies at nil either way (research U4).
 *
 * s 8(4) can only bite where s 7(2) has already capped a levy below 2%, because otherwise the
 * reduction is provably smaller than the levy: `raw < 0.02 × FIT < 0.02 × FI`, so each Person's
 * apportioned share is below 2% of their own taxable income.
 */
export const householdMedicareLevy = (
  inputs: readonly [MedicareLevyInput] | readonly [MedicareLevyInput, MedicareLevyInput],
): readonly MedicareLevyResult[] => {
  const [first, second] = inputs;
  if (second === undefined) return Object.freeze([medicareLevy(first)]);
  const before = [medicareLevy(first), medicareLevy(second)] as const;
  return Object.freeze([
    withSpouseExcess(before[0], before[1].familyShadeIn?.excessToSpouse ?? toCents(0)),
    withSpouseExcess(before[1], before[0].familyShadeIn?.excessToSpouse ?? toCents(0)),
  ]);
};

const withSpouseExcess = (result: MedicareLevyResult, excess: Cents): MedicareLevyResult => {
  if (excess === 0) return result;
  // An excess exists only where the spouse's s 8(3) applied, which required this Person to be
  // liable to levy — so this Person is in the same band on the same family income and has their
  // own `familyShadeIn`. The assertion is here because s 8(4) is otherwise silent about the case.
  if (result.familyShadeIn === undefined) {
    throw new RangeError(`s 8(4) excess of ${excess} cents for a Person with no s 8 reduction of their own`);
  }
  return Object.freeze({
    ...result,
    levy: result.levy > excess ? subCents(result.levy, excess) : toCents(0),
    familyShadeIn: Object.freeze({ ...result.familyShadeIn, excessFromSpouse: excess }),
  });
};

// --- The Household's income tax, end to end -----------------------------------------------------

export interface TaxPersonResult {
  readonly name: string;
  readonly taxableIncome: TaxableIncome;
  readonly rebateIncome: RebateIncome;
  readonly taxOnTaxableIncome: BasicIncomeTaxLiability;
  readonly lito: Cents;
  readonly sapto: Cents;
  /**
   * s 61-160 — the offset the Person is **entitled** to, before the s 63-10(1) item 3 cap. $0 in
   * every year before FY2027-28, where it is a fact and not an estimate.
   */
  readonly watoComputed: Cents;
  /**
   * What the item 3 cap actually let them keep. **Reported separately from `watoComputed` because
   * the difference is the whole measure of the trap**: WATO is capped against actual basic income
   * tax liability on actual taxable income, which is a different number from limb (b), and the
   * excess is lost — no refund, no transfer, no carry-forward. Net labour income of $50,000 with an
   * actual taxable income of $3,000 gives `watoComputed` $250 and `watoApplied` nil, and a result
   * that reported one number could not say so.
   */
  readonly watoApplied: Cents;
  /**
   * **P3-19 — s 290-230's raw entitlement**, before the item 20 usability cap this Person shares
   * with `lito`. Nil where this Person made no `spouseContributionMade` this year — the offset is
   * on the CONTRIBUTOR's own tax, tested against the OTHER Person's income.
   */
  readonly spouseContributionOffsetComputed: Cents;
  /**
   * **Div 119's minimum tax gap amount** (s 119-10). It is added to `taxOnTaxableIncome` to give the
   * basic income tax liability (s 4-25), and every offset is applied against that sum. Nil for a
   * Person with no minimum tax capital gain or who received the age pension in the year.
   */
  readonly minimumTaxGap: Cents;
  /** All four offsets are non-refundable, so together they can never exceed the tax they reduce. */
  readonly offsetsApplied: Cents;
  readonly taxAfterOffsets: Cents;
  /** Offsets do not reduce the levy — it is added after them, not before. */
  readonly medicareLevy: MedicareLevyResult;
  readonly netTax: Cents;
}

export interface HouseholdTaxResult {
  readonly fy: FinancialYear;
  readonly relationship: Relationship;
  readonly persons: readonly TaxPersonResult[];
  readonly sapto: SaptoResult;
  readonly provenance: TaxProvenance;
}

/**
 * Income tax for the Household for a financial year: tax on taxable income, less LITO and SAPTO,
 * plus the Medicare levy.
 *
 * SAPTO is computed first for the whole Household — it has to be, because the couple gate needs
 * both Rebate Incomes and because the levy's seniors threshold switch consumes the resulting
 * offset (T8). Family income for the levy is built from both Persons' **taxable** incomes by
 * `familyIncome`, which accepts nothing else.
 *
 * All four offsets are non-refundable (register §2.2, §2.3, §2.8.1, §2.9), so together they can
 * never exceed the tax they reduce and never turn into a refund; none of the four touches the
 * Medicare levy. Their relative order cannot change the net figure while every excess is lost **and
 * no excess is transferable** — s 63-10(1)'s order is followed anyway, because it is imperative and
 * because it decides the per-offset attribution the result reports.
 *
 * That qualification is not idle. Order-neutrality holds here because the excess of every offset in
 * the residual is simply lost at the point it is applied — LITO's and the spouse contribution
 * offset's under s 63-10(1) item 20 (P3-19: no item of the fetched table names Subdiv 290-D, so it
 * lands in the residual beside LITO — `S63_10_TABLE`), and SAPTO's own excess having already been
 * dealt with by the transfer, which is computed before this. Adding a fourth offset does not
 * automatically inherit that neutrality — it holds here only because the spouse contribution offset
 * is the SAME shape as LITO's: lost if unused, never transferred, never carried forward. WATO is s
 * 63-10(1) item 3 and applies ahead of SAPTO at item 5, and s 63-10(1) is imperative as to that
 * order.
 *
 * What the order does **not** change is the size of the SAPTO transfer. O73 (closed 2026-09-15)
 * corrected the earlier claim that it does: item 5 defers the amount to the regulations, and reg
 * s 12 computes it from the base rebate amount and the transferor's taxable income rather than
 * from the s 63-10 residual, so it is order-blind. **The third offset was added here at P3-39**:
 * WATO goes first against `gross`, and LITO, SAPTO and the spouse contribution offset compete for
 * what is left. That sequencing does not change the household's net tax — it changes who is
 * recorded as having used the liability, which is the only thing a non-refundable offset with no
 * carry-forward has to report.
 *
 * **The spouse contribution offset reads the OTHER Person** (P3-19), on the same geometry the
 * Medicare levy's `spouse` argument and SAPTO's transfer already use: each Person's own
 * `spouseContributionMade` is tested against `persons[1 − index].spouseIncomeTest`, never against
 * their own. A single-Person Household has no index 1 to read, so the offset is structurally nil —
 * the same "no spouse, no computation" shape a `relationship: 'single'` gives the SAPTO transfer.
 */
export const householdIncomeTax = (input: {
  readonly fy: FinancialYear;
  readonly relationship: Relationship;
  readonly persons: readonly [SaptoPerson] | readonly [SaptoPerson, SaptoPerson];
  readonly dependentChildren?: number;
}): HouseholdTaxResult => {
  const { fy, relationship, persons } = input;
  const children = input.dependentChildren ?? 0;
  const sapto = seniorsAndPensionersOffset({ fy, relationship, persons });

  const taxableIncomes = persons.map((person) => person.taxableIncome);
  const [first, ...rest] = taxableIncomes;
  if (first === undefined) throw new RangeError('a Household has at least one Person');
  const family =
    relationship === 'single' && children === 0 ? undefined : familyIncome(first, ...rest);

  const offsets = persons.map((_, index) => sapto.persons[index]?.offset ?? toCents(0));

  // Read once, before any arithmetic, so a Household missing a Person's net labour income in a WATO
  // year refuses before it has produced any figure at all — not part-way through the second Person.
  const netLabourIncome = persons.map((person) => netLabourIncomeOf(fy, person));

  // s 8(3)(c) and s 8(4) read the *other* Person, so the levy is built for the Household and not
  // one Person at a time: the spouse's taxable income decides whether the reduction is apportioned
  // at all, and their own SAPTO decides which threshold amount that test uses (T8, per Person).
  const levyInput = (person: SaptoPerson, index: number): MedicareLevyInput => {
    const own = { fy, taxableIncome: person.taxableIncome, saptoReceived: offsets[index] ?? toCents(0), dependentChildren: children };
    if (family === undefined) return own;
    const other = persons.length === 2 ? persons[1 - index] : undefined;
    return {
      ...own,
      familyIncome: family,
      spouse:
        other === undefined
          ? null
          : { taxableIncome: other.taxableIncome, saptoReceived: offsets[1 - index] ?? toCents(0) },
    };
  };
  const [firstInput, secondInput] = persons.map(levyInput);
  if (firstInput === undefined) throw new RangeError('a Household has at least one Person');
  const levies = householdMedicareLevy(secondInput === undefined ? [firstInput] : [firstInput, secondInput]);

  const results = persons.map((person, index): TaxPersonResult => {
    const ordinary = taxOnTaxableIncome(fy, person.taxableIncome);
    // **Div 119 raises the basic income tax liability, before offsets** (s 4-25; s 4-10(3) step 2).
    // So WATO's item 3 cap and the residual below are both measured against the raised figure. The
    // Medicare levy is not: it is levied on taxable income, which Div 119 does not change.
    const facts = person.minimumTax;
    const minimumTaxGap =
      facts === undefined || facts.receivedExemptPayment ? toCents(0) : minimumTaxGapAmount(fy, person.taxableIncome, facts.capitalGain);
    const gross = addCents(ordinary, minimumTaxGap);
    const lito = lowIncomeTaxOffset(person.taxableIncome);
    const offset = offsets[index] ?? toCents(0);

    // s 63-10(1), in the order the table gives: **item 3 (WATO) first**, then item 5 (SAPTO) and
    // item 20 (LITO) against what is left. The AGGREGATE is order-blind while every excess is lost
    // and SAPTO's transfer is computed elsewhere and order-blindly (O73) — but the ATTRIBUTION is
    // not, and the attribution is what the result reports. `gross` is the s 63-10(1) item 3 cap:
    // the Person's ACTUAL basic income tax liability on their ACTUAL taxable income, never limb (b).
    const nli = netLabourIncome[index];
    const watoComputed = nli === undefined ? toCents(0) : workingAustraliansTaxOffset(fy, nli);
    const watoApplied = watoComputed > gross ? gross : watoComputed;
    const afterWato = subCents(gross, watoApplied);
    // **P3-19 — item 20's third occupant, read off the OTHER Person.** `spouseContributionMade` is
    // THIS Person's own contribution; the income it is tested against belongs to whoever received
    // it, which is `persons[1 - index]`. A single-Person Household or a Person who made no
    // `spouseContributionMade` computes nil here, structurally — there is no gate to bypass.
    const contributionMade = person.spouseContributionMade;
    const receivingSpouseIncome = persons[1 - index]?.spouseIncomeTest;
    const spouseContributionOffsetComputed =
      contributionMade === undefined || receivingSpouseIncome === undefined || contributionMade <= 0
        ? toCents(0)
        : spouseContributionOffset(receivingSpouseIncome, contributionMade);
    const residual = addCents(addCents(lito, offset), spouseContributionOffsetComputed);
    const litoSaptoAndSpouseContribution = residual > afterWato ? afterWato : residual;
    const offsetsApplied = addCents(watoApplied, litoSaptoAndSpouseContribution);
    const taxAfterOffsets = subCents(gross, offsetsApplied);
    const levy = levies[index];
    if (levy === undefined) throw new RangeError('every Person has a Medicare levy');
    return Object.freeze({
      name: person.name,
      taxableIncome: person.taxableIncome,
      rebateIncome: person.rebateIncome,
      taxOnTaxableIncome: ordinary,
      lito,
      sapto: offset,
      watoComputed,
      watoApplied,
      spouseContributionOffsetComputed,
      minimumTaxGap,
      offsetsApplied,
      taxAfterOffsets,
      medicareLevy: levy,
      netTax: addCents(taxAfterOffsets, levy.levy),
    });
  });

  // The Household figure is as weak as the weakest thing any Person's figure consumed: the SAPTO
  // rates and the Medicare levy's prior-year fallback thresholds both surface here.
  // `bracketTableFor` and not `taxYear(fy).brackets`: every Person's `taxOnTaxableIncome` above has
  // already applied this table, so a year without one has already thrown and the absence cannot be
  // seen here. It used to be handled anyway — `brackets === undefined ? [] : …` — which read as
  // though a table-less year were a supported result (register §2.1.1, Finding 4).
  const brackets = bracketTableFor(fy);
  const own = provenanceOf(fy, [
    [`tax.years.${fy}.brackets`, brackets],
    ['tax.lito.maximumOffset', LITO.maximumOffset],
    ['tax.lito.eligibilityCeiling', LITO.eligibilityCeiling],
    // Only in a year the offset exists in. Listing it in FY2026-27 would raise a caveat saying a
    // FY2027-28 figure had been applied to FY2026-27, which is the opposite of what happened: it
    // was not applied at all. Limb (b)'s other two inputs are the year's own tax-free threshold and
    // lowest marginal rate, both primary-verified for FY2027-28; the `unverified` rates reach a
    // WATO figure only through `brackets`, already listed, and only through the item 3 cap.
    ...(watoAppliesToYear(fy) ? ([['tax.wato.maximumOffset', WATO.maximumOffset]] as Record_[]) : []),
    // Only where the offset actually computed for someone this year — the same "only in a year it
    // applies" discipline WATO's row above follows, so a Household that never states a
    // `SPOUSE_CONTRIBUTION` carries no caveat about a figure it never touched.
    ...(results.some((r) => r.spouseContributionOffsetComputed > 0)
      ? ([
          ['tax.spouseContributionOffset.base', SPOUSE_OFFSET.base],
          ['tax.spouseContributionOffset.lowerThreshold', SPOUSE_OFFSET.lowerThreshold],
          ['tax.spouseContributionOffset.rate', SPOUSE_OFFSET.rate],
          ['tax.spouseContributionOffset.maximumOffset', SPOUSE_OFFSET.maximumOffset],
        ] as Record_[])
      : []),
    ...(results.some((r) => r.minimumTaxGap > 0) ? ([['tax.cgt.minimumTaxRate', TAX.cgt.minimumTaxRate]] as Record_[]) : []),
  ]);
  return Object.freeze({
    fy,
    relationship,
    persons: Object.freeze(results),
    sapto,
    provenance: mergeProvenance(own, sapto.provenance, ...results.map((r) => r.medicareLevy.provenance)),
  });
};
