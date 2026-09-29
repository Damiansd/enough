// P3-9 chunk 4 — the transfer balance ledger proper (§3.10.4): item 2 credits, item 1 debits, and
// the two negatives that are the reason the ledger is a ledger.
//
// **The one sentence every fixture below is about.** The transfer balance account is a cumulative
// record of capital moved into retirement phase, **not** a valuation of retirement-phase assets. A
// pension started at $1.6m and now worth $900k still carries a $1.6m transfer balance and **zero**
// remaining cap space; a pension started at $1.1m and now worth $2.0m still carries $1.1m and has
// headroom a balance-based estimate would deny. §3.10.4 calls the error from using the balance
// *"unsigned and unbounded in both directions"*, and that is why the first fixture here prices the
// $1.6m-now-worth-$900k case in full and states the balance-based answer beside it.
//
// **The two negatives are tested in two different shapes, on purpose.** The definitional one — a
// pension drawdown is not a superannuation lump sum (s 307-65(1)) so it can never be a s 294-80(1)
// item 1 debit — has a function of its own, `recordPensionPayment`, whose entry says the payment
// happened and moved nothing, so it can be asserted in dollars. The absence-based one — no item of
// the s 294-25(1) table is triggered by growth — has no function at all, so it is asserted by
// running an account whose market value rises $350,000 and showing the ledger and the cap are the
// figures they would have been had nothing happened.
//
// **Where every figure comes from, and where the register is SILENT.** Each expected number is
// either §3.10.9's own hand-worked answer or is derived here, line by line, from a primary-verified
// row of §3.10.1/§3.10.2/§3.10.3. Nothing was read off an implementation. Three silences are named
// where they fall rather than papered over:
//
//   1. §3.10.9's *"Ledger, not balance"* and *"Growth is invisible"* rows give **no personal cap**
//      and no general-cap year for the breach they assert. The caps below are derived here from the
//      published general-cap series, and the derivation is shown.
//   2. Those two rows, and *"Account survives commutation"*, are dated FY2027-28 to FY2034-35. The
//      general-cap series `superCaps.ts` serves stops at **FY2026-27** — the December 2026 quarter
//      is the last index number the register publishes, and O5 forbids growing a cap by an assumed
//      rate — so `generalTransferBalanceCap('2027-28')` raises `MissingIndexNumberError`. Each of
//      those fixtures is **re-dated** into the window the series covers, keeping the register's
//      arithmetic exactly and saying so at the fixture.
//   3. LCR 2016/9 ¶51 (Alice, a same-day credit and debit on 1 July 2017) is cited by §3.10.3 for
//      the rule, and neither the register nor this file has the ruling's own figures. The amounts in
//      that fixture are **constructed here** to make the rule bite, and are labelled as constructed.
//
// **Every fixture spans two financial years or more.** Not decoration: a ledger is a claim about
// what persists, and the whole of §3.10.4 is the claim that a figure taken once on a commencement
// day survives everything that happens afterwards. A single-year test of that asserts nothing.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  DEFAULT_WITHDRAWAL_CHARACTERISATION,
  TransferBalanceCapExceededError,
  advanceTransferBalanceDay,
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
const SRC = join(ROOT, 'src');
const LEDGER_SOURCE = readFileSync(join(SRC, 'core', 'transferBalanceAccount.ts'), 'utf8');
/** Chunk 4's own section of the module, for canaries that must not be satisfied by chunk 2's prose. */
const CHUNK_4 = LEDGER_SOURCE.slice(LEDGER_SOURCE.indexOf('// --- Chunk 4 —'));

/** Dollars to cents, so every expected figure reads as the register writes it. */
const $ = (dollars) => dollars * 100;

/** Chunk 2's s 294-40 arithmetic over chunk 3's state — the seam, exercised the way chunk 6 will. */
const index = (fy, state, accountStartDay, capPrevFY, provenance) =>
  indexPersonalTransferBalanceCap(
    fy,
    carryPersonalCapForward(state, { accountStartDay, capPrevFY, provenanceOfCapPrevFY: provenance }),
  );

// --- §3.10.4's own sentence, priced: $1.6m in, worth $900k, zero headroom -------------------------

