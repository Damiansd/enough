// plan_ai.md §12.2 kind 2 and §13 — no unlabelled money leaves a tool.
//
// `toolOutput` refuses a raw "N cents" and any `$` figure not followed by the REQUESTED basis tag.
// Engine prose carrying such a figure is rebuilt with a labelled figure where an exported helper
// wrote it, and has the figure alone replaced by FIGURE_OMITTED where none did.
//
// Every expectation is derived here from the engine's own raw sentence, with this file's own
// patterns, and never by calling `labelledProse` a second time.
import test from 'node:test';
import assert from 'node:assert/strict';

import { formatCents, toCents } from '../dist/core/money.js';
import { PENSION_AT_RETIREMENT_NOTE_TEXT, project } from '../dist/core/projection.js';
import { DEMO_PLAN } from '../dist/app/demoHousehold.js';
import { FIGURE_OMITTED, labelledFigure, labelledProse } from '../dist/app/chat/tools/basisLabelled.js';
import { getMonth, monthOrRefusal } from '../dist/app/chat/tools/getMonth.js';
import { getMarkers } from '../dist/app/chat/tools/getMarkers.js';
import { IdentityLeakError, toolOutput } from '../dist/app/chat/tools/identity.js';
import { TODAYS_WAGES_TAG, UnlabelledMoneyError, moneyChecked } from '../dist/app/chat/tools/moneyGuard.js';
import { moneyBasis } from '../dist/app/todaysDollars.js';

const OMITTED = `[${FIGURE_OMITTED}]`;
const TAG = { todaysDollars: '(today’s money)', futureDollars: '(future dollars)' };

const planOf = (settings, household, entries) => ({
  version: DEMO_PLAN.version,
  settings,
  household,
  entries,
  scenarios: [{ id: 'base', name: 'Base', parentId: null, entryIds: entries.map(({ id }) => id) }],
  activeScenarioId: 'base',
});
const entry = (id, type, date, owner, params) => ({ id, date, owner, type, params, enabled: true, createdAt: '2026-08-20' });

// SYNTHETIC: `test/app-chat-get-month.test.mjs`'s fixture. Its Non-Super Portfolio pays franked
// distributions, and its super income yield is franked, so the earnings tax credit sentences appear.
const RICH = planOf(
  {
    asAtDate: '2026-09-01',
    planningHorizonAge: 72,
    economicSeries: { cpi: 0.025, pblci: 0.025, awote: 0.035, mtawe: 0.035 },
    deemingRates: { lower: 0.0175, upper: 0.0375 },
    nominalReturn: 0.065,
    investmentPayoutRate: 0.02,
    investmentPayoutFrankedShare: 0.5,
    superIncomeYieldRate: 0.03,
    superIncomeYieldFrankedShare: 0.1,
  },
  {
    persons: [
      {
        name: 'Wilhelmina Quartermaine',
        dateOfBirth: '1964-01-01',
        superInterests: [
          { phase: 'accumulation', balance: toCents(300_000), statedAdministrationFeePerYear: toCents(125), statedInvestmentFeeRate: 0.005 },
          { phase: 'ttr', balance: toCents(200_000), statedStreamSettings: { commencementDay: '2025-07-01', statedTtrDrawdownRate: 0.07 } },
        ],
        parcels: [{ acquired: '2014-03-11', costBase: toCents(38_000), marketValue: toCents(96_500) }],
        employmentIncomePerFortnight: toCents(3_000),
        workBonusBalance: toCents(0),
      },
      {
        name: 'Bartholomew Fenwick-Oyelaran',
        dateOfBirth: '1959-04-03',
        superInterests: [
          { phase: 'accumulation', balance: toCents(100_000) },
          { phase: 'accountBasedPension', balance: toCents(150_000), statedStreamSettings: { commencementDay: '2022-08-01' } },
        ],
        parcels: [{ acquired: '2016-03-11', costBase: toCents(20_000), marketValue: toCents(30_000) }],
        employmentIncomePerFortnight: toCents(0),
        workBonusBalance: toCents(0),
      },
    ],
    homeStatus: 'occupied',
    openingOffsetBalance: toCents(60_000),
  },
  [
    entry('spend', 'SPEND_CHANGE', '2026-09-01', 'household', { annualSpend: toCents(70_000) }),
    entry('sac', 'SUPER_CONTRIBUTION', '2026-09-01', 'personA', { kind: 'salarySacrificed', annualAmount: toCents(8_000), interestIndex: 0 }),
    entry('sac-stop', 'SUPER_CONTRIBUTION', '2027-09-01', 'personA', { kind: 'stopped' }),
    entry('retire-a', 'RETIRE', '2028-01-01', 'personA', {}),
  ],
);

