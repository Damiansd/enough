// plan_ai.md §2 rules 3, 4 and 5, §9 stage 4 — **the API key goes to the provider's endpoint and
// nowhere else, the model call never goes through enough's own server, and the chat on but unused
// changes no forecast byte.**
//
// `fetch` is intercepted for the whole of a realistic session with the chat on: the plan loaded from
// the local server (`store/files.ts`, the transport `main.ts` uses), a question asked, an entry added
// and saved through `savePlan`, a second question, a second save. Every request is recorded, headers
// and body, and every one is asserted on. The plan file, the save bodies and the export shape (the
// Working File's own shape, ADR-0008; the Export verb itself is deferred, P8-3) are searched for the
// key too.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';

import { toCents } from '../dist/core/money.js';
import { project } from '../dist/core/projection.js';
import { DEMO_ENTRIES, DEMO_HOUSEHOLD, DEMO_PLAN, DEMO_SETTINGS } from '../dist/app/demoHousehold.js';
import { loadPlanOrNone } from '../dist/app/loadPlan.js';
import { planWithEntry, savePlan, spendChangeEntry } from '../dist/app/planEdits.js';
import { scenarioWalks } from '../dist/app/scenarioWalks.js';
import { moneyBasis } from '../dist/app/todaysDollars.js';
import { readPlan, writePlan } from '../dist/store/files.js';
import { CHAT_STORAGE_KEY, DEFAULT_CHAT_SETTINGS, writeChatSettings } from '../dist/app/chat/chatSettings.js';
import { createConversation } from '../dist/app/chat/conversation.js';
// The interceptor is shared with the panel's session (`test/app-chat-panel.test.mjs`): every request
// served, the plan route from `disk` and the provider's from a script that asks for one month once
// and then answers with the first marker it was shown.
import { ENDPOINT, MESSAGES_URL, PAGE_ORIGIN, interceptFetch, storageOf } from './fixtures/chatFetch.mjs';

// A key no other text in this build could contain by accident.
const KEY = 'sk-ant-api03-TESTKEY-9f2c71d0e4b84a6cb5e3-NEVER-LEAVES-THE-BROWSER';
const MODEL = 'model-name-as-typed-3e81';

const CHAT_ON = {
  ...DEFAULT_CHAT_SETTINGS,
  enabled: true,
  endpoint: ENDPOINT,
  model: MODEL,
  apiKey: KEY,
  inputPricePerMillion: 3,
  outputPricePerMillion: 15,
  monthlyCeiling: 20,
};

// 2026-09-24: hashed without `closingNonSuperPortfolio`, the month table's Investments column. It is
// a balance the walk already held, now exposed, and it moves no figure (the same strip as
// core-death.test.mjs and core-illness-separation.test.mjs), so the pins below still prove the chat
// changes nothing.
// 2026-09-25: and without `assetsTestThresholds`, read off the entitlement the walk already computed — no figure.
const sha256 = (value) =>
  createHash('sha256')
    .update(JSON.stringify(value, (key, field) => (key === 'closingNonSuperPortfolio' || key === 'assetsTestThresholds' || key === 'concessionalCapByPerson' ? undefined : field)))
    .digest('hex');
// RE-PINNED 2026-09-24 (T135): the demo couple's assets excess now floors to the nearest $500
// (SSA 1991 s1064 point 1064-G7), so the Age Pension in a handful of the demo walk's months is a
// few cents to a few dollars higher — see `test/core-age-pension.test.mjs`'s T135 tests.
// RE-PINNED 2026-09-29 (LR-1 slice 2, the CGT reform from 1 July 2027): only the limb-3 `available`
// figure moved, in 94 months from 2027-08, every one DOWN. It is the whole-portfolio probe, and
// from 1 July 2027 the part of the gain after the stamp is indexed and never halved, so selling
// everything would cost more tax (32c a dollar at the demo's rate). Slice 2 moved no
// line: without Div 119 the demo's own sales in 2033 stay under the tax-free threshold.
// RE-PINNED 2026-09-29 (LR-1 slice 3, Div 119's minimum tax): the demo walk's lines moved from
// 2033-03 — see `app-chat-identity.test.mjs`'s copy of the re-pin for the mechanism and the figures.
// RE-PINNED 2026-09-29 (LR-1 slice 4): no figure moved. Dana's 11 `Income tax on capital gain` lines (2033-03 to 2035-05) each gained one `determination` entry, `CGT_MINIMUM_TAX_DETERMINATION`; a whole-walk diff finds those 11 and nothing else.
const DEMO_DIGEST = '806fab4f7571820896d81b56900400b22494a361327855fb0c3b271e2e0ecc81';

