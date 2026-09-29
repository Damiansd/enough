// The Transactions list's filters (user request 2026-09-28), run against the stand-in DOM and a fake disk.
//
// What is proven here:
//   * each filter alone narrows the list — category by the CURRENT Categorisation, description by a
//     case-ignored piece, account, and a date range inclusive at both ends;
//   * the filters combine, and the count-and-total line follows what is shown;
//   * "Not categorised" survives the redraw a saved category causes, and the row leaves it;
//   * Clear filters shows everything again;
//   * no filtering, and no Clear, ever writes to the ledger.
import test from 'node:test';
import assert from 'node:assert/strict';

import { FakeEvent, byText, installDocument } from './fixtures/fakeDom.mjs';
import { FILTER_LABELS, TRANSACTION_LABELS, mountTransactionsPanel } from '../dist/app/transactionsPanel.js';

const FIVE = JSON.stringify({
  version: 1,
  transactions: [
    { id: 't1', date: '2026-09-01', amount: -4500, description: 'Groceries Woolworths', account: 'Cash', createdAt: '2026-09-01', origin: 'manual' },
    { id: 't2', date: '2026-09-02', amount: -12000, description: 'Petrol', account: 'Card', createdAt: '2026-09-02', origin: 'manual' },
    { id: 't3', date: '2026-09-03', amount: 50000, description: 'Salary', account: 'Everyday', createdAt: '2026-09-03', origin: 'manual' },
    { id: 't4', date: '2026-09-04', amount: -2500, description: 'Coffee', account: 'Card', createdAt: '2026-09-04', origin: 'manual' },
    { id: 't5', date: '2026-09-05', amount: -30000, description: 'Flight', account: 'Card', createdAt: '2026-09-05', origin: 'manual' },
  ],
  categorisations: [
    { id: 'c1', transactionId: 't1', category: 'Committed', createdAt: '2026-09-06' },
    // t2 was Committed first and Discretionary now: the filter reads the NEWEST.
    { id: 'c2', transactionId: 't2', category: 'Committed', createdAt: '2026-09-06' },
    { id: 'c3', transactionId: 't2', category: 'Discretionary', createdAt: '2026-09-07' },
    { id: 'c4', transactionId: 't3', category: 'Other', createdAt: '2026-09-06' },
    { id: 'c5', transactionId: 't5', category: 'One-off', createdAt: '2026-09-06' },
  ],
});

const mount = async (text) => {
  const dom = installDocument();
  const box = dom.document.createElement('div');
  dom.document.body.append(box);
  const state = { text, writes: 0 };
  const transport = {
    readLedger: async () => JSON.parse(state.text),
    writeLedger: async (ledger) => {
      state.writes += 1;
      state.text = JSON.stringify(ledger);
    },
  };
  let next = 0;
  await mountTransactionsPanel(box, null, { transport, today: () => '2026-09-28', newId: () => `n${(next += 1)}` });
  return { dom, box, state };
};

const named = (root, name) => root.descendants().find((each) => each.name === name);
const row = (box, id) => box.descendants().find((each) => each.tagName === 'TR' && each.dataset.id === id);
const only = (root, text) => {
  const found = byText(root, text).filter((each) => each.tagName === 'BUTTON');
  assert.equal(found.length, 1, `expected one "${text}", found ${found.length}`);
  return found[0];
};
/** The rows the list shows, oldest appended first (the list itself is newest first). */
const shown = (box) => box.descendants().filter((each) => each.tagName === 'TR' && each.dataset.id).map((each) => each.dataset.id).reverse();
const countLine = (box) => box.descendants().find((each) => each.tagName === 'P' && each.classList.contains('transaction-filter-count')).textContent;
/** As the browser does: the value changes, then the control says so. */
const set = (box, name, value) => {
  const control = named(box, name);
  control.value = value;
  control.dispatch(new FakeEvent(control.tagName === 'SELECT' ? 'change' : 'input'));
};

