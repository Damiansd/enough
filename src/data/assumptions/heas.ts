// Home Equity Access Scheme — register §5. The facility defaults off (ADR-0004).
//
// Four things in here are 26× or 10,000× wrong if read casually, and the register says so:
//
//   * the 150% cap is against the FORTNIGHTLY maximum payment rate; the 50% advance cap is
//     against the ANNUAL one (T33). Reading the second as fortnightly understates a Person's
//     lump sum by a factor of 26 — $452.60 against $11,767.60;
//   * capacity keys to the YOUNGER member's age at last birthday, recalculated once a year on
//     that birthday — a step function, while the debt compounds fortnightly (T36);
//   * the security value rounds DOWN to $10,000, per Person on that Person's share, and is nil
//     below $10,000 (T37);
//   * interest compounds at `annual ÷ 26`, not `annual × 14/365` (T40), and the draw is added
//     to the balance before interest is charged.
//
// A fifth (P9-2b, T136): during a lump-sum advance's own 26-fortnight window, the fortnightly loan
// is `max(0, (annual headroom − advances taken in the window) ÷ 26)` — ANNUALISE first, THEN divide
// by 26. Reading register §5.3's table row literally (`1.5 × MPR − advances_taken`, no annualising
// step) subtracts a whole lump sum from a FORTNIGHTLY rate and is a 26× error in the household's
// favour; the row is struck in the register, not implemented (`heasFortnightlyDrawDuringAdvancePeriod`).
//
// No dollar figure from the Age Pension lives here. Everything that needs a Maximum Payment Rate
// takes it as an argument, so it comes from `agePension.ts` and reindexes with it (register §5.3).
//
// The home market value that feeds the security value is a user Setting with no source and no
// confidence (T42, ADR-0005 amendment note). Everything computed downstream of it — Maximum Loan
// Available, headroom, projected debt — is an estimate and must be displayed as one.
import { toCents } from '../../core/money.js'; // `.js` is correct in a `.ts` file — see tsconfig.json
import type { Cents } from '../../core/money.js';
import { deepFreeze } from './types.js';
import type { Assumption, Constant, IsoDate, Money, Rate } from './types.js';

const SS_ACT = {
  source: 'Social Security Act 1991 Pt 3.12 Div 4 (ss 1133–1144AA)',
  retrieved: '2026-09-03',
  confidence: 'primary-verified',
  registerSection: '§5.1',
} as const;

const SS_GUIDE = {
  source: 'DSS Guide to Social Security Law 3.4.5 (Wayback Machine — guides.dss.gov.au returns 403)',
  retrieved: '2026-09-03',
  confidence: 'primary-via-archive',
  registerSection: '§5.1',
} as const;

const AGE_COMPONENT_INSTRUMENT = {
  source: 'F2019L00420 s 4(2) (Compilation No. 1, 11 Jul 2026) · Services Australia age component page · SS Guide 3.4.5.30',
  retrieved: '2026-09-03',
  confidence: 'primary-verified',
  registerSection: '§5.2',
} as const;

const INTEREST_INSTRUMENT = {
  source: 'Social Security (Home Equity Access Scheme – Rate of Compound Interest) Determination 2026 (F2026L00945), made 6 Jul 2026',
  retrieved: '2026-09-03',
  confidence: 'primary-verified',
  registerSection: '§5.4',
} as const;

// --- The age component table — F2019L00420 s 4(2), all 36 rows ---------------------------------
//
// Dollars of maximum loan per $10,000 of security value. A legislative instrument with NO
// indexation mechanism at all: unchanged since 1 July 2019, and the only amendment ever made
// (the 2026 scheme rename, F2026L00944) touched not one number. Ship it hard-coded, never as a
// user-editable Setting.

export const HEAS_AGE_COMPONENT_MINIMUM_AGE = 55;
export const HEAS_AGE_COMPONENT_MAXIMUM_AGE = 90;

const AGE_COMPONENT_TABLE: Readonly<Record<number, Cents>> = Object.freeze({
  55: toCents(1_710), // and each earlier year
  56: toCents(1_780),
  57: toCents(1_850),
  58: toCents(1_920),
  59: toCents(2_000),
  60: toCents(2_080),
  61: toCents(2_160),
  62: toCents(2_250),
  63: toCents(2_340),
  64: toCents(2_430),
  65: toCents(2_530),
  66: toCents(2_630),
  67: toCents(2_740),
  68: toCents(2_850),
  69: toCents(2_960),
  70: toCents(3_080),
  71: toCents(3_200),
  72: toCents(3_330),
  73: toCents(3_460),
  74: toCents(3_600),
  75: toCents(3_750),
  76: toCents(3_900),
  77: toCents(4_050),
  78: toCents(4_210),
  79: toCents(4_380),
  80: toCents(4_560),
  81: toCents(4_740),
  82: toCents(4_930),
  83: toCents(5_130),
  84: toCents(5_330),
  85: toCents(5_550),
  86: toCents(5_770),
  87: toCents(6_000),
  88: toCents(6_240),
  89: toCents(6_490),
  90: toCents(6_750), // and each later year
});

