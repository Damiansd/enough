// P3-8 (the payment range only) — **the least a TTR pension must pay in a year and the most it
// may.** SIS Regulations 1994 reg 6.01(2)(b)(ii) for the ceiling, reg 1.06(9A)(a) and Schedule 7
// for the floor, as read in `docs/research/p3-minimum-drawdown-and-ttr.md`. Register §3.9.
//
// **The two ends of the range come from two different provisions, and only one of them has any
// machinery.** That is the whole content of this file. reg 6.01(2)(b)(i) pulls the entire
// Schedule 7 minimum into the definition of a transition to retirement income stream unchanged, so
// the floor is `minimumDrawdown(...)` — age-banded, pro-rated by days, rounded to $10, nil for a
// commencement on or after 1 June. The ceiling is a limb of the **definition itself**,
// reg 6.01(2)(b)(ii): total payments in a financial year of *"no more than 10% of the pension
// account balance"* on 1 July, or on the commencement day in the year the pension commences. Sch 7
// cl 3 pro-rates *"the minimum total payment"* and cl 5 rounds *"an amount determined under **this
// Schedule**"*; the maximum is determined under reg 6.01(2), so **neither clause reaches it**, and
// reg 6.01(2) supplies no replacement for either.
//
// **So in a commencement year the floor drops and the ceiling does not move.** A TRIS commencing
// 1 October 2026 on $500,000 at age 61 has a minimum of $14,960 (4%, pro-rated 273/365, rounded)
// and a maximum of $50,000 (the flat 10%, unreduced) — against $20,000 – $50,000 in a full year.
// Commencing on or after 1 June the minimum is **nil** and the maximum is still the **whole** 10%:
// a full year's ceiling available in under a month. A maintainer who "makes the maximum consistent
// with the minimum" is not tidying, they are changing the answer by $12,602 on that first fixture.
//
// **How the four adjustments are kept away from the maximum.** Not by assertion, by having no
// route in:
//
//   * **No pro-rating.** `unadjustedMaximum` takes one argument, a `TrisAccountBalance`, which
//     carries a day and an amount and nothing else. There is no day count, no proportion and no
//     denominator in this file, and none of `daysInclusive`, `daysInFinancialYear` or
//     `endOfFinancialYear`-as-a-range is imported — pro-rating cannot be written here without
//     first importing the arithmetic to do it with.
//
//   * **No rounding.** Schedule 7's $10 step is never read into this module. `minimumDrawdown`
//     keeps its `roundHalfUpToStep` private and this file does not reach for it; the only
//     quantisation on the ceiling is the **floor to the whole cent** below, which is not a
//     rounding rule at all — see the note on it.
//
//   * **No age.** There is no date of birth and no `ageAt` anywhere near the ceiling. The date of
//     birth this function does take is spent on two things that genuinely need it, the Schedule 7
//     floor and the Condition of Release gate, and neither hands an age back.
//
//   * **No cl 4.** The 1 June nil rule is `minimumDrawdown`'s and stays there. This file learns
//     that a year was nil by reading the discriminated `nil: true` off the *minimum*, which is a
//     fact about the floor, and never touches the date that produced it.
//
//   * **No cl 1(2)(b).** The withdrawal-benefit substitution belongs to Schedule 7's definition of
//     "account balance"; reg 6.01(2)(b)(ii) says plainly *"the pension account balance"*. The
//     ceiling is therefore computed from a `TrisAccountBalance`, a different branded type with no
//     withdrawal benefit on it, minted here from the *unsubstituted* `accountBalance` through a
//     helper whose parameter type does not include the substituted figure — writing the
//     substitution into the ceiling is a type error in the one place it would naturally be
//     written. Where the two differ the floor moves and the ceiling does not: on $400,000 with a
//     $420,000 withdrawal benefit the floor is $16,800 and the ceiling is $40,000.
//
// **The epistemic status of all four negatives, carried rather than asserted.** No provision
// *says* the maximum is unadjusted. It follows from Sch 7 cll 3 and 5 being confined by their own
// words, plus the absence of any substitute in reg 6.01(2), reg 6.01AB and reg 1.06(9A) — an
// argument from the absence of a provision (research pass U1). It is corroborated explicitly, in
// three bullets, one per negative, by ATO guidance, and no competing reading was found; but the
// corroboration is secondary and no Explanatory Statement or ruling was retrieved. So
// `ttrMaximumUnadjusted` is a record at `secondary-only` and **every** maximum consumes it: the
// number a ceiling reports *is* the unadjusted one, so there is no route where the reading is not
// load-bearing. A TTR range therefore comes out `secondary-only` even where its floor alone is
// `primary-verified`, and the caveats say which end the weakness is at.
//
// **What this file does not do.** The conversion limb of P3-8 — reg 6.01(2)'s "unless the
// pensioner has satisfied a condition of release in respect of which the cashing restriction … is
// 'Nil'", and what happens to the stream afterwards — is not built, and what blocks it is the
// stated conversion-day Setting R5 requires, that alone. **Mid-year ECPI apportionment no longer
// blocks it.** O60 was closed on 2026-09-10 (register §3.11 — there is no apportionment of a
// part-year, and the old "s 295-390 never retrieved" ground was false, O70), and ruling R10 is
// now BUILT: `fundEarningsTax` charges a conversion year at the proven upper bound rather than
// refusing it. This file said "not yet built" until 2026-09-10, which was true when written and
// stopped being true the same day — see `superPhase.ts`, which has said so since R10 landed.
// It is not ignored either: the range refuses outright for a Person who has
// met such a Condition of Release, because for them there is no maximum at all and returning one
// would understate the income the plan may draw. The transfer balance cap (P3-9), the
// accumulation/retirement phase distinction (P3-7) and franking inside super are not here.
//
// **Two things that refusal is careful NOT to say**, both of which the P3-9 pass proved false and
// both of which this file said until 2026-09-09. (i) That the stream stops being a transition to
// retirement income stream. It does not: ITAA 1997 s 307-80(3)(a)(i) is written *about* "a
// transition to retirement income stream" whose recipient has met a condition, so if satisfying
// one ended the product's SISR identity, (3)(b) would be dead text. What changes is the stream's
// tax **phase**. (ii) That one Condition of Release answer settles both the ceiling and the phase.
// It settles the ceiling only — the two events fall on **different days** over **different**
// condition sets (register §3.10.6, traps T118 and T119), and the note at the release gate below
// sets out which is which.
//
// **The gap at that gate, which is recorded rather than closed — T118.** reg 6.01(2)(b)(ii)'s
// "Nil" set is **seven** SISR Schedule 1 items and `conditionOfRelease` models **two** grounds; for
// the items it cannot see, this file reports a ceiling that does not legally exist. See the note
// beside the gate: the error runs in the Person's disfavour and is not detectable from anything
// this function is given.
import { compareFinancialYears, endOfFinancialYear, financialYearContaining, startOfFinancialYear } from './financialYear.js'; // `.js` is correct in a `.ts` file — see tsconfig.json
import { assertIsoDate } from './household.js';
import { conditionOfRelease } from './conditionOfRelease.js';
import type { ConditionOfRelease, GainfulEmployment, ReleaseGround } from './conditionOfRelease.js';
import { minimumDrawdown } from './minimumDrawdown.js';
import type { MinimumDrawdown, PensionAccountBalance } from './minimumDrawdown.js';
import { mergeProvenance, provenanceOf, withCaveats } from './provenance.js';
import type { ComputedProvenance, Consumed } from './provenance.js';
import { SUPERANNUATION } from '../data/assumptions/super.js';
import type { Cents } from './money.js';
import type { FinancialYear, IsoDate } from '../data/assumptions/types.js';

