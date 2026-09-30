// plan_ai.md §5 and §13 microtask 5 — `getMonth`: one month's whole breakdown, through the identity
// guard, every figure labelled with its basis, `appliedEntryIds` carried, and a month the walk does
// not hold refused by name rather than answered with the nearest one.
//
// Provenance still carries names (a franked amount's stated source, the Division 293 release
// determinations). Each is translated by the helper that wrote it; a named sentence no helper wrote
// goes out as `SOURCE_OMITTED`, alone, and never raw.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';

import { toCents } from '../dist/core/money.js';
import { project } from '../dist/core/projection.js';
import { DEMO_ENTRIES, DEMO_HOUSEHOLD, DEMO_PLAN, DEMO_SETTINGS } from '../dist/app/demoHousehold.js';
import { FIGURE_OMITTED, labelledFigure } from '../dist/app/chat/tools/basisLabelled.js';
import { anonymousAges, anonymousProvenanceText } from '../dist/app/chat/tools/identity.js';
import { SOURCE_OMITTED, getMonth, monthOrRefusal } from '../dist/app/chat/tools/getMonth.js';
import { moneyBasis } from '../dist/app/todaysDollars.js';

const NAME_PARTS = ['Wilhelmina', 'Quartermaine', 'Bartholomew', 'Fenwick', 'Oyelaran', 'Valentina', 'Okonkwo', 'Brandt'];

const planOf = (settings, household, entries, scenarios = [{ id: 'base', name: 'Base', parentId: null, entryIds: entries.map(({ id }) => id) }], activeScenarioId = scenarios[0].id) => ({
  version: DEMO_PLAN.version,
  settings,
  household,
  entries,
  scenarios,
  activeScenarioId,
});

// The demo, with names no ordinary word contains.
const RENAMED = {
  ...DEMO_HOUSEHOLD,
  persons: DEMO_HOUSEHOLD.persons.map((person, index) => ({ ...person, name: ['Wilhelmina Quartermaine', 'Bartholomew Fenwick-Oyelaran'][index] })),
};
const DEMO = { ...DEMO_PLAN, household: RENAMED };

// SYNTHETIC: the fixture from fd02679 (`test/app-chat-identity.test.mjs`), copied, and pinned to that
// file's hash below so the copy cannot drift from it. It reaches every named line kind, and its super
// income yield is franked, so its provenance carries both Persons' names.
const RICH_HOUSEHOLD = {
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
};
const RICH_SETTINGS = {
  asAtDate: '2026-09-01',
  planningHorizonAge: 72,
  economicSeries: { cpi: 0.025, pblci: 0.025, awote: 0.035, mtawe: 0.035 },
  deemingRates: { lower: 0.0175, upper: 0.0375 },
  nominalReturn: 0.065,
  investmentPayoutRate: 0.02,
  investmentPayoutFrankedShare: 0.5,
  superIncomeYieldRate: 0.03,
  superIncomeYieldFrankedShare: 0.1,
};
const entry = (id, type, date, owner, params) => ({ id, date, owner, type, params, enabled: true, createdAt: '2026-08-20' });
const RICH_ENTRIES = [
  entry('spend', 'SPEND_CHANGE', '2026-09-01', 'household', { annualSpend: toCents(70_000) }),
  entry('sac', 'SUPER_CONTRIBUTION', '2026-09-01', 'personA', { kind: 'salarySacrificed', annualAmount: toCents(8_000), interestIndex: 0 }),
  entry('sac-stop', 'SUPER_CONTRIBUTION', '2027-09-01', 'personA', { kind: 'stopped' }),
  entry('spouse', 'SPOUSE_CONTRIBUTION', '2026-11-01', 'personA', { amount: toCents(3_000), receivingInterestIndex: 0 }),
  entry('sell', 'NON_SUPER_INVESTMENT', '2027-03-01', 'personA', { direction: 'sell', amount: toCents(10_000) }),
  entry('buy', 'NON_SUPER_INVESTMENT', '2027-05-01', 'personB', { direction: 'buy', amount: toCents(5_000), incidentalCostsOfAcquisition: toCents(20) }),
  entry('retire-a', 'RETIRE', '2028-01-01', 'personA', {}),
  entry('lump', 'LUMP_SUM_FROM_SUPER', '2029-02-01', 'personA', { amount: toCents(5_000), interestIndex: 0 }),
];
const RICH = planOf(RICH_SETTINGS, RICH_HOUSEHOLD, RICH_ENTRIES);

