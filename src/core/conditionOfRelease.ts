// P3-6 — the Condition of Release: a boolean per Person, independent of age. Register §3.9.
//
// **Age 60 does not release superannuation.** Preservation Age is 60 for everyone now, and
// reaching it releases nothing by itself; between 60 and 64 a Person needs an actual condition of
// release, and at 65 it happens regardless of anything they do. A model that infers access from
// age lets a forecast spend money that cannot lawfully be withdrawn, and the forecast looks
// entirely plausible while doing it — ADR-0009 puts it at its plainest: "retiring before a
// Condition of Release is essentially unfundable". So this boolean decides the answer, not a
// label on it, and everything about this module's shape is an attempt to make the wrong version
// of it unwriteable rather than merely wrong.
//
// **How age is kept from implying release.**
//
//   * `benefitAccess` — the only thing that answers "may a benefit be paid" — takes a
//     `ConditionOfRelease` and **nothing else**. No date of birth, no date, no number. "Pass me
//     the age and I'll tell you if super is accessible" is not a function that can be called here:
//     there is no parameter for the age to arrive through, so keying access off age alone is a
//     compile error at every call site rather than a wrong boolean at one of them.
//
//   * `ConditionOfRelease` is branded, so the only way to obtain one is `conditionOfRelease`,
//     whose `gainfulEmployment` argument is a **required discriminated union**. Omitting the
//     Person's employment facts does not default to anything; it does not compile.
//
//   * Neither age appears in this module's signatures or its exports. `preservationAge` and
//     `automaticReleaseAge` are read from `data/assumptions/super.ts` into two module-private
//     constants and are never re-exported, so no call site anywhere can write the comparison —
//     the absence is the enforcement, as it is for the home's market value in `household.ts`.
//
// The tension the register creates is real and is resolved rather than papered over: **the 65 rule
// genuinely does depend on age**, so an age comparison has to exist somewhere. It exists exactly
// once, on the `automaticReleaseAge` record, and it produces a *ground* — a named reason the
// condition is met — not the boolean directly. `met` is `grounds.length > 0`, so the two limbs are
// pushed independently and neither can be made to stand in for the other by editing one operator.
// Register §9's mutation for this domain is `metNilCashingCOR = (age >= 60)`; here that mutation
// has to be written inside a function whose result is checked at 62-still-working and at
// 65-never-worked, and it fails both.
//
// **What this module refuses.** A Person who ceased gainful employment *before* reaching
// Preservation Age, while they are between Preservation Age and 65. §3.9 states the ground
// affirmatively — "ceasing gainful employment after 60" — and says nothing about someone who
// stopped at 58 and is now 62. SISR reg 6.01(7)(b)(ii), read 2026-09-29, releases them at 60 if the
// trustee is reasonably satisfied they intend never again to be gainfully employed, full-time or
// part-time, and not otherwise; this model holds no such intention, so the answer turns on a fact it
// does not have. Before Preservation Age neither reading releases them, from 65 both do.
// `CessationBeforePreservationAgeError` fires in that window and nowhere else.
//
// **The Schedule 1 items, and how each ground maps onto one.** An earlier note here
// said that no SIS Regulation item numbers appear below, because §3.9's source line was "ITAA 1997
// · SIS Regulations · P0 research pass" and cited no item. That premise is spent: as of 2026-09-09
// §3.9's Condition of Release row carries SISR Schedule 1, Part 1 verbatim — items 101
// (Retirement), 102 (Death), 102A (Terminal medical condition), 103 (Permanent incapacity) and 106
// (Attaining age 65), each with column 3's "Nil" cashing restriction.
//
// "Turning 65" is **item 106**: that item states an age and nothing else. "Ceasing gainful
// employment after Preservation Age" is **item 101**, Retirement, under SISR **reg 6.01(7)(b)(i)**:
// an arrangement of gainful employment that ended on or after the Person's 60th birthday is a
// retirement with no further condition. Until 2026-09-29 that provision was unread (O59 / U28) and
// this mapping was refused by `ConditionOfReleaseItemNotIdentifiedError`; the refusal is gone
// because no case was left for it. The ground fires only for a cessation at or after Preservation
// Age, Preservation Age is 60, and the module refuses to load if it were ever below reg 6.01(7)(b)'s
// age — paragraph (a) and (b)(ii), the intention limbs, are never mapped. ITAA 1997 s 307-80(3)(b)
// turns on which item was satisfied, not on `met`. The item is not on the figure: a caller who does
// not ask for an item is not handed one.
import { ageAt, assertIsoDate } from './household.js'; // `.js` is correct in a `.ts` file — see tsconfig.json
import { financialYearContaining } from './financialYear.js';
import { provenanceOf } from './provenance.js';
import type { ComputedProvenance, Consumed } from './provenance.js';
import { SUPERANNUATION } from '../data/assumptions/super.js';
import type { Schedule1CashingItem } from '../data/assumptions/super.js';
import type { IsoDate } from '../data/assumptions/types.js';

