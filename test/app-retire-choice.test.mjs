// `retireChoice.ts` — the Retire entry's one question (retire flow S1, user rulings 2026-09-29):
// stopping work for good writes RETIRE; cutting down with a TTR writes a WORK_PATTERN_CHANGE, and
// only at 60 to 64; with no TTR running by then it also writes a TTR_START on the same date (S4).
import test from 'node:test';
import assert from 'node:assert/strict';

import { DEMO_PLAN } from '../dist/app/demoHousehold.js';
import { RETIRE_CHOICES, forGoodLines, retireChoiceEntries, ttrRefusal, ttrStartNeeded } from '../dist/app/retireChoice.js';

// Dana: born 1968-05-14, so 60 on 2028-05-14 and 65 on 2033-05-14. Ash already draws a pension.
const AS_AT = DEMO_PLAN.settings.asAtDate; // 2026-09-01
const withDanaSuper = (interest) => ({
  ...DEMO_PLAN.household,
  persons: [{ ...DEMO_PLAN.household.persons[0], superInterests: [interest] }, DEMO_PLAN.household.persons[1]],
});
const TTR_RUNNING = withDanaSuper({ phase: 'ttr', balance: 41_200_000, statedStreamSettings: { commencementDay: '2025-07-01' } });
const values = (date, owner = 'personA') => ({ date, owner, note: '', daysPerWeek: '3', annualSalary: '60,000' });
const ids = () => {
  let n = 0;
  return () => `id-${++n}`;
};
const OTHER_ENTRIES = DEMO_PLAN.entries.filter((entry) => entry.id !== 'dana-retires');

test('the question offers exactly the two answers', () => {
  assert.deepEqual(RETIRE_CHOICES.map((choice) => choice.value), ['forGood', 'ttr']);
});

test('stopping for good writes one RETIRE and nothing else, whatever is in the days boxes', () => {
  const chosen = retireChoiceEntries(TTR_RUNNING, [], AS_AT, 'forGood', values('2029-01-01'), ids(), '2026-09-29');
  assert.equal(chosen.entries.length, 1);
  assert.equal(chosen.entries[0].type, 'RETIRE');
  assert.deepEqual(chosen.entries[0].params, {});
  assert.equal(chosen.entries[0].id, 'id-1');
});

test('cutting down with a TTR writes one WORK_PATTERN_CHANGE, never a RETIRE', () => {
  const chosen = retireChoiceEntries(TTR_RUNNING, [], AS_AT, 'ttr', values('2029-01-01'), ids(), '2026-09-29');
  assert.equal(chosen.entries.length, 1);
  assert.equal(chosen.entries[0].type, 'WORK_PATTERN_CHANGE');
  assert.deepEqual(chosen.entries[0].params, { daysPerWeek: 3, annualSalary: 6_000_000 });
  assert.equal(chosen.entries.filter((entry) => entry.type === 'RETIRE').length, 0);
});

test('TTR is offered from the 60th birthday to the day before the 65th, and not a day either side', () => {
  assert.match(ttrRefusal(TTR_RUNNING, [], 'personA', '2028-05-13', AS_AT), /under 60/);
  assert.equal(ttrRefusal(TTR_RUNNING, [], 'personA', '2028-05-14', AS_AT), undefined);
  assert.equal(ttrRefusal(TTR_RUNNING, [], 'personA', '2033-05-13', AS_AT), undefined);
  assert.match(ttrRefusal(TTR_RUNNING, [], 'personA', '2033-05-14', AS_AT), /65 or older/);
  // And the builder refuses what the check refuses: a refused TTR writes nothing.
  assert.deepEqual(Object.keys(retireChoiceEntries(TTR_RUNNING, [], AS_AT, 'ttr', values('2028-05-13'), ids(), '2026-09-29')), ['refused']);
  assert.deepEqual(Object.keys(retireChoiceEntries(TTR_RUNNING, [], AS_AT, 'ttr', values('2033-05-14'), ids(), '2026-09-29')), ['refused']);
});

// S4 (2026-09-29): with no TTR running, the same answer also writes a TTR_START on the date.
const DANA_TWO = {
  ...DEMO_PLAN.household,
  persons: [{ ...DEMO_PLAN.household.persons[0], superInterests: [{ phase: 'accumulation', balance: 31_200_000 }, { phase: 'accumulation', balance: 10_000_000 }] }, DEMO_PLAN.household.persons[1]],
};
const startValues = (date, rate = '') => ({ ...values(date), ttrInterestIndex: '2', ttrRatePercent: rate });

