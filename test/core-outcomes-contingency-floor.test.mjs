// P4-6 — the **Contingency Floor**, read as a continuous constraint. concept.md §1: *"Contingency
// floor — $100k, configurable — a continuous constraint"*; §§53-55: money held back *"for late-life
// costs"*, *"a floor the balance never crosses"*.
//
// **THE RULING THIS FILE IS BUILT TO, and the fixture that pays for it.** The floor is measured
// against REACHABLE MONEY — `Month.accessibleAssets` — and not against total wealth. The free
// reading, `protectedAssets + assessableAssets`, was already on every month and needed no widening
// of `Month` at all; the user refused it on 2026-09-18 knowing the cost, because it fails in the
// FLATTERING direction. §3 below is that Household, to the cent: **58-year-old Bo holds $900,000 of
// preserved Accumulation Phase super and the couple has $9,000 in the bank.** Total wealth is
// $900,000 + $9,000 = **$909,000**, which clears a $100,000 floor nine times over; the money they
// could actually put towards a new roof is **$9,000**, and the floor is breached in every one of the
// walk's 44 months. One Household, two readings, **$900,000 apart**.
//
// **THE ARITHMETIC IS HAND-WORKABLE ON PURPOSE: `nominalReturn` is 0 in every fixture here.** These
// walks are about a threshold being crossed, not about compounding, and a flat return makes every
// figure below an exact subtraction that a reader can check with a pencil. What the walks do carry
// is the whole machine: a real `project()` run, limb 2 drawing an Account-Based Pension, limb 4
// drawing the Offset, and the Sch 7 minimum swept at the end of each financial year.
//
// **§2's WALK BREACHES, RECOVERS, AND BREACHES AGAIN — and the recovery is a Condition of Release.**
// Sam turns 65 inside the walk, which is SISR Sch 1 item 106, so $60,000 that was preserved becomes
// reachable in one step. That is the ONE mechanism in this engine that can raise reachable money
// without raising the balance: the money does not move, the gate opens. It gives `firstBreach` and
// `pointOfNoRecovery` different months — **2027-11 and 2028-02** — and every assertion below names
// which of the two it is asserting.
//
// **THE FLOOR IS STRICT, and both fixtures land a month exactly ON it.** §2's reachable money is
// **$100,000.00 to the cent** in 2027-10 and again in 2028-01, and neither month is a breach:
// *"a floor the balance never crosses"*. The second of those two is the recovery itself, so reading
// the test as `<=` would not merely move a date — it would delete the recovery.
//
// **Every fixture is a COUPLE BORN YEARS APART**, so no two-age assertion can be faked: Sam
// 1962-12-05 and Ali 1966-03-18 (three years and three months), Bo 1968-02-14 and Cass 1965-06-21
// (two years and eight months).
import test from 'node:test';
import assert from 'node:assert/strict';

import { toCents } from '../dist/core/money.js';
import { project } from '../dist/core/projection.js';
import { contingencyFloorAt, contingencyFloorBreach, statedContingencyFloor } from '../dist/core/outcomes.js';

/** concept.md §1's own figure, in cents: $100,000. */
const FLOOR_CENTS = toCents(100_000);

/**
 * **The floor as a plan states it — P4-14.** `contingencyFloorBreach` no longer takes a bare figure:
 * the floor is stated in TODAY'S money and arrives with the date it is stated at and the CPI that
 * raises it to a later month's price level, so no caller can supply two of the three and guess the
 * third.
 *
 * ⚠️ **`cpi` IS NIL IN EVERY FIXTURE OF §§1-4, AND THAT IS DELIBERATE, NOT INHERITED.** These walks
 * are about a threshold being crossed and every figure in them is hand-worked with a pencil; a
 * rising floor would make each one a compounding, which is what §5 is for and only §5. At `cpi = 0`
 * the price-level factor is exactly 1 in every month, so the floor here is the stated figure and the
 * arithmetic below is unchanged from the day it was written.
 *
 * ⚠️ **AND FROM 2026-09-21 `SETTINGS.economicSeries.cpi` IS NIL TOO (register O85).** That sentence
 * used to read *"`SETTINGS.economicSeries.cpi` is 0.025 and the WALK still uses it: it is only this
 * comparison that is held flat"*, and it stopped being true the day the stated spending level became
 * a REAL figure: the one knob now moves the floor AND the drawdown, so a walk that spends $1,000 a
 * month would spend $1,002.06 in its second month and every pencil figure below would be wrong by a
 * compounding. The two are separated by holding the SETTING at nil and passing the rising rate to
 * `floorOf` explicitly, which is what §5's fixtures already did — so §5 still isolates exactly what
 * it was written to isolate: the floor rising under a walk that does not.
 */
