// P3-22 — **franking credits received by an INDIVIDUAL, on shares held outside super.** Register
// §5A, and §5A.3, §5A.5 and §5A.6 in particular; traps T43, T44, T46, T48, T49.
//
// `superFranking.ts` (P3-7a/b) is the same chain read for a complying fund. This file is its
// individual-side twin and is deliberately shaped the same way, because P3-22a's governing
// requirement is that franking ships on **both sides or neither**: refunding on one side while
// merely offsetting on the other manufactures a super advantage of up to the whole franking rate
// (T46), and that is the modelling bug the item exists to prevent.
//
// **Not wired into the walk, by decision and not by omission.** `project()` never calls this, the
// same way it never calls `frankingInSuper`. Making a franked distribution move a live forecast
// figure needs a way for the Household to STATE a distribution, which is a new kind of input
// (P3-22h) and an explicitly separate item. Do not read the absence of call sites as unfinished
// work — read the register rows and the tests.
//
// The chain, in the order the statute runs it, and the two places it differs from the fund's:
//
//   s 207-20(1)   the franking credit is *added* to assessable income
//   s 207-20(2)   a tax offset equal to the same amount
//   s 207-90      denies **both** where the distribution is exempt or NANE income
//   s 67-25(1)    Division 207 offsets are subject to the refundable tax offset rules
//   s 63-10(1) item 40   "You can get a refund of the remaining amount"
//
//   * **s 207-110 is not on this chain at all.** Subdiv 207-E rescues the ss 295-385/295-390/295-400
//     exempt current pension income amounts, which only a superannuation fund has. An individual
//     never reaches it, and a reader coming from `superFranking.ts` should not go looking for it.
//   * **The individual has a shelter the fund does not: the $5,000 small shareholder relief**
//     (§5A.5, §5A.6, T49). ITAA 1936 former s 160APHT(1)(a) opens *"the taxpayer is an individual"*,
//     and that word is the whole difference. `superFranking.ts` carries
//     `NO_SMALL_SHAREHOLDER_RELIEF_FOR_SUPER` to record the fund's absence of it; this file carries
//     the relief itself, and applies it.
//
// **How the tax on the distribution is worked out, and why it is exact rather than an estimate.**
// A franking offset runs against the recipient's whole liability for the year, not against the tax
// on this distribution, so "the tax on this distribution" has to be DECOMPOSED. The Household is
// assessed **twice** — once on its stated incomes, once with the grossed-up amount added to the
// recipient's taxable income — and the answer is the difference in the recipient's `netTax`. That
// is the technique `projection.ts`'s `assessCapitalGainCharge` already ships for a capital gain,
// for the same reason: the gain moves brackets, LITO, SAPTO's Rebate Income and the Medicare levy
// all at once, and no marginal rate written down anywhere reproduces the sum of those four.
//
// Decomposing is exact and not an approximation **because the excess is refundable**: nothing is
// floored at nil on the way through, so `tax(other) + tax(distribution) − credit` is the same
// number in any assembly order. That is the same argument `superFranking.ts` makes, and it is why
// a non-complying fund is refused there — but it needs no equivalent refusal here, because
// s 67-25(1) makes an individual's Division 207 offset refundable with **no income test, no age
// test and no dollar cap** (§5A.3). There is no individual for whom it is not.
//
// **`incomeTax.ts` is not touched, and that is load-bearing.** LITO, SAPTO and WATO are
// non-refundable (§2.2, §2.3, §2.8.1) and `householdIncomeTax` can never return a negative
// `netTax`. Franking's refundability is achieved **outside** that function, by subtracting the
// credit from a difference the function itself computed — never by letting its net tax go below
// zero. An implementation that made the offset refundable inside `incomeTax.ts` would make LITO
// refundable too, in every year and for every Household, and no franking fixture would notice.
//
// **What the recipient-only diff does NOT capture, stated because it is real and it is silent.**
// One Person's income moves the OTHER Person's tax: the family Medicare levy reads the couple's
// combined taxable income (s 8(5)), and SAPTO's gate and transfer read combined Rebate Income. So
// a distribution to one Person can raise their spouse's net tax. That spillover is reported here
// as `spilloverToTheOtherPerson` and is deliberately **not** netted into the figure the offset runs
// against: s 207-20(2) gives the offset to the entity the distribution flowed to, against **their**
// liability, and the spouse's extra levy is the spouse's own. A model that swept the spillover into
// the offset base would refund it, which is a cash figure nobody is entitled to.
//
// **No rate lives here (T43, T44).** s 202-60(2) fixes the gross-up rate to the entity making the
// distribution, so a diversified holding spans both legislated rates at once and no portfolio-level
// figure exists in law. This module never derives a credit: it takes a `FrankedDistribution` built
// by `superFranking.ts`'s two constructors — the statement route needs no rate at all, and the
// derived route takes the payer's rate from the caller with the caller's own confidence. Reusing
// that branded type rather than minting a second one is deliberate: two gross-up expressions are
// two things free to drift, and the brand is what stops a credit computed by dividing by 2.3333
// arriving here wearing a confidence it did not earn.
//
// **Declared, not imported (the `superFranking.ts` convention) — with ONE exception.** The §5A
// records this file needs are written out below with their own source, retrieval confidence and
// register section, rather than read from `src/data/assumptions/franking.ts`, and are checked
// against the register by `test/core-individual-franking.test.mjs`. The exception is the $5,000
// ceiling's VALUE (2026-09-30, the rules-in-force panel): it is read from
// `franking.smallShareholder.ceiling`, so the figure the panel shows and the figure this gate
// applies are one record, and a refresh that moves it moves both.
//
// **Not here.** The day the refund becomes cash (P3-22g, register O28) and the 45-day count itself
// (P3-22e).
//
// **P3-22h step 3, 2026-09-22 — `project()` now calls `frankingForIndividual`, and the constructor
// below is the ONE new thing this module gained for it.** The Setting the Household states
// (`investmentPayoutFrankedShare`) is a SHARE of the payout — a fraction of cash, never a rate —
// so `frankedDistributionFromShare` below turns that share and a cash figure into a
// `FrankedDistribution` by REUSING `frankedDistributionFromStatement`'s own addition rather than
// writing a second one: T43's preferred route needs no rate, and a share-of-cash figure needs none
// either. `superFranking.ts`'s OTHER constructor, `frankedDistributionFromRate`, is not reused here
// and must not be: it takes the PAYER's own corporate tax rate, which nothing in this model states
// or may guess (T43 again) — the one figure the Household supplies is the SHARE, and the credit
// below is sized by that share alone, at NO implied rate.
//
// A rate appearing below as a literal is a bug, and so is a dollar figure: the frozen $5,000
// ceiling is read from its assumption record, never written here.
import { addCents, mulCents, subCents, toCents } from './money.js'; // `.js` is correct in a `.ts` file — see tsconfig.json
import type { Cents } from './money.js';
import { householdIncomeTax } from './incomeTax.js';
import type { HouseholdTaxResult, Relationship, SaptoPerson } from './incomeTax.js';
import { rebateIncome, taxableIncome } from './incomeBases.js';
import type { NetLabourIncome, RebateIncomeComponents, TaxableIncome } from './incomeBases.js';
import { mergeProvenance, provenanceOf, withCaveats } from './provenance.js';
import type { ComputedProvenance, Consumed, ProvenanceBearing } from './provenance.js';
import { frankedDistributionFromStatement } from './superFranking.js';
import type { FrankedDistribution } from './superFranking.js';
import type { Confidence, FinancialYear } from '../data/assumptions/types.js';
import { FRANKING } from '../data/assumptions/franking.js'; // `.js` is correct in a `.ts` file — see tsconfig.json

