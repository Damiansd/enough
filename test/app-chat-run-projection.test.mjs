// plan_ai.md §5 and §13 microtask 7 — `runProjection(plan, whatIf?, {scenarioId?, basis?, detail?})`.
//
// A what-if (`{ add, disable, replace }`, or a bare list to add) is an in-memory child of the asked
// Scenario only: it goes through the form's own parse door and trial walk, and returns the what-if's
// years and markers beside the ENGINE-worked difference from the asked Scenario as it is: subtracted
// in nominal cents, then labelled. A refusal comes back named and word for word but for translation;
// the baseline never stands in. A second entry of a type the walk honours once is refused by name.
//
// Expectations are derived here from `project()` and the financial-year summariser directly, never
// by calling the tool's own difference code a second time.
import test from 'node:test';
import assert from 'node:assert/strict';

import { formatCents, subCents, toCents } from '../dist/core/money.js';
import { project } from '../dist/core/projection.js';
import { DEMO_ENTRIES, DEMO_PLAN } from '../dist/app/demoHousehold.js';
import { planWithEntry, validatedPlan } from '../dist/app/planEdits.js';
import { scenarioById, scenarioEntries } from '../dist/app/scenarioWalks.js';
import { moneyBasis, moneyLens } from '../dist/app/todaysDollars.js';
import { FIGURE_OMITTED, labelledFigure, labelledFinancialYears } from '../dist/app/chat/tools/basisLabelled.js';
import { financialYearSummaries, monthFlows } from '../dist/app/chat/tools/financialYearSummary.js';
import { markersOrRefusal } from '../dist/app/chat/tools/getMarkers.js';
import { HONOURED_ONCE, NO_DRAFTS, runProjection, whatIfOrRefusal } from '../dist/app/chat/tools/runProjection.js';

const OMITTED = `[${FIGURE_OMITTED}]`;
const TODAY = '(today’s money)';
const NAMES = DEMO_PLAN.household.persons.map(({ name }) => name);

const draft = (overrides = {}) => ({
  date: '2030-01-01',
  owner: 'household',
  type: 'SPEND_CHANGE',
  params: { annualSpend: toCents(50_000) },
  enabled: true,
  createdAt: '2026-09-24',
  ...overrides,
});
const SPEND_LESS = draft();
const RETIRE = { date: '2033-05-14', owner: 'personA', type: 'RETIRE', params: {}, enabled: true, createdAt: '2026-09-24' };
// The demo's own retirement (2031-05-14) REPLACED by one two years later: the what-if a user asks most.
const RETIRE_LATER = { replace: [{ entryId: 'dana-retires', with: RETIRE }] };
const ONE_OFF = draft({ date: '2028-03-01', type: 'ONE_OFF_EXPENSE', params: { amount: toCents(20_000) } });

// SYNTHETIC: the demo with a second ROOT Scenario beside the baseline (a sibling, so nothing reaches
// it by inheritance) that spends less from 2027. The baseline stays active.
const CHEAPER = { id: 'cheaper', date: '2027-01-01', owner: 'household', type: 'SPEND_CHANGE', params: { annualSpend: toCents(40_000) }, enabled: true, createdAt: '2026-09-24' };
const TWO = {
  ...DEMO_PLAN,
  entries: [...DEMO_ENTRIES, CHEAPER],
  scenarios: [...DEMO_PLAN.scenarios, { id: 'lean', name: 'Lean', parentId: null, entryIds: [...DEMO_ENTRIES.map(({ id }) => id), 'cheaper'] }],
};

const entriesOf = (plan, scenarioId) => scenarioEntries(plan, scenarioById(plan, scenarioId));
const walk = (plan, entries) => project(plan.settings, plan.household, entries);

/**
 * The entries a what-if must walk, derived here without the tool: the Scenario's resolved entries with
 * each disabled or replaced one switched off where it stands, then the added and replacing drafts on
 * the end, numbered `draft-1` onwards in that order. A bare list is the entries to add.
 */
const whatIfEntries = (plan, scenarioId, asked) => {
  const { add = [], disable = [], replace = [] } = Array.isArray(asked) ? { add: asked } : asked;
  const off = new Set([...disable, ...replace.map(({ entryId }) => entryId)]);
  const drafts = [...add, ...replace.map((swap) => swap.with)].map((each, index) => ({ ...each, id: `draft-${index + 1}` }));
  return [...entriesOf(plan, scenarioId).map((entry) => (off.has(entry.id) ? { ...entry, enabled: false } : entry)), ...drafts];
};

/** Every leaf of a labelled tree, with its path. */
const leaves = (value, path = []) =>
  typeof value === 'string' ? [[path.join('.'), value]] : Object.entries(value).flatMap(([key, child]) => leaves(child, [...path, key]));

