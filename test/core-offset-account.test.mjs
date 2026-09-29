// P4-3b — `Household.openingOffsetBalance`, and the Offset Account IN the means test.
//
// The walk's running cash — `Month.openingBalance` / `closingBalance` — IS the Offset Account, and
// until this item it was invisible twice over: nothing in `household.ts` could state an opening
// balance, so a Household with a real offset began the walk unable to draw on it; and `splitAssets`
// never saw the pool at all, so neither means test did either.
//
// **The user ruled on 2026-09-18 that the Offset is assessed at its CURRENT balance** — not at the
// stated opening figure — on the ground that offset cash is cash, cash is a financial investment,
// and ADR-0009 / register §4.8 already say what happens to a financial investment. That ruling cost
// twenty-eight existing dollar assertions, every one of which was re-derived rather than restamped.
//
// **Four things are defended here and nothing else.** Each is written against a named mutation of
// the four the build was measured on:
//
//   1. **The means test tracks the offset DOWN, month by month** — §1. This is the one that pins
//      the `withBalances` widening: reverting it leaves `splitAssets` reading the Day-1 stated
//      figure through the `...household` spread, so a drained offset would report its opening
//      balance for ever. The fixture drains $500,000 to $442,231.39 in eight months and the Age
//      Pension RISES by $402.70 a month as it goes.
//   2. **`splitAssets` gains one line, on the assessable side only** — §2. Removing the line is the
//      other mutation that failed zero tests before this file existed.
//   3. **A stated opening balance is DRAWABLE IN MONTH 1, by limb 4** — §3, against a control with
//      no offset that is short by the very same $2,398.05 in the very same month.
//   4. **Absent is nil, byte for byte** — §4. The field is optional on the house convention, so a
//      Household written before it existed must walk exactly as it did.
import test from 'node:test';
import assert from 'node:assert/strict';

import { toCents } from '../dist/core/money.js';
import { splitAssets } from '../dist/core/household.js';
import { project } from '../dist/core/projection.js';

const person = (name, dateOfBirth, over = {}) => ({
  name,
  dateOfBirth,
  superInterests: [],
  parcels: [],
  employmentIncomePerFortnight: toCents(0),
  workBonusBalance: toCents(0),
  ...over,
});

const SETTINGS = {
  asAtDate: '2026-09-16',
  planningHorizonAge: 72,
  // ⚠️ **`cpi: 0`, AND IT IS THE ALGEBRAIC CONTROL RATHER THAN A SPECIAL CASE** (register O85,
  // user ruling 2026-09-21). The stated spending level is a REAL figure now and `project()` raises it
  // to each month's own price level, so at any positive CPI every hand-worked figure below would
  // carry a `(1 + cpi) ^ (n / 12)` in it and this fixture would be arithmetic about indexation rather
  // than about what it was written for. At nil the factor is exactly 1 in every month
  // (`core/priceLevel.ts`), so every figure here is the figure it was hand-worked as. The indexation
  // itself is asserted in `test/core-projection-waterfall.test.mjs` §8, on its own fixture.
  economicSeries: { cpi: 0, pblci: 0.025, awote: 0.035, mtawe: 0.035 },
  deemingRates: { lower: 0.0175, upper: 0.0375 },
  nominalReturn: 0.065,
};

const entry = (id, type, date, params) => ({
  id,
  date,
  owner: 'household',
  type,
  params,
  enabled: true,
  createdAt: '2026-06-01',
});

/**
 * A single pensioner of 71 who owns her home and holds **nothing but an Offset Account**. No super
 * and no parcels is deliberate: it makes `assessableAssets` the offset and nothing else, so every
 * figure below is about the pool under test and no other pool can absorb a wrong answer.
 */
const offsetOnly = (opening) => ({
  persons: [person('Val', '1955-04-17')],
  homeStatus: 'occupied',
  ...(opening === undefined ? {} : { openingOffsetBalance: toCents(opening) }),
});

const monthAt = (months, isoMonth) => months.find((m) => m.month === isoMonth);
const agePensionIn = (month) => month.lines.filter((l) => l.description === 'Age Pension').map((l) => l.amount);

// --- 1. THE MEANS TEST TRACKS THE OFFSET DOWN ----------------------------------------------------