// SYNTHETIC: one Person on $10,000 a fortnight who elects a Division 293 release and stops work a
// year in (`test/core-division293-release-charge.test.mjs`'s Val), so the July 2027 settlement writes
// the release lines whose determinations name her.
const releasePlan = (name) =>
  planOf(
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
          name,
          dateOfBirth: '1976-05-10',
          superInterests: [{ phase: 'accumulation', balance: toCents(300_000), statedReleaseAuthorityDestination: 'division293' }],
          parcels: [],
          employmentIncomePerFortnight: toCents(10_000),
          workBonusBalance: toCents(0),
        },
      ],
      homeStatus: 'occupied',
    },
    [
      entry('spend', 'SPEND_CHANGE', '2026-07-01', 'household', { annualSpend: toCents(60_000) }),
      entry('stop', 'WORK_PATTERN_CHANGE', '2027-07-01', 'personA', { daysPerWeek: 0, annualSalary: toCents(0) }),
    ],
  );
const RELEASE = releasePlan('Valentina Okonkwo-Brandt');

const walkOf = (plan) => project(plan.settings, plan.household, plan.entries);
const DEMO_WALK = walkOf(DEMO);
const RICH_WALK = walkOf(RICH);

test('the copied fixture is the fd02679 fixture', () => {
  // 2026-09-24: hashed without `closingNonSuperPortfolio`, a balance the walk already held at the
  // close — so this is still the digest of every figure it pinned before.
  // The full walk's own digest is pinned in `app-month-to-rows.test.mjs`.
  // **RE-PINNED 2026-09-24 (T135).** Both fixtures cross the assets-test free area, so the assets
  // excess now floors to the nearest $500 (SSA 1991 s1064 point 1064-G7) and the Age Pension a
  // handful of their months pay is a few cents to a few dollars higher than before — see
  // `test/core-age-pension.test.mjs`'s T135 tests for the hand-worked rule.
  // **RE-PINNED 2026-09-25 (P3-17 slice 4) — RICH only.** Wilhelmina's accumulation interest states
  // `statedAdministrationFeePerYear` and this fixture retires her (`retire-a`, 2028-01-01), so the
  // fee is now raised by WAGES before that day and by CPI after it, not CPI throughout — mechanically
  // a few cents a month more before the switch (3.5% > 2.5%), byte-identical after it (the flat limb
  // does not depend on balance, and both old and new code raise a retirement-phase account by CPI).
  // Traced against an isolated re-run of this exact fixture: every diff is on the fee line itself or
  // a downstream cent of `protectedAssets`/`superBalance`, max $12.65 over the whole 113-month walk —
  // the DEMO digest below is untouched because `demoHousehold.ts` states no fee anywhere.
  // 2026-09-25: and without `assetsTestThresholds`, read off the entitlement the walk already computed — no figure.
  // RE-PINNED 2026-09-29 (LR-1 slice 2): both digests, and only the limb-3 `available` probe moved in
  // either — see `app-chat-identity.test.mjs`'s copy of this test for the counts and directions.
  // RE-PINNED 2026-09-29 (LR-1 slice 3): the DEMO digest moved with Div 119's minimum tax on Dana's
  // sales from 2033-03 — the mechanism and figures are in `app-chat-identity.test.mjs`'s copy.
  const sha256 = (value) =>
    createHash('sha256')
      .update(JSON.stringify(value, (key, field) => (key === 'closingNonSuperPortfolio' || key === 'assetsTestThresholds' || key === 'concessionalCapByPerson' ? undefined : field)))
      .digest('hex');
  // RE-PINNED 2026-09-29 (LR-1 slice 3, Div 119's minimum tax): RICH moved only in the limb-3
  // `available` probe again, DOWN in 36 months from 2028-01 (after Wilhelmina's RETIRE, selling
  // everything would now pay the minimum tax). No line moved.
  // RE-PINNED 2026-09-30 (LR-3, low income super tax offset): no figure moved. Wilhelmina qualifies for
  // 81000 cents for FY2027-28, and her only account is a pension by July 2028 (her RETIRE), so one
  // `low income super tax offset not paid` note is inserted in 2028-07; a whole-walk diff finds that note
  // (and the later notes of that month shifted one place) and nothing else.
  // RE-PINNED 2026-09-30 (P3-4b): caveat text only on RICH's sacrifice credit lines; proved in `app-chat-identity.test.mjs`.
  assert.equal(sha256(RICH_WALK), 'c3f7baeaaf79630cee30383e43d37b3687910e3d031d8a87af36a3db81fc5c0b');
  // RE-PINNED 2026-09-29 (LR-1 slice 4): no figure moved. Dana's 11 `Income tax on capital gain` lines (2033-03 to 2035-05) each gained one `determination` entry, `CGT_MINIMUM_TAX_DETERMINATION`; a whole-walk diff finds those 11 and nothing else.
  assert.equal(sha256(project(DEMO_SETTINGS, DEMO_HOUSEHOLD, DEMO_ENTRIES)), '806fab4f7571820896d81b56900400b22494a361327855fb0c3b271e2e0ecc81');
});