/** The difference a tool must send: each year summed in nominal cents, subtracted, then converted once at `lastMonth`. */
const expectedDifference = (plan, before, after, view = 'todaysDollars') => {
  const basis = moneyBasis(view, plan.settings);
  const was = financialYearSummaries(plan.household, before);
  const is = financialYearSummaries(plan.household, after);
  return is.map((row, index) => {
    const at = (a, b) => Object.fromEntries(Object.entries(b).map(([key, value]) => [key, typeof value === 'number' ? labelledFigure(subCents(value, a[key]), basis, row.lastMonth) : at(a[key], value)]));
    return { financialYear: row.financialYear, lastMonth: row.lastMonth, flows: at(was[index].flows, row.flows), stocks: at(was[index].stocks, row.stocks) };
  });
};

const deepFreeze = (value) => {
  if (value !== null && typeof value === 'object') {
    for (const child of Object.values(value)) deepFreeze(child);
    Object.freeze(value);
  }
  return value;
};

// --- No drafts -----------------------------------------------------------------------------------

test('no drafts: the scenario as it is, and every difference explicitly nil', () => {
  for (const [plan, scenarioId] of [[DEMO_PLAN, undefined], [TWO, 'lean'], [TWO, 'baseline']]) {
    for (const view of ['todaysDollars', 'futureDollars']) {
      const out = JSON.parse(runProjection(plan, undefined, { scenarioId, basis: view, detail: 'full' }));
      const id = scenarioId ?? plan.activeScenarioId;
      assert.equal(out.scenarioId, id);
      assert.deepEqual(out.draftEntryIds, []);
      assert.equal(out.difference.nil, NO_DRAFTS);
      const months = walk(plan, entriesOf(plan, id));
      assert.deepEqual(out.financialYears, labelledFinancialYears(plan.household, months, plan.settings, view));
      assert.deepEqual(out.markers, markersOrRefusal(plan, { scenarioId: id, basis: view }));
      const tag = view === 'todaysDollars' ? TODAY : '(future dollars)';
      for (const [path, figure] of out.difference.financialYears.flatMap((row) => leaves({ flows: row.flows, stocks: row.stocks }))) {
        assert.equal(figure, `$0.00 ${tag}`, `${id} ${path}`);
      }
      for (const group of Object.values(out.difference.markers)) {
        for (const [name, { before, after, changed }] of Object.entries(group)) {
          assert.equal(changed, false, name);
          assert.deepEqual(before, after, name);
        }
      }
    }
  }
  // An empty list is no drafts too.
  assert.equal(runProjection(DEMO_PLAN, []), runProjection(DEMO_PLAN));
});

// --- A draft, and the difference the engine worked -----------------------------------------------

test('a draft: the what-if is the engine’s walk with the draft on the end, and each difference is subtracted in nominal cents, then labelled', () => {
  const out = whatIfOrRefusal(DEMO_PLAN, [SPEND_LESS], { detail: 'full' });
  assert.deepEqual(out.draftEntryIds, ['draft-1']);
  assert.equal(out.difference.nil, undefined);
  const before = walk(DEMO_PLAN, DEMO_ENTRIES);
  const after = walk(DEMO_PLAN, [...DEMO_ENTRIES, { ...SPEND_LESS, id: 'draft-1' }]);
  assert.deepEqual(out.financialYears, labelledFinancialYears(DEMO_PLAN.household, after, DEMO_PLAN.settings));
  assert.deepEqual(JSON.parse(JSON.stringify(out.difference.financialYears)), expectedDifference(DEMO_PLAN, before, after));

  // Spending $50,000 from 2030 instead of the demo's figure moves money in every year from then.
  const household = out.difference.financialYears.map((row) => row.flows.spending.household);
  assert.ok(household.some((figure) => figure !== `$0.00 ${TODAY}`));
  assert.equal(out.difference.financialYears[0].flows.spending.household, `$0.00 ${TODAY}`);

  // Not vacuous: converting each MONTH and subtracting disagrees with this in at least one figure.
  const basis = moneyBasis('todaysDollars', DEMO_PLAN.settings);
  const numbers = (value, path = []) =>
    typeof value === 'number' ? [[path.join('.'), value]] : Object.entries(value).flatMap(([key, child]) => numbers(child, [...path, key]));
  /** The WRONG order: each month converted at its own month, then added up. */
  const convertedYear = (months, row) => {
    const totals = new Map();
    for (const month of months.filter((each) => each.month >= row.firstMonth && each.month <= row.lastMonth)) {
      const lens = moneyLens(basis, month.month);
      for (const [path, cents] of numbers(monthFlows(DEMO_PLAN.household, month))) totals.set(path, (totals.get(path) ?? 0) + lens(cents));
    }
    return totals;
  };
  let disagreements = 0;
  for (const row of financialYearSummaries(DEMO_PLAN.household, after)) {
    const [is, was] = [convertedYear(after, row), convertedYear(before, row)];
    const sent = new Map(leaves(out.difference.financialYears.find((each) => each.financialYear === row.financialYear).flows));
    for (const [path, cents] of is) if (`${formatCents(cents - was.get(path))} ${TODAY}` !== sent.get(path)) disagreements += 1;
  }
  assert.ok(disagreements > 0, 'month-by-month conversion agrees everywhere, so this fixture cannot tell the two orders apart');
});

