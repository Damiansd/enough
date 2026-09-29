// plan_ai.md §12.7 — the golden scorer (`scripts/chat-golden.mjs`), on canned transcripts. The live
// suite costs money and is never run here; the scorer that marks it is.
//
// Each canned transcript (`test/fixtures/chat-golden/`, in the stream-json shape the first live call
// produced) passes as it is. Each mutation of its answer below is one way an answer breaks §12's
// golden rule, and each must be caught, by the check it belongs to.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { QUESTIONS, TOOL_NAMES, askInApp, goldenPlan, judgeFigures, parseTranscript, sameApostrophes, scoreQuestion, formatScores } from '../scripts/chat-golden.mjs';
import { DEMO_PLAN } from '../dist/app/demoHousehold.js';
import { DEFAULT_CHAT_SETTINGS, writeChatSettings } from '../dist/app/chat/chatSettings.js';
import { ENDPOINT, MESSAGES_URL, anthropicReply, interceptFetch, storageOf } from './fixtures/chatFetch.mjs';

const FIXTURES = join(dirname(fileURLToPath(import.meta.url)), 'fixtures', 'chat-golden');
const canned = (name) => parseTranscript(readFileSync(join(FIXTURES, `${name}.jsonl`), 'utf8'));
const question = (id) => QUESTIONS.find((each) => each.id === id);

/** The transcript with its final answer rewritten: `edit` must change it, or the mutation is vacuous. */
const withAnswer = (transcript, edit) => {
  const answer = edit(transcript.answer);
  assert.notEqual(answer, transcript.answer, 'the mutation changed nothing');
  return { ...transcript, answer };
};
const failed = (score) => score.checks.filter(({ pass }) => !pass).map(({ name }) => name);

test('the suite: 13 questions — 6 what-ifs, 3 basis switches, 3 refusals, and mortgage vs super', () => {
  assert.equal(QUESTIONS.length, 13);
  const kinds = QUESTIONS.map(({ kind }) => kind);
  assert.deepEqual(['what-if', 'basis', 'refusal', 'comparison'].map((kind) => kinds.filter((each) => each === kind).length), [6, 3, 3, 1]);
  assert.equal(new Set(QUESTIONS.map(({ id }) => id)).size, 13);
  for (const { id, expectTools } of QUESTIONS) for (const name of expectTools.flat()) assert.ok(TOOL_NAMES.includes(name), `${id}: ${name}`);
  const c1 = question('C1');
  assert.equal(c1.namedRefusal, 'ExcessConcessionalContributionsNotModelledError');
  assert.ok(c1.noWinner && c1.refusal);
  // The top-up is above the cap: $40,000 a year of salary sacrifice, on top of the Guarantee.
  assert.match(c1.prompt, /salary-sacrifice \$40,000 a year/);
  for (const id of ['R1', 'R2', 'R3']) assert.ok(question(id).refusal, id);
  assert.deepEqual(question('B3').expectBases, ['todaysDollars', 'futureDollars']);
});

test('the transcript: tool calls without the mcp prefix, results joined to their call, the answer and its cost', () => {
  const t = canned('comparison');
  assert.deepEqual(t.calls.map(({ name }) => name), ['runProjection', 'runProjection']);
  assert.deepEqual(t.results.map(({ name, refused }) => [name, refused]), [['runProjection', false], ['runProjection', true]]);
  assert.equal(t.ok, true);
  assert.equal(t.costUsd, 0.1623);
  assert.deepEqual(t.tokens, { input: 6, output: 1200, cacheRead: 20000, cacheWrite: 9000 });
  assert.match(t.answer, /compare them in the chart/);
  // The reminder block rides beside the tool's own text and is read as part of the result.
  assert.match(canned('what-if').results[1].text, /Reminder: Every dollar figure/);
});