// --- Every month, through the guard, every amount labelled ---------------------------------------

const TODAY = ' (today’s money)';
/** The only numbers a month may carry that are not money: an age, and a note's rate. A super account goes out named. */
const NOT_MONEY = /^(ages\.\d+\.age|notes\.\d+\.chargePercentage)$/;

const numbersIn = (value, path = []) =>
  typeof value === 'number'
    ? [path.join('.')]
    : value !== null && typeof value === 'object'
      ? Object.entries(value).flatMap(([key, child]) => numbersIn(child, [...path, key]))
      : [];
const stringsIn = (value) =>
  typeof value === 'string' ? [value] : value !== null && typeof value === 'object' ? Object.values(value).flatMap(stringsIn) : [];

for (const [label, plan, walk] of [['the demo walk', DEMO, DEMO_WALK], ['the fd02679 fixture', RICH, RICH_WALK]]) {
  test(`${label}: every month goes out through the guard, with no name, every amount labelled and appliedEntryIds whole`, () => {
    const basis = moneyBasis('todaysDollars', plan.settings);
    let cited = 0;
    for (const month of walk) {
      const text = getMonth(plan, month.month);
      for (const part of NAME_PARTS) assert.ok(!text.includes(part), `${month.month}: ${part}`);
      const out = JSON.parse(text);
      assert.equal(out.month, month.month);
      assert.equal(out.basis, 'today’s money');
      // No number goes out that is money.
      assert.deepEqual(numbersIn(out).filter((path) => !NOT_MONEY.test(path)), [], month.month);
      // Every dollar figure carries its basis, word for word.
      for (const string of stringsIn(out)) {
        for (const match of string.matchAll(/-?\$[\d,]+\.\d\d/g)) assert.equal(string.slice(match.index + match[0].length, match.index + match[0].length + TODAY.length), TODAY, string);
      }
      // Each amount is the engine's own cents through the page's lens: labelled, not merely a string.
      const figure = (cents) => labelledFigure(cents, basis, month.month);
      assert.deepEqual(out.lines.map(({ amount, direction }) => [amount, direction]), month.lines.map(({ amount, direction }) => [figure(amount), direction]));
      assert.equal(out.balances.closingBalance, figure(month.closingBalance));
      assert.equal(out.balances.accessibleAssets, figure(month.accessibleAssets));
      assert.equal(out.notes.length, month.notes.length);
      assert.deepEqual(out.appliedEntryIds, month.appliedEntryIds, month.month);
      cited += out.appliedEntryIds.length;
      assert.deepEqual(out.ages, anonymousAges(plan.household, month.month));
      assert.ok(!text.includes(SOURCE_OMITTED), `${month.month}: every named provenance sentence in this walk has a helper`);
    }
    assert.ok(cited > 0, 'no month cited an entry, so the appliedEntryIds check proved nothing');
  });
}

test('a waterfall note’s figures are labelled; a super account is not money and goes out named', () => {
  const month = RICH_WALK.find((each) => each.notes.some((note) => note.subject === 'super withdrawal'));
  const out = monthOrRefusal(RICH, month.month);
  const limb = out.notes.find((note) => note.subject === 'waterfall limb');
  assert.match(limb.available, /^\$[\d,]+\.\d\d \(today’s money\)$/);
  assert.match(limb.drawn, /^\$[\d,]+\.\d\d \(today’s money\)$/);
  const withdrawal = out.notes.find((note) => note.subject === 'super withdrawal');
  assert.match(withdrawal.superAccount, /^super account [1-9]\d*$/);
  assert.equal(Object.hasOwn(withdrawal, 'interestIndex'), false);
  assert.match(withdrawal.paid, /\(today’s money\)$/);
  assert.match(withdrawal.person, /^Person [AB]$/);
});

