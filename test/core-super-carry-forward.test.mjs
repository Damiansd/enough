// P3-4, second half — the Total Super Balance, the five-year carry-forward headroom (P3-4b), the
// bring-forward arrangement and the non-concessional assessment.
// Register §3.3 (bring-forward, T19/T20), §3.4 (carry-forward, ITAA 1997 s 291-20(3)–(7)) and
// §3.8 (the Total Super Balance definition, changed 1 July 2026).
//
// Every expected figure is hand-worked from the register and the working is written out beside it.
// Nothing here was produced by running the implementation and pasting the output.
//
// **Every year-varying fixture runs at least two financial years.** For the carry-forward window
// that is not a style rule, it is the only way the tests mean anything: a five-year rolling window
// observed in one year cannot distinguish a five-year window from a four- or six-year one, and
// cannot see the roll-off at either end. FY2026-27 and FY2027-28 are run side by side against one
// contribution history, so the window's earliest year rolls out and its latest year rolls in.
//
// The earliest year the module can compute at all is FY2026-27: `totalSuperBalance` refuses to be
// built for a 30 June before 2026-06-30 (§3.8), and both the carry-forward and the bring-forward
// tests read one. FY2027-28 therefore has to be driven by the previous segment's clearly-labelled
// synthetic AWOTE index number.
//
// NOT covered here: Division 293. Register §3.6 names its income base and never decomposes it, and
// that research has not been done — nothing in this file adds a Div 293 offset to a cap, and the
// seam is left open rather than guessed at. Also not covered: Division 292's excess
// non-concessional treatment (release authority, associated earnings), which the module reports an
// excess for and deliberately does not price.
import test from 'node:test';
import assert from 'node:assert/strict';

import { toCents } from '../dist/core/money.js';
import { SUPERANNUATION, bringForwardArrangement } from '../dist/data/assumptions/index.js';
import {
  MissingContributionHistoryError,
  MissingIndexNumberError,
  TotalSuperBalanceDateError,
  TotalSuperBalanceDefinitionError,
  applyNonConcessional,
  bringForward,
  carryForwardHeadroom,
  concessionalContributionsCap,
  decemberQuarterIndex,
  nonConcessionalContributionsCap,
  totalSuperBalance,
} from '../dist/core/superCaps.js';

const caps = SUPERANNUATION.caps;
const carryForward = SUPERANNUATION.carryForward;

// ATO Table 40 — AWOTE for the December quarter (register §3.2).
//   Dec 2024  $1,975.80  drives FY2025-26 → $30,000
//   Dec 2025  $2,051.10  drives FY2026-27 → $32,500
const AWOTE_DEC_2024 = 1_975.8;
const AWOTE_DEC_2025 = 2_051.1;

// SYNTHETIC. The December 2026 quarter has not been published and register O5 makes the forward
// series a Setting, not an assumption. Carried as `unverified` so anything computed from it says
// so. Same driver as the first half's suite, so the two agree on FY2027-28.
//   2,200.00 / 1,533.40 = 1.434720… → 1.435; 25,000 × 1.435 = 35,875 → floor $2,500 → $35,000
//   non-concessional = 4 × $35,000 = $140,000  (s 292-85(2)(a))
const AWOTE_SYNTHETIC_DEC_2026 = 2_200.0;
const CAP_2027_28 = toCents(35_000);
const NCC_CAP_2027_28 = toCents(140_000);

const awote = (fy, indexNumber, confidence, source) =>
  decemberQuarterIndex({ index: 'AWOTE', fy, indexNumber, confidence, source });

const PUBLISHED_INDEX_NUMBERS = [
  awote('2025-26', AWOTE_DEC_2024, 'primary-verified', 'ATO Table 40 — AWOTE Dec 2024'),
  awote('2026-27', AWOTE_DEC_2025, 'primary-verified', 'ATO Table 40 — AWOTE Dec 2025'),
];
const INDEX_NUMBERS = [
  ...PUBLISHED_INDEX_NUMBERS,
  awote('2027-28', AWOTE_SYNTHETIC_DEC_2026, 'unverified', 'synthetic test driver — not published'),
];

// --- §3.8 — the Total Super Balance carries the date it was measured at --------------------------

