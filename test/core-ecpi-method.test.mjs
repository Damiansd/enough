// P3-25 / R10 step 4, scoped by R11 — the SMSF/APRA discriminant, and the two ECPI refusals it
// exists to keep off an APRA household.
//
// **There is no arithmetic in this file, and that is deliberate.** `ecpiMethod` computes no exempt
// proportion and no tax: the averaging every real percentage rests on is actuarial convention and
// not law (register §3.11.1, U37), so a number produced here would be a number the register says
// cannot be produced. What is asserted is *which mechanism* and *which refusal*, against register
// §3.11.3's three cases:
//
//   * every interest in the retirement phase at ALL times → deemed segregation, whole year, the
//     s 295-385(9) election unavailable ((10)(a)) — answered;
//   * every interest in the retirement phase at SOME time but not all → the election is live —
//     refused unless a Setting states the branch;
//   * never 100% retirement phase → no segregation, no election, proportionate for the whole year —
//     answered. This is §3.11.7's Example A: Alex converts 14 December 2026, Sam is in accumulation
//     all year, so there is no time at which every interest is in the retirement phase.
//
// **The fixture facts come from §3.11.7 and nothing here was read off the implementation.** The
// figures those fixtures carry ($4,296.58 against $3,069.86, $1,226.71 apart) are *why* the method
// is refused rather than chosen; they are asserted as text in the refusal messages, not recomputed.
//
// The dates: FY2026-27 runs 1 July 2026 to 30 June 2027, 365 days. A conversion on 14 December 2026
// leaves 199 days inclusive to 30 June 2027, which is a part year.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  accumulationInterest,
  heldInFund,
  phaseHeldForTheWholeYear,
  phaseHeldFrom,
  retirementPhaseInterest,
  transitionToRetirementInterest,
  MidYearPhaseChangeError,
} from '../dist/core/superPhase.js';
import { conditionOfRelease } from '../dist/core/conditionOfRelease.js';
import {
  ecpiMethod,
  EcpiMethodNotStatedError,
  FundTypeNotStatedError,
  SegregatedEcpiNotModelledError,
} from '../dist/core/ecpiMethod.js';

const SRC = resolve(dirname(fileURLToPath(import.meta.url)), '..', 'src');
const FY = '2026-27';
const CONVERSION_DAY = '2026-12-14';

/** 67 on 1 July 2026: past the automatic release age, so the condition is met without any act. */
const AGED_67 = '1959-07-01';
/** 61 on 1 July 2026 and still working: inside the TTR window, and no Condition of Release met. */
const AGED_61 = '1965-07-01';

const retired = (on) => conditionOfRelease({ dateOfBirth: AGED_67, on, gainfulEmployment: { ceased: false } });
const preserved = (on) => conditionOfRelease({ dateOfBirth: AGED_61, on, gainfulEmployment: { ceased: false } });

const wholeYearRetirement = (fund) => ({
  interest: fund === undefined
    ? retirementPhaseInterest(retired('2026-07-01'))
    : heldInFund(retirementPhaseInterest(retired('2026-07-01')), fund),
  heldFor: phaseHeldForTheWholeYear(FY),
});

const convertedInDecember = (fund) => ({
  interest: fund === undefined
    ? retirementPhaseInterest(retired(CONVERSION_DAY))
    : heldInFund(retirementPhaseInterest(retired(CONVERSION_DAY)), fund),
  heldFor: phaseHeldFrom(FY, CONVERSION_DAY),
});

const accumulationAllYear = (fund) => ({
  interest: fund === undefined
    ? accumulationInterest(retired('2026-07-01'))
    : heldInFund(accumulationInterest(retired('2026-07-01')), fund),
  heldFor: phaseHeldForTheWholeYear(FY),
});

// --- A: the discriminant is absent by default, per interest, and on the interest ------------------

