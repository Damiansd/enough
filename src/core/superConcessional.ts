// P3-3b — what actually goes into the fund and what happens to it: salary sacrifice and personal
// deductible contributions as *contributions*, the 15% contributions tax, and applying the total
// against the concessional cap and the carry-forward headroom. Register §3.1 (the contributions
// tax rate) and §3.4 (carry-forward, ITAA 1997 s 291-20(3)–(7)).
//
// A sibling of `superContributions.ts` rather than an extension of it, for one reason: that module
// is the T17 module. Its whole shape exists to stop a sacrificed amount being subtracted from the
// Superannuation Guarantee base, and this is precisely the segment where introducing sacrifice as
// a contribution invites someone to "fix" the base by netting it off. Keeping the two apart means
// the sacrificed amount reaches the SG base and the contribution total by two separate paths that
// never meet, and neither one can quietly become the other's residual.
//
// Four things here are shape rather than arithmetic.
//
//   * **The sacrificed amount is counted twice on purpose, and that is not double counting.** It
//     is part of the qualifying earnings the employer computes 12% of (SGAA ss 10A(1)(h),
//     10A(4)(b), T17) *and* it is itself a concessional contribution. A Person sacrificing $20,000
//     out of a $170,000 package receives $20,400 of SG **and** puts $20,000 in — $40,400 of
//     concessional contributions, not $20,400 of which $20,000 is already counted.
//
//   * **The general cap is consumed before any carry-forward amount.** s 291-20(4) makes the
//     carry-forward an *increase* to the cap, not a separate pool: contributions within the
//     general cap never touch the five-year window, and only the amount above it draws on the
//     window, earliest year first (s 291-20(7)). Consuming the window first would leave the
//     general cap unspent — which then generates a fresh unused amount for this year — while
//     burning window years that expire. Same total, different future. See the note on ordering
//     at `applyConcessional`: the register states the earliest-year-first half of this in §3.4 and
//     leaves the other half to s 291-20(4).
//
//   * **The 15% is the fund's tax on *assessable* contributions, and nothing else can reach it.**
//     `contributionsTax` takes `ConcessionalContributions` and nothing widens into that type
//     except the one constructor below, so there is no expression that applies the rate to a
//     non-concessional contribution. Non-concessional amounts are paid from money that has already
//     been taxed; the fund does not tax them again, and `applyNonConcessional` in `superCaps.ts`
//     has no contributions tax and takes a brand this module's figures cannot satisfy.
//
//   * **Division 293 is a seam ~~, left open~~ — open in THIS MODULE, and CHARGED BY THE WALK from
//     2026-09-20 (P6-9).** The fund's 15% is not the whole tax on a concessional contribution for a
//     Person over $250,000 — Div 293 imposes a second 15% — and register §3.6 names its income base
//     ("income for surcharge purposes") without ever decomposing that term. Every result here
//     therefore says it is the fund's 15% only rather than implying a total. Inventing the s 995-1
//     component list to close the gap would be the failure this project is organised against.
//     **What changed, and what did not:** `projection.ts` now builds the base out of the two
//     figures the walk already derives and emits its own `Division 293 tax` line, so the MODEL no
//     longer under-taxes a high earner; this module still sees no income and still reports the
//     fund's 15% alone, which is why the caveat below stays on every result. "Left open" is struck
//     rather than deleted because it was the ground this module's caveat was written on.
//
// A dollar amount or a rate appearing below as a literal is a bug.
import { addCents, mulCents, subCents, toCents } from './money.js'; // `.js` is correct in a `.ts` file — see tsconfig.json
import type { Cents } from './money.js';
import { mergeProvenance, provenanceOf, withCaveats } from './provenance.js';
import type { ComputedProvenance, Consumed } from './provenance.js';
import { concessionalContributionsCap } from './superCaps.js';
import type { CapResult, CarryForwardHeadroom, ConcessionalCap, IndexNumbers } from './superCaps.js';
import { SUPERANNUATION } from '../data/assumptions/super.js';
import type { FinancialYear } from '../data/assumptions/types.js';

const FUND_TAX = SUPERANNUATION.fundTax;
const CARRY_FORWARD = SUPERANNUATION.carryForward;
const CAP_INDEXATION = SUPERANNUATION.capIndexation;

