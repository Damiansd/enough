// P4-5d — **"WHEN DOES SUPER AND PENSION STOP COVERING THE DESIRED INCOME?", AS A SENTENCE.**
//
// The engine half (`pensionOnlyAge`, `shortfallAge`) is `core-outcomes-pension-only-age.test.mjs`
// and `core-outcomes.test.mjs`. This suite is about what a reader is TOLD: which of the six answers
// they get, the two figures and the gap between them, the money they are stated in, and — the point
// of the whole file — that no two of the six ever wear each other's words.
//
// **The DOM writer is pinned as SOURCE**, on this repo's standing rule: there is no DOM under
// `node:test` and `typescript` is the one dev dependency (TODO.md P2-9a).
//
// ⚠️ **THE TEXT PINS ARE NOT VACUOUS, and §7 proves it.** A pin of the form
// `assert.ok(text.includes(SOME_CONSTANT))` compares a value with itself and stays green when the
// constant is emptied; this repo has shipped fourteen of those at once (`4be21d9`). Every assertion
// on prose here is a LENGTH FLOOR plus plain-word subjects, and §7 re-runs them against an emptied
// string, against a long string about nothing, and against the WRONG ONE OF THE SIX ANSWERS.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { toCents } from '../dist/core/money.js';
import { project } from '../dist/core/projection.js';
import { incomeHeadline } from '../dist/app/incomeHeadline.js';
import { moneyBasis } from '../dist/app/todaysDollars.js';
import { pensionOnlyAge, shortfallAge } from '../dist/core/outcomes.js';
import { DEMO_PLAN } from '../dist/app/demoHousehold.js';
import { AGE_PENSION_PERIODS } from '../dist/data/assumptions/agePension.js';

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
const HEADLINE_CODE = executableCode(read('app', 'incomeHeadline.ts'));
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
  planningHorizonAge: 73,
  economicSeries: { cpi: 0.025, pblci: 0.025, awote: 0.035, mtawe: 0.035 },
  deemingRates: { lower: 0.0175, upper: 0.0375 },
  nominalReturn: 0.065,
  // Interest on cash (2026-09-23) is not this fixture's subject: stated nil, the control proved byte-identical to the walk before it existed.
  cashInterestRate: 0,
};

const entry = (id, type, date, params, owner = 'household') => ({
  id,
  date,
  owner,
  type,
  params,
  enabled: true,
  createdAt: '2026-06-01',
});
const spend = (id, date, annual) => entry(id, 'SPEND_CHANGE', date, { annualSpend: toCents(annual) });

/** Val and Bea are both past Age Pension age on day one, so the pension is payable from month 0. */
const VAL = person('Val', '1955-04-17');
const BEA = person('Bea', '1954-08-09');
/** Kit is 41 in 2026 — no Age Pension is payable to this Household in any month of a short walk. */
const KIT = person('Kit', '1985-01-10');

const household = (offset, persons = [VAL, BEA], extra = {}) => ({
  persons,
  homeStatus: 'occupied',
  openingOffsetBalance: toCents(offset),
  ...extra,
});

const TODAY = moneyBasis('todaysDollars', SETTINGS);
const FUTURE = moneyBasis('futureDollars', SETTINGS);

const answer = (house, entries, basis = TODAY, settings = SETTINGS) => {
  const months = project(settings, house, entries);
  return incomeHeadline(months, house, settings.economicSeries.agePension, basis);
};

/** Every sentence the page would show, in the order it would show them. */
const allText = (found) => [found.headline, ...found.perPerson, ...found.detail];
const joined = (found) => allText(found).join(' ');

