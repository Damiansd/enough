// P17-4 — **Pip and Jo's figures are checked, not trusted.** Every Pip-and-Jo figure in
// `userguide.md` is tagged `{{fig KEY ROUNDING|text}}` (see `scripts/build-guide.mjs`). This suite
// runs their plan, `fixtures/userguide-pip-jo.plan.json`, through the engine, reads each KEY off the
// result with the one small function below, rounds it the way the tag says the sentence does, and
// fails when the guide's text no longer matches. It never fills a figure in: the words around a
// number can go wrong with it, so a person rewrites the sentence.
//
// A figure the guide ALREADY states wrongly is listed in `FIGURES_KNOWN_WRONG`, by key and guide
// text, for a person to rule on; the suite stays green on those and fails if one becomes right.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { collectTags } from '../scripts/build-guide.mjs';
import { parsePlan } from '../dist/core/parsePlan.js';
import { project, AGE_PENSION_LINE } from '../dist/core/projection.js';
import { shortfallAge } from '../dist/core/outcomes.js';
import { sustainableSpend } from '../dist/core/sustainableSpend.js';
import { priceLevelFactor } from '../dist/core/priceLevel.js';
import { moneyBasis, moneyLens } from '../dist/app/todaysDollars.js';

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const GUIDE = readFileSync(join(REPO, 'userguide.md'), 'utf8');
const RAW_PLAN = JSON.parse(readFileSync(join(REPO, 'fixtures', 'userguide-pip-jo.plan.json'), 'utf8'));

// { key, guideSays } — a figure the guide states wrongly today, awaiting a ruling. Empty is the goal.
const FIGURES_KNOWN_WRONG = [];

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

// The guide's text as a value: "$801,752" and "15%" and "2038" are numbers, "March 2051" is a month.
const guideValue = (text) => {
  if (/^\$[\d,]+$/.test(text)) return Number(text.slice(1).replace(/,/g, ''));
  if (/^\d+%$/.test(text)) return Number(text.slice(0, -1));
  if (/^\d{4}$/.test(text)) return Number(text);
  const month = /^([A-Z][a-z]+) (\d{4})$/.exec(text);
  if (month && MONTHS.includes(month[1])) return `${month[2]}-${String(MONTHS.indexOf(month[1]) + 1).padStart(2, '0')}`;
  throw new Error(`cannot read a figure out of "${text}"`);
};

const rounded = (actual, rounding) => {
  if (rounding === 'month') return actual;
  const [how, step] = rounding.split('-');
  return (how === 'down' ? Math.floor : Math.round)(actual / Number(step)) * Number(step);
};

// Everything the readers need, each walked once and only when first asked for.
const context = (raw) => {
  const plan = parsePlan(raw);
  const { settings, household, entries } = plan;
  const once = (make) => { let value; return () => (value ??= make()); };
  const entryOf = (type, date) => entries.find((e) => e.type === type && (date === undefined || e.date === date));
  const retireDate = entryOf('RETIRE').date;
  const spendingAfterRetiring = (factor) => entries.map((e) => (e.type === 'SPEND_CHANGE' && e.date >= retireDate
    ? { ...e, params: { ...e.params, annualSpend: Math.round(e.params.annualSpend * factor) } } : e));
  const retiringLater = (list, years) => list.map((e) => (e.type === 'RETIRE'
    ? { ...e, date: `${Number(e.date.slice(0, 4)) + years}${e.date.slice(4)}` } : e));
  return {
    plan, settings, household, entries, entryOf,
    retireMonth: retireDate.slice(0, 7),
    today: moneyBasis('todaysDollars', settings),
    future: moneyBasis('futureDollars', settings),
    months: once(() => project(settings, household, entries)),
    sustainable: once(() => sustainableSpend(settings, household, entries)),
    shortfallWithMoreSpending: once(() => shortfallAge(project(settings, household, spendingAfterRetiring(1.4)), household)),
    shortfallWithMoreSpendingRetiringLater: once(() =>
      shortfallAge(project(settings, household, retiringLater(spendingAfterRetiring(1.4), 1)), household)),
  };
};

const dollars = (cents) => cents / 100;
const monthOf = (c, month) => c.months().find((m) => m.month === month);
const shown = (basis, month, cents) => dollars(moneyLens(basis, month)(cents));
const totalWealth = (m) => m.closingBalance + m.superBalance + m.closingNonSuperPortfolio + (m.radHeld ?? 0) - (m.heasDebt ?? 0);
const agePension = (m) => m.lines.filter((l) => l.description === AGE_PENSION_LINE).reduce((sum, l) => sum + l.amount, 0);
const firstAgePensionMonth = (c) => c.months().find((m) => agePension(m) > 0);
const spendFrom = (c, date) => dollars(c.entryOf('SPEND_CHANGE', date).params.annualSpend);
const person = (c, name) => c.household.persons.find((p) => p.name === name);
const yearsOn = (date, years) => `${Number(date.slice(0, 4)) + years}${date.slice(4, 7)}`;
const birthdayMonth = (p, age) => yearsOn(p.dateOfBirth, age);

