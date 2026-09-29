// P10-3 — **what the reader is told about how much they could spend**, and the two answers that are
// refusals. The search itself is `core-sustainable-spend.test.mjs`; this suite is about the words.
//
// **The DOM writer is pinned as SOURCE**, on this repo's standing rule: there is no DOM under
// `node:test` and `typescript` is the one dev dependency (TODO.md P2-9a).
//
// ⚠️ **THE TEXT PINS ARE NOT VACUOUS, and §7 proves it.** A pin of the form `includes(CONSTANT)`
// compares a value with itself and stays green when the constant is emptied. Every assertion on
// prose here is a LENGTH FLOOR plus plain-word subjects, and §7 re-runs the lot against emptied
// prose and requires each to throw.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { toCents } from '../dist/core/money.js';
import { project } from '../dist/core/projection.js';
import { moneyBasis } from '../dist/app/todaysDollars.js';
import { sustainableSpend } from '../dist/core/sustainableSpend.js';
import { sustainableSpendHeadline } from '../dist/app/sustainableSpendHeadline.js';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = (...parts) => readFileSync(join(ROOT, 'src', ...parts), 'utf8');

const C = (n) => toCents(n);

const SETTINGS = (over = {}) => ({
  asAtDate: '2026-09-01',
  planningHorizonAge: 100,
  // Pay rising with wages (2026-09-23) is not this fixture's subject: `awote: 0` holds every salary at the figure stated. A proved control: every figure this file asserts is the same at nil on the build before pay rose.
  economicSeries: { cpi: 0.025, pblci: 0.025, awote: 0, mtawe: 0.035 },
  deemingRates: { lower: 0.0175, upper: 0.0375 },
  nominalReturn: 0.065,
  // Interest on cash (2026-09-23) is not this fixture's subject: stated nil, the control proved byte-identical to the walk before it existed.
  cashInterestRate: 0,
  ...over,
});

const person = (over) => ({
  name: 'X',
  dateOfBirth: '1968-05-14',
  superInterests: [{ phase: 'accumulation', balance: C(400_000) }],
  parcels: [],
  employmentIncomePerFortnight: C(0),
  workBonusBalance: C(0),
  ...over,
});

const spend = (annual, over = {}) => ({
  id: 'spend',
  date: '2026-09-01',
  owner: 'household',
  type: 'SPEND_CHANGE',
  params: { annualSpend: C(annual) },
  enabled: true,
  createdAt: '2026-08-20',
  ...over,
});

const COUPLE = {
  persons: [
    person({ name: 'Kit', dateOfBirth: '1975-03-02', employmentIncomePerFortnight: C(4_200), superInterests: [{ phase: 'accumulation', balance: C(310_000) }] }),
    person({ name: 'Lee', dateOfBirth: '1978-11-20', employmentIncomePerFortnight: C(2_600), superInterests: [{ phase: 'accumulation', balance: C(180_000) }] }),
  ],
  homeStatus: 'occupied',
};

const BASIS = moneyBasis('todaysDollars', SETTINGS());

/** A result of any kind, without running a search — the headline is pure over this object. */
const result = (over) => ({
  kind: 'headroom',
  factor: undefined,
  statedAnnualSpend: undefined,
  sustainableAnnualSpend: undefined,
  atMonth: '2026-09',
  bindsAt: undefined,
  limitedBy: undefined,
  floorApplied: false,
  reason: undefined,
  walks: 0,
  ...over,
});

const say = (over, months = [], household = COUPLE, entries = []) =>
  sustainableSpendHeadline(result(over), months, household, entries, BASIS);

/** Every sentence a headline produced, as one string. */
const allOf = (headline) => [headline.headline, ...headline.perPerson, ...headline.detail].join(' ');

// --- §1 Every kind answers, and no two of them answer the same way --------------------------------

const KINDS = [
  'headroom',
  'reduceSpending',
  'higherThanSearched',
  'nothingWorks',
  'candidateRefused',
  'nothingToScale',
  'levelUnreadable',
];

