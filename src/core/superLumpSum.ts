// P4-6's residual, closed by an ENTRY — the one place this model takes money OUT of superannuation
// other than an Account-Based Pension payment.
//
// **What was wrong before this file existed.** `accessibleWealth` in `projection.ts` says it in
// terms: *"released super is reachable in LAW and unspendable in THIS ENGINE … the flattering
// direction, and it is taken deliberately"*. No Waterfall limb draws an Accumulation Phase balance,
// so a Household can report `Unfunded shortfall` for months on end while holding a released super
// balance it could have withdrawn — and Shortfall Age, the tool's headline number, reports the date
// CASH runs out rather than the date MONEY runs out.
//
// **THERE ARE NOW TWO MECHANISMS, and the second one arrived on 2026-09-19 when the user re-opened
// the ruling that had left it out.** The entry came first and is unchanged: a household withdraws
// when it says it withdraws, at the amount it states, in the month it states it. What the entry
// could not close is the household that states nothing — it was still reported short beside money
// it could lawfully reach. So `releasedSuperannuationOffer` at the foot of this file feeds
// **Waterfall limb 5**, which is LAST, after the Offset Account: it fires only where salary, the
// pension minimum, the portfolio and the Offset are all exhausted, which is exactly the defect and
// nothing wider. The order and the reasoning for it live at `WATERFALL_LIMBS` in `projection.ts`,
// which is the single source of the order.
//
// **Both mechanisms go through the ONE gate** (`lumpSumGate`) and the one priced withdrawal
// (`superLumpSumWithdrawal`), so there is no second copy of the access rule and no second tax
// answer. They cannot double-draw: the entry is applied earlier in the tick and writes the balance
// back through `balances[personIndex].superInterestBalances[slot]`, which is the very array limb
// 5's offer is computed from, so the limb offers what is LEFT.
//
// **Everything this module refuses, and why each refusal beats the guess it replaces.**
//
//   * **Below the tax-free age, the withdrawal is REFUSED BY NAME** —
//     `LumpSumBelowTaxFreeAgeError`. Between preservation age and 60 a superannuation lump sum from
//     a taxed source is taxed on its **taxable component**, with the s 301-20(2) offset over the
//     s 307-345 low rate cap, and **this model holds no component split**: `SuperInterest` carries
//     a `phase` and a `balance` and nothing that says which part of it is taxable, and
//     `incomeBases.ts` carries `lowRateCapLumpSumComponent` as a Setting that is nil because *"lump
//     sums are not modelled"*. A guessed split would understate the tax and overstate the money the
//     household can spend — the flattering direction, and the failure ADR-0009 names.
//   * **A withdrawal out of an Account-Based Pension is PAID, and has been since 2026-09-23** (it
//     was refused by name before, as `LumpSumFromPensionInterestNotModelledError`). In law a
//     retirement-phase stream may pay any amount above its minimum and may be partially commuted,
//     so the withdrawal is honoured and the balance falls by what was paid. Two things it does NOT
//     do are stated on the month's `SuperWithdrawalNote` rather than hidden: it records no transfer
//     balance DEBIT (a commutation is a s 294-80(1) item 1 debit, and the walk records no transfer
//     balance credits either — O57), and it does not count toward the year's Sch 7 minimum, which
//     is still swept in June in full. The release gate is not asked of one: a stream in retirement
//     phase is itself the release, and limb 2 already pays the same balance without asking. The
//     tax age IS asked, exactly as for any other interest.
//   * **The condition of release is decided by `conditionOfRelease.ts` and re-derived nowhere.**
//     `requireBenefitAccess` is the gate, exactly as `superPhase.ts` uses it. The age test below is
//     a **tax** test and it can never stand in for that gate: it runs before it, both must pass,
//     and neither is expressed in terms of the other.
//
// **Nil tax at 60+ is an ASSERTED nil, not an absent thought.** `taxWithheld` is a field on the
// result, it is always present, and `taxNote` carries the reason and the register value it was read
// from. A reader can see that the engine considered the tax and concluded zero.
//
// ⚠️ **AND THE ASSUMPTION UNDER THAT NIL IS A TAXED SOURCE, WHICH IS RECORDED AND DISCLOSED.** §3.9
// states the treatment *"from a taxed source"*, and nothing in this model says which source a
// Person's interest is from — `SuperInterest` has no field for it. An **untaxed-source** element
// (in practice a legacy public-sector scheme) is taxed materially even after 60. The assumption is
// therefore stated in `taxNote`, carried into the month's `SuperWithdrawalNote` and shown on screen,
// on the same footing as the part-time-week gap: the direction of the error is named rather than
// hidden, and it is the flattering one for the household it does not fit.
import { ageAt, assertIsoDate } from './household.js'; // `.js` is correct in a `.ts` file — see tsconfig.json
import {
  CessationBeforePreservationAgeError,
  PreservedBenefitError,
  benefitAccess,
  conditionOfRelease,
  requireBenefitAccess,
} from './conditionOfRelease.js';
import type { GainfulEmployment } from './conditionOfRelease.js';
import type { SuperInterest } from './household.js';
import { subCents, toCents } from './money.js';
import type { Cents } from './money.js';
import { SUPERANNUATION } from '../data/assumptions/super.js';
import type { IsoDate } from '../data/assumptions/types.js';

