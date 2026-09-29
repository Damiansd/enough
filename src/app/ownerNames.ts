// What the entry editor CALLS an owner. Pure, no DOM — the same split `entryVisibility.ts` and
// `scenarioList.ts` have with their panels, and for the same reason: the label is decidable and a
// DOM builder is not testable here.
//
// ⚠️ **The stored value stays POSITIONAL; only the label follows the name.** `EntryOwner` is
// `personA` / `personB` / `household`, meaning `Household.persons[0]` / `[1]` (`plan.ts`) — a name
// is editable, so an entry that stored one would point at nobody the moment it was retyped.
// So nothing here ever produces an owner value from a name: `value` is the position, `label` is
// the name, and `plan.json`'s shape is untouched by this file.
import type { Household } from '../core/household.js'; // `.js` is correct in a `.ts` file
import type { EntryOwner } from '../core/plan.js';

/** `household` is not a person and never takes a name. */
export const HOUSEHOLD_OWNER_LABEL = 'Household';

/** A blank name is legal — `parsePlan` accepts `''` — so position is what is left to say. */
export const UNNAMED_PERSON_LABELS = ['First person', 'Second person'] as const;

/** Said of a Person an entry names who is not in the Household. */
export const ABSENT_PERSON_SUFFIX = ' — not in this household';

/** One option of the Owner selector: what the user reads, and what the file stores. */
export interface OwnerOption {
  readonly value: EntryOwner;
  readonly label: string;
}

const PERSON_OWNERS = ['personA', 'personB'] as const;

const unnamed = (index: number): string => (index === 0 ? UNNAMED_PERSON_LABELS[0] : UNNAMED_PERSON_LABELS[1]);

/**
 * One label per Person, in the Household's own order. Two Persons may carry the SAME name
 * (`plan.ts`), and two identical options are a choice nobody can make, so a collision is broken by
 * position rather than left on screen.
 */
export const personOwnerLabels = (household: Household): readonly string[] => {
  const names = household.persons.map((person, index) => (person.name.trim() === '' ? unnamed(index) : person.name));
  return names[0] === names[1] ? names.map((name, index) => `${name} (${index === 0 ? 'first' : 'second'})`) : names;
};

/**
 * What the Owner selector offers: the Household, then one option per Person WHO IS IN THE FILE.
 *
 * A one-Person Household gets no `personB` option at all rather than a disabled one: `parsePlan`
 * refuses an entry owned by somebody not in the file (`checkContributionTargets`), so the option
 * would advertise a plan the door rejects on save, and a greyed-out row would still invite the
 * user to look for the person it names.
 */
export const ownerOptions = (household: Household): readonly OwnerOption[] => [
  { value: 'household', label: HOUSEHOLD_OWNER_LABEL },
  ...personOwnerLabels(household).map((label, index) => ({ value: index === 0 ? PERSON_OWNERS[0] : PERSON_OWNERS[1], label })),
];

/**
 * What a row calls an entry's owner. An entry may name a Person the Household no longer has — only
 * `SUPER_CONTRIBUTION` is refused for that at the door — so the case is SAID and never blanked.
 */
export const ownerLabel = (household: Household, owner: EntryOwner): string => {
  if (owner === 'household') return HOUSEHOLD_OWNER_LABEL;
  const index = owner === 'personA' ? 0 : 1;
  return personOwnerLabels(household)[index] ?? `${unnamed(index)}${ABSENT_PERSON_SUFFIX}`;
};
