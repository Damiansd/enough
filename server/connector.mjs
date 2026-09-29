#!/usr/bin/env node
// The connector (ADR-0011, plan_ai.md §11.2 and §12): enough's read tools, served to an AI tool on
// this machine over MCP. Newline-delimited JSON-RPC 2.0 on stdin and stdout, written by hand, with no
// dependency. **stdout carries protocol and nothing else; every diagnostic goes to stderr.**
//
// It READS the plan and never writes it. The path is the one the local server uses (`config.mjs`,
// `ENOUGH_DATA_DIR` or `~/.enough`), read again on every call, and never taken from a tool argument:
// no tool has a path argument, and an argument a tool does not declare is refused. Nothing it
// imports writes a file.
//
// `npm run build` first: this runs the engine out of `dist/`.
import { readFileSync } from 'node:fs';
import { createInterface } from 'node:readline';
import { PLAN_FILE } from './config.mjs';
import { parsePlan } from '../dist/core/parsePlan.js';
import { DOLLAR_FIGURE } from '../dist/app/chat/tools/moneyGuard.js';
// The tools, their descriptions and schemas are one catalogue, shared with the in-app chat.
import { TOOLS, TOOL_BY_NAME, argumentsRefusal, refusal, toolFailed } from '../dist/app/chat/toolCatalogue.js';
import { ACCEPT_REFUSALS, NEVER_RANK, PERSON_A_AND_B, TODAYS_MONEY_BY_DEFAULT, notYetCheckedRule } from '../dist/app/chat/instructions.js';

// Anything that logs through `console` goes to stderr: one stray line on stdout breaks the client.
for (const method of ['log', 'info', 'debug', 'warn']) console[method] = console.error;

/**
 * **The one protocol version this program speaks, announced whatever the client asks for.**
 * 2025-11-25 is the newest version that still has `initialize` (2026-07-28 replaced it with
 * `server/discover`), per github.com/modelcontextprotocol/modelcontextprotocol `schema/`; and it is
 * `LATEST_PROTOCOL_VERSION` in the MCP SDK bundled with Claude Code 2.1.281.
 */
const PROTOCOL_VERSION = '2025-11-25';

/**
 * **Every figure carries its own label, every time (§12.7).** In the first real run Claude put the basis
 * once in a heading and dropped it from each figure, which the golden scorer counts as a breach. So the
 * rule is stated on its own in the instructions, and again beside every tool result that holds a figure.
 */
const LABEL_EVERY_FIGURE =
  'Every dollar figure you write keeps the label in brackets that follows it in the tool result, straight after the figure and word for word, ' +
  'every single time: in sentences, lists, tables and headings alike. Copy "(today’s money)", "(future dollars)", "(in today’s wages)" or "(as legislated …)" exactly as the tool gives it. ' +
  'A label stated once in a heading or a table caption does not count: a figure left without its own label, or given a different one, is a mistake.';

const REMINDER = `Reminder: ${LABEL_EVERY_FIGURE}`;

const INSTRUCTIONS = [
  'These tools run enough’s own forecasting engine on the household’s saved plan. Rules for using them:',
  '1. Never calculate a figure. Quote every figure word for word from a tool result, including its basis label, for example "(today’s money)". Do not add, subtract, average, round or convert figures yourself. If the figure you need is not in a tool result, ask a tool for it, or say that you do not have it.',
  `2. ${LABEL_EVERY_FIGURE}`,
  `3. ${NEVER_RANK}`,
  `4. ${TODAYS_MONEY_BY_DEFAULT}`,
  `5. ${PERSON_A_AND_B}`,
  `6. ${notYetCheckedRule()}`,
  `7. ${ACCEPT_REFUSALS}`,
  '8. Suggestions are for the user to type into enough’s entry form. These tools cannot change the plan: proposeEntries gives the boxes and what to type in each. ' +
    'Quote an entry’s amount as the labelled figure proposeEntries gives it (amount), word for word with its label, and give the bare box text (value) only as what to type in the box, never with a $ or a label of your own. ' +
    'proposeScenario checks a new scenario that inherits from an existing one, for the user to add with Clone in enough’s scenarios list.',
  '9. Never state a legislated amount, threshold or cap from memory, however sure you are of it. Fetch it with explainAssumption (listAssumptions gives the keys) and quote it with its "(as legislated …)" label, or do not give it.',
].join('\n');

/** Whether a result holds a figure at all: `DOLLAR_FIGURE` is global, so a stateless copy of it. */
const DOLLAR_FIGURE_AT = new RegExp(DOLLAR_FIGURE.source);

const BY_NAME = TOOL_BY_NAME;