test('a pension started at $1.6m and now worth $900k carries $1.6m and ZERO cap space', () => {
  // The account starts 1 Sep 2017, so s 294-35(1) seeds the personal cap from the FY2017-18 general
  // cap: $1,600,000 (register §3.1 — the unindexed base amount of s 294-35(3), primary-verified).
  const seed = seedPersonalTransferBalanceCap('2017-09-01');
  assert.equal(seed.fy, '2017-18');
  assert.equal(seed.cap, $(1_600_000));

  // One s 294-25(1) item 2 credit, valued on the STARTING DAY, and nothing else ever.
  let ledger = openTransferBalanceLedger('2017-09-01');
  assert.equal(ledger.transferBalance, 0);
  ledger = creditOnCommencement(ledger, {
    startingDay: '2017-09-01',
    valueOfSupportingInterestOnStartingDay: $(1_600_000),
  });
  assert.equal(ledger.transferBalance, $(1_600_000));

  // Four and a half years of drawdowns and poor returns take the ACCOUNT to $900,000. Every one of
  // these is a pension payment: s 294-80(1) item 1 needs a superannuation lump sum, and s 307-65(1)
  // defines one as a benefit that is NOT a superannuation income stream benefit. Each is recorded
  // and then its day is closed, which is the order a projection runs in: every event of a day
  // reaches the ledger before the day's closing balance is taken (s 294-40(2)(a)).
  let days = openTransferBalanceAccountDays('2017-09-01', seed.cap, closingBalanceOn('2017-09-01', ledger));
  for (const day of ['2018-03-15', '2019-03-15', '2020-03-15', '2021-03-15', '2022-03-15']) {
    ledger = recordPensionPayment(ledger, { day, amount: $(80_000) });
    // Five days across FIVE financial years. The balance the cap is tested against is $1,600,000 on
    // every one of them, which EQUALS the cap and so is not a breach: §3.10.5's comparison is
    // strictly greater.
    days = closeDayFromLedger({ ledger, state: days, day, personalCapOnDay: seed.cap });
  }
  // $400,000 of payments and the rest of the fall is market value. The ledger saw neither.
  assert.equal(ledger.transferBalance, $(1_600_000));
  assert.equal(ledger.entries.filter((e) => e.movement !== 0).length, 1);
  assert.equal(days.highestEndOfDayTransferBalance, $(1_600_000));
  assert.equal(days.highestBalanceDay, '2017-09-01');

  // The cap, year by year. The general cap is $1,600,000 for FY2017-18 through FY2020-21 and
  // $1,700,000 for FY2021-22, so s 294-40 runs on a $0 increase three times and on $100,000 once.
  let cap = seed;
  for (const fy of ['2018-19', '2019-20', '2020-21']) {
    cap = index(fy, days, '2017-09-01', cap.cap, cap.provenance);
    assert.equal(cap.cap, $(1_600_000));
    assert.equal(cap.indexationIncrease, 0);
  }
  cap = index('2021-22', days, '2017-09-01', cap.cap, cap.provenance);
  // LCR 2016/9 Example A2, which §3.10.9 carries in terms: a $1.6m credit against a $1.6m cap is
  // 100% used, 0% unused, and the cap is $1,600,000 in FY2021-22 and for ever.
  assert.equal(cap.indexationIncrease, $(100_000));
  assert.equal(cap.unusedCapPercentage, 0);
  assert.equal(cap.cap, $(1_600_000));

  // ZERO remaining cap space — §3.10.4's own words, in dollars.
  assert.equal(cap.cap - ledger.transferBalance, 0);

  // And the balance-based answer, stated beside it so the fixture fails loudly rather than drifting.
  // Reading the $900,000 account value as the transfer balance gives a used percentage of
  // floor(100 × 900,000 / 1,600,000) = floor(56.25) = 56, so 44% unused, so 44% of the $100,000
  // FY2021-22 increase is $44,000 and the cap reads $1,644,000 — and the headroom reads
  // $1,644,000 − $900,000 = $744,000 of room this Person does not have one cent of.
  const wrongUnused = 100 - Math.floor((100 * $(900_000)) / $(1_600_000));
  assert.equal(wrongUnused, 44);
  const wrongCap = $(1_600_000) + (wrongUnused * $(100_000)) / 100;
  assert.equal(wrongCap, $(1_644_000));
  assert.equal(wrongCap - $(900_000), $(744_000));
  assert.notEqual(cap.cap, wrongCap);
});

// --- Growth is invisible: the absence-based negative, asserted by an account that grew -----------

test('an $1.8m pension that grows to $2.15m stays at $1,800,000 and does not breach', () => {
  // §3.10.9's "Growth is invisible" row: "$1.8m pension grows to $2.15m over five years, no further
  // contributions → transfer balance stays $1,800,000 and the tool must NOT report a breach". The
  // row states no years and no cap. RE-DATED to 1 Jul 2023 → FY2026-27, which is the widest window
  // the published general-cap series covers, and the cap is derived below.
  const seed = seedPersonalTransferBalanceCap('2023-07-01');
  assert.equal(seed.fy, '2023-24');
  assert.equal(seed.cap, $(1_900_000)); // register §3.1, FY2023-24 general cap

  let ledger = openTransferBalanceLedger('2023-07-01');
  ledger = creditOnCommencement(ledger, {
    startingDay: '2023-07-01',
    valueOfSupportingInterestOnStartingDay: $(1_800_000),
  });

  // There is no second event. The interest grows to $2,150,000 and no function in the module can be
  // handed that figure: growth triggers no item of the s 294-25(1) table, which is the weaker of
  // §3.10.4's two negatives — an argument from the absence of a table item, not a definition.
  assert.equal(ledger.entries.length, 1);
  assert.equal(ledger.transferBalance, $(1_800_000));

  // Used: floor(100 × 1,800,000 / 1,900,000) = floor(94.736…) = 94. Unused: 6, and it is recomputed
  // from the all-time high every year (T64), never cached, so it is 6 in each year below.
  let days = openTransferBalanceAccountDays('2023-07-01', seed.cap, closingBalanceOn('2023-07-01', ledger));
  let cap = seed;

  // FY2024-25: the general cap does not move (both $1,900,000), so s 294-40(1)(a) carries it.
  cap = index('2024-25', days, '2023-07-01', cap.cap, cap.provenance);
  assert.equal(cap.cap, $(1_900_000));
  assert.equal(cap.indexationIncrease, 0);
  days = closeDayFromLedger({ ledger, state: days, day: '2024-11-30', personalCapOnDay: cap.cap });

  // FY2025-26: $1,900,000 → $2,000,000, an increase of $100,000, of which 6% is $6,000.
  cap = index('2025-26', days, '2023-07-01', cap.cap, cap.provenance);
  assert.equal(cap.unusedCapPercentage, 6);
  assert.equal(cap.cap, $(1_906_000));
  days = closeDayFromLedger({ ledger, state: days, day: '2025-11-30', personalCapOnDay: cap.cap });

  // FY2026-27: $2,000,000 → $2,100,000, another $100,000, another $6,000.
  cap = index('2026-27', days, '2023-07-01', cap.cap, cap.provenance);
  assert.equal(cap.unusedCapPercentage, 6);
  assert.equal(cap.cap, $(1_912_000));
  days = closeDayFromLedger({ ledger, state: days, day: '2026-11-30', personalCapOnDay: cap.cap });

  // Four financial years, no breach, and the mark never moved off the commencement-day figure.
  assert.equal(days.highestEndOfDayTransferBalance, $(1_800_000));
  assert.equal(days.highestBalanceDay, '2023-07-01');

  // The wrong answer, priced: had the grown ACCOUNT VALUE been read as the transfer balance, the
  // same day would have been $2,150,000 against a $1,912,000 cap — a refusal, by $238,000, raised
  // against a Person who has done nothing but leave their pension alone.
  assert.equal($(2_150_000) - $(1_912_000), $(238_000));
  assert.throws(
    () =>
      advanceTransferBalanceDay({
        state: days,
        day: '2027-01-15',
        closingBalance: $(2_150_000),
        personalCapOnDay: cap.cap,
      }),
    TransferBalanceCapExceededError,
  );
});

