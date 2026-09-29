// P3-16 slice 1, checkpoint 2 — the home loan on the settings panel, and the sentence the user
// ruling of 2026-09-21 put on the screen.
//
// **The ruling: the repayment is ADDITIONAL to the stated spending level, and the form must SAY
// SO.** Most people's own "what we spend a year" figure already has their mortgage inside it, so a
// user who types that figure AND states their loan has it counted twice — and the forecast comes
// out worse than their life, with nothing on screen to say why. Nothing in the file can detect it;
// the only defence is the wording. §3 is therefore a real test and not a formality.
//
// The DOM writer is pinned as SOURCE, on this suite's standing rule: there is no DOM under
// `node:test` and `typescript` is the one dev dependency (TODO.md P2-9a).
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { DEMO_PLAN } from '../dist/app/demoHousehold.js';
import { parsePlan } from '../dist/core/parsePlan.js';
import { MORTGAGE_NOTICE, MORTGAGE_SUMMARY } from '../dist/app/settingsPanel.js';
import { SPEND_CHANGE_ENTRY_NOTICE, SPEND_CHANGE_ENTRY_SUMMARY, planWithStatedPosition, positionFormValues } from '../dist/app/planEdits.js';
import { MORTGAGE_INTEREST_LINE, MORTGAGE_PRINCIPAL_LINE, project } from '../dist/core/projection.js';
import { monthToRow } from '../dist/app/monthToRows.js';
import { moneyBasis } from '../dist/app/todaysDollars.js';
import { toCents } from '../dist/core/money.js';
import { roundToDollar } from '../dist/app/displayMoney.js';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = (...parts) => readFileSync(join(ROOT, 'src', ...parts), 'utf8');