/** The saved plan, read now, or the refusal that says why there is none. */
const readPlan = () => {
  let text;
  try {
    text = readFileSync(PLAN_FILE, 'utf8');
  } catch (error) {
    console.error(`enough connector: cannot read the plan file (${error.code ?? error.name})`);
    return { refusal: refusal('NO_PLAN', 'there is no saved plan to read: open enough and save a plan first') };
  }
  try {
    return { plan: parsePlan(JSON.parse(text)) };
  } catch (error) {
    // The class only: a plan's own refusal can quote a name.
    console.error(`enough connector: the plan file is refused (${error.name})`);
    return { refusal: refusal('PLAN_REFUSED', `the saved plan is not one this build reads (${error.constructor.name}); open enough to see why`) };
  }
};

const callTool = (params) => {
  const found = BY_NAME.get(params.name);
  const args = params.arguments ?? {};
  const text = (() => {
    const shape = argumentsRefusal(found.definition.inputSchema, args);
    if (shape !== undefined) return refusal('BAD_ARGUMENTS', shape);
    const read = readPlan();
    if (read.refusal !== undefined) return read.refusal;
    try {
      return found.run(read.plan, args);
    } catch (error) {
      console.error(`enough connector: ${params.name} threw ${error.name}`);
      return toolFailed(error);
    }
  })();
  const parsed = JSON.parse(text);
  const isError = typeof parsed === 'object' && parsed !== null && Object.hasOwn(parsed, 'refused');
  const content = [{ type: 'text', text }];
  if (DOLLAR_FIGURE_AT.test(text)) content.push({ type: 'text', text: REMINDER });
  return { content, isError };
};

const isObject = (value) => typeof value === 'object' && value !== null && !Array.isArray(value);

/** One message in, the response out, or `undefined` for a notification or a client's response. */
const handle = (message) => {
  if (!isObject(message) || message.jsonrpc !== '2.0' || (Object.hasOwn(message, 'method') && typeof message.method !== 'string')) {
    const id = isObject(message) && (typeof message.id === 'string' || typeof message.id === 'number') ? message.id : null;
    return { jsonrpc: '2.0', id, error: { code: -32600, message: 'Invalid Request' } };
  }
  if (!Object.hasOwn(message, 'method')) return undefined; // a response to nothing we sent
  const { id, method } = message;
  const isRequest = Object.hasOwn(message, 'id');
  if (!isRequest) return undefined; // notifications/initialized, notifications/cancelled, and any other
  if (typeof id !== 'string' && typeof id !== 'number') return { jsonrpc: '2.0', id: null, error: { code: -32600, message: 'Invalid Request' } };
  const params = message.params ?? {};
  const result = (value) => ({ jsonrpc: '2.0', id, result: value });
  const error = (code, text) => ({ jsonrpc: '2.0', id, error: { code, message: text } });
  switch (method) {
    case 'initialize':
      console.error(`enough connector: client asked for protocol ${params.protocolVersion}; answering ${PROTOCOL_VERSION}`);
      return result({ protocolVersion: PROTOCOL_VERSION, capabilities: { tools: { listChanged: false } }, serverInfo: { name: 'enough', version: '0.0.0' }, instructions: INSTRUCTIONS });
    case 'ping':
      return result({});
    case 'tools/list':
      return result({ tools: TOOLS.map(({ definition }) => definition) });
    case 'tools/call':
      if (!isObject(params) || typeof params.name !== 'string') return error(-32602, 'Invalid params: tools/call needs a tool name');
      if (!BY_NAME.has(params.name)) return error(-32602, 'Unknown tool');
      if (Object.hasOwn(params, 'arguments') && !isObject(params.arguments)) return error(-32602, 'Invalid params: arguments must be an object');
      return result(callTool(params));
    default:
      return error(-32601, 'Method not found');
  }
};

const send = (message) => process.stdout.write(`${JSON.stringify(message)}\n`);

createInterface({ input: process.stdin, crlfDelay: Infinity }).on('line', (line) => {
  if (line.trim() === '') return;
  let message;
  try {
    message = JSON.parse(line);
  } catch {
    return send({ jsonrpc: '2.0', id: null, error: { code: -32700, message: 'Parse error' } });
  }
  try {
    const response = handle(message);
    if (response !== undefined) send(response);
  } catch (error) {
    console.error(`enough connector: ${error.name} handling a message`);
    const id = isObject(message) && (typeof message.id === 'string' || typeof message.id === 'number') ? message.id : null;
    send({ jsonrpc: '2.0', id, error: { code: -32603, message: 'Internal error' } });
  }
});