const ACCESS = SUPERANNUATION.access;

/**
 * Module-private, like `conditionOfRelease.ts`'s two ages and for the same reason: an age that is
 * exported is an age a caller can write a comparison against. This one is a **tax** age — see the
 * record, which says in terms that it is not `preservationAge` wearing another name.
 */
const TAX_FREE_BENEFIT_AGE: number = ACCESS.benefitsFromATaxedSourceFromAge.value;

/** §3.9's own words for the treatment, read from the record so this file states no tax rule of its own. */
const TAXED_SOURCE_TREATMENT: string = ACCESS.benefitsFromATaxedSourceAt60.value;

// --- Refusals -----------------------------------------------------------------------------------

/**
 * A `LUMP_SUM_FROM_SUPER` whose owner has not reached the age at which a benefit from a taxed source
 * is tax-free. **A scope refusal on a missing FACT and a missing computation, not on a missing
 * rule:** Div 301 states the rule, and what is absent is the taxable/tax-free component split every
 * figure in it turns on.
 */
export class LumpSumBelowTaxFreeAgeError extends RangeError {
  constructor(personName: string, age: number, on: IsoDate) {
    super(
      `${personName} is ${age} on ${on}, and a superannuation lump sum below ${TAX_FREE_BENEFIT_AGE} ` +
        'is not modelled. Register §3.9 states the treatment from the age this refusal names — ' +
        `"${TAXED_SOURCE_TREATMENT}" — and states nothing below it, because below it the tax is ` +
        'computed on the TAXABLE COMPONENT of the benefit, with the ITAA 1997 s 301-20(2) offset up ' +
        'to the s 307-345 low rate cap and the ordinary rates above it. This model holds no ' +
        'component split at all: a `SuperInterest` is a phase and a balance, and ' +
        '`lowRateCapLumpSumComponent` is a Setting that is nil because lump sums are not computed. ' +
        'Guessing the split would understate the tax and hand the household money it does not have ' +
        '— the flattering direction. Refusing rather than guessing: wait until the age, or state ' +
        'the spending this withdrawal was to fund and let the shortfall show.',
    );
    this.name = 'LumpSumBelowTaxFreeAgeError';
  }
}

/**
 * **A transition to retirement income stream payment to a Person under the tax-free age** — the
 * stream-payment twin of `LumpSumBelowTaxFreeAgeError`, and refused for the same missing fact.
 * Below that age a superannuation income stream benefit is assessable on its TAXABLE COMPONENT, less
 * a tax offset (ITAA 1997 Div 301), and this model holds no component split. Preservation age is 60
 * for everyone born after 30 June 1964, so no lawful TTR holder in a forecast from 2026 is under 60:
 * this fires only for a Household that states one.
 */
