// plan_ai.md §6 and §14, stage 3 — the figure store: every tool result under an id, each money figure
// in it addressable by a path and stored RAW (nominal cents and month, a stated spending level, a
// salary in today's wages, or a legislated figure), and the model shown each figure as its marker
// plus a labelled whole-dollar value.
//
// Expected raw values are read from `project()` and the summariser directly, and expected displayed
// values are converted here through `moneyLens` and rounded here: never through the store's own code.
import test from 'node:test';
import assert from 'node:assert/strict';

import { toCents } from '../dist/core/money.js';
import { project } from '../dist/core/projection.js';
import { DEMO_PLAN } from '../dist/app/demoHousehold.js';
import { moneyBasis, moneyLens } from '../dist/app/todaysDollars.js';
import { UnaddressableFigureError, createFigureStore, shownFigure } from '../dist/app/chat/figureStore.js';
import { formatDollars } from '../dist/app/displayMoney.js';
import { RAW_MARK, capturingFigures } from '../dist/app/chat/tools/figureCapture.js';
import { financialYearSummaries } from '../dist/app/chat/tools/financialYearSummary.js';
import { explainAssumption } from '../dist/app/chat/tools/explainAssumption.js';
import { getMarkers } from '../dist/app/chat/tools/getMarkers.js';
import { getMonth } from '../dist/app/chat/tools/getMonth.js';
import { listEntries } from '../dist/app/chat/tools/listEntries.js';
import { proposeEntries } from '../dist/app/chat/tools/proposeEntries.js';
import { runProjection } from '../dist/app/chat/tools/runProjection.js';
import { solveSustainableSpend } from '../dist/app/chat/tools/solveSustainableSpend.js';
import { whatCanYouModel } from '../dist/app/chat/tools/whatCanYouModel.js';

const PLAN = DEMO_PLAN;
const MONTHS = project(PLAN.settings, PLAN.household, PLAN.entries);
const TODAY = moneyBasis('todaysDollars', PLAN.settings);
const FUTURE = moneyBasis('futureDollars', PLAN.settings);

/** Whole dollars, written out here: `$1,234` from 123,449 cents, and a minus before the `$`. */
const dollarsOf = (cents) => {
  // A half goes away from zero, as `roundToDollar` does.
  const whole = Math.sign(cents) * Math.round(Math.abs(cents) / 100);
  return `${whole < 0 ? '-' : ''}$${Math.abs(whole).toLocaleString('en-AU')}`;
};

const spendDraft = {
  date: '2030-01-01',
  owner: 'household',
  type: 'SPEND_CHANGE',
  params: { annualSpend: toCents(50_000) },
  enabled: true,
  createdAt: '2026-09-24',
};

/** Every read tool once, in both bases: the calls a conversation makes. */
const EVERY_TOOL = [
  ['getMonth', () => getMonth(PLAN, '2031-05')],
  ['getMonth', () => getMonth(PLAN, '2031-05', { basis: 'futureDollars' })],
  ['getMarkers', () => getMarkers(PLAN)],
  ['listEntries', () => listEntries(PLAN)],
  ['listEntries', () => listEntries(PLAN, { basis: 'futureDollars' })],
  ['runProjection', () => runProjection(PLAN, [spendDraft])],
  ['runProjection', () => runProjection(PLAN, [spendDraft], { detail: 'full', basis: 'futureDollars' })],
  ['solveSustainableSpend', () => solveSustainableSpend(PLAN)],
  ['whatCanYouModel', () => whatCanYouModel(PLAN)],
  ['explainAssumption', () => explainAssumption(PLAN, 'agePension.indexation.mtaweAnchor')],
  ['proposeEntries', () => proposeEntries(PLAN, [spendDraft])],
];

