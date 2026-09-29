// P4-12 — **a per-Person entry whose `owner` names no Person is REFUSED, not skipped.**
//
// The defect this file was written red against: `RETIRE` and `WORK_PATTERN_CHANGE` were applied
// inside `household.persons.forEach(...)`, guarded by `ownsPerson`. A `personB`-owned entry in a
// one-Person Household matched nobody, the loop body never ran, and the entry simply vanished —
// the plan parsed, `project()` completed, and the page drew a plausible forecast in which a stated
// retirement never happened. No refusal, no `Month.note`, nothing on screen. That is the
// confidently-wrong output this project is organised against, arriving through a loop that reads as
// obviously correct.
//
// The engine already held the ruling at the other two per-Person types — `NON_SUPER_INVESTMENT`
// through `soleOwnerIndex` and `LUMP_SUM_FROM_SUPER` in its own entry loop, both by `RangeError`.
// This file pins it at the remaining two, and pins the limb that must NOT be swept up with it:
// `owner: 'household'` still reaches every Person that exists, which is the ruling
// `test/core-projection-tax.test.mjs`'s "an entry owned by `household` reaches BOTH Persons" holds
// and which `soleOwnerIndex`'s own refusal — a share parcel belongs to exactly one Person (P3-21c)
// — has no bearing on. Retiring is not owning a parcel.
import test from 'node:test';
import assert from 'node:assert/strict';

import { toCents } from '../dist/core/money.js';
import { project } from '../dist/core/projection.js';

const person = (name, dateOfBirth, fortnightlyPay) => ({
  name,
  dateOfBirth,
  superInterests: [{ phase: 'accumulation', balance: toCents(0) }],
  parcels: [],
  employmentIncomePerFortnight: toCents(fortnightlyPay),
  workBonusBalance: toCents(0),
});

/** ONE Person. `personB` names nobody here, and that is the whole fixture. */
const SOLO = { persons: [person('Rae', '1980-03-15', 3_000)], homeStatus: 'occupied' };

/** TWO Persons — the same entries must go through untouched. */
const COUPLE = {
  persons: [person('Rae', '1980-03-15', 3_000), person('Tom', '1980-09-20', 1_500)],
  homeStatus: 'occupied',
};

const SETTINGS = {
  asAtDate: '2027-05-10',
  planningHorizonAge: 48,
  // Pay rising with wages (2026-09-23) is not this fixture's subject: `awote: 0` holds every salary at the figure stated. A proved control: every figure this file asserts is the same at nil on the build before pay rose.
  economicSeries: { cpi: 0.025, pblci: 0.025, awote: 0, mtawe: 0.035 },
  deemingRates: { lower: 0.0175, upper: 0.0375 },
  nominalReturn: 0.065,
};

const entry = (id, type, date, owner, params = {}) => ({
  id,
  date,
  owner,
  type,
  params,
  enabled: true,
  createdAt: '2027-01-01',
});

const monthAt = (months, isoMonth) => months.find((m) => m.month === isoMonth);
const amountOf = (month, description) =>
  month.lines.filter((l) => l.description === description).map((l) => l.amount);

// --- 1. The two types that used to swallow it -----------------------------------------------------

test('a `personB`-owned RETIRE in a one-Person Household is refused, not silently skipped', () => {
  // Dated INSIDE the window — 2027-09-01, four months into a walk that runs 2027-05 → 2028-09 — so
  // the entry is applied, not merely carried. Before the fix this call returned normally and Rae's
  // salary went on being paid for the rest of the walk: a stated retirement that never happened.
  const months = () => project(SETTINGS, SOLO, [entry('r1', 'RETIRE', '2027-09-01', 'personB')]);
  assert.throws(months, (error) => {
    assert.ok(error instanceof RangeError, `expected a RangeError, got ${error?.constructor?.name}`);
    assert.match(error.message, /r1/);
    assert.match(error.message, /personB/);
    assert.match(error.message, /refused rather than skipped/);
    return true;
  });

  // The shape of the defect, stated as the thing that must NOT be true: had it merely been skipped,
  // the walk would have completed and October would still carry a salary. This is the assertion the
  // unfixed engine passed.
  const skipped = () => {
    const walked = months();
    assert.deepEqual(amountOf(monthAt(walked, '2027-10'), 'Salary, Rae'), [650_000]);
  };
  assert.throws(skipped, RangeError);
});

test('a `personB`-owned WORK_PATTERN_CHANGE in a one-Person Household is refused the same way', () => {
  const walk = () =>
    project(SETTINGS, SOLO, [
      entry('w1', 'WORK_PATTERN_CHANGE', '2027-09-01', 'personB', { daysPerWeek: 0 }),
    ]);
  assert.throws(walk, (error) => {
    assert.ok(error instanceof RangeError, `expected a RangeError, got ${error?.constructor?.name}`);
    assert.match(error.message, /w1/);
    assert.match(error.message, /WORK_PATTERN_CHANGE/);
    assert.match(error.message, /this Household has 1 Person/);
    return true;
  });
});

// --- 2. What the refusal must NOT reach ------------------------------------------------------------

test('`household` owner still reaches every Person that exists — one of them, or two', () => {
  // The limb `soleOwnerIndex` refuses and this resolver must not. In a SOLO Household it reaches
  // the one Person; the two-Person case is pinned in `core-projection-tax.test.mjs`.
  const solo = project(SETTINGS, SOLO, [entry('hr', 'RETIRE', '2027-09-01', 'household')]);
  assert.deepEqual(amountOf(monthAt(solo, '2027-08'), 'Salary, Rae'), [650_000]);
  assert.deepEqual(amountOf(monthAt(solo, '2027-10'), 'Salary, Rae'), []);
});

test('a `personB`-owned entry in a TWO-Person Household is untouched — it reaches Tom and only Tom', () => {
  const months = project(SETTINGS, COUPLE, [entry('r2', 'RETIRE', '2027-09-01', 'personB')]);
  assert.deepEqual(amountOf(monthAt(months, '2027-08'), 'Salary, Tom'), [325_000]);
  assert.deepEqual(amountOf(monthAt(months, '2027-10'), 'Salary, Tom'), []);
  // Rae, who is personA, keeps working: the index is not inverted and not widened.
  assert.deepEqual(amountOf(monthAt(months, '2027-10'), 'Salary, Rae'), [650_000]);

  const patterned = project(SETTINGS, COUPLE, [
    entry('w2', 'WORK_PATTERN_CHANGE', '2027-09-01', 'personA', { daysPerWeek: 0 }),
  ]);
  assert.deepEqual(amountOf(monthAt(patterned, '2027-10'), 'Salary, Rae'), []);
  assert.deepEqual(amountOf(monthAt(patterned, '2027-10'), 'Salary, Tom'), [325_000]);
});

// --- 3. The case this file deliberately does NOT pin ----------------------------------------------
//
// A Household with NO Persons at all never reaches the entry loop: `forecastWindow` derives the
// Planning Horizon from the Persons' ages and reduces an empty array, so `project()` fails before
// any owner is resolved. The dangling-owner refusal is therefore about a Household that has SOME
// Persons and not the one the entry names — which is the shape a removal control would produce.
