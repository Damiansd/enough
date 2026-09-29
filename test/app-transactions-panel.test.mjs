// P11-3 / P11-1 slice 2 — the Transactions panel, run against the stand-in DOM and a fake disk.
//
// What is proven here, each against the bytes the fake disk holds rather than the page's own copy:
//   * add, reverse and categorise each APPEND exactly one record and write exactly once;
//   * nothing on the panel offers an edit or a delete, and no row carries a pre-filled form;
//   * a transaction already reversed cannot be reversed again, even by a stale click;
//   * Start again's separate question (user ruling 2026-09-28) starts at No; No leaves the ledger's
//     bytes identical, Yes empties it, and a refused plan leaves it alone either way;
//   * an unreadable ledger switches the panel off and is never written — not by an add, not by Start again.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { FakeEvent, byText, installDocument } from './fixtures/fakeDom.mjs';
import { DEMO_PLAN } from '../dist/app/demoHousehold.js';
import { parsePlan } from '../dist/core/parsePlan.js';
import { savePlan } from '../dist/app/planEdits.js';
import { RESET_LABELS, mountSettingsPanel } from '../dist/app/settingsPanel.js';
import { BASELINE_LABELS, FILTER_LABELS, RULE_LABELS, START_AGAIN_LEDGER_QUESTION, TRANSACTION_LABELS, mountTransactionsPanel } from '../dist/app/transactionsPanel.js';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const PLAN = parsePlan(DEMO_PLAN);

/** A ledger file on a fake disk: its text, and how many times it was written. */
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

const TWO = JSON.stringify({
  version: 1,
  transactions: [
    { id: 't1', date: '2026-09-01', amount: -4550, description: 'Groceries', account: 'Cash', createdAt: '2026-09-01', origin: 'manual' },
    { id: 't2', date: '2026-09-02', amount: -12000, description: 'Petrol', account: 'Cash', createdAt: '2026-09-02', origin: 'manual' },
  ],
  categorisations: [],
});

const mount = async (text) => {
  const dom = installDocument();
  const box = dom.document.createElement('div');
  const summary = dom.document.createElement('h2');
  dom.document.body.append(box, summary);
  const { state, transport } = disk(text);
  let next = 0;
  const panel = await mountTransactionsPanel(box, summary, { transport, today: () => '2026-09-28', newId: () => `n${(next += 1)}` });
  return { dom, box, summary, state, panel };
};

const named = (root, name) => root.descendants().find((each) => each.name === name);
const buttonsLabelled = (root, text) => byText(root, text).filter((each) => each.tagName === 'BUTTON');
const only = (root, text) => {
  const found = buttonsLabelled(root, text);
  assert.equal(found.length, 1, `expected one "${text}", found ${found.length}`);
  return found[0];
};
const row = (box, id) => box.descendants().find((each) => each.tagName === 'TR' && each.dataset.id === id);
const buttons = (root) => root.descendants().filter((each) => each.tagName === 'BUTTON');

// --- Add ------------------------------------------------------------------------------------------

test('add appends ONE money-out transaction and writes once; the list shows it newest first in whole dollars', async () => {
  const { dom, box, summary, state } = await mount(TWO);
  try {
    named(box, 'transactionDate').value = '2026-09-20';
    named(box, 'transactionAmount').value = '45.50';
    named(box, 'transactionDescription').value = 'Farmers market';
    named(box, 'transactionAccount').value = 'Cash';
    assert.equal(named(box, 'transactionDirection').value, 'out');
    await only(box, TRANSACTION_LABELS.add).clicked();
    assert.equal(state.writes, 1);
    const after = onDisk(state);
    assert.deepEqual(after.transactions.slice(0, 2), JSON.parse(TWO).transactions, 'a recorded transaction moved or changed');
    assert.equal(after.transactions.length, 3);
    assert.deepEqual(after.transactions[2], {
      id: 'n1', date: '2026-09-20', amount: -4550, description: 'Farmers market', account: 'Cash', createdAt: '2026-09-28', origin: 'manual',
    });
    const rows = box.descendants().filter((each) => each.tagName === 'TR' && each.dataset.id);
    assert.deepEqual(rows.map((each) => each.dataset.id), ['n1', 't2', 't1'], 'the list is not newest-appended first');
    assert.match(rows[0].textContent, /\$46 out/);
    assert.match(rows[0].textContent, /Not categorised/);
    assert.equal(summary.textContent, 'Transactions (3 recorded)');
    // The form is cleared once the write landed.
    assert.equal(named(box, 'transactionAmount').value, '');
  } finally {
    dom.uninstall();
  }
});

