// P11-7..P11-11 (slice 5) — the Derived Baseline, worked out by hand from a fixture ledger, and the
// panel's button, offer, Accept and Cancel run against the stand-in DOM, a fake ledger disk and the
// page's ordinary plan save (`savePlan`: `parsePlan` then every Scenario walked).
//
// What is proven:
//   * the figure is Committed + Discretionary + uncategorised money out, each month raised to
//     asAtDate money by (1 + cpi)^(k/12), a reversal pair cancelled, a refund netted, One-off and
//     Other shown and left out, uncategorised money in left out, and nothing outside the window;
//   * the window is the Ledger's last 365 days by DATE, ending on its latest transaction (after
//     asAtDate included); a shorter one is scaled by 365 / days, under 28 days is no offer, and a
//     month at or after asAtDate's is never deflated;
//   * the button is the ONLY trigger: nothing on mount, nothing after an import;
//   * Accept saves exactly ONE household SPEND_CHANGE dated asAtDate into the active Scenario through
//     the ordinary save, and a later-dated SPEND_CHANGE still governs from its own date;
//   * Cancel, and never pressing Accept, write nothing.
import test from 'node:test';
import assert from 'node:assert/strict';

import { FakeEvent, byText, installDocument } from './fixtures/fakeDom.mjs';
import { DEMO_PLAN } from '../dist/app/demoHousehold.js';
import { parsePlan } from '../dist/core/parsePlan.js';
import { parseLedger } from '../dist/core/ledger.js';
import { priceLevelFactor } from '../dist/core/priceLevel.js';
import { planWithEntry, savePlan, spendChangeEntry } from '../dist/app/planEdits.js';
import { deriveBaseline } from '../dist/app/derivedBaseline.js';
import { BASELINE_LABELS, TRANSACTION_LABELS, baselineSentences, categoryLabel, mountTransactionsPanel } from '../dist/app/transactionsPanel.js';

const tx = (id, date, amount, extra = {}) => ({ id, date, amount, description: id, account: 'Everyday', createdAt: '2026-09-20', origin: 'manual', ...extra });
const cat = (id, transactionId, category, extra = {}) => ({ id, transactionId, category, createdAt: '2026-09-20', ...extra });

const RENT = Array.from({ length: 12 }, (_, index) => {
  const month = ((8 + index) % 12) + 1;
  const year = index < 4 ? 2025 : 2026;
  return tx(`rent${index + 1}`, `${year}-${String(month).padStart(2, '0')}-05`, -150000);
});

/**
 * The latest transaction is 'after', 2026-09-01, so the window is the 365 days 2025-09-02 to
 * 2026-09-01 (2025-09-01 + 365 days is 2026-09-01; no 29 February between): 'before' (2025-08-31)
 * is out, 'after' is in, and a full year is not scaled.
 */
const FIXTURE = {
  version: 1,
  transactions: [
    ...RENT, // Committed, 2025-09 .. 2026-08, $1,500 each
    tx('dining', '2025-12-20', -12345), // Discretionary (recategorised from Committed)
    tx('refund', '2025-12-28', 2345), // Discretionary refund, nets against December
    tx('tv', '2026-03-10', -30000), // Discretionary, then reversed
    tx('tvBack', '2026-03-10', 30000, { reverses: 'tv' }), // the reversal, uncategorised
    tx('roof', '2026-02-14', -800000), // One-off
    tx('card', '2026-04-01', -250000), // Other: a card repayment
    tx('mystery', '2026-06-30', -4321), // uncategorised money out
    tx('salary', '2026-07-15', 500000), // uncategorised money in
    tx('before', '2025-08-31', -99999), // Committed, the month before the window
    tx('after', '2026-09-01', -7777), // Discretionary, asAtDate's own month: in, raised by nothing (k = 0)
  ],
  categorisations: [
    ...RENT.map((each, index) => cat(`c${index + 1}`, each.id, 'Committed')),
    cat('d0', 'dining', 'Committed'),
    cat('d1', 'dining', 'Discretionary', { subcategory: 'Dining' }),
    cat('d2', 'refund', 'Discretionary'),
    cat('d3', 'tv', 'Discretionary'),
    cat('o1', 'roof', 'One-off'),
    cat('x1', 'card', 'Other'),
    cat('b1', 'before', 'Committed'),
    cat('a1', 'after', 'Discretionary'),
  ],
};

