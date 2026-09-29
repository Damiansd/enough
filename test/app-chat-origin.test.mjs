// P15-13, plan_ai.md §7.3 and §9 stage 5, ADR-0006 — **the turn behind an accepted suggestion is
// saved on each entry it adds, as `origin`; nothing else of the conversation is.**
//
// What must hold, each asserted below:
//   1. A plan with no `origin` anywhere loads and re-saves BYTE-IDENTICALLY — the bytes are pinned
//      as the build before P15-13 wrote them (sha256 of `JSON.stringify(parsePlan(file), null, 2)`,
//      the store's own serialisation, measured on that build at a398b71).
//   2. The parse door reads `origin` field by field and refuses a malformed one by name and path.
//   3. `origin` moves no figure: the walk of a plan with an origin on every entry is the walk
//      without, and the golden fixture's walk with origins added is byte-identical.
//   4. `origin` is never given back to the model: `listEntries`, `proposeEntries` and
//      `runProjection` return the same text with and without it.
//   5. Accept records it on every entry it adds, and only when the panel hands one in; Reject
//      writes nothing (the panel's own Reject test, `test/app-chat-panel.test.mjs`, drives the page).
import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { project } from '../dist/core/projection.js';
import {
  ORIGIN_MODEL_MAX,
  ORIGIN_QUESTION_MAX,
  ORIGIN_REPLY_MAX,
  PlanFileDateError,
  PlanFileEntryError,
  parsePlan,
} from '../dist/core/parsePlan.js';
import { DEMO_PLAN } from '../dist/app/demoHousehold.js';
import { listEntries } from '../dist/app/chat/tools/listEntries.js';
import { proposeEntries } from '../dist/app/chat/tools/proposeEntries.js';
import { runProjection } from '../dist/app/chat/tools/runProjection.js';
import { createReviewQueue } from '../dist/app/chat/reviewQueue.js';
import { NOT_WORKED_OUT_BY_ENOUGH, NO_SUCH_FIGURE, replyText } from '../dist/app/chat/chips.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const FIXTURE = readFileSync(join(ROOT, 'fixtures', 'demo-couple.plan.json'), 'utf8');

const sha256 = (text) => createHash('sha256').update(text).digest('hex');
/** The bytes the store writes (`store/files.ts`: `JSON.stringify(body, null, 2)`). */
const saved = (plan) => JSON.stringify(plan, null, 2);
const reloaded = (text) => parsePlan(JSON.parse(text));

const ORIGIN = Object.freeze({
  question: 'ORIGIN-SENTINEL-question: what if we spend less from 2060?',
  reply: 'ORIGIN-SENTINEL-reply: spending falls by $4,000 (today’s money) a year.',
  model: 'ORIGIN-SENTINEL-model',
  date: '2026-09-28T03:14:15.926Z',
});

const withOrigins = (plan) => ({ ...plan, entries: plan.entries.map((entry) => ({ ...entry, origin: { ...ORIGIN } })) });

const thrown = (fn) => {
  try {
    fn();
  } catch (error) {
    return error;
  }
  return assert.fail('nothing was thrown');
};

// --- 1. Absent: byte-identical ----------------------------------------------------------------------

test('a plan with no origin re-saves to the bytes the build before P15-13 wrote, and a second load and save changes nothing', () => {
  const cases = [
    // `fixtures/demo-couple.plan.json`: the golden fixture, as the page would save it after loading it.
    ['fixture', FIXTURE, '190556f054ff7b93af78577e17059468bb84ac65bcfef1749c46f2c9f5d7be6a'],
    // The demo plan as it goes to disk on first run.
    ['demo', JSON.stringify(DEMO_PLAN), '5af3612064f18af067944bca107403b069bdce7f37360bf757519baeef76a39f'],
  ];
  for (const [name, text, before] of cases) {
    assert.ok(!text.includes('"origin"'), `${name}: the input already carries an origin, so this proves nothing`);
    const once = saved(reloaded(text));
    assert.equal(sha256(once), before, `${name}: a plan with no origin now saves different bytes`);
    assert.equal(saved(reloaded(once)), once, `${name}: a second load and save moved a byte`);
    assert.ok(!once.includes('"origin"'), `${name}: the door invented an origin key`);
  }
});

test('a plan WITH an origin loads, keeps it field for field, and re-saves byte-identically', () => {
  // Once through the door first: the store writes what `parsePlan` returned (`savePlan`), in its key order.
  const text = saved(reloaded(saved(withOrigins(reloaded(FIXTURE)))));
  const loaded = reloaded(text);
  assert.ok(loaded.entries.length > 0);
  for (const entry of loaded.entries) assert.deepEqual(entry.origin, ORIGIN);
  assert.equal(saved(loaded), text);
});

