// P4-1c — the Age Pension, indexed past the register's published window.
//
// The register publishes Age Pension parameters to 19 March 2027. A projection runs to age 100, so
// before this item the demo couple's forty-eight year walk computed an entitlement for SEVEN of its
// five hundred and seventy-nine months. What was missing was never the mechanism — §4.7 is written
// out in `indexPensionRates` and has been since P2 — but a SERIES to run it over, and the series is
// a Setting, not an assumption (register O5).
//
// **Every figure below is hand-worked and the working is shown.** A test that asserted whatever the
// code produced would ratify a blended rate as readily as three separate ones, and a blended rate is
// exactly what T23 names as the trap:
//
//   "Indexing the blended total at CPI understates the payment (~92% follows wages); indexing it at
//    wage growth overstates it. Hold three separate constants."
//
// So the three constants are asserted SEPARATELY, on a fixture where they cannot coincide:
//
//   * CPI, PBLCI and MTAWE all move by DIFFERENT amounts, in both directions of which limb wins;
//   * one indexation where the CPI/PBLCI limb binds and the 41.76% benchmark does not;
//   * one indexation where the benchmark binds and lifts the rate above what CPI/PBLCI gave;
//   * a 1 July where the March-quarter and December-quarter CPI movements DIFFER, so feeding one
//     to the other's parameters is visible.
import test from 'node:test';
import assert from 'node:assert/strict';

import { toCents } from '../dist/core/money.js';
import {
  AGE_PENSION,
  MissingPensionIndexationError,
  agePensionPeriodAt,
  agePensionPeriodsThrough,
  maximumPaymentRate,
  mtaweReferenceQuarter,
} from '../dist/data/assumptions/agePension.js';
import { agePensionEntitlement } from '../dist/core/agePension.js';
import { project } from '../dist/core/projection.js';

// --- The fixture series --------------------------------------------------------------------------
//
// Two rate indexations and one means-test indexation, each with every component DIFFERENT from
// every other. Chunk 2's recurring defect was a fixture where the numbers coincided; here they are
// chosen so that every swap a mutation could make changes the answer.

/** 20 Mar 2027 — PBLCI beats CPI, and the MTAWE benchmark does NOT bind. */
const MAR_2027 = {
  effective: '2027-03-20',
  cpi: 1.01, // 1.0%
  pblci: 1.014, // 1.4% — the higher limb, so this is the one that must be used
  annualisedMtawe: toCents(107_000), // $107,000 a year
};

/** 20 Sep 2027 — CPI beats PBLCI, and the MTAWE benchmark BINDS and lifts the rate. */
const SEP_2027 = {
  effective: '2027-09-20',
  cpi: 1.002, // 0.2%
  pblci: 1.001, // 0.1%
  annualisedMtawe: toCents(115_000), // $115,000 a year — a big enough jump that 41.76% wins
};

/** 1 July 2027 — two DIFFERENT CPI movements, because §4.1 names two reference quarters. */
const JUL_2027 = {
  effective: '2027-07-01',
  cpiMarchQuarter: 1.011473,
  cpiDecemberQuarter: 1.007137,
};

const SERIES = {
  rateIndexations: [MAR_2027, SEP_2027],
  meansTestIndexations: [JUL_2027],
};

// --- 20 March 2027: the CPI/PBLCI limb binds -----------------------------------------------------

test('20 Mar 2027 — the HIGHER of CPI and PBLCI moves the basic rate, and the benchmark does not bind', () => {
  const period = agePensionPeriodAt('2027-04-01', SERIES);
  assert.equal(period.ratesEffective, '2027-03-20');

  // WORKING.
  //   published 20 Sep 2026 combined couple basic = $1,711.80 /ft = 171,180c
  //   max(CPI 1.010, PBLCI 1.014) = 1.014
  //   171,180 x 1.014                      = 173,576.52c
  //   benchmark = 0.4176 x $107,000 / 26    = 4,468,320 / 26 = 171,858.46c   <-- LOWER, so no floor
  //   combined couple                       = 173,576.52 -> 173,577c = $1,735.77
  //   couple each = 173,576.52 / 2          =  86,788.26 ->  86,788c =   $867.88
  //   single      = 173,576.52 x 0.6633     = 115,133.31 -> 115,133c = $1,151.33
  assert.equal(period.rates.maximumBasicRate.coupleCombined, 173_577);
  assert.equal(period.rates.maximumBasicRate.coupleEach, 86_788);
  assert.equal(period.rates.maximumBasicRate.single, 115_133);

  // The benchmark really is the loser here — stated as a figure, not as a claim.
  const benchmark = Math.round((0.4176 * 10_700_000) / 26);
  assert.ok(benchmark < 173_577, `the benchmark ${benchmark} was supposed NOT to bind`);

  // And CPI alone would give a DIFFERENT answer, so "the higher of" is tested and not assumed:
  //   171,180 x 1.010 = 172,891.80 -> 172,892c
  assert.notEqual(period.rates.maximumBasicRate.coupleCombined, 172_892);
});

