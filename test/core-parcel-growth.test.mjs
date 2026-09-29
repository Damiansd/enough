// P3-21f chunk 2 — GROWTH ACCRUES TO MARKET VALUE, NEVER TO COST BASE.
//
// The pool was already grown monthly at `Settings.nominalReturn` before this chunk; what chunk 2
// adds is the ruling about WHERE that growth lands, and the assertions that make it a defended fact
// rather than an accident of how `parcelsGrownForOneMonth` happens to be written today.
//
// ⚠️ **WHY THIS FILE EXISTS AND WHY THE CHUNK 1 DIGESTS CANNOT STAND IN FOR IT.** Growing the cost
// base alongside the market value makes every future gain VANISH — the parcel's unrealised gain
// stops growing, the CGT bill of chunks 4 and 5 shrinks toward zero across a forty-year walk, and
// every figure on screen stays perfectly plausible. It is the P3-21a "wrong answer looks right"
// flavour. The byte-identical fixtures in `core-non-super-parcels.test.mjs` do **not** catch it, and
// that was established by running the mutation rather than assumed: no cost base reaches a `Month`
// field before chunk 4, so those digests pass unchanged under it. So chunk 2 writes its own
// assertions and every one of them is a DOLLAR FIGURE — not a boolean, not a shape.
//
// **Three things are defended here and nothing else.**
//
//   1. **A year of growth is ALL unrealised gain.** $100,000 bought for $60,000 grows to
//      $106,499.92 in twelve months; the cost base is still $60,000.00 to the cent, so the gain grew
//      by exactly the growth — $649.92, the same figure twice.
//   2. **The two mutations, run as arithmetic in this file rather than described.** A cost base
//      grown at the same factor, and a cost base grown while the value stands still: both are
//      computed here and both disagree with the model by a stated number of cents.
//   3. **The per-parcel flooring residue UNDER-states, always.** `0 ≤ ⌊f·Σvᵢ⌋ − Σ⌊vᵢf⌋ ≤ n − 1`
//      cents a month, proven by sweep over 6 rates × thousands of splits, pinned as a figure, and
//      separated from the `ceil` reading by a figure `ceil` cannot produce.
//
// Out of scope by the chunk plan and deliberately untested here: entry (chunk 3), disposal and the
// 50% discount (chunk 4), the tax bases (chunk 5) and limb 3 drawing at all (chunk 6). No cost base
// reaches a `Month` field in this chunk, and no assertion below pretends one does.
import test from 'node:test';
import assert from 'node:assert/strict';

import { toCents } from '../dist/core/money.js';
import { financialAssets, splitAssets } from '../dist/core/household.js';
import { grownForOneMonth, monthlyGrowthFactor, parcelsGrownForOneMonth, project } from '../dist/core/projection.js';

const person = (name, dateOfBirth, over = {}) => ({
  name,
  dateOfBirth,
  superInterests: [],
  parcels: [],
  employmentIncomePerFortnight: toCents(0),
  workBonusBalance: toCents(0),
  ...over,
});

/** Bought for $60,000, worth $100,000 today. The two figures are far apart on purpose: a fixture
 *  where the cost base equalled the market value could not tell a cost base that moved from one
 *  that did not. */
const BOUGHT = toCents(60_000);
const heldParcel = (over = {}) => ({ acquired: '2015-03-02', costBase: BOUGHT, marketValue: toCents(100_000), ...over });

const SETTINGS = {
  asAtDate: '2026-09-16',
  planningHorizonAge: 58,
  economicSeries: { cpi: 0.025, pblci: 0.025, awote: 0.035, mtawe: 0.035 },
  deemingRates: { lower: 0.0175, upper: 0.0375 },
  nominalReturn: 0.065,
};

/** A year of the model's own growth, month by month on the carried figure. */
const grownForAYear = (parcels, nominalReturn = 0.065) => {
  let carried = parcels;
  for (let m = 0; m < 12; m += 1) carried = parcelsGrownForOneMonth(carried, nominalReturn);
  return carried;
};

// --- 1. A year of growth, and all of it is unrealised gain ---------------------------------------