// --- Ledger, not balance: the second commencement that a balance reading lets through ------------

test('$1.5m then $900k is $2,400,000 and breaches, where the balance reading is $2,000,000 and does not', () => {
  // §3.10.9's "Ledger, not balance" row: "$1.5m pension commenced 1 Jul 2027; run to 30 Jun 2035
  // with drawdowns exceeding earnings so the account falls to $1.1m; then commence a second pension
  // with $900k → transfer balance $2,400,000 (not $2,000,000), and the second commencement is a
  // BREACH". RE-DATED to 1 Jul 2025 → 1 Sep 2026 (the register's years are outside the published
  // general-cap series) and compressed to two financial years; the register states no cap for it, so
  // the cap is derived below and the breach is asserted against the derived figure.
  const seed = seedPersonalTransferBalanceCap('2025-07-01');
  assert.equal(seed.fy, '2025-26');
  assert.equal(seed.cap, $(2_000_000)); // register §3.1, FY2025-26 general cap

  let ledger = openTransferBalanceLedger('2025-07-01');
  ledger = creditOnCommencement(ledger, {
    startingDay: '2025-07-01',
    valueOfSupportingInterestOnStartingDay: $(1_500_000),
  });
  let days = openTransferBalanceAccountDays('2025-07-01', seed.cap, closingBalanceOn('2025-07-01', ledger));

  // Drawdowns exceeding earnings: $500,000 of pension payments across FY2025-26, against which the
  // interest earned about $100,000, leaving the ACCOUNT at $1,100,000 on 30 Jun 2026. Not one cent
  // of either figure reaches the ledger.
  for (const day of ['2025-12-15', '2026-05-20']) {
    ledger = recordPensionPayment(ledger, { day, amount: $(250_000) });
    days = closeDayFromLedger({ ledger, state: days, day, personalCapOnDay: seed.cap });
  }
  assert.equal(ledger.transferBalance, $(1_500_000));
  days = closeDayFromLedger({ ledger, state: days, day: '2026-06-30', personalCapOnDay: seed.cap });

  // FY2026-27: used = floor(100 × 1,500,000 / 2,000,000) = 75, unused 25, and 25% of the $100,000
  // increase ($2,000,000 → $2,100,000) is $25,000.
  const cap = index('2026-27', days, '2025-07-01', seed.cap, seed.provenance);
  assert.equal(cap.unusedCapPercentage, 25);
  assert.equal(cap.cap, $(2_025_000));

  // The second pension commences. s 294-25(1) item 2 again, valued on ITS starting day.
  ledger = creditOnCommencement(ledger, {
    startingDay: '2026-09-01',
    valueOfSupportingInterestOnStartingDay: $(900_000),
  });
  assert.equal(ledger.transferBalance, $(2_400_000)); // §3.10.9's own figure

  // R1: the year containing that day is not projected. The excess is $2,400,000 − $2,025,000.
  assert.throws(
    () => closeDayFromLedger({ ledger, state: days, day: '2026-09-01', personalCapOnDay: cap.cap }),
    (raised) => {
      assert.ok(raised instanceof TransferBalanceCapExceededError);
      assert.match(raised.message, /\$375,000\.00/);
      return true;
    },
  );

  // And the answer a balance reading gives, which is the whole reason the register writes this row:
  // $1,100,000 of remaining account value plus $900,000 is $2,000,000, which is UNDER the
  // $2,025,000 cap — so the commencement sails through and a real breach goes unreported.
  assert.equal($(1_100_000) + $(900_000), $(2_000_000));
  assert.ok($(2_000_000) < cap.cap);
  const wrong = advanceTransferBalanceDay({
    state: days,
    day: '2026-09-01',
    closingBalance: $(2_000_000),
    personalCapOnDay: cap.cap,
  });
  assert.equal(wrong.highestEndOfDayTransferBalance, $(2_000_000));
});

