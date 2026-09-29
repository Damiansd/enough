// P3-9 chunks 6-3 and 6-4 — **the SHAPE of the per-Person transfer balance account Settings, and
// (6-4) the one door where not having them refuses.** Register §3.10.7, first block; the state
// table of §3.10.3.
//
// **What is built here, stated exactly.** The per-Person SEVEN of §3.10.3 are assembled below out of
// the three types `transferBalanceAccount.ts` already owns. §3.10.7 has a SECOND Settings block —
// per stream: the TRIS conversion day, the notification day, the Schedule 1 item set, the
// reversionary flag and each above-minimum withdrawal's characterisation — and that block is **chunk
// 5b, which is blocked on a pending ruling and is untouched here**. Nothing in this file may be read
// as saying §3.10.7's Settings are complete.
//
// **The refusal is wired here, and at exactly one door — P3-9 chunk 6-4, 2026-09-16.**
// *(This header said, until chunk 6-4: "**No refusal is reachable from this file, on purpose.**
// `UnknownPersonalTransferBalanceCapError` still has no throw site anywhere in `src/`; wiring it is
// chunk 6-4". That was true of 6-3 and is kept so the seam is legible, not deleted.)*
// `transferBalanceAccountShape` below is still TOTAL and still refuses nobody: it classifies, and
// `notAnswerable` is one of its three values. The throw lives in
// `transferBalanceAccountOrRefuse`, a SEPARATE exported door, so that a caller who only wants the
// classification cannot trip a refusal by asking. The two RangeErrors in
// `transferBalanceAccountSettingsAsStated` are input-shape guards in the idiom the rest of the
// module already uses (`openTransferBalanceLedger`, `transferBalanceAccountDaysAsStated`); neither
// is a named refusal. **P4-1b part (B) added a third guard of the same kind — the forecast-window
// corroboration of conjunct 1 — beside the classifier's own contradiction throw**, so this file now
// holds FOUR `RangeError`s and still exactly ONE named refusal. That count is pinned from the test
// side, because a guard added without a reason recorded is how a total classifier stops being one.
//
// **The conjunction this file exists to make answerable (O42).** The refusal's trigger is
// *(the account started before the forecast)* AND *(the seven Settings are not supplied)*. Only the
// second conjunct is visible in the data. The first is a DECLARED fact —
// `Person.statedPriorRetirementPhase`, added in `household.ts` — because inferring it from the
// absence of Settings refuses the exact Person the refusal's own message promises will be computed
// in full.
import { UnknownPersonalTransferBalanceCapError } from './transferBalanceAccount.js'; // `.js` is correct in a `.ts` file — see tsconfig.json
import { dayPrecedesForecast } from './forecastWindow.js';
import type { ForecastWindow } from './forecastWindow.js';
import type { Person, StatedPriorRetirementPhase } from './household.js';
import type {
  PersonalCapCarryForward,
  TransferBalanceAccountDays,
  TransferBalanceLedger,
} from './transferBalanceAccount.js';
import type { FinancialYear } from '../data/assumptions/types.js';

/**
 * The tri-state, with a name for the state a boolean cannot hold. `notStated` is not a third
 * answer — it is the absence of one, and it opens neither path.
 */
export type PriorRetirementPhaseAnswer = StatedPriorRetirementPhase | 'notStated';

/**
 * **The only place `undefined` is given a meaning.** An omitted Setting means the question was never
 * put, never that the answer was no. Every reader goes through here so that the interpretation of
 * absence exists once and can be mutated once.
 */
export const priorRetirementPhaseAsStated = (person: Person): PriorRetirementPhaseAnswer =>
  person.statedPriorRetirementPhase ?? 'notStated';