/**
 * The age component for an age at last birthday. Both endpoints are open-ended in the
 * instrument: every age below 56 takes the 55 value, every age above 89 takes the 90 value.
 *
 * T36 — this must be the YOUNGER member's age at last birthday, and it is recalculated once a
 * year on that birthday. Age next birthday, the older partner's age, or continuous growth all
 * overstate available headroom.
 */
export const heasAgeComponent = (ageAtLastBirthday: number): Cents => {
  const clamped = Math.min(
    Math.max(Math.floor(ageAtLastBirthday), HEAS_AGE_COMPONENT_MINIMUM_AGE),
    HEAS_AGE_COMPONENT_MAXIMUM_AGE,
  );
  const component = AGE_COMPONENT_TABLE[clamped];
  if (component === undefined) throw new RangeError(`no HEAS age component for age ${ageAtLastBirthday}`);
  return component;
};

// --- Capacity — SS Act s 1135A ------------------------------------------------------------------

const SECURITY_ROUNDING = toCents(10_000);

/** `home market value − outstanding Owner-Occupied Mortgage − nominated amount`. */
export const heasSecurityValue = (
  homeMarketValue: Cents,
  owedOnOwnerOccupiedMortgage: Cents,
  nominatedAmount: Cents = toCents(0),
): Cents => Math.max(0, homeMarketValue - owedOnOwnerOccupiedMortgage - nominatedAmount) as Cents;

/**
 * SS Act s 1135A(1): `age component × (value of real assets ÷ 10,000)`, where the value rounds
 * DOWN to the next lower multiple of $10,000 (s 1135A(2)(a)) and is nil below $10,000
 * (s 1135A(2)(b)). Round-to-nearest overstates capacity — T37.
 */
export const maximumLoanAvailable = (ageComponent: Cents, securityValue: Cents): Cents => {
  if (securityValue < SECURITY_ROUNDING) return toCents(0);
  return (ageComponent * Math.floor(securityValue / SECURITY_ROUNDING)) as Cents;
};

/**
 * Each Person has their own loan against their own share of the security, both using the
 * younger partner's age component. A 50-50 arrangement operates where one Person owns more than
 * half, and where a Person is qualified for but not receiving an income support payment.
 *
 * The rounding happens per Person on the per-Person share (T37): modelling once at Household
 * level errs by up to one age component per Person — about $2,700 at 67.
 */
export const personMaximumLoanAvailable = (
  ageComponentOfYoungerPerson: Cents,
  securityValue: Cents,
  ownershipShare = 0.5,
  nominatedAmount: Cents = toCents(0),
): Cents =>
  maximumLoanAvailable(
    ageComponentOfYoungerPerson,
    Math.max(0, securityValue * ownershipShare - nominatedAmount) as Cents,
  );

// --- Draw modes — SS Act ss 1134, 1134A (T33) ---------------------------------------------------

const FORTNIGHTLY_CAP_MULTIPLE = 1.5;
const ADVANCE_CAP_MULTIPLE = 0.5;
const FORTNIGHTS_PER_YEAR = 26;

/** 150% of the maximum payment rate, on a FORTNIGHTLY basis (s 1134(1A)(a)(i)). */
export const heasFortnightlyCap = (maximumPaymentRateFortnightly: Cents): Cents =>
  toCents((FORTNIGHTLY_CAP_MULTIPLE * maximumPaymentRateFortnightly) / 100);

/**
 * The fortnightly loan is the DIFFERENCE between the 150% cap and the Age Pension actually
 * received: a full-rate pensioner can draw only the remaining 50%, a $0-entitlement Person the
 * full 150%.
 */
export const heasFortnightlyDraw = (
  maximumPaymentRateFortnightly: Cents,
  agePensionReceivedFortnightly: Cents,
): Cents => Math.max(0, heasFortnightlyCap(maximumPaymentRateFortnightly) - agePensionReceivedFortnightly) as Cents;

/**
 * 50% of the maximum payment rate on an ANNUAL basis (s 1134A(3)(a)) — T33. Misreading this as
 * fortnightly is a factor-of-26 error: $452.60 instead of $11,767.60 for a member of a couple.
 */
export const heasAdvanceCap = (maximumPaymentRateFortnightly: Cents): Cents =>
  toCents((ADVANCE_CAP_MULTIPLE * maximumPaymentRateFortnightly * FORTNIGHTS_PER_YEAR) / 100);