test('money in is positive, and a minus sign or a blank amount is refused with nothing written', async () => {
  const { dom, box, state } = await mount(null);
  try {
    named(box, 'transactionDate').value = '2026-09-20';
    named(box, 'transactionAmount').value = '-10';
    await only(box, TRANSACTION_LABELS.add).clicked();
    named(box, 'transactionAmount').value = '';
    await only(box, TRANSACTION_LABELS.add).clicked();
    assert.equal(state.writes, 0);
    assert.equal(state.text, null, 'an absent ledger was written by a refused add');
    named(box, 'transactionDirection').value = 'in';
    named(box, 'transactionAmount').value = '10';
    await only(box, TRANSACTION_LABELS.add).clicked();
    assert.equal(state.writes, 1);
    assert.equal(onDisk(state).transactions[0].amount, 1000);
    assert.match(box.textContent, /\$10 in/);
  } finally {
    dom.uninstall();
  }
});

// --- Reverse --------------------------------------------------------------------------------------

test('reverse asks first, then appends ONE exact negation and writes once; Cancel writes nothing', async () => {
  const { dom, box, state } = await mount(TWO);
  try {
    await only(row(box, 't1'), TRANSACTION_LABELS.reverse).clicked();
    assert.equal(state.writes, 0, 'the first Reverse click wrote without a confirm');
    await only(row(box, 't1'), TRANSACTION_LABELS.reverseCancel).clicked();
    assert.equal(state.writes, 0);
    assert.equal(buttonsLabelled(row(box, 't1'), TRANSACTION_LABELS.reverseConfirm).length, 0);

    await only(row(box, 't1'), TRANSACTION_LABELS.reverse).clicked();
    await only(row(box, 't1'), TRANSACTION_LABELS.reverseConfirm).clicked();
    assert.equal(state.writes, 1);
    const after = onDisk(state);
    assert.deepEqual(after.transactions.slice(0, 2), JSON.parse(TWO).transactions);
    assert.deepEqual(after.transactions[2], {
      id: 'n1', date: '2026-09-01', amount: 4550, description: 'Reversal of: Groceries', account: 'Cash', createdAt: '2026-09-28', origin: 'manual', reverses: 't1',
    });
    assert.match(row(box, 't1').textContent, /\(reversed\)/);
  } finally {
    dom.uninstall();
  }
});

test('a reversed transaction cannot be reversed again: no button, and a stale confirm is refused with nothing written', async () => {
  const { dom, box, state } = await mount(TWO);
  try {
    await only(row(box, 't1'), TRANSACTION_LABELS.reverse).clicked();
    const confirm = only(row(box, 't1'), TRANSACTION_LABELS.reverseConfirm);
    await confirm.clicked();
    assert.equal(state.writes, 1);
    const bytes = state.text;
    // Neither the original nor its reversal offers Reverse any more.
    assert.equal(buttonsLabelled(row(box, 't1'), TRANSACTION_LABELS.reverse).length, 0);
    assert.equal(buttonsLabelled(row(box, 'n1'), TRANSACTION_LABELS.reverse).length, 0);
    assert.equal(buttonsLabelled(row(box, 't2'), TRANSACTION_LABELS.reverse).length, 1, 'the positive control: an unreversed row still offers it');
    // The button drawn before the write, clicked again.
    await confirm.clicked();
    assert.equal(state.writes, 1, 'a second reversal of the same transaction was written');
    assert.equal(state.text, bytes);
    assert.match(box.textContent, /already been reversed/);
  } finally {
    dom.uninstall();
  }
});

// --- Categorise -----------------------------------------------------------------------------------

