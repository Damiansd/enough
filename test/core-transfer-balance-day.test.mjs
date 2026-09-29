// P3-9 chunk 3 — the day-level high-water mark (§3.10.3) and R1's end-of-day breach refusal.
//
// **Where every figure comes from, and where none of it comes from.** Each expected number is either
// register §3.10.9's own hand-worked answer, or is derived here from a primary-verified row of
// §3.10.1/§3.10.2/§3.10.3 and shown being derived line by line. Nothing was read off an
// implementation: a figure copied out of the thing it is meant to check is not a check. Where the
// register is silent — and it is silent on two points named below — this file says so rather than
// inventing a figure, because a hand-worked value asserted against a silent spec launders the error
// into the test.
//
// **Every fixture spans TWO financial years or more, and that is not decoration.** This suite has
// documented single-year blindness: a mutation that hard-coded one correct figure once failed zero
// tests. It matters more here than anywhere else in P3-9, because three of the four rules under test
// only exist across time — a mark that a later debit must not lower, a tie between two days, and a
// latch that must survive every day after the one that set it. A one-day test of a high-water mark
// asserts nothing at all.
//
// **The rules being priced, one at a time, each in dollars rather than in fields.** §3.10.3 says the
// mark is measured end-of-day, is never reduced by a later debit, takes the earliest of tied days,
// and is written only on a strict increase. A test that asserted only `state.highestBalanceDay` would
// pass for a build that got the day right and the denominator wrong, so every fixture below carries
// its consequence through chunk 2's s 294-40 arithmetic to the personal cap it produces, and states
// the WRONG cap the broken rule would have produced beside it.
//
// **The general-cap series these fixtures stand on** (register §3.1, §3.10.1, built by O44 in
// `superCaps.ts` and not restated as a constant here): $1,600,000 for FY2017-18 through FY2020-21,
// $1,700,000 for FY2021-22 and FY2022-23, $1,900,000 for FY2023-24 and FY2024-25, $2,000,000 for
// FY2025-26, $2,100,000 for FY2026-27. The increases the fixtures turn on are pinned by name in
// `core-personal-transfer-balance-cap.test.mjs`; this file consumes the same series through the same
// function rather than re-pinning it.
//
// **Some closing balances below are produced by events this engine refuses to model** — the negative
// fixture's $500,000 structured settlement debit is `StructuredSettlementNotModelledError` — which is
// exactly why they arrive as stated end-of-day figures. Chunk 3 is fed a closing balance per day; it
// does not compute one, and chunk 4 is what will.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  TransferBalanceCapExceededError,
  advanceTransferBalanceDay,
  carryPersonalCapForward,
  indexPersonalTransferBalanceCap,
  openTransferBalanceAccountDays,
  seedPersonalTransferBalanceCap,
  transferBalanceAccountDaysAsStated,
} from '../dist/core/transferBalanceAccount.js';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = join(ROOT, 'src');
const LEDGER_SOURCE = readFileSync(join(SRC, 'core', 'transferBalanceAccount.ts'), 'utf8');

/** Dollars to cents, so every expected figure reads as the register writes it. */
const $ = (dollars) => dollars * 100;

/** Close one more day. Named so a fixture reads as the sequence of days it is. */
const close = (state, day, closingBalance, personalCapOnDay) =>
  advanceTransferBalanceDay({ state, day, closingBalance, personalCapOnDay });

/**
 * Run chunk 2's s 294-40 arithmetic over chunk 3's state — the seam, exercised the way chunk 6 will.
 * `capPrevFY` and the account start day are not day-level state and arrive separately.
 */
const index = (fy, state, accountStartDay, capPrevFY, provenance) =>
  indexPersonalTransferBalanceCap(
    fy,
    carryPersonalCapForward(state, {
      accountStartDay,
      capPrevFY,
      provenanceOfCapPrevFY: provenance,
    }),
  );

// --- The mark is never reduced by a later debit (§3.10.9's high-water-mark row; T59, T84) ----------

