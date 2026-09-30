// P6-6 — the first EDIT, and the four properties the slice exists to get right:
//
//   1. **one validator.** What is about to be written goes through `parsePlan` — the same function
//      the read uses — and a candidate that fails it is **never handed to the transport at all**.
//      Every refusal case below asserts the spy's call count is zero, not merely that the write was
//      harmless: "it wrote something invalid and the server accepted it" is the failure, and the
//      server writes any JSON it is given atomically (`server/index.mjs`). Atomic is not valid.
//   2. **the pure layer has no clock and no randomness.** `id` and `createdAt` are arguments. Every
//      assertion here names the exact id and the exact date it passed in, so a `crypto.randomUUID()`
//      or a `new Date()` smuggled into `planEdits.ts` fails these tests rather than making them flaky.
//   3. **an edit moves the forecast in the direction it implies.** Not "differs" — a spend increase
//      must not raise wealth in ANY month, and a spending level switched off must not lower it in any.
//   4. **`enabled: false` is not a delete.** The entry stays in the array, in its place, and
//      switching it back on restores the projection to the same digest, not merely to something close.
//
// The transport is a spy rather than a file: what is under test is the ORDER of validate-then-write
// and the count of calls, which a file cannot show. `test/app-load-plan.test.mjs` is the one that
// proves the bytes. Nothing here knows `~/.enough` exists and no server is started.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

import { DEMO_PLAN } from '../dist/app/demoHousehold.js';
import { parsePlan, PlanFileAmountError, PlanFileDateError, PlanFileEntryError, UNSPECIFIED_ENTRY_TYPES } from '../dist/core/parsePlan.js';
import { ENTRY_TYPES } from '../dist/core/plan.js';
import { project } from '../dist/core/projection.js';
import { scenarioById, scenarioEntries } from '../dist/app/scenarioWalks.js';
import { PlanWriteFailure } from '../dist/app/loadPlan.js';
import { entryRefusalMessage, planFailureMessage, showEntryRefusal } from '../dist/app/planStatus.js';
import {
  CONSTRUCTIBLE_ENTRY_TYPES,
  OFFERED_ENTRY_TYPES,
  lumpSumFromSuperEntry,
  mortgageRefinanceEntry,
  mortgageTargetEntry,
  mortgagePayoffEntry,
  illnessSeparationEntry,
  deathEntry,
  enterCareEntry,
  ENTER_CARE_ENTRY_NOTICE,
  ENTER_CARE_ENTRY_SUMMARY,
  heasDrawEntry,
  HEAS_DRAW_ENTRY_NOTICE,
  HEAS_DRAW_ENTRY_SUMMARY,
  sellHomeEntry,
  SELL_HOME_ENTRY_NOTICE,
  SELL_HOME_ENTRY_SUMMARY,
  rentOutHomeEntry,
  RENT_OUT_HOME_ENTRY_NOTICE,
  RENT_OUT_HOME_ENTRY_SUMMARY,
  buyHomeEntry,
  downsizerContributionEntry,
  insuranceCoverChangeEntry,
  ttrStartEntry,
  MORTGAGE_ENTRY_NOTICE,
  interestIndexAsTyped,
  LUMP_SUM_ENTRY_NOTICE,
  LUMP_SUM_ENTRY_SUMMARY,
  DAYS_PER_WEEK_ENTRY_NOTICE,
  DAYS_PER_WEEK_ENTRY_SUMMARY,
  daysAsTyped,
  dollarsToCents,
  nonSuperInvestmentBuyEntry,
  nonSuperInvestmentSellEntry,
  oneOffExpenseEntry,
  planWithEntry,
  planWithEntryOverride,
  retireEntry,
  returnChangeEntry,
  ttrRateChangeEntry,
  savePlan,
  spendChangeEntry,
  spouseContributionEntry,
  SPOUSE_CONTRIBUTION_ENTRY_NOTICE,
  SPOUSE_CONTRIBUTION_ENTRY_SUMMARY,
  superContributionEntry,
  SUPER_CONTRIBUTION_ENTRY_NOTICE,
  SUPER_CONTRIBUTION_ENTRY_SUMMARY,
  validatedPlan,
  workPatternChangeEntry,
} from '../dist/app/planEdits.js';

const PLAN = parsePlan(DEMO_PLAN);

/**
 * A plan with a different POOL, and its scenarios kept consistent with it (v2, P6-4). A test that
 * filtered `entries` alone would now be refused at the door — `scenarios[0].entryIds` would name
 * an entry the file no longer contains — which is the validator doing its job, not a test to
 * loosen. This keeps the fixture honest instead.
 */
const withEntries = (plan, entries) => {
  const ids = new Set(entries.map((entry) => entry.id));
  return {
    ...plan,
    entries,
    scenarios: plan.scenarios.map((scenario) => ({ ...scenario, entryIds: scenario.entryIds.filter((id) => ids.has(id)) })),
  };
};
const ID = 'fixed-id-not-a-uuid';
const CREATED = '2026-09-19';

/** The form as a user left it. Spread over for the one field a case is about. */
const FORM = { date: '2030-01-01', annualSpend: '120,000', owner: 'household', note: 'the go-go years' };

/** A transport that records every call. `writePlan` succeeding is the uninteresting case; it is the COUNT that matters. */
const spy = (behaviour = async () => {}) => {
  const calls = [];
  return { calls, writePlan: async (plan) => { calls.push(plan); return behaviour(plan); } };
};

const thrown = async (fn) => {
  try { await fn(); } catch (error) { return error; }
  return assert.fail('nothing was thrown');
};

/** Total wealth as the chart reads it: the cash balance plus both means-test bands. */
const wealth = (month) => month.closingBalance + month.protectedAssets + month.assessableAssets;

const digest = (months) => createHash('sha256').update(JSON.stringify(months)).digest('hex');

const BASE = project(PLAN.settings, PLAN.household, PLAN.entries);
const BASE_DIGEST = digest(BASE);

// --- §1 Dollars as typed → cents, converting and never judging ---------------------------------

test('whole cents by integer arithmetic, exactly as money.ts does it', () => {
  assert.equal(dollarsToCents('84,000'), 8_400_000);
  assert.equal(dollarsToCents('$84000'), 8_400_000);
  assert.equal(dollarsToCents('84000.50'), 8_400_050);
  assert.equal(dollarsToCents(' 84000.5 '), 8_400_050);
  assert.equal(dollarsToCents('0'), 0);
  assert.equal(dollarsToCents('0.07'), 7);
});

test('what it cannot read becomes a number parsePlan refuses — it never throws and never rounds', () => {
  // NaN, not a throw: a bare RangeError from inside arithmetic is a SECOND refusal the user would
  // meet instead of the plan file's own named one.
  assert.ok(Number.isNaN(dollarsToCents('abc')));
  assert.ok(Number.isNaN(dollarsToCents('')));
  assert.ok(Number.isNaN(dollarsToCents('1,2,3.4.5')));
  // The third decimal is KEPT, so the refusal can quote the figure the user typed. Rounding it to
  // 8_400_050 here would be this module deciding a half-cent on the user's behalf (ADR-0001).
  assert.equal(dollarsToCents('84000.505'), 8_400_050.5);
  assert.equal(Number.isSafeInteger(dollarsToCents('84000.505')), false);
});

// --- §2 The pure builder: injected id and timestamp, and a plan parsePlan accepts ---------------

test('the id and the createdAt are the ones passed in, and nothing else in the entry varies between two calls', () => {
  const first = spendChangeEntry(FORM, ID, CREATED);
  const second = spendChangeEntry(FORM, 'another-id', '2031-12-25');

  assert.equal(first.id, ID);
  assert.equal(first.createdAt, CREATED);
  assert.equal(second.id, 'another-id');
  assert.equal(second.createdAt, '2031-12-25');
  // The positive control on "no clock, no randomness": every other field is identical across two
  // calls made at different moments, so the only variation possible is the injected one.
  assert.deepEqual({ ...first, id: null, createdAt: null }, { ...second, id: null, createdAt: null });
});

test('valid form values build an entry parsePlan accepts, whole and unchanged', () => {
  const candidate = planWithEntry(PLAN, spendChangeEntry(FORM, ID, CREATED));
  const parsed = parsePlan(candidate);

  assert.equal(parsed.entries.length, PLAN.entries.length + 1);
  assert.deepEqual(parsed.entries.at(-1), {
    id: ID,
    date: '2030-01-01',
    owner: 'household',
    params: { annualSpend: 12_000_000 },
    enabled: true,
    createdAt: CREATED,
    note: 'the go-go years',
    type: 'SPEND_CHANGE',
  });
  // Append-only: every entry already in the plan is still there, in its own place.
  assert.deepEqual(parsed.entries.slice(0, -1), PLAN.entries);
});

test('enabled is written explicitly as true — "nobody said" and "enabled" are different facts', () => {
  const entry = spendChangeEntry(FORM, ID, CREATED);
  assert.equal(Object.hasOwn(entry, 'enabled'), true);
  assert.equal(entry.enabled, true);
});

test('a blank note omits the KEY rather than storing an empty string', () => {
  const entry = spendChangeEntry({ ...FORM, note: '   ' }, ID, CREATED);
  assert.equal(Object.hasOwn(entry, 'note'), false);
  assert.equal(Object.hasOwn(parsePlan(planWithEntry(PLAN, entry)).entries.at(-1), 'note'), false);
  // And a note that is really there survives with its surrounding whitespace trimmed.
  assert.equal(spendChangeEntry({ ...FORM, note: '  roof  ' }, ID, CREATED).note, 'roof');
});

// --- §3 Invalid form values are refused, and the transport is NEVER CALLED ----------------------

const REFUSED = {
  'a date that is not zero-padded': [{ ...FORM, date: '2030-1-1' }, PlanFileDateError],
  'a date that is not a date at all': [{ ...FORM, date: '' }, PlanFileDateError],
  'an owner that is not one of the three': [{ ...FORM, owner: 'everyone' }, PlanFileEntryError],
  'an amount that is not a number': [{ ...FORM, annualSpend: 'lots' }, PlanFileAmountError],
  'an amount with a third decimal place': [{ ...FORM, annualSpend: '84000.505' }, PlanFileAmountError],
  'a negative spending level': [{ ...FORM, annualSpend: '-500' }, PlanFileEntryError],
};

for (const [description, [values, Refusal]] of Object.entries(REFUSED)) {
  test(`${description} is refused by name, and nothing is sent to the transport`, async () => {
    const transport = spy();
    const candidate = planWithEntry(PLAN, spendChangeEntry(values, ID, CREATED));

    const error = await thrown(() => savePlan(transport, candidate));

    assert.ok(error instanceof Refusal, `${error.constructor.name} is not ${Refusal.name}: ${error.message}`);
    assert.equal(transport.calls.length, 0, 'the transport was called with a plan that does not validate');
  });
}

test('the positive control: the SAME spy is called exactly once when the values are good', async () => {
  const transport = spy();
  await savePlan(transport, planWithEntry(PLAN, spendChangeEntry(FORM, ID, CREATED)));
  assert.equal(transport.calls.length, 1, 'a spy that is never called would make every case above vacuous');
});

test('what is PUT is the parsed plan, not the raw candidate', async () => {
  const transport = spy();
  const stored = await savePlan(transport, planWithEntry(PLAN, spendChangeEntry(FORM, ID, CREATED)));

  assert.equal(transport.calls.length, 1);
  assert.equal(transport.calls[0], stored.plan);
  // And what was written reads back as itself: the write path cannot store a file the read path refuses.
  assert.deepEqual(parsePlan(JSON.parse(JSON.stringify(transport.calls[0]))), stored.plan);
});

test('a plan that parses but the engine cannot WALK is refused too, and is never written', async () => {
  // Dated after the Planning Horizon: `parsePlan` has no opinion about the horizon and accepts it,
  // and `project()` throws. Written unchecked it would brick the page — the next load would parse
  // the file, throw inside `project()`, and show no banner, because loading succeeded.
  const transport = spy();
  const late = planWithEntry(PLAN, spendChangeEntry({ ...FORM, date: '2080-01-01' }, 'too-late', CREATED));

  assert.doesNotThrow(() => parsePlan(late), 'the premise: the file boundary accepts this one');

  const error = await thrown(() => savePlan(transport, late));
  assert.match(error.message, /after the Planning Horizon/);
  assert.equal(transport.calls.length, 0);
});

// --- §4 The forecast moves in the direction the edit implies ------------------------------------

test('a spend INCREASE lowers wealth and raises it in no month at all', () => {
  const { plan, months } = validatedPlan(planWithEntry(PLAN, spendChangeEntry(FORM, ID, CREATED)));

  assert.equal(months.length, BASE.length);
  const risen = BASE.filter((month, i) => wealth(months[i]) > wealth(month)).map((month) => month.month);
  assert.deepEqual(risen, [], 'spending more raised total wealth in these months');
  const fallen = BASE.filter((month, i) => wealth(months[i]) < wealth(month));
  assert.ok(fallen.length > 100, `only ${fallen.length} months moved — an inequality this weak would pass on a no-op`);
  // The walk really is the new plan's: the added entry is what the changed months cite.
  assert.ok(months.some((month) => month.appliedEntryIds.includes(ID)));
  assert.equal(plan.entries.at(-1).id, ID);
});

