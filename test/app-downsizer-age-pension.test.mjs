// P9-6 — "What does this cost in Age Pension?" beside a DOWNSIZER_CONTRIBUTION row: the scenario
// walked with and without the entry, one sentence in today's whole dollars. Synthetic household:
// Sam, 70, sells for $900,000 with $400,000 set aside (exempt) and moves $200,000 of it into super
// (assessable), so the contribution genuinely costs Age Pension.
import test from 'node:test';
import assert from 'node:assert/strict';

import { downsizerAgePension, downsizerAgePensionSentence } from '../dist/app/downsizerAgePension.js';
import { validatedPlan } from '../dist/app/planEdits.js';
import { formatDollars } from '../dist/app/displayMoney.js';
import { AGE_PENSION_LINE, project } from '../dist/core/projection.js';
import { priceLevelFactor } from '../dist/core/priceLevel.js';
import { mulCents } from '../dist/core/money.js';
import { DEMO_PLAN } from '../dist/app/demoHousehold.js';

const person = (name, dateOfBirth, superBalance) => ({ name, dateOfBirth, superInterests: [{ phase: 'accumulation', balance: superBalance }], parcels: [], employmentIncomePerFortnight: 0, workBonusBalance: 0 });
const entry = (id, type, date, params, owner = 'household') => ({ id, date, owner, type, params, enabled: true, createdAt: '2026-06-01' });
const SETTINGS = {
  asAtDate: '2026-10-16',
  planningHorizonAge: 80,
  economicSeries: { cpi: 0.025, pblci: 0.025, awote: 0.035, mtawe: 0.035 },
  deemingRates: { lower: 0.0175, upper: 0.0375 },
  nominalReturn: 0.065,
  cashInterestRate: 0,
};
const DOWN = entry('down', 'DOWNSIZER_CONTRIBUTION', '2027-01-01', { amount: 20_000_000, receivingInterestIndex: 0, statedOwnedTenYears: true }, 'personA');
const PLAN = validatedPlan({
  ...DEMO_PLAN,
  settings: SETTINGS,
  household: { persons: [person('Sam', '1956-03-01', 5_000_000)], homeStatus: 'occupied', openingOffsetBalance: 10_000_000 },
  entries: [
    entry('spend', 'SPEND_CHANGE', '2026-11-01', { annualSpend: 4_000_000 }),
    entry('sell', 'SELL_HOME', '2026-11-01', { salePrice: 90_000_000, newHomeAmount: 40_000_000 }),
    DOWN,
  ],
  scenarios: [{ id: 'root', name: 'Baseline', parentId: null, entryIds: ['spend', 'sell', 'down'] }],
  activeScenarioId: 'root',
}).plan;

const today = (cents, month) => mulCents(cents, 1 / priceLevelFactor(SETTINGS.economicSeries.cpi, SETTINGS.asAtDate, month));
const pensionToday = (months) => months.reduce((sum, month) => sum + today(month.lines.filter((line) => line.description === AGE_PENSION_LINE).reduce((one, line) => one + line.amount, 0), month.month), 0);
const pensionNominal = (months) => months.reduce((sum, month) => sum + month.lines.filter((line) => line.description === AGE_PENSION_LINE).reduce((one, line) => one + line.amount, 0), 0);

test('two walks, the entry on in one and off in the other; the differences in today’s money', () => {
  const calls = [];
  const walk = (settings, household, entries) => {
    calls.push(entries.find((one) => one.id === 'down').enabled);
    return project(settings, household, entries);
  };
  const cost = downsizerAgePension(PLAN, 'down', walk);
  assert.deepEqual(calls.sort(), [false, true]);

  const withIt = project(PLAN.settings, PLAN.household, PLAN.entries);
  const withoutIt = project(PLAN.settings, PLAN.household, PLAN.entries.filter((one) => one.id !== 'down'));
  const lastWith = withIt.at(-1);
  const lastWithout = withoutIt.at(-1);
  assert.equal(cost.amount, 20_000_000);
  assert.equal(cost.agePensionLost, pensionToday(withoutIt) - pensionToday(withIt));
  assert.equal(cost.superGained, today(lastWith.superBalance, lastWith.month) - today(lastWithout.superBalance, lastWithout.month));
  // The direction of this fixture: exempt set-aside into assessable super costs pension, adds super.
  assert.ok(cost.agePensionLost > 0 && cost.superGained > 0);
  // And today's money is not the nominal figure.
  assert.notEqual(cost.agePensionLost, pensionNominal(withoutIt) - pensionNominal(withIt));
  assert.notEqual(cost.superGained, lastWith.superBalance - lastWithout.superBalance);
});

test('the sentence: today’s whole dollars, and "more"/"less" by sign', () => {
  const cost = downsizerAgePension(PLAN, 'down');
  const sentence = downsizerAgePensionSentence(cost);
  assert.equal(
    sentence,
    `Moving $200,000 into super: ${formatDollars(cost.agePensionLost)} less Age Pension in total over the plan, and ${formatDollars(cost.superGained)} more in super at the end.`,
  );
  assert.doesNotMatch(sentence, /\bshould\b|\brecommend|\badvi[sc]e|\.\d\d\b/i);

  assert.equal(
    downsizerAgePensionSentence({ amount: 10_000_000, agePensionLost: -123_456, superGained: -7_890_049 }),
    'Moving $100,000 into super: $1,235 more Age Pension in total over the plan, and $78,900 less in super at the end.',
  );
  assert.equal(
    downsizerAgePensionSentence({ amount: 10_000_000, agePensionLost: 0, superGained: 0 }),
    'Moving $100,000 into super: $0 less Age Pension in total over the plan, and $0 more in super at the end.',
  );
});

test('refused: an id that is not a downsizer, and a downsizer switched off', () => {
  assert.throws(() => downsizerAgePension(PLAN, 'sell'), /not a DOWNSIZER_CONTRIBUTION/);
  const off = { ...PLAN, entries: PLAN.entries.map((one) => (one.id === 'down' ? { ...one, enabled: false } : one)) };
  assert.throws(() => downsizerAgePension(off, 'down'), /switched off/);
});