test('§3.8 — s 307-230A applies from just before 1 July 2026, and nothing earlier can be built', () => {
  // The boundary is the *first* date the new definition covers, "just before 1 July 2026".
  assert.equal(totalSuperBalance('2026-06-30', toCents(400_000)).measuredAt, '2026-06-30');
  assert.equal(totalSuperBalance('2027-06-30', toCents(400_000)).measuredAt, '2027-06-30');
  assert.equal(totalSuperBalance('2030-06-30', toCents(0)).value, toCents(0));
  // One day earlier is the repealed accumulation phase value construct, which the register does
  // not carry. A number under the wrong definition is not a conservative number, it is a different
  // quantity — so this refuses rather than measuring it.
  assert.throws(() => totalSuperBalance('2026-06-29', toCents(400_000)), TotalSuperBalanceDefinitionError);
  assert.throws(() => totalSuperBalance('2025-06-30', toCents(400_000)), TotalSuperBalanceDefinitionError);
  assert.throws(() => totalSuperBalance('2018-06-30', toCents(400_000)), TotalSuperBalanceDefinitionError);
});

test('a Total Super Balance is a date and an amount, and both are checked', () => {
  assert.throws(() => totalSuperBalance('2026-06-30', toCents(-1)), RangeError);
  assert.throws(() => totalSuperBalance('30/06/2026', toCents(400_000)), RangeError);
  assert.equal(Object.isFrozen(totalSuperBalance('2026-06-30', toCents(1))), true);
});

test('the right balance from the wrong year is refused, in both directions and in both tests', () => {
  const at2026 = totalSuperBalance('2026-06-30', toCents(400_000));
  const at2027 = totalSuperBalance('2027-06-30', toCents(400_000));
  // s 291-20(3): the carry-forward test reads the 30 June immediately before the year and no other.
  assert.throws(
    () => headroom('2026-27', at2027),
    TotalSuperBalanceDateError,
  );
  assert.throws(
    () => headroom('2027-28', at2026),
    TotalSuperBalanceDateError,
  );
  // s 292-85(3)(e): so does the bring-forward cap space.
  assert.throws(
    () => bringForward({ fy: '2026-27', dateOfBirth: '1970-01-01', totalSuperBalance: at2027 }),
    TotalSuperBalanceDateError,
  );
});

// --- §3.4 — the five-year carry-forward window --------------------------------------------------
//
// One contribution history, read from two different years. The caps for FY2025-26 and FY2026-27
// are the register's own figures (§3.2's worked example and §3.1); the three earlier caps are
// SYNTHETIC — deliberately round and deliberately not the published historical caps, which the
// register does not carry. The window arithmetic is subtraction, so it does not depend on the cap
// being the real one, and using round numbers keeps the hand-working checkable.
//
//   FY        cap            contributions   unused = cap − contributions   over cap
//   2021-22   $20,000 SYNTH   $5,000          $15,000                        —
//   2022-23   $21,000 SYNTH  $25,000               nil                    $4,000
//   2023-24   $22,000 SYNTH  $22,000               nil                        —
//   2024-25   $23,000 SYNTH   $3,000          $20,000                        —
//   2025-26   $30,000 §3.2    $6,000          $24,000                        —
//   2026-27   $32,500 §3.1   $40,000               nil                    $7,500
const HISTORY = [
  { fy: '2021-22', cap: toCents(20_000), concessionalContributions: toCents(5_000) },
  { fy: '2022-23', cap: toCents(21_000), concessionalContributions: toCents(25_000) },
  { fy: '2023-24', cap: toCents(22_000), concessionalContributions: toCents(22_000) },
  { fy: '2024-25', cap: toCents(23_000), concessionalContributions: toCents(3_000) },
  { fy: '2025-26', cap: toCents(30_000), concessionalContributions: toCents(6_000) },
  { fy: '2026-27', cap: toCents(32_500), concessionalContributions: toCents(40_000) },
];

const priorTo = (fy) => HISTORY.filter((each) => each.fy < fy);

const headroom = (fy, tsb, priorYears = priorTo(fy)) =>
  carryForwardHeadroom({
    fy,
    cap: concessionalContributionsCap(fy, INDEX_NUMBERS),
    totalSuperBalance: tsb,
    priorYears,
  });

const ELIGIBLE_2026 = totalSuperBalance('2026-06-30', toCents(400_000));
const ELIGIBLE_2027 = totalSuperBalance('2027-06-30', toCents(400_000));

