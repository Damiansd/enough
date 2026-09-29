// Age Pension — register §4. The three-period year (T22) is what most of this file is about.
//
// Every dollar figure here is a published DSS or Services Australia rate. The cut-offs are the
// register's fixtures: they are derived in the module and asserted here, never stored.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { toCents } from '../dist/core/money.js';
import {
  AGE_PENSION,
  AGE_PENSION_PERIODS,
  SETTINGS_NOT_ASSUMPTIONS,
  agePensionPeriodAt,
  agePensionPeriods,
  assetsTestCutOff,
  deemingRatesAt,
  incomeTestCutOff,
  indexPensionRates,
  maximumPaymentRate,
  nonHomeownerAssetsFreeArea,
} from '../dist/data/assumptions/index.js';

test('T22 — the year has three parameter periods, assembled from two indexation calendars', () => {
  assert.equal(AGE_PENSION_PERIODS.length, 3);

  assert.deepEqual(
    AGE_PENSION_PERIODS.map((period) => [period.from, period.to, period.ratesEffective, period.meansTestEffective]),
    [
      ['2026-03-20', '2026-06-30', '2026-03-20', '2025-07-01'],
      ['2026-07-01', '2026-09-19', '2026-03-20', '2026-07-01'],
      ['2026-09-20', '2027-03-19', '2026-09-20', '2026-07-01'],
    ],
  );

  // Period 2 is the one a two-period model cannot express: the 20 Mar rates are still in force
  // while the free areas have already reindexed.
  const july = agePensionPeriodAt('2026-07-15');
  assert.equal(july.ratesEffective, '2026-03-20');
  assert.equal(july.meansTestEffective, '2026-07-01');
  assert.notEqual(july.ratesEffective, july.meansTestEffective);
  assert.equal(july.meansTest.incomeFreeArea.single, toCents(226));
  assert.equal(july.meansTest.incomeFreeArea.coupleCombined, toCents(396));
  assert.equal(july.meansTest.assetsFreeAreaHomeowner.single, toCents(333_000));
  assert.equal(july.meansTest.assetsFreeAreaHomeowner.coupleCombined, toCents(499_000));
  // ...against the rates that will not move until 20 September.
  assert.equal(july.rates.maximumBasicRate.single, toCents(1_100.3));
});

test('T22 — the two calendars are disjoint, so one flat set has nowhere to live', () => {
  for (const key of Object.keys(AGE_PENSION.paymentRates)) {
    assert.match(key, /-(03-20|09-20)$/, 'payment rates may only be keyed by a 20 Mar / 20 Sep date');
  }
  for (const key of Object.keys(AGE_PENSION.meansTest)) {
    assert.match(key, /-07-01$/, 'means-test parameters may only be keyed by a 1 July date');
  }
  const shared = Object.keys(AGE_PENSION.paymentRates).filter((key) => key in AGE_PENSION.meansTest);
  assert.deepEqual(shared, []);

  // Adding a fourth indexation date produces a fourth period without editing any list.
  assert.equal(agePensionPeriods('2026-03-20', '2026-06-30').length, 1);
  assert.equal(agePensionPeriods('2026-03-20', '2026-07-01').length, 2);
});

test('T23 — the Maximum Payment Rate is three indexed components plus one that never indexes', () => {
  const [first, second, third] = AGE_PENSION_PERIODS;

  assert.equal(maximumPaymentRate(first, 'single'), toCents(1_200.9));
  assert.equal(maximumPaymentRate(first, 'coupleEach'), toCents(905.2));
  assert.equal(maximumPaymentRate(first, 'coupleCombined'), toCents(1_810.4));

  // Period 2 shares period 1's rates — the free areas moved, the payment did not.
  assert.equal(maximumPaymentRate(second, 'coupleCombined'), maximumPaymentRate(first, 'coupleCombined'));

  assert.equal(maximumPaymentRate(third, 'single'), toCents(1_237.7));
  assert.equal(maximumPaymentRate(third, 'coupleEach'), toCents(933));
  assert.equal(maximumPaymentRate(third, 'coupleCombined'), toCents(1_866));

  // Dropping the Energy Supplement (T31) or the Pension Supplement (T33 via HEAS) breaks these.
  assert.equal(
    maximumPaymentRate(third, 'single'),
    third.rates.maximumBasicRate.single +
      third.rates.pensionSupplementMaximum.single +
      AGE_PENSION.energySupplement.value.single,
  );

  // Rent Assistance is nil for a homeowner Household, but the structure must not preclude it.
  assert.equal(AGE_PENSION.rentAssistanceHomeowner.value, toCents(0));
  assert.equal(maximumPaymentRate(third, 'single', toCents(100)), toCents(1_337.7));
});