// --- The definitional negative, in dollars: the same cashflow, characterised two ways ------------

test('a $300,000 commutation debits and a $300,000 pension payment does not — $300,000 of cap space apart', () => {
  // §3.10.9's high-water-mark row, worked in the register: "$1.2m credit 1 Sep 2025; $300k debit
  // 15 Mar 2026; FY2026-27 increase $100,000 → 60% used → 40% → +$40,000 → $2,040,000 (not
  // $2,055,000); headroom $1,140,000". Chunk 3 asserted that row from STATED closing balances. Here
  // the ledger produces them, and the same cashflow is run a second time as a pension payment.
  const seed = seedPersonalTransferBalanceCap('2025-09-01');
  assert.equal(seed.cap, $(2_000_000));

  // One run, parameterised only by WHICH FUNCTION is called on 15 Mar 2026 — never by a flag handed
  // to one function. Two financial years each: the withdrawal year and the year after it.
  const run = (withdraw) => {
    let ledger = creditOnCommencement(openTransferBalanceLedger('2025-09-01'), {
      startingDay: '2025-09-01',
      valueOfSupportingInterestOnStartingDay: $(1_200_000),
    });
    let days = openTransferBalanceAccountDays('2025-09-01', seed.cap, closingBalanceOn('2025-09-01', ledger));
    ledger = withdraw(ledger);
    days = closeDayFromLedger({ ledger, state: days, day: '2026-03-15', personalCapOnDay: seed.cap });
    const cap = index('2026-27', days, '2025-09-01', seed.cap, seed.provenance);
    days = closeDayFromLedger({ ledger, state: days, day: '2026-09-01', personalCapOnDay: cap.cap });
    return { ledger, cap, days };
  };

  // (a) The member commutes. s 294-80(1) item 1: the debit is the lump sum, on the day received.
  const a = run((ledger) => recordCommutation(ledger, { dayReceived: '2026-03-15', lumpSum: $(300_000) }));
  assert.equal(a.ledger.transferBalance, $(900_000));
  assert.equal(a.ledger.entries[1].movement, -$(300_000));

  // (b) The member draws a pension. Same $300,000, same day, same account. No debit.
  const b = run((ledger) => recordPensionPayment(ledger, { day: '2026-03-15', amount: $(300_000) }));
  assert.equal(b.ledger.transferBalance, $(1_200_000));
  assert.equal(b.ledger.entries[1].movement, 0);
  assert.equal(b.ledger.entries[1].amount, $(300_000)); // recorded, and visible, and moving nothing
  assert.match(b.ledger.entries[1].event, /not a superannuation lump sum \(s 307-65\(1\)\)/);

  // Both reach the register's $2,040,000: the mark is monotone, so the commutation cannot lower it
  // (T59, T84), and the drawdown was never a candidate to.
  assert.equal(a.cap.unusedCapPercentage, 40);
  assert.equal(a.cap.cap, $(2_040_000));
  assert.equal(b.cap.cap, $(2_040_000));
  assert.equal(a.days.highestEndOfDayTransferBalance, $(1_200_000));
  assert.equal(b.days.highestEndOfDayTransferBalance, $(1_200_000));

  // The headroom is where the two part company, and it is the whole of T74 in one line. The
  // register states $1,140,000 for (a), and that is exactly what (b) would read if a drawdown
  // debited the account — $300,000 of cap space the drawing member does not have.
  assert.equal(a.cap.cap - a.ledger.transferBalance, $(1_140_000));
  assert.equal(b.cap.cap - b.ledger.transferBalance, $(840_000));
  assert.equal($(1_140_000) - $(840_000), $(300_000));
});

// --- Same-day netting: the end-of-day rule the ledger has to leave room for ----------------------

