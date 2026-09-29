// P3-11 — the Age Pension means test. Register §4, ADR-0003.
//
// Two rules dominate this module, and both are easy to get subtly wrong in ways that produce
// plausible output. The shape of the code is chosen so that neither can be broken quietly.
//
// **A couple's entitlement is computed ONCE on combined means, then halved.** So:
//
//   * the only exported calculation is `agePensionEntitlement`, and it takes a `Household`.
//     There is no per-Person entitlement function to call by accident, and no `Person` parameter
//     anywhere in this file's public surface.
//   * `combinedAssessableIncome` and the assets figure are Household aggregates by construction —
//     they are computed from the whole `Household` before either test runs, so there is no
//     per-Person rate for a test to taper.
//   * the halving happens exactly once, in `halve`, at the very end, after the lesser of the two
//     tests has been taken. Grep for it: one call site.
//
// **Both tests always run, and the LOWER rate applies.** So:
//
//   * `incomeTest` and `assetsTest` are both computed unconditionally into the result. Neither is
//     short-circuited and neither is skipped on a guess about which will bind.
//   * `bindingTest` is derived from the two rates rather than asserted, and it is reported. A
//     caller reading only `combinedRatePerFortnight` still gets the right answer; a caller that
//     wants to know *why* can see it.
//
// Entitlement is an output, never an assumption (ADR-0003): there is no floor, no minimum, and
// no path that returns a positive rate without both tests having been applied. Above the assets
// cut-off the answer is zero, not small.
//
// Nothing here reads the clock. `date` is a parameter (P4-1a).
import { addCents, mulCents, subCents, toCents } from './money.js'; // `.js` is correct in a `.ts` file — see tsconfig.json
import type { Cents } from './money.js';
import {
  AGE_PENSION,
  agePensionPeriodAt,
  assetsTestCutOff,
  incomeTestCutOff,
  maximumPaymentRate,
  nonHomeownerAssetsFreeArea,
} from '../data/assumptions/agePension.js';
import type { AgePensionPeriod, RateStatus } from '../data/assumptions/agePension.js';
import type { AgePensionIndexationSeries, DeemingRatesSetting } from '../data/assumptions/settings.js';
import type { IsoDate } from '../data/assumptions/types.js';
import { assertIsoDate, hasReachedAgePensionAge, isCouple, splitAssets } from './household.js';
import type { AssetSplit, Household } from './household.js';
import { deemedIncome, deemingThreshold, resolveDeemingRates } from './deeming.js';
import type { DeemedIncome } from './deeming.js';
import { applyWorkBonus } from './workBonus.js';
import type { WorkBonusResult } from './workBonus.js';

const INCOME_TAPER: number = AGE_PENSION.incomeTest.taper.value;
const ASSETS_TAPER_PER_THOUSAND: number = AGE_PENSION.assetsTest.taper.value;

