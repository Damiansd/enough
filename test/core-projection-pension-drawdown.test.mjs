// P4-1 chunk 5b — **the Account-Based Pension minimum drawdown: the first balance in this model
// that FALLS.** Waterfall limb 2, wired to `minimumDrawdown.ts`.
//
// Chunk 5a made balances move and they only moved UPWARD. This is the other half, and it brings
// three rulings with it, each of which is defended here as a figure rather than as a description:
//
//   1. **DRAWDOWN FIRST, THEN GROWTH** (the user's ruling, 2026-09-17). One place —
//      `balanceAfterDrawdownAndGrowth` — and the mutation is separated by $26.31 on one month of one
//      fixture.
//   2. **THE MINIMUM IS A FLOOR, NOT A CEILING** (the user's ruling, 2026-09-17, and it replaced the
//      *"floor on the year, not a monthly cap"* reading this file was first written for). Two halves
//      and they are one job: `pensionAvailableThisMonth` offers the whole ACCOUNT BALANCE, so a
//      household that needs more than the Schedule's figure draws it; and `minimumStillDueThisMonth`
//      PAYS what is left of the year's minimum in the last month of the financial year whether the
//      household needs it or not. There is no division at either end.
//   3. **A STATED COMMENCEMENT DAY, OR NOTHING.** Sch 7 keys everything off it, `household.ts`
//      carries it, and where it is absent the limb stays nil rather than guessing 1 July.
//
// **And the prize chunk 4 left unclaimed: a `project()`-level ORDER fixture.** Chunk 4 could only
// assert the Waterfall's order at the seam, because with limbs 2 and 3 nil the order had no
// reachable consequence in `project()` at all. §2 below is a walk in which drawing limb 2 before
// limb 1, or after limb 4, produces a DIFFERENT DOLLAR FIGURE — three of them — and all three are
// written out.
//
// **The traps this file is written against**, each with the fixture that closes it named:
//   * a balance so large the drawdown never bites               → PAT: the balance falls every month
//   * a household capped below its own money                    → PAT and DALE: the draw EXCEEDS the
//     Schedule's figure, and the ceiling reading's own numbers are asserted notEqual beside it
//   * income that already meets the target, so limb 2 draws nil → ROBIN: the $9,140.00 that used to
//     go unpaid is asserted AS A LINE in the month it is swept
//   * a first year where part-year and full-year rules agree    → KIM: $20,180 against $28,440, and
//     KIM AT WORK makes the $20,180 the walk's own swept figure rather than a direct call's
//   * a drawdown so small that growth hides it                  → PAT: the fall is asserted, and the
//     growth-only counterfactual is asserted notEqual beside it
//   * a fixture in which the floor and the need happen to agree → every figure below separates them
//
// Every figure is HAND-WORKED and written out long.
import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { createHash } from 'node:crypto';

import { toCents } from '../dist/core/money.js';
import { DEMO_ENTRIES, DEMO_HOUSEHOLD, DEMO_SETTINGS } from '../dist/app/demoHousehold.js';
import {
  PENSION_MINIMUM_LINE,
  SHORTFALL_LINE,
  TTR_PAYMENT_LINE,
  WATERFALL_LIMBS,
  PENSION_ABOVE_MINIMUM_DETERMINATION,
  NO_STATING_ENTRY,
  UNATTRIBUTED,
  UNLEGISLATED,
  statedBy,
  accountBasedPensionAboveMinimumLimb,
  accountBasedPensionMinimumLimb,
  annualPensionMinimum,
  annualPensionMinimumDetermination,
  balanceAfterDrawdownAndGrowth,
  drawWaterfall,
  grownForOneMonth,
  minimumStillDueThisMonth,
  pensionAvailableThisMonth,
  project,
  schedule7RelevantDay,
  unfundedMiddleLimbs,
} from '../dist/core/projection.js';
import { pensionAccountBalance, pensionAccountBalanceObservedLater } from '../dist/core/minimumDrawdown.js';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const person = (name, dateOfBirth, over = {}) => ({
  name,
  dateOfBirth,
  // P6-8 brief 3 chunk 2b: the employer Superannuation Guarantee has to land in a NAMED account,
  // so a salaried Person holds one and the walk refuses a salary with nowhere to pay it. A NIL
  // balance is the smallest change that makes the fixture honest: it moves no figure of its own.
  superInterests: [{ phase: 'accumulation', balance: toCents(0) }],
  parcels: [],
  employmentIncomePerFortnight: toCents(0),
  workBonusBalance: toCents(0),
  ...over,
});

/** An Account-Based Pension interest. `commencementDay` omitted means the user stated no settings. */
const abp = (balance, commencementDay) => ({
  phase: 'accountBasedPension',
  balance: toCents(balance),
  ...(commencementDay === undefined ? {} : { statedStreamSettings: { commencementDay } }),
});

/**
 * **asAtDate is 1 JULY, and that is load-bearing rather than tidy.** Sch 7 cl 1(2)(a)(i) reads the
 * balance on 1 July; a walk that never opens a 1 July never determines that year's minimum, and §5
 * below is the fixture that asserts exactly that. Every other fixture here opens its years.
 *
 * Everyone here is 64 at the start and the horizon is 66, so **no Age Pension exists in any figure
 * in this file** — Age Pension age is 67 — and the cashflow is the whole of what is under test.
 */
const settings = (over = {}) => ({
  asAtDate: '2026-07-01',
  planningHorizonAge: 66,
  // ⚠️ **`cpi: 0`, AND IT IS THE ALGEBRAIC CONTROL RATHER THAN A SPECIAL CASE** (register O85,
  // user ruling 2026-09-21). The stated spending level is a REAL figure now and `project()` raises it
  // to each month's own price level, so at any positive CPI every hand-worked figure below would
  // carry a `(1 + cpi) ^ (n / 12)` in it and this fixture would be arithmetic about indexation rather
  // than about what it was written for. At nil the factor is exactly 1 in every month
  // (`core/priceLevel.ts`), so every figure here is the figure it was hand-worked as. The indexation
  // itself is asserted in `test/core-projection-waterfall.test.mjs` §8, on its own fixture.
  // Pay rising with wages (2026-09-23) is not this fixture's subject: `awote: 0` holds every salary at the figure stated. A proved control: every figure this file asserts is the same at nil on the build before pay rose.
  economicSeries: { cpi: 0, pblci: 0.025, awote: 0, mtawe: 0.035 },
  deemingRates: { lower: 0.0175, upper: 0.0375 },
  nominalReturn: 0.065,
  ...over,
});

const entry = (id, type, date, params) => ({
  id,
  date,
  owner: 'household',
  type,
  params,
  enabled: true,
  createdAt: '2026-06-01',
});

const SPEND = entry('sc', 'SPEND_CHANGE', '2026-07-01', { annualSpend: toCents(60_000.01) });
const monthAt = (months, isoMonth) => months.find((m) => m.month === isoMonth);
// **The PENSION ACCOUNT half of `assessableAssets`, since P4-3b.** Every Household in this file
// holds one Account-Based Pension and nothing else, so `assessableAssets` is that account plus the
// Offset — the walk's running cash, assessed at the balance the month OPENS with. Most fixtures
// here spend every cent they receive and so open at nil, where the two figures coincide; the ones
// with a surplus wage do not, and they use this. It conceals nothing: a build that took the Offset
// back out of the split would read every one of these as a pension account short by the cash.
const pensionAccountOnly = (month) => month.assessableAssets - month.openingBalance;
const amountOf = (month, description) =>
  month.lines.filter((l) => l.description === description).map((l) => l.amount);
const drawnIn = (month) => amountOf(month, `${PENSION_MINIMUM_LINE}, Pat`);
const reconciles = (month) =>
  month.lines.reduce((b, l) => b + (l.effect !== 'cash' ? 0 : l.direction === 'inflow' ? l.amount : -l.amount), month.openingBalance) ===
  month.closingBalance;

// --- 1. THE BALANCE THAT FALLS, and the ruling that decides by how much -----------------------------

/**
 * **Pat: 64, no wage at all, a $700,000 Account-Based Pension commenced 1 July 2024, and a spending
 * level she cannot meet out of the legislated minimum.**
 *
 * No salary, so limb 1 is nil and the Waterfall reaches limb 2 in every single month — the fixture
 * chunk 4 could not write. $60,000.01 a year against a $28,000.00 minimum: her NEED is more than
 * twice the Schedule's figure, which is what makes the floor-not-ceiling ruling visible as a figure
 * in every month rather than as a description.
 */
const PAT = {
  persons: [person('Pat', '1962-05-10', { superInterests: [abp(700_000, '2024-07-01')] })],
  homeStatus: 'occupied',
};

test('HAND-WORKED — the FIRST balance in this model that FALLS, and it falls by the payment', () => {
  const months = project(settings(), PAT, [SPEND]);
  assert.equal(months.length, 23);
  assert.equal(months[0].month, '2026-07');

  //   SCH 7, FY2026-27, hand-worked:
  //     relevant day       1 July 2026 (not a commencement year — the pension commenced 2024-07-01)
  //     age on that day    64 (born 1962-05-10), so the band from age 0 applies: 4%
  //     balance            $700,000.00
  //     minimum            4% × $700,000.00 = $28,000.00, already a multiple of the cl 5 $10 step
  assert.equal(
    annualPensionMinimum({
      fy: '2026-27',
      dateOfBirth: '1962-05-10',
      commencementDay: '2024-07-01',
      relevantDay: '2026-07-01',
      balanceObservedOn: '2026-07-01',
      balanceOnRelevantDay: toCents(700_000),
    }),
    toCents(28_000),
  );

  // MONTH 0 — the target is a twelfth of $60,000.01 rounded UP, $5,000.01, and the whole of it comes
  // from the pension because there is no other income and the offset is nil.
  // **P4-4's third line, and it is the OTHER HALF of the two hand-worked figures below.** The
  // balance falls to $694,999.99 with the payment and then earns the month's return on what is
  // left: $698,656.86 − $694,999.99 = $3,656.87. That is the growth line, `effect: 'wealth'` — it
  // is not cash, so it does not reach `closingBalance` (asserted by `reconciles` immediately
  // below), and the same figure reappears as the rise in `assessableAssets` the next month.
  // **P5-3 limb 2's residual, closed 2026-09-30: the pension payment carries `minimumDrawdown`'s
  // record.** It was `'not carried'` while `annualPensionMinimum` dropped the provenance; the line now
  // reads the year's `MinimumDrawdown` and states the Schedule's working in the Schedule's terms.
  // The first $5,000.01 is all toward the $28,000.00 minimum, so no Waterfall clause yet.
  const patYear = annualPensionMinimumDetermination({
    fy: '2026-27',
    dateOfBirth: '1962-05-10',
    commencementDay: '2024-07-01',
    relevantDay: '2026-07-01',
    balanceObservedOn: '2026-07-01',
    balanceOnRelevantDay: toCents(700_000),
  });
  const PAT_RECORD = {
    basis: 'legislated',
    register: 'Account-Based Pension minimum',
    fy: '2026-27',
    confidence: patYear.provenance.confidence,
    caveats: patYear.provenance.caveats,
    determination: [
      "age 64 on the relevant day 2026-07-01: the Schedule 7 band's percentage factor is 4%",
      'account balance 70000000 cents on the relevant day 2026-07-01 (Sch 7 cl 1(2))',
      'Sch 7 cl 4A/4B relief 1/1',
      'minimum 2800000 cents for FY2026-27, rounded once to the nearest ten dollars (Sch 7 cl 5)',
    ],
  };
  assert.deepEqual(months[0].lines, [
    { direction: 'inflow', effect: 'cash', description: 'Account-Based Pension payment, Pat', amount: 500_001, provenance: PAT_RECORD, attribution: UNATTRIBUTED.pensionMinimum },
    { direction: 'outflow', effect: 'cash', description: 'Household spending', amount: 500_001, provenance: UNLEGISLATED.spending, attribution: statedBy('sc') },
    { direction: 'inflow', effect: 'wealth', description: 'Investment growth, Pat — Account-Based Pension', amount: 365_687, provenance: UNLEGISLATED.growth, attribution: NO_STATING_ENTRY.growth },
  ]);
  assert.equal(months[0].lines[0].provenance.basis, 'legislated');
  assert.notEqual(months[0].lines[0].provenance.basis, months[0].lines[1].provenance.basis);
  assert.deepEqual([...months[0].provenance.uncarried], []);
  assert.ok(months[0].provenance.registers.includes('Account-Based Pension minimum'));
  // $28,000.00 is met by the sixth $5,000.01 (2026-12: $2,999.95 toward it, $2,000.06 above it), and
  // from that month the line says it carries more than the minimum.
  const says = (isoMonth) => monthAt(months, isoMonth).lines[0].provenance.determination;
  assert.deepEqual(says('2026-11'), PAT_RECORD.determination);
  assert.deepEqual(says('2026-12'), [...PAT_RECORD.determination, PENSION_ABOVE_MINIMUM_DETERMINATION]);
  assert.deepEqual(says('2027-01'), [...PAT_RECORD.determination, PENSION_ABOVE_MINIMUM_DETERMINATION]);
  assert.equal(69_865_686 - (70_000_000 - 500_001), 365_687);
  assert.equal(months[0].assessableAssets, toCents(700_000));
  assert.ok(reconciles(months[0]));

  //   AND THE BALANCE FALLS. 2026-08 reports what 2026-07 left behind:
  //     $700,000.00 − $5,000.01            = $694,999.99   ← DRAWDOWN FIRST
  //     × 1.005261694277, floored          =  $698,656.86  ← then growth, on what remains
  assert.equal(monthAt(months, '2026-08').assessableAssets, 69_865_686);
  //   …which is $1,343.14 BELOW the stated balance, in a month that earned 6.5% a year. A fixture
  //   whose drawdown was hidden by its growth would report a rise here.
  assert.ok(monthAt(months, '2026-08').assessableAssets < toCents(700_000));
  // The growth-only walk chunk 5a produced for the same balance, asserted notEqual so that a
  // drawdown that silently stopped moving the balance goes red rather than quiet.
  assert.equal(grownForOneMonth(toCents(700_000), 0.065), 70_368_318);
  assert.notEqual(monthAt(months, '2026-08').assessableAssets, 70_368_318);

  // Five more months at $5,000.01 apiece, each one taken off the balance before it grows.
  assert.deepEqual(
    months.slice(0, 6).map((m) => m.assessableAssets),
    [70_000_000, 69_865_686, 69_730_666, 69_594_935, 69_458_490, 69_321_327],
  );
});

