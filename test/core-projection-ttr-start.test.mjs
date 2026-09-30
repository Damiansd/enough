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
import { createHash } from 'node:crypto';

import { toCents } from '../dist/core/money.js';
import { TTR_PAYMENT_LINE, project } from '../dist/core/projection.js';
import { PlanFileEntryError, parsePlan } from '../dist/core/parsePlan.js';
import { releasedEmptyClaimNote } from '../dist/core/superLumpSum.js';
import { DEMO_PLAN } from '../dist/app/demoHousehold.js';
import { monthOrRefusal } from '../dist/app/chat/tools/getMonth.js';
import { noteRow } from '../dist/app/monthToRows.js';
import { ttrStartEntry } from '../dist/app/planEdits.js';

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

// --- RF-3: a TTR_START with an amount opens its own account ------------------------------------
//
// The walk adds a nil accumulation account after the Person's stated ones, names the start at it,
// and on the first of the start's month moves the amount in, capped at the source's balance. The new
// account copies the source's stated fees (a second administration fee) and none of its insurance;
// a TTR_RATE_CHANGE naming the source changes the new account. The control: the same plan with the
// account split by hand is the same walk, to the cent. The second fee is controlled for by stating
// the source's fee fields on the hand-made account too; a fee-free pair is checked beside it.

const SG = { statedEmployerContributionDestination: 'superannuationGuarantee' };
const FEES = { statedAdministrationFeePerYear: toCents(78), statedAdministrationFeeRate: 0.001, statedInvestmentFeeRate: 0.005 };
const COVER = { statedInsuranceCoverKind: 'fixed', statedDeathPremiumPerYear: toCents(300) };
const moveStart = (date, amount, over = {}) => entry('start', date, 'TTR_START', { interestIndex: 0, drawdownRate: 0.07, amount: toCents(amount), ...over });
/** The walk as JSON, less the one note only the amount path writes. */
const withoutOpenedNote = (months) => JSON.stringify(months.map((m) => ({ ...m, notes: m.notes.filter((n) => n.subject !== 'TTR account opened') })));
const opened = (months) => months.flatMap((m) => m.notes.filter((n) => n.subject === 'TTR account opened').map((n) => [m.month, n]));
const ttrPaid = (months) => months.filter((m) => paidIn(m).length > 0).map((m) => [m.month, ...paidIn(m)]);

test('RF-3 control: an amount moved on the plan’s first day is the hand split, to the cent', () => {
  for (const fees of [{}, FEES]) {
    const growing = settings({ nominalReturn: 0.06 });
    const hand = project(growing, couple([account(500_000, { ...SG, ...fees, ...COVER }), account(200_000, fees)]), [start('2026-07-01')]);
    const moved = project(growing, couple([account(700_000, { ...SG, ...fees, ...COVER })]), [moveStart('2026-07-01', 200_000)]);
    assert.equal(withoutOpenedNote(moved), withoutOpenedNote(hand), `fees ${JSON.stringify(fees)}`);
  }
  // Part-way through the walk too, at 0% and fee-free so the hand-made account holds its $200,000
  // until then (with fees it would pay a second fee from month 0, the new account only from its start).
  const hand = project(settings(), couple([account(500_000, { ...SG, ...COVER }), account(200_000)]), [start('2027-01-01')]);
  const moved = project(settings(), couple([account(700_000, COVER)]), [moveStart('2027-01-01', 200_000)]);
  assert.equal(withoutOpenedNote(moved), withoutOpenedNote(hand));
  assert.deepEqual(ttrPaid(moved).slice(0, 2), [['2027-01', toCents(578.54)], ['2027-02', toCents(578.54)]]);
  assert.deepEqual(opened(moved).map(([month, n]) => [month, n.interestIndex, n.toInterestIndex, n.requested, n.moved]), [['2027-01', 0, 1, toCents(200_000), toCents(200_000)]]);
  assert.equal(opened(moved)[0][1].note, "Lee's transition to retirement pension starts on 2027-01-01 in a new account, the TTR from super account 1. The amount moved out of super account 1 on the first of the month. Super account 1 stays in accumulation. The new account is charged the same fees as super account 1, a second administration fee, and holds no insurance.");
});

