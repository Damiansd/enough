// P3-25 / R10 step 4 and R11 — **which exempt current pension income mechanism a fund is on for a
// year, and the two things about that question this model will not answer.** Register §3.11:
// ITAA 1997 Subdivision 295-F.
//
// **Why this is not in `superPhase.ts`.** ECPI is the one part of §3 that is *not* per Person and
// not per interest: s 295-385 exempts income from particular assets of the **fund**, and s 295-390
// exempts one proportion of the **fund's** whole-year income. Which mechanism applies is decided by
// the interests taken together — whether *every* interest was in the retirement phase at a time,
// and whether at all times (s 295-385(9), (10)(a)). `superPhase.ts` deliberately has no
// Person-level or fund-level aggregation in it, so the aggregate question gets its own module
// rather than a new field on a per-interest figure. Nothing in `superPhase.ts` imports this file,
// so no existing caller of `fundEarningsTax` can reach the refusals below.
//
// **The scoping is the whole point of this module — ruling R11, register O69.** All of
// Subdivision 295-F's machinery bites only for a **self managed fund**. For a member of an
// APRA-regulated fund ECPI is invisible: the trustee computes it and the member's balance simply
// arrives net. So `SegregatedEcpiNotModelledError` and `EcpiMethodNotStatedError` **must not fire on
// an APRA interest**. A correct refusal reaching a household it cannot apply to reads as a broken
// tool, and it teaches the user to distrust refusals that are load-bearing elsewhere.
//
// The scoping is written as a **total lookup over `FundType`** rather than as a guard: `BY_FUND_TYPE`
// below maps `apra` to a function whose body does not mention either refusal class, and `smsf` to
// the one that does. There is no `if (fundType === 'smsf')` to invert, and letting a refusal reach
// an APRA fund means either moving a `throw` into the APRA branch or swapping the two cells of a
// two-cell table — both visible, both asserted against.
//
// **What is refused, and why neither is closable by assumption.**
//
//   * **`SegregatedEcpiNotModelledError`** — the segregated method traces which asset produced which
//     dollar and when (s 295-385(1)(b)). The model holds interests and balances, not an asset ledger
//     with derivation dates. §3.11.7's fixture F4 is why no assumption closes it: on one member,
//     $900,000, converting 14 December, $45,000 of income of which a $15,000 gain was realised on
//     20 November, the segregated answer is **$4,296.58** and the s 295-385(9) election answer is
//     **$3,069.86** — **$1,226.71 apart on identical facts**, and moving the gain to March flips the
//     sign. The error runs **both ways**, so R1's "refuse rather than flatter" is not even the
//     ground: there is no conservative branch to take.
//
//   * **`EcpiMethodNotStatedError`** — where the fund was 100% retirement phase for *part* of the
//     year, s 295-385(9) is a genuine election and §3.11.8 places the answer as a **Setting,
//     required and never defaulted, per fund per year**. There is no form, no approved form, no
//     deadline, no notification and no Commissioner anywhere in the Subdivision (§3.11.5, U36), so
//     a stated method cannot be checked against anything and an unstated one cannot be inferred
//     from anything.
//
// **What is answered rather than refused**, because the register determines it (§3.11.8, "derivable
// otherwise"): a fund that was 100% retirement phase at **all** times in the year is deemed
// segregated for the whole of it, and a fund that was never 100% retirement phase has no election
// available and is on the proportionate method for the whole year. Both of those are *which
// mechanism*, not *what number* — the number stays with `fundEarningsTax`, at the bound of §3.11.6.
//
// **What this module does not do.** It computes no exempt proportion and no tax, and it must not:
// the averaging that every real percentage rests on is **actuarial convention and not law** (§3.11.1,
// U37 — the Act says only "average value for the income year", and a regulation could have prescribed
// a rule and did not), so a percentage computed here and presented as though certified would be the
// exact failure the confidence labels exist to catch. It also does **not** apply s 295-387 (DSFA,
// which forces the proportionate method), because that test reads Total Super Balance at the
// **previous** 30 June (§3.8, T129) and this module holds one year's interests; and it does not
// apply s 295-385(6) (market value above the account balance), which needs per-asset market values.
// Both are recorded here and left out rather than approximated.
import { MidYearPhaseChangeError } from './superPhase.js'; // `.js` is correct in a `.ts` file — see tsconfig.json
import type { FundType, PhaseYearFraction, SuperInterest } from './superPhase.js';
import { mergeProvenance, provenanceOf, withCaveats } from './provenance.js';
import type { ComputedProvenance, ProvenanceBearing } from './provenance.js';
import type { FinancialYear } from '../data/assumptions/types.js';