test('THE RULING — DRAWDOWN FIRST, THEN GROWTH, in ONE place, and it is worth $26.31 a month', () => {
  // The whole of the ordering lives in `balanceAfterDrawdownAndGrowth`. Both readings, on the same
  // month of the same fixture:
  //   drawdown then growth  floor(($700,000.00 − $5,000.01) × 1.005261694277) = $698,656.86  ← ruled
  //   growth then drawdown  floor($700,000.00 × 1.005261694277) − $5,000.01  = $698,683.17
  const drawnFirst = balanceAfterDrawdownAndGrowth(toCents(700_000), toCents(5_000.01), 0.065);
  const grownFirst = (grownForOneMonth(toCents(700_000), 0.065) - toCents(5_000.01));
  assert.equal(drawnFirst, 69_865_686);
  assert.equal(grownFirst, 69_868_317);
  // $26.31 — one month's growth on the payment, and the conservative end of the bracket. It is the
  // figure `project()` reports, so the ruling is not merely stated in a doc comment.
  assert.equal(grownFirst - drawnFirst, toCents(26.31));
  assert.equal(monthAt(project(settings(), PAT, [SPEND]), '2026-08').assessableAssets, drawnFirst);

  // A nil draw is exactly chunk 5a's growth, which is what keeps every 5a fixture true.
  assert.equal(balanceAfterDrawdownAndGrowth(toCents(700_000), toCents(0), 0.065), grownForOneMonth(toCents(700_000), 0.065));
  // Drawing the whole balance leaves nil, and nil grows to nil: this is where a balance is EXHAUSTED.
  assert.equal(balanceAfterDrawdownAndGrowth(toCents(700_000), toCents(700_000), 0.065), toCents(0));
  // And a draw the account cannot pay is refused rather than turned into a negative balance — an
  // unstated loan inside a superannuation fund.
  assert.throws(() => balanceAfterDrawdownAndGrowth(toCents(100), toCents(101), 0.065), /cannot be paid from a balance/);
  assert.throws(() => balanceAfterDrawdownAndGrowth(toCents(100), -1, 0.065), /not a drawdown in whole cents/);
  assert.throws(() => balanceAfterDrawdownAndGrowth(-1, toCents(0), 0.065), /not a balance in whole cents/);
});

test('THE MINIMUM IS A FLOOR, NOT A CEILING — Pat reaches her own money in every month of the walk', () => {
  // **THIS TEST REPLACES THE ONE THAT STOOD HERE, and it is the same fixture read the other way
  // round.** The old test asserted that Pat's December draw was cut to $2,999.95 because the year's
  // $28,000.00 minimum was spent, that the six months after it drew NOTHING, and that her balance
  // therefore GREW back to $712,292.10 while she went eleven months short. Every one of those
  // figures was the CEILING reading, the user ruled it out on 2026-09-17 — *"pay at least the legal
  // minimum, and take more if it is needed"* — and each of them is asserted below as the number the
  // walk must NOT produce.
  const months = project(settings(), PAT, [SPEND]);

  // Pat needs $5,000.01 a month and has $700,000 of her own money behind it. She draws it, every
  // month, for the whole twenty-three-month walk.
  assert.equal(months.length, 23);
  assert.deepEqual([...new Set(months.flatMap(drawnIn))], [500_001]);
  assert.equal(months.flatMap(drawnIn).length, 23);

  // **AND SHE IS NEVER SHORT.** Under the ceiling there were eleven `Unfunded shortfall` months in
  // these same twenty-three, and P4-5's headline — the Shortfall Age — is read straight off them.
  assert.deepEqual(months.filter((m) => amountOf(m, SHORTFALL_LINE).length > 0), []);

  // **THE YEAR'S DRAW IS ABOVE THE SCHEDULE'S FIGURE, and that is the whole ruling as a number.**
  //   FY2026-27 minimum, determined on 1 July 2026   $28,000.00   ← what must be PAID
  //   FY2026-27 drawn, twelve months at $5,000.01    $60,000.12   ← what was NEEDED, and taken
  assert.equal(months.slice(0, 12).flatMap(drawnIn).reduce((a, b) => a + b, 0), toCents(60_000.12));
  assert.ok(toCents(60_000.12) > toCents(28_000), 'the minimum is a floor: a household may draw more');
  // The Schedule's figure is still determined, and still $28,000.00 — the ruling changed what is
  // done with it, not how it is worked out.
  assert.equal(
    annualPensionMinimum({
      fy: '2026-27',
      dateOfBirth: '1962-05-10',
      commencementDay: '2024-07-01',
      relevantDay: '2026-07-01',
      balanceObservedOn: '2026-07-01',
      balanceOnRelevantDay: toCents(700_000),
    }),
    toCents(28_000),
  );

  // **THE CEILING'S OWN FIGURES, ASSERTED AS ABSENT.** December was cut to $2,999.95 and fell short
  // by $2,000.06; January to June drew nothing at all.
  assert.deepEqual(drawnIn(monthAt(months, '2026-12')), [500_001]);
  assert.notEqual(drawnIn(monthAt(months, '2026-12'))[0], toCents(2_999.95));
  assert.deepEqual(amountOf(monthAt(months, '2026-12'), SHORTFALL_LINE), []);
  assert.deepEqual(months.slice(6, 12).flatMap(drawnIn), [500_001, 500_001, 500_001, 500_001, 500_001, 500_001]);

  // **AND THE BALANCE NEVER RECOVERS, which is the visible half.** Under the ceiling June 2027 read
  // $712,292.10 — MORE than the $700,000.00 Pat started with, in a year she spent $60,000.12 out of
  // it. It now reads $684,830.58, and it falls in every single month of the walk.
  assert.equal(monthAt(months, '2027-06').assessableAssets, 68_483_058);
  assert.notEqual(monthAt(months, '2027-06').assessableAssets, 71_229_210);
  const assets = months.map((m) => m.assessableAssets);
  assert.deepEqual(assets, [...assets].sort((a, b) => b - a), 'the balance must fall monotonically');
  assert.ok(assets.at(-1) < toCents(700_000));

  // **A TWELFTH IS STILL NOT TAKEN — at either end.** $28,000.00 ÷ 12 is $2,333.33, which is less
  // than Pat's monthly target, so a twelfthed limb would fall short in every one of the twenty-three
  // months. It does not, and the reason is that nothing here divides an annual figure by anything.
  assert.ok(toCents(28_000) / 12 < toCents(5_000.01));
  assert.equal(months.filter((m) => amountOf(m, SHORTFALL_LINE).length > 0).length, 0);

  // **THE NEW YEAR STILL RESETS, off the 1 July balance and nothing else** — and the FACTOR moves
  // too, because Sch 7 cl 1(2) takes the age on the relevant day and Pat turned 65 on 2027-05-10.
  // The 1 July 2027 balance is now $683,407.63, not the ceiling reading's $716,039.96.
  assert.equal(monthAt(months, '2027-07').assessableAssets, 68_340_763);
  assert.notEqual(monthAt(months, '2027-07').assessableAssets, 71_603_996);
  //   5% × $683,407.63 = $34,170.3815, cl 5 to the nearest $10 → $34,170.00
  assert.equal(
    annualPensionMinimum({
      fy: '2027-28',
      dateOfBirth: '1962-05-10',
      commencementDay: '2024-07-01',
      relevantDay: '2027-07-01',
      balanceObservedOn: '2027-07-01',
      balanceOnRelevantDay: 68_340_763,
    }),
    toCents(34_170),
  );
  // The band step is real and not incidental: the same balance at 64 would have given $27,340.00.
  assert.notEqual(toCents(34_170), toCents(27_340));
});

test('THE TWO DECISION FUNCTIONS — the capacity is the BALANCE, and the floor is due ONCE A YEAR', () => {
  // **`pensionAvailableThisMonth`: what limb 2 MAY supply, and it is the account, entire.** The
  // mutation it exists to kill is `Math.min(remainingForYear, balance)` — the ceiling — so the two
  // arguments that used to be here are down to one, and a $700,000 account with $2,999.95 of its
  // year's minimum left still offers $700,000.
  assert.equal(pensionAvailableThisMonth(toCents(700_000)), toCents(700_000));
  assert.equal(pensionAvailableThisMonth(toCents(19_395.83)), toCents(19_395.83));
  // An exhausted account offers nothing and does not throw: exhaustion is an ordinary state now.
  assert.equal(pensionAvailableThisMonth(toCents(0)), toCents(0));
  assert.throws(() => pensionAvailableThisMonth(-1), /not a balance in whole cents/);
  assert.throws(() => pensionAvailableThisMonth(1.5), /not a balance in whole cents/);

  // **`minimumStillDueThisMonth`: what limb 2 MUST pay, needed or not.** Nil in eleven months of the
  // twelve — reg 1.06(9A)(a) requires the payment *at least annually*, and a monthly slice would be
  // exactly the invented schedule a twelfth would be — and the whole remainder in the last.
  assert.equal(minimumStillDueThisMonth(toCents(9_140), toCents(700_000), false), toCents(0));
  assert.equal(minimumStillDueThisMonth(toCents(9_140), toCents(700_000), true), toCents(9_140));
  // A household that has already drawn the whole minimum owes nothing in June either.
  assert.equal(minimumStillDueThisMonth(toCents(0), toCents(700_000), true), toCents(0));
  // **Floored at the balance**, which is what the account actually holds after this month's needed
  // draw: an emptied pension cannot pay a legislated figure, and it does not throw trying.
  assert.equal(minimumStillDueThisMonth(toCents(28_000), toCents(19_395.83), true), toCents(19_395.83));
  assert.equal(minimumStillDueThisMonth(toCents(28_000), toCents(0), true), toCents(0));
  assert.throws(() => minimumStillDueThisMonth(-1, toCents(1), true), /not a remaining annual minimum/);
  assert.throws(() => minimumStillDueThisMonth(toCents(1), -1, true), /not a balance in whole cents/);
});

// --- 1b. The scenario the ruling came from: P4-7's Moneysmart shape ---------------------------------

/**
 * **Dale: $600,000 in an Account-Based Pension, nothing else, and a target far above the floor.**
 * This is the shape P4-7's Moneysmart run put in front of the user, in miniature — and with the
 * file's own convention kept, so Dale is 64 and no Age Pension reaches any figure below.
 *
 * Under the ceiling this walk drew exactly the Schedule's figure, reported every remaining cent as
 * `Unfunded shortfall`, and the balance ROSE while the household was told it could not afford its
 * own spending. Moneysmart spends the same account to zero.
 */
const DALE = {
  persons: [person('Dale', '1962-05-10', { superInterests: [abp(600_000, '2024-07-01')] })],
  homeStatus: 'occupied',
};

test('A HOUSEHOLD CAN REACH ITS OWN MONEY — Dale draws 10.72% of the account, not the 4% floor', () => {
  // Dale is 64 on 1 July 2026, so the Sch 7 band is 4%: $600,000 × 4% = $24,000.00 for FY2026-27.
  assert.equal(
    annualPensionMinimum({
      fy: '2026-27',
      dateOfBirth: '1962-05-10',
      commencementDay: '2024-07-01',
      relevantDay: '2026-07-01',
      balanceObservedOn: '2026-07-01',
      balanceOnRelevantDay: toCents(600_000),
    }),
    toCents(24_000),
  );
  const months = project(settings(), DALE, [
    entry('sc', 'SPEND_CHANGE', '2026-07-01', { annualSpend: toCents(64_320) }),
  ]);
  const drawn = months.map((m) => amountOf(m, `${PENSION_MINIMUM_LINE}, Dale`)[0]);

  //   $64,320.00 ÷ 12 = $5,360.00 a month, and every cent of it comes out of the pension because
  //   Dale has no other income at all. That is 10.72% of the opening account in the first year —
  //   against a 4% floor, and the law caps nothing.
  assert.deepEqual([...new Set(drawn)], [toCents(5_360)]);
  assert.equal(drawn.length, 23);
  assert.equal(months.slice(0, 12).reduce((total, m) => total + amountOf(m, `${PENSION_MINIMUM_LINE}, Dale`)[0], 0), toCents(64_320));
  assert.equal(toCents(64_320) / toCents(600_000), 0.1072);
  assert.ok(toCents(64_320) > toCents(24_000));

  // **Under the ceiling, $40,320.00 of that year was `Unfunded shortfall`** — $64,320.00 needed
  // against $24,000.00 allowed — and the Shortfall Age was read off it. There is no shortfall line
  // anywhere in this walk now.
  assert.equal(toCents(64_320) - toCents(24_000), toCents(40_320));
  assert.deepEqual(months.filter((m) => amountOf(m, SHORTFALL_LINE).length > 0), []);

  // **And the balance FALLS instead of rising**, which is the other half of P4-7's finding: at 6.5%
  // a 4% draw leaves an account GROWING, and this one is being spent.
  //   $600,000.00 − $5,360.00 = $594,640.00, × 1.005261694277, floored = $597,768.81
  assert.equal(months[1].assessableAssets, 59_776_881);
  assert.equal(balanceAfterDrawdownAndGrowth(toCents(600_000), toCents(5_360), 0.065), 59_776_881);
  assert.ok(months.at(-1).assessableAssets < toCents(600_000));
  assert.equal(months.at(-1).assessableAssets, 54_810_435);
  // The ceiling counterfactual, computed rather than asserted from nothing: a $2,000.00 monthly draw
  // — a twelfth of the year's $24,000.00 — leaves the balance HIGHER after a month than it started.
  assert.ok(balanceAfterDrawdownAndGrowth(toCents(600_000), toCents(2_000), 0.065) > toCents(600_000));
});

