// P3-10 — the account-based pension minimum drawdown. SIS Regulations 1994 reg 1.06(9A)(a) and
// Schedule 7, as read in `docs/research/p3-minimum-drawdown-and-ttr.md`. Register §3.9.
//
// This item was refused once (80f377c) because §3.9 left four things undetermined, and each of the
// four moves real money. They are now read off the instrument, and the shape below exists to stop
// each of them being got wrong again:
//
//   * **The rounding is nearest $10 with an exact $5 going up — not a ceiling** (cl 5). There is
//     one rounding in this file, it is the final statement of the calculation, and every input to
//     it is an exact integer: the balance in cents, the factor as a reduced rational, the two day
//     counts, and the cl 4A/4B relief as a rational. Nothing is rounded on the way, so "round
//     twice" is not a thing a caller can ask for and not a thing this file can do by accident.
//
//   * **Pro-rating comes first and the rounding comes last** (cl 1(1) is "Subject to clauses 3, 4,
//     4A and 4B"; cl 5 rounds "an amount determined under this Schedule"). The discriminating case
//     is $1,009,078 at 4% commencing 1 August 2026: this order gives $36,940, and rounding the
//     annual figure first gives $36,930.
//
//   * **The pro-rating is in days, and the commencement day itself counts** — cl 3's "the number
//     of days in the financial year that include and follow the commencement day". The word
//     "month" appears nowhere in Schedule 7. There is no parameter here through which a month
//     count, a proportion or a day count could arrive: the days are counted from the commencement
//     day, which is a date the caller has to state anyway.
//
//   * **A commencement year reads the commencement-day balance, and applies the full annual factor
//     to it** (cl 1(2)(a)(ii)); all the part-year adjustment lives in cl 3. Register §3.9 states
//     that exception in terms — its *"Which balance"* row carries it in capitals — and the balance
//     a caller passes carries the date it was measured at, so passing a 1 July balance for a
//     pension that commenced in October is not a wrong number — it is `PensionBalanceDateError`.
//
//     **Until 2026-09-11 this paragraph and the refusal below both misdescribed §3.9**, crediting
//     it with a reading of the commencement year it had stopped carrying. The description was true
//     when it was written — this file was last edited **2026-09-08** (`4e26760`) — and false the
//     next morning, because §3.9 was corrected on **2026-09-09**; the superseded reading survives
//     in that section as one quoted copy inside the note recording it as superseded, which is
//     where the evidence record belongs and why no copy of it is kept here. The rule stated above
//     is unchanged and was never in doubt: only the account of what the register says has been
//     corrected. `test/core-minimum-drawdown.test.mjs` asserts the retracted claim absent from
//     this file and from the message, so it cannot come back quietly in either.
//
// ⚠️ **ONE SUBSTITUTED INPUT WAS ADMITTED ON 2026-09-21 (P10-5), and it is an input and not a
// rule.** A forecast that opens on 1 September cannot know the balance on the preceding 1 July,
// because the day is behind it. Schedule 7 is complete on the point — cl 1(2)(a)(i) reads the
// 1 July balance and cl 3 does not reach a year the pension did not commence in — so the gap is in
// the data and nowhere else. `pensionAccountBalanceObservedLater` is the single route by which a
// later observation may stand in for it; it is refused in any direction but forward and in any year
// but that one, and the figure it makes carries `proxiedFrom` so that no determination resting on a
// stand-in can be reported without it. `PensionBalanceDateError` is NARROWED by it, not retired:
// every undeclared wrong day is still refused.
//
// Two more things the register does not carry at all, both of which are here:
//
//   * **cl 1(2)(b)** substitutes the **withdrawal benefit** where it exceeds the account balance.
//     For a plain account-based pension the two are the same number and it is inert, so it is the
//     kind of rule that gets dropped. `pensionAccountBalance` requires both figures — not one with
//     the other defaulted — so the substitution cannot be skipped by omission.
//
//   * **The age is the age on the day the balance is read**: 1 July, or the commencement day in a
//     commencement year (cl 1(2), "percentage factor"). A Person who turns 65 in September and
//     commences a pension in October takes 5%, not the 4% their 1 July age would give. There is no
//     `age` parameter — the date of birth arrives instead and the age is taken at the day the
//     Schedule names, so the two cannot come apart at a call site.
//
// The TTR maximum is **not** here (P3-8), and neither is the transfer balance cap (P3-9) nor the
// accumulation/retirement phase distinction (P3-7). The research pass establishes that the TTR
// maximum is neither pro-rated nor rounded nor age-varying nor switched off by cl 4 — it is not
// this Schedule's machinery at all, it is reg 6.01(2)(b)(ii) — so nothing in this file may be
// reused for it, and nothing in this file is exported in a shape that invites it.
import { mulCents } from './money.js'; // `.js` is correct in a `.ts` file — see tsconfig.json
import type { Cents } from './money.js';
import {
  compareFinancialYears,
  daysInFinancialYear,
  daysInclusive,
  endOfFinancialYear,
  financialYearContaining,
  financialYearStartYear,
  startOfFinancialYear,
} from './financialYear.js';
import { ageAt, assertIsoDate } from './household.js';
import { mergeProvenance, provenanceOf } from './provenance.js';
import type { ComputedProvenance, Consumed } from './provenance.js';
import { SUPERANNUATION } from '../data/assumptions/super.js';
import type { MinimumDrawdownBand, MinimumDrawdownRelief } from '../data/assumptions/super.js';
import type { FinancialYear, IsoDate } from '../data/assumptions/types.js';

