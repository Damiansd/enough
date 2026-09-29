// P12-1 — `DEATH`: one of a couple dies, and the survivor carries on alone (the user's ruling
// "option A": the deceased's super comes to the survivor as ONE tax-free lump sum).
//
// Every Household here is synthetic: round numbers and placeholder names.
import test from 'node:test';
import assert from 'node:assert/strict';

import { toCents } from '../dist/core/money.js';
import { agePensionEntitlement } from '../dist/core/agePension.js';
import {
  AGE_PENSION_BEREAVEMENT_LINE,
  AGE_PENSION_LINE,
  CAPITAL_GAINS_TAX_LINE,
  SUPER_DEATH_BENEFIT_LINE,
  monthlyFromFortnightly,
  project,
} from '../dist/core/projection.js';
import { parsePlan } from '../dist/core/parsePlan.js';
import { DEMO_ENTRIES, DEMO_HOUSEHOLD, DEMO_PLAN, DEMO_SETTINGS } from '../dist/app/demoHousehold.js';
import { createHash } from 'node:crypto';
import { householdIncomeTax } from '../dist/core/incomeTax.js';
import { agesAt, shortfallAge } from '../dist/core/outcomes.js';
import { AGE_DIED, agesCaption, ageAxis, monthsToSeries } from '../dist/app/monthsToSeries.js';
import { anonymousAges } from '../dist/app/chat/tools/identity.js';
import { netLabourIncomeFromSalary, rebateIncomeFrom, taxableIncome } from '../dist/core/incomeBases.js';
import { BEREAVEMENT_DAYS_TO_PERIOD_END, bereavementLumpSum } from '../dist/core/bereavement.js';
import { AGE_PENSION } from '../dist/data/assumptions/agePension.js';

const person = (name, dateOfBirth, superInterests = [], parcels = []) => ({
  name,
  dateOfBirth,
  superInterests,
  parcels,
  employmentIncomePerFortnight: toCents(0),
  workBonusBalance: toCents(0),
});

const DEEMING = { lower: 0.0175, upper: 0.0375 };

// --- The rule ---------------------------------------------------------------------------------------

test('the Guide’s formula, by hand: 6 fortnights of the gap plus NDEP fourteenths of one, NDEP at its least', () => {
  // SS Guide 3.1.5.70: LBP = 6 × (CCR − NR) + NDEP × (CCR − NR) / 14. With a gap of $628.30 and
  // NDEP = 1: 3,769.80 + 44.8786… = $3,814.6786…, rounded down.
  assert.equal(bereavementLumpSum({ coupleRatePerFortnight: toCents(1_866), singleRatePerFortnight: toCents(1_237.7) }), 381_467);
  assert.equal(BEREAVEMENT_DAYS_TO_PERIOD_END, 1);
  assert.deepEqual(AGE_PENSION.bereavement.lumpSumFormula.value, { fortnights: 6, daysInEntitlementPeriod: 14 });
});

test('nil where the single rate is not LESS than the couple’s — arrears, not a lump sum (3.1.5.30)', () => {
  assert.equal(bereavementLumpSum({ coupleRatePerFortnight: toCents(500), singleRatePerFortnight: toCents(500) }), 0);
  assert.equal(bereavementLumpSum({ coupleRatePerFortnight: toCents(500), singleRatePerFortnight: toCents(900) }), 0);
  // A single rate of NIL still pays: the whole couple rate is the gap.
  assert.equal(bereavementLumpSum({ coupleRatePerFortnight: toCents(1_400), singleRatePerFortnight: toCents(0) }), 850_000);
});

test('the two rates come off the means test: a couple on the full rate, the survivor on the full single rate', () => {
  // Both past 67, homeowners, nothing assessable: every test is at its maximum.
  const couple = { persons: [person('Alex', '1950-01-01'), person('Blair', '1951-01-01')], homeStatus: 'occupied' };
  const survivor = { persons: [couple.persons[1]], homeStatus: 'occupied' };
  const date = '2026-10-01';
  const ccr = agePensionEntitlement({ household: couple, date, deemingRates: DEEMING }).householdRatePerFortnight;
  const nr = agePensionEntitlement({ household: survivor, date, deemingRates: DEEMING }).householdRatePerFortnight;
  // 20 Sep 2026 rates (register §4.2): couple $1,711.80 + $133.00 + Energy Supplement $21.20
  // combined; single $1,135.40 + $88.20 + $14.10.
  assert.equal(ccr, toCents(1_866));
  assert.equal(nr, toCents(1_237.7));
  assert.equal(bereavementLumpSum({ coupleRatePerFortnight: ccr, singleRatePerFortnight: nr }), 381_467);
});