// --- The readings this module rests on, each at its own epistemic status (R6) ----------------------
//
// None of these is a figure — no rate, no threshold and no amount is declared in this file, and
// none could be: `src/data/assumptions/` is where figures live. They are **confidence labels on
// readings**, in the shape `superFranking.ts` already uses for register O27, and they exist so that
// an inference cannot be promoted to a bare `primary-verified` by being consumed.

/**
 * Register §3.11.6 / **O69**, and the ground of R11's scoping. The register asserts it without a
 * source row, and this module is where it decides something, so it is carried at the weakest label
 * rather than at the confidence of the sections it is reasoning about.
 */
const ECPI_IS_A_TRUSTEE_COMPUTATION: ProvenanceBearing & {
  readonly rule: string;
  readonly source: string;
  readonly registerSection: string;
} = Object.freeze({
  rule:
    'exempt current pension income is computed by the trustee, so for a member of an ' +
    'APRA-regulated fund it is invisible: the member’s balance arrives net and there is no ' +
    'election, method or certificate for the member to state',
  source:
    'ITAA 1997 s 295-385(1) exempts the income of the FUND and addresses the trustee throughout; ' +
    'the member-side invisibility is stated at register §3.11.6 with no source row of its own',
  registerSection: '§3.11.6 / O69',
  confidence: 'unverified',
});

/**
 * Register §3.11.3, trap **T127**. Deemed segregation is a *reading* of the operative words applied
 * to a fund with no other liabilities, corroborated three times inside the statute — ss 295-385(9),
 * (10)(a) and 295-387(3) each presuppose it — and under R6 it is never bare `primary-verified`.
 */
const DEEMED_SEGREGATION: ProvenanceBearing & {
  readonly rule: string;
  readonly source: string;
  readonly registerSection: string;
} = Object.freeze({
  rule:
    'if every interest in the fund is in the retirement phase at a time, the fund has no other ' +
    'liabilities, so all its assets are dealt with solely for retirement-phase liabilities and — ' +
    'for an account-based pension — are segregated current pension assets automatically, with no ' +
    'certificate and no trustee act',
  source:
    'ITAA 1997 s 295-385(4) read with ITAR (1997 Act) 2021 reg 295-385.01(a)(iii), corroborated by ' +
    'ss 295-385(9), (10)(a) and 295-387(3)',
  registerSection: '§3.11.3 / T127',
  confidence: 'secondary-only',
});

/**
 * Register §3.11.1, unknown **U35**. s 295-390(4) requires an actuary's certificate always, and its
 * one escape — s 295-390(7) — applies only to benefits "prescribed by the regulations for the
 * purposes of this subsection", and **no such regulation has ever been made**. That is an argument
 * from the absence of a regulation, verified exhaustively against the full compilation of
 * `F2021L00206` (Compilation No. 16), and it keeps that label rather than becoming a bare
 * `primary-verified`.
 */
const CERTIFICATE_HAS_NO_ESCAPE: ProvenanceBearing & {
  readonly rule: string;
  readonly source: string;
  readonly registerSection: string;
} = Object.freeze({
  rule:
    'the proportionate method always needs an actuary’s certificate obtained before the lodgment ' +
    'date, and s 295-390(7)’s escape is a dead letter',
  source:
    'ITAA 1997 s 295-390(4)–(7); the absence of any prescribing regulation verified against the ' +
    'complete ITAR (1997 Act) 2021, F2021L00206 Compilation No. 16 (27 Jun 2026), whose ' +
    'Subdiv 295-F contains reg 295-385.01 and nothing else',
  registerSection: '§3.11.1 / U35',
  confidence: 'secondary-only',
});

/** §3.11.1 / U37, said on every proportionate determination. A limit of the reading, not of a figure. */
const AVERAGING_IS_CONVENTION =
  'the exempt proportion under s 295-390(3) is an average "for the income year" and the Act ' +
  'prescribes no averaging rule — daily time-weighting is actuarial convention, not law (U37), so ' +
  'two actuaries may certify different percentages on identical data and both be correct. This ' +
  'module states which mechanism applies and never computes the percentage';

