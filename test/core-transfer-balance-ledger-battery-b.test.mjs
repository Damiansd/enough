// P3-9 mutation Battery B — the four gaps the battery found in chunk 4 (T73–T86), and nothing else.
//
// This file is not a second copy of the golden fixtures: `core-transfer-balance-ledger.test.mjs`
// carries those, and the battery confirmed they catch every arithmetic mutation it threw at them.
// Making `recordCommutation` a no-op failed 5 tests; making `recordPensionPayment` debit failed 5;
// inverting `creditOnCommencement`'s `+` failed 8; widening `closingBalanceOn`'s comparison to `>=`
// failed 6. The definitional asymmetry is priced in dollars by the fixtures and needs nothing added.
//
// What SURVIVED was four things none of those fixtures look at, and each one is pinned below with
// its own measurement rather than with a claim.
//
// **Where every figure comes from.** Register §3.10.9's own hand-worked rows, re-dated into the
// window the published general-cap series covers exactly as chunk 4's own fixtures re-date them, or
// derived line by line beside the assertion. Nothing was read off an implementation: §3.10.9's
// *"Ledger, not balance"* row states both the right answer (**$2,400,000**, a breach) and the wrong
// one (**$2,000,000**, no breach), which is why gaps 1 and 3 can be priced at all.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import * as ledgerModule from '../dist/core/transferBalanceAccount.js';
import {
  TransferBalanceCapExceededError,
  carryPersonalCapForward,
  closeDayFromLedger,
  closingBalanceOn,
  creditOnCommencement,
  indexPersonalTransferBalanceCap,
  openTransferBalanceAccountDays,
  openTransferBalanceLedger,
  recordCommutation,
  recordPensionPayment,
  seedPersonalTransferBalanceCap,
} from '../dist/core/transferBalanceAccount.js';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const LEDGER_SOURCE = readFileSync(join(ROOT, 'src', 'core', 'transferBalanceAccount.ts'), 'utf8');
const CHUNK_4 = LEDGER_SOURCE.slice(LEDGER_SOURCE.indexOf('// --- Chunk 4 —'));

/** Dollars to cents, so every expected figure below reads as the register writes it. */
const $ = (dollars) => dollars * 100;

/**
 * Derivation 1 — executable text only: block comments and line comments removed, every string
 * literal (single-quoted, double-quoted AND template) replaced by `''`. Chunk 4's own prose talks
 * about earnings, market values and rates at length, and its entry labels are full of statutory
 * citations; neither is a code path, and a canary that could not tell them apart would be useless.
 */
const executable = (text) =>
  text
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/\/\/[^\n]*/g, ' ')
    .replace(/'[^']*'|"[^"]*"|`[^`]*`/g, "''");

/** §3.10.9's "Ledger, not balance" row, re-dated as chunk 4's own fixture re-dates it. */
const ledgerNotBalance = () => {
  // s 294-35(1) seeds from the FY2025-26 general cap: $2,000,000 (register §3.1).
  const seed = seedPersonalTransferBalanceCap('2025-07-01');
  assert.equal(seed.cap, $(2_000_000));

  let ledger = creditOnCommencement(openTransferBalanceLedger('2025-07-01'), {
    startingDay: '2025-07-01',
    valueOfSupportingInterestOnStartingDay: $(1_500_000),
  });
  let days = openTransferBalanceAccountDays('2025-07-01', seed.cap, closingBalanceOn('2025-07-01', ledger));
  for (const day of ['2025-12-15', '2026-05-20']) {
    ledger = recordPensionPayment(ledger, { day, amount: $(250_000) });
    days = closeDayFromLedger({ ledger, state: days, day, personalCapOnDay: seed.cap });
  }
  days = closeDayFromLedger({ ledger, state: days, day: '2026-06-30', personalCapOnDay: seed.cap });

  // FY2026-27: used = floor(100 × 1,500,000 / 2,000,000) = 75, unused 25, and 25% of the $100,000
  // general-cap increase ($2,000,000 → $2,100,000) is $25,000. Hand-derived; §3.10.9 states no cap
  // for this row.
  const cap = indexPersonalTransferBalanceCap(
    '2026-27',
    carryPersonalCapForward(days, {
      accountStartDay: '2025-07-01',
      capPrevFY: seed.cap,
      provenanceOfCapPrevFY: seed.provenance,
    }),
  );
  assert.equal(cap.unusedCapPercentage, 25);
  assert.equal(cap.cap, $(2_025_000));

  // The second pension commences 1 Sep 2026 — s 294-25(1) item 2 again, valued on ITS starting day.
  ledger = creditOnCommencement(ledger, {
    startingDay: '2026-09-01',
    valueOfSupportingInterestOnStartingDay: $(900_000),
  });
  assert.equal(ledger.transferBalance, $(2_400_000)); // §3.10.9's own figure
  return { seed, ledger, days, cap };
};

