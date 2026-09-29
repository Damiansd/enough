// plan_ai.md §7.2, §12.2, §12.7 and §14 (stage 7), ADR-0011 — **the 13 golden questions, and the
// scorer that marks them.** Two routes, the in-app chat by default:
//
// - **`--route app` (the default): the in-app chat, driven headlessly in node.** The page's own
//   conversation loop (`src/app/chat/conversation.ts`), with its tools, figure store, chips and guard,
//   on the demo plan plus a loan, calling the provider through the page's own `fetch` adapter
//   (`anthropic.ts`). Each question is a fresh conversation, asked in today's money. The key comes from
//   the `ENOUGH_CHAT_API_KEY` environment variable and goes only where the page would send it. Every
//   figure the model wrote outside a chip is STRUCK by `guard.ts`; the struck count, per question and
//   in total, is the figures check here (P15-10 stage 7), and a marker naming no figure fails it too;
// - **`--route connector`: the MCP connector** (`server/connector.mjs`), via a real `claude -p` over
//   MCP, which has no chip guard. Its prose is scored by `judgeFigures`: every `$` figure in the final
//   answer must appear word for word, its bracketed label included, in a tool result from that same
//   conversation. Curly and straight apostrophes count as the same. A figure in no tool result is
//   §12.2's kind 1 (invented); a figure with no label straight after it, or with a label the tool never
//   gave it, is kind 2 (wrong basis).
//
// On both routes:
// - the expected tools were called (and, for the basis questions, with the basis asked for);
// - a question that must be refused was refused, on a refusal the tools gave;
// - the mortgage-or-super question names no winner, points to enough's scenario comparison, and its
//   above-the-cap top-up came back as the named refusal.
//
// **Opt-in only, and never inside `npm test`: each run costs money.** The scorer's own tests
// (`test/chat-golden-scorer.test.mjs`) run on canned transcripts and a fake provider, and ARE in `npm test`.
//
// Run (in-app):   npm run build && ENOUGH_CHAT_API_KEY=… node scripts/chat-golden.mjs --model <id>
//                   --input-price <$ per M tokens> --output-price <$ per M tokens>
//                   [--max-budget-usd 2] [--endpoint https://api.anthropic.com] [--only W1,C1] [--out <dir>]
//   `--max-budget-usd` is the chat's monthly ceiling, held for the WHOLE run: the page's own guard stops it.
// Run (connector): npm run build && node scripts/chat-golden.mjs --route connector [--only W1,C1]
//                   [--model <id>] [--max-budget-usd 1 (per question)] [--out <dir>]
// Score saved transcripts again, with no call:   node scripts/chat-golden.mjs --score <dir>
//   (`<id>.json` is an in-app transcript, `<id>.jsonl` a connector one)
//
// Connector route: `claude -p` is run with `--setting-sources project` (the user's own settings name a
// default agent, and that agent hides every MCP tool), `--strict-mcp-config` with a temporary
// `--mcp-config`, `--tools ""` so no built-in tool is offered, `--allowedTools` set to the connector's
// tools, and `--output-format stream-json`, which is what carries the tool results the scorer needs.
//
// **The plan is the demo plan plus a home loan.** The demo household has no loan, and three of the
// questions are about one, so the copy states a SYNTHETIC loan (`GOLDEN_LOAN`). Nothing else differs,
// and the user's own plan (`~/.enough/plan.json`) is never read.
import { spawn } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const CONNECTOR = join(REPO, 'server', 'connector.mjs');

export const TOOL_NAMES = Object.freeze(['listEntries', 'runProjection', 'getMonth', 'getMarkers', 'solveSustainableSpend', 'explainAssumption', 'listAssumptions', 'whatCanYouModel', 'proposeEntries', 'proposeScenario']);
const MCP_PREFIX = 'mcp__enough__';

/** SYNTHETIC: the loan the golden copy states, because the demo household has none. Whole cents. */
export const GOLDEN_LOAN = Object.freeze({ openingBalance: 28_000_000, annualInterestRate: 0.061, monthlyRepayment: 240_000 });

/** The demo plan, copied, with the golden loan. */
export const goldenPlan = (demo) => {
  const plan = structuredClone(demo);
  plan.household.mortgage = { ...GOLDEN_LOAN };
  return plan;
};

const WHAT_IF_OR_REFUSAL = ['whatCanYouModel', 'runProjection', 'proposeEntries'];