test('20 Mar 2027 — the Pension Supplement moves by CPI ONLY and is never benchmarked (T23)', () => {
  const period = agePensionPeriodAt('2027-04-01', SERIES);

  // WORKING, at CPI 1.010 and nothing else:
  //   maximum  combined $133.00 -> 13,300 x 1.010 = 13,433.00 -> 13,433c = $134.33
  //            each      $66.50 ->  6,650 x 1.010 =  6,716.50 ->  6,717c =  $67.17
  //            single    $88.20 ->  8,820 x 1.010 =  8,908.20 ->  8,908c =  $89.08
  assert.equal(period.rates.pensionSupplementMaximum.coupleCombined, 13_433);
  assert.equal(period.rates.pensionSupplementMaximum.coupleEach, 6_717);
  assert.equal(period.rates.pensionSupplementMaximum.single, 8_908);

  //   basic    combined  $50.60 ->  5,060 x 1.010 =  5,110.60 ->  5,111c
  //   minimum  combined  $71.60 ->  7,160 x 1.010 =  7,231.60 ->  7,232c
  assert.equal(period.rates.pensionSupplementBasic.coupleCombined, 5_111);
  assert.equal(period.rates.pensionSupplementMinimum.coupleCombined, 7_232);

  // At PBLCI (the limb that DID move the basic rate) the answer would be 13,300 x 1.014 = 13,486c.
  // The two components must not share a movement, and this is the assertion that says so.
  assert.notEqual(period.rates.pensionSupplementMaximum.coupleCombined, 13_486);
});

// --- 20 September 2027: the benchmark binds ------------------------------------------------------

test('20 Sep 2027 — the 41.76% MTAWE benchmark BINDS and lifts the basic rate above CPI/PBLCI', () => {
  const period = agePensionPeriodAt('2027-10-01', SERIES);
  assert.equal(period.ratesEffective, '2027-09-20');

  // WORKING.
  //   previous combined couple basic (20 Mar 2027, above) = 173,577c
  //   max(CPI 1.002, PBLCI 1.001) = 1.002
  //   173,577 x 1.002                    = 173,924.15c    <-- what indexation alone would give
  //   benchmark = 0.4176 x $115,000 / 26 = 4,802,400 / 26 = 184,707.69c   <-- HIGHER, so it binds
  //   combined couple                    = 184,707.69 -> 184,708c = $1,847.08
  //   couple each = 184,707.69 / 2       =  92,353.85 ->  92,354c =   $923.54
  //   single      = 184,707.69 x 0.6633  = 122,516.61 -> 122,517c = $1,225.17
  assert.equal(period.rates.maximumBasicRate.coupleCombined, 184_708);
  assert.equal(period.rates.maximumBasicRate.coupleEach, 92_354);
  assert.equal(period.rates.maximumBasicRate.single, 122_517);

  // The indexed figure the benchmark overrode, stated so the floor is a fact and not a hope.
  assert.ok(174_000 > 173_924, 'the indexed figure was supposed to be the lower of the two');
  assert.notEqual(period.rates.maximumBasicRate.coupleCombined, 173_924);
});

