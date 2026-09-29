// P3-9 chunk 5b-3 — R13's conversion-day resolution, and the one contradiction it refuses.
//
// R13 (RULINGS.md, 2026-09-16) narrows R5's absent-Setting limb and states the order in two lines:
//
//   1. **A stated changeover day wins whenever it is present.** That is R5's stated Setting,
//      reaffirmed, and it arrives as `StatedStreamSettings.statedTrisConversionDay`.
//   2. **Otherwise the 65th birthday**, derived from date of birth, because under SISR Schedule 1
//      item 106 a TRIS moves to retirement phase *automatically* at that age with no notification
//      and no election. R5's "do not guess a day" reasoning does not bite on a day that is
//      mechanically certain.
//
// **The direction of the residual error, restated here because this is where the default is taken.**
// A Person who actually converted at 60 and says nothing is modelled as converting at 65: the tool
// then charges 15% on fund earnings for five years that were in fact exempt, and keeps the 10% TTR
// maximum in place. That **understates** the household, which is the direction every unsourced
// figure in this project is engineered to fail in. It is not free of error on the cap side — a later
// conversion is credited at a later balance against a possibly indexed cap — so the backstop is a
// default and **not a substitute for asking**. The UI should still ask.
//
// --- Why this module exists at all, rather than a function in an existing file ---------------------
//
// **Not `superPhase.ts`.** That module's whole defence is that no age can arrive: it takes a
// `ConditionOfRelease` and a `DeclaredRecipient`, neither of which carries a date of birth, and
// `test/core-super-phase.test.mjs` greps its executable text for `ageAt`, `dateOfBirth`,
// `automaticReleaseAge`, `age`, `household.js` — and, since 5b-1, for `nthBirthday` and `birthday`
// too. This resolution is *made of* a birthday, so it could only live there by dismantling that
// grep. It takes its phase already decided; this file decides the day.
//
// **Not `household.ts` either, which is the closer call.** `StatedStreamSettings` is declared there
// and the fields are right next door. But `household.ts` is imported by `conditionOfRelease.ts` for
// `ageAt`/`assertIsoDate`, and today it pulls nothing out of `data/assumptions/` at runtime — the
// register's own note on the home's market value is that the *absence* of a figure from that module
// is the enforcement. Putting a reader of `superannuation.access.automaticReleaseAge` into the file
// that every Person literal in the suite already imports would hand the statutory age to the widest
// module in `core/`, and would do it through a module `conditionOfRelease.ts` depends on. So this
// follows `transferBalanceAccountSettings.ts`'s precedent instead: the shape stays in `household.ts`
// and the *resolution over* the shape gets its own small module, which nothing is obliged to import.
import { nthBirthday } from './financialYear.js'; // `.js` is correct in a `.ts` file — see tsconfig.json
import { assertIsoDate } from './household.js';
import type { StatedStreamSettings } from './household.js';
import type { ReleaseGround } from './conditionOfRelease.js';
import { SUPERANNUATION } from '../data/assumptions/super.js';
import type { IsoDate } from '../data/assumptions/types.js';

/**
 * The 65, read from the record and never written. `nthBirthday` deliberately takes the age as a
 * parameter and supplies only the calendar (`financialYear.ts`), so this is the file that has to
 * bring the age — and it brings it from `superannuation.access.automaticReleaseAge`, the one place
 * it is sourced. A `65` typed into this file would be the second unsourced copy of a statutory age
 * in `core/`, which is the thing the assumptions module exists to prevent.
 */
const AUTOMATIC_RELEASE_AGE: number = SUPERANNUATION.access.automaticReleaseAge.value;

/**
 * The ground item 106 *is*, spelled as `conditionOfRelease.ts` spells it and checked against that
 * module's exported `ReleaseGround` union, so a typo here is a compile error rather than a guard
 * that silently never matches.
 *
 * **Why the ground and not the item number.** `schedule1ItemFor` maps this ground onto item 106 by
 * reading the Schedule 1 records in `data/assumptions/super.ts`, and
 * `test/core-condition-of-release.test.mjs` pins all three of those records as consumed in
 * `conditionOfRelease.ts` **and nowhere else** — by name, over the whole text of every file under
 * `src/`, comments included. (Measured 2026-09-16: naming them in this comment failed that test,
 * which is the guard working.) So naming the item here would either break that sweep or write
 * `106` by hand. The ground is the same fact one step before the mapping, and it is already a
 * field on `Schedule1ItemIdentification`.
 */
const AUTOMATIC_RELEASE_GROUND = 'turning the age that releases benefits by itself' satisfies ReleaseGround;

