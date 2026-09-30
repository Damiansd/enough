// plan_ai.md §12.3 and §13 microtask 4 — nothing that identifies a person leaves the connector.
// People go out as Person A / Person B by position, ages stand in for dates of birth, named line
// descriptions are translated by WHOLE match, and `toolOutput` THROWS on any name or date of birth.
//
// The expected translations are literal strings, not the helpers called a second time, so a helper
// that changed its wording would show here rather than agree with itself.
import test from 'node:test';
import assert from 'node:assert/strict';

import { createHash } from 'node:crypto';

import { toCents } from '../dist/core/money.js';
import {
  PENSION_AT_RETIREMENT_NOTE_TEXT,
  concessionalCapExceededNoteText,
  investmentDistributionNoteText,
  project,
  salarySacrificeStoppedNoteText,
} from '../dist/core/projection.js';
import {
  accountBasedPensionNotSweptClaimNote,
  cessationBeforePreservationAgeClaimNote,
  releasedClaimNote,
  releasedEmptyClaimNote,
  releasedInPartClaimNote,
  superWithdrawalTaxNote,
  ttrNotSweptClaimNote,
  underTaxFreeAgeClaimNote,
} from '../dist/core/superLumpSum.js';
import { DEMO_ENTRIES, DEMO_HOUSEHOLD, DEMO_SETTINGS } from '../dist/app/demoHousehold.js';
import { IdentityLeakError, anonymousAges, anonymousDescription, anonymousNote, personLabel, toolOutput } from '../dist/app/chat/tools/identity.js';
import { UnlabelledMoneyError } from '../dist/app/chat/tools/moneyGuard.js';
import { financialYearsOutput, labelledFinancialYears } from '../dist/app/chat/tools/basisLabelled.js';

// SYNTHETIC: distinctive names and dates of birth, so a hit can only be a leak. Person B's name is
// also an ordinary word.
const WILHELMINA = { name: 'Wilhelmina Quartermaine', dateOfBirth: '1963-11-27' };
const MAY = { name: 'May', dateOfBirth: '1966-04-03' };
const HOUSEHOLD = { persons: [WILHELMINA, MAY] };

const leaks = (household, value) => assert.throws(() => toolOutput(household, value, 'todaysDollars'), IdentityLeakError);

/**
 * The identity half of `toolOutput` on its own. Raw notes still carry the engine's "N cents" prose,
 * which the money half refuses; that half runs SECOND, so reaching it means identity passed.
 */
const identityPasses = (household, value) => {
  try {
    return toolOutput(household, value, 'todaysDollars');
  } catch (error) {
    if (error instanceof UnlabelledMoneyError) return JSON.stringify(value);
    throw error;
  }
};

// --- Translation ---------------------------------------------------------------------------------