// --- P3-22h step 3 — a distribution stated as a cash figure and a SHARE, not a statement -----------

/**
 * **`frankedAmount` is the WHOLE cash figure, unsplit — never `distribution × frankedShare`.**
 * `investmentPayoutFrankedShare` answers "how much of that already has company tax paid on it", a
 * SHARE of the payout, so the credit — the part of the payout the Household says already carries
 * paid company tax — is `distribution × frankedShare`, and the cash the Household actually holds
 * is the WHOLE distribution regardless of that share (nothing is carved out of it: a distribution
 * of $100 that is 50% "already taxed" is still $100 of cash in the Offset Account's own accounting,
 * with a $50 credit riding alongside it, not $50 of cash and a $50 credit). `grossedUpAmount` —
 * `frankedDistributionFromStatement`'s own addition, reused rather than re-derived — is therefore
 * `distribution + distribution × frankedShare`, and it is THIS figure, not `distribution` alone,
 * that must reach the year's assessment once a share is stated (P3-22h step 3's whole point).
 *
 * At `frankedShare` absent or nil the credit is nil and `grossedUpAmount` is exactly `distribution`
 * — byte-identical to step 2's own, credit-free treatment, which is `project()`'s own proof that
 * this constructor introduces no regression where nothing was stated.
 */