test('THE LINE AND THE WRITE-BACK ARE ONE CHANGE — the reconciliation still MEANS what it claims', () => {
  // Chunk 4's identity is computed from `lines`, so a draw that moved a balance with no line against
  // it would stay arithmetically true and stop meaning anything. Both halves, on every month:
  //   * the identity holds; and
  //   * the fall in the super balance is EXACTLY the drawdown line, once growth is undone.
  const months = project(settings({ nominalReturn: 0 }), PAT, [SPEND]);
  let previous = toCents(700_000);
  let checked = 0;
  for (const month of months) {
    assert.ok(reconciles(month), `${month.month} does not reconcile`);
    // `nominalReturn: 0` is the control that makes this an equality rather than an approximation:
    // with nothing growing, the month-to-month fall in the assessable balance IS the payment.
    const drawn = drawnIn(month)[0] ?? 0;
    assert.equal(previous - month.assessableAssets, 0, `${month.month}: the month is assessed on what it OPENS with`);
    previous = month.assessableAssets - drawn;
    checked += 1;
  }
  assert.equal(checked, 23);
  // Not vacuous: money really moved, and with nothing growing the last month's balance is the stated
  // one less the twenty-two payments of $5,000.01 the walk has already closed a month on:
  // $700,000.00 − 22 × $5,000.01 = $589,999.78.
  assert.equal(months.at(-1).assessableAssets, toCents(700_000) - 22 * toCents(5_000.01));
  assert.equal(months.at(-1).assessableAssets, toCents(589_999.78));
  // **And that figure is ABOVE the two years' minimums, which is the ruling in one line.** Under the
  // ceiling the walk drew $28,000.00 in FY2026-27 and $33,600.00 in FY2027-28 and stopped, leaving
  // $638,400.00; Pat needed $115,000.23 across the twenty-three months and took it.
  assert.notEqual(months.at(-1).assessableAssets, toCents(700_000) - toCents(28_000) - toCents(33_600));
  assert.equal(months.flatMap(drawnIn).length, 23);
  assert.equal(months.flatMap(drawnIn).reduce((a, b) => a + b, 0), toCents(115_000.23));
});

// --- 2. THE PRIZE: a project()-level ORDER fixture ---------------------------------------------------

/**
 * **Robin: the same pension, plus a wage that covers an ordinary month — and one month that it does
 * not.** This is the fixture chunk 4 could not write, and it exists to make the Waterfall's ORDER
 * have a consequence inside `project()`.
 *
 * It needs all three of these true in one month, and they are:
 *   * limb 1 (salary) supplies something but not everything      → $2,140.00 of a $21,000.00 target
 *   * the pension is PARTIALLY drawn — available, not exhausted  → $18,860.00 of the $28,000.00
 *     minimum still owed, drawn before any cash (2026-09-23)
 *   * the cash is FUNDED and, in the right order, draws NOTHING → $9,120.00 untouched
 *
 * A transposition of the pension's minimum with either neighbour therefore moves money, and the three closing
 * balances are three different dollar figures.
 */
const ROBIN = {
  persons: [
    person('Robin', '1962-05-10', {
      // P6-8 brief 3 chunk 2b: a Person who is PAID has an employer Guarantee, and a retirement-phase
      // interest is closed to contributions — so a salaried Person drawing an Account-Based Pension
      // holds an accumulation interest beside it. Nil, so it moves nothing of its own.
      superInterests: [abp(700_000, '2024-07-01'), { phase: 'accumulation', balance: toCents(0) }],
      employmentIncomePerFortnight: toCents(1_000),
    }),
  ],
  homeStatus: 'occupied',
};
const ROBIN_ENTRIES = [
  entry('sc', 'SPEND_CHANGE', '2026-07-01', { annualSpend: toCents(12_000) }),
  entry('oo', 'ONE_OFF_EXPENSE', '2027-03-10', { amount: toCents(20_000) }),
];

test('THE ORDER, IN project() — drawing limb 2 in the wrong place changes a DOLLAR FIGURE', () => {
  const months = project(settings(), ROBIN, ROBIN_ENTRIES);
  const march = monthAt(months, '2027-03');

  //   THE MONTH, hand-worked:
  //     TARGET    $1,000.00 spending + $20,000.00 one-off                     = $21,000.00
  //     limb 1    $26,000 a year ÷ 12 = $2,166.67, less $26.67 of income tax  =  $2,140.00
  //     pension   the year's $28,000.00 minimum, untouched for eight months   = $28,000.00 available
  //     cash      eight months of $1,140.00 surplus, no loan to offset        =  $9,120.00 available
  //     portfolio none                                                        =        nil
  //     pension   the rest of the $730,013.82 account                         = $702,013.82 available
  assert.equal(march.openingBalance, toCents(9_120));
  assert.deepEqual(amountOf(march, 'Salary, Robin'), [216_667]);
  assert.deepEqual(amountOf(march, 'Income tax, Robin'), [2_667]);

  //   IN THE RIGHT ORDER: the pension's minimum covers the whole of what the wage could not, and the
  //   cash is never reached — so the month CLOSES ON THE BALANCE IT OPENED WITH.
  //     the minimum draws $21,000.00 − $2,140.00 = $18,860.00, and the cash draws NIL.
  assert.deepEqual(amountOf(march, `${PENSION_MINIMUM_LINE}, Robin`), [toCents(18_860)]);
  assert.equal(march.closingBalance, toCents(9_120));
  assert.ok(reconciles(march));
  //   …and the pension balance falls by exactly that payment before it grows:
  //     ($730,013.82 − $18,860.00) × 1.005261694277, floored = $714,895.69
  //   (the Offset is $9,120.00 in both months and is assessed alongside the account since P4-3b, so
  //   the account is read off the difference — $739,133.82 and $723,809.69 are the reported totals)
  assert.equal(pensionAccountOnly(march), 73_001_382);
  assert.equal(march.assessableAssets, 73_001_382 + toCents(9_120));
  assert.equal(pensionAccountOnly(monthAt(months, '2027-04')), 71_489_569);
  assert.equal(balanceAfterDrawdownAndGrowth(73_001_382, toCents(18_860), 0.065), 71_489_569);

  //   THE TWO WRONG ORDERS, run through `drawWaterfall` with the very same capacities rather than
  //   asserted from nothing — so these are the figures the wrong engine would really produce.
  //   **The limb capacities are the walk's own March figures since 2026-09-23**: the pension offers
  //   what is still owed of FY2026-27's $28,000.00 minimum FIRST — all of it, since nothing was
  //   needed for eight months — and the rest of the account after the portfolio; Robin has no home
  //   loan, so the whole $9,120.00 of cash is cash NOT offsetting a loan, offered third.
  //   (Before that day limb 2 offered the whole account and this capacity was written as $28,000.00
  //   by hand; it is now the real figure, asserted against the walk's own note below.)
  const capacities = {
    salary: { available: toCents(2_140), note: 'wages' },
    accountBasedPensionMinimum: { available: toCents(28_000), note: 'the minimum still owed' },
    cashAboveLoan: { available: toCents(9_120), note: 'the cash, no loan owing' },
    nonSuperPortfolio: { available: toCents(0), note: 'none' },
    accountBasedPensionAboveMinimum: { available: 73_001_382 - toCents(28_000), note: 'the rest of the account' },
    offsetAccount: { available: toCents(0), note: 'no loan to offset' },
    // Released super at NIL: this Household's super is all Account-Based Pension, and the
    // released-super limb offers nothing out of one.
    releasedSuperannuation: { available: toCents(0), note: 'no accumulation interest' },
  };
  const limbOf = (name) => march.notes.find((n) => n.subject === 'waterfall limb' && n.limb === name);
  for (const name of WATERFALL_LIMBS.filter((n) => n !== 'salary')) {
    assert.equal(limbOf(name).available, capacities[name].available, `${name}: the counterfactual is not built on the walk's own capacity`);
  }
  const inOrder = (limbs) =>
    drawWaterfall(toCents(21_000), Object.fromEntries(WATERFALL_LIMBS.map((limb, i) => [limb, capacities[limbs[i]]])));
  const [SALARY, ABP, CASH, PORTFOLIO, ABOVE, OFFSET, RELEASED] = WATERFALL_LIMBS;

  //   (i) the RIGHT order, which agrees with the walk to the cent.
  const right = inOrder([SALARY, ABP, CASH, PORTFOLIO, ABOVE, OFFSET, RELEASED]);
  assert.deepEqual(right.draws.map((d) => d.drawn), [toCents(2_140), toCents(18_860), 0, 0, 0, 0, 0]);

  //   (ii) the pension's minimum AFTER the cash — cash drawn before the money that must leave the
  //   pension anyway. The cash is emptied, the pension draws only $9,740.00, and the month closes
  //   at NIL instead of at $9,120.00.
  const cashFirst = inOrder([SALARY, CASH, ABP, PORTFOLIO, ABOVE, OFFSET, RELEASED]);
  assert.deepEqual(cashFirst.draws.map((d) => d.drawn), [toCents(2_140), toCents(9_120), toCents(9_740), 0, 0, 0, 0]);
  assert.notEqual(toCents(9_740), toCents(18_860));
  assert.notEqual(march.closingBalance, toCents(0));
  // The counterfactual closing balance and next month's assets, both different, both computed:
  //   $9,120.00 opening + $2,140.00 received + $9,740.00 drawn − $21,000.00 target = nil
  assert.equal(toCents(9_120) + toCents(2_140) + toCents(9_740) - toCents(21_000), toCents(0));
  assert.notEqual(pensionAccountOnly(monthAt(months, '2027-04')), balanceAfterDrawdownAndGrowth(73_001_382, toCents(9_740), 0.065));

  //   (iii) the pension BEFORE the wage. It funds the WHOLE target, the wage banks untouched, and the
  //   month closes at $11,260.00.
  const pensionFirst = inOrder([ABP, SALARY, CASH, PORTFOLIO, ABOVE, OFFSET, RELEASED]);
  assert.deepEqual(pensionFirst.draws.map((d) => d.drawn), [toCents(21_000), 0, 0, 0, 0, 0, 0]);
  assert.equal(toCents(9_120) + toCents(2_140) + toCents(21_000) - toCents(21_000), toCents(11_260));
  assert.notEqual(march.closingBalance, toCents(11_260));
  assert.notEqual(pensionAccountOnly(monthAt(months, '2027-04')), balanceAfterDrawdownAndGrowth(73_001_382, toCents(21_000), 0.065));

  //   THREE ORDERS, THREE CLOSING BALANCES: $9,120.00 / $0.00 / $11,260.00. The walk reports the
  //   first, and that is the prize chunk 4 recorded as owed.
  assert.deepEqual([toCents(9_120), toCents(0), toCents(11_260)].length, 3);
  assert.equal(new Set([toCents(9_120), toCents(0), toCents(11_260)]).size, 3);
});

test('THE MINIMUM IS PAID EVEN WHEN NOBODY NEEDS IT — the $9,140.00 that used to go missing', () => {
  // **THIS TEST REPLACES THE RESIDUAL IT USED TO ASSERT, and it is the same fixture and the same
  // dollar figure read the other way round.** It stood here that Robin's wage covered her spending
  // in eight months, so limb 2 drew nothing in them, so she paid $18,860.00 of FY2026-27's
  // $28,000.00 minimum and kept the other $9,140.00 compounding inside super — *"the household ends
  // RICHER than the compliant one"*. reg 1.06(9A)(a) requires the payment whether or not it is
  // needed. It is now made.
  const months = project(settings(), ROBIN, ROBIN_ENTRIES);
  const firstYear = months.slice(0, 12);
  const paid = (m) => amountOf(m, `${PENSION_MINIMUM_LINE}, Robin`);

  // The eight months her wage covered still draw NOTHING toward the target — the Waterfall has not
  // stopped drawing to need, and limb 2 is still second in the order.
  assert.deepEqual(firstYear.slice(0, 8).flatMap(paid), []);
  // March is the month she needed it: $18,860.00, exactly as before.
  assert.deepEqual(paid(monthAt(months, '2027-03')), [toCents(18_860)]);

  // **AND JUNE SWEEPS THE REST — $28,000.00 − $18,860.00 = $9,140.00**, in the last month of the
  // financial year, with nobody needing a cent of it.
  assert.deepEqual(paid(monthAt(months, '2027-06')), [toCents(9_140)]);
  assert.equal(toCents(28_000) - toCents(18_860), toCents(9_140));
  // The year's payments now total the legislated minimum to the cent.
  assert.equal(firstYear.flatMap(paid).reduce((a, b) => a + b, 0), toCents(28_000));
  // It is paid ONCE, in ONE month: the sweep is not a twelfth and is not repeated.
  assert.equal(firstYear.filter((m) => paid(m).length > 0).length, 2);

  // **WHERE IT WENT, and this is the half that settles the mutation "leave it in the pension".**
  // Two places, and both are asserted, because a payment recorded as a line but not taken out of the
  // account — or taken out with no line — would leave chunk 4's identity true and meaningless.
  //   (i) INTO the running cash, which IS the Offset (P4-3b), exactly as a surplus wage is:
  //       $11,400.00 opening + $1,140.00 of surplus wage + $9,140.00 = $21,680.00.
  const june = monthAt(months, '2027-06');
  assert.equal(june.openingBalance, toCents(11_400));
  assert.equal(june.closingBalance, toCents(21_680));
  assert.equal(june.closingBalance - june.openingBalance, toCents(1_140) + toCents(9_140));
  assert.ok(reconciles(june));
  //   (ii) OUT of the pension, before that month's growth:
  //       ($722,438.60 − $9,140.00) × 1.005261694277, floored = $717,051.75
  assert.equal(pensionAccountOnly(june), 72_243_860);
  assert.equal(june.assessableAssets, 72_243_860 + toCents(11_400), 'the account plus June’s own opening Offset');
  assert.equal(pensionAccountOnly(monthAt(months, '2027-07')), 71_705_175);
  assert.equal(balanceAfterDrawdownAndGrowth(72_243_860, toCents(9_140), 0.065), 71_705_175);
  // The counterfactual — the money left inside the pension — is a different figure in BOTH places.
  assert.notEqual(pensionAccountOnly(monthAt(months, '2027-07')), grownForOneMonth(72_243_860, 0.065));
  assert.notEqual(june.closingBalance, toCents(12_540));

  // **AND THE RESIDUAL THAT IS LEFT, stated as a figure and pointing the same way as the old one but
  // an order of magnitude smaller.** The sweep is made in June rather than spread over the year, so
  // Robin earned a part-year's growth on money a monthly-paying household would have moved into the
  // (non-growing) Offset earlier. reg 1.06(9A)(a) requires the payment *at least annually* and this
  // model will not invent a schedule the Schedule does not impose — see `minimumStillDueThisMonth`.
  // The bound is one year's growth on the swept amount: at 6.5%, under $594.10 on $9,140.00.
  assert.ok(grownForOneMonth(toCents(9_140), 0.065) - toCents(9_140) < toCents(50));
  assert.ok(toCents(9_140) * 0.065 < toCents(600));
});