const ACCESS = SUPERANNUATION.access;

/** reg 6.01(2)(b)(ii). Read from the record; the figure is never written in this file. */
const MAXIMUM_RATE = ACCESS.ttrMaximumDrawdown;

const CONSUMED: readonly Consumed[] = [
  ['superannuation.access.ttrMaximumDrawdown', MAXIMUM_RATE],
  ['superannuation.access.ttrMaximumUnadjusted', ACCESS.ttrMaximumUnadjusted],
];

// --- Refusals -----------------------------------------------------------------------------------

export class TrisConversionNotModelledError extends RangeError {
  constructor(fy: FinancialYear, on: IsoDate, grounds: readonly ReleaseGround[]) {
    super(
      `the FY${fy} TTR payment range cannot be stated for a Person who has satisfied a Condition ` +
        `of Release by ${on} (${grounds.join('; ')}). reg 6.01(2)'s 10% limb applies "unless the ` +
        'pensioner has satisfied a condition of release in respect of which the cashing ' +
        "restriction for preserved benefits and restricted non-preserved benefits is 'Nil'" +
        '" — so for this Person there is no maximum at all. Returning the 10% anyway would cap a ' +
        'plan that is not capped, which understates the income it may draw, and the day the ' +
        'ceiling lapsed is not a day this function is told, so the year cannot be split here ' +
        'either. The stream is still a transition to retirement income stream: ITAA 1997 ' +
        's 307-80(3)(a)(i) is written about "a transition to retirement income stream" whose ' +
        "recipient has met a condition, so satisfying one does not end the product's SISR " +
        "identity — what changes is the stream's tax phase, and the ATO's own term for the " +
        'converted state is "TRIS in the retirement phase". That phase change is a different ' +
        'event on a different day over a different set of conditions, and this refusal does not ' +
        "decide it: the ceiling lapses on the day the condition is SATISFIED — reg " +
        '6.01(2)(b)(ii) has no notification word, and its "Nil" set is the seven SISR Schedule 1 ' +
        'items 101, 102, 102A, 103, 104, 105(b) and 106 — while the phase changes on ' +
        'NOTIFICATION of the income stream provider for items 101, 102A and 103, or ' +
        'automatically on the 65th birthday for item 106, which needs no notification ' +
        '(s 307-80(3)(b); LCR 2016/9 Example 1B: retired 30 June 2019, in the retirement phase on ' +
        '15 July 2019). In between there is no maximum, the fund is still taxed at 15% and there ' +
        'is no transfer balance credit — three answers no single converted boolean produces, ' +
        'which is why the phase question belongs to the phase module and not to this one. The ' +
        'conversion limb of P3-8 is not built, and what is missing is the stated conversion-day ' +
        'Setting alone (R5): O60 no longer blocks it, because under ruling R10 `fundEarningsTax` ' +
        'now charges the conversion year at the proven upper bound rather than refusing it ' +
        '(register §3.11). The Schedule 7 minimum survives ' +
        "conversion — reg 6.01(2)(b)(i)'s limb is unqualified — and `minimumDrawdown(...)` " +
        'states it on its own.',
    );
    this.name = 'TrisConversionNotModelledError';
  }
}

