// LR-3 — the low income super tax offset (Co-contribution Act ss 12C(1), 12E(2); Act No. 8 of 2026
// Sch 4 from FY2027-28). The rule, then the walk: credited into super at the July settlement for a
// complete year, never counted as a contribution, and left out with a note where every account is
// a pension by then.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { toCents } from '../dist/core/money.js';
import { LOW_INCOME_SUPER_TAX_OFFSET_LINE, lowIncomeSuperTaxOffsetDescription, project } from '../dist/core/projection.js';
import { parsePlan } from '../dist/core/parsePlan.js';
import { SUPERANNUATION, assumptionAt, assumptionKeys, lowIncomeSuperTaxOffset, taxYear } from '../dist/data/assumptions/index.js';

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '..');

// --- The rule -----------------------------------------------------------------------------------

const listo = (fy, concessional, ati, employmentShare = 1) =>
  lowIncomeSuperTaxOffset({ fy, concessional: toCents(concessional), ati: toCents(ati), employmentShare }).amount;

test('to FY2026-27: $37,000 and $500, and exactly $37,000 still qualifies', () => {
  assert.equal(listo('2026-27', 3_000, 37_000), toCents(450));
  assert.equal(listo('2026-27', 3_000, 37_000.01), 0);
  assert.equal(listo('2026-27', 10_000, 30_000), toCents(500));
  // An income the new threshold would let through is still out under the old one.
  assert.equal(listo('2026-27', 3_000, 40_000), 0);
});

test('from FY2027-28: the threshold is Sch 7 item 1 and the maximum is derived from it, and exactly the threshold qualifies', () => {
  const itemOne = taxYear('2027-28').brackets.value[1].upTo;
  assert.equal(itemOne, toCents(45_000));
  const rule = lowIncomeSuperTaxOffset({ fy: '2027-28', concessional: toCents(10_000), ati: itemOne, employmentShare: 1 });
  assert.equal(rule.threshold, itemOne);
  assert.equal(rule.maximum, toCents(810));
  assert.equal(rule.maximum, Math.round((itemOne * SUPERANNUATION.superGuarantee.chargePercentage.value * 15) / 10_000));
  assert.equal(rule.amount, toCents(810));
  assert.equal(listo('2027-28', 3_000, 45_000.01), 0);
  // $40,000 was out before 1 July 2027 and is in after it.
  assert.equal(listo('2027-28', 3_000, 40_000), toCents(450));
  // A later year reads its own Sch 7 table (the standing one) rather than a stored $45,000.
  assert.equal(lowIncomeSuperTaxOffset({ fy: '2040-41', concessional: toCents(10_000), ati: 0, employmentShare: 1 }).maximum, toCents(810));
});

test('15%, with $10 the floor and nothing without a contribution', () => {
  assert.equal(listo('2027-28', 20, 20_000), toCents(10));
  assert.equal(listo('2026-27', 20, 20_000), toCents(10));
  assert.equal(listo('2027-28', 1_234.56, 20_000), toCents(185.18));
  assert.equal(listo('2027-28', 0, 20_000), 0);
});

test('10% or more of total income from work: exactly a tenth qualifies, less does not', () => {
  assert.equal(listo('2027-28', 3_000, 20_000, 1_000 / 10_000), toCents(450));
  assert.equal(listo('2027-28', 3_000, 20_000, 0.0999), 0);
});

test('the register carries every figure, and the FY2027-28 pair is a formula, never a stored dollar amount', () => {
  const keys = assumptionKeys().filter((key) => key.startsWith('superannuation.lowIncomeSuperTaxOffset.'));
  assert.deepEqual(keys, [
    'superannuation.lowIncomeSuperTaxOffset.employmentIncomeShare',
    'superannuation.lowIncomeSuperTaxOffset.incomeThreshold',
    'superannuation.lowIncomeSuperTaxOffset.incomeThresholdFrom2027',
    'superannuation.lowIncomeSuperTaxOffset.maximum',
    'superannuation.lowIncomeSuperTaxOffset.maximumFrom2027',
    'superannuation.lowIncomeSuperTaxOffset.minimum',
    'superannuation.lowIncomeSuperTaxOffset.notAContribution',
    'superannuation.lowIncomeSuperTaxOffset.rate',
  ]);
  for (const key of ['incomeThresholdFrom2027', 'maximumFrom2027']) {
    const record = assumptionAt(`superannuation.lowIncomeSuperTaxOffset.${key}`);
    assert.equal(record.kind, 'config-derived');
    assert.equal(typeof record.value, 'function');
    assert.equal(record.effective, '2027-07-01');
  }
});

// --- The walk -----------------------------------------------------------------------------------