test('categorise appends ONE Categorisation and writes once; the newest one is what the row shows', async () => {
  const { dom, box, state } = await mount(TWO);
  try {
    const target = row(box, 't2');
    await only(target, TRANSACTION_LABELS.setCategory).clicked();
    assert.equal(state.writes, 0, 'a category was written without one being chosen');
    named(target, 'transactionCategory').value = 'Committed';
    named(target, 'transactionSubcategory').value = '  Car  ';
    await only(target, TRANSACTION_LABELS.setCategory).clicked();
    assert.equal(state.writes, 1);
    let after = onDisk(state);
    assert.deepEqual(after.transactions, JSON.parse(TWO).transactions, 'categorising touched a transaction');
    assert.deepEqual(after.categorisations, [{ id: 'n1', transactionId: 't2', category: 'Committed', subcategory: 'Car', createdAt: '2026-09-28' }]);
    assert.match(row(box, 't2').textContent, /Committed — Car/);

    named(row(box, 't2'), 'transactionCategory').value = 'One-off';
    await only(row(box, 't2'), TRANSACTION_LABELS.setCategory).clicked();
    assert.equal(state.writes, 2);
    after = onDisk(state);
    assert.equal(after.categorisations.length, 2, 'a recategorisation replaced the earlier record rather than appending');
    assert.deepEqual(after.categorisations[1], { id: 'n2', transactionId: 't2', category: 'One-off', createdAt: '2026-09-28' });
    assert.match(row(box, 't2').textContent, /One-off/);
  } finally {
    dom.uninstall();
  }
});

// --- No edit, no delete ---------------------------------------------------------------------------