/**
 * What a Person may actually take now: the annual advance cap less advances already taken in the
 * rolling 26-fortnight period (s 1134A(3)(b)), and also capped by the maximum loan available less
 * the current debt (s 1134A(3)(c)).
 */
export const heasAdvanceAvailable = (
  maximumPaymentRateFortnightly: Cents,
  advancesTakenInPeriod: Cents,
  personMaximumLoan: Cents,
  currentDebt: Cents,
): Cents =>
  Math.max(
    0,
    Math.min(
      heasAdvanceCap(maximumPaymentRateFortnightly) - advancesTakenInPeriod,
      personMaximumLoan - currentDebt,
    ),
  ) as Cents;

/**
 * **The fortnightly loan DURING an active advance period (s 1134(1A)(b)) — T136, P9-2b, resolving
 * register §5.3's ambiguity in favour of the pseudocode, not the table row.**
 *
 * `fortnightlyDrawBeforeAdvance` is `heasFortnightlyDraw`'s own result — `max(0, 1.5×MPR_fn −
 * pension_fn)`, this Person's ordinary draw before any advance touches it. Annualising it and
 * subtracting the whole window's advances, THEN dividing back by 26, is the only reading that
 * survives Services Australia's own worked example ("George": $589.35/ft, $15,323.10/yr, a $10,000
 * advance, $5,323.10 ÷ 26 = $204.73/ft for the SAME 26 fortnights, `test/assumptions-heas.test.mjs`
 * pins it to the cent; that example is Services Australia's page as it stood before 20 Sep 2026.
 * The page now shows George on the new maximum rate, and that example is pinned beside it in the
 * same test file) — the table row's literal, un-annualised `1.5×MPR − advances_taken` would
 * floor George at bare MPR for the whole 26 fortnights, forfeiting the entire year's entitlement for
 * a $10,000 advance instead of the $384.62/ft this formula actually costs him.
 *
 * **The literal Act text differs from this reading (checked 2026-09-29, compilation C2026C00336).**
 * s 1134(1A)(b)(i) says "the greater of the maximum payment rate and 1.5 × the maximum payment rate
 * less any amounts of HEAS advance payment received … in relation to the period" — un-annualised,
 * and floored at the maximum payment rate, where this function annualises the headroom, subtracts
 * the advances, divides by 26 and floors at zero. Services Australia's worked examples (George,
 * Olli) and DSS Guide 3.4.5.40 (Keith) all follow the annualised ÷ 26 reading, so that is what is
 * modelled: operational practice, not the section's literal wording. The two only differ where the
 * advance is large.
 *
 * **Verified only where `fortnightlyDrawBeforeAdvance` already reflects the "greater of MPR" floor
 * doing no work** — a full-rate pensioner (`pension_fn ≥ MPR_fn`) or a nil-entitlement Person, the
 * two cases Services Australia's own published examples (George, Olli) cover. `heasFortnightlyDraw`
 * is `max(0, …)` already, so `pension_fn + heas_fn_during_advance ≥ pension_fn ≥ MPR_fn` holds with
 * no further top-up needed. **UNCONFIRMED for a genuine part-rate pensioner** (`0 < pension_fn <
 * MPR_fn`) — whether the Act's floor then lifts the COMBINED payment to MPR (a windfall) or floors
 * only the loan component at zero is not settled by either worked example or by AustLII's own text.
 * `projection.ts` refuses that case by name rather than guess (T137).
 */
export const heasFortnightlyDrawDuringAdvancePeriod = (
  fortnightlyDrawBeforeAdvance: Cents,
  advancesTakenInPeriod: Cents,
): Cents => {
  const headroomAnnual = fortnightlyDrawBeforeAdvance * FORTNIGHTS_PER_YEAR;
  return toCents(Math.max(0, headroomAnnual - advancesTakenInPeriod) / 100 / FORTNIGHTS_PER_YEAR);
};

// --- Interest — SS Act s 1135, F2026L00945 (T40) ------------------------------------------------

const INTEREST_RATE = 0.0395;

