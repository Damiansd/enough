// P7-UX-1 — the month table grouped into financial-year rows, collapsed on load.
//
// The figures are the pure layer's (`financialYearRows.ts`) and are asserted against the demo walk
// in cents: flows are the SUM of the months under the year, stocks are its LAST month's. The
// behaviour — every year collapsed on load, a click toggling one, `revealMonth` opening the right
// one — is `renderTable.ts`'s, and is driven here through a stand-in `document` just large enough
// for the elements the table writes (P2-9a keeps jsdom out).
import test from 'node:test';
import assert from 'node:assert/strict';

import { AGE_PENSION_LINE, project } from '../dist/core/projection.js';
import { financialYearOfMonth } from '../dist/core/financialYear.js';
import { DEMO_ENTRIES, DEMO_HOUSEHOLD, DEMO_SETTINGS } from '../dist/app/demoHousehold.js';
import { moneyBasis, moneyLens } from '../dist/app/todaysDollars.js';
import { formatDollars } from '../dist/app/displayMoney.js';
import { AGE_DIED } from '../dist/app/monthsToSeries.js';
import { monthsToRows } from '../dist/app/monthToRows.js';
import { CATCH_UP_BUTTON, catchUpOffer, catchUpRoomText, financialYearRows } from '../dist/app/financialYearRows.js';
import { readFileSync } from 'node:fs';
import { renderTable, revealMonth, revealMonthInHash } from '../dist/app/renderTable.js';
import { financialYearSummaries } from '../dist/app/chat/tools/financialYearSummary.js';

const MONTHS = project(DEMO_SETTINGS, DEMO_HOUSEHOLD, DEMO_ENTRIES);
const TODAY = moneyBasis('todaysDollars', DEMO_SETTINGS);
const FUTURE = moneyBasis('futureDollars', DEMO_SETTINGS);
const YEARS = financialYearRows(MONTHS, TODAY, DEMO_HOUSEHOLD);
const FUTURE_YEARS = financialYearRows(MONTHS, FUTURE, DEMO_HOUSEHOLD);

const monthsOf = (year) => MONTHS.filter((month) => financialYearOfMonth(month.month) === year.financialYear);

// Each month's flow worked out here from the engine's lines, not through the module's own helpers.
const FLOWS = {
  cashNet: (month) => month.lines.filter((line) => line.effect === 'cash').reduce((sum, line) => sum + (line.direction === 'inflow' ? line.amount : -line.amount), 0),
  incomeFromSuper: (month) => month.incomeFromSuper,
  agePension: (month) => month.lines.filter((line) => line.description === AGE_PENSION_LINE).reduce((sum, line) => sum + line.amount, 0),
};

const yearCents = (basis, months, flow) => months.reduce((sum, month) => sum + moneyLens(basis, month.month)(flow(month)), 0);

test('one year row per financial year, July to June — the connector’s own grouping', () => {
  const summaries = financialYearSummaries(DEMO_HOUSEHOLD, MONTHS);
  assert.deepEqual(YEARS.map((year) => year.financialYear), summaries.map((row) => row.financialYear));
  assert.deepEqual(YEARS.map((year) => year.months.length), summaries.map((row) => row.monthsCovered));
  assert.deepEqual(YEARS.flatMap((year) => year.months), [...monthsToRows(MONTHS, TODAY)]);
  for (const year of YEARS) {
    for (const row of year.months) assert.equal(financialYearOfMonth(row.month), year.financialYear, row.month);
  }
});

test('a year’s net cash, income from super and Age Pension are the sum of its months, exactly, in both bases', () => {
  let differsFromLast = 0;
  let differsFromRoundedParts = 0;
  for (const [basis, years] of [[TODAY, YEARS], [FUTURE, FUTURE_YEARS]]) {
    for (const year of years) {
      const months = monthsOf(year);
      for (const [field, flow] of Object.entries(FLOWS)) {
        assert.equal(year[field], formatDollars(yearCents(basis, months, flow)), `${year.label} ${field}`);
        if (year[field] !== year.months.at(-1)[field]) differsFromLast += 1;
        const roundedParts = months.reduce((sum, month) => sum + Number(formatDollars(moneyLens(basis, month.month)(flow(month))).replace(/[$,]/g, '')), 0);
        if (year[field] !== formatDollars(roundedParts * 100)) differsFromRoundedParts += 1;
      }
    }
  }
  // Controls: the assertion above could not pass with the last month's figure, nor with the months'
  // rounded dollars re-added.
  assert.ok(differsFromLast > 100, `only ${differsFromLast} year totals differ from their last month`);
  assert.ok(differsFromRoundedParts > 0, 'no year separates the exact sum from the rounded parts');
});