const floorOf = (todaysMoney, cpi = 0) => ({ todaysMoney, asAtDate: '2026-07-01', cpi });

const FLOOR = floorOf(FLOOR_CENTS);

/**
 * A series reaching well past every horizon here, from four STATED and mutually different growth
 * paths — the shape `test/core-outcomes-pension-only-age.test.mjs` uses. None of these Households is
 * of Age Pension age inside its walk, so no fixture below depends on a figure this series produces;
 * it is present so that the walk is never asked to index parameters it has not been given.
 */
const longSeries = (lastYear) => {
  const rateIndexations = [];
  const meansTestIndexations = [];
  let mtawe = 107_000;
  for (let year = 2027; year <= lastYear; year += 1) {
    for (const month of ['03-20', '09-20']) {
      mtawe *= 1.0175;
      rateIndexations.push({
        effective: `${year}-${month}`,
        cpi: 1.0125,
        pblci: 1.011,
        annualisedMtawe: toCents(Math.round(mtawe)),
      });
    }
    meansTestIndexations.push({ effective: `${year}-07-01`, cpiMarchQuarter: 1.025, cpiDecemberQuarter: 1.0245 });
  }
  return { rateIndexations, meansTestIndexations };
};
const SERIES = longSeries(2075);

const person = (name, dateOfBirth, over = {}) => ({
  name,
  dateOfBirth,
  superInterests: [],
  parcels: [],
  employmentIncomePerFortnight: toCents(0),
  workBonusBalance: toCents(0),
  ...over,
});

const entry = (id, type, date, params, owner = 'household') => ({
  id,
  date,
  owner,
  type,
  params,
  enabled: true,
  createdAt: '2026-06-01',
});

/**
 * **§1 and §2's Household.** Sam holds a $400,000 Account-Based Pension — which limb 2 offers to the
 * Waterfall at its WHOLE BALANCE (the 2026-09-17 ruling that Sch 7's minimum is a floor and not a
 * ceiling) — and a $60,000 Accumulation Phase account, which no limb can draw and which is PRESERVED
 * until he turns 65 on 2027-12-05. Ali holds nothing. The Offset Account opens at $20,000.
 *
 * So the reachable pool at the start of the walk is $20,000 + $400,000 = **$420,000**, and the
 * $60,000 is outside it until the month that OPENS after Sam's 65th birthday — reachability, like
 * the asset split, is taken on the first day of the month (ADR-0005), so 2027-12 opens at 64 and
 * 2028-01 is the first month to open at 65.
 */
const COUPLE = {
  persons: [
    person('Sam', '1962-12-05', {
      superInterests: [
        {
          phase: 'accountBasedPension',
          balance: toCents(400_000),
          statedStreamSettings: { commencementDay: '2024-07-01' },
        },
        { phase: 'accumulation', balance: toCents(60_000) },
      ],
    }),
    person('Ali', '1966-03-18'),
  ],
  homeStatus: 'occupied',
  openingOffsetBalance: toCents(20_000),
};

/**
 * `planningHorizonAge` 63 puts the horizon at the LATER of the two 63rd birthdays — Ali's, in
 * 2029-03 — so the walk is 2026-07 … 2029-03, which is **33 months**. Sam does not reach Age Pension
 * age (67, in 2029-12) inside it and neither does Ali, so no Household here draws a pension and no
 * Person here earns a wage: every figure below is a subtraction from a stated balance.
 *
 * **`nominalReturn: 0` — see the header.** Nothing grows, so the $60,000 preserved account is
 * $60,000 on the day it is released, and the pool falls by exactly the spending and by nothing else.
 */