test('a later debit does not lower the high-water mark, and the cap it produces is $2,040,000', () => {
  // §3.10.9, worked in the register: "$1.2m credit 1 Sep 2025; $300k debit 15 Mar 2026; FY2026-27
  // increase $100,000 → 60% used → 40% → +$40,000 → $2,040,000 (not $2,055,000); headroom
  // $1,140,000". The account starts on 1 Sep 2025, so it seeds from the FY2025-26 general cap.
  const seed = seedPersonalTransferBalanceCap('2025-09-01');
  assert.equal(seed.fy, '2025-26');
  assert.equal(seed.cap, $(2_000_000));

  // Three days across two financial years. The debit day is the one the rule is about; the third
  // day is in the NEXT financial year, so a mark that decayed at a year boundary would show here.
  let days = openTransferBalanceAccountDays('2025-09-01', seed.cap, $(1_200_000));
  days = close(days, '2026-03-15', $(900_000), seed.cap); // $1.2m − $300k
  days = close(days, '2026-09-01', $(880_000), $(2_040_000));

  assert.equal(days.highestEndOfDayTransferBalance, $(1_200_000));
  assert.equal(days.highestBalanceDay, '2025-09-01');
  assert.equal(days.personalCapOnHighestBalanceDay, $(2_000_000));
  assert.equal(days.throughDay, '2026-09-01');

  // The consequence, in dollars. Used: floor(100 × 1,200,000 / 2,000,000) = 60. Unused: 40.
  // The FY2026-27 indexation increase is $100,000, so 40% of it is $40,000.
  const indexed = index('2026-27', days, '2025-09-01', seed.cap, seed.provenance);
  assert.equal(indexed.unusedCapPercentage, 40);
  assert.equal(indexed.cap, $(2_040_000));
  // Headroom, which the register states as the second half of the same fixture: the cap less the
  // balance the account actually sits at after the debit.
  assert.equal(indexed.cap - $(900_000), $(1_140_000));

  // And the wrong answer the register names, so the fixture fails loudly rather than drifting: had
  // the mark followed the balance down to $900,000, used would be floor(45) = 45, unused 55, and the
  // cap $2,000,000 + $55,000 = $2,055,000 — $15,000 of headroom this Person does not have.
  assert.notEqual(indexed.cap, $(2_055_000));
});

test('commuting the whole pension to nil leaves the numerator exactly where it was (T59)', () => {
  // §3.10.3: "Never reduced by a later debit — commuting the whole pension to nil leaves the
  // numerator where it was". Nil is the strongest form of the rule and the one an implementer's
  // `Math.max` mistake survives least visibly, because a zero mark looks like an empty account.
  const seed = seedPersonalTransferBalanceCap('2025-09-01');
  let days = openTransferBalanceAccountDays('2025-09-01', seed.cap, $(1_200_000));
  days = close(days, '2026-03-15', 0, seed.cap); // fully commuted, FY2025-26
  days = close(days, '2026-11-20', 0, $(2_040_000)); // still nil a financial year later

  assert.equal(days.highestEndOfDayTransferBalance, $(1_200_000));
  assert.equal(days.highestBalanceDay, '2025-09-01');

  const indexed = index('2026-27', days, '2025-09-01', seed.cap, seed.provenance);
  assert.equal(indexed.cap, $(2_040_000));
  // The wrong answer, and it is wrong in the flattering direction: a nil mark is 0% used, 100%
  // unused, the whole $100,000 increase, $2,100,000 — a cap $60,000 higher than the Person has.
  assert.notEqual(indexed.cap, $(2_100_000));
});

// --- The earliest of tied days (s 294-40(2)(b); T71) ----------------------------------------------

test('a tie leaves the mark on the EARLIER day, and the denominator with it', () => {
  // Hand-built, because §3.10.9 carries no tied-day fixture — it is §3.10.3's rule row that states
  // the tie ("write `highestBalanceDay` only on a STRICT increase, never on a tie"), and the figures
  // below are derived here from the general-cap series rather than quoted from the register.
  //
  // The point of the fixture is that the tie is not observable in the mark at all — both days carry
  // $1,140,000 — and is observable ONLY in the denominator s 294-40(2)(c) then divides by, which is
  // the personal cap on whichever day was written. So the two days are chosen to have two different
  // personal caps, one financial year apart.
  const seed = seedPersonalTransferBalanceCap('2024-09-01');
  assert.equal(seed.fy, '2024-25');
  assert.equal(seed.cap, $(1_900_000)); // the FY2024-25 general cap

  let days = openTransferBalanceAccountDays('2024-09-01', seed.cap, $(1_140_000));
  days = close(days, '2024-12-01', $(1_000_000), seed.cap); // a dip, so the tie is a re-attainment

  // FY2025-26: 1,140,000 / 1,900,000 = 60% exactly → floor 60 → 40% unused. The general cap rises
  // $2,000,000 − $1,900,000 = $100,000, so +$40,000 → $1,940,000.
  const y2 = index('2025-26', days, '2024-09-01', seed.cap, seed.provenance);
  assert.equal(y2.unusedCapPercentage, 40);
  assert.equal(y2.cap, $(1_940_000));

  // The tie: the same maximum, attained a second time, on a day whose personal cap is $40,000 higher.
  days = close(days, '2025-09-01', $(1_140_000), y2.cap);
  assert.equal(days.highestEndOfDayTransferBalance, $(1_140_000));
  assert.equal(days.highestBalanceDay, '2024-09-01', 's 294-40(2)(b) takes the EARLIEST tied day');
  assert.equal(days.personalCapOnHighestBalanceDay, $(1_900_000));
  assert.equal(days.throughDay, '2025-09-01', 'the day still closed — only the mark stayed put');

  // FY2026-27, the third financial year: the increase is $2,100,000 − $2,000,000 = $100,000 and the
  // denominator is the EARLIER day's cap. 1,140,000 / 1,900,000 = 60% → 40% unused → +$40,000.
  const y3 = index('2026-27', days, '2024-09-01', y2.cap, y2.provenance);
  assert.equal(y3.unusedCapPercentage, 40);
  assert.equal(y3.cap, $(1_980_000));

  // And the wrong answer, priced: had the tie rewritten the day, the denominator would be the LATER
  // day's cap of $1,940,000. 100 × 1,140,000 / 1,940,000 = 58.7628…% → floor 58 → 42% unused →
  // +$42,000 → $1,982,000. Two thousand dollars of cap this Person is not entitled to, permanently,
  // because next year's carry-forward starts from it. Derived by handing chunk 2 the other
  // denominator directly, so the number is computed the same way and only the operand differs.
  const wrong = indexPersonalTransferBalanceCap('2026-27', {
    accountStartDay: '2024-09-01',
    capPrevFY: y2.cap,
    provenanceOfCapPrevFY: y2.provenance,
    highestEndOfDayTransferBalance: $(1_140_000),
    personalCapOnHighestBalanceDay: y2.cap,
    hasEverExceededCap: false,
  });
  assert.equal(wrong.unusedCapPercentage, 42);
  assert.equal(wrong.cap, $(1_982_000));
  assert.notEqual(y3.cap, wrong.cap);
});