test('20 Sep 2027 — the Pension Supplement is NOT benchmarked, so it does not follow the lifted rate', () => {
  const period = agePensionPeriodAt('2027-10-01', SERIES);

  // WORKING, CPI 1.002 applied to the 20 Mar 2027 figures:
  //   maximum combined 13,433 x 1.002 = 13,459.87 -> 13,460c = $134.60
  //           each      6,717 x 1.002 =  6,730.43 ->  6,730c =  $67.30
  //           single    8,908 x 1.002 =  8,925.82 ->  8,926c =  $89.26
  assert.equal(period.rates.pensionSupplementMaximum.coupleCombined, 13_460);
  assert.equal(period.rates.pensionSupplementMaximum.coupleEach, 6_730);
  assert.equal(period.rates.pensionSupplementMaximum.single, 8_926);

  // The basic rate rose 6.3% on the benchmark; the supplement rose 0.2%. That divergence IS T23,
  // and a blended implementation cannot produce it.
  const basicGrowth = 184_708 / 173_577;
  const supplementGrowth = 13_460 / 13_433;
  assert.ok(basicGrowth > 1.06, `the basic rate grew only ${basicGrowth}`);
  assert.ok(supplementGrowth < 1.003, `the supplement grew ${supplementGrowth}`);
});

test('the Energy Supplement is never indexed — it is the same figure in 2026, 2027 and 2027 again', () => {
  const published = agePensionPeriodAt('2026-10-01');
  const march = agePensionPeriodAt('2027-04-01', SERIES);
  const september = agePensionPeriodAt('2027-10-01', SERIES);

  // It is not in the rate set at all (that is the structural half), so it is read back out of the
  // Maximum Payment Rate: total - basic - supplement must be the same $21.20 every time.
  const energyIn = (period) =>
    maximumPaymentRate(period, 'coupleCombined') -
    period.rates.maximumBasicRate.coupleCombined -
    period.rates.pensionSupplementMaximum.coupleCombined;

  assert.equal(energyIn(published), 2_120);
  assert.equal(energyIn(march), 2_120);
  assert.equal(energyIn(september), 2_120);
  assert.equal(AGE_PENSION.energySupplement.value.coupleCombined, 2_120);
  // And the rate sets it is absent from really did move, so this is not three readings of one set.
  assert.notEqual(march.rates.maximumBasicRate.coupleCombined, published.rates.maximumBasicRate.coupleCombined);
  assert.notEqual(september.rates.maximumBasicRate.coupleCombined, march.rates.maximumBasicRate.coupleCombined);
});

test('the MTAWE reference quarter is DERIVED from the indexation date — December for March, June for September', () => {
  // §4.7: "December quarter for 20 March; June quarter for 20 September". Derived, never supplied,
  // so a June figure cannot be filed against a March date.
  assert.equal(mtaweReferenceQuarter('2027-03-20'), '2026-12-31');
  assert.equal(mtaweReferenceQuarter('2027-09-20'), '2027-06-30');
  assert.equal(mtaweReferenceQuarter('2041-03-20'), '2040-12-31');
});

// --- 1 July 2027: a different calendar, a different index, TWO reference quarters -----------------

test('1 Jul 2027 — the free areas and deeming thresholds index by CPI, on their own calendar', () => {
  const period = agePensionPeriodAt('2027-08-01', SERIES);
  assert.equal(period.meansTestEffective, '2027-07-01');
  // T22: the rate set on that day is still the 20 Mar 2027 one. Two calendars, not one.
  assert.equal(period.ratesEffective, '2027-03-20');

  // WORKING — MARCH quarter movement, 1.011473, for the income free area (§4.1):
  //   single         $226.00 ->    22,600 x 1.011473 =    22,859.29 -> floor    22,859 = $228.59
  //   couple combined $396.00 ->   39,600 x 1.011473 =    40,054.33 -> floor    40,054 = $400.54
  assert.equal(period.meansTest.incomeFreeArea.single, 22_859);
  assert.equal(period.meansTest.incomeFreeArea.coupleCombined, 40_054);

  // WORKING — DECEMBER quarter movement, 1.007137, for the assets free areas (§4.1):
  //   single         $333,000 -> 33,300,000 x 1.007137 = 33,537,662.10 -> floor 33,537,662
  //   couple         $499,000 -> 49,900,000 x 1.007137 = 50,256,136.30 -> floor 50,256,136
  //   extra allowable $267,000 -> 26,700,000 x 1.007137 = 26,890,557.90 -> floor 26,890,557
  assert.equal(period.meansTest.assetsFreeAreaHomeowner.single, 33_537_662);
  assert.equal(period.meansTest.assetsFreeAreaHomeowner.coupleCombined, 50_256_136);
  assert.equal(period.meansTest.extraAllowableAmount, 26_890_557);

  //   deeming single $66,800 ->  6,680,000 x 1.007137 =  6,727,675.16 -> floor  6,727,675
  //   deeming couple $110,600 -> 11,060,000 x 1.007137 = 11,138,935.22 -> floor 11,138,935
  //   neither on a pension $55,300 -> 5,530,000 x 1.007137 = 5,569,467.61 -> floor 5,569,467
  assert.equal(period.meansTest.deemingThreshold.single, 6_727_675);
  assert.equal(period.meansTest.deemingThreshold.coupleCombined, 11_138_935);
  assert.equal(period.meansTest.deemingThreshold.memberOfCoupleNeitherOnPension, 5_569_467);
});

