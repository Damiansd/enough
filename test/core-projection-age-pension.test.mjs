// P4-1 chunk 2 — the Age Pension, wired into the month walk.
//
// Chunk 1's module contained no arithmetic, so its tests were about the shape of time. This one has
// exactly one number in it, and the number is the whole point, so every figure below is HAND-WORKED
// from the register's published rates and written out long. A test that asserted whatever the code
// produced would ratify a wrong formula as readily as a right one.
//
// Three things are defended here and nothing else — four, since P4-1 chunk 5a gave this file's own
// `COUPLE` the first balances in the model that move, and the figure that used to be constant
// across five months is now the figure that proves they do:
//
//   1. the entitlement is computed PER MONTH, on that month's own parameters — proven across the
//      20 September 2026 reindexation, where the right answer changes and a frozen figure cannot;
//   2. the fortnight → month conversion is one stated convention with one rounding, exercised on a
//      month where it divides exactly and a month where it does not;
//   3. ADR-0005: the means test consumes `assessableAssets` and NEVER `protectedAssets` — on a
//      fixture where the two figures are different and would give different answers;
//   4. and, from chunk 5a, that BOTH of those figures move month on month at
//      `Settings.nominalReturn`. The ADR-0005 guard in `project()` compares the two means-test call
//      sites against each other, so it catches them DISAGREEING and cannot catch both being
//      uniformly stale. That is what the hand-worked moving figures below are for.
import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { toCents } from '../dist/core/money.js';
import {
  FORTNIGHTS_PER_YEAR,
  LAST_PUBLISHED_AGE_PENSION_MONTH,
  agePensionParametersCover,
  firstDayOf,
  monthlyFromFortnightly,
  project,
} from '../dist/core/projection.js';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

// --- The fixtures --------------------------------------------------------------------------------

const person = (name, dateOfBirth, superInterests = []) => ({
  name,
  dateOfBirth,
  superInterests,
  parcels: [],
  employmentIncomePerFortnight: toCents(0),
  workBonusBalance: toCents(0),
});

/** The 20 September 2026 DETERMINED rates, stated so the fixture does not depend on the fallback. */
const DEEMING = { lower: 0.0175, upper: 0.0375 };

const settings = (planningHorizonAge) => ({
  asAtDate: '2026-09-16',
  planningHorizonAge,
  economicSeries: { cpi: 0.025, pblci: 0.025, awote: 0.035, mtawe: 0.035 },
  deemingRates: DEEMING,
  nominalReturn: 0.065,
  // Interest on cash (2026-09-23) is not this fixture's subject: stated nil, the control proved byte-identical to the walk before it existed.
  cashInterestRate: 0,
});

/**
 * A single pensioner, 71, who owns her home and holds nothing else. Both means tests are therefore
 * nil and the entitlement is the Maximum Payment Rate exactly — which is what makes the 20 September
 * step hand-workable to the cent without a taper in the way.
 *
 * A horizon of 72 stops the walk in 2027-04, one month past the last Age Pension parameter period,
 * so this ONE fixture spans BOTH boundaries this chunk cares about: the rate reindexation and the
 * end of the register's window.
 */
const SINGLE = { persons: [person('Val', '1955-04-17')], homeStatus: 'occupied' };
const SINGLE_SETTINGS = settings(72);

/**
 * A couple whose Protected and Assessable figures are DIFFERENT and, more importantly, would give
 * DIFFERENT entitlements if the means test read the wrong one. Val is 71 and holds a $700,000
 * account-based pension (assessable, and deemed); Ken is 56 and holds $400,000 in Accumulation
 * Phase, which the younger-partner exemption protects (§4.8, T27).
 *
 * The numbers are chosen so the ASSETS test binds: $700,000 is well past the $499,000 couple
 * homeowner free area, while $400,000 is below it — so feeding the protected figure to the assets
 * test would not merely shift the answer, it would change which test binds.
 */
const COUPLE = {
  persons: [
    person('Val', '1955-04-17', [{ phase: 'accountBasedPension', balance: toCents(700_000) }]),
    person('Ken', '1970-01-01', [{ phase: 'accumulation', balance: toCents(400_000) }]),
  ],
  homeStatus: 'occupied',
};
const COUPLE_SETTINGS = settings(57); // Ken turns 57 in 2027-01, so the walk is five months.