export const frankedDistributionFromShare = (input: {
  readonly fy: FinancialYear;
  readonly distribution: Cents;
  readonly frankedShare: number;
  readonly source: string;
  readonly confidence: Confidence;
}): FrankedDistribution =>
  frankedDistributionFromStatement({
    fy: input.fy,
    frankedAmount: input.distribution,
    frankingCredit: mulCents(input.distribution, input.frankedShare),
    source: input.source,
    confidence: input.confidence,
  });

// --- The §5A records this module applies, declared with their own provenance ----------------------

/**
 * §5A.5 / T48 — ITAA 1936 former s 160APHT(1)(b), imported by ITAA 1997 s 207-145(1)(a) as the text
 * in force at 30 June 2002.
 *
 * **FROZEN, and it must never receive a CPI or AWOTE uplift in any forecast year.** The statute
 * reads *"does not exceed $5000"* with no index factor, no indexation section and no
 * regulation-making power over the amount, and there is no live provision to amend — the section
 * was repealed on 14 September 2006. In FY2036-37 it is still $5,000, and its real-value erosion
 * across the Planning Horizon is a feature of the projection rather than a bug.
 *
 * **The boundary, because the ATO's own page is wrong at it either way.** *"Does not exceed"* means
 * credits of exactly $5,000.00 **qualify**. The shape is all-or-nothing: no taper, no shade-out and
 * no partial claim, so a holder above the ceiling who fails the holding rule claims **nothing** and
 * cannot cap the claim at $5,000.
 */
export const SMALL_SHAREHOLDER_RELIEF: ProvenanceBearing & {
  readonly rule: string;
  readonly ceiling: Cents;
  readonly boundary: string;
  readonly source: string;
  readonly registerSection: string;
} = Object.freeze({
  rule:
    'an individual whose franking credits for the income year do not exceed the ceiling is a ' +
    'qualified person for ALL of that year’s dividends without satisfying the holding period rule',
  // Read from `franking.smallShareholder.ceiling`, the one home of the figure. Aggregation is at
  // TAXPAYER and INCOME-YEAR level across the whole portfolio — not per parcel and not per company —
  // which is why the caller states a year's total rather than this module reading one distribution's credit.
  ceiling: FRANKING.smallShareholder.ceiling.value,
  boundary: 'credits <= the ceiling qualify — the statute says "does not exceed $5000", so exactly $5,000.00 qualifies',
  source: 'ITAA 1936 (former) s 160APHT(1)(b), as in force 30 June 2002, imported by ITAA 1997 s 207-145(1)(a)',
  registerSection: '§5A.5',
  confidence: 'primary-verified',
});

/**
 * §5A.6 / register **O27**, and the mirror of `superFranking.ts`'s
 * `NO_SMALL_SHAREHOLDER_RELIEF_FOR_SUPER` — the same conclusion, read from the side it favours.
 *
 * Carried at its own epistemic status and never at a bare `primary-verified`. The statutory words
 * are primary-verified — former s 160APHT(1)(a) opens *"the taxpayer is an individual"* — but the
 * **asymmetry** (that a complying fund therefore has no equivalent relief at any credit level) is
 * inferred from statutory structure rather than stated in terms. O27 is CLOSED, accepted
 * 2026-09-04 by user ruling, and shipped as a labelled inference.
 *
 * It decides nothing computable here. It is carried as a caveat line because the relief below is
 * only interesting by contrast with the fund, and a reader who meets the relief without meeting the
 * asymmetry is the reader who goes on to apply it on the super side.
 */