test('each marker goes out as its before and after, with whether it changed', () => {
  // Spending far more from the first month: the demo, which never runs short, runs short.
  const out = whatIfOrRefusal(DEMO_PLAN, [draft({ date: '2026-10-01', params: { annualSpend: toCents(250_000) } })], { detail: 'full' });
  assert.equal(out.difference.markers.household.shortfallAge.before.status, 'never');
  assert.equal(out.difference.markers.household.shortfallAge.after.status, 'shortfall');
  const pairs = out.difference.markers;
  assert.deepEqual(Object.keys(pairs.household), ['shortfallAge', 'pensionOnlyAge', 'contingencyFloor', 'mortgagePayoff']);
  assert.deepEqual(Object.keys(pairs.perPerson), ['retirements', 'mortgageTargets']);
  assert.deepEqual(pairs.household.shortfallAge.before, markersOrRefusal(DEMO_PLAN).household.shortfallAge);
  assert.deepEqual(pairs.household.mortgagePayoff.after, out.markers.household.mortgagePayoff);
  for (const group of Object.values(pairs)) {
    for (const { before, after, changed } of Object.values(group)) assert.equal(changed, JSON.stringify(before) !== JSON.stringify(after));
  }
  assert.ok(Object.values(pairs.household).some(({ changed }) => changed), 'no marker moved, so `changed` was never seen true');
});

// --- The asked Scenario, and only it -------------------------------------------------------------

test('drafts apply to the asked Scenario only', () => {
  const out = whatIfOrRefusal(TWO, [SPEND_LESS], { scenarioId: 'lean', detail: 'full' });
  assert.equal(out.scenarioId, 'lean');
  const lean = entriesOf(TWO, 'lean');
  const after = walk(TWO, [...lean, { ...SPEND_LESS, id: 'draft-1' }]);
  assert.deepEqual(out.financialYears, labelledFinancialYears(TWO.household, after, TWO.settings));
  assert.deepEqual(JSON.parse(JSON.stringify(out.difference.financialYears)), expectedDifference(TWO, walk(TWO, lean), after));
  assert.ok(out.difference.financialYears.some((row) => row.flows.spending.household !== `$0.00 ${TODAY}`));
  // The same draft on the active Scenario is a different what-if.
  assert.notDeepEqual(whatIfOrRefusal(TWO, [SPEND_LESS], { detail: 'full' }).financialYears, out.financialYears);
});

// --- Refusals ------------------------------------------------------------------------------------

/** What the parse door or the engine says about `candidate`, with this file's own translation. */
const refusalFor = (candidate) => {
  try {
    validatedPlan(candidate);
  } catch (error) {
    const translated = NAMES.reduce((text, name, index) => text.replace(new RegExp(`\\b${name}\\b`, 'g'), ['Person A', 'Person B'][index]), error.message);
    return { refused: 'WHAT_IF_REFUSED', refusal: error.constructor.name, reason: translated.replace(/-?\d+ cents?\b/g, OMITTED) };
  }
  assert.fail('the candidate was not refused');
};

test('a refusal from the parse door comes back named and word for word, never the baseline', () => {
  const bad = draft({ params: {} });
  const out = JSON.parse(runProjection(DEMO_PLAN, [bad]));
  assert.deepEqual(out, refusalFor(planWithEntry(DEMO_PLAN, { ...bad, id: 'draft-1' })));
  assert.equal(out.refusal, 'PlanFileEntryError');
  assert.match(out.reason, /^plan file: entries\[\d+\]\.params\.annualSpend /);
});