/** Every named description a helper writes, raw and translated, for a July line settling 2026-27. */
const NAMED = [
  ['Salary, Wilhelmina Quartermaine', 'Salary, Person A'],
  ['Interest on cash, Wilhelmina Quartermaine', 'Interest on cash, Person A'],
  ['Income tax, Wilhelmina Quartermaine', 'Income tax, Person A'],
  ['Income tax on capital gain, Wilhelmina Quartermaine', 'Income tax on capital gain, Person A'],
  ['Income tax year-end true-up, Wilhelmina Quartermaine, 2026-27', 'Income tax year-end true-up, Person A, 2026-27'],
  ['Division 293 tax, Wilhelmina Quartermaine', 'Division 293 tax, Person A'],
  ['Division 293 tax year-end true-up, Wilhelmina Quartermaine, 2026-27', 'Division 293 tax year-end true-up, Person A, 2026-27'],
  ['Division 293 tax accrual refunded on release, Wilhelmina Quartermaine, 2026-27', 'Division 293 tax accrual refunded on release, Person A, 2026-27'],
  ['Division 293 tax released from superannuation, Wilhelmina Quartermaine, 2026-27', 'Division 293 tax released from superannuation, Person A, 2026-27'],
  ['Account-Based Pension payment, Wilhelmina Quartermaine', 'Account-Based Pension payment, Person A'],
  ['Transition to retirement pension, Wilhelmina Quartermaine', 'Transition to retirement pension, Person A'],
  ['Superannuation lump sum, Wilhelmina Quartermaine', 'Superannuation lump sum, Person A'],
  ['Investment growth, Wilhelmina Quartermaine — Financial investments outside superannuation', 'Investment growth, Person A — Financial investments outside superannuation'],
  ['Investment growth, Wilhelmina Quartermaine — Superannuation, Accumulation Phase', 'Investment growth, Person A — Superannuation, Accumulation Phase'],
  ['Investment growth, Wilhelmina Quartermaine — Superannuation, TTR', 'Investment growth, Person A — Superannuation, TTR'],
  ['Investment growth, Wilhelmina Quartermaine — Account-Based Pension', 'Investment growth, Person A — Account-Based Pension'],
  ['Superannuation Guarantee into superannuation, Wilhelmina Quartermaine — Superannuation, Accumulation Phase', 'Superannuation Guarantee into superannuation, Person A — Superannuation, Accumulation Phase'],
  ['Non-Super Portfolio sale, Wilhelmina Quartermaine', 'Non-Super Portfolio sale, Person A'],
  ['Non-Super Portfolio purchase, Wilhelmina Quartermaine', 'Non-Super Portfolio purchase, Person A'],
  ['Non-Super Portfolio brokerage, Wilhelmina Quartermaine', 'Non-Super Portfolio brokerage, Person A'],
  ['Superannuation administration fee, Wilhelmina Quartermaine — Superannuation, Accumulation Phase', 'Superannuation administration fee, Person A — Superannuation, Accumulation Phase'],
  ['Superannuation investment fee, Wilhelmina Quartermaine — Account-Based Pension', 'Superannuation investment fee, Person A — Account-Based Pension'],
  ['Superannuation fund earnings tax, Wilhelmina Quartermaine — Superannuation, Accumulation Phase, 2026-27', 'Superannuation fund earnings tax, Person A — Superannuation, Accumulation Phase, 2026-27'],
  ['Superannuation franking credit refund, Wilhelmina Quartermaine — Account-Based Pension, 2026-27', 'Superannuation franking credit refund, Person A — Account-Based Pension, 2026-27'],
  ['Salary sacrifice into superannuation, Wilhelmina Quartermaine — Superannuation, Accumulation Phase', 'Salary sacrifice into superannuation, Person A — Superannuation, Accumulation Phase'],
  // The one line naming two Persons keeps its direction: who paid, then whose super it went into.
  ['Spouse contribution, Wilhelmina Quartermaine → May', 'Spouse contribution, Person A → Person B'],
  ['Spouse contribution, May → Wilhelmina Quartermaine', 'Spouse contribution, Person B → Person A'],
  ['Salary, May', 'Salary, Person B'],
  ['Interest on cash, May', 'Interest on cash, Person B'],
  ['Income tax, May', 'Income tax, Person B'],
  ['Income tax year-end true-up, May, 2026-27', 'Income tax year-end true-up, Person B, 2026-27'],
  ['Division 293 tax released from superannuation, May, 2026-27', 'Division 293 tax released from superannuation, Person B, 2026-27'],
];

test('a named line is rewritten whole, with Person A at index 0 and Person B at index 1', () => {
  assert.equal(personLabel(0), 'Person A');
  assert.equal(personLabel(1), 'Person B');
  for (const [raw, translated] of NAMED) assert.equal(anonymousDescription(HOUSEHOLD, '2027-07', raw), translated, raw);
  const out = NAMED.map(([raw]) => anonymousDescription(HOUSEHOLD, '2027-07', raw));
  assert.equal(toolOutput(HOUSEHOLD, out, 'todaysDollars'), JSON.stringify(NAMED.map(([, translated]) => translated)));
  leaks(HOUSEHOLD, NAMED.map(([raw]) => raw));
});