/**
 * **§3.10.3's seven per-Person fields, ASSEMBLED — not re-declared.** Each of the seven already
 * exists as a field of a type in `transferBalanceAccount.ts`, and re-spelling any of them here would
 * create a second place for the same fact to live and a way for the two to disagree:
 *
 *   1. `transferBalanceAccountStartDay` → `statedAccountStartAndCap.accountStartDay` (R4, a DAY)
 *   2. `personalTransferBalanceCap`     → `statedAccountStartAndCap.capPrevFY`
 *   3. `transferBalance`                → `statedLedger.transferBalance` (may be negative)
 *   4. `highestEndOfDayTransferBalance` → `statedDays.highestEndOfDayTransferBalance`
 *   5. `highestBalanceDay`              → `statedDays.highestBalanceDay`
 *   6. `personalCapOnHighestBalanceDay` → `statedDays.personalCapOnHighestBalanceDay`
 *   7. `hasEverExceededCap`             → `statedDays.hasEverExceededCap`
 *
 * **The EIGHTH stated fact, accounted for rather than arriving by accident.** `statedDays` also
 * carries `throughDay`: the last day whose closing balance the stated history covers. It is not one
 * of the seven and the register does not list it, but a stated history is meaningless without it —
 * *"the mark as at when?"* — and `transferBalanceAccountDaysAsStated` already requires it. The
 * ledger carries a `throughDay` of its own, meaning something different (the day of its last entry),
 * and the two are cross-checked in the constructor below rather than assumed to agree.
 *
 * **Why `Pick` on the carry-forward rather than the whole of it.** `PersonalCapCarryForward` also
 * carries fields 4, 6 and 7, which `statedDays` already holds; taking the whole type would state
 * three of the seven twice. `provenanceOfCapPrevFY` is kept because it is required there and because
 * a cap that came off an ATO screen is exactly the weak input `provenance.ts` exists to carry — a
 * result is as weak as its weakest input, and U14 is live on the screen these figures come off.
 *
 * **Every member is a branded type or a Pick of one**, so the only way to build the parts is through
 * the constructors in `transferBalanceAccount.ts` (`transferBalanceAccountDaysAsStated`,
 * `openTransferBalanceLedger` and the four ledger writers). This record adds no fourth producer of
 * either brand.
 */
export interface StatedTransferBalanceAccountSettings {
  /** §3.10.3 fields 1 and 2, with the provenance the cap travels with. */
  readonly statedAccountStartAndCap: Pick<
    PersonalCapCarryForward,
    'accountStartDay' | 'capPrevFY' | 'provenanceOfCapPrevFY'
  >;
  /** §3.10.3 field 3, and the trail that produced it. */
  readonly statedLedger: TransferBalanceLedger;
  /** §3.10.3 fields 4-7, plus the eighth stated fact `throughDay`. */
  readonly statedDays: TransferBalanceAccountDays;
}

/**
 * **The door the Settings come through**, with the `stated` prefix chunk 6-2 established on
 * `transferBalanceAccountDaysAsStated`: the keys of an input-boundary parameter are named for the
 * fact being *asserted by a user*, not for the field being written, so a computed state cannot be
 * spread in under the field's own name.
 *
 * What it checks is only what two stated facts can say about each other. It cannot check them
 * against the world: a user who states a start day a year late gets a cap that is wrong and nothing
 * here can tell. That is the input boundary's limit, and the register's answer to it is that all
 * seven come off the ATO record of the account (U14 — this project has never seen that screen).
 */
export const transferBalanceAccountSettingsAsStated = (
  stated: StatedTransferBalanceAccountSettings,
): StatedTransferBalanceAccountSettings => {
  const { statedAccountStartAndCap, statedLedger, statedDays } = stated;
  if (statedLedger.throughDay > statedDays.throughDay) {
    throw new RangeError(
      `the stated ledger runs to ${statedLedger.throughDay} but the stated day history only closes ` +
        `days through ${statedDays.throughDay}: an entry on a day the high-water mark has not been ` +
        'taken for leaves ITAA 1997 s 294-40(2)(a) reading a stale maximum. Close the day or ' +
        'restate the history',
    );
  }
  if (statedAccountStartAndCap.accountStartDay > statedDays.highestBalanceDay) {
    throw new RangeError(
      `the stated transfer balance account start day ${statedAccountStartAndCap.accountStartDay} is ` +
        `after ${statedDays.highestBalanceDay}, the stated day the high-water mark was attained: the ` +
        'mark cannot have been reached before the account existed. ITAA 1997 s 294-15(2) starts the ' +
        'account on the LATER of 1 July 2017 and the first retirement-phase day',
    );
  }
  return Object.freeze({
    statedAccountStartAndCap: Object.freeze({ ...statedAccountStartAndCap }),
    statedLedger,
    statedDays,
  });
};

/**
 * What this tool knows about one Person's transfer balance account before any arithmetic is
 * attempted. Three outcomes, because the conjunction has three interesting cases and collapsing any
 * two of them is how this refusal becomes a regression.
 */
export type PersonTransferBalanceAccountShape =
  | {
      /** O42: the account starts INSIDE the forecast, so every figure is the engine's own. */
      readonly kind: 'computedInFull';
      readonly person: string;
    }
  | {
      /** The account predates the forecast and the user has supplied §3.10.3's seven. */
      readonly kind: 'statedHistory';
      readonly person: string;
      readonly settings: StatedTransferBalanceAccountSettings;
    }
  | {
      /** Neither path is open. Chunk 6-4 decides what happens here; today it is a value, not a throw. */
      readonly kind: 'notAnswerable';
      readonly person: string;
      readonly because: NotAnswerable;
    };

