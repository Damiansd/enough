// P11-5 / P11-6 — categorisation rules that SUGGEST (ADR-0004), and subcategories offered back.
// User ruling 2026-09-28: a rule's batch is reviewed WHOLE — Accept all · Reject; per-row unticking is deferred.
//
// What is proven here, the panel half against the bytes the fake disk holds:
//   * Accept appends exactly one Categorisation per batch member, each carrying the rule's id, in one write;
//   * Reject writes nothing;
//   * a Transaction categorised by hand is in no batch, whatever rule matches it;
//   * an import OFFERS the batches its rows fall into and applies none;
//   * where two rules match, the most recently saved one gets the Transaction, and both cards say so;
//   * a ledger without rules reads and writes back to its own bytes.
import test from 'node:test';
import assert from 'node:assert/strict';

import { FakeEvent, byText, installDocument } from './fixtures/fakeDom.mjs';
import { LedgerCategorisationError, LedgerCategorisationRuleError, LedgerDuplicateIdError, LedgerFileShapeError, appended, parseLedger } from '../dist/core/ledger.js';
import { liveRules, subcategoriesInUse, suggestionBatches } from '../dist/app/categorisationRules.js';
import { RULE_LABELS, TRANSACTION_LABELS, mountTransactionsPanel } from '../dist/app/transactionsPanel.js';

const bytes = (value) => JSON.stringify(value, null, 2);

const txn = (id, description, extra = {}) => ({
  id, date: '2026-09-01', amount: -1000, description, account: 'Everyday', createdAt: '2026-09-02', origin: 'import', ...extra,
});
// Keys in the order the door writes them, so a round trip can be compared byte for byte.
const rule = (id, match, category, { account, subcategory } = {}) => ({
  id, match, ...(account === undefined ? {} : { account }), category, ...(subcategory === undefined ? {} : { subcategory }), createdAt: '2026-09-10',
});
const manual = (id, transactionId, category, { subcategory, ruleId } = {}) => ({
  id, transactionId, category, ...(subcategory === undefined ? {} : { subcategory }), ...(ruleId === undefined ? {} : { ruleId }), createdAt: '2026-09-05',
});

const BASE = {
  version: 1,
  transactions: [
    txn('t1', 'WOOLWORTHS 1234 SYDNEY'),
    txn('t2', 'Woolworths Metro'),
    txn('t3', 'COLES 55'),
    txn('t4', 'WOOLWORTHS PETROL', { account: 'Credit card' }),
    txn('t5', 'Woolworths online'),
  ],
  categorisations: [],
};
const clone = () => JSON.parse(JSON.stringify(BASE));
const ids = (batch) => batch.transactions.map((each) => each.id);

// --- The file -------------------------------------------------------------------------------------

test('a ledger without rules round-trips to its own bytes, and a hand categorisation carries no ruleId', () => {
  const file = { ...clone(), categorisations: [manual('c1', 't1', 'Committed', { subcategory: 'Groceries' })] };
  const text = bytes(file);
  const ledger = parseLedger(JSON.parse(text));
  assert.equal(bytes(ledger), text);
  assert.equal(Object.hasOwn(ledger, 'categorisationRules'), false);
  const grown = appended(ledger, [], [manual('c2', 't2', 'Discretionary')]);
  assert.equal(Object.hasOwn(grown, 'categorisationRules'), false);
  assert.equal(Object.hasOwn(grown.categorisations[1], 'ruleId'), false);
  assert.equal(bytes(parseLedger(JSON.parse(bytes(grown)))), bytes(grown));
});

test('a ledger with rules and rule-made categorisations round-trips to its own bytes', () => {
  const file = {
    ...clone(),
    categorisations: [manual('c1', 't1', 'Committed', { subcategory: 'Groceries', ruleId: 'r1' })],
    categorisationRules: [
      rule('r1', 'woolworths', 'Committed', { subcategory: 'Groceries' }),
      rule('r2', 'COLES', 'Committed', { account: 'Everyday' }),
      { id: 'r3', match: 'COLES', account: 'Everyday', retired: true, createdAt: '2026-09-11' },
    ],
  };
  const text = bytes(file);
  assert.equal(bytes(parseLedger(JSON.parse(text))), text);
});