test('a description no helper produces is left exactly as it was — never find-and-replaced', () => {
  for (const description of [
    'Household spending',
    'Investment growth, May — Offset Account',
    'Salary, May (bonus)',
    // Nobody contributes to their own super as a spouse.
    'Spouse contribution, May → May',
    // An earnings tax settles the year before; a July 2027 line naming 2027-28 is nobody's.
    'Superannuation fund earnings tax, May — Account-Based Pension, 2027-28',
    // A true-up naming a year other than the one a July 2027 line settles is not a helper's output.
    'Income tax year-end true-up, May, 2025-26',
  ]) {
    assert.equal(anonymousDescription(HOUSEHOLD, '2027-07', description), description);
  }
  leaks(HOUSEHOLD, { description: anonymousDescription(HOUSEHOLD, '2027-07', 'Investment growth, May — Offset Account') });
});

test('two Persons with one name are refused, not guessed between', () => {
  const twins = { persons: [WILHELMINA, { ...MAY, name: WILHELMINA.name }] };
  assert.throws(() => anonymousDescription(twins, '2027-07', 'Salary, Wilhelmina Quartermaine'), (error) => error instanceof RangeError && !error.message.includes('Wilhelmina'));
  assert.throws(() => anonymousDescription(twins, '2027-07', 'Spouse contribution, Wilhelmina Quartermaine → Wilhelmina Quartermaine'), RangeError);
  const note = { subject: 'salary sacrifice stopped', person: WILHELMINA.name, entryId: 'e', stoppedFrom: '2027-07-01', note: salarySacrificeStoppedNoteText(WILHELMINA.name, '2027-07-01') };
  assert.throws(() => anonymousNote(twins, note), (error) => error instanceof RangeError && !error.message.includes('Wilhelmina'));
});

test('ages stand in for dates of birth, by label, from the engine’s first-of-the-month reading', () => {
  // 2027-04-01: Wilhelmina is 63, and May turns 61 on the 3rd, so is still 60.
  assert.deepEqual(anonymousAges(HOUSEHOLD, '2027-04'), [{ person: 'Person A', age: 63 }, { person: 'Person B', age: 60 }]);
  assert.deepEqual(anonymousAges(HOUSEHOLD, '2027-05'), [{ person: 'Person A', age: 63 }, { person: 'Person B', age: 61 }]);
  assert.equal(toolOutput(HOUSEHOLD, anonymousAges(HOUSEHOLD, '2027-05'), 'todaysDollars'), '[{"person":"Person A","age":63},{"person":"Person B","age":61}]');
});

// --- The guard -----------------------------------------------------------------------------------

test('the guard throws on every name form and date-of-birth form, and never repeats the text', () => {
  for (const text of [
    'Wilhelmina Quartermaine',
    'WILHELMINA QUARTERMAINE',
    'paid to Wilhelmina',
    'paid to wILHELMINA',
    'Quartermaine’s super',
    'May',
    'Salary, May',
    '1963-11-27',
    '27/11/1963',
    '3/4/1966',
    '03/04/1966',
  ]) {
    assert.throws(() => toolOutput(HOUSEHOLD, { note: text }, 'todaysDollars'), (error) => {
      assert.ok(error instanceof IdentityLeakError, text);
      assert.match(error.message, /^Person [AB]'s (name|date of birth) is in a tool's output$/, text);
      return true;
    });
  }
});

test('the guard throws rather than scrubbing, and passes clean output through unchanged', () => {
  const clean = { month: '2027-07', figure: '$1,963.11 (today’s money)', born: '1963-11-28', ages: '27/11/19634' };
  assert.equal(toolOutput(HOUSEHOLD, clean, 'todaysDollars'), JSON.stringify(clean));
  let returned;
  assert.throws(() => {
    returned = toolOutput(HOUSEHOLD, { ...clean, line: 'Salary, Wilhelmina Quartermaine' }, 'todaysDollars');
  }, IdentityLeakError);
  assert.equal(returned, undefined);
});