/**
 * The register carries the caps, the rate and the carry-forward machinery, and nowhere states
 * *what a concessional contribution is* — ITAA 1997 s 291-25 and Subdiv 290-C are not in §3. The
 * three limbs below are named from the statute and the brief; the fourth is the unenumerated
 * remainder, named and required rather than defaulted — the same discipline
 * `incomeBases.surchargeIncome` applies to each of its seven sourced limbs (P3-2, P3-5), rather
 * than inventing a component list. `surchargeIncome` no longer has a remainder of its own:
 * s 995-1(1) was sourced limb by limb, and s 291-25 has had no equivalent pass.
 */
const COMPOSITION_CAVEAT =
  'the register does not enumerate what a concessional contribution is — ITAA 1997 s 291-25 and ' +
  'Subdiv 290-C are not in §3. Employer, salary-sacrificed and personal deductible amounts are ' +
  'named limbs here and `otherConcessional` is an unenumerated remainder. Source s 291-25 before ' +
  'forecasting a Person with reportable employer contributions beyond the Superannuation Guarantee';

/**
 * The seam. Not a weakness in any figure consumed — a limit on what this number *is*, which is
 * why it goes through `withCaveats` rather than through a record.
 *
 * P3-5 closed the half of this that said Division 293 was not computed anywhere and that the
 * register never decomposed the income base: `division293Tax` computes it, on the seven-limb
 * s 995-1(1) decomposition now in register §3.6. What survives is the limit on *this* figure — the
 * fund's 15% is not the whole tax on a high-income Person's contributions, and this module does
 * not know their income. The wording also stated the threshold test the wrong way round (P3-5 D4):
 * the contributions are on the **same** side of the comparison as the income, not the other.
 *
 * This string is merged into the provenance a caller sees, so it is read by the Person, not only
 * by whoever maintains the module. It says what the number excludes, in words, without a figure of
 * its own.
 */
const DIVISION_293_CAVEAT =
  'this is the fund low tax component rate only (§3.1). Division 293 imposes a further 15%, and ' +
  'the test for it is on the SUM of a Person\'s Div 293 income and their low tax contributions — ' +
  'the contributions sit on the same side of that comparison as the income, so $235,000 of income ' +
  'with $20,000 of contributions is over the $250,000 threshold on $255,000. The charge is a ' +
  'taper: the lesser of the low tax contributions and the excess (s 293-20(1), §3.6). It is ' +
  'computed by `division293Tax`, which needs an income this module never sees, so a high-income ' +
  'Person pays more than the figure reported here';

/**
 * Div 291's excess concessional treatment — the excess is included in the Person's assessable
 * income with a 15% tax offset, and an excess concessional contributions charge applies — is not
 * in the register. The excess is reported and deliberately not priced, exactly as
 * `applyNonConcessional` reports a non-concessional excess without pricing Div 292.
 */
const EXCESS_CAVEAT =
  'an excess concessional contribution is reported and not priced. ITAA 1997 Div 291 includes the ' +
  'excess in the Person\'s assessable income with a 15% offset and adds an excess concessional ' +
  'contributions charge; none of that is in the register, so none of it is computed';

// --- Personal deductible contributions — ITAA 1997 s 290-150 ------------------------------------

declare const PERSONAL_DEDUCTIBLE: unique symbol;

/** A personal contribution the Person is entitled to deduct (s 290-150), and therefore concessional. */
export type PersonalDeductibleContributions = Cents & { readonly [PERSONAL_DEDUCTIBLE]: true };

export class NoticeOfIntentError extends RangeError {
  constructor(amount: Cents) {
    super(
      `${amount} cents of personal contributions cannot be treated as deductible: ITAA 1997 ` +
        's 290-150 allows the deduction only where the conditions in Subdiv 290-C are met, and ' +
        's 290-170 requires a notice of intent given to the fund and **acknowledged** by it. ' +
        'Without the acknowledgement the amount is not concessional at all — it is a ' +
        'non-concessional contribution and counts against that cap instead. The difference is a ' +
        'deduction the Person is not entitled to on one side and an excess non-concessional ' +
        'determination on the other, so this refuses rather than assuming the notice was given.',
    );
    this.name = 'NoticeOfIntentError';
  }
}

