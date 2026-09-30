// P8-1 / P8-1a — the `PlanFile` shape, and the one door `unknown` comes through to become it.
//
// **Why this module exists at all, stated once so nobody reads it as defensive boilerplate.**
// `Entry` is a nineteen-member union and only SEVEN of them can be constructed in TypeScript: the
// other twelve carry `UnspecifiedParams`, which has an uninstantiable symbol key (`plan.ts`).
// That protection is **compiler-only**. A plan file is JSON on someone's disk, and JSON has never
// met the compiler: `{"type":"HEAS_DRAW", …}` is three keystrokes, and `projection.ts` dispatches
// with scattered `if (entry.type === …)` rather than an exhaustive switch — so such an entry would
// be **silently ignored** and the forecast would be confidently wrong, which is the one failure
// this project is organised against. Every entry type the engine cannot honour is refused **by
// name, here, before `project()` is ever called**.
//
// **An unknown entry refuses the WHOLE FILE — entries are never silently dropped** (user ruling,
// 2026-09-19). Dropping one would produce a forecast for a plan the user does not have, and would
// do it quietly. This engine throws rather than guesses everywhere else; the file boundary is not
// where that stops.
//
// **Strict about keys, on the same ground.** An unrecognised member anywhere — a top-level key, a
// field on a `Person`, a param on an entry — is a fact in the file that the model would not read.
// Accepting it would mean the projection was computed from less than the user wrote down, so it is
// refused too. `version` is what forward compatibility runs through, not leniency.
//
// **No migration framework, and there still is not one.** `version` is a bare integer, it is `2`,
// and an unrecognised one is refused by name. The rule P8-1 wrote — *"migrations get written when
// one is first needed; a framework written before then would be a guess about a shape nobody has
// seen"* — was taken at its word on 2026-09-19 when P6-4 needed the first one: there is a single
// function, `migratePlanV1toV2` in `app/loadPlan.ts`, and no registry, no chain and no
// `Migration` type. **Nothing in THIS module migrates anything.** A v1 file reaching `parsePlan`
// is refused by name exactly as a v9 file is; the upgrade happens one layer out, and it is written
// back only through the same gate every other write clears.
//
// This module is `core/`: pure, no I/O, no clock, no knowledge that a file or a server exists.
// `app/loadPlan.ts` is what puts it together with the transport.
import { ageAt, assertIsoDate, hasReachedAgePensionAge, homeTreatment, mortgageMonth, offsetSharesOf } from './household.js'; // `.js` is correct in a `.ts` file — see tsconfig.json
import { daysInclusive, financialYearContaining, financialYearStartYear, financialYearsBefore, nthBirthday, startOfFinancialYear } from './financialYear.js'; // `.js` is correct in a `.ts` file — see tsconfig.json
import { inflateStated, monthsBetween } from './priceLevel.js'; // `.js` is correct in a `.ts` file — see tsconfig.json
import { HEAS, heasAdvanceCap, heasFortnightlyCap } from '../data/assumptions/heas.js'; // `.js` is correct in a `.ts` file — see tsconfig.json
import { agePensionPeriodAt, maximumPaymentRate } from '../data/assumptions/agePension.js'; // `.js` is correct in a `.ts` file — see tsconfig.json
import type { RateStatus } from '../data/assumptions/agePension.js';
import type {
  HomeStatus,
  Household,
  Mortgage,
  Parcel,
  Person,
  StatedPriorRetirementPhase,
  StatedStreamSettings,
  SuperInterest,
} from './household.js';
import type { Schedule1ItemIdentification, ReleaseGround } from './conditionOfRelease.js';
import type { ComputedProvenance } from './provenance.js';
import type { Cents } from './money.js';
import { addCents, mulCents, subCents, toCents } from './money.js'; // `.js` is correct in a `.ts` file — see tsconfig.json
import { ENTRY_TYPES, effectiveEntryIds, resolvedEntryEnabled } from './plan.js';
import { retirementSwitches, workSpells } from './retirementPension.js'; // `.js` is correct in a `.ts` file — see tsconfig.json
import type { Entry, EntryOrigin, EntryOverrides, EntryOwner, EntryType, ParcelSelection, Scenario, Settings } from './plan.js';
import type {
  AgePensionIndexationSeries,
  DeemingRatesSetting,
  EconomicSeriesSetting,
  MeansTestIndexation,
  PensionRateIndexation,
} from '../data/assumptions/settings.js';
import type { Confidence, FinancialYear, IsoDate } from '../data/assumptions/types.js';
import { SUPERANNUATION } from '../data/assumptions/super.js';
import { MissingIndexNumberError, concessionalContributionsCap, forecastAwoteIndexNumbers } from './superCaps.js'; // `.js` is correct in a `.ts` file — see tsconfig.json
import { CGT_REFORM_START } from '../data/assumptions/tax.js';
import {
  INCOME_PROTECTION_BENEFIT_PERIODS,
  INCOME_PROTECTION_ENDS_AT_AGE,
  INSURANCE_COVER_EARLIEST_END_AGE,
  INSURANCE_COVER_ENDS_AT_AGE,
  INSURANCE_COVER_KINDS,
  INSURANCE_FIRST_AGE,
  insuranceCoverEndsAtAge,
} from './superInsurance.js';

/**
 * **The version of the plan file this build understands. A bare integer; it started at 1 and it
 * is 2 from P6-4 (2026-09-19).**
 *
 * Not semver: a plan file has no API surface and nothing consumes a minor or a patch component, so
 * two of the three numbers would be decoration that a later reader would feel obliged to honour.
 * One integer has exactly one question attached to it — *do I know this shape?* — and exactly two
 * answers.
 *
 * **What 2 added:** `scenarios` and `activeScenarioId`. `entries` stopped being *the* list the
 * projection walks and became the shared **pool** every Scenario draws ids out of. A v1 file is
 * therefore not a v2 file with two keys missing — its `entries` means something else — which is
 * why the upgrade is a written migration and not a default.
 */
export const PLAN_FILE_VERSION = 2;

/**
 * Everything a projection needs, as one file. `project(settings, household, entries)` takes its
 * three arguments straight off this object and needs nothing else — which is the property that
 * makes a plan file reproducible: `settings.asAtDate` is in here (P8-1a), so the plan carries its
 * own "today" and nothing reads the clock (P4-1a, ADR-0002).
 */
export interface PlanFile {
  readonly version: typeof PLAN_FILE_VERSION;
  readonly settings: Settings;
  readonly household: Household;
  /**
   * **THE POOL — every entry in the file, belonging to no Scenario in particular** (v2, P6-4).
   * A Scenario names the ones it adds by id and inherits the rest from its parent, so this array
   * is a store and not an order of application: `effectiveEntryIds` (`plan.ts`) is what decides
   * which entries a given Scenario projects, and in which order.
   */
  readonly entries: readonly Entry[];
  /**
   * Every Scenario in the file, at least one. They share this file's one `settings` and one
   * `household` — ADR-0002: a Household is the base position entries are applied to, not a
   * per-Scenario input — and differ only in their entries.
   */
  readonly scenarios: readonly Scenario[];
  /**
   * **Which Scenario the app is looking at. REQUIRED, and refused if it names none** (user
   * ruling, 2026-09-19). "The first one" was the alternative and it is an implicit rule that goes
   * wrong the moment the list is reordered — silently, because a reordered list still draws a
   * chart. Explicit over implicit: the file says which Scenario it is about.
   */
  readonly activeScenarioId: string;
}

// --- The refusals -------------------------------------------------------------------------------

/**
 * The file is not a plan file at all — not an object, or not the six members of `PlanFile`.
 *
 * **It also owns the SCENARIO GRAPH (v2, P6-4), and that is a reuse rather than an oversight.**
 * An empty `scenarios`, a scenario object that is malformed, a duplicate scenario id, a
 * `parentId` naming nothing, a `parentId` chain that loops, and an `activeScenarioId` naming no
 * scenario are all refused under this name. They are facts about the SHAPE OF THE FILE as a
 * whole — which scenarios it contains and how they relate — in the same way the top-level key
 * list is, and none of them is an unanswered question about the law. A seventh named refusal
 * would need a register row under ruling R8 (`test/refusal-names.test.mjs` enforces it both
 * ways) and would buy a reader nothing the `path` in the message does not already say.
 */
export class PlanFileShapeError extends RangeError {}

/** The `version` is not one this build knows. Refused by name; never coerced, never best-guessed. */
export class PlanFileVersionError extends RangeError {}

/** Something in `settings` is missing, of the wrong type, or not a member of its union. */
export class PlanFileSettingsError extends RangeError {}

/** Something in `household` is missing, of the wrong type, or not a member of its union. */
export class PlanFileHouseholdError extends RangeError {}

/**
 * Something in `entries` is missing, of the wrong type, or not a member of its union — **and,
 * from v2, an `entryIds` member that names no entry in the pool.** A Scenario pointing at an
 * entry that is not in the file is a missing entry, which is this refusal's subject; it is not a
 * defect in the shape of the scenario graph, which `PlanFileShapeError` owns.
 */
export class PlanFileEntryError extends RangeError {}

/**
 * **A money field that is not a whole number of cents** — a float, a `NaN`, a string, or an integer
 * past `Number.MAX_SAFE_INTEGER`. ADR-0001 and `money.ts`: no float ever holds a dollar amount, so
 * `84000.5` cents in a file is not a rounding decision this model is allowed to make for the user.
 */
export class PlanFileAmountError extends RangeError {}

/**
 * **A date that is not a zero-padded ISO date.** `IsoDate` is a template literal type, so `2026-3-5`
 * satisfies the compiler and sorts wrongly against `2026-03-20` — and this engine compares dates as
 * strings. `assertIsoDate` is the guard; this is its name at the file boundary.
 */
export class PlanFileDateError extends RangeError {}

/**
 * **An entry whose `type` names one of the twelve types nothing in `src/` can honour yet.**
 *
 * This is the refusal the whole module was written for. The type is a real member of `ENTRY_TYPES`
 * — it is not a typo — and `projection.ts` has no branch for it, so accepting the file would mean
 * projecting a plan with the user's `HEAS_DRAW` (or `DEATH`, or `DOWNSIZE`) silently deleted. The
 * list is derived, not written: it is `ENTRY_TYPES` minus the types this module can parse params
 * for, so specifying a fourteenth here is what retired `LUMP_SUM_FROM_SUPER`'s membership on
 * 2026-09-19, and a fifteenth is what retires the next one's.
 */
export class UnspecifiedEntryTypeError extends RangeError {}

// --- Field guards -------------------------------------------------------------------------------

type Refusal = new (message: string) => RangeError;

/**
 * Throws the refusal that owns this part of the file. `path` is a dotted trail, e.g.
 * `household.persons[1].name`.
 *
 * A `function` declaration rather than an arrow const, deliberately: TypeScript only treats a call
 * as unreachable-after — which is what lets `if (x === undefined) fail(…)` narrow `x` below — when
 * the `never` return is on a function declaration or an explicitly typed const.
 */
function fail(Kind: Refusal, path: string, message: string): never {
  throw new Kind(`plan file: ${path} ${message}`);
}

/**
 * Spread this to add a field only when it is present. `{ …, note: undefined }` and `{ … }` are
 * different objects: the first has the key, and `JSON.stringify` drops it, so a round trip through
 * a file would not reproduce its own input.
 */
const optionally = <T>(key: string, value: T | undefined): Record<string, T> =>
  value === undefined ? {} : ({ [key]: value } as Record<string, T>);

const describe = (value: unknown): string =>
  typeof value === 'object' ? (value === null ? 'null' : Array.isArray(value) ? 'an array' : 'an object') : `${typeof value} ${JSON.stringify(value)}`;

/**
 * An object with EXACTLY the allowed keys — no fewer than the required ones, and none beyond the
 * list. The unknown-key half is the half that matters: see this file's header.
 */
const object = (Kind: Refusal, value: unknown, path: string, allowed: readonly string[]): Record<string, unknown> => {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    fail(Kind, path, `is ${describe(value)}, and an object was required`);
  }
  const record = value as Record<string, unknown>;
  const unknown = Object.keys(record).filter((key) => !allowed.includes(key));
  if (unknown.length > 0) {
    fail(Kind, path, `carries ${unknown.map((key) => `"${key}"`).join(', ')}, which this build does not read — refused rather than dropped, because a field nobody reads is a fact the projection was not computed from`);
  }
  return record;
};

const array = (Kind: Refusal, value: unknown, path: string): readonly unknown[] => {
  if (!Array.isArray(value)) fail(Kind, path, `is ${describe(value)}, and an array was required`);
  return value as readonly unknown[];
};

const string = (Kind: Refusal, value: unknown, path: string): string => {
  if (typeof value !== 'string') fail(Kind, path, `is ${describe(value)}, and a string was required`);
  return value as string;
};

const boolean = (Kind: Refusal, value: unknown, path: string): boolean => {
  if (typeof value !== 'boolean') fail(Kind, path, `is ${describe(value)}, and a boolean was required`);
  return value as boolean;
};

/** A finite JS number. Rates are the only floats in this model (`money.ts`), and this is how they arrive. */
const rate = (Kind: Refusal, value: unknown, path: string): number => {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    fail(Kind, path, `is ${describe(value)}, and a finite number was required`);
  }
  return value as number;
};

/**
 * **Whole cents, or a refusal.** `Number.isSafeInteger` is `money.ts`'s own rule — `assertWhole`
 * tests exactly this — restated here rather than imported because the refusal has to carry a name
 * a user can look up, and `assertWhole` throws a bare `RangeError` from inside arithmetic.
 * `test/core-parse-plan.test.mjs` pins the two against each other so they cannot drift apart.
 */
const cents = (Kind: Refusal, value: unknown, path: string): Cents => {
  // Absent, or not a number at all, is a malformed FIELD and belongs to the section that owns it.
  // `PlanFileAmountError` is kept for the case it names: a number that is not whole cents.
  if (typeof value !== 'number') fail(Kind, path, `is ${describe(value)}, and a whole number of cents was required`);
  if (!Number.isSafeInteger(value)) {
    fail(PlanFileAmountError, path, `is ${value}, and a whole number of cents was required (ADR-0001: money is integer cents, never a float)`);
  }
  return value as Cents;
};

/** A zero-padded ISO date, checked by `household.ts`'s own guard and re-thrown under a name. */
const isoDate = (Kind: Refusal, value: unknown, path: string): IsoDate => {
  const text = string(Kind, value, path);
  try {
    return assertIsoDate(text);
  } catch {
    return fail(PlanFileDateError, path, `is "${text}", which is not a zero-padded ISO date (YYYY-MM-DD)`);
  }
};

const member = <T extends string>(Kind: Refusal, value: unknown, path: string, allowed: readonly T[]): T => {
  const text = string(Kind, value, path);
  if (!(allowed as readonly string[]).includes(text)) {
    fail(Kind, path, `is "${text}", and one of ${allowed.map((option) => `"${option}"`).join(', ')} was required`);
  }
  return text as T;
};

/** A present-or-absent field. `null` is NOT absence: a file that says `null` said something. */
const optional = <T>(record: Record<string, unknown>, key: string, read: (value: unknown) => T): T | undefined =>
  record[key] === undefined && !Object.hasOwn(record, key) ? undefined : read(record[key]);

// --- Settings -------------------------------------------------------------------------------------

const parseRateIndexation = (value: unknown, path: string): PensionRateIndexation => {
  const record = object(PlanFileSettingsError, value, path, ['effective', 'cpi', 'pblci', 'annualisedMtawe']);
  return {
    // `effective` is typed `string` in `settings.ts` rather than `IsoDate`, and it is checked as a
    // date here anyway: the indexation mechanisms compare it against dates as a string.
    effective: isoDate(PlanFileSettingsError, record['effective'], `${path}.effective`),
    cpi: rate(PlanFileSettingsError, record['cpi'], `${path}.cpi`),
    pblci: rate(PlanFileSettingsError, record['pblci'], `${path}.pblci`),
    annualisedMtawe: cents(PlanFileSettingsError, record['annualisedMtawe'], `${path}.annualisedMtawe`),
  };
};

const parseMeansTestIndexation = (value: unknown, path: string): MeansTestIndexation => {
  const record = object(PlanFileSettingsError, value, path, ['effective', 'cpiMarchQuarter', 'cpiDecemberQuarter']);
  return {
    effective: isoDate(PlanFileSettingsError, record['effective'], `${path}.effective`),
    cpiMarchQuarter: rate(PlanFileSettingsError, record['cpiMarchQuarter'], `${path}.cpiMarchQuarter`),
    cpiDecemberQuarter: rate(PlanFileSettingsError, record['cpiDecemberQuarter'], `${path}.cpiDecemberQuarter`),
  };
};

const parseAgePensionSeries = (value: unknown, path: string): AgePensionIndexationSeries => {
  const record = object(PlanFileSettingsError, value, path, ['rateIndexations', 'meansTestIndexations']);
  return {
    rateIndexations: array(PlanFileSettingsError, record['rateIndexations'], `${path}.rateIndexations`)
      .map((entry, index) => parseRateIndexation(entry, `${path}.rateIndexations[${index}]`)),
    meansTestIndexations: array(PlanFileSettingsError, record['meansTestIndexations'], `${path}.meansTestIndexations`)
      .map((entry, index) => parseMeansTestIndexation(entry, `${path}.meansTestIndexations[${index}]`)),
  };
};

const parseEconomicSeries = (value: unknown, path: string): EconomicSeriesSetting => {
  const record = object(PlanFileSettingsError, value, path, ['cpi', 'pblci', 'awote', 'mtawe', 'agePension']);
  return {
    cpi: rate(PlanFileSettingsError, record['cpi'], `${path}.cpi`),
    pblci: rate(PlanFileSettingsError, record['pblci'], `${path}.pblci`),
    awote: rate(PlanFileSettingsError, record['awote'], `${path}.awote`),
    mtawe: rate(PlanFileSettingsError, record['mtawe'], `${path}.mtawe`),
    ...optionally('agePension', optional(record, 'agePension', (raw) => parseAgePensionSeries(raw, `${path}.agePension`))),
  };
};

const parseDeemingRates = (value: unknown, path: string): DeemingRatesSetting => {
  const record = object(PlanFileSettingsError, value, path, ['lower', 'upper']);
  return {
    lower: rate(PlanFileSettingsError, record['lower'], `${path}.lower`),
    upper: rate(PlanFileSettingsError, record['upper'], `${path}.upper`),
  };
};

/**
 * **The Contingency Floor as a plan file states it — P4-14, and it is the door's job to keep
 * "no floor" spelled ONE way.**
 *
 * The field is optional in `Settings` and a file that omits it is a file that has said there is no
 * reserve to draw a band against: nothing downstream invents one. So a stated **nil** is refused
 * here rather than accepted as a floor of nothing, on `parseMortgage`'s own reasoning about a nil
 * balance — two spellings of one fact is how a user comes to believe they told this build
 * something they did not. `outcomes.ts` refuses a nil or negative floor for the same reason, in the
 * same words; this refusal is the one with a file path on it.
 *
 * ⚠️ The figure is **today's money**, unlike every other `Cents` in this file. `plan.ts` says so on
 * the field and `core/priceLevel.ts` says what is done about it; nothing is converted HERE, because
 * a door that converted would put a figure in the file that the user never typed.
 */
const parseContingencyFloor = (value: unknown, path: string): Cents => {
  const amount = cents(PlanFileSettingsError, value, path);
  if (amount <= 0) {
    fail(PlanFileSettingsError, path,
      `is ${amount} cents: a Contingency Floor is money held back for late-life costs, and a nil or negative one is not a smaller reserve — it is no reserve. Leave the whole "contingencyFloor" key out to say you keep nothing back; this build then draws no floor and counts no breach rather than guessing a figure`);
  }
  return amount;
};

/**
 * **What the non-super portfolio pays out, as a share of its value — P3-22h step 1, and the door's
 * job here is the one it does for the Contingency Floor: keep "it pays nothing out" spelled ONCE.**
 *
 * The field is optional and a file that omits it is a file that has said nothing about payouts —
 * which is exactly this build's state before P3-22h, and the state `project()` still computes in.
 * So a stated **nil** is refused rather than accepted as a payout of nothing, on `parseMortgage`'s
 * and `parseContingencyFloor`'s reasoning: two spellings of one fact is how a user comes to believe
 * they told this build something they did not.
 *
 * No ceiling is imposed. A payout above 100% of value in a year would be a strange portfolio and it
 * is not an impossible one — a fund returning capital can do it — and a door that refused it would
 * be refusing on a figure nobody legislated.
 */
const parseInvestmentPayoutRate = (value: unknown, path: string): number => {
  const share = rate(PlanFileSettingsError, value, path);
  if (share <= 0) {
    fail(PlanFileSettingsError, path,
      `is ${share}: a payout rate of nil is not a smaller payout — it is no payout at all. Leave the whole "investmentPayoutRate" key out to say your investments pay you nothing, which is what this build assumed before the key existed`);
  }
  return share;
};

/**
 * **How much of that payout carries a company-tax credit — P3-22h step 1, register T43.**
 *
 * A SHARE of the payout, so the ceiling here is structural rather than invented: a part of a thing
 * cannot exceed the thing. A nil is refused on the rate's reasoning above — "none of it is credited"
 * and "I have not said" reach the same conservative answer today, and two spellings of one fact is
 * what the door exists to prevent.
 *
 * ⚠️ **A share stated with no payout to be a share OF is refused**, and that is not tidiness: the
 * figure would be typed, saved, displayed and inert, which on this project is the defect class that
 * fails no test. The refusal names the missing field so the user is told which box to fill.
 */
const parseInvestmentPayoutFrankedShare = (value: unknown, path: string, payoutRate: number | undefined): number => {
  const share = rate(PlanFileSettingsError, value, path);
  if (share <= 0 || share > 1) {
    fail(PlanFileSettingsError, path,
      `is ${share}, and a share of the payout above nil and no greater than 1 was required. Leave the whole "investmentPayoutFrankedShare" key out to say none of your payout carries a credit`);
  }
  if (payoutRate === undefined) {
    fail(PlanFileSettingsError, path,
      `is ${share}, but no "investmentPayoutRate" is stated: this is a share OF a payout, and a share of a payout that was never stated says nothing. State the payout rate too, or leave this key out`);
  }
  return share;
};

/**
 * **What share of a super fund's annual growth is taxable income — P3-42 step 1, `investmentPayoutRate`'s
 * precedent exactly, moved inside super.**
 *
 * The field is optional and a file that omits it has said nothing about a fund's income share —
 * this build's state before P3-42, and the state `project()` still computes in (step 1 of three).
 * A stated **nil** is refused rather than accepted as a share of nothing, on `parseContingencyFloor`'s
 * and `parseInvestmentPayoutRate`'s reasoning: two spellings of one fact is how a user comes to
 * believe they told this build something they did not.
 *
 * No ceiling is imposed, on `parseInvestmentPayoutRate`'s own ground: a share above 100% of a
 * balance's growth in a year is not a figure any statute bounds, and a door that refused it would
 * be refusing on a figure nobody legislated.
 */
const parseSuperIncomeYieldRate = (value: unknown, path: string): number => {
  const share = rate(PlanFileSettingsError, value, path);
  if (share <= 0) {
    fail(PlanFileSettingsError, path,
      `is ${share}: an income-yield rate of nil is not a smaller share — it is no income share at all. Leave the whole "superIncomeYieldRate" key out to say nothing counts as income, which is what this build assumed before the key existed`);
  }
  return share;
};

/**
 * **How much of the super income share carries a company-tax credit — P3-42 step 3,
 * `parseInvestmentPayoutFrankedShare`'s precedent exactly, moved inside super.**
 *
 * A SHARE of the income share, so the structural ceiling applies for the same reason: a part of a
 * thing cannot exceed the thing. A nil is refused on the rate's reasoning, and a share stated with
 * no `superIncomeYieldRate` to be a share OF is refused, naming the missing box.
 */
const parseSuperIncomeYieldFrankedShare = (value: unknown, path: string, incomeYieldRate: number | undefined): number => {
  const share = rate(PlanFileSettingsError, value, path);
  if (share <= 0 || share > 1) {
    fail(PlanFileSettingsError, path,
      `is ${share}, and a share of the income share above nil and no greater than 1 was required. Leave the whole "superIncomeYieldFrankedShare" key out to say none of it carries a credit`);
  }
  if (incomeYieldRate === undefined) {
    fail(PlanFileSettingsError, path,
      `is ${share}, but no "superIncomeYieldRate" is stated: this is a share OF an income share, and a share of an income share that was never stated says nothing. State the income-yield rate too, or leave this key out`);
  }
  return share;
};