test('the panel offers no edit and no delete, and no row carries a form pre-filled from a recorded transaction', async () => {
  const { dom, box } = await mount(TWO);
  try {
    await only(row(box, 't1'), TRANSACTION_LABELS.reverse).clicked(); // the armed state too
    const labels = buttons(box).map((each) => each.textContent);
    assert.ok(labels.length >= 6, 'the scan is reading nothing');
    assert.deepEqual(labels.filter((text) => /\b(edit|delete|remove|change|update|modify)\b/i.test(text)), []);
    const ALLOWED = new Set([TRANSACTION_LABELS.add, TRANSACTION_LABELS.reverse, TRANSACTION_LABELS.reverseConfirm, TRANSACTION_LABELS.reverseCancel, TRANSACTION_LABELS.setCategory, RULE_LABELS.save, BASELINE_LABELS.workOut, FILTER_LABELS.clear]);
    assert.deepEqual(labels.filter((text) => !ALLOWED.has(text)), [], 'a button this test does not know about');
    for (const id of ['t1', 't2']) {
      const controls = row(box, id).descendants().filter((each) => each.tagName === 'INPUT' || each.tagName === 'SELECT');
      assert.deepEqual(controls.map((each) => each.name).sort(), ['transactionCategory', 'transactionSubcategory']);
      assert.deepEqual(controls.map((each) => each.value), ['', ''], 'a row control is pre-filled from what was recorded');
    }
  } finally {
    dom.uninstall();
  }
  // And the panel's only ways to the disk are the append and, behind Start again, the empty write.
  const source = readFileSync(join(ROOT, 'src', 'app', 'transactionsPanel.ts'), 'utf8');
  assert.doesNotMatch(source, /\bsaveLedger\b|\bwriteLedger\(/);
  assert.equal([...source.matchAll(/\bappendToLedger\(/g)].length, 1);
});

// --- An unreadable ledger -------------------------------------------------------------------------

for (const [what, text] of [['a version this build does not read', '{"version":2,"transactions":[],"categorisations":[]}'], ['not JSON at all', '{ torn']]) {
  test(`an unreadable ledger (${what}) switches the panel off, offers no Start again question, and is never written`, async () => {
    const { dom, box, summary, state, panel } = await mount(text);
    try {
      assert.match(box.textContent, /could not be read/);
      assert.match(box.textContent, /left exactly as it is/);
      assert.equal(summary.textContent, 'Transactions (could not be read)');
      assert.deepEqual(buttons(box), [], 'a control is offered over a ledger that did not load');
      assert.equal(named(box, 'transactionAmount'), undefined);
      assert.equal(panel.startAgainQuestion(), undefined, 'Start again would offer to write over an unreadable ledger');
      assert.equal(state.writes, 0);
      assert.equal(state.text, text);
    } finally {
      dom.uninstall();
    }
  });
}

// --- Start again: "Also delete my transaction history?" (user ruling 2026-09-28) ----------------

const settle = async (done) => {
  for (let tries = 0; tries < 500 && !done(); tries += 1) await new Promise((next) => setImmediate(next));
  assert.ok(done(), 'the Start again write never settled');
};

/** The settings panel and the Transactions panel on one page, with main.ts's save shape and the plan written nowhere. */
const page = async (text) => {
  const mounted = await mount(text);
  const settingsBox = mounted.dom.document.createElement('div');
  mounted.dom.document.body.append(settingsBox);
  let plan = PLAN;
  let redraw = () => {};
  redraw = mountSettingsPanel(settingsBox, {
    currentPlan: () => plan,
    save: async (candidate) => {
      try {
        plan = (await savePlan({ writePlan: async () => {} }, candidate)).plan;
      } catch {
        return;
      }
      redraw();
    },
    startAgainAlso: () => mounted.panel.startAgainQuestion(),
  });
  const announce = settingsBox.querySelector('p.settings-announce');
  const startAgain = async ({ dateOfBirth = '1970-06-15', tick } = {}) => {
    await only(settingsBox, RESET_LABELS.start).clicked();
    const box = named(settingsBox, 'alsoDeleteTransactions');
    if (tick !== undefined) box.checked = tick;
    for (const [name, value] of [['walkthroughName', 'Jordan Blake'], ['walkthroughDateOfBirth', dateOfBirth]]) {
      const input = named(settingsBox, name);
      input.value = value;
      input.dispatch(new FakeEvent('input'));
    }
    const before = plan;
    only(settingsBox, RESET_LABELS.finish).click();
    await settle(() => buttonsLabelled(settingsBox, RESET_LABELS.start).length === 1);
    return { box, landed: plan !== before };
  };
  return { ...mounted, settingsBox, announce, startAgain };
};

test('Start again asks about the transaction history separately, and the answer starts at No', async () => {
  const { dom, settingsBox } = await page(TWO);
  try {
    await only(settingsBox, RESET_LABELS.start).clicked();
    const box = named(settingsBox, 'alsoDeleteTransactions');
    assert.ok(box, 'the Finish step does not ask about the transaction history');
    assert.equal(box.type, 'checkbox');
    assert.equal(box.checked, false, 'the answer to "also delete my transaction history" starts at Yes');
    assert.equal(box.closest('label').textContent, START_AGAIN_LEDGER_QUESTION);
    assert.match(START_AGAIN_LEDGER_QUESTION, /^Also delete my transaction history \(and the saved bank formats and rules\)\?/);
  } finally {
    dom.uninstall();
  }
});

test('Start again answered No (untouched) leaves the ledger bytes identical and unwritten', async () => {
  const { dom, state, announce, startAgain } = await page(TWO);
  try {
    const { landed } = await startAgain();
    assert.ok(landed, 'the new plan never landed — this test would be vacuous');
    assert.equal(state.writes, 0);
    assert.equal(state.text, TWO);
    assert.match(announce.textContent, /transaction history is kept/);
  } finally {
    dom.uninstall();
  }
});

test('Start again answered Yes replaces the ledger with the empty ledger, once the plan landed', async () => {
  const { dom, box, summary, state, announce, startAgain } = await page(TWO);
  try {
    const { landed } = await startAgain({ tick: true });
    assert.ok(landed);
    assert.equal(state.writes, 1);
    assert.deepEqual(onDisk(state), { version: 1, transactions: [], categorisations: [] });
    assert.match(announce.textContent, /transaction history is deleted/);
    assert.equal(summary.textContent, 'Transactions (0 recorded)');
    assert.match(box.textContent, /No transactions recorded yet/);
  } finally {
    dom.uninstall();
  }
});

test('Start again answered Yes over a plan the door REFUSES leaves the ledger alone', async () => {
  const { dom, state, startAgain } = await page(TWO);
  try {
    const { landed } = await startAgain({ tick: true, dateOfBirth: '1900-01-01' });
    assert.equal(landed, false, 'the plan was meant to be refused — this test would be vacuous');
    assert.equal(state.writes, 0);
    assert.equal(state.text, TWO);
  } finally {
    dom.uninstall();
  }
});

test('Start again over an UNREADABLE ledger asks nothing about it and never writes it', async () => {
  const text = '{"version":2,"transactions":[],"categorisations":[]}';
  const { dom, state, startAgain } = await page(text);
  try {
    const { box, landed } = await startAgain();
    assert.equal(box, undefined, 'the Finish step offers to delete a ledger that could not be read');
    assert.ok(landed);
    assert.equal(state.writes, 0);
    assert.equal(state.text, text);
  } finally {
    dom.uninstall();
  }
});