// --- 2. The door ------------------------------------------------------------------------------------

test('the door refuses a malformed origin by name, at the field’s own path', () => {
  const refusal = (origin) => {
    const file = JSON.parse(FIXTURE);
    file.entries[0].origin = origin;
    return thrown(() => parsePlan(file));
  };
  const cases = [
    [null, PlanFileEntryError, /entries\[0\]\.origin is null, and an object was required/],
    ['a string', PlanFileEntryError, /entries\[0\]\.origin is string/],
    [[ORIGIN], PlanFileEntryError, /entries\[0\]\.origin is an array/],
    [{ ...ORIGIN, extra: 1 }, PlanFileEntryError, /entries\[0\]\.origin carries "extra"/],
    [{ ...ORIGIN, question: undefined }, PlanFileEntryError, /entries\[0\]\.origin\.question is undefined/],
    [{ ...ORIGIN, reply: 42 }, PlanFileEntryError, /entries\[0\]\.origin\.reply is number 42, and a string was required/],
    [{ ...ORIGIN, model: undefined }, PlanFileEntryError, /entries\[0\]\.origin\.model is undefined/],
    [{ ...ORIGIN, question: '   ' }, PlanFileEntryError, /entries\[0\]\.origin\.question is empty/],
    [{ ...ORIGIN, model: '' }, PlanFileEntryError, /entries\[0\]\.origin\.model is empty/],
    [{ ...ORIGIN, question: 'q'.repeat(ORIGIN_QUESTION_MAX + 1) }, PlanFileEntryError, new RegExp(`origin\\.question is ${ORIGIN_QUESTION_MAX + 1} characters, and at most ${ORIGIN_QUESTION_MAX}`)],
    [{ ...ORIGIN, reply: 'r'.repeat(ORIGIN_REPLY_MAX + 1) }, PlanFileEntryError, new RegExp(`origin\\.reply is ${ORIGIN_REPLY_MAX + 1} characters`)],
    [{ ...ORIGIN, model: 'm'.repeat(ORIGIN_MODEL_MAX + 1) }, PlanFileEntryError, new RegExp(`origin\\.model is ${ORIGIN_MODEL_MAX + 1} characters`)],
    [{ ...ORIGIN, date: '2026-09-28' }, PlanFileDateError, /entries\[0\]\.origin\.date is "2026-09-28", which is not an ISO 8601 UTC timestamp/],
    [{ ...ORIGIN, date: '2026-02-30T00:00:00.000Z' }, PlanFileDateError, /origin\.date is "2026-02-30T00:00:00\.000Z"/],
    [{ ...ORIGIN, date: '2026-09-28T03:14:15.926+10:00' }, PlanFileDateError, /origin\.date/],
    [{ ...ORIGIN, date: 1_759_000_000_000 }, PlanFileEntryError, /origin\.date is number/],
  ];
  for (const [origin, Kind, message] of cases) {
    const error = refusal(origin);
    assert.ok(error instanceof Kind, `${JSON.stringify(origin)?.slice(0, 80)}: ${error.constructor.name} ${error.message}`);
    assert.match(error.message, message);
  }
});

test('the bounds are inclusive, and an empty reply is a reply', () => {
  const file = JSON.parse(FIXTURE);
  file.entries[0].origin = { question: 'q'.repeat(ORIGIN_QUESTION_MAX), reply: 'r'.repeat(ORIGIN_REPLY_MAX), model: 'm'.repeat(ORIGIN_MODEL_MAX), date: ORIGIN.date };
  file.entries[1].origin = { ...ORIGIN, reply: '' };
  const loaded = parsePlan(file);
  assert.equal(loaded.entries[0].origin.reply.length, ORIGIN_REPLY_MAX);
  assert.equal(loaded.entries[1].origin.reply, '');
});

// --- 3. No figure moves -----------------------------------------------------------------------------

test('an origin on every entry moves no figure: the walk is byte-identical, on the golden fixture and the demo', () => {
  for (const plan of [reloaded(FIXTURE), DEMO_PLAN]) {
    const bare = project(plan.settings, plan.household, plan.entries);
    const withOrigin = reloaded(saved(withOrigins(plan)));
    assert.ok(withOrigin.entries.every(({ origin }) => origin !== undefined));
    const walked = project(withOrigin.settings, withOrigin.household, withOrigin.entries);
    assert.ok(bare.length > 400);
    assert.equal(sha256(JSON.stringify(walked)), sha256(JSON.stringify(bare)));
  }
});

