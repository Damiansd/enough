// P3-16 slice 3 (the screen half) — **the sentence that answers "am I clear before I retire?", and
// the third chart marker.**
//
// The engine halves (`mortgagePayoff`, `retirementMonths`) are `core-mortgage-payoff.test.mjs`.
// This suite is about what a reader is told: the words, the amounts in them, the money view they
// are stated in, the marker on the chart, and the one plan that must be told nothing at all.
//
// **The DOM writer is pinned as SOURCE**, on this repo's standing rule: there is no DOM under
// `node:test` and `typescript` is the one dev dependency (TODO.md P2-9a).
//
// ⚠️ **THE TEXT PINS ARE NOT VACUOUS, and §6c proves it.** A pin of the form
// `assert.ok(text.includes(SOME_CONSTANT))` compares a value with itself and stays green when the
// constant is emptied. Every assertion on prose here is a LENGTH FLOOR plus plain-word subjects,
// and §6c re-runs every one of them against an emptied string and requires each to throw.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { toCents } from '../dist/core/money.js';
import { project } from '../dist/core/projection.js';
import { mortgageHeadline, gapInWords } from '../dist/app/mortgageHeadline.js';
import { MARKER_LABELS, monthsToSeries } from '../dist/app/monthsToSeries.js';
import { markerCaption } from '../dist/app/chartConfig.js';
import { moneyBasis } from '../dist/app/todaysDollars.js';
import { statedContingencyFloor } from '../dist/core/outcomes.js';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = (...parts) => readFileSync(join(ROOT, 'src', ...parts), 'utf8');