const ACCESS = SUPERANNUATION.access;

/**
 * Module-private, and deliberately not exported. Exporting either of these would hand every future
 * call site the two operands of the mistake this file exists to prevent.
 */
const PRESERVATION_AGE: number = ACCESS.preservationAge.value;
const AUTOMATIC_RELEASE_AGE: number = ACCESS.automaticReleaseAge.value;

const CONSUMED: readonly Consumed[] = [
  ['superannuation.access.preservationAge', ACCESS.preservationAge],
  ['superannuation.access.conditionOfRelease', ACCESS.conditionOfRelease],
  ['superannuation.access.automaticReleaseAge', ACCESS.automaticReleaseAge],
];

/**
 * SISR Schedule 1, Part 1, and the one item this module may name. Read from the records for the
 * same reason the ages are: an item number written here is a figure re-declared in `core/`, and
 * `106` looks exactly as authoritative as `101` would.
 *
 * `retirementItemMapping` is **not** in `CONSUMED`: a `conditionOfRelease` result does not depend on
 * it, and `met` is the same boolean whichever item a ground is. It is consumed by the item-101
 * identification only.
 */
const SCHEDULE_1_ITEMS: readonly Schedule1CashingItem[] = ACCESS.conditionOfReleaseItems.value;
const AUTOMATIC_RELEASE_ITEM: string = ACCESS.automaticReleaseAgeItem.value;
const RETIREMENT_ITEM: string = ACCESS.retirementItemMapping.value.item;

/**
 * reg 6.01(7)(b)(i) maps a cessation to item 101 only for a Person who had attained 60 when it
 * happened. The employment ground fires for a cessation at or after Preservation Age, so the two
 * coincide only while Preservation Age is not below that 60. Were it lower, a cessation between the
 * two ages would be a retirement only under reg 6.01(7)(a), which needs the trustee satisfied of an
 * intention never to work again — a fact this model does not hold. Refuse to load rather than map it.
 */
if (PRESERVATION_AGE < ACCESS.retirementItemMapping.value.ageAtCessation) {
  throw new RangeError(
    `superannuation.access.preservationAge is ${PRESERVATION_AGE}, below the ` +
      `${ACCESS.retirementItemMapping.value.ageAtCessation} of SISR reg 6.01(7)(b)(i). A cessation ` +
      'between the two ages is a retirement only under reg 6.01(7)(a), which needs an intention ' +
      'never again to be gainfully employed that this model does not hold, so the employment ground ' +
      'can no longer be stated as Schedule 1 item 101.',
  );
}

const ITEM_CONSUMED: Readonly<Record<ReleaseGround, readonly Consumed[]>> = {
  'ceasing gainful employment after Preservation Age': [
    ['superannuation.access.conditionOfReleaseItems', ACCESS.conditionOfReleaseItems],
    ['superannuation.access.retirementItemMapping', ACCESS.retirementItemMapping],
  ],
  'turning the age that releases benefits by itself': [
    ['superannuation.access.conditionOfReleaseItems', ACCESS.conditionOfReleaseItems],
    ['superannuation.access.automaticReleaseAgeItem', ACCESS.automaticReleaseAgeItem],
  ],
};