test('R11 — a freshly constructed interest has NO fund type at all, not a defaulted one', () => {
  // Not `fund === 'smsf'` and not `fund === 'apra'`: the property is not there. A default here is
  // the O69 defect — it would silently decide which of this module's refusals apply.
  for (const interest of [
    accumulationInterest(retired('2026-07-01')),
    transitionToRetirementInterest(preserved('2026-07-01')),
    retirementPhaseInterest(retired('2026-07-01')),
  ]) {
    assert.equal(interest.fund, undefined);
    assert.equal(Object.hasOwn(interest, 'fund'), false);
    assert.equal(Object.keys(interest).includes('fund'), false);
  }
});

test('R11 — the fund type is stated per interest, and stating it does not change anything else', () => {
  const bare = retirementPhaseInterest(retired(CONVERSION_DAY));
  const smsf = heldInFund(bare, 'smsf');
  const apra = heldInFund(bare, 'apra');

  assert.equal(smsf.fund, 'smsf');
  assert.equal(apra.fund, 'apra');
  // The original is untouched: `heldInFund` returns a new frozen interest.
  assert.equal(bare.fund, undefined);
  assert.equal(Object.isFrozen(smsf), true);
  for (const key of ['on', 'phase', 'incomeStream', 'reason']) assert.deepEqual(smsf[key], bare[key]);
});

test('R11 — a Person may hold one interest of each kind, because the discriminant is on the INTEREST', () => {
  // The whole reason the discriminant is not on the Person. One `ConditionOfRelease`, one Person,
  // two interests, two funds, two determinations — and they come out differently.
  const release = retired('2026-07-01');
  const inSmsf = { interest: heldInFund(retirementPhaseInterest(release), 'smsf'), heldFor: phaseHeldForTheWholeYear(FY) };
  const inApra = { interest: heldInFund(retirementPhaseInterest(release), 'apra'), heldFor: phaseHeldForTheWholeYear(FY) };

  assert.equal(ecpiMethod({ fy: FY, interests: [inSmsf] }).fundType, 'smsf');
  assert.equal(ecpiMethod({ fy: FY, interests: [inApra] }).fundType, 'apra');
  assert.match(ecpiMethod({ fy: FY, interests: [inSmsf] }).method, /deemed segregation/);
  assert.match(ecpiMethod({ fy: FY, interests: [inApra] }).method, /balance arrives net/);

  // And they are not one fund: the interests of a single fund must agree about what kind it is.
  assert.throws(() => ecpiMethod({ fy: FY, interests: [inSmsf, inApra] }), {
    name: 'RangeError',
    message: /cannot be held in 2 different kinds of fund/,
  });
});

test('R11 — needed and missing raises FundTypeNotStatedError, and the message forbids both defaults', () => {
  assert.throws(() => ecpiMethod({ fy: FY, interests: [convertedInDecember(undefined)] }), FundTypeNotStatedError);
  try {
    ecpiMethod({ fy: FY, interests: [convertedInDecember(undefined), accumulationAllYear('smsf')] });
    assert.fail('expected FundTypeNotStatedError');
  } catch (error) {
    assert.equal(error.name, 'FundTypeNotStatedError');
    assert.match(error.message, /1 of whose interests/); // counted, so a partial statement is not enough
    assert.match(error.message, /R11/);
    assert.match(error.message, /O69/);
    assert.match(error.message, /defaulting to `smsf`/);
    assert.match(error.message, /defaulting to `apra`/);
    assert.match(error.message, /per INTEREST and not per Person/);
    assert.match(error.message, /heldInFund/);
  }
});

// --- B: the scoping. Neither ECPI refusal reaches an APRA interest --------------------------------

