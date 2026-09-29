// plan_ai.md §12.3 and §13 microtask 4 — **nothing that identifies a person leaves the connector.**
// People are "Person A" and "Person B", by POSITION in `household.persons` (index 0 is A, the same
// reading `plan.ts`'s `personA` owner has), and an age stands in for a date of birth.
//
// Two halves, and the second is the one that fails closed:
//
// 1. **Translation.** A line description the engine writes with a name in it is recognised by
//    matching the WHOLE description against what each exported description helper produces for
//    each Person, and rewritten by the same helper with the Person's label. A description no helper
//    produces is left exactly as it was: never find-and-replaced.
//
//    A `Month.notes` entry's `person` is its Person's name exactly, and becomes the label. Its prose
//    carries figures no note field holds, so it is matched against a TEMPLATE: the exported note
//    helper called with markers in place of the name and each figure. The literal text must match
//    whole; the figures are read back out of the markers' places and the helper is called again with
//    the label. The name is therefore replaced only where the helper put it. Limb 5's Waterfall note
//    is its claims' notes joined, so each claim is matched whole at a join.
// 2. **The boundary guard.** `toolOutput` is the one function a tool's result is serialised
//    through. It scans the serialised text for every Person's name and date of birth and THROWS on
//    any hit. It never scrubs: a leak is a bug in whatever produced the text, and cleaning it here
//    would hide that bug for good. The error names the Person by label and never repeats the text.
//
// **WHOLE WORD, AND A NAME THAT IS ALSO AN ORDINARY WORD.** A hit is the name not touching a letter
// or digit on either side, so "Al" is not found in "Salary" but is in "Al's". Case is ignored, with
// ONE exemption: when the stored name has a capital in it, an all-lowercase occurrence is not a hit.
// That is what lets a Person called "May" or "Will" through prose that says "may" or "will". The
// engine writes a name as stored, so a leak keeps the capital and is still caught. The cost falls
// on the safe side: a capitalised "Will" opening a sentence throws, and a name STORED all-lowercase
// has no exemption at all.
//
// **Names are scanned whole and by part** (each whitespace-separated part of two or more
// characters), because a family name on its own identifies a person.
//
// **Dates of birth are scanned in the forms this codebase renders a date in:** ISO `YYYY-MM-DD`,
// which is how every date in the plan, the engine and the page's text is written; and `DD/MM/YYYY`
// with and without leading zeros, which is what the settings panel's `type="date"` box shows under
// the en-AU locale. A birth MONTH (`YYYY-MM`) is not scanned: an age read month by month ticks over
// in it, so the design already discloses it.
import { agedPersonIndexes, agesAt } from '../../../core/outcomes.js'; // `.js` is correct in a `.ts` file — see tsconfig.json
import {
  CLAIM_NOTE_SEPARATOR,
  INCOME_FROM_SUPER_LINES,
  PENSION_AT_RETIREMENT_NOTE_TEXT,
  PORTFOLIO_POOL,
  capitalGainsTaxDescription,
  cashInterestDescription,
  concessionalCapExceededNoteText,
  division293AccrualUndoneDetermination,
  division293Description,
  division293PaidByFundDetermination,
  division293RefundedInFullDetermination,
  division293ReleaseDescription,
  division293ReleaseRefundDescription,
  division293TrueUpDescription,
  downsizerContributionDescription,
  growthDescription,
  incomeTaxDescription,
  investmentDistributionNoteText,
  portfolioBrokerageDescription,
  portfolioPayoutFrankingSource,
  portfolioPurchaseDescription,
  portfolioSaleDescription,
  salaryDescription,
  salarySacrificeDescription,
  salarySacrificeStoppedNoteText,
  spouseContributionDescription,
  superAdministrationFeeDescription,
  superEarningsTaxDescription,
  superFrankingCreditRefundDescription,
  superGuaranteeDescription,
  superIncomeFrankingSource,
  superInsuranceDescription,
  superInvestmentFeeDescription,
  superPaymentDescription,
  superPoolName,
  taxTrueUpDescription,
} from '../../../core/projection.js';
import {
  accountBasedPensionNotSweptClaimNote,
  cessationBeforePreservationAgeClaimNote,
  releasedClaimNote,
  releasedEmptyClaimNote,
  superWithdrawalTaxNote,
  ttrNotSweptClaimNote,
  underTaxFreeAgeClaimNote,
} from '../../../core/superLumpSum.js';
import { statedFrankingCaveat } from '../../../core/superFranking.js';
import { settledFinancialYear } from './financialYearSummary.js';
import { moneyChecked } from './moneyGuard.js';
import type { Household, Person, SuperInterest } from '../../../core/household.js';
import type { IsoMonth, Month, MonthNote } from '../../../core/plan.js';
import type { FinancialYear } from '../../../data/assumptions/types.js';
import type { MoneyView } from '../../todaysDollars.js';

