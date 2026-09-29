// plan_ai.md §13 — `listEntries(plan, {scenarioId?, basis?})`: the Scenario's resolved entries, each
// with its id, its type, the entry table's wording (identity-translated, every figure labelled), whether
// it is switched on IN THIS SCENARIO, and the Scenario it was inherited from.
//
// Expectations are derived here from `effectiveEntryIds`, `resolvedEntryEnabled` and `entrySummary`,
// never from the tool's own resolution.
import test from 'node:test';
import assert from 'node:assert/strict';

import { formatCents, toCents } from '../dist/core/money.js';
import { effectiveEntryIds, resolvedEntryEnabled } from '../dist/core/plan.js';
import { inflateStated } from '../dist/core/priceLevel.js';
import { DEMO_ENTRIES, DEMO_PLAN } from '../dist/app/demoHousehold.js';
import { entrySummary } from '../dist/app/entryForm.js';
import { moneyBasis } from '../dist/app/todaysDollars.js';
import { FIGURE_OMITTED, labelledFigure } from '../dist/app/chat/tools/basisLabelled.js';
import { NOTE_OMITTED, entriesOrRefusal, listEntries } from '../dist/app/chat/tools/listEntries.js';

const TODAY = '(today’s money)';
const FUTURE = '(future dollars)';
const NAMES = DEMO_PLAN.household.persons.map(({ name }) => name);

const entry = (id, overrides = {}) => ({ id, date: '2030-01-01', owner: 'household', type: 'ONE_OFF_EXPENSE', params: { amount: toCents(1_000) }, enabled: true, createdAt: '2026-09-24', ...overrides });

// SYNTHETIC: a three-deep chain over the demo. `parent` adds a one-off and switches the demo's roof
// off; `child` inherits both, switches the roof back ON and the parent's one-off OFF, and adds its
// own. `grand` re-lists the parent's one-off, which makes it the grandchild's OWN entry.
const CHAIN = {
  ...DEMO_PLAN,
  entries: [
    ...DEMO_ENTRIES,
    entry('parent-trip', { params: { amount: toCents(9_000) } }),
    entry('child-car', { date: '2031-03-01', params: { amount: toCents(30_000) } }),
    entry('pool-off', { enabled: false }),
  ],
  scenarios: [
    DEMO_PLAN.scenarios[0],
    { id: 'parent', name: 'Parent', parentId: 'baseline', entryIds: ['parent-trip', 'pool-off'], entryOverrides: { 'new-roof': false } },
    { id: 'child', name: 'Child', parentId: 'parent', entryIds: ['child-car'], entryOverrides: { 'new-roof': true, 'parent-trip': false } },
    { id: 'grand', name: 'Grand', parentId: 'child', entryIds: ['parent-trip'] },
  ],
};

const byId = (plan, id) => plan.entries.find((each) => each.id === id);
const scenario = (plan, id) => plan.scenarios.find((each) => each.id === id);

test('every resolved entry, in the resolved order, switched on or off as THIS scenario says', () => {
  let offSeen = 0;
  let inheritedSeen = 0;
  for (const id of ['baseline', 'parent', 'child', 'grand']) {
    const out = JSON.parse(listEntries(CHAIN, { scenarioId: id }));
    const target = scenario(CHAIN, id);
    assert.equal(out.scenarioId, id);
    assert.deepEqual(out.entries.map((each) => each.id), effectiveEntryIds(target, CHAIN.scenarios), id);
    for (const listed of out.entries) {
      const pool = byId(CHAIN, listed.id);
      assert.equal(listed.type, pool.type);
      assert.equal(listed.enabled, resolvedEntryEnabled(pool, target, CHAIN.scenarios), `${id} ${listed.id}`);
      if (!listed.enabled) offSeen += 1;
      if (listed.inheritedFrom !== null) inheritedSeen += 1;
    }
  }
  assert.ok(offSeen > 0 && inheritedSeen > 0, 'the fixture never shows a switched-off or an inherited entry');
});

test('the switch is the scenario’s, not the pool’s', () => {
  const listed = (scenarioId) => Object.fromEntries(JSON.parse(listEntries(CHAIN, { scenarioId })).entries.map(({ id, enabled }) => [id, enabled]));
  // Switched off by the parent over a pool entry that is on.
  assert.equal(listed('parent')['new-roof'], false);
  // Switched back on by the child.
  assert.equal(listed('child')['new-roof'], true);
  // The parent's own entry, switched off by the child and inherited so by the grandchild.
  assert.equal(listed('parent')['parent-trip'], true);
  assert.equal(listed('child')['parent-trip'], false);
  assert.equal(listed('grand')['parent-trip'], false);
  // Off in the pool, and nobody says otherwise.
  assert.equal(listed('child')['pool-off'], false);
});

