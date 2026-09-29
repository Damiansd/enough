// Whole dollars wherever the page DISPLAYS money, and the exact cents wherever it is TYPED BACK
// (user ruling, 2026-09-24: "I don't need the specificity of seeing cents anywhere in this interface").
//
//   §1 ONE rounding site (`roundToDollar`), halves AWAY FROM ZERO, and every display surface agrees
//      with it on the same figure — the axis, the tooltip, the month table, the entry table, a note.
//   §2 No text the page shows carries a cents figure (`/\$[\d,]+\.\d\d\b/`): every row of the demo
//      walk in both money views and both asset views, every entry row, every headline, every string
//      an app module exports, and the static page.
//   §3 An edit box is NOT rounded: a plan holding cents in every money box it has comes back from
//      the boxes byte-identical, so opening and saving without a change never alters the plan.
//
// The connector (`src/app/chat/tools/`) is out of scope and is not swept.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { project } from '../dist/core/projection.js';
import { parsePlan } from '../dist/core/parsePlan.js';
import { sustainableSpend } from '../dist/core/sustainableSpend.js';
import { DEMO_PLAN } from '../dist/app/demoHousehold.js';
import { formatDollars, roundToDollar, wholeDollarsIn } from '../dist/app/displayMoney.js';
import { formatAxisTick, tooltipLabel } from '../dist/app/chartConfig.js';
import { HOUSEHOLD_ASSETS, lineRow, monthsToRows, noteRow, personLabels } from '../dist/app/monthToRows.js';
import { entrySummary } from '../dist/app/entryForm.js';
import { incomeHeadline } from '../dist/app/incomeHeadline.js';
import { mortgageHeadline, mortgageTargetHeadlines } from '../dist/app/mortgageHeadline.js';
import { sustainableSpendHeadline } from '../dist/app/sustainableSpendHeadline.js';
import { moneyBasis } from '../dist/app/todaysDollars.js';
import {
  centsToDollars,
  planWithSettings,
  planWithStatedPosition,
  positionFormValues,
  settingsFormValues,
} from '../dist/app/planEdits.js';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const CENTS_FIGURE = /\$[\d,]+\.\d\d\b/;

/** Every string reachable from `value`, with where it was found. */
const stringsIn = function* (value, path = '$', seen = new Set()) {
  if (typeof value === 'string') {
    yield [path, value];
    return;
  }
  if (value === null || typeof value !== 'object' || seen.has(value)) return;
  seen.add(value);
  for (const [key, item] of Object.entries(value)) yield* stringsIn(item, `${path}.${key}`, seen);
};

const centsFound = (where, value) =>
  [...stringsIn(value, where)].filter(([, text]) => CENTS_FIGURE.test(text)).map(([path, text]) => `${path}: ${text.match(CENTS_FIGURE)[0]}`);

// --- §1 One rounding site ------------------------------------------------------------------------

test('roundToDollar: to the NEAREST dollar, halves away from zero, and never -0', () => {
  const cases = [
    [0, 0], [49, 0], [50, 100], [149, 100], [150, 200], [250, 300], [129_119_323, 129_119_300], [129_119_350, 129_119_400],
    [-49, 0], [-50, -100], [-150, -200], [-250, -300], [-1_234_56, -1_235_00],
  ];
  for (const [cents, rounded] of cases) assert.ok(Object.is(roundToDollar(cents), rounded), `${cents} → ${roundToDollar(cents)}, expected ${rounded}`);
});

test('formatDollars: "$1,291,193" — the sign, the separators and no cents', () => {
  assert.equal(formatDollars(129_119_323), '$1,291,193');
  assert.equal(formatDollars(-1_234_56), '-$1,235');
  assert.equal(formatDollars(0), '$0');
  assert.equal(formatDollars(-40), '$0', 'a figure that rounds to nothing is $0, never -$0');
  assert.equal(formatDollars(99_950), '$1,000');
});

test('wholeDollarsIn: a figure inside an engine sentence is printed through the same formatter', () => {
  assert.equal(
    wholeDollarsIn('super comes to $2,000,000.50 at retirement, over the $1,900,000.00 cap, and -$12.49 back'),
    'super comes to $2,000,001 at retirement, over the $1,900,000 cap, and -$12 back',
  );
  assert.equal(wholeDollarsIn('no money here, 41.76% of it'), 'no money here, 41.76% of it');
});