/**
 * s 290-150 with s 290-170. The acknowledgement is a fact about the Person's year, not a figure,
 * and it is required rather than defaulted: a personal contribution *without* an acknowledged
 * notice is a perfectly ordinary non-concessional contribution, so defaulting the flag to `true`
 * would silently reclassify it and hand the Person a deduction.
 *
 * The register carries nothing on Subdiv 290-C at all (§3 stops at the caps and the rate), which
 * is recorded as a gap rather than filled in: only the two conditions named in the statute the
 * brief cites are enforced, and the s 290-165 age condition and the s 290-155 complying-fund
 * condition are not — see TODO P3-3b.
 */
export const personalDeductibleContributions = (
  amount: Cents,
  evidence: { readonly noticeOfIntentAcknowledged: boolean },
): PersonalDeductibleContributions => {
  if (amount < 0) throw new RangeError(`personal contributions cannot be negative: ${amount} cents`);
  if (amount > 0 && !evidence.noticeOfIntentAcknowledged) throw new NoticeOfIntentError(amount);
  return amount as PersonalDeductibleContributions;
};

// --- Concessional contributions — built up, never handed over -----------------------------------

declare const CONCESSIONAL_CONTRIBUTIONS: unique symbol;

/** ITAA 1997 s 291-25. Contributions assessable to the fund, counted against the concessional cap. */
export type ConcessionalContributions = Cents & { readonly [CONCESSIONAL_CONTRIBUTIONS]: true };

/**
 * The same construction `qualifyingEarnings` uses, for the same reason: every limb is named, every
 * limb is required, and every limb is **added**. There is no `concessionalContributionsFrom(cents)`
 * shortcut, so an amount can only become concessional by being filed under the limb it belongs to.
 */
export interface ConcessionalContributionComponents {
  /**
   * Employer contributions: the Superannuation Guarantee — `superGuarantee(...).amount` from
   * `superContributions.ts` — plus any additional employer amount. **Not** the sacrificed amount,
   * which has its own limb below.
   */
  readonly employerContributions: Cents;
  /**
   * Amounts sacrificed under an effective salary sacrifice arrangement. These are employer
   * contributions and they are concessional.
   *
   * The same amount is *also* part of the SG earnings base (SGAA ss 10A(1)(h), 10A(4)(b), T17), and
   * that is not double counting: the employer computes 12% of a base that includes it, and the
   * sacrificed dollars go in on top. Netting the sacrifice off either side is the T17 mistake — it
   * cannot be made there, because `QualifyingEarnings` has no subtracting constructor, and it
   * cannot be made here, because this limb is separate from `employerContributions`.
   */
  readonly salarySacrificed: Cents;
  /**
   * s 290-150 personal contributions the Person has claimed a deduction for. Branded, so an
   * undeducted personal contribution — which is non-concessional — cannot be filed here.
   */
  readonly personalDeductible: PersonalDeductibleContributions;
  /**
   * The rest of s 291-25 the register does not enumerate. One named input, nil by choice rather
   * than by omission, so it is visible in every call rather than invisible in none.
   */
  readonly otherConcessional: Cents;
}

/** The one constructor. Every component is added; nothing here subtracts. */
export const concessionalContributions = (
  components: ConcessionalContributionComponents,
): ConcessionalContributions => {
  for (const [name, amount] of Object.entries(components)) {
    if (amount < 0) throw new RangeError(`concessional contribution component ${name} cannot be negative: ${amount} cents`);
  }
  return addCents(
    addCents(components.employerContributions, components.salarySacrificed),
    addCents(components.personalDeductible, components.otherConcessional),
  ) as ConcessionalContributions;
};

// --- The 15% contributions tax (§3.1) -----------------------------------------------------------

export interface ContributionsTax {
  readonly fy: FinancialYear;
  /** Income Tax Rates Act 1986 s 26(1)(a) — the fund low tax component rate. 0.15, never a marginal rate. */
  readonly rate: number;
  /** What was taxed. Concessional by type: nothing else can be passed. */
  readonly assessableContributions: ConcessionalContributions;
  readonly amount: Cents;
  /** What lands in the fund. */
  readonly netOfTax: Cents;
  readonly provenance: ComputedProvenance;
}

