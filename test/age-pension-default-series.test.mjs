// The Age Pension series a plan gets when it states none (user ruling, 2026-09-23).
//
// Until that day a plan with no `economicSeries.agePension` carried the 20 September 2026 rates and
// the 1 July 2026 means test forward, unchanged, to every later date. It now indexes them on the
// plan's own `cpi`, `pblci` and `mtawe` growth rates: half a year of each on 20 March and
// 20 September — √(1 + rate) — with MTAWE as a LEVEL grown from the ABS May 2026 figure, and a whole
// year of CPI on 1 July. A stated series is untouched.
//
// **Every figure below is hand-worked from the rates and the published sets, never read off the
// engine.** The rates are three DIFFERENT numbers (2%, 3%, 4%) wherever a walk is asserted, so that
// a limb fed the wrong rate is a different figure and not the same one by coincidence.
import test from 'node:test';
import assert from 'node:assert/strict';

import { toCents } from '../dist/core/money.js';
import { project } from '../dist/core/projection.js';
import {
  AGE_PENSION,
  MissingPensionIndexationError,
  agePensionPeriodsThrough,
  defaultAgePensionSeries,
} from '../dist/data/assumptions/agePension.js';

const RATES = { cpi: 0.025, pblci: 0.03, mtawe: 0.035 };

// --- §1 The generator, pure ------------------------------------------------------------------------

test('the MTAWE anchor is the ABS figure itself — weekly, sourced, and stamped with the quarter it serves', () => {
  const anchor = AGE_PENSION.indexation.mtaweAnchor;
  assert.equal(anchor.value, toCents(1_832.8));
  assert.equal(anchor.effective, '2026-06-30');
  assert.equal(anchor.confidence, 'primary-verified');
  assert.match(anchor.source, /abs\.gov\.au/);
  assert.match(anchor.source, /May 2026/);
  assert.match(anchor.source, /Males/);
  assert.match(anchor.source, /original/);
  // The floor did NOT bind on 20 Sep 2026 (register O14): 41.76% of 52 × $1,832.80, per fortnight,
  // is $1,530.75 against the published $1,711.80 combined couple basic rate.
  assert.equal(Math.round((0.4176 * 52 * anchor.value) / 26), 153_075);
  assert.ok(153_075 < AGE_PENSION.paymentRates['2026-09-20'].value.maximumBasicRate.coupleCombined);
});

test('the chain starts AFTER the last published sets and runs exactly through the day asked for', () => {
  const series = defaultAgePensionSeries(RATES, '2028-12-31');
  // 20 Sep 2026 and 1 Jul 2026 are published; the first generated dates are the next of each.
  assert.deepEqual(
    series.rateIndexations.map((each) => each.effective),
    ['2027-03-20', '2027-09-20', '2028-03-20', '2028-09-20'],
  );
  assert.deepEqual(series.meansTestIndexations.map((each) => each.effective), ['2027-07-01', '2028-07-01']);
  // The last day is inclusive and the day before it is not — on both calendars.
  assert.equal(defaultAgePensionSeries(RATES, '2028-09-20').rateIndexations.at(-1).effective, '2028-09-20');
  assert.equal(defaultAgePensionSeries(RATES, '2028-09-19').rateIndexations.at(-1).effective, '2028-03-20');
  assert.equal(defaultAgePensionSeries(RATES, '2028-07-01').meansTestIndexations.at(-1).effective, '2028-07-01');
  assert.equal(defaultAgePensionSeries(RATES, '2028-06-30').meansTestIndexations.at(-1).effective, '2027-07-01');
  // Before the first generated date there is nothing to generate.
  assert.deepEqual(defaultAgePensionSeries(RATES, '2027-03-19').rateIndexations, []);
});

test('a half-year is √(1 + rate) of CPI and of PBLCI, and 1 July is a whole year of CPI on both quarters', () => {
  const [march, september] = defaultAgePensionSeries(RATES, '2027-12-31').rateIndexations;
  // √1.025 and √1.03, written as literals rather than computed from RATES.
  for (const observation of [march, september]) {
    assert.ok(Math.abs(observation.cpi - 1.0124228365658292) < 1e-15, `cpi ${observation.cpi}`);
    assert.ok(Math.abs(observation.pblci - 1.014889156509222) < 1e-15, `pblci ${observation.pblci}`);
  }
  // Two half-years compound to exactly one year: the factor is not the annual rate halved.
  assert.ok(Math.abs(march.cpi * september.cpi - 1.025) < 1e-12);
  const [july] = defaultAgePensionSeries(RATES, '2027-12-31').meansTestIndexations;
  assert.equal(july.cpiMarchQuarter, 1.025);
  assert.equal(july.cpiDecemberQuarter, 1.025);
});