/**
 * **The fixture that exists to stop three mutations surviving**, each of which the two fixtures
 * above cannot see:
 *
 *   * `householdRatePerFortnight` swapped for `perPersonRatePerFortnight` or for
 *     `combinedRatePerFortnight`. Above, only ONE Person is eligible, so the per-Person and the
 *     Household figures are the same number and the swap is invisible. Here BOTH are eligible, and
 *     the three figures are $555.31, $1,110.61 and $1,110.62 — all different, and the one-cent gap
 *     between the combined rate and twice its half is the rounding `halve`'s own doc warns about.
 *   * `settings.deemingRates` dropped from the call, letting `resolveDeemingRates` fall back to the
 *     determination. Above, the fixture's Setting IS the 20 September 2026 determination, so
 *     dropping it changes nothing. Here the Setting is a deliberate scenario lever — 5% / 9%, far
 *     from any determination — AND the income test binds, so the rates reach the answer. On the
 *     determined rates the ASSETS test would bind instead and the month would be $3,386.50.
 *
 * Both 70, both drawing an account-based pension, nothing protected.
 */
const BOTH_ELIGIBLE = {
  persons: [
    person('Ros', '1955-04-17', [{ phase: 'accountBasedPension', balance: toCents(300_000) }]),
    person('Jim', '1954-03-02', [{ phase: 'accountBasedPension', balance: toCents(300_000) }]),
  ],
  homeStatus: 'occupied',
};
/**
 * **`asAtDate` is 1 October on purpose (chunk 5a).** Balances now GROW month on month, and the
 * first month of a walk is the one that reports the figures the user stated — so starting here puts
 * the 20 September rates and the stated $300,000 balances in the SAME month, and every figure below
 * stays hand-workable on round numbers. Growth is not what this test is about; it is asserted as a
 * moving figure on `COUPLE` above and in `core-projection-growth.test.mjs`.
 */
const BOTH_ELIGIBLE_SETTINGS = {
  ...settings(72),
  asAtDate: '2026-10-01',
  deemingRates: { lower: 0.05, upper: 0.09 },
};

const lineFor = (month, description) => month.lines.filter((l) => l.description === description);
const agePensionIn = (months, isoMonth) => lineFor(months.find((m) => m.month === isoMonth), 'Age Pension');

// --- The conversion, stated once -----------------------------------------------------------------

test('the fortnight → month conversion is 26 ÷ 12, rounded once, in ONE place', () => {
  assert.equal(FORTNIGHTS_PER_YEAR, 26);
  // Exact case: $1,200.90 a fortnight × 26 = $31,223.40 a year ÷ 12 = $2,601.95 a month, on the nose.
  assert.equal(monthlyFromFortnightly(toCents(1_200.9)), 260_195);
  // Inexact case, which is what forces a rounding decision to exist at all: $1,237.70 × 26 =
  // $32,180.20 ÷ 12 = $2,681.6833…, and `mulCents` rounds half away from zero → $2,681.68.
  assert.equal(monthlyFromFortnightly(toCents(1_237.7)), 268_168);
  // Half-away-from-zero, exercised on a figure that lands exactly on the half cent:
  // 6 cents a fortnight × 26 ÷ 12 = 13 cents exactly; 3 cents × 26 ÷ 12 = 6.5 → 7.
  assert.equal(monthlyFromFortnightly(toCents(0.06)), 13);
  assert.equal(monthlyFromFortnightly(toCents(0.03)), 7);
  // Twelve months at a constant rate sum to the annual figure exactly — the invariant that chooses
  // 26 over 365.25 ÷ 14. Asserted on the exact case, where the claim is unqualified.
  assert.equal(monthlyFromFortnightly(toCents(1_200.9)) * 12, 1_200.9 * 26 * 100);
  // And the convention is DISCRIMINATING: a day-count conversion gives a different cent, so a test
  // that matches this one is not matching by accident.
  assert.notEqual(monthlyFromFortnightly(toCents(1_200.9)), Math.round(120_090 * (365.25 / 14) / 12));
  assert.notEqual(monthlyFromFortnightly(toCents(1_200.9)), Math.round((120_090 * 12) / 12));
});

test('a month is read on its FIRST day, and that is the whole of the ruling', () => {
  assert.equal(firstDayOf('2026-09'), '2026-09-01');
  assert.equal(firstDayOf('2027-04'), '2027-04-01');
  assert.throws(() => firstDayOf('2026-9'), /not a zero-padded ISO month/);
});