export class TtrPaymentBelowTaxFreeAgeError extends RangeError {
  constructor(personName: string, age: number, on: IsoDate) {
    super(
      `${personName} is ${age} on ${on}, and a transition to retirement income stream payment below ` +
        `${TAX_FREE_BENEFIT_AGE} is not modelled. Register §3.9 states the treatment from the age this ` +
        `refusal names — "${TAXED_SOURCE_TREATMENT}" — and states nothing below it, because below it ` +
        'an income stream benefit is assessable on its TAXABLE COMPONENT, less a tax offset (ITAA 1997 ' +
        'Div 301). This model holds no component split: a `SuperInterest` is a phase and a balance. ' +
        'Paying it untaxed would hand the household money it does not have — the flattering ' +
        'direction. Preservation age is 60 for anyone born after 30 June 1964, so a TTR held below ' +
        'that age in this forecast is itself a statement to check: state the stream as commencing ' +
        'on or after the 60th birthday.',
    );
    this.name = 'TtrPaymentBelowTaxFreeAgeError';
  }
}

// --- The sentences that name a Person ------------------------------------------------------------
//
// Each is the ONE way its sentence is written, used here and by the chat connector's translation to
// Person A / Person B (`app/chat/tools/identity.ts`), which matches them WHOLE. The six claim notes
// are what limb 5's note is joined from (`releasedSuperannuationLimb`).

export const underTaxFreeAgeClaimNote = (name: string): string =>
  `${name} is under ${TAX_FREE_BENEFIT_AGE}, and a superannuation lump sum below that age is taxed on its TAXABLE COMPONENT — a split this model holds nowhere — so nothing is offered rather than offered untaxed`;
export const cessationBeforePreservationAgeClaimNote = (name: string): string =>
  `${name} ceased gainful employment before Preservation Age and has not reached the age that releases benefits by itself: register §3.9 and the SIS definition it cites disagree for exactly these years, conditionOfRelease refuses rather than choosing (CessationBeforePreservationAgeError), and nothing is offered on an undetermined release`;
export const ttrNotSweptClaimNote = (name: string, slot: string | number): string =>
  `${name}'s superannuation interest ${slot} is a transition-to-retirement income stream, and this limb does not sweep one: a TRIS has a MAXIMUM as well as a minimum (SISR reg 6.01(2)(b)(ii)) and an automatic draw to a spending target cannot honour a ceiling nobody stated. A stated LUMP_SUM_FROM_SUPER entry may still name it — the member characterises the act, the engine does not`;
export const accountBasedPensionNotSweptClaimNote = (name: string, slot: string | number): string =>
  `${name}'s superannuation interest ${slot} is an Account-Based Pension: a payment out of one is a pension payment or a partial commutation and not a lump sum out of accumulation (register §3.10, T81), and Waterfall limb 2 already offers its whole balance`;
export const releasedEmptyClaimNote = (name: string, slot: string | number): string =>
  `${name}'s superannuation interest ${slot} is released and EMPTY: the gate is open and there is nothing behind it`;
export const releasedClaimNote = (name: string, slot: string | number, age: string | number): string =>
  `${name}'s superannuation interest ${slot} is released — a Condition of Release is met and they are ${age} — so its WHOLE balance is offered, LAST, after the Offset Account. Tax on what is drawn is nil and assumes a TAXED SOURCE; the month's super withdrawal note carries that assumption in full`;

