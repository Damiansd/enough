// ADR-0011, plan_ai.md §11.2 and §12 — the connector, `server/connector.mjs`, run as the real
// program: a child process speaking newline-delimited JSON-RPC over its stdin and stdout, on a
// fixture plan in a temporary data directory (`ENOUGH_DATA_DIR`, the launcher's variable). Nothing
// here imports the connector; every answer is read off its stdout.
//
// Expectations are derived from the tools themselves, called in-process on the same plan, so what is
// asserted is that the program serves exactly the engine's answer, and nothing else on stdout.
import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { toCents } from '../dist/core/money.js';
import { DEMO_PLAN } from '../dist/app/demoHousehold.js';
import { OFFERED_ENTRY_TYPES } from '../dist/app/planEdits.js';
import { listEntries } from '../dist/app/chat/tools/listEntries.js';
import { runProjection } from '../dist/app/chat/tools/runProjection.js';
import { NOT_YET_CHECKED } from '../dist/app/chat/tools/whatCanYouModel.js';

const PROGRAM = join(dirname(fileURLToPath(import.meta.url)), '..', 'server', 'connector.mjs');
const PINNED = '2025-11-25';
const TOOL_NAMES = ['listEntries', 'runProjection', 'getMonth', 'getMarkers', 'solveSustainableSpend', 'explainAssumption', 'listAssumptions', 'whatCanYouModel', 'proposeEntries', 'proposeScenario'];

const ONE_OFF = { date: '2030-03-01', owner: 'household', type: 'ONE_OFF_EXPENSE', params: { amount: toCents(38_000) }, enabled: true, createdAt: '2026-09-24' };

/** A data directory holding `plan` as plan.json, and a second plan elsewhere that must never be read. */
const fixture = (plan = DEMO_PLAN) => {
  const dir = mkdtempSync(join(tmpdir(), 'enough-connector-'));
  const data = join(dir, 'data');
  const decoy = join(dir, 'decoy.json');
  mkdirSync(data);
  writeFileSync(join(data, 'plan.json'), JSON.stringify(plan));
  writeFileSync(decoy, JSON.stringify({ ...plan, entries: [...plan.entries, { ...ONE_OFF, id: 'decoy-entry' }], scenarios: [{ ...plan.scenarios[0], entryIds: [...plan.scenarios[0].entryIds, 'decoy-entry'] }] }));
  return { dir, data, plan: join(data, 'plan.json'), decoy, cleanup: () => rmSync(dir, { recursive: true, force: true }) };
};

/** The program, started on `data`, with every stdout line and all of stderr kept. */
const start = (data) => {
  const child = spawn(process.execPath, [PROGRAM], { env: { ...process.env, ENOUGH_DATA_DIR: data }, stdio: ['pipe', 'pipe', 'pipe'] });
  const lines = [];
  let pending = '';
  let stderr = '';
  const waiting = new Map();
  let nextId = 1;
  child.stdout.setEncoding('utf8');
  child.stdout.on('data', (chunk) => {
    pending += chunk;
    let end;
    while ((end = pending.indexOf('\n')) >= 0) {
      const line = pending.slice(0, end);
      pending = pending.slice(end + 1);
      lines.push(line);
      let message;
      try { message = JSON.parse(line); } catch { continue; }
      const key = JSON.stringify(message?.id ?? null);
      const queue = waiting.get(key);
      if (queue?.length) queue.shift()(message);
    }
  });
  child.stderr.setEncoding('utf8');
  child.stderr.on('data', (chunk) => { stderr += chunk; });
  const awaitId = (id) => new Promise((resolve, reject) => {
    const key = JSON.stringify(id);
    const timer = setTimeout(() => reject(new Error(`no response to id ${key}; stdout so far: ${lines.join('\n')}`)), 20_000);
    waiting.set(key, [...(waiting.get(key) ?? []), (message) => { clearTimeout(timer); resolve(message); }]);
  });
  return {
    raw: (text, id = null) => { const reply = awaitId(id); child.stdin.write(`${text}\n`); return reply; },
    notify: (method, params) => child.stdin.write(`${JSON.stringify({ jsonrpc: '2.0', method, ...(params === undefined ? {} : { params }) })}\n`),
    request: (method, params) => {
      const id = nextId++;
      const reply = awaitId(id);
      child.stdin.write(`${JSON.stringify({ jsonrpc: '2.0', id, method, ...(params === undefined ? {} : { params }) })}\n`);
      return reply;
    },
    lines,
    stderr: () => stderr,
    stop: () => new Promise((resolve) => { child.once('exit', resolve); child.stdin.end(); }),
    child,
  };
};