test('TWO PENSIONS, TWO PEOPLE — the draw is allocated in the Household\'s own stated order', () => {
  // **The survivor this test was written to kill.** Every fixture above holds ONE interest, so
  // reversing the allocation order across interests failed ZERO tests. It is observable in exactly
  // one place — WHOSE pension paid — so the fixture is a couple, and the assertion is the lines.
  //
  // Pat holds $700,000 (minimum $28,000.00) and Alex $200,000 (minimum $8,000.00), both commenced
  // 2024-07-01, both 64, no wage between them, and the Household spends $5,000.01 a month.
  const couple = {
    persons: [
      person('Pat', '1962-05-10', { superInterests: [abp(700_000, '2024-07-01')] }),
      person('Alex', '1962-08-20', { superInterests: [abp(200_000, '2024-07-01')] }),
    ],
    homeStatus: 'occupied',
  };
  const months = project(settings(), couple, [SPEND]);
  const paidBy = (month) =>
    month.lines.filter((l) => l.description.startsWith(PENSION_MINIMUM_LINE)).map((l) => [l.description, l.amount]);

  // Five months out of PAT's pension alone — hers is first in `household.persons` and hers is drawn
  // first. Alex's account is untouched and is still growing.
  assert.deepEqual(months.slice(0, 5).map(paidBy), [
    [['Account-Based Pension payment, Pat', 500_001]],
    [['Account-Based Pension payment, Pat', 500_001]],
    [['Account-Based Pension payment, Pat', 500_001]],
    [['Account-Based Pension payment, Pat', 500_001]],
    [['Account-Based Pension payment, Pat', 500_001]],
  ]);

  //   **DECEMBER SPILLS AGAIN, and since 2026-09-23 the reason is the ORDER, not a ceiling.** What is
  //   still owed of each pension's minimum is drawn FIRST, across both accounts in the Household's
  //   stated order; the rest of each account only after the portfolio. Five months of $5,000.01 is
  //   $25,000.05 of Pat's $28,000.00, so December takes Pat's last $2,999.95 of minimum and the other
  //   $2,000.06 from ALEX's minimum — Pat's account still holds $670,000-odd, but that is ABOVE her
  //   minimum and it waits. **Under the reverse order the first line would name Alex for the whole
  //   $5,000.01.**
  assert.deepEqual(paidBy(monthAt(months, '2026-12')), [
    ['Account-Based Pension payment, Pat', toCents(2_999.95)],
    ['Account-Based Pension payment, Alex', toCents(2_000.06)],
  ]);
  assert.equal(toCents(28_000) - 5 * 500_001, toCents(2_999.95));
  assert.equal(500_001 - toCents(2_999.95), toCents(2_000.06));
  //   January: Alex's minimum alone — $8,000.00 − $2,000.06 = $5,999.94 still owed covers the month.
  assert.deepEqual(paidBy(monthAt(months, '2027-01')), [['Account-Based Pension payment, Alex', 500_001]]);
  //   February: the LAST of Alex's minimum, $5,999.94 − $5,000.01 = $999.93, and then — both
  //   minimums paid — the pension ABOVE its minimum, Pat's first, for the other $4,000.08. One month,
  //   both pension limbs, and the allocation still in the stated order.
  assert.deepEqual(paidBy(monthAt(months, '2027-02')), [
    ['Account-Based Pension payment, Pat', toCents(4_000.08)],
    ['Account-Based Pension payment, Alex', toCents(999.93)],
  ]);
  assert.equal(toCents(5_999.94) - 500_001, toCents(999.93));
  assert.equal(toCents(999.93) + toCents(4_000.08), 500_001);
  // Nobody is short in any month: under the old ceiling February fell $4,000.08 short — exactly the
  // figure Pat's account above its minimum now pays.
  assert.deepEqual(months.filter((m) => amountOf(m, SHORTFALL_LINE).length > 0), []);

  //   **JUNE 2027 SWEEPS NOTHING.** Both minimums were paid by need, Alex's by February, so reg
  //   1.06(9A)(a) is already met and the floor adds nothing. Before 2026-09-23 Alex's $8,000.00 was
  //   untouched all year and swept into cash in June, where it sat — the pile-up the new order ends.
  assert.deepEqual(paidBy(monthAt(months, '2027-06')), [['Account-Based Pension payment, Pat', 500_001]]);
  //   FY2026-27, the two accounts together: exactly the year's need, 12 × $5,000.01 = $60,000.12 —
  //   $52,000.12 out of Pat's and Alex's whole $8,000.00 minimum. It was $68,000.12 when the minimum
  //   was swept on top of the need.
  const firstYear = months.slice(0, 12).flatMap(paidBy);
  assert.equal(firstYear.filter(([name]) => name.endsWith('Pat')).reduce((t, [, a]) => t + a, 0), toCents(52_000.12));
  assert.equal(firstYear.filter(([name]) => name.endsWith('Alex')).reduce((t, [, a]) => t + a, 0), toCents(8_000));
  assert.equal(firstYear.reduce((total, [, amount]) => total + amount, 0), 12 * 500_001);
  // And so no cash is left over: June closes on nil, where the swept minimum used to leave $8,000.00.
  assert.equal(monthAt(months, '2027-06').closingBalance, toCents(0));

  //   The NEXT year repeats the rule on new minimums: Pat's is drawn first for six months and spills
  //   into Alex's in January 2028, and Alex's FY2027-28 minimum is paid in full, by need, by March.
  assert.deepEqual(months.slice(12, 18).flatMap(paidBy), Array.from({ length: 6 }, () => ['Account-Based Pension payment, Pat', 500_001]));
  assert.equal(paidBy(monthAt(months, '2028-01')).length, 2);
  assert.deepEqual(paidBy(monthAt(months, '2028-06')), [['Account-Based Pension payment, Pat', 500_001]]);
  for (const month of months) assert.ok(reconciles(month), `${month.month} does not reconcile`);
});

// --- 3. The commencement year: the part-year rule, and cl 4's nil ------------------------------------

/**
 * **Kim: the same pension, commencing 15 October 2026 — inside the walk.** The trap this closes is a
 * first-year fixture in which the part-year rule and the full-year rule happen to agree. Here they
 * are $8,260.00 apart.
 */
const KIM = {
  persons: [person('Kim', '1962-05-10', { superInterests: [abp(700_000, '2026-10-15')] })],
  homeStatus: 'occupied',
};

test('HAND-WORKED — a COMMENCEMENT YEAR reads the commencement-day balance and cl 3 pro-rates it', () => {
  const months = project(settings(), KIM, [SPEND]);

  // Sch 7 cl 1(2)(a)(ii): the relevant day is the COMMENCEMENT DAY, not 1 July.
  assert.equal(schedule7RelevantDay('2026-27', '2026-10-15'), '2026-10-15');
  assert.equal(schedule7RelevantDay('2027-28', '2026-10-15'), '2027-07-01');
  // And a year before the pension exists has no minimum at all — not a nil, an absence.
  assert.equal(schedule7RelevantDay('2025-26', '2026-10-15'), undefined);

  // Before it commences the limb is nil and the household is wholly unfunded — three short months.
  assert.deepEqual(months.slice(0, 3).map((m) => amountOf(m, SHORTFALL_LINE)[0]), [500_001, 500_001, 500_001]);
  assert.deepEqual(months.slice(0, 3).flatMap((m) => amountOf(m, `${PENSION_MINIMUM_LINE}, Kim`)), []);
  // The balance grows untouched for those three months: $700,000.00 → $711,107.78.
  assert.equal(monthAt(months, '2026-10').assessableAssets, 71_110_778);

  //   THE COMMENCEMENT YEAR, hand-worked, off that very balance:
  //     days including and following 15 October 2026, to 30 June 2027
  //       17 + 30 + 31 + 31 + 28 + 31 + 30 + 31 + 30                        = 259
  //     $711,107.78 × 4% × 259 ÷ 365 = $20,183.7715…, cl 5 to nearest $10   = $20,180.00
  const partYear = annualPensionMinimum({
    fy: '2026-27',
    dateOfBirth: '1962-05-10',
    commencementDay: '2026-10-15',
    relevantDay: '2026-10-15',
    balanceObservedOn: '2026-10-15',
    balanceOnRelevantDay: 71_110_778,
  });
  assert.equal(partYear, toCents(20_180));

  //   **AND THE FULL-YEAR RULE ON THE SAME BALANCE IS A DIFFERENT NUMBER** — $28,440.00, because
  //   $711,107.78 × 4% = $28,444.3112 rounds to $28,440.00. $8,260.00 apart, so a fixture in which
  //   cl 3 was skipped could not pass this.
  const fullYear = annualPensionMinimum({
    fy: '2026-27',
    dateOfBirth: '1962-05-10',
    commencementDay: '2026-07-01',
    relevantDay: '2026-07-01',
    balanceObservedOn: '2026-07-01',
    balanceOnRelevantDay: 71_110_778,
  });
  assert.equal(fullYear, toCents(28_440));
  assert.equal(fullYear - partYear, toCents(8_260));

  //   **What the WALK draws, and this is where the ruling changed the reading.** It used to stop at
  //   the part-year figure — four months at $5,000.01 and a stub of $179.96 — because the minimum
  //   was the cap. Kim needs $5,000.01 a month and has $700,000 of her own behind it, so from the
  //   month the pension commences she draws it, and the nine months of FY2026-27 come to $45,000.09.
  assert.deepEqual(
    months.slice(3, 8).flatMap((m) => amountOf(m, `${PENSION_MINIMUM_LINE}, Kim`)),
    [500_001, 500_001, 500_001, 500_001, 500_001],
  );
  assert.equal(
    months.slice(0, 12).flatMap((m) => amountOf(m, `${PENSION_MINIMUM_LINE}, Kim`)).reduce((a, b) => a + b, 0),
    toCents(45_000.09),
  );
  assert.ok(toCents(45_000.09) > partYear, 'cl 3 pro-rates a FLOOR, and a floor does not stop a draw');
  // The ceiling's own stub, asserted absent: February 2027 was $179.96 and is $5,000.01.
  assert.deepEqual(months.slice(3, 8).flatMap((m) => amountOf(m, `${PENSION_MINIMUM_LINE}, Kim`)).filter((a) => a === toCents(179.96)), []);
  // …and no month of the year falls short, where under the ceiling seven of the nine did.
  assert.deepEqual(months.slice(3, 12).flatMap((m) => amountOf(m, SHORTFALL_LINE)), []);
  // **The part-year rule is `minimumDrawdown.ts`'s and is not re-implemented out here**: nothing in
  // `project()` divides by a day count or a month count, and the proof is that the figure above is
  // the module's own, called with a commencement day and a year and nothing else.
});

test('cl 3 STILL BINDS THE FLOOR — Kim at work sweeps $20,180.00 in June, not $28,440.00', () => {
  // **The fixture above can no longer show cl 3 as a walk figure, so this one does.** Once the limb
  // offers the balance, a household that NEEDS more than the minimum never reveals the minimum at
  // all — its draw is its need. The Schedule's figure is visible in exactly one place now: the month
  // the FLOOR is swept. So this is the same Kim, the same pension and the same 15 October 2026
  // commencement, with a wage that covers her spending — and June 2027 pays the part-year figure to
  // the cent, with nobody needing a dollar of it.
  const working = {
    persons: [
      person('Kim', '1962-05-10', {
        // See ROBIN: a salaried Person needs an accumulation interest for the Guarantee to land in.
        superInterests: [abp(700_000, '2026-10-15'), { phase: 'accumulation', balance: toCents(0) }],
        employmentIncomePerFortnight: toCents(3_000),
      }),
    ],
    homeStatus: 'occupied',
  };
  const months = project(settings(), working, [SPEND]);
  const paid = (m) => amountOf(m, `${PENSION_MINIMUM_LINE}, Kim`);

  // Eleven months in which the wage covers the bill and the pension pays nothing.
  assert.deepEqual(months.slice(0, 11).flatMap(paid), []);
  // **And the twelfth, which is cl 3's own number**: $711,107.78 × 4% × 259 ÷ 365, rounded once.
  assert.deepEqual(paid(monthAt(months, '2027-06')), [toCents(20_180)]);
  // **THE MUTATION THIS EXISTS FOR — the full-year rule on the same balance is $28,440.00**, and it
  // is $8,260.00 away, so a walk that dropped cl 3 could not pass this line.
  assert.notEqual(toCents(20_180), toCents(28_440));
  assert.equal(toCents(28_440) - toCents(20_180), toCents(8_260));
  // The money left the pension and landed in the running cash, in that one month.
  //   $236.66 of surplus wage that month, plus the $20,180.00 sweep.
  assert.equal(monthAt(months, '2027-06').closingBalance - monthAt(months, '2027-06').openingBalance, toCents(20_180) + toCents(236.66));
  assert.equal(
    pensionAccountOnly(monthAt(months, '2027-07')),
    balanceAfterDrawdownAndGrowth(pensionAccountOnly(monthAt(months, '2027-06')), toCents(20_180), 0.065),
  );
  for (const month of months) assert.ok(reconciles(month), `${month.month} does not reconcile`);
});