test('RF-3: the new account is charged the source’s fees and none of its insurance', () => {
  const plain = project(settings(), couple([account(700_000, { ...FEES, ...COVER })]), []);
  const moved = project(settings(), couple([account(700_000, { ...FEES, ...COVER })]), [moveStart('2027-01-01', 200_000)]);
  const lines = (months, isoMonth, pattern) => monthAt(months, isoMonth).lines.filter((l) => pattern.test(l.description)).map((l) => l.amount);
  assert.deepEqual(lines(moved, '2027-03', /insurance/), lines(plain, '2027-03', /insurance/));
  assert.equal(lines(moved, '2027-03', /administration fee/).length, 2 * lines(plain, '2027-03', /administration fee/).length);
});

test('RF-3: no amount, no account — the demo walk is byte for byte what it was', () => {
  const walk = JSON.stringify(project(DEMO_PLAN.settings, DEMO_PLAN.household, DEMO_PLAN.entries));
  assert.equal(createHash('sha256').update(walk).digest('hex'), 'bda4be63f4265595e8bd86a941e019cd594aa4b5afe2a6267b6138cc415f4c52');
});

test('RF-3: one account and no nomination — the new account is closed to the Guarantee from month 0', () => {
  const months = project(settings(), couple([account(700_000)]), [moveStart('2027-07-01', 200_000)]);
  assert.deepEqual([...guaranteeSlots(months)], [0]);
});

test('RF-3: the move comes before the year’s determination, and is capped at the balance', () => {
  // $200,000 × 7% ÷ 12 from July: the first year is determined on the moved balance.
  assert.deepEqual(ttrPaid(project(settings(), couple([account(700_000)]), [moveStart('2027-07-01', 200_000)])).slice(0, 2), [['2027-07', toCents(1_166.67)], ['2027-08', toCents(1_166.67)]]);
  // Asking for $900,000 of $708,082.84 (July 2027, after a year of Guarantee) moves all of it.
  const capped = project(settings(), couple([account(700_000)]), [moveStart('2027-07-01', 900_000)]);
  const [[, note]] = opened(capped);
  assert.deepEqual([note.requested, note.moved], [toCents(900_000), toCents(708_082.84)]);
  assert.match(note.note, /Super account 1 held less than the amount to move on the first of the month, so all of it moved\./);
  assert.deepEqual(ttrPaid(capped)[0], ['2027-07', toCents(4_130.48)]);
  assert.equal(monthAt(capped, '2027-07').superBalance > 0, true);
});

test('RF-3: a TTR_RATE_CHANGE naming the source changes the new account', () => {
  const months = project(settings(), couple([account(700_000)]), [moveStart('2027-07-01', 200_000), entry('c', '2028-01-01', 'TTR_RATE_CHANGE', { interestIndex: 0, drawdownRate: 0.1 })]);
  assert.deepEqual(ttrPaid(months).filter(([month]) => month >= '2027-12' && month <= '2028-01'), [['2027-12', toCents(1_166.67)], ['2028-01', toCents(1_663.93)]]);
});

test('RF-3: at a later RETIRE the new account switches with the source, named for what it is', () => {
  const months = project(settings(), couple([account(700_000)]), [moveStart('2027-01-01', 200_000), entry('r', '2028-01-01', 'RETIRE', {})]);
  const note = months.flatMap((m) => m.notes).find((n) => n.subject === 'pension at retirement');
  assert.deepEqual([note.outcome, [...note.interestIndexes]], ['switched', [0, 1]]);
  assert.match(note.note, /super account 1 and the TTR from super account 1/);
});

// The RF-2 case: Lee stops on 2027-01-15 (account 1 switches; account 2 is kept), goes back on
// 2027-07-01, and starts a TTR on 2027-09-01 moving $50,000 out of account 2 — the hand split of
// `core-projection-return-to-work.test.mjs`'s RF-2 tests, with account 3 made by the walk.
const RF2_KEPT = couple([account(300_000, SG), account(150_000, { keepInAccumulationAtRetirement: true })]);
const RF2_ENTRIES = [
  entry('stop', '2027-01-15', 'RETIRE', {}),
  entry('back', '2027-07-01', 'WORK_PATTERN_CHANGE', { daysPerWeek: 3, annualSalary: toCents(50_000) }),
  entry('start', '2027-09-01', 'TTR_START', { interestIndex: 1, amount: toCents(50_000) }),
  entry('again', '2028-03-01', 'RETIRE', {}),
];

