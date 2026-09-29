// P3-8's conversion limb — the EARLY override, and the one file in this build that is allowed to
// convert a TTR interest to Retirement Phase WITHOUT going anywhere near O65.
//
// **What this file is for.** `TRIS_EARLY_CONVERSION` (`plan.ts`) lets a household state that a
// named Person's transition-to-retirement interest converted to a full account-based pension on a
// specific day, before that Person's 65th birthday. `parsePlan.ts`'s `checkTrisEarlyConversionTargets`
// has already done everything a DOOR can do with facts about the Household: it has confirmed the
// named interest is stated as `phase: 'ttr'` and that the entry's `date` is strictly before the
// Person's 65th birthday. What the door cannot supply is a `ConditionOfRelease` — that is a
// computed fact, built from a date of birth and the Person's employment history
// (`conditionOfRelease.ts`), and it is the walk that will hold both when it is built, not the
// door. This module is the one call this future walk makes once it has that fact in hand: turn a
// met Condition of Release, asserted for the stated day, into the converted interest.
//
// **This is deliberately NOT `trisInterestOrRefuse`, and it does not resolve O65.**
// `trisInterest.ts`'s whole design is a routing decision over a Person's `ConditionOfRelease.
// grounds`, made necessary because a SILENT household's conversion day has to be *derived* — either
// from a notification (the 101/102A/103 route) or from R13's automatic-65 backstop
// (`trisConversionDay.ts`) — and deriving a day for a Person who satisfies two different release
// grounds at different times is exactly the open question (O65) that routing exists to sidestep
// rather than answer. **A user who states their own early conversion day has made that routing
// decision themselves.** They are not asking this build to infer which ground applied or when; they
// are asserting a fact about their own super fund. So this function asks nothing about grounds at
// all: it takes the day as given, checks it against nothing but the `ConditionOfRelease` it was
// handed, and converts. `.grounds` is never read here, and `trisInterestOrRefuse` and
// `trisConversionDayUnderItem106` are never imported — pinned by
// `test/core-tris-early-conversion.test.mjs`'s source tripwire, on `test/core-individual-franking.
// test.mjs`'s import-count pattern.
//
// **Why a module of its own, beside `trisInterest.ts` and not inside it.** `trisInterest.ts`'s own
// header says its whole content is "the choice of constructor" over a Condition of Release's
// grounds, and folding an early, grounds-blind override into that file would put a second, opposite
// design decision in the one place that is supposed to hold only the first. Keeping them apart is
// what makes the sidestep verifiable: a reader — or a test — can confirm this file never imports the
// grounds-routing machinery at all, which would not be checkable if the two lived in one module.
//
// **What this function does NOT do.** It does not check the 65th-birthday boundary — that is
// `checkTrisEarlyConversionTargets`'s job, against the Household, before a `ConditionOfRelease` for
// the day even exists. It does not derive a `ConditionOfRelease` from a date of birth — that is
// `conditionOfRelease.ts`'s job. It does not decide whether the Condition of Release is MET — that
// is `retirementPhaseInterest`'s own gate (`requireBenefitAccess`), which this function goes
// through rather than around, so a stated early day for a Person whose benefit is still preserved
// still refuses exactly as it would refuse anywhere else in this codebase.
import { retirementPhaseInterest } from './superPhase.js'; // `.js` is correct in a `.ts` file — see tsconfig.json
import type { DeclaredRecipient, RetirementPhaseInterest } from './superPhase.js';
import type { ConditionOfRelease } from './conditionOfRelease.js';
import type { IsoDate } from '../data/assumptions/types.js';

/**
 * **Converts a TTR interest to Retirement Phase on the stated EARLY day** — the pure half of
 * `TRIS_EARLY_CONVERSION` (P3-8's conversion limb, ruled and re-ruled by the user 2026-09-22).
 *
 * `release` must be asserted FOR the stated day: a `ConditionOfRelease` already carries its own
 * `on`, and this function refuses rather than guesses which of the two days is the real one if
 * they disagree, on `trisConversionDay.ts`'s own precedent for two facts that cannot both be true.
 * Everything else — whether the condition is actually MET, and whether the recipient is a
 * reversionary beneficiary or under a commutation authority — is `retirementPhaseInterest`'s own
 * gate, unchanged: this function is a thin door in front of it and mints nothing itself.
 */
export const trisEarlyConversion = (
  release: ConditionOfRelease,
  statedConversionDay: IsoDate,
  declared?: DeclaredRecipient,
): RetirementPhaseInterest => {
  if (release.on !== statedConversionDay) {
    throw new RangeError(
      `the Condition of Release supplied is asserted for ${release.on}, and the stated early ` +
        `conversion day is ${statedConversionDay}. This function converts a stream on the day the ` +
        'Condition of Release is FOR, and asking it to convert on a different day than the one ' +
        'the release fact was computed for would be answering a question about a day nobody has ' +
        'checked employment or age against. Compute the Condition of Release for ' +
        `${statedConversionDay} itself, and call this function with that`,
    );
  }
  return retirementPhaseInterest(release, declared);
};