/**
 * **What the running cash earns — 2026-09-23.** Unlike the payout rates above, a stated **nil is
 * legal and means something**: absent is NOT "earns nothing" here, it is "follows the CPI figure"
 * (`Settings.cashInterestRate`), so nil is the only way to say the cash earns nothing and the two
 * are different facts. A negative rate is refused: a bank does not charge an Australian household
 * for holding its deposit, and the walk has no line for such a charge.
 */
const parseCashInterestRate = (value: unknown, path: string): number => {
  const annual = rate(PlanFileSettingsError, value, path);
  if (annual < 0) {
    fail(PlanFileSettingsError, path,
      `is ${annual}: interest on cash is money the household earns, and a negative rate would be the bank charging it for holding its deposit. State 0 to say the cash earns nothing, or leave the key out to have it follow the CPI figure`);
  }
  return annual;
};

const parseSettings = (value: unknown, path: string): Settings => {
  const record = object(PlanFileSettingsError, value, path, [
    'asAtDate',
    'planningHorizonAge',
    'economicSeries',
    'deemingRates',
    'nominalReturn',
    // **P4-14.** `object()` refuses an unknown key BY NAME, so a plan file stating a floor would be
    // refused rather than dropped until this name is listed here — the allowlist edit and the field
    // are one change, as they were for the three fee fields above.
    'contingencyFloor',
    // **P3-22h step 1**, and the same one-change rule: the name must be listed here or a plan file
    // stating a payout is REFUSED by name rather than silently dropped.
    'investmentPayoutRate',
    'investmentPayoutFrankedShare',
    // **P3-42 steps 1 and 3**, the same one-change rule again.
    'superIncomeYieldRate',
    'superIncomeYieldFrankedShare',
    // **Interest on running cash (2026-09-23)**, the same one-change rule.
    'cashInterestRate',
  ]);
  const horizon = rate(PlanFileSettingsError, record['planningHorizonAge'], `${path}.planningHorizonAge`);
  // A horizon is an age the walk counts up to. A fraction or a negative one would make
  // `forecastWindow` produce a last month before the first, which is not a refusal it carries.
  if (!Number.isInteger(horizon) || horizon <= 0) {
    fail(PlanFileSettingsError, `${path}.planningHorizonAge`, `is ${horizon}, and a whole age above zero was required`);
  }
  const payoutRate = optional(record, 'investmentPayoutRate', (raw) =>
    parseInvestmentPayoutRate(raw, `${path}.investmentPayoutRate`));
  const incomeYieldRate = optional(record, 'superIncomeYieldRate', (raw) =>
    parseSuperIncomeYieldRate(raw, `${path}.superIncomeYieldRate`));
  return {
    asAtDate: isoDate(PlanFileSettingsError, record['asAtDate'], `${path}.asAtDate`),
    planningHorizonAge: horizon,
    economicSeries: parseEconomicSeries(record['economicSeries'], `${path}.economicSeries`),
    deemingRates: parseDeemingRates(record['deemingRates'], `${path}.deemingRates`),
    nominalReturn: rate(PlanFileSettingsError, record['nominalReturn'], `${path}.nominalReturn`),
    // `optional`/`optionally` for the mechanical reason the fee fields use it: `{ …, key: undefined }`
    // and `{ … }` are different objects, and only the second round-trips through a file byte for
    // byte. A plan written before this field existed must re-write to a file stating no floor.
    ...optionally('contingencyFloor', optional(record, 'contingencyFloor', (raw) =>
      parseContingencyFloor(raw, `${path}.contingencyFloor`))),
    // **P3-22h step 1, and NOTHING READS EITHER OF THESE YET.** They are carried through the door
    // and into `Settings` so that a user's stated figures survive a save and a reload before the
    // mechanic that spends them exists; `project()` names neither, by design and by test.
    ...optionally('investmentPayoutRate', payoutRate),
    // The franked share is parsed AFTER the rate and is handed it, because one of its refusals is
    // about the other field. Read in either order it would be the same figure; refused in either
    // order it would not.
    ...optionally('investmentPayoutFrankedShare', optional(record, 'investmentPayoutFrankedShare', (raw) =>
      parseInvestmentPayoutFrankedShare(raw, `${path}.investmentPayoutFrankedShare`, payoutRate))),
    // **P3-42 step 2** — read live from `project()`'s year-end true-up.
    ...optionally('superIncomeYieldRate', incomeYieldRate),
    // **P3-42 step 3.** Parsed AFTER the income-yield rate and handed it, on
    // `investmentPayoutFrankedShare`'s own order: one of its refusals is about the other field.
    ...optionally('superIncomeYieldFrankedShare', optional(record, 'superIncomeYieldFrankedShare', (raw) =>
      parseSuperIncomeYieldFrankedShare(raw, `${path}.superIncomeYieldFrankedShare`, incomeYieldRate))),
    ...optionally('cashInterestRate', optional(record, 'cashInterestRate', (raw) =>
      parseCashInterestRate(raw, `${path}.cashInterestRate`))),
  };
};

// --- Household ------------------------------------------------------------------------------------

const HOME_STATUSES: readonly HomeStatus[] = [
  'occupied',
  'vacatedProtectedPersonRemains',
  'vacatedWithinTwoYearExemption',
  'vacatedBeyondTwoYearExemption',
  'noHome',
  // P14-13c — stateable directly, `vacatedWithinTwoYearExemption`'s own precedent: a household whose
  // forecast starts already mid-way through a sale-proceeds exemption window (it sold before day 1)
  // states this as a day-1 fact rather than a backdated `SELL_HOME`. No `SELL_HOME` entry is present
  // to read `newHomeAmount` off, so this path gets the homeowner-threshold treatment alone — never
  // the separate lower-rate deeming, which needs a stated set-aside figure `projection.ts` has none
  // to read here.
  'noHomeSaleProceedsExempt',
  'rentedOut',
];

const SUPER_PHASES: readonly SuperInterest['phase'][] = ['accumulation', 'accountBasedPension', 'ttr'];

const PRIOR_RETIREMENT_PHASES: readonly StatedPriorRetirementPhase[] = [
  'startedRetirementPhaseBeforeTheForecast',
  'neverARetirementPhaseRecipientBeforeTheForecast',
];

const RELEASE_GROUNDS: readonly ReleaseGround[] = [
  'ceasing gainful employment after Preservation Age',
  'turning the age that releases benefits by itself',
];

const CONFIDENCES: readonly Confidence[] = ['primary-verified', 'primary-via-archive', 'secondary-only', 'unverified'];

const FINANCIAL_YEAR = /^\d{4}-\d{2}$/;

const parseProvenance = (value: unknown, path: string): ComputedProvenance => {
  const record = object(PlanFileHouseholdError, value, path, ['fy', 'confidence', 'caveats']);
  const fy = string(PlanFileHouseholdError, record['fy'], `${path}.fy`);
  if (!FINANCIAL_YEAR.test(fy)) {
    fail(PlanFileHouseholdError, `${path}.fy`, `is "${fy}", and a financial year of the form 2026-27 was required`);
  }
  return {
    fy: fy as FinancialYear,
    confidence: member(PlanFileHouseholdError, record['confidence'], `${path}.confidence`, CONFIDENCES),
    caveats: array(PlanFileHouseholdError, record['caveats'], `${path}.caveats`)
      .map((caveat, index) => string(PlanFileHouseholdError, caveat, `${path}.caveats[${index}]`)),
  };
};

const parseSchedule1Item = (value: unknown, path: string): Schedule1ItemIdentification => {
  const record = object(PlanFileHouseholdError, value, path, ['on', 'ground', 'item', 'condition', 'cashingRestriction', 'provenance']);
  return {
    on: isoDate(PlanFileHouseholdError, record['on'], `${path}.on`),
    ground: member(PlanFileHouseholdError, record['ground'], `${path}.ground`, RELEASE_GROUNDS),
    item: string(PlanFileHouseholdError, record['item'], `${path}.item`),
    condition: string(PlanFileHouseholdError, record['condition'], `${path}.condition`),
    cashingRestriction: string(PlanFileHouseholdError, record['cashingRestriction'], `${path}.cashingRestriction`),
    provenance: parseProvenance(record['provenance'], `${path}.provenance`),
  };
};

/**
 * **A TTR's chosen drawdown rate, between the two ends the law gives it.** The floor is Schedule 7's
 * lowest percentage factor — 4%, the band every TTR holder is in, since the stream converts at 65 —
 * and the ceiling is SISR reg 6.01(2)(b)(ii)'s 10%. Both are read from their records. Below the
 * floor the walk would pay the minimum anyway, so a lower figure is a misstatement rather than a
 * choice; above the ceiling the stream ceases to be a TTR for tax purposes, which this build does
 * not model. Refused either way, by name, rather than silently moved to the nearer end.
 *
 * Exported for the household editor, which checks a typed rate against THESE two figures before a
 * save rather than keeping a copy of 4 and 10 of its own.
 */
export const TTR_RATE_FLOOR = Math.min(...SUPERANNUATION.access.minimumDrawdownFactors.value.map((band) => band.factor));
export const TTR_RATE_CEILING = SUPERANNUATION.access.ttrMaximumDrawdown.value;
const parseTtrDrawdownRate = (value: unknown, path: string, Kind: Refusal = PlanFileHouseholdError): number => {
  const fraction = rate(Kind, value, path);
  if (fraction < TTR_RATE_FLOOR || fraction > TTR_RATE_CEILING) {
    fail(
      Kind,
      path,
      `is ${fraction}, and a transition to retirement income stream pays between ${TTR_RATE_FLOOR} (the Schedule 7 minimum below 65) and ${TTR_RATE_CEILING} (the SISR reg 6.01(2)(b)(ii) maximum) of its balance a year. State a fraction in that range — 0.05 is 5%`,
    );
  }
  return fraction;
};

const parseStreamSettings = (value: unknown, path: string): StatedStreamSettings => {
  const record = object(PlanFileHouseholdError, value, path, [
    'commencementDay',
    'statedTrisConversionDay',
    'statedNotificationDay',
    'statedSchedule1Item',
    'statedWithdrawalCharacterisation',
    'statedTtrDrawdownRate',
  ]);
  return {
    commencementDay: isoDate(PlanFileHouseholdError, record['commencementDay'], `${path}.commencementDay`),
    ...optionally('statedTtrDrawdownRate', optional(record, 'statedTtrDrawdownRate', (raw) =>
      parseTtrDrawdownRate(raw, `${path}.statedTtrDrawdownRate`))),
    ...optionally('statedTrisConversionDay', optional(record, 'statedTrisConversionDay', (raw) => isoDate(PlanFileHouseholdError, raw, `${path}.statedTrisConversionDay`))),
    ...optionally('statedNotificationDay', optional(record, 'statedNotificationDay', (raw) => isoDate(PlanFileHouseholdError, raw, `${path}.statedNotificationDay`))),
    ...optionally('statedSchedule1Item', optional(record, 'statedSchedule1Item', (raw) => parseSchedule1Item(raw, `${path}.statedSchedule1Item`))),
    ...optionally('statedWithdrawalCharacterisation', optional(record, 'statedWithdrawalCharacterisation', (raw) =>
      member(PlanFileHouseholdError, raw, `${path}.statedWithdrawalCharacterisation`, ['pensionPayment', 'partialCommutation'] as const))),
  };
};

/**
 * **The kinds of employer money an interest can be nominated to receive, and there is one.**
 *
 * A one-member list, on `SUPER_CONTRIBUTION.kind`'s precedent: it is written as a list so that the
 * refusal names what IS readable, and it has one member because this build knows one employer
 * contribution. Additional employer contributions beyond the Guarantee have no entry type, no
 * field and no walk, so a file naming one would be stating a fact the projection is not computed
 * from — which this door refuses rather than drops.
 */
const EMPLOYER_CONTRIBUTION_DESTINATIONS: readonly NonNullable<SuperInterest['statedEmployerContributionDestination']>[] =
  ['superannuationGuarantee'];

/**
 * **The liabilities an interest can be nominated to have released out of it, and there is one.**
 *
 * `EMPLOYER_CONTRIBUTION_DESTINATIONS`'s shape and its reason: written as a list so the refusal
 * names what IS readable, with one member because this build knows one release authority —
 * Division 293's, under ITAA 1997 Subdiv 293-B. An excess concessional contributions determination
 * and a Division 296 liability are each releasable in law and neither is modelled here, so a file
 * naming one would be stating a fact the projection is not computed from.
 */
const RELEASE_AUTHORITY_DESTINATIONS: readonly NonNullable<SuperInterest['statedReleaseAuthorityDestination']>[] =
  ['division293'];

/**
 * **A charge, in whole cents, and never a credit (P3-17).** `cents()` with the sign checked, split
 * out so the two fee fields and any later one share the check rather than each repeating it. The
 * `why` is the caller's, because only the caller knows what the figure is a charge FOR.
 */
const nonNegativeCents = (value: unknown, path: string, why: string): Cents => {
  const amount = cents(PlanFileHouseholdError, value, path);
  if (amount < 0) fail(PlanFileHouseholdError, path, `is ${amount} cents: ${why}`);
  return amount;
};

/** `nonNegativeCents`' rule for a rate: a finite fraction, never negative. */
const nonNegativeRate = (value: unknown, path: string, why: string): number => {
  const fraction = rate(PlanFileHouseholdError, value, path);
  if (fraction < 0) fail(PlanFileHouseholdError, path, `is ${fraction}: ${why}`);
  return fraction;
};

const parseSuperInterest = (value: unknown, path: string): SuperInterest => {
  const record = object(PlanFileHouseholdError, value, path, [
    'phase', 'balance', 'statedStreamSettings', 'statedEmployerContributionDestination', 'statedReleaseAuthorityDestination',
    // **P3-17 slice 1.** `object()` refuses an unknown key BY NAME, so a plan file stating a fee
    // would be refused rather than dropped until these three are listed here — which is the door
    // working, and is why the allowlist edit is part of the same change as the field.
    'statedAdministrationFeePerYear', 'statedAdministrationFeeRate', 'statedInvestmentFeeRate',
    // **P3-17 slice 3 (2026-09-25).** Same reason: unreachable from a file until named here.
    'statedAdministrationFeeCapPerYear',
    // **P3-17 slice 4 (2026-09-25).** The account-based pension phase's own fee set — same reason.
    'statedPensionAdministrationFeePerYear', 'statedPensionAdministrationFeeRate', 'statedPensionAdministrationFeeCapPerYear',
    // P3-17a slice 1 (2026-09-25): insurance.
    'statedDeathPremiumPerYear', 'statedTpdPremiumPerYear', 'statedInsuranceCoverKind', 'statedInsuranceAdminFeePerYear',
    // P3-17b (2026-09-28): income protection.
    'statedIncomeProtectionPremiumPerYear', 'statedIncomeProtectionBenefitPeriod',
    // The age each cover ends, off the fund's terms (2026-09-29).
    'statedDeathCoverEndsAtAge', 'statedTpdCoverEndsAtAge',
    'keepInAccumulationAtRetirement',
  ]);
  const phase = member(PlanFileHouseholdError, record['phase'], `${path}.phase`, SUPER_PHASES);
  const streamSettings = optional(record, 'statedStreamSettings', (raw) => parseStreamSettings(raw, `${path}.statedStreamSettings`));
  // **A TTR with no commencement day is refused, not walked as a stream that pays nothing.** Sch 7
  // and reg 6.01(2)(b)(ii) both key the year's payment off the day the stream commenced, and the
  // walk never guesses one — so without it the stream would sit in the plan paying nothing, which
  // reads as a TTR a household holds and draws no income from.
  if (phase === 'ttr' && streamSettings === undefined) {
    fail(
      PlanFileHouseholdError,
      `${path}.statedStreamSettings`,
      'is absent, and this interest is a transition to retirement income stream. Its yearly payment is worked out from the day the stream commenced, and this build does not guess one: without it the stream would pay nothing. State statedStreamSettings.commencementDay',
    );
  }
  const keepInAccumulationAtRetirement = optional(record, 'keepInAccumulationAtRetirement', (raw) =>
    boolean(PlanFileHouseholdError, raw, `${path}.keepInAccumulationAtRetirement`));
  if (phase === 'accountBasedPension' && keepInAccumulationAtRetirement !== undefined) {
    fail(
      PlanFileHouseholdError,
      `${path}.keepInAccumulationAtRetirement`,
      'is stated on an account-based pension, which is already a pension and has nothing to switch at retirement. It applies only to an accumulation or TTR account. Remove it',
    );
  }
  if (phase !== 'ttr' && streamSettings?.statedTtrDrawdownRate !== undefined) {
    fail(
      PlanFileHouseholdError,
      `${path}.statedStreamSettings.statedTtrDrawdownRate`,
      `is stated on an interest in the ${phase === 'accumulation' ? 'accumulation' : 'account-based pension'} phase, and only a transition to retirement income stream is paid at a chosen rate. Remove it, or state the interest's phase as ttr`,
    );
  }
  const administrationRate = optional(record, 'statedAdministrationFeeRate', (raw) =>
    nonNegativeRate(raw, `${path}.statedAdministrationFeeRate`, 'an administration fee rate is a charge, and a negative one would be a credit this build has no way to pay'));
  const administrationFeeCapPerYear = optional(record, 'statedAdministrationFeeCapPerYear', (raw) =>
    nonNegativeCents(raw, `${path}.statedAdministrationFeeCapPerYear`, 'an administration fee cap is a limit on a charge, and a negative one would be a credit this build has no way to pay'));
  // **A cap with nothing to cap, refused BY NAME rather than silently inert (P3-17 slice 3).** The
  // cap only ever limits `statedAdministrationFeeRate`, so stating one without the rate is either a
  // fund with no percentage fee — for which a cap says nothing true — or the rate was meant to be
  // typed as well and was left out. This build does not guess which; the file is fixed instead.
  if (administrationFeeCapPerYear !== undefined && administrationRate === undefined) {
    fail(
      PlanFileHouseholdError,
      `${path}.statedAdministrationFeeCapPerYear`,
      'is stated with no statedAdministrationFeeRate. A cap limits the percentage administration fee, and there is no percentage fee here for it to limit. State statedAdministrationFeeRate as well, or remove the cap',
    );
  }
  // **P3-17 slice 4 (2026-09-25) — THE ACCOUNT-BASED PENSION PHASE'S OWN FEE SET.** Same three
  // figures, same three door checks, on `statedAdministrationFeeRate`'s own ground: a fund may
  // charge a different dollar fee, percentage and cap once the same money is a pension (Aware's own
  // schedule does, p.15 of the SoA extract). Absent is NOT nil here — the accumulation set carries
  // on unchanged while the interest is a pension, `household.ts`'s own doc on
  // `statedPensionAdministrationFeePerYear` — so these three keys exist only to OVERRIDE the
  // accumulation figures once retirement changes them, not to state a fee where none exists.
  const pensionAdministrationRate = optional(record, 'statedPensionAdministrationFeeRate', (raw) =>
    nonNegativeRate(raw, `${path}.statedPensionAdministrationFeeRate`, 'an administration fee rate is a charge, and a negative one would be a credit this build has no way to pay'));
  const pensionAdministrationFeeCapPerYear = optional(record, 'statedPensionAdministrationFeeCapPerYear', (raw) =>
    nonNegativeCents(raw, `${path}.statedPensionAdministrationFeeCapPerYear`, 'an administration fee cap is a limit on a charge, and a negative one would be a credit this build has no way to pay'));
  if (pensionAdministrationFeeCapPerYear !== undefined && pensionAdministrationRate === undefined) {
    fail(
      PlanFileHouseholdError,
      `${path}.statedPensionAdministrationFeeCapPerYear`,
      'is stated with no statedPensionAdministrationFeeRate. A cap limits the percentage administration fee, and there is no percentage fee here for it to limit. State statedPensionAdministrationFeeRate as well, or remove the cap',
    );
  }
  // P3-17a slice 1: a premium is scaled by a table that differs by cover kind, so a stated premium
  // needs its kind stated; a kind or an insurance admin fee with no premium has nothing to act on.
  const premium = (key: string): Cents | undefined => optional(record, key, (raw) =>
    nonNegativeCents(raw, `${path}.${key}`, 'an insurance premium is a charge, and a negative one would be a credit this build has no way to pay'));
  const deathPremium = premium('statedDeathPremiumPerYear');
  const tpdPremium = premium('statedTpdPremiumPerYear');
  const insuranceAdminFee = optional(record, 'statedInsuranceAdminFeePerYear', (raw) =>
    nonNegativeCents(raw, `${path}.statedInsuranceAdminFeePerYear`, 'an insurance administration fee is a charge, and a negative one would be a credit this build has no way to pay'));
  const coverKind = optional(record, 'statedInsuranceCoverKind', (raw) =>
    member(PlanFileHouseholdError, raw, `${path}.statedInsuranceCoverKind`, INSURANCE_COVER_KINDS));
  const premiumStated = deathPremium !== undefined || tpdPremium !== undefined;
  if (premiumStated && coverKind === undefined) {
    fail(
      PlanFileHouseholdError,
      `${path}.statedInsuranceCoverKind`,
      'is absent, and an insurance premium is stated. A fixed cover and an age-based cover change in price very differently with age, and this build does not guess which one this is. State statedInsuranceCoverKind as fixed or age-based',
    );
  }
  if (!premiumStated && coverKind !== undefined) {
    fail(
      PlanFileHouseholdError,
      `${path}.statedInsuranceCoverKind`,
      'is stated with no statedDeathPremiumPerYear or statedTpdPremiumPerYear. A cover kind says how a premium changes with age, and there is no premium here. State a premium as well, or remove the cover kind',
    );
  }
  // P3-17b: an IP premium is scaled by one of three Table 4 columns that are not proportional, so
  // the premium and its benefit period are stated together or not at all.
  const incomeProtectionPremium = premium('statedIncomeProtectionPremiumPerYear');
  const benefitPeriod = optional(record, 'statedIncomeProtectionBenefitPeriod', (raw) =>
    member(PlanFileHouseholdError, raw, `${path}.statedIncomeProtectionBenefitPeriod`, INCOME_PROTECTION_BENEFIT_PERIODS));
  if (incomeProtectionPremium !== undefined && benefitPeriod === undefined) {
    fail(
      PlanFileHouseholdError,
      `${path}.statedIncomeProtectionBenefitPeriod`,
      'is absent, and an income protection premium is stated. The fund prices a 2-year, a 5-year and a to-age-65 benefit period on three different age curves, and this build does not guess which one this is. State statedIncomeProtectionBenefitPeriod as 2-years, 5-years or to-65',
    );
  }
  if (incomeProtectionPremium === undefined && benefitPeriod !== undefined) {
    fail(
      PlanFileHouseholdError,
      `${path}.statedIncomeProtectionBenefitPeriod`,
      'is stated with no statedIncomeProtectionPremiumPerYear. A benefit period says how an income protection premium changes with age, and there is no premium here. State the premium as well, or remove the benefit period',
    );
  }
  // The tables price ages 15 to 69, so an end age above 70 would charge a premium off a rate nobody
  // published; refused here by name rather than thrown by the walk.
  const coverEndsAtAge = (key: string, benefit: string): number | undefined => optional(record, key, (raw) => {
    if (typeof raw !== 'number' || !Number.isInteger(raw) || raw < INSURANCE_COVER_EARLIEST_END_AGE || raw > INSURANCE_COVER_ENDS_AT_AGE) {
      fail(
        PlanFileHouseholdError,
        `${path}.${key}`,
        `is ${JSON.stringify(raw)}, and the age ${benefit} cover ends is a whole number from ${INSURANCE_COVER_EARLIEST_END_AGE} to ${INSURANCE_COVER_ENDS_AT_AGE}. The fund's premium tables stop at ${INSURANCE_COVER_ENDS_AT_AGE - 1}, so there is no price for cover past ${INSURANCE_COVER_ENDS_AT_AGE}. Type the age from your fund's insurance terms, or leave it out for ${INSURANCE_COVER_ENDS_AT_AGE}`,
      );
    }
    return raw;
  });
  const deathCoverEndsAtAge = coverEndsAtAge('statedDeathCoverEndsAtAge', 'death');
  const tpdCoverEndsAtAge = coverEndsAtAge('statedTpdCoverEndsAtAge', 'TPD');
  if (!premiumStated && incomeProtectionPremium === undefined && insuranceAdminFee !== undefined) {
    fail(
      PlanFileHouseholdError,
      `${path}.statedInsuranceAdminFeePerYear`,
      'is stated with no statedDeathPremiumPerYear, statedTpdPremiumPerYear or statedIncomeProtectionPremiumPerYear. The fund charges it only while there is cover, and there is no premium here. State a premium as well, or remove the fee',
    );
  }
  return {
    phase,
    balance: cents(PlanFileHouseholdError, record['balance'], `${path}.balance`),
    ...optionally('statedStreamSettings', streamSettings),
    // **ABSENT IS LEGAL AND IT IS THE ORDINARY CASE** (`household.ts` enumerates the four kinds of
    // absence and which three are legal). Every plan file written before 2026-09-20 lacks this key
    // entirely, and a Person with exactly one accumulation interest never needs it — so `optional`
    // rather than a required member, and no default: a defaulted destination would be this module
    // choosing a fund.
    ...optionally('statedEmployerContributionDestination', optional(record, 'statedEmployerContributionDestination', (raw) =>
      member(PlanFileHouseholdError, raw, `${path}.statedEmployerContributionDestination`, EMPLOYER_CONTRIBUTION_DESTINATIONS))),
    // **ABSENT IS THE STATUTORY DEFAULT, NOT A MISSING ANSWER** (`household.ts` enumerates the six
    // kinds and which four are legal). Silence here means NO Subdiv 293-B election — the Person
    // pays the charge in cash, which is what s 293-65 makes them liable to do and what this build
    // has always modelled. So `optional`, and emphatically NO default: a defaulted destination
    // would be this module making an election on the user's behalf, which is register O84 re-opened
    // in the opposite direction.
    ...optionally('statedReleaseAuthorityDestination', optional(record, 'statedReleaseAuthorityDestination', (raw) =>
      member(PlanFileHouseholdError, raw, `${path}.statedReleaseAuthorityDestination`, RELEASE_AUTHORITY_DESTINATIONS))),
    // **P3-17 slice 1 — THE THREE FEE FIGURES, AND ABSENT IS NIL RATHER THAN A THIRD STATE.**
    // `optional`/`optionally` is used for the same mechanical reason it is used above — a file with
    // no fee keys must reproduce its own input on a re-write, and `{ …, key: undefined }` would
    // not — but the MEANING of absence is different and simpler here: there is nothing for this
    // build to derive and nothing for a fund to have decided, so silence costs the Household
    // nothing. `household.ts` states why that under-states the drag and why no default is supplied.
    //
    // **Every plan file written before 2026-09-20 lacks all three and parses unchanged**, which is
    // the whole acceptance criterion of this slice and is pinned in `test/core-parse-plan.test.mjs`.
    //
    // **A NEGATIVE fee is refused BY NAME here rather than deep in the walk.** `cents()` and
    // `rate()` check shape and not sign, and a negative fee is not a malformed number — it is a
    // credit, and these fields name charges. The walk throws on one too, but a `RangeError` out of
    // a projection names no file and no path.
    ...optionally('statedAdministrationFeePerYear', optional(record, 'statedAdministrationFeePerYear', (raw) =>
      nonNegativeCents(raw, `${path}.statedAdministrationFeePerYear`, 'an administration fee is a charge, and a negative one would be a credit this build has no way to pay'))),
    ...optionally('statedAdministrationFeeRate', administrationRate),
    // **P3-17 slice 3 (2026-09-25).** Absent is uncapped — the same nil idiom as the other three fee
    // fields — and the refusal above already ruled out a cap stated with no rate to cap.
    ...optionally('statedAdministrationFeeCapPerYear', administrationFeeCapPerYear),
    ...optionally('statedInvestmentFeeRate', optional(record, 'statedInvestmentFeeRate', (raw) =>
      nonNegativeRate(raw, `${path}.statedInvestmentFeeRate`, 'an investment fee rate is a charge, and a negative one would be a credit this build has no way to pay'))),
    // **P3-17 slice 4 (2026-09-25).** Absent falls back to the accumulation figure at the walk
    // (`household.ts`'s own doc), not to nil — the same optional/optionally mechanics as the
    // accumulation set, for the same reason: a file with none of these three keys must re-write
    // with none of them.
    ...optionally('statedPensionAdministrationFeePerYear', optional(record, 'statedPensionAdministrationFeePerYear', (raw) =>
      nonNegativeCents(raw, `${path}.statedPensionAdministrationFeePerYear`, 'an administration fee is a charge, and a negative one would be a credit this build has no way to pay'))),
    ...optionally('statedPensionAdministrationFeeRate', pensionAdministrationRate),
    ...optionally('statedPensionAdministrationFeeCapPerYear', pensionAdministrationFeeCapPerYear),
    ...optionally('statedDeathPremiumPerYear', deathPremium),
    ...optionally('statedTpdPremiumPerYear', tpdPremium),
    ...optionally('statedInsuranceCoverKind', coverKind),
    ...optionally('statedInsuranceAdminFeePerYear', insuranceAdminFee),
    ...optionally('statedIncomeProtectionPremiumPerYear', incomeProtectionPremium),
    ...optionally('statedIncomeProtectionBenefitPeriod', benefitPeriod),
    ...optionally('statedDeathCoverEndsAtAge', deathCoverEndsAtAge),
    ...optionally('statedTpdCoverEndsAtAge', tpdCoverEndsAtAge),
    ...optionally('keepInAccumulationAtRetirement', keepInAccumulationAtRetirement),
  };
};

