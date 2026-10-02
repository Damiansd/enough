// P8-5 — the Household and the Settings become editable, and the four properties the slice exists
// to get right:
//
//   1. **ONE CLOCK.** `Settings.asAtDate` is the plan's only "today" and no balance carries a
//      valuation date of its own, so a balance typed today under an older date is compounded
//      forward from the older date and counted twice — silently, because both figures are
//      well-formed. The defence is structural and not a warning: there is exactly ONE builder that
//      takes a balance, it takes the date in the same required field of the same object, and the
//      other builder cannot write a date at all. §4 pins both halves, in source and through `tsc`.
//   2. **one validator, and one write path.** Everything goes through `savePlan` — `parsePlan`
//      then `project()` — before the transport is named at all. Every refusal case asserts the
//      spy's call count is **zero**, with a positive control that the same spy does get called.
//   3. **ADD, never REMOVE.** Adding creates no orphan; removing a Person creates an entry whose
//      owner names nobody, and two of the four per-Person entry types silently skip such an entry
//      rather than refusing it (TODO.md P4-12). §7 fails if a removal control or builder appears.
//   4. **a household edit moves EVERY scenario**, because they share one base position (ADR-0002).
//      §6 asserts it on two scenarios, and §5 pins the sentence that says so on screen.
//
// The DOM writer itself is pinned as SOURCE, exactly as `test/app-entry-form.test.mjs` and
// `test/app-scenario-panel.test.mjs` pin theirs: there is no DOM under `node:test` and
// `typescript` is the one dev dependency (TODO.md P2-9a). §9 says what that leaves unproven.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { DEMO_PLAN, DEMO_SETTINGS } from '../dist/app/demoHousehold.js';
import { TTR_PAYMENT_LINE, project } from '../dist/core/projection.js';
import { parsePlan, PlanFileAmountError, PlanFileDateError, PlanFileHouseholdError, PlanFileSettingsError } from '../dist/core/parsePlan.js';
import { division293ReleaseDestination } from '../dist/core/division293Release.js';
import { scenarioWalks } from '../dist/app/scenarioWalks.js';
import { UNNAMED_PERSON_LABELS } from '../dist/app/ownerNames.js';
import {
  AWOTE_NOTICE,
  MTAWE_NOTICE,
  PBLCI_NOTICE,
  PHASE_NOT_SAVED,
  TTR_NOT_SAVED,
  TTR_RATE_BESIDE,
  FEE_RATE_OVER_THREE_PERCENT_WARNING,
  feeRateDollarsAYear,
  feeRateWarning,
} from '../dist/app/settingsPanel.js';
import {
  valueJustBefore1July2027BoxShown,
  totalSuperBalanceAt30JuneBoxShown,
  thirtyJuneYear,
  unusedCapYears,
  BLANK_PARCEL,
  BLANK_PERSON,
  EMPLOYER_ACCOUNT_NEEDED,
  EMPLOYER_ACCOUNT_NEEDED_PENSION,
  BLANK_SUPER_INTEREST,
  AT_RETIREMENT_CHOICES,
  HOME_STATUS_CHOICES,
  HOME_STATUS_LABELS,
  HOME_STATUS_OPTIONS,
  NO_RELEASE_ELECTION,
  PRIOR_PENSION_CHOICES,
  SUPER_PHASE_CHOICES,
  SUPER_PHASE_OPTIONS,
  AT_RETIREMENT_KEEP,
  AT_RETIREMENT_SWITCH,
  atRetirementBoxShown,
  PRIOR_PENSION_NO,
  PRIOR_PENSION_YES,
  TTR_RATE_RANGE_PERCENT,
  centsToDollars,
  electableSuperInterests,
  electedReleaseInterest,
  changedPositionPaths,
  dollarsToCents,
  fractionAsPercent,
  negativeFeeObjection,
  percentAsFraction,
  planWithSettings,
  planWithStatedPosition,
  positionFormValues,
  positionSaveConfirmation,
  positionWithParcel,
  positionWithPerson,
  positionWithSuperInterest,
  rateAsTyped,
  savePlan,
  settingsFormValues,
  ttrBoxObjections,
  employerAccountObjection,
  employerPaysIntoShown,
  employerPaysIntoOptionLabel,
  ttrStreamBoxesShown,
  validatedPlan,
  walkthroughPlan,
} from '../dist/app/planEdits.js';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = join(ROOT, 'src');
const read = (...parts) => readFileSync(join(SRC, ...parts), 'utf8');