test('an inherited entry names the nearest scenario that lists it, and an own entry names none', () => {
  const from = (scenarioId) => Object.fromEntries(JSON.parse(listEntries(CHAIN, { scenarioId })).entries.map(({ id, inheritedFrom }) => [id, inheritedFrom]));
  assert.deepEqual(from('baseline'), { 'spend-2026': null, 'dana-retires': null, 'new-roof': null });
  assert.deepEqual(from('child'), { 'spend-2026': 'baseline', 'dana-retires': 'baseline', 'new-roof': 'baseline', 'parent-trip': 'parent', 'pool-off': 'parent', 'child-car': null });
  // The grandchild re-lists the parent's one-off: it is the grandchild's own.
  assert.equal(from('grand')['parent-trip'], null);
  assert.equal(from('grand')['child-car'], 'child');
});

test('the wording is the entry table’s, with each figure labelled on the basis it was stated in', () => {
  const [spend, retire, roof] = DEMO_ENTRIES;
  for (const view of ['todaysDollars', 'futureDollars']) {
    const basis = moneyBasis(view, DEMO_PLAN.settings);
    const out = entriesOrRefusal(DEMO_PLAN, { basis: view });
    const wording = Object.fromEntries(out.entries.map(({ id, wording }) => [id, wording]));
    // The spending level is stated in today's money (register O85): itself today, raised to its month in future dollars.
    const level = view === 'todaysDollars' ? `${formatCents(spend.params.annualSpend)} ${TODAY}` : labelledFigure(inflateStated(spend.params.annualSpend, basis.cpi, basis.asAtDate, '2026-09'), basis, '2026-09');
    assert.equal(wording['spend-2026'], `Spending change, 2026-09-01 — ${level} a year — ${spend.note}`);
    // A one-off is nominal at its own month.
    assert.equal(wording['new-roof'], `One-off expense, 2029-11-01 — ${labelledFigure(roof.params.amount, basis, '2029-11')} — ${roof.note}`);
    assert.equal(wording['dana-retires'], entrySummary(retire).replace(NAMES[0], 'Person A'));
  }
  // Not vacuous: the one-off's two labels differ, so the basis is really applied.
  assert.notEqual(entriesOrRefusal(DEMO_PLAN).entries[2].wording, entriesOrRefusal(DEMO_PLAN, { basis: 'futureDollars' }).entries[2].wording);
});

test('a salary is stated in today’s wages, which is neither basis: it carries exactly that tag in both views, every other figure is labelled, and an account is counted from 1', () => {
  const plan = {
    ...DEMO_PLAN,
    entries: [
      ...DEMO_ENTRIES,
      entry('part-time', { type: 'WORK_PATTERN_CHANGE', owner: 'personA', date: '2028-07-01', params: { daysPerWeek: 3, annualSalary: toCents(60_000) } }),
      entry('loan', { type: 'MORTGAGE_REFINANCE', date: '2027-01-01', params: { openingBalance: toCents(100_000), annualInterestRate: 0.06, monthlyRepayment: toCents(2_000) } }),
      entry('sacrifice', { type: 'SUPER_CONTRIBUTION', owner: 'personA', date: '2027-07-01', params: { kind: 'salarySacrificed', annualAmount: toCents(5_000), interestIndex: 0 } }),
    ],
    scenarios: [{ ...DEMO_PLAN.scenarios[0], entryIds: [...DEMO_PLAN.scenarios[0].entryIds, 'part-time', 'loan', 'sacrifice'] }],
  };
  const out = Object.fromEntries(entriesOrRefusal(plan).entries.map(({ id, wording }) => [id, wording]));
  const basis = moneyBasis('todaysDollars', plan.settings);
  assert.equal(out['part-time'], 'Change work hours and pay, 2028-07-01 — 3 days a week at $60,000.00 (in today’s wages) a year');
  // The same tag in future dollars: a salary is not raised with prices, so the view does not move it.
  const future = entriesOrRefusal(plan, { basis: 'futureDollars' }).entries.find(({ id }) => id === 'part-time');
  assert.equal(future.wording, out['part-time']);
  assert.equal(
    out.loan,
    `Home loan — set or change the terms, 2027-01-01 — home loan set to ${labelledFigure(toCents(100_000), basis, '2027-01')} owing at 6% a year, repaid ${labelledFigure(toCents(2_000), basis, '2027-01')} a month`,
  );
  // A super account is named as the page names it, counted from 1: the plan stores position 0.
  assert.equal(out.sacrifice, `Salary sacrifice into super, 2027-07-01 — ${labelledFigure(toCents(5_000), basis, '2027-07')} a year salary sacrificed into super account 1`);
  // And through both guards, in both views.
  for (const view of ['todaysDollars', 'futureDollars']) listEntries(plan, { basis: view });
});