test('§1 all seven kinds produce a real sentence, and seven DIFFERENT ones', () => {
  const headlines = KINDS.map((kind) =>
    say({
      kind,
      factor: 0.8,
      statedAnnualSpend: C(70_000),
      sustainableAnnualSpend: C(56_000),
      // A DIFFERENT reason per kind: one of the seven says its refusal verbatim, so one shared
      // string would make them indistinguishable here for a reason that is the fixture's, not the
      // module's.
      reason: `the ${kind} refusal in its own words, long enough to be a sentence a person could read.`,
    }),
  );
  for (const [index, headline] of headlines.entries()) {
    assert.equal(headline.kind, KINDS[index]);
    assert.ok(headline.headline.length > 60, `${KINDS[index]} must say something: "${headline.headline}"`);
    assert.ok(!headline.detail.includes(''), `${KINDS[index]} must not emit an empty sentence`);
  }
  assert.equal(new Set(headlines.map((headline) => headline.headline)).size, 7, 'no two kinds may wear the same words');
  assert.equal(KINDS.length, 7, 'there were NINE on the morning of 2026-09-21: `firstYearDecides` went with P10-5 and `holdsInvestments` with P10-4');
});

// --- §2 The refusals that are gone, and the one that is not --------------------------------------

test('§2 THE INVESTMENTS REFUSAL IS GONE, and a plan holding a parcel is given a figure (P10-4)', () => {
  // ⚠️ **THIS TEST ASSERTED THE REFUSAL UNTIL 2026-09-21.** A plan holding any parcel at all was
  // shown no figure, because the walk sold to need and then charged the capital gains tax on that
  // sale against money the month had already spent — so the forecast reported households as short in
  // months they had plenty to pay for, and a search over that converged on a confident wrong number.
  // The sale funds its own tax now, so there is nothing left to refuse. What is asserted here
  // instead is the thing the refusal was standing in for: **the search's answer must be a level the
  // walk can actually afford, and afford for the reason it says.**
  const holder = {
    ...COUPLE,
    persons: [
      { ...COUPLE.persons[0], parcels: [{ acquired: '2014-03-11', costBase: C(38_000), marketValue: C(96_500) }] },
      COUPLE.persons[1],
    ],
  };
  const answer = sustainableSpend(SETTINGS(), holder, [spend(70_000)]);
  assert.notEqual(answer.kind, 'holdsInvestments');
  assert.ok(answer.sustainableAnnualSpend > 0, 'a plan holding investments outside super is answered');
  assert.equal(answer.reason, undefined, 'and it is answered without a refusal beside it');

  // **The answer is walked, and the walk is clean** — no short month at the level the search
  // returned, which is the predicate the search claims to have applied.
  const walked = project(SETTINGS(), holder, [spend(Math.round(70_000 * answer.factor))]);
  assert.equal(walked.filter((m) => m.lines.some((l) => l.description === 'Unfunded shortfall')).length, 0);

  // **AND THE IDENTITY THE FIX RESTS ON, over every month of that walk that sold anything**: the
  // proceeds of an automatic sale, less the capital gains tax charged, are exactly what the
  // Waterfall drew from the portfolio. This is the defect stated as an equation — it used to be
  // `proceeds === drawn` with the tax landing on nothing.
  const limb3 = (month) => month.notes.find((n) => n.subject === 'waterfall limb' && n.limb === 'nonSuperPortfolio');
  const sold = walked.filter((m) => m.lines.some((l) => l.description.startsWith('Non-Super Portfolio sale')));
  assert.ok(sold.length > 0, 'the identity would be vacuous with no sale in the walk');
  const spareCent = [];
  for (const month of sold) {
    const proceeds = month.lines.filter((l) => l.description.startsWith('Non-Super Portfolio sale')).reduce((t, l) => t + l.amount, 0);
    const tax = month.lines.filter((l) => l.description.startsWith('Income tax on capital gain')).reduce((t, l) => t + l.amount, 0);
    // From 1 July 2027 the floored indexed cost base can make one more cent of proceeds LOWER the
    // gain by a cent (LR-1 slice 2), so the least sale can cover the draw with a cent to spare.
    const spare = proceeds - tax - limb3(month).drawn;
    assert.ok(spare === 0 || spare === 1, `${month.month}: the sale did not fund its own tax (${spare})`);
    if (spare === 1) spareCent.push(month.month);
  }
  // **The months with a cent to spare, pinned (LR-1 slice 2, 2026-09-29).** In each of them, replayed by
  // hand on the parcel, the year's net capital gain at the sale actually made is ONE CENT LOWER than
  // at a sale one cent smaller: the extra cent carried a cent more of the apportioned stamp, and the
  // floored indexed cost base rose by two. The tax fell a cent, so the least covering sale covers one over.
  assert.deepEqual(spareCent, ['2034-05', '2035-01', '2036-04', '2036-08', '2038-08', '2039-12']);

  // And the page shows the figure rather than a refusal, and never names the closed item.
  const headline = sustainableSpendHeadline(answer, [], holder, [spend(70_000)], BASIS);
  assert.match(allOf(headline), /\$[0-9]/, 'a figure reaches the page where a refusal used to stand');
  assert.doesNotMatch(allOf(headline), /P10-4/);
});