// --- The entry, at the door ---------------------------------------------------------------------------

const entry = (id, type, date, params = {}, owner = 'household') => ({
  id, date, owner, type, params, enabled: true, createdAt: '2026-06-01',
});
const death = (date, owner = 'personA', id = 'd') => entry(id, 'DEATH', date, {}, owner);

test('the door reads it: `{}` params, and a stated field is refused rather than dropped', () => {
  const built = { ...death('2050-07-01', 'personB'), createdAt: '2026-09-24' };
  const parsed = parsePlan({ ...DEMO_PLAN, entries: [...DEMO_PLAN.entries, built] });
  assert.equal(parsed.entries.at(-1).type, 'DEATH');
  assert.deepEqual(parsed.entries.at(-1).params, {});
  assert.throws(() => parsePlan({ ...DEMO_PLAN, entries: [...DEMO_PLAN.entries, { ...built, params: { cause: 'x' } }] }), /"cause"/);
});

test('the door refuses a death owned by the Household, and one in a Household of one Person', () => {
  assert.throws(
    () => parsePlan({ ...DEMO_PLAN, entries: [...DEMO_PLAN.entries, { ...death('2050-07-01', 'household'), createdAt: '2026-09-24' }] }),
    /is household on a DEATH — a death is one Person's/,
  );
  const single = { ...DEMO_PLAN.household, persons: [DEMO_PLAN.household.persons[0]] };
  const withoutEntries = { ...DEMO_PLAN, household: single, entries: [], scenarios: DEMO_PLAN.scenarios.map((s) => ({ ...s, entryIds: [] })) };
  assert.doesNotThrow(() => parsePlan(withoutEntries)); // the control
  assert.throws(
    () => parsePlan({ ...withoutEntries, entries: [{ ...death('2050-07-01'), createdAt: '2026-09-24' }] }),
    /is DEATH, and this Household has one Person/,
  );
});

// --- The walk ---------------------------------------------------------------------------------------

/** No interest on cash, so a month's income tax is its salary's and nothing else's. */
const SETTINGS = {
  asAtDate: '2026-09-16',
  planningHorizonAge: 80,
  economicSeries: { cpi: 0.025, pblci: 0.025, awote: 0.035, mtawe: 0.035 },
  deemingRates: DEEMING,
  nominalReturn: 0.065,
  cashInterestRate: 0,
};

/**
 * SMALL: both past 67, homeowners, a little of everything — $40,000 in Alex's Account-Based Pension,
 * one $10,000 parcel, $10,000 cash. Every test sits at its maximum, as a couple and as a single, so
 * the Age Pension is the maximum rate for the Household's status and nothing else.
 */
const SMALL = {
  persons: [
    person('Alex', '1950-01-01', [{ phase: 'accountBasedPension', balance: toCents(40_000), statedStreamSettings: { commencementDay: '2020-07-01' } }], [
      { acquired: '2010-01-01', costBase: toCents(4_000), marketValue: toCents(10_000) },
    ]),
    person('Blair', '1952-01-01'),
  ],
  homeStatus: 'occupied',
  openingOffsetBalance: toCents(10_000),
};
const SPEND = entry('sc', 'SPEND_CHANGE', '2026-09-01', { annualSpend: toCents(40_000) });
const DEATH_MONTH = '2027-03';
const BASE = project(SETTINGS, SMALL, [SPEND]);
// Dated mid-month: the death takes effect from the first day of its own month.
const DIED = project(SETTINGS, SMALL, [SPEND, death('2027-03-15')]);
const at = (months, month) => months.find((each) => each.month === month);
const index = (month) => BASE.findIndex((each) => each.month === month);
const amounts = (month, description) => month.lines.filter((line) => line.description === description).map((line) => line.amount);
const sum = (values) => values.reduce((total, value) => total + value, 0);
const alone = (who, date) => agePensionEntitlement({ household: { persons: [who], homeStatus: 'occupied' }, date, deemingRates: DEEMING });

