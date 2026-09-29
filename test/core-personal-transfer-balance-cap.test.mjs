// P3-9 chunk 2 — the personal transfer balance cap: s 294-35 seeding and s 294-40 indexation.
//
// **Where every figure below comes from, and where none of it comes from.** Each expected number is
// register §3.10.9's own hand-worked answer, or is derived here from a primary-verified row of
// §3.10.1/§3.10.2 and shown being derived. Nothing was read off an implementation: a figure copied
// out of the thing it is meant to check is not a check, and this repo has already enshrined one
// live defect as a golden value exactly that way.
//
// **Every fixture spans TWO financial years, and that is not decoration.** This suite has documented
// single-year blindness — a mutation that hard-coded one correct figure once failed zero tests — and
// seeding and carry-forward are the two rules that only exist across a year boundary. A one-year
// test of s 294-35(2) asserts nothing at all: the whole content of the subsection is that the figure
// it carries forward is LAST year's personal cap and never this year's general cap.
//
// **The general-cap series these fixtures stand on.** The published general transfer balance cap is
// $1,600,000 for FY2017-18 through FY2020-21, $1,700,000 for FY2021-22 and FY2022-23, $1,900,000 for
// FY2023-24 and FY2024-25, $2,000,000 for FY2025-26 and $2,100,000 for FY2026-27 (register §3.1,
// §3.10.1). It is not restated as a constant here, because it is `superCaps.ts`'s figure and O44
// built it — but the three *increases* the §3.10.9 fixtures depend on are pinned below by name
// ($100,000 into FY2021-22, $200,000 into FY2023-24, $100,000 into FY2026-27), because a fixture
// whose answer turns on an increase it never states is a fixture that passes for the wrong reason.
//
// **What is an INPUT here and what is computed.** The high-water mark, the personal cap on its day
// and the latching excess flag are stated facts in every fixture below (§3.10.3 fields 4, 6 and 7):
// maintaining them is chunk 3, and the seam exists so the formula can be tested apart from the
// state machine that feeds it. Two of the fixtures below rest on events this engine refuses to
// model at all — a structured settlement debit is `StructuredSettlementNotModelledError` — which is
// exactly why the number arrives stated rather than computed.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  indexPersonalTransferBalanceCap,
  seedPersonalTransferBalanceCap,
} from '../dist/core/transferBalanceAccount.js';
import { MissingIndexNumberError, generalTransferBalanceCap } from '../dist/core/superCaps.js';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const LEDGER_SOURCE = readFileSync(join(ROOT, 'src', 'core', 'transferBalanceAccount.ts'), 'utf8');

/** Dollars to cents, so every expected figure below reads as the register writes it. */
const $ = (dollars) => dollars * 100;

// --- The three increases the §3.10.9 fixtures turn on ---------------------------------------------

test('the general-cap increases the golden fixtures depend on are the ones the register states', () => {
  // LCR 2016/9 Example A1 step 1 says "FY2021-22 increase $100,000"; step 2 says "FY2023-24
  // increase $200,000"; the high-water-mark row says "FY2026-27 increase $100,000". If any of the
  // three is not what `superCaps.ts` computes, every fixture below would be worked against a
  // different statute-year than the ruling was, and would pass or fail for the wrong reason.
  const rise = (thisFY, prevFY) =>
    generalTransferBalanceCap(thisFY).amount - generalTransferBalanceCap(prevFY).amount;
  assert.equal(rise('2021-22', '2020-21'), $(100_000));
  assert.equal(rise('2023-24', '2022-23'), $(200_000));
  assert.equal(rise('2026-27', '2025-26'), $(100_000));
  // And the years the fixtures need NOT to rise, because a carried-forward year is half of what
  // s 294-35(2) says.
  assert.equal(rise('2022-23', '2021-22'), 0);
  assert.equal(rise('2024-25', '2023-24'), 0);
});

// --- Seeding — s 294-35(1), and the day that decides the year -------------------------------------