test('a year’s opening is its first month’s; its closing, super, investments and total wealth are its last month’s', () => {
  for (const years of [YEARS, FUTURE_YEARS]) {
    for (const year of years) {
      const first = year.months[0];
      const last = year.months.at(-1);
      assert.equal(year.openingBalance, first.openingBalance, year.label);
      for (const field of ['closingBalance', 'superBalance', 'investments', 'totalWealth']) {
        assert.equal(year[field], last[field], `${year.label} ${field}`);
      }
    }
  }
  // Total wealth = Closing + Total super + Investments, in cents, at the year's last month.
  for (const year of YEARS) {
    const last = monthsOf(year).at(-1);
    const lens = moneyLens(TODAY, last.month);
    assert.equal(year.totalWealth, formatDollars(lens(last.closingBalance + last.superBalance + last.closingNonSuperPortfolio)), year.label);
  }
  // Control: a summed closing figure would be a different figure.
  const full = YEARS[1];
  assert.notEqual(full.closingBalance, formatDollars(monthsOf(full).reduce((sum, month) => sum + moneyLens(TODAY, month.month)(month.closingBalance), 0)));
});

test('a year the walk does not cover in full is labelled partial; a full year is its bare name', () => {
  assert.equal(YEARS[0].label, '2026-27 (from Sep)');
  assert.equal(YEARS[0].partial, true);
  assert.equal(YEARS.at(-1).label, '2067-68 (to May)');
  assert.equal(YEARS.at(-1).partial, true);
  for (const year of YEARS.slice(1, -1)) {
    assert.equal(year.label, year.financialYear);
    assert.equal(year.partial, false);
  }
  const short = financialYearRows(MONTHS.filter((month) => month.month <= '2026-12'), TODAY, DEMO_HOUSEHOLD);
  assert.deepEqual(short.map((year) => year.label), ['2026-27 (Sep to Dec)']);
});

test('ages: both people, at the start of each year, in the age axis’s words', () => {
  // Dana is born 1968-05-14 and Ash 1960-02-09; the walk opens 2026-09.
  assert.equal(YEARS[0].ages, '58 (Dana) · 66 (Ash)');
  assert.equal(YEARS[1].ages, '59 (Dana) · 67 (Ash)');
  assert.equal(YEARS[10].ages, '68 (Dana) · 76 (Ash)');
  for (const year of YEARS) assert.match(year.ages, /^\d+ \(Dana\) · \d+ \(Ash\)$/, year.label);
  const sole = financialYearRows(MONTHS.slice(0, 12), TODAY, { ...DEMO_HOUSEHOLD, persons: [DEMO_HOUSEHOLD.persons[0]] });
  assert.equal(sole[0].ages, '58 (Dana)');
});

test('ages after a death: the axis’s own “died” in that Person’s place, the survivor still aged', () => {
  const death = { id: 'd', date: '2032-03-15', owner: 'personA', type: 'DEATH', params: {}, enabled: true, createdAt: '2026-06-01' };
  const died = project(DEMO_SETTINGS, DEMO_HOUSEHOLD, [...DEMO_ENTRIES, death]);
  const years = financialYearRows(died, TODAY, DEMO_HOUSEHOLD);
  const byYear = Object.fromEntries(years.map((year) => [year.financialYear, year.ages]));
  assert.equal(byYear['2031-32'], '63 (Dana) · 71 (Ash)');
  assert.equal(byYear['2032-33'], `${AGE_DIED} (Dana) · 72 (Ash)`);
});

test('the money basis is honoured: future dollars and today’s money give different year rows over the same months', () => {
  assert.equal(YEARS[0].openingBalance, FUTURE_YEARS[0].openingBalance, 'the walk’s first month is “now” in both');
  assert.notEqual(YEARS[10].superBalance, FUTURE_YEARS[10].superBalance);
  assert.notEqual(YEARS[10].incomeFromSuper, FUTURE_YEARS[10].incomeFromSuper);
  assert.deepEqual(FUTURE_YEARS.flatMap((year) => year.months), [...monthsToRows(MONTHS, FUTURE)]);
});