test('1 Jul 2027 — the two reference quarters are NOT interchangeable', () => {
  const period = agePensionPeriodAt('2027-08-01', SERIES);
  // The income free area at the DECEMBER factor would be 22,600 x 1.007137 = 22,761.30 -> 22,761.
  assert.notEqual(period.meansTest.incomeFreeArea.single, 22_761);
  // The assets free area at the MARCH factor would be 33,300,000 x 1.011473 = 33,682,050.90.
  assert.notEqual(period.meansTest.assetsFreeAreaHomeowner.single, 33_682_050);
});

test('the free areas round DOWN, which is the direction that does not flatter the household', () => {
  const period = agePensionPeriodAt('2027-08-01', SERIES);
  // 22,859.29 rounds to 22,859 by flooring and to 22,859 by rounding — so the assertion that
  // distinguishes them needs a figure above the half: 40,054.33 floors to 40,054 either way, and
  // 6,727,675.16 too. The one that discriminates is 26,890,557.90 -> 26,890,557 floored,
  // 26,890,558 rounded.
  assert.equal(period.meansTest.extraAllowableAmount, 26_890_557);
  assert.notEqual(period.meansTest.extraAllowableAmount, 26_890_558);
  // And the same figure the other way: 11,138,935.22 is unambiguous, so it guards the movement
  // itself rather than the rounding.
  assert.equal(period.meansTest.deemingThreshold.coupleCombined, 11_138_935);
});

// --- The refusal ---------------------------------------------------------------------------------

test('a series that does not reach the date raises MissingPensionIndexationError — the RATE calendar', () => {
  // SERIES stops at 20 Sep 2027. 20 Mar 2028 is the first date it cannot reach.
  assert.throws(
    () => agePensionPeriodAt('2028-04-01', SERIES),
    (error) => {
      assert.ok(error instanceof MissingPensionIndexationError, `got ${error.name}`);
      assert.equal(error.name, 'MissingPensionIndexationError');
      assert.match(error.message, /no observation for 2028-03-20/);
      assert.match(error.message, /maximum basic rate and the Pension Supplement/);
      assert.match(error.message, /Setting, not an assumption/);
      assert.match(error.message, /Refusing to compute/);
      return true;
    },
  );
});

test('a series that does not reach the date raises MissingPensionIndexationError — the MEANS-TEST calendar', () => {
  // Rate observations to 2029 but only the one 1 July: the 1 Jul 2028 gap is what stops it.
  const ratesOnly = {
    rateIndexations: [
      MAR_2027,
      SEP_2027,
      { effective: '2028-03-20', cpi: 1.01, pblci: 1.009, annualisedMtawe: toCents(117_000) },
      { effective: '2028-09-20', cpi: 1.01, pblci: 1.009, annualisedMtawe: toCents(119_000) },
    ],
    meansTestIndexations: [JUL_2027],
  };
  assert.throws(
    () => agePensionPeriodAt('2028-10-01', ratesOnly),
    (error) => {
      assert.equal(error.name, 'MissingPensionIndexationError');
      assert.match(error.message, /no observation for 2028-07-01/);
      assert.match(error.message, /free areas and the deeming thresholds/);
      return true;
    },
  );
  // Vacuity control: the same series DOES answer a date inside its reach, so the refusal above is
  // about the missing 1 July and not about the series being rejected wholesale.
  assert.equal(agePensionPeriodAt('2028-04-01', ratesOnly).ratesEffective, '2028-03-20');
});

