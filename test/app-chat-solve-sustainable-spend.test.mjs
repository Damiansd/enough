// plan_ai.md §5 and §13 microtask 8 — `solveSustainableSpend(plan, {scenarioId?, basis?})`.
//
// A converged search goes out as its factor, the spend and the stated spend labelled with their
// basis, and the Shortfall Age read off a walk at that spend. Every other outcome of the solver is a
// named refusal carrying the solver's reason, and never a figure.
//
// Expectations come from `core/sustainableSpend.ts` and `project()` directly, never from the tool.
import test from 'node:test';
import assert from 'node:assert/strict';

import { toCents } from '../dist/core/money.js';
import { project, HOUSEHOLD_SPENDING_LINE } from '../dist/core/projection.js';
import { agesAt } from '../dist/core/outcomes.js';
import { scaledBy, sustainableSpend } from '../dist/core/sustainableSpend.js';
import { DEMO_ENTRIES, DEMO_PLAN } from '../dist/app/demoHousehold.js';
import { moneyBasis } from '../dist/app/todaysDollars.js';
import { FIGURE_OMITTED, labelledFigure } from '../dist/app/chat/tools/basisLabelled.js';
import { markers } from '../dist/app/chat/tools/getMarkers.js';
import { SEARCH_REASON, SEARCH_REFUSED, solveSustainableSpend, sustainableSpendOrRefusal } from '../dist/app/chat/tools/solveSustainableSpend.js';

const TAGS = { todaysDollars: '(today’s money)', futureDollars: '(future dollars)' };
const NAMES = DEMO_PLAN.household.persons.map(({ name }) => name);

const withEntry = (id, change) => ({ ...DEMO_PLAN, entries: DEMO_ENTRIES.map((entry) => (entry.id === id ? change(entry) : entry)) });

test('a converged search: the factor, both figures labelled with their basis, and the Shortfall Age at that spend', (t) => {
  for (const view of ['todaysDollars', 'futureDollars']) {
    const started = performance.now();
    const text = solveSustainableSpend(DEMO_PLAN, { basis: view });
    t.diagnostic(`solveSustainableSpend on the demo, ${view}: ${Math.round(performance.now() - started)} ms, ${Buffer.byteLength(text)} bytes`);
    const out = JSON.parse(text);
    const core = sustainableSpend(DEMO_PLAN.settings, DEMO_PLAN.household, DEMO_ENTRIES);
    assert.ok(core.kind === 'headroom' || core.kind === 'reduceSpending', core.kind);
    const basis = moneyBasis(view, DEMO_PLAN.settings);
    assert.equal(out.answer, core.kind);
    assert.equal(out.factor, core.factor);
    assert.equal(out.statedAt, core.atMonth);
    assert.equal(out.sustainableAnnualSpend, labelledFigure(core.sustainableAnnualSpend, basis, core.atMonth));
    assert.equal(out.statedAnnualSpend, labelledFigure(core.statedAnnualSpend, basis, core.atMonth));
    for (const figure of [out.sustainableAnnualSpend, out.statedAnnualSpend]) assert.ok(figure.startsWith('$') && figure.endsWith(` ${TAGS[view]}`), figure);
    assert.equal(out.basis, TAGS[view].slice(1, -1));
    assert.equal(out.walks, core.walks + 1);

    // The Shortfall Age is read off a walk at the converged spend, and there the plan never runs short.
    const scaled = scaledBy(DEMO_ENTRIES, core.factor);
    const walked = project(DEMO_PLAN.settings, DEMO_PLAN.household, scaled);
    assert.deepEqual(out.shortfallAgeAtThisSpend, JSON.parse(JSON.stringify(markers(DEMO_PLAN, 'baseline', walked, scaled, basis).household.shortfallAge)));
    assert.equal(out.shortfallAgeAtThisSpend.status, 'never');

    assert.equal(out.limitedBy.month, core.bindsAt);
    assert.equal(out.limitedBy.limb, core.limitedBy);
    assert.deepEqual(out.limitedBy.ages, agesAt(DEMO_PLAN.household, { month: core.bindsAt }).ages.map(({ age }, index) => ({ person: ['Person A', 'Person B'][index], age })));
    assert.equal(out.floorApplied, false);
    for (const name of NAMES) assert.ok(!text.includes(name));
  }
});