test('seeding reads the general cap for the year the account STARTED, in two different years', () => {
  // R4: the account start is a DAY. §3.10.9's "fortnight worth a year" fixture is the proof that a
  // year cannot stand in — 28 June 2027 and 12 July 2027 are a fortnight apart and seed from two
  // different general caps. Only the earlier of those two years is computable today (O40), so the
  // two years exercised here are FY2025-26 and FY2026-27, one day either side of 1 July 2026.
  const june = seedPersonalTransferBalanceCap('2026-06-30');
  assert.equal(june.fy, '2025-26');
  assert.equal(june.cap, $(2_000_000));

  const july = seedPersonalTransferBalanceCap('2026-07-01');
  assert.equal(july.fy, '2026-27');
  assert.equal(july.cap, $(2_100_000));

  // One day apart, $100,000 apart, and the difference is permanent: s 294-35(2) never re-reads the
  // general cap, so the June Person's cap is $100,000 short of the July Person's for life unless
  // s 294-40 moves it.
  assert.equal(july.cap - june.cap, $(100_000));
  for (const seeded of [june, july]) {
    assert.equal(seeded.increase, 0);
    assert.equal(seeded.unusedCapPercentage, null);
    assert.match(seeded.basis, /s 294-35\(1\)/);
    assert.equal(seeded.cap % $(1_000), 0);
    assert.equal(seeded.provenance.fy, seeded.fy);
  }
});

test('seeding refuses a day before 1 July 2017 rather than clamping it (s 294-15(2))', () => {
  for (const day of ['2015-08-01', '2017-06-30']) {
    assert.throws(() => seedPersonalTransferBalanceCap(day), (raised) => {
      assert.ok(raised instanceof RangeError);
      assert.match(raised.message, /s 294-15\(2\)/);
      assert.match(raised.message, /LATER of 1 July 2017/);
      return true;
    });
  }
  // The boundary itself is computable, and it is the earliest cap there has ever been.
  assert.equal(seedPersonalTransferBalanceCap('2017-07-01').cap, $(1_600_000));
});

// --- §3.10.9's six golden fixtures ----------------------------------------------------------------

test('LCR 2016/9 Example A1, both steps, across the two years the ruling works them in', () => {
  // Facts: $1.4m credit on 1 March 2018, so the account starts in FY2017-18 and seeds at $1.6m.
  const seeded = seedPersonalTransferBalanceCap('2018-03-01');
  assert.equal(seeded.fy, '2017-18');
  assert.equal(seeded.cap, $(1_600_000));

  // Step 1 — FY2021-22, the first year the general cap rises. High-water $1,400,000 against the
  // $1,600,000 cap on that day: 100 × 1.4 / 1.6 = 87.5% used, FLOORED to 87 before the subtraction
  // (s 294-40(2)(c)), so 13% unused of a $100,000 increase = +$13,000 → $1,613,000.
  const stepOne = indexPersonalTransferBalanceCap('2021-22', {
    accountStartDay: '2018-03-01',
    capPrevFY: seeded.cap,
    provenanceOfCapPrevFY: seeded.provenance,
    highestEndOfDayTransferBalance: $(1_400_000),
    personalCapOnHighestBalanceDay: seeded.cap,
    hasEverExceededCap: false,
  });
  assert.equal(stepOne.unusedCapPercentage, 13);
  assert.equal(stepOne.indexationIncrease, $(100_000));
  assert.equal(stepOne.increase, $(13_000));
  assert.equal(stepOne.cap, $(1_613_000));

  // Step 2 — a further $125,000 credit on 31 December 2022 takes the high-water mark to $1,525,000,
  // and the personal cap ON THAT DAY is step 1's $1,613,000 (§3.10.3 field 6: the denominator is the
  // personal cap on the high-water day, not the current one and never the general one).
  // 100 × 1,525,000 / 1,613,000 = 94.54…% used → 94 → 6% unused of a $200,000 increase = +$12,000.
  const stepTwo = indexPersonalTransferBalanceCap('2023-24', {
    accountStartDay: '2018-03-01',
    capPrevFY: stepOne.cap,
    provenanceOfCapPrevFY: stepOne.provenance,
    highestEndOfDayTransferBalance: $(1_525_000),
    personalCapOnHighestBalanceDay: stepOne.cap,
    hasEverExceededCap: false,
  });
  assert.equal(stepTwo.unusedCapPercentage, 6);
  assert.equal(stepTwo.indexationIncrease, $(200_000));
  assert.equal(stepTwo.increase, $(12_000));
  assert.equal(stepTwo.cap, $(1_625_000));

  // The years in between are the other half of s 294-35(2), and they are where a re-read of the
  // general cap would show up: FY2022-23's general cap is $1,700,000 and this Person's stays at
  // $1,613,000 because the general cap did not RISE that year (s 294-40(1)(a)).
  const flat = indexPersonalTransferBalanceCap('2022-23', {
    accountStartDay: '2018-03-01',
    capPrevFY: stepOne.cap,
    provenanceOfCapPrevFY: stepOne.provenance,
    highestEndOfDayTransferBalance: $(1_400_000),
    personalCapOnHighestBalanceDay: seeded.cap,
    hasEverExceededCap: false,
  });
  assert.equal(flat.cap, $(1_613_000));
  assert.equal(flat.increase, 0);
  assert.match(flat.basis, /s 294-40\(1\)\(a\)/);
  assert.notEqual(flat.cap, generalTransferBalanceCap('2022-23').amount);
});