test('cl 4 — a NIL minimum in the commencement year is a nil FLOOR, and not a prohibition', () => {
  //   Sch 7 cl 4: a stream commencing 15 June 2027 has no FY2026-27 minimum at all — a nil rather
  //   than a small number — and its first minimum is a FULL-year one off the 1 July 2027 balance.
  //
  // **What that nil MEANS changed with the 2026-09-17 ruling, and this test changed with it.** It
  // used to assert that nothing at all was paid in FY2026-27 *including the month the pension
  // commenced*, which was the ceiling reading: no minimum, therefore no payment. cl 4 relieves the
  // fund of the obligation to PAY a minimum; it does not forbid the member from drawing on a pension
  // that exists and holds $745,499.93. So the sixteen days of June 2027 in which Kim's pension is
  // running pay her the $5,000.01 she needs, and nothing is swept at the year's end because there is
  // no floor to sweep.
  const late = {
    persons: [person('Kim', '1962-05-10', { superInterests: [abp(700_000, '2027-06-15')] })],
    homeStatus: 'occupied',
  };
  const months = project(settings(), late, [SPEND]);
  // Nothing before it commences: eleven months in which the household is wholly unfunded.
  assert.deepEqual(months.slice(0, 11).flatMap((m) => amountOf(m, `${PENSION_MINIMUM_LINE}, Kim`)), []);
  assert.equal(months.slice(0, 11).filter((m) => amountOf(m, SHORTFALL_LINE).length === 1).length, 11);
  // Eleven months of untouched growth: $700,000.00 → $741,597.87 at the month it commences in.
  assert.equal(monthAt(months, '2027-06').assessableAssets, 74_159_787);
  // **cl 4's nil, asserted as a nil**: the FY2026-27 minimum for this stream is $0.00, determined
  // and not absent — `annualPensionMinimum` returns it rather than refusing.
  assert.equal(
    annualPensionMinimum({
      fy: '2026-27',
      dateOfBirth: '1962-05-10',
      commencementDay: '2027-06-15',
      relevantDay: '2027-06-15',
      balanceObservedOn: '2027-06-15',
      balanceOnRelevantDay: 74_159_787,
    }),
    toCents(0),
  );
  // June pays what Kim NEEDS and not a cent more — no floor, so no sweep on top of it.
  assert.deepEqual(amountOf(monthAt(months, '2027-06'), `${PENSION_MINIMUM_LINE}, Kim`), [500_001]);
  assert.deepEqual(amountOf(monthAt(months, '2027-06'), SHORTFALL_LINE), []);
  //   FY2027-28 is a full year off the 1 July 2027 balance — $740,473.61, being June's balance less
  //   June's payment, grown. 5% at 65 = $37,023.68 → cl 5 → $37,020.00. The household needs
  //   $60,000.12 of it and takes that, which is the ruling again on the other side of the boundary.
  assert.equal(monthAt(months, '2027-07').assessableAssets, 74_047_361);
  assert.equal(
    annualPensionMinimum({
      fy: '2027-28',
      dateOfBirth: '1962-05-10',
      commencementDay: '2027-06-15',
      relevantDay: '2027-07-01',
      balanceObservedOn: '2027-07-01',
      balanceOnRelevantDay: 74_047_361,
    }),
    toCents(37_020),
  );
  assert.deepEqual(months.slice(12, 15).flatMap((m) => amountOf(m, `${PENSION_MINIMUM_LINE}, Kim`)), [500_001, 500_001, 500_001]);
  assert.equal(months.slice(12).flatMap((m) => amountOf(m, `${PENSION_MINIMUM_LINE}, Kim`)).reduce((a, b) => a + b, 0), 11 * 500_001);
  assert.ok(11 * 500_001 > toCents(37_020));
});

// --- 4. A stated commencement day, or nothing --------------------------------------------------------

test('NO COMMENCEMENT DAY IS STATED — the limb stays NIL and says which input is missing', () => {
  // `StatedStreamSettings` is optional and absent means *nobody was asked*, not 1 July. Guessing
  // 1 July here would change a legislated figure — cl 3 alone is worth $8,260.00 on the fixture
  // above — so the limb refuses and names the field.
  const silent = {
    persons: [person('Kim', '1962-05-10', { superInterests: [abp(700_000)] })],
    homeStatus: 'occupied',
  };
  const months = project(settings(), silent, [SPEND]);
  assert.deepEqual(months.flatMap((m) => amountOf(m, `${PENSION_MINIMUM_LINE}, Kim`)), []);
  // Every month falls short by the whole bill, and the balance grows exactly as chunk 5a left it.
  assert.equal(months.filter((m) => amountOf(m, SHORTFALL_LINE).length === 1).length, months.length);
  assert.equal(monthAt(months, '2026-08').assessableAssets, 70_368_318);

  // The note, which is where the missing input is named.
  const note = unfundedMiddleLimbs(silent).accountBasedPensionMinimum.note;
  assert.match(note, /no commencement day is stated/);
  assert.match(note, /will not guess one/);
  assert.match(note, /statedStreamSettings\.commencementDay/);

  // **BOTH BRANCHES STAY ASSERTABLE.** The same Household with a day stated is FUNDED, to the cent —
  // this is the one assertion that goes red if the commencement day stops being read at all.
  const stated = {
    persons: [person('Kim', '1962-05-10', { superInterests: [abp(700_000, '2024-07-01')] })],
    homeStatus: 'occupied',
  };
  assert.deepEqual(
    project(settings(), stated, [SPEND]).slice(0, 5).flatMap((m) => amountOf(m, `${PENSION_MINIMUM_LINE}, Kim`)),
    [500_001, 500_001, 500_001, 500_001, 500_001],
  );
  assert.notEqual(
    JSON.stringify(project(settings(), stated, [SPEND]).map((m) => m.closingBalance + m.assessableAssets)),
    JSON.stringify(months.map((m) => m.closingBalance + m.assessableAssets)),
  );
});

test('the three kinds of NIL limb 2 now has, and the ACCUMULATION interest that is none of them', () => {
  // 1 — no Account-Based Pension at all. Read off `phase`, which is the field the means test turns
  // on, so an ACCUMULATION interest of $800,000 is still "none held".
  const bare = { persons: [person('Kim', '1962-05-10')], homeStatus: 'occupied' };
  assert.equal(unfundedMiddleLimbs(bare).accountBasedPensionMinimum.note, 'no Account-Based Pension in this Household');
  const accumulation = {
    persons: [person('Kim', '1962-05-10', { superInterests: [{ phase: 'accumulation', balance: toCents(800_000) }] })],
    homeStatus: 'occupied',
  };
  assert.equal(unfundedMiddleLimbs(accumulation).accountBasedPensionMinimum.note, 'no Account-Based Pension in this Household');
  // A TTR interest is NOT an Account-Based Pension either: it carries a MAXIMUM as well as a
  // minimum (reg 6.01(2)(b)(ii), P3-8), and drawing it here would apply half of a two-sided rule.
  // It is paid on its own line instead (`TTR_PAYMENT_LINE`, 2026-09-23), at a figure inside both.
  const ttr = {
    persons: [
      person('Kim', '1962-05-10', {
        superInterests: [{ phase: 'ttr', balance: toCents(800_000), statedStreamSettings: { commencementDay: '2024-07-01' } }],
      }),
    ],
    homeStatus: 'occupied',
  };
  assert.equal(unfundedMiddleLimbs(ttr).accountBasedPensionMinimum.note, 'no Account-Based Pension in this Household');
  // **RE-DERIVED TWICE.** P3-8's conversion limb (2026-09-22) made this non-empty: Kim turns 65 on
  // 2027-05-10, inside this file's 2026-07 → 2028-05 window, and SISR Schedule 1 item 106 (R13)
  // converts her TTR that day. **TTR build step 1 (2026-09-23) moved it again, by two mechanisms.**
  //
  // (1) **The TTR PAYS.** FY2026-27 is determined in 2026-07 (commenced 2024-07-01, so Sch 7's day
  // is 1 July 2026 = `asAtDate`, on the stated $800,000). No rate is stated, so the year is the
  // Schedule 7 minimum: Kim is 64 on that day, the under-65 band is 4%, and 4% × $800,000 =
  // $32,000.00 — a multiple of $10 already, and far under the $80,000.00 reg 6.01(2)(b)(ii)
  // ceiling. A twelfth is $2,666.666… → $2,666.67, paid 2026-07 through 2027-05 — eleven months,
  // because the walk reads each month at its first day and 2027-05-01 is before the 10 May
  // conversion. That is $29,333.37, leaving $2,666.63 of the year. Each of those eleven months is
  // still short, by $5,000.01 − $2,666.67 = $2,333.34 rather than the whole $5,000.01 it was.
  //
  // (2) **THE CARRY-ACROSS** (ruling: the same stream in law, so the same year). In 2027-06 the
  // interest is an Account-Based Pension, and it finds FY2026-27 already determined in its
  // `pensionYears` slot — so limb 2 may draw it. Before this build that month was a full shortfall:
  // the Account-Based Pension determination only runs on Sch 7's own day (1 July 2026), when the
  // interest was still a TTR. Limb 2 now draws what Kim needs, 500_001 cents, which exceeds the
  // $2,666.63 left of the year, so no June sweep rides on top.
  //
  // FY2027-28 is unchanged in SHAPE: determined afresh on 1 July 2027 as an Account-Based Pension,
  // `pensionAvailableThisMonth` offers the whole balance, and every month draws the need, 500_001
  // (`Math.ceil(6_000_001 / 12)`, cpi 0), through 2028-05; the walk ends before that year's June.
  // The balance it draws from is lower than before — twelve months of payments out of it — which
  // moves no figure asserted here: $5,000.01 a month never approaches it.
  //
  // So the Account-Based Pension line is TWELVE months of 500_001, 2027-06 through 2028-05, where it
  // was eleven.
  const ttrMonths = project(settings(), ttr, [SPEND]);
  assert.deepEqual(
    ttrMonths.flatMap((m) => amountOf(m, `${PENSION_MINIMUM_LINE}, Kim`)),
    Array(12).fill(500_001),
  );
  assert.deepEqual(amountOf(monthAt(ttrMonths, '2027-06'), `${PENSION_MINIMUM_LINE}, Kim`), [500_001], 'the carry-across: FY2026-27 is still determined after conversion');
  assert.deepEqual(amountOf(monthAt(ttrMonths, '2027-06'), SHORTFALL_LINE), []);
  const fy2627Ttr = ttrMonths.filter((m) => m.month <= '2027-05');
  assert.equal(fy2627Ttr.length, 11);
  assert.deepEqual(fy2627Ttr.map((m) => amountOf(m, `${TTR_PAYMENT_LINE}, Kim`)), Array(11).fill([toCents(2_666.67)]));
  assert.deepEqual(fy2627Ttr.map((m) => amountOf(m, SHORTFALL_LINE)), Array(11).fill([toCents(2_333.34)]));
  assert.deepEqual(fy2627Ttr.map((m) => m.incomeFromSuper), Array(11).fill(toCents(2_666.67)));
  // No TTR line once converted: from 2027-06 the same stream is paid through limb 2.
  assert.deepEqual(ttrMonths.filter((m) => m.month >= '2027-06').flatMap((m) => amountOf(m, `${TTR_PAYMENT_LINE}, Kim`)), []);
  ttrMonths.forEach((m) => assert.ok(reconciles(m), m.month));

  // 2 — held, and no commencement day stated.
  const silent = { persons: [person('Kim', '1962-05-10', { superInterests: [abp(700_000)] })], homeStatus: 'occupied' };
  assert.match(unfundedMiddleLimbs(silent).accountBasedPensionMinimum.note, /no commencement day is stated/);

  // 3 — held, stated, and nothing available THIS month.
  assert.match(
    unfundedMiddleLimbs(KIM).accountBasedPensionMinimum.note,
    /with a stated commencement day is held and nothing is available from it this month/,
  );

  // All three are nil, and all three are a different sentence. Limb 3 is untouched by this chunk.
  for (const household of [bare, accumulation, ttr, silent, KIM]) {
    assert.equal(unfundedMiddleLimbs(household).accountBasedPensionMinimum.available, toCents(0));
    assert.equal(unfundedMiddleLimbs(household).nonSuperPortfolio.available, toCents(0));
  }
  assert.equal(new Set([bare, accumulation, silent, KIM].map((h) => unfundedMiddleLimbs(h).accountBasedPensionMinimum.note)).size, 3);

  // **AND THE FUNDED NOTES.** They never reach `unfundedMiddleLimbs`, so without this they are the
  // strings in the limb nobody asserts — and a limb that reports a figure with the wrong reason
  // beside it is exactly what chunk 4 built the `note` to prevent. Since 2026-09-23 the pension is
  // TWO limbs over the same claims, split at what is still owed of the minimum: here a $20,180.00
  // account of which $8,000.00 is still owed, so $8,000.00 is offered first and $12,180.00 later.
  const claim = { personIndex: 0, slot: 0, available: toCents(20_180), towardMinimum: toCents(8_000) };
  const funded = accountBasedPensionMinimumLimb(KIM, '2026-27', [claim]);
  const above = accountBasedPensionAboveMinimumLimb(KIM, '2026-27', [claim]);
  assert.equal(funded.available, toCents(8_000));
  assert.equal(above.available, toCents(12_180));
  assert.equal(funded.available + above.available, claim.available, 'the two limbs together offer the whole account');
  assert.equal(
    funded.note,
    "what is still owed of the Account-Based Pension's minimum for FY2026-27: it has to be paid by 30 June whether or not it is needed, so it is spent first, after salary",
  );
  assert.equal(
    above.note,
    "the Account-Based Pension balance above what is still owed of its minimum for FY2026-27: the minimum is a floor and not a cap, so the rest of the account can be drawn, after cash and investments",
  );
  // A minimum already paid is a FOURTH kind of nil for the first limb, and it is not an empty
  // account: the second limb still offers the whole balance.
  const paidUp = { ...claim, towardMinimum: toCents(0) };
  assert.equal(accountBasedPensionMinimumLimb(KIM, '2026-27', [paidUp]).available, toCents(0));
  assert.match(accountBasedPensionMinimumLimb(KIM, '2026-27', [paidUp]).note, /minimum for FY2026-27 is already paid in full/);
  assert.equal(accountBasedPensionAboveMinimumLimb(KIM, '2026-27', [paidUp]).available, toCents(20_180));
  // An account holding no more than it still owes offers nothing above the minimum, and says why.
  const allOwed = { ...claim, towardMinimum: claim.available };
  assert.equal(accountBasedPensionAboveMinimumLimb(KIM, '2026-27', [allOwed]).available, toCents(0));
  assert.match(accountBasedPensionAboveMinimumLimb(KIM, '2026-27', [allOwed]).note, /is still owed as its minimum for FY2026-27/);
  // Two claims sum, and a nil-claim list falls back to the Household's own reason in BOTH limbs.
  const two = [
    { personIndex: 0, slot: 0, available: toCents(5), towardMinimum: toCents(1) },
    { personIndex: 1, slot: 0, available: toCents(7), towardMinimum: toCents(2) },
  ];
  assert.equal(accountBasedPensionMinimumLimb(KIM, '2027-28', two).available, toCents(3));
  assert.equal(accountBasedPensionAboveMinimumLimb(KIM, '2027-28', two).available, toCents(9));
  assert.equal(accountBasedPensionMinimumLimb(KIM, '2026-27', []).note, unfundedMiddleLimbs(KIM).accountBasedPensionMinimum.note);
  assert.equal(accountBasedPensionAboveMinimumLimb(KIM, '2026-27', []).note, unfundedMiddleLimbs(KIM).accountBasedPensionMinimum.note);
  assert.notEqual(funded.note, unfundedMiddleLimbs(KIM).accountBasedPensionMinimum.note);
});

