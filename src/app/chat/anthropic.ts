// plan_ai.md §4 and §14, stage 4 — **Anthropic's Messages API over plain `fetch()`, from the browser,
// straight to the endpoint in the chat settings.** No SDK (the only dev dependency stays TypeScript),
// and no route through enough's own server (ADR-0006): the request goes to `<endpoint>/v1/messages`
// and nowhere else, and `endpointRefusal` has already turned away any endpoint that is not the
// provider's own `https://` address.
//
// Measured 2026-09-24 (stage 0): the preflight from `http://localhost:4173` answers
// `access-control-allow-origin: *` and allows `x-api-key`, `anthropic-version`, `content-type` and
// `anthropic-dangerous-direct-browser-access`, the header Anthropic requires of a call made from a
// browser with the user's own key.
//
// **The model name is the user's setting and is sent as typed.** There is none in this file, and no
// fallback: an empty one is refused before this is ever called (`missingSettings`).
import { ProviderFailure, endpointRefusal } from './provider.js'; // `.js` is correct in a `.ts` file — see tsconfig.json
import type { ChatSettings } from './chatSettings.js';
import type { ChatProvider, ProviderReply, ProviderRequest, TextBlock, ToolUseBlock } from './provider.js';

/** The Messages API version the request is written against: a date in Anthropic's API, not a model. */
const ANTHROPIC_VERSION = '2023-06-01';

/** The most one response may be. The API requires a limit; the monthly ceiling is what bounds the cost. */
const MAX_OUTPUT_TOKENS = 4096;

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value);

const count = (value: unknown): number => (typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : 0);

/** The provider's own words from an error body, if it sent any, shortened for the screen. */
const providerWords = (body: unknown): string => {
  const said = isRecord(body) && isRecord(body['error']) && typeof body['error']['message'] === 'string' ? body['error']['message'] : '';
  return said === '' ? '' : ` It said: “${said.length > 300 ? `${said.slice(0, 300)}…` : said}”`;
};

const failureOf = (status: number, body: unknown): ProviderFailure => {
  switch (status) {
    case 401:
      return new ProviderFailure('badKey', 'The provider refused the API key. Check the key in the chat settings.');
    case 403:
      return new ProviderFailure('forbidden', `The provider would not let this key make the request. Check the key’s permissions and the model name in the chat settings.${providerWords(body)}`);
    case 404:
      return new ProviderFailure('notFound', `The provider did not recognise the model name or the endpoint. Check both in the chat settings.${providerWords(body)}`);
    case 429:
      return new ProviderFailure('rateLimit', 'The provider’s rate limit was reached. Wait a minute, then ask again.');
    case 529:
    case 503:
      return new ProviderFailure('overloaded', 'The provider is overloaded at the moment. Try again in a few minutes.');
  }
  if (status >= 500) return new ProviderFailure('providerFault', `The provider had a fault of its own (status ${status}). Try again later.`);
  return new ProviderFailure('refused', `The provider refused the request (status ${status}).${providerWords(body)}`);
};

const blockOf = (block: unknown): TextBlock | ToolUseBlock | undefined => {
  if (!isRecord(block)) return undefined;
  if (block['type'] === 'text' && typeof block['text'] === 'string') return { type: 'text', text: block['text'] };
  if (block['type'] === 'tool_use' && typeof block['id'] === 'string' && typeof block['name'] === 'string') {
    return { type: 'tool_use', id: block['id'], name: block['name'], input: block['input'] };
  }
  return undefined;
};

const MALFORMED = 'The provider’s answer was not in the shape the chat reads. Check that the endpoint is the provider’s Messages API.';

const replyOf = (body: unknown): ProviderReply => {
  if (!isRecord(body) || !Array.isArray(body['content']) || typeof body['stop_reason'] !== 'string' || !isRecord(body['usage'])) {
    throw new ProviderFailure('malformed', MALFORMED);
  }
  const usage = body['usage'];
  return {
    // A block of a kind the chat does not use (thinking, say) is passed over, not read.
    content: body['content'].map(blockOf).filter((block): block is TextBlock | ToolUseBlock => block !== undefined),
    stopReason: body['stop_reason'],
    usage: {
      // Cache reads and writes are input tokens too; this chat marks nothing for caching.
      inputTokens: count(usage['input_tokens']) + count(usage['cache_creation_input_tokens']) + count(usage['cache_read_input_tokens']),
      outputTokens: count(usage['output_tokens']),
    },
  };
};

/** A provider that calls Anthropic at `settings.endpoint`, from a page served at `pageOrigin`. */
export const anthropicProvider = (settings: ChatSettings, pageOrigin: string): ChatProvider => ({
  send: async (request: ProviderRequest): Promise<ProviderReply> => {
    const refused = endpointRefusal(settings.endpoint, pageOrigin);
    if (refused !== undefined) throw new ProviderFailure('refused', refused);
    const url = `${settings.endpoint.replace(/\/+$/, '')}/v1/messages`;
    let response: Response;
    try {
      response = await fetch(url, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-api-key': settings.apiKey,
          'anthropic-version': ANTHROPIC_VERSION,
          'anthropic-dangerous-direct-browser-access': 'true',
        },
        body: JSON.stringify({
          model: settings.model,
          max_tokens: MAX_OUTPUT_TOKENS,
          system: request.system,
          tools: request.tools.map(({ name, description, inputSchema }) => ({ name, description, input_schema: inputSchema })),
          messages: request.messages,
        }),
      });
    } catch {
      throw new ProviderFailure('unreachable', `The chat could not reach ${new URL(url).host}. Check this computer’s internet connection and the endpoint in the chat settings.`);
    }
    let body: unknown;
    try {
      body = await response.json();
    } catch {
      body = undefined;
    }
    if (!response.ok) throw failureOf(response.status, body);
    return replyOf(body);
  },
});