/**
 * **A pin on an EXPLANATION, not on its wording** — `app-mortgage-headline.test.mjs`'s helper,
 * copied rather than imported because a test importing another test's internals is a link nothing
 * enforces. Every group must match and any alternative within a group satisfies it, so the sentence
 * can be reworded in plainer English without this moving; emptying it fails the floor and every
 * subject at once, which §7 proves by doing it.
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

// --- 0. THE FIXTURES ARE WHAT THEY ARE CLAIMED TO BE — the vacuity control -----------------------

test('§0 CONTROL — the fixtures' + ' really do reach the six different engine answers these tests name', () => {
  // Every figure asserted below comes from one of these walks, and a suite that never checked its
  // fixtures could pass with all six of them landing on the same engine answer.
  const cases = [
    ['ownMoneyLasts', household(500_000), [spend('sc', '2026-09-01', 6_000)], 'never', 'never'],
    ['pensionOnlyShort', household(0), [spend('sc', '2026-09-01', 60_000)], 'pensionOnly', 'shortfall'],
    ['pensionOnlyCovers', household(0), [spend('sc', '2026-09-01', 10_000)], 'pensionOnly', 'never'],
    ['pensionOnlyNoTarget', household(0), [], 'pensionOnly', 'never'],
  ];
  for (const [name, house, entries, wantPension, wantShort] of cases) {
    const months = project(SETTINGS, house, entries);
    assert.equal(pensionOnlyAge(months, house, undefined).outcome, wantPension, `${name}: wrong Pension-Only outcome`);
    assert.equal(shortfallAge(months, house).outcome, wantShort, `${name}: wrong Shortfall outcome`);
    assert.equal(answer(house, entries).kind, name);
  }
  // And the no-pension-at-all Household, whose whole walk is below Age Pension age.
  const young = { ...SETTINGS, planningHorizonAge: 42 };
  const kit = household(0, [KIT]);
  const months = project(young, kit, [spend('sc', '2026-09-01', 60_000)]);
  assert.equal(months.length, 5);
  assert.equal(months.every((month) => !month.lines.some((line) => line.description === 'Age Pension')), true);
  assert.equal(pensionOnlyAge(months, kit, undefined).outcome, 'never');
  assert.equal(shortfallAge(months, kit).outcome, 'shortfall');
});

// --- 1. THE SIX ANSWERS, one at a time ----------------------------------------------------------

test('(1) OWN MONEY LASTS — the good answer, and it says so without a date or a gap', () => {
  const found = answer(household(500_000), [spend('sc', '2026-09-01', 6_000)]);
  assert.equal(found.kind, 'ownMoneyLasts');
  explains('the GOOD headline', found.headline, [
    ['whose money it is', [/your own savings and super/i]],
    ['that it covers the spending', [/cover/i]],
    ['how far', [/2028-04/], [/end of the forecast/i]],
  ]);
  // P17-6: the second sentence is the ⓘ detail behind the headline now, not a second line under it.
  explains('the GOOD headline’s detail', found.headlineDetail, [
    ['that the pension never becomes the whole of it', [/never/i], [/Age Pension/]],
  ], 1);
  // ⚠️ NO DATE OF RUNNING OUT AND NO GAP — this answer has neither, and inventing one would be the
  // bad answer wearing the good one's shape.
  assert.doesNotMatch(found.headline, /short|gone|runs out/i);
  assert.doesNotMatch(joined(found), /a year short/);
  // Both people are still named and aged, in `household.persons` order.
  assert.deepEqual([...found.perPerson], ['Val will be 72.', 'Bea will be 73.']);
});

test('(2) PENSION ONLY AND SHORT — the headline case: a DATE, two figures and the GAP between them', () => {
  // ⚠️ THE MARKER IS FIVE MONTHS OUT, on purpose: month 0 converts to itself in today's money and
  // would prove nothing about the money basis (§4).
  //
  // ⚠️ **RE-DERIVED FOR REGISTER O85 (2026-09-21), AND TWO OF THE THREE FIGURES MOVED.** The stated
  // spending level is a REAL figure now, so this household spends more every month than it used to
  // and its $30,000 runs out one month sooner: **2027-03 → 2027-02**. And the spending figure shown
  // in today's money is **$120,000 — the number typed into the box** — where it used to read
  // $118,528, because the walk raises the level by the same factor the page deflates it by and the
  // two cancel exactly. That agreement is the ruling, and §4 asserts it as an identity.
  const found = answer(household(30_000), [spend('sc', '2026-09-01', 120_000)]);
  assert.equal(found.kind, 'pensionOnlyShort');
  explains('the HEADLINE case', found.headline, [
    ['when', [/From 2027-02/]],
    ['that the household’s own money is gone', [/your own savings and super are gone/i]],
    ['that the pension is all there is', [/Age Pension is the only money coming in/i]],
    ['what the pension comes to', [/\$48,019 a year/]],
    ['which money that is in', [/in today’s money/]],
    ['what they wanted to spend', [/\$120,000 a year/]],
    ['the gap', [/\$71,981 a year short/]],
  ]);
  assert.equal(120_000 - 48_019, 71_981);
  assert.deepEqual([...found.perPerson], ['Val will be 71.', 'Bea will be 72.']);
});

test('⚠️ THE THREE PRINTED FIGURES RECONCILE — and the route that used to disagree cannot any more', () => {
  // A reader who takes one printed number from another must get the third. `deflate` rounds each
  // figure on its own and rounding is not additive, so `round(S) − round(P)` and `round(S − P)` can
  // differ by a cent — and at whole dollars, by a DOLLAR. This fixture used to be one of the ~60 in
  // a 61 × 4 sweep of offsets and spending levels where they did.
  //
  // ⚠️ **AND SINCE REGISTER O85 (2026-09-21) THAT SWEEP FINDS NONE, WHICH IS A CONSEQUENCE OF THE
  // RULING AND NOT A WEAKENING OF THIS TEST.** The spending figure is now a REAL level raised by the
  // same factor the page deflates it by, so its deflated value sits within a cent of the figure the
  // user typed in EVERY month — a whole number of dollars, with no fractional part left to round the
  // two ways. Re-run at 500-dollar offset steps and 137-dollar spending steps (≈ 80,000 fixtures) on
  // 2026-09-21: zero disagreements. So the divergence is demonstrated on the arithmetic itself
  // below, where it is a property of rounding rather than of any household, and the fixture keeps
  // the claim it is really making: the subtraction on the page is done on the PRINTED figures.
  const found = answer(household(24_000), [spend('sc', '2026-09-01', 120_000)]);
  assert.equal(found.kind, 'pensionOnlyShort');
  const figures = [...found.headline.matchAll(/\$([\d,]+)/g)].map(([, each]) => Number(each.replaceAll(',', '')));
  assert.deepEqual(figures, [48_118, 120_000, 71_882], 'the headline no longer carries pension, spending and gap in that order');
  assert.equal(figures[1] - figures[0], figures[2], 'the gap on the page is not the difference between the two figures on the page');
  // The arithmetic the rule exists for, stated as arithmetic: two figures whose cents round one way
  // each and the other way together. $118,772.49 and $48,019.51 print as $118,772 and $48,020 — a
  // printed gap of $70,752 — while the raw difference is $70,752.98, which prints as $70,753.
  const dollars = (cents) => Math.round(cents / 100);
  assert.notEqual(dollars(11_877_249) - dollars(4_801_951), dollars(11_877_249 - 4_801_951));
  assert.equal(dollars(11_877_249) - dollars(4_801_951), 70_752);
  assert.equal(dollars(11_877_249 - 4_801_951), 70_753);
});

test('(3) MONEY RUNS SHORT WITH NO PENSION-ONLY MONTH — and it never wears (1)’s words', () => {
  const young = { ...SETTINGS, planningHorizonAge: 42 };
  const found = answer(household(0, [KIT]), [spend('sc', '2026-09-01', 60_000)], TODAY, young);
  assert.equal(found.kind, 'moneyRunsShort');
  explains('the BAD headline', found.headline, [
    ['when it starts', [/From 2026-09/]],
    ['that the plan cannot pay for itself', [/money it does not have/i]],
    ['how much of the forecast is short', [/every one of the 5 months/i]],
  ]);
  // ⚠️ IT MUST NOT READ AS THE GOOD ANSWER. These are the good answer's own words.
  assert.doesNotMatch(joined(found), /cover everything you plan to spend/i);
  assert.doesNotMatch(joined(found), /your own savings and super cover/i);
  explains('the no-pension note', joined(found), [
    ['that no pension is paid at all', [/no Age Pension at all/i]],
    ['that there is nothing underneath the plan', [/no pension underneath/i]],
  ]);
  // ⚠️ AND NO REASON IS GIVEN FOR THE UNPAID MONTHS. Kit is not paid because Kit is 41, not because
  // of a means test, and the first draft of this sentence asserted the means test.
  assert.doesNotMatch(joined(found), /keeps you above the limits/i);
});

test('(4) THE PENSION COVERS IT — a low spender is told so, with no hardship implied', () => {
  const found = answer(household(0), [spend('sc', '2026-09-01', 10_000)]);
  assert.equal(found.kind, 'pensionOnlyCovers');
  explains('the COVERED headline', found.headline, [
    ['when', [/From 2026-09/]],
    ['what the pension comes to', [/\$47,070 a year/]],
    ['what they plan to spend', [/\$10,000 a year/]],
    ['that it is enough', [/pension covers it/i]],
  ]);
  // ⚠️ NO GAP, NO SHORTFALL, NO WARNING. This household is fine and the sentence must say so.
  assert.doesNotMatch(joined(found), /short/i);
  assert.doesNotMatch(joined(found), /does not have/i);
});

test('(5) NO SPENDING TARGET AT ALL — the pension is stated alone, and $0 is never printed', () => {
  const found = answer(household(0), []);
  assert.equal(found.kind, 'pensionOnlyNoTarget');
  explains('the NO TARGET headline', found.headline, [
    ['what the pension comes to', [/\$47,070 a year/]],
    ['that the plan states no spending', [/no spending of its own/i]],
    ['that there is therefore nothing to compare', [/nothing here to measure/i]],
  ]);
  // A printed "$0 a year you plan to spend" would read as an answer rather than as an absence.
  assert.doesNotMatch(joined(found), /\$0 a year/);
  assert.doesNotMatch(found.headline, /short|covers it/i);
});

test('(6) THE REFUSAL IS CAUGHT AND SAID — never an error page, and never a "never"', () => {
  // The first determined Age Pension parameters run from 2026-03-20 and §4.7 indexes FORWARD from a
  // published set, so a walk that BEGINS below them has no Pension-Only Age at all. The refusal was
  // narrowed on 2026-09-21 and not deleted; this is what is left of its reach.
  assert.equal(AGE_PENSION_PERIODS[0].from, '2026-03-20');
  const early = { ...SETTINGS, asAtDate: '2026-01-15' };
  const house = household(0);
  assert.throws(() => pensionOnlyAge(project(early, house, []), house, undefined), /not computable across/);
  const found = answer(house, [spend('sc', '2026-09-01', 60_000)], TODAY, early);
  assert.equal(found.kind, 'notWorkedOut');
  explains('the REFUSAL, in plain words', found.headline, [
    ['that the question cannot be answered here', [/cannot tell you/i]],
    ['what the question was', [/stop covering your spending/i]],
    ['why', [/earliest Age Pension rates/i]],
    ['that it will not be guessed at', [/will not guess/i]],
  ]);
  explains('what to do about it', found.detail[0], [
    ['that the rates only run forwards', [/carried forward|no way to run them backwards/i]],
    ['the two ways out', [/stated as at/i], [/shortening the forecast/i]],
  ]);
  // ⚠️ IT IS NOT THE GOOD ANSWER AND IT IS NOT A DATE. Both would be confident answers to a
  // question `outcomes.ts` has just refused.
  assert.doesNotMatch(joined(found), /your own savings and super cover/i);
  assert.doesNotMatch(joined(found), /never reach a month/i);
  assert.doesNotMatch(found.headline, /20\d\d-\d\d/);
  // No month is named, so no ages are claimed — and that is the ONLY case with no per-Person line.
  assert.deepEqual([...found.perPerson], []);
});

test('NO TWO OF THE SIX ANSWERS SHARE A HEADLINE, and each one is reachable', () => {
  const young = { ...SETTINGS, planningHorizonAge: 42 };
  const early = { ...SETTINGS, asAtDate: '2026-01-15' };
  const found = [
    answer(household(500_000), [spend('sc', '2026-09-01', 6_000)]),
    answer(household(30_000), [spend('sc', '2026-09-01', 120_000)]),
    answer(household(0, [KIT]), [spend('sc', '2026-09-01', 60_000)], TODAY, young),
    answer(household(0), [spend('sc', '2026-09-01', 10_000)]),
    answer(household(0), []),
    answer(household(0), [spend('sc', '2026-09-01', 60_000)], TODAY, early),
  ];
  assert.deepEqual(found.map((each) => each.kind), [
    'ownMoneyLasts', 'pensionOnlyShort', 'moneyRunsShort', 'pensionOnlyCovers', 'pensionOnlyNoTarget', 'notWorkedOut',
  ]);
  assert.equal(new Set(found.map((each) => each.headline)).size, 6, 'two of the six answers say the same thing');
  for (const each of found) {
    assert.ok(each.headline.trim().length >= 80, `too short to be the headline: "${each.headline}"`);
    assert.ok(each.detail.length >= 1, `${each.kind} has no qualifying detail at all`);
    for (const sentence of each.detail) {
      assert.ok(sentence.trim().length >= 40, `too short to be a sentence: "${sentence}"`);
      assert.match(sentence, /[a-z]{4}/, 'not words');
    }
    // A per-Person line is `Name is NN then.` and is deliberately short — it carries one fact. What
    // it must not be is a bare number, a blank, or two people in one string.
    for (const sentence of each.perPerson) {
      assert.match(sentence, /^[A-Z][a-z]+ will be \d{1,3}\.$/, `not a per-Person line: "${sentence}"`);
    }
    assert.equal(new Set(allText(each)).size, allText(each).length, 'two of the sentences on screen are the same string');
    // ⚠️ NO CODEBASE JARGON ON SCREEN — the standing plain-English rule. Not "Waterfall", not
    // "limb", not "Pension-Only Age", not "assessable", not "nominal".
    assert.doesNotMatch(joined(each), /waterfall|\blimb\b|pension-only|assessable|accessible assets|nominal|deem/i);
  }
});

// --- 2. A COUPLE IS NEVER REDUCED TO ONE AGE ----------------------------------------------------

test('⚠️ BOTH PEOPLE GET A LINE, IN `household.persons` ORDER, AND NEITHER IS IN THE OTHER’S', () => {
  const found = answer(household(30_000), [spend('sc', '2026-09-01', 120_000)]);
  assert.equal(found.perPerson.length, 2);
  assert.equal(found.perPerson[0].includes('Bea'), false);
  assert.equal(found.perPerson[1].includes('Val'), false);
  assert.notEqual(found.perPerson[0], found.perPerson[1], 'the two ages collapsed into one');
  // The MONTH is in the lead and is the household's; the AGES are not, because they differ.
  assert.match(found.headline, /2027-02/); // 2027-03 before register O85 — see §1's headline case
  assert.doesNotMatch(found.headline, /\bVal\b|\bBea\b/);
  assert.doesNotMatch(found.headline, /aged \d\d/);
});

test('A SINGLE-PERSON HOUSEHOLD gets ONE line — the same rule, not a special case', () => {
  const alone = household(0, [VAL]);
  const found = answer(alone, [spend('sc', '2026-09-01', 60_000)]);
  assert.equal(found.kind, 'pensionOnlyShort');
  assert.deepEqual([...found.perPerson], ['Val will be 71.']);
  // The single rate is a different figure from the couple rate, so this is not the couple fixture
  // with a name dropped.
  assert.match(found.headline, /\$31,223 a year/);
  assert.doesNotMatch(found.headline, /\$47,070/);
});

// --- 3. THE PENSION FIGURE, RE-DERIVED FROM THE RATE TABLE --------------------------------------

test('THE ANNUAL PENSION IS RE-DERIVED FROM THE PUBLISHED RATES, not read back off the function', () => {
  // The period in force on 2026-09-01. Neither test binds for a household with nothing, so the
  // figure is the maximum payment rate: basic rate + Pension Supplement (maximum) + Energy
  // Supplement, per fortnight, couple combined (SS Act s 1064, Rate Calculator A Module A Step 4).
  const period = AGE_PENSION_PERIODS.find((each) => each.from === '2026-07-01');
  assert.equal(period.rates.maximumBasicRate.coupleCombined, 1_658_80); // $1,658.80 a fortnight
  assert.equal(period.rates.pensionSupplementMaximum.coupleCombined, 130_40); // $130.40 a fortnight
  const energySupplementCoupleCombined = 21_20; // $21.20 a fortnight, never indexed (T23 / T31)
  const perFortnight = 1_658_80 + 130_40 + energySupplementCoupleCombined;
  assert.equal(perFortnight, 1_810_40);
  // The walk annualises at 26 and takes a twelfth, in ONE rounding (`monthlyFromFortnightly`).
  const perMonth = Math.round((perFortnight * 26) / 12);
  assert.equal(perMonth, 392_253);
  // And this module multiplies the month's own line by 12 and drops the cents.
  const perYearWholeDollars = Math.round((perMonth * 12) / 100);
  assert.equal(perYearWholeDollars, 47_070);
  // Which is the figure on the screen, in month 0, where today's money and the raw amount coincide.
  const found = answer(household(0), [spend('sc', '2026-09-01', 60_000)]);
  assert.match(found.headline, /about \$47,070 a year/);
  assert.equal(answer(household(0), [spend('sc', '2026-09-01', 60_000)], FUTURE).headline.includes('$47,070'), true);
});

// --- 4. THE MONEY VIEW --------------------------------------------------------------------------

test('EVERY FIGURE GOES THROUGH THE PAGE’S OWN LENS, in a month that is not month 0', () => {
  const house = household(30_000);
  const entries = [spend('sc', '2026-09-01', 120_000)];
  const today = answer(house, entries, TODAY);
  const future = answer(house, entries, FUTURE);
  // The marker is 2027-02, five months past `asAtDate`, so the factor is 1.025 ^ (5/12) and today's
  // money is SMALLER. Both figures move and the gap moves with them.
  //
  // ⚠️ **AND SINCE REGISTER O85 (2026-09-21) THE TWO VIEWS SWAP WHICH FIGURE IS THE ROUND ONE.**
  // The raw view now shows $121,241 — what $120,000 of today's spending actually costs in 2027-02 —
  // and the today's-money view shows $120,000, the figure the user typed. That is the whole of the
  // ruling on one line of the page: the walk multiplies the stated level by the price-level factor
  // and the page divides by the same factor, so what comes back is what went in.
  assert.match(future.headline, /\$48,516 a year/);
  assert.match(future.headline, /\$121,241 a year/);
  assert.match(future.headline, /\$72,725 a year short/);
  assert.equal(121_241 - 48_516, 72_725);
  assert.match(today.headline, /\$48,019 a year/);
  assert.match(today.headline, /\$120,000 a year/);
  assert.match(today.headline, /\$71,981 a year short/);
  // ⚠️ AND THE SENTENCE SAYS WHICH MONEY IT IS IN — a bare figure decades out is unjudgeable.
  assert.match(today.headline, /in today’s money/);
  assert.match(future.headline, /actual amount paid that year/);
  assert.notEqual(today.headline, future.headline);
  assert.equal(today.kind, future.kind, 'the money view must not change which answer this is');
});

test('THE SPENDING FIGURE SHOWN IS THE FIGURE THE USER TYPED — every month, in today’s money', () => {
  // ⚠️ **THIS TEST REPLACES "THE FLAT SPENDING TARGET IS SAID OUT LOUD" (register O85, ruled
  // 2026-09-21).** That test asserted a paragraph warning the reader that the spending figure did
  // not rise with prices and therefore shrank on screen the further out they looked. The stated
  // level is a REAL figure now, the walk raises it to each month's price level, and the warning is
  // gone from `incomeHeadline.ts` — so what is pinned here instead is the thing that made the
  // warning unnecessary, which is the stronger claim: **in the today's-money view the figure printed
  // IS the figure typed**, in whichever month the marker happens to land.
  const house = household(30_000);
  for (const stated of [60_000, 120_000, 150_000]) {
    const found = answer(house, [spend('sc', '2026-09-01', stated)], TODAY);
    if (found.kind !== 'pensionOnlyShort' && found.kind !== 'pensionOnlyCovers') continue;
    assert.match(found.headline, new RegExp(`\\$${stated.toLocaleString('en-AU')} a year`),
      `the today's-money view no longer shows the typed figure for $${stated}`);
  }
  // And the warning is gone rather than merely unasserted — including from the raw view, where it
  // never appeared, so its absence here is not the old "only in today's money" condition passing.
  assert.doesNotMatch(joined(answer(house, [spend('sc', '2026-09-01', 120_000)], TODAY)), /flat amount|does not rise with prices/i);
  assert.doesNotMatch(joined(answer(house, [spend('sc', '2026-09-01', 120_000)], FUTURE)), /flat amount|does not rise with prices/i);
  // The RAW view is the control: there the same plan shows a LARGER figure than the one typed,
  // because that is what the month really costs. If both views printed $120,000 the lens would be
  // doing nothing and the assertion above would prove nothing.
  assert.match(answer(house, [spend('sc', '2026-09-01', 120_000)], FUTURE).headline, /\$121,241 a year/);
});
// --- 5. THE QUALIFYING FACTS --------------------------------------------------------------------

test('THE PENSION IS COUNTED, NEVER ASSUMED — three readings, and the demo couple’s is the middle one', () => {
  // ⚠️ The committed demo couple is paid in 432 of its 501 months — it was 99 until register O85
  // (2026-09-21), and the cause is the means test rather than the pension rules: a household whose
  // spending rises with prices holds less, and a household that holds less is assessed on less. "On
  // the Age Pension alone" can still mean "on very nearly nothing", and this note is what stops the
  // headline implying a full pension.
  const months = project(DEMO_PLAN.settings, DEMO_PLAN.household, DEMO_PLAN.entries);
  const paid = months.filter((month) => month.lines.some((line) => line.description === 'Age Pension')).length;
  assert.equal(months.length, 501);
  // ⚠️ **AND 435 SINCE P10-5 (2026-09-21) — THREE MORE, AND IT RUNS THE FLATTERING WAY.** Ash's
  // pension pays its opening part-year now, so the account holds less from month one, and a
  // household assessed on less is paid in three more months of the walk. The same mechanism that
  // brings this plan's shortfall a month forward pushes its Age Pension eligibility three months
  // back, and both are the means test doing its job.
  assert.equal(99, 99, 'the pre-O85 count, kept beside the new one');
  assert.equal(432, 432, 'the pre-P10-5 count, kept beside the new one');
  // ⚠️ **AND 495 SINCE 2026-09-23, and this one is the pension rules.** A plan with no series now
  // INDEXES the Age Pension on its own growth rates instead of carrying the 2026 sets forward; the
  // assets-test cut-off rises with the rate, so the demo couple — who sit near it — stop being cut
  // out in 60 of the months they were. Still not all 501: the middle reading, still.
  assert.equal(435, 435, 'the pre-2026-09-23 count, kept beside the new one');
  // ⚠️ **AND 473 SINCE THE SWITCH AT RETIREMENT (2026-09-23), 22 FEWER.** Dana's RETIRE (2031-05-14,
  // at 63) turns her accumulation account into an account-based pension, which the assets test counts
  // at any age where her accumulation account was exempt until 67. From 2031-06 the couple's
  // assessable assets carry her $600,000-odd pension and sit over the cut-off; drawing it down brings
  // them back under in 2033-04. 2031-06 to 2033-03 is 7 + 12 + 3 = 22 months.
  assert.equal(495, 495, 'the pre-switch count, kept beside the new one');
  // ⚠️ **AND 471 WITH "SPEND CASH FIRST" (2026-09-23), TWO FEWER: 2033-04 and 2033-05.** Cash with no
  // loan to offset is spent before the 6.5% pools now, so the couple holds $7,389.98 more in 2033-04
  // and stays over the cut-off two months longer — it was $18.50 a month inside it. 2031-06 to
  // 2033-05 is 7 + 12 + 5 = 24 months.
  assert.equal(473, 473, 'the pre-order count, kept beside the new one');
  // ⚠️ **AND 470 SINCE DANA'S RETIREMENT MONTH PAYS HER DAYS WORKED (2026-09-23), ONE FEWER: 2033-06.**
  // May 2031 now pays 14/31 of her month, which Ash's pension then does not have to, so the couple
  // holds $2,117.14 more assessable assets in 2033-06 ($1,308,760.98 against $1,306,643.84) — and
  // that month they were paid $3.60, a few hundred dollars inside the cut-off. 2031-06 to 2033-06 is
  // 7 + 12 + 6 = 25 months.
  assert.equal(471, 471, 'the pre-retirement-month-pay count, kept beside the new one');
  assert.equal(470, 470, 'the pre-wage-growth count, kept beside the new one');
  // ⚠️ **AND 452 SINCE PAY RISES WITH WAGES (2026-09-23), EIGHTEEN FEWER, on two terms.** (1) Fifteen
  // months while Dana works: her pay rises 3.5% a year every month, the income test's free area rises
  // with prices twice a year, and from 2029 the couple's income is over the cut-off between
  // indexations — 2029-02 to 2031-04, in six runs. (2) Three at the end of the retired run,
  // 2033-07 to 2033-09: what the higher pay left them holds them $19,678.59 higher in 2033-07, where
  // they were paid $48.36 a month on the assets taper, and over the cut-off until 2033-10. So the
  // unpaid months since the switch are 2031-06 to 2033-09, 7 + 12 + 9.
  const unpaidWhileWorking = months.filter((month) => month.month >= '2029-01' && month.month <= '2031-05' && !month.lines.some((line) => line.description === 'Age Pension'));
  assert.equal(unpaidWhileWorking.length, 15);
  assert.ok(unpaidWhileWorking.every((month) => month.lines.some((line) => line.description === 'Salary, Dana')));
  // ⚠️ **AND 453 SINCE DIV 119 (LR-1 slice 3, 2026-09-29), ONE MORE: 2033-09, paid $0.20.** Dana's
  // sales from 2033-03 pay the minimum tax, and each sale grows by exactly its tax, so the couple
  // holds less: $1,080.62 less in 2033-06 (March to May's $23, $518 and $531, each missing its own
  // month's growth and every one after: 23g³ + 518g² + 531g with g = 1.065^(1/12)), and $1,632.16
  // less in 2033-07 (that, and June's $543, grown a month). Enough less by 2033-09 to be paid there.
  // The unpaid months since the switch are 2031-06 to 2033-08, 7 + 12 + 8.
  assert.equal(495 - paid, 15 + 7 + 12 + 8);
  assert.equal(paid, 453);
  assert.equal(452, 452, 'the pre-Div 119 count, kept beside the new one');
  const g = 1.065 ** (1 / 12);
  assert.equal(Math.round(2_300 * g ** 3 + 51_800 * g ** 2 + 53_100 * g), 108_062);
  assert.equal(months.find((month) => month.month === '2033-07').assessableAssets - 130_733_416, 1_967_859 - 163_216);
  const june2033 = months.find((month) => month.month === '2033-06');
  assert.equal(june2033.lines.some((line) => line.description === 'Age Pension'), false);
  // ($19,575.59 more again since pay rose, on the same terms as 2033-07's below.)
  assert.equal(june2033.assessableAssets - 130_664_384, 211_714 + 1_957_559 - 108_062);
  const found = incomeHeadline(months, DEMO_PLAN.household, DEMO_PLAN.settings.economicSeries.agePension, TODAY);
  explains('the demo plan’s pension note', found.detail.join(' '), [
    ['how many months are paid', [/453 of 501 months/]],
    ['that the rest are not', [/nothing in the rest/i]],
    ['that a payment can be partial', [/part payment/i]],
  ]);
  // ⚠️ AND NOTHING ANYWHERE CLAIMS THE FULL RATE.
  assert.doesNotMatch(joined(found), /the full Age Pension|maximum rate/i);
  // The third reading — every month paid — is the fixture households', and is a different sentence.
  const all = answer(household(0), [spend('sc', '2026-09-01', 60_000)]);
  assert.match(all.detail.join(' '), /every one of the 20 months/);
  assert.doesNotMatch(all.detail.join(' '), /432 of/);
});

test('THE HOME LOAN IS NOT INSIDE THE SPENDING FIGURE, and where one is being repaid this says so', () => {
  // `SpendChangeParams.annualSpend` excludes the repayment (user ruling, 2026-09-21), so total
  // outgoings in that month are the target PLUS $1,000 a month. $12,000 a year, in month 0.
  const withLoan = household(0, [VAL, BEA], {
    mortgage: { openingBalance: toCents(50_000), annualInterestRate: 0.06, monthlyRepayment: toCents(1_000) },
  });
  const found = answer(withLoan, [spend('sc', '2026-09-01', 60_000)]);
  explains('the mortgage note', found.detail.join(' '), [
    ['that the loan is still being repaid', [/still repaying the home loan/i]],
    ['what it costs a year', [/\$12,000 a year/]],
    ['that it is ON TOP of the spending figure', [/on top of the spending figure/i]],
  ]);
  // The same Household with no loan says nothing about one — absence, not a nil.
  assert.doesNotMatch(answer(household(0), [spend('sc', '2026-09-01', 60_000)]).detail.join(' '), /home loan/i);
});

test('SHORTFALL AND PENSION-ONLY IN EITHER ORDER, OR NEITHER — computed, never assumed', () => {
  // `outcomes.ts` is explicit that there is no ordering between the two markers.
  // (a) The shortfall comes FIRST, by one month — the ordinary case.
  const before = answer(household(30_000), [spend('sc', '2026-09-01', 120_000)]);
  // 2027-02 until register O85 (2026-09-21); the whole fixture moved one month earlier with it, and
  // the ORDERING — shortfall one month before pension-only — is what this test is about and is
  // unmoved.
  assert.equal(shortfallAge(project(SETTINGS, household(30_000), [spend('sc', '2026-09-01', 120_000)]), household(30_000)).firstShortfall.month, '2027-01');
  explains('the ordering, shortfall first', before.detail.join(' '), [
    ['that it had already happened', [/already outrun/i]],
    ['when', [/2027-01/]],
    ['how much earlier', [/1 month earlier/]],
  ]);
  // (b) The SAME month.
  const same = answer(household(0), [spend('sc', '2026-09-01', 60_000)]);
  assert.match(same.detail.join(' '), /also the first month this plan asks for money it does not have/i);
  assert.doesNotMatch(same.detail.join(' '), /earlier|later/);
  // (c) NEITHER — the pension covers the spending, so no month is ever short.
  const never = answer(household(0), [spend('sc', '2026-09-01', 10_000)]);
  assert.match(never.detail.join(' '), /pays for everything you ask of it/i);
});

test('THE RUN IS REPORTED, and a household that holds something AGAIN is told so', () => {
  // `outcomes.ts`'s own recovery recipe: a household banking its pension surplus buys ETFs with it,
  // and *"all assets are exhausted"* stops being true the moment that parcel exists.
  const long = { ...SETTINGS, planningHorizonAge: 100 };
  const house = household(200_000);
  const found = answer(house, [
    spend('sc', '2026-09-01', 160_000),
    spend('sc2', '2030-07-01', 40_000),
    entry('buy', 'NON_SUPER_INVESTMENT', '2033-01-10', { direction: 'buy', amount: toCents(20_000), incidentalCostsOfAcquisition: toCents(0) }, 'personA'),
  ], TODAY, long);
  assert.equal(found.kind, 'pensionOnlyShort');
  explains('the recovery', found.detail[0], [
    // 4 years and 7 months until register O85: the recovery starts a month earlier now, because the
    // household reaches the end of its money a month earlier, and it still ends at the same buy.
    // ⚠️ **AND 4 YEARS AND 7 MONTHS AGAIN SINCE 2026-09-23, the other way round.** The Age Pension
    // indexes on the plan's own growth rates from 2027-04, which pays this couple $1,199.22 more by
    // 2028-05 — more than the $1,061.04 that month used to be short by — so the run opens in 2028-06,
    // a month later, and still ends at the same buy.
    ['how long it lasted', [/4 years and 7 months/]],
    ['when it ended', [/2033-02/]],
    ['that money came in again', [/money that is not the pension comes in again/i]],
  ]);
  // A run that reaches the horizon says THAT instead, and names no recovery that never happens.
  const toTheEnd = answer(household(0), [spend('sc', '2026-09-01', 60_000)]);
  explains('the run to the horizon', toTheEnd.detail[0], [
    ['how long', [/1 year and 8 months/]],
    ['where the forecast stops', [/2028-04/]],
  ], 40);
  assert.doesNotMatch(toTheEnd.detail[0], /comes in again/);
});

// --- 6. THE PAGE ---------------------------------------------------------------------------------

test('SOURCE — the page renders the lead, every Person’s line and every detail, and NEVER hides the block', () => {
  assert.match(MAIN, /const answer = incomeHeadline\(\s*months,\s*shown\.household,\s*shown\.settings\.economicSeries\.agePension,\s*moneyBasis\(moneyView, shown\.settings\),\s*\);/);
  // Every sentence reaches the page — the per-Person list is spread, never indexed.
  assert.match(MAIN, /\.\.\.answer\.perPerson/);
  assert.match(MAIN, /\.\.\.answer\.detail/);
  assert.doesNotMatch(MAIN, /answer\.perPerson\[0\]/, 'one spouse is being picked out of the list');
  // ⚠️ AND THERE IS NO `hidden` BRANCH. Every plan has an answer here; a hidden block would be the
  // screen declining the question. (The mortgage block above it has one, and that is its own rule.)
  assert.doesNotMatch(MAIN, /incomeBox\.hidden/);
  // Redrawn when the money view flips, because it carries dollar figures. Twice: the redraw and the
  // money toggle. (The definition reads `const drawIncome = (`, which this walker does not match.)
  assert.equal([...MAIN.matchAll(/drawIncome\(/g)].length, 2, 'called from somewhere other than the redraw and the money toggle');
  // The plan's own series reaches it — never omitted, which would answer a different question.
  assert.doesNotMatch(MAIN, /incomeHeadline\([^)]*undefined/);
});

test('the element is in the markup, is NOT hidden, and sits above the chart and the home loan', () => {
  assert.match(HTML, /<section id="income-headline"><\/section>/);
  assert.doesNotMatch(HTML, /<section id="income-headline" hidden>/);
  assert.ok(HTML.indexOf('id="income-headline"') < HTML.indexOf('id="mortgage-headline"'), 'the home loan is above the whole plan');
  assert.ok(HTML.indexOf('id="income-headline"') < HTML.indexOf('id="chart-box"'), 'the answer is below the picture of it');
});

test('RAW SOURCE — the date is READ from `outcomes.ts` and derived nowhere here', () => {
  // This module reads the marker; it does not re-decide it. No asset figure, no cash balance and no
  // entitlement is compared with anything in this file.
  assert.match(HEADLINE_CODE, /pensionOnlyAge\(months, household, series\)/);
  assert.match(HEADLINE_CODE, /shortfallAge\(months, household\)/);
  assert.doesNotMatch(HEADLINE_CODE, /assessableAssets|protectedAssets|accessibleAssets|closingBalance/);
  // The refusal is CAUGHT, so it can never reach the page as an error.
  assert.match(HEADLINE_CODE, /try \{/);
  assert.match(HEADLINE_CODE, /\} catch \{/);
  // And the spending line is taken by its exported name, not matched on prose.
  assert.match(HEADLINE_CODE, /HOUSEHOLD_SPENDING_LINE/);
});

// --- 7. THE PINS ARE NOT VACUOUS -----------------------------------------------------------------

test('§7 THE PROOF: emptying, padding, or SWAPPING ONE ANSWER FOR ANOTHER fails these pins', () => {
  const subjects = [
    ['that the money is gone', [/your own savings and super are gone/i]],
    ['the gap', [/a year short/]],
  ];
  const real = answer(household(30_000), [spend('sc', '2026-09-01', 120_000)]).headline;
  explains('the real headline', real, subjects);
  for (const emptied of ['', '   ', 'x']) {
    assert.throws(() => explains('an emptied headline', emptied, subjects), /too short to be the explanation/);
  }
  const padded = 'The forecast ran to its end and the household is described above in some detail here.';
  assert.throws(() => explains('a headline about nothing', padded, subjects), /no longer explains/);
  // ⚠️ **THE ONE THAT MATTERS: the GOOD answer must not satisfy the BAD one's pins**, and the
  // reverse. This is the collapse the whole enumeration exists to prevent.
  const good = answer(household(500_000), [spend('sc', '2026-09-01', 6_000)]).headline;
  assert.throws(() => explains('the good answer under the bad answer’s pins', good, subjects), /no longer explains/);
  const goodSubjects = [['that the money lasts', [/cover everything you plan to spend/i]]];
  explains('the real good headline', good, goodSubjects);
  assert.throws(() => explains('the bad answer under the good answer’s pins', real, goodSubjects), /no longer explains/);
  // And a figure that is merely WRONG fails, so the money pins are not satisfied by any old dollars.
  const amount = [['the pension figure', [/\$48,019 a year/]]];
  explains('the real figure', real, amount);
  assert.throws(() => explains('the wrong figure', real.replace('$48,019', '$1.00'), amount), /no longer explains/);
});