const SETTINGS = {
  asAtDate: '2026-07-01',
  planningHorizonAge: 63,
  economicSeries: { cpi: 0, pblci: 0.025, awote: 0.035, mtawe: 0.035, agePension: SERIES },
  deemingRates: { lower: 0.0175, upper: 0.0375 },
  nominalReturn: 0,
};

/** The same plan with a live CPI, for the two assertions that are ABOUT the rate being read. */
const SETTINGS_WITH_CPI = { ...SETTINGS, economicSeries: { ...SETTINGS.economicSeries, cpi: 0.025 } };

const monthAt = (months, isoMonth) => months.find((m) => m.month === isoMonth);
/** The competing reading the user refused: TOTAL WEALTH, the two figures already on every month. */
const totalWealth = (month) => month.protectedAssets + month.assessableAssets;

// --- 1. THE WALK THAT NEVER BREACHES -------------------------------------------------------------

test('HAND-WORKED — a Household that keeps its reserve is answered "never", and "never" is an answer', () => {
  // The reachable pool is the Offset plus the Account-Based Pension — $20,000 + $400,000 =
  // $420,000 — and Sam's $60,000 Accumulation Phase account is OUTSIDE it until item 106 releases
  // it. $12,000 a year is $1,000 a month, so the reported figure for the k-th month is:
  //
  //   accessibleAssets = $420,000 − $1,000 × k              up to 2027-12, the last month to OPEN
  //                                                         with Sam under 65
  //                    = $420,000 − $1,000 × k + $60,000    from 2028-01 on
  //
  // The 18th month is 2027-12: $420,000 − $18,000            = **$402,000**.
  // The 19th month is 2028-01: $420,000 − $19,000 + $60,000  = **$461,000**.
  // The step between them is $60,000 − $1,000 = **$59,000**, and it is the Condition of Release and
  // nothing else — no money moved into any account in that month.
  const months = project(SETTINGS, COUPLE, [entry('sc', 'SPEND_CHANGE', '2026-07-01', { annualSpend: toCents(12_000) })]);
  assert.equal(months.length, 33);
  assert.equal(months.at(-1).month, '2029-03');

  assert.equal(monthAt(months, '2027-12').accessibleAssets, toCents(402_000));
  assert.equal(monthAt(months, '2028-01').accessibleAssets, toCents(461_000));
  assert.equal(
    monthAt(months, '2028-01').accessibleAssets - monthAt(months, '2027-12').accessibleAssets,
    toCents(59_000),
    'the release of $60,000 of preserved super, less that month’s $1,000 of spending',
  );

  // The last month is the 33rd: $420,000 − $33,000 + $60,000 = $447,000, $347,000 clear of the floor.
  assert.equal(months.at(-1).accessibleAssets, toCents(447_000));

  const answer = contingencyFloorBreach(months, COUPLE, FLOOR);
  assert.equal(answer.outcome, 'never');
  assert.equal(answer.firstBreach, undefined);
  assert.equal(answer.pointOfNoRecovery, undefined);
  assert.equal(answer.recovered, false);
  assert.equal(answer.monthsBelowFloor, 0);

  // And it is `'never'` because the money was there, not because the walk cannot breach or the floor
  // was trivial. Against a floor of **$410,000** the same 33 months breach and then recover, and the
  // recovery is the release:
  //   before it:  $420,000 − $1,000 × k < $410,000  ⟺  k > 10, so k = 11 … 18 — EIGHT months,
  //               2027-05 … 2027-12, the first of them the marker;
  //   after it:   $480,000 − $1,000 × k ≥ $410,000  ⟺  k ≤ 70, so every remaining month clears it.
  // The walk therefore ends ABOVE the floor, which is the case `pointOfNoRecovery` is `undefined`
  // for — reported as `recovered`, never absorbed into the marker.
  const tight = contingencyFloorBreach(months, COUPLE, floorOf(toCents(410_000)));
  assert.equal(tight.outcome, 'breached');
  assert.equal(tight.firstBreach.month, '2027-05');
  assert.equal(tight.monthsBelowFloor, 8);
  assert.equal(tight.recovered, true);
  assert.equal(tight.pointOfNoRecovery, undefined, 'the walk ends above the floor: there is no final run');
});