// KEY → how to read it off the plan or the projection. One reader per key, used by at least one tag.
const READERS = {
  // Chapter 2 and chapter 83: the facts Pip and Jo's plan starts from.
  'pip-super-today': (c) => dollars(person(c, 'Pip').superInterests[0].balance),
  'jo-super-today': (c) => dollars(person(c, 'Jo').superInterests[0].balance),
  'offset-today': (c) => dollars(c.household.openingOffsetBalance),
  'loan-today': (c) => dollars(c.household.mortgage.openingBalance),
  'repayment-today': (c) => dollars(c.household.mortgage.monthlyRepayment),
  'loan-after-move': (c) => dollars(c.entryOf('MORTGAGE_REFINANCE').params.openingBalance),
  'repayment-after-move': (c) => dollars(c.entryOf('MORTGAGE_REFINANCE').params.monthlyRepayment),
  'pip-pay-a-fortnight': (c) => dollars(person(c, 'Pip').employmentIncomePerFortnight),
  'jo-pay-a-fortnight': (c) => dollars(person(c, 'Jo').employmentIncomePerFortnight),
  'pip-pay-a-year': (c) => dollars(person(c, 'Pip').employmentIncomePerFortnight * 26),
  'jo-pay-a-year': (c) => dollars(person(c, 'Jo').employmentIncomePerFortnight * 26),
  'pip-administration-fee': (c) => dollars(person(c, 'Pip').superInterests[0].statedAdministrationFeePerYear),
  'jo-administration-fee': (c) => dollars(person(c, 'Jo').superInterests[0].statedAdministrationFeePerYear),
  'pip-investment-fee-a-year': (c) => dollars(person(c, 'Pip').superInterests[0].balance * person(c, 'Pip').superInterests[0].statedInvestmentFeeRate),
  'jo-investment-fee-a-year': (c) => dollars(person(c, 'Jo').superInterests[0].balance * person(c, 'Jo').superInterests[0].statedInvestmentFeeRate),
  // The spending levels, by the date each one starts.
  'spend-from-now': (c) => spendFrom(c, c.settings.asAtDate),
  'spend-from-67': (c) => spendFrom(c, '2038-07-01'),
  'spend-from-70': (c) => spendFrom(c, '2041-07-01'),
  'spend-from-75': (c) => spendFrom(c, '2046-07-01'),
  'spend-from-80': (c) => spendFrom(c, '2051-07-01'),
  'spend-from-85': (c) => spendFrom(c, '2056-07-01'),
  // Chapter 5: today's spending, and $100, carried forward by the plan's own CPI guess.
  'spend-from-now-in-2056': (c) => spendFrom(c, c.settings.asAtDate) * priceLevelFactor(c.settings.economicSeries.cpi, c.settings.asAtDate, `2056${c.settings.asAtDate.slice(4, 7)}`),
  'hundred-dollars-in-ten-years': (c) => 100 * priceLevelFactor(c.settings.economicSeries.cpi, c.settings.asAtDate, yearsOn(c.settings.asAtDate, 10)),
  // Chapter 21: the whole walk, and the what-ifs that make and move a shortfall.
  'last-month': (c) => c.months().at(-1).month,
  'last-year': (c) => Number(c.months().at(-1).month.slice(0, 4)),
  'shortfall-spending-40-percent-more': (c) => c.shortfallWithMoreSpending().firstShortfall?.month ?? 'never',
  'shortfall-spending-40-percent-more-retire-2035': (c) => c.shortfallWithMoreSpendingRetiringLater().firstShortfall?.month ?? 'never',
  // Chapter 22: "Work out what I could spend".
  'sustainable-spend': (c) => shown(c.today, c.sustainable().atMonth, c.sustainable().sustainableAnnualSpend),
  'sustainable-spend-rise-percent': (c) => (c.sustainable().factor - 1) * 100,
  'sustainable-spend-first-short-month': (c) => c.sustainable().bindsAt ?? 'never',
  // Chapters 48 and 49: the Age Pension, in today's money.
  'age-pension-first-month': (c) => firstAgePensionMonth(c).month,
  'age-pension-first-year': (c) => Number(firstAgePensionMonth(c).month.slice(0, 4)),
  'age-pension-first-month-today': (c) => { const m = firstAgePensionMonth(c); return shown(c.today, m.month, agePension(m)); },
  'age-pension-both-eligible-today': (c) => {
    const month = [...c.household.persons].map((p) => birthdayMonth(p, 67)).sort().at(-1);
    return shown(c.today, month, agePension(monthOf(c, month)));
  },
  // Chapters 60 and 61: the Before retirement sentence, in both views, in the month they retire.
  'retire-super-today': (c) => shown(c.today, c.retireMonth, monthOf(c, c.retireMonth).superBalance),
  'retire-total-today': (c) => shown(c.today, c.retireMonth, totalWealth(monthOf(c, c.retireMonth))),
  'retire-super-future': (c) => shown(c.future, c.retireMonth, monthOf(c, c.retireMonth).superBalance),
  'retire-total-future': (c) => shown(c.future, c.retireMonth, totalWealth(monthOf(c, c.retireMonth))),
  'retire-total-drop-between-views': (c) => READERS['retire-total-future'](c) - READERS['retire-total-today'](c),
};