// --- A name that is also an ordinary word ---------------------------------------------------------

test('ruling: whole word, case ignored except that a capitalised name is not found in all-lowercase prose', () => {
  const household = (name) => ({ persons: [{ name, dateOfBirth: '1971-08-19' }] });
  const passes = (name, text) => assert.equal(toolOutput(household(name), text, 'todaysDollars'), JSON.stringify(text), `${name} in ${text}`);
  const throws = (name, text) => leaks(household(name), text);

  // Whole word: a name inside a longer word is not a hit.
  passes('Al', 'Salary, Person A — Superannuation, Accumulation Phase; et alia');
  throws('Al', 'Al’s salary');
  throws('Al', 'Salary, Al');
  // Prose "may" and "will" are not the Person; the name as written, or shouted, is.
  passes('May', 'This figure may change; the fund will pay it.');
  throws('May', 'May retires in 2031');
  throws('May', 'MAY retires');
  passes('Will', 'the fund will pay it');
  throws('Will', 'Will’s pension');
  // Fails closed: a capitalised "Will" opening a sentence is a false alarm, and a name stored in
  // lower case has no exemption.
  throws('Will', 'Will this last?');
  throws('may', 'This figure may change');
  // The price of the exemption: a capitalised name written all-lowercase is not found, however
  // distinctive. The engine writes a name as stored, so this is not a route it has.
  passes('Wilhelmina', 'paid to wilhelmina');
});

// --- Notes ---------------------------------------------------------------------------------------

/**
 * Every note sentence that names a Person, written by the engine's own helper for Wilhelmina (index
 * 0) with its figures, and the sentence the same helper writes for "Person A". The markers the
 * translation reads figures through must give each figure back exactly, so a figure containing the
 * literal text around it (an ISO date, a "cents", a dash) is the case to test.
 */
const W = WILHELMINA.name;
const NOTE_SENTENCES = [
  (name) => salarySacrificeStoppedNoteText(name, '2027-09-01'),
  (name) => concessionalCapExceededNoteText(name, '2027-28', 3_100_000, '2028-05', 2_300_000, 800_000, 100_000, 3_000_000, 'computed from the published wage level'),
  (name) => investmentDistributionNoteText(name, 51_234, 0.02, undefined),
  (name) => investmentDistributionNoteText(name, 51_234, 0.02, 0.5),
  (name) => PENSION_AT_RETIREMENT_NOTE_TEXT['retired before the plan'](name, '2025-01-01', '2026-09-01'),
  (name) => PENSION_AT_RETIREMENT_NOTE_TEXT['under 60'](name, '2027-01-01', 'super account 1'),
  (name) => PENSION_AT_RETIREMENT_NOTE_TEXT['prior pension'](name, true, 'super accounts 1 and 2', '2028-01-01'),
  (name) => PENSION_AT_RETIREMENT_NOTE_TEXT['prior pension'](name, false, 'super account 1', '2028-01-01'),
  (name) => PENSION_AT_RETIREMENT_NOTE_TEXT['over the cap'](name, '$2,100,000.00', '2028-01-01', 'super account 1'),
  (name) => PENSION_AT_RETIREMENT_NOTE_TEXT.switched(name, '2028-01-01', 'super account 1', true),
  (name) => PENSION_AT_RETIREMENT_NOTE_TEXT.switched(name, '2028-01-01', 'super accounts 1 and 2', false),
  (name) => superWithdrawalTaxNote(name, 65, true),
  (name) => superWithdrawalTaxNote(name, 65, false),
];
const CLAIM_SENTENCES = [
  (name) => underTaxFreeAgeClaimNote(name),
  (name) => cessationBeforePreservationAgeClaimNote(name),
  (name) => ttrNotSweptClaimNote(name, 1),
  (name) => accountBasedPensionNotSweptClaimNote(name, 0),
  (name) => releasedEmptyClaimNote(name, 0),
  (name) => releasedClaimNote(name, 0, 67),
  (name) => releasedInPartClaimNote(name, 1),
];