test('T23/T31 — the Energy Supplement is not part of the thing that gets reindexed', () => {
  assert.equal(AGE_PENSION.energySupplement.kind, 'constant');
  assert.equal(AGE_PENSION.energySupplement.everyYear, true);
  assert.equal(AGE_PENSION.indexation.energySupplementIndexed.value, false);
  for (const period of AGE_PENSION_PERIODS) {
    assert.ok(!('energySupplement' in period.rates), 'the rate set must not carry it');
  }
  assert.equal(AGE_PENSION.energySupplement.value.single, toCents(14.1));
  assert.equal(AGE_PENSION.energySupplement.value.coupleEach, toCents(10.6));
});

test('T25 — the income cut-offs derive to the published figures on all three dates', () => {
  const [first, second, third] = AGE_PENSION_PERIODS;
  const cutOffs = (period) => [
    incomeTestCutOff(period.meansTest.incomeFreeArea.single, maximumPaymentRate(period, 'single')),
    incomeTestCutOff(period.meansTest.incomeFreeArea.coupleCombined, maximumPaymentRate(period, 'coupleCombined')),
    incomeTestCutOff(period.meansTest.incomeFreeArea.coupleCombined, maximumPaymentRate(period, 'single'), 2),
  ];

  assert.deepEqual(cutOffs(first), [toCents(2_619.8), toCents(4_000.8), toCents(5_183.6)]);
  assert.deepEqual(cutOffs(second), [toCents(2_627.8), toCents(4_016.8), toCents(5_199.6)]);
  assert.deepEqual(cutOffs(third), [toCents(2_701.4), toCents(4_128), toCents(5_346.8)]);

  // The register's own check: the cut-off and the rate cannot be decoupled.
  assert.equal((toCents(2_701.4) - toCents(226)) * AGE_PENSION.incomeTest.taper.value, toCents(1_237.7));
});

test('T25/T26 — the assets cut-offs derive, and one differential drives both homeowner states', () => {
  const homeowner = (period) => [
    assetsTestCutOff(period.meansTest.assetsFreeAreaHomeowner.single, maximumPaymentRate(period, 'single')),
    assetsTestCutOff(
      period.meansTest.assetsFreeAreaHomeowner.coupleCombined,
      maximumPaymentRate(period, 'coupleCombined'),
    ),
    assetsTestCutOff(period.meansTest.assetsFreeAreaHomeowner.coupleCombined, maximumPaymentRate(period, 'single'), 2),
  ];
  const nonHomeowner = (period) => {
    const extra = period.meansTest.extraAllowableAmount;
    const single = nonHomeownerAssetsFreeArea(period.meansTest.assetsFreeAreaHomeowner.single, extra);
    const couple = nonHomeownerAssetsFreeArea(period.meansTest.assetsFreeAreaHomeowner.coupleCombined, extra);
    return [
      assetsTestCutOff(single, maximumPaymentRate(period, 'single')),
      assetsTestCutOff(couple, maximumPaymentRate(period, 'coupleCombined')),
      assetsTestCutOff(couple, maximumPaymentRate(period, 'single'), 2),
    ];
  };

  const [first, second, third] = AGE_PENSION_PERIODS;
  assert.deepEqual(homeowner(first), [toCents(722_000), toCents(1_085_000), toCents(1_282_500)]);
  assert.deepEqual(homeowner(second), [toCents(733_500), toCents(1_102_500), toCents(1_300_000)]);
  assert.deepEqual(homeowner(third), [toCents(745_750), toCents(1_121_000), toCents(1_324_500)]);

  assert.deepEqual(nonHomeowner(first), [toCents(980_000), toCents(1_343_000), toCents(1_540_500)]);
  assert.deepEqual(nonHomeowner(second), [toCents(1_000_500), toCents(1_369_500), toCents(1_567_000)]);
  assert.deepEqual(nonHomeowner(third), [toCents(1_012_750), toCents(1_388_000), toCents(1_591_500)]);

  // The register's check: the couple homeowner cut-off reconciles to the couple combined rate.
  assert.equal(
    ((toCents(1_121_000) - toCents(499_000)) / 1_000) * AGE_PENSION.assetsTest.taper.value,
    toCents(1_866),
  );
});