test('O69 — SegregatedEcpiNotModelledError does NOT fire on an APRA interest', () => {
  // The defect O69 names, stated as a test: the caller says "segregated", on facts that refuse for
  // an SMSF, and the APRA answer comes back instead. ECPI is invisible to an APRA-fund member —
  // the trustee computes it and the balance arrives net — so there is no method for the member to
  // be on and nothing to refuse.
  const apra = ecpiMethod({
    fy: FY,
    interests: [convertedInDecember('apra'), accumulationAllYear('apra')],
    statedMethod: 'segregated',
  });
  assert.equal(apra.fundType, 'apra');
  assert.equal(apra.method, 'none — the trustee of an APRA-regulated fund computes ECPI and the member’s balance arrives net');
  assert.equal(apra.electionWasAvailable, false);

  // Identical facts, one word changed: the SMSF does refuse. Same call, same shape, same year.
  assert.throws(
    () => ecpiMethod({
      fy: FY,
      interests: [convertedInDecember('smsf'), accumulationAllYear('smsf')],
      statedMethod: 'segregated',
    }),
    SegregatedEcpiNotModelledError,
  );
});

test('O69 — EcpiMethodNotStatedError does NOT fire on an APRA interest', () => {
  // Fixture F4's facts: a single interest that converted on 14 December, so the fund was 100%
  // retirement phase for part of the year and s 295-385(9) is live — for an SMSF.
  const apra = ecpiMethod({ fy: FY, interests: [convertedInDecember('apra')] });
  assert.equal(apra.fundType, 'apra');
  assert.equal(apra.electionWasAvailable, false);
  assert.match(apra.reason, /no s 295-385\(9\) election for the member to make/);

  assert.throws(() => ecpiMethod({ fy: FY, interests: [convertedInDecember('smsf')] }), EcpiMethodNotStatedError);
});

test('the APRA determination says why it is not a refusal, at its own confidence', () => {
  const apra = ecpiMethod({ fy: FY, interests: [convertedInDecember('apra')] });
  // R6: the member-side invisibility is asserted at §3.11.6 with no source row, so it is carried
  // at the weakest label rather than promoted to primary-verified by being consumed.
  assert.equal(apra.provenance.confidence, 'unverified');
  assert.equal(apra.provenance.fy, FY);
  assert.ok(apra.provenance.caveats.some((line) => line.includes('§3.11.6 / O69')));
  assert.ok(apra.provenance.caveats.some((line) => line.includes('balance arrives net')));
});

// --- C: the SMSF branch — three cases, two refusals -----------------------------------------------

test('§3.11.3 — 100% retirement phase at ALL times is deemed segregation, and is answered', () => {
  const determination = ecpiMethod({ fy: FY, interests: [wholeYearRetirement('smsf'), wholeYearRetirement('smsf')] });
  assert.equal(determination.fundType, 'smsf');
  assert.equal(determination.method, 'deemed segregation for the whole year — ITAA 1997 s 295-385(4), ITAR reg 295-385.01(a)');
  // s 295-385(10)(a) removes the election once the fund is 100% RP at all times — so there is
  // nothing for a Setting to state, and nothing to refuse.
  assert.equal(determination.electionWasAvailable, false);
  // T127: a reading corroborated three times inside the statute, never bare primary-verified (R6).
  assert.equal(determination.provenance.confidence, 'secondary-only');
  assert.ok(determination.provenance.caveats.some((line) => line.includes('§3.11.3 / T127')));
  // And the two provisions this module does not apply are said out loud, on every SMSF result.
  assert.ok(determination.provenance.caveats.some((line) => line.includes('s 295-387')));
  // T129 (P13-5 chunk 7 survivor): the DSFA test is on TSB at the PREVIOUS 30 June, not at the conversion.
  assert.ok(determination.provenance.caveats.some((line) => line.includes('s 295-387') && line.includes('PREVIOUS 30 June')));
});

