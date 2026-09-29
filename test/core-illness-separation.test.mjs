// P12-4 — `ILLNESS_SEPARATION`: a couple living apart because of illness or care.
//
// The rules are pinned by hand in `core-age-pension.test.mjs` (the three-way fixture). This file
// defends the ENTRY: that the door reads it, that the walk starts the separation in the entry's own
// month — not a month early, not a month late — and that it holds for every month after.
//
// Every Household here is synthetic: round numbers and placeholder names.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';

import { toCents } from '../dist/core/money.js';
import { agePensionEntitlement } from '../dist/core/agePension.js';
import { AGE_PENSION_LINE, monthlyFromFortnightly, project } from '../dist/core/projection.js';
import { parsePlan } from '../dist/core/parsePlan.js';
import { householdIncomeTax } from '../dist/core/incomeTax.js';
import { netLabourIncomeFromSalary, rebateIncomeFrom, taxableIncome } from '../dist/core/incomeBases.js';
import { DEMO_ENTRIES, DEMO_HOUSEHOLD, DEMO_PLAN, DEMO_SETTINGS } from '../dist/app/demoHousehold.js';

const person = (name, dateOfBirth, superInterests = []) => ({
  name,
  dateOfBirth,
  superInterests,
  parcels: [],
  employmentIncomePerFortnight: toCents(0),
  workBonusBalance: toCents(0),
});

const DEEMING = { lower: 0.0175, upper: 0.0375 };

/** A 41-month walk from 2026-09, to Alex's planning horizon of 73. */
const SETTINGS = {
  asAtDate: '2026-09-16',
  planningHorizonAge: 73,
  economicSeries: { cpi: 0.025, pblci: 0.025, awote: 0.035, mtawe: 0.035 },
  deemingRates: DEEMING,
  nominalReturn: 0.065,
};

/** Both past 67, homeowners, $700,000 in one Account-Based Pension: the assets test binds. */
const COUPLE = {
  persons: [
    person('Alex', '1955-09-01', [{ phase: 'accountBasedPension', balance: toCents(700_000) }]),
    person('Blair', '1957-01-01'),
  ],
  homeStatus: 'occupied',
};

const entry = (id, type, date, params = {}, owner = 'household') => ({
  id, date, owner, type, params, enabled: true, createdAt: '2026-06-01',
});
const SPEND = entry('sc', 'SPEND_CHANGE', '2026-09-01', { annualSpend: toCents(60_000) });
const separation = (date, owner = 'household') => entry('sep', 'ILLNESS_SEPARATION', date, {}, owner);

const agePensionIn = (month) =>
  month.lines.filter((line) => line.description === AGE_PENSION_LINE).reduce((sum, line) => sum + line.amount, 0);

const walk = (...entries) => project(SETTINGS, COUPLE, [SPEND, ...entries]);
const BASE = walk();

test('the door reads it: `{}` params, and a stated field is refused rather than dropped', () => {
  const built = { ...separation('2040-07-01'), createdAt: '2026-09-24' };
  const parsed = parsePlan({ ...DEMO_PLAN, entries: [...DEMO_PLAN.entries, built] });
  assert.equal(parsed.entries.at(-1).type, 'ILLNESS_SEPARATION');
  assert.deepEqual(parsed.entries.at(-1).params, {});
  assert.throws(() => parsePlan({ ...DEMO_PLAN, entries: [...DEMO_PLAN.entries, { ...built, params: { reason: 'care' } }] }), /"reason"/);
});

test('the door refuses one for a Household of one Person: there is nobody to be separated from', () => {
  const single = { ...DEMO_PLAN.household, persons: [DEMO_PLAN.household.persons[0]] };
  // The control: the same single Household parses without the entry.
  const withoutEntries = { ...DEMO_PLAN, household: single, entries: [], scenarios: DEMO_PLAN.scenarios.map((s) => ({ ...s, entryIds: [] })) };
  assert.doesNotThrow(() => parsePlan(withoutEntries));
  assert.throws(
    () => parsePlan({ ...withoutEntries, entries: [{ ...separation('2040-07-01'), createdAt: '2026-09-24' }] }),
    /ILLNESS_SEPARATION, and this Household has one Person/,
  );
});