test('a day that falls short of the mark rewrites neither the mark nor its day, in two years', () => {
  // The other half of "strict": a lower day. Distinct from the tie above because the comparison it
  // defeats is a different one — `>=` survives this fixture and dies on the tie, while a `>=` that
  // was written `!==` or dropped altogether dies here.
  const seed = seedPersonalTransferBalanceCap('2025-09-01');
  let days = openTransferBalanceAccountDays('2025-09-01', seed.cap, $(1_200_000));
  for (const [day, balance] of [
    ['2025-12-31', $(1_199_999)], // one dollar short, FY2025-26
    ['2026-06-30', $(1_100_000)],
    ['2026-07-01', $(1_150_000)], // FY2026-27, still short
    ['2027-02-01', $(1_199_999)],
  ]) {
    days = close(days, day, balance, $(2_040_000));
    assert.equal(days.highestEndOfDayTransferBalance, $(1_200_000));
    assert.equal(days.highestBalanceDay, '2025-09-01');
    assert.equal(days.personalCapOnHighestBalanceDay, $(2_000_000));
    assert.equal(days.throughDay, day);
  }
});

// --- Equalled is not exceeded (§3.10.2's two ways to lose indexation) -----------------------------

test('a balance EQUAL to the cap is not a breach, and costs indexation anyway — LCR 2016/9 Ex A2', () => {
  // §3.10.9: "$1.6m credit against a $1.6m seed cap → 100% used → 0% → $1,600,000, in FY2021-22 and
  // forever". §3.10.2 is explicit that these are two different rules with the same permanence: an
  // exceeding balance disapplies s 294-40 outright under (1)(b); an equalling one leaves the section
  // applying with a 0% unused percentage, which never recovers because the mark never falls.
  const seed = seedPersonalTransferBalanceCap('2017-10-01');
  assert.equal(seed.fy, '2017-18');
  assert.equal(seed.cap, $(1_600_000));

  let days = openTransferBalanceAccountDays('2017-10-01', seed.cap, $(1_600_000));
  assert.equal(days.hasEverExceededCap, false, 'equalling the cap does not latch s 294-40(1)(b)');
  assert.equal(days.highestEndOfDayTransferBalance, $(1_600_000));
  days = close(days, '2021-06-30', $(1_550_000), seed.cap); // a drawdown-funded fall, FY2020-21

  // FY2021-22: the general cap rises $1,700,000 − $1,600,000 = $100,000, s 294-40 applies, and the
  // unused percentage is 100 − floor(100 × 1,600,000 / 1,600,000) = 0. Nothing is added.
  const y2022 = index('2021-22', days, '2017-10-01', seed.cap, seed.provenance);
  assert.equal(y2022.unusedCapPercentage, 0);
  assert.equal(y2022.cap, $(1_600_000));
  assert.match(y2022.basis, /unused cap percentage/, 's 294-40 APPLIED — it just added nothing');

  // And "forever", which is the half of the register's sentence a single year cannot assert. FY2022-23
  // is a year the general cap did not move at all, so it carries forward on (1)(a) instead.
  days = close(days, '2022-01-15', $(1_500_000), y2022.cap);
  const y2023 = index('2022-23', days, '2017-10-01', y2022.cap, y2022.provenance);
  assert.equal(y2023.cap, $(1_600_000));
  assert.match(y2023.basis, /s 294-40\(1\)\(a\)/);

  // One cent more is a different rule entirely, and the boundary is that one cent. **The register is
  // silent here, and this is the second of the two silences the header names**: §3.10.9 works the
  // equalling case (Ex A2) and §3.10.2 states that exceeding is a different rule, but neither
  // carries a figure one cent over a cap. So what is asserted below is the REFUSAL and not an
  // amount — the smallest expressible excess still refuses — because a hand-worked dollar figure
  // against a silent spec would launder this file's own arithmetic into a golden value.
  assert.throws(
    () => openTransferBalanceAccountDays('2017-10-01', seed.cap, $(1_600_000) + 1),
    TransferBalanceCapExceededError,
  );
});

