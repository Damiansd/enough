// P3-16a microtask 2 — **`mortgageTargets`**, the pure comparison a `MORTGAGE_TARGET` entry's date
// makes against `retirementMonths`'s own answer.
//
// concept.md §5.12: "changes no arithmetic ... makes an intention checkable." This is proven here
// by construction: every test hand-builds the `PersonRetirement[]` input directly, without ever
// calling `project()` — the function reads no `months` at all, only entries and an already-computed
// retirement reading, so there is no walk here to have gotten wrong.
import test from 'node:test';
import assert from 'node:assert/strict';

import { mortgageTargets } from '../dist/core/outcomes.js';

const target = (id, date, enabled = true) => ({
  id,
  date,
  owner: 'household',
  type: 'MORTGAGE_TARGET',
  params: {},
  enabled,
  createdAt: '2026-06-01',
});

const retired = (name, month, age) => ({ name, month, age });
const notRetired = (name) => ({ name, month: undefined, age: undefined });

test('a target BEFORE the retirement date reports retiresAfterTarget — the Person retires after it', () => {
  // Target 2030-06, retirement 2035-01: the target falls well before the retirement month.
  const comparisons = mortgageTargets([target('t1', '2030-06-15')], [retired('Val', '2035-01', 80)]);
  assert.equal(comparisons.length, 1);
  assert.equal(comparisons[0].entryId, 't1');
  assert.equal(comparisons[0].month, '2030-06');
  assert.deepEqual(comparisons[0].perPerson, [{ name: 'Val', outcome: 'retiresAfterTarget' }]);
});

test('a target AFTER the retirement date reports retiresBeforeTarget — the Person retires before it', () => {
  // Target 2040-03, retirement 2035-01: the target falls after the retirement month.
  const comparisons = mortgageTargets([target('t1', '2040-03-01')], [retired('Val', '2035-01', 80)]);
  assert.deepEqual(comparisons[0].perPerson, [{ name: 'Val', outcome: 'retiresBeforeTarget' }]);
});

test('no retirement date computed for a Person is handled without crashing, and named as its own outcome', () => {
  const comparisons = mortgageTargets([target('t1', '2032-01-01')], [notRetired('Ash')]);
  assert.deepEqual(comparisons[0].perPerson, [{ name: 'Ash', outcome: 'noRetirementDate' }]);
});

test('retiring in the SAME month as the target reports retiresAfterTarget, not before — the tie is broken one way', () => {
  const comparisons = mortgageTargets([target('t1', '2033-07-04')], [retired('Val', '2033-07', 75)]);
  assert.deepEqual(comparisons[0].perPerson, [{ name: 'Val', outcome: 'retiresAfterTarget' }]);
});

test('a couple is never reduced to one verdict — one Person before, the other after, in the SAME comparison', () => {
  const comparisons = mortgageTargets(
    [target('t1', '2033-06-01')],
    [retired('Val', '2030-01', 68), retired('Bea', '2038-01', 76)],
  );
  assert.equal(comparisons[0].perPerson.length, 2);
  assert.deepEqual(comparisons[0].perPerson, [
    { name: 'Val', outcome: 'retiresBeforeTarget' },
    { name: 'Bea', outcome: 'retiresAfterTarget' },
  ]);
});

test('a disabled MORTGAGE_TARGET is dropped, on ADR-0002s append-only-safe-delete', () => {
  const comparisons = mortgageTargets([target('off', '2030-01-01', false)], [retired('Val', '2035-01', 80)]);
  assert.deepEqual(comparisons, []);
});

test('an entry of a different type is not a target, even with the same shape', () => {
  const notATarget = { ...target('r1', '2030-01-01'), type: 'RETIRE' };
  assert.deepEqual(mortgageTargets([notATarget], [retired('Val', '2035-01', 80)]), []);
});

test('two enabled targets produce two comparisons, each keeping its own entryId and month', () => {
  const comparisons = mortgageTargets(
    [target('early', '2028-01-01'), target('late', '2045-01-01')],
    [retired('Val', '2035-01', 80)],
  );
  assert.equal(comparisons.length, 2);
  assert.equal(comparisons[0].entryId, 'early');
  assert.equal(comparisons[0].month, '2028-01');
  assert.deepEqual(comparisons[0].perPerson, [{ name: 'Val', outcome: 'retiresAfterTarget' }]);
  assert.equal(comparisons[1].entryId, 'late');
  assert.equal(comparisons[1].month, '2045-01');
  assert.deepEqual(comparisons[1].perPerson, [{ name: 'Val', outcome: 'retiresBeforeTarget' }]);
});

test('no MORTGAGE_TARGET entries at all answers an empty list, not a crash or an undefined', () => {
  assert.deepEqual(mortgageTargets([], [retired('Val', '2035-01', 80)]), []);
  assert.deepEqual(mortgageTargets([], []), []);
});

test('the whole return is frozen, top level and every comparison and perPerson entry inside it', () => {
  const comparisons = mortgageTargets([target('t1', '2030-01-01')], [retired('Val', '2035-01', 80)]);
  assert.ok(Object.isFrozen(comparisons));
  assert.ok(Object.isFrozen(comparisons[0]));
  assert.ok(Object.isFrozen(comparisons[0].perPerson));
  assert.ok(Object.isFrozen(comparisons[0].perPerson[0]));
});