export const RELIEF_IS_INDIVIDUALS_ONLY: ProvenanceBearing & {
  readonly rule: string;
  readonly source: string;
  readonly registerSection: string;
} = Object.freeze({
  rule:
    'the $5,000 relief is an INDIVIDUAL’S relief only — a complying superannuation fund, ' +
    'APRA-regulated or SMSF, has no equivalent at any credit level and rests on the 45-day rule alone',
  source: 'ITAA 1936 (former) s 160APHT(1)(a), "the taxpayer is an individual"',
  registerSection: '§5A.6 / O27',
  confidence: 'secondary-only',
});

/**
 * §5A.3 — ITAA 1997 s 67-25(1) with s 63-10(1) item 40. In cash, and there is no individual it
 * fails for: no income test, no age test, no dollar cap.
 *
 * T46 goes with it. Refundability is **equal** on the two sides, so it is not itself a super
 * advantage; the whole franking advantage between the two sides is the rate differential.
 */
export const EXCESS_CREDITS_REFUNDABLE: ProvenanceBearing & {
  readonly rule: string;
  readonly source: string;
  readonly registerSection: string;
} = Object.freeze({
  rule:
    'an individual’s excess franking credits are refunded in cash — no income test, no age test, ' +
    'no dollar cap — and equally on the super side, so refundability is not a super advantage (T46)',
  source: 'ITAA 1997 s 67-25(1) · s 63-10(1) item 40',
  registerSection: '§5A.3',
  confidence: 'primary-verified',
});

const QUALIFICATION_ASSUMED =
  'the individual is stated to be a qualified person for this distribution: register §5A.4’s ' +
  '45-day holding rule is not counted in this model (P3-22e), and the day-level machinery — the ' +
  'primary and secondary windows, LIFO parcel order, the net-delta at-risk test — is not built';

const QUALIFICATION_BY_RELIEF =
  'the individual was NOT stated to be a qualified person, and qualification rests entirely on ' +
  `§5A.5’s small shareholder relief: ${SMALL_SHAREHOLDER_RELIEF.rule}. ` +
  `${RELIEF_IS_INDIVIDUALS_ONLY.rule} — ${RELIEF_IS_INDIVIDUALS_ONLY.source}, which is ` +
  `${RELIEF_IS_INDIVIDUALS_ONLY.confidence} as to the asymmetry (register ` +
  `${RELIEF_IS_INDIVIDUALS_ONLY.registerSection})`;

// --- The facts that decide whether the credit exists at all ---------------------------------------

/**
 * The §5A.3 / §5A.4 / §5A.5 gates, each stated by the caller and **none of them defaulted**, in the
 * shape `superFranking.ts` uses for a fund. `false` on a gate is a fact about the Household's
 * holding, and where it destroys the credit it is refused rather than answered with a nil.
 *
 * There is no `complyingFund` here and there must not be: that gate exists on the fund side because
 * s 67-25(1A) makes a non-complying fund's excess **non-refundable**, which breaks the
 * decomposition. No individual is on that provision.
 */
export interface IndividualFrankingFacts {
  /** §5A.3, ITAA 1936 ss 128B(3)(ga), 128D. A non-resident's franked dividend is NANE income. */
  readonly australianResident: boolean;
  /** §5A.4, Subdiv 207-F. Stated, not counted: the 45-day machinery is P3-22e. */
  readonly qualifiedPerson: boolean;
  /**
   * §5A.5 — the individual's franking credits for the **whole income year**, across the **whole
   * portfolio**. Aggregation is at taxpayer and income-year level, not per parcel and not per
   * company, and indirect distributions are covered ("held or held an interest in"), so this is a
   * figure only the caller has. It is required and undefaulted: defaulting it to this
   * distribution's own credit would let a holder with six $1,000 distributions claim relief a
   * single $6,000 one is denied.
   */
  readonly frankingCreditsForTheIncomeYear: Cents;
  /**
   * §5A.5 / T47, s 160APHT(2). A related payment **defeats reliance on the exemption** — it does
   * not by itself disqualify the holder, it switches the holding-period test to the secondary
   * ±45/±90 window and costs the $5,000 shelter. Since this model does not count days, the only
   * thing left for a related payment to do here is take the relief away, and it does.
   */
  readonly relatedPayment: boolean;
}