/** A withdrawal's `taxNote`: the `SuperWithdrawalNote`'s sentence. */
export const superWithdrawalTaxNote = (name: string, age: string | number, accountBasedPension: boolean): string =>
  `nil tax, and it is a computed nil: ${name} is ${age}, and register §3.9 states that ` +
  `benefits from a taxed source at ${TAX_FREE_BENEFIT_AGE}+ are "${TAXED_SOURCE_TREATMENT}". ` +
  TAXED_SOURCE_ASSUMPTION +
  (accountBasedPension ? ` ${ACCOUNT_BASED_PENSION_WITHDRAWAL_NOTE}` : '');

// --- The gate: ONE copy of the rule, read two ways ----------------------------------------------

/**
 * **May this interest be drawn on at all, and if not, why not** — the three questions
 * `superLumpSumWithdrawal` has always asked, in the order it has always asked them, lifted into one
 * function so that the automatic Waterfall limb (`releasedSuperannuationOffer` below) can ask the
 * SAME question without a second copy of the rule.
 *
 * ⚠️ **The two callers differ in what they DO with a closed gate, and in nothing else.** A stated
 * `LUMP_SUM_FROM_SUPER` is a thing the household asked for, so a refused one THROWS — the user is
 * told. An automatic limb is a thing the engine offered, so a closed gate makes the limb offer
 * NOTHING and say why in its note, and the month stays honestly short. Making the limb throw would
 * take the whole chart down for a household that never asked to withdraw; making the entry silent
 * would answer a stated request with a shrug. That is why the gate returns BOTH the refusal object
 * the entry path throws and the note the limb path reports, and neither caller composes its own.
 *
 * `CessationBeforePreservationAgeError` is `conditionOfRelease`'s and is caught rather than
 * re-derived: it fires for a Person who ceased gainful employment before Preservation Age and is
 * now in the 60–64 window, which is a state a `RETIRE` entry can put a walk into for a hundred
 * consecutive months. The entry path re-throws the very object, so its behaviour is unchanged.
 */
type LumpSumGate =
  | { readonly open: true; readonly age: number }
  | { readonly open: false; readonly age: number; readonly refusal: RangeError; readonly note: string };

const lumpSumGate = (input: {
  readonly personName: string;
  readonly dateOfBirth: IsoDate;
  readonly on: IsoDate;
  readonly gainfulEmployment: GainfulEmployment;
  readonly slot: number;
  readonly phase: SuperInterest['phase'];
  /** What the access gate is being asked about, in `requireBenefitAccess`'s own terms. */
  readonly purpose: string;
}): LumpSumGate => {
  const { personName, dateOfBirth, on, gainfulEmployment, slot, phase, purpose } = input;
  const age = ageAt(dateOfBirth, on);

  // **The TAX age, and it is not the release gate.** Written here rather than in
  // `conditionOfRelease.ts` because that module's whole defence is that it answers *may a benefit be
  // paid* from a stated condition and never from an age; this asks a different question — *what is
  // the benefit taxed at* — of a different record, and it is not permitted to answer the first.
  if (age < TAX_FREE_BENEFIT_AGE) {
    return {
      open: false,
      age,
      refusal: new LumpSumBelowTaxFreeAgeError(personName, age, on),
      note: underTaxFreeAgeClaimNote(personName),
    };
  }

  // **A retirement-phase stream is past the release gate by being in retirement phase** — it cannot
  // commence, and a TTR cannot convert into one, until a Nil-restriction condition is met. Asking
  // `conditionOfRelease` again here would refuse, as PRESERVED, a balance limb 2 is paying out in
  // full the same month. Only the entry path reaches this: limb 5 never offers an Account-Based
  // Pension (`releasedSuperannuationOffer`), because limb 2 already offers its whole balance.
  if (phase === 'accountBasedPension') return { open: true, age };

  let access;
  try {
    access = benefitAccess(conditionOfRelease({ dateOfBirth, on, gainfulEmployment }));
  } catch (refusal) {
    if (refusal instanceof CessationBeforePreservationAgeError) {
      return {
        open: false,
        age,
        refusal,
        note: cessationBeforePreservationAgeClaimNote(personName),
      };
    }
    throw refusal;
  }
  // The gate, unchanged and not re-derived. It throws `PreservedBenefitError`.
  try {
    requireBenefitAccess(access, purpose);
  } catch (refusal) {
    if (refusal instanceof PreservedBenefitError) {
      return { open: false, age, refusal, note: access.reason };
    }
    throw refusal;
  }

  return { open: true, age };
};