test('LCR 2016/9 Example A2 — 100% used is 0% unused, in FY2021-22 and in FY2023-24', () => {
  // $1.6m credit against a $1.6m seed cap: 100% used exactly, so the unused percentage is 0 and
  // stays 0 for ever, because the high-water mark never falls. Note what is NOT true of this
  // Person — they never EXCEEDED the cap, so s 294-40 keeps applying and the flag stays false;
  // §3.10.2's "two ways to lose indexation" are different rules with the same permanence.
  const facts = {
    accountStartDay: '2018-03-01',
    highestEndOfDayTransferBalance: $(1_600_000),
    personalCapOnHighestBalanceDay: $(1_600_000),
    hasEverExceededCap: false,
  };
  const seededA2 = seedPersonalTransferBalanceCap('2018-03-01');
  const first = indexPersonalTransferBalanceCap('2021-22', {
    ...facts,
    capPrevFY: seededA2.cap,
    provenanceOfCapPrevFY: seededA2.provenance,
  });
  assert.equal(first.unusedCapPercentage, 0);
  assert.equal(first.indexationIncrease, $(100_000));
  assert.equal(first.increase, 0);
  assert.equal(first.cap, $(1_600_000));
  // s 294-40 APPLIED — it just granted nothing. A basis that said otherwise would collapse the two
  // routes §3.10.2 says must not be collapsed.
  assert.match(first.basis, /s 294-40\(2\)/);

  const second = indexPersonalTransferBalanceCap('2023-24', {
    ...facts,
    capPrevFY: first.cap,
    provenanceOfCapPrevFY: first.provenance,
  });
  assert.equal(second.unusedCapPercentage, 0);
  assert.equal(second.indexationIncrease, $(200_000));
  assert.equal(second.cap, $(1_600_000));
});