// --- 4. Never back to the model ---------------------------------------------------------------------

test('listEntries, proposeEntries and runProjection say exactly the same with and without origins, and never the origin’s text', () => {
  const bare = DEMO_PLAN;
  const withOrigin = reloaded(saved(withOrigins(DEMO_PLAN)));
  const draft = { date: '2060-01-01', owner: 'household', type: 'SPEND_CHANGE', params: { annualSpend: 5_500_000 }, enabled: true, createdAt: '2026-09-24' };
  const calls = [
    ['listEntries', (plan) => listEntries(plan)],
    ['listEntries futureDollars', (plan) => listEntries(plan, { basis: 'futureDollars' })],
    ['proposeEntries', (plan) => proposeEntries(plan, { add: [draft], disable: [plan.entries[0].id] })],
    ['runProjection', (plan) => runProjection(plan, { add: [draft] })],
  ];
  for (const [name, call] of calls) {
    const out = call(withOrigin);
    assert.ok(!/refused/.test(out.slice(0, 40)), `${name} refused, so the comparison proves nothing: ${out.slice(0, 200)}`);
    assert.equal(out, call(bare), `${name} changed when the entries carry an origin`);
    assert.doesNotMatch(out, /ORIGIN-SENTINEL|"origin"/, `${name} gave the origin back to the model`);
  }
});

// --- 5. Accept records it; Reject writes nothing ----------------------------------------------------

const TWO_ADDS = {
  add: [
    { date: '2060-01-01', owner: 'household', type: 'SPEND_CHANGE', params: { annualSpend: 5_500_000 }, enabled: true, createdAt: '2026-09-24' },
    { date: '2061-01-01', owner: 'household', type: 'SPEND_CHANGE', params: { annualSpend: 5_000_000 }, enabled: true, createdAt: '2026-09-24' },
  ],
};

const acceptOnce = async (origin) => {
  const queue = createReviewQueue();
  const item = queue.add(DEMO_PLAN, { whatIf: TWO_ADDS });
  assert.ok(item !== undefined, 'the proposal was not queued');
  const candidates = [];
  let n = 0;
  const outcome = await queue.accept(item.id, {
    plan: DEMO_PLAN,
    save: async (candidate) => {
      candidates.push(candidate);
      return true;
    },
    newId: () => `accepted-${++n}`,
    today: '2026-09-28',
    ...(origin === undefined ? {} : { origin }),
  });
  assert.deepEqual(outcome, { kind: 'saved' });
  assert.equal(candidates.length, 1);
  return candidates[0].entries.filter(({ id }) => id.startsWith('accepted-'));
};

test('Accept records the origin on EVERY entry it adds, and the candidate passes the door with it', async () => {
  const added = await acceptOnce(ORIGIN);
  assert.equal(added.length, 2);
  for (const entry of added) assert.deepEqual(entry.origin, ORIGIN);
});

test('Accept with no origin handed in adds entries with no origin key at all', async () => {
  const added = await acceptOnce(undefined);
  assert.equal(added.length, 2);
  for (const entry of added) assert.ok(!Object.hasOwn(entry, 'origin'));
});

test('Reject calls nothing and leaves the plan it was given untouched', () => {
  const queue = createReviewQueue();
  const before = saved(DEMO_PLAN);
  const item = queue.add(DEMO_PLAN, { whatIf: TWO_ADDS });
  queue.reject(item.id);
  assert.deepEqual(queue.items(), []);
  assert.equal(saved(DEMO_PLAN), before);
});

// --- The reply as plain text ------------------------------------------------------------------------

test('replyText writes each chip as the value and basis shown, and marks what the page marks', () => {
  const reply = {
    segments: [
      { kind: 'text', text: 'Spending falls by ' },
      { kind: 'chip', marker: '⟦t1:x⟧', dollars: '$4,000', tag: 'today’s money', href: '#month-2060-01' },
      { kind: 'text', text: ', not ' },
      { kind: 'struck', text: '$62k', reason: 'dollar' },
      { kind: 'text', text: '; and ' },
      { kind: 'noSuchFigure' },
      { kind: 'text', text: '.' },
    ],
  };
  assert.equal(replyText(reply), `Spending falls by $4,000 (today’s money), not [${NOT_WORKED_OUT_BY_ENOUGH}: $62k]; and [${NO_SUCH_FIGURE}].`);
});
