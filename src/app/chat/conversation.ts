// plan_ai.md §4, §6 and §14, stage 4 — **one conversation: a question in, the model, the tools it
// asks for, the model again, and at the end its prose with every marker a chip and every figure it
// wrote itself struck out.** Pure apart from the provider and the storage it is handed, so a fake
// provider drives it in `npm test` exactly as the real one does in the page.
//
// **Before anything is sent** the turn is refused, with a plain reason and no request at all, when
// the chat is off, a setting is missing, the endpoint is not the provider's own `https://` address,
// or this month's spending has reached the ceiling. The ceiling is checked again before every call
// within a turn, and each response's cost is stored as soon as it arrives. A call already under way
// when the ceiling is crossed is paid for: the ceiling can be passed by at most one response.
//
// **Tools run through the figure store**, on the plan the page holds now, so every figure the model
// is shown has a marker and a raw value. A tool that throws answers with its named refusal, never
// its message. At most `MAX_TOOL_ROUNDS` rounds of tool calls are answered in one turn.
//
// **Nothing here writes the plan.** The plan is read through `plan()` and handed to the tools, which
// cannot write it (`test/import-graph.test.mjs`); the conversation keeps its own messages in memory.
// Each `proposeEntries` and `proposeScenario` call the tool passed comes back with the answer, as
// asked, for the review queue (`reviewQueue.ts`); a turn that does not end in an answer hands back none.
import { costOf, addSpend, missingSettings, monthOf, readChatState, spentIn } from './chatSettings.js'; // `.js` is correct in a `.ts` file — see tsconfig.json
import { anthropicProvider } from './anthropic.js';
import { renderReply } from './chips.js';
import { createFigureStore } from './figureStore.js';
import { inAppInstructions } from './instructions.js';
import { ProviderFailure, endpointRefusal } from './provider.js';
import { TOOLS, TOOL_BY_NAME, argumentsRefusal, refusal, toolFailed } from './toolCatalogue.js';
import type { PlanFile } from '../../core/parsePlan.js';
import type { MoneyBasis } from '../todaysDollars.js';
import type { ChatSettings, DeviceStorage } from './chatSettings.js';
import type { RenderedReply } from './chips.js';
import type { FigureStore } from './figureStore.js';
import type { ChatMessage, ChatProvider, TextBlock, ToolResultBlock, ToolUseBlock } from './provider.js';

/** The most rounds of tool calls answered in one turn; a model still asking after that is stopped. */
export const MAX_TOOL_ROUNDS = 8;

export const CHAT_OFF = 'The chat is off. Turn it on in the chat settings to ask a question.';
export const CEILING_REACHED =
  'This month’s chat spending has reached the ceiling in the chat settings, so the chat has stopped. Nothing was sent. It starts again next month, or when you raise the ceiling.';
export const CEILING_REACHED_MID_TURN =
  'This month’s chat spending reached the ceiling in the chat settings partway through this question, so the chat stopped before asking the model again. It starts again next month, or when you raise the ceiling.';
export const TOO_MANY_ROUNDS = `The chat stopped: the model asked for tools ${MAX_TOOL_ROUNDS} times for this one question without answering it. Nothing was changed. Try asking something narrower.`;
export const MODEL_DECLINED = 'The model declined to answer this question.';
export const ANSWER_CUT_OFF = 'The model’s answer was cut off at its length limit before it finished, so it is not shown. Try asking something narrower.';

export const missingSettingsMessage = (missing: readonly string[]): string =>
  `The chat needs ${missing.length === 1 ? 'one more setting' : 'more settings'} before it can ask anything: ${missing.length === 1 ? missing[0] : `${missing.slice(0, -1).join(', ')} and ${missing.at(-1)}`}.`;

/**
 * A `proposeEntries` or `proposeScenario` call the tool passed, as the model asked it: the review
 * queue's input (`reviewQueue.ts`). A `proposeScenario` carries `newScenario`, its `scenarioId` is the
 * parent, and its `whatIf` is `undefined` when it adds no entries.
 */
export interface PassedProposal {
  readonly whatIf: unknown;
  readonly scenarioId?: string;
  readonly newScenario?: { readonly name: string; readonly parentId: string };
}

export type TurnOutcome =
  | { readonly kind: 'answer'; readonly reply: RenderedReply; readonly prose: string; readonly toolRounds: number; readonly proposals: readonly PassedProposal[] }
  | { readonly kind: 'refused'; readonly message: string }
  | { readonly kind: 'failed'; readonly message: string };

export interface ConversationDeps {
  /** The plan as the page holds it now. */
  readonly plan: () => PlanFile;
  /** This browser's localStorage, or a stand-in. */
  readonly storage: DeviceStorage;
  /** The page's own origin, `location.origin`: the one address the chat never sends to. */
  readonly pageOrigin: string;
  readonly now: () => Date;
  /** The provider for these settings. Absent: the one `settings.provider` names. */
  readonly provider?: (settings: ChatSettings) => ChatProvider;
}

export interface Conversation {
  readonly ask: (question: string, basis: MoneyBasis) => Promise<TurnOutcome>;
  readonly store: FigureStore;
  readonly messages: () => readonly ChatMessage[];
}