test('A DRAINING OFFSET IS A FALLING MEANS TEST — the Day-1 figure is reported in month 0 and never again', () => {
  // $500,000 in the offset against $120,000 a year of spending. Val has no other income but the Age
  // Pension, so every month draws the gap out of the offset by limb 4 — and every month is assessed
  // on what it OPENED with, which is last month's closing balance.
  const months = project(SETTINGS, offsetOnly(500_000), [
    entry('sc', 'SPEND_CHANGE', '2026-09-01', { annualSpend: toCents(120_000) }),
  ]);
  assert.equal(months.length, 8);

  // **The load-bearing assertion, and the one that dies if `withBalances` stops carrying the
  // offset**: the assessed figure IS this month's opening cash, in all eight months. A walk that
  // spread `...household` into the month's Household would report $500,000.00 in every one of them —
  // the stale-static-balance defect P4-1 chunk 5a fixed for parcels and super, arriving through the
  // one pool chunk 5a did not cover.
  for (const month of months) assert.equal(month.assessableAssets, month.openingBalance, month.month);
  assert.deepEqual(
    months.map((m) => m.assessableAssets),
    [50_000_000, 49_151_645, 48_316_788, 47_487_456, 46_663_487, 45_844_880, 45_031_636, 44_223_592],
  );
  assert.equal(new Set(months.map((m) => m.assessableAssets)).size, 8, 'a static figure would be one value eight times');
  assert.equal(months[0].assessableAssets, toCents(500_000), 'month 0 IS the stated figure — that is the trap');
  assert.ok(months.at(-1).assessableAssets < toCents(450_000));

  // And it is strictly falling, which is the direction: money spent out of the offset leaves the
  // means test with it.
  assert.ok(months.every((m, i) => i === 0 || m.assessableAssets < months[i - 1].assessableAssets));

  // ⚠️ **REWRITTEN FOR SS Act 1064-G7 (T135, 2026-09-24).** The taper is not continuous: 1064-G7
  // disregards any part of a single Person's assets excess that is not a multiple of $250 before the
  // $3/$1,000 rate runs (`flooredExcess` in `agePension.ts`). Every month below is re-derived on the
  // floored excess, not the raw one, and the monthly climb no longer matches the raw dollars drained
  // one-for-one — it matches the $250 STEPS the draining excess happens to cross.
  //
  // **THE CONSEQUENCE, HAND-WORKED, because a reported figure nobody acts on would prove little.**
  // The assets test binds — $500,000 is well past the $333,000 single-homeowner free area, and the
  // income test allows more — so the pension RISES as the offset drains:
  //   2026-09  assessed $500,000.00  excess $167,000.00  floored $167,000.00 (already a $250
  //            multiple)  taper $501.00  rate $1,200.90 − $501.00 = $699.90 a fortnight × 26 ÷ 12
  //            = $1,516.45   (the pre-20-September rate; T135 is invisible here)
  //   2026-10  assessed $491,516.45  excess $158,516.45  floored $158,500.00  taper $475.50
  //            rate $1,237.70 − $475.50 = $762.20 × 26 ÷ 12 = $1,651.43
  //   2026-11  assessed $483,167.88  excess $150,167.88  floored $150,000.00  taper $450.00
  //            rate $1,237.70 − $450.00 = $787.70 × 26 ÷ 12 = $1,706.68
  assert.deepEqual(months.slice(0, 3).map((m) => agePensionIn(m)), [[151_645], [165_143], [170_668]]);
  // October to November is a $55.25 rise on the FLOORED excess falling by $8,500.00 — 34 steps of
  // $250, not the raw $8,348.57 drained: $8,500 ÷ 1,000 × $3.00 = $25.50 a fortnight, × 26 ÷ 12 =
  // $55.25. A frozen assets figure pays the same amount twice.
  assert.equal(170_668 - 165_143, toCents(55.25));
  assert.equal(months[1].openingBalance - months[2].openingBalance, toCents(8_348.57));
  // Across the seven months the register PUBLISHES, the payment climbs $403.11.
  assert.equal(191_956 - 151_645, toCents(403.11));
  assert.deepEqual(agePensionIn(monthAt(months, '2027-03')), [191_956]);
  // ⚠️ **AND THE EIGHTH MONTH IS NO LONGER A BLANK (P4-1e, 2026-09-21).** This asserted `[]` —
  // *"past the parameter window, as every fixture is"* — and the standing table carries the 20
  // September 2026 sets into it, so the same rule prices it on the same rates:
  // ⚠️ **AND FROM 2026-09-23 NOT ON THE SAME RATES.** A plan with no series now INDEXES the 20 March
  // 2027 set on its own growth rates: the single basic rate is 0.6633 × $1,711.80 × √1.025 =
  // $1,149.54 (PBLCI; CPI is nil here, so the Supplement stays $88.20), and the maximum is $1,251.84.
  //   2027-04  assessed $442,235.92  excess $109,235.92  floored $109,000.00 (1064-G7, a $250
  //            multiple exactly)  taper $327.00  rate $1,251.84 − $327.00 = $924.84 × 26 ÷ 12
  //            = $2,003.82
  // Every figure BEFORE it is unchanged to the cent: April is the last month of this walk, so its
  // own payment cannot reach any balance this test asserts.
  assert.deepEqual(agePensionIn(monthAt(months, '2027-04')), [200_382]);
  assert.equal(200_382 - 191_956, toCents(84.26), 'the indexed rate AND a further floor step, together');

  // Chunk 4's identity still holds every month — the offset is spent, not merely re-reported.
  for (const month of months) {
    const reconciled = month.lines.reduce(
      (balance, line) => balance + (line.effect !== 'cash' ? 0 : line.direction === 'inflow' ? line.amount : -line.amount),
      month.openingBalance,
    );
    assert.equal(reconciled, month.closingBalance, month.month);
  }
});