/** §3.11.4 and §3.11.3, said on every SMSF determination: two provisions this module does not apply. */
const NOT_APPLIED_HERE =
  'ITAA 1997 s 295-387 (disregarded small fund assets, which would FORCE the proportionate method ' +
  'and remove the s 295-385(9) election) is not applied here — it is tested on Total Super Balance ' +
  'at the PREVIOUS 30 June (§3.8, T129) and reaches across funds (T128), and this module holds one ' +
  'year’s interests. Nor is s 295-385(6), which caps the segregated pool at the account balance ' +
  'and needs per-asset market values';

// --- What can be said, and what the caller may state ---------------------------------------------

/** The mechanism, named. Not a number: no exempt proportion and no tax is computed in this file. */
export type EcpiMethod =
  | 'none — the trustee of an APRA-regulated fund computes ECPI and the member’s balance arrives net'
  | 'deemed segregation for the whole year — ITAA 1997 s 295-385(4), ITAR reg 295-385.01(a)'
  | 'the proportionate method for the whole year — ITAA 1997 s 295-390, certificate required';

/**
 * What a Setting may say about an SMSF's method for a year (§3.11.8). **Never defaulted**, and only
 * consulted for a self managed fund.
 *
 * `'proportionate'` is also how the s 295-385(9) election is expressed, because that is the
 * election's whole effect: none of the fund's assets are segregated current pension assets for the
 * **whole** year (s 295-385(8)), so the fund is on s 295-390 for the whole year.
 */
export type StatedEcpiMethod = 'segregated' | 'proportionate';

/**
 * One interest of one fund, for one year: the phase it states and how much of the year that phase
 * held. The same pair `fundEarningsTax` takes, and the fund type rides on the interest (R11).
 */
export interface FundInterestYear {
  readonly interest: SuperInterest;
  readonly heldFor: PhaseYearFraction;
}

export interface EcpiMethodDetermination {
  readonly fy: FinancialYear;
  readonly fundType: FundType;
  readonly method: EcpiMethod;
  /**
   * Whether s 295-385(9) was a live election on these facts. `false` for an APRA fund, and for an
   * SMSF that was never 100% retirement phase or was 100% retirement phase all year.
   */
  readonly electionWasAvailable: boolean;
  readonly reason: string;
  readonly provenance: ComputedProvenance;
}

// --- Refusals -------------------------------------------------------------------------------------

/**
 * **R11's mitigation, in R5's pattern: needed and missing gets a name, not a default.** It fires in
 * exactly one place — the entry to this module, which is the only computation in `src/` that turns
 * on fund type. `fundEarningsTax` does not raise it and cannot, because the bound of §3.11.6 is a
 * ceiling on the liability under either method and so needs no fund type at all.
 */
export class FundTypeNotStatedError extends RangeError {
  constructor(fy: FinancialYear, interests: number) {
    super(
      `the FY${fy} ECPI mechanism cannot be determined for a fund ${interests} of whose interests ` +
        'do not say whether they are held in a self managed fund or an APRA-regulated one. This is ' +
        'ruling R11, and register O69 is what it closes: ALL of ITAA 1997 Subdivision 295-F bites ' +
        'only for an SMSF, because for a member of an APRA-regulated fund the trustee computes ' +
        'exempt current pension income and the member’s balance simply arrives net — there is no ' +
        'method, no election and no certificate for the member to state. So the two refusals in ' +
        'this module must not reach an APRA household, and deciding that by DEFAULT is the defect, ' +
        'not the fix: defaulting to `smsf` would fire refusals at a household they cannot apply ' +
        'to, and defaulting to `apra` would silently answer a question the register says is a ' +
        'genuine election worth $1,226.71 on fixture F4’s facts. The fund type is per INTEREST and ' +
        'not per Person, because a Person may hold an SMSF interest and an APRA one at the same ' +
        'time and it is the interest that carries phase. Fix: state it — ' +
        '`heldInFund(interest, \'smsf\')` or `heldInFund(interest, \'apra\')`. Nothing else in the ' +
        'model needs it, and `fundEarningsTax` still does not read it.',
    );
    this.name = 'FundTypeNotStatedError';
  }
}