/** The ledger's own witness: `transferBalance` is the sum of every entry's `movement`, always. */
const sumOfMovements = (ledger) => ledger.entries.reduce((total, entry) => total + entry.movement, 0);

// --- Gap 1: CLOSED — the brand still blocks only the LITERAL, so the module now checks the trail --

test('a real ledger spread with its running total rewritten is refused: $2,400,000, not $2,000,000', () => {
  // **Chunk 4's original defence, quoted:** *"Branded for the same reason the day state is … With
  // it, the only values of this type in existence came out of the four producers in this file, and
  // every cent of every one of them is on the `entries` trail."*
  //
  // **The first half is still true and the second half is still false**, and no type can make it
  // true: a bare annotated literal is refused (TS2741/TS2345, *"Property
  // '[TRANSFER_BALANCE_LEDGER]' is missing"*), but an object **spread** of a real ledger carries the
  // symbol-keyed brand into the type of the result, and overriding a *known* field never trips
  // excess-property checking, so `{ ...real, transferBalance: X }` IS a `TransferBalanceLedger` to
  // the compiler — `npx tsc --noEmit` exits 0 on it. That is the same class as Battery A's finding
  // against chunk 3's day-state brand and Battery D's against `superPhase.ts`'s interest brand.
  //
  // **What changed is the RUNTIME, not the type.** `requireAConformingLedger` re-derives the balance
  // from the trail — every producer writes a `movement` equal to the change it makes — and is called
  // at the only write (`appended`) and the only read (`closingBalanceOn`), which is the seam
  // `closeDayFromLedger` routes every closed day through. This test was written as a MONITORED gap
  // and is rewritten here as the refusal its own tripwire asked for.
  const { ledger, days, cap } = ledgerNotBalance();

  // The honest answer, unchanged and still a REFUSAL: $2,400,000 against a $2,025,000 cap is
  // $375,000 of excess.
  assert.equal($(2_400_000) - $(2_025_000), $(375_000));
  assert.throws(
    () => closeDayFromLedger({ ledger, state: days, day: '2026-09-01', personalCapOnDay: cap.cap }),
    TransferBalanceCapExceededError,
  );

  // The laundered answer. **$2,000,000 is §3.10.9's own named WRONG answer for this row** — the
  // figure a balance reading gives — and the right answer beside it is **$2,400,000**, which is what
  // the trail still says. It used to be returned; it is now refused, at both seams.
  const laundered = { ...ledger, transferBalance: $(2_000_000) };
  assert.equal(sumOfMovements(laundered), $(2_400_000));
  const namesBothFigures = (raised) => {
    assert.ok(raised instanceof RangeError);
    assert.ok(!(raised instanceof TransferBalanceCapExceededError), 'a corrupted value is not a breach');
    assert.match(raised.message, /running total is \$2,000,000\.00/); // the stored figure, wrong
    assert.match(raised.message, /move it by \$2,400,000\.00 in total/); // the trail's figure, right
    assert.match(raised.message, /difference of -\$400,000\.00/);
    assert.match(raised.message, /4 entries/);
    assert.match(raised.message, /ss 294-25 and 294-80/);
    return true;
  };
  assert.throws(() => closingBalanceOn('2026-09-01', laundered), namesBothFigures);
  assert.throws(
    () => closeDayFromLedger({ ledger: laundered, state: days, day: '2026-09-01', personalCapOnDay: cap.cap }),
    namesBothFigures,
  );
  // The write seam too, so a laundered ledger cannot be grown into one whose trail agrees with it.
  assert.throws(() => recordPensionPayment(laundered, { day: '2026-10-01', amount: $(1) }), namesBothFigures);
  // Emptying the trail instead of rewriting the total is the same lie told the other way, and the
  // same check catches it: nothing moved the balance, yet it stands at $2,400,000.
  assert.throws(() => closingBalanceOn('2026-09-01', { ...ledger, entries: [] }), /running total is \$2,400,000\.00/);

  // **The direction that made this worth closing**, restated so a reader can check it: lowering the
  // running total can only suppress a breach and manufacture headroom, never invent one. $2,025,000
  // − $2,000,000 is $25,000 of cap space this Person does not have, against $375,000 they have
  // already exceeded by.
  assert.equal(cap.cap - $(2_000_000), $(25_000));
  assert.ok($(2_000_000) < cap.cap && $(2_400_000) > cap.cap);

  // **The replacement tripwire.** The guard is a runtime check, not a structure, so the only thing
  // holding it in place is this count: the witness must still be derived in chunk 4's executable
  // text, and it must still be called at BOTH seams. Deleting either call site fails here as well as
  // failing the assertions above.
  const code = executable(CHUNK_4);
  assert.match(code, /entries\.reduce/);
  assert.equal((code.match(/requireAConformingLedger\(/g) ?? []).length, 2, 'the witness lost a seam');

  // **`throughDay`, recorded here as KNOWN-UNSAFE and now closed by the same witness.** The trail
  // witnesses the balance; it did not witness the day, so a spread that rewinds `throughDay` passed
  // both guards and answered an earlier day with a later day's honest figure. **The priced pair is
  // kept verbatim**: $2,400,000 returned for 1 Aug 2026 where $1,500,000 is true — the direction is
  // a *phantom* breach rather than a missed one, because the figure it hands back is too HIGH for
  // the day asked about, and $2,400,000 is over this Person's $2,025,000 cap while $1,500,000 is
  // under it.
  //
  // What closed it is the entries' own `day`: `appended` writes `throughDay` from `entry.day` and
  // refuses an entry dated before it, so the trail is non-decreasing and its last day IS
  // `throughDay` for every ledger any of the four producers built.
  const misdated = { ...ledger, throughDay: '2026-08-01' };
  assert.equal(sumOfMovements(misdated), $(2_400_000)); // the balance witness is untouched — only the day is a lie
  const namesBothDays = (raised) => {
    assert.ok(raised instanceof RangeError);
    assert.ok(!(raised instanceof TransferBalanceCapExceededError), 'a misdated ledger is not a breach');
    assert.match(raised.message, /runs through 2026-08-01/); // the stated day, wrong
    assert.match(raised.message, /last of its 4 entries is dated 2026-09-01/); // the trail's day, right
    assert.match(raised.message, /s 294-40\(2\)\(a\)/);
    return true;
  };
  assert.throws(() => closingBalanceOn('2026-08-01', misdated), namesBothDays);
  assert.throws(
    () => closeDayFromLedger({ ledger: misdated, state: days, day: '2026-08-01', personalCapOnDay: cap.cap }),
    namesBothDays,
  );
  assert.throws(() => recordPensionPayment(misdated, { day: '2026-10-01', amount: $(1) }), namesBothDays);
  // The price the refusal removes, restated so a reader can check it: $2,400,000 is above the
  // $2,025,000 cap and $1,500,000 — the true 1 Aug 2026 figure — is below it, so the wrong answer
  // manufactured a breach on a day this Person did not have one.
  assert.ok($(2_400_000) > cap.cap && $(1_500_000) < cap.cap);

  // **The replacement tripwire**, for the same reason gap 1 has one: this is a runtime check, not a
  // structure. The derivation must still be in chunk 4's executable text, and it must still compare
  // the STORED day against the LAST ENTRY's day rather than against anything else.
  assert.match(code, /ledger\.entries\[ledger\.entries\.length - 1\]/);
  assert.match(code, /ledger\.throughDay !== lastEntry\.day/);

  // **The residue, and it is stated rather than implied away.** An EMPTY ledger has no last entry,
  // so its `throughDay` — the account start day, an input — is witnessed by nothing. It moves no
  // figure: a ledger with no entries reads back zero on every day, whatever day it claims to run
  // through.
  const empty = { ...openTransferBalanceLedger('2025-07-01'), throughDay: '2030-01-01' };
  assert.equal(closingBalanceOn('2030-01-01', empty), 0);
});

test('the guard is not a blanket refusal: every honestly-built ledger passes it', () => {
  // Non-vacuity for the refusal above, through the MODULE's own check rather than a local copy of
  // it: if `requireAConformingLedger` rejected everything, the test above would still pass.
  //
  // 1. The empty ledger — balance 0, no entries — conforms, and can be read and grown.
  const empty = openTransferBalanceLedger('2025-09-01');
  assert.equal(empty.entries.length, 0);
  assert.equal(closingBalanceOn('2025-09-01', empty), 0);
  assert.equal(closingBalanceOn('2030-01-01', empty), 0);

  // 2. Each of the four producers in turn, read after every step: the opener, the s 294-25(1) item 2
  //    credit, the s 294-80(1) item 1 debit, and the payment that is not a superannuation lump sum.
  //    Reading after each step is what puts every producer's output through the guard.
  let ledger = creditOnCommencement(empty, {
    startingDay: '2025-09-01',
    valueOfSupportingInterestOnStartingDay: $(1_200_000),
  });
  assert.equal(closingBalanceOn('2025-09-01', ledger), $(1_200_000));
  const seed = seedPersonalTransferBalanceCap('2025-07-01');
  let days = openTransferBalanceAccountDays('2025-09-01', seed.cap, closingBalanceOn('2025-09-01', ledger));
  ledger = recordPensionPayment(ledger, { day: '2026-03-15', amount: $(60_000) });
  assert.equal(closingBalanceOn('2026-03-15', ledger), $(1_200_000)); // a drawdown moves nothing
  ledger = recordCommutation(ledger, { dayReceived: '2026-03-15', lumpSum: $(200_000) });
  assert.equal(closingBalanceOn('2026-03-15', ledger), $(1_000_000));

  // 3. A ledger that has been credited, commuted AND paid closes a day end to end through chunk 3:
  //    the day closes at $1,000,000 and the high-water mark stays at the $1,200,000 the credit set,
  //    because no debit lowers it (s 294-40(2)(a)).
  days = closeDayFromLedger({ ledger, state: days, day: '2026-03-15', personalCapOnDay: seed.cap });
  assert.equal(days.highestEndOfDayTransferBalance, $(1_200_000));
  assert.equal(days.hasEverExceededCap, false);

  // 4. A NEGATIVE balance conforms and must: s 294-30(2) Note 2 says there is no consequence for
  //    having one, and a guard that assumed non-negativity would refuse a Person the unused cap
  //    percentage s 294-40(3) gives them.
  ledger = recordCommutation(ledger, { dayReceived: '2027-01-10', lumpSum: $(1_200_000) });
  assert.equal(closingBalanceOn('2027-01-10', ledger), -$(200_000));
  assert.equal(sumOfMovements(ledger), -$(200_000));
});

test('the ledger identity that would close gap 1 holds over every honestly-built ledger', () => {
  // Non-vacuity for the assertion above, and a rule in its own right: the three producers are the
  // only things that write a `movement`, and each writes exactly what it did to the balance —
  // `+amount` for the s 294-25(1) item 2 credit, `−amount` for the s 294-80(1) item 1 debit, and
  // exactly zero for the payment that is not a superannuation lump sum (s 307-65(1)).
  let ledger = openTransferBalanceLedger('2025-09-01');
  assert.equal(sumOfMovements(ledger), ledger.transferBalance);
  const steps = [
    (l) => creditOnCommencement(l, { startingDay: '2025-09-01', valueOfSupportingInterestOnStartingDay: $(1_200_000) }),
    (l) => recordPensionPayment(l, { day: '2026-03-15', amount: $(300_000) }),
    (l) => recordCommutation(l, { dayReceived: '2026-03-15', lumpSum: $(300_000) }),
    (l) => creditOnCommencement(l, { startingDay: '2026-09-01', valueOfSupportingInterestOnStartingDay: $(900_000) }),
    (l) => recordCommutation(l, { dayReceived: '2027-01-10', lumpSum: $(2_000_000) }), // takes it negative
  ];
  for (const step of steps) {
    ledger = step(ledger);
    assert.equal(sumOfMovements(ledger), ledger.transferBalance);
  }
  // $1,200,000 − $300,000 + $900,000 − $2,000,000 = −$200,000, and s 294-30(2) Note 2 permits it.
  assert.equal(ledger.transferBalance, -$(200_000));

  // And the label a line carries agrees with the direction it moved, which is the only thing that
  // makes the trail readable. Swapping the two labels moved no balance and failed 2 tests; writing a
  // positive `movement` on a debit while the balance still fell failed 1.
  for (const entry of ledger.entries) {
    if (entry.event.startsWith('credit')) assert.equal(entry.movement, entry.amount);
    else if (entry.event.startsWith('debit')) assert.equal(entry.movement, -entry.amount);
    else assert.equal(entry.movement, 0);
    assert.ok(entry.amount >= 0, 'direction lives in movement, never in amount');
  }
  assert.deepEqual(
    ledger.entries.map((entry) => entry.event.slice(0, entry.event.indexOf(' —'))),
    ['credit', 'no movement', 'debit', 'credit', 'debit'],
  );
});

// --- Gap 2: the T74 canary catches one parameter SHAPE, and chunk 4 uses two others ---------------

test('a characterisation cannot reach a parameter list in ANY shape, counted rather than matched', () => {
  // **What the shipped canary asserts, and what it misses.** It bans
  // `/\w+\??: WithdrawalCharacterisation\s*[,)]/`, which requires the annotation to be followed by a
  // comma or a close-paren. Two shapes evade it, and both were applied to `recordCommutation` on
  // 2026-09-16 with behaviour deliberately preserved. Each failed **ZERO** tests:
  //
  //   1. a **defaulted positional parameter** — `kind: WithdrawalCharacterisation =
  //      DEFAULT_WITHDRAWAL_CHARACTERISATION,` — where the annotation is followed by ` =`;
  //   2. an **object member** — `readonly characterisation?: WithdrawalCharacterisation;` inside the
  //      existing parameter object — where it is followed by `;`.
  //
  // Shape (2) is the likelier regression of the two, because all three producers already take an
  // object parameter and nothing else in this module takes a positional one of this kind. Shape (1)
  // is what a parameter added to a shipped function has to look like if its call sites are to keep
  // compiling. The canary's vacuity control is real — `\w+\??: PersonalTransferBalanceCap\s*[,)]`
  // does match — but it only proves the ONE shape chunk 4 never uses.
  //
  // So this pins the COUNT in executable text instead of the shape. Two occurrences: the type's own
  // declaration and the annotation on `DEFAULT_WITHDRAWAL_CHARACTERISATION`. A third, anywhere, in
  // any shape, is the characterisation arriving somewhere a function can branch on it.
  const code = executable(LEDGER_SOURCE);
  // Count and anchors, never the surrounding text: a prose pin holds a falsehood in place, and a
  // slice of neighbouring code would move the next time an unrelated line above it changed.
  assert.equal(
    (code.match(/WithdrawalCharacterisation/g) ?? []).length,
    2,
    'a WithdrawalCharacterisation reached executable text outside its own declaration and its default',
  );
  assert.match(code, /export type WithdrawalCharacterisation =/);
  assert.match(code, /export const DEFAULT_WITHDRAWAL_CHARACTERISATION: WithdrawalCharacterisation =/);

  // Vacuity: the strip must not have emptied the file, and must keep the bindings this pin reads.
  assert.match(code, /export const DEFAULT_WITHDRAWAL_CHARACTERISATION/);
  assert.match(code, /export const recordCommutation = \(/);
  assert.ok(code.length > 2000, 'the executable-only strip removed the executable text');
});

// --- Gap 3: "enforced at the seam" is asserted at a direct call, never at the seam ----------------

test('closeDayFromLedger refuses a stale ledger, and the phantom breach it would raise is $375,000', () => {
  // **The measurement.** Replacing `closingBalanceOn(input.day, input.ledger)` inside
  // `closeDayFromLedger` with a bare `input.ledger.transferBalance` — deleting the ordering guard
  // from the one seam chunk 6 will use — failed **ZERO** tests. Deleting the guard from
  // `closingBalanceOn` itself failed exactly **1**, at a single `assert.throws` on a direct call
  // bolted to the end of the same-day-netting fixture. The guard chunk 4's commit says is *"enforced
  // at the seam rather than assumed"* was asserted everywhere except at the seam.
  //
  // Priced on the §3.10.9 row above, in the direction the fixtures do not cover. The stale read is
  // HIGHER than the honest one here, so the defect is not a missed breach but an INVENTED one, on a
  // day nothing happened.
  const { ledger, days, cap } = ledgerNotBalance();

  // 1 Aug 2026: the second pension has not commenced. The honest closing balance is $1,500,000, which
  // is $525,000 UNDER the $2,025,000 cap and cannot breach.
  assert.equal($(2_025_000) - $(1_500_000), $(525_000));

  // The ledger in hand has already moved to 1 Sep 2026 and says $2,400,000 — $375,000 over the cap.
  assert.equal(ledger.throughDay, '2026-09-01');
  assert.throws(
    () => closeDayFromLedger({ ledger, state: days, day: '2026-08-01', personalCapOnDay: cap.cap }),
    (raised) => {
      assert.ok(raised instanceof RangeError);
      assert.ok(!(raised instanceof TransferBalanceCapExceededError), 'a stale read must not be reported as a breach');
      assert.match(raised.message, /no longer the CLOSING balance for 2026-08-01/);
      return true;
    },
  );

  // Non-vacuity, and the reason this is an ORDERING refusal and not a refusal to close the day: the
  // same call for the day the ledger actually reaches goes through to chunk 3's single comparison and
  // raises the real breach, with the real excess.
  assert.throws(
    () => closeDayFromLedger({ ledger, state: days, day: '2026-09-01', personalCapOnDay: cap.cap }),
    (raised) => {
      assert.ok(raised instanceof TransferBalanceCapExceededError);
      assert.match(raised.message, /\$375,000\.00/);
      return true;
    },
  );

  // And the three bypasses the brief named were tried and do not exist. A day exactly ON `throughDay`
  // is answered (the comparison is strictly greater, which is what lets a same-day credit and debit
  // net out under s 294-40(2)(a)); a ledger with no entries carries its account start day and answers
  // that day and every later one with zero; and entries out of insertion order cannot be built at all,
  // because `appended` refuses them. The only bypass is the spread in gap 1, which rewinds
  // `throughDay` and defeats both guards at once.
  const quiet = openTransferBalanceLedger('2025-09-01');
  assert.equal(closingBalanceOn('2025-09-01', quiet), 0);
  assert.equal(closingBalanceOn('2030-01-01', quiet), 0);
  assert.equal(closingBalanceOn(ledger.throughDay, ledger), $(2_400_000));
  assert.throws(
    () => recordPensionPayment(ledger, { day: '2026-08-01', amount: $(1) }),
    /recorded in date order/,
  );
});

// --- Gap 4: "there is no function that takes an earnings figure" was enforced by nothing ----------

test('no fourth mutator, and no earnings vocabulary — the absence-based negative, as a canary', () => {
  // **The measurement.** Chunk 4's header says *"there is no function in this file that takes a rate,
  // a period, a market value or an earnings figure, so there is nothing for a growth number to be
  // passed to"*. Adding an exported `recordEarnings(ledger, { day, amount })` that credits the
  // balance — the exact defect §3.10.4's first negative is a negative ABOUT, and the one the whole
  // ledger design exists to prevent — compiled clean and failed **ZERO** tests on 2026-09-16.
  //
  // Two layers, because each catches what the other misses: a named export cannot be added, and the
  // vocabulary a growth credit has to be written in cannot appear in executable text.
  assert.deepEqual(Object.keys(ledgerModule).sort(), [
    'CappedDefinedBenefitIncomeStreamNotModelledError',
    'CommutationAuthorityNotModelledError',
    'DEFAULT_WITHDRAWAL_CHARACTERISATION',
    'DeferredAndCappedDefinedBenefitCreditsNotModelledError',
    'FraudAndBankruptcyDebitsNotModelledError',
    'LRBACreditNotModelledError',
    'PaymentSplitNotModelledError',
    'StreamCeasedOutsideCommutationNotModelledError',
    'StructuredSettlementNotModelledError',
    'TransferBalanceCapExceededError',
    'UnknownPersonalTransferBalanceCapError',
    'advanceTransferBalanceDay',
    'carryPersonalCapForward',
    'closeDayFromLedger',
    'closingBalanceOn',
    'creditOnCommencement',
    'indexPersonalTransferBalanceCap',
    'openTransferBalanceAccountDays',
    'openTransferBalanceLedger',
    'recordCommutation',
    'recordPensionPayment',
    'seedPersonalTransferBalanceCap',
    'transferBalanceAccountDaysAsStated',
  ]);

  // Three functions and no fourth, counted at the one place a line can be written: `appended` is
  // module-private and is the sole writer of the trail, so the number of its call sites IS the number
  // of things that can move the transfer balance.
  const code = executable(CHUNK_4);
  assert.equal((code.match(/\bappended\(/g) ?? []).length, 3, 'a fourth thing can now write a ledger line');

  // The vocabulary a growth credit cannot be written without, in executable text only — chunk 4's
  // prose discusses every one of these at length, and none of them is a code path. `interest` is NOT
  // on this list: `valueOfSupportingInterestOnStartingDay` is a superannuation interest under
  // s 307-205, which is the thing being valued once, not a return on it.
  for (const word of ['earning', 'growth', 'market', 'rate', 'yield', 'valuation', 'accrual', 'performance']) {
    assert.ok(!new RegExp(word, 'i').test(code), `chunk 4 grew a "${word}" identifier: growth is no longer invisible`);
  }

  // Vacuity: the strip keeps the identifiers, and the words really are in the prose it removed.
  assert.match(code, /export const creditOnCommencement = \(/);
  assert.match(code, /valueOfSupportingInterestOnStartingDay/);
  // Derivation 3 — flattened prose, because the claim wraps across comment lines and a naive grep of
  // the raw text cannot see it.
  const prose = CHUNK_4.replace(/^\s*\/\/ ?/gm, '').replace(/\s+/g, ' ');
  assert.match(prose, /takes a rate, a period, a market value or an earnings figure/);
  assert.match(prose, /nothing for a growth number to be passed to/);
});