test('every tool records, ids run t1, t2, …, and every $ the model sees sits straight after its marker', () => {
  const store = createFigureStore(PLAN.settings);
  for (const [tool, run] of EVERY_TOOL) store.record(tool, run);
  const results = store.results();
  assert.deepEqual(results.map(({ id }) => id), EVERY_TOOL.map((_, index) => `t${index + 1}`));
  for (const { id, tool, modelText, figures } of results) {
    const dollars = modelText.match(/\$\d/g) ?? [];
    const marked = modelText.match(/⟦t\d+:[^⟦⟧]+⟧ -?\$\d/g) ?? [];
    assert.equal(marked.length, dollars.length, `${id} (${tool}): a $ figure without a marker`);
    assert.equal(figures.size, dollars.length, `${id} (${tool}): a figure the store does not hold`);
    assert.ok(!modelText.includes(RAW_MARK), `${id} (${tool}): a raw mark reached the model`);
    for (const path of figures.keys()) assert.ok(modelText.includes(`⟦${id}:${path}⟧`), `${id}: ${path} is stored but never shown`);
  }
  // Not vacuous: the tools that carry figures carried them.
  const counts = new Map(results.map(({ id, figures }) => [id, figures.size]));
  for (const id of ['t1', 't2', 't4', 't5', 't6', 't7', 't8', 't9', 't10', 't11']) assert.ok(counts.get(id) > 0, `${id} held no figure`);
});

test('outside a capture every tool is byte-identical; inside one, only the raw marks are added', () => {
  for (const [tool, run] of EVERY_TOOL) {
    const plain = run();
    assert.ok(!plain.includes(RAW_MARK), `${tool} carries a raw mark outside a capture`);
    const captured = capturingFigures(run);
    assert.equal(captured.replace(new RegExp(`${RAW_MARK}[ms]-?\\d+@\\d{4}-\\d{2}${RAW_MARK}`, 'g'), ''), plain, `${tool} changed under a capture`);
  }
});

test('a getMonth line is stored as the engine’s nominal cents of that month, linked to that line, and shown in the tool’s basis', () => {
  const month = MONTHS.find(({ month }) => month === '2031-05');
  for (const [basis, view] of [[TODAY, 'todaysDollars'], [FUTURE, 'futureDollars']]) {
    const store = createFigureStore(PLAN.settings);
    const text = store.record('getMonth', () => getMonth(PLAN, '2031-05', { basis: view }));
    const lens = moneyLens(basis, '2031-05');
    month.lines.forEach((line, index) => {
      const path = `lines[${index}].amount`;
      assert.deepEqual(store.resolve('t1', path), { raw: { kind: 'nominal', cents: line.amount, month: '2031-05' }, link: { month: '2031-05', line: index } });
      const tag = view === 'todaysDollars' ? 'today’s money' : 'future dollars';
      assert.ok(text.includes(`"amount":"⟦t1:${path}⟧ ${dollarsOf(lens(line.amount))} (${tag})"`), `${view}: ${path}`);
    });
    // A balance is the month's, and links to the month without a line.
    assert.deepEqual(store.resolve('t1', 'balances.closingBalance'), { raw: { kind: 'nominal', cents: month.closingBalance, month: '2031-05' }, link: { month: '2031-05' } });
  }
});

test('a financial year is named fyYYYY-YY in the path and stored at its last month, as the summariser adds it up', () => {
  const store = createFigureStore(PLAN.settings);
  store.record('runProjection', () => runProjection(PLAN, undefined, { detail: 'full' }));
  const rows = financialYearSummaries(PLAN.household, MONTHS);
  assert.ok(rows.length > 30);
  for (const row of rows) {
    const figure = store.resolve('t1', `financialYears.fy${row.financialYear}.flows.agePension`);
    assert.deepEqual(figure, { raw: { kind: 'nominal', cents: row.flows.agePension, month: row.lastMonth }, link: { month: row.lastMonth } }, row.financialYear);
  }
  assert.equal(store.resolve('t1', 'financialYears[3].flows.agePension'), undefined, 'a year is addressed by its name, not its index');
});

