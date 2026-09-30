// plan_ai.md §9 stage 5 — **the chat on the page: the settings box, the panel, the chips that link
// into the month table, and the review queue.** P15-7, P15-7a and P15-11.
//
// The panel is driven through a stand-in DOM (`fixtures/fakeDom.mjs`): real clicks on real buttons,
// with the page's own month table rendered by `renderTable` and anchored by `monthAnchors.ts`. What
// the stand-in cannot do is parse markup, so a reply and an effect line are read as the markup string
// `chips.ts` produced.
//
// Properties, each of which a mutation must turn red:
//   1. the panel is not in the page while the chat is off, and the forecast is byte-identical;
//   2. a reply's chips link to the line they came from, and a figure the model wrote is struck;
//   3. Accept goes through `savePlan`: a refused candidate is not written, and the card stays;
//   4. Reject writes nothing;
//   5. the queue is in memory: a reload empties it and nothing of it is stored;
//   6. the key is in no request to the local server during a whole session through the panel.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { project } from '../dist/core/projection.js';
import { DEMO_ENTRIES, DEMO_HOUSEHOLD, DEMO_PLAN, DEMO_SETTINGS } from '../dist/app/demoHousehold.js';
import { loadPlanOrNone } from '../dist/app/loadPlan.js';
import { savePlan } from '../dist/app/planEdits.js';
import { scenarioWalks } from '../dist/app/scenarioWalks.js';
import { HOUSEHOLD_ASSETS, monthsToRows } from '../dist/app/monthToRows.js';
import { renderTable } from '../dist/app/renderTable.js';
import { financialYearRows } from '../dist/app/financialYearRows.js';
import { CHIP_TARGET, anchorMonthTable } from '../dist/app/monthAnchors.js';
import { moneyBasis } from '../dist/app/todaysDollars.js';
import { readPlan, writePlan } from '../dist/store/files.js';
import { CHAT_STORAGE_KEY, DEFAULT_CHAT_SETTINGS, readChatState, writeChatSettings } from '../dist/app/chat/chatSettings.js';
import { CHAT_LABELS, CHAT_NOTICE, ORIGIN_SAVED_NOTE, QUEUE_EMPTY, mountChat } from '../dist/app/chat/chatPanel.js';
import { ORIGIN_QUESTION_MAX } from '../dist/core/parsePlan.js';
import { NOT_WORKED_OUT_BY_ENOUGH, NO_SUCH_FIGURE } from '../dist/app/chat/chips.js';
import { NOT_SAVED } from '../dist/app/chat/reviewQueue.js';
import { ENDPOINT, MESSAGES_URL, PAGE_ORIGIN, anthropicReply, askOneMonth, interceptFetch, storageOf } from './fixtures/chatFetch.mjs';
import { byText, installDocument } from './fixtures/fakeDom.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const KEY = 'sk-ant-api03-PANELKEY-51d7a0c2e9f84b36-NEVER-LEAVES-THE-BROWSER';
const MODEL = 'model-name-typed-in-the-box-77c1';
const CHAT_ON = { ...DEFAULT_CHAT_SETTINGS, enabled: true, endpoint: ENDPOINT, model: MODEL, apiKey: KEY, inputPricePerMillion: 3, outputPricePerMillion: 15, monthlyCeiling: 20 };
const NOW = () => new Date(2026, 8, 24);
// RE-PINNED 2026-09-24 (T135): the demo couple's assets excess now floors to the nearest $500
// (SSA 1991 s1064 point 1064-G7), so the Age Pension in a handful of the demo walk's months is a
// few cents to a few dollars higher — see `test/core-age-pension.test.mjs`'s T135 tests.
// RE-PINNED 2026-09-29 (LR-1 slice 2, the CGT reform from 1 July 2027): only the limb-3 `available`
// figure moved, in 94 months from 2027-08, every one DOWN. It is the whole-portfolio probe, and
// from 1 July 2027 the part of the gain after the stamp is indexed and never halved, so selling
// everything would cost more tax (32c a dollar at the demo's rate). Slice 2 moved no
// line: without Div 119 the demo's own sales in 2033 stay under the tax-free threshold.
// RE-PINNED 2026-09-29 (LR-1 slice 3, Div 119's minimum tax): the demo walk's lines moved from
// 2033-03 — see `app-chat-identity.test.mjs`'s copy of the re-pin for the mechanism and the figures.
// RE-PINNED 2026-09-29 (LR-1 slice 4): no figure moved. Dana's 11 `Income tax on capital gain` lines (2033-03 to 2035-05) each gained one `determination` entry, `CGT_MINIMUM_TAX_DETERMINATION`; a whole-walk diff finds those 11 and nothing else.
const DEMO_DIGEST = '806fab4f7571820896d81b56900400b22494a361327855fb0c3b271e2e0ecc81';
// Hashed without `closingNonSuperPortfolio` (the month table's Investments column, 2026-09-24): a
// balance the walk already held, now exposed; it moves no figure. Same strip as the other walk pins.
// 2026-09-25: and without `assetsTestThresholds`, read off the entitlement the walk already computed — no figure.
const sha256 = (value) =>
  createHash('sha256')
    .update(JSON.stringify(value, (key, field) => (key === 'closingNonSuperPortfolio' || key === 'assetsTestThresholds' ? undefined : field)))
    .digest('hex');

