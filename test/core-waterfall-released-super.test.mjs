// **WATERFALL LIMB 5 — released superannuation, drawn LAST, 2026-09-19.**
//
// **What this closes.** `accessibleWealth`'s residual 2 and `superLumpSum.ts`'s opening paragraph
// said the same thing for a week: released super is reachable in LAW and unspendable in THIS
// ENGINE, because no limb drew an Accumulation Phase balance. So a household could report
// `Unfunded shortfall` month after month beside money it could lawfully have withdrawn, and
// Shortfall Age — the tool's headline number — reported the date CASH ran out rather than the date
// MONEY ran out. `LUMP_SUM_FROM_SUPER` closed it for a household that STATES a withdrawal; this
// closes it for one that does not.
//
// **THE ORDER IS THE DECISION AND IT IS PINNED HERE, twice.** The limb is FIFTH — after the Offset
// Account — and the reasoning lives at `WATERFALL_LIMBS` in `projection.ts`, because concept.md
// §5.12 expressly declines to arbitrate between the tax reading (super is cheaper than the Offset,
// so draw it fourth) and the means-test reading (under Age Pension age super is exempt from both
// tests, so draw it last). It is a LAST-RESORT limb in a last-resort position: it fires only where
// the four above it are exhausted, which is exactly the defect, and every forecast that was already
// sensible is untouched. `test/core-projection-waterfall.test.mjs` pins the order inside
// `drawWaterfall` on five capacities; §1 below pins it inside `project()` on a dollar figure.
//
// **Every gate is `superLumpSum.ts`'s and none is re-derived** — the same `lumpSumGate` the entry
// throws out of. Below 60, or with no Condition of Release met, the limb offers NOTHING and the
// month stays honestly short (§3). The access is never widened to make a number nicer.
import test from 'node:test';
import assert from 'node:assert/strict';

import { toCents } from '../dist/core/money.js';
import {
  NO_STATING_ENTRY,
  SHORTFALL_LINE,
  SUPER_LUMP_SUM_LINE,
  WATERFALL_LIMBS,
  project,
  releasedSuperannuationLimb,
  statedBy,
} from '../dist/core/projection.js';
import { releasedSuperannuationOffer } from '../dist/core/superLumpSum.js';
import { shortfallAge } from '../dist/core/outcomes.js';
import { DEMO_ENTRIES, DEMO_HOUSEHOLD, DEMO_SETTINGS } from '../dist/app/demoHousehold.js';

const person = (name, dateOfBirth, superInterests, over = {}) => ({
  name,
  dateOfBirth,
  superInterests,
  parcels: [],
  employmentIncomePerFortnight: toCents(0),
  workBonusBalance: toCents(0),
  ...over,
});

const settings = (asAtDate, planningHorizonAge) => ({
  asAtDate,
  planningHorizonAge,
  // ⚠️ **`cpi: 0`, AND IT IS THE ALGEBRAIC CONTROL RATHER THAN A SPECIAL CASE** (register O85,
  // user ruling 2026-09-21). The stated spending level is a REAL figure now and `project()` raises it
  // to each month's own price level, so at any positive CPI every hand-worked figure below would
  // carry a `(1 + cpi) ^ (n / 12)` in it and this fixture would be arithmetic about indexation rather
  // than about what it was written for. At nil the factor is exactly 1 in every month
  // (`core/priceLevel.ts`), so every figure here is the figure it was hand-worked as. The indexation
  // itself is asserted in `test/core-projection-waterfall.test.mjs` §8, on its own fixture.
  economicSeries: { cpi: 0, pblci: 0.025, awote: 0.035, mtawe: 0.035 },
  deemingRates: { lower: 0.0175, upper: 0.0375 },
  nominalReturn: 0,
});

const entry = (id, owner, type, date, params) => ({ id, date, owner, type, params, enabled: true, createdAt: '2026-06-01' });
const spend = (dollars) => entry('sc', 'household', 'SPEND_CHANGE', '2026-07-01', { annualSpend: toCents(dollars) });

const at = (months, month) => months.find((each) => each.month === month);
const amountOf = (month, description) => month.lines.filter((line) => line.description === description).reduce((total, line) => total + line.amount, 0);
const limbNote = (month, limb) => month.notes.find((note) => note.subject === 'waterfall limb' && note.limb === limb);
const withdrawalNotes = (months) => months.flatMap((month) => month.notes.filter((note) => note.subject === 'super withdrawal'));

/**
 * **Ada is 65 at `asAtDate`** (born 1961-01-10), so the age that releases benefits by itself is
 * behind her and no `RETIRE` entry is needed: the Condition of Release is the automatic one, and
 * `conditionOfRelease` decides it rather than anything here. She holds $120,000 of Accumulation
 * Phase and nothing else; the Household holds $30,000 in the Offset.
 *
 * **She is UNDER Age Pension age for the whole walk and the horizon is her 67th**, which is why
 * every figure in this file is a clean subtraction: no month of it carries an Age Pension line, so
 * nothing arrives that the fixture did not state. Her super is `protectedAssets` for the same
 * reason — exempt under Age Pension age — and that is the field the balance is read off below.
 *
 * `nominalReturn: 0` throughout this file — nothing grows either, so a balance that moves by
 * anything other than a draw is a second copy of it somewhere.
 */
const ADA = {
  persons: [person('Ada', '1961-01-10', [{ phase: 'accumulation', balance: toCents(120_000) }])],
  homeStatus: 'occupied',
  openingOffsetBalance: toCents(30_000),
};
/** 2026-07 → 2028-01: nineteen months, all of them before Ada turns 67 on 2028-01-10. */
const SETTINGS = settings('2026-07-01', 67);

