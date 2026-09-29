// P3-9 chunk 5b-5 — **the consumer of R13's conversion day: the s 294-25(1) item 2 credit that
// arises on it.**
//
// 5b-3 built the day and 5b-4 resolved it for what it REFUSES, dropping its value on purpose —
// *"returning a day nobody can yet consume would invite a second, drifting derivation of it"*. This
// file is the somebody. It computes nothing of its own: it composes exactly two existing functions,
// `trisConversionDayUnderItem106` and `creditOnCommencement`, and its whole content is the claim
// that **the day the first produces is the STARTING DAY the second names**.
//
// That claim is register §3.10.6's, in terms: *"the conversion day is the **starting day** for
// s 294-25(1) item 2; the credit is the value on that day of the WHOLE superannuation interest
// supporting the stream — including every dollar of growth accumulated while the TRIS was out of
// retirement phase"*. On the item-106 route the member does nothing, which is the whole danger: a
// stream converts on a birthday, credits its full value against a cap the member never consulted,
// and can push them into excess and kill s 294-40(1)(b) indexation permanently.
//
// --- What this deliberately does NOT do ---------------------------------------------------------
//
// **It does not join a Person to a ledger, and it is not wired into `trisInterestOrRefuse`.** That
// router has no ledger and no dated value in scope, and supplying one would mean inventing a figure
// — which is **O57**, the wiring item the register assigns to **P4-1** by name. So this ships with
// no production caller. That is the O72 / P3-38 shape: a thing that is registered, tested and
// unreachable, recorded as a **finding** rather than dressed up as coverage.
//
// **It does not read the value off a `SuperInterest`.** `household.ts`'s `SuperInterest` is
// `{ phase, balance }` with no day at all, so its `balance` is a figure about *today* and item 2
// wants the value **on the starting day**. The two are both `Cents` and the compiler cannot tell
// them apart — which is `creditOnCommencement`'s own stated reason for naming its parameter for the
// day rather than for the amount, and the discipline is mirrored here: the value arrives in a named
// field of an object, so `credit(ledger, dob, stated, interest.balance)` does not compile, and the
// caller who means it has to type the day into the name.
//
// **It does not touch the ORIGINAL commencement day.** `StatedStreamSettings.commencementDay` is
// the day the TRIS started paying, in ACCUMULATION phase: s 307-80(3) excluded it from retirement
// phase then, so no item 2 credit arose and none may arise for it later. Crediting both days would
// double-count the same interest — the credit is a one-shot photograph (LCR 2016/9 ¶24), not a
// running valuation. This file never reads that field, and the test asserts the absence rather than
// trusting the sentence.
//
// **It mints no refusal.** All three of 5b-3's contradictions — a stated notification day, a
// non-item-106 Schedule 1 item, a stated changeover day after the 65th birthday — propagate out of
// this function **unchanged and unworded**, because the day is resolved before the ledger is
// touched. A `try`/`catch` here would credit a stream on a day the file knew was contradicted.
//
// --- Why a module of its own ---------------------------------------------------------------------
//
// `trisInterest.ts` set the precedent one chunk ago and named this file while doing it: *"the module
// that chooses a door and refuses sits BESIDE the module it chooses from, not inside it"*.
//
// **Not `trisConversionDay.ts`.** That module is a day function with no dependency on the phase or
// ledger model, and 5b-4 refused to fold into it for exactly this reason — folding the credit in
// would make every consumer of the day import Div 294 in order to ask what day a stream converted,
// and would put ledger construction inside the file whose throw census is pinned at R13's three
// contradictions.
//
// **Not `transferBalanceAccount.ts`.** That module is handed a value and a day and cannot tell what
// produced them, which is stated there as the reason its refusals live at the declaration and not
// at the credit. Putting this composition inside it would walk a date of birth and a per-stream
// Settings block into the ledger, and give the item 2 credit a second, TRIS-shaped entrance beside
// the general one.
//
// **Not `trisInterest.ts`.** That file returns a `SuperInterest` and holds no ledger; importing the
// ledger there would make the phase router a Div 294 module, and its own canary pins it as minting
// no throw and holding no `catch`.
import { trisConversionDayUnderItem106 } from './trisConversionDay.js'; // `.js` is correct in a `.ts` file — see tsconfig.json
import { creditOnCommencement } from './transferBalanceAccount.js';
import type { TransferBalanceLedger } from './transferBalanceAccount.js';
import type { StatedStreamSettings } from './household.js';
import type { Cents } from './money.js';
import type { IsoDate } from '../data/assumptions/types.js';