test('EVERY display surface rounds a figure the same way — axis, tooltip, table line, entry row, note', () => {
  // Halves of both signs, and the figures either side of them, where two roundings would disagree.
  const figures = [1, 49, 50, 51, 250, 350, 999_50, 1_234_50, 1_234_49, 12_345_67, 129_119_323, 129_119_350, -50, -250, -1_234_50];
  const identity = (cents) => cents;
  for (const cents of figures) {
    const expected = formatDollars(cents);
    if (!/[kM]$/.test(formatAxisTick(cents))) assert.equal(formatAxisTick(cents), expected, `axis tick for ${cents}`);
    assert.equal(tooltipLabel('Baseline', cents), `Baseline: ${expected}`, `tooltip for ${cents}`);
    assert.equal(
      lineRow({ description: 'x', direction: 'outflow', effect: 'cash', amount: cents, provenance: { kind: 'stated' }, attribution: { basis: 'entries', entryIds: [] } }, identity).amount,
      expected,
      `month-table line for ${cents}`,
    );
    assert.ok(entrySummary({ id: 'e', type: 'ONE_OFF_EXPENSE', date: '2030-01-01', owner: 'household', enabled: true, note: '', params: { amount: cents } }).includes(` — ${expected}`), `entry row for ${cents}`);
    assert.ok(
      noteRow({ subject: 'pension at retirement', person: 'Dana', retireDay: '2030-01-01', note: `comes to ${cents < 0 ? '-' : ''}$${(Math.abs(cents) / 100).toFixed(2)} at retirement` }, identity).note.includes(`comes to ${expected} at`),
      `note text for ${cents}`,
    );
  }
});

test('RAW SOURCE — no app module formats money for display except through displayMoney.ts', () => {
  const dir = join(ROOT, 'src', 'app');
  const files = readdirSync(dir).filter((name) => name.endsWith('.ts'));
  assert.ok(files.length > 20, 'the sweep found too few files to mean anything');
  const code = (name) => readFileSync(join(dir, name), 'utf8').replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, '');
  for (const name of files.filter((file) => file !== 'displayMoney.ts')) {
    assert.doesNotMatch(code(name), /\bformatCents\b/, `${name} prints money through formatCents, which shows cents`);
    assert.doesNotMatch(code(name), /Math\.round\([^;]*\/ ?100\)\s*\*\s*100/, `${name} rounds money to the dollar a second way`);
  }
  assert.match(code('displayMoney.ts'), /\bformatCents\b/, 'the positive control: the one formatter no longer names formatCents');
});

// --- §2 No cents on the page ---------------------------------------------------------------------

const withCents = (plan) => {
  const copy = JSON.parse(JSON.stringify(plan));
  copy.household.openingOffsetBalance = 4_200_037;
  copy.household.mortgage = { openingBalance: 500_000_37, annualInterestRate: 0.06, monthlyRepayment: 3_000_37 };
  copy.household.persons[0].superInterests[0].balance = 412_000_37;
  copy.household.persons[0].superInterests[0].statedAdministrationFeePerYear = 78_49;
  copy.household.persons[0].employmentIncomePerFortnight = 3_100_01;
  copy.household.persons[0].parcels[0].costBase = 38_000_05;
  copy.household.persons[0].parcels[0].marketValue = 96_500_95;
  copy.settings.contingencyFloor = 200_000_37;
  return parsePlan(copy);
};
const PLAN = withCents(DEMO_PLAN);
const ENTRIES = PLAN.entries.filter((entry) => entry.enabled);
const MONTHS = project(PLAN.settings, PLAN.household, ENTRIES);

test('the vacuity control — the walk the page shows is full of figures with cents', () => {
  const lines = MONTHS.flatMap((month) => month.lines);
  assert.ok(lines.filter((line) => line.amount % 100 !== 0).length > 1000, 'too few figures carry cents for the sweep below to mean anything');
  assert.ok(MONTHS.some((month) => month.notes.length > 0), 'no month carries a note');
  assert.ok(MONTHS.some((month) => month.mortgageBalance !== undefined), 'the home loan did not reach the walk');
});

test('the month table: no cents in any row, either money view, either asset view', () => {
  for (const view of ['todaysDollars', 'futureDollars']) {
    const basis = moneyBasis(view, PLAN.settings);
    for (const assets of [HOUSEHOLD_ASSETS, { mode: 'person', labels: personLabels(PLAN.household.persons) }]) {
      const rows = monthsToRows(MONTHS, basis, assets);
      assert.equal(rows.length, MONTHS.length);
      assert.deepEqual(centsFound(`rows[${view}, ${assets.mode}]`, rows), []);
    }
  }
});