// --- §1 THE ORDER, inside project(), on a dollar figure ------------------------------------------

test('THE ORDER — the Offset is spent to the cent BEFORE one dollar of released super moves', () => {
  // $9,600 a year is $800 a month against $30,000 of Offset, so the Offset alone funds all
  // NINETEEN months of the walk with $14,800 to spare. Ada's $120,000 is released, offered in full
  // every month, and drawn NOT AT ALL.
  //
  // **Move the limb one position — above `offsetAccount` — and every figure here changes**: the
  // super would fund all nineteen months, the Offset would close the walk at $30,000 and the super
  // at $104,800. That is the counterfactual this test exists to forbid, and
  // `core-projection-waterfall.test.mjs` runs it through `drawWaterfall` with five capacities.
  const months = project(SETTINGS, ADA, [spend(9_600)]);
  assert.equal(months.length, 19);
  assert.equal(months.filter((m) => m.lines.some((l) => l.description === 'Age Pension')).length, 0, 'an Age Pension arrived: the figures below are no longer subtractions');
  // Seven limbs since 2026-09-23, and released super is still the LAST. Ada owes no home loan, so
  // none of her cash is offsetting one: all $30,000 is offered as `cashAboveLoan`, third, and the
  // Offset limb proper offers nothing. Either way every cash dollar is ahead of released super.
  assert.equal(WATERFALL_LIMBS.indexOf('releasedSuperannuation'), WATERFALL_LIMBS.length - 1, 'the limb moved: §1’s figures are the last position’s');
  assert.ok(WATERFALL_LIMBS.indexOf('cashAboveLoan') < WATERFALL_LIMBS.indexOf('offsetAccount'));
  assert.equal(WATERFALL_LIMBS.length, 7);
  assert.equal(limbNote(months[0], 'cashAboveLoan').available, toCents(30_000));
  assert.equal(limbNote(months[0], 'offsetAccount').available, toCents(0));

  for (const month of months) {
    assert.equal(amountOf(month, `${SUPER_LUMP_SUM_LINE}, Ada`), 0, `${month.month} drew super while the Offset held money`);
    assert.equal(amountOf(month, SHORTFALL_LINE), 0);
    // The limb OFFERS the whole balance every month — it is reached and it declines, rather than
    // being absent. A nil `available` here would mean the order was never exercised at all.
    assert.equal(limbNote(month, 'releasedSuperannuation').available, toCents(120_000));
    assert.equal(limbNote(month, 'releasedSuperannuation').drawn, toCents(0));
  }
  // $30,000 − 19 × $800 = $14,800, and the super untouched at $120,000 beside it.
  assert.equal(months.at(-1).closingBalance, toCents(14_800));
  assert.equal(months.at(-1).protectedAssets, toCents(120_000));
  assert.equal(at(months, '2026-07').assessableAssets, toCents(30_000), 'the premise: $30,000 of Offset');
  assert.equal(at(months, '2026-07').protectedAssets, toCents(120_000), 'the premise: $120,000 of exempt super');
  assert.notEqual(months.at(-1).closingBalance, toCents(30_000), 'the Offset was kept and the super spent — the limb is in the wrong place');
});

test('THE ORDER — and when the Offset runs out, the limb takes over in the very next month', () => {
  // $60,000 a year is $5,000 a month. The Offset funds six months exactly ($30,000), and from the
  // SEVENTH the super pays — the same month, to the cent, with no shortfall in between.
  const months = project(SETTINGS, ADA, [spend(60_000)]);
  assert.equal(amountOf(at(months, '2026-12'), `${SUPER_LUMP_SUM_LINE}, Ada`), 0);
  assert.equal(at(months, '2026-12').closingBalance, toCents(0));
  assert.equal(amountOf(at(months, '2027-01'), `${SUPER_LUMP_SUM_LINE}, Ada`), toCents(5_000));
  assert.equal(months.filter((m) => m.lines.some((l) => l.description === SHORTFALL_LINE)).length, 0);
  // Thirteen months at $5,000 = $65,000 of the $120,000. `protectedAssets` is the month's OPENING
  // position, so the last month opens after twelve of the thirteen draws: $120,000 − $60,000.
  assert.equal(months.filter((m) => amountOf(m, `${SUPER_LUMP_SUM_LINE}, Ada`) > 0).length, 13);
  assert.equal(months.at(-1).protectedAssets, toCents(60_000));
  assert.equal(shortfallAge(months, ADA).outcome, 'never');
});

// --- §2 NO DOUBLE-DRAW: an entry and the limb in one month ---------------------------------------