test('the door refuses a malformed rule by name, and a ruleId that names no suggesting rule', () => {
  const cases = [
    { id: 'r', match: '  ', category: 'Committed', createdAt: '2026-09-10' },
    { id: 'r', match: 'X', createdAt: '2026-09-10' },
    { id: 'r', match: 'X', category: 'Committed', retired: true, createdAt: '2026-09-10' },
    { id: 'r', match: 'X', retired: false, createdAt: '2026-09-10' },
    { id: 'r', match: 'X', retired: true, subcategory: 'Groceries', createdAt: '2026-09-10' },
    { id: 'r', match: 'X', category: 'Groceries', createdAt: '2026-09-10' },
    { id: 'r', match: 'X', category: 'Committed', account: '', createdAt: '2026-09-10' },
    { id: 'r', match: 'X', category: 'Committed', createdAt: '2026-09-10', priority: 1 },
  ];
  for (const each of cases) assert.throws(() => parseLedger({ ...clone(), categorisationRules: [each] }), LedgerCategorisationRuleError, JSON.stringify(each));
  assert.throws(() => parseLedger({ ...clone(), categorisationRules: [rule('r1', 'A', 'Committed'), rule('r1', 'B', 'Committed')] }), LedgerDuplicateIdError);
  assert.throws(() => parseLedger({ ...clone(), categorisationRules: {} }), LedgerFileShapeError);
  assert.throws(() => parseLedger({ ...clone(), categorisations: [manual('c1', 't1', 'Committed', { ruleId: 'nope' })] }), LedgerCategorisationError);
  const retiredOnly = [{ id: 'r9', match: 'X', retired: true, createdAt: '2026-09-10' }];
  assert.throws(() => parseLedger({ ...clone(), categorisations: [manual('c1', 't1', 'Committed', { ruleId: 'r9' })], categorisationRules: retiredOnly }), LedgerCategorisationError);
});

// --- Matching -------------------------------------------------------------------------------------

test('a rule matches a piece of the raw description, case ignored, and only its account when it names one', () => {
  const any = parseLedger({ ...clone(), categorisationRules: [rule('r1', 'woolworths', 'Committed')] });
  assert.deepEqual(suggestionBatches(any).map(ids), [['t1', 't2', 't4', 't5']]);
  const held = parseLedger({ ...clone(), categorisationRules: [rule('r1', 'woolworths', 'Committed', { account: 'Credit card' })] });
  assert.deepEqual(suggestionBatches(held).map(ids), [['t4']]);
});

test('a transaction categorised by hand is in no batch; one categorised by an older rule is offered again when the rule changes', () => {
  const ledger = parseLedger({
    ...clone(),
    categorisations: [
      manual('c1', 't1', 'Discretionary'),
      manual('c2', 't2', 'Committed', { subcategory: 'Groceries', ruleId: 'r1' }),
      manual('c3', 't5', 'One-off', { ruleId: 'r1' }),
      manual('c4', 't5', 'Committed', { subcategory: 'Groceries' }), // then by hand, to the rule's own answer
    ],
    categorisationRules: [rule('r1', 'WOOLWORTHS', 'Committed', { subcategory: 'Groceries' })],
  });
  // t1 and t5 by hand: never. t2 already has what r1 suggests: nothing to suggest.
  assert.deepEqual(suggestionBatches(ledger).map(ids), [['t4']]);
  const changed = appended(ledger, [], [], [], [rule('r2', 'woolworths', 'Committed', { subcategory: 'Food' })]);
  assert.deepEqual(liveRules(changed).map((each) => each.id), ['r2'], 'the last record for a text (case ignored) is the rule');
  assert.deepEqual(suggestionBatches(changed).map(ids), [['t2', 't4']]);
  const retired = appended(changed, [], [], [], [{ id: 'r3', match: 'WoolWorths', retired: true, createdAt: '2026-09-12' }]);
  assert.deepEqual(liveRules(retired), []);
  assert.deepEqual(suggestionBatches(retired), []);
});

