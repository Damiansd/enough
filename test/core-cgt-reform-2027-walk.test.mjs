// LR-1 slice 2 — THE CGT REFORM FROM 1 JULY 2027, WIRED INTO THE WALK AND THE DOOR.
//
// Every tax figure below is worked by hand from the statute (register §2.10) and the FY2027-28
// ladder (0% to $18,200, 14% to $45,000, 30% to $135,000, and the 2% Medicare levy), never read off
// the engine. Each walk puts the whole gain in the 30% band of a Person with no other income, so
// LITO is nil (it tapers out at $66,667) and the levy is the full 2%. The only figures read off a
// walk are market values: `Month.closingNonSuperPortfolio` is the month's portfolio after its sales
// and before its growth, so July 2027's figure IS the opening of July 2027, the value the stamp takes.
//
// Each test names the gate mutation (M13–M17, and MD for the reinvested distribution) it catches.
import test from 'node:test';
import assert from 'node:assert/strict';

import { toCents } from '../dist/core/money.js';
import {
  CAPITAL_GAINS_TAX_LINE,
  CGT_INDEXATION_FORECAST_DETERMINATION,
  CGT_MINIMUM_TAX_DETERMINATION,
  disposalOfAmount,
  netCapitalGainFromJuly2027,
  parcelsAfterDistribution,
  parcelsGrownForOneMonth,
  project,
  realisationFromJuly2027,
} from '../dist/core/projection.js';
import { PlanFileHouseholdError, parsePlan } from '../dist/core/parsePlan.js';
import { DEMO_PLAN } from '../dist/app/demoHousehold.js';

const SETTINGS = {
  asAtDate: '2027-06-01',
  planningHorizonAge: 56,
  economicSeries: { cpi: 0.025, pblci: 0.025, awote: 0, mtawe: 0.035 },
  deemingRates: { lower: 0.0175, upper: 0.0375 },
  nominalReturn: 0.06,
  cashInterestRate: 0,
};
const person = (name, dateOfBirth, parcels = []) => ({
  name,
  dateOfBirth,
  superInterests: [{ phase: 'accumulation', balance: toCents(0) }],
  parcels,
  employmentIncomePerFortnight: toCents(0),
  workBonusBalance: toCents(0),
});
const entry = (id, type, date, owner, params) => ({ id, date, owner, type, params, enabled: true, createdAt: '2026-06-01' });
const sellAll = (date, owner = 'personA') => entry('sell', 'NON_SUPER_INVESTMENT', date, owner, { direction: 'sell', amount: toCents(10_000_000) });
const at = (months, month) => months.find((m) => m.month === month);
const gainTax = (months) =>
  months.flatMap((m) => m.lines.filter((l) => l.description.startsWith(CAPITAL_GAINS_TAX_LINE)).map((l) => [m.month, l.amount]));
const saleProceeds = (months, month) =>
  at(months, month).lines.filter((l) => l.description.startsWith('Non-Super Portfolio sale')).reduce((t, l) => t + l.amount, 0);

/** Half, rounded up: s 115-25 halves the gain and `discountedCapitalGain` keeps the odd cent. */
const discounted = (gain) => gain - Math.floor(gain / 2);
/** The FY2027-28 ladder plus the 2% levy, for a net capital gain between $66,667 and $135,000. */
const taxInThe30Band = (net) => {
  assert.ok(net > 66_667_00 && net < 135_000_00, `${net} is outside the band this hand model covers`);
  return Math.round(26_800_00 * 0.14 + (net - 45_000_00) * 0.3 + net * 0.02);
};

// --- M13, M14: the stamp is the opening of July 2027, taken once --------------------------------

