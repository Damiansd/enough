// Income tax, LITO, SAPTO and the Medicare levy — register §2.
//
// Income base by Person, never by Household, even where an eligibility gate reads combined
// income. Five different income bases appear in this file and they are deliberately not
// interchangeable (T9): LITO tests taxable income, SAPTO tests Rebate Income, the Medicare levy
// tests taxable income (single) or the sum of both Persons' taxable incomes (family), WATO tests
// net labour income from FY2027-28, and Div 293 has its own base again (see `super.ts`). Tracking
// one number and reusing it is wrong in four of the five cases.
//
// This module holds figures and the derivations the register records. It computes no tax with one
// named exception: WATO's s 61-160(b) limb, which is a hypothetical liability on a figure only this
// module's records describe and which must stay out of reach of LITO and SAPTO (P3-39). Every other
// offset and levy amount is P3-1's job, in `core/incomeTax.ts`.
import { mulCents, subCents, toCents } from '../../core/money.js'; // `.js` is correct in a `.ts` file — see tsconfig.json
import type { Cents } from '../../core/money.js';
import type { BasicIncomeTaxLiability, NetLabourIncome, TaxableIncome } from '../../core/incomeBases.js';
import { deepFreeze } from './types.js';
import type { Assumption, Config, Constant, FinancialYear, Formula, IsoDate, Money, Rate } from './types.js';

const ATO_RATES = {
  source: 'ATO resident tax rates — https://www.ato.gov.au/tax-rates-and-codes/tax-rates-australian-residents',
  retrieved: '2026-09-03',
  confidence: 'primary-verified',
  registerSection: '§2.1',
} as const;

// **Schedule 7 Part I, read directly — register O8, and the finding P2-10b turned on.**
//
// The Act was retrieved on 2026-09-17 through the Federal Register's epub text endpoint (the SPA
// page at /latest/text serves no text; the endpoint below returns the XHTML of the compilation).
// Compilation No. 66, compilation date 1 July 2026, includes Act No. 50 of 2026.
//
// Sch 7 Pt I cl 1(b) carries THREE tables, and the third one is the whole point:
//
//   "Tax rates for resident taxpayers for the 2024-25 or 2025-26 year of income"   16/30/37/45
//   "Tax rates for resident taxpayers for the 2026-27 year of income"              15/30/37/45
//   "Tax rates for resident taxpayers for the 2027-28 year of income
//    OR A LATER YEAR OF INCOME"                                                    14/30/37/45
//
// with the bands "exceeds the tax-free threshold but does not exceed $45,000", "$45,000 …
// $135,000", "$135,000 … $190,000", "exceeds $190,000", and `tax-free threshold means $18,200` as
// a standing definition in s 3(1) — not a year-tabled figure at all.
//
// So the ladder past FY2027-28 is NOT an assumption and was never a carry-forward. It is the
// operative text of the Act, which names every later income year in its own heading and stops
// naming years at that point. That is why the FY2027-28 rates below are re-sourced here from
// ATO new-legislation QC104015 + `unverified` onto the Act itself, and why `standingLawTaxYear`
// answers for FY2028-29 and
// beyond from a source rather than from a guess. (QC104015 survives as corroboration in the
// 14% rate's own note; it is no longer a provenance record of its own, because nothing cited it.)
const ITRA_SCH7 = {
  source:
    'Income Tax Rates Act 1986 (C2004A03348) Sch 7 Pt I cl 1, third table — "for the 2027-28 year ' +
    'of income or a later year of income"; tax-free threshold s 3(1). Compilation No. 66, ' +
    'compilation date 1 July 2026, retrieved at ' +
    'https://www.legislation.gov.au/C2004A03348/latest/2026-07-01/text/original/epub/OEBPS/document_1/document_1.html',
  retrieved: '2026-09-17',
  confidence: 'primary-verified',
  registerSection: '§2.1',
} as const;

const ITAA97_LITO = {
  source: 'ITAA 1997 s 61-115 · ATO QC105020',
  retrieved: '2026-09-03',
  confidence: 'primary-verified',
  registerSection: '§2.2',
} as const;

// Every SAPTO dollar figure and formula lives in the Income Tax Assessment (1936 Act)
// Regulations 2025 (F2025L01060, commenced 1 Oct 2025), Pt 5 Div 1 ss 9–12, read from the
// Authorised Version PDF. ITAA 1936 s 160AAAA is the statutory home.
const SAPTO_REG = {
  source: 'Income Tax Assessment (1936 Act) Regulations 2025 (F2025L01060) Pt 5 Div 1 — Authorised Version PDF',
  retrieved: '2026-09-03',
  confidence: 'primary-verified',
  registerSection: '§2.3',
} as const;

const MEDICARE_ACT = {
  source: 'Medicare Levy Act 1986 ss 3(1), 8(5), 8(7) · ATO QC27031, QC27032',
  retrieved: '2026-09-03',
  confidence: 'primary-verified',
  registerSection: '§2.7',
} as const;

// The three FAMILY upper thresholds are not in the Act. s 8(7) substitutes the seniors family
// income threshold into ss 8(5) and 8(6) and does nothing else; no upper family threshold appears
// anywhere in the Medicare Levy Act 1986. They are the ATO's own `1.25 ×` arithmetic on the
// statutory lowers, inconsistently rounded (59,047.50 truncated, 5,422.50 rounded up), published
// as guidance. They stood here sourced to `MEDICARE_ACT` — citing s 8(7) for a figure that
// provision does not contain — until 2026-09-05; see register §2.7 correction 3 and research D3.
//
// They are DISPLAY ONLY. The operative band test is `raw > 0` on the s 8(2) formula, which is the
// Act's own test and is exact in integer cents, so the published uppers' rounding never decides a
// number. `medicareLevy` reports them as `upperThreshold` and tests nothing against them — which
// is why they are still `consumed` for provenance, and why a family-path result now carries
// `secondary-only`. The SINGLE uppers are a different thing entirely: `phase-in limit` is defined
// in s 3(1) and is tested against under s 7(2), so those keep `MEDICARE_ACT`.
const MEDICARE_ATO_ARITHMETIC = {
  source:
    'ATO-published arithmetic, NOT statute — ATO QC27032 (family) and QC27031, being 1.25 × the ' +
    'statutory lower threshold, inconsistently rounded. No upper family threshold exists in the ' +
    'Medicare Levy Act 1986; s 8(7) does not contain one · docs/research/p3-medicare-family-shadein.md D3',
  retrieved: '2026-09-04',
  confidence: 'secondary-only',
  registerSection: '§2.7',
} as const;

// s 8(2)'s reduction formula is served as an image in the ATO Legal Database, which is why the
// register carried it as "not read" (open item O7). It has now been read three independent ways:
// the GIF itself, the Federal Register compilation's PDF text layer, and the Act's own history
// notes, which set out the two prior forms of the same formula in plain text. The two coefficients
// below are the operative text of that formula — see docs/research/p3-medicare-family-shadein.md
// §1.2 and §3.5, and the ATO's Ashton worked example, which the pair reproduces to the cent.
const MEDICARE_ACT_S8_FORMULA = {
  source:
    'Medicare Levy Act 1986 ss 8(2)–8(4) — formula GIF read directly, and FRL Compilation No. 53 ' +
    '(1 July 2026) PDF text layer · docs/research/p3-medicare-family-shadein.md',
  retrieved: '2026-09-04',
  confidence: 'primary-verified',
  registerSection: '§2.7',
} as const;

export interface TaxBracket {
  /** Upper bound of the bracket, or `null` for the top bracket. */
  readonly upTo: Cents | null;
  readonly rate: number;
}

/**
 * A financial year's rate parameters. Only what the register carries for that year appears.
 *
 * Every rate of the ladder is its own record, so that each one carries its own confidence and its
 * own note. `brackets` is assembled from those records by `bracketTable` rather than restated, so
 * a rate exists in exactly one place.
 *
 * `brackets` stays OPTIONAL. No year the build can reach omits it — the register states two years
 * and `standingLawTaxYear` supplies the rest with a table — but the field admits a year that does,
 * and `incomeTax.ts` keeps its named refusal for that case (register §2.1.1).
 */
export interface TaxYear {
  /**
   * **Absent on a year the register STATES; set on a year the standing table ANSWERS FOR.**
   *
   * This is the only thing that distinguishes the two, and it has to exist because the figures
   * cannot: FY2029-30's ladder is byte-for-byte FY2027-28's, by construction and by the Act. Its
   * value is the year the standing table is headed from — `LAST_STATED_TAX_YEAR`.
   *
   * It is **not** a confidence weakness. Each figure is primary-verified against a source whose
   * own words cover the year in question. What it marks is DISTANCE: how far past the last year
   * the register has explicitly checked this answer is being projected, which is what a reader
   * needs in order to judge amendment risk. Confidence and distance are different facts and this
   * register keeps them in different fields.
   */
  readonly standingLawFrom?: FinancialYear;
  readonly taxFreeThreshold: Money;
  readonly lowestMarginalRate: Rate;
  readonly secondLowestMarginalRate: Rate;
  readonly thirdMarginalRate?: Rate;
  readonly topMarginalRate?: Rate;
  readonly brackets?: Assumption<readonly TaxBracket[]>;
  readonly medicareLevyRate?: Rate;
}

/**
 * The bracket ladder, built from the year's own rate records. The four upper bounds are written
 * here ONCE and shared by every year, which is §2.1's `bracket thresholds are never indexed`
 * constant enacted rather than restated: a year cannot be given drifted thresholds by editing one
 * table, because there is only one table. Rates are the argument, because rates DO change by
 * amendment — the 1 Jul 2027 cut to 14% is exactly such a change.
 */
const bracketTable = (
  taxFreeThreshold: Money,
  lowest: Rate,
  secondLowest: Rate,
  third: Rate,
  top: Rate,
): readonly TaxBracket[] => [
  { upTo: taxFreeThreshold.value, rate: 0 },
  { upTo: toCents(45_000), rate: lowest.value },
  { upTo: toCents(135_000), rate: secondLowest.value },
  { upTo: toCents(190_000), rate: third.value },
  { upTo: null, rate: top.value },
];

const FY2026_27 = {
  taxFreeThreshold: { ...ATO_RATES, kind: 'config', fy: '2026-27', value: toCents(18_200) } satisfies Money,
  lowestMarginalRate: { ...ATO_RATES, kind: 'config', fy: '2026-27', value: 0.15 } satisfies Rate,
  secondLowestMarginalRate: { ...ATO_RATES, kind: 'config', fy: '2026-27', value: 0.3 } satisfies Rate,
  thirdMarginalRate: { ...ATO_RATES, kind: 'config', fy: '2026-27', value: 0.37 } satisfies Rate,
  topMarginalRate: { ...ATO_RATES, kind: 'config', fy: '2026-27', value: 0.45 } satisfies Rate,
} as const;

// The FY2027-28 rates, one record each — ALL FOUR NOW SOURCED, which is P2-10b's correction to
// RULINGS.md R12.
//
// R12 carried the 30%, 37% and 45% forward as `unverified` because register O8 recorded that
// Sch 7 Pt I had never been read directly. It has now been read (see `ITRA_SCH7`), and its
// FY2027-28 table states all four rates expressly. So these are not carried-forward placeholders
// and never were — they are the operative text, and leaving them stamped `unverified` after
// reading the Act would be the mirror of laundering a guess upward: it would make every staleness
// display downstream report a weakness the register no longer has.
//
// The direction sentence is KEPT, because it is still the honest statement of the residual risk —
// the risk is now amendment rather than absence, and it runs the same safe way.
/**
 * **The evidence STANDING_TABLE_DIRECTION rests on, as data rather than as a sentence (C3, user
 * ruling 2026-09-21).** The direction argument is load-bearing: it is the whole reason this build
 * answers FY2045-46 from FY2027-28's ladder instead of refusing, and its claim is empirical — every
 * movement in the lowest marginal rate within living memory has been DOWNWARD, so a standing table
 * over-states tax or is exactly right and cannot flatter.
 *
 * ⚠️ **Two of its three data points were already records; the 16% was only in the prose** — and the
 * years it belongs to (FY2024-25, FY2025-26) are ones `taxYear` refuses, so there was nowhere in
 * `YEARS` to put it. That is precisely how it escaped: a figure with no home reads as unimportant
 * right up until the argument it supports is questioned. **This is the P4-18 class** — a
 * load-bearing figure living in a sentence — and it is closed the same way, by promotion.
 *
 * **NOT a tax year and never read as one.** Nothing computes with this; `taxYear` still refuses
 * FY2024-25 and FY2025-26, and this record does not change that. It exists so the direction claim
 * can be CHECKED rather than believed. `test/assumptions-tax.test.mjs` asserts the ladder is
 * monotonically falling, so a future editor cannot quietly add a rise and leave the argument
 * standing above it.
 *
 * **Verified 2026-09-21** against the same ATO page `ATO_RATES` already names: 2024-25 and 2025-26
 * both read *"16c for each $1 over $18,200"*, and the same fetch returned *"15c"* for 2026-27 —
 * which reproduces the stamped `FY2026_27.lowestMarginalRate`, the cross-check that shows the right
 * column was read.
 */