// --- Per-month, across the 20 September reindexation ---------------------------------------------

test('HAND-WORKED — the 20 September 2026 step appears in the walk, month by month', () => {
  const months = project(SINGLE_SETTINGS, SINGLE, []);
  assert.equal(months[0].month, '2026-09');

  // September 2026 is read on 2026-09-01, so the 20 MARCH 2026 rates apply (DSS, register §4.2):
  //   maximum basic rate, single        $1,100.30
  //   Pension Supplement, maximum       $   86.50
  //   Energy Supplement (never indexed) $   14.10
  //                                     ---------
  //   Maximum Payment Rate              $1,200.90 per fortnight
  // No assets and no income, so both means tests are nil and the entitlement IS the maximum.
  //   $1,200.90 × 26 ÷ 12 = $2,601.95 per month.
  const september = agePensionIn(months, '2026-09');
  assert.equal(september.length, 1, 'exactly one Age Pension line, or none at all');
  assert.equal(september[0].amount, 260_195);
  assert.equal(september[0].direction, 'inflow');

  // October 2026 is read on 2026-10-01, past the 20 September indexation:
  //   $1,135.40 + $88.20 + $14.10 = $1,237.70 per fortnight
  //   $1,237.70 × 26 ÷ 12 = $2,681.6833… → $2,681.68 per month.
  const october = agePensionIn(months, '2026-10');
  assert.equal(october.length, 1);
  assert.equal(october[0].amount, 268_168);

  // The two consecutive months DIFFER — which is the assertion. A projection that resolved the
  // parameters once and carried one figure forward would give the same number twice and pass every
  // other test in this file.
  assert.notEqual(september[0].amount, october[0].amount);
  assert.equal(october[0].amount - september[0].amount, 7_973);

  // And the new rate then HOLDS, rather than the walk drifting a little every month.
  for (const month of ['2026-11', '2026-12', '2027-01', '2027-02', '2027-03']) {
    assert.deepEqual(agePensionIn(months, month).map((l) => l.amount), [268_168], `${month} drifted`);
  }
});

test('the Age Pension line is the ONLY line, and chunk 4 banks it — HAND-WORKED, month by month', () => {
  // This read "…and the balances are still zero" through chunk 3. Chunk 4 is the chunk that gives
  // them meaning, and this fixture is the cleanest possible test of the reconciliation: Val has no
  // salary, no spending level and no one-off, so the ONLY thing that can move a balance is the Age
  // Pension line above it. A `closingBalance` that ignored the lines would stay at nil here.
  const months = project(SINGLE_SETTINGS, SINGLE, []);
  let previous = toCents(0);
  for (const month of months) {
    assert.ok(month.lines.length <= 1, `${month.month} grew a line this chunk did not author`);
    for (const line of month.lines) {
      assert.equal(line.description, 'Age Pension');
      assert.equal(line.direction, 'inflow');
      assert.ok(line.amount > 0, 'MonthLine.amount is specified as always positive');
    }
    assert.equal(month.openingBalance, previous, `${month.month} does not open where the last month closed`);
    assert.equal(
      month.closingBalance,
      month.lines.reduce((b, l) => b + (l.effect !== 'cash' ? 0 : l.direction === 'inflow' ? l.amount : -l.amount), month.openingBalance),
      `${month.month} does not reconcile`,
    );
    previous = month.closingBalance;
  }

  // THE ARITHMETIC, long-hand. Seven months carry a pension and the eighth carries none:
  //   2026-09        $2,601.95   (the pre-20-September rate, on chunk 2's own hand-worked figure)
  //   2026-10 … 2027-03   6 × $2,681.68 = $16,090.08
  //   ───────────────────────────────────────────────
  //   2027-03 closing     $18,692.03
  assert.equal(months[0].openingBalance, toCents(0));
  assert.equal(months[0].closingBalance, 260_195);
  assert.equal(260_195 + 6 * 268_168, 1_869_203);
  assert.equal(months.find((m) => m.month === '2027-03').closingBalance, 1_869_203);

  // ⚠️ **AND 2027-04 IS AN EIGHTH PAYMENT, AND FROM 2026-09-23 IT IS AN INDEXED ONE.** P4-1e
  // (2026-09-21) carried the 20 September 2026 sets forward, so April repeated October's $2,681.68 to
  // the cent and needed a `standing parameters` note to say it was not a March figure. The user has
  // since ruled that a plan stating no series indexes on its own growth rates, so April is computed
  // on the 20 March 2027 sets GENERATED from `cpi` 2.5%, `pblci` 2.5% and `mtawe` 3.5% — one half-year:
  //   combined basic        $1,711.80 × √1.025 = $1,733.07 (the MTAWE floor, 41.76% of 52 × $1,832.80
  //                         × √1.035 ÷ 26 = $1,557.31, is below it); single = 0.6633 × that = $1,149.54
  //   Pension Supplement    $88.20 × √1.025 = $89.30 — CPI only;  Energy Supplement $14.10, never moved
  //   means tests           Val banked $18,692.03 of pension in the Offset and holds nothing else,
  //                         against the 1 July 2026 free areas ($333,000; $226 a fortnight) — neither bites
  //   $1,252.94 × 26 ÷ 12 = $2,714.70, UP $33.02 on the carried figure: one half-year of 2.5%
  const april = months.at(-1);
  assert.equal(april.month, '2027-04');
  assert.deepEqual(april.lines.map((line) => [line.description, line.amount]), [['Age Pension', 271_470]]);
  // NO NOTE: nothing was carried, so there is no distance to state. The month carries neither the
  // window note nor the standing one — what it is computed from is on the line's provenance.
  assert.equal(april.notes.filter((n) => n.subject === 'parameter window').length, 0);
  assert.equal(april.notes.filter((n) => n.subject === 'standing parameters').length, 0);
  const [line] = april.lines;
  assert.ok(line.provenance.determination.includes('rates effective 2027-03-20'));
  assert.equal(line.provenance.determination.some((d) => d.includes('carried forward')), false);
  assert.equal(line.provenance.caveats.filter((c) => c.includes('not stated — generated from')).length, 1);
  // $18,692.03 + $2,714.70 = $21,406.73
  assert.equal(april.openingBalance, 1_869_203);
  assert.equal(april.closingBalance, 2_140_673);
  assert.equal(1_869_203 + 271_470, 2_140_673);
});