/** The adapter `settings.provider` names. */
export const providerFor = (settings: ChatSettings, pageOrigin: string): ChatProvider => {
  switch (settings.provider) {
    case 'anthropic':
      return anthropicProvider(settings, pageOrigin);
  }
};

/** Why no question may be sent now, or `undefined`. */
export const turnRefusal = (settings: ChatSettings, spent: number, pageOrigin: string): string | undefined => {
  if (!settings.enabled) return CHAT_OFF;
  const missing = missingSettings(settings);
  if (missing.length > 0) return missingSettingsMessage(missing);
  const endpoint = endpointRefusal(settings.endpoint, pageOrigin);
  if (endpoint !== undefined) return endpoint;
  if (spent >= settings.monthlyCeiling!) return CEILING_REACHED;
  return undefined;
};

const TOOL_DEFINITIONS = TOOLS.map(({ definition }) => definition);

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value);

/** One tool call answered: the tool's result as the figure store gives it to the model, or a named refusal. A proposal that passed is handed to `passed`. */
const answer = (call: ToolUseBlock, plan: PlanFile, store: FigureStore, passed: (proposal: PassedProposal) => void): ToolResultBlock => {
  const found = TOOL_BY_NAME.get(call.name);
  const text = (() => {
    if (found === undefined) return refusal('UNKNOWN_TOOL', `there is no tool called that; the tools are ${TOOL_DEFINITIONS.map(({ name }) => name).join(', ')}`);
    if (!isRecord(call.input)) return refusal('BAD_ARGUMENTS', 'the arguments must be an object');
    const shape = argumentsRefusal(found.definition.inputSchema, call.input);
    if (shape !== undefined) return refusal('BAD_ARGUMENTS', shape);
    try {
      return store.record(call.name, () => found.run(plan, call.input as Record<string, unknown>));
    } catch (error) {
      return toolFailed(error);
    }
  })();
  const parsed: unknown = JSON.parse(text);
  if (isRecord(parsed) && Object.hasOwn(parsed, 'refused')) return { type: 'tool_result', tool_use_id: call.id, content: text, is_error: true };
  if (call.name === 'proposeEntries') {
    const { whatIf, scenarioId } = call.input as Record<string, unknown>;
    passed(typeof scenarioId === 'string' ? { whatIf, scenarioId } : { whatIf });
  }
  if (call.name === 'proposeScenario') {
    const { name, parentId, whatIf } = call.input as Record<string, string>;
    passed({ whatIf, scenarioId: parentId!, newScenario: { name: name!.trim(), parentId: parentId! } });
  }
  return { type: 'tool_result', tool_use_id: call.id, content: text };
};

/** A conversation over the plan `deps.plan()` returns. Nothing is sent until `ask` is called. */
export const createConversation = (deps: ConversationDeps): Conversation => {
  const store = createFigureStore(deps.plan().settings);
  const history: ChatMessage[] = [];
  const system = inAppInstructions();

  const ask = async (question: string, basis: MoneyBasis): Promise<TurnOutcome> => {
    const opening = readChatState(deps.storage);
    const refused = turnRefusal(opening.settings, spentIn(opening.spend, monthOf(deps.now())), deps.pageOrigin);
    if (refused !== undefined) return { kind: 'refused', message: refused };
    const settings = opening.settings;
    const provider = (deps.provider ?? ((each: ChatSettings) => providerFor(each, deps.pageOrigin)))(settings);
    // The turn's messages join the conversation only when it ends in an answer.
    const turn: ChatMessage[] = [{ role: 'user', content: question }];
    const proposals: PassedProposal[] = [];
    for (let round = 0; ; round += 1) {
      if (round > 0) {
        const month = monthOf(deps.now());
        if (spentIn(readChatState(deps.storage).spend, month) >= settings.monthlyCeiling!) return { kind: 'refused', message: CEILING_REACHED_MID_TURN };
      }
      let reply;
      try {
        reply = await provider.send({ system, tools: TOOL_DEFINITIONS, messages: [...history, ...turn] });
      } catch (error) {
        if (error instanceof ProviderFailure) return { kind: 'failed', message: error.message };
        throw error;
      }
      addSpend(deps.storage, monthOf(deps.now()), costOf(reply.usage, settings));
      if (reply.stopReason === 'refusal') return { kind: 'failed', message: MODEL_DECLINED };
      if (reply.stopReason === 'max_tokens') return { kind: 'failed', message: ANSWER_CUT_OFF };
      const calls = reply.content.filter((block): block is ToolUseBlock => block.type === 'tool_use');
      turn.push({ role: 'assistant', content: reply.content });
      if (calls.length === 0) {
        const prose = reply.content
          .filter((block): block is TextBlock => block.type === 'text')
          .map(({ text }) => text)
          .join('');
        history.push(...turn);
        return { kind: 'answer', reply: renderReply(prose, question, store, basis), prose, toolRounds: round, proposals };
      }
      if (round === MAX_TOOL_ROUNDS) return { kind: 'failed', message: TOO_MANY_ROUNDS };
      const plan = deps.plan();
      turn.push({ role: 'user', content: calls.map((call) => answer(call, plan, store, (proposal) => proposals.push(proposal))) });
    }
  };

  return { ask, store, messages: () => history };
};