// --- R1 — the engine refuses the year, in two financial years ------------------------------------

test('an end-of-day balance over the cap refuses, and the refusal names the excess and the cap', () => {
  const seed = seedPersonalTransferBalanceCap('2025-09-01');
  const opened = openTransferBalanceAccountDays('2025-09-01', seed.cap, $(1_200_000));

  // FY2025-26, and the excess is one cent: the smallest breach expressible is still a breach, and
  // under s 294-40(1)(b) it costs every future indexation increase for life.
  assert.throws(
    () => close(opened, '2026-02-02', $(2_000_000) + 1, seed.cap),
    (error) => {
      assert.ok(error instanceof TransferBalanceCapExceededError);
      assert.match(error.message, /\$2,000,000\.01/); // the balance
      assert.match(error.message, /\$2,000,000\.00/); // the cap it was tested against
      assert.match(error.message, /\$0\.01/); // the excess, which is the first thing §3.10.5 requires
      assert.match(error.message, /2026-02-02/);
      assert.match(error.message, /s 294-40\(1\)\(b\)/);
      assert.match(error.message, /does not model excess transfer balance tax/);
      return true;
    },
  );

  // FY2026-27, a year later, against the indexed cap of $2,040,000 from the first fixture: excess
  // $2,140,000 − $2,040,000 = $100,000. A refusal that interpolated one year's figures correctly and
  // the next year's wrongly is exactly what a single-year fixture cannot see.
  const next = close(opened, '2026-03-15', $(900_000), seed.cap);
  assert.throws(
    () => close(next, '2026-12-01', $(2_140_000), $(2_040_000)),
    (error) => {
      assert.match(error.message, /\$2,040,000\.00/);
      assert.match(error.message, /\$100,000\.00/);
      assert.match(error.message, /2026-12-01/);
      return true;
    },
  );

  // The account's very first day is checked by the same test, through the same one comparison.
  assert.throws(
    () => openTransferBalanceAccountDays('2026-07-01', $(2_100_000), $(2_100_000) + 1),
    TransferBalanceCapExceededError,
  );
});

test('a NEGATIVE balance is never a breach, and s 294-40(3) takes the unused percentage to 100%', () => {
  // §3.10.9's negative-balance row: "$500,000 structured settlement debit; $300,000 credit
  // 1 Sep 2025 → −$200,000 → s 294-40(3): unused 100% → +$100,000 → $2,100,000". §3.10.5 says in
  // terms that the refusal must NOT fire on a negative transfer balance (s 294-30(2) Note 2: "There
  // is no consequence for having a negative transfer balance"), so this fixture is as much about
  // what does not happen as about the cap it produces.
  const seed = seedPersonalTransferBalanceCap('2025-08-01');
  assert.equal(seed.cap, $(2_000_000));

  let days = openTransferBalanceAccountDays('2025-08-01', seed.cap, $(-500_000));
  assert.equal(days.highestEndOfDayTransferBalance, $(-500_000), 'the mark may itself be negative');
  days = close(days, '2025-09-01', $(-200_000), seed.cap); // the $300,000 credit
  assert.equal(days.highestEndOfDayTransferBalance, $(-200_000), '−$200,000 > −$500,000 is a strict increase');
  assert.equal(days.highestBalanceDay, '2025-09-01');
  assert.equal(days.hasEverExceededCap, false);

  // A second financial year still under water, which is where a "negative means zero" mistake shows.
  days = close(days, '2026-09-01', $(-250_000), $(2_100_000));
  assert.equal(days.highestEndOfDayTransferBalance, $(-200_000));

  const indexed = index('2026-27', days, '2025-08-01', seed.cap, seed.provenance);
  assert.equal(indexed.unusedCapPercentage, 100);
  assert.equal(indexed.cap, $(2_100_000));
});

// --- The latch (s 294-40(1)(b); T67) --------------------------------------------------------------