/** Every key a refusal must not carry: a figure of any kind. */
const assertNoFigure = (text, out) => {
  assert.ok(!text.includes('$'), text);
  assert.doesNotMatch(text, /\d cents?\b/);
  for (const key of ['factor', 'sustainableAnnualSpend', 'statedAnnualSpend', 'answer']) assert.equal(Object.hasOwn(out, key), false, key);
};

test('above the searched range: refused by name, and the floor the solver carries is not sent', () => {
  const plan = withEntry('spend-2026', (entry) => ({ ...entry, params: { annualSpend: toCents(5_000) } }));
  const core = sustainableSpend(plan.settings, plan.household, plan.entries);
  assert.equal(core.kind, 'higherThanSearched');
  assert.notEqual(core.sustainableAnnualSpend, undefined, 'the solver carries no figure here, so leaving it out proves nothing');
  const text = solveSustainableSpend(plan);
  const out = JSON.parse(text);
  assert.deepEqual(out, { scenarioId: 'baseline', refused: SEARCH_REFUSED.higherThanSearched, kind: 'higherThanSearched', reason: SEARCH_REASON.higherThanSearched });
  assertNoFigure(text, out);
});

test('nothing works: refused by name, with the first month that fails and both ages in it', () => {
  const plan = withEntry('new-roof', (entry) => ({ ...entry, date: '2026-10-01', params: { amount: toCents(5_000_000) } }));
  const core = sustainableSpend(plan.settings, plan.household, plan.entries);
  assert.equal(core.kind, 'nothingWorks');
  const text = solveSustainableSpend(plan);
  const out = JSON.parse(text);
  assert.equal(out.refused, SEARCH_REFUSED.nothingWorks);
  assert.equal(out.reason, SEARCH_REASON.nothingWorks);
  assert.deepEqual(out.firstFailingMonth, { month: core.bindsAt, ages: [{ person: 'Person A', age: 58 }, { person: 'Person B', age: 66 }], limb: core.limitedBy });
  assertNoFigure(text, out);
});

test('nothing to scale: refused by name', () => {
  const plan = withEntry('spend-2026', (entry) => ({ ...entry, enabled: false }));
  const text = solveSustainableSpend(plan);
  const out = JSON.parse(text);
  assert.deepEqual(out, { scenarioId: 'baseline', refused: SEARCH_REFUSED.nothingToScale, kind: 'nothingToScale', reason: SEARCH_REASON.nothingToScale });
  assertNoFigure(text, out);
});

test('a candidate the engine refused: refused by name, the engine’s words translated and their figure omitted', () => {
  let calls = 0;
  const refusing = (settings, household, entries) => {
    calls += 1;
    if (calls === 1) return project(settings, household, entries);
    throw new RangeError(`${NAMES[0]} cannot draw 12345 cents from super in 2031-06`);
  };
  const out = sustainableSpendOrRefusal(DEMO_PLAN, {}, refusing);
  assert.equal(out.refused, SEARCH_REFUSED.candidateRefused);
  assert.equal(out.reason, SEARCH_REASON.candidateRefused);
  assert.equal(out.engineSaid, `Person A cannot draw [${FIGURE_OMITTED}] from super in 2031-06`);
  assertNoFigure(JSON.stringify(out), out);
});

test('a level the solver read differently from the walk: refused with the solver’s own words', () => {
  // The walk's first month spends one cent a month more than the plan states.
  const drifting = (settings, household, entries) => {
    const months = project(settings, household, entries);
    const [first, ...rest] = months;
    const lines = first.lines.map((line) => (line.description === HOUSEHOLD_SPENDING_LINE ? { ...line, amount: line.amount + 1 } : line));
    return [{ ...first, lines }, ...rest];
  };
  const core = sustainableSpend(DEMO_PLAN.settings, DEMO_PLAN.household, DEMO_ENTRIES, drifting);
  assert.equal(core.kind, 'levelUnreadable');
  const out = sustainableSpendOrRefusal(DEMO_PLAN, {}, drifting);
  assert.deepEqual(out, { scenarioId: 'baseline', refused: SEARCH_REFUSED.levelUnreadable, kind: 'levelUnreadable', reason: core.reason });
  assertNoFigure(JSON.stringify(out), out);
});

test('a Scenario or a basis the plan does not have is refused by name', () => {
  assert.equal(JSON.parse(solveSustainableSpend(DEMO_PLAN, { scenarioId: 'nope' })).refused, 'UNKNOWN_SCENARIO');
  assert.equal(JSON.parse(solveSustainableSpend(DEMO_PLAN, { basis: 'nominal' })).refused, 'UNKNOWN_BASIS');
});