export const LOWEST_MARGINAL_RATE_HISTORY = {
  ...ATO_RATES,
  retrieved: '2026-09-21',
  kind: 'constant',
  effective: '2024-07-01',
  value: Object.freeze({ '2024-25': 0.16, '2025-26': 0.16, '2026-27': 0.15, '2027-28': 0.14 }),
  note:
    'The lowest marginal rate as published, FY2024-25 onward: 16%, 16%, 15%, 14%. Historical ' +
    'evidence for the direction claim, not a rate table — `taxYear` answers FY2026-27 and ' +
    'FY2027-28 from their own records and refuses the two years before them.',
} as const;

const STANDING_TABLE_DIRECTION =
  'THE DIRECTION OF THE RESIDUAL RISK, which the confidence label does not carry: the figure is ' +
  'the law as read on 2026-09-17, and the only way it becomes wrong is a future amendment. Every ' +
  'movement in this ladder within living memory has been DOWNWARD — 16% to 15% on 1 Jul 2026 and ' +
  '15% to 14% on 1 Jul 2027, both cuts, both in the same Act — and nothing announced raises any ' +
  'of these rates. So applying the standing table to a later year OVER-STATES tax or is exactly ' +
  'right; it cannot flatter the household. Moving this rate BELOW its predecessor while it is ' +
  'unsourced would reverse that direction and is the one change test/assumptions-tax.test.mjs ' +
  'forbids; sourcing it — as this record now is — is free to move it anywhere, and the legislated ' +
  '0.14 cut is exactly that. The three movements this claim rests on are held as data in ' +
  '`LOWEST_MARGINAL_RATE_HISTORY` — 16, 16, 15, 14 — so the argument can be checked and not ' +
  'merely believed; before 2026-09-21 the 16% existed only in this sentence. ' +
  'TODO P2-10 — the annual refresh — is what re-reads the Act.';

const FY2027_28 = {
  taxFreeThreshold: {
    ...ITRA_SCH7,
    kind: 'config',
    fy: '2027-28',
    value: toCents(18_200),
    note:
      'Income Tax Rates Act 1986 s 3(1): "tax-free threshold means $18,200". A STANDING DEFINITION ' +
      '— it is not in any of Sch 7 Pt I\'s three year-labelled tables, which is why the bracket ' +
      'thresholds have never been indexed and why §2.4 computes the FY2027-28 SAPTO threshold ' +
      'from $18,200 rather than from a forecast of it.',
  } satisfies Money,
  lowestMarginalRate: {
    ...ITRA_SCH7,
    kind: 'config',
    fy: '2027-28',
    value: 0.14,
    note:
      'Sch 7 Pt I cl 1(b), third table, item 1 — "exceeds the tax-free threshold but does not ' +
      'exceed $45,000: 14%", in force from 1 Jul 2027 and corroborated by ATO new-legislation ' +
      'QC104015 ("From 1 July 2027, the 15 per cent rate will be reduced further to 14 per cent. ' +
      'This measure is now law."), retrieved 2026-09-17. T1/T5/T6 all turn on this: it is the year ' +
      'the SAPTO regulation stops coinciding with the lowest marginal rate. It FALLS from the ' +
      'FY2026-27 0.15 — legislated and sourced, and therefore exempt from the one-way direction ' +
      'rule that binds any UNSOURCED forward rate. It is the only fall anywhere in the horizon, ' +
      'which test/assumptions-tax.test.mjs asserts by name. ' +
      STANDING_TABLE_DIRECTION,
  } satisfies Rate,
  secondLowestMarginalRate: {
    ...ITRA_SCH7,
    kind: 'config',
    fy: '2027-28',
    value: 0.3,
    note:
      'Sch 7 Pt I cl 1(b), third table, item 2 — "exceeds $45,000 but does not exceed $135,000: ' +
      '30%". R12 carried this forward as `unverified` on the strength of register O8; O8 is now ' +
      'closed and the rate is read from the Act. It is what the reg s 9(6) SAPTO branch runs on ' +
      'past 1 Jul 2027. ' +
      STANDING_TABLE_DIRECTION,
  } satisfies Rate,
  thirdMarginalRate: {
    ...ITRA_SCH7,
    kind: 'config',
    fy: '2027-28',
    value: 0.37,
    note:
      'Sch 7 Pt I cl 1(b), third table, item 3 — "exceeds $135,000 but does not exceed $190,000: ' +
      '37%". This and the 45% were §2.1.1 Finding 2\'s whole FY2027-28 bracket-table gap, carried ' +
      'forward by R12 and now read from the Act. ' +
      STANDING_TABLE_DIRECTION,
  } satisfies Rate,
  topMarginalRate: {
    ...ITRA_SCH7,
    kind: 'config',
    fy: '2027-28',
    value: 0.45,
    note:
      'Sch 7 Pt I cl 1(b), third table, item 4 — "exceeds $190,000: 45%". This and the 37% were ' +
      '§2.1.1 Finding 2\'s whole FY2027-28 bracket-table gap, carried forward by R12 and now read ' +
      'from the Act. ' +
      STANDING_TABLE_DIRECTION,
  } satisfies Rate,
} as const;

const YEARS: Readonly<Record<FinancialYear, TaxYear>> = {
  '2026-27': {
    ...FY2026_27,
    brackets: {
      ...ATO_RATES,
      kind: 'config',
      fy: '2026-27',
      value: bracketTable(
        FY2026_27.taxFreeThreshold,
        FY2026_27.lowestMarginalRate,
        FY2026_27.secondLowestMarginalRate,
        FY2026_27.thirdMarginalRate,
        FY2026_27.topMarginalRate,
      ),
      note: 'Income Tax Rates Act 1986 Sch 7 Pt I was not read directly (register O8); the rates come from the ATO table and reconcile against the derived SAPTO thresholds.',
    },
    medicareLevyRate: { ...ATO_RATES, kind: 'config', fy: '2026-27', value: 0.02 },
  },
  '2027-28': {
    ...FY2027_28,
    brackets: {
      ...ITRA_SCH7,
      kind: 'config',
      fy: '2027-28',
      value: bracketTable(
        FY2027_28.taxFreeThreshold,
        FY2027_28.lowestMarginalRate,
        FY2027_28.secondLowestMarginalRate,
        FY2027_28.thirdMarginalRate,
        FY2027_28.topMarginalRate,
      ),
      note:
        'Assembled by RULINGS.md R12 from three carried-forward rates and RE-SOURCED by P2-10b ' +
        'from Sch 7 Pt I cl 1(b), third table, which states all four expressly. The four ' +
        'thresholds are §2.1\'s never-indexed constant, shared with FY2026-27 by construction. ' +
        'The table was stamped `unverified` while its weakest rate was; every rate in it is now ' +
        'primary-verified, so the table is, and `TaxProvenance` carries that through. This is the ' +
        'LAST YEAR THE REGISTER STATES EXPLICITLY — FY2028-29 and later are answered by ' +
        '`standingLawTaxYear` from the same table, which the Act applies to them by its own words.',
    },
  },
};

/**
 * **The last financial year `YEARS` states as a record of its own.** Past it, `taxYear` answers
 * from the standing table — see `standingLawTaxYear`.
 */
export const LAST_STATED_TAX_YEAR: FinancialYear = '2027-28';

/** The starting calendar year of a financial year: `'2028-29'` → `2028`. Never a string compare. */
const startYearOf = (fy: FinancialYear): number => Number.parseInt(fy.slice(0, 4), 10);

const LAST_STATED_START_YEAR = startYearOf(LAST_STATED_TAX_YEAR);

/**
 * **THE STANDING TABLE, and why this is a RULE rather than forty-eight records.**
 *
 * Sch 7 Pt I cl 1(b)'s third table is headed *"Tax rates for resident taxpayers for the 2027-28
 * year of income **or a later year of income**"*. It names no last year. The tax-free threshold is
 * s 3(1)'s standing `$18,200` and the four band edges are §2.1's never-indexed constants. So for
 * every financial year from FY2028-29 to the end of any Planning Horizon, the parameters this
 * module holds are **identical to FY2027-28's and are sourced by the same sentence of the Act**.
 *
 * Forty-eight explicit year records would therefore be forty-eight verbatim copies of one
 * sentence, each needing its own maintenance, its own provenance and its own place in the register
 * — and each free to drift from the others, which is the failure mode `bracketTable` exists to
 * prevent for the four thresholds. **The rule is not a shortcut around the records; the rule is
 * what the source actually says.** A record per year would be a less faithful transcription, not
 * a more careful one.
 *
 * **What it costs, stated rather than buried.** A refusal became an answer. Before this, a caller
 * asking for FY2045-46 got `RangeError: no tax assumptions for FY2045-46` and knew to go and look.
 * Now they get a number. Three things pay for that:
 *
 *   1. the number is *sourced*, not guessed — the whole reason this is defensible;
 *   2. the residual risk (amendment, not absence) runs the safe way — see
 *      `STANDING_TABLE_DIRECTION`, and every movement in this ladder on record has been a cut;
 *   3. **the answer says so.** `standingLawFrom` is set on every year this rule synthesises and
 *      absent on the two the register states, so a caller — and the output — can always tell a
 *      projected year from a stated one **without comparing the figures**, which is essential
 *      because the figures are identical by construction.
 *
 * It is deliberately **unbounded**. The Act's own words are unbounded, and inventing a cut-off
 * here would be a figure the source does not support. The projection's horizon is the
 * Planning Horizon's job, not the rate table's.
 *
 * Memoised, so that a year asked for twice is the same frozen object — the walk asks about six
 * hundred times and identity matters to the provenance consolidation.
 */
const STANDING_YEARS = new Map<FinancialYear, TaxYear>();

const standingLawTaxYear = (fy: FinancialYear): TaxYear => {
  const held = STANDING_YEARS.get(fy);
  if (held !== undefined) return held;

  // Every record is re-stamped with the year it is answering FOR. The source covers that year by
  // its own words, so this is not a `priorYearFallbackFor` — that field is for a figure whose year
  // genuinely does not exist yet, and §2.7's Medicare low-income thresholds keep it.
  const restamp = <T>(record: Assumption<T>, what: string): Assumption<T> =>
    ({ ...record, fy, note: `${what} ${record.note ?? ''}`.trim() }) as Assumption<T>;

  const forYear =
    `FY${fy} is past FY${LAST_STATED_TAX_YEAR}, the last year the register states. This figure is ` +
    `Sch 7 Pt I's "2027-28 year of income OR A LATER YEAR OF INCOME" table applied to FY${fy} — ` +
    'the Act\'s own words, read on 2026-09-17, not a value invented for this year.';

  const taxFreeThreshold = restamp(FY2027_28.taxFreeThreshold, forYear) as Money;
  const lowest = restamp(FY2027_28.lowestMarginalRate, forYear) as Rate;
  const secondLowest = restamp(FY2027_28.secondLowestMarginalRate, forYear) as Rate;
  const third = restamp(FY2027_28.thirdMarginalRate, forYear) as Rate;
  const top = restamp(FY2027_28.topMarginalRate, forYear) as Rate;

  const year: TaxYear = deepFreeze({
    standingLawFrom: LAST_STATED_TAX_YEAR,
    taxFreeThreshold,
    lowestMarginalRate: lowest,
    secondLowestMarginalRate: secondLowest,
    thirdMarginalRate: third,
    topMarginalRate: top,
    brackets: {
      ...ITRA_SCH7,
      kind: 'config',
      fy,
      value: bracketTable(taxFreeThreshold, lowest, secondLowest, third, top),
      note: forYear,
    },
  });
  STANDING_YEARS.set(fy, year);
  return year;
};