// Worked by hand. A month k months before asAtDate is multiplied by 1.03^(k/12) and rounded to the cent.
const CPI = 0.03;
const up = (cents, k) => Math.round(cents * 1.03 ** (k / 12));
const COMMITTED = [12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1].reduce((sum, k) => sum + up(150000, k), 0); // 2025-09 is k = 12
const DISCRETIONARY = up(12345 - 2345, 9) + 7777; // December 2025: $123.45 out, $23.45 back; the TV and its reversal cancel; September 2026's $77.77 at k = 0
const UNCATEGORISED = up(4321, 3); // June 2026
const ONE_OFF = up(800000, 7); // February 2026
const OTHER = up(250000, 5); // April 2026
const UNCATEGORISED_IN = up(500000, 2); // July 2026
const EXACT = COMMITTED + DISCRETIONARY + UNCATEGORISED;
const WHOLE_DOLLARS = Math.round(EXACT / 100) * 100;

test('the hand-worked figure: Committed + Discretionary + uncategorised out, raised month by month; One-off, Other and money in left out', () => {
  // The arithmetic above, stated as literals so a change to it is seen: $1,500 × 12 raised is
  // $18,291.18; December's $102.24 and September's $77.77 make Discretionary $180.01; with June's
  // $43.53 the 365 days come to $18,291.18 + $180.01 + $43.53 = $18,514.72, offered as $18,515.
  assert.equal(COMMITTED, 1829118);
  assert.equal(DISCRETIONARY, 18001);
  assert.equal(UNCATEGORISED, 4353);
  assert.equal(WHOLE_DOLLARS, 1851500);
  // And the hand factor is the price level's own, pointed backwards (the history direction).
  assert.equal(up(150000, 12), Math.round(150000 * priceLevelFactor(CPI, '2025-09', '2026-09-15')));
  const result = deriveBaseline(parseLedger(FIXTURE), '2026-09-15', CPI);
  assert.equal(result.kind, 'offer');
  assert.deepEqual(result.window, { from: '2025-09-02', to: '2026-09-01', days: 365 });
  assert.deepEqual(result.committed, { count: 12, total: COMMITTED });
  assert.deepEqual(result.discretionary, { count: 3, total: DISCRETIONARY });
  assert.deepEqual(result.uncategorised, { count: 1, total: UNCATEGORISED });
  assert.deepEqual(result.oneOff, { count: 1, total: ONE_OFF });
  assert.deepEqual(result.other, { count: 1, total: OTHER });
  assert.deepEqual(result.uncategorisedIn, { count: 1, total: UNCATEGORISED_IN });
  assert.equal(result.annualSpend, WHOLE_DOLLARS);
  assert.deepEqual(result.transactionIds, [...RENT.map((each) => each.id), 'dining', 'refund', 'mystery', 'after']);
});

test('cpi 0 is the control: every line is its plain nominal sum', () => {
  const result = deriveBaseline(parseLedger(FIXTURE), '2026-09-15', 0);
  assert.equal(result.committed.total, 1800000);
  assert.equal(result.discretionary.total, 17777);
  assert.equal(result.oneOff.total, 800000);
  assert.equal(result.annualSpend, 1822100); // $18,000 + $177.77 + $43.21 = $18,220.98 → $18,221
});

