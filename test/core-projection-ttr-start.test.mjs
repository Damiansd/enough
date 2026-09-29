// Retire flow S4 (user ruling 2026-09-29: "need a start ttr date") — `TTR_START`.
//
// The mechanism under test: nothing is opened mid-walk. The entry names an accumulation account the
// plan already states (a SECOND one; the Guarantee keeps landing in the other), and the walk reads it
// as accumulation before the date and as a TTR from it, then converting at a later RETIRE or at 65 —
// the `conversionDay` map the switch at retirement already writes. The gate's NO-GO was a `ttr`
// phase written straight into the Household with a future commencement day: that is assessed for
// the Age Pension from month 0. The first test pins the difference.
//
// `nominalReturn: 0`, so every balance below is worked by hand from the stated figures.
import test from 'node:test';
import assert from 'node:assert/strict';

import { toCents } from '../dist/core/money.js';
import { TTR_PAYMENT_LINE, project } from '../dist/core/projection.js';
import { PlanFileEntryError, parsePlan } from '../dist/core/parsePlan.js';
import { DEMO_PLAN } from '../dist/app/demoHousehold.js';

const person = (name, dateOfBirth, superInterests, pay = 0) => ({
  name,
  dateOfBirth,
  superInterests,
  parcels: [],
  employmentIncomePerFortnight: toCents(pay),
  workBonusBalance: toCents(0),
});

const settings = (over = {}) => ({
  asAtDate: '2026-07-01',
  planningHorizonAge: 66,
  economicSeries: { cpi: 0, pblci: 0.025, awote: 0.035, mtawe: 0.035 },
  deemingRates: { lower: 0.0175, upper: 0.0375 },
  nominalReturn: 0,
  ...over,
});

// Lee: born 1 January 1964, so 62 at the plan's start and 65 on 2029-01-01, still working. Kim is
// past Age Pension age, so Lee's accumulation super is under the younger-partner exemption and a
// pension account of Lee's is not.
const LEE_DOB = '1964-01-01';
const account = (dollars, extra = {}) => ({ phase: 'accumulation', balance: toCents(dollars), ...extra });
const couple = (leeSuper) => ({
  persons: [person('Lee', LEE_DOB, leeSuper, 3_000), person('Kim', '1955-01-01', [])],
  homeStatus: 'occupied',
});
const TWO_ACCOUNTS = couple([account(300_000), account(200_000)]);
const entry = (id, date, type, params, owner = 'personA') => ({ id, date, owner, type, params, enabled: true, createdAt: '2026-09-29' });
const start = (date = '2027-01-01', params = { interestIndex: 1, drawdownRate: 0.07 }) => entry('start', date, 'TTR_START', params);

const monthAt = (months, isoMonth) => months.find((m) => m.month === isoMonth);
const paidIn = (month) => month.lines.filter((l) => l.description === `${TTR_PAYMENT_LINE}, Lee`).map((l) => l.amount);
const guaranteeSlots = (months) => new Set(months.flatMap((m) => m.notes.filter((n) => n.subject === 'superannuation guarantee' && n.interestIndex !== null).map((n) => n.interestIndex)));

test('before its date the account is accumulation (exempt for the Age Pension); from it, assessed — and a future ttr phase in the Household is not', () => {
  // The employer's account is named here so the plan without the entry walks too.
  const NAMED = couple([account(300_000, { statedEmployerContributionDestination: 'superannuationGuarantee' }), account(200_000)]);
  const months = project(settings(), NAMED, [start()]);
  const without = project(settings(), NAMED, []);
  // December: identical to the plan without the entry, to the cent.
  assert.equal(monthAt(months, '2026-12').assessableAssets, monthAt(without, '2026-12').assessableAssets);
  // January: the $200,000 account is assessed from the start date (less the first month's payment).
  const jump = monthAt(months, '2027-01').assessableAssets - monthAt(without, '2027-01').assessableAssets;
  assert.ok(jump > toCents(199_000) && jump <= toCents(200_000), `assessed ${jump} more in January`);
  // The NO-GO shape, for contrast: a ttr phase with a future commencement day is assessed in month 0.
  const stated = couple([account(300_000, { statedEmployerContributionDestination: 'superannuationGuarantee' }), { phase: 'ttr', balance: toCents(200_000), statedStreamSettings: { commencementDay: '2027-01-01', statedTtrDrawdownRate: 0.07 } }]);
  const early = project(settings(), stated, []);
  assert.ok(monthAt(early, '2026-07').assessableAssets - monthAt(months, '2026-07').assessableAssets >= toCents(200_000));
});