/**
 * Income Tax Rates Act 1986 s 26(1)(a), through `fundTax.contributionsTax` — 15% of the
 * concessional contributions, paid by the fund.
 *
 * The parameter type is the defence. The register's own mutation list carries "wire the 15%
 * contributions tax to the marginal rate", and the neighbouring mistake is to apply it to
 * everything that went in; neither a marginal rate nor a non-concessional amount can be expressed
 * here, because the rate is read from the record and the base is a brand.
 *
 * The excess, if any, is taxed too: the fund's 15% falls on assessable contributions whether or not
 * they fit the Person's cap. What the excess additionally attracts on the *Person's* side is Div
 * 291 and is not priced — see `EXCESS_CAVEAT`.
 */
export const contributionsTax = (
  fy: FinancialYear,
  contributions: ConcessionalContributions,
): ContributionsTax => {
  const rate = FUND_TAX.contributionsTax;
  const amount = mulCents(contributions, rate.value);
  return Object.freeze({
    fy,
    rate: rate.value,
    assessableContributions: contributions,
    amount,
    netOfTax: subCents(contributions, amount),
    provenance: withCaveats(
      // Div 293's own record is deliberately *not* consumed here. Provenance is a list of what
      // this number was computed from, and a record listed but never applied would read as though
      // the second 15% had been considered. The caveat says it has not.
      provenanceOf(fy, [['superannuation.fundTax.contributionsTax', rate]] as readonly Consumed[]),
      DIVISION_293_CAVEAT,
    ),
  });
};

// --- Applying the contributions against the cap -------------------------------------------------

export interface CarryForwardApplication {
  /** The year the unused amount arose in. */
  readonly fy: FinancialYear;
  readonly available: Cents;
  readonly applied: Cents;
  readonly remainingAfter: Cents;
  /** The last year this unused amount could have been used in — five years after it arose. */
  readonly lastYearUsable: FinancialYear;
}

export interface ConcessionalAssessment {
  readonly fy: FinancialYear;
  readonly contributions: ConcessionalContributions;
  /** s 291-20(2), before any carry-forward increase. */
  readonly generalCap: Cents;
  /** Filled first. Never more than the general cap. */
  readonly appliedToGeneralCap: Cents;
  /**
   * What this year's own unused general cap will offer the next five years — nil once the general
   * cap is full. It is only ever non-nil where the carry-forward window was *not* touched, which
   * is the arithmetic statement of "general cap first".
   */
  readonly unusedGeneralCapGenerated: Cents;
  /** s 291-20(3): nil where the Person's Total Super Balance failed the < $500,000 test. */
  readonly carryForwardAvailable: Cents;
  /** One line per window year, earliest first — the order they are consumed in (s 291-20(7)). */
  readonly carryForward: readonly CarryForwardApplication[];
  readonly carryForwardApplied: Cents;
  /** The general cap plus whatever carry-forward was actually available. */
  readonly totalCap: Cents;
  /** Above the total cap. Reported, not priced (Div 291 is not in the register). */
  readonly excess: Cents;
  readonly contributionsTax: ContributionsTax;
  readonly provenance: ComputedProvenance;
}

/**
 * ITAA 1997 s 291-20. The year's concessional contributions against the year's cap.
 *
 * **Ordering.** The general cap is consumed first and the five-year window only takes what is left
 * over, earliest year first. §3.4 states the second half of that ("application order: earliest year
 * first") and not the first, which comes from the structure of the section it cites: s 291-20(4)
 * *increases* the cap by the unused amount rather than creating a second pool, so an amount inside
 * the general cap has nothing to draw from. `carryForwardHeadroom` already prices an over-cap year
 * inside the window this way — it spends earlier unused amounts only with the part above that
 * year's own general cap — so the alternative reading would make the two halves disagree about the
 * same history. Recorded in TODO P3-3b as a register wording gap, not a modelling choice.
 *
 * The headroom is consumed, never recomputed: the window, its per-year remainders and the
 * eligibility test all arrive from `carryForwardHeadroom`, and this function has no access to a
 * contribution history it could re-derive them from.
 */
