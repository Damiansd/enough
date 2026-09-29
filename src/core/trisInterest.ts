// P3-9 chunks 5b-4 and 5b-6 — **which door a TRIS goes through, and where the one route that has no
// door at all refuses.**
//
// Nothing is computed here and no phase is derived here. This file holds one routing decision over
// facts three other modules already produce, and its whole content is the choice of constructor:
//
//   1. the condition is **not** met            -> `transitionToRetirementInterest`, unchanged;
//   2. met, and the grounds are **exactly** the automatic-release ground, and R13's day resolves
//                                              -> `retirementPhaseInterest`, a real converted stream;
//   2b. met, the employment ground without the automatic-release one, a STATED Schedule 1 item of
//       101, 102A or 103, and no stated notification day
//                                              -> `TrisNotificationNotStatedError` (5b-6);
//   3. anything else                           -> `transitionToRetirementInterest`, which refuses
//                                                 exactly as it refuses today.
//
// **This is the item-106 half of the narrowing §3.10.8 asks for, and it is done WITHOUT touching
// the refusal.** The register's instruction is *"Narrow, do not widen, the existing refusal …
// `TrisRetirementPhaseNotModelledError` currently fires for every Person with `release.met ===
// true` … but the narrowing presupposes the overlap case of O65 and R5's stated conversion day, so
// it must be done with both in hand."* Both are in hand — O65 is documented (§3.10.6) and R5's day
// resolution is `trisConversionDayUnderItem106` (chunk 5b-3) — and the narrowing is done by giving
// the item-106 Person **a different door**, not by deleting a throw. `transitionToRetirementInterest`
// still refuses every Person it refused yesterday, including every Person who calls it directly, and
// its return type is still pinned to `AccumulationInterest`, which is what makes "a TRIS in
// Retirement Phase" unwriteable there. A narrowing that removed the throw would have removed that
// pin with it.
//
// **O65 is NOT resolved here, and the fall-through is the non-resolution.** §3.10.6: a member who
// retired at 62 on item 101, never notified, and then turns 65 satisfies s 307-80(3)(b)(ii) *on its
// own terms*, so on the bare statutory text the stream never converts, while the ATO's reading (which
// the register implements) converts it on the birthday. `ConditionOfRelease.grounds` can carry both
// grounds at once for exactly that Person. Limb 2 below therefore demands the automatic-release
// ground **alone**, not merely its presence: a Person carrying both falls to limb 3 and meets the
// refusal that has always met them. Picking either side of O65 would be a finding, and this file
// makes no findings. **Limb 2b does not resolve it either**: it fires only where the automatic-release
// ground is ABSENT, so the retired-at-62-then-turned-65 Person carries both grounds, fails limb 2b's
// exclusion as well as limb 2's `length === 1`, and keeps landing on limb 3 untouched.
//
// **The 101/102A/103 route is no longer untouched — P3-9 chunk 5b-6, 2026-09-16, added limb 2b.**
// Its conversion day is the day the provider was notified (s 307-80(3)(b)(ii); LCR 2016/9
// Example 1B), which nothing here can derive, and `TrisNotificationNotStatedError` was registered
// on 2026-09-15 with **no throw site**. It has one now, and it is the only throw in this file:
//
//   2b. met, the **employment** ground **without** the automatic-release one, a stated Schedule 1
//       item of **101, 102A or 103**, and **no** stated notification day
//                                              -> `TrisNotificationNotStatedError`, the named scope
//                                                 refusal on the missing FACT.
//
// **What limb 2b does NOT do, said here rather than left to be discovered.** A Person on that route
// who HAS stated a notification day still has nowhere to land: no converted-101/102A/103 interest
// constructor exists anywhere in `src/`, because building one means giving `retirementPhaseInterest`
// a conversion day that is the notification day and then crediting it, and neither the day nor the
// credit has a caller. That Person therefore falls through to limb 3 and gets
// `TrisRetirementPhaseNotModelledError`, exactly as they did yesterday — the generic refusal, not
// the specific one, which is a worse message for a Person who answered the question. It is the same
// honestly-scoped gap as 5b-5's uncalled credit and it is recorded, not papered over.
//
// **Nor does limb 2b widen to a Person who stated no item at all.** The trigger reads the
// user-**stated** `statedSchedule1Item` and never `schedule1ItemFor`. Since 2026-09-29 (LR-2, O59 /
// U28 closed) the derivation is verified — `schedule1ItemFor` answers item 101 for the employment
// ground under SISR reg 6.01(7)(b)(i) — but taking it here would move every retiree without a stated
// item from limb 3's refusal to limb 2b's, which is a routing decision LR-2 did not make. Nothing
// in the projection calls this function, so no figure turns on it either way. Reading the stated
// field directly is `trisConversionDay.ts`'s own precedent (5b-3).
//
// --- Why a module of its own, and not an extension of either neighbour --------------------------
//
// **Not `superPhase.ts`.** Limb 2 needs a date of birth, and that module's defence is that no age
// can arrive: `test/core-super-phase.test.mjs` greps its executable text for `ageAt`, `dateOfBirth`,
// `age`, `household.js`, `nthBirthday` and `birthday`, and pins all three constructors' parameter
// lists to exactly `(release, declared?)`. The routing could only live there by dismantling that.
//
// **Not `trisConversionDay.ts` either, which is the closer call.** That module is a *day* function:
// given a date of birth and the stated Settings it returns one `IsoDate`, and it depends on nothing
// in the phase model. Folding this in would make every consumer of the day — chunk 5b-5's transfer
// balance credit, most obviously — import the earnings-tax module and its refusals in order to ask
// what day a stream converted. It would also put interest construction inside the file whose throw
// census `test/core-tris-conversion-day.test.mjs` pins at exactly R13's three contradictions.
//
// So this follows `transferBalanceAccountSettings.ts`'s precedent, which is the closest thing in
// `core/` to what this is: the module that *chooses a door and refuses* sits **beside** the module
// it chooses from, not inside it, so that a caller who only wants the classification cannot trip a
// refusal by asking.
import { trisConversionDayUnderItem106 } from './trisConversionDay.js'; // `.js` is correct in a `.ts` file — see tsconfig.json
import {
  TrisNotificationNotStatedError,
  accumulationInterest,
  retirementPhaseInterest,
  transitionToRetirementInterest,
} from './superPhase.js';
import type { DeclaredRecipient, SuperInterest } from './superPhase.js';
import type { ConditionOfRelease, ReleaseGround } from './conditionOfRelease.js';
import type { StatedStreamSettings } from './household.js';
import type { IsoDate } from '../data/assumptions/types.js';