test('each canned transcript passes as it is', () => {
  for (const [id, name] of [['W4', 'what-if'], ['R2', 'refusal'], ['C1', 'comparison']]) {
    const score = scoreQuestion(question(id), canned(name));
    assert.deepEqual(failed(score), [], `${name}: ${JSON.stringify(score.checks)}`);
    assert.equal(score.pass, true, name);
  }
  const score = scoreQuestion(question('W4'), canned('what-if'));
  assert.equal(score.figures.length, 7);
  assert.ok(score.figures.every(({ verdict }) => verdict === 'ok'));
  assert.deepEqual(score.breaches, { kind1: 0, kind2: 0 });
});

test('curly and straight apostrophes are the same: the canned answer is straight, the tools curly', () => {
  const t = canned('what-if');
  assert.ok(t.answer.includes("(today's money)") && !t.answer.includes('’'));
  assert.ok(t.results.every(({ text }) => !text.includes("today's")));
  assert.equal(sameApostrophes('today’s ‘x’'), "today's 'x'");
  // And the other way round: a curly answer against straight tool text.
  assert.deepEqual(judgeFigures('$5.00 (today’s money)', ["$5.00 (today's money)"]).map(({ verdict }) => verdict), ['ok']);
});

test('a figure repeated word for word from the question is allowed; a reworded one is not', () => {
  const prompt = 'What if we cut spending to $72,000 a year?';
  assert.deepEqual(judgeFigures('spending of $72,000 a year', [], prompt).map(({ verdict }) => verdict), ['echo']);
  assert.deepEqual(judgeFigures("spending of $72,000 a year (today’s money)", [], prompt).map(({ verdict }) => verdict), ['echo']);
  assert.deepEqual(judgeFigures('spending of $72,000.00 a year', [], prompt).map(({ verdict }) => verdict), ['invented']);
  assert.deepEqual(judgeFigures('your existing $84,000 entry', ["$84,000.00 (today's money)"], prompt).map(({ verdict }) => verdict), ['invented']);
});

test('words that contradict the sign are a breach: "lower by" against a positive figure', () => {
  const tools = ["difference: $1,234.00 (today's money)"];
  assert.deepEqual(judgeFigures("balances would be lower by $1,234.00 (today’s money)", tools).map(({ verdict }) => verdict), ['signContradicted']);
  assert.deepEqual(judgeFigures("balances would be higher by $1,234.00 (today’s money)", tools).map(({ verdict }) => verdict), ['ok']);
  const both = ["a: $1,234.00 (today's money)", "b: -$1,234.00 (today's money)"];
  assert.deepEqual(judgeFigures("lower by $1,234.00 (today’s money)", both).map(({ verdict }) => verdict), ['ok']); // the tools gave both signs: not a contradiction
});

test('a dropped minus sign is a figure the tools never gave', () => {
  const tools = ["difference: -$20,970.77 (today's money)"];
  assert.deepEqual(judgeFigures("$20,970.77 (today’s money)", tools).map(({ verdict }) => verdict), ['invented']);
  assert.deepEqual(judgeFigures("-$20,970.77 (today’s money)", tools).map(({ verdict }) => verdict), ['ok']);
  assert.deepEqual(judgeFigures("−$20,970.77 (today’s money)", tools).map(({ verdict }) => verdict), ['ok']);
});