/** Comments out, string literals blanked — so prose cannot satisfy a source assertion. */
const executableCode = (text) =>
  text
    .replaceAll(/\/\*[\s\S]*?\*\//g, '')
    .replaceAll(/`(?:[^`\\]|\\.)*`|'(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*"|\/\/.*$/gm, (match) =>
      match.startsWith('//') ? '' : '""',
    );

const MAIN = executableCode(read('app', 'main.ts'));
const SERIES_CODE = executableCode(read('app', 'monthsToSeries.ts'));
const HTML = readFileSync(join(ROOT, 'public', 'index.html'), 'utf8');

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

/**
 * A floor for the chart series these tests build. Nothing here is about the floor — it is handed
 * over because `monthsToSeries` takes one — but it goes through `statedContingencyFloor` like a
 * page's would, rather than as a bare figure the function no longer accepts (P4-14).
 */
const FLOOR = statedContingencyFloor({ ...SETTINGS, contingencyFloor: toCents(700_000) });

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
const refi = (id, date, balance, rate, repayment) =>
  entry(id, 'MORTGAGE_REFINANCE', date, {
    openingBalance: toCents(balance),
    annualInterestRate: rate,
    monthlyRepayment: toCents(repayment),
  });
const retire = (id, date, owner) => entry(id, 'RETIRE', date, {}, owner);

const couple = (mortgage) => ({
  persons: [person('Val', '1955-04-17'), person('Bea', '1954-08-09')],
  homeStatus: 'occupied',
  ...(mortgage === undefined ? {} : { mortgage }),
});

/** $10,000 at no interest, $3,000 a month: 7,000 / 4,000 / 1,000 / 0 and nothing after. */
const PAID_OFF = Object.freeze({ openingBalance: toCents(10_000), annualInterestRate: 0, monthlyRepayment: toCents(3_000) });
/** $100,000 at the same repayment: still $76,000 owing when the eight-month walk ends. */
const OUTLIVES = Object.freeze({ openingBalance: toCents(100_000), annualInterestRate: 0, monthlyRepayment: toCents(3_000) });

const TODAY = moneyBasis('todaysDollars', SETTINGS);
const FUTURE = moneyBasis('futureDollars', SETTINGS);

const answer = (mortgage, entries, basis = TODAY) => {
  const all = [spend(120_000), ...entries];
  const household = couple(mortgage);
  return mortgageHeadline(project(SETTINGS, household, all), household, all, basis);
};

/** Every sentence the page would show, in the order it would show them. */
const allText = (headline) => [headline.headline, ...headline.perPerson, ...(headline.tail === undefined ? [] : [headline.tail])];

/**
 * **A pin on an EXPLANATION, not on its wording** — `app-mortgage-form.test.mjs`'s helper, copied
 * rather than imported because a test importing another test's internals is a link nothing enforces.
 * Every group must match and any alternative within a group satisfies it, so the sentence can be
 * reworded in plainer English without this moving; emptying it fails the floor and every subject at
 * once, which §6c proves by doing it.
 */
const explains = (what, text, subjects, minimum = 60) => {
  assert.equal(typeof text, 'string', `${what} is not a string at all`);
  assert.ok(
    text.trim().length >= minimum,
    `${what} is ${text.trim().length} characters — too short to be the explanation it stands in for`,
  );
  for (const [subject, ...groups] of subjects) {
    for (const alternatives of groups) {
      assert.ok(
        alternatives.some((pattern) => pattern.test(text)),
        `${what} no longer explains ${subject} — nothing in it matches ${alternatives.join(' or ')}`,
      );
    }
  }
};

// --- 1. NO LOAN — nothing is said, and nothing is drawn ------------------------------------------

test('A PLAN WITH NO HOME LOAN GETS NO SENTENCE, NO MARKER AND NO MENTION — byte-identical', () => {
  const entries = [spend(120_000), retire('r1', '2026-11-01', 'personA')];
  const household = couple();
  const months = project(SETTINGS, household, entries);

  assert.equal(mortgageHeadline(months, household, entries, TODAY), undefined, 'a sentence was written about a loan that does not exist');

  const series = monthsToSeries(months, household, FLOOR, undefined);
  assert.deepEqual(series.markers.filter((marker) => marker.key === 'mortgagePayoff'), [], 'a payoff marker with no payoff');
  // The `core-mortgage.test.mjs` §6 proof, applied to the chart's data: the word does not occur in
  // the series AT ALL, so this is absence and not a zero that happens to read as absence.
  assert.equal(JSON.stringify(series).toLowerCase().includes('mortgage'), false);
  assert.equal(JSON.stringify(series).toLowerCase().includes('loan'), false);
  // And the notes are untouched: the home loan adds none, ever. See `monthsToSeries.ts`'s header.
  assert.deepEqual([...series.notes].filter((note) => /loan|mortgage/i.test(note)), []);
});

test('the SAME walk with a loan says all three things — so §1 is absence and not a broken call', () => {
  const entries = [spend(120_000), retire('r1', '2026-11-01', 'personA')];
  const household = couple(PAID_OFF);
  const months = project(SETTINGS, household, entries);
  assert.notEqual(mortgageHeadline(months, household, entries, TODAY), undefined);
  const series = monthsToSeries(months, household, FLOOR, undefined);
  assert.equal(series.markers.filter((marker) => marker.key === 'mortgagePayoff').length, 1);
  assert.equal(JSON.stringify(series).toLowerCase().includes('loan'), true);
});

// --- 2. THE FOUR ANSWERS ------------------------------------------------------------------------

test('(2) CLEAR BEFORE RETIREMENT — the gap is said in plain words, once for a couple retiring together', () => {
  const found = answer(PAID_OFF, [retire('r', '2027-03-01', 'household')]);
  assert.equal(found.kind, 'clear');
  assert.equal(found.tail, undefined, 'nothing is owed at the end, so there is nothing to add');
  // P17-6: both retire in the same month, so one sentence names both — and drops neither.
  assert.equal(found.perPerson.length, 1);
  explains('the couple’s sentence', found.perPerson[0], [
    ['who and when', [/^Val and Bea retire in 2027-03/]],
    ['their ages', [/aged 7\d and 7\d/]],
    ['that the loan was already clear', [/paid off|clear/]],
    ['when it was paid off', [/2026-12/]],
    ['how long before', [/3 months earlier/]],
  ]);
  explains('the CLEAR headline', found.headline, [
    ['the loan', [/home loan/i]],
    ['that it is paid off', [/paid off|clear/i]],
    ['that this is before retirement', [/before you retire/i]],
  ]);
});

test('(3) STILL OWING AT RETIREMENT — the AMOUNT is in that Person’s own sentence, unmissable', () => {
  // Val retires in 2026-11, when $1,000.00 is owed. Bea retires in 2027-01, when nothing is.
  const found = answer(PAID_OFF, [retire('r1', '2026-11-01', 'personA'), retire('r2', '2027-01-01', 'personB')]);
  assert.equal(found.kind, 'stillOwing');
  explains('the STILL OWING headline', found.headline, [
    ['the loan', [/home loan/i]],
    ['that it is NOT clear', [/not paid off|still owed|still owing/i]],
    ['that this is about retirement', [/before you retire|when you retire/i]],
  ], 1); // P17-6: short by ruling — the amount is in each Person's own sentence below.
  explains("Val's sentence", found.perPerson[0], [
    ['who and when', [/^Val retires in 2026-11/]],
    ['the amount still owing', [/\$996\b/]],
    ['that it is owed on the loan', [/still owing on the home loan/]],
    ['when it is paid off instead', [/not paid off until 2026-12/]],
  ]);
  explains("Bea's sentence", found.perPerson[1], [
    ['who and when', [/^Bea retires in 2027-01/]],
    ['that she is clear', [/already paid off/]],
  ]);
  // ⚠️ NEITHER SPOUSE IS DROPPED AND NEITHER SPEAKS FOR THE OTHER.
  assert.equal(found.perPerson.length, 2);
  assert.equal(found.perPerson[0].includes('Bea'), false);
  assert.equal(found.perPerson[1].includes('Val'), false);
  assert.notEqual(found.perPerson[0], found.perPerson[1]);
  // And the headline carries no figure at all: an amount there would belong to one of the two.
  assert.doesNotMatch(found.headline, /\$/);
});

test('(4) NEVER REPAID — said plainly, with what is still owing and no invented payoff date', () => {
  const found = answer(OUTLIVES, [retire('r1', '2026-11-01', 'personA')]);
  assert.equal(found.kind, 'stillOwing');
  // $100,000 less eight payments of $3,000 is $76,000 nominal in 2027-04, seven months out:
  // $76,000 ÷ 1.025^(7/12) = $74,913.14 in today's money, which is the page's default view, printed
  // to the dollar as $74,913 (the page shows no cents, 2026-09-24).
  explains('the tail', found.tail, [
    ['what is still owing', [/\$74,913\b/]],
    ['where the forecast stops', [/2027-04/, /last month this forecast covers/]],
  ]);
  // Val retires in 2026-11, the third month, when $91,000 is owed: ÷ 1.025^(2/12) = $90,626.26.
  explains("Val's sentence", found.perPerson[0], [
    ['the amount at retirement', [/\$90,626\b/]],
    ['that it is never paid off in the forecast', [/still not paid off by 2027-04/]],
  ]);
  // Bea never retires, and that is SAID rather than left blank — case 8.
  explains("Bea's sentence", found.perPerson[1], [
    ['who', [/^Bea/]],
    ['that there is no date for her', [/no retirement date/]],
  ]);
  // No payoff marker for a payoff that never happens.
  const household = couple(OUTLIVES);
  const entries = [spend(120_000), retire('r1', '2026-11-01', 'personA')];
  const series = monthsToSeries(project(SETTINGS, household, entries), household, FLOOR, undefined);
  assert.deepEqual(series.markers.filter((marker) => marker.key === 'mortgagePayoff'), []);
});

test('(5) NOBODY RETIRES — the payoff is stated ALONE, and the missing comparison is said out loud', () => {
  const found = answer(PAID_OFF, []);
  assert.equal(found.kind, 'paidOffNoRetirement');
  assert.deepEqual([...found.perPerson], [], 'nobody has a sentence, because nobody has a date');
  explains('the NO RETIREMENT headline', found.headline, [
    ['the payoff month', [/2026-12/]],
    ['both ages, neither dropped', [/Val 71/], [/Bea 72/]],
    ['that nobody retires in this plan', [/nobody retires/i]],
    ['that there is therefore nothing to compare', [/compare/i]],
  ]);
  // Nothing is invented in place of the comparison — no "before you retire" claim of any kind.
  assert.doesNotMatch(found.headline, /before you retire/i);
});

test('(5 + 4) NOBODY RETIRES AND THE LOAN OUTLIVES THE FORECAST — the never-repaid reading wins', () => {
  const found = answer(OUTLIVES, []);
  assert.equal(found.kind, 'neverRepaid');
  explains('the NEVER REPAID headline', found.headline, [
    ['the loan', [/home loan/i]],
    ['that it is never paid off here', [/never paid off/i]],
    ['that the forecast is what ends first', [/forecast|last month/i]],
  ]);
  explains('the tail', found.tail, [['what is still owing', [/\$74,913\b/]]]);
  assert.doesNotMatch(found.headline, /202\d-\d\d/, 'a payoff date was invented for a payoff that never happens');
});

test('(6) A LOAN THAT STARTS LATER — a Person who retires first is told there is no loan yet', () => {
  // No household loan; $6,000 from 2026-12, clear in 2027-01. Val retires in 2026-10, before it.
  const found = answer(undefined, [refi('first-home', '2026-12-01', 6_000, 0, 3_000), retire('r1', '2026-10-01', 'personA')]);
  assert.equal(found.kind, 'clear');
  explains("Val's sentence", found.perPerson[0], [
    ['who and when', [/^Val retires in 2026-10/]],
    ['that there is no loan then', [/no home loan yet/]],
    ['when the loan starts', [/does not start until 2026-12/]],
  ]);
  // She is NOT told she is "clear" — that would answer a different question in the flattering
  // direction, and the loan she has not taken out yet runs past her retirement.
  assert.doesNotMatch(found.perPerson[0], /paid off|already clear/);
});

test('(7) PAID OFF, THEN BORROWED AGAIN — the lead is still good news and the tail says the rest', () => {
  // $10,000 clears in 2026-12; a $50,000 loan from 2027-01 is still owing at the horizon. Val
  // retires in 2026-12 — clear on the day — and the page must still say the house is not clear at
  // the end, or a reader takes the lead for the whole answer.
  const found = answer(PAID_OFF, [refi('again', '2027-01-01', 50_000, 0.06, 1_000), retire('r1', '2026-12-01', 'personA')]);
  assert.equal(found.kind, 'clear');
  explains('the tail', found.tail, [
    ['what is still owing at the end', [/\$46,306\b/]],
    ['that this is the end of the forecast', [/last month this forecast covers/]],
  ]);
  // And the chart draws NO payoff marker: there is no month from which nothing is owed again.
  const household = couple(PAID_OFF);
  const entries = [spend(120_000), refi('again', '2027-01-01', 50_000, 0.06, 1_000), retire('r1', '2026-12-01', 'personA')];
  const series = monthsToSeries(project(SETTINGS, household, entries), household, FLOOR, undefined);
  assert.deepEqual(series.markers.filter((marker) => marker.key === 'mortgagePayoff'), []);
});

// --- 3. THE MARKER ------------------------------------------------------------------------------

test('THE MARKER IS AT `clearForGood`, CAPTIONED WITH EVERY PERSON, and points at the month it names', () => {
  const household = couple(PAID_OFF);
  // Paid off 2026-12, borrowed again 2027-01 for $2,000 at $1,000 a month, clear again 2027-02.
  const entries = [spend(120_000), refi('again', '2027-01-01', 2_000, 0, 1_000)];
  const months = project(SETTINGS, household, entries);
  const series = monthsToSeries(months, household, FLOOR, undefined);
  const marker = series.markers.find((each) => each.key === 'mortgagePayoff');
  assert.equal(marker.month, '2027-02', 'the marker is at the FIRST payoff, which a later loan undid');
  assert.equal(months[marker.index].month, marker.month, 'the marker points at a different month than it names');
  assert.equal(months[marker.index].mortgageBalance, 0);
  assert.equal(months[marker.index - 1].mortgageBalance > 0, true, 'the month before the marker owes nothing already');
  assert.equal(marker.label, MARKER_LABELS.mortgagePayoff);
  // ⚠️ EVERY PERSON, exactly as the Shortfall marker reads "Dana 74, Ash 83".
  assert.deepEqual(marker.ages.map((age) => age.name), ['Val', 'Bea']);
  assert.equal(markerCaption(marker), '2027-02 (Val 71, Bea 72)');
});

test('the marker LABEL says what the rule means, and the four markers have four different colours', () => {
  explains('MARKER_LABELS.mortgagePayoff', MARKER_LABELS.mortgagePayoff, [
    ['the loan', [/home loan/i]],
    ['that it is clear', [/clear|paid off/i]],
  ], 30);
  // The RAW source: `executableCode` blanks every string literal, and a colour IS a string literal.
  const colours = /const MARKER_COLOURS[\s\S]*?\n\}\);/.exec(read('app', 'chartConfig.ts'))[0];
  const hexes = [...colours.matchAll(/#[0-9a-f]{6}/g)].map(([hex]) => hex);
  // Six since P7-5 (2026-09-25): the home status change and the exemption ending.
  assert.equal(hexes.length, 6);
  assert.equal(new Set(hexes).size, 6, 'two rules in the same colour read as one fact drawn twice');
});

test('RAW SOURCE — the payoff is called unconditionally and drawn ONLY from `clearForGood`', () => {
  assert.match(SERIES_CODE, /const payoff = mortgagePayoff\(months, household\);/);
  assert.match(SERIES_CODE, /if \(payoff\.clearForGood !== undefined\) \{/);
  // `firstPayoff` is never what the chart draws — see `outcomes.ts`'s ruling.
  assert.doesNotMatch(SERIES_CODE, /markerAt\([^)]*firstPayoff/);
  // And no note is pushed for it: the home loan's absence is explained by the headline, not here.
  assert.doesNotMatch(SERIES_CODE, /notes\.push\([^)]*[Mm]ortgage/);
});

// --- 4. THE MONEY VIEW --------------------------------------------------------------------------

test('EVERY AMOUNT GOES THROUGH THE ROW’S OWN LENS, in a month that is not month 0', () => {
  const entries = [retire('r1', '2026-11-01', 'personA')];
  const today = answer(OUTLIVES, entries, TODAY);
  const future = answer(OUTLIVES, entries, FUTURE);
  // 2026-11 is two months after `asAtDate`, so the factor is 1.025^(2/12) and today's money is
  // SMALLER: $91,000.00 nominal → $90,626.26. Month 0 converts to itself and would prove nothing.
  assert.match(future.perPerson[0], /\$91,000\b/);
  assert.match(today.perPerson[0], /\$90,626\b/);
  assert.notEqual(today.perPerson[0], future.perPerson[0]);
  // And the tail, read in the LAST month — seven months out, so it moves further.
  assert.match(future.tail, /\$76,000\b/);
  assert.match(today.tail, /\$74,913\b/);
  // The direction is the one `moneyLens` documents: a future amount buys less today.
  assert.equal(future.kind, today.kind, 'the money view must not change which answer this is');
});

test('gapInWords says years and months in plain words, and never "0 years"', () => {
  assert.deepEqual([0, 1, 4, 12, 13, 24, 74].map(gapInWords), [
    'the same month', '1 month', '4 months', '1 year', '1 year and 1 month', '2 years', '6 years and 2 months',
  ]);
  assert.equal(gapInWords(-3), 'the same month');
});

// --- 5. THE PAGE ---------------------------------------------------------------------------------

test('SOURCE — the page renders the lead, every Person’s sentence and the tail, and HIDES an empty block', () => {
  assert.match(MAIN, /const answer = mortgageHeadline\(months, shown\.household, activeEntries, moneyBasis\(moneyView, shown\.settings\)\);/);
  // P3-16a — the target sentences are read alongside the payoff answer, from the same entries.
  assert.match(MAIN, /const targets = mortgageTargetHeadlines\(months, shown\.household, activeEntries, moneyBasis\(moneyView, shown\.settings\)\);/);
  // The still-owing warning reaches the page when there is one (2026-09-23).
  assert.match(MAIN, /if \(target\.stillOwing !== null\)/);
  // The no-loan-AND-no-target branch: cleared AND hidden, so a plan with neither is what it was
  // before P3-16 existed at all.
  assert.match(MAIN, /if \(answer === undefined && targets\.length === 0\) \{\s*mortgageBox\.replaceChildren\(\);\s*mortgageBox\.hidden = true;/);
  // Every sentence reaches the page — the per-Person list is spread, never indexed.
  assert.match(MAIN, /\.\.\.answer\.perPerson/);
  assert.doesNotMatch(MAIN, /answer\.perPerson\[0\]/, 'one spouse is being picked out of the list');
  assert.match(MAIN, /answer\.tail === undefined \? \[\] : \[answer\.tail\]/);
  // Every target is rendered, and every target's OWN perPerson list is walked in full — never
  // indexed, on the same rule the payoff answer above is held to.
  assert.match(MAIN, /for \(const target of targets\) \{/);
  assert.match(MAIN, /for \(const line of target\.perPerson\) \{/);
  assert.doesNotMatch(MAIN, /target\.perPerson\[0\]/, 'one spouse is being picked out of a target’s list');
  // It is redrawn when the money view flips, because it carries a dollar figure.
  // Twice: the redraw, and the money toggle. (The definition reads `const drawHeadline = (`, which
  // this walker does not match, so two occurrences means two CALLS and no third caller.)
  assert.equal([...MAIN.matchAll(/drawHeadline\(/g)].length, 2, 'called from somewhere other than the redraw and the money toggle');
  // The entries handed over are the ACTIVE SCENARIO's, never the pool — `scenarioWalks.ts`.
  assert.match(MAIN, /activeEntries = scenarioEntries\(plan, scenarioById\(plan, plan\.activeScenarioId\)\);/);
  assert.doesNotMatch(MAIN, /mortgageHeadline\([^)]*plan\.entries/);
  assert.doesNotMatch(MAIN, /mortgageTargetHeadlines\([^)]*plan\.entries/);
});

test('the element is in the markup, starts HIDDEN, and sits above the chart', () => {
  assert.match(HTML, /<section id="mortgage-headline" hidden><\/section>/);
  assert.ok(
    HTML.indexOf('id="mortgage-headline"') < HTML.indexOf('id="chart-box"'),
    'the answer to the question is below the picture of it',
  );
});

// --- 6. THE PINS ARE NOT VACUOUS ------------------------------------------------------------------

test('every sentence is DISTINCT and long enough to be a sentence', () => {
  const found = answer(PAID_OFF, [retire('r1', '2026-11-01', 'personA'), retire('r2', '2027-01-01', 'personB')]);
  const text = allText(found);
  assert.equal(new Set(text).size, text.length, 'two of the sentences on screen are the same string');
  for (const sentence of text) {
    assert.ok(sentence.trim().length >= 40, `too short to be a sentence: "${sentence}"`);
    assert.match(sentence, /[a-z]{4}/, 'not words');
  }
});

test('§6c THE PROOF: emptying any of the text fails these pins', () => {
  // The helper is the whole defence, so it is attacked directly: an emptied string must fail the
  // floor, and a plausible-but-wrong one must fail a subject. A pin that survives deletion is worth
  // nothing, and this repo has shipped some.
  const subjects = [['the loan', [/home loan/i]], ['that it is clear', [/paid off|clear/i]]];
  const real = answer(PAID_OFF, [retire('r', '2027-03-01', 'household')]).headline;
  explains('the real headline', real, subjects);
  for (const emptied of ['', '   ', 'x']) {
    assert.throws(() => explains('an emptied headline', emptied, subjects), /too short to be the explanation/);
  }
  // Long enough, and says nothing this pin is about.
  const padded = 'The forecast ran to its end and the household is described above in some detail here.';
  assert.throws(() => explains('a headline about nothing', padded, subjects), /no longer explains the loan/);
  // And the same for a per-Person sentence, whose subjects include a FIGURE.
  const owing = answer(PAID_OFF, [retire('r1', '2026-11-01', 'personA')]).perPerson[0];
  const amount = [['the amount', [/\$996\b/]]];
  explains('the real sentence', owing, amount);
  assert.throws(() => explains('an emptied sentence', '', amount), /too short/);
  assert.throws(
    () => explains('a sentence with the wrong figure', owing.replace('$996', '$0'), amount),
    /no longer explains the amount/,
  );
});