test('it starts in the entry’s OWN month — mid-month dated — and holds for every month after', () => {
  const separated = walk(separation('2026-11-15'));
  assert.equal(separated.length, BASE.length);
  const entryMonth = separated.findIndex((month) => month.month === '2026-11');
  assert.equal(entryMonth, 2, 'the control: 2026-11 is the third month of the walk');

  // Not a month early: every month before the entry's is byte-identical to the walk without it.
  assert.deepEqual(separated.slice(0, entryMonth), BASE.slice(0, entryMonth));

  // Not a month late, and never dropped: the Age Pension is higher in the entry's own month and in
  // EVERY month after it. Counted, so a month that fell back to the couple rate is a failure.
  const after = separated.slice(entryMonth);
  const raised = after.filter((month, index) => agePensionIn(month) > agePensionIn(BASE[entryMonth + index]));
  assert.equal(raised.length, after.length);
  assert.equal(after.length, 39);
  // The control for the comparison: the baseline does pay a pension in all of those months.
  assert.ok(BASE.slice(entryMonth).every((month) => agePensionIn(month) > 0));
});

test('a mid-month date and the first of the month give the same walk: the month is the unit', () => {
  const firstOf = walk(separation('2026-11-01'));
  const midMonth = walk(separation('2026-11-15'));
  const strip = (months) => months.map(({ appliedEntryIds, ...rest }) => rest);
  assert.deepEqual(strip(midMonth), strip(firstOf));
});

test('its first month is the means test’s third path on that month’s Household, exactly', () => {
  // Dated before `asAtDate`: a `level`, so it is in force from month 0, whose balances are the
  // stated ones — so the month's figure can be recomputed from the Household as written.
  const [first] = walk(separation('2026-01-01'));
  const expected = agePensionEntitlement({ household: COUPLE, date: '2026-09-01', deemingRates: DEEMING, illnessSeparated: true });
  assert.equal(expected.status, 'single');
  assert.equal(agePensionIn(first), monthlyFromFortnightly(expected.householdRatePerFortnight));
  const couple = agePensionEntitlement({ household: COUPLE, date: '2026-09-01', deemingRates: DEEMING });
  assert.equal(agePensionIn(BASE[0]), monthlyFromFortnightly(couple.householdRatePerFortnight));
  assert.ok(expected.householdRatePerFortnight > couple.householdRatePerFortnight);
});

test('`owner` is ignored: a personB-owned separation is the same fact about the couple', () => {
  const strip = (months) => months.map(({ appliedEntryIds, ...rest }) => rest);
  assert.deepEqual(strip(walk(separation('2026-11-15', 'personB'))), strip(walk(separation('2026-11-15'))));
});

test('switched off, it moves nothing', () => {
  assert.deepEqual(walk({ ...separation('2026-11-15'), enabled: false }), BASE);
});

// --- The named limit: taxed as a couple (register §8 O90) -----------------------------------------

test('O90 — taxing the pair as a COUPLE never makes either Person pay LESS tax than the separated amounts would', () => {
  // The walk keeps `relationship: 'couple'` for an illness-separated couple. That is only an
  // acceptable limit if it runs the cautious way. It is measured on what each Person PAYS — tax
  // after offsets plus the Medicare levy — and not on the SAPTO figure itself: a couple's transfer
  // can make one Person's offset larger than the separated amount (A $0, B $32,500: $3,204 against
  // $2,040) while the tax paid is nil either way, because the offset is non-refundable.
  // Counted, and non-vacuous: some Persons must pay strictly MORE as a couple.
  let compared = 0;
  let paysMore = 0;
  for (const fy of ['2026-27', '2027-28']) {
    const pensioner = (name, dollars) => {
      const ti = taxableIncome(toCents(dollars));
      return {
        name,
        taxableIncome: ti,
        rebateIncome: rebateIncomeFrom(ti),
        qualifiedForAgePension: true,
        netLabourIncome: netLabourIncomeFromSalary(fy, toCents(0), toCents(0)),
      };
    };
    const paid = (relationship, persons) =>
      householdIncomeTax({ fy, relationship, persons }).persons.map((each) => each.taxAfterOffsets + each.medicareLevy.levy);
    for (let a = 0; a <= 100_000; a += 2_500) {
      for (let b = 0; b <= 100_000; b += 2_500) {
        const persons = [pensioner('A', a), pensioner('B', b)];
        const asCouple = paid('couple', persons);
        const asSeparated = paid('illnessSeparated', persons);
        for (const index of [0, 1]) {
          compared += 1;
          assert.ok(asCouple[index] >= asSeparated[index], `${fy}, A $${a}, B $${b}: Person ${index} pays ${asCouple[index]} as a couple and ${asSeparated[index]} separated`);
          if (asCouple[index] > asSeparated[index]) paysMore += 1;
        }
      }
    }
  }
  assert.equal(compared, 2 * 41 * 41 * 2);
  assert.ok(paysMore > 400, `only ${paysMore} comparisons differ`);
});