// Acquired 2020 for $40,000, worth $200,000 on 1 June 2027, growing at 6%; all of it sold on
// 15 August 2028. Deferred: stamp − $40,000, halved. Later part: the proceeds less the stamp indexed
// from the September 2027 quarter to the September 2028 quarter, four quarters at 2.5% a year: 1.025.
test('M13, M14: the stamp is the value at the OPENING of July 2027, and a second July does not re-take it', () => {
  const months = project(SETTINGS, { persons: [person('Val', '1976-05-10', [{ acquired: '2020-01-10', costBase: toCents(40_000), marketValue: toCents(200_000) }])], homeStatus: 'occupied' }, [sellAll('2028-08-15')]);
  const stamp = at(months, '2027-07').closingNonSuperPortfolio;
  const proceeds = saleProceeds(months, '2028-08');
  // The stamp is June's value grown once, and neither the stated figure nor July's close.
  assert.equal(at(months, '2027-06').closingNonSuperPortfolio, toCents(200_000));
  assert.ok(stamp > toCents(200_000) && stamp < at(months, '2027-08').closingNonSuperPortfolio);
  const net = discounted(stamp - toCents(40_000)) + (proceeds - Math.floor((stamp * 1_025) / 1_000));
  assert.deepEqual(gainTax(months), [['2028-08', taxInThe30Band(net)]]);
  assert.equal(taxInThe30Band(net), 1_859_047);
  // The line says its indexation is a forecast; a line from before 1 July 2027 does not.
  const line = at(months, '2028-08').lines.find((l) => l.description.startsWith(CAPITAL_GAINS_TAX_LINE));
  assert.ok(line.provenance.determination.includes(CGT_INDEXATION_FORECAST_DETERMINATION));
  // The whole gain sits in the 30% band, so Div 119 adds nothing and the line does not claim it did.
  assert.ok(!line.provenance.determination.includes(CGT_MINIMUM_TAX_DETERMINATION));
  assert.match(CGT_INDEXATION_FORECAST_DETERMINATION, /forecast CPI/);
  const early = project(SETTINGS, { persons: [person('Val', '1976-05-10', [{ acquired: '2020-01-10', costBase: toCents(40_000), marketValue: toCents(200_000) }])], homeStatus: 'occupied' }, [sellAll('2027-06-15')]);
  const earlyLine = at(early, '2027-06').lines.find((l) => l.description.startsWith(CAPITAL_GAINS_TAX_LINE));
  assert.ok(earlyLine !== undefined && !earlyLine.provenance.determination.includes(CGT_INDEXATION_FORECAST_DETERMINATION));
});

// The same parcel, but the plan starts on 15 July 2027 and STATES a value just before 1 July 2027
// of $150,000, below the $200,000 it is worth: the walk never passed the day, so it must take the
// stated figure and not re-stamp July's opening.
test('M14 (door side): a plan starting after 1 July 2027 keeps its STATED value; the walk does not overwrite it', () => {
  const settings = { ...SETTINGS, asAtDate: '2027-07-15' };
  const months = project(settings, { persons: [person('Val', '1976-05-10', [{ acquired: '2020-01-10', costBase: toCents(40_000), marketValue: toCents(200_000), valueJustBefore1July2027: toCents(150_000) }])], homeStatus: 'occupied' }, [sellAll('2028-08-15')]);
  const proceeds = saleProceeds(months, '2028-08');
  const net = discounted(toCents(110_000)) + (proceeds - toCents(153_750));
  assert.deepEqual(gainTax(months), [['2028-08', taxInThe30Band(net)]]);
});

// --- M15: the door --------------------------------------------------------------------------------

const planFile = (asAtDate, parcels) => {
  const file = JSON.parse(JSON.stringify(DEMO_PLAN));
  file.settings.asAtDate = asAtDate;
  file.household.persons[0].parcels = parcels;
  return file;
};
const DANA = { acquired: '2014-03-11', costBase: toCents(38_000), marketValue: toCents(96_500) };