const ACCESS = SUPERANNUATION.access;
const FACTORS = ACCESS.minimumDrawdownFactors;
const ROUNDING_STEP: Cents = ACCESS.minimumDrawdownRoundingStep.value;
const NIL_FROM: string = ACCESS.minimumDrawdownNilFrom.value;
const RELIEF: Readonly<Record<string, MinimumDrawdownRelief | undefined>> = ACCESS.minimumDrawdownRelief.value;

/**
 * cl 4A and cl 4B are closed enumerations of named years. A year that is not in either list is not
 * relieved, which is what "the amount worked out using the formula in clause 1" means for every
 * other year — FY2026-27 among them. This is the absence, not a figure.
 */
const NO_RELIEF: MinimumDrawdownRelief = Object.freeze({ numerator: 1, denominator: 1 });

const BANDS: readonly MinimumDrawdownBand[] = FACTORS.value;

// The lookup below walks the bands in order and keeps the last one reached, which is only the
// Schedule's table if the table ascends. Checked once, here, rather than assumed at every call.
BANDS.forEach((band, index) => {
  const previous = BANDS[index - 1];
  if (previous !== undefined && band.fromAge <= previous.fromAge) {
    throw new RangeError(`the Schedule 7 bands are out of order at age ${band.fromAge}`);
  }
});

const CONSUMED: readonly Consumed[] = [
  ['superannuation.access.minimumDrawdownFactors', FACTORS],
  ['superannuation.access.minimumDrawdownRoundingStep', ACCESS.minimumDrawdownRoundingStep],
  ['superannuation.access.minimumDrawdownNilFrom', ACCESS.minimumDrawdownNilFrom],
  ['superannuation.access.minimumDrawdownRelief', ACCESS.minimumDrawdownRelief],
];

/**
 * Consumed by a part-year determination and by nothing else. Sch 7 cl 3 states the numerator of
 * the proportion and never states the denominator; a full-year minimum does not depend on it and
 * must not be labelled as though it did.
 */
const DENOMINATOR_CONSUMED: readonly Consumed[] = [
  ['superannuation.access.minimumDrawdownProRataDenominator', ACCESS.minimumDrawdownProRataDenominator],
];

// --- Refusals -----------------------------------------------------------------------------------