/**
 * The ground item 106 *is*. A third copy of the literal — `conditionOfRelease.ts` declares it
 * module-private and `trisConversionDay.ts` re-declares its own — and the copy is deliberate: the
 * alternative is exporting one module's private constant, which is the thing 5b-3 was told not to
 * do. `satisfies ReleaseGround` is what makes the copy safe against a typo, and
 * `test/core-tris-interest.test.mjs` reads both source files and asserts the two literals are the
 * same string, because the union has only two members and a drifted copy would silently equal the
 * *other* one — a compile-passing mistake that would route the employment ground into limb 2.
 */
const AUTOMATIC_RELEASE_GROUND = 'turning the age that releases benefits by itself' satisfies ReleaseGround;

/**
 * **Exactly the one ground, and `length === 1` is the whole of O65's non-resolution.** `.includes`
 * here would convert the retired-at-62-then-turned-65 Person the register expressly leaves open.
 */
const automaticReleaseAlone = (grounds: readonly ReleaseGround[]): boolean =>
  grounds.length === 1 && grounds[0] === AUTOMATIC_RELEASE_GROUND;

/**
 * The other member of the union, spelled as `conditionOfRelease.ts` spells it and checked against it
 * the same way. A fourth copy of a ground literal, and `test/core-tris-interest.test.mjs` compares
 * this one against the owning module's too — the union has two members, so a drifted copy would
 * silently equal the automatic-release one and fire the notification refusal at an item-106 Person,
 * which is trap T80 / T117 wearing a compile-clean face.
 */