const parseParcel = (value: unknown, path: string): Parcel => {
  const record = object(PlanFileHouseholdError, value, path, ['acquired', 'costBase', 'marketValue', 'valueJustBefore1July2027']);
  return {
    acquired: isoDate(PlanFileHouseholdError, record['acquired'], `${path}.acquired`),
    costBase: cents(PlanFileHouseholdError, record['costBase'], `${path}.costBase`),
    marketValue: cents(PlanFileHouseholdError, record['marketValue'], `${path}.marketValue`),
    ...optionally('valueJustBefore1July2027', optional(record, 'valueJustBefore1July2027', (raw) =>
      nonNegativeCents(raw, `${path}.valueJustBefore1July2027`, 'a market value cannot be negative'))),
  };
};

/**
 * **LR-1 slice 2 — the value just before 1 July 2027 has exactly ONE source per plan.** A plan that
 * starts on or before 1 July 2027 walks through that moment, so the walk stamps it and a stated
 * figure is refused: two sources for one fact would be two answers. A plan that starts after it
 * never sees that moment, so every parcel acquired before 1 July 2027 must state it (ITAA 1997
 * s 112-155(3)(a), s 112-175(3)(a)); without it the gain cannot be split. A parcel acquired on or
 * after 1 July 2027 was never deemed sold, so it may not carry one.
 */
const checkParcelValuesJustBefore1July2027 = (household: Household, settings: Settings): void => {
  const walksThrough = settings.asAtDate <= CGT_REFORM_START;
  household.persons.forEach((person, personIndex) => {
    person.parcels.forEach((parcel, index) => {
      const path = `household.persons[${personIndex}].parcels[${index}].valueJustBefore1July2027`;
      const stated = parcel.valueJustBefore1July2027 !== undefined;
      if (walksThrough && stated) {
        fail(PlanFileHouseholdError, path, `is stated, and the plan starts on ${settings.asAtDate}, so the forecast itself passes 1 July 2027 and takes this figure from the parcel's projected value on that day. Leave it out`);
      }
      if (!walksThrough && parcel.acquired >= CGT_REFORM_START && stated) {
        fail(PlanFileHouseholdError, path, `is stated on a parcel acquired on ${parcel.acquired}, on or after 1 July 2027, which was never held through 30 June 2027 and so was never deemed sold. Leave it out`);
      }
      if (!walksThrough && parcel.acquired < CGT_REFORM_START && !stated) {
        fail(PlanFileHouseholdError, path, `is missing. The plan starts on ${settings.asAtDate}, after 1 July 2027, and this parcel was acquired on ${parcel.acquired}, so the law deems it sold and bought back at its market value just before 1 July 2027 (ITAA 1997 s 112-155). State that value in cents; the gain cannot be worked out without it`);
      }
    });
  });
};

const parsePerson = (value: unknown, path: string): Person => {
  const record = object(PlanFileHouseholdError, value, path, [
    'name',
    'dateOfBirth',
    'superInterests',
    'parcels',
    'employmentIncomePerFortnight',
    'workBonusBalance',
    'statedPriorRetirementPhase',
    'statedUnusedConcessionalCap',
    'statedTotalSuperBalanceAt30June',
  ]);
  return {
    name: string(PlanFileHouseholdError, record['name'], `${path}.name`),
    dateOfBirth: isoDate(PlanFileHouseholdError, record['dateOfBirth'], `${path}.dateOfBirth`),
    superInterests: array(PlanFileHouseholdError, record['superInterests'], `${path}.superInterests`)
      .map((interest, index) => parseSuperInterest(interest, `${path}.superInterests[${index}]`)),
    parcels: array(PlanFileHouseholdError, record['parcels'], `${path}.parcels`)
      .map((parcel, index) => parseParcel(parcel, `${path}.parcels[${index}]`)),
    employmentIncomePerFortnight: cents(PlanFileHouseholdError, record['employmentIncomePerFortnight'], `${path}.employmentIncomePerFortnight`),
    workBonusBalance: cents(PlanFileHouseholdError, record['workBonusBalance'], `${path}.workBonusBalance`),
    ...optionally('statedPriorRetirementPhase', optional(record, 'statedPriorRetirementPhase', (raw) =>
      member(PlanFileHouseholdError, raw, `${path}.statedPriorRetirementPhase`, PRIOR_RETIREMENT_PHASES))),
    ...optionally('statedUnusedConcessionalCap', optional(record, 'statedUnusedConcessionalCap', (raw) =>
      parseStatedUnusedConcessionalCap(raw, `${path}.statedUnusedConcessionalCap`))),
    ...optionally('statedTotalSuperBalanceAt30June', optional(record, 'statedTotalSuperBalanceAt30June', (raw) =>
      nonNegativeCents(raw, `${path}.statedTotalSuperBalanceAt30June`, 'a total super balance is what the accounts held, and cannot be below nil'))),
  };
};

/**
 * **P3-4b — the unused concessional cap myGov shows per year: keyed by financial year, whole
 * non-negative cents.** The shape is checked here; which years may be stated, and the ceiling on
 * each, need the plan's first year and so are `checkStatedUnusedConcessionalCaps`'.
 */
const parseStatedUnusedConcessionalCap = (value: unknown, path: string): Readonly<Record<FinancialYear, Cents>> => {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    fail(PlanFileHouseholdError, path, `is ${describe(value)}, and an object keyed by financial year ("2024-25") was required`);
  }
  const stated: Record<FinancialYear, Cents> = {};
  for (const [year, amount] of Object.entries(value as Record<string, unknown>)) {
    try {
      financialYearStartYear(year as FinancialYear);
    } catch {
      fail(PlanFileHouseholdError, `${path}["${year}"]`, 'is not a financial year: the form is 2024-25');
    }
    stated[year as FinancialYear] = nonNegativeCents(amount, `${path}["${year}"]`,
      'an unused cap is what was left of a year\'s cap, and a negative one would be a contribution over it. State nil as 0, or leave the year out');
  }
  return stated;
};

/**
 * **P3-4b — which years an unused cap may be stated for, and how much.** Only the five years before
 * the plan's first financial year (s 291-20(3)–(4)'s window, read off the register): an earlier year
 * has expired before the forecast begins, and the plan's own years are walked, so a stated figure
 * there would be a second answer to a question the forecast answers. And never more than that
 * year's general cap where this build can state it — FY2026-27's published $32,500, or a later
 * year's derived from this plan's wage rate. A year before FY2026-27 has no cap in the register,
 * so its figure is taken as myGov states it.
 */
const checkStatedUnusedConcessionalCaps = (household: Household, settings: Settings): void => {
  const firstYear = financialYearContaining(settings.asAtDate);
  const window = financialYearsBefore(firstYear, SUPERANNUATION.carryForward.lookBackYears.value);
  household.persons.forEach((person, personIndex) => {
    // P3-4b slice 2: the 30 June balance is asked for only where the plan's own balances are at a
    // later date. On a 1 July plan they ARE that 30 June's, and a second figure would be a second
    // answer to the same question.
    if (person.statedTotalSuperBalanceAt30June !== undefined && settings.asAtDate === startOfFinancialYear(firstYear)) {
      fail(PlanFileHouseholdError, `household.persons[${personIndex}].statedTotalSuperBalanceAt30June`,
        `is stated on a plan dated ${settings.asAtDate}: that plan's own super balances already are the 30 June ones the $500,000 test reads. Leave it out`);
    }
    for (const [year, amount] of Object.entries(person.statedUnusedConcessionalCap ?? {})) {
      const path = `household.persons[${personIndex}].statedUnusedConcessionalCap["${year}"]`;
      if (!window.includes(year as FinancialYear)) {
        fail(PlanFileHouseholdError, path,
          `is outside the carry-forward window. The plan starts in FY${firstYear}, so an unused cap can be stated for FY${window[0]} to FY${window[window.length - 1]} only: an earlier year's has expired before the forecast begins, and a later one is walked by the forecast itself`);
      }
      let cap: Cents | undefined;
      try {
        cap = concessionalContributionsCap(year as FinancialYear, forecastAwoteIndexNumbers(year as FinancialYear, settings.economicSeries.awote)).amount;
      } catch (error) {
        if (!(error instanceof MissingIndexNumberError)) throw error;
      }
      if (cap !== undefined && amount > cap) {
        fail(PlanFileHouseholdError, path,
          `is ${amount} cents, more than FY${year}'s whole general concessional cap of ${cap} cents. What is left of a cap cannot be more than the cap: state the unused amount myGov shows for that year`);
      }
    }
  });
};

/**
 * **The home loan (P3-16 slice 1), and the four things the door decides about it.**
 *
 * 1. **Nothing owing is refused**, so an absent `mortgage` is the one and only way a file says "no
 *    home loan". A stated loan of nil would be a second spelling of the same fact, and it would
 *    walk as a mortgage that pays nothing forever.
 * 2. **A negative balance, a negative rate and a nil-or-negative repayment are refused by name**,
 *    on `nonNegativeCents`' reasoning: these fields name a debt and a payment, and the arithmetic
 *    in `mortgageMonth` throws a bare `RangeError` that names no file and no path.
 * 3. **A repayment that does not cover the first month's interest is refused HERE, at the door**,
 *    with the file path on it — and it is refused by calling `mortgageMonth` itself rather than by
 *    a second copy of the arithmetic, so the door and the walk cannot come to different answers
 *    about the same loan. The offset it is tested against is the one this very file states.
 * 4. **A rate of nil is ACCEPTED.** A family loan at no interest is a real arrangement, and it
 *    amortises as pure principal.
 *
 * The door cannot promise the loan amortises for the whole walk: the Offset Account moves, so a
 * repayment that covers month 1's interest need not cover month 300's. `mortgageMonth` refuses that
 * month inside the walk, which is the only place it can be known.
 */
const parseMortgage = (value: unknown, path: string): Mortgage => {
  const record = object(PlanFileHouseholdError, value, path, ['openingBalance', 'annualInterestRate', 'monthlyRepayment']);
  const openingBalance = nonNegativeCents(record['openingBalance'], `${path}.openingBalance`,
    'a mortgage balance is what is owed, and a negative one would be the lender owing the household');
  if (openingBalance === 0) {
    fail(PlanFileHouseholdError, `${path}.openingBalance`,
      'is 0 cents: a home loan with nothing owing is not a home loan. Leave the whole "mortgage" key out to say there is none — a stated loan of nil and no loan at all would be two spellings of one fact');
  }
  const annualInterestRate = nonNegativeRate(record['annualInterestRate'], `${path}.annualInterestRate`,
    'a mortgage interest rate is a charge, and a negative one would be a lender paying the household to borrow. Nil is legal — an interest-free family loan — and is stated as 0');
  const monthlyRepayment = nonNegativeCents(record['monthlyRepayment'], `${path}.monthlyRepayment`,
    'a mortgage repayment is money leaving the household, and a negative one would be money arriving');
  if (monthlyRepayment === 0) {
    fail(PlanFileHouseholdError, `${path}.monthlyRepayment`,
      'is 0 cents: a loan nobody repays is never repaid, and this build refuses to forecast one rather than draw a balance that never falls');
  }
  return { openingBalance, annualInterestRate, monthlyRepayment };
};

const parseHousehold = (value: unknown, path: string): Household => {
  const record = object(PlanFileHouseholdError, value, path, ['persons', 'homeStatus', 'openingOffsetBalance', 'offsetShares', 'mortgage']);
  const persons = array(PlanFileHouseholdError, record['persons'], `${path}.persons`)
    .map((person, index) => parsePerson(person, `${path}.persons[${index}]`));
  // One or two. `Household.persons` is a tuple type, and a third Person has no meaning anywhere in
  // this model: `isCouple` reads the length, and every couple rule is written for exactly two.
  const [first, second, ...rest] = persons;
  if (first === undefined || rest.length > 0) {
    fail(PlanFileHouseholdError, `${path}.persons`, `holds ${persons.length} people, and a household is one person or two`);
  }
  const openingOffsetBalance = optional(record, 'openingOffsetBalance', (raw) => cents(PlanFileHouseholdError, raw, `${path}.openingOffsetBalance`));
  const mortgage = optional(record, 'mortgage', (raw) => parseMortgage(raw, `${path}.mortgage`));
  // **Point 3 of `parseMortgage`: the first month, walked here, against this file's own offset.**
  // One expression, two readers — the door and the walk both ask `mortgageMonth`, so a loan the
  // door lets through is a loan month 1 of the walk can price. The refusal is re-thrown under the
  // section's own name with the path on it, exactly as `isoDate` re-throws `assertIsoDate`.
  if (mortgage !== undefined) {
    try {
      mortgageMonth(mortgage, mortgage.openingBalance, openingOffsetBalance ?? (0 as Cents));
    } catch (refusal) {
      fail(PlanFileHouseholdError, `${path}.mortgage.monthlyRepayment`,
        `states ${mortgage.monthlyRepayment} cents a month, and the loan is refused: ${refusal instanceof Error ? refusal.message : String(refusal)}`);
    }
  }
  const offsetShares = optional(record, 'offsetShares', (raw) =>
    array(PlanFileHouseholdError, raw, `${path}.offsetShares`).map((share, index) =>
      rate(PlanFileHouseholdError, share, `${path}.offsetShares[${index}]`))) as Household['offsetShares'];
  const household: Household = {
    persons: second === undefined ? [first] : [first, second],
    homeStatus: member(PlanFileHouseholdError, record['homeStatus'], `${path}.homeStatus`, HOME_STATUSES),
    ...optionally('openingOffsetBalance', openingOffsetBalance),
    ...optionally('offsetShares', offsetShares),
    ...optionally('mortgage', mortgage),
  };
  // **The ownership shares, judged by the walk's own reader** — `mortgageMonth`'s idiom above: one
  // expression at the door and in the walk, re-thrown here with the path on it.
  try {
    offsetSharesOf(household);
  } catch (refusal) {
    fail(PlanFileHouseholdError, `${path}.offsetShares`, `is refused: ${refusal instanceof Error ? refusal.message : String(refusal)}`);
  }
  return household;
};

// --- Entries ----------------------------------------------------------------------------------------

const ENTRY_OWNERS: readonly EntryOwner[] = ['personA', 'personB', 'household'];

/**
 * The 65, read from the record and never written — `trisConversionDay.ts`'s own precedent, taken
 * here for the same reason: a literal `65` would be a second, unsourced copy of a statutory age.
 */
const AUTOMATIC_RELEASE_AGE: number = SUPERANNUATION.access.automaticReleaseAge.value;

const PARCEL_SELECTIONS: readonly ParcelSelection[] = ['oldest-first', 'highest-cost-base-first', 'lowest-cost-base-first'];

const ENTRY_KEYS = ['id', 'date', 'owner', 'type', 'params', 'note', 'enabled', 'createdAt', 'origin'];

/**
 * **The longest texts an entry's `origin` may hold (P15-13).** The question box on the page stops
 * at `ORIGIN_QUESTION_MAX` characters. A reply is at most 4,096 tokens (`anthropic.ts`), a few
 * characters each, with every chip written out as a dollar figure and its basis — well inside
 * `ORIGIN_REPLY_MAX`. A longer text is not a chat turn this build wrote, and is refused rather
 * than cut: a shortened reply is a different record of what was said.
 */
export const ORIGIN_QUESTION_MAX = 4_000;
export const ORIGIN_REPLY_MAX = 50_000;
export const ORIGIN_MODEL_MAX = 200;

/** `Date.prototype.toISOString`'s own form, and nothing looser. */
const ISO_TIMESTAMP = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;

const boundedText = (value: unknown, path: string, most: number, emptyAllowed: boolean): string => {
  const text = string(PlanFileEntryError, value, path);
  if (!emptyAllowed && text.trim() === '') fail(PlanFileEntryError, path, 'is empty, and an accepted chat suggestion records what was said');
  if (text.length > most) fail(PlanFileEntryError, path, `is ${text.length} characters, and at most ${most} is a chat turn this build writes`);
  return text;
};

/** The chat turn behind an accepted suggestion: exactly four fields, each checked. Provenance only. */
const parseOrigin = (value: unknown, path: string): EntryOrigin => {
  const record = object(PlanFileEntryError, value, path, ['question', 'reply', 'model', 'date']);
  const date = string(PlanFileEntryError, record['date'], `${path}.date`);
  if (!ISO_TIMESTAMP.test(date) || Number.isNaN(Date.parse(date)) || new Date(date).toISOString() !== date) {
    fail(PlanFileDateError, `${path}.date`, `is "${date}", which is not an ISO 8601 UTC timestamp (YYYY-MM-DDTHH:MM:SS.sssZ)`);
  }
  return {
    question: boundedText(record['question'], `${path}.question`, ORIGIN_QUESTION_MAX, false),
    reply: boundedText(record['reply'], `${path}.reply`, ORIGIN_REPLY_MAX, true),
    model: boundedText(record['model'], `${path}.model`, ORIGIN_MODEL_MAX, false),
    date,
  };
};

/**
 * One `HeasDrawParams.advances` entry — `date` and `amount`, `parseParcel`'s own two-field shape
 * (P9-2b). The span, window-count and window-dollar-cap checks are whole-entry facts and live in
 * `checkHeasDraws` below, which needs every advance on the entry at once, not one at a time.
 */
const parseHeasAdvance = (value: unknown, path: string): { readonly date: IsoDate; readonly amount: Cents } => {
  const record = object(PlanFileEntryError, value, path, ['date', 'amount']);
  const amount = cents(PlanFileEntryError, record['amount'], `${path}.amount`);
  if (amount <= 0) {
    fail(PlanFileEntryError, `${path}.amount`, `is ${amount} cents, and an advance is more than nothing`);
  }
  return { date: isoDate(PlanFileEntryError, record['date'], `${path}.date`), amount };
};

/**
 * The params parser for each entry type this build can honour — **and the definition of which
 * types those are**. `UNSPECIFIED_ENTRY_TYPES` below is `ENTRY_TYPES` minus this record's keys, so
 * adding a type here is the single edit that stops it being refused. There is no second list to
 * keep in step.
 *
 * ⚠️ **A parser here says the DOOR can read the type, and NOT that `projection.ts` acts on it.**
 * `SUPER_CONTRIBUTION` is the first type where those two differ: it parses, and the walk has no
 * branch for it, so a plan holding one projects to the same figures it would without it. The
 * divergence is held open in exactly one named place — `planEdits.ENTRY_TYPES_NOT_YET_WALKED` —
 * and the entry form is built from the set with those types taken back out, so no user can add
 * money that does not move.
 */