const SPEND_2060 = { date: '2060-01-01', owner: 'household', type: 'SPEND_CHANGE', params: { annualSpend: 5_500_000 }, enabled: true, createdAt: '2026-09-24' };

/** A provider that runs `rounds` in order: each is a function of the messages so far, returning content blocks. */
const scripted = (...rounds) => {
  const requests = [];
  return {
    requests,
    provider: () => ({
      send: async (request) => {
        requests.push(request);
        const content = rounds[requests.length - 1](request.messages);
        return { content, stopReason: content.some(({ type }) => type === 'tool_use') ? 'tool_use' : 'end_turn', usage: { inputTokens: 100, outputTokens: 10 } };
      },
    }),
  };
};

const lastToolText = (messages) => messages.at(-1).content[0].content;

/**
 * The page, as far as the chat reaches: a body holding the month table (rendered and anchored exactly
 * as `main.ts` does it), the settings box and the panel's host. `save` is the page's own, through
 * `savePlan` with a spy for the transport; it moves `page.plan` on only when the write landed.
 */
const mountPage = ({ storage = storageOf(), plan = DEMO_PLAN, provider, writes = [] } = {}) => {
  const { document, uninstall } = installDocument();
  const page = { plan, writes, storage, document, uninstall };
  const months = document.createElement('div');
  months.id = 'months';
  const walk = scenarioWalks(plan).active;
  renderTable(months, financialYearRows(walk, moneyBasis('todaysDollars', plan.settings), plan.household, HOUSEHOLD_ASSETS));
  anchorMonthTable(months, walk);
  const settingsBox = document.createElement('div');
  const host = document.createElement('section');
  host.id = 'chat-host';
  host.hidden = true;
  document.body.append(host, settingsBox, months);
  page.walk = walk;
  page.settingsBox = settingsBox;
  page.host = host;
  page.save = async (candidate) => {
    try {
      page.plan = (await savePlan({ writePlan: async (written) => void writes.push(written) }, candidate)).plan;
      return true;
    } catch {
      return false;
    }
  };
  let next = 0;
  mountChat(settingsBox, host, {
    storage,
    currentPlan: () => page.plan,
    moneyView: () => 'todaysDollars',
    save: (candidate) => page.save(candidate),
    pageOrigin: PAGE_ORIGIN,
    now: NOW,
    newId: () => `accepted-${++next}`,
    ...(provider === undefined ? {} : { provider }),
  });
  return page;
};

const button = (root, label) => {
  const found = byText(root, label).filter((each) => each.tagName === 'BUTTON');
  assert.equal(found.length, 1, `one "${label}" button`);
  return found[0];
};

const ask = async (page, question) => {
  page.host.querySelector('textarea.chat-question').value = question;
  await button(page.host, CHAT_LABELS.ask).clicked();
};

const cards = (page) => page.host.querySelectorAll('div.review-card');

/** A turn in which the model proposes one entry and says so. */
const proposing = (whatIf = { add: [SPEND_2060] }) =>
  scripted(
    () => [{ type: 'tool_use', id: 'p1', name: 'proposeEntries', input: { whatIf } }],
    () => [{ type: 'text', text: 'I have put that suggestion in the review list.' }],
  );