test('the month the level takes effect spends the new figure, and the month before spends the old one', () => {
  const { months } = validatedPlan(planWithEntry(PLAN, spendChangeEntry(FORM, ID, CREATED)));
  const spendIn = (walk, month) => walk.find((m) => m.month === month).lines
    .filter((line) => line.description === 'Household spending').map((line) => line.amount);

  // ⚠️ **RE-DERIVED 2026-09-21 FOR REGISTER O85: the stated level is REAL, so none of these three
  // figures is the stated twelfth any more.** 2030-01 is 40 months past the plan's `asAtDate`
  // (2026-09-01), so every figure carries 1.025 ^ (40/12) = 1.0857914…, and 2029-12 carries
  // 39 months of it. What the test is about is untouched: the NEW level applies from its own month
  // and not a month earlier, and the two months either side of the change are a different figure for
  // a different reason — $7,600.54 → $10,857.91 is the level changing, $7,584.92 → $7,600.54 is one
  // month of prices.
  assert.deepEqual(spendIn(BASE, '2030-01'), [760_054]); // $84,000 a year, raised to 2030-01, a twelfth at a time
  assert.deepEqual(spendIn(months, '2030-01'), [1_085_791]); // $120,000 a year, from this month
  assert.deepEqual(spendIn(months, '2029-12'), [758_492]); // and not a month earlier
  assert.equal(Math.ceil(Math.round(8_400_000 * 1.025 ** (40 / 12)) / 12), 760_054);
  assert.equal(Math.ceil(Math.round(12_000_000 * 1.025 ** (40 / 12)) / 12), 1_085_791);
  assert.equal(Math.ceil(Math.round(8_400_000 * 1.025 ** (39 / 12)) / 12), 758_492);
});

test('an entry dated BEFORE the plan’s asAtDate is not ignored — it stands from month 0', () => {
  // Worth pinning because it is the surprising half of the date question, and a form with a date
  // box can produce it in one keystroke. A `SPEND_CHANGE` is a LEVEL, so one dated years before
  // the walk begins is the household's standing spending level and applies in the FIRST month —
  // it is not "already happened, already paid" the way a one-off expense would be, and nothing on
  // screen marks the month it takes effect, because that month is off the left-hand edge.
  const withoutTheLevel = withEntries(PLAN, PLAN.entries.filter((entry) => entry.type !== 'SPEND_CHANGE'));
  const candidate = planWithEntry(withoutTheLevel, spendChangeEntry({ ...FORM, date: '2019-03-01', annualSpend: '60,000' }, 'stated-in-2019', CREATED));
  const { months } = validatedPlan(candidate);

  const first = months[0].lines.filter((line) => line.description === 'Household spending');
  assert.deepEqual(first.map((line) => line.amount), [500_000]); // $60,000 a year, in 2026-09
  assert.deepEqual(first[0].attribution.entryIds, ['stated-in-2019']);
  assert.ok(months[0].appliedEntryIds.includes('stated-in-2019'), 'month 0 cites the entry that set the level');
});

// --- §5 The toggle: switched off is not a delete, it is reversible, and it is PER SCENARIO -------
//
// **Rewritten 2026-09-22.** The toggle used to set `enabled: false` on the entry in the shared
// POOL, so it went off in every Scenario that listed that id — the user picked a scenario with its
// radio, switched a change off, and silently changed every other scenario's forecast. It now writes
// the ACTIVE Scenario's own `entryOverrides` and the entry's flag is never touched. What the old
// tests below asserted about the ENTRY is therefore asserted about the SCENARIO, and the
// entry-is-not-removed property they existed for is unchanged and still here.

/** The walk of one Scenario, from ITS resolved entries — never `plan.entries`, the pool. */
const walkOf = (plan, scenarioId = plan.activeScenarioId) =>
  project(plan.settings, plan.household, scenarioEntries(plan, scenarioById(plan, scenarioId)));

const switchedOff = (plan, id) => parsePlan(planWithEntryOverride(plan, plan.activeScenarioId, id, false));

test('switching the spending level off touches no entry at all — the flag is the SCENARIO’s', () => {
  const off = switchedOff(PLAN, 'spend-2026');

  assert.equal(off.entries.length, PLAN.entries.length, 'an entry was removed from the array');
  // The pool is what it was: the write is not an edit to the entry in any sense.
  assert.deepEqual(off.entries, PLAN.entries, 'the toggle wrote to the shared pool');
  assert.equal(off.entries[0].id, 'spend-2026');
  assert.equal(off.entries[0].enabled, true, 'the entry’s own flag was flipped — that is the defect');
  // And the statement went to the active Scenario, by id, as a `false`.
  const active = off.scenarios.find((scenario) => scenario.id === off.activeScenarioId);
  assert.deepEqual(active.entryOverrides, { 'spend-2026': false });
  // Every other member of that Scenario, and every other Scenario, is untouched.
  assert.deepEqual({ ...active, entryOverrides: null }, { ...PLAN.scenarios.find((one) => one.id === PLAN.activeScenarioId), entryOverrides: null });
  assert.deepEqual(
    off.scenarios.filter((one) => one.id !== off.activeScenarioId),
    PLAN.scenarios.filter((one) => one.id !== PLAN.activeScenarioId),
  );
});

test('a switched-off spending level stops applying, and wealth falls in no month', () => {
  const { months } = validatedPlan(planWithEntryOverride(PLAN, PLAN.activeScenarioId, 'spend-2026', false));

  const fallen = BASE.filter((month, i) => wealth(months[i]) < wealth(month)).map((month) => month.month);
  assert.deepEqual(fallen, [], 'spending nothing lowered total wealth in these months');
  const risen = BASE.filter((month, i) => wealth(months[i]) > wealth(month));
  assert.ok(risen.length > 100, `only ${risen.length} months moved — the toggle may not have reached the engine`);
  assert.notEqual(digest(months), BASE_DIGEST);
  // No spending line anywhere: the level is not zero, it is not stated at all.
  assert.equal(months.flatMap((month) => month.lines).filter((line) => line.description === 'Household spending').length, 0);
});

test('switching it back on restores the projection EXACTLY — same digest, not merely close', () => {
  const off = switchedOff(PLAN, 'spend-2026');
  const back = parsePlan(planWithEntryOverride(off, off.activeScenarioId, 'spend-2026', true));

  // Deep-equal to the plan it started from, which is the strong form: the override is DROPPED
  // rather than written as a `true`, so the file does not carry a statement per click and the
  // reversal leaves nothing behind to round-trip differently.
  assert.deepEqual(back, PLAN, 'the round trip did not return the plan it started from');
  assert.equal(back.scenarios.find((one) => one.id === back.activeScenarioId).entryOverrides, undefined);
  assert.equal(digest(walkOf(back)), BASE_DIGEST);
});

test('a toggle naming an entry that is not in the plan is a refusal, never a silent no-op', () => {
  assert.throws(() => planWithEntryOverride(PLAN, PLAN.activeScenarioId, 'no-such-entry', false), /no entry with id "no-such-entry"/);
});

test('a toggle naming a scenario that is not in the plan is a refusal too', () => {
  assert.throws(() => planWithEntryOverride(PLAN, 'no-such-scenario', 'spend-2026', false), /no scenario with id "no-such-scenario"/);
});

// --- §6 A write that does not land is visible, and says the right one of three things -----------

test('a transport that fails becomes PlanWriteFailure, with the transport’s own reason kept', async () => {
  const transport = spy(async () => { throw new Error('write failed: /api/plan 507'); });

  const error = await thrown(() => savePlan(transport, planWithEntry(PLAN, spendChangeEntry(FORM, ID, CREATED))));

  assert.ok(error instanceof PlanWriteFailure);
  assert.equal(error.cause.message, 'write failed: /api/plan 507');
  assert.equal(transport.calls.length, 1, 'the write was attempted — this is the failure AFTER validation');
  // And the page must be able to tell the user the dangerous thing: the screen is ahead of the disk.
  assert.match(planFailureMessage(error), /could NOT be saved/);
  assert.match(planFailureMessage(error), /not what is on disk/);
});

test('a REFUSED edit gets its own sentence — neither "would not load" nor "would not save"', () => {
  const message = entryRefusalMessage(new PlanFileDateError('plan file: entries[3].date is "2030-1-1"'));

  assert.match(message, /was NOT made/);
  assert.match(message, /Nothing was sent/);
  assert.match(message, /2030-1-1/); // the refusal's own words reach the screen
  assert.ok(!/could NOT be saved/.test(message), 'a refused edit must not read as a disk failure');
  assert.ok(!/was not loaded/.test(message), 'a refused edit must not read as a load failure');
});

test('the refusal is put on the page, on the same banner as the other two states', () => {
  const banner = { textContent: '', hidden: true };
  showEntryRefusal(banner, new PlanFileEntryError('plan file: entries[3].owner is "everyone"'));
  assert.equal(banner.hidden, false);
  assert.match(banner.textContent, /everyone/);
});

// --- §7 A plan with no SPEND_CHANGE at all ------------------------------------------------------

test('a plan with no SPEND_CHANGE spends NOTHING — no line, no zero, and no error', () => {
  const none = parsePlan(withEntries(DEMO_PLAN, DEMO_PLAN.entries.filter((entry) => entry.type !== 'SPEND_CHANGE')));
  const months = project(none.settings, none.household, none.entries);

  assert.equal(months.length, BASE.length);
  assert.equal(months.flatMap((month) => month.lines).filter((line) => line.description === 'Household spending').length, 0);
  // Which is the same walk as having the level switched off — the two are the same state to the engine.
  const off = switchedOff(PLAN, 'spend-2026');
  assert.equal(digest(months), digest(walkOf(off)));
  // And a plan with NO entries at all is still a plan: the editor has to be able to draw this.
  const empty = parsePlan(withEntries(DEMO_PLAN, []));
  assert.deepEqual(empty.entries, []);
  assert.equal(project(empty.settings, empty.household, empty.entries).length, BASE.length);
});

// --- §8 The other four constructible types ------------------------------------------------------
//
// P6-6 shipped `SPEND_CHANGE` alone. The four below are the rest of what `parsePlan`'s
// `PARAMS_PARSERS` can read, and the set is DERIVED from that table rather than listed twice —
// `CONSTRUCTIBLE_ENTRY_TYPES` is the complement of `UNSPECIFIED_ENTRY_TYPES`, so a type gains a
// form when it gains a parser and not before.
//
// Everything §1–§7 established holds for all five and is asserted for all five: one validator, a
// transport that is NEVER CALLED on a refusal, an injected id and timestamp, and a direction that
// is measured over the WHOLE walk rather than read off the last month — on this fixture the
// terminal figures are insensitive to every one of these edits (see §10's header).

const RETIRE_FORM = { date: '2028-01-01', owner: 'personA', note: 'Dana stops earlier' };
const WORK_FORM = { date: '2028-01-01', owner: 'personA', daysPerWeek: '0', annualSalary: '0', note: 'down tools' };
const ONE_OFF_FORM = { date: '2029-03-01', owner: 'household', amount: '50,000', note: 'the car' };
const BUY_FORM = { date: '2028-06-01', owner: 'personA', amount: '40,000', incidentalCostsOfAcquisition: '500', note: 'ETF' };
const SELL_FORM = { date: '2028-06-01', owner: 'personA', amount: '20,000', parcelSelection: '', note: 'raise cash' };
// Dana is 64 here and retired in 2031-05 at 63 — past the tax-free age AND past a Condition of
// Release, which are two separate gates and both have to be cleared (`superLumpSum.ts`). Interest
// 0 is her accumulation account: the only one she holds, and named anyway, because the entry is
// required to say which. The box counts from 1, so she types `1` and the file stores position 0.
const LUMP_SUM_FORM = { date: '2033-01-01', owner: 'personA', amount: '50,000', interestIndex: '1', note: 'the roof, out of super' };
// Ash pays IN to Dana's superannuation — `owner: 'personB'`, and `receivingInterestIndex: '1'` is
// Dana's own accumulation interest, the only one that can receive a contribution. Ash's own
// interest (index 0) is an account-based pension and could not receive one — the whole point of
// naming the OTHER Person's account rather than the owner's own.
const SPOUSE_CONTRIBUTION_FORM = { date: '2033-01-01', owner: 'personB', amount: '3,000', receivingInterestIndex: '1', note: 'topping up Dana' };
/**
 * A salary sacrifice Dana can make (P6-8 brief 2 chunk 5). The amount is under FY2026-27's $32,500
 * general concessional cap and the date is inside that year, because `savePlan` walks the plan and
 * the walk refuses a stated amount above the cap for the year the arrangement starts in.
 */
const SACRIFICE_FORM = { date: '2026-11-01', owner: 'personA', annualAmount: '20,000', interestIndex: '1', note: 'sacrifice into super' };
/**
 * A home loan set from a date (P3-16 slice 2). All three figures, because a partial change is not
 * expressible; the owner is `household`, which is the only one the walk reads (a mortgage is a
 * Household fact under ADR-0005 and the branch ignores `owner` on `SPEND_CHANGE`'s ruling).
 * $420,000 at 6.1% repaid at $3,000 a month covers its first month's interest of $2,135.00 with
 * room to spare, so the walk `savePlan` runs does not refuse it.
 */
const LOAN_FORM = { date: '2029-03-01', owner: 'household', openingBalance: '420,000', annualInterestRate: '0.061', monthlyRepayment: '3,000', note: 'the new place' };
/** A mortgage target (P3-16a). `owner: 'household'` on concept.md's own table; no params box exists. */
const MORTGAGE_TARGET_FORM = { date: '2032-06-01', owner: 'household', note: 'aiming to have it paid off by then' };
const MORTGAGE_PAYOFF_FORM = { date: '2033-03-01', owner: 'household', note: 'inheritance clears it' };
/** An illness separation (P12-4). No params box; the demo Household is a couple, so the door accepts it. */
const ILLNESS_SEPARATION_FORM = { date: '2040-07-01', owner: 'household', note: 'Blair moves into care' };
/** A death (P12-1). No params box; the demo Household is a couple, so the door accepts it. */
const DEATH_FORM = { date: '2050-07-01', owner: 'personB', note: '' };
/** An entry into aged care (P14-13, slice 3b). Three boxes, all required, all the household's own estimate. */
const ENTER_CARE_FORM = { date: '2040-07-01', owner: 'personB', note: '', homeValue: '900,000', radPrice: '550,000', radPaidAsLumpSum: '550,000' };
/**
 * A HEAS draw (P9-2a: `owner` is a Person, never `household`). `owner: 'personB'`, dated well past
 * Person B's Age Pension age (67 from 2027-02-09) on a homeowner Household — `checkHeasDraws`'s own
 * two whole-file facts. `stopDate: ''` is the box's own "no stop" spelling.
 */
