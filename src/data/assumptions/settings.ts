// P2-5d — the boundary between an assumption and a Setting, written down where it can be read.
//
//   assumption  a legislated rate, threshold, formula or structural rule. Sourced, stamped,
//               frozen, and living in this directory.
//   Setting     a base input with no date that holds for the whole projection (CONTEXT.md) —
//               a *forecast*, supplied by the user, editable, and living in the plan file.
//
// The test is not "does it change over time" — most assumptions do. It is "can it be read from
// a statute, an instrument or an agency page **today**". A deeming rate for March 2028 cannot:
// it is a discretionary Ministerial determination that has not been made. Hard-coding a value
// for it would be a forecast wearing an assumption's provenance, which is precisely the failure
// this project is organised against.
//
// This file therefore holds **no values**. It holds the shapes a Setting must supply and a
// register of what is deliberately absent, so `explainAssumption` can answer "why is there no
// assumption for that" instead of returning nothing.

export interface DeemingRatesSetting {
  /** Lower deeming rate, per annum, as a decimal — e.g. 0.0175. */
  readonly lower: number;
  /** Upper deeming rate, per annum, as a decimal. */
  readonly upper: number;
}

/**
 * The forward economic series (register O5). Each is an annual rate, applied by the indexation
 * mechanisms the assumption modules store. There are three, not one: the Age Pension basic rate
 * follows wages via the MTAWE benchmark, the Pension Supplement follows CPI, and the free areas
 * follow CPI while the payment does not — so a single "inflation" knob cannot express the
 * long-run behaviour (T23, T24).
 */
/**
 * **One 20 March / 20 September Age Pension rate indexation, as the user states it** (register O5).
 *
 * Three figures, not one, because register §4.7 runs three: the combined couple basic rate moves by
 * the **higher** of the CPI and PBLCI movements and is then floored at 41.76% of annualised MTAWE,
 * while the Pension Supplement moves by CPI alone and is never benchmarked (T23). A single
 * "inflation" number cannot express that, and a blended one is the named trap.
 *
 * **Why MTAWE arrives as a LEVEL and the other two as MOVEMENTS.** The benchmark is a percentage of
 * a dollar amount, so it needs the amount; a growth rate has nothing to be a percentage of. A stated
 * observation carries its own level. Where no series is stated, the level is the ABS May 2026 figure
 * (`agePension.indexation.mtaweAnchor`, register O14, closed 2026-09-23) grown at
 * `EconomicSeriesSetting.mtawe` — never one backed out of a published rate, which would assert that
 * the benchmark bound (it did not, on 20 September 2026).
 */
export interface PensionRateIndexation {
  /** The date this observation indexes TO — `2027-03-20`, `2027-09-20`. */
  readonly effective: string;
  /** Movement in the All Groups CPI over the reference period, as a FACTOR: 1.012 for 1.2%. */
  readonly cpi: number;
  /** Movement in the Pensioner and Beneficiary Living Cost Index over the same period, as a factor. */
  readonly pblci: number;
  /**
   * 52 × the ABS *Average Weekly Earnings* MTAWE amount for the reference quarter, **in integer
   * cents**. The reference quarter is December for a 20 March indexation and June for a 20
   * September one (§4.7) — derived from `effective`, never supplied, so a June figure cannot be
   * filed against a March date.
   */
  readonly annualisedMtawe: number;
}

/**
 * **One 1 July means-test indexation.** A different calendar and a different index from the rate
 * indexations above — that is T22 and T24 — and **two** CPI movements rather than one, because
 * register §4.1 names two reference quarters on the same day: the **March** quarter for the income
 * free area and the **December** quarter for the assets free areas. Holding one number for both
 * would be T23's mistake in miniature.
 */
export interface MeansTestIndexation {
  /** The date this observation indexes TO — `2027-07-01`. */
  readonly effective: string;
  /** March-quarter All Groups CPI movement, as a factor. Indexes the income free area (§4.1). */
  readonly cpiMarchQuarter: number;
  /**
   * December-quarter All Groups CPI movement, as a factor. Indexes the assets free areas, the
   * extra allowable amount and the deeming thresholds (§4.1, §4.4, §4.5).
   *
   * **The deeming thresholds are on this limb by a judgment call, not by the register.** §4.1 and
   * §4.5 both say "1 July, CPI" and neither names a reference quarter for them. They are grouped
   * with the assets free areas because that is the other December-referenced 1 July parameter and
   * because a threshold and the free area it sits beside moving by different factors would be a
   * fact nothing in the register supports either. Recorded as an open question, not as law.
   */
  readonly cpiDecemberQuarter: number;
}

