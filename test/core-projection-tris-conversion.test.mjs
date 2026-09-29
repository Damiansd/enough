// P3-8's conversion limb — LIVE WIRING (2026-09-22, GATE: GO). `SuperInterest.phase` actually
// flips inside a live `project()` walk, driven by the two already-built mechanisms this file
// exercises separately: a user-stated `TRIS_EARLY_CONVERSION` entry, and R13's automatic-65
// backstop (`trisConversionDayUnderItem106`) for a household that stated nothing.
//
// **What this file is NOT for.** It does not re-test `trisEarlyConversion.ts` or
// `trisConversionDay.ts` themselves — both are already unit-tested (`test/core-tris-early-
// conversion.test.mjs`, `test/core-super-phase.test.mjs`) and this build does not edit either
// file. It does not re-test the door (`checkTrisEarlyConversionTargets`'s 65th-birthday boundary is
// already pinned in `test/core-parse-plan.test.mjs` §3b-tris). What it DOES test is the thing that
// did not exist before this build: a live `project()` walk that actually reads a conversion day and
// changes what a month reports because of it.
import test from 'node:test';
import assert from 'node:assert/strict';

import { toCents } from '../dist/core/money.js';
import { PENSION_MINIMUM_LINE, SHORTFALL_LINE, project } from '../dist/core/projection.js';

const person = (name, dateOfBirth, superInterests) => ({
  name,
  dateOfBirth,
  superInterests,
  parcels: [],
  employmentIncomePerFortnight: toCents(0),
  workBonusBalance: toCents(0),
});

const settings = (asAtDate, planningHorizonAge) => ({
  asAtDate,
  planningHorizonAge,
  // `cpi: 0` — O85's algebraic control (register, ruled 2026-09-21): the stated spending level is
  // real, and at nil CPI every hand-worked figure in this file is the figure it was worked as.
  economicSeries: { cpi: 0, pblci: 0.025, awote: 0.035, mtawe: 0.035 },
  deemingRates: { lower: 0.0175, upper: 0.0375 },
  nominalReturn: 0.065,
});

const entry = (id, owner, type, date, params) => ({ id, date, owner, type, params, enabled: true, createdAt: '2026-06-01' });
const spendEntry = (annualSpend) => entry('sc', 'household', 'SPEND_CHANGE', '2026-07-01', { annualSpend: toCents(annualSpend) });
const monthAt = (months, isoMonth) => months.find((m) => m.month === isoMonth);
const amountOf = (month, description) => month.lines.filter((l) => l.description === description).map((l) => l.amount);
const shortfallIn = (month) => amountOf(month, SHORTFALL_LINE).length === 1;

// --- 1. THE EARLY OVERRIDE, LIVE ------------------------------------------------------------------

test('a validating TRIS_EARLY_CONVERSION entry flips the interest live, from its own stated day', () => {
  // Nat, 55 at the walk's start — nowhere near Preservation Age (60) or the automatic release age
  // (65), so nothing here can be the R13 backstop by accident. The interest's stated commencement
  // day is the SAME day as the early conversion, which keeps this fixture about the conversion
  // mechanism alone: Sch 7's determination fires the month it converts, with no earlier
  // determination window to skip (that separate wrinkle is §2 of
  // `test/core-projection-pension-drawdown.test.mjs`'s Kim fixture, re-derived for P3-8).
  const household = {
    persons: [
      person('Nat', '1971-03-01', [
        { phase: 'ttr', balance: toCents(2_000_000), statedStreamSettings: { commencementDay: '2027-01-01' } },
      ]),
    ],
    homeStatus: 'occupied',
  };
  const convert = entry('conv', 'personA', 'TRIS_EARLY_CONVERSION', '2027-01-01', { interestIndex: 0 });
  const months = project(settings('2026-07-01', 56), household, [spendEntry(24_000), convert]);

  // Nat turns 56 on 2027-03-01, so the walk is 2026-07 → 2027-03 inclusive: nine months.
  assert.equal(months.length, 9);

  // **BEFORE conversion (2026-07 → 2026-12, six months): the TTR interest pays nothing, because
  // the stream has not COMMENCED** (its commencement day is the conversion day). Nat has no other
  // asset and no wage, so every one of these months is a full shortfall and limb 2 offers nothing.
  // A commenced, unconverted TTR pays its own line from 2026-09-23 (`TTR_PAYMENT_LINE`,
  // `core-projection-ttr-payment.test.mjs`) — and at Nat's 55 it would be refused, below 60.
  for (const isoMonth of ['2026-07', '2026-08', '2026-09', '2026-10', '2026-11', '2026-12']) {
    const month = monthAt(months, isoMonth);
    assert.deepEqual(amountOf(month, `${PENSION_MINIMUM_LINE}, Nat`), [], isoMonth);
    assert.ok(shortfallIn(month), `${isoMonth} should be short — the interest has not converted yet`);
  }

  // **FROM the stated day (2027-01-01), the interest IS an Account-Based Pension.** `SPEND_CHANGE`
  // states $24,000.00/year, `monthlySpendFromAnnual` is `Math.ceil(2_400_000 / 12)` = 200,000 cents
  // exactly, and cpi 0 never moves it. Nat holds nothing else, so the whole target is drawn from
  // this interest every month, uncapped ($2,000,000 dwarfs three months of $200,000), and the
  // walk ends (2027-03) before FY2026-27's own June close, so no year-end sweep is in play.
  for (const isoMonth of ['2027-01', '2027-02', '2027-03']) {
    const month = monthAt(months, isoMonth);
    assert.deepEqual(amountOf(month, `${PENSION_MINIMUM_LINE}, Nat`), [toCents(2_000)], isoMonth);
    assert.equal(shortfallIn(month), false, `${isoMonth} should be fully funded`);
  }
});

