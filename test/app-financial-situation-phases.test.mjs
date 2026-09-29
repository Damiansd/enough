// P16-2 — one headline sentence per phase in Financial Situation. `financialSituationPhases.ts`
// decides every word; this suite is about which sentences appear, what they say, and which basis
// they say it in. `main.ts` only paints them (untested here, on this repo's DOM-writer-as-source
// rule).
import test from 'node:test';
import assert from 'node:assert/strict';

import { toCents } from '../dist/core/money.js';
import { project, AGED_CARE_BASIC_FEE_LINE, AGED_CARE_DAP_LINE, AGED_CARE_HOTELLING_LINE, AGED_CARE_NCCC_LINE } from '../dist/core/projection.js';
import { moneyBasis, moneyLens } from '../dist/app/todaysDollars.js';
import { financialSituationPhases } from '../dist/app/financialSituationPhases.js';

const C = (n) => toCents(n);

const person = (over) => ({
  name: 'X',
  dateOfBirth: '1968-01-01',
  superInterests: [],
  parcels: [],
  employmentIncomePerFortnight: C(0),
  workBonusBalance: C(0),
  ...over,
});

const SETTINGS = (over = {}) => ({
  asAtDate: '2026-01-01',
  planningHorizonAge: 90,
  economicSeries: { cpi: 0.05, pblci: 0.05, awote: 0, mtawe: 0.035 },
  deemingRates: { lower: 0.0175, upper: 0.0375 },
  nominalReturn: 0.065,
  cashInterestRate: 0,
  ...over,
});

const entry = (id, type, date, params = {}, owner = 'household') => ({
  id,
  date,
  owner,
  type,
  params,
  enabled: true,
  createdAt: '2025-01-01',
});

const spend = (annual) => entry('sc', 'SPEND_CHANGE', '2026-01-01', { annualSpend: C(annual) });

const COUPLE = {
  persons: [
    person({ name: 'Ann', dateOfBirth: '1963-01-01', superInterests: [{ phase: 'accumulation', balance: C(500_000) }] }),
    person({ name: 'Bo', dateOfBirth: '1965-01-01', superInterests: [{ phase: 'accumulation', balance: C(300_000) }] }),
  ],
  homeStatus: 'occupied',
};

const TODAY = (settings) => moneyBasis('todaysDollars', settings);
const FUTURE = (settings) => moneyBasis('futureDollars', settings);

// --- 1. NO PHASE OCCURS AT ALL: nobody retires, no ENTER_CARE — no sentences whatsoever ------------

test('nobody retires and no ENTER_CARE exists: not one phase sentence is produced', () => {
  const settings = SETTINGS();
  const entries = [spend(120_000)];
  const months = project(settings, COUPLE, entries);
  const sentences = financialSituationPhases(months, COUPLE, entries, TODAY(settings), undefined);
  assert.deepEqual(sentences, []);
});

// --- 2. NO CARE SENTENCE WITHOUT AN ENTER_CARE ------------------------------------------------------

test('no ENTER_CARE anywhere: there is no aged-care sentence, even though the household retires', () => {
  const settings = SETTINGS();
  const entries = [spend(120_000), entry('r1', 'RETIRE', '2028-01-01', {}, 'personA'), entry('r2', 'RETIRE', '2028-01-01', {}, 'personB')];
  const months = project(settings, COUPLE, entries);
  const sentences = financialSituationPhases(months, COUPLE, entries, TODAY(settings), undefined);
  assert.ok(sentences.every((sentence) => sentence.phase !== 'care'));
  assert.deepEqual(
    sentences.map((sentence) => sentence.phase),
    ['working', 'retired'],
  );
  // MUTATION — not vacuous: a plan that wrongly showed a care sentence with no ENTER_CARE must turn
  // this check red. Proven by injecting exactly that wrong output and confirming the assertion fails.
  const wronglyShowsCare = [...sentences, { phase: 'care', label: 'Aged care (X from 80)', headline: 'About $1 a year in care costs; the $1 room deposit is refunded to the estate.', detail: undefined }];
  assert.throws(() => assert.ok(wronglyShowsCare.every((sentence) => sentence.phase !== 'care')));
});

// --- 3. BEFORE RETIREMENT: the household retires together — "the household retires" -----------------

