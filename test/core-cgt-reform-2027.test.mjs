// LR-1 slice 1 — THE CGT REFORM FROM 1 JULY 2027 (Act No. 49 of 2026 Sch 1), AS ARITHMETIC ONLY.
//
// Every figure below is worked by hand from the statute (register §2.10), never read off the engine.
// Slice 2 wires it into the walk (`test/core-cgt-reform-2027-walk.test.mjs`). A pre-CGT parcel
// disposed of before 1 July 2027 is disregarded (s 104-10(5)(a)), and the last section of this file
// pins that on a walk.
//
// Each test names the gate mutation (M1–M12, and MP for the pre-CGT fix) it is there to catch.
import test from 'node:test';
import assert from 'node:assert/strict';

import { toCents } from '../dist/core/money.js';
import {
  CAPITAL_GAINS_TAX_LINE,
  MissingValueJustBefore1July2027Error,
  cgtIndexationFactor,
  disposalOfAmount,
  netCapitalGain,
  netCapitalGainFromJuly2027,
  parcelsAfterDistribution,
  parcelsGrownForOneMonth,
  project,
  realisationFromJuly2027,
} from '../dist/core/projection.js';
import { assumptionAt } from '../dist/data/assumptions/index.js';

const CPI = 0.025;

const parcel = (acquired, costBase, marketValue, stamp) => ({
  acquired,
  costBase: toCents(costBase),
  marketValue: toCents(marketValue),
  ...(stamp === undefined ? {} : { valueJustBefore1July2027: toCents(stamp) }),
});

/** Sell `amount` dollars of one Person's parcels, oldest first, and split each realisation. */
const sale = (parcels, amount, disposedOn, cpi = CPI) => {
  const disposal = disposalOfAmount(0, toCents(amount), disposedOn, [parcels], 'oldest-first');
  return {
    disposal,
    reformed: disposal.realisations.map((realisation) => realisationFromJuly2027(realisation, disposedOn, cpi)),
  };
};

// --- The records --------------------------------------------------------------------------------

test('the three figures are records, each with its section and an ATO legal database URL', () => {
  const start = assumptionAt('tax.cgt.reformStart');
  assert.equal(start.kind, 'config');
  assert.equal(start.effective, '2027-07-01');
  assert.equal(start.value, '2027-07-01');
  assert.match(start.source, /s 112-155/);
  assert.match(start.source, /ato\.gov\.au\/law\/view\/document\?DocID=PAC%2F19970038%2F112-155/);

  const preCgt = assumptionAt('tax.cgt.preCgtCutoff');
  assert.equal(preCgt.kind, 'constant');
  assert.equal(preCgt.value, '1985-09-20');
  assert.match(preCgt.source, /s 104-10\(5\)\(a\)/);
  assert.match(preCgt.source, /PAC%2F19970038%2F104-10/);

  const places = assumptionAt('tax.cgt.indexationFactorDecimalPlaces');
  assert.equal(places.kind, 'constant');
  assert.equal(places.value, 3);
  assert.match(places.source, /s 960-275\(5\)/);
  assert.match(places.source, /PAC%2F19970038%2F960-275/);
});

// --- The split (M1, M2, M12) --------------------------------------------------------------------

// Acquired 2020 for $40,000, worth $60,000 just before 1 July 2027, sold whole for $70,000 on
// 15 July 2028. Indexation: September 2027 quarter to September 2028 quarter, 4 quarters at 2.5%,
// factor 1.025 exactly.
//   deferred   $60,000 − $40,000 = $20,000, discounted (held > 12 months)   → $10,000
//   later      $70,000 − $60,000 × 1.025 = $70,000 − $61,500             → $8,500, never discounted
//   net        $18,500;  minimum tax capital gain $8,500 (the deferred gain is excluded)
test('M1/M2/M12: the deferred part is discounted and unindexed, the later part indexed and undiscounted', () => {
  const { reformed } = sale([parcel('2020-01-10', 40_000, 70_000, 60_000)], 70_000, '2028-07-15');
  assert.equal(reformed.length, 1);
  const [split] = reformed;
  assert.equal(split.deferredGain, toCents(20_000));
  assert.equal(split.deferredDiscountApplies, true);
  assert.equal(split.indexationFactor, 1.025);
  assert.equal(split.indexedCostBase, toCents(61_500));
  assert.equal(split.postGain, toCents(8_500));
  assert.deepEqual(netCapitalGainFromJuly2027(reformed), {
    netGain: toCents(18_500),
    minimumTaxCapitalGain: toCents(8_500),
  });
});