const PARAMS_PARSERS = {
  RETIRE: (value: unknown, path: string): Entry['params'] => {
    object(PlanFileEntryError, value, path, []);
    return {};
  },
  WORK_PATTERN_CHANGE: (value: unknown, path: string): Entry['params'] => {
    const record = object(PlanFileEntryError, value, path, ['daysPerWeek', 'annualSalary']);
    const daysPerWeek = rate(PlanFileEntryError, record['daysPerWeek'], `${path}.daysPerWeek`);
    if (daysPerWeek < 0) fail(PlanFileEntryError, `${path}.daysPerWeek`, `is ${daysPerWeek}, and a week holds no negative days`);
    const annualSalary = cents(PlanFileEntryError, record['annualSalary'], `${path}.annualSalary`);
    // **Refused on `daysPerWeek`'s and `annualSpend`'s ground: a figure the engine cannot act on.**
    // The salary REPLACES the Person's annualised employment income from this date, and a negative
    // one would be walked as a negative pay packet — an inflow line of minus money, taxed on a
    // negative assessable income.
    if (annualSalary < 0) fail(PlanFileEntryError, `${path}.annualSalary`, `is ${annualSalary} cents, and a salary is not negative`);
    // **The two fields must AGREE, and this is the one place in this file that compares two
    // siblings (2026-09-19).** Everything else here checks a value against its own type or its own
    // sign; nothing else asks whether two stated figures can both be true. It is kept in the file's
    // idiom rather than given machinery of its own — same `fail`, same `PlanFileEntryError`, same
    // inline position right after both values are in hand, and the `path` names the field the
    // reader should change. No new named refusal class: that would need a register row under ruling
    // R8, and this is a well-formedness check on one entry, not an unanswered question about the
    // law.
    //
    // The ground: an entry saying "I work no days and earn $60,000" states two incompatible facts,
    // and `projection.ts` would honour one of them and silently drop the other — exactly the
    // engine-disagrees-with-the-file mismatch that stating the salary was meant to end. Both
    // directions are refused, because either half can be the one the user meant.
    if (daysPerWeek === 0 && annualSalary !== 0) {
      fail(PlanFileEntryError, `${path}.annualSalary`, `is ${annualSalary} cents while daysPerWeek is 0, and no days worked is no salary earned — state 0, or state the days that earn it`);
    }
    if (daysPerWeek > 0 && annualSalary === 0) {
      fail(PlanFileEntryError, `${path}.annualSalary`, `is 0 while daysPerWeek is ${daysPerWeek}, and days worked for nothing is not a work pattern this model can walk — state the salary those days pay, or state 0 days`);
    }
    return { daysPerWeek, annualSalary };
  },
  SPEND_CHANGE: (value: unknown, path: string): Entry['params'] => {
    const record = object(PlanFileEntryError, value, path, ['annualSpend']);
    const annualSpend = cents(PlanFileEntryError, record['annualSpend'], `${path}.annualSpend`);
    // **Refused, on `daysPerWeek`'s ground above, and added when a form could first produce one
    // (P6-6).** A negative spending level is not a figure the engine acts on: `projection.ts`
    // emits the spending line only `if (monthlySpend > 0)`, so a plan stating minus $500 a year
    // would be accepted, saved, and then walked as though the household spends NOTHING — a
    // silently different forecast from the one the file describes. Zero is allowed and means what
    // it says: a household that spends nothing from this date.
    if (annualSpend < 0) fail(PlanFileEntryError, `${path}.annualSpend`, `is ${annualSpend} cents, and a household does not spend a negative amount`);
    return { annualSpend };
  },
  ONE_OFF_EXPENSE: (value: unknown, path: string): Entry['params'] => {
    const record = object(PlanFileEntryError, value, path, ['amount']);
    return { amount: cents(PlanFileEntryError, record['amount'], `${path}.amount`) };
  },
  LUMP_SUM_FROM_SUPER: (value: unknown, path: string): Entry['params'] => {
    const record = object(PlanFileEntryError, value, path, ['amount', 'interestIndex']);
    const amount = cents(PlanFileEntryError, record['amount'], `${path}.amount`);
    // **Refused on `annualSpend`'s ground: a figure the engine cannot act on.** A negative
    // withdrawal is a contribution wearing the wrong entry type, and `projection.ts` has no path
    // that puts money INTO an interest; a nil one states an act that moves nothing, and it would
    // still be gated, so a Household under 60 could be refused by name for withdrawing nothing.
    if (amount <= 0) {
      fail(PlanFileEntryError, `${path}.amount`, `is ${amount} cents, and a lump sum out of superannuation is more than nothing — a withdrawal INTO super is a contribution, which is a different entry type`);
    }
    // **Which interest, and it is REQUIRED** (`plan.ts`). The door can check that it is a position
    // and cannot check that the position exists: the number of interests is a fact about the
    // Household, and `projection.ts` refuses an index that names none of them, by the entry's id.
    const interestIndex = record['interestIndex'];
    if (typeof interestIndex !== 'number' || !Number.isSafeInteger(interestIndex) || interestIndex < 0) {
      fail(PlanFileEntryError, `${path}.interestIndex`, `is ${JSON.stringify(interestIndex)}, and which superannuation interest the lump sum comes out of is a position in that Person's \`superInterests\` — a whole number from 0. It is required: a Person may hold more than one interest, and a model that picked one would withdraw from a different account the day a second is added`);
    }
    return { amount, interestIndex };
  },
  // **The shape only. Everything that needs the whole Household — which interest, whether it is a
  // TTR interest, and whether the entry's own `date` is before that Person's 65th birthday — is
  // `checkTrisEarlyConversionTargets`'s job below, on `checkContributionTargets`'s precedent: a
  // params parser sees one entry and nothing else, and this type has no branch in `projection.ts`
  // for a dangling fact to surface in later, so it is refused here rather than saved silently.**
  TRIS_EARLY_CONVERSION: (value: unknown, path: string): Entry['params'] => {
    const record = object(PlanFileEntryError, value, path, ['interestIndex']);
    // Which interest, REQUIRED, on `LUMP_SUM_FROM_SUPER.interestIndex`'s ruling.
    const interestIndex = record['interestIndex'];
    if (typeof interestIndex !== 'number' || !Number.isSafeInteger(interestIndex) || interestIndex < 0) {
      fail(PlanFileEntryError, `${path}.interestIndex`, `is ${JSON.stringify(interestIndex)}, and which superannuation interest converted is a position in that Person's \`superInterests\` — a whole number from 0. It is required: a Person may hold more than one interest, and a model that picked one would convert a different account the day a second is added`);
    }
    return { interestIndex };
  },
  // `TTR_START` — retire flow S4. The shape only; the owner, the account and the ages are
  // `checkTtrStartTargets`', below. The rate is optional (absent pays the Schedule 7 minimum) and
  // has `TTR_RATE_CHANGE`'s bounds.
  TTR_START: (value: unknown, path: string): Entry['params'] => {
    const record = object(PlanFileEntryError, value, path, ['interestIndex', 'drawdownRate']);
    const interestIndex = record['interestIndex'];
    if (typeof interestIndex !== 'number' || !Number.isSafeInteger(interestIndex) || interestIndex < 0) {
      fail(PlanFileEntryError, `${path}.interestIndex`, `is ${JSON.stringify(interestIndex)}, and which super account becomes the transition to retirement pension is a position in that Person's \`superInterests\` — a whole number from 0. It is required`);
    }
    return {
      interestIndex,
      ...optionally('drawdownRate', optional(record, 'drawdownRate', (raw) => parseTtrDrawdownRate(raw, `${path}.drawdownRate`, PlanFileEntryError))),
    };
  },
  // `TTR_RATE_CHANGE` — the shape only; which interest, its phase and the 65th birthday are
  // `checkTtrRateChangeTargets`'s, below. The rate has the household box's bounds, from the same
  // function.
  TTR_RATE_CHANGE: (value: unknown, path: string): Entry['params'] => {
    const record = object(PlanFileEntryError, value, path, ['interestIndex', 'drawdownRate']);
    const interestIndex = record['interestIndex'];
    if (typeof interestIndex !== 'number' || !Number.isSafeInteger(interestIndex) || interestIndex < 0) {
      fail(PlanFileEntryError, `${path}.interestIndex`, `is ${JSON.stringify(interestIndex)}, and which super account changes its drawdown rate is a position in that Person's \`superInterests\` — a whole number from 0. It is required: a Person may hold more than one account, and a model that picked one would change a different account the day a second is added`);
    }
    return { interestIndex, drawdownRate: parseTtrDrawdownRate(record['drawdownRate'], `${path}.drawdownRate`, PlanFileEntryError) };
  },
  // `INSURANCE_COVER_CHANGE` — P3-17a slice 3. The shape and the fraction; the owner, the account,
  // its premiums and the birthday its cover ends are `checkInsuranceCoverChangeTargets`', below.
  INSURANCE_COVER_CHANGE: (value: unknown, path: string): Entry['params'] => {
    const record = object(PlanFileEntryError, value, path, ['interestIndex', 'benefit', 'coverFraction']);
    const interestIndex = record['interestIndex'];
    if (typeof interestIndex !== 'number' || !Number.isSafeInteger(interestIndex) || interestIndex < 0) {
      fail(PlanFileEntryError, `${path}.interestIndex`, `is ${JSON.stringify(interestIndex)}, and which super account's cover changes is a position in that Person's \`superInterests\` — a whole number from 0. It is required`);
    }
    const benefit = member(PlanFileEntryError, record['benefit'], `${path}.benefit`, INSURANCE_COVER_BENEFITS);
    const coverFraction = rate(PlanFileEntryError, record['coverFraction'], `${path}.coverFraction`);
    if (coverFraction >= 1) {
      fail(PlanFileEntryError, `${path}.coverFraction`, `is ${coverFraction}, and raising cover is not modelled: a fund asks for fresh health evidence (underwriting) before it adds cover, and this forecast cannot know the answer. State a fraction below 1 — 0.5 halves the cover, 0 cancels it`);
    }
    if (coverFraction < 0) {
      fail(PlanFileEntryError, `${path}.coverFraction`, `is ${coverFraction}, and the share of cover kept runs from 0 (cancelled) to just under 1`);
    }
    return { interestIndex, benefit, coverFraction };
  },
  SUPER_CONTRIBUTION: (value: unknown, path: string): Entry['params'] => {
    // `kind` is the discriminant (`plan.ts`) and only ONE of its four real values is specified, so
    // the three that are not are refused with the reason they are not — a bare "not one of the
    // allowed values" would tell a user their $20,000 is unreadable without telling them that it
    // is unreadable because the engine computes that figure itself, or because the notice of
    // intent is missing, or because this type cannot say "once".
    //
    // **A FIFTH VALUE JOINED THEM ON 2026-09-21 AND IT IS NOT A KIND OF CONTRIBUTION**: `'stopped'`
    // ends the standing arrangement from this entry's date (P6-8 brief 4). It rides on the same
    // discriminant because it is a statement about the same standing thing, and because every
    // reader that switches on `kind` — this parser, the walk, the form, the entry row — is then
    // made to decide what a stop means by the compiler rather than by a reviewer.
    const record = object(PlanFileEntryError, value, path, ['kind', 'annualAmount', 'interestIndex']);
    const kind = record['kind'];
    // **THE STOP, and it is read before anything else because it has no other fields** (P6-8 brief
    // 4, user ruling 2026-09-21). `kind: 'stopped'` is the second member of
    // `SuperContributionParams`: the date is the whole of the fact, so an `annualAmount` or an
    // `interestIndex` beside it is refused rather than ignored — a figure this parser dropped
    // silently would be a figure the user typed and the forecast never used, which is the whole
    // reason `object` above lists its keys. What only the WHOLE FILE can check — that there is an
    // arrangement for this Person to stop — is `checkContributionTargets`, below.
    if (kind === 'stopped') {
      if (record['annualAmount'] !== undefined) {
        fail(PlanFileEntryError, `${path}.annualAmount`, 'is stated beside kind "stopped", and a stop states no amount — it ends the standing arrangement from this entry\'s date. To sacrifice a smaller amount instead, state that amount with kind "salarySacrificed"');
      }
      if (record['interestIndex'] !== undefined) {
        fail(PlanFileEntryError, `${path}.interestIndex`, 'is stated beside kind "stopped", and a stop names no account: a Person holds one standing arrangement at a time, so there is nothing for it to choose between. Stopping part of an arrangement is not expressible');
      }
      return { kind: 'stopped' };
    }
    if (kind === 'employer' || kind === 'employerContributions' || kind === 'superGuarantee') {
      fail(PlanFileEntryError, `${path}.kind`, `is ${JSON.stringify(kind)}, and the employer Superannuation Guarantee is COMPUTED from the Person's earnings (superContributions.ts), never stated in an entry — a stated one would be a second copy of a figure this engine already derives, and the two would disagree the moment a salary changed. Additional employer contributions beyond the Guarantee have no entry type yet`);
    }
    if (kind === 'personalDeductible') {
      fail(PlanFileEntryError, `${path}.kind`, 'is "personalDeductible", which is not specified yet: ITAA 1997 s 290-170 makes a personal contribution deductible only where a notice of intent was given to the fund AND acknowledged by it, and that acknowledgement is a fact about the year that this entry has no field for. Without it the same dollars are NON-concessional — a cap four times the size and no fund tax — so the engine would have to guess which of two treatments applies. Refusing instead');
    }
    if (kind === 'nonConcessional') {
      fail(PlanFileEntryError, `${path}.kind`, 'is "nonConcessional", which is not specified yet: a non-concessional contribution is typically a LUMP — $120,000, or $360,000 under a bring-forward arrangement — and this entry type states an annual LEVEL that holds until it is superseded. Read as a level, one lump would be contributed again every year to the Planning Horizon');
    }
    // Anything else — a typo, a casing slip, an absent field — lands here and is refused against
    // the two values this build can read: the arrangement, and the stop that ends it. Both are
    // named, because a user who mistyped "stopped" must be told that stopping is possible.
    member(PlanFileEntryError, kind, `${path}.kind`, ['salarySacrificed', 'stopped'] as const);
    const annualAmount = cents(PlanFileEntryError, record['annualAmount'], `${path}.annualAmount`);
    // **Refused at nil and below, on `LUMP_SUM_FROM_SUPER.amount`'s ground.** A negative sacrifice
    // is a withdrawal wearing the wrong entry type, and this engine has no path that takes money
    // OUT of a fund through a contribution. A nil one is an arrangement that arranges nothing: it
    // would still be listed, still owned, still assessed against a cap, and it is the shape a user
    // would reach for to say "stop sacrificing from here" — which this type cannot say and must
    // not appear to (`plan.ts`, and TODO P6-8).
    if (annualAmount <= 0) {
      fail(PlanFileEntryError, `${path}.annualAmount`, `is ${annualAmount} cents, and a contribution into superannuation is more than nothing — a negative one is a withdrawal, which is a different entry type, and a nil one is how a user would try to say "stop", which this entry type cannot say`);
    }
    // Which interest, REQUIRED, on `LUMP_SUM_FROM_SUPER.interestIndex`'s ruling. Unlike there, the
    // index is ALSO checked against the Household — see `checkContributionTargets`, which runs at
    // the file level where both halves are in hand.
    const interestIndex = record['interestIndex'];
    if (typeof interestIndex !== 'number' || !Number.isSafeInteger(interestIndex) || interestIndex < 0) {
      fail(PlanFileEntryError, `${path}.interestIndex`, `is ${JSON.stringify(interestIndex)}, and which superannuation interest the contribution goes INTO is a position in that Person's \`superInterests\` — a whole number from 0. It is required: a Person may hold more than one interest, they may be in different phases, and a retirement-phase interest cannot receive a contribution at all`);
    }
    // The discriminant is WRITTEN here rather than passed through from `kind`, on
    // `nonSuperInvestmentBuyEntry`'s rule: which shape is being built is decided by which branch of
    // this function ran, so the field list and the discriminant cannot disagree. `member` above has
    // already refused everything that is not one of the two, and `'stopped'` returned long before
    // this line.
    return { kind: 'salarySacrificed', annualAmount, interestIndex };
  },
  /**
   * **`MORTGAGE_REFINANCE` — the loan's terms from a date (P3-16 slice 2).** The same three figures
   * `parseMortgage` reads and the same three refusals, word for word, because it is the same fact
   * stated at a different time: all three REQUIRED (`plan.ts` — a partial change would make the
   * walk reach back for whatever was in force), a nil balance refused so that absence stays the one
   * spelling of "no loan", a nil rate accepted, and a nil-or-negative repayment refused.
   *
   * ⚠️ **WHAT THIS DOOR CANNOT CHECK, SAID PLAINLY RATHER THAN PAPERED OVER.** `parseHousehold`
   * above refuses a `Household.mortgage` whose repayment does not cover its FIRST month's interest,
   * by calling `mortgageMonth` against the offset balance the file itself states. **No such check
   * is possible here.** A change dated ten years out has to be tested against the Offset Account
   * balance in THAT month, and that balance is an output of `project()` — the door has no walk and
   * cannot have one (ADR-0002: the solver calls `project()` in a loop; a parse that projected would
   * be a parse that could not terminate).
   *
   * So what is lost, exactly: for a dated change there is **no pre-flight, path-bearing,
   * form-showable refusal** of an unpayable loan. The user meets it as a thrown error from the walk
   * after saving, rather than as a red message on the box they typed. What replaces it is a
   * walk-time refusal that NAMES THIS ENTRY'S ID AND THE MONTH (`projection.ts`), so the message
   * identifies which entry to fix even though it cannot be attached to the field. The day-1 check
   * above is untouched: it is valid and cheap for the one case it can know.
   */
  MORTGAGE_REFINANCE: (value: unknown, path: string): Entry['params'] => {
    const record = object(PlanFileEntryError, value, path, ['openingBalance', 'annualInterestRate', 'monthlyRepayment']);
    const openingBalance = cents(PlanFileEntryError, record['openingBalance'], `${path}.openingBalance`);
    if (openingBalance < 0) {
      fail(PlanFileEntryError, `${path}.openingBalance`, `is ${openingBalance} cents: a mortgage balance is what is owed, and a negative one would be the lender owing the household`);
    }
    // **Nil is refused here for `parseMortgage`'s reason AND for one of its own.** Absence is still
    // the one spelling of "no loan"; and a user reaching for zero here is reaching for a payout,
    // which is a DIFFERENT entry — `MORTGAGE_PAYOFF` adds the balance to the month's Waterfall target,
    // funded like spending — from cash, investments or super.
    // Letting a nil through here would invent a discharge with no money leaving, so the refusal
    // points at the entry that does it properly.
    if (openingBalance === 0) {
      fail(PlanFileEntryError, `${path}.openingBalance`, 'is 0 cents: a home loan with nothing owing is not a home loan. This entry sets the terms of a loan and cannot be used to pay one off — a nil balance here would discharge the loan with no money leaving the household. To pay the loan off in full, add a "Home loan — pay off in full" entry (MORTGAGE_PAYOFF) dated that month instead. To say the household has no loan, do not state one');
    }
    const annualInterestRate = rate(PlanFileEntryError, record['annualInterestRate'], `${path}.annualInterestRate`);
    if (annualInterestRate < 0) {
      fail(PlanFileEntryError, `${path}.annualInterestRate`, `is ${annualInterestRate}: a mortgage interest rate is a charge, and a negative one would be a lender paying the household to borrow. Nil is legal — an interest-free family loan — and is stated as 0`);
    }
    const monthlyRepayment = cents(PlanFileEntryError, record['monthlyRepayment'], `${path}.monthlyRepayment`);
    if (monthlyRepayment < 0) {
      fail(PlanFileEntryError, `${path}.monthlyRepayment`, `is ${monthlyRepayment} cents: a mortgage repayment is money leaving the household, and a negative one would be money arriving`);
    }
    if (monthlyRepayment === 0) {
      fail(PlanFileEntryError, `${path}.monthlyRepayment`, 'is 0 cents: a loan nobody repays is never repaid, and this build refuses to forecast one rather than draw a balance that never falls');
    }
    return { openingBalance, annualInterestRate, monthlyRepayment };
  },
  // `MortgageTargetParams` is `{}` — `RETIRE`'s own precedent, above. The entry's own `date` is the
  // whole of the stated fact; which milestone it means (payoff, or an offset covering the balance)
  // is carried in the entry's free-text `note`, never a structured field (`plan.ts`, P3-16a).
  MORTGAGE_TARGET: (value: unknown, path: string): Entry['params'] => {
    object(PlanFileEntryError, value, path, []);
    return {};
  },
  // `MortgagePayoffParams` is `{}` too: the amount is whatever the walk says is owed that month, so
  // a stated one could only disagree with it. Whether there IS a loan to pay off that month is a
  // walked fact, refused in `projection.ts` by entry id and month — `MORTGAGE_REFINANCE`'s two-tier
  // door/walk shape, because the balance in a later month is an output of `project()`.
  MORTGAGE_PAYOFF: (value: unknown, path: string): Entry['params'] => {
    object(PlanFileEntryError, value, path, []);
    return {};
  },
  // `IllnessSeparationParams` is `{}` (P12-4): the date is the whole of the fact. Whether the
  // Household is a couple at all is a whole-file fact, `checkIllnessSeparations`' job below.
  ILLNESS_SEPARATION: (value: unknown, path: string): Entry['params'] => {
    object(PlanFileEntryError, value, path, []);
    return {};
  },
  // `DeathParams` is `{}` (P12-1): the owner and the date are the whole of the fact. Whether there
  // is a survivor, and whether the owner names one Person, are whole-file facts — `checkDeaths`.
  DEATH: (value: unknown, path: string): Entry['params'] => {
    object(PlanFileEntryError, value, path, []);
    return {};
  },
  // **`ENTER_CARE` (P14-13, slice 3a) — three self-contained facts, checked here; whether the
  // owner names a real, single Person is a whole-file fact — `checkEnterCares` below.**
  ENTER_CARE: (value: unknown, path: string): Entry['params'] => {
    const record = object(PlanFileEntryError, value, path, ['homeValue', 'radPrice', 'radPaidAsLumpSum']);
    const homeValue = cents(PlanFileEntryError, record['homeValue'], `${path}.homeValue`);
    if (homeValue < 0) {
      fail(PlanFileEntryError, `${path}.homeValue`, `is ${homeValue} cents: a home's value cannot be negative. A household with no home states 0`);
    }
    const radPrice = cents(PlanFileEntryError, record['radPrice'], `${path}.radPrice`);
    if (radPrice < 0) {
      fail(PlanFileEntryError, `${path}.radPrice`, `is ${radPrice} cents: a Refundable Accommodation Deposit price is agreed with the facility and cannot be negative`);
    }
    const radPaidAsLumpSum = cents(PlanFileEntryError, record['radPaidAsLumpSum'], `${path}.radPaidAsLumpSum`);
    if (radPaidAsLumpSum < 0) {
      fail(PlanFileEntryError, `${path}.radPaidAsLumpSum`, `is ${radPaidAsLumpSum} cents: a negative lump sum would be the facility paying the household`);
    }
    if (radPaidAsLumpSum > radPrice) {
      fail(PlanFileEntryError, `${path}.radPaidAsLumpSum`, `is ${radPaidAsLumpSum} cents, more than the RAD price of ${radPrice} cents: at most the whole price is paid as a lump sum. The rest is paid as a Daily Accommodation Payment (DAP), which is never negative`);
    }
    return { homeValue, radPrice, radPaidAsLumpSum };
  },
  // **`HEAS_DRAW` (P9-1, slice 1; `advances` P9-2b) — self-contained facts, checked here; the
  // household's age, homeowner status, the absolute cap on a STATED amount, any `MORTGAGE_REFINANCE`
  // running alongside it, and every whole-entry fact about `advances` (span, window count, window
  // dollar cap) are whole-file facts, `checkHeasDraws` below.**
  HEAS_DRAW: (value: unknown, path: string): Entry['params'] => {
    const record = object(PlanFileEntryError, value, path, ['securityValue', 'fortnightlyAmount', 'stopDate', 'advances']);
    const securityValue = cents(PlanFileEntryError, record['securityValue'], `${path}.securityValue`);
    if (securityValue < 0) {
      fail(PlanFileEntryError, `${path}.securityValue`, `is ${securityValue} cents: a security value cannot be negative (ADR-0005: home market value less the mortgage owing and any nominated amount, floored at nil)`);
    }
    const rawAmount = record['fortnightlyAmount'];
    let fortnightlyAmount: Cents | 'maximum';
    if (rawAmount === 'maximum') {
      fortnightlyAmount = 'maximum';
    } else {
      fortnightlyAmount = cents(PlanFileEntryError, rawAmount, `${path}.fortnightlyAmount`);
      if (fortnightlyAmount <= 0) {
        fail(PlanFileEntryError, `${path}.fortnightlyAmount`, `is ${fortnightlyAmount} cents, and a stated draw is more than nothing. State "maximum" to draw the full netted allowance instead of a fixed figure`);
      }
    }
    const advances = optional(record, 'advances', (raw) =>
      array(PlanFileEntryError, raw, `${path}.advances`).map((advance, index) => parseHeasAdvance(advance, `${path}.advances[${index}]`)));
    return {
      securityValue,
      fortnightlyAmount,
      ...optionally('stopDate', optional(record, 'stopDate', (raw) => isoDate(PlanFileEntryError, raw, `${path}.stopDate`))),
      ...optionally('advances', advances),
    };
  },
  // **`SELL_HOME` (P14-13; `newHomeAmount`/`newHomePurchaseDate` P14-13c) — self-contained facts,
  // checked here; whether the household even HAS a home to sell, and a second sale, are whole-file
  // facts — `checkSellHomes` below.**
  SELL_HOME: (value: unknown, path: string): Entry['params'] => {
    const record = object(PlanFileEntryError, value, path, ['salePrice', 'sellingCosts', 'newHomeAmount', 'newHomePurchaseDate']);
    const salePrice = cents(PlanFileEntryError, record['salePrice'], `${path}.salePrice`);
    if (salePrice <= 0) {
      fail(PlanFileEntryError, `${path}.salePrice`, `is ${salePrice} cents: a sale for nothing or less is not a sale. State the household's own estimate of what the home will fetch`);
    }
    const sellingCosts = optional(record, 'sellingCosts', (raw) => cents(PlanFileEntryError, raw, `${path}.sellingCosts`));
    if (sellingCosts !== undefined && sellingCosts < 0) {
      fail(PlanFileEntryError, `${path}.sellingCosts`, `is ${sellingCosts} cents: selling costs are money leaving the household, and a negative figure would be money arriving`);
    }
    if (sellingCosts !== undefined && sellingCosts > salePrice) {
      fail(PlanFileEntryError, `${path}.sellingCosts`, `is ${sellingCosts} cents, more than the sale price of ${salePrice} cents: at most the whole price is spent selling it`);
    }
    // **`newHomePurchaseDate` is refused: `BUY_HOME` (P14-19) is the one writer of the purchase.**
    if (record['newHomePurchaseDate'] !== undefined) {
      fail(
        PlanFileEntryError,
        `${path}.newHomePurchaseDate`,
        `is stated, and a purchase date on SELL_HOME is not yet built: the purchase is its own BUY_HOME entry, dated the settlement day. Leave this field blank`,
      );
    }
    // **P14-13c — `newHomeAmount`, DSS Guide 4.6.3.90: at most the NET proceeds this entry itself
    // states, sale price less selling costs.** The mortgage and any Home Equity Access Scheme debt
    // repaid from the proceeds are whole-file facts `projection.ts` alone can compute (the balances
    // owed on the day of settlement), so they are not netted off here — a household setting aside
    // more than what is left after them still passes the door and is clamped to what it actually
    // holds each month (`splitAssets`'s own clamp).
    const newHomeAmount = optional(record, 'newHomeAmount', (raw) => cents(PlanFileEntryError, raw, `${path}.newHomeAmount`));
    if (newHomeAmount !== undefined) {
      if (newHomeAmount <= 0) {
        fail(PlanFileEntryError, `${path}.newHomeAmount`, `is ${newHomeAmount} cents: set aside more than nothing for a new home, or leave the field blank for none`);
      }
      const netProceeds = subCents(salePrice, sellingCosts ?? toCents(0));
      if (newHomeAmount > netProceeds) {
        fail(
          PlanFileEntryError,
          `${path}.newHomeAmount`,
          `is ${newHomeAmount} cents, more than the ${netProceeds} cents net proceeds (the sale price less selling costs): at most what the household actually nets from the sale can be set aside for a new home`,
        );
      }
    }
    return { salePrice, ...optionally('sellingCosts', sellingCosts), ...optionally('newHomeAmount', newHomeAmount) };
  },
  // **`RENT_OUT_HOME` (P14-13) — five self-contained facts, checked here; whether the household even
  // HAS a home to rent, overlapping tenancies, and the order against a SELL_HOME/ENTER_CARE are
  // whole-file facts — `checkRentOutHomes` below.**
  RENT_OUT_HOME: (value: unknown, path: string): Entry['params'] => {
    const record = object(PlanFileEntryError, value, path, ['weeklyRent', 'annualRates', 'annualInsurance', 'annualAgentFees', 'annualRepairs', 'endDate']);
    const weeklyRent = cents(PlanFileEntryError, record['weeklyRent'], `${path}.weeklyRent`);
    if (weeklyRent <= 0) {
      fail(PlanFileEntryError, `${path}.weeklyRent`, `is ${weeklyRent} cents: a rental for nothing or less is not a rental. State the household's own estimate of the weekly rent`);
    }
    const annualCost = (key: 'annualRates' | 'annualInsurance' | 'annualAgentFees' | 'annualRepairs'): Cents | undefined => {
      const parsed = optional(record, key, (raw) => cents(PlanFileEntryError, raw, `${path}.${key}`));
      if (parsed !== undefined && parsed < 0) {
        fail(PlanFileEntryError, `${path}.${key}`, `is ${parsed} cents: this is money leaving the household for the year, and a negative figure would be money arriving`);
      }
      return parsed;
    };
    const annualRates = annualCost('annualRates');
    const annualInsurance = annualCost('annualInsurance');
    const annualAgentFees = annualCost('annualAgentFees');
    const annualRepairs = annualCost('annualRepairs');
    const endDate = optional(record, 'endDate', (raw) => isoDate(PlanFileEntryError, raw, `${path}.endDate`));
    return {
      weeklyRent,
      ...optionally('annualRates', annualRates),
      ...optionally('annualInsurance', annualInsurance),
      ...optionally('annualAgentFees', annualAgentFees),
      ...optionally('annualRepairs', annualRepairs),
      ...optionally('endDate', endDate),
    };
  },
  // **`BUY_HOME` (P14-19) — two self-contained facts; the sale it follows is a whole-file fact,
  // `checkBuyHomes` below.**
  BUY_HOME: (value: unknown, path: string): Entry['params'] => {
    const record = object(PlanFileEntryError, value, path, ['purchasePrice', 'purchaseCosts']);
    const purchasePrice = cents(PlanFileEntryError, record['purchasePrice'], `${path}.purchasePrice`);
    if (purchasePrice <= 0) {
      fail(PlanFileEntryError, `${path}.purchasePrice`, `is ${purchasePrice} cents: a home bought for nothing or less is not a purchase. State the household's own estimate of the price`);
    }
    const purchaseCosts = optional(record, 'purchaseCosts', (raw) => cents(PlanFileEntryError, raw, `${path}.purchaseCosts`));
    if (purchaseCosts !== undefined && purchaseCosts < 0) {
      fail(PlanFileEntryError, `${path}.purchaseCosts`, `is ${purchaseCosts} cents: purchase costs are money leaving the household, and a negative figure would be money arriving`);
    }
    return { purchasePrice, ...optionally('purchaseCosts', purchaseCosts) };
  },
  // **`RETURN_CHANGE` — `SPEND_CHANGE`'s own parser shape, and `nominalReturn`'s own sign
  // precedent (P2-11, gate ruling GO-VIA-DIFFERENT-SHAPE, 2026-09-22).** `nominalReturn` itself is
  // read by `rate` above with no sign check at all — a negative return is a bleak but real
  // assumption, not a shape `projection.ts` cannot act on the way a negative salary or a negative
  // spend is. So a negative `rate` here is PERMITTED, deliberately, on that same ground.
  RETURN_CHANGE: (value: unknown, path: string): Entry['params'] => {
    const record = object(PlanFileEntryError, value, path, ['rate']);
    return { rate: rate(PlanFileEntryError, record['rate'], `${path}.rate`) };
  },
  NON_SUPER_INVESTMENT: (value: unknown, path: string): Entry['params'] => {
    // `direction` is the discriminant of a two-member union whose members do NOT share their
    // fields (`plan.ts`), so the allowed key list differs by branch: `incidentalCostsOfAcquisition`
    // on a sell is refused here exactly as it fails to compile there.
    const both = object(PlanFileEntryError, value, path, ['direction', 'amount', 'incidentalCostsOfAcquisition', 'parcelSelection']);
    const direction = member(PlanFileEntryError, both['direction'], `${path}.direction`, ['buy', 'sell'] as const);
    if (direction === 'buy') {
      const record = object(PlanFileEntryError, value, path, ['direction', 'amount', 'incidentalCostsOfAcquisition']);
      return {
        direction,
        amount: cents(PlanFileEntryError, record['amount'], `${path}.amount`),
        incidentalCostsOfAcquisition: cents(PlanFileEntryError, record['incidentalCostsOfAcquisition'], `${path}.incidentalCostsOfAcquisition`),
      };
    }
    const record = object(PlanFileEntryError, value, path, ['direction', 'amount', 'parcelSelection']);
    return {
      direction,
      amount: cents(PlanFileEntryError, record['amount'], `${path}.amount`),
      ...optionally('parcelSelection', optional(record, 'parcelSelection', (raw) =>
        member(PlanFileEntryError, raw, `${path}.parcelSelection`, PARCEL_SELECTIONS))),
    };
  },
  // `SpouseContributionParams` — P3-19. The shape only: whether the owner NAMES a spouse to pay
  // into is a fact only the whole file knows and is `checkSpouseContributionTargets`'s job below,
  // on `checkContributionTargets`'s own precedent.
  SPOUSE_CONTRIBUTION: (value: unknown, path: string): Entry['params'] => {
    const record = object(PlanFileEntryError, value, path, ['amount', 'receivingInterestIndex']);
    const amount = cents(PlanFileEntryError, record['amount'], `${path}.amount`);
    // Refused on `LUMP_SUM_FROM_SUPER.amount`'s ground: a nil or negative contribution is not a
    // fact this entry exists to state.
    if (amount <= 0) {
      fail(PlanFileEntryError, `${path}.amount`, `is ${amount} cents, and a contribution into your spouse's superannuation is more than nothing`);
    }
    // Which interest of the RECEIVING spouse, REQUIRED, on `SalarySacrificeContributionParams.interestIndex`'s
    // ruling. Checked against the Household — which Person even IS the receiving spouse — by
    // `checkSpouseContributionTargets`, below.
    const receivingInterestIndex = record['receivingInterestIndex'];
    if (typeof receivingInterestIndex !== 'number' || !Number.isSafeInteger(receivingInterestIndex) || receivingInterestIndex < 0) {
      fail(PlanFileEntryError, `${path}.receivingInterestIndex`, `is ${JSON.stringify(receivingInterestIndex)}, and which superannuation interest of your spouse's the contribution goes INTO is a position in THEIR \`superInterests\` — a whole number from 0. It is required: your spouse may hold more than one interest, and a model that picked one would credit a different account the day a second is added`);
    }
    return { amount, receivingInterestIndex };
  },
  // `DownsizerContributionParams` — P9-5. The shape only; the sale, the owner's age and interest,
  // the caps and the window are whole-file facts (`checkDownsizerContributions`, below).
  DOWNSIZER_CONTRIBUTION: (value: unknown, path: string): Entry['params'] => {
    const record = object(PlanFileEntryError, value, path, ['amount', 'receivingInterestIndex', 'statedOwnedTenYears']);
    const amount = cents(PlanFileEntryError, record['amount'], `${path}.amount`);
    if (amount <= 0) {
      fail(PlanFileEntryError, `${path}.amount`, `is ${amount} cents, and a downsizer contribution is more than nothing`);
    }
    const receivingInterestIndex = record['receivingInterestIndex'];
    if (typeof receivingInterestIndex !== 'number' || !Number.isSafeInteger(receivingInterestIndex) || receivingInterestIndex < 0) {
      fail(PlanFileEntryError, `${path}.receivingInterestIndex`, `is ${JSON.stringify(receivingInterestIndex)}, and which of the owner's own superannuation interests the contribution goes into is a position in their \`superInterests\` — a whole number from 0. It is required`);
    }
    // s 292-102(1)(b): no purchase date is held, so the 10-year ownership test is a stated fact.
    if (record['statedOwnedTenYears'] !== true) {
      fail(PlanFileEntryError, `${path}.statedOwnedTenYears`, `is ${JSON.stringify(record['statedOwnedTenYears']) ?? 'absent'}, and a downsizer contribution needs the home to have been owned by you or your spouse for 10 years or more (ITAA 1997 s 292-102(1)(b)). This forecast holds no purchase date to check it, so it must be stated as true`);
    }
    return { amount, receivingInterestIndex, statedOwnedTenYears: true };
  },
} as const satisfies Partial<Record<EntryType, (value: unknown, path: string) => Entry['params']>>;