test('every super account a note names goes out counted from 1, as the page numbers them', () => {
  let seen = 0;
  for (const month of RICH_WALK) {
    const out = monthOrRefusal(RICH, month.month);
    month.notes.forEach((note, index) => {
      const sent = out.notes[index];
      if ('interestIndex' in note) {
        assert.equal(sent.superAccount, note.interestIndex === null ? null : `super account ${note.interestIndex + 1}`, `${month.month} ${note.subject}`);
        if (note.interestIndex !== null) seen += 1;
      }
      if ('interestIndexes' in note) {
        assert.deepEqual(sent.superAccounts, note.interestIndexes.map((position) => `super account ${position + 1}`), `${month.month} ${note.subject}`);
        seen += note.interestIndexes.length;
      }
    });
  }
  assert.ok(seen > 0, 'no note in the fixture names a super account');
  assert.ok(RICH_WALK.some((month) => month.notes.some((note) => note.interestIndex === 1 || note.interestIndexes?.includes(1))), 'the fixture never names a second account');
});

test('the home loan says it is absent rather than leaving a hole; a stated one is a labelled figure', () => {
  assert.equal(monthOrRefusal(RICH, '2027-01').balances.mortgageBalance, 'no home loan in force this month');
  const owing = DEMO_WALK.find((month) => month.mortgageBalance !== undefined);
  if (owing !== undefined) assert.match(monthOrRefusal(DEMO, owing.month).balances.mortgageBalance, /\(today’s money\)$/);
  assert.deepEqual(monthOrRefusal(DEMO, DEMO_WALK[0].month).balances.byPerson.map(({ person }) => person), ['Person A', 'Person B']);
});

test('future dollars on request: the engine’s cents, labelled as such', () => {
  const month = RICH_WALK.at(-1);
  const out = monthOrRefusal(RICH, month.month, { basis: 'futureDollars' });
  assert.equal(out.basis, 'future dollars');
  assert.equal(out.lines[0].amount, labelledFigure(month.lines[0].amount, moneyBasis('futureDollars', RICH_SETTINGS), month.month));
  assert.match(out.lines[0].amount, /\(future dollars\)$/);
  assert.deepEqual(monthOrRefusal(RICH, month.month, { basis: 'nominal' }).refused, 'UNKNOWN_BASIS');
});

// --- Provenance ----------------------------------------------------------------------------------

const frankingCaveat = (who) =>
  `the franked amount and the franking credit are stated from ${who}'s own stated share of this interest's income already taxed at company level, not derived from any rate (register §5A.1, T43)`;

test('a franked amount’s stated source is translated, on the line and on the month', () => {
  const months = RICH_WALK.filter((month) => month.provenance.caveats.some((caveat) => caveat.includes('are stated from')));
  assert.ok(months.length > 0);
  for (const month of months) {
    const out = monthOrRefusal(RICH, month.month);
    const lineCaveats = out.lines.flatMap((line) => line.provenance.caveats ?? []).filter((caveat) => caveat.includes('are stated from'));
    assert.ok(lineCaveats.length > 0);
    for (const caveat of [...lineCaveats, ...out.provenance.caveats.filter((each) => each.includes('are stated from'))]) {
      assert.ok([frankingCaveat('Person A'), frankingCaveat('Person B')].includes(caveat), caveat);
    }
  }
  // The individual side's source reaches no line in this build; its sentence translates all the same.
  assert.equal(
    anonymousProvenanceText(RICH_HOUSEHOLD, "the franked amount and the franking credit are stated from Bartholomew Fenwick-Oyelaran's own stated share of their Non-Super Portfolio's payout already taxed at company level, not derived from any rate (register §5A.1, T43)"),
    "the franked amount and the franking credit are stated from Person B's own stated share of their Non-Super Portfolio's payout already taxed at company level, not derived from any rate (register §5A.1, T43)",
  );
});