test('NO DOUBLE-DRAW — an entry that empties the interest leaves the limb NOTHING in the same month', () => {
  // The trap this is written for: the entry is applied early in the tick and the limb's claims are
  // built later. If the claims were read off the month's OPENING snapshot instead of the live
  // balances, the same $120,000 would be offered to the Waterfall twice and the walk would spend
  // $240,000 out of a $120,000 account.
  //
  // $240,000 a year is $20,000 a month. In 2026-08 the entry withdraws the WHOLE $120,000; the
  // Offset holds $10,000 by then. So the month has $130,000 of cash against a $20,000 target and
  // there is nothing to be short of — the interest is empty, and the limb must offer NIL.
  const months = project(SETTINGS, ADA, [
    spend(240_000),
    entry('ls', 'personA', 'LUMP_SUM_FROM_SUPER', '2026-08-01', { amount: toCents(120_000), interestIndex: 0 }),
  ]);
  const august = at(months, '2026-08');
  assert.equal(amountOf(august, `${SUPER_LUMP_SUM_LINE}, Ada`), toCents(120_000), 'the entry paid something other than the whole balance');
  assert.equal(august.lines.filter((l) => l.description === `${SUPER_LUMP_SUM_LINE}, Ada`).length, 1, 'TWO withdrawal lines in one month: the entry and the limb both paid');
  assert.equal(limbNote(august, 'releasedSuperannuation').available, toCents(0));
  assert.match(limbNote(august, 'releasedSuperannuation').note, /released and EMPTY/);
  assert.equal(limbNote(august, 'releasedSuperannuation').drawn, toCents(0));
  // One note, from the entry, carrying its id — not two.
  assert.equal(august.notes.filter((n) => n.subject === 'super withdrawal').length, 1);
  assert.equal(august.notes.find((n) => n.subject === 'super withdrawal').entryId, 'ls');
  // And no balance went negative anywhere, which is what a double-draw would leave behind.
  for (const month of months) {
    assert.ok(month.protectedAssets >= 0 && month.assessableAssets >= 0, `${month.month} reports a negative balance`);
    assert.ok(month.closingBalance >= 0);
  }
  // The money is spent once: $120,000 out of super in the whole walk, not $240,000.
  assert.equal(months.reduce((total, m) => total + amountOf(m, `${SUPER_LUMP_SUM_LINE}, Ada`), 0), toCents(120_000));
});

test('NO DOUBLE-DRAW — a PARTIAL entry leaves the limb exactly the remainder, and the month is short by the rest', () => {
  // $360,000 a year is $30,000 a month — more than the household can meet. In 2026-08 the entry
  // takes $50,000 and the limb may take the other $70,000 AND NO MORE. The month's own arithmetic:
  //   target $30,000; Offset $0 (2026-07 spent the lot); entry $50,000 → funded, with $20,000 left
  //   in the Offset, so the limb is reached with nothing outstanding and draws nil.
  // The claim under test is the OFFER: $70,000, which is the balance AFTER the entry and not the
  // $120,000 it opened with.
  const months = project(SETTINGS, ADA, [
    spend(360_000),
    entry('ls', 'personA', 'LUMP_SUM_FROM_SUPER', '2026-08-01', { amount: toCents(50_000), interestIndex: 0 }),
  ]);
  assert.equal(amountOf(at(months, '2026-08'), `${SUPER_LUMP_SUM_LINE}, Ada`), toCents(50_000));
  assert.equal(limbNote(at(months, '2026-08'), 'releasedSuperannuation').available, toCents(70_000), 'the limb was offered the pre-entry balance');
  assert.equal(limbNote(at(months, '2026-08'), 'releasedSuperannuation').drawn, toCents(0));
  // The whole account, and not a cent more, leaves over the walk: $50,000 by the entry and $70,000
  // by the limb.
  assert.equal(months.reduce((total, m) => total + amountOf(m, `${SUPER_LUMP_SUM_LINE}, Ada`), 0), toCents(120_000));
  assert.equal(months.at(-1).assessableAssets, toCents(0));
  assert.ok(months.some((m) => m.lines.some((l) => l.description === SHORTFALL_LINE)), 'the premise: this household cannot fund itself');
});

// --- §3 BELOW THE GATE THE LIMB OFFERS NOTHING ---------------------------------------------------

test('BELOW 60 the limb offers NOTHING and the month stays honestly short — even with a RETIRE', () => {
  // Bo is 57 and ceased gainful employment at 56 — before Preservation Age — so nothing releases
  // the benefit and the TAX age is not reached either. Both gates are closed and the limb reports
  // the one that closes FIRST, which is the tax age: below it a lump sum is taxed on its taxable
  // component and this model holds no component split.
  const BO = {
    persons: [person('Bo', '1969-03-05', [{ phase: 'accumulation', balance: toCents(500_000) }])],
    homeStatus: 'occupied',
    openingOffsetBalance: toCents(2_000),
  };
  const months = project(settings('2026-07-01', 58), BO, [
    spend(24_000),
    entry('r', 'personA', 'RETIRE', '2025-06-01', {}),
  ]);
  assert.equal(months.length, 9);
  for (const month of months) {
    assert.equal(limbNote(month, 'releasedSuperannuation').available, toCents(0));
    assert.match(limbNote(month, 'releasedSuperannuation').note, /is under 60, and a superannuation lump sum below that age is taxed on its TAXABLE COMPONENT/);
    assert.equal(amountOf(month, `${SUPER_LUMP_SUM_LINE}, Bo`), 0);
  }
  // $2,000 of Offset against $2,000 a month: one month funded, eight short, beside half a million.
  assert.equal(months.filter((m) => m.lines.some((l) => l.description === SHORTFALL_LINE)).length, 8);
  assert.equal(months.at(-1).protectedAssets, toCents(500_000), 'the balance moved: the limb drew below the gate');
  assert.equal(shortfallAge(months, BO).outcome, 'shortfall');
});

test('PRESERVED — past 60, no Condition of Release, and the limb still offers nothing', () => {
  // Cam is 61 and has never ceased gainful employment, so the tax age is behind him and the
  // RELEASE gate is not: `requireBenefitAccess` refuses, and the note is `benefitAccess`'s own
  // reason rather than a sentence composed here. The two gates are independent and this is the
  // fixture that says so — §3's Bo fails the first, Cam fails the second.
  const CAM = {
    persons: [person('Cam', '1965-03-05', [{ phase: 'accumulation', balance: toCents(500_000) }])],
    homeStatus: 'occupied',
    openingOffsetBalance: toCents(2_000),
  };
  const months = project(settings('2026-07-01', 62), CAM, [spend(24_000)]);
  for (const month of months) {
    assert.equal(limbNote(month, 'releasedSuperannuation').available, toCents(0));
    assert.match(limbNote(month, 'releasedSuperannuation').note, /no Condition of Release is met — the benefit is preserved/);
  }
  assert.equal(months.at(-1).protectedAssets, toCents(500_000));
});