/** A started, initialised program, handed to `body`, and stopped afterwards whatever happens. */
const withSession = async (body, plan = DEMO_PLAN) => {
  const files = fixture(plan);
  const session = start(files.data);
  const call = async (name, args = {}) => {
    const reply = await session.request('tools/call', { name, arguments: args });
    assert.equal(reply.error, undefined, JSON.stringify(reply.error));
    return { isError: reply.result.isError, text: reply.result.content[0].text, json: JSON.parse(reply.result.content[0].text), content: reply.result.content };
  };
  try {
    const init = await session.request('initialize', { protocolVersion: PINNED, capabilities: {}, clientInfo: { name: 'test', version: '0' } });
    session.notify('notifications/initialized');
    await body({ ...session, call, files, init });
  } finally {
    await session.stop();
    files.cleanup();
  }
  return session;
};

/** Every stdout line is one JSON-RPC 2.0 response: an id, and exactly one of result and error. */
const assertProtocolOnly = (lines) => {
  assert.ok(lines.length > 0);
  for (const line of lines) {
    let message;
    assert.doesNotThrow(() => { message = JSON.parse(line); }, `stdout carried a line that is not JSON: ${line.slice(0, 120)}`);
    assert.equal(message.jsonrpc, '2.0', line.slice(0, 120));
    assert.ok(Object.hasOwn(message, 'id'), line.slice(0, 120));
    assert.equal(Object.hasOwn(message, 'result') + Object.hasOwn(message, 'error'), 1, line.slice(0, 120));
  }
};

// --- The handshake ---------------------------------------------------------------------------------

test('initialize announces the one pinned version whatever the client asks for, with the instructions', async () => {
  const files = fixture();
  const session = start(files.data);
  try {
    for (const asked of [PINNED, '2025-06-18', '2024-11-05', '1999-01-01', undefined]) {
      const reply = await session.request('initialize', { ...(asked === undefined ? {} : { protocolVersion: asked }), capabilities: {}, clientInfo: { name: 'test', version: '0' } });
      assert.equal(reply.result.protocolVersion, PINNED, `asked ${asked}`);
      assert.deepEqual(reply.result.capabilities, { tools: { listChanged: false } });
      assert.equal(reply.result.serverInfo.name, 'enough');
    }
    // A notification is never answered: the next thing on stdout is the ping's own reply.
    const before = session.lines.length;
    session.notify('notifications/initialized');
    session.notify('notifications/cancelled', { requestId: 99 });
    session.notify('notifications/nothing-we-know');
    assert.deepEqual((await session.request('ping')).result, {});
    assert.equal(session.lines.length, before + 1);
    // The diagnostics went to stderr, and named what the client asked for.
    assert.match(session.stderr(), /client asked for protocol 1999-01-01; answering 2025-11-25/);
  } finally {
    await session.stop();
    files.cleanup();
  }
  assertProtocolOnly(session.lines);
});

test('the instructions carry every rule, in plain English', async () => {
  await withSession(async ({ init }) => {
    const text = init.result.instructions;
    assert.match(text, /Never calculate a figure\. Quote every figure word for word from a tool result, including its basis label/);
    assert.match(text, /Never compare or rank two options/);
    assert.match(text, /add both as scenarios and compare them in enough’s chart/);
    assert.match(text, /Default to today’s money\. .*say that you have switched/);
    assert.match(text, /People are Person A and Person B/);
    assert.match(text, /When a tool refuses, say that it refused and say why.*Never work around a refusal/);
    assert.match(text, /Suggestions are for the user to type into enough’s entry form/);
    // The first golden run's R3 stated the carry-forward balance test from memory: right law, no tool.
    assert.match(text, /Never state a legislated amount, threshold or cap from memory.*Fetch it with explainAssumption .* or do not give it/);
    // The first golden run quoted a box's bare text with a $ and a label of its own making.
    assert.match(text, /Quote an entry’s amount as the labelled figure proposeEntries gives it \(amount\), word for word with its label, and give the bare box text \(value\) only as what to type/);
    // The not-yet-checked areas are read from the live list, every one of them.
    assert.equal(NOT_YET_CHECKED.length, 2);
    for (const { area } of NOT_YET_CHECKED) assert.ok(text.includes(area.charAt(0).toLowerCase() + area.slice(1)), area);
    // P13-7 and P13-8 closed: the connector no longer warns about CGT or franking.
    assert.doesNotMatch(text, /capital gains|franking/i);
    assert.match(text, /repeat that area’s not-yet-checked warning/);
    // §12.7: the label goes on each figure, not once in a heading (the first real run's failure).
    assert.match(text, /Every dollar figure you write keeps the label in brackets that follows it in the tool result, straight after the figure and word for word/);
    assert.match(text, /in sentences, lists, tables and headings alike/);
    assert.match(text, /A label stated once in a heading or a table caption does not count/);
  });
});