/**
 * **Whether this module can answer for `fy` at all.** The register states FY2026-27 and FY2027-28;
 * the standing table answers for FY2027-28 and every later year. So the window is *closed below*
 * and open above, and a year BEFORE FY2026-27 is still refused — there is no standing table
 * running backwards, and Sch 7's earlier tables name their years expressly.
 *
 * `core/projection.ts`'s `taxParametersCover` is this function and nothing else. It used to read
 * `Object.keys(TAX.years)`, which was correct only while every answerable year was a key.
 */
export const taxYearAvailable = (fy: FinancialYear): boolean =>
  YEARS[fy] !== undefined || startYearOf(fy) > LAST_STATED_START_YEAR;

/**
 * Year lookup that fails loudly rather than returning `undefined` into an arithmetic path.
 *
 * A year the register states is returned as stated. A year past `LAST_STATED_TAX_YEAR` is answered
 * from the standing table and carries `standingLawFrom`, which is how a caller tells the two apart
 * — the figures cannot tell them apart, because they are the same figures.
 */
export const taxYear = (fy: FinancialYear): TaxYear => {
  const year = YEARS[fy];
  if (year !== undefined) return year;
  if (startYearOf(fy) > LAST_STATED_START_YEAR) return standingLawTaxYear(fy);
  throw new RangeError(`no tax assumptions for FY${fy}`);
};

const BRACKETS_INDEXED: Constant<false> = {
  ...ATO_RATES,
  kind: 'constant',
  everyYear: true,
  value: false,
  note: 'Bracket thresholds are not indexed and never have been (ADR-0001). A projection that inflates them is wrong.',
};

// --- LITO — ITAA 1997 Subdiv 61-D -------------------------------------------------------------
// Income base: taxable income (s 61-115(1)(a)). Not Rebate Income (T9). Non-refundable. Not
// indexed — it changes only by amendment.

const LITO = {
  maximumOffset: { ...ITAA97_LITO, kind: 'config', fy: '2026-27', value: toCents(700) } satisfies Money,
  stageOneThreshold: { ...ITAA97_LITO, kind: 'config', fy: '2026-27', value: toCents(37_500) } satisfies Money,
  stageOneTaper: { ...ITAA97_LITO, kind: 'constant', everyYear: true, value: 0.05 } satisfies Rate,
  stageTwoThreshold: { ...ITAA97_LITO, kind: 'config', fy: '2026-27', value: toCents(45_000) } satisfies Money,
  stageTwoBaseAmount: { ...ITAA97_LITO, kind: 'config', fy: '2026-27', value: toCents(325) } satisfies Money,
  stageTwoTaper: { ...ITAA97_LITO, kind: 'constant', everyYear: true, value: 0.015 } satisfies Rate,
  eligibilityCeiling: {
    ...ITAA97_LITO,
    kind: 'config',
    fy: '2026-27',
    value: toCents(66_667),
    registerSection: '§2.2',
    note: 'ITAA 1997 s 61-110(1)(b). At $66,667 the stage-2 limb computes to -$0.005 — the amount must be clamped at zero as well as gated here.',
  } satisfies Money,
  incomeBase: {
    ...ITAA97_LITO,
    kind: 'constant',
    everyYear: true,
    value: 'taxable income',
    note: 'T9 — LITO tests taxable income where SAPTO tests Rebate Income. Do not share one input.',
  } satisfies Constant<string>,
  refundable: { ...ITAA97_LITO, kind: 'constant', everyYear: true, value: false } satisfies Constant<boolean>,
};

// --- SAPTO ------------------------------------------------------------------------------------
// Income base: Rebate Income (ITAA 1936 s 6(1)) = taxable income + reportable superannuation
// contributions + total net investment loss + adjusted fringe benefits. Age Pension payments are
// assessable and so already inside it.

/**
 * T1. These two are frozen literals in reg s 12(3)(b)(ii) — they are NOT tax parameters, and
 * they must never be wired to the year's marginal rates.
 *
 * In FY2026-27 `0.15` coincidentally equals the lowest marginal rate. An implementation that
 * reads the rate instead of this literal produces identical, correct output for every day of
 * FY2026-27, and goes silently wrong on 1 Jul 2027 when the lowest rate falls to 14% and the
 * regulation's 0.15 does not move. `test/assumptions-tax.test.mjs` runs the transfer past that
 * date for exactly this reason.
 */
const TRANSFER_INCOME_FLOOR = toCents(6_000);
const TRANSFER_REDUCTION_RATE = 0.15;

/**
 * Reg ss 9(8), 10(2): thresholds and the offset round **up** to the whole dollar.
 *
 * Exported because the *offset* rounds the same way as the thresholds and the offset is computed
 * in `core/incomeTax.ts` (SAPTO's amount is not computed here; the only tax arithmetic in this
 * module is WATO's s 61-160(b) limb — see the WATO block). One implementation of the rule, in the
 * module that owns the regulation it comes from — re-implementing it in `core/` would be two
 * copies free to drift.
 */
export const ceilToWholeDollar = (cents: number): Cents => {
  // Snap float dust to the cent first, so 610,500.0000000001 cents does not become $6,105.01.
  const snapped = Math.abs(cents - Math.round(cents)) < 1e-6 ? Math.round(cents) : cents;
  return toCents(Math.ceil(snapped / 100));
};

/** Reg s 11(2)(b): 12.5c per $1 over the shade-out threshold. */
const SAPTO_TAPER_RATE = 0.125;

export interface SaptoThresholdInputs {
  readonly taxFreeThreshold: Cents;
  readonly lowestMarginalRate: number;
  readonly secondLowestMarginalRate: number;
  readonly rebateMaximumAmount: Cents;
  readonly rebateReductionRate: number;
  readonly rebateReductionThreshold: Cents;
  /** The base rebate amount — or `BRA*` (own + transferred) for a transferee (T4). */
  readonly baseRebateAmount: Cents;
}

export interface SaptoThreshold {
  readonly shadeOut: Cents;
  readonly cutOut: Cents;
  /** Which limb of reg s 9 produced the threshold. Reported so T6 is testable, not inferred. */
  readonly branch: 'reg-s-9(5)' | 'reg-s-9(6)';
}

/**
 * Reg s 9(4)–(8) and s 10(1). T5/T6: the SAPTO thresholds are derived from the year's marginal
 * rates, not a table. They moved when the lowest rate fell 16% → 15% on 1 Jul 2026 and move
 * again at 14% on 1 Jul 2027.
 *
 * Both branches are implemented and so is the `> rebateReductionThreshold` test between them.
 * At 0.15 the s 9(6) branch is reached only once a transfer is added; at 0.14 it becomes the
 * default with no transfer at all, so an implementation of s 9(5) alone is correct in FY2026-27
 * and wrong from FY2027-28.
 */
export const saptoThreshold = (input: SaptoThresholdInputs): SaptoThreshold => {
  const simple =
    input.taxFreeThreshold + (input.rebateMaximumAmount + input.baseRebateAmount) / input.lowestMarginalRate;

  let shadeOut: Cents;
  let branch: SaptoThreshold['branch'];
  if (simple > input.rebateReductionThreshold) {
    // reg s 9(7), then s 9(6)
    const s7 =
      input.rebateReductionThreshold *
      (input.rebateReductionRate + input.secondLowestMarginalRate - input.lowestMarginalRate);
    const t =
      (input.lowestMarginalRate * input.taxFreeThreshold + input.rebateMaximumAmount + input.baseRebateAmount + s7) /
      (input.rebateReductionRate + input.secondLowestMarginalRate);
    shadeOut = ceilToWholeDollar(t);
    branch = 'reg-s-9(6)';
  } else {
    shadeOut = ceilToWholeDollar(simple);
    branch = 'reg-s-9(5)';
  }

  return { shadeOut, cutOut: ceilToWholeDollar(input.baseRebateAmount / SAPTO_TAPER_RATE + shadeOut), branch };
};

/**
 * Reg s 12(3)(b)(ii), the resident transfer formula: `max(0, BRA − (TI − 6,000) × 0.15)`.
 * `TI` is the transferor's **taxable income**, not their Rebate Income — and the parameter is
 * typed `TaxableIncome` rather than `Cents` so that handing it a Rebate Income is a compile
 * error rather than a wrong transfer (T9). The two figures diverge the moment the transferor
 * salary sacrifices, which is exactly when a transfer is most likely to be in play.
 *
 * The literals are the regulation's own (T1) — see `TRANSFER_REDUCTION_RATE` above. Where the
 * transferor's taxable income is at or below $6,000 the residual limb (s 12(3)(b)(i)) applies
 * instead: BRA less tax payable, which with an $18,200 tax-free threshold transfers the full
 * base rebate amount.
 */
export const saptoTransferAmount = (baseRebateAmount: Cents, transferorTaxableIncome: TaxableIncome): Cents => {
  if (transferorTaxableIncome <= TRANSFER_INCOME_FLOOR) return baseRebateAmount;
  const reduced = baseRebateAmount - (transferorTaxableIncome - TRANSFER_INCOME_FLOOR) * TRANSFER_REDUCTION_RATE;
  return toCents(Math.max(0, reduced) / 100);
};

const SAPTO = {
  rebateMaximumAmount: { ...SAPTO_REG, kind: 'config', fy: '2026-27', value: toCents(445) } satisfies Money,
  rebateReductionRate: { ...SAPTO_REG, kind: 'config', fy: '2026-27', value: 0.015 } satisfies Rate,
  rebateReductionThreshold: { ...SAPTO_REG, kind: 'config', fy: '2026-27', value: toCents(37_000) } satisfies Money,
  baseRebateAmount: {
    single: {
      ...SAPTO_REG,
      kind: 'config',
      fy: '2026-27',
      value: toCents(2_230),
      note: 'Not a spouse at any time in the year. Reg s 9(3): a permanently separated Person takes this amount.',
    } satisfies Money,
    coupleEach: { ...SAPTO_REG, kind: 'config', fy: '2026-27', value: toCents(1_602) } satisfies Money,
    illnessSeparatedEach: { ...SAPTO_REG, kind: 'config', fy: '2026-27', value: toCents(2_040) } satisfies Money,
  },
  baseRebateAmountsIndexed: {
    ...SAPTO_REG,
    kind: 'constant',
    everyYear: true,
    value: false,
  } satisfies Constant<boolean>,
  taperRate: { ...SAPTO_REG, kind: 'constant', everyYear: true, value: SAPTO_TAPER_RATE } satisfies Rate,
  roundingDirection: {
    ...SAPTO_REG,
    kind: 'constant',
    everyYear: true,
    value: 'up to the whole dollar',
    note: 'Reg ss 9(8), 10(2). Applies to the thresholds and to the offset.',
  } satisfies Constant<string>,
  refundable: { ...SAPTO_REG, kind: 'constant', everyYear: true, value: false } satisfies Constant<boolean>,
  incomeBase: {
    ...SAPTO_REG,
    kind: 'constant',
    everyYear: true,
    value: 'Rebate Income',
    registerSection: '§2.3',
    note: 'T9 — taxable income (disregarding assessable FHSS released amounts) + reportable superannuation contributions + total net investment loss + adjusted fringe benefits.',
  } satisfies Constant<string>,
  multipleItemRule: {
    ...SAPTO_REG,
    kind: 'constant',
    everyYear: true,
    value: 'greatest entitlement',
    note: 'Reg s 9(2)(b): where more than one item applies during the year, use the greatest.',
  } satisfies Constant<string>,

  eligibility: {
    agePension: {
      source: 'ATO QC72197 · ITAA 1936 s 160AAAA(2)(b)',
      retrieved: '2026-09-03',
      confidence: 'primary-verified',
      registerSection: '§2.5',
      kind: 'config',
      fy: '2026-27',
      value: 67,
      note: '"Qualified for", not "receiving" — a $0-entitlement Person still satisfies s 160AAAA(2)(b).',
    } satisfies Assumption<number>,
    incomeGateBasis: {
      source: 'ITAA 1936 s 160AAAA(4)',
      retrieved: '2026-09-03',
      confidence: 'primary-verified',
      registerSection: '§2.5',
      kind: 'constant',
      everyYear: true,
      value: 'half of combined Rebate Income, tested against the cut-out',
      note: 'T2/T3 — the gate uses half combined Rebate Income; the amount uses the Person\'s own. A transfer changes the amount but never re-opens the gate.',
    } satisfies Constant<string>,
    amountBasis: {
      ...SAPTO_REG,
      kind: 'constant',
      everyYear: true,
      value: "the Person's own Rebate Income",
      registerSection: '§2.5',
      note: 'Reg s 11(2). T2 — a Person can pass the gate on half combined income and still receive $0 on their own.',
    } satisfies Constant<string>,
    gaolExclusion: {
      source: 'ITAA 1936 s 160AAAA(2)',
      retrieved: '2026-09-03',
      confidence: 'primary-verified',
      registerSection: '§2.5',
      kind: 'constant',
      everyYear: true,
      value: 'no offset if in gaol for the whole year',
    } satisfies Constant<string>,
  },

  transferIncomeFloor: {
    ...SAPTO_REG,
    kind: 'constant',
    everyYear: true,
    value: TRANSFER_INCOME_FLOOR,
    registerSection: '§2.6',
    note: 'T1 — a frozen literal in reg ss 12(3)(b)(ii), 12(4)(a). Not the tax-free threshold, not any tax parameter.',
  } satisfies Money,
  transferReductionRate: {
    ...SAPTO_REG,
    kind: 'constant',
    everyYear: true,
    value: TRANSFER_REDUCTION_RATE,
    registerSection: '§2.6',
    note: 'T1 — a frozen literal in reg s 12(3)(b)(ii). It equals the FY2026-27 lowest marginal rate by coincidence only, and does not move when that rate falls to 14% on 1 Jul 2027.',
  } satisfies Rate,
  transferAmount: {
    ...SAPTO_REG,
    kind: 'config-derived',
    fy: '2026-27',
    value: saptoTransferAmount,
    registerSection: '§2.6',
    derivation: 'max(0, BRA − (transferor taxable income − 6,000) × 0.15); the full BRA where taxable income ≤ $6,000',
    note: 'There is no transfer to a spouse who is not themselves SAPTO-eligible. Applied automatically on lodgment; no election.',
  } satisfies Formula<typeof saptoTransferAmount>,
  transferAffectsEligibility: {
    ...SAPTO_REG,
    kind: 'constant',
    everyYear: true,
    value: false,
    registerSection: '§2.6',
    note: 'T3 — reg s 12(3) applies "for the purposes of subsection 11(2) (but not section 10)". Compute eligibility first, from untransferred figures.',
  } satisfies Constant<boolean>,

  threshold: {
    ...SAPTO_REG,
    kind: 'config-derived',
    fy: '2026-27',
    value: saptoThreshold,
    registerSection: '§2.4',
    derivation:
      'reg s 9(5): T = tax_free_threshold + (rebateMaximumAmount + BRA) / lowest_rate. If T > rebateReductionThreshold then reg s 9(7) S7 = rebateReductionThreshold × (rebateReductionRate + second_lowest − lowest) and reg s 9(6) T = (lowest × tax_free_threshold + rebateMaximumAmount + BRA + S7) / (rebateReductionRate + second_lowest). Round up (s 9(8)). Cut-out (s 10(1)) = ceil(BRA / 0.125 + shade-out).',
    note: 'T4 — a transferee\'s threshold is recomputed on BRA* = own BRA + transferred, never read from the published table. T7 — ATO QC72197 publishes the prior-year set with no year label.',
  } satisfies Formula<typeof saptoThreshold>,
};