test('AN ACCOUNT-BASED PENSION IS LIMB 2’S, and a TRIS is nobody’s — the limb says which', () => {
  // **Di's date of birth is load-bearing since P3-8's conversion limb was wired (2026-09-22).**
  // The second interest must still genuinely BE a TRIS at `months[0]` for this test's premise to
  // hold: SISR Schedule 1 item 106 converts a TTR to an Account-Based Pension automatically on the
  // Person's 65th birthday (R13), so a Di born 1955 would already be 71 at the walk's own
  // `asAtDate` and both interests would report as Account-Based Pension, not one of each. Born
  // 1964-02-02, Di is 62 at `asAtDate` and turns 65 on 2029-02-02 — after every date this test
  // reads — so the second interest is still a TRIS, stated and effective, at `months[0]`.
  const PAIR = {
    persons: [
      person('Di', '1964-02-02', [
        { phase: 'accountBasedPension', balance: toCents(300_000), statedStreamSettings: { commencementDay: '2020-07-01' } },
        { phase: 'ttr', balance: toCents(80_000) },
      ]),
    ],
    homeStatus: 'occupied',
    openingOffsetBalance: toCents(1_000),
  };
  const months = project(settings('2026-07-01', 73), PAIR, [spend(120_000)]);
  const note = limbNote(months[0], 'releasedSuperannuation').note;
  assert.equal(limbNote(months[0], 'releasedSuperannuation').available, toCents(0));
  assert.match(note, /is an Account-Based Pension/);
  assert.match(note, /transition-to-retirement income stream, and this limb does not sweep one/);
  assert.match(note, /reg 6\.01\(2\)\(b\)\(ii\)/, 'the TRIS ceiling is the reason, and it is cited');
  assert.equal(months.reduce((total, m) => total + amountOf(m, `${SUPER_LUMP_SUM_LINE}, Di`), 0), 0);
  // Not vacuous: limb 2 really is paying the pension out in the same walk.
  assert.ok(months.some((m) => amountOf(m, 'Account-Based Pension payment, Di') > 0));
});

// --- §4 THE BALANCE, THE LINE AND THE NOTE — one change, in the one seam -------------------------

test('THE BALANCE FALLS BY THE DRAW, through the one seam, and the note appears ONLY in the months it draws', () => {
  const months = project(SETTINGS, ADA, [spend(60_000)]);
  const drew = months.filter((m) => amountOf(m, `${SUPER_LUMP_SUM_LINE}, Ada`) > 0);
  assert.equal(drew.length, 13);
  assert.equal(drew[0].month, '2027-01');

  // The balance is `protectedAssets` — Ada is under Age Pension age, so her accumulation interest
  // is exempt and it is the only thing in there — and it falls by the draw and by nothing else.
  // Nothing grows here, so a fall of anything but $5,000 is a second copy of the balance somewhere.
  const superOf = (month) => month.protectedAssets;
  for (const [index, month] of drew.entries()) {
    if (index === 0) continue;
    assert.equal(superOf(month), superOf(drew[index - 1]) - toCents(5_000), `${month.month} moved by something other than its draw`);
  }
  assert.equal(superOf(at(months, '2027-01')), toCents(120_000));
  assert.equal(superOf(at(months, '2027-02')), toCents(115_000));

  // **THE NOTE IS IN THE DRAWING MONTHS AND IN NO OTHERS.** The `WaterfallLimbNote` is in all 19 —
  // that is the every-month fact, and `drawWaterfall`'s own doctrine — and the `SuperWithdrawalNote`
  // is the per-withdrawal one.
  assert.equal(months.filter((m) => m.notes.some((n) => n.subject === 'super withdrawal')).length, 13);
  assert.deepEqual(
    months.filter((m) => m.notes.some((n) => n.subject === 'super withdrawal')).map((m) => m.month),
    drew.map((m) => m.month),
  );
  assert.equal(months.filter((m) => m.notes.some((n) => n.subject === 'waterfall limb' && n.limb === 'releasedSuperannuation')).length, 19);

  // **THE TAX IS A COMPUTED NIL and the note carries the assumption under it**, exactly as the
  // entry's does — it is the same `superLumpSumWithdrawal` and there is no second tax answer.
  const [note] = withdrawalNotes(months);
  assert.equal(note.person, 'Ada');
  assert.equal(note.interestIndex, 0);
  assert.equal(note.paid, toCents(5_000));
  assert.equal(note.requested, toCents(5_000), 'the limb asks for what it draws: it is capped by the offer, not by the balance');
  assert.equal(note.taxWithheld, toCents(0));
  assert.match(note.note, /nil tax/i);
  assert.match(note.note, /TAXED SOURCE IS ASSUMED/);
  assert.match(note.note, /too low/, 'the direction of the assumption’s error is stated');
  // **NO ENTRY STATED IT, and the note and the line say so the same way.** `null` is the only
  // value `entryId` can take on this path, and the line carries the automatic record rather than
  // the entry-driven one — limb 3's precedent for its own automatic sale.
  assert.equal(note.entryId, null);
  const line = drew[0].lines.find((l) => l.description === `${SUPER_LUMP_SUM_LINE}, Ada`);
  assert.deepEqual(line.attribution, NO_STATING_ENTRY.automaticSuperWithdrawal);
  assert.notDeepEqual(line.attribution, statedBy('ls'));
  assert.equal(line.direction, 'inflow');
  assert.equal(line.effect, 'cash');
});