test('§2 THE FIRST-YEAR REFUSAL IS GONE, and the household it refused is given a figure (P10-5)', () => {
  // ⚠️ **THIS TEST ASSERTED THE REFUSAL UNTIL 2026-09-21.** A retired couple stated as at
  // 1 September was shown no figure at all, because the engine paid them no pension minimum until
  // the following 1 July. It does now, so there is nothing left to refuse. What is asserted here
  // instead is the thing the refusal was standing in for: **the same household, stated on two
  // different days, must be told roughly the same figure.** That is the identity the defect broke —
  // it was out by 2.2× to 2.6× — and it is a far stronger test than a refusal ever was.
  const retired = {
    persons: [
      person({ name: 'Sam', dateOfBirth: '1958-12-05', superInterests: [{ phase: 'accountBasedPension', balance: C(620_000), statedStreamSettings: { commencementDay: '2021-09-01' } }] }),
      person({ name: 'Ali', dateOfBirth: '1961-03-18', superInterests: [{ phase: 'accountBasedPension', balance: C(430_000), statedStreamSettings: { commencementDay: '2023-02-01' } }] }),
    ],
    homeStatus: 'occupied',
    openingOffsetBalance: C(30_000),
  };
  const september = sustainableSpend(SETTINGS(), retired, [spend(62_000)]);
  const july = sustainableSpend(SETTINGS({ asAtDate: '2026-07-01' }), retired, [spend(62_000, { date: '2026-07-01' })]);
  for (const answer of [september, july]) {
    assert.notEqual(answer.kind, 'firstYearDecides');
    assert.ok(answer.sustainableAnnualSpend > 0, 'both are answered, and neither is refused');
  }
  const gap = Math.abs(september.sustainableAnnualSpend - july.sustainableAnnualSpend) / july.sustainableAnnualSpend;
  assert.ok(gap < 0.02, `the two statements of one household differ by ${(gap * 100).toFixed(1)}% — P10-5 left them 120%+ apart`);

  // And the page shows the figure rather than a refusal.
  const headline = sustainableSpendHeadline(september, [], retired, [spend(62_000)], BASIS);
  assert.match(allOf(headline), /\$[0-9]/, 'a figure reaches the page where a refusal used to stand');
  assert.doesNotMatch(allOf(headline), /P10-5/);
});

test('§2 a refusing candidate quotes the engine rather than swallowing it', () => {
  const headline = say({ kind: 'candidateRefused', reason: 's 8(4) excess of 1234 cents for a Person with no s 8 reduction of their own' });
  assert.match(allOf(headline), /s 8\(4\) excess of 1234 cents/);
  assert.doesNotMatch(headline.headline, /\$/, 'a search that did not finish states no figure');
});

// --- §3 The figure, and the three things that must be said beside it ------------------------------