test('§3.4 — the window is the five financial years immediately before, earliest first, and it rolls', () => {
  const y1 = headroom('2026-27', ELIGIBLE_2026);
  const y2 = headroom('2027-28', ELIGIBLE_2027);
  assert.deepEqual(
    y1.window.map((each) => each.fy),
    ['2021-22', '2022-23', '2023-24', '2024-25', '2025-26'],
  );
  assert.deepEqual(
    y2.window.map((each) => each.fy),
    ['2022-23', '2023-24', '2024-25', '2025-26', '2026-27'],
  );
  // One year on, one year off. FY2021-22 is gone from FY2027-28 even though $11,000 of it was
  // still standing the year before — that is the roll-off, and it is invisible in a single year.
  assert.equal(y1.window.length, carryForward.lookBackYears.value);
  assert.equal(y2.window.length, carryForward.lookBackYears.value);
  assert.equal(y1.window[0].fy, '2021-22');
  assert.equal(y2.window[0].fy, '2022-23');
});

test('§3.4 — a year expires exactly as it leaves the window: lastYearUsable of the oldest year is this year', () => {
  // s 291-20(5): unused cap from a year is available for the five following years. The window and
  // the expiry are the same fact stated twice, so they must agree — an off-by-one in either the
  // window's start or the expiry date breaks this in both years at once.
  const y1 = headroom('2026-27', ELIGIBLE_2026);
  const y2 = headroom('2027-28', ELIGIBLE_2027);
  assert.equal(y1.window[0].lastYearUsable, '2026-27');
  assert.equal(y2.window[0].lastYearUsable, '2027-28');
  assert.deepEqual(
    y1.window.map((each) => each.lastYearUsable),
    ['2026-27', '2027-28', '2028-29', '2029-30', '2030-31'],
  );
  assert.deepEqual(
    y2.window.map((each) => each.lastYearUsable),
    ['2027-28', '2028-29', '2029-30', '2030-31', '2031-32'],
  );
  for (const each of [...y1.window, ...y2.window]) {
    assert.equal(each.lastYearUsable >= y1.fy, true);
  }
});

test('§3.4 — s 291-20(7): an over-cap year inside the window spends the earliest unused amount first', () => {
  // FY2026-27, window FY2021-22…FY2025-26.
  //   FY2022-23 contributed $25,000 against a $21,000 cap. The $4,000 over is not an excess
  //   contribution: it is met out of the oldest unused amount standing, which is FY2021-22's.
  //   FY2021-22 remaining = 15,000 − 4,000 = $11,000.
  //   available = 11,000 + 0 + 0 + 20,000 + 24,000 = $55,000
  //   headroom  = general cap 32,500 + 55,000 = $87,500
  // The naive sum of gross unused amounts is 15,000 + 20,000 + 24,000 = $59,000 → $91,500, which
  // offers $4,000 that has already been spent. Over-stated headroom is the dangerous direction:
  // it invites the excess-contributions determination this figure exists to avoid.
  const y1 = headroom('2026-27', ELIGIBLE_2026);
  assert.deepEqual(
    y1.window.map((each) => each.unused),
    [toCents(15_000), toCents(0), toCents(0), toCents(20_000), toCents(24_000)],
  );
  assert.deepEqual(
    y1.window.map((each) => each.remaining),
    [toCents(11_000), toCents(0), toCents(0), toCents(20_000), toCents(24_000)],
  );
  assert.equal(y1.unusedAvailable, toCents(55_000));
  assert.equal(y1.generalCap, caps.concessional.value);
  assert.equal(y1.headroom, toCents(87_500));
  assert.notEqual(y1.headroom, toCents(91_500));

  // FY2027-28, window FY2022-23…FY2026-27. FY2026-27 contributed $40,000 against $32,500, and its
  // $7,500 over is met from the earliest amount standing IN FY2026-27's OWN WINDOW
  // (FY2021-22…FY2025-26) — FY2021-22's $11,000, which then rolls out with $3,500 unused:
  //   FY2024-25 remaining = $20,000, untouched
  //   available = 0 + 0 + 20,000 + 24,000 + 0 = $44,000
  //   headroom  = general cap 35,000 + 44,000 = $79,000
  // ~~FY2024-25 remaining = 20,000 − 7,500 = $12,500 → $36,500 → $71,500~~ **CORRECTED 2026-09-30
  // (P3-4b slice 2).** The old loop searched only THIS window, where FY2021-22 no longer is, and so
  // charged FY2026-27's spend to FY2024-25 — a younger year. The walk's own year-end settlement had
  // it right, and this figure now agrees with it. (Here the right answer is also the gross sum; the
  // FY2026-27 half above is where the gross sum is wrong.)
  const y2 = headroom('2027-28', ELIGIBLE_2027);
  assert.deepEqual(
    y2.window.map((each) => each.unused),
    [toCents(0), toCents(0), toCents(20_000), toCents(24_000), toCents(0)],
  );
  assert.deepEqual(
    y2.window.map((each) => each.remaining),
    [toCents(0), toCents(0), toCents(20_000), toCents(24_000), toCents(0)],
  );
  assert.equal(y2.unusedAvailable, toCents(44_000));
  assert.equal(y2.generalCap, CAP_2027_28);
  assert.equal(y2.headroom, toCents(79_000));
  assert.notEqual(y2.headroom, toCents(71_500), 'the spend charged to a younger year');

  // The same year from the window ALONE, FY2021-22 not supplied: it is counted as fully used, so
  // FY2026-27's spend has nowhere older to go and the answer is the LOWER one. Short history, lower
  // figure — never a higher one.
  const short = headroom('2027-28', ELIGIBLE_2027, priorTo('2027-28').filter((each) => each.fy !== '2021-22'));
  assert.equal(short.unusedAvailable, toCents(36_500));
});