test('§3.11.7 Example A — never 100% retirement phase is the proportionate method, and is answered', () => {
  // Alex converts 14 December, Sam is in accumulation all year: there is no time at which EVERY
  // interest is in the retirement phase, so s 295-385(9) is unavailable and nothing is segregated.
  const determination = ecpiMethod({ fy: FY, interests: [convertedInDecember('smsf'), accumulationAllYear('smsf')] });
  assert.equal(determination.method, 'the proportionate method for the whole year — ITAA 1997 s 295-390, certificate required');
  assert.equal(determination.electionWasAvailable, false);
  assert.match(determination.reason, /Example A/);
  // U35 — the certificate requirement's one escape is a dead letter, verified against the full
  // compilation. U37 — the averaging is convention, so no percentage is computed here.
  assert.equal(determination.provenance.confidence, 'secondary-only');
  assert.ok(determination.provenance.caveats.some((line) => line.includes('§3.11.1 / U35')));
  assert.ok(determination.provenance.caveats.some((line) => line.includes('U37')));
  assert.ok(determination.provenance.caveats.some((line) => line.includes('never computes the percentage')));
});

test('§3.11.7 F4 — 100% retirement phase for PART of the year is the live election, and is refused', () => {
  try {
    ecpiMethod({ fy: FY, interests: [convertedInDecember('smsf')] });
    assert.fail('expected EcpiMethodNotStatedError');
  } catch (error) {
    assert.equal(error.name, 'EcpiMethodNotStatedError');
    // The ground is that the branches differ, not that the law is unknown: F4's two answers.
    assert.match(error.message, /\$1,226\.71 apart/);
    assert.match(error.message, /November to March reverses which is better/);
    assert.match(error.message, /s 295-385\(10\)\(a\) removes it/);
    assert.match(error.message, /no form, no approved form, no deadline, no notification/);
    assert.match(error.message, /scoped to an SMSF by ruling R11/);
    // And it refuses the METHOD, not the year: the tax is still available at §3.11.6's bound.
    assert.match(error.message, /accept `fundEarningsTax`’s bound/);
  }
});

test('the election is answerable once the Setting states which branch was taken', () => {
  // s 295-385(8): the election's effect is that NONE of the assets are segregated for the WHOLE
  // year, so the fund is on s 295-390 for all of it. That is derivable and is not refused.
  const determination = ecpiMethod({ fy: FY, interests: [convertedInDecember('smsf')], statedMethod: 'proportionate' });
  assert.equal(determination.method, 'the proportionate method for the whole year — ITAA 1997 s 295-390, certificate required');
  assert.equal(determination.electionWasAvailable, true);
  assert.match(determination.reason, /the Setting states\s+that it was made/);
});

test('a stated segregated method is refused for an SMSF wherever tracing would be needed', () => {
  for (const interests of [
    [convertedInDecember('smsf')],
    [convertedInDecember('smsf'), accumulationAllYear('smsf')],
    [accumulationAllYear('smsf')],
  ]) {
    try {
      ecpiMethod({ fy: FY, interests, statedMethod: 'segregated' });
      assert.fail('expected SegregatedEcpiNotModelledError');
    } catch (error) {
      assert.equal(error.name, 'SegregatedEcpiNotModelledError');
      assert.match(error.message, /\$4,296\.58/);
      assert.match(error.message, /\$3,069\.86/);
      assert.match(error.message, /runs BOTH ways/);
      // The certificate is on the OTHER method — the correction §3.11.1 records.
      assert.match(error.message, /certificate-free segregated route for account-based pensions/);
      assert.match(error.message, /does not\s+fire for an APRA-fund interest/);
    }
  }
  // But NOT where deemed segregation answers it: everything is exempt, nothing is traced.
  assert.doesNotThrow(() =>
    ecpiMethod({ fy: FY, interests: [wholeYearRetirement('smsf')], statedMethod: 'segregated' }),
  );
});