test('§3 headroom states the figure, the plan’s own figure, and how far apart they are', () => {
  const answer = sustainableSpend(SETTINGS(), COUPLE, [spend(70_000)]);
  const months = project(SETTINGS(), COUPLE, [spend(70_000)]);
  const headline = sustainableSpendHeadline(answer, months, COUPLE, [spend(70_000)], BASIS);
  assert.equal(headline.kind, 'headroom');
  assert.match(headline.headline, /\$118,6\d\d/, 'the converged figure, in whole dollars');
  assert.match(headline.headline, /\$70,000/, 'and the figure the plan states');
  assert.match(headline.headline, /69% more/);
  assert.match(headline.headline, /today’s money/);
  assert.match(allOf(headline), /2040-03/, 'the month it is limited by');
});

test('§3 reduceSpending prints the shortfall between the two figures, from the printed numbers', () => {
  const headline = say({ kind: 'reduceSpending', factor: 0.75, statedAnnualSpend: C(80_000), sustainableAnnualSpend: C(60_000), bindsAt: '2055-04', limitedBy: 'shortfall' });
  assert.match(headline.headline, /\$60,000/);
  assert.match(headline.headline, /\$80,000/);
  assert.match(headline.headline, /25% less/);
  assert.match(headline.headline, /\$20,000 a year less/, 'the gap is the two PRINTED figures subtracted');
});

test('§3 the contingency floor is reported either way, and never silently', () => {
  const withFloor = say({ kind: 'headroom', factor: 1.2, statedAnnualSpend: C(70_000), sustainableAnnualSpend: C(84_000), floorApplied: true });
  const without = say({ kind: 'headroom', factor: 1.2, statedAnnualSpend: C(70_000), sustainableAnnualSpend: C(84_000), floorApplied: false });
  assert.match(allOf(withFloor), /never dip below/);
  assert.match(allOf(without), /have not set a contingency floor/);
  assert.notEqual(allOf(withFloor), allOf(without));
});

test('§3 a month limited by the FLOOR is not described as a month that could not be paid for', () => {
  const byFloor = say({ kind: 'headroom', factor: 1.2, statedAnnualSpend: C(70_000), sustainableAnnualSpend: C(84_000), floorApplied: true, bindsAt: '2044-02', limitedBy: 'floor' });
  const byShort = say({ kind: 'headroom', factor: 1.2, statedAnnualSpend: C(70_000), sustainableAnnualSpend: C(84_000), floorApplied: true, bindsAt: '2044-02', limitedBy: 'shortfall' });
  assert.match(allOf(byFloor), /dropped below the contingency floor/);
  assert.match(allOf(byShort), /asks for money it does not have/);
  assert.doesNotMatch(allOf(byFloor), /asks for money it does not have/);
});

test('§3 a plan with several spending levels is told its shape was kept', () => {
  const many = [spend(80_000, { id: 's1' }), spend(60_000, { id: 's2', date: '2040-09-01' })];
  const one = [spend(80_000)];
  const scaled = say({ kind: 'headroom', factor: 1.1, statedAnnualSpend: C(80_000), sustainableAnnualSpend: C(88_000) }, [], COUPLE, many);
  const single = say({ kind: 'headroom', factor: 1.1, statedAnnualSpend: C(80_000), sustainableAnnualSpend: C(88_000) }, [], COUPLE, one);
  assert.match(allOf(scaled), /changes your spending 2 times/);
  assert.match(allOf(scaled), /not a suggestion that you live on one flat amount/);
  assert.doesNotMatch(allOf(single), /changes your spending/);
});

test('§3 a household still repaying a loan is told the figure is not its total outgoings', () => {
  const loan = {
    id: 'loan',
    date: '2026-09-01',
    owner: 'household',
    type: 'MORTGAGE_REFINANCE',
    params: { openingBalance: C(320_000), annualInterestRate: 0.058, monthlyRepayment: C(2_600) },
    enabled: true,
    createdAt: '2026-08-20',
  };
  const months = project(SETTINGS(), COUPLE, [spend(70_000), loan]);
  const repaying = say({ kind: 'headroom', factor: 1.1, statedAnnualSpend: C(70_000), sustainableAnnualSpend: C(77_000) }, months, COUPLE, [spend(70_000), loan]);
  const free = say({ kind: 'headroom', factor: 1.1, statedAnnualSpend: C(70_000), sustainableAnnualSpend: C(77_000) }, project(SETTINGS(), COUPLE, [spend(70_000)]), COUPLE, [spend(70_000)]);
  assert.match(allOf(repaying), /APART FROM the home loan/);
  assert.doesNotMatch(allOf(free), /APART FROM the home loan/);
});