/**
 * The Household's holding as P3-22e models it: resident, and **assumed** to satisfy the 45-day
 * holding rule. The assumption is not silent — it reaches `provenance.caveats` on every result.
 *
 * A function and not a frozen constant, because `frankingCreditsForTheIncomeYear` is a figure about
 * the Household and there is no honest default for it (P3-22h will be where it comes from).
 */
export const qualifiedResidentIndividual = (
  frankingCreditsForTheIncomeYear: Cents,
): IndividualFrankingFacts =>
  Object.freeze({
    australianResident: true,
    qualifiedPerson: true,
    frankingCreditsForTheIncomeYear,
    relatedPayment: false,
  });

// --- Refusals -------------------------------------------------------------------------------------

export class NonResidentIndividualDistributionError extends RangeError {
  constructor(fy: FinancialYear) {
    super(
      `the FY${fy} franked distribution is to a non-resident individual, and there is no gross-up ` +
        'and no offset to compute. ITAA 1936 ss 128B(3)(ga) and 128D make it non-assessable ' +
        'non-exempt income and ITAA 1997 s 207-90(1)(c) denies both outright (register §5A.3). ' +
        'There is no s 207-110 exception to reach on this side: Subdiv 207-E rescues the exempt ' +
        'current pension income of a superannuation fund and nothing else, so for an individual ' +
        's 207-90 really is the end of the chain. It is refused rather than answered as a nil ' +
        'credit, because a nil produced here is indistinguishable from a nil produced by a bug, ' +
        'and the residence of the Household is not something this model tracks.',
    );
    this.name = 'NonResidentIndividualDistributionError';
  }
}

export class IndividualNotAQualifiedPersonError extends RangeError {
  constructor(fy: FinancialYear, creditsForTheYear: Cents, relatedPayment: boolean) {
    super(
      `the FY${fy} franking credit cannot be stated for an individual who is not a qualified ` +
        `person. ${SMALL_SHAREHOLDER_RELIEF.rule} (${SMALL_SHAREHOLDER_RELIEF.source}, register ` +
        `${SMALL_SHAREHOLDER_RELIEF.registerSection}), and it does not rescue this holding: ` +
        (relatedPayment
          ? 'a related payment was stated, and s 160APHT(2) defeats reliance on the exemption — ' +
            'the holder is thrown back on the secondary ±45/±90 day window, which this model does ' +
            'not count (T47, P3-22e). Note the direction: a related payment does not disqualify ' +
            'by itself, it switches the test and costs the shelter'
          : `${creditsForTheYear} cents of franking credits for the income year exceeds the ` +
            `${SMALL_SHAREHOLDER_RELIEF.ceiling}-cent ceiling. The relief is ALL-OR-NOTHING: ` +
            'there is no taper and no partial claim, so a holder above the ceiling who fails the ' +
            'holding rule claims nothing at all and cannot cap the claim at the ceiling (T48)') +
        '. This refuses rather than returning a nil credit: the 45-day count itself is P3-22e and ' +
        'is not built, so a zero produced here would be a modelling gap reported as a legal answer.',
    );
    this.name = 'IndividualNotAQualifiedPersonError';
  }
}

export class IndividualFrankingYearMismatchError extends RangeError {
  constructor(fy: FinancialYear, distributionFy: FinancialYear) {
    super(
      `the franked distribution supplied is for FY${distributionFy} and is being assessed against ` +
        `FY${fy}. A franking credit is an offset in the year the distribution is made, and the ` +
        'income tax it is set against is a figure for one year — the two assessments this module ' +
        'differences are both assessments of FY' +
        `${fy}, so a distribution stamped for another year would be grossed up into the wrong ` +
        'brackets, the wrong LITO taper and the wrong Medicare levy thresholds, and would still ' +
        'return a plausible cash figure.',
    );
    this.name = 'IndividualFrankingYearMismatchError';
  }
}