// --- The DOM: a stand-in `document`, just the surface `renderTable.ts` and `infoButton.ts` touch ---

class FakeElement {
  constructor(tagName) {
    this.tagName = tagName.toUpperCase();
    this.children = [];
    this.parent = null;
    this.className = '';
    this.hidden = false;
    this.dataset = {};
    this.attributes = new Map();
    this.listeners = [];
    this.ownText = '';
  }
  set textContent(text) { this.ownText = text; this.children = []; }
  get textContent() { return this.ownText + this.children.map((child) => child.textContent).join(''); }
  append(...nodes) { for (const node of nodes) { node.parent = this; this.children.push(node); } }
  replaceChildren(...nodes) { this.children = []; this.append(...nodes); }
  setAttribute(name, value) { this.attributes.set(name, String(value)); }
  getAttribute(name) { return this.attributes.get(name) ?? null; }
  addEventListener(type, listener) { if (type === 'click') this.listeners.push(listener); }
  click() { for (let node = this; node !== null; node = node.parent) for (const listener of node.listeners) listener(); }
  all(predicate) { return this.children.flatMap((child) => [...(predicate(child) ? [child] : []), ...child.all(predicate)]); }
}

globalThis.document = { createElement: (tag) => new FakeElement(tag) };

const draw = (years = YEARS, onCatchUp = undefined) => {
  const container = new FakeElement('div');
  renderTable(container, years, onCatchUp);
  const bodies = container.all((node) => node.tagName === 'TBODY');
  const yearBodies = bodies.filter((body) => body.className === 'year');
  const monthBodies = bodies.filter((body) => body.className === '');
  const yearOf = (financialYear) => {
    const body = yearBodies.find((each) => each.dataset.financialYear === financialYear);
    const row = body.children[0];
    return { row, button: row.all((node) => node.tagName === 'BUTTON')[0], months: monthBodies.filter((each) => each.dataset.financialYear === financialYear) };
  };
  const openYears = () => yearBodies.map((body) => body.dataset.financialYear).filter((financialYear) => yearOf(financialYear).button.getAttribute('aria-expanded') === 'true');
  const shownMonths = () => monthBodies.filter((body) => !body.hidden).map((body) => body.children[0].children[1].textContent);
  return { yearBodies, monthBodies, yearOf, openYears, shownMonths };
};

test('the table: one row per year followed by its months, EVERY year collapsed on load', () => {
  const table = draw();
  assert.equal(table.yearBodies.length, YEARS.length);
  assert.equal(table.monthBodies.length, MONTHS.length);
  assert.deepEqual(table.openYears(), []);
  assert.deepEqual(table.shownMonths(), []);
  for (const year of YEARS) {
    const { row, button, months } = table.yearOf(year.financialYear);
    assert.equal(button.type, 'button');
    assert.equal(button.getAttribute('aria-expanded'), 'false');
    assert.equal(months.length, year.months.length);
    const cells = row.children.map((cell) => cell.textContent);
    assert.equal(cells[1], `${year.label}${year.ages}`);
    assert.deepEqual(cells.slice(2, 10), [
      year.openingBalance, year.cashNet, year.closingBalance, year.superBalance,
      year.investments, year.totalWealth, year.incomeFromSuper, year.agePension,
    ]);
    // P3-4b slice 2: the tenth cell is the catch-up room, and a button only where one is offered
    // (none here: no `onCatchUp` was handed over).
    assert.equal(cells[10], year.catchUpRoom.map((room) => room.text).join(''));
    assert.equal(row.children.length, 11);
    // Each month keeps its own two rows: the summary line and its hidden detail.
    for (const body of months) {
      assert.deepEqual(body.children.map((tr) => tr.className), ['summary', 'expanded']);
      assert.equal(body.children[1].hidden, true);
    }
  }
});