// --- Refusals -----------------------------------------------------------------------------------

export class CessationBeforePreservationAgeError extends RangeError {
  constructor(ceasedOn: IsoDate, on: IsoDate) {
    super(
      `whether a Person who ceased gainful employment on ${ceasedOn}, before reaching Preservation ` +
        `Age, has met a Condition of Release on ${on} is not determined by register §3.9. §3.9 ` +
        'states the ground as "ceasing gainful employment after 60", which this Person did not do, ' +
        'and they have not yet reached the age that releases benefits by itself — so on the ' +
        "register's words they are not released, while under SISR reg 6.01(7)(b)(ii) they are " +
        'retired at 60 if the trustee is reasonably satisfied they intend never again to be ' +
        'gainfully employed, full-time or part-time — a fact this model does not hold. The answer ' +
        'differs for these years and only for these years: before Preservation Age neither says ' +
        'released, and from the automatic release age both do. Refusing rather than choosing. State ' +
        'the cessation that happened after Preservation Age if there was one.',
    );
    this.name = 'CessationBeforePreservationAgeError';
  }
}

export class PreservedBenefitError extends RangeError {
  constructor(purpose: string, on: IsoDate, reason: string) {
    super(
      `${purpose} cannot be paid out of superannuation on ${on}: ${reason}. Register §3.9 makes ` +
        'the Condition of Release a boolean per Person that is independent of age — reaching ' +
        'Preservation Age satisfies nothing by itself. A forecast that draws on a preserved ' +
        'benefit is spending money that cannot lawfully be withdrawn, which is the one mistake ' +
        'this check exists for (ADR-0009: retiring before a Condition of Release is essentially ' +
        'unfundable).',
    );
    this.name = 'PreservedBenefitError';
  }
}

// --- The Person's employment facts, stated and never inferred -----------------------------------

/**
 * What the Person did, not how old they are. A discriminated union with a required tag, so there
 * is no shape of this argument that can be omitted or left to default: a caller who does not know
 * the Person's employment history cannot obtain a `ConditionOfRelease` at all.
 */
export type GainfulEmployment =
  | { readonly ceased: false }
  | { readonly ceased: true; readonly ceasedOn: IsoDate };

/** Neither of the two grounds is an age test on its own; the second one is, and says so. */
export type ReleaseGround =
  | 'ceasing gainful employment after Preservation Age'
  | 'turning the age that releases benefits by itself';

/**
 * The two ground strings, written once. `schedule1ItemFor` maps each to its own item, and a
 * comparison against a string that had drifted from the pushed value would silently swap which.
 */
const EMPLOYMENT_GROUND = 'ceasing gainful employment after Preservation Age' satisfies ReleaseGround;
const AUTOMATIC_RELEASE_GROUND = 'turning the age that releases benefits by itself' satisfies ReleaseGround;

declare const CONDITION_OF_RELEASE: unique symbol;

export interface ConditionOfReleaseFigure {
  /** The date the boolean is asserted for. It is a boolean *on a date*, not a permanent property. */
  readonly on: IsoDate;
  /**
   * Register §9's `metNilCashingCOR`. True where at least one ground is made out — never computed
   * from an age directly, and never true merely because Preservation Age has been reached.
   */
  readonly met: boolean;
  /** Every ground made out, in the order §3.9 lists them. Empty exactly when `met` is false. */
  readonly grounds: readonly ReleaseGround[];
  /** §3.9's own words for the rule, read from the record so this cannot drift from the register. */
  readonly rule: string;
  readonly provenance: ComputedProvenance;
}