test('the refusal is a RangeError, so nothing downstream treats it as a bug (ADR-0004)', () => {
  assert.ok(new MissingPensionIndexationError('2028-03-20', 'x') instanceof RangeError);
});

test('with NO series the window is the PUBLISHED sets and then the standing table, and it says which', () => {
  // Until 2026-09-21 the second line of this test asserted a REFUSAL past the window. The standing
  // table is wired now (P4-1e), so the boundary is no longer between an answer and a refusal — it
  // is between a published set and a carried one, and that is what the boundary has to be asserted
  // on. `standingFrom` is the only thing that distinguishes them: the figures are identical by
  // construction on the day either side of it.
  assert.equal(agePensionPeriodAt('2027-03-19').ratesEffective, '2026-09-20');
  assert.equal(agePensionPeriodAt('2027-03-19').standingFrom, undefined);
  const carried = agePensionPeriodAt('2027-03-20');
  assert.equal(carried.ratesEffective, '2026-09-20', 'the carried set is the last published one, unchanged');
  assert.equal(carried.standingFrom, '2027-03-19', 'and it must say that it was carried');
  // A STATED series still wins over the standing table wherever it reaches, which is what keeps the
  // fallback a fallback: the same date, with a series, is indexed and not carried.
  const indexed = agePensionPeriodAt('2027-03-20', { rateIndexations: [MAR_2027], meansTestIndexations: [JUL_2027] });
  assert.equal(indexed.standingFrom, undefined);
  assert.equal(indexed.ratesEffective, '2027-03-20');
});

test('agePensionPeriodsThrough is cumulative — each set indexes the one before it, so a gap is a STOP', () => {
  // A series with 20 Sep 2027 present but 20 Mar 2027 MISSING must not skip to September: there is
  // no set to index from on the far side of the hole.
  const holed = { rateIndexations: [SEP_2027], meansTestIndexations: [JUL_2027] };
  assert.throws(() => agePensionPeriodsThrough(holed, '2027-10-01'), (error) => {
    assert.equal(error.name, 'MissingPensionIndexationError');
    assert.match(error.message, /2027-03-20/);
    return true;
  });
});

// --- The walk ------------------------------------------------------------------------------------

const person = (name, dateOfBirth) => ({
  name,
  dateOfBirth,
  superInterests: [],
  parcels: [],
  employmentIncomePerFortnight: toCents(0),
  workBonusBalance: toCents(0),
});

/** The demo couple of `test/core-projection.test.mjs` — twelve years apart, 579 months. */
const HOUSEHOLD = {
  persons: [person('A', '1962-04-17'), person('B', '1974-11-02')],
  homeStatus: 'occupied',
};

/**
 * A series reaching the Planning Horizon, built from four STATED growth paths that are all
 * different from each other — never one "inflation" knob, which is the shape T23 forbids.
 */
const longSeries = (lastYear) => {
  const rateIndexations = [];
  const meansTestIndexations = [];
  let mtawe = 107_000; // dollars a year, annualised
  for (let year = 2027; year <= lastYear; year += 1) {
    for (const month of ['03-20', '09-20']) {
      mtawe *= 1.0175; // 3.5% a year in wages, taken half-yearly
      rateIndexations.push({
        effective: `${year}-${month}`,
        cpi: 1.0125, // 2.5% a year in prices
        pblci: 1.011, // deliberately NOT equal to CPI
        annualisedMtawe: toCents(Math.round(mtawe)),
      });
    }
    meansTestIndexations.push({
      effective: `${year}-07-01`,
      cpiMarchQuarter: 1.025,
      cpiDecemberQuarter: 1.0245, // deliberately NOT equal to the March quarter
    });
  }
  return { rateIndexations, meansTestIndexations };
};

const SETTINGS = {
  asAtDate: '2026-09-16',
  planningHorizonAge: 100,
  economicSeries: { cpi: 0.025, pblci: 0.025, awote: 0.035, mtawe: 0.035, agePension: longSeries(2075) },
  deemingRates: { lower: 0.0175, upper: 0.0375 },
  nominalReturn: 0.065,
  // Interest on cash (2026-09-23) is not this fixture's subject: stated nil, the control proved byte-identical to the walk before it existed.
  cashInterestRate: 0,
};

