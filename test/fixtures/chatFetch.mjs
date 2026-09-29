// The chat suites' shared `fetch` interceptor (plan_ai.md §9 stages 4 and 5): every request the page
// makes, recorded with its headers and body, and served. The local server's plan route from `disk`;
// the provider's messages route from `reply`, a script over the conversation so far. Anything else
// is a request the page should never make, and throws.

export const PAGE_ORIGIN = 'http://localhost:4173';
export const ENDPOINT = 'https://api.anthropic.com';
export const MESSAGES_URL = `${ENDPOINT}/v1/messages`;

export const anthropicReply = (content, stopReason) =>
  new Response(JSON.stringify({ id: 'msg', type: 'message', role: 'assistant', content, stop_reason: stopReason, usage: { input_tokens: 1200, output_tokens: 80 } }), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  });

/** Stage 4's script: ask for one month once, then answer with the first marker it was shown. */
export const askOneMonth = (messages, count) => {
  const last = messages.at(-1);
  if (typeof last.content === 'string') return anthropicReply([{ type: 'text', text: 'Let me look.' }, { type: 'tool_use', id: `call-${count}`, name: 'getMonth', input: { month: '2027-01' } }], 'tool_use');
  const marker = last.content[0].content.match(/⟦[^⟧]+⟧/)[0];
  return anthropicReply([{ type: 'text', text: `The figure is ${marker}.` }], 'end_turn');
};

export const storageOf = () => {
  const items = new Map();
  return { getItem: (key) => items.get(key) ?? null, setItem: (key, value) => items.set(key, String(value)), items };
};

export const interceptFetch = (disk, reply = askOneMonth) => {
  const requests = [];
  const original = globalThis.fetch;
  globalThis.fetch = async (input, init = {}) => {
    const url = String(input);
    const headers = Object.fromEntries(new Headers(init.headers ?? {}).entries());
    const body = init.body === undefined ? '' : String(init.body);
    requests.push({ url, method: init.method ?? 'GET', headers, body });
    if (url === '/api/plan') {
      if ((init.method ?? 'GET') === 'PUT') {
        disk.plan = body;
        return new Response(null, { status: 204 });
      }
      return new Response(disk.plan ?? 'null', { status: 200, headers: { 'content-type': 'application/json' } });
    }
    if (url === MESSAGES_URL) return reply(JSON.parse(body).messages, requests.length);
    throw new Error(`a request the page should never make: ${init.method ?? 'GET'} ${url}`);
  };
  return { requests, restore: () => (globalThis.fetch = original) };
};