test('a credit and a debit on the same day net out, and the intraday spike never happened', () => {
  // §3.10.3, citing LCR 2016/9 ¶51: Alice takes a credit and a debit on 1 July 2017 and "must have
  // NEVER had an excess and must REMAIN eligible for indexation". The ruling's own amounts are not
  // in the register and are not known here; the $1,700,000 and $100,000 below are CONSTRUCTED so the
  // intraday figure breaches the $1,600,000 FY2017-18 cap and the closing figure does not.
  const seed = seedPersonalTransferBalanceCap('2017-07-01');
  assert.equal(seed.cap, $(1_600_000));

  let ledger = openTransferBalanceLedger('2017-07-01');
  ledger = creditOnCommencement(ledger, {
    startingDay: '2017-07-01',
    valueOfSupportingInterestOnStartingDay: $(1_700_000),
  });
  ledger = recordCommutation(ledger, { dayReceived: '2017-07-01', lumpSum: $(100_000) });
  assert.equal(ledger.entries.length, 2);
  assert.equal(closingBalanceOn('2017-07-01', ledger), $(1_600_000));

  // The end-of-day figure equals the cap, and equalling is not exceeding (§3.10.5).
  let days = openTransferBalanceAccountDays('2017-07-01', seed.cap, closingBalanceOn('2017-07-01', ledger));
  assert.equal(days.hasEverExceededCap, false);

  // The intraday figure would have breached by $100,000. It is not a figure the ledger can be asked
  // for — there is no shape in which two balances for one day both reach the day machinery.
  assert.throws(() => openTransferBalanceAccountDays('2017-07-01', seed.cap, $(1_700_000)), TransferBalanceCapExceededError);

  // Alice REMAINS eligible for indexation, which is a different claim from "gets an increase". In
  // FY2021-22 the general cap rises $100,000 and she is 100% used, so she is eligible and gets 0% —
  // `unusedCapPercentage` is the number 0, not `null`, which is what a s 294-40(1)(b) disqualification
  // would have returned.
  days = closeDayFromLedger({ ledger, state: days, day: '2018-06-29', personalCapOnDay: seed.cap });
  let cap = seed;
  for (const fy of ['2018-19', '2019-20', '2020-21', '2021-22']) {
    cap = index(fy, days, '2017-07-01', cap.cap, cap.provenance);
  }
  assert.equal(cap.fy, '2021-22');
  assert.equal(cap.unusedCapPercentage, 0);
  assert.equal(cap.cap, $(1_600_000));

  // And the end-of-day rule is enforced at the seam rather than assumed: once the ledger has moved
  // to a later day, the earlier day's closing balance is no longer in hand and is refused.
  const later = recordPensionPayment(ledger, { day: '2017-07-02', amount: $(1_000) });
  assert.throws(() => closingBalanceOn('2017-07-01', later), /no longer the CLOSING balance/);
});

// --- The account survives a full commutation, and is never re-seeded -----------------------------

test('a full commutation is item 1, and the account it empties keeps its original seeding year', () => {
  // §3.10.9's "Account survives commutation" row: "commence $1m in FY2027-28, fully commute in
  // FY2030-31, commence again in FY2034-35 → the personal cap is still seeded from FY2027-28, not
  // FY2034-35". RE-DATED to FY2018-19 / FY2020-21 / FY2023-24, which the published general-cap
  // series reaches; the register states no cap for this row, so the caps are derived below.
  const seed = seedPersonalTransferBalanceCap('2018-07-01');
  assert.equal(seed.fy, '2018-19');
  assert.equal(seed.cap, $(1_600_000));

  let ledger = openTransferBalanceLedger('2018-07-01');
  ledger = creditOnCommencement(ledger, {
    startingDay: '2018-07-01',
    valueOfSupportingInterestOnStartingDay: $(1_000_000),
  });
  // A FULL commutation, and it is s 294-80(1) item 1, not item 6 (T82): item 6 is conditioned on
  // "items 1 and 5 do not apply", so a full commutation paid as a lump sum never reaches it. There
  // is one debit function here and it does not ask whether the commutation was full or partial.
  let days = openTransferBalanceAccountDays('2018-07-01', seed.cap, closingBalanceOn('2018-07-01', ledger));
  ledger = recordCommutation(ledger, { dayReceived: '2021-03-15', lumpSum: $(1_000_000) });
  assert.equal(ledger.transferBalance, 0);
  assert.equal(ledger.entries[1].event, 'debit — s 294-80(1) item 1: a superannuation lump sum on commutation');
  days = closeDayFromLedger({ ledger, state: days, day: '2021-03-15', personalCapOnDay: seed.cap });
  // The account is empty and the high-water mark is exactly where it was (T59).
  assert.equal(days.highestEndOfDayTransferBalance, $(1_000_000));

  // Used: floor(100 × 1,000,000 / 1,600,000) = floor(62.5) = 62. Unused: 38, for every year below.
  // FY2019-20 and FY2020-21 see no general-cap rise; FY2021-22 rises $100,000 (38% = $38,000);
  // FY2022-23 none; FY2023-24 rises $200,000 ($1.7m → $1.9m), of which 38% is $76,000.
  let cap = seed;
  for (const fy of ['2019-20', '2020-21']) cap = index(fy, days, '2018-07-01', cap.cap, cap.provenance);
  assert.equal(cap.cap, $(1_600_000));
  cap = index('2021-22', days, '2018-07-01', cap.cap, cap.provenance);
  assert.equal(cap.unusedCapPercentage, 38);
  assert.equal(cap.cap, $(1_638_000));
  cap = index('2022-23', days, '2018-07-01', cap.cap, cap.provenance);
  assert.equal(cap.cap, $(1_638_000));
  cap = index('2023-24', days, '2018-07-01', cap.cap, cap.provenance);
  assert.equal(cap.indexationIncrease, $(200_000));
  assert.equal(cap.cap, $(1_714_000));

  // The Person commences again, five years and one empty account later.
  ledger = creditOnCommencement(ledger, {
    startingDay: '2023-09-01',
    valueOfSupportingInterestOnStartingDay: $(1_200_000),
  });
  assert.equal(ledger.transferBalance, $(1_200_000));
  days = closeDayFromLedger({ ledger, state: days, day: '2023-09-01', personalCapOnDay: cap.cap });
  assert.equal(days.highestEndOfDayTransferBalance, $(1_200_000));
  assert.equal(days.personalCapOnHighestBalanceDay, $(1_714_000));

  // The wrong answer the register's row is written against: re-seeding the account from the year of
  // the SECOND commencement would give the FY2023-24 general cap, $1,900,000 — $186,000 of cap
  // space more than this Person has, and permanently, because every later year indexes off it.
  assert.equal($(1_900_000) - $(1_714_000), $(186_000));
  assert.equal(seedPersonalTransferBalanceCap('2023-09-01').cap, $(1_900_000));
  assert.notEqual(cap.cap, $(1_900_000));

  // One more year, to show the recommencement moved the denominator and not the seeding year:
  // used = floor(100 × 1,200,000 / 1,714,000) = floor(70.011…) = 70, unused 30, 30% of the
  // FY2025-26 increase of $100,000 is $30,000.
  cap = index('2024-25', days, '2018-07-01', cap.cap, cap.provenance);
  assert.equal(cap.cap, $(1_714_000));
  cap = index('2025-26', days, '2018-07-01', cap.cap, cap.provenance);
  assert.equal(cap.unusedCapPercentage, 30);
  assert.equal(cap.cap, $(1_744_000));
});