test('every note sentence that names a Person is rewritten by its own helper, and `person` becomes the label', () => {
  for (const sentence of NOTE_SENTENCES) {
    const note = anonymousNote(HOUSEHOLD, { subject: 'super withdrawal', person: W, note: sentence(W) });
    assert.deepEqual(note, { subject: 'super withdrawal', person: 'Person A', note: sentence('Person A') }, sentence(W));
    identityPasses(HOUSEHOLD, note);
  }
  // Literal, not the helper again: the label lands where the name was, and only there.
  assert.equal(
    anonymousNote(HOUSEHOLD, { subject: 'salary sacrifice stopped', person: 'May', note: salarySacrificeStoppedNoteText('May', '2027-09-01') }).note.slice(0, 80),
    'Person B ended their salary sacrifice arrangement from 2027-09-01, so nothing is',
  );
  // Limb 5 joins its claims' notes, including one with "; " inside it and one naming nobody.
  const joined = [...CLAIM_SENTENCES.map((sentence, index) => sentence(index % 2 === 0 ? W : 'May')), 'no Condition of Release is met'].join('; ');
  const limb = anonymousNote(HOUSEHOLD, { subject: 'waterfall limb', limb: 'releasedSuperannuation', available: 0, drawn: 0, note: joined });
  assert.equal(limb.note, [...CLAIM_SENTENCES.map((sentence, index) => sentence(index % 2 === 0 ? 'Person A' : 'Person B')), 'no Condition of Release is met'].join('; '));
});

test('a note sentence no helper wrote is left for the guard, and `person` is matched whole', () => {
  const prose = { subject: 'salary sacrifice stopped', person: 'May', note: `${salarySacrificeStoppedNoteText('May', '2027-09-01')} May said so.` };
  leaks(HOUSEHOLD, anonymousNote(HOUSEHOLD, prose));
  const person = { subject: 'pension minimum basis', person: 'May Fenwick', note: 'a constant' };
  assert.equal(anonymousNote(HOUSEHOLD, person).person, 'May Fenwick');
  leaks(HOUSEHOLD, anonymousNote(HOUSEHOLD, person));
  leaks(HOUSEHOLD, anonymousNote(HOUSEHOLD, { subject: 'waterfall limb', limb: 'releasedSuperannuation', available: 0, drawn: 0, note: `x; ${underTaxFreeAgeClaimNote('May')}!` }));
});

// --- A real walk ---------------------------------------------------------------------------------

const RENAMED = {
  ...DEMO_HOUSEHOLD,
  persons: DEMO_HOUSEHOLD.persons.map((person, index) => ({ ...person, name: ['Wilhelmina Quartermaine', 'Bartholomew Fenwick-Oyelaran'][index] })),
};
const WALK = project(DEMO_SETTINGS, RENAMED, DEMO_ENTRIES);