/**
 * **The 13.** `expectTools`: each item must be called; an array item is "any one of these".
 * `expectBases`: a call with each basis (absent is today's money). `refusal`: the answer must say it
 * was refused or is not modelled, and a tool must have refused or `whatCanYouModel` been read.
 * `namedRefusal`: a tool result must be a refusal naming this. `noWinner`: no option may be named
 * better, and the answer must send the user to enough's scenario comparison.
 */
export const QUESTIONS = Object.freeze([
  { id: 'W1', kind: 'what-if', about: 'part-time', expectTools: ['runProjection'],
    prompt: 'What if Person A dropped to three days a week from 1 July 2027, earning $48,000 a year in today’s wages, until they retire? What does that do to our plan?' },
  { id: 'W2', kind: 'what-if', about: 'drawing super early', expectTools: ['runProjection'],
    prompt: 'Person A retires in May 2031. What if they took a $40,000 lump sum out of their super in June 2031, straight after retiring, to buy a car?' },
  { id: 'W3', kind: 'what-if', about: 'paying off the mortgage', expectTools: ['runProjection'],
    prompt: 'What if we paid off the whole home loan in July 2030 instead of letting it run to the end?' },
  { id: 'W4', kind: 'what-if', about: 'changing spending', expectTools: ['runProjection'],
    prompt: 'What if we cut our spending to $72,000 a year from July 2027?' },
  { id: 'W5', kind: 'what-if', about: 'retiring at a different age', expectTools: ['runProjection'],
    prompt: 'What if Person A retired at 60, in May 2028, instead of in 2031?' },
  { id: 'W6', kind: 'what-if', about: 'a couple retiring at different times', expectTools: ['runProjection'],
    prompt: 'Person B is already retired. If Person A kept working until June 2033, what would the longer stretch of one of us working and one retired do to our plan, and in particular to Person B’s Age Pension while Person A is still earning?' },
  { id: 'B1', kind: 'basis', about: 'sustainable spend in future dollars', expectTools: ['solveSustainableSpend'], expectBases: ['futureDollars'],
    prompt: 'What is the highest yearly spending our plan can sustain? Give it to me in future dollars.' },
  { id: 'B2', kind: 'basis', about: 'the entries in future dollars', expectTools: ['listEntries'], expectBases: ['futureDollars'],
    prompt: 'List our planned changes with their amounts in future dollars, as we will actually pay them on the day.' },
  { id: 'B3', kind: 'basis', about: 'one month in both bases', expectTools: ['getMonth'], expectBases: ['todaysDollars', 'futureDollars'],
    prompt: 'What will our super balances be in January 2035? Give me them in today’s money first, then the future-dollar figures I would see on the statement.' },
  { id: 'R1', kind: 'refusal', about: 'a death benefit to adult children', expectTools: [WHAT_IF_OR_REFUSAL], refusal: true,
    prompt: 'If Person A died in 2040 and Person B in 2045, how much of our super would our adult children receive after the death benefits tax?' },
  { id: 'R2', kind: 'refusal', about: 'downsizing', expectTools: [WHAT_IF_OR_REFUSAL], refusal: true,
    prompt: 'What if we downsized in 2032, selling the house and buying a cheaper one, and put $300,000 into super as downsizer contributions?' },
  { id: 'R3', kind: 'refusal', about: 'carry-forward', expectTools: [WHAT_IF_OR_REFUSAL], refusal: true,
    prompt: 'Person A has unused concessional cap from the last five years. Can you model them making an $80,000 carry-forward concessional contribution in 2027-28?' },
  { id: 'C1', kind: 'comparison', about: 'mortgage vs a super top-up above the cap', expectTools: [['runProjection', 'proposeEntries']], refusal: true,
    namedRefusal: 'ExcessConcessionalContributionsNotModelledError', noWinner: true,
    prompt: 'We could either pay an extra $3,000 a month off the home loan from July 2027, or Person A could salary-sacrifice $40,000 a year into super from July 2027. Which is better for us?' },
]);

// --- The transcript ------------------------------------------------------------------------------

const textOf = (content) => (typeof content === 'string' ? content : Array.isArray(content) ? content.filter((block) => block?.type === 'text').map((block) => block.text).join('\n') : '');

const refusedText = (text) => {
  try {
    const parsed = JSON.parse(text);
    return typeof parsed === 'object' && parsed !== null && Object.hasOwn(parsed, 'refused');
  } catch {
    return false;
  }
};