// --- The parameter window, and the gap past it ---------------------------------------------------

test('the PUBLISHED parameters stop at 2027-03 and the walk does not — it indexes them, and says so', () => {
  // ⚠️ **REWRITTEN 2026-09-21 (P4-1e), AND THE OLD TITLE IS KEPT IN THIS SENTENCE BECAUSE IT WAS
  // THE POINT OF THE TEST**: *"the Age Pension stops where the register's parameters stop — 2027-03,
  // and it is NOT a zero"*. It no longer stops. What the register publishes still stops there, and
  // that boundary is still asserted below — what changed is what the walk does past it, which is to
  // carry the last published sets forward under the user's ruling rather than emit nothing.
  assert.equal(LAST_PUBLISHED_AGE_PENSION_MONTH, '2027-03', 'the PUBLISHED window is unmoved');
  assert.equal(agePensionParametersCover('2027-03-01'), true);
  assert.equal(agePensionParametersCover('2027-04-01'), true, 'past the window is computable now, on carried rates');
  assert.equal(agePensionParametersCover('2045-06-01'), true, 'and it is unbounded above, as the standing table is');
  assert.equal(agePensionParametersCover('2026-01-01'), false, 'the window still has a LOWER edge, and it is the only one');

  const months = project(SINGLE_SETTINGS, SINGLE, []);
  assert.equal(months.at(-1).month, '2027-04', 'the fixture must actually cross the boundary');
  // The month after the window reports its assets exactly as before: the Offset is assessed at the
  // balance the month OPENS with, so the eighth payment made inside it does not change the figure
  // this month is assessed on. $18,692.03 is the hand-worked closing balance of the test above.
  assert.equal(months.at(-1).openingBalance, 1_869_203);
  assert.equal(months.at(-1).assessableAssets, 1_869_203);
  assert.equal(
    months.at(-1).assessableAssets - months.at(-1).openingBalance,
    toCents(0),
    'and nothing but the Offset — she holds no super and no portfolio',
  );

  // ⚠️ **TWO SUPERSEDED ASSERTIONS, KEPT AS TEXT BECAUSE THE REASONING BEHIND THEM IS STILL RIGHT
  // AND ONLY THE FACT MOVED.** This test used to end with:
  //
  //     assert.deepEqual([...months.at(-1).lines], [], 'a line was invented past the last parameter period');
  //     assert.equal(months.at(-1).lines.length, 0);
  //
  // and before P4-4's polish it carried the comment *"Absent, not zero: there is no line carrying 0,
  // because a computed zero and an uncomputed entitlement are different facts and `MonthLine.amount`
  // may not carry the difference."* Both are still the rule for a month nothing can be computed for
  // — which is now only a month BELOW the window — and neither was ever a claim that no line could
  // be RIGHT here. A line past the last published period is no longer invented; it is carried, and
  // the difference between those two is the whole of `standingFrom`.
  const april = months.at(-1);
  assert.equal(april.lines.length, 1);
  assert.equal(april.lines[0].description, 'Age Pension');

  // ⚠️ **THE STANDING NOTE THIS TEST ASSERTED IS GONE FROM THE WALK (2026-09-23).** P4-1e carried
  // the last published sets forward and April said so in a `standing parameters` note. A plan that
  // states no series now indexes on its own growth rates, so nothing is carried and the walk never
  // emits that note: the distance a reader must see is now the line's provenance, which names the
  // generated series as its forecast input.
  assert.equal(april.notes.filter((n) => n.subject === 'standing parameters').length, 0);
  assert.equal(months.filter((m) => m.notes.some((n) => n.subject === 'standing parameters')).length, 0);
  assert.ok(april.lines[0].provenance.caveats.some((c) => c.includes('not stated — generated from')));
  assert.equal(april.closingBalance - april.openingBalance, april.lines[0].amount);

  // NOT VACUOUS — a month INSIDE the window names no generated series, because it consumed none: the
  // published records answer it. And no month of this walk carries the window note at all: nothing
  // here falls below the first determination.
  const march = months.find((m) => m.month === '2027-03');
  assert.equal(march.lines.filter((l) => l.description === 'Age Pension').length, 1);
  assert.equal(march.lines[0].provenance.caveats.some((c) => c.includes('generated from')), false);
  assert.ok(april.lines[0].amount > march.lines[0].amount, 'the generated 20 March 2027 set is a RISE');
  assert.equal(months.filter((m) => m.notes.some((n) => n.subject === 'parameter window' && n.register === 'Age Pension')).length, 0);
});