test('a TTR stated as running by the plan’s date needs no start; one starting later, or with no day, does', () => {
  assert.equal(ttrStartNeeded(TTR_RUNNING, [], 'personA', '2029-01-01', AS_AT), false);
  const onTheDay = withDanaSuper({ phase: 'ttr', balance: 41_200_000, statedStreamSettings: { commencementDay: AS_AT } });
  assert.equal(ttrStartNeeded(onTheDay, [], 'personA', '2029-01-01', AS_AT), false);
  const future = withDanaSuper({ phase: 'ttr', balance: 41_200_000, statedStreamSettings: { commencementDay: '2026-09-02' } });
  assert.equal(ttrStartNeeded(future, [], 'personA', '2029-01-01', AS_AT), true);
  assert.equal(ttrStartNeeded(withDanaSuper({ phase: 'ttr', balance: 41_200_000 }), [], 'personA', '2029-01-01', AS_AT), true);
  // A TTR_START of hers on or before the date is running; one after it is not.
  const started = [{ id: 't', date: '2029-01-01', owner: 'personA', type: 'TTR_START', params: { interestIndex: 1 }, enabled: true, createdAt: 'x' }];
  assert.equal(ttrStartNeeded(DANA_TWO, started, 'personA', '2029-01-01', AS_AT), false);
  assert.equal(ttrStartNeeded(DANA_TWO, started, 'personA', '2028-12-31', AS_AT), true);
  assert.equal(ttrStartNeeded(DANA_TWO, [{ ...started[0], enabled: false }], 'personA', '2029-01-01', AS_AT), true);
});

test('with no TTR running, cutting down writes the work change AND a TTR_START on the same date', () => {
  const chosen = retireChoiceEntries(DANA_TWO, OTHER_ENTRIES, AS_AT, 'ttr', startValues('2029-01-01', '7'), ids(), '2026-09-29');
  assert.deepEqual(chosen.entries.map((entry) => entry.type), ['WORK_PATTERN_CHANGE', 'TTR_START']);
  assert.deepEqual(chosen.entries.map((entry) => entry.id), ['id-1', 'id-2']);
  assert.deepEqual(chosen.entries.map((entry) => [entry.date, entry.owner]), [['2029-01-01', 'personA'], ['2029-01-01', 'personA']]);
  assert.deepEqual(chosen.entries[1].params, { interestIndex: 1, drawdownRate: 0.07 });
  assert.deepEqual(retireChoiceEntries(DANA_TWO, OTHER_ENTRIES, AS_AT, 'ttr', startValues('2029-01-01'), ids(), '2026-09-29').entries[1].params, { interestIndex: 1 });
  // With one running, no start is written.
  assert.equal(retireChoiceEntries(TTR_RUNNING, [], AS_AT, 'ttr', startValues('2029-01-01', '7'), ids(), '2026-09-29').entries.length, 1);
});

test('a start is refused by name: one account only, on or after a Retire, before the plan', () => {
  const one = DEMO_PLAN.household; // Dana has one account, in accumulation
  assert.match(ttrRefusal(one, OTHER_ENTRIES, 'personA', '2029-01-01', AS_AT), /Dana’s employer keeps paying into their super account, so the pension needs a second one/);
  assert.deepEqual(Object.keys(retireChoiceEntries(one, OTHER_ENTRIES, AS_AT, 'ttr', startValues('2029-01-01'), ids(), '2026-09-29')), ['refused']);
  assert.equal(ttrRefusal(DANA_TWO, OTHER_ENTRIES, 'personA', '2029-01-01', AS_AT), undefined);
  // The demo's Retire is 2031-05-14: the day before is fine, the day itself is not.
  assert.equal(ttrRefusal(DANA_TWO, DEMO_PLAN.entries, 'personA', '2031-05-13', AS_AT), undefined);
  assert.match(ttrRefusal(DANA_TWO, DEMO_PLAN.entries, 'personA', '2031-05-14', AS_AT), /Dana already stops work for good on 2031-05-14/);
  // A household Retire reaches her too.
  const householdRetire = [{ ...DEMO_PLAN.entries[1], owner: 'household', date: '2030-01-01' }];
  assert.match(ttrRefusal(DANA_TWO, householdRetire, 'personA', '2030-01-01', AS_AT), /already stops work for good on 2030-01-01/);
  // RF-2: a later date is this answer's own return to work, so it is not refused for the stop; but
  // both her accounts became a pension at it, so none is left to start one from.
  assert.match(ttrRefusal(DANA_TWO, householdRetire, 'personA', '2030-06-01', AS_AT), /Dana’s super became a full pension when Dana stopped work on 2030-01-01, so no account is left/);
  const later = { ...DANA_TWO, persons: [{ ...DANA_TWO.persons[0] }, DANA_TWO.persons[1]] };
  assert.match(ttrRefusal(later, [], 'personA', '2028-06-01', '2028-07-01'), /before the plan starts/);
});

// RF-2 (2026-09-30): after a return to work a TTR may start, from an account kept in accumulation.
const DANA_KEPT = {
  ...DEMO_PLAN.household,
  persons: [{ ...DEMO_PLAN.household.persons[0], superInterests: [{ phase: 'accumulation', balance: 31_200_000 }, { phase: 'accumulation', balance: 10_000_000, keepInAccumulationAtRetirement: true }, { phase: 'accumulation', balance: 5_000_000, keepInAccumulationAtRetirement: true }] }, DEMO_PLAN.household.persons[1]],
};