test('RF-3 after a return (RF-2): the account opened after the first stop is not in its switch, or in its lists', () => {
  const months = project(settings(), RF2_KEPT, RF2_ENTRIES);
  const notes = months.flatMap((m) => m.notes.filter((n) => n.subject === 'pension at retirement').map((n) => [m.month, n.outcome, [...n.interestIndexes]]));
  assert.deepEqual(notes, [['2027-01', 'switched', [0]], ['2027-07', 'back at work', [1]], ['2028-03', 'stopped again, TTR converted', [2]]]);
  // Six payments of the minimum on $50,000 (4% over the part-year), as the hand split pays.
  assert.deepEqual(ttrPaid(months), ['2027-09', '2027-10', '2027-11', '2027-12', '2028-01', '2028-02'].map((month) => [month, toCents(138.33)]));
  assert.match(monthAt(months, '2028-03').notes.find((n) => n.subject === 'pension at retirement').note, /The transition to retirement pension in Lee's TTR from super account 2 becomes/);
});

test('RF-3 after a return (RF-2): in the break, limb 5 lists no reason for the account not opened yet', () => {
  // Account 2 holds nothing at the stop, so every claim in the break is nil and each gives its reason.
  const empty = couple([account(300_000, SG), account(0, { keepInAccumulationAtRetirement: true })]);
  const months = project(settings(), empty, RF2_ENTRIES);
  const limb = monthAt(months, '2027-03').notes.find((n) => n.subject === 'waterfall limb' && n.limb === 'releasedSuperannuation').note;
  assert.ok(limb.includes(releasedEmptyClaimNote('Lee', 1)), limb);
  assert.ok(!limb.includes(releasedEmptyClaimNote('Lee', 2)), limb);
});

test('RF-3 at the door: an amount may come from the only account, or the employer’s; nothing is refused', () => {
  const only = parsePlan(withDana([account(412_000)], [danaStart('2029-01-01', { interestIndex: 0, amount: toCents(100_000) })]));
  assert.equal(only.entries.at(-1).params.amount, toCents(100_000));
  assert.doesNotThrow(() => parsePlan(withDana([account(312_000, SG), account(100_000)], [danaStart('2029-01-01', { interestIndex: 0, amount: toCents(50_000) })])));
  refused(withDana([account(412_000)], [danaStart('2029-01-01', { interestIndex: 0, amount: 0 })]), /amount moved into a transition to retirement pension is more than nothing/);
  refused(withDana([account(412_000)], [danaStart('2029-01-01', { interestIndex: 0, amount: -5 })]), /more than nothing/);
  // Without one, today's refusal stands, and now says what to do.
  refused(withDana([account(412_000)], [danaStart('2029-01-01', { interestIndex: 0 })]), /only super account still building up.*State the amount to move/);
  // And the rate change on the source passes the door, as it does for a hand-made account.
  const change = entry('dana-rate', '2029-07-01', 'TTR_RATE_CHANGE', { interestIndex: 0, drawdownRate: 0.08 });
  assert.doesNotThrow(() => parsePlan(withDana([account(412_000)], [danaStart('2029-01-01', { interestIndex: 0, amount: toCents(100_000) }), change])));
});

test('RF-3 on the page and to the chat: the new account is "the TTR from super account N"', () => {
  const plan = withDana([account(412_000)], [danaStart('2029-01-01', { interestIndex: 0, amount: toCents(100_000) })]);
  const detail = monthOrRefusal(parsePlan(plan), '2029-01');
  const note = detail.notes.find((n) => n.subject === 'TTR account opened');
  assert.deepEqual([note.superAccount, note.toSuperAccount, note.person], ['super account 1', 'the TTR from super account 1', 'Person A']);
  assert.ok(!note.note.includes('Dana'), note.note);
  const row = noteRow(project(plan.settings, plan.household, plan.entries.filter((e) => plan.scenarios[0].entryIds.includes(e.id))).find((m) => m.month === '2029-01').notes.find((n) => n.subject === 'TTR account opened'), (cents) => cents);
  assert.equal(row.of, 'Dana — super account 1 into the TTR from super account 1');
  assert.deepEqual([row.available, row.drawn], ['$100,000', '$100,000']);
  const built = ttrStartEntry({ date: '2029-01-01', owner: 'personA', note: '', interestIndex: '1', drawdownRatePercent: '', amount: '100,000' }, 'dana-ttr', '2026-09-30');
  assert.deepEqual(built.params, { interestIndex: 0, amount: toCents(100_000) });
});