// --- The Household, before and after the distribution ---------------------------------------------

/**
 * The s 6(1) add-backs that make Rebate Income a different number from taxable income — everything
 * in `RebateIncomeComponents` except the taxable income itself.
 *
 * **Why the caller states these rather than a finished `RebateIncome`, and it is structural.** The
 * grossed-up amount raises taxable income, and Rebate Income follows it up because Rebate Income
 * *contains* taxable income — but a franked distribution is none of the add-backs, so they are
 * unchanged. Building both assessments from the add-backs means there is no expression in which the
 * distribution can reach one of them, and no arithmetic on a branded `RebateIncome` anywhere in
 * this file. The same shape is what keeps the distribution out of `netLabourIncome`: WATO's base is
 * a separate field this module copies and never touches, which is P3-22f's last sentence made
 * structural rather than asserted — ITAA 1997 s 61-155(2)'s net labour income is a labour amount,
 * and a franked distribution and its gross-up are not.
 */
export type RebateIncomeAddBacks = Omit<RebateIncomeComponents, 'taxableIncome'>;

/** The common case, written out so callers need not spell out four zeroes. */
export const NO_REBATE_INCOME_ADD_BACKS: RebateIncomeAddBacks = Object.freeze({
  reportableSuperContributions: toCents(0),
  totalNetInvestmentLoss: toCents(0),
  adjustedFringeBenefitsTotal: toCents(0),
  assessableFhssReleasedAmounts: toCents(0),
});

/** A Person of the Household as this module needs them: `SaptoPerson`, with Rebate Income unbuilt. */
export interface IndividualFrankingPerson {
  readonly name: string;
  /** **Before** the distribution. The module adds the gross-up; a caller who adds it too double-counts. */
  readonly taxableIncome: TaxableIncome;
  readonly rebateIncomeAddBacks: RebateIncomeAddBacks;
  /** s 160AAAA(2)(b): "qualified for", not "receiving". A $0 Age Pension entitlement still qualifies. */
  readonly qualifiedForAgePension: boolean;
  readonly inGaolForTheWholeYear?: boolean;
  /** ITAA 1997 s 61-155(2). Required from FY2027-28 by `householdIncomeTax`, and **never** raised here. */
  readonly netLabourIncome?: NetLabourIncome;
}

const asSaptoPerson = (person: IndividualFrankingPerson, raisedBy: Cents): SaptoPerson => {
  const raised = taxableIncome(addCents(person.taxableIncome, raisedBy));
  return {
    name: person.name,
    taxableIncome: raised,
    rebateIncome: rebateIncome({ taxableIncome: raised, ...person.rebateIncomeAddBacks }),
    qualifiedForAgePension: person.qualifiedForAgePension,
    ...(person.inGaolForTheWholeYear === undefined ? {} : { inGaolForTheWholeYear: person.inGaolForTheWholeYear }),
    ...(person.netLabourIncome === undefined ? {} : { netLabourIncome: person.netLabourIncome }),
  };
};

// --- The outcome — s 207-20(2), s 67-25(1), s 63-10(1) item 40 -------------------------------------