export interface AgePensionInput {
  readonly household: Household;
  readonly date: IsoDate;
  /**
   * Required from 21 September 2026 — no determination exists past 20 September 2026 and this
   * module will not extrapolate one (T30). Also the scenario lever: supplied, it overrides.
   */
  readonly deemingRates?: DeemingRatesSetting;
  /**
   * Rent Assistance per fortnight, which forms part of the Maximum Payment Rate (SS Act s 1064). For
   * an illness-separated couple it is each Person's, since each is paid at the single rate.
   */
  readonly rentAssistancePerFortnight?: Cents;
  /**
   * The caller's own CPI, PBLCI and MTAWE observations (register O5,
   * `Settings.economicSeries.agePension`). Supplied, §4.7's mechanism is run over it to reach the
   * date and it **wins** wherever it reaches; a date it does not reach is refused rather than
   * answered from the last set it does.
   *
   * ⚠️ **NO LONGER REQUIRED past 19 March 2027, from 2026-09-21 (P4-1e).** It stood here that
   * omitting it meant this module computed inside the published window and refused outside it,
   * *"it does not carry the last determined rates forward (P4-1c)"*. The user has ruled that
   * current numbers stand while the legislation is awaited, and the last published sets are now
   * carried forward past the window — marked `standingFrom` on the period and on the entitlement,
   * so a carried figure says it was carried. The superseded sentence is kept because its reason is
   * still live in the other half: `deemingRatesAt` carries **nothing** forward, being a
   * discretionary Ministerial determination with no formula (T30, register O2), and a caller past
   * 20 September 2026 still owes `deemingRates`.
   */
  readonly indexationSeries?: AgePensionIndexationSeries;
  /**
   * **An illness-separated couple (P12-4, SS Act s 4(7)).** Each Person is paid at the SINGLE
   * maximum rate, but the means stay the couple's: combined income and assets, against the COUPLE
   * free areas and the couple deeming threshold. Absent is a couple living together — the only
   * reading any caller had before this field existed. Refused for a single Household: there is
   * nobody to be separated from.
   */
  readonly illnessSeparated?: boolean;
  /**
   * **P14-5a — ADR-0005's reopen condition, exercised for exactly the case it named.** A home past
   * its two-year CARE-SITUATION exemption (SS Act s 11A(9)(b)) with a usable `ENTER_CARE` estimate
   * behind it. Forwarded, untouched, to `splitAssets`'s own third parameter — this module reads no
   * `Household` field to get it and computes no figure of its own from it. Absent, the refusal
   * below still fires wherever `assets.homeIsAssessableButUnvalued` is true: the manually-set
   * `homeStatus`-only path (`VACATE_HOME`, P3-15) supplies none and still refuses.
   */
  readonly careVacatedHomeAssessment?: Cents;
  /**
   * **P14-13 — ordinary income this module has no other way to reach: `RENT_OUT_HOME`'s net rent
   * (SS Act, ordinary income; DSS Guide 4.6.3.70's own rent-exemption clause confirms the general
   * case, since an exemption FROM the income test presupposes rent is otherwise IN it).** Added
   * DIRECTLY to `combinedAssessableIncome`, never through `employmentIncome` (Work Bonus is s 1073AA,
   * "income from work", and rent is not that) and never through deeming (deeming taxes a FINANCIAL
   * ASSET's balance; rent is the real, received amount, `RentOutHomeParams`'s own doc). Floored at
   * nil by the caller (`projection.ts`) before it reaches here — a net LOSS is not negative income to
   * Centrelink (Services Australia's own "Real estate income" page: "If you make a loss... we count
   * that income as zero... You can't offset this loss against... any other source of income").
   * Forwarded, untouched, exactly as `careVacatedHomeAssessment` is — this module reads no
   * `Household` field to get it and computes no figure of its own from it.
   */
  readonly otherAssessableIncomePerFortnight?: Cents;
  /**
   * **P14-13c — `SELL_HOME`'s sale-proceeds exemption (DSS Guide 4.6.3.90), `careVacatedHomeAssessment`'s
   * own footing.** The part of a sale's proceeds a household states is intended for a new home,
   * still within the 24-month window. Forwarded, untouched, to `splitAssets`'s own fourth parameter,
   * which carves it out of the Offset Account line and reports it back as `AssetSplit.saleProceedsSetAside`
   * — the CLAMPED figure this module then deems separately, at the lower rate only. Absent, nothing
   * changes: every Household that has never sold its home reads exactly as it always has.
   */
  readonly saleProceedsSetAside?: Cents;
}

export interface MeansTestResult {
  readonly freeArea: Cents;
  /** Combined Household income per fortnight, or combined Assessable Assets. Never per Person. */
  readonly assessed: Cents;
  /**
   * `assessed` less `freeArea`, clamped at zero — and, for the assets test only, floored to the
   * step point 1064-G7 requires (see `runAssetsTest`), so this is the figure `reduction` is
   * actually taken on, not the raw shortfall from the free area.
   */
  readonly excess: Cents;
  /** The reduction to the COMBINED rate. For a couple this is not halved — the rate is, later. */
  readonly reduction: Cents;
  /** The combined rate this test alone would allow. */
  readonly rate: Cents;
  /** Derived from the free area and the rate, never stored (T25). */
  readonly cutOff: Cents;
}