test('clicking a year’s row, or its button, toggles that year and no other; a month’s own detail still opens', () => {
  const table = draw();
  const year = table.yearOf('2030-31');
  year.row.click();
  assert.deepEqual(table.openYears(), ['2030-31']);
  assert.equal(table.shownMonths().length, 12);
  assert.ok(table.shownMonths().every((month) => financialYearOfMonth(month) === '2030-31'));
  assert.equal(year.button.textContent, '▾');
  // The month's line detail inside the opened year.
  const [firstMonth] = year.months;
  firstMonth.all((node) => node.tagName === 'BUTTON')[0].click();
  assert.equal(firstMonth.children[1].hidden, false);
  assert.deepEqual(table.openYears(), ['2030-31'], 'a month’s own toggle reached its year');
  year.button.click();
  assert.deepEqual(table.openYears(), []);
  assert.deepEqual(table.shownMonths(), []);
});

test('revealMonth opens the year holding the month, never closes it, and refuses a month the table has not got', () => {
  const table = draw();
  assert.equal(revealMonth('2031-04'), true);
  assert.deepEqual(table.openYears(), ['2030-31']);
  assert.equal(revealMonth('2031-06'), true);
  assert.deepEqual(table.openYears(), ['2030-31'], 'a second reveal of an open year closed it');
  assert.equal(revealMonth('2031-07'), true);
  assert.deepEqual(table.openYears(), ['2030-31', '2031-32']);
  assert.equal(revealMonth('2026-09'), true);
  assert.deepEqual(table.openYears(), ['2026-27', '2030-31', '2031-32']);
  assert.equal(revealMonth('1999-01'), false);
  assert.equal(revealMonth('not a month'), false);
  assert.deepEqual(table.openYears(), ['2026-27', '2030-31', '2031-32']);
});

test('a #month-… address opens its year, a line’s address included; a new table starts collapsed again', () => {
  const table = draw();
  assert.equal(revealMonthInHash('#month-2040-02-line-3'), true);
  assert.deepEqual(table.openYears(), ['2039-40']);
  assert.equal(revealMonthInHash('#month-2040-08'), true);
  assert.deepEqual(table.openYears(), ['2039-40', '2040-41']);
  assert.equal(revealMonthInHash('#settings'), false);
  assert.equal(revealMonthInHash('#month-2040-081'), false);
  const again = draw();
  assert.deepEqual(again.openYears(), []);
  revealMonth('2027-01');
  assert.deepEqual(again.openYears(), ['2026-27']);
  assert.deepEqual(table.openYears(), ['2039-40', '2040-41'], 'a reveal reached a table no longer on screen');
});

// --- P3-4b slice 2: the catch-up room, READ off the Month field, and the button ----------------------

const cap = (fields) => ({
  generalCap: 3_000_000,
  carriedForwardAvailable: 1_000_000,
  usedSoFar: 1_500_000,
  remaining: 2_500_000,
  totalSuperBalance: 40_000_000,
  closedByTotalSuperBalance: false,
  oldestUnusedUsableUntil: '2031-32',
  ...fields,
});
/** A year of months holding nothing but the cap field — the only thing the cell may read. */
const yearOfCaps = (last, first = '2028-07') => Array.from({ length: 12 }, (_unused, index) => {
  const monthNumber = (Number(first.slice(5)) - 1 + index) % 12 + 1;
  const year = Number(first.slice(0, 4)) + Math.floor((Number(first.slice(5)) - 1 + index) / 12);
  return { month: `${year}-${String(monthNumber).padStart(2, '0')}`, concessionalCapByPerson: [index === 11 ? last : cap({})] };
});