test('M15: the door has ONE source for the value — the walk before 1 July 2027, the file after it', () => {
  // A plan that walks through 1 July 2027 (on or before it) may not state it: two sources, two answers.
  for (const asAtDate of ['2026-09-01', '2027-07-01']) {
    assert.throws(
      () => parsePlan(planFile(asAtDate, [{ ...DANA, valueJustBefore1July2027: toCents(100_000) }])),
      (error) => error instanceof PlanFileHouseholdError && /parcels\[0\]\.valueJustBefore1July2027 is stated, and the plan starts on/.test(error.message),
    );
  }
  assert.deepEqual(parsePlan(planFile('2027-07-01', [DANA])).household.persons[0].parcels, [DANA]);
  // A plan that starts after it must state it on every parcel acquired before it.
  assert.throws(
    () => parsePlan(planFile('2027-09-01', [DANA])),
    (error) => error instanceof PlanFileHouseholdError && /valueJustBefore1July2027 is missing\. The plan starts on 2027-09-01/.test(error.message),
  );
  const stated = { ...DANA, valueJustBefore1July2027: toCents(100_000) };
  assert.deepEqual(parsePlan(planFile('2027-09-01', [stated])).household.persons[0].parcels, [stated]);
  // …and on no parcel acquired on or after it, which was never deemed sold.
  assert.throws(
    () => parsePlan(planFile('2027-09-01', [{ acquired: '2027-07-01', costBase: toCents(5_000), marketValue: toCents(5_000), valueJustBefore1July2027: toCents(5_000) }])),
    (error) => error instanceof PlanFileHouseholdError && /acquired on 2027-07-01, on or after 1 July 2027/.test(error.message),
  );
  assert.deepEqual(
    parsePlan(planFile('2027-09-01', [{ acquired: '2027-07-01', costBase: toCents(5_000), marketValue: toCents(5_000) }])).household.persons[0].parcels.length,
    1,
  );
  assert.throws(() => parsePlan(planFile('2027-09-01', [{ ...DANA, valueJustBefore1July2027: -1 }])), /a market value cannot be negative/);
});

// --- M16, M17, R1: a death from 1 July 2027 -------------------------------------------------------

// Val holds a parcel acquired in 1984 for $5,000, worth $600,000 on 1 June 2027, growing at 12%. She
// dies on 10 March 2028 and Ken sells all of it on 15 August 2029. It is pre-CGT, so its deferred part
// is nil (s 112-175(2)); from 1 July 2027 it is NOT pre-CGT any more, so it passes to Ken unchanged,
// stamp and all, and is not re-acquired at the death. The later part is indexed from the September
// 2027 quarter to the September 2029 quarter: 1.025² = 1.050625, 1.051 to three places.
const deathWalk = (acquired, died) =>
  project(
    { ...SETTINGS, nominalReturn: 0.12 },
    { persons: [person('Val', '1976-05-10', [{ acquired, costBase: toCents(5_000), marketValue: toCents(600_000) }]), person('Ken', '1978-02-02')], homeStatus: 'occupied' },
    [entry('d', 'DEATH', died, 'personA', {}), sellAll('2029-08-15', 'personB')],
  );

// The whole gain is the later part, so all of it is Ken's minimum tax capital gain (s 119-5), and
// Ken has no other income: Div 119 (slice 3) tops the 0% and 14% slices up to 30%, $18,200 × 30% +
// $26,800 × 16% = $9,748, before the levy, which Div 119 does not touch.
test('M16, M17: a pre-CGT parcel inherited after 1 July 2027 keeps its stamp and its day, and is taxed from the stamp', () => {
  const months = deathWalk('1984-05-01', '2028-03-10');
  const stamp = at(months, '2027-07').closingNonSuperPortfolio;
  const net = saleProceeds(months, '2029-08') - Math.floor((stamp * 1_051) / 1_000);
  assert.deepEqual(gainTax(months), [['2029-08', taxInThe30Band(net) + toCents(9_748)]]);
  assert.equal(taxInThe30Band(net), 3_198_233);
  assert.equal(3_198_233 + 974_800, 4_173_033);
});