// --- WATO — ITAA 1997 Subdiv 61-E, from FY2027-28 (P3-24) --------------------------------------
// Income base: NET LABOUR INCOME (s 61-155(2)), which is a fifth base, not a fifth name for one of
// the four above — see register §2.8.1 and T9. THERE IS NO TAPER: the amount is
// `min($250, basic income tax liability on net labour income)`, so limb (b) is a shade-IN at the
// bottom and above the shade-in point the offset is a flat $250 at every income, with no ceiling of
// LITO's s 61-110(1)(b) kind. Not indexed — Subdiv 61-E is absent from the s 960-265 table.
//
// What it holds is the s 61-160 `min`, limb (b) itself, the derived shade-in point and the
// s 63-10(1) application order. **P3-39 built the offset on 2026-09-15**, and one of its findings
// belongs here: limb (b) does NOT need the R12 bracket table. It is computable from the tax-free
// threshold and the lowest marginal rate alone — both legislated and primary-verified for
// FY2027-28 — and the proof is written out on
// `watoHypotheticalBasicIncomeTaxLiability` below. So `unverified` taints the s 63-10(1) item 3
// USABILITY CAP, which runs actual taxable income through the full ladder, and never the computed
// AMOUNT. TODO P3-39's phrasing — "R12 supplied it, so limb (b) has a rate ladder to run against" —
// would put a caveat on every shade-in WATO figure that does not deserve one.
//
// The entitlement gate and the arithmetic live here; the entitlement-gated wrapper, the cap and the
// s 63-10 sequencing are `core/incomeTax.ts`'s, because a cap on actual liability needs the
// bracket ladder and because THIS MODULE CANNOT SEE LITO OR SAPTO — `incomeTax.ts` imports
// `tax.ts` and never the reverse, which is itself part of limb (b)'s pre-offset defence.

const ITAA97_WATO = {
  source:
    'ITAA 1997 Subdiv 61-E ss 61-150, 61-155, 61-160 and s 63-10(1) item 3, inserted by Treasury ' +
    'Laws Amendment (Tax Reform No. 1) Act 2026 (Act No. 49 of 2026) Sch 3 items 1–2 — read ' +
    'from the as-made Act on the Federal Register and from the ATO consolidation independently, and ' +
    'the two agree word for word · docs/research/p3-24-wato.md',
  retrieved: '2026-09-11',
  confidence: 'primary-verified',
  registerSection: '§2.8',
} as const;

// The entitlement threshold is not Subdiv 61-E's own figure: s 61-155(1)(b) borrows the ITRA 1986
// s 3(1) definition, which is a frozen literal with positive evidence of the freeze — No 150 of 2011
// would have substituted $19,400 from 2015-16 and No 72 of 2015 repealed that "so that the tax-free
// threshold remains at $18,200 for the 2015-16 year of income and later years of income".
const ITRA_TAX_FREE_THRESHOLD = {
  source:
    'Income Tax Rates Act 1986 s 3(1) definition of `tax-free threshold` ($18,200) and its history ' +
    'note — the 2011 amendment to $19,400 was repealed by Labor 2013-14 Budget Savings (Measures ' +
    'No. 1) Act 2015 (No 72 of 2015) before it ever commenced',
  retrieved: '2026-09-11',
  confidence: 'primary-verified',
  registerSection: '§2.8',
} as const;

/**
 * s 61-160(a). A `config` because it is year-keyed and changes only by amendment — the same
 * treatment §2.2 gives LITO's $700, and for the same reason. It is **not** indexed: Subdiv 61-E
 * appears nowhere in the ITAA 1997 s 960-265 table (*"The provisions for which indexation is
 * relevant"*), which is the exhaustive switchboard, so this is positive evidence of no mechanism
 * rather than a failure to find one.
 */
const WATO_MAXIMUM_OFFSET = toCents(250);

/** The first income year: Act No. 49 of 2026 Sch 3 Pt 2 item 4, "assessments for the 2027-28 income year and later". */
const WATO_FIRST_INCOME_YEAR: FinancialYear = '2027-28';

/** The four-digit year a financial-year stamp starts in, so `'2026-27' < '2027-28'` is arithmetic and not a string compare. */
const fyStartYear = (fy: FinancialYear): number => {
  const start = Number(fy.slice(0, 4));
  if (!Number.isInteger(start)) throw new RangeError(`not a financial year: ${fy}`);
  return start;
};

export interface WatoShadeInPointInputs {
  readonly taxFreeThreshold: Cents;
  readonly lowestMarginalRate: number;
  /**
   * The offset maximums that stack below the point. WATO's $250 alone gives the s 61-160 shade-in
   * point; `[250, 700]` gives the combined WATO+LITO effective threshold Budget Paper No. 2 quotes.
   */
  readonly offsetMaximums: readonly Cents[];
}

export interface WatoShadeInPoint {
  /**
   * Deliberately **not** `Cents`: the point is fractional in cents (250/0.14 is 1,785.714…
   * dollars), and rounding it to a cent here would be inventing a boundary the Act does not draw.
   */
  readonly exactCents: number;
  /** The first whole cent at which limb (a) binds — `ceil`, because the point itself is a maximum. */
  readonly firstCentAtMaximum: Cents;
}

/**
 * The income at which limb (b) of s 61-160 reaches limb (a): `tax-free threshold + max / rate`.
 *
 * **Derived, never stored.** Both inputs move — the lowest marginal rate falls to 14% on
 * 1 Jul 2027 — so a stored $19,985.71 would be a figure with no provision behind it that silently
 * goes stale. Budget Paper No. 2's "$19,985" and "$24,985" are corroboration of this arithmetic,
 * not its source, and the register says so.
 *
 * Valid only below the second bracket: above it the hypothetical liability of limb (b) is no longer
 * a single rate times the excess. That is not a limitation in practice — every offset maximum this
 * is called with is small enough that the point falls inside the lowest positive bracket — but it
 * is why this returns the shade-in point and not a general liability.
 */
export const watoShadeInPoint = (input: WatoShadeInPointInputs): WatoShadeInPoint => {
  if (!(input.lowestMarginalRate > 0)) {
    throw new RangeError(`no shade-in point at a lowest marginal rate of ${input.lowestMarginalRate}`);
  }
  const stacked = input.offsetMaximums.reduce((total, maximum) => total + maximum, 0);
  const exactCents = input.taxFreeThreshold + stacked / input.lowestMarginalRate;
  return { exactCents, firstCentAtMaximum: toCents(Math.ceil(exactCents) / 100) };
};

/** The one real year, wired to the rate scale this module already carries rather than to a literal. */
export const watoShadeInPointFor = (fy: FinancialYear): WatoShadeInPoint => {
  const year = taxYear(fy);
  return watoShadeInPoint({
    taxFreeThreshold: year.taxFreeThreshold.value,
    lowestMarginalRate: year.lowestMarginalRate.value,
    offsetMaximums: [WATO_MAXIMUM_OFFSET],
  });
};

export interface WatoAmountInputs {
  /** s 61-160(a). */
  readonly maximumOffset: Cents;
  /**
   * s 61-160(b): the basic income tax liability the Person **would** have if their taxable income
   * were comprised only of their net labour income. **Pre-offset** — LITO and SAPTO are step 3 of
   * s 4-10(3) and basic income tax liability is step 2, so neither belongs in this figure. Netting
   * LITO off first would return $0 for everyone below about $23,200.
   *
   * Typed `BasicIncomeTaxLiability` and not `Cents` **because that netting is the trap**. A
   * post-offset figure is a perfectly good `Cents`, so on the bare type the mutation compiled and
   * returned a plausible wrong dollar; the brand is produced only by `taxOnTaxableIncome` and by
   * `watoHypotheticalBasicIncomeTaxLiability` below, neither of which subtracts an offset, so
   * writing it now needs a visible cast (P3-39).
   */
  readonly hypotheticalBasicIncomeTaxLiability: BasicIncomeTaxLiability;
}

export interface WatoHypotheticalLiabilityInputs {
  readonly taxFreeThreshold: Cents;
  readonly lowestMarginalRate: number;
  /** s 61-160(b) treats this as if it were the Person's whole taxable income. */
  readonly netLabourIncome: NetLabourIncome;
}

/**
 * **s 61-160(b) — the whole of what P3-39 had to add.** The basic income tax liability a taxable
 * income equal to net labour income alone would bear: `lowest marginal rate × (NLI − tax-free
 * threshold)`, floored at nil.
 *
 * **PRE-OFFSET, and structurally so.** s 4-10(3) puts basic income tax liability at step 2 and tax
 * offsets at step 3. LITO and SAPTO are not reachable from this module at all — `tax.ts` is
 * imported *by* `core/incomeTax.ts` and never the reverse, so netting one off here is not a line a
 * maintainer should avoid, it is a line that cannot be written without a TDZ import cycle. The
 * `BasicIncomeTaxLiability` brand closes the same trap on the caller's side.
 *
 * **Why the closed form is the FULL ladder here, and why that matters for provenance.** Written out,
 * the argument is:
 *
 *   1. below the second bracket's upper bound the ladder *is* `rate × (NLI − TFT)`, because the
 *      first bracket ends at the tax-free threshold and the second carries the lowest rate — so the
 *      two agree exactly for every NLI at or under $45,000;
 *   2. above it the closed form is a strict **lower bound** on the ladder, every further rate being
 *      non-negative;
 *   3. the ladder and the closed form both pass the $250 maximum long before $45,000 — at
 *      `18,200 + 250/0.14 = $19,985.72` — and neither decreases.
 *
 * So `min($250, closed form)` and `min($250, ladder)` agree at **every** net labour income, and
 * limb (b) needs the tax-free threshold and the lowest marginal rate and nothing else. Both are
 * legislated and `primary-verified` for FY2027-28. **The carried-forward 30/37/45 of RULINGS.md
 * R12 are never consulted, and TODO P3-39's reading of "R12 supplied it, so limb (b) has a rate
 * ladder to run against" would taint every shade-in WATO figure with a caveat it does not deserve.**
 *
 * `unverified` taints the **cap**, not the **amount**: the s 63-10(1) item 3 usability cap runs the
 * Person's *actual* taxable income through the full ladder and genuinely does depend on those three
 * rates. `core/incomeTax.ts` derives the applied figure from that same `taxOnTaxableIncome` call,
 * so the existing `provenanceOf` / `mergeProvenance` machinery carries the caveat with no new
 * plumbing and without attaching it to the computed amount.
 *
 * Step 3 is a property of the year's records rather than of this function, so it is asserted where
 * it is claimed — `test/assumptions-tax.test.mjs` proves the equality against the shipped ladder
 * for every FY the build holds.
 */