export interface AgePensionEntitlement {
  readonly date: IsoDate;
  readonly ratesEffective: string;
  readonly meansTestEffective: string;
  /**
   * **The day the parameters were last PUBLISHED, where this entitlement was computed from a set
   * carried forward from it** — and `undefined` where the set is the published one for this very
   * date, or was indexed forward from a stated series. Straight off
   * `AgePensionPeriod.standingFrom`, restated nowhere (P4-1e).
   *
   * It is a separate field rather than a comparison a caller could make for itself, for the reason
   * the period carries it: `ratesEffective` is **identical** on a carried month and on the month it
   * was carried from, because the carried set IS that set. Distance is not visible in the figures,
   * so it has to be visible in a field.
   */
  readonly standingFrom?: IsoDate;
  /**
   * `coupleCombined` for a couple — including where only one Person is of Age Pension age — and
   * `single` for an illness-separated couple, whose rate column is the single one.
   */
  readonly status: RateStatus;
  /** Present, and only ever `true`, for an illness-separated couple (P12-4). */
  readonly illnessSeparated?: true;
  /**
   * The COMBINED maximum the two tests taper: one Person's for a single Household, the couple
   * combined rate for a couple, and TWICE the single rate for an illness-separated couple.
   */
  readonly maximumPaymentRate: Cents;
  readonly incomeTest: MeansTestResult;
  readonly assetsTest: MeansTestResult;
  /** Which test produced the lower rate. Derived from the two, not assumed. */
  readonly bindingTest: 'income' | 'assets' | 'both' | 'neither';
  /** The lesser of the two tests, on combined means. The figure the halving is applied to. */
  readonly combinedRatePerFortnight: Cents;
  /** The combined rate halved — for a single Household, the combined rate itself. */
  readonly perPersonRatePerFortnight: Cents;
  /** Paid only to Persons who have reached Age Pension age. */
  readonly eligiblePersons: readonly string[];
  readonly householdRatePerFortnight: Cents;
  /** Any entitlement, however small, confers it (ADR-0003). HEAS at $0 does not — T32, and HEAS must not set this. */
  readonly pensionerConcessionCard: boolean;
  readonly assets: AssetSplit;
  readonly deeming: DeemedIncome;
  /**
   * **P14-13c — the sale-proceeds set-aside's OWN deeming, apart from `deeming` above.** DSS Guide
   * 4.6.3.90: "only the lower deeming rate will be applied to principal home sale proceeds during
   * the period of the assets test exemption" — a flat rate, not the pooled combined-threshold
   * calculation `deeming` runs over the household's OTHER financial assets. Present only where
   * `assets.saleProceedsSetAside` is present; folded into `incomeTest`'s assessed income the same
   * way `deeming.perFortnight` is.
   */
  readonly saleProceedsSetAsideDeemedPerFortnight?: Cents;
  readonly workBonus: readonly WorkBonusResult[];
}

/**
 * A **scope refusal** (register §4.4.1): the rule is retrieved and stated in full — T39, s 1121(5) —
 * and the figure it needs exists, as the market value T42 and ADR-0005 already take for HEAS
 * capacity. What is missing is **permission to connect them**, withheld by a user ruling on
 * 2026-09-04: *"House value is an input field. House value is not part of the means test."* So the
 * divergence between the law and v1 scope is knowing and is the **resolution** of T39, which that
 * ruling resolved in favour of T42; full assessment is Phase 14 work. Supplying a value to make it
 * compute is ADR-0005's reopen condition, not a fix by itself — see below.
 *
 * **Corrected on 2026-09-11 (P3-36).** The message named the wrong kind of refusal, and a fact that
 * stopped being true on 2026-09-04 within hours of being written. What it asserted about this
 * register's own records is what a **drift tripwire** asserts — `PublishedCapMismatchError` is one,
 * and it reads two records of that document against each other. This class reads `homeStatus` and
 * compares nothing, so it was never entitled to that claim even while the claim was true. It is
 * gone now: `test/core-age-pension.test.mjs` forbids it at the throw site, in these words or
 * reworded, and `test/core-age-pension-mutations.test.mjs` forbids it in the comments of both
 * modules that describe this case.
 *
 * **Narrowed on 2026-09-25 (P14-5a), on its own stated ground and no wider.** The reopen condition
 * ADR-0005 named — "let the means test read the same [value]... at the cliff date only" — is now
 * exercised for exactly the case ADR-0005's note anticipated: a home vacated for a CARE SITUATION
 * (SS Act s 11A(9)(b)), where the `ENTER_CARE` entry the household already stated carries a usable
 * figure. `AgePensionInput.careVacatedHomeAssessment`, supplied, stops this class firing — nothing
 * about the class or its message changes for the case it still covers: a `homeStatus` set to
 * `vacatedBeyondTwoYearExemption` with no `ENTER_CARE` behind it (`VACATE_HOME`, still P3-15, still
 * refused) throws exactly as before.
 */