export class PensionNotCommencedError extends RangeError {
  constructor(fy: FinancialYear, commencementDay: IsoDate) {
    super(
      `a pension commencing on ${commencementDay} has no minimum payment for FY${fy}: the year ` +
        'ends before it starts. SIS Regulations Sch 7 determines "the amount of payments" for a ' +
        'pension that exists, and reg 1.06(9A) requires payment "at least annually" once it has ' +
        'commenced — neither says anything about the years before it, and a nil returned here ' +
        'would read in a forecast as a pension that is running and requires nothing.',
    );
    this.name = 'PensionNotCommencedError';
  }
}

export class PensionBalanceDateError extends RangeError {
  constructor(fy: FinancialYear, required: IsoDate, measuredAt: IsoDate, commencementYear: boolean) {
    super(
      `the pension account balance for FY${fy} must be the balance on ${required} and this one was ` +
        `measured on ${measuredAt}. ${
          commencementYear
            ? 'FY' +
              fy +
              ' is the year the pension commences, so Sch 7 cl 1(2)(a)(ii) reads the balance on ' +
              'the commencement day and not on 1 July — which is what register §3.9\'s "Which ' +
              'balance" row states, the commencement-day exception being carried there in ' +
              'capitals. A pension that commenced part way through the year has no 1 July ' +
              'balance to read.'
            : 'Sch 7 cl 1(2)(a)(i) reads the balance on 1 July in the financial year the payment ' +
              'is made in. A balance from any other day is a different number that would be ' +
              'multiplied by the same factor and never noticed.'
        }`,
    );
    this.name = 'PensionBalanceDateError';
  }
}

/**
 * ⚠️ **The tripwire on the ONE substitution this module permits — see
 * `pensionAccountBalanceObservedLater`.** `PensionBalanceDateError` was narrowed rather than
 * deleted when P10-5 landed: it still refuses every balance measured on the wrong day, and the only
 * thing that now gets past it is a balance the caller has DECLARED to be a stand-in, in a direction
 * and a year this refusal checks.
 */
export class PensionBalanceProxyError extends RangeError {
  constructor(requiredDay: IsoDate, observedOn: IsoDate) {
    super(
      `a balance observed on ${observedOn} cannot stand in for the balance on ${requiredDay}. A ` +
        'stand-in is allowed in one direction and one financial year only: a forecast that opens ' +
        'AFTER the day Sch 7 cl 1(2)(a) names cannot know that day\'s balance, and the balance it ' +
        'does hold is the nearest observation there is. An observation on or before that day is ' +
        'not a stand-in — it is a balance `pensionAccountBalance` takes as it stands — and one ' +
        'from another financial year is a different year\'s number, which is the substitution ' +
        'PensionBalanceDateError exists to refuse.',
    );
    this.name = 'PensionBalanceProxyError';
  }
}

export class MidYearProportioningError extends RangeError {
  constructor(fy: FinancialYear) {
    super(
      `the FY${fy} minimum payment cannot be worked out for a pension that was commuted or rolled ` +
        'over during the year. Sch 7 cl 3 proportions the minimum for one event only — the year ' +
        'the commencement day falls in — and says nothing about a commutation or a rollover. ATO ' +
        'guidance says the minimum "will be a proportion of the annual amount if the income ' +
        'stream starts, is commuted or rolled over part way through the year", which is a second ' +
        'proportioning event with no clause behind it in the Schedule as read (P3-10 U7, and the ' +
        'commutation limb was explicitly out of that research pass\'s scope). The full-year ' +
        'minimum and a proportioned one are different numbers and this refuses rather than ' +
        'choosing. State the year as uncommuted, or close U7 first.',
    );
    this.name = 'MidYearProportioningError';
  }
}

// --- Exact arithmetic — everything stays an integer until cl 5 -----------------------------------

interface Rational {
  readonly numerator: number;
  readonly denominator: number;
}