test('it starts in its OWN month — not a month early, not a month late', () => {
  const d = index(DEATH_MONTH);
  // Every month before the death is the walk without it, whole.
  assert.deepEqual(DIED.slice(0, d), BASE.slice(0, d));
  assert.equal(amounts(DIED[d - 1], `${SUPER_DEATH_BENEFIT_LINE}, Alex`).length, 0);
  // The month itself carries the benefit, once; no month after carries it again.
  assert.equal(amounts(DIED[d], `${SUPER_DEATH_BENEFIT_LINE}, Alex`).length, 1);
  assert.equal(DIED.filter((month) => amounts(month, `${SUPER_DEATH_BENEFIT_LINE}, Alex`).length > 0).length, 1);
  assert.notDeepEqual(DIED[d], BASE[d]);
});

test('the super: cashed in the month of the death as ONE lump sum, never lost and never counted twice', () => {
  const d = index(DEATH_MONTH);
  // The amount is every cent of super Alex held when the month opened, paid whole: no tax withheld
  // (s 302-60). Without the death, Alex's own assets that month are the super plus the parcel; with
  // it, the parcel is Blair's — so the difference is the super, to the cent.
  const paid = amounts(DIED[d], `${SUPER_DEATH_BENEFIT_LINE}, Alex`)[0];
  assert.equal(paid, BASE[d].assetsByPerson[0].assessableAssets - DIED[d].assetsByPerson[1].assessableAssets);
  assert.ok(paid > toCents(39_000));
  // Gone from super in that month and every month after.
  for (const month of DIED.slice(d)) assert.equal(month.superBalance, 0, month.month);
  // Total wealth at the month's opening is the walk-without-it's to the cent: the balance moved into
  // cash, and the parcel moved to Blair, so nothing vanished and nothing was counted twice.
  assert.equal(DIED[d].protectedAssets + DIED[d].assessableAssets, BASE[d].protectedAssets + BASE[d].assessableAssets);
  // And the cash it became is there the month after.
  assert.ok(DIED[d + 1].openingBalance > BASE[d + 1].openingBalance + paid - toCents(5_000));
});

test('no income tax on the lump sum: the walk charges none in the year of the death, as without it', () => {
  const taxed = (months) => sum(months.flatMap((month) => month.lines.filter((line) => line.description.startsWith('Income tax')).map((line) => line.amount)));
  assert.equal(taxed(BASE), 0); // the control: this Household pays no income tax at all
  assert.equal(taxed(DIED), 0);
});

test('the survivor is paid the SINGLE rate from the month of the death, and nothing is paid for Alex', () => {
  const d = index(DEATH_MONTH);
  // Before: the couple's combined maximum. From the death: Blair's single maximum, month by month.
  const couple = agePensionEntitlement({ household: { persons: SMALL.persons, homeStatus: 'occupied' }, date: '2027-02-01', deemingRates: DEEMING });
  assert.deepEqual(amounts(DIED[d - 1], AGE_PENSION_LINE), [monthlyFromFortnightly(couple.householdRatePerFortnight)]);
  // Blair alone, holding nothing, is on the single maximum every month, indexed exactly as the walk
  // indexes it; the survivor's means stay inside every single free area, so the two agree.
  const ALONE = project(SETTINGS, { persons: [SMALL.persons[1]], homeStatus: 'occupied' }, [SPEND]);
  assert.equal(amounts(at(ALONE, DEATH_MONTH), AGE_PENSION_LINE)[0], monthlyFromFortnightly(alone(SMALL.persons[1], `${DEATH_MONTH}-01`).householdRatePerFortnight));
  for (const month of DIED.slice(d)) {
    assert.deepEqual(amounts(month, AGE_PENSION_LINE), amounts(at(ALONE, month.month), AGE_PENSION_LINE), month.month);
  }
  // And it is less than the couple's — the survivor is not left on the couple's rate.
  assert.ok(sum(amounts(DIED[d], AGE_PENSION_LINE)) < sum(amounts(BASE[d], AGE_PENSION_LINE)));
});