// --- ADR-0005 ------------------------------------------------------------------------------------

test('HAND-WORKED — ADR-0005: the means test consumes assessableAssets and never protectedAssets', () => {
  const months = project(COUPLE_SETTINGS, COUPLE, []);
  const october = months.find((m) => m.month === '2026-10');

  // The split (household.ts, §4.8 / T27): Val's account-based pension is assessable and deemed;
  // Ken's Accumulation Phase balance is protected by the younger-partner exemption.
  //
  // **Both figures have MOVED (chunk 5a), and that is why this month is worth hand-working.**
  // October is month 1, so each balance has had exactly one month of `nominalReturn: 0.065`
  // compounded — ×(1.065)^(1/12) = ×1.005261694277…, floored to the cent:
  //   Val   70,000,000c × 1.005261694… = 70,368,318.599… → 70,368,318c = $703,683.18
  //   Ken   40,000,000c × 1.005261694… = 40,210,467.771… → 40,210,467c = $402,104.67
  // A simple twelfth (`r / 12`) would have given Val $703,791.66 — $108.48 more, in month ONE.
  //
  // ⚠️ **AND A THIRD POOL JOINED THE ASSESSABLE FIGURE IN P4-3b: the Offset Account.** October
  // opens with the $1,308.02 of September Age Pension the Household banked — this fixture has no
  // spending level — and the Offset is assessed at the balance the month OPENS with, so:
  //   assessable  $703,683.18 (Val's super) + $1,308.02 (the Offset) = **$704,991.20**
  // Ken's protected figure is untouched by that: the Offset is assessable, not protected.
  assert.equal(october.openingBalance, 130_802);
  assert.equal(october.assessableAssets - october.openingBalance, 70_368_318, 'the super half alone');
  assert.equal(october.assessableAssets, 70_499_120);
  assert.equal(october.protectedAssets, 40_210_467);
  assert.notEqual(october.assessableAssets, october.protectedAssets, 'the fixture cannot tell them apart');

  // ASSETS test, on the ASSESSABLE figure, 20 Sep 2026 rates + 1 Jul 2026 means test:
  //   maximum payment rate, couple combined  $1,711.80 + $133.00 + $21.20 = $1,866.00 / fortnight
  //   assets free area, couple homeowner                                    $499,000
  //   excess  $704,991.20 − $499,000 = $205,991.20, FLOORED to the nearest $500 below (T135, SSA
  //     1991 s1064 point 1064-G7) = $205,500.00
  //   taper   $205,500.00 ÷ 1,000 × $3.00 = $616.50
  //   rate    $1,866.00 − $616.50 = $1,249.50 / fortnight
  //
  // INCOME test, deemed on the same $704,991.20 at the 20 Sep 2026 determination (not stepped —
  // the G7 floor is an assets-test rule only):
  //   lower  $110,600 × 1.75% = $1,935.50
  //   upper  ($704,991.20 − $110,600) = $594,391.20 × 3.75% = $22,289.67
  //   annual $24,225.17  ÷ 26 = $931.7373… → $931.74 / fortnight
  //   excess $931.74 − $396.00 = $535.74     taper ×50% = $267.87
  //   rate   $1,866.00 − $267.87 = $1,598.13 / fortnight
  //
  // The LOWER binds: the assets test, $1,249.50 combined → halved = $624.75 each → one
  // eligible Person (Ken is 56) → $624.75 per fortnight to the Household.
  //   $624.75 × 26 ÷ 12 = $1,353.625 → $1,353.63 per month.
  const line = lineFor(october, 'Age Pension');
  assert.deepEqual(line.map((l) => l.amount), [135_363]);

  // **And the growth is what moved it.** On the STATED $700,000 the assets test taper was $603.00,
  // the rate $1,263.00, and the month $1,368.25 — which is what this assertion read before balances
  // could move, and what it would read again if either means-test call site went back to the static
  // `Household`. One month of growth costs this Household $11.37 of Age Pension (was $11.96 before
  // T135's floor — the floor shrinks the taper, so it also shrinks what a month of growth costs).
  assert.notEqual(line[0].amount, 136_825);

  // **And the OFFSET is what moved it the rest of the way, which is P4-3b measured on one month.**
  // On the super alone — $703,683.18, the figure this assertion read until 2026-09-18 — the excess
  // $204,683.18 floors to $204,500.00, the taper is $613.50, the rate $1,252.50, halved to $626.25
  // each, and the month $1,356.88. Banking $1,308.02 of last month's own pension pushes the floored
  // excess from $204,500 to $205,500 — one $1,000 step on the combined figure, not $1,308.02's
  // worth of taper — costing the Household **$3.25 a month** of this one's, less than the $4.25 a
  // continuous taper charged before T135. A build that took the Offset back out of the split would
  // read $1,356.88 here.
  assert.notEqual(line[0].amount, 135_688);
  assert.equal(135_688 - line[0].amount, toCents(3.25));

  // The discriminating half. Had the assets test been handed the PROTECTED figure, $402,104.67 is
  // below the $499,000 free area, the assets test would allow the full $1,866.00 and the INCOME
  // test would bind instead: $1,598.13 combined → $799.065 → $799.07 each → $1,731.32 a month.
  // That is the number this test would be reporting if ADR-0005 were broken, and it is not.
  assert.notEqual(line[0].amount, 173_132);
});