test('a refusal from the engine names a Person, and goes out translated, word for word otherwise', () => {
  // Nobody in the demo has met a Condition of Release in 2030, so a lump sum out of super is refused.
  // The model names super account 1; the plan stores position 0.
  const lump = draft({ type: 'LUMP_SUM_FROM_SUPER', owner: 'personA', params: { amount: toCents(5_000), interestIndex: 1 } });
  const stored = { ...lump, params: { ...lump.params, interestIndex: 0 }, id: 'draft-1' };
  const raw = (() => {
    try {
      validatedPlan(planWithEntry(DEMO_PLAN, stored));
    } catch (error) {
      return error.message;
    }
  })();
  assert.ok(raw.includes(NAMES[0]), 'the fixture’s refusal names nobody, so translation is untested');
  assert.match(raw, /\d cents/);
  const text = runProjection(DEMO_PLAN, [lump]);
  for (const name of NAMES) assert.ok(!text.includes(name));
  const out = JSON.parse(text);
  assert.deepEqual(out, refusalFor(planWithEntry(DEMO_PLAN, stored)));
  assert.equal(out.refusal, 'PreservedBenefitError');
  assert.match(out.reason, /Person A/);
  assert.ok(out.reason.includes(OMITTED));
  assert.equal(Object.hasOwn(out, 'financialYears'), false);
});

test('drafts that are not a list, and a Scenario the plan does not have, are refused by name', () => {
  assert.equal(JSON.parse(runProjection(DEMO_PLAN, SPEND_LESS)).refused, 'MALFORMED_DRAFTS');
  assert.equal(JSON.parse(runProjection(DEMO_PLAN, [SPEND_LESS], { scenarioId: 'nope' })).refused, 'UNKNOWN_SCENARIO');
  assert.equal(JSON.parse(runProjection(DEMO_PLAN, [SPEND_LESS], { basis: 'nominal' })).refused, 'UNKNOWN_BASIS');
});

// --- The boundary: nothing in, nothing kept ------------------------------------------------------

test('a deep-frozen plan and frozen drafts work, and neither is changed', () => {
  const plan = structuredClone(TWO);
  const drafts = [structuredClone(SPEND_LESS)];
  const [planText, draftText] = [JSON.stringify(plan), JSON.stringify(drafts)];
  const open = runProjection(plan, drafts, { scenarioId: 'lean' });
  assert.equal(JSON.stringify(plan), planText);
  assert.equal(JSON.stringify(drafts), draftText);
  assert.equal(runProjection(deepFreeze(plan), deepFreeze(drafts), { scenarioId: 'lean' }), open);
});

test('no draft outlives its call', () => {
  const before = runProjection(TWO, undefined, { scenarioId: 'lean' });
  const first = runProjection(TWO, [SPEND_LESS], { scenarioId: 'lean' });
  assert.equal(runProjection(TWO, undefined, { scenarioId: 'lean' }), before);
  assert.equal(runProjection(TWO, [SPEND_LESS], { scenarioId: 'lean' }), first);
  assert.deepEqual(JSON.parse(first).draftEntryIds, ['draft-1']);
});

test('draft ids never collide with the plan’s own', () => {
  const plan = { ...DEMO_PLAN, entries: [...DEMO_ENTRIES, { ...CHEAPER, id: 'draft-1' }], scenarios: [{ ...DEMO_PLAN.scenarios[0], entryIds: [...DEMO_PLAN.scenarios[0].entryIds, 'draft-1'] }] };
  const out = whatIfOrRefusal(plan, [SPEND_LESS, draft({ date: '2031-01-01' })]);
  assert.deepEqual(out.draftEntryIds, ['draft-2', 'draft-3']);
});

// --- What-ifs that change existing entries -------------------------------------------------------

test('a replace: the old entry is off where it stands and the new one is on the end, measured against the scenario as it is', () => {
  const out = whatIfOrRefusal(DEMO_PLAN, RETIRE_LATER, { detail: 'full' });
  assert.deepEqual(out.draftEntryIds, ['draft-1']);
  assert.deepEqual(out.replacedEntryIds, [{ entryId: 'dana-retires', by: 'draft-1' }]);
  assert.deepEqual(out.disabledEntryIds, []);
  assert.equal(out.difference.nil, undefined);
  const after = walk(DEMO_PLAN, whatIfEntries(DEMO_PLAN, 'baseline', RETIRE_LATER));
  assert.deepEqual(out.financialYears, labelledFinancialYears(DEMO_PLAN.household, after, DEMO_PLAN.settings));
  assert.deepEqual(JSON.parse(JSON.stringify(out.difference.financialYears)), expectedDifference(DEMO_PLAN, walk(DEMO_PLAN, DEMO_ENTRIES), after));
  const retirement = out.difference.markers.perPerson.retirements;
  assert.equal(retirement.before[0].month, '2031-05');
  assert.equal(retirement.after[0].month, '2033-05');
});