test('the high-water mark is the numerator, not the current balance (§3.10.9) — two years', () => {
  // $1.2m credit on 1 September 2025, $300k debit on 15 March 2026: the account starts in FY2025-26,
  // seeds at $2,000,000, and ends the year with a transfer balance of $900,000 and a high-water mark
  // of $1,200,000 that the debit did NOT lower (s 294-40(2)(a); T58, T59, T84).
  const seeded = seedPersonalTransferBalanceCap('2025-09-01');
  assert.equal(seeded.fy, '2025-26');
  assert.equal(seeded.cap, $(2_000_000));

  // Year one: the seeding year. The general cap rose $100,000 into FY2025-26 and this Person gets
  // none of it — s 294-40(1)'s parenthetical excludes the year the account starts (T62).
  const seedingYear = indexPersonalTransferBalanceCap('2025-26', {
    accountStartDay: '2025-09-01',
    capPrevFY: seeded.cap,
    provenanceOfCapPrevFY: seeded.provenance,
    highestEndOfDayTransferBalance: $(1_200_000),
    personalCapOnHighestBalanceDay: seeded.cap,
    hasEverExceededCap: false,
  });
  assert.equal(seedingYear.cap, $(2_000_000));
  assert.equal(seedingYear.increase, 0);
  assert.equal(seedingYear.unusedCapPercentage, null);
  assert.match(seedingYear.basis, /seeding year/);

  // Year two: 1,200,000 / 2,000,000 = 60% used → 40% unused of $100,000 = +$40,000 → $2,040,000.
  const indexed = indexPersonalTransferBalanceCap('2026-27', {
    accountStartDay: '2025-09-01',
    capPrevFY: seedingYear.cap,
    provenanceOfCapPrevFY: seedingYear.provenance,
    highestEndOfDayTransferBalance: $(1_200_000),
    personalCapOnHighestBalanceDay: seeded.cap,
    hasEverExceededCap: false,
  });
  assert.equal(indexed.unusedCapPercentage, 40);
  assert.equal(indexed.cap, $(2_040_000));
  // The wrong answer this fixture exists to exclude, worked by hand: using the END-of-year balance
  // of $900,000 gives 45% used → 55% unused → +$55,000 → $2,055,000, which is the figure §3.10.9
  // names as the failure.
  assert.notEqual(indexed.cap, $(2_055_000));
  // Headroom, which §3.10.9 also states: $2,040,000 − $900,000 = $1,140,000.
  assert.equal(indexed.cap - $(900_000), $(1_140_000));
});

test('the used percentage is floored before the subtraction, so the unused one rounds up — two years', () => {
  // $1,234,567 credited on 1 July 2025 against the FY2025-26 general cap of $2,000,000.
  const seeded = seedPersonalTransferBalanceCap('2025-07-01');
  assert.equal(seeded.fy, '2025-26');
  assert.equal(seeded.cap, $(2_000_000));

  const state = {
    accountStartDay: '2025-07-01',
    highestEndOfDayTransferBalance: $(1_234_567),
    personalCapOnHighestBalanceDay: seeded.cap,
    hasEverExceededCap: false,
  };
  // Year one is the seeding year: no indexation at all, whatever the rounding would have been.
  const seedingYear = indexPersonalTransferBalanceCap('2025-26', {
    ...state,
    capPrevFY: seeded.cap,
    provenanceOfCapPrevFY: seeded.provenance,
  });
  assert.equal(seedingYear.cap, $(2_000_000));
  assert.equal(seedingYear.unusedCapPercentage, null);

  // Year two: 100 × 1,234,567 / 2,000,000 = 61.72835% used, FLOORED to 61, so 39% unused — the
  // taxpayer's direction. 39% of $100,000 = $39,000 → $2,039,000.
  const indexed = indexPersonalTransferBalanceCap('2026-27', {
    ...state,
    capPrevFY: seedingYear.cap,
    provenanceOfCapPrevFY: seedingYear.provenance,
  });
  assert.equal(indexed.unusedCapPercentage, 39);
  assert.equal(indexed.cap, $(2_039_000));
  // The two wrong answers §3.10.9 names: flooring the UNUSED percentage instead gives 38% → $38,000
  // → $2,038,000, and carrying the fraction through gives $38,271.65 → $2,038,271.65.
  assert.notEqual(indexed.cap, $(2_038_000));
  assert.notEqual(indexed.cap, $(2_038_271.65));
  // §3.10.2's invariant: a cents-bearing personal cap is always a bug.
  assert.equal(indexed.cap % $(1_000), 0);
});