// --- The factor (M5, M6) ------------------------------------------------------------------------

test('M5: the factor is 3 decimal places, a fourth decimal of 5 or more rounding UP (s 960-275(5))', () => {
  // 3 quarters at 2.5%: 1.025^0.75 = 1.01869… → 1.019 (up). 2 quarters: 1.01242… → 1.012 (down).
  assert.equal(cgtIndexationFactor(CPI, '2027-07-01', '2028-04-20'), 1.019);
  assert.equal(cgtIndexationFactor(CPI, '2027-07-01', '2028-01-20'), 1.012);
  // 8 quarters: 1.050625 → 1.051. No floor at 1: 8 quarters at −1% is 0.9801 → 0.980.
  assert.equal(cgtIndexationFactor(CPI, '2027-07-01', '2029-07-10'), 1.051);
  assert.equal(cgtIndexationFactor(-0.01, '2027-07-01', '2029-07-10'), 0.98);

  // And as money: $60,000 × 1.019 = $61,140, so $65,000 of proceeds is a $3,860 later gain. Unrounded
  // it would be $3,878.48; rounded down (1.018) $3,920.
  const { reformed } = sale([parcel('2020-01-10', 40_000, 65_000, 60_000)], 65_000, '2028-04-20');
  assert.equal(reformed[0].indexedCostBase, toCents(61_140));
  assert.equal(reformed[0].postGain, toCents(3_860));
});

test('M6: the factor counts QUARTERS, not months', () => {
  // A sale in July–September 2027 is in the reacquisition's own quarter: factor 1.000 exactly.
  // Counting months it would be 1.025^(2/12) → 1.004.
  assert.equal(cgtIndexationFactor(CPI, '2027-07-01', '2027-09-30'), 1);
  // 15 August 2028 is in the September 2028 quarter, 4 quarters on: 1.025. By months, 13: 1.027.
  assert.equal(cgtIndexationFactor(CPI, '2027-07-01', '2028-08-15'), 1.025);
  // A parcel bought after the reform indexes from ITS quarter: 30 September 2027 → 2 October 2028
  // is September quarter to December quarter, 5 quarters: 1.025^1.25 = 1.03135… → 1.031.
  const { reformed } = sale([parcel('2027-09-30', 10_000, 12_000)], 12_000, '2028-10-02');
  assert.equal(reformed[0].indexationFactor, 1.031);
  assert.equal(reformed[0].indexedCostBase, toCents(10_310));
  assert.equal(reformed[0].postGain, toCents(1_690));
  assert.equal(reformed[0].deferredGain, toCents(0));

  const { reformed: september } = sale([parcel('2020-01-10', 40_000, 61_000, 60_000)], 61_000, '2027-09-30');
  assert.equal(september[0].indexedCostBase, toCents(60_000));
  assert.equal(september[0].postGain, toCents(1_000));
});

// --- The 12-month rules (M3, M4) ----------------------------------------------------------------

// Acquired 1 March 2027 for $50,000, worth $50,000 just before 1 July 2027, sold for $55,000 on
// 1 May 2028. More than 12 months from the ORIGINAL acquisition (s 114-10(9)), so indexed from the
// September 2027 quarter to the June 2028 quarter: 3 quarters, 1.019 → $50,950 → $4,050. Counting
// from the deemed reacquisition it is under 12 months and would be the whole $5,000.
test('M3: the indexation 12-month rule reads the ORIGINAL acquisition day, not 1 July 2027', () => {
  const { reformed } = sale([parcel('2027-03-01', 50_000, 55_000, 50_000)], 55_000, '2028-05-01');
  assert.equal(reformed[0].indexationFactor, 1.019);
  assert.equal(reformed[0].postGain, toCents(4_050));
  assert.deepEqual(netCapitalGainFromJuly2027(reformed), {
    netGain: toCents(4_050),
    minimumTaxCapitalGain: toCents(4_050),
  });
});

