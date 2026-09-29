// THE WHOLE FINANCIAL YEAR AGAINST THE YEAR'S CAP (2026-09-23).
//
// A salary sacrifice is refused in the month it is STATED if it is over the cap then, on that
// month's pay. Pay rises with wages every month, so the employer Guarantee grows through the year
// while a stated sacrifice stays the same dollars, and a sacrifice stated at the edge of the room
// goes over the cap later. The walk now adds up each year's actual Guarantee and sacrifice as it
// goes, and in the month the total first passes that year's cap it says so, once, in a
// `'concessional cap exceeded'` note. A note and not a throw: the user changed nothing, and a
// forecast must not stop because wages grew. The excess is still walked at the fund's 15%, and the
// note says the forecast is flattering from there.
import test from 'node:test';
import assert from 'node:assert/strict';

import { mulCents, toCents } from '../dist/core/money.js';
import { project } from '../dist/core/projection.js';

const entry = (id, type, date, owner = 'personA', params = {}) => ({ id, date, owner, type, params, enabled: true, createdAt: '2027-01-01' });

/** Wages at 3.5%. The walk opens on 1 July, so the first year is a whole year and not a lower bound. */
const SETTINGS = {
  asAtDate: '2027-07-01',
  planningHorizonAge: 50,
  economicSeries: { cpi: 0.025, pblci: 0.025, awote: 0.035, mtawe: 0.035 },
  deemingRates: { lower: 0.0175, upper: 0.0375 },
  nominalReturn: 0,
  cashInterestRate: 0,
};
/** Kit is 47. $6,000 a fortnight is $156,000 a year in July 2027's wages. */
const KIT = {
  persons: [{
    name: 'Kit',
    dateOfBirth: '1980-03-15',
    superInterests: [{ phase: 'accumulation', balance: toCents(0) }],
    parcels: [],
    employmentIncomePerFortnight: toCents(6_000),
    workBonusBalance: toCents(0),
  }],
  homeStatus: 'occupied',
};
const sacrificing = (annualAmount) =>
  project(SETTINGS, KIT, [entry('s', 'SUPER_CONTRIBUTION', '2027-07-01', 'personA', { kind: 'salarySacrificed', annualAmount, interestIndex: 0 })]);
const capNotes = (months) =>
  months.flatMap((m) => m.notes.filter((n) => n.subject === 'concessional cap exceeded').map((n) => ({ month: m.month, ...n })));

// --- The hand model --------------------------------------------------------------------------------
//
// Month i of the walk (i = 0 is July 2027) pays the stated $156,000 raised by 1.035 ^ (i/12). The
// Guarantee is 12% of it (qualifying earnings add the sacrifice back, T17, so the split does not
// move it), a year's figure credited a twelfth a month; the sacrifice is a twelfth of the stated
// annual amount, the same every month. Every step rounds to the cent.
//
// The caps are the ones `core-projection-sacrifice-credit.test.mjs` derives from December 2025's
// published 2051.10 grown at 3.5%: $32,500 for FY2027-28 and one $2,500 step up, $35,000, for
// FY2028-29.
const CAP_2027_28 = toCents(32_500);
const CAP_2028_29 = toCents(35_000);
const guaranteeInMonth = (i) => mulCents(mulCents(mulCents(toCents(156_000), 1.035 ** (i / 12)), 0.12), 1 / 12);
const yearToDate = (firstMonth, monthsIn, sacrifice) => {
  let total = 0;
  for (let i = firstMonth; i < firstMonth + monthsIn; i += 1) total += guaranteeInMonth(i) + mulCents(sacrifice, 1 / 12);
  return total;
};

/**
 * The room in July 2027: the cap less the Guarantee at July's pay, $18,720. $13,780 is exactly at
 * the cap in the month it is stated, so the refusal there passes it — and nothing afterwards looked.
 */
const AT_THE_ROOM = toCents(13_780);

test('A SACRIFICE AT THE EDGE OF THE ROOM GOES OVER LATER IN THE YEAR, AND THE MONTH IT DOES SAYS SO', () => {
  assert.equal(CAP_2027_28 - mulCents(toCents(156_000), 0.12), AT_THE_ROOM);
  // Where the model crosses: the first month whose year-to-date total is over $32,500.
  const crossing = [...Array(12).keys()].find((k) => yearToDate(0, k + 1, AT_THE_ROOM) > CAP_2027_28);
  assert.ok(crossing !== undefined, 'the model never crosses — the fixture is not at the edge');
  const expectedMonth = `${crossing < 6 ? 2027 : 2028}-${String(((crossing + 6) % 12) + 1).padStart(2, '0')}`;
  const total = yearToDate(0, crossing + 1, AT_THE_ROOM);
  // It walks: the stated month's refusal passed it.
  const months = sacrificing(AT_THE_ROOM);
  const notes = capNotes(months);
  // ONE note across the whole walk, in the modelled month, with the modelled figures.
  assert.equal(notes.length, 1, JSON.stringify(notes.map((n) => [n.month, n.financialYear])));
  const [note] = notes;
  assert.equal(note.month, expectedMonth);
  assert.equal(note.person, 'Kit');
  assert.equal(note.financialYear, '2027-28');
  assert.equal(note.contributedThisYear, total);
  assert.equal(note.generalCap, CAP_2027_28);
  assert.equal(note.excessSoFar, total - CAP_2027_28);
  // The excess is SMALL — cents to a few hundred dollars — because it is only the month's growth.
  assert.ok(note.excessSoFar > 0 && note.excessSoFar < toCents(500), String(note.excessSoFar));
  // The note is honest about the direction it leaves the forecast in, and about the cap it used.
  assert.match(note.note, /FLATTERING/);
  assert.match(note.note, /FORECAST/);
  assert.match(note.note, /Division 291 is not modelled/);
  assert.equal('amount' in note, false);
});

test('EVERY YEAR IS HELD AGAINST ITS OWN CAP — FY2028-29 is over $32,500 and inside $35,000', () => {
  // The second year's actual total, modelled: months 12 to 23. It lies between the two caps, so a
  // walk that measured FY2028-29 against FY2027-28's cap would note it and this one must not.
  const second = yearToDate(12, 12, AT_THE_ROOM);
  assert.ok(second > CAP_2027_28 && second < CAP_2028_29, `FY2028-29 totals ${second}c — the fixture no longer separates the two caps`);
  const notes = capNotes(sacrificing(AT_THE_ROOM));
  assert.deepEqual(notes.map((n) => n.financialYear), ['2027-28']);
});

test('A PLAN INSIDE THE CAP ALL YEAR CARRIES NO NOTE IN ANY MONTH', () => {
  // $13,000: the model's whole of FY2027-28 is under $32,500, and so is every later year's.
  assert.ok(yearToDate(0, 12, toCents(13_000)) < CAP_2027_28);
  assert.ok(yearToDate(12, 12, toCents(13_000)) < CAP_2028_29);
  const months = sacrificing(toCents(13_000));
  assert.equal(capNotes(months).length, 0);
  // And the Guarantee on its own — no sacrifice at all — never reaches one.
  assert.equal(capNotes(project(SETTINGS, KIT, [])).length, 0);
});

test('THE STATED MONTH STILL REFUSES WHAT IS OVER THE CAP THERE — the note does not replace the throw', () => {
  assert.throws(() => sacrificing(AT_THE_ROOM + 1), { name: 'ExcessConcessionalContributionsNotModelledError' });
});
