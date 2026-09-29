// `src/app/ownerNames.ts` — what the Owner selector shows and what a row calls an entry's owner.
// Pure, no DOM (same split as `entryVisibility.ts` and `scenarioWalks.ts`'s pure half), so every
// property a silent regression could break is asserted behaviourally here rather than as source.
//
// **The load-bearing fact this file exists to guard: the stored value is POSITIONAL, never a
// name.** `EntryOwner` is `personA` / `personB` / `household` (`plan.ts:130`), meaning
// `Household.persons[0]` / `[1]` — a name is editable, so an option whose `value` were a name would
// point at nobody the moment it was retyped. §5 below is that invariant, asserted directly, with a
// failure message naming the regression it exists to catch.
import test from 'node:test';
import assert from 'node:assert/strict';

import {
  ABSENT_PERSON_SUFFIX,
  HOUSEHOLD_OWNER_LABEL,
  UNNAMED_PERSON_LABELS,
  ownerLabel,
  ownerOptions,
  personOwnerLabels,
} from '../dist/app/ownerNames.js';

// A minimal Person: only `name` is read by this module, but every field the real `Person` shape
// carries is stated anyway (same style as `core-projection.test.mjs`'s own `person()` helper) so a
// reader is not left wondering whether an omission here is deliberate.
const person = (name) => ({
  name,
  dateOfBirth: '1970-01-01',
  superInterests: [],
  parcels: [],
  employmentIncomePerFortnight: 0,
  workBonusBalance: 0,
});

const couple = (nameA, nameB) => ({ persons: [person(nameA), person(nameB)] });
const solo = (name) => ({ persons: [person(name)] });

// --- §1 A named couple: both names come through as labels --------------------------------------

test("personOwnerLabels returns both names, in the Household's own order, for a named couple", () => {
  assert.deepEqual(personOwnerLabels(couple('Alex', 'Bailey')), ['Alex', 'Bailey']);
});

test('ownerOptions offers the Household first, then one option per named Person', () => {
  const options = ownerOptions(couple('Alex', 'Bailey'));
  assert.deepEqual(
    options.map((option) => option.label),
    [HOUSEHOLD_OWNER_LABEL, 'Alex', 'Bailey'],
  );
});

test('ownerLabel reads a named Person’s own name back for personA and personB', () => {
  const household = couple('Alex', 'Bailey');
  assert.equal(ownerLabel(household, 'personA'), 'Alex');
  assert.equal(ownerLabel(household, 'personB'), 'Bailey');
  assert.equal(ownerLabel(household, 'household'), HOUSEHOLD_OWNER_LABEL);
});

// --- §2 A blank name is legal (`parsePlan` accepts ''): fall back by position, never blank -------

test('a blank name falls back to "First person" / "Second person"', () => {
  assert.deepEqual(personOwnerLabels(couple('', '')), [...UNNAMED_PERSON_LABELS]);
  assert.deepEqual(personOwnerLabels(couple('Alex', '')), ['Alex', UNNAMED_PERSON_LABELS[1]]);
  assert.deepEqual(personOwnerLabels(couple('', 'Bailey')), [UNNAMED_PERSON_LABELS[0], 'Bailey']);
});

// A name that is whitespace only is blank in the same sense `parsePlan` treats '' as blank
// (`person.name.trim() === ''` in ownerNames.ts) — covered so the fallback is known to key off the
// trimmed name and not merely an empty-string identity check.
test('a whitespace-only name is treated the same as a blank one', () => {
  assert.deepEqual(personOwnerLabels(couple('   ', 'Bailey')), [UNNAMED_PERSON_LABELS[0], 'Bailey']);
});

test('no label is ever the empty string, across named, blank, and mixed households', () => {
  const households = [couple('', ''), couple('Alex', ''), couple('', 'Bailey'), couple('Alex', 'Bailey'), solo(''), solo('Alex')];
  for (const household of households) {
    for (const label of personOwnerLabels(household)) assert.notEqual(label, '', 'a blank name must fall back to a position label, never surface as an empty option');
    for (const option of ownerOptions(household)) assert.notEqual(option.label, '', 'an ownerOptions() entry rendered a blank label');
  }
});

// --- §3 Two Persons with the SAME name: disambiguated by position, never left identical ----------

test('two Persons sharing a name are disambiguated with "(first)" / "(second)"', () => {
  assert.deepEqual(personOwnerLabels(couple('Sam', 'Sam')), ['Sam (first)', 'Sam (second)']);
});

test('two blank names do NOT get the "(first)"/"(second)" suffix — the position fallback already disambiguates them', () => {
  // Both blanks resolve to 'First person' / 'Second person' first, which do not collide — so this
  // is a regression guard on ORDER of operations: disambiguation must run on the names as
  // resolved, and the two resolved names here are already distinct, so no "(first)"/"(second)"
  // suffix should be appended on top.
  assert.deepEqual(personOwnerLabels(couple('', '')), ['First person', 'Second person']);
});