test('MTAWE is the ABS level grown at `mtawe` to each date’s reference quarter, annualised, in cents', () => {
  // 52 × $1,832.80 = $95,305.60, grown by √1.035 per half-year from the June 2026 quarter:
  //   20 Mar 2027 → Dec 2026 quarter, one half-year   9,530,560 × 1.035^0.5 = 9,695,910
  //   20 Sep 2027 → Jun 2027 quarter, two               9,530,560 × 1.035     = 9,864,130
  //   20 Mar 2028 → Dec 2027 quarter, three             9,530,560 × 1.035^1.5 = 10,035,267
  //   20 Sep 2028 → Jun 2028 quarter, four              9,530,560 × 1.035^2   = 10,209,374
  const series = defaultAgePensionSeries(RATES, '2028-12-31');
  assert.deepEqual(series.rateIndexations.map((each) => each.annualisedMtawe), [9_695_910, 9_864_130, 10_035_267, 10_209_374]);
});

test('a rate that wipes the index out is refused, not turned into NaN', () => {
  for (const bad of [{ ...RATES, cpi: -1 }, { ...RATES, pblci: -1.5 }, { ...RATES, mtawe: Number.NaN }]) {
    assert.throws(() => defaultAgePensionSeries(bad, '2030-12-31'), RangeError);
  }
});

test('the generated series reaches its own last day and no further — the refusal is the stated-series one', () => {
  const series = defaultAgePensionSeries(RATES, '2030-06-30');
  assert.doesNotThrow(() => agePensionPeriodsThrough(series, '2030-06-30'));
  assert.throws(() => agePensionPeriodsThrough(series, '2030-07-01'), MissingPensionIndexationError);
});

// --- §2 The walk ---------------------------------------------------------------------------------

const person = (name, dateOfBirth) => ({
  name,
  dateOfBirth,
  superInterests: [],
  parcels: [],
  employmentIncomePerFortnight: toCents(0),
  workBonusBalance: toCents(0),
});

/** A single homeowner, 71, holding nothing: no means test bites, so the payment is the maximum. */
const VAL = { persons: [person('Val', '1955-04-17')], homeStatus: 'occupied' };
const SETTINGS = {
  asAtDate: '2026-09-16',
  planningHorizonAge: 72, // the walk ends 2027-04, one month past the published window
  economicSeries: { cpi: 0.02, pblci: 0.03, awote: 0.035, mtawe: 0.04 },
  deemingRates: { lower: 0.0175, upper: 0.0375 },
  nominalReturn: 0.065,
};

/** A STATED series of unit movements with the MTAWE floor at nil: the 2026 sets, run through §4.7. */
const UNIT = {
  rateIndexations: [{ effective: '2027-03-20', cpi: 1, pblci: 1, annualisedMtawe: 0 }],
  meansTestIndexations: [],
};

const pensionIn = (months, month) =>
  months.find((each) => each.month === month).lines.filter((line) => line.description === 'Age Pension');

test('WITH NO SERIES, April 2027 is paid on the 20 March 2027 set generated from THIS plan’s rates', () => {
  // HAND-WORKED, one half-year on from the published 20 September 2026 set:
  //   combined basic   $1,711.80 × √1.03 (PBLCI beats √1.02 CPI)            = $1,737.29
  //   MTAWE floor      41.76% × 52 × $1,832.80 × √1.04 ÷ 26                  = $1,561.07 — below it
  //   single basic     0.6633 × that                                        = $1,152.34
  //   Supplement       $88.20 × √1.02 (CPI only)                             =    $89.08
  //   Energy           $14.10, never indexed
  //   $1,255.52 a fortnight × 26 ÷ 12                                        = $2,720.29
  // It was $2,681.68 on the carried set. Feeding MTAWE's 4% to the CPI limb would pay $2,734.27, and
  // a whole year's factor per half-year $2,759.38 — so each is a different figure from this one.
  const months = project(SETTINGS, VAL, []);
  assert.equal(months.at(-1).month, '2027-04');
  assert.deepEqual(pensionIn(months, '2027-04').map((line) => line.amount), [272_029]);
  // March is still the published 20 September 2026 set, untouched.
  assert.deepEqual(pensionIn(months, '2027-03').map((line) => line.amount), [268_168]);
});

