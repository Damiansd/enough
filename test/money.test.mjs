// Tests run on `node:test`, the built-in runner (P2-9a). The one dev dependency is
// `typescript` and it stays that way — which is also why the tests are plain `.mjs`
// against the compiled output rather than TypeScript needing `@types/node`.
import test from 'node:test';
import assert from 'node:assert/strict';

import { addCents, formatCents, fromCents, mulCents, parseAmount, subCents, toCents } from '../dist/core/money.js';

test('toCents converts dollars at the boundary and rounds to a whole cent', () => {
  assert.equal(toCents(0), 0);
  assert.equal(toCents(10), 1000);
  assert.equal(toCents(-2.5), -250);
  assert.equal(toCents(0.005), 1); // half away from zero
  assert.equal(toCents(-0.005), -1);
});

test('toCents rejects what is not a finite amount', () => {
  assert.throws(() => toCents(Number.NaN), RangeError);
  assert.throws(() => toCents(Number.POSITIVE_INFINITY), RangeError);
});

test('the float that motivates integer cents', () => {
  assert.notEqual(0.1 + 0.2, 0.3);
  assert.equal(addCents(toCents(0.1), toCents(0.2)), toCents(0.3));
});

test('parseAmount reads typed text without constructing a float', () => {
  assert.equal(parseAmount('1,000'), 100000);
  assert.equal(parseAmount('$20.50'), 2050);
  assert.equal(parseAmount('-$20'), -2000);
  assert.equal(parseAmount('0.07'), 7);
  assert.equal(parseAmount('.5'), 50);
});

test('parseAmount rejects junk rather than guessing', () => {
  for (const junk of ['', 'ten', '1.234', '1..0', '$']) assert.throws(() => parseAmount(junk), RangeError);
});

test('formatCents renders from integers, negatives included', () => {
  assert.equal(formatCents(0), '$0.00');
  assert.equal(formatCents(7), '$0.07');
  assert.equal(formatCents(100000), '$1,000.00');
  assert.equal(formatCents(123456789), '$1,234,567.89');
  assert.equal(formatCents(-2050), '-$20.50');
});

test('format and parse round-trip', () => {
  for (const cents of [0, 1, -1, 999, 100000, -123456789]) {
    assert.equal(parseAmount(formatCents(cents)), cents);
  }
});

test('add and sub stay whole', () => {
  assert.equal(addCents(1000, -250), 750);
  assert.equal(subCents(1000, 2500), -1500);
});

test('mulCents applies a rate and rounds back to a whole cent', () => {
  assert.equal(mulCents(100000, 0.1), 10000);
  assert.equal(mulCents(1, 0.5), 1); // half away from zero
  assert.equal(mulCents(-1, 0.5), -1);
  assert.equal(mulCents(333, 0.1), 33);
  assert.throws(() => mulCents(1000, Number.NaN), RangeError);
});

test('fromCents is a display conversion only', () => {
  assert.equal(fromCents(123456), 1234.56);
});