/**
 * **The published worked example T40 turns on (P4-18, 2026-09-21) — the evidence, not a restatement.**
 *
 * `HEAS.interest.compoundingPerYear` asserts that the periodic rate is `annual ÷ 26` and not
 * `annual × 14/365`. Until today the whole evidentiary basis for that assertion lived inside the
 * words of the doc comment below and of the register's T40 row: a balance and two pennies, with no
 * source, no retrieval date and no confidence between them. This is that example, stamped.
 *
 * **Services Australia's "George":** three fortnights, $750 drawn at the start of each, interest
 * charged on the balance AFTER the draw is added. Every figure below is published.
 *
 * **It discriminates, and that is the point of recording it rather than the conclusion.** Fortnight
 * 1 is worth nothing — at 3.95% both conventions round to the same cent. Fortnights 2 and 3 decide
 * it: `annual ÷ 26` gives the published $2.28 and $1,503.42, and `annual × 14/365` gives $2.27 and
 * $1,503.41. `test/assumptions-heas.test.mjs` computes both from `HEAS.interest.rate.value` and the
 * stamped balance, so the example is shown to settle the convention rather than merely accompanying
 * it, and a change to the rate record that broke the derivation would fail there.
 *
 * ⚠️ **The same example at the SUPERSEDED 4.50% rate went the other way.** See
 * `supersededRates['2020-01-01']` — this is the first thing to read before anyone backtests.
 */
const INTEREST_WORKED_EXAMPLE = {
  source:
    'Services Australia — "Interest rate for loans under the Home Equity Access Scheme", Examples of compound interest ("George"), page last updated 26 Jul 2024',
  retrieved: '2026-09-21',
  confidence: 'primary-verified',
  registerSection: '§5.4',
  kind: 'config',
  effective: '2022-01-01',
  value: Object.freeze({
    drawPerFortnight: toCents(750),
    balanceAfterFortnight1: toCents(751.14),
    balanceBeforeInterestFortnight2: toCents(1_501.14),
    publishedInterestFortnight2: toCents(2.28),
    balanceAfterFortnight2: toCents(1_503.42),
    balanceAfterFortnight3: toCents(2_256.84),
  }),
  note: 'T40 — the arithmetic that pins `annual ÷ 26` against `annual × 14/365`. Stamped against the 3.95% rate because that is the rate it was worked at; it is evidence for the convention and not for the rate. Fortnight 1 does not discriminate at this rate; fortnights 2 and 3 do, both toward the 26ths. The counterfactual figures are deliberately NOT stored — they are computed from the rate record, because a stored counterfactual could agree with a wrong rate.',
} satisfies Assumption<
  Readonly<{
    drawPerFortnight: Cents;
    balanceAfterFortnight1: Cents;
    balanceBeforeInterestFortnight2: Cents;
    publishedInterestFortnight2: Cents;
    balanceAfterFortnight2: Cents;
    balanceAfterFortnight3: Cents;
  }>
>;

/**
 * **The SUPERSEDED rate, 1 Jan 2020 – 31 Dec 2021 (P4-18, 2026-09-21).**
 *
 * 4.50% existed until today only inside the words of `interest.rate.note`. It is a fact of the same
 * shape as `DEEMING_DETERMINATIONS['2020-05-01']` in `agePension.ts` — a superseded determination
 * that matters only if the model ever backtests — and the asymmetry between the two files is what
 * this record closes. Unlike the deeming row, this one could be read primarily: the instrument is
 * short, and its s 5 says the rate in terms.
 *
 * ⚠️ **AND IT CARRIES A WARNING THE PROSE NEVER DID.** Services Australia published the SAME
 * worked example at this rate, and it does not come out on T40's convention. See
 * `SUPERSEDED_WORKED_EXAMPLE` immediately below, which is that example, stamped. **A backtest
 * into this rate period must not assume T40's convention held there.**
 */
/**
 * **The SAME worked example at the superseded rate — and it goes the other way (P4-18, 2026-09-21).**
 *
 * Services Australia ran "George" at 4.50% too, on the page that carried the rate above. Recorded
 * here because it is the single most important thing anyone backtesting this scheme could be told,
 * and because the alternative was to write the figures into a sentence — which is the whole defect
 * P4-18 exists to close, and this directory's own canary caught the attempt.
 *
 * **What it shows.** Fortnights 1 and 2 come out on `annual × 14/365` and CANNOT be produced by
 * `annual ÷ 26`: $751.29 against the 26ths' $751.30, and $2.59 of interest against their $2.60.
 * Fortnight 3 then goes the other way — its published $3.90 is the 26ths answer, the 365ths giving
 * $3.89. **So the page was internally inconsistent**, and the evidence for 2020–21 is genuinely
 * split rather than simply against us. `test/assumptions-heas.test.mjs` derives every one of those
 * from the stamped superseded rate.
 *
 * **What it does NOT show: that T40 is wrong.** The 3.95% example is internally consistent and
 * comes out on the 26ths at every fortnight that discriminates, and that is the rate the model
 * runs at. What this record establishes is the SCOPE of T40's pin, which was never stated: it is
 * pinned to the current rate's example, and it is not evidence about any earlier rate period.
 */