test('an accumulation interest held for only PART of the year counts as possibly retirement phase', () => {
  // Read inclusively on purpose: the model states a phase on a day with a coverage, so an interest
  // stated as accumulation for part of the year was something else for the rest and this module
  // cannot see what. Erring toward the refusal is the safe direction where F4's branches are
  // $1,226.71 apart.
  const commutedBack = {
    interest: heldInFund(accumulationInterest(retired(CONVERSION_DAY)), 'smsf'),
    heldFor: phaseHeldFrom(FY, CONVERSION_DAY),
  };
  assert.throws(() => ecpiMethod({ fy: FY, interests: [commutedBack] }), EcpiMethodNotStatedError);
  // And a whole-year accumulation interest does not: it was never in the retirement phase.
  assert.equal(ecpiMethod({ fy: FY, interests: [accumulationAllYear('smsf')] }).electionWasAvailable, false);
});

// --- D: the year, the shape, and the provenance ----------------------------------------------------

test('a fraction counted against another year is refused, not rescaled', () => {
  assert.throws(
    () => ecpiMethod({
      fy: FY,
      interests: [{ interest: heldInFund(retirementPhaseInterest(retired('2026-07-01')), 'smsf'), heldFor: phaseHeldForTheWholeYear('2027-28') }],
    }),
    MidYearPhaseChangeError,
  );
});

test('a fund with no interests has no mechanism, and says so rather than answering', () => {
  assert.throws(() => ecpiMethod({ fy: FY, interests: [] }), {
    name: 'RangeError',
    message: /a fund with no interests/,
  });
});

test('the determination is frozen and carries every interest’s own provenance', () => {
  const determination = ecpiMethod({ fy: FY, interests: [wholeYearRetirement('smsf')] });
  assert.equal(Object.isFrozen(determination), true);
  assert.throws(() => {
    determination.method = 'x';
  }, TypeError);
  // Retirement Phase interests carry the uncapped-entry caveat, and it must survive the merge.
  assert.ok(determination.provenance.caveats.some((line) => line.includes('checked against any cap')));
});

// --- E: the structural defences, asserted against the source --------------------------------------