test('the entry table: no cents on any entry row, for every money entry type', () => {
  const rows = [
    ...ENTRIES,
    ...[
      ['SPEND_CHANGE', { annualSpend: 84_000_37 }],
      ['WORK_PATTERN_CHANGE', { daysPerWeek: 3, annualSalary: 90_000_37 }],
      ['ONE_OFF_EXPENSE', { amount: 38_000_49 }],
      ['LUMP_SUM_FROM_SUPER', { amount: 30_000_51, interestIndex: 0 }],
      ['SUPER_CONTRIBUTION', { kind: 'salarySacrifice', annualAmount: 10_000_50, interestIndex: 0 }],
      ['MORTGAGE_REFINANCE', { openingBalance: 400_000_37, annualInterestRate: 0.06, monthlyRepayment: 2_500_37 }],
      ['NON_SUPER_INVESTMENT', { direction: 'buy', amount: 10_000_37, incidentalCostsOfAcquisition: 19_95 }],
      ['NON_SUPER_INVESTMENT', { direction: 'sell', amount: 10_000_37 }],
      ['SPOUSE_CONTRIBUTION', { amount: 3_000_37, receivingInterestIndex: 0 }],
    ].map(([type, params], index) => ({ id: `c${index}`, type, date: '2030-01-01', owner: 'household', enabled: true, note: '', params })),
  ].map(entrySummary);
  assert.ok(rows.filter((row) => /\$\d/.test(row)).length >= 10, 'too few entry rows print money');
  assert.deepEqual(centsFound('entries', rows), []);
});

test('the headlines: income, home loan, home-loan targets and sustainable spending carry no cents', () => {
  const basis = moneyBasis('todaysDollars', PLAN.settings);
  const found = {
    income: incomeHeadline(MONTHS, PLAN.household, PLAN.settings.economicSeries.agePension, basis),
    mortgage: mortgageHeadline(MONTHS, PLAN.household, ENTRIES, basis),
    targets: mortgageTargetHeadlines(MONTHS, PLAN.household, ENTRIES, basis),
    spend: sustainableSpendHeadline(sustainableSpend(PLAN.settings, PLAN.household, ENTRIES), MONTHS, PLAN.household, ENTRIES, basis),
  };
  assert.ok([...stringsIn(found)].filter(([, text]) => /\$\d/.test(text)).length >= 3, 'too few headline sentences print money');
  assert.deepEqual(centsFound('headlines', found), []);
});

test('every string an app module exports, and the static page, carries no cents', async () => {
  const dir = join(ROOT, 'dist', 'app');
  const modules = readdirSync(dir).filter((name) => name.endsWith('.js'));
  let strings = 0;
  const found = [];
  // `main.js` runs against the DOM on import, so its text is read off its source instead.
  const mainCode = readFileSync(join(dir, 'main.js'), 'utf8').replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, '');
  assert.match(mainCode, /CHART_NOTE_DETAIL/, 'the positive control: main.js holds none of its own wording');
  assert.doesNotMatch(mainCode, CENTS_FIGURE);
  for (const name of modules.filter((module) => module !== 'main.js')) {
    const exported = await import(join(dir, name));
    strings += [...stringsIn(exported)].length;
    found.push(...centsFound(name, exported));
  }
  assert.ok(strings > 300, `only ${strings} exported strings — the sweep is reading nothing`);
  assert.deepEqual(found, []);
  const html = readFileSync(join(ROOT, 'public', 'index.html'), 'utf8').replace(/<!--[\s\S]*?-->|<script[\s\S]*?<\/script>|<[^>]+>/g, ' ');
  assert.doesNotMatch(html, CENTS_FIGURE);
});

// --- §3 The edit boxes keep every cent ------------------------------------------------------------

test('an edit box shows the EXACT stored figure, and opening and saving is byte-identical', () => {
  const position = positionFormValues(PLAN);
  assert.equal(position.openingOffsetBalance, '42000.37');
  assert.equal(position.mortgageBalance, '500000.37');
  assert.equal(position.mortgageRepayment, '3000.37');
  assert.equal(position.persons[0].superInterests[0].balance, '412000.37');
  assert.equal(position.persons[0].superInterests[0].administrationFeePerYear, '78.49');
  assert.equal(position.persons[0].employmentIncomePerFortnight, '3100.01');
  assert.equal(position.persons[0].parcels[0].costBase, '38000.05');
  assert.equal(position.persons[0].parcels[0].marketValue, '96500.95');
  assert.equal(settingsFormValues(PLAN).contingencyFloor, '200000.37');
  assert.equal(centsToDollars(-1_234_56), '-1234.56');

  const text = JSON.stringify(PLAN);
  assert.equal(JSON.stringify(parsePlan(planWithStatedPosition(PLAN, position))), text, 'saving the untouched position boxes changed the plan');
  assert.equal(JSON.stringify(parsePlan(planWithSettings(PLAN, settingsFormValues(PLAN)))), text, 'saving the untouched settings boxes changed the plan');
});