/**
 * **The item-106 conversion day for one TRIS: stated if stated, otherwise the 65th birthday (R13).**
 *
 * **The scope is in the name, and it is enforced below rather than merely asserted.** R13's backstop
 * is available on the item 106 route *only*. On the 101/102A/103 routes the stream enters retirement
 * phase on the day the provider was **notified** (LCR 2016/9 Example 1B: retired 30 June 2019,
 * notified 15 July 2019, retirement phase 15 July 2019), a day nothing this model holds can derive —
 * so R5's mandatory stated day survives there untouched. Those routes are chunk 5b-6's and are not
 * built here; what is built here is a refusal to answer for them, because a function that quietly
 * returned the 65th birthday for a Person who retired on item 101 at 62 would be inventing a
 * three-year error out of a route it was never given.
 *
 * Two facts on the settings say the route is not item 106, and either one stops this function:
 *
 *   * a `statedNotificationDay` — *"On item 106 there is nothing to notify and this stays absent"*
 *     (`household.ts`), so its presence is the 101/102A/103 route by construction; and
 *   * a `statedSchedule1Item` whose ground is not the automatic-release one.
 *
 * Both are checked **before** the absent-stated-day branch, so the backstop cannot be reached by a
 * Person whose settings place them on another route.
 *
 * **The contradiction, which R13 left open to this microtask.** A stated changeover day *after* the
 * 65th birthday cannot be true: item 106 had already converted the stream, automatically, on the
 * birthday. Chunk 6-3's precedent for two Settings that cannot both hold is to **refuse and name
 * both**, never to silently prefer one — *"Drop one of them rather than leaving this file to choose
 * which is true"*. Preferring the stated day would push a transfer balance credit years late;
 * preferring the derived day would throw away a fact the user actually supplied. Neither is a
 * finding, so neither is made.
 *
 * **Equality is NOT a contradiction, and this is the boundary decision.** Item 106 converts *on* the
 * 65th birthday, so a user who states that exact day is stating the same day the backstop derives —
 * they agree, and there is nothing to refuse. `>` and not `>=` is therefore the whole of it, and the
 * equal case is pinned by a test so the operator cannot drift. It is also the case where returning
 * the stated day and returning the derived day are indistinguishable, which is what makes limb 1
 * safe to apply unconditionally up to the birthday.
 *
 * **What is deliberately NOT checked here.** A stated conversion day *before* `commencementDay` is
 * also impossible, but no ruling covers it and no consumer exists to price it; it belongs with
 * whoever first walks a stream's own history. This function is not a validator of the settings
 * block, only of the one pair R13 put in front of it.
 *
 * **No named refusal is minted.** §3.10.8 is the register's one home for refusal names (R8) and
 * `test/refusal-names.test.mjs` reads it in both directions, so a fourteenth `export class … extends
 * RangeError` would be a name the register has to carry forever. Chunk 6-3's own contradiction —
 * `transferBalanceAccountShape`'s "never a recipient, yet a stated history" — is a **plain
 * `RangeError`**, as is `transferBalanceAccountDaysAsStated`'s high-water/flag contradiction. Both
 * are input-boundary consistency checks over two user statements, which is exactly what this is: not
 * a gap in the register, but a caller handing this file two facts that cannot both be true. The
 * precedent's shape is followed, including its closing instruction.
 */
export const trisConversionDayUnderItem106 = (
  dateOfBirth: IsoDate,
  stated: StatedStreamSettings | undefined,
): IsoDate => {
  if (stated?.statedNotificationDay !== undefined) {
    throw new RangeError(
      `a notification day of ${stated.statedNotificationDay} is stated for this stream, so it is not ` +
        'on the item 106 route: under s 307-80(3)(b)(ii) a stream released by item 101, 102A or 103 ' +
        'enters retirement phase on the day the PROVIDER WAS NOTIFIED, and a backstop derived ' +
        'from a date of birth cannot stand in for it (R5, undisturbed by R13). This function ' +
        'answers the automatic-release route only. Resolve the notification route where it is ' +
        'built, not here',
    );
  }
  const statedItem = stated?.statedSchedule1Item;
  if (statedItem !== undefined && statedItem.ground !== AUTOMATIC_RELEASE_GROUND) {
    throw new RangeError(
      `the Schedule 1 item stated for this stream is item ${statedItem.item} ("${statedItem.ground}"), ` +
        `not the automatic-release item R13's backstop belongs to. This function answers the age-65 ` +
        'route only; on the other items the conversion day turns on a notification day that must be ' +
        'stated (R5). Resolve that route where it is built, not here',
    );
  }

  // R13 limb 2, computed first because limb 1 has to be measured against it.
  const automatic = nthBirthday(dateOfBirth, AUTOMATIC_RELEASE_AGE);
  const statedDay = stated?.statedTrisConversionDay;
  if (statedDay === undefined) return automatic;
  assertIsoDate(statedDay); // zero-padded, so the comparison below is chronological and not merely lexical

  if (statedDay > automatic) {
    throw new RangeError(
      `the stated TRIS changeover day ${statedDay} is after ${automatic}, the day this Person turns ` +
        'the age that releases benefits by itself. Those two facts contradict each other: SISR ' +
        'Schedule 1 item 106 had already moved the stream to retirement phase on that birthday, ' +
        'automatically, with no notification and no election — so the stream cannot have changed ' +
        'over later. Drop one of them rather than leaving this file to choose which is true: if the ' +
        'stated day is right, the date of birth is wrong, and if the date of birth is right, the ' +
        'stated day is a day the stream had already converted',
    );
  }
  return statedDay;
};
