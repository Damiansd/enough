// P3-28 — the §5A data layer, and the two halves of §9's franking Setting mutation.
//
// This file is unusual in one respect and it should be read knowing it: **nothing it asserts is
// consumed by any computation.** `src/data/assumptions/franking.ts` has no runtime consumer, by
// the declared decision in its own header (P3-22e put the day-level qualification machinery out
// of scope). So these are not behaviour tests. They are the tests that keep a declared-empty
// data layer honest: that it is reachable, that its figures are the register's, that its
// confidence labels are not laundered, and that the one figure the register forbids storing
// — a portfolio-level gross-up rate (T43) — has not quietly appeared.
//
// **What is structural here and what is not, stated once so nothing below over-claims.**
//
//   * §9's first half — "the §7 constants list must not contain [a portfolio rate]" — is FULLY
//     STRUCTURAL: §7 is a table in a file, and `the §7 franking rows are exactly twelve…` reads
//     it and pins the twelve by name. A thirteenth row, or a renamed one, fails.
//   * §9's second half — "the effective franking rate must resolve from a Setting" — tops out at
//     **"required, undefaulted parameter + absent literal"**. `payerCorporateTaxRate` is a
//     required parameter of `frankedDistributionFromRate`, so omitting it is a `tsc` error; but
//     TypeScript cannot forbid a numeric literal that happens to resemble a rate, so the "never
//     also stored" half is a SOURCE CANARY (`no rate-shaped literal…` below) and not a compiler
//     guarantee. Do not read it as one.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  ASSUMPTIONS,
  FRANKING,
  SETTINGS_NOT_ASSUMPTIONS,
  assumptionAt,
  assumptionKeys,
  explainAssumption,
} from '../dist/data/assumptions/index.js';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const register = readFileSync(join(ROOT, 'docs', 'assumptions-register.md'), 'utf8');
const frankingSource = readFileSync(join(ROOT, 'src', 'core', 'superFranking.ts'), 'utf8');

/** The register between two `## n.` headings, as text. No parser, like `refusal-names.test.mjs`. */
const section = (heading, next) =>
  register.slice(register.indexOf(`## ${heading}`), register.indexOf(`## ${next}`));

const SETTING_KEY = 'franking.portfolioEffectiveRate';

// --- Reachability: the orphan mutation --------------------------------------------------------
//
// Mutation: add `franking.ts` and do not wire it into `ASSUMPTIONS`. Nothing before this file
// would have caught it — the module would compile, export and be read by nobody, which is the
// "recorded and consumed by nothing" signature this project keeps finding, this time inside its
// own reflection API. The literal set is the pin: a renamed or dropped record fails here.

const FRANKING_KEYS = [
  'franking.atRisk.minimumNetDelta',
  'franking.dividendWashing.ceiling',
  'franking.excessCreditsRefundable.complyingFund',
  'franking.excessCreditsRefundable.individual',
  'franking.excessCreditsRefundable.nonComplyingFundOrAdf',
  'franking.holdingPeriod.dayCounting',
  'franking.holdingPeriod.days',
  'franking.holdingPeriod.qualificationWindows',
  'franking.holdingPeriod.widelyHeldTrustDays',
  'franking.maximumFrankingPercentage',
  'franking.parcelDisposalOrder',
  'franking.smallShareholder.boundary',
  'franking.smallShareholder.ceiling',
  'franking.smallShareholder.eligibleEntities',
];

test('franking is wired into ASSUMPTIONS and every record is reachable by the walk', () => {
  assert.equal(ASSUMPTIONS.franking, FRANKING);

  const found = assumptionKeys().filter((key) => key.startsWith('franking.'));
  assert.deepEqual(
    found,
    FRANKING_KEYS,
    'the franking records reachable by explainAssumption are not the fourteen this module carries — ' +
      'either the barrel wiring in index.ts was dropped (the orphan mutation) or a record was renamed',
  );

  for (const key of FRANKING_KEYS) {
    const explained = explainAssumption(key);
    assert.equal(explained.key, key);
    assert.ok(explained.source.length > 0, `${key} explains with no source`);
    assert.equal(explained.retrieved, '2026-09-04', `${key} is not stamped with the franking pass date`);
    assert.match(explained.registerSection, /^§5A/, `${key} does not point back into §5A`);
    assert.equal(explained.isFormula, false, `${key} is a formula — §5A carries no derived constant`);
  }
});

// --- The register says the same thing ---------------------------------------------------------
//
// §9's first half, and it is fully structural: §7 must never acquire a franking row holding a
// rate. The twelve are pinned by name, so a thirteenth row fails whatever it says.

