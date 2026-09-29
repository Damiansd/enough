// plan_ai.md §12 and §14, stage 3 — the in-app chat's instructions to the model: every figure as its
// marker and never as a number, D3's allowance stated as built, and the connector's own rules reused
// (the same sentences, imported, never a second copy).
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { ACCEPT_REFUSALS, MARKER_EXAMPLE, NEVER_RANK, PERSON_A_AND_B, TODAYS_MONEY_BY_DEFAULT, inAppInstructions, notYetCheckedRule } from '../dist/app/chat/instructions.js';
import { NOT_YET_CHECKED } from '../dist/app/chat/tools/whatCanYouModel.js';

const TEXT = inAppInstructions();

test('a figure is written only as its marker, and never as a number of money', () => {
  assert.match(TEXT, /write ONLY its marker, copied exactly/);
  assert.ok(TEXT.includes(MARKER_EXAMPLE));
  assert.match(MARKER_EXAMPLE, /^⟦t\d+:[^⟦⟧]+⟧$/);
  assert.match(TEXT, /Never write a number of money yourself: no \$ figure, no "k" or "m", no "dollars", "thousand" or "grand", in digits or in words/);
  assert.match(TEXT, /Never round, average, add, subtract or convert a figure, and never repeat one the user wrote/);
  assert.match(TEXT, /struck out on screen as not worked out by enough/);
  // The one $ in the text is the illustration of a tool result, straight after its marker.
  assert.deepEqual(TEXT.match(/\S*\s?\$\d[\d,]*/g), [`${MARKER_EXAMPLE} $31,240`]);
});

test('D3 as built: years, months, ages and percentages, word for word from the question or a tool result', () => {
  assert.match(TEXT, /The only numbers you may write without a marker are calendar years, months, ages and percentages that appear word for word in the user’s question or in a tool result/);
});

test('the connector’s rules, word for word, and every not-yet-checked area on the live list', () => {
  for (const rule of [NEVER_RANK, TODAYS_MONEY_BY_DEFAULT, PERSON_A_AND_B, ACCEPT_REFUSALS, notYetCheckedRule()]) assert.ok(TEXT.includes(rule), rule);
  assert.ok(NOT_YET_CHECKED.length > 0);
  for (const { area } of NOT_YET_CHECKED) assert.ok(TEXT.toLowerCase().includes(area.toLowerCase()), area);
  assert.match(TEXT, /Never state a legislated amount, threshold or cap from memory/);
});

test('the connector imports those sentences rather than keeping a copy', () => {
  const connector = readFileSync(new URL('../server/connector.mjs', import.meta.url), 'utf8');
  assert.match(connector, /import \{[^}]*NEVER_RANK[^}]*\} from '\.\.\/dist\/app\/chat\/instructions\.js'/);
  for (const rule of [NEVER_RANK, TODAYS_MONEY_BY_DEFAULT, PERSON_A_AND_B, ACCEPT_REFUSALS]) assert.ok(!connector.includes(rule.slice(0, 40)), `a copy of "${rule.slice(0, 40)}" is in the connector`);
});