// P13-1b — the wage-vs-price assumption behind the Age Pension's growth, said only where a month in
// the walk actually pays it.
const RETIRED_SINGLE = {
  persons: [
    person({
      name: 'Sam',
      dateOfBirth: '1958-12-05',
      superInterests: [{ phase: 'accountBasedPension', balance: C(300_000), statedStreamSettings: { commencementDay: '2021-09-01' } }],
    }),
  ],
  homeStatus: 'occupied',
};

const YOUNG_SINGLE = {
  persons: [person({ name: 'Kit', dateOfBirth: '1975-03-02', employmentIncomePerFortnight: C(4_200) })],
  homeStatus: 'occupied',
};

test('§3 the pension-indexation caveat is shown where the walk pays the Age Pension', () => {
  const months = project(SETTINGS(), RETIRED_SINGLE, [spend(40_000)]);
  const headline = say(
    { kind: 'headroom', factor: 1.1, statedAnnualSpend: C(40_000), sustainableAnnualSpend: C(44_000) },
    months,
    RETIRED_SINGLE,
    [spend(40_000)],
  );
  assert.match(allOf(headline), /keeps rising with wages/);
  assert.match(allOf(headline), /rose with prices, this figure would be lower/);
});

test('§3 the pension-indexation caveat is absent where no month pays the Age Pension', () => {
  // Horizon set short of pension age (67) so the walk never reaches it — no means test to second-guess.
  const settings = SETTINGS({ planningHorizonAge: 60 });
  const months = project(settings, YOUNG_SINGLE, [spend(60_000)]);
  const headline = say(
    { kind: 'headroom', factor: 1.1, statedAnnualSpend: C(60_000), sustainableAnnualSpend: C(66_000) },
    months,
    YOUNG_SINGLE,
    [spend(60_000)],
  );
  assert.doesNotMatch(allOf(headline), /keeps rising with wages/);
});

// The quoted level can reach a pension the current walk never pays: a higher spend runs savings down
// faster. The solver keeps none of its walks, so a factor above 1 with anyone of pension age inside
// the horizon says the caveat anyway. That is the cautious error; leaving it out would flatter the figure.
const RICH_RETIRED_SINGLE = {
  persons: [
    person({
      name: 'Jo',
      dateOfBirth: '1958-12-05',
      superInterests: [{ phase: 'accountBasedPension', balance: C(5_000_000), statedStreamSettings: { commencementDay: '2021-09-01' } }],
    }),
  ],
  homeStatus: 'occupied',
};

test('§3 the caveat is said at a HIGHER level even where the current walk pays no Age Pension', () => {
  const months = project(SETTINGS(), RICH_RETIRED_SINGLE, [spend(40_000)]);
  assert.equal(months.some((m) => m.lines.some((l) => /Age Pension/.test(l.description) && l.effect === 'cash')), false, 'fixture premise: no pension in this walk');
  const higher = say({ kind: 'headroom', factor: 3, statedAnnualSpend: C(40_000), sustainableAnnualSpend: C(120_000) }, months, RICH_RETIRED_SINGLE, [spend(40_000)]);
  assert.match(allOf(higher), /keeps rising with wages/);
  const lower = say({ kind: 'reduceSpending', factor: 0.9, statedAnnualSpend: C(40_000), sustainableAnnualSpend: C(36_000) }, months, RICH_RETIRED_SINGLE, [spend(40_000)]);
  assert.doesNotMatch(allOf(lower), /keeps rising with wages/);
});

// --- §4 The two "no answer inside the range" cases ------------------------------------------------