test('the bereavement payment: once, in the month of the death, at the Guide’s figure', () => {
  const d = index(DEATH_MONTH);
  const date = `${DEATH_MONTH}-01`;
  const ccr = agePensionEntitlement({ household: { persons: SMALL.persons, homeStatus: 'occupied' }, date, deemingRates: DEEMING }).householdRatePerFortnight;
  const nr = alone(SMALL.persons[1], date).householdRatePerFortnight;
  const expected = bereavementLumpSum({ coupleRatePerFortnight: ccr, singleRatePerFortnight: nr });
  assert.ok(expected > toCents(3_000));
  assert.deepEqual(amounts(DIED[d], AGE_PENSION_BEREAVEMENT_LINE), [expected]);
  assert.equal(DIED.filter((month) => amounts(month, AGE_PENSION_BEREAVEMENT_LINE).length > 0).length, 1);
  assert.equal(BASE.filter((month) => amounts(month, AGE_PENSION_BEREAVEMENT_LINE).length > 0).length, 0);
});

test('no bereavement payment where only the survivor was on the Age Pension', () => {
  // Alex is 60: never a pensioner, so the couple were not both pensioners (SS Guide 3.1.5.70).
  const younger = { ...SMALL, persons: [{ ...SMALL.persons[0], dateOfBirth: '1966-01-01' }, SMALL.persons[1]] };
  const months = project(SETTINGS, younger, [SPEND, death('2027-03-15')]);
  assert.ok(sum(amounts(at(months, DEATH_MONTH), AGE_PENSION_LINE)) > 0); // Blair is paid, as a single
  assert.equal(months.filter((month) => amounts(month, AGE_PENSION_BEREAVEMENT_LINE).length > 0).length, 0);
});

test('the deceased’s salary and the Guarantee on it stop in the month of the death', () => {
  const working = {
    persons: [
      { ...person('Alex', '1966-01-01', [{ phase: 'accumulation', balance: toCents(100_000) }]), employmentIncomePerFortnight: toCents(3_000) },
      person('Blair', '1952-01-01'),
    ],
    homeStatus: 'occupied',
  };
  const months = project(SETTINGS, working, [SPEND, death('2027-03-15')]);
  const paid = (month, prefix) => month.lines.filter((line) => line.description.startsWith(prefix) && line.description.includes('Alex'));
  const before = at(months, '2027-02');
  assert.ok(paid(before, 'Salary').length === 1 && paid(before, 'Superannuation Guarantee').length === 1); // the control
  for (const month of months.filter((each) => each.month >= DEATH_MONTH)) {
    assert.equal(paid(month, 'Salary').length, 0, month.month);
    assert.equal(paid(month, 'Superannuation Guarantee').length, 0, month.month);
  }
});

test('the parcels pass to the survivor at their own cost base; a pre-CGT parcel at its value at the death', () => {
  // One large parcel, sold whole by Blair the month after Alex dies. Bought 2010 for $100,000 and
  // worth $400,000: the gain is Alex's cost base against the sale, so Blair pays tax on it.
  const withParcel = (acquired) => ({
    persons: [
      person('Alex', '1950-01-01', [], [{ acquired, costBase: toCents(100_000), marketValue: toCents(400_000) }]),
      person('Blair', '1952-01-01'),
    ],
    homeStatus: 'occupied',
    openingOffsetBalance: toCents(10_000),
  });
  const sell = entry('sell', 'NON_SUPER_INVESTMENT', '2027-04-01', { direction: 'sell', amount: toCents(300_000) }, 'personB');
  const gainTax = (months) =>
    sum(months.flatMap((month) => month.lines.filter((line) => line.description.startsWith(CAPITAL_GAINS_TAX_LINE)).map((line) => line.amount)));
  const kept = project(SETTINGS, withParcel('2010-01-01'), [SPEND, death('2027-03-15'), sell]);
  assert.ok(gainTax(kept) > toCents(10_000), `the carried cost base should leave a large gain; tax was ${gainTax(kept)}`);
  assert.ok(at(kept, DEATH_MONTH).assetsByPerson[1].assessableAssets > toCents(400_000));
  assert.equal(at(kept, DEATH_MONTH).assetsByPerson[0].assessableAssets, 0);
  // Bought in 1980: it passes at its market value at the death, so a sale a month later is a small gain.
  const stepped = project(SETTINGS, withParcel('1980-01-01'), [SPEND, death('2027-03-15'), sell]);
  assert.ok(gainTax(stepped) < gainTax(kept) / 10, `a pre-CGT parcel kept its old cost base: tax ${gainTax(stepped)}`);
});