test('a negative high-water mark takes the unused percentage to 100% (s 294-40(3)) — two years', () => {
  // §3.10.9: a $500,000 structured settlement debit and a $300,000 credit on 1 September 2025 leave
  // the transfer balance at −$200,000. A negative transfer balance is permitted and has no
  // consequence (s 294-30(2) Note 2), and the high-water mark may itself be negative (§3.10.3).
  // The structured settlement debit is `StructuredSettlementNotModelledError` in this engine, which
  // is precisely why the figure is stated here rather than computed.
  const seeded = seedPersonalTransferBalanceCap('2025-09-01');
  const state = {
    accountStartDay: '2025-09-01',
    highestEndOfDayTransferBalance: -$(200_000),
    personalCapOnHighestBalanceDay: seeded.cap,
    hasEverExceededCap: false,
  };
  const seedingYear = indexPersonalTransferBalanceCap('2025-26', {
    ...state,
    capPrevFY: seeded.cap,
    provenanceOfCapPrevFY: seeded.provenance,
  });
  assert.equal(seedingYear.cap, $(2_000_000));

  const indexed = indexPersonalTransferBalanceCap('2026-27', {
    ...state,
    capPrevFY: seedingYear.cap,
    provenanceOfCapPrevFY: seedingYear.provenance,
  });
  assert.equal(indexed.unusedCapPercentage, 100);
  assert.equal(indexed.increase, $(100_000));
  assert.equal(indexed.cap, $(2_100_000));
  // The contradiction in §3.10.2's pseudocode runs the other way — it sets the USED percentage to
  // 100 for a negative balance, which subtracts to 0% unused and would leave the cap at $2,000,000.
  // The statute, the section's own operand table and this fixture all say 100% unused.
  assert.notEqual(indexed.cap, $(2_000_000));
});

test('the seeding year gets the whole general cap and no indexation, and the year after refuses (O40)', () => {
  // §3.10.9: a pension starting 1 July 2026 has a personal cap of exactly $2,100,000.
  const seeded = seedPersonalTransferBalanceCap('2026-07-01');
  assert.equal(seeded.cap, $(2_100_000));
  const state = {
    accountStartDay: '2026-07-01',
    capPrevFY: seeded.cap,
    provenanceOfCapPrevFY: seeded.provenance,
    highestEndOfDayTransferBalance: $(1_000_000),
    personalCapOnHighestBalanceDay: seeded.cap,
    hasEverExceededCap: false,
  };
  assert.equal(indexPersonalTransferBalanceCap('2026-27', state).cap, $(2_100_000));

  // Year two is FY2027-28, and the register's own row says the general cap for it is "not
  // derivable" until the December 2026 quarter is published (O40). So the second year of this
  // Person's life is a refusal and not a guess — growing last year's figure by an assumed rate is
  // the mutation that row forbids, and it would hand this Person an indexation increase Parliament
  // has not yet indexed.
  assert.throws(
    () => indexPersonalTransferBalanceCap('2027-28', { ...state, capPrevFY: $(2_100_000) }),
    MissingIndexNumberError,
  );
});

// --- The case §4 of the chunking memo is entirely about --------------------------------------------