test('HAND-WORKED — a year of growth moves the MARKET VALUE and the cost base does not move a cent', () => {
  const [after] = grownForAYear([heldParcel()]);

  // The value: $100,000.00 → $106,499.92. Twelve compounded months, floored on the carry each time,
  // so it lands eight cents under the $106,500.00 a single annual application would give.
  assert.equal(after.marketValue, 10_649_992);
  assert.equal(toCents(106_500) - after.marketValue, 8, 'twelve floorings cost at most twelve cents');

  // The cost base: unchanged, as a figure. THIS is the line the trap dies on. It is $60,000.00 after
  // a year of growth because a cost base is what was paid, and growth is not a payment.
  assert.equal(after.costBase, 6_000_000);
  assert.equal(after.costBase, BOUGHT);
  assert.equal(after.acquired, '2015-03-02', 'and the acquisition day the discount turns on is untouched too');

  // The assertion the chunk exists for, stated as the same dollar figure reached two ways: the gain
  // grew by EXACTLY the growth, because every cent of the growth is unrealised gain.
  const gainBefore = toCents(100_000) - BOUGHT;
  const gainAfter = after.marketValue - after.costBase;
  assert.equal(gainBefore, 4_000_000);
  assert.equal(gainAfter, 4_649_992);
  assert.equal(gainAfter - gainBefore, 649_992);
  assert.equal(after.marketValue - toCents(100_000), 649_992);

  // One month, on its own, so the year above cannot be the only witness.
  const [oneMonth] = parcelsGrownForOneMonth([heldParcel()], 0.065);
  assert.equal(oneMonth.marketValue, 10_052_616);
  assert.equal(oneMonth.costBase, 6_000_000);
  assert.equal(oneMonth.marketValue - oneMonth.costBase, 4_052_616);
});

test('the control: a nil return moves NEITHER figure, so the assertions above are not vacuous', () => {
  const [flat] = grownForAYear([heldParcel()], 0);
  assert.equal(flat.marketValue, toCents(100_000));
  assert.equal(flat.costBase, 6_000_000);
  assert.equal(flat.marketValue - flat.costBase, 4_000_000, 'the gain stands still when the value does');

  // A falling market takes the value down and still leaves the cost base where it was — the gain
  // shrinks, and at a long enough fall it would go negative, which is a LOSS and is chunk 4's.
  const [fallen] = grownForAYear([heldParcel()], -0.2);
  assert.equal(fallen.marketValue, 7_999_994);
  assert.equal(fallen.costBase, 6_000_000);
  assert.equal(fallen.marketValue - fallen.costBase, 1_999_994);
});

// --- 2. The two mutations, computed here rather than described -----------------------------------

test('MUTATION — a cost base grown at the SAME factor makes the year of gain vanish, by $649.92', () => {
  // The mutant, written out: `costBase: grownForOneMonth(parcel.costBase, r)` beside the market
  // value. Every figure it produces is plausible — a rising value, a rising cost, both in cents.
  let mutant = heldParcel();
  for (let m = 0; m < 12; m += 1) {
    mutant = {
      ...mutant,
      costBase: grownForOneMonth(mutant.costBase, 0.065),
      marketValue: grownForOneMonth(mutant.marketValue, 0.065),
    };
  }
  const [real] = grownForAYear([heldParcel()]);

  // It agrees with the model on the money the means test sees, to the cent. That is why the
  // byte-identical digests cannot see it.
  assert.equal(mutant.marketValue, real.marketValue);

  // And it disagrees on the only figure that matters to a disposal. The mutant's cost base has
  // gained $389.99 it never paid, and the year's gain is $259.93 instead of $649.92 — 40% of it, the
  // same 60/100 the parcel started at, gone.
  assert.equal(mutant.costBase, 6_389_996);
  assert.equal(mutant.costBase - real.costBase, 389_996);
  assert.equal(mutant.marketValue - mutant.costBase - 4_000_000, 259_996);
  assert.equal(real.marketValue - real.costBase - 4_000_000, 649_992);
  assert.equal(649_992 - 259_996, 389_996, 'the gain that vanishes is exactly the cost base that was invented');

  // Run far enough out it is not a rounding argument: at forty years the mutant's gain is a fixed
  // 40% of the value and the model's is what the household actually owes tax on.
  let far = heldParcel();
  let honest = heldParcel();
  for (let m = 0; m < 480; m += 1) {
    far = { ...far, costBase: grownForOneMonth(far.costBase, 0.065), marketValue: grownForOneMonth(far.marketValue, 0.065) };
    honest = parcelsGrownForOneMonth([honest], 0.065)[0];
  }
  assert.equal(honest.marketValue, 124_159_683);
  assert.equal(honest.costBase, 6_000_000);
  assert.equal(honest.marketValue - honest.costBase, 118_159_683);
  assert.equal(far.marketValue, 124_159_683, 'the mutant holds the same money — only the gain differs');
  assert.equal(far.costBase, 74_495_487);
  assert.equal(far.marketValue - far.costBase, 49_664_196);
  assert.equal(honest.marketValue - honest.costBase - (far.marketValue - far.costBase), 68_495_487);
});