test('T26 — the extra allowable amount is $267,000, and only the homeowner series is stored', () => {
  const july = agePensionPeriodAt('2026-07-15');
  assert.equal(july.meansTest.extraAllowableAmount, toCents(267_000));
  assert.equal(
    nonHomeownerAssetsFreeArea(july.meansTest.assetsFreeAreaHomeowner.single, july.meansTest.extraAllowableAmount),
    toCents(600_000),
  );
  assert.equal(
    nonHomeownerAssetsFreeArea(
      july.meansTest.assetsFreeAreaHomeowner.coupleCombined,
      july.meansTest.extraAllowableAmount,
    ),
    toCents(766_000),
  );
  // There is no stored non-homeowner figure that could drift away from the homeowner one.
  assert.ok(!('assetsFreeAreaNonHomeowner' in july.meansTest));
  // The $250,000 in concept.md was stale by $17,000.
  assert.notEqual(july.meansTest.extraAllowableAmount, toCents(250_000));
});

test('T25 — the cut-off follows the rate, so it cannot be hard-coded', () => {
  const period = agePensionPeriodAt('2026-10-01');
  const freeArea = period.meansTest.incomeFreeArea.coupleCombined;
  const base = incomeTestCutOff(freeArea, maximumPaymentRate(period, 'coupleCombined'));
  const higher = incomeTestCutOff(freeArea, maximumPaymentRate(period, 'coupleCombined', toCents(50)));
  assert.equal(higher - base, toCents(100)); // $50 of extra rate ÷ a 50c taper
});

test('T30 — deeming rates stop at the last determination and become a Setting', () => {
  assert.deepEqual(deemingRatesAt('2026-03-20'), { lower: 0.0125, upper: 0.0325 });
  assert.deepEqual(deemingRatesAt('2026-09-20'), { lower: 0.0175, upper: 0.0375 });
  assert.deepEqual(deemingRatesAt('2027-03-19'), undefined);
  assert.deepEqual(deemingRatesAt('2040-01-01'), undefined);

  // Three +0.5% steps have occurred; extrapolating a fourth is the T30 mutation.
  assert.equal(deemingRatesAt('2027-03-20'), undefined);
  assert.ok('agePension.deeming.ratesAfterLastDetermination' in SETTINGS_NOT_ASSUMPTIONS);

  // The 2020 COVID-freeze row is the register's one secondary-only figure. It stays that way.
  assert.equal(AGE_PENSION.deemingDeterminations['2020-05-01'].confidence, 'secondary-only');
});

test('a deeming determination never lands inside a parameter period without splitting it', () => {
  // If this ever fails, a Ministerial determination has been made off the 20 Mar / 20 Sep
  // calendar and the period assembly needs a third boundary source — not a patched-up date.
  for (const date of Object.keys(AGE_PENSION.deemingDeterminations)) {
    for (const period of AGE_PENSION_PERIODS) {
      assert.ok(
        !(date > period.from && date <= period.to),
        `deeming determination ${date} falls inside the period starting ${period.from}`,
      );
    }
  }
});