test('before retirement: both retire the same month — the sentence says "the household retires"', () => {
  const settings = SETTINGS();
  const entries = [spend(120_000), entry('r1', 'RETIRE', '2028-01-01', {}, 'personA'), entry('r2', 'RETIRE', '2028-01-01', {}, 'personB')];
  const months = project(settings, COUPLE, entries);
  const sentences = financialSituationPhases(months, COUPLE, entries, TODAY(settings), undefined);
  const before = sentences.find((sentence) => sentence.phase === 'working');
  assert.ok(before, 'a "before retirement" sentence must exist when somebody retires');
  assert.match(before.headline, /^At 65 you.ll have \$[\d,]+ in super and \$[\d,]+ in total\.$/);
  assert.match(before.detail, /the household retires/);
  assert.doesNotMatch(before.detail, /Ann retires|Bo retires/);
});

test('before retirement: a couple retiring apart — the sentence names whoever retires FIRST', () => {
  const settings = SETTINGS();
  const entries = [spend(120_000), entry('r1', 'RETIRE', '2028-01-01', {}, 'personA'), entry('r2', 'RETIRE', '2031-06-01', {}, 'personB')];
  const months = project(settings, COUPLE, entries);
  const sentences = financialSituationPhases(months, COUPLE, entries, TODAY(settings), undefined);
  const before = sentences.find((sentence) => sentence.phase === 'working');
  assert.match(before.detail, /Ann turns 65 and Ann retires/);
  assert.doesNotMatch(before.detail, /Bo retires/);
});

// --- 4. RETIREMENT: the search hasn't run yet — a prompt, never a blank -----------------------------

test('retirement: the search has not been run — no figure is printed, and the sentence still names the Age Pension', () => {
  const settings = SETTINGS();
  const entries = [spend(120_000), entry('r1', 'RETIRE', '2028-01-01', {}, 'personA'), entry('r2', 'RETIRE', '2028-01-01', {}, 'personB')];
  const months = project(settings, COUPLE, entries);
  const sentences = financialSituationPhases(months, COUPLE, entries, TODAY(settings), undefined);
  const retired = sentences.find((sentence) => sentence.phase === 'retired');
  assert.ok(retired);
  // P17-6: the button sits right under the sentence, so the sentence no longer repeats its name.
  assert.match(retired.headline, /^The Age Pension starts in \d{4}\.$/);
  assert.doesNotMatch(retired.headline, /\$/, 'no figure exists yet, and none must be printed');
});

// --- 5. RETIREMENT: the search refused — its own reason is shown, verbatim -------------------------

test('retirement: the search refused — the reason is shown, and no figure is invented', () => {
  const settings = SETTINGS();
  const entries = [spend(120_000), entry('r1', 'RETIRE', '2028-01-01', {}, 'personA'), entry('r2', 'RETIRE', '2028-01-01', {}, 'personB')];
  const months = project(settings, COUPLE, entries);
  const refused = {
    kind: 'candidateRefused',
    factor: undefined,
    statedAnnualSpend: undefined,
    sustainableAnnualSpend: undefined,
    atMonth: undefined,
    bindsAt: undefined,
    limitedBy: undefined,
    floorApplied: false,
    reason: 'the Waterfall could fund only 962984 of the 78782755 cents this month asked for',
    walks: 3,
  };
  const sentences = financialSituationPhases(months, COUPLE, entries, TODAY(settings), refused);
  const retired = sentences.find((sentence) => sentence.phase === 'retired');
  assert.equal(retired.headline, refused.reason);
});

// --- 6. RETIREMENT: a real search answer — the figure and the Age Pension year -----------------------

test('retirement: a funded search answer — the figure and the Age Pension start year both appear', () => {
  const settings = SETTINGS();
  const entries = [spend(60_000), entry('r1', 'RETIRE', '2028-01-01', {}, 'personA'), entry('r2', 'RETIRE', '2028-01-01', {}, 'personB')];
  const months = project(settings, COUPLE, entries);
  const result = {
    kind: 'headroom',
    factor: 1.2,
    statedAnnualSpend: C(60_000),
    sustainableAnnualSpend: C(72_000),
    atMonth: '2026-01',
    bindsAt: undefined,
    limitedBy: undefined,
    floorApplied: false,
    reason: undefined,
    walks: 5,
  };
  const sentences = financialSituationPhases(months, COUPLE, entries, TODAY(settings), result);
  const retired = sentences.find((sentence) => sentence.phase === 'retired');
  assert.match(retired.headline, /^You can spend about \$72,000 a year, and the Age Pension starts in \d{4}\.$/);
});