// --- 2. BREACH, RECOVER, BREACH — the two markers come apart --------------------------------------

test('HAND-WORKED — the marker is the FIRST breach and the strict reading is reported beside it', () => {
  // $240,000 a year is $20,000 a month, drawn from the Account-Based Pension first (limb 2) and then
  // from the Offset (limb 4) — but the reachable pool falls by $20,000 a month either way, because
  // both are in it. From $420,000:
  //
  //   2026-07 (k = 1)   $400,000
  //   …
  //   2027-10 (k = 16)  $420,000 − $320,000 = **$100,000.00** — ON the floor, and NOT a breach
  //   2027-11 (k = 17)  $80,000  ← the FIRST BREACH, and the marker
  //   2027-12 (k = 18)  $60,000     still below; Sam opens the month at 64, so nothing is released
  //   2028-01 (k = 19)  $420,000 − $380,000 = $40,000 of pool + $60,000 released = **$100,000.00**
  //                     — ON the floor again, and NOT a breach: the RECOVERY
  //   2028-02 (k = 20)  $20,000 + $60,000 = $80,000  ← the POINT OF NO RECOVERY, the second run
  //   2028-03 (k = 21)  the pool is empty: $0 + $60,000 = $60,000
  //
  // ⚠️ **AND FROM 2028-04 IT DOES MOVE, because Waterfall limb 5 spends it** (2026-09-19). The
  // sentence above used to end *"and it never moves again"*, and it was true only because no limb
  // could draw a released Accumulation Phase balance. Now the $60,000 funds the spending it was
  // always able to fund: $40,000 at 2028-04, $20,000 at 2028-05, NIL from 2028-06, and the nine
  // months after that are short because the money is genuinely gone. **Every figure the answer
  // turns on is unchanged** — the marker, the point of no recovery and the sixteen months below the
  // floor are all decided before the first draw — so what moved is the tail and only the tail.
  //
  // So the first breach is **2027-11** and the point of no recovery is **2028-02**, three months
  // apart, and the months below the floor are 2027-11, 2027-12 and then 2028-02 … 2029-03: 2 + 14 =
  // **16** of the 33.
  const months = project(SETTINGS, COUPLE, [entry('sc', 'SPEND_CHANGE', '2026-07-01', { annualSpend: toCents(240_000) })]);

  // The pool, month by month, at the four figures the answer turns on.
  assert.equal(monthAt(months, '2027-10').accessibleAssets, toCents(100_000));
  assert.equal(monthAt(months, '2027-11').accessibleAssets, toCents(80_000));
  assert.equal(monthAt(months, '2028-01').accessibleAssets, toCents(100_000));
  assert.equal(monthAt(months, '2028-02').accessibleAssets, toCents(80_000));
  assert.equal(monthAt(months, '2028-03').accessibleAssets, toCents(60_000));
  assert.equal(monthAt(months, '2028-04').accessibleAssets, toCents(40_000));
  assert.equal(monthAt(months, '2028-05').accessibleAssets, toCents(20_000));
  assert.equal(monthAt(months, '2028-06').accessibleAssets, toCents(0));
  assert.equal(6_000_000, 6_000_000, 'the pre-limb-5 terminal figure, kept beside the new one');
  assert.equal(months.at(-1).accessibleAssets, toCents(0));
  // The three months the limb drew, and the nine that are short after it: a released balance is
  // spent and then it is gone, which is the honest shape of running out.
  assert.deepEqual(
    months.filter((m) => m.lines.some((l) => l.description.startsWith('Superannuation lump sum'))).map((m) => m.month),
    ['2028-04', '2028-05', '2028-06'],
  );
  assert.equal(months.filter((m) => m.lines.some((l) => l.description === 'Unfunded shortfall')).length, 9);

  const answer = contingencyFloorBreach(months, COUPLE, FLOOR);
  assert.equal(answer.outcome, 'breached');

  // **THE MARKER — `firstBreach`.** Sam on 2027-11-01 is 64 (he turns 65 on 2027-12-05); Ali on
  // 2027-11-01 is 61 (born 1966-03-18). Two different numbers, in `household.persons` order.
  assert.equal(answer.firstBreach.month, '2027-11');
  assert.deepEqual(answer.firstBreach.ages, [
    { name: 'Sam', age: 64 },
    { name: 'Ali', age: 61 },
  ]);

  // **THE STRICT READING — `pointOfNoRecovery`**, three months later, and it is NOT the marker.
  // Sam on 2028-02-01 is 65 — the very release that bought the recovery — and Ali is 61.
  assert.equal(answer.pointOfNoRecovery.month, '2028-02');
  assert.deepEqual(answer.pointOfNoRecovery.ages, [
    { name: 'Sam', age: 65 },
    { name: 'Ali', age: 61 },
  ]);
  assert.notEqual(answer.pointOfNoRecovery.month, answer.firstBreach.month);

  assert.equal(answer.recovered, true, 'a below-floor month was followed by a month at the floor');
  assert.equal(answer.monthsBelowFloor, 16);

  // **THE TWO MONTHS THAT SIT EXACTLY ON THE FLOOR ARE NOT BREACHES**, and the second of them IS the
  // recovery. Read as `<=`, 2027-10 would be the marker and 2028-01 would not be a recovery at all.
  assert.equal(months.filter((m) => m.accessibleAssets === FLOOR_CENTS).length, 2);
  assert.deepEqual(
    months.filter((m) => m.accessibleAssets === FLOOR_CENTS).map((m) => m.month),
    ['2027-10', '2028-01'],
  );
  assert.ok(monthAt(months, '2027-10').accessibleAssets >= FLOOR_CENTS);

  // And the recovery is a Condition of Release rather than a receipt: the Household's total wealth
  // FELL by $20,000 in the month its reachable money ROSE by $60,000.
  assert.equal(
    totalWealth(monthAt(months, '2027-12')) - totalWealth(monthAt(months, '2028-01')),
    toCents(20_000),
  );
  assert.equal(
    monthAt(months, '2028-01').accessibleAssets - monthAt(months, '2027-12').accessibleAssets,
    toCents(40_000),
    'the $60,000 released, less the $20,000 spent',
  );
});

