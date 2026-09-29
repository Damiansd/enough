// P6-10 M2 — **WHICH INTEREST A DIVISION 293 RELEASE AUTHORITY IS SERVED ON, or the fact that
// there is no election at all** (register O84, user ruling 2026-09-20).
//
// ITAA 1997 Subdiv 293-B lets an individual assessed for the Division 293 tax give the Commissioner
// a release authority, so the liability is taken out of a superannuation interest instead of their
// own cash. `SuperInterest.statedReleaseAuthorityDestination` (M1) carries that election. This
// module is the one place that reads it and turns a `Person` into an answer.
//
// **⚠️ THE ONE RULE THIS MODULE EXISTS TO HOLD: SILENCE IS NEVER "DERIVE IT".** `projection.ts`'s
// `superGuaranteeDestination` is this function's shape and its sibling, and it DIVERGES here, in
// the one way that matters. For the Guarantee, a Person who nominates nothing and holds exactly one
// accumulation interest resolves BY DERIVATION: the employer pays somewhere, there is one
// candidate, and naming it would be ceremony. Here there is no "somewhere". The statutory default
// is not an unnamed account — it is NO RELEASE AT ALL (s 293-65 makes the individual liable, and
// Subdiv 293-B is a thing they may choose to do). So a silent Person has not omitted an account;
// they have declined an election, and resolving "the sole accumulation interest" out of their
// silence would invent a choice they never made. That is not a guess in the shape of a derivation,
// it is O84 RE-OPENED IN THE OPPOSITE DIRECTION: the charge moved out of super for a Person who
// would really have paid it in cash, understating the super that is means-test exempt below Age
// Pension age and overstating the Offset cash that is deemed from the first dollar.
//
// **There is therefore no fallback anywhere below, and no `??` beside the field.** The absence of
// an election is a RESULT — `{ election: 'none' }` — and not an error, not `undefined`, and not an
// interest.
//
// **WHY THE RESULT IS A DISCRIMINATED UNION and not `{ slot, interest } | undefined`.** The two
// answers this function can give are "nobody elected, take the charge from cash" and "this exact
// interest is debited", and they must be impossible to confuse at a call site, because confusing
// them moves money out of the wrong pocket in silence. An optional result invites `dest?.interest`,
// `dest ?? somethingElse` and a truthiness test, each of which reads "no election" as "no answer
// yet" — the exact conflation the rule above forbids. A union tagged by `election` cannot be read
// at all without naming which case is being handled: `result.interest` on the un-narrowed union is
// a compile error (TS2339, pinned in this module's suite), because the `'none'` member does not
// declare the property in any form — not even as `?: never`, which would hand a careless caller
// back a `SuperInterest | undefined` to fumble.
//
// **THE TWO ILLEGAL SHAPES ARE REFUSED HERE AS WELL AS AT THE DOOR, on the SG precedent
// (O81).** `parsePlan.ts`'s `checkReleaseAuthorityDestinations` already refuses both, but a
// door-only check is unreachable for a caller who builds a `Household` in memory and calls
// `project()` — which is every fixture in this suite and the demo page itself. That finding (O81)
// is why `superGuaranteeDestination` mirrors its own door refusals in the walk, and this function
// follows it: the refusals are cheap, the two implementations state the same rule on the same
// grounds, and the alternative is a resolver that silently picks one of two nominated funds for
// exactly the callers who never passed through the door.
//
// A `RangeError` and not a named class, again on `superGuaranteeDestination`'s precedent: nothing
// about the law is left unanswered here, the message names the Person, the position and the fix,
// and a named class in this build is for a figure it cannot state.
import type { Person, SuperInterest } from './household.js'; // `.js` is correct in a `.ts` file — see tsconfig.json

/**
 * **NO ELECTION — the statutory default, and the state of every plan file written before
 * 2026-09-20.** It carries no `slot` and no `interest`, in any spelling, so a caller cannot read a
 * destination off it by accident. `reason` is the sentence M3 reports when it takes the charge out
 * of cash: the absence of an election is a decision, and a decision that moved money gets said out
 * loud rather than being implied by a missing field.
 */
export interface NoDivision293ReleaseElection {
  readonly election: 'none';
  readonly reason: string;
}

/** **AN ELECTION** — this Person's `superInterests[slot]`, which is the interest the release authority is served on. */
export interface Division293ReleaseElection {
  readonly election: 'released';
  /** The position in `person.superInterests`, so the walk debits the interest it resolved rather than one that looks like it. */
  readonly slot: number;
  /** The interest itself, by identity — the same object, never a copy. */
  readonly interest: SuperInterest;
}

/**
 * The two answers, and there is no third: a Person either elected or did not. The illegal shapes
 * are not members here — they throw — because a result kind for "two funds claim it" would be a
 * value a caller could ignore.
 */
export type Division293ReleaseDestination = NoDivision293ReleaseElection | Division293ReleaseElection;