// --- Byte-identity: no entry, no change ------------------------------------------------------------

test('without an ILLNESS_SEPARATION the demo walk is byte-identical — and with one switched off too', () => {
  // The same digest `app-chat-identity.test.mjs` pins, from before P12-4 existed.
  // 2026-09-24: hashed without `closingNonSuperPortfolio`, a balance the walk already held at the
  // close — so this is still the digest of every figure it pinned before. 2026-09-25: and without
  // `assetsTestThresholds`, read off the entitlement the walk already computed, for the same reason.
  // The full walk's own digest is pinned in `app-month-to-rows.test.mjs`.
  const sha256 = (value) =>
    createHash('sha256')
      .update(JSON.stringify(value, (key, field) => (key === 'closingNonSuperPortfolio' || key === 'assetsTestThresholds' ? undefined : field)))
      .digest('hex');
  // RE-PINNED 2026-09-24 (T135): the demo couple's assets excess now floors to the nearest $500
  // (SSA 1991 s1064 point 1064-G7), a few cents to a few dollars of Age Pension higher in a
  // handful of months — see `test/core-age-pension.test.mjs`'s T135 tests.
  // RE-PINNED 2026-09-29 (LR-1 slice 2, the CGT reform from 1 July 2027): only the limb-3
  // `available` figure moved, in 94 months from 2027-08, every one DOWN. It is the whole-portfolio
  // probe, and from 1 July 2027 the part of the gain after the stamp is indexed and never halved,
  // so selling everything would cost more tax (32c a dollar at the demo's rate). Slice 2 moved no line: without Div 119 the demo's own sales in 2033 stay under the tax-free threshold.
  // RE-PINNED 2026-09-29 (LR-1 slice 3, Div 119's minimum tax): Dana sells from 2033 with no salary
  // and no Age Pension, so 30% of the later part of each gain, less LITO, is now charged: 11
  // `Income tax on capital gain, Dana` lines, 2033-03 to 2035-05 — $1,615 in FY2032-33, $2,156 in
  // FY2033-34 and $1,793 in FY2034-35, each equal to 30% of that year's later gain less $700 to the
  // dollar, replayed by hand. The last comes back in the July 2035 true-up: she is paid the pension from
  // June 2035. Each sale grows by exactly its tax, so the portfolio runs out a month sooner (2037-05),
  // and lower assets raise the Age Pension in 417 months from 2033-09. The limb-3 probe moved again,
  // DOWN in 55 months from 2031-06, once her salary stops.
  // RE-PINNED 2026-09-29 (LR-1 slice 4): no figure moved. Dana's 11 `Income tax on capital gain` lines (2033-03 to 2035-05) each gained one `determination` entry, `CGT_MINIMUM_TAX_DETERMINATION`; a whole-walk diff finds those 11 and nothing else.
  const DEMO_DIGEST = 'a895e6545773fc348c834ab324eeb80882f678276716dca7b57cbaad43e7df28';
  assert.equal(sha256(project(DEMO_SETTINGS, DEMO_HOUSEHOLD, DEMO_ENTRIES)), DEMO_DIGEST);
  const off = { ...separation('2040-07-01'), enabled: false };
  assert.equal(sha256(project(DEMO_SETTINGS, DEMO_HOUSEHOLD, [...DEMO_ENTRIES, off])), DEMO_DIGEST);
  // The control: switched on, the demo couple's walk does move, so the two equalities are not
  // the digest of a walk the entry could never reach.
  assert.notEqual(sha256(project(DEMO_SETTINGS, DEMO_HOUSEHOLD, [...DEMO_ENTRIES, { ...off, enabled: true }])), DEMO_DIGEST);
});