// --- 2. THE AUTOMATIC BACKSTOP, LIVE --------------------------------------------------------------

test('a SILENT household converts automatically at 65 (R13), live, with no entry at all', () => {
  // Robin's date of birth is chosen so the 65th birthday itself falls on the FIRST of a month —
  // `date` inside the walk is always a month's first day (`firstDayOf`), so a birthday mid-month
  // would only become visible the FOLLOWING month (the walk's own "a month is read at its own
  // beginning" convention, the same one `gainfulEmploymentAsAt` uses). Aligning the birthday to a
  // month-start keeps this fixture's arithmetic about the backstop alone.
  const dateOfBirth = '1971-09-01';
  const commencementDay = '2036-09-01'; // coincides with the automatic conversion day — no
  // determination-window wrinkle to hand-work here; that is §1 above's and Kim's fixture's job.
  const household = {
    persons: [person('Robin', dateOfBirth, [{ phase: 'ttr', balance: toCents(1_000_000), statedStreamSettings: { commencementDay } }])],
    homeStatus: 'occupied',
  };
  const months = project(settings('2036-07-01', 65), household, [spendEntry(24_000)]);

  // Robin turns 65 on 2036-09-01 exactly, so the walk (`planningHorizonAge: 65`) is 2036-07 → 09.
  assert.equal(months.length, 3);
  for (const isoMonth of ['2036-07', '2036-08']) {
    const month = monthAt(months, isoMonth);
    assert.deepEqual(amountOf(month, `${PENSION_MINIMUM_LINE}, Robin`), [], isoMonth);
    assert.ok(shortfallIn(month), `${isoMonth} should be short — no entry, and Robin has not turned 65 yet`);
  }
  // The birthday month itself: `date` is 2036-09-01, which is `>=` the conversion day — R13's own
  // backstop, wired, with nothing stated. $24,000.00/year ÷ 12 = 200,000 cents.
  const birthdayMonth = monthAt(months, '2036-09');
  assert.deepEqual(amountOf(birthdayMonth, `${PENSION_MINIMUM_LINE}, Robin`), [toCents(2_000)]);
  assert.equal(shortfallIn(birthdayMonth), false);
});

// --- 3. TWO INTERESTS OF ONE PERSON RESOLVE INDEPENDENTLY -----------------------------------------