test('T23/T24 — the basic rate follows wages while the Pension Supplement follows prices', () => {
  const start = agePensionPeriodAt('2026-10-01').rates;
  // The annualised MTAWE that makes the benchmark bind exactly at the 20 Sep 2026 rate.
  let annualisedMtawe = toCents((1_711.8 * 26) / 0.4176);
  const cpi = 1.01;
  const wages = 1.02;

  let rates = start;
  for (let period = 0; period < 40; period += 1) {
    annualisedMtawe = Math.round(annualisedMtawe * wages);
    rates = indexPensionRates(rates, { cpi, pblci: 1.005, annualisedMtawe });
  }

  const cpiOnly = start.maximumBasicRate.coupleCombined * cpi ** 40;
  assert.ok(
    rates.maximumBasicRate.coupleCombined > cpiOnly * 1.4,
    'the MTAWE benchmark must lift the basic rate well past a CPI-only path',
  );

  // The Pension Supplement is CPI-only and must NOT have been benchmarked with it.
  const supplementCpiOnly = start.pensionSupplementMaximum.coupleCombined * cpi ** 40;
  assert.ok(Math.abs(rates.pensionSupplementMaximum.coupleCombined - supplementCpiOnly) < toCents(1));
  assert.ok(
    rates.pensionSupplementMaximum.coupleCombined / rates.maximumBasicRate.coupleCombined <
      start.pensionSupplementMaximum.coupleCombined / start.maximumBasicRate.coupleCombined,
    'a CPI-only supplement must shrink as a share of a wage-linked basic rate',
  );

  // The Energy Supplement is untouched by the mechanism, 40 periods on.
  assert.equal(AGE_PENSION.energySupplement.value.single, toCents(14.1));

  // T24: the free areas index at CPI only, so the means test bites harder in real terms every
  // year. Over the same 40 periods the free area falls to a fraction of the payment it gates.
  const freeAreaThen = agePensionPeriodAt('2026-10-01').meansTest.incomeFreeArea.coupleCombined;
  const freeAreaNow = freeAreaThen * cpi ** 40;
  assert.ok(
    freeAreaNow / rates.maximumBasicRate.coupleCombined < freeAreaThen / start.maximumBasicRate.coupleCombined,
    'a single indexation Setting cannot express this — it is a first-order 40-year effect',
  );
});

test('the published single : couple ratio reconciles to the stored 0.6633', () => {
  const round4 = (value) => Math.round(value * 10_000) / 10_000;
  assert.equal(round4(toCents(1_135.4) / toCents(1_711.8)), AGE_PENSION.indexation.singleToCoupleRatio.value);
  assert.equal(round4(toCents(1_100.3) / toCents(1_658.8)), AGE_PENSION.indexation.singleToCoupleRatio.value);
  // The mechanism is stored; the rates are stored as published, because SSA s 1197's rounding
  // was not retrieved (register O10) and 0.6633 × 1,711.80 is $1,135.53, not $1,135.40.
  assert.notEqual(toCents(1_711.8 * 0.6633), toCents(1_135.4));
});

test('T27/T28/T29 — the couple rules that are silent bugs when got wrong', () => {
  const treatment = AGE_PENSION.treatment;
  assert.equal(treatment.accountBasedPensionGrandfathering.value, false);
  assert.equal(treatment.accountBasedPensionGrandfathering.kind, 'constant');
  assert.match(treatment.youngerPartnerExemptionEnds.value, /67/);
  assert.match(treatment.youngerPartnerExemptionEnds.value, /TTR/);
  assert.equal(AGE_PENSION.workBonus.poolable.value, false);
  assert.match(AGE_PENSION.workBonus.orderOfApplication.value, /BEFORE the income test/);
  assert.doesNotMatch(AGE_PENSION.workBonus.eligibleIncome.value, /investment/);
  assert.equal(AGE_PENSION.workBonus.maximumBalance.value, toCents(11_800));
});

test('T32 — the Pensioner Concession Card does not come from HEAS at nil entitlement', () => {
  assert.match(AGE_PENSION.treatment.pensionerConcessionCard.value, /NOT via HEAS at \$0 entitlement/);
  assert.equal(AGE_PENSION.treatment.pensionerConcessionCard.confidence, 'primary-via-archive');
});