/**
 * **The Age Pension forward series (register O5).** The register publishes parameters to 19 March
 * 2027 and nothing past that date exists to be read, so every later rate is a forecast.
 *
 * Absent, `project()` generates one from `EconomicSeriesSetting`'s own `cpi`, `pblci` and `mtawe`
 * (`defaultAgePensionSeries`, user ruling 2026-09-23), so the rates and cut-offs rise with them and
 * each line computed from it says it was generated. Present, it wins untouched and must reach the
 * horizon: a stated series that runs out mid-walk raises `MissingPensionIndexationError` rather than
 * flattening.
 */
export interface AgePensionIndexationSeries {
  /** 20 March / 20 September observations. Order is irrelevant; each carries its own `effective`. */
  readonly rateIndexations: readonly PensionRateIndexation[];
  /** 1 July observations. */
  readonly meansTestIndexations: readonly MeansTestIndexation[];
}

export interface EconomicSeriesSetting {
  /** All Groups CPI, weighted average of the 8 capital cities. */
  readonly cpi: number;
  /** Pensioner and Beneficiary Living Cost Index — the alternative limb of the pension benchmark. */
  readonly pblci: number;
  /** Full-time adult average weekly ordinary time earnings, used for the concessional cap. */
  readonly awote: number;
  /** Male Total Average Weekly Earnings, used for the Age Pension benchmark. */
  readonly mtawe: number;
  /**
   * The dated Age Pension series the 20 Mar / 20 Sep / 1 Jul indexation mechanisms consume.
   *
   * **Stated, it is separate from the four flat rates above and does not derive from them**: these
   * are dated observations, and the date they stop is the date the model stops. **Absent, it DOES
   * derive from them** (2026-09-23): `project()` generates one from `cpi`, `pblci` and `mtawe` that
   * reaches exactly the horizon's last day, and a line computed from it names it as generated rather
   * than stated.
   */
  readonly agePension?: AgePensionIndexationSeries;
}

export interface SettingBoundary {
  readonly kind: 'setting';
  readonly reason: string;
  readonly registerSection: string;
}

/**
 * What is a Setting and not an assumption, and why. Keyed the same way `explainAssumption`
 * keys everything else, so asking for one of these gets an answer rather than a miss.
 */
