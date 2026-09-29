// P3-16a microtask 4 — **`mortgageTargetHeadlines`**, the plain-English sentence stating whether a
// `MORTGAGE_TARGET` entry's date and each Person's own retirement date meet.
//
// Mirrors `mortgageHeadline.ts`'s own shape (a lead plus a per-Person list) but is NOT a verdict on
// the loan — `mortgageTargets` never reads `Month.mortgageBalance`, so there is no "good"/"bad"
// framing to assert here, only which side of the target each Person's retirement falls on.
import test from 'node:test';
import assert from 'node:assert/strict';

import { toCents } from '../dist/core/money.js';
import { project } from '../dist/core/projection.js';
import { formatDollars } from '../dist/app/displayMoney.js';
import { mortgageTargetHeadlines } from '../dist/app/mortgageHeadline.js';
import { moneyBasis } from '../dist/app/todaysDollars.js';

const person = (name, dateOfBirth) => ({
  name,
  dateOfBirth,
  superInterests: [],
  parcels: [],
  employmentIncomePerFortnight: toCents(0),
  workBonusBalance: toCents(0),
});

const SETTINGS = {
  asAtDate: '2026-09-16',
  planningHorizonAge: 72,
  economicSeries: { cpi: 0.025, pblci: 0.025, awote: 0.035, mtawe: 0.035 },
  deemingRates: { lower: 0.0175, upper: 0.0375 },
  nominalReturn: 0.065,
};

const HOUSEHOLD = Object.freeze({ persons: [person('Val', '1955-04-17')], homeStatus: 'occupied' });
const COUPLE = Object.freeze({
  persons: [person('Val', '1955-04-17'), person('Bea', '1954-08-09')],
  homeStatus: 'occupied',
});

const FUTURE = moneyBasis('futureDollars', SETTINGS);

const entry = (id, type, date, params, owner = 'household') => ({
  id,
  date,
  owner,
  type,
  params,
  enabled: true,
  createdAt: '2026-06-01',
});
const spend = (annual) => entry('sc', 'SPEND_CHANGE', '2026-09-01', { annualSpend: toCents(annual) });
const retire = (id, date, owner = 'personA') => entry(id, 'RETIRE', date, {}, owner);
const target = (id, date) => entry(id, 'MORTGAGE_TARGET', date, {});

const answer = (household, entries) => {
  const all = [spend(60_000), ...entries];
  return mortgageTargetHeadlines(project(SETTINGS, household, all), household, all, FUTURE);
};

test('a target AFTER the Person retires reports "before" — the Person retires before it', () => {
  const entries = [retire('r1', '2026-11-01'), target('t1', '2027-01-15')];
  const [headline] = answer(HOUSEHOLD, entries);
  assert.equal(headline.entryId, 't1');
  assert.match(headline.headline, /2027-01/);
  assert.equal(headline.perPerson.length, 1);
  assert.equal(headline.perPerson[0].name, 'Val');
  assert.equal(headline.perPerson[0].sentence, "Val's plan currently has them retiring before that.");
});

test('a target BEFORE the Person retires reports "after" — the Person retires after it', () => {
  const entries = [retire('r1', '2027-02-01'), target('t1', '2026-10-01')];
  const [headline] = answer(HOUSEHOLD, entries);
  assert.equal(headline.perPerson[0].sentence, "Val's plan currently has them retiring after that.");
});

test('a Person with no RETIRE entry gets the "nothing to compare" sentence, not a crash', () => {
  const entries = [target('t1', '2027-01-15')];
  const [headline] = answer(HOUSEHOLD, entries);
  assert.equal(headline.perPerson[0].sentence, 'Val has no retirement date in this plan, so there is nothing to compare this target with.');
});

test('a couple can disagree — one before, one after, in the SAME headline block', () => {
  const entries = [retire('r1', '2026-10-01', 'personA'), retire('r2', '2027-03-01', 'personB'), target('t1', '2027-01-01')];
  const [headline] = answer(COUPLE, entries);
  assert.equal(headline.perPerson.length, 2);
  assert.equal(headline.perPerson[0].name, 'Val');
  assert.equal(headline.perPerson[0].sentence, "Val's plan currently has them retiring before that.");
  assert.equal(headline.perPerson[1].name, 'Bea');
  assert.equal(headline.perPerson[1].sentence, "Bea's plan currently has them retiring after that.");
});

test('two MORTGAGE_TARGET entries produce two headline blocks, each keeping its own entryId', () => {
  const entries = [retire('r1', '2026-12-01'), target('early', '2026-10-01'), target('late', '2027-03-01')];
  const headlines = answer(HOUSEHOLD, entries);
  assert.equal(headlines.length, 2);
  assert.equal(headlines[0].entryId, 'early');
  assert.equal(headlines[1].entryId, 'late');
  assert.equal(headlines[0].perPerson[0].sentence, "Val's plan currently has them retiring after that.");
  assert.equal(headlines[1].perPerson[0].sentence, "Val's plan currently has them retiring before that.");
});

test('no MORTGAGE_TARGET entries at all answers an empty list', () => {
  const entries = [retire('r1', '2026-12-01')];
  assert.deepEqual(answer(HOUSEHOLD, entries), []);
});

test('the headline states the date PLAINLY and never a verdict, and NO sentence names an item ID or register tag', () => {
  const entries = [retire('r1', '2026-11-01'), target('t1', '2027-01-15')];
  const [headline] = answer(HOUSEHOLD, entries);
  const all = [headline.headline, ...headline.perPerson.map((p) => p.sentence)];
  for (const text of all) {
    assert.doesNotMatch(text, /\bt1\b/, 'the entry id leaked into the sentence');
    assert.doesNotMatch(text, /P3-16|MORTGAGE_TARGET|register|O\d\d/, 'an item id or register tag leaked into the sentence');
    assert.doesNotMatch(text, /good|bad|on track|behind|ahead/i, 'a verdict word appeared where only a fact should');
  }
});

// ── 2026-09-23: a target date moves no money, and the page now says so when the loan is still owing.
// The user set a target beside a lump sum from super and the forecast carried the loan on for years.
const LOAN = Object.freeze({ openingBalance: toCents(500_000), annualInterestRate: 0.06, monthlyRepayment: toCents(3_000) });
const WITH_LOAN = Object.freeze({ ...HOUSEHOLD, mortgage: LOAN });

test('a target with the loan still owing at month end says so, with the amount the walk carries', () => {
  const all = [spend(60_000), target('t1', '2027-01-15')];
  const months = project(SETTINGS, WITH_LOAN, all);
  const owing = months.find((m) => m.month === '2027-01').mortgageBalance;
  assert.ok(owing > 0);
  const [only] = mortgageTargetHeadlines(months, WITH_LOAN, all, FUTURE);
  assert.ok(only.stillOwing !== null);
  assert.ok(only.stillOwing.includes(formatDollars(owing)), only.stillOwing);
  assert.ok(only.stillOwing.includes('Home loan — pay off in full'));
});

test('a payoff in the target month clears the warning — the loan is nil at month end', () => {
  const [only] = answer(WITH_LOAN, [target('t1', '2027-01-15'), entry('p1', 'MORTGAGE_PAYOFF', '2027-01-15', {})]);
  assert.equal(only.stillOwing, null);
});

test('no loan in force, and a target dated before the walk, carry no warning', () => {
  assert.equal(answer(HOUSEHOLD, [target('t1', '2027-01-15')])[0].stillOwing, null);
  assert.equal(answer(WITH_LOAN, [target('t1', '2026-01-15')])[0].stillOwing, null);
});