/**
 * The bands hold their factors as decimal rates (`0.04`), and Schedule 7's column 3 holds them as
 * whole percents (`4`). Converting the stored rate to an exact rational at this boundary is what
 * keeps the rest of the calculation free of floats: `0.04 × 273 ÷ 365` in doubles is a number that
 * is nearly right, and "nearly right" is decided at the $10 rounding step.
 */
const RATE_SCALE = 1_000_000;

const greatestCommonDivisor = (a: number, b: number): number => (b === 0 ? a : greatestCommonDivisor(b, a % b));

const exactRational = (rate: number, what: string): Rational => {
  const scaled = Math.round(rate * RATE_SCALE);
  // Division is correctly rounded, so this holds exactly for any rate that is representable at
  // this scale — and fails for one that is not, rather than quietly losing the tail.
  if (!Number.isSafeInteger(scaled) || scaled / RATE_SCALE !== rate) {
    throw new RangeError(`${what} is ${rate}, which is not an exact fraction at this scale`);
  }
  const divisor = greatestCommonDivisor(scaled, RATE_SCALE);
  return { numerator: scaled / divisor, denominator: RATE_SCALE / divisor };
};

/** A product that refuses to be approximate: an overflow past exact integer arithmetic throws. */
const product = (...values: readonly number[]): number => {
  let total = 1;
  for (const value of values) {
    total *= value;
    if (!Number.isSafeInteger(total)) {
      throw new RangeError(`the minimum payment calculation overflowed exact integer arithmetic at ${total}`);
    }
  }
  return total;
};

/**
 * **Sch 7 cl 5, and the only rounding in this file.** The nearest whole `step` to the exact
 * rational `numerator ÷ denominator`, with a tie going up: `(2n + ds) ÷ 2ds`, floored.
 *
 * The division is a float division of two exact integers, and the floor is safe: the true quotient
 * is a ratio with denominator `2ds`, so if it is not an integer it is at least `1/2ds` away from
 * one — some eight orders of magnitude more than the rounding error of the division at these
 * magnitudes. An exact tie divides exactly and floors exactly, which is the case the clause's
 * second sentence is about.
 */
const roundHalfUpToStep = (numerator: number, denominator: number, step: Cents): Cents => {
  if (numerator < 0 || denominator <= 0 || step <= 0) {
    throw new RangeError(`not a roundable amount: ${numerator}/${denominator} to a step of ${step}`);
  }
  const steps = Math.floor((product(2, numerator) + product(denominator, step)) / product(2, denominator, step));
  return mulCents(step, steps);
};

// --- Sch 7 cl 1(2) "account balance" — with the cl 1(2)(b) withdrawal-benefit floor --------------

declare const PENSION_ACCOUNT_BALANCE: unique symbol;

export interface PensionAccountBalanceFigure {
  /** The day the balance is a balance *on*. Checked against the day the Schedule names. */
  readonly measuredAt: IsoDate;
  readonly accountBalance: Cents;
  /** cl 1(2)(b) — what the beneficiary would get if the pension were fully commuted. */
  readonly withdrawalBenefit: Cents;
  /** cl 1(2): the account balance, or the withdrawal benefit where that is greater. */
  readonly value: Cents;
  /** True where cl 1(2)(b) actually bit. Reported, because it is a rule nobody expects to fire. */
  readonly withdrawalBenefitSubstituted: boolean;
  /**
   * **The day this balance was actually observed on, where that is NOT `measuredAt`** — the one
   * substituted input this module permits, and `undefined` on every balance that needs none. See
   * `pensionAccountBalanceObservedLater`. It rides on the figure rather than being passed alongside
   * it so that a caller cannot report the minimum without being able to report that it rests on a
   * stand-in: `MinimumDrawdown.balance.proxiedFrom` is reachable from every determination.
   */
  readonly proxiedFrom: IsoDate | undefined;
}