test('a note is translated: a name is replaced, a figure omitted, and a note still carrying a name is left out', () => {
  const plan = {
    ...DEMO_PLAN,
    entries: [
      ...DEMO_ENTRIES,
      entry('named', { note: `${NAMES[1]} pays $500 for it` }),
      entry('dob', { note: `bought on ${DEMO_PLAN.household.persons[0].dateOfBirth}` }),
    ],
    scenarios: [{ ...DEMO_PLAN.scenarios[0], entryIds: [...DEMO_PLAN.scenarios[0].entryIds, 'named', 'dob'] }],
  };
  const text = listEntries(plan);
  for (const name of NAMES) assert.ok(!text.includes(name), name);
  const out = Object.fromEntries(JSON.parse(text).entries.map(({ id, wording }) => [id, wording]));
  assert.ok(out.named.endsWith(`— Person B pays [${FIGURE_OMITTED}] for it`), out.named);
  assert.ok(out.dob.endsWith(`— ${NOTE_OMITTED}`), out.dob);
  assert.equal(JSON.parse(text).entries.find(({ id }) => id === 'dana-retires').owner, 'Person A');
});

test('ENTER_CARE/SELL_HOME/RENT_OUT_HOME/HEAS_DRAW figures are labelled TODAY’S MONEY (user ruling, 2026-09-25), not nominal at the entry’s own day', () => {
  // Register O85's basis, `SPEND_CHANGE.annualSpend`'s own labelling: in today's-dollars view the
  // stated figure carries the tag unchanged; in future-dollars view it is raised to the entry's own
  // month first, `inflateStated` — the SAME expression `listEntries.ts`'s `labelledStated` already
  // uses for the spending level. A `MORTGAGE_REFINANCE` figure (a debt, still 'nominal') is the
  // control: it is NOT raised in future-dollars view, so the contrast below is not vacuous.
  const care = entry('care', {
    type: 'ENTER_CARE',
    owner: 'personA',
    date: '2028-01-01',
    params: { homeValue: toCents(900_000), radPrice: toCents(550_000), radPaidAsLumpSum: toCents(550_000) },
  });
  const plan = {
    ...DEMO_PLAN,
    entries: [...DEMO_ENTRIES, care],
    scenarios: [{ ...DEMO_PLAN.scenarios[0], entryIds: [...DEMO_PLAN.scenarios[0].entryIds, 'care'] }],
  };
  for (const view of ['todaysDollars', 'futureDollars']) {
    const basis = moneyBasis(view, plan.settings);
    const out = entriesOrRefusal(plan, { basis: view });
    const wording = out.entries.find(({ id }) => id === 'care').wording;
    const labelOf = (cents) =>
      view === 'todaysDollars'
        ? `${formatCents(cents)} ${TODAY}`
        : labelledFigure(inflateStated(cents, basis.cpi, basis.asAtDate, '2028-01'), basis, '2028-01');
    // The entry table's own row text (`entryForm.ts`) ALSO says "in today's money" beside each
    // figure now (user ruling, 2026-09-25) — the chat's own basis tag is appended AFTER that, on the
    // `$` figure alone, so both phrases appear together rather than one replacing the other.
    assert.ok(wording.includes(`home valued at ${labelOf(toCents(900_000))} in today's money`), wording);
    assert.ok(wording.includes(`room price (RAD) ${labelOf(toCents(550_000))} in today's money`), wording);
    assert.ok(wording.includes(`${labelOf(toCents(550_000))} in today's money paid as a lump sum`), wording);
  }
  // Not vacuous: the two views actually differ for this entry (thirty months of CPI from asAtDate).
  const todaysWording = entriesOrRefusal(plan, { basis: 'todaysDollars' }).entries.find(({ id }) => id === 'care').wording;
  const futureWording = entriesOrRefusal(plan, { basis: 'futureDollars' }).entries.find(({ id }) => id === 'care').wording;
  assert.notEqual(todaysWording, futureWording);
});

test('a scenario or a basis the plan does not have is refused by name', () => {
  assert.equal(JSON.parse(listEntries(DEMO_PLAN, { scenarioId: 'nope' })).refused, 'UNKNOWN_SCENARIO');
  assert.equal(JSON.parse(listEntries(DEMO_PLAN, { basis: 'nominal' })).refused, 'UNKNOWN_BASIS');
  assert.equal(JSON.parse(listEntries(CHAIN)).scenarioId, 'baseline');
  for (const view of ['todaysDollars', 'futureDollars']) {
    const tag = view === 'todaysDollars' ? TODAY : FUTURE;
    const text = listEntries(CHAIN, { scenarioId: 'grand', basis: view });
    assert.ok([...text.matchAll(/\$[\d,.]+/g)].length > 0);
    for (const match of text.matchAll(/\$[\d,]+\.\d\d/g)) assert.ok(text.startsWith(` ${tag}`, match.index + match[0].length), match[0]);
  }
});