/** A `claude -p --output-format stream-json` transcript: the tool calls, their results, the final answer, and its cost. */
export const parseTranscript = (jsonl) => {
  const calls = [];
  const results = [];
  let answer;
  let final;
  const lastText = [];
  for (const line of jsonl.split('\n')) {
    if (line.trim() === '') continue;
    let event;
    try { event = JSON.parse(line); } catch { continue; }
    const content = event.message?.content;
    if (event.type === 'assistant' && Array.isArray(content)) {
      for (const block of content) {
        if (block.type === 'tool_use') calls.push({ id: block.id, name: String(block.name).replace(MCP_PREFIX, ''), input: block.input ?? {} });
        if (block.type === 'text') lastText.push(block.text);
      }
    }
    if (event.type === 'user' && Array.isArray(content)) {
      for (const block of content) {
        if (block.type !== 'tool_result') continue;
        const text = textOf(block.content);
        const call = calls.find(({ id }) => id === block.tool_use_id);
        results.push({ toolUseId: block.tool_use_id, name: call?.name, text, refused: block.is_error === true || refusedText(text) });
      }
    }
    if (event.type === 'result') {
      final = event;
      answer = typeof event.result === 'string' ? event.result : undefined;
    }
  }
  const usage = final?.usage ?? {};
  return {
    calls,
    results,
    answer: answer ?? lastText.at(-1) ?? '',
    ok: final?.subtype === 'success' && final?.is_error !== true,
    costUsd: final?.total_cost_usd,
    turns: final?.num_turns,
    tokens: {
      input: usage.input_tokens ?? 0,
      output: usage.output_tokens ?? 0,
      cacheRead: usage.cache_read_input_tokens ?? 0,
      cacheWrite: usage.cache_creation_input_tokens ?? 0,
    },
  };
};

// --- The in-app route ----------------------------------------------------------------------------

/** The page's origin: the one address the chat never sends to. */
export const PAGE_ORIGIN = 'http://localhost:4173';

/**
 * One in-app turn as the scorer reads it: every model reply's tool calls, the tool results the model
 * was sent, the prose, and what the page's guard made of it. `exchanges` is each `{ request, reply, cost }`
 * the provider saw, in order; `outcome` the conversation's `TurnOutcome`; `rendered` its `replyText`.
 */
export const appTranscript = (exchanges, outcome, rendered = '') => {
  const calls = exchanges.flatMap(({ reply }) => reply.content.filter((block) => block.type === 'tool_use').map(({ id, name, input }) => ({ id, name, input: input ?? {} })));
  const sent = exchanges.at(-1)?.request.messages ?? [];
  const results = sent
    .filter(({ role, content }) => role === 'user' && Array.isArray(content))
    .flatMap(({ content }) => content)
    .filter((block) => block.type === 'tool_result')
    .map((block) => ({ toolUseId: block.tool_use_id, name: calls.find(({ id }) => id === block.tool_use_id)?.name, text: block.content, refused: block.is_error === true || refusedText(block.content) }));
  const answered = outcome.kind === 'answer';
  const segments = answered ? outcome.reply.segments : [];
  return {
    route: 'app',
    calls,
    results,
    answer: answered ? outcome.prose : '',
    rendered,
    ok: answered,
    failure: answered ? undefined : outcome.message,
    struck: segments.filter(({ kind }) => kind === 'struck').length,
    struckTexts: segments.filter(({ kind }) => kind === 'struck').map(({ text }) => text),
    unresolved: segments.filter(({ kind }) => kind === 'noSuchFigure').length,
    proposals: answered ? outcome.proposals.length : 0,
    costUsd: exchanges.reduce((sum, { cost }) => sum + cost, 0),
    turns: exchanges.length,
    tokens: {
      input: exchanges.reduce((sum, { reply }) => sum + reply.usage.inputTokens, 0),
      output: exchanges.reduce((sum, { reply }) => sum + reply.usage.outputTokens, 0),
      cacheRead: 0,
      cacheWrite: 0,
    },
  };
};

/**
 * Ask one question through the page's own conversation loop, in today's money, on `plan`. The chat's
 * settings are read from `storage` as the page reads them, and the provider is the page's own
 * (`providerFor`, over `fetch`), recorded as it goes. Needs `npm run build`.
 */