/** Comments out, string literals blanked — so prose cannot satisfy a source assertion. */
const executableCode = (text) =>
  text
    .replaceAll(/\/\*[\s\S]*?\*\//g, '')
    .replaceAll(/`(?:[^`\\]|\\.)*`|'(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*"|\/\/.*$/gm, (match) =>
      match.startsWith('//') ? '' : '""',
    );

const PANEL = executableCode(read('app', 'settingsPanel.ts'));
const EDITS = executableCode(read('app', 'planEdits.ts'));
const FORM_RAW = read('app', 'entryForm.ts');
const FORM = executableCode(FORM_RAW);

const LOAN = { openingBalance: toCents(500_000), annualInterestRate: 0.061, monthlyRepayment: toCents(3_200) };

const plan = (mortgage) => {
  const file = JSON.parse(JSON.stringify(DEMO_PLAN));
  if (mortgage !== undefined) file.household.mortgage = mortgage;
  return parsePlan(file);
};

/**
 * **A pin on an EXPLANATION, not on its wording** — `app-settings-panel.test.mjs`'s helper, copied
 * rather than imported because a test importing another test's internals is a link nothing enforces.
 * Every group must match and any alternative within a group satisfies it, so the sentence can be
 * reworded in plainer English without this moving, while emptying it fails the floor and every
 * subject at once. §3c is the proof that it does.
 */
const explains = (what, text, subjects, minimum = 120) => {
  assert.equal(typeof text, 'string', `${what} is not a string at all`);
  assert.ok(
    text.trim().length >= minimum,
    `${what} is ${text.trim().length} characters — too short to be the explanation it stands in for`,
  );
  for (const [subject, ...groups] of subjects) {
    for (const alternatives of groups) {
      assert.ok(
        alternatives.some((pattern) => pattern.test(text)),
        `${what} no longer explains ${subject} — nothing in it matches ${alternatives.join(' or ')}`,
      );
    }
  }
};

// --- 1. THE THREE BOXES, AND THE ROUND TRIP ------------------------------------------------------

test('A STATED LOAN COMES BACK AS THREE FILLED BOXES AND GOES BACK OUT AS THE SAME LOAN', () => {
  const values = positionFormValues(plan(LOAN));
  assert.equal(values.mortgageBalance, '500000.00');
  assert.equal(values.mortgageInterestRate, '0.061');
  assert.equal(values.mortgageRepayment, '3200.00');

  const back = parsePlan(planWithStatedPosition(plan(LOAN), values));
  assert.deepEqual(back.household.mortgage, LOAN);
  // Everything else on the position survives the trip, which is what says the loan was ADDED to the
  // writer rather than written in place of something.
  assert.equal(back.household.openingOffsetBalance, plan(LOAN).household.openingOffsetBalance);
  assert.equal(back.household.persons.length, plan(LOAN).household.persons.length);
});

test('NO LOAN IS THREE EMPTY BOXES, AND WRITES NO KEY AT ALL', () => {
  const bare = plan();
  const values = positionFormValues(bare);
  assert.deepEqual(
    [values.mortgageBalance, values.mortgageInterestRate, values.mortgageRepayment],
    ['', '', ''],
    'an absent loan is empty boxes, never three zeros',
  );
  const written = planWithStatedPosition(bare, values);
  assert.equal(Object.hasOwn(written.household, 'mortgage'), false);
  assert.equal(JSON.stringify(written).includes('mortgage'), false);
  // And the plan still parses and still projects, unchanged — the acceptance criterion of the slice.
  assert.deepEqual(parsePlan(written).household, bare.household);
});

test('A HALF-FILLED LOAN IS REFUSED BY THE DOOR, BY FIELD — never silently dropped', () => {
  // The three boxes stand or fall together: `some` filled writes the key, so what the user typed
  // reaches the door and the door names the box they left empty.
  const values = { ...positionFormValues(plan()), mortgageBalance: '500,000' };
  const written = planWithStatedPosition(plan(), values);
  assert.equal(written.household.mortgage.openingBalance, 50_000_000, 'what was typed is not lost');
  assert.ok(Number.isNaN(written.household.mortgage.annualInterestRate));
  assert.throws(() => parsePlan(written), /household\.mortgage\.annualInterestRate/);
  // The other two blanks, each named in its turn.
  const noRepayment = planWithStatedPosition(plan(), { ...values, mortgageInterestRate: '0.061' });
  assert.throws(() => parsePlan(noRepayment), /household\.mortgage\.monthlyRepayment/);
  // All three filled: accepted, and it is the loan that was typed.
  const whole = planWithStatedPosition(plan(), { ...values, mortgageInterestRate: '0.061', mortgageRepayment: '3,200' });
  assert.deepEqual(parsePlan(whole).household.mortgage, LOAN);
});

// --- 2. THE BOXES ARE ON THE PAGE ---------------------------------------------------------------

test('THE THREE BOXES ARE BUILT, READ AND LABELLED, AND THE NOTICE IS HANDED TO THE INFO BUTTON', () => {
  for (const name of ['mortgageBalance', 'mortgageInterestRate', 'mortgageRepayment']) {
    // `executableCode` blanks every string literal, so the box's own name is `""` here — which is
    // the point: what is pinned is that a text input is built FROM `values.<name>` and read back
    // into `<name>`, neither of which prose can satisfy.
    assert.match(PANEL, new RegExp(`input\\("", "", values\\.${name}\\)`), `${name} has no box`);
    assert.match(PANEL, new RegExp(`${name}: ${name}\\.value`), `${name} is built but never read back`);
  }
  assert.match(PANEL, /infoButton\(MORTGAGE_SUMMARY, MORTGAGE_NOTICE, ""\)/);
  assert.match(read('app', 'settingsPanel.ts'), /infoButton\(MORTGAGE_SUMMARY, MORTGAGE_NOTICE, 'guide:home-loan'\)/);
  // The labels are prose, so they are read off the RAW file rather than the stripped one.
  const raw = read('app', 'settingsPanel.ts');
  // P17-6: one "Home loan" heading over three short labels.
  assert.match(raw, /paragraph\('group-label', 'Home loan'\)/);
  assert.match(raw, /label\('Amount still owed ', mortgageBalance\)/);
  assert.match(raw, /label\('Interest rate a year \(0\.061 is 6\.1%\) ', mortgageInterestRate\)/);
  assert.match(raw, /label\('Repayment each month ', mortgageRepayment\)/);
  // The writer writes the key or nothing, in ONE place — `statedMortgage`, not three `trim()`s.
  assert.match(EDITS, /\.\.\.statedMortgage\(values\)/);
  assert.match(EDITS, /const statedMortgage = /);
  // ⚠️ **NO REMOVAL CONTROL.** `app-settings-panel.test.mjs` fails deliberately if one appears, and
  // nothing in this slice adds one: the loan is cleared by emptying its boxes.
  assert.doesNotMatch(PANEL, /removeMortgage|deleteMortgage/);
});

// --- 3. THE SENTENCE THE RULING PUT ON THE SCREEN ------------------------------------------------

/**
 * **P17-3 (2026-09-28): the explanation moved to the guide, and the pin moved with it.** A box no
 * longer restates a rule, so what `MORTGAGE_NOTICE` used to explain is pinned on the chapter its box
 * links into (`{#home-loan-and-offset}`) plus the loan-terms chapter's refusal. Three more subjects —
 * that nothing is paid into the offset, that the repayment stops (the last one partial) when the
 * loan is repaid, and that the Age Pension does not change — are pinned there too (P17-3a). The
 * RULING stays on the page, in the summary.
 */
const GUIDE = readFileSync(join(ROOT, 'userguide.md'), 'utf8');
const between = (from, to) => GUIDE.slice(GUIDE.indexOf(`{#${from}}`), GUIDE.indexOf(`{#${to}}`));
const LOAN_GUIDE = `${between('home-loan-and-offset', 'as-at-date')} ${between('refinancing', 'selling-the-home')}`;

const MORTGAGE_SUBJECTS = [
  ['that the repayment is on top of the spending figure',
    [/on top of/i, /as well as/i, /in addition to/i],
    [/spending/i]],
  ['that the spending figure must leave the mortgage out',
    [/\bnot include\b/i, /\bwithout\b/i, /leave the loan out/i, /\bNOT\b/]],
  ['what the offset does to the interest',
    [/offset/i],
    [/minus/i, /less what is in/i, /smaller interest/i, /interest is charged on/i]],
  ['that a repayment below the interest is refused', [/refused/i]],
  ['that the rate is a decimal', [/decimal/i, /0\.061/]],
  ['that nothing is paid into the offset by the loan', [/nothing is ever paid into the offset/i]],
  ['that the repayment stops when the loan is repaid, and the last one is partial',
    [/stops the month the loan is fully repaid/i], [/not a full one/i]],
  ['that the Age Pension does not change', [/changes nothing for the Age Pension|doesn't change your Age Pension/i], [/still counts in full/i]],
];

test('THE HOME-LOAN NOTICE EXPLAINS ALL OF IT, AND THE SUMMARY CARRIES THE RULING TOO', () => {
  explains('the guide on the home loan', LOAN_GUIDE, MORTGAGE_SUBJECTS, 600);
  explains('MORTGAGE_NOTICE', MORTGAGE_NOTICE, [
    ['where the figures come from', [/statement/i]],
    ['that spending excludes the repayment', [/on top/i], [/spending/i], [/WITHOUT/]],
    ['how to change them later', [/Home loan — set or change the terms/]],
    ['how to pay the loan off', [/Home loan — pay off in full/]],
  ], 100);
  // P17-6 (user ruling 2026-09-28): the line on the page keeps what to do with no loan; the ruling
  // that spending leaves the repayment out is on the spending box's own LABEL (pinned below), where
  // the figure is typed, and in this notice.
  explains('MORTGAGE_SUMMARY', MORTGAGE_SUMMARY, [
    ['that no loan is three empty boxes', [/empty/i, /blank/i]],
  ], 1);
  assert.notEqual(MORTGAGE_SUMMARY, MORTGAGE_NOTICE, 'the two say different amounts, not the same thing twice');
  // No jargon that only a lender uses: the fee notices' standard.
  for (const word of [/amorti[sz]/i, /principal and interest/i, /LVR/i, /P&I/]) {
    assert.doesNotMatch(MORTGAGE_NOTICE, word, `${word} is a lender's word, not a plain one`);
  }
});

test('THE SPENDING BOX SAYS THE MORTGAGE IS NOT IN IT — on the label AND behind the button', () => {
  // The label is what a user reads without clicking anything, so the exclusion is on it — and from
  // 2026-09-21 (register O85) the MONEY is on it too: the level is a real figure the walk raises with
  // prices, so the box is asking for today's money and says so before a figure is typed.
  assert.match(FORM_RAW, /Annual household spending in today.s money, NOT counting home loan repayments/);
  assert.match(FORM_RAW, /Amount, as it will cost on the day/, 'and the ONE-OFF box says the opposite, because it means the opposite');
  assert.match(FORM_RAW, /infoButton\(SPEND_CHANGE_ENTRY_SUMMARY, SPEND_CHANGE_ENTRY_NOTICE, 'guide:spending-plan'\)/);
  // P17-6: the label says all of it, so the line beside it is a few words and the rest is behind it.
  explains('SPEND_CHANGE_ENTRY_SUMMARY', SPEND_CHANGE_ENTRY_SUMMARY, [
    ['that home loan repayments are charged separately', [/home loan|mortgage|repayments/i], [/on top/i]],
  ], 1);
  // P17-3: the line and the disclosure together say what the box does; why a mortgage inside the
  // figure goes wrong is the guide's (`{#spending-plan}`), pinned there.
  explains('the spending box', `${SPEND_CHANGE_ENTRY_SUMMARY} ${SPEND_CHANGE_ENTRY_NOTICE}`, [
    ['that the figure is typed in today’s money', [/today.s money/i]],
    ['that the forecast raises it with prices', [/lifts it|raises it|rises with|in line with the price rises/i]],
    ['that it is charged a twelfth at a time', [/twelfth/i, /each month/i, /every month/i]],
    ['that the mortgage is charged separately on top', [/on top/i], [/home loan|mortgage/i]],
    ['that one-off costs are their own entry', [/one-off/i]],
  ], 250);
  explains('the guide on the spending plan', between('spending-plan', 'one-off-spend'), [
    ['what the figure covers', [/groceries|bills|insurance/i]],
    ['that the mortgage is charged separately on top', [/on top/i], [/home loan|mortgage/i]],
    ['what goes wrong if it is included', [/twice/i, /double/i]],
    ['that one-off costs are their own entry', [/One-off costs/i]],
  ], 400);
  assert.notEqual(SPEND_CHANGE_ENTRY_SUMMARY, SPEND_CHANGE_ENTRY_NOTICE);
});

test('§3c — THE PINS ABOVE ACTUALLY FAIL WHEN THE TEXT IS EMPTIED OR STUBBED', () => {
  // ⚠️ **The vacuous-pin trap, closed by measurement rather than by claim.** A pin that compares a
  // constant with itself stays green when the constant is emptied; these do not, and this is the
  // test that says so. Every one of the four texts is checked, at `''`, at whitespace, and at a
  // plausible-looking stub that keeps the topic and loses the ruling.
  const cases = [
    ['the guide on the home loan', MORTGAGE_SUBJECTS, 600],
    ['MORTGAGE_SUMMARY', [['that no loan is three empty boxes', [/empty/i, /blank/i]]], 1],
    ['the guide on the spending plan', [['that the mortgage is charged separately on top', [/on top/i], [/home loan|mortgage/i]]], 400],
    ['SPEND_CHANGE_ENTRY_SUMMARY', [['that home loan repayments are charged separately', [/home loan|mortgage|repayments/i], [/on top/i]]], 1],
  ];
  for (const [what, subjects, floor] of cases) {
    for (const emptied of ['', '   ', 'Your home loan.']) {
      assert.throws(
        () => explains(what, emptied, subjects, floor),
        assert.AssertionError,
        `${what} survived being replaced with ${JSON.stringify(emptied)} — the pin is vacuous`,
      );
    }
  }
  // And a POSITIVE control: a reworded but complete text still passes, so the pins are not merely
  // length checks wearing a subject list.
  explains('a reworded MORTGAGE_SUMMARY',
    'Your home loan: what you still owe, the rate, and the repayment each month. Leave all three blank if you have none.' +
    ' Enter your spending on top of which this is charged, without the repayment in it.',
    [['that spending excludes the repayment', [/on top/i], [/spending/i]],
     ['that no loan is three empty boxes', [/empty/i, /blank/i]]], 100);
});

// --- 4. THE REPAYMENT RENDERS IN BOTH MONEY VIEWS ------------------------------------------------

test('THE TWO LINES RENDER IN NOMINAL DOLLARS AND IN TODAY’S MONEY, AND THE TWO DIFFER', () => {
  // The per-row lens is bound inside `monthToRow`, so a new line flows through it with no change
  // here — verified rather than assumed, and verified on a LATE month, where the two bases differ
  // most. (Month 0 converts to itself in both views by construction, so it would prove nothing.)
  const file = plan({ openingBalance: toCents(500_000), annualInterestRate: 0.06, monthlyRepayment: toCents(3_000) });
  const months = project(file.settings, file.household, file.entries.filter((e) => e.enabled));
  // **The last month the loan is still being paid in**, which is emphatically not month 0: a month 0
  // figure converts to itself in both views by construction and would prove nothing about the lens.
  const late = [...months].reverse().find((m) => m.lines.some((l) => l.description === MORTGAGE_INTEREST_LINE));
  assert.ok(late !== undefined && late.month !== months[0].month, 'no month carries a mortgage line');
  const rowsIn = (view) => monthToRow(late, moneyBasis(view, file.settings));
  const find = (row, description) => row.cashLines.find((line) => line.description === description);

  for (const view of ['futureDollars', 'todaysDollars']) {
    const row = rowsIn(view);
    for (const description of [MORTGAGE_INTEREST_LINE, MORTGAGE_PRINCIPAL_LINE]) {
      const line = find(row, description);
      assert.ok(line !== undefined, `${description} is missing from the ${view} view`);
      assert.match(line.amount, /^\$[\d,]+$/, `${description} is not whole-dollar money in the ${view} view`);
      assert.equal(line.direction, 'outflow');
    }
  }
  const nominal = rowsIn('futureDollars');
  const today = rowsIn('todaysDollars');
  assert.notEqual(
    find(nominal, MORTGAGE_PRINCIPAL_LINE).amount,
    find(today, MORTGAGE_PRINCIPAL_LINE).amount,
    'a late month in today’s money buys less than the same month in the dollars of the day — if these agree the lens is not being applied',
  );
  // Today's money is SMALLER, which is the direction, and the nominal figure is the engine's own
  // cents undisturbed but for the page's one rounding to the dollar (`displayMoney.ts`).
  const asNumber = (text) => Number(text.replace(/[$,]/g, ''));
  assert.ok(asNumber(find(today, MORTGAGE_PRINCIPAL_LINE).amount) < asNumber(find(nominal, MORTGAGE_PRINCIPAL_LINE).amount));
  assert.equal(
    asNumber(find(nominal, MORTGAGE_PRINCIPAL_LINE).amount),
    roundToDollar(late.lines.find((l) => l.description === MORTGAGE_PRINCIPAL_LINE).amount) / 100,
  );
});