// `fortnightlyAmount` is stated in TODAY's money (user ruling, 2026-09-25) and raised to THIS
// entry's own day, 2040-07-01 — decades of CPI from `asAtDate` — before it meets the door's
// absolute ceiling; `900` was chosen so its NOMINAL figure ($1,266.45) clears the cap comfortably,
// where the old flat reading of `1,000` (unaffected by the ruling) no longer would.
const HEAS_DRAW_FORM = { date: '2040-07-01', owner: 'personB', note: '', securityValue: '900,000', fortnightlyAmount: '900', stopDate: '', advanceDate: '', advanceAmount: '' };
/** Sell the home outright (P14-13). `sellingCosts: ''` is the box's own "none stated" spelling. */
const SELL_HOME_FORM = { date: '2040-07-01', owner: 'household', note: '', salePrice: '900,000', sellingCosts: '', newHomeAmount: '', newHomePurchaseDate: '' };
/** Rent the whole home out (P14-13). The four costs and `endDate` are each `''` — "none stated". */
/** Buy a new home (P14-19). `purchaseCosts: ''` is the box's own "none stated" spelling. */
const BUY_HOME_FORM = { date: '2040-10-01', owner: 'household', note: '', purchasePrice: '600,000', purchaseCosts: '' };
const INSURANCE_COVER_CHANGE_FORM = { date: '2030-01-01', owner: 'personA', note: '', interestIndex: '1', benefit: 'death', coverPercent: '50' };
const TTR_START_FORM = { date: '2030-01-01', owner: 'personA', note: '', interestIndex: '2', drawdownRatePercent: '', amount: '' };
const DOWNSIZER_FORM = { date: '2040-08-01', owner: 'personA', note: '', amount: '200,000', receivingInterestIndex: '1', ownedTenYears: 'yes' };
const RENT_OUT_HOME_FORM = { date: '2040-07-01', owner: 'household', note: '', weeklyRent: '550', annualRates: '', annualInsurance: '', annualAgentFees: '', annualRepairs: '', endDate: '' };
/** A return change (P2-11). One box, a decimal fraction, `MORTGAGE_REFINANCE`'s own rate-box shape. */
const RETURN_CHANGE_FORM = { date: '2032-06-01', owner: 'personA', rate: '0.07', note: 'more conservative from here' };
const TTR_RATE_CHANGE_FORM = { date: '2027-01-01', owner: 'personA', interestIndex: '2', drawdownRatePercent: '7', note: '' };

test('days a week as typed: BLANK is NaN, and never the zero that would stop the salary', () => {
  assert.equal(daysAsTyped('3'), 3);
  assert.equal(daysAsTyped(' 2.5 '), 2.5);
  assert.equal(daysAsTyped('0'), 0);
  // `Number('')` is 0, and zero days is the ONE value the engine acts on — a blank box that became
  // a retirement would be this layer deciding the most consequential figure on the form.
  assert.ok(Number.isNaN(daysAsTyped('')));
  assert.ok(Number.isNaN(daysAsTyped('   ')));
  assert.ok(Number.isNaN(daysAsTyped('three')));
  // Negative and infinite go through unjudged, for `parsePlan` to refuse by name.
  assert.equal(daysAsTyped('-1'), -1);
  assert.equal(daysAsTyped('Infinity'), Number.POSITIVE_INFINITY);
});

test('the twenty-three constructible types are DERIVED from parsePlan’s parser table, not listed', () => {
  // **SIXTEEN → SEVENTEEN on 2026-09-24 (P14-13, slice 3a).** `ENTER_CARE` (renamed from the
  // unspecified `CARE_EVENT` placeholder) gained a parser, so it is constructible from this commit
  // — `entryForm.ts` still has no control for it, so `ENTRY_TYPES_NOT_YET_WALKED` holds it back
  // from `OFFERED_ENTRY_TYPES`, `TRIS_EARLY_CONVERSION`'s own precedent.
  // **SEVENTEEN → EIGHTEEN the same day (P9-1, slice 1).** `HEAS_DRAW` gained a parser too, and
  // `ENTRY_TYPES_NOT_YET_WALKED` holds it back the same way — engine-only by explicit instruction.
  // **EIGHTEEN → NINETEEN on 2026-09-25 (P14-13).** `SELL_HOME` gained a parser, a walk branch and a
  // form control in the same change, `MORTGAGE_REFINANCE`'s own precedent — it never passes through
  // `ENTRY_TYPES_NOT_YET_WALKED` at all.
  // **NINETEEN → TWENTY the same day (P14-13): `RENT_OUT_HOME` gained a parser, a walk branch and a
  // form control in one change, `SELL_HOME`'s own precedent — it never passes through
  // `ENTRY_TYPES_NOT_YET_WALKED` at all.**
  assert.deepEqual(
    [...CONSTRUCTIBLE_ENTRY_TYPES].sort(),
    ['BUY_HOME', 'DEATH', 'DOWNSIZER_CONTRIBUTION', 'ENTER_CARE', 'HEAS_DRAW', 'ILLNESS_SEPARATION', 'INSURANCE_COVER_CHANGE', 'LUMP_SUM_FROM_SUPER', 'MORTGAGE_PAYOFF', 'MORTGAGE_REFINANCE', 'MORTGAGE_TARGET', 'NON_SUPER_INVESTMENT', 'ONE_OFF_EXPENSE', 'RENT_OUT_HOME', 'RETIRE', 'RETURN_CHANGE', 'SELL_HOME', 'SPEND_CHANGE', 'SPOUSE_CONTRIBUTION', 'SUPER_CONTRIBUTION', 'TRIS_EARLY_CONVERSION', 'TTR_RATE_CHANGE', 'TTR_START', 'WORK_PATTERN_CHANGE'],
  );
  // **ELEVEN AND NINE FROM 2026-09-22 (P2-11 microtask 2).** `RETURN_CHANGE` gained a parser and was
  // held back by `ENTRY_TYPES_NOT_YET_WALKED` because `projection.ts` had no branch for it yet —
  // `SUPER_CONTRIBUTION`'s own original ground, and `TRIS_EARLY_CONVERSION`'s then-current one.
  // **ELEVEN AND TEN THE SAME DAY (P2-11 microtask 4).** The engine branch landed (microtask 3) and
  // `entryForm.ts` gained `returnChangeEntry` — `MORTGAGE_REFINANCE`'s own rate-box shape — so
  // `RETURN_CHANGE` left `ENTRY_TYPES_NOT_YET_WALKED` and the offered set moved with it, unlike
  // `TRIS_EARLY_CONVERSION`, which is still waiting on a form control of its own.
  // ⚠️ ~~**Seven from 2026-09-19, and the form still offers six.**~~ **SEVEN AND SEVEN FROM
  // 2026-09-20 (P6-8 brief 2 chunk 5).** `SUPER_CONTRIBUTION` gained a parser (brief 1) before
  // `projection.ts` gained a branch, and the gap was held open in `ENTRY_TYPES_NOT_YET_WALKED`
  // until the walk both honoured the entry and refused what it cannot price — the concessional cap.
  // The list is empty now, so the two sets below are the same set; `test/app-entry-form.test.mjs`
  // asserts that from both ends.
  // **EIGHT AND EIGHT FROM 2026-09-21 (P3-16 slice 2).** `MORTGAGE_REFINANCE` gained its parser and
  // its branch in the walk in one change, so it never passed through `ENTRY_TYPES_NOT_YET_WALKED`.
  // **NINE AND EIGHT FROM 2026-09-22.** `TRIS_EARLY_CONVERSION` (P3-8's conversion limb) gained a
  // parser and is held back by `ENTRY_TYPES_NOT_YET_WALKED` because `projection.ts` has no branch
  // for it — the two sets diverge again, on `SUPER_CONTRIBUTION`'s own precedent.
  // **TEN AND EIGHT FROM 2026-09-22 (P3-16a microtask 1).** `MORTGAGE_TARGET` gained its parser and
  // needs no branch in the walk at all — `appliedEntryIds` bucketing is generic over entry type —
  // but `entryForm.ts` had no control for it yet, so it was held back by `ENTRY_TYPES_NOT_YET_WALKED`
  // for that reason alone, on `TRIS_EARLY_CONVERSION`'s own precedent.
  // **TEN AND NINE FROM 2026-09-22 (P3-16a microtask 5).** The control was trivial to write —
  // `mortgageTargetEntry` is `retireEntry`'s own shape, `RetireParams` and `MortgageTargetParams`
  // both being `{}` — so `MORTGAGE_TARGET` left `ENTRY_TYPES_NOT_YET_WALKED` and the offered set
  // moved with it, unlike `TRIS_EARLY_CONVERSION`, which stays behind: it needs a form control for a
  // real params shape (`interestIndex`, a conversion day), and that is separate, later work.
  // **ELEVEN AND ELEVEN FROM 2026-09-22 (P3-19 microtask 4).** `SPOUSE_CONTRIBUTION` gained its
  // parser, a dedicated `projection.ts` branch AND a form control in one change, so it never passed
  // through `ENTRY_TYPES_NOT_YET_WALKED` at all — `MORTGAGE_REFINANCE`'s own precedent.
  // **TWELVE AND TWELVE FROM 2026-09-23.** `MORTGAGE_PAYOFF` gained parser, walk branch and form
  // control in one change, on the same precedent. **THIRTEEN AND THIRTEEN the same day:
  // `TTR_RATE_CHANGE` (TTR build step 3), shipped whole too.** **FOURTEEN AND FOURTEEN from
  // 2026-09-24: `ILLNESS_SEPARATION` (P12-4), shipped whole too.** **FIFTEEN AND FIFTEEN the same
  // day: `DEATH` (P12-1), shipped whole too.** **FIFTEEN AND SIXTEEN, the same day (slice 3b):
  // `ENTER_CARE` gained its form control (`enterCareEntry`) and left `ENTRY_TYPES_NOT_YET_WALKED`.**
  // **SIXTEEN AND SEVENTEEN on 2026-09-25 (P9-1, slice 2): `HEAS_DRAW` gained its form control
  // (`heasDrawEntry`, `sacrificeKind`'s own union-by-select shape) and left `ENTRY_TYPES_NOT_YET_
  // WALKED` too — `TRIS_EARLY_CONVERSION` is again the only name left in it.**
  // **SEVENTEEN AND EIGHTEEN THE SAME DAY (P14-13): `SELL_HOME` gained parser, walk branch and form
  // control in one change, `MORTGAGE_REFINANCE`'s own precedent for a type shipped whole.**
  // **EIGHTEEN AND NINETEEN THE SAME DAY (P14-13): `RENT_OUT_HOME`, shipped whole the same way.**
  // **NINETEEN AND TWENTY-ONE/TWENTY THE SAME DAY (P14-19): `BUY_HOME`, shipped whole the same way.**
  // P9-5, the same day: `DOWNSIZER_CONTRIBUTION`, shipped whole the same way.
  // P3-17a slice 3 (2026-09-25): `INSURANCE_COVER_CHANGE`, shipped whole.
  assert.deepEqual([...OFFERED_ENTRY_TYPES].sort(), ['BUY_HOME', 'DEATH', 'DOWNSIZER_CONTRIBUTION', 'ENTER_CARE', 'HEAS_DRAW', 'ILLNESS_SEPARATION', 'INSURANCE_COVER_CHANGE', 'LUMP_SUM_FROM_SUPER', 'MORTGAGE_PAYOFF', 'MORTGAGE_REFINANCE', 'MORTGAGE_TARGET', 'NON_SUPER_INVESTMENT', 'ONE_OFF_EXPENSE', 'RENT_OUT_HOME', 'RETIRE', 'RETURN_CHANGE', 'SELL_HOME', 'SPEND_CHANGE', 'SPOUSE_CONTRIBUTION', 'SUPER_CONTRIBUTION', 'TTR_RATE_CHANGE', 'TTR_START', 'WORK_PATTERN_CHANGE']);
  // And it really is the complement: no type is in both lists, and together they are every type.
  for (const type of CONSTRUCTIBLE_ENTRY_TYPES) {
    assert.ok(!UNSPECIFIED_ENTRY_TYPES.includes(type), `${type} is offered by the form AND refused by the door`);
  }
  assert.equal(CONSTRUCTIBLE_ENTRY_TYPES.length + UNSPECIFIED_ENTRY_TYPES.length, ENTRY_TYPES.length);
});

test('each of the four builds an entry parsePlan accepts, whole and unchanged', () => {
  const built = {
    RETIRE: retireEntry(RETIRE_FORM, 'r', CREATED),
    WORK_PATTERN_CHANGE: workPatternChangeEntry(WORK_FORM, 'w', CREATED),
    ONE_OFF_EXPENSE: oneOffExpenseEntry(ONE_OFF_FORM, 'o', CREATED),
    NON_SUPER_INVESTMENT: nonSuperInvestmentBuyEntry(BUY_FORM, 'b', CREATED),
  };
  const parsed = parsePlan({ ...PLAN, entries: [...PLAN.entries, ...Object.values(built)] });
  const added = parsed.entries.slice(PLAN.entries.length);

  assert.deepEqual(added.map((entry) => entry.type), Object.keys(built));
  assert.deepEqual(added[0], { id: 'r', date: '2028-01-01', owner: 'personA', type: 'RETIRE', params: {}, enabled: true, createdAt: CREATED, note: 'Dana stops earlier' });
  assert.deepEqual(added[1].params, { daysPerWeek: 0, annualSalary: 0 });
  assert.deepEqual(added[2].params, { amount: 5_000_000 });
  assert.deepEqual(added[3].params, { direction: 'buy', amount: 4_000_000, incidentalCostsOfAcquisition: 50_000 });
  // Append-only, for these four exactly as for the first.
  assert.deepEqual(parsed.entries.slice(0, PLAN.entries.length), PLAN.entries);
});