// SYNTHETIC: one Person on $10,000 a fortnight, so Division 293 is charged every month.
const DIV293 = planOf(
  {
    asAtDate: '2026-07-01',
    planningHorizonAge: 52,
    economicSeries: { cpi: 0.025, pblci: 0.025, awote: 0, mtawe: 0.035 },
    deemingRates: { lower: 0.0175, upper: 0.0375 },
    nominalReturn: 0.065,
    cashInterestRate: 0,
  },
  {
    persons: [
      {
        name: 'Valentina Okonkwo-Brandt',
        dateOfBirth: '1976-05-10',
        superInterests: [{ phase: 'accumulation', balance: toCents(300_000) }],
        parcels: [],
        employmentIncomePerFortnight: toCents(10_000),
        workBonusBalance: toCents(0),
      },
    ],
    homeStatus: 'occupied',
  },
  [entry('spend', 'SPEND_CHANGE', '2026-07-01', 'household', { annualSpend: toCents(60_000) })],
);

// SYNTHETIC: `test/core-projection-concessional-cap-year.test.mjs`'s Kit, sacrificing exactly the
// room left in July 2027, so wages carry the year over the cap and the walk writes its note.
const CAP = planOf(
  {
    asAtDate: '2027-07-01',
    planningHorizonAge: 50,
    economicSeries: { cpi: 0.025, pblci: 0.025, awote: 0.035, mtawe: 0.035 },
    deemingRates: { lower: 0.0175, upper: 0.0375 },
    nominalReturn: 0,
    cashInterestRate: 0,
  },
  {
    persons: [
      {
        name: 'Kit Marchbanks',
        dateOfBirth: '1980-03-15',
        superInterests: [{ phase: 'accumulation', balance: toCents(0) }],
        parcels: [],
        employmentIncomePerFortnight: toCents(6_000),
        workBonusBalance: toCents(0),
      },
    ],
    homeStatus: 'occupied',
  },
  [entry('s', 'SUPER_CONTRIBUTION', '2027-07-01', 'personA', { kind: 'salarySacrificed', annualAmount: toCents(13_780), interestIndex: 0 })],
);

const walkOf = (plan) => project(plan.settings, plan.household, plan.entries);
const PLANS = [
  ['the demo', DEMO_PLAN],
  ['the franked fixture', RICH],
  ['the Division 293 fixture', DIV293],
  ['the cap fixture', CAP],
];

const stringsIn = (value) => (typeof value === 'string' ? [value] : value !== null && typeof value === 'object' ? Object.values(value).flatMap(stringsIn) : []);

// --- The guard -----------------------------------------------------------------------------------

test('the guard throws on a raw cents figure and on a $ figure without the requested tag', () => {
  const refused = (text, view = 'todaysDollars') => assert.throws(() => moneyChecked(JSON.stringify({ text }), view), UnlabelledMoneyError, text);
  const passed = (text, view = 'todaysDollars') => assert.equal(moneyChecked(JSON.stringify({ text }), view), JSON.stringify({ text }), text);
  refused('15% of 3120000 cents');
  refused('-12 cents of tax');
  refused('the 45600 cent credit');
  refused('$250,000 threshold');
  refused('a distribution of $512.34 this month');
  refused('$512.34 (future dollars)'); // the wrong basis for the request
  refused('$512.34 (today’s money)', 'futureDollars');
  refused('$512.34 (today’s money)', 'nominal'); // no basis this build has
  refused('$512.34(today’s money)'); // not IMMEDIATELY followed
  refused('$1,000.00 (today’s money) and $2.00');
  passed('$512.34 (today’s money)');
  passed('-$1,512.34 (today’s money) came in');
  passed('$512.34 (future dollars)', 'futureDollars');
  passed('every cent of Division 293 tax; 15 percent; FY2026-27; interest 0');
  passed(`15% of ${OMITTED}`);
});

test('a salary’s tag, "(in today’s wages)", passes in either view, whole and exact, and nothing looser does', () => {
  const refused = (text, view = 'todaysDollars') => assert.throws(() => moneyChecked(JSON.stringify({ text }), view), UnlabelledMoneyError, text);
  const passed = (text, view = 'todaysDollars') => assert.equal(moneyChecked(JSON.stringify({ text }), view), JSON.stringify({ text }), text);
  assert.equal(TODAYS_WAGES_TAG, 'in today’s wages');
  passed('3 days a week at $60,000.00 (in today’s wages) a year');
  passed('3 days a week at $60,000.00 (in today’s wages) a year', 'futureDollars');
  refused('$60,000.00 (in today\'s wages)'); // a straight apostrophe is not the tag
  refused('$60,000.00 (today’s wages)');
  refused('$60,000.00 (in todays wages)');
  refused('$60,000.00 (in today’s wage)');
  refused('$60,000.00 (in wages)');
  refused('$60,000.00 (in today’s wages, roughly)');
  refused('$60,000.00 (in today’s wages ');
  refused('$60,000.00(in today’s wages)'); // not IMMEDIATELY followed
  refused('$60,000.00 (IN TODAY’S WAGES)');
});