// R1 (user, 2026-09-29, option b): a parcel stamped at 30 June 2027 passes to the survivor with its
// stamp, its deferred gain and its later cost base, and the deferred gain is taxed when the survivor
// sells. The death itself charges nothing. Val's parcel: acquired 2020 for $40,000, $200,000 on 1 June
// 2027; she dies 10 March 2028 and Ken sells it all on 15 August 2029. Deferred: stamp − $40,000,
// halved; later part: proceeds − stamp × 1.051, as in M16. All of it in Ken's 30% band, with the
// deferred half above $45,000, so Div 119 adds nothing.
const inheritedWalk = (parcel, died, sold) =>
  project(
    { ...SETTINGS, nominalReturn: 0.12 },
    { persons: [person('Val', '1976-05-10', [parcel]), person('Ken', '1978-02-02')], homeStatus: 'occupied' },
    [entry('d', 'DEATH', died, 'personA', {}), sellAll(sold, 'personB')],
  );

test('R1: the survivor inherits the stamp and the deferred gain, and pays tax on it when they sell', () => {
  const months = inheritedWalk({ acquired: '2020-01-10', costBase: toCents(40_000), marketValue: toCents(200_000) }, '2028-03-10', '2029-08-15');
  const stamp = at(months, '2027-07').closingNonSuperPortfolio;
  assert.equal(stamp, 20_189_775);
  const net = discounted(stamp - toCents(40_000)) + (saleProceeds(months, '2029-08') - Math.floor((stamp * 1_051) / 1_000));
  assert.deepEqual(gainTax(months), [['2029-08', taxInThe30Band(net)]]);
  assert.equal(taxInThe30Band(net), 3_006_572);
  // Had the deferred gain gone with the death, only the later part would be taxed.
  assert.ok(net - discounted(stamp - toCents(40_000)) < toCents(45_000));
});

// The discount clock is the ORIGINAL acquisition (s 115-30(1) item 4: "when the deceased acquired the
// asset"), not the death. Acquired 10 January 2027 for $200,000, $300,000 on 1 June 2027; Val dies
// 10 September 2027 and Ken sells on 15 March 2028 — 14 months after Val bought it, 6 after the death.
// The deferred gain is halved and the later part indexed, September 2027 to March 2028: 1.025^½, 1.012.
test('R1: the 50% discount on the inherited deferred gain runs from the original purchase, not the death', () => {
  const months = inheritedWalk({ acquired: '2027-01-10', costBase: toCents(200_000), marketValue: toCents(300_000) }, '2027-09-10', '2028-03-15');
  const stamp = at(months, '2027-07').closingNonSuperPortfolio;
  const net = discounted(stamp - toCents(200_000)) + (saleProceeds(months, '2028-03') - Math.floor((stamp * 1_012) / 1_000));
  assert.deepEqual(gainTax(months), [['2028-03', taxInThe30Band(net)]]);
  assert.equal(taxInThe30Band(net), 1_315_007);
  // On a clock restarted at the death: no discount and no indexation: $55,057.46 more net gain, about $17,618 more tax.
  const restarted = (stamp - toCents(200_000)) + (saleProceeds(months, '2028-03') - stamp);
  assert.ok(taxInThe30Band(restarted) - taxInThe30Band(net) > toCents(15_000));
  // The control: the same death a day before 1 July 2027 walks the same way (stamped in Ken's hands).
  assert.equal(gainTax(inheritedWalk({ acquired: '2020-01-10', costBase: toCents(40_000), marketValue: toCents(200_000) }, '2027-06-30', '2029-08-15')).length, 1);
});

// --- MD: a distribution reinvested after the stamp ----------------------------------------------