// --- tools/list ------------------------------------------------------------------------------------

const PROPERTY_TYPES = new Set(['string', 'object', 'array', 'number', 'integer', 'boolean']);

/** A JSON Schema this build writes: typed, closed, and every required key a property. */
const assertSchema = (schema, where) => {
  assert.ok(PROPERTY_TYPES.has(schema.type), `${where}: type ${schema.type}`);
  if (schema.enum !== undefined) assert.ok(Array.isArray(schema.enum) && schema.enum.length > 0 && schema.enum.every((each) => typeof each === 'string'), where);
  if (schema.pattern !== undefined) assert.doesNotThrow(() => new RegExp(schema.pattern), where);
  if (schema.type === 'object' && schema.properties !== undefined) {
    for (const [key, child] of Object.entries(schema.properties)) {
      assert.doesNotMatch(key, /path|file|dir|url/i, `${where}.${key}: no argument may name a place to read`);
      assertSchema(child, `${where}.${key}`);
    }
    for (const key of schema.required ?? []) assert.ok(Object.hasOwn(schema.properties, key), `${where}: required ${key} is not a property`);
    assert.equal(schema.additionalProperties, false, `${where} is not closed`);
  }
  if (schema.type === 'array') assertSchema(schema.items, `${where}[]`);
};

test('tools/list: exactly the ten tools, each with a closed JSON Schema and no path argument', async () => {
  await withSession(async ({ request }) => {
    const { tools } = (await request('tools/list')).result;
    assert.deepEqual(tools.map(({ name }) => name).sort(), [...TOOL_NAMES].sort());
    for (const { name, description, inputSchema } of tools) {
      assert.match(name, /^[a-zA-Z0-9_-]{1,64}$/);
      assert.ok(typeof description === 'string' && description.length > 20, name);
      assert.equal(inputSchema.type, 'object', name);
      assert.ok(Array.isArray(inputSchema.required), name);
      assertSchema(inputSchema, name);
    }
    // The draft shape names every type the form offers, and each with its params.
    const whatIf = tools.find(({ name }) => name === 'runProjection').inputSchema.properties.whatIf.description;
    for (const type of OFFERED_ENTRY_TYPES) assert.match(whatIf, new RegExp(`\\b${type} \\{`), type);
    assert.doesNotMatch(whatIf, /undefined/);
  });
});

// --- Every tool: its happy path and one refusal ------------------------------------------------------