test('toolOutput runs the money guard after the identity guard, and never scrubs', () => {
  const household = { persons: [{ name: 'Wilhelmina Quartermaine', dateOfBirth: '1963-11-27' }] };
  assert.throws(() => toolOutput(household, { note: '3120000 cents' }, 'todaysDollars'), UnlabelledMoneyError);
  assert.throws(() => toolOutput(household, { note: '$1.00 (future dollars)' }, 'todaysDollars'), UnlabelledMoneyError);
  assert.throws(() => toolOutput(household, { note: 'Wilhelmina, 3120000 cents' }, 'todaysDollars'), IdentityLeakError);
  const clean = { amount: '$1.00 (today’s money)', note: `15% of ${OMITTED}` };
  assert.equal(toolOutput(household, clean, 'todaysDollars'), JSON.stringify(clean));
});

// --- Every month, both bases ---------------------------------------------------------------------

for (const [label, plan] of PLANS) {
  test(`${label}: every month in both bases carries no raw cents, and every $ figure is tagged with the basis asked for`, () => {
    let omitted = 0;
    let dollars = 0;
    for (const view of ['todaysDollars', 'futureDollars']) {
      for (const month of walkOf(plan)) {
        const text = getMonth(plan, month.month, { basis: view });
        assert.doesNotMatch(text, /\d cents?\b/, month.month);
        for (const match of text.matchAll(/\$\d[\d,]*(?:\.\d+)?(?!\d|[.,]\d)/g)) {
          dollars += 1;
          assert.equal(text.slice(match.index + match[0].length, match.index + match[0].length + TAG[view].length + 1), ` ${TAG[view]}`, `${month.month}: ${match[0]}`);
        }
        omitted += text.split(OMITTED).length - 1;
      }
      JSON.parse(getMarkers(plan, { basis: view }));
    }
    assert.ok(dollars > 0);
    // Each fixture's walk writes at least one raw figure, so the check above is not vacuous.
    assert.ok(omitted > 0, `${label}: no raw figure was reached`);
  });
}

// --- Omitted: sentences no exported helper wrote -------------------------------------------------

/** The engine's own sentence, every figure it writes raw replaced here by the omission. */
const omittedFrom = (text) =>
  text
    .replace(/-?\d+ cents?\b/g, OMITTED)
    .replace(/by which \d+ exceeds/g, `by which ${OMITTED} exceeds`)
    .replace(/\$\d[\d,]*(?:\.\d+)?(?!\d|[.,]\d)/g, OMITTED);

/** Every provenance sentence of every line of `plan`'s walk that carries a raw figure, beside what `getMonth` sent. */
const provenancePairs = (plan) =>
  walkOf(plan).flatMap((month) => {
    const out = monthOrRefusal(plan, month.month);
    return month.lines.flatMap((line, index) => {
      const sent = out.lines[index].provenance;
      const raw = line.provenance;
      return raw.basis === 'legislated'
        ? [...raw.caveats.map((text, at) => [text, sent.caveats[at]]), ...raw.determination.map((text, at) => [text, sent.determination[at]])]
        : [[raw.note, sent.note]];
    });
  }).filter(([raw]) => /\d cents?\b|\$\d/.test(raw));

test('a provenance sentence with a raw figure goes out with that figure alone omitted, the rest word for word', () => {
  const kinds = new Set();
  for (const plan of [DEMO_PLAN, DIV293]) {
    for (const [raw, sent] of provenancePairs(plan)) {
      assert.equal(sent, omittedFrom(raw));
      kinds.add(sent.replace(/\d[\d.,]*/g, '#'));
    }
  }
  // The sentence kinds this build writes, as they go out.
  for (const kind of [
    `${OMITTED} of employer Superannuation Guarantee, less ${OMITTED} of contributions tax at #`,
    `the low tax contributions limb bound: #% of ${OMITTED}, being the lesser of ${OMITTED} of low tax contributions and the ${OMITTED} by which ${OMITTED} exceeds the ${OMITTED} threshold`,
  ]) {
    assert.ok(kinds.has(kind), kind);
  }
  // The register's statutory $ figures carry no basis either, and are omitted the same way.
  assert.ok([...kinds].some((kind) => kind.includes(`so ${OMITTED} of income with ${OMITTED} of contributions is over the ${OMITTED} threshold`)));
});