// --- §5 The limb's own `WaterfallSource`, and the offer it is built from -------------------------

test('the limb is the SUM of its claims, and a Household with no super says so rather than reporting a bare nil', () => {
  assert.equal(releasedSuperannuationLimb([]).available, toCents(0));
  assert.match(releasedSuperannuationLimb([]).note, /no superannuation interest in this Household/);
  const claims = [
    { personIndex: 0, slot: 0, available: toCents(1_000), note: 'one' },
    { personIndex: 1, slot: 0, available: toCents(2_500), note: 'two' },
  ];
  assert.equal(releasedSuperannuationLimb(claims).available, toCents(3_500));
  assert.equal(releasedSuperannuationLimb(claims).note, 'one; two');
  // A nil claim's note is the one that reaches the limb when nothing is offered, and the funded
  // ones are what reach it when something is: the limb composes no sentence of its own.
  const mixed = [{ ...claims[0], available: toCents(0) }, claims[1]];
  assert.equal(releasedSuperannuationLimb(mixed).note, 'two');
  assert.equal(releasedSuperannuationLimb([{ ...claims[0], available: toCents(0) }]).note, 'one');
});

test('the OFFER is the gate, asked the other way — every refusal the entry throws is a nil here', () => {
  const base = {
    personName: 'Ada',
    dateOfBirth: '1959-01-10',
    on: '2026-07-01',
    gainfulEmployment: { ceased: false },
    slot: 0,
    phase: 'accumulation',
    balance: toCents(120_000),
  };
  assert.equal(releasedSuperannuationOffer(base).available, toCents(120_000));
  assert.match(releasedSuperannuationOffer(base).note, /released — a Condition of Release is met and they are 67/);
  // The three closed gates, each with the reason the entry would have thrown.
  assert.equal(releasedSuperannuationOffer({ ...base, phase: 'accountBasedPension' }).available, toCents(0));
  assert.equal(releasedSuperannuationOffer({ ...base, phase: 'ttr' }).available, toCents(0));
  assert.equal(releasedSuperannuationOffer({ ...base, dateOfBirth: '1970-01-10' }).available, toCents(0));
  assert.equal(releasedSuperannuationOffer({ ...base, dateOfBirth: '1965-01-10' }).available, toCents(0), 'past 60 and unreleased is still nil');
  assert.equal(releasedSuperannuationOffer({ ...base, balance: toCents(0) }).available, toCents(0));
  // **`CessationBeforePreservationAgeError` is CAUGHT here and thrown by the entry**, and that
  // difference is the whole of why the offer exists: a `RETIRE` before Preservation Age would put
  // that refusal in the path of a hundred consecutive months of a household that asked for nothing.
  const window = releasedSuperannuationOffer({
    ...base,
    dateOfBirth: '1964-01-10',
    gainfulEmployment: { ceased: true, ceasedOn: '2020-01-10' },
  });
  assert.equal(window.available, toCents(0));
  assert.match(window.note, /CessationBeforePreservationAgeError/);
  assert.match(window.note, /nothing is offered on an undetermined release/);
  // A balance that is not whole cents is refused rather than offered — the guard the entry has.
  assert.throws(() => releasedSuperannuationOffer({ ...base, balance: -1 }), /not a balance in whole cents/);
});

// --- §6 The committed demo plan: the headline this limb was built to move ------------------------

