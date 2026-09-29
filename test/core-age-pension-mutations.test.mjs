// P3-13 — the younger-partner accumulation exemption, end to end — and the register §9 mutation
// tests that fall inside Phase 3's Age Pension scope.
//
// Each test below names the deliberate code change it must fail against. §9's rule is that a
// mutation with no failing test is a trap the suite does not cover; these are the Age Pension
// rows of that table, written as executable assertions rather than a list.
//
// The §9 rows for T2/T3, T8/T9 and T17/T18 belong to P3-1..P3-5 (tax and superannuation), and
// T33..T37 and T40..T42 to P9 (HEAS). Their Age Pension halves — T32's card, T38's "unspent cash
// is assessable and deemed" — are here; the rest wait for their own module.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { toCents } from '../dist/core/money.js';
import { AGE_PENSION } from '../dist/data/assumptions/index.js';
import { agePensionEntitlement } from '../dist/core/agePension.js';

const SRC = resolve(dirname(fileURLToPath(import.meta.url)), '..', 'src');

/**
 * Comments and error messages name the traps by name — that is the point of them. The greps
 * below assert that no *code* names them, so comments and string literals are stripped first.
 */
const executableCode = (text) =>
  text
    .replaceAll(/\/\*[\s\S]*?\*\//g, '')
    .replaceAll(/\/\/.*$/gm, '')
    .replaceAll(/'(?:[^'\\]|\\.)*'/g, "''")
    .replaceAll(/"(?:[^"\\]|\\.)*"/g, '""')
    .replaceAll(/`(?:[^`\\]|\\.)*`/g, '``');

const RAW = Object.fromEntries(
  ['household.ts', 'agePension.ts', 'deeming.ts', 'workBonus.ts'].map((name) => [
    name,
    readFileSync(join(SRC, 'core', name), 'utf8'),
  ]),
);

const CORE_SOURCES = Object.values(RAW).map(executableCode);

/**
 * The opposite derivation: comment markers removed and whitespace flattened, so a claim made in a
 * comment — which wraps across lines and so never matches a naive grep of the raw text — reads as
 * one sentence. `executableCode` throws exactly these lines away, which is why a correction to a
 * comment is unenforceable without this.
 */
const flatten = (text) =>
  text.replaceAll(/^[ \t]*(?:\/\/|\*\/|\/\*\*?|\*)[ \t]?/gm, '').replaceAll(/\s+/g, ' ');

const PROSE = Object.fromEntries(Object.entries(RAW).map(([name, text]) => [name, flatten(text)]));

const person = (name, dateOfBirth, overrides = {}) => ({
  name,
  dateOfBirth,
  superInterests: [],
  parcels: [],
  employmentIncomePerFortnight: toCents(0),
  workBonusBalance: toCents(0),
  ...overrides,
});

const RATES_20_SEP_2026 = { lower: 0.0175, upper: 0.0375 };

// Alex is 71 throughout. Blair reaches Age Pension age on 2026-11-15 — inside the register's
// documented parameter window, so both sides of the cliff are computable.
const ALEX = person('Alex', '1955-01-01', {
  superInterests: [{ phase: 'accountBasedPension', balance: toCents(300_000) }],
});
const blairHolding = (phase) =>
  person('Blair', '1959-11-15', { superInterests: [{ phase, balance: toCents(600_000) }] });

const on = (date, blair, homeStatus = 'occupied') =>
  agePensionEntitlement({
    household: { persons: [ALEX, blair], homeStatus },
    date,
    deemingRates: RATES_20_SEP_2026,
  });

test('the source greps below are not vacuous — stripping leaves the executable code behind', () => {
  // A stripper that returned '' would make every grep in this file pass for the wrong reason.
  for (const source of CORE_SOURCES) {
    assert.match(source, /\bexport\b/);
    assert.ok(source.length > 500);
  }
  assert.match(CORE_SOURCES.join('\n'), /assessableAssets/);
  assert.match(CORE_SOURCES.join('\n'), /combinedRatePerFortnight/);
  // And it does still catch a word that is only in the code.
  assert.match(executableCode("const x = 1; // grandfather\nconst grandfathered = 2;"), /grandfather/);
  assert.doesNotMatch(executableCode("// grandfather\nconst x = 'grandfather';"), /grandfather/);
  // And the prose derivation keeps what that one throws away, rejoining a claim that wraps.
  assert.ok(PROSE['household.ts'].length > flatten(executableCode(RAW['household.ts'])).length);
  assert.match(flatten('//     wrapped across\n//     two lines'), /wrapped across two lines/);
  assert.match(PROSE['agePension.ts'], /Corrected on 2026-09-11/);
});

// --- P3-13: the cliff ---------------------------------------------------------------------------

test('the younger-partner cliff — entitlement immediately before and after Blair turns 67', () => {
  // Mutation: end the exemption at 65, or at Preservation Age. Either would make these identical.
  const before = on('2026-11-14', blairHolding('accumulation'));
  const after = on('2026-11-15', blairHolding('accumulation'));

  // Before: only Alex's $300,000 Account-Based Pension is assessed. Deemed $9,038.00 a year →
  // $347.62 a fortnight, under the $396.00 free area; $300,000 is under the $499,000 assets free
  // area. Neither test bites, so the couple combined maximum applies in full.
  assert.equal(before.assets.protectedAssets, toCents(600_000));
  assert.equal(before.assets.assessableAssets, toCents(300_000));
  assert.equal(before.incomeTest.assessed, toCents(347.62));
  assert.equal(before.bindingTest, 'neither');
  assert.equal(before.combinedRatePerFortnight, toCents(1_866));
  // Only Alex is of Age Pension age, so only Alex is paid — at half the combined rate.
  assert.deepEqual([...before.eligiblePersons], ['Alex']);
  assert.equal(before.householdRatePerFortnight, toCents(933));

  // After: Blair's $600,000 becomes assessable overnight. Assets $900,000 → $401,000 over the
  // free area → $1,203.00 of taper → $663.00. Deemed $31,538.00 a year → $1,213.00 a fortnight →
  // $408.50 of income taper → $1,457.50. The assets test binds.
  assert.equal(after.assets.protectedAssets, toCents(0));
  assert.equal(after.assets.assessableAssets, toCents(900_000));
  assert.equal(after.incomeTest.rate, toCents(1_457.5));
  assert.equal(after.assetsTest.rate, toCents(663));
  assert.equal(after.bindingTest, 'assets');
  assert.equal(after.combinedRatePerFortnight, toCents(663));

  // The cliff: $1,203.00 a fortnight off the combined rate, in one day.
  assert.equal(before.combinedRatePerFortnight - after.combinedRatePerFortnight, toCents(1_203));
  // Blair becomes eligible on the same day, so the Household figure falls by less than the
  // combined rate does — which is exactly why the combined figure is the one to chart.
  assert.equal(after.householdRatePerFortnight, toCents(663));
  assert.equal(before.householdRatePerFortnight - after.householdRatePerFortnight, toCents(270));
});

test('T27 — a TTR destroys the exemption at any age, and it is expensive', () => {
  // Mutation: keep the exemption alive after the younger Person starts a TTR. Blair is 66 here,
  // so under the accumulation rule the $600,000 would still be exempt.
  const accumulation = on('2026-11-14', blairHolding('accumulation'));
  const ttr = on('2026-11-14', blairHolding('ttr'));

  assert.equal(accumulation.assets.assessableAssets, toCents(300_000));
  assert.equal(ttr.assets.assessableAssets, toCents(900_000));
  assert.equal(ttr.combinedRatePerFortnight, toCents(663));

  // Blair is still under Age Pension age, so only Alex is paid: half of $663.00, not half of
  // $1,866.00. Starting the TTR costs the Household $601.50 a fortnight — about $15,600 a year.
  assert.deepEqual([...ttr.eligiblePersons], ['Alex']);
  assert.equal(ttr.householdRatePerFortnight, toCents(331.5));
  assert.equal(accumulation.householdRatePerFortnight - ttr.householdRatePerFortnight, toCents(601.5));

  // And the TTR case before the birthday is identical to the accumulation case after it — which
  // is the point of T27: the trigger is the income stream, not the age.
  const afterBirthday = on('2026-11-15', blairHolding('accumulation'));
  assert.equal(ttr.combinedRatePerFortnight, afterBirthday.combinedRatePerFortnight);
});

test('T27 — an Account-Based Pension held by the younger Person is never exempt either', () => {
  const abp = on('2026-11-14', blairHolding('accountBasedPension'));
  assert.equal(abp.assets.assessableAssets, toCents(900_000));
  assert.equal(abp.combinedRatePerFortnight, toCents(663));
});

// --- §9 Age Pension mutations -------------------------------------------------------------------

test('T25 — the cut-offs are derived, so they move on all three indexation dates', () => {
  // Mutation: hard-code the income and assets cut-offs. Three periods, three different pairs,
  // each reproducing the register's published fixture — from the rate and free area in force.
  const household = {
    persons: [
      person('Alex', '1955-01-01', {
        superInterests: [{ phase: 'accountBasedPension', balance: toCents(600_000) }],
      }),
      person('Blair', '1957-01-01'),
    ],
    homeStatus: 'occupied',
  };
  const at = (date) => agePensionEntitlement({ household, date });

  // Period 1: 20 Mar rates, prior free areas.
  assert.equal(at('2026-06-30').assetsTest.cutOff, toCents(1_085_000));
  assert.equal(at('2026-06-30').incomeTest.cutOff, toCents(4_000.8));
  // Period 2: the same rates, the new free areas — the pair a two-period model cannot express.
  assert.equal(at('2026-07-01').assetsTest.cutOff, toCents(1_102_500));
  assert.equal(at('2026-07-01').incomeTest.cutOff, toCents(4_016.8));
  // Period 3: the new rates, the same free areas.
  assert.equal(at('2026-09-20').assetsTest.cutOff, toCents(1_121_000));
  assert.equal(at('2026-09-20').incomeTest.cutOff, toCents(4_128));

  // The cut-off is exactly free area + rate ÷ taper, which is what makes it move when either does.
  const september = at('2026-09-20');
  assert.equal(
    september.incomeTest.cutOff,
    september.incomeTest.freeArea + september.maximumPaymentRate / 0.5,
  );
});

test('T26 — one indexed differential drives both assets free areas, in every period', () => {
  // Mutation: store the non-homeowner free areas as two independent series. Then a 1 July
  // indexation would not move them by exactly the change in the extra allowable amount.
  const couple = (homeStatus) => ({
    persons: [
      person('Alex', '1955-01-01', {
        superInterests: [{ phase: 'accountBasedPension', balance: toCents(300_000) }],
      }),
      person('Blair', '1957-01-01'),
    ],
    homeStatus,
  });
  const freeArea = (date, homeStatus) =>
    agePensionEntitlement({ household: couple(homeStatus), date }).assetsTest.freeArea;

  assert.equal(freeArea('2026-06-30', 'occupied'), toCents(481_500));
  assert.equal(freeArea('2026-06-30', 'noHome'), toCents(739_500));
  assert.equal(freeArea('2026-07-01', 'occupied'), toCents(499_000));
  assert.equal(freeArea('2026-07-01', 'noHome'), toCents(766_000));

  const before = freeArea('2026-06-30', 'noHome') - freeArea('2026-06-30', 'occupied');
  const after = freeArea('2026-07-01', 'noHome') - freeArea('2026-07-01', 'occupied');
  assert.equal(before, toCents(258_000));
  assert.equal(after, toCents(267_000));
  assert.equal(after - before, toCents(9_000), 'the differential itself indexes — the series do not drift');

  // And the single figures, the other mutation §9 names: setting the differential to $250,000.
  const single = (date, homeStatus) =>
    agePensionEntitlement({
      household: { persons: [person('Alex', '1955-01-01')], homeStatus },
      date,
    }).assetsTest.freeArea;
  assert.equal(single('2026-07-01', 'occupied'), toCents(333_000));
  assert.equal(single('2026-07-01', 'noHome'), toCents(600_000));
});

test('T29 — the Work Bonus is applied BEFORE the income test, not to the entitlement', () => {
  // Mutation: apply the Work Bonus after the income test. Applied before, $300 of sheltered wages
  // is worth $150 of entitlement at the 50c taper — not $300.
  const earning = (employment, workBonusBalance = toCents(0)) => ({
    persons: [
      person('Alex', '1955-01-01', {
        superInterests: [{ phase: 'accountBasedPension', balance: toCents(300_000) }],
        employmentIncomePerFortnight: toCents(employment),
        workBonusBalance,
      }),
      person('Blair', '1957-01-01'),
    ],
    homeStatus: 'occupied',
  });
  const rate = (household) =>
    agePensionEntitlement({ household, date: '2026-09-20' }).combinedRatePerFortnight;

  // $1,200 and $1,500 a fortnight, both with an empty balance: $900 and $1,200 assessed.
  assert.equal(rate(earning(1_200)), toCents(1_440.19));
  assert.equal(rate(earning(1_500)), toCents(1_290.19));
  assert.equal(rate(earning(1_200)) - rate(earning(1_500)), toCents(150), '$300 of wages, 50c taper');

  // A $300 balance shelters the extra $300 entirely — again before the test, so the answers match.
  assert.equal(rate(earning(1_500, toCents(300))), rate(earning(1_200)));

  // The income test is what binds in all of these; the assets test is nowhere near.
  const result = agePensionEntitlement({ household: earning(1_500), date: '2026-09-20' });
  assert.equal(result.bindingTest, 'income');
  assert.equal(result.assetsTest.rate, toCents(1_866));
});

test('T28 — there is no Account-Based Pension grandfathering flag to expose or default true', () => {
  // Mutation: expose grandfathering as a Setting, or default it true. There is no branch: an
  // Account-Based Pension is deemed unconditionally, and no core source names the concept.
  assert.equal(AGE_PENSION.treatment.accountBasedPensionGrandfathering.value, false);
  for (const source of CORE_SOURCES) {
    assert.doesNotMatch(source, /grandfather/i, 'a branch here would make the overstatement undetectable');
  }
});

test('T31 — the Energy Supplement is in the Maximum Payment Rate for a new claimant', () => {
  // Mutation: drop the Energy Supplement from a new claimant's payment. $21.20 a fortnight
  // combined; the 19 Sep 2016 closure applies to Family Tax Benefit and the Seniors Health Card.
  const household = {
    persons: [person('Alex', '1955-01-01'), person('Blair', '1957-01-01')],
    homeStatus: 'occupied',
  };
  const couple = agePensionEntitlement({ household, date: '2026-09-20' });
  assert.equal(couple.maximumPaymentRate, toCents(1_866)); // 1,711.80 + 133.00 + 21.20
  assert.notEqual(couple.maximumPaymentRate, toCents(1_844.8), 'without the Energy Supplement');
  assert.equal(couple.perPersonRatePerFortnight, toCents(933));

  const single = agePensionEntitlement({
    household: { persons: [person('Alex', '1955-01-01')], homeStatus: 'occupied' },
    date: '2026-09-20',
  });
  assert.equal(single.maximumPaymentRate, toCents(1_237.7)); // 1,135.40 + 88.20 + 14.10
});

test('T32 — the Pensioner Concession Card follows entitlement, and core/ knows nothing of HEAS', () => {
  // Mutation: confer the card on a $0-entitlement Household. The card is derived from the
  // Household rate and from nothing else, and no HEAS concept can reach this module to override it.
  const at = (balance) =>
    agePensionEntitlement({
      household: {
        persons: [
          person('Alex', '1955-01-01', {
            superInterests: [{ phase: 'accountBasedPension', balance: toCents(balance) }],
          }),
          person('Blair', '1957-01-01'),
        ],
        homeStatus: 'occupied',
      },
      date: '2026-09-20',
    });
  assert.equal(at(1_120_000).pensionerConcessionCard, true, 'any entitlement, however small');
  assert.equal(at(1_121_000).pensionerConcessionCard, false);

  for (const source of CORE_SOURCES) {
    assert.doesNotMatch(source, /\bheas\b/i, 'the card goal and the HEAS lever are independent');
  }
});

test("T38 — cash outside super is assessable and deemed, so holding it strictly reduces entitlement", () => {
  // Mutation: treat unspent loan proceeds as means-test neutral. The HEAS facility is P9's, but
  // the mechanism that makes drawing-and-not-spending harmful is this one, and it is testable now.
  const withCash = (cash) =>
    agePensionEntitlement({
      household: {
        persons: [
          person('Alex', '1955-01-01', {
            superInterests: [{ phase: 'accountBasedPension', balance: toCents(700_000) }],
            // The cash is stated as a parcel, which is the only way a Person can hold it after
            // P3-21f chunk 1 — and its COST BASE is deliberately not its market value, because
            // nothing in the means test may read a cost base.
            parcels:
              cash === 0 ? [] : [{ acquired: '2024-11-08', costBase: toCents(1), marketValue: toCents(cash) }],
          }),
          person('Blair', '1957-01-01'),
        ],
        homeStatus: 'occupied',
      },
      date: '2026-09-20',
    });

  const none = withCash(0);
  const unspent = withCash(50_000);
  assert.equal(none.combinedRatePerFortnight, toCents(1_263));
  assert.equal(unspent.assets.assessableAssets, toCents(750_000));
  assert.equal(unspent.combinedRatePerFortnight, toCents(1_113)); // 1,866 − 251 × 3
  assert.ok(unspent.combinedRatePerFortnight < none.combinedRatePerFortnight);
  // Deemed from day one as well — both tests see it.
  assert.equal(unspent.deeming.financialAssets, toCents(750_000));
});

test('T42 — a home market value cannot influence entitlement, whatever it is set to', () => {
  // Mutation: read the home market value from the assets test. The Setting is not a parameter of
  // this calculation, so handing it one changes nothing — asserted rather than assumed.
  const household = {
    persons: [
      person('Alex', '1955-01-01', {
        superInterests: [{ phase: 'accountBasedPension', balance: toCents(700_000) }],
      }),
      person('Blair', '1957-01-01'),
    ],
    homeStatus: 'occupied',
  };
  const withValue = (homeMarketValue) =>
    JSON.parse(
      JSON.stringify(agePensionEntitlement({ household, date: '2026-09-20', homeMarketValue })),
    );

  assert.deepEqual(withValue(toCents(500_000)), withValue(toCents(5_000_000)));
  assert.deepEqual(withValue(toCents(0)), withValue(toCents(50_000_000)));
  assert.equal(withValue(toCents(5_000_000)).combinedRatePerFortnight, toCents(1_263));
});

// --- P3-36: the resolved T39/T42 divergence, and the claim that outlived it ----------------------

test('MUTATION P3-36 — no comment in either module calls the T39/T42 case a contradiction', () => {
  // The claim had four copies and only one of them was the refusal message: `homeTreatment`'s
  // JSDoc ("The register contradicts itself on exactly this case"), the
  // `AssetSplit.homeIsAssessableButUnvalued` field comment ("the register's one
  // self-contradiction"), and the name of the test that covers the refusal. All four were written
  // before 11:05 on 2026-09-04, when the user ruling resolved T39 in favour of T42; the register
  // has recorded a knowing law/scope divergence ever since, and a knowing divergence is the
  // resolution, not the problem. The message is canaried at its throw site in
  // `core-age-pension.test.mjs`; these are the comments a reader meets first.
  for (const name of ['household.ts', 'agePension.ts']) {
    for (const shape of [
      /contradicts itself/i,
      /self-contradiction/i,
      /\bregister\b[^.]{0,60}\bcontradict/i,
      /\bcontradict\w*\b/i,
      /\bT39\b[^.]{0,30}\b(?:vs\.?|versus)\b[^.]{0,20}\bT42\b/i,
      /\b(?:at odds|irreconcilable|in conflict|inconsistent)\b/i,
      /\bdisagree\w*\b/i,
      /\bcannot both\b/i,
      /rather than pick a side/i,
    ]) {
      assert.doesNotMatch(PROSE[name], shape, `${name}: ${shape} — resolved 2026-09-04 in favour of T42`);
    }
  }

  // Stated positively, so that a comment which simply says nothing does not pass this by default.
  assert.match(PROSE['household.ts'], /resolved T39 in favour of T42/);
  assert.match(PROSE['household.ts'], /that knowing divergence is the resolution/);
  assert.match(PROSE['household.ts'], /Full assessment is Phase 14 work/);
  assert.match(PROSE['household.ts'], /resolved 2026-09-04 in favour of T42\. Makes `agePensionEntitlement` refuse/);
  assert.match(PROSE['agePension.ts'], /A \*\*scope refusal\*\* \(register §4\.4\.1\)/);
  assert.match(PROSE['agePension.ts'], /House value is not part of the means test/);

  // And the kind is named, because naming the wrong one was half the defect: a drift tripwire
  // reads one record of the register against another, and this reads `homeStatus` alone.
  assert.match(
    PROSE['agePension.ts'],
    /What it asserted about this register's own records is what a \*\*drift tripwire\*\* asserts/,
  );
  assert.match(PROSE['agePension.ts'], /This class reads `homeStatus` and compares nothing/);
  assert.match(PROSE['agePension.ts'], /It is gone now:/);
  assert.match(CORE_SOURCES.join('\n'), /homeIsAssessableButUnvalued/);
});