/** A load, a question, an edit and a save, a second question and a second save: the chat on throughout. */
const session = async () => {
  const disk = { plan: JSON.stringify(DEMO_PLAN, null, 2) };
  const storage = storageOf();
  writeChatSettings(storage, CHAT_ON);
  const { requests, restore } = interceptFetch(disk);
  // The page's own localStorage is this one, so any code that reaches for it finds the key.
  globalThis.localStorage = storage;
  try {
    const loaded = await loadPlanOrNone({ readPlan, writePlan });
    let plan = loaded.plan;
    const conversation = createConversation({ plan: () => plan, storage, pageOrigin: PAGE_ORIGIN, now: () => new Date(2026, 8, 24) });
    const basis = moneyBasis('todaysDollars', plan.settings);
    const first = await conversation.ask('When does our money run short?', basis);
    const edited = planWithEntry(plan, spendChangeEntry({ date: '2031-01-01', owner: 'household', note: '', annualSpend: '65000' }, 'chat-test-spend', '2026-09-24'));
    plan = (await savePlan({ writePlan }, edited)).plan;
    const second = await conversation.ask('And now?', basis);
    plan = (await savePlan({ writePlan }, planWithEntry(plan, spendChangeEntry({ date: '2033-01-01', owner: 'household', note: '', annualSpend: '60000' }, 'chat-test-spend-2', '2026-09-24')))).plan;
    return { requests, disk, loaded, plan, storage, answers: [first, second] };
  } finally {
    restore();
    delete globalThis.localStorage;
  }
};

test('the session is real: it loaded, asked twice through the provider, and saved twice', async () => {
  const { requests, answers, disk, plan } = await session();
  assert.deepEqual(answers.map(({ kind }) => kind), ['answer', 'answer']);
  for (const { reply } of answers) assert.equal(reply.segments.filter(({ kind }) => kind === 'chip').length, 1);
  assert.equal(requests.filter(({ url }) => url === MESSAGES_URL).length, 4);
  assert.equal(requests.filter(({ url, method }) => url === '/api/plan' && method === 'GET').length, 1);
  assert.equal(requests.filter(({ url, method }) => url === '/api/plan' && method === 'PUT').length, 2);
  assert.ok(JSON.parse(disk.plan).entries.some(({ id }) => id === 'chat-test-spend-2'));
  assert.ok(plan.entries.some(({ id }) => id === 'chat-test-spend'));
});