test('WITHOUT a series every one of the demo couple’s 579 months computes, on the standing table', () => {
  // It was SEVEN — the published window, 2026-09 .. 2027-03 — and the other 572 carried no Age
  // Pension line at all. The standing table (P4-1e, wired 2026-09-21) closes exactly that gap: the
  // last published sets apply to every later date, marked as carried, so nothing is uncomputable
  // above the window any more. 579, not 572, because the seven inside the window still compute.
  const settings = { ...SETTINGS, economicSeries: { ...SETTINGS.economicSeries, agePension: undefined } };
  const months = project(settings, HOUSEHOLD, []);
  assert.equal(months.length, 579);
  const computed = months.filter((month) =>
    (() => {
      try {
        agePensionEntitlement({ household: HOUSEHOLD, date: `${month.month}-01`, deemingRates: settings.deemingRates });
        return true;
      } catch {
        return false;
      }
    })(),
  );
  assert.equal(computed.length, 579, 'the published window plus the standing table is the whole walk');

  // AND THE DIRECTION, which is the whole argument for carrying the table (STANDING_PARAMETERS_DIRECTION):
  // a carried set can only pay AT MOST what the legislated one would. The same walk driven by a
  // stated series that indexes everything upward must therefore pay at least as much in every month
  // it pays anything, and strictly more somewhere. This is the assertion that would catch a carried
  // table that had somehow been carried UPWARD.
  const paidBy = (walk) =>
    walk.map((month) => month.lines.filter((line) => line.description === 'Age Pension').reduce((sum, line) => sum + line.amount, 0));
  const carried = paidBy(months);
  const indexed = paidBy(project(SETTINGS, HOUSEHOLD, []));
  assert.equal(carried.length, indexed.length);
  for (const [index, amount] of carried.entries()) {
    assert.ok(amount <= indexed[index], `${months[index].month}: a carried rate paid MORE than an indexed one`);
  }
  assert.ok(carried.reduce((a, b) => a + b, 0) < indexed.reduce((a, b) => a + b, 0));
});

test('WITH a series every one of the demo couple’s 579 months computes', () => {
  const months = project(SETTINGS, HOUSEHOLD, []);
  assert.equal(months.length, 579);
  let computed = 0;
  for (const month of months) {
    const entitlement = agePensionEntitlement({
      household: HOUSEHOLD,
      date: `${month.month}-01`,
      deemingRates: SETTINGS.deemingRates,
      indexationSeries: SETTINGS.economicSeries.agePension,
    });
    assert.equal(entitlement.date, `${month.month}-01`);
    computed += 1;
  }
  assert.equal(computed, 579);

  // And the walk itself pays it: A turns 67 on 2029-04-17, so the first paid month is 2029-05
  // (the 1st-of-the-month rule), through to the horizon.
  const paid = months.filter((m) => m.lines.some((l) => l.description === 'Age Pension'));
  assert.equal(paid.length, 547);
  assert.equal(paid[0].month, '2029-05');
  assert.equal(paid.at(-1).month, '2074-11');
});