const EMPLOYMENT_GROUND = 'ceasing gainful employment after Preservation Age' satisfies ReleaseGround;

/**
 * **The three items s 307-80(3)(b)(ii) enumerates, written as a literal set.** Not derived from the
 * Schedule 1 records in `data/assumptions/super.ts`: `test/core-condition-of-release.test.mjs` pins
 * all three of those record names as consumed in `conditionOfRelease.ts` **and nowhere else**, over
 * the whole text of every file under `src/`. And not derived from a `ReleaseGround` either — the
 * union has two members, so it cannot tell a terminal medical condition (102A) from a permanent
 * incapacity (103), while (3)(b)(ii) names all three and the refusal's message names all three.
 * The set is the enumeration, and a member added or dropped here changes which streams refuse.
 *
 * **106 is deliberately not in it** and must never be: item 106 is in (3)(b)(i)'s reference and not
 * in (3)(b)(ii)'s, so for a member who has turned 65 there is nothing left to notify (T80 / T117).
 */
const NOTIFICATION_ROUTE_ITEMS: readonly string[] = ['101', '102A', '103'];

/**
 * **Limb 2b's trigger: the notification route, with the notification unstated.** Three conjuncts and
 * every one of them is load-bearing.
 *
 *   * the **employment** ground, and the automatic-release ground **absent**. The exclusion is
 *     O65's non-resolution in this limb, as `automaticReleaseAlone`'s `length === 1` is in limb 2:
 *     a Person carrying both grounds is the overlap the register leaves open, and they must keep
 *     falling to limb 3 rather than being told a notification is missing;
 *   * a **stated** Schedule 1 item in the (3)(b)(ii) enumeration. Stated, never derived — see the
 *     header. Absent, nothing has identified an item and this limb does not derive one;
 *   * **no** stated notification day. Its presence is the fact this refusal says is missing, so its
 *     presence must stop the refusal.
 */
const notificationRouteWithTheFactUnstated = (
  grounds: readonly ReleaseGround[],
  stated: StatedStreamSettings | undefined,
): boolean => {
  if (!grounds.includes(EMPLOYMENT_GROUND)) return false;
  if (grounds.includes(AUTOMATIC_RELEASE_GROUND)) return false;
  const statedItem = stated?.statedSchedule1Item;
  if (statedItem === undefined || !NOTIFICATION_ROUTE_ITEMS.includes(statedItem.item)) return false;
  return stated?.statedNotificationDay === undefined;
};

/**
 * **The interest a TRIS is, given a date of birth, what the user stated about the stream, and the
 * Person's Condition of Release — or the refusal that has always been raised for it.**
 *
 * Named for what it does and not for the route it answers, because two of its three limbs answer
 * for no route at all: they hand the Person back to `transitionToRetirementInterest` and let that
 * function say what it says. `…OrRefuse` is `transferBalanceAccountOrRefuse`'s suffix, and it means
 * the same thing here — this is a door that can refuse, and the refusal is the existing one.
 *
 * **The order is not interchangeable, and there are five orderings in it, not four.** The unmet
 * condition is tested first because a Person who has not met one needs no conversion day at all:
 * the stream is squarely Accumulation Phase, `trisConversionDayUnderItem106` would happily hand
 * back their 65th birthday, and calling it would be asking for a day that answers nothing. The
 * grounds test comes next, because it is the *route* test: resolving a day for a Person on the
 * 101/102A/103 route and then discarding it would make the refusal depend on the day rather than
 * on the route. **Limb 2b comes between them** — after the grounds are known and before limb 3's
 * catch-all, because every Person it answers for also fails limb 2's ground test and limb 3 would
 * otherwise return the generic refusal first, leaving the named one unreachable. Inside limb 2,
 * `retirementPhaseInterest` is called **before** the day is resolved, which is T122's ordering and
 * is explained at the call site; limb 2b takes the same ordering by its own route.
 *
 * **The day is resolved for what it REFUSES, and its value is deliberately dropped.** R13's
 * resolution raises the after-65 contradiction (a stated changeover day later than the birthday
 * item 106 had already converted on) and the two off-route refusals, and every one of those must
 * propagate: a caller who is told "Retirement Phase" over the top of a swallowed contradiction has
 * been told the flattering half of a fact the file knew was broken. What the day is *for* —
 * `phaseHeldFrom`, and the s 294-25(1) item 2 credit on the conversion day — is chunk 5b-5's
 * wiring, and this function deliberately offers no way to ask for it: returning a day nobody can
 * yet consume would invite a second, drifting derivation of it.
 *
 * **Is the off-route refusal even reachable from limb 2?** Yes, and it is not a dead branch. The
 * grounds are computed per Person from age and employment (`conditionOfRelease`); the Settings are
 * stated per stream by the user. A Person who turned 65 and never ceased gainful employment has the
 * automatic-release ground alone, and can still have a `statedNotificationDay` or an item-101
 * `statedSchedule1Item` recorded against one of their streams. The two facts disagree, nothing here
 * can say which is wrong, and R13's resolution refuses — which is the right answer and is why this
 * function does not pre-empt it with a route test of its own.
 */