/** The types named in `ENTRY_TYPES` that no parser above can read — the six, derived. */
export const UNSPECIFIED_ENTRY_TYPES: readonly EntryType[] =
  ENTRY_TYPES.filter((type) => !Object.hasOwn(PARAMS_PARSERS, type));

const parseEntry = (value: unknown, path: string): Entry => {
  const record = object(PlanFileEntryError, value, path, ENTRY_KEYS);
  const type = member(PlanFileEntryError, record['type'], `${path}.type`, ENTRY_TYPES);
  if (!Object.hasOwn(PARAMS_PARSERS, type)) {
    fail(
      UnspecifiedEntryTypeError,
      `${path}.type`,
      `is "${type}", which is a Journal Entry type this build cannot honour: its params are unspecified (plan.ts) and projection.ts has no branch for it. ` +
        'The WHOLE FILE is refused rather than this entry dropped — a projection run with an entry silently deleted is a forecast for a plan you do not have',
    );
  }
  const parseParams = PARAMS_PARSERS[type as keyof typeof PARAMS_PARSERS];
  const base = {
    id: string(PlanFileEntryError, record['id'], `${path}.id`),
    date: isoDate(PlanFileEntryError, record['date'], `${path}.date`),
    owner: member(PlanFileEntryError, record['owner'], `${path}.owner`, ENTRY_OWNERS),
    params: parseParams(record['params'], `${path}.params`),
    enabled: boolean(PlanFileEntryError, record['enabled'], `${path}.enabled`),
    createdAt: isoDate(PlanFileEntryError, record['createdAt'], `${path}.createdAt`),
    ...optionally('note', optional(record, 'note', (raw) => string(PlanFileEntryError, raw, `${path}.note`))),
    ...optionally('origin', optional(record, 'origin', (raw) => parseOrigin(raw, `${path}.origin`))),
  };
  // The cast is the one place a parsed entry becomes an `Entry`. It is sound by construction: the
  // params parser for `type` is the one that returns that member's params, and every other field
  // is checked above. It is written once, here, rather than at five call sites.
  return { ...base, type } as Entry;
};

// --- Scenarios (v2) -----------------------------------------------------------------------------

const SCENARIO_KEYS = ['id', 'name', 'parentId', 'entryIds', 'entryOverrides'];

/**
 * One `Scenario`, field by field. `parentId` is REQUIRED and nullable: `null` is a root, and an
 * absent key is refused rather than read as a root, on `Entry.enabled`'s ground — "nobody said" is
 * not an answer to a question the model acts on.
 */
/**
 * **The Scenario's on/off statements, or `undefined` for a Scenario that makes none.**
 *
 * This is the one optional field in the scenario graph and it is optional on `Scenario`'s own
 * ground (`plan.ts`'s `EntryOverrides`): a missing key here is not an unanswered question, it is
 * the answer *"this Scenario states nothing — inherit"*. An absent map and an empty one therefore
 * mean the same thing, and every plan file written before this field existed states no overrides,
 * which is exactly true of it. Dropping the key when there is nothing to say is what keeps such a
 * file round-tripping byte-identical.
 *
 * Every VALUE is checked as a boolean: a `"false"` string read as truthy would switch an entry the
 * user turned off back on, silently, in one Scenario only.
 */
const parseEntryOverrides = (value: unknown, path: string): EntryOverrides | undefined => {
  if (value === undefined) return undefined;
  // Not `object()`: every key here is an entry id the user's own file names, so there is no list of
  // allowed keys to check against — the check that an id names something real is the graph's
  // (`checkScenarioGraph`), which is the only place the pool is in scope.
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    fail(PlanFileShapeError, path, `is ${describe(value)}, and an object of entry id to true-or-false was required`);
  }
  const overrides: Record<string, boolean> = {};
  for (const [id, stated] of Object.entries(value as Record<string, unknown>)) {
    overrides[id] = boolean(PlanFileShapeError, stated, `${path}.${id}`);
  }
  return overrides;
};

const parseScenario = (value: unknown, path: string): Scenario => {
  const record = object(PlanFileShapeError, value, path, SCENARIO_KEYS);
  const parentId = record['parentId'];
  if (parentId !== null && typeof parentId !== 'string') {
    fail(PlanFileShapeError, `${path}.parentId`, `is ${describe(parentId)}, and a scenario id or null was required — null is a root scenario, and an absent parentId is not the same claim`);
  }
  return {
    id: string(PlanFileShapeError, record['id'], `${path}.id`),
    name: string(PlanFileShapeError, record['name'], `${path}.name`),
    parentId,
    entryIds: array(PlanFileShapeError, record['entryIds'], `${path}.entryIds`)
      .map((id, index) => string(PlanFileShapeError, id, `${path}.entryIds[${index}]`)),
    ...optionally('entryOverrides', parseEntryOverrides(record['entryOverrides'], `${path}.entryOverrides`)),
  };
};

/**
 * **The scenario graph, checked as a WHOLE — the four things a per-field parse cannot see.**
 *
 * Every one of them is a file that parses field by field and then makes the engine do something
 * other than what it says:
 *
 *   1. **no scenarios at all.** `activeScenarioId` could then name nothing, there would be no
 *      entries to project, and the app would draw an empty chart for a file full of journal
 *      entries — a forecast for a plan the user does not have, silently.
 *   2. **two scenarios with one id.** `parentId` and `activeScenarioId` both resolve by id, so a
 *      duplicate makes "which one" a question the lookup answers by array order. Refused rather
 *      than resolved first-wins.
 *   3. **a `parentId` naming no scenario.** The chain has no root, so the inheritance the whole
 *      design turns on cannot be resolved at all.
 *   4. **a cycle.** `effectiveEntryIds` throws on one rather than hanging, but a projection that
 *      throws at the point of drawing is a bricked page (`app/planEdits.ts` on the save gate):
 *      the file boundary is where it has a name and a path attached.
 *
 * And two things that ARE per-scenario but are about the pool: an `entryIds` member naming an entry
 * the file does not contain, and an `entryOverrides` key doing the same. That entry would be
 * silently absent from the projection, which is the same failure `UnspecifiedEntryTypeError` exists
 * for, so both are refused for the same reason.
 */
const checkScenarioGraph = (scenarios: readonly Scenario[], entries: readonly Entry[], activeScenarioId: string): void => {
  if (scenarios.length === 0) {
    fail(PlanFileShapeError, 'scenarios', 'is empty, and a plan file holds at least one scenario — there would be nothing to project and nothing for activeScenarioId to name');
  }
  const byId = new Map<string, Scenario>();
  for (const [index, scenario] of scenarios.entries()) {
    if (byId.has(scenario.id)) {
      fail(PlanFileShapeError, `scenarios[${index}].id`, `is "${scenario.id}", which another scenario already has — parentId and activeScenarioId resolve by id, and a duplicate makes "which one" a question this build would answer by array position`);
    }
    byId.set(scenario.id, scenario);
  }
  const entryIds = new Set(entries.map((entry) => entry.id));
  // An override naming no entry in the pool is refused on `entryIds`'s own ground, and NOT on the
  // narrower ground that the Scenario must already project it: an override may legitimately name an
  // entry the Scenario inherits, and one whose ancestor has not listed it yet is a statement waiting
  // for a decision, not a defect. A key naming nothing at all is neither.
  for (const [index, scenario] of scenarios.entries()) {
    for (const id of Object.keys(scenario.entryOverrides ?? {})) {
      if (!entryIds.has(id)) {
        fail(PlanFileEntryError, `scenarios[${index}].entryOverrides."${id}"`, `names no entry in the file — a scenario switches an entry on or off by reference, and an override on an id nobody holds is a decision about nothing`);
      }
    }
  }
  for (const [index, scenario] of scenarios.entries()) {
    for (const [position, id] of scenario.entryIds.entries()) {
      if (!entryIds.has(id)) {
        fail(PlanFileEntryError, `scenarios[${index}].entryIds[${position}]`, `is "${id}", and no entry in the file has that id — the entries are one shared pool and a scenario adds them by reference`);
      }
    }
  }
  for (const [index, scenario] of scenarios.entries()) {
    // Walk this scenario's ancestry. A `seen` set rather than a depth limit: a limit would refuse
    // a legitimately deep chain and would still have to guess where deep begins.
    const seen = new Set<string>([scenario.id]);
    let parentId = scenario.parentId;
    while (parentId !== null) {
      const parent = byId.get(parentId);
      if (parent === undefined) {
        fail(PlanFileShapeError, `scenarios[${index}].parentId`, `leads to "${parentId}", and no scenario has that id — a scenario inherits its parent's entries by reference, so a parent that is not in the file cannot be resolved`);
      }
      if (seen.has(parent.id)) {
        fail(PlanFileShapeError, `scenarios[${index}].parentId`, `leads back to "${parent.id}", and a parentId chain that loops has no root — resolving it would not terminate`);
      }
      seen.add(parent.id);
      parentId = parent.parentId;
    }
  }
  if (!byId.has(activeScenarioId)) {
    fail(PlanFileShapeError, 'activeScenarioId', `is "${activeScenarioId}", and no scenario has that id — the file must say which scenario it is about, because "the first one" is a rule that goes wrong the moment the list is reordered`);
  }
};

/**
 * **The two facts about a `SUPER_CONTRIBUTION` that only the WHOLE FILE knows** — who the owner is,
 * and whether the interest it names exists.
 *
 * A params parser sees one entry and nothing else, which is why `LUMP_SUM_FROM_SUPER` leaves both
 * of these to `projection.ts`. That is not available here: `projection.ts` has no branch for a
 * contribution yet, so a dangling owner or an index naming no account would be read, saved, and
 * then **silently do nothing** — the P4-12 shape, where `RETIRE` and `WORK_PATTERN_CHANGE` no-op on
 * an owner who is not in the Household while `LUMP_SUM_FROM_SUPER` and `NON_SUPER_INVESTMENT` throw
 * by name. The throwing precedent is the one followed, and the door is where it can be followed
 * today, because `parsePlan` holds the Household and the entries at the same moment.
 *
 * **A THIRD fact joined them on 2026-09-21 (P6-8 brief 4): whether a STOP has anything to stop.**
 * It is the same kind of fact — one entry cannot see the arrangement it ends any more than it can
 * see the Household's accounts — and it is refused here rather than walked for the reason the two
 * below are: a stop with nothing to stop changes no figure in any month, which is the silent no-op
 * this build refuses at every door it can. It relates two entries, so since 2026-09-25 it runs per
 * Scenario, in `checkContributionStops` (scenario isolation, @ed5aa63).
 *
 * **`household` is not an owner a contribution can have.** A contribution is made by one member,
 * into one of that member's interests; the concessional cap, the carry-forward window, the fund's
 * 15% and Division 293 are every one of them per person. Splitting a household-owned one between
 * two members would be a rule about whose contribution it is, invented in a parse loop — the
 * reason `soleOwnerIndex` refuses the same owner in `projection.ts`.
 */
const checkContributionTargets = (entries: readonly Entry[], household: Household): void => {
  for (const [index, entry] of entries.entries()) {
    if (entry.type !== 'SUPER_CONTRIBUTION') continue;
    const path = `entries[${index}]`;
    if (entry.owner === 'household') {
      fail(PlanFileEntryError, `${path}.owner`, `is "household", and a superannuation contribution is made by one Person into one of their own interests — every cap, the fund's 15% and Division 293 are assessed per person, so a household-owned one would have to invent a split. State it against personA or personB`);
    }
    const personIndex = entry.owner === 'personA' ? 0 : 1;
    const person = household.persons[personIndex];
    if (person === undefined) {
      fail(PlanFileEntryError, `${path}.owner`, `is "${entry.owner}", and this Household has ${household.persons.length} Person — the entry names somebody who is not in the file. It is refused rather than skipped: an entry nobody owns would contribute nothing, forever, with nothing on screen to say so`);
    }
    // A stop's relation to the arrangement it ends is checked per scenario: `checkContributionStops`.
    if (entry.params.kind === 'stopped') continue;
    const interest = person.superInterests[entry.params.interestIndex];
    if (interest === undefined) {
      fail(PlanFileEntryError, `${path}.params.interestIndex`, `is ${entry.params.interestIndex}, and ${person.name} holds ${person.superInterests.length} superannuation interest — the contribution names an account that is not in the file, and there is nothing for it to be paid into`);
    }
    // **The PHASE of the target, checked here for the same reason the index is (P6-8 brief 2,
    // chunk 5).** A contribution is made to an ACCUMULATION interest. An account-based pension and
    // a transition-to-retirement stream are both retirement-phase products closed to
    // contributions: a fund receiving one would open a NEW accumulation interest and leave the
    // stream alone, because adding to a stream would change a pension already being paid and, on
    // the way through, the minimum drawn from it. This build has no path that opens an interest,
    // so it would credit the stream — a balance no fund would produce, and over Age Pension age a
    // means-test answer computed off it.
    //
    // **It is a door check and not a walk refusal because the phase is a fact about the
    // HOUSEHOLD**, like the index above it: static for the whole walk (nothing under `src/`
    // assigns `SuperInterest.phase` after the file is read), so a month is never the right place
    // to discover it. The refusal is `PlanFileEntryError`, in this function's existing shape — not
    // a new named class, because the law's answer is known and the message states it. What the
    // user must do is name a different account, which is a well-formedness fix to this one entry.
    if (interest.phase !== 'accumulation') {
      fail(PlanFileEntryError, `${path}.params.interestIndex`, `is ${entry.params.interestIndex}, and that interest of ${person.name}'s is in the ${interest.phase === 'ttr' ? 'transition-to-retirement' : 'account-based pension'} phase. A superannuation contribution is paid into an ACCUMULATION interest: a retirement-phase stream is closed to contributions, and a fund receiving one would open a new accumulation interest rather than add to the stream. This build cannot open one, so it is refused rather than credited to an account that would not have received it. Name an accumulation interest`);
    }
  }
};