test('MUTATION — a cost base grown while the VALUE stands still is the same trap, read the other way', () => {
  let mutant = heldParcel();
  for (let m = 0; m < 12; m += 1) mutant = { ...mutant, costBase: grownForOneMonth(mutant.costBase, 0.065) };
  const [real] = grownForAYear([heldParcel()]);

  assert.equal(mutant.marketValue, toCents(100_000));
  assert.equal(real.marketValue - mutant.marketValue, 649_992, 'the pool is $649.92 short of the money it holds');
  assert.equal(mutant.costBase, 6_389_996);
  assert.equal(real.costBase - mutant.costBase, -389_996);
  assert.equal(mutant.marketValue - mutant.costBase, 3_610_004, 'and the gain has gone BACKWARDS in a rising market');
});

// --- The walk: the growth reaches the assessed pool, and the cost base stays out of it ------------

test('HAND-WORKED — a projected year puts the same $106,499.92 in the means test, cost base or none', () => {
  const walk = (costBase) =>
    project(
      SETTINGS,
      { persons: [person('Ken', '1970-01-01', { parcels: [heldParcel({ costBase })] })], homeStatus: 'occupied' },
      [],
    );

  const months = walk(BOUGHT);
  assert.equal(months.length, 17, 'a real walk, not an empty array that would agree for the wrong reason');
  assert.equal(months[0].assessableAssets, toCents(100_000));
  assert.equal(months[0].month, '2026-09');
  assert.equal(months[12].month, '2027-09');
  // The same figure the unit path above produced, reached through `project()`.
  assert.equal(months[12].assessableAssets, 10_649_992);
  assert.equal(months[12].assessableAssets - months[0].assessableAssets, 649_992);

  // And the cost base is not in it. Three wildly different cost bases on the same market value give
  // the same assessed figure month for month — the means test assesses what the parcel is WORTH.
  for (const other of [toCents(0), toCents(100_000), toCents(5_000_000)]) {
    assert.deepEqual(walk(other).map((m) => m.assessableAssets), months.map((m) => m.assessableAssets));
  }
  assert.equal(walk(toCents(5_000_000))[12].assessableAssets, 10_649_992);
});

test('the derived scalar follows the market value and never the cost base', () => {
  const held = person('Ken', '1970-01-01', { parcels: grownForAYear([heldParcel()]) });
  assert.equal(financialAssets(held), 10_649_992);

  const split = splitAssets({ persons: [held], homeStatus: 'occupied' }, '2027-09-16');
  assert.equal(split.assessableAssets, 10_649_992);
  assert.equal(split.deemedFinancialAssets, 10_649_992);
  // Not the cost base, and not the two added together — both are figures a wrong wiring produces.
  assert.notEqual(split.assessableAssets, 6_000_000);
  assert.notEqual(split.assessableAssets, 16_649_992);
});

// --- 3. The flooring residue: direction settled, magnitude stated --------------------------------