const executableCode = (text) =>
  text
    .replaceAll(/\/\*[\s\S]*?\*\//g, '')
    .replaceAll(/`(?:[^`\\]|\\.)*`|'(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*"|\/\/.*$/gm, (match) =>
      match.startsWith('//') ? '' : '""',
    );

const ECPI_RAW = readFileSync(join(SRC, 'core', 'ecpiMethod.ts'), 'utf8');
const ECPI_CODE = executableCode(ECPI_RAW);
const PHASE_RAW = readFileSync(join(SRC, 'core', 'superPhase.ts'), 'utf8');
const PHASE_CODE = executableCode(PHASE_RAW);

test('the source greps are not vacuous — stripping leaves the executable code behind', () => {
  assert.match(ECPI_CODE, /\bexport const ecpiMethod\b/);
  assert.match(PHASE_CODE, /\bexport const heldInFund\b/);
  assert.ok(ECPI_CODE.length > 500);
});

test('MUTATION — the discriminant cannot be defaulted, because no constructor writes it', () => {
  // Defaulting to either value is a mutation this file names. The structural half is that the only
  // executable occurrence of the two literals in `superPhase.ts` is the type alias itself — no
  // constructor and no object literal mentions them, so a default has to be typed in by hand.
  assert.match(PHASE_RAW, /export type FundType = 'smsf' \| 'apra';/);
  const withoutTheAlias = PHASE_RAW.replace(/export type FundType = 'smsf' \| 'apra';/, '');
  assert.doesNotMatch(executableCode(withoutTheAlias), /'smsf'|'apra'/);
  // The field is declared optional. Making it required is a compile error at every constructor.
  assert.match(PHASE_RAW, /readonly fund\?: FundType \| undefined;/);
  // And `fundEarningsTax` neither reads it nor could: §3.11.6's bound needs no fund type.
  assert.doesNotMatch(PHASE_CODE, /\.fund\b/);
  // `FundType` reaches exactly three places in the executable code — the alias, the optional field
  // and `heldInFund`'s parameter — so a fourth is a visible addition rather than a quiet default.
  assert.deepEqual(
    PHASE_CODE.split('\n').filter((line) => /\bFundType\b/.test(line)).map((line) => line.trim()),
    ["export type FundType = 'smsf' | 'apra';".replace(/'[^']*'/g, '""'), 'readonly fund?: FundType | undefined;', 'fund: FundType,'],
  );
});

test('MUTATION — the discriminant is on the interest, not on the Person', () => {
  // `fund` is declared on `SuperInterestFigure`, which is what both interest types extend, and
  // nothing Person-shaped is in reach: `household.js` is not imported by either module and the
  // condition of release carries no fund.
  const figure = /interface SuperInterestFigure \{([\s\S]*?)\n\}/.exec(PHASE_RAW)?.[1] ?? '';
  assert.ok(figure.length > 0, 'SuperInterestFigure has gone or changed shape');
  assert.match(figure, /readonly fund\?: FundType \| undefined;/);
  // Nothing Person-shaped is in reach of either module's executable code: `household.js` — where
  // the Person and the age arithmetic live — is imported by neither, and no `Person` identifier
  // appears in either. Moving the discriminant onto the Person means first giving it a route in.
  for (const source of [PHASE_CODE, ECPI_CODE]) {
    assert.doesNotMatch(source, /household\.js/);
    assert.doesNotMatch(source, /\bPerson\b/);
    assert.doesNotMatch(source, /\bHousehold\b/);
  }
  // Every read of the discriminant in `ecpiMethod` goes through an interest.
  const reads = [...ECPI_CODE.matchAll(/[\w.?[\]]*\.fund\b/g)].map(([match]) => match.replace(/^.*?(?=interest\.fund$)/, ''));
  assert.deepEqual([...new Set(reads)].sort(), ['interest.fund']);
  assert.ok(reads.length >= 2, 'the discriminant is read, and it is read off an interest every time');
});

test('MUTATION — the APRA scoping is a total lookup, and the APRA branch names no refusal', () => {
  // Not `if (fundType === 'smsf')`: two cells, two functions, nothing to invert. Swapping them is
  // the mutation, and it is one line and it fails here.
  assert.match(
    ECPI_CODE,
    /const BY_FUND_TYPE: Readonly<Record<FundType, \(fund: FundYear\) => EcpiMethodDetermination>> = \{\s*apra: apraFundEcpi,\s*smsf: smsfEcpiMethod,\s*\};/,
  );
  assert.match(ECPI_CODE, /BY_FUND_TYPE\[fundType\]\(\{ fy, interests, statedMethod \}\)/);
  assert.doesNotMatch(ECPI_CODE, /fundType === ""/);

  // The APRA branch's body does not name either refusal class, so making one fire there means
  // writing a class name into a function that has never contained it.
  const apraBranch = /const apraFundEcpi = [\s\S]*?\n  \}\);\n/.exec(ECPI_RAW)?.[0] ?? '';
  assert.ok(apraBranch.length > 0, 'apraFundEcpi has gone or changed shape');
  assert.doesNotMatch(apraBranch, /SegregatedEcpiNotModelledError/);
  assert.doesNotMatch(apraBranch, /EcpiMethodNotStatedError/);
  assert.doesNotMatch(apraBranch, /\bthrow\b/);

  // Both refusals are raised in exactly one place each, and both places are the SMSF branch.
  const smsfBranch = /const smsfEcpiMethod = [\s\S]*?\n\};\n/.exec(ECPI_RAW)?.[0] ?? '';
  assert.ok(smsfBranch.length > 0, 'smsfEcpiMethod has gone or changed shape');
  for (const refusal of ['SegregatedEcpiNotModelledError', 'EcpiMethodNotStatedError']) {
    assert.equal([...ECPI_CODE.matchAll(new RegExp(`throw new ${refusal}`, 'g'))].length, 1);
    assert.equal([...smsfBranch.matchAll(new RegExp(`throw new ${refusal}`, 'g'))].length, 1);
  }
});

test('MUTATION — the fund type is resolved BEFORE any ECPI question is asked', () => {
  // The order is the scoping. If the refusals were reachable before the dispatch, an APRA fund
  // would be examined for a method it cannot be on.
  const entry = /export const ecpiMethod = \(input: \{[\s\S]*?\n\};/.exec(ECPI_CODE)?.[0] ?? '';
  assert.ok(entry.length > 0);
  assert.ok(entry.indexOf('FundTypeNotStatedError') < entry.indexOf('BY_FUND_TYPE[fundType]'));
  assert.doesNotMatch(entry, /SegregatedEcpiNotModelledError|EcpiMethodNotStatedError/);
  assert.doesNotMatch(entry, /statedMethod ===/);

  // **No default can be supplied here either.** The other place to write R11's forbidden default is
  // at the consumer — `interests[0]?.interest.fund ?? 'smsf'` — which is one operator, so the
  // operator is what is asserted absent. An absent fund type is counted and named, twice: once for
  // the interests that do not state it and once for the dispatch that cannot proceed without it.
  assert.doesNotMatch(ECPI_CODE, /\?\?/);
  assert.doesNotMatch(ECPI_CODE, /fund \|\|/);
  assert.match(entry, /interest\.fund === undefined/);
  assert.equal([...entry.matchAll(/throw new FundTypeNotStatedError/g)].length, 2);
  assert.match(entry, /const fundType = interests\[0\]\?\.interest\.fund;/);
});

test('MUTATION — no figure is declared here, and no percentage is computed', () => {
  // U37: the averaging is convention, not law, so a percentage produced here and presented as
  // certified is the failure the confidence labels exist to catch. There is no arithmetic at all —
  // no division, no multiplication of earnings, and no rate.
  assert.doesNotMatch(ECPI_CODE, /[^/*]\/[^/*=]/);
  assert.doesNotMatch(ECPI_CODE, /mulCents|toCents|Cents\b/);
  assert.doesNotMatch(ECPI_CODE, /SUPERANNUATION|assumptions\/super/);
  const literals = [...ECPI_CODE.matchAll(/(?<![\w.])\d[\d_]*(?:\.\d+)?/g)].map(([match]) => match);
  assert.deepEqual([...new Set(literals)].sort(), ['0', '1']); // the empty-fund test, the days test, the one-fund-type test
  // Confidence is never written on a result — `provenanceOf`, `withCaveats` and `mergeProvenance`
  // only. The three readings declare their own, and each is consumed.
  assert.doesNotMatch(/const smsfEcpiMethod[\s\S]*$/.exec(ECPI_CODE)?.[0] ?? '', /confidence:/);
  for (const reading of ['ECPI_IS_A_TRUSTEE_COMPUTATION', 'DEEMED_SEGREGATION', 'CERTIFICATE_HAS_NO_ESCAPE']) {
    assert.ok([...ECPI_CODE.matchAll(new RegExp(`\\b${reading}\\b`, 'g'))].length > 1, `${reading} is declared and unused`);
  }
});

test('R6 — no result comes back at a bare primary-verified', () => {
  // Every branch rests on a labelled reading: the APRA one on §3.11.6's unsourced assertion, the
  // deemed-segregation one on T127, the proportionate ones on U35 and U37. A branch that reported
  // `primary-verified` would be promoting an inference by consuming it.
  const determinations = [
    ecpiMethod({ fy: FY, interests: [convertedInDecember('apra')] }),
    ecpiMethod({ fy: FY, interests: [wholeYearRetirement('smsf')] }),
    ecpiMethod({ fy: FY, interests: [convertedInDecember('smsf'), accumulationAllYear('smsf')] }),
    ecpiMethod({ fy: FY, interests: [convertedInDecember('smsf')], statedMethod: 'proportionate' }),
  ];
  for (const determination of determinations) {
    assert.notEqual(determination.provenance.confidence, 'primary-verified');
    assert.ok(determination.provenance.caveats.length > 0);
  }
});