test('a disable: the entry is off, the rest of the scenario is untouched, and a replace plus an add go on in that order', () => {
  const off = { disable: ['new-roof'] };
  const out = whatIfOrRefusal(DEMO_PLAN, off, { detail: 'full' });
  assert.deepEqual(out.disabledEntryIds, ['new-roof']);
  assert.deepEqual(out.draftEntryIds, []);
  assert.equal(out.difference.nil, undefined);
  const after = walk(DEMO_PLAN, whatIfEntries(DEMO_PLAN, 'baseline', off));
  assert.deepEqual(JSON.parse(JSON.stringify(out.difference.financialYears)), expectedDifference(DEMO_PLAN, walk(DEMO_PLAN, DEMO_ENTRIES), after));
  const roofYear = out.difference.financialYears.find((row) => row.financialYear === '2029-30');
  assert.notEqual(roofYear.flows.spending.oneOffExpenses, `$0.00 ${TODAY}`, 'switching the roof off moved nothing');

  const all = { add: [ONE_OFF], disable: ['new-roof'], replace: [{ entryId: 'dana-retires', with: RETIRE }] };
  const both = whatIfOrRefusal(DEMO_PLAN, all, { detail: 'full' });
  assert.deepEqual(both.draftEntryIds, ['draft-1', 'draft-2']);
  assert.deepEqual(both.replacedEntryIds, [{ entryId: 'dana-retires', by: 'draft-2' }]);
  assert.deepEqual(both.financialYears, labelledFinancialYears(DEMO_PLAN.household, walk(DEMO_PLAN, whatIfEntries(DEMO_PLAN, 'baseline', all)), DEMO_PLAN.settings));
});

test('the difference is taken against the asked scenario, and a replace reaches only it', () => {
  // `cheaper` is lean's own; switching it off makes lean spend as the baseline does.
  const out = whatIfOrRefusal(TWO, { disable: ['cheaper'] }, { scenarioId: 'lean', detail: 'full' });
  assert.equal(out.scenarioId, 'lean');
  assert.equal(out.markers.scenarioId, 'lean');
  const lean = walk(TWO, entriesOf(TWO, 'lean'));
  const after = walk(TWO, whatIfEntries(TWO, 'lean', { disable: ['cheaper'] }));
  assert.deepEqual(JSON.parse(JSON.stringify(out.difference.financialYears)), expectedDifference(TWO, lean, after));
  assert.ok(out.difference.financialYears.some((row) => row.flows.spending.household !== `$0.00 ${TODAY}`), 'lean without its own entry is lean');
  // Against the baseline, the same walk would be no change at all: the test above can tell the two apart.
  assert.ok(expectedDifference(TWO, walk(TWO, entriesOf(TWO, 'baseline')), after).every((row) => row.flows.spending.household === `$0.00 ${TODAY}`));
  // An entry in the pool that the asked scenario does not project is not one it can change.
  assert.equal(JSON.parse(runProjection(TWO, { disable: ['cheaper'] })).refused, 'UNKNOWN_ENTRY');
});

test('the walk honours RETIRE and ILLNESS_SEPARATION once: a second one is refused by name, with the fix', () => {
  assert.deepEqual(HONOURED_ONCE, ['RETIRE', 'ILLNESS_SEPARATION']);
  // Added beside the demo's own retirement, for the same Person or for both.
  for (const owner of ['personA', 'household']) {
    const out = JSON.parse(runProjection(DEMO_PLAN, [{ ...RETIRE, owner }]));
    assert.equal(out.refused, 'HONOURED_ONCE', owner);
    assert.match(out.reason, /earliest RETIRE for Person A/);
    assert.match(out.reason, /replace the existing one \("dana-retires"\)/);
  }
  // Two added at once, neither of them the plan's.
  const twice = JSON.parse(runProjection(DEMO_PLAN, { add: [RETIRE, { ...RETIRE, date: '2034-01-01' }], disable: ['dana-retires'] }));
  assert.equal(twice.refused, 'HONOURED_ONCE');
  const apart = draft({ type: 'ILLNESS_SEPARATION', params: {}, date: '2040-01-01' });
  const separated = JSON.parse(runProjection(DEMO_PLAN, [apart, { ...apart, date: '2041-01-01' }]));
  assert.equal(separated.refused, 'HONOURED_ONCE');
  assert.match(separated.reason, /earliest ILLNESS_SEPARATION for the Household/);
  // Not over-broad: the other Person's first retirement, a single separation, and the replace itself all go through.
  assert.equal(JSON.parse(runProjection(DEMO_PLAN, [{ ...RETIRE, owner: 'personB' }])).refused, undefined);
  assert.equal(JSON.parse(runProjection(DEMO_PLAN, [apart])).refused, undefined);
  assert.equal(JSON.parse(runProjection(DEMO_PLAN, RETIRE_LATER)).refused, undefined);
});