test('with no filter every transaction is shown, and the line counts and totals them in whole dollars', async () => {
  const { dom, box, state } = await mount(FIVE);
  try {
    assert.deepEqual(shown(box), ['t1', 't2', 't3', 't4', 't5']);
    assert.equal(countLine(box), 'Showing 5 of 5 transactions. Total shown: $490 out, $500 in.');
    assert.deepEqual(named(box, 'filterAccount').children.map((each) => each.textContent), ['All', 'Card', 'Cash', 'Everyday']);
    assert.deepEqual(named(box, 'filterCategory').children.map((each) => each.textContent), ['All', 'Committed', 'Discretionary', 'One-off', 'Other', 'Not categorised']);
    assert.equal(state.writes, 0);
  } finally {
    dom.uninstall();
  }
});

test('category alone filters by the CURRENT category, not the first one given', async () => {
  const { dom, box, state } = await mount(FIVE);
  try {
    const expected = { Committed: ['t1'], Discretionary: ['t2'], 'One-off': ['t5'], Other: ['t3'], none: ['t4'], '': ['t1', 't2', 't3', 't4', 't5'] };
    for (const [category, ids] of Object.entries(expected)) {
      set(box, 'filterCategory', category);
      assert.deepEqual(shown(box), ids, `category "${category}"`);
    }
    assert.equal(state.writes, 0);
  } finally {
    dom.uninstall();
  }
});

test('description alone: a case-ignored piece of the description, filtered as it is typed', async () => {
  const { dom, box, state } = await mount(FIVE);
  try {
    const typed = named(box, 'filterDescription');
    set(box, 'filterDescription', 'W');
    assert.deepEqual(shown(box), ['t1'], 'W matches Groceries Woolworths only');
    set(box, 'filterDescription', 'wOOL');
    assert.deepEqual(shown(box), ['t1']);
    set(box, 'filterDescription', 'f');
    assert.deepEqual(shown(box), ['t4', 't5']);
    set(box, 'filterDescription', 'nothing like it');
    assert.deepEqual(shown(box), []);
    assert.equal(countLine(box), 'Showing 0 of 5 transactions. Total shown: $0 out, $0 in.');
    assert.equal(named(box, 'filterDescription'), typed, 'the text box was rebuilt as it was typed in, which takes the cursor out of it');
    assert.equal(state.writes, 0);
  } finally {
    dom.uninstall();
  }
});

test('account alone', async () => {
  const { dom, box, state } = await mount(FIVE);
  try {
    set(box, 'filterAccount', 'a:Card');
    assert.deepEqual(shown(box), ['t2', 't4', 't5']);
    assert.equal(countLine(box), 'Showing 3 of 5 transactions. Total shown: $445 out, $0 in.');
    set(box, 'filterAccount', 'a:Everyday');
    assert.deepEqual(shown(box), ['t3']);
    set(box, 'filterAccount', '');
    assert.deepEqual(shown(box), ['t1', 't2', 't3', 't4', 't5']);
    assert.equal(state.writes, 0);
  } finally {
    dom.uninstall();
  }
});

test('dates alone: from and to are both inclusive, and either may be blank', async () => {
  const { dom, box, state } = await mount(FIVE);
  try {
    set(box, 'filterFrom', '2026-09-02');
    set(box, 'filterTo', '2026-09-04');
    assert.deepEqual(shown(box), ['t2', 't3', 't4']);
    set(box, 'filterFrom', '');
    assert.deepEqual(shown(box), ['t1', 't2', 't3', 't4']);
    set(box, 'filterTo', '');
    set(box, 'filterFrom', '2026-09-05');
    assert.deepEqual(shown(box), ['t5']);
    set(box, 'filterTo', '2026-09-05');
    assert.deepEqual(shown(box), ['t5'], 'a one-day range shows that day');
    assert.equal(state.writes, 0);
  } finally {
    dom.uninstall();
  }
});

test('filters combine, and the line follows what is shown', async () => {
  const { dom, box, state } = await mount(FIVE);
  try {
    set(box, 'filterAccount', 'a:Card');
    set(box, 'filterFrom', '2026-09-03');
    assert.deepEqual(shown(box), ['t4', 't5']);
    assert.equal(countLine(box), 'Showing 2 of 5 transactions. Total shown: $325 out, $0 in.');
    set(box, 'filterCategory', 'One-off');
    assert.deepEqual(shown(box), ['t5']);
    set(box, 'filterDescription', 'coffee');
    assert.deepEqual(shown(box), []);
    set(box, 'filterCategory', '');
    assert.deepEqual(shown(box), ['t4']);
    assert.equal(countLine(box), 'Showing 1 of 5 transactions. Total shown: $25 out, $0 in.');
    assert.equal(state.writes, 0);
  } finally {
    dom.uninstall();
  }
});