// --- 3. THE FIXTURE THAT JUSTIFIES THE RULING ----------------------------------------------------

/**
 * Bo is 58 at `asAtDate` and holds **$900,000** of Accumulation Phase super. Cass is 61. Neither
 * reaches 65 inside the walk — Cass turns 65 in 2030-06 and the horizon is 2030-02 — so the super is
 * preserved in every month of it, and no Condition of Release is ever met. The couple's whole
 * reachable world is the **$9,000** Offset Account.
 *
 * Nobody states a spending level, so nothing is drawn and nothing is earned: every month of this
 * walk reports the same three figures, which is what makes it a clean statement about the READING
 * rather than about the walk.
 */
const PRESERVED_COUPLE = {
  persons: [
    person('Bo', '1968-02-14', { superInterests: [{ phase: 'accumulation', balance: toCents(900_000) }] }),
    person('Cass', '1965-06-21'),
  ],
  homeStatus: 'occupied',
  openingOffsetBalance: toCents(9_000),
};

const PRESERVED_SETTINGS = { ...SETTINGS, planningHorizonAge: 62 };

test('HAND-WORKED — $909,000 of wealth, $9,000 of it reachable: the floor is breached in every month', () => {
  // `planningHorizonAge` 62 puts the horizon at the later 62nd birthday — Bo's, in 2030-02 — so the
  // walk is 2026-07 … 2030-02, **44 months**.
  const months = project(PRESERVED_SETTINGS, PRESERVED_COUPLE, []);
  assert.equal(months.length, 44);
  assert.equal(months.at(-1).month, '2030-02');

  for (const month of months) {
    // Accumulation Phase super held by a Person under Age Pension age is exempt from BOTH means
    // tests (§4.8), so the $900,000 is PROTECTED; the Offset is a financial investment and is
    // assessable (ADR-0009). Total wealth is $909,000 in every month of the walk.
    assert.equal(month.protectedAssets, toCents(900_000));
    assert.equal(month.assessableAssets, toCents(9_000));
    assert.equal(totalWealth(month), toCents(909_000));
    // And the money they could put towards a late-life cost is the bank account: $9,000.
    assert.equal(month.accessibleAssets, toCents(9_000));
  }

  // **THE READING THE USER TOOK.** $9,000 < $100,000 in every one of the 44 months.
  const reachable = contingencyFloorBreach(months, PRESERVED_COUPLE, FLOOR);
  assert.equal(reachable.outcome, 'breached');
  assert.equal(reachable.firstBreach.month, '2026-07');
  // Bo on 2026-07-01 is 58 (born 1968-02-14); Cass is 61 (born 1965-06-21).
  assert.deepEqual(reachable.firstBreach.ages, [
    { name: 'Bo', age: 58 },
    { name: 'Cass', age: 61 },
  ]);
  assert.equal(reachable.pointOfNoRecovery.month, '2026-07');
  assert.equal(reachable.recovered, false);
  assert.equal(reachable.monthsBelowFloor, 44);

  // **THE READING THE USER REFUSED**, run through the SAME function with the SAME floor and one
  // operand swapped — total wealth in place of reachable money — so that the difference is the
  // reading and nothing else. It answers `'never'`, and it is wrong by **$900,000**: this Household
  // cannot lawfully touch a cent of Bo's super until 2033-02, when he turns 65, which is three years
  // beyond this walk's horizon.
  const asTotalWealth = months.map((month) => ({ ...month, accessibleAssets: totalWealth(month) }));
  const flattering = contingencyFloorBreach(asTotalWealth, PRESERVED_COUPLE, FLOOR);
  assert.equal(flattering.outcome, 'never');
  assert.equal(flattering.monthsBelowFloor, 0);
  assert.equal(
    asTotalWealth[0].accessibleAssets - months[0].accessibleAssets,
    toCents(900_000),
    'the preserved super, which is the whole of the difference between the two readings',
  );
});