export const applyConcessional = (input: {
  readonly fy: FinancialYear;
  readonly contributions: ConcessionalContributions;
  readonly headroom: CarryForwardHeadroom;
}): ConcessionalAssessment => {
  const { fy, contributions, headroom } = input;
  if (headroom.fy !== fy) {
    throw new RangeError(
      `the carry-forward headroom supplied is for FY${headroom.fy}, not FY${fy}. The window, the ` +
        'general cap and the Total Super Balance test are all per year, and last year\'s headroom ' +
        'applied to this year is a larger number than the Person has.',
    );
  }
  if (contributions < 0) throw new RangeError('concessional contributions cannot be negative');

  const appliedToGeneralCap = (contributions < headroom.generalCap ? contributions : headroom.generalCap) as Cents;
  let outstanding = subCents(contributions, appliedToGeneralCap);

  // Only the part above the general cap reaches the window, and it takes the earliest year first
  // (s 291-20(7), `carryForward.applicationOrder`). Where the Person failed the < $500,000 Total
  // Super Balance test, `carryForwardHeadroom` has already zeroed `unusedAvailable`; the window is
  // still reported, because "you have $55,000 of unused cap and cannot use it this year" is the
  // thing a Person needs to see, but nothing is drawn from it.
  const applications: CarryForwardApplication[] = [];
  for (const year of headroom.window) {
    const available = headroom.eligible ? year.remaining : toCents(0);
    const applied = (available < outstanding ? available : outstanding) as Cents;
    outstanding = subCents(outstanding, applied);
    applications.push(
      Object.freeze({
        fy: year.fy,
        available,
        applied,
        remainingAfter: subCents(available, applied),
        lastYearUsable: year.lastYearUsable,
      }),
    );
  }
  const carryForwardApplied = applications.reduce<Cents>((sum, each) => addCents(sum, each.applied), toCents(0));

  const tax = contributionsTax(fy, contributions);

  return Object.freeze({
    fy,
    contributions,
    generalCap: headroom.generalCap,
    appliedToGeneralCap,
    unusedGeneralCapGenerated: subCents(headroom.generalCap, appliedToGeneralCap),
    carryForwardAvailable: headroom.unusedAvailable,
    carryForward: Object.freeze(applications),
    carryForwardApplied,
    totalCap: headroom.headroom,
    excess: outstanding,
    contributionsTax: tax,
    // Merged, never rebuilt from a confidence: the headroom carries the Total Super Balance
    // definition, the cap's own index number and, in a forecast year, the caveat saying that
    // number is a Setting. Rebuilding the string here would keep the ranking and drop the lines.
    provenance: withCaveats(
      mergeProvenance(
        provenanceOf(fy, [['superannuation.carryForward.applicationOrder', CARRY_FORWARD.applicationOrder]]),
        headroom.provenance,
        tax.provenance,
      ),
      COMPOSITION_CAVEAT,
      EXCESS_CAVEAT,
    ),
  });
};

