// P3-4b slice 1 (2026-09-30) — CARRY-FORWARD CONCESSIONAL CAP, RUN BY THE WALK.
//
// Each Person's concessional cap for a financial year is the general cap plus the unused cap of the
// five years before (ITAA 1997 s 291-20(3)–(7)), usable only while their Total Super Balance at the
// prior 30 June is under $500,000 — a figure that never indexes (T21). The walk keeps what is still
// unused of each year, uses the oldest first, and reports the year's figures on every `Month` as
// `concessionalCapByPerson`. Both cap checks — the refusal in the month a sacrifice is stated and the
// year-to-date note — now measure against that TOTAL cap.
//
// What the walk cannot know it counts as FULLY USED: every year before the plan, unless
// `Person.statedUnusedConcessionalCap` states what myGov shows is left of it, and the plan's own first
// year when it opens after 1 July. Each test below says which rule it pins.
import test from 'node:test';
import assert from 'node:assert/strict';

import { toCents } from '../dist/core/money.js';
import { project } from '../dist/core/projection.js';
import { PlanFileAmountError, PlanFileHouseholdError, parsePlan } from '../dist/core/parsePlan.js';
import { DEMO_PLAN } from '../dist/app/demoHousehold.js';

const entry = (id, type, date, owner = 'personA', params = {}) => ({ id, date, owner, type, params, enabled: true, createdAt: '2027-01-01' });

/** Wages at 3.5%, no investment return: a balance moves only by what is paid into it. */
const settings = (asAtDate = '2027-07-01') => ({
  asAtDate,
  planningHorizonAge: 50,
  economicSeries: { cpi: 0.025, pblci: 0.025, awote: 0.035, mtawe: 0.035 },
  deemingRates: { lower: 0.0175, upper: 0.0375 },
  nominalReturn: 0,
  cashInterestRate: 0,
});
/** Kit is 47. $6,000 a fortnight is $156,000 a year in July 2027's wages. */
const kit = (balance, stated, perFortnight = toCents(6_000)) => ({
  persons: [{
    name: 'Kit',
    dateOfBirth: '1980-03-15',
    superInterests: [{ phase: 'accumulation', balance }],
    parcels: [],
    employmentIncomePerFortnight: perFortnight,
    workBonusBalance: toCents(0),
    ...(stated === undefined ? {} : { statedUnusedConcessionalCap: stated }),
  }],
  homeStatus: 'occupied',
});
const sacrificing = (annualAmount, date = '2027-07-01') =>
  [entry('s', 'SUPER_CONTRIBUTION', date, 'personA', { kind: 'salarySacrificed', annualAmount, interestIndex: 0 })];
const at = (months, month) => months.find((each) => each.month === month);
const capOf = (months, month) => at(months, month).concessionalCapByPerson[0];
const capNotes = (months, fy) =>
  months.flatMap((m) => m.notes.filter((n) => n.subject === 'concessional cap exceeded' && n.financialYear === fy).map((n) => ({ month: m.month, ...n })));

// The general caps `core-projection-sacrifice-credit.test.mjs` derives from December 2025's
// published wage level grown at 3.5%.
const CAP_2027_28 = toCents(32_500);
const CAP_2028_29 = toCents(35_000);

