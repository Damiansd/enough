// plan_ai.md §6 and §14, stage 3 — chips and the guard. A marker in the model's prose becomes a chip
// showing the ENGINE's value, converted now in the page's basis, in whole dollars, and linked to the
// month table; a marker that names nothing is a red "no such figure" chip; and every figure the model
// wrote itself is struck out and counted. D3: a year, month, age or percentage may stand only word
// for word from the question or a tool result, and a dollar amount never.
//
// Expected chip values are converted here through `moneyLens` and rounded here, never through
// `chips.ts` or `figureStore.ts`.
import test from 'node:test';
import assert from 'node:assert/strict';

import { toCents } from '../dist/core/money.js';
import { inflateStated } from '../dist/core/priceLevel.js';
import { project } from '../dist/core/projection.js';
import { DEMO_PLAN } from '../dist/app/demoHousehold.js';
import { moneyBasis, moneyLens } from '../dist/app/todaysDollars.js';
import { NOT_WORKED_OUT_BY_ENOUGH, NO_SUCH_FIGURE, renderReply } from '../dist/app/chat/chips.js';
import { createFigureStore } from '../dist/app/chat/figureStore.js';
import { getMonth } from '../dist/app/chat/tools/getMonth.js';
import { listEntries } from '../dist/app/chat/tools/listEntries.js';
import { runProjection } from '../dist/app/chat/tools/runProjection.js';

const PLAN = DEMO_PLAN;
const MONTH = '2040-03';
const LINES = project(PLAN.settings, PLAN.household, PLAN.entries).find(({ month }) => month === MONTH).lines;
const TODAY = moneyBasis('todaysDollars', PLAN.settings);
const FUTURE = moneyBasis('futureDollars', PLAN.settings);

const dollarsOf = (cents) => {
  // A half goes away from zero, as `roundToDollar` does.
  const whole = Math.sign(cents) * Math.round(Math.abs(cents) / 100);
  return `${whole < 0 ? '-' : ''}$${Math.abs(whole).toLocaleString('en-AU')}`;
};

/** A store holding one getMonth result (t1) and one full what-if (t2), as a conversation would. */
const conversation = () => {
  const store = createFigureStore(PLAN.settings);
  store.record('getMonth', () => getMonth(PLAN, MONTH));
  store.record('runProjection', () => runProjection(PLAN, undefined, { detail: 'full' }));
  return store;
};

const chipsOf = (rendered) => rendered.segments.filter(({ kind }) => kind === 'chip');
const struckOf = (rendered) => rendered.segments.filter(({ kind }) => kind === 'struck').map(({ text }) => text);
const textOf = (rendered) => rendered.segments.filter(({ kind }) => kind === 'text').map(({ text }) => text).join('');

// The largest line, so today's money and future dollars cannot round to the same whole dollar.
const LINE = LINES.reduce((best, line, index) => (line.amount > LINES[best].amount ? index : best), 0);
const MARKER = `⟦t1:lines[${LINE}].amount⟧`;

test('a chip shows the engine’s value in the page’s basis, whole dollars, and opens the month table at that line', () => {
  const store = conversation();
  const cents = LINES[LINE].amount;
  const today = renderReply(`That month's biggest line is ${MARKER}.`, '', store, TODAY);
  const future = renderReply(`That month's biggest line is ${MARKER}.`, '', store, FUTURE);
  assert.deepEqual(chipsOf(today).map(({ dollars, tag, href }) => ({ dollars, tag, href })), [
    { dollars: dollarsOf(moneyLens(TODAY, MONTH)(cents)), tag: 'today’s money', href: `#month-${MONTH}-line-${LINE}` },
  ]);
  assert.deepEqual(chipsOf(future).map(({ dollars, tag }) => ({ dollars, tag })), [{ dollars: dollarsOf(cents), tag: 'future dollars' }]);
  // The toggle is not a relabelling: the two views are different figures.
  assert.notEqual(chipsOf(today)[0].dollars, chipsOf(future)[0].dollars);
  assert.equal(today.struck, 0);
  assert.equal(today.unresolved, 0);
  assert.match(today.html, new RegExp(`<a class="figure-chip" data-marker="[^"]+" href="#month-${MONTH}-line-${LINE}">\\$`));
});

test('a stated spending level follows the toggle the other way: itself today, raised to its month in future dollars', () => {
  const store = createFigureStore(PLAN.settings);
  store.record('listEntries', () => listEntries(PLAN));
  const [path] = store.results()[0].figures.keys();
  const { raw } = store.resolve('t1', path);
  assert.equal(raw.kind, 'statedTodaysMoney');
  const prose = `Spending is ⟦t1:${path}⟧.`;
  assert.equal(chipsOf(renderReply(prose, '', store, TODAY))[0].dollars, dollarsOf(raw.cents));
  assert.equal(chipsOf(renderReply(prose, '', store, FUTURE))[0].dollars, dollarsOf(inflateStated(raw.cents, PLAN.settings.economicSeries.cpi, PLAN.settings.asAtDate, raw.month)));
});