// --- 4. THE TWO REFUSALS -------------------------------------------------------------------------

test('a projection with no months is REFUSED, not answered "never"', () => {
  // `shortfallAge`'s rule, taken unchanged: a walk with no months has not told us that the reserve
  // held. `project()` cannot return this — it throws when the horizon is before `asAtDate` — but a
  // caller that filtered or sliced can hand it over.
  assert.throws(() => contingencyFloorBreach([], COUPLE, FLOOR), /no months has no Contingency Floor breach/);
  // The one-month case, by contrast, is answered rather than refused: $420,000 − $20,000 = $400,000.
  const first = project(SETTINGS, COUPLE, [entry('sc', 'SPEND_CHANGE', '2026-07-01', { annualSpend: toCents(240_000) })]).slice(0, 1);
  assert.equal(first[0].accessibleAssets, toCents(400_000));
  assert.equal(contingencyFloorBreach(first, COUPLE, FLOOR).outcome, 'never');
});

test('a floor of nil or less is REFUSED — a caller who has not set one is not a Household that needs none', () => {
  const months = project(SETTINGS, COUPLE, [entry('sc', 'SPEND_CHANGE', '2026-07-01', { annualSpend: toCents(240_000) })]);
  // Answering `'never'` here would report that this Household kept a reserve it was never asked for,
  // and `'never'` is the good answer — the flattering direction again, from an unset field.
  assert.throws(() => contingencyFloorBreach(months, COUPLE, floorOf(toCents(0))), /is not a floor/);
  assert.throws(() => contingencyFloorBreach(months, COUPLE, floorOf(-1)), /is not a floor/);
  // THE CONTROL, one cent apart: a floor of $0.01 is a floor, and it is ANSWERED rather than
  // refused, which is the whole of what this control is for — the two lines above throw and this
  // one returns.
  //
  // ⚠️ **The answer used to be `'never'` and it is now `'breached'`, and the reason is limb 5.**
  // The old sentence read *"this walk empties its pool in 2028-03 and holds $60,000 of released
  // super from then on"* — it held it because nothing could spend it. From 2026-09-19 the walk
  // spends it, in 2028-04 … 2028-06, and reaches NIL. A one-cent floor is breached by a Household
  // with nil, which is the correct answer to the question and a different one from before.
  const oneCent = contingencyFloorBreach(months, COUPLE, floorOf(toCents(0.01)));
  assert.equal(oneCent.outcome, 'breached');
  assert.equal(oneCent.firstBreach.month, '2028-06');
  assert.equal(oneCent.recovered, false, 'nothing came back: the account is empty');
  assert.equal(oneCent.monthsBelowFloor, 10);
});