const DEMO = parsePlan(JSON.parse(readFileSync(join(REPO, 'fixtures', 'demo-couple.plan.json'), 'utf8')));
const DEMO_WALK = project(DEMO.settings, DEMO.household, DEMO.entries);
const offsetLines = (months) =>
  months.flatMap((m) => m.lines.filter((l) => l.description.startsWith(LOW_INCOME_SUPER_TAX_OFFSET_LINE)).map((l) => [m.month, l.description, l.direction, l.effect, l.amount]));

test('the demo couple: Sam is paid it for four complete years, each July, and none while over the threshold', () => {
  assert.deepEqual(offsetLines(DEMO_WALK), [
    ['2028-07', 'Low income super tax offset, Sam, 2027-28', 'inflow', 'wealth', 73_393],
    ['2029-07', 'Low income super tax offset, Sam, 2028-29', 'inflow', 'wealth', 75_962],
    ['2030-07', 'Low income super tax offset, Sam, 2029-30', 'inflow', 'wealth', 78_621],
    ['2031-07', 'Low income super tax offset, Sam, 2030-31', 'inflow', 'wealth', 81_000],
  ]);
  // FY2026-27 is the walk's first, partial year (it opens in September): nothing is assessed for it.
  // FY2031-32 and FY2032-33: Sam's pay has passed $45,000.
  const line = DEMO_WALK.find((m) => m.month === '2028-07').lines.find((l) => l.description === lowIncomeSuperTaxOffsetDescription('Sam', '2027-28'));
  assert.equal(line.provenance.register, 'low income superannuation tax offset');
  assert.equal(line.provenance.fy, '2027-28');
  assert.ok(line.provenance.determination.some((d) => /Australian resident/.test(d)));
  assert.ok(line.provenance.determination.some((d) => /not a contribution/.test(d)));
});

test('the demo couple: FY2033-34 qualifies, but Sam\'s only account is a pension by July 2034, so it is left out with a note', () => {
  const july = DEMO_WALK.find((m) => m.month === '2034-07');
  assert.equal(july.lines.some((l) => l.description.startsWith(LOW_INCOME_SUPER_TAX_OFFSET_LINE)), false);
  const notes = DEMO_WALK.flatMap((m) => m.notes.filter((n) => n.subject === 'low income super tax offset not paid').map((n) => [m.month, n.person, n.financialYear, n.amount]));
  assert.deepEqual(notes, [['2034-07', 'Sam', '2033-34', 44_964]]);
});

// A worker on a steady $30,000 from 1 July 2027: FY2027-28 is complete, and the offset lands in July 2028.
const SETTINGS = {
  asAtDate: '2027-07-01',
  planningHorizonAge: 44,
  economicSeries: { cpi: 0.025, pblci: 0.025, awote: 0, mtawe: 0.035 },
  deemingRates: { lower: 0.0175, upper: 0.0375 },
  nominalReturn: 0,
  cashInterestRate: 0.05,
};
const worker = (yearlyPay, over = {}) => ({
  name: 'Kit',
  dateOfBirth: '1985-03-01',
  superInterests: [{ phase: 'accumulation', balance: toCents(0) }],
  parcels: [],
  employmentIncomePerFortnight: toCents(yearlyPay / 26),
  workBonusBalance: toCents(0),
  ...over,
});
const solo = (person, over = {}) => ({ persons: [person], homeStatus: 'occupied', ...over });
const entry = (id, type, date, params = {}, owner = 'personA') => ({ id, date, owner, type, params, enabled: true, createdAt: '2027-01-01' });
const paid = (months) => offsetLines(months).map(([month, , , , amount]) => [month, amount]);
const july2028 = (months) => months.find((m) => m.month === '2028-07');

test('the credit is in the super balance, by exactly the line, and nowhere else', () => {
  const withIt = project(SETTINGS, solo(worker(30_000)), []);
  // The same worker with $400,000 in cash: 5% interest takes adjusted taxable income over $45,000.
  const without = project(SETTINGS, solo(worker(30_000), { openingOffsetBalance: toCents(400_000) }), []);
  assert.deepEqual(paid(without), []);
  const [[month, amount]] = paid(withIt);
  assert.equal(month, '2028-07');
  assert.equal(amount, toCents(540)); // 15% of the $3,600 Guarantee
  for (const m of withIt.filter((each) => each.month < '2028-07')) {
    assert.equal(m.superBalance, without.find((each) => each.month === m.month).superBalance, m.month);
  }
  assert.equal(july2028(withIt).superBalance - july2028(without).superBalance, amount);
});

test('salary sacrifice is in the base: it adds 15% of itself', () => {
  const sacrifice = entry('sac', 'SUPER_CONTRIBUTION', '2027-07-01', { kind: 'salarySacrificed', annualAmount: toCents(1_000), interestIndex: 0 });
  const [[, withSacrifice]] = paid(project(SETTINGS, solo(worker(30_000)), [sacrifice]));
  const [[, without]] = paid(project(SETTINGS, solo(worker(30_000)), []));
  // Twelve twelfths of $1,000 are $999.96; 15% of that, give or take the one rounding.
  assert.ok(Math.abs(withSacrifice - without - 15_000) <= 1, `${withSacrifice} - ${without}`);
});