/**
 * **A Person → where their Division 293 charge comes out of.** Pure, and the only reader of
 * `SuperInterest.statedReleaseAuthorityDestination` in the walk.
 *
 *   * No interest marked — including a Person who holds no interests at all — is `{ election:
 *     'none' }`. **Never the sole accumulation interest**; see the rule at the top of this file.
 *   * Exactly one accumulation interest marked is `{ election: 'released', slot, interest }`.
 *   * A mark on a retirement-phase interest REFUSES: a release paid out of an account-based pension
 *     or a transition-to-retirement stream is a COMMUTATION — it debits the transfer balance
 *     account, changes the pension being paid and changes the Schedule 7 minimum drawn from it —
 *     and this build has no path that commutes.
 *   * Two interests of one Person marked REFUSES: a release authority is served on one interest,
 *     and the alternative to refusing is this build choosing which of their funds is raided.
 */
export const division293ReleaseDestination = (person: Person): Division293ReleaseDestination => {
  const elected = person.superInterests
    .map((interest, slot) => ({ interest, slot }))
    .filter(({ interest }) => interest.statedReleaseAuthorityDestination === 'division293');
  const howToFix =
    'state `statedReleaseAuthorityDestination: "division293"` on exactly one accumulation ' +
    "interest in that Person's `superInterests`";
  if (elected.length > 1) {
    throw new RangeError(
      `${person.name} states the Division 293 release authority destination on ${elected.length} superannuation interests — positions ${elected.map(({ slot }) => slot).join(', ')}. A release authority is served on ONE interest; two are two answers to a question with one answer, and the alternative to refusing is this build choosing which of their funds the charge is taken out of. ${howToFix}`,
    );
  }
  const claimed = elected[0];
  if (claimed === undefined) {
    // **THE DEFAULT, AND IT IS A FACT AND NOT A GAP.** Nothing is derived from this silence.
    return Object.freeze({
      election: 'none' as const,
      reason:
        `${person.name} has not elected to have a Division 293 liability released from superannuation (ITAA 1997 Subdiv 293-B), so the statutory default applies: the Commissioner assesses ${person.name} and the charge is paid out of their own cash. This is what silence MEANS — it is not an unstated account, and no interest of theirs is nominated by being their only one.`,
    });
  }
  if (claimed.interest.phase !== 'accumulation') {
    throw new RangeError(
      `${person.name} names superannuation interest ${claimed.slot} as the one a Division 293 release authority is served on, and it is in the ${claimed.interest.phase} phase. A release authority paid out of a retirement-phase stream is a COMMUTATION: it debits the transfer balance account, changes the pension being paid and changes the minimum drawn from it. This build has no path that commutes a stream, so it is refused rather than subtracted from an account no fund would have debited. ${howToFix}`,
    );
  }
  return Object.freeze({ election: 'released' as const, slot: claimed.slot, interest: claimed.interest });
};

/**
 * **THE FUND CANNOT PAY IT — and the law's answer to that is genuinely unknown to this build.**
 *
 * A release authority is served on the interest the Person nominated, for the amount the
 * Commissioner assessed. Where the interest does not hold that much, ITAA 1997 Subdiv 293-B and the
 * TAA 1953 Sch 1 Div 131 machinery around it allow things this model has no rule for: the fund pays
 * what it can and the balance stays with the individual; the individual gives a further release
 * authority to a SECOND fund; the authority is varied or the amount re-allocated. **None of that is
 * retrieved primary law here, so none of it is invented.** The release in this build is
 * ALL-OR-NOTHING out of the ONE nominated interest, and where that cannot be done it is refused BY
 * NAME rather than partially performed.
 *
 * ⚠️ **This is why it is a named class where M1's and M2's refusals are bare `RangeError`s, and the
 * distinction is the project's own.** Those two refuse shapes whose right answer is known and
 * stated in the message (name one interest; do not name a pension). This one refuses because the
 * LAW'S ANSWER IS NOT HELD — the fourth kind of refusal in the register's §3.5.1 taxonomy, a scope
 * refusal — and a scope refusal earns a register row so that the missing rule is recorded where
 * every other missing rule is recorded.
 *
 * **The direction of what it prevents, because a refusal that merely says "no" teaches nothing.**
 * The alternatives are both wrong and both flatter: debiting the interest into a NEGATIVE balance
 * invents money the fund does not hold, and debiting only what is there silently leaves the rest of
 * a real liability unpaid by anybody, so the Household keeps cash it owes the Commissioner.
 */
export class Division293ReleaseInsufficientBalanceError extends RangeError {
  override readonly name = 'Division293ReleaseInsufficientBalanceError';
}

/**
 * **The one throw site of the refusal above.** Called from `projection.ts` at the moment the
 * nominated interest is actually debited — after the month's growth and the month's contributions,
 * which is the balance the fund really holds when the authority is served — so the test is made
 * against the number that is about to move and not against an earlier reading of it.
 */
export const refuseReleaseAboveBalance = (details: {
  readonly person: Person;
  readonly slot: number;
  readonly fy: string;
  readonly balance: number;
  readonly amount: number;
}): void => {
  if (details.amount <= details.balance) return;
  throw new Division293ReleaseInsufficientBalanceError(
    `${details.person.name} elected under ITAA 1997 Subdiv 293-B to have the FY${details.fy} Division 293 liability of ${details.amount} cents released from superannuation interest ${details.slot}, and that interest holds ${details.balance} cents. The release in this model is ALL-OR-NOTHING out of the ONE nominated interest: a partial payment with the balance left against the individual, and a second release authority served on a second fund, are both things the law provides for and neither rule is retrieved in this build, so neither is invented here. Either nominate an interest that can meet the liability, or remove the election and let the charge be paid out of cash as the statutory default has it.`,
  );
};