// --- 2. `splitAssets` — ONE line, on the assessable side -----------------------------------------

/** Val holds an ABP and a parcel; Kit is 46, so her Accumulation Phase super is exempt (§4.8, T27). */
const MIXED = {
  persons: [
    person('Val', '1955-04-17', {
      superInterests: [{ phase: 'accountBasedPension', balance: toCents(300_000) }],
      parcels: [{ acquired: '2015-01-01', costBase: toCents(50_000), marketValue: toCents(100_000) }],
    }),
    person('Kit', '1980-01-01', { superInterests: [{ phase: 'accumulation', balance: toCents(400_000) }] }),
  ],
  homeStatus: 'occupied',
};

test('a stated offset is ONE assessable, deemed line — and `protectedAssets` does not move', () => {
  const without = splitAssets(MIXED, '2026-09-01');
  const with25k = splitAssets({ ...MIXED, openingOffsetBalance: toCents(25_000) }, '2026-09-01');

  // The control: $100,000 of parcels + $300,000 of ABP assessable, $400,000 of exempt super
  // protected, three lines.
  assert.equal(without.assessableAssets, toCents(400_000));
  assert.equal(without.deemedFinancialAssets, toCents(400_000));
  assert.equal(without.protectedAssets, toCents(400_000));
  assert.equal(without.lines.length, 3);

  // With the offset: BOTH assessable figures rise by exactly $25,000 and the protected one does not
  // move at all. Offset cash is a financial investment, so it is deemed as well as assessed — a line
  // that landed in `assessableAssets` but not in `deemedFinancialAssets` would under-state the
  // income test, and one that landed in `protectedAssets` would under-state both.
  assert.equal(with25k.assessableAssets - without.assessableAssets, toCents(25_000));
  assert.equal(with25k.deemedFinancialAssets - without.deemedFinancialAssets, toCents(25_000));
  assert.equal(with25k.protectedAssets, without.protectedAssets);
  assert.equal(with25k.assessableAssets, toCents(425_000));
  assert.equal(with25k.deemedFinancialAssets, toCents(425_000));
  assert.equal(with25k.protectedAssets, toCents(400_000));

  // ONE line, last, naming the whole Household rather than a Person — the offset is a Household
  // fact under ADR-0005's status model, and a per-Person split would answer an ownership question
  // the user was never asked.
  assert.equal(with25k.lines.length, 4);
  assert.deepEqual(with25k.lines.slice(0, 3), without.lines);
  assert.deepEqual(with25k.lines.at(-1), {
    owner: 'Val and Kit',
    description: 'Offset Account',
    amount: toCents(25_000),
    treatment: 'assessable',
    deemed: true,
    reason: 'A financial investment: assessable, and deemed for the income test. Offset cash is cash (ADR-0009).',
  });

  // A nil offset is NO LINE rather than a line for nothing, and it is byte-identical to absence.
  const nil = splitAssets({ ...MIXED, openingOffsetBalance: toCents(0) }, '2026-09-01');
  assert.equal(nil.lines.length, 3);
  assert.equal(JSON.stringify(nil), JSON.stringify(without));

  // And a Household whose ONLY asset is the offset reports it as the whole of both figures, which is
  // what §1's walk is reading every month.
  const cashOnly = splitAssets(offsetOnly(500_000), '2026-09-01');
  assert.equal(cashOnly.assessableAssets, toCents(500_000));
  assert.equal(cashOnly.deemedFinancialAssets, toCents(500_000));
  assert.equal(cashOnly.protectedAssets, toCents(0));
  assert.equal(cashOnly.lines.length, 1);
});