const SEVEN_FRANKING_ROWS = [
  'Small shareholder ceiling',
  'Small shareholder exemption — eligible entities',
  'Small shareholder boundary',
  'Dividend-washing small-holder ceiling',
  'Holding period',
  'Holding period, widely held trust investor',
  'Qualification windows',
  'At-risk minimum net delta',
  'Day counting',
  'Parcel disposal order',
  'Maximum franking percentage',
  'Excess franking credits refundable',
];

test('the §7 franking rows are exactly twelve, and none of them is a rate a distribution is grossed up by', () => {
  const seven = section('7. The constants', '8. What is still open');
  const rows = seven
    .split('\n')
    .filter((line) => line.trim().endsWith('| franking |'))
    .map((line) => line.split('|').map((cell) => cell.trim()));

  assert.deepEqual(
    rows.map(([, name]) => name.replace(/\*\*/g, '')),
    SEVEN_FRANKING_ROWS,
    '§7\'s franking rows have moved. A THIRTEENTH row is the T43 mutation this test exists for: ' +
      'a portfolio-level gross-up rate stored as an engine constant. Twelve, by name, or fail.',
  );

  for (const [, name, value] of rows) {
    const row = `${name} ${value}`.toLowerCase();
    assert.ok(
      !/portfolio-level|effective franking rate|gross-up rate/.test(row),
      `§7 row "${name}" reads like a portfolio-level or gross-up rate. T43: no such figure exists ` +
        'in law — s 202-60(2) fixes the rate to the entity making the distribution — so it may ' +
        `never be a constant. It is a Setting: SETTINGS_NOT_ASSUMPTIONS['${SETTING_KEY}'].`,
    );
  }

  // And §5A.1's own row for it still types it a Setting rather than a figure.
  const fiveA = section('5A. Franking', '6. Cross-report consistency');
  const effectiveRate = fiveA
    .split('\n')
    .filter((line) => line.startsWith("| Effective franking rate for the Household's portfolio |"));
  assert.equal(effectiveRate.length, 1);
  assert.match(effectiveRate[0], /\*\*Setting — not an assumption\*\*/);
  assert.match(effectiveRate[0], /\*\*No legislated figure exists\.\*\*/);
});

// --- The figures, hand-derived from §5A and the statute ---------------------------------------
//
// Every number below is read off the register's §5A tables and converted by hand, never from
// implementation output. $5,000 → 500000 integer cents (P2-4). 45 and 90 are days. 0.30 is a
// delta expressed as a fraction, not 30. 1 is 100% expressed the way every other rate in this
// directory is expressed.

test('the twelve §7 constants hold the figures §5A states', () => {
  assert.equal(FRANKING.smallShareholder.ceiling.value, 500000);
  assert.equal(FRANKING.dividendWashing.ceiling.value, 500000);
  assert.deepEqual(FRANKING.holdingPeriod.days.value, { ordinary: 45, preferenceShares: 90 });
  assert.equal(FRANKING.holdingPeriod.widelyHeldTrustDays.value, 45);
  assert.equal(FRANKING.atRisk.minimumNetDelta.value, 0.3);
  assert.equal(FRANKING.maximumFrankingPercentage.value, 1);
  assert.equal(FRANKING.parcelDisposalOrder.value, 'LIFO across substantially identical securities');

  assert.equal(FRANKING.excessCreditsRefundable.individual.value, true);
  assert.equal(FRANKING.excessCreditsRefundable.complyingFund.value, true);
  assert.equal(FRANKING.excessCreditsRefundable.nonComplyingFundOrAdf.value, false);

  // T48's boundary, in the record's own words: "does not exceed $5000" — so exactly $5,000
  // qualifies. The ATO page says both "less than $5,000" and "$5,000 or more" and is wrong at the
  // boundary either way, which is why the statutory words are what is stored.
  assert.match(FRANKING.smallShareholder.boundary.value, /credits <= 5000 qualifies/);
  assert.match(FRANKING.smallShareholder.boundary.note, /exactly \$5,000\.00 QUALIFY/);
  assert.match(FRANKING.smallShareholder.boundary.note, /No taper, no shade-out, no partial claim/);

  // T50 — the two $5,000 rules are the same number and different rules. The records must say so,
  // because the conflation is the documented live risk, not a hypothetical one.
  assert.match(FRANKING.dividendWashing.ceiling.note, /SEPARATE rule/);
  assert.match(FRANKING.dividendWashing.ceiling.note, /does NOT reach indirect distributions/);
  assert.match(FRANKING.smallShareholder.boundary.note, /Indirect distributions ARE covered/);
  assert.notEqual(FRANKING.dividendWashing.ceiling.source, FRANKING.smallShareholder.ceiling.source);
  assert.match(FRANKING.dividendWashing.ceiling.source, /s 207-157\(4\)/);
  assert.match(FRANKING.smallShareholder.ceiling.source, /s 160APHT\(1\)\(b\)/);

  // T51 — the day of acquisition is always excluded, which is why 45 countable days needs 46
  // calendar days on the parcel. The record carries the rule; nothing counts days.
  assert.match(FRANKING.holdingPeriod.dayCounting.value, /exclude the day of acquisition ALWAYS/);
  assert.match(FRANKING.holdingPeriod.dayCounting.value, /ONLY if disposed of/);
  assert.match(FRANKING.holdingPeriod.dayCounting.value, /WITHOUT breaking continuity/);

  // T47 — a related payment switches the window, it does not disqualify.
  assert.match(FRANKING.holdingPeriod.qualificationWindows.note, /does NOT disqualify/);
  assert.match(FRANKING.holdingPeriod.qualificationWindows.value, /Secondary: ±45 \/ ±90/);
});