// --- The withdrawal -----------------------------------------------------------------------------

/** One withdrawal, priced: what was asked for, what the interest could pay, and the tax on it. */
export interface SuperWithdrawal {
  /** What the entry asked for. Reported beside `paid` so a capped withdrawal is visible as one. */
  readonly requested: Cents;
  /**
   * What is actually paid out — `min(requested, balance)`.
   *
   * ⚠️ **CAPPED AT THE BALANCE RATHER THAN REFUSED, and that is a decision** (2026-09-19). It
   * follows `NonSuperInvestmentSellParams.amount`'s precedent word for word — *"capped at what the
   * Person actually holds … a Person holding less sells what there is"* — and the ground is that
   * the balance at the entry's month is a figure **the user cannot know when they write the entry**:
   * it is forty years of this walk's own growth and drawdowns away. Refusing would throw out of
   * `project()` and take the whole chart with it for an entry that is a near miss, on a number the
   * author could not have got right. The cap is never silent: `requested` and `paid` are both
   * reported, the month carries a `SuperWithdrawalNote` saying which, and the shortfall that the
   * unpaid part does not fund still appears as an `Unfunded shortfall` line.
   */
  readonly paid: Cents;
  /** The balance that is left. Never negative: `paid` is capped at the balance it came out of. */
  readonly remaining: Cents;
  /**
   * **Nil, deliberately and always, on this path.** The age gate above is what makes it nil, and
   * the field exists so the nil is a thing the engine SAID rather than a thing it never thought
   * about. Every consumer reports it.
   */
  readonly taxWithheld: Cents;
  /** Why `taxWithheld` is nil, and the taxed-source assumption it rests on. */
  readonly taxNote: string;
}

/**
 * **One `LUMP_SUM_FROM_SUPER`, gated and priced.** Pure: it reads balances and dates and touches
 * nothing. The caller writes the money back through the one balance seam and emits the line.
 *
 * The order of the gates is load-bearing and is asserted:
 *
 *   1. the owner must have reached the tax-free age — a question about the TAX, and the only age
 *      comparison in this model that is not about release;
 *   2. a Condition of Release must be met — `requireBenefitAccess`, which throws
 *      `PreservedBenefitError`. **This gate is not implied by the one above it**: a 62-year-old who
 *      has never ceased gainful employment is past the tax age and their benefit is still preserved.
 *      It is NOT asked of an Account-Based Pension, whose retirement phase is itself the release.
 *
 * **`gainfulEmployment` is the CALLER's fact, and it is required.** The walk knows whether a
 * `RETIRE` entry has been applied for this Person and on what date, so this path can state the
 * cessation. The superseded clause here read *"unlike `accessibleWealth`, which can only honestly
 * say `{ ceased: false }`"*; since P4-11 (2026-09-19) `accessibleWealth` is handed the walk's
 * `gainfulEmploymentAsAt` too, and the three readers of that one expression — this, limb 5's
 * `releasedSuperannuationOffer`, and `accessibleWealth` — cannot disagree about a cessation. Where the
 * cessation was before preservation age and the Person is in the 60–64 window,
 * `CessationBeforePreservationAgeError` propagates from `conditionOfRelease`: that refusal is the
 * register's, it is not invented here, and it fires only for a Household that stated a withdrawal.
 */