test('P3-4b slice 2 — the headroom agrees with the walk: an over-cap year spends from ITS OWN window, even a year since rolled out', () => {
  // A history built so the two readings part by exactly $5,000. FY2022-23 left $5,000 unused and
  // FY2026-27 $20,000; FY2027-28 went $8,000 over its $35,000 general cap. It spent FY2022-23's
  // $5,000 first (its own window is FY2022-23…FY2026-27) and $3,000 of FY2026-27's. In FY2028-29
  // FY2022-23 has rolled out, and what is left is FY2026-27's $17,000.
  const history = [
    { fy: '2022-23', cap: toCents(5_000), concessionalContributions: toCents(0) },
    { fy: '2023-24', cap: toCents(0), concessionalContributions: toCents(0) },
    { fy: '2024-25', cap: toCents(0), concessionalContributions: toCents(0) },
    { fy: '2025-26', cap: toCents(0), concessionalContributions: toCents(0) },
    { fy: '2026-27', cap: toCents(20_000), concessionalContributions: toCents(0) },
    { fy: '2027-28', cap: toCents(35_000), concessionalContributions: toCents(43_000) },
  ];
  const INDEX_2028_29 = [...INDEX_NUMBERS, awote('2028-29', 2_300.0, 'unverified', 'synthetic test driver — not published')];
  const at = carryForwardHeadroom({
    fy: '2028-29',
    cap: concessionalContributionsCap('2028-29', INDEX_2028_29),
    totalSuperBalance: totalSuperBalance('2028-06-30', toCents(400_000)),
    priorYears: history,
  });
  assert.deepEqual(at.window.map((each) => each.fy), ['2023-24', '2024-25', '2025-26', '2026-27', '2027-28']);
  assert.deepEqual(at.window.map((each) => each.remaining), [0, 0, 0, toCents(17_000), 0]);
  assert.equal(at.unusedAvailable, toCents(17_000), 'the old loop gave $12,000: all $8,000 charged to FY2026-27');
  // A closed year's over-cap part was an excess and spent nothing: all $20,000 is still there.
  const closed = history.map((each) => (each.fy === '2027-28' ? { ...each, carryForwardClosed: true } : each));
  assert.equal(carryForwardHeadroom({
    fy: '2028-29',
    cap: concessionalContributionsCap('2028-29', INDEX_2028_29),
    totalSuperBalance: totalSuperBalance('2028-06-30', toCents(400_000)),
    priorYears: closed,
  }).unusedAvailable, toCents(20_000));
  // A gap in the history before the window is refused: FY2022-23 supplied, FY2023-24 not.
  assert.throws(
    () => carryForwardHeadroom({
      fy: '2028-29',
      cap: concessionalContributionsCap('2028-29', INDEX_2028_29),
      totalSuperBalance: totalSuperBalance('2028-06-30', toCents(400_000)),
      priorYears: [{ fy: '2021-22', cap: toCents(1_000), concessionalContributions: toCents(0) }, ...history.slice(1)],
    }),
    (error) => error instanceof RangeError && /skips FY2022-23/.test(error.message),
  );
});