test('it pays from its own date: nothing before, a pro-rated first year from January', () => {
  const months = project(settings(), TWO_ACCOUNTS, [start()]);
  assert.deepEqual(months.filter((m) => m.month < '2027-01').flatMap(paidIn), []);
  // $200,000 × 7% × 181/365 days = $6,942.4657… → $6,942.47; twelfths of $578.54 January to May.
  assert.deepEqual(paidIn(monthAt(months, '2027-01')), [toCents(578.54)]);
  const firstYear = months.filter((m) => m.month >= '2027-01' && m.month <= '2027-06').flatMap(paidIn);
  assert.equal(firstYear.reduce((a, b) => a + b, 0), toCents(6_942.47));
});

test('a start inside a month pays in that month', () => {
  const months = project(settings(), TWO_ACCOUNTS, [start('2027-01-15')]);
  assert.equal(paidIn(monthAt(months, '2027-01')).length, 1);
});

test('the Guarantee lands in the other account, before and after the start', () => {
  const months = project(settings(), TWO_ACCOUNTS, [start()]);
  assert.deepEqual([...guaranteeSlots(months)], [0]);
  // The control: two accumulation accounts and no start is the undetermined destination (O82).
  assert.throws(() => project(settings(), TWO_ACCOUNTS, []), /UNDETERMINED/);
});

test('a later RETIRE converts it to an account-based pension that day; without one, the 65th birthday does', () => {
  const retired = project(settings(), TWO_ACCOUNTS, [start(), entry('r', '2028-01-01', 'RETIRE', {})]);
  assert.ok(paidIn(monthAt(retired, '2027-12')).length === 1);
  assert.deepEqual(paidIn(monthAt(retired, '2028-01')), [], 'no TTR payment once it is a full pension');
  const note = retired.flatMap((m) => m.notes).find((n) => n.subject === 'pension at retirement');
  assert.equal(note.outcome, 'switched');
  assert.deepEqual(note.interestIndexes, [0, 1]);
  const kept = project(settings(), TWO_ACCOUNTS, [start()]);
  assert.ok(paidIn(monthAt(kept, '2028-12')).length === 1);
  assert.deepEqual(paidIn(monthAt(kept, '2029-01')), [], 'converted on the 65th birthday');
});

test('a salary sacrifice into the account after its start is refused by name', () => {
  const sacrifice = entry('ss', '2026-07-01', 'SUPER_CONTRIBUTION', { kind: 'salarySacrificed', annualAmount: toCents(5_000), interestIndex: 1 });
  assert.throws(() => project(settings(), TWO_ACCOUNTS, [start(), sacrifice]), /became a transition to retirement pension on 2027-01-01/);
});

test('a rate change counts from the start, and is refused before it', () => {
  const change = (date) => entry('c', date, 'TTR_RATE_CHANGE', { interestIndex: 1, drawdownRate: 0.1 });
  const months = project(settings(), TWO_ACCOUNTS, [start(), change('2027-04-01')]);
  assert.ok(paidIn(monthAt(months, '2027-04'))[0] > toCents(578.54));
  assert.throws(() => project(settings(), TWO_ACCOUNTS, [start(), change('2026-12-01')]), /not a transition to retirement pension until 2027-01-01/);
});

test('the walk refuses a start on or after the RETIRE, and two starts for one account', () => {
  assert.throws(() => project(settings(), TWO_ACCOUNTS, [entry('r', '2027-01-01', 'RETIRE', {}), start()]), /on or after their Retire entry dated 2027-01-01/);
  assert.throws(() => project(settings(), TWO_ACCOUNTS, [start(), { ...start('2027-06-01'), id: 'again' }]), /second start/);
});

// --- The door ----------------------------------------------------------------------------------

