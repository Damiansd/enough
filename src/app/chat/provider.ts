// plan_ai.md §4 and §14, stage 4 — **what the conversation needs from a model provider, and nothing
// more:** send the conversation so far with the tools on offer, get back text and tool calls and the
// tokens it cost. The messages are in the shape of Anthropic's Messages API, the one provider the
// chat can call today; another provider's adapter translates to and from it.
//
// **A provider is called by the browser, directly (ADR-0006, 2026-09-04 note).** `endpointRefusal`
// refuses any endpoint that is not an `https://` address, or that is enough's own server, before a
// request is made. There is no proxy route to fall back on.
import type { TokenUsage } from './chatSettings.js'; // `.js` is correct in a `.ts` file — see tsconfig.json
import type { ToolDefinition } from './toolCatalogue.js';

export interface TextBlock {
  readonly type: 'text';
  readonly text: string;
}

export interface ToolUseBlock {
  readonly type: 'tool_use';
  readonly id: string;
  readonly name: string;
  readonly input: unknown;
}

export interface ToolResultBlock {
  readonly type: 'tool_result';
  readonly tool_use_id: string;
  readonly content: string;
  readonly is_error?: boolean;
}

export type ChatMessage =
  | { readonly role: 'user'; readonly content: string | readonly ToolResultBlock[] }
  | { readonly role: 'assistant'; readonly content: readonly (TextBlock | ToolUseBlock)[] };

export interface ProviderRequest {
  readonly system: string;
  readonly tools: readonly ToolDefinition[];
  readonly messages: readonly ChatMessage[];
}

export interface ProviderReply {
  readonly content: readonly (TextBlock | ToolUseBlock)[];
  /** `end_turn`, `tool_use`, `max_tokens`, `refusal`, … as the provider says it. */
  readonly stopReason: string;
  readonly usage: TokenUsage;
}

export interface ChatProvider {
  readonly send: (request: ProviderRequest) => Promise<ProviderReply>;
}

export type ProviderFailureKind = 'unreachable' | 'badKey' | 'forbidden' | 'notFound' | 'rateLimit' | 'overloaded' | 'refused' | 'providerFault' | 'malformed';

/** The provider could not be reached or would not answer. `message` is plain English, for the screen. */
export class ProviderFailure extends Error {
  override readonly name = 'ProviderFailure';
  constructor(
    readonly kind: ProviderFailureKind,
    message: string,
  ) {
    super(message);
  }
}

/**
 * Why the chat will not send to `endpoint` from a page served at `pageOrigin`, or `undefined` if it
 * will. The key travels in the request's header, so an address that is not the provider's own
 * `https://` endpoint is one the key must never go to.
 */
export const endpointRefusal = (endpoint: string, pageOrigin: string): string | undefined => {
  let url: URL;
  try {
    url = new URL(endpoint);
  } catch {
    return 'The endpoint in the chat settings is not a web address. It should be the provider’s own address, starting https://.';
  }
  if (url.origin === new URL(pageOrigin).origin) {
    return 'The endpoint in the chat settings is enough’s own server. The chat never goes through it: this browser calls the provider directly.';
  }
  if (url.protocol !== 'https:') return 'The endpoint in the chat settings must start https://: the API key is never sent over an unencrypted connection.';
  if (url.username !== '' || url.password !== '' || url.search !== '' || url.hash !== '') {
    return 'The endpoint in the chat settings should be the provider’s address alone, with nothing after a ? or # and no name or password in it.';
  }
  return undefined;
};