test('P3-4b — the headroom is a per-year figure a Person can read, not an opaque total', () => {
  const y1 = headroom('2026-27', ELIGIBLE_2026);
  assert.deepEqual(y1.window[1], {
    fy: '2022-23',
    cap: toCents(21_000),
    used: toCents(25_000),
    unused: toCents(0),
    remaining: toCents(0),
    lastYearUsable: '2027-28',
  });
  assert.deepEqual(y1.window[4], {
    fy: '2025-26',
    cap: toCents(30_000),
    used: toCents(6_000),
    unused: toCents(24_000),
    remaining: toCents(24_000),
    lastYearUsable: '2030-31',
  });
  assert.equal(y1.totalSuperBalanceMeasuredAt, '2026-06-30');
  assert.equal(headroom('2027-28', ELIGIBLE_2027).totalSuperBalanceMeasuredAt, '2027-06-30');
});

test('§3.4 — the $500,000 test is strict, unindexed (T21), and nils the whole increase', () => {
  assert.equal(carryForward.totalSuperBalanceTest.value, toCents(500_000));
  for (const [fy, thirtyJune] of [['2026-27', '2026-06-30'], ['2027-28', '2027-06-30']]) {
    const generalCap = fy === '2026-27' ? caps.concessional.value : CAP_2027_28;
    // Exactly $500,000 fails: s 291-20(3) is "less than", not "not more than".
    const at = headroom(fy, totalSuperBalance(thirtyJune, toCents(500_000)));
    assert.equal(at.eligible, false);
    assert.equal(at.unusedAvailable, toCents(0));
    assert.equal(at.headroom, generalCap);
    // The window is still reported in full — the Person can see what they forfeited.
    assert.equal(at.window.length, 5);
    // One cent under, and the whole increase is available.
    const under = headroom(fy, totalSuperBalance(thirtyJune, toCents(499_999.99)));
    assert.equal(under.eligible, true);
    assert.equal(under.headroom, fy === '2026-27' ? toCents(87_500) : toCents(79_000));
    assert.equal(at.eligibilityThreshold, toCents(500_000));
  }
});

test('§3.4 — a missing look-back year is refused, not read as a year of nil contributions', () => {
  // Nil contributions in a missing year would manufacture a full cap of headroom out of no
  // evidence at all. Both years refuse, and the message names the years that are missing.
  const without2023 = priorTo('2026-27').filter((each) => each.fy !== '2023-24');
  assert.throws(
    () => headroom('2026-27', ELIGIBLE_2026, without2023),
    (error) => error instanceof MissingContributionHistoryError && /2023-24/.test(error.message),
  );
  assert.throws(() => headroom('2026-27', ELIGIBLE_2026, []), MissingContributionHistoryError);
  assert.throws(
    () => headroom('2027-28', ELIGIBLE_2027, priorTo('2027-28').filter((each) => each.fy !== '2026-27')),
    (error) => error instanceof MissingContributionHistoryError && /2026-27/.test(error.message),
  );
  // FY2026-27's own history is one year short of FY2027-28's window: read at the later year it is
  // missing FY2026-27 entirely. A window of the wrong length shows up here first.
  assert.throws(() => headroom('2027-28', ELIGIBLE_2027, priorTo('2026-27')), MissingContributionHistoryError);
});

test('the history has to be prior years, distinct, and non-negative', () => {
  const duplicated = [...priorTo('2026-27'), HISTORY[0]];
  assert.throws(() => headroom('2026-27', ELIGIBLE_2026, duplicated), RangeError);
  const thisYear = [...priorTo('2026-27'), { fy: '2026-27', cap: toCents(32_500), concessionalContributions: toCents(0) }];
  assert.throws(() => headroom('2026-27', ELIGIBLE_2026, thisYear), RangeError);
  const negative = priorTo('2026-27').map((each) =>
    each.fy === '2024-25' ? { ...each, concessionalContributions: toCents(-1) } : each,
  );
  assert.throws(() => headroom('2026-27', ELIGIBLE_2026, negative), RangeError);
  // The cap supplied has to be this year's.
  assert.throws(
    () =>
      carryForwardHeadroom({
        fy: '2027-28',
        cap: concessionalContributionsCap('2026-27', INDEX_NUMBERS),
        totalSuperBalance: ELIGIBLE_2027,
        priorYears: priorTo('2027-28'),
      }),
    RangeError,
  );
});

test('the headroom is only as strong as the cap behind it', () => {
  // FY2026-27's cap is published and primary-verified; FY2027-28's is computed from the synthetic
  // AWOTE driver, and the weakness has to survive the trip through the window arithmetic.
  const y1 = headroom('2026-27', ELIGIBLE_2026);
  assert.equal(y1.provenance.confidence, 'primary-verified');
  assert.deepEqual(y1.provenance.caveats, []);
  const y2 = headroom('2027-28', ELIGIBLE_2027);
  assert.equal(y2.provenance.confidence, 'unverified');
  assert.equal(
    y2.provenance.caveats.some((line) => /2026-12-31.*unverified/.test(line)),
    true,
  );
});