export type NotAnswerable =
  | 'the account is stated to predate the forecast and the seven per-Person Settings of register §3.10.3 are not supplied'
  | 'the Person has not stated whether their transfer balance account was already running before the forecast';

/**
 * **Conjunct 1 of `UnknownPersonalTransferBalanceCapError`, CORROBORATED — P4-1b part (B).**
 *
 * The declaration says the account was already running before the forecast; the stated Settings say
 * which day it started. Those are two statements about the same fact, and until the forecast window
 * had a name nothing could put them beside each other. Now it can: the start day must fall strictly
 * BEFORE the window's first day. A start day ON `firstDay` is inside the forecast — the walk's own
 * first tick reads that day — so it contradicts the declaration exactly as a later one does, and the
 * boundary is exclusive for that reason and not by preference.
 *
 * **What it costs to leave unchecked, which is why it is a throw and not a shrug.** Such a Person is
 * handed their own stated `capPrevFY` and the s 294-40(1)(b) latch that goes with a pre-2021 account,
 * in place of the seeding-year computation their real start day calls for — the $440,000 spread this
 * file's own fixtures price, in the flattering direction if the stated cap is the higher one.
 *
 * It refuses rather than reclassifying to `computedInFull`, because the contradiction does not say
 * WHICH of the two statements is wrong, and choosing one is the thing this module never does.
 */
const statedHistoryCorroborated = (
  window: ForecastWindow,
  person: Person,
  settings: StatedTransferBalanceAccountSettings,
): PersonTransferBalanceAccountShape => {
  const { accountStartDay } = settings.statedAccountStartAndCap;
  if (!dayPrecedesForecast(window, accountStartDay)) {
    throw new RangeError(
      `${person.name} is stated to have started retirement phase before the forecast, yet the ` +
        `stated transfer balance account start day ${accountStartDay} is not before ${window.firstDay}, ` +
        'the first day of the forecast. Those two Settings cannot both be true: an account that ' +
        'starts on or after that day starts INSIDE the forecast and is computed in full (O42), with ' +
        'no prior history to state. Correct the start day, or the declaration',
    );
  }
  return { kind: 'statedHistory', person: person.name, settings };
};

/**
 * **The Person-level classification, and the whole of O42 in one `switch`.**
 *
 * It reads exactly two things: the Person's declared answer, and whether Settings were supplied for
 * them. It deliberately does **not** read `superInterests` — neither `household.ts`'s
 * `{ phase, balance }` nor `superPhase.ts`'s branded union can answer *"before the forecast?"*, and
 * reading either would be the inference O42 forbids.
 *
 * **Conjunct 1 IS corroborated now — P4-1b part (B), 2026-09-18, and this paragraph is the record
 * of what it used to say.** Until this change the doc here read: *"There is no forecast window
 * anywhere in `src/` to compare `accountStartDay` against, so conjunct 1 is answerable but not
 * corroborable: a Person who declares a pre-forecast account and states a start day inside the
 * forecast is not caught, here or at the refusal door below"*. Its first clause stopped being true
 * when `forecastWindow.ts` named the window `project()` had always derived, and the rest followed:
 * the window is now a REQUIRED parameter of this classifier, and a stated start day that is not
 * before `window.firstDay` when the declaration is `startedRetirementPhaseBeforeTheForecast` is
 * refused below rather than believed. The one copy of the retired sentence is kept here, inside the
 * correction, so the claim can be recognised if it comes back reworded.
 *
 * **Why the window is a parameter and not a second boundary built here.** The old note's reason for
 * deferring was right — a window invented in a Settings module is one the engine can disagree with —
 * and it is answered by taking the engine's own window rather than by computing one. There is one
 * producer (`forecastWindow`) and `project()` reads the same value for its own two refusals.
 *
 * **The OTHER branch's rule, and the honest reason it is not a second `if`.** The rule the deferral
 * named has two limbs: before the window's first day when the declaration is
 * `startedRetirementPhaseBeforeTheForecast`, and INSIDE the window when it is
 * `neverARetirementPhaseRecipientBeforeTheForecast`. The second limb has no data to read: the only
 * `accountStartDay` this module can see lives in the stated Settings, and a Person who declares
 * `never…` and supplies Settings is already refused by the contradiction throw below — whatever
 * their start day says. So the second limb is discharged by that throw and not by a comparison, and
 * writing a comparison after it would be unreachable code dressed as a check. It becomes a live
 * comparison only if some future input carries a start day for a Person who states no history, and
 * there is no such input today.
 *
 * **The safe direction is unchanged, and is now narrower.** A Person who declares a pre-forecast
 * account they do not have was, and still is, never silently flattered: they are refused
 * (`notAnswerable` → `UnknownPersonalTransferBalanceCapError`) when they supply nothing, computed
 * off their own stated history when they supply one — and, from this change, refused as well when
 * that stated history's start day is not in fact before the forecast.
 */