test('the catch-up cell is the walk’s own figures, in words, whole dollars rounded DOWN', () => {
  // DOCTORED on purpose: `remaining` agrees with nothing the other fields add up to (30,000 +
  // 10,000 − 15,000 is 25,000). A cell that worked the room out would print $25,000.
  const doctored = cap({ remaining: 1_234_599 });
  assert.equal(catchUpRoomText(doctored), '$12,345 unused · oldest expires 2031-32');
  assert.equal(catchUpRoomText(cap({ oldestUnusedUsableUntil: null, remaining: 99 })), '$0 unused');
  assert.equal(catchUpRoomText(cap({ closedByTotalSuperBalance: true })), 'closed · super $500,000 or more');
  assert.equal(catchUpRoomText(cap({ closedByTotalSuperBalance: true, totalSuperBalance: null })), 'closed · 30 June balance not stated');
  assert.equal(catchUpRoomText(null), '', 'nothing where there is no cap');
  // The offer is the same remaining room, rounded DOWN to whole dollars — never up.
  assert.equal(catchUpOffer(yearOfCaps(doctored), 0), 1_234_500);
  assert.equal(catchUpOffer(yearOfCaps(cap({ remaining: 99 })), 0), null, 'under a dollar is no offer');
  // Offered only for a whole year from July, with carried-forward room open, to a Person contributing.
  assert.equal(catchUpOffer(yearOfCaps(doctored).slice(1), 0), null);
  assert.equal(catchUpOffer(yearOfCaps(doctored, '2028-08'), 0), null);
  assert.equal(catchUpOffer(yearOfCaps(cap({ carriedForwardAvailable: 0 })), 0), null);
  assert.equal(catchUpOffer(yearOfCaps(cap({ closedByTotalSuperBalance: true })), 0), null);
  assert.equal(catchUpOffer(yearOfCaps(cap({ usedSoFar: 0 })), 0), null);
  assert.equal(catchUpOffer(yearOfCaps(null), 0), null);
});

test('every year row’s catch-up cell is its LAST month’s field, by name for a couple', () => {
  for (const year of YEARS) {
    const last = monthsOf(year).at(-1);
    year.catchUpRoom.forEach((room, index) => {
      const text = catchUpRoomText(last.concessionalCapByPerson[index]);
      assert.equal(room.text, text === '' ? '' : `${DEMO_HOUSEHOLD.persons[index].name}: ${text}`, `${year.label} ${index}`);
      assert.equal(room.offer, catchUpOffer(monthsOf(year), index));
    });
  }
  // The demo is dated 2026-09-01 and states no 30 June balance: its first year is closed, not open.
  assert.deepEqual(YEARS[0].catchUpRoom.map((room) => room.text), ['Dana: closed · 30 June balance not stated', 'Ash: closed · 30 June balance not stated']);
  assert.ok(YEARS.some((year) => year.catchUpRoom.some((room) => room.offer !== null)), 'the demo offers no catch-up anywhere — the button test below proves nothing');
  // The cell is the same in either money view: a cap is a nominal amount.
  assert.deepEqual(FUTURE_YEARS.map((year) => year.catchUpRoom), YEARS.map((year) => year.catchUpRoom));
  // In source: the file reads the field and imports nothing that could work a cap out.
  const source = readFileSync(new URL('../src/app/financialYearRows.ts', import.meta.url), 'utf8');
  assert.doesNotMatch(source, /from '\.\.\/core\/(superCaps|superConcessional|projection)\.js'/);
  assert.doesNotMatch(source, /carryForwardHeadroom|applyConcessional|concessionalContributionsCap/);
});

test('"Add a catch-up" writes nothing until it is clicked, and a click asks for exactly that Person and year', () => {
  const asked = [];
  const table = draw(YEARS, (person, financialYear) => asked.push([person, financialYear]));
  const offered = YEARS.filter((year) => year.catchUpRoom.some((room) => room.offer !== null));
  const buttons = table.yearBodies.flatMap((body) => body.all((node) => node.tagName === 'BUTTON' && node.className === 'catch-up-add'));
  assert.equal(buttons.length, offered.reduce((count, year) => count + year.catchUpRoom.filter((room) => room.offer !== null).length, 0));
  assert.deepEqual(asked, [], 'drawing the table asked for a catch-up');
  assert.ok(buttons.every((button) => button.textContent === CATCH_UP_BUTTON));
  buttons[0].click();
  const first = offered[0];
  assert.deepEqual(asked, [[first.catchUpRoom.find((room) => room.offer !== null).person, first.financialYear]]);
  // And with no handler there is no button at all.
  assert.equal(draw(YEARS).yearBodies.flatMap((body) => body.all((node) => node.className === 'catch-up-add')).length, 0);
  // main.ts: the one call that builds a catch-up is inside the click handler, which is only handed to the table.
  const main = readFileSync(new URL('../src/app/main.ts', import.meta.url), 'utf8');
  assert.equal([...main.matchAll(/checkedCatchUp\(/g)].length, 1);
  assert.match(main, /const catchUp = \(person: number, financialYear: FinancialYear\): void => \{/);
  assert.equal([...main.matchAll(/\bcatchUp\b/g)].length, 2, 'catchUp is called somewhere other than the table’s click');
});