// --- §3.3 — bring-forward, derived and never a literal (T19) ------------------------------------
//
// The tiers are read at the assumptions layer's own `bringForwardArrangement`, against **two**
// cap sets. That is the whole point of T19: the FY2026-27 boundaries $1,840,000 / $1,970,000 /
// $2,100,000 and the caps $390,000 / $260,000 / $130,000 are *outputs* of the derivation, and a
// literal standing in for any of them is invisible until a second year is asked for.
const GTBC_2026_27 = caps.generalTransferBalance.value; // $2,100,000, register §3.1
const NCC_2026_27 = caps.nonConcessional.value; // $130,000, register §3.1

// SYNTHETIC. The general Transfer Balance Cap for FY2027-28 does not exist: it indexes off the
// December 2026 CPI number, which has not been published — a forecast is a Setting, not an
// assumption (register O5), so `generalTransferBalanceCap` refuses the year unless one is supplied
// as a series — see the last test in this block. $2,200,000 is a round stand-in used only to feed
// the tier derivation a second cap set, and it is not offered as a forecast.
const GTBC_SYNTHETIC_2027_28 = toCents(2_200_000);

const tier = (gtbc, ncc, tsb) =>
  bringForwardArrangement({ generalTransferBalanceCap: gtbc, nonConcessionalCap: ncc, totalSuperBalance: tsb });

test('§3.3 — the FY2026-27 tier table falls out of the derivation, boundaries included', () => {
  // cap_space = GTBC − TSB; > 2 × gen_cap ⇒ 3 years; > 1 × gen_cap ⇒ 2 years; else gen_cap.
  //   3-year boundary: 2,100,000 − 2 × 130,000 = $1,840,000
  //   2-year boundary: 2,100,000 − 1 × 130,000 = $1,970,000
  //   nil boundary:                              $2,100,000
  // Inequalities are strict, so each boundary belongs to the *lower* arrangement.
  assert.deepEqual(tier(GTBC_2026_27, NCC_2026_27, toCents(1_839_999.99)), {
    firstYearCap: toCents(390_000),
    years: 3,
  });
  assert.deepEqual(tier(GTBC_2026_27, NCC_2026_27, toCents(1_840_000)), {
    firstYearCap: toCents(260_000),
    years: 2,
  });
  assert.deepEqual(tier(GTBC_2026_27, NCC_2026_27, toCents(1_969_999.99)), {
    firstYearCap: toCents(260_000),
    years: 2,
  });
  assert.deepEqual(tier(GTBC_2026_27, NCC_2026_27, toCents(1_970_000)), {
    firstYearCap: toCents(130_000),
    years: 1,
  });
  assert.deepEqual(tier(GTBC_2026_27, NCC_2026_27, toCents(2_099_999.99)), {
    firstYearCap: toCents(130_000),
    years: 1,
  });
  assert.deepEqual(tier(GTBC_2026_27, NCC_2026_27, toCents(2_100_000)), { firstYearCap: toCents(0), years: 0 });
  assert.deepEqual(tier(GTBC_2026_27, NCC_2026_27, toCents(3_000_000)), { firstYearCap: toCents(0), years: 0 });
});