// --- What the walk refuses, by name ------------------------------------------------------------------

test('refused: a death that would leave part of a year’s fund earnings tax uncharged', () => {
  // With the super income yield Setting stated, an interest's earnings are taxed once, in June. An
  // accumulation account paid out at a March death would escape the tax on July–February.
  const accumulating = { ...SMALL, persons: [person('Alex', '1950-01-01', [{ phase: 'accumulation', balance: toCents(40_000) }]), SMALL.persons[1]] };
  const yielding = { ...SETTINGS, superIncomeYieldRate: 0.03 };
  assert.throws(() => project(yielding, accumulating, [SPEND, death('2027-03-15')]), /part-year fund earnings tax is not modelled/);
  // The controls: without the Setting, and with the account an Account-Based Pension (taxed at nil).
  assert.doesNotThrow(() => project(SETTINGS, accumulating, [SPEND, death('2027-03-15')]));
  assert.doesNotThrow(() => project(yielding, SMALL, [SPEND, death('2027-03-15')]));
});

test('refused: a second death, a death before the forecast, and a death beside an illness separation', () => {
  assert.throws(() => project(SETTINGS, SMALL, [SPEND, death('2027-03-01'), death('2028-03-01', 'personB', 'd2')]), /both DEATH: a second death/);
  assert.throws(() => project(SETTINGS, SMALL, [SPEND, death('2026-01-01')]), /before the forecast starts/);
  assert.throws(
    () => project(SETTINGS, SMALL, [SPEND, entry('sep', 'ILLNESS_SEPARATION', '2026-10-01'), death('2027-03-01')]),
    /illness is worked out differently/,
  );
});

test('refused: an entry that reaches the deceased dated in or after the month of the death', () => {
  const refused = /in or after 2027-03, the month Alex dies/;
  // Owned by Alex, dated in the death's own month and after it.
  assert.throws(() => project(SETTINGS, SMALL, [SPEND, death('2027-03-15'), entry('r', 'RETIRE', '2027-03-01', {}, 'personA')]), refused);
  assert.throws(() => project(SETTINGS, SMALL, [SPEND, death('2027-03-15'), entry('r', 'RETURN_CHANGE', '2029-01-01', { rate: 0.05 }, 'personA')]), refused);
  // Owned by the Household, and reaching both.
  assert.throws(() => project(SETTINGS, SMALL, [SPEND, death('2027-03-15'), entry('r', 'RETURN_CHANGE', '2029-01-01', { rate: 0.05 })]), refused);
  // Into the super of a spouse who has died.
  assert.throws(
    () => project(SETTINGS, SMALL, [SPEND, death('2027-03-15'), entry('sp', 'SPOUSE_CONTRIBUTION', '2028-01-01', { amount: toCents(1_000), interestIndex: 0 }, 'personB')]),
    refused,
  );
  // The controls: the same entry dated the month BEFORE, one for the survivor, and a Household fact
  // after the death are all walked.
  assert.doesNotThrow(() => project(SETTINGS, SMALL, [SPEND, death('2027-03-15'), entry('r', 'RETURN_CHANGE', '2027-02-01', { rate: 0.05 }, 'personA')]));
  assert.doesNotThrow(() => project(SETTINGS, SMALL, [SPEND, death('2027-03-15'), entry('r', 'RETURN_CHANGE', '2029-01-01', { rate: 0.05 }, 'personB')]));
  assert.doesNotThrow(() => project(SETTINGS, SMALL, [SPEND, death('2027-03-15'), entry('s2', 'SPEND_CHANGE', '2027-04-01', { annualSpend: toCents(30_000) })]));
  // Switched off, it refuses nothing.
  assert.doesNotThrow(() => project(SETTINGS, SMALL, [SPEND, death('2027-03-15'), { ...entry('r', 'RETIRE', '2027-03-01', {}, 'personA'), enabled: false }]));
});

