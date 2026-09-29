// Phase 9 (P9-2a) — `HEAS_DRAW` PER PERSON: the age component is an annual step function (T36) and
// the $10,000 security floor is per Person on that Person's own share (T37), superseding slice 1's
// household-level simplification (commit c4de5a5, `docs/assumptions-register.md` T36/T37 rows).
//
// **How the expected figures below were built — `core-projection-aged-care.test.mjs`'s own
// methodology, unchanged.** This file's job is the WIRING, not a second proof of
// `data/assumptions/heas.ts`'s own arithmetic (`test/assumptions-heas.test.mjs` already pins
// `heasAccrueFortnight`, `heasFortnightlyDraw`, `personMaximumLoanAvailable` and `heasAgeComponent`
// against Services Australia's own worked examples and the legislated table). So every expected
// figure here is produced by calling those SAME already-verified functions directly — composed
// with household facts and, for the age-step tests, with `ageAt`/`firstDayOf` read fresh every
// month exactly as `project()` now does — never re-derived by hand arithmetic.
//
// Every Household here is synthetic: round numbers, no salary, no super, `cashInterestRate: 0` so
// cash never drifts between the day it is stated and the day it is drawn.
import test from 'node:test';
import assert from 'node:assert/strict';

import { toCents, mulCents } from '../dist/core/money.js';
import { project, AGE_PENSION_LINE, HEAS_ADVANCE_LINE, HEAS_DRAW_LINE, HEAS_INTEREST_LINE, fortnightsInWalkMonth, firstDayOf } from '../dist/core/projection.js';
import { parsePlan } from '../dist/core/parsePlan.js';
import { agePensionEntitlement } from '../dist/core/agePension.js';
import { ageAt } from '../dist/core/household.js';
import { heasAccrueFortnight, heasAgeComponent, heasFortnightlyCap, heasFortnightlyDraw, heasFortnightlyDrawDuringAdvancePeriod, personMaximumLoanAvailable } from '../dist/data/assumptions/heas.js';
import { inflateStated } from '../dist/core/priceLevel.js';
import { DEMO_PLAN } from '../dist/app/demoHousehold.js';

const person = (name, dateOfBirth) => ({
  name,
  dateOfBirth,
  superInterests: [],
  parcels: [],
  employmentIncomePerFortnight: toCents(0),
  workBonusBalance: toCents(0),
});

/** A fourteen-month walk, 2026-09 through 2027-10 — long enough for a full 26-fortnight year. */
const SETTINGS = {
  asAtDate: '2026-09-16',
  planningHorizonAge: 90,
  economicSeries: { cpi: 0.025, pblci: 0.025, awote: 0.035, mtawe: 0.035 },
  deemingRates: { lower: 0.0175, upper: 0.0375 },
  nominalReturn: 0.065,
  cashInterestRate: 0,
};

const entry = (id, type, date, params = {}, owner = 'personA') => ({
  id, date, owner, type, params, enabled: true, createdAt: '2026-06-01',
});

const lineSum = (month, description) => month.lines.filter((line) => line.description === description).reduce((sum, line) => sum + line.amount, 0);

/** As `lineSum`, but scoped to the one entry that stated the figure — `couple, each has their own` needs this: two entries, same description, the same month. */
const lineSumByEntry = (month, description, entryId) =>
  month.lines
    .filter((line) => line.description === description && line.attribution.basis === 'entries' && line.attribution.entryIds.includes(entryId))
    .reduce((sum, line) => sum + line.amount, 0);

const withEntries = (household, entries) => ({
  ...DEMO_PLAN,
  household,
  entries,
  scenarios: DEMO_PLAN.scenarios.map((scenario) => ({ ...scenario, entryIds: entries.map((e) => e.id) })),
});

// Both persons are 69 at the entry date (2026-10-01), well past Age Pension age (67), and both born
// in the SAME year, so neither is "the younger one" by more than a fortnight — the younger-partner
// age component (T36) is unambiguous (Blair, born two weeks after Alex) without a birthday landing
// inside the test window (next birthday June 2027).
const NIL_PENSION_COUPLE = {
  persons: [person('Alex', '1957-06-01'), person('Blair', '1957-06-15')],
  homeStatus: 'occupied',
  openingOffsetBalance: toCents(5_000_000), // far above the assets cut-off: entitlement is nil
};

const PART_PENSIONER_COUPLE = {
  persons: [person('Cam', '1957-06-01'), person('Drew', '1957-06-15')],
  homeStatus: 'occupied',
  openingOffsetBalance: toCents(800_000), // above the free area, below the cut-off: a reduced rate
};

const validHeas = entry('heas', 'HEAS_DRAW', '2026-10-01', { securityValue: toCents(2_000_000), fortnightlyAmount: 'maximum' }, 'personA');

// --- The door -------------------------------------------------------------------------------------

test('door: owned by "household" is refused — HEAS is a loan PER PERSON (T37)', () => {
  const bad = { ...validHeas, owner: 'household' };
  assert.throws(() => parsePlan(withEntries(NIL_PENSION_COUPLE, [bad])), /the Home Equity Access Scheme is a loan PER PERSON/);
});

test('door: under Age Pension age at the start is refused', () => {
  const young = {
    persons: [person('Young', '1990-01-01')],
    homeStatus: 'occupied',
    openingOffsetBalance: toCents(500_000),
  };
  assert.throws(() => parsePlan(withEntries(young, [validHeas])), /nobody in this household has reached Age Pension age/);
});

test('door: not a homeowner is refused', () => {
  const renter = { ...NIL_PENSION_COUPLE, homeStatus: 'noHome' };
  assert.throws(() => parsePlan(withEntries(renter, [validHeas])), /a non-homeowner has no security to draw the Home Equity Access Scheme against/);
});

test('door: a second HEAS_DRAW entry for the SAME Person is refused', () => {
  const second = { ...validHeas, id: 'heas2' };
  assert.throws(() => parsePlan(withEntries(NIL_PENSION_COUPLE, [validHeas, second])), /is a SECOND HEAS_DRAW entry for/);
});

test('door: a second HEAS_DRAW entry for the OTHER Person is allowed — each has their own loan (T37)', () => {
  const forBlair = { ...validHeas, id: 'heas2', owner: 'personB' };
  assert.doesNotThrow(() => parsePlan(withEntries(NIL_PENSION_COUPLE, [validHeas, forBlair])));
});