// A stamped parcel: acquired 2020 for $40,000, $60,000 just before 1 July 2027, worth $80,000, and
// $1,000 reinvested after the stamp. Sold whole for $80,000 on 15 July 2028: deferred $60,000 −
// $40,000 = $20,000, halved to $10,000; later part $80,000 − ($60,000 × 1.025 + $1,000) = $17,500;
// net $27,500. Had the $1,000 gone into the cost base it would have cut the half-taxed deferred gain
// instead: $19,000 → $9,500, plus $18,500 = $28,000, $500 MORE.
test('MD: a distribution reinvested after the stamp is cost base of the LATER part, not the deferred one', () => {
  const stamped = { acquired: '2020-01-10', costBase: toCents(40_000), marketValue: toCents(80_000), valueJustBefore1July2027: toCents(60_000) };
  const [reinvested] = parcelsAfterDistribution([stamped], toCents(1_000));
  assert.deepEqual(reinvested, { ...stamped, reinvestedFromJuly2027: toCents(1_000) });
  const disposal = disposalOfAmount(0, toCents(80_000), '2028-07-15', [[reinvested]], 'oldest-first');
  const reformed = disposal.realisations.map((r) => realisationFromJuly2027(r, '2028-07-15', 0.025));
  assert.equal(reformed[0].deferredGain, toCents(20_000));
  assert.equal(reformed[0].postGain, toCents(17_500));
  assert.deepEqual(netCapitalGainFromJuly2027(reformed), { netGain: toCents(27_500), minimumTaxCapitalGain: toCents(17_500) });

  // It is not indexed: a loss is measured from $61,000, and $61,000 to $62,500 is nil.
  const [between] = disposalOfAmount(0, toCents(62_000), '2028-07-15', [[{ ...reinvested, marketValue: toCents(62_000) }]], 'oldest-first').realisations;
  assert.equal(realisationFromJuly2027(between, '2028-07-15', 0.025).postGain, toCents(0));

  // A partial sale apportions it as it apportions the cost base; growth and a second distribution carry it.
  const half = disposalOfAmount(0, toCents(40_000), '2028-07-15', [[reinvested]], 'oldest-first');
  assert.equal(half.realisations[0].reinvestedFromJuly2027, toCents(500));
  assert.equal(half.parcelsAfter[0][0].reinvestedFromJuly2027, toCents(500));
  assert.equal(parcelsGrownForOneMonth([reinvested], 0.06)[0].reinvestedFromJuly2027, toCents(1_000));
  assert.equal(parcelsAfterDistribution([reinvested], toCents(500))[0].reinvestedFromJuly2027, toCents(1_500));

  // A parcel acquired from 1 July 2027 reinvests the same way; one held before it and not yet
  // stamped (a June 2027 distribution) still raises its cost base, which the deferred gain is.
  const [late] = parcelsAfterDistribution([{ acquired: '2027-07-01', costBase: toCents(5_000), marketValue: toCents(5_000) }], toCents(100));
  assert.deepEqual([late.costBase, late.reinvestedFromJuly2027], [toCents(5_000), toCents(100)]);
  const [early] = parcelsAfterDistribution([{ acquired: '2020-01-10', costBase: toCents(40_000), marketValue: toCents(80_000) }], toCents(1_000));
  assert.deepEqual([early.costBase, Object.hasOwn(early, 'reinvestedFromJuly2027')], [toCents(41_000), false]);
});

// The same routing on a walk: $200,000 at 6%, a 2% distribution each June. June 2027's ($4,000, on
// the June opening) is before the stamp and raises the cost base to $44,000; June 2028's is after
// it and joins the later part. All of it sold on 15 August 2028.
test('MD on the walk: June 2027 lowers the deferred gain, June 2028 the later one', () => {
  const months = project(
    { ...SETTINGS, investmentPayoutRate: 0.02 },
    { persons: [person('Val', '1976-05-10', [{ acquired: '2020-01-10', costBase: toCents(40_000), marketValue: toCents(200_000) }])], homeStatus: 'occupied' },
    [sellAll('2028-08-15')],
  );
  const stamp = at(months, '2027-07').closingNonSuperPortfolio;
  const june2028 = Math.floor(at(months, '2028-06').closingNonSuperPortfolio * 0.02);
  const later = saleProceeds(months, '2028-08') - Math.floor((stamp * 1_025) / 1_000) - june2028;
  assert.ok(later > 0, 'the vacuity guard: a later part of nil would not see where June 2028 went');
  const net = discounted(stamp - toCents(44_000)) + later;
  assert.deepEqual(gainTax(months), [['2028-08', taxInThe30Band(net)]]);
});