/**
 * **An illness separation needs a couple (P12-4).** A Household of one Person has nobody to be
 * separated from, and the means test's third path refuses it too — refused here first, by the entry's
 * path, so the plan is never saved holding one. `owner` is not checked: a separation is a fact
 * about the couple, and the walk ignores it on `SPEND_CHANGE`'s ruling.
 */
const checkIllnessSeparations = (entries: readonly Entry[], household: Household): void => {
  for (const [index, entry] of entries.entries()) {
    if (entry.type !== 'ILLNESS_SEPARATION' || household.persons.length === 2) continue;
    fail(PlanFileEntryError, `entries[${index}].type`, 'is ILLNESS_SEPARATION, and this Household has one Person — an illness separation is a couple living apart, and a separation takes two');
  }
};

/**
 * **A death needs a survivor, and it is one Person's (P12-1).** A Household of one Person has nobody
 * for the money to pass to — option A is a spouse's death benefit — and `owner: 'household'` would
 * be both of them dying at once, which is not modelled. Everything that turns on WHICH entries the
 * walk sees — a second death, entries dated after it — depends on the Scenario, so it is the walk's
 * job, not this one (`projection.ts`'s `deathOf`).
 */
const checkDeaths = (entries: readonly Entry[], household: Household): void => {
  for (const [index, entry] of entries.entries()) {
    if (entry.type !== 'DEATH') continue;
    if (household.persons.length !== 2) {
      fail(PlanFileEntryError, `entries[${index}].type`, 'is DEATH, and this Household has one Person — a death is modelled only for a couple, where the survivor carries on alone and there is someone for the money to go to');
    }
    if (entry.owner === 'household') {
      fail(PlanFileEntryError, `entries[${index}].owner`, 'is household on a DEATH — a death is one Person\'s; both dying at once is not modelled. State personA or personB');
    }
  }
};

/** Entries paired with their index in the POOL, so a refusal's path still names the file's own position. */
type CareScope = readonly { readonly index: number; readonly entry: Entry }[];

/**
 * **The scopes the three home/care checks run over (P14-14, ruling 2026-09-25): one per Scenario,
 * its effective entries with its own on/off chain applied — `scenarioEntries`'s resolution, which is
 * the walk's — never the pool.** A Scenario's decisions are its own (scenario isolation, @ed5aa63), so
 * sibling Scenarios may each hold an `ENTER_CARE` for the same Person, or one a `SELL_HOME` and the
 * other a `RENT_OUT_HOME`. An entry no Scenario has switched on is checked ALONE as well, so a
 * malformed entry cannot hide by being off everywhere.
 *
 * **Every door check that relates one entry to another runs over these scopes (2026-09-25), not the
 * pool** — the HEAS relations and the contribution stop joined the home/care checks. What one entry
 * states on its own stays pool-wide. `honourSwitches: false` is the stop's scope: its ruling reads
 * `date`, never `enabled` (`checkContributionStops`).
 */
const careCheckScopes = (entries: readonly Entry[], scenarios: readonly Scenario[], honourSwitches = true): readonly CareScope[] => {
  const indexOf = new Map(entries.map((entry, index) => [entry.id, index] as const));
  const onSomewhere = new Set<string>();
  const scopes: CareScope[] = scenarios.map((scenario) =>
    effectiveEntryIds(scenario, scenarios).flatMap((id) => {
      const index = indexOf.get(id) as number;
      const entry = entries[index] as Entry;
      if (honourSwitches && !resolvedEntryEnabled(entry, scenario, scenarios)) return [];
      onSomewhere.add(id);
      return [{ index, entry }];
    }));
  entries.forEach((entry, index) => {
    if (!onSomewhere.has(entry.id)) scopes.push([{ index, entry }]);
  });
  return scopes;
};

/**
 * **A `SUPER_CONTRIBUTION` stop needs an arrangement before it IN THE SAME SCENARIO** — split out of
 * `checkContributionTargets` (2026-09-25), which keeps the owner, index and phase. The scope ignores
 * `enabled` (see below), and it is a scenario scope only: an entry in no Scenario has no partner.
 */
const checkContributionStops = (scope: CareScope, household: Household): void => {
  const entries = scope.map(({ entry }) => entry);
  for (const { index, entry } of scope) {
    if (entry.type !== 'SUPER_CONTRIBUTION') continue;
    const path = `entries[${index}]`;
    // `checkContributionTargets` has already refused a `household` owner and a missing Person.
    const person = household.persons[entry.owner === 'personA' ? 0 : 1] as Person;
    // **A STOP MUST HAVE SOMETHING TO STOP IN ITS OWN SCENARIO** (P6-8 brief 4, user ruling
    // 2026-09-21; per Scenario since 2026-09-25 — an arrangement in a sibling is not running here).
    // The most recent `SUPER_CONTRIBUTION` for the same Person strictly BEFORE this one must be an
    // arrangement. One rule, three orderings:
    //
    //   * **A stop dated before the arrangement it means to stop is REFUSED, not honoured later.**
    //     A level states what is in force from its own date; it does not reach forward and cancel a
    //     later one, because that is not a thing any level in this file does and a `SPEND_CHANGE`
    //     dated 2030 is not undone by one dated 2029. So such a stop would sit in the plan, be
    //     listed, be owned, and change no figure ever — the P4-12 silent no-op this build refuses.
    //   * **A SECOND stop is refused on the same ground**: by the time it takes effect nothing is
    //     running, so it stops nothing. Restarting is stating an arrangement again, and a stop
    //     after that restart is accepted, because the entry before it is an arrangement.
    //   * **A stop in the same MONTH as the arrangement is refused too** — `strictly before` is
    //     what makes it so. The alternative is resolving it by position in the entry list, which is
    //     an order the user cannot see on the screen and did not choose.
    //
    // `PlanFileEntryError` and no new named refusal class, on `WorkPatternChangeParams`' rule: this
    // is a well-formedness check on how two entries in one file sit against each other, not an
    // unanswered question about the law, so it needs no register row under R8.
    //
    // It is compared on `date` and not on `enabled`: switching an arrangement off is a reversible
    // view action (`entryVisibility.ts`), and a file that stopped loading because a toggle left a
    // stop with nothing to stop would make a switch that cannot be switched back.
    if (entry.params.kind === 'stopped') {
      // Sorted by DATE and not taken in file order: the entries array is the order they were
      // written down, and "the last one before this date" is a fact about the calendar. A stable
      // sort leaves two arrangements sharing a date in the order the walk itself would apply them.
      const earlier = entries
        .filter(
          (other): other is Extract<Entry, { type: 'SUPER_CONTRIBUTION' }> =>
            other.type === 'SUPER_CONTRIBUTION' && other.owner === entry.owner && other.date < entry.date,
        )
        .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
      const governing = earlier[earlier.length - 1];
      if (governing === undefined || governing.params.kind !== 'salarySacrificed') {
        fail(
          PlanFileEntryError,
          `${path}.params.kind`,
          `is "stopped" on ${entry.date}, and ${person.name} has no salary sacrifice running on that date to stop — ${
            governing === undefined
              ? 'no arrangement is stated for them before it'
              : `the last one before it (entry ${governing.id}, ${governing.date}) is itself a stop`
          }. A stop ends what is in force from its own date; it does not cancel an arrangement that starts later, and an arrangement stated on the same day as this stop is not running before it. State the stop after the arrangement it ends`,
        );
      }
    }
  }
};

/**
 * **`ENTER_CARE` needs a real, single Person, and only one entry per Person (P14-13, slice 3a).**
 * `checkSpouseContributionTargets`'s owner-resolution precedent: `household` is refused outright
 * (entering care is one Person's own fact, never the household's), and the named person must exist
 * in the file. A second `ENTER_CARE` for the same Person IN ONE SCENARIO is refused too (P14-14: sibling
 * Scenarios may each hold one — `careCheckScopes`) — a Person enters permanent
 * residential care once, and a second entry would restart a means assessment and a RAD already in
 * force, which this build does not model as reversible or replaceable.
 */
const checkEnterCares = (scope: CareScope, household: Household): void => {
  const seenOwners = new Set<string>();
  for (const { index, entry } of scope) {
    if (entry.type !== 'ENTER_CARE') continue;
    const path = `entries[${index}]`;
    if (entry.owner === 'household') {
      fail(PlanFileEntryError, `${path}.owner`, 'is "household", and entering permanent residential aged care is one Person\'s own fact — a household does not move into a room. State personA or personB');
    }
    const ownerIndex = entry.owner === 'personA' ? 0 : 1;
    const owner = household.persons[ownerIndex];
    if (owner === undefined) {
      fail(PlanFileEntryError, `${path}.owner`, `is "${entry.owner}", and this Household has ${household.persons.length} Person — the entry names somebody who is not in the file`);
    }
    if (seenOwners.has(entry.owner)) {
      fail(PlanFileEntryError, `${path}.owner`, `is a SECOND ENTER_CARE entry for ${owner.name}: a Person enters permanent residential care once, and a second entry would restart a means assessment and a RAD that is already in force. Remove one`);
    }
    seenOwners.add(entry.owner);
  }
};

/**
 * **`HEAS_DRAW` needs facts the door only sees once the WHOLE file is read (P9-2a, superseding
 * slice 1's household-level door check).** At most ONE `HEAS_DRAW` entry PER PERSON —
 * `checkEnterCares`' own "no partial change" precedent, narrowed (was "one per file" now that
 * `owner` names a Person: `data/assumptions/heas.ts`'s own `coupleStructure` fact (SS Guide-sourced,
 * unchanged since slice 1) is that each Person has their own loan against their own share of the
 * security (T37), so a couple states up to two of these, never one `household`-owned entry for
 * both. `HeasDrawParams.stopDate` already lets a single entry state a whole episode for that one
 * Person (start, amount and an optional stop), so a second entry for the SAME Person is never
 * needed and would only invite two entries disagreeing about the same debt. **The three relations —
 * one per Person, the couple's `securityValue`, T35 — are checked PER SCENARIO since 2026-09-25, in
 * `checkHeasDrawRelations`** (a sibling Scenario's draw or refinance is not in this one's walk); what
 * each entry states alone stays here, pool-wide. Then, for every entry:
 *
 *   * **`owner` must be a Person, never `household`** — `checkEnterCares`' own refusal, for the
 *     same reason: HEAS is a Person's own loan in law, however jointly a couple applies for it;
 *   * **a couple's two entries must AGREE on `securityValue`** — both price a loan against the
 *     SAME home, so a mismatch is two entries disagreeing about what it is worth;
 *   * **eligibility age** (register §5.6: "the Person has reached pension age, or is the partner of
 *     someone who has") — still a HOUSEHOLD fact: either partner qualifying qualifies both loans;
 *   * **homeowner** (SS Act s 1133(1)(cc) — the eligible-property test) — off `household.homeStatus`,
 *     the one means-test primitive ADR-0005 holds;
 *   * **a STATED `fortnightlyAmount` against the ABSOLUTE 150% ceiling on THIS PERSON's OWN
 *     maximum payment rate** — half the couple's combined rate for a member of a couple
 *     (`perPersonRatePerFortnight`'s own halving, `core/agePension.ts`), the single rate for a
 *     Person drawing alone — the fixed legislative cap, not the netted allowance the walk computes
 *     every month, which is not knowable at the door;
 *   * **`stopDate` after `date`** — a stream cannot stop before or in the fortnight it starts;
 *   * **T35, refuse rather than warn**: a `MORTGAGE_REFINANCE` dated on or after the `HEAS_DRAW`
 *     voids the No Negative Equity Guarantee (SS Act s 1144AA(3)(a)) by increasing the Owner-Occupied
 *     Mortgage while the HEAS loan runs. One dated STRICTLY BEFORE the draw begins has not voided
 *     anything — the loan had not started running yet — so only same-or-later dates are refused.
 */
const checkHeasDraws = (entries: readonly Entry[], household: Household, settings: Settings): void => {
  for (const [index, entry] of entries.entries()) {
    if (entry.type !== 'HEAS_DRAW') continue;
    const path = `entries[${index}]`;
    if (entry.owner === 'household') {
      fail(
        PlanFileEntryError,
        `${path}.owner`,
        'is "household", and the Home Equity Access Scheme is a loan PER PERSON — each Person has their own loan against their own share of the security (register T37, data/assumptions/heas.ts\'s coupleStructure). State personA or personB',
      );
    }
    const ownerIndex = entry.owner === 'personA' ? 0 : 1;
    const owner = household.persons[ownerIndex];
    if (owner === undefined) {
      fail(PlanFileEntryError, `${path}.owner`, `is "${entry.owner}", and this Household has ${household.persons.length} Person — the entry names somebody who is not in the file`);
    }
    if (!household.persons.some((person) => hasReachedAgePensionAge(person, entry.date))) {
      fail(PlanFileEntryError, `${path}.date`, `is ${entry.date}, and nobody in this household has reached Age Pension age by then — HEAS eligibility is "the Person has reached pension age, or is the partner of someone who has" (register §5.6), and neither is true yet`);
    }
    // `noHomeSaleProceedsExempt` (P14-13c) is refused too, EXPLICITLY, despite `homeTreatment`
    // reporting it a homeowner for the ASSETS TEST free area alone (`checkSellHomes`'s own reason):
    // there is no physical home left to be the Home Equity Access Scheme's security.
    if (!homeTreatment(household.homeStatus).homeowner || household.homeStatus === 'noHomeSaleProceedsExempt') {
      fail(PlanFileEntryError, `${path}.type`, `is HEAS_DRAW, and household.homeStatus is "${household.homeStatus}" — a non-homeowner has no security to draw the Home Equity Access Scheme against (SS Act s 1133(1)(cc), the eligible-property test)`);
    }
    // T33/T37 — THIS PERSON's own share of the maximum payment rate AT a given date: half the
    // couple's combined rate for a member of a couple (`perPersonRatePerFortnight`'s own halving),
    // the single rate unchanged for a Person drawing alone. Shared by the stated-amount ceiling
    // below and by the advance dollar-cap check (P9-2b), which needs it at the WINDOW's own date.
    const personMaximumPaymentRateAt = (date: IsoDate): Cents => {
      const status: RateStatus = household.persons.length === 2 ? 'coupleCombined' : 'single';
      const period = agePensionPeriodAt(date, settings.economicSeries.agePension);
      const householdMaximumPaymentRate = maximumPaymentRate(period, status);
      return household.persons.length === 2 ? mulCents(householdMaximumPaymentRate, 0.5) : householdMaximumPaymentRate;
    };
    if (entry.params.fortnightlyAmount !== 'maximum') {
      const cap = heasFortnightlyCap(personMaximumPaymentRateAt(entry.date));
      // **`fortnightlyAmount` is stated in TODAY's money (user ruling, 2026-09-25) — raised to THIS
      // entry's own day before it meets the ceiling, `core/priceLevel.ts`'s `inflateStated`, the ONE
      // expression, so a household stating a today's-money figure is not refused against a nominal
      // cap it would never actually reach on day one.**
      const nominalAtEntry = inflateStated(entry.params.fortnightlyAmount, settings.economicSeries.cpi, settings.asAtDate, entry.date);
      if (nominalAtEntry > cap) {
        fail(
          PlanFileEntryError,
          `${path}.params.fortnightlyAmount`,
          `is ${entry.params.fortnightlyAmount} cents a fortnight in today's money, ${nominalAtEntry} cents at ${entry.date}, and the absolute ceiling at ${entry.date} for ${owner.name}'s own share is ${cap} cents — 150% of this Person's own maximum payment rate (SS Act s 1134(1A)(a)(i)). State "maximum" to draw whatever the netted allowance actually comes to instead of a fixed figure over the ceiling`,
        );
      }
    }
    if (entry.params.stopDate !== undefined && entry.params.stopDate <= entry.date) {
      fail(PlanFileEntryError, `${path}.params.stopDate`, `is ${entry.params.stopDate}, on or before the entry's own date of ${entry.date}: a stream cannot stop before or in the fortnight it starts`);
    }
    // **`advances` (P9-2b) — the door checks the gate names: span, window count, window dollar
    // cap.** Read in DATE order regardless of how the file lists them — `s 1133AA(1)`'s window is a
    // fact about the CALENDAR, not about file order — and re-window from scratch every time a gap
    // over `HEAS_ADVANCE_PERIOD_FORTNIGHTS` fortnights (364 days) opens since the window's own first
    // advance (`daysInclusive`, the exact day-count arithmetic `financialYear.ts` already offers,
    // never `Date`).
    if (entry.params.advances !== undefined) {
      const windowFortnights = HEAS.drawModes.advancePeriodFortnights.value;
      const windowDays = windowFortnights * 14;
      const maxPerWindow = HEAS.drawModes.maximumAdvancesPerPeriod.value;
      const withOriginalIndex = entry.params.advances.map((advance, originalIndex) => ({ advance, originalIndex }));
      const sorted = [...withOriginalIndex].sort((a, b) => (a.advance.date < b.advance.date ? -1 : a.advance.date > b.advance.date ? 1 : 0));
      let windowStart: IsoDate | undefined = undefined;
      let windowCount = 0;
      let windowTotal: Cents = 0 as Cents;
      for (const { advance, originalIndex } of sorted) {
        const advancePath = `${path}.params.advances[${originalIndex}]`;
        if (advance.date < entry.date || (entry.params.stopDate !== undefined && advance.date > entry.params.stopDate)) {
          fail(
            PlanFileEntryError,
            `${advancePath}.date`,
            `is ${advance.date}, and this HEAS_DRAW is only active from ${entry.date}${entry.params.stopDate === undefined ? '' : ` to ${entry.params.stopDate}`} — an advance must fall within the draw's own active span`,
          );
        }
        if (windowStart === undefined || daysInclusive(windowStart, advance.date) > windowDays) {
          windowStart = advance.date;
          windowCount = 0;
          windowTotal = 0 as Cents;
        }
        windowCount += 1;
        // `advance.amount` is stated in TODAY's money too (user ruling, 2026-09-25) — raised to
        // THIS advance's own day before it joins the window total the dollar cap below checks.
        windowTotal = addCents(windowTotal, inflateStated(advance.amount, settings.economicSeries.cpi, settings.asAtDate, advance.date));
        if (windowCount > maxPerWindow) {
          fail(
            PlanFileEntryError,
            `${advancePath}.date`,
            `is ${advance.date}, the ${windowCount}${windowCount === 3 ? 'rd' : 'th'} advance within ${windowFortnights} fortnights of ${windowStart} — at most ${maxPerWindow} advances are allowed in any rolling ${windowFortnights}-fortnight window, starting on the window's own first advance (SS Act s 1134A(2)(b))`,
          );
        }
        const cap = heasAdvanceCap(personMaximumPaymentRateAt(windowStart));
        if (windowTotal > cap) {
          fail(
            PlanFileEntryError,
            `${advancePath}.amount`,
            `brings the total advanced within ${windowFortnights} fortnights of ${windowStart} to ${windowTotal} cents, over the ${cap}-cent cap — 50% of the ANNUAL maximum payment rate for ${owner.name}'s own share (SS Act s 1134A(3)(a), register T33)`,
          );
        }
      }
    }
  }
};

/**
 * **`checkHeasDraws`' three cross-entry refusals, per Scenario scope (2026-09-25, scenario isolation
 * @ed5aa63):** a second `HEAS_DRAW` for the same Person, a couple's two disagreeing on
 * `securityValue`, and a `MORTGAGE_REFINANCE` on or after a draw (T35). Sibling Scenarios may each
 * hold a draw for the same Person — the care routes' route 4 adds one in a child.
 */
const checkHeasDrawRelations = (scope: CareScope, household: Household): void => {
  const entries = scope.map(({ entry }) => entry);
  const seenOwners = new Set<string>();
  let firstSecurityValue: Cents | undefined = undefined;
  let firstSecurityValuePath: string | undefined = undefined;
  for (const { index, entry } of scope) {
    if (entry.type !== 'HEAS_DRAW') continue;
    const path = `entries[${index}]`;
    // `checkHeasDraws` has already refused a `household` owner and a missing Person.
    const owner = household.persons[entry.owner === 'personA' ? 0 : 1] as Person;
    if (seenOwners.has(entry.owner)) {
      fail(
        PlanFileEntryError,
        `${path}.owner`,
        `is a SECOND HEAS_DRAW entry for ${owner.name} in one scenario: this build carries a whole episode — start, amount and an optional stop — on ONE entry per Person (HeasDrawParams.stopDate). Remove one, or restate the single entry with the terms that should apply throughout`,
      );
    }
    seenOwners.add(entry.owner);
    if (firstSecurityValue === undefined) {
      firstSecurityValue = entry.params.securityValue;
      firstSecurityValuePath = path;
    } else if (entry.params.securityValue !== firstSecurityValue) {
      fail(
        PlanFileEntryError,
        `${path}.params.securityValue`,
        `is ${entry.params.securityValue} cents, and ${firstSecurityValuePath}.params.securityValue is ${firstSecurityValue} cents: a couple's two HEAS_DRAW entries price two loans against the SAME home, and cannot disagree about what it is worth. State the same figure on both`,
      );
    }
    const voiding = entries.find((candidate) => candidate.type === 'MORTGAGE_REFINANCE' && candidate.date >= entry.date);
    if (voiding !== undefined) {
      fail(
        PlanFileEntryError,
        `${path}`,
        `is a HEAS_DRAW starting ${entry.date}, and a MORTGAGE_REFINANCE entry (id ${voiding.id}) is dated ${voiding.date} — on or after it. Increasing the Owner-Occupied Mortgage while a HEAS loan runs VOIDS the No Negative Equity Guarantee (SS Act s 1144AA(3)(a), register T35). Remove one, or date the refinance strictly before the HEAS draw begins`,
      );
    }
  }
};

/** The `RENT_OUT_HOME` member of `Entry`, so a filtered/found array carries the narrowed type rather than widening back to `Entry`. */
type RentOutHomeEntry = Extract<Entry, { type: 'RENT_OUT_HOME' }>;

/** A date strictly after every `IsoDate` this build ever compares — an open-ended tenancy's own "end". */
const MAX_ISO_DATE: IsoDate = '9999-12-31';

/**
 * **`SELL_HOME` needs a home to sell, only one sale, and — since `RENT_OUT_HOME` (P14-13,
 * 2026-09-25) — a sale within the ATO's "6-year rule".** Unlike `ENTER_CARE` and `HEAS_DRAW`,
 * `owner` is not checked here — `MORTGAGE_REFINANCE`'s own precedent, a home is a Household fact and
 * `projection.ts` ignores `owner` on this type entirely.
 *
 *   * **the household must be a homeowner** — `checkHeasDraws`'s own `homeTreatment(...).homeowner`
 *     check, copied rather than shared: a Household already stated `noHome` or
 *     `vacatedBeyondTwoYearExemption` (non-homeowner treatment already, DSS Guide 4.6.3.70) has
 *     nothing left this build treats as a sellable principal home;
 *   * **`noHomeSaleProceedsExempt` is refused too, EXPLICITLY, despite `homeTreatment` reporting it a
 *     homeowner (P14-13c).** That flag is DSS Guide 4.6.3.90's own "treated as a homeowner" ruling for
 *     the ASSETS TEST free area — it says nothing about there being an actual home. A household in
 *     this state has already sold; there is nothing left to sell a second time;
 *   * **at most one `SELL_HOME` in the file** — a household sells its home once; a second entry
 *     would restart a sale that has already happened. `projection.ts`'s `homeSold` local is a `let`
 *     set once and never reset, and a door refusal is what keeps that assumption true rather than a
 *     silent "last one wins";
 *   * **within 6 years of the most recent `RENT_OUT_HOME` that had already started** — ato.gov.au
 *     "Treating former home as main residence" (live, 22 June 2026): a home rented out stays fully
 *     CGT-exempt for up to 6 years of that absence; beyond 6 years only a PARTIAL exemption applies,
 *     apportioned by days. This build computes no CGT parcel for a home at all (ADR-0005) and has no
 *     day-count machinery to apportion one, so a sale more than 6 years (72 months, `priceLevel.ts`'s
 *     own month-ordinal precision) after the rental's own `date` is refused by name — the literal
 *     ruling, not the ATO's own finer "stopped living in it" anchor, which this build cannot state
 *     separately from the rental's own start date in any case. A household that reoccupied and never
 *     rented again (no `RENT_OUT_HOME` with `date <= entry.date` at all) reads no rental here, and
 *     the ordinary total exemption applies untouched.
 */
const SIX_YEAR_CGT_LIMIT_MONTHS = 72;