test('every tool answers with the engine’s own result, and each refuses by name with isError', async () => {
  await withSession(async ({ call }) => {
    const happy = async (name, args) => {
      const out = await call(name, args);
      assert.equal(out.isError, false, `${name}: ${out.text.slice(0, 300)}`);
      assert.equal(out.json.refused, undefined, name);
      // A result holding a figure carries the per-figure label reminder as a second block; one
      // without a figure carries nothing else, so the tool's own text is always block one, alone.
      const hasFigure = /\$\d/.test(out.text);
      assert.deepEqual(out.content.map(({ type }) => type), hasFigure ? ['text', 'text'] : ['text'], name);
      if (hasFigure) assert.match(out.content[1].text, /^Reminder: Every dollar figure you write keeps the label in brackets/, name);
      return out;
    };
    const refused = async (name, args, as) => {
      const out = await call(name, args);
      assert.equal(out.isError, true, name);
      assert.equal(out.json.refused, as, `${name}: ${out.text.slice(0, 300)}`);
      assert.ok(typeof out.json.reason === 'string' && out.json.reason.length > 0 || out.json.topics, name);
      return out;
    };

    // The program serves the in-process tool's answer byte for byte.
    assert.equal((await happy('listEntries')).text, listEntries(DEMO_PLAN));
    assert.equal((await happy('listEntries', { basis: 'futureDollars' })).text, listEntries(DEMO_PLAN, { basis: 'futureDollars' }));
    await refused('listEntries', { scenarioId: 'no-such-scenario' }, 'UNKNOWN_SCENARIO');

    assert.equal((await happy('runProjection', { whatIf: { add: [ONE_OFF] } })).text, runProjection(DEMO_PLAN, { add: [ONE_OFF] }));
    await refused('runProjection', { whatIf: { disable: ['no-such-entry'] } }, 'UNKNOWN_ENTRY');

    assert.equal((await happy('getMonth', { month: '2030-01' })).json.month, '2030-01');
    await refused('getMonth', { month: '2030-1' }, 'MALFORMED_MONTH');

    assert.ok((await happy('getMarkers')).json.household);
    await refused('getMarkers', { basis: 'nominal' }, 'UNKNOWN_BASIS');

    assert.match((await happy('solveSustainableSpend')).json.sustainableAnnualSpend, /\(today’s money\)$/);
    await refused('solveSustainableSpend', { scenarioId: 'no-such-scenario' }, 'UNKNOWN_SCENARIO');

    const keys = (await happy('listAssumptions', { topic: 'superannuation' })).json.keys;
    assert.ok(keys.length > 0);
    await refused('listAssumptions', { topic: 'astrology' }, 'UNKNOWN_TOPIC');

    assert.equal((await happy('explainAssumption', { key: keys[0] })).json.key, keys[0]);
    await refused('explainAssumption', { key: 'no.such.key' }, 'UNKNOWN_ASSUMPTION');

    assert.deepEqual((await happy('whatCanYouModel')).json.notYetChecked, JSON.parse(JSON.stringify(NOT_YET_CHECKED)));
    await refused('whatCanYouModel', { anything: 1 }, 'BAD_ARGUMENTS');

    const proposed = await happy('proposeEntries', { whatIf: { add: [ONE_OFF] } });
    const { amount, ...typed } = proposed.json.toType[0].boxes.at(-1);
    assert.deepEqual(typed, { box: 'Amount, as it will cost on the day $', value: '38000.00' });
    assert.match(amount, /^\$[\d,]+\.\d\d \(today’s money\)$/);
    await refused('proposeEntries', { whatIf: {} }, 'NO_ENTRIES');

    assert.deepEqual((await happy('proposeScenario', { name: 'Retire later', parentId: 'baseline' })).json.proposedScenario, { name: 'Retire later', parentId: 'baseline' });
    await refused('proposeScenario', { name: 'Retire later', parentId: 'no-such-scenario' }, 'UNKNOWN_SCENARIO');

    // The connector's own argument checks: missing, wrong type.
    await refused('getMonth', {}, 'BAD_ARGUMENTS');
    await refused('runProjection', { whatIf: 'retire later' }, 'BAD_ARGUMENTS');
  });
});

// --- The plan: the fixed path, read again every call, never written --------------------------------

test('the plan is read from the fixed path on every call, never from an argument, and never written', async () => {
  await withSession(async ({ call, files, request }) => {
    const bytes = readFileSync(files.plan, 'utf8');
    const mtime = statSync(files.plan).mtimeMs;
    const ids = async () => (await call('listEntries')).json.entries.map(({ id }) => id);
    const demoIds = DEMO_PLAN.entries.map(({ id }) => id);
    assert.deepEqual(await ids(), demoIds);

    // A path handed in as an argument is refused, and the decoy it names is never what is answered.
    for (const key of ['planPath', 'path', 'file', 'planFile']) {
      const out = await call('listEntries', { [key]: files.decoy });
      assert.equal(out.json.refused, 'BAD_ARGUMENTS', key);
      assert.ok(!out.text.includes('decoy-entry'));
    }
    const smuggled = await request('tools/call', { name: 'listEntries', arguments: {}, planPath: files.decoy, _meta: { planPath: files.decoy } });
    assert.deepEqual(JSON.parse(smuggled.result.content[0].text).entries.map(({ id }) => id), demoIds);

    assert.equal(readFileSync(files.plan, 'utf8'), bytes, 'the connector wrote the plan');
    assert.equal(statSync(files.plan).mtimeMs, mtime);
    assert.deepEqual(readdirSync(files.data), ['plan.json'], 'the connector left a file beside the plan');

    // Re-read on every call: a change on disk is the next answer.
    writeFileSync(files.plan, readFileSync(files.decoy, 'utf8'));
    assert.deepEqual(await ids(), [...demoIds, 'decoy-entry']);
    rmSync(files.plan);
    assert.equal((await call('listEntries')).json.refused, 'NO_PLAN');
    writeFileSync(files.plan, '{ not a plan');
    assert.equal((await call('listEntries')).json.refused, 'PLAN_REFUSED');
    writeFileSync(files.plan, JSON.stringify({ ...DEMO_PLAN, version: 99 }));
    const refused = await call('getMarkers');
    assert.equal(refused.json.refused, 'PLAN_REFUSED');
    assert.equal(refused.isError, true);
  });
});