test('the franked fixture’s earnings tax sentences omit every raw figure', () => {
  const sent = provenancePairs(RICH).map(([raw, out]) => {
    assert.ok(!/Wilhelmina|Bartholomew/.test(out));
    return out.replace(/\d[\d.,]*/g, '#');
  });
  assert.ok(sent.some((kind) => kind.endsWith(`grossed up for a # stated franked share: ${OMITTED} at # less the ${OMITTED} credit`)));
  assert.ok(sent.some((kind) => kind.startsWith(`the ${OMITTED} credit exceeded the ${OMITTED} liability it was set against`)));
  assert.ok(sent.some((kind) => kind === `${OMITTED} sacrificed, less ${OMITTED} of contributions tax at #`));
});

test('the Guarantee note is written inline, so its figures are omitted and its own figure fields are labelled', () => {
  const month = walkOf(DEMO_PLAN)[0];
  const raw = month.notes.find((note) => note.subject === 'superannuation guarantee');
  const sent = monthOrRefusal(DEMO_PLAN, month.month).notes.find((note) => note.subject === 'superannuation guarantee');
  assert.equal(sent.note, omittedFrom(raw.note));
  assert.match(sent.note, /This month \[figure omitted: not labelled\] of it was paid into interest \d/);
  assert.equal(sent.creditedToSuperannuation, labelledFigure(raw.creditedToSuperannuation, moneyBasis('todaysDollars', DEMO_PLAN.settings), month.month));
});

// --- Rebuilt: sentences an exported helper wrote -------------------------------------------------

const rebuiltCheck = (plan, subject, figures) => {
  let seen = 0;
  for (const view of ['todaysDollars', 'futureDollars']) {
    const basis = moneyBasis(view, plan.settings);
    for (const month of walkOf(plan)) {
      const out = monthOrRefusal(plan, month.month, { basis: view });
      month.notes.forEach((note, index) => {
        if (note.subject !== subject) return;
        seen += 1;
        const cents = (match) => Number(match.slice(0, -' cents'.length));
        const expected = plan.household.persons
          .reduce((text, person, at) => text.replaceAll(person.name, ['Person A', 'Person B'][at]), note.note)
          .replace(figures, (match) => labelledFigure(cents(match), basis, month.month));
        // The scale, pinned without the lens: future dollars ARE the engine's cents, formatted.
        if (view === 'futureDollars') for (const match of note.note.match(figures)) assert.ok(out.notes[index].note.includes(`${formatCents(cents(match))} (future dollars)`), match);
        assert.equal(out.notes[index].note, expected);
        assert.ok(!out.notes[index].note.includes(OMITTED));
        assert.ok(out.notes[index].note.includes(TAG[view]));
      });
    }
  }
  return seen;
};

test('the investment distribution note is rebuilt with its figure labelled at the note’s month, in the basis asked for', () => {
  assert.ok(rebuiltCheck(RICH, 'investment distribution', /\d+ cents/g) > 0);
});

test('the concessional cap note is rebuilt with all five figures labelled', () => {
  assert.equal(rebuiltCheck(CAP, 'concessional cap exceeded', /\d+ cents/g), 2);
  const month = walkOf(CAP).find((each) => each.notes.some((note) => note.subject === 'concessional cap exceeded'));
  const note = monthOrRefusal(CAP, month.month).notes.find((each) => each.subject === 'concessional cap exceeded').note;
  assert.equal(note.match(/\$[\d,]+\.\d\d \(today’s money\)/g).length, 5);
  // Today's money is not future dollars here: the lens was applied, not merely a tag.
  assert.notEqual(note, monthOrRefusal(CAP, month.month, { basis: 'futureDollars' }).notes.find((each) => each.subject === 'concessional cap exceeded').note.replaceAll(TAG.futureDollars, TAG.todaysDollars));
});

test('the over-the-cap note: the walk’s credit is rebuilt labelled; the published cap in the helper’s literal is omitted', () => {
  const basis = moneyBasis('todaysDollars', DEMO_PLAN.settings);
  const figure = (cents) => labelledFigure(cents, basis, '2031-07');
  const raw = PENSION_AT_RETIREMENT_NOTE_TEXT['over the cap']('Person A', '$2,100,000.00', '2031-07-01', 'super account 1');
  const [, cap] = raw.match(/over the (\$[\d,]+\.\d\d) transfer balance cap/);
  const sent = labelledProse(raw, figure);
  assert.equal(sent, raw.replace('$2,100,000.00', () => figure(toCents(2_100_000))).replace(cap, OMITTED));
  moneyChecked(JSON.stringify(sent), 'todaysDollars');
});