// --- 3. DRAWABLE IN MONTH 1 ----------------------------------------------------------------------

test('a stated opening offset is DRAWN by limb 4 in the walk’s FIRST month', () => {
  // $5,000 in the offset, $60,000 a year of spending, and a $2,601.95 Age Pension. The first month
  // needs $5,000.00, the pension supplies $2,601.95, and limb 4 supplies the other **$2,398.05** —
  // out of money that did not exist in this model before P4-3b.
  const withOffset = project(SETTINGS, offsetOnly(5_000), [
    entry('sc', 'SPEND_CHANGE', '2026-09-01', { annualSpend: toCents(60_000) }),
  ]);
  const first = withOffset[0];
  assert.equal(first.month, '2026-09');
  assert.equal(first.openingBalance, toCents(5_000), 'the walk OPENS on the stated figure — this is the seed');
  assert.equal(first.closingBalance, toCents(2_601.95));
  assert.deepEqual(agePensionIn(first), [toCents(2_601.95)]);
  assert.deepEqual(first.lines.filter((l) => l.description === 'Unfunded shortfall'), []);
  assert.equal(toCents(5_000) - toCents(2_601.95), toCents(2_398.05));
  assert.equal(first.openingBalance - first.closingBalance, toCents(2_398.05));

  // **THE CONTROL, and it is the same figure read as a failure.** The identical Household with no
  // offset stated cannot fund that month at all: the $2,398.05 limb 4 paid above appears as an
  // `Unfunded shortfall` instead, to the cent. Nothing else in the two walks differs.
  const without = project(SETTINGS, offsetOnly(undefined), [
    entry('sc', 'SPEND_CHANGE', '2026-09-01', { annualSpend: toCents(60_000) }),
  ]);
  assert.equal(without[0].openingBalance, toCents(0));
  assert.deepEqual(
    without[0].lines.filter((l) => l.description === 'Unfunded shortfall').map((l) => l.amount),
    [toCents(2_398.05)],
  );
  assert.equal(without[0].closingBalance, toCents(0));

  // The offset runs out in the third month, and from there the two walks are the same walk: the
  // seed is an opening balance and not an income.
  assert.equal(monthAt(withOffset, '2026-11').closingBalance, toCents(0));
  assert.deepEqual(
    withOffset.slice(3).map((m) => [m.openingBalance, m.closingBalance]),
    without.slice(3).map((m) => [m.openingBalance, m.closingBalance]),
  );
});

// --- 4. ABSENT IS NIL ----------------------------------------------------------------------------

test('an absent `openingOffsetBalance` walks BYTE-IDENTICALLY to a stated nil', () => {
  // The field is optional on the house convention (`Person.statedPriorRetirementPhase`,
  // `SuperInterest.statedStreamSettings`), and the only place it seeds the walk reads it with
  // `?? toCents(0)`. So every Household written before 2026-09-18 — which is every Household in
  // this repository's other sixty-one test files — must walk exactly as it did.
  const entries = [entry('sc', 'SPEND_CHANGE', '2026-09-01', { annualSpend: toCents(120_000) })];
  const absent = project(SETTINGS, offsetOnly(undefined), entries);
  const statedNil = project(SETTINGS, offsetOnly(0), entries);
  assert.equal(JSON.stringify(absent), JSON.stringify(statedNil));

  // Not vacuous: a stated figure is a DIFFERENT walk, and by a large number.
  assert.notEqual(JSON.stringify(project(SETTINGS, offsetOnly(500_000), entries)), JSON.stringify(absent));

  // And the nil walk is the pre-P4-3b one: nil assessable assets in every month, a nil opening
  // balance in every month, and an `Unfunded shortfall` in every month, because $120,000 a year
  // against an Age Pension and nothing else is unfunded from day one.
  assert.deepEqual([...new Set(absent.map((m) => m.assessableAssets))], [toCents(0)]);
  assert.deepEqual([...new Set(absent.map((m) => m.openingBalance))], [toCents(0)]);
  assert.equal(absent.filter((m) => m.lines.some((l) => l.description === 'Unfunded shortfall')).length, 8);
});