const checkSellHomes = (scope: CareScope, household: Household): void => {
  const entries = scope.map(({ entry }) => entry);
  let firstSellHome: string | undefined = undefined;
  for (const { index, entry } of scope) {
    if (entry.type !== 'SELL_HOME') continue;
    const path = `entries[${index}]`;
    if (!homeTreatment(household.homeStatus).homeowner || household.homeStatus === 'noHomeSaleProceedsExempt') {
      fail(PlanFileEntryError, `${path}.type`, `is SELL_HOME, and household.homeStatus is "${household.homeStatus}" — there is no home this build treats as a sellable principal home to sell`);
    }
    if (firstSellHome !== undefined) {
      fail(PlanFileEntryError, `${path}.type`, `is a SECOND SELL_HOME entry (the first is "${firstSellHome}"): a household sells its home once. Remove one`);
    }
    firstSellHome = entry.id;
    const rentOutHomes = entries.filter((candidate): candidate is RentOutHomeEntry => candidate.type === 'RENT_OUT_HOME' && candidate.date <= entry.date);
    const mostRecent = rentOutHomes.reduce<RentOutHomeEntry | undefined>(
      (latest, candidate) => (latest === undefined || candidate.date > latest.date ? candidate : latest),
      undefined,
    );
    if (mostRecent !== undefined && monthsBetween(mostRecent.date, entry.date) > SIX_YEAR_CGT_LIMIT_MONTHS) {
      fail(
        PlanFileEntryError,
        `${path}.date`,
        `is ${entry.date}, and a RENT_OUT_HOME entry (id ${mostRecent.id}) started renting the home on ${mostRecent.date} — more than 6 years (72 months) earlier. Beyond 6 years of renting, the ATO's main-residence exemption (Subdiv 118-B, the "6-year rule") is only PARTIAL, apportioned by days, and this build computes no such partial exemption. Sell within 6 years of the rental's start, or this sale cannot be modelled`,
      );
    }
  }
};

/**
 * **`RENT_OUT_HOME` needs a home to rent, no overlapping tenancies, and a coherent order against a
 * `SELL_HOME` and an `ENTER_CARE` (P14-13, 2026-09-25).**
 *
 *   * **the household must be a homeowner** — `checkSellHomes`'s own `homeTreatment(...).homeowner`
 *     check, copied rather than shared: a Household already `noHome` or past its two-year cliff has
 *     nothing left this build treats as a rentable principal home;
 *   * **`noHomeSaleProceedsExempt` is refused too, EXPLICITLY, on `checkSellHomes`'s own reasoning
 *     (P14-13c).** `homeTreatment` reports it a homeowner for the ASSETS TEST free area alone (DSS
 *     Guide 4.6.3.90) — it says nothing about an actual home existing. A household in this state has
 *     already sold; there is nothing left to rent out;
 *   * **not on or after the home is sold** — a `SELL_HOME` dated on or before this entry leaves
 *     nothing to rent (the reverse order — rent first, sell later — is `checkSellHomes`'s own
 *     6-year check, above);
 *   * **`endDate` after `date`** — a tenancy cannot end before or in the month it starts;
 *   * **no two tenancies overlap** — this build carries at most one active `RENT_OUT_HOME` at a
 *     time; a household that reoccupies and later rents again states a SECOND entry with its own
 *     `date`, never two running at once;
 *   * **not while a tenancy is already running when a Person enters care** — an `ENTER_CARE` entry
 *     assumes the Person was actually LIVING in the home the day before (DSS Guide 4.6.3.70's own
 *     "leaving home to enter care"), which cannot be true of a home already let to a tenant. The
 *     REVERSE order — care first, then renting the now-vacated home — is the case DSS Guide 4.6.3.70
 *     actually describes and `projection.ts`'s `RENT_OUT_HOME` block models.
 *
 * **Not checked here, because it cannot be:** a `RENT_OUT_HOME` while a Person still lives in the
 * home because `ENTER_CARE`'s OTHER partner has not (yet) left it — `vacatedProtectedPersonRemains`
 * — depends on `careOn`/`death`, which only the walk resolves month by month. `projection.ts`
 * refuses it there, by name, "whole-home rental only".
 */
const checkRentOutHomes = (scope: CareScope, household: Household): void => {
  const entries = scope.map(({ entry }) => entry);
  const rentOutHomes: { readonly index: number; readonly entry: RentOutHomeEntry }[] = [];
  for (const { index, entry } of scope) {
    if (entry.type !== 'RENT_OUT_HOME') continue;
    const path = `entries[${index}]`;
    if (!homeTreatment(household.homeStatus).homeowner || household.homeStatus === 'noHomeSaleProceedsExempt') {
      fail(PlanFileEntryError, `${path}.type`, `is RENT_OUT_HOME, and household.homeStatus is "${household.homeStatus}" — there is no home this build treats as a rentable principal home`);
    }
    const sold = entries.find((candidate) => candidate.type === 'SELL_HOME' && candidate.date <= entry.date);
    if (sold !== undefined) {
      fail(PlanFileEntryError, `${path}.date`, `is ${entry.date}, and a SELL_HOME entry (id ${sold.id}) is dated ${sold.date} — on or before it. There is no home left to rent once it is sold`);
    }
    if (entry.params.endDate !== undefined && entry.params.endDate <= entry.date) {
      fail(PlanFileEntryError, `${path}.params.endDate`, `is ${entry.params.endDate}, on or before the entry's own date of ${entry.date}: a tenancy cannot end before or in the month it starts`);
    }
    const enteredCareDuring = entries.find(
      (candidate) =>
        candidate.type === 'ENTER_CARE' &&
        entry.date <= candidate.date &&
        (entry.params.endDate === undefined || entry.params.endDate >= candidate.date),
    );
    if (enteredCareDuring !== undefined) {
      fail(
        PlanFileEntryError,
        `${path}.date`,
        `is ${entry.date}, and an ENTER_CARE entry (id ${enteredCareDuring.id}) is dated ${enteredCareDuring.date} — on or after it, while this tenancy is still active. Entering care means leaving a home actually lived in (DSS Guide 4.6.3.70), and this home was already let to a tenant. State an endDate before the ENTER_CARE entry, or remove one`,
      );
    }
    rentOutHomes.push({ index, entry });
  }
  for (let i = 0; i < rentOutHomes.length; i += 1) {
    for (let j = i + 1; j < rentOutHomes.length; j += 1) {
      const a = rentOutHomes[i] as { readonly index: number; readonly entry: RentOutHomeEntry };
      const b = rentOutHomes[j] as { readonly index: number; readonly entry: RentOutHomeEntry };
      const aEnd = a.entry.params.endDate ?? MAX_ISO_DATE;
      const bEnd = b.entry.params.endDate ?? MAX_ISO_DATE;
      const overlaps = a.entry.date < bEnd && b.entry.date < aEnd;
      if (overlaps) {
        fail(
          PlanFileEntryError,
          `entries[${b.index}].date`,
          `is ${b.entry.date}, and RENT_OUT_HOME entry ${a.entry.id} runs from ${a.entry.date}${a.entry.params.endDate === undefined ? ' with no end date' : ` to ${a.entry.params.endDate}`} — the two tenancies overlap. This build carries at most one active RENT_OUT_HOME at a time`,
        );
      }
    }
  }
};

/**
 * **`BUY_HOME`, slice 1 (P14-19): only after a `SELL_HOME` in the same scope, in a later month, and
 * once.** Also refused: a scope with an `ENTER_CARE` (the care clock reads the old home), and a
 * `HEAS_DRAW` dated on or after the purchase (the walk stops every draw once the home is sold).
 */
const checkBuyHomes = (scope: CareScope): void => {
  const entries = scope.map(({ entry }) => entry);
  let firstBuyHome: string | undefined = undefined;
  for (const { index, entry } of scope) {
    if (entry.type !== 'BUY_HOME') continue;
    const path = `entries[${index}]`;
    const sold = entries.find((candidate) => candidate.type === 'SELL_HOME');
    if (sold === undefined) {
      fail(PlanFileEntryError, `${path}.type`, `is BUY_HOME with no SELL_HOME in the same scenario: buying a first home without a sale isn't modelled`);
    }
    if (firstBuyHome !== undefined) {
      fail(PlanFileEntryError, `${path}.type`, `is a SECOND BUY_HOME entry (the first is "${firstBuyHome}"): buying again after one sale isn't modelled. Remove one`);
    }
    firstBuyHome = entry.id;
    if (entry.date.slice(0, 7) <= sold.date.slice(0, 7)) {
      fail(PlanFileEntryError, `${path}.date`, `is ${entry.date}, and the SELL_HOME entry (id ${sold.id}) settles on ${sold.date}: the purchase must settle in a later month than the sale`);
    }
    const inCare = entries.find((candidate) => candidate.type === 'ENTER_CARE');
    if (inCare !== undefined) {
      fail(PlanFileEntryError, `${path}.type`, `is BUY_HOME, and ENTER_CARE entry ${inCare.id} is in the same scenario: buying a new home with anyone in aged care isn't modelled`);
    }
    const laterDraw = entries.find((candidate) => candidate.type === 'HEAS_DRAW' && candidate.date >= entry.date);
    if (laterDraw !== undefined) {
      fail(PlanFileEntryError, `${path}.date`, `is ${entry.date}, and HEAS_DRAW entry ${laterDraw.id} starts on ${laterDraw.date}: a Home Equity Access Scheme loan against the new home isn't modelled`);
    }
  }
};

/** ITAA 1997 s 292-102(1)(a), (3)(a) and (1)(g) — the figures live in `superannuation.downsizer`. */
export const DOWNSIZER_MINIMUM_AGE = SUPERANNUATION.downsizer.minimumAge.value;
export const DOWNSIZER_CAP = SUPERANNUATION.downsizer.cap.value;
export const DOWNSIZER_WINDOW_DAYS = SUPERANNUATION.downsizer.windowDays.value;
/** A downsizer figure stated in today's money, at its own date: the one door lens for the cap and the sale price. */
const downsizerNominal = (settings: Settings, stated: Cents, date: IsoDate): Cents =>
  inflateStated(stated, settings.economicSeries.cpi, settings.asAtDate, date);

/**
 * **`DOWNSIZER_CONTRIBUTION`, the facts about the owner (P9-5):** a Person who exists, an
 * accumulation interest of their own, 55 or older on the date, and at most $300,000 once the
 * today's-money amount is raised to that date. Every entry, on or off — none of these needs the sale.
 */
const checkDownsizerContributionTargets = (entries: readonly Entry[], household: Household, settings: Settings): void => {
  for (const [index, entry] of entries.entries()) {
    if (entry.type !== 'DOWNSIZER_CONTRIBUTION') continue;
    const path = `entries[${index}]`;
    if (entry.owner === 'household') {
      fail(PlanFileEntryError, `${path}.owner`, `is "household", and a downsizer contribution goes into one Person's own super account. State it against personA or personB — each of a couple can make one`);
    }
    const owner = household.persons[entry.owner === 'personA' ? 0 : 1];
    if (owner === undefined) {
      fail(PlanFileEntryError, `${path}.owner`, `is "${entry.owner}", and this Household has ${household.persons.length} Person — the entry names somebody who is not in the file`);
    }
    const interest = owner.superInterests[entry.params.receivingInterestIndex];
    if (interest === undefined) {
      fail(PlanFileEntryError, `${path}.params.receivingInterestIndex`, `is ${entry.params.receivingInterestIndex}, and ${owner.name} holds ${owner.superInterests.length} superannuation interest — the contribution names an account that is not in the file`);
    }
    if (interest.phase !== 'accumulation') {
      fail(PlanFileEntryError, `${path}.params.receivingInterestIndex`, `is ${entry.params.receivingInterestIndex}, and that interest of ${owner.name}'s is in the ${interest.phase === 'ttr' ? 'transition-to-retirement' : 'account-based pension'} phase. A downsizer contribution goes into an accumulation account; a pension account cannot take one. Name an accumulation interest of ${owner.name}'s`);
    }
    const fiftyFifth = nthBirthday(owner.dateOfBirth, DOWNSIZER_MINIMUM_AGE);
    if (entry.date < fiftyFifth) {
      fail(PlanFileEntryError, `${path}.date`, `is ${entry.date}, before ${owner.name} turns ${DOWNSIZER_MINIMUM_AGE} on ${fiftyFifth}: a downsizer contribution can only be made at ${DOWNSIZER_MINIMUM_AGE} or older (ITAA 1997 s 292-102(1)(a))`);
    }
    const nominal = downsizerNominal(settings, entry.params.amount, entry.date);
    if (nominal > DOWNSIZER_CAP) {
      fail(PlanFileEntryError, `${path}.params.amount`, `is ${entry.params.amount} cents in today's money, ${nominal} cents at ${entry.date}, over the ${DOWNSIZER_CAP} cent downsizer cap for one Person (ITAA 1997 s 292-102(3)(a)). The cap is not indexed, so a future contribution in today's money must be smaller`);
    }
  }
};

/**
 * **`DOWNSIZER_CONTRIBUTION`, the facts about the sale (P9-5), per scenario scope:** a `SELL_HOME`
 * in the scenario, the contribution on or after its date and within 90 days, one per Person, and the
 * couple's total at most the sale price (s 292-102(3)(b)) — both raised to their own dates.
 */
const checkDownsizerContributions = (scope: CareScope, settings: Settings): void => {
  const sold = scope
    .map(({ entry }) => entry)
    .find((candidate): candidate is Extract<Entry, { readonly type: 'SELL_HOME' }> => candidate.type === 'SELL_HOME');
  const firstFor = new Map<EntryOwner, string>();
  let total = 0;
  for (const { index, entry } of scope) {
    if (entry.type !== 'DOWNSIZER_CONTRIBUTION') continue;
    const path = `entries[${index}]`;
    if (sold === undefined) {
      fail(PlanFileEntryError, `${path}.type`, `is DOWNSIZER_CONTRIBUTION with no SELL_HOME in the same scenario: a downsizer contribution comes from the sale of a home`);
    }
    const first = firstFor.get(entry.owner);
    if (first !== undefined) {
      fail(PlanFileEntryError, `${path}.type`, `is a SECOND DOWNSIZER_CONTRIBUTION for ${entry.owner} (the first is "${first}"): each Person can make downsizer contributions from one sale only (ITAA 1997 s 292-102(1)(i)), and this forecast holds one entry for it. Combine them`);
    }
    firstFor.set(entry.owner, entry.id);
    if (entry.date < sold.date || daysInclusive(sold.date, entry.date) - 1 > DOWNSIZER_WINDOW_DAYS) {
      fail(PlanFileEntryError, `${path}.date`, `is ${entry.date}, and the SELL_HOME entry (id ${sold.id}) settles on ${sold.date}: a downsizer contribution must be made on or after the sale and within ${DOWNSIZER_WINDOW_DAYS} days of it (ITAA 1997 s 292-102(1)(g)). The ATO can allow longer on request; this forecast does not model that`);
    }
    total += downsizerNominal(settings, entry.params.amount, entry.date);
    const salePrice = downsizerNominal(settings, sold.params.salePrice, sold.date);
    if (total > salePrice) {
      fail(PlanFileEntryError, `${path}.params.amount`, `brings the downsizer contributions from this sale to ${total} cents, more than the ${salePrice} cent sale price of SELL_HOME entry ${sold.id}: together, a couple's downsizer contributions cannot exceed what the home sold for (ITAA 1997 s 292-102(3)(b))`);
    }
  }
};

/**
 * **THE TWO FACTS `SPOUSE_CONTRIBUTION` NEEDS THAT ONLY THE WHOLE FILE KNOWS** — whether the
 * Household even HAS a spouse for the owner to pay into, and whether the interest it names exists
 * and can receive a contribution (P3-19). `checkContributionTargets`'s precedent, for the same
 * reason: `projection.ts` has a branch for this type from the microtask that follows this one, but
 * a params parser sees one entry and nothing else, so a dangling owner or an index naming no
 * account of the receiving spouse's is refused here rather than reaching the walk.
 *
 * **The owner must be a Person, and the Household must hold TWO.** A contribution is paid BY one
 * member INTO the other's superannuation (`SpouseContributionParams`'s own doc): `owner:
 * 'household'` is refused on `LumpSumFromSuperParams`'s ground, and a Household with only one
 * Person is refused too — there is no second Person for `owner` to be paying, and the eligibility
 * exclusion for a permanently separated couple is expressed exactly this way, by the Household's
 * own shape (`data/assumptions/tax.ts`'s §2.9 header).
 */
const checkSpouseContributionTargets = (entries: readonly Entry[], household: Household): void => {
  for (const [index, entry] of entries.entries()) {
    if (entry.type !== 'SPOUSE_CONTRIBUTION') continue;
    const path = `entries[${index}]`;
    if (entry.owner === 'household') {
      fail(PlanFileEntryError, `${path}.owner`, `is "household", and a contribution into your spouse's superannuation is made by one Person into the OTHER Person's own interest — there is no household account to pay from and no household account to pay into. State it against personA or personB`);
    }
    const ownerIndex = entry.owner === 'personA' ? 0 : 1;
    const owner = household.persons[ownerIndex];
    if (owner === undefined) {
      fail(PlanFileEntryError, `${path}.owner`, `is "${entry.owner}", and this Household has ${household.persons.length} Person — the entry names somebody who is not in the file`);
    }
    const spouse = household.persons[1 - ownerIndex];
    if (spouse === undefined) {
      fail(PlanFileEntryError, `${path}.owner`, `names ${owner.name} paying into a spouse's superannuation, and this Household has only one Person — there is nobody for the contribution to go to. \`SPOUSE_CONTRIBUTION\` needs a second Person in the file`);
    }
    const interest = spouse.superInterests[entry.params.receivingInterestIndex];
    if (interest === undefined) {
      fail(PlanFileEntryError, `${path}.params.receivingInterestIndex`, `is ${entry.params.receivingInterestIndex}, and ${spouse.name} holds ${spouse.superInterests.length} superannuation interest — the contribution names an account that is not in the file, and there is nothing for it to be paid into`);
    }
    // The same phase rule `checkContributionTargets` applies to a Person's own contribution,
    // applied here to the RECEIVING spouse's interest instead of the contributor's own.
    if (interest.phase !== 'accumulation') {
      fail(PlanFileEntryError, `${path}.params.receivingInterestIndex`, `is ${entry.params.receivingInterestIndex}, and that interest of ${spouse.name}'s is in the ${interest.phase === 'ttr' ? 'transition-to-retirement' : 'account-based pension'} phase. A contribution is paid into an ACCUMULATION interest: a retirement-phase stream is closed to contributions, and a fund receiving one would open a new accumulation interest rather than add to the stream. This build cannot open one, so it is refused rather than credited to an account that would not have received it. Name an accumulation interest of ${spouse.name}'s`);
    }
  }
};

/**
 * **THE THREE FACTS `TRIS_EARLY_CONVERSION` NEEDS THAT ONLY THE WHOLE FILE KNOWS** — who the
 * owner is, whether the interest it names exists and is actually a TTR, and whether the stated day
 * is genuinely EARLY (P3-8's conversion limb, ruled and re-ruled by the user 2026-09-22).
 *
 * `checkContributionTargets`'s precedent, for the same reason: `projection.ts` has no branch for
 * this type (`planEdits.ENTRY_TYPES_NOT_YET_WALKED`), so a dangling owner, an index naming no
 * account, an account that is not a TTR, or a day that is not actually early would be read, saved,
 * and change no figure — the P4-12 silent no-op this build refuses at every door it can.
 *
 * **The owner must be a Person**, on `LumpSumFromSuperParams`'s ground: a superannuation interest
 * belongs to one member, and a household-owned entry would have to invent whose account it names.
 *
 * **The 65th-birthday boundary is `>=`, not `>`.** `trisConversionDay.ts`'s R13 resolution treats
 * a stated day EQUAL TO the automatic conversion day as agreement, not a contradiction, because
 * both readings name the same day. This entry asks a different question — not "does the stated
 * day contradict the backstop", but "is this genuinely an EARLY conversion" — and a day equal to
 * the 65th birthday is not early: item 106 converts the stream automatically that day regardless
 * of what this entry says, so stating it here would add nothing this entry exists to add. `>=` is
 * therefore the boundary a stated day must clear, one comparison stricter than R13's own `>`, and
 * for a reason particular to what THIS entry claims rather than a disagreement with R13.
 */
const checkTrisEarlyConversionTargets = (entries: readonly Entry[], household: Household): void => {
  for (const [index, entry] of entries.entries()) {
    if (entry.type !== 'TRIS_EARLY_CONVERSION') continue;
    const path = `entries[${index}]`;
    if (entry.owner === 'household') {
      fail(PlanFileEntryError, `${path}.owner`, `is "household", and a superannuation interest converting from a transition-to-retirement stream to a full pension belongs to one Person — the interest is theirs alone, and a household-owned entry would have to invent whose account it names. State it against personA or personB`);
    }
    const personIndex = entry.owner === 'personA' ? 0 : 1;
    const person = household.persons[personIndex];
    if (person === undefined) {
      fail(PlanFileEntryError, `${path}.owner`, `is "${entry.owner}", and this Household has ${household.persons.length} Person — the entry names somebody who is not in the file. It is refused rather than skipped: an entry nobody owns would convert nothing, forever, with nothing on screen to say so`);
    }
    const interest = person.superInterests[entry.params.interestIndex];
    if (interest === undefined) {
      fail(PlanFileEntryError, `${path}.params.interestIndex`, `is ${entry.params.interestIndex}, and ${person.name} holds ${person.superInterests.length} superannuation interest — the entry names an account that is not in the file, and there is nothing for it to convert`);
    }
    // **The PHASE of the target — this entry converts a TTR interest, and nothing else.** An
    // accumulation interest has not started a transition to retirement income stream at all; an
    // account-based pension has, in this model's terms, already converted. Naming either states a
    // fact that is not true of the account named.
    if (interest.phase !== 'ttr') {
      fail(PlanFileEntryError, `${path}.params.interestIndex`, `is ${entry.params.interestIndex}, and that interest of ${person.name}'s is in the ${interest.phase === 'accumulation' ? 'accumulation' : 'account-based pension'} phase, not transition-to-retirement. This entry states that a TTR interest converted early to a full pension; an accumulation interest has not started a transition-to-retirement income stream to convert, and an account-based pension has already converted. Name a transition-to-retirement interest`);
    }
    // **The 65th-birthday boundary — see this function's own doc for why `>=` and not `>`.**
    // `nthBirthday` is R13's own function (`trisConversionDay.ts`), read here for its calendar
    // arithmetic alone: this file never imports `trisConversionDayUnderItem106` or
    // `trisInterestOrRefuse`, and never reads a Condition of Release's `.grounds` — see the pure
    // routing module beside `trisInterest.ts`, which sidesteps O65 the same way.
    const automaticConversionDay = nthBirthday(person.dateOfBirth, AUTOMATIC_RELEASE_AGE);
    if (entry.date >= automaticConversionDay) {
      fail(PlanFileEntryError, `${path}.date`, `is ${entry.date}, which is on or after ${automaticConversionDay}, ${person.name}'s 65th birthday. SISR Schedule 1 item 106 converts a transition-to-retirement interest to retirement phase automatically on that day, with no notification and no election, so a stated conversion on or after it states nothing this entry can add: on the birthday itself it agrees with what already happens automatically, and after it the stream had already converted. State a day strictly before ${automaticConversionDay}, or state nothing and let the automatic conversion apply`);
    }
  }
};

const INSURANCE_COVER_BENEFITS = ['death', 'tpd', 'both'] as const;

/**
 * **What an `INSURANCE_COVER_CHANGE` needs that only the whole file knows** (P3-17a slice 3): a
 * Person and an account that exist, a premium stated for the benefit it changes (both, for
 * `'both'`), and a date before the birthday the account's cover for that benefit ends
 * (`insuranceCoverEndsAtAge`, 70 when none is stated) — for `'both'`, before EITHER has ended.
 */