// --- P6-8 brief 3 — the year's concessional contributions against the year's general cap ---------
//
// `applyConcessional` above is the full assessment and needs a contribution history; this is the
// one question that can be answered without one, and it is a REFUSAL rather than an assessment.
//
// **WHAT IS MEASURED CHANGED ON 2026-09-20 (brief 3, final chunk), AND THE OLD SCOPE WAS CORRECT
// WHEN IT WAS WRITTEN.** Brief 2 chunk 5 tested the stated sacrifice ALONE and said why: *"This
// build contributes none of the Guarantee yet (`superContributions.ts` reaches no walk — P6-8
// brief 3), so every total it can compute UNDERSTATES the Person's real one."* That ground is
// discharged. Chunk 2b of brief 3 credits the Superannuation Guarantee, net of the fund's 15%, to
// a destination the plan states or derives, and feeds it to `concessionalContributions` as the
// `employerContributions` limb — so the walk can now build a REAL concessional total, and testing
// one limb of it against a whole-year cap would understate by 12% of a salary on purpose.
//
// **This function therefore takes the COMPONENTS and not an amount.** It builds the total with the
// one constructor (`concessionalContributions`), so there is no second spelling of what a
// concessional contribution is and no caller can pass a bare number that happens to be a sacrifice.
// All four s 291-25 limbs are named at every call site, nil included, on the module's own rule that
// a field which can be left out is a field that disappears from the calculation.
//
// ⚠️ **IT STILL CANNOT PROVE COMPLIANCE, FOR A SMALLER REASON, AND SO IT STILL RETURNS NOTHING.**
// Two limbs remain outside what the walk can see — ~~s 291-20(4) carry-forward headroom is not run
// (it needs a contribution history the plan file has no field for)~~ **narrowed by P3-4b
// (2026-09-30): the walk now passes `carryForwardAvailable`, but a year before the plan counts as
// fully used unless `Person.statedUnusedConcessionalCap` states it** — and any employer contribution
// beyond the Guarantee, or any personal deductible contribution, is nil because this model holds no
// field for either. The first makes the CAP larger than the general cap and the second makes the
// TOTAL larger, so the residual now runs in BOTH directions and the function is one-directional for
// that reason rather than for the old one: a silent return is not a finding of compliance, and
// there is nothing to read one out of.
//
// **What is refused, and why it is refused rather than priced.** Division 291 includes the excess
// in the Person's own assessable income with a 15% offset and adds an excess concessional
// contributions charge; none of that is in the register (`EXCESS_CAVEAT`, unchanged since P3-3b).
// Pricing the excess at the fund's 15% alone — which is what this build did before brief 2 chunk 5
// — is wrong in the FLATTERING direction for exactly the Households most likely to be over the cap.
//
// ⚠️ **THE CAP IS DATED AND INDEXED, AND THIS TAKES THE YEAR AS A PARAMETER FOR THAT REASON.**
// `concessionalContributionsCap` indexes cumulatively from $25,000 and the December 2016 quarter
// (T13), so the cap is a different figure in different years and there is no "the cap" to compare
// against. A year with no AWOTE number raises `MissingIndexNumberError` through this call and is
// not caught here — a build that guessed a number would be inventing the very figure the refusal is
// measured against.
//
// ⚠️ **WHICH YEARS THOSE ARE CHANGED ON 2026-09-21 (P6-12), AND SO DID WHAT THE CAP MEANS.** What
// stood here: *"the register publishes one concessional cap (FY2026-27) and does not record that
// later years are unknowable."* The register now also holds the **December 2025 published wage
// level**, and a caller may supply a forward series grown from it at their own stated rate, so
// **every year from FY2026-27 onward has a cap** — the published one, or one DERIVED from a forecast
// and labelled as such in the refusal below. What is left of the refusal is the direction the series
// cannot run: a year BEFORE the last published December quarter, where compounding backwards would
// invent a figure the ABS has already published. The user ruled for this on 2026-09-21, accepting in
// terms that it runs in the flattering direction — larger caps, fewer refusals — because a cap
// frozen at the base amount for forty years is not a cautious forecast but a wrong one.
//
// ⚠️ **AND ADDING THE GUARANTEE MOVED THE FLOOR-CROSSING BOUNDARY, WHICH IS A BEHAVIOUR CHANGE AND
// NOT A BUG.** s 960-285(4) floors every year's cap at the base amount, so a TOTAL within $25,000
// is within every year's cap and needs no index number — but the total is now the sacrifice plus
// 12% of a salary, so an arrangement that cleared the floor on its own may not clear it as a total.
// A $10,000 sacrifice against a $130,000 salary is $25,600 of concessional contributions, which
// crosses the floor and needs the year's own cap. ~~and in FY2027-28 it asks for a cap that cannot
// be derived and gets `MissingIndexNumberError` by name~~ — **struck 2026-09-21 (P6-12): FY2027-28
// has a derived cap now, so that total is measured against it rather than refused for want of one.**
// The floor itself is untouched and still answers for every total within $25,000 with no index
// number at all, which is what a year before the published wage level still relies on. The
// alternative — reusing the last published cap, or skipping the check above the floor — is a guessed
// cap and a silent pass respectively, and this build does neither.

/**
 * **Where the cap in a refusal came from, said in the Person's words rather than in a basis code.**
 *
 * Three cases and no default, because the difference between them is the difference between a
 * figure the ATO published and a figure this Household's own settings produced:
 *
 *   * a year the register publishes a cap for — the law, quoted;
 *   * a year computed from the last **published** December quarter wage level — still no forecast
 *     in it, which is FY2026-27 and only FY2026-27;
 *   * every later year — the published wage level grown by the rate stated in this plan, which is a
 *     forecast, is the Person's own, and moves the moment they change that box.
 */