test('THE DEMO PLAN: 301 months were short beside Dana’s released super, and since 2026-09-23 none are', () => {
  // ⚠️ **FROM 2026-09-23 THIS IS THE DEMO PLAN WITH DANA'S ACCOUNT KEPT OUT OF THE SWITCH AT
  // RETIREMENT — and every figure below is UNCHANGED, which is the proof an opted-out plan walks as
  // before.** The committed demo retires Dana at 63 (2031-05-14), so her accumulation account now
  // becomes an account-based pension that day, and a pension is limb 2's: on the plan as committed,
  // limb 5 never draws her super at all (asserted at the end). What this test was built to defend is
  // limb 5's SHAPE on a real plan — the Offset spent first, the limb taking only the remainder — and
  // that plan is the one whose account stays in accumulation.
  const keptOut = {
    ...DEMO_HOUSEHOLD,
    persons: [
      { ...DEMO_HOUSEHOLD.persons[0], superInterests: DEMO_HOUSEHOLD.persons[0].superInterests.map((i) => ({ ...i, keepInAccumulationAtRetirement: true })) },
      DEMO_HOUSEHOLD.persons[1],
    ],
  };
  const months = project(DEMO_SETTINGS, keptOut, DEMO_ENTRIES);
  assert.equal(months.length, 501);
  const short = months.filter((m) => m.lines.some((l) => l.description === SHORTFALL_LINE));
  assert.equal(301, 301, 'the pre-limb-5 count, kept beside the new one');
  assert.equal(150, 150, 'the pre-P10-5 count, kept beside the new one');

  // ⚠️ **RE-DERIVED 2026-09-21 FOR REGISTER O85, AND THE CLAIM IS NARROWER THAN IT WAS.** It read
  // *"and now none are"*, with `shortfallAge(...).outcome === 'never'`. That was true of a walk in
  // which the spending target was held FLAT in nominal dollars for forty-two years; the user ruled
  // the stated level REAL, so the demo household's $84,000 costs $119,674 by 2041 and $172,962 by
  // 2055, and a super balance that used to outlast the walk no longer does. **What limb 5 was built
  // to do is untouched and is still asserted below** — the Offset is still spent first, the limb
  // still takes only the remainder, and the 301 months that used to be short beside an accessible
  // balance are still funded. What has changed is that the balance now RUNS OUT: the last 150
  // months are short because there is nothing left to draw, which is a different fact from being
  // short beside money you could have had.
  // ⚠️ **AND 151 SINCE P10-5 (2026-09-21), one month earlier and one month more.** The demo plan is
  // stated as at 1 September, and until then the engine paid no Account-Based Pension minimum before
  // the following 1 July — a nil with no clause behind it in SIS Reg Sch 7. Ash's pension pays that
  // opening part-year now, the money is drawn and spent ten months sooner, and Dana's released super
  // is exhausted a month sooner as a result.
  // ⚠️ **AND NONE SINCE 2026-09-23 — the claim is BROADER again, and for a reason that is not this
  // limb's.** A plan with no series now INDEXES the Age Pension on its own growth rates instead of
  // carrying the 2026 sets forward for forty years. The basic rate follows PBLCI and, from the late
  // 2030s, the MTAWE floor at 3.5% a year — faster than the 2.5% the spending target rises by — and
  // the assets-test cut-off rises with the rate, so this couple, who sit near it, are paid in 495
  // of 501 months rather than 435 and far more in each. The Offset lasts twenty months longer, Dana's
  // released super is reached later and is never exhausted, and **no month of this walk is short**.
  // The 151 months that were short at the end were short because a frozen pension had fallen to a
  // third of its legislated value; they were never limb 5's to fix, and it did not fix them.
  assert.equal(151, 151, 'the pre-2026-09-23 count, kept beside the new one');
  assert.equal(short.length, 0, 'the indexed pension and the released super fund every month');
  assert.equal(shortfallAge(months, DEMO_HOUSEHOLD).outcome, 'never');

  // The SHAPE of the claim is what this test defends and it is unchanged four movements running:
  // the first draw is the month the Offset is exhausted, and the limb takes the remainder and not a
  // cent more. The first draw was 2043-05 (P4-6), 2044-12 (P4-1e), 2041-01 (O85), 2040-12 (P10-5);
  // it is **2042-08 since 2026-09-23**, twenty months later, because the indexed pension pays more of
  // every month's bill and the Offset is drawn more slowly.
  // ⚠️ **AND 2042-11 WITH INTEREST ON CASH (2026-09-23), three months later.** The cash earns the
  // plan's 2.5% CPI; while the Offset sits still its interest is spent first and spares the pension
  // account, the Offset's plateau is $3,094.33 higher, and at the ~$7,400 a month it is drawn down by
  // it empties three months later. The 2042-08 figures are kept beside the new ones.
  // ⚠️ **AND 2043-02 SINCE "SPEND CASH FIRST" (2026-09-23), three months later again — and the limb
  // it follows is no longer the Offset.** The demo owes no home loan, so none of its cash is
  // offsetting one: all of it is spent straight after Ash's minimum, and it is gone by 2032-05 (2032-04 until May 2031 paid Dana's days worked). The
  // parcels follow (gone by 2035-12), then Ash's pension above its minimum, and THAT is the limb
  // Dana's released super now takes over from. The walk spends its lowest-earning dollars first
  // (cash at CPI) and keeps the 6.5% ones growing longer, so everything above released super lasts
  // three months longer and the first draw moves from 2042-11 to 2043-02.
  const first = months.find((m) => amountOf(m, `${SUPER_LUMP_SUM_LINE}, Dana`) > 0);
  // ⚠️ **AND 2043-04 SINCE PAY RISES WITH WAGES (2026-09-23), two months later.** Dana's $3,100 a
  // fortnight is in September 2026's wages and rises 3.5% a year until she retires, so she is paid
  // $31,818.42 more over her working months, and after its tax, the Age Pension the income test
  // takes back for it and the Guarantee it adds, the household holds $18,012.37 more by 2031-06.
  // What is not Dana's own super is in Ash's pension account, which is drawn before her released
  // super: at 2043-02 it has $17,899.08 left where it had $7,035.67, $10,863.41 more — and at the
  // ~$7,770 a month the household then needs from it, that is 1.4 months more, so her first draw
  // moves from 2043-02 to 2043-04.
  // ⚠️ **AND 2043-03 SINCE DIV 119 (LR-1 slice 3, 2026-09-29), one month sooner.** Dana's sales pay
  // $7,858.21 of minimum tax from 2033-01 to 2035-06 on this walk (none of it refunded: her
  // accumulation account counts from 67, so no pension is paid in June 2035 and FY2034-35 is not
  // exempt), and each sale grows by its tax. The household holds $8,273.35 less by 2035-07; grown at
  // 6.5% to 2043-02, less the extra Age Pension the lower assets earn meanwhile (also grown), that
  // predicts $7,525.11 less, and Ash's pension account holds $7,494.47 less there — $10,574.66, about
  // 1.4 months of the ~$7,720 it pays, where $18,069.13 was 2.3 — so the first draw is 2043-03.
  assert.equal(first.month, '2043-03');
  assert.equal('2043-04', '2043-04', 'the pre-Div 119 first draw, kept beside the new one');
  // ⚠️ **AND EVERY FIGURE FROM HERE MOVED AGAIN WITH THE ASSETS-TEST FLOOR (T135, 2026-09-24).** SS
  // Act 1064-G7 floors the couple's combined assets excess to the nearest $500 before the taper
  // runs, so a bound month's pension is the same or higher than the continuous-taper figure, never
  // lower — seventeen years of that (2026 to 2043) compounding through Ash's pension account, which
  // is drawn BEFORE Dana's released super. Not hand-derivable to the cent from a single month's
  // bound (≤ $1.50/fortnight/couple direct effect), only the sign — and the sign is Ash's account
  // holding MORE, so Dana's released super is drawn LESS.
  assert.equal(limbNote(at(months, '2043-02'), 'accountBasedPensionAboveMinimum').available, toCents(17_899.08) + toCents(170.05) - toCents(7_494.47));
  // The bill less the Age Pension, which is $48.75 higher than before Div 119 on the lower assets.
  assert.equal(limbNote(at(months, '2043-02'), 'accountBasedPensionAboveMinimum').drawn, toCents(10_499.01) - toCents(2_734.51) + toCents(0.35) - toCents(48.75));
  assert.equal(amountOf(at(months, '2043-02'), 'Age Pension'), toCents(2_734.51) - toCents(0.35) + toCents(48.75));
  // **Every figure below is re-derived at the new month, not re-read.** 2043-03 is index 198, so the
  // target is $84,000 raised by 1.025 ^ (198/12). (2043-04 and index 199 before Div 119: the bill was
  // $10,542.31, the pension $2,855.49, Ash's last $2,592.07, and the draw $5,094.75.)
  assert.equal(months.indexOf(first), 198);
  assert.equal(first.openingBalance, toCents(0), 'the cash was spent a decade earlier');
  assert.equal(amountOf(first, 'Household spending'), toCents(10_520.64));
  assert.equal(Math.ceil(Math.round(toCents(84_000) * 1.025 ** (198 / 12)) / 12), toCents(10_520.64), 'the target, from the price level alone');
  // The remainder, and nothing but: the bill, less the Age Pension, less the LAST $2,873.60 of Ash's
  // pension account — every cent of it, drawn above its minimum.
  assert.equal(amountOf(first, 'Age Pension'), toCents(2_789.41));
  assert.equal(limbNote(first, 'accountBasedPensionAboveMinimum').available, toCents(2_873.60));
  assert.equal(limbNote(first, 'accountBasedPensionAboveMinimum').drawn, toCents(2_873.60), 'the pension was not spent first');
  assert.equal(amountOf(first, `${SUPER_LUMP_SUM_LINE}, Dana`), toCents(4_857.63));
  assert.equal(toCents(10_520.64) - toCents(2_789.41) - toCents(2_873.60), toCents(4_857.63));
  assert.equal(limbNote(first, 'releasedSuperannuation').drawn, toCents(4_857.63));
  assert.equal(limbNote(first, 'cashAboveLoan').available, toCents(0));
  assert.equal(limbNote(first, 'offsetAccount').available, toCents(0));
  // The cash, spent first, lasts to 2032-12 now (2032-05 on flat pay): the higher pay banked it.
  // ⚠️ **AND $114.89 WITH T135, $14.44 MORE** — the same knock-on, eleven years earlier, sign up.
  assert.equal(at(months, '2032-11').closingBalance, toCents(100.45) + toCents(14.44));
  assert.equal(at(months, '2032-12').closingBalance, toCents(0), 'the cash, spent first');
  // ⚠️ **MOVED WHEN DANA'S RETIREMENT MONTH BEGAN PAYING HER DAYS WORKED (2026-09-23), the step before
  // pay rose, and kept beside the new figures.** Her RETIRE is 2031-05-14, so May 2031 pays 14/31 of
  // her month: on flat pay $3,033.33 less $126.60 of tax, and the income test took $445.21 of that
  // month's Age Pension for it — $2,461.52 Ash's pension did not have to pay in May. July's true-up
  // refunded $845.01 less, so ~$1,616.51 stayed in Ash's account; an assessable dollar on the
  // assets-test taper costs $78 a year of pension against the $65 it earns, so it SHRANK: ×
  // (1.065 ÷ 1.078) ^ (141 ÷ 12) is ~$1,401 by 2043-02 — the same size as the $1,313.41 more his
  // account then held. Before that: $2,866.41 of pension, $5,722.26 of Ash, $1,910.34 of Dana.
  assert.equal(toCents(10_499.01) - toCents(2_853.67) - toCents(7_035.67), toCents(609.67), 'the pre-wage-growth first draw at 2043-02, kept beside the new one');
  assert.equal(toCents(10_499.01) - toCents(2_866.41) - toCents(5_722.26), toCents(1_910.34), 'the pre-retirement-month-pay first draw, kept beside the new one');
  const predicted = (toCents(2_461.52) - toCents(845.01)) * (1.065 / 1.078) ** (141 / 12);
  assert.ok(Math.abs(toCents(7_035.67) - toCents(5_722.26) - predicted) < toCents(150), `the move is not the size the mechanism predicts: ${predicted}`);
  assert.equal(toCents(10_434.40) - toCents(33.11) - toCents(3_030.47) - 6, toCents(7_370.76), 'the pre-order first draw at 2042-11, kept beside the new one');
  assert.equal(toCents(158.17) - toCents(157.47), toCents(0.70), 'the pre-P10-4 pension, kept beside the new one');
  assert.equal(toCents(10_370.18) - toCents(959.35) - toCents(3_046.25), toCents(6_364.58), 'the pre-interest first draw at 2042-08, kept beside the new one');
  // And from the month after, the whole bill less the pension comes out of super — to the horizon.
  // 2043-04 is index 199 since Div 119: the target is $10,542.31 and the Age Pension $2,904.24 —
  // nothing else. (Before it, 2043-05 at index 200: $10,564.02 less $2,861.99, $7,702.03.)
  assert.equal(Math.ceil(Math.round(toCents(84_000) * 1.025 ** (199 / 12)) / 12) - amountOf(at(months, '2043-04'), 'Age Pension'), toCents(7_638.07));
  assert.equal(toCents(10_542.31) - toCents(2_904.24), toCents(7_638.07));
  assert.equal(amountOf(at(months, '2043-04'), `${SUPER_LUMP_SUM_LINE}, Dana`), toCents(7_638.07));
  assert.equal(toCents(7_703.59) - toCents(1.56), toCents(7_702.03), 'the pre-Div 119 month-after draw, kept beside the new one');
  // 303 drawing months: the one the first draw moved.
  assert.equal(months.filter((m) => amountOf(m, `${SUPER_LUMP_SUM_LINE}, Dana`) > 0).length, 303);
  assert.equal(302, 302, 'the pre-Div 119 count of drawing months, kept beside the new one');
  assert.equal(304, 304, 'the pre-wage-growth count of drawing months, kept beside the new one');
  assert.equal(307, 307, 'the pre-order count of drawing months, kept beside the new one — three more, the three the first draw moved');
  assert.equal(310, 310, 'the pre-interest count of drawing months, kept beside the new one — three more, the three the Offset now covers');
  assert.equal(180, 180, 'the pre-2026-09-23 count of drawing months, kept beside the new one');
  assert.equal(months.at(-1).month, '2068-05');
  assert.ok(amountOf(months.at(-1), `${SUPER_LUMP_SUM_LINE}, Dana`) > 0, 'drawing in the last month, and not short in it');
  // ⚠️ **THE PENSION COUNT: 99 before O85, 435 after it, and 495 since 2026-09-23.** O85's move was a
  // means-test effect (a household that spends more holds less); this one is the rate's own — a
  // cut-off that rises with the rate stops cutting the couple out.
  // ⚠️ **AND 494 SINCE "SPEND CASH FIRST" (2026-09-23).** One month, 2035-06, where the couple sat
  // $64.83 a month inside the assets-test cut-off: spending the cash before the 6.5% assets leaves
  // them holding $12,831.82 more assessable assets that month ($1,376,454.33 against $1,363,622.51),
  // which takes them over it.
  // ⚠️ **AND 476 SINCE PAY RISES WITH WAGES (2026-09-23), EIGHTEEN FEWER.** Fifteen are months Dana
  // works: her pay rises 3.5% a year every month while the income test's free area rises with prices
  // twice a year, so from 2029 the couple's income crosses the cut-off between indexations — 2029-02
  // to 2031-04, fifteen months in six runs. The other three are 2035-07 to 2035-09: the $20,335.30
  // more they hold in 2035-06 (the pay they banked, grown) keeps them over the assets-test cut-off
  // for four months where it was one.
  // ⚠️ **AND 478 SINCE DIV 119 (LR-1 slice 3, 2026-09-29), TWO MORE: 2035-08 and 2035-09.** The
  // $7,481.37 less the couple holds in 2035-06 (the minimum tax paid by then, grown, less the extra
  // pension it earned — predicted $7,482.20) brings them back under the assets-test cut-off two
  // months sooner.
  assert.equal(months.filter((m) => amountOf(m, 'Age Pension') > 0).length, 478);
  assert.equal(476, 476, 'the pre-Div 119 count, kept beside the new one');
  const unpaidWhileWorking = months.filter((m) => m.month >= '2029-01' && m.month <= '2031-05' && amountOf(m, 'Age Pension') === 0).map((m) => m.month);
  assert.equal(unpaidWhileWorking.length, 15);
  assert.ok(unpaidWhileWorking.every((month) => amountOf(at(months, month), 'Salary, Dana') > 0), 'a month without the pension is not a month Dana works');
  assert.deepEqual(['2035-06', '2035-07'].map((month) => amountOf(at(months, month), 'Age Pension')), [0, 0]);
  assert.ok(amountOf(at(months, '2035-08'), 'Age Pension') > 0);
  assert.equal(494, 494, 'the pre-wage-growth count, kept beside the new one');
  // (And $2,187.45 more again since May 2031 paid — the ~$1,600 left in Ash's account, grown four
  // years, plus Dana's May Guarantee — and $20,335.30 more again since pay rose.)
  // ⚠️ **AND $31.55 MORE AGAIN WITH T135** — the same knock-on `test/app-months-to-series.test.mjs`
  // §1 pins at this same month, on this same fixture's peak.
  assert.equal(at(months, '2035-06').assessableAssets - 136_362_251, toCents(12_831.82) + toCents(2_187.45) + toCents(20_335.30) + toCents(31.55) - toCents(7_481.37));
  assert.equal(495, 495, 'the pre-order count, kept beside the new one');
  assert.equal(435, 435, 'the pre-2026-09-23 count, kept beside the new one');
  assert.equal(99, 99, 'the pre-O85 count, kept beside the new one');
  // Ash's money is an Account-Based Pension and it is limb 2's: no withdrawal line in his name.
  assert.equal(months.reduce((total, m) => total + amountOf(m, `${SUPER_LUMP_SUM_LINE}, Ash`), 0), 0);

  // **And the plan as committed, with the switch.** Dana's account is a pension from the month after
  // her mid-May RETIRE, so the same money reaches the household through limb 2: no limb-5 draw in
  // her name in any month, a pension payment in her name in every month from 2031-06 until her
  // account is spent, and still no month short.
  const committed = project(DEMO_SETTINGS, DEMO_HOUSEHOLD, DEMO_ENTRIES);
  assert.equal(committed.reduce((total, m) => total + amountOf(m, `${SUPER_LUMP_SUM_LINE}, Dana`), 0), 0);
  assert.equal(amountOf(at(committed, '2031-05'), 'Account-Based Pension payment, Dana'), 0, 'the switch is mid-month: May is still accumulation');
  assert.ok(amountOf(at(committed, '2031-06'), 'Account-Based Pension payment, Dana') > 0);
  assert.equal(committed.filter((m) => m.lines.some((l) => l.description === SHORTFALL_LINE)).length, 0);
});