test('a FY2017-18 retiree still has a $1,600,000 cap in FY2026-27 — $500,000 below the general cap', () => {
  // §3.10.1, verbatim: "A Person who seeded at $1,600,000 in FY2017-18 and never qualified for an
  // increase still has a $1,600,000 cap in FY2026-27 — $500,000 below the general cap."
  //
  // "Never qualified" is Example A2's Person: a $1.6m credit against a $1.6m cap, 100% used, 0%
  // unused, for ever. Nine consecutive years are walked rather than one, because the error this
  // fixture exists to catch — reading TODAY's general cap for a Person who retired years ago — is
  // invisible in any single year in which the general cap happens not to move.
  const seeded = seedPersonalTransferBalanceCap('2017-09-01');
  assert.equal(seeded.fy, '2017-18');
  assert.equal(seeded.cap, $(1_600_000));

  let cap = seeded.cap;
  let provenance = seeded.provenance;
  const walked = [];
  for (const fy of ['2018-19', '2019-20', '2020-21', '2021-22', '2022-23', '2023-24', '2024-25', '2025-26', '2026-27']) {
    const year = indexPersonalTransferBalanceCap(fy, {
      accountStartDay: '2017-09-01',
      capPrevFY: cap,
      provenanceOfCapPrevFY: provenance,
      highestEndOfDayTransferBalance: $(1_600_000),
      personalCapOnHighestBalanceDay: seeded.cap,
      hasEverExceededCap: false,
    });
    cap = year.cap;
    provenance = year.provenance;
    walked.push(year.cap);
  }
  assert.deepEqual(walked, Array.from({ length: 9 }, () => $(1_600_000)));

  const general = generalTransferBalanceCap('2026-27').amount;
  assert.equal(general, $(2_100_000));
  assert.equal(general - cap, $(500_000));
  // The mistake stated as an assertion: this Person's cap is NOT the current general cap, and a
  // $500,000 error in the flattering direction is what reading it would cost them.
  assert.notEqual(cap, general);

  // **And the seed's weakness survives all nine years.** The FY2017-18 general cap is not a
  // published figure in this register — it is indexed, so it carries O41's open reference-base
  // question and arrives `unverified`. A carried-forward year consumes no new figure, so a result
  // that reported only its own provenance would call this cap `primary-verified` nine years running
  // and launder the weakness out of it. `provenance.ts`'s rule is that a result is as weak as its
  // weakest input, and last year's cap is an input.
  assert.equal(seeded.provenance.confidence, 'unverified');
  assert.equal(provenance.confidence, 'unverified');
  assert.ok(provenance.caveats.some((caveat) => caveat.includes('cpiReferenceBase')));
  // The FY2026-27 general cap read in the last year of the walk IS primary-verified and published,
  // so the weakness the result carries can only have come from the Person's own history.
  assert.equal(generalTransferBalanceCap('2026-27').provenance.confidence, 'primary-verified');
});

// --- The latch — s 294-40(1)(b) --------------------------------------------------------------------

test('one end-of-day excess, ever, kills every later increase — the same Person, two years', () => {
  // Example A1's Person again, with the one fact changed. Without the flag they reach $1,613,000 in
  // FY2021-22 and $1,625,000 in FY2023-24 (asserted above); with it they stay at $1,600,000 in both,
  // because s 294-40(1) grants an increase only where "at no time before the start of the financial
  // year" has the balance exceeded the cap at the end of a day. Two years, because a latch that is
  // read and not carried would show up in the second and not the first.
  const barred = {
    accountStartDay: '2018-03-01',
    highestEndOfDayTransferBalance: $(1_400_000),
    personalCapOnHighestBalanceDay: $(1_600_000),
    hasEverExceededCap: true,
  };
  const seededBarred = seedPersonalTransferBalanceCap('2018-03-01');
  const first = indexPersonalTransferBalanceCap('2021-22', {
    ...barred,
    capPrevFY: seededBarred.cap,
    provenanceOfCapPrevFY: seededBarred.provenance,
  });
  assert.equal(first.cap, $(1_600_000));
  assert.equal(first.increase, 0);
  assert.equal(first.unusedCapPercentage, null);
  assert.match(first.basis, /s 294-40\(1\)\(b\)/);
  assert.notEqual(first.cap, $(1_613_000));

  const second = indexPersonalTransferBalanceCap('2023-24', {
    ...barred,
    capPrevFY: first.cap,
    provenanceOfCapPrevFY: first.provenance,
  });
  assert.equal(second.cap, $(1_600_000));
  assert.notEqual(second.cap, $(1_612_000));

  // And the bar is decided without reading a general cap at all, so a barred Person still gets an
  // answer for a year O40 has no CPI number for. Refusing them would refuse a year the statute
  // answers outright.
  const beyond = indexPersonalTransferBalanceCap('2027-28', {
    ...barred,
    capPrevFY: second.cap,
    provenanceOfCapPrevFY: second.provenance,
  });
  assert.equal(beyond.cap, $(1_600_000));
  assert.match(beyond.basis, /s 294-40\(1\)\(b\)/);
});

// --- Input-shape guards ----------------------------------------------------------------------------