/**
 * **The value of the supporting interest on the day the TRIS converts, and the name is the whole of
 * the defence.**
 *
 * `creditOnCommencement` takes `valueOfSupportingInterestOnStartingDay` and says why: *"`value` on
 * its own is the name of the mistake: a caller with a pension balance in hand will pass it, and on
 * any day but the starting day that is a different figure"*. The same mistake is closer here,
 * because the only balance this codebase holds for a TRIS is `SuperInterest.balance`, which carries
 * no day whatsoever. Wrapping the figure in a named field means the balance cannot be handed over
 * positionally: it is a `Cents`, not an object, and `tsc` says so.
 *
 * **What "value" means is NOT settled here and must not be re-researched here (O62).** s 307-205(b)
 * governs an account-based interest and the last step of the chain — *"the whole interest is
 * commutable, therefore value = balance"* — is a **labelled inference** (U17 / U25 / O56 / O62)
 * recorded once, in §3.10.4's own row. This function launders nothing: it takes the value it is
 * given, exactly as `creditOnCommencement` does.
 */
export interface Item106ConversionValue {
  readonly valueOfSupportingInterestOnTheConversionDay: Cents;
}

/**
 * **The s 294-25(1) item 2 credit for a TRIS that converted under SISR Schedule 1 item 106, on the
 * day R13 resolves — or the refusal the day resolution raises.**
 *
 * Four arguments and no defaults, because each is a fact a different party owns: the ledger is the
 * account's own history, the date of birth is the Person's, the Settings are what the **user
 * stated** about this one stream, and the value is the caller's — measured on a day the caller does
 * not yet know, which is why it is supplied rather than looked up.
 *
 * **The order inside is not interchangeable.** The day is resolved FIRST and the ledger is not
 * touched until it has resolved. R13's three contradictions are raised by that call, and a ledger
 * grown before they are asked would have to be discarded — or, worse, would be returned by a caller
 * who caught the throw. Nothing here catches anything.
 *
 * **One credit, never two.** `creditOnCommencement` is called exactly once, so one conversion
 * produces one entry. The three ways this could double-count are all outside the function and all
 * named for the caller: calling it twice for one stream, calling it once for the conversion and
 * again for the stream's `commencementDay` (which was an accumulation-phase day and carries no
 * credit), and calling it for a stream that was already in retirement phase before the forecast —
 * whose account `UnknownPersonalTransferBalanceCapError` refuses outright.
 *
 * **There is no production caller, and that is deliberate** (O57 → P4-1). See the file header.
 */
export const creditTrisConversionUnderItem106 = (
  ledger: TransferBalanceLedger,
  dateOfBirth: IsoDate,
  stated: StatedStreamSettings | undefined,
  conversion: Item106ConversionValue,
): TransferBalanceLedger => {
  // R13's day, and its refusals, BEFORE the ledger is touched. Not re-worded and not re-checked:
  // this file adds no guard of its own, so a Person taken off the item-106 route by their own
  // stated facts is refused in `trisConversionDay.ts`'s words, once.
  const startingDay = trisConversionDayUnderItem106(dateOfBirth, stated);
  return creditOnCommencement(ledger, {
    startingDay,
    valueOfSupportingInterestOnStartingDay: conversion.valueOfSupportingInterestOnTheConversionDay,
  });
};