export class TrisNotCommencedError extends RangeError {
  constructor(fy: FinancialYear, commencementDay: IsoDate) {
    super(
      `a transition to retirement income stream commencing on ${commencementDay} has no payment ` +
        `range for FY${fy}: the year ends before it starts. reg 6.01(2)(b)(ii) limits "total ` +
        'payments … made in a financial year" for a pension that exists, and a range returned ' +
        'here would read in a forecast as a stream that is running, may be drawn on and must be ' +
        'paid from.',
    );
    this.name = 'TrisNotCommencedError';
  }
}

export class TrisMaximumBalanceDateError extends RangeError {
  constructor(fy: FinancialYear, required: IsoDate, measuredAt: IsoDate, commencementYear: boolean) {
    super(
      `the pension account balance the FY${fy} TTR maximum is 10% *of* must be the balance on ` +
        `${required}, and this one was measured on ${measuredAt}. ${
          commencementYear
            ? 'reg 6.01(2)(b)(ii)(B): in the year the pension commences the balance is read on the ' +
              'commencement day — the same day Sch 7 cl 1(2)(a)(ii) reads it for the minimum, ' +
              'which is a coincidence of two provisions and is checked here rather than assumed.'
            : 'reg 6.01(2)(b)(ii)(A): the balance on 1 July in the financial year in which the ' +
              'payment is made. A balance from another day is a different number that would be ' +
              'multiplied by the same 10% and never noticed.'
        }`,
    );
    this.name = 'TrisMaximumBalanceDateError';
  }
}