test('a year before the account started has no cap to carry forward, in two such years', () => {
  for (const fy of ['2024-25', '2025-26']) {
    assert.throws(
      () =>
        indexPersonalTransferBalanceCap(fy, {
          accountStartDay: '2026-07-01',
          capPrevFY: $(2_100_000),
          provenanceOfCapPrevFY: { fy: '2026-27', confidence: 'primary-verified', caveats: [] },
          highestEndOfDayTransferBalance: 0,
          personalCapOnHighestBalanceDay: $(2_100_000),
          hasEverExceededCap: false,
        }),
      /is before FY2026-27, the financial year the transfer balance account started in/,
    );
  }
});

test('a high-water mark above its own day cap with the flag false is refused, not clamped', () => {
  // These two facts cannot both hold: an end-of-day balance above the cap is what latches
  // s 294-40(1)(b). Clamping the unused percentage to 0 would hide a chunk-3 defect behind a cap
  // that looks entirely reasonable, so no figure leaves the function. Two years, because the guard
  // must not be a property of one year's general cap.
  for (const fy of ['2023-24', '2026-27']) {
    assert.throws(
      () =>
        indexPersonalTransferBalanceCap(fy, {
          accountStartDay: '2018-03-01',
          capPrevFY: $(1_600_000),
          provenanceOfCapPrevFY: { fy: '2017-18', confidence: 'primary-verified', caveats: [] },
          highestEndOfDayTransferBalance: $(1_700_000),
          personalCapOnHighestBalanceDay: $(1_600_000),
          hasEverExceededCap: false,
        }),
      /hasEverExceededCap is false/,
    );
  }
  // The boundary the guard must NOT swallow: EQUALLING the cap is not exceeding it, s 294-40 keeps
  // applying, and the answer is 0% unused rather than a refusal (§3.10.2).
  const equalled = indexPersonalTransferBalanceCap('2023-24', {
    accountStartDay: '2018-03-01',
    capPrevFY: $(1_600_000),
    provenanceOfCapPrevFY: { fy: '2017-18', confidence: 'primary-verified', caveats: [] },
    highestEndOfDayTransferBalance: $(1_600_000),
    personalCapOnHighestBalanceDay: $(1_600_000),
    hasEverExceededCap: false,
  });
  assert.equal(equalled.unusedCapPercentage, 0);
  assert.equal(equalled.cap, $(1_600_000));
});

// --- A source canary for T63, and it is a canary and not a compiler check ---------------------------

test('the general cap is read only to be subtracted, and that is a TEXT assertion (T63)', () => {
  // The fourth brand stops a CALLER handing a general cap where a personal one belongs — that one
  // is a `tsc` failure, and `core-transfer-balance-account.test.mjs` pins the brand's declaration.
  // It does NOT stop an AUTHOR writing `capThis.amount` where `increase` belongs, inside the one
  // function allowed to read both: those are two correctly-typed `GeneralTransferBalanceCap`
  // values and the compiler has nothing left to check. This is the residue, pinned as text.
  const subtraction = /const increase = \(capThis\.amount - capPrev\.amount\) as Cents;/;
  assert.match(LEDGER_SOURCE, subtraction);
  // Exactly one mention of each operand in the whole module: the subtraction, and nothing else.
  // A second `capThis.amount` anywhere is either T63 itself or the doorway to it.
  assert.equal([...LEDGER_SOURCE.matchAll(/capThis\.amount/g)].length, 1);
  assert.equal([...LEDGER_SOURCE.matchAll(/capPrev\.amount/g)].length, 1);
  // Vacuity guard: the same style of search must be able to find something that is genuinely there
  // more than once, or "exactly one" proves nothing about the counting.
  assert.ok([...LEDGER_SOURCE.matchAll(/generalTransferBalanceCap/g)].length > 1);
  // And the seeding crossing is the only cast from a general cap to a personal one in the module.
  assert.equal([...LEDGER_SOURCE.matchAll(/as PersonalTransferBalanceCap/g)].length, 2);
});