test('YEARS BEFORE THE PLAN COUNT AS FULLY USED, A STATED YEAR REPLACES THAT, AND THE WINDOW IS FIVE YEARS', () => {
  // Nothing stated: FY2022-23 to FY2026-27 are all before the plan, and none of them is nil
  // contributions — nil would be a full cap of headroom nobody told the forecast about.
  const unstated = project(settings(), kit(toCents(100_000)), []);
  assert.deepEqual(capOf(unstated, '2027-07'), {
    generalCap: CAP_2027_28,
    carriedForwardAvailable: 0,
    usedSoFar: capOf(unstated, '2027-07').usedSoFar,
    remaining: CAP_2027_28 - capOf(unstated, '2027-07').usedSoFar,
    totalSuperBalance: toCents(100_000),
    closedByTotalSuperBalance: false,
    oldestUnusedUsableUntil: null,
  });

  // Stated: $5,000 left of FY2022-23 (the OLDEST year in the window) and $10,000 of FY2026-27.
  const months = project(settings(), kit(toCents(100_000), { '2022-23': toCents(5_000), '2026-27': toCents(10_000) }), []);
  const july2027 = capOf(months, '2027-07');
  assert.equal(july2027.carriedForwardAvailable, toCents(15_000), 'a four-year window drops FY2022-23');
  assert.equal(july2027.oldestUnusedUsableUntil, '2027-28', 'FY2022-23 + 5');
  // The Guarantee alone uses none of it: the general cap is spent first.
  const june2028 = capOf(months, '2028-06');
  assert.ok(june2028.usedSoFar < CAP_2027_28);
  assert.equal(june2028.remaining, CAP_2027_28 + toCents(15_000) - june2028.usedSoFar);
  // FY2028-29: FY2022-23 has EXPIRED, FY2026-27 is still in, and FY2027-28 — walked whole from
  // 1 July — adds what the Guarantee left of its cap.
  const july2028 = capOf(months, '2028-07');
  assert.equal(july2028.generalCap, CAP_2028_29);
  assert.equal(july2028.carriedForwardAvailable, toCents(10_000) + (CAP_2027_28 - june2028.usedSoFar), 'a six-year window keeps FY2022-23');
  assert.equal(july2028.oldestUnusedUsableUntil, '2031-32');
});

test('THE PLAN’S FIRST YEAR, OPENED AFTER 1 JULY, COUNTS AS FULLY USED — ITS WALKED MONTHS ARE NOT A YEAR', () => {
  const months = project(settings('2027-10-01'), kit(toCents(100_000)), []);
  // Nine months of FY2027-28 walked, well under its cap: still nothing carried into FY2028-29.
  assert.ok(capOf(months, '2028-06').remaining > 0);
  assert.equal(capOf(months, '2028-07').carriedForwardAvailable, 0);
  assert.equal(capOf(months, '2028-07').oldestUnusedUsableUntil, null);
  // FY2028-29 is walked whole, so FY2029-30 does get what it left.
  const june2029 = capOf(months, '2029-06');
  assert.equal(capOf(months, '2029-07').carriedForwardAvailable, CAP_2028_29 - june2029.usedSoFar);
  assert.equal(capOf(months, '2029-07').oldestUnusedUsableUntil, '2033-34');
});

/**
 * The room in July 2027 is the cap less the Guarantee at July's pay, $13,780
 * (`core-projection-concessional-cap-year.test.mjs`); with $10,000 of FY2026-27 carried forward it is
 * $23,780, exactly at the TOTAL cap in the month it is stated.
 */
const AT_THE_TOTAL_ROOM = toCents(13_780 + 10_000);
const STATED = { '2026-27': toCents(10_000) };