// --- P4-18: two figures that used to exist only inside the words --------------------------------
//
// Both blocks below assert the same thing twice: that the RECORD holds the figure, and that the
// PROSE beside it still says the same number. The prose is read off the raw `.ts`, because both
// figures live in places no import can reach — one in a doc comment, one inside a `note:` string —
// and a pin that cannot read them is a pin that cannot fail.

/** The raw module text. Comment bodies and string literals both survive, which is the point. */
const RAW_AGE_PENSION = readFileSync(new URL('../src/data/assumptions/agePension.ts', import.meta.url), 'utf8');

/** Doc-comment continuation markers removed, so a sentence wrapped across lines reads as one. */
const flattenProse = (source) => source.replace(/\n\s*\*\s?/g, ' ').replace(/[ \t]+/g, ' ');

const dollarsToCents = (text) => toCents(Number(text.replace(/,/g, '')));

/** The transitional sentence, or `undefined`. Returning `undefined` is what makes the pin fallible. */
const transitionalProse = (source) => {
  const match = flattenProse(source).match(
    /transitional rate \(single \$([\d,]+\.\d{2}), couple each \$([\d,]+\.\d{2})\)/,
  );
  return match === null ? undefined : { single: dollarsToCents(match[1]), coupleEach: dollarsToCents(match[2]) };
};

/** The three published rounding steps as the doc comment states them, or `undefined`. */
const roundingStepProse = (source) => {
  const match = flattenProse(source).match(
    /\$(\d+) a fortnight for the income free area, \$(\d+) for the assets free areas, \$(\d+) for the deeming thresholds/,
  );
  return match === null
    ? undefined
    : {
        incomeFreeArea: toCents(Number(match[1])),
        assetsFreeArea: toCents(Number(match[2])),
        deemingThreshold: toCents(Number(match[3])),
      };
};