export const watoHypotheticalBasicIncomeTaxLiability = (
  input: WatoHypotheticalLiabilityInputs,
): BasicIncomeTaxLiability => {
  const excess = input.netLabourIncome > input.taxFreeThreshold
    ? subCents(input.netLabourIncome, input.taxFreeThreshold)
    : toCents(0);
  return mulCents(excess, input.lowestMarginalRate) as BasicIncomeTaxLiability;
};

/** The same, wired to the year's own rate records rather than to a pair of literals. */
export const watoHypotheticalBasicIncomeTaxLiabilityFor = (
  fy: FinancialYear,
  income: NetLabourIncome,
): BasicIncomeTaxLiability => {
  const year = taxYear(fy);
  return watoHypotheticalBasicIncomeTaxLiability({
    taxFreeThreshold: year.taxFreeThreshold.value,
    lowestMarginalRate: year.lowestMarginalRate.value,
    netLabourIncome: income,
  });
};

/**
 * s 61-160: **the lesser of** the two limbs. This `min` is the whole shape of the measure — remove
 * it and the offset becomes an unconditional $250 that is paid to a Person whose net labour income
 * is one dollar over the tax-free threshold and whose hypothetical liability is fourteen cents.
 *
 * It is not the only cap. s 63-10(1) item 3 caps the offset a second time, against the Person's
 * **actual** liability on their **actual** taxable income, and that is a different number from
 * limb (b): net labour income of $50,000 against an actual taxable income of $3,000 gives a limb (b)
 * figure of the full $250 and an actual liability of nil, so the offset is computed in full and then
 * entirely wasted. Register §2.8.1.
 */
export const watoOffsetAmount = (input: WatoAmountInputs): Cents =>
  toCents(Math.min(input.maximumOffset, input.hypotheticalBasicIncomeTaxLiability) / 100);

/**
 * s 61-155(1): resident at any time during the income year, **and** net labour income that
 * **exceeds** the tax-free threshold. "Exceeds", not "reaches": at exactly $18,200 there is no
 * entitlement at all, which is the same boundary limb (b) would give anyway.
 *
 * The income parameter is `NetLabourIncome` and not `Cents`, so handing this a taxable income is a
 * compile error rather than a wrong entitlement (T9). That matters more here than for the other
 * bases: for a wage earner the two figures are close enough that a substitution would pass every
 * plausible fixture and go wrong only for the Person with large non-labour income.
 */
export const entitledToWorkingAustraliansOffset = (fy: FinancialYear, netLabourIncome: NetLabourIncome): boolean =>
  watoAppliesToYear(fy) && netLabourIncome > taxYear(fy).taxFreeThreshold.value;

/**
 * The **year** limb of s 61-155(1) on its own — Act No. 49 of 2026 Sch 3 Pt 2 item 4, and nothing
 * about any Person. Split out from `entitledToWorkingAustraliansOffset` because `core/incomeTax.ts`
 * has to ask it *before* it has a net labour income to ask about: from FY2027-28 a Person who
 * supplies none is refused by name, and in FY2026-27 and earlier the field is rightly absent
 * because the offset does not exist in law.
 */
export const watoAppliesToYear = (fy: FinancialYear): boolean =>
  fyStartYear(fy) >= fyStartYear(WATO_FIRST_INCOME_YEAR);

/** One row of the s 63-10(1) table. */
export interface OffsetApplicationRow {
  /** The table item number. The order is the item numbers ascending, and nothing else. */
  readonly item: number;
  readonly offset: string;
  readonly excess: string;
}

const S63_10_WATO_ITEM = 3;
const S63_10_SAPTO_ITEM = 5;
const S63_10_SAPTO_TRUSTEE_ASSESSED_ITEM = 10;
const S63_10_BENEFICIARY_OR_PENSIONER_ITEM = 15;
const S63_10_RESIDUAL_ITEM = 20;

const S63_10_TABLE: readonly OffsetApplicationRow[] = [
  {
    item: S63_10_WATO_ITEM,
    offset: 'WATO — ITAA 1997 Subdiv 61-E',
    excess: 'lost — no refund, no transfer, no carry-forward',
  },
  {
    item: S63_10_SAPTO_ITEM,
    offset: 'SAPTO — ITAA 1936 s 160AAAA',
    excess: 'transferred to a spouse under the regulations',
  },
  {
    item: S63_10_SAPTO_TRUSTEE_ASSESSED_ITEM,
    offset: 'SAPTO assessed to a trustee under ITAA 1936 s 98 — s 160AAAB',
    excess: 'transferred under the regulations',
  },
  {
    item: S63_10_BENEFICIARY_OR_PENSIONER_ITEM,
    offset: 'beneficiary and pensioner offsets — ITAA 1936 s 160AAA',
    excess: 'transferred under the regulations',
  },
  {
    item: S63_10_RESIDUAL_ITEM,
    offset:
      'any tax offset not covered by another item — this is where LITO (Subdiv 61-D) and the ' +
      'spouse contribution offset (Subdiv 290-D, P3-19) both land',
    excess: 'lost',
  },
];

/**
 * The application order is the s 63-10(1) item numbers **sorted ascending**, derived from the item
 * numbers themselves rather than from the order the rows happen to sit in above. Permuting the
 * table is therefore benign, and the only way to express "apply WATO after SAPTO" is to change
 * WATO's item number away from the 3 the Act gives it — which is a figure with a test on it.
 *
 * **The order is mandatory but has no dollar effect for a SAPTO couple.** s 63-10(1) is imperative
 * as to the order, and it decides *which* offset is the leftover — SAPTO's leftover is the only one
 * in the table that is transferred to a spouse rather than lost. It does not decide *how much* is
 * transferred: item 5 defers that to the regulations, and reg s 12 computes it from the base rebate
 * amount and the transferor's taxable income, never from the residual. So the transfer is
 * order-blind and WATO at item 3 cannot change a couple's answer. Register §2.8.1, O73 CLOSED
 * 2026-09-15 as a correction — the earlier claim that WATO-first increases the transferable SAPTO
 * excess was wrong.
 */
export const offsetApplicationOrder = (
  table: readonly OffsetApplicationRow[] = S63_10_TABLE,
): readonly OffsetApplicationRow[] => [...table].sort((a, b) => a.item - b.item);

const WATO = {
  maximumOffset: {
    ...ITAA97_WATO,
    kind: 'config',
    fy: '2027-28',
    value: WATO_MAXIMUM_OFFSET,
    registerSection: '§2.8',
    note: 's 61-160(a). Limb (a) of a `min`, not the amount — see `amount`. Flat above the shade-in point, at every income, with no ceiling.',
  } satisfies Money,
  maximumOffsetIndexed: {
    ...ITAA97_WATO,
    kind: 'constant',
    everyYear: true,
    value: false,
    note:
      'ADR-0001, and positive evidence rather than an absence of it: Subdiv 61-E does not appear in ' +
      'the ITAA 1997 s 960-265 table of the provisions for which indexation is relevant (items 1, ' +
      '2, 3, 3A, 5–13, 13A, 14, 10A–10C as at No 8 of 2026), the Subdivision contains no indexation ' +
      'words and no `*index number` reference. Neither does LITO. A projection that inflates $250 is wrong.',
  } satisfies Constant<boolean>,
  entitlementThreshold: {
    ...ITRA_TAX_FREE_THRESHOLD,
    kind: 'constant',
    everyYear: true,
    value: toCents(18_200),
    note:
      's 61-155(1)(b) borrows the ITRA 1986 s 3(1) `tax-free threshold`, and it is a `constant` ' +
      'rather than a `config` because the freeze is positively evidenced: the 2011 substitution to ' +
      '$19,400 was repealed in 2015 before it commenced. It must equal the year\'s taxFreeThreshold, ' +
      'and test/assumptions-tax.test.mjs pins it to that rather than to a second literal (T14).',
  } satisfies Money,
  entitlementTest: {
    ...ITAA97_WATO,
    kind: 'constant',
    everyYear: true,
    value: 'net labour income must EXCEED the tax-free threshold',
    note: 's 61-155(1)(b) — "exceeds", not "reaches". At exactly $18,200 there is no entitlement.',
  } satisfies Constant<string>,
  residencyTest: {
    ...ITAA97_WATO,
    kind: 'constant',
    everyYear: true,
    value: 'an Australian resident at any time during the income year',
    note: 's 61-155(1)(a). Any time during the year, not the whole year — a part-year resident qualifies. Whether the offset is then apportioned is open item O16.',
  } satisfies Constant<string>,
  incomeBase: {
    ...ITAA97_WATO,
    kind: 'constant',
    everyYear: true,
    value: 'net labour income',
    registerSection: '§2.8',
    note:
      'T9 — a FIFTH income base, not a fifth name for one of the four. s 61-155(2): labour amounts ' +
      'less labour deductions, defined nowhere but Subdiv 61-E and used nowhere else in the Act. It ' +
      'excludes interest, dividends, rent, net capital gains, superannuation income streams and the ' +
      'Age Pension, so in the years both Persons draw only a pension and an income stream it is nil.',
  } satisfies Constant<string>,
  amount: {
    ...ITAA97_WATO,
    kind: 'config-derived',
    fy: '2027-28',
    value: watoOffsetAmount,
    registerSection: '§2.8',
    derivation:
      's 61-160: min($250, the basic income tax liability that would arise if taxable income were ' +
      'comprised only of net labour income). NO TAPER and no income ceiling: limb (b) is a shade-in ' +
      'at the bottom, so below the shade-in point the offset is rate × (net labour income − tax-free ' +
      'threshold) and at or above it a flat $250 forever. Limb (b) is PRE-OFFSET — s 4-10(3) puts ' +
      'basic income tax liability at step 2 and tax offsets at step 3, so LITO and SAPTO are not in it.',
    note: 'Capped a second time, and against a different number, by s 63-10(1) item 3: the actual liability on the actual taxable income. The excess is lost.',
  } satisfies Formula<typeof watoOffsetAmount>,
  shadeInPoint: {
    ...ITAA97_WATO,
    kind: 'config-derived',
    fy: '2027-28',
    value: watoShadeInPoint,
    registerSection: '§2.8',
    derivation:
      'tax-free threshold + (sum of the stacked offset maximums) / lowest marginal rate. For ' +
      'FY2027-28 and WATO alone: 18,200 + 250/0.14 = 19,985.714…; with LITO stacked: ' +
      '18,200 + 950/0.14 = 24,985.714…. Budget Paper No. 2 publishes $19,985 and $24,985 ' +
      'independently, which corroborates the arithmetic and is not its source.',
    note: 'STORE THE FORMULA, NEVER THE NUMBER. Both inputs move — the lowest marginal rate falls to 14% on 1 Jul 2027 — and the exact point is fractional in cents.',
  } satisfies Formula<typeof watoShadeInPoint>,
  refundable: {
    ...ITAA97_WATO,
    kind: 'constant',
    everyYear: true,
    value: false,
    note: 's 63-10(1) item 3, in its own words: no refund, no transfer, no carry-forward.',
  } satisfies Constant<boolean>,
  transferable: { ...ITAA97_WATO, kind: 'constant', everyYear: true, value: false } satisfies Constant<boolean>,
  carryForward: { ...ITAA97_WATO, kind: 'constant', everyYear: true, value: false } satisfies Constant<boolean>,
  reducesMedicareLevy: {
    ...ITAA97_WATO,
    kind: 'constant',
    everyYear: true,
    value: false,
    note:
      'Unlike s 63-10(1) items 21 and 22, item 3 carries no Medicare-levy limb, so WATO can never ' +
      'reduce the levy. It is capped by basic income tax liability alone.',
  } satisfies Constant<boolean>,
  firstIncomeYear: {
    ...ITAA97_WATO,
    kind: 'constant',
    everyYear: true,
    value: WATO_FIRST_INCOME_YEAR,
    note:
      'Act No. 49 of 2026 Sch 3 Pt 2 item 4: assessments for the 2027-28 income year and later. ' +
      'Sch 3 itself commenced 1 Jul 2026, which is the commencement of the amending provisions and ' +
      'not the first year of the offset — do not confuse the two.',
  } satisfies Constant<string>,

  applicationOrder: {
    watoItem: {
      ...ITAA97_WATO,
      kind: 'constant',
      everyYear: true,
      value: S63_10_WATO_ITEM,
      note: 's 63-10(1) item 3, inserted BEFORE the existing SAPTO item 5 by Act No. 49 of 2026 Sch 3 item 2. WATO is applied first.',
    } satisfies Constant<number>,
    saptoItem: { ...ITAA97_WATO, kind: 'constant', everyYear: true, value: S63_10_SAPTO_ITEM } satisfies Constant<number>,
    saptoTrusteeAssessedItem: {
      ...ITAA97_WATO,
      kind: 'constant',
      everyYear: true,
      value: S63_10_SAPTO_TRUSTEE_ASSESSED_ITEM,
    } satisfies Constant<number>,
    beneficiaryOrPensionerItem: {
      ...ITAA97_WATO,
      kind: 'constant',
      everyYear: true,
      value: S63_10_BENEFICIARY_OR_PENSIONER_ITEM,
    } satisfies Constant<number>,
    residualItem: {
      ...ITAA97_WATO,
      kind: 'constant',
      everyYear: true,
      value: S63_10_RESIDUAL_ITEM,
      note: 'LITO has no item of its own — Subdiv 61-D falls into the item 20 residual, so the order is WATO → SAPTO → s 160AAA → LITO.',
    } satisfies Constant<number>,
    order: {
      ...ITAA97_WATO,
      kind: 'config-derived',
      fy: '2027-28',
      value: offsetApplicationOrder,
      derivation: 's 63-10(1): the table item numbers ascending — 3 (WATO), 5 (SAPTO), 10 (s 160AAAB), 15 (s 160AAA), 20 (residual, including LITO).',
      note: 'Derived from the item numbers, so permuting the table changes nothing and only changing an item number changes the order.',
    } satisfies Formula<typeof offsetApplicationOrder>,
    neutrality: {
      ...ITAA97_WATO,
      kind: 'constant',
      everyYear: true,
      value: 'mandatory, and worth $0 for a SAPTO couple',
      note:
        'The order is mandatory (s 63-10(1) "apply them ... in the order shown in the table") and it ' +
        'fixes WHICH offset is the leftover: SAPTO\'s is the only leftover in the table transferred ' +
        'to a spouse rather than lost. It does NOT fix how much transfers. Item 5 defers that to the ' +
        'regulations, and reg s 12 computes the amount from the base rebate amount and the ' +
        'transferor\'s taxable income, never from the residual, so the transfer is ORDER-BLIND and ' +
        'WATO at item 3 cannot change a couple\'s transfer or their final tax. O73 closed 2026-09-15 ' +
        'as a CORRECTION: the superseded claim that "applying WATO first increases the transferable ' +
        'SAPTO excess" is FALSE and is quoted here only to keep it findable.',
    } satisfies Constant<string>,
  },
};