export const SETTINGS_NOT_ASSUMPTIONS: Readonly<Record<string, SettingBoundary>> = Object.freeze({
  'agePension.deeming.ratesAfterLastDetermination': Object.freeze({
    kind: 'setting',
    reason:
      'Deeming rates have no formula, no index and no announced terminal rate (T30, register O2). The Australian Government Actuary reviews at least six-monthly and recommends; the Minister sets them by legislative instrument and may depart from the recommendation. Determinations already made are assumptions and are stored with their effective dates; everything after the last determination is a Setting with a scenario lever. For this Household it is the single most sensitive Age Pension input.',
    registerSection: '§4.5 / O2',
  }),
  'economic.cpi': Object.freeze({
    kind: 'setting',
    reason: 'Forward CPI is a forecast, not a legislated figure (register O5). The indexation mechanisms in these modules consume it; none of them may hard-code it.',
    registerSection: '§4.7 / O5',
  }),
  'economic.pblci': Object.freeze({
    kind: 'setting',
    reason: 'Forward PBLCI is a forecast (register O5). It matters only as the alternative limb of the 20 Mar / 20 Sep basic-rate movement.',
    registerSection: '§4.7 / O5',
  }),
  'economic.awote': Object.freeze({
    kind: 'setting',
    reason: 'Forward AWOTE is a forecast (register O5). It drives concessional cap indexation, which is cumulative from the Dec 2016 base quarter — so the Setting supplies growth, and the stored formula supplies the machinery. Since 2026-09-23 it also raises every stated salary, month by month from asAtDate (user ruling).',
    registerSection: '§3.2 / O5',
  }),
  'economic.mtawe': Object.freeze({
    kind: 'setting',
    reason: 'Forward MTAWE is a forecast (register O5). It binds the Age Pension basic rate through the 41.76% benchmark, which is why the payment tracks wages while the free areas do not (T24).',
    registerSection: '§4.7 / O5',
  }),
  'economic.agePensionIndexation': Object.freeze({
    kind: 'setting',
    reason:
      'The dated CPI, PBLCI and MTAWE observations the Age Pension indexation mechanism consumes on each 20 March, 20 September and 1 July (register §4.7, O5). The register publishes Age Pension parameters to 19 March 2027 and no further. A plan that states no series gets one generated from its own economic.cpi, economic.pblci and economic.mtawe (user ruling 2026-09-23): each 20 March and 20 September moves CPI and PBLCI by the square root of one plus the annual rate, and grows the ABS May 2026 MTAWE level (agePension.indexation.mtaweAnchor, register O14) by the same half-year of economic.mtawe; each 1 July moves both CPI quarters by a whole year. A stated series wins untouched, and where it does not reach, `MissingPensionIndexationError` refuses rather than carrying the last determined rates forward. MTAWE arrives as an annualised LEVEL in cents rather than a growth rate, because the 41.76% benchmark is a percentage of a dollar amount.',
    registerSection: '§4.7 / O5 / O14',
  }),
  'heas.homeMarketValue': Object.freeze({
    kind: 'setting',
    reason: 'ADR-0005 keeps HomeStatus, not a value, as the means-test primitive. The market value is a user estimate read by HEAS capacity alone (T42) and carries no source and no confidence — everything computed from it is an estimate and must be displayed as one. It is stated as `HeasDrawParams.securityValue` on each HEAS_DRAW entry, not in Settings (ADR-0005, 2026-09-04), so two Scenarios may carry two valuations.',
    registerSection: '§5.1 / T42',
  }),
  'super.sgRateBeyond12Percent': Object.freeze({
    kind: 'setting',
    reason: 'The SG charge percentage is a flat 12 in the Act with no legislated increase (register O4). Holding it at 12% for 40 years is an assumption about future policy, so it is recorded as a Setting rather than presented as legislated.',
    registerSection: '§3.5 / O4',
  }),
  'agePension.qualifyingAgeBeyond67': Object.freeze({
    kind: 'setting',
    reason: 'No legislation raising the qualifying age past 67 exists and Services Australia states there are no plans (register O3). Modelled as current law; any change is a policy-risk lever, not an indexed parameter.',
    registerSection: '§4.9 / O3',
  }),
  'tax.wato.netLabourIncomeSplit': Object.freeze({
    kind: 'setting',
    reason:
      "WATO is measured on net labour income (ITAA 1997 s 61-155(2)) — labour amounts less labour deductions — and neither limb is derivable from a salary forecast: the split of assessable income into labour and non-labour, and of deductions into labour and non-labour, are facts about the Person's return. Same seam, and the same reason, as the four Div 293 components (register §3.6): the figures the tool must ask for are typed as required fields on `NetLabourIncomeComponents` so an omitted one is caught by absence rather than by its effect. DEFAULT, as amended 2026-09-15 by P3-38: all salary is labour income, and labour deductions are the ITAA 1997 s 25-130 standard deduction the Person is entitled to by law — `netLabourIncomeFromSalary(fy, salary, reducerDeductions)`, which from FY2026-27 subtracts max(0, min($1,000, salary) − reducers) and before FY2026-27 subtracts nothing, because the provision does not exist. The superseded wording of this default was 'labour deductions are nil', kept here in its correction frame and nowhere else: it is FALSE from FY2026-27 and it is what register §2.8.1's ACCEPTED 2026-09-15 (P3-39) optimism was about. That optimism is DISCHARGED for the modal wage earner, who claims no other work deductions and for whom this default is now EXACT. WHAT SURVIVES IS NARROWER, and is ACCEPTED 2026-09-15 (P3-38) on its own dated ground rather than inherited: for a Person with real, unmodelled s 25-130(2) reducers, a nil `tax.s25130.reducerDeductions` grants the full $1,000 where the true entitlement is max(0, 1,000 − actual reducers), which under-states labour deductions, over-states net labour income, over-states WATO and so FLATTERS THE HOUSEHOLD — the direction every other unsourced FY2027-28 figure is engineered against (CARRIED_FORWARD_DIRECTION, RULINGS.md R9). It is NOT bounded by $1,000 × the applicable marginal rate — labour deductions come out as max(actual reducers, $1,000), so the over-statement is max(0, actual reducers − $1,000): nil at or below $1,000 and UNBOUNDED ABOVE ($4,000 of real reducers over-states net labour income by $3,000). The $1,000 ceiling holds for the limb (c) deduction taken alone and NOT for this residual; corrected 2026-09-15 before commit, and `test/assumptions-tax.test.mjs` pins the $3,000 arithmetic so the false ceiling cannot be re-asserted. There is no honest refusal trigger because the tool cannot identify that population at all. test/assumptions-tax.test.mjs fails the day this default changes.",
    registerSection: '§2.8.1 / O15',
  }),
  'franking.portfolioEffectiveRate': Object.freeze({
    kind: 'setting',
    reason:
      "There is NO portfolio-level franking gross-up rate in law (T43). ITAA 1997 s 202-60(2) fixes the rate to THE ENTITY MAKING THE DISTRIBUTION, for the income year the distribution is made — not the recipient's, and not a market-wide rate — so a diversified ETF spans both the 25% and the 30% rate at once and no single legislated figure exists for it. A blended rate is therefore a FORECAST about a portfolio's composition, which is the far side of the P2-5d boundary, and it must never be a constant in the engine, a row in §7 or a record in src/data/assumptions/. WHAT IT IS NOT, because the register's own §5A.3.1 got this wrong and the correction is kept here in its frame: the superseded sentence read \"§5A.2's 25% and 30% appear in §7's constants list and nowhere in the data layer... T43 forbids a portfolio rate, not the two legislated payer rates\". The second half is TRUE on T43's words and the first half is FALSE — §5A.2's rates do not appear in §7 at all, under any tag; §5A.2 types every one of them config or config (derived) and stamps them 2026-27, and §7's own rule is that everything not on its list is config and must be year-stamped. So the payer rates were never inside T43's remit, because they were never proposed as §7 constants, and their absence from this directory is an ordinary build-config-with-no-consumer question rather than a T43 question. ANSWERED 2026-09-15 (P3-28, R-B): NOT BUILT, on §5A.2's own closing sentence — 'The model only ever needs the imputation column — and, per T43, normally does not need even that, because the credit arrives as a dollar figure on a statement.' THE PREFERRED ROUTE NEEDS NO RATE AT ALL: an AMMA statement reports the franked amount and the franking credit as two dollar figures and grossed_up = franked + credit. Where a credit IS derived, frankedDistributionFromRate takes r from the caller with the caller's own confidence, exactly as superCaps.ts takes a December quarter index number. HOW FAR THAT IS ENFORCED, stated at its real strength and no higher: the caller-supplied half is structural in the narrow sense this codebase already uses — payerCorporateTaxRate is a REQUIRED, UNDEFAULTED parameter, so omitting it is a tsc error; the never-stored half is NOT structural, because TypeScript cannot forbid a numeric literal that resembles a rate. A source canary in test/assumptions-franking.test.mjs asserts that no 0.25- or 0.30-shaped literal appears in src/core/superFranking.ts outside its comments, and that no assumption key holds a portfolio or gross-up rate. That canary, not the compiler, is register §9's 'the effective franking rate must resolve from a Setting' half; §9's other half — that the §7 constants list must not contain one — is fully structural and is read off the register itself.",
    registerSection: '§5A.1 / T43',
  }),
  'tax.s25130.reducerDeductions': Object.freeze({
    kind: 'setting',
    reason:
      "ITAA 1997 s 25-130(2) reduces the $1,000 standard deduction, but not below zero, by the Person's ACTUAL s 8-1 work deductions, Div 28 car expenses, s 25-100 travel, repairs and Subdiv 40-B/40-D decline in value on work assets, and s 25-125 COVID-test deductions. Those are facts about the Person's return and the tool can derive them no more than it can derive the labour split. ONE AGGREGATE FIGURE, not five: all five categories enter the same formula with the same sign and no provision consumes one without the others, unlike the seven s 995-1(1) surcharge limbs. s 25-130(3) amounts — income-protection, personal-sickness and accident-insurance premiums, and trade or professional association fees — get NO field, because they never reduce the deduction whatever their size. DEFAULT: nil, meaning the Person claims no separate work deduction. That default is EXACT for a wage earner with no other work deductions and OPTIMISTIC for anyone else, in the household's favour and NOT bounded by $1,000 × the marginal rate: the over-statement is max(0, actual reducers − $1,000), unbounded above — see `tax.wato.netLabourIncomeSplit` and register §2.8.1 for the dated acceptance. It is a required argument to `netLabourIncomeFromSalary` and a required field on `StandardDeductionInputs`, so the nil is a figure the caller states and never one they get by leaving it out. From FY2026-27 — one year EARLIER than WATO, which is why it also reaches the CURRENT year through the taxable-income limb. That limb was WIRED 2026-09-17 by P4-1 chunk 3 (`taxableIncomeFromSalary` in core/projection.ts) and O72 is CLOSED; the superseded clause here read 'the taxable-income limb that O72 still tracks as open'. The consequence for this Setting is that its nil default now acts on TWO figures for a Person with real reducers — WATO's base from FY2027-28 and taxable income from FY2026-27 — in the same direction on both.",
    registerSection: '§2.8.2 / O72',
  }),
});