test('the reported assets ARE the figures the means test ran on — on a walk where they MOVE', () => {
  // **The ADR-0005 purpose is unchanged and is the whole reason this test exists**: the walk throws
  // rather than reporting a split it cannot vouch for, and this pins that the guard is reached on
  // EVERY month of a real fixture rather than only on the one month the test above looks at.
  //
  // What has gone is the old literal — $700,000 and $400,000 held constant across five months. That
  // was the stale half, and chunk 5a is exactly the change that made it false: both figures now move
  // every month. **A guard that compares two call sites cannot catch both of them being uniformly
  // stale**, so the movement has to be asserted as a figure or nothing here would notice.
  const months = project(COUPLE_SETTINGS, COUPLE, []);
  assert.equal(months.length, 5);

  // Hand-worked: 70,000,000c and 40,000,000c, each ×(1.065)^(1/12) once per month, FLOORED to the
  // cent each time (`grownForOneMonth`) — so month n is the previous month's rounded figure grown
  // again, never the stated figure × factor^n.
  assert.deepEqual(
    months.map((m) => [m.month, m.assessableAssets - m.openingBalance, m.protectedAssets]),
    [
      ['2026-09', 70_000_000, 40_000_000],
      ['2026-10', 70_368_318, 40_210_467],
      ['2026-11', 70_738_574, 40_422_042],
      ['2026-12', 71_110_778, 40_634_730],
      ['2027-01', 71_484_941, 40_848_537],
    ],
  );

  // **And the THIRD moving figure, P4-3b's: the Offset, which is the pension banked so far.** It is
  // added to the assessable side and to nothing else, so the reported totals are the super series
  // above plus the running cash — each month's opening balance being the last month's closing one.
  // October onward carries T135's floored Age Pension (see the HAND-WORKED test above), a few cents
  // a month higher than before — and the Offset banks it, so the opening balance and the assessable
  // total both move by the same small, cumulative amount from November on.
  assert.deepEqual(
    months.map((m) => [m.month, m.openingBalance, m.assessableAssets]),
    [
      ['2026-09', 0, 70_000_000],
      ['2026-10', 130_802, 70_499_120],
      ['2026-11', 266_165, 71_004_739],
      ['2026-12', 399_740, 71_510_518],
      ['2027-01', 531_690, 72_016_631],
    ],
  );
  assert.deepEqual(
    months.slice(0, 4).map((m) => m.closingBalance),
    months.slice(1).map((m) => m.openingBalance),
    'the Offset the means test reads is the same running cash chunk 4 reconciles',
  );

  // Month 0 is the Household as STATED, because `Settings.asAtDate` is the day the balances are
  // stated as at. Growth is applied at the end of each tick, never before the first one.
  assert.equal(months[0].assessableAssets, toCents(700_000));
  assert.equal(months[0].protectedAssets, toCents(400_000));
  // And both sides of the means-test split move — the younger-partner exemption (T27) says what the
  // Age Pension may ASSESS, not whether the money earns.
  assert.ok(months.at(-1).assessableAssets > months[0].assessableAssets);
  assert.ok(months.at(-1).protectedAssets > months[0].protectedAssets);
  // Which is visible where it matters: the entitlement FALLS every month as the assets test bites
  // harder. A static balance would report one figure five times. Since P4-3b it falls FASTER, and
  // by a derivable amount: each month's banked pension is assessed the next month at $3.00 a
  // fortnight per $1,000 of the FLOORED excess (T135, SSA 1991 s1064 point 1064-G7), halved to the
  // eligible Person and taken × 26 ÷ 12 — so the series is the pre-P4-3b one (super alone, no
  // Offset) less $3.25, $9.75, $13.00 and $17.88 in the four months that hold cash, each a whole
  // $500 (or two) of the combined excess crossed by the banked cash, not a continuous $3.00/$1,000.
  assert.deepEqual(
    months.map((m) => agePensionIn(months, m.month).map((l) => l.amount)),
    [[130_802], [135_363], [133_575], [131_950], [130_325]],
  );
  assert.deepEqual(
    [130_802, 135_688, 134_550, 133_250, 132_113].map((was, i) => was - agePensionIn(months, months[i].month)[0].amount),
    [0, 325, 975, 1_300, 1_788],
  );
});