export const trisInterestOrRefuse = (
  dateOfBirth: IsoDate,
  stated: StatedStreamSettings | undefined,
  release: ConditionOfRelease,
  declared?: DeclaredRecipient,
): SuperInterest => {
  // Limb 1. Not a converted stream at all, and the constructor answers rather than refusing.
  if (!release.met) return transitionToRetirementInterest(release, declared);

  // Limb 2b, and it must be tested BEFORE limb 3 or it is unreachable: every Person it answers for
  // also fails `automaticReleaseAlone`, so limb 3 would return the generic refusal first and this
  // one would be dead code that no fixture could ever reach.
  if (notificationRouteWithTheFactUnstated(release.grounds, stated)) {
    // T122's ordering, as limb 2 takes it: a declared reversionary beneficiary or a commutation
    // authority must refuse AS that fact, ahead of a refusal about a notification the declaration
    // has made irrelevant — (3)(aa) failing collapses the conjunction whatever item the recipient
    // satisfied. `requireModelledRecipient` is module-private in `superPhase.ts`, and of the three
    // exported paths to it `accumulationInterest` is the only one that decides nothing about this
    // Person: it reads no `met`, no grounds and no day, and its own doc says the Condition of
    // Release is carried and not consulted. So the value is discarded and only the guard is wanted,
    // which `void` makes visible.
    void accumulationInterest(release, declared);
    throw new TrisNotificationNotStatedError(release.on);
  }

  // Limb 3, tested here so that limb 2 below is the single narrow case. The O65 overlap and the
  // 101/102A/103 route both land on this line, and both get the refusal they got before this file
  // existed. Nothing is decided for them here; they are handed back untouched. Since 5b-6 the
  // route's share of this line is narrower and is NOT empty: a Person who stated no Schedule 1 item,
  // or who stated one and ALSO stated the notification day, still arrives here — the first because
  // nothing has identified their route, the second because there is no converted-101/102A/103
  // interest in `src/` for them to land on.
  if (!automaticReleaseAlone(release.grounds)) return transitionToRetirementInterest(release, declared);

  // Limb 2, and the constructor goes FIRST — the order is T122's. `retirementPhaseInterest` calls
  // `requireModelledRecipient` on its first line, so a declared reversionary beneficiary or a
  // commutation authority refuses AS that fact. s 307-80(3)(aa) failing puts the stream in
  // retirement phase whatever Schedule 1 item the recipient satisfied, which makes this whole
  // route analysis moot for them, and refusing them over a stated changeover day instead would be
  // masking the declared fact with a refusal the declaration had made irrelevant.
  const converted = retirementPhaseInterest(release, declared);
  // And THEN R13's day, for what it REFUSES. `void` is the discard made visible: see the note
  // above on why the day itself is not returned.
  void trisConversionDayUnderItem106(dateOfBirth, stated);
  return converted;
};