test('"Not categorised" survives a saved category, and the categorised row leaves it; Reverse and Add still work under a filter', async () => {
  const { dom, box, state } = await mount(FIVE);
  try {
    set(box, 'filterCategory', 'none');
    assert.deepEqual(shown(box), ['t4']);
    named(row(box, 't4'), 'transactionCategory').value = 'Discretionary';
    await only(row(box, 't4'), TRANSACTION_LABELS.setCategory).clicked();
    assert.equal(state.writes, 1);
    assert.equal(named(box, 'filterCategory').value, 'none', 'the filter was reset by the redraw');
    assert.deepEqual(shown(box), [], 'the categorised row is still listed under Not categorised');
    assert.equal(countLine(box), 'Showing 0 of 5 transactions. Total shown: $0 out, $0 in.');

    // A new transaction is not categorised, so it arrives in the filtered list.
    named(box, 'transactionDate').value = '2026-09-20';
    named(box, 'transactionAmount').value = '10';
    named(box, 'transactionAccount').value = 'Card';
    await only(box, TRANSACTION_LABELS.add).clicked();
    assert.equal(state.writes, 2);
    assert.deepEqual(shown(box), ['n2']);

    // Reverse on a filtered row.
    set(box, 'filterCategory', '');
    set(box, 'filterAccount', 'a:Cash');
    assert.deepEqual(shown(box), ['t1']);
    await only(row(box, 't1'), TRANSACTION_LABELS.reverse).clicked();
    await only(row(box, 't1'), TRANSACTION_LABELS.reverseConfirm).clicked();
    assert.equal(state.writes, 3);
    assert.equal(named(box, 'filterAccount').value, 'a:Cash', 'the account filter was reset by the redraw');
    assert.deepEqual(shown(box), ['t1', 'n3']);
    assert.match(row(box, 't1').textContent, /\(reversed\)/);
    assert.equal(countLine(box), 'Showing 2 of 7 transactions. Total shown: $45 out, $45 in.');
  } finally {
    dom.uninstall();
  }
});

test('Clear filters shows every transaction again and empties every control', async () => {
  const { dom, box, state } = await mount(FIVE);
  try {
    set(box, 'filterCategory', 'Committed');
    set(box, 'filterDescription', 'gro');
    set(box, 'filterAccount', 'a:Cash');
    set(box, 'filterFrom', '2026-09-01');
    set(box, 'filterTo', '2026-09-01');
    assert.deepEqual(shown(box), ['t1']);
    await only(box, FILTER_LABELS.clear).clicked();
    assert.deepEqual(shown(box), ['t1', 't2', 't3', 't4', 't5']);
    assert.equal(countLine(box), 'Showing 5 of 5 transactions. Total shown: $490 out, $500 in.');
    for (const name of ['filterCategory', 'filterDescription', 'filterAccount', 'filterFrom', 'filterTo']) assert.equal(named(box, name).value, '', name);
    assert.equal(state.writes, 0);
  } finally {
    dom.uninstall();
  }
});

test('no filtering writes to the ledger: every control, every value, and Clear leave the bytes as they were', async () => {
  const { dom, box, state } = await mount(FIVE);
  try {
    for (const value of ['', 'Committed', 'Discretionary', 'One-off', 'Other', 'none']) set(box, 'filterCategory', value);
    for (const value of ['', 'a:Card', 'a:Cash', 'a:Everyday']) set(box, 'filterAccount', value);
    for (const value of ['p', 'pe', 'pet', '']) set(box, 'filterDescription', value);
    set(box, 'filterFrom', '2026-09-03');
    set(box, 'filterTo', '2026-09-04');
    await only(box, FILTER_LABELS.clear).clicked();
    assert.equal(state.writes, 0);
    assert.equal(state.text, FIVE);
  } finally {
    dom.uninstall();
  }
});
