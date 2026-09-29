// P3-17a SLICE 1 — DEATH AND TPD INSURANCE INSIDE A SUPER ACCOUNT, PRICED BY AGE.
//
// Every figure below is hand-worked from Aware's Table 1/Table 2 (Insurance Handbook pp.17-18) and
// the formula in docs/research/p3-17a-insurance.md, never read off the engine:
//   premium in month m = stated × f(age_m) / f(age_0); f = rate (fixed) or cover × rate (age-based).
import test from 'node:test';
import assert from 'node:assert/strict';

import { toCents } from '../dist/core/money.js';
import {
  GROWTH_LINE,
  INTERNAL_TRANSFER_LINES,
  NO_STATING_ENTRY,
  SUPER_ADMINISTRATION_FEE_LINE,
  SUPER_INSURANCE_LINE,
  UNLEGISLATED,
  project,
  superPoolName,
} from '../dist/core/projection.js';
import {
  AGE_BASED_COVER_DOLLARS,
  DEATH_RATE_CENTS_PER_THOUSAND,
  INCOME_PROTECTION_BENEFIT_PERIODS,
  INCOME_PROTECTION_ENDS_AT_AGE,
  INCOME_PROTECTION_RATE_CENTS_PER_THOUSAND,
  INSURANCE_COVER_ENDS_AT_AGE,
  INSURANCE_FIRST_AGE,
  TPD_RATE_CENTS_PER_THOUSAND,
} from '../dist/core/superInsurance.js';
import { PlanFileEntryError, PlanFileHouseholdError, parsePlan } from '../dist/core/parsePlan.js';
import { DEMO_PLAN } from '../dist/app/demoHousehold.js';
import {
  BLANK_SUPER_INTEREST,
  INCOME_PROTECTION_BENEFIT_PERIOD_CHOICES,
  INSURANCE_COVER_CHOICES,
  negativeFeeObjection,
  planWithEntry,
  planWithStatedPosition,
  positionFormValues,
} from '../dist/app/planEdits.js';

const person = (name, dateOfBirth, over = {}) => ({
  name,
  dateOfBirth,
  superInterests: [],
  parcels: [],
  employmentIncomePerFortnight: toCents(0),
  workBonusBalance: toCents(0),
  ...over,
});

const settings = (over = {}) => ({
  asAtDate: '2026-09-16',
  planningHorizonAge: 48,
  economicSeries: { cpi: 0.025, pblci: 0.025, awote: 0.035, mtawe: 0.035 },
  deemingRates: { lower: 0.0175, upper: 0.0375 },
  nominalReturn: 0.065,
  ...over,
});

// Dev is 46 at 2026-09-01 (the walk's first month) and turns 47 on 2027-01-15, so 2027-02 is the
// first month read at 47. Months: 2026-09 = [0] … 2027-01 = [4], 2027-02 = [5].
const DEV = (stated = {}, balance = 100_000) => ({
  persons: [person('Dev', '1980-01-15', { superInterests: [{ phase: 'accumulation', balance: toCents(balance), ...stated }] })],
  homeStatus: 'occupied',
});

const INSURANCE = `${SUPER_INSURANCE_LINE}, Dev — ${superPoolName('accumulation')}`;
const ADMIN = `${SUPER_ADMINISTRATION_FEE_LINE}, Dev — ${superPoolName('accumulation')}`;
const amountOf = (month, description) => {
  const found = month.lines.filter((line) => line.description === description);
  return found.length === 0 ? undefined : found[0].amount;
};

test('the two tables are Aware’s, age 15 to 69, and the cover ends at 70', () => {
  for (const table of [AGE_BASED_COVER_DOLLARS, DEATH_RATE_CENTS_PER_THOUSAND, TPD_RATE_CENTS_PER_THOUSAND]) {
    assert.equal(table.length, INSURANCE_COVER_ENDS_AT_AGE - INSURANCE_FIRST_AGE);
    assert.ok(Object.isFrozen(table));
  }
  assert.equal(INSURANCE_FIRST_AGE, 15);
  assert.equal(INSURANCE_COVER_ENDS_AT_AGE, 70);
  const at = (table, age) => table[age - INSURANCE_FIRST_AGE];
  // Spot checks off the PDF: both ends, the plateau, and Handbook p.17's own worked examples.
  assert.deepEqual([at(AGE_BASED_COVER_DOLLARS, 15), at(AGE_BASED_COVER_DOLLARS, 30), at(AGE_BASED_COVER_DOLLARS, 40), at(AGE_BASED_COVER_DOLLARS, 69)], [27_000, 224_100, 261_000, 10_000]);
  assert.deepEqual([at(DEATH_RATE_CENTS_PER_THOUSAND, 15), at(DEATH_RATE_CENTS_PER_THOUSAND, 30), at(DEATH_RATE_CENTS_PER_THOUSAND, 55), at(DEATH_RATE_CENTS_PER_THOUSAND, 69)], [14, 26, 163, 765]);
  assert.deepEqual([at(TPD_RATE_CENTS_PER_THOUSAND, 15), at(TPD_RATE_CENTS_PER_THOUSAND, 30), at(TPD_RATE_CENTS_PER_THOUSAND, 64), at(TPD_RATE_CENTS_PER_THOUSAND, 69)], [2, 32, 1_714, 1_714]);
});

test('ABSENT IS NIL: no insurance field, and an admin fee with no premium, walk byte-identically', () => {
  const absent = JSON.stringify(project(settings(), DEV(), []));
  assert.equal(JSON.stringify(project(settings(), DEV({ statedInsuranceCoverKind: 'fixed', statedDeathPremiumPerYear: toCents(0) }), [])), absent);
  // Not reachable through the door (refused there), but the walk must not charge it either.
  assert.equal(JSON.stringify(project(settings(), DEV({ statedInsuranceCoverKind: 'fixed', statedInsuranceAdminFeePerYear: toCents(22.2) }), [])), absent);
  assert.ok(!absent.includes(SUPER_INSURANCE_LINE));
});

test('HAND-WORKED — FIXED cover scales by the Table 2 rate alone, death and TPD separately', () => {
  //   death $300 fixed: age 46 rate 63c, age 47 rate 68c.  30,000 × 68 / 63 = 32,380.95 → ⌈÷12⌉ = 2,699
  //   TPD   $120 fixed: age 46 161c,     age 47 176c.     12,000 × 176 / 161 = 13,118.01 → ⌈÷12⌉ = 1,094
  //   month 0 (ratio 1): ⌈30,000÷12⌉ + ⌈12,000÷12⌉ = 2,500 + 1,000 = 3,500
  const months = project(settings(), DEV({
    statedInsuranceCoverKind: 'fixed', statedDeathPremiumPerYear: toCents(300), statedTpdPremiumPerYear: toCents(120),
  }), []);
  assert.equal(months[0].month, '2026-09');
  assert.equal(amountOf(months[0], INSURANCE), 3_500);
  assert.equal(amountOf(months[4], INSURANCE), 3_500, '2027-01 is still read at 46: age last birthday on the 1st');
  assert.equal(months[5].month, '2027-02');
  assert.equal(amountOf(months[5], INSURANCE), 2_699 + 1_094);
});