test('two rules matching one transaction: the rule saved most recently gets it, and each batch records the overlap', () => {
  const ledger = parseLedger({
    ...clone(),
    categorisationRules: [rule('r1', 'WOOLWORTHS', 'Committed', { subcategory: 'Groceries' }), rule('r2', 'PETROL', 'Committed', { subcategory: 'Car' })],
  });
  const [newer, older] = suggestionBatches(ledger);
  assert.equal(newer.rule.id, 'r2');
  assert.deepEqual(ids(newer), ['t4']);
  assert.deepEqual(ids(older), ['t1', 't2', 't5']);
  assert.deepEqual(newer.tookFrom.map((each) => [each.rule.id, each.count]), [['r1', 1]]);
  assert.deepEqual(older.gaveUp.map((each) => [each.rule.id, each.count]), [['r2', 1]]);
  // Re-saving the older rule makes it the newer one, and it takes the transaction back.
  const resaved = appended(ledger, [], [], [], [rule('r3', 'WOOLWORTHS', 'Committed', { subcategory: 'Groceries' })]);
  assert.deepEqual(suggestionBatches(resaved).map((batch) => [batch.rule.id, ids(batch)]), [['r3', ['t1', 't2', 't4', 't5']]]);
});

test('P11-5: subcategories in use are offered per category, once each, from categorisations and live rules', () => {
  const ledger = parseLedger({
    ...clone(),
    categorisations: [manual('c1', 't1', 'Committed', { subcategory: 'Groceries' }), manual('c2', 't2', 'Committed', { subcategory: 'Groceries' }), manual('c3', 't3', 'Discretionary', { subcategory: 'Dining' })],
    categorisationRules: [rule('r1', 'X', 'One-off', { subcategory: 'Gifts' }), rule('r2', 'Y', 'Committed', { subcategory: 'Car' })],
  });
  assert.deepEqual(subcategoriesInUse(ledger), { Committed: ['Car', 'Groceries'], Discretionary: ['Dining'], 'One-off': ['Gifts'], Other: [] });
});

// --- The panel ------------------------------------------------------------------------------------

const disk = (text) => {
  const state = { text, writes: 0 };
  const transport = {
    readLedger: async () => (state.text === null ? null : JSON.parse(state.text)),
    writeLedger: async (ledger) => {
      state.writes += 1;
      state.text = JSON.stringify(ledger);
    },
  };
  return { state, transport };
};
const onDisk = (state) => JSON.parse(state.text);

const mount = async (file) => {
  const dom = installDocument();
  const box = dom.document.createElement('div');
  dom.document.body.append(box);
  const { state, transport } = disk(file === null ? null : JSON.stringify(file));
  let next = 0;
  await mountTransactionsPanel(box, null, { transport, today: () => '2026-09-28', newId: () => `n${(next += 1)}` });
  return { dom, box, state };
};

const named = (root, name) => root.descendants().find((each) => each.name === name);
const choose = async (root, name, value) => {
  const control = named(root, name);
  assert.ok(control, `no control named ${name}`);
  control.value = value;
  await Promise.all(control.dispatch(new FakeEvent('change')));
};
const cards = (box) => box.descendants().filter((each) => each.tagName === 'DIV' && each.className === 'suggestion');
const card = (box, ruleId) => {
  const found = cards(box).filter((each) => each.dataset.rule === ruleId);
  assert.equal(found.length, 1, `expected one card for ${ruleId}, found ${found.length}`);
  return found[0];
};
const buttonIn = (root, text) => {
  const found = byText(root, text).filter((each) => each.tagName === 'BUTTON');
  assert.equal(found.length, 1, `expected one "${text}" button, found ${found.length}`);
  return found[0];
};
const row = (box, id) => box.descendants().find((each) => each.tagName === 'TR' && each.dataset.id === id);