test('a stated hasEverExceededCap survives every later day, in two financial years', () => {
  // §3.10.5, RULED: "the flag's only live write path is the user-supplied history. Under R1 a
  // projected day that would set the flag throws instead … T67's fixture must therefore be expressed
  // as Setting-fed history, not as projected days." So it is: this Person breached before the
  // forecast, was corrected, and is now nowhere near their cap — and is still barred for life.
  const stated = transferBalanceAccountDaysAsStated({
    statedThroughDay: '2025-06-30',
    statedHighestEndOfDayTransferBalance: $(1_700_000),
    statedHighestBalanceDay: '2018-03-01',
    statedPersonalCapOnHighestBalanceDay: $(1_600_000),
    statedHasEverExceededCap: true,
  });

  let days = stated;
  for (const day of ['2025-09-01', '2026-03-01', '2026-09-01', '2027-03-01']) {
    days = close(days, day, $(900_000), $(1_600_000));
    assert.equal(days.hasEverExceededCap, true, `${day} un-latched s 294-40(1)(b)`);
  }
  // The mark is untouched by four years of being nowhere near it, which is the same rule as the
  // debit fixture and is why correcting an excess restores nothing.
  assert.equal(days.highestEndOfDayTransferBalance, $(1_700_000));
  assert.equal(days.highestBalanceDay, '2018-03-01');

  // The consequence, through chunk 2, in two financial years — both of which the general cap rose in
  // ($1,900,000 → $2,000,000, then → $2,100,000) and neither of which this Person gets a cent of.
  const y2026 = index('2025-26', days, '2018-03-01', $(1_600_000), {
    fy: '2017-18',
    confidence: 'primary-verified',
    caveats: [],
  });
  assert.equal(y2026.cap, $(1_600_000));
  assert.match(y2026.basis, /s 294-40\(1\)\(b\)/);
  const y2027 = index('2026-27', days, '2018-03-01', y2026.cap, y2026.provenance);
  assert.equal(y2027.cap, $(1_600_000));
  assert.match(y2027.basis, /s 294-40\(1\)\(b\)/);
});

// --- End of day means one closing balance per day, in order ---------------------------------------

test('a day is closed once and only in order — the same-day netting of LCR 2016/9 ¶51', () => {
  // §3.10.3: measured at the END of a day, never intraday — "a credit and a debit on the SAME day
  // net out and the intraday spike never happened", worked in LCR 2016/9 ¶51 where Alice's same-day
  // credit and debit on 1 July 2017 leave her having NEVER had an excess and still eligible for
  // indexation. A caller able to close 1 July twice, once after each event, would resurrect the
  // spike and could breach on it. Two financial years, because an ordering guard keyed off a
  // financial year rather than a day would pass one of them.
  const seed = seedPersonalTransferBalanceCap('2025-09-01');
  const opened = openTransferBalanceAccountDays('2025-09-01', seed.cap, $(1_200_000));
  const later = close(opened, '2026-09-01', $(1_100_000), $(2_040_000));

  for (const [state, day] of [
    [opened, '2025-09-01'], // the same day again, FY2025-26
    [opened, '2025-08-31'], // and a day before it
    [later, '2026-09-01'], // the same day again, FY2026-27
    [later, '2026-03-15'], // and a day in the previous financial year
  ]) {
    assert.throws(
      () => close(state, day, $(3_000_000), $(2_040_000)),
      /is not after .*, the last day this transfer balance account closed/,
      `${day} was accepted out of order — and it would have breached, too`,
    );
  }
});

test('LCR 2016/9 ¶51 (Alice) — the same day closed twice would resurrect the intraday spike (T66)', () => {
  // The test above asserts that a repeated day throws. It names no figure, so it passes for a build
  // that refuses the second close for the wrong reason, and it says nothing about what the intraday
  // figure would have COST. This one prices it. The ruling's own amounts are not in the register;
  // $1,700,000 and $100,000 are the constructed pair `core-transfer-balance-ledger.test.mjs` already
  // uses for Alice, chosen so the intraday figure breaches the FY2017-18 cap and the closing one
  // does not — the same fixture, asked the question chunk 3 owns rather than the one chunk 4 owns.
  const seed = seedPersonalTransferBalanceCap('2017-07-01');
  assert.equal(seed.cap, $(1_600_000));

  // The honest day: one closing balance, $1,700,000 credited and $100,000 commuted, netting to
  // exactly the cap. Equalled is not exceeded, so she has NEVER had an excess.
  const days = openTransferBalanceAccountDays('2017-07-01', seed.cap, $(1_600_000));
  assert.equal(days.highestEndOfDayTransferBalance, $(1_600_000));
  assert.equal(days.hasEverExceededCap, false);

  // The two prices of measuring intraday instead, both of them permanent:
  //   1. the spike is $100,000 over the cap, so R1 refuses the whole financial year of a Person who
  //      never had an excess at the end of any day;
  assert.throws(
    () => openTransferBalanceAccountDays('2017-07-01', seed.cap, $(1_700_000)),
    TransferBalanceCapExceededError,
  );
  //   2. and had it been survivable, the numerator of s 294-40(2)(a) would be $1,700,000 rather than
  //      $1,600,000 — a day the account never ended on.
  assert.equal($(1_700_000) - $(1_600_000), $(100_000));

  // So 1 July 2017 is closed once, and the second close is refused however the day is dressed up:
  // after the credit, after the debit, and at the honest net figure again.
  for (const closingBalance of [$(1_700_000), $(1_600_000), $(1_500_000)]) {
    assert.throws(
      () => close(days, '2017-07-01', closingBalance, seed.cap),
      /is not after 2017-07-01, the last day this transfer balance account closed/,
      `1 July 2017 was closed a second time at ${closingBalance}`,
    );
  }

  // And she REMAINS eligible for indexation, which is not the same claim as "gets an increase":
  // in FY2021-22 the general cap rises $100,000 and she is 100% used, so the answer is the NUMBER 0,
  // where a s 294-40(1)(b) disqualification would have returned `null`.
  let cap = seed;
  for (const fy of ['2018-19', '2019-20', '2020-21', '2021-22']) {
    cap = index(fy, days, '2017-07-01', cap.cap, cap.provenance);
  }
  assert.equal(cap.unusedCapPercentage, 0);
  assert.equal(cap.cap, $(1_600_000));
});