/**
 * Branded, so the only route to a balance `minimumDrawdown` will accept is `pensionAccountBalance`,
 * which cannot be called without stating the withdrawal benefit. A bare `Cents` is not assignable:
 * dropping cl 1(2)(b) is not an omission anyone can make at a call site.
 *
 * **Nominal, not structural — P3-41.** The brand is a `private` member of a type-only class, so a
 * spread of a real balance cannot carry it: `{ ...real, value: lie }` is TS2741, not a
 * `PensionAccountBalance`. Nothing exists at runtime; the value is still a plain frozen record.
 */
declare class PensionAccountBalanceWitness { private readonly [PENSION_ACCOUNT_BALANCE]: true }

export type PensionAccountBalance = PensionAccountBalanceFigure & PensionAccountBalanceWitness;

export const pensionAccountBalance = (input: {
  readonly measuredAt: IsoDate;
  readonly accountBalance: Cents;
  /**
   * Required, never defaulted. For an ordinary account-based pension in an APRA fund it equals the
   * account balance and cl 1(2)(b) is inert; it bites where an exit fee, a surrender value or an
   * unallocated reserve makes them differ, and a default would decide that question silently
   * (P3-10 U6).
   */
  readonly withdrawalBenefit: Cents;
}): PensionAccountBalance => {
  const { accountBalance, withdrawalBenefit } = input;
  const measuredAt = assertIsoDate(input.measuredAt);
  if (accountBalance < 0) throw new RangeError(`not a pension account balance: ${accountBalance} cents`);
  if (withdrawalBenefit < 0) throw new RangeError(`not a withdrawal benefit: ${withdrawalBenefit} cents`);
  const substituted = withdrawalBenefit > accountBalance;
  return Object.freeze({
    measuredAt,
    accountBalance,
    withdrawalBenefit,
    value: substituted ? withdrawalBenefit : accountBalance,
    withdrawalBenefitSubstituted: substituted,
    proxiedFrom: undefined,
  }) as PensionAccountBalance;
};

/**
 * **THE ONE SUBSTITUTED INPUT — a balance observed AFTER the day Sch 7 names, standing in for the
 * balance on that day (P10-5, 2026-09-21).**
 *
 * **Nothing in Schedule 7 changes here.** cl 1(2)(a)(i) reads the balance *"on 1 July in the
 * financial year in which the payment is made"*; a forecast that opens on 1 September has no way of
 * knowing what that balance was, because the day is behind it. The LAW is complete and the INPUT is
 * missing, and those are two different problems. This is the second one, and the substitution is
 * the nearest observation there is — the balance the plan actually states.
 *
 * ⚠️ **It is permitted in ONE direction and ONE year.** `observedOn` must fall strictly after
 * `requiredDay` and inside the same financial year. A balance from on or before that day is not a
 * stand-in at all — the caller has the real thing and `pensionAccountBalance` takes it — and one
 * from another financial year is a different year's number, which is exactly the error
 * `PensionBalanceDateError` exists to stop. Neither can be laundered through here.
 *
 * **The direction of the error is NOT signed, and the size of it is.** Between 1 July and the day
 * the forecast opens a pension account takes payments out and earnings in; whichever is larger
 * decides the sign, so the substitution can run either way. What is bounded is the MAGNITUDE: it is
 * the factor (4–14%) times the balance's movement over those weeks, which for a walk opening in
 * September is single-digit percent of the minimum. The behaviour it replaced — determining no
 * minimum at all, so that the household could not reach its own pension for ten months — was wrong
 * by the whole of it, and had no clause behind it in the Schedule. There is no nil in Schedule 7
 * except cl 4's, and cl 4 turns on the commencement day and not on when a forecast opens.
 */