test('§4 the top of the range is stated as a FLOOR and never as the answer', () => {
  const headline = say({ kind: 'higherThanSearched', factor: 4, statedAnnualSpend: C(20_000), sustainableAnnualSpend: C(80_000) });
  assert.match(headline.headline, /\$80,000/);
  assert.match(allOf(headline), /floor and not the answer/);
  assert.match(allOf(headline), /will not guess/);
});

test('§4 a plan nothing works for is told that spending is not what is driving it', () => {
  const headline = say({ kind: 'nothingWorks', bindsAt: '2026-11', limitedBy: 'shortfall' });
  assert.match(headline.headline, /no spending level this plan can afford/);
  assert.match(allOf(headline), /something other than how much you spend/);
  assert.match(allOf(headline), /condition of release/);
  assert.deepEqual(headline.perPerson, ['Kit will be 51.', 'Lee will be 47.']);
});

test('§4 a plan with no spending level is not shown a $0 answer', () => {
  const headline = say({ kind: 'nothingToScale' });
  assert.doesNotMatch(allOf(headline), /\$0/);
  assert.match(headline.headline, /does not say what you spend/);
});

// --- §5 The page wiring, pinned as source ----------------------------------------------------------

test('§5 main.ts mounts it, clears it on every redraw, and never runs it on load', () => {
  const main = read('app', 'main.ts');
  assert.match(main, /sustainableSpendHeadline/);
  assert.match(main, /getElementById\('sustainable-spend'\)/);
  assert.match(main, /resetSustainable\(\);/, 'the answer is cleared on every redraw');
  // The search is behind a click and behind a yield, so the page can paint "Working it out…".
  assert.match(main, /addEventListener\('click'/);
  assert.match(main, /setTimeout\(\(\) => \{/);
});

test('§5 the section exists in the page and is not hidden by default', () => {
  const html = readFileSync(join(ROOT, 'public', 'index.html'), 'utf8');
  assert.match(html, /<section id="sustainable-spend"><\/section>/);
  assert.doesNotMatch(html, /<section id="sustainable-spend" hidden>/);
});

// --- §6 Layering ------------------------------------------------------------------------------------

/** Comments out, string literals blanked — so prose cannot satisfy a source assertion. */
const executableCode = (text) =>
  text
    .replaceAll(/\/\*[\s\S]*?\*\//g, '')
    .replaceAll(/`(?:[^`\\]|\\.)*`|'(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*"|\/\/.*$/gm, (match) =>
      match.startsWith('//') ? '' : '""',
    );

test('§6 the solver is core: no app import, and no DOM in its code', () => {
  const source = read('core', 'sustainableSpend.ts');
  assert.doesNotMatch(source, /from '\.\.\/app\//);
  // Comments and strings stripped first — this module's prose uses the word "window" for the
  // opening part financial year, and a blunt grep over the whole file reads that as a DOM global.
  assert.doesNotMatch(executableCode(source), /\bdocument\b|\bwindow\b/);
});

// --- §7 The prose pins are not vacuous ---------------------------------------------------------------

test('§7 emptying the prose breaks every assertion above that reads it', () => {
  // Each entry is a live assertion from this file, re-run against a headline whose sentences have
  // been emptied. Every one must throw; one that does not was comparing a value with itself.
  const emptied = { headline: '', perPerson: [], detail: [] };
  const checks = [
    () => assert.ok(emptied.headline.length > 60),
    () => assert.match(allOf(emptied), /P10-4/),
    () => assert.match(allOf(emptied), /never dip below/),
    () => assert.match(allOf(emptied), /APART FROM the home loan/),
    () => assert.match(allOf(emptied), /floor and not the answer/),
    () => assert.match(allOf(emptied), /something other than how much you spend/),
    () => assert.match(allOf(emptied), /dropped below the contingency floor/),
    () => assert.match(allOf(emptied), /keeps rising with wages/),
  ];
  for (const [index, check] of checks.entries()) {
    assert.throws(check, `check ${index} passes on emptied prose and is therefore vacuous`);
  }
});