test('HAND-WORKED — AGE-BASED cover scales by cover × rate, so the premium FALLS at 47', () => {
  //   death $300: (143,400 × 68) / (167,200 × 63) → 27,771.70 → ⌈÷12⌉ = 2,315
  //   TPD   $120: (143,400 × 176) / (167,200 × 161) → 11,250.74 → ⌈÷12⌉ = 938
  const months = project(settings(), DEV({
    statedInsuranceCoverKind: 'age-based', statedDeathPremiumPerYear: toCents(300), statedTpdPremiumPerYear: toCents(120),
  }), []);
  assert.equal(amountOf(months[0], INSURANCE), 3_500);
  assert.equal(amountOf(months[5], INSURANCE), 2_315 + 938);
});

test('the premium is NOT CPI-raised; the insurance admin fee IS, and the note says so', () => {
  const stated = { statedInsuranceCoverKind: 'fixed', statedDeathPremiumPerYear: toCents(300) };
  const flat = settings({ economicSeries: { cpi: 0, pblci: 0, awote: 0, mtawe: 0 } });
  const premiumOnly = (s) => project(s, DEV(stated), []).map((month) => amountOf(month, INSURANCE));
  assert.deepEqual(premiumOnly(settings()), premiumOnly(flat), 'a premium moved with the price level');
  // The admin fee: $22.20 → ⌈2,220 ÷ 12⌉ = 185 at cpi 0; raised at cpi 2.5% by month 4.
  const withAdmin = (s) => project(s, DEV({ ...stated, statedInsuranceAdminFeePerYear: toCents(22.2) }), []);
  assert.equal(amountOf(withAdmin(flat)[4], INSURANCE), 2_500 + 185);
  assert.ok(amountOf(withAdmin(settings())[4], INSURANCE) > 2_500 + 185, 'the admin fee is not raised by CPI');
  const [line] = withAdmin(settings())[0].lines.filter((l) => l.description === INSURANCE);
  assert.equal(line.direction, 'outflow');
  assert.equal(line.effect, 'wealth');
  assert.equal(line.provenance, UNLEGISLATED.superInsurance);
  assert.equal(line.attribution, NO_STATING_ENTRY.superInsurance);
  assert.match(line.provenance.note, /NOT raised by CPI/);
  assert.match(line.provenance.note, /at the age the account states for them.*or at 70 where none is stated/);
  assert.match(line.provenance.note, /administration fee is charged while any one of the three premiums is/);
});

test('EVERYTHING STOPS AT 70 — premiums and the admin fee, in the month the age reads 70', () => {
  // Born 1957-03-10: 69 at 2026-09-01, still 69 at 2027-03-01, 70 at 2027-04-01. Months [0]..[6] pay.
  const household = {
    persons: [person('Dev', '1957-03-10', { superInterests: [{
      phase: 'accumulation', balance: toCents(100_000), statedInsuranceCoverKind: 'fixed',
      statedDeathPremiumPerYear: toCents(500), statedTpdPremiumPerYear: toCents(100), statedInsuranceAdminFeePerYear: toCents(22.2),
    }] })],
    homeStatus: 'occupied',
  };
  const months = project(settings({ planningHorizonAge: 72 }), household, []);
  const paying = months.filter((month) => amountOf(month, INSURANCE) !== undefined).map((month) => month.month);
  assert.deepEqual(paying, ['2026-09', '2026-10', '2026-11', '2026-12', '2027-01', '2027-02', '2027-03']);
  assert.ok(months.length > 20, 'the walk runs well past 70, so the stop is not the end of the walk');
});

test('the premium is deducted before growth and every cent is on the line — the wealth identity closes', () => {
  const months = project(settings({ planningHorizonAge: 50 }), DEV({
    statedInsuranceCoverKind: 'age-based', statedDeathPremiumPerYear: toCents(300), statedTpdPremiumPerYear: toCents(120),
    statedAdministrationFeePerYear: toCents(125), statedInvestmentFeeRate: 0.005,
  }), []);
  // Month 0 by hand: 10,000,000 − admin ⌈12,500÷12⌉ 1,042 − investment ⌈10,000,000×0.005÷12⌉ 4,167
  //   − insurance 3,500 = 9,991,291; growth ⌊9,991,291 × 1.065^(1/12)⌋ − 9,991,291 = 52,571.
  assert.equal(amountOf(months[0], `${GROWTH_LINE}, Dev — ${superPoolName('accumulation')}`), 52_571);
  const INTERNAL = new RegExp(`^(${INTERNAL_TRANSFER_LINES.join('|')})`);
  const signed = (month, predicate) => month.lines.filter(predicate)
    .reduce((total, line) => total + (line.direction === 'inflow' ? line.amount : -line.amount), 0);
  let insured = 0;
  for (let index = 0; index + 1 < months.length; index += 1) {
    const [month, next] = [months[index], months[index + 1]];
    const delta = next.protectedAssets + next.assessableAssets - (month.protectedAssets + month.assessableAssets);
    const wealth = signed(month, (line) => line.effect === 'wealth');
    const internal = signed(month, (line) => line.effect === 'cash' && INTERNAL.test(line.description));
    assert.equal(delta, wealth + month.closingBalance - month.openingBalance - internal, month.month);
    if (amountOf(month, INSURANCE) !== undefined) insured += 1;
  }
  assert.equal(insured, months.length - 1);
});

test('an account short of its fees pays insurance LAST', () => {
  // $20.00 balance: admin ⌈12,000÷12⌉ = 1,000 first, then insurance gets the 1,000 that is left.
  const months = project(settings(), DEV({
    statedAdministrationFeePerYear: toCents(120), statedInsuranceCoverKind: 'fixed', statedDeathPremiumPerYear: toCents(300),
  }, 20), []);
  assert.equal(amountOf(months[0], ADMIN), 1_000);
  assert.equal(amountOf(months[0], INSURANCE), 1_000);
  assert.equal(amountOf(months[1], INSURANCE), undefined, 'an empty account pays nothing and emits nothing');
});

// --- THE DOOR ------------------------------------------------------------------------------------

const withInterest = (fields) => {
  const plan = structuredClone(DEMO_PLAN);
  Object.assign(plan.household.persons[0].superInterests[0], fields);
  return plan;
};
const refusedAt = (fields, key) => assert.throws(() => parsePlan(withInterest(fields)), (error) =>
  error instanceof PlanFileHouseholdError && error.message.includes(`superInterests[0].${key}`));

test('the door: a premium needs its cover kind, and a kind or an admin fee needs a premium — each refused by name', () => {
  refusedAt({ statedDeathPremiumPerYear: 30_000 }, 'statedInsuranceCoverKind');
  refusedAt({ statedTpdPremiumPerYear: 12_000 }, 'statedInsuranceCoverKind');
  refusedAt({ statedInsuranceCoverKind: 'fixed' }, 'statedInsuranceCoverKind');
  refusedAt({ statedInsuranceAdminFeePerYear: 2_220 }, 'statedInsuranceAdminFeePerYear');
  refusedAt({ statedDeathPremiumPerYear: -1, statedInsuranceCoverKind: 'fixed' }, 'statedDeathPremiumPerYear');
  refusedAt({ statedDeathPremiumPerYear: 30_000, statedInsuranceCoverKind: 'level' }, 'statedInsuranceCoverKind');
  const stated = { statedDeathPremiumPerYear: 30_000, statedTpdPremiumPerYear: 12_000, statedInsuranceCoverKind: 'age-based', statedInsuranceAdminFeePerYear: 2_220 };
  const interest = parsePlan(withInterest(stated)).household.persons[0].superInterests[0];
  for (const [key, value] of Object.entries(stated)) assert.equal(interest[key], value, key);
});