/**
 * R10 step 4, **scoped by R11**: reachable only from the SMSF branch of `BY_FUND_TYPE`, and this
 * class is not named anywhere in the APRA branch.
 */
export class SegregatedEcpiNotModelledError extends RangeError {
  constructor(fy: FinancialYear) {
    super(
      `the FY${fy} ECPI of a self managed fund on the SEGREGATED method is not modelled. ` +
        'ITAA 1997 s 295-385(1)(b) exempts income derived FROM particular assets, traced — which ' +
        'asset produced which dollar, and when it was derived — and this model holds interests and ' +
        'balances, not an asset ledger with derivation dates. No assumption closes it, because the ' +
        'error runs BOTH ways: on register §3.11.7 fixture F4 — one member, $900,000, converting ' +
        '14 December 2026, $45,000 of income of which a $15,000 gain was realised on 20 November — ' +
        'the segregated answer is $4,296.58 and the s 295-385(9) election answer is $3,069.86, ' +
        '$1,226.71 apart on identical facts, and moving the gain to March flips the sign. So this ' +
        'is not R1’s case of a default that flatters: there is no conservative branch to take. ' +
        'Note that the certificate is on the OTHER method — s 295-385(4) with ITAR reg 295-385.01 ' +
        'gives a certificate-free segregated route for account-based pensions, while s 295-390(4) ' +
        'requires one always (§3.11.1) — so the absence of a certificate is not a reason to think ' +
        'the fund is not segregated. This refusal is scoped to an SMSF by ruling R11 and does not ' +
        'fire for an APRA-fund interest, where ECPI is the trustee’s computation and invisible to ' +
        'the member. What is NOT refused is the year’s fund earnings tax: `fundEarningsTax` charges ' +
        'the provable upper bound of §3.11.6, which is a ceiling under either method.',
    );
    this.name = 'SegregatedEcpiNotModelledError';
  }
}

/**
 * R10 step 4, **scoped by R11**: reachable only from the SMSF branch of `BY_FUND_TYPE`, and only
 * where s 295-385(9) is a live election.
 */
export class EcpiMethodNotStatedError extends RangeError {
  constructor(fy: FinancialYear) {
    super(
      `the FY${fy} ECPI mechanism of this self managed fund is a genuine election and no Setting ` +
        'says which branch was taken. Every interest in the fund was in the retirement phase at one ' +
        'or more times in the year but not at all times, which is exactly the window in which ' +
        'ITAA 1997 s 295-385(9) is available (s 295-385(10)(a) removes it once the fund is 100% ' +
        'retirement phase at all times). Its effect is that NONE of the fund’s assets are ' +
        'segregated current pension assets for the WHOLE year (s 295-385(8)), putting the fund on ' +
        's 295-390 for the whole year with a certificate required. Taking either branch silently is ' +
        'refused because the branches give different numbers on the same facts and which is better ' +
        'depends on WHEN income was derived: register §3.11.7 fixture F4 puts them $1,226.71 apart, ' +
        'and moving one realised gain from November to March reverses which is better. Nor can a ' +
        'stated answer be checked or an unstated one inferred: Subdivision 295-F prescribes no ' +
        'form, no approved form, no deadline, no notification and no role for the Commissioner ' +
        'anywhere (§3.11.5, U36). Register §3.11.8 therefore places it as a Setting — required, ' +
        'never defaulted, per fund per year. This refusal is scoped to an SMSF by ruling R11 and ' +
        'does not fire for an APRA-fund interest. Fix: state `statedEcpiMethod`, or accept ' +
        '`fundEarningsTax`’s bound (§3.11.6), which is a ceiling under either branch.',
    );
    this.name = 'EcpiMethodNotStatedError';
  }
}

// --- The two branches, and the table that keeps them apart ----------------------------------------

interface FundYear {
  readonly fy: FinancialYear;
  readonly interests: readonly FundInterestYear[];
  readonly statedMethod: StatedEcpiMethod | undefined;
}

/**
 * **The APRA branch.** It reaches no refusal, and the structural claim is not that a condition
 * guards it: it is that the two ECPI refusal classes are not mentioned in this function at all, so
 * making one fire here means writing the class name into a body that has never had it.
 */