const FIGURES = collectTags(GUIDE).tags.filter((t) => t.kind === 'fig');

// Every tag whose guide text is not what the plan gives, rounded the tag's way.
const mismatches = (figures, c) => figures.flatMap((tag) => {
  const actual = rounded(READERS[tag.key](c), tag.rounding);
  return actual === guideValue(tag.text) ? [] : [{ key: tag.key, line: tag.line, guideSays: tag.text, appSays: actual }];
});

const BASE = context(RAW_PLAN);
const isKnown = (m) => FIGURES_KNOWN_WRONG.some((k) => k.key === m.key && k.guideSays === m.guideSays);

// Kills: a tag naming a key with no reader (it would throw, or be skipped), a reader nothing uses,
// and a figure the parser cannot read.
test('every tagged key has a reader, every reader is used, and every figure reads', () => {
  assert.ok(FIGURES.length >= 70, `${FIGURES.length} figure tags`);
  assert.deepEqual(FIGURES.filter((t) => !(t.key in READERS)).map((t) => `${t.line}: ${t.key}`), []);
  assert.deepEqual(Object.keys(READERS).filter((k) => !FIGURES.some((t) => t.key === k)), []);
  for (const t of FIGURES) assert.equal(typeof guideValue(t.text), t.rounding === 'month' ? 'string' : 'number', `line ${t.line}`);
});

// Kills: a stale figure anywhere in the guide — every tagged figure against the engine's own result.
test('every tagged Pip-and-Jo figure matches the plan run through the engine', () => {
  // The readers walk `plan.entries`, which is what the app walks only while Baseline lists them all.
  assert.deepEqual([...BASE.plan.scenarios[0].entryIds].sort(), BASE.entries.map((e) => e.id).sort());
  const found = mismatches(FIGURES, BASE);
  assert.deepEqual(found.filter((m) => !isKnown(m)), []);
  assert.deepEqual(FIGURES_KNOWN_WRONG.filter((k) => !found.some((m) => m.key === k.key && m.guideSays === k.guideSays)), [],
    'a known-wrong figure now matches: take it off FIGURES_KNOWN_WRONG');
});

// Kills: the comparison ignoring the guide's text (a figure typed one dollar off still passing).
test('a guide figure changed by one dollar fails, and names its line', () => {
  const tag = FIGURES.find((t) => t.key === 'retire-total-future');
  const mutated = mismatches([{ ...tag, text: '$1,097,432' }], BASE);
  assert.deepEqual(mutated, [{ key: 'retire-total-future', line: tag.line, guideSays: '$1,097,432', appSays: 1_097_431 }]);
});

// Kills: the readers returning constants, or reading the guide rather than the engine — a plan
// that grows faster must move every retirement figure, and the tags must then fail.
test('an engine result that moves fails its tags', () => {
  const faster = context({ ...RAW_PLAN, settings: { ...RAW_PLAN.settings, nominalReturn: 0.07 } });
  const keys = new Set(mismatches(FIGURES, faster).map((m) => m.key));
  for (const key of ['retire-super-today', 'retire-total-today', 'retire-super-future', 'retire-total-future', 'sustainable-spend']) {
    assert.ok(keys.has(key), `${key} did not move`);
  }
  const sooner = context({ ...RAW_PLAN, household: { ...RAW_PLAN.household, persons: RAW_PLAN.household.persons.map((p) =>
    (p.name === 'Pip' ? { ...p, dateOfBirth: '1972-01-01' } : p)) } });
  assert.ok(mismatches(FIGURES, sooner).some((m) => m.key === 'age-pension-first-month'));
});

// Kills: the rounding on a tag being ignored (exact match everywhere) or applied the wrong way.
test('the tag carries the rounding the sentence uses', () => {
  const tag = { key: 'spend-from-now-in-2056', line: 0, text: '$147,000' };
  assert.equal(READERS[tag.key](BASE) === 147_000, false);
  assert.deepEqual(mismatches([{ ...tag, rounding: 'nearest-1000' }], BASE), []);
  assert.equal(mismatches([{ ...tag, rounding: 'nearest-1' }], BASE).length, 1);
  const drop = { key: 'retire-total-drop-between-views', line: 0, text: '$150,000' };
  assert.deepEqual(mismatches([{ ...drop, rounding: 'down-50000' }], BASE), []);
  assert.equal(mismatches([{ ...drop, rounding: 'nearest-50000' }], BASE).length, 1);
});