test('THE STATED MONTH AND THE YEAR-TO-DATE NOTE BOTH MEASURE AGAINST THE TOTAL CAP', () => {
  const months = project(settings(), kit(toCents(499_999.99), STATED), sacrificing(AT_THE_TOTAL_ROOM));
  assert.equal(capOf(months, '2027-07').carriedForwardAvailable, toCents(10_000));
  // It walks — $10,000 over the general cap in the month it is stated — and pay rising with wages
  // takes the year over the TOTAL cap later, once, with the total cap in the note.
  const notes = capNotes(months, '2027-28');
  assert.equal(notes.length, 1);
  const [note] = notes;
  assert.equal(note.generalCap, CAP_2027_28);
  assert.equal(note.totalCap, CAP_2027_28 + toCents(10_000));
  assert.equal(note.excessSoFar, note.contributedThisYear - note.totalCap);
  assert.ok(note.excessSoFar > 0 && note.excessSoFar < toCents(500), String(note.excessSoFar));
  assert.match(note.note, /over the year's total concessional cap \(including unused amounts carried forward\) of 4250000 cents/);
  // The month the note lands in is the month the year-to-date total first passes $42,500.
  assert.equal(capOf(months, note.month).remaining, 0);
  const before = months[months.indexOf(at(months, note.month)) - 1];
  assert.ok(capOf(months, before.month).usedSoFar <= note.totalCap);
  // One cent more is refused in the month it is stated, against the same total.
  assert.throws(
    () => project(settings(), kit(toCents(499_999.99), STATED), sacrificing(AT_THE_TOTAL_ROOM + 1)),
    (error) => error.name === 'ExcessConcessionalContributionsNotModelledError' && /total concessional cap for FY2027-28 is 4250000 cents/.test(error.message),
  );
});

test('EXACTLY $500,000 CLOSES THE WINDOW — the test is < $500,000, and it never indexes', () => {
  const open = capOf(project(settings(), kit(toCents(499_999.99), STATED), []), '2027-07');
  assert.equal(open.closedByTotalSuperBalance, false);
  assert.equal(open.carriedForwardAvailable, toCents(10_000));
  const closed = capOf(project(settings(), kit(toCents(500_000), STATED), []), '2027-07');
  assert.equal(closed.totalSuperBalance, toCents(500_000));
  assert.equal(closed.closedByTotalSuperBalance, true);
  assert.equal(closed.carriedForwardAvailable, 0);
  assert.equal(closed.remaining, CAP_2027_28 - closed.usedSoFar);
  // The unused amount is still there, and still expires — closed is not gone.
  assert.equal(closed.oldestUnusedUsableUntil, '2031-32');
  // And the sacrifice that walks at $499,999.99 is refused at $500,000.
  assert.throws(() => project(settings(), kit(toCents(500_000), STATED), sacrificing(AT_THE_TOTAL_ROOM)), { name: 'ExcessConcessionalContributionsNotModelledError' });
  // Still $500,000 a decade on: a Person at exactly $500,000 at 30 June 2037 is still closed.
  const later = project({ ...settings('2037-07-01'), planningHorizonAge: 70 }, kit(toCents(500_000), { '2036-37': toCents(10_000) }), []);
  assert.equal(capOf(later, '2037-07').closedByTotalSuperBalance, true);
});

test('THE BALANCE IS THE 30 JUNE CLOSE — BEFORE THE JULY SETTLEMENT CREDIT, AND NOT THE YEAR’S OPENING', () => {
  // $1,300 a fortnight is a low income, so FY2027-28's low income super tax offset is credited in
  // July 2028's settlement. Nothing grows: the balance moves only by the Guarantee and the offset.
  const months = project(settings(), kit(toCents(496_497), undefined, toCents(1_300)), []);
  const june = at(months, '2028-06');
  const july = at(months, '2028-07');
  // `superBalance` is the close BEFORE the month's own contributions are written back; the 30 June
  // balance is that plus June's.
  const intoSuper = june.lines
    .filter((line) => line.effect === 'wealth' && line.description.includes('Kit — Superannuation'))
    .reduce((total, line) => total + (line.direction === 'inflow' ? line.amount : -line.amount), 0);
  const thirtyJune = june.superBalance + intoSuper;
  assert.equal(capOf(months, '2028-07').totalSuperBalance, thirtyJune);
  assert.equal(thirtyJune, toCents(499_999.55));
  // The control: July's settlement DID credit the offset, and it took the balance over $500,000.
  assert.ok(july.lines.some((line) => /^Low income super tax offset, Kit, 2027-28$/.test(line.description)));
  assert.ok(july.superBalance >= toCents(500_000), String(july.superBalance));
  // So FY2028-29 is OPEN, and carries what FY2027-28's Guarantee left of its cap.
  assert.equal(capOf(months, '2028-07').closedByTotalSuperBalance, false);
  assert.equal(capOf(months, '2028-07').carriedForwardAvailable, CAP_2027_28 - capOf(months, '2028-06').usedSoFar);
  // And it is re-measured every year rather than carried from the opening one.
  assert.equal(capOf(months, '2027-07').totalSuperBalance, toCents(496_497));
  assert.ok(capOf(months, '2029-07').totalSuperBalance > capOf(months, '2028-07').totalSuperBalance);
  assert.equal(capOf(months, '2029-07').closedByTotalSuperBalance, true);
});

test('THE OLDEST UNUSED AMOUNT IS USED FIRST — in the year, and in what the next year inherits', () => {
  // $5,000 left of FY2022-23 and $20,000 of FY2026-27; $21,500 sacrificed on top of the Guarantee
  // takes FY2027-28 about $8,000 over its general cap.
  const months = project(settings(), kit(toCents(450_000), { '2022-23': toCents(5_000), '2026-27': toCents(20_000) }), sacrificing(toCents(21_500)));
  assert.equal(capOf(months, '2027-07').carriedForwardAvailable, toCents(25_000));
  assert.equal(capOf(months, '2027-07').oldestUnusedUsableUntil, '2027-28');
  const june = capOf(months, '2028-06');
  const overGeneral = june.usedSoFar - CAP_2027_28;
  assert.ok(overGeneral > toCents(5_000) && overGeneral < toCents(25_000), String(overGeneral));
  // FY2022-23's $5,000 went first, so what is left is FY2026-27's — which lasts to FY2031-32.
  assert.equal(june.oldestUnusedUsableUntil, '2031-32', 'the newest year was used first');
  assert.equal(june.remaining, CAP_2027_28 + toCents(25_000) - june.usedSoFar);
  // FY2028-29 inherits FY2026-27 less only what FY2022-23 could not cover; FY2027-28 itself was
  // over its cap and leaves nothing.
  assert.equal(capOf(months, '2028-07').carriedForwardAvailable, toCents(20_000) - (overGeneral - toCents(5_000)));
  assert.equal(capNotes(months, '2027-28').length, 0, 'inside the total cap, so no note');
});

// --- The door ----------------------------------------------------------------------------------------

const planWith = (stated, asAtDate = '2027-07-01') => {
  const file = JSON.parse(JSON.stringify(DEMO_PLAN));
  file.settings.asAtDate = asAtDate;
  file.household.persons[0].statedUnusedConcessionalCap = stated;
  return file;
};
const refusedAt = (stated, path) =>
  assert.throws(() => parsePlan(planWith(stated)), (error) => error instanceof PlanFileHouseholdError && error.message.includes(path), path);

test('parsePlan reads a stated unused cap and refuses one it cannot mean', () => {
  const read = parsePlan(planWith({ '2022-23': toCents(5_000), '2026-27': toCents(32_500) }));
  assert.deepEqual(read.household.persons[0].statedUnusedConcessionalCap, { '2022-23': toCents(5_000), '2026-27': toCents(32_500) });
  assert.equal('statedUnusedConcessionalCap' in parsePlan(JSON.parse(JSON.stringify(DEMO_PLAN))).household.persons[0], false, 'absent stays absent');
  // FY2026-27's cap is published: $32,500 is all of it, a cent more is not what was left of it.
  refusedAt({ '2026-27': toCents(32_500) + 1 }, 'statedUnusedConcessionalCap["2026-27"]');
  // The plan starts in FY2027-28: the window is FY2022-23 to FY2026-27.
  refusedAt({ '2021-22': toCents(1_000) }, 'statedUnusedConcessionalCap["2021-22"]');
  refusedAt({ '2027-28': toCents(1_000) }, 'statedUnusedConcessionalCap["2027-28"]');
  refusedAt({ '2026-2027': toCents(1_000) }, 'statedUnusedConcessionalCap["2026-2027"]');
  refusedAt({ '2026-27': -1 }, 'statedUnusedConcessionalCap["2026-27"]');
  assert.throws(() => parsePlan(planWith({ '2026-27': 10.5 })), PlanFileAmountError);
  assert.throws(() => parsePlan(planWith([])), PlanFileHouseholdError);
});