test('the per-parcel floor UNDER-states and can never over-state — ⌊f·Σvᵢ⌋ − Σ⌊vᵢf⌋ is in [0, n−1]', () => {
  // The scalar this replaced floored ONCE on the pool total; parcels floor once each. Settled in
  // chunk 2 rather than escalated: it under-states the household, which is the direction this build
  // takes every time, and correcting it would mean a rule about which parcel gets a cent it did not
  // earn — a rule chunk 4 would then have to read out of a disposal.
  const [one] = parcelsGrownForOneMonth([heldParcel()], 0.065);
  const three = parcelsGrownForOneMonth(
    [heldParcel({ marketValue: toCents(33_333.33) }), heldParcel({ marketValue: toCents(33_333.33) }), heldParcel({ marketValue: toCents(33_333.34) })],
    0.065,
  );
  const pooled = three.reduce((sum, p) => sum + p.marketValue, 0);
  assert.equal(one.marketValue, 10_052_616);
  assert.equal(pooled, 10_052_614);
  assert.equal(one.marketValue - pooled, 2, 'two cents a month on $100,000 in three parcels: n − 1, and never negative');

  // Over a year the gap stays bounded by the same n − 1 a month and does not compound away.
  const yearOne = grownForAYear([heldParcel()])[0].marketValue;
  const yearThree = grownForAYear(
    [toCents(33_333.33), toCents(33_333.33), toCents(33_333.34)].map((v) => heldParcel({ marketValue: v })),
  ).reduce((s, p) => s + p.marketValue, 0);
  assert.equal(yearOne, 10_649_992);
  assert.equal(yearThree, 10_649_986);
  assert.ok(yearThree < yearOne, 'the split pool is the smaller one');
  assert.ok(yearOne - yearThree <= 2 * 12, `a year of three parcels may lose at most 24 cents, lost ${yearOne - yearThree}`);

  // The sweep: six rates against thousands of splits, checked for BOTH halves of the claim. If a
  // single split over-stated, this is where it would show, and the assertion names the split.
  let worst = 0;
  let seen = 0;
  for (const r of [0.065, 0.0001, 0.2, 0.5, -0.1, -0.9]) {
    const f = monthlyGrowthFactor(r);
    for (let n = 2; n <= 8; n += 1) {
      for (let step = 1; step <= 400; step += 1) {
        const values = Array.from({ length: n }, (_, i) => (step * 7919 * (i + 3) + i * 131) % 5_000_000);
        const total = values.reduce((sum, v) => sum + v, 0);
        const parcels = parcelsGrownForOneMonth(values.map((v) => heldParcel({ marketValue: v })), r);
        const split = parcels.reduce((sum, p) => sum + p.marketValue, 0);
        const scalar = grownForOneMonth(total, r);
        const residue = scalar - split;
        assert.ok(residue >= 0, `over-stated at r=${r}: ${JSON.stringify(values)} gave ${split} against ${scalar}`);
        assert.ok(residue <= n - 1, `residue ${residue} exceeded n − 1 = ${n - 1} at r=${r}: ${JSON.stringify(values)}`);
        // And no split ever moved a cost base, at any rate.
        assert.equal(parcels.filter((p) => p.costBase !== BOUGHT).length, 0);
        if (residue > worst) worst = residue;
        seen += 1;
      }
    }
  }
  assert.equal(seen, 16_800, 'the sweep ran the splits it claims to have run');
  assert.ok(worst >= 4, `the sweep reached a real residue, not a pool of zeroes: worst was ${worst}`);
});

test('MUTATION — rounding growth UP instead of down over-states, and that is why the floor is the rule', () => {
  // `Math.ceil` in place of `Math.floor` is the reading that reverses the residue's direction: the
  // pool then comes out ABOVE the arithmetic, month after month, in the direction that flatters the
  // household. These are the figures that separate the two readings.
  const f = monthlyGrowthFactor(0.065);
  assert.equal(Math.ceil(toCents(100_000) * f), 10_052_617);
  assert.equal(parcelsGrownForOneMonth([heldParcel()], 0.065)[0].marketValue, 10_052_616);

  let ceiled = toCents(100_000);
  for (let m = 0; m < 12; m += 1) ceiled = Math.ceil(ceiled * f);
  assert.equal(ceiled, 10_650_005);
  assert.equal(grownForAYear([heldParcel()])[0].marketValue, 10_649_992);
  assert.equal(ceiled - 10_649_992, 13, 'thirteen cents a year on $100,000, all of it upward');
  assert.ok(ceiled > toCents(106_500), 'ceil pays MORE than the stated annual rate; floor pays less');

  // Under `ceil` the multi-parcel split would over-state the pool instead of under-stating it —
  // Σ⌈vᵢf⌉ ≥ ⌈f·Σvᵢ⌉ ≥ ⌊f·Σvᵢ⌋ — which is the reason the direction claim above is a claim about
  // the floor and not about splitting.
  const values = [toCents(33_333.33), toCents(33_333.33), toCents(33_333.34)];
  const ceilSplit = values.reduce((sum, v) => sum + Math.ceil(v * f), 0);
  assert.equal(ceilSplit, 10_052_617);
  assert.ok(ceilSplit > Math.floor(toCents(100_000) * f));
});