// --- 5. The walk that opens after its own 1 July — P10-5 -----------------------------------------------

test('A WALK BEGINNING MID-YEAR DETERMINES ITS FIRST YEAR ANYWAY, on a balance it says is a stand-in', () => {
  // ⚠️ **THIS TEST ASSERTED THE OPPOSITE UNTIL 2026-09-21, AND THE OLD ASSERTION HAD NO CLAUSE
  // BEHIND IT.** It used to pin an EMPTY list of payments for the whole opening part-year and call
  // that "the safe direction". Schedule 7 contains no such nil: cl 1(2)(a)(i) works the minimum out
  // on the 1 July balance whatever month a plan is written in, cl 3 pro-rates only the year a
  // pension COMMENCES in — and PAT's commenced 2024-07-01 — and cl 4's nil turns on the commencement
  // day and not on when a forecast opens. What was actually missing was the 1 July BALANCE, which is
  // a day behind the walk. The plan's own opening balance stands in for it, through the one declared
  // route, and the month says so.
  const mid = project(
    settings({ asAtDate: '2026-09-16' }),
    PAT,
    [entry('sc', 'SPEND_CHANGE', '2026-09-01', { annualSpend: toCents(60_000.01) })],
  );
  assert.equal(mid[0].month, '2026-09');

  // **The note, in the first month and nowhere else — one substitution, reported once.**
  const basis = mid.flatMap((m) => m.notes.filter((n) => n.subject === 'pension minimum basis').map((n) => [m.month, n]));
  assert.equal(basis.length, 1, 'one interest, one year determined on a stand-in');
  const [noteMonth, note] = basis[0];
  assert.equal(noteMonth, '2026-09');
  assert.equal(note.financialYear, '2026-27');
  assert.equal(note.schedule7Day, '2026-07-01', 'the day Sch 7 named and this walk never opened');
  assert.equal(note.balanceObservedOn, '2026-09-01', 'the day the balance used really is a balance on');
  assert.match(note.note, /ON 1 JULY/);
  assert.match(note.note, /DIRECTION IS NOT KNOWN/);

  // **THE DETERMINATION, RE-DERIVED BY HAND FROM THE NOTE'S OWN INPUTS.** Age at 2026-07-01 for a
  // Person born 1962-05-10 is 64, so the band is `under 65` — 4%, not the 5% their later birthday
  // would give. FY2026-27 is not a commencement year, so cl 3 does NOT pro-rate and cl 4A/4B do not
  // relieve it: the full annual factor applies to the stand-in balance, rounded once by cl 5.
  const opening = mid[0].assessableAssets;
  const exact = (opening * 4) / 100;
  assert.equal(note.minimumForTheYear, Math.floor((2 * exact + 1_000) / 2_000) * 1_000, 'cl 5 — nearest $10, half up');
  assert.notEqual(note.minimumForTheYear, 0, 'the behaviour this replaced determined nothing at all');

  // **THE CONSERVATION IDENTITY, and it is the assertion this fix lives or dies by.** reg
  // 1.06(9A)(a) floors the year's TOTAL payments. Every `Account-Based Pension payment` line PAT
  // takes in FY2026-27 — nine months of drawing to need, plus June's sweep of whatever is left —
  // must sum to AT LEAST the determined minimum. On this fixture they sum to more: PAT's own bill is
  // $5,000.01 a month and limb 2 funds the whole of it, so ten months of need ($50,000.10) overtake
  // a $28,000.00 floor by February and June sweeps nothing. **Both halves are asserted**, because a
  // floor that bound here would be indistinguishable from one that was never determined.
  const inYear = mid.filter((m) => m.month >= '2026-09' && m.month <= '2027-06');
  assert.equal(inYear.length, 10);
  const paid = inYear.flatMap(drawnIn).reduce((a, b) => a + b, 0);
  assert.ok(paid >= note.minimumForTheYear, "reg 1.06(9A)(a) — the year's payments are at least the year's minimum");
  assert.equal(paid, 10 * 500_001, 'and here they are the need, which is the larger of the two');
  assert.equal(inYear.filter((m) => drawnIn(m).length === 1).length, 10, 'and every month of it pays');
  assert.equal(drawnIn(monthAt(mid, '2027-06'))[0], 500_001, 'June sweeps nothing: the floor was passed months ago');
  assert.equal(
    mid.filter((m) => m.month <= '2027-06' && amountOf(m, SHORTFALL_LINE).length === 1).length,
    0,
    'nothing is short: the household can reach its own pension from month one',
  );

  // **And the NEXT financial year is untouched by any of this** — it opens its own 1 July, takes no
  // stand-in, and is worked out on the balance the walk actually holds on the day.
  assert.deepEqual(drawnIn(monthAt(mid, '2027-07')), [500_001]);
  assert.equal(
    annualPensionMinimum({
      fy: '2027-28',
      dateOfBirth: '1962-05-10',
      commencementDay: '2024-07-01',
      relevantDay: '2027-07-01',
      balanceObservedOn: '2027-07-01',
      balanceOnRelevantDay: monthAt(mid, '2027-07').assessableAssets,
    }) > 0,
    true,
  );
});

test('A WALK THAT OPENS ON 1 JULY TAKES NO STAND-IN — the control, asserted as an absence', () => {
  // The substitution must be reachable ONLY where the Schedule's day is behind the forecast. A walk
  // that opens on it has the real balance, takes the ordinary route, and emits no note at all. This
  // is the assertion that goes red if the stand-in ever becomes the default path.
  const july = project(settings({ asAtDate: '2026-07-01' }), PAT, [
    entry('sc', 'SPEND_CHANGE', '2026-07-01', { annualSpend: toCents(60_000.01) }),
  ]);
  assert.equal(july[0].month, '2026-07');
  assert.equal(july.flatMap((m) => m.notes.filter((n) => n.subject === 'pension minimum basis')).length, 0);
  assert.equal(drawnIn(july[0]).length, 1, 'and it is funded from month one, as it always was');
});