test('no transactions, or only a cancelled pair, or nothing that counts, is no offer and a sentence saying why', () => {
  const empty = deriveBaseline(parseLedger({ version: 1, transactions: [], categorisations: [] }), '2026-09-15', CPI);
  assert.equal(empty.kind, 'none');
  assert.match(empty.reason, /No transactions are recorded/);
  // A cancelled pair is not a transaction for the window either: the one left spans no days at all.
  const pair = deriveBaseline(parseLedger({ version: 1, transactions: [tx('a', '2026-01-01', -100), tx('b', '2026-01-01', 100, { reverses: 'a' })], categorisations: [] }), '2026-09-15', CPI);
  assert.equal(pair.kind, 'none');
  assert.match(pair.reason, /No transactions are recorded/);
  const otherOnly = deriveBaseline(parseLedger({ version: 1, transactions: [tx('a', '2026-01-01', -100), tx('b', '2026-01-31', -100)], categorisations: [cat('c', 'a', 'Other'), cat('d', 'b', 'Other')] }), '2026-09-15', CPI);
  assert.equal(otherOnly.kind, 'none');
  assert.match(otherOnly.reason, /counts as spending/);
});

test('Other is a fourth category: the picker says what it does, and an old ledger reads to its own bytes', () => {
  assert.equal(categoryLabel('Other'), 'Other (not spending: left out of the spending figure)');
  const old = { version: 1, transactions: [tx('t', '2026-01-01', -100)], categorisations: [cat('c', 't', 'One-off')] };
  assert.equal(JSON.stringify(parseLedger(old)), JSON.stringify(old));
});

// --- The panel -----------------------------------------------------------------------------------

const BASE = parsePlan(DEMO_PLAN); // asAtDate 2026-09-01, cpi 0.025: the same window (it is the Ledger's), 2025-09-02 to 2026-09-01

const mount = async (ledgerFile, plan = BASE) => {
  const dom = installDocument();
  const box = dom.document.createElement('div');
  dom.document.body.append(box);
  const ledgerDisk = { text: JSON.stringify(ledgerFile), writes: 0 };
  const planDisk = { writes: 0, refused: [] };
  let current = plan;
  let next = 0;
  const host = {
    transport: {
      readLedger: async () => JSON.parse(ledgerDisk.text),
      writeLedger: async (ledger) => {
        ledgerDisk.writes += 1;
        ledgerDisk.text = JSON.stringify(ledger);
      },
    },
    today: () => '2026-09-28',
    newId: () => `n${(next += 1)}`,
    currentPlan: () => current,
    // `main.ts`'s own save, less the redraw: `savePlan` or nothing, and `current` moves only on a landed write.
    save: async (candidate) => {
      try {
        const stored = await savePlan({ writePlan: async () => { planDisk.writes += 1; } }, candidate);
        current = stored.plan;
        planDisk.months = stored.months;
      } catch (error) {
        planDisk.refused.push(error);
      }
    },
  };
  await mountTransactionsPanel(box, null, host);
  return { dom, box, ledgerDisk, planDisk, plan: () => current };
};

const buttonsLabelled = (root, text) => byText(root, text).filter((each) => each.tagName === 'BUTTON');
const only = (root, text) => {
  const found = buttonsLabelled(root, text);
  assert.equal(found.length, 1, `expected one "${text}", found ${found.length}`);
  return found[0];
};
const named = (root, name) => root.descendants().find((each) => each.name === name);
const offered = (box) => buttonsLabelled(box, BASELINE_LABELS.accept).length > 0;

