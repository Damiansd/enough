// P6-8 microtask 1 — `crossoverPoint`, tested entirely on hand-fabricated fixtures. No `project()`
// call anywhere in this file: every figure below is written out and the arithmetic that decides
// the outcome is shown beside it, exactly as `crossover.ts`'s own header states the rule.
import test from 'node:test';
import assert from 'node:assert/strict';

import { crossoverPoint } from '../dist/app/crossover.js';

// A five-month axis, shared by every fixture below so `.month` always lines up.
const MONTHS = ['2027-01', '2027-02', '2027-03', '2027-04', '2027-05'];

const series = (accessibleAssets) => MONTHS.map((month, index) => ({ month, accessibleAssets: accessibleAssets[index] }));

// --- §1 A single, genuine crossing: B ahead, then A ahead, and A stays ahead ------------------------

test('B leads, A overtakes at month index 2 and stays ahead — reported as "crossed"', () => {
  // diff = a - b: -5,-5,+5,+5,+5 (using a = [10,10,20,20,20], b = [15,15,15,15,15])
  const a = series([10, 10, 20, 20, 20]);
  const b = series([15, 15, 15, 15, 15]);
  const result = crossoverPoint(a, b);
  assert.deepEqual(result, { outcome: 'crossed', index: 2, month: '2027-03', leader: 'a' });
});

test('the same fixture with the sides swapped reports "b" as the leader, at the same index', () => {
  const a = series([15, 15, 15, 15, 15]);
  const b = series([10, 10, 20, 20, 20]);
  const result = crossoverPoint(a, b);
  assert.deepEqual(result, { outcome: 'crossed', index: 2, month: '2027-03', leader: 'b' });
});

// --- §2 No crossing at all: one side ahead in every month -------------------------------------------

test('A ahead in every month — "aLeadsThroughout", not a crossing at index 0', () => {
  // diff = a - b: +5,+15,+25 (a = [10,20,30], b = [5,5,5]), never negative or zero.
  const a = series([10, 20, 30, 40, 50]);
  const b = series([5, 5, 5, 5, 5]);
  assert.deepEqual(crossoverPoint(a, b), { outcome: 'aLeadsThroughout' });
});

test('B ahead in every month — "bLeadsThroughout"', () => {
  const a = series([5, 5, 5, 5, 5]);
  const b = series([10, 20, 30, 40, 50]);
  assert.deepEqual(crossoverPoint(a, b), { outcome: 'bLeadsThroughout' });
});

// --- §3 A tied final month has no stable answer, and this module refuses to guess -------------------

test('the walks are exactly tied in the last month compared — "noStableCrossing", whatever came before', () => {
  // diff = a - b: +5,+5,0 (a = [10,20,15], b = [5,15,15]) — the LAST diff is 0.
  const a = series([10, 20, 15, 15, 15]);
  const b = series([5, 15, 15, 15, 15]);
  assert.deepEqual(crossoverPoint(a, b), { outcome: 'noStableCrossing' });
});

// --- §4 Oscillation: the tie-break rule is "the LAST flip", not "the FIRST" -------------------------
//
// diff = a - b at each of 7 months: +5000, +3000, -2000, -4000, +1000, +6000, +2000
//   (a = [105,103,98,96,101,106,102] thousands, b = [100,100,100,100,100,100,100], both ×1000)
//
// Two DIFFERENT single numbers answer "where did it cross":
//   * the FIRST sign flip from the opening sign (+) is at index 2 (diff turns negative) — the naive
//     reading, and WRONG: B does not stay ahead from there, A retakes the lead at index 4.
//   * the LAST sign flip — the start of the run that lasts to the end of the walk — is at index 4,
//     and IS what "first overtakes … and stays ahead" means. `crossoverPoint` returns 4.

const OSCILLATING_A = [105_000, 103_000, 98_000, 96_000, 101_000, 106_000, 102_000];
const OSCILLATING_B = [100_000, 100_000, 100_000, 100_000, 100_000, 100_000, 100_000];
const OSCILLATING_MONTHS = ['2027-01', '2027-02', '2027-03', '2027-04', '2027-05', '2027-06', '2027-07'];
const oscillatingSeries = (values) => OSCILLATING_MONTHS.map((month, index) => ({ month, accessibleAssets: values[index] }));