// SYNTHETIC: a couple built to reach every named line kind — a salary sacrifice that stops, a spouse
// contribution, a TTR, stated fees, a stated sale and a buy with brokerage, a stated lump sum, a
// retirement that switches super to a pension, and a super income yield that is taxed in
// accumulation and refunded in pension phase.
const RICH_HOUSEHOLD = {
  persons: [
    {
      name: 'Wilhelmina Quartermaine',
      dateOfBirth: '1964-01-01',
      superInterests: [
        { phase: 'accumulation', balance: toCents(300_000), statedAdministrationFeePerYear: toCents(125), statedInvestmentFeeRate: 0.005 },
        { phase: 'ttr', balance: toCents(200_000), statedStreamSettings: { commencementDay: '2025-07-01', statedTtrDrawdownRate: 0.07 } },
      ],
      parcels: [{ acquired: '2014-03-11', costBase: toCents(38_000), marketValue: toCents(96_500) }],
      employmentIncomePerFortnight: toCents(3_000),
      workBonusBalance: toCents(0),
    },
    {
      name: 'Bartholomew Fenwick-Oyelaran',
      dateOfBirth: '1959-04-03',
      superInterests: [
        { phase: 'accumulation', balance: toCents(100_000) },
        { phase: 'accountBasedPension', balance: toCents(150_000), statedStreamSettings: { commencementDay: '2022-08-01' } },
      ],
      parcels: [{ acquired: '2016-03-11', costBase: toCents(20_000), marketValue: toCents(30_000) }],
      employmentIncomePerFortnight: toCents(0),
      workBonusBalance: toCents(0),
    },
  ],
  homeStatus: 'occupied',
  openingOffsetBalance: toCents(60_000),
};
const RICH_SETTINGS = {
  asAtDate: '2026-09-01',
  planningHorizonAge: 72,
  economicSeries: { cpi: 0.025, pblci: 0.025, awote: 0.035, mtawe: 0.035 },
  deemingRates: { lower: 0.0175, upper: 0.0375 },
  nominalReturn: 0.065,
  investmentPayoutRate: 0.02,
  investmentPayoutFrankedShare: 0.5,
  superIncomeYieldRate: 0.03,
  superIncomeYieldFrankedShare: 0.1,
};
const entry = (id, type, date, owner, params) => ({ id, date, owner, type, params, enabled: true, createdAt: '2026-08-20' });
const RICH_ENTRIES = [
  entry('spend', 'SPEND_CHANGE', '2026-09-01', 'household', { annualSpend: toCents(70_000) }),
  entry('sac', 'SUPER_CONTRIBUTION', '2026-09-01', 'personA', { kind: 'salarySacrificed', annualAmount: toCents(8_000), interestIndex: 0 }),
  entry('sac-stop', 'SUPER_CONTRIBUTION', '2027-09-01', 'personA', { kind: 'stopped' }),
  entry('spouse', 'SPOUSE_CONTRIBUTION', '2026-11-01', 'personA', { amount: toCents(3_000), receivingInterestIndex: 0 }),
  entry('sell', 'NON_SUPER_INVESTMENT', '2027-03-01', 'personA', { direction: 'sell', amount: toCents(10_000) }),
  entry('buy', 'NON_SUPER_INVESTMENT', '2027-05-01', 'personB', { direction: 'buy', amount: toCents(5_000), incidentalCostsOfAcquisition: toCents(20) }),
  entry('retire-a', 'RETIRE', '2028-01-01', 'personA', {}),
  entry('lump', 'LUMP_SUM_FROM_SUPER', '2029-02-01', 'personA', { amount: toCents(5_000), interestIndex: 0 }),
];
const RICH_WALK = project(RICH_SETTINGS, RICH_HOUSEHOLD, RICH_ENTRIES);

/** A month as a tool would send it: every line's description and every note, translated. */
const anonymousMonth = (household, month) => ({
  month: month.month,
  lines: month.lines.map((line) => anonymousDescription(household, month.month, line.description)),
  notes: month.notes.map((note) => anonymousNote(household, note)),
});
const NAME_PARTS = ['Wilhelmina', 'Quartermaine', 'Bartholomew', 'Fenwick', 'Oyelaran'];

for (const [label, household, walk] of [['the demo household', RENAMED, WALK], ['a fixture reaching every named line', RICH_HOUSEHOLD, RICH_WALK]]) {
  test(`${label}: every month's lines and notes translate, pass the guard, and keep no name`, () => {
    for (const month of walk) {
      const text = identityPasses(household, anonymousMonth(household, month));
      for (const part of NAME_PARTS) assert.ok(!text.includes(part), `${month.month}: ${part}`);
    }
    // Control: untranslated, the same walk is refused.
    leaks(household, walk.map((month) => ({ lines: month.lines.map((line) => line.description), notes: month.notes })));
  });
}

