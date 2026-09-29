// P15-7 — `proposeScenario`: a new scenario, checked, as a child of one the plan holds. The tool
// writes nothing; the review queue's Accept creates it with the scenario list's own Clone and the
// page's save, as a child that INHERITS its parent's entries and never copies one; Reject writes
// nothing. A bad parent, a blank name and a name already taken are refused by name.
import test from 'node:test';
import assert from 'node:assert/strict';

import { DEMO_PLAN } from '../dist/app/demoHousehold.js';
import { savePlan } from '../dist/app/planEdits.js';
import { scenarioEntries, scenarioById } from '../dist/app/scenarioWalks.js';
import { TOOL_BY_NAME } from '../dist/app/chat/toolCatalogue.js';
import { INHERITS, proposeScenario } from '../dist/app/chat/tools/proposeScenario.js';
import { NAME_TAKEN, PLAN_MOVED_ON, SAME_AS_PARENT, createReviewQueue, effectHtml } from '../dist/app/chat/reviewQueue.js';
import { moneyBasis } from '../dist/app/todaysDollars.js';

const SPEND_2060 = { date: '2060-01-01', owner: 'household', type: 'SPEND_CHANGE', params: { annualSpend: 5_500_000 }, enabled: true, createdAt: '2026-09-24' };
const PARENT_IDS = DEMO_PLAN.scenarios.find(({ id }) => id === 'baseline').entryIds;

/** The page's save, as `main.ts` wires it: through `savePlan`, with a spy for the transport. */
const page = (plan = DEMO_PLAN) => {
  const state = { plan, saves: 0, writes: [] };
  state.save = async (candidate) => {
    state.saves += 1;
    try {
      state.plan = (await savePlan({ writePlan: async (written) => void state.writes.push(written) }, candidate)).plan;
      return true;
    } catch {
      return false;
    }
  };
  return state;
};

const accept = (queue, item, state) => {
  let n = 0;
  return queue.accept(item.id, { plan: state.plan, save: state.save, newId: () => `accepted-${++n}`, today: '2026-09-28' });
};

test('the tool: a name and a parent come back checked, inheriting, with nothing saved; it is in the catalogue', () => {
  const json = JSON.parse(proposeScenario(DEMO_PLAN, '  Retire later  ', 'baseline'));
  assert.deepEqual(json, { proposedScenario: { name: 'Retire later', parentId: 'baseline' }, inherits: INHERITS });
  const tool = TOOL_BY_NAME.get('proposeScenario');
  assert.deepEqual(tool.definition.inputSchema.required, ['name', 'parentId']);
  assert.equal(tool.run(DEMO_PLAN, { name: 'Retire later', parentId: 'baseline' }), proposeScenario(DEMO_PLAN, 'Retire later', 'baseline'));

  const withEntries = JSON.parse(proposeScenario(DEMO_PLAN, 'Spend less', 'baseline', { add: [SPEND_2060] }));
  assert.equal(withEntries.toType.length, 1);
  assert.equal(withEntries.scenarioId, undefined, 'the parent’s id is given back as if the entries went into it');
});

test('refusals by name: a parent the plan does not hold, a blank name, a name already taken, a bad entry', () => {
  const refused = (name, parentId, whatIf) => JSON.parse(proposeScenario(DEMO_PLAN, name, parentId, whatIf)).refused;
  assert.equal(refused('Retire later', 'no-such-scenario'), 'UNKNOWN_SCENARIO');
  assert.equal(refused('   ', 'baseline'), 'BLANK_NAME');
  assert.equal(refused('Baseline', 'baseline'), 'DUPLICATE_NAME');
  assert.equal(refused(' Baseline ', 'baseline'), 'DUPLICATE_NAME');
  assert.equal(refused('Retire later', 'baseline', { disable: ['no-such-entry'] }), 'UNKNOWN_ENTRY');
  // The names are the user's own text: a refusal never gives them back.
  assert.doesNotMatch(proposeScenario(DEMO_PLAN, 'Baseline', 'baseline'), /Baseline/);
  // And the queue will not take what the tool refuses.
  const queue = createReviewQueue();
  assert.equal(queue.add(DEMO_PLAN, { whatIf: undefined, scenarioId: 'nope', newScenario: { name: 'X', parentId: 'nope' } }), undefined);
  assert.equal(queue.add(DEMO_PLAN, { whatIf: undefined, scenarioId: 'baseline', newScenario: { name: 'Baseline', parentId: 'baseline' } }), undefined);
  assert.deepEqual(queue.items(), []);
});