// --- 1. Off by default: no panel, and the forecast is untouched ----------------------------------

test('with the chat off (the default) the panel is not in the page, nothing is asked, and the forecast is byte-identical', () => {
  const { requests, restore } = interceptFetch({ plan: JSON.stringify(DEMO_PLAN) });
  const page = mountPage();
  try {
    assert.equal(page.host.hidden, true);
    assert.equal(page.host.childNodes.length, 0, 'the host holds something while the chat is off');
    assert.equal(page.document.getElementById('chat-panel'), null);
    assert.equal(page.document.querySelector('textarea'), null, 'a question box is on the page with the chat off');
    assert.deepEqual(requests, []);
    assert.equal(sha256(project(DEMO_SETTINGS, DEMO_HOUSEHOLD, DEMO_ENTRIES)), DEMO_DIGEST);
    assert.equal(sha256(project(page.plan.settings, page.plan.household, page.plan.entries)), DEMO_DIGEST);
    assert.equal(sha256([...scenarioWalks(page.plan).byScenarioId]), sha256([...scenarioWalks(DEMO_PLAN).byScenarioId]));
  } finally {
    restore();
    page.uninstall();
  }
});

test('the settings box: the notice, a password box for the key, this month’s spend against the limit, and on/off through chatSettings alone', async () => {
  const storage = storageOf();
  const page = mountPage({ storage });
  try {
    const box = page.settingsBox;
    assert.equal(box.querySelector('p.chat-notice').textContent, CHAT_NOTICE);
    assert.match(CHAT_NOTICE, /figures are sent to Anthropic/);
    assert.match(CHAT_NOTICE, /Names and dates of birth are not/);
    const inputs = box.querySelectorAll('input');
    assert.deepEqual(inputs.map(({ type }) => type), ['checkbox', 'text', 'text', 'password', 'text', 'text', 'text']);
    assert.equal(inputs[0].checked, false, 'the chat is on by default');
    const [enabled, endpoint, model, apiKey, inputPrice, outputPrice, ceiling] = inputs;
    Object.assign(endpoint, { value: ENDPOINT });
    Object.assign(model, { value: MODEL });
    Object.assign(apiKey, { value: KEY });
    Object.assign(inputPrice, { value: '3' });
    Object.assign(outputPrice, { value: '15' });
    Object.assign(ceiling, { value: '20' });
    enabled.checked = true;
    await button(box, CHAT_LABELS.save).clicked();
    assert.deepEqual(readChatState(storage).settings, CHAT_ON);
    assert.deepEqual([...storage.items.keys()], [CHAT_STORAGE_KEY]);
    assert.equal(page.host.hidden, false);
    assert.ok(page.document.getElementById('chat-panel'), 'the panel is in the page once the chat is on');
    assert.equal(box.querySelector('p.chat-spend').textContent, 'Spent $0 of the $20 monthly limit this month.');
    // Off again: the panel leaves the page.
    enabled.checked = false;
    await button(box, CHAT_LABELS.save).clicked();
    assert.equal(page.host.hidden, true);
    assert.equal(page.document.getElementById('chat-panel'), null);
    // A price that is not a number is refused, and nothing is stored over the settings.
    enabled.checked = true;
    inputPrice.value = 'three';
    await button(box, CHAT_LABELS.save).clicked();
    assert.equal(readChatState(storage).settings.enabled, false);
    assert.match(box.querySelector('p.chat-settings-announce').textContent, /Not saved/);
  } finally {
    page.uninstall();
  }
});

// --- 2. A reply: chips that link to their line, and "$62k" struck ---------------------------------

const replyTurn = () => {
  let line;
  const fake = scripted(
    () => [{ type: 'tool_use', id: 'm1', name: 'getMonth', input: { month: '2027-01' } }],
    (messages) => {
      line = /⟦(t1:lines\[(\d+)\]\.amount)⟧/.exec(lastToolText(messages));
      return [{ type: 'text', text: `That month's line is ⟦${line[1]}⟧, about $62k less a year, and ⟦t9:nothing.here⟧.` }];
    },
  );
  return { fake, line: () => Number(line[2]) };
};