export class UnvaluedAssessableHomeError extends RangeError {
  constructor() {
    super(
      'the home is past its two-year exemption and is therefore assessable under s 1121(5), but ' +
        'this model holds no value to assess it at: register T39 states that law, and T39 was ' +
        'resolved on 2026-09-04 in favour of T42 and ADR-0005, under which the market value is ' +
        'read by HEAS capacity alone and never enters assessableAssets. What is left is a knowing ' +
        'divergence between the law and v1 scope, and that divergence is the resolution — full ' +
        'assessment belongs to Phase 14 (register §4.4.1, TODO P3-15). This is a scope refusal: ' +
        'what is missing is permission to connect a value this model already holds elsewhere, so ' +
        'supplying it here is the ADR-0005 reopen condition and not a repair. Refusing to compute ' +
        'rather than silently under-assess.',
    );
    this.name = 'UnvaluedAssessableHomeError';
  }
}

/** The assets free area for the Household: homeowner, or homeowner + the extra allowable amount (T26). */
const assetsFreeArea = (period: AgePensionPeriod, couple: boolean, homeowner: boolean): Cents => {
  const base = couple
    ? period.meansTest.assetsFreeAreaHomeowner.coupleCombined
    : period.meansTest.assetsFreeAreaHomeowner.single;
  return homeowner ? base : nonHomeownerAssetsFreeArea(base, period.meansTest.extraAllowableAmount);
};

const clampedExcess = (assessed: Cents, freeArea: Cents): Cents =>
  assessed > freeArea ? subCents(assessed, freeArea) : toCents(0);

const clampedRate = (maximum: Cents, reduction: Cents): Cents =>
  reduction >= maximum ? toCents(0) : subCents(maximum, reduction);

/**
 * The maximum each test tapers, as ONE rate and how many Persons are paid it: the combined rate
 * once for a single or a couple, the single rate twice for an illness-separated couple. The cut-off
 * needs the split for rounding — the assets cut-off rounds each Person's excess before doubling it
 * (T25) — but `personsAtThatRate` is not that split: it counts who is PAID, not who the assets
 * excess is SHARED between. A couple living together has `personsAtThatRate: 1` (paid once,
 * combined) but the excess is still two Persons' assets and rounds two ways (SSA 1991 s1064
 * point 1064-G7); an illness-separated couple has `personsAtThatRate: 2` and rounds the same two
 * ways, being still one couple's combined means. `runAssetsTest` takes the excess split directly as
 * `couple`, never from this type.
 */
interface TaperedMaximum {
  readonly rate: Cents;
  readonly personsAtThatRate: 1 | 2;
}

const combinedMaximum = ({ rate, personsAtThatRate }: TaperedMaximum): Cents =>
  (rate * personsAtThatRate) as Cents;

/** 50c in the dollar over the free area, on COMBINED income, producing a COMBINED reduction. */
const runIncomeTest = (assessed: Cents, freeArea: Cents, maximum: TaperedMaximum): MeansTestResult => {
  const excess = clampedExcess(assessed, freeArea);
  const reduction = mulCents(excess, INCOME_TAPER);
  return Object.freeze({
    freeArea,
    assessed,
    excess,
    reduction,
    rate: clampedRate(combinedMaximum(maximum), reduction),
    cutOff: incomeTestCutOff(freeArea, maximum.rate, maximum.personsAtThatRate),
  });
};