test('P4-18 — the transitional rate is a record, and the prose beside it agrees', () => {
  const record = AGE_PENSION.transitionalMaximumRate;

  assert.equal(record.kind, 'config');
  assert.equal(record.effective, '2026-03-20');
  assert.equal(record.retrieved, '2026-09-21');
  assert.equal(record.confidence, 'primary-via-archive');
  assert.match(record.registerSection, /^§4\.2/);
  assert.match(record.source, /Transitional rates/);
  assert.match(record.source, /archive/i, 'primary-via-archive claims an archive — which one?');

  assert.equal(record.value.single, toCents(963.6));
  assert.equal(record.value.coupleEach, toCents(778.2));
  // The couple-combined figure is published too, and it is exactly twice the couple-each one.
  assert.equal(record.value.coupleCombined, toCents(1_556.4));
  assert.equal(record.value.coupleCombined, record.value.coupleEach * 2);

  // The prose and the record cannot drift: changing either alone fails here.
  assert.deepEqual(transitionalProse(RAW_AGE_PENSION), {
    single: record.value.single,
    coupleEach: record.value.coupleEach,
  });

  // Positive control — the pin reads real text, not a tautology.
  assert.equal(transitionalProse(''), undefined);
  assert.equal(transitionalProse(RAW_AGE_PENSION.replace(/transitional rate \(single/g, 'transitional rate (')), undefined);
});

test('the 20 Sep 2026 transitional rate sits beside the 20 Mar record, in the same shape', () => {
  const record = AGE_PENSION.transitionalMaximumRate20Sep2026;
  assert.equal(record.kind, 'config');
  assert.equal(record.effective, '2026-09-20');
  assert.equal(record.value.single, toCents(982.9));
  assert.equal(record.value.coupleEach, toCents(793.8));
  assert.equal(record.value.coupleCombined, toCents(1_587.6));
  assert.equal(record.value.coupleCombined, record.value.coupleEach * 2);
  const normal = AGE_PENSION.paymentRates['2026-09-20'].value.maximumBasicRate;
  for (const status of ['single', 'coupleEach', 'coupleCombined']) {
    assert.ok(record.value[status] < normal[status], `the transitional ${status} rate must sit below the normal one`);
    assert.ok(record.value[status] > AGE_PENSION.transitionalMaximumRate.value[status], `${status} rose from 20 Mar`);
  }
  assert.match(record.note, /NOT MODELLED/);
});

test('P4-18 — the archived capture is cross-checked against the NORMAL rates this file already holds', () => {
  // This is what makes `primary-via-archive` worth anything: the same table, in the same capture,
  // on the same day, reproduces the rate set below to the cent in all three columns. A capture of
  // the wrong date or a misread column could not do that.
  const normal = AGE_PENSION.paymentRates['2026-03-20'].value.maximumBasicRate;
  assert.deepEqual(
    { single: normal.single, coupleEach: normal.coupleEach, coupleCombined: normal.coupleCombined },
    { single: toCents(1_100.3), coupleEach: toCents(829.4), coupleCombined: toCents(1_658.8) },
  );

  // And the transitional rate is BELOW the normal one everywhere — which is the whole reason the
  // transitional rate still exists (it is being caught up to, not overtaken).
  for (const status of ['single', 'coupleEach', 'coupleCombined']) {
    assert.ok(
      AGE_PENSION.transitionalMaximumRate.value[status] < normal[status],
      `the transitional ${status} rate must sit below the normal one`,
    );
  }

  // NOT MODELLED, and the record says so — promoting a figure is not wiring it in.
  assert.match(AGE_PENSION.transitionalMaximumRate.note, /NOT MODELLED/);
});

test('P4-18 — the published rounding steps are a record, stamped unverified, and the prose agrees', () => {
  const record = AGE_PENSION.indexation.publishedRoundingSteps;

  assert.equal(record.kind, 'constant');
  assert.equal(record.everyYear, true);
  assert.equal(record.retrieved, '2026-09-21');
  assert.equal(record.confidence, 'unverified', 'no rounding rule was ever retrieved — O74 is open');
  assert.match(record.source, /no rounding rule retrieved/);
  assert.match(record.source, /O74/);
  assert.match(record.note, /NOT APPLIED/);

  assert.deepEqual(roundingStepProse(RAW_AGE_PENSION), {
    incomeFreeArea: record.value.incomeFreeArea,
    assetsFreeArea: record.value.assetsFreeArea,
    deemingThreshold: record.value.deemingThreshold,
  });
  assert.equal(roundingStepProse(''), undefined);
});

test('P4-18 — the step sizes are consistent with every published movement this file carries', () => {
  // The honest half of an `unverified` record: it is not proof, it is a failure to contradict.
  // Every published 1 July movement must be a whole multiple of the step for its parameter, and
  // for two of the three the step IS the greatest common divisor of those movements — computed
  // here from the records rather than restated, so a new published year re-runs the check.
  const gcd = (a, b) => (b === 0 ? a : gcd(b, a % b));
  const prior = AGE_PENSION.meansTest['2025-07-01'].value;
  const current = AGE_PENSION.meansTest['2026-07-01'].value;
  const steps = AGE_PENSION.indexation.publishedRoundingSteps.value;

  const movements = {
    incomeFreeArea: [
      current.incomeFreeArea.single - prior.incomeFreeArea.single,
      current.incomeFreeArea.coupleCombined - prior.incomeFreeArea.coupleCombined,
    ],
    assetsFreeArea: [
      current.assetsFreeAreaHomeowner.single - prior.assetsFreeAreaHomeowner.single,
      current.assetsFreeAreaHomeowner.coupleCombined - prior.assetsFreeAreaHomeowner.coupleCombined,
      current.extraAllowableAmount - prior.extraAllowableAmount,
    ],
    deemingThreshold: [
      current.deemingThreshold.single - prior.deemingThreshold.single,
      current.deemingThreshold.coupleCombined - prior.deemingThreshold.coupleCombined,
    ],
  };

  for (const [parameter, deltas] of Object.entries(movements)) {
    for (const delta of deltas) {
      assert.ok(delta > 0, `${parameter} moved by ${delta}, which is not an indexation`);
      assert.equal(delta % steps[parameter], 0, `${parameter} moved by ${delta}, not a multiple of ${steps[parameter]}`);
    }
  }

  // Exactly the step, for two of the three.
  assert.equal(movements.assetsFreeArea.reduce(gcd), steps.assetsFreeArea);
  assert.equal(movements.deemingThreshold.reduce(gcd), steps.deemingThreshold);

  // And NOT for the third — the record's own note says two transitions cannot pin the income free
  // area's step, and this is that admission in a form that fails if anyone quietly upgrades it.
  assert.notEqual(movements.incomeFreeArea.reduce(gcd), steps.incomeFreeArea);
});

// --- THE STANDING TABLE, ITS ARGUMENT AND ITS EVIDENCE — user ruling 2026-09-21 -----------------
//
// The ruling is "as with other items, assume current numbers continue whilst awaiting future
// pertinent legislation", applied to the Age Pension. `STANDING_PARAMETERS_DIRECTION` is what makes
// that safe rather than a nominal freeze: a frozen rate can only be at or below the legislated one,
// and frozen means-test thresholds sit below where the law would put them, so both limbs run
// against the Household and the total cannot flatter it.
//
// Half of limb 1 is an EMPIRICAL claim — that a legislated rate has never fallen — and until
// `PENSION_RATE_HISTORY` this file held two consecutive published sets, which can evidence exactly
// one movement. These assertions are what make the claim checkable rather than merely stated.
test('the maximum-basic-rate history never FALLS, which is what the standing table leans on', async () => {
  const { AGE_PENSION: PENSION } = await import('../dist/data/assumptions/agePension.js');
  const dates = Object.keys(PENSION.rateHistory.value);
  const rates = dates.map((date) => PENSION.rateHistory.value[date]);
  assert.ok(rates.length >= 10, 'a direction claim over forty years needs more than a handful of points');
  for (let i = 1; i < rates.length; i += 1) {
    assert.ok(
      rates[i] >= rates[i - 1],
      `the maximum basic rate FALLS from ${dates[i - 1]} ($${rates[i - 1] / 100}) to ${dates[i]} ($${rates[i] / 100}) — ` +
        'STANDING_PARAMETERS_DIRECTION claims no published movement has ever been a fall, and a fall ' +
        'here means the argument above it is now false, not that this figure needs updating',
    );
  }
  assert.ok(rates.at(-1) > rates[0], 'the ladder must actually rise, not merely never fall');
});

test('the history carries the ONE stand-still, which is the floor showing up in the data', () => {
  // 20 September 2020: the CPI had gone backwards, the indexation factor floored at 1, and the rate
  // did not move. It is the reason the claim is worded *never fallen* and not *always risen*, and a
  // history with no flat row would mean somebody had smoothed the evidence rather than recorded it.
  const history = AGE_PENSION.rateHistory.value;
  assert.equal(history['2020-09-20'], history['2020-03-20'], 'the COVID stand-still is gone from the record');
  const movements = Object.keys(history).slice(1);
  const flat = movements.filter((date, index) => history[date] === history[Object.keys(history)[index]]);
  assert.equal(flat.length, 1, `expected exactly one stand-still in the record, found ${flat.length}`);
});

test('the history JOINS UP with the rates the engine actually computes from', () => {
  // The cross-check that shows the two describe one payment: the evidence stops at 20 Mar 2024 and
  // the published records start at 20 Mar 2026, so the last historical figure must sit strictly
  // below the first published one. A record describing some other payment would not have to.
  const history = AGE_PENSION.rateHistory.value;
  const published = AGE_PENSION.paymentRates['2026-03-20'].value.maximumBasicRate.single;
  assert.ok(
    history['2024-03-20'] < published,
    `the history ends at ${history['2024-03-20']} and the register's first published rate is ${published} — ` +
      'a history that does not rise into the published figures is not this payment\'s history',
  );
  // And the two published sets this file holds continue the same direction, computed rather than restated.
  assert.ok(
    AGE_PENSION.paymentRates['2026-09-20'].value.maximumBasicRate.single > published,
    'the published movement this file holds runs the other way from the history',
  );
});

test('the standing period carries the LAST PUBLISHED sets, verbatim, and says that it did', async () => {
  const { standingAgePensionPeriod, LAST_PUBLISHED_PARAMETER_DAY, AGE_PENSION_PERIODS: PERIODS } = await import(
    '../dist/data/assumptions/agePension.js'
  );
  const last = PERIODS.at(-1);
  const standing = standingAgePensionPeriod('2045-06-15');
  assert.equal(standing.standingFrom, LAST_PUBLISHED_PARAMETER_DAY, 'a carried period must say where it was carried from');
  assert.equal(standing.ratesEffective, last.ratesEffective);
  assert.equal(standing.meansTestEffective, last.meansTestEffective);
  assert.equal(standing.rates, last.rates, 'the rate set is the published object, not a copy that can drift');
  assert.equal(standing.meansTest, last.meansTest);
  // Every published period must be distinguishable from it WITHOUT comparing figures, because the
  // figures are identical by construction — the same separation `tax.ts` makes with `standingLawFrom`.
  for (const period of PERIODS) {
    assert.equal(period.standingFrom, undefined, `${period.from} is a published period and must not be marked as carried`);
  }
  // The deeming rates are NOT carried: they are a Ministerial determination with no formula (T30).
  assert.equal(standing.deemingRates, undefined, 'a standing period must not carry a deeming determination forward');
});

test('the standing table IS WIRED: a date past the published window answers, and says it was carried', async () => {
  // This test used to assert the opposite — that `agePensionPeriodAt` did NOT reach
  // `standingAgePensionPeriod`, because register O30 was what that one line was waiting on. O30
  // closed on 2026-09-21 (the Medicare levy is assessed per taxpayer, so a mixed-SAPTO couple is no
  // longer refused) and the line is written. What the test defends is unchanged in kind: landing or
  // throwing the switch must not quietly change an answer, so the answer is asserted here.
  const { agePensionPeriodAt: periodAt, LAST_PUBLISHED_PARAMETER_DAY, AGE_PENSION_PERIODS: PERIODS } = await import(
    '../dist/data/assumptions/agePension.js'
  );
  const last = PERIODS.at(-1);
  const carried = periodAt('2045-06-15');
  assert.equal(carried.standingFrom, LAST_PUBLISHED_PARAMETER_DAY, 'a carried period must say it was carried');
  assert.equal(carried.rates, last.rates, 'and must carry the published set itself, not a copy that can drift');
  assert.equal(carried.to, '2045-06-15');
  assert.doesNotThrow(() => periodAt(LAST_PUBLISHED_PARAMETER_DAY), 'the published window itself must still answer');
  // The published window is still answered by the PUBLISHED period, not by the standing one: the
  // branch is `date > LAST_PUBLISHED_PARAMETER_DAY` and a boundary slip here would silently restamp
  // a legislated month as carried.
  assert.equal(periodAt(LAST_PUBLISHED_PARAMETER_DAY).standingFrom, undefined);
  assert.equal(periodAt(dayBefore(LAST_PUBLISHED_PARAMETER_DAY)).standingFrom, undefined);
  assert.notEqual(periodAt(dayAfter(LAST_PUBLISHED_PARAMETER_DAY)).standingFrom, undefined);
  // A date BELOW the window is still refused, and that is the bound the standing table did not
  // touch: §4.7 indexes forward from a published set, and running it backwards would be an
  // extrapolation in the other direction.
  assert.throws(() => periodAt('2019-01-01'), /no Age Pension parameter period covers/);
  // A STATED series still wins wherever it is supplied — the standing table is the fallback for a
  // plan that claims nothing, never an override of a plan that claims something.
  assert.equal(periodAt(LAST_PUBLISHED_PARAMETER_DAY).standingFrom, undefined);
});

const dayBefore = (date) => {
  const at = new Date(`${date}T00:00:00Z`);
  at.setUTCDate(at.getUTCDate() - 1);
  return at.toISOString().slice(0, 10);
};
const dayAfter = (date) => {
  const at = new Date(`${date}T00:00:00Z`);
  at.setUTCDate(at.getUTCDate() + 1);
  return at.toISOString().slice(0, 10);
};