export const PERSON_LABELS = ['Person A', 'Person B'] as const;

/** What a tool calls `household.persons[index]`. */
export const personLabel = (index: number): string => {
  const label = PERSON_LABELS[index];
  if (label === undefined) throw new RangeError(`a Household holds at most ${PERSON_LABELS.length} Persons; there is no label for position ${index}`);
  return label;
};

/**
 * Every exported helper that writes a Person's name into a line description. A named line the
 * engine writes without one of these cannot be translated, and the guard refuses it.
 */
const PHASES = Object.keys({ accumulation: true, accountBasedPension: true, ttr: true } satisfies Record<SuperInterest['phase'], true>) as SuperInterest['phase'][];
const POOLS = [PORTFOLIO_POOL, ...PHASES.map(superPoolName)];

const NAMED_DESCRIPTIONS: readonly ((person: Person, settled: FinancialYear) => string)[] = [
  ...INCOME_FROM_SUPER_LINES.map((line) => (person: Person) => superPaymentDescription(line, person)),
  ...POOLS.map((pool) => (person: Person) => growthDescription(person.name, pool)),
  ...PHASES.flatMap((phase) => [
    (person: Person) => superGuaranteeDescription(person.name, phase),
    (person: Person) => salarySacrificeDescription(person.name, phase),
    (person: Person) => superAdministrationFeeDescription(person.name, phase),
    (person: Person) => superInvestmentFeeDescription(person.name, phase),
    (person: Person) => superInsuranceDescription(person.name, phase),
    (person: Person, settled: FinancialYear) => superEarningsTaxDescription(person.name, phase, settled),
    (person: Person, settled: FinancialYear) => superFrankingCreditRefundDescription(person.name, phase, settled),
  ]),
  (person) => downsizerContributionDescription(person.name),
  (person) => portfolioSaleDescription(person.name),
  (person) => portfolioPurchaseDescription(person.name),
  (person) => portfolioBrokerageDescription(person.name),
  (person) => salaryDescription(person.name),
  (person) => cashInterestDescription(person),
  (person) => incomeTaxDescription(person.name),
  (person) => capitalGainsTaxDescription(person.name),
  (person, settled) => taxTrueUpDescription(person.name, settled),
  (person) => division293Description(person.name),
  (person, settled) => division293TrueUpDescription(person.name, settled),
  (person, settled) => division293ReleaseRefundDescription(person.name, settled),
  (person, settled) => division293ReleaseDescription(person.name, settled),
];

/**
 * A line description of `month`, as a tool may return it. Two Persons whose helpers both produce the
 * description (the same name) are refused: which of them it is cannot be told, and a guess would
 * put one Person's money on the other.
 */
export const anonymousDescription = (household: Household, month: IsoMonth, description: string): string => {
  const settled = settledFinancialYear(month);
  const found = [
    ...household.persons.flatMap((person, index) =>
      NAMED_DESCRIPTIONS.filter((describe) => describe(person, settled) === description).map((describe) => describe({ ...person, name: personLabel(index) }, settled)),
    ),
    // The one line that names two Persons: who paid, then whose super it went into.
    ...household.persons.flatMap((contributor, from) =>
      household.persons
        .map((receiver, to) => ({ receiver, to }))
        .filter(({ receiver, to }) => to !== from && spouseContributionDescription(contributor.name, receiver.name) === description)
        .map(({ to }) => spouseContributionDescription(personLabel(from), personLabel(to))),
    ),
  ];
  if (found.length > 1) throw new RangeError(`a ${month} line description is written the same way for more than one Person, so whose it is cannot be told`);
  return found[0] ?? description;
};