// --- 5. THE FLOOR RISES WITH PRICES — P4-14, settled 2026-09-21 -----------------------------------
//
// The stated figure is REAL: a household saying *"$100,000 of buffer"* means $100,000 of what it
// buys now. So the comparison is put on the month's own price level by raising the FLOOR, never by
// deflating a balance — `core/priceLevel.ts` says why that direction is input normalisation and not
// the ADR-0001 conversion. Every figure below is `100,000 × 1.025 ^ (months since 2026-07 / 12)`,
// rounded once to the cent, and is written out as a literal so that a change to the arithmetic
// fails here rather than agreeing with itself.

test('P4-14 — the floor is a CURVE: the stated figure in its own month, and more in every later one', () => {
  const rising = floorOf(FLOOR_CENTS, 0.025);
  // The month the figure is stated in: factor exactly 1, whatever the rate. This is the fixed point
  // that proves the conversion is the right way round — a floor that moved here would be wrong.
  assert.equal(contingencyFloorAt(rising, '2026-07'), toCents(100_000));
  // One year on: 100,000 × 1.025 — the rate itself, with no compounding to obscure it.
  assert.equal(contingencyFloorAt(rising, '2027-07'), toCents(102_500));
  // Six months: 100,000 × 1.025^0.5 = 101,242.28 — a HALF year's rise, not half the year's rise,
  // which is the mutation "divide by 12" would produce (101,250.00).
  assert.equal(contingencyFloorAt(rising, '2027-01'), 101_242_28);
  assert.notEqual(contingencyFloorAt(rising, '2027-01'), 101_250_00);
  // Fifteen and eighteen months, the two months §2's walk sits exactly on the flat floor in.
  assert.equal(contingencyFloorAt(rising, '2027-10'), 103_134_71);
  assert.equal(contingencyFloorAt(rising, '2028-01'), 103_773_34);
  // Monotone, and strictly so: no month of a 44-month walk is level with its neighbour.
  const months = ['2026-07', '2027-01', '2027-07', '2027-10', '2028-01', '2029-03'];
  const curve = months.map((month) => contingencyFloorAt(rising, month));
  assert.deepEqual([...curve].sort((a, b) => a - b), curve);
  assert.equal(new Set(curve).size, curve.length);
});

test('P4-14 — a cpi of NIL makes the two curves coincide, by the arithmetic and not by a branch', () => {
  // The algebraic control. `1 ^ anything` is 1, so the floor is the stated figure in every month of
  // the walk — no division by zero, no special case, and nothing in `contingencyFloorAt` that tests
  // the rate at all. A build that special-cased nil would pass this and fail the test above.
  const flat = floorOf(FLOOR_CENTS, 0);
  for (const month of ['2026-07', '2027-01', '2030-02', '2065-12']) {
    assert.equal(contingencyFloorAt(flat, month), toCents(100_000));
  }
  // And a NEGATIVE rate is answered rather than refused — prices falling is a forecast a user may
  // state — while a rate at or below −1 has no real power and raises.
  assert.ok(contingencyFloorAt(floorOf(FLOOR_CENTS, -0.01), '2027-07') < toCents(100_000));
  assert.throws(() => contingencyFloorAt(floorOf(FLOOR_CENTS, -1), '2027-07'), /cannot fall by more than all of themselves/);
});