const apraFundEcpi = ({ fy }: FundYear): EcpiMethodDetermination =>
  Object.freeze({
    fy,
    fundType: 'apra',
    method: 'none — the trustee of an APRA-regulated fund computes ECPI and the member’s balance arrives net',
    electionWasAvailable: false,
    reason:
      'ITAA 1997 Subdivision 295-F is addressed to the trustee of the fund, and an APRA-regulated ' +
      'trustee computes its own exempt current pension income: the member’s balance arrives net of ' +
      'whatever it worked out. There is no method for the member to be on, no s 295-385(9) election ' +
      'for the member to make and no certificate for the member to hold, so neither of this ' +
      'module’s refusals applies (R11, O69). The per-interest 15% / 0% model such a member is ' +
      'projected under is a modelling convention, not a description of what the fund does',
    provenance: withCaveats(
      provenanceOf(fy, [['ecpi.trusteeComputation', ECPI_IS_A_TRUSTEE_COMPUTATION]]),
      `${ECPI_IS_A_TRUSTEE_COMPUTATION.rule} — ${ECPI_IS_A_TRUSTEE_COMPUTATION.source} ` +
        `(register ${ECPI_IS_A_TRUSTEE_COMPUTATION.registerSection})`,
    ),
  });

/**
 * Whether an interest **may** have been in the retirement phase at one or more times in the year —
 * the s 295-385(9) question, read **inclusively on purpose**.
 *
 * An interest stated as *accumulation* for only PART of the year was something else for the rest of
 * it, and this module cannot see what: `superPhase.ts` states a phase on a day with a coverage, and
 * a Person may commute a retirement phase pension back to accumulation. Counting that case as
 * possibly retirement phase makes the election-availability test err toward **refusing**, which is
 * the safe direction where fixture F4 puts the two branches $1,226.71 apart.
 */
const mayHaveBeenRetirementPhase = ({ interest, heldFor }: FundInterestYear): boolean =>
  (interest.phase === 'retirement' && heldFor.days > 0) || heldFor.coverage === 'part-year';

/** Whether an interest was in the retirement phase at ALL times in the year — s 295-385(10)(a). */
const wasRetirementPhaseAllYear = ({ interest, heldFor }: FundInterestYear): boolean =>
  interest.phase === 'retirement' && heldFor.coverage === 'whole-year';

/**
 * **The SMSF branch**, and the only place either ECPI refusal is raised.
 *
 * Three outcomes and two refusals, in the order §3.11.3 sets them out:
 *
 *   1. 100% retirement phase at **all** times → deemed segregation for the whole year. s 295-385(9)
 *      is unavailable ((10)(a)), so there is nothing to state and no tracing to do — every asset is
 *      a segregated current pension asset and all the income is exempt. Answered, not refused.
 *   2. The caller states the **segregated** method → refused: asset-level tracing.
 *   3. 100% retirement phase at some time but not all times → s 295-385(9) is a live election. A
 *      stated `'proportionate'` is the election having been made and is answered; nothing stated is
 *      refused.
 *
 * Anything else — the fund was never 100% retirement phase — has no election available and no
 * segregation, so it is the proportionate method for the whole year. That is §3.11.7's Example A,
 * and it is derivable rather than refused (§3.11.8).
 */