export const superLumpSumWithdrawal = (input: {
  readonly personName: string;
  readonly dateOfBirth: IsoDate;
  readonly on: IsoDate;
  readonly gainfulEmployment: GainfulEmployment;
  readonly slot: number;
  readonly phase: SuperInterest['phase'];
  readonly balance: Cents;
  readonly requested: Cents;
}): SuperWithdrawal => {
  const { personName, dateOfBirth, on, gainfulEmployment, slot, phase, balance, requested } = input;
  assertIsoDate(dateOfBirth);
  assertIsoDate(on);
  if (!Number.isSafeInteger(balance) || balance < 0) {
    throw new RangeError(`not a balance in whole cents: ${balance}`);
  }
  if (!Number.isSafeInteger(requested) || requested <= 0) {
    throw new RangeError(`${personName} cannot withdraw ${requested} cents from superannuation: a lump sum is a whole number of cents and more than nothing`);
  }

  // **The three gates, in the order they have always run, and THEY ARE NOT WRITTEN HERE ANY MORE.**
  // `lumpSumGate` holds the one copy; this path throws what it hands back, so every refusal is the
  // same object with the same message it was before the automatic limb existed.
  const gate = lumpSumGate({
    personName,
    dateOfBirth,
    on,
    gainfulEmployment,
    slot,
    phase,
    purpose: `a superannuation lump sum of ${requested} cents for ${personName}`,
  });
  if (!gate.open) throw gate.refusal;
  const { age } = gate;

  const paid = Math.min(requested, balance) as Cents;
  return Object.freeze({
    requested,
    paid,
    remaining: subCents(balance, paid),
    taxWithheld: toCents(0),
    taxNote: superWithdrawalTaxNote(personName, age, phase === 'accountBasedPension'),
  });
};

/**
 * The taxed-source assumption under every nil this module asserts, in one place: the lump-sum
 * `taxNote` above and `TTR_PAYMENT_TAX_NOTE` below both end with it.
 */
const TAXED_SOURCE_ASSUMPTION =
  'A TAXED SOURCE IS ASSUMED — nothing in this model records which source an interest is from, ' +
  'and an untaxed-source element (in practice a legacy public-sector scheme) is taxed ' +
  'materially even at this age, so for such a household this figure is too low and the money ' +
  'shown is too high.';

/**
 * What a withdrawal out of an Account-Based Pension does NOT do in this model, said on the month's
 * `SuperWithdrawalNote` because nothing else on the screen could say it.
 */
const ACCOUNT_BASED_PENSION_WITHDRAWAL_NOTE =
  'This came out of an Account-Based Pension, which may pay any amount above its yearly minimum. ' +
  'If it is a partial commutation it is a transfer balance DEBIT (ITAA 1997 s 294-80(1) item 1), ' +
  'and that debit is NOT modelled: this forecast keeps no transfer balance account at all, because ' +
  'nothing in it records the credits either (register O57). It is also not counted toward the ' +
  "year's minimum payment, which is still paid in full in June.";

/**
 * **Why a transition to retirement income stream payment carries no tax line**, carried on the
 * payment line's own provenance. The age is not in it because it does not need to be: the walk
 * calls `requireTtrPaymentAge` before every payment, so a payment that exists was made at or above
 * the tax-free age.
 */
export const TTR_PAYMENT_TAX_NOTE =
  `Nil tax, and it is a computed nil: a TTR payment is made only to a Person aged ${TAX_FREE_BENEFIT_AGE} ` +
  'or over — a younger one is refused by name — and register §3.9 states that benefits from a taxed ' +
  `source at ${TAX_FREE_BENEFIT_AGE}+ are "${TAXED_SOURCE_TREATMENT}". ` +
  TAXED_SOURCE_ASSUMPTION;

/**
 * **The tax gate on one TTR payment**: throws `TtrPaymentBelowTaxFreeAgeError` below the tax-free
 * age. Only the TAX question — the stream exists, so release is not asked here.
 */