// --- s 25-130 — the $1,000 standard deduction, from FY2026-27 (P3-38) ---------------------------
//
// TWO INDEPENDENT EFFECTS, and they do not share a call site.
//
//   Effect A  a Div 25 deduction against assessable income, so it reduces TAXABLE INCOME.
//   Effect B  `labour deductions` limb (c) of s 61-155(2), so it reduces NET LABOUR INCOME, which
//             is WATO's base.
//
// **BOTH EFFECTS ARE NOW WIRED, and O72 is closed (2026-09-17, P4-1 chunk 3).** Effect B goes
// through `netLabourIncomeFromSalary` in `core/incomeBases.ts` (P3-38). Effect A goes through
// `taxableIncomeFromSalary` in `core/projection.ts`, which is the assembly that did not exist:
// assessable income LESS a deduction set, per Person per financial year, fed to
// `householdIncomeTax`. Both call `standardDeductionAmountFor` below, so the $1,000 is still
// written once.
//
// The superseded paragraph is kept here once, in this frame, because it was the whole reason
// `effectOnTaxableIncome` is a `constant` record rather than a formula: *"Only Effect B is wired.
// … Effect A has no call site anywhere in `src/core`: `taxableIncome()` is a bare boundary
// constructor over a number the caller already holds, and nothing in this codebase computes
// assessable income less deductions — that assembly is Phase 4's unbuilt `project()` (TODO P4-1).
// So Effect A is registered here as a documented figure with no runtime consumer, and O72 stays
// open, narrowed to that limb."* `taxableIncome()` is still a bare boundary constructor; what
// changed is that something now computes the number it is handed.
//
// The year is FY2026-27 — the CURRENT year — one year EARLIER than WATO. Before that the deduction
// is $0 and that is a FACT rather than an estimate, exactly as WATO's own $0 is before FY2027-28,
// so `standardDeductionAmountFor` returns nil for an earlier year rather than refusing. A refusal
// would be over-broad: it would block a FY2025-26 caller from an answer the Act supplies.

const ITAA97_S25130 = {
  source:
    'ITAA 1997 s 25-130, inserted by Treasury Laws Amendment (Tax Reform No. 1) Act 2026 ' +
    '(Act No. 49 of 2026) Sch 4 item 3 and applied by Sch 4 Pt 1 item 17 to assessments for the ' +
    '2026-27 income year and later, read from the as-made Act on the Federal Register · ' +
    'docs/research/p3-24-wato.md, register §2.8.2',
  retrieved: '2026-09-11',
  confidence: 'primary-verified',
  registerSection: '§2.8.2',
} as const;

/**
 * s 25-130(2) limb (a). A `config` keyed to the first income year for the same reason LITO's $700
 * and WATO's $250 are: it is a legislated figure that moves only by amendment. **Not indexed** —
 * s 25-130 is absent from the ITAA 1997 s 960-265 table, which s 960-270(1) makes the gateway to
 * indexation, so this is positive evidence of no mechanism rather than a failure to find one.
 *
 * Written **once**, here, and read by `standardDeductionAmountFor` and by the record below. A
 * second `toCents(1_000)` at a call site is T14 drift: it agrees with this figure today and
 * disagrees the year the provision is amended, changing no fixture in between.
 */
const S25130_MAXIMUM_DEDUCTION = toCents(1_000);

/**
 * Act No. 49 of 2026 Sch 4 Pt 1 item 17 — one year BEFORE WATO's. That one-year gap was the whole
 * of register O72: it is why the Div 25 limb reaches the CURRENT year and the WATO-base limb does
 * not, and it is why a fixture that tests only one financial year cannot see the difference.
 */
const S25130_FIRST_INCOME_YEAR: FinancialYear = '2026-27';

export interface StandardDeductionInputs {
  /** s 25-130(2) limb (a) — `S25130_MAXIMUM_DEDUCTION`, passed rather than read, so this stays pure. */
  readonly maximumDeduction: Cents;
  /**
   * s 25-130(2) limb (b) — `total *assessable labour income*`, which s 25-130(4) defines as the
   * **withholding-tested** subset only: amounts from which an amount must be withheld under TAA
   * 1953 Sch 1 ss 12-35, 12-40, 12-45, 12-47, 12-50, Subdiv 12-C or para 12-110(1)(ca).
   *
   * **This is NARROWER than s 61-155(2)'s `labour amounts`**, which additionally reaches sole-trader
   * business income, `*personal services income`, s 83A-25 ESS discounts and s 12-60 labour-hire
   * payments, none of which carry withholding under those provisions. The build hands this the whole
   * of `labourAmounts`, because the tool asks for one figure with no breakdown by source. See
   * `labourIncomeApproximation` below: bounded, accepted, and it can only matter to a Person whose
   * labour income is under $1,000 of non-withheld kinds.
   */
  readonly assessableLabourIncome: Cents;
  /**
   * s 25-130(2)'s reducers, summed. **One aggregate field, not five**, because all five categories
   * do the same job in the same formula — unlike `SurchargeIncomeComponents`, whose seven limbs
   * carry different signs and are consumed by different provisions.
   *
   * **Required, and deliberately not a defaulted parameter.** The nil is the Setting's *documented*
   * default (`tax.s25130.reducerDeductions`), which a caller states; it is never something they get
   * by leaving the field out. Omitting it in TypeScript does not compile, and omitting it from
   * JavaScript propagates `NaN` into `labourDeductions`, where `netLabourIncome()`'s
   * `MissingNetLabourIncomeComponentError` names the limb.
   *
   * s 25-130(3) amounts get **no field at all** — income-protection, personal-sickness and
   * accident-insurance premiums and trade or professional association fees never reduce the
   * deduction whatever their size, so there is nothing for the tool to ask. Same "no field to be
   * filed under" treatment `ReportableSuperannuationContributionComponents` gives the SG.
   */
  readonly reducerDeductions: Cents;
}

/**
 * s 25-130(2): **the lesser of $1,000 and total assessable labour income, reduced (but not below
 * zero) by the reducers.** Three operations and the order of all three is load-bearing:
 *
 *   1. `min` FIRST, against labour income. Without it a Person with $400 of labour income and nil
 *      reducers gets a $1,000 deduction on $400 of income.
 *   2. the reducers come off the CAPPED figure, not the income. `min(1,000, income − reducers)` is
 *      a different number: at $1,500 of income and $300 of reducers it gives $1,000 where the
 *      statute gives $700.
 *   3. the floor at nil LAST. s 25-130(2) says "reduced, but not below zero"; without it a Person
 *      with $1,200 of real work deductions gets a NEGATIVE standard deduction, which adds to net
 *      labour income and to taxable income.
 *
 * No `subCents`/`toCents` in the body on purpose: a `NaN` reducer must reach
 * `netLabourIncome()`'s **named** guard rather than die in `assertWhole`'s anonymous
 * "not a whole number of cents: NaN" — the R8 gap §3.9 finding 3 records. All three inputs are
 * whole cents, so integer subtraction is exact.
 */
export const standardDeductionAmount = (input: StandardDeductionInputs): Cents => {
  const capped = Math.min(input.maximumDeduction, input.assessableLabourIncome);
  return Math.max(0, capped - input.reducerDeductions) as Cents;
};

/**
 * The **year** limb on its own — Act No. 49 of 2026 Sch 4 Pt 1 item 17, and nothing about any
 * Person. Split out from the arithmetic for the same reason `watoAppliesToYear` is, and it answers
 * one year EARLIER: s 25-130 is FY2026-27 and Subdiv 61-E is FY2027-28.
 */
export const s25130AppliesToYear = (fy: FinancialYear): boolean =>
  fyStartYear(fy) >= fyStartYear(S25130_FIRST_INCOME_YEAR);

/**
 * The same arithmetic wired to the year and to this module's own maximum, rather than to a literal.
 *
 * Before FY2026-27 the deduction is **nil**, and that is a fact about the law rather than an
 * estimate — the provision does not exist — so this returns $0 rather than refusing. The refusal
 * shape was considered and rejected on `NetLabourIncomeNotSuppliedError`'s own reasoning: a refusal
 * covering every earlier year would block answers the register does have.
 */
export const standardDeductionAmountFor = (
  fy: FinancialYear,
  assessableLabourIncome: Cents,
  reducerDeductions: Cents,
): Cents =>
  s25130AppliesToYear(fy)
    ? standardDeductionAmount({
        maximumDeduction: S25130_MAXIMUM_DEDUCTION,
        assessableLabourIncome,
        reducerDeductions,
      })
    : toCents(0);