// --- Two financial years ----------------------------------------------------------------------
//
// The suite's two-year rule applied honestly to a section with no year axis. These records are
// `everyYear: true`, so the assertion that earns its keep is not "FY2026-27 and FY2027-28 agree"
// — it is that THERE IS NO YEAR TO DISAGREE ON, and that this is the property T48 needs. A
// franking constant that acquires an `fy` has been reclassified as config, and a config row is a
// row something can index. The $5,000 is the one the register says must never be indexed, and it
// must still be $5,000 in FY2036-37.

test('every franking constant holds for every year, and the $5,000 cannot be indexed into a forecast year', () => {
  for (const key of FRANKING_KEYS) {
    const record = assumptionAt(key);
    assert.equal(record.kind, 'constant', `${key} is ${record.kind} — §7 lists it as a constant`);
    assert.equal(record.everyYear, true, `${key} carries a stamp, so it is config and can be indexed`);
    assert.equal(record.fy, undefined, `${key} is year-stamped`);
    assert.equal(record.effective, undefined, `${key} is date-stamped`);
    assert.equal(
      explainAssumption(key).stamp,
      'every year of the Planning Horizon (constant)',
      `${key} explains with a year, which is what T48's uplift mutation would produce`,
    );
  }

  // The same record answers for every year the projection can ask about, because there is one.
  for (const fy of ['2026-27', '2027-28', '2036-37']) {
    assert.equal(
      assumptionAt('franking.smallShareholder.ceiling').value,
      500000,
      `the small shareholder ceiling moved in FY${fy}`,
    );
  }

  // T48's reason, not just its conclusion: no mechanism exists to index it, so a maintainer who
  // "fixes" the frozen figure has to delete this note to do it.
  const ceiling = FRANKING.smallShareholder.ceiling.note;
  assert.match(ceiling, /never receive a CPI or AWOTE uplift/);
  assert.match(ceiling, /no live provision to amend/);
  assert.match(ceiling, /In FY2036-37 it is still \$5,000/);
  assert.match(ceiling, /must NOT be filed with the Division 293 \$250,000 under one label/);
});

// --- Confidence, and the label R6 forbids narrowing --------------------------------------------

test('the O27 conclusion is carried at secondary-only in the record as well as in the code', () => {
  const relief = explainAssumption('franking.smallShareholder.eligibleEntities');
  assert.equal(
    relief.confidence,
    'secondary-only',
    'the statutory words of s 160APHT(1)(a) are primary-verified; the CONCLUSION that a complying ' +
      'fund has no equivalent relief is inferential (O27), and R6 forbids narrowing the label. ' +
      'Upgrading this to primary-verified buys an exemption from the qualification that travels ' +
      "with it into NotAQualifiedPersonError's message.",
  );
  assert.match(relief.registerSection, /O27/);
  assert.match(relief.note, /inferential/);
  assert.match(relief.note, /ACCEPTED 2026-09-04 by user ruling/);

  // Every other franking record is primary-verified, and none is unverified: §5A's twelve are the
  // best-sourced rows in the register, and a downgrade would be as much a drift signal as a lift.
  for (const key of FRANKING_KEYS) {
    const expected = key.endsWith('eligibleEntities') ? 'secondary-only' : 'primary-verified';
    assert.equal(assumptionAt(key).confidence, expected, `${key}`);
  }
});

test('the franking records are frozen all the way down', () => {
  assert.throws(() => {
    ASSUMPTIONS.franking.smallShareholder.ceiling.value = 600000;
  }, TypeError);
  assert.throws(() => {
    ASSUMPTIONS.franking.holdingPeriod.days.value.ordinary = 30;
  }, TypeError);
  assert.throws(() => {
    ASSUMPTIONS.franking.newRule = {};
  }, TypeError);
  assert.equal(FRANKING.smallShareholder.ceiling.value, 500000);
});

// --- §9's Setting half -------------------------------------------------------------------------