/**
 * $3.00 a fortnight per $1,000 of Assessable Assets above the free area, taken against the
 * COMBINED rate — which is what reproduces the published couple cut-off: ($1,121,000 − $499,000)
 * ÷ 1,000 × $3.00 = $1,866.00, the couple combined total rate exactly.
 *
 * **The taper is NOT continuous — SSA 1991 s1064 point 1064-G7 (P13-4):** "In calculating a
 * person's assets excess under point 1064-G5 disregard any part of the excess that is not a
 * multiple of $250." The rule is per Person, and each member of a couple takes HALF the combined
 * excess (point 1064-G5), so flooring both halves to $250 and doubling is the same as flooring the
 * COMBINED excess to a multiple of $500 — for a couple, whether illness-separated or not, since
 * either way it is two Persons' means (see `TaperedMaximum` above). A single Person floors the
 * (unhalved) combined excess to a multiple of $250. Instalments are then rounded to the nearest
 * cent (SS(Admin) Act s54) by `mulCents`, same as everywhere else.
 *
 * This is discovered by cross-checking two Services Australia Payment Finder figures a $250
 * combined step cannot tell apart from a $500 one (`test/core-age-pension.test.mjs`,
 * `$608,054` / `$609,900`, 20 Sep 2026 homeowner couple) — see there for the worked numbers.
 * The register's cut-off derivation independently rounds **up** to the next $250 per Person
 * (§4.4, T25), so the published cut-off is the point the now-stepped taper actually reaches zero,
 * not merely an upper bound on it.
 */
const ASSETS_EXCESS_ROUNDING = toCents(250);

const flooredExcess = (excess: Cents, couple: boolean): Cents => {
  const step = (ASSETS_EXCESS_ROUNDING * (couple ? 2 : 1)) as Cents;
  return (excess - (excess % step)) as Cents;
};

const runAssetsTest = (
  assessed: Cents,
  freeArea: Cents,
  maximum: TaperedMaximum,
  couple: boolean,
): MeansTestResult => {
  const excess = flooredExcess(clampedExcess(assessed, freeArea), couple);
  const reduction = mulCents(excess, ASSETS_TAPER_PER_THOUSAND / 1_000);
  return Object.freeze({
    freeArea,
    assessed,
    excess,
    reduction,
    rate: clampedRate(combinedMaximum(maximum), reduction),
    cutOff: assetsTestCutOff(freeArea, maximum.rate, maximum.personsAtThatRate),
  });
};

/**
 * The one halving in the module. A couple's combined rate becomes each Person's rate here and
 * nowhere else; for a single Household there is nothing to halve.
 *
 * An odd number of cents does not halve exactly, and the register gives no rounding rule for the
 * split. `mulCents` rounds half away from zero, so twice the per-Person rate can exceed the
 * combined rate by a cent. The combined figure is the one the means test produced and is the one
 * to trust; the per-Person figure is a presentation of it. **Unverified**, and a cent a fortnight.
 */
const halve = (combined: Cents, couple: boolean): Cents => (couple ? mulCents(combined, 0.5) : combined);

/**
 * Age Pension entitlement for a Household on a date.
 *
 * Combined means, both tests, the lesser, then halved. In that order, once.
 */