test('Accept creates exactly one child, through the page’s save, with the right parent and no copied entries', async () => {
  const state = page();
  const queue = createReviewQueue();
  const item = queue.add(state.plan, { whatIf: undefined, scenarioId: 'baseline', newScenario: { name: 'Retire later', parentId: 'baseline' } });
  assert.deepEqual(effectHtml(item, moneyBasis('todaysDollars', DEMO_PLAN.settings)), [SAME_AS_PARENT]);
  assert.deepEqual(await accept(queue, item, state), { kind: 'saved' });
  assert.equal(state.saves, 1);
  assert.equal(state.writes.length, 1);
  const written = state.writes[0];
  const added = written.scenarios.filter(({ id }) => !DEMO_PLAN.scenarios.some((each) => each.id === id));
  assert.deepEqual(added, [{ id: 'accepted-1', name: 'Retire later', parentId: 'baseline', entryIds: [] }]);
  assert.deepEqual(written.entries, DEMO_PLAN.entries, 'the entry pool changed');
  assert.equal(written.activeScenarioId, DEMO_PLAN.activeScenarioId);
  // It inherits: the parent's entries reach it by reference.
  assert.deepEqual(scenarioEntries(written, scenarioById(written, 'accepted-1')).map(({ id }) => id).sort(), [...PARENT_IDS].sort());
  assert.deepEqual(queue.items(), []);
});

test('Accept with entries: they go into the NEW scenario only, as its own, and the parent is untouched', async () => {
  const state = page();
  const queue = createReviewQueue();
  const item = queue.add(state.plan, { whatIf: { add: [SPEND_2060] }, scenarioId: 'baseline', newScenario: { name: 'Spend less', parentId: 'baseline' } });
  assert.match(item.wording[0], /^New scenario “Spend less”, inheriting every entry of “Baseline”/);
  assert.equal(item.wording.length, 2);
  assert.deepEqual(await accept(queue, item, state), { kind: 'saved' });
  assert.equal(state.writes.length, 1);
  const written = state.writes[0];
  const child = written.scenarios.find(({ id }) => id === 'accepted-1');
  assert.deepEqual(child, { id: 'accepted-1', name: 'Spend less', parentId: 'baseline', entryIds: ['accepted-2'] });
  assert.deepEqual(written.scenarios.find(({ id }) => id === 'baseline'), DEMO_PLAN.scenarios[0]);
  assert.equal(written.entries.length, DEMO_PLAN.entries.length + 1);
});

test('Reject writes nothing: no save, and the suggestion is gone', () => {
  const state = page();
  const queue = createReviewQueue();
  const item = queue.add(state.plan, { whatIf: undefined, scenarioId: 'baseline', newScenario: { name: 'Retire later', parentId: 'baseline' } });
  queue.reject(item.id);
  assert.equal(state.saves, 0);
  assert.deepEqual(state.writes, []);
  assert.equal(state.plan, DEMO_PLAN);
  assert.deepEqual(queue.items(), []);
});

test('Accept re-checks: a name taken or a parent gone since the suggestion writes nothing, and the card stays', async () => {
  const queue = createReviewQueue();
  const item = queue.add(DEMO_PLAN, { whatIf: undefined, scenarioId: 'baseline', newScenario: { name: 'Retire later', parentId: 'baseline' } });
  const taken = page({ ...DEMO_PLAN, scenarios: [...DEMO_PLAN.scenarios, { id: 'other', name: 'Retire later', parentId: null, entryIds: [] }] });
  assert.deepEqual(await accept(queue, item, taken), { kind: 'notSaved', message: NAME_TAKEN });
  const gone = page({ ...DEMO_PLAN, activeScenarioId: 'root', scenarios: [{ id: 'root', name: 'Root', parentId: null, entryIds: [] }] });
  assert.deepEqual(await accept(queue, item, gone), { kind: 'notSaved', message: PLAN_MOVED_ON });
  assert.equal(taken.saves + gone.saves, 0);
  assert.equal(queue.items().length, 1);
});