// Acquired 1 December 2026 for $30,000, worth $34,000 just before 1 July 2027 — seven months held
// at the deemed sale. Sold for $34,000 on 15 January 2028, more than 12 months after acquisition, so
// the deferred $4,000 IS discounted (s 112-160(3)(c)): $2,000. The later part is nil (proceeds equal
// the value, and fall short of the indexed $34,408).
test('M4: the deferred discount is tested on the REALISATION day, not 30 June 2027', () => {
  const { reformed } = sale([parcel('2026-12-01', 30_000, 34_000, 34_000)], 34_000, '2028-01-15');
  assert.equal(reformed[0].deferredGain, toCents(4_000));
  assert.equal(reformed[0].deferredDiscountApplies, true);
  assert.equal(reformed[0].postGain, toCents(0));
  assert.deepEqual(netCapitalGainFromJuly2027(reformed), { netGain: toCents(2_000), minimumTaxCapitalGain: toCents(0) });
});

test('a gain held 12 months or less is not indexed, not discounted, and is still a later gain', () => {
  const { reformed } = sale([parcel('2027-08-01', 10_000, 12_000)], 12_000, '2028-03-01');
  assert.equal(reformed[0].indexationFactor, 1);
  assert.equal(reformed[0].postGain, toCents(2_000));
  assert.deepEqual(netCapitalGainFromJuly2027(reformed), { netGain: toCents(2_000), minimumTaxCapitalGain: toCents(2_000) });
});

// --- Losses (M7, M8) ----------------------------------------------------------------------------

// Acquired 2020 for $40,000, worth $60,000 just before 1 July 2027, sold for $58,000 on
// 10 July 2029. The later part is a $2,000 LOSS against the unindexed $60,000 — never against the
// indexed $63,060, which would make it $5,060. The loss reduces the deferred $20,000 before the
// discount: ($20,000 − $2,000) ÷ 2 = $9,000.
test('M7: a loss is measured against the UNINDEXED value (s 114-5(1) note 2)', () => {
  const { reformed } = sale([parcel('2020-01-10', 40_000, 58_000, 60_000)], 58_000, '2029-07-10');
  assert.equal(reformed[0].indexedCostBase, toCents(63_060));
  assert.equal(reformed[0].postGain, toCents(-2_000));
  assert.deepEqual(netCapitalGainFromJuly2027(reformed), { netGain: toCents(9_000), minimumTaxCapitalGain: toCents(0) });

  // Between the value and the indexed value: neither a gain nor a loss.
  const { reformed: between } = sale([parcel('2020-01-10', 40_000, 61_000, 60_000)], 61_000, '2029-07-10');
  assert.equal(between[0].postGain, toCents(0));
  assert.deepEqual(netCapitalGainFromJuly2027(between), { netGain: toCents(10_000), minimumTaxCapitalGain: toCents(0) });
});

// Parcel A: acquired 2020 for $40,000, $50,000 just before 1 July 2027, $57,250 at sale — deferred
// $10,000 (discountable) and later $57,250 − $51,250 = $6,000. Parcel B: bought 1 August 2027 for
// $20,000, sold at $16,000 inside 12 months — a $4,000 later loss. Both sold 15 July 2028.
//   law (s 102-5(1) step 1): loss against the deferred gain first → ($10,000 − $4,000) ÷ 2 + $6,000
//                            = $9,000; minimum tax capital gain $6,000
//   against the later gain first it would be $5,000 + $2,000 = $7,000, and $2,000.
test('M8: step 1 reduces DEFERRED gains before non-residential ones, whatever the within-category choice', () => {
  const { reformed } = sale(
    [parcel('2020-01-10', 40_000, 57_250, 50_000), parcel('2027-08-01', 20_000, 16_000)],
    73_250,
    '2028-07-15',
  );
  assert.deepEqual(reformed.map((r) => [r.deferredGain, r.postGain]), [
    [toCents(10_000), toCents(6_000)],
    [toCents(0), toCents(-4_000)],
  ]);
  const expected = { netGain: toCents(9_000), minimumTaxCapitalGain: toCents(6_000) };
  assert.deepEqual(netCapitalGainFromJuly2027(reformed), expected);
  assert.deepEqual(netCapitalGainFromJuly2027(reformed, 'undiscountable-gains-first'), expected);
});

// --- The stamp travels with the parcel (M9, M10) ------------------------------------------------