// --- THE FORM ------------------------------------------------------------------------------------

const POSITION = positionFormValues(DEMO_PLAN);
const withBoxes = (boxes) => ({
  ...POSITION,
  persons: POSITION.persons.map((p, i) => (i !== 0 ? p : {
    ...p, superInterests: p.superInterests.map((s, j) => (j === 0 ? { ...s, ...boxes } : s)),
  })),
});
const INSURANCE_KEYS = ['statedDeathPremiumPerYear', 'statedTpdPremiumPerYear', 'statedInsuranceCoverKind', 'statedInsuranceAdminFeePerYear'];

test('the form: blank insurance boxes write no key, and the cover type is never preselected', () => {
  assert.deepEqual([BLANK_SUPER_INTEREST.deathPremiumPerYear, BLANK_SUPER_INTEREST.tpdPremiumPerYear, BLANK_SUPER_INTEREST.insuranceCoverKind, BLANK_SUPER_INTEREST.insuranceAdminFeePerYear], ['', '', '', '']);
  assert.equal(INSURANCE_COVER_CHOICES[0].value, '');
  assert.deepEqual(INSURANCE_COVER_CHOICES.slice(1).map((choice) => choice.value), ['fixed', 'age-based']);
  assert.equal(POSITION.persons[0].superInterests[0].insuranceCoverKind, '', 'a plan with no kind opens on the unchosen option');
  const candidate = planWithStatedPosition(DEMO_PLAN, POSITION);
  for (const p of candidate.household.persons) {
    for (const interest of p.superInterests) {
      for (const key of INSURANCE_KEYS) assert.equal(Object.hasOwn(interest, key), false, `a blank box wrote ${key}`);
    }
  }
  assert.deepEqual(parsePlan(candidate), parsePlan(DEMO_PLAN));
});

test('the form: stated boxes reach the file in cents and come back as typed, twice over', () => {
  const boxes = { deathPremiumPerYear: '310.00', tpdPremiumPerYear: '190.50', insuranceCoverKind: 'age-based', insuranceAdminFeePerYear: '22.20' };
  const saved = parsePlan(planWithStatedPosition(DEMO_PLAN, withBoxes(boxes)));
  const interest = saved.household.persons[0].superInterests[0];
  assert.deepEqual(INSURANCE_KEYS.map((key) => interest[key]), [31_000, 19_050, 'age-based', 2_220]);
  const reopened = positionFormValues(saved).persons[0].superInterests[0];
  assert.deepEqual([reopened.deathPremiumPerYear, reopened.tpdPremiumPerYear, reopened.insuranceCoverKind, reopened.insuranceAdminFeePerYear], ['310.00', '190.50', 'age-based', '22.20']);
  const again = parsePlan(planWithStatedPosition(saved, positionFormValues(saved)));
  assert.deepEqual(again, saved);
  const cleared = planWithStatedPosition(saved, withBoxes({ deathPremiumPerYear: '', tpdPremiumPerYear: '', insuranceCoverKind: '', insuranceAdminFeePerYear: '' }));
  for (const key of INSURANCE_KEYS) assert.equal(Object.hasOwn(cleared.household.persons[0].superInterests[0], key), false, key);
});

// --- SLICE 3: INSURANCE_COVER_CHANGE -------------------------------------------------------------
//
// The premium for a benefit from the entry's month on = the slice 1 premium × coverFraction, each
// benefit a ceiled twelfth on its own; the admin fee stops once both are nil. Hand-worked from the
// same Aware rates as above.

const cover = (id, date, benefit, coverFraction, interestIndex = 0) =>
  ({ id, type: 'INSURANCE_COVER_CHANGE', date, owner: 'personA', params: { interestIndex, benefit, coverFraction }, enabled: true, createdAt: '2026-09-25' });
const FIXED = { statedInsuranceCoverKind: 'fixed', statedDeathPremiumPerYear: toCents(300), statedTpdPremiumPerYear: toCents(120) };

test('HAND-WORKED — death cancelled at 60: the death line goes to nil and TPD carries on', () => {
  // Born 1967-03-10: 59 to 2027-03, 60 from 2027-04 ([7]). TPD at 60: 12,000 × 973 / 844 → ⌈÷12⌉ = 1,153.
  const household = { persons: [person('Dev', '1967-03-10', { superInterests: [{ phase: 'accumulation', balance: toCents(100_000), ...FIXED }] })], homeStatus: 'occupied' };
  const months = project(settings({ planningHorizonAge: 62 }), household, [cover('cancel-death', '2027-04-01', 'death', 0)]);
  const without = project(settings({ planningHorizonAge: 62 }), household, []);
  assert.equal(months[6].month, '2027-03');
  assert.equal(amountOf(months[6], INSURANCE), 2_500 + 1_000, 'before the change, both');
  assert.equal(months[7].month, '2027-04');
  assert.equal(amountOf(months[7], INSURANCE), 1_153, 'TPD alone');
  assert.ok(amountOf(without[7], INSURANCE) > 1_153, 'the control: without the entry, death is charged too');
  const [line] = months[7].lines.filter((l) => l.description === INSURANCE);
  assert.deepEqual(line.attribution, { basis: 'entries', entryIds: ['cancel-death'] });
  assert.equal(months[6].lines.find((l) => l.description === INSURANCE).attribution, NO_STATING_ENTRY.superInsurance);
});

test('HAND-WORKED — both halved: exactly half, ceiled per component', () => {
  // Month 0: ⌈15,000÷12⌉ + ⌈6,000÷12⌉ = 1,250 + 500 = 1,750, half of 3,500.
  // Month 5 (47): ⌈32,380.95 × 0.5 ÷ 12⌉ = 1,350 and ⌈13,118.01 × 0.5 ÷ 12⌉ = 547 — 1,897, not 3,793 ÷ 2.
  const months = project(settings(), DEV(FIXED), [cover('halve', '2026-09-01', 'both', 0.5)]);
  assert.equal(amountOf(months[0], INSURANCE), 1_750);
  assert.equal(amountOf(months[5], INSURANCE), 1_350 + 547);
});

test('both cancelled, one benefit at a time: the admin fee stops with the second', () => {
  // cpi 0: admin ⌈2,220÷12⌉ = 185. Death off from [2]: TPD + admin = 1,185. TPD off from [4]: nothing.
  const flat = settings({ economicSeries: { cpi: 0, pblci: 0, awote: 0, mtawe: 0 } });
  const months = project(flat, DEV({ ...FIXED, statedInsuranceAdminFeePerYear: toCents(22.2) }), [
    cover('death-off', '2026-11-01', 'death', 0),
    cover('tpd-off', '2027-01-01', 'tpd', 0),
  ]);
  assert.deepEqual(months.slice(0, 6).map((month) => amountOf(month, INSURANCE)), [3_685, 3_685, 1_185, 1_185, undefined, undefined]);
  assert.ok(months.every((month, index) => index < 4 || amountOf(month, INSURANCE) === undefined), 'a line after both are cancelled');
});