// --- The stated-history door, and the contradiction it will not accept ----------------------------

test('a stated history whose mark exceeds its own day cap with the flag false is refused', () => {
  // The same contradiction chunk 2 refuses rather than clamps, caught one layer earlier where it can
  // name the Setting that is wrong. Refusing here is not belt-and-braces: chunk 2 only sees these
  // fields at a financial-year boundary, which may be years after the Settings were entered.
  assert.throws(
    () =>
      transferBalanceAccountDaysAsStated({
        statedThroughDay: '2025-06-30',
        statedHighestEndOfDayTransferBalance: $(1_700_000),
        statedHighestBalanceDay: '2018-03-01',
        statedPersonalCapOnHighestBalanceDay: $(1_600_000),
        statedHasEverExceededCap: false,
      }),
    /hasEverExceededCap is stated\s+false/,
  );
  // Equalling is accepted, here as everywhere: it is not an excess and it does not latch.
  const equalled = transferBalanceAccountDaysAsStated({
    statedThroughDay: '2025-06-30',
    statedHighestEndOfDayTransferBalance: $(1_600_000),
    statedHighestBalanceDay: '2018-03-01',
    statedPersonalCapOnHighestBalanceDay: $(1_600_000),
    statedHasEverExceededCap: false,
  });
  assert.equal(equalled.highestEndOfDayTransferBalance, $(1_600_000));
  // A mark attained on a day the stated history has not reached is incoherent in the other axis.
  assert.throws(
    () =>
      transferBalanceAccountDaysAsStated({
        statedThroughDay: '2025-06-30',
        statedHighestEndOfDayTransferBalance: $(1_500_000),
        statedHighestBalanceDay: '2025-07-01',
        statedPersonalCapOnHighestBalanceDay: $(1_600_000),
        statedHasEverExceededCap: false,
      }),
    /is after 2025-06-30, the last day the stated history covers/,
  );
});

// --- What is structural, and what is only a canary -------------------------------------------------