const S25130 = {
  maximumDeduction: {
    ...ITAA97_S25130,
    kind: 'config',
    fy: '2026-27',
    value: S25130_MAXIMUM_DEDUCTION,
    note: 's 25-130(2) limb (a). Limb (a) of a `min`, not the amount — see `amount`. Written once, in `S25130_MAXIMUM_DEDUCTION`, and read by `standardDeductionAmountFor`.',
  } satisfies Money,
  maximumDeductionIndexed: {
    ...ITAA97_S25130,
    kind: 'constant',
    everyYear: true,
    value: false,
    note:
      'ADR-0001, and positive evidence rather than an absence of it: s 25-130 does not appear in ' +
      'the ITAA 1997 s 960-265 table of the provisions for which indexation is relevant, the ' +
      'section contains no indexation words and no `*index number` reference. Neither does ' +
      'Subdiv 61-E. A projection that inflates $1,000 is wrong.',
  } satisfies Constant<boolean>,
  firstIncomeYear: {
    ...ITAA97_S25130,
    kind: 'constant',
    everyYear: true,
    value: S25130_FIRST_INCOME_YEAR,
    note:
      'Act No. 49 of 2026 Sch 4 Pt 1 item 17: assessments for the 2026-27 income year and later — ' +
      'ONE YEAR EARLIER than WATO\'s FY2027-28. The ATO/CCH consolidation\'s history note attributes ' +
      'this to "Sch 1 item 17"; the as-made Act says Schedule 4 Part 1 item 17 and the as-made text ' +
      'governs. Sch 4 itself commenced 1 Jul 2026, which is the commencement of the amending ' +
      'provisions and not the first year of the deduction — do not confuse the two.',
  } satisfies Constant<string>,
  incomeBase: {
    ...ITAA97_S25130,
    kind: 'constant',
    everyYear: true,
    value: 'total assessable labour income',
    note:
      's 25-130(4): each amount included in assessable income from which an amount must be withheld ' +
      'under TAA 1953 Sch 1 ss 12-35, 12-40, 12-45, 12-47, 12-50, Subdiv 12-C or para 12-110(1)(ca). ' +
      'NARROWER than s 61-155(2) `labour amounts`, which also reaches sole-trader business income, ' +
      'personal services income, s 83A-25 ESS discounts and s 12-60 labour-hire payments.',
  } satisfies Constant<string>,
  reducers: {
    ...ITAA97_S25130,
    kind: 'constant',
    everyYear: true,
    value:
      'actual s 8-1 work deductions, Div 28 car expenses, s 25-100 travel, repairs and Subdiv 40-B/40-D ' +
      'decline in value on work assets, and s 25-125 COVID-test deductions',
    note:
      's 25-130(2). ONE aggregate figure and not five fields: all five categories enter the same ' +
      'formula with the same sign and no provision consumes one without the others. The Setting ' +
      '`tax.s25130.reducerDeductions` supplies the sum.',
  } satisfies Constant<string>,
  excludedFromReducers: {
    ...ITAA97_S25130,
    kind: 'constant',
    everyYear: true,
    value:
      'income-protection, personal-sickness and accident-insurance premiums, and trade or ' +
      'professional association fees',
    note:
      's 25-130(3). These NEVER reduce the standard deduction, whatever their size, so they get no ' +
      'field: there is nothing for the tool to ask about. Same treatment the SG contribution gets ' +
      'in `ReportableSuperannuationContributionComponents`.',
  } satisfies Constant<string>,
  floor: {
    ...ITAA97_S25130,
    kind: 'constant',
    everyYear: true,
    value: 'reduced, but not below zero',
    note:
      's 25-130(2). Without the floor a Person whose real work deductions exceed $1,000 gets a ' +
      'NEGATIVE standard deduction, which ADDS to net labour income and to taxable income — the ' +
      'one mutation in this block that moves a figure in the household\'s favour.',
  } satisfies Constant<string>,
  amount: {
    ...ITAA97_S25130,
    kind: 'config-derived',
    fy: '2026-27',
    value: standardDeductionAmount,
    derivation:
      's 25-130(2): max(0, min($1,000, total assessable labour income) − the s 25-130(2) reducers). ' +
      'The min binds FIRST, against labour income; the reducers come off the CAPPED figure and not ' +
      'off the income; the floor at nil is applied LAST.',
    note: 'Not indexed, and the $1,000 is read from `maximumDeduction` rather than written again here.',
  } satisfies Formula<typeof standardDeductionAmount>,
  netLabourIncomeLimb: {
    ...ITAA97_S25130,
    kind: 'constant',
    everyYear: true,
    value: 'ITAA 1997 s 61-155(2) `labour deductions` limb (c) — WIRED 2026-09-15 (P3-38)',
    registerSection: '§2.8.1',
    note:
      'Limb (c) is "an amount you can deduct under section 25-130", so the standard deduction ' +
      'reduces WATO\'s own base by up to $1,000. `netLabourIncomeFromSalary` in ' +
      'core/incomeBases.ts calls `standardDeductionAmountFor`. Consequence for a wage earner with ' +
      'no other work deductions: the GROSS WAGE needed for the full $250 is the shade-in point plus ' +
      'this maximum — derived, never stored, exactly as `watoShadeInPoint` is.',
  } satisfies Constant<string>,
  effectOnTaxableIncome: {
    ...ITAA97_S25130,
    kind: 'constant',
    everyYear: true,
    value: 'a Div 25 deduction against assessable income — WIRED 2026-09-17 (P4-1 chunk 3)',
    registerSection: '§2.8.2',
    note:
      'The second, independent effect: s 25-130 is in Division 25, so it also reduces TAXABLE ' +
      'INCOME by the same amount, worth up to $1,000 × the marginal rate per working Person in ' +
      'FY2026-27 and later — one year BEFORE the WATO-base limb, which is why this one reaches the ' +
      'CURRENT year. `taxableIncomeFromSalary` in core/projection.ts is the call site: it subtracts ' +
      'the s 25-130 deduction from the annualised salary and hands the result to ' +
      '`householdIncomeTax`, which is the assessable-less-deductions assembly that did not exist ' +
      'until P4-1 chunk 3. It reads `standardDeductionAmountFor` — the same function the WATO-base ' +
      'limb reads — so the $1,000 is still written once, in `S25130_MAXIMUM_DEDUCTION`. The ' +
      'superseded value of this record was "REGISTERED, NOT WIRED (O72, awaits TODO P4-1)", kept ' +
      'in the block header above in its correction frame. O72 is CLOSED.',
  } satisfies Constant<string>,
  labourIncomeApproximation: {
    ...ITAA97_S25130,
    kind: 'constant',
    everyYear: true,
    value: 'the $1,000 cap is run against s 61-155(2) `labour amounts`, which is BROADER than s 25-130(4)',
    note:
      'ACCEPTED, BOUNDED APPROXIMATION. The tool asks for one `labourAmounts` figure with no ' +
      'breakdown by source, so it cannot separate withheld from non-withheld labour income. A ' +
      'Person whose labour income is sole-trader, PSI, ESS or labour-hire in nature is therefore ' +
      'OVER-CREDITED, by at most $1,000 of deduction and only where their withheld labour income ' +
      'is under $1,000. This Household is PAYG wage earners and no fixture exercises the other ' +
      'case. The alternative was a refusal, which would block s 25-130 entirely for the common ' +
      'case over an edge case the tool cannot even detect.',
  } satisfies Constant<string>,
  residualOptimism: {
    ...ITAA97_S25130,
    kind: 'constant',
    everyYear: true,
    value: 'the nil-reducer default over-states net labour income for a Person with real reducers — ACCEPTED 2026-09-15 (P3-38)',
    registerSection: '§2.8.1',
    note:
      'DIRECTION, stated because a bound alone does not carry it: the default grants the full ' +
      '$1,000 where the true entitlement is max(0, 1,000 − actual reducers), so it UNDER-states ' +
      'labour deductions, OVER-states net labour income, OVER-states WATO and FLATTERS THE ' +
      'HOUSEHOLD — the direction RULINGS.md R9 disfavours. NOT bounded by $1,000 × the marginal '
      + 'rate, and a record saying so would be wrong: because labour deductions come out as '
      + 'max(actual reducers, $1,000), a nil Setting over-states net labour income by '
      + 'max(0, actual reducers − $1,000), which is nil at or below $1,000 and UNBOUNDED ABOVE — '
      + '$4,000 of real reducers over-states by $3,000. The $1,000 ceiling is true of the limb (c) '
      + 'deduction taken alone and false of this residual (corrected 2026-09-15 before commit). ' +
      'For a Person with no real reducers, which is the modal wage earner, the default is EXACT ' +
      'and the optimism P3-39 accepted at §2.8.1 is DISCHARGED rather than relabelled. There is no ' +
      'honest refusal trigger: the tool cannot identify the Person with unmodelled reducers at all, ' +
      'so a refusal would be over-broad. Accepted in the same shape as, and strictly narrower than, ' +
      'the acceptance it replaces.',
  } satisfies Constant<string>,
};

// --- Medicare levy ----------------------------------------------------------------------------

/**
 * T10. The FY2026-27 low-income thresholds **do not exist**: they are lifted retrospectively in
 * the Budget following the year they apply to, so FY2026-27 values will not exist until roughly
 * the 2027 Budget (register O1, TODO P1-6). Every row below is stamped `2025-26` with
 * `priorYearFallbackFor: '2026-27'`, so `explainAssumption` reports the mismatch rather than
 * presenting a prior year's figure as current.
 */
const fallback = (value: Cents): Config<Cents> => ({
  ...MEDICARE_ACT,
  kind: 'config',
  fy: '2025-26',
  priorYearFallbackFor: '2026-27',
  value,
  note: 'Prior-year fallback: no FY2026-27-specific figure exists as at 2026-09-29 (T10, register O1). Act No 58 of 2026 (Sch 5) states these FY2025-26 amounts for "2025-26 and later years", so they are the law for FY2026-27 until the next amendment; a 2026-27 uplift is expected in the May 2027 Budget. Confidence is primary-verified for FY2025-26 only.',
});

/** The same prior-year fallback, for the three family uppers, which are ATO arithmetic rather than statute. */
const atoArithmeticFallback = (value: Cents): Config<Cents> => ({
  ...MEDICARE_ATO_ARITHMETIC,
  kind: 'config',
  fy: '2025-26',
  priorYearFallbackFor: '2026-27',
  value,
  note:
    'Display only, and secondary-only for FY2025-26 even before the fallback: this figure is the ' +
    "ATO's 1.25 × arithmetic on the statutory lower, not a provision. The operative band test is " +
    '`raw > 0` on the s 8(2) formula, never `familyIncome <= upper`. Prior-year fallback: no ' +
    'FY2026-27 figure is published as at 2026-09-29 (T10, register O1); the Act No 58 of 2026 amounts for 2025-26 and later years apply meanwhile.',
});

const MEDICARE_LEVY = {
  rate: { ...ATO_RATES, kind: 'config', fy: '2026-27', value: 0.02 } satisfies Rate,
  lowIncomeThresholds: {
    singleLower: fallback(toCents(28_011)),
    singleUpper: fallback(toCents(35_013)),
    seniorsSingleLower: fallback(toCents(44_268)),
    seniorsSingleUpper: fallback(toCents(55_335)),
    familyLower: fallback(toCents(47_238)),
    familyUpper: atoArithmeticFallback(toCents(59_047)),
    seniorsFamilyLower: fallback(toCents(61_623)),
    seniorsFamilyUpper: atoArithmeticFallback(toCents(77_028)),
    familyLowerPerDependentChild: fallback(toCents(4_338)),
    familyUpperPerDependentChild: atoArithmeticFallback(toCents(5_423)),
  },
  upperThresholdsAreStored: {
    // Repointed 2026-09-05: this record is *entirely* a claim about how the ATO's published
    // uppers round. Nothing in it is statutory, and on `MEDICARE_ACT` it cited s 8(7) for the
    // same proposition D3 establishes s 8(7) does not support — the fourth instance of the
    // defect `199f89b` fixed for the three threshold records themselves.
    // Note: nothing in `src/` or `test/` reads this. A record consumed by nothing is this
    // codebase's known bug signature, so it is a deletion candidate — kept for now because the
    // rounding fact it states is true and load-bearing for register §2.7's `raw > 0` reasoning.
    ...MEDICARE_ATO_ARITHMETIC,
    kind: 'constant',
    everyYear: true,
    value: true,
    note: 'The uppers are lower × 1.25 in principle but do not round consistently — 35,013.75 and 59,047.50 truncate while 5,422.50 rounds up. Store the published uppers; do not derive them.',
  } satisfies Constant<boolean>,
  shadeInRateSingles: {
    ...MEDICARE_ACT,
    kind: 'constant',
    everyYear: true,
    value: 0.1,
    note: 'Medicare Levy Act s 7(2): 10% of the excess over the lower threshold.',
  } satisfies Rate,
  familyShadeInBaseRate: {
    ...MEDICARE_ACT_S8_FORMULA,
    kind: 'constant',
    everyYear: true,
    value: 0.02,
    note:
      "s 8(2): the reduction starts at 2% OF THE FAMILY INCOME THRESHOLD — not of anybody's income. " +
      'It has tracked the s 6(1) levy rate historically but is a separate literal in a separate ' +
      'provision, and the pair has not moved proportionally (1.5%/0.085 → 2%/0.08). Writing `rate` ' +
      "here would silently rewrite the band's width if either ever moved alone.",
  } satisfies Rate,
  familyShadeInTaper: {
    ...MEDICARE_ACT_S8_FORMULA,
    kind: 'constant',
    everyYear: true,
    value: 0.08,
    note:
      's 8(2): the reduction falls by 8c per $1 of family income above the threshold, so it reaches ' +
      'nil at family income = 1.25 × the threshold — which is where the published "upper thresholds" ' +
      'come from, and they are not in the Act. This is THE TAPER, and it is not a marginal rate: the ' +
      "effective rate is 8% where the spouse's income rises, 10% where the liable Person's own income " +
      'rises and they are above their own phase-in limit (0.02 + 0.08), and 18% inside their own ' +
      's 7(2) shade-in, where the two shade-ins stack. A `shadeInRateFamilies` constant of 0.1 stood ' +
      'here until 2026-09-05 carrying the second of those three as if it were the taper. It was read ' +
      'by nothing, and it was removed rather than kept as a mislabelled duplicate — register §2.7.',
  } satisfies Rate,
  seniorsThresholdSwitch: {
    ...MEDICARE_ACT,
    kind: 'constant',
    everyYear: true,
    value: 'computed SAPTO > $0',
    note: 'T8 — the switch keys off SAPTO actually received, not SAPTO eligibility. A Person who passes the half-combined gate but whose own Rebate Income zeroes the offset gets the ordinary thresholds.',
  } satisfies Constant<string>,
  incomeBase: {
    ...MEDICARE_ACT,
    kind: 'constant',
    everyYear: true,
    value: "taxable income (single); the sum of both Persons' taxable incomes (family)",
    note: 'T9 — Medicare Levy Act ss 7, 8(5). Not Rebate Income.',
  } satisfies Constant<string>,
};