const checkInsuranceCoverChangeTargets = (entries: readonly Entry[], household: Household, settings: Settings): void => {
  for (const [index, entry] of entries.entries()) {
    if (entry.type !== 'INSURANCE_COVER_CHANGE') continue;
    const path = `entries[${index}]`;
    if (entry.owner === 'household') {
      fail(PlanFileEntryError, `${path}.owner`, `is "household", and insurance cover belongs to one Person's super account. State it against personA or personB`);
    }
    const person = household.persons[entry.owner === 'personA' ? 0 : 1];
    if (person === undefined) {
      fail(PlanFileEntryError, `${path}.owner`, `is "${entry.owner}", and this Household has ${household.persons.length} Person — the entry names somebody who is not in the file, so it would change nothing`);
    }
    const interest = person.superInterests[entry.params.interestIndex];
    if (interest === undefined) {
      fail(PlanFileEntryError, `${path}.params.interestIndex`, `is ${entry.params.interestIndex}, and ${person.name} has ${person.superInterests.length} super account${person.superInterests.length === 1 ? '' : 's'} — the entry names an account that is not in the file`);
    }
    const { benefit } = entry.params;
    const unstated = [
      ...(benefit !== 'tpd' && !((interest.statedDeathPremiumPerYear ?? 0) > 0) ? ['death'] : []),
      ...(benefit !== 'death' && !((interest.statedTpdPremiumPerYear ?? 0) > 0) ? ['TPD'] : []),
    ];
    if (unstated.length > 0) {
      fail(PlanFileEntryError, `${path}.params.benefit`, `is "${benefit}", and that super account of ${person.name}'s states no ${unstated.join(' or ')} premium, so there is no cover to change. State the premium under Household and settings first, or pick the benefit it does state`);
    }
    // A change dated before the plan's start would scale a premium already stated off today's statement a second time.
    if (entry.date < settings.asAtDate) {
      fail(PlanFileEntryError, `${path}.date`, `is ${entry.date}, before the plan starts on ${settings.asAtDate}. A change already made shows in today's premium, so state that premium under Household and settings instead`);
    }
    const changed: readonly (readonly ['death' | 'tpd', string])[] = [
      ...(benefit !== 'tpd' ? [['death', 'Death'] as const] : []),
      ...(benefit !== 'death' ? [['tpd', 'TPD'] as const] : []),
    ];
    for (const [key, name] of changed) {
      const endsAt = insuranceCoverEndsAtAge(interest, key);
      const coverEnds = nthBirthday(person.dateOfBirth, endsAt);
      if (entry.date >= coverEnds) {
        fail(PlanFileEntryError, `${path}.date`, `is ${entry.date}, on or after ${coverEnds}, ${person.name}'s ${endsAt}th birthday. ${name} cover on that super account has already ended by then, so there is nothing to change. Date the change before ${coverEnds}`);
      }
    }
  }
};

/** The 60, read from the record: the age a transition to retirement pension can start (item 110). */
const PRESERVATION_AGE: number = SUPERANNUATION.access.preservationAge.value;

/**
 * **What a `TTR_START` needs that only the whole file knows** (retire flow S4): a Person and an
 * accumulation account that exist, that account not being where the Guarantee is nominated, another
 * accumulation account for the Guarantee to go on landing in, and a date from the plan's start and
 * from the 60th birthday to before the 65th (item 110 is attaining preservation age; item 106 has
 * released everything at 65, so there is nothing to transition).
 */
const checkTtrStartTargets = (entries: readonly Entry[], household: Household, settings: Settings): void => {
  for (const [index, entry] of entries.entries()) {
    if (entry.type !== 'TTR_START') continue;
    const path = `entries[${index}]`;
    if (entry.owner === 'household') {
      fail(PlanFileEntryError, `${path}.owner`, `is "household", and a transition to retirement pension belongs to one Person's super account. State it against personA or personB`);
    }
    const person = household.persons[entry.owner === 'personA' ? 0 : 1];
    if (person === undefined) {
      fail(PlanFileEntryError, `${path}.owner`, `is "${entry.owner}", and this Household has ${household.persons.length} Person — the entry names somebody who is not in the file, so it would change nothing`);
    }
    const interest = person.superInterests[entry.params.interestIndex];
    if (interest === undefined) {
      fail(PlanFileEntryError, `${path}.params.interestIndex`, `is ${entry.params.interestIndex}, and ${person.name} has ${person.superInterests.length} super account${person.superInterests.length === 1 ? '' : 's'} — the entry names an account that is not in the file`);
    }
    if (interest.phase !== 'accumulation') {
      fail(PlanFileEntryError, `${path}.params.interestIndex`, `is ${entry.params.interestIndex}, and that super account of ${person.name}'s is ${interest.phase === 'ttr' ? 'already a transition to retirement pension' : 'already a full account-based pension'}. A transition to retirement pension starts from an account still building up (accumulation): pick that account`);
    }
    if (interest.statedEmployerContributionDestination !== undefined) {
      fail(PlanFileEntryError, `${path}.params.interestIndex`, `is ${entry.params.interestIndex}, and that is the super account ${person.name}'s employer pays into. A pension account cannot take contributions, so the employer keeps paying into an account still building up. Pick the other account for the pension, or name another account as the one the employer pays into`);
    }
    const others = person.superInterests.filter((other, slot) => slot !== entry.params.interestIndex && other.phase === 'accumulation');
    if (others.length === 0) {
      fail(PlanFileEntryError, `${path}.params.interestIndex`, `is ${entry.params.interestIndex}, and it is ${person.name}'s only super account still building up. Someone drawing a transition to retirement pension is still working, and their employer keeps paying into an account still building up, so the pension is paid from a second account. This forecast cannot open an account part-way through: add the amount you will move into the pension as a second super account under Household and settings, and name that one`);
    }
    if (entry.date < settings.asAtDate) {
      fail(PlanFileEntryError, `${path}.date`, `is ${entry.date}, before the plan starts on ${settings.asAtDate}. A transition to retirement pension that has already started is stated under Household and settings, as that account's phase, with the day it started`);
    }
    const sixtieth = nthBirthday(person.dateOfBirth, PRESERVATION_AGE);
    if (entry.date < sixtieth) {
      fail(PlanFileEntryError, `${path}.date`, `is ${entry.date}, before ${sixtieth}, ${person.name}'s ${PRESERVATION_AGE}th birthday. A transition to retirement pension can't start before ${PRESERVATION_AGE} (SISR Schedule 1 item 110). Date it on or after ${sixtieth}`);
    }
    const sixtyFifth = nthBirthday(person.dateOfBirth, AUTOMATIC_RELEASE_AGE);
    if (entry.date >= sixtyFifth) {
      fail(PlanFileEntryError, `${path}.date`, `is ${entry.date}, on or after ${sixtyFifth}, ${person.name}'s ${AUTOMATIC_RELEASE_AGE}th birthday. From ${AUTOMATIC_RELEASE_AGE} super is free to use whether or not ${person.name} works (SISR Schedule 1 item 106), so there is nothing to transition: a pension started then is a full account-based pension. Date it before ${sixtyFifth}`);
    }
  }
};

/**
 * **A `TTR_START` in its own Scenario** (retire flow S4): one start per account, and no start while
 * that Person is stopped (the latest stop or return on or before the day is a `RETIRE`). Stopping
 * work turns the account into a full pension already (the switch at retirement), so a transition to
 * retirement pension after it states something that cannot happen. After a return to work (RF-2)
 * one is allowed (SISR Sch 1 item 110 turns on preservation age, not on work), from an account the
 * first stop did not switch; it converts at the next stop, or at 65. A `RETIRE` after the start is
 * the ordinary case and converts the pension that day.
 */
const checkTtrStarts = (scope: CareScope, household: Household, settings: Settings): void => {
  const started = new Map<string, string>();
  // `enabled` is the Scenario's own switch here, already applied by the scope.
  const scoped = scope.map(({ entry }) => ({ ...entry, enabled: true }));
  const spells = workSpells(household, scoped);
  const switches = retirementSwitches(household, scoped, settings.asAtDate);
  for (const { index, entry } of scope) {
    if (entry.type !== 'TTR_START') continue;
    const path = `entries[${index}]`;
    // `checkTtrStartTargets` has already refused a `household` owner and a missing Person.
    const person = household.persons[entry.owner === 'personA' ? 0 : 1] as Person;
    const key = `${entry.owner}\0${entry.params.interestIndex}`;
    const first = started.get(key);
    if (first !== undefined) {
      fail(PlanFileEntryError, `${path}.type`, `is a SECOND TTR_START for super account ${entry.params.interestIndex + 1} of ${person.name}'s in the same scenario (the first is "${first}"). An account starts its transition to retirement pension once. Remove one`);
    }
    started.set(key, entry.id);
    const personIndex = entry.owner === 'personA' ? 0 : 1;
    const latest = (spells[personIndex] ?? []).filter((change) => change.date <= entry.date).at(-1);
    if (latest?.kind === 'stopped') {
      fail(PlanFileEntryError, `${path}.date`, `is ${entry.date}, on or after ${person.name}'s Retire entry dated ${latest.date} (id ${latest.entryId}) in the same scenario. Stopping work already turns the super into a full pension, so a transition to retirement pension can't start after it. After going back to work one can start again: date the pension before ${latest.date} or on or after the return, or remove one of the two`);
    }
    const decided = switches[personIndex];
    if (decided?.kind === 'switches' && decided.slots.includes(entry.params.interestIndex) && decided.retireDay <= entry.date) {
      fail(PlanFileEntryError, `${path}.params.interestIndex`, `is ${entry.params.interestIndex}, and that super account of ${person.name}'s already became a full pension when ${person.name} stopped work on ${decided.retireDay}. A transition to retirement pension starts from an account still building up: choose an account kept in accumulation at retirement`);
    }
  }
};

/**
 * **What a `TTR_RATE_CHANGE` needs that only the whole file knows** — `checkTrisEarlyConversionTargets`'
 * owner, index and phase checks, for the same reasons, and one boundary: a change dated on or after
 * the Person's 65th birthday is refused, because SISR Schedule 1 item 106 has converted the stream
 * to a full pension by then and a full pension has no drawdown rate to change. An EARLIER conversion
 * stated by a `TRIS_EARLY_CONVERSION` entry belongs to one Scenario, so it is the walk's to refuse.
 */
const checkTtrRateChangeTargets = (entries: readonly Entry[], household: Household): void => {
  for (const [index, entry] of entries.entries()) {
    if (entry.type !== 'TTR_RATE_CHANGE') continue;
    const path = `entries[${index}]`;
    if (entry.owner === 'household') {
      fail(PlanFileEntryError, `${path}.owner`, `is "household", and a transition to retirement pension belongs to one Person's super account. State it against personA or personB`);
    }
    const person = household.persons[entry.owner === 'personA' ? 0 : 1];
    if (person === undefined) {
      fail(PlanFileEntryError, `${path}.owner`, `is "${entry.owner}", and this Household has ${household.persons.length} Person — the entry names somebody who is not in the file, so it would change nothing`);
    }
    const interest = person.superInterests[entry.params.interestIndex];
    if (interest === undefined) {
      fail(PlanFileEntryError, `${path}.params.interestIndex`, `is ${entry.params.interestIndex}, and ${person.name} has ${person.superInterests.length} super account${person.superInterests.length === 1 ? '' : 's'} — the entry names an account that is not in the file`);
    }
    // An accumulation account a TTR_START names is a TTR from that start; the walk refuses a change
    // dated before the start in its own Scenario.
    const started = entries.some((other) => other.type === 'TTR_START' && other.owner === entry.owner && other.params.interestIndex === entry.params.interestIndex);
    if (interest.phase !== 'ttr' && !(interest.phase === 'accumulation' && started)) {
      fail(PlanFileEntryError, `${path}.params.interestIndex`, `is ${entry.params.interestIndex}, and that super account of ${person.name}'s is ${interest.phase === 'accumulation' ? 'still building up (accumulation)' : 'already a full account-based pension'}, not a transition to retirement pension. Only a transition to retirement pension has a drawdown rate to change: pick that account, or set this one to TTR first`);
    }
    const automaticConversionDay = nthBirthday(person.dateOfBirth, AUTOMATIC_RELEASE_AGE);
    if (entry.date >= automaticConversionDay) {
      fail(PlanFileEntryError, `${path}.date`, `is ${entry.date}, on or after ${automaticConversionDay}, ${person.name}'s 65th birthday. A transition to retirement pension becomes a full pension on that day by law (SISR Schedule 1 item 106), and a full pension pays at least the yearly minimum with no 10% limit, so there is no drawdown rate left to change. Date the change before ${automaticConversionDay}`);
    }
  }
};

/**
 * **AT MOST ONE EMPLOYER DESTINATION PER PERSON, AND IT IS AN ACCUMULATION INTEREST** (P6-8 brief
 * 3, chunk 2a, user ruling 2026-09-20).
 *
 * `SuperInterest.statedEmployerContributionDestination` marks the account a Person's employer pays
 * the Superannuation Guarantee into. It is carried per interest for the reasons in `household.ts`,
 * and the cost of that shape is that the file can state it twice. This is where that is refused.
 *
 * **TWO CHECKS, AND THEY REFUSE DIFFERENT THINGS.**
 *   1. **A destination on a retirement-phase interest.** Refused on precisely the ground
 *      `checkContributionTargets` below refuses a stated sacrifice into one: an account-based
 *      pension and a transition-to-retirement stream are closed to contributions, a real fund
 *      would open a NEW accumulation interest, and this build has no path that opens one. The
 *      employer money would be credited to a stream no fund would have credited.
 *   2. **Two interests of one Person both claiming it.** A Person has one fund their employer pays
 *      into, or none. Two claims are two answers, and the alternative to refusing is this module
 *      picking one — which is the guess the whole field exists to remove.
 *
 * **WHAT IS NOT REFUSED HERE, deliberately.** A Person who states no destination at all, however
 * many accumulation interests they hold. That file is well formed, it is what every plan written
 * before this field looks like, and the question its author was never put cannot be a defect in
 * their file. The destination is simply UNDETERMINED for such a Person, and what must not happen —
 * a Guarantee credited to a fund this model chose — is held where the crediting is, not here.
 *
 * It is a door check rather than a walk refusal for `checkContributionTargets`'s reason: which
 * interest receives the employer contribution is a fact about the HOUSEHOLD, static for the whole
 * walk, so a month is never the right place to discover it is stated twice. `PlanFileHouseholdError`
 * and not a new named class — nothing is unanswered about the law here, and what the user must do
 * is a well-formedness fix to one of two interests, which the `path` in the message names.
 */
/**
 * **A premium stated at an age the fund's table does not price — refused here, by name (P3-17b's
 * door gap, 2026-09-28).** The walk carries a stated premium from the age at the plan's first month,
 * and there is no rate to carry from under 15 or once the cover has ended (the account's own end age
 * for death and for TPD, 70 when none is stated; 65 for income protection); without this the walk threw a RangeError naming no file and no path.
 */
const checkInsuranceAges = (household: Household, settings: Settings): void => {
  const firstDay = `${settings.asAtDate.slice(0, 7)}-01` as IsoDate;
  household.persons.forEach((person, personIndex) => {
    const age = ageAt(person.dateOfBirth, firstDay);
    person.superInterests.forEach((interest, index) => {
      const stated: readonly (readonly [keyof SuperInterest, Cents | undefined, string, number])[] = [
        ['statedDeathPremiumPerYear', interest.statedDeathPremiumPerYear, 'Death', insuranceCoverEndsAtAge(interest, 'death')],
        ['statedTpdPremiumPerYear', interest.statedTpdPremiumPerYear, 'TPD', insuranceCoverEndsAtAge(interest, 'tpd')],
        ['statedIncomeProtectionPremiumPerYear', interest.statedIncomeProtectionPremiumPerYear, 'Income protection', INCOME_PROTECTION_ENDS_AT_AGE],
      ];
      for (const [key, premium, benefit, endsAt] of stated) {
        if (premium === undefined || premium === 0) continue;
        // User ruling 2026-09-28: cover lives on the accumulation (Future Saver) account and ends
        // when it converts to a pension, so an account-based pension carries none. A premium stated
        // on one would otherwise be read and silently charged nothing — refused, not ignored.
        if (interest.phase === 'accountBasedPension') {
          fail(
            PlanFileHouseholdError,
            `household.persons[${personIndex}].superInterests[${index}].${key}`,
            `is stated on an account-based pension of ${person.name}'s. ${benefit} cover in super is held on an accumulation account and ends when it converts to a pension, so this build charges no premium on a pension account. Move the premium to the accumulation account that holds the cover, or remove it`,
          );
        }
        if (age < INSURANCE_FIRST_AGE || age >= endsAt) {
          fail(
            PlanFileHouseholdError,
            `household.persons[${personIndex}].superInterests[${index}].${key}`,
            `is stated, and ${person.name} is ${age} when the plan starts on ${settings.asAtDate}. ${benefit} cover in super is priced from age ${INSURANCE_FIRST_AGE} and ends at ${endsAt}, so there is no premium at ${age} to carry forward. Remove the premium, or check the date of birth`,
          );
        }
      }
    });
  });
};

const checkEmployerContributionDestinations = (household: Household): void => {
  household.persons.forEach((person, personIndex) => {
    const nominated = person.superInterests
      .map((interest, index) => ({ interest, index }))
      .filter(({ interest }) => interest.statedEmployerContributionDestination !== undefined);
    for (const { interest, index } of nominated) {
      if (interest.phase !== 'accumulation') {
        fail(
          PlanFileHouseholdError,
          `household.persons[${personIndex}].superInterests[${index}].statedEmployerContributionDestination`,
          `names this interest of ${person.name}'s as the destination for employer contributions, and it is in the ${interest.phase === 'ttr' ? 'transition-to-retirement' : 'account-based pension'} phase. Employer money is paid into an ACCUMULATION interest: a retirement-phase stream is closed to contributions, and a fund receiving one would open a new accumulation interest rather than add to the stream. This build cannot open one, so it is refused rather than credited to an account that would not have received it. Name an accumulation interest`,
        );
      }
    }
    if (nominated.length > 1) {
      fail(
        PlanFileHouseholdError,
        `household.persons[${personIndex}].superInterests`,
        `states the employer contribution destination on ${nominated.length} of ${person.name}'s interests — positions ${nominated.map(({ index }) => index).join(', ')} — and a Person has one fund their employer pays into, or none. Two are two answers to a question with one answer, and the alternative to refusing is this build choosing which of them the Superannuation Guarantee lands in. Name exactly one`,
      );
    }
  });
};

/**
 * **AT MOST ONE RELEASE AUTHORITY DESTINATION PER PERSON, AND IT IS AN ACCUMULATION INTEREST**
 * (register O84, P6-9 M1, user ruling 2026-09-20).
 *
 * `SuperInterest.statedReleaseAuthorityDestination` carries the ITAA 1997 Subdiv 293-B election: the
 * Person has told the Commissioner to take their Division 293 liability out of THIS interest rather
 * than out of their own cash. It is the sibling of the employer destination above and NOT a reuse of
 * it — that field says where the employer CREDITS, this one says where the ATO DEBITS — and it is
 * carried per interest for the same reason, so it can be stated twice, which is refused here.
 *
 * **TWO CHECKS, mirroring the two above and refusing on their own grounds.**
 *   1. **An election on a retirement-phase interest.** A payment out of an account-based pension or
 *      a transition-to-retirement stream to satisfy a release authority is a COMMUTATION: it debits
 *      the transfer balance account, changes the pension being paid, and changes the Schedule 7
 *      minimum drawn from it. This build has no path that commutes, so it would simply subtract the
 *      charge from the stream — a balance no fund would produce, and over Age Pension age a
 *      means-test answer computed off it.
 *   2. **Two interests of one Person both claiming it.** A release authority is served on one
 *      interest. Two claims are two answers, and the alternative to refusing is this module picking
 *      which fund is raided — the guess the field exists to remove.
 *
 * **WHAT IS NOT REFUSED HERE, deliberately, and it is a LONGER list than the employer field's.**
 *   * A Person who states nothing. That is not an unanswered question, it is the statutory default:
 *     no election, the charge paid in cash. Every plan file written before this date is in this
 *     case and none of them is defective.
 *   * A Person who states it and has **no Division 293 liability at all**. Legal and inert. Whether
 *     a Person is charged is a fact about a YEAR OF THE WALK — income moves, and the threshold is
 *     crossed or not in each year of a forecast that runs to age 100 — so a door that refused a
 *     standing election would have to run the projection to know it was idle.
 *   * One interest each of two DIFFERENT Persons. Division 293 is assessed per individual and so is
 *     the election; two Persons electing is two elections.
 *
 * A door check and not a walk refusal on `checkEmployerContributionDestinations`'s ground: which
 * interest a release authority names is a fact about the HOUSEHOLD, static for the whole walk.
 * `PlanFileHouseholdError` and not a new named class — the two refusals here are well-formedness
 * faults in one interest of one Person, the message names the path and the fix, and nothing about
 * the law is left unanswered, which is what a named class in this build is for.
 */
const checkReleaseAuthorityDestinations = (household: Household): void => {
  household.persons.forEach((person, personIndex) => {
    const elected = person.superInterests
      .map((interest, index) => ({ interest, index }))
      .filter(({ interest }) => interest.statedReleaseAuthorityDestination !== undefined);
    for (const { interest, index } of elected) {
      if (interest.phase !== 'accumulation') {
        fail(
          PlanFileHouseholdError,
          `household.persons[${personIndex}].superInterests[${index}].statedReleaseAuthorityDestination`,
          `names this interest of ${person.name}'s as the one a Division 293 release authority is served on, and it is in the ${interest.phase === 'ttr' ? 'transition-to-retirement' : 'account-based pension'} phase. A release authority paid out of a retirement-phase stream is a COMMUTATION: it debits the transfer balance account, changes the pension being paid and changes the minimum drawn from it. This build has no path that commutes a stream, so it is refused rather than subtracted from an account no fund would have debited. Name an accumulation interest`,
        );
      }
    }
    if (elected.length > 1) {
      fail(
        PlanFileHouseholdError,
        `household.persons[${personIndex}].superInterests`,
        `states the Division 293 release authority destination on ${elected.length} of ${person.name}'s interests — positions ${elected.map(({ index }) => index).join(', ')} — and a release authority is served on one interest. Two are two answers to a question with one answer, and the alternative to refusing is this build choosing which of their funds the charge is taken out of. Name exactly one`,
      );
    }
  });
};

// --- The door ---------------------------------------------------------------------------------------

/**
 * **`unknown` → `PlanFile`, or a named refusal.** The only way a plan enters this program.
 *
 * It returns a NEW object built field by field from what it read, never the input with a type
 * assertion over it: an assertion would let an unchecked field ride along into the engine, which is
 * the failure this module exists to prevent.
 */
export const parsePlan = (value: unknown): PlanFile => {
  const record = object(PlanFileShapeError, value, 'the file', ['version', 'settings', 'household', 'entries', 'scenarios', 'activeScenarioId']);
  const version = record['version'];
  if (version !== PLAN_FILE_VERSION) {
    fail(
      PlanFileVersionError,
      'the file',
      `states version ${JSON.stringify(version) ?? 'nothing'}, and this build reads version ${PLAN_FILE_VERSION} only. ` +
        'It is refused by name rather than read on a guess: a shape this build does not know is a shape it would misread silently. A version 1 file is upgraded on load, once, and written back only if the upgraded plan both parses and walks',
    );
  }
  // Read in the order the file writes them, so that a file with two defects in it reports the
  // first one a reader would come to rather than whichever check happens to be cheapest.
  const settings = parseSettings(record['settings'], 'settings');
  const household = parseHousehold(record['household'], 'household');
  const entries = array(PlanFileEntryError, record['entries'], 'entries')
    .map((entry, index) => parseEntry(entry, `entries[${index}]`));
  const scenarios = array(PlanFileShapeError, record['scenarios'], 'scenarios')
    .map((scenario, index) => parseScenario(scenario, `scenarios[${index}]`));
  const activeScenarioId = string(PlanFileShapeError, record['activeScenarioId'], 'activeScenarioId');
  checkEmployerContributionDestinations(household);
  checkInsuranceAges(household, settings);
  checkParcelValuesJustBefore1July2027(household, settings);
  checkStatedUnusedConcessionalCaps(household, settings);
  checkReleaseAuthorityDestinations(household);
  checkContributionTargets(entries, household);
  checkSpouseContributionTargets(entries, household);
  checkDownsizerContributionTargets(entries, household, settings);
  checkIllnessSeparations(entries, household);
  checkDeaths(entries, household);
  checkHeasDraws(entries, household, settings);
  checkTrisEarlyConversionTargets(entries, household);
  checkTtrStartTargets(entries, household, settings);
  checkTtrRateChangeTargets(entries, household);
  checkInsuranceCoverChangeTargets(entries, household, settings);
  checkScenarioGraph(scenarios, entries, activeScenarioId);
  // After the graph check: the scopes resolve ancestry, which a looping or dangling parent would break.
  careCheckScopes(entries, scenarios).forEach((scope, index) => {
    checkEnterCares(scope, household);
    // Scenario scopes only, like the two below: an entry switched off everywhere has no partner.
    if (index < scenarios.length) checkHeasDrawRelations(scope, household);
    checkSellHomes(scope, household);
    checkRentOutHomes(scope, household);
    // Scenario scopes only: a purchase switched off everywhere has no sale to be checked against.
    if (index < scenarios.length) checkBuyHomes(scope);
    if (index < scenarios.length) checkDownsizerContributions(scope, settings);
    checkTtrStarts(scope, household, settings);
  });
  // Membership, not switches: the stop's ruling reads `date`, never `enabled`.
  careCheckScopes(entries, scenarios, false)
    .slice(0, scenarios.length)
    .forEach((scope) => checkContributionStops(scope, household));
  return { version: PLAN_FILE_VERSION, settings, household, entries, scenarios, activeScenarioId };
};