// --- Shape rules the fixtures above rely on ------------------------------------------------------

test('a debit may take the transfer balance negative, and nothing clamps it', () => {
  // s 294-30(2) Note 2: "There is no consequence for having a negative transfer balance", and
  // §3.10.5 says in terms do NOT refuse on one — a clamp at zero would destroy exactly what
  // s 294-40(3) reads, since a negative high-water mark is what makes the unused percentage 100%.
  //
  // **§3.10.9's negative-balance row cannot be built through chunk 4 and this file does not pretend
  // otherwise.** That row reaches −$200,000 through a $500,000 STRUCTURED SETTLEMENT debit, which is
  // s 294-80(1) item 2 and is `StructuredSettlementNotModelledError` — a refusal, not a function. So
  // what is asserted here is only the absence of a clamp on the one debit this tool does compute.
  let ledger = openTransferBalanceLedger('2025-09-01');
  ledger = creditOnCommencement(ledger, {
    startingDay: '2025-09-01',
    valueOfSupportingInterestOnStartingDay: $(300_000),
  });
  ledger = recordCommutation(ledger, { dayReceived: '2026-03-15', lumpSum: $(500_000) });
  assert.equal(ledger.transferBalance, -$(200_000));
  assert.ok(!/Math\.max\(0/.test(CHUNK_4), 'a clamp at zero would hide exactly what s 294-40(3) reads');
});

test('events are recorded in date order, several may share a day, and none may be negative', () => {
  let ledger = openTransferBalanceLedger('2025-09-01');
  ledger = creditOnCommencement(ledger, {
    startingDay: '2025-09-01',
    valueOfSupportingInterestOnStartingDay: $(1_000_000),
  });
  ledger = recordPensionPayment(ledger, { day: '2026-07-10', amount: $(50_000) });
  // Same day, twice, across the year boundary the first event sat on: permitted, because the rule
  // is about the END of a day (s 294-40(2)(a)).
  ledger = recordCommutation(ledger, { dayReceived: '2026-07-10', lumpSum: $(100_000) });
  assert.equal(ledger.transferBalance, $(900_000));
  assert.equal(ledger.entries.length, 3);
  assert.throws(() => recordPensionPayment(ledger, { day: '2026-07-09', amount: $(1) }), /recorded in date order/);
  // A negative amount is a credit arriving through the debit door, or the reverse.
  assert.throws(
    () => recordCommutation(ledger, { dayReceived: '2026-08-01', lumpSum: -$(50_000) }),
    /cannot have a negative amount/,
  );
  assert.throws(
    () => creditOnCommencement(ledger, { startingDay: '2026-08-01', valueOfSupportingInterestOnStartingDay: -$(50_000) }),
    /cannot have a negative amount/,
  );
});

// --- O47, and the shape that keeps the two negatives apart ---------------------------------------

test('the characterisation defaults to pensionPayment, which does not invent headroom (T81)', () => {
  // §3.10.4: "Default the characterisation to `pensionPayment` — the direction that does not invent
  // headroom (T81)." Defaulting the other way debits the account for a withdrawal the member never
  // elected to commute, manufacturing cap space out of an ordinary drawdown.
  assert.equal(DEFAULT_WITHDRAWAL_CHARACTERISATION, 'pensionPayment');
});

test('no function takes a characterisation and branches on it (T74)', () => {
  // **Read this for what it is: an assertion about the TEXT of a source file, not a compile check.**
  // The structural claim is real but is a claim about API shape — there is no parameter whose value
  // a mutation can flip, because the two events have two entry points — and no `.mjs` test can
  // observe a shape that does not exist. What the canary can do is fail if someone adds one.
  assert.match(LEDGER_SOURCE, /export type WithdrawalCharacterisation = 'pensionPayment' \| 'partialCommutation';/);
  assert.ok(
    !/\w+\??: WithdrawalCharacterisation\s*[,)]/.test(LEDGER_SOURCE),
    'a characterisation reached a parameter list: the two negatives are now one branch',
  );
  // Vacuity guard: the same regex must find a parameter annotation that DOES exist, or its finding
  // nothing proves nothing about what is in the file.
  assert.match(LEDGER_SOURCE, /\w+\??: PersonalTransferBalanceCap\s*[,)]/);

  // The two entry points, by name, and the third that is the credit.
  for (const fn of ['creditOnCommencement', 'recordCommutation', 'recordPensionPayment']) {
    assert.match(LEDGER_SOURCE, new RegExp(`export const ${fn} = \\(`), `${fn} has moved or been merged`);
  }

  // `recordPensionPayment` contains NO arithmetic operator: the balance it writes is the balance it
  // was handed. There is nothing in that function for a sign mutation to invert.
  const start = LEDGER_SOURCE.indexOf('export const recordPensionPayment = (');
  const body = LEDGER_SOURCE.slice(start, LEDGER_SOURCE.indexOf('\n\n', start));
  assert.ok(body.length > 100 && body.includes('appended('), 'the drawdown function could not be located in the source');
  // String literals out first — the statutory citations in the entry's own label are full of
  // hyphens ('s 307-65(1)'), and none of them is arithmetic.
  const code = body.replace(/'[^']*'/g, "''");
  assert.ok(code.includes("event: ''"), 'the label was not where the literal-stripping expected it');
  assert.ok(!/[+\-]/.test(code), 'an arithmetic operator appeared in the drawdown path');
  assert.match(body, /movement: 0 as Cents/);
  assert.match(body, /ledger\.transferBalance,/);
});