test('T19 — the same tiers move with the caps: every FY2026-27 boundary is wrong a year later', () => {
  // Second cap set: NCC cap $140,000 (4 × the $35,000 the synthetic driver gives), GTBC $2,200,000.
  //   3-year boundary: 2,200,000 − 2 × 140,000 = $1,920,000
  //   2-year boundary: 2,200,000 − 1 × 140,000 = $2,060,000
  //   nil boundary:                              $2,200,000
  // and the first-year caps become $420,000 / $280,000 / $140,000.
  assert.equal(nonConcessionalContributionsCap('2027-28', INDEX_NUMBERS).amount, NCC_CAP_2027_28);
  assert.deepEqual(tier(GTBC_SYNTHETIC_2027_28, NCC_CAP_2027_28, toCents(1_919_999.99)), {
    firstYearCap: toCents(420_000),
    years: 3,
  });
  // $1,920,000 is a 2-year year here and a 3-year year on the FY2026-27 caps. A hard-coded
  // $1,840,000 or $260,000 anywhere in the derivation answers 3 here and passes every FY2026-27
  // test in this file.
  assert.deepEqual(tier(GTBC_SYNTHETIC_2027_28, NCC_CAP_2027_28, toCents(1_920_000)), {
    firstYearCap: toCents(280_000),
    years: 2,
  });
  // Read the boundary from the other side too: $1,900,000 is a 3-year TSB on the FY2027-28 caps
  // (cap space 300,000 > 280,000) and only a 2-year TSB on the FY2026-27 caps (200,000 < 260,000).
  assert.equal(tier(GTBC_SYNTHETIC_2027_28, NCC_CAP_2027_28, toCents(1_900_000)).years, 3);
  assert.equal(tier(GTBC_2026_27, NCC_2026_27, toCents(1_900_000)).years, 2);
  assert.equal(tier(GTBC_2026_27, NCC_2026_27, toCents(1_920_000)).years, 2);
  assert.deepEqual(tier(GTBC_SYNTHETIC_2027_28, NCC_CAP_2027_28, toCents(2_059_999.99)).years, 2);
  assert.deepEqual(tier(GTBC_SYNTHETIC_2027_28, NCC_CAP_2027_28, toCents(2_060_000)), {
    firstYearCap: toCents(140_000),
    years: 1,
  });
  assert.deepEqual(tier(GTBC_SYNTHETIC_2027_28, NCC_CAP_2027_28, toCents(2_100_000)).years, 1);
  assert.deepEqual(tier(GTBC_2026_27, NCC_2026_27, toCents(2_100_000)).years, 0);
  assert.deepEqual(tier(GTBC_SYNTHETIC_2027_28, NCC_CAP_2027_28, toCents(2_200_000)), {
    firstYearCap: toCents(0),
    years: 0,
  });
});

test('§3.3 — bringForward reproduces the register table end to end for FY2026-27', () => {
  const at = (tsb) =>
    bringForward({
      fy: '2026-27',
      dateOfBirth: '1970-01-01',
      totalSuperBalance: totalSuperBalance('2026-06-30', toCents(tsb)),
    });
  const three = at(1_000_000);
  assert.equal(three.years, 3);
  assert.equal(three.periodCap, toCents(390_000)); // 3 × $130,000
  assert.equal(three.generalCap, toCents(130_000));
  assert.equal(three.transferBalanceCap, toCents(2_100_000));
  assert.equal(three.capSpace, toCents(1_100_000)); // 2,100,000 − 1,000,000
  assert.equal(three.triggeredAbove, toCents(130_000));
  assert.equal(at(1_840_000).years, 2);
  assert.equal(at(1_840_000).periodCap, toCents(260_000));
  assert.equal(at(1_970_000).years, 1);
  assert.equal(at(1_970_000).periodCap, toCents(130_000));
  const nil = at(2_100_000);
  assert.equal(nil.years, 0);
  assert.equal(nil.periodCap, toCents(0));
  assert.equal(nil.capSpace, toCents(0)); // s 292-85(3)(e) cannot go negative
  assert.equal(at(3_000_000).capSpace, toCents(0));
});

test('T20 — the period cap is frozen at the first year, and there is no later year to unfreeze it', () => {
  // A 3-year arrangement begun in FY2026-27 is $390,000 = 3 × $130,000, not $130,000 + $140,000 +
  // whatever FY2028-29 turns out to be. The structural half of this is that the module has no
  // year-2 or year-3 code path at all: `bringForward` returns one frozen `periodCap` and there is
  // nothing to index. The remaining half is that a later year cannot even be asked for without a
  // forecast: FY2027-28's Transfer Balance Cap needs the December 2026 CPI number, which is a
  // Setting and not an assumption (register O5), so the year is refused rather than estimated.
  const three = bringForward({
    fy: '2026-27',
    dateOfBirth: '1970-01-01',
    totalSuperBalance: totalSuperBalance('2026-06-30', toCents(1_000_000)),
  });
  assert.equal(three.periodCap, toCents(390_000));
  assert.notEqual(three.periodCap, toCents(130_000 + 140_000 + 150_000));
  assert.equal(SUPERANNUATION.bringForward.capIsFrozenOnceTriggered.value, true);
  assert.throws(
    () =>
      bringForward({
        fy: '2027-28',
        dateOfBirth: '1970-01-01',
        totalSuperBalance: totalSuperBalance('2027-06-30', toCents(1_000_000)),
        indexNumbers: INDEX_NUMBERS,
      }),
    MissingIndexNumberError,
  );
});