test('P4-14 — the rising floor MOVES THE ANSWER: the month that sat exactly on it is now a breach', () => {
  // §2's walk, unchanged, asked twice. At `cpi = 0` the marker is 2027-11 and the two months at
  // exactly $100,000.00 — 2027-10 and 2028-01 — are not breaches, because the floor is strict.
  // Raise the floor with prices and 2027-10's $100,000.00 is under 2027-10's $103,134.71, so the
  // marker moves one month EARLIER. Nothing about the walk changed; the floor did.
  const months = project(SETTINGS, COUPLE, [entry('sc', 'SPEND_CHANGE', '2026-07-01', { annualSpend: toCents(240_000) })]);
  assert.equal(monthAt(months, '2027-10').accessibleAssets, toCents(100_000));

  const flat = contingencyFloorBreach(months, COUPLE, floorOf(FLOOR_CENTS, 0));
  assert.equal(flat.firstBreach.month, '2027-11');
  assert.equal(flat.monthsBelowFloor, 16);

  const rising = contingencyFloorBreach(months, COUPLE, floorOf(FLOOR_CENTS, 0.025));
  assert.equal(rising.firstBreach.month, '2027-10');
  assert.ok(rising.monthsBelowFloor > flat.monthsBelowFloor, 'a floor that rises is crossed in more months, never fewer');
  // The direction, said as an identity over the whole walk rather than as one date: every month the
  // flat floor called a breach is a breach against the rising one too, from 2026-07 on.
  assert.ok(rising.outcome === 'breached' && flat.outcome === 'breached');
});

test('P4-14 — a floor ABOVE EVERY BALANCE is answered, not treated as an error', () => {
  // The whole-walk case, which is §3's Household read the other way round: $9,000 of reachable money
  // against a floor of $1,000,000 rising at 2.5%. Every month is a breach, and the answer says so in
  // its own terms — `monthsBelowFloor` IS the walk's length, the marker is its first month, and the
  // point of no recovery is that same month because the run never ends.
  const months = project(PRESERVED_SETTINGS, PRESERVED_COUPLE, []);
  const answer = contingencyFloorBreach(months, PRESERVED_COUPLE, floorOf(toCents(1_000_000), 0.025));
  assert.equal(answer.outcome, 'breached');
  assert.equal(answer.monthsBelowFloor, months.length);
  assert.equal(answer.monthsBelowFloor, 44);
  assert.equal(answer.firstBreach.month, months[0].month);
  assert.equal(answer.pointOfNoRecovery.month, months[0].month);
  assert.equal(answer.recovered, false, 'nothing was ever rebuilt: there is no month at or above the floor');
});

test('P4-14 — `statedContingencyFloor` is the ONE reading of a plan’s floor, and absence stays absence', () => {
  // No `contingencyFloor` in the Settings — which is every plan written before 2026-09-21 — is
  // `undefined`, and nothing here invents a figure. `parsePlan` refuses a stated nil, so `undefined`
  // is the only spelling of "no floor" a caller can ever see.
  assert.equal(statedContingencyFloor(SETTINGS), undefined);
  assert.equal(Object.hasOwn(SETTINGS, 'contingencyFloor'), false);

  // Stated, and it carries the plan's OWN date and the plan's OWN cpi — not a default of either.
  const stated = statedContingencyFloor({ ...SETTINGS_WITH_CPI, contingencyFloor: toCents(250_000) });
  assert.deepEqual({ ...stated }, { todaysMoney: toCents(250_000), asAtDate: '2026-07-01', cpi: 0.025 });
  assert.equal(contingencyFloorAt(stated, '2026-07'), toCents(250_000));
  assert.equal(contingencyFloorAt(stated, '2027-07'), toCents(256_250));
  // A plan with a different clock or a different rate gets a different curve from the same figure,
  // which is what makes carrying all three together load-bearing rather than tidy.
  const otherClock = statedContingencyFloor({ ...SETTINGS_WITH_CPI, asAtDate: '2027-07-01', contingencyFloor: toCents(250_000) });
  assert.equal(contingencyFloorAt(otherClock, '2027-07'), toCents(250_000));
  assert.notEqual(contingencyFloorAt(otherClock, '2027-07'), contingencyFloorAt(stated, '2027-07'));
});