const labelledCapSource = (cap: CapResult<ConcessionalCap>): string => {
  if (cap.indexNumber === null) return 'that is the figure the register publishes for that year.';
  if (cap.indexNumber.confidence === 'primary-verified') {
    return (
      'that figure is COMPUTED, not quoted: it is the base amount indexed by the published ' +
      `average weekly earnings level for the quarter ending ${cap.indexNumber.quarter} (s 960-285), ` +
      'and it is cross-checked against the cap the register publishes.'
    );
  }
  return (
    'that figure is a FORECAST AND NOT THE LAW. Nobody has published a cap for that year, and ' +
    'nobody has published the wage level it would be indexed from either: it is the base amount ' +
    `indexed by average weekly earnings for the quarter ending ${cap.indexNumber.quarter}, which ` +
    'this build derived by growing the last published level at the wage growth rate stated in this ' +
    'plan. Raise that rate and the cap rises in $2,500 steps, and this arrangement may stop being ' +
    'refused; lower it and more arrangements are refused. The real cap will be whatever wages ' +
    'actually do.'
  );
};

/**
 * A year's concessional contributions — the sacrifice and the employer Superannuation Guarantee
 * together — exceeding the TOTAL concessional cap (the general cap plus any unused cap carried
 * forward, P3-4b) for the year the arrangement takes effect in.
 * Division 291's treatment of the excess is not modelled, so the arrangement is refused rather than
 * walked at the fund's 15% and no more.
 */
export class ExcessConcessionalContributionsNotModelledError extends RangeError {
  constructor(input: {
    readonly fy: FinancialYear;
    readonly components: ConcessionalContributionComponents;
    readonly total: Cents;
    readonly generalCap: Cents;
    /** s 291-20(3)–(4): unused cap carried forward into this year; nil where none or the $500,000 test closed it. */
    readonly carryForwardAvailable: Cents;
    readonly statedBy: string;
    /** Where the cap in the message came from: published, or derived from the plan's own wage assumption. */
    readonly capSource: string;
  }) {
    const { employerContributions, salarySacrificed, personalDeductible, otherConcessional } = input.components;
    super(
      `${input.statedBy} would have ${input.total} cents of concessional contributions in FY${input.fy} — ` +
        `${salarySacrificed} cents salary sacrificed, ${employerContributions} cents of employer ` +
        `Superannuation Guarantee, ${personalDeductible} cents of personal deductible contributions ` +
        `and ${otherConcessional} cents of other concessional contributions. The total ` +
        `concessional cap for FY${input.fy} is ${addCents(input.generalCap, input.carryForwardAvailable)} cents, ` +
        `including unused amounts carried forward: the general cap of ${input.generalCap} cents ` +
        `(ITAA 1997 s 291-20(2)), and ${input.capSource} Plus ${input.carryForwardAvailable} cents of ` +
        'unused cap carried forward from the five years before (s 291-20(3)–(4)) — nil unless this ' +
        'plan states it or the forecast walked a whole earlier year under the cap, and nil in any year ' +
        'the Total Super Balance at the prior 30 June was $500,000 or more. The total exceeds it, so ' +
        `${EXCESS_CAVEAT}. This build would tax the whole amount at ` +
        'the fund\'s 15% and stop there, which understates the tax and overstates the Household. ' +
        'Refusing to walk it. The Guarantee counts towards the cap and is not optional, so the room ' +
        'left for a sacrifice is the cap less the Guarantee: state an amount within that, or wait ' +
        'for Division 291.',
    );
    this.name = 'ExcessConcessionalContributionsNotModelledError';
  }
}

/**
 * Refuse a year's concessional contributions where they exceed the year's general concessional cap.
 *
 * Additive: no existing consumer of this module calls it, and nothing it computes is added to any
 * figure. It answers one question and either returns nothing or throws.
 *
 * At the cap exactly is ACCEPTED — s 291-20(1) is exceeded only above the cap — and the boundary is
 * pinned in `test/core-super-concessional.test.mjs`.
 */