test('a Retire after going back to work is not a second one: it stops work again (retire flow S3)', () => {
  // Dana's one account kept in accumulation, so the employer has somewhere to pay while she is back.
  const kept = structuredClone(DEMO_PLAN);
  kept.household.persons[0].superInterests[0].keepInAccumulationAtRetirement = true;
  const back = draft({ date: '2032-01-01', owner: 'personA', type: 'WORK_PATTERN_CHANGE', params: { daysPerWeek: 3, annualSalary: toCents(40_000) } });
  const out = JSON.parse(runProjection(kept, [back, RETIRE]));
  assert.equal(out.refused, undefined, out.reason);
  // The control: the same Retire without the return is still the second one, and refused.
  assert.equal(JSON.parse(runProjection(kept, [RETIRE])).refused, 'HONOURED_ONCE');
});

test('a what-if naming an entry wrongly, or not shaped as one, is refused by name', () => {
  const refused = (asked) => JSON.parse(runProjection(DEMO_PLAN, asked)).refused;
  assert.equal(refused({ disable: ['no-such-entry'] }), 'UNKNOWN_ENTRY');
  assert.equal(refused({ replace: [{ entryId: 'no-such-entry', with: RETIRE }] }), 'UNKNOWN_ENTRY');
  // An unknown id is named by its place and never echoed: it is the model's own text.
  const echoed = JSON.parse(runProjection(DEMO_PLAN, { disable: [`${NAMES[0]} $5`] }));
  assert.equal(echoed.refused, 'UNKNOWN_ENTRY');
  assert.match(echoed.reason, /^disable\[0\] /);
  assert.equal(refused({ disable: ['new-roof'], replace: [{ entryId: 'new-roof', with: ONE_OFF }] }), 'ENTRY_NAMED_TWICE');
  const offAlready = { ...DEMO_PLAN, entries: DEMO_ENTRIES.map((entry) => (entry.id === 'new-roof' ? { ...entry, enabled: false } : entry)) };
  assert.equal(JSON.parse(runProjection(offAlready, { disable: ['new-roof'] })).refused, 'ENTRY_ALREADY_OFF');
  for (const malformed of [{ remove: ['new-roof'] }, { disable: 'new-roof' }, { disable: [3] }, { replace: [{ entryId: 'new-roof' }] }, { replace: [{ id: 'new-roof', with: ONE_OFF }] }, 'retire later']) {
    assert.equal(refused(malformed), 'MALFORMED_DRAFTS', JSON.stringify(malformed));
  }
  // A replacement the door refuses comes back as the door's refusal, like an added draft.
  assert.equal(refused({ replace: [{ entryId: 'dana-retires', with: { ...RETIRE, owner: 'nobody' } }] }), 'WHAT_IF_REFUSED');
});

test('the child scenario never outlives its call, and never reaches the output', () => {
  const plan = structuredClone(TWO);
  const text = JSON.stringify(plan);
  const asIs = runProjection(plan, undefined, { scenarioId: 'lean' });
  const first = runProjection(plan, { disable: ['cheaper'], replace: [{ entryId: 'dana-retires', with: RETIRE }] }, { scenarioId: 'lean', detail: 'full' });
  assert.equal(JSON.stringify(plan), text);
  assert.equal(runProjection(plan, undefined, { scenarioId: 'lean' }), asIs);
  assert.equal(runProjection(plan, { disable: ['cheaper'], replace: [{ entryId: 'dana-retires', with: RETIRE }] }, { scenarioId: 'lean', detail: 'full' }), first);
  assert.ok(!first.includes('"what-if'), 'the in-memory scenario’s id reached the output');
  assert.equal(runProjection(deepFreeze(plan), { disable: ['cheaper'], replace: [{ entryId: 'dana-retires', with: RETIRE }] }, { scenarioId: 'lean', detail: 'full' }), first);
});

// --- Super accounts, numbered from 1 as the page numbers them ------------------------------------

test('a draft names super account 1, and the plan stores position 0', () => {
  const sacrifice = draft({ type: 'SUPER_CONTRIBUTION', owner: 'personA', date: '2027-07-01', params: { kind: 'salarySacrificed', annualAmount: toCents(5_000), interestIndex: 1 } });
  const out = whatIfOrRefusal(DEMO_PLAN, [sacrifice], { detail: 'full' });
  assert.equal(out.refused, undefined, JSON.stringify(out));
  const stored = { ...sacrifice, params: { ...sacrifice.params, interestIndex: 0 }, id: 'draft-1' };
  assert.deepEqual(out.financialYears, labelledFinancialYears(DEMO_PLAN.household, walk(DEMO_PLAN, [...DEMO_ENTRIES, stored]), DEMO_PLAN.settings));
  // The same, as a replacement.
  assert.equal(whatIfOrRefusal(DEMO_PLAN, { replace: [{ entryId: 'new-roof', with: sacrifice }] }).refused, undefined);
});

