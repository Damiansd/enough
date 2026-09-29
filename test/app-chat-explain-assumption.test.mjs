// plan_ai.md §5 and §13 microtask 9 — `explainAssumption(plan, key)` and `listAssumptions(plan, topic)`.
//
// Every record goes out with every provenance field `data/assumptions/` carries. A legislated dollar
// figure is labelled with its own record's stamp — "(as legislated for 2026-27)" — which the money
// guard accepts in exactly that form. An unknown key or topic is refused by name and never guessed.
//
// Expectations are read from `data/assumptions/` directly, never from the tool.
import test from 'node:test';
import assert from 'node:assert/strict';

import { formatCents } from '../dist/core/money.js';
import { PROVENANCE_KEYS, SETTINGS_NOT_ASSUMPTIONS, assumptionAt, assumptionKeys, explainAssumption as explained } from '../dist/data/assumptions/index.js';
import { DEMO_PLAN } from '../dist/app/demoHousehold.js';
import { FIGURE_OMITTED, figuresOmitted } from '../dist/app/chat/tools/basisLabelled.js';
import { SOURCE_OMITTED } from '../dist/app/chat/tools/getMonth.js';
import { UnlabelledMoneyError, moneyChecked } from '../dist/app/chat/tools/moneyGuard.js';
import { FORMULA_VALUE, explainAssumption, listAssumptions } from '../dist/app/chat/tools/explainAssumption.js';

const KEYS = assumptionKeys();
const SETTINGS = Object.keys(SETTINGS_NOT_ASSUMPTIONS);

/** The tag this file expects for a record's stamp, spelled here and not borrowed from the tool. */
const expectedTag = (record) =>
  record.fy !== undefined ? `(as legislated for ${record.fy})` : record.effective !== undefined ? `(as legislated from ${record.effective})` : '(as legislated for every year)';

test('every record goes out with its value, its stamp and every provenance field', () => {
  assert.ok(KEYS.length > 250, 'the key list is not the data');
  for (const key of KEYS) {
    const out = JSON.parse(explainAssumption(DEMO_PLAN, key));
    const record = explained(key);
    for (const field of [...PROVENANCE_KEYS, 'value', 'stamp', 'kind']) assert.ok(Object.hasOwn(out, field), `${key}: ${field}`);
    assert.equal(out.key, key);
    assert.equal(out.kind, record.kind);
    assert.equal(out.stamp, record.stamp);
    assert.equal(out.retrieved, record.retrieved);
    assert.equal(out.confidence, record.confidence);
    assert.equal(out.registerSection, record.registerSection);
    assert.equal(out.source, figuresOmitted(record.source), key);
    assert.equal(out.note, record.note === undefined ? undefined : figuresOmitted(record.note), key);
    assert.equal(out.derivation, record.derivation === undefined ? undefined : figuresOmitted(record.derivation), key);
    assert.equal(out.isFormula, record.isFormula);
  }
});

test('a legislated dollar figure is labelled with its own record’s stamp, and every other value goes out as it is', () => {
  const seen = { fy: 0, effective: 0, everyYear: 0, bare: 0 };
  const compare = (key, record, data, sent) => {
    if (typeof data === 'function') return assert.equal(sent, FORMULA_VALUE, key);
    if (typeof data === 'number') {
      if (typeof sent === 'number') {
        assert.equal(sent, data, key);
        // A bare whole number this size in this data is cents: every one is labelled.
        assert.ok(!(Number.isInteger(data) && Math.abs(data) >= 1_000), `${key}: ${data} went out bare`);
        seen.bare += 1;
        return;
      }
      assert.equal(sent, `${formatCents(data)} ${expectedTag(record)}`, key);
      seen[record.fy !== undefined ? 'fy' : record.effective !== undefined ? 'effective' : 'everyYear'] += 1;
      return;
    }
    if (typeof data === 'string') return assert.equal(sent, figuresOmitted(data), key);
    if (data === null || typeof data !== 'object') return assert.equal(sent, data, key);
    assert.deepEqual(Object.keys(sent), Object.keys(data), key);
    for (const [child, value] of Object.entries(data)) compare(`${key}.${child}`, record, value, sent[child]);
  };
  for (const key of KEYS) compare(key, assumptionAt(key), assumptionAt(key).value, JSON.parse(explainAssumption(DEMO_PLAN, key)).value);
  for (const [form, count] of Object.entries(seen)) assert.ok(count > 0, `no ${form} figure was seen, so that form is untested`);

  assert.equal(JSON.parse(explainAssumption(DEMO_PLAN, 'superannuation.caps.generalTransferBalance')).value, '$2,100,000.00 (as legislated for 2026-27)');
  assert.equal(JSON.parse(explainAssumption(DEMO_PLAN, 'tax.years.2026-27.brackets')).value[1].upTo, '$45,000.00 (as legislated for 2026-27)');
  assert.equal(JSON.parse(explainAssumption(DEMO_PLAN, 'agePension.paymentRates.2026-09-20')).value.maximumBasicRate.single, '$1,135.40 (as legislated from 2026-09-20)');
  assert.equal(JSON.parse(explainAssumption(DEMO_PLAN, 'superannuation.division293.threshold')).value, '$250,000.00 (as legislated for every year)');
  // A statute's own figure inside prose has no stamp of its own, and is omitted.
  assert.ok(JSON.parse(explainAssumption(DEMO_PLAN, 'superannuation.caps.generalTransferBalance')).note.includes(`[${FIGURE_OMITTED}]`));
});