/** A note helper with its variants fixed: the name, then each figure it interpolates. */
export type NoteText = (name: string, ...facts: string[]) => string;

/** Every note sentence that names a Person, whole. */
const NAMED_NOTE_TEXTS: readonly NoteText[] = [
  salarySacrificeStoppedNoteText,
  concessionalCapExceededNoteText,
  (name, distribution, payoutRate) => investmentDistributionNoteText(name, distribution, payoutRate, undefined),
  (name, distribution, payoutRate, frankedShare) => investmentDistributionNoteText(name, distribution, payoutRate, frankedShare),
  PENSION_AT_RETIREMENT_NOTE_TEXT['retired before the plan'],
  PENSION_AT_RETIREMENT_NOTE_TEXT['under 60'],
  (name, accounts, retireDay) => PENSION_AT_RETIREMENT_NOTE_TEXT['prior pension'](name, true, accounts, retireDay),
  (name, accounts, retireDay) => PENSION_AT_RETIREMENT_NOTE_TEXT['prior pension'](name, false, accounts, retireDay),
  PENSION_AT_RETIREMENT_NOTE_TEXT['over the cap'],
  (name, retireDay, accounts) => PENSION_AT_RETIREMENT_NOTE_TEXT.switched(name, retireDay, accounts, true),
  (name, retireDay, accounts) => PENSION_AT_RETIREMENT_NOTE_TEXT.switched(name, retireDay, accounts, false),
  (name, returnDay, stopDay) => PENSION_AT_RETIREMENT_NOTE_TEXT['back at work'](name, true, returnDay, stopDay),
  (name, returnDay, stopDay) => PENSION_AT_RETIREMENT_NOTE_TEXT['back at work'](name, false, returnDay, stopDay),
  PENSION_AT_RETIREMENT_NOTE_TEXT['stopped again'],
  (name, age) => superWithdrawalTaxNote(name, age, true),
  (name, age) => superWithdrawalTaxNote(name, age, false),
];

/** Every limb 5 claim note that names a Person. */
const NAMED_CLAIM_NOTES: readonly NoteText[] = [
  underTaxFreeAgeClaimNote,
  cessationBeforePreservationAgeClaimNote,
  ttrNotSweptClaimNote,
  accountBasedPensionNotSweptClaimNote,
  releasedEmptyClaimNote,
  releasedClaimNote,
];

/**
 * Every provenance sentence that names a Person, whole: a franked amount's stated source (a
 * caveat) and the Division 293 release lines' determinations.
 */
const NAMED_PROVENANCE_TEXTS: readonly NoteText[] = [
  (name) => statedFrankingCaveat(superIncomeFrankingSource(name)),
  (name) => statedFrankingCaveat(portfolioPayoutFrankingSource(name)),
  division293RefundedInFullDetermination,
  division293AccrualUndoneDetermination,
  division293PaidByFundDetermination,
];

/**
 * A helper's sentence split at its markers: literal text at even positions, and at odd positions
 * `'name'` or a figure's index. The arity is the helper's own declared parameter count.
 */
const MARKER = /\u0000(name|\d+)\u0000/;
export const templateOf = (text: NoteText): readonly string[] =>
  text('\u0000name\u0000', ...Array.from({ length: text.length - 1 }, (_, index) => `\u0000${index}\u0000`)).split(MARKER);

/**
 * A sentence for the Person called `name`, as a pattern that reads each figure back out. `figure`
 * is what a figure may be: in limb 5's note, never a join, or one claim's figure would swallow the
 * next claim and two readings of the note would both fit.
 */
const patternOf = (template: readonly string[], name: string, figure: string): string => {
  const seen = new Set<string>();
  return template
    .map((part, index) => {
      if (index % 2 === 0) return escaped(part);
      if (part === 'name') return escaped(name);
      if (seen.has(part)) return `\\k<f${part}>`;
      seen.add(part);
      return `(?<f${part}>${figure}*?)`;
    })
    .join('');
};