// --- Spouse contribution offset — ITAA 1997 Subdiv 290-D (P3-19) --------------------------------
//
// s 290-230 (the formula) and s 290-235 (the $540 ceiling), fetched independently against the
// ATO's own T3 2026 instructions page and cross-checked on AustLII's indexed text — GATE: GO,
// 2026-09-22 (LIZ), figures confirmed rather than taken on a research pass's word.
//
// **The formula, in full**: 18% of the LESSER of (a) $3,000 reduced dollar-for-dollar once the
// RECEIVING spouse's income for this test exceeds $37,000, cutting to nil at $40,000, or (b) the
// contribution actually made — capped at $540 for the income year (s 290-235). "Spouse income" for
// this test is the RECEIVING spouse's assessable income + reportable fringe benefits +
// reportable employer super contributions, which is NOT simply taxable income.
//
// **$40,000 is NOT stored as its own figure.** It is arithmetic on the other two — the taper
// reaches nil exactly where the $3,000 reduction is exhausted, i.e. at lowerThreshold + base —
// and storing it separately would be the trap `watoShadeInPoint`'s own doc names: "STORE THE
// FORMULA, NEVER THE NUMBER." `core/incomeTax.ts`'s `spouseContributionOffset` computes it from
// `lowerThreshold` and `base` and never reads a stored $40,000.
//
// **Not indexed, and flagged for PERIODIC RECHECK rather than treated as permanently stable** —
// `CARRY_FORWARD.totalSuperBalanceTest`'s own convention in `super.ts`, taken here for the same
// reason: no indexation provision exists in Subdiv 290-D, and that absence is what is recorded,
// not a promise the figures cannot change by future amendment. The four dollar/rate figures have
// stood since the *Treasury Laws Amendment (Fair and Sustainable Superannuation) Act 2016*
// (effective 1 July 2017) — nine years unchanged is evidence of the freeze, not proof it is
// permanent, so `kind: 'constant', everyYear: true` is used exactly as the carry-forward
// threshold's is, and never `kind: 'config'` stamped to one financial year.
const ITAA97_SPOUSE_OFFSET = {
  source:
    'ITAA 1997 Subdiv 290-D ss 290-230, 290-235 · ATO T3 2026 "Tax offset for super contributions ' +
    'on behalf of your spouse" instructions, retrieved directly · cross-checked against AustLII\'s ' +
    'indexed text',
  retrieved: '2026-09-22',
  confidence: 'primary-verified',
  registerSection: '§2.9',
} as const;

const SPOUSE_OFFSET = {
  base: {
    ...ITAA97_SPOUSE_OFFSET,
    kind: 'constant',
    everyYear: true,
    value: toCents(3_000),
    note: 's 290-230(2) column 3, item 1 of the table — the untapered reduction ceiling before any income-based cutback.',
  } satisfies Money,
  lowerThreshold: {
    ...ITAA97_SPOUSE_OFFSET,
    kind: 'constant',
    everyYear: true,
    value: toCents(37_000),
    note: 's 290-230(2) column 2, item 1 — below this, the receiving spouse\'s income does not reduce the $3,000 base at all.',
  } satisfies Money,
  rate: {
    ...ITAA97_SPOUSE_OFFSET,
    kind: 'constant',
    everyYear: true,
    value: 0.18,
    note: 's 290-230(1) step 3 — 18% of the lesser of the tapered base and the contribution actually made.',
  } satisfies Rate,
  maximumOffset: {
    ...ITAA97_SPOUSE_OFFSET,
    kind: 'constant',
    everyYear: true,
    value: toCents(540),
    note: 's 290-235 — the $540 ceiling for the income year. 18% of the untapered $3,000 base is exactly $540, so this cap only ever binds through rounding; it is still applied explicitly rather than relied on as an emergent property of the other three figures.',
  } satisfies Money,
  incomeTest: {
    ...ITAA97_SPOUSE_OFFSET,
    kind: 'constant',
    everyYear: true,
    value: "the RECEIVING spouse's assessable income + reportable fringe benefits total + reportable employer super contributions",
    note: 's 290-230(2), read with s 290-230(3)\'s definition of "spouse\'s assessable income" — NOT the receiving spouse\'s taxable income, and NOT the contributing spouse\'s income (there is no income test on the contributor).',
  } satisfies Constant<string>,
  refundable: {
    ...ITAA97_SPOUSE_OFFSET,
    kind: 'constant',
    everyYear: true,
    value: false,
    note: 's 63-10(1) — no item of the table names Subdiv 290-D, so it falls into the item 20 residual with LITO: non-refundable, non-transferable, no carry-forward, lost if the contributor\'s liability cannot absorb it. See `S63_10_TABLE`\'s residual row.',
  } satisfies Constant<boolean>,
};

// **The CGT reform from 1 July 2027 (LR-1, register §2.10)** — Treasury Laws Amendment (Tax Reform
// No. 1) Act 2026 (Act No. 49 of 2026) Sch 1, read as made (C2026A00049, registered 26/06/2026), and
// each amended section re-read on the ATO legal database on 2026-09-29. Each figure is written ONCE
// here and read by `core/projection.ts`; a second literal at a call site is T14 drift.

/**
 * The first day of the reformed regime: the deemed sale is "just before 1 July 2027" (s 112-155(2)),
 * indexation reaches a CGT event "on or after 1 July 2027" (s 110-36(1A)(a)), and the deemed
 * reacquisition's expenditure is incurred on it (s 960-275(1B) note 1).
 */
export const CGT_REFORM_START: IsoDate = '2027-07-01';

/** s 104-10(5)(a): a gain or loss is disregarded if the asset was acquired BEFORE this day. */
export const PRE_CGT_CUTOFF: IsoDate = '1985-09-20';

/** s 960-275(5): the indexation factor is worked out to this many decimal places, a 5 rounding up. */
export const INDEXATION_FACTOR_DECIMAL_PLACES = 3;

/** s 119-10(2) step 1: the minimum tax capital gain is multiplied by 30%. */
export const MINIMUM_TAX_RATE = 0.3;

const ACT49_SCH1 =
  'Treasury Laws Amendment (Tax Reform No. 1) Act 2026 (Act No. 49 of 2026) Sch 1, as made ' +
  '(C2026A00049, registered 26/06/2026)';

const CGT = {
  reformStart: {
    source:
      `ITAA 1997 s 112-155(1)–(2) and s 110-36(1A)(a), inserted by ${ACT49_SCH1} items 8 and 13 — ` +
      'https://www.ato.gov.au/law/view/document?DocID=PAC%2F19970038%2F112-155 · ' +
      'https://www.ato.gov.au/law/view/document?DocID=PAC%2F19970038%2F110-36',
    retrieved: '2026-09-29',
    confidence: 'primary-verified',
    registerSection: '§2.10',
    kind: 'config',
    effective: CGT_REFORM_START,
    value: CGT_REFORM_START,
    note:
      'A parcel acquired before this day and still held splits at a realisation on or after it: the ' +
      'deferred gain (market value just before this day less cost base, s 112-160, discounted if ' +
      'held more than 12 months at the REALISATION day, s 112-160(3)(c)) and the gain from this day ' +
      '(cost base = that market value, indexed, never discounted, s 115-100(f)). The deemed ' +
      'reacquisition\'s expenditure is incurred on this day (s 960-275(1B) note 1), so indexation ' +
      'runs from the quarter containing it.',
  } satisfies Config<IsoDate>,
  preCgtCutoff: {
    source:
      'ITAA 1997 s 104-10(5)(a) — https://www.ato.gov.au/law/view/document?DocID=PAC%2F19970038%2F104-10 · ' +
      `after the reform, s 112-175(2) (${ACT49_SCH1} item 13)`,
    retrieved: '2026-09-29',
    confidence: 'primary-verified',
    registerSection: '§2.10',
    kind: 'constant',
    everyYear: true,
    value: PRE_CGT_CUTOFF,
    note:
      'Acquired before this day: a gain or loss from a CGT event before the reform start is ' +
      'disregarded (s 104-10(5)(a)). From the reform start the asset is taken to be sold and ' +
      'reacquired at its market value (s 112-175(2)), so only the pre-reform part is disregarded ' +
      'and the gain from the reform start is taxed like any other.',
  } satisfies Constant<IsoDate>,
  indexationFactorDecimalPlaces: {
    source:
      'ITAA 1997 s 960-275(5) — https://www.ato.gov.au/law/view/document?DocID=PAC%2F19970038%2F960-275',
    retrieved: '2026-09-29',
    confidence: 'primary-verified',
    registerSection: '§2.10',
    kind: 'constant',
    everyYear: true,
    value: INDEXATION_FACTOR_DECIMAL_PLACES,
    note:
      '"to 3 decimal places (rounding up if the fourth decimal place is 5 or more)". Not amended by ' +
      'Act No. 49 of 2026; it governs the new s 960-275(1B) factor as it governed the old one. No ' +
      'floor at 1: a falling price level gives a factor below 1 and is applied as written.',
  } satisfies Constant<number>,
  minimumTaxRate: {
    source:
      `ITAA 1997 s 119-10(2) step 1, inserted by ${ACT49_SCH1} item 58 — ` +
      'https://www.ato.gov.au/law/view/document?DocID=PAC%2F19970038%2F119-10',
    retrieved: '2026-09-29',
    confidence: 'primary-verified',
    registerSection: '§2.10',
    kind: 'config',
    effective: CGT_REFORM_START,
    value: MINIMUM_TAX_RATE,
    note:
      'Div 119: an individual pays extra income tax equal to 30% of the minimum tax capital gain ' +
      '(s 119-5: the non-deferred gains from 1 July 2027, after losses, undiscounted) less the tax ' +
      'the ordinary scale already charges on it (the tax on taxable income less the tax on taxable ' +
      'income reduced by that gain, not below nil), rounded DOWN to the whole dollar (step 6), if ' +
      'more than nil. It is part of basic income tax liability (s 4-25), so offsets apply against ' +
      'it; the Medicare levy does not. Not payable by a Person who receives the age pension (or ' +
      'another s 119-15 payment) at any time in the income year.',
  } satisfies Config<number>,
};

export const TAX = deepFreeze({
  years: YEARS,
  bracketThresholdsIndexed: BRACKETS_INDEXED,
  lito: LITO,
  sapto: SAPTO,
  wato: WATO,
  s25130: S25130,
  spouseContributionOffset: SPOUSE_OFFSET,
  medicareLevy: MEDICARE_LEVY,
  cgt: CGT,
});