export const agePensionEntitlement = (input: AgePensionInput): AgePensionEntitlement => {
  const date = assertIsoDate(input.date);
  const { household } = input;
  const period = agePensionPeriodAt(date, input.indexationSeries);
  const couple = isCouple(household);
  const illnessSeparated = input.illnessSeparated === true;
  if (illnessSeparated && !couple) {
    throw new RangeError('an illness separation needs a couple: this Household has one Person, and a separation takes two');
  }

  const assets = splitAssets(household, date, input.careVacatedHomeAssessment, input.saleProceedsSetAside);
  if (assets.homeIsAssessableButUnvalued) throw new UnvaluedAssessableHomeError();

  // Couple thresholds apply even where only one Person is of Age Pension age (§4.8). An
  // illness-separated couple is the third path (P12-4): every free area, the deeming threshold and
  // both tapers stay the COUPLE's, on combined means, but the maximum is the SINGLE rate paid to
  // each of two Persons — the "× 2 on the single rate" `incomeTestCutOff` and `assetsTestCutOff`
  // already carry, and the register's published illness-separated cut-offs reproduce.
  const status: RateStatus = couple && !illnessSeparated ? 'coupleCombined' : 'single';
  const tapered: TaperedMaximum = {
    rate: maximumPaymentRate(period, status, input.rentAssistancePerFortnight ?? toCents(0)),
    personsAtThatRate: illnessSeparated ? 2 : 1,
  };
  const maximum = combinedMaximum(tapered);

  // --- Combined assessable income ---------------------------------------------------------------
  // Work Bonus first, per Person, because it is applied to eligible income BEFORE the income test
  // (T29). It reaches the Household only by reducing what each Person contributes to this sum.
  const workBonus = household.persons.map((person) =>
    applyWorkBonus(person, hasReachedAgePensionAge(person, date)),
  );
  const employmentIncome = workBonus.reduce<Cents>(
    (sum, result) => addCents(sum, result.assessedEmploymentIncome),
    toCents(0),
  );

  // Deeming is run once, on the Household's combined financial assets against the combined
  // threshold — not per Person and summed, which would apply the lower rate twice.
  const deemingRates = resolveDeemingRates(date, input.deemingRates);
  const deeming = deemedIncome(assets.deemedFinancialAssets, deemingThreshold(period, couple), deemingRates);

  // **P14-13c — the sale-proceeds set-aside, deemed SEPARATELY, at the LOWER rate only, whatever the
  // household's other assets and the pooled threshold above come to** (DSS Guide 4.6.3.90). Nil,
  // and the field is omitted below, wherever `assets.saleProceedsSetAside` is absent — every
  // Household that has never sold its home is untouched by this line.
  const saleProceedsSetAsideDeemedAnnual =
    assets.saleProceedsSetAside === undefined ? undefined : mulCents(assets.saleProceedsSetAside, deemingRates.lower);
  const saleProceedsSetAsideDeemedPerFortnight =
    saleProceedsSetAsideDeemedAnnual === undefined ? undefined : mulCents(saleProceedsSetAsideDeemedAnnual, 1 / 26);
  // **P14-13 — `RENT_OUT_HOME`'s net rent, ADDED DIRECTLY, never through `employmentIncome` or
  // `deeming`** — see `AgePensionInput.otherAssessableIncomePerFortnight`'s own doc for why.
  const combinedAssessableIncome = addCents(
    addCents(addCents(employmentIncome, deeming.perFortnight), saleProceedsSetAsideDeemedPerFortnight ?? toCents(0)),
    input.otherAssessableIncomePerFortnight ?? toCents(0),
  );

  // --- Both tests, unconditionally --------------------------------------------------------------
  const incomeFreeArea = couple
    ? period.meansTest.incomeFreeArea.coupleCombined
    : period.meansTest.incomeFreeArea.single;
  const incomeTest = runIncomeTest(combinedAssessableIncome, incomeFreeArea, tapered);
  const assetsTest = runAssetsTest(
    assets.assessableAssets,
    assetsFreeArea(period, couple, assets.homeowner),
    tapered,
    couple,
  );

  // --- The lesser, then halved ------------------------------------------------------------------
  const combinedRatePerFortnight = (
    incomeTest.rate < assetsTest.rate ? incomeTest.rate : assetsTest.rate
  ) as Cents;
  const bindingTest =
    incomeTest.rate === assetsTest.rate
      ? incomeTest.rate === maximum
        ? 'neither'
        : 'both'
      : incomeTest.rate < assetsTest.rate
        ? 'income'
        : 'assets';

  const perPersonRatePerFortnight = halve(combinedRatePerFortnight, couple);
  const eligiblePersons = household.persons
    .filter((person) => hasReachedAgePensionAge(person, date))
    .map((person) => person.name);
  const householdRatePerFortnight = (perPersonRatePerFortnight * eligiblePersons.length) as Cents;

  return Object.freeze({
    date,
    ratesEffective: period.ratesEffective,
    meansTestEffective: period.meansTestEffective,
    ...(period.standingFrom === undefined ? {} : { standingFrom: period.standingFrom }),
    status,
    ...(illnessSeparated ? { illnessSeparated: true as const } : {}),
    maximumPaymentRate: maximum,
    incomeTest,
    assetsTest,
    bindingTest,
    combinedRatePerFortnight,
    perPersonRatePerFortnight,
    eligiblePersons: Object.freeze(eligiblePersons),
    householdRatePerFortnight,
    pensionerConcessionCard: householdRatePerFortnight > 0,
    assets,
    deeming,
    ...(saleProceedsSetAsideDeemedPerFortnight === undefined ? {} : { saleProceedsSetAsideDeemedPerFortnight }),
    workBonus: Object.freeze(workBonus),
  });
};