const SUPERSEDED_WORKED_EXAMPLE = {
  source:
    'Services Australia — "Interest rates for loans" (Pension Loans Scheme), Example of the loan balance ("George"), page last updated 28 Jan 2020; read from the Internet Archive capture of 2020-09-22 (web.archive.org/web/20200922170327)',
  retrieved: '2026-09-21',
  confidence: 'primary-via-archive',
  registerSection: '§5.4',
  kind: 'config',
  effective: '2020-01-01',
  value: Object.freeze({
    drawPerFortnight: toCents(750),
    balanceAfterFortnight1: toCents(751.29),
    balanceBeforeInterestFortnight2: toCents(1_501.29),
    publishedInterestFortnight2: toCents(2.59),
    balanceAfterFortnight2: toCents(1_503.88),
    publishedInterestFortnight3: toCents(3.9),
    balanceAfterFortnight3: toCents(2_257.78),
  }),
  note: 'SUPERSEDED and INTERNALLY INCONSISTENT — recorded for exactly that reason. Fortnights 1 and 2 are the `annual × 14/365` answers; fortnight 3 is the `annual ÷ 26` one. Read it before backtesting, and do not read it as evidence about the current rate, whose own example (`publishedWorkedExample`) is consistent throughout. The page has since been replaced, so this is primary-via-archive.',
} satisfies Assumption<
  Readonly<{
    drawPerFortnight: Cents;
    balanceAfterFortnight1: Cents;
    balanceBeforeInterestFortnight2: Cents;
    publishedInterestFortnight2: Cents;
    balanceAfterFortnight2: Cents;
    publishedInterestFortnight3: Cents;
    balanceAfterFortnight3: Cents;
  }>
>;

const SUPERSEDED_INTEREST_RATES: Readonly<Record<IsoDate, Rate>> = {
  '2020-01-01': {
    source:
      'Social Security (Pension Loans Scheme – Rate of Compound Interest) Determination 2019 (F2019L01613), s 5, made 10 Dec 2019, commencing 1 Jan 2020; repealed 1 Jan 2022 by F2021N00323 (Federal Register of Legislation)',
    retrieved: '2026-09-21',
    confidence: 'primary-verified',
    registerSection: '§5.4',
    kind: 'config',
    effective: '2020-01-01',
    value: 0.045,
    note: 'Superseded. s 5: "For subsection 1135(4) of the Social Security Act 1991, the rate of compound interest is 4.50 per cent per annum." In force 1 Jan 2020 to 31 Dec 2021; the scheme was still called the Pension Loans Scheme. Matters only if the model ever backtests (register O13, the same ground as the 2020 deeming determination) — and see the warning above: Services Australia\'s own example at this rate does NOT support T40\'s compounding convention.',
  },
};

/**
 * One fortnight of the debt: the draw is added to the balance FIRST, then interest is charged at
 * `annual ÷ 26`. Pinned by arithmetic against Services Australia's own worked example — at a
 * $1,501.14 balance, `r/26` gives the published $2.28 and `r × 14/365` gives $2.27. The example is a
 * record of its own from 2026-09-21 (`heas.interest.publishedWorkedExample`), which is where the
 * evidence for that sentence now lives; only the $2.27 counterfactual is unstored, and it is
 * computed from the rate record in `test/assumptions-heas.test.mjs`.
 *
 * Interest keeps compounding after the maximum loan available is reached, after exit, and after
 * death (T41). Hitting the maximum is an automatic exit, not a default: payments stop, the
 * balance does not.
 *
 * Whether Services Australia rounds per fortnight or carries full precision is open (register
 * O22), so the model will not tie to a Centrelink statement to the cent. This rounds per
 * fortnight.
 */
export const heasAccrueFortnight = (
  balance: Cents,
  draw: Cents = toCents(0),
  annualRate: number = INTEREST_RATE,
): Cents => toCents(((balance + draw) * (1 + annualRate / FORTNIGHTS_PER_YEAR)) / 100);