test('(c) no request to the local server carries the key, in any header or in the body', async () => {
  const { requests } = await session();
  const local = requests.filter(({ url }) => !/^https?:\/\//.test(url) || new URL(url).origin === PAGE_ORIGIN);
  assert.equal(local.length, 3, 'the local server was asked something other than one load and two saves');
  for (const request of local) {
    assert.ok(!JSON.stringify(request.headers).includes(KEY), `${request.method} ${request.url} carries the key in a header`);
    assert.ok(!request.body.includes(KEY), `${request.method} ${request.url} carries the key in its body`);
    assert.ok(!Object.hasOwn(request.headers, 'x-api-key'), `${request.method} ${request.url} has an x-api-key header`);
    // The chat's other settings stay in the browser too.
    assert.ok(!request.body.includes(MODEL) && !request.body.includes(CHAT_STORAGE_KEY), `${request.method} ${request.url} carries the chat's settings`);
  }
});

test('the model call goes straight to the provider, never through the local server: every request with the key is to the endpoint', async () => {
  const { requests } = await session();
  const keyed = requests.filter((request) => JSON.stringify(request).includes(KEY));
  assert.equal(keyed.length, 4);
  for (const request of keyed) {
    assert.equal(request.url, MESSAGES_URL);
    assert.equal(request.method, 'POST');
    assert.equal(request.headers['x-api-key'], KEY);
    assert.equal(request.headers['anthropic-dangerous-direct-browser-access'], 'true');
    assert.ok(!request.body.includes(KEY), 'the key is in the request body, not only its header');
  }
  // Every request is either the local server's plan route or the provider's messages route.
  assert.deepEqual([...new Set(requests.map(({ url }) => url))].sort(), ['/api/plan', MESSAGES_URL].sort());
});

test('(a) the PlanFile and (b) the export shape never hold the key or any chat setting', async () => {
  const { loaded, plan, disk } = await session();
  for (const [label, text] of [
    ['the loaded PlanFile', JSON.stringify(loaded.plan)],
    ['the PlanFile after two saves', JSON.stringify(plan)],
    ['plan.json as written', disk.plan],
    ['the export shape', JSON.stringify(plan, null, 2)],
  ]) {
    assert.ok(!text.includes(KEY), `${label} holds the key`);
    assert.ok(!text.includes(MODEL), `${label} holds the model name`);
    assert.doesNotMatch(text, /apiKey|x-api-key|enough\.chat|monthlyCeiling|PricePerMillion/, `${label} holds a chat setting's name`);
  }
  // Field by field: the plan's own top-level fields, and nothing added to them.
  assert.deepEqual(Object.keys(JSON.parse(disk.plan)).sort(), Object.keys(DEMO_PLAN).sort());
  assert.deepEqual(Object.keys(JSON.parse(disk.plan).settings).sort(), Object.keys(DEMO_PLAN.settings).sort());
});

test('the key, the settings and the spend live under one localStorage key, and nothing else is stored', async () => {
  const { storage } = await session();
  assert.deepEqual([...storage.items.keys()], [CHAT_STORAGE_KEY]);
  const stored = JSON.parse(storage.items.get(CHAT_STORAGE_KEY));
  assert.deepEqual(Object.keys(stored).sort(), ['settings', 'spend', 'version']);
  assert.equal(stored.settings.apiKey, KEY);
  assert.equal(stored.spend.month, '2026-09');
  // Four responses at 1,200 in and 80 out, at $3 and $15 a million.
  assert.ok(Math.abs(stored.spend.dollars - 4 * (1200 * 3 + 80 * 15) / 1e6) < 1e-12);
});

// --- Chat off, and chat on but unused: every forecast byte-identical -------------------------------

// SYNTHETIC: the fd02679 fixture (`test/app-chat-get-month.test.mjs`), copied, and pinned to its hash
// below so the copy cannot drift. It reaches every named line kind.
const RICH = {
  version: DEMO_PLAN.version,
  settings: {
    asAtDate: '2026-09-01',
    planningHorizonAge: 72,
    economicSeries: { cpi: 0.025, pblci: 0.025, awote: 0.035, mtawe: 0.035 },
    deemingRates: { lower: 0.0175, upper: 0.0375 },
    nominalReturn: 0.065,
    investmentPayoutRate: 0.02,
    investmentPayoutFrankedShare: 0.5,
    superIncomeYieldRate: 0.03,
    superIncomeYieldFrankedShare: 0.1,
  },
  household: {
    persons: [
      {
        name: 'Wilhelmina Quartermaine',
        dateOfBirth: '1964-01-01',
        superInterests: [
          { phase: 'accumulation', balance: toCents(300_000), statedAdministrationFeePerYear: toCents(125), statedInvestmentFeeRate: 0.005 },
          { phase: 'ttr', balance: toCents(200_000), statedStreamSettings: { commencementDay: '2025-07-01', statedTtrDrawdownRate: 0.07 } },
        ],
        parcels: [{ acquired: '2014-03-11', costBase: toCents(38_000), marketValue: toCents(96_500) }],
        employmentIncomePerFortnight: toCents(3_000),
        workBonusBalance: toCents(0),
      },
      {
        name: 'Bartholomew Fenwick-Oyelaran',
        dateOfBirth: '1959-04-03',
        superInterests: [
          { phase: 'accumulation', balance: toCents(100_000) },
          { phase: 'accountBasedPension', balance: toCents(150_000), statedStreamSettings: { commencementDay: '2022-08-01' } },
        ],
        parcels: [{ acquired: '2016-03-11', costBase: toCents(20_000), marketValue: toCents(30_000) }],
        employmentIncomePerFortnight: toCents(0),
        workBonusBalance: toCents(0),
      },
    ],
    homeStatus: 'occupied',
    openingOffsetBalance: toCents(60_000),
  },
  entries: [
    ['spend', 'SPEND_CHANGE', '2026-09-01', 'household', { annualSpend: toCents(70_000) }],
    ['sac', 'SUPER_CONTRIBUTION', '2026-09-01', 'personA', { kind: 'salarySacrificed', annualAmount: toCents(8_000), interestIndex: 0 }],
    ['sac-stop', 'SUPER_CONTRIBUTION', '2027-09-01', 'personA', { kind: 'stopped' }],
    ['spouse', 'SPOUSE_CONTRIBUTION', '2026-11-01', 'personA', { amount: toCents(3_000), receivingInterestIndex: 0 }],
    ['sell', 'NON_SUPER_INVESTMENT', '2027-03-01', 'personA', { direction: 'sell', amount: toCents(10_000) }],
    ['buy', 'NON_SUPER_INVESTMENT', '2027-05-01', 'personB', { direction: 'buy', amount: toCents(5_000), incidentalCostsOfAcquisition: toCents(20) }],
    ['retire-a', 'RETIRE', '2028-01-01', 'personA', {}],
    ['lump', 'LUMP_SUM_FROM_SUPER', '2029-02-01', 'personA', { amount: toCents(5_000), interestIndex: 0 }],
  ].map(([id, type, date, owner, params]) => ({ id, date, owner, type, params, enabled: true, createdAt: '2026-08-20' })),
};
RICH.scenarios = [{ id: 'base', name: 'Base', parentId: null, entryIds: RICH.entries.map(({ id }) => id) }];
RICH.activeScenarioId = 'base';
// RE-PINNED 2026-09-24 (T135): this fixture crosses the assets-test free area, so its excess now
// floors to the nearest $500 (SSA 1991 s1064 point 1064-G7) — see `app-chat-identity.test.mjs`.
// RE-PINNED 2026-09-25 (P3-17 slice 4): Wilhelmina's accumulation fee now rises with wages before
// her RETIRE and with CPI after it, not CPI throughout — see `app-chat-get-month.test.mjs`'s copy.
// RE-PINNED 2026-09-29 (LR-1 slice 2): only the limb-3 `available` probe moved, in 41 months from
// 2027-08 (29 down; 12 up, each July-to-November after a June distribution, which since the reform
// lowers the fully-taxed later part rather than the half-taxed deferred one). No line moved.
// RE-PINNED 2026-09-29 (LR-1 slice 3, Div 119's minimum tax): RICH moved only in the limb-3
// `available` probe again, DOWN in 36 months from 2028-01 (after Wilhelmina's RETIRE, selling
// everything would now pay the minimum tax). No line moved.
// RE-PINNED 2026-09-30 (LR-3, low income super tax offset): no figure moved. Wilhelmina qualifies for
// 81000 cents for FY2027-28, and her only account is a pension by July 2028 (her RETIRE), so one
// `low income super tax offset not paid` note is inserted in 2028-07; a whole-walk diff finds that note
// (and the later notes of that month shifted one place) and nothing else.
// RE-PINNED 2026-09-30 (P3-4b): caveat text only on RICH's sacrifice credit lines; proved in `app-chat-identity.test.mjs`.
const RICH_DIGEST = 'c3f7baeaaf79630cee30383e43d37b3687910e3d031d8a87af36a3db81fc5c0b';

/** The plan loaded as the page loads it, with the chat as `settings` says, a conversation made and never asked, then walked. */
const forecastWith = async (stored, settings) => {
  const storage = storageOf();
  if (settings !== undefined) writeChatSettings(storage, settings);
  const { requests, restore } = interceptFetch({ plan: JSON.stringify(stored) });
  globalThis.localStorage = storage;
  try {
    const { plan } = await loadPlanOrNone({ readPlan, writePlan });
    createConversation({ plan: () => plan, storage, pageOrigin: PAGE_ORIGIN, now: () => new Date(2026, 8, 24) });
    assert.deepEqual(requests.map(({ url }) => url), ['/api/plan'], 'an unused chat made a request');
    return { direct: sha256(project(plan.settings, plan.household, plan.entries)), walks: sha256([...scenarioWalks(plan).byScenarioId]) };
  } finally {
    restore();
    delete globalThis.localStorage;
  }
};

test('with the chat off (the default) and with it on but unused, every forecast is byte-identical', async () => {
  // The pinned digests, as every other suite pins them: the copy above is the fd02679 fixture.
  assert.equal(sha256(project(DEMO_SETTINGS, DEMO_HOUSEHOLD, DEMO_ENTRIES)), DEMO_DIGEST);
  assert.equal(sha256(project(RICH.settings, RICH.household, RICH.entries)), RICH_DIGEST);
  for (const [label, stored, digest] of [['the demo plan', DEMO_PLAN, DEMO_DIGEST], ['the fd02679 fixture', RICH, RICH_DIGEST]]) {
    const none = await forecastWith(stored, undefined);
    const off = await forecastWith(stored, DEFAULT_CHAT_SETTINGS);
    const on = await forecastWith(stored, CHAT_ON);
    assert.equal(none.direct, digest, `${label}: loaded with nothing stored`);
    assert.equal(off.direct, digest, `${label}: the chat off`);
    assert.equal(on.direct, digest, `${label}: the chat on, unused`);
    assert.equal(off.walks, none.walks, `${label}: every scenario's walk, the chat off`);
    assert.equal(on.walks, none.walks, `${label}: every scenario's walk, the chat on`);
  }
});