// --- reg 6.01(2)(b)(ii)'s balance, which is not Schedule 7's --------------------------------------

declare const TRIS_ACCOUNT_BALANCE: unique symbol;

export interface TrisAccountBalanceFigure {
  /** The day the balance is a balance *on* — 1 July, or the commencement day. */
  readonly measuredAt: IsoDate;
  /**
   * *"The pension account balance"*, plain. Note what is absent and stays absent: a withdrawal
   * benefit. Sch 7 cl 1(2)(b) substitutes one where it exceeds the account balance, and that is a
   * definition inside Schedule 7 which reg 6.01(2)(b)(ii) does not adopt.
   */
  readonly value: Cents;
}

/**
 * **Nominal, not structural — P3-41.** The brand is a `private` member of a type-only class, so a
 * spread of a real balance cannot carry it: `{ ...real, value: lie }` is TS2741, not a
 * `TrisAccountBalance`. Nothing exists at runtime; the value is still a plain frozen record.
 */
declare class TrisAccountBalanceWitness { private readonly [TRIS_ACCOUNT_BALANCE]: true }

export type TrisAccountBalance = TrisAccountBalanceFigure & TrisAccountBalanceWitness;

/**
 * The only way to obtain the balance the ceiling is taken of, and its parameter type is the reason
 * this function exists: it accepts a day and an **unsubstituted** account balance. A
 * `PensionAccountBalance` satisfies it structurally, and the cl 1(2)(b) fields on that object —
 * `withdrawalBenefit` and the substituted `value` — are not in scope inside it, so the
 * substitution cannot be written here at all.
 */
const trisAccountBalance = (balance: {
  readonly measuredAt: IsoDate;
  readonly accountBalance: Cents;
}): TrisAccountBalance =>
  Object.freeze({
    measuredAt: assertIsoDate(balance.measuredAt),
    value: balance.accountBalance,
  }) as TrisAccountBalance;

// --- The ceiling, and there is nothing to it ------------------------------------------------------

/**
 * The rate as an exact scaled integer, so the ceiling never goes near a float. `0.1 × 48,765,432`
 * in doubles is a number that is nearly right, and "nearly right" is not good enough on a limit
 * whose breach is the **death of the stream** rather than a bad year.
 *
 * **What a breach costs, on the ruling's own words** — TR 2013/5 ¶¶18–20, 100–101 and Example 6,
 * `ruling-verified`. The stream is taken to have ceased for income tax purposes **at the start of
 * that income year**, retrospectively; **every** payment made in the year, not merely the excess,
 * is a superannuation lump sum (ITAA 1997 s 307-65(1), by residue); the trustee is taken not to
 * have been paying an income stream **at any time during the year**, so the fund loses **ECPI for
 * the whole year**; and the stream **cannot recommence** in a later year — it must be commuted and
 * a **new** stream started, with the proportioning rule re-struck on commencement. For a converted
 * stream that round trip is a s 294-80(1) item 1 debit followed by a fresh s 294-25(1) item 2
 * credit at the new value, which can *increase* the transfer balance. Register §3.9, trap T123.
 *
 * **Two things this note must not be read as saying.** First, the citation is **not** ITAA 1997
 * s 307-70: that section is a bare delegation — "a superannuation income stream has the meaning
 * given by the regulations" — and contains no cessation rule at all. The operative definition is
 * ITAR (1997 Act) 2021 s 307-70.02(1), which has **never been retrieved** (O58 / U32). Second, the
 * application of the mechanism to the **10% maximum** specifically is **`secondary-only`** and must
 * not be upgraded: TR 2013/5 reasons through reg 1.06(1) → reg 1.06(9A) → Sch 7 cl 1, which is the
 * **minimum**, and reg 1.06(9A) contains no maximum; only ¶18's general words ("any of the
 * requirements of the SISR 1994 relating to the payment") reach a ceiling breach, and no source
 * retrieved by any pass applies them to one (O61 / U31). The mechanism is ruling-verified; that a
 * 10% breach falls into it is an inference.
 */