export const HEAS = deepFreeze({
  ageComponent: {
    table: {
      ...AGE_COMPONENT_INSTRUMENT,
      kind: 'constant',
      effective: '2019-07-01',
      value: AGE_COMPONENT_TABLE,
      note: 'All 36 rows, agreed to the cent by three independent sources. No indexation mechanism exists — this is a constant, not a config row, and not a Setting.',
    } satisfies Constant<Readonly<Record<number, Cents>>>,
    lookup: {
      ...AGE_COMPONENT_INSTRUMENT,
      kind: 'config-derived',
      effective: '2019-07-01',
      value: heasAgeComponent,
      derivation: 'the table row for the age at last birthday, clamped: every age below 56 takes the 55 row, every age above 89 takes the 90 row',
      note: 'T36 — the YOUNGER member of the couple, at last birthday, recalculated once a year on that birthday.',
    },
    whoseAge: {
      ...SS_ACT,
      kind: 'constant',
      everyYear: true,
      value: 'the younger member of the couple, at last birthday',
      note: 'F2019L00420 s 4(1)(b); SS Guide 3.4.5.30; Services Australia — four sources agree.',
    } satisfies Constant<string>,
    recalculationCadence: {
      ...SS_GUIDE,
      kind: 'constant',
      everyYear: true,
      value: 'once every 12 months, on the younger Person birthday',
      note: 'T36 — a step function, while the debt compounds fortnightly. Continuous capacity growth overstates headroom.',
    } satisfies Constant<string>,
  },

  capacity: {
    formula: {
      ...SS_ACT,
      kind: 'config-derived',
      effective: '2019-07-01',
      value: maximumLoanAvailable,
      derivation: 'age component × floor(security value ÷ $10,000); nil where the security value is below $10,000',
      note: 'SS Act s 1135A(1)–(2). Applied per Person on that Person share of the security (T37).',
    },
    securityRounding: {
      ...SS_ACT,
      kind: 'constant',
      everyYear: true,
      value: SECURITY_ROUNDING,
      note: 'T37 — rounds DOWN. Round-to-nearest overstates capacity, and the per-Person rounding costs up to $10,000 of counted security per Person.',
    } satisfies Money,
    nilFloor: {
      ...SS_ACT,
      kind: 'constant',
      everyYear: true,
      value: SECURITY_ROUNDING,
      note: 's 1135A(2)(b) — real assets below $10,000 give nil capacity. The "Nil Real Assets Determination" does not exist under that name (register §5.10); this is one of the two mechanics that phrase might have denoted.',
    } satisfies Money,
    securityValue: {
      ...SS_ACT,
      kind: 'config-derived',
      effective: '2019-07-01',
      value: heasSecurityValue,
      derivation: 'home market value − outstanding Owner-Occupied Mortgage − nominated amount',
      note: 'The home market value is a Setting with no source and no confidence (T42). Everything downstream of it is an estimate and may not be displayed beside sourced figures as though it were not.',
    },
    coupleStructure: {
      ...SS_GUIDE,
      kind: 'constant',
      everyYear: true,
      value: 'each Person has their own loan against their own share, both using the younger partner age component; a 50-50 arrangement operates where one Person owns more than half',
    } satisfies Constant<string>,
    nominatedAmount: {
      ...SS_ACT,
      kind: 'constant',
      everyYear: true,
      value: 'a voluntary equity carve-out, changeable at any time by signed written request (ss 1136, 1137)',
    } satisfies Constant<string>,
    minimumInsurancePercentage: {
      ...SS_ACT,
      kind: 'constant',
      everyYear: true,
      value: 0.9,
      note: 'SS Act s 1133(1)(cc) requires only "adequate and appropriate insurance"; the 90% figure is DSS Guide to Social Security Law 3.4.5.10 (buildings insured for at least 90% of value against standard events), not the statute. Register name: HEAS_MIN_INSURANCE_PCT.',
    } satisfies Rate,
    eligibleProperty: {
      ...SS_ACT,
      kind: 'constant',
      everyYear: true,
      value: 'any Australian real property; NOT retirement village units without freehold title',
    } satisfies Constant<string>,
  },

  drawModes: {
    fortnightlyCapMultiple: {
      ...SS_ACT,
      kind: 'constant',
      everyYear: true,
      value: FORTNIGHTLY_CAP_MULTIPLE,
      registerSection: '§5.3',
      note: 'T33 — 1.5 × the maximum payment rate on a FORTNIGHTLY basis (s 1134(1A)(a)(i)). The cap counts the Age Pension already received: the loan is the difference.',
    } satisfies Rate,
    advanceCapMultiple: {
      ...SS_ACT,
      kind: 'constant',
      everyYear: true,
      value: ADVANCE_CAP_MULTIPLE,
      registerSection: '§5.3',
      note: 'T33 — 0.5 × the maximum payment rate on an ANNUAL basis (s 1134A(3)(a)). Reading this as fortnightly understates the lump sum by a factor of 26.',
    } satisfies Rate,
    maximumAdvancesPerPeriod: {
      ...SS_ACT,
      kind: 'constant',
      everyYear: true,
      value: 2,
      registerSection: '§5.3',
    } satisfies Assumption<number>,
    advancePeriodFortnights: {
      ...SS_ACT,
      kind: 'constant',
      everyYear: true,
      value: FORTNIGHTS_PER_YEAR,
      registerSection: '§5.3',
      note: 'Rolling from the day the first advance was worked out (s 1133AA(1)) — per Person, not a calendar or financial year.',
    } satisfies Assumption<number>,
    maximumPaymentRateDefinition: {
      ...SS_ACT,
      kind: 'constant',
      everyYear: true,
      value: 'maximum basic rate + Pension Supplement + Energy Supplement + Rent Assistance (Pension Rate Calculator A, Module A, Step 4)',
      registerSection: '§5.3',
      note: 'Taken from the Age Pension assumption, which reindexes 20 Mar and 20 Sep. No HEAS constant duplicates a dollar figure from it.',
    } satisfies Constant<string>,
    fortnightlyRateDuringAnAdvancePeriod: {
      ...SS_ACT,
      kind: 'config-derived',
      effective: '2019-07-01',
      value: heasFortnightlyDrawDuringAdvancePeriod,
      derivation: 'max(0, (annual headroom − advances taken in the rolling 26-fortnight period) ÷ 26), where annual headroom = heasFortnightlyDraw(…) × 26',
      registerSection: '§5.3',
      note: 'T136 — RESOLVED 2026-09-25 (P9-2b) in favour of the pseudocode, against register §5.3\'s table row, which is a 26× error if read literally (struck in place, register §5.3). Pinned to the cent against Services Australia\'s own "George" example. Verified for full-rate and nil-entitlement Persons only (both published examples); the genuine part-rate-pensioner floor case is UNCONFIRMED and `projection.ts` refuses it by name (T137) rather than guess.',
    },
  },

  interest: {
    rate: {
      ...INTEREST_INSTRUMENT,
      kind: 'config',
      effective: '2022-01-01',
      value: INTEREST_RATE,
      note: 'Unchanged since 1 Jan 2022 (was 4.50% from 1 Jan 2020 — a record of its own from 2026-09-21, `heas.interest.supersededRates`, which also carries the warning that Services Australia\'s worked example at that rate does not support T40\'s compounding convention). Set by the Minister by legislative instrument under s 1135(4) — administrative, disallowable, and able to move without notice, which is why this is config and not a constant. F2026L00945 repealed and remade the 2021 determination without changing the rate; cite it, not the 2021 instrument.',
    } satisfies Rate,
    supersededRates: SUPERSEDED_INTEREST_RATES,
    publishedWorkedExample: INTEREST_WORKED_EXAMPLE,
    supersededWorkedExample: SUPERSEDED_WORKED_EXAMPLE,
    compoundingPerYear: {
      ...INTEREST_INSTRUMENT,
      kind: 'constant',
      everyYear: true,
      value: FORTNIGHTS_PER_YEAR,
      note: 'T40 — the periodic rate is annual ÷ 26, NOT annual × 14/365. Pinned by arithmetic against a published worked example, which is `interest.publishedWorkedExample` from 2026-09-21 — this row no longer asserts a pinning whose evidence it does not carry. The pin holds against the 3.95% example only; see `interest.supersededRates`.',
    } satisfies Assumption<number>,
    accrual: {
      ...INTEREST_INSTRUMENT,
      kind: 'config-derived',
      effective: '2022-01-01',
      value: heasAccrueFortnight,
      derivation: 'balance = (balance + draw) × (1 + annual rate ÷ 26) — the draw is added BEFORE interest is charged',
      note: 'T41 — interest continues after the maximum loan available is reached, after exit and after death.',
    },
    debtMethodStatement: {
      ...SS_ACT,
      kind: 'constant',
      everyYear: true,
      value: 'pension received under the scheme → add advances → add registration costs → subtract the pension that would have been received anyway → add fortnightly compound interest → subtract repayments (s 1135(3))',
      registerSection: '§5.4',
      note: 'Registration costs are added to the debt and themselves accrue interest.',
    } satisfies Constant<string>,
    reachingTheMaximumLoan: {
      ...SS_ACT,
      kind: 'constant',
      everyYear: true,
      value: 'automatic exit from the start of the next instalment period (s 1141) — payments stop, compounding does not',
      registerSection: '§5.4',
    } satisfies Constant<string>,
  },

  noNegativeEquityGuarantee: {
    exists: {
      ...SS_ACT,
      kind: 'constant',
      effective: '2022-07-01',
      value: true,
      registerSection: '§5.5',
      note: 'Automatic by force of s 1144AA(1)(f)–(g) — not a discretion and not an application.',
    } satisfies Constant<boolean>,
    adjustedValue: {
      ...SS_ACT,
      kind: 'constant',
      everyYear: true,
      value: 'market value less encumbrances OTHER than the HEAS charge — so a pre-existing mortgage reduces the guarantee ceiling',
      registerSection: '§5.5',
    } satisfies Constant<string>,
    voidedBy: {
      ...SS_ACT,
      kind: 'constant',
      everyYear: true,
      value: 'a non-HEAS charge created or increased after participation began, with the Person consent, where it affects recovery; or fraud or misrepresentation (s 1144AA(3))',
      registerSection: '§5.5',
      note: 'T35 — increasing the Owner-Occupied Mortgage, including by redraw or refinance, voids the guarantee and the full balance becomes repayable. Any Scenario combining a HEAS draw with a redraw must raise this, never silently keep the guarantee.',
    } satisfies Constant<string>,
  },

  eligibility: {
    age: {
      ...SS_ACT,
      kind: 'constant',
      everyYear: true,
      value: 'the Person has reached pension age, or is the partner of someone who has',
      registerSection: '§5.6',
    } satisfies Constant<string>,
    qualifyingPayment: {
      ...SS_ACT,
      kind: 'constant',
      everyYear: true,
      value: 'receiving OR qualified for Age Pension, DSP or Carer Payment (s 1133(1)(a))',
      registerSection: '§5.6',
      note: 'A $0 entitlement does not disqualify — confirmed across four sources. Qualification survives means testing; payability does not.',
    } satisfies Constant<string>,
    bothPartnersMustSign: {
      ...SS_ACT,
      kind: 'constant',
      everyYear: true,
      value: true,
      registerSection: '§5.6',
      note: 's 1136(2)(b) — even if they do not own the property.',
    } satisfies Constant<boolean>,
    bankruptcyExclusion: {
      ...SS_ACT,
      kind: 'constant',
      everyYear: true,
      value: 'the Person, their partner and any co-owner must not be bankrupt or under a Part X agreement',
      registerSection: '§5.6',
    } satisfies Constant<string>,
  },

  meansTest: {
    fortnightlyStreamIsIncome: {
      ...SS_GUIDE,
      kind: 'constant',
      everyYear: true,
      value: false,
      registerSection: '§5.7',
      note: 'Participating does not change the existing entitlement — the loan is delivered AS the pension at an increased rate (s 1134(1A)).',
    } satisfies Constant<boolean>,
    advanceDeemedFromDayOne: {
      ...SS_ACT,
      kind: 'constant',
      everyYear: true,
      value: true,
      registerSection: '§5.7',
      note: 'T34 — the two draw modes are NOT means-test equivalent. Modelling them identically overstates the Age Pension in every advance scenario. NOT WIRED in v1 (T138, P9-2b): the whole means test stays blind to HEAS (T39/T42), so an advance is punted into ordinary cash the moment it is drawn — deemed under the income test and assessable under the assets test from DAY ONE, with no 90-day exemption modelled at all. That is CAUTIOUS relative to the law (it assesses sooner and more fully than s 1134A/§5.7 requires, never less), and it is why `projection.ts` adds the advance to cash rather than to a separate exempt bucket.',
    } satisfies Constant<boolean>,
    advanceAssetExemptDays: {
      ...SS_ACT,
      kind: 'constant',
      everyYear: true,
      value: 90,
      registerSection: '§5.7',
      note: 'T34 — assets test only, and only where the principal home was the security. The income test deems from day one. NOT APPLIED in v1 (T138) — see `advanceDeemedFromDayOne`\'s note: the advance is ordinary deemed cash from day one on both tests, which is the cautious side of this exemption, not an implementation of it.',
    } satisfies Assumption<number>,
    debtReducesAssessableAssets: {
      ...SS_GUIDE,
      kind: 'constant',
      everyYear: true,
      value: false,
      registerSection: '§5.7',
      note: 'T38 — where the principal home is the ONLY security no reduction occurs, because the home is already exempt. So drawing HEAS and not spending it STRICTLY REDUCES Age Pension entitlement: the debt is invisible and the unspent cash is deemed. State this wherever the tool presents the facility.',
    } satisfies Constant<boolean>,
    debtAgainstAssessableRealAssets: {
      ...SS_GUIDE,
      kind: 'constant',
      everyYear: true,
      value: 'the FULL debt is deducted from the assessable real asset — the apportionment-of-encumbrances rules do not apply to HEAS (s 1121(5), s 1121(1A))',
      registerSection: '§5.7',
      note: 'T39 — at the ADR-0005 two-year vacated-home cliff the home becomes assessable, s 1121(5) switches on, and the accumulated debt cushions the cliff dollar for dollar.',
    } satisfies Constant<string>,
    pensionerConcessionCardAtNilEntitlement: {
      ...SS_GUIDE,
      kind: 'constant',
      everyYear: true,
      value: false,
      registerSection: '§5.7',
      note: 'T32 — SS Act s 1137A. A part-pensioner using HEAS keeps the card; a nil-entitlement Person using HEAS does not, and also loses family assistance and CCS means-test concessions and any bereavement payment. The card goal and the HEAS lever are independent, and a HEAS Scenario must never imply it rescues the retain-eligibility goal.',
    } satisfies Constant<boolean>,
  },
});