export const transferBalanceAccountShape = (
  window: ForecastWindow,
  person: Person,
  settingsByPerson: ReadonlyMap<string, StatedTransferBalanceAccountSettings>,
): PersonTransferBalanceAccountShape => {
  const answer = priorRetirementPhaseAsStated(person);
  const settings = settingsByPerson.get(person.name);
  switch (answer) {
    case 'neverARetirementPhaseRecipientBeforeTheForecast':
      if (settings !== undefined) {
        throw new RangeError(
          `${person.name} is stated never to have been a retirement phase recipient before the ` +
            'forecast, yet a stated transfer balance account history has been supplied for them. ' +
            'Those two Settings contradict each other: a Person whose account starts inside the ' +
            'forecast has no prior history to state (O42). Drop one of them rather than leaving ' +
            'this file to choose which is true',
        );
      }
      return { kind: 'computedInFull', person: person.name };
    case 'startedRetirementPhaseBeforeTheForecast':
      return settings === undefined
        ? {
            kind: 'notAnswerable',
            person: person.name,
            because:
              'the account is stated to predate the forecast and the seven per-Person Settings of register §3.10.3 are not supplied',
          }
        : statedHistoryCorroborated(window, person, settings);
    case 'notStated':
      return {
        kind: 'notAnswerable',
        person: person.name,
        because:
          'the Person has not stated whether their transfer balance account was already running before the forecast',
      };
  }
};

/**
 * The Household-level aggregation — one shape per Person, in the Household's own order. There is no
 * Household-level transfer balance account: the cap is per Person and never poolable, so this
 * returns a list and never a total.
 */
export const transferBalanceAccountShapes = (
  window: ForecastWindow,
  household: { readonly persons: readonly Person[] },
  settingsByPerson: ReadonlyMap<string, StatedTransferBalanceAccountSettings> = new Map(),
): readonly PersonTransferBalanceAccountShape[] =>
  Object.freeze(household.persons.map((person) => transferBalanceAccountShape(window, person, settingsByPerson)));

/**
 * The two shapes a Person's transfer balance account can be in once the refusal has had its say.
 * `notAnswerable` is `Exclude`d rather than re-spelled, so a fourth shape added above cannot quietly
 * bypass this door: it arrives here and has to be classified as answerable or not.
 */
export type AnswerableTransferBalanceAccount = Exclude<
  PersonTransferBalanceAccountShape,
  { readonly kind: 'notAnswerable' }
>;

/**
 * **THE throw site for `UnknownPersonalTransferBalanceCapError` — P3-9 chunk 6-4, 2026-09-16, and
 * there is exactly one of it in `src/`** (`test/core-transfer-balance-account-settings.test.mjs`
 * asserts the count from the other side, which is what lets the name be struck from the
 * "registered and unreachable" list in `test/core-transfer-balance-account.test.mjs`).
 *
 * **It refuses on the CONJUNCTION and on nothing else (O42).** `notAnswerable` is reached only
 * when the Person *declared* a pre-forecast retirement-phase account and the seven Settings of
 * §3.10.3 are absent, or when the declaration was never made at all. It is not reached by absent
 * Settings alone: a Person who declared
 * `neverARetirementPhaseRecipientBeforeTheForecast` and supplies nothing returns `computedInFull`
 * from here — never a throw — because their account starts inside the forecast and every one of the
 * seven is the engine's own output. The refusal's own message promises that Person in terms, and
 * §3.10.8 names refusing them as the one scoping mistake that would turn this refusal into a
 * regression.
 *
 * **`notStated` refuses too, and that is not the same as guessing.** A Person who was never asked
 * gets neither answer: reading their silence as "no" hands them the seeding-year computation and a
 * cap they may have no right to; reading it as "yes" would be the same throw with a worse reason.
 * The throw is the one that says "this is not answerable", which is what silence actually means.
 * What the caller does about it — put the question, then re-ask — is a Scenario decision and
 * nothing here defaults it.
 *
 * **Why this is a separate function rather than a `throw` inside `transferBalanceAccountShape`.**
 * The classifier is total and has consumers who want the classification (the Household aggregation
 * below returns all three kinds). A refusal added to the path those callers already use is a
 * regression wearing a safety label. Asking for the account *as a thing you can compute with* is
 * the question that can honestly be refused, so it is this function that asks it.
 *
 * @param window the forecast this plan is about — see `forecastWindow.ts`. It is REQUIRED and has
 *   no default: a window that could be omitted would make the corroboration of conjunct 1 opt-in,
 *   and a check nobody has to pass is not a check (P4-1b part (B)).
 * @param fy the year whose personal cap the caller needs — it is in the refusal's message, because
 *   "cannot be worked out" is only meaningful about a particular year's cap.
 */