const WITH_RULE = { ...clone(), categorisationRules: [rule('r1', 'WOOLWORTHS', 'Committed', { subcategory: 'Groceries' })] };

test('Accept all appends exactly one Categorisation per batch member, each carrying the rule id, in one write', async () => {
  const { dom, box, state } = await mount(WITH_RULE);
  try {
    assert.equal(byText(card(box, 'r1'), '4 transactions match "WOOLWORTHS" → Committed / Groceries').length > 0, true);
    await buttonIn(card(box, 'r1'), RULE_LABELS.accept).clicked();
    assert.equal(state.writes, 1);
    const after = onDisk(state);
    assert.deepEqual(after.categorisations.map((each) => [each.transactionId, each.category, each.subcategory, each.ruleId]), [
      ['t1', 'Committed', 'Groceries', 'r1'],
      ['t2', 'Committed', 'Groceries', 'r1'],
      ['t4', 'Committed', 'Groceries', 'r1'],
      ['t5', 'Committed', 'Groceries', 'r1'],
    ]);
    assert.deepEqual(after.transactions, BASE.transactions);
    assert.deepEqual(after.categorisationRules, WITH_RULE.categorisationRules);
    assert.deepEqual(cards(box), [], 'an accepted batch is offered again');
  } finally {
    dom.uninstall();
  }
});

test('Reject writes nothing, and the card is set aside for this page', async () => {
  const { dom, box, state } = await mount(WITH_RULE);
  const before = state.text;
  try {
    await buttonIn(card(box, 'r1'), RULE_LABELS.reject).clicked();
    assert.equal(state.writes, 0);
    assert.equal(state.text, before);
    assert.deepEqual(cards(box), []);
    assert.match(box.textContent, /Nothing was recorded\. The suggestion from "WOOLWORTHS" is set aside until the page is reloaded/);
  } finally {
    dom.uninstall();
  }
  const again = await mount(WITH_RULE);
  try {
    assert.equal(cards(again.box).length, 1, 'a reload does not offer the rejected batch again');
  } finally {
    again.dom.uninstall();
  }
});

test('categorising a transaction by hand takes it out of every batch, and Accept then leaves it alone', async () => {
  const { dom, box, state } = await mount(WITH_RULE);
  try {
    await choose(row(box, 't2'), 'transactionCategory', 'Discretionary');
    await buttonIn(row(box, 't2'), TRANSACTION_LABELS.setCategory).clicked();
    assert.equal(state.writes, 1);
    assert.equal(Object.hasOwn(onDisk(state).categorisations[0], 'ruleId'), false, 'a hand categorisation was recorded as a rule one');
    assert.match(card(box, 'r1').textContent, /^3 transactions match/);
    await buttonIn(card(box, 'r1'), RULE_LABELS.accept).clicked();
    const after = onDisk(state);
    assert.deepEqual(after.categorisations.map((each) => [each.transactionId, each.category, each.ruleId]), [
      ['t2', 'Discretionary', undefined],
      ['t1', 'Committed', 'r1'],
      ['t4', 'Committed', 'r1'],
      ['t5', 'Committed', 'r1'],
    ]);
  } finally {
    dom.uninstall();
  }
});

test('two matching rules: the card of the newer one takes the transaction and the older card says where it went', async () => {
  const { dom, box } = await mount({
    ...clone(),
    categorisationRules: [rule('r1', 'WOOLWORTHS', 'Committed', { subcategory: 'Groceries' }), rule('r2', 'PETROL', 'Committed', { subcategory: 'Car' })],
  });
  try {
    assert.match(card(box, 'r2').textContent, /^1 transaction matches "PETROL" → Committed \/ Car/);
    assert.match(card(box, 'r2').textContent, /1 of these also matches your older rule "WOOLWORTHS"; where two rules match, the one saved most recently makes the suggestion\./);
    assert.match(card(box, 'r1').textContent, /^3 transactions match "WOOLWORTHS"/);
    assert.match(card(box, 'r1').textContent, /1 more matches this rule but is in the batch of your newer rule "PETROL" instead, and not in this one\./);
    assert.equal(byText(card(box, 'r1'), 'WOOLWORTHS PETROL').length, 0, 'the older card lists a transaction the newer rule took');
  } finally {
    dom.uninstall();
  }
});