export const refuseConcessionalContributionsOverGeneralCap = (input: {
  readonly fy: FinancialYear;
  /** All four s 291-25 limbs, named. The total is built here, by the one constructor. */
  readonly components: ConcessionalContributionComponents;
  /** Who stated it, for the message: an entry id and a Person, never a figure. */
  readonly statedBy: string;
  readonly indexNumbers?: IndexNumbers;
  /** See `concessionalContributionsOverGeneralCap`. */
  readonly carryForwardAvailable?: Cents;
}): void => {
  const over = concessionalContributionsOverGeneralCap(input);
  if (over !== undefined) {
    throw new ExcessConcessionalContributionsNotModelledError({
      fy: input.fy,
      components: input.components,
      total: over.total,
      generalCap: over.cap.amount,
      carryForwardAvailable: over.carryForwardAvailable,
      // **HALF THE RULING OF 2026-09-21 IS THE LABEL, AND THIS IS THE LABEL ON A REFUSAL.** A cap
      // computed from a forecast wage level is not the law, and a refusal that quoted it as though
      // it were would be telling the Person that a figure they could move by editing one box is a
      // ceiling Parliament set. The three branches are the three kinds of cap this build can hold,
      // and the derived one says both what it rests on and which way it can be wrong.
      capSource: labelledCapSource(over.cap),
      statedBy: input.statedBy,
    });
  }
};

/**
 * **The comparison itself, for the refusal above AND for the walk's year-to-date check** (2026-09-23).
 * `undefined` where the total is within the year's general cap; otherwise the total, the cap and
 * the excess. One expression of the floor and the comparison, so the refusal at a stated month and
 * the note in a later one cannot measure against two different caps.
 */
export const concessionalContributionsOverGeneralCap = (input: {
  readonly fy: FinancialYear;
  readonly components: ConcessionalContributionComponents;
  readonly indexNumbers?: IndexNumbers;
  /**
   * **P3-4b — the s 291-20(4) increase, so the comparison is against the TOTAL cap.** The walk
   * passes `CarryForwardHeadroom.unusedAvailable` for the Person's year (nil where the $500,000
   * test closed the window). Absent is nil: a caller with no history measures against the general
   * cap alone, which over-refuses and never under-refuses.
   */
  readonly carryForwardAvailable?: Cents;
}):
  | {
      readonly total: Cents;
      readonly cap: CapResult<ConcessionalCap>;
      readonly carryForwardAvailable: Cents;
      readonly totalCap: Cents;
      readonly excess: Cents;
    }
  | undefined => {
  const total = concessionalContributions(input.components);
  // **THE FLOOR, AND IT IS WHY THIS IS USABLE PAST FY2026-27 AT ALL.** s 960-285 indexes the cap
  // cumulatively from its own base amount, and where the factor is not greater than 1 the base
  // amount stands (`indexCap`) — so **no year's general cap is below the base amount**, in a year
  // whose AWOTE number this build holds or in one it does not. A total within the base amount is
  // therefore within EVERY year's cap, and asking for an index number to prove it would refuse a
  // plan that cannot possibly breach the cap. The base amount is read off the cap's own indexation
  // spec, never written here: a literal would be a second copy of a figure the assumptions layer
  // holds, which is the T13 drift this module exists to avoid.
  //
  // ⚠️ The comparison is against the TOTAL and not against any one limb, which is what makes the
  // floor honest: a sacrifice under $25,000 whose total is over it gets the year's own cap asked
  // for, and a year with no AWOTE number refuses by name rather than passing quietly.
  const baseAmount = CAP_INDEXATION.concessional.value.baseAmount;
  if (total <= baseAmount) return undefined;
  // Above the floor the year's own cap is needed, and a year with no AWOTE number raises
  // `MissingIndexNumberError` from inside this call rather than being compared against some other
  // year's figure. That refusal is the honest one: the register publishes ONE concessional cap and
  // above the floor this build cannot say whether the arrangement breaches a later year's.
  const cap = concessionalContributionsCap(input.fy, input.indexNumbers ?? []);
  const carryForwardAvailable = input.carryForwardAvailable ?? toCents(0);
  const totalCap = addCents(cap.amount, carryForwardAvailable);
  if (total <= totalCap) return undefined;
  return { total, cap, carryForwardAvailable, totalCap, excess: subCents(total, totalCap) };
};
