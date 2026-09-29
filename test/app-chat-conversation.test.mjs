// plan_ai.md §4, §6 and §9 stage 4 — the conversation loop, the settings it reads, and the Anthropic
// adapter. A FAKE provider drives whole turns: the model asks for tools, the tools run through the
// figure store, and the reply comes back with its markers as chips and its own figures struck. The
// adapter is driven through an intercepted `fetch`. No live call is made anywhere.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { DEMO_PLAN } from '../dist/app/demoHousehold.js';
import { moneyBasis } from '../dist/app/todaysDollars.js';
import { shownFigure } from '../dist/app/chat/figureStore.js';
import { inAppInstructions } from '../dist/app/chat/instructions.js';
import { TOOLS } from '../dist/app/chat/toolCatalogue.js';
import {
  CHAT_STORAGE_KEY,
  DEFAULT_CHAT_SETTINGS,
  addSpend,
  costOf,
  missingSettings,
  monthOf,
  readChatState,
  writeChatSettings,
} from '../dist/app/chat/chatSettings.js';
import {
  ANSWER_CUT_OFF,
  CEILING_REACHED,
  CEILING_REACHED_MID_TURN,
  CHAT_OFF,
  MAX_TOOL_ROUNDS,
  MODEL_DECLINED,
  TOO_MANY_ROUNDS,
  createConversation,
  missingSettingsMessage,
} from '../dist/app/chat/conversation.js';
import { endpointRefusal } from '../dist/app/chat/provider.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const PAGE_ORIGIN = 'http://localhost:4173';
const PLAN = DEMO_PLAN;
const TODAY = moneyBasis('todaysDollars', PLAN.settings);
const NOW = () => new Date(2026, 8, 24, 10, 30);
const KEY = 'sk-ant-test-0c9e44';

const storageOf = () => {
  const items = new Map();
  return { getItem: (key) => items.get(key) ?? null, setItem: (key, value) => items.set(key, String(value)), items };
};

const SETTINGS = {
  ...DEFAULT_CHAT_SETTINGS,
  enabled: true,
  endpoint: 'https://api.anthropic.com',
  model: 'a-model-the-user-typed',
  apiKey: KEY,
  inputPricePerMillion: 3,
  outputPricePerMillion: 15,
  monthlyCeiling: 10,
};

const storageWith = (settings = SETTINGS) => {
  const storage = storageOf();
  writeChatSettings(storage, settings);
  return storage;
};

const USAGE = { inputTokens: 2000, outputTokens: 100 };
const toolUse = (id, name, input) => ({ content: [{ type: 'tool_use', id, name, input }], stopReason: 'tool_use', usage: USAGE });
const text = (prose, stopReason = 'end_turn') => ({ content: [{ type: 'text', text: prose }], stopReason, usage: USAGE });

/** A provider that plays `script`: each step gets the request and returns a reply. Records every request. */
const fakeProvider = (script) => {
  const requests = [];
  return {
    requests,
    factory: () => ({
      send: async (request) => {
        requests.push(structuredClone(request));
        const step = script[Math.min(requests.length - 1, script.length - 1)];
        return typeof step === 'function' ? step(request) : step;
      },
    }),
  };
};

/** Fails the test on any `fetch` at all. */
const noFetch = () => {
  const original = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (...args) => {
    calls.push(args);
    throw new Error('a request was made');
  };
  return { calls, restore: () => (globalThis.fetch = original) };
};

const conversationWith = (storage, provider) => createConversation({ plan: () => PLAN, storage, pageOrigin: PAGE_ORIGIN, now: NOW, provider });

const firstMarkerIn = (request) => request.messages.at(-1).content[0].content.match(/⟦(t\d+):([^⟧]+)⟧/);

// --- A full turn ----------------------------------------------------------------------------------