test('the fixture reaches every named line kind, with the spouse contribution in its own direction', () => {
  const kinds = new Set(
    RICH_WALK.flatMap((month) => anonymousMonth(RICH_HOUSEHOLD, month).lines)
      .filter((description) => /Person [AB]/.test(description))
      .map((description) => description.replace(/Person [AB]/g, '<P>').replace(/, \d{4}-\d{2}$/, ', <FY>')),
  );
  for (const kind of [
    'Account-Based Pension payment, <P>',
    'Transition to retirement pension, <P>',
    'Superannuation lump sum, <P>',
    'Investment growth, <P> — Financial investments outside superannuation',
    'Investment growth, <P> — Superannuation, Accumulation Phase',
    'Investment growth, <P> — Superannuation, TTR',
    'Investment growth, <P> — Account-Based Pension',
    'Superannuation Guarantee into superannuation, <P> — Superannuation, Accumulation Phase',
    'Non-Super Portfolio sale, <P>',
    'Non-Super Portfolio purchase, <P>',
    'Non-Super Portfolio brokerage, <P>',
    'Superannuation administration fee, <P> — Superannuation, Accumulation Phase',
    'Superannuation investment fee, <P> — Superannuation, Accumulation Phase',
    'Superannuation fund earnings tax, <P> — Superannuation, Accumulation Phase, <FY>',
    'Superannuation franking credit refund, <P> — Account-Based Pension, <FY>',
    'Salary sacrifice into superannuation, <P> — Superannuation, Accumulation Phase',
    'Spouse contribution, <P> → <P>',
  ]) {
    assert.ok(kinds.has(kind), kind);
  }
  const spouse = RICH_WALK.flatMap((month) => anonymousMonth(RICH_HOUSEHOLD, month).lines).filter((description) => description.startsWith('Spouse contribution'));
  assert.deepEqual(spouse, ['Spouse contribution, Person A → Person B']);
  const subjects = new Set(RICH_WALK.flatMap((month) => month.notes).filter((note) => NAME_PARTS.some((part) => note.note.includes(part))).map((note) => note.subject));
  assert.deepEqual([...subjects].sort(), ['investment distribution', 'pension at retirement', 'salary sacrifice stopped', 'super withdrawal', 'waterfall limb']);
  assert.ok(RICH_WALK.flatMap((month) => month.notes).some((note) => note.person === RICH_HOUSEHOLD.persons[1].name), 'a note whose `person` is Person B');
});

test('completeness: a named line or note sentence with no helper reaches the guard untranslated, and it throws', () => {
  const month = RICH_WALK.find((each) => each.lines.some((line) => line.description.startsWith('Spouse contribution')));
  const [name] = RICH_HOUSEHOLD.persons.map((person) => person.name);
  const line = { ...month, lines: [...month.lines, { ...month.lines[0], description: `Carer payment, ${name}` }] };
  assert.equal(anonymousMonth(RICH_HOUSEHOLD, line).lines.at(-1), `Carer payment, ${name}`);
  leaks(RICH_HOUSEHOLD, anonymousMonth(RICH_HOUSEHOLD, line));
  const note = { ...month, notes: [...month.notes, { subject: 'carer payment', person: name, note: `${name} cares for a parent.` }] };
  leaks(RICH_HOUSEHOLD, anonymousMonth(RICH_HOUSEHOLD, note));
  // Control: the month itself goes out.
  identityPasses(RICH_HOUSEHOLD, anonymousMonth(RICH_HOUSEHOLD, month));
});