test('every builder takes its id and its createdAt as ARGUMENTS — no clock and no randomness anywhere', () => {
  const twice = (build, values) => [build(values, 'first-id', '2026-09-19'), build(values, 'second-id', '2031-12-25')];
  const cases = [
    [spendChangeEntry, FORM],
    [retireEntry, RETIRE_FORM],
    [workPatternChangeEntry, WORK_FORM],
    [oneOffExpenseEntry, ONE_OFF_FORM],
    [nonSuperInvestmentBuyEntry, BUY_FORM],
    [nonSuperInvestmentSellEntry, SELL_FORM],
    [lumpSumFromSuperEntry, LUMP_SUM_FORM],
    [superContributionEntry, SACRIFICE_FORM],
    [mortgageRefinanceEntry, LOAN_FORM],
    [mortgageTargetEntry, MORTGAGE_TARGET_FORM],
    [mortgagePayoffEntry, MORTGAGE_PAYOFF_FORM],
    [returnChangeEntry, RETURN_CHANGE_FORM],
    [spouseContributionEntry, SPOUSE_CONTRIBUTION_FORM],
    [ttrRateChangeEntry, TTR_RATE_CHANGE_FORM],
    [illnessSeparationEntry, ILLNESS_SEPARATION_FORM],
    [deathEntry, DEATH_FORM],
    [enterCareEntry, ENTER_CARE_FORM],
    [heasDrawEntry, HEAS_DRAW_FORM],
    [sellHomeEntry, SELL_HOME_FORM],
    [rentOutHomeEntry, RENT_OUT_HOME_FORM],
    [buyHomeEntry, BUY_HOME_FORM],
    [downsizerContributionEntry, DOWNSIZER_FORM],
    [insuranceCoverChangeEntry, INSURANCE_COVER_CHANGE_FORM],
    [ttrStartEntry, TTR_START_FORM],
  ];
  assert.equal(cases.length, OFFERED_ENTRY_TYPES.length + 1, 'a builder is missing from this table — the sell is the extra one');
  for (const [build, values] of cases) {
    const [first, second] = twice(build, values);
    assert.equal(first.id, 'first-id');
    assert.equal(first.createdAt, '2026-09-19');
    assert.equal(second.id, 'second-id');
    assert.equal(second.createdAt, '2031-12-25');
    // The positive control on "nothing else varies": two calls made at different moments differ in
    // the injected fields and in nothing else.
    assert.deepEqual({ ...first, id: null, createdAt: null }, { ...second, id: null, createdAt: null }, `${build.name} varies in something other than its arguments`);
    assert.equal(first.enabled, true, `${build.name} does not state enabled`);
  }
});

test('mortgageTargetEntry builds an entry parsePlan accepts, whole and unchanged — RETIRE’s own round trip', () => {
  const built = mortgageTargetEntry(MORTGAGE_TARGET_FORM, 't', CREATED);
  assert.deepEqual(built, {
    id: 't',
    date: '2032-06-01',
    owner: 'household',
    type: 'MORTGAGE_TARGET',
    params: {},
    enabled: true,
    createdAt: CREATED,
    note: 'aiming to have it paid off by then',
  });
  const parsed = parsePlan({ ...PLAN, entries: [...PLAN.entries, built] });
  const added = parsed.entries.at(-1);
  assert.equal(added.type, 'MORTGAGE_TARGET');
  assert.deepEqual(added.params, {}, '`MortgageTargetParams` is `{}` — a key surviving the round trip would be a field the door silently accepted');
  // Append-only: everything before it is untouched.
  assert.deepEqual(parsed.entries.slice(0, PLAN.entries.length), PLAN.entries);
});

test('mortgagePayoffEntry builds an entry parsePlan accepts, whole and unchanged — no amount box, `{}` params', () => {
  const built = mortgagePayoffEntry(MORTGAGE_PAYOFF_FORM, 'p', CREATED);
  assert.deepEqual(built, {
    id: 'p',
    date: '2033-03-01',
    owner: 'household',
    type: 'MORTGAGE_PAYOFF',
    params: {},
    enabled: true,
    createdAt: CREATED,
    note: 'inheritance clears it',
  });
  const parsed = parsePlan({ ...PLAN, entries: [...PLAN.entries, built] });
  assert.equal(parsed.entries.at(-1).type, 'MORTGAGE_PAYOFF');
  assert.deepEqual(parsed.entries.at(-1).params, {});
  // A stated amount is refused rather than dropped: the payout is what the walk says is owed.
  assert.throws(() => parsePlan({ ...PLAN, entries: [...PLAN.entries, { ...built, params: { amount: 100 } }] }), /"amount"/);
  assert.deepEqual(parsed.entries.slice(0, PLAN.entries.length), PLAN.entries);
});

test('enterCareEntry builds an entry parsePlan accepts, whole and unchanged — three money boxes, all through dollarsToCents', () => {
  const built = enterCareEntry(ENTER_CARE_FORM, 'ec', CREATED);
  assert.deepEqual(built, {
    id: 'ec',
    date: '2040-07-01',
    owner: 'personB',
    type: 'ENTER_CARE',
    params: { homeValue: 90_000_000, radPrice: 55_000_000, radPaidAsLumpSum: 55_000_000 },
    enabled: true,
    createdAt: CREATED,
  });
  const parsed = parsePlan({ ...PLAN, entries: [...PLAN.entries, built] });
  const added = parsed.entries.at(-1);
  assert.equal(added.type, 'ENTER_CARE');
  assert.deepEqual(added.params, { homeValue: 90_000_000, radPrice: 55_000_000, radPaidAsLumpSum: 55_000_000 });
  // A lump sum bigger than the room price is the door's refusal, not this layer's.
  assert.throws(
    () => parsePlan({ ...PLAN, entries: [...PLAN.entries, enterCareEntry({ ...ENTER_CARE_FORM, radPaidAsLumpSum: '600,000' }, 'x', CREATED)] }),
    /more than the RAD price/,
  );
  // `household` is refused at the door — `checkEnterCares` — never silently rewritten here.
  assert.throws(
    () => parsePlan({ ...PLAN, entries: [...PLAN.entries, enterCareEntry({ ...ENTER_CARE_FORM, owner: 'household' }, 'x', CREATED)] }),
    /entering permanent residential aged care is one Person/,
  );
  assert.deepEqual(parsed.entries.slice(0, PLAN.entries.length), PLAN.entries);
});

test('heasDrawEntry builds an entry parsePlan accepts, whole and unchanged — securityValue and a stated draw through dollarsToCents, "maximum" passed through bare, and a blank stopDate omitted', () => {
  const built = heasDrawEntry(HEAS_DRAW_FORM, 'heas', CREATED);
  assert.deepEqual(built, {
    id: 'heas',
    date: '2040-07-01',
    owner: 'personB',
    type: 'HEAS_DRAW',
    params: { securityValue: 90_000_000, fortnightlyAmount: 90_000 },
    enabled: true,
    createdAt: CREATED,
  });
  const parsed = parsePlan({ ...PLAN, entries: [...PLAN.entries, built] });
  const added = parsed.entries.at(-1);
  assert.equal(added.type, 'HEAS_DRAW');
  assert.deepEqual(added.params, { securityValue: 90_000_000, fortnightlyAmount: 90_000 });
  // The literal 'maximum' is passed through bare — never converted through dollarsToCents.
  const maxBuilt = heasDrawEntry({ ...HEAS_DRAW_FORM, fortnightlyAmount: 'maximum' }, 'heas2', CREATED);
  assert.equal(maxBuilt.params.fortnightlyAmount, 'maximum');
  parsePlan({ ...PLAN, entries: [...PLAN.entries, maxBuilt] });
  // A blank stopDate is OMITTED — never an empty string `parsePlan` would refuse as a malformed date.
  assert.ok(!Object.hasOwn(built.params, 'stopDate'));
  const stopped = heasDrawEntry({ ...HEAS_DRAW_FORM, stopDate: '2041-01-01' }, 'heas3', CREATED);
  assert.equal(stopped.params.stopDate, '2041-01-01');
  parsePlan({ ...PLAN, entries: [...PLAN.entries, stopped] });
  // `household` is refused at the door — `checkHeasDraws` — never silently rewritten here.
  assert.throws(
    () => parsePlan({ ...PLAN, entries: [...PLAN.entries, heasDrawEntry({ ...HEAS_DRAW_FORM, owner: 'household' }, 'x', CREATED)] }),
    /the Home Equity Access Scheme is a loan PER PERSON/,
  );
  // A stated amount over the absolute 150% ceiling is the door's refusal, not this layer's.
  assert.throws(
    () => parsePlan({ ...PLAN, entries: [...PLAN.entries, heasDrawEntry({ ...HEAS_DRAW_FORM, fortnightlyAmount: '100,000' }, 'x', CREATED)] }),
    /the absolute ceiling at/,
  );
  assert.deepEqual(parsed.entries.slice(0, PLAN.entries.length), PLAN.entries);
});

test('sellHomeEntry builds an entry parsePlan accepts, whole and unchanged — the sale price through dollarsToCents, and a blank sellingCosts omitted', () => {
  const built = sellHomeEntry(SELL_HOME_FORM, 'sell', CREATED);
  assert.deepEqual(built, {
    id: 'sell',
    date: '2040-07-01',
    owner: 'household',
    type: 'SELL_HOME',
    params: { salePrice: 90_000_000 },
    enabled: true,
    createdAt: CREATED,
  });
  const parsed = parsePlan({ ...PLAN, entries: [...PLAN.entries, built] });
  const added = parsed.entries.at(-1);
  assert.equal(added.type, 'SELL_HOME');
  assert.deepEqual(added.params, { salePrice: 90_000_000 });
  // A blank sellingCosts is OMITTED — never a zero this layer invented.
  assert.ok(!Object.hasOwn(built.params, 'sellingCosts'));
  const withCosts = sellHomeEntry({ ...SELL_HOME_FORM, sellingCosts: '20,000' }, 'sell2', CREATED);
  assert.equal(withCosts.params.sellingCosts, 2_000_000);
  parsePlan({ ...PLAN, entries: [...PLAN.entries, withCosts] });
  // A second SELL_HOME in one scenario is refused at the door — `checkSellHomes` — never silently merged.
  assert.throws(
    () => parsePlan(planWithEntry(planWithEntry(PLAN, built), sellHomeEntry(SELL_HOME_FORM, 'sell3', CREATED))),
    /a SECOND SELL_HOME entry/,
  );
  // A household with no home to sell is refused at the door too — never silently rewritten here.
  assert.throws(
    () => parsePlan({ ...PLAN, household: { ...PLAN.household, homeStatus: 'noHome' }, entries: [...PLAN.entries, built] }),
    /there is no home this build treats as a sellable principal home/,
  );
  assert.deepEqual(parsed.entries.slice(0, PLAN.entries.length), PLAN.entries);
});