test('the spending level is stored as stated in today’s money, a salary in today’s wages, and a legislated figure with its stamp', () => {
  const store = createFigureStore(PLAN.settings);
  store.record('listEntries', () => listEntries(PLAN));
  const index = PLAN.entries.findIndex(({ id }) => id === 'spend-2026');
  const spend = PLAN.entries[index];
  const stated = store.resolve('t1', `entries[${index}].wording#1`);
  assert.deepEqual(stated.raw, { kind: 'statedTodaysMoney', cents: spend.params.annualSpend, month: '2026-09' });
  // Shown to the model in today's money as itself.
  assert.ok(store.results()[0].modelText.includes(`⟦t1:entries[${index}].wording#1⟧ ${dollarsOf(spend.params.annualSpend)} (today’s money)`));

  const salary = { ...spendDraft, owner: 'personA', type: 'WORK_PATTERN_CHANGE', params: { daysPerWeek: 3, annualSalary: toCents(60_000) } };
  store.record('proposeEntries', () => proposeEntries(PLAN, [salary]));
  const wages = [...store.results()[1].figures.values()].map(({ raw }) => raw);
  assert.deepEqual(wages, [{ kind: 'todaysWages', cents: toCents(60_000) }]);

  store.record('explainAssumption', () => explainAssumption(PLAN, 'agePension.indexation.mtaweAnchor'));
  const [legislated] = [...store.results()[2].figures.values()];
  assert.deepEqual(legislated, { raw: { kind: 'legislated', cents: toCents(1_832.8), tag: 'as legislated from 2026-06-30' } });
});

test('a figure inside a sentence is addressed by its place in it (a synthetic portfolio’s distribution notes)', () => {
  // SYNTHETIC: one Person holding a share parcel that pays a distribution, so a month's notes carry
  // figures in prose, with no field of their own.
  const plan = {
    ...PLAN,
    settings: { ...PLAN.settings, investmentPayoutRate: 0.04, investmentPayoutFrankedShare: 0.5 },
    household: {
      ...PLAN.household,
      persons: PLAN.household.persons.map((person, index) =>
        index === 0 ? { ...person, parcels: [{ acquired: '2014-03-11', costBase: toCents(38_000), marketValue: toCents(96_500) }] } : person,
      ),
    },
  };
  const months = project(plan.settings, plan.household, plan.entries);
  const store = createFigureStore(plan.settings);
  for (const { month } of months.slice(0, 12)) store.record('getMonth', () => getMonth(plan, month));
  const inProse = store.results().flatMap(({ id, figures }) => [...figures.keys()].filter((path) => path.includes('#')).map((path) => `${id}:${path}`));
  assert.ok(inProse.some((marker) => /notes\[\d+\]\.\w+#1$/.test(marker)), `no figure in a note's prose was addressed: ${inProse.slice(0, 3)}`);
});

test('a basis-labelled figure with no raw value, or a bare $ figure, is refused rather than shown uncited', () => {
  const store = createFigureStore(PLAN.settings);
  assert.throws(() => store.record('forged', () => JSON.stringify({ a: '$1,234.56 (today’s money)' })), UnaddressableFigureError);
  assert.throws(() => store.record('forged', () => JSON.stringify({ a: 'about $1,234' })), UnaddressableFigureError);
  assert.equal(store.results().length, 0, 'a refused result takes no id');
  // A `$` that is not a figure (a form box's name) is not one.
  assert.doesNotThrow(() => store.record('boxes', () => JSON.stringify({ box: 'Amount $' })));
});

test('a chip rounds exactly as the page does: through displayMoney’s roundToDollar, halves away from zero', () => {
  const basis = moneyBasis('futureDollars', PLAN.settings);
  for (const cents of [49, 50, 150, 250, -50, -150, -250, 1_234_50, -1_234_50, -1_234_49]) {
    const shown = shownFigure({ kind: 'legislated', cents, tag: 'as legislated 2026-27' }, basis).dollars;
    assert.equal(shown, formatDollars(cents), `${cents} cents`);
    assert.equal(shown, dollarsOf(cents), `${cents} cents, by hand`);
  }
  // The case the old local formatter got wrong: Math.round sends -$2.50 to -$2.
  assert.equal(shownFigure({ kind: 'todaysWages', cents: -250 }, basis).dollars, '-$3');
});