test('account 0, an account the Person does not hold, and a number that is not one are refused by name', () => {
  const lump = (interestIndex, owner = 'personA') => draft({ type: 'LUMP_SUM_FROM_SUPER', owner, params: { amount: toCents(5_000), interestIndex } });
  for (const [asked, place] of [[[lump(0)], 'add[0]'], [[lump(2)], 'add[0]'], [[lump('1')], 'add[0]'], [[lump(1.5)], 'add[0]'], [{ replace: [{ entryId: 'new-roof', with: lump(0) }] }, 'replace[0].with']]) {
    const out = JSON.parse(runProjection(DEMO_PLAN, asked));
    assert.equal(out.refused, 'UNKNOWN_SUPER_ACCOUNT', JSON.stringify(asked));
    assert.ok(out.reason.startsWith(`${place}.params.interestIndex names no super account`), out.reason);
    assert.match(out.reason, /numbered from 1, as the page numbers them; Person A holds super account 1 only$/);
  }
  // A spouse contribution names the OTHER Person's account.
  const spouse = (receivingInterestIndex) => draft({ type: 'SPOUSE_CONTRIBUTION', owner: 'personA', params: { amount: toCents(3_000), receivingInterestIndex } });
  const out = JSON.parse(runProjection(DEMO_PLAN, [spouse(2)]));
  assert.equal(out.refused, 'UNKNOWN_SUPER_ACCOUNT');
  assert.match(out.reason, /^add\[0\]\.params\.receivingInterestIndex .* Person B holds super account 1 only$/);
});

test('a door refusal that quotes a draft’s account quotes it numbered from 1', () => {
  // Person B's one account is an account-based pension, closed to contributions.
  const spouse = draft({ type: 'SPOUSE_CONTRIBUTION', owner: 'personA', params: { amount: toCents(3_000), receivingInterestIndex: 1 } });
  const raw = (() => {
    try {
      validatedPlan(planWithEntry(DEMO_PLAN, { ...spouse, params: { ...spouse.params, receivingInterestIndex: 0 }, id: 'draft-1' }));
    } catch (error) {
      return error.message;
    }
  })();
  assert.match(raw, /\.params\.receivingInterestIndex is 0, /, 'the door no longer quotes the stored position, so the re-numbering is untested');
  const out = JSON.parse(runProjection(DEMO_PLAN, [spouse]));
  assert.equal(out.refused, 'WHAT_IF_REFUSED');
  assert.match(out.reason, /\.params\.receivingInterestIndex is super account 1, /);
  assert.doesNotMatch(out.reason, /receivingInterestIndex is 0/);
});

// --- The compact view: the default ---------------------------------------------------------------

const COMPACT_CASES = [
  ['no drafts', DEMO_PLAN, []],
  ['retire two years later', DEMO_PLAN, RETIRE_LATER],
  ['a one-off expense', DEMO_PLAN, [ONE_OFF]],
  ['spend less', DEMO_PLAN, [SPEND_LESS]],
];

/** The six headline figures of a summary row, summed here from its own fields, in nominal cents. */
const headlineCents = ({ flows, stocks }) => ({
  spending: flows.spending.household + flows.spending.oneOffExpenses + flows.spending.mortgageRepayments,
  agePension: flows.agePension,
  incomeFromSuper: flows.income.incomeFromSuper,
  tax: flows.incomeTax + flows.division293Tax,
  unfundedShortfall: flows.unfundedShortfall,
  totalBalances: stocks.protectedAssets + stocks.assessableAssets,
});

/** The compact years a tool must send, derived from `project()` and the summariser, never from the tool. */
const expectedCompactYears = (plan, before, after) => {
  const basis = moneyBasis('todaysDollars', plan.settings);
  const was = financialYearSummaries(plan.household, before);
  const changed = [];
  const unchanged = [];
  financialYearSummaries(plan.household, after).forEach((row, index) => {
    const [a, b] = [headlineCents(row), headlineCents(was[index])];
    const moved = Object.keys(a).filter((key) => a[key] !== b[key]);
    if (moved.length === 0) unchanged.push(row.financialYear);
    else changed.push({ financialYear: row.financialYear, ...Object.fromEntries(moved.map((key) => [key, labelledFigure(a[key] - b[key], basis, row.lastMonth)])) });
  });
  return { changed, unchanged };
};

/** The years a "no change" line covers, each one: "2026-27 to 2029-30: no change" is four. */
const yearsIn = (line) => {
  const match = /^(\d{4})-\d{2}(?: to (\d{4})-\d{2})?: no change$/.exec(line);
  assert.ok(match, line);
  const [first, last] = [Number(match[1]), Number(match[2] ?? match[1])];
  return Array.from({ length: last - first + 1 }, (_, n) => `${first + n}-${String((first + n + 1) % 100).padStart(2, '0')}`);
};