test('a full turn: two tool calls resolve through the figure store, a marker becomes a chip, and "$62k" is struck', async () => {
  const storage = storageWith();
  const { requests, factory } = fakeProvider([
    toolUse('c1', 'getMarkers', {}),
    toolUse('c2', 'getMonth', { month: '2027-01' }),
    (request) => text(`In January 2027 the first line is ${firstMarkerIn(request)[0]}, so you would take about $62k less a year.`),
  ]);
  const conversation = conversationWith(storage, factory);
  const outcome = await conversation.ask('What happens in January 2027?', TODAY);
  assert.equal(outcome.kind, 'answer');
  assert.equal(outcome.toolRounds, 2);

  // The tools ran through the store: the model was given exactly what the store holds for each.
  const results = conversation.store.results();
  assert.deepEqual(results.map(({ id, tool }) => [id, tool]), [['t1', 'getMarkers'], ['t2', 'getMonth']]);
  assert.equal(requests[1].messages.at(-1).content[0].content, results[0].modelText);
  assert.equal(requests[2].messages.at(-1).content[0].content, results[1].modelText);
  assert.deepEqual(requests[2].messages.at(-1).content.map(({ tool_use_id }) => tool_use_id), ['c2']);

  // The chip shows the ENGINE's value, not anything the model wrote.
  const [, id, path] = firstMarkerIn(requests[2]);
  const expected = shownFigure(conversation.store.resolve(id, path).raw, TODAY);
  const chips = outcome.reply.segments.filter(({ kind }) => kind === 'chip');
  assert.equal(chips.length, 1);
  assert.equal(chips[0].dollars, expected.dollars);
  assert.equal(chips[0].tag, expected.tag);
  assert.match(chips[0].href, /^#month-2027-01-line-\d+$/);

  // W6's figure is struck.
  assert.deepEqual(outcome.reply.segments.filter(({ kind }) => kind === 'struck').map(({ text: struck }) => struck), ['$62k']);
  assert.equal(outcome.reply.struck, 1);
  assert.ok(outcome.reply.segments.filter(({ kind }) => kind === 'text').every(({ text: prose }) => !prose.includes('⟦')), 'a marker reached the page as text');

  // The turn joined the conversation; the next one is sent with it.
  assert.equal(conversation.messages().length, 6);
});

test('each request carries the in-app instructions and the whole tool catalogue', async () => {
  const { requests, factory } = fakeProvider([text('Nothing to look up.')]);
  await conversationWith(storageWith(), factory).ask('Hello?', TODAY);
  assert.equal(requests[0].system, inAppInstructions());
  assert.deepEqual(requests[0].tools, TOOLS.map(({ definition }) => definition));
  assert.deepEqual(requests[0].messages, [{ role: 'user', content: 'Hello?' }]);
});

test('a tool call the catalogue does not hold, or with arguments it refuses, is answered with a named refusal and the turn goes on', async () => {
  const { requests, factory } = fakeProvider([
    { content: [{ type: 'tool_use', id: 'a', name: 'writePlanFile', input: {} }, { type: 'tool_use', id: 'b', name: 'getMonth', input: { month: 202701 } }, { type: 'tool_use', id: 'c', name: 'getMonth', input: 'x' }], stopReason: 'tool_use', usage: USAGE },
    text('I could not look that up.'),
  ]);
  const conversation = conversationWith(storageWith(), factory);
  const outcome = await conversation.ask('Q', TODAY);
  assert.equal(outcome.kind, 'answer');
  const results = requests[1].messages.at(-1).content;
  assert.deepEqual(results.map(({ is_error }) => is_error), [true, true, true]);
  assert.deepEqual(results.map(({ content }) => JSON.parse(content).refused), ['UNKNOWN_TOOL', 'BAD_ARGUMENTS', 'BAD_ARGUMENTS']);
  assert.equal(conversation.store.results().length, 0, 'a refused call was run');
});

// --- The round cap --------------------------------------------------------------------------------

test(`the round cap: a model still asking for tools after ${MAX_TOOL_ROUNDS} rounds is stopped, with a plain message`, async () => {
  assert.equal(MAX_TOOL_ROUNDS, 8);
  let calls = 0;
  const { requests, factory } = fakeProvider([
    (request) => {
      // Without the cap this would run until the ceiling; stop it cleanly a few calls past the cap instead.
      calls += 1;
      if (calls > MAX_TOOL_ROUNDS + 3) return text('the cap did not stop the turn');
      return toolUse(`c${request.messages.length}`, 'whatCanYouModel', {});
    },
  ]);
  const conversation = conversationWith(storageWith(), factory);
  const outcome = await conversation.ask('Loop forever', TODAY);
  assert.deepEqual(outcome, { kind: 'failed', message: TOO_MANY_ROUNDS });
  assert.equal(requests.length, MAX_TOOL_ROUNDS + 1);
  assert.equal(conversation.store.results().length, MAX_TOOL_ROUNDS);
  assert.equal(conversation.messages().length, 0, 'a turn that failed joined the conversation');
  assert.match(TOO_MANY_ROUNDS, /8 times/);
  // Control: the last allowed round still answers.
  const last = fakeProvider([...Array.from({ length: MAX_TOOL_ROUNDS }, (_, index) => toolUse(`c${index}`, 'whatCanYouModel', {})), text('Done.')]);
  assert.equal((await conversationWith(storageWith(), last.factory).ask('Eight rounds', TODAY)).kind, 'answer');
});

// --- Off by default, and what must be set ---------------------------------------------------------

test('the chat is OFF by default: nothing stored means off, and a question is refused without a request', async () => {
  assert.equal(DEFAULT_CHAT_SETTINGS.enabled, false);
  const empty = storageOf();
  assert.equal(readChatState(empty).settings.enabled, false);
  const fetches = noFetch();
  try {
    // No provider is given, so the real adapter would be used if anything were sent.
    const outcome = await createConversation({ plan: () => PLAN, storage: empty, pageOrigin: PAGE_ORIGIN, now: NOW }).ask('Hello?', TODAY);
    assert.deepEqual(outcome, { kind: 'refused', message: CHAT_OFF });
  } finally {
    fetches.restore();
  }
  assert.equal(fetches.calls.length, 0);
  assert.equal(empty.items.size, 0, 'reading the settings wrote something');
});

test('nothing is a default but "off": every other setting is empty, and a question names the ones missing', async () => {
  assert.deepEqual(DEFAULT_CHAT_SETTINGS, {
    enabled: false,
    provider: 'anthropic',
    endpoint: '',
    model: '',
    apiKey: '',
    inputPricePerMillion: null,
    outputPricePerMillion: null,
    monthlyCeiling: null,
  });
  assert.deepEqual(missingSettings({ ...DEFAULT_CHAT_SETTINGS, enabled: true }), [
    'the endpoint', 'the model name', 'the API key', 'the input price', 'the output price', 'the monthly cost ceiling',
  ]);
  const { requests, factory } = fakeProvider([text('x')]);
  const outcome = await conversationWith(storageWith({ ...SETTINGS, model: '  ', monthlyCeiling: null }), factory).ask('Hello?', TODAY);
  assert.deepEqual(outcome, { kind: 'refused', message: 'The chat needs more settings before it can ask anything: the model name and the monthly cost ceiling.' });
  assert.equal(missingSettingsMessage(['the API key']), 'The chat needs one more setting before it can ask anything: the API key.');
  assert.equal(requests.length, 0);
});

test('a stored value this build cannot read is the chat off, and is left as it is', () => {
  for (const bad of ['{', '[]', JSON.stringify({ version: 2, settings: SETTINGS, spend: { month: '2026-09', dollars: 0 } }), JSON.stringify({ version: 1, settings: { ...SETTINGS, monthlyCeiling: -1 }, spend: { month: '2026-09', dollars: 0 } })]) {
    const storage = storageOf();
    storage.setItem(CHAT_STORAGE_KEY, bad);
    assert.equal(readChatState(storage).settings.enabled, false, bad);
    assert.equal(storage.items.get(CHAT_STORAGE_KEY), bad);
  }
  assert.throws(() => writeChatSettings(storageOf(), { ...SETTINGS, inputPricePerMillion: Number.NaN }), RangeError);
});

test('settings round-trip under the one key, and saving settings keeps what has been spent', () => {
  const storage = storageWith();
  addSpend(storage, '2026-09', 1.25);
  writeChatSettings(storage, { ...SETTINGS, monthlyCeiling: 50, extra: 'not stored' });
  const state = readChatState(storage);
  assert.deepEqual(state.settings, { ...SETTINGS, monthlyCeiling: 50 });
  assert.deepEqual(state.spend, { month: '2026-09', dollars: 1.25 });
  assert.deepEqual([...storage.items.keys()], [CHAT_STORAGE_KEY]);
});

// --- The ceiling ----------------------------------------------------------------------------------

test('the ceiling reached: the turn is refused with a plain message, and no request of any kind is made', async () => {
  const storage = storageWith();
  addSpend(storage, monthOf(NOW()), SETTINGS.monthlyCeiling);
  const fetches = noFetch();
  let outcome;
  try {
    outcome = await createConversation({ plan: () => PLAN, storage, pageOrigin: PAGE_ORIGIN, now: NOW }).ask('Hello?', TODAY);
  } finally {
    fetches.restore();
  }
  assert.deepEqual(outcome, { kind: 'refused', message: CEILING_REACHED });
  assert.equal(fetches.calls.length, 0);
  assert.match(CEILING_REACHED, /ceiling/);
  assert.doesNotMatch(CEILING_REACHED, /\d/);
});

test('the ceiling is this month’s: last month’s spending does not count, and one cent under still asks', async () => {
  const lastMonth = storageWith();
  addSpend(lastMonth, '2026-08', 1_000);
  const a = fakeProvider([text('ok')]);
  assert.equal((await conversationWith(lastMonth, a.factory).ask('Q', TODAY)).kind, 'answer');
  assert.equal(readChatState(lastMonth).spend.month, '2026-09');

  const under = storageWith();
  addSpend(under, '2026-09', SETTINGS.monthlyCeiling - 0.01);
  const b = fakeProvider([text('ok')]);
  assert.equal((await conversationWith(under, b.factory).ask('Q', TODAY)).kind, 'answer');
  assert.equal(b.requests.length, 1);
});

test('the ceiling crossed partway through a turn stops it before the next call, and says so', async () => {
  // One response costs 2,000 × $3 + 100 × $15 a million = $0.0075; a ceiling of $0.01 is crossed by the second.
  const storage = storageWith({ ...SETTINGS, monthlyCeiling: 0.01 });
  const { requests, factory } = fakeProvider([toolUse('a', 'whatCanYouModel', {}), toolUse('b', 'whatCanYouModel', {}), text('never reached')]);
  const outcome = await conversationWith(storage, factory).ask('Q', TODAY);
  assert.deepEqual(outcome, { kind: 'refused', message: CEILING_REACHED_MID_TURN });
  assert.equal(requests.length, 2);
  assert.ok(Math.abs(readChatState(storage).spend.dollars - 0.015) < 1e-12);
});

// --- Prices and the model name come only from settings --------------------------------------------

test('the cost of a response is its usage at the user’s own prices, and each response is counted as it arrives', async () => {
  assert.equal(costOf({ inputTokens: 1_000_000, outputTokens: 0 }, { ...SETTINGS, inputPricePerMillion: 0.8 }), 0.8);
  assert.equal(costOf({ inputTokens: 0, outputTokens: 2_000_000 }, { ...SETTINGS, outputPricePerMillion: 4 }), 8);
  for (const [input, output] of [[3, 15], [0.25, 1.25], [80, 400]]) {
    const storage = storageWith({ ...SETTINGS, inputPricePerMillion: input, outputPricePerMillion: output, monthlyCeiling: 1_000 });
    const { factory } = fakeProvider([toolUse('a', 'whatCanYouModel', {}), text('done')]);
    await conversationWith(storage, factory).ask('Q', TODAY);
    assert.ok(Math.abs(readChatState(storage).spend.dollars - 2 * (2000 * input + 100 * output) / 1e6) < 1e-12, `${input}/${output}`);
  }
});

/** The Anthropic adapter against an intercepted fetch: `respond` answers every request. */
const throughFetch = async (settings, respond) => {
  const requests = [];
  const original = globalThis.fetch;
  globalThis.fetch = async (url, init) => {
    requests.push({ url: String(url), init });
    return respond();
  };
  try {
    const outcome = await createConversation({ plan: () => PLAN, storage: storageWith(settings), pageOrigin: PAGE_ORIGIN, now: NOW }).ask('Hello?', TODAY);
    return { outcome, requests };
  } finally {
    globalThis.fetch = original;
  }
};

const okResponse = () =>
  new Response(JSON.stringify({ content: [{ type: 'text', text: 'Hello.' }], stop_reason: 'end_turn', usage: { input_tokens: 10, output_tokens: 5, cache_read_input_tokens: 2 } }), { status: 200 });

test('the model name sent is the one in the settings, whatever it is, and the request goes to the endpoint as typed', async () => {
  for (const model of ['first-model-typed-x1', 'another-one-2026']) {
    const { outcome, requests } = await throughFetch({ ...SETTINGS, model, endpoint: 'https://api.anthropic.com/' }, okResponse);
    assert.equal(outcome.kind, 'answer');
    assert.equal(requests.length, 1);
    assert.equal(requests[0].url, 'https://api.anthropic.com/v1/messages');
    const body = JSON.parse(requests[0].init.body);
    assert.equal(body.model, model);
    assert.deepEqual(body.tools.map(({ name }) => name), TOOLS.map(({ definition }) => definition.name));
    assert.deepEqual(body.tools[0].input_schema, TOOLS[0].definition.inputSchema);
    assert.equal(requests[0].init.headers['x-api-key'], KEY);
    assert.equal(requests[0].init.headers['anthropic-dangerous-direct-browser-access'], 'true');
  }
  // Usage is read off the response, cache reads counted as input.
  const storage = storageWith();
  const original = globalThis.fetch;
  globalThis.fetch = async () => okResponse();
  try {
    await createConversation({ plan: () => PLAN, storage, pageOrigin: PAGE_ORIGIN, now: NOW }).ask('Q', TODAY);
  } finally {
    globalThis.fetch = original;
  }
  assert.ok(Math.abs(readChatState(storage).spend.dollars - (12 * 3 + 5 * 15) / 1e6) < 1e-15);
});

test('RAW SOURCE: no model name and no price anywhere in src/', () => {
  const files = [];
  const walk = (dir) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (entry.isDirectory()) walk(join(dir, entry.name));
      else if (entry.name.endsWith('.ts')) files.push(join(dir, entry.name));
    }
  };
  walk(join(ROOT, 'src'));
  assert.ok(files.length > 100, 'the sweep read too few files');
  const MODEL_NAME = /claude-[a-z0-9]|\bgpt-?\d|\b(?:sonnet|opus|haiku|o\d-mini|llama\d?|mistral|gemini)\b/i;
  for (const file of files) assert.doesNotMatch(readFileSync(file, 'utf8'), MODEL_NAME, file);
  const chat = files.filter((file) => file.includes(join('app', 'chat')) && !file.includes(join('chat', 'tools')));
  for (const file of chat) {
    const code = readFileSync(file, 'utf8').replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, '');
    assert.doesNotMatch(code, /model:\s*(['"`])(?!\1)/, `${file} writes a model name as a literal`);
    assert.doesNotMatch(code, /PricePerMillion:\s*\d/, `${file} writes a price as a literal`);
  }
  // Positive control: the sweep's pattern finds the names it is for.
  for (const name of ['claude-sonnet-4-5', 'claude-opus-4', 'gpt-4o', 'Haiku']) assert.match(name, MODEL_NAME);
});

// --- Unreachable, and refused ---------------------------------------------------------------------

test('a provider that is unreachable or refuses gives a plain message, never the key', async () => {
  const errorBody = (type, message) => JSON.stringify({ type: 'error', error: { type, message } });
  const cases = [
    [() => Promise.reject(new TypeError('Failed to fetch')), /could not reach api\.anthropic\.com.*internet connection/],
    [() => new Response(errorBody('authentication_error', 'invalid x-api-key'), { status: 401 }), /refused the API key/],
    [() => new Response(errorBody('permission_error', 'no'), { status: 403 }), /would not let this key/],
    [() => new Response(errorBody('not_found_error', 'model: nope'), { status: 404 }), /did not recognise the model name or the endpoint.*model: nope/],
    [() => new Response(errorBody('rate_limit_error', 'slow down'), { status: 429 }), /rate limit was reached/],
    [() => new Response(errorBody('overloaded_error', 'Overloaded'), { status: 529 }), /overloaded/],
    [() => new Response('<html>bad gateway</html>', { status: 502 }), /fault of its own \(status 502\)/],
    [() => new Response(errorBody('invalid_request_error', 'messages: roles must alternate'), { status: 400 }), /refused the request \(status 400\).*roles must alternate/],
    [() => new Response(JSON.stringify({ hello: 'world' }), { status: 200 }), /not in the shape the chat reads/],
  ];
  for (const [respond, expected] of cases) {
    const { outcome, requests } = await throughFetch(SETTINGS, respond);
    assert.equal(requests.length, 1);
    assert.equal(outcome.kind, 'failed', String(expected));
    assert.match(outcome.message, expected);
    assert.ok(!outcome.message.includes(KEY));
  }
});

test('the model declining, or running out of room, ends the turn with a plain message', async () => {
  for (const [stopReason, message] of [['refusal', MODEL_DECLINED], ['max_tokens', ANSWER_CUT_OFF]]) {
    const { factory } = fakeProvider([text('partial', stopReason)]);
    assert.deepEqual(await conversationWith(storageWith(), factory).ask('Q', TODAY), { kind: 'failed', message });
  }
});

test('an endpoint that is not the provider’s own https:// address is refused before any request: never enough’s own server', async () => {
  const cases = [
    ['/api/anthropic', /not a web address/],
    ['http://localhost:4173', /enough’s own server/],
    ['http://localhost:4173/v1', /enough’s own server/],
    ['http://api.anthropic.com', /must start https:\/\//],
    ['https://api.anthropic.com?via=proxy', /the provider’s address alone/],
    ['https://user:pw@api.anthropic.com', /the provider’s address alone/],
  ];
  for (const [endpoint, expected] of cases) {
    assert.match(endpointRefusal(endpoint, PAGE_ORIGIN), expected, endpoint);
    const { outcome, requests } = await throughFetch({ ...SETTINGS, endpoint }, okResponse);
    assert.equal(outcome.kind, 'refused', endpoint);
    assert.match(outcome.message, expected);
    assert.equal(requests.length, 0, endpoint);
  }
  assert.equal(endpointRefusal('https://api.anthropic.com', PAGE_ORIGIN), undefined);
});