const smsfEcpiMethod = ({ fy, interests, statedMethod }: FundYear): EcpiMethodDetermination => {
  const smsfProvenance = (
    reading: ProvenanceBearing & { readonly rule: string; readonly source: string; readonly registerSection: string },
    ...lines: readonly string[]
  ): ComputedProvenance =>
    withCaveats(
      provenanceOf(fy, [[`ecpi.${reading.registerSection}`, reading]]),
      `${reading.rule} — ${reading.source} (register ${reading.registerSection})`,
      NOT_APPLIED_HERE,
      ...lines,
    );

  if (interests.every(wasRetirementPhaseAllYear)) {
    return Object.freeze({
      fy,
      fundType: 'smsf',
      method: 'deemed segregation for the whole year — ITAA 1997 s 295-385(4), ITAR reg 295-385.01(a)',
      electionWasAvailable: false,
      reason:
        'every interest in the fund was in the retirement phase at all times in the year, so the ' +
        'fund had no other liabilities and all of its assets were dealt with solely for ' +
        'retirement-phase liabilities. For an account-based pension that makes them segregated ' +
        'current pension assets automatically, with no certificate and no trustee act — and ' +
        's 295-385(10)(a) removes the s 295-385(9) election, so there is nothing for a Setting to ' +
        'state. No tracing is needed to say the mechanism, because there is no non-exempt ' +
        'liability for any asset to be traced against',
      provenance: smsfProvenance(DEEMED_SEGREGATION),
    });
  }

  if (statedMethod === 'segregated') throw new SegregatedEcpiNotModelledError(fy);

  const electionWasAvailable = interests.every(mayHaveBeenRetirementPhase);
  if (electionWasAvailable && statedMethod === undefined) throw new EcpiMethodNotStatedError(fy);

  return Object.freeze({
    fy,
    fundType: 'smsf',
    method: 'the proportionate method for the whole year — ITAA 1997 s 295-390, certificate required',
    electionWasAvailable,
    reason: electionWasAvailable
      ? 'every interest in the fund was in the retirement phase at one or more times in the year ' +
        'but not at all times, so the s 295-385(9) election was available and the Setting states ' +
        'that it was made: none of the fund’s assets are segregated current pension assets for the ' +
        'whole year (s 295-385(8)), and the fund is on s 295-390 for the whole of it'
      : 'the fund was not 100% retirement phase at any time in the year, so no asset was dealt ' +
        'with SOLELY for retirement-phase liabilities and nothing was deemed segregated; ' +
        's 295-385(10)(a) also leaves the s 295-385(9) election unavailable, there being no time ' +
        'at which every interest was in the retirement phase. One proportion therefore covers the ' +
        'whole year’s income, including income derived months before any pension existed — this is ' +
        'register §3.11.7 Example A',
    provenance: smsfProvenance(CERTIFICATE_HAS_NO_ESCAPE, AVERAGING_IS_CONVENTION),
  });
};

/**
 * **The scoping, as a total lookup rather than a guard (R11).** Two fund types, two functions, and
 * no condition to invert. `apraFundEcpi` does not name either ECPI refusal class, so an APRA fund
 * cannot reach one without the class name being written into a body that has never contained it, or
 * these two cells being swapped.
 */
const BY_FUND_TYPE: Readonly<Record<FundType, (fund: FundYear) => EcpiMethodDetermination>> = {
  apra: apraFundEcpi,
  smsf: smsfEcpiMethod,
};

/**
 * **Which ECPI mechanism one fund is on for one financial year.**
 *
 * The interests supplied are the interests of **one fund**, so they must agree about fund type —
 * a Person's SMSF interest and their APRA interest are two funds and two determinations, which is
 * why R11 puts the discriminant on the interest rather than on the Person.
 *
 * Order of operations, and it is load-bearing: the fund type is resolved and dispatched on
 * **before** any ECPI question is asked, so there is no path on which an APRA fund is examined for
 * a method, an election or a certificate.
 */
export const ecpiMethod = (input: {
  readonly fy: FinancialYear;
  readonly interests: readonly FundInterestYear[];
  /** §3.11.8's Setting. Optional here because it is required only where s 295-385(9) is live. */
  readonly statedMethod?: StatedEcpiMethod | undefined;
}): EcpiMethodDetermination => {
  const { fy, interests, statedMethod } = input;
  if (interests.length === 0) {
    throw new RangeError(`a fund with no interests has no FY${fy} ECPI mechanism to determine`);
  }
  for (const { heldFor } of interests) {
    if (heldFor.fy !== fy) throw new MidYearPhaseChangeError(fy, heldFor);
  }

  const unstated = interests.filter(({ interest }) => interest.fund === undefined).length;
  if (unstated > 0) throw new FundTypeNotStatedError(fy, unstated);

  const stated = new Set(interests.map(({ interest }) => interest.fund));
  if (stated.size > 1) {
    throw new RangeError(
      `the interests of one fund cannot be held in ${stated.size} different kinds of fund: ` +
        `${[...stated].join(', ')}. A Person's SMSF interest and their APRA-fund interest are two ` +
        'funds and two determinations',
    );
  }

  const fundType = interests[0]?.interest.fund;
  if (fundType === undefined) throw new FundTypeNotStatedError(fy, interests.length);

  const determination = BY_FUND_TYPE[fundType]({ fy, interests, statedMethod });
  return Object.freeze({
    ...determination,
    provenance: mergeProvenance(determination.provenance, ...interests.map(({ interest }) => interest.provenance)),
  });
};