export const transferBalanceAccountOrRefuse = (
  window: ForecastWindow,
  fy: FinancialYear,
  person: Person,
  settingsByPerson: ReadonlyMap<string, StatedTransferBalanceAccountSettings> = new Map(),
): AnswerableTransferBalanceAccount => {
  const shape = transferBalanceAccountShape(window, person, settingsByPerson);
  switch (shape.kind) {
    case 'computedInFull':
      return shape;
    case 'statedHistory':
      return shape;
    case 'notAnswerable':
      throw new UnknownPersonalTransferBalanceCapError(fy);
  }
};

// --- The two doors this chunk decided NOT to build, and why ---------------------------------------
//
// **Gap 1 (chunk 6-3's first): §3.10.3 fields 2 and 6 — `personalTransferBalanceCap` and
// `personalCapOnHighestBalanceDay` — have no STATED door, and 6-4 deliberately did not add one.**
// Both are `PersonalTransferBalanceCap`, a branded type whose producers are pinned by exact-count
// canaries: `as PersonalTransferBalanceCap` occurs exactly twice
// (`test/core-personal-transfer-balance-cap.test.mjs`) and `as TransferBalanceAccountDays` exactly
// three times (`test/core-transfer-balance-day.test.mjs`). Those counts are fences, not accidents.
// The consequence must be said plainly rather than left to be discovered: **a caller writing
// TypeScript cannot today build a `StatedTransferBalanceAccountSettings` carrying an ARBITRARY cap
// read off an ATO screen** — the only inhabitants of the brand are the values
// `seedPersonalTransferBalanceCap` and `indexPersonalTransferBalanceCap` compute.
//
// **NARROWED 2026-09-16 by Battery E, on this claim's own stated ground.** Until that battery
// measured it, the sentence above continued: *"so the statedHistory branch above is unreachable
// from typed code and every Person who declares a pre-forecast account is in practice refused by
// the door above. That is the conservative failure — a refusal, not a wrong cap"*. Both halves are
// FALSE, and the one copy of the retired sentence is kept here inside its correction so the claim
// can be recognised if it comes back reworded. `tsc --noEmit` exits 0 on a
// `StatedTransferBalanceAccountSettings` assembled entirely out of exported producers, with no cast
// and no spread, because `seedPersonalTransferBalanceCap(accountStartDay)` IS that Person's
// seeding-year personal cap under s 294-35(1). So the ordinary pre-forecast Person — one stream,
// commenced on a known day, no cap history this file cannot replay — reaches `statedHistory` today
// and is COMPUTED, not refused.
//
// **The direction of what remains missing, which is what matters now the branch is known to be
// live.** A Person whose real personal cap is NOT a value this file can compute — an excess
// transfer balance determination, a structured settlement contribution, a cap the ATO has already
// re-worked — cannot state it, and the caps they CAN express are wrong by an amount nothing here
// bounds, in either direction. It is NOT acceptable to leave silent, and it is the next chunk's work:
// the door belongs beside the other `stated` constructors in `transferBalanceAccount.ts`, and
// building it means raising one of those counts **with the reason recorded in the test that holds
// it**. U14 is why it is not raised here: the labels on the ATO screen those figures come off have
// never been retrieved, so a stated-cap constructor written today would be naming its parameters
// after the statute and hoping.
//
// **Gap 2 (the second): field 3, `transferBalance`, has no stated door either — and here that is
// the right answer, not a deferral.** Stating a balance means stating the trail, because
// `TransferBalanceLedger` carries its own witness: `transferBalance` is the sum of its entries'
// movements by construction, and an `asStated` door taking a bare figure would break exactly that
// identity. A user CAN state the trail, with the writers that already exist — and for the ordinary
// pre-forecast case that is a single `creditOnCommencement` on the day the pension started, valued
// at the supporting interest on that day (s 294-25(1) item 2, R4's day-not-year point). That is the
// honest shape of what such a user knows, and it is what the fixtures build. **The residue:** a user
// with a commutation or a second stream must replay each event, and one who cannot remember them is
// in precisely the position the refusal above describes — which is the refusal working, not a gap
// in it.