/** Comments out, string literals blanked — so prose cannot satisfy a source assertion. */
const executableCode = (text) =>
  text
    .replaceAll(/\/\*[\s\S]*?\*\//g, '')
    .replaceAll(/`(?:[^`\\]|\\.)*`|'(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*"|\/\/.*$/gm, (match) =>
      match.startsWith('//') ? '' : '""',
    );

const literals = (raw) =>
  [...raw.matchAll(/\/\*[\s\S]*?\*\/|`(?:[^`\\]|\\.)*`|'(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*"|\/\/.*$/gm)]
    .map(([match]) => match)
    .filter((match) => !match.startsWith('//') && !match.startsWith('/*'))
    .map((match) => match.slice(1, -1));

const imports = (raw) => [...raw.matchAll(/\bfrom\s*['"]([^'"]+)['"]/g)].map(([, specifier]) => specifier);

/**
 * **A pin on an EXPLANATION, not on its wording.** Each subject is a name and one or more concept
 * groups; every group must be matched and any alternative within a group satisfies it. So the
 * sentence can be rewritten in plainer English — or have an accountant's phrase taken out of it —
 * without this test moving, while an explanation that is deleted, emptied, or cut down to a stub
 * fails the length floor and every subject at once. The floor is part of the assertion: it is what
 * stops this degenerating into "some string is present".
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

/**
 * **P17-3 — where a rule went when it left an ⓘ box.** Each box now says what it does in a line or
 * two and never restates a figure, a threshold or a rule; those live only in `userguide.md`, at the
 * label the box's `infoButton` call names. A pin that used to hold a rule in a notice holds it here
 * instead, on the guide's section: the words under `{#label}`, down to the next heading of the same
 * or a higher level, with the P17-4/5 tags reduced to the text a reader sees.
 */
const GUIDE = readFileSync(join(ROOT, 'userguide.md'), 'utf8').replaceAll(/\{\{(?:name|fig)[^|{}]*\|([^{}]*)\}\}/g, '$1');
const guideSection = (label) => {
  const lines = GUIDE.split('\n');
  const at = lines.findIndex((line) => /^#+ /.test(line) && line.endsWith(`{#${label}}`));
  assert.ok(at >= 0, `userguide.md has no heading labelled {#${label}}`);
  const level = /^#+/.exec(lines[at])[0].length;
  const end = lines.findIndex((line, i) => i > at && /^#+ /.test(line) && /^#+/.exec(line)[0].length <= level);
  return lines.slice(at, end < 0 ? undefined : end).join(' ');
};

const PANEL_RAW = read('app', 'settingsPanel.ts');
/**
 * One exported line of prose, as the USER reads it — the source is wrapped and concatenated, so a
 * phrase split across two literals ("cost' + ' base") is present on screen and absent from the file.
 */
const prose = (name) => literals(new RegExp(`export const ${name} =([\\s\\S]*?);\\n`).exec(PANEL_RAW)[1]).join('');
const PANEL = executableCode(PANEL_RAW);
const EDITS_RAW = read('app', 'planEdits.ts');
const EDITS = executableCode(EDITS_RAW);
const MAIN_RAW = read('app', 'main.ts');
const MAIN = executableCode(MAIN_RAW);

const PLAN = parsePlan(DEMO_PLAN);
const POSITION = positionFormValues(PLAN);
const SETTINGS = settingsFormValues(PLAN);

/** A transport that records every call. It is the COUNT that matters, not what it does. */
const spy = (behaviour = async () => {}) => {
  const calls = [];
  return { calls, writePlan: async (plan) => { calls.push(plan); return behaviour(plan); } };
};

const thrown = async (fn) => {
  try { await fn(); } catch (error) { return error; }
  return assert.fail('nothing was thrown');
};

const wealth = (month) => month.closingBalance + month.protectedAssets + month.assessableAssets;
const digest = (months) => createHash('sha256').update(JSON.stringify(months)).digest('hex');

/** The same position with one Person's one field replaced. */
const withPerson = (values, index, changes) => ({
  ...values,
  persons: values.persons.map((person, at) => (at === index ? { ...person, ...changes } : person)),
});

/** The same position with one Person's nth super interest replaced. */
const withInterest = (values, index, position, changes) =>
  withPerson(values, index, {
    superInterests: values.persons[index].superInterests.map((interest, at) =>
      at === position ? { ...interest, ...changes } : interest),
  });

// --- §0 The transform is doing what the rest of this file assumes --------------------------------

test('the control on the transform: prose is erased, code is kept', () => {
  assert.match(PANEL_RAW, /ONE CLOCK, AND THE BALANCES ARE SAVED WITH IT/, 'the header sentence this file relies on has gone');
  assert.doesNotMatch(PANEL, /ONE CLOCK, AND THE BALANCES ARE SAVED WITH IT/, 'executableCode kept a comment');
  assert.match(PANEL, /mountSettingsPanel/, 'executableCode erased real code, so every assertion below is vacuous');
});

// --- §1 The builders produce a plan the door accepts, and drop nothing ---------------------------

test('the position round-trips: plan → boxes → plan is the SAME plan, to the field', () => {
  // The strongest statement of "the form drops nothing": `statedStreamSettings` (Ash's
  // commencement day, which limb 2 is keyed off), `openingOffsetBalance`, both people, the parcel.
  const back = parsePlan(planWithStatedPosition(PLAN, POSITION));
  assert.deepEqual(back, PLAN);
  assert.equal(back.household.persons[1].superInterests[0].statedStreamSettings.commencementDay, '2022-08-01');
  assert.equal(back.household.openingOffsetBalance, 4_200_000);
});

test('an employer contribution destination survives a position save — the form drops nothing it cannot show', () => {
  // **The migration hazard this closes** (P6-8 brief 3, chunk 2a). `planWithStatedPosition` REBUILDS
  // each interest out of the two boxes the form has, so a field the form cannot show is dropped
  // unless it is carried through by position — and a dropped destination leaves a file that still
  // parses, still projects and still draws a chart, with the nomination silently gone.
  const nominated = parsePlan({
    ...JSON.parse(JSON.stringify(DEMO_PLAN)),
    household: {
      ...JSON.parse(JSON.stringify(DEMO_PLAN.household)),
      persons: JSON.parse(JSON.stringify(DEMO_PLAN.household.persons)).map((person, index) =>
        index === 0
          ? { ...person, superInterests: [{ ...person.superInterests[0], statedEmployerContributionDestination: 'superannuationGuarantee' }, { phase: 'accumulation', balance: 0 }] }
          : person),
    },
  });
  assert.equal(nominated.household.persons[0].superInterests[0].statedEmployerContributionDestination, 'superannuationGuarantee');

  // (Two accounts and a salary: since register O82 the "Employer pays into" select holds the
  // nomination, and it is written only while shown. A one-account nomination is redundant and
  // is not written: that is pinned below.)
  // Through the boxes and back: the balance the form DOES hold is re-typed, and the nomination the
  // select holds is still there.
  const back = parsePlan(planWithStatedPosition(nominated, positionFormValues(nominated)));
  assert.deepEqual(back, nominated);
  assert.equal(back.household.persons[0].superInterests[0].statedEmployerContributionDestination, 'superannuationGuarantee');

  // Matched BY POSITION, on `statedStreamSettings`'s rule: an interest added at the end inherits
  // nothing, because it is a new interest and nobody has nominated it.
  const added = parsePlan(planWithStatedPosition(
    nominated,
    withPerson(positionFormValues(nominated), 0, {
      superInterests: [...positionFormValues(nominated).persons[0].superInterests, { ...BLANK_SUPER_INTEREST, balance: '1000' }],
    }),
  ));
  assert.equal(added.household.persons[0].superInterests[2].statedEmployerContributionDestination, undefined);
  assert.equal(added.household.persons[0].superInterests[0].statedEmployerContributionDestination, 'superannuationGuarantee');
});

test('a Division 293 release election survives a position save — and dropping it would ANSWER the question', () => {
  // ⚠️ **THE HAZARD MOVED ON 2026-09-20 (P6-11) AND DID NOT GO AWAY.** Until that day
  // `planWithStatedPosition` carried `statedReleaseAuthorityDestination` through by INTEREST
  // POSITION, because the form had no box for it; the form states it now
  // (`PersonFormValues.releaseAuthorityInterest`), so the builder writes the key from the box and
  // from nothing else. What is unchanged is the consequence of losing it: for the employer
  // destination a drop leaves the destination UNDETERMINED — a question unanswered — while here
  // PRESENCE IS THE ELECTION, so a drop silently ANSWERS it. The Subdiv 293-B election becomes a
  // decision not to elect and the Division 293 charge goes back to the Person's cash, in a file
  // that still parses, still projects and still draws a chart. The round trip is therefore
  // asserted exactly as it was, over the new route (register O84, P6-9 M1, P6-11).
  const elected = parsePlan({
    ...JSON.parse(JSON.stringify(DEMO_PLAN)),
    household: {
      ...JSON.parse(JSON.stringify(DEMO_PLAN.household)),
      persons: JSON.parse(JSON.stringify(DEMO_PLAN.household.persons)).map((person, index) =>
        index === 0
          ? {
            ...person,
            superInterests: [{
              ...person.superInterests[0],
              statedEmployerContributionDestination: 'superannuationGuarantee',
              statedReleaseAuthorityDestination: 'division293',
            }, { phase: 'accumulation', balance: 0 }],
          }
          : person),
    },
  });
  assert.equal(elected.household.persons[0].superInterests[0].statedReleaseAuthorityDestination, 'division293');
  // The box is filled FROM the plan, which is what makes the round trip a round trip rather than
  // the builder quietly re-stating something the user never saw.
  assert.equal(positionFormValues(elected).persons[0].releaseAuthorityInterest, '0');

  // Through the boxes and back: the election the form now HOLDS, and the employer destination it
  // still does not, both survive — the sibling fields travel by different routes and independently.
  const back = parsePlan(planWithStatedPosition(elected, positionFormValues(elected)));
  assert.deepEqual(back, elected);
  assert.equal(back.household.persons[0].superInterests[0].statedReleaseAuthorityDestination, 'division293');
  assert.equal(back.household.persons[0].superInterests[0].statedEmployerContributionDestination, 'superannuationGuarantee');

  // Two saves, not one: a field carried once and dropped on the second pass is the same silent loss.
  const twice = parsePlan(planWithStatedPosition(back, positionFormValues(back)));
  assert.deepEqual(twice, elected);

  // An interest ADDED at the end inherits nothing, because the box names a position and that
  // position is 0. It must NOT inherit the election in particular — two electing interests of one
  // Person is refused at the door, so an inheriting rebuild would make the plan unsaveable as well
  // as untrue.
  const added = parsePlan(planWithStatedPosition(
    elected,
    withPerson(positionFormValues(elected), 0, {
      superInterests: [...positionFormValues(elected).persons[0].superInterests, { ...BLANK_SUPER_INTEREST, balance: '1000' }],
    }),
  ));
  assert.equal(added.household.persons[0].superInterests[2].statedReleaseAuthorityDestination, undefined);
  assert.equal(added.household.persons[0].superInterests[0].statedReleaseAuthorityDestination, 'division293');
});

// --- §1b The Subdiv 293-B election is STATED ON THE FORM (register O84 residual (iii)) ------------
//
// ⚠️ **WHAT THIS SECTION EXISTS FOR.** P6-10 modelled the election end to end and left a gap that
// was not in the walk at all: `statedReleaseAuthorityDestination` could be set only by hand-editing
// `plan.json`, so every plan built through the app took the Division 293 charge out of CASH — the
// flattering direction, because it leaves a means-test-exempt accumulation interest standing and
// spends assessed Offset cash, over-stating the Age Pension of a Household whose payer is below Age
// Pension age. The control closes that; these tests are the four rules it must not break.
//
//   1. **Presence IS the election, and absence is a DECLINED election** — so nothing is
//      pre-selected, and a Person's ONLY accumulation interest is never derived from their silence.
//   2. **At most ONE interest per Person.**
//   3. **Never a retirement-phase interest** — a release out of a stream is a commutation.
//   4. **Clearing removes the KEY**, and does not write an undefined-valued one.
//
// Rules 2 and 3 are held by the SHAPE and not by a check: the form holds ONE string per Person, so
// two marks cannot be written down, and the positions it will accept are `electableSuperInterests`,
// which lists accumulation interests only. The door refuses both anyway, and the last test here
// proves the door still would — a defence that is unreachable is not a defence that is gone.

test('nothing is PRE-SELECTED: a Person with exactly one accumulation interest and no election reads as NO ELECTION', () => {
  // Dana holds one interest, it is in the accumulation phase, and the demo plan states no election.
  // That is the precise shape a helpful default would be written for, and the helpful default is
  // the defect: silence is a declined election (`core/division293Release.ts`), so deriving the sole
  // interest from it would re-open O84 in the OPPOSITE direction — the charge taken out of super
  // for a Person who would really have paid it in cash.
  assert.equal(PLAN.household.persons[0].superInterests.length, 1);
  assert.equal(PLAN.household.persons[0].superInterests[0].phase, 'accumulation');
  assert.deepEqual([...electableSuperInterests(POSITION.persons[0])], [0]);
  // The other Person's interest is an account-based pension and is on nobody's list — asserted
  // here as well as in the retirement-phase test below, because a list that quietly widened to
  // "every interest" would otherwise be caught by one test only.
  assert.deepEqual([...electableSuperInterests(POSITION.persons[1])], []);
  assert.equal(POSITION.persons[0].releaseAuthorityInterest, NO_RELEASE_ELECTION);
  assert.equal(electedReleaseInterest(POSITION.persons[0]), undefined);
  // And it survives the builder as an ABSENT key, which is what the engine reads back as silence.
  const candidate = planWithStatedPosition(PLAN, POSITION);
  const interest = candidate.household.persons[0].superInterests[0];
  assert.equal(Object.hasOwn(interest, 'statedReleaseAuthorityDestination'), false, 'a plan with no election carries the key anyway');
  assert.equal(division293ReleaseDestination(parsePlan(candidate).household.persons[0]).election, 'none');
});

test('an election TYPED INTO THE BOX reaches the plan file, and survives two successive saves', async () => {
  const chosen = withPerson(POSITION, 0, { releaseAuthorityInterest: '0' });
  const first = parsePlan(planWithStatedPosition(PLAN, chosen));
  assert.equal(first.household.persons[0].superInterests[0].statedReleaseAuthorityDestination, 'division293');
  // The resolver — the engine's own reader — agrees, by identity and not by value.
  const resolved = division293ReleaseDestination(first.household.persons[0]);
  assert.equal(resolved.election, 'released');
  assert.equal(resolved.slot, 0);
  assert.equal(resolved.interest, first.household.persons[0].superInterests[0]);
  // **THE ROUND TRIP, TWICE.** The box is refilled from the plan that is now on disk and saved
  // again: a field written once and lost on the second pass is the persistence hazard this
  // builder has hit twice before, and one save proves nothing about it.
  const second = parsePlan(planWithStatedPosition(first, positionFormValues(first)));
  assert.deepEqual(second, first);
  const third = parsePlan(planWithStatedPosition(second, positionFormValues(second)));
  assert.deepEqual(third, first);
  // And it goes through the one door: `savePlan` parses AND walks every scenario before the
  // transport is named at all.
  const transport = spy();
  const saved = await savePlan(transport, planWithStatedPosition(PLAN, chosen));
  assert.equal(transport.calls.length, 1);
  assert.equal(saved.plan.household.persons[0].superInterests[0].statedReleaseAuthorityDestination, 'division293');
  assert.ok(saved.months.length > 0);
});

test('CLEARING the election REMOVES the key — it does not write an undefined-valued one', () => {
  // The two readers both care about the KEY and not about a value: the door's
  // `checkReleaseAuthorityDestinations` counts interests whose field is `!== undefined`, and
  // `JSON.stringify` drops an undefined-valued key on the way to disk, so a cleared election that
  // left `statedReleaseAuthorityDestination: undefined` behind would be a plan whose in-memory
  // shape and whose file disagree.
  const elected = parsePlan(planWithStatedPosition(PLAN, withPerson(POSITION, 0, { releaseAuthorityInterest: '0' })));
  const cleared = planWithStatedPosition(elected, withPerson(positionFormValues(elected), 0, { releaseAuthorityInterest: NO_RELEASE_ELECTION }));
  const interest = cleared.household.persons[0].superInterests[0];
  assert.equal(Object.hasOwn(interest, 'statedReleaseAuthorityDestination'), false, 'clearing wrote the key with an undefined value');
  assert.deepEqual(Object.keys(interest), ['phase', 'balance']);
  assert.ok(!JSON.stringify(cleared).includes('statedReleaseAuthorityDestination'), 'the cleared election is still in the file text');
  // And what the engine reads back is silence, which is the statutory default and not a blank.
  assert.equal(division293ReleaseDestination(parsePlan(cleared).household.persons[0]).election, 'none');
  assert.deepEqual(parsePlan(cleared), PLAN);
});

test('a RETIREMENT-PHASE interest is not electable, so the door’s refusal is unreachable from the form', () => {
  // Ash's interest is an account-based pension. A release served on it would be a COMMUTATION.
  assert.equal(PLAN.household.persons[1].superInterests[0].phase, 'accountBasedPension');
  assert.deepEqual([...electableSuperInterests(POSITION.persons[1])], []);
  // Even a hand-set box naming position 0 resolves to NO election, which is the one way this state
  // is reachable at all: mark an accumulation interest, then change that interest's phase.
  const marked = withPerson(POSITION, 1, { releaseAuthorityInterest: '0' });
  assert.equal(electedReleaseInterest(marked.persons[1]), undefined);
  const built = planWithStatedPosition(PLAN, marked);
  assert.equal(Object.hasOwn(built.household.persons[1].superInterests[0], 'statedReleaseAuthorityDestination'), false);
  assert.deepEqual(parsePlan(built), PLAN);
  // **THE POSITIVE CONTROL, because an unreachable refusal is not a refusal that has gone away.**
  // The door still refuses the plan a hand-edited file could hold, by name and by path.
  const byHand = refusalFrom(() => parsePlan({
    ...JSON.parse(JSON.stringify(DEMO_PLAN)),
    household: {
      ...JSON.parse(JSON.stringify(DEMO_PLAN.household)),
      persons: JSON.parse(JSON.stringify(DEMO_PLAN.household.persons)).map((person, index) =>
        index === 1
          ? { ...person, superInterests: [{ ...person.superInterests[0], statedReleaseAuthorityDestination: 'division293' }] }
          : person),
    },
  }));
  assert.ok(byHand instanceof PlanFileHouseholdError);
  assert.match(byHand.message, /COMMUTATION/);
});

test('TWO marked interests cannot be WRITTEN DOWN: one Person, one box, one value', () => {
  // Two accumulation interests, so the illegal plan is a real possibility rather than a shape with
  // nowhere to land. The form holds ONE string for this Person, so whichever position it names,
  // exactly one interest carries the key — there is no second field to put the second mark in.
  const two = parsePlan(planWithStatedPosition(PLAN, positionWithSuperInterest(POSITION, 0, { ...BLANK_SUPER_INTEREST, balance: '25000' })));
  assert.equal(two.household.persons[0].superInterests.length, 2);
  const position = positionFormValues(two);
  assert.deepEqual([...electableSuperInterests(position.persons[0])], [0, 1]);
  for (const choice of ['0', '1']) {
    const built = planWithStatedPosition(two, withPerson(position, 0, { releaseAuthorityInterest: choice }));
    const marked = built.household.persons[0].superInterests
      .filter((interest) => Object.hasOwn(interest, 'statedReleaseAuthorityDestination'));
    assert.equal(marked.length, 1, `choosing ${choice} marked ${marked.length} interests`);
    assert.equal(division293ReleaseDestination(parsePlan(built).household.persons[0]).slot, Number(choice));
  }
  // **THE POSITIVE CONTROL for the refusal that is now out of reach**: two marks made by hand are
  // still refused at the door, so the shape defence and the refusal are both live.
  const byHand = refusalFrom(() => parsePlan({
    ...two,
    household: {
      ...two.household,
      persons: two.household.persons.map((person, index) =>
        index === 0
          ? { ...person, superInterests: person.superInterests.map((interest) => ({ ...interest, statedReleaseAuthorityDestination: 'division293' })) }
          : person),
    },
  }));
  assert.ok(byHand instanceof PlanFileHouseholdError);
  assert.match(byHand.message, /Name exactly one/);
  // The two Persons are independent of each other, which is the other half of "one per Person".
  const both = parsePlan(planWithStatedPosition(
    two,
    { ...withPerson(position, 0, { releaseAuthorityInterest: '1' }) },
  ));
  assert.equal(both.household.persons[0].superInterests[1].statedReleaseAuthorityDestination, 'division293');
  assert.equal(both.household.persons[1].superInterests[0].statedReleaseAuthorityDestination, undefined);
});

test('the BUILDER has exactly one writer of the key, and no second route that could disagree', () => {
  // ⚠️ **THE CARRY-BY-POSITION IS GONE ON PURPOSE, AND KEEPING BOTH WOULD BE WORSE THAN EITHER.**
  // Before the box existed the builder carried the key from the plan by interest position; if it
  // still did, the carried key and the box would be two writers of one fact and CLEARING the box
  // would leave the charge coming out of the fund anyway — the user's own instruction ignored, in
  // the flattering direction. So: one write, conditioned on the box.
  assert.equal([...EDITS.matchAll(/statedReleaseAuthorityDestination:/g)].length, 1, 'a second writer of the release election');
  assert.match(EDITS_RAW, /elected === position \? \{ statedReleaseAuthorityDestination: 'division293' \}/);
  assert.doesNotMatch(EDITS, /heldRelease/, 'the election is carried by position as well as stated — two writers of one fact');
  // The election is read in exactly one place, and both the renderer and the builder go through it.
  assert.equal([...EDITS.matchAll(/export const electedReleaseInterest/g)].length, 1);
  assert.equal([...EDITS.matchAll(/electableSuperInterests\(person\)/g)].length, 1);
  // And a `??`-shaped default beside the box would be the derivation the engine refuses.
  assert.doesNotMatch(EDITS, /releaseAuthorityInterest \?\?/, 'the election box has grown a default');
});

/** The release-election notice as one sentence: the source's concatenation and quotes removed. */
const RELEASE_ELECTION_NOTICE_TEXT = /export const RELEASE_ELECTION_NOTICE =([\s\S]*?);\n/.exec(PANEL_RAW)[1]
  .replaceAll(/'\s*\+\s*\n?\s*'/g, '')
  .replaceAll(/[\n']/g, ' ');

test('the PANEL offers one single-choice control per Person, with an explicit “no election” option', () => {
  const row = /const electionRow[\s\S]*?\n\};/.exec(PANEL_RAW)[0];
  // ONE select, named once, so two marks have nowhere to go; and no checkbox anywhere on the page,
  // which is the shape that CAN express the illegal state and then has to be validated.
  assert.equal([...row.matchAll(/document\.createElement\('select'\)/g)].length, 1, 'the election row builds more than one control');
  assert.match(row, /chooser\.name = 'releaseAuthorityInterest';/);
  assert.deepEqual(literals(PANEL_RAW).filter((word) => /checkbox|radio/.test(word)), [],
    'the election is offered as a checkbox or radio per interest — two of them are an illegal plan');
  // The options are the ELECTABLE positions and nothing else — the retirement-phase interests are
  // not on the list at all, so the commutation the door refuses cannot be chosen.
  assert.match(row, /for \(const position of electableSuperInterests\(person\)\)/);
  // Nothing is pre-selected: the chosen option is the plan's own answer, and "none" for silence.
  assert.match(row, /const elected = electedReleaseInterest\(person\);/);
  assert.match(row, /chooser\.value = elected === undefined \? NO_RELEASE_ELECTION : String\(elected\);/);
  assert.doesNotMatch(row, /\|\|/, 'the election control has grown a fallback');
  // The box is read back into the form values, and the save goes out through the ONE builder and
  // the ONE announced write — bypassing `savePlan` would show up here.
  assert.match(PANEL_RAW, /releaseAuthorityInterest: field\('releaseAuthorityInterest'\)/);
  assert.match(PANEL, /void saveAndAnnounce\(host, announce, planWithStatedPosition\(host\.currentPlan\(\), typed\)\)/);
  // One control per Person block, appended where that Person's interests are listed.
  assert.equal([...PANEL.matchAll(/electionRow\(person\)/g)].length, 1);
  // A phase change redraws, so an interest that stops being electable leaves the list — and the
  // election with it — while the user is looking at it, rather than silently at the save.
  assert.match(PANEL_RAW, /phase\.addEventListener\('change', onPhaseChange\)/);
  assert.match(PANEL, /const redrawFromForm = \(\): void => show\(read\(\)\);/);
  // And the box says what the control is for: that naming no account is itself an answer, and what
  // it does. These are SUBJECTS, not sentences: the words may be made plainer at any time, but an
  // explanation that stops covering one of them — or is emptied out — fails here.
  explains('the release-election box', `${prose('RELEASE_ELECTION_SUMMARY')} ${RELEASE_ELECTION_NOTICE_TEXT}`, [
    ['that naming no account is itself an answer rather than a question left blank',
      [/real answer|is an answer|a choice, not|not a question left|not an unanswered/i],
      [/default|if you do nothing/i]],
    ['that only accumulation accounts are offered', [/still building up|accumulation/i], [/listed|offered|on the list|available|shown/i]],
  ], 150);
  // P17-3: the rules behind the choice left the box for the guide section it links to, and are
  // pinned THERE, subject for subject, so moving them did not delete them.
  assert.match(PANEL_RAW, /infoButton\(RELEASE_ELECTION_SUMMARY, RELEASE_ELECTION_NOTICE, 'guide:division-293-election'\)/);
  explains('the guide on the release election', guideSection('division-293-election'), [
    ['that naming no account is itself an answer', [/real, deliberate answer|real answer/i], [/if you decide nothing|if you do nothing/i]],
    ['that this build never picks an account on the user’s behalf',
      [/never (picks|chooses)/i], [/on your behalf|even if you only have one/i]],
    ['that one account only may be named', [/one named|\bONE account\b|one account only|a single account/i]],
    ['that only accumulation accounts are offered', [/accumulation/i], [/offered|listed/i]],
    ['that which pocket pays changes the Age Pension means test before pension age',
      [/means test|works out your Age Pension/i], [/Age Pension age/i], [/isn't counted|not counted|is counted/i]],
  ]);
});

test('the assumptions round-trip, and the settings form CANNOT move the clock', () => {
  const back = parsePlan(planWithSettings(PLAN, SETTINGS));
  assert.deepEqual(back, PLAN);
  // The boxes this form has, as a set: no `asAtDate` among them, and no `agePension` either.
  assert.deepEqual(Object.keys(SETTINGS).sort(), [
    'awote', 'cashInterestRate', 'contingencyFloor', 'cpi', 'deemingLower', 'deemingUpper', 'investmentPayoutFrankedShare',
    'investmentPayoutRate', 'mtawe', 'nominalReturn', 'pblci', 'planningHorizonAge',
    'superIncomeYieldFrankedShare', 'superIncomeYieldRate',
  ]);
});

test('centsToDollars is the exact inverse of dollarsToCents, including at the cent', () => {
  for (const cents of [0, 1, 99, 100, 4_200_000, 53_800_000, -1, -12_345]) {
    assert.equal(dollarsToCents(centsToDollars(cents)), cents, `${cents} did not survive the round trip`);
  }
  assert.equal(centsToDollars(41_200_000), '412000.00');
  assert.equal(centsToDollars(1), '0.01');
});

test('percentAsFraction round-trips a PERCENT to the FRACTION the file stores, with no floating-point residue', () => {
  // **THE RULING, as a round trip (user ruling, 2026-09-25).** `0.15` typed in the box is 0.15% a
  // year and the file goes on holding the fraction `0.0015` it always has — box → fraction → box.
  for (const [percent, fraction] of [['0.15', 0.0015], ['1', 0.01], ['0.5', 0.005], ['0.35', 0.0035], ['3', 0.03]]) {
    const stored = percentAsFraction(percent);
    // **NO FLOATING-POINT RESIDUE**: `0.15 / 100` is `0.0034999999999999996`-shaped noise for some
    // inputs (`0.35 / 100` is the example that actually shows it), never the exact fraction, unless
    // it is rounded away. `percentAsFraction` rounds to twelve SIGNIFICANT digits — `fractionAsPercent`'s
    // own bound, applied in the other direction — which is far beyond any fee this box will ever see.
    assert.equal(stored, fraction, `${percent}% did not store as the fraction ${fraction}`);
    assert.equal(fractionAsPercent(stored), percent, `${fraction} did not read back as ${percent}%`);
  }
  // Blank is `NaN`, exactly as `rateAsTyped`'s every other caller on this page: `0` is a real rate
  // (a fund that charges nothing, stated) and must not be confused with "nothing was typed".
  assert.ok(Number.isNaN(percentAsFraction('')));
  assert.ok(Number.isNaN(percentAsFraction('half a percent')));
  assert.equal(percentAsFraction('0'), 0);
});

test('a blank rate box is NaN and not zero — the door refuses it rather than forecasting on it', () => {
  assert.ok(Number.isNaN(rateAsTyped('')));
  assert.ok(Number.isNaN(rateAsTyped('   ')));
  assert.ok(Number.isNaN(rateAsTyped('six per cent')));
  assert.equal(rateAsTyped('0'), 0);
  assert.equal(rateAsTyped(' 0.065 '), 0.065);
  const error = refusalFrom(() => parsePlan(planWithSettings(PLAN, { ...SETTINGS, nominalReturn: '' })));
  assert.ok(error instanceof PlanFileSettingsError);
  assert.match(error.message, /nominalReturn/);
});

/** A synchronous `thrown`, for the parse-only cases. */
function refusalFrom(fn) {
  try { fn(); } catch (error) { return error; }
  return assert.fail('nothing was thrown');
}

test('the option lists are exactly the ones the door accepts', () => {
  // Typed as `Record<HomeStatus, true>` in the module, so a member added to the union breaks the
  // build; here the lists are checked against the door, which is the other direction.
  for (const status of HOME_STATUS_OPTIONS) {
    assert.ok(parsePlan(planWithStatedPosition(PLAN, { ...POSITION, homeStatus: status })));
  }
  // ⚠️ **A TTR needs a commencement day at the door since 2026-09-23**, and since TTR build step 2
  // the form has the box for it — so every option is checked on Dana's interest, which states no
  // stream settings at all, with the start date typed as it would be on screen. §15 is the box.
  for (const phase of SUPER_PHASE_OPTIONS) {
    assert.ok(parsePlan(planWithStatedPosition(PLAN, withInterest(POSITION, 0, 0, { phase, ttrStartDate: '2028-05-14' }))));
  }
  // 7 since P14-13c: a household that sold before day 1 may state it is mid-way through the sale-proceeds window.
  assert.equal(HOME_STATUS_OPTIONS.length, 7);
  assert.deepEqual([...SUPER_PHASE_OPTIONS], ['accumulation', 'accountBasedPension', 'ttr']);
});

// --- §1c-bis A dropdown SHOWS words and STORES the identifier (P6-13, 2026-09-24) ------------------
//
// `select()` used to set an option's text to its value, so `vacatedProtectedPersonRemains`,
// `accountBasedPension` and `ttr` reached the screen verbatim. The split is `entryLabels.ts`'s
// `LabelledOption`: the value is what `plan.json` holds and does not move, the label is what is read.

/** Every stored value, spelled out — a rename of any of them is a file the door no longer reads. */
const STORED_HOME_STATUSES = ['occupied', 'vacatedProtectedPersonRemains', 'vacatedWithinTwoYearExemption', 'vacatedBeyondTwoYearExemption', 'noHome', 'rentedOut', 'noHomeSaleProceedsExempt'];
const STORED_PHASES = ['accumulation', 'accountBasedPension', 'ttr'];

test('the home and phase dropdowns show plain words, never the stored identifier', () => {
  assert.deepEqual(HOME_STATUS_CHOICES.map((choice) => choice.value), STORED_HOME_STATUSES);
  assert.deepEqual(SUPER_PHASE_CHOICES.map((choice) => choice.value), STORED_PHASES);
  for (const { value, label } of [...HOME_STATUS_CHOICES, ...SUPER_PHASE_CHOICES]) {
    assert.notEqual(label, value, `${value} is shown as itself`);
    // A camelCase run or a bare lower-case token is an identifier, not a phrase.
    assert.doesNotMatch(label, /[a-z][A-Z]/, `${value}'s label reads like code: ${label}`);
    assert.match(label, /^[A-Z].* /, `${value}'s label is not a phrase: ${label}`);
    // `occupied` and `accumulation` are English words as well as identifiers; the rest are code only.
    for (const stored of [...STORED_HOME_STATUSES, ...STORED_PHASES].filter((word) => !['occupied', 'accumulation'].includes(word))) {
      assert.doesNotMatch(label, new RegExp(`\\b${stored}\\b`), `${value}'s label names the stored ${stored}`);
    }
  }
  assert.equal(new Set(HOME_STATUS_CHOICES.map((choice) => choice.label)).size, HOME_STATUS_CHOICES.length, 'two home options read the same');
  assert.equal(new Set(SUPER_PHASE_CHOICES.map((choice) => choice.label)).size, SUPER_PHASE_CHOICES.length, 'two phase options read the same');
  // The phase notice never names a stored identifier, and anything it quotes is a word the box shows.
  // (P17-3: it no longer walks through the three choices — the guide's {#super-accounts} does.)
  const notice = prose('SUPER_PHASE_NOTICE');
  for (const stored of ['accountBasedPension', '“ttr”', '“accumulation”']) assert.ok(!notice.includes(stored), `the phase notice still quotes ${stored}`);
  const shown = SUPER_PHASE_CHOICES.map(({ label }) => label.replace(/ \(.*\)$/, ''));
  for (const [, quoted] of notice.matchAll(/“([^”]*)”/g)) assert.ok(shown.includes(quoted), `the phase notice quotes “${quoted}”, which the box does not show`);
  for (const label of shown) assert.ok(guideSection('super-accounts').includes(label), `the guide does not walk through “${label}”`);
});

// The general vacated-home exemption is 12 months and two years is the care case only (ADR-0005's
// 2026-09-24 note); no period is registered in `src/data/assumptions`, so the page states none.
test('the home dropdown and its notice name the exemption period without stating a length', () => {
  assert.equal(HOME_STATUS_LABELS.vacatedWithinTwoYearExemption, 'Own it, moved out, within the exemption period');
  assert.equal(HOME_STATUS_LABELS.vacatedBeyondTwoYearExemption, 'Own it, moved out, past the exemption period');
  for (const text of [...HOME_STATUS_CHOICES.map((choice) => choice.label), prose('HOME_SUMMARY'), prose('HOME_NOTICE')]) {
    assert.doesNotMatch(text, /\b(two|2|twelve|12|24|36)[- ](year|month)s?\b/i, `a home text states a period: ${text}`);
  }
  assert.match(prose('HOME_NOTICE'), /within the exemption period, past it/);
});

test('every dropdown on the panel goes through the one labelled select(), and it stores value and shows label', () => {
  const builder = /const select = [\s\S]*?\n\};/.exec(PANEL)[0];
  assert.match(builder, /choice\.value = option\.value;/);
  assert.match(builder, /choice\.textContent = option\.label;/);
  assert.equal([...PANEL.matchAll(/textContent = option\b(?!\.label)/g)].length, 0, 'an option shows its stored value again');
  // Each call site names its labelled list; a bare `_OPTIONS` array here is an unlabelled dropdown.
  const lists = [...PANEL.matchAll(/\bselect\([^,]+,\s*([A-Z_]+)\s*,/g)].map(([, list]) => list);
  assert.deepEqual(lists, ['SUPER_PHASE_CHOICES', 'INSURANCE_COVER_CHOICES', 'INCOME_PROTECTION_BENEFIT_PERIOD_CHOICES', 'AT_RETIREMENT_CHOICES', 'HOME_STATUS_CHOICES', 'PRIOR_PENSION_CHOICES']);
  assert.equal([...PANEL.matchAll(/\bselect\(/g)].length, lists.length, 'a select() call site is not passed a named labelled list');
  // The two lists that were already plain words show exactly what they store, and are not identifiers.
  for (const { value, label } of [...AT_RETIREMENT_CHOICES, ...PRIOR_PENSION_CHOICES]) assert.equal(label, value);
});

test('a plan holding each home status and each phase comes back from the form byte-identical', () => {
  for (const { value } of HOME_STATUS_CHOICES) {
    const plan = parsePlan(planWithStatedPosition(PLAN, { ...POSITION, homeStatus: value }));
    const text = JSON.stringify(plan);
    assert.ok(text.includes(`"homeStatus":"${value}"`));
    assert.equal(positionFormValues(plan).homeStatus, value, 'the box does not open on the stored value');
    assert.equal(JSON.stringify(parsePlan(planWithStatedPosition(plan, positionFormValues(plan)))), text);
  }
  for (const { value } of SUPER_PHASE_CHOICES) {
    const plan = parsePlan(planWithStatedPosition(PLAN, withInterest(POSITION, 0, 0, { phase: value, ttrStartDate: '2028-05-14' })));
    const text = JSON.stringify(plan);
    assert.equal(plan.household.persons[0].superInterests[0].phase, value);
    assert.equal(positionFormValues(plan).persons[0].superInterests[0].phase, value, 'the box does not open on the stored value');
    assert.equal(JSON.stringify(parsePlan(planWithStatedPosition(plan, positionFormValues(plan)))), text);
  }
});

// --- §1d The three SUPER FEE boxes: stated on the form, and an empty box states NOTHING (P3-17) ---
//
// ⚠️ **WHAT THIS SECTION EXISTS FOR.** Slice 1 built the arithmetic and the parse door; no box on
// any form could state a fee, so the feature reached nobody who was not willing to hand-edit
// `plan.json`, and every plan built through this app forecast a fund that charges nothing — the
// flattering direction, and by a lot: 0.96% a year on $412,000 is over $34,000 of fees across a
// decade of walking, none of which appeared anywhere. The boxes close that. These are the four
// properties they must not break.
//
//   1. **AN EMPTY BOX WRITES NO KEY.** All three fields are optional on `SuperInterest`, absence is
//      nil, and nil emits nothing from the walk — no `MonthLine`, no note, no moved figure. A box
//      that wrote `0` would put three keys into every plan this form saves: the same forecast, a
//      changed file, and "this fund charges nothing" no longer distinguishable from "nobody said".
//   2. **The typed figure reaches `project()`** and moves the balance, or the box is decoration.
//   3. **A stated fee survives an UNRELATED save.** This is the hazard slice 1's carry-by-position
//      was guarding, and it did not go away when the carrier did — it moved onto the round trip.
//   4. **A negative fee is refused on the FORM**, before the save, in words that name the box.
//
// The rate boxes are DECIMALS, which is this page's stated convention for every rate on it. A
// percent box beside `nominalReturn`'s decimal one is how a fee gets typed a hundred times too big.

/** The same position with every one of a Person's interests stating the three fees. */
const withFees = (values, index, fees) =>
  withPerson(values, index, {
    superInterests: values.persons[index].superInterests.map((interest) => ({ ...interest, ...fees })),
  });

/** Dana's stated balance, in cents, read off the fixture the fees are charged against. */
const DANA_BALANCE = PLAN.household.persons[0].superInterests[0].balance;

/**
 * The fee a month, re-derived here from `projection.ts`'s published rules rather than read back off
 * the engine: an ARITHMETIC twelfth (`rate / 12`, never the geometric one — a fee is a periodic
 * charge and not a compounding return), each component ceiled on its OWN figure because each is a
 * separately stated user figure, the residual pointed at the Household, and — P3-17 slice 3 — the
 * percentage limb capped BEFORE its twelfth is taken, never the flat or the investment limb.
 */
const feeForOneMonth = (balance, { flatPerYear = 0, administrationRate = 0, capPerYear, investmentRate = 0 }) => {
  const uncappedPercentage = balance * administrationRate;
  const percentage = capPerYear === undefined ? uncappedPercentage : Math.min(uncappedPercentage, capPerYear);
  return {
    administration: Math.ceil(flatPerYear / 12) + Math.ceil(percentage / 12),
    investment: Math.ceil((balance * investmentRate) / 12),
  };
};

const lineAmount = (month, description) =>
  month.lines.filter((line) => line.description.startsWith(description)).map((line) => line.amount);

test('each fee box reaches the plan file, the door, and a MOVED figure in the walk', () => {
  // Hand-worked, from the one balance the fixture states — $412,000.00 = 41,200,000 cents:
  //   the dollar limb      ⌈12,500 ÷ 12⌉                 = 1,042 cents  ($10.42 a month)
  //   the admin rate limb  ⌈41,200,000 × 0.0035 ÷ 12⌉    = 12,017 cents
  //   the investment limb  ⌈41,200,000 × 0.0061 ÷ 12⌉    = 20,944 cents
  assert.equal(DANA_BALANCE, 41_200_000, 'the fixture balance moved — every figure below is derived from it');
  const cases = [
    ['dollars a year', { administrationFeePerYear: '125' }, { statedAdministrationFeePerYear: 12_500 }, { flatPerYear: 12_500 }],
    // **PERCENT AS TYPED (user ruling, 2026-09-25): `0.35` in the box is 0.35% a year, and the file
    // still holds the fraction `0.0035` it always has.**
    ['an administration rate, typed as a PERCENTAGE', { administrationFeeRate: '0.35' }, { statedAdministrationFeeRate: 0.0035 }, { administrationRate: 0.0035 }],
    ['an investment rate, typed as a PERCENTAGE', { investmentFeeRate: '0.61' }, { statedInvestmentFeeRate: 0.0061 }, { investmentRate: 0.0061 }],
    // **THE CAP (P3-17 slice 3).** 5% of $412,000 is $20,600/yr; a $150/yr cap brings the whole
    // percentage limb down to that figure before its twelfth is taken.
    [
      'a CAPPED administration rate',
      { administrationFeeRate: '5', administrationFeeCapPerYear: '150' },
      { statedAdministrationFeeRate: 0.05, statedAdministrationFeeCapPerYear: 15_000 },
      { administrationRate: 0.05, capPerYear: 15_000 },
    ],
  ];
  const plain = validatedPlan(planWithStatedPosition(PLAN, POSITION));
  for (const [what, typed, parsedExpectations, charged] of cases) {
    const candidate = planWithStatedPosition(PLAN, withFees(POSITION, 0, typed));
    // It is in the file, as the figure the door reads — dollars converted to cents, a percentage
    // converted to the fraction the file has always stored.
    const parsed = parsePlan(candidate);
    const interest = parsed.household.persons[0].superInterests[0];
    for (const [key, value] of Object.entries(parsedExpectations)) {
      assert.equal(interest[key], value, `${what}: ${key}`);
    }
    // And it reaches the WALK: the exact line, at the exact figure the rules above give.
    const { months } = validatedPlan(candidate);
    const expected = feeForOneMonth(DANA_BALANCE, charged);
    assert.deepEqual(
      lineAmount(months[0], 'Superannuation administration fee, Dana'),
      expected.administration === 0 ? [] : [expected.administration],
      `${what}: the administration fee line`,
    );
    assert.deepEqual(
      lineAmount(months[0], 'Superannuation investment fee, Dana'),
      expected.investment === 0 ? [] : [expected.investment],
      `${what}: the investment fee line`,
    );
    // The direction, asserted rather than assumed: a fee makes the account SMALLER, from the first
    // month it is carried into, and it is charged before growth so it earns nothing either.
    assert.ok(
      months[1].protectedAssets < plain.months[1].protectedAssets,
      `${what}: a stated fee left the super balance where it was`,
    );
    assert.equal(lineAmount(plain.months[0], 'Superannuation administration fee, Dana').length, 0, 'the no-fee control charges a fee');
    assert.equal(lineAmount(plain.months[0], 'Superannuation investment fee, Dana').length, 0, 'the no-fee control charges a fee');
  }
  // All three together, which is the shape a real statement states: the three limbs sum, because
  // each is ceiled on its own figure rather than the total being ceiled once.
  const all = validatedPlan(planWithStatedPosition(PLAN, withFees(POSITION, 0, {
    administrationFeePerYear: '125', administrationFeeRate: '0.35', investmentFeeRate: '0.61',
  })));
  assert.deepEqual(lineAmount(all.months[0], 'Superannuation administration fee, Dana'), [1_042 + 12_017]);
  assert.deepEqual(lineAmount(all.months[0], 'Superannuation investment fee, Dana'), [20_944]);
});

test('the PENSION-PHASE fee boxes round-trip through the file and reach the walk on an already-retired account (P3-17 slice 4)', () => {
  // Ash's interest is DECLARED `accountBasedPension` (the fixture's own second Person), so the
  // pension set is read from month 0 — no RETIRE entry or conversion needed to see it apply.
  const ashBalance = PLAN.household.persons[1].superInterests[0].balance;
  const plain = validatedPlan(planWithStatedPosition(PLAN, POSITION));
  // The fee's `base` is the balance LESS what the month already drew (design point 1) — Ash's is an
  // Account-Based Pension paying Sch 7's minimum, so this is not the stated balance itself.
  const drawnMonth0 = lineAmount(plain.months[0], 'Account-Based Pension payment, Ash')[0] ?? 0;
  const base = ashBalance - drawnMonth0;

  const candidate = planWithStatedPosition(PLAN, withFees(POSITION, 1, {
    pensionAdministrationFeePerYear: '520', pensionAdministrationFeeRate: '0.16', pensionAdministrationFeeCapPerYear: '1300',
  }));
  const parsed = parsePlan(candidate);
  const interest = parsed.household.persons[1].superInterests[0];
  assert.equal(interest.statedPensionAdministrationFeePerYear, 52_000);
  assert.equal(interest.statedPensionAdministrationFeeRate, 0.0016);
  assert.equal(interest.statedPensionAdministrationFeeCapPerYear, 130_000);
  // Round trip: reading the boxes back off the SAVED plan reproduces exactly what was typed.
  const roundTripped = positionFormValues(parsed).persons[1].superInterests[0];
  assert.equal(roundTripped.pensionAdministrationFeePerYear, '520.00');
  assert.equal(roundTripped.pensionAdministrationFeeRate, '0.16');
  assert.equal(roundTripped.pensionAdministrationFeeCapPerYear, '1300.00');
  // And it reaches the walk: the flat limb's twelfth plus the (uncapped, at this balance) percentage.
  const { months } = validatedPlan(candidate);
  const expected = feeForOneMonth(base, { flatPerYear: 52_000, administrationRate: 0.0016, capPerYear: 130_000 });
  assert.deepEqual(lineAmount(months[0], 'Superannuation administration fee, Ash'), [expected.administration]);
  assert.deepEqual(lineAmount(plain.months[0], 'Superannuation administration fee, Ash'), [], 'the no-fee control charges a fee');
  // Not vacuous: the SAME boxes on Dana's interest — accumulation on `asAtDate` — change NOTHING in
  // month 0, because the pension set is not read until the interest itself is a pension. (Dana's
  // plan retires her later in this walk, which is `core-retirement-pension-switch.test.mjs`'s own
  // subject, not this one — so only month 0 is compared here.)
  const danaUnaffected = validatedPlan(planWithStatedPosition(PLAN, withFees(POSITION, 0, {
    pensionAdministrationFeePerYear: '520', pensionAdministrationFeeRate: '0.16',
  })));
  assert.deepEqual(danaUnaffected.months[0], plain.months[0]);
});

test('AN EMPTY FEE BOX WRITES NO KEY — not a zero, and not a key holding undefined', async () => {
  // The vacuity control first: the boxes really are empty, so what follows is about the absence.
  assert.deepEqual(
    POSITION.persons.flatMap((person) => person.superInterests.map((interest) =>
      [interest.administrationFeePerYear, interest.administrationFeeCapPerYear, interest.administrationFeeRate, interest.investmentFeeRate])),
    [['', '', '', ''], ['', '', '', '']],
    'the fixture states a fee, so an absent key here would prove nothing',
  );
  const candidate = planWithStatedPosition(PLAN, POSITION);
  for (const person of candidate.household.persons) {
    for (const interest of person.superInterests) {
      for (const key of ['statedAdministrationFeePerYear', 'statedAdministrationFeeCapPerYear', 'statedAdministrationFeeRate', 'statedInvestmentFeeRate']) {
        assert.equal(Object.hasOwn(interest, key), false, `an empty box wrote ${key}`);
      }
    }
  }
  // **THE FILE ITSELF**, through the one door the page writes with: the bytes the transport is
  // handed carry no fee key at all, so a plan stating no fee is byte-identical to one written
  // before these fields existed — which is the acceptance criterion slice 1 was built against.
  const transport = spy();
  await savePlan(transport, candidate);
  assert.equal(transport.calls.length, 1);
  const written = JSON.stringify(transport.calls[0]);
  for (const key of ['statedAdministrationFee', 'statedInvestmentFee']) {
    assert.equal(written.includes(key), false, `the written file carries ${key}`);
  }
  // Positive control on the same walker: a STATED fee, AND a stated cap beside it, do reach those bytes.
  const stating = spy();
  await savePlan(stating, planWithStatedPosition(PLAN, withFees(POSITION, 0, { administrationFeeRate: '0.35', administrationFeeCapPerYear: '150' })));
  assert.ok(JSON.stringify(stating.calls[0]).includes('statedAdministrationFeeRate'));
  assert.ok(JSON.stringify(stating.calls[0]).includes('statedAdministrationFeeCapPerYear'));
  // And the whole plan is unchanged, field for field — the fixture predates P3-17 entirely.
  assert.deepEqual(parsePlan(candidate), PLAN);
  // An empty box also leaves the WALK untouched: nil emits nothing, so there is no line to find.
  const { months } = validatedPlan(candidate);
  assert.deepEqual(months.flatMap((month) => lineAmount(month, 'Superannuation administration fee')), []);
  assert.deepEqual(months.flatMap((month) => lineAmount(month, 'Superannuation investment fee')), []);
});

test('a stated fee SURVIVES an unrelated save — the hazard the slice-1 carrier was guarding, on the new path', () => {
  // ⚠️ **THE CARRY-BY-POSITION IS GONE AND THE HAZARD IS NOT.** Slice 1 carried the three keys
  // through from the plan because no box stated them; the box states them now, so carrying them as
  // WELL would be two writers of one fact and clearing a box would leave the fee being charged
  // anyway — the user's instruction ignored, in the flattering direction. What has to hold instead
  // is the ROUND TRIP: the boxes are refilled from the plan on disk, and a save of something else
  // entirely puts back exactly what was there.
  const fees = { administrationFeePerYear: '125', administrationFeeCapPerYear: '150', administrationFeeRate: '0.35', investmentFeeRate: '0.61' };
  const charged = parsePlan(planWithStatedPosition(PLAN, withFees(POSITION, 0, fees)));
  const stated = charged.household.persons[0].superInterests[0];
  assert.deepEqual(
    [stated.statedAdministrationFeePerYear, stated.statedAdministrationFeeCapPerYear, stated.statedAdministrationFeeRate, stated.statedInvestmentFeeRate],
    [12_500, 15_000, 0.0035, 0.0061],
  );
  // An UNRELATED edit: the balance box, and nothing else, re-typed through the boxes as the page
  // refills them. Every fee is still stated, at the same figure, on the same interest.
  const edited = parsePlan(planWithStatedPosition(
    charged,
    withInterest(positionFormValues(charged), 0, 0, { balance: '450000' }),
  ));
  const after = edited.household.persons[0].superInterests[0];
  assert.equal(after.balance, 45_000_000, 'the unrelated edit did not land, so this proves nothing');
  assert.deepEqual(
    [after.statedAdministrationFeePerYear, after.statedAdministrationFeeCapPerYear, after.statedAdministrationFeeRate, after.statedInvestmentFeeRate],
    [12_500, 15_000, 0.0035, 0.0061],
    'an unrelated save dropped the fees — the fund is silently free of charge',
  );
  // Twice over, because a field written once and lost on the second pass is the persistence hazard
  // this builder has hit before, and one save proves nothing about it.
  const again = parsePlan(planWithStatedPosition(edited, positionFormValues(edited)));
  assert.deepEqual(again, edited);
  assert.deepEqual(parsePlan(planWithStatedPosition(again, positionFormValues(again))), edited);
  // CLEARING a box takes the key away, which is the other half of "one writer": if the fees were
  // carried by position as well, this would still be charging them.
  const cleared = planWithStatedPosition(
    edited,
    withFees(positionFormValues(edited), 0, { administrationFeePerYear: '', administrationFeeCapPerYear: '', administrationFeeRate: '', investmentFeeRate: '' }),
  );
  assert.deepEqual(Object.keys(cleared.household.persons[0].superInterests[0]), ['phase', 'balance']);
  assert.equal(JSON.stringify(cleared).includes('statedAdministrationFee'), false);
  // The interests the form did not touch keep everything the form cannot show — the fee boxes did
  // not cost the commencement day its carry.
  assert.deepEqual(
    edited.household.persons[1].superInterests[0].statedStreamSettings,
    PLAN.household.persons[1].superInterests[0].statedStreamSettings,
  );
});

test('a NEGATIVE fee is refused on the form, naming the account and the person — and the door still refuses it too', () => {
  assert.equal(negativeFeeObjection(POSITION), undefined, 'the untouched fixture is objected to');
  assert.equal(negativeFeeObjection(withFees(POSITION, 0, { administrationFeeRate: '0.35' })), undefined);
  for (const [what, typed] of [
    ['the dollar box', { administrationFeePerYear: '-125' }],
    ['the cap box', { administrationFeeRate: '0.35', administrationFeeCapPerYear: '-150' }],
    ['the administration rate', { administrationFeeRate: '-0.35' }],
    ['the investment rate', { investmentFeeRate: '-0.61' }],
  ]) {
    const objection = negativeFeeObjection(withFees(POSITION, 0, typed));
    assert.equal(typeof objection, 'string', `${what}: a negative fee was not objected to`);
    // It names the person and which of their accounts, 1-based as the screen counts them, and says
    // what to do — a message that only says "invalid" is one a user cannot act on.
    assert.match(objection, /Dana/, `${what}: the objection does not say whose account it is`);
    assert.match(objection, /Super account 1/, `${what}: the objection does not say which account`);
    assert.match(objection, /empty|positive/i, `${what}: the objection does not say what to do instead`);
    assert.ok(objection.length >= 80, `${what}: the objection is too short to be the sentence it stands in for`);
  }
  // A Person with no name is called by their position rather than by an empty space.
  assert.match(negativeFeeObjection(withFees(withPerson(POSITION, 0, { name: '  ' }), 0, { investmentFeeRate: '-1' })), /person 1/);
  // **NOT A SECOND VALIDATOR.** Only the SIGN is judged here: an unreadable box is NaN, which is
  // not negative, and goes to the door — which says what it is far better than this could.
  assert.equal(negativeFeeObjection(withFees(POSITION, 0, { administrationFeeRate: 'half a percent' })), undefined);
  const refusal = refusalFrom(() => parsePlan(planWithStatedPosition(PLAN, withFees(POSITION, 0, { administrationFeeRate: 'half a percent' }))));
  assert.ok(refusal instanceof PlanFileHouseholdError);
  assert.match(refusal.message, /superInterests\[0\]\.statedAdministrationFeeRate/);
  // **THE POSITIVE CONTROL, because a refusal the form heads off is not a refusal that has gone.**
  // The door refuses the negative fee by name and by path, which is what a hand-edited file meets.
  const byHand = refusalFrom(() => parsePlan(planWithStatedPosition(PLAN, withFees(POSITION, 0, { investmentFeeRate: '-0.61' }))));
  assert.ok(byHand instanceof PlanFileHouseholdError);
  assert.match(byHand.message, /statedInvestmentFeeRate/);

  // **THE SECOND COURTESY (P3-17 slice 3): a cap with no percentage to cap.** A cap box alone is
  // objected to, and clearing it (leaving only the rate, or neither) is not.
  assert.equal(negativeFeeObjection(withFees(POSITION, 0, { administrationFeeCapPerYear: '' })), undefined);
  const capNoRate = negativeFeeObjection(withFees(POSITION, 0, { administrationFeeCapPerYear: '150' }));
  assert.equal(typeof capNoRate, 'string', 'a cap with no rate was not objected to');
  assert.match(capNoRate, /Dana/);
  assert.match(capNoRate, /Super account 1/);
  assert.match(capNoRate, /percentage/i, 'the objection does not say a percentage is missing');
  // And the door refuses the same file, by name, which is what a hand-edited plan meets.
  const capNoRateByHand = refusalFrom(() => parsePlan(planWithStatedPosition(PLAN, withFees(POSITION, 0, { administrationFeeCapPerYear: '150' }))));
  assert.ok(capNoRateByHand instanceof PlanFileHouseholdError);
  assert.match(capNoRateByHand.message, /statedAdministrationFeeCapPerYear/);

  // And the panel consults it BEFORE the write, and returns rather than saving anyway.
  const position = /const renderPosition[\s\S]*?\n\};/.exec(PANEL)[0];
  assert.match(position, /const objection = negativeFeeObjection\(typed\);/);
  assert.match(position, /if \(objection !== undefined\) \{\s*announce\.textContent = objection;\s*return;\s*\}/);
  assert.ok(
    position.indexOf('negativeFeeObjection(typed)') < position.indexOf('saveAndAnnounce(host, announce, planWithStatedPosition'),
    'the objection is checked after the save has already gone out',
  );
});

test('the fee BUILDER has one writer per key, and the slice-1 carry-by-position is gone', () => {
  // One expression of "blank omits the key", called THIRTEEN times — four fee keys (the cap since
  // P3-17 slice 3, 2026-09-25) plus three more for the pension-phase set (P3-17 slice 4, 2026-09-25);
  // since P4-14 `Settings.contingencyFloor`; since P3-22h step 1 the two investment-payout figures;
  // and since P3-42 the two super income-yield figures, all of which are optional for the same
  // reason and must omit their key from the same blank box. Thirteen copies of a `trim() === ''`
  // test would be thirteen chances for one of them to drift into writing a zero, and a zero is
  // refused by the door in every one of them but one.
  //
  // ⚠️ **ONE is the case where a zero is NOT refused** (interest on cash, 2026-09-23):
  // `Settings.cashInterestRate` absent follows the CPI box and a stated 0 says the cash earns
  // nothing, so the same blank-omits-the-key expression is exactly right and a typed 0 must survive
  // it — which `core-cash-interest.test.mjs` asserts.
  // P3-17b (2026-09-28): the income protection premium makes seventeen; the two cover end ages
  // (2026-09-29) nineteen; a parcel's value just before 1 July 2027 (LR-1 slice 4) twenty; a
  // Person's total super balance on 30 June (P3-4b slice 2) twenty-one.
  assert.equal([...EDITS.matchAll(/statedFee\(/g)].length, 21, 'the optional-figure keys are no longer written by one shared expression');
  assert.equal([...EDITS.matchAll(/const statedFee = /g)].length, 1, 'there is a second "blank omits the key" expression');
  assert.match(EDITS, /\(typed\.trim\(\) === "" \? \{\} : \{ \[key\]: convert\(typed\) \}\)/);
  // ⚠️ The WRITER names each key inside a string literal, which `executableCode` blanks — so the
  // writing half has to be pinned against the RAW source, and the stripped code sees the READER
  // only. Counting on the stripped code alone would have counted one writer as none.
  for (const [key, box, convert] of [
    ['statedAdministrationFeePerYear', 'administrationFeePerYear', 'dollarsToCents'],
    // **P3-17 slice 3.** DOLLARS, exactly like the flat fee — `dollarsToCents` is its converter too.
    ['statedAdministrationFeeCapPerYear', 'administrationFeeCapPerYear', 'dollarsToCents'],
    // **PERCENT AS TYPED (2026-09-25).** `percentAsFraction`, not `rateAsTyped` — the box takes
    // `0.15` and the converter is what turns that into the fraction `0.0015` the file stores.
    ['statedAdministrationFeeRate', 'administrationFeeRate', 'percentAsFraction'],
    ['statedInvestmentFeeRate', 'investmentFeeRate', 'percentAsFraction'],
    // **P3-17 slice 4 (2026-09-25).** The pension-phase pair, same converters as their accumulation twins.
    ['statedPensionAdministrationFeePerYear', 'pensionAdministrationFeePerYear', 'dollarsToCents'],
    ['statedPensionAdministrationFeeCapPerYear', 'pensionAdministrationFeeCapPerYear', 'dollarsToCents'],
    ['statedPensionAdministrationFeeRate', 'pensionAdministrationFeeRate', 'percentAsFraction'],
    // **P3-17a slice 1 (2026-09-25).** Insurance: three dollar boxes.
    ['statedDeathPremiumPerYear', 'deathPremiumPerYear', 'dollarsToCents'],
    ['statedTpdPremiumPerYear', 'tpdPremiumPerYear', 'dollarsToCents'],
    ['statedInsuranceAdminFeePerYear', 'insuranceAdminFeePerYear', 'dollarsToCents'],
    // **P3-17b (2026-09-28).** The income protection premium, a fourth dollar box.
    ['statedIncomeProtectionPremiumPerYear', 'incomeProtectionPremiumPerYear', 'dollarsToCents'],
  ]) {
    assert.equal(
      [...EDITS_RAW.matchAll(new RegExp(`statedFee\\('${key}', interest\\.${box}, ${convert}\\)`, 'g'))].length,
      1,
      `${key} is not written exactly once, from its own box, through its own converter`,
    );
    assert.equal([...EDITS.matchAll(new RegExp(key, 'g'))].length, 1, `${key} is read somewhere new`);
    assert.match(EDITS, new RegExp(`feeBox\\(interest\\.${key},`), `${key} is no longer read back through the one absent-is-empty helper`);
  }
  // The carrier is gone: no `heldInterest` route to a fee, so the box is the only writer.
  assert.doesNotMatch(EDITS, /heldInterest\?\.statedAdministrationFee/, 'the fees are carried by position as well as stated — two writers of one fact');
  assert.doesNotMatch(EDITS, /heldInterest\?\.statedInvestmentFee/, 'the fees are carried by position as well as stated — two writers of one fact');
  // Positive control: the field the form genuinely cannot show IS still carried by position. The employer destination
  // is not: since register O82 its select is the one writer, and only while shown.
  assert.match(EDITS, /const heldSettings = heldInterest\?\.statedStreamSettings;/);
  assert.doesNotMatch(EDITS, /heldInterest\?\.statedEmployerContributionDestination/);
  // And no default anywhere beside a fee box: a defaulted fee is a figure nobody typed.
  for (const defaulted of [
    /administrationFeePerYear \?\?/, /administrationFeeCapPerYear \?\?/, /administrationFeeRate \?\?/, /investmentFeeRate \?\?/,
    /pensionAdministrationFeePerYear \?\?/, /pensionAdministrationFeeCapPerYear \?\?/, /pensionAdministrationFeeRate \?\?/,
  ]) {
    assert.doesNotMatch(EDITS, defaulted, `a fee box has grown a default: ${defaulted}`);
  }
});

test('the fee boxes are asked for in plain words, as PERCENTAGES, with a dollar confirmation and an over-3% guard', () => {
  // The two boxes built directly: a plain string literal is the whole label.
  for (const [text, name] of [
    // ⚠️ **"in today's money" is part of the label and not decoration** (register O87, ruled
    // 2026-09-21): the walk raises this figure with prices, the percentage boxes beside it are not
    // raised, and a silent box beside a labelled one is read as agreeing with it.
    ['Admin. fee, dollars a year, in today’s money ', 'administrationFeePerYear'],
    // **THE CAP (P3-17 slice 3), verbatim as user-approved 2026-09-25.**
    ['Cap on that percentage fee, per year $ (optional) ', 'administrationFeeCapPerYear'],
    // **THE PENSION-PHASE SET (P3-17 slice 4), verbatim as user-approved 2026-09-25.**
    ['After retirement (account-based pension), dollars a year, in today’s money — leave blank to keep the same fees ', 'pensionAdministrationFeePerYear'],
    ['After retirement, cap on that percentage fee, per year $ (optional) ', 'pensionAdministrationFeeCapPerYear'],
  ]) {
    assert.ok(literals(PANEL_RAW).includes(text), `the fee row no longer asks "${text}"`);
    // The field names are the FORM's, and the engine's own spellings stay off the screen.
    assert.ok(literals(PANEL_RAW).some((word) => word.includes(`${name}-`)), `${name} has no box`);
  }
  // The two `rateBox`-built boxes: the CALL SITE passes only the PREFIX as a literal — `rateBox`
  // itself appends the "% a year " ending, in its own template, once, for both boxes at once
  // (checked below as the ending every percentage box shares, not per-box).
  for (const [prefix, name] of [
    ['Admin. fee, ', 'administrationFeeRate'],
    ['Investment fee, ', 'investmentFeeRate'],
    ['After retirement, admin. fee, ', 'pensionAdministrationFeeRate'],
  ]) {
    assert.ok(literals(PANEL_RAW).includes(prefix), `the fee row no longer asks "${prefix}"`);
    assert.ok(literals(PANEL_RAW).some((word) => word.includes(`${name}-`)), `${name} has no box`);
  }
  // **THE LABEL ENDS "% a year" (2026-09-25 ruling)** — one template, shared by both `rateBox` calls,
  // so this is pinned once rather than per box, against the RAW source (`executableCode` blanks a
  // whole template literal, `${text}` included, so the stripped `PANEL` cannot see this at all).
  assert.match(PANEL_RAW, /label\(`\$\{text\}% a year `, box\)/);
  assert.deepEqual(
    literals(PANEL_RAW).filter((word) => /statedAdministrationFee|statedInvestmentFee|statedPensionAdministrationFee/.test(word)),
    [],
    'an engine field name reached the screen',
  );
  // The three rate boxes go through ONE builder, so the live readings cannot exist beside some and
  // not others.
  assert.equal([...PANEL.matchAll(/rateBox\(/g)].length, 3, 'the rate boxes no longer share one builder');
  assert.equal([...PANEL.matchAll(/const rateBox = /g)].length, 1, 'there is a second rate-box builder');
  assert.match(PANEL, /dollars\.textContent = feeRateDollarsAYear\(box\.value, balance\.value\);/);
  assert.match(PANEL, /warning\.textContent = feeRateWarning\(box\.value\);/);

  // **THE CONFIRMATION**, a PERCENTAGE and the BALANCE typed above, echoed as dollars a year — and
  // nothing when either box holds nothing readable, for `feeRatePercent`'s own reason: an echo that
  // puts a figure on screen where a box holds none is the same defect as a box that defaults itself.
  // No cents anywhere on this page (`displayMoney.ts`'s ruling, 2026-09-24): `formatDollars`, not
  // `formatCents`, so the echo reads `$3,500`, never `$3,500.00`.
  assert.equal(feeRateDollarsAYear('0.35', '1000000.00'), '= $3,500 a year on today’s balance');
  assert.equal(feeRateDollarsAYear('0.15', '500000.00'), '= $750 a year on today’s balance');
  assert.equal(feeRateDollarsAYear('', '1000000.00'), '');
  assert.equal(feeRateDollarsAYear('0.35', ''), '');
  assert.equal(feeRateDollarsAYear('half a percent', '1000000.00'), '');
  assert.equal(feeRateDollarsAYear('0.35', 'not a balance'), '');

  // **THE GUARD (2026-09-25 ruling): a courtesy, not a refusal.** `1`, `0.5` and `''` are silent;
  // anything above `3` warns, because this build's own research has never seen a real fund's
  // percentage fee at 3% a year — a figure above it is far more likely to be the OLD decimal
  // convention typed by habit.
  assert.equal(feeRateWarning('1'), '');
  assert.equal(feeRateWarning('0.5'), '');
  assert.equal(feeRateWarning(''), '');
  assert.equal(feeRateWarning('3'), '', 'exactly 3% is not ABOVE 3%');
  assert.equal(feeRateWarning('3.01'), FEE_RATE_OVER_THREE_PERCENT_WARNING);
  assert.equal(feeRateWarning('35'), FEE_RATE_OVER_THREE_PERCENT_WARNING, 'the mistyping this ruling exists to catch');
  assert.match(FEE_RATE_OVER_THREE_PERCENT_WARNING, /3%/);
  // And neither decides anything: the figure that is saved is the box's, never an echo's.
  assert.doesNotMatch(EDITS, /feeRateDollarsAYear|feeRateWarning/, 'a live reading reached the builder — it is display only');

  const summary = prose('SUPER_FEES_SUMMARY');
  explains('the fee line on the page', summary, [
    ['what the boxes are for', [/charge|fee/i]],
    ['that an empty box is an answer', [/empty|blank/i]],
    ['that the rates are typed as percentages', [/percentage/i], [/0\.15/]],
    ['which money the figures are in', [/today’s money|today's money/i]],
  ], 80);
  const notice = prose('SUPER_FEES_NOTICE');
  explains('the fee disclosure', notice, [
    ['where a person finds their own figures', [/statement|product disclosure/i]],
    ['that a dollar figure confirms what was typed', [/says what it charges|confirms|dollars a year|a year on the balance/i]],
    ['the guard against a decimal typed by mistake', [/warns/i], [/decimal/i]],
    ['that an empty box is no fee and nothing is filled in', [/empty box is no fee|empty/i], [/none is guessed|never fills|guessed/i]],
  ], 100);
  // P17-3: the rules the notice used to carry are the guide's now, and are pinned on its section.
  explains('the guide on super fees', guideSection('super-fees'), [
    ['that funds charge both as an amount and as a share', [/dollar amount/i], [/percentage/i]],
    ['that a share can be capped', [/never charge more|cap/i]],
    ['where a person finds their own figures', [/statement/i]],
    ['that the rates are typed as percentages, as the statement shows them', [/just like your statement shows it/i]],
    ['that a dollar figure is shown under the box', [/in dollars, right under the box/i]],
    ['the over-3% guard', [/3%/]],
    ['that an empty box is not a charge of nothing, and none is guessed', [/empty/i], [/never guesses/i]],
  ]);
  assert.match(PANEL_RAW, /infoButton\(SUPER_FEES_SUMMARY, SUPER_FEES_NOTICE, 'guide:super-fees'\)/);
  assert.equal([...PANEL.matchAll(/SUPER_FEES_NOTICE/g)].length, 2, 'SUPER_FEES_NOTICE is not defined once and used once');
});

// --- §1c walkthroughPlan: the wizard's one builder, and the trap it was built to avoid ------------
//
// `walkthroughPlan({ name, dateOfBirth })` is the whole of what the "Start again" wizard writes: one
// Person, no journal, one empty baseline Scenario, `DEMO_SETTINGS` reused for the forecast
// assumptions. These are the properties that keep it safe to build blind, before a byte reaches
// `parsePlan` at all.

test('walkthroughPlan round-trips through parsePlan for a valid date of birth, and project() runs', async () => {
  const candidate = walkthroughPlan({ name: 'Jordan Blake', dateOfBirth: '1970-06-15' });
  const plan = parsePlan(candidate);
  assert.equal(plan.household.persons.length, 1);
  assert.equal(plan.household.persons[0].name, 'Jordan Blake');
  assert.equal(plan.household.persons[0].dateOfBirth, '1970-06-15');
  assert.equal(plan.household.homeStatus, 'noHome');
  assert.equal(plan.household.persons[0].superInterests.length, 0);
  assert.equal(plan.household.persons[0].parcels.length, 0);
  assert.equal(plan.entries.length, 0, 'the wizard invented journal entries');
  assert.equal(plan.scenarios.length, 1);
  assert.deepEqual(plan.scenarios[0], { id: 'baseline', name: 'Baseline', parentId: null, entryIds: [] });
  assert.equal(plan.activeScenarioId, 'baseline');
  // The forecast assumptions are `DEMO_SETTINGS`, reused BY VALUE — the same numbers, read off the
  // plan that was actually built, not merely the same identifier asserted in source.
  assert.equal(plan.settings.asAtDate, DEMO_SETTINGS.asAtDate);
  assert.equal(plan.settings.planningHorizonAge, DEMO_SETTINGS.planningHorizonAge);
  assert.deepEqual(plan.settings.economicSeries, DEMO_SETTINGS.economicSeries);
  assert.deepEqual(plan.settings.deemingRates, DEMO_SETTINGS.deemingRates);
  // And it PROJECTS — the second half of the gate every write goes through (`validatedPlan`), not
  // just the parse: a plan that parses but cannot be walked would brick the page the moment it loads.
  const validated = validatedPlan(candidate);
  assert.ok(validated.months.length > 0);
  assert.equal(validated.months[0].month, DEMO_SETTINGS.asAtDate.slice(0, 7));
  // The one door, end to end: `savePlan` accepts it and calls the transport exactly once.
  const transport = spy();
  const saved = await savePlan(transport, candidate);
  assert.equal(transport.calls.length, 1);
  assert.ok(saved.months.length > 0);
});

test("the two money fields come out as '0', not '' — blank is the trap this build nearly shipped", () => {
  // ⚠️ **THE TRAP.** `BLANK_PERSON` states `employmentIncomePerFortnight` and `workBonusBalance` as
  // `''`, and `dollarsToCents('')` is `NaN` — a figure `parsePlan` refuses by name. Building the
  // wizard's Person out of `BLANK_PERSON` alone, without overriding the two money fields, would
  // silently refuse EVERY save the wizard could ever make. The positive control proves the trap is
  // real: `BLANK_PERSON`'s own blanks really do become `NaN`.
  assert.ok(Number.isNaN(dollarsToCents(BLANK_PERSON.employmentIncomePerFortnight)), 'BLANK_PERSON no longer traps a blank money box as NaN — the control below proves nothing');
  assert.ok(Number.isNaN(dollarsToCents(BLANK_PERSON.workBonusBalance)));

  const candidate = walkthroughPlan({ name: 'Jordan Blake', dateOfBirth: '1970-06-15' });
  const person = parsePlan(candidate).household.persons[0];
  // Parsed as whole cents, and specifically zero — `dollarsToCents('0')`, not the `NaN` the trap
  // would have produced. `Number.isSafeInteger` rather than `=== 0` alone, so a NaN that happened to
  // coerce oddly could not pass this by accident.
  assert.equal(person.employmentIncomePerFortnight, 0);
  assert.equal(person.workBonusBalance, 0);
  assert.ok(Number.isSafeInteger(person.employmentIncomePerFortnight));
  assert.ok(Number.isSafeInteger(person.workBonusBalance));
  // And in source: the override sits right where `BLANK_PERSON` is spread, naming both fields as the
  // string `'0'` — not left to inherit the blanks, and not converted to cents in this module either.
  const body = /export const walkthroughPlan[\s\S]*?\n\};/.exec(EDITS_RAW)[0];
  assert.match(body, /\.\.\.BLANK_PERSON,/);
  assert.match(body, /employmentIncomePerFortnight: '0',/);
  assert.match(body, /workBonusBalance: '0',/);
});

test('a date of birth past the planning horizon is refused by project()’s OWN RangeError, not a hand-written message', async () => {
  // Someone already older than `DEMO_SETTINGS.planningHorizonAge` (100) as at `DEMO_SETTINGS.asAtDate`
  // (2026-09-01): `forecastWindow`'s horizon falls before its first month, and `project()` refuses
  // that itself — this module writes no check of its own for it.
  const candidate = walkthroughPlan({ name: 'Ancient Mariner', dateOfBirth: '1900-01-01' });
  const plan = parsePlan(candidate); // the DATE itself is well-formed, so the door accepts it
  assert.equal(plan.household.persons[0].dateOfBirth, '1900-01-01');
  let caught;
  try { scenarioWalks(plan); } catch (error) { caught = error; }
  assert.ok(caught, 'a date of birth past the planning horizon was not refused at all');
  // It is a BARE RangeError — the engine's own class, not one of `parsePlan`'s named refusals —
  // because this is `project()` refusing to walk a plan that parses perfectly well.
  assert.equal(caught.constructor, RangeError, 'the refusal is no longer the engine’s own bare RangeError');
  assert.ok(!(caught instanceof PlanFileDateError), 'a date-of-birth-too-old refusal has become a PlanFileDateError — that is a parse-time refusal, not project()’s');
  assert.ok(!(caught instanceof PlanFileHouseholdError));
  assert.match(caught.message, /Planning Horizon/);
  assert.match(caught.message, /already passed age 100/);
  // And the gate every write goes through catches it before the transport is ever named — a refused
  // edit with the engine's own sentence on screen, not a bricked page.
  const transport = spy();
  const gateError = await thrown(() => savePlan(transport, candidate));
  assert.equal(gateError.constructor, RangeError);
  assert.match(gateError.message, /already passed age 100/);
  assert.equal(transport.calls.length, 0, 'a plan past the planning horizon was written to disk');
});

test('a blank or malformed date of birth is refused as PlanFileDateError — the door’s own guard, not a hand-written one', async () => {
  const blank = refusalFrom(() => parsePlan(walkthroughPlan({ name: 'Jordan Blake', dateOfBirth: '' })));
  assert.ok(blank instanceof PlanFileDateError);
  assert.match(blank.message, /household\.persons\[0\]\.dateOfBirth/);

  const malformed = refusalFrom(() => parsePlan(walkthroughPlan({ name: 'Jordan Blake', dateOfBirth: '15/06/1970' })));
  assert.ok(malformed instanceof PlanFileDateError);
  assert.match(malformed.message, /household\.persons\[0\]\.dateOfBirth/);

  // Neither reaches the transport: the same zero-calls property every other refusal in this file has.
  for (const dateOfBirth of ['', '15/06/1970', 'not a date']) {
    const transport = spy();
    const error = await thrown(() => savePlan(transport, walkthroughPlan({ name: 'Jordan Blake', dateOfBirth })));
    assert.ok(error instanceof PlanFileDateError, `"${dateOfBirth}" was not refused as PlanFileDateError`);
    assert.equal(transport.calls.length, 0, `"${dateOfBirth}" reached the transport`);
  }
});

// --- §2 An invalid value never reaches the transport ---------------------------------------------

test('a bad figure is refused BEFORE the transport is called — zero calls, with a positive control', async () => {
  const cases = [
    ['a balance that is not a number', planWithStatedPosition(PLAN, withInterest(POSITION, 0, 0, { balance: 'about four hundred thousand' }))],
    ['a blank work bonus balance', planWithStatedPosition(PLAN, withPerson(POSITION, 0, { workBonusBalance: '' }))],
    ['a date of birth that is not a date', planWithStatedPosition(PLAN, withPerson(POSITION, 0, { dateOfBirth: '14/05/1968' }))],
    ['an as-at date that is not a date', planWithStatedPosition(PLAN, { ...POSITION, asAtDate: 'today' })],
    ['a half-cent balance', planWithStatedPosition(PLAN, withInterest(POSITION, 0, 0, { balance: '412000.555' }))],
    ['a horizon that is not whole', planWithSettings(PLAN, { ...SETTINGS, planningHorizonAge: '100.5' })],
    ['a deeming rate that is blank', planWithSettings(PLAN, { ...SETTINGS, deemingLower: '' })],
  ];
  for (const [what, candidate] of cases) {
    const transport = spy();
    await thrown(() => savePlan(transport, candidate));
    assert.equal(transport.calls.length, 0, `${what}: the transport was called with an invalid plan`);
  }
  // The positive control: the same spy, the same door, a candidate that IS valid.
  const ok = spy();
  await savePlan(ok, planWithStatedPosition(PLAN, POSITION));
  assert.equal(ok.calls.length, 1);
});

test('the refusals are the door’s own, by name and by path', () => {
  // A blank balance is `NaN`, which is a number and is not whole cents — so it comes back under
  // `PlanFileAmountError` (ADR-0001's own name) rather than the household's, which is the door
  // being more specific than this layer could be.
  const balance = refusalFrom(() => parsePlan(planWithStatedPosition(PLAN, withInterest(POSITION, 0, 0, { balance: '' }))));
  assert.ok(balance instanceof PlanFileAmountError);
  assert.match(balance.message, /household\.persons\[0\]\.superInterests\[0\]\.balance/);
  const date = refusalFrom(() => parsePlan(planWithStatedPosition(PLAN, { ...POSITION, asAtDate: '1 Jan 2027' })));
  assert.ok(date instanceof PlanFileDateError);
  assert.match(date.message, /settings\.asAtDate/);
});

test('the WALK half of the gate refuses a settings edit too — a horizon that strands an entry', async () => {
  // `parsePlan` accepts a horizon of 62: it is a whole age above zero. `project()` does not — the
  // horizon is the maximum over the Persons (`forecastWindow.ts`), so the walk would end 2030-05
  // and the 2031 RETIRE would be dated after the last month — and the gate runs the engine before
  // writing, so this is a refused edit and not a bricked page.
  const transport = spy();
  const error = await thrown(() => savePlan(transport, planWithSettings(PLAN, { ...SETTINGS, planningHorizonAge: '62' })));
  assert.match(error.message, /after the Planning Horizon/);
  assert.equal(transport.calls.length, 0, 'a plan that parses and then throws was written to disk');
});

// --- §3 Adding: a second Person, an interest, a parcel -------------------------------------------

/** The demo plan with Ash taken out, so that "add a second Person" has somewhere to start. */
const SOLO = parsePlan({
  ...PLAN,
  household: { ...PLAN.household, persons: [PLAN.household.persons[0]] },
});

test('a SECOND PERSON can be added: it parses, it projects, and the household becomes a couple', () => {
  const added = positionWithPerson(positionFormValues(SOLO), {
    ...BLANK_PERSON,
    name: 'Ash',
    dateOfBirth: '1960-02-09',
    employmentIncomePerFortnight: '0',
    workBonusBalance: '0',
  });
  const plan = parsePlan(planWithStatedPosition(SOLO, added));
  assert.equal(plan.household.persons.length, 2);
  assert.deepEqual(plan.household.persons.map((person) => person.name), ['Dana', 'Ash']);
  // It projects, and the walk is longer: the window runs to the horizon of the YOUNGER member, and
  // Ash is older, so a new Person changes the forecast window as well as the figures.
  const before = scenarioWalks(SOLO).active;
  const after = scenarioWalks(plan).active;
  assert.ok(after.length > 0);
  assert.notEqual(digest(after), digest(before), 'adding a Person changed nothing in the walk');
});

test('a SUPER INTEREST and a PARCEL can be added, and the added one states no stream settings', () => {
  const withBoth = positionWithParcel(
    positionWithSuperInterest(POSITION, 1, { ...BLANK_SUPER_INTEREST, balance: '25000' }),
    1,
    { ...BLANK_PARCEL, acquired: '2021-07-01', costBase: '10000', marketValue: '14000' },
  );
  const plan = parsePlan(planWithStatedPosition(PLAN, withBoth));
  assert.equal(plan.household.persons[1].superInterests.length, 2);
  assert.equal(plan.household.persons[1].superInterests[1].balance, 2_500_000);
  assert.equal(plan.household.persons[1].superInterests[1].phase, 'accumulation');
  // The interest that was ALREADY there keeps its commencement day; the new one has none, because
  // nobody has stated one for it. Both halves, because carrying it to the wrong position would
  // hand a brand-new interest a Schedule 7 minimum it never commenced.
  assert.equal(plan.household.persons[1].superInterests[0].statedStreamSettings.commencementDay, '2022-08-01');
  assert.equal(plan.household.persons[1].superInterests[1].statedStreamSettings, undefined);
  assert.deepEqual(plan.household.persons[1].parcels, [{ acquired: '2021-07-01', costBase: 1_000_000, marketValue: 1_400_000 }]);
  const months = scenarioWalks(plan).active;
  assert.ok(months.length > 0);
  assert.ok(wealth(months[0]) > wealth(scenarioWalks(PLAN).active[0]), 'adding $25,000 of super and a parcel did not raise month 0 wealth');
});

// --- §4 The pairing: a balance cannot be saved without the date it is stated as at ---------------

test('the position builder ALWAYS writes the date it was handed — a balance edit moves the clock with it', () => {
  // Mutation (a) in one assertion: a builder that left `settings` alone would save the new balance
  // under the old date, which is the double-count this design exists to prevent.
  const moved = parsePlan(planWithStatedPosition(PLAN, {
    ...withInterest(POSITION, 0, 0, { balance: '450000' }),
    asAtDate: '2027-01-01',
  }));
  assert.equal(moved.settings.asAtDate, '2027-01-01');
  assert.equal(moved.household.persons[0].superInterests[0].balance, 45_000_000);
  // And the walk starts there, which is what makes the two one fact: the figure typed is month 0.
  const months = scenarioWalks(moved).active;
  assert.equal(months[0].month, '2027-01');
  assert.equal(months[0].protectedAssets + months[0].assessableAssets + months[0].closingBalance > 0, true);
});

test('the SETTINGS builder cannot write a date at all — the clock has exactly one writer', () => {
  const kept = parsePlan(planWithSettings(PLAN, { ...SETTINGS, nominalReturn: '0.07' }));
  assert.equal(kept.settings.asAtDate, PLAN.settings.asAtDate);
  assert.equal(kept.settings.nominalReturn, 0.07);
  // In source: the settings builder reads the date off the PLAN, never off its values, and no
  // `asAtDate` is written anywhere in that function.
  const body = /export const planWithSettings[\s\S]*?\n\}\);/.exec(EDITS)[0];
  assert.match(body, /asAtDate: plan\.settings\.asAtDate/);
  assert.doesNotMatch(body, /values\.asAtDate/, 'the settings form has grown a second writer for the one clock');
  // Positive control on the same slice: it DOES read its own values.
  assert.match(body, /rateAsTyped\(values\.nominalReturn\)/);
  // And a user-supplied date is written in exactly ONE place in the whole module. The name occurs
  // nine times in the executable text and not one of the other eight is a writer: the interface
  // field (1), the write itself (2 — the key and `values.asAtDate`), `planWithSettings` carrying
  // the plan's own date through (2), `positionFormValues` reading it back into the boxes (2), and
  // `walkthroughPlan`'s skeleton stating its OWN date to itself (2 — the key and
  // `skeleton.settings.asAtDate`, never a second `values.asAtDate`, because the walkthrough has no
  // values object of its own to read one off). The total is pinned as well as the write, so that a
  // second writer cannot be added quietly under a different shape.
  assert.equal([...EDITS.matchAll(/asAtDate: values\.asAtDate/g)].length, 1, 'a second place writes a user-supplied asAtDate');
  assert.equal([...EDITS.matchAll(/asAtDate: skeleton\.settings\.asAtDate/g)].length, 1, 'the walkthrough no longer states its own date to itself');
  // LR-1 slice 4 adds three READS, none a write: `valueJustBefore1July2027BoxShown`'s parameter and
  // its one use (2), and the builder asking it about `values.asAtDate` (1).
  assert.equal([...EDITS.matchAll(/valueJustBefore1July2027BoxShown\(values\.asAtDate\)/g)].length, 1);
  // P3-4b slice 2 adds eleven more READS, none a write: the three helpers' parameters and uses
  // (`firstYearOf` 2, `unusedCapYears` 2, `totalSuperBalanceAt30JuneBoxShown` 3, `thirtyJuneYear` 2),
  // the builder asking the 30 June box's question of `values.asAtDate` (1), and `positionFormValues`
  // offering the plan's own window years (1).
  assert.equal([...EDITS.matchAll(/totalSuperBalanceAt30JuneBoxShown\(values\.asAtDate\)/g)].length, 1);
  assert.equal([...EDITS.matchAll(/asAtDate/g)].length, 23, 'the asAtDate occurrences in planEdits.ts have moved — check which of them is a WRITE');
});

test('a values object with no asAtDate does not COMPILE, and the spread cannot launder one away', () => {
  const PRELUDE = [
    "import { planWithStatedPosition, positionFormValues } from '../src/app/planEdits.js';",
    "import type { StatedPositionFormValues } from '../src/app/planEdits.js';",
    "import { DEMO_PLAN } from '../src/app/demoHousehold.js';",
    'const plan = DEMO_PLAN;',
    'const position = positionFormValues(plan);',
  ];
  // The positive control first: the honest call compiles.
  const good = tsc([...PRELUDE, 'void planWithStatedPosition(plan, position);'].join('\n'));
  assert.ok(good.ok, `the honest call no longer compiles, so the probes below prove nothing:\n${good.output}`);
  // Omitting the date: TS2741, the field is required and there is no builder that does without it.
  const omitted = tsc([
    ...PRELUDE,
    'const noDate: StatedPositionFormValues = { homeStatus: position.homeStatus, openingOffsetBalance: position.openingOffsetBalance, persons: position.persons };',
    'void noDate;',
  ].join('\n'));
  assert.equal(omitted.ok, false, 'a position without an as-at date typechecks — the pairing is not structural');
  assert.match(omitted.output, /asAtDate/);
  // And the spread route, which is how every other brand in this repo has been defeated
  // (`test/brand-spread-sweep.test.mjs`): a spread that blanks the date is still rejected, because
  // the member is required and `undefined` is not a string.
  const spread = tsc([...PRELUDE, 'void planWithStatedPosition(plan, { ...position, asAtDate: undefined });'].join('\n'));
  assert.equal(spread.ok, false, 'a position whose date is spread away typechecks');
});

/** The scratch-file `tsc` harness `test/brand-spread-sweep.test.mjs` uses, against `src/`. */
function tsc(body) {
  const dir = mkdtempSync(join(ROOT, '.tsc-settings-panel-'));
  try {
    const file = join(dir, 'case.ts');
    writeFileSync(file, `${body}\n`);
    let output = '';
    let ok = true;
    try {
      execFileSync(
        process.execPath,
        [
          join(ROOT, 'node_modules', 'typescript', 'bin', 'tsc'),
          '--noEmit', '--strict', '--target', 'ES2022', '--module', 'nodenext',
          '--moduleResolution', 'nodenext', '--verbatimModuleSyntax', '--noUncheckedIndexedAccess',
          file,
        ],
        { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] },
      );
    } catch (error) {
      ok = false;
      output = `${error.stdout ?? ''}${error.stderr ?? ''}`;
    }
    return { ok, output };
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

test('the panel puts the date box in the POSITION form and saves it with the figures', () => {
  const position = /const renderPosition[\s\S]*?\n\};/.exec(PANEL)[0];
  const settings = /const renderSettings[\s\S]*?\n\};/.exec(PANEL)[0];
  assert.match(position, /const asAtDate = input\("", "", values\.asAtDate\)/);
  assert.match(position, /asAtDate: asAtDate\.value/, 'the position form no longer sends the date with the figures');
  assert.doesNotMatch(settings, /asAtDate/, 'the assumptions form has grown a date box');
  // The one save in the position form sends the whole read-back, date included, in one candidate.
  // It is read ONCE into `typed` and that same object is both checked and saved (P3-17 slice 1b) —
  // a second `read()` between the check and the write would be a second reading of the form.
  assert.match(position, /const typed = read\(\);/);
  assert.match(position, /planWithStatedPosition\(host\.currentPlan\(\), typed\)/);
  // Five readings of the form, each of which redraws or saves and none of which writes twice: the
  // three Add buttons, the phase-change redraw, and the one save.
  assert.equal([...position.matchAll(/read\(\)/g)].length, 5, 'the position form reads the boxes somewhere new');
  // P17-6 (2026-09-28): the heading that repeated the date is cut — the panel's own summary names it
  // (pinned below) and the date box is the first control in the form.
  assert.doesNotMatch(PANEL_RAW, /statedAsAtHeading/);
});

test('the side effect of moving the date is DISCLOSED on the form, in the words it happens in', () => {
  const notice = prose('AS_AT_DATE_NOTICE');
  // WHAT IS PINNED HERE IS THE DISCLOSURE, NOT ITS WORDING. On the page: keep the date and the
  // figures together, and moving the date on its own changes the forecast.
  explains('the as-at-date notice', notice, [
    ['that the date goes with the figures', [/whenever you change the figures|together/i]],
    ['that moving the date changes the forecast', [/moving it/i], [/changes the forecast/i]],
  ], 100);
  // P17-3: the mechanics are the guide's now, pinned on its section — the double count, and the
  // three directions a moved date takes an entry dated between the old date and the new one: each
  // direction does something different, so a disclosure naming only some would be worse than none.
  explains('the guide on the as-at date', guideSection('as-at-date'), [
    ['that a figure saved under an older date is grown twice', [/grows it for a whole extra year/i], [/last year/i]],
    ['that the forecast starts at this date and growth starts after it', [/growth starts/i]],
    ['that moving the date FORWARD past a one-off drops it', [/forward/i], [/already paid/i], [/disappears/i]],
    ['that moving the date FORWARD past a standing level applies it from the forecast’s start',
      [/standing level/i], [/very \*\*start\*\*/i]],
    ['that moving the date BACK makes a past event happen again', [/back/i], [/again/i]],
    ['that nothing announces it when it happens', [/nothing warns|doesn't warn/i]],
  ]);
  // It is on the page, beside the date box, and it is the only copy of those words in `src/`.
  assert.match(PANEL_RAW, /infoButton\(AS_AT_DATE_SUMMARY, AS_AT_DATE_NOTICE, 'guide:as-at-date'\)/);
  assert.equal([...PANEL_RAW.matchAll(/AS_AT_DATE_NOTICE/g)].length, 2, 'the notice is defined once and used once');
  // And the SUMMARY is a sentence too. The line above matches a token in the source and cannot see
  // the text behind it, so emptying `AS_AT_DATE_SUMMARY` took the line beside the date box off the
  // page with the whole suite green (P4-15) — leaving the notice reachable only by a user who
  // opens a disclosure with nothing written on it.
  explains('the as-at-date line on the page', prose('AS_AT_DATE_SUMMARY'), [['what the date is', [/today/i]]], 1);
});

// --- §5 The confirmation: every scenario was recomputed ------------------------------------------

test('the confirmation names what changed AND that every scenario was recomputed', () => {
  const after = parsePlan(planWithStatedPosition(PLAN, withInterest(POSITION, 0, 0, { balance: '450000' })));
  const message = positionSaveConfirmation(PLAN, after);
  assert.match(message, /household\.persons\[0\]\.superInterests\[0\]\.balance/);
  assert.match(message, /Every scenario was recomputed/);
  assert.match(message, /all 1 of them share this one household and these settings \(ADR-0002\)/);
  assert.match(message, /all 1 forecasts were rebuilt by this save, not just the one on screen/);
});

test('the scenario COUNT in the confirmation is the file’s own, not a fixed word', () => {
  const three = parsePlan({
    ...PLAN,
    scenarios: [
      ...PLAN.scenarios,
      { id: 'b', name: 'Sell up', parentId: null, entryIds: [] },
      { id: 'c', name: 'Work on', parentId: 'b', entryIds: [] },
    ],
  });
  const after = parsePlan(planWithSettings(three, { ...SETTINGS, nominalReturn: '0.05' }));
  const message = positionSaveConfirmation(three, after);
  assert.match(message, /all 3 of them share/);
  assert.match(message, /all 3 forecasts were rebuilt/);
  assert.match(message, /settings\.nominalReturn/);
});

test('a save that moved nothing says so, rather than claiming a change it cannot see', () => {
  const same = parsePlan(planWithStatedPosition(PLAN, POSITION));
  const message = positionSaveConfirmation(PLAN, same);
  assert.match(message, /Nothing moved — every figure was already what the file held/);
  assert.match(message, /Every scenario was recomputed/);
  assert.deepEqual(changedPositionPaths(PLAN, same), []);
});

test('changedPositionPaths reads the two PLANS, and sees an addition as well as an edit', () => {
  const added = parsePlan(planWithStatedPosition(PLAN, positionWithSuperInterest(POSITION, 0, { ...BLANK_SUPER_INTEREST, balance: '1000' })));
  // An ADDED member is reported as the one path that appeared, not as a field list: there is
  // nothing on the left-hand side to compare its fields against, and "an interest was added" is
  // the fact a reader needs.
  assert.deepEqual(changedPositionPaths(PLAN, added), ['household.persons[0].superInterests[1]']);
  const both = parsePlan(planWithStatedPosition(PLAN, { ...withPerson(POSITION, 0, { name: 'Dana R' }), asAtDate: '2026-10-01' }));
  assert.deepEqual(changedPositionPaths(PLAN, both), ['settings.asAtDate', 'household.persons[0].name']);
});

test('the panel PRINTS that sentence, and only after reading the plan back off the page', () => {
  const announcer = /const saveAndAnnounce[\s\S]*?\n\};/.exec(PANEL)[0];
  assert.match(announcer, /const before = host\.currentPlan\(\);\s*await host\.save\(candidate\);\s*const after = host\.currentPlan\(\);/);
  // Returns false there, and true only after announcing (P11-3, 2026-09-28): Start again's Ledger
  // question is acted on only when this said the plan landed.
  assert.match(announcer, /if \(after === before\) return false;/, 'the panel announces a save that may never have landed');
  assert.match(announcer, /announce\.textContent = describe\(before, after\);\s*return true;/);
  // **`describe` is new (the reset needs its own sentence without its own write, see below), and
  // the fixed call this test used to pin is now its DEFAULT.** What survives the shape change is the
  // property that mattered: the announcement is still a function of `(before, after)` — the same
  // two values read off the page immediately above, `after` included — and `positionSaveConfirmation`
  // is still that function for every caller that does not override it.
  assert.match(
    announcer,
    /describe: \(before: PlanFile, after: PlanFile\) => string = positionSaveConfirmation,/,
    'positionSaveConfirmation is no longer the DEFAULT describe function',
  );
  assert.match(announcer, /announce\.textContent = describe\(before, after\)/, 'the announcement is no longer a function of the plan read back off the page');
  // **THREE call sites now, not two**: the position save (`renderPosition`), the assumptions save
  // (`renderSettings`), and the reset's confirm click (`renderReset`) — the count is pinned so a
  // fourth write path cannot appear unnoticed, exactly as mutation (d) originally guarded two.
  assert.equal([...PANEL.matchAll(/saveAndAnnounce\(host, announce,/g)].length, 3, 'a save that does not announce the recompute, or a write path that has appeared or vanished');
  // `positionSaveConfirmation` is no longer CALLED in this file — it is handed in as the default
  // value of `describe` — so the pin moves from "called once" to "named twice and nowhere else":
  // the import, and the one default-parameter assignment above. A third occurrence would be a
  // second place naming the default, which could quietly name a DIFFERENT one.
  assert.equal([...PANEL.matchAll(/positionSaveConfirmation/g)].length, 2, 'a second wording, or a second place naming the default describe function');
  // The reset's own wording (`resetConfirmation`) is used exactly where it is defined and exactly
  // where it overrides `describe` — nowhere else — so it cannot quietly become a second default for
  // the two figure-saving forms, and the two figure-saving forms cannot quietly borrow the reset's.
  assert.equal([...PANEL.matchAll(/resetConfirmation/g)].length, 2, 'a second wording of the reset confirmation, or the reset has stopped using its own words');
  assert.match(
    PANEL,
    /saveAndAnnounce\(host, announce, walkthroughPlan\(\{ name: name\.value, dateOfBirth: dateOfBirth\.value \}\), \(_before, after\) => \{/,
  );
});

// --- §6 A household edit recomputes EVERY scenario ------------------------------------------------

/** The demo plan with a second, independent scenario — the same household, a different journal. */
const TWO = parsePlan({
  ...PLAN,
  scenarios: [
    ...PLAN.scenarios,
    { id: 'lean', name: 'Spend less', parentId: null, entryIds: ['spend-2026'] },
  ],
});

test('a household edit moves the walk of EVERY scenario, not just the active one', () => {
  const before = scenarioWalks(TWO);
  const after = scenarioWalks(parsePlan(planWithStatedPosition(TWO, withInterest(POSITION, 0, 0, { balance: '500000' }))));
  assert.equal(before.byScenarioId.size, 2);
  assert.equal(after.byScenarioId.size, 2);
  for (const id of ['baseline', 'lean']) {
    const was = before.byScenarioId.get(id);
    const now = after.byScenarioId.get(id);
    assert.notEqual(digest(now), digest(was), `scenario ${id} was not recomputed by a household edit`);
    // The direction, in the month the figure is stated for: month 0 IS the stated position.
    assert.ok(wealth(now[0]) > wealth(was[0]), `scenario ${id}: $88,000 more super did not raise month 0 wealth`);
    assert.ok(now.filter((month, index) => wealth(month) !== wealth(was[index])).length > 100);
  }
  // The two scenarios are still DIFFERENT from each other afterwards — the edit moved both walks,
  // it did not collapse them into one.
  assert.notEqual(digest(after.byScenarioId.get('baseline')), digest(after.byScenarioId.get('lean')));
});

test('a settings edit moves every scenario too, and the two are the one base position', () => {
  const before = scenarioWalks(TWO);
  const after = scenarioWalks(parsePlan(planWithSettings(TWO, { ...SETTINGS, nominalReturn: '0.02' })));
  for (const id of ['baseline', 'lean']) {
    assert.notEqual(digest(after.byScenarioId.get(id)), digest(before.byScenarioId.get(id)), `scenario ${id} ignored the return change`);
  }
});

// --- §7 ADD only: nothing here removes anything (mutation (c)) -----------------------------------

test('no control in the settings panel promises to take anything away', () => {
  const words = literals(PANEL_RAW);
  const promising = words.filter((word) => /\b(delete|remove|removes|removed|deleted|discard)\b/i.test(word));
  assert.deepEqual(promising, [], 'a removal control exists while TODO.md P4-12 stands — a stranded entry silently does nothing');
  // Positive control: the walker reads the labels that ARE there, and they are all adds.
  assert.ok(words.includes('Another person'));
  assert.ok(words.includes('Another super account'));
  assert.ok(words.includes('Another investment — shares or managed funds'));
});

test('no BUILDER exists for a removal either, so a control could not be wired to one', () => {
  for (const forbidden of [/positionWithoutPerson/, /positionWithPersonRemoved/, /planWithPersonRemoved/, /persons\.filter\(/, /superInterests\.filter\(/, /parcels\.filter\(/, /\.splice\(/]) {
    assert.doesNotMatch(EDITS, forbidden, `planEdits.ts has grown a removal: ${forbidden}`);
    assert.doesNotMatch(PANEL, forbidden, `settingsPanel.ts has grown a removal: ${forbidden}`);
  }
  // Positive control: the three ADD builders are there and the walker finds them.
  for (const present of [/export const positionWithPerson/, /export const positionWithSuperInterest/, /export const positionWithParcel/]) {
    assert.match(EDITS, present);
  }
  // And the reason is recorded where a reader of either file will meet it, with the defect's id.
  assert.match(EDITS_RAW, /TODO\.md \(P4-12\)|TODO\.md P4-12/);
  assert.match(PANEL_RAW, /TODO\.md P4-12/);
  assert.match(readFileSync(join(ROOT, 'TODO.md'), 'utf8'), /\*\*P4-12\*\*[\s\S]{0,200}SILENTLY DOES/);
});

// --- §7b The Reset is a NAME+DOB WALKTHROUGH, and the §7 word-scan alone still does not prove it --
//
// ⚠️ **WHY THE SCAN ABOVE IS NO LONGER ENOUGH, restated for the wizard.** The walkthrough takes a
// user's whole household away — every Person, every super interest, every parcel, the offset
// balance, the as-at date, the Division 293 elections, every journal entry and every scenario — and
// replaces all of it with a plan holding just the name and date of birth just typed. That is the
// shape §7's guard exists to catch: "a control that takes something away silently does nothing to
// the entries that pointed at it" (TODO.md P4-12). It is legitimate here only because it is not a
// REMOVAL in P4-12's sense — it replaces the plan file WHOLE, so no entry is left pointing at an
// owner who is gone — but the §7 scan cannot tell the difference: it only greps for the WORDS
// "delete/remove/removed/deleted/discard", and the wizard's copy avoids every one of them on purpose
// (it says "overwrites", "replace my plan", "Start again"). These seven properties are what actually
// make it safe, and each is pinned directly rather than inferred from vocabulary.

test('the reset is a TWO-FIELD WALKTHROUGH that collects first and writes once, not the removal the §7 scan cannot see coming', () => {
  // `resetRaw` for literal button text and the warning's own words (string literals survive here,
  // unlike in `reset` below); `reset` for everything structural, so a forbidden pattern hiding in a
  // COMMENT cannot pass this test by accident the way it could if this only ever looked at raw source.
  const resetRaw = /const renderReset[\s\S]*?\n\};/.exec(PANEL_RAW)[0];
  const reset = /const renderReset[\s\S]*?\n\};/.exec(PANEL)[0];

  // **1. Opening the form writes nothing, and only Finish can reach `host.save`.** The resting
  // branch returns before a `form` even exists; the two boxes are created only in the armed branch,
  // and the only click handler that reaches `saveAndAnnounce` is Finish's.
  assert.match(reset, /if \(!armed\) \{[\s\S]*?return;\n  \}/, 'the resting branch no longer returns before building the form');
  assert.match(reset, /button\(RESET_LABELS\.start,[\s\S]{0,80}\(\) => show\(true\)\)/, 'the resting button no longer just arms the form');
  assert.equal([...reset.matchAll(/saveAndAnnounce\(/g)].length, 1, 'a second place in the reset control can reach the save door');

  // **2. The candidate is built ONLY from the two typed fields — no `host.currentPlan()` anywhere,
  // no spread or merge of an existing plan.** `walkthroughPlan` takes exactly the two box values and
  // nothing else; a spread or a merge would turn "a fresh plan from two answers" back into a partial
  // edit of the plan this control exists to replace whole.
  assert.match(
    reset,
    /void saveAndAnnounce\(host, announce, walkthroughPlan\(\{ name: name\.value, dateOfBirth: dateOfBirth\.value \}\), \(_before, after\) => \{/,
    'the wizard no longer hands its two typed fields straight to walkthroughPlan and saveAndAnnounce',
  );
  assert.doesNotMatch(reset, /host\.currentPlan\(\)/, 'the wizard reads the CURRENT plan — it must build only from what was typed');
  assert.doesNotMatch(reset, /\.\.\.host/, 'the wizard spreads something off the host — a partial reset');
  assert.doesNotMatch(reset, /Object\.assign\(/, 'the wizard merges onto something rather than building fresh');
  assert.equal([...PANEL.matchAll(/walkthroughPlan\(/g)].length, 1, 'a second call site can build a candidate outside this one typed-fields call');

  // **3. `firstRunSeed` appears nowhere in the panel.** The two-click Reset's seed is gone along
  // with it — this control invents nothing and borrows no example plan.
  assert.doesNotMatch(PANEL, /firstRunSeed/, 'firstRunSeed has come back into the panel');
  assert.doesNotMatch(PANEL_RAW, /firstRunSeed/, 'firstRunSeed is still mentioned even in comments — the header describes a design that no longer exists');

  // **4. The destructive warning appears in the FINISH step only, and NOT on the resting button.**
  // `RESET_WARNING` is appended inside the armed branch's `form.append(...)`, after the two boxes,
  // so a user reads it with both typed answers still on screen and the click that costs something
  // still ahead of them — never on the button that only opens the form.
  const resting = /if \(!armed\) \{([\s\S]*?)return;\n  \}/.exec(reset)[1];
  const armedForm = reset.slice(reset.indexOf('return;\n  }'));
  assert.doesNotMatch(resting, /RESET_WARNING/, 'the resting branch shows the irreversibility warning before any form is open');
  assert.match(armedForm, /paragraph\("", RESET_WARNING\)/, 'the armed form has lost the irreversibility warning');
  assert.equal([...resetRaw.matchAll(/RESET_WARNING/g)].length, 1, 'RESET_WARNING now has a second, possibly different, copy in this control');
  assert.doesNotMatch(resting, /WALKTHROUGH_NOTICE/, 'the resting branch has grown the two-field notice as well');
  assert.match(armedForm, /paragraph\("", WALKTHROUGH_NOTICE\)/);
  // The two above pin WHERE the words are placed and can say nothing about the words: `PANEL` has
  // every literal blanked, so both matched a token and stayed green with the sentences emptied
  // (P4-15) — a walkthrough that asks for two fields with no line saying why either is needed, and
  // an invitation with nothing written on the control that starts it. `RESET_WARNING` next to them
  // is pinned by `app-load-plan.test.mjs` and is the shape these two were missing.
  explains('the walkthrough’s two-field notice', prose('WALKTHROUGH_NOTICE'), [
    ['that both fields are needed', [/both/i]],
    ['why the date of birth is one of them', [/age|birth/i]],
  ], 50);
  explains('the walkthrough invitation', prose('WALKTHROUGH_INVITATION'), [
    ['that it builds a plan from what you type', [/name/i], [/birth/i]],
    ['that nothing is written until you finish', [/nothing is written|not written|until you finish/i]],
  ], 50);

  // **5. Finish starts disabled and is enabled only when both fields are non-blank.** Presence only,
  // on the button itself rather than inside the click handler, and gated by BOTH boxes together —
  // a name typed alone, or a date of birth typed alone, must leave Finish unusable.
  assert.match(armedForm, /finish\.disabled = true;/, 'Finish no longer starts disabled');
  assert.match(
    armedForm,
    /finish\.disabled = name\.value\.trim\(\) === "" \|\| dateOfBirth\.value\.trim\(\) === "";/,
    'the enabling gate no longer requires both the name and the date of birth to be non-blank',
  );
  assert.match(armedForm, /name\.addEventListener\("", gate\)/, 'the name box no longer re-checks the gate as it is typed');
  assert.match(armedForm, /dateOfBirth\.addEventListener\("", gate\)/, 'the date of birth box no longer re-checks the gate as it is typed');

  // **6. Exactly one `host.save(` in the whole file, and no second validator, transport or engine of
  // its own.** The wizard shares the one save door with the other two forms — it does not parse,
  // walk or write anything itself.
  assert.equal([...PANEL.matchAll(/host\.save\(/g)].length, 1, 'a second write path has appeared — the wizard must share the one save door');
  for (const forbidden of [/writePlan\(/, /fetch\(/, /parsePlan/, /\bproject\(/, /localStorage/]) {
    assert.doesNotMatch(PANEL, forbidden, `settingsPanel.ts has grown its own ${forbidden}`);
  }

  // **7. Cancel writes nothing.** Its handler is `() => show(false)` and nothing else — no call to
  // `saveAndAnnounce`, `host.save` or `walkthroughPlan` anywhere near it.
  assert.match(armedForm, /button\(RESET_LABELS\.cancel,[\s\S]{0,80}\(\) => show\(false\)\)/, 'Cancel no longer just closes the form without writing');

  // **8. The settings disclosure is opened only on a LANDED write, never on a refusal.**
  // `openDisclosure(box)` sits inside `saveAndAnnounce`'s `describe` callback, which
  // `saveAndAnnounce` calls only after `after !== before` — i.e. only once the write has actually
  // landed (see §5's `if (after === before) return;`). It is not called unconditionally before the
  // save, and not called from Cancel.
  assert.match(
    armedForm,
    /walkthroughPlan\(\{ name: name\.value, dateOfBirth: dateOfBirth\.value \}\), \(_before, after\) => \{\s*openDisclosure\(box\);\s*return resetConfirmation\(after\);\s*\}\)/,
    'openDisclosure no longer sits inside the describe callback that only runs on a landed write',
  );
  assert.equal([...PANEL.matchAll(/openDisclosure\(/g)].length, 1, 'openDisclosure is no longer called in exactly one place');
  assert.equal([...PANEL.matchAll(/const openDisclosure = /g)].length, 1, 'openDisclosure is no longer defined in exactly one place');
  assert.doesNotMatch(armedForm.slice(0, armedForm.indexOf('saveAndAnnounce(')), /openDisclosure/, 'the disclosure opens before the save is even attempted');
});

// --- §8 One write path, and it is the same door (mutation (b)) -----------------------------------

test('the panel writes only through host.save — no transport, no validator, no engine of its own', () => {
  for (const forbidden of [/writePlan/, /fetch\(/, /parsePlan/, /\bproject\(/, /localStorage/]) {
    assert.doesNotMatch(PANEL, forbidden, `settingsPanel.ts has its own ${forbidden}`);
  }
  assert.deepEqual(imports(PANEL_RAW).filter((specifier) => specifier.includes('store/')), []);
  // `./ownerNames.js` is the wording of the two people, shared with the entry editor rather than
  // restated here — pure, no DOM, and it reaches no store and no engine.
  // `./displayMoney.js` is new (P3-17 slice 3 / 2026-09-25 percent ruling): the fee-rate dollar echo
  // goes through `formatDollars`, not `formatCents`, on `displayMoney.ts`'s own no-cents ruling.
  // `./guideTitles.js` and `./rulesInForce.js` (2026-09-30) draw the read-only rules-in-force fold:
  // the build's refresh date, and the pure module that looks the figures up. Neither writes.
  assert.deepEqual(imports(PANEL_RAW), [
    './planEdits.js', './displayMoney.js', './infoButton.js', './guideTitles.js', './rulesInForce.js', './rulesInForce.js',
    './ownerNames.js', './planEdits.js', '../core/parsePlan.js',
  ]);
  // Two writes, both through `host.save`, both inside `saveAndAnnounce`.
  assert.equal([...PANEL.matchAll(/host\.save\(/g)].length, 1, 'the panel has grown a second write path');
  assert.match(PANEL, /await host\.save\(candidate\)/);
  // And the candidate is always one of the two builders — nothing assembles a plan here.
  assert.doesNotMatch(PANEL, /version:/, 'the panel assembles a plan file itself');
  assert.doesNotMatch(PANEL, /household: \{/, 'the panel assembles a household itself');
});

test('main.ts hands the settings panel the SAME save every other editor uses, and no seed at all', () => {
  // The host literal has LOST the third field it once had: `firstRunSeed` is gone, because the
  // wizard builds its own candidate from what was typed rather than being handed an example plan.
  // `save` is unchanged and is still the one every other editor on the page uses.
  // P11-3 (2026-09-28) added a third field, and it is NOT a seed: Start again's separate question
  // about the Ledger, handed over from the Transactions panel (user ruling, default No).
  assert.match(MAIN, /mountSettingsPanel\(settingsBox, \{ currentPlan: \(\) => plan, save, startAgainAlso: \(\) => transactions\?\.startAgainQuestion\(\) \}\)/);
  assert.doesNotMatch(MAIN, /firstRunSeed/, 'main.ts still hands the settings panel a firstRunSeed');
  // That `save` is the one that goes through the gate, and it is still the only write on the page.
  assert.match(MAIN, /stored = await savePlan\(\{ writePlan \}, candidate\)/);
  const bareWrites = [...MAIN.matchAll(/(?<!savePlan\(\{ )\bwritePlan\(/g)];
  assert.deepEqual(bareWrites.map(([match]) => match), [], 'main.ts calls the transport directly, bypassing the validator');
  // And the settings panel is redrawn from the plan that is now on disk, with everything else.
  assert.match(MAIN, /plan = stored\.plan;\s*draw\(plan, stored\.walks\);\s*redrawEntries\(\);\s*redrawScenarios\(\);\s*redrawSettings\(\);/);
  // **`DEMO_PLAN` IS NOT A SEED ANY MORE AND IS NAMED NOWHERE IN `main.ts` (2026-09-20).** This
  // assertion has counted down twice: three occurrences when the reset was handed the same object a
  // first run was seeded from, two when only the loader kept it, and ZERO now that a first run
  // writes nothing at all and asks two questions instead. `DEMO_PLAN` survives as the fixture ~14
  // test files are built from; what it no longer is, anywhere, is a plan somebody else's disk gets.
  assert.match(MAIN, /loaded = await loadPlanOrNone\(\{ readPlan, writePlan \}\)/);
  assert.equal([...MAIN.matchAll(/\bDEMO_PLAN\b/g)].length, 0, 'main.ts names DEMO_PLAN again — a first run must build its plan from what the user typed');
  assert.deepEqual(imports(MAIN_RAW).filter((specifier) => specifier.includes('demoHousehold')), [], 'main.ts imports the demo fixture again');
  // The one plan a first run can produce comes from the two answers, through the one builder.
  assert.match(MAIN, /mountFirstRunPanel\(firstRunBox, \{/);
  assert.match(executableCode(read('app', 'firstRunPanel.ts')), /walkthroughPlan\(\{ name: name\.value, dateOfBirth: dateOfBirth\.value \}\)/);
  // **The new invariant: the wizard reuses `DEMO_SETTINGS` BY VALUE — forecast assumptions, which
  // are impersonal starting numbers — and never reaches for `DEMO_PLAN`'s personal data at all.**
  // `DEMO_SETTINGS` is imported once and used once in `planEdits.ts`'s `walkthroughPlan`, and the
  // demo household, its entries and its baseline scenario's stated `entryIds` are named nowhere in
  // that module — the journal starts empty and the household starts with nobody until Finish states
  // one person.
  assert.match(EDITS_RAW, /import \{ DEMO_SETTINGS \} from '\.\/demoHousehold\.js';/);
  assert.equal([...EDITS.matchAll(/DEMO_SETTINGS/g)].length, 2, 'DEMO_SETTINGS is no longer imported once and used exactly once');
  assert.match(EDITS, /settings: DEMO_SETTINGS,/, 'walkthroughPlan no longer reuses DEMO_SETTINGS by value for the skeleton plan');
  for (const personal of [/DEMO_HOUSEHOLD/, /DEMO_ENTRIES/, /DEMO_BASELINE/]) {
    assert.doesNotMatch(EDITS, personal, `planEdits.ts has reached for ${personal} — personal demo data in the wizard's plan`);
  }
});

test('the panel summary states the date the whole position is stated as at', () => {
  assert.match(MAIN_RAW, /stated as at \$\{shown\.settings\.asAtDate\}/);
  assert.match(MAIN_RAW, /Household and settings — \$\{shown\.household\.persons\.length\}/);
  assert.match(readFileSync(join(ROOT, 'public', 'index.html'), 'utf8'), /<summary><h2 id="settings-summary">Household and settings<\/h2><\/summary>/);
});

test('the Age Pension indexation series is not editable, and travels through untouched', () => {
  // A plan that states one keeps it; and no box anywhere writes into it — the register item O30
  // throw is a page a user could not get back from.
  const series = { rateIndexations: [], meansTestIndexations: [] };
  const stated = parsePlan({ ...PLAN, settings: { ...PLAN.settings, economicSeries: { ...PLAN.settings.economicSeries, agePension: series } } });
  const after = parsePlan(planWithSettings(stated, { ...settingsFormValues(stated), cpi: '0.03' }));
  assert.deepEqual(after.settings.economicSeries.agePension, series);
  assert.equal(after.settings.economicSeries.cpi, 0.03);
  assert.doesNotMatch(PANEL, /agePension/, 'the panel has grown a control for the indexation series');
  assert.doesNotMatch(PANEL, /rateIndexations|meansTestIndexations/);
});

// --- §8b Every bare term on this page is explained, and the four acronyms are expanded ----------
//
// The panel asks for figures nobody can supply from the label alone — a Work Bonus balance, a
// deeming rate, four index rates named by their initials. What is pinned here is that each one
// still carries a plain line AND a disclosure, and that the four acronyms are spelled out where a
// reader meets them. The WORDING is not pinned; the subjects are, exactly as §4 pins the as-at
// notice, so any of these may be said in plainer English without this test moving.

test('the Work Bonus is asked for in plain words, and the mechanic is behind the button', () => {
  const summary = prose('WORK_BONUS_SUMMARY');
  explains('the Work Bonus line on the page', summary, [
    ['that it is pay Centrelink does not count', [/ignore|not count|does not count/i]],
    ['that it is a balance already banked', [/banked|built up|saved up/i]],
    ['what to do if the Age Pension has not started', [/leave 0|type 0|0 if/i]],
  ], 60);
  const notice = prose('WORK_BONUS_NOTICE');
  explains('the Work Bonus disclosure', notice, [
    ['that the balance is the one actually held, and nothing is filled in', [/actually hold/i], [/nothing is filled in/i]],
    ['what the forecast does with it', [/shelter/i], [/income test/i]],
    // P4-10a: who it moves for, and that the forecast now fills in the top-up when the pension starts.
    ['that it moves only while of Age Pension age and paid some', [/Age Pension age/i], [/paid some Age Pension/i]],
    ['that a small balance is topped up when the pension starts', [/topped up/i], [/starts/i]],
  ], 100);
  // P17-3: the four figures and the two gates that `core/workBonus.ts` actually implements are the
  // guide's to state now, and are pinned on its section. A build that changed any of them and left
  // the guide alone would be describing a mechanic it no longer runs.
  explains('the guide on the Work Bonus', guideSection('work-bonus'), [
    ['the $300 a fortnight applied first', [/\$300/]],
    ['that it accrues whether or not you work', [/don't work/i]],
    ['the $11,800 ceiling', [/\$11,800/]],
    ['that it reduces assessed income and not the pension', [/ignored[\s\S]*by the income test/i]],
    ['that investment income is outside it', [/deem/i]],
    ['that it is per person and never shared', [/per person|never cover the other/i]],
    ['that it starts at Age Pension age', [/\b67\b/]],
    ['that it counts only while actually paid', [/actually paid some Age\s+Pension/i]],
    ['the $4,000 top-up when the pension starts', [/under \*\*\$4,000\*\* is topped up to \$4,000/]],
    ['the two-year limit on a top-up', [/last two years/i]],
    ['what the forecast assumes with no top-up day', [/assumes it was topped up on your plan's start date/i]],
    ['the payments it does not model', [/Carer Payment/], [/Disability Support/], [/transitional rate/i]],
  ]);
  assert.match(PANEL_RAW, /label\('Work Bonus last topped up on ', input\('date', 'lastWorkBonusTopUp'/);
  assert.match(PANEL, /infoButton\(WORK_BONUS_TOP_UP_SUMMARY, WORK_BONUS_TOP_UP_NOTICE, ""\)/);
  // Both are on the page, once each, beside the box they are about.
  assert.match(PANEL_RAW, /label\('Work Bonus balance \$', input\('text', 'workBonusBalance'/);
  assert.match(PANEL, /infoButton\(WORK_BONUS_SUMMARY, WORK_BONUS_NOTICE, ""\)/);
});

test('the four index rates LEAD WITH PLAIN WORDS on the label, keep the acronym, and are explained behind it', () => {
  // 2026-09-29 (user ruling): each label says what the rate is in plain words first, and keeps the
  // acronym in brackets so the guide and the published figures can still be matched to it. The
  // subject each disclosure must still name is what the figure is FOR, which is the half a reader
  // cannot guess from the words alone.
  const acronyms = [
    ['CPI', 'Prices, yearly rise', 'CPI_SUMMARY', 'CPI_NOTICE', [/cut-off|free area|threshold|deeming threshold/i]],
    ['PBLCI', 'Pensioners’ cost of living, yearly rise', 'PBLCI_SUMMARY', 'PBLCI_NOTICE', [/basic rate|the payment|pension/i]],
    ['AWOTE', 'Wages, yearly rise', 'AWOTE_SUMMARY', 'AWOTE_NOTICE', [/cap/i]],
    ['MTAWE', 'Age Pension wage benchmark, yearly rise', 'MTAWE_SUMMARY', 'MTAWE_NOTICE', [/benchmark|topped up|below a set share/i]],
  ];
  for (const [acronym, plain, summaryName, noticeName, purpose] of acronyms) {
    assert.ok(
      literals(PANEL_RAW).includes(`${plain} (${acronym}) `),
      `${acronym} does not lead with plain words on its own label — a reader meets four capital letters and nothing else`,
    );
    assert.doesNotMatch(PANEL_RAW, new RegExp(`label\\('${acronym}\\b`), `${acronym} leads its label again`);
    const summary = prose(summaryName);
    explains(`the ${acronym} line on the page`, summary, [['what the figure is', [/assume/i]]], 1);
    const notice = prose(noticeName);
    // P17-3: the plain words are the label's (asserted above) and the notice says only what the rate
    // is FOR; what each index measures, and how the rule uses it, is the guide's.
    explains(`the ${acronym} disclosure`, notice, [['what it is used for', purpose]]);
    assert.match(PANEL, new RegExp(`infoButton\\(${summaryName}, ${noticeName}, ""\\)`));
  }
});

test('the investment holdings are asked for in the user’s words, and “cost base” survives behind the button', () => {
  // The three boxes say what a person knows about a holding. The ATO's own term is not renamed
  // away — it is moved behind the disclosure, where it explains the box rather than labelling it.
  for (const asked of ['When you bought it ', 'What you paid ', 'What it’s worth now ']) {
    assert.ok(literals(PANEL_RAW).includes(asked), `the holdings form no longer asks "${asked}"`);
  }
  const notice = prose('INVESTMENTS_NOTICE');
  explains('the investment holdings disclosure', notice, [
    ['that what you paid is the cost base', [/cost base/i]],
    ['that it is the tax office’s term', [/Australian Taxation Office|tax office/i]],
    ['that each row is one purchase', [/one row per purchase|each row is one purchase/i]],
  ], 100);
  // P17-3: why the date matters is a tax rule, and it is the guide's to state now.
  explains('the guide on investment holdings', guideSection('investment-parcels'), [
    ['that the purchase date decides the tax on a sale', [/more than a year|twelve months|12 months/i], [/half the gain/i]],
    ['that this is not the home and not property', [/isn't for your home|not.*(home|property)/i]],
  ]);
  assert.match(PANEL, /infoButton\(INVESTMENTS_SUMMARY, INVESTMENTS_NOTICE, ""\)/);
  // The line beside the button is pinned too (P4-15): the assertion above matches the TOKEN
  // `INVESTMENTS_SUMMARY` in the source, so it stays green with the sentence emptied, and the
  // section heading would then be the only thing telling a user what may go in these boxes.
  explains('the investment holdings line on the page', prose('INVESTMENTS_SUMMARY'), [
    ['what may go in the boxes', [/shares|managed funds|investments/i]],
    ['that the home is not one of them', [/not.*(home|property)/i]],
  ], 50);
});

test('no word for a holding, an account or a person is left for the engine to choose', () => {
  // A `guide:` label names a page of the user guide and is never shown (the link shows the chapter
  // title), so it is not a word the form uses (P17-3).
  const words = literals(PANEL_RAW).filter((word) => !word.startsWith('guide:'));
  // "parcel" is the engine's word for one purchase and it is not the user's. It is gone from every
  // visible string here, which is the half the earlier pass (the month table and the chart) left.
  assert.deepEqual(words.filter((word) => /\bparcels?\b/i.test(word)), [], 'the form is asking the user about a "parcel" again');
  assert.deepEqual(words.filter((word) => /\bsuper interest\b/i.test(word)), [], 'the form is calling a super account an "interest" again');
  // The two people are called what `ownerNames.ts` calls them, and the wording is IMPORTED rather
  // than written out twice — a second copy is how the two pages come to disagree.
  assert.deepEqual(words.filter((word) => /\bPerson [AB]\b/.test(word)), [], 'the panel is back to naming the two people by letter');
  assert.match(PANEL_RAW, /import \{ UNNAMED_PERSON_LABELS \} from '\.\/ownerNames\.js'/);
  assert.deepEqual(words.filter((word) => /\b(First|Second) person\b/.test(word)), [], 'the panel restates the wording instead of importing it');
  assert.match(PANEL, /UNNAMED_PERSON_LABELS\[personIndex === 0 \? 0 : 1\]/);
  // And the name the person typed wins over the position, as it does in the entry editor.
  assert.match(PANEL_RAW, /name\.value\.trim\(\) === '' \?/);
  assert.deepEqual(UNNAMED_PERSON_LABELS, ['First person', 'Second person']);
});

test('every remaining bare term on this page carries a plain line and a disclosure', () => {
  // Seven more terms a user cannot be expected to know, each pinned by the subjects its box exists
  // for — read off the line AND the disclosure together, since P17-3 lets either carry them — and,
  // where the subject is a rule, on the guide section the box links to. Emptying any of these texts
  // fails the length floor. Where a subject left the box and the guide does not state it, it is
  // named in TODO.md P17-3 rather than pinned here.
  const cases = [
    ['EMPLOYMENT_INCOME', 'household-people',
      [['that it is before tax', [/before tax/i]], ['that investment income is counted elsewhere', [/counted elsewhere/i]]],
      [['that it is before tax', [/before/i], [/gross/i]]]],
    ['SUPER_PHASE', 'super-accounts',
      [['that the phase decides whether it pays you', [/pays you/i]]],
      [['what a retirement income stream must pay out', [/at least/i]], ['what accumulation is', [/building up/i]]]],
    ['HOME', 'home-status',
      [['that the home’s value is never counted', [/no value|never (counted|enters)/i]], ['that it decides which limit applies', [/cut-off|limit/i]]],
      [['that the home’s value is not asked for', [/doesn't ask what your home is worth/i]], ['that it decides which limit applies', [/limits apply/i]]]],
    ['OFFSET', 'offset-account',
      [['that it is the cash the forecast pays from', [/pays everything/i]]],
      [['that it is the jar everything is paid from', [/everything is paid into and out of/i]]]],
    ['PLANNING_HORIZON', 'assumption-boxes',
      [['that the forecast says nothing past it', [/stops?|nothing.*after/i]], ['that two people run to the last of them', [/last of you|later of/i]]],
      [['that it is the age the forecast stops at', [/before the forecast stops/i]]]],
    ['NOMINAL_RETURN', 'growth-guess',
      [['that it is before inflation', [/before[- ]inflation/i]]],
      [['that one rate is used for every account', [/same one for\s+every account/i]], ['that it moves the answer most', [/more than anything else/i]]]],
    ['DEEMING', 'deeming',
      [['that it is assumed, not actual, income', [/whatever they actually earn|assumes/i]]],
      [['the lower rate, then the upper', [/lower rate/i], [/higher rate/i]], ['that it is assumed, not actual', [/assumes a rate/i]]]],
  ];
  for (const [name, label, onThePage, inTheGuide] of cases) {
    const summary = prose(`${name}_SUMMARY`);
    // P17-6: the line on the page is short by ruling — not empty is the floor, and the subjects are
    // pinned on the line and the disclosure together, just below.
    explains(`the ${name} line on the page`, summary, [], 1);
    const notice = prose(`${name}_NOTICE`);
    explains(`the ${name} box`, `${summary} ${notice}`, onThePage);
    explains(`the guide’s {#${label}}`, guideSection(label), inTheGuide);
    assert.match(PANEL_RAW, new RegExp(`infoButton\\(${name}_SUMMARY, ${name}_NOTICE, 'guide:${label}'\\)`), `${name} is explained in source but not on the page`);
    assert.equal(
      [...PANEL.matchAll(new RegExp(`${name}_NOTICE`, 'g'))].length,
      2,
      `${name}_NOTICE is not defined once and used once — a third mention is a second wording`,
    );
  }
});

// --- §9 What is NOT proven here -------------------------------------------------------------------

test('the unproven residue, written down rather than implied', () => {
  // 1. No DOM: nothing here runs `mountSettingsPanel`. That the boxes are filled with the values
  //    `positionFormValues` produced, that the Add buttons redraw without losing what was typed,
  //    and that `read()` picks up the right input for the right person are all settled by looking
  //    at the page, not by this file. What IS pinned is every decision behind them.
  // 2. The `read()` walker finds inputs by `name`, so two people's boxes are told apart by the
  //    `<fieldset>` they are inside. A regression that flattened the markup would read Person A's
  //    balance into Person B and no assertion here would fail.
  // 3. `statedPriorRetirementPhase` and `statedStreamSettings` are carried by POSITION. A user who
  //    re-orders their super interests by hand in the file and then saves this form moves a
  //    commencement day onto a different interest. The form cannot re-order, so it is unreachable
  //    from the page — it is not unreachable from the file.
  // 4. The confirmation is asserted as a STRING, not as something a user read.
  // 5. The Division 293 election's DOM is pinned as source: that the `<select>` renders, that the
  //    phase box's redraw keeps what was typed, and that the chosen option survives a save and a
  //    reload were checked by opening the page in a headless browser (P6-11) and are not checked
  //    here. What IS proved here is every decision behind that control — what it may offer, what
  //    it opens on, what it writes and what it removes. **The election is also carried by POSITION
  //    in the sense (3) describes**: the box names a slot, so a user who re-orders their interests
  //    by hand in the file and then saves moves the election onto a different interest.
  assert.doesNotMatch(PANEL, /jsdom|happy-dom/, 'a DOM arrived and this residue can be closed');
  assert.match(PANEL, /block\.querySelector/, 'the residue in (2) describes a walker that no longer exists');
});

// --- §10 The Contingency Floor — P4-14 -------------------------------------------------------------
//
// The figure the page used to invent. `main.ts` held `const DEMO_FLOOR = toCents(700_000)` and drew
// every forecast against it; it is a Setting now, it is optional, and a blank box means no floor at
// all rather than a floor of nothing.

test('the contingency floor is EXPLAINED, and the explanation lands the four things a reader could get wrong', () => {
  const summary = prose('CONTINGENCY_FLOOR_SUMMARY');
  explains('the contingency-floor line on the page', summary, [
    ['what the figure is', [/kept back|held back|set aside|never spent/i]],
    ['that blank is an answer', [/leave it empty|blank|empty/i]],
  ], 50);
  const notice = prose('CONTINGENCY_FLOOR_NOTICE');
  // P17-3: the box says what the figure is, which money it is in, what the line does and that it
  // moves no forecast — the line and the disclosure read together. That a nil typed in the box is
  // refused is said by the refusal itself when it happens; it is pinned on the guide section instead
  // (P17-3a).
  explains('the contingency-floor box', `${summary} ${notice}`, [
    ['what a buffer IS', [/kept back|hold back|held back|set aside|kept aside/i], [/aged care|health|late-life|new roof/i]],
    ['that it is in today’s money', [/today’s money|today's money/i]],
    ['that the line rises with prices', [/rises?|rising|grows?/i], [/price|prices/i]],
    ['that it changes no forecast', [/changes nothing|not an instruction|no spending is reduced|not a dollar moves/i]],
    ['that empty is how you say you keep nothing back', [/leave it empty/i]],
  ]);
  explains('the guide on the contingency buffer', guideSection('other-assumption-boxes'), [
    ['what a buffer IS', [/keep aside and never spend/i]],
    ['that it changes no forecast', [/doesn't change the forecast/i], [/draws a line/i]],
    ['that a nil typed is refused, and empty means none', [/Leave it empty for\s+"none"/i], [/refused/i]],
  ]);
  // The jargon ban this page keeps: the words an explanation is not allowed to lean on.
  for (const banned of [/\bnominal\b/i, /\breal terms\b/i, /\bdeflat/i, /\bindexation\b/i, /\bCPI\b/]) {
    assert.doesNotMatch(notice, banned, `the floor notice uses ${banned} — a reader is not obliged to know it`);
    assert.doesNotMatch(summary, banned, `the floor summary uses ${banned}`);
  }
  // On the page, once, under the control it explains — and the label says which money it is in,
  // because the box itself cannot.
  assert.match(PANEL, /infoButton\(CONTINGENCY_FLOOR_SUMMARY, CONTINGENCY_FLOOR_NOTICE, ""\)/);
  assert.equal([...PANEL.matchAll(/CONTINGENCY_FLOOR_NOTICE/g)].length, 2, 'the notice is not defined once and used once');
  const label = literals(PANEL_RAW).find((text) => /Contingency buffer/.test(text));
  assert.ok(label !== undefined, 'the floor box lost its label');
  assert.match(label, /today’s money/);
  assert.match(label, /blank if you have none/);
});

test('the floor box ROUND-TRIPS, and a blank one writes NO KEY', () => {
  // The demo plan states no floor — every plan written before 2026-09-21 does — so the box is empty
  // and the save must put the file back exactly as it was, key for key.
  assert.equal(Object.hasOwn(PLAN.settings, 'contingencyFloor'), false);
  assert.equal(SETTINGS.contingencyFloor, '', 'an absent floor must be an EMPTY box, never a "0" one');
  const back = parsePlan(planWithSettings(PLAN, SETTINGS));
  assert.equal(Object.hasOwn(back.settings, 'contingencyFloor'), false);
  assert.deepEqual(back, PLAN);
  assert.equal(JSON.stringify(back), JSON.stringify(PLAN));

  // Typed, it survives as cents and comes back as the same text.
  const stated = parsePlan(planWithSettings(PLAN, { ...SETTINGS, contingencyFloor: '250000.00' }));
  assert.equal(stated.settings.contingencyFloor, 250_000_00);
  assert.equal(settingsFormValues(stated).contingencyFloor, '250000.00');
  assert.deepEqual(parsePlan(planWithSettings(stated, settingsFormValues(stated))), stated);
  // And it can be taken away again by clearing the box, which is the only way to say "no floor".
  const cleared = parsePlan(planWithSettings(stated, { ...settingsFormValues(stated), contingencyFloor: '' }));
  assert.equal(Object.hasOwn(cleared.settings, 'contingencyFloor'), false);
  assert.deepEqual(cleared, PLAN);
});

test('a NIL floor typed into the box is REFUSED by the door, not saved as "no floor"', () => {
  // Two spellings of one fact is how a user comes to believe they told this build something they
  // did not. The door names the field and says which spelling to use.
  const nil = refusalFrom(() => parsePlan(planWithSettings(PLAN, { ...SETTINGS, contingencyFloor: '0' })));
  assert.ok(nil instanceof PlanFileSettingsError);
  assert.match(nil.message, /settings\.contingencyFloor/);
  assert.match(nil.message, /Leave the whole "contingencyFloor" key out/);
  const negative = refusalFrom(() => parsePlan(planWithSettings(PLAN, { ...SETTINGS, contingencyFloor: '-100' })));
  assert.ok(negative instanceof PlanFileSettingsError);
  // The control, one cent away: a floor of $0.01 is a floor and is accepted.
  assert.equal(parsePlan(planWithSettings(PLAN, { ...SETTINGS, contingencyFloor: '0.01' })).settings.contingencyFloor, 1);
});

test('MAIN no longer names a floor of its own — the $700,000 the page used to invent is gone', () => {
  assert.doesNotMatch(MAIN, /DEMO_FLOOR/, 'main.ts still holds its own Contingency Floor');
  assert.doesNotMatch(MAIN, /700[_,]?000/, 'main.ts still names the figure it used to invent');
  // And the floor it draws comes from the plan, through the one reading of it.
  assert.match(MAIN, /statedContingencyFloor\(plan\.settings\)/);
  // The RAW source too, because the constant lived in a comment-documented `const` and a string
  // literal would be blanked by `executableCode`: no bare dollar figure anywhere in the file.
  assert.doesNotMatch(MAIN_RAW.replace(/^\s*(\/\/|\*|\/\*).*$/gm, ''), /toCents\(/, 'main.ts constructs money again');
});

// --- §11 EVERY BOX WRITES THROUGH — TODO.md P8-2 --------------------------------------------------
//
// **The item this section discharges, and the reason it is a test rather than a paragraph.** P8-2
// says the plan is saved *on every change*, and the doubt written into it was never about the
// transport: it was **whether every settings-panel field writes through, or only some**. A prose
// answer to that rots the moment a box is added, and this panel has grown three times in two days
// (the super fees, the home loan, the contingency floor). So the question is asked in code, and it
// is asked of the SOURCE rather than of a list kept here by hand.
//
// **The defect class it exists to catch is a DROPPED FIGURE, and a dropped figure is silent.** It
// parses, it projects, it draws a chart — the fee that is no longer charged, the loan that is no
// longer owed and the election that is now answered "out of cash" all read as a plan somebody
// meant. Every one of them flatters. The three tests are:
//
//   1. **DISCOVERY** — every control the panel renders is found by reading `settingsPanel.ts` and
//      `firstRunPanel.ts` for the calls that build one, and the set must match `ROUND_TRIPS` below
//      exactly, in both directions. A box added and left unwired is an unknown key, and this fails
//      naming it; a form value that loses its box fails the other way.
//   2. **HARVEST** — every discovered control name is read back out of the form somewhere in the
//      same file. A control whose `name` and whose `field('…')` lookup drift apart reads as empty
//      and is saved as empty.
//   3. **ROUND TRIP** — each field is given a sentinel value, taken through the real builder, the
//      real door and the real inverse reader, and must come back as itself. The sentinel is
//      asserted DIFFERENT from what the demo plan already holds, so a field the builder ignores
//      cannot pass by echoing the old value back.
//
// What this does NOT prove is §9's residue: there is no DOM here, so "the control renders" and
// "`read()` picked up the right person's box" are still settled by looking at the page.

/** Comments stripped, string literals KEPT — the mirror of `executableCode`, and the reason is that
 *  a control's NAME is a literal, so the transform this file uses everywhere else would blank the
 *  very thing being discovered. */
const codeWithLiterals = (text) =>
  text
    .replaceAll(/\/\*[\s\S]*?\*\//g, '')
    .replaceAll(/`(?:[^`\\]|\\.)*`|'(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*"|\/\/.*$/gm, (match) =>
      match.startsWith('//') ? '' : match,
    );

/** The argument list of every `fn(…)` call in `code`, split on top-level commas. Quote-aware, so a
 *  label holding a comma ("Administration fee, as a share…") does not split into two arguments. */
const callSites = (code, fn) => {
  const sites = [];
  for (const at of code.matchAll(new RegExp(`\\b${fn}\\(`, 'g'))) {
    const args = [];
    let depth = 0;
    let quote = '';
    let current = '';
    for (let index = at.index + at[0].length - 1; index < code.length; index += 1) {
      const character = code[index];
      if (quote !== '') {
        if (character === '\\') { current += character + code[index + 1]; index += 1; continue; }
        if (character === quote) quote = '';
        current += character;
        continue;
      }
      if (character === "'" || character === '"' || character === '`') { quote = character; current += character; continue; }
      if ('([{'.includes(character)) { depth += 1; if (depth === 1) continue; }
      if (')]}'.includes(character)) { depth -= 1; if (depth === 0) { args.push(current.trim()); break; } }
      if (character === ',' && depth === 1) { args.push(current.trim()); current = ''; continue; }
      current += character;
    }
    sites.push(args);
  }
  return sites;
};

/**
 * **Every editable control in a source file, discovered rather than listed.** The three builders
 * that can put one on the page are `input`, `select` and `rateBox`, and each takes the control's
 * `name` in a known position; `chooser.name = '…'` is the fourth, the Division 293 election, which
 * is assembled by hand rather than through a builder.
 *
 * `forwarded` is every call site whose name is NOT a literal — a name this scan cannot see through.
 * There is exactly one today (`rateBox` handing its own parameter down to `input`), and the test
 * below pins that, so a second wrapper cannot quietly hide a box from the discovery.
 */
const NAME_ARGUMENT = [['input', 1], ['select', 0], ['rateBox', 1]];
const controlNames = (source) => {
  const code = codeWithLiterals(source);
  const names = [];
  const forwarded = [];
  for (const [fn, position] of NAME_ARGUMENT) {
    for (const args of callSites(code, fn)) {
      const argument = args[position] ?? '';
      const literal = /^(['"`])([\s\S]*)\1$/.exec(argument);
      if (literal === null) forwarded.push(`${fn}(${args.join(', ')})`);
      else names.push(literal[2]);
    }
  }
  for (const [, name] of code.matchAll(/\.name\s*=\s*'([^']*)'/g)) names.push(name);
  return { names, forwarded };
};

const PANEL_CONTROLS = controlNames(PANEL_RAW);
const FIRST_RUN_RAW = read('app', 'firstRunPanel.ts');
const FIRST_RUN_CONTROLS = controlNames(FIRST_RUN_RAW);
/**
 * A repeated row names its boxes `balance-0`, `balance-1`, …; the field is what is left. P3-4b
 * slice 2's unused-cap boxes are one per financial year, `unusedConcessionalCap-2025-26`, …
 */
const FIELD_OF = (name) => name.replace(/-\$\{(?:index|year)\}$/, '');
const DISCOVERED = [...PANEL_CONTROLS.names, ...FIRST_RUN_CONTROLS.names].map(FIELD_OF);

const withParcel = (values, index, position, changes) =>
  withPerson(values, index, {
    parcels: values.persons[index].parcels.map((parcel, at) => (at === position ? { ...parcel, ...changes } : parcel)),
  });

/** The first option that is not the one the demo plan already states — so a new option added to
 *  either list cannot leave the sentinel equal to the baseline and the round trip vacuous. */
const otherThan = (options, current) => options.find((option) => option !== current);

/**
 * **The form each control belongs to, and one sentinel value per field.**
 *
 * The SET of keys here is not maintained by hand — it is asserted equal to `DISCOVERED`, so the
 * only way to add a box to the panel is to state here what it should round-trip as. That is the
 * `parsePlan` allowlist shape: unknown key, closed door, named field.
 *
 * `also` is for the fields that cannot be stated alone. The three loan boxes are written as ONE
 * key or not at all (`statedMortgage`), so a lone one converts its two blank companions to `NaN`
 * and the door refuses the plan — correctly. `key` is for a control whose name is not the field it
 * writes: the walkthrough asks for a name and a date of birth and builds a whole new plan from them.
 */
const BLANK_TWO = [POSITION.persons[0].superInterests[0], { ...BLANK_SUPER_INTEREST, balance: '0' }];
const ROUND_TRIPS = {
  asAtDate: { form: 'position', value: '2026-10-01' },
  homeStatus: { form: 'position', value: otherThan(HOME_STATUS_OPTIONS, POSITION.homeStatus) },
  openingOffsetBalance: { form: 'position', value: '31415.92' },
  // Coverage gap 1: cars, contents and other things owned, in today's money.
  personalAssets: { form: 'position', value: '27182.81' },
  // **Interest on cash (2026-09-23).** The first Person's share; the second owns the rest.
  offsetSharePercent: { form: 'position', value: '30' },
  mortgageBalance: { form: 'position', value: '250000.00', also: { mortgageInterestRate: '0.0575', mortgageRepayment: '1800.00' } },
  mortgageInterestRate: { form: 'position', value: '0.0575', also: { mortgageBalance: '250000.00', mortgageRepayment: '1800.00' } },
  mortgageRepayment: { form: 'position', value: '1800.00', also: { mortgageBalance: '250000.00', mortgageInterestRate: '0.0575' } },

  name: { form: 'person', value: 'Sentinel Wren' },
  dateOfBirth: { form: 'person', value: '1970-01-02' },
  employmentIncomePerFortnight: { form: 'person', value: '2222.22' },
  workBonusBalance: { form: 'person', value: '333.00' },
  // **P4-10a.** A day on or before the demo plan's date and not before 2024-01-01.
  lastWorkBonusTopUp: { form: 'person', value: '2025-03-14' },
  releaseAuthorityInterest: { form: 'person', value: '0' },
  // **Register O82 (2026-09-29).** Written only while shown: a salary (Dana has one) and two accumulation accounts.
  employerPaysInto: { form: 'person', value: '1', also: { superInterests: [BLANK_TWO[0], BLANK_TWO[1]] } },
  // **The switch at retirement (2026-09-23).** Yes is the stated prior pension; No is the default.
  priorRetirementPhase: { form: 'person', value: PRIOR_PENSION_YES },
  // **P3-4b slice 2.** One box per window year; the demo plan (2026-09-01) offers FY2021-22 to
  // FY2025-26, and FY2025-26 is typed. The 30 June box is shown because the date is not 1 July.
  unusedConcessionalCap: { form: 'unusedCap', key: '2025-26', value: '1234.00' },
  totalSuperBalanceAt30June: { form: 'person', value: '480000.00' },

  phase: { form: 'interest', value: otherThan(SUPER_PHASE_OPTIONS, POSITION.persons[0].superInterests[0].phase) },
  balance: { form: 'interest', value: '654321.00' },
  administrationFeePerYear: { form: 'interest', value: '480.00' },
  // **P3-17 slice 3 (2026-09-25).** A cap needs a rate stated beside it — the door's own rule.
  administrationFeeCapPerYear: { form: 'interest', value: '750.00', also: { administrationFeeRate: '0.21' } },
  // **PERCENT AS TYPED (2026-09-25).** `0.21` is 0.21% a year, not the decimal fraction `0.21`.
  administrationFeeRate: { form: 'interest', value: '0.21' },
  investmentFeeRate: { form: 'interest', value: '0.34' },
  // **P3-17 slice 4 (2026-09-25).** The account-based pension phase's own fee set, same shape as
  // the three above.
  pensionAdministrationFeePerYear: { form: 'interest', value: '520.00' },
  pensionAdministrationFeeCapPerYear: { form: 'interest', value: '1300.00', also: { pensionAdministrationFeeRate: '0.16' } },
  pensionAdministrationFeeRate: { form: 'interest', value: '0.16' },
  // **P3-17a slice 1.** A premium needs its cover type, and the type and the admin fee need a premium.
  deathPremiumPerYear: { form: 'interest', value: '310.00', also: { insuranceCoverKind: 'fixed' } },
  tpdPremiumPerYear: { form: 'interest', value: '190.00', also: { insuranceCoverKind: 'fixed' } },
  insuranceCoverKind: { form: 'interest', value: 'age-based', also: { deathPremiumPerYear: '310.00' } },
  insuranceAdminFeePerYear: { form: 'interest', value: '22.20', also: { deathPremiumPerYear: '310.00', insuranceCoverKind: 'fixed' } },
  // **P3-17b.** The income protection premium and its benefit period are stated together or not at all.
  incomeProtectionPremiumPerYear: { form: 'interest', value: '420.00', also: { incomeProtectionBenefitPeriod: '5-years' } },
  incomeProtectionBenefitPeriod: { form: 'interest', value: 'to-65', also: { incomeProtectionPremiumPerYear: '420.00' } },
  // The age each cover ends (2026-09-29): a whole number, blank is 70.
  deathCoverEndsAtAge: { form: 'interest', value: '66' },
  tpdCoverEndsAtAge: { form: 'interest', value: '65' },
  // **TTR build step 2.** Both boxes are written only for a `ttr` interest, and the door refuses a
  // `ttr` interest with no start date — so each travels with the phase and, for the rate, a date.
  ttrStartDate: { form: 'interest', value: '2028-05-14', also: { phase: 'ttr' } },
  ttrDrawdownRate: { form: 'interest', value: '6.5', also: { phase: 'ttr', ttrStartDate: '2028-05-14' } },
  // **The switch at retirement (2026-09-23).** The demo's first account is in accumulation, so the
  // box is shown and "stays as it is" is the answer that differs from the default.
  atRetirement: { form: 'interest', value: AT_RETIREMENT_KEEP },

  acquired: { form: 'parcel', value: '2015-06-30' },
  costBase: { form: 'parcel', value: '12345.00' },
  marketValue: { form: 'parcel', value: '54321.00' },
  // **LR-1 slice 4.** Written only for a plan starting after 1 July 2027, so it travels with that date.
  valueJustBefore1July2027: { form: 'stampedParcel', value: '43210.00' },

  planningHorizonAge: { form: 'settings', value: '97' },
  contingencyFloor: { form: 'settings', value: '54321.00' },
  // **P3-22h step 1.** The franked share cannot be stated alone — the door refuses a share of a
  // payout nobody stated — so it travels with a rate, on the three loan boxes' `also` rule.
  investmentPayoutRate: { form: 'settings', value: '0.0375' },
  investmentPayoutFrankedShare: { form: 'settings', value: '0.65', also: { investmentPayoutRate: '0.0375' } },
  // **P3-42 step 1.** No pairing to state: unlike the franked share, this rate stands on its own.
  superIncomeYieldRate: { form: 'settings', value: '0.0225' },
  // **P3-42 step 3.** Cannot be stated alone — the door refuses a share of an income share nobody
  // stated — so it travels with the rate, on `investmentPayoutFrankedShare`'s own `also` rule.
  superIncomeYieldFrankedShare: { form: 'settings', value: '0.6', also: { superIncomeYieldRate: '0.0225' } },
  // **Interest on cash (2026-09-23).** Stands on its own; blank would follow the CPI box.
  cashInterestRate: { form: 'settings', value: '0.031' },
  nominalReturn: { form: 'settings', value: '0.0555' },
  deemingLower: { form: 'settings', value: '0.0125' },
  deemingUpper: { form: 'settings', value: '0.0425' },
  cpi: { form: 'settings', value: '0.0275' },
  pblci: { form: 'settings', value: '0.0285' },
  awote: { form: 'settings', value: '0.0325' },
  mtawe: { form: 'settings', value: '0.0345' },

  walkthroughName: { form: 'walkthrough', key: 'name', value: 'Sentinel Wren', also: { dateOfBirth: '1971-03-04' } },
  walkthroughDateOfBirth: { form: 'walkthrough', key: 'dateOfBirth', value: '1971-03-04', also: { name: 'Sentinel Wren' } },
  firstRunName: { form: 'walkthrough', key: 'name', value: 'Sentinel Wren', also: { dateOfBirth: '1971-03-04' } },
  firstRunDateOfBirth: { form: 'walkthrough', key: 'dateOfBirth', value: '1971-03-04', also: { name: 'Sentinel Wren' } },
};

/** A plan date after 1 July 2027: the one kind of plan that states a parcel's value just before it. */
const AFTER_THE_REFORM = '2027-09-01';

/** The real builder, the real door, the real inverse reader — no shortcuts, per form. */
const SAVED = {
  position: (patch) => positionFormValues(parsePlan(planWithStatedPosition(PLAN, { ...POSITION, ...patch }))),
  person: (patch) => positionFormValues(parsePlan(planWithStatedPosition(PLAN, withPerson(POSITION, 0, patch)))).persons[0],
  interest: (patch) =>
    positionFormValues(parsePlan(planWithStatedPosition(PLAN, withInterest(POSITION, 0, 0, patch)))).persons[0].superInterests[0],
  parcel: (patch) =>
    positionFormValues(parsePlan(planWithStatedPosition(PLAN, withParcel(POSITION, 0, 0, patch)))).persons[0].parcels[0],
  stampedParcel: (patch) =>
    positionFormValues(parsePlan(planWithStatedPosition(PLAN, { ...withParcel(POSITION, 0, 0, patch), asAtDate: AFTER_THE_REFORM }))).persons[0].parcels[0],
  settings: (patch) => settingsFormValues(parsePlan(planWithSettings(PLAN, { ...SETTINGS, ...patch }))),
  unusedCap: (patch) =>
    positionFormValues(parsePlan(planWithStatedPosition(PLAN, withPerson(POSITION, 0, {
      unusedConcessionalCap: { ...POSITION.persons[0].unusedConcessionalCap, ...patch },
    })))).persons[0].unusedConcessionalCap,
  walkthrough: (patch) => positionFormValues(parsePlan(walkthroughPlan({ ...patch }))).persons[0],
};

/** What the demo plan holds in each of those places, which every sentinel must differ from. */
const BEFORE = {
  position: POSITION,
  person: POSITION.persons[0],
  interest: POSITION.persons[0].superInterests[0],
  parcel: POSITION.persons[0].parcels[0],
  stampedParcel: POSITION.persons[0].parcels[0],
  settings: SETTINGS,
  unusedCap: POSITION.persons[0].unusedConcessionalCap,
  walkthrough: POSITION.persons[0],
};

test('the control on the discovery: it sees a box that is there, and invents none where there are none', () => {
  // The positive control is the whole point — this is the scan that has to notice a NEW box, so it
  // is shown noticing one, in all four shapes a box is built in.
  assert.deepEqual(controlNames("const box = input('text', 'aBrandNewBox', '');").names, ['aBrandNewBox']);
  assert.deepEqual(controlNames("select('aBrandNewChooser', OPTIONS, '')").names, ['aBrandNewChooser']);
  assert.deepEqual(controlNames("rateBox('Some fee ', 'aBrandNewRate', '')").names, ['aBrandNewRate']);
  assert.deepEqual(controlNames("chooser.name = 'aBrandNewElection';").names, ['aBrandNewElection']);
  // And not finding things that are not there, including a name that only ever appears in prose.
  assert.deepEqual(controlNames('const total = 1 + 2;').names, []);
  assert.deepEqual(controlNames("// input('text', 'commentedOut', '')\nconst x = 1;").names, []);
  // A comma inside a label is not an argument boundary: `rateBox` takes one before the name.
  assert.deepEqual(controlNames("rateBox('Administration fee, as a share ', 'administrationFeeRate-0', '')").names,
    ['administrationFeeRate-0']);
  // A floor, so an extraction that silently returned nothing could not pass the equality below by
  // matching an emptied table.
  assert.ok(DISCOVERED.length >= 30, `only ${DISCOVERED.length} controls found — the scan has stopped seeing the panel`);
});

test('EVERY control on the panel is a field the save path carries — discovered from the source, not listed here', () => {
  // ⚠️ If this fails with an unknown name, a box was added to the form and nothing was taught to
  // save it. That is P8-2's whole question, and the answer is not "add it to the list" — it is to
  // wire the box through `planEdits.ts` and then state here what it round-trips as.
  assert.deepEqual(
    [...new Set(DISCOVERED)].sort(),
    Object.keys(ROUND_TRIPS).sort(),
    'a control on the panel has no round trip stated for it, or a round trip names a control that is gone',
  );
  // The one call site whose name this scan cannot read is `rateBox` handing its parameter down.
  // A SECOND wrapper would be a place a box could hide from the discovery above.
  assert.deepEqual(PANEL_CONTROLS.forwarded, ["input('text', name, value)"],
    'a new control builder forwards a name this scan cannot see — teach `controlNames` about it');
  assert.deepEqual(FIRST_RUN_CONTROLS.forwarded, []);
  // The other way a box could dodge the scan: built by hand rather than through a builder. There
  // are exactly three raw control elements in these two files — the `input` helper, the `select`
  // helper, and the Division 293 chooser, which is found by its `chooser.name =` line. A fourth is
  // a control this scan cannot see, so the count is pinned rather than the shape.
  for (const [element, expected] of [['input', 1], ['select', 3], ['textarea', 0]]) {
    const raw = [...PANEL_RAW.matchAll(new RegExp(`createElement\\('${element}'\\)`, 'g'))].length
      + [...FIRST_RUN_RAW.matchAll(new RegExp(`createElement\\('${element}'\\)`, 'g'))].length;
    assert.equal(raw, expected,
      `a <${element}> is built by hand somewhere new — either give it a name this scan can find, or teach \`controlNames\` about it`);
  }
});

test('the form VALUES hold no field that has no box, and no box writes a field the values do not hold', () => {
  // The other direction, and it is read off the shapes the two inverse readers actually produce —
  // `tsc` already forces `read()` to fill every key of them, so this closes the ring: box → key →
  // builder → file → key → box.
  const { persons, ...position } = POSITION;
  const { superInterests, parcels, ...person } = persons[0];
  const keys = [
    ...Object.keys(position),
    ...Object.keys(person),
    ...Object.keys(superInterests[0]),
    ...Object.keys(parcels[0]),
    ...Object.keys(SETTINGS),
  ].sort();
  // The walkthrough's two boxes build a whole plan rather than fill a field, so they are not in
  // either form's values; `firstRunPanel.ts` asks the same two questions in its own words.
  const boxes = [...new Set(PANEL_CONTROLS.names.map(FIELD_OF))]
    .filter((name) => !name.startsWith('walkthrough'))
    .sort();
  assert.deepEqual(boxes, keys);
});

test('every control name is HARVESTED — the box that is rendered is the box that is read', () => {
  // The `name` a control is built with and the `name` the save reads it back by are two literals,
  // and nothing but this makes them the same one. Drift them apart and the box reads as empty,
  // which is saved as empty: the figure the user typed is gone with no refusal anywhere.
  const PANEL_CODE = codeWithLiterals(PANEL_RAW);
  const FIRST_RUN_CODE = codeWithLiterals(FIRST_RUN_RAW);
  // The walkthrough's boxes are held in local `const name` / `const dateOfBirth`, so they are read
  // through the variable and not through a name lookup; the alias is what is checked instead.
  const ALIAS = {
    walkthroughName: 'name', walkthroughDateOfBirth: 'dateOfBirth',
    firstRunName: 'name', firstRunDateOfBirth: 'dateOfBirth',
  };
  for (const [name, code] of [
    ...PANEL_CONTROLS.names.map((name) => [name, PANEL_CODE]),
    ...FIRST_RUN_CONTROLS.names.map((name) => [name, FIRST_RUN_CODE]),
  ]) {
    const variable = ALIAS[name] ?? name;
    const harvests = [
      `field('${name}')`,
      `field(\`${name}\`)`,
      `boxes.${name}.value`,
      `${variable}.value`,
    ];
    assert.ok(
      harvests.some((expression) => code.includes(expression)),
      `the "${name}" box is rendered and never read: nothing in the file matches ${harvests.join(' or ')}`,
    );
  }
});

test('EVERY discovered field round-trips: typed → the builder → the door → back into the box', () => {
  for (const [name, spec] of Object.entries(ROUND_TRIPS)) {
    const field = spec.key ?? FIELD_OF(name);
    const patch = { [field]: spec.value, ...(spec.also ?? {}) };
    // The anti-vacuity check, and it is not a formality: a sentinel equal to what the plan already
    // states would pass for a field the builder throws away, because the old value comes back.
    assert.notEqual(spec.value, BEFORE[spec.form][field], `the sentinel for "${name}" is what the plan already holds`);
    assert.notEqual(spec.value, undefined, `"${name}" has no sentinel value`);
    const back = SAVED[spec.form](patch);
    assert.equal(
      back[field],
      spec.value,
      `"${name}" DOES NOT WRITE THROUGH: typed ${JSON.stringify(spec.value)}, the file gave back ${JSON.stringify(back[field])}`,
    );
  }
});

test('a save touches nothing but the boxes that were typed into', () => {
  // The other half of "it writes through": a builder that carried a field by overwriting its
  // neighbours would pass every assertion above. One field moves, and only that one.
  const back = SAVED.interest({ balance: '654321.00' });
  assert.deepEqual(back, { ...POSITION.persons[0].superInterests[0], balance: '654321.00' });
  const assumptions = SAVED.settings({ cpi: '0.0275' });
  assert.deepEqual(assumptions, { ...SETTINGS, cpi: '0.0275' });
  // And the as-at date is still the only thing the position write touches in `settings`.
  assert.deepEqual(
    parsePlan(planWithStatedPosition(PLAN, { ...POSITION, asAtDate: '2026-10-01' })).settings,
    { ...PLAN.settings, asAtDate: '2026-10-01' },
  );
});

// --- §12 THE INERT RATE BOXES SAY THEY ARE INERT — P6-12, user ruling 2026-09-21 ------------------
//
// `pblci`, `awote` and `mtawe` are rendered, saved and read back correctly (§11 proves that) and
// **drive no figure in any projection**. The user ruled they STAY, as placeholders for a phase that
// is planned — and that is a fine reason to keep a box. It is not a reason for the box to describe
// the law as though it were plumbed in.
//
// Before this, `PBLCI_NOTICE` told the reader the figure they typed was "one of the two limbs that
// decide the payment". True of the Act; false of this build. A reader would conclude their number
// moved their pension. That is the same defect the fee, today's-money, mortgage and floor notices
// were each written to avoid: a screen that is silent about what it does not do.
//
// **The pin is a property, not a phrase.** It asserts each notice CARRIES A DISCLOSURE and that the
// disclosure names the substitute — what the build does INSTEAD — so a future author cannot satisfy
// it with a bare "not used". Proven below to fail on emptied text, which is the check `CONTEXT.md`
// names and which several older pins in this repo do not survive.
// ⚠️ **AWOTE LEFT THIS LIST ON 2026-09-21 (P6-12), AND IT LEFT BECAUSE THE BOX WAS PLUMBED IN.**
// The disclosure discipline is unchanged and the two remaining boxes are still held to it; what
// changed is that `awote` now indexes the concessional contributions cap beyond the published year,
// so a notice saying "NOT USED YET" would itself be the false claim this test exists to prevent. Its
// replacement is pinned in the test below, to the same standard and with the same emptied-text
// proof — a box that DOES something has more to disclose than one that does not, not less.
// ⚠️ **PBLCI AND MTAWE LEFT THE INERT LIST ON 2026-09-23, FOR THE SAME REASON AWOTE DID.** The user
// ruled that Age Pension rates and cut-offs rise by default, so both boxes now drive every Age
// Pension figure past the published window, and "NOT USED YET" would be the false claim this section
// exists to prevent. The subjects are pinned, not the wording.
test('the PBLCI and MTAWE boxes say what they now DO, and call every derived figure a forecast', () => {
  // ⚠️ **P17-3 (2026-09-28) took the mechanics out of both boxes**: which index is the larger limb,
  // the $1,833-a-week anchor, the 41.76% floor and the 19 March 2027 end of the published window are
  // rules and figures, and a box no longer restates one. What the box still owes the reader is the
  // disclosure this section exists for: that the box DOES move the pension, and that every derived
  // figure is a forecast; the mechanics are pinned on the guide section instead (P17-3a).
  const live = [
    ['PBLCI_NOTICE', PBLCI_NOTICE, [['what it drives', [/Age Pension/]], ['what kind of rate it is', [/index/i]]]],
    ['MTAWE_NOTICE', MTAWE_NOTICE, [['what it drives', [/Age Pension/]], ['what kind of rate it is', [/benchmark|topped up/i]]]],
  ];
  for (const [name, text, subjects] of live) {
    explains(name, text, [
      ...subjects,
      ['that the box is typed by the user', [/your figures/i]],
      ['that only the years after the published rates are derived', [/after the last published rates/i]],
      ['that the derived figures are a forecast and not law', [/not the law/i]],
      ['that a stated series overrides it', [/stated|states its own/i]],
    ]);
    assert.doesNotMatch(text, /NOT USED YET/, `${name} still says the box is unused`);
    assert.doesNotMatch(text, /changes nothing/i, `${name} still says the box changes nothing`);
  }
  explains('the guide on PBLCI and MTAWE', guideSection('other-assumption-boxes'), [
    ['which limb is the larger one', [/whichever is (larger|bigger)/i], [/PBLCI/i], [/CPI/i]],
    ['the 41.76% floor', [/41\.76%/]],
    ['the MTAWE anchor', [/\$1,833 a week/i], [/May 2026/i]],
    ['the end of the published window', [/19 March 2027/]],
    ['that a stated series overrides it', [/own dated (series|figures)/i]],
  ]);
});

test('the disclosure pin FAILS on emptied text — it is not a constant compared with itself', () => {
  for (const empty of ['', '   ', 'Not used.']) {
    assert.throws(
      () => explains('a stub', empty, [['not used yet', [/NOT USED YET/]]]),
      /too short to be the explanation|no longer explains/,
      `an emptied notice passed the pin, which makes it decorative (tried ${JSON.stringify(empty)})`,
    );
  }
  // Positive control: a reworded but COMPLETE notice still passes, so the pin is not a phrase-pin.
  const reworded =
    'A different wording entirely, of ample length to clear the floor that guards against a stub, ' +
    'which still tells the reader this is NOT USED YET, that the build reads rates that have been ' +
    'announced instead, and that the figure changes nothing on the page today.';
  explains('a reworded notice', reworded, [
    ['that the box is not used yet', [/NOT USED YET/]],
    ['that it changes nothing today', [/changes nothing/i]],
    ['what the build does instead', [/announced|published/i]],
  ]);
});

// --- §12b THE AWOTE BOX IS LIVE, AND EVERY YEAR IT MOVES IS LABELLED A FORECAST — P6-12 -----------
//
// The user's ruling of 2026-09-21 was two things, and the second is this one: *"do it, and label
// it."* The cap is published for ONE year. Every later year on the screen is now computed from the
// rate in this box, and the screen has to say so — not because the figure is doubtful in the way a
// guess is, but because a reader who is not told will take a cap this build derived for a cap
// Parliament set, and will not know that editing one box moves it.
//
// **The subjects are pinned, not the wording**, exactly as §12 pins the other two: which year is
// published, that later years follow the rate typed here, the $2,500 step the cap moves in, and
// that those years are a forecast rather than law. Proven below to fail on emptied text.
test('the AWOTE box says what it now DOES, and calls every derived year a forecast', () => {
  // P17-3: which year is published and the $2,500 step the cap moves in are figures, and a box no
  // longer restates one; they are pinned on the guide section instead (P17-3a). The disclosure stays.
  explains('the AWOTE disclosure', AWOTE_NOTICE, [
    ['that the cap follows this box', [/rate you type|you type here|this box/i], [/cap/i]],
    ['that pay follows it too', [/salary|pay/i]],
    ['that only the years after the published cap are derived', [/after the last published/i]],
    ['that the derived years are a forecast and not law', [/not law|rather than the law|not the law/i]],
  ]);
  // The retired claim is GONE rather than reworded: the box is used, so nothing in it may say it is
  // not, and nothing may say it changes nothing on the page.
  assert.doesNotMatch(AWOTE_NOTICE, /NOT USED YET/);
  assert.doesNotMatch(AWOTE_NOTICE, /changes nothing/i);
  explains('the guide on AWOTE', guideSection('assumption-boxes'), [
    ['which year is published and for how much', [/\$32,500 for 2026-27/]],
    ['the $2,500 step', [/\$2,500.{0,20}steps/i]],
    ['that 0 keeps the cap where it is', [/\btype \*\*0\*\*/i], [/stays at \$32,500/i]],
    ['that a stated salary-sacrifice amount is not indexed', [/salary-sacrifice amount/i], [/same number of dollars/i]],
  ]);
  // And the pin is not decorative — the same emptied-text control §12 applies to the inert boxes.
  for (const empty of ['', '   ', 'It indexes the cap.']) {
    assert.throws(
      () => explains('a stub', empty, [['that the derived years are a forecast', [/not law/i]]]),
      /too short to be the explanation|no longer explains/,
      `an emptied AWOTE notice passed the pin (tried ${JSON.stringify(empty)})`,
    );
  }
});

// --- §13 THE "NO ELECTION" LABEL CARRIES ITS CONSEQUENCE — P4-15 family (C) ----------------------
//
// One of only two unpinned constants that could cause a WRONG DECISION rather than a visible gap
// (the other is `SWITCH_SCOPE_NOTE` — `SHARED_CHANGE_WARNING` until 2026-09-22 — pinned in
// `app-scenario-panel.test.mjs`). The remaining
// eleven are headings and labels: if one vanished the screen would look broken, which is a defect
// that ANNOUNCES ITSELF. This one does not announce itself.
//
// It is an OPTION LABEL that carries the consequence of choosing it. Reduced to "No election" it
// still reads as a complete, sensible choice — while silently dropping where several thousand
// dollars of Division 293 charge actually comes from. A user picking it would not know they had
// chosen to pay it out of their own cash rather than from the fund.
//
// Pinned as a PROPERTY, not a phrase: a floor, and the two subjects that make it a consequence
// rather than a name. Proved below to fail on emptied text.
test('the NO-ELECTION label says where the money comes from, not just that there is no election', () => {
  explains('NO_RELEASE_ELECTION_LABEL', prose('NO_RELEASE_ELECTION_LABEL'), [
    ['which charge it is about', [/Division 293/]],
    ['that the charge falls on the person, not the fund', [/own cash|their cash|out of .*cash/i]],
  ], 40);
});

test('the NO-ELECTION pin FAILS on a label stripped back to its name', () => {
  for (const stub of ['', '   ', 'No election']) {
    assert.throws(
      () => explains('a stub', stub, [
        ['which charge it is about', [/Division 293/]],
        ['that the charge falls on the person', [/own cash|their cash|out of .*cash/i]],
      ], 40),
      /too short to be the explanation|no longer explains/,
      `a stripped label passed the pin, which makes it decorative (tried ${JSON.stringify(stub)})`,
    );
  }
});

// --- §12 What the investments pay out — P3-22h step 1 of three ------------------------------------
//
// Two boxes and NOTHING BEHIND THEM YET, on purpose. Step 1 asks the user for the two figures and
// keeps them; step 2 pays the money out and taxes it as ordinary income; step 3 counts the company
// tax already paid on it. The figures are asked for together because a step 3 with no stated share
// would be inert for every user — a change that moves no figure ships nothing.
//
// **The defect class this section exists for is this project's own**, and it has cost real time
// twice: a Setting that SAVES but never LOADS, or that loads and is never READ, fails no test at
// all. The key-list and harvest scans in §11 are discovery-based and pass whatever the boxes do. So
// the round trip is asserted through the real builder, the real door and the real inverse reader,
// a drifted control name is shown to go red, and the "nothing reads it yet" claim is asserted as
// BEHAVIOUR rather than written down.

test('P3-22h — both payout boxes ROUND-TRIP, and a blank one writes NO KEY', () => {
  // The demo plan states neither — every plan written before 2026-09-22 states neither — so both
  // boxes are empty and the save must put the file back exactly as it was, key for key.
  assert.equal(Object.hasOwn(PLAN.settings, 'investmentPayoutRate'), false);
  assert.equal(Object.hasOwn(PLAN.settings, 'investmentPayoutFrankedShare'), false);
  assert.equal(SETTINGS.investmentPayoutRate, '', 'an absent payout must be an EMPTY box, never a "0" one');
  assert.equal(SETTINGS.investmentPayoutFrankedShare, '', 'an absent share must be an EMPTY box, never a "0" one');
  const untouched = parsePlan(planWithSettings(PLAN, SETTINGS));
  assert.deepEqual(untouched, PLAN);
  assert.equal(JSON.stringify(untouched), JSON.stringify(PLAN));

  // Typed, both survive the door AS TYPED and come back into the same boxes. This is the assertion
  // that a Setting which saves but never loads cannot pass: the value is read back off the parsed
  // plan by the inverse reader, not off the object that was handed in.
  const stated = parsePlan(planWithSettings(PLAN, {
    ...SETTINGS, investmentPayoutRate: '0.042', investmentPayoutFrankedShare: '0.8',
  }));
  assert.equal(stated.settings.investmentPayoutRate, 0.042);
  assert.equal(stated.settings.investmentPayoutFrankedShare, 0.8);
  const boxes = settingsFormValues(stated);
  assert.equal(boxes.investmentPayoutRate, '0.042');
  assert.equal(boxes.investmentPayoutFrankedShare, '0.8');
  // And round again: the file the boxes rebuild is the file they were read from, byte for byte.
  assert.equal(JSON.stringify(parsePlan(planWithSettings(stated, boxes))), JSON.stringify(stated));

  // The payout may be stated alone — a portfolio can pay out with nothing credited on it.
  const rateOnly = parsePlan(planWithSettings(PLAN, { ...SETTINGS, investmentPayoutRate: '0.042' }));
  assert.equal(rateOnly.settings.investmentPayoutRate, 0.042);
  assert.equal(Object.hasOwn(rateOnly.settings, 'investmentPayoutFrankedShare'), false);

  // Cleared, both keys go away again, which is the only way to say "they pay me nothing".
  const cleared = parsePlan(planWithSettings(stated, {
    ...boxes, investmentPayoutRate: '', investmentPayoutFrankedShare: '',
  }));
  assert.equal(Object.hasOwn(cleared.settings, 'investmentPayoutRate'), false);
  assert.equal(Object.hasOwn(cleared.settings, 'investmentPayoutFrankedShare'), false);
  assert.deepEqual(cleared, PLAN);
});

test('P3-22h — a NIL, a NEGATIVE, an over-full share, and a share with no payout are all REFUSED', () => {
  const refused = (patch) => {
    const error = refusalFrom(() => parsePlan(planWithSettings(PLAN, { ...SETTINGS, ...patch })));
    assert.ok(error instanceof PlanFileSettingsError, `${JSON.stringify(patch)} was not refused by the settings section`);
    return error;
  };
  // Nil and negative, on the Contingency Floor's rule: absence is the ONE spelling of "nothing".
  assert.match(refused({ investmentPayoutRate: '0' }).message, /Leave the whole "investmentPayoutRate" key out/);
  assert.match(refused({ investmentPayoutRate: '-0.04' }).message, /settings\.investmentPayoutRate/);
  assert.match(refused({ investmentPayoutRate: '0.04', investmentPayoutFrankedShare: '0' }).message,
    /Leave the whole "investmentPayoutFrankedShare" key out/);
  // A share of a payout cannot exceed the payout. This ceiling is structural, not a figure anybody
  // legislated, which is why it is the only ceiling here — the payout rate itself has none.
  assert.match(refused({ investmentPayoutRate: '0.04', investmentPayoutFrankedShare: '1.2' }).message,
    /no greater than 1/);
  // A share with nothing to be a share OF: the figure would be typed, saved and inert, which is
  // exactly the defect this section exists for. It is refused at the door, naming the missing box.
  assert.match(refused({ investmentPayoutFrankedShare: '0.8' }).message, /no "investmentPayoutRate" is stated/);
  // The controls, so none of the above passes for being unreadable: the boundary values are taken.
  const edge = parsePlan(planWithSettings(PLAN, { ...SETTINGS, investmentPayoutRate: '0.0001', investmentPayoutFrankedShare: '1' }));
  assert.equal(edge.settings.investmentPayoutRate, 0.0001);
  assert.equal(edge.settings.investmentPayoutFrankedShare, 1);
});

test('P3-22h — a DRIFTED control name on either box goes red: rendered here, read back there', () => {
  // The failure this guards is silent: a box whose `name` and whose read-back drift apart renders,
  // accepts what is typed, and saves nothing. §11's harvest scan is what catches it, and this is
  // that scan shown CATCHING it — the real source with one token changed, not a hand-made stub.
  const harvested = (source, name) => {
    const code = codeWithLiterals(source);
    return [`field('${name}')`, `field(\`${name}\`)`, `boxes.${name}.value`, `${name}.value`]
      .some((expression) => code.includes(expression));
  };
  for (const name of ['investmentPayoutRate', 'investmentPayoutFrankedShare']) {
    assert.equal(harvested(PANEL_RAW, name), true, `the "${name}" box is not read back at all`);
    // Drift ONLY the rendered name literal. The box is still built and still on the page; nothing
    // reads it any more, and the user's figure is lost with no refusal anywhere.
    const drifted = PANEL_RAW.replace(`input('text', '${name}'`, `input('text', '${name}Typo'`);
    assert.notEqual(drifted, PANEL_RAW, `the drift could not be applied — "${name}" is not built the way this test assumes`);
    assert.ok(controlNames(drifted).names.includes(`${name}Typo`), 'the scan did not see the drifted name');
    assert.equal(harvested(drifted, `${name}Typo`), false,
      `a drifted "${name}" is still harvested, so the scan would not notice the drift`);
  }
});

test('P3-22h STEP 3 LANDED — the payout rate and the franked share both now move the forecast', () => {
  // ⚠️ **INVERTED AGAIN, 2026-09-22, on this test's own instruction — its second inversion.** Step 1
  // asserted `after === before` for BOTH figures. Step 2 inverted the rate alone, and this file's
  // own comment named the day the franked share would invert too: "that is step 3, not step 2". This
  // is that day — `frankedShareAlso` must now DIFFER from `rateStated`, not equal it.
  const before = digest(validatedPlan(planWithSettings(PLAN, SETTINGS)).months);
  const rateStated = digest(validatedPlan(planWithSettings(PLAN, {
    ...SETTINGS, investmentPayoutRate: '0.042',
  })).months);
  assert.notEqual(rateStated, before, 'the payout rate moved no figure — step 2 has not landed after all');
  const frankedShareAlso = digest(validatedPlan(planWithSettings(PLAN, {
    ...SETTINGS, investmentPayoutRate: '0.042', investmentPayoutFrankedShare: '0.8',
  })).months);
  assert.notEqual(frankedShareAlso, rateStated, 'the franked share moved no figure — step 3 has not landed after all');
  // Vacuity control: the same digest over the same walk DOES move on a figure the walk reads, so
  // the inequality above is a fact about `investmentPayoutFrankedShare` and not a digest that
  // always changes.
  const moved = digest(validatedPlan(planWithSettings(PLAN, { ...SETTINGS, nominalReturn: '0.03' })).months);
  assert.notEqual(moved, before, 'the digest does not move on ANY settings change — it is not reading the walk');
  // And a share stated ALONE, with no rate, moves nothing — there is no payout for it to be a share
  // OF (`parsePlan`'s own refusal covers the door; this is the walk agreeing with it).
  const shareAloneRefused = () => planWithSettings(PLAN, { ...SETTINGS, investmentPayoutFrankedShare: '0.8' });
  assert.throws(() => validatedPlan(shareAloneRefused()));
  // And the engine now names BOTH fields — it is wired. `test/core-individual-franking.test.mjs`
  // holds the module-level trip-wire that step 3 turned red by design; this is the field-level one,
  // updated rather than deleted.
  const projection = read('core', 'projection.ts');
  assert.match(projection, /investmentPayoutRate/);
  assert.match(projection, /investmentPayoutFrankedShare/);
});

test('P3-22h — the two boxes are asked for in PLAIN WORDS, and the jargon ban holds', () => {
  // ⚠️ **INVERTED, 2026-09-28 (P17-3), and it is the canary TODO.md's stale-help item named.** Until
  // then this pinned the step-1 interim copy — "not counted yet", "reads a little high", "neither
  // figure changes your forecast today" — for eight days after step 3 made all three false. It now
  // pins the opposite, so the interim copy cannot come back.
  const summary = prose('INVESTMENT_PAYOUT_SUMMARY');
  explains('the payout line on the page', summary, [
    ['that both are used now', [/used in your forecast/i]],
  ], 1);
  const notice = prose('INVESTMENT_PAYOUT_NOTICE');
  explains('the payout box', `${summary} ${notice}`, [
    ['what the boxes are about', [/pay you|pays you|pay their owners/i]],
  ]);
  explains('the payout disclosure', notice, [
    ['that the payout is taxed once a year', [/once a year/i], [/tax/i]],
    ['that it is reinvested, not paid out as cash', [/straight back into the holdings|reinvest/i]],
    ['what the second box does', [/tax already paid/i], [/reduces that tax/i]],
    ['that blank is an answer', [/leave either box empty/i]],
  ], 100);
  for (const stale of [/not (yet )?counted|not counted yet/i, /a little high|more tax .* than you will really pay/i, /changes your forecast today|neither figure changes/i, /later steps?/i]) {
    assert.doesNotMatch(`${summary} ${notice}`, stale, `the payout box says ${stale} again — false since P3-22h step 3`);
  }
  // The rules are the guide's, pinned on its section: when, where the payout goes, the credit and
  // its refund, and the refusal of a share with no rate.
  explains('the guide on the yearly payout', guideSection('investment-payout'), [
    ['when it is taxed', [/last day of the financial year/i]],
    ['that it is reinvested', [/reinvested straight back/i]],
    ['that the credit is applied and any left over refunded', [/franking credit/i], [/refunded/i]],
    ['that the second box alone is refused', [/without a payout rate above it is refused/i]],
  ]);

  // **The words this page may not use.** The standing rule is that on-screen text is short and
  // jargon-free, and the accountant's vocabulary for these two figures is the clearest case of it
  // in the build: a reader is not obliged to know any of these to answer either question.
  for (const banned of [/\bfrank(ed|ing)?\b/i, /\bimputation\b/i, /\bgross[- ]up\b/i, /\bdistribution/i, /\boffset\b/i, /P3-22/, /\bT4[0-9]\b/]) {
    assert.doesNotMatch(notice, banned, `the payout notice uses ${banned} — a reader is not obliged to know it`);
    assert.doesNotMatch(summary, banned, `the payout summary uses ${banned}`);
  }
  // On the page, once, under the two controls it explains — and each label carries the one thing
  // the box cannot: which decimal is meant, and that blank is an answer.
  assert.match(PANEL, /infoButton\(INVESTMENT_PAYOUT_SUMMARY, INVESTMENT_PAYOUT_NOTICE, ""\)/);
  assert.equal([...PANEL.matchAll(/INVESTMENT_PAYOUT_NOTICE/g)].length, 2, 'the notice is not defined once and used once');
  // Anchored at the start, because the SUMMARY line says "pay you each year" too and a loose
  // filter would count it as a third label and pass this test for the wrong reason.
  const labels = literals(PANEL_RAW).filter((text) =>
    /^Yearly payout, share of value/.test(text) || /^Share already company-taxed/.test(text));
  assert.equal(labels.length, 2, 'one of the two payout labels is gone');
  for (const label of labels) {
    assert.match(label, /\(0\.\d+ is \d+%/, 'the label no longer says which decimal is meant');
    assert.match(label, /blank/, 'the label no longer says that blank is an answer');
    for (const banned of [/\bfrank(ed|ing)?\b/i, /\bimputation\b/i, /\bdistribution/i]) {
      assert.doesNotMatch(label, banned, `a payout label uses ${banned}`);
    }
  }
});

// --- §14 What share of super's growth is income — P3-42 step 1 of three ---------------------------
//
// One box and NOTHING BEHIND IT YET, on `investmentPayoutRate`'s own precedent (§12): step 1 asks
// the user for the figure and keeps it; a later step is what spends it. The "nothing reads it yet"
// claim is asserted as BEHAVIOUR, the same way §12 asserts it, and not merely written down.

test('P3-42 — the income-yield box ROUND-TRIPS, and a blank one writes NO KEY', () => {
  assert.equal(Object.hasOwn(PLAN.settings, 'superIncomeYieldRate'), false);
  assert.equal(SETTINGS.superIncomeYieldRate, '', 'an absent rate must be an EMPTY box, never a "0" one');
  const untouched = parsePlan(planWithSettings(PLAN, SETTINGS));
  assert.deepEqual(untouched, PLAN);
  assert.equal(JSON.stringify(untouched), JSON.stringify(PLAN));

  // Typed, it survives the door AS TYPED and comes back into the same box — read off the parsed
  // plan by the inverse reader, not off the object handed in, so a Setting that saves but never
  // loads cannot pass.
  const stated = parsePlan(planWithSettings(PLAN, { ...SETTINGS, superIncomeYieldRate: '0.021' }));
  assert.equal(stated.settings.superIncomeYieldRate, 0.021);
  const boxes = settingsFormValues(stated);
  assert.equal(boxes.superIncomeYieldRate, '0.021');
  assert.equal(JSON.stringify(parsePlan(planWithSettings(stated, boxes))), JSON.stringify(stated));

  // Cleared, the key goes away again, which is the only way to say "nothing counts as income".
  const cleared = parsePlan(planWithSettings(stated, { ...boxes, superIncomeYieldRate: '' }));
  assert.equal(Object.hasOwn(cleared.settings, 'superIncomeYieldRate'), false);
  assert.deepEqual(cleared, PLAN);
});

test('P3-42 — a NIL and a NEGATIVE income-yield rate are REFUSED, and a large one is not', () => {
  const refused = (patch) => {
    const error = refusalFrom(() => parsePlan(planWithSettings(PLAN, { ...SETTINGS, ...patch })));
    assert.ok(error instanceof PlanFileSettingsError, `${JSON.stringify(patch)} was not refused by the settings section`);
    return error;
  };
  assert.match(refused({ superIncomeYieldRate: '0' }).message, /Leave the whole "superIncomeYieldRate" key out/);
  assert.match(refused({ superIncomeYieldRate: '-0.02' }).message, /settings\.superIncomeYieldRate/);
  // No ceiling, on `investmentPayoutRate`'s own ground: the boundary values are taken.
  const edge = parsePlan(planWithSettings(PLAN, { ...SETTINGS, superIncomeYieldRate: '0.0001' }));
  assert.equal(edge.settings.superIncomeYieldRate, 0.0001);
});

test('P3-42 — a DRIFTED control name on the box goes red: rendered here, read back there', () => {
  const harvested = (source, name) => {
    const code = codeWithLiterals(source);
    return [`field('${name}')`, `field(\`${name}\`)`, `boxes.${name}.value`, `${name}.value`]
      .some((expression) => code.includes(expression));
  };
  assert.equal(harvested(PANEL_RAW, 'superIncomeYieldRate'), true, 'the "superIncomeYieldRate" box is not read back at all');
  const drifted = PANEL_RAW.replace("input('text', 'superIncomeYieldRate'", "input('text', 'superIncomeYieldRateTypo'");
  assert.notEqual(drifted, PANEL_RAW, 'the drift could not be applied — "superIncomeYieldRate" is not built the way this test assumes');
  assert.ok(controlNames(drifted).names.includes('superIncomeYieldRateTypo'), 'the scan did not see the drifted name');
  assert.equal(harvested(drifted, 'superIncomeYieldRateTypo'), false,
    'a drifted "superIncomeYieldRate" is still harvested, so the scan would not notice the drift');
});

test('P3-42 STEP 2 LANDED — the income-yield rate now moves the forecast', () => {
  // ⚠️ **INVERTED, 2026-09-22, on `investmentPayoutRate`'s own precedent** (see the STEP 3 test
  // above): step 1 asserted `stated === before`. This is step 2 landing, and the inequality flips.
  const before = digest(validatedPlan(planWithSettings(PLAN, SETTINGS)).months);
  const stated = digest(validatedPlan(planWithSettings(PLAN, { ...SETTINGS, superIncomeYieldRate: '0.021' })).months);
  assert.notEqual(stated, before, 'the income-yield rate moved no figure — step 2 has not landed after all');
  const projection = read('core', 'projection.ts');
  assert.match(projection, /superIncomeYieldRate/);
});

test('P3-42 STEP 3 LANDED — both super income-yield boxes are asked for in PLAIN WORDS, and the jargon ban holds', () => {
  // ⚠️ **REWRITTEN, 2026-09-22, on step 3 landing.** The earnings-tax mechanic and the credit
  // shipped in one build rather than across three, so there is no "not counted yet" interim state
  // to test for here — `INVESTMENT_PAYOUT`'s own pair of tests (§12, the P3-22h STEP 1/STEP 3
  // pair above) is what a staged build's copy looks like; this pair never had a staged copy.
  const summary = prose('SUPER_INCOME_YIELD_SUMMARY');
  explains('the super income-yield line on the page', summary, [
    ['that both are used now', [/used in your super’s forecast/i]],
  ], 1);
  explains('the super income-yield box', `${summary} ${prose('SUPER_INCOME_YIELD_NOTICE')}`, [
    ['what the first figure is about', [/treated as income/i]],
    ['what the second figure is about', [/already been taxed/i]],
  ]);

  // P17-3: the box says what the two figures decide; the mechanics — the fund's own rate, the
  // retirement-phase refund in cash, share-of-balance rather than dollars and why, and the three
  // refusals — are pinned on the guide section instead (P17-3a).
  const notice = prose('SUPER_INCOME_YIELD_NOTICE');
  explains('the super income-yield disclosure', notice, [
    ['what the two figures decide', [/tax your super fund pays/i]],
    ['that blank is an answer for both', [/leave either box empty/i], [/nothing is guessed/i]],
  ], 100);
  explains('the guide on the super income-yield boxes', guideSection('other-assumption-boxes'), [
    ['what the two figures are about', [/treated as income/i], [/tax your super fund pays/i]],
    ['that it is the fund’s own, lower rate', [/fund’s own \(lower\) rate|fund's own \(lower\) rate|lower rate your own fund uses/i]],
    ['why a share of balance is asked for rather than dollars', [/not a dollar\s+(figure|amount)/i], [/flatter|look\s+better\s+than\s+it\s+really\s+is/i]],
    ['that the share is nil in pension phase with the credit refunded in cash', [/paying you a pension/i], [/refunded to you in cash/i]],
    ['that a nil is refused, and the second box alone is refused', [/(nil|zero)\s+(typed\s+)?into\s+either\s+box\s+is\s+refused/i], [/second box alone/i]],
  ]);

  // **The words this page may not use** — the same standing rule §12's ban states, and the same
  // reason: the accountant's vocabulary for what a super fund does with what it earns is jargon a
  // reader did not sign up for.
  for (const banned of [/\bfrank(ed|ing)?\b/i, /\bimputation\b/i, /\bgross[- ]up\b/i, /\bECPI\b/i, /P3-4[0-9]/, /\bO[0-9]+\b/, /\bT[0-9]+\b/, /§\d/]) {
    assert.doesNotMatch(notice, banned, `the income-yield notice uses ${banned} — a reader is not obliged to know it`);
    assert.doesNotMatch(summary, banned, `the income-yield summary uses ${banned}`);
  }
  assert.match(PANEL, /infoButton\(SUPER_INCOME_YIELD_SUMMARY, SUPER_INCOME_YIELD_NOTICE, ""\)/);
  assert.equal([...PANEL.matchAll(/SUPER_INCOME_YIELD_NOTICE/g)].length, 2, 'the notice is not defined once and used once');
  const labels = literals(PANEL_RAW).filter((text) => /^Super income the fund is taxed on|^Share of that already company-taxed/.test(text));
  assert.equal(labels.length, 2, 'one of the two income-yield labels is gone');
  for (const label of labels) {
    assert.match(label, /\(0\.\d+ is \d+%/, 'a label no longer says which decimal is meant');
    assert.match(label, /blank/, 'a label no longer says that blank is an answer');
    for (const banned of [/\bfrank(ed|ing)?\b/i, /\bimputation\b/i, /\bdistribution/i]) {
      assert.doesNotMatch(label, banned, `an income-yield label uses ${banned}`);
    }
  }
});

test('P3-42 STEP 3 LANDED — the super franked share now moves the forecast too, and frankingInSuper is wired', () => {
  const before = digest(validatedPlan(planWithSettings(PLAN, SETTINGS)).months);
  const rateStated = digest(validatedPlan(planWithSettings(PLAN, {
    ...SETTINGS, superIncomeYieldRate: '0.021',
  })).months);
  assert.notEqual(rateStated, before, 'the income-yield rate moved no figure — step 2 has not landed after all');
  const frankedShareAlso = digest(validatedPlan(planWithSettings(PLAN, {
    ...SETTINGS, superIncomeYieldRate: '0.021', superIncomeYieldFrankedShare: '0.8',
  })).months);
  assert.notEqual(frankedShareAlso, rateStated, 'the super franked share moved no figure — step 3 has not landed after all');
  // A franked share stated ALONE, with no rate, moves nothing — `parsePlan`'s own refusal covers
  // the door; this is the walk agreeing with it.
  const shareAloneRefused = () => planWithSettings(PLAN, { ...SETTINGS, superIncomeYieldFrankedShare: '0.8' });
  assert.throws(() => validatedPlan(shareAloneRefused()));
  const projection = read('core', 'projection.ts');
  assert.match(projection, /frankingInSuper/);
  assert.match(projection, /superFranking/);
});

// --- §15 THE TRANSITION-TO-RETIREMENT BOXES — TTR build step 2 ------------------------------------
//
// Step 1 (1be0a81) made the door refuse a `ttr` interest with no start date, and the form had no box
// for one, so choosing `ttr` on screen for an interest with no stated day was refused at save — a
// regression this section exists to keep closed. The rate box is a PERCENTAGE (6 is 6%) and the
// file holds a FRACTION (0.06), so the round trip below asserts all three: the box, the file, the box.

/** Dana (Person 0, accumulation, no stream settings) switched to a TTR with the two boxes typed. */
const danaTtr = (changes) => withInterest(POSITION, 0, 0, { phase: 'ttr', ttrStartDate: '2028-05-14', ...changes });

/** A plan whose Person 0 interest 0 holds a TTR with EVERY optional stream-settings field stated. */
const HELD_SETTINGS = {
  commencementDay: '2027-07-01',
  statedTrisConversionDay: '2031-02-03',
  statedNotificationDay: '2031-02-10',
  statedWithdrawalCharacterisation: 'partialCommutation',
  statedTtrDrawdownRate: 0.07,
};
const PLAN_WITH_HELD = parsePlan({
  ...DEMO_PLAN,
  household: {
    ...DEMO_PLAN.household,
    persons: DEMO_PLAN.household.persons.map((person, index) => (index === 0
      ? { ...person, superInterests: [{ ...person.superInterests[0], phase: 'ttr', statedStreamSettings: HELD_SETTINGS }] }
      : person)),
  },
});

test('the TTR boxes round-trip: the value typed = the value saved = the value read back into the box', () => {
  for (const [typed, fraction] of [['6.5', 0.065], ['4', 0.04], ['10', 0.1], ['7', 0.07], ['5.25', 0.0525]]) {
    const saved = parsePlan(planWithStatedPosition(PLAN, danaTtr({ ttrDrawdownRate: typed })));
    const settings = saved.household.persons[0].superInterests[0].statedStreamSettings;
    assert.deepEqual(settings, { commencementDay: '2028-05-14', statedTtrDrawdownRate: fraction }, `typed ${typed}%`);
    const back = positionFormValues(saved).persons[0].superInterests[0];
    assert.equal(back.ttrDrawdownRate, typed, `typed ${typed}%, the box reads back ${back.ttrDrawdownRate}`);
    assert.equal(back.ttrStartDate, '2028-05-14');
  }
  // A BLANK rate writes NO key — the walk reads absence as the legal minimum — and reads back blank.
  const blank = parsePlan(planWithStatedPosition(PLAN, danaTtr({ ttrDrawdownRate: '' })));
  assert.deepEqual(blank.household.persons[0].superInterests[0].statedStreamSettings, { commencementDay: '2028-05-14' });
  assert.equal(positionFormValues(blank).persons[0].superInterests[0].ttrDrawdownRate, '');
});

test('THE REGRESSION: a TTR chosen on screen for an interest with no stated day SAVES, walks, and pays', () => {
  // Before step 2 the Dana candidate below was refused at the door (`statedStreamSettings is
  // absent`). It parses now; the walk is asked on a SECOND account, because Dana is paid a salary
  // and the walk refuses a salaried Person with no accumulation interest for the Guarantee to go to.
  assert.ok(parsePlan(planWithStatedPosition(PLAN, danaTtr({ ttrDrawdownRate: '6' }))));
  const walk = (ttrDrawdownRate) => validatedPlan(planWithStatedPosition(PLAN, positionWithSuperInterest(POSITION, 0, {
    ...BLANK_SUPER_INTEREST, phase: 'ttr', balance: '100000.00', ttrStartDate: '2028-05-14', ttrDrawdownRate,
  }))).months;
  const ttrPaid = (month) => month.lines
    .filter((line) => line.description === `${TTR_PAYMENT_LINE}, Dana`)
    .reduce((sum, line) => sum + line.amount, 0);
  const atSix = walk('6');
  const paying = atSix.filter((month) => ttrPaid(month) > 0);
  assert.equal(paying[0]?.month, '2028-05', `the TTR first paid in ${paying[0]?.month}, not the month it commenced`);
  // Every payment is inside that month's Income from super — the column the month table shows.
  assert.ok(paying.every((month) => month.incomeFromSuper >= ttrPaid(month)));
  // And the RATE BOX drives it: FY2028-29 at 6% pays about half as much again as the legal minimum
  // (4%). Not exactly 1.5: the 6% stream already paid more in its start year, so its 1 July balance
  // is smaller, and the minimum is rounded to $10. Measured 1.4948 when written.
  const fy = (months) => months.filter((month) => month.month >= '2028-07' && month.month < '2029-07')
    .reduce((sum, month) => sum + ttrPaid(month), 0);
  const atMinimum = fy(walk(''));
  assert.ok(atMinimum > 0, 'a blank rate paid nothing — it must pay the legal minimum');
  const ratio = fy(atSix) / atMinimum;
  assert.ok(ratio > 1.45 && ratio <= 1.5, `6% paid ${fy(atSix)} against the minimum's ${atMinimum}`);
});

test('saving a TTR drops NO other stream-settings field, and an emptied rate box REMOVES the rate', () => {
  const values = positionFormValues(PLAN_WITH_HELD);
  assert.equal(values.persons[0].superInterests[0].ttrDrawdownRate, '7');
  assert.equal(values.persons[0].superInterests[0].ttrStartDate, '2027-07-01');
  const edited = (changes) => parsePlan(planWithStatedPosition(PLAN_WITH_HELD, withInterest(values, 0, 0, changes)))
    .household.persons[0].superInterests[0].statedStreamSettings;
  // Unchanged boxes: the file comes back as it went in, every key.
  assert.deepEqual(edited({}), HELD_SETTINGS);
  // Both boxes moved: only those two keys move.
  assert.deepEqual(edited({ ttrStartDate: '2027-08-01', ttrDrawdownRate: '9' }),
    { ...HELD_SETTINGS, commencementDay: '2027-08-01', statedTtrDrawdownRate: 0.09 });
  // The rate box is the rate's ONE writer: emptied, the key is gone, not left at 0.07.
  const { statedTtrDrawdownRate: _gone, ...withoutRate } = HELD_SETTINGS;
  assert.deepEqual(edited({ ttrDrawdownRate: '' }), withoutRate);
  // Switched to an account-based pension, the rate goes (the door refuses it off a TTR) and
  // everything else stays — without this the switch would be unsaveable with no box to fix it.
  assert.deepEqual(edited({ phase: 'accountBasedPension' }), withoutRate);
});

test('the boxes are SHOWN for a ttr interest only, and a hidden box writes nothing', () => {
  assert.deepEqual(SUPER_PHASE_OPTIONS.filter(ttrStreamBoxesShown), ['ttr']);
  assert.equal(ttrStreamBoxesShown('accumulation'), false);
  assert.equal(ttrStreamBoxesShown('accountBasedPension'), false);
  // The panel's show/hide is that function and nothing else, and the builder asks the same one.
  assert.match(PANEL, /group\.hidden = !ttrStreamBoxesShown\(held\?\.phase \?\? ""\);/);
  // TWO from 2026-09-23: the at-retirement box is hidden on an account-based pension, by its own
  // predicate (asserted in the test below). A third is a show/hide nobody has pinned.
  // FOUR from LR-1 slice 4: a parcel's value just before 1 July 2027, set when the row is built and
  // again as the as-at date is typed, both by its own predicate (asserted in its own test).
  // FIVE from register O82: the employer-pays-into row, by `employerPaysIntoShown` (asserted in its own test).
  // SEVEN from P3-4b slice 2: the 30 June balance box, set when it is built and again as the as-at
  // date is typed, both by `totalSuperBalanceAt30JuneBoxShown` (asserted in its own test).
  assert.equal([...PANEL.matchAll(/\.hidden\s*=/g)].length, 7, 'an eighth show/hide was added to the panel');
  assert.match(EDITS, /if \(ttrStreamBoxesShown\(interest\.phase\)\)/);
  // A value sitting in a hidden box is not saved: an accumulation interest with a date typed in
  // stays an accumulation interest with no stream settings.
  const hidden = parsePlan(planWithStatedPosition(PLAN, withInterest(POSITION, 0, 0, { ttrStartDate: '2028-05-14', ttrDrawdownRate: '6' })));
  assert.equal(hidden.household.persons[0].superInterests[0].statedStreamSettings, undefined);
  // Ash's account-based pension keeps its own day, whatever sits in the hidden box.
  const ash = parsePlan(planWithStatedPosition(PLAN, withInterest(POSITION, 1, 0, { ttrStartDate: '2030-01-01' })));
  assert.deepEqual(ash.household.persons[1].superInterests[0].statedStreamSettings, { commencementDay: '2022-08-01' });
});

test('THE AT-RETIREMENT BOX: shown where there is something to switch, and a hidden box writes nothing', () => {
  assert.deepEqual(SUPER_PHASE_OPTIONS.filter(atRetirementBoxShown), ['accumulation', 'ttr']);
  assert.match(PANEL, /group\.hidden = !atRetirementBoxShown\(held\?\.phase \?\? ""\);/);
  assert.match(EDITS, /if \(!atRetirementBoxShown\(interest\.phase\)\) return \{\};/);
  const saved = (personIndex, patch) =>
    parsePlan(planWithStatedPosition(PLAN, withInterest(POSITION, personIndex, 0, patch))).household.persons[personIndex].superInterests[0];
  // Dana's accumulation account: "stays as it is" is the key, "becomes a pension" is no key at all.
  assert.equal(saved(0, { atRetirement: AT_RETIREMENT_KEEP }).keepInAccumulationAtRetirement, true);
  assert.equal('keepInAccumulationAtRetirement' in saved(0, { atRetirement: AT_RETIREMENT_SWITCH }), false);
  // Ash's account-based pension has no box: whatever it holds, nothing is written, and the door
  // would refuse the key on a pension if it were.
  assert.equal('keepInAccumulationAtRetirement' in saved(1, { atRetirement: AT_RETIREMENT_KEEP }), false);
  // A held `false` says the same as the default and is kept as held, key for key.
  const heldFalse = { ...PLAN, household: { ...PLAN.household, persons: [
    { ...PLAN.household.persons[0], superInterests: [{ ...PLAN.household.persons[0].superInterests[0], keepInAccumulationAtRetirement: false }] },
    PLAN.household.persons[1],
  ] } };
  const again = parsePlan(planWithStatedPosition(heldFalse, positionFormValues(heldFalse)));
  assert.equal(again.household.persons[0].superInterests[0].keepInAccumulationAtRetirement, false);
});

test('LR-1 — THE VALUE JUST BEFORE 1 JULY 2027: shown after that day only, kept on save, and a hidden box writes nothing', () => {
  // The predicate is the door's own boundary: a plan starting ON 1 July 2027 still walks through it.
  assert.equal(valueJustBefore1July2027BoxShown('2027-07-01'), false);
  assert.equal(valueJustBefore1July2027BoxShown('2027-07-02'), true);
  assert.match(PANEL, /stamp\.hidden = !valueJustBefore1July2027BoxShown\(asAtDate\);/);
  assert.match(PANEL, /stamp\.hidden = !valueJustBefore1July2027BoxShown\(asAtDate\.value\);/);
  const after = (patch) => ({ ...withParcel(POSITION, 0, 0, patch), asAtDate: AFTER_THE_REFORM });
  // The defect this closes: a plan that states the figure re-saves WITH it, key for key. Before
  // slice 4 the builder dropped it and the door then refused the plan it had just written.
  const stated = parsePlan(planWithStatedPosition(PLAN, after({ valueJustBefore1July2027: '43210.00' })));
  assert.equal(stated.household.persons[0].parcels[0].valueJustBefore1July2027, 4_321_000);
  const again = parsePlan(planWithStatedPosition(stated, positionFormValues(stated)));
  assert.deepEqual(again.household, stated.household);
  // Shown and left blank: nothing is written, and the door refuses it by name.
  assert.throws(() => parsePlan(planWithStatedPosition(PLAN, after({ valueJustBefore1July2027: '' }))),
    (error) => error instanceof PlanFileHouseholdError && /valueJustBefore1July2027 is missing/.test(error.message));
  // Hidden (the plan walks through 1 July 2027): a figure left in the box is not written.
  const hidden = parsePlan(planWithStatedPosition(PLAN, withParcel(POSITION, 0, 0, { valueJustBefore1July2027: '43210.00' })));
  assert.equal('valueJustBefore1July2027' in hidden.household.persons[0].parcels[0], false);
});

test('THE PRIOR-PENSION BOX: No by default, an absent key stays absent, and Yes is the stated pension', () => {
  assert.equal(POSITION.persons[0].priorRetirementPhase, PRIOR_PENSION_NO);
  assert.equal(BLANK_PERSON.priorRetirementPhase, PRIOR_PENSION_NO);
  const saved = (patch) => parsePlan(planWithStatedPosition(PLAN, withPerson(POSITION, 0, patch))).household.persons[0];
  assert.equal('statedPriorRetirementPhase' in saved({}), false);
  assert.equal(saved({ priorRetirementPhase: PRIOR_PENSION_YES }).statedPriorRetirementPhase, 'startedRetirementPhaseBeforeTheForecast');
  // A held Yes set back to No is the STATED no, not a dropped key: the user answered.
  const heldYes = parsePlan(planWithStatedPosition(PLAN, withPerson(POSITION, 0, { priorRetirementPhase: PRIOR_PENSION_YES })));
  const backToNo = parsePlan(planWithStatedPosition(heldYes, withPerson(positionFormValues(heldYes), 0, { priorRetirementPhase: PRIOR_PENSION_NO })));
  assert.equal(backToNo.household.persons[0].statedPriorRetirementPhase, 'neverARetirementPhaseRecipientBeforeTheForecast');
});

test('a missing start date and an out-of-range rate are said BESIDE the box, in plain words, before any save', () => {
  const objections = (changes) => ttrBoxObjections({ ...BLANK_SUPER_INTEREST, phase: 'ttr', ttrStartDate: '2028-05-14', ...changes });
  assert.deepEqual(objections({}), {});
  assert.deepEqual(objections({ ttrDrawdownRate: '' }), {});
  assert.deepEqual(Object.keys(objections({ ttrStartDate: '' })), ['ttrStartDate']);
  assert.deepEqual(Object.keys(objections({ ttrStartDate: ' ', ttrDrawdownRate: '11' })), ['ttrStartDate', 'ttrDrawdownRate']);
  for (const wrong of ['3.99', '10.01', '0', '-5', 'six', '6%', '0.06']) {
    assert.ok(objections({ ttrDrawdownRate: wrong }).ttrDrawdownRate, `a rate of ${wrong} was not objected to`);
  }
  // The form and the door agree on every rate: objected to exactly when the door refuses it.
  for (let tenths = 30; tenths <= 110; tenths += 1) {
    const typed = String(tenths / 10);
    const objected = objections({ ttrDrawdownRate: typed }).ttrDrawdownRate !== undefined;
    const refused = (() => {
      try { parsePlan(planWithStatedPosition(PLAN, danaTtr({ ttrDrawdownRate: typed }))); return false; } catch { return true; }
    })();
    assert.equal(objected, refused, `at ${typed}% the form ${objected ? 'objects' : 'is silent'} and the door ${refused ? 'refuses' : 'accepts'}`);
  }
  // Nothing is said about an interest that is not a TTR, however its hidden boxes are filled.
  assert.deepEqual(ttrBoxObjections({ ...BLANK_SUPER_INTEREST, ttrDrawdownRate: '99' }), {});
  // Plain English: no engine word, no path, no fraction.
  const sentences = [objections({ ttrStartDate: '', ttrDrawdownRate: '11' }).ttrStartDate,
    objections({ ttrDrawdownRate: '11' }).ttrDrawdownRate, TTR_NOT_SAVED, TTR_RATE_BESIDE];
  for (const sentence of sentences) {
    for (const banned of [/stated/i, /commencement/i, /statedStreamSettings/, /\bttr\b/, /fraction/i, /Schedule/, /SISR/, /\bSch\b/]) {
      assert.doesNotMatch(sentence, banned, `"${sentence}" uses ${banned}`);
    }
  }
  assert.match(objections({ ttrDrawdownRate: '11' }).ttrDrawdownRate, /between 4% and 10%/);
  assert.deepEqual([...TTR_RATE_RANGE_PERCENT], ['4', '10']);
  assert.match(TTR_RATE_BESIDE, /legal minimum/);
  assert.match(TTR_RATE_BESIDE, /empty/);
  // The save button asks before it saves, and puts the sentence on the box's own line.
  assert.match(PANEL, /const objections = ttrBoxObjections\(interest\);/);
  assert.match(PANEL, /if \(ttrObjected\) \{\s*announce\.textContent = TTR_NOT_SAVED;\s*return;\s*\}\s*void saveAndAnnounce/);
  assert.match(PANEL_RAW, /line\.dataset\['errorFor'\] = name;/);
});

// --- A salaried Person's only account switched to TTR, said at save beside the phase box ------------
//
// The door accepts it and the walk refuses it: the employer's Superannuation Guarantee has no
// accumulation account to go into. Before 2026-09-23 the only sentence the user saw was the walk's,
// which names `superInterests`. The form now says it first, in plain words, and saves nothing.

test('a salaried Person whose only account is set to TTR is objected to beside the phase box, and the walk agrees', () => {
  // Dana is paid a salary and holds one account. Switched to TTR, it is objected to …
  const only = danaTtr({});
  assert.equal(employerAccountObjection(only.persons[0], 0), EMPLOYER_ACCOUNT_NEEDED);
  // … and the objection is TRUE: the plan the save would write passes the door and the walk refuses it.
  const refused = parsePlan(planWithStatedPosition(PLAN, only));
  assert.throws(() => project(refused.settings, refused.household, refused.entries), /holds no accumulation superannuation interest/);

  // The control: with a second account left in accumulation, nothing is said and the plan walks.
  const second = withPerson(only, 0, { superInterests: [...only.persons[0].superInterests, { ...BLANK_SUPER_INTEREST, balance: '0' }] });
  assert.equal(employerAccountObjection(second.persons[0], 0), undefined);
  const walks = parsePlan(planWithStatedPosition(PLAN, second));
  assert.ok(project(walks.settings, walks.household, walks.entries).length > 0);

  // No salary, no Guarantee, nothing to say. An account that is not a TTR is never objected to.
  assert.equal(employerAccountObjection(withPerson(only, 0, { employmentIncomePerFortnight: '0' }).persons[0], 0), undefined);
  assert.equal(employerAccountObjection(POSITION.persons[0], 0), undefined);
});

test('a salaried Person whose only account is set to an account-based pension is objected to too, and the walk agrees', () => {
  const only = withInterest(POSITION, 0, 0, { phase: 'accountBasedPension' });
  assert.equal(employerAccountObjection(only.persons[0], 0), EMPLOYER_ACCOUNT_NEEDED_PENSION);
  const refused = parsePlan(planWithStatedPosition(PLAN, only));
  assert.throws(() => project(refused.settings, refused.household, refused.entries), /holds no accumulation superannuation interest/);
  // Control: a second account left in accumulation — nothing said, and the plan walks.
  const second = withPerson(only, 0, { superInterests: [...only.persons[0].superInterests, { ...BLANK_SUPER_INTEREST, balance: '0' }] });
  assert.equal(employerAccountObjection(second.persons[0], 0), undefined);
  const walks = parsePlan(planWithStatedPosition(PLAN, second));
  assert.ok(project(walks.settings, walks.household, walks.entries).length > 0);
  // No salary: nothing to say.
  assert.equal(employerAccountObjection(withPerson(only, 0, { employmentIncomePerFortnight: '0' }).persons[0], 0), undefined);
});

test('the phase sentence is plain English, and the save button says it before it saves', () => {
  for (const sentence of [EMPLOYER_ACCOUNT_NEEDED, EMPLOYER_ACCOUNT_NEEDED_PENSION, PHASE_NOT_SAVED]) {
    for (const banned of [/superInterests/, /Guarantee/, /stated/i, /\binterest\b/, /\bttr\b/, /nowhere/]) {
      assert.doesNotMatch(sentence, banned, `"${sentence}" uses ${banned}`);
    }
  }
  assert.match(EMPLOYER_ACCOUNT_NEEDED, /accumulation account/);
  assert.match(EMPLOYER_ACCOUNT_NEEDED_PENSION, /accumulation account/);
  assert.match(EMPLOYER_ACCOUNT_NEEDED_PENSION, /account-based pension/);
  // Written on the phase box's own line, and the save stops there.
  assert.match(PANEL_RAW, /phaseObjection\.dataset\['errorFor'\] = `phase-\$\{index\}`;/);
  assert.match(PANEL, /const phaseObjection = employerAccountObjection\(person, index\);/);
  assert.match(PANEL, /if \(phaseObjected\) \{\s*announce\.textContent = PHASE_NOT_SAVED;\s*return;\s*\}/);
});

// 2026-09-24: a real plan was found holding TAKE-HOME pay in this box, and the engine taxed it again
// and set super guarantee off it. The box's own label must say "before tax"; a note elsewhere on the
// panel was not enough.
test('the pay box’s own label says before tax, not take-home', () => {
  const line = PANEL_RAW.split('\n').find((l) => l.includes('Pay per fortnight') && l.includes('label('));
  assert.ok(line, 'no labelled input for employmentIncomePerFortnight');
  assert.match(line, /before tax/);
  assert.match(line, /not take-home/);
});

// --- §15 P17-3: every ⓘ box links to the guide, and none restates a figure -------------------------
//
// The rule (TODO.md P17-3, 2026-09-28): a box says what the box does in a line or two and NEVER
// restates a figure, a threshold or a rule; those live only in `userguide.md`. A dollar amount, a
// percentage or a two-digit number (an age, a year, a count) in a box is the shape a restated rule
// takes. An input-format example — "0.025 is 2.5%" — says how to type the box, not a rule, and is
// allowed, and so is the name of a law ("Division 293").

/** A box's words with its input-format examples and the names of laws taken out. */
const withoutFormatExamples = (text) =>
  text.replaceAll(/\b0\.\d+ (?:is|for) \d+(?:\.\d+)?%(?: a year)?/g, '').replaceAll(/Division 293/g, '');
const RESTATED_FIGURE = /\$\s?\d|\d(?:\.\d+)?\s?%|\b\d{2,}\b/;

test('P17-3 — every ⓘ box on the panel names a guide page, and no box restates a figure', () => {
  const calls = [...PANEL_RAW.matchAll(/infoButton\(([A-Z_]+), ([A-Z_]+)(?:, '(guide:[a-z0-9-]+)')?\)/g)];
  // 27 since the insurance group's own box (2026-09-29); 28 with the value just before 1 July 2027.
  // 29 with the employer-pays-into select (register O82). 35 with the rules-in-force fold (2026-09-30):
  // one for the fold and one per area, each pointing at the area's sources in Chapter 85. 36 with the
  // unused concessional cap group (P3-4b slice 2), pointing at the catch-up section. 37 with the Work
  // Bonus last top-up box (P4-10a), pointing at the Work Bonus section. 38 with the cars, contents and
  // other things box (coverage gap 1), pointing at its section in Chapter 49.
  assert.equal(calls.length, 38, 'the panel no longer has the 38 ⓘ boxes this pass covered');
  assert.equal([...PANEL_RAW.matchAll(/infoButton\(/g)].length, calls.length, 'an ⓘ box is built some other way');
  for (const [, summary, notice, guide] of calls) {
    assert.ok(guide !== undefined, `${summary} links to no page of the guide`);
    for (const name of [summary, notice]) {
      const text = withoutFormatExamples(prose(name));
      assert.doesNotMatch(text, RESTATED_FIGURE, `${name} restates a figure: ${text}`);
    }
  }
  // Positive control: the pattern does catch the figures the pass took out.
  for (const restated of ['up to a ceiling of $11,800', 'the extra 15% charged', 'at Age Pension age, 67', '41.76% of it']) {
    assert.match(withoutFormatExamples(restated), RESTATED_FIGURE, `the pattern misses "${restated}"`);
  }
  assert.doesNotMatch(withoutFormatExamples('type 0.065 for 6.5% a year'), RESTATED_FIGURE);
});

// --- Register O82 (2026-09-29): the per-Person "Employer pays into" select ------------------------
//
// One condition, `employerPaysIntoShown`, decides both showing and writing, like the 1 Jul 2027 box.

const twoAccounts = (patch = {}) => withPerson(POSITION, 0, { superInterests: BLANK_TWO, ...patch });
const destinations = (values) =>
  parsePlan(planWithStatedPosition(PLAN, values)).household.persons[0].superInterests
    .map((interest) => interest.statedEmployerContributionDestination);

test('the employer-pays-into select is shown for two or more accumulation accounts, salary or not, and only then', () => {
  const salaried = POSITION.persons[0];
  assert.equal(employerPaysIntoShown(salaried.employmentIncomePerFortnight, BLANK_TWO), true);
  assert.equal(employerPaysIntoShown(salaried.employmentIncomePerFortnight, BLANK_TWO.slice(0, 1)), false, 'one account');
  assert.equal(employerPaysIntoShown('0', BLANK_TWO), true, 'no salary today: still shown, a return to work needs it');
  assert.equal(employerPaysIntoShown('', BLANK_TWO), true, 'a blank salary: still shown');
  assert.equal(employerPaysIntoShown(salaried.employmentIncomePerFortnight, [BLANK_TWO[0], { ...BLANK_TWO[1], phase: 'accountBasedPension' }]), false,
    'a pension account is not an accumulation account');
  assert.match(PANEL, /row\.hidden = !employerPaysIntoShown\(salary\.value, person\.superInterests\);/);
  assert.match(PANEL_RAW, /salary\.addEventListener\('input', sync\);/);
  assert.equal(employerPaysIntoOptionLabel(1), 'Super account 2 (accumulation)');
});

test('the employer-pays-into choice round-trips: select, save, reload keeps it, and it names the chosen account only', () => {
  for (const chosen of [0, 1]) {
    const saved = destinations(twoAccounts({ employerPaysInto: String(chosen) }));
    assert.deepEqual(saved, [0, 1].map((at) => (at === chosen ? 'superannuationGuarantee' : undefined)));
    const reloaded = positionFormValues(parsePlan(planWithStatedPosition(PLAN, twoAccounts({ employerPaysInto: String(chosen) }))));
    assert.equal(reloaded.persons[0].employerPaysInto, String(chosen));
  }
  // The saved plan walks: the destination is derived from the named account.
  const walks = parsePlan(planWithStatedPosition(PLAN, twoAccounts({ employerPaysInto: '1' })));
  assert.ok(project(walks.settings, walks.household, walks.entries).length > 0);
});

test('a hidden employer-pays-into select writes nothing', () => {
  // One account: the door's default, nothing written even if the value is stale.
  assert.deepEqual(destinations(withPerson(POSITION, 0, { employerPaysInto: '0' })), [undefined]);
  // No salary today: still SHOWN (a return to work later needs it), so the choice is written.
  assert.deepEqual(destinations(twoAccounts({ employerPaysInto: '1', employmentIncomePerFortnight: '0' })), [undefined, 'superannuationGuarantee']);
  // A pension account leaves one accumulation account: hidden, nothing written to the pension.
  const oneLeft = { superInterests: [BLANK_TWO[0], { ...BLANK_TWO[1], phase: 'accountBasedPension' }], employerPaysInto: '1' };
  assert.deepEqual(destinations(twoAccounts(oneLeft)), [undefined, undefined]);
});

test('the employer-pays-into blank writes nothing, so a salaried two-account plan that names nothing is still refused (O82)', () => {
  const unchosen = parsePlan(planWithStatedPosition(PLAN, twoAccounts({ employerPaysInto: '' })));
  assert.throws(() => project(unchosen.settings, unchosen.household, unchosen.entries), /UNDETERMINED \(register O82\)/);
});

// --- P3-4b slice 2: the unused concessional cap and the 30 June balance ------------------------------

test('P3-4b — the form offers exactly the five years before the plan, and the door refuses any other year typed', () => {
  assert.deepEqual(unusedCapYears('2026-09-01'), ['2021-22', '2022-23', '2023-24', '2024-25', '2025-26']);
  assert.deepEqual(unusedCapYears('2027-07-01'), ['2022-23', '2023-24', '2024-25', '2025-26', '2026-27']);
  assert.deepEqual(unusedCapYears(''), [], 'a half-typed date offers nothing rather than throwing');
  assert.deepEqual(Object.keys(POSITION.persons[0].unusedConcessionalCap), unusedCapYears(PLAN.settings.asAtDate));
  // Blank everywhere writes no key, so a plan stating none re-writes to one stating none.
  assert.equal('statedUnusedConcessionalCap' in parsePlan(planWithStatedPosition(PLAN, POSITION)).household.persons[0], false);
  // A year outside the window reaching the builder is written as typed and refused BY THE DOOR.
  for (const year of ['2020-21', '2026-27']) {
    assert.throws(
      () => parsePlan(planWithStatedPosition(PLAN, withPerson(POSITION, 0, { unusedConcessionalCap: { [year]: '1000.00' } }))),
      (error) => error instanceof PlanFileHouseholdError && error.message.includes(`statedUnusedConcessionalCap["${year}"]`) && /outside the carry-forward window/.test(error.message),
      year,
    );
  }
});

test('P3-4b — the 30 June box is shown, and writes, only on a plan not dated 1 July', () => {
  assert.equal(totalSuperBalanceAt30JuneBoxShown('2026-09-01'), true);
  assert.equal(totalSuperBalanceAt30JuneBoxShown('2027-07-01'), false);
  assert.equal(totalSuperBalanceAt30JuneBoxShown('2027-06-30'), true);
  assert.equal(totalSuperBalanceAt30JuneBoxShown(''), false);
  assert.equal(thirtyJuneYear('2026-09-01'), 2026);
  assert.equal(thirtyJuneYear('2027-06-30'), 2026);
  const typed = withPerson(POSITION, 0, { totalSuperBalanceAt30June: '480000.00' });
  assert.equal(parsePlan(planWithStatedPosition(PLAN, typed)).household.persons[0].statedTotalSuperBalanceAt30June, 48_000_000);
  // Moved to 1 July, the box is hidden and writes nothing — the door would refuse it there.
  const july = parsePlan(planWithStatedPosition(PLAN, { ...typed, asAtDate: '2026-07-01' }));
  assert.equal('statedTotalSuperBalanceAt30June' in july.household.persons[0], false);
  // Blank is not stated: no key, never a nil balance.
  assert.equal('statedTotalSuperBalanceAt30June' in parsePlan(planWithStatedPosition(PLAN, POSITION)).household.persons[0], false);
  assert.match(PANEL, /balance\.hidden = !totalSuperBalanceAt30JuneBoxShown\(asAtDate\);/);
  assert.match(PANEL, /box\.hidden = !totalSuperBalanceAt30JuneBoxShown\(asAtDate\.value\);/);
});