test('the Division 293 release determinations are translated, and the walk goes out whole', () => {
  for (const month of walkOf(RELEASE)) getMonth(RELEASE, month.month);
  const out = monthOrRefusal(RELEASE, '2027-07');
  const determination = (description) => out.lines.find((line) => line.description === description).provenance.determination;
  assert.deepEqual(determination('Division 293 tax accrual refunded on release, Person A, 2026-27'), [
    'every cent of Division 293 tax this walk charged Person A in cash during FY2026-27, refunded in full',
    'Person A elected under ITAA 1997 Subdiv 293-B to have the liability released from superannuation interest 0, so the monthly cash accrual — which is taken in cash from every Person, because the amount a release authority can name is the YEAR\'s assessed liability — is undone here and the liability is paid by the fund on its own line',
  ]);
  assert.equal(
    determination('Division 293 tax released from superannuation, Person A, 2026-27').at(-1),
    "PAID BY THE FUND: Person A elected under ITAA 1997 Subdiv 293-B to have the amount released from superannuation interest 0, so it is debited to that interest and never to the Household's cash (register O84). The release is modelled at this settlement; a real one follows the Commissioner's assessment notice months later, so this build anticipates it and denies the fund those months' compounding",
  );
});

test('a named sentence no translation can clear is omitted ALONE, and says so', () => {
  // A Person called "Commissioner": the helper puts the label where the name was, and the sentence
  // still says "the Commissioner's assessment notice". It cannot go out, and nothing else is lost.
  const plan = releasePlan('Commissioner');
  for (const month of walkOf(plan)) getMonth(plan, month.month);
  const out = monthOrRefusal(plan, '2027-07');
  assert.deepEqual(out.lines.find((line) => line.description === 'Division 293 tax released from superannuation, Person A, 2026-27').provenance.determination, [
    'assessed once on the twelve months of FY2026-27',
    // The raw figure is omitted on its own (`test/app-chat-money-guard.test.mjs`); the sentence stays.
    `the low tax contributions limb bound: 15% of [${FIGURE_OMITTED}]`,
    SOURCE_OMITTED,
  ]);
  assert.equal(SOURCE_OMITTED, 'source omitted: carries a name');
});

// --- Refusals, never the nearest month -----------------------------------------------------------

test('a malformed month is refused by name', () => {
  for (const month of ['2031-7', '2031-13', '2031-00', 'July 2031', '2031-07-01', '', ' 2031-07']) {
    const out = JSON.parse(getMonth(RICH, month));
    assert.deepEqual(Object.keys(out), ['refused', 'reason'], month);
    assert.equal(out.refused, 'MALFORMED_MONTH', month);
  }
});

test('a month outside the forecast is refused, and no figure from any month comes with it', () => {
  const [first, last] = [RICH_WALK[0].month, RICH_WALK.at(-1).month];
  assert.equal(first, '2026-09');
  for (const month of ['2026-08', '1999-01', '2044-01', `${Number(last.slice(0, 4)) + 1}-${last.slice(5)}`]) {
    const out = JSON.parse(getMonth(RICH, month));
    assert.deepEqual(out, { refused: 'MONTH_OUTSIDE_FORECAST', reason: `the forecast runs from ${first} to ${last}, and ${month} is not in it` }, month);
  }
  // Control: the two ends themselves are answered.
  assert.equal(monthOrRefusal(RICH, first).month, first);
  assert.equal(monthOrRefusal(RICH, last).month, last);
});

test('the scenario defaults to the active one, a named one is honoured, and an unknown id is refused', () => {
  const cheaper = entry('cheaper', 'SPEND_CHANGE', '2027-01-01', 'household', { annualSpend: toCents(40_000) });
  const scenarios = [
    { id: 'base', name: 'Base', parentId: null, entryIds: RICH_ENTRIES.map(({ id }) => id) },
    { id: 'lean', name: 'Wilhelmina spends less', parentId: 'base', entryIds: ['cheaper'] },
  ];
  const plan = planOf(RICH_SETTINGS, RICH_HOUSEHOLD, [...RICH_ENTRIES, cheaper], scenarios, 'lean');
  const active = monthOrRefusal(plan, '2027-03');
  assert.equal(active.scenarioId, 'lean');
  assert.ok(active.appliedEntryIds.includes('cheaper'));
  assert.deepEqual(active, monthOrRefusal(plan, '2027-03', { scenarioId: 'lean' }));
  const base = monthOrRefusal(plan, '2027-03', { scenarioId: 'base' });
  assert.equal(base.scenarioId, 'base');
  assert.ok(!base.appliedEntryIds.includes('cheaper'));
  // Refused, and the refusal lists ids, never a Scenario's name (which here names a Person).
  const unknown = getMonth(plan, '2027-03', { scenarioId: 'nope' });
  assert.equal(JSON.parse(unknown).refused, 'UNKNOWN_SCENARIO');
  assert.match(JSON.parse(unknown).reason, /base, lean$/);
});