test('the button is the only trigger: no offer on load, none after an import, one after the click', async () => {
  const { dom, box, ledgerDisk } = await mount(FIXTURE);
  try {
    assert.equal(offered(box), false, 'an offer was shown on load');
    assert.doesNotMatch(box.textContent, /a year, in today's money/);
    const file = named(box, 'transactionsCsv');
    file.files = [{ name: 'statement.csv', text: async () => 'Date,Amount,Description\r\n03/08/2026,-4.50,COFFEE\r\n' }];
    await Promise.all(file.dispatch(new FakeEvent('change')));
    named(box, 'importAccount').value = 'Everyday';
    await Promise.all(named(box, 'importAccount').dispatch(new FakeEvent('change')));
    await only(box, 'Import 1 row').clicked();
    assert.equal(ledgerDisk.writes, 1, 'the import did not land');
    assert.equal(offered(box), false, 'an offer was worked out after an import');
    assert.doesNotMatch(box.textContent, /a year, in today's money/);
    await only(box, BASELINE_LABELS.workOut).clicked();
    assert.equal(offered(box), true);
    // Any later write to the Ledger withdraws it.
    named(box, 'transactionDate').value = '2026-08-20';
    named(box, 'transactionAmount').value = '10';
    await only(box, TRANSACTION_LABELS.add).clicked();
    assert.equal(ledgerDisk.writes, 2);
    assert.equal(offered(box), false, 'an offer outlived a write to the Ledger it was worked out from');
  } finally {
    dom.uninstall();
  }
});

test('the offer shows the figure, the breakdown, the lines left out, and which transactions', async () => {
  const { dom, box } = await mount(FIXTURE);
  try {
    await only(box, BASELINE_LABELS.workOut).clicked();
    const expected = deriveBaseline(parseLedger(FIXTURE), '2026-09-01', 0.025);
    const dollars = `$${(expected.annualSpend / 100).toLocaleString('en-AU')}`;
    assert.match(box.textContent, new RegExp(`From 2 Sep 2025 to 1 Sep 2026, your household spent about \\${dollars} a year, in today's money\\.`));
    assert.doesNotMatch(box.textContent, /scaled/, 'a full year was said to be scaled');
    assert.match(box.textContent, /One-off: \$[\d,]+ \(1 transaction\) — not included/);
    assert.match(box.textContent, /Other \(not spending\): \$[\d,]+ \(1 transaction\) out — not included/);
    assert.match(box.textContent, /Not categorised, money out: \$43 \(1 transaction\) — counted in/);
    assert.match(box.textContent, /Not categorised, money in: \$[\d,]+ \(1 transaction\) — not taken off/);
    const disclosure = box.descendants().find((each) => each.tagName === 'DETAILS');
    assert.equal(disclosure.children[0].textContent, BASELINE_LABELS.show);
    assert.deepEqual(disclosure.descendants().filter((each) => each.tagName === 'TR').map((each) => each.dataset.id), expected.transactionIds);
    assert.match(disclosure.textContent, /Discretionary — Dining \(by hand\)/);
  } finally {
    dom.uninstall();
  }
});

test('Accept saves exactly ONE household SPEND_CHANGE dated asAtDate in the active Scenario, through the ordinary save; a later one still governs', async () => {
  const later = spendChangeEntry({ date: '2030-01-01', owner: 'household', note: '', annualSpend: '70000' }, 'spend-2030', '2026-09-20');
  const plan = parsePlan(planWithEntry(BASE, later));
  const { dom, box, ledgerDisk, planDisk, plan: current } = await mount(FIXTURE, plan);
  try {
    await only(box, BASELINE_LABELS.workOut).clicked();
    await only(box, BASELINE_LABELS.accept).clicked();
    assert.deepEqual(planDisk.refused, []);
    assert.equal(planDisk.writes, 1);
    assert.equal(ledgerDisk.writes, 0, 'accepting wrote the Ledger');
    const saved = current();
    assert.deepEqual(saved.entries.slice(0, plan.entries.length), plan.entries, 'an entry already in the plan changed');
    assert.equal(saved.entries.length, plan.entries.length + 1);
    const expected = deriveBaseline(parseLedger(FIXTURE), '2026-09-01', 0.025);
    assert.deepEqual(saved.entries.at(-1), {
      id: 'n1', date: '2026-09-01', owner: 'household', type: 'SPEND_CHANGE',
      params: { annualSpend: expected.annualSpend }, enabled: true, createdAt: '2026-09-28',
      note: `Worked out from ${expected.transactionIds.length} transactions, 2 Sep 2025 to 1 Sep 2026.`,
    });
    const active = saved.scenarios.find((each) => each.id === saved.activeScenarioId);
    assert.deepEqual(active.entryIds, [...plan.scenarios.find((each) => each.id === plan.activeScenarioId).entryIds, 'n1']);
    const month = (m) => planDisk.months.find((each) => each.month === m);
    assert.ok(month('2026-10').appliedEntryIds.includes('n1'));
    assert.ok(!month('2026-10').appliedEntryIds.includes('spend-2026'));
    assert.ok(month('2030-02').appliedEntryIds.includes('spend-2030'), 'the later SPEND_CHANGE no longer governs from its own date');
    assert.ok(!month('2030-02').appliedEntryIds.includes('n1'));
    assert.equal(offered(box), false);
    assert.match(box.textContent, /Saved: your spending is \$[\d,]+ a year from 2026-09-01/);
  } finally {
    dom.uninstall();
  }
});

test('Cancel writes nothing, and neither does an offer left unanswered', async () => {
  const { dom, box, ledgerDisk, planDisk, plan } = await mount(FIXTURE);
  try {
    await only(box, BASELINE_LABELS.workOut).clicked();
    await only(box, BASELINE_LABELS.cancel).clicked();
    assert.equal(offered(box), false);
    await only(box, BASELINE_LABELS.workOut).clicked();
    assert.equal(planDisk.writes, 0);
    assert.equal(ledgerDisk.writes, 0);
    assert.equal(plan(), BASE);
  } finally {
    dom.uninstall();
  }
});

test('a single day of history shows the reason and offers nothing to accept', async () => {
  const { dom, box } = await mount({ version: 1, transactions: [tx('old', '2024-01-01', -100)], categorisations: [] });
  try {
    await only(box, BASELINE_LABELS.workOut).clicked();
    assert.equal(offered(box), false);
    assert.match(box.textContent, /Your transactions cover only 1 day, from 1 Jan 2024 to 1 Jan 2024\. That is not enough history to work out a yearly figure; import at least a month\./);
  } finally {
    dom.uninstall();
  }
});

// --- The window, by date (the 2026-09-28 defect: one imported month offered as $240 a year) ------

test("the user's shape: two August days and a September past asAtDate — September counts, and the scale is 365/30", () => {
  const ledger = parseLedger({
    version: 1,
    transactions: [
      tx('a1', '2026-08-30', -999), // uncategorised out
      tx('a2', '2026-08-31', -999), // Discretionary
      tx('s1', '2026-09-01', -150000), // Committed
      tx('s2', '2026-09-10', -5000), // Discretionary
      tx('s3', '2026-09-15', 300000), // uncategorised in: left out
      tx('s4', '2026-09-20', -2500), // uncategorised out
      tx('s5', '2026-09-26', -4000), // Discretionary, after asAtDate
      tx('s6', '2026-09-28', -1000), // Committed, after asAtDate: the window's last day
    ],
    categorisations: [cat('k2', 'a2', 'Discretionary'), cat('k1', 's1', 'Committed'), cat('k3', 's2', 'Discretionary'), cat('k5', 's5', 'Discretionary'), cat('k6', 's6', 'Committed')],
  });
  const result = deriveBaseline(ledger, '2026-09-25', CPI);
  assert.equal(result.kind, 'offer');
  // 30 August to 28 September, both counted: 2 August days + 28 September days = 30.
  assert.deepEqual(result.window, { from: '2026-08-30', to: '2026-09-28', days: 30 });
  // August is k = 1: $9.99 × 1.03^(1/12) = $10.0146 → $10.01. September is asAtDate's month, k = 0.
  assert.equal(up(999, 1), 1001);
  assert.deepEqual(result.committed, { count: 2, total: 151000 }); // $1,500 + $10
  assert.deepEqual(result.discretionary, { count: 3, total: 1001 + 5000 + 4000 });
  assert.deepEqual(result.uncategorised, { count: 2, total: 1001 + 2500 });
  // $1,510 + $100.01 + $35.01 = $1,645.02 over 30 days; × 365 / 30 = $20,014.41 → $20,014.
  assert.equal(Math.round((164502 * 365) / 30), 2001441);
  assert.equal(result.annualSpend, 2001400);
  assert.deepEqual(result.transactionIds, ['a1', 'a2', 's1', 's2', 's4', 's5', 's6']);
  assert.equal(
    baselineSentences(result, CPI)[0],
    "From 30 Aug 2026 to 28 Sep 2026 (30 days, scaled to a year), your household spent about $20,014 a year, in today's money.",
  );
  assert.ok(baselineSentences(result, CPI).includes('Your transactions cover only 30 days, so the figure is those days scaled up to a full year. The lines below are what was actually recorded.'));
});

test('more than a year of history: exactly the last 365 days ending on the latest date, unscaled', () => {
  // 2025-07-01 + 365 days is 2026-07-01, so 2025-07-01 .. 2026-06-30 is 365 days, both counted.
  const ledger = parseLedger({
    version: 1,
    transactions: [
      tx('ancient', '2024-01-01', -77700),
      tx('dayBefore', '2025-06-30', -100000), // one day too early
      tx('firstDay', '2025-07-01', -20000),
      tx('lastDay', '2026-06-30', -30000),
    ],
    categorisations: ['ancient', 'dayBefore', 'firstDay', 'lastDay'].map((id) => cat(`c-${id}`, id, 'Committed')),
  });
  const result = deriveBaseline(ledger, '2026-09-15', 0);
  assert.equal(result.kind, 'offer');
  assert.deepEqual(result.window, { from: '2025-07-01', to: '2026-06-30', days: 365 });
  assert.deepEqual(result.committed, { count: 2, total: 50000 });
  assert.equal(result.annualSpend, 50000, '$200 + $300, a full year, not scaled');
  assert.deepEqual(result.transactionIds, ['firstDay', 'lastDay']);
});

test('fewer than 28 days is no offer; 28 days is an offer scaled by 365/28', () => {
  const short = (last) => parseLedger({
    version: 1,
    transactions: [tx('a', '2026-09-01', -10000), tx('b', last, -10000)],
    categorisations: [cat('ka', 'a', 'Committed'), cat('kb', 'b', 'Committed')],
  });
  const twentySeven = deriveBaseline(short('2026-09-27'), '2026-09-15', 0);
  assert.equal(twentySeven.kind, 'none');
  assert.equal(twentySeven.reason, 'Your transactions cover only 27 days, from 1 Sep 2026 to 27 Sep 2026. That is not enough history to work out a yearly figure; import at least a month.');
  const twentyEight = deriveBaseline(short('2026-09-28'), '2026-09-15', 0);
  assert.equal(twentyEight.kind, 'offer');
  assert.equal(twentyEight.window.days, 28);
  // $200 × 365 / 28 = $2,607.14 → $2,607.
  assert.equal(twentyEight.annualSpend, 260700);
});

test('a month after asAtDate is taken as recorded: never deflated', () => {
  const ledger = parseLedger({
    version: 1,
    transactions: [tx('oct', '2026-10-01', -10000), tx('nov', '2026-11-15', -10000)],
    categorisations: [cat('ko', 'oct', 'Committed'), cat('kn', 'nov', 'Committed')],
  });
  const result = deriveBaseline(ledger, '2026-09-15', CPI);
  assert.deepEqual(result.committed, { count: 2, total: 20000 }, 'a later month was deflated to asAtDate money');
});

test('Other money IN is reported, not shown as "$0 (0 transactions)" (user-reported 2026-09-28)', async () => {
  // The user's shape: a month of spending, plus transfers IN from another own account marked Other.
  const { baselineSentences } = await import('../dist/app/transactionsPanel.js');
  const ledger = parseLedger({
    version: 1,
    transactions: [
      tx('s1', '2026-08-30', -100000), tx('s2', '2026-09-28', -100000),
      tx('t1', '2026-09-02', 4400), tx('t2', '2026-09-15', 17886),
    ],
    categorisations: [cat('k1', 's1', 'Committed'), cat('k2', 's2', 'Committed'), cat('k3', 't1', 'Other'), cat('k4', 't2', 'Other')],
  });
  const result = deriveBaseline(ledger, '2026-09-25', 0);
  assert.equal(result.kind, 'offer');
  assert.deepEqual(result.otherIn, { count: 2, total: 22286 });
  assert.deepEqual(result.other, { count: 0, total: 0 });
  const line = baselineSentences(result, 0).find((sentence) => sentence.startsWith('Other (not spending)'));
  assert.match(line, /\$223 \(2 transactions\) in — not included\./);
  assert.doesNotMatch(line, /\(0 transactions\)/);
  assert.equal(result.committed.total, 200000, 'Other money in is never netted against spending');
});