const RATE_SCALE = 1_000_000;
const SCALED_RATE = Math.round(MAXIMUM_RATE.value * RATE_SCALE);
if (SCALED_RATE / RATE_SCALE !== MAXIMUM_RATE.value) {
  throw new RangeError(`the TTR maximum rate ${MAXIMUM_RATE.value} is not an exact fraction at this scale`);
}

/**
 * **reg 6.01(2)(b)(ii), entire.** One argument, and it is a balance. There is no second argument
 * for a proportion, a day count, a rounding step or an age to arrive through, and nothing in this
 * function's scope to build one out of.
 *
 * The division truncates, and that is deliberate and is *not* a rounding rule: the provision is a
 * ceiling ("no more than"), money is quantised at the cent, so a fractional cent must be given
 * away rather than rounded up into a breach. It discards at most 9/10 of a cent. The instrument
 * prescribes nothing here (research pass U4) and a result that hits it says so in its caveats.
 */
const unadjustedMaximum = (balance: TrisAccountBalance): { readonly amount: Cents; readonly exact: boolean } => {
  const scaled = balance.value * SCALED_RATE;
  if (!Number.isSafeInteger(scaled)) {
    throw new RangeError(`the TTR maximum calculation overflowed exact integer arithmetic at ${scaled}`);
  }
  return { amount: Math.floor(scaled / RATE_SCALE) as Cents, exact: scaled % RATE_SCALE === 0 };
};

/**
 * **The walk's route to the ceiling, and it is `unadjustedMaximum` with nothing added.** The walk
 * cannot call `ttrPaymentRange` for a year in which the Person meets a Condition of Release — that
 * refuses, and a TTR converting at 65 inside the year it is paying is exactly such a year — so the
 * reg 6.01(2)(b)(ii) figure is exposed on its own, from the same unsubstituted balance, with no day
 * count, rounding step or age reachable from here. The caller states which day `balance` is a
 * balance on; checking that day against the one the regulation names is the caller's.
 */
export const ttrAnnualCeiling = (balance: { readonly measuredAt: IsoDate; readonly accountBalance: Cents }): Cents =>
  unadjustedMaximum(trisAccountBalance(balance)).amount;

export interface TtrMaximum {
  readonly fy: FinancialYear;
  /** reg 6.01(2)(b)(ii)(A) or (B) — the day the balance is read on. */
  readonly relevantDay: IsoDate;
  readonly balance: TrisAccountBalance;
  /** The record's rate, as stored. Flat, never indexed, and the same at every age. */
  readonly rate: number;
  /** 10% of the balance, quantised down to the whole cent and adjusted in no other way. */
  readonly amount: Cents;
  /**
   * True where the whole-cent truncation discarded nothing. Reported because the truncation is a
   * modelling choice and not a provision, so a reader can see when it bit.
   */
  readonly exactInCents: boolean;
  readonly provenance: ComputedProvenance;
}

// --- The range ------------------------------------------------------------------------------------

declare const TTR_PAYMENT_RANGE: unique symbol;

export interface TtrPaymentRangeFigure {
  readonly fy: FinancialYear;
  readonly commencementDay: IsoDate;
  readonly isCommencementYear: boolean;
  /** The one day both provisions read the balance on — checked, not assumed. */
  readonly relevantDay: IsoDate;
  /** Evidence the reg 6.01(2) "unless" was tested: `met` is false, or this figure does not exist. */
  readonly release: ConditionOfRelease;
  /** Sch 7 via reg 6.01(2)(b)(i), whole and unmodified — with its own provenance and its own nil. */
  readonly minimum: MinimumDrawdown;
  readonly maximum: TtrMaximum;
  /** reg 1.06(9A)(a): the least the total payments for the year may be. */
  readonly floor: Cents;
  /**
   * reg 6.01(2)(b)(ii): the most they may be. Exceeding it ends the stream for tax purposes at the
   * *start* of the year and permanently — see the note on the rate scaling above, and its two
   * qualifications.
   */
  readonly ceiling: Cents;
  readonly provenance: ComputedProvenance;
}