// --- Income tax: a couple to the end of the year of the death, single after (P12-1c, O91) ------------

test('income tax: the survivor is taxed as one of a couple to the end of the year of the death, and single after', () => {
  // Blair, 74, still earning $1,500 a fortnight — so there is income tax to assess, and a SAPTO that
  // is a couple's with Alex's unused offset transferred, or a single person's.
  const blair = { ...person('Blair', '1952-01-01', [{ phase: 'accumulation', balance: toCents(0) }]), employmentIncomePerFortnight: toCents(1_500) };
  const couple = { ...SMALL, persons: [SMALL.persons[0], blair] };
  const base = project(SETTINGS, couple, [SPEND]);
  const died = project(SETTINGS, couple, [SPEND, death('2027-03-15')]);
  const aloneWalk = project(SETTINGS, { persons: [blair], homeStatus: 'occupied' }, [SPEND]);
  const taxOf = (months, month) => amounts(at(months, month), 'Income tax, Blair');
  // In the year of the death, after it: the couple's assessment, the one the walk without the death makes.
  for (const month of ['2027-03', '2027-04', '2027-06']) {
    assert.deepEqual(taxOf(died, month), taxOf(base, month), month);
    assert.notDeepEqual(taxOf(died, month), taxOf(aloneWalk, month), `${month}: the control — a couple's and a single's tax differ here`);
  }
  // The year of the death is SETTLED as a couple's, too: Alex was qualified for the Age Pension at a
  // time during it (s 160AAAA(2)(b)), so the true-up is the one the walk without the death makes.
  const trueUp = (months) => amounts(at(months, '2027-07'), 'Income tax year-end true-up, Blair, 2026-27');
  assert.deepEqual(trueUp(died), trueUp(base));
  // The next financial year: the single person's assessment, month by month.
  for (const month of ['2027-08', '2027-12', '2028-06']) {
    assert.deepEqual(taxOf(died, month), taxOf(aloneWalk, month), month);
    assert.notDeepEqual(taxOf(died, month), taxOf(base, month), `${month}: the control`);
  }
});

test('O91 — in the year of the death the couple’s offset never exceeds what the ATO’s code table gives the survivor', () => {
  // The ATO's SAPTO codes (myTax 2025, "Tax offset codes"): a survivor is code A — "single, separated
  // or widowed" — unless code D also applies (both eligible, lived together) and the spouse's taxable
  // income was under $12,494, when D is used. The walk keeps the couple's assessment for the whole
  // year, so the survivor gets code D (or E, the spouse not eligible) and the transfer. That is an
  // acceptable limit only if it never gives MORE offset than the code table does. The Medicare levy
  // is a family's in both — a spouse who died during the year still counts (ATO, "Medicare levy
  // reduction – family taxable income") — so on these facts less offset is never less tax.
  let compared = 0;
  let less = 0;
  for (const fy of ['2026-27', '2027-28']) {
    const persona = (name, dollars, qualified) => {
      const ti = taxableIncome(toCents(dollars));
      return { name, taxableIncome: ti, rebateIncome: rebateIncomeFrom(ti), qualifiedForAgePension: qualified, netLabourIncome: netLabourIncomeFromSalary(fy, toCents(0), toCents(0)) };
    };
    for (const deceasedQualified of [true, false]) {
      for (let s = 0; s <= 100_000; s += 2_500) {
        for (let d = 0; d <= 100_000; d += 2_500) {
          let asCouple;
          try {
            asCouple = householdIncomeTax({ fy, relationship: 'couple', persons: [persona('S', s, true), persona('D', d, deceasedQualified)] }).persons[0].sapto;
          } catch (refusal) {
            // The Medicare levy's s 8(4) spouse-excess refusal, a couple's in any year: not this limit's.
            assert.match(refusal.message, /s 8\(4\) excess/);
            continue;
          }
          const asSingle = householdIncomeTax({ fy, relationship: 'single', persons: [persona('S', s, true)] }).persons[0].sapto;
          const codeTable = deceasedQualified && d < 12_494 ? asCouple : asSingle;
          compared += 1;
          assert.ok(asCouple <= codeTable, `${fy}, survivor $${s}, deceased $${d}: couple ${asCouple} against the code table's ${codeTable}`);
          if (asCouple < codeTable) less += 1;
        }
      }
    }
  }
  assert.ok(compared > 6_000, `${compared}`);
  assert.ok(less > 1_000, `only ${less} comparisons differ — the direction would be vacuous`);
});