test('the forecast did not move when its descriptions moved into helpers', () => {
  // 2026-09-24: hashed without `closingNonSuperPortfolio`, a balance the walk already held at the
  // close — so this is still the digest of every figure it pinned before.
  // The full walk's own digest is pinned in `app-month-to-rows.test.mjs`.
  // **RE-PINNED 2026-09-24 (T135).** Both fixtures cross the assets-test free area, so the assets
  // excess now floors to the nearest $500 (SSA 1991 s1064 point 1064-G7) and the Age Pension a
  // handful of their months pay is a few cents to a few dollars higher than before — see
  // `test/core-age-pension.test.mjs`'s T135 tests for the hand-worked rule.
  // **RE-PINNED 2026-09-25 (P3-17 slice 4) — RICH only, see `app-chat-get-month.test.mjs`'s copy of
  // this test for the mechanism (Wilhelmina's accumulation fee moves to WAGES pre-retirement).**
  // 2026-09-25: and without `assetsTestThresholds`, read off the entitlement the walk already computed — no figure.
  // RE-PINNED 2026-09-29 (LR-1 slice 2, the CGT reform from 1 July 2027): only the limb-3
  // `available` figure moved, in 94 months from 2027-08, every one DOWN. It is the whole-portfolio
  // probe, and from 1 July 2027 the part of the gain after the stamp is indexed and never halved,
  // so selling everything would cost more tax (32c a dollar at the demo's rate). Slice 2 moved no line: without Div 119 the demo's own sales in 2033 stay under the tax-free threshold.
  // RE-PINNED 2026-09-29 (LR-1 slice 3, Div 119's minimum tax): Dana sells from 2033 with no salary
  // and no Age Pension, so 30% of the later part of each gain, less LITO, is now charged: 11
  // `Income tax on capital gain, Dana` lines, 2033-03 to 2035-05 — $1,615 in FY2032-33, $2,156 in
  // FY2033-34 and $1,793 in FY2034-35, each equal to 30% of that year's later gain less $700 to the
  // dollar, replayed by hand. The last comes back in the July 2035 true-up: she is paid the pension from
  // June 2035. Each sale grows by exactly its tax, so the portfolio runs out a month sooner (2037-05),
  // and lower assets raise the Age Pension in 417 months from 2033-09. The limb-3 probe moved again,
  // DOWN in 55 months from 2031-06, once her salary stops.
  // RE-PINNED 2026-09-29 (LR-1 slice 2): only the limb-3 `available` probe moved, in 41 months from
  // 2027-08 (29 down; 12 up, each July-to-November after a June distribution, which since the
  // reform lowers the fully-taxed later part rather than the half-taxed deferred one). No line
  // moved.
  const sha256 = (value) =>
    createHash('sha256')
      .update(JSON.stringify(value, (key, field) => (key === 'closingNonSuperPortfolio' || key === 'assetsTestThresholds' ? undefined : field)))
      .digest('hex');
  // RE-PINNED 2026-09-29 (LR-1 slice 4): no figure moved. Dana's 11 `Income tax on capital gain` lines (2033-03 to 2035-05) each gained one `determination` entry, `CGT_MINIMUM_TAX_DETERMINATION`; a whole-walk diff finds those 11 and nothing else.
  assert.equal(sha256(project(DEMO_SETTINGS, DEMO_HOUSEHOLD, DEMO_ENTRIES)), 'a895e6545773fc348c834ab324eeb80882f678276716dca7b57cbaad43e7df28');
  // RE-PINNED 2026-09-29 (LR-1 slice 3, Div 119's minimum tax): RICH moved only in the limb-3
  // `available` probe again, DOWN in 36 months from 2028-01 (after Wilhelmina's RETIRE, selling
  // everything would now pay the minimum tax). No line moved.
  assert.equal(sha256(RICH_WALK), '39848c29809761dec63ecc1d855665934c5d1086466077f1efa2428091308ad4');
});

test('the financial-year summary goes out through the guard', () => {
  assert.equal(financialYearsOutput(RENAMED, WALK, DEMO_SETTINGS), JSON.stringify(labelledFinancialYears(RENAMED, WALK, DEMO_SETTINGS)));
  // A Person whose stored name is the label's own word proves the guard is on this path.
  const money = { persons: [{ ...RENAMED.persons[0], name: 'money' }, RENAMED.persons[1]] };
  assert.throws(() => financialYearsOutput(money, WALK, DEMO_SETTINGS), IdentityLeakError);
});