test('the chunk-4 header reproduces §3.10.4 two confidence rows rather than summarising them', () => {
  // §3.10.4: "the two must not be flattened into one label". Both negatives are enforced by the
  // absence of a code path, so the code cannot carry the difference and the prose has to.
  assert.match(LEDGER_SOURCE, /ARGUMENT FROM THE ABSENCE OF A TABLE ITEM/);
  assert.match(LEDGER_SOURCE, /POSITIVE DEFINITIONAL[\s\S]{0,40}EXCLUSION, not an absence/);
  assert.match(LEDGER_SOURCE, /Stronger than the row above, and the two must not be flattened/);
  // And the sentence that says which one a future pass could falsify without touching the other.
  assert.match(LEDGER_SOURCE, /enumeration being read as closed/);
});

// --- O66 batch 2 — §B's remainder: the two rows nothing was asserting -----------------------------
//
// Both tests below were written against a measured survivor, not added for symmetry. On 2026-09-16
// the mutations they now fail against failed **zero** tests apiece: the breach refusal's
// remediation sentence could be rewritten to recommend a larger pension payment (T76), and the
// s 294-80(1) item 1 debit could be dated the ledger's previous `throughDay` — item 6's stop day —
// instead of the day the lump sum was received (T82).

test('a drawdown is worth NOTHING against an excess, and a commutation is worth all of it (T76)', () => {
  // §1's T76 fixture, in its own figures: a transfer balance of $2,200,000 against a cap of
  // $2,100,000, where "the only remediation the tool may emit is a commutation of at least the
  // excess; any suggestion framed as an increased pension payment is a failure". LCR 2016/9 ¶25 is
  // the authority: a large pension drawdown does not reduce the transfer balance.
  //
  // $2,100,000 is the FY2026-27 general cap, which s 294-35(1) seeds the personal cap from, and
  // FY2026-27 is the last year the published CPI series reaches (O5, O40) — so unlike the other
  // fixtures in this file this one does not span two years, and it does not need to: the claim
  // under test is about which act moves an excess on one day, not about what persists.
  const seed = seedPersonalTransferBalanceCap('2026-07-01');
  assert.equal(seed.fy, '2026-27');
  assert.equal(seed.cap, $(2_100_000));

  let ledger = openTransferBalanceLedger('2026-07-01');
  ledger = creditOnCommencement(ledger, {
    startingDay: '2026-07-01',
    valueOfSupportingInterestOnStartingDay: $(2_000_000),
  });
  let days = openTransferBalanceAccountDays('2026-07-01', seed.cap, closingBalanceOn('2026-07-01', ledger));
  // A second stream commences on 3 August 2026 and takes the account $100,000 over.
  ledger = creditOnCommencement(ledger, {
    startingDay: '2026-08-03',
    valueOfSupportingInterestOnStartingDay: $(200_000),
  });
  assert.equal(closingBalanceOn('2026-08-03', ledger), $(2_200_000));
  assert.equal($(2_200_000) - $(2_100_000), $(100_000));

  // **The wrong remedy, priced.** $150,000 of pension payments — half again the excess — on the same
  // day leaves the transfer balance exactly where it was, because a pension payment is not a
  // superannuation lump sum (s 307-65(1)) and so is not a s 294-80(1) item 1 debit.
  const drawn = recordPensionPayment(ledger, { day: '2026-08-03', amount: $(150_000) });
  assert.equal(closingBalanceOn('2026-08-03', drawn), $(2_200_000));
  let message = '';
  assert.throws(
    () => closeDayFromLedger({ ledger: drawn, state: days, day: '2026-08-03', personalCapOnDay: seed.cap }),
    (raised) => {
      assert.ok(raised instanceof TransferBalanceCapExceededError);
      message = raised.message;
      // The excess is unmoved by the $150,000: still $100,000, to the cent.
      assert.match(raised.message, /by \$100,000\.00\./);
      return true;
    },
  );

  // **The right remedy, priced on the same day from the same ledger.** A commutation of exactly the
  // excess brings the balance to the cap, and equalling the cap is not exceeding it — the day closes.
  const commuted = recordCommutation(ledger, { dayReceived: '2026-08-03', lumpSum: $(100_000) });
  assert.equal(closingBalanceOn('2026-08-03', commuted), $(2_100_000));
  days = closeDayFromLedger({ ledger: commuted, state: days, day: '2026-08-03', personalCapOnDay: seed.cap });
  assert.equal(days.highestEndOfDayTransferBalance, $(2_100_000));
  assert.equal(days.hasEverExceededCap, false);

  // **And the advice the refusal itself gives, which is the half that a fixture cannot reach.** The
  // remediation sentence is pinned CONTIGUOUSLY — subject, verb and object in one regex — because a
  // reversal that borrows the asserted keywords and says the opposite is the failure mode a bag of
  // keywords cannot see (the same defect measured on `UnknownPersonalTransferBalanceCapError`).
  assert.match(
    message,
    /The answer a household can act on is to declare LESS capital as retirement phase: reduce the amount entering the retirement phase on or before 2026-08-03 by at least \$100,000\.00\./,
  );
  // The vocabulary the wrong remedy cannot be written without, and which this refusal has no use
  // for: it is about capital entering retirement phase, never about what is paid out of it.
  for (const forbidden of [
    'draw down',
    'drawdown',
    'draw more',
    'pension payment',
    'income stream benefit',
    'withdraw',
    'take more',
    'larger payment',
    'increase the pension',
    'minimum',
  ]) {
    assert.ok(
      !new RegExp(forbidden, 'i').test(message),
      `the breach refusal now offers "${forbidden}" as a remedy: LCR 2016/9 ¶25 says a drawdown does not reduce the transfer balance (T76)`,
    );
  }
  // Vacuity control: the ban above is over a message that really is there and really does carry the
  // vocabulary the refusal IS about.
  assert.match(message, /commuting the excess back to accumulation/);
  assert.match(message, /\$2,200,000\.00/);
});