// --- 7. AGED CARE: the figures, and the mutation this test must catch -------------------------------

test('aged care: the label names who and from when, and W is exactly the four cost lines summed over the first 12 months', () => {
  const settings = SETTINGS();
  const entries = [
    spend(60_000),
    entry('r1', 'RETIRE', '2028-01-01', {}, 'personA'),
    entry('r2', 'RETIRE', '2028-01-01', {}, 'personB'),
    entry('ec', 'ENTER_CARE', '2030-03-01', { homeValue: C(900_000), radPrice: C(300_000), radPaidAsLumpSum: C(300_000) }, 'personA'),
  ];
  const months = project(settings, COUPLE, entries);
  const basis = TODAY(settings);
  const sentences = financialSituationPhases(months, COUPLE, entries, basis, undefined);
  const care = sentences.find((sentence) => sentence.phase === 'care');
  assert.ok(care, 'an ENTER_CARE exists, so the aged-care sentence must appear');
  assert.match(care.label, /^Aged care \(Ann from \d+\)$/);

  // The independent check: sum the four cost lines by hand, EXACT-MATCH only, over the 12 months
  // from the entry's own governing month — never a `startsWith`/prefix reading.
  const startIndex = months.findIndex((month) => month.month === '2030-03');
  assert.ok(startIndex > 0);
  const COST_LINES = new Set([AGED_CARE_BASIC_FEE_LINE, AGED_CARE_HOTELLING_LINE, AGED_CARE_NCCC_LINE, AGED_CARE_DAP_LINE]);
  let expectedCents = 0;
  for (let index = startIndex; index <= Math.min(startIndex + 11, months.length - 1); index += 1) {
    const month = months[index];
    const lens = moneyLens(basis, month.month);
    for (const line of month.lines) {
      if (COST_LINES.has(line.description)) expectedCents += lens(line.amount);
    }
  }
  const expectedCostDollars = `$${Math.round(expectedCents / 100).toLocaleString('en-US')}`;
  const expectedRadCents = moneyLens(basis, '2030-03')(C(300_000));
  const expectedRadDollars = `$${Math.round(expectedRadCents / 100).toLocaleString('en-US')}`;
  assert.equal(care.headline, `About ${expectedCostDollars} a year in care costs; the ${expectedRadDollars} room deposit is refunded to the estate.`);
});

// --- 8. THE SENTENCES USE THE BASIS LENS ------------------------------------------------------------

test('every dollar figure moves with the money-view toggle: today\'s dollars and future dollars disagree', () => {
  const settings = SETTINGS();
  const entries = [
    spend(60_000),
    entry('r1', 'RETIRE', '2032-01-01', {}, 'personA'),
    entry('r2', 'RETIRE', '2032-01-01', {}, 'personB'),
    entry('ec', 'ENTER_CARE', '2034-03-01', { homeValue: C(900_000), radPrice: C(300_000), radPaidAsLumpSum: C(300_000) }, 'personA'),
  ];
  const months = project(settings, COUPLE, entries);
  const today = financialSituationPhases(months, COUPLE, entries, TODAY(settings), undefined);
  const future = financialSituationPhases(months, COUPLE, entries, FUTURE(settings), undefined);

  const beforeToday = today.find((sentence) => sentence.phase === 'working');
  const beforeFuture = future.find((sentence) => sentence.phase === 'working');
  assert.notEqual(beforeToday.headline, beforeFuture.headline, 'the super/total figures must differ between the two views');

  const careToday = today.find((sentence) => sentence.phase === 'care');
  const careFuture = future.find((sentence) => sentence.phase === 'care');
  assert.notEqual(careToday.headline, careFuture.headline, 'the care-cost and RAD figures must differ between the two views');
  // The future-dollars figure, years out under 5% CPI, must be the LARGER of the two (today's money
  // scales a future amount down, never up).
  const dollarsIn = (text) => Number(text.match(/\$([\d,]+)/)[1].replace(/,/g, ''));
  assert.ok(dollarsIn(careFuture.headline) > dollarsIn(careToday.headline));
});