/**
 * Branded, and the brand is the whole defence. `benefitAccess` takes one of these and takes
 * nothing else, so the only route from a Person to "may they draw on super" runs through
 * `conditionOfRelease`, which cannot be called without the employment facts. A number is not
 * assignable here, and neither is a plain object literal built by a caller who decided that 60
 * was enough.
 *
 * Note what is *absent* from the figure: the Person's age. Nothing downstream can read one off a
 * result, so nothing downstream can second-guess the boolean with one.
 *
 * **Nominal, not structural — P3-41.** The brand is a `private` member of a type-only class, so a
 * spread of a real result cannot carry it: `{ ...unmet, met: true }` is TS2741, not a
 * `ConditionOfRelease`. Nothing exists at runtime; the value is still a plain frozen record.
 */
declare class ConditionOfReleaseWitness { private readonly [CONDITION_OF_RELEASE]: true }

export type ConditionOfRelease = ConditionOfReleaseFigure & ConditionOfReleaseWitness;

/**
 * Register §3.9 — the Condition of Release for a Person on a date.
 *
 * The two grounds are pushed independently, and `met` is whether either fired. Preservation Age is
 * used for one thing only: deciding whether a cessation of gainful employment *counts*. It is
 * never compared against the Person's age on `on`, because that comparison is the mutation.
 */
export const conditionOfRelease = (input: {
  readonly dateOfBirth: IsoDate;
  readonly on: IsoDate;
  /** Required, not defaulted. `{ ceased: false }` is a statement about the Person, not an absence. */
  readonly gainfulEmployment: GainfulEmployment;
}): ConditionOfRelease => {
  const { dateOfBirth, on, gainfulEmployment } = input;
  assertIsoDate(dateOfBirth);
  assertIsoDate(on);
  if (on < dateOfBirth) throw new RangeError(`${on} is before ${dateOfBirth}: a Person has no condition of release before they are born`);

  const grounds: ReleaseGround[] = [];

  if (gainfulEmployment.ceased) {
    const { ceasedOn } = gainfulEmployment;
    assertIsoDate(ceasedOn);
    if (ceasedOn > on) {
      throw new RangeError(
        `gainful employment is stated as ceasing on ${ceasedOn}, which is after ${on} — the date ` +
          'the Condition of Release is being asserted for. A cessation that has not happened yet ' +
          'releases nothing.',
      );
    }
    if (ageAt(dateOfBirth, ceasedOn) >= PRESERVATION_AGE) {
      grounds.push(EMPLOYMENT_GROUND);
    } else {
      // The one window where §3.9 and the SIS definition it cites disagree, and it is bounded on
      // both sides: below Preservation Age neither reading releases the Person, and from the
      // automatic release age both do. Refusing outside those bounds would be refusing a case the
      // register answers, so the window is written out rather than approximated from one end.
      const ageNow = ageAt(dateOfBirth, on);
      if (ageNow >= PRESERVATION_AGE && ageNow < AUTOMATIC_RELEASE_AGE) {
        throw new CessationBeforePreservationAgeError(ceasedOn, on);
      }
    }
  }

  // The 65 limb, and the only age comparison in this file that can make `met` true. It reads its
  // age off the record; a literal here would be the register-not-consumed mutation.
  if (ageAt(dateOfBirth, on) >= AUTOMATIC_RELEASE_AGE) {
    grounds.push(AUTOMATIC_RELEASE_GROUND);
  }

  return Object.freeze({
    on,
    met: grounds.length > 0,
    grounds: Object.freeze([...grounds]),
    rule: ACCESS.conditionOfRelease.value,
    provenance: provenanceOf(financialYearContaining(on), CONSUMED),
  }) as ConditionOfRelease;
};

// --- The Schedule 1 item ------------------------------------------------------------------------

/**
 * Which item of SISR Schedule 1, Part 1 a ground *is*, with the instrument's own column 2 and
 * column 3 alongside it. Column 3 is the load-bearing one: "Nil" is what makes these the
 * nil-cashing set that reg 6.01(2)'s "unless" limb turns the TTR ceiling off for.
 */