test('the money guard takes the legislated tag in exactly its three forms, and no other parenthesis', () => {
  for (const view of ['todaysDollars', 'futureDollars']) {
    for (const good of ['"$2,100,000.00 (as legislated for 2026-27)"', '"$1.00 (as legislated for 1999-00)"', '"$1,135.40 (as legislated from 2026-09-20)"', '"$250,000.00 (as legislated for every year)"']) {
      assert.equal(moneyChecked(good, view), good);
    }
    for (const bad of [
      '"$5.00 (as legislated)"',
      '"$5.00 (as legislated for 2026-28)"',
      '"$5.00 (as legislated for 26-27)"',
      '"$5.00 (as legislated for 2026)"',
      '"$5.00 (as legislated from 2026-13-01)"',
      '"$5.00 (as legislated from 2026-09)"',
      '"$5.00 (as legislated for every years)"',
      '"$5.00 (as enacted for 2026-27)"',
      '"$5.00 (2026-27)"',
      '"$5.00 (anything at all)"',
      '"$5.00(as legislated for 2026-27)"',
    ]) {
      assert.throws(() => moneyChecked(bad, view), UnlabelledMoneyError, bad);
    }
  }
});

test('a Setting goes out as the reason it is not an assumption', () => {
  for (const key of SETTINGS) {
    const out = JSON.parse(explainAssumption(DEMO_PLAN, key));
    assert.deepEqual(out, { key, kind: 'setting', reason: figuresOmitted(SETTINGS_NOT_ASSUMPTIONS[key].reason), registerSection: SETTINGS_NOT_ASSUMPTIONS[key].registerSection });
  }
});

test('an unknown key is refused by name, with the keys under its topic, and nothing is guessed', () => {
  const REASON = 'no assumption or Setting has that key, and none is guessed in its place';
  const topics = [...new Set([...KEYS, ...SETTINGS].map((key) => key.split('.')[0]))].sort();
  const under = (list, topic) => list.filter((key) => key.split('.')[0] === topic).sort();
  for (const key of ['superannuation.caps.generalTransferBalanc', 'superannuation.caps', 'superannuation.caps.generalTransferBalance.value', 'tax.lito', 'TAX.lito.maximumOffset', 'tax']) {
    const out = JSON.parse(explainAssumption(DEMO_PLAN, key));
    const topic = key.split('.')[0];
    const expected = topics.includes(topic)
      ? { refused: 'UNKNOWN_ASSUMPTION', reason: REASON, keysUnderThisTopic: under(KEYS, topic), settingsUnderThisTopic: under(SETTINGS, topic) }
      : { refused: 'UNKNOWN_ASSUMPTION', reason: REASON, topics };
    assert.deepEqual(out, expected, key);
  }
  // The model's own text is not echoed: a key carrying a figure or a name is still refused cleanly.
  assert.equal(JSON.parse(explainAssumption(DEMO_PLAN, `tax.$5 ${DEMO_PLAN.household.persons[0].name}`)).refused, 'UNKNOWN_ASSUMPTION');
});

test('listAssumptions: the keys under a topic, every key under exactly one, and an unknown topic refused', () => {
  const listed = [];
  const topics = JSON.parse(listAssumptions(DEMO_PLAN, 'no such topic')).topics;
  assert.equal(JSON.parse(listAssumptions(DEMO_PLAN, 'no such topic')).refused, 'UNKNOWN_TOPIC');
  for (const topic of topics) {
    const out = JSON.parse(listAssumptions(DEMO_PLAN, topic));
    assert.equal(out.topic, topic);
    assert.deepEqual(out.keys, KEYS.filter((key) => key.startsWith(`${topic}.`)).sort());
    assert.deepEqual(out.settings, SETTINGS.filter((key) => key.startsWith(`${topic}.`)).sort());
    listed.push(...out.keys, ...out.settings);
  }
  assert.deepEqual(listed.sort(), [...KEYS, ...SETTINGS].sort());
  assert.equal(JSON.parse(listAssumptions(DEMO_PLAN, 'superannuation.caps')).refused, 'UNKNOWN_TOPIC');
});

test('register prose that carries a Person’s name goes out omitted, never through the guard', () => {
  // A Person called "Services": the register says "Services Australia" throughout.
  const plan = { ...DEMO_PLAN, household: { ...DEMO_PLAN.household, persons: DEMO_PLAN.household.persons.map((person, index) => (index === 0 ? { ...person, name: 'Services' } : person)) } };
  let omitted = 0;
  for (const key of [...KEYS, ...SETTINGS]) {
    const text = explainAssumption(plan, key);
    assert.ok(!/\bServices\b/.test(text), key);
    omitted += text.split(SOURCE_OMITTED).length - 1;
  }
  assert.ok(omitted > 0, 'no prose named the Person, so the omission is untested');
});