test('compact is the default, and detail "full" is every figure of every year', () => {
  const compact = JSON.parse(runProjection(DEMO_PLAN, [SPEND_LESS]));
  assert.equal(compact.detail, 'compact');
  assert.equal(Object.hasOwn(compact, 'financialYears'), false);
  const full = JSON.parse(runProjection(DEMO_PLAN, [SPEND_LESS], { detail: 'full' }));
  assert.deepEqual(Object.keys(full), ['scenarioId', 'basis', 'draftEntryIds', 'disabledEntryIds', 'replacedEntryIds', 'financialYears', 'markers', 'difference']);
  assert.deepEqual(full, JSON.parse(JSON.stringify(whatIfOrRefusal(DEMO_PLAN, [SPEND_LESS], { detail: 'full' }))));
  assert.equal(JSON.parse(runProjection(DEMO_PLAN, [SPEND_LESS], { detail: 'everything' })).refused, 'UNKNOWN_DETAIL');
});

test('compact: every changed year with exactly its moved headlines, and every other year in a "no change" line', () => {
  let changedSeen = 0;
  let unchangedSeen = 0;
  for (const [name, plan, drafts] of COMPACT_CASES) {
    const out = JSON.parse(runProjection(plan, drafts));
    const before = walk(plan, entriesOf(plan, plan.activeScenarioId));
    const after = walk(plan, whatIfEntries(plan, plan.activeScenarioId, drafts));
    const { changed, unchanged } = expectedCompactYears(plan, before, after);
    assert.deepEqual(out.difference.differenceByYear, changed, name);
    assert.deepEqual(out.difference.unchangedYears.flatMap(yearsIn), unchanged, name);
    // Each year once, in one place or the other, and nothing collapsed that moved.
    const years = financialYearSummaries(plan.household, after).map((row) => row.financialYear);
    assert.deepEqual([...changed.map((row) => row.financialYear), ...unchanged].sort(), years, name);
    changedSeen += changed.length;
    unchangedSeen += unchanged.length;
  }
  assert.ok(changedSeen > 0 && unchangedSeen > 0, 'the fixtures never show both a changed and an unchanged year');
  // The retirement moves every year from the one the plan's own falls in (2031-05, in 2030-31) to the end of the forecast.
  const retire = JSON.parse(runProjection(DEMO_PLAN, RETIRE_LATER)).difference;
  assert.deepEqual(retire.unchangedYears, ['2026-27 to 2029-30: no change']);
  assert.equal(retire.differenceByYear[0].financialYear, '2030-31');
  assert.equal(retire.differenceByYear.at(-1).financialYear, financialYearSummaries(DEMO_PLAN.household, walk(DEMO_PLAN, DEMO_ENTRIES)).at(-1).financialYear);
  // No drafts: one line, every year.
  const none = JSON.parse(runProjection(DEMO_PLAN)).difference;
  assert.equal(none.nil, NO_DRAFTS);
  assert.deepEqual(none.differenceByYear, []);
  assert.equal(none.unchangedYears.length, 1);
});

test('compact: every marker, a changed one as its before and after and an unchanged one once', () => {
  for (const [name, plan, drafts] of COMPACT_CASES) {
    const compact = JSON.parse(runProjection(plan, drafts)).difference.markers;
    const full = JSON.parse(runProjection(plan, drafts, { detail: 'full' })).difference.markers;
    assert.deepEqual(Object.keys(compact.household), ['shortfallAge', 'pensionOnlyAge', 'contingencyFloor', 'mortgagePayoff'], name);
    assert.deepEqual(Object.keys(compact.perPerson), ['retirements', 'mortgageTargets'], name);
    for (const group of ['household', 'perPerson']) {
      for (const [marker, pair] of Object.entries(full[group])) {
        assert.deepEqual(compact[group][marker], pair.changed ? pair : { changed: false, beforeAndAfter: pair.before }, `${name} ${marker}`);
      }
    }
  }
  const retirements = JSON.parse(runProjection(DEMO_PLAN, RETIRE_LATER)).difference.markers.perPerson.retirements;
  assert.equal(retirements.changed, true);
  assert.deepEqual(retirements.after[0], { person: 'Person A', status: 'retires', month: '2033-05', age: 64 });
});

test('the size of what goes out, for the demo: compact is at most 10 KB when a retirement moves every later year', (t) => {
  for (const [name, plan, drafts] of COMPACT_CASES) {
    const compact = Buffer.byteLength(runProjection(plan, drafts));
    const full = Buffer.byteLength(runProjection(plan, drafts, { detail: 'full' }));
    t.diagnostic(`runProjection, ${name}: ${compact} bytes compact, ${full} full`);
    assert.ok(full > compact);
    // The target is set on the case that moves every later year; the others are recorded, not bounded.
    if (name === 'retire two years later') assert.ok(compact <= 10_000, `${name}: ${compact} bytes`);
  }
});