test('the item 1 debit is dated the day the lump sum is RECEIVED, across a 30 June boundary (T82)', () => {
  // §1's T82 fixture, re-dated into the years the general-cap series covers (the file header's
  // silence 2): a full commutation producing a $1,000,000 lump sum received on 7 July, where item 1
  // debits "the amount of the superannuation lump sum" "at the time you receive" it, and item 6 —
  // expressly conditioned on "items 1 and 5 do not apply" — would instead value the interest just
  // before the stop time on the stop day. The register asks for the two to be made to differ, and a
  // boundary at 30 June is the way it names: the stop day sits in the previous financial year.
  const seed = seedPersonalTransferBalanceCap('2025-07-01');
  assert.equal(seed.fy, '2025-26');
  assert.equal(seed.cap, $(2_000_000));

  let ledger = openTransferBalanceLedger('2025-07-01');
  ledger = creditOnCommencement(ledger, {
    startingDay: '2025-07-01',
    valueOfSupportingInterestOnStartingDay: $(1_000_000),
  });
  // The last day of FY2025-26 closes with the pension still running: $1,000,000.
  let days = openTransferBalanceAccountDays('2025-07-01', seed.cap, closingBalanceOn('2025-07-01', ledger));
  assert.equal(closingBalanceOn('2026-06-30', ledger), $(1_000_000));
  days = closeDayFromLedger({ ledger, state: days, day: '2026-06-30', personalCapOnDay: seed.cap });
  assert.equal(days.highestEndOfDayTransferBalance, $(1_000_000));
  assert.equal(days.throughDay, '2026-06-30');

  // The instruction is given in June and the lump sum is RECEIVED on 7 July 2026 — a week later, and
  // a financial year later.
  const after = recordCommutation(ledger, { dayReceived: '2026-07-07', lumpSum: $(1_000_000) });
  const debit = after.entries[after.entries.length - 1];
  assert.equal(debit.day, '2026-07-07');
  assert.equal(debit.movement, -$(1_000_000));
  assert.equal(debit.event, 'debit — s 294-80(1) item 1: a superannuation lump sum on commutation');
  assert.match(debit.event, /item 1:/);
  assert.ok(!/item 6/.test(debit.event), 'the full commutation was routed through item 6');
  assert.equal(after.transferBalance, 0);
  assert.equal(after.throughDay, '2026-07-07');

  // **The price of the item 6 day, and it is why this fixture asks for 30 June rather than asserting
  // the entry alone.** A debit dated the stop day would put the ledger back on 30 June 2026, and
  // 30 June 2026 would then answer **$0** — the last day of FY2025-26, whose closing balance is what
  // s 294-40(2)(a) measures the FY2026-27 mark against. Dated on the day of receipt, the ledger has
  // moved past 30 June and refuses to answer for it at all, which is the guard doing the work.
  assert.throws(() => closingBalanceOn('2026-06-30', after), (raised) => {
    assert.ok(raised instanceof RangeError);
    assert.ok(!(raised instanceof TransferBalanceCapExceededError));
    assert.match(raised.message, /no longer the CLOSING balance for 2026-06-30/);
    return true;
  });
  // And the figure that would be lost: $1,000,000 of transfer balance, out of the year it belongs to.
  assert.equal(closingBalanceOn('2026-07-07', after), 0);
  assert.equal($(1_000_000) - 0, $(1_000_000));
});