/**
 * **Nominal, not structural — P3-41.** The brand is a `private` member of a type-only class, so no
 * object literal can supply it, a spread of a real range included: `{ ...real, ceiling: lie }` is
 * TS2741, not a `TtrPaymentRange`. Nothing exists at runtime; the value is still a plain frozen
 * record and every reader is unchanged.
 */
declare class TtrPaymentRangeWitness { private readonly [TTR_PAYMENT_RANGE]: true }

export type TtrPaymentRange = TtrPaymentRangeFigure & TtrPaymentRangeWitness;

/**
 * **The minimum and the maximum a transition to retirement income stream may pay in one financial
 * year.**
 *
 * Note what is not a parameter: an age, a percentage factor, a proportion, a day count, a month
 * count, a rounding step, and any figure that could stand in for either end of the range. The
 * facts that arrive are facts a Person has — when they were born, when the stream commenced, what
 * it was worth on the day the provisions name, whether they have stopped working — and every rule
 * is applied to them here.
 */
export const ttrPaymentRange = (input: {
  readonly fy: FinancialYear;
  readonly dateOfBirth: IsoDate;
  readonly commencementDay: IsoDate;
  readonly balance: PensionAccountBalance;
  /**
   * Required, never defaulted, and passed straight to the Condition of Release: the reg 6.01(2)
   * "unless" turns on what the Person did, not on how old they are.
   */
  readonly gainfulEmployment: GainfulEmployment;
  /** Required, not defaulted — `minimumDrawdown` refuses a year it cannot proportion. */
  readonly commutedOrRolledOverDuringYear: boolean;
}): TtrPaymentRange => {
  const { fy, balance } = input;
  const dateOfBirth = assertIsoDate(input.dateOfBirth);
  const commencementDay = assertIsoDate(input.commencementDay);

  // **The reg 6.01(2) "unless", asserted on the last day of the year — the CEILING event, and only
  // that.** A Condition of Release, once met, stays met — both of §3.9's grounds are permanent — so
  // a Person who has not met one by 30 June has not met one at any point in the year, and the whole
  // year is a TRIS year with the 10% running through all of it. A Person who has is refused rather
  // than assumed to have gone on being capped: reg 6.01(2)(b)(ii)'s "unless" contains no
  // notification word, so their ceiling lapsed on the day the condition was **satisfied**, which is
  // a day this function is not told and could not act on if it were.
  //
  // **What this result does NOT settle is the phase.** The two events fall on different days over
  // different condition sets. The ceiling goes on satisfaction, over the seven SISR Schedule 1
  // items whose column 3 cashing restriction is "Nil" — 101, 102, 102A, 103, 104, 105(b), 106. The
  // phase changes under ITAA 1997 s 307-80(3)(b), over four of those items, and for 101, 102A and
  // 103 only on **notification** of the income stream provider; item 106 is absent from
  // (3)(b)(ii)'s enumeration and so converts **automatically on the 65th birthday**, with nothing
  // to notify. LCR 2016/9 Example 1B is exactly that window — retired 30 June 2019, retirement
  // phase 15 July 2019 — and inside it there is no maximum, 15% fund earnings tax and no transfer
  // balance credit. One `conditionOfRelease` result cannot answer both questions and is not read
  // here as answering both: phase is `superPhase.ts`'s. Register §3.10.6, traps T118 and T119.
  //
  // **A KNOWN GAP, recorded rather than closed — T118, and it is not detectable from these
  // inputs.** `conditionOfRelease` models two grounds; the "Nil" set is seven items. For every item
  // outside those two grounds — 102 (death), 104 (termination of employment with preserved
  // benefits under the threshold), 105(b), and any 101 or 103 route the grounds do not reach — the
  // gate returns `met: false` and this function goes on to report a 10% ceiling **that does not
  // legally exist**. The direction is conservative: it caps income that is not capped, so the
  // Person is understated and never flattered. It is still wrong, and nothing given to this
  // function could reveal it — the items are facts about the Person that never arrive here. Closing
  // it needs the **item set** as an input, which is input 5 of the seven the s 307-80 entry test
  // requires under ruling R7 (register §3.10.6) and is `superPhase.ts`'s queued work. The two
  // grounds cannot supply it: "ceasing gainful employment after Preservation Age" is item 101 under
  // SISR reg 6.01(7)(b)(i) (read 2026-09-29, O59 / U28 closed), but the items this gap is about are
  // the ones neither ground reaches.
  const releaseOn = endOfFinancialYear(fy);
  const release = conditionOfRelease({ dateOfBirth, on: releaseOn, gainfulEmployment: input.gainfulEmployment });
  if (release.met) throw new TrisConversionNotModelledError(fy, releaseOn, release.grounds);

  const commencementYear = financialYearContaining(commencementDay);
  if (compareFinancialYears(commencementYear, fy) > 0) throw new TrisNotCommencedError(fy, commencementDay);
  const isCommencementYear = commencementYear === fy;

  // reg 6.01(2)(b)(ii)(A) and (B), stated in this file's own terms. Sch 7 cl 1(2)(a) happens to
  // name the same day and `minimumDrawdown` checks it independently; two provisions agreeing is
  // worth checking twice and worth never merging into one check.
  const relevantDay = isCommencementYear ? commencementDay : startOfFinancialYear(fy);
  const maximumBalance = trisAccountBalance(balance);
  if (maximumBalance.measuredAt !== relevantDay) {
    throw new TrisMaximumBalanceDateError(fy, relevantDay, maximumBalance.measuredAt, isCommencementYear);
  }

  const { amount: ceiling, exact } = unadjustedMaximum(maximumBalance);

  let maximumProvenance = provenanceOf(fy, CONSUMED);
  if (isCommencementYear && commencementDay !== startOfFinancialYear(fy)) {
    maximumProvenance = withCaveats(
      maximumProvenance,
      `the FY${fy} TTR maximum is the whole year's 10% for a stream that commenced on ` +
        `${commencementDay}: reg 6.01(2)(b)(ii) has no pro-rating, and Sch 7 cl 3 reaches only the ` +
        'minimum',
    );
  }
  if (!exact) {
    maximumProvenance = withCaveats(
      maximumProvenance,
      'the TTR maximum was truncated to the whole cent because it is a ceiling and a fractional ' +
        'cent may not be rounded up into a breach — a modelling choice, not a provision',
    );
  }

  const maximum: TtrMaximum = Object.freeze({
    fy,
    relevantDay,
    balance: maximumBalance,
    rate: MAXIMUM_RATE.value,
    amount: ceiling,
    exactInCents: exact,
    provenance: maximumProvenance,
  });

  const minimum = minimumDrawdown({
    fy,
    dateOfBirth,
    commencementDay,
    balance,
    commutedOrRolledOverDuringYear: input.commutedOrRolledOverDuringYear,
  });

  let provenance = mergeProvenance(minimum.provenance, maximum.provenance);
  if (minimum.nil) {
    // Read off the floor's own discriminant, so the 1 June date stays in the module that owns it.
    provenance = withCaveats(
      provenance,
      `FY${fy} requires no minimum payment at all under Sch 7 cl 4, and the maximum is unaffected ` +
        'by that clause: the whole 10% remains available',
    );
  }

  return Object.freeze({
    fy,
    commencementDay,
    isCommencementYear,
    relevantDay,
    release,
    minimum,
    maximum,
    floor: minimum.amount,
    ceiling,
    provenance,
  }) as TtrPaymentRange;
};