test('s 292-85(3)(c) — under 75 at any time in the first year, measured on 1 July', () => {
  const at = (dateOfBirth) =>
    bringForward({
      fy: '2026-27',
      dateOfBirth,
      totalSuperBalance: totalSuperBalance('2026-06-30', toCents(1_000_000)),
    });
  // Born 2 July 1951: 74 on 1 July 2026, turns 75 during the year — under 75 at some time in it.
  const under = at('1951-07-02');
  assert.equal(under.ageAtStartOfYear, 74);
  assert.equal(under.ageGateMet, true);
  assert.equal(under.years, 3);
  // Born 1 July 1951: exactly 75 on 1 July 2026, so never under 75 in the year.
  const over = at('1951-07-01');
  assert.equal(over.ageAtStartOfYear, 75);
  assert.equal(over.ageGateMet, false);
  // The gate removes the bring-forward, never the general cap underneath it.
  assert.equal(over.years, 1);
  assert.equal(over.periodCap, toCents(130_000));
  assert.equal(over.generalCap, toCents(130_000));
});

test('s 292-85(3)(a) — the arrangement triggers on contributing over the general cap, not by choice', () => {
  const three = bringForward({
    fy: '2026-27',
    dateOfBirth: '1970-01-01',
    totalSuperBalance: totalSuperBalance('2026-06-30', toCents(1_000_000)),
  });
  const at = (amount) => applyNonConcessional(three, toCents(amount));
  // Exactly the general cap does not trigger: "more than".
  assert.deepEqual(
    { ...at(130_000), provenance: undefined },
    { fy: '2026-27', contributions: toCents(130_000), cap: toCents(130_000), bringForwardTriggered: false, years: 1, excess: toCents(0), provenance: undefined },
  );
  // One cent over does, and the cap becomes the frozen $390,000 — a $130,000.01 contribution is
  // not a $0.01 excess, it is a triggered 3-year arrangement.
  const triggered = at(130_000.01);
  assert.equal(triggered.bringForwardTriggered, true);
  assert.equal(triggered.years, 3);
  assert.equal(triggered.cap, toCents(390_000));
  assert.equal(triggered.excess, toCents(0));
  assert.equal(at(390_000).excess, toCents(0));
  assert.equal(at(390_000.01).excess, toCents(0.01));
  assert.throws(() => applyNonConcessional(three, toCents(-1)), RangeError);

  // A Person with no bring-forward available is capped at the general cap and the overage is
  // simply excess — there is no arrangement to trigger.
  const one = bringForward({
    fy: '2026-27',
    dateOfBirth: '1970-01-01',
    totalSuperBalance: totalSuperBalance('2026-06-30', toCents(2_000_000)),
  });
  assert.equal(one.years, 1);
  const overOne = applyNonConcessional(one, toCents(140_000));
  assert.equal(overOne.bringForwardTriggered, false);
  assert.equal(overOne.cap, toCents(130_000));
  assert.equal(overOne.excess, toCents(10_000));

  // s 292-85(2)(b): TSB ≥ the general Transfer Balance Cap is a nil cap, so every dollar is excess.
  const none = bringForward({
    fy: '2026-27',
    dateOfBirth: '1970-01-01',
    totalSuperBalance: totalSuperBalance('2026-06-30', toCents(2_100_000)),
  });
  const overNone = applyNonConcessional(none, toCents(1_000));
  assert.equal(overNone.years, 0);
  assert.equal(overNone.cap, toCents(0));
  assert.equal(overNone.excess, toCents(1_000));
});

test('the carry-forward increase is excluded from the non-concessional cap (§3.1)', () => {
  // s 291-20(4)'s increase is expressly excluded from s 292-85(2)(a). A Person sitting on $55,000
  // of carry-forward headroom in FY2026-27 still has a $130,000 general non-concessional cap, and
  // `bringForward` has no parameter through which the headroom could reach it.
  const carry = headroom('2026-27', ELIGIBLE_2026);
  assert.equal(carry.unusedAvailable, toCents(55_000));
  const arrangement = bringForward({
    fy: '2026-27',
    dateOfBirth: '1970-01-01',
    totalSuperBalance: ELIGIBLE_2026,
  });
  assert.equal(arrangement.generalCap, toCents(130_000));
  assert.equal(arrangement.periodCap, toCents(390_000)); // not 4 × 87,500 and not 3 × 4 × 87,500
});