// --- What the page shows: no age for a Person who has died (P12-1d) -----------------------------------

test('Month.died: absent before the death, the deceased’s index from its month on', () => {
  const d = index(DEATH_MONTH);
  for (const month of DIED.slice(0, d)) assert.ok(!('died' in month), month.month);
  for (const month of DIED.slice(d)) assert.deepEqual(month.died, [0], month.month);
  for (const month of BASE) assert.ok(!('died' in month));
});

test('ages: before the death both, from its month the survivor alone — on the axis, the markers and the chat', () => {
  const d = index(DEATH_MONTH);
  const before = agesAt(SMALL, DIED[d - 1]);
  const after = agesAt(SMALL, DIED[d]);
  assert.deepEqual(before.ages.map(({ name }) => name), ['Alex', 'Blair']);
  assert.deepEqual(after.ages, [{ name: 'Blair', age: 75 }]);
  assert.deepEqual(after.died, [0]);
  assert.equal(agesCaption(after), '2027-03 (Blair 75)');
  // The axis keeps each Person's place under its title, and prints no age for Alex.
  const axis = ageAxis(DIED, SMALL);
  assert.deepEqual(axis.labels[d - 1], ['77', '75']);
  assert.deepEqual(axis.labels[d], [AGE_DIED, '75']);
  // The chat labels each age by its own Person, so Blair stays Person B after Alex has gone.
  assert.deepEqual(anonymousAges(SMALL, DIED[d]), [{ person: 'Person B', age: 75 }]);
  assert.deepEqual(anonymousAges(SMALL, DIED[d - 1]).map(({ person }) => person), ['Person A', 'Person B']);
});

test('a marker after the death carries the survivor’s age alone', () => {
  // Spending well past what a single pensioner's money can carry: the first shortfall comes after the death.
  const lavish = entry('sc', 'SPEND_CHANGE', '2026-09-01', { annualSpend: toCents(90_000) });
  const months = project(SETTINGS, SMALL, [lavish, death('2027-03-15')]);
  const short = shortfallAge(months, SMALL);
  assert.ok(short.firstShortfall !== undefined && short.firstShortfall.month >= DEATH_MONTH, JSON.stringify(short.firstShortfall));
  assert.deepEqual(short.firstShortfall.ages.map(({ name }) => name), ['Blair']);
  const series = monthsToSeries(months, SMALL, undefined, undefined, [lavish, death('2027-03-15')]);
  const marker = series.markers.find((each) => each.key === 'shortfall');
  assert.deepEqual(marker.ages.map(({ name }) => name), ['Blair']);
});

// --- Byte-identity: no death, no change (P12-1e) --------------------------------------------------------

test('without a DEATH the demo walk is byte-identical — and with one switched off too', () => {
  // The digest `app-chat-identity.test.mjs` pins, from before P12-1 existed. The connector fixture's
  // own digest is pinned in `app-chat-identity.test.mjs` and `app-chat-get-month.test.mjs` — it DID
  // move, on 2026-09-24 (T135), for the same reason this one did.
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
  const off = { ...death('2050-07-01', 'personB'), enabled: false };
  assert.equal(sha256(project(DEMO_SETTINGS, DEMO_HOUSEHOLD, [...DEMO_ENTRIES, off])), DEMO_DIGEST);
  // The control: switched on, the demo couple's walk does move, so neither equality is the digest
  // of a walk the entry could never reach.
  assert.notEqual(sha256(project(DEMO_SETTINGS, DEMO_HOUSEHOLD, [...DEMO_ENTRIES, { ...off, enabled: true }])), DEMO_DIGEST);
});