test('a name is never on stdout: a result that would carry one is withheld, and says so', async () => {
  // SYNTHETIC: a Person with no accumulation interest who is paid a salary — the engine refuses the
  // plan with the Person's name in its message, which must not reach the client.
  const plan = structuredClone(DEMO_PLAN);
  plan.household.persons[0].superInterests = [];
  await withSession(async ({ call, lines }) => {
    const out = await call('getMarkers');
    assert.equal(out.isError, true);
    assert.equal(out.json.refused, 'TOOL_FAILED');
    for (const { name } of plan.household.persons) assert.ok(!lines.join('\n').includes(name), 'a name reached stdout');
  }, plan);
});

test('loading the connector creates nothing: a missing data directory stays missing, and is NO_PLAN', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'enough-connector-'));
  const data = join(dir, 'not', 'there');
  const session = start(data);
  try {
    await session.request('initialize', { protocolVersion: PINNED, capabilities: {}, clientInfo: { name: 'test', version: '0' } });
    const reply = await session.request('tools/call', { name: 'listEntries', arguments: {} });
    assert.equal(JSON.parse(reply.result.content[0].text).refused, 'NO_PLAN');
    assert.deepEqual(readdirSync(dir), [], 'the connector made a directory');
  } finally {
    await session.stop();
    rmSync(dir, { recursive: true, force: true });
  }
});

// --- Malformed input ------------------------------------------------------------------------------

test('malformed input gets a JSON-RPC error, and the program carries on', async () => {
  const session = await withSession(async ({ raw, request }) => {
    assert.deepEqual((await raw('this is not json')).error, { code: -32700, message: 'Parse error' });
    assert.deepEqual((await raw('{"jsonrpc":"2.0","id":7,')).error.code, -32700);
    assert.equal((await raw('[]')).error.code, -32600);
    assert.equal((await raw('42')).error.code, -32600);
    assert.equal((await raw('{"jsonrpc":"1.0","id":"old","method":"ping"}', 'old')).error.code, -32600);
    assert.equal((await raw('{"jsonrpc":"2.0","id":8,"method":17}', 8)).error.code, -32600);
    assert.equal((await raw('{"jsonrpc":"2.0","id":{"no":1},"method":"ping"}')).error.code, -32600);
    assert.deepEqual((await request('resources/list')).error, { code: -32601, message: 'Method not found' });
    assert.deepEqual((await request('tools/call', { name: 'deleteThePlan', arguments: {} })).error, { code: -32602, message: 'Unknown tool' });
    assert.equal((await request('tools/call', { arguments: {} })).error.code, -32602);
    assert.equal((await request('tools/call', { name: 'listEntries', arguments: ['x'] })).error.code, -32602);
    assert.deepEqual((await request('ping')).result, {});
  });
  assertProtocolOnly(session.lines);
});

// --- stdout is protocol only ----------------------------------------------------------------------

test('stdout holds only JSON-RPC responses, one per request, and diagnostics go to stderr', async () => {
  let requests = 1; // initialize
  const session = await withSession(async ({ request, call }) => {
    await request('tools/list'); requests += 1;
    for (const name of TOOL_NAMES.filter((each) => each !== 'solveSustainableSpend')) {
      await call(name, name === 'getMonth' ? { month: '2031-01' } : name === 'explainAssumption' ? { key: 'x' } : name === 'listAssumptions' ? { topic: 'tax' } : name === 'proposeEntries' ? { whatIf: { add: [ONE_OFF] } } : {});
      requests += 1;
    }
    await request('ping'); requests += 1;
  });
  assertProtocolOnly(session.lines);
  assert.equal(session.lines.length, requests);
  assert.match(session.stderr(), /enough connector: client asked for protocol/);
});
