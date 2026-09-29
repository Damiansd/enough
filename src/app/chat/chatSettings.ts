// plan_ai.md §2 rules 4 and 5, §14 stage 4 — **the chat's settings, the API key and this month's
// spending, kept in this browser's localStorage under one key and nowhere else.**
//
// They are preferences for this browser, not plan data (ADR-0008, 2026-09-24 note). None of it enters
// `plan.json`, an export or any request to the local server: the key goes only into the header of a
// request to the provider's own endpoint (`anthropic.ts`). `test/app-chat-key-isolation.test.mjs`
// proves all three against an intercepted `fetch`.
//
// **Nothing is a default except "off".** The endpoint, the model name, the key, the two prices and
// the monthly ceiling are all the user's to type; until they are, the chat refuses to ask anything
// and says which ones are missing. There is no model name anywhere in the source, and no price.
//
// Storage is passed in (`DeviceStorage`, which `window.localStorage` satisfies) so this is pure and
// testable without a browser. Reading never writes: a stored value this build cannot read is treated
// as "the chat is off" and left as it is until the user saves settings over it.

export const CHAT_STORAGE_KEY = 'enough.chat';

/** The providers the chat can call from a browser. Ollama is not offered: not installed where stage 0 measured (2026-09-24). */
export const CHAT_PROVIDERS = ['anthropic'] as const;
export type ChatProviderName = (typeof CHAT_PROVIDERS)[number];

export interface ChatSettings {
  readonly enabled: boolean;
  readonly provider: ChatProviderName;
  /** The provider's base address, e.g. what its documentation gives. Never enough's own server. */
  readonly endpoint: string;
  readonly model: string;
  readonly apiKey: string;
  /** What the provider charges per million tokens, in the same dollars as the ceiling. */
  readonly inputPricePerMillion: number | null;
  readonly outputPricePerMillion: number | null;
  /** The most the chat may spend in one calendar month, in the same dollars as the prices. */
  readonly monthlyCeiling: number | null;
}

/** What the chat has spent, and in which month (`YYYY-MM`, this browser's local time). */
export interface ChatSpend {
  readonly month: string;
  readonly dollars: number;
}

export interface ChatState {
  readonly settings: ChatSettings;
  readonly spend: ChatSpend;
}

/** The only thing this browser stores for the chat, under `CHAT_STORAGE_KEY`. */
interface StoredChat {
  readonly version: 1;
  readonly settings: ChatSettings;
  readonly spend: ChatSpend;
}

export interface DeviceStorage {
  readonly getItem: (key: string) => string | null;
  readonly setItem: (key: string, value: string) => void;
}

export const DEFAULT_CHAT_SETTINGS: ChatSettings = {
  enabled: false,
  provider: 'anthropic',
  endpoint: '',
  model: '',
  apiKey: '',
  inputPricePerMillion: null,
  outputPricePerMillion: null,
  monthlyCeiling: null,
};

const NO_SPEND: ChatSpend = { month: '', dollars: 0 };

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value);
const isAmount = (value: unknown): value is number | null => value === null || (typeof value === 'number' && Number.isFinite(value) && value >= 0);

const settingsOrUndefined = (value: unknown): ChatSettings | undefined => {
  if (!isRecord(value)) return undefined;
  const { enabled, provider, endpoint, model, apiKey, inputPricePerMillion, outputPricePerMillion, monthlyCeiling } = value;
  if (typeof enabled !== 'boolean' || !CHAT_PROVIDERS.includes(provider as ChatProviderName)) return undefined;
  if (typeof endpoint !== 'string' || typeof model !== 'string' || typeof apiKey !== 'string') return undefined;
  if (!isAmount(inputPricePerMillion) || !isAmount(outputPricePerMillion) || !isAmount(monthlyCeiling)) return undefined;
  return { enabled, provider: provider as ChatProviderName, endpoint, model, apiKey, inputPricePerMillion, outputPricePerMillion, monthlyCeiling };
};

const spendOrUndefined = (value: unknown): ChatSpend | undefined =>
  isRecord(value) && typeof value['month'] === 'string' && isAmount(value['dollars']) && value['dollars'] !== null
    ? { month: value['month'], dollars: value['dollars'] }
    : undefined;

/** The chat's settings and spending as this browser holds them; the chat off, and nothing spent, when it holds nothing readable. */
export const readChatState = (storage: DeviceStorage): ChatState => {
  const text = storage.getItem(CHAT_STORAGE_KEY);
  if (text === null) return { settings: DEFAULT_CHAT_SETTINGS, spend: NO_SPEND };
  let stored: unknown;
  try {
    stored = JSON.parse(text);
  } catch {
    return { settings: DEFAULT_CHAT_SETTINGS, spend: NO_SPEND };
  }
  const settings = isRecord(stored) && stored['version'] === 1 ? settingsOrUndefined(stored['settings']) : undefined;
  const spend = isRecord(stored) ? spendOrUndefined(stored['spend']) : undefined;
  return settings === undefined || spend === undefined ? { settings: DEFAULT_CHAT_SETTINGS, spend: NO_SPEND } : { settings, spend };
};

const write = (storage: DeviceStorage, state: ChatState): void => {
  const stored: StoredChat = { version: 1, settings: state.settings, spend: state.spend };
  storage.setItem(CHAT_STORAGE_KEY, JSON.stringify(stored));
};

/** Save the user's settings, keeping what has been spent. */
export const writeChatSettings = (storage: DeviceStorage, settings: ChatSettings): void => {
  const checked = settingsOrUndefined(settings);
  if (checked === undefined) throw new RangeError('chat settings: a price or the ceiling is not a number of dollars, or the provider is not one the chat can call');
  write(storage, { settings: checked, spend: readChatState(storage).spend });
};

/** `date`'s calendar month in this browser's local time, `YYYY-MM`. */
export const monthOf = (date: Date): string => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

/** What has been spent in `month`: nothing, once the month has turned. */
export const spentIn = (spend: ChatSpend, month: string): number => (spend.month === month ? spend.dollars : 0);

/** Add `dollars` to `month`'s spending and store it straight away, so a reload cannot forget a call. */
export const addSpend = (storage: DeviceStorage, month: string, dollars: number): void => {
  const state = readChatState(storage);
  write(storage, { settings: state.settings, spend: { month, dollars: spentIn(state.spend, month) + dollars } });
};

export interface TokenUsage {
  readonly inputTokens: number;
  readonly outputTokens: number;
}

/** One response's cost at the user's own prices. */
export const costOf = (usage: TokenUsage, settings: ChatSettings): number =>
  (usage.inputTokens * (settings.inputPricePerMillion ?? 0) + usage.outputTokens * (settings.outputPricePerMillion ?? 0)) / 1_000_000;

/** The settings the chat cannot ask anything without, in plain words, in the order the settings show them. */
export const missingSettings = (settings: ChatSettings): readonly string[] =>
  [
    settings.endpoint.trim() === '' ? 'the endpoint' : undefined,
    settings.model.trim() === '' ? 'the model name' : undefined,
    settings.apiKey.trim() === '' ? 'the API key' : undefined,
    settings.inputPricePerMillion === null ? 'the input price' : undefined,
    settings.outputPricePerMillion === null ? 'the output price' : undefined,
    settings.monthlyCeiling === null ? 'the monthly cost ceiling' : undefined,
  ].filter((name): name is string => name !== undefined);