test('a fake-provider turn renders the engine’s figure as a chip, strikes "$62k" as not worked out by enough, and shows an unknown marker as a red chip', async () => {
  const storage = storageOf();
  writeChatSettings(storage, CHAT_ON);
  const { fake } = replyTurn();
  const page = mountPage({ storage, provider: fake.provider });
  try {
    await ask(page, 'What happens in January 2027?');
    const reply = page.host.querySelector('div.chat-reply').innerHTML;
    assert.match(reply, /<a class="figure-chip" data-marker="⟦t1:lines\[\d+\]\.amount⟧" href="#month-2027-01-line-\d+">\$[\d,]+ <span class="figure-basis">\(today’s money\)<\/span><\/a>/);
    assert.ok(reply.includes(`<del class="not-from-engine" title="${NOT_WORKED_OUT_BY_ENOUGH}">$62k</del> <span class="not-from-engine-label">(${NOT_WORKED_OUT_BY_ENOUGH})</span>`), reply);
    assert.ok(!reply.replace(/<del[^>]*>\$62k<\/del>/, '').includes('$62k'), '"$62k" appears outside the strike');
    assert.ok(reply.includes(`<span class="figure-chip no-such-figure">${NO_SUCH_FIGURE}</span>`));
    assert.ok(!reply.includes('nothing.here'), 'an unresolved marker fell back to its text');
  } finally {
    page.uninstall();
  }
});

test('a chip links to the very line it came from in the month table, and following it opens that month and marks the line', async () => {
  const storage = storageOf();
  writeChatSettings(storage, CHAT_ON);
  const { fake, line } = replyTurn();
  const page = mountPage({ storage, provider: fake.provider });
  try {
    await ask(page, 'What happens in January 2027?');
    const reply = page.host.querySelector('div.chat-reply');
    const href = /href="(#[^"]+)"/.exec(reply.innerHTML)[1];
    assert.equal(href, `#month-2027-01-line-${line()}`);
    const target = page.document.getElementById(href.slice(1));
    assert.ok(target, `nothing in the month table has the id ${href}`);
    assert.ok(target.matches('div.line'));
    const month = page.walk.find(({ month }) => month === '2027-01');
    assert.equal(target.querySelector('span.line-description').textContent, month.lines[line()].description);
    assert.ok(page.document.getElementById('month-2027-01').matches('tr.summary'));
    // The stand-in parses no markup, so the chip is put in as the element that markup makes.
    const chip = page.document.createElement('a');
    chip.className = 'figure-chip';
    chip.setAttribute('href', href);
    reply.append(chip);
    const expanded = target.closest('tbody').querySelector('tr.expanded');
    assert.equal(expanded.hidden, true);
    const followed = await chip.clicked();
    assert.equal(followed.defaultPrevented, true);
    assert.equal(expanded.hidden, false, 'the month was not opened');
    assert.ok(target.classList.contains(CHIP_TARGET));
    assert.equal(target.scrolledIntoView, true);
  } finally {
    page.uninstall();
  }
});