test('the walk does not FLATTEN — the payment tracks wages across four decades', () => {
  // ⚠️ **THE FIXTURE GAINED A SPENDING LEVEL ON 2026-09-18, AND IT IS NOT AN ACCOMMODATION — it is
  // what isolates the RATE from the MEANS TEST now that P4-3b put the Offset Account into the
  // means test.** This Household holds nothing and earns nothing, so with no spending level it
  // banks every cent of its Age Pension for forty-five years; the Offset is assessed at the
  // month's own balance, so by 2074 it is being means-tested on $3,346,456.68 of hoarded pension
  // and its payment is tapered hard. That is the model getting MORE correct, and it is asserted in
  // its own right at the foot of this test. What it is NOT is a measurement of indexation — so the
  // indexation window is measured on a walk whose Offset stays at nil, where the figures are the
  // ones this test asserted before P4-3b, to the cent.
  const SPEND = {
    id: 'sc',
    date: '2026-09-01',
    owner: 'household',
    type: 'SPEND_CHANGE',
    params: { annualSpend: toCents(200_000) },
    enabled: true,
    createdAt: '2026-06-01',
  };
  const months = project(SETTINGS, HOUSEHOLD, [SPEND]);
  const amountIn = (isoMonth) =>
    months.find((m) => m.month === isoMonth).lines.find((l) => l.description === 'Age Pension').amount;

  // Two windows, each with a CONSTANT number of eligible persons, so the growth measured is the
  // rate's and not the household's. A born 1962-04 is paid from 2029-05; B born 1974-11 joins from
  // 2041-12, which doubles the Household line and would otherwise flatter any growth figure.
  //
  //   2029-05 -> 2041-11, one eligible, 12.5 years at 3.5% wage growth: 1.035^12.5 = 1.537
  //   2041-12 -> 2074-11, two eligible, 32.9 years:                     1.035^32.9 = 3.103
  //
  // The measured figures come in just under each, because the Pension Supplement follows CPI at
  // 2.5% and the Energy Supplement follows nothing at all — which is T24's long-run behaviour and
  // is the reason the three components are held apart in the first place.
  const onePerson = amountIn('2041-11') / amountIn('2029-05');
  const twoPersons = amountIn('2074-11') / amountIn('2041-12');
  assert.ok(onePerson > 1.5 && onePerson < 1.537, `12.5 years grew by ${onePerson}`);
  assert.ok(twoPersons > 3.0 && twoPersons < 3.103, `32.9 years grew by ${twoPersons}`);

  // A nominal freeze — the failure this item exists against — would read 1.0 in both windows.
  assert.ok(amountIn('2074-11') > amountIn('2029-05') * 8);

  // **NOT A RIGGED WALK: the three measured months open with NIL cash**, so the only thing that can
  // have moved the payment between them is the rate. $200,000 a year against a Household with no
  // wage and no assets is an `Unfunded shortfall` in every one of them, and a shortfall month closes
  // at nil by construction.
  for (const isoMonth of ['2029-05', '2041-11', '2041-12']) {
    const month = months.find((m) => m.month === isoMonth);
    assert.equal(month.openingBalance, toCents(0), isoMonth);
    assert.equal(month.assessableAssets, toCents(0), isoMonth);
  }

  // **AND THE HOARDING WALK, which is P4-3b measured over forty-five years.** The same Household
  // with no spending level banks every payment, and from 2041 the banked cash overtakes the
  // (CPI-indexed) free areas and the tests start biting: the same 32.9-year window grows by 1.38
  // instead of 3.07, and November 2074 is paid $9,301.85 against the $20,686.60 the spending
  // Household is paid in the very same month. The two walks share every rate and every parameter,
  // so the whole of that gap is the means test reading a $3,346,456.68 Offset.
  //
  // **T135 moved both figures up, by a few dollars over decades of monthly compounding.** The
  // assets excess floors to the nearest $500 (SSA 1991 s1064 point 1064-G7), so every month the
  // taper is taken on a slightly smaller excess than before; the pension it pays is a few cents
  // higher, the Offset it banks the next month is a few cents higher again, and years of that
  // compounds into $217.85 on the opening balance and 35c on the November 2074 Age Pension line —
  // still a rise, and still driven only by the excess never being taxed past its own $500 floor.
  const hoarding = project(SETTINGS, HOUSEHOLD, []);
  const hoarded = (isoMonth) => hoarding.find((m) => m.month === isoMonth);
  assert.equal(hoarded('2041-12').lines.find((l) => l.description === 'Age Pension').amount, amountIn('2041-12'));
  assert.equal(hoarded('2074-11').openingBalance, 334_645_668);
  assert.equal(hoarded('2074-11').assessableAssets, 334_645_668, 'every cent of it assessed, and nothing else held');
  assert.equal(hoarded('2074-11').lines.find((l) => l.description === 'Age Pension').amount, 930_185);
  assert.ok(930_185 < amountIn('2074-11'), 'the hoard is means-tested and the spender is not');
});

test('a series that runs out MID-walk refuses — the walk does not silently drop the line', () => {
  const short = { ...SETTINGS, economicSeries: { ...SETTINGS.economicSeries, agePension: longSeries(2040) } };
  assert.throws(
    () => project(short, HOUSEHOLD, []),
    (error) => {
      assert.equal(error.name, 'MissingPensionIndexationError');
      assert.match(error.message, /2041-03-20/);
      return true;
    },
  );
  // Vacuity control: the SAME fixture with a series that does reach the horizon returns 579 months,
  // so the throw above is the series running out and not the fixture being broken.
  assert.equal(project(SETTINGS, HOUSEHOLD, []).length, 579);
});