// Dana: born 1968-05-14, 60 on 2028-05-14 and 65 on 2033-05-14; she retires on 2031-05-14.
const withDana = (danaSuper, entries, scenarioIds = entries.map((e) => e.id)) => ({
  ...DEMO_PLAN,
  household: { ...DEMO_PLAN.household, persons: [{ ...DEMO_PLAN.household.persons[0], superInterests: danaSuper }, DEMO_PLAN.household.persons[1]] },
  entries: [...DEMO_PLAN.entries, ...entries],
  scenarios: [{ ...DEMO_PLAN.scenarios[0], entryIds: [...DEMO_PLAN.scenarios[0].entryIds, ...scenarioIds] }],
});
const DANA_TWO = [account(312_000), account(100_000)];
const danaStart = (date, params = { interestIndex: 1 }, owner = 'personA') => entry('dana-ttr', date, 'TTR_START', params, owner);
const refused = (plan, pattern) => assert.throws(() => parsePlan(plan), (error) => error instanceof PlanFileEntryError && pattern.test(error.message));

test('the door reads a valid start, with and without a rate', () => {
  assert.equal(parsePlan(withDana(DANA_TWO, [danaStart('2029-01-01')])).entries.at(-1).params.drawdownRate, undefined);
  assert.equal(parsePlan(withDana(DANA_TWO, [danaStart('2029-01-01', { interestIndex: 1, drawdownRate: 0.08 })])).entries.at(-1).params.drawdownRate, 0.08);
  refused(withDana(DANA_TWO, [danaStart('2029-01-01', { interestIndex: 1, drawdownRate: 0.11 })]), /between 0\.04/);
});

test('the door refuses by name: under 60, 65 and over, before the plan, household, not accumulation', () => {
  refused(withDana(DANA_TWO, [danaStart('2028-05-13')]), /before 2028-05-14, Dana's 60th birthday/);
  assert.doesNotThrow(() => parsePlan(withDana(DANA_TWO, [danaStart('2028-05-14')])));
  assert.doesNotThrow(() => parsePlan(withDana(DANA_TWO, [danaStart('2031-05-13')])));
  refused(withDana(DANA_TWO, [danaStart('2033-05-14')]), /on or after 2033-05-14, Dana's 65th birthday/);
  refused(withDana(DANA_TWO, [{ ...danaStart('2029-01-01'), owner: 'household' }]), /is "household"/);
  refused(withDana([account(312_000), { phase: 'ttr', balance: toCents(100_000), statedStreamSettings: { commencementDay: '2026-07-01' } }], [danaStart('2029-01-01')]), /already a transition to retirement pension/);
});

test('the door refuses the only accumulation account and the one the employer pays into', () => {
  refused(withDana([account(412_000)], [danaStart('2029-01-01', { interestIndex: 0 })]), /only super account still building up/);
  refused(withDana([account(312_000), account(100_000, { statedEmployerContributionDestination: 'superannuationGuarantee' })], [danaStart('2029-01-01')]), /the super account Dana's employer pays into/);
});

test('the door refuses a start on or after RETIRE in the same scenario, and two starts; another scenario is its own', () => {
  // Dana retires 2031-05-14 in the demo: a start that day, or after, is refused.
  refused(withDana(DANA_TWO, [danaStart('2031-05-14')]), /on or after Dana's Retire entry dated 2031-05-14/);
  refused(withDana(DANA_TWO, [danaStart('2029-01-01'), { ...danaStart('2030-01-01'), id: 'again' }]), /SECOND TTR_START/);
  // Before the plan: only in Household and settings (asked before the ages).
  refused(withDana(DANA_TWO, [danaStart('2026-08-01')]), /before the plan starts on 2026-09-01/);
  // A Retire in another scenario does not reach this one.
  const other = withDana(DANA_TWO, [danaStart('2031-06-01')], []);
  other.scenarios = [{ ...other.scenarios[0], entryIds: other.scenarios[0].entryIds.filter((id) => id !== 'dana-retires').concat('dana-ttr') }, { ...DEMO_PLAN.scenarios[0], id: 'retires', name: 'Retires', parentId: null }];
  assert.doesNotThrow(() => parsePlan(other));
});