test('an oscillating series reports the LAST stable flip (index 4), not the first (index 2)', () => {
  const result = crossoverPoint(oscillatingSeries(OSCILLATING_A), oscillatingSeries(OSCILLATING_B));
  assert.deepEqual(result, { outcome: 'crossed', index: 4, month: '2027-05', leader: 'a' });
});

/**
 * **The naive alternative, reproduced here as plain arithmetic so this test does not need to
 * reach into `crossover.ts`'s internals to state what it is NOT doing.** This is mutation (a) in
 * the report: a `crossoverPoint` rewritten to find the first sign change from the series' own
 * opening sign, rather than the last stable one, would return index 2 on this fixture — a
 * genuinely different, and wrong, date. Applying that rewrite to the source and re-running this
 * suite is the mutation battery for this file; this function is not exported by `crossover.ts` and
 * exists in the test only to show the divergent number by hand.
 */
const naiveFirstFlip = (a, b) => {
  const diffs = a.map((m, i) => m.accessibleAssets - b[i].accessibleAssets);
  const openingSign = Math.sign(diffs[0]);
  const flip = diffs.findIndex((d) => Math.sign(d) !== 0 && Math.sign(d) !== openingSign);
  return flip;
};

test('the naive first-flip reading of the same fixture is a different index (2, not 4) — the two disagree', () => {
  assert.equal(naiveFirstFlip(oscillatingSeries(OSCILLATING_A), oscillatingSeries(OSCILLATING_B)), 2);
  const real = crossoverPoint(oscillatingSeries(OSCILLATING_A), oscillatingSeries(OSCILLATING_B));
  assert.equal(real.index, 4);
  assert.notEqual(real.index, 2);
});

// --- §5 The metric matters: `accessibleAssets` and TOTAL wealth disagree here on purpose ------------
//
// A holds $5,000 of locked-up super (`protectedAssets`, constant) and an `accessibleAssets` figure
// that climbs from $100 to $500. B holds no locked super, a constant $1,000 `assessableAssets`, and
// a constant $250 `accessibleAssets`.
//
//   accessible diff (a - b): -150, -100, +50, +150, +250 → crosses at index 2, A takes the lead.
//   TOTAL wealth diff ((protected+assessable) a - b): (5000+0)-(0+1000) = 4000 in EVERY month →
//     positive throughout — total wealth says A led from month 0, and never mentions a crossing at
//     all. That is the FLATTERING direction `plan.ts`'s own `accessibleAssets` doc comment names:
//     total wealth counts the $5,000 A can not spend yet.
//
// `crossoverPoint` only ever reads `accessibleAssets` — see the assertion below and the header's
// claim that this module does not import `protectedAssets` or `assessableAssets` at all.

test('accessibleAssets and total wealth disagree, and crossoverPoint follows accessibleAssets', () => {
  const a = MONTHS.map((month, index) => ({
    month,
    accessibleAssets: [100, 150, 300, 400, 500][index],
    protectedAssets: 5000,
    assessableAssets: 0,
  }));
  const b = MONTHS.map((month) => ({ month, accessibleAssets: 250, protectedAssets: 0, assessableAssets: 1000 }));

  // Sanity check on the TOTAL-wealth reading named in the comment above: A's total is 5000 flat,
  // B's is 1000 flat, so total wealth never crosses — it says A led throughout.
  const totalDiffs = a.map((m, i) => m.protectedAssets + m.assessableAssets - (b[i].protectedAssets + b[i].assessableAssets));
  assert.ok(totalDiffs.every((d) => d === 4000));

  assert.deepEqual(crossoverPoint(a, b), { outcome: 'crossed', index: 2, month: '2027-03', leader: 'a' });
});

// --- §6 Refusals: the structural checks `comparisonSeries.ts` already makes of two walks ------------

test('an empty walk on either side is refused rather than compared', () => {
  assert.throws(() => crossoverPoint([], series([1, 2, 3, 4, 5])), RangeError);
  assert.throws(() => crossoverPoint(series([1, 2, 3, 4, 5]), []), RangeError);
});

test('two walks whose months disagree are refused, not compared past the divergence', () => {
  const a = series([1, 2, 3, 4, 5]);
  const b = [{ month: '1999-01', accessibleAssets: 1 }, ...series([1, 2, 3, 4]).slice(1)];
  assert.throws(() => crossoverPoint(a, b), RangeError);
});

test('two walks of different lengths are refused', () => {
  assert.throws(() => crossoverPoint(series([1, 2, 3, 4, 5]), series([1, 2, 3, 4]).slice(0, 3)), RangeError);
});