test('two TTR interests of the SAME Person, each with their own early entry, do not collide', () => {
  // The conversion day is resolved per (personIndex, slot), directly off `entries` — deliberately
  // NOT through the `standing`/`carried` levels machinery `RETIRE` and `WORK_PATTERN_CHANGE` use,
  // which dedupes a pre-dated level by `type \0 owner` alone. Were this resolved through THAT
  // machinery, two pre-dated `TRIS_EARLY_CONVERSION` entries for the SAME Person (different
  // interests) would collide on that key and only the later-dated one would survive — silently
  // dropping the other interest's conversion, the P4-12 shape this build refuses. Both entries here
  // are pre-dated (before `asAtDate`), which is exactly the case that would trigger the collision if
  // it existed.
  //
  // **The proof is in the SPLIT, not merely in "fully funded".** Each interest's balance
  // ($30,000) is deliberately SMALLER than the month's own need ($50,000), so no single interest
  // can cover it alone — limb 2 draws each claim in the Household's own stated order
  // (`pensionClaims`), slot 0 first: `min(available, outstanding)`. If slot 1's conversion had been
  // silently dropped by a collision, it would still read as a TTR — not drawn by limb 2 — and
  // the month would be $20,000 short instead of funded, with only ONE line rather than two. (Since
  // 2026-09-23 a commenced, unconverted TTR PAYS — and Robin is 55, so a dropped conversion would
  // now surface as `TtrPaymentBelowTaxFreeAgeError` out of `project()`, which fails this test too.)
  const household = {
    persons: [
      person('Robin', '1971-03-01', [
        { phase: 'ttr', balance: toCents(30_000), statedStreamSettings: { commencementDay: '2020-01-01' } },
        { phase: 'ttr', balance: toCents(30_000), statedStreamSettings: { commencementDay: '2020-01-01' } },
      ]),
    ],
    homeStatus: 'occupied',
  };
  const convertFirst = entry('c0', 'personA', 'TRIS_EARLY_CONVERSION', '2020-06-01', { interestIndex: 0 });
  const convertSecond = entry('c1', 'personA', 'TRIS_EARLY_CONVERSION', '2021-06-01', { interestIndex: 1 });
  const months = project(settings('2026-07-01', 56), household, [spendEntry(600_000), convertFirst, convertSecond]);

  // Both interests are ALREADY converted by `asAtDate` (2026-07-01), each on its OWN stated day —
  // both pre-dated, both level facts in force from month 0, both sharing commencementDay
  // 2020-01-01 — well before EITHER conversion day, so `schedule7RelevantDay(FY2026-27,
  // '2020-01-01')` returns 1 July of FY2026-27 for both, which IS `asAtDate` itself here: the
  // determination fires for both in this walk's very first month, with no window to miss.
  //
  // $600,000.00/year ÷ 12 = 50,000.00 exactly. Slot 0 offers its whole $30,000 balance first,
  // leaving $20,000 outstanding; slot 1 offers the rest out of its own $30,000. Two lines, in the
  // Household's own stated order, summing to the whole target.
  const month = monthAt(months, '2026-07');
  assert.deepEqual(amountOf(month, `${PENSION_MINIMUM_LINE}, Robin`), [toCents(30_000), toCents(20_000)]);
  assert.equal(shortfallIn(month), false);
});

// --- 4. THE TWO TRIGGERS CANNOT COLLIDE ------------------------------------------------------------

test('THE DOOR is what protects the 65th-birthday boundary — the walk adds no redundant check', () => {
  // `test/core-parse-plan.test.mjs`'s §3b-tris already pins that `parsePlan` REFUSES a stated day on
  // or after Dana's 65th birthday (`checkTrisEarlyConversionTargets`, `>=`, 2033-05-14). This is the
  // OTHER half: a direct `project()` caller who bypasses `parsePlan` entirely — every fixture in
  // this suite, and the two triggers' own precedent for what a direct caller is on their own for
  // (`LUMP_SUM_FROM_SUPER`'s owner check, replicated in the walk; its balance-sufficiency check,
  // NOT replicated). If the walk held its own copy of the 65th-birthday check, this would throw. It
  // does not: the early entry's date is trusted exactly as stated, however late.
  const dateOfBirth = '1968-05-14'; // Dana's own date of birth, `core-parse-plan.test.mjs` §3b-tris.
  const automaticDay = '2033-05-14';
  const household = (commencementDay) => ({
    persons: [person('Dana', dateOfBirth, [{ phase: 'ttr', balance: toCents(400_000), statedStreamSettings: { commencementDay } }])],
    homeStatus: 'occupied',
  });

  // Dated ON the automatic day itself — refused at the door (`>=`), not re-checked here.
  const onTheDay = entry('c', 'personA', 'TRIS_EARLY_CONVERSION', automaticDay, { interestIndex: 0 });
  assert.doesNotThrow(() => project(settings('2033-01-01', 66), household(automaticDay), [spendEntry(24_000), onTheDay]));

  // Dated well AFTER it — also refused at the door, also not re-checked here. The walk simply takes
  // the interest as converting on the (nonsensical, were a real user to state it) later day; the
  // automatic backstop is never even computed for this interest, because the early override — late
  // as it is — already resolved `conversionDay` before the backstop loop runs.
  const lateDay = '2034-01-01';
  const wellAfter = entry('c', 'personA', 'TRIS_EARLY_CONVERSION', lateDay, { interestIndex: 0 });
  let months;
  assert.doesNotThrow(() => {
    months = project(settings('2033-01-01', 67), household(lateDay), [spendEntry(24_000), wellAfter]);
  });

  // **Not vacuous, and stronger than "does not throw": it converts on the STATED late day, exactly,
  // and neither one month early nor never.** The commencement day coincides with the stated day
  // (§1/§2's own technique), so the determination fires the same month conversion does — the walk
  // did not silently prefer the automatic day (2033-05) or refuse to convert at all.
  assert.deepEqual(amountOf(monthAt(months, '2033-12'), `${PENSION_MINIMUM_LINE}, Dana`), []);
  assert.ok(shortfallIn(monthAt(months, '2033-12')), 'still a TTR in the month before the stated late day');
  assert.deepEqual(amountOf(monthAt(months, '2034-01'), `${PENSION_MINIMUM_LINE}, Dana`), [toCents(2_000)]);
  assert.equal(shortfallIn(monthAt(months, '2034-01')), false, 'converted, on its own stated day');
});