export const pensionAccountBalanceObservedLater = (input: {
  /** The day Sch 7 cl 1(2)(a) names: 1 July, or the commencement day in a commencement year. */
  readonly requiredDay: IsoDate;
  /** The day the balance really is a balance on — later than `requiredDay`, in the same year. */
  readonly observedOn: IsoDate;
  readonly accountBalance: Cents;
  readonly withdrawalBenefit: Cents;
}): PensionAccountBalance => {
  const requiredDay = assertIsoDate(input.requiredDay);
  const observedOn = assertIsoDate(input.observedOn);
  if (observedOn <= requiredDay || financialYearContaining(observedOn) !== financialYearContaining(requiredDay)) {
    throw new PensionBalanceProxyError(requiredDay, observedOn);
  }
  // Built THROUGH `pensionAccountBalance` rather than beside it, so cl 1(2)(b)'s withdrawal-benefit
  // substitution and both non-negative checks happen in exactly one place. The spread defeats the
  // brand at the type level, which is why the cast is here and why this is the only other statement
  // in this module that applies it.
  return Object.freeze({
    ...pensionAccountBalance({
      measuredAt: requiredDay,
      accountBalance: input.accountBalance,
      withdrawalBenefit: input.withdrawalBenefit,
    }),
    proxiedFrom: observedOn,
  }) as PensionAccountBalance;
};

// --- The minimum ---------------------------------------------------------------------------------

declare const MINIMUM_DRAWDOWN: unique symbol;

interface MinimumDrawdownCommon {
  readonly fy: FinancialYear;
  readonly commencementDay: IsoDate;
  readonly isCommencementYear: boolean;
  /** The day Sch 7 cl 1(2) reads both the balance and the age at. */
  readonly relevantDay: IsoDate;
  readonly balance: PensionAccountBalance;
  /** reg 1.06(9A)(a): a floor on the year's *total* payments, not a payment schedule. */
  readonly amount: Cents;
  readonly provenance: ComputedProvenance;
}

/**
 * A discriminated union, so the factor, the age and the day counts are **unreachable** on a
 * determination that cl 4 switched off. There is no factor in a nil year: reading one off would be
 * reading a number the Schedule never worked out.
 */
export type MinimumDrawdownFigure =
  | (MinimumDrawdownCommon & {
      readonly nil: true;
      /** The 1 June that cl 4 measures against, in the financial year asked about. */
      readonly nilFrom: IsoDate;
    })
  | (MinimumDrawdownCommon & {
      readonly nil: false;
      /** Age on `relevantDay` — cl 1(2) "percentage factor" — never age at 1 July in a commencement year. */
      readonly age: number;
      /** The band's rate, as stored: `0.04` is Schedule 7's percentage factor of 4. */
      readonly factor: number;
      /** cl 3's numerator: days including and following the commencement day. Equals `daysInYear` in a full year. */
      readonly days: number;
      readonly daysInYear: number;
      /** True only where cl 3 actually proportioned — a 1 July commencement does not. */
      readonly proRated: boolean;
      /** cl 4A/4B. `1/1` for every year outside those two enumerations, FY2026-27 included. */
      readonly relief: MinimumDrawdownRelief;
    });

/**
 * **Nominal, not structural — P3-41.** The brand is a `private` member of a type-only class, so a
 * spread of a real determination cannot carry it: `{ ...real, amount: lie }` is TS2741, not a
 * `MinimumDrawdown`. Nothing exists at runtime; the value is still a plain frozen record.
 */
declare class MinimumDrawdownWitness { private readonly [MINIMUM_DRAWDOWN]: true }

export type MinimumDrawdown = MinimumDrawdownFigure & MinimumDrawdownWitness;

const bandFor = (age: number): MinimumDrawdownBand => {
  let chosen: MinimumDrawdownBand | undefined;
  for (const band of BANDS) if (age >= band.fromAge) chosen = band;
  if (chosen === undefined) throw new RangeError(`no Schedule 7 percentage factor applies at age ${age}`);
  return chosen;
};

/**
 * **SIS Regulations Sch 7 — the minimum total payment for one financial year.**
 *
 * Note what this does not take: an age, a percentage factor, a proportion, a day count, a month
 * count and a rounded figure. Every one of those is worked out here from facts the caller has to
 * state anyway — a date of birth, a commencement day, and a balance that knows which day it is a
 * balance on. Handing this function the answer to any part of Schedule 7 is not possible.
 */