test('A STATED SERIES STILL WINS — `??`, never replaced by the generated one', () => {
  // The same plan stating `UNIT`: §4.7 run at unit movements reproduces the carried set up to the
  // 0.6633 ratio's rounding (register O10) — single basic 0.6633 × $1,711.80 = $1,135.44 against the
  // published $1,135.40 — so $1,237.74 a fortnight, × 26 ÷ 12 = $2,681.77. Not the generated $2,720.29.
  const stated = project({ ...SETTINGS, economicSeries: { ...SETTINGS.economicSeries, agePension: UNIT } }, VAL, []);
  assert.deepEqual(pensionIn(stated, '2027-04').map((line) => line.amount), [268_177]);
});

test('the generated series is keyed on MTAWE too — two plans differing only in wage growth never share one', () => {
  // The generator is cached per walk inputs. A key that dropped `mtawe` would hand the second walk
  // the first walk's series. At 40% wage growth the floor BINDS on 20 March 2027:
  //   41.76% × 52 × $1,832.80 × √1.40 ÷ 26 = $1,811.21 combined, above the $1,737.29 PBLCI figure,
  // so April is paid MORE than the 4% walk's $2,720.29. Run the 4% walk first so its series is cached.
  const low = project(SETTINGS, VAL, []);
  const high = project({ ...SETTINGS, economicSeries: { ...SETTINGS.economicSeries, mtawe: 0.4 } }, VAL, []);
  const [lowApril] = pensionIn(low, '2027-04').map((line) => line.amount);
  const [highApril] = pensionIn(high, '2027-04').map((line) => line.amount);
  assert.equal(lowApril, 272_029);
  assert.ok(highApril > lowApril, `expected the binding wage floor to pay more than ${lowApril}, got ${highApril}`);
});

test('a generated month names the GENERATED series in its provenance, and a stated one the caller’s', () => {
  const caveatsOf = (months) => pensionIn(months, '2027-04')[0].provenance.caveats;
  const generated = caveatsOf(project(SETTINGS, VAL, []));
  assert.equal(generated.filter((c) => c.includes('not stated — generated from')).length, 1);
  assert.equal(generated.some((c) => c.includes('caller-stated')), false, 'a generated series is labelled as the caller’s own');
  const stated = caveatsOf(project({ ...SETTINGS, economicSeries: { ...SETTINGS.economicSeries, agePension: UNIT } }, VAL, []));
  assert.equal(stated.filter((c) => c.includes('caller-stated')).length, 1);
  assert.equal(stated.some((c) => c.includes('generated from')), false);
  // Both are forecasts and say so at the same rank; what differs is who made the claim.
  assert.equal(pensionIn(project(SETTINGS, VAL, []), '2027-04')[0].provenance.confidence, 'unverified');
});

test('no month of a walk with no series is computed on carried parameters any more', () => {
  // A spending level larger than the pension keeps her Offset at nil, so neither means test ever
  // bites and every month is paid the maximum — which is what makes "it rises" a claim about rates.
  const spend = { id: 'sc', date: '2026-09-01', owner: 'household', type: 'SPEND_CHANGE', params: { annualSpend: toCents(100_000) }, enabled: true, createdAt: '2026-09-01' };
  const months = project({ ...SETTINGS, planningHorizonAge: 90 }, VAL, [spend]);
  assert.equal(months.at(-1).month, '2045-04');
  assert.equal(months.flatMap((m) => m.notes).filter((n) => n.subject === 'standing parameters').length, 0);
  assert.ok(months.flatMap((m) => pensionIn(months, m.month)).every((line) => !line.provenance.determination.some((d) => d.includes('carried forward'))));
  // And it RISES: every 20 March and 20 September moves the maximum, and nothing here tapers it.
  const paid = months.map((m) => pensionIn(months, m.month)[0]?.amount ?? 0);
  assert.ok(paid.every((amount, i) => i === 0 || amount >= paid[i - 1]));
  assert.ok(paid.at(-1) > paid[7] * 1.5, 'eighteen years of indexation moved the payment by less than half');
});