test('SOURCE: main.ts anchors the month table on every paint, and hands the chat the page’s own save', () => {
  const main = readFileSync(join(ROOT, 'src', 'app', 'main.ts'), 'utf8');
  assert.match(main, /renderTable\(\s*container,[\s\S]*?\);\s*\/\/[^\n]*\n\s*anchorMonthTable\(container, months\);/);
  assert.match(main, /save: async \(candidate\) => \{\s*const before = plan;\s*await save\(candidate\);\s*return plan !== before;\s*\}/);
  // The page's `save` is the one that goes through `savePlan`.
  assert.match(main, /const save = async \(candidate: unknown\): Promise<void> => \{\s*let stored;\s*try \{\s*stored = await savePlan\(\{ writePlan \}, candidate\);/);
  assert.doesNotMatch(main.slice(main.indexOf('mountChat(chatSettingsBox')), /writePlan/);
  assert.doesNotMatch(main, /provider:/, 'the page passes a provider to the chat: only the settings’ own adapter may ship');
});

// --- 3 and 4. The review queue: Accept through savePlan, Reject writes nothing ---------------------

test('a suggestion waits under the chat in the entry table’s wording, with the trial walk’s effect as chips', async () => {
  const storage = storageOf();
  writeChatSettings(storage, CHAT_ON);
  const page = mountPage({ storage, provider: proposing().provider });
  try {
    assert.equal(page.host.querySelector('p.chat-review-empty').textContent, QUEUE_EMPTY);
    // ADR-0006 / P15-13: the review box — where Accept saves the turn — says the plan file will hold it.
    assert.equal(page.host.querySelector('p.chat-origin-note').textContent, ORIGIN_SAVED_NOTE);
    assert.match(ORIGIN_SAVED_NOTE, /plan file \(plan\.json\).*reasoning about your money/);
    // The question box stops where the door's bound on a saved question does.
    assert.equal(page.host.querySelector('textarea.chat-question').maxLength, ORIGIN_QUESTION_MAX);
    await ask(page, 'What if we spend less from 2060?');
    const [card] = cards(page);
    assert.equal(cards(page).length, 1);
    assert.equal(card.querySelector('h4').textContent, 'Suggestion 1, for the scenario “Baseline”');
    assert.deepEqual(card.querySelector('ul.review-entries').children.map(({ textContent }) => textContent), ['Add: Spending change, 2060-01-01 — $55,000 a year (Household)']);
    const effect = card.querySelector('ul.review-effect').children.map(({ innerHTML }) => innerHTML);
    assert.ok(effect.length > 0);
    assert.match(effect[0], /^2059-60: spending <a class="figure-chip" data-marker="⟦t1:difference\.differenceByYear\.fy2059-60\.spending⟧" href="#month-2060-06">-\$[\d,]+ <span class="figure-basis">\(today’s money\)<\/span><\/a>/);
    assert.ok(effect.every((line) => !/\$[\d,]+\.\d\d/.test(line)), 'an effect line shows cents');
    assert.deepEqual(page.writes, [], 'a suggestion was written before it was accepted');
  } finally {
    page.uninstall();
  }
});

test('Accept goes through savePlan: a candidate savePlan refuses is not written and the card stays; once it passes, it is written and leaves the queue', async () => {
  const storage = storageOf();
  writeChatSettings(storage, CHAT_ON);
  const page = mountPage({ storage, provider: proposing().provider });
  try {
    await ask(page, 'What if we spend less from 2060?');
    // The plan moves on after the suggestion: the horizon now ends in 2048, so an entry dated 2060
    // makes the walk refuse. The suggestion was valid when made; only the save path can catch this.
    const horizon = page.plan.settings.planningHorizonAge;
    page.plan = { ...page.plan, settings: { ...page.plan.settings, planningHorizonAge: 80 } };
    await button(cards(page)[0], CHAT_LABELS.accept).clicked();
    assert.deepEqual(page.writes, [], 'a candidate savePlan refuses was written');
    assert.equal(cards(page).length, 1, 'a refused suggestion left the queue');
    assert.equal(cards(page)[0].querySelector('p.review-status').textContent, NOT_SAVED);
    assert.ok(!page.plan.entries.some(({ id }) => id.startsWith('accepted-')));

    page.plan = { ...page.plan, settings: { ...page.plan.settings, planningHorizonAge: horizon } };
    await button(cards(page)[0], CHAT_LABELS.accept).clicked();
    assert.equal(page.writes.length, 1);
    const written = page.writes[0];
    const added = written.entries.find(({ id }) => id.startsWith('accepted-'));
    // P15-13: the entry carries the turn it came from — the question, the reply, the model, the date.
    const origin = { question: 'What if we spend less from 2060?', reply: 'I have put that suggestion in the review list.', model: MODEL, date: NOW().toISOString() };
    assert.deepEqual({ ...added, id: undefined }, { id: undefined, type: 'SPEND_CHANGE', date: '2060-01-01', owner: 'household', params: { annualSpend: 5_500_000 }, enabled: true, createdAt: '2026-09-24', origin });
    assert.ok(written.scenarios.find(({ id }) => id === 'baseline').entryIds.includes(added.id));
    assert.equal(cards(page).length, 0);
    assert.equal(page.host.querySelector('p.chat-status').textContent, 'Saved to your plan.');
  } finally {
    page.uninstall();
  }
});

test('Accept of a replace switches the old entry off in the suggestion’s scenario and adds the new one, in one write', async () => {
  const storage = storageOf();
  writeChatSettings(storage, CHAT_ON);
  const whatIf = { replace: [{ entryId: 'spend-2026', with: { ...SPEND_2060, date: '2026-09-01', params: { annualSpend: 6_000_000 } } }] };
  const page = mountPage({ storage, provider: proposing(whatIf).provider });
  try {
    await ask(page, 'What if we spend less from now?');
    const [card] = cards(page);
    assert.equal(card.querySelector('ul.review-entries').children.length, 2);
    assert.match(card.querySelector('ul.review-entries').children[1].textContent, /^Switch off: Spending change, 2026-09-01/);
    await button(card, CHAT_LABELS.accept).clicked();
    assert.equal(page.writes.length, 1);
    const baseline = page.writes[0].scenarios.find(({ id }) => id === 'baseline');
    assert.deepEqual(baseline.entryOverrides, { 'spend-2026': false });
  } finally {
    page.uninstall();
  }
});

test('a proposeScenario turn: its card names the new scenario, and Accept writes one child of the parent, empty, in one write', async () => {
  const storage = storageOf();
  writeChatSettings(storage, CHAT_ON);
  const { provider } = scripted(
    () => [{ type: 'tool_use', id: 's1', name: 'proposeScenario', input: { name: 'Retire later', parentId: 'baseline' } }],
    () => [{ type: 'text', text: 'I have put that scenario in the review list.' }],
  );
  const page = mountPage({ storage, provider });
  try {
    await ask(page, 'Can we try retiring later as its own scenario?');
    const [card] = cards(page);
    assert.equal(card.querySelector('h4').textContent, 'Suggestion 1, a new scenario “Retire later”');
    assert.deepEqual(page.writes, []);
    await button(card, CHAT_LABELS.accept).clicked();
    assert.equal(page.writes.length, 1);
    assert.deepEqual(page.writes[0].scenarios.slice(1), [{ id: 'accepted-1', name: 'Retire later', parentId: 'baseline', entryIds: [] }]);
    assert.equal(cards(page).length, 0);
  } finally {
    page.uninstall();
  }
});

test('Reject writes nothing: no save, no storage, no request, and the card is gone', async () => {
  const storage = storageOf();
  writeChatSettings(storage, CHAT_ON);
  const stored = storage.items.get(CHAT_STORAGE_KEY);
  const { requests, restore } = interceptFetch({ plan: JSON.stringify(DEMO_PLAN) });
  const page = mountPage({ storage, provider: proposing().provider });
  try {
    await ask(page, 'What if we spend less from 2060?');
    const before = page.plan;
    const spent = readChatState(storage).spend;
    await button(cards(page)[0], CHAT_LABELS.reject).clicked();
    assert.deepEqual(page.writes, []);
    assert.equal(page.plan, before);
    assert.deepEqual(requests, []);
    assert.deepEqual([...storage.items.keys()], [CHAT_STORAGE_KEY]);
    assert.deepEqual(readChatState(storage).spend, spent);
    assert.notEqual(storage.items.get(CHAT_STORAGE_KEY), stored, 'the fake turn’s spend was not recorded, so this proves nothing');
    assert.equal(cards(page).length, 0);
  } finally {
    restore();
    page.uninstall();
  }
});

// --- 5. The queue is in memory --------------------------------------------------------------------

test('the queue does not survive a reload, and nothing of it is stored anywhere the page keeps things', async () => {
  const storage = storageOf();
  writeChatSettings(storage, CHAT_ON);
  // The page's own localStorage is this one, so a queue that reached for it would be found.
  globalThis.localStorage = storage;
  const first = mountPage({ storage, provider: proposing().provider });
  try {
    await ask(first, 'What if we spend less from 2060?');
    assert.equal(cards(first).length, 1);
    assert.deepEqual([...storage.items.keys()], [CHAT_STORAGE_KEY]);
    assert.doesNotMatch(storage.items.get(CHAT_STORAGE_KEY), /suggestion|whatIf|SPEND_CHANGE|2060-01-01/);
    assert.deepEqual(first.writes, []);
  } finally {
    first.uninstall();
  }
  // The reload: a new page over the same browser storage.
  const second = mountPage({ storage, provider: proposing().provider });
  try {
    assert.equal(cards(second).length, 0);
    assert.equal(second.host.querySelector('p.chat-review-empty').textContent, QUEUE_EMPTY);
  } finally {
    second.uninstall();
    delete globalThis.localStorage;
  }
});

// --- 6. The key, through a whole session on the panel ---------------------------------------------

/** Stage 4's script, then a proposal: question 1 asks for a month and quotes it; question 2 proposes an entry. */
const sessionScript = (messages, count) => {
  const asked = messages.filter(({ role, content }) => role === 'user' && typeof content === 'string');
  if (asked.length === 1) return askOneMonth(messages, count);
  const last = messages.at(-1);
  if (typeof last.content === 'string') return anthropicReply([{ type: 'tool_use', id: `call-${count}`, name: 'proposeEntries', input: { whatIf: { add: [SPEND_2060] } } }], 'tool_use');
  return anthropicReply([{ type: 'text', text: 'It is in the review list.' }], 'end_turn');
};

test('the key is in no request to the local server through a whole panel session: load, settings typed, two questions, a suggestion accepted', async () => {
  const disk = { plan: JSON.stringify(DEMO_PLAN, null, 2) };
  const storage = storageOf();
  const { requests, restore } = interceptFetch(disk, sessionScript);
  globalThis.localStorage = storage;
  let page;
  try {
    const loaded = await loadPlanOrNone({ readPlan, writePlan });
    page = mountPage({ storage, plan: loaded.plan });
    // The page's save, as main.ts has it: savePlan over the real transport.
    page.save = async (candidate) => {
      try {
        page.plan = (await savePlan({ writePlan }, candidate)).plan;
        return true;
      } catch {
        return false;
      }
    };
    const [enabled, endpoint, model, apiKey, inputPrice, outputPrice, ceiling] = page.settingsBox.querySelectorAll('input');
    enabled.checked = true;
    endpoint.value = ENDPOINT;
    model.value = MODEL;
    apiKey.value = KEY;
    inputPrice.value = '3';
    outputPrice.value = '15';
    ceiling.value = '20';
    await button(page.settingsBox, CHAT_LABELS.save).clicked();
    await ask(page, 'When does our money run short?');
    await ask(page, 'What if we spend less from 2060?');
    await button(cards(page)[0], CHAT_LABELS.accept).clicked();
  } finally {
    restore();
    delete globalThis.localStorage;
    page?.uninstall();
  }
  // The session is real.
  assert.equal(requests.filter(({ url }) => url === MESSAGES_URL).length, 4);
  assert.equal(page.host.querySelectorAll('div.chat-reply').length, 2);
  assert.ok(JSON.parse(disk.plan).entries.some(({ date, type }) => type === 'SPEND_CHANGE' && date === '2060-01-01'));
  const local = requests.filter(({ url }) => !/^https?:\/\//.test(url) || new URL(url).origin === PAGE_ORIGIN);
  assert.deepEqual(local.map(({ method }) => method), ['GET', 'PUT']);
  for (const request of local) {
    assert.ok(!JSON.stringify(request.headers).includes(KEY), `${request.method} ${request.url} carries the key in a header`);
    assert.ok(!request.body.includes(KEY), `${request.method} ${request.url} carries the key in its body`);
    // P15-13 (plan_ai.md §7.3): the model's NAME is saved once, as the accepted entry's `origin.model`.
    // Nothing else of the chat's settings may reach the server.
    const body = request.body === '' ? '' : JSON.stringify(JSON.parse(request.body), (key, value) => (key === 'origin' ? undefined : value));
    assert.ok(!body.includes(MODEL) && !request.body.includes(CHAT_STORAGE_KEY), `${request.method} ${request.url} carries the chat's settings`);
  }
  const accepted = JSON.parse(disk.plan).entries.filter(({ origin }) => origin !== undefined);
  assert.equal(accepted.length, 1);
  assert.equal(accepted[0].origin.model, MODEL);
  const keyed = requests.filter((request) => JSON.stringify(request).includes(KEY));
  assert.equal(keyed.length, 4);
  for (const request of keyed) assert.equal(request.url, MESSAGES_URL);
  assert.ok(!disk.plan.includes(KEY));
  assert.deepEqual([...storage.items.keys()], [CHAT_STORAGE_KEY]);
});