export const requireTtrPaymentAge = (input: {
  readonly personName: string;
  readonly dateOfBirth: IsoDate;
  readonly on: IsoDate;
}): void => {
  const age = ageAt(assertIsoDate(input.dateOfBirth), assertIsoDate(input.on));
  if (age < TAX_FREE_BENEFIT_AGE) throw new TtrPaymentBelowTaxFreeAgeError(input.personName, age, input.on);
};

// --- The automatic Waterfall limb's OFFER -------------------------------------------------------

/**
 * **What Waterfall limb 5 may offer out of ONE superannuation interest this month, and why that is
 * the figure** (2026-09-19, the user re-opening the ruling recorded at the top of this file).
 *
 * The defect it closes is the one `accessibleWealth`'s residual 2 has named since P4-6: a household
 * could report `Unfunded shortfall` for months on end beside a released balance it could lawfully
 * have withdrawn, so Shortfall Age reported the date CASH ran out rather than the date MONEY ran
 * out. The entry closed it for a household that STATES a withdrawal; this closes it for one that
 * does not.
 *
 * **It is the same gate, asked the other way** — `lumpSumGate`, one copy, and a closed gate here
 * offers nothing and says which gate closed rather than throwing. Below the tax-free age, or with
 * no Condition of Release met, THE LIMB OFFERS NOTHING AND THE MONTH STAYS SHORT. Widening the
 * access to make a number nicer is the one thing this file exists not to do.
 *
 * **A TTR interest is out, and that is NARROWER than the entry deliberately.** A stated
 * `LUMP_SUM_FROM_SUPER` may name one, because the member has characterised the act; a TRIS has a
 * MAXIMUM as well as a minimum (SISR reg 6.01(2)(b)(ii), P3-8) and an automatic sweep against a
 * spending target cannot honour a ceiling it was never given, which is `isAccountBasedPension`'s
 * own objection to drawing a TRIS through limb 2 — applying half of a two-sided rule. The direction
 * is the safe one: such a household is offered less than the law allows it, never more.
 *
 * Pure. It reads a balance and a date and touches nothing; the caller draws through
 * `superLumpSumWithdrawal` and writes back through the one balance seam.
 */
export interface ReleasedSuperOffer {
  /** The most limb 5 may draw out of this interest this month. Never negative. */
  readonly available: Cents;
  /** Why `available` is that figure — above all, which gate made it nil. */
  readonly note: string;
}

export const releasedSuperannuationOffer = (input: {
  readonly personName: string;
  readonly dateOfBirth: IsoDate;
  readonly on: IsoDate;
  readonly gainfulEmployment: GainfulEmployment;
  readonly slot: number;
  readonly phase: SuperInterest['phase'];
  readonly balance: Cents;
}): ReleasedSuperOffer => {
  const { personName, dateOfBirth, on, gainfulEmployment, slot, phase, balance } = input;
  assertIsoDate(dateOfBirth);
  assertIsoDate(on);
  if (!Number.isSafeInteger(balance) || balance < 0) {
    throw new RangeError(`not a balance in whole cents: ${balance}`);
  }

  if (phase === 'ttr') {
    return Object.freeze({
      available: toCents(0),
      note: ttrNotSweptClaimNote(personName, slot),
    });
  }

  if (phase === 'accountBasedPension') {
    return Object.freeze({
      available: toCents(0),
      note: accountBasedPensionNotSweptClaimNote(personName, slot),
    });
  }

  const gate = lumpSumGate({
    personName,
    dateOfBirth,
    on,
    gainfulEmployment,
    slot,
    phase,
    purpose: `an automatic Waterfall draw on ${personName}'s superannuation interest ${slot}`,
  });
  if (!gate.open) return Object.freeze({ available: toCents(0), note: gate.note });

  if (balance <= 0) {
    return Object.freeze({
      available: toCents(0),
      note: releasedEmptyClaimNote(personName, slot),
    });
  }

  return Object.freeze({
    available: balance,
    note: releasedClaimNote(personName, slot, gate.age),
  });
};