interface NoteTemplate {
  readonly text: NoteText;
  readonly template: readonly string[];
}
const templates = (texts: readonly NoteText[]): readonly NoteTemplate[] => texts.map((text) => ({ text, template: templateOf(text) }));
const NOTE_TEMPLATES = templates(NAMED_NOTE_TEXTS);
const PROVENANCE_TEMPLATES = templates(NAMED_PROVENANCE_TEXTS);
const CLAIM_TEMPLATES = templates(NAMED_CLAIM_NOTES);

/** Each reading of `text` at `at` by one Person's sentence, rewritten with that Person's label. */
const readings = (
  household: Household,
  candidates: readonly NoteTemplate[],
  text: string,
  at: number,
  figure: string,
  end: string,
): readonly { readonly length: number; readonly translated: string }[] =>
  household.persons.flatMap((person, index) =>
    candidates.flatMap(({ text: write, template }) => {
      const pattern = new RegExp(`${patternOf(template, person.name, figure)}${end}`, 'y');
      pattern.lastIndex = at;
      const match = pattern.exec(text);
      if (match === null) return [];
      const facts = Array.from({ length: write.length - 1 }, (_, fact) => match.groups?.[`f${fact}`] ?? '');
      return [{ length: match[0].length, translated: write(personLabel(index), ...facts) }];
    }),
  );

const oneReading = <T extends { readonly translated: string }>(found: readonly T[]): T | undefined => {
  if (new Set(found.map(({ translated }) => translated)).size > 1) throw new RangeError('a note is written the same way for more than one Person, so whose it is cannot be told');
  return found[0];
};

/** Limb 5's note: each claim note is read whole where it starts, at the start or after a join. */
const anonymousClaims = (household: Household, text: string): string => {
  const figure = `(?:(?!${escaped(CLAIM_NOTE_SEPARATOR)})[\\s\\S])`;
  const end = `(?=${escaped(CLAIM_NOTE_SEPARATOR)}|$)`;
  let out = '';
  let at = 0;
  for (;;) {
    const found = oneReading(readings(household, CLAIM_TEMPLATES, text, at, figure, end));
    if (found !== undefined) {
      out += found.translated;
      at += found.length;
    }
    const join = text.indexOf(CLAIM_NOTE_SEPARATOR, at);
    if (join === -1) return out + text.slice(at);
    out += text.slice(at, join + CLAIM_NOTE_SEPARATOR.length);
    at = join + CLAIM_NOTE_SEPARATOR.length;
  }
};

/**
 * One of `Month.notes`, as a tool may return it: `person` by label, and prose a helper wrote
 * rewritten by the same helper. Prose no helper wrote is left as it was, for the guard.
 */
export const anonymousNote = (household: Household, note: MonthNote): MonthNote => {
  const prose =
    note.subject === 'waterfall limb'
      ? anonymousClaims(household, note.note)
      : (oneReading(readings(household, NOTE_TEMPLATES, note.note, 0, '[\\s\\S]', '$'))?.translated ?? note.note);
  if (!('person' in note)) return Object.freeze({ ...note, note: prose });
  const owners = household.persons.flatMap((person, index) => (person.name === note.person ? [personLabel(index)] : []));
  if (owners.length > 1) throw new RangeError('a note names a Person the same way as another, so whose it is cannot be told');
  return Object.freeze({ ...note, person: owners[0] ?? note.person, note: prose });
};

/**
 * One provenance sentence (a caveat, a determination or a note), rewritten by the helper that wrote
 * it. A sentence no helper wrote is returned as it was: whether it may go out is the caller's call.
 */
export const anonymousProvenanceText = (household: Household, text: string): string =>
  oneReading(readings(household, PROVENANCE_TEMPLATES, text, 0, '[\\s\\S]', '$'))?.translated ?? text;