test('a dropped minus is allowed only where direction words carry the sign: signInWords, not a breach', () => {
  const tools = ["totalBalances: -$17,730.48 (today's money), tax: -$8,988.49 (today's money), -$14,297.01 (today's money), -$72,653.32 (today's money)"];
  const verdicts = (answer) => judgeFigures(answer, tools).map(({ verdict }) => verdict);
  // W1 of the first live run, word for word: a list the direction word governs, and an "and by".
  const w1 =
    'By the end of each financial year, your total balances would be lower by:\n  - 2027-28: $17,730.48 (today’s money)\n  - 2030-31: $72,653.32 (today’s money)\n' +
    '- **You would pay less tax while Person A works part-time.** Tax is lower by $8,988.49 (today’s money) in 2027-28 and by $14,297.01 (today’s money) in 2029-30.';
  assert.deepEqual(verdicts(w1), ['signInWords', 'signInWords', 'signInWords', 'signInWords']);
  assert.deepEqual(verdicts('your balances would be lower by $17,730.48 (today’s money)'), ['signInWords']);
  assert.deepEqual(verdicts('Tax is down $8,988.49 (today’s money).'), ['signInWords']);
  assert.deepEqual(verdicts('You would have $17,730.48 (today’s money) less in 2027-28.'), ['signInWords']);
  // No direction word, or the wrong one: the sign is lost, and the figure is one no tool gave.
  assert.deepEqual(verdicts('your balances would be $17,730.48 (today’s money)'), ['invented']);
  assert.deepEqual(verdicts('your balances would be higher by $17,730.48 (today’s money)'), ['invented']);
  assert.deepEqual(verdicts('your balances would be up $17,730.48 (today’s money)'), ['invented']);
  // A direction word does not reach past the end of its sentence, or into a figure not after "and by".
  assert.deepEqual(verdicts('Tax is lower by $8,988.49 (today’s money). Balances are $17,730.48 (today’s money).'), ['signInWords', 'invented']);
  assert.deepEqual(verdicts('Tax is lower by $8,988.49 (today’s money), and balances $17,730.48 (today’s money).'), ['signInWords', 'invented']);
  // The sign in words is still checked for its label.
  assert.deepEqual(verdicts('lower by $17,730.48 (future dollars)'), ['wrongTag']);
  // It is listed for a human to audit, and is not a breach.
  const score = scoreQuestion(question('W1'), { calls: [{ name: 'runProjection' }], results: [{ text: tools[0] }], answer: w1, ok: true, tokens: {} });
  assert.deepEqual(score.breaches, { kind1: 0, kind2: 0 });
  assert.match(formatScores([score]), /sign in words \(audit\): \$17,730\.48 \(today's money\)/);
});

// --- The mutations: each must turn a passing transcript red, on the right check ---------------------

test('MUTATION a figure missing its tag: kind 2, untagged', () => {
  const score = scoreQuestion(question('W4'), withAnswer(canned('what-if'), (a) => a.replace("$12,425.02 (today's money)", '$12,425.02')));
  assert.equal(score.pass, false);
  assert.deepEqual(failed(score), ['figures']);
  assert.deepEqual(score.breaches, { kind1: 0, kind2: 1 });
  assert.deepEqual(score.figures.filter(({ verdict }) => verdict !== 'ok').map(({ quoted, verdict }) => [quoted, verdict]), [['$12,425.02', 'untagged']]);
});

test('MUTATION the label once in a heading, not on the figure: kind 2 on every figure it strips', () => {
  const score = scoreQuestion(question('W4'), withAnswer(canned('what-if'), (a) => `All figures in today's money.\n${a.replaceAll(" (today's money)", '')}`));
  assert.equal(score.pass, false);
  assert.deepEqual(score.breaches, { kind1: 0, kind2: 7 });
});

test('MUTATION a figure not in any tool result: kind 1, invented', () => {
  const score = scoreQuestion(question('W4'), withAnswer(canned('what-if'), (a) => a.replace('$417,650.69', '$417,650.70')));
  assert.equal(score.pass, false);
  assert.deepEqual(failed(score), ['figures']);
  assert.deepEqual(score.breaches, { kind1: 1, kind2: 0 });
  // A rounded copy is not word for word either.
  const rounded = scoreQuestion(question('W4'), withAnswer(canned('what-if'), (a) => a.replace("$84,000.00 (today's money)", "$84,000 (today's money)")));
  assert.deepEqual(rounded.breaches, { kind1: 1, kind2: 0 });
});

test('the question’s own figure echoed word for word passes (user ruling 2026-09-24); a rounded echo does not', () => {
  const echoed = scoreQuestion(question('W4'), withAnswer(canned('what-if'), (a) => a.replace('I ran the forecast with spending cut', "I ran the forecast with spending cut to $72,000 (today's money)")));
  assert.equal(echoed.pass, true);
  assert.deepEqual(echoed.figures.filter(({ verdict }) => verdict !== 'ok').map(({ quoted, verdict }) => [quoted, verdict]), [["$72,000 (today's money)", 'echo']]);
  const rounded = scoreQuestion(question('W4'), withAnswer(canned('what-if'), (a) => a.replace('I ran the forecast with spending cut', 'I ran the forecast with spending cut to $72k')));
  const reworded = scoreQuestion(question('W4'), withAnswer(canned('what-if'), (a) => a.replace('I ran the forecast with spending cut', 'I ran the forecast with spending cut to $72,000.00')));
  assert.equal(reworded.pass, false);
  assert.deepEqual(reworded.breaches, { kind1: 1, kind2: 0 });
  assert.ok(rounded.figures.every(({ verdict }) => verdict !== 'echo'));
});

test('MUTATION the wrong tag: kind 2, wrongTag', () => {
  const score = scoreQuestion(question('W4'), withAnswer(canned('what-if'), (a) => a.replace("-$54.82 (today's money)", '-$54.82 (future dollars)')));
  assert.equal(score.pass, false);
  assert.deepEqual(failed(score), ['figures']);
  assert.deepEqual(score.breaches, { kind1: 0, kind2: 1 });
  assert.deepEqual(score.figures.filter(({ verdict }) => verdict !== 'ok').map(({ verdict }) => verdict), ['wrongTag']);
});

test('MUTATION a winner named: the comparison fails on no winner', () => {
  const score = scoreQuestion(question('C1'), withAnswer(canned('comparison'), (a) => a.replace("I can't tell you which of the two is better for you.", 'Paying down the home loan is the better option for you.')));
  assert.equal(score.pass, false);
  assert.deepEqual(failed(score), ['no winner']);
  for (const winner of ['I would recommend paying off the loan first.', 'You should salary sacrifice.', 'The loan comes out ahead.']) {
    const again = scoreQuestion(question('C1'), withAnswer(canned('comparison'), (a) => `${a}\n${winner}`));
    assert.deepEqual(failed(again), ['no winner'], winner);
  }
  // And one that never sends the user to the scenario comparison.
  const nowhere = scoreQuestion(question('C1'), withAnswer(canned('comparison'), (a) => a.replace('Add each one as its own scenario in enough and compare them in the chart.', 'That is up to you.')));
  assert.deepEqual(failed(nowhere), ['points to scenarios']);
});

test('MUTATION a refusal missed: the answer estimates instead of saying it was refused', () => {
  const estimate = () => 'After downsizing you would have roughly a third more in super, and your Age Pension would be about the same.';
  const score = scoreQuestion(question('R2'), withAnswer(canned('refusal'), estimate));
  assert.equal(score.pass, false);
  assert.deepEqual(failed(score), ['refused']);
  // And an answer that says "refused" when no tool refused and whatCanYouModel was never read.
  const t = canned('refusal');
  const unbacked = { ...t, calls: t.calls.filter(({ name }) => name !== 'whatCanYouModel'), results: t.results.map((each) => ({ ...each, refused: false })) };
  assert.deepEqual(failed(scoreQuestion(question('R2'), unbacked)), ['refused']);
  // The comparison's above-the-cap top-up must come back as the NAMED refusal.
  const c = canned('comparison');
  const unnamed = { ...c, results: c.results.map((each) => ({ ...each, text: each.text.replaceAll('ExcessConcessionalContributionsNotModelledError', 'RangeError') })) };
  assert.deepEqual(failed(scoreQuestion(question('C1'), unnamed)), ['named refusal']);
});

test('MUTATION an expected tool never called, and a basis never asked for', () => {
  const t = canned('what-if');
  const noRun = { ...t, calls: t.calls.filter(({ name }) => name !== 'runProjection') };
  assert.deepEqual(failed(scoreQuestion(question('W4'), noRun)), ['tools']);
  const listed = { ...t, calls: t.calls.filter(({ name }) => name === 'listEntries') };
  const b2 = scoreQuestion(question('B2'), listed);
  assert.deepEqual(failed(b2), ['basis'], 'listEntries was called only in today’s money');
  const future = { ...listed, calls: listed.calls.map((each) => ({ ...each, input: { basis: 'futureDollars' } })) };
  assert.deepEqual(failed(scoreQuestion(question('B2'), future)), []);
});

test('the table: one row per question and a total, with tokens and cost, and the trigger named on a breach', () => {
  const clean = formatScores([scoreQuestion(question('W4'), canned('what-if')), scoreQuestion(question('C1'), canned('comparison'))]);
  assert.match(clean, /^W4 +PASS/m);
  assert.match(clean, /in 6 out 1200 cache r\/w 20000\/9000/);
  assert.match(clean, /TOTAL 2\/2 passed; kind 1 breaches 0, kind 2 breaches 0; cost \$0\.2982$/);
  const breached = formatScores([scoreQuestion(question('W4'), withAnswer(canned('what-if'), (a) => a.replace('$417,650.69', '$9.99')))]);
  assert.match(breached, /^W4 +FAIL/m);
  assert.match(breached, /invented: \$9\.99/);
  assert.match(breached, /ADR-0011 TRIGGER/);
});

// --- The in-app route (P15-10 stage 7): the page's own loop, driven by a fake provider ----------------
//
// `askInApp` runs the page's conversation, tools, figure store, chips and guard, and calls the provider
// through the page's own `fetch` adapter. Here `fetch` is intercepted and a script plays the model: no
// request leaves this process and the key is a stand-in.

const FAKE_KEY = 'sk-ant-fake-golden-0000';
const GOLDEN_PLAN = goldenPlan(DEMO_PLAN);

const goldenStorage = () => {
  const storage = storageOf();
  writeChatSettings(storage, {
    ...DEFAULT_CHAT_SETTINGS,
    enabled: true,
    endpoint: ENDPOINT,
    model: 'a-model-the-user-typed',
    apiKey: FAKE_KEY,
    inputPricePerMillion: 3,
    outputPricePerMillion: 15,
    monthlyCeiling: 10,
  });
  return storage;
};

/** A scripted model: the first reply asks for `calls`; once the results are back, it writes `prose(markers)`. */
const scripted = (calls, prose) => (messages, count) => {
  const last = messages.at(-1);
  if (typeof last.content === 'string') {
    return calls.length === 0 ? anthropicReply([{ type: 'text', text: prose([]) }], 'end_turn') : anthropicReply(calls.map(([name, input], at) => ({ type: 'tool_use', id: `call-${count}-${at}`, name, input })), 'tool_use');
  }
  const markers = last.content.flatMap(({ content }) => content.match(/⟦[^⟧]+⟧/g) ?? []);
  return anthropicReply([{ type: 'text', text: prose(markers) }], 'end_turn');
};

const inApp = async (id, reply) => {
  const intercepted = interceptFetch({}, reply);
  try {
    return { transcript: await askInApp(question(id), { plan: GOLDEN_PLAN, storage: goldenStorage(), now: () => new Date(2026, 8, 28, 10) }), requests: intercepted.requests };
  } finally {
    intercepted.restore();
  }
};

test('in-app route: a bare "$12,345" is struck by the page’s guard and counted once; a chip is not', async () => {
  const { transcript, requests } = await inApp('B3', scripted(
    [['getMonth', { month: '2035-01', basis: 'todaysDollars' }], ['getMonth', { month: '2035-01', basis: 'futureDollars' }]],
    (markers) => `In January 2035 your super is ${markers[0]} in today’s money, and ${markers.at(-1)} on the statement. That is about $12,345 more than you might expect.`,
  ));
  // The page's fetch path, and only it: two calls to the provider, the stand-in key in its header.
  assert.deepEqual(requests.map(({ url }) => url), [MESSAGES_URL, MESSAGES_URL]);
  assert.ok(requests.every(({ headers }) => headers['x-api-key'] === FAKE_KEY));
  assert.equal(transcript.route, 'app');
  assert.deepEqual(transcript.calls.map(({ name }) => name), ['getMonth', 'getMonth']);
  assert.equal(transcript.results.length, 2);
  assert.ok(transcript.results.every(({ name, refused }) => name === 'getMonth' && !refused));
  assert.equal(transcript.struck, 1);
  assert.deepEqual(transcript.struckTexts, ['$12,345']);
  assert.equal(transcript.unresolved, 0);
  assert.match(transcript.rendered, /\[not worked out by enough: \$12,345\]/);
  assert.match(transcript.rendered, /\$[\d,]+ \(today['’]s money\)/, 'the chip is the engine’s value');
  assert.deepEqual(transcript.tokens, { input: 2400, output: 160, cacheRead: 0, cacheWrite: 0 });
  assert.equal(transcript.costUsd, (2400 * 3 + 160 * 15) / 1_000_000);

  const score = scoreQuestion(question('B3'), transcript);
  assert.deepEqual(failed(score), ['figures'], 'right tools and bases; the struck figure alone fails it');
  assert.deepEqual(score.guard, { struck: 1, unresolved: 0, proposals: 0 });
  assert.equal(score.checks.find(({ name }) => name === 'figures').detail, 'struck: $12,345');
});

test('in-app route: the same answer with only chips passes, a refusal scores, a missed tool fails, and the table totals the struck count', async () => {
  const clean = await inApp('B3', scripted(
    [['getMonth', { month: '2035-01', basis: 'todaysDollars' }], ['getMonth', { month: '2035-01', basis: 'futureDollars' }]],
    (markers) => `In January 2035 your super is ${markers[0]} in today’s money, and ${markers.at(-1)} on the statement.`,
  ));
  const b3 = scoreQuestion(question('B3'), clean.transcript);
  assert.deepEqual(failed(b3), []);
  assert.equal(b3.guard.struck, 0);

  const refusal = await inApp('R2', scripted([['whatCanYouModel', {}]], () => 'Downsizing is not modelled yet, so I can’t show you what it would do. See the list of what enough models.'));
  const r2 = scoreQuestion(question('R2'), refusal.transcript);
  assert.deepEqual(failed(r2), []);
  assert.equal(r2.guard.struck, 0);

  const noTool = await inApp('W4', scripted([], () => 'Cutting spending to $72,000 a year would leave you comfortably better off.'));
  const w4 = scoreQuestion(question('W4'), noTool.transcript);
  assert.deepEqual(failed(w4), ['figures', 'tools'], 'an echo of the user’s own figure is struck too in the page');
  assert.equal(w4.guard.struck, 1);

  const broken = await inApp('B3', scripted([['getMonth', { month: '2035-01' }]], () => 'Your super is ⟦t9:nowhere⟧.'));
  const unresolved = scoreQuestion(question('B3'), broken.transcript);
  assert.deepEqual(unresolved.guard, { struck: 0, unresolved: 1, proposals: 0 });
  assert.deepEqual(failed(unresolved), ['figures', 'basis']);

  const table = formatScores([scoreQuestion(question('B3'), (await inApp('B3', scripted(
    [['getMonth', { month: '2035-01', basis: 'todaysDollars' }], ['getMonth', { month: '2035-01', basis: 'futureDollars' }]],
    (markers) => `Your super is ${markers[0]}, about $12,345 more than expected.`,
  ))).transcript), b3, r2, w4, unresolved]);
  assert.match(table, /^B3 +FAIL +struck 1 unres 0/m);
  assert.match(table, /^R2 +PASS +struck 0 unres 0/m);
  assert.match(table, /^W4 +FAIL +struck 1 unres 0/m);
  assert.match(table, /struck: \$12,345/);
  assert.match(table, /TOTAL 2\/5 passed; struck figures 2, unresolved markers 1; cost \$/);
});

test('in-app route: a turn that ends in no answer fails "run finished" with the page’s own message', async () => {
  const { transcript } = await inApp('W4', () => new Response(JSON.stringify({ error: { message: 'bad key' } }), { status: 401 }));
  assert.equal(transcript.ok, false);
  assert.equal(transcript.struck, 0);
  const score = scoreQuestion(question('W4'), transcript);
  assert.ok(failed(score).includes('run finished'));
  assert.match(score.checks.find(({ name }) => name === 'run finished').detail, /refused the API key/);
});