test('HAND-WORKED — two eligible Persons, and the income test binding on a SUPPLIED deeming rate', () => {
  const october = project(BOTH_ELIGIBLE_SETTINGS, BOTH_ELIGIBLE, []).find((m) => m.month === '2026-10');
  assert.equal(october.assessableAssets, toCents(600_000));
  assert.equal(october.protectedAssets, toCents(0));

  // 20 Sep 2026 rates, 1 Jul 2026 means test, deeming at the SUPPLIED 5% / 9% Setting.
  //   maximum payment rate, couple combined                       $1,866.00 / fortnight
  //
  // INCOME test:  lower $110,600 × 5% = $5,530.00
  //               upper $489,400 × 9% = $44,046.00
  //               annual $49,576.00 ÷ 26 = $1,906.7692… → $1,906.77 / fortnight
  //               excess $1,906.77 − $396.00 = $1,510.77   taper ×50% = $755.385 → $755.39
  //               rate   $1,866.00 − $755.39 = $1,110.61
  // ASSETS test:  excess $600,000 − $499,000 = $101,000 ÷ 1,000 × $3.00 = $303.00
  //               rate   $1,866.00 − $303.00 = $1,563.00
  //
  // The INCOME test binds, which is the point of the supplied rates. $1,110.61 combined halves to
  // $555.305 → $555.31 each, and BOTH are eligible → $1,110.62 to the Household — a cent more than
  // the combined rate, which is `halve`'s stated and unverified rounding, surfacing here rather
  // than being smoothed away.
  //   $1,110.62 × 26 ÷ 12 = $2,406.3433… → $2,406.34 per month.
  assert.deepEqual(lineFor(october, 'Age Pension').map((l) => l.amount), [240_634]);

  // The three fortnightly figures this could have been built from are all different, so the walk
  // reporting the Household figure is an assertion and not a coincidence:
  //   per Person $555.31 → $1,203.17 a month;  combined $1,110.61 → $2,406.32 a month.
  assert.equal(monthlyFromFortnightly(toCents(555.31)), 120_317);
  assert.equal(monthlyFromFortnightly(toCents(1_110.61)), 240_632);
  // And on the DETERMINED deeming rates the assets test would bind instead — $1,563.00 combined,
  // $781.50 each, $1,563.00 to the Household, $3,386.50 a month. Dropping the Setting from the
  // call would report this number.
  assert.equal(monthlyFromFortnightly(toCents(1_563)), 338_650);
  assert.notEqual(240_634, 338_650);
});