test('adjusted taxable income adds the sacrifice back: $50,000 sacrificing $8,000 is not low income', () => {
  const sacrifice = entry('sac', 'SUPER_CONTRIBUTION', '2027-07-01', { kind: 'salarySacrificed', annualAmount: toCents(8_000), interestIndex: 0 });
  assert.deepEqual(paid(project(SETTINGS, solo(worker(50_000)), [sacrifice])), []);
});

test('a rental loss does not bring adjusted taxable income under the threshold', () => {
  // A standalone tenancy has no home value to assess once the exemption runs out; ENTER_CARE supplies
  // one (the rent-out-home tests' own device). Neither touches super.
  const care = entry('care', 'ENTER_CARE', '2027-07-01', { homeValue: toCents(700_000), radPrice: toCents(500_000), radPaidAsLumpSum: toCents(0) });
  const rent = entry('rent', 'RENT_OUT_HOME', '2027-08-01', { weeklyRent: toCents(10), annualRepairs: toCents(20_000) }, 'household');
  assert.deepEqual(paid(project(SETTINGS, solo(worker(50_000)), [care, rent])), []);
  // The control: under the threshold, the same loss does not stop it either.
  assert.equal(paid(project(SETTINGS, solo(worker(30_000)), [care, rent])).length, 1);
});

test('under a tenth of total income from work: nothing, however low the income', () => {
  // $3,000 of pay against $40,000 of interest on $800,000 of cash.
  assert.deepEqual(paid(project(SETTINGS, solo(worker(3_000), { openingOffsetBalance: toCents(800_000) }), [])), []);
  // The control: $5,000 of pay against $30,000 of interest is a seventh.
  assert.equal(paid(project(SETTINGS, solo(worker(5_000), { openingOffsetBalance: toCents(600_000) }), [])).length, 1);
});

test('a partial first year is not assessed: a walk opening in November pays nothing for that year', () => {
  assert.deepEqual(paid(project({ ...SETTINGS, asAtDate: '2027-11-01' }, solo(worker(30_000)), [])).filter(([month]) => month === '2028-07'), []);
});

test('a started TTR is closed to it: the offset goes to the account still in accumulation', () => {
  const older = worker(30_000, {
    dateOfBirth: '1965-03-01',
    superInterests: [{ phase: 'accumulation', balance: toCents(100_000) }, { phase: 'accumulation', balance: toCents(0), statedEmployerContributionDestination: 'superannuationGuarantee' }],
  });
  const ttr = entry('ttr', 'TTR_START', '2027-07-01', { interestIndex: 0, drawdownRate: 0.04 });
  const later = { ...SETTINGS, planningHorizonAge: 64 };
  const months = project(later, solo(older), [ttr]);
  assert.equal(paid(months).length, 1);
  // Only the second account is in accumulation, so the destination is derived even with the nomination removed.
  const unnamed = { ...older, superInterests: older.superInterests.map(({ statedEmployerContributionDestination, ...rest }) => rest) };
  assert.equal(paid(project(later, solo(unnamed), [ttr])).length, 1);
});

test('it lands in the account the employer pays into, not simply the first one', () => {
  // Two accounts kept in accumulation; the employer pays into account 2. After a stop at 63, a lump
  // sum asking for far more than account 2 holds is capped to its balance, so what it pays is what
  // account 2 held. The same worker with $400,000 in cash is over the threshold and gets no offset,
  // and nothing else about account 2 differs (cash interest never touches super).
  const kept = (interest) => ({ ...interest, keepInAccumulationAtRetirement: true });
  const older = (over = {}) => solo(worker(30_000, {
    dateOfBirth: '1965-03-01',
    superInterests: [kept({ phase: 'accumulation', balance: toCents(100_000) }), kept({ phase: 'accumulation', balance: toCents(0), statedEmployerContributionDestination: 'superannuationGuarantee' })],
  }), over);
  const entries = [entry('stop', 'RETIRE', '2028-08-01'), entry('lump', 'LUMP_SUM_FROM_SUPER', '2028-09-01', { amount: toCents(1_000_000), interestIndex: 1 })];
  const later = { ...SETTINGS, planningHorizonAge: 64 };
  const lumpPaid = (months) => months.find((m) => m.month === '2028-09').notes.find((n) => n.subject === 'super withdrawal' && n.entryId === 'lump').paid;
  const withIt = project(later, older(), entries);
  const without = project(later, older({ openingOffsetBalance: toCents(400_000) }), entries);
  assert.deepEqual(paid(withIt), [['2028-07', toCents(540)]]);
  assert.deepEqual(paid(without), []);
  assert.equal(lumpPaid(withIt) - lumpPaid(without), toCents(540));
});