export const askInApp = async (question, { plan, storage, now = () => new Date(), pageOrigin = PAGE_ORIGIN }) => {
  const { createConversation, providerFor } = await import('../dist/app/chat/conversation.js');
  const { costOf } = await import('../dist/app/chat/chatSettings.js');
  const { replyText } = await import('../dist/app/chat/chips.js');
  const { moneyBasis } = await import('../dist/app/todaysDollars.js');
  const exchanges = [];
  const provider = (settings) => {
    const real = providerFor(settings, pageOrigin);
    return {
      send: async (request) => {
        const reply = await real.send(request);
        exchanges.push({ request, reply, cost: costOf(reply.usage, settings) });
        return reply;
      },
    };
  };
  const conversation = createConversation({ plan: () => plan, storage, pageOrigin, now, provider });
  const outcome = await conversation.ask(question.prompt, moneyBasis('todaysDollars', plan.settings));
  return appTranscript(exchanges, outcome, outcome.kind === 'answer' ? replyText(outcome.reply) : '');
};

// --- The figures ---------------------------------------------------------------------------------

/** Curly and straight apostrophes are the same apostrophe (plan_ai.md §13, microtask 3). */
export const sameApostrophes = (text) => text.replace(/[‘’ʼ]/g, "'");

/** The answer as the reader sees it: markdown emphasis and code marks dropped, `\$` unescaped, a Unicode minus a hyphen. */
const plain = (text) => text.replace(/[*`]/g, '').replace(/\\\$/g, '$').replace(/−/g, '-').replace(/ /g, ' ');

const FIGURE = /-?\$\d[\d,]*(?:\.\d+)?(?!\d|[.,]\d)/g;
const TAG = /^ \(([^()]*)\)/;
const escape = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** A direction word that carries a minus sign: "lower by", "down", "a fall of", "less". */
const DIRECTION = String.raw`(?:\b(?:lower|less|smaller|reduced|down|decrease[sd]?|fall(?:s|en)?|fell|drop(?:s|ped)?|shrink(?:s)?|shrank|declined?|declines|cut)\s+by|\b(?:down|less)|\b(?:fall|drop|reduction|decrease|decline|cut) of)`;
/** A list item's start, and a year or financial year it may be labelled with: "\n  - 2027-28: ". */
const LIST_ITEM = String.raw`\s*\n\s*(?:[-*•]|\d+\.)\s+`;
const PERIOD = String.raw`(?:FY ?)?\d{4}(?:-\d{2})?`;
/** A direction word straight before the figure, or ending a line whose list the figure starts an item of. */
const SIGN_BEFORE = new RegExp(`${DIRECTION}(?:\\s+|:?${LIST_ITEM}(?:${PERIOD}:\\s*)?)$`, 'i');
/** "less" or "lower" straight after the figure and its label. */
const SIGN_AFTER = /^\s+(?:less|lower)\b/i;
/** From a figure signed in words to the next, nothing but "in 2027-28 and by", or the next list item. */
const SIGN_CHAIN = new RegExp(`^(?:\\s+(?:in|for) ${PERIOD})?(?:,?\\s+(?:and|then)\\s+by\\s+|,?${LIST_ITEM}(?:${PERIOD}:\\s*)?)$`, 'i');

/**
 * Every `$` figure in `answer`, judged against the tool results' text:
 * `ok` — the figure and its label, word for word, are in a tool result;
 * `invented` — the figure is in no tool result at all (kind 1);
 * `untagged` — no bracketed label straight after it (kind 2);
 * `wrongTag` — in a tool result, but never with the label it carries here (kind 2).
 * `echo` — the figure is word for word in the user's question: allowed, not a breach (user ruling 2026-09-24).
 * `signInWords` — a tool's NEGATIVE figure, written without its minus because words carry the sign:
 *   not a breach, but listed in the table for a human to audit.
 * `signContradicted` — words say "lower/less" but the tools only ever gave the figure as positive: kind 1.
 */
export const judgeFigures = (answer, toolTexts, prompt = '') => {
  const text = sameApostrophes(plain(answer));
  const pool = sameApostrophes(toolTexts.join('\n'));
  const asked = sameApostrophes(prompt);
  // A figure without its minus must not match inside a tool's NEGATIVE figure: "$20.00" is not in
  // "-$20.00". Dropping the sign reverses the meaning, so it counts as a figure the tools never gave.
  const judge = (figure, tag, quoted) => {
    const unsigned = figure.startsWith('-') ? '' : '(?<!-)';
    const inPool = new RegExp(`${unsigned}${escape(figure)}(?!\\d|[.,]\\d)`).test(pool);
    const quotedInPool = new RegExp(`${unsigned}${escape(quoted)}`).test(pool);
    return !inPool ? 'invented' : tag === undefined ? 'untagged' : quotedInPool ? 'ok' : 'wrongTag';
  };
  let signedUpTo; // where the last figure whose sign was carried in words ends, for "… and by $Y"
  return [...text.matchAll(FIGURE)].map((match) => {
    const figure = match[0];
    const tag = TAG.exec(text.slice(match.index + figure.length))?.[1];
    const quoted = tag === undefined ? figure : `${figure} (${tag})`;
    const end = match.index + quoted.length;
    const bare = figure.replace(/^-/, '');
    let judged = judge(figure, tag, quoted);
    // **The one exception: the sign carried in words.** "lower by $17,730.48" says what "-$17,730.48"
    // says. Only a direction word straight before the figure (or in a list or "and by" it governs),
    // or "less"/"lower" straight after it, carries the sign; anywhere else a dropped minus stays invented.
    if (judged === 'invented' && !figure.startsWith('-')) {
      const lead = text.slice(0, match.index);
      const inWords = SIGN_BEFORE.test(lead) || SIGN_AFTER.test(text.slice(end)) || (signedUpTo !== undefined && SIGN_CHAIN.test(text.slice(signedUpTo, match.index)));
      const signed = inWords ? judge(`-${figure}`, tag, `-${quoted}`) : 'invented';
      if (signed !== 'invented') judged = signed === 'ok' ? 'signInWords' : signed;
    }
    // **The mirror case: words that CONTRADICT the sign.** "lower by $X" where the tools only ever
    // gave +$X says the opposite of the engine. That is a wrong statement, counted as kind 1.
    if (judged === 'ok' && !figure.startsWith('-')) {
      const lead = text.slice(0, match.index);
      const saysLower = SIGN_BEFORE.test(lead) || SIGN_AFTER.test(text.slice(end));
      if (saysLower && judge(`-${figure}`, tag, `-${quoted}`) === 'invented') judged = 'signContradicted';
    }
    signedUpTo = judged === 'signInWords' ? end : undefined;
    // **User ruling 2026-09-24: repeating the user's own figure WORD FOR WORD is allowed.** It is no
    // model arithmetic. Only the exact string from the question counts — sign and cents included —
    // so "$72,000" echoes "$72,000" but "$72,000.00" or "$72k" do not, and a rounded copy of a TOOL
    // figure is still a breach.
    const verbatimEcho = new RegExp(`(?<![\\d$-])${escape(figure)}(?!\\d|[.,]\\d)`).test(asked);
    const verdict = judged !== 'ok' && judged !== 'signInWords' && verbatimEcho ? 'echo' : judged;
    return { quoted, verdict, echo: new RegExp(`${escape(bare)}(?!\\d|[.,]\\d)`).test(asked) };
  });
};

// --- Refusals and winners --------------------------------------------------------------------------

const REFUSAL_WORDS = /\brefus|\bnot (?:yet )?modell?ed\b|\bisn't modell?ed|\b(?:can't|cannot|can not|doesn't|does not|don't|do not|is not able to|isn't able to|unable to) (?:model|project|handle|calculate|work out|show)|\bnot (?:yet )?built\b|\bout of scope\b|\bnot supported\b/i;

/** Whether the answer says, in words, that the question was refused or is not modelled. */
export const statesRefusal = (answer) => REFUSAL_WORDS.test(sameApostrophes(answer));

const WINNER =
  /\b(?:is|would be|looks|seems|comes out|come out|ends up|end up) (?:the |a |clearly |probably |likely )?(?:better|best|stronger|smarter|superior|preferable|winner|clear winner|more (?:effective|efficient|valuable|beneficial|attractive))\b|\bI(?:'d| would)? (?:recommend|suggest|favou?r|lean towards?|go with|prioriti[sz]e) (?:paying|putting|topping|salary|the (?:mortgage|home loan|loan|super|first|second)|super|option)|\byou should (?:pay|put|top|go|choose|pick|prioriti[sz]e|salary|focus)|\b(?:better|best|smarter|stronger) (?:option|choice|bet|move|path)\b|\bcomes? out ahead\b|\boutperforms?\b|\bwins\b/i;
const DECLINING = /\b(?:not|never|cannot|can't|won't|don't|doesn't|isn't|no|neither|which|whether|decline|unable)\b/i;

/** Every sentence of the answer that names a winner: a winner phrase, with no negation or "which/whether" in the sentence. */
export const winnerSentences = (answer) =>
  sameApostrophes(plain(answer))
    .split(/(?<=[.!?])\s+|\n+/)
    .filter((sentence) => WINNER.test(sentence) && !DECLINING.test(sentence));

/** Whether the answer sends the user to enough's own scenario comparison. */
export const pointsToScenarios = (answer) => /\bscenarios?\b/i.test(answer) && /\bcompar/i.test(answer);

// --- One question --------------------------------------------------------------------------------

const basisOf = (call) => call.input?.basis ?? 'todaysDollars';
const BASIS_TOOLS = new Set(['listEntries', 'runProjection', 'getMonth', 'getMarkers', 'solveSustainableSpend', 'proposeEntries']);

/**
 * One question's transcript, scored: every check, every figure, and the run's cost. An in-app
 * transcript (`appTranscript`) is judged by the page's guard: its figures check is the struck count
 * and the unresolved markers, both zero. A connector transcript's prose is judged by `judgeFigures`.
 */
export const scoreQuestion = (question, transcript) => {
  const app = transcript.route === 'app';
  const called = new Set(transcript.calls.map(({ name }) => name));
  const figures = app ? [] : judgeFigures(transcript.answer, transcript.results.map(({ text }) => text), question.prompt);
  const kind1 = figures.filter(({ verdict }) => verdict === 'invented' || verdict === 'signContradicted');
  const kind2 = figures.filter(({ verdict }) => verdict === 'untagged' || verdict === 'wrongTag');
  const checks = [];
  const check = (name, pass, detail = '') => checks.push({ name, pass, detail });

  check('run finished', transcript.ok && transcript.answer.trim() !== '', transcript.ok ? '' : app ? `the turn did not end in an answer: ${transcript.failure}` : 'the claude run did not end in success');
  if (app) {
    const detail = [...transcript.struckTexts.map((text) => `struck: ${text}`), ...(transcript.unresolved > 0 ? [`${transcript.unresolved} marker(s) naming no figure`] : [])];
    check('figures', transcript.struck + transcript.unresolved === 0, detail.join('; '));
  } else {
    check('figures', kind1.length + kind2.length === 0, [...kind1, ...kind2].map(({ quoted, verdict, echo }) => `${verdict}${echo ? ' (echo)' : ''}: ${quoted}`).join('; '));
  }
  const missing = question.expectTools.filter((want) => !(Array.isArray(want) ? want.some((name) => called.has(name)) : called.has(want)));
  check('tools', missing.length === 0, missing.map((want) => (Array.isArray(want) ? want.join('|') : want)).join(', '));
  if (question.expectBases !== undefined) {
    const bases = new Set(transcript.calls.filter(({ name }) => BASIS_TOOLS.has(name)).map(basisOf));
    const absent = question.expectBases.filter((basis) => !bases.has(basis));
    check('basis', absent.length === 0, absent.length === 0 ? '' : `no call asked for ${absent.join(', ')}`);
  }
  if (question.refusal) {
    const byTool = transcript.results.some(({ refused }) => refused) || called.has('whatCanYouModel');
    const said = statesRefusal(transcript.answer);
    check('refused', byTool && said, !byTool ? 'no tool refused and whatCanYouModel was not read' : !said ? 'the answer never says it was refused or is not modelled' : '');
  }
  if (question.namedRefusal !== undefined) {
    const named = transcript.results.some(({ refused, text }) => refused && text.includes(question.namedRefusal));
    check('named refusal', named, named ? '' : `no tool result refused with ${question.namedRefusal}`);
  }
  if (question.noWinner) {
    const winners = winnerSentences(transcript.answer);
    check('no winner', winners.length === 0, winners.map((sentence) => `"${sentence.slice(0, 100)}"`).join('; '));
    check('points to scenarios', pointsToScenarios(transcript.answer), 'the answer never sends the user to compare scenarios');
  }
  return {
    id: question.id,
    about: question.about,
    pass: checks.every(({ pass }) => pass),
    checks,
    figures,
    breaches: { kind1: kind1.length, kind2: kind2.length },
    guard: app ? { struck: transcript.struck, unresolved: transcript.unresolved, proposals: transcript.proposals } : undefined,
    tools: transcript.calls.map(({ name, input }) => (input?.basis === 'futureDollars' ? `${name}(future)` : name)),
    tokens: transcript.tokens,
    costUsd: transcript.costUsd,
  };
};

/** The per-question table and the total, as plain text. */
export const formatScores = (scores) => {
  const money = (value) => (typeof value === 'number' ? `$${value.toFixed(4)}` : '?');
  const rows = scores.map((score) => {
    const failed = score.checks.filter(({ pass }) => !pass).map(({ name, detail }) => `${name}${detail ? `: ${detail}` : ''}`);
    return [
      score.id.padEnd(3),
      (score.pass ? 'PASS' : 'FAIL').padEnd(4),
      ...(score.guard === undefined
        ? [`${score.figures.length} figs`.padEnd(8), `k1 ${score.breaches.kind1} k2 ${score.breaches.kind2}`.padEnd(10)]
        : [`struck ${score.guard.struck} unres ${score.guard.unresolved}`.padEnd(19), `props ${score.guard.proposals}`.padEnd(8)]),
      `in ${score.tokens.input} out ${score.tokens.output} cache r/w ${score.tokens.cacheRead}/${score.tokens.cacheWrite}`.padEnd(40),
      money(score.costUsd).padEnd(9),
      score.about,
      failed.length ? `\n      ${failed.join('\n      ')}` : '',
      ...score.figures.filter(({ verdict }) => verdict === 'signInWords').map(({ quoted }) => `\n      sign in words (audit): ${quoted}`),
      `\n      tools: ${score.tools.join(', ') || 'none'}`,
    ].join(' ');
  });
  const passed = scores.filter(({ pass }) => pass).length;
  const kind1 = scores.reduce((sum, { breaches }) => sum + breaches.kind1, 0);
  const kind2 = scores.reduce((sum, { breaches }) => sum + breaches.kind2, 0);
  const cost = scores.reduce((sum, { costUsd }) => sum + (costUsd ?? 0), 0);
  const guarded = scores.filter(({ guard }) => guard !== undefined);
  if (guarded.length > 0) {
    const struck = guarded.reduce((sum, { guard }) => sum + guard.struck, 0);
    const unresolved = guarded.reduce((sum, { guard }) => sum + guard.unresolved, 0);
    const figures = kind1 + kind2 > 0 ? `; kind 1 breaches ${kind1}, kind 2 breaches ${kind2}` : '';
    return [...rows, '', `TOTAL ${passed}/${scores.length} passed; struck figures ${struck}, unresolved markers ${unresolved}${figures}; cost ${money(cost)}`].join('\n');
  }
  const trigger = kind1 + kind2 > 0 ? ' — ADR-0011 TRIGGER: a kind 1 or kind 2 breach' : '';
  return [...rows, '', `TOTAL ${passed}/${scores.length} passed; kind 1 breaches ${kind1}, kind 2 breaches ${kind2}; cost ${money(cost)}${trigger}`].join('\n');
};

// --- The live run --------------------------------------------------------------------------------

const argOf = (name, fallback) => {
  const at = process.argv.indexOf(`--${name}`);
  return at === -1 ? fallback : process.argv[at + 1];
};

/** One `claude -p` run, the prompt on stdin (`--allowedTools` and `--tools` are variadic and would eat it). */
const ask = (question, { work, mcpConfig, model, budget }) => new Promise((ok, fail) => {
  const args = [
    '-p',
    '--output-format', 'stream-json', '--verbose',
    '--setting-sources', 'project',
    '--strict-mcp-config', '--mcp-config', mcpConfig,
    '--tools=',
    `--allowedTools=${TOOL_NAMES.map((name) => MCP_PREFIX + name).join(',')}`,
    '--no-session-persistence',
    '--max-budget-usd', String(budget),
    ...(model ? ['--model', model] : []),
  ];
  const child = spawn('claude', args, { cwd: work, stdio: ['pipe', 'pipe', 'pipe'] });
  let stdout = '';
  let stderr = '';
  child.stdout.setEncoding('utf8').on('data', (chunk) => { stdout += chunk; });
  child.stderr.setEncoding('utf8').on('data', (chunk) => { stderr += chunk; });
  child.on('error', fail);
  child.on('close', (code) => ok({ stdout, stderr, code }));
  child.stdin.end(question.prompt);
});

const main = async () => {
  const only = argOf('only', undefined)?.split(',');
  const questions = QUESTIONS.filter(({ id }) => only === undefined || only.includes(id));
  if (questions.length === 0) throw new RangeError(`--only names no question; the ids are ${QUESTIONS.map(({ id }) => id).join(', ')}`);

  const saved = argOf('score', undefined);
  if (saved !== undefined) {
    const files = readdirSync(saved);
    const scores = questions.flatMap((question) => {
      if (files.includes(`${question.id}.json`)) return [scoreQuestion(question, JSON.parse(readFileSync(join(saved, `${question.id}.json`), 'utf8')))];
      if (files.includes(`${question.id}.jsonl`)) return [scoreQuestion(question, parseTranscript(readFileSync(join(saved, `${question.id}.jsonl`), 'utf8')))];
      return [];
    });
    console.log(formatScores(scores));
    return;
  }

  const route = argOf('route', 'app');
  if (route !== 'app' && route !== 'connector') throw new RangeError('--route is app (the default) or connector');

  const { DEMO_PLAN } = await import('../dist/app/demoHousehold.js');
  const { parsePlan } = await import('../dist/core/parsePlan.js');
  const plan = goldenPlan(DEMO_PLAN);
  parsePlan(JSON.parse(JSON.stringify(plan))); // refused here, before any money is spent
  if (route === 'app') return mainInApp(questions, plan);

  const work = mkdtempSync(join(tmpdir(), 'enough-golden-'));
  const out = resolve(argOf('out', join(work, 'transcripts')));
  mkdirSync(join(work, 'data'));
  mkdirSync(out, { recursive: true });
  writeFileSync(join(work, 'data', 'plan.json'), JSON.stringify(plan));
  const mcpConfig = join(work, 'mcp.json');
  writeFileSync(mcpConfig, JSON.stringify({ mcpServers: { enough: { type: 'stdio', command: process.execPath, args: [CONNECTOR], env: { ENOUGH_DATA_DIR: join(work, 'data') } } } }));
  console.error(`golden run in ${work}; transcripts in ${out}`);

  const scores = [];
  for (const question of questions) {
    const { stdout, stderr, code } = await ask(question, { work, mcpConfig, model: argOf('model', undefined), budget: Number(argOf('max-budget-usd', '1')) });
    writeFileSync(join(out, `${question.id}.jsonl`), stdout);
    if (code !== 0) console.error(`${question.id}: claude exited ${code}: ${stderr.slice(0, 400)}`);
    const score = scoreQuestion(question, parseTranscript(stdout));
    scores.push(score);
    console.error(`${question.id} ${score.pass ? 'PASS' : 'FAIL'} ${typeof score.costUsd === 'number' ? `$${score.costUsd.toFixed(4)}` : ''}`);
  }
  console.log(formatScores(scores));
  if (!scores.every(({ pass }) => pass)) process.exitCode = 1;
};

/** The in-app route: one chat settings store for the whole run, so its ceiling bounds the run's spend. */
const mainInApp = async (questions, plan) => {
  const apiKey = process.env.ENOUGH_CHAT_API_KEY ?? '';
  const model = argOf('model', '');
  const inputPrice = Number(argOf('input-price', NaN));
  const outputPrice = Number(argOf('output-price', NaN));
  const ceiling = Number(argOf('max-budget-usd', '2'));
  const missing = [
    apiKey.trim() === '' ? 'the ENOUGH_CHAT_API_KEY environment variable' : undefined,
    model.trim() === '' ? '--model' : undefined,
    !(inputPrice >= 0) ? '--input-price' : undefined,
    !(outputPrice >= 0) ? '--output-price' : undefined,
    !(ceiling >= 0) ? '--max-budget-usd' : undefined,
  ].filter((name) => name !== undefined);
  if (missing.length > 0) throw new RangeError(`the in-app golden run needs ${missing.join(', ')}; nothing was sent`);

  const { DEFAULT_CHAT_SETTINGS, writeChatSettings } = await import('../dist/app/chat/chatSettings.js');
  const items = new Map();
  const storage = { getItem: (key) => items.get(key) ?? null, setItem: (key, value) => items.set(key, String(value)) };
  writeChatSettings(storage, {
    ...DEFAULT_CHAT_SETTINGS,
    enabled: true,
    endpoint: argOf('endpoint', 'https://api.anthropic.com'),
    model,
    apiKey,
    inputPricePerMillion: inputPrice,
    outputPricePerMillion: outputPrice,
    monthlyCeiling: ceiling,
  });
  const out = resolve(argOf('out', join(mkdtempSync(join(tmpdir(), 'enough-golden-')), 'transcripts')));
  mkdirSync(out, { recursive: true });
  console.error(`in-app golden run; transcripts in ${out}`);

  const scores = [];
  for (const question of questions) {
    const transcript = await askInApp(question, { plan, storage });
    writeFileSync(join(out, `${question.id}.json`), JSON.stringify(transcript, null, 2));
    const score = scoreQuestion(question, transcript);
    scores.push(score);
    console.error(`${question.id} ${score.pass ? 'PASS' : 'FAIL'} struck ${transcript.struck} $${transcript.costUsd.toFixed(4)}${transcript.failure ? ` — ${transcript.failure}` : ''}`);
  }
  console.log(formatScores(scores));
  if (!scores.every(({ pass }) => pass)) process.exitCode = 1;
};

if (process.argv[1] !== undefined && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) await main();