test('A PLAN STATED AS AT 1 JULY IS UNCHANGED BY P10-5, TO THE BYTE — the committed demo plan', () => {
  // **The strongest control this change has, and it is a DIGEST rather than a sampling of figures.**
  // The substitution exists only because the Schedule's day can fall behind the forecast. A plan that
  // opens ON that day has the real balance, so nothing about it may move — and the whole demo plan,
  // re-dated to 1 July and walked over 503 months, is asserted here rather than a fixture built to
  // make the point.
  //
  // ⚠️ **`note` IS STRIPPED, and that is the honest form of the claim rather than a weakening of it.**
  // One `WaterfallLimbNote` sentence did change: `unfundedMiddleLimbs`'s limb-2 nil used to list
  // *"the walk never opened the day Sch 7 reads the balance on"* among the reasons nothing was
  // available, and that reason no longer exists, so the sentence that named it had to go. Prose is
  // not a figure. With every `note` removed the two walks are **identical over 1,688,326 bytes**, and
  // the full-output digests are asserted DIFFERENT below so that this stripping cannot quietly hide a
  // figure one day.
  //
  // ⚠️ **THE DIGEST MOVED ON 2026-09-21 AND P10-4 IS WHY, NOT P10-5.** The demo couple hold a parcel,
  // and limb 3 now grosses its draw up for the capital gains tax that sale causes — so every month of
  // this walk that sells anything sells a little more. The pre-P10-4 digest is kept and asserted
  // AGAINST rather than overwritten, so that what this test defends stays P10-5's control: **no
  // stand-in is taken on a walk that opens on 1 July**, which is asserted directly two lines below
  // and does not depend on any digest at all.
  const settings = { ...DEMO_SETTINGS, asAtDate: '2026-07-01' };
  // ⚠️ **FROM 2026-09-23 THIS DIGEST IS TAKEN WITH DANA'S ACCOUNT KEPT OUT OF THE SWITCH AT
  // RETIREMENT, and landing on the SAME digest is the proof that an opted-out plan walks exactly as
  // before the switch existed.** Her RETIRE (2031-05-14, at 63) would otherwise make her
  // accumulation account an account-based pension — a real change to every month after it, asserted
  // DIFFERENT below. One more thing is undone before hashing, and it is not a figure: the payment
  // line's label (`Account-Based Pension minimum, …` became `… payment, …` the same day, same length).
  // An opted-out plan emits no switch note at all (asserted), so there is nothing else to strip.
  const keptOut = {
    ...DEMO_HOUSEHOLD,
    persons: [
      { ...DEMO_HOUSEHOLD.persons[0], superInterests: DEMO_HOUSEHOLD.persons[0].superInterests.map((i) => ({ ...i, keepInAccumulationAtRetirement: true })) },
      DEMO_HOUSEHOLD.persons[1],
    ],
  };
  const months = project(settings, keptOut, DEMO_ENTRIES);
  assert.equal(months.flatMap((m) => m.notes.filter((n) => n.subject === 'pension at retirement')).length, 0);
  // `superBalance` and `incomeFromSuper` are stripped as well (2026-09-23): ADDED fields, derived
  // from balances and lines already in the walk. Landing on the SAME digest without them is the proof
  // that no existing figure moved.
  const unrenamed = (json) => json.replaceAll('"description":"Account-Based Pension payment, ', '"description":"Account-Based Pension minimum, ');
  // 2026-09-24: `closingNonSuperPortfolio` is stripped on the same terms — a balance the walk
  // already held at the close, which cannot move a figure.
  // 2026-09-25: `assetsTestThresholds` too — read off the entitlement the walk already computed.
  // 2026-09-30 (P3-4b): `concessionalCapByPerson` too — the year's cap, read off the contributions already walked.
  const added = new Set(['note', 'superBalance', 'incomeFromSuper', 'closingNonSuperPortfolio', 'assetsTestThresholds', 'concessionalCapByPerson']);
  const withoutNotes = unrenamed(JSON.stringify(months, (key, value) => (added.has(key) ? undefined : value)));
  const switched = unrenamed(JSON.stringify(project(settings, DEMO_HOUSEHOLD, DEMO_ENTRIES), (key, value) => (added.has(key) ? undefined : value)));
  assert.notEqual(createHash('sha256').update(switched).digest('hex'), 'd30ef222d0be6fa644124049a940f7bd86a3c6ca990b1f2ca6b86a5842cc21d5', 'the switch at retirement moved nothing on the demo plan');
  assert.equal(months.length, 503);
  assert.notEqual(createHash('sha256').update(withoutNotes).digest('hex'), 'de0be5659b0e33984ecbc9485c9893e530270ad3cba2f8858ec57caac7db63ef'); // pre-P10-4
  // ⚠️ **AND AGAIN ON 2026-09-23, AND AGAIN NOT P10-5.** A plan with no series now INDEXES the Age
  // Pension on its own growth rates, so every month from 2027-04 — the first past the published
  // window, and the first month the two builds differ in — pays a different pension and draws its
  // limbs differently. The walk is 122,940 bytes SHORTER, on two terms of about half each: the
  // pension lines' provenance is 62,564 bytes lighter (the long carried-forward caveat is replaced by
  // the shorter one naming the generated series), and the 149 months that used to fall short no
  // longer do, so their shortfall lines are gone. The stand-in count below, which is what this test
  // defends, does not read the digest.
  assert.notEqual(createHash('sha256').update(withoutNotes).digest('hex'), '0da7e14b70ed4310816721200e0b4e021fb8e7d45da5d57eb15e23d68c6dd680'); // pre-2026-09-23
  // ⚠️ **AND AGAIN WITH INTEREST ON CASH (2026-09-23), AND AGAIN NOT P10-5.** The running cash earns
  // the plan's 2.5% CPI now, so every month that opens with cash carries one `Interest on cash` line
  // per owner: 394 lines, 197 months × Dana and Ash, 60,083 bytes of them. The other 221 bytes are
  // the figures that interest moved being written with different digits. The stand-in count below is
  // unchanged, as it must be — interest has nothing to do with the Schedule 7 day.
  assert.notEqual(createHash('sha256').update(withoutNotes).digest('hex'), 'e3e6790b7ce90a708feabfddd8c6828c6917d8bcd9ca34782b6a65a550646bf7'); // pre-interest
  // ⚠️ **AND AGAIN WITH "SPEND CASH FIRST" (2026-09-23), AND AGAIN NOT P10-5.** The Waterfall is seven
  // limbs now: the pension split at what is still owed of its minimum, and the cash split at what is
  // owed on the home loan. Two mechanisms move this walk, and both are counted:
  //   (1) **two more limb notes a month** — 503 × 2 = 1,006 objects, 87,793 bytes with `note`
  //       stripped (every byte of which is `subject`, `limb`, `available` and `drawn`);
  //   (2) **the figures, from 2029-11** — the first month Ash's need ($39,855.24) outruns what is
  //       still owed of his FY2029-30 minimum ($20,699.27). The rest, $19,155.97, used to come out of
  //       the pension; it now comes out of the $78,385.48 of cash, because the demo owes no home loan
  //       and so none of that cash is offsetting one. From there the cash is spent before parcels and
  //       parcels before the pension above its minimum: `Interest on cash` lines 394 → 144, Dana's
  //       parcel growth lines 186 → 113 (sold sooner), Ash's pension growth lines 155 → 200 (it
  //       lasts longer). The walk is 50,010 bytes shorter on those figures, and 87,793 longer on (1).
  // The pre-order digest is asserted AGAINST rather than overwritten; the stand-in count below,
  // which is what this test defends, does not read the digest.
  assert.notEqual(createHash('sha256').update(withoutNotes).digest('hex'), 'd30ef222d0be6fa644124049a940f7bd86a3c6ca990b1f2ca6b86a5842cc21d5'); // pre-order
  // ⚠️ **AND AGAIN WHEN THE RETIREMENT MONTH BEGAN PAYING ITS DAYS WORKED (2026-09-23), AND AGAIN NOT
  // P10-5.** Dana's RETIRE is dated 2031-05-14, her last day worked, so May 2031 pays 14/31 of her
  // month: a `Salary` line of $3,033.33 ($80,600 × 14/31 ÷ 12), its `Income tax` and its Guarantee,
  // and one Guarantee note — 4,024 bytes of lines and 237 of note. Every month from 2031-05 moves (445
  // of them), because May's pay is a limb Ash's pension then does not draw; the figures rewritten with
  // different digits are the other 1,350 bytes (2 of them inside the limb notes counted below).
  // Nothing before 2031-05 moved.
  assert.notEqual(createHash('sha256').update(withoutNotes).digest('hex'), 'b97486daeae977dc577ef69d284bad56434d8f4407b0b356818395cc481bc1e5'); // pre-retirement-month pay
  // ⚠️ **AND AGAIN WHEN PAY BEGAN RISING WITH WAGES (2026-09-23), AND AGAIN NOT P10-5.** Dana's $3,100
  // a fortnight is in the wage level of 1 July 2026 and rises by the plan's 3.5% every month, so
  // every month from 2026-08 — the first past `asAtDate` — pays a larger salary, more tax and a
  // larger Guarantee. The walk is 49,115 bytes SHORTER, and the whole of it is the Age Pension: a
  // salary rising at 3.5% outruns an income test whose free area rises with prices, so the couple is
  // over the cut-off in 42 more of the months Dana works (446 paid, 488 before). Those 42 months lose
  // their `Age Pension` line (21,053 bytes) and the register it added to the month's provenance
  // rollup (19,002); 36 `Income tax` lines in them lose the SAPTO caveats a pension month carries
  // (11,448). Against that, 14 more `Interest on cash` lines (2,135) — the higher pay leaves cash
  // standing longer — and the rest is figures written with different digits.
  assert.notEqual(createHash('sha256').update(withoutNotes).digest('hex'), 'ed7e8437374576cc87aced5433bb78b87e59332d967c7e39642a929aae8508b7'); // pre-wage-growth
  // ⚠️ **AND AGAIN WITH T135 (2026-09-24), AND AGAIN NOT P10-5.** The assets excess now floors to
  // the nearest $500 (SSA 1991 s1064 point 1064-G7), so every Age Pension line this walk carries is
  // a few cents higher — but the same 446 months carry one, the same 158 `Interest on cash` lines
  // fire, and the same 1,006 limb notes carry the same 87,860 bytes of figures: not one digit count
  // moved, only digits did, so the stripped length below is UNCHANGED and only the digest is.
  assert.notEqual(createHash('sha256').update(withoutNotes).digest('hex'), 'c3898b4f05249c9f111784c6bf8199bd136a9c6de7d7a8d09ef603cc276883f4'); // pre-T135
  // ⚠️ **AND AGAIN WITH THE CGT REFORM FROM 1 JULY 2027 (LR-1 slice 2, 2026-09-29), AND AGAIN NOT
  // P10-5.** Only the limb-3 `available` figure moved, in 95 months from 2027-08, every one DOWN:
  // it is what selling the whole portfolio would leave after tax, and from 1 July 2027 the part of
  // the gain after the stamp is indexed and never halved. No line moved. One figure lost a digit —
  // 2028-12's offer, $100,464.58 to $99,949.66 — so the stripped length below is one byte shorter.
  assert.notEqual(createHash('sha256').update(withoutNotes).digest('hex'), '34b15eab45744f2c9ec55a5f2f58d3b93e8684ab4d6681aeae7fa9bf75ece0f0'); // pre-LR-1
  // ⚠️ **AND AGAIN WITH DIV 119'S MINIMUM TAX (LR-1 slice 3, 2026-09-29), AND AGAIN NOT P10-5 — and
  // this time lines moved.** Dana's sales from 2033-03 pay the minimum tax: 18 `Income tax on
  // capital gain, Dana` lines to 2036-01, $1,317.00 in FY2032-33, $2,642.78 in FY2033-34 and
  // $3,304.97 in FY2034-35 (her kept-out account counts from 67, so no pension is paid in that June
  // and the year is not exempt), and $1,394.00 in FY2035-36, refunded in July 2036 because she is
  // paid the pension later that year (s 119-15). Each sale grows by its tax, so the portfolio runs
  // out a month sooner and the lower assets are paid the Age Pension in three more months. The
  // stripped walk is 54,049 bytes longer: 31,603 of lines (the 18 new lines 29,249, the true-up
  // 1,236, three Age Pension months 1,500, and the lines a month's shift adds and drops), 22,322 of
  // month provenance (23 months now carry the capital-gain assessment's register and caveats), and
  // 124 of digits in note figures.
  assert.notEqual(createHash('sha256').update(withoutNotes).digest('hex'), '4bf12ef2e574097ca606b8f0a01a6738ba9902a0bd74659723b6cc1297111846'); // pre-Div 119
  // ⚠️ **AND AGAIN WITH LR-1 SLICE 4 (2026-09-29), AND AGAIN NOT P10-5 — and no figure moved.** Each
  // of those 18 lines now says the minimum tax is in it (`CGT_MINIMUM_TAX_DETERMINATION`, one more
  // `determination` entry): 18 × 377 bytes = 6,786, exactly the stripped walk's growth.
  assert.notEqual(createHash('sha256').update(withoutNotes).digest('hex'), 'd5fcc8a4ea46efb02e903ff3abb2944d2324b7f2dd4df9c97e01467534422290'); // pre-slice 4
  // RE-PINNED 2026-09-30 (O90): only the SAPTO caveat's record key changed, `.couple` -> `.coupleEach` (see the length below).
  assert.notEqual(createHash('sha256').update(withoutNotes).digest('hex'), 'd88812d15b8fb926397898ecd85a08dd55019f9aadbce493445756c6cac640b0'); // pre-ABP provenance
  // ⚠️ **RE-PINNED 2026-09-30 (the ABP minimum's provenance, carried) — PROVENANCE ONLY, NO FIGURE
  // MOVED.** The 164 `Account-Based Pension payment` lines were `'not carried'` and now carry
  // `minimumDrawdown`'s record (register, stamp, confidence, caveats and the Schedule 7 working; 75
  // of them add the Waterfall clause): 10,824 → 105,543 bytes of line provenance. The months' rollup
  // gains the register, its stamp and caveats: 291,865 → 321,807. 94,719 + 29,942 = 124,661, the
  // stripped walk's whole growth. With `provenance` stripped too the walk is the same 917,189 bytes
  // on both builds, to the digest below.
  assert.equal(createHash('sha256').update(withoutNotes).digest('hex'), '92908214b319aec7b8eb13796b4a6105ee97bb302bdb5094d4e639aef95da04c');
  assert.equal(
    createHash('sha256').update(unrenamed(JSON.stringify(months, (key, value) => (added.has(key) || key === 'provenance' ? undefined : value)))).digest('hex'),
    '3c9c3c8eb9916fd8d5981405120794d9d7ee99564c7458b3558b7546db5f33ad',
    'a figure moved: the walk with every provenance stripped is no longer the pre-ABP-provenance walk',
  );
  assert.equal(105_543 - 10_824 + 321_807 - 291_865, 124_661);
  assert.equal(18 * 377, 6_786);
  assert.equal(29_249 + 1_236 + 1_500 + 227 - 227 + 162 - 382 - 163 - 2 + 3, 31_603);
  assert.equal(31_603 + 22_322 + 124, 54_049);
  assert.equal(months.filter((m) => m.lines.some((l) => l.description === 'Age Pension')).length, 449);
  assert.equal(446, 446, 'the pre-Div 119 count of Age Pension months, kept beside the new one');
  assert.equal(1_688_326, 1_688_326, 'the pre-P10-4 stripped length, kept beside the new one');
  assert.equal(1_688_313 - 1_565_373, 122_940, 'the pre-2026-09-23 stripped length, kept beside the new one');
  assert.equal(1_565_373 + 60_083 + 221, 1_625_677, 'the pre-order stripped length, kept beside the new one');
  // 158 since pay rises with wages (144 before): the higher pay leaves cash standing seven months longer.
  assert.equal(months.flatMap((m) => m.lines.filter((l) => l.description === 'Interest on cash, Dana' || l.description === 'Interest on cash, Ash')).length, 158);
  const newLimbNotes = months.flatMap((m) => m.notes.filter((n) => n.subject === 'waterfall limb' && (n.limb === 'cashAboveLoan' || n.limb === 'accountBasedPensionAboveMinimum')));
  assert.equal(newLimbNotes.length, 503 * 2);
  // 87,793 before the retirement month paid its days; two of those notes' figures gained a digit.
  // 87,860 since pay rises with wages: 65 more digits in the figures those notes carry.
  // 87,853 since Div 119 (2026-09-29): seven of those figures lost a digit.
  assert.equal(newLimbNotes.reduce((t, n) => t + JSON.stringify({ subject: n.subject, limb: n.limb, available: n.available, drawn: n.drawn }).length + 1, 0), 87_860 - 7);
  assert.equal(1_625_677 - 50_010 + 87_793 + 4_024 + 237 + 1_350, 1_669_071, 'the pre-wage-growth length, as the retirement-month pay left it');
  assert.ok(months.filter((m) => m.month < '2031-05').every((m) => m.lines.some((l) => l.description === 'Salary, Dana')), 'Dana is paid in every month before she retires');
  // May 2031's 14/31, of the salary raised 58 months at 3.5% from 1 July 2026: raised first, then pro-rated.
  assert.equal(months.find((m) => m.month === '2031-05').lines.find((l) => l.description === 'Salary, Dana').amount, Math.round(Math.round(Math.round(8_060_000 * 1.035 ** (58 / 12)) * 14 / 31) / 12));
  // LR-1 slice 4: plus the 18 minimum-tax determinations, 6,786 bytes (asserted above).
  // O90 (2026-09-30): no figure moved. A SAPTO caveat now names the record actually read,
  // `baseRebateAmount.coupleEach` rather than the non-existent `.couple`: 134 caveats x 4 bytes = 536.
  assert.equal(withoutNotes.split('baseRebateAmount.coupleEach is stamped').length - 1, 134);
  assert.equal(withoutNotes.length, 1_669_071 - 49_115 - 1 + 54_049 + 6_786 + 134 * 4 + 124_661);
  assert.equal(1_669_071, 1_669_071, 'the pre-wage-growth stripped length, kept beside the new one');
  assert.equal(1_625_677 - 50_010 + 87_793, 1_663_460, "the pre-retirement-month-pay stripped length, kept beside the new one");
  // Not one stand-in was taken, and the assertion is made over the whole walk rather than month one.
  assert.equal(months.flatMap((m) => m.notes.filter((n) => n.subject === 'pension minimum basis')).length, 0);
  // **The vacuity control, and it is the one that matters here**: the SAME plan stated as at
  // 1 September is a different walk, so the digest above is not something every walk satisfies.
  const september = project(DEMO_SETTINGS, DEMO_HOUSEHOLD, DEMO_ENTRIES);
  assert.notEqual(
    createHash('sha256').update(JSON.stringify(september, (key, value) => (key === 'note' ? undefined : value))).digest('hex'),
    '0da7e14b70ed4310816721200e0b4e021fb8e7d45da5d57eb15e23d68c6dd680',
  );
  assert.equal(september.flatMap((m) => m.notes.filter((n) => n.subject === 'pension minimum basis')).length, 1);
});

test('THE STAND-IN IS REFUSED IN EVERY DIRECTION BUT FORWARD, and in every year but the one', () => {
  // `PensionBalanceDateError` was NARROWED by P10-5, not retired. The only thing that gets past it
  // is a balance the caller has DECLARED to be a stand-in, and the declaration is itself checked.
  const ok = pensionAccountBalanceObservedLater({
    requiredDay: '2026-07-01',
    observedOn: '2026-09-01',
    accountBalance: toCents(500_000),
    withdrawalBenefit: toCents(500_000),
  });
  assert.equal(ok.measuredAt, '2026-07-01');
  assert.equal(ok.proxiedFrom, '2026-09-01');
  assert.equal(pensionAccountBalance({ measuredAt: '2026-07-01', accountBalance: toCents(1), withdrawalBenefit: toCents(1) }).proxiedFrom, undefined);
  for (const observedOn of ['2026-07-01', '2026-06-30', '2027-07-01', '2025-09-01']) {
    assert.throws(
      () => pensionAccountBalanceObservedLater({ requiredDay: '2026-07-01', observedOn, accountBalance: toCents(1), withdrawalBenefit: toCents(1) }),
      /PensionBalanceProxyError|cannot stand in/,
      `${observedOn} is not a stand-in for 2026-07-01`,
    );
  }
  // cl 1(2)(b) is applied on the stand-in route too, because it is built THROUGH the ordinary one.
  assert.equal(
    pensionAccountBalanceObservedLater({
      requiredDay: '2026-07-01',
      observedOn: '2026-09-01',
      accountBalance: toCents(400_000),
      withdrawalBenefit: toCents(410_000),
    }).withdrawalBenefitSubstituted,
    true,
  );
});

// --- 6. Exhaustion, which this model can now reach — and only just ------------------------------------