test('door: a couple\'s two HEAS_DRAW entries disagreeing about securityValue are refused — they price two loans against the SAME home', () => {
  const forBlair = { ...validHeas, id: 'heas2', owner: 'personB', params: { ...validHeas.params, securityValue: toCents(1_000_000) } };
  assert.throws(() => parsePlan(withEntries(NIL_PENSION_COUPLE, [validHeas, forBlair])), /cannot disagree about what it is worth/);
});

test('door: a stated fortnightlyAmount over the absolute 150% ceiling on THIS Person\'s own share is refused', () => {
  const tooMuch = { ...validHeas, params: { ...validHeas.params, fortnightlyAmount: toCents(100_000) } };
  assert.throws(() => parsePlan(withEntries(NIL_PENSION_COUPLE, [tooMuch])), /the absolute ceiling at .* for .*'s own share is .* cents/);
});

test('door: a negative securityValue is refused', () => {
  const bad = { ...validHeas, params: { ...validHeas.params, securityValue: -1 } };
  assert.throws(() => parsePlan(withEntries(NIL_PENSION_COUPLE, [bad])), /security value cannot be negative/);
});

test('door: a nil or negative stated fortnightlyAmount is refused', () => {
  const bad = { ...validHeas, params: { ...validHeas.params, fortnightlyAmount: 0 } };
  assert.throws(() => parsePlan(withEntries(NIL_PENSION_COUPLE, [bad])), /a stated draw is more than nothing/);
});

test('door: a stopDate on or before the entry date is refused', () => {
  const bad = { ...validHeas, params: { ...validHeas.params, stopDate: '2026-10-01' } };
  assert.throws(() => parsePlan(withEntries(NIL_PENSION_COUPLE, [bad])), /a stream cannot stop before or in the fortnight it starts/);
});

test('door: a MORTGAGE_REFINANCE on or after the HEAS_DRAW voids the NNEG — refused, not warned (T35)', () => {
  const refinance = entry('refi', 'MORTGAGE_REFINANCE', '2026-10-01', { openingBalance: toCents(200_000), annualInterestRate: 0.06, monthlyRepayment: toCents(1_500) }, 'household');
  assert.throws(
    () => parsePlan(withEntries(NIL_PENSION_COUPLE, [validHeas, refinance])),
    /VOIDS the No Negative Equity Guarantee/,
  );
});

test('door: a MORTGAGE_REFINANCE strictly BEFORE the HEAS_DRAW is allowed — the loan had not started running yet', () => {
  const refinance = entry('refi', 'MORTGAGE_REFINANCE', '2026-09-01', { openingBalance: toCents(200_000), annualInterestRate: 0.06, monthlyRepayment: toCents(1_500) }, 'household');
  assert.doesNotThrow(() => parsePlan(withEntries(NIL_PENSION_COUPLE, [refinance, validHeas])));
});

test('door: a valid HEAS_DRAW parses whole and unchanged, owned by a Person', () => {
  const parsed = parsePlan(withEntries(NIL_PENSION_COUPLE, [validHeas]));
  assert.equal(parsed.entries.at(-1).owner, 'personA');
  assert.deepEqual(parsed.entries.at(-1).params, { securityValue: toCents(2_000_000), fortnightlyAmount: 'maximum' });
});

// --- The door: `advances` (P9-2b, T136) -----------------------------------------------------------

const heasWithAdvances = (advances, overrides = {}) => ({
  ...validHeas,
  params: { ...validHeas.params, advances, ...overrides },
});

test('door: an advance BEFORE the HEAS_DRAW starts is refused — must fall within the draw\'s own active span', () => {
  const bad = heasWithAdvances([{ date: '2026-09-01', amount: toCents(1_000) }]);
  assert.throws(() => parsePlan(withEntries(NIL_PENSION_COUPLE, [bad])), /must fall within the draw's own active span/);
});

test('door: an advance AFTER the HEAS_DRAW stops is refused', () => {
  const bad = heasWithAdvances([{ date: '2027-01-15', amount: toCents(1_000) }], { stopDate: '2026-12-01' });
  assert.throws(() => parsePlan(withEntries(NIL_PENSION_COUPLE, [bad])), /must fall within the draw's own active span/);
});

test('door: an advance ON the entry\'s own date is allowed — the span is inclusive at both ends', () => {
  const ok = heasWithAdvances([{ date: '2026-10-01', amount: toCents(1_000) }]);
  assert.doesNotThrow(() => parsePlan(withEntries(NIL_PENSION_COUPLE, [ok])));
});

test('door: a THIRD advance within 26 fortnights of the first is refused — at most 2 (SS Act s 1134A(2)(b))', () => {
  // MUTATION SENTINEL: if the window-count door check is ever dropped, this goes from throwing to
  // silently accepting a third advance in the same rolling window.
  const bad = heasWithAdvances([
    { date: '2026-10-01', amount: toCents(100) },
    { date: '2026-10-15', amount: toCents(100) },
    { date: '2026-10-29', amount: toCents(100) },
  ]);
  assert.throws(() => parsePlan(withEntries(NIL_PENSION_COUPLE, [bad])), /at most 2 advances are allowed in any rolling 26-fortnight window/);
});

test('door: file order does not matter — the window is worked out in DATE order, s 1133AA(1)\'s own terms', () => {
  const bad = heasWithAdvances([
    { date: '2026-10-29', amount: toCents(100) },
    { date: '2026-10-01', amount: toCents(100) },
    { date: '2026-10-15', amount: toCents(100) },
  ]);
  assert.throws(() => parsePlan(withEntries(NIL_PENSION_COUPLE, [bad])), /at most 2 advances are allowed in any rolling 26-fortnight window/);
});

test('door: the window ROLLS OVER — a third advance more than 26 fortnights after the first is allowed, and starts a fresh window', () => {
  const ok = heasWithAdvances([
    { date: '2026-10-01', amount: toCents(100) },
    { date: '2026-10-15', amount: toCents(100) },
    { date: '2027-10-15', amount: toCents(100) }, // well over 364 days after 2026-10-01
  ]);
  assert.doesNotThrow(() => parsePlan(withEntries(NIL_PENSION_COUPLE, [ok])));
});

test('door: an advance over 50% of the ANNUAL maximum payment rate is refused (T33, s 1134A(3)(a))', () => {
  const bad = heasWithAdvances([{ date: '2026-10-01', amount: toCents(10_000_000) }]);
  assert.throws(() => parsePlan(withEntries(NIL_PENSION_COUPLE, [bad])), /over the \d+-cent cap/);
});

test('door: a SECOND advance that brings the window TOTAL over the dollar cap is refused, even though each is fine alone', () => {
  const bad = heasWithAdvances([
    { date: '2026-10-01', amount: toCents(9_000) },
    { date: '2026-10-15', amount: toCents(9_000) },
  ]);
  assert.throws(() => parsePlan(withEntries(NIL_PENSION_COUPLE, [bad])), /over the \d+-cent cap/);
});

test('door: a nil or negative advance amount is refused', () => {
  const bad = heasWithAdvances([{ date: '2026-10-15', amount: 0 }]);
  assert.throws(() => parsePlan(withEntries(NIL_PENSION_COUPLE, [bad])), /an advance is more than nothing/);
});

test('door: a valid HEAS_DRAW with one advance parses whole and unchanged', () => {
  const withAdvance = heasWithAdvances([{ date: '2026-10-15', amount: toCents(10_000) }]);
  const parsed = parsePlan(withEntries(NIL_PENSION_COUPLE, [withAdvance]));
  assert.deepEqual(parsed.entries.at(-1).params.advances, [{ date: '2026-10-15', amount: toCents(10_000) }]);
});

// --- The walk: "maximum", nil pension — 150% of THIS Person's own maximum payment rate ------------

test('nil-pension couple at "maximum": one Person\'s own loan draws exactly 150% of THEIR OWN maximum payment rate (half the couple\'s combined rate), every fortnight', () => {
  const withHeas = project(SETTINGS, NIL_PENSION_COUPLE, [validHeas]);
  const october = withHeas.find((m) => m.month === '2026-10');

  // The control: this household's own entitlement, computed the SAME way the walk computes it —
  // confirms it really is nil, so "150% of the person's own rate" is not vacuously true.
  const entitlement = agePensionEntitlement({ household: NIL_PENSION_COUPLE, date: '2026-10-01', deemingRates: SETTINGS.deemingRates });
  assert.equal(entitlement.householdRatePerFortnight, 0);
  assert.equal(entitlement.perPersonRatePerFortnight, 0);

  // THIS Person's own maximum payment rate is HALF the couple's combined rate — the same halving
  // `entitlement.perPersonRatePerFortnight` already applies to what is actually received.
  const personMaximumPaymentRate = mulCents(entitlement.maximumPaymentRate, 0.5);
  const expectedPerFortnight = heasFortnightlyDraw(personMaximumPaymentRate, entitlement.perPersonRatePerFortnight);
  assert.equal(expectedPerFortnight, heasFortnightlyCap(personMaximumPaymentRate)); // nil received: the whole 150% cap
  // October is the entry's own month and the SECOND month of the walk (asAtDate 2026-09-16), which
  // `fortnightsInWalkMonth`'s own five-times-two run covers — two fortnights, not three.
  assert.equal(lineSum(october, HEAS_DRAW_LINE), expectedPerFortnight * 2);
});

// --- The walk: "maximum", a part-pensioner — the netted, REDUCED allowance, per Person -------------

test('part-pensioner couple at "maximum": one Person\'s own draw is 150% of THEIR OWN max rate LESS what THEY actually receive — reduced, not the full 150%', () => {
  const withHeas = project(SETTINGS, PART_PENSIONER_COUPLE, [validHeas]);
  const october = withHeas.find((m) => m.month === '2026-10');

  // **The entitlement a month is ASSESSED ON is what it OPENS with (P4-4's standing convention)** —
  // not the Household's stated day-0 figure, which September's own Age Pension payment has already
  // moved on by the time October's tick runs. So the control is built from October's own opening
  // balance, `october.openingBalance` (read off the SAME walk), never re-derived from day 0.
  const householdAtOctoberOpen = { ...PART_PENSIONER_COUPLE, openingOffsetBalance: october.openingBalance };
  const entitlement = agePensionEntitlement({ household: householdAtOctoberOpen, date: '2026-10-01', deemingRates: SETTINGS.deemingRates });
  // The control: a REDUCED but non-nil per-Person entitlement, so this is genuinely the
  // "part-pensioner" case and not a disguised copy of the nil-pension test above.
  assert.ok(entitlement.perPersonRatePerFortnight > 0, 'this household is not actually a part-pensioner');
  const personMaximumPaymentRate = mulCents(entitlement.maximumPaymentRate, 0.5);
  assert.ok(entitlement.perPersonRatePerFortnight < personMaximumPaymentRate);

  const expectedPerFortnight = heasFortnightlyDraw(personMaximumPaymentRate, entitlement.perPersonRatePerFortnight);
  assert.ok(expectedPerFortnight < heasFortnightlyCap(personMaximumPaymentRate), 'the reduced draw is not actually reduced');
  assert.equal(lineSum(october, HEAS_DRAW_LINE), expectedPerFortnight * 2);
});

// --- The walk: the debt after one year, to the cent -------------------------------------------------

test('the debt after 1 year (26 fortnights) is heasAccrueFortnight applied 26 times, to the cent — one Person\'s own entry, in a couple, drawing well under their own cap', () => {
  const stated = entry('heas', 'HEAS_DRAW', '2026-10-01', { securityValue: toCents(2_000_000), fortnightlyAmount: toCents(500) }, 'personA');
  const walked = project(SETTINGS, NIL_PENSION_COUPLE, [stated]);

  // 12 consecutive months from the entry's own month sum to EXACTLY 26 fortnights — any 12
  // consecutive months do, because `fortnightsInWalkMonth` telescopes on the integer 26
  // (`floor(x + 26) === floor(x) + 26`) — so 2026-10 through 2027-09 is one full HEAS year. Nowhere
  // near this Person's own capacity ($2,000,000 security, 50% share, age-69 component — six figures
  // of headroom), so the per-Person 50-50 split (T37) changes nothing about this replay.
  //
  // **A STATED `fortnightlyAmount` is in TODAY's money and raised to EACH MONTH (user ruling,
  // 2026-09-25) — `annualSpend`'s own footing, not the RAD/security's "fixed once at entry" one —
  // so the $500 draw itself rises through the year and the replay must re-raise it month by month,
  // never accrue a flat figure for the whole year.**
  const start = walked.findIndex((m) => m.month === '2026-10');
  let expected = toCents(0);
  for (let index = start; index < start + 12; index += 1) {
    const drawThisMonth = inflateStated(toCents(500), SETTINGS.economicSeries.cpi, SETTINGS.asAtDate, walked[index].month);
    for (let fortnight = 0; fortnight < fortnightsInWalkMonth(index); fortnight += 1) {
      expected = heasAccrueFortnight(expected, drawThisMonth);
    }
  }
  const closing = walked.find((m) => m.month === '2027-09');
  assert.equal(closing.heasDebt, expected);
});

// --- The walk: the capacity cap, single Person — unchanged by the per-Person split (100% share) ----

test('the cap reached: draws stop at the age component × security value, with a note — interest keeps compounding, not a silent stop', () => {
  // A single Person, exactly 67 (the qualifying age) at the entry date, with the SMALLEST non-nil
  // security value ($10,000 — floors to one $10,000 unit): capacity is one age component, a few
  // thousand dollars, reached within the first fortnight or two of a $2,000-a-fortnight draw. A
  // Person drawing ALONE takes the WHOLE security (`ownershipShare` 1, not 0.5) — T37's per-Person
  // split does not halve a lone Person's own home.
  const capped = {
    persons: [person('Sam', '1959-06-01')],
    homeStatus: 'occupied',
    openingOffsetBalance: toCents(50_000),
  };
  const stated = entry('heas', 'HEAS_DRAW', '2026-10-01', { securityValue: toCents(10_000), fortnightlyAmount: toCents(2_000) }, 'personA');
  const walked = project(SETTINGS, capped, [stated]);

  const capacity = personMaximumLoanAvailable(heasAgeComponent(67), toCents(10_000), 1);
  const capNotes = walked.flatMap((m) => m.notes).filter((note) => note.subject === 'HEAS capacity cap reached');
  assert.equal(capNotes.length, 1, 'no birthday falls in this window (next is 2027-06), so only one binding episode fires');
  assert.equal(capNotes[0].capacity, capacity);

  // **The exact replay, to the cent — the same clamp `project()` applies, composed from
  // `heasAccrueFortnight` (already pinned against Services Australia's own worked example) and
  // `fortnightsInWalkMonth` (already pinned in `core-projection-means-test-income.test.mjs`), never
  // re-derived.** October (walk index 1) is the entry's own month, TWO fortnights; November (index
  // 2) is the first month with NO room left at all.
  let debt = toCents(0);
  let octoberDraw = toCents(0);
  for (let fortnight = 0; fortnight < fortnightsInWalkMonth(1); fortnight += 1) {
    const room = Math.max(0, capacity - debt);
    const draw = Math.min(toCents(2_000), room);
    octoberDraw += draw;
    debt = heasAccrueFortnight(debt, draw);
  }
  const octoberDebt = debt;
  let novemberDraw = toCents(0);
  for (let fortnight = 0; fortnight < fortnightsInWalkMonth(2); fortnight += 1) {
    const room = Math.max(0, capacity - debt);
    const draw = Math.min(toCents(2_000), room);
    novemberDraw += draw;
    debt = heasAccrueFortnight(debt, draw);
  }
  const november = walked.find((m) => m.month === '2026-11');
  const october = walked.find((m) => m.month === '2026-10');
  assert.equal(lineSum(october, HEAS_DRAW_LINE), octoberDraw);
  assert.equal(october.heasDebt, octoberDebt);
  assert.equal(capNotes[0].debtAfter, octoberDebt);
  assert.ok(octoberDebt >= capacity, 'the cap note fired before the cap was actually reached');
  // November: no room left at all — every fortnight draws nil, and the debt is PURE interest on
  // October's close. Proves "interest keeps compounding, not a silent stop" to the cent, not just
  // in sign.
  assert.equal(lineSum(november, HEAS_DRAW_LINE), 0, 'a draw happened after the cap was reached');
  assert.ok(lineSum(november, HEAS_INTEREST_LINE) > 0, 'interest stopped compounding after the cap — it must not');
  assert.equal(november.heasDebt, debt);
});

// --- T36: the cap is an ANNUAL STEP FUNCTION — a birthday raises it, and a capped draw resumes -----

test('T36 — a birthday raises the capacity cap and a capped draw resumes; the note fires again on each fresh binding, not once for the whole walk', () => {
  // MUTATION SENTINEL for "the age is frozen at the entry's start": with the age fixed at entry
  // (slice 1's simplification), `capacity` never moves and this Person draws nothing from the first
  // binding onward — exactly ONE note, for the rest of the walk. The scenario below is chosen (by
  // replaying the SAME production functions `heas.ts`/`projection.ts` compose, not by guesswork —
  // see the replay loop below) so that recomputing the age component every month — the fix —
  // produces THREE separate binding episodes: the age 74→75 step (4.17%) is the one bracket in the
  // table that most clearly beats the interest rate's own fortnightly-compounded EFFECTIVE annual
  // rate (≈4.03%, `Math.pow(1 + 0.0395/26, 26) - 1`), so a birthday genuinely reopens more room than
  // a year of interest has consumed — most brackets (≈3.9-4.0%) do not, and stay permanently capped
  // once first bound, which is why `Sam`'s test above (no birthday in its window) is the control.
  const single = {
    persons: [person('Robin', '1951-11-01')], // 74 at entry, turns 75 one month later
    homeStatus: 'occupied',
    openingOffsetBalance: toCents(50_000),
  };
  const stated = entry('heas', 'HEAS_DRAW', '2026-10-01', { securityValue: toCents(50_000), fortnightlyAmount: toCents(100) }, 'personA');
  const walked = project(SETTINGS, single, [stated]);

  // The SAME replay methodology as the test above, run across the whole walk rather than two
  // months, and with the age component recomputed EVERY month from `ageAt` at that month's first
  // day — `project()`'s own T36 mechanism, composed here rather than re-derived by hand.
  //
  // **A STATED `fortnightlyAmount` is in TODAY's money and raised to EACH MONTH too (user ruling,
  // 2026-09-25) — so the desired draw itself grows through this decades-long walk, which moves WHEN
  // and how OFTEN the cap binds: two binding episodes now, not three, because a rising draw reaches
  // a birthday's reopened room sooner. The sentinel property this test exists for is unchanged —
  // freezing the age at entry would still give exactly ONE episode for the whole walk — so the
  // assertion below is "more than one", not the specific count, which is a fact about the CPI/age
  // interaction rather than about the age-freezing bug this test guards against.**
  let debt = toCents(0);
  let capped = false;
  const notes = [];
  const monthsByIndex = new Map(walked.map((m, index) => [index, m]));
  for (const [index, month] of monthsByIndex) {
    if (month.month < '2026-10') continue;
    const dob = single.persons[0].dateOfBirth;
    const capacity = personMaximumLoanAvailable(heasAgeComponent(ageAt(dob, firstDayOf(month.month))), toCents(50_000), 1);
    const desiredDraw = inflateStated(toCents(100), SETTINGS.economicSeries.cpi, SETTINGS.asAtDate, month.month);
    const fortnights = fortnightsInWalkMonth(index);
    let drawn = toCents(0);
    let clampedThisMonth = false;
    for (let fortnight = 0; fortnight < fortnights; fortnight += 1) {
      const room = Math.max(0, capacity - debt);
      const draw = Math.min(desiredDraw, room);
      if (draw < desiredDraw) clampedThisMonth = true;
      drawn += draw;
      debt = heasAccrueFortnight(debt, draw);
    }
    if (clampedThisMonth) {
      if (!capped) { capped = true; notes.push({ month: month.month, capacity, drawn, debt, desiredDraw }); }
    } else {
      capped = false;
    }
    assert.equal(lineSum(month, HEAS_DRAW_LINE), drawn, `${month.month}: the draw does not match the replay`);
    assert.equal(month.heasDebt, debt, `${month.month}: the debt does not match the replay`);
  }

  assert.ok(notes.length > 1, 'more than one binding episode: the age frozen at the start would give exactly one');
  const walkedNotes = walked.flatMap((m) => m.notes).filter((n) => n.subject === 'HEAS capacity cap reached');
  assert.equal(walkedNotes.length, notes.length);
  assert.deepEqual(walkedNotes.map((n) => n.capacity), notes.map((n) => n.capacity));
  assert.deepEqual(walkedNotes.map((n) => n.debtAfter), notes.map((n) => n.debt));

  // And the draw genuinely RESUMES in between: a month exists, after the first note and before the
  // second, where the full (now-inflated) desired draw is drawn in full — not merely "less than
  // nil" — proving a birthday reopened enough room to satisfy the WHOLE month's desired draw.
  const firstNoteIndex = walked.findIndex((m) => m.month === notes[0].month);
  const secondNoteIndex = walked.findIndex((m) => m.month === notes[1].month);
  const resumedMonth = walked.slice(firstNoteIndex + 1, secondNoteIndex).find((month) => {
    const index = walked.indexOf(month);
    const desiredDraw = inflateStated(toCents(100), SETTINGS.economicSeries.cpi, SETTINGS.asAtDate, month.month);
    return lineSum(month, HEAS_DRAW_LINE) === desiredDraw * fortnightsInWalkMonth(index);
  });
  assert.ok(resumedMonth !== undefined, 'no month between the two binding episodes drew the full desired amount — the birthday never actually reopened room');
});

// --- T37: a couple's two loans are INDEPENDENT — one Person's own cap does not touch the other's ---

test("T37 — a couple where each partner has their own cap and draw: one Person's loan binds, the other's does not, off the SAME shared security value", () => {
  // Same home, same $20,000 security, same 50-50 share and the SAME younger-partner age component
  // (both born 1957, no birthday in this window) — so both Persons' OWN capacity is numerically the
  // SAME figure (`personMaximumLoanAvailable(heasAgeComponent(69), $20,000, 0.5)`). What T37 asserts
  // is that the DEBTS are tracked separately even so: a large stated draw for one Person reaches it
  // while a small one for the other does not, and neither loan's own capacity or debt is affected by
  // the other's.
  const forAlex = entry('heas-alex', 'HEAS_DRAW', '2026-10-01', { securityValue: toCents(20_000), fortnightlyAmount: toCents(50) }, 'personA');
  const forBlair = entry('heas-blair', 'HEAS_DRAW', '2026-10-01', { securityValue: toCents(20_000), fortnightlyAmount: toCents(1_000) }, 'personB');
  const walked = project(SETTINGS, NIL_PENSION_COUPLE, [forAlex, forBlair]);

  // **`securityValue` is stated in TODAY's money too (user ruling, 2026-09-25) — raised to the
  // entry's own day, once, on `ENTER_CARE`'s `homeValue`-at-entry precedent.**
  const capacity = personMaximumLoanAvailable(heasAgeComponent(69), inflateStated(toCents(20_000), SETTINGS.economicSeries.cpi, SETTINGS.asAtDate, '2026-10-01'), 0.5);
  // A STATED `fortnightlyAmount` is in TODAY's money and raised to EACH MONTH (user ruling, 2026-09-25).
  const desiredDraw = (dollars, month) => inflateStated(toCents(dollars), SETTINGS.economicSeries.cpi, SETTINGS.asAtDate, month);

  // Alex's own $50-a-fortnight draw never comes near this capacity across the walk's first year
  // (it eventually does, on its OWN much later schedule, nothing to do with Blair's) — so within
  // this window it is never clamped, and no note in Alex's name is raised here.
  const notesForAlex = walked
    .filter((m) => m.month >= '2026-10' && m.month <= '2027-10')
    .flatMap((m) => m.notes)
    .filter((n) => n.subject === 'HEAS capacity cap reached' && n.entryId === 'heas-alex');
  assert.equal(notesForAlex.length, 0, "Blair's cap must not bind Alex's loan");

  // Blair's own $1,000-a-fortnight draw reaches this SAME capacity figure within a couple of
  // fortnights — a note IS raised in Blair's name, and Alex's own draw is entirely unaffected: the
  // October figures are exactly what each Person's OWN desired draw and OWN room allow.
  let alexDebt = toCents(0);
  let blairDebt = toCents(0);
  const october = walked.find((m) => m.month === '2026-10');
  const octoberAlexDraw = desiredDraw(50, '2026-10');
  const octoberBlairDraw = desiredDraw(1_000, '2026-10');
  for (let fortnight = 0; fortnight < fortnightsInWalkMonth(1); fortnight += 1) {
    alexDebt = heasAccrueFortnight(alexDebt, Math.min(octoberAlexDraw, Math.max(0, capacity - alexDebt)));
    blairDebt = heasAccrueFortnight(blairDebt, Math.min(octoberBlairDraw, Math.max(0, capacity - blairDebt)));
  }
  assert.equal(lineSumByEntry(october, HEAS_DRAW_LINE, 'heas-alex'), octoberAlexDraw * fortnightsInWalkMonth(1));
  assert.equal(lineSumByEntry(october, HEAS_DRAW_LINE, 'heas-blair'), octoberBlairDraw * fortnightsInWalkMonth(1));

  const november = walked.find((m) => m.month === '2026-11');
  const notesForBlair = walked.flatMap((m) => m.notes).filter((n) => n.subject === 'HEAS capacity cap reached' && n.entryId === 'heas-blair');
  assert.equal(notesForBlair.length, 1, "Blair's own draw must reach the cap once");
  assert.equal(notesForBlair[0].capacity, capacity);
  // Alex's own draw keeps running past the month Blair's loan binds — proof the two are independent
  // ledgers, not a shared household allowance split at the point of use.
  assert.equal(lineSumByEntry(november, HEAS_DRAW_LINE, 'heas-alex'), desiredDraw(50, '2026-11') * fortnightsInWalkMonth(2));
});

// --- T36: a couple of DIFFERENT ages prices capacity off the YOUNGER Person's age -----------------

test("T36 — a couple ten years apart: the OLDER Person's own loan is capped at the YOUNGER Person's age component, not their own", () => {
  // Every other couple fixture here is same-age, so Math.min → Math.max at the call site survived
  // the P13-5 sweep (chunk 11 row 9). Alex (the owner) is 79 and Blair 69 on 2026-10-01; neither
  // has a birthday before June 2027, so the capacity cannot step inside the window.
  const couple = { ...NIL_PENSION_COUPLE, persons: [person('Alex', '1947-06-01'), person('Blair', '1957-06-15')] };
  const forAlex = entry('heas-alex', 'HEAS_DRAW', '2026-10-01', { securityValue: toCents(30_000), fortnightlyAmount: toCents(1_000) }, 'personA');
  const walked = project(SETTINGS, couple, [forAlex]);

  // Hand-worked: $30,000 today raised 15 days at 2.5% ≈ $30,030; Alex's 50% share ≈ $15,015;
  // floor($15,015 / $10,000) = 1 unit. Younger age 69 → component $2,960 → capacity $2,960.00.
  // Keyed to the older age (79 → $4,380) it would be $4,380.00 instead.
  const expected = toCents(2_960);
  const olderAgeFigure = toCents(4_380);
  const security = inflateStated(toCents(30_000), SETTINGS.economicSeries.cpi, SETTINGS.asAtDate, '2026-10-01');
  assert.equal(personMaximumLoanAvailable(heasAgeComponent(69), security, 0.5), expected, 'the hand working: one $10,000 unit at the age-69 row');
  assert.equal(personMaximumLoanAvailable(heasAgeComponent(79), security, 0.5), olderAgeFigure, 'the control figure: one unit at the age-79 row');
  assert.notEqual(expected, olderAgeFigure, 'the control: the two ages must price differently, or this test is vacuous');

  const capNotes = walked.flatMap((m) => m.notes).filter((n) => n.subject === 'HEAS capacity cap reached' && n.entryId === 'heas-alex');
  assert.equal(capNotes.length, 1, "Alex's $1,000-a-fortnight draw must reach the cap once inside the window");
  assert.equal(capNotes[0].capacity, expected);
  assert.notEqual(capNotes[0].capacity, olderAgeFigure);
});

// --- T37: the $10,000 floor applies to EACH Person's OWN SHARE, not to the whole security value ----

test('T37 — the $10,000 security floor is per Person on their OWN SHARE: a couple whose home is worth $15,000 has NIL capacity, though $15,000 alone would floor to one $10,000 unit', () => {
  // Each Person's default 50-50 share of $15,000 is $7,500 — under the $10,000 floor, so NIL
  // capacity for BOTH Persons and BOTH draw nothing, ever. The MUTATION this guards: applying the
  // floor to the WHOLE $15,000 (the household-level slice-1 reading) rounds DOWN to one $10,000 unit
  // and gives a small but real capacity instead — this test goes red under that mutation.
  const nilShare = personMaximumLoanAvailable(heasAgeComponent(69), toCents(15_000), 0.5);
  assert.equal(nilShare, 0, 'the control: this scenario really is below the floor, on the share');

  const forAlex = entry('heas-alex', 'HEAS_DRAW', '2026-10-01', { securityValue: toCents(15_000), fortnightlyAmount: toCents(50) }, 'personA');
  const forBlair = entry('heas-blair', 'HEAS_DRAW', '2026-10-01', { securityValue: toCents(15_000), fortnightlyAmount: toCents(50) }, 'personB');
  const walked = project(SETTINGS, NIL_PENSION_COUPLE, [forAlex, forBlair]);

  for (const month of walked.slice(1, 6)) {
    assert.equal(lineSumByEntry(month, HEAS_DRAW_LINE, 'heas-alex'), 0, `${month.month}: Alex's own share is under the floor — nothing should draw`);
    assert.equal(lineSumByEntry(month, HEAS_DRAW_LINE, 'heas-blair'), 0, `${month.month}: Blair's own share is under the floor — nothing should draw`);
  }
  const capNotes = walked.flatMap((m) => m.notes).filter((n) => n.subject === 'HEAS capacity cap reached');
  assert.equal(capNotes.length, 2, 'both loans bind immediately, in the entry\'s own month, one note each');
  assert.ok(capNotes.every((n) => n.capacity === 0));

  // The contrast: $22,000 total gives each Person a $11,000 SHARE — at, and above, the floor, and
  // floors DOWN to the same one $10,000 unit $15,000-whole would have (Math.floor(11000/10000) = 1)
  // — so capacity is real and equal to the single-unit age component, never nil.
  const realShare = personMaximumLoanAvailable(heasAgeComponent(69), toCents(22_000), 0.5);
  assert.ok(realShare > 0, 'the positive control: a share at or over the floor is NOT nil');
  const forAlexReal = { ...forAlex, params: { ...forAlex.params, securityValue: toCents(22_000) } };
  const walkedReal = project(SETTINGS, NIL_PENSION_COUPLE, [forAlexReal]);
  const octoberReal = walkedReal.find((m) => m.month === '2026-10');
  assert.ok(lineSum(octoberReal, HEAS_DRAW_LINE) > 0, 'over the floor, on the share, the loan must draw something');
});

// --- The Age Pension is unchanged by the draw, in the draw's own month ---------------------------

test('the Age Pension is unchanged by the draw, in the draw’s own month: the draw is not assessable income, and the debt is not an assessable asset (T38)', () => {
  const stated = entry('heas', 'HEAS_DRAW', '2026-10-01', { securityValue: toCents(2_000_000), fortnightlyAmount: toCents(500) }, 'personA');
  const withHeas = project(SETTINGS, PART_PENSIONER_COUPLE, [stated]);
  const without = project(SETTINGS, PART_PENSIONER_COUPLE, []);

  // The entitlement for a month is assessed off the balance the month OPENS with (P4-4's standing
  // convention), and the draw's own cash has not reached the Offset yet at that point in the SAME
  // month's tick — so the entry's own month is identical whether or not HEAS ever ran.
  const octoberWith = withHeas.find((m) => m.month === '2026-10');
  const octoberWithout = without.find((m) => m.month === '2026-10');
  assert.equal(lineSum(octoberWith, AGE_PENSION_LINE), lineSum(octoberWithout, AGE_PENSION_LINE));

  // And the debt never appears as an asset (T38) — checked in the ENTRY'S OWN month, where
  // `heasDebt` is already non-nil (the fortnight loop has already run, earlier in the same tick,
  // by the time `Month.assessableAssets` is emitted) but `assets.assessableAssets` itself was read
  // EARLIER still, off the balance the month OPENED with — so this is the one month a mutation that
  // wrongly folded `heasDebt` into `assessableAssets` could not hide behind ordinary cash drift.
  assert.ok(octoberWith.heasDebt > 0, 'heasDebt must be non-nil this month for the check below to mean anything');
  assert.equal(octoberWith.assessableAssets, octoberWithout.assessableAssets);
});

// --- P9-2b — lump-sum advances: the corrected /26 formula, wired end to end, to the cent -----------

test('T136 — an advance mid-month reduces the WHOLE month\'s fortnightly draw, not just the fortnights after it, wired to the cent', () => {
  const advanceDate = '2026-10-15';
  const advanceAmount = toCents(10_000);
  const withAdvance = { ...validHeas, params: { ...validHeas.params, advances: [{ date: advanceDate, amount: advanceAmount }] } };
  const walked = project(SETTINGS, NIL_PENSION_COUPLE, [withAdvance]);
  const october = walked.find((m) => m.month === '2026-10');

  // **`advance.amount` is stated in TODAY's money (user ruling, 2026-09-25) — raised to the
  // advance's OWN day, its own payment date, before it joins the window total or reduces the draw
  // (`fortnightlyAmount: 'maximum'` here is untouched by the ruling: it is already netted off the
  // month's own entitlement).**
  const advanceAmountNominal = inflateStated(advanceAmount, SETTINGS.economicSeries.cpi, SETTINGS.asAtDate, advanceDate);

  // The control, composed from the SAME already-verified functions this file's header describes —
  // never re-derived by hand: this Person's own uncapped 150%-less-pension draw, and what the
  // corrected `heasFortnightlyDrawDuringAdvancePeriod` (T136, `test/assumptions-heas.test.mjs`'s own
  // "George" fixture) reduces it to once the (now-nominal) advance is in the window.
  const entitlement = agePensionEntitlement({ household: NIL_PENSION_COUPLE, date: '2026-10-01', deemingRates: SETTINGS.deemingRates });
  const personMaximumPaymentRate = mulCents(entitlement.maximumPaymentRate, 0.5);
  const uncappedFortnightlyDraw = heasFortnightlyDraw(personMaximumPaymentRate, entitlement.perPersonRatePerFortnight);
  const reducedFortnightlyDraw = heasFortnightlyDrawDuringAdvancePeriod(uncappedFortnightlyDraw, advanceAmountNominal);

  // MUTATION SENTINEL: dropping the ÷26 correction (or the window-active check entirely) collapses
  // this to `uncappedFortnightlyDraw` — the control fails if the two are not genuinely different.
  assert.notEqual(reducedFortnightlyDraw, uncappedFortnightlyDraw);

  const octoberFortnights = fortnightsInWalkMonth(1); // the entry's own month — TWO fortnights
  assert.equal(lineSum(october, HEAS_ADVANCE_LINE), advanceAmountNominal);
  assert.equal(
    lineSum(october, HEAS_DRAW_LINE),
    reducedFortnightlyDraw * octoberFortnights,
    'BOTH of October\'s fortnights draw the REDUCED rate — Services Australia\'s "George" applies it from the SAME fortnight the advance is taken, not merely the fortnights after it',
  );

  // The debt, replayed exactly as `project()` computes it: the advance joins the balance BEFORE
  // that fortnight's own interest (fortnight 0, s 1135(3) Step 1A), then the reduced draw compounds
  // every fortnight the month contributes.
  let debt = toCents(0);
  for (let fortnight = 0; fortnight < octoberFortnights; fortnight += 1) {
    if (fortnight === 0) debt += advanceAmountNominal;
    debt = heasAccrueFortnight(debt, reducedFortnightlyDraw);
  }
  assert.equal(october.heasDebt, debt);
});

test('T136 — the reduced rate continues into the NEXT month with no new advance: the 26-fortnight window is still active', () => {
  const advanceDate = '2026-10-15';
  const advanceAmount = toCents(10_000);
  const withAdvance = { ...validHeas, params: { ...validHeas.params, advances: [{ date: advanceDate, amount: advanceAmount }] } };
  const walked = project(SETTINGS, NIL_PENSION_COUPLE, [withAdvance]);
  const november = walked.find((m) => m.month === '2026-11');

  // `advance.amount` is stated in TODAY's money too (user ruling, 2026-09-25) — raised to its own
  // payment date, exactly as the test above.
  const advanceAmountNominal = inflateStated(advanceAmount, SETTINGS.economicSeries.cpi, SETTINGS.asAtDate, advanceDate);
  const entitlement = agePensionEntitlement({ household: NIL_PENSION_COUPLE, date: '2026-11-01', deemingRates: SETTINGS.deemingRates });
  const personMaximumPaymentRate = mulCents(entitlement.maximumPaymentRate, 0.5);
  const uncappedFortnightlyDraw = heasFortnightlyDraw(personMaximumPaymentRate, entitlement.perPersonRatePerFortnight);
  const reducedFortnightlyDraw = heasFortnightlyDrawDuringAdvancePeriod(uncappedFortnightlyDraw, advanceAmountNominal);
  assert.notEqual(reducedFortnightlyDraw, uncappedFortnightlyDraw);

  const novemberFortnights = fortnightsInWalkMonth(2);
  assert.equal(lineSum(november, HEAS_DRAW_LINE), reducedFortnightlyDraw * novemberFortnights);
  assert.equal(lineSum(november, HEAS_ADVANCE_LINE), 0, 'no new advance this month');
});

test('T137 RESOLVED (P16-4) — a genuine part-rate pensioner with an active advance window walks to a figure, no refusal', () => {
  // The SAME household and "maximum" entry the part-pensioner test above already confirms is
  // genuinely part-rate (0 < perPersonRatePerFortnight < personMaximumPaymentRate) — an advance
  // added to it used to hit the T137 RangeError guard this deletes. Dated in month 0 (`asAtDate`
  // itself, not the later `2026-10-01` `validHeas` uses elsewhere in this file) so the independent
  // `agePensionEntitlement` call below reads the SAME balance the walk's own first-month assessment
  // does — a later month's entitlement has already moved on the walk's own accumulated Age Pension
  // cash, which an independent call made against the plan's STATED opening balance cannot see. The
  // wiring check is the file's own methodology: the ALREADY-VERIFIED
  // `heasFortnightlyDrawDuringAdvancePeriod` composed with this month's own entitlement, never
  // re-derived by hand.
  const withAdvance = entry(
    'heas',
    'HEAS_DRAW',
    SETTINGS.asAtDate,
    { securityValue: toCents(2_000_000), fortnightlyAmount: 'maximum', advances: [{ date: '2026-09-20', amount: toCents(5_000) }] },
    'personA',
  );
  const walked = project(SETTINGS, PART_PENSIONER_COUPLE, [withAdvance]);
  const opening = walked.find((m) => m.month === '2026-09');
  assert.ok(opening !== undefined, 'the walk must actually reach the entry month, or this fixture proves nothing');

  const entitlement = agePensionEntitlement({ household: PART_PENSIONER_COUPLE, date: SETTINGS.asAtDate, deemingRates: SETTINGS.deemingRates });
  const personMaximumPaymentRate = mulCents(entitlement.maximumPaymentRate, 0.5);
  assert.ok(entitlement.perPersonRatePerFortnight > 0 && entitlement.perPersonRatePerFortnight < personMaximumPaymentRate, 'this fixture must actually be genuinely part-rate, or the test above proves nothing');
  const uncappedFortnightlyDraw = heasFortnightlyDraw(personMaximumPaymentRate, entitlement.perPersonRatePerFortnight);
  const reducedFortnightlyDraw = heasFortnightlyDrawDuringAdvancePeriod(uncappedFortnightlyDraw, toCents(5_000));

  const openingFortnights = fortnightsInWalkMonth(1);
  // The advance is dated inside this same month, so the WHOLE month draws at the reduced rate —
  // George's own "the SAME fortnight the advance is taken, not merely the fortnights after it"
  // precedent (T136), which this build honours at the month's own granularity
  // (`desiredFortnightlyDraw` is computed once per month, off the window total AFTER this month's
  // own advance joins it).
  assert.equal(lineSum(opening, HEAS_DRAW_LINE), reducedFortnightlyDraw * openingFortnights);
  assert.equal(lineSum(opening, HEAS_ADVANCE_LINE), toCents(5_000));
});

// --- P9-1d: two SIBLING Scenarios, two Security Values, two capacities ----------------------------

test('P9-1d — sibling Scenarios pricing HEAS off $10,000 and $20,000 walk to two different capacities, and the comparison says which value each used', async () => {
  const { scenarioWalks } = await import('../dist/app/scenarioWalks.js');
  const { comparisonSeries, heasSummary } = await import('../dist/app/comparisonSeries.js');
  // `the cap reached`'s own Sam: 67 at the entry. $1,800 a fortnight binds both caps (one and two
  // $2,740 units) within two months; the stop before his 2027-06 birthday keeps T36 from reopening
  // either cap, so each walk has exactly one binding episode at age 67.
  const household = { persons: [person('Sam', '1959-06-01')], homeStatus: 'occupied', openingOffsetBalance: toCents(50_000) };
  const draw = (id, securityValue) =>
    entry(id, 'HEAS_DRAW', '2026-10-01', { securityValue, fortnightlyAmount: toCents(1_800), stopDate: '2027-05-01' }, 'personA');
  const plan = parsePlan({
    ...DEMO_PLAN,
    settings: { ...DEMO_PLAN.settings, ...SETTINGS },
    household,
    entries: [draw('low', toCents(10_000)), draw('high', toCents(20_000))],
    scenarios: [
      { id: 'root', name: 'Root', parentId: null, entryIds: [] },
      { id: 'conservative', name: 'Conservative', parentId: 'root', entryIds: ['low'] },
      { id: 'optimistic', name: 'Optimistic', parentId: 'root', entryIds: ['high'] },
    ],
    activeScenarioId: 'root',
  });
  const walks = scenarioWalks(plan);
  const capacityOf = (id) => {
    const notes = walks.byScenarioId.get(id).flatMap((m) => m.notes).filter((note) => note.subject === 'HEAS capacity cap reached');
    assert.equal(notes.length, 1, `${id}: one binding episode`);
    return notes[0].capacity;
  };
  assert.equal(capacityOf('conservative'), personMaximumLoanAvailable(heasAgeComponent(67), toCents(10_000), 1));
  assert.equal(capacityOf('optimistic'), personMaximumLoanAvailable(heasAgeComponent(67), toCents(20_000), 1));
  assert.equal(capacityOf('optimistic'), 2 * capacityOf('conservative'), 'two $10,000 units against one');
  const debtAtClose = (id) => walks.byScenarioId.get(id).at(-1).heasDebt;
  assert.ok(debtAtClose('optimistic') > debtAtClose('conservative'), 'the larger security drew no more');

  const lines = new Map(comparisonSeries(plan, walks).lines.map((line) => [line.scenarioId, line]));
  assert.equal(lines.get('root').heas, undefined, 'a Scenario with no HEAS_DRAW names no home value');
  assert.equal(lines.get('conservative').heas.securityValue, toCents(10_000));
  assert.equal(lines.get('optimistic').heas.securityValue, toCents(20_000));
  assert.match(lines.get('conservative').heas.text, /\$10,000 in today's money/);
  assert.match(lines.get('optimistic').heas.text, /\$20,000 in today's money/);
  // A draw switched off in the Scenario is not in its walk, so it prices nothing and names no value.
  assert.equal(heasSummary([{ ...draw('off', toCents(10_000)), enabled: false }]), undefined);
});