test('a caller cannot lower the mark: the state is frozen and its brand is unforgeable', () => {
  // **Half of this is structural and half is a text assertion, and the halves are not the same
  // claim.** The frozen object is a runtime fact this test can observe directly. The brand is a
  // compile-time fact it cannot: the tests run against `dist/`, where the type has been erased, so
  // what is pinned below is the DECLARATION in the source — the thing whose deletion would let any
  // caller write `{ highestEndOfDayTransferBalance: 0, … }` and hand it back in.
  const seed = seedPersonalTransferBalanceCap('2025-09-01');
  const days = openTransferBalanceAccountDays('2025-09-01', seed.cap, $(1_200_000));
  assert.ok(Object.isFrozen(days));
  assert.throws(() => {
    days.highestEndOfDayTransferBalance = 0;
  }, TypeError);

  assert.match(LEDGER_SOURCE, /declare const TRANSFER_BALANCE_ACCOUNT_DAYS: unique symbol;/);
  // A private-member witness class as of P3-41 chunk 2: no object literal, spread or not, can carry
  // the member, which is a strictly stronger claim than the plain `[SYM]: true` property this used
  // to pin.
  assert.match(
    LEDGER_SOURCE,
    /declare class TransferBalanceAccountDaysWitness \{ private readonly \[TRANSFER_BALANCE_ACCOUNT_DAYS\]: true \}/,
  );
  assert.match(LEDGER_SOURCE, /export interface TransferBalanceAccountDays extends TransferBalanceAccountDaysWitness \{/);
  // Three producers of the state and no more. A fourth would be a fourth place the mark can be set
  // to an arbitrary figure, which is the whole of what the brand is buying.
  assert.equal([...LEDGER_SOURCE.matchAll(/as TransferBalanceAccountDays;/g)].length, 3);
  // Vacuity guard: the same style of count must find something that is genuinely there more often.
  assert.ok([...LEDGER_SOURCE.matchAll(/TransferBalanceAccountDays/g)].length > 3);
});

test('the strict increase and the breach test are each written exactly once (T58, T71, R1)', () => {
  // Text assertions, and they say so. Neither comparison is type-checkable: `>` written `>=` in
  // either place is two correctly-typed `Cents` values and `tsc` has nothing to say. What a canary
  // can do is fail when a second comparison appears somewhere else in the module — a second place
  // the mark can be written, or a second breach test with its own idea of the boundary.
  assert.equal(
    [...LEDGER_SOURCE.matchAll(/closingBalance > state\.highestEndOfDayTransferBalance/g)].length,
    1,
  );
  assert.equal([...LEDGER_SOURCE.matchAll(/closingBalance > personalCapOnDay/g)].length, 1);
  assert.equal([...LEDGER_SOURCE.matchAll(/new TransferBalanceCapExceededError\(/g)].length, 1);
  // The monotone re-check, which is the one runtime tripwire for an inverted comparison, stated the
  // other way round and deliberately not factored together with the branch above it.
  assert.match(
    LEDGER_SOURCE,
    /next\.highestEndOfDayTransferBalance < state\.highestEndOfDayTransferBalance/,
  );
});

test('exactly one throw site for the breach refusal exists in src/, and it is in the ledger', () => {
  // The other side of `core-transfer-balance-account.test.mjs`'s tripwire, which this chunk struck
  // one name from. That test asserts the other eleven refusals still have NO throw site; this one
  // asserts the twelfth has exactly one, so the strike cannot be quietly widened to cover a refusal
  // that was never wired.
  const sources = function* (dir) {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const path = join(dir, entry.name);
      if (entry.isDirectory()) yield* sources(path);
      else if (entry.name.endsWith('.ts')) yield path;
    }
  };
  const sites = [];
  let filesRead = 0;
  for (const file of sources(SRC)) {
    filesRead += 1;
    const text = readFileSync(file, 'utf8');
    for (const [match] of text.matchAll(/\bnew TransferBalanceCapExceededError\b/g)) sites.push(`${match} in ${file}`);
  }
  assert.ok(filesRead > 10, `only ${filesRead} sources walked`);
  assert.equal(sites.length, 1);
  assert.match(sites[0], /core[/\\]transferBalanceAccount\.ts$/);
});

// --- T114: one end-of-day excess, permanently, and what the latch is actually worth ---------------

test('T114 — a ONE-DOLLAR, one-day excess freezes the cap for every later year, and costs $96,000', () => {
  // §1's T114 row: "a one-dollar, one-day excess in FY2027-28 must freeze the personal cap for
  // EVERY later year in the projection, even after the excess is fully corrected. This is the
  // largest money consequence in the cluster and the easiest to omit." T67's fixture reaches the
  // same rule from the indexation side with a $50,000 breach; this one is about the DOLLAR — the
  // rule has no de minimis, and a fixture whose excess is large enough to look deliberate cannot
  // show that.
  //
  // **The year moved from FY2027-28 and the reason is O40, not convenience.** The excess must sit
  // in a year whose general cap is published, because a projected breaching day is refused under R1
  // and the history is therefore Setting-fed (§3.10.5); an FY2027-28 breach would also need an
  // FY2028-29 indexation, and `generalTransferBalanceCap` refuses a year it has no December index
  // number for. The breach is dated 15 November 2022, inside FY2022-23, whose general cap is
  // $1,700,000 — one dollar over it is $1,700,001.
  const breached = transferBalanceAccountDaysAsStated({
    statedThroughDay: '2025-06-30',
    statedHighestEndOfDayTransferBalance: $(1_700_000) + 100,
    statedHighestBalanceDay: '2022-11-15',
    statedPersonalCapOnHighestBalanceDay: $(1_700_000),
    statedHasEverExceededCap: true,
  });
  // The stated door must ACCEPT this history. A door that refused a Person whose flag is true
  // because their mark is above their cap would leave them no way to state a real breach at all,
  // and the only history they could state is the flattering one — which is the same $96,000 below,
  // reached by refusing to hear the fact rather than by forgetting it.
  assert.equal(breached.hasEverExceededCap, true);
  assert.equal(breached.highestEndOfDayTransferBalance - breached.personalCapOnHighestBalanceDay, 100);

  // Fully corrected, and it changes nothing: four later days a long way under the cap.
  let days = breached;
  for (const day of ['2025-09-01', '2026-03-01', '2026-09-01', '2027-03-01']) {
    days = close(days, day, $(900_000), $(1_700_000));
  }
  assert.equal(days.hasEverExceededCap, true, 'correcting the excess un-latched s 294-40(1)(b)');

  // The SEAM, asserted as a field and not only through its consequence. `carryPersonalCapForward`
  // copies the three fields s 294-40 reads, and field 7 is one of them: dropping it here is the
  // quietest way to lose the whole rule, because the day machinery still holds the true flag.
  const carried = carryPersonalCapForward(days, {
    accountStartDay: '2021-07-01',
    capPrevFY: $(1_700_000),
    provenanceOfCapPrevFY: { fy: '2021-22', confidence: 'primary-verified', caveats: [] },
  });
  assert.equal(carried.hasEverExceededCap, true, 'the latch did not survive the seam into s 294-40');

  // The freeze, through chunk 2, in the two years the general cap last rose: $1.9m → $2.0m → $2.1m.
  const barred2026 = indexPersonalTransferBalanceCap('2025-26', carried);
  assert.equal(barred2026.cap, $(1_700_000));
  assert.equal(barred2026.unusedCapPercentage, null);
  assert.match(barred2026.basis, /s 294-40\(1\)\(b\)/);
  const barred2027 = indexPersonalTransferBalanceCap('2026-27', { ...carried, capPrevFY: barred2026.cap });
  assert.equal(barred2027.cap, $(1_700_000));
  assert.equal(barred2027.unusedCapPercentage, null);

  // **The price, and it is the same Person one dollar the other way.** An account that opened on the
  // same day, whose worst day was $900,000 and whose flag is false: 100 − floor(100 × 900,000 ÷
  // 1,700,000) = 100 − 52 = 48% unused, and each of the two $100,000 indexation increases pays 48%
  // of itself. $1,700,000 → $1,748,000 → $1,796,000.
  const clean = transferBalanceAccountDaysAsStated({
    statedThroughDay: '2025-06-30',
    statedHighestEndOfDayTransferBalance: $(900_000),
    statedHighestBalanceDay: '2022-11-15',
    statedPersonalCapOnHighestBalanceDay: $(1_700_000),
    statedHasEverExceededCap: false,
  });
  const cleanCarried = carryPersonalCapForward(clean, {
    accountStartDay: '2021-07-01',
    capPrevFY: $(1_700_000),
    provenanceOfCapPrevFY: { fy: '2021-22', confidence: 'primary-verified', caveats: [] },
  });
  const free2026 = indexPersonalTransferBalanceCap('2025-26', cleanCarried);
  assert.equal(free2026.unusedCapPercentage, 48);
  assert.equal(free2026.cap, $(1_748_000));
  const free2027 = indexPersonalTransferBalanceCap('2026-27', { ...cleanCarried, capPrevFY: free2026.cap });
  assert.equal(free2027.cap, $(1_796_000));
  assert.equal(free2027.cap - barred2027.cap, $(96_000));
});

test('T114 — the latch is NOT redundant with the mark-above-cap refusal, and the residue is stated', () => {
  // The claim this pins, because it is what makes T114 a live rule rather than a second spelling of
  // one: with the flag cleared, the SAME history is not answered with a higher cap — it is refused,
  // because a mark above its own day's cap with `hasEverExceededCap` false is the contradiction
  // chunk 2 will not compute from. So on a model-built history the latch's money is bounded by that
  // refusal, and the direction of what is left is the direction T67's declared partial survivor
  // already records: a STATED history that pairs a true flag with a mark BELOW its own day's cap.
  // No day this module can project produces one — a day above the cap throws under R1, and a mark
  // is the maximum over such days — so the residue is reachable only through the stated door, and
  // there it runs in the Person's favour by the whole of an indexation increase.
  const carried = carryPersonalCapForward(
    transferBalanceAccountDaysAsStated({
      statedThroughDay: '2025-06-30',
      statedHighestEndOfDayTransferBalance: $(1_700_000) + 100,
      statedHighestBalanceDay: '2022-11-15',
      statedPersonalCapOnHighestBalanceDay: $(1_700_000),
      statedHasEverExceededCap: true,
    }),
    {
      accountStartDay: '2021-07-01',
      capPrevFY: $(1_700_000),
      provenanceOfCapPrevFY: { fy: '2021-22', confidence: 'primary-verified', caveats: [] },
    },
  );
  assert.throws(
    () => indexPersonalTransferBalanceCap('2025-26', { ...carried, hasEverExceededCap: false }),
    (error) =>
      error instanceof RangeError &&
      !(error instanceof TransferBalanceCapExceededError) &&
      /hasEverExceededCap is false/.test(error.message) &&
      /\$1,700,001\.00/.test(error.message) &&
      /\$1,700,000\.00/.test(error.message),
  );
  // And the residue itself, which the same clearing DOES answer with a number: a mark under its own
  // day's cap plus a true flag is the one shape where field 7 alone decides the money.
  const residue = carryPersonalCapForward(
    transferBalanceAccountDaysAsStated({
      statedThroughDay: '2025-06-30',
      statedHighestEndOfDayTransferBalance: $(900_000),
      statedHighestBalanceDay: '2022-11-15',
      statedPersonalCapOnHighestBalanceDay: $(1_700_000),
      statedHasEverExceededCap: true,
    }),
    {
      accountStartDay: '2021-07-01',
      capPrevFY: $(1_700_000),
      provenanceOfCapPrevFY: { fy: '2021-22', confidence: 'primary-verified', caveats: [] },
    },
  );
  assert.equal(indexPersonalTransferBalanceCap('2025-26', residue).cap, $(1_700_000));
  assert.equal(indexPersonalTransferBalanceCap('2025-26', { ...residue, hasEverExceededCap: false }).cap, $(1_748_000));
});