test('a chip never shows what the model wrote: its own figure beside the marker is struck, not shown', () => {
  const store = conversation();
  const rendered = renderReply(`It is ${MARKER} $999,999 (today’s money), or ⟦t1:lines[${LINE}].amount|$5⟧.`, '', store, TODAY);
  const [chip] = chipsOf(rendered);
  assert.equal(chip.dollars, dollarsOf(moneyLens(TODAY, MONTH)(LINES[LINE].amount)));
  assert.deepEqual(struckOf(rendered), ['$999,999']);
  assert.doesNotMatch(textOf(rendered), /999/, 'the model’s own figure reached the page unstruck');
  assert.match(rendered.html, /<del class="not-from-engine"[^>]*>\$999,999<\/del>/);
  // A marker with anything of the model's in its path names nothing.
  assert.equal(rendered.unresolved, 1);
});

test('no chip shows cents, in either basis, over every figure of a full what-if', () => {
  const store = conversation();
  const markers = [...store.results()[1].figures.keys()].map((path) => `⟦t2:${path}⟧`);
  assert.ok(markers.length > 1000);
  for (const basis of [TODAY, FUTURE]) {
    const chips = chipsOf(renderReply(markers.join(' '), '', store, basis));
    assert.equal(chips.length, markers.length);
    for (const { dollars } of chips) assert.match(dollars, /^-?\$\d{1,3}(?:,\d{3})*$/);
  }
});

test('a marker that resolves to nothing is a red “no such figure” chip, never text', () => {
  const store = conversation();
  const attempts = ['⟦t1:lines[999].amount⟧', '⟦t9:lines[0].amount⟧', '⟦t1:nothing.here⟧', '⟦t1⟧', '⟦$62k⟧', '⟦⟧'];
  const rendered = renderReply(`Here: ${attempts.join(' and ')}.`, '', store, TODAY);
  assert.equal(rendered.unresolved, attempts.length);
  assert.equal(chipsOf(rendered).length, 0);
  assert.equal(rendered.html.split(`<span class="figure-chip no-such-figure">${NO_SUCH_FIGURE}</span>`).length - 1, attempts.length);
  for (const leaked of ['999', 't9', 'nothing', '62k', '⟦', '⟧']) assert.ok(!rendered.html.includes(leaked), `${leaked} reached the page`);
  assert.equal(rendered.struck, 0, 'a marker attempt is a chip, not prose for the guard');
});

// ADR-0011, 2026-09-24 note: golden run 2, W6. The model rounded one figure and averaged two.
const W6 = 'you would take about $62k less a year from super (today’s money) and pay about $18k more a year in tax';

test('W6’s real sentence is struck: both figures, and nothing of either left standing', () => {
  const rendered = renderReply(W6, 'What if I retire at 60 instead of 64?', conversation(), TODAY);
  assert.deepEqual(struckOf(rendered), ['$62k', '$18k']);
  assert.equal(rendered.struck, 2);
  assert.doesNotMatch(textOf(rendered), /\d/);
  assert.equal(rendered.html.split(NOT_WORKED_OUT_BY_ENOUGH).length - 1, 4, 'each struck figure is titled and labelled “not worked out by enough”');
});

test('every currency-like form is struck, however it is written, and wherever it came from', () => {
  const question = 'Can I spend $62k a year? We have 62 thousand dollars in cash.';
  const forms = [
    '$62k', '$62,000', '-$18,375', '$18,375.48', '62k', '1.2m', '3bn', 'A$62k', 'AUD 5,000', '$ 62 thousand',
    '62 thousand dollars', '62 thousand', 'sixty-two thousand dollars', 'sixty two thousand', 'eighteen grand', '18 grand',
    'a few thousand dollars', '500 dollars', 'five hundred bucks', '40 cents', '18,375', '62000',
  ];
  const store = conversation();
  for (const form of forms) {
    const rendered = renderReply(`It comes to ${form} a year.`, question, store, TODAY);
    assert.equal(rendered.struck, 1, `${form}: ${JSON.stringify(struckOf(rendered))}`);
    assert.doesNotMatch(textOf(rendered), /\d|thousand|grand|dollars|bucks|cents/, form);
  }
});

test('D3: a year, month, age or percentage stands only if it is word for word in the question or a tool result', () => {
  const store = conversation();
  const question = 'What if Person A retires at 63 in 2031 and returns drop to 5.5%?';
  const reply = (prose) => renderReply(prose, question, store, TODAY);
  // From the question.
  assert.equal(reply('Retiring at 63 in 2031 with returns of 5.5% is modelled.').struck, 0);
  // From a tool result: a financial year and a month the what-if returned.
  assert.equal(reply(`In 2045-46 and in ${MONTH} the figures change.`).struck, 0);
  // Not there: an invented year, age and percentage, and a percentage reworded from the question.
  const sources = [question, ...store.results().map(({ modelText }) => modelText)].join('\n');
  for (const absent of ['2099', '84', '7.25']) {
    assert.doesNotMatch(sources, new RegExp(`(?<![\\d,.$])${absent.replace('.', '\\.')}(?![\\d,.])`), `${absent} is in the source text, so the case below proves nothing`);
  }
  assert.deepEqual(struckOf(reply('In 2099, at 84, returns of 7.25% or 5.5 per cent.')), ['2099', '84', '7.25%', '5.5 per cent']);
  // A dollar figure the model was shown does not come back as a bare number.
  const shown = store.results()[0].modelText.match(/⟧ \$([\d,]+) /)[1];
  assert.equal(reply(`That is ${shown.replace(/,/g, '')} over the year.`).struck, 1);
  // An ordered list's own numbering and plain number words are not figures.
  assert.equal(reply('1. Person A retires.\n2. Both keep three days a week.').struck, 0);
});