test('RF-2: after a stop, cutting down is its own return, and starts a TTR unless one started since the stop', () => {
  // Dana stops on 2031-05-14 in the demo.
  assert.equal(ttrRefusal(DANA_KEPT, DEMO_PLAN.entries, 'personA', '2031-09-01', AS_AT), undefined);
  assert.equal(ttrStartNeeded(DANA_KEPT, DEMO_PLAN.entries, 'personA', '2031-09-01', AS_AT), true);
  const chosen = retireChoiceEntries(DANA_KEPT, DEMO_PLAN.entries, AS_AT, 'ttr', { ...startValues('2031-09-01'), ttrInterestIndex: '3' }, ids(), '2026-09-30');
  assert.deepEqual(chosen.entries.map((entry) => [entry.type, entry.date]), [['WORK_PATTERN_CHANGE', '2031-09-01'], ['TTR_START', '2031-09-01']]);
  // A start before the stop was converted or runs on its own; only one since the stop counts.
  const before = { id: 't', date: '2029-01-01', owner: 'personA', type: 'TTR_START', params: { interestIndex: 2 }, enabled: true, createdAt: 'x' };
  assert.equal(ttrStartNeeded(DANA_KEPT, [...DEMO_PLAN.entries, before], 'personA', '2031-09-01', AS_AT), true);
  const since = { ...before, date: '2031-08-01' };
  assert.equal(ttrStartNeeded(DANA_KEPT, [...DEMO_PLAN.entries, since], 'personA', '2031-09-01', AS_AT), false);
  // With no stop, today's rule: the earlier start is running.
  assert.equal(ttrStartNeeded(DANA_KEPT, [before], 'personA', '2031-09-01', AS_AT), false);
  // A TTR stated as running before the plan was switched at the stop, so a new one is needed.
  const statedTtr = { ...DANA_KEPT, persons: [{ ...DANA_KEPT.persons[0], superInterests: [{ phase: 'ttr', balance: 31_200_000, statedStreamSettings: { commencementDay: '2025-07-01' } }, ...DANA_KEPT.persons[0].superInterests.slice(1)] }, DANA_KEPT.persons[1]] };
  assert.equal(ttrStartNeeded(statedTtr, [], 'personA', '2031-09-01', AS_AT), false);
  assert.equal(ttrStartNeeded(statedTtr, DEMO_PLAN.entries, 'personA', '2031-09-01', AS_AT), true);
});

test('TTR is one person’s: the household owner and a blank date are refused', () => {
  assert.match(ttrRefusal(TTR_RUNNING, [], 'household', '2029-01-01', AS_AT), /one person/);
  assert.match(ttrRefusal(TTR_RUNNING, [], 'personA', '', AS_AT), /date/);
});

test('for good at 60 or older: one line saying the forecast starts a pension and the fund must be asked', () => {
  const lines = forGoodLines(DEMO_PLAN.household, OTHER_ENTRIES, AS_AT, 'personA', '2031-05-14');
  assert.equal(lines.length, 1);
  assert.match(lines[0], /^The forecast assumes Dana’s super fund starts an account-based pension on this date\. Ask the fund to do it\.$/);
});

test('for good before 60 says plainly that super is not unlocked early', () => {
  const lines = forGoodLines(DEMO_PLAN.household, OTHER_ENTRIES, AS_AT, 'personA', '2027-06-30');
  assert.deepEqual(lines, ['Stopping work before 60 doesn’t let Dana take super early.']);
});

test('the note follows the walk’s switch, not an age: kept out, a pension already held, an earlier Retire, a past date', () => {
  // Kept out: 63 on the date, and nothing switches.
  const keptOut = withDanaSuper({ phase: 'accumulation', balance: 41_200_000, keepInAccumulationAtRetirement: true });
  assert.deepEqual(forGoodLines(keptOut, OTHER_ENTRIES, AS_AT, 'personA', '2031-05-14'), []);
  // Ash already draws a pension, so retiring at 67 switches nothing.
  assert.deepEqual(forGoodLines(DEMO_PLAN.household, OTHER_ENTRIES, AS_AT, 'personB', '2027-03-01'), []);
  // Dana's Retire on 2031-05-14 is already in the plan, and the first one governs.
  assert.deepEqual(forGoodLines(DEMO_PLAN.household, DEMO_PLAN.entries, AS_AT, 'personA', '2032-01-01'), []);
  // Before the plan's date: the stated phase governs.
  assert.deepEqual(forGoodLines(DEMO_PLAN.household, OTHER_ENTRIES, AS_AT, 'personA', '2026-01-01'), []);
  // Household owner: Dana switches, Ash does not, so one line naming Dana.
  const both = forGoodLines(DEMO_PLAN.household, OTHER_ENTRIES, AS_AT, 'household', '2031-05-14');
  assert.equal(both.length, 1);
  assert.match(both[0], /Dana’s/);
});

test('a date not typed yet gives no note and no error', () => {
  assert.deepEqual(forGoodLines(DEMO_PLAN.household, OTHER_ENTRIES, AS_AT, 'personA', ''), []);
  assert.deepEqual(forGoodLines(DEMO_PLAN.household, OTHER_ENTRIES, AS_AT, 'personA', '1900-01-01'), []);
});