test('a later change for the same interest and benefit replaces an earlier one, by date not by order stated', () => {
  // Stated out of date order. From [2] both at 50%: 1,250 + 500. From [4] TPD cancelled, death still
  // 50% from the 'both': 1,250. From [5] death at 25%: ⌈32,380.95 × 0.25 ÷ 12⌉ = 675.
  const months = project(settings(), DEV(FIXED), [
    cover('death-quarter', '2027-02-01', 'death', 0.25),
    cover('tpd-off', '2027-01-01', 'tpd', 0),
    cover('both-half', '2026-11-01', 'both', 0.5),
  ]);
  assert.deepEqual(months.slice(0, 6).map((month) => amountOf(month, INSURANCE)), [3_500, 3_500, 1_750, 1_750, 1_250, 675]);
  const attribution = (index) => months[index].lines.find((l) => l.description === INSURANCE).attribution;
  assert.deepEqual(attribution(4), { basis: 'entries', entryIds: ['both-half', 'tpd-off'] });
  assert.deepEqual(attribution(5), { basis: 'entries', entryIds: ['death-quarter', 'tpd-off'] });
});

test('the door: 100% or more, no premium for the benefit, 70 or older, and a household owner are each refused by name', () => {
  // Dana (1968-05-14) turns 70 on 2038-05-14. Only a death premium is stated.
  const plan = withInterest({ statedInsuranceCoverKind: 'fixed', statedDeathPremiumPerYear: 30_000 });
  const entry = (params, over = {}) => ({ id: 'ic', type: 'INSURANCE_COVER_CHANGE', date: '2030-01-01', owner: 'personA', params, enabled: true, createdAt: '2026-09-25', ...over });
  const refused = (candidate, where, words) => assert.throws(() => parsePlan(planWithEntry(plan, candidate)), (error) =>
    error instanceof PlanFileEntryError && error.message.includes(where) && words.test(error.message), where);
  refused(entry({ interestIndex: 0, benefit: 'death', coverFraction: 1 }), 'coverFraction', /raising cover is not modelled/);
  refused(entry({ interestIndex: 0, benefit: 'death', coverFraction: 1.5 }), 'coverFraction', /underwriting/);
  refused(entry({ interestIndex: 0, benefit: 'death', coverFraction: -0.1 }), 'coverFraction', /from 0/);
  refused(entry({ interestIndex: 0, benefit: 'tpd', coverFraction: 0 }), 'params.benefit', /no TPD premium/);
  refused(entry({ interestIndex: 0, benefit: 'both', coverFraction: 0 }), 'params.benefit', /no TPD premium/);
  refused(entry({ interestIndex: 0, benefit: 'life', coverFraction: 0 }), 'benefit', /"death", "tpd", "both"/);
  refused(entry({ interestIndex: 0, benefit: 'death', coverFraction: 0 }, { date: '2038-05-14' }), '.date', /70th birthday/);
  refused(entry({ interestIndex: 0, benefit: 'death', coverFraction: 0 }, { owner: 'household' }), '.owner', /one Person's super account/);
  // A change before the plan starts would scale today's stated premium a second time.
  refused(entry({ interestIndex: 0, benefit: 'death', coverFraction: 0 }, { date: '2026-08-01' }), '.date', /before the plan starts/);
  refused(entry({ interestIndex: 3, benefit: 'death', coverFraction: 0 }), 'interestIndex', /not in the file/);
  const saved = parsePlan(planWithEntry(plan, entry({ interestIndex: 0, benefit: 'death', coverFraction: 0 }, { date: '2038-05-01' })));
  assert.deepEqual(saved.entries.at(-1).params, { interestIndex: 0, benefit: 'death', coverFraction: 0 });
});

// --- P3-17b: INCOME PROTECTION -------------------------------------------------------------------
//
// Hand-worked from Aware's Table 4 (Insurance Handbook p.20, 30 April 2026) and its own formula
// (p.19): premium = cover/1,000 × Table 4 rate × category factor × waiting-period factor × (1 +
// loading). IP cover is always fixed, so the walk's ratio is the rate alone, in the stated
// benefit period's column: premium in month m = stated × rate(age_m) / rate(age_0), nil from 65.

const IP_INSURANCE = INSURANCE;

test('Table 4 is Aware’s, age 15 to 64 in three benefit-period columns, and IP ends at 65', () => {
  assert.equal(INCOME_PROTECTION_ENDS_AT_AGE, 65);
  assert.deepEqual(INCOME_PROTECTION_BENEFIT_PERIODS, ['2-years', '5-years', 'to-65']);
  assert.deepEqual(Object.keys(INCOME_PROTECTION_RATE_CENTS_PER_THOUSAND), INCOME_PROTECTION_BENEFIT_PERIODS);
  for (const column of Object.values(INCOME_PROTECTION_RATE_CENTS_PER_THOUSAND)) {
    assert.equal(column.length, INCOME_PROTECTION_ENDS_AT_AGE - INSURANCE_FIRST_AGE);
    assert.ok(Object.isFrozen(column));
  }
  const at = (period, age) => INCOME_PROTECTION_RATE_CENTS_PER_THOUSAND[period][age - INSURANCE_FIRST_AGE];
  // Spot checks off the PDF text (pdftotext -layout, Table 4): both ends of every column, the two
  // worked examples' own cells, the to-65 peak and the 2-year column's turn down at 63.
  assert.deepEqual([at('2-years', 15), at('5-years', 15), at('to-65', 15)], [97, 229, 453]);
  assert.deepEqual([at('2-years', 64), at('5-years', 64), at('to-65', 64)], [548, 572, 688]);
  assert.equal(at('2-years', 36), 128, 'Ruby, p.19: $1.28');
  assert.equal(at('5-years', 30), 231, 'Amanda, p.19: $2.31');
  assert.deepEqual([at('to-65', 58), at('5-years', 59), at('2-years', 62), at('2-years', 63)], [3_459, 2_820, 1_731, 1_520]);
});

// Ruby (Handbook p.19, Example 1): 36, $36,000 a year of IP cover, 2-year benefit period, 90-day
// wait, Low Risk: 36 × $1.28 × 1.00 × 1.00 = $46.08. At 37 the same formula gives 36 × $1.39 =
// $50.04, and the ratio gives 4,608 × 139 / 128 = 5,004 exactly. Born 1990-01-15: 36 at 2026-09-01,
// 37 from 2027-02 ([5]).
const RUBY = (stated) => ({
  persons: [person('Ruby', '1990-01-15', { superInterests: [{ phase: 'accumulation', balance: toCents(100_000), ...stated }] })],
  homeStatus: 'occupied',
});
const RUBY_LINE = `${SUPER_INSURANCE_LINE}, Ruby — ${superPoolName('accumulation')}`;

test('HAND-WORKED — Ruby (p.19): $46.08 at 36 becomes the Handbook’s own $50.04 at 37, in the 2-year column', () => {
  const months = project(settings(), RUBY({ statedIncomeProtectionPremiumPerYear: toCents(46.08), statedIncomeProtectionBenefitPeriod: '2-years' }), []);
  // ⌈4,608 ÷ 12⌉ = 384; ⌈5,004 ÷ 12⌉ = 417. The 5-year column would give 4,608 × 327 / 303 → 415.
  assert.equal(amountOf(months[0], RUBY_LINE), 384);
  assert.equal(amountOf(months[4], RUBY_LINE), 384, '2027-01 is still read at 36');
  assert.equal(months[5].month, '2027-02');
  assert.equal(amountOf(months[5], RUBY_LINE), 417);
});

test('HAND-WORKED — Amanda (p.19): category, waiting period and loading cancel; the 5-year column is read', () => {
  // $606.38 at 30 (60 × $2.31 × 1.25 × 2.00 + 75%). At 31 the formula gives 60 × $2.41 × 1.25 × 2.00
  // × 1.75 = $632.625; the ratio gives 60,638 × 241 / 231 = 63,263.02. Both ⌈÷12⌉ = 5,272.
  // Born 1996-01-15: 30 at 2026-09-01, 31 from 2027-02. ⌈60,638 ÷ 12⌉ = 5,054 before.
  const household = { persons: [person('Amanda', '1996-01-15', { superInterests: [{
    phase: 'accumulation', balance: toCents(100_000),
    statedIncomeProtectionPremiumPerYear: toCents(606.38), statedIncomeProtectionBenefitPeriod: '5-years',
  }] })], homeStatus: 'occupied' };
  const months = project(settings({ planningHorizonAge: 33 }), household, []);
  const line = `${SUPER_INSURANCE_LINE}, Amanda — ${superPoolName('accumulation')}`;
  assert.equal(amountOf(months[0], line), 5_054);
  assert.equal(amountOf(months[5], line), 5_272);
});

test('IP ALONE: no cover kind, pays until 65 with the admin fee, then nothing at all', () => {
  // Born 1962-03-10: 64 at 2026-09-01, 65 from 2027-04. To-65 rate at 64 is 688 throughout, so each
  // month is ⌈68,800 ÷ 12⌉ = 5,734 + admin ⌈2,220 ÷ 12⌉ = 185 at cpi 0 = 5,919.
  const flat = settings({ planningHorizonAge: 67, economicSeries: { cpi: 0, pblci: 0, awote: 0, mtawe: 0 } });
  const household = { persons: [person('Dev', '1962-03-10', { superInterests: [{
    phase: 'accumulation', balance: toCents(100_000), statedIncomeProtectionPremiumPerYear: toCents(688),
    statedIncomeProtectionBenefitPeriod: 'to-65', statedInsuranceAdminFeePerYear: toCents(22.2),
  }] })], homeStatus: 'occupied' };
  const months = project(flat, household, []);
  const paying = months.filter((month) => amountOf(month, IP_INSURANCE) !== undefined);
  assert.deepEqual(paying.map((month) => month.month), ['2026-09', '2026-10', '2026-11', '2026-12', '2027-01', '2027-02', '2027-03']);
  assert.ok(paying.every((month) => amountOf(month, IP_INSURANCE) === 5_734 + 185), 'IP alone did not charge the admin fee');
  assert.ok(months.length > 20, 'the walk runs well past 65, so the stop is not the end of the walk');
  const [line] = months[0].lines.filter((l) => l.description === IP_INSURANCE);
  assert.equal(line.provenance, UNLEGISLATED.superInsurance);
  assert.equal(line.attribution, NO_STATING_ENTRY.superInsurance);
  assert.match(line.provenance.note, /income protection ends at 65/);
});

test('IP is not CPI-raised, and a cover change on death and TPD leaves IP (and so the admin fee) running', () => {
  const ip = { statedIncomeProtectionPremiumPerYear: toCents(46.08), statedIncomeProtectionBenefitPeriod: '2-years' };
  const flat = settings({ economicSeries: { cpi: 0, pblci: 0, awote: 0, mtawe: 0 } });
  const series = (s) => project(s, RUBY(ip), []).map((month) => amountOf(month, RUBY_LINE));
  assert.deepEqual(series(settings()), series(flat), 'an IP premium moved with the price level');
  // Death + TPD cancelled from [2]: IP 384 + admin 185 carry on.
  const both = { ...FIXED, ...ip, statedInsuranceAdminFeePerYear: toCents(22.2) };
  const entry = { id: 'off', type: 'INSURANCE_COVER_CHANGE', date: '2026-11-01', owner: 'personA', params: { interestIndex: 0, benefit: 'both', coverFraction: 0 }, enabled: true, createdAt: '2026-09-28' };
  const months = project(flat, RUBY(both), [entry]);
  // Ruby is 36: death 26c, TPD 32c → month 0 at ratio 1 is 2,500 + 1,000 + 384 + 185.
  assert.deepEqual(months.slice(0, 3).map((month) => amountOf(month, RUBY_LINE)), [4_069, 4_069, 384 + 185]);
});

test('ABSENT IS NIL: no IP field, or a nil IP premium, walks byte-identically', () => {
  const absent = JSON.stringify(project(settings(), DEV(), []));
  assert.equal(JSON.stringify(project(settings(), DEV({ statedIncomeProtectionPremiumPerYear: toCents(0), statedIncomeProtectionBenefitPeriod: 'to-65' }), [])), absent);
  // Not reachable through the door (refused there), but the walk must not charge it either.
  assert.equal(JSON.stringify(project(settings(), DEV({ statedIncomeProtectionPremiumPerYear: toCents(100) }), [])), absent);
});

test('the door: an IP premium and its benefit period are stated together — each alone refused by name', () => {
  refusedAt({ statedIncomeProtectionPremiumPerYear: 4_608 }, 'statedIncomeProtectionBenefitPeriod');
  refusedAt({ statedIncomeProtectionBenefitPeriod: '2-years' }, 'statedIncomeProtectionBenefitPeriod');
  refusedAt({ statedIncomeProtectionPremiumPerYear: 4_608, statedIncomeProtectionBenefitPeriod: '90-days' }, 'statedIncomeProtectionBenefitPeriod');
  refusedAt({ statedIncomeProtectionPremiumPerYear: -1, statedIncomeProtectionBenefitPeriod: '2-years' }, 'statedIncomeProtectionPremiumPerYear');
  // A cover kind is about death and TPD: IP alone needs none, and a kind beside IP alone is refused.
  refusedAt({ statedIncomeProtectionPremiumPerYear: 4_608, statedIncomeProtectionBenefitPeriod: '2-years', statedInsuranceCoverKind: 'fixed' }, 'statedInsuranceCoverKind');
  const stated = { statedIncomeProtectionPremiumPerYear: 4_608, statedIncomeProtectionBenefitPeriod: 'to-65', statedInsuranceAdminFeePerYear: 2_220 };
  const interest = parsePlan(withInterest(stated)).household.persons[0].superInterests[0];
  for (const [key, value] of Object.entries(stated)) assert.equal(interest[key], value, key);
  assert.equal(Object.hasOwn(interest, 'statedInsuranceCoverKind'), false);
});

test('the form: the two IP boxes round-trip, blank writes nothing, and one without the other is objected to', () => {
  assert.deepEqual([BLANK_SUPER_INTEREST.incomeProtectionPremiumPerYear, BLANK_SUPER_INTEREST.incomeProtectionBenefitPeriod], ['', '']);
  assert.equal(INCOME_PROTECTION_BENEFIT_PERIOD_CHOICES[0].value, '');
  assert.deepEqual(INCOME_PROTECTION_BENEFIT_PERIOD_CHOICES.slice(1).map((choice) => choice.value), ['2-years', '5-years', 'to-65']);
  const candidate = planWithStatedPosition(DEMO_PLAN, POSITION);
  for (const p of candidate.household.persons) {
    for (const interest of p.superInterests) {
      for (const key of ['statedIncomeProtectionPremiumPerYear', 'statedIncomeProtectionBenefitPeriod']) assert.equal(Object.hasOwn(interest, key), false, key);
    }
  }
  const boxes = { incomeProtectionPremiumPerYear: '46.08', incomeProtectionBenefitPeriod: '2-years' };
  const saved = parsePlan(planWithStatedPosition(DEMO_PLAN, withBoxes(boxes)));
  const interest = saved.household.persons[0].superInterests[0];
  assert.deepEqual([interest.statedIncomeProtectionPremiumPerYear, interest.statedIncomeProtectionBenefitPeriod], [4_608, '2-years']);
  const reopened = positionFormValues(saved).persons[0].superInterests[0];
  assert.deepEqual([reopened.incomeProtectionPremiumPerYear, reopened.incomeProtectionBenefitPeriod], ['46.08', '2-years']);
  assert.deepEqual(parsePlan(planWithStatedPosition(saved, positionFormValues(saved))), saved);
  assert.equal(negativeFeeObjection(withBoxes(boxes)), undefined);
  assert.match(negativeFeeObjection(withBoxes({ incomeProtectionPremiumPerYear: '46.08' })), /one without the other/);
  assert.match(negativeFeeObjection(withBoxes({ incomeProtectionBenefitPeriod: 'to-65' })), /one without the other/);
  assert.match(negativeFeeObjection(withBoxes({ ...boxes, incomeProtectionPremiumPerYear: '-1' })), /income protection premium/);
});

// --- COVER ENDS AT THE PENSION (user ruling 2026-09-28) ------------------------------------------
//
// Aware scopes all cover to the accumulation account (Insurance Handbook, 30 April 2026), so from
// the month an interest becomes a retirement-phase Account-Based Pension there is no premium and no
// insurance admin fee, ever again. A TTR is not that conversion; nor is an account kept out of the
// switch at retirement.

// Pat is 62 from 2026-03-15 to 2027-03-14: every month from 2026-09 to 2027-02 is read at 62, so at
// ratio 1 and cpi 0 each is ⌈30,000 ÷ 12⌉ + ⌈2,220 ÷ 12⌉ = 2,500 + 185 = 2,685.
const PAT_COVER = { statedInsuranceCoverKind: 'fixed', statedDeathPremiumPerYear: toCents(300), statedInsuranceAdminFeePerYear: toCents(22.2) };
const pat = (over = {}) => ({
  persons: [person('Pat', '1964-03-15', { superInterests: [{ phase: 'accumulation', balance: toCents(500_000), ...PAT_COVER, ...over }] })],
  homeStatus: 'occupied',
});
const flatAt = (horizon) => settings({ planningHorizonAge: horizon, nominalReturn: 0, economicSeries: { cpi: 0, pblci: 0, awote: 0, mtawe: 0 } });
const retireOn = (date) => ({ id: `r-${date}`, type: 'RETIRE', date, owner: 'household', params: {}, enabled: true, createdAt: '2026-09-01' });
const insuranceOf = (month) => month.lines.filter((l) => l.description.startsWith(`${SUPER_INSURANCE_LINE},`));
const insuredMonths = (months) => months.filter((m) => insuranceOf(m).length > 0).map((m) => m.month);

test('HAND-WORKED — a RETIRE that switches the account to a pension ends the premium AND the admin fee in that month', () => {
  const months = project(flatAt(66), pat(), [retireOn('2027-02-10')]);
  assert.deepEqual(insuredMonths(months), ['2026-09', '2026-10', '2026-11', '2026-12', '2027-01']);
  assert.ok(months.slice(0, 5).every((m) => amountOf(m, `${SUPER_INSURANCE_LINE}, Pat — ${superPoolName('accumulation')}`) === 2_685));
  // The switch itself happened on the RETIRE day, and the walk runs on for years without cover.
  assert.ok(months.find((m) => m.month === '2027-02').notes.some((n) => n.subject === 'pension at retirement' && n.outcome === 'switched'));
  assert.ok(months.length > 30);
  // A retirement on the 1st ends it that month too.
  assert.deepEqual(insuredMonths(project(flatAt(66), pat(), [retireOn('2027-02-01')])).at(-1), '2027-01');
});

test('an account KEPT in accumulation at retirement keeps its cover, and the RETIRE changes nothing about it', () => {
  const kept = pat({ keepInAccumulationAtRetirement: true });
  const months = project(flatAt(66), kept, [retireOn('2027-02-10')]);
  assert.deepEqual(insuredMonths(months), months.map((m) => m.month), 'a month of an accumulation account went uninsured');
  assert.equal(amountOf(months[6], `${SUPER_INSURANCE_LINE}, Pat — ${superPoolName('accumulation')}`), 2_685, '2027-03 is still read at 62');
});

test('a TTR keeps its cover while it is a TTR, and loses it when it converts at 65', () => {
  // Lee turns 65 on 2029-01-01; SISR item 106 converts the TTR that day.
  const lee = { persons: [person('Lee', '1964-01-01', { superInterests: [{
    phase: 'ttr', balance: toCents(500_000), statedStreamSettings: { commencementDay: '2025-07-01' }, ...PAT_COVER,
  }] })], homeStatus: 'occupied' };
  const months = project(flatAt(66), lee, []);
  const insured = insuredMonths(months);
  assert.equal(insured[0], '2026-09');
  assert.equal(insured.at(-1), '2028-12');
  assert.equal(insured.length, months.findIndex((m) => m.month === '2029-01'), 'a TTR month went uninsured');
  assert.equal(amountOf(months[0], `${SUPER_INSURANCE_LINE}, Lee — ${superPoolName('ttr')}`), 2_685);
});

test('an INSURANCE_COVER_CHANGE dated after the conversion changes nothing, and does not throw', () => {
  const change = { id: 'late', type: 'INSURANCE_COVER_CHANGE', date: '2027-06-01', owner: 'personA', params: { interestIndex: 0, benefit: 'death', coverFraction: 0.5 }, enabled: true, createdAt: '2026-09-28' };
  const without = project(flatAt(66), pat(), [retireOn('2027-02-10')]);
  const withLate = project(flatAt(66), pat(), [retireOn('2027-02-10'), change]);
  assert.deepEqual(insuredMonths(withLate), insuredMonths(without));
  assert.deepEqual(withLate.map((m) => m.superBalance), without.map((m) => m.superBalance));
});

test('the door: a premium at an age the table does not price is refused by name, not thrown by the walk', () => {
  // DEMO_PLAN starts 2026-09-01; the age is read on that day.
  const withAge = (dateOfBirth, fields) => {
    const plan = withInterest(fields);
    plan.household.persons[0].dateOfBirth = dateOfBirth;
    return plan;
  };
  const refused = (dateOfBirth, fields, key, words) => assert.throws(() => parsePlan(withAge(dateOfBirth, fields)), (error) =>
    error instanceof PlanFileHouseholdError && error.message.includes(`superInterests[0].${key}`) && words.test(error.message), `${dateOfBirth} ${key}`);
  const ip = { statedIncomeProtectionPremiumPerYear: 68_800, statedIncomeProtectionBenefitPeriod: 'to-65' };
  const death = { statedInsuranceCoverKind: 'fixed', statedDeathPremiumPerYear: 30_000 };
  const tpd = { statedInsuranceCoverKind: 'fixed', statedTpdPremiumPerYear: 12_000 };
  refused('1961-09-01', ip, 'statedIncomeProtectionPremiumPerYear', /is 65 when the plan starts.*ends at 65/);
  refused('1956-09-01', death, 'statedDeathPremiumPerYear', /is 70 when the plan starts.*ends at 70/);
  refused('1956-09-01', tpd, 'statedTpdPremiumPerYear', /is 70 when the plan starts.*ends at 70/);
  refused('2012-09-02', death, 'statedDeathPremiumPerYear', /is 13 when the plan starts.*priced from age 15/);
  refused('2012-09-02', ip, 'statedIncomeProtectionPremiumPerYear', /priced from age 15/);
  // The last priced ages pass the door, and so does IP's end age with only death stated.
  for (const [dateOfBirth, fields] of [['1961-09-02', ip], ['1956-09-02', { ...death, ...tpd }], ['1961-09-01', death], ['2011-09-01', death]]) {
    assert.doesNotThrow(() => parsePlan(withAge(dateOfBirth, fields)), dateOfBirth);
  }
});

test('the door: a premium stated on an account-based pension is refused by name (ruling 2026-09-28: cover ends at the pension)', () => {
  const onPension = (fields) => {
    const plan = withInterest(fields);
    plan.household.persons[0].superInterests[0].phase = 'accountBasedPension';
    return plan;
  };
  for (const [key, fields] of [
    ['statedDeathPremiumPerYear', { statedInsuranceCoverKind: 'fixed', statedDeathPremiumPerYear: 30_000 }],
    ['statedTpdPremiumPerYear', { statedInsuranceCoverKind: 'fixed', statedTpdPremiumPerYear: 12_000 }],
    ['statedIncomeProtectionPremiumPerYear', { statedIncomeProtectionPremiumPerYear: 68_800, statedIncomeProtectionBenefitPeriod: 'to-65' }],
  ]) {
    assert.throws(() => parsePlan(onPension(fields)), (error) =>
      error instanceof PlanFileHouseholdError && error.message.includes(`superInterests[0].${key}`) && /account-based pension/.test(error.message), key);
  }
  // The same premium on the accumulation account passes.
  assert.doesNotThrow(() => parsePlan(withInterest({ statedInsuranceCoverKind: 'fixed', statedDeathPremiumPerYear: 30_000 })));
});

// --- THE AGE EACH COVER ENDS, STATED PER ACCOUNT (2026-09-29) ------------------------------------
//
// `statedDeathCoverEndsAtAge` / `statedTpdCoverEndsAtAge`: 16 to 70, absent is 70. Kit (1962-03-10)
// is 64 at 2026-09-01, still 64 at 2027-03-01 ([6]) and 65 from 2027-04-01 ([7]); 70 from
// 2032-04-01. Fixed cover at cpi 0: death $300, TPD $120.
//   [0]..[6]  ⌈30,000÷12⌉ + ⌈12,000÷12⌉ = 2,500 + 1,000 = 3,500
//   [7] (65)  TPD ended; death 30,000 × 542 / 489 = 33,251.53 → ⌈÷12⌉ = 2,771
//   2032-03 (69) death 30,000 × 765 / 489 = 46,932.52 → ⌈÷12⌉ = 3,912; 2032-04 (70) nothing.

const kit = (fields) => ({
  persons: [person('Kit', '1962-03-10', { superInterests: [{ phase: 'accumulation', balance: toCents(500_000), statedInsuranceCoverKind: 'fixed', ...fields }] })],
  homeStatus: 'occupied',
});
const KIT_FLAT = settings({ planningHorizonAge: 72, economicSeries: { cpi: 0, pblci: 0, awote: 0, mtawe: 0 } });
const kitAge = (month) => Number(month.slice(0, 4)) - 1962 - (Number(month.slice(5, 7)) <= 3 ? 1 : 0);
const KIT_INSURANCE = `${SUPER_INSURANCE_LINE}, Kit — ${superPoolName('accumulation')}`;
// The premium for one benefit in one month, from the tables by the Handbook formula, or 0.
const kitPremium = (table, stated, endsAt, month) => {
  const age = kitAge(month);
  return age >= endsAt ? 0 : Math.ceil((stated * table[age - INSURANCE_FIRST_AGE]) / table[64 - INSURANCE_FIRST_AGE] / 12);
};

test('HAND-WORKED — TPD ends at 65 and death runs to 70: each premium, month by month', () => {
  const death = { statedDeathPremiumPerYear: toCents(300) };
  const tpd = { statedTpdPremiumPerYear: toCents(120), statedTpdCoverEndsAtAge: 65 };
  const walks = {
    death: project(KIT_FLAT, kit(death), []),
    tpd: project(KIT_FLAT, kit(tpd), []),
    both: project(KIT_FLAT, kit({ ...death, ...tpd }), []),
  };
  assert.ok(walks.both.length > 60 && walks.both.at(-1).month > '2032-04');
  const expected = {
    death: (month) => kitPremium(DEATH_RATE_CENTS_PER_THOUSAND, 30_000, 70, month),
    tpd: (month) => kitPremium(TPD_RATE_CENTS_PER_THOUSAND, 12_000, 65, month),
  };
  expected.both = (month) => expected.death(month) + expected.tpd(month);
  for (const [name, months] of Object.entries(walks)) {
    assert.deepEqual(
      months.map((m) => amountOf(m, KIT_INSURANCE) ?? 0),
      months.map((m) => expected[name](m.month)),
      `${name}: a month's premium is not the table's`,
    );
  }
  // The hand-worked anchors, so the formula above is not the only witness.
  const at = (months, month) => amountOf(months.find((m) => m.month === month), KIT_INSURANCE);
  assert.deepEqual(['2027-03', '2027-04', '2032-03', '2032-04'].map((month) => at(walks.both, month)), [3_500, 2_771, 3_912, undefined]);
  assert.deepEqual(['2027-03', '2027-04'].map((month) => at(walks.tpd, month)), [1_000, undefined], 'TPD is charged in the month the age reads 65');
  assert.equal(at(walks.death, '2027-04'), 2_771, 'death stopped with TPD');
  // Absent is 70, not the TPD's 65: with no end age stated, TPD runs on at 1,714/1,714.
  const unstated = project(KIT_FLAT, kit({ ...death, statedTpdPremiumPerYear: toCents(120) }), []);
  assert.equal(at(unstated, '2027-04'), 2_771 + 1_000);
  assert.equal(at(unstated, '2032-03'), 3_912 + 1_000);
  assert.equal(at(unstated, '2032-04'), undefined);
});

test('the admin fee runs on while TPD is charged after death cover has ended, and stops with the last premium', () => {
  // Death ends at 65, TPD runs to 70. cpi 0: admin ⌈2,220÷12⌉ = 185. [7]: TPD 1,000 + admin 185.
  const stated = { statedDeathPremiumPerYear: toCents(300), statedDeathCoverEndsAtAge: 65, statedInsuranceAdminFeePerYear: toCents(22.2) };
  const at = (months, month) => amountOf(months.find((m) => m.month === month), KIT_INSURANCE);
  const both = project(KIT_FLAT, kit({ ...stated, statedTpdPremiumPerYear: toCents(120) }), []);
  assert.deepEqual(['2027-03', '2027-04', '2032-03', '2032-04'].map((month) => at(both, month)), [2_500 + 1_000 + 185, 1_000 + 185, 1_000 + 185, undefined]);
  const deathOnly = project(KIT_FLAT, kit(stated), []);
  assert.deepEqual(['2027-03', '2027-04'].map((month) => at(deathOnly, month)), [2_500 + 185, undefined]);
});

test('the door: a cover end age is a whole number from 16 to 70, refused by name otherwise, and kept as stated', () => {
  const premiums = { statedInsuranceCoverKind: 'fixed', statedDeathPremiumPerYear: 30_000, statedTpdPremiumPerYear: 12_000 };
  for (const key of ['statedDeathCoverEndsAtAge', 'statedTpdCoverEndsAtAge']) {
    for (const bad of [71, 15, 65.5, '65', null]) {
      assert.throws(() => parsePlan(withInterest({ ...premiums, [key]: bad })), (error) =>
        error instanceof PlanFileHouseholdError && error.message.includes(`superInterests[0].${key}`) && /whole number from 16 to 70/.test(error.message), `${key} ${bad}`);
    }
    for (const good of [16, 65, 70]) {
      // Dana is 58 at the plan's start, so an end age of 16 or 58 would be refused as already ended.
      const fields = good < 59 ? { [key]: good } : { ...premiums, [key]: good };
      assert.equal(parsePlan(withInterest(fields)).household.persons[0].superInterests[0][key], good, `${key} ${good}`);
    }
  }
  const parsed = parsePlan(withInterest(premiums)).household.persons[0].superInterests[0];
  assert.equal(Object.hasOwn(parsed, 'statedDeathCoverEndsAtAge'), false, 'absent stays absent');
});

test('the door: a premium stated at or past the account’s own end age is refused by name, for that benefit only', () => {
  const withAge = (dateOfBirth, fields) => {
    const plan = withInterest({ statedInsuranceCoverKind: 'fixed', ...fields });
    plan.household.persons[0].dateOfBirth = dateOfBirth;
    return plan;
  };
  const refused = (dateOfBirth, fields, key, words) => assert.throws(() => parsePlan(withAge(dateOfBirth, fields)), (error) =>
    error instanceof PlanFileHouseholdError && error.message.includes(`superInterests[0].${key}`) && words.test(error.message), `${dateOfBirth} ${key}`);
  const tpd65 = { statedTpdPremiumPerYear: 12_000, statedTpdCoverEndsAtAge: 65 };
  refused('1960-09-01', tpd65, 'statedTpdPremiumPerYear', /is 66 when the plan starts.*TPD cover in super is priced from age 15 and ends at 65/);
  refused('1961-09-01', tpd65, 'statedTpdPremiumPerYear', /is 65 when the plan starts.*ends at 65/);
  refused('1961-09-01', { statedDeathPremiumPerYear: 30_000, statedDeathCoverEndsAtAge: 65 }, 'statedDeathPremiumPerYear', /is 65 when the plan starts.*ends at 65/);
  // The other benefit keeps its own 70; and the end age of a benefit with no premium refuses nothing.
  assert.doesNotThrow(() => parsePlan(withAge('1960-09-01', { statedDeathPremiumPerYear: 30_000, statedTpdCoverEndsAtAge: 65 })));
  assert.doesNotThrow(() => parsePlan(withAge('1961-09-02', tpd65)), 'still 64 on the first day');
});

test('the door: a cover change on or after the account’s own end age is refused, and "both" names whichever has ended', () => {
  // Dana (1968-05-14) turns 60 on 2028-05-14. Both premiums stated.
  const plan = (ends) => withInterest({ statedInsuranceCoverKind: 'fixed', statedDeathPremiumPerYear: 30_000, statedTpdPremiumPerYear: 12_000, ...ends });
  const entry = (benefit, date) => ({ id: 'ic', type: 'INSURANCE_COVER_CHANGE', date, owner: 'personA', params: { interestIndex: 0, benefit, coverFraction: 0 }, enabled: true, createdAt: '2026-09-29' });
  const refused = (ends, benefit, date, words) => assert.throws(() => parsePlan(planWithEntry(plan(ends), entry(benefit, date))), (error) =>
    error instanceof PlanFileEntryError && error.message.includes('.date') && words.test(error.message), `${benefit} ${date}`);
  const accepted = (ends, benefit, date) => assert.doesNotThrow(() => parsePlan(planWithEntry(plan(ends), entry(benefit, date))), `${benefit} ${date}`);
  const tpd60 = { statedTpdCoverEndsAtAge: 60 };
  refused(tpd60, 'tpd', '2028-05-14', /on or after 2028-05-14, Dana's 60th birthday\. TPD cover/);
  accepted(tpd60, 'tpd', '2028-05-13');
  refused(tpd60, 'both', '2029-01-01', /60th birthday\. TPD cover on that super account has already ended/);
  accepted(tpd60, 'death', '2029-01-01');
  refused({ statedDeathCoverEndsAtAge: 60 }, 'both', '2029-01-01', /60th birthday\. Death cover on that super account has already ended/);
  accepted({ statedDeathCoverEndsAtAge: 60 }, 'tpd', '2029-01-01');
  refused({}, 'both', '2038-05-14', /70th birthday\. Death cover/);
});

test('the form: the two end-age boxes round-trip as typed, blank writes nothing', () => {
  assert.deepEqual([BLANK_SUPER_INTEREST.deathCoverEndsAtAge, BLANK_SUPER_INTEREST.tpdCoverEndsAtAge], ['', '']);
  const blank = planWithStatedPosition(DEMO_PLAN, POSITION).household.persons[0].superInterests[0];
  for (const key of ['statedDeathCoverEndsAtAge', 'statedTpdCoverEndsAtAge']) assert.equal(Object.hasOwn(blank, key), false, key);
  const boxes = { deathPremiumPerYear: '310.00', tpdPremiumPerYear: '190.50', insuranceCoverKind: 'fixed', deathCoverEndsAtAge: '67', tpdCoverEndsAtAge: '65' };
  const saved = parsePlan(planWithStatedPosition(DEMO_PLAN, withBoxes(boxes)));
  const interest = saved.household.persons[0].superInterests[0];
  assert.deepEqual([interest.statedDeathCoverEndsAtAge, interest.statedTpdCoverEndsAtAge], [67, 65]);
  const reopened = positionFormValues(saved).persons[0].superInterests[0];
  assert.deepEqual([reopened.deathCoverEndsAtAge, reopened.tpdCoverEndsAtAge], ['67', '65']);
  assert.deepEqual(parsePlan(planWithStatedPosition(saved, positionFormValues(saved))), saved);
  const cleared = planWithStatedPosition(saved, withBoxes({ ...boxes, deathCoverEndsAtAge: '', tpdCoverEndsAtAge: ' ' })).household.persons[0].superInterests[0];
  for (const key of ['statedDeathCoverEndsAtAge', 'statedTpdCoverEndsAtAge']) assert.equal(Object.hasOwn(cleared, key), false, key);
  assert.throws(() => parsePlan(planWithStatedPosition(DEMO_PLAN, withBoxes({ ...boxes, tpdCoverEndsAtAge: '71' }))), /statedTpdCoverEndsAtAge/);
});