test('a Household this tool refuses to model is refused in EVERY month, inside the window and out', () => {
  const vacated = { ...SINGLE, homeStatus: 'vacatedBeyondTwoYearExemption' };
  // Inside the window the refusal comes from `agePensionEntitlement`; past it that function never
  // runs, so the walk must take the same refusal itself or the scenario would quietly start working
  // in April 2027.
  assert.throws(() => project(SINGLE_SETTINGS, vacated, []), /UnvaluedAssessableHomeError|s 1121\(5\)/);
  assert.throws(
    () => project({ ...SINGLE_SETTINGS, asAtDate: '2027-04-01', planningHorizonAge: 73 }, vacated, []),
    /s 1121\(5\)/,
    'past the parameter window the vacated-home refusal was dropped',
  );
});

// --- Determinism, through the NEW call path ------------------------------------------------------

test('project() is still pure and deterministic with the means test wired in', () => {
  const first = JSON.stringify(project(COUPLE_SETTINGS, COUPLE, []));
  const second = JSON.stringify(project(COUPLE_SETTINGS, COUPLE, []));
  assert.equal(first, second);
  assert.ok(Object.isFrozen(project(SINGLE_SETTINGS, SINGLE, [])[0].lines));
});

test('P4-1a STILL HOLDS through agePension.ts — two fake clocks, BYTE-IDENTICAL', () => {
  // `data/assumptions/agePension.ts` calls `new Date(...)` inside `dayBefore`, on a SUPPLIED string.
  // Reading the source says so; this proves it. Chunk 1's harness, pointed at a fixture that
  // actually produces an entitlement — an empty walk would agree under any two clocks.
  const CLOCKS = ['2026-09-16T00:00:00Z', '2031-03-04T13:45:06Z'];
  const clock = `
const fixed = Date.parse(process.env.FAKE_NOW);
const Real = Date;
class Fake extends Real {
  constructor(...args) { super(...(args.length === 0 ? [fixed] : args)); }
  static now() { return fixed; }
}
globalThis.Date = Fake;
if (Date.now() !== fixed) throw new Error('the clock override did not take');
`;
  const body = `
import { toCents } from ${JSON.stringify(join(ROOT, 'dist', 'core', 'money.js'))};
import { project } from ${JSON.stringify(join(ROOT, 'dist', 'core', 'projection.js'))};
process.stdout.write(JSON.stringify(project(${JSON.stringify(COUPLE_SETTINGS)}, ${JSON.stringify(COUPLE)}, [])));
`;
  const dir = mkdtempSync(join(tmpdir(), 'enough-ap-clock-'));
  try {
    writeFileSync(join(dir, 'clock.mjs'), clock);
    const outputs = CLOCKS.map((now) => {
      const script = join(dir, `run-${Buffer.from(now).toString('hex')}.mjs`);
      writeFileSync(script, body);
      return execFileSync(process.execPath, ['--import', join(dir, 'clock.mjs'), script], {
        encoding: 'utf8',
        env: { ...process.env, FAKE_NOW: now },
      });
    });
    assert.equal(outputs[0], outputs[1], 'the Age Pension drifted with the system clock');
    // NOT vacuous: the output really does carry an entitlement, so there was something to drift.
    // ($1,353.63 is October's hand-worked figure since T135 — $1,356.88 on the super alone, less
    // the $3.25 the banked September payment costs once the Offset is assessed.)
    assert.match(outputs[0], /"description":"Age Pension","amount":135363/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