// A quarter of a parcel worth $80,000 (cost $40,000, $60,000 just before 1 July 2027) sold for
// $20,000 on 15 July 2028: $10,000 of cost base and $15,000 of the value go with it.
//   deferred $5,000 → $2,500;  later $20,000 − $15,375 = $4,625;  net $7,125.
test('M9: a partial sale apportions the value by market value, as it apportions the cost base', () => {
  const { disposal, reformed } = sale([parcel('2020-01-10', 40_000, 80_000, 60_000)], 20_000, '2028-07-15');
  assert.equal(disposal.realisations[0].valueJustBefore1July2027, toCents(15_000));
  assert.deepEqual(disposal.parcelsAfter[0], [parcel('2020-01-10', 30_000, 60_000, 45_000)]);
  assert.deepEqual(netCapitalGainFromJuly2027(reformed), { netGain: toCents(7_125), minimumTaxCapitalGain: toCents(4_625) });

  // The disposed share is floored and the cent stays with the retained part: a third of 10,001 cents.
  const odd = disposalOfAmount(0, 10_000, '2028-07-15', [[{ acquired: '2020-01-10', costBase: 9_000, marketValue: 30_000, valueJustBefore1July2027: 10_001 }]], 'oldest-first');
  assert.equal(odd.realisations[0].valueJustBefore1July2027, 3_333);
  assert.equal(odd.parcelsAfter[0][0].valueJustBefore1July2027, 6_668);
});

test('M10: growth and a reinvested distribution carry the value unchanged; a parcel without one stays without', () => {
  // Since slice 2 a distribution after the stamp goes to `reinvestedFromJuly2027`, not the cost base
  // (MD in the walk file).
  const stamped = parcel('2020-01-10', 40_000, 80_000, 60_000);
  const [grown] = parcelsGrownForOneMonth([stamped], 0.06);
  assert.equal(grown.valueJustBefore1July2027, toCents(60_000));
  assert.ok(grown.marketValue > stamped.marketValue);
  const [reinvested] = parcelsAfterDistribution([stamped], toCents(1_000));
  assert.equal(reinvested.valueJustBefore1July2027, toCents(60_000));
  assert.equal(reinvested.costBase, toCents(40_000));
  assert.equal(reinvested.reinvestedFromJuly2027, toCents(1_000));

  const [plain] = parcelsGrownForOneMonth([parcel('2020-01-10', 40_000, 80_000)], 0.06);
  assert.equal(Object.hasOwn(plain, 'valueJustBefore1July2027'), false);
  const whole = disposalOfAmount(0, toCents(80_000), '2026-12-01', [[parcel('2020-01-10', 40_000, 80_000)]], 'oldest-first');
  assert.equal(Object.hasOwn(whole.realisations[0], 'valueJustBefore1July2027'), false);
});

// --- Pre-CGT (M11, MP) --------------------------------------------------------------------------

// Acquired 1984 for $5,000, $80,000 just before 1 July 2027, sold for $90,000 on 15 July 2028. The
// pre-reform $75,000 is disregarded (s 112-175(2)); the later part is $90,000 − $82,000 = $8,000.
test('M11: a pre-CGT parcel has a NIL deferred part and a taxed later part', () => {
  const { reformed } = sale([parcel('1984-05-01', 5_000, 90_000, 80_000)], 90_000, '2028-07-15');
  assert.equal(reformed[0].deferredGain, toCents(0));
  assert.equal(reformed[0].postGain, toCents(8_000));
  assert.deepEqual(netCapitalGainFromJuly2027(reformed), { netGain: toCents(8_000), minimumTaxCapitalGain: toCents(8_000) });
});

// One pre-CGT parcel ($5,000 → $80,000), one pre-CGT parcel under water ($10,000 → $4,000) and one
// ordinary parcel ($25,000 → $40,000, held > 12 months), all sold on 1 December 2026. Only the
// ordinary one counts: $15,000 ÷ 2 = $7,500. Taxed in full, as before the fix, it was
// ($75,000 + $15,000 − $6,000) ÷ 2 = $42,000.
test('MP: before 1 July 2027 a pre-CGT gain AND loss are disregarded (s 104-10(5)(a))', () => {
  const disposal = disposalOfAmount(
    0,
    toCents(124_000),
    '2026-12-01',
    [[parcel('1980-01-01', 10_000, 4_000), parcel('1984-05-01', 5_000, 80_000), parcel('2015-03-03', 25_000, 40_000)]],
    'oldest-first',
  );
  assert.deepEqual(disposal.realisations.map((r) => r.preCgtDisregarded), [true, true, false]);
  assert.deepEqual(disposal.realisations.map((r) => r.gain), [toCents(0), toCents(0), toCents(7_500)]);
  assert.equal(netCapitalGain(disposal.realisations), toCents(7_500));

  // 20 September 1985 itself is not before 20 September 1985.
  const boundary = disposalOfAmount(0, toCents(80_000), '2026-12-01', [[parcel('1985-09-20', 5_000, 80_000)]], 'oldest-first');
  assert.equal(boundary.realisations[0].preCgtDisregarded, false);
  assert.equal(netCapitalGain(boundary.realisations), toCents(37_500));

  // On or after 1 July 2027 the old disregard is gone: s 112-175 takes over (M11 above).
  const after = disposalOfAmount(0, toCents(80_000), '2027-07-01', [[parcel('1984-05-01', 5_000, 80_000, 80_000)]], 'oldest-first');
  assert.equal(after.realisations[0].preCgtDisregarded, false);
});