test('the effective franking rate resolves from a Setting, and no assumption anywhere holds one', () => {
  const setting = explainAssumption(SETTING_KEY);
  assert.equal(setting.kind, 'setting');
  assert.equal(setting.key, SETTING_KEY);
  assert.match(setting.registerSection, /T43/);
  assert.equal(assumptionAt(SETTING_KEY), undefined, 'the rate is claimed by both sides of the boundary');
  assert.equal(SETTINGS_NOT_ASSUMPTIONS[SETTING_KEY].kind, 'setting');

  // Nothing in the whole assumption tree is a portfolio, effective or gross-up rate. This is the
  // mutation "store a portfolio-level franking gross-up rate as an engine constant" asserted
  // against the data layer rather than against §7's markdown.
  for (const key of assumptionKeys()) {
    assert.ok(
      !/portfolio|effectiveRate|effectiveFranking|grossUp/i.test(key),
      `${key} reads like the rate T43 says cannot exist. If a figure genuinely needs this name, ` +
        'T43 has to be reopened first — it is not a naming question.',
    );
  }
});

test('the Setting states T43 at its actual width, and the over-broad reading survives only as a quotation', () => {
  const { reason } = SETTINGS_NOT_ASSUMPTIONS[SETTING_KEY];

  // T43's qualifier is the whole of it. A Setting reason that says "T43 forbids payer rates"
  // rather than "T43 forbids a PORTFOLIO-LEVEL rate" is the over-broad reading the register's own
  // §5A.3.1 already made once, and it is what this literal pin exists to stop coming back.
  assert.match(reason, /NO portfolio-level franking gross-up rate in law/);
  assert.match(reason, /THE ENTITY MAKING THE DISTRIBUTION/);
  assert.match(reason, /a diversified ETF spans both the 25% and the 30% rate/);

  // The correction frame: the superseded claim appears, is named false, and the true position is
  // stated beside it. All three, or the frame has decayed into a bare assertion.
  assert.match(reason, /§5A\.2's 25% and 30% appear in §7's constants list/);
  assert.match(reason, /The second half is TRUE on T43's words and the first half is FALSE/);
  assert.match(reason, /do not appear in §7 at all, under any tag/);
  assert.match(reason, /never proposed as §7 constants/);

  // R-B, recorded with its reason rather than silently omitted.
  assert.match(reason, /ANSWERED 2026-09-15 \(P3-28, R-B\): NOT BUILT/);
  assert.match(reason, /THE PREFERRED ROUTE NEEDS NO RATE AT ALL/);

  // And the enforcement claim is stated at its real strength, not upgraded to "structural".
  assert.match(reason, /REQUIRED, UNDEFAULTED parameter/);
  assert.match(reason, /the never-stored half is NOT structural/);
});

// --- The source canary: the half TypeScript cannot enforce -------------------------------------

test('no rate-shaped literal and no §7 franking figure appears in src/core/superFranking.ts', () => {
  // Comments are where 25%, 30% and $5,000 are DISCUSSED — legitimately, at length. The rule is
  // about code. Strip block comments and `//` lines, then look.
  const code = frankingSource
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .split('\n')
    .filter((line) => !line.trim().startsWith('//'))
    .join('\n');

  assert.ok(code.includes('frankedDistributionFromRate'), 'the canary is reading the wrong thing');

  const rateLiterals = [...code.matchAll(/(?<![\w.])0\.\d+/g)].map(([literal]) => literal);
  assert.deepEqual(
    rateLiterals,
    [],
    `src/core/superFranking.ts holds the rate literal(s) ${rateLiterals.join(', ')} in code. ` +
      'T43: s 202-60(2) fixes the rate to the payer, so no rate may live in this module — ' +
      'frankedDistributionFromRate takes it from the caller with the caller\'s own confidence, ' +
      'and frankedDistributionFromStatement needs no rate at all.',
  );

  // Mutation 8: read a §7 franking constant back into the engine — e.g. hard-code the $5,000
  // ceiling into the qualified-person check. The module must not import the data layer for
  // anything but types, and must not carry the figure as a number either.
  assert.ok(
    !/(?<![\w.$])5_?000(?![\w.])/.test(code),
    'the $5,000 ceiling appears as a numeric literal in superFranking.ts. It is an INDIVIDUAL\'S ' +
      'relief (§5A.6, O27) and has no super-side effect at any credit level, so a fund-side ' +
      'computation reading it is the T49 mutation.',
  );

  const valueImports = [...frankingSource.matchAll(/^import\s+(?!type)[^\n]*from\s+'([^']+)'/gm)].map(
    ([, specifier]) => specifier,
  );
  assert.ok(
    !valueImports.some((specifier) => specifier.includes('data/assumptions')),
    `superFranking.ts imports values from the data layer (${valueImports.join(', ')}). Its header ` +
      'states it reads not one franking record, and franking.ts states that nothing consumes it. ' +
      'Both claims stop being true together.',
  );
});