test('the two labels are never equal, for any two-person household', () => {
  const households = [couple('Sam', 'Sam'), couple('Alex', 'Bailey'), couple('', ''), couple('Sam', ''), couple('', 'Sam')];
  for (const household of households) {
    const [first, second] = personOwnerLabels(household);
    assert.notEqual(first, second, `personOwnerLabels produced identical labels for ${JSON.stringify(household.persons.map((p) => p.name))} — a user cannot choose between two identical options`);
  }
});

// --- §4 A one-person Household: no personB option at all, and the list tracks persons.length -----

test('a one-Person Household offers no personB option', () => {
  const options = ownerOptions(solo('Alex'));
  assert.deepEqual(
    options.map((option) => option.value),
    ['household', 'personA'],
  );
  assert.ok(!options.some((option) => option.value === 'personB'), 'a one-Person household must not offer personB — parsePlan refuses an entry owned by nobody in the file');
});

test('ownerOptions length tracks household.persons.length + 1, for one and two Persons', () => {
  assert.equal(ownerOptions(solo('Alex')).length, solo('Alex').persons.length + 1);
  assert.equal(ownerOptions(couple('Alex', 'Bailey')).length, couple('Alex', 'Bailey').persons.length + 1);
});

test('personOwnerLabels itself has exactly one label per Person, no more and no fewer', () => {
  assert.equal(personOwnerLabels(solo('Alex')).length, 1);
  assert.equal(personOwnerLabels(couple('Alex', 'Bailey')).length, 2);
});

// --- §5 ownerLabel for an owner naming an absent Person: said plainly, never blank, never a throw ---

test('ownerLabel for personB on a one-Person Household says the Person is absent, not blank', () => {
  const label = ownerLabel(solo('Alex'), 'personB');
  assert.notEqual(label, '', 'an absent Person’s owner label must never render as empty');
  // `label.includes(ABSENT_PERSON_SUFFIX)` and the equality below are both the suffix compared with
  // itself: empty the constant and `'Second person'.includes('')` is true, the equality holds, and
  // the label on the page reads "Second person" — an absent Person named as if they were here, with
  // the suffix deleted and nothing failing (P4-15). The suffix has to SAY something, so that is
  // what is asserted; the words it says it in are free to change.
  assert.ok(label.includes(ABSENT_PERSON_SUFFIX), `expected the "not in this household" wording, got: ${label}`);
  assert.equal(label, `${UNNAMED_PERSON_LABELS[1]}${ABSENT_PERSON_SUFFIX}`);
  assert.ok(
    ABSENT_PERSON_SUFFIX.trim().length >= 15,
    `the absent-Person suffix is ${ABSENT_PERSON_SUFFIX.trim().length} characters — too short to tell anyone anything`,
  );
  assert.match(ABSENT_PERSON_SUFFIX, /\bnot\b|no longer|missing|unknown/i, 'the suffix no longer says the Person is absent');
  assert.match(ABSENT_PERSON_SUFFIX, /household/i, 'the suffix no longer says what they are absent FROM');
  assert.ok(label.length > UNNAMED_PERSON_LABELS[1].length, 'the label is the positional name alone — the absence is not said at all');
});

test('ownerLabel for an absent owner does not throw', () => {
  assert.doesNotThrow(() => ownerLabel(solo('Alex'), 'personB'));
});

// --- §6 THE CORE INVARIANT: every option's value is positional, never a name ---------------------

test('every ownerOptions() value is exactly household/personA/personB — never a Person’s name', () => {
  // The regression this guards: a future edit that builds `value` from `label` (or from
  // `person.name` directly) instead of from position. Names below are deliberately chosen to equal
  // what a broken implementation might mistakenly use as a value, so that mistake would fail this
  // assertion rather than slip through as a coincidental match.
  const LEGAL_VALUES = new Set(['household', 'personA', 'personB']);
  const households = [couple('Alex', 'Bailey'), couple('Sam', 'Sam'), couple('', ''), solo('household'), solo('personA')];
  for (const household of households) {
    for (const option of ownerOptions(household)) {
      assert.ok(
        LEGAL_VALUES.has(option.value),
        `ownerOptions() produced value ${JSON.stringify(option.value)} for label ${JSON.stringify(option.label)} — ` +
          'REGRESSION: an option’s stored `value` must be the POSITIONAL owner (household/personA/personB), ' +
          'never a name. A stored name would point at nobody the moment the Person was renamed (plan.ts:126-130).',
      );
    }
  }
});

test('the value for the first Person is always personA and the second always personB, regardless of names', () => {
  const household = couple('Zoe', 'Amy'); // alphabetically-reversed names, so a value derived by
  // sorting or by comparing names would disagree with position and this test would catch it.
  const options = ownerOptions(household);
  assert.equal(options[1].value, 'personA');
  assert.equal(options[1].label, 'Zoe');
  assert.equal(options[2].value, 'personB');
  assert.equal(options[2].label, 'Amy');
});

test('ownerOptions never mutates the household it is handed', () => {
  const household = couple('Alex', 'Bailey');
  const before = JSON.parse(JSON.stringify(household));
  ownerOptions(household);
  personOwnerLabels(household);
  ownerLabel(household, 'personA');
  assert.deepEqual(household, before);
});