test('MP on the walk: a pre-CGT sale in June 2027 charges no capital gains tax; the same parcel a day younger does', () => {
  const settings = {
    asAtDate: '2027-06-01',
    planningHorizonAge: 53,
    economicSeries: { cpi: 0.025, pblci: 0.025, awote: 0, mtawe: 0.035 },
    deemingRates: { lower: 0.0175, upper: 0.0375 },
    nominalReturn: 0,
    cashInterestRate: 0,
  };
  const household = (acquired) => ({
    persons: [
      {
        name: 'Val',
        dateOfBirth: '1976-05-10',
        superInterests: [{ phase: 'accumulation', balance: toCents(0) }],
        parcels: [parcel(acquired, 5_000, 80_000)],
        employmentIncomePerFortnight: toCents(0),
        workBonusBalance: toCents(0),
      },
    ],
    homeStatus: 'occupied',
  });
  const sell = {
    id: 'sell',
    date: '2027-06-15',
    owner: 'personA',
    type: 'NON_SUPER_INVESTMENT',
    params: { direction: 'sell', amount: toCents(80_000) },
    enabled: true,
    createdAt: '2026-06-01',
  };
  const run = (acquired) => project(settings, household(acquired), [sell]);
  const gainTax = (months) =>
    months.flatMap((m) => m.lines.filter((l) => l.description.startsWith(CAPITAL_GAINS_TAX_LINE)).map((l) => l.amount));
  assert.deepEqual(gainTax(run('1985-09-19')), []);
  assert.equal(gainTax(run('1985-09-20')).length, 1);
});

// --- Refusals and the zero-growth control -------------------------------------------------------

test('a parcel held through 30 June 2027 with no value is refused by name; the impossible states are refused', () => {
  const [unstamped] = disposalOfAmount(0, toCents(10_000), '2028-07-15', [[parcel('2026-01-01', 8_000, 10_000)]], 'oldest-first').realisations;
  assert.throws(() => realisationFromJuly2027(unstamped, '2028-07-15', CPI), MissingValueJustBefore1July2027Error);
  const [late] = disposalOfAmount(0, toCents(10_000), '2028-07-15', [[parcel('2027-07-01', 8_000, 10_000, 9_000)]], 'oldest-first').realisations;
  assert.throws(() => realisationFromJuly2027(late, '2028-07-15', CPI), /was not held on 30 June 2027/);
  assert.throws(() => realisationFromJuly2027(unstamped, '2027-06-30', CPI), /before 2027-07-01/);
});

test('the zero-growth control: with the value equal to the proceeds, the reformed net gain IS the old one', () => {
  // No growth after 30 June 2027: the whole gain is deferred and discounted exactly as before, the
  // later part is nil at any cpi, and the minimum tax base is nil. This is why slice 2's
  // `nominalReturn: 0` fixtures must not move by a cent.
  const parcels = [parcel('2015-03-03', 25_000, 40_000, 40_000), parcel('2027-03-01', 20_000, 23_000, 23_000), parcel('2026-12-05', 50_030, 50_000, 50_000)];
  const { disposal, reformed } = sale(parcels, 113_000, '2027-07-20');
  assert.deepEqual(netCapitalGainFromJuly2027(reformed), {
    netGain: netCapitalGain(disposal.realisations),
    minimumTaxCapitalGain: toCents(0),
  });
  // ($15,000 − $30) ÷ 2 + $3,000 = $10,485: the loss goes against the discountable gain first.
  assert.equal(netCapitalGain(disposal.realisations), toCents(10_485));
});