export const minimumDrawdown = (input: {
  readonly fy: FinancialYear;
  readonly dateOfBirth: IsoDate;
  /** The pension's commencement day, in any year — cl 1(2) and cl 3 both key off it. */
  readonly commencementDay: IsoDate;
  readonly balance: PensionAccountBalance;
  /**
   * Required, not defaulted, in the shape `div296.ts` uses for a death during the year: a fact
   * about the year that changes which rule applies, stated rather than assumed.
   */
  readonly commutedOrRolledOverDuringYear: boolean;
}): MinimumDrawdown => {
  const { fy, balance } = input;
  const dateOfBirth = assertIsoDate(input.dateOfBirth);
  const commencementDay = assertIsoDate(input.commencementDay);

  const commencementYear = financialYearContaining(commencementDay);
  if (compareFinancialYears(commencementYear, fy) > 0) throw new PensionNotCommencedError(fy, commencementDay);
  const isCommencementYear = commencementYear === fy;

  // cl 1(2)(a): the commencement-day balance in the commencement year, the 1 July balance in every
  // other year — and the same day carries the age, by cl 1(2) "percentage factor".
  const relevantDay = isCommencementYear ? commencementDay : startOfFinancialYear(fy);
  if (balance.measuredAt !== relevantDay) {
    throw new PensionBalanceDateError(fy, relevantDay, balance.measuredAt, isCommencementYear);
  }
  if (input.commutedOrRolledOverDuringYear) throw new MidYearProportioningError(fy);

  const common = { fy, commencementDay, isCommencementYear, relevantDay, balance };

  // cl 4 — nil, not reduced, and it switches the whole determination off before any of it runs.
  const nilFrom = `${financialYearStartYear(fy) + 1}-${NIL_FROM}` as IsoDate;
  if (isCommencementYear && commencementDay >= nilFrom) {
    return Object.freeze({
      ...common,
      amount: mulCents(ROUNDING_STEP, 0),
      nil: true,
      nilFrom,
      provenance: provenanceOf(fy, CONSUMED),
    }) as MinimumDrawdown;
  }

  const age = ageAt(dateOfBirth, relevantDay);
  if (age < 0) throw new RangeError(`a Person born on ${dateOfBirth} has no age on ${relevantDay}`);
  const band = bandFor(age);
  const factor = exactRational(band.factor, `the Schedule 7 factor from age ${band.fromAge}`);

  // cl 3 — days, and the commencement day is one of them. A 1 July commencement is expressly
  // outside the clause ("if that day is a day other than 1 July"); the arithmetic would be the
  // same, but the provenance is not, because such a year does not depend on the unstated
  // denominator at all.
  const daysInYear = daysInFinancialYear(fy);
  const proRated = isCommencementYear && commencementDay !== startOfFinancialYear(fy);
  const days = proRated ? daysInclusive(commencementDay, endOfFinancialYear(fy)) : daysInYear;

  // cl 4A/4B — spent, and kept as a slot. A year outside both enumerations is not relieved.
  const relief = RELIEF[fy] ?? NO_RELIEF;

  const provenance = proRated
    ? mergeProvenance(provenanceOf(fy, CONSUMED), provenanceOf(fy, DENOMINATOR_CONSUMED))
    : provenanceOf(fy, CONSUMED);

  return Object.freeze({
    ...common,
    nil: false,
    age,
    factor: band.factor,
    days,
    daysInYear,
    proRated,
    relief,
    provenance,
    // cl 5, once, last, on the exact rational. Everything above it is an integer.
    amount: roundHalfUpToStep(
      product(balance.value, factor.numerator, days, relief.numerator),
      product(factor.denominator, daysInYear, relief.denominator),
      ROUNDING_STEP,
    ),
  }) as MinimumDrawdown;
};