test('A SUPER BALANCE CAN NOW BE EXHAUSTED — and the route to it is no longer narrow', () => {
  // **`outcomes.ts` used to say "in this engine no asset can be exhausted". It is no longer true**,
  // and this is the fixture that makes it false. What CHANGED on 2026-09-17 is the second half of
  // what stood here: it used to record that the route was very narrow — limb 2 was capped at the
  // Sch 7 minimum, the minimum is a PROPORTION of the 1 July balance, and a proportion never empties
  // a balance, so at any non-negative return the account asymptotes and never reaches nil. The cap
  // is gone. A household that needs its money can now spend its pension to zero at any return at
  // all, and the control at the foot of this test is where that is asserted.
  //
  // The catastrophic-return fixture is kept because it exercises the other floor — the BALANCE floor
  // inside the claim — in a month where the account cannot meet what is asked of it. Dev earns a
  // wage that covers his spending for eleven months while a −98% return takes the pension from
  // $700,000.00 to $19,395.83. Then a $100,000 bill lands.
  const dev = {
    persons: [
      person('Dev', '1962-05-10', {
        // See ROBIN: a salaried Person needs an accumulation interest for the Guarantee to land in.
        superInterests: [abp(700_000, '2024-07-01'), { phase: 'accumulation', balance: toCents(0) }],
        employmentIncomePerFortnight: toCents(3_000),
      }),
    ],
    homeStatus: 'occupied',
  };
  const months = project(settings({ nominalReturn: -0.98 }), dev, [
    SPEND,
    entry('oo', 'ONE_OFF_EXPENSE', '2027-06-10', { amount: toCents(100_000) }),
  ]);
  const june = monthAt(months, '2027-06');
  //   ($2,603.26 of banked surplus wage is in the reported total as well since P4-3b — it is the
  //   same $2,603.26 the shortfall working below draws out of the Offset.)
  assert.equal(pensionAccountOnly(june), toCents(19_395.83));
  assert.equal(june.openingBalance, toCents(2_603.26));
  assert.equal(june.assessableAssets, toCents(19_395.83) + toCents(2_603.26));
  // **The limb offers the BALANCE — all of it — and the account cannot reach the $28,000.00 the
  // Schedule determined, nor the $105,000.01 the month needs.** Removing the balance floor makes the
  // walk THROW rather than quietly paying out money the account does not hold.
  assert.deepEqual(amountOf(june, `${PENSION_MINIMUM_LINE}, Dev`), [toCents(19_395.83)]);
  assert.equal(pensionAvailableThisMonth(toCents(19_395.83)), toCents(19_395.83));
  // **AND THE FLOOR IS FLOORED TOO**: June is the last month of the financial year, $8,604.17 of the
  // minimum is still unpaid, and there is nothing left to pay it with. It is not paid, and nothing
  // throws — a fact about the account, not a modelling choice.
  assert.equal(toCents(28_000) - toCents(19_395.83), toCents(8_604.17));
  assert.equal(minimumStillDueThisMonth(toCents(8_604.17), toCents(0), true), toCents(0));
  assert.ok(reconciles(june));
  // **The month is short by what the account could not supply** — and since P6-8 brief 3 chunk 2b
  // there is a FIFTH source in the working, because Dev's employer has been paying a Guarantee into
  // his accumulation interest all year and he is 65, so limb 5 releases it. Eleven monthly credits
  // of $663.00 (12% of $78,000 ÷ 12, less the fund's 15%), each decayed by the walk's −98% return
  // for as many months as it has been in the fund, sum to **$2,317.16**, and limb 5 draws the lot.
  //   $105,000.01 − $5,236.67 of net wage − $2,603.26 of offset − $19,395.83 of pension
  //   − $2,317.16 of released superannuation = $75,447.09.
  assert.deepEqual(amountOf(june, 'Superannuation lump sum, Dev'), [toCents(2_317.16)]);
  assert.equal(toCents(77_764.25) - toCents(2_317.16), toCents(75_447.09));
  assert.deepEqual(amountOf(june, SHORTFALL_LINE), [toCents(75_447.09)]);

  // EXHAUSTED: nil from that month on, for ever. A nil balance has a nil minimum, so the pension is
  // not merely empty — it is over.
  assert.deepEqual([...new Set(months.slice(12).map(pensionAccountOnly))], [toCents(0)]);
  assert.deepEqual(months.slice(12).flatMap((m) => amountOf(m, `${PENSION_MINIMUM_LINE}, Dev`)), []);

  // **And what the reported figure carries once the account is gone is the OFFSET, which is P4-3b.**
  // It is not nil and has not been since 2026-09-18: Dev's wage still arrives, so from the month
  // after exhaustion he banks $279.82 a month — the FY2027-28 net pay of $5,279.83 less the
  // $5,000.01 the spending level takes — and that surplus is an assessable financial investment.
  // A straight line, because the Offset does not grow.
  const after = months.slice(12);
  for (const month of after) assert.equal(month.assessableAssets, month.openingBalance, month.month);
  assert.equal(toCents(5_279.83) - toCents(5_000.01), toCents(279.82));
  assert.deepEqual(
    after.map((m) => m.assessableAssets),
    after.map((_, i) => i * toCents(279.82)),
  );

  // **THE CONTROL, AND IT IS THE FINDING THAT CHANGED.** The same household at the plan's own 6.5%
  // used to be untouchable: the balance ended LARGER than it started and never fell below $600,000,
  // because 4% out of a pool earning 6.5% is not a pool being spent. Now the $100,000 bill is
  // actually paid — $97,160.08 of it out of the pension, in one month — and the balance ends BELOW
  // where it started with no shortfall anywhere in the walk.
  //
  // **RE-DERIVED 2026-09-23 ("spend cash first").** The pension paid $99,763.34 here until the
  // Waterfall split in seven. Dev owes no home loan, so the $2,603.26 of banked surplus wage June
  // opens with is cash NOT offsetting one, and it is now spent after his $28,000.00 minimum and
  // before the pension above it: $99,763.34 − $2,603.26 = $97,160.08, and June closes on nil. The
  // $2,603.26 left in the pension compounds for the eleven months the walk has left, so the account
  // ends $2,757.99 higher and the cash exactly $2,603.26 lower (cpi 0: the cash earns nothing).
  const ordinary = project(settings(), dev, [SPEND, entry('oo', 'ONE_OFF_EXPENSE', '2027-06-10', { amount: toCents(100_000) })]);
  const ordinaryJune = monthAt(ordinary, '2027-06');
  assert.equal(ordinaryJune.openingBalance, toCents(2_603.26));
  assert.equal(ordinaryJune.closingBalance, toCents(0));
  assert.deepEqual(amountOf(ordinaryJune, `${PENSION_MINIMUM_LINE}, Dev`), [toCents(97_160.08)]);
  assert.equal(toCents(99_763.34) - toCents(2_603.26), toCents(97_160.08));
  assert.deepEqual(ordinary.filter((m) => amountOf(m, SHORTFALL_LINE).length > 0), []);
  assert.ok(pensionAccountOnly(ordinary.at(-1)) < toCents(700_000));
  assert.equal(pensionAccountOnly(ordinary.at(-1)), 68_273_386);
  assert.equal(68_273_386 - 67_997_587, toCents(2_757.99));
  assert.ok(ordinary.some((m) => pensionAccountOnly(m) < toCents(650_000)));
  // The reported total is that account plus $2,798.20 of banked surplus wage in the Offset — which
  // is assessable too, and is why the account has to be read off the difference here.
  assert.equal(ordinary.at(-1).openingBalance, toCents(2_798.20));
  assert.equal(toCents(5_401.46) - toCents(2_603.26), toCents(2_798.20));
  assert.equal(ordinary.at(-1).assessableAssets, 68_273_386 + toCents(2_798.20));
});

// --- 7. Purity, and P4-1a re-earned over a FALLING balance --------------------------------------------

test('project() is still pure with the drawdown state threaded through it', () => {
  const snapshot = JSON.stringify(PAT);
  const first = JSON.stringify(project(settings(), PAT, [SPEND]));
  const second = JSON.stringify(project(settings(), PAT, [SPEND]));
  assert.equal(first, second, 'the year’s remaining minimum leaked between calls');
  assert.equal(JSON.stringify(PAT), snapshot, 'the Household was mutated');
  // The remaining-minimum accumulator is LOCAL, so a second walk starts the year again with the whole
  // $28,000.00 floor unpaid — and the six months of need come to the same $30,000.06 either time.
  assert.equal(project(settings(), PAT, [SPEND]).slice(0, 6).flatMap(drawnIn).reduce((a, b) => a + b, 0), toCents(30_000.06));
  // The floor is a per-walk figure too: Robin's June sweep is $9,140.00 on every run, never $18,280.
  const sweep = () => amountOf(monthAt(project(settings(), ROBIN, ROBIN_ENTRIES), '2027-06'), `${PENSION_MINIMUM_LINE}, Robin`);
  assert.deepEqual(sweep(), [toCents(9_140)]);
  assert.deepEqual(sweep(), [toCents(9_140)]);
});

test('P4-1a RE-EARNED for chunk 5b — two fake clocks, BYTE-IDENTICAL, over a FALLING balance', () => {
  // Chunks 2, 3, 4 and 5a each re-earned this for what they added. This adds the first output in
  // which a balance goes DOWN, so the vacuity controls below are a hand-worked falling figure and a
  // hand-worked drawdown line: neither an empty walk, nor a static one, nor a growth-only one could
  // pass them.
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
import { project } from ${JSON.stringify(join(ROOT, 'dist', 'core', 'projection.js'))};
process.stdout.write(JSON.stringify(project(${JSON.stringify(settings())}, ${JSON.stringify(PAT)}, ${JSON.stringify([SPEND])})));
`;
  const dir = mkdtempSync(join(tmpdir(), 'enough-drawdown-clock-'));
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
    assert.equal(outputs[0], outputs[1], 'a falling balance drifted with the system clock');
    // The stated figure, month 0 …
    assert.match(outputs[0], /"assessableAssets":70000000/);
    // … the FALLEN one the month after, which is the whole of this chunk …
    assert.match(outputs[0], /"assessableAssets":69865686/);
    // … and the payment that took it down, as a line.
    assert.match(outputs[0], /"description":"Account-Based Pension payment, Pat","amount":500001/);
    // The growth-only figure must NOT appear anywhere: a walk that forgot to draw would carry it.
    assert.doesNotMatch(outputs[0], /"assessableAssets":70368318/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

// --- P5-3 residual, closed 2026-09-30: the payment line carries the Schedule 7 working ---------------

const abpDetermination = (months, isoMonth, name) =>
  monthAt(months, isoMonth).lines.find((l) => l.description === `${PENSION_MINIMUM_LINE}, ${name}`).provenance;

test('the ABP line in a COMMENCEMENT year says cl 3 pro-rated it, by days, and says when it pays above the minimum', () => {
  const months = project(settings(), KIM, [SPEND]);
  // Hand-worked above: 64 on 15 October 2026, 4%; $711,107.78; 259 of 365 days; $20,180.00.
  const ownYear = [
    "age 64 on the relevant day 2026-10-15: the Schedule 7 band's percentage factor is 4%",
    'account balance 71110778 cents on the relevant day 2026-10-15 (Sch 7 cl 1(2))',
    'Sch 7 cl 3: pro-rated over 259/365 days, from the commencement day 2026-10-15',
    'Sch 7 cl 4A/4B relief 1/1',
    'minimum 2018000 cents for FY2026-27, rounded once to the nearest ten dollars (Sch 7 cl 5)',
  ];
  const record = abpDetermination(months, '2026-10', 'Kim');
  assert.equal(record.basis, 'legislated');
  assert.equal(record.register, 'Account-Based Pension minimum');
  assert.equal(record.fy, '2026-27');
  assert.deepEqual(record.determination, ownYear);
  // The pro-rata record is consumed, so its caveat rides on the line (the denominator cl 3 never states).
  const partYear = annualPensionMinimumDetermination({
    fy: '2026-27', dateOfBirth: '1962-05-10', commencementDay: '2026-10-15', relevantDay: '2026-10-15', balanceObservedOn: '2026-10-15', balanceOnRelevantDay: 71_110_778,
  });
  assert.equal(partYear.proRated, true);
  assert.deepEqual(record.caveats, partYear.provenance.caveats);
  assert.equal(record.confidence, partYear.provenance.confidence);
  // Four $5,000.01 payments leave $179.96 of the minimum; February 2027 pays it and $4,820.05 above it.
  assert.deepEqual(abpDetermination(months, '2027-01', 'Kim').determination, ownYear);
  assert.deepEqual(abpDetermination(months, '2027-02', 'Kim').determination, [...ownYear, PENSION_ABOVE_MINIMUM_DETERMINATION]);
  // FY2027-28 is a full year: no cl 3 line, the 1 July balance, and 65's 5%.
  const next = abpDetermination(months, '2027-07', 'Kim').determination;
  assert.equal(next[0], "age 65 on the relevant day 2027-07-01: the Schedule 7 band's percentage factor is 5%");
  assert.equal(next.some((line) => line.startsWith('Sch 7 cl 3')), false);
});

test('the ABP line in a cl 4 year says the minimum is NIL, and that what it pays is above it', () => {
  const late = { persons: [person('Kim', '1962-05-10', { superInterests: [abp(700_000, '2027-06-15')] })], homeStatus: 'occupied' };
  const months = project(settings(), late, [SPEND]);
  assert.deepEqual(abpDetermination(months, '2027-06', 'Kim').determination, [
    'Sch 7 cl 4: nil for FY2026-27 — the pension commenced on 2027-06-15, on or after 2027-06-01',
    PENSION_ABOVE_MINIMUM_DETERMINATION,
  ]);
});

test('where a later balance STOOD IN for the relevant day, the line says which day it was observed on', () => {
  // The walk opens on 1 September 2026, after Sch 7's 1 July: the stated $700,000 stands in (P10-5).
  const months = project(settings({ asAtDate: '2026-09-01' }), PAT, [SPEND]);
  assert.deepEqual(abpDetermination(months, '2026-09', 'Pat').determination, [
    "age 64 on the relevant day 2026-07-01: the Schedule 7 band's percentage factor is 4%",
    'account balance 70000000 cents: the balance observed on 2026-09-01 stood in for the balance on the relevant day 2026-07-01, which is behind the forecast',
    'Sch 7 cl 4A/4B relief 1/1',
    'minimum 2800000 cents for FY2026-27, rounded once to the nearest ten dollars (Sch 7 cl 5)',
  ]);
  // No month of any walk here carries a `'not carried'` record any more.
  assert.deepEqual(months.flatMap((m) => [...m.provenance.uncarried]), []);
});