test('Save rule appends one rule record and no Categorisation; Retire appends a retirement', async () => {
  const { dom, box, state } = await mount(clone());
  try {
    assert.deepEqual(cards(box), []);
    await choose(box, 'ruleMatch', ' woolworths ');
    await choose(box, 'ruleCategory', 'Committed');
    await choose(box, 'ruleSubcategory', 'Groceries');
    await buttonIn(box, RULE_LABELS.save).clicked();
    assert.equal(state.writes, 1);
    const after = onDisk(state);
    assert.deepEqual(after.categorisations, []);
    assert.deepEqual(after.categorisationRules, [{ id: 'n1', match: 'woolworths', category: 'Committed', subcategory: 'Groceries', createdAt: '2026-09-28' }]);
    assert.equal(cards(box).length, 1, 'a saved rule offers nothing');
    await buttonIn(box, RULE_LABELS.retire).clicked();
    assert.equal(state.writes, 2);
    assert.deepEqual(onDisk(state).categorisationRules[1], { id: 'n2', match: 'woolworths', retired: true, createdAt: '2026-09-28' });
    assert.deepEqual(cards(box), []);
  } finally {
    dom.uninstall();
  }
});

test('an import OFFERS the batches its rows fall into and applies none', async () => {
  const file = {
    version: 1,
    transactions: [],
    categorisations: [],
    importMappings: [{
      id: 'm1', header: ['Date', 'Amount', 'Description'], dateColumn: 'Date', dateFormat: 'DD/MM/YYYY',
      descriptionColumn: 'Description', amountColumn: 'Amount', account: 'Everyday', createdAt: '2026-09-01',
    }],
    categorisationRules: [rule('r1', 'woolworths', 'Committed', { subcategory: 'Groceries' })],
  };
  const { dom, box, state } = await mount(file);
  try {
    const input = named(box, 'transactionsCsv');
    input.files = [{ name: 'september.csv', text: async () => 'Date,Amount,Description\n03/09/2026,-80.00,WOOLWORTHS 1234\n04/09/2026,-5.00,COFFEE\n05/09/2026,-20.00,Woolworths Metro\n' }];
    await Promise.all(input.dispatch(new FakeEvent('change')));
    await buttonIn(box, 'Import 3 rows').clicked();
    assert.equal(state.writes, 1);
    const after = onDisk(state);
    assert.equal(after.transactions.length, 3);
    assert.deepEqual(after.categorisations, [], 'an import categorised something');
    assert.match(card(box, 'r1').textContent, /^2 transactions match "woolworths" → Committed \/ Groceries/);
    assert.match(box.textContent, /3 added, 0 skipped as already imported\. Your rules suggest a category for 2 of them — review below; nothing is categorised until you accept\./);
  } finally {
    dom.uninstall();
  }
});

test('P11-5: the subcategory box offers those already used under the chosen category', async () => {
  const { dom, box } = await mount({
    ...clone(),
    categorisations: [manual('c1', 't3', 'Committed', { subcategory: 'Groceries' }), manual('c2', 't1', 'Discretionary', { subcategory: 'Dining' })],
  });
  try {
    const list = box.descendants().find((each) => each.tagName === 'DATALIST' && each.id === 'subcategories-Committed');
    assert.deepEqual(list.children.map((each) => each.value), ['Groceries']);
    await choose(row(box, 't2'), 'transactionCategory', 'Committed');
    assert.equal(named(row(box, 't2'), 'transactionSubcategory').getAttribute('list'), 'subcategories-Committed');
    await choose(row(box, 't2'), 'transactionCategory', 'Discretionary');
    assert.equal(named(row(box, 't2'), 'transactionSubcategory').getAttribute('list'), 'subcategories-Discretionary');
  } finally {
    dom.uninstall();
  }
});