test('buyHomeEntry builds an entry parsePlan accepts after a sale — the price through dollarsToCents, a blank purchaseCosts omitted', () => {
  const built = buyHomeEntry(BUY_HOME_FORM, 'buy', CREATED);
  assert.deepEqual(built, { id: 'buy', date: '2040-10-01', owner: 'household', type: 'BUY_HOME', params: { purchasePrice: 60_000_000 }, enabled: true, createdAt: CREATED });
  const sold = planWithEntry(PLAN, sellHomeEntry(SELL_HOME_FORM, 'sell', CREATED));
  assert.deepEqual(parsePlan(planWithEntry(sold, built)).entries.at(-1).params, { purchasePrice: 60_000_000 });
  assert.equal(buyHomeEntry({ ...BUY_HOME_FORM, purchaseCosts: '25,000' }, 'buy2', CREATED).params.purchaseCosts, 2_500_000);
  // Without the sale, the door refuses it by name.
  assert.throws(() => parsePlan(planWithEntry(PLAN, built)), /buying a first home without a sale isn't modelled/);
});

test('downsizerContributionEntry builds an entry parsePlan accepts after a sale; an unanswered ownership question is refused', () => {
  const built = downsizerContributionEntry(DOWNSIZER_FORM, 'downsizer', CREATED);
  const params = { amount: 20_000_000, receivingInterestIndex: 0, statedOwnedTenYears: true };
  assert.deepEqual(built, { id: 'downsizer', date: '2040-08-01', owner: 'personA', type: 'DOWNSIZER_CONTRIBUTION', params, enabled: true, createdAt: CREATED });
  const sold = planWithEntry(PLAN, sellHomeEntry(SELL_HOME_FORM, 'sell', CREATED));
  assert.deepEqual(parsePlan(planWithEntry(sold, built)).entries.at(-1).params, params);
  for (const ownedTenYears of ['', 'no']) {
    const unanswered = downsizerContributionEntry({ ...DOWNSIZER_FORM, ownedTenYears }, 'downsizer', CREATED);
    assert.ok(!Object.hasOwn(unanswered.params, 'statedOwnedTenYears'));
    assert.throws(() => parsePlan(planWithEntry(sold, unanswered)), /statedOwnedTenYears/);
  }
  assert.throws(() => parsePlan(planWithEntry(PLAN, built)), /DOWNSIZER_CONTRIBUTION with no SELL_HOME in the same scenario/);
});

test('rentOutHomeEntry builds an entry parsePlan accepts, whole and unchanged — the weekly rent through dollarsToCents, and blank costs/endDate omitted', () => {
  const built = rentOutHomeEntry(RENT_OUT_HOME_FORM, 'rent', CREATED);
  assert.deepEqual(built, {
    id: 'rent',
    date: '2040-07-01',
    owner: 'household',
    type: 'RENT_OUT_HOME',
    params: { weeklyRent: 55_000 },
    enabled: true,
    createdAt: CREATED,
  });
  const parsed = parsePlan({ ...PLAN, entries: [...PLAN.entries, built] });
  const added = parsed.entries.at(-1);
  assert.equal(added.type, 'RENT_OUT_HOME');
  assert.deepEqual(added.params, { weeklyRent: 55_000 });
  // Blank costs and a blank endDate are OMITTED — never a zero this layer invented.
  for (const key of ['annualRates', 'annualInsurance', 'annualAgentFees', 'annualRepairs', 'endDate']) {
    assert.ok(!Object.hasOwn(built.params, key), key);
  }
  const withCostsAndEnd = rentOutHomeEntry({ ...RENT_OUT_HOME_FORM, annualRates: '2,000', annualInsurance: '1,200', annualAgentFees: '2,200', annualRepairs: '1,500', endDate: '2041-07-01' }, 'rent2', CREATED);
  assert.deepEqual(withCostsAndEnd.params, { weeklyRent: 55_000, annualRates: 200_000, annualInsurance: 120_000, annualAgentFees: 220_000, annualRepairs: 150_000, endDate: '2041-07-01' });
  parsePlan({ ...PLAN, entries: [...PLAN.entries, withCostsAndEnd] });
  // An endDate on or before the entry's own date is refused at the door.
  assert.throws(
    () => parsePlan({ ...PLAN, entries: [...PLAN.entries, rentOutHomeEntry({ ...RENT_OUT_HOME_FORM, endDate: '2040-07-01' }, 'rent3', CREATED)] }),
    /a tenancy cannot end before or in the month it starts/,
  );
  // Two tenancies that overlap in one scenario are refused at the door.
  assert.throws(
    () => parsePlan(planWithEntry(planWithEntry(PLAN, built), rentOutHomeEntry(RENT_OUT_HOME_FORM, 'rent4', CREATED))),
    /the two tenancies overlap/,
  );
  // A household with no home to rent is refused at the door too — never silently rewritten here.
  assert.throws(
    () => parsePlan({ ...PLAN, household: { ...PLAN.household, homeStatus: 'noHome' }, entries: [...PLAN.entries, built] }),
    /there is no home this build treats as a rentable principal home/,
  );
  // An ENTER_CARE dated on or after an already-active tenancy in the same scenario is refused at the door.
  assert.throws(
    () => parsePlan(planWithEntry(planWithEntry(PLAN, built), enterCareEntry({ ...ENTER_CARE_FORM, date: '2040-08-01' }, 'care', CREATED))),
    /entering care means leaving a home actually lived in/i,
  );
  assert.deepEqual(parsed.entries.slice(0, PLAN.entries.length), PLAN.entries);
});

test('sellHomeEntry (P14-13c) — newHomeAmount through dollarsToCents, blank omitted, newHomePurchaseDate passed through for the door to refuse', () => {
  const withSetAside = sellHomeEntry({ ...SELL_HOME_FORM, newHomeAmount: '500,000' }, 'sell4', CREATED);
  assert.equal(withSetAside.params.newHomeAmount, 50_000_000);
  parsePlan({ ...PLAN, entries: [...PLAN.entries, withSetAside] });
  // A blank newHomeAmount is OMITTED — `sellingCosts`'s own idiom.
  const withoutSetAside = sellHomeEntry(SELL_HOME_FORM, 'sell5', CREATED);
  assert.ok(!Object.hasOwn(withoutSetAside.params, 'newHomeAmount'));
  // `newHomePurchaseDate` is NOT YET BUILT: a typed value reaches `parsePlan`'s own refusal rather
  // than being silently dropped here.
  const withPurchaseDate = sellHomeEntry({ ...SELL_HOME_FORM, newHomePurchaseDate: '2041-01-01' }, 'sell6', CREATED);
  assert.equal(withPurchaseDate.params.newHomePurchaseDate, '2041-01-01');
  assert.throws(
    () => parsePlan({ ...PLAN, entries: [...PLAN.entries, withPurchaseDate] }),
    /not yet built/,
  );
});

test('returnChangeEntry builds an entry parsePlan accepts, whole and unchanged — the rate goes through rateAsTyped', () => {
  const built = returnChangeEntry(RETURN_CHANGE_FORM, 'rc', CREATED);
  assert.deepEqual(built, {
    id: 'rc',
    date: '2032-06-01',
    owner: 'personA',
    type: 'RETURN_CHANGE',
    params: { rate: 0.07 },
    enabled: true,
    createdAt: CREATED,
    note: 'more conservative from here',
  });
  const parsed = parsePlan({ ...PLAN, entries: [...PLAN.entries, built] });
  const added = parsed.entries.at(-1);
  assert.equal(added.type, 'RETURN_CHANGE');
  assert.deepEqual(added.params, { rate: 0.07 });
  // Append-only: everything before it is untouched.
  assert.deepEqual(parsed.entries.slice(0, PLAN.entries.length), PLAN.entries);
});

test('a blank note omits the key for every type, not just the first', () => {
  for (const [build, values] of [[retireEntry, RETIRE_FORM], [workPatternChangeEntry, WORK_FORM], [oneOffExpenseEntry, ONE_OFF_FORM], [nonSuperInvestmentBuyEntry, BUY_FORM], [nonSuperInvestmentSellEntry, SELL_FORM]]) {
    assert.equal(Object.hasOwn(build({ ...values, note: '  ' }, 'x', CREATED), 'note'), false, `${build.name} wrote an empty note`);
    assert.equal(build({ ...values, note: ' roof ' }, 'x', CREATED).note, 'roof');
  }
});

test('a salary sacrifice built from form values is an entry parsePlan accepts, whole and unchanged', () => {
  // The builder writes `kind` itself — the form has no box for it, because three of the four kinds
  // are refused at the door with the reason they are not specified — and both figures go through
  // the unjudging converters: the money through `dollarsToCents`, the position through
  // `interestIndexAsTyped`, which is the one that must NOT read a blank box as interest 0.
  const built = superContributionEntry(SACRIFICE_FORM, 'sac', CREATED);
  assert.deepEqual(built.params, { kind: 'salarySacrificed', annualAmount: 2_000_000, interestIndex: 0 });
  const parsed = parsePlan(planWithEntry(PLAN, built));
  assert.deepEqual(parsed.entries.at(-1), { ...built, note: 'sacrifice into super' });
  // Blank is NaN in both boxes, refused by name rather than becoming zero — a nil sacrifice is how
  // a user would try to say "stop", which this entry type cannot say, and interest 0 is a real
  // account the user never named.
  assert.ok(Number.isNaN(superContributionEntry({ ...SACRIFICE_FORM, annualAmount: '' }, 'x', CREATED).params.annualAmount));
  assert.ok(Number.isNaN(superContributionEntry({ ...SACRIFICE_FORM, interestIndex: '' }, 'x', CREATED).params.interestIndex));
  assert.throws(() => parsePlan(planWithEntry(PLAN, superContributionEntry({ ...SACRIFICE_FORM, annualAmount: '' }, 'x', CREATED))));
  assert.throws(() => parsePlan(planWithEntry(PLAN, superContributionEntry({ ...SACRIFICE_FORM, interestIndex: '' }, 'x', CREATED))));
});

// --- §9 The buy and the sell are two SHAPES, and the form is two shapes ------------------------

test('a sell never carries incidentalCostsOfAcquisition, because its form values have no such field', () => {
  const sell = nonSuperInvestmentSellEntry(SELL_FORM, 's', CREATED);
  assert.deepEqual(Object.keys(sell.params).sort(), ['amount', 'direction']);
  assert.equal(sell.params.direction, 'sell');
  // A stated selection is carried through as typed; a blank one omits the KEY, because absence is
  // what `parsePlan` reads as "not stated" and `""` is a value.
  assert.deepEqual(nonSuperInvestmentSellEntry({ ...SELL_FORM, parcelSelection: 'oldest-first' }, 's', CREATED).params, { direction: 'sell', amount: 2_000_000, parcelSelection: 'oldest-first' });
  assert.equal(Object.hasOwn(parsePlan(planWithEntry(PLAN, sell)).entries.at(-1).params, 'parcelSelection'), false);
});

test('a buy always carries it, and a BLANK box is refused by name rather than becoming zero', () => {
  const buy = nonSuperInvestmentBuyEntry(BUY_FORM, 'b', CREATED);
  assert.deepEqual(Object.keys(buy.params).sort(), ['amount', 'direction', 'incidentalCostsOfAcquisition']);
  assert.ok(!Object.hasOwn(buy.params, 'parcelSelection'), 'a buy has no parcel selection to make');
  // Blank is NaN, not toCents(0): zero brokerage is a claim about the trade that changes the
  // parcel's cost base and the CGT on a future disposal, and this layer does not make it.
  assert.ok(Number.isNaN(nonSuperInvestmentBuyEntry({ ...BUY_FORM, incidentalCostsOfAcquisition: '' }, 'b', CREATED).params.incidentalCostsOfAcquisition));
});

test('the flat form that was NOT built: a sell carrying incidental costs is refused, and never written', async () => {
  // This is the plan a single set of boxes offering every field to both directions would produce.
  // It is refused at the door on the key itself — so the failure of that design is not "the user
  // sees a worse message", it is "the user cannot save at all, over a box they did not fill in".
  const transport = spy();
  const flat = planWithEntry(PLAN, {
    ...nonSuperInvestmentSellEntry(SELL_FORM, 'flat', CREATED),
    params: { direction: 'sell', amount: 2_000_000, incidentalCostsOfAcquisition: 0 },
  });

  const error = await thrown(() => savePlan(transport, flat));

  assert.ok(error instanceof PlanFileEntryError, `${error.constructor.name}: ${error.message}`);
  assert.match(error.message, /"incidentalCostsOfAcquisition", which this build does not read/);
  assert.equal(transport.calls.length, 0, 'a plan the door refuses was sent to the transport');
  // The mirror: a buy WITHOUT the field is refused too, so neither direction tolerates the other's shape.
  const missing = planWithEntry(PLAN, { ...nonSuperInvestmentBuyEntry(BUY_FORM, 'flat', CREATED), params: { direction: 'buy', amount: 4_000_000 } });
  const other = await thrown(() => savePlan(transport, missing));
  assert.match(other.message, /incidentalCostsOfAcquisition is undefined/);
  assert.equal(transport.calls.length, 0);
});

// --- §10 Bad values in the new boxes: refused by name, transport never called ------------------

const REFUSED_TYPES = {
  'a retirement with no date': [retireEntry, { ...RETIRE_FORM, date: '' }, PlanFileDateError],
  'a retirement owned by nobody the plan knows': [retireEntry, { ...RETIRE_FORM, owner: 'the dog' }, PlanFileEntryError],
  'a days-a-week box left blank': [workPatternChangeEntry, { ...WORK_FORM, daysPerWeek: '' }, PlanFileEntryError],
  'a days-a-week figure that is not a number': [workPatternChangeEntry, { ...WORK_FORM, daysPerWeek: 'three' }, PlanFileEntryError],
  'a negative number of days': [workPatternChangeEntry, { ...WORK_FORM, daysPerWeek: '-1' }, PlanFileEntryError],
  'a salary box left blank': [workPatternChangeEntry, { ...WORK_FORM, annualSalary: '' }, PlanFileAmountError],
  'a negative salary': [workPatternChangeEntry, { ...WORK_FORM, annualSalary: '-1' }, PlanFileEntryError],
  // The two contradictory PAIRS, through the form the user actually types into: each box on its
  // own is a figure the door accepts, and it is the combination that cannot be true.
  'no days a week and a salary anyway': [workPatternChangeEntry, { ...WORK_FORM, daysPerWeek: '0', annualSalary: '60,000' }, PlanFileEntryError],
  'days a week and no salary at all': [workPatternChangeEntry, { ...WORK_FORM, daysPerWeek: '3', annualSalary: '0' }, PlanFileEntryError],
  'a one-off expense that is not a number': [oneOffExpenseEntry, { ...ONE_OFF_FORM, amount: 'a lot' }, PlanFileAmountError],
  'a one-off expense with a third decimal place': [oneOffExpenseEntry, { ...ONE_OFF_FORM, amount: '38000.505' }, PlanFileAmountError],
  'a buy with no brokerage figure at all': [nonSuperInvestmentBuyEntry, { ...BUY_FORM, incidentalCostsOfAcquisition: '' }, PlanFileAmountError],
  'a buy with no amount': [nonSuperInvestmentBuyEntry, { ...BUY_FORM, amount: '' }, PlanFileAmountError],
  'a sell with a parcel selection this build does not know': [nonSuperInvestmentSellEntry, { ...SELL_FORM, parcelSelection: 'newest-first' }, PlanFileEntryError],
  'a sell with a date that is not zero-padded': [nonSuperInvestmentSellEntry, { ...SELL_FORM, date: '2028-6-1' }, PlanFileDateError],
  'a lump sum with no amount': [lumpSumFromSuperEntry, { ...LUMP_SUM_FORM, amount: '' }, PlanFileAmountError],
  'a lump sum of nothing': [lumpSumFromSuperEntry, { ...LUMP_SUM_FORM, amount: '0' }, PlanFileEntryError],
  'a lump sum paid INTO super': [lumpSumFromSuperEntry, { ...LUMP_SUM_FORM, amount: '-1,000' }, PlanFileEntryError],
  // Blank is the one that matters: `Number('')` is 0 and 0 is a real interest — the FIRST one.
  'a lump sum naming no interest': [lumpSumFromSuperEntry, { ...LUMP_SUM_FORM, interestIndex: '' }, PlanFileEntryError],
  'a lump sum naming half an interest': [lumpSumFromSuperEntry, { ...LUMP_SUM_FORM, interestIndex: '1.5' }, PlanFileEntryError],
  'a lump sum naming account 0, which the box does not count': [lumpSumFromSuperEntry, { ...LUMP_SUM_FORM, interestIndex: '0' }, PlanFileEntryError],
};

for (const [description, [build, values, Refusal]] of Object.entries(REFUSED_TYPES)) {
  test(`${description} is refused by name, and nothing is sent to the transport`, async () => {
    const transport = spy();

    const error = await thrown(() => savePlan(transport, planWithEntry(PLAN, build(values, ID, CREATED))));

    assert.ok(error instanceof Refusal, `${error.constructor.name} is not ${Refusal.name}: ${error.message}`);
    assert.equal(transport.calls.length, 0, 'the transport was called with a plan that does not validate');
  });
}

test('the positive control for §10: the SAME spy is called once for each of the six, on good values', async () => {
  const good = [
    [spendChangeEntry, FORM],
    [retireEntry, RETIRE_FORM],
    [workPatternChangeEntry, WORK_FORM],
    [oneOffExpenseEntry, ONE_OFF_FORM],
    [nonSuperInvestmentBuyEntry, BUY_FORM],
    [nonSuperInvestmentSellEntry, SELL_FORM],
    [lumpSumFromSuperEntry, LUMP_SUM_FORM],
  ];
  const transport = spy();
  for (const [build, values] of good) await savePlan(transport, planWithEntry(PLAN, build(values, ID, CREATED)));
  assert.equal(transport.calls.length, good.length, 'a spy that never fires would make every refusal above vacuous');
});

test('a NON_SUPER_INVESTMENT owned by the HOUSEHOLD parses and the engine refuses it — so it is never written', async () => {
  // The second reachable instance of the gap the walk half of the gate exists for, and it is not
  // the Planning Horizon one: a parcel belongs to a Person and to exactly one (P3-21c), which
  // `parsePlan` has no opinion about because `owner: 'household'` is a valid owner. The owner box
  // offers `household` for the four types that take it, so this is one wrong selection away.
  const transport = spy();
  const candidate = planWithEntry(PLAN, nonSuperInvestmentBuyEntry({ ...BUY_FORM, owner: 'household' }, 'household-parcel', CREATED));

  assert.doesNotThrow(() => parsePlan(candidate), 'the premise: the file boundary accepts this one');

  const error = await thrown(() => savePlan(transport, candidate));
  assert.match(error.message, /a non-super parcel belongs to a Person and to exactly one/);
  assert.equal(transport.calls.length, 0);
});

// --- §11 The direction each new type implies, measured over the WHOLE walk ----------------------
//
// ⚠️ **Every one of these edits leaves the FINAL month bit-identical on this fixture.** Measured,
// not assumed: total wealth in month 500 is the same figure to the cent after an earlier
// retirement, after a stopped salary, after a $50,000 expense, after a $40,500 purchase and after a
// $20,000 sale. The trajectories diverge for years and then RE-CONVERGE, because the household
// exhausts its drawable wealth, lands on the Age Pension, and accumulates the same surplus
// afterwards whatever happened before. A terminal-balance assertion would pass on an entry the
// engine never applied, so there is not one below: each case asserts the direction over all 501
// months, a minimum number of months that moved, and the mechanism's own line or figure.
//
// One more figure turned out insensitive and is pinned as such rather than quietly avoided: the
// month an entry is DATED in (the wealth bands are read on the month's first day, so a change shows
// from the month after). `daysPerWeek` at a positive value used to be the second — the whole walk
// was bit-identical at three days a week — and stopped being so on 2026-09-19, when the entry
// gained a stated `annualSalary`; its test now measures the fall instead of the inertness.

/** The bands the chart stacks: everything but the cash balance. A parcel lives here; the offset does too. */
const bands = (month) => month.protectedAssets + month.assessableAssets;

const monthsWith = (walk, description) => walk.filter((month) => month.lines.some((line) => line.description === description));

/** The walk of PLAN plus these candidate entries, through the same gate a save goes through. */
const walkWith = (...entries) => {
  let plan = PLAN;
  for (const entry of entries) plan = validatedPlan(planWithEntry(plan, entry)).plan;
  return project(plan.settings, plan.household, plan.entries);
};

const indexOfMonth = (month) => BASE.findIndex((each) => each.month === month);

/** Nothing before the entry's own month moved at all — asserted on the whole `Month`, not on wealth. */
const prefixUnchanged = (walk, month) => {
  const at = indexOfMonth(month);
  assert.ok(at > 0, `${month} is not in the walk`);
  assert.deepEqual(walk.slice(0, at), BASE.slice(0, at), `months before ${month} changed — an entry reached back behind its own date`);
};

test('an earlier RETIRE lowers wealth, raises it in NO month, and stops the salary from its own date', () => {
  const months = walkWith(retireEntry(RETIRE_FORM, 'retires-2028', CREATED));

  // ⚠️ **From 2026-09-23 the direction is asserted with Dana's account KEPT OUT of the switch at
  // retirement, and the reason is a real crossing, not noise.** The demo's own RETIRE (2031-05-14,
  // at 63) switches her accumulation account to an account-based pension; this entry retires her at
  // 59, before 60, so it switches nothing. Those are two changes, not one: the pension is drawn
  // first, pays its minimum into cash that earns CPI instead of 6.5%, and counts in Ash's assets
  // test while Dana is under 67. Measured with both switched on, the 59-year-old retiree ends
  // richer from 2064-03 (51 months) — until the draw order changed the same day (asserted below:
  // the crossing is gone). With the
  // account kept out, the ONLY difference left is three years of salary, and that is what this
  // test exists to pin: an opted-out plan walks exactly as before the switch existed.
  const keptOut = (plan) => ({ ...plan, household: { ...plan.household, persons: [
    { ...plan.household.persons[0], superInterests: plan.household.persons[0].superInterests.map((i) => ({ ...i, keepInAccumulationAtRetirement: true })) },
    plan.household.persons[1],
  ] } });
  const keptBase = project(PLAN.settings, keptOut(PLAN).household, PLAN.entries);
  const keptEarly = project(PLAN.settings, keptOut(PLAN).household, [...PLAN.entries, retireEntry(RETIRE_FORM, 'retires-2028', CREATED)]);
  assert.equal(keptEarly.length, keptBase.length);
  const risen = keptBase.filter((month, i) => wealth(keptEarly[i]) > wealth(month)).map((month) => month.month);
  assert.deepEqual(risen, [], 'retiring three years earlier RAISED total wealth in these months');
  const fallen = keptBase.filter((month, i) => wealth(keptEarly[i]) < wealth(month));
  assert.ok(fallen.length > 100, `only ${fallen.length} months moved — an inequality this weak would pass on a no-op`);
  // ⚠️ **THE CROSSING IS GONE SINCE "SPEND CASH FIRST" (later on 2026-09-23), and the reason it
  // existed is the reason it went.** With the switch on, the earlier retiree used to end richer from
  // 2064-03 (51 months): the switched pension paid its minimum into cash that sat at CPI while 6.5%
  // assets were sold, so NOT switching was worth more than three years of salary by the end. Cash is
  // now spent before investments, the pile-up is gone, and the 59-year-old retiree is poorer in
  // every month that moves — on the committed plan as well as with the account kept out.
  assert.equal(months.length, BASE.length);
  const crossed = BASE.filter((month, i) => wealth(months[i]) > wealth(month)).map((month) => month.month);
  assert.deepEqual(crossed, [], 'retiring three years earlier RAISED total wealth on the committed plan');
  assert.ok(BASE.filter((month, i) => wealth(months[i]) < wealth(month)).length > 100);
  assert.ok(months.every((month) => month.notes.every((note) => note.subject !== 'pension at retirement' || note.outcome === 'under 60')));
  // The mechanism, not just the sign: the last wage moves from 2031-05 back to 2028-01. A RETIRE
  // date is the last day worked (2026-09-23), so each retirement month pays its days up to that
  // date: the demo's 14 May pays 14/31 of May, and this entry's 1 January pays one day of January.
  assert.equal(monthsWith(BASE, 'Salary, Dana').at(-1).month, '2031-05');
  assert.equal(monthsWith(months, 'Salary, Dana').at(-1).month, '2028-01');
  // One day of January's pay, of the salary raised 16 months at 3.5% since September 2026 (2026-09-23).
  assert.equal(months[indexOfMonth('2028-01')].lines.find((line) => line.description === 'Salary, Dana').amount, Math.round(Math.round(Math.round(8_060_000 * 1.035 ** (16 / 12)) / 31) / 12));
  assert.ok(months.some((month) => month.appliedEntryIds.includes('retires-2028')));
  prefixUnchanged(months, '2028-01');
});

test('a WORK_PATTERN_CHANGE to NO days lowers wealth and raises it in no month', () => {
  const months = walkWith(workPatternChangeEntry(WORK_FORM, 'no-days-2028', CREATED));

  const risen = BASE.filter((month, i) => wealth(months[i]) > wealth(month)).map((month) => month.month);
  assert.deepEqual(risen, [], 'working no days RAISED total wealth in these months');
  assert.ok(BASE.filter((month, i) => wealth(months[i]) < wealth(month)).length > 100);
  assert.equal(monthsWith(months, 'Salary, Dana').length, 16, 'the salary did not stop at the entry’s date');
  // 57: 2026-09 to 2031-04, and 14/31 of May 2031 — the demo's RETIRE month pays its days worked.
  assert.equal(monthsWith(BASE, 'Salary, Dana').length, 57, 'the control: the salary the entry has to remove');
  prefixUnchanged(months, '2028-01');
});

test('a WORK_PATTERN_CHANGE to a POSITIVE number of days lowers wealth by the salary it STATES', () => {
  // ⚠️ **This test asserted the opposite until 2026-09-19, and the finding it recorded is closed.**
  // It read *"a WORK_PATTERN_CHANGE to a POSITIVE number of days moves no figure at all"*, and it
  // was right: `projection.ts` set `worksNoDays = daysPerWeek === 0` and did nothing else with the
  // figure, because a `daysPerWeek` cannot be turned into a salary without a full-time baseline
  // nobody had stated. It was pinned so that "a build which later prorates the wage fails HERE and
  // is looked at". No build prorates the wage: `WorkPatternChangeParams.annualSalary` states it,
  // and the assertion is re-derived onto the figure the user typed rather than deleted.
  //
  // Dana is paid $3,100 a fortnight — $80,600 a year, $6,716.67 a month. Three days a week is
  // stated here as $40,000 a year, which is $3,333.33 a month: not three fifths of anything the
  // engine computed, just the figure the household says those days pay.
  //
  // ⚠️ **AND BOTH ARE IN TODAY'S WAGES (2026-09-23).** Pay rises with the plan's 3.5% wage growth,
  // every month from `asAtDate` (2026-09), and a `WORK_PATTERN_CHANGE`'s salary is read on
  // `SPEND_CHANGE`'s precedent: in the wage level of `asAtDate`, not of its own date. So in 2028-02,
  // seventeen months on, the $80,600 pays $80,600 × 1.035 ^ (17/12) ÷ 12 = $7,052.11 and the
  // $40,000 pays $40,000 × 1.035 ^ (17/12) ÷ 12 = $3,499.81 — the SAME factor on both, which is
  // what "in today's wages" means. Read in the entry's own 2028 wages it would be $3,333.33.
  const months = walkWith(workPatternChangeEntry({ ...WORK_FORM, daysPerWeek: '3', annualSalary: '40,000' }, 'three-days', CREATED));

  // THE DIRECTION, over all 501 months — never the last one, which is insensitive here as the
  // header says. A salary cut cannot raise wealth in any month of the walk.
  const risen = BASE.filter((month, i) => wealth(months[i]) > wealth(month)).map((month) => month.month);
  assert.deepEqual(risen, [], 'a salary cut RAISED total wealth in these months');
  const fallen = BASE.filter((month, i) => wealth(months[i]) < wealth(month));
  assert.ok(fallen.length > 100, `only ${fallen.length} months moved — an inequality this weak would pass on a no-op`);

  // THE MECHANISM: the salary line is still there — this is a pattern, not a retirement — and it
  // is the stated figure, re-derived from the two annual amounts and not read off the output.
  assert.equal(monthsWith(months, 'Salary, Dana').length, 57, 'the wage stopped instead of changing');
  const amountIn = (walk, month, description) =>
    walk[indexOfMonth(month)].lines.filter((line) => line.description === description).map((line) => line.amount);
  const raised = (annual, monthsOn) => Math.round(Math.round(annual * 1.035 ** (monthsOn / 12)) / 12);
  assert.equal(Math.round((3_100_00 * 26) / 12), 671_667);
  assert.equal(Math.round(4_000_000 / 12), 333_333);
  assert.equal(raised(8_060_000, 17), 705_211);
  assert.equal(raised(4_000_000, 17), 349_981);
  assert.deepEqual(amountIn(BASE, '2028-02', 'Salary, Dana'), [705_211], 'the control: the wage the entry has to replace');
  assert.deepEqual(amountIn(months, '2027-12', 'Salary, Dana'), [raised(8_060_000, 15)], 'the level rewrote a month BEFORE its own date');
  assert.deepEqual(amountIn(months, '2028-02', 'Salary, Dana'), [349_981]);

  // AND THE TAX FOLLOWS IT, because the accrual is assessed on this salary and no other income.
  // Strictly lower and still present: a tax line that vanished would be a different claim.
  assert.equal(amountIn(months, '2028-02', 'Income tax, Dana').length, 1);
  assert.ok(
    amountIn(months, '2028-02', 'Income tax, Dana')[0] < amountIn(BASE, '2028-02', 'Income tax, Dana')[0],
    'the accrual is still being assessed on the $80,600 the entry replaced',
  );

  // And the entry DID reach the engine — this is not a plan that failed to apply.
  assert.ok(months.some((month) => month.appliedEntryIds.includes('three-days')));
  prefixUnchanged(months, '2028-01');
});

test('a super account number as typed counts from 1 and becomes the position counted from 0; BLANK is NaN', () => {
  // The box counts as the page does ("super account 1" is the first, ruling 2026-09-24); the file
  // stores the position, which does not move.
  assert.equal(interestIndexAsTyped('1'), 0);
  assert.equal(interestIndexAsTyped(' 2 '), 1);
  // `Number('')` is 0, and a blank box that became an account would withdraw from one the user
  // never chose — the whole reason the field is required.
  assert.ok(Number.isNaN(interestIndexAsTyped('')));
  assert.ok(Number.isNaN(interestIndexAsTyped('  ')));
  assert.ok(Number.isNaN(interestIndexAsTyped('the second one')));
  // Unjudged, like every other converter here: the door refuses these by name, not this layer.
  assert.equal(interestIndexAsTyped('0'), -1);
  assert.equal(interestIndexAsTyped('1.5'), 0.5);
});


/**
 * **P17-3 — where a rule went when it left an ⓘ box.** Each entry's box now says what the entry does
 * in a line or two and never restates a figure, a threshold or a rule; those live only in
 * `userguide.md`, at the label the box's `infoButton` call names. A pin that used to hold a rule in a
 * notice holds it on the guide's section instead: the words under `{#label}`, down to the next
 * heading of the same or a higher level, with the P17-4/5 tags reduced to the text a reader sees.
 */
const GUIDE = readFileSync(new URL('../userguide.md', import.meta.url), 'utf8').replaceAll(/\{\{(?:name|fig)[^|{}]*\|([^{}]*)\}\}/g, '$1');
const guideSection = (label) => {
  const lines = GUIDE.split('\n');
  const at = lines.findIndex((line) => /^#+ /.test(line) && line.endsWith(`{#${label}}`));
  assert.ok(at >= 0, `userguide.md has no heading labelled {#${label}}`);
  const level = /^#+/.exec(lines[at])[0].length;
  const end = lines.findIndex((line, i) => i > at && /^#+ /.test(line) && /^#+/.exec(line)[0].length <= level);
  return lines.slice(at, end < 0 ? undefined : end).join(' ');
};

test('the withdrawal box names the DIRECTION of its one known error, and the guide carries the rules — on screen, before the save', () => {
  // The middle fact is the residual this build ships with rather than a rule it enforces: the nil
  // tax assumes a taxed source, and for an untaxed-source (legacy public-sector) scheme the forecast
  // is optimistic. The direction stays ON THE PAGE, in the line beside the button — a known-unsafe
  // gap is named where the figure is typed. P17-3 moved the age floor and the rest to the guide.
  assert.match(LUMP_SUM_ENTRY_SUMMARY, /no tax/, 'must say what the tax the forecast shows is');
  assert.match(LUMP_SUM_ENTRY_SUMMARY, /optimistic/, 'must state the DIRECTION of the error, not merely that there is one');
  assert.match(LUMP_SUM_ENTRY_NOTICE, /pays out what is there/, 'must say what a withdrawal larger than the balance does');
  const guide = guideSection('super-lump-sum');
  assert.match(guide, /\b60\b/, 'must name the age below which the withdrawal is refused');
  assert.match(guide, /refused outright, not estimated/, 'must say that below it the withdrawal is REFUSED, not estimated');
  assert.match(guide, /assumes a "taxed" fund/i, 'must name the source the nil tax assumes');
  assert.match(guide, /never had tax taken on the way in/, 'must name the household the assumption is wrong for');
  assert.match(guide, /too optimistic/, 'must state the DIRECTION of the error');
  assert.match(guide, /\*\*no tax\*\*/, 'must say what the tax at 60+ actually is');
  assert.match(guide, /simply pays out whatever is there/, 'must say what a withdrawal larger than the balance does');
});

test('the salary-sacrifice box says how to end it, and the guide names every direction the forecast is wrong in', () => {
  // P6-8 brief 2 chunk 5, widened by brief 3's final chunk, and moved by P17-3: the box keeps the
  // one pair of acts a user must not have to guess between — stopping from a date, which leaves the
  // years already run alone, and switching the entry off, which takes those years away too — and
  // every rule and direction the notice used to carry is pinned on the guide's section instead.
  assert.match(SUPER_CONTRIBUTION_ENTRY_SUMMARY, /until another of these entries changes or stops it/, 'must say the level holds until it is replaced');
  assert.match(SUPER_CONTRIBUTION_ENTRY_NOTICE, /Stop sacrificing/, 'must name the control that ends the arrangement from a date');
  assert.match(SUPER_CONTRIBUTION_ENTRY_NOTICE, /the years it ran are kept/, 'must say a stop does not reach backwards');
  assert.match(SUPER_CONTRIBUTION_ENTRY_NOTICE, /Switching this entry off takes it out of the whole forecast, including those years/, 'must distinguish stopping from switching off');
  assert.doesNotMatch(SUPER_CONTRIBUTION_ENTRY_NOTICE, /cannot say "stop on this date"/, 'the notice still says stopping is impossible');
  const guide = guideSection('salary-sacrifice');
  assert.match(guide, /standing/i, 'must say the level holds until it is replaced');
  assert.match(guide, /Stop sacrificing, from this date/, 'must name the control that ends the arrangement from a date');
  assert.match(guide, /already gone in stays in/, 'must say a stop does not reach backwards');
  assert.match(guide, /switching the original entry off[\s\S]*removes it from every year it ever ran/, 'must distinguish stopping from switching off');
  assert.match(guide, /refused outright if the two together are over the year's\s+cap/, 'must say the over-cap amount is REFUSED, and that the Guarantee counts');
  assert.match(guide, /under the cap isn't proof/, 'must say that passing the cap check is not a finding of compliance');
  // P3-4b slice 2: unused cap from before the plan can now be typed in, so the WHY is that it counts only if it is.
  assert.match(guide, /unused cap from a year before your plan starts counts only if you type it in/, 'must say WHY being under the cap proves nothing');
  assert.match(guide, /personal contributions you claim a deduction for aren't held/, 'must name the second limb the total is missing');
  assert.match(guide, /Chapter 27|#division-293/, 'must send the reader to the extra tax for high incomes');
  assert.match(guide, /never bigger than what you actually earn/, 'must state the DIRECTION of the over-the-pay cap');
  // Where the release election is made, and that not electing is an answer: the Division 293 page.
  const election = guideSection('division-293-election');
  assert.match(election, /Household and settings/);
  assert.match(election, /what the law does if you decide nothing/, 'must say that NOT electing is an answer, not an omission');
  // Gone from the box and NOT in the guide (TODO.md P17-3 lists them): the 20 September 2026
  // behaviour-change notice and its worked example, the $25,000 room from July 2027, and that only
  // an accumulation account can receive a contribution.
});

test('the spouse contribution box says who pays into whom, and the guide carries the offset and the tax (P3-19)', () => {
  assert.match(SPOUSE_CONTRIBUTION_ENTRY_SUMMARY, /after-tax money/, 'must say this is not a before-tax arrangement');
  assert.match(SPOUSE_CONTRIBUTION_ENTRY_NOTICE, /owner you choose above is who PAYS/i, 'must say the owner is the contributor, not the receiver');
  assert.match(SPOUSE_CONTRIBUTION_ENTRY_NOTICE, /your spouse’s super account/, 'must say the money lands in the OTHER person\'s account');
  assert.match(SPOUSE_CONTRIBUTION_ENTRY_NOTICE, /still paying into/, 'must say which interests can receive it');
  const guide = guideSection('spouse-contribution');
  assert.match(guide, /\$540/, 'must name the maximum offset');
  assert.match(guide, /spouse's income for the \*whole\* financial year/, 'must say the offset depends on the RECEIVING spouse\'s whole-year income');
  assert.match(guide, /own money, already taxed/, 'must say this is not a before-tax arrangement');
  assert.match(guide, /no 15%/, 'must say the fund does not tax this contribution');
  assert.match(guide, /doesn't count towards the concessional cap/, 'must distinguish this from SUPER_CONTRIBUTION');
  assert.match(guide, /who is paying/, 'must say the owner is the contributor, not the receiver');
  assert.match(guide, /\*other\* person's account/, 'must say the money lands in the OTHER person\'s account');
  assert.match(guide, /still being paid into/, 'must say which interests can receive it');
});

test('the entry-point box states the PAIRING the door enforces, and names the salary as what the forecast uses', () => {
  // ⚠️ **Re-derived on 2026-09-19 from the notice this replaced**, which read "Only 0 changes the
  // forecast today. Any other number of days is not modelled: the salary carries on unchanged, so
  // the forecast this produces is optimistic, not neutral." Every clause of that is now false, and
  // the three assertions that pinned it (`/0/`, `/not modelled/`, `/optimistic/`) are rewritten
  // onto what the box has to say instead — not dropped. P17-3: the line and the disclosure together.
  const box = `${DAYS_PER_WEEK_ENTRY_SUMMARY} ${DAYS_PER_WEEK_ENTRY_NOTICE}`;
  assert.match(box, /\b0 days\b/, 'must still name the zero case, which is the one figure that needs no salary');
  assert.match(DAYS_PER_WEEK_ENTRY_NOTICE, /salary/i, 'must name the salary as the figure the forecast uses');
  assert.match(DAYS_PER_WEEK_ENTRY_NOTICE, /replaces/, 'must say that the stated salary REPLACES the figure on file, not adds to it');
  assert.doesNotMatch(box, /not modelled|optimistic/, 'the retired warning is back — a positive number of days IS modelled now');
});

test('THE SUMMARY LINES ARE TEXT, not just an argument name — the line read without opening the disclosure', () => {
  // **P4-15.** Each `*_ENTRY_SUMMARY` is the sentence printed beside its info button, and the only
  // thing that mentioned three of them was `entryForm.ts`'s wiring assertion
  // (`infoButton(X_SUMMARY, X_NOTICE)`), which matches the TOKEN in the source and cannot see the
  // text: emptying any of these three left the whole suite green with the on-screen line gone, and
  // the notice behind the button is read only by a user who opens it. The floor and one subject
  // each — the wording stays free, the sentence does not. (P17-3 took the age and the $540 out.)
  const cases = [
    ['the work-pattern summary', DAYS_PER_WEEK_ENTRY_SUMMARY, [/salary/i, /\b0\b|zero|stop work/i]],
    ['the withdrawal summary', LUMP_SUM_ENTRY_SUMMARY, [/super/i, /tax/i]],
    ['the salary-sacrifice summary', SUPER_CONTRIBUTION_ENTRY_SUMMARY, [/sacrifice/i, /super/i]],
    ['the spouse contribution summary', SPOUSE_CONTRIBUTION_ENTRY_SUMMARY, [/after-tax/i, /spouse/i]],
  ];
  for (const [what, text, subjects] of cases) {
    assert.ok(text.trim().length >= 40, `${what} is ${text.trim().length} characters — too short to be the line it stands in for`);
    for (const subject of subjects) {
      assert.match(text, subject, `${what} no longer says anything matching ${subject}`);
    }
  }
  // And the four are four different sentences: one pasted over another says the wrong thing
  // beside the other three forms, and every assertion above would still pass.
  assert.equal(new Set(cases.map(([, text]) => text)).size, 4, 'two entry summaries are the same sentence');
});

test('THE RETIRED WARNING IS GONE FROM EVERY SURFACE, not just from the one that was edited', () => {
  // The replacement for `workPatternChangeDisclosure`, which was deleted on 2026-09-19 with the
  // gap it disclosed. Its two unit tests (silent at zero, warning at every other figure) have
  // nothing left to assert — the warning was that a positive `daysPerWeek` reached no figure at
  // all — so what stands in their place is the tripwire that stops the words coming back: a
  // "not modelled" label on an entry that IS modelled tells a reader to distrust a correct figure,
  // which is the same defect in the opposite direction.
  const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8');
  for (const path of ['../src/app/planEdits.ts', '../src/app/entryForm.ts']) {
    const source = read(path);
    assert.ok(source.includes('WORK_PATTERN_CHANGE') || source.includes('workPatternChange'), `${path}: the vacuity control — this file no longer mentions the type at all`);
    assert.doesNotMatch(source, /workPatternChangeDisclosure\(/, `${path}: something CALLS the disclosure again`);
    assert.doesNotMatch(source, /export const workPatternChangeDisclosure/, `${path}: the disclosure is exported again`);
  }
  assert.doesNotMatch(read('../public/index.html'), /data-not-modelled="true"\] \{/, 'the warning colour is back on the journal row');
  // And the row says the MONEY now, which is what a reader needs instead of the warning.
  assert.match(read('../src/app/entryForm.ts'), /days a week at \$\{formatDollars\(entry\.params\.annualSalary\)\} a year/);
});

test('a stopped salary is RESTORED by a later positive-days entry, and since retire flow S3 so is a RETIRE', () => {
  // **FLIPPED 2026-09-29 (retire flow S3, user ruling "the user may also elect to return to work").**
  // Until then `RETIRE` was monotone and this test pinned the other half: a positive-days pattern
  // after it paid nothing (17 months). The law never said so: reg 6.12(1) and 6.18(2)(a) keep the
  // money accrued by the stop released, and nothing stops a retired Person working again. Now a
  // pattern dated strictly AFTER the stop is a return to work (`workSpells`), and pays exactly what
  // the same pattern pays after a zero-day stop. The two controls below keep the old half's point:
  // a pattern ON the stop day, or with zero days, does not un-retire.
  const stopped = walkWith(workPatternChangeEntry(WORK_FORM, 'no-days-2028', CREATED));
  const back = (date, daysPerWeek, annualSalary) =>
    workPatternChangeEntry({ ...WORK_FORM, date, daysPerWeek, annualSalary }, 'back', CREATED);
  const resumed = walkWith(workPatternChangeEntry(WORK_FORM, 'no-days-2028', CREATED), back('2030-01-01', '3', '40,000'));

  const fallen = stopped.filter((month, i) => wealth(resumed[i]) < wealth(month)).map((month) => month.month);
  assert.deepEqual(fallen, [], 'going back to work LOWERED wealth in these months');
  assert.ok(stopped.filter((month, i) => wealth(resumed[i]) > wealth(month)).length > 100);
  // 16 before 2028, 16 from 2030-01 to 2031-04, and 14/31 of May 2031 at the stated $40,000.
  assert.equal(monthsWith(resumed, 'Salary, Dana').length, 33, 'the wage did not come back');

  const salary = (walk) => new Map(monthsWith(walk, 'Salary, Dana').map((month) => [month.month, month.lines.find((line) => line.description === 'Salary, Dana').amount]));
  const retired = walkWith(retireEntry(RETIRE_FORM, 'retires-2028', CREATED), back('2030-01-01', '3', '40,000'));
  // 16 before 2028, the one day of January 2028 the RETIRE month pays, then the same 17 as above:
  // Dana stops again on the demo's own Retire, 2031-05-14, which pays 14/31 of May.
  assert.equal(monthsWith(retired, 'Salary, Dana').length, 34, 'going back to work after a Retire did not pay');
  assert.deepEqual(monthsWith(retired, 'Salary, Dana').filter((month) => month.month > '2028-01' && month.month < '2030-01'), [], 'the break between the stop and the return was paid');
  // The mechanism, not a copied figure: from the return on, every month pays what the SAME pattern
  // pays after a zero-day stop, to the cent.
  const after = [...salary(retired)].filter(([month]) => month >= '2030-01');
  assert.equal(after.length, 17);
  for (const [month, amount] of after) assert.equal(amount, salary(resumed).get(month), `${month} paid a different salary`);

  // The controls: on the stop day, and zero days, are not a return.
  for (const [what, entry] of [['dated on the Retire day', back('2028-01-01', '3', '40,000')], ['with zero days', back('2030-01-01', '0', '0')]]) {
    const still = walkWith(retireEntry(RETIRE_FORM, 'retires-2028', CREATED), entry);
    assert.equal(monthsWith(still, 'Salary, Dana').length, 17, `a work pattern ${what} un-retired a retired person`);
  }
});

test('a ONE_OFF_EXPENSE is charged once, in its own month, and lowers wealth from the month after', () => {
  const months = walkWith(oneOffExpenseEntry(ONE_OFF_FORM, 'the-car', CREATED));
  const at = indexOfMonth('2029-03');

  // Once, in its own month, at the figure typed — and the base plan's own re-roof is still there,
  // so "once" is asserted against a walk that already has one.
  assert.deepEqual(months[at].lines.filter((line) => line.description === 'One-off expense').map((line) => [line.amount, line.direction]), [[5_000_000, 'outflow']]);
  assert.equal(monthsWith(months, 'One-off expense').map((month) => month.month).filter((month) => month === '2029-03').length, 1);
  assert.deepEqual(monthsWith(months, 'One-off expense').map((month) => month.month), ['2029-03', '2029-11']);

  prefixUnchanged(months, '2029-03');
  // ⚠️ The bands are read on the month's first day and the charge falls during it — but `wealth`
  // here adds the month's CLOSING cash, so the entry's own month moves by exactly the part of the
  // $50,000 that came out of cash. Until "spend cash first" (2026-09-23) that part was nil: the
  // pension paid the whole car, and the month was insensitive. Now what is still owed of Ash's
  // minimum pays first ($14,014.75 more than the base month drew from it, which leaves the fund at
  // the close and shows next month) and the cash — no home loan, so all of it spendable — pays the
  // other $35,985.25 inside `closingBalance`. Pinned as an equality with the cash limb's own draw.
  // (It was $11,983.61 and $38,016.39 until pay rose with wages on 2026-09-23. Dana's higher pay
  // meant Ash's pension paid $1,764.06 less of FY2028-29's $27,350 minimum from July to February,
  // and the base March $267.08 less, so $2,031.14 more of the minimum was still owed to pay the car.)
  const cashDrawn = (walk) => walk[at].notes.find((note) => note.subject === 'waterfall limb' && note.limb === 'cashAboveLoan').drawn;
  assert.equal(cashDrawn(BASE), 0);
  assert.equal(cashDrawn(months), 3_598_525);
  assert.equal(3_801_639 - 3_598_525, 176_406 + 26_708, 'the move is what the minimum was not yet paid');
  assert.equal(wealth(BASE[at]) - wealth(months[at]), cashDrawn(months));
  assert.ok(wealth(months[at + 1]) < wealth(BASE[at + 1]), 'the month after the expense is not lower');

  const risen = BASE.filter((month, i) => wealth(months[i]) > wealth(month)).map((month) => month.month);
  assert.deepEqual(risen, [], 'a $50,000 expense RAISED total wealth in these months');
  assert.ok(BASE.filter((month, i) => wealth(months[i]) < wealth(month)).length > 100);
});

test('a NON_SUPER_INVESTMENT BUY spends the cash and gains the parcel — the household loses exactly the brokerage', () => {
  const months = walkWith(nonSuperInvestmentBuyEntry(BUY_FORM, 'buy-2028', CREATED));
  const at = indexOfMonth('2028-06');

  prefixUnchanged(months, '2028-06');
  // Two outflows, both in the buy's own month, at the two figures typed.
  assert.deepEqual(
    months[at].lines.filter((line) => line.description.startsWith('Non-Super Portfolio')).map((line) => [line.description, line.amount, line.direction]),
    [['Non-Super Portfolio purchase, Dana', 4_000_000, 'outflow'], ['Non-Super Portfolio brokerage, Dana', 50_000, 'outflow']],
  );
  // The direction, exactly: cash falls by the amount AND the costs …
  assert.equal(months[at].closingBalance - BASE[at].closingBalance, -4_050_000);
  // … and the bands, read on the next month's first day, are down by the BROKERAGE ALONE, because
  // the $40,000 left the cash and arrived as a parcel worth $40,000. That figure is the whole of
  // what the household gave up, and it is asserted to the cent rather than as an inequality.
  assert.equal(bands(months[at + 1]) - bands(BASE[at + 1]), -50_000);
  assert.ok(months.some((month) => month.appliedEntryIds.includes('buy-2028')));
});

test('a NON_SUPER_INVESTMENT SELL raises the cash in its own month, and the bands never rise', () => {
  const months = walkWith(nonSuperInvestmentSellEntry(SELL_FORM, 'sell-2028', CREATED));
  const at = indexOfMonth('2028-06');

  prefixUnchanged(months, '2028-06');
  assert.deepEqual(
    months[at].lines.filter((line) => line.description.startsWith('Non-Super Portfolio')).map((line) => [line.description, line.amount, line.direction]),
    [['Non-Super Portfolio sale, Dana', 2_000_000, 'inflow']],
  );
  assert.ok(months[at].closingBalance > BASE[at].closingBalance, 'a sale did not raise the cash in its own month');
  // The direction over the whole walk: a disposal converts portfolio into cash, so the BANDS — the
  // parcel's home — may not rise in any month. (Total wealth is NOT monotone here and is not
  // asserted: the proceeds change what the Waterfall draws, and the CGT falls in a later month.)
  const risen = BASE.filter((month, i) => bands(months[i]) > bands(month)).map((month) => month.month);
  assert.deepEqual(risen, [], 'selling a parcel RAISED the banded wealth in these months');
  assert.ok(BASE.filter((month, i) => bands(months[i]) < bands(month)).length > 100);
});

test('P9-2c: the HEAS box says it is a LOAN, and the guide carries the rules behind it', () => {
  // P17-3 (2026-09-28) took "the loan alone gives no Pensioner Concession Card (s 1137A, T32)" out
  // of the notice with every other rule; the loan-not-pension disclosure stays on the page and the
  // scheme's rules, including the card rule, are pinned on the guide's section instead (P17-3a).
  assert.match(HEAS_DRAW_ENTRY_SUMMARY, /loan/i);
  assert.match(HEAS_DRAW_ENTRY_SUMMARY, /not free money, and not a pension/);
  const guide = guideSection('home-equity-access');
  assert.match(guide, /3\.95% a year/);
  assert.match(guide, /no-negative-equity guarantee/);
  assert.match(guide, /refuses to save the two together/);
  assert.match(guide, /150% of the\s+full Age Pension rate/);
  assert.match(guide, /Only from Age Pension age, and only if you own your home/);
  assert.match(guide, /doesn't give you a Pensioner Concession Card/i);
});

// --- P3-4b slice 2: "Add a catch-up" — offered, never bound (ADR-0004) ------------------------------

import { CatchUpRefusedError, checkedCatchUp, planWithCatchUp, savePlan as saveCatchUp, validatedPlan as walkedPlan } from '../dist/app/planEdits.js';
import { catchUpOffer } from '../dist/app/financialYearRows.js';

/** Kit, 47, $6,000 a fortnight, $10,000 of FY2026-27 left unused, plan dated 1 July 2027. */
const kitPlan = ({ perFortnight = 600_000, entries = [] } = {}) => parsePlan({
  version: 2,
  settings: { ...JSON.parse(JSON.stringify(DEMO_PLAN.settings)), asAtDate: '2027-07-01', planningHorizonAge: 50, nominalReturn: 0 },
  household: {
    persons: [{
      name: 'Kit',
      dateOfBirth: '1980-03-15',
      superInterests: [{ phase: 'accumulation', balance: 10_000_000 }],
      parcels: [],
      employmentIncomePerFortnight: perFortnight,
      workBonusBalance: 0,
      statedUnusedConcessionalCap: { '2026-27': 1_000_000 },
    }],
    homeStatus: 'occupied',
  },
  entries,
  scenarios: [{ id: 'baseline', name: 'Baseline', parentId: null, entryIds: entries.map((entry) => entry.id) }],
  activeScenarioId: 'baseline',
});
const inYear = (months, fy) => months.filter((month) => month.month >= `${fy.slice(0, 4)}-07` && month.month <= `${Number(fy.slice(0, 4)) + 1}-06`);

test('P3-4b — the catch-up is the year’s remaining room less its own contributions, whole dollars down, and the walk keeps it inside the total cap', () => {
  const plan = kitPlan();
  const { months } = walkedPlan(plan);
  const june = inYear(months, '2027-28').at(-1).concessionalCapByPerson[0];
  assert.equal(june.carriedForwardAvailable, 1_000_000);
  const offer = catchUpOffer(inYear(months, '2027-28'), 0);
  // The room at the year's END: the cap and the carry-forward, less the whole year's Guarantee.
  assert.equal(offer, Math.floor(june.remaining / 100) * 100);
  assert.ok(offer < june.generalCap + june.carriedForwardAvailable - 1_000_000, 'sized without the year’s own Guarantee');

  const candidate = checkedCatchUp(plan, months, 0, '2027-28', ['catch-up', 'catch-up-stop'], '2027-07-01');
  const saved = parsePlan(candidate);
  const [start, stop] = saved.entries.slice(-2);
  assert.deepEqual([start.id, start.date, start.owner, start.params], ['catch-up', '2027-07-01', 'personA', { kind: 'salarySacrificed', annualAmount: offer, interestIndex: 0 }]);
  assert.deepEqual([stop.id, stop.date, stop.owner, stop.params], ['catch-up-stop', '2028-07-01', 'personA', { kind: 'stopped' }]);
  assert.deepEqual(saved.scenarios[0].entryIds, ['catch-up', 'catch-up-stop']);
  // Through the walk: the year's contributions rose by the offer, stayed inside the total cap, and
  // no cap note was raised; the next year has no sacrifice.
  const after = walkedPlan(candidate).months;
  const afterJune = inYear(after, '2027-28').at(-1).concessionalCapByPerson[0];
  assert.ok(Math.abs(afterJune.usedSoFar - june.usedSoFar - offer) <= 12);
  assert.ok(afterJune.usedSoFar <= afterJune.generalCap + afterJune.carriedForwardAvailable);
  assert.ok(afterJune.remaining < 100, String(afterJune.remaining));
  assert.equal(after.flatMap((month) => month.notes).filter((note) => note.subject === 'concessional cap exceeded').length, 0);
  assert.equal(inYear(after, '2028-29').at(-1).concessionalCapByPerson[0].usedSoFar, inYear(months, '2028-29').at(-1).concessionalCapByPerson[0].usedSoFar);
});

test('P3-4b — a catch-up is refused by name, and nothing is written, where the pay cannot carry it or a sacrifice already runs', async () => {
  // $1,000 a fortnight cannot carry the $38,000-odd of room a stated $30,000 leaves.
  const poor = parsePlan({ ...kitPlan({ perFortnight: 100_000 }), household: { ...kitPlan().household, persons: [{ ...kitPlan().household.persons[0], employmentIncomePerFortnight: 100_000, statedUnusedConcessionalCap: { '2026-27': 3_000_000 } }] } });
  assert.throws(
    () => checkedCatchUp(poor, walkedPlan(poor).months, 0, '2027-28', ['a', 'b'], '2027-07-01'),
    (error) => error instanceof CatchUpRefusedError && /Kit's pay in FY2027-28 cannot carry/.test(error.message),
  );
  // A sacrifice already standing: a catch-up would replace it and then stop it.
  const running = kitPlan({ entries: [{ id: 's', date: '2027-07-01', owner: 'personA', type: 'SUPER_CONTRIBUTION', params: { kind: 'salarySacrificed', annualAmount: 100_000, interestIndex: 0 }, enabled: true, createdAt: '2027-07-01' }] });
  assert.throws(
    () => checkedCatchUp(running, walkedPlan(running).months, 0, '2027-28', ['a', 'b'], '2027-07-01'),
    (error) => error instanceof CatchUpRefusedError && /already has a salary sacrifice running in FY2027-28/.test(error.message),
  );
  // A year with no carried-forward room offers nothing to add.
  const plan = kitPlan();
  assert.throws(() => checkedCatchUp(plan, walkedPlan(plan).months, 0, '2026-27', ['a', 'b'], '2027-07-01'), CatchUpRefusedError);
  // The refusal reaches no transport: it is thrown before `save` is named.
  let writes = 0;
  const transport = { writePlan: async () => { writes += 1; } };
  const tryIt = async () => saveCatchUp(transport, checkedCatchUp(poor, walkedPlan(poor).months, 0, '2027-28', ['a', 'b'], '2027-07-01'));
  await assert.rejects(tryIt, CatchUpRefusedError);
  assert.equal(writes, 0);
  // Building one writes nothing either — only `save` does, and only when handed the candidate.
  planWithCatchUp(plan, { person: 0, financialYear: '2027-28', amount: 100_000 }, ['a', 'b'], '2027-07-01');
  checkedCatchUp(plan, walkedPlan(plan).months, 0, '2027-28', ['a', 'b'], '2027-07-01');
  assert.equal(writes, 0);
});