export interface FrankingForIndividual {
  readonly fy: FinancialYear;
  /** The name of the Person the distribution flowed to, so a result can be read on its own. */
  readonly recipient: string;
  readonly distribution: FrankedDistribution;
  /** The Household assessed on its stated incomes. */
  readonly taxWithout: HouseholdTaxResult;
  /** The Household assessed with the **grossed-up** amount added to the recipient's taxable income. */
  readonly taxWith: HouseholdTaxResult;
  /**
   * The difference in the **recipient's** net tax. This is what the offset runs against, and it is
   * the sum of the bracket, LITO, SAPTO and Medicare levy effects, which no single marginal rate
   * reproduces.
   */
  readonly additionalTaxOnTheDistribution: Cents;
  /** The difference in the whole Household's net tax. Never less than the line above. */
  readonly additionalHouseholdTax: Cents;
  /**
   * What the distribution did to the OTHER Person's tax, through the family Medicare levy and
   * SAPTO's combined Rebate Income. **Not offset and not refunded** — it is the spouse's own
   * liability, and s 207-20(2) gives the offset to the Person the distribution flowed to.
   */
  readonly spilloverToTheOtherPerson: Cents;
  /** s 207-20(2). Equal to the credit. There is no route here on which it is anything else. */
  readonly offset: Cents;
  /** s 63-10(1) item 40: the offset beyond the liability, **in cash**. Nil where the tax exceeds it. */
  readonly refund: Cents;
  /** What is left to pay after the offset. Nil where the credit covers it. */
  readonly taxPayableAfterOffset: Cents;
  /** `franked amount + refund − tax payable`: the cash the distribution is worth to the individual. */
  readonly netCash: Cents;
  /**
   * Whether qualification rested on §5A.5's relief rather than on the caller's stated fact. Reported
   * because it is the one thing about this result a fund could not reproduce (§5A.6, O27).
   */
  readonly qualifiedBySmallShareholderRelief: boolean;
  /** The chain, in statutory order. Narrative only — no amount hangs off it. */
  readonly chain: readonly string[];
  readonly provenance: ComputedProvenance;
}

const CHAIN: readonly string[] = Object.freeze([
  's 207-20(1): the franking credit is included in assessable income — an addition, not a rate',
  's 207-20(2): a tax offset equal to the franking credit',
  's 207-90: denies the gross-up and the offset on exempt or NANE income — the end of the chain ' +
    'for a non-resident, and s 207-110 is a superannuation provision an individual never reaches',
  'ITAA 1936 (former) s 160APHT: an individual whose credits for the year do not exceed $5,000 is ' +
    'a qualified person without the 45-day rule — the shelter a complying fund does not have (T49)',
  's 67-25(1) with s 63-10(1) item 40: the offset is refundable, and the remainder is paid in cash',
]);

/**
 * **The franking outcome for one franked distribution received by one Person of the Household.**
 *
 * Gross up first, tax the larger figure, then offset — and the order is the whole of P3-22c.
 * Taxing the cash and offsetting the credit is the plausible-looking wrong implementation, and it
 * under-states the tax by the tax on the credit, which for a top-rate holder is most of the credit.
 *
 * The offset is the credit, unconditionally. What changes between one Household and another is the
 * **tax on the grossed-up amount**, and that is decided in exactly one place: `householdIncomeTax`,
 * called twice, differenced once.
 */