/**
 * A refusal's message, `parsePlan`'s or the engine's, with each Person's name replaced by their label
 * where it stands WHOLE and exactly as stored — the way the engine writes it.
 *
 * **The one place a name is replaced where it is found rather than rebuilt by its helper.** A refusal
 * is written at any of the engine's throw sites, and none of them has an exported helper to rebuild
 * from, so there is no template to match. The fallback is the same as a note's: two Persons with one
 * name cannot be told apart, so nothing is replaced, and whatever still names a Person is the
 * caller's to omit (the guard refuses it either way).
 */
export const anonymousRefusalText = (household: Household, text: string): string => {
  const named = household.persons.map((person, index) => ({ name: person.name, label: personLabel(index) })).filter(({ name }) => name.trim() !== '');
  if (new Set(named.map(({ name }) => name)).size < named.length) return text;
  return named
    .sort((a, b) => b.name.length - a.name.length)
    .reduce((out, { name, label }) => out.replace(new RegExp(`(?<![\\p{L}\\p{N}])${escaped(name)}(?![\\p{L}\\p{N}])`, 'gu'), label), text);
};

/**
 * Each LIVING Person's age on the first day of `month`, by label, in `household.persons` order. A
 * walk's `Month` carries who has died (P12-1), and a Person who has died has no age; a bare month
 * name carries nobody's death, so pass the `Month` wherever the walk is in hand.
 */
export const anonymousAges = (
  household: Household,
  month: IsoMonth | Pick<Month, 'month' | 'died'>,
): readonly { readonly person: string; readonly age: number }[] => {
  const at = agesAt(household, typeof month === 'string' ? { month } : month);
  const indexes = agedPersonIndexes(at);
  return at.ages.map(({ age }, position) => ({ person: personLabel(indexes[position] ?? position), age }));
};

export class IdentityLeakError extends Error {
  override readonly name = 'IdentityLeakError';
}

export const escaped = (text: string): string => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** `text` as it appears inside a JSON string. */
const asSerialised = (text: string): string => JSON.stringify(text).slice(1, -1);

const nameFound = (text: string, name: string): boolean => {
  const exempt = name !== name.toLowerCase();
  const pattern = new RegExp(`(?<![\\p{L}\\p{N}])${escaped(asSerialised(name))}(?![\\p{L}\\p{N}])`, 'giu');
  return [...text.matchAll(pattern)].some(([match]) => !(exempt && match === match.toLowerCase()));
};

const nameForms = (name: string): readonly string[] => {
  const whole = name.trim();
  if (whole === '') return [];
  return [whole, ...whole.split(/\s+/).filter((part) => part.length >= 2)];
};

const dateForms = (dateOfBirth: string): readonly string[] => {
  const [year, month, day] = dateOfBirth.split('-');
  return [dateOfBirth, `${day}/${month}/${year}`, `${Number(day)}/${Number(month)}/${year}`];
};

const dateFound = (text: string, date: string): boolean => new RegExp(`(?<!\\d)${escaped(date)}(?!\\d)`).test(text);

/** Which Person's name or date of birth `text` (serialised) carries, first found; `undefined` if none. */
const leakIn = (household: Household, text: string): string | undefined => {
  for (const [index, person] of household.persons.entries()) {
    if (nameForms(person.name).some((name) => nameFound(text, name))) return `${personLabel(index)}'s name`;
    if (dateForms(person.dateOfBirth).some((date) => dateFound(text, date))) return `${personLabel(index)}'s date of birth`;
  }
  return undefined;
};

/** Whether `text` carries a Person's name or date of birth — the guard's own test, on one string. */
export const carriesIdentity = (household: Household, text: string): boolean => leakIn(household, JSON.stringify(text)) !== undefined;

/**
 * A tool's result, serialised — or an `IdentityLeakError` if a name or date of birth is in it, and
 * then an `UnlabelledMoneyError` if a figure in it is not labelled for `view` (`moneyGuard.ts`).
 */
export const toolOutput = (household: Household, value: unknown, view: MoneyView): string => {
  const text = JSON.stringify(value);
  const leak = leakIn(household, text);
  if (leak !== undefined) throw new IdentityLeakError(`${leak} is in a tool's output`);
  return moneyChecked(text, view);
};