export interface Schedule1ItemIdentification {
  readonly on: IsoDate;
  readonly ground: ReleaseGround;
  /** Column 1. A string, because `102A` is not a number. */
  readonly item: string;
  /** Column 2, the instrument's own description of the condition. */
  readonly condition: string;
  /** Column 3. `Nil` is the instrument's word, not a zero. */
  readonly cashingRestriction: string;
  readonly provenance: ComputedProvenance;
}

/**
 * **Additive, and deliberately off to one side.** Nothing already in this module calls it, the item
 * is not a field on `ConditionOfRelease`, and every existing consumer — `ttrPaymentRange`,
 * `superPhase`, `superFranking` — is untouched by its existence. A caller who does not need to know
 * which item was satisfied cannot be made to answer for one, which is the only way a refusal this
 * narrow can be added without it becoming a refusal of the boolean.
 *
 * Asked for a ground the Person did not make out, it throws a plain `RangeError`: that is a caller
 * error about *this* Person, and no Schedule 1 item was satisfied.
 */
export const schedule1ItemFor = (
  release: ConditionOfRelease,
  ground: ReleaseGround,
): Schedule1ItemIdentification => {
  if (!release.grounds.includes(ground)) {
    throw new RangeError(
      `"${ground}" is not a ground this Person made out on ${release.on} — ` +
        (release.grounds.length === 0
          ? 'no Condition of Release is met at all, so no Schedule 1 item was satisfied'
          : `the grounds made out are: ${release.grounds.join('; ')}`) +
        '. A Schedule 1 item is what a satisfied condition IS, so there is nothing to identify here.',
    );
  }
  // Each ground names its own record, so neither item can be reached by falling through the other.
  const [record, wanted] =
    ground === EMPLOYMENT_GROUND
      ? ['superannuation.access.retirementItemMapping', RETIREMENT_ITEM]
      : ['superannuation.access.automaticReleaseAgeItem', AUTOMATIC_RELEASE_ITEM];
  const row = SCHEDULE_1_ITEMS.find((candidate) => candidate.item === wanted);
  if (row === undefined) {
    throw new RangeError(
      `${record} is "${wanted}", which is not an item of the Schedule 1 table in ` +
        'superannuation.access.conditionOfReleaseItems. The two records have drifted apart and ' +
        'neither can be trusted until they agree.',
    );
  }

  return Object.freeze({
    on: release.on,
    ground,
    item: row.item,
    condition: row.condition,
    cashingRestriction: row.cashingRestriction,
    provenance: provenanceOf(financialYearContaining(release.on), ITEM_CONSUMED[ground]),
  });
};

// --- The gate — the only question the rest of the model may ask -------------------------------

export interface BenefitAccess {
  readonly on: IsoDate;
  readonly release: ConditionOfRelease;
  /** Whether a benefit may be paid out of superannuation at all on this date. */
  readonly accessible: boolean;
  /** Why, in §3.9's terms — carried to P5 auditability so a blocked forecast can explain itself. */
  readonly reason: string;
  readonly provenance: ComputedProvenance;
}

/**
 * **One parameter, and it is not an age.**
 *
 * This is the signature that makes the trap unwriteable. Keying access off age alone would mean
 * giving this function an age to key off, which means adding a parameter, which breaks every call
 * site — the mutation does not produce a wrong answer, it produces a compile error.
 */
export const benefitAccess = (release: ConditionOfRelease): BenefitAccess =>
  Object.freeze({
    on: release.on,
    release,
    accessible: release.met,
    reason: release.met
      ? `a Condition of Release is met: ${release.grounds.join('; ')}`
      : 'no Condition of Release is met — the benefit is preserved, whatever the Person\'s age',
    provenance: release.provenance,
  });

/**
 * The single call site a projection engine goes through before drawing on superannuation. It
 * throws rather than returning false, because the failure this is here to stop is a forecast that
 * quietly continues with money it may not have.
 */
export const requireBenefitAccess = (access: BenefitAccess, purpose: string): void => {
  if (!access.accessible) throw new PreservedBenefitError(purpose, access.on, access.reason);
};