export const frankingForIndividual = (input: {
  readonly fy: FinancialYear;
  readonly relationship: Relationship;
  readonly persons:
    | readonly [IndividualFrankingPerson]
    | readonly [IndividualFrankingPerson, IndividualFrankingPerson];
  /** Which Person the distribution flowed to. `0` or `1`, and never defaulted for a couple. */
  readonly recipient: 0 | 1;
  readonly dependentChildren?: number;
  readonly distribution: FrankedDistribution;
  readonly facts: IndividualFrankingFacts;
}): FrankingForIndividual => {
  const { fy, distribution, facts, persons, recipient } = input;
  if (distribution.fy !== fy) throw new IndividualFrankingYearMismatchError(fy, distribution.fy);
  if (persons[recipient] === undefined) {
    throw new RangeError(
      `the distribution is stated to flow to Person ${recipient} of a Household of ${persons.length}`,
    );
  }

  // s 207-90(1)(c) first: a NANE distribution has no gross-up to tax and no offset to claim, so
  // there is nothing for the qualification gate to be about.
  if (!facts.australianResident) throw new NonResidentIndividualDistributionError(fy);

  // §5A.5, and the boundary is `<=`: "does not exceed $5000". All-or-nothing, tested on the YEAR's
  // credits across the whole portfolio, and defeated by a related payment (s 160APHT(2), T47).
  const qualifiedByRelief =
    !facts.qualifiedPerson &&
    !facts.relatedPayment &&
    facts.frankingCreditsForTheIncomeYear <= SMALL_SHAREHOLDER_RELIEF.ceiling;
  if (!facts.qualifiedPerson && !qualifiedByRelief) {
    throw new IndividualNotAQualifiedPersonError(
      fy,
      facts.frankingCreditsForTheIncomeYear,
      facts.relatedPayment,
    );
  }

  // **The two assessments.** The ONLY difference between them is the grossed-up amount on the
  // recipient's taxable income — same year, same relationship, same children, same add-backs, same
  // net labour income. `householdIncomeTax` derives family income from the two taxable incomes and
  // SAPTO from the two Rebate Incomes, so every base the gross-up is supposed to raise (P3-22f)
  // moves without being told to, and the one it must NOT raise cannot be reached from here.
  const assess = (raisedBy: Cents): HouseholdTaxResult => {
    const [a, b] = persons.map((person, index) =>
      asSaptoPerson(person, index === recipient ? raisedBy : toCents(0)),
    );
    if (a === undefined) throw new RangeError('a Household has at least one Person');
    return householdIncomeTax({
      fy,
      relationship: input.relationship,
      persons: b === undefined ? [a] : [a, b],
      ...(input.dependentChildren === undefined ? {} : { dependentChildren: input.dependentChildren }),
    });
  };

  const taxWithout = assess(toCents(0));
  const taxWith = assess(distribution.grossedUpAmount);

  const netTaxOf = (result: HouseholdTaxResult, index: number): Cents =>
    result.persons[index]?.netTax ?? toCents(0);
  const householdNetTaxOf = (result: HouseholdTaxResult): Cents =>
    result.persons.reduce<Cents>((total, person) => addCents(total, person.netTax), toCents(0));

  const additionalTaxOnTheDistribution = subCents(
    netTaxOf(taxWith, recipient),
    netTaxOf(taxWithout, recipient),
  );
  const additionalHouseholdTax = subCents(householdNetTaxOf(taxWith), householdNetTaxOf(taxWithout));

  // s 207-20(2), and there is no exemption branch for it to be nil on: an individual's franked
  // distribution is assessable income, full stop.
  const offset = distribution.frankingCredit;

  // **Both directions are computed, and neither is floored away.** Clamping the refund at nil —
  // keeping only `max(0, tax − offset)` — is the T46 mutation, and on the low-income retiree this
  // projection is mostly about it deletes the entire benefit: that Household's tax on the
  // grossed-up amount is routinely less than the credit, which is exactly when a refund exists.
  // Exactly one of these two is non-nil.
  const refund =
    offset > additionalTaxOnTheDistribution ? subCents(offset, additionalTaxOnTheDistribution) : toCents(0);
  const taxPayableAfterOffset =
    additionalTaxOnTheDistribution > offset ? subCents(additionalTaxOnTheDistribution, offset) : toCents(0);

  return Object.freeze({
    fy,
    recipient: persons[recipient].name,
    distribution,
    taxWithout,
    taxWith,
    additionalTaxOnTheDistribution,
    additionalHouseholdTax,
    spilloverToTheOtherPerson: subCents(additionalHouseholdTax, additionalTaxOnTheDistribution),
    offset,
    refund,
    taxPayableAfterOffset,
    netCash: subCents(addCents(distribution.frankedAmount, refund), taxPayableAfterOffset),
    qualifiedBySmallShareholderRelief: qualifiedByRelief,
    chain: CHAIN,
    // Both assessments' provenance is merged in whole rather than summarised: a Medicare levy
    // threshold carried as a prior-year fallback weakens this figure exactly as much as it weakens
    // the tax figures it is differenced from, and the distribution's own confidence rides with it —
    // a credit derived from a forecast corporate rate produces a forecast refund.
    provenance: withCaveats(
      mergeProvenance(
        taxWithout.provenance,
        taxWith.provenance,
        distribution.provenance,
        provenanceOf(fy, [
          [`register ${EXCESS_CREDITS_REFUNDABLE.registerSection} — ${EXCESS_CREDITS_REFUNDABLE.source}`, EXCESS_CREDITS_REFUNDABLE],
        ] as readonly Consumed[]),
      ),
      qualifiedByRelief ? QUALIFICATION_BY_RELIEF : QUALIFICATION_ASSUMED,
    ),
  });
};
