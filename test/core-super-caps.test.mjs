// P3-4, first half — the December-quarter index numbers and the three contribution caps.
// Register §3.1 (the caps) and §3.2 (the indexation machinery, ITAA 1997 Subdiv 960-M s 960-285).
//
// Every expected figure below is hand-worked from the register and the working is written out
// beside it. Nothing here was produced by running the implementation and pasting the output: an
// expectation generated that way proves only that the code agrees with itself.
//
// Two of the fixtures are the register's own published worked examples (§3.2, "Algorithm
// verification (AWOTE, ATO Table 40)"), so they are independent of both the code and my
// arithmetic. **Every year-varying fixture runs at least two financial years**, because T13 is
// definitionally invisible in one: chained and cumulative indexation agree in the first year and
// only diverge afterwards.
//
// NOT covered here: `totalSuperBalance`, `carryForwardHeadroom`, `bringForward` and
// `applyNonConcessional`, which are the second half of the module and the next segment.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { toCents } from '../dist/core/money.js';
import { SUPERANNUATION, cpiSeries } from '../dist/data/assumptions/index.js';
import {
  MissingIndexNumberError,
  PublishedCapMismatchError,
  UnsourcedIndexBaseError,
  concessionalContributionsCap,
  decemberQuarterBefore,
  decemberQuarterIndex,
  forecastAwoteIndexNumbers,
  generalTransferBalanceCap,
  nonConcessionalContributionsCap,
} from '../dist/core/superCaps.js';
import { maximumContributionsBaseFor } from '../dist/core/superContributions.js';

const caps = SUPERANNUATION.caps;

// ATO Table 40 — AWOTE for the December quarter, full-time adult average weekly ordinary time
// earnings for the middle month (November), as first published. Register §3.2.
//
//   Dec 2016  $1,533.40  the base quarter (register §3.2 table, s 960-265 item 9)
//   Dec 2024  $1,975.80  drives FY2025-26
//   Dec 2025  $2,051.10  drives FY2026-27
const AWOTE_DEC_2024 = 1_975.8;
const AWOTE_DEC_2025 = 2_051.1;

// SYNTHETIC. Not an AWOTE figure and not a forecast of one — the December 2026 quarter has not
// been published, and register O5 makes the forward series a Setting, not an assumption. It is a
// round driver chosen to land mid-step, carried as `unverified` so that anything computed from it
// arrives saying so. It exists to give the suite a third year in which chained and cumulative
// indexation are far apart.
const AWOTE_SYNTHETIC_DEC_2026 = 2_200.0;

const awote = (fy, indexNumber, confidence, source) =>
  decemberQuarterIndex({ index: 'AWOTE', fy, indexNumber, confidence, source });

/** The published pair, plus the synthetic third year. Order is deliberately not chronological. */
const INDEX_NUMBERS = [
  awote('2026-27', AWOTE_DEC_2025, 'primary-verified', 'ATO Table 40 — AWOTE Dec 2025'),
  awote('2025-26', AWOTE_DEC_2024, 'primary-verified', 'ATO Table 40 — AWOTE Dec 2024'),
  awote('2027-28', AWOTE_SYNTHETIC_DEC_2026, 'unverified', 'synthetic test driver — not published'),
];

// --- The quarter a financial year indexes from --------------------------------------------------

test('s 960-285(5) — the quarter is the 31 December immediately before the year, per year', () => {
  assert.equal(decemberQuarterBefore('2025-26'), '2024-12-31');
  assert.equal(decemberQuarterBefore('2026-27'), '2025-12-31');
  assert.equal(decemberQuarterBefore('2027-28'), '2026-12-31');
});

test('an index number derives its own quarter and cannot be filed against another', () => {
  const dec2025 = awote('2026-27', AWOTE_DEC_2025, 'primary-verified', 'ATO Table 40');
  assert.equal(dec2025.quarter, '2025-12-31');
  const dec2024 = awote('2025-26', AWOTE_DEC_2024, 'primary-verified', 'ATO Table 40');
  assert.equal(dec2024.quarter, '2024-12-31');
  // `quarter` is derived, never supplied: a caller cannot hand Dec 2024's number a Dec 2025 label.
  assert.throws(() => awote('2026-2027', 1_500, 'unverified', 'x'), RangeError);
  assert.throws(() => awote('2026-27', 0, 'unverified', 'x'), RangeError);
  assert.throws(() => awote('2026-27', -1, 'unverified', 'x'), RangeError);
});

// --- The concessional cap, three years -----------------------------------------------------------

test('§3.2 golden fixtures — the concessional cap over FY2025-26 and FY2026-27', () => {
  // FY2025-26: 1,975.80 / 1,533.40 = 1.288509…; the 4th decimal is 5, so 3 dp rounding up gives
  // 1.289 (s 960-285(6)). 25,000 × 1.289 = 32,225. Floor to the $2,500 multiple: 32,225 / 2,500 =
  // 12.89 → 12 × 2,500 = $30,000.
  const y1 = concessionalContributionsCap('2025-26', INDEX_NUMBERS);
  assert.equal(y1.amount, toCents(30_000));
  assert.equal(y1.basis, 'indexed from the base amount and base quarter (s 960-285)');
  assert.equal(y1.indexNumber.quarter, '2024-12-31');

  // FY2026-27: 2,051.10 / 1,533.40 = 1.337616…→ 1.338. 25,000 × 1.338 = 33,450. 33,450 / 2,500 =
  // 13.38 → 13 × 2,500 = $32,500 — the figure the register publishes for FY2026-27.
  const y2 = concessionalContributionsCap('2026-27', INDEX_NUMBERS);
  assert.equal(y2.amount, toCents(32_500));
  assert.equal(y2.amount, caps.concessional.value);
  assert.equal(y2.indexNumber.quarter, '2025-12-31');
});

test('T13 — the third year is computed from the 2016 base, not from the second year', () => {
  // FY2027-28 on the synthetic driver: 2,200.00 / 1,533.40 = 1.434720…; the 4th decimal is 7, so
  // → 1.435. 25,000 × 1.435 = 35,875. 35,875 / 2,500 = 14.35 → 14 × 2,500 = $35,000.
  const y3 = concessionalContributionsCap('2027-28', INDEX_NUMBERS);
  assert.equal(y3.amount, toCents(35_000));

  // Chaining off last year's cap gives a different, plausible, flat answer at every step:
  //   FY2026-27 chained: 2,051.10 / 1,975.80 = 1.038111… → 1.038; 30,000 × 1.038 = 31,140;
  //     31,140 / 2,500 = 12.45 → $30,000, not $32,500.
  //   FY2027-28 chained: 2,200.00 / 2,051.10 = 1.072595… → 1.073; 30,000 × 1.073 = 32,190;
  //     32,190 / 2,500 = 12.87 → $30,000, not $35,000.
  // The three answers below are $30,000 / $32,500 / $35,000; a chained implementation answers
  // $30,000 three times and agrees with this suite only in the first year.
  assert.deepEqual(
    ['2025-26', '2026-27', '2027-28'].map((fy) => concessionalContributionsCap(fy, INDEX_NUMBERS).amount),
    [toCents(30_000), toCents(32_500), toCents(35_000)],
  );
});

test('T13 — a year is computable from its own index number alone, with no prior year present', () => {
  // Cumulative indexation needs the base amount and this year's number and nothing else. A chained
  // implementation needs FY2026-27 to exist before FY2027-28 can be answered, and cannot survive
  // being handed a single year's index number.
  const only2027 = [INDEX_NUMBERS[2]];
  assert.equal(concessionalContributionsCap('2027-28', only2027).amount, toCents(35_000));

  const only2025 = [INDEX_NUMBERS[1]];
  assert.equal(concessionalContributionsCap('2025-26', only2025).amount, toCents(30_000));
});

test('the published FY2026-27 figure is a live cross-check on the machinery, not a comment', () => {
  // Last year's AWOTE number filed against this year — the realistic version of the mistake. It
  // computes $30,000 against a published $32,500, and the module refuses to pick between them.
  const misfiled = [awote('2026-27', AWOTE_DEC_2024, 'primary-verified', 'ATO Table 40 — Dec 2024')];
  assert.throws(() => concessionalContributionsCap('2026-27', misfiled), PublishedCapMismatchError);
  assert.throws(() => nonConcessionalContributionsCap('2026-27', misfiled), PublishedCapMismatchError);

  // No published figure for FY2027-28, so nothing cross-checks there — the same misfiling is a
  // silent wrong number, which is why the index number carries the year it indexes.
  assert.equal(concessionalContributionsCap('2027-28', INDEX_NUMBERS).amount, toCents(35_000));
});

test('a year with no index number refuses rather than growing last year by an assumed rate', () => {
  assert.throws(() => concessionalContributionsCap('2027-28', []), MissingIndexNumberError);
  assert.throws(() => concessionalContributionsCap('2028-29', INDEX_NUMBERS), MissingIndexNumberError);
  assert.throws(() => concessionalContributionsCap('2025-26', []), MissingIndexNumberError);

  // The one year the register publishes a figure is answerable without any index number at all.
  const published = concessionalContributionsCap('2026-27', []);
  assert.equal(published.amount, toCents(32_500));
  assert.equal(published.basis, 'published for this financial year');
  assert.equal(published.indexNumber, null);
});

test('T14 — a CPI number for the same year does not feed the AWOTE-indexed concessional cap', () => {
  const cpi = decemberQuarterIndex({
    index: 'CPI',
    fy: '2027-28',
    indexNumber: AWOTE_SYNTHETIC_DEC_2026,
    confidence: 'unverified',
    source: 'synthetic — wrong index for this cap',
  });
  assert.throws(() => concessionalContributionsCap('2027-28', [cpi]), MissingIndexNumberError);
});

// --- The non-concessional cap — 4 ×, never separately indexed --------------------------------------

test('s 292-85(2)(a) — the NCC cap is 4 × the concessional cap, over three years', () => {
  // 4 × $30,000 / $32,500 / $35,000. The middle one is the register's published $130,000, so the
  // multiple itself is checked against a published pair in the one year both figures exist.
  assert.equal(nonConcessionalContributionsCap('2025-26', INDEX_NUMBERS).amount, toCents(120_000));
  assert.equal(nonConcessionalContributionsCap('2026-27', INDEX_NUMBERS).amount, toCents(130_000));
  assert.equal(nonConcessionalContributionsCap('2026-27', INDEX_NUMBERS).amount, caps.nonConcessional.value);
  assert.equal(nonConcessionalContributionsCap('2027-28', INDEX_NUMBERS).amount, toCents(140_000));

  // §3.1: it moves in $10,000 steps because it is 4 × a cap that moves in $2,500 steps.
  assert.equal(
    nonConcessionalContributionsCap('2026-27', INDEX_NUMBERS).amount -
      nonConcessionalContributionsCap('2025-26', INDEX_NUMBERS).amount,
    toCents(10_000),
  );
  assert.equal(nonConcessionalContributionsCap('2027-28', INDEX_NUMBERS).basis, 'derived from the concessional cap (s 292-85(2)(a))');
});

test('the NCC cap is keyed on the year alone — s 291-20(4) headroom cannot reach it', () => {
  // Structural: `nonConcessionalContributionsCap(fy, indexNumbers)` receives no Person and no
  // carry-forward headroom, so there is no argument through which an unused concessional cap could
  // enlarge it. §3.1 says the s 291-20(4) increase is expressly excluded from this calculation.
  assert.equal(nonConcessionalContributionsCap.length, 1);
});

// --- The general Transfer Balance Cap — computed, and cross-checked against nine published years ---
//
// O11 closed on 2026-09-09: the ABS All Groups CPI index numbers for the December quarters 2016
// through 2025 are in the register (§3.2), so s 960-285 can be applied to this cap for every year
// the series covers. The fixtures below are the register's own verification table, hand-worked
// from `1,600,000 × factor`, floored to $100,000 — none of it was produced by running the code.
//
//   factor = round_up_to_3dp(index(Dec before the FY) / index(Dec 2016 = 76.38))    s 960-285(5),(6)
//   cap    = floor_to_$100,000(1,600,000 × factor)                                  s 960-285(2)

/** The nine published caps, 2018-19 → 2026-27, with the working the register does for each. */
const PUBLISHED_TRANSFER_BALANCE_CAPS = [
  // FY        Dec quarter  ratio      factor  × 1,600,000  floored
  ['2018-19', 77.87, 1.019508, 1.02, 1_632_000, 1_600_000],
  ['2019-20', 79.24, 1.037444, 1.037, 1_659_200, 1_600_000],
  ['2020-21', 80.7, 1.056559, 1.057, 1_691_200, 1_600_000],
  ['2021-22', 81.4, 1.065724, 1.066, 1_705_600, 1_700_000],
  ['2022-23', 84.23, 1.102776, 1.103, 1_764_800, 1_700_000],
  ['2023-24', 90.85, 1.189447, 1.189, 1_902_400, 1_900_000],
  ['2024-25', 94.53, 1.237628, 1.238, 1_980_800, 1_900_000],
  ['2025-26', 96.81, 1.267478, 1.267, 2_027_200, 2_000_000],
  ['2026-27', 100.32, 1.313433, 1.313, 2_100_800, 2_100_000],
];

const CPI_SERIES = SUPERANNUATION.capIndexation.cpiDecemberQuarterIndexNumbers.value;

/** A series is the only unit an index number travels in, so a test driver is a whole series (O41). */
const syntheticSeries = (indexNumbers, referenceBase = 'SYNTHETIC test base — not an ABS series') =>
  cpiSeries({
    referenceBase,
    source: 'synthetic test driver — not published',
    confidence: 'unverified',
    indexNumbers,
  });

test('§3.2 — the s 960-285 arithmetic reproduces all nine published general Transfer Balance Caps', () => {
  for (const [fy, indexNumber, ratio, factor, indexed, published] of PUBLISHED_TRANSFER_BALANCE_CAPS) {
    // The register's own working, re-stated here so a changed fixture is a visible change of
    // arithmetic and not just a changed expectation.
    assert.equal(CPI_SERIES.indexNumbers[decemberQuarterBefore(fy)], indexNumber, `${fy} index number`);
    assert.ok(Math.abs(indexNumber / 76.38 - ratio) < 5e-7, `${fy} ratio`);
    assert.equal(Math.floor(ratio * 1000 + 0.5) / 1000, factor, `${fy} factor`);
    assert.equal(Math.floor((1_600_000 * factor) / 100_000) * 100_000, published, `${fy} floor`);
    assert.equal(Math.round(1_600_000 * factor), indexed, `${fy} indexed amount`);

    assert.equal(generalTransferBalanceCap(fy).amount, toCents(published), `${fy} cap`);
  }
  // Nine years, five distinct caps: the cap is flat for years at a time and then steps (T70), and
  // four of the nine years produced an increase of $0.
  assert.deepEqual(
    [...new Set(PUBLISHED_TRANSFER_BALANCE_CAPS.map(([, , , , , cap]) => cap))],
    [1_600_000, 1_700_000, 1_900_000, 2_000_000, 2_100_000],
  );
});

test('§3.1 — FY2026-27 is the published $2,100,000, and the computation is a live check on it', () => {
  const gtbc = generalTransferBalanceCap('2026-27');
  assert.equal(gtbc.amount, toCents(2_100_000));
  assert.equal(gtbc.amount, caps.generalTransferBalance.value);
  // The published ATO figure is what is returned for the year it exists for — it is
  // primary-verified and does not depend on which CPI reference base s 960-280(3) selects.
  assert.equal(gtbc.basis, 'published for this financial year');
  assert.equal(gtbc.indexNumber, null);
  assert.equal(gtbc.provenance.confidence, 'primary-verified');

  // But it is not returned unchecked: a series that disagrees with it is refused, not preferred.
  // 76.38 × 1.3125 = 100.24875 — the factor tips from 1.313 to 1.312 just below the published
  // Dec 2025 number, and 1,600,000 × 1.312 = 2,099,200, which floors to $2,000,000.
  assert.throws(
    () => generalTransferBalanceCap('2026-27', syntheticSeries({ '2016-12-31': 76.38, '2025-12-31': 100.248 })),
    PublishedCapMismatchError,
  );
});

test('the $800 margin is real — FY2026-27 clears its $100,000 step by half a thousandth of the factor', () => {
  // 1,600,000 × 1.313 = 2,100,800, against a floor at $2,100,000. One thousandth of the factor is
  // $1,600 at this base amount, so the published cap survives by $800 — and the index number that
  // produces it survives by 0.00125 of a point. Both sides of that boundary are asserted, because
  // "it rounds comfortably" is exactly the belief this figure would falsify.
  const at = (dec2025) =>
    generalTransferBalanceCap('2026-27', syntheticSeries({ '2016-12-31': 76.38, '2025-12-31': dec2025 }));
  assert.equal(at(100.249).amount, toCents(2_100_000)); // ratio 1.3125033 → factor 1.313
  assert.throws(() => at(100.248), PublishedCapMismatchError); // ratio 1.3124902 → factor 1.312
  assert.equal(1_600_000 * 1.313 - 2_100_000, 800);
  assert.equal(1_600_000 * 0.001, 1_600);
});

test('T69 — on a factor of 1 or less the cap REVERTS to $1,600,000, it does not hold', () => {
  // s 960-285(4) says "you do not index the amount", and the amount under s 294-35(3)(b) is the
  // base amount, not last year's cap. Deflation is practically unreachable and the rule still has
  // to be the right one. FY2029-30 below deflates after an FY2028-29 that indexed to $2,100,000:
  //   Dec 2027 (FY2028-29)  101.00 / 76.38 = 1.322336 → 1.322 → 2,115,200 → floor → $2,100,000
  //   Dec 2028 (FY2029-30)   74.00 / 76.38 = 0.968840 → 0.969 → factor <= 1 → base, $1,600,000
  // Holding last year's cap would give $2,100,000 here. Reverting gives $1,600,000.
  const deflating = syntheticSeries({ '2016-12-31': 76.38, '2027-12-31': 101.0, '2028-12-31': 74.0 });
  assert.equal(generalTransferBalanceCap('2028-29', deflating).amount, toCents(2_100_000));
  assert.equal(generalTransferBalanceCap('2029-30', deflating).amount, toCents(1_600_000));
});

test('the step is FLOORED to $100,000, never rounded to the nearest', () => {
  // Rounding to the nearest step instead of flooring overstates four of the nine published years
  // by a whole $100,000 — 2019-20 (1,659,200 → $1.7m, published $1.6m), 2020-21 (1,691,200 →
  // $1.7m, published $1.6m), 2022-23 (1,764,800 → $1.8m, published $1.7m) and 2024-25 (1,980,800
  // → $2.0m, published $1.9m). The other five land on the same figure either way, which is why
  // one year is no test at all: 2026-27's 2,100,800 rounds *and* floors to $2,100,000.
  const roundedUpYears = ['2019-20', '2020-21', '2022-23', '2024-25'];
  for (const [fy, , , factor, , published] of PUBLISHED_TRANSFER_BALANCE_CAPS) {
    const nearest = Math.round((1_600_000 * factor) / 100_000) * 100_000;
    assert.equal(generalTransferBalanceCap(fy).amount, toCents(published));
    assert.equal(nearest !== published, roundedUpYears.includes(fy), `${fy} nearest-rounding`);
  }
});

test('O41 — a factor cannot be computed from a mixed reference-base pair', () => {
  // The defence is structural: an index number never travels on its own, only inside a series that
  // names its one reference base, and both halves of the factor are read out of that same series.
  // There is no argument through which a numerator could meet a denominator from another base.
  //
  // The superseded ABS base publishes Dec 2016 as 110.0 and has NO Dec 2025 number at all — the
  // series ends at Sep 2025 — so it cannot supply the FY2026-27 numerator even in principle.
  const superseded = syntheticSeries({ '2016-12-31': 110.0 }, 'ABS CPI superseded reference base (dataflow 1.1.0)');

  // Supplying it does not let the register's current-base numbers leak in as the numerator:
  // FY2026-27 falls back to the published figure, and FY2025-26 refuses outright.
  const published = generalTransferBalanceCap('2026-27', superseded);
  assert.equal(published.basis, 'published for this financial year');
  assert.equal(published.indexNumber, null);
  assert.throws(() => generalTransferBalanceCap('2025-26', superseded), MissingIndexNumberError);

  // And the reverse: a series carrying the numerator but not its own base quarter cannot borrow
  // the register's Dec 2016 = 76.38. 100.32 / 110.0 would give 0.912 and a $1,600,000 cap;
  // 100.32 / 76.38 gives $2,100,000. That is the whole $500,000 the mixed pair is worth.
  assert.throws(
    () => generalTransferBalanceCap('2026-27', syntheticSeries({ '2025-12-31': 100.32 })),
    UnsourcedIndexBaseError,
  );
  assert.equal(Math.floor((1_600_000 * (Math.floor((100.32 / 110.0) * 1000 + 0.5) / 1000)) / 100_000) * 100_000, 1_400_000);
});

test('a year the series has no December quarter number for is refused, not extrapolated', () => {
  // The register's series ends at Dec 2025. FY2027-28 needs Dec 2026, which is a forecast and
  // therefore a Setting, not an assumption (O5) — growing FY2026-27's cap by an assumed rate is
  // the T13 mutation, so the year is refused rather than estimated.
  assert.throws(() => generalTransferBalanceCap('2027-28'), MissingIndexNumberError);
  assert.throws(() => generalTransferBalanceCap('2030-31'), MissingIndexNumberError);

  // A caller who has a forecast supplies it as a series, which carries its own base and its own
  // confidence — and the result says so rather than passing for a published figure.
  //   Dec 2026 (synthetic) 103.00 / 76.38 = 1.348521 → 1.349 → 2,158,400 → floor → $2,100,000
  const forecast = generalTransferBalanceCap(
    '2027-28',
    syntheticSeries({ '2016-12-31': 76.38, '2026-12-31': 103.0 }),
  );
  assert.equal(forecast.amount, toCents(2_100_000));
  assert.equal(forecast.basis, 'indexed from the base amount and base quarter (s 960-285)');
  assert.equal(forecast.indexNumber.index, 'CPI');
  assert.equal(forecast.indexNumber.quarter, '2026-12-31');
  assert.equal(forecast.provenance.confidence, 'unverified');
});

test('a computed year carries O41 in its confidence; the published year does not', () => {
  // The index numbers came straight from the ABS and are primary-verified. Which reference base
  // s 960-280(3) selects is a labelled inference (O41 / U9) and is its own record, so every cap
  // this engine *computes* arrives unverified and names the reason.
  const computed = generalTransferBalanceCap('2025-26');
  assert.equal(computed.amount, toCents(2_000_000));
  assert.equal(computed.basis, 'indexed from the base amount and base quarter (s 960-285)');
  assert.equal(computed.provenance.confidence, 'unverified');
  assert.ok(
    computed.provenance.caveats.some((line) => line.includes('cpiReferenceBase')),
    computed.provenance.caveats.join(' | '),
  );
  assert.equal(SUPERANNUATION.capIndexation.cpiReferenceBase.confidence, 'unverified');
  assert.equal(SUPERANNUATION.capIndexation.cpiDecemberQuarterIndexNumbers.confidence, 'primary-verified');
  assert.equal(generalTransferBalanceCap('2026-27').provenance.confidence, 'primary-verified');
});

// --- Provenance — weakest wins, and the synthetic year says so -------------------------------------

test('a cap computed from an unverified index number arrives unverified, over two years', () => {
  const verified = concessionalContributionsCap('2025-26', INDEX_NUMBERS);
  assert.equal(verified.provenance.confidence, 'primary-verified');
  assert.deepEqual(verified.provenance.caveats, []);

  const synthetic = concessionalContributionsCap('2027-28', INDEX_NUMBERS);
  assert.equal(synthetic.provenance.confidence, 'unverified');
  assert.deepEqual(synthetic.provenance.caveats, [
    'the AWOTE index number for the quarter ending 2026-12-31 is unverified',
  ]);

  // And it survives the 4 × derivation rather than being laundered by it.
  assert.equal(nonConcessionalContributionsCap('2027-28', INDEX_NUMBERS).provenance.confidence, 'unverified');
  assert.equal(nonConcessionalContributionsCap('2025-26', INDEX_NUMBERS).provenance.confidence, 'primary-verified');
});

// --- The structural defences, asserted against the source ----------------------------------------
//
// ADDED 2026-09-10. `superCaps.ts` was one of the two substantial core modules that no test read
// the source text of — twelve test files do this, and none of them read this one. The traps below
// are shape rather than arithmetic, and a suite that only calls the functions cannot see shape: a
// literal that still agrees with its record, or an index name written at a call site, changes no
// result today and every result later. These assertions run against the WHOLE module, including
// the second half (`totalSuperBalance`, `carryForwardHeadroom`, `bringForward`,
// `applyNonConcessional`) whose fixtures live in core-super-carry-forward and
// core-super-contributions.

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = join(ROOT, 'src');
const RAW = readFileSync(join(SRC, 'core', 'superCaps.ts'), 'utf8');

/** Comments and strings quote the register on purpose; most greps below are about the *code*. */
const executableCode = (text) =>
  text
    .replaceAll(/\/\*[\s\S]*?\*\//g, '')
    .replaceAll(/`(?:[^`\\]|\\.)*`|'(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*"|\/\/.*$/gm, (match) =>
      match.startsWith('//') ? '' : '""',
    );

/** Comments stripped, string literals KEPT — for greps about what is *written at a call site*. */
const codeWithStrings = (text) =>
  text
    .replaceAll(/\/\*[\s\S]*?\*\//g, '')
    .replaceAll(/`(?:[^`\\]|\\.)*`|'(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*"|\/\/.*$/gm, (match) =>
      match.startsWith('//') ? '' : match,
    );

/** Every word in the file — comment markers removed, whitespace flattened so a claim that wraps across lines still reads as one sentence. */
const flatten = (text) => text.replaceAll(/^[ \t]*(?:\/\/|\*\/|\/\*\*?|\*)[ \t]?/gm, '').replaceAll(/\s+/g, ' ');

const CODE = executableCode(RAW);
const WRITTEN = codeWithStrings(RAW);
const PROSE = flatten(RAW);

/** The text of one exported binding, up to the next top-level `export`. */
const bodyOf = (name) => new RegExp(`export const ${name} = [\\s\\S]*?(?=\\nexport |$)`).exec(CODE)?.[0] ?? '';

test('the source greps are not vacuous — stripping leaves the executable code behind', () => {
  assert.match(CODE, /\bexport const concessionalContributionsCap\b/);
  assert.match(CODE, /\bexport const generalTransferBalanceCap\b/);
  assert.match(CODE, /\bexport const bringForward\b/);
  assert.ok(CODE.length > 2000, `the executable-code derivation collapsed to ${CODE.length} characters`);
  assert.match(executableCode("const x = 1_600_000; // $1.6m"), /1_600_000/);
  assert.doesNotMatch(executableCode("const y = 'AWOTE'; // note"), /AWOTE/);
  assert.match(codeWithStrings("const y = 'AWOTE'; // note"), /'AWOTE'/);
  assert.doesNotMatch(codeWithStrings("// a comment naming 'AWOTE'"), /AWOTE/);
  // The third derivation keeps what the other two throw away, and rejoins a claim that wraps.
  assert.ok(PROSE.length > CODE.length, 'the prose derivation must keep the comments, not strip them');
  assert.match(flatten('//     wrapped across\n//     two lines'), /wrapped across two lines/);
  assert.match(PROSE, /The message was corrected on 2026-09-11/);
  assert.ok(bodyOf('generalTransferBalanceCap').length > 300, 'the per-binding extraction found nothing');
});

test('MUTATION — no dollar amount, cap, step, threshold, multiple, age or date is written as a literal (T14)', () => {
  // The file's own header: "Every figure and every derivation comes from `data/assumptions/
  // super.ts`; a dollar amount appearing below as a literal is a bug." A written figure that still
  // agrees with its record changes no fixture — it changes the year the record moves, which is
  // exactly when nobody is looking. So the property tested is that there is no figure to drift.
  //
  // TIGHTENED 2026-09-10 (P3-27). This assertion used to be the blanket rule *with two named
  // exceptions*, and the exceptions were not the module's fault: the 4 of s 292-85(2)(a) lived
  // only inside the words of `caps.nonConcessional.derivation` and the 75 of s 292-85(3)(c) only
  // inside the sentence `bringForward.ageGate`, so there was no numeric record for the module to
  // read and it had to declare both itself. `caps.nonConcessionalMultiple` and
  // `bringForward.ageGateUnder` now exist, the prose stays beside them for the reader, and the
  // exceptions are gone. Nothing here is pinned "with a justification" any more.
  const literals = [...CODE.matchAll(/(?<![\w.])\d[\d_]*(?:\.\d+)?/g)].map(([match]) => match);
  assert.deepEqual(
    [...new Set(literals)].sort(),
    ['0', '1', '2', '3'],
    'this module may write 0, 1, 2 and 3 and no other number. All four are structural — nil, the ' +
      'bring-forward year counts, loop indices and array offsets — and none of them is a quantity ' +
      'the register carries. Any fifth number is a dollar amount, a cap, a step, a threshold, a ' +
      'multiple, a rate or an age, and belongs in data/assumptions/super.ts',
  );
  // The same rule stated the other way, so that it does not depend on the enumeration above being
  // maintained: no separator, no decimal point, nothing above 3. Every figure the register carries
  // fails at least one of these, and a rate fails the second.
  for (const literal of literals) {
    assert.doesNotMatch(literal, /[._]/, `${literal} has a separator or a decimal point — it is a figure, not an index`);
    assert.ok(Number(literal) <= 3, `${literal} is too large to be structural — read it from a record`);
  }
  for (const forbidden of [/32_?500/, /130_?000/, /1_?900_?000/, /2_?000_?000/, /1_?600_?000/, /500_?000/, /2_?500\b/, /25_?000/, /100_?000/]) {
    assert.doesNotMatch(CODE, forbidden, `${forbidden} must be read from a record, never written here`);
  }

  // s 292-85(2)(a). The number is read from its own record; the derivation prose is kept for the
  // reader, and because it is a second statement of the same figure it is checked against it.
  assert.match(RAW, /const NON_CONCESSIONAL_MULTIPLE = CAPS\.nonConcessionalMultiple;/);
  assert.match(CODE, /mulCents\(concessional\.amount, NON_CONCESSIONAL_MULTIPLE\.value\)/);
  assert.equal(SUPERANNUATION.caps.nonConcessionalMultiple.value, 4);
  assert.match(
    caps.nonConcessional.derivation,
    new RegExp(`^${caps.nonConcessionalMultiple.value} × concessional`),
    'the derivation prose and the numeric record are two statements of one figure and must agree',
  );
  assert.equal(caps.nonConcessional.value, caps.nonConcessionalMultiple.value * caps.concessional.value);

  // s 292-85(3)(c), the same shape: a number to compute with, the sentence kept beside it, and the
  // two pinned to each other. The comparison is strict, which is what `ageGateUnder` is named for.
  assert.equal(typeof SUPERANNUATION.bringForward.ageGate.value, 'string');
  assert.equal(SUPERANNUATION.bringForward.ageGateUnder.value, 75);
  assert.match(
    SUPERANNUATION.bringForward.ageGate.value,
    new RegExp(`under ${SUPERANNUATION.bringForward.ageGateUnder.value}\\b`),
    'the age-gate sentence and the numeric record are two statements of one figure and must agree',
  );
  assert.match(CODE, /const ageGateMet = ageAtStartOfYear < BRING_FORWARD\.ageGateUnder\.value;/);

  // No date either. TSB_DEFINITION_FROM used to be written out as '2026-06-30' — the day before
  // its own record's effective date, hand-maintained, one day off, with nothing to notice if the
  // record moved. It is now derived from the record through the two functions that already mean
  // "just before the start of the financial year", and guarded against an effective date that is
  // not a 1 July, which is the one shape the derivation would silently get wrong.
  assert.deepEqual(
    [...new Set([...WRITTEN.matchAll(/'\d{4}-\d{2}-\d{2}'/g)].map(([match]) => match))],
    [],
    'this module writes no date at all: every date it uses is derived from a record or a year',
  );
  assert.match(WRITTEN, /'superannuation\.access\.totalSuperBalanceDefinition'/, 'the date grep is not vacuous');
  assert.match(RAW, /const TSB_DEFINITION_FY = financialYearContaining\(TSB_DEFINITION\.effective\);/);
  assert.match(RAW, /const TSB_DEFINITION_FROM: IsoDate = justBeforeFinancialYear\(TSB_DEFINITION_FY\);/);
  assert.match(
    RAW,
    /if \(TSB_DEFINITION\.effective !== startOfFinancialYear\(TSB_DEFINITION_FY\)\) \{/,
    'the derivation is only sound for a 1 July effective date, so the module must refuse any other',
  );
  assert.equal(
    SUPERANNUATION.access.totalSuperBalanceDefinition.effective,
    '2026-07-01',
    'the record is what the derivation reads; this is the fixture the derived 2026-06-30 comes from',
  );
});

test("MUTATION — the index name is never written at a call site (T14)", () => {
  // The bug this replaced: `'AWOTE'` written as a literal at two call sites, so a cap could be
  // indexed by a series it does not index by, and nothing in the arithmetic would say so. The
  // index is now read off each cap's own `CapIndexationSpec`. Both names survive in exactly one
  // shape — the `'AWOTE' | 'CPI'` type annotation — so the canary is that every occurrence of
  // either literal is part of that annotation.
  const annotations = [...WRITTEN.matchAll(/'AWOTE' \| 'CPI'/g)].length;
  assert.ok(annotations > 0, "the 'AWOTE' | 'CPI' annotation has gone");
  for (const name of ["'AWOTE'", "'CPI'"]) {
    assert.equal(
      [...WRITTEN.matchAll(new RegExp(name, 'g'))].length,
      annotations,
      `${name} is written somewhere other than the 'AWOTE' | 'CPI' annotation — the index belongs ` +
        "to the cap's own spec (spec.index) and naming it at a call site is how a cap gets indexed " +
        'by the wrong series',
    );
  }
  // The three places an index reaches a call are all `spec.index`, read from the spec.
  assert.match(CODE, /const observed = indexNumberFor\(spec\.index, fy, indexNumbers\);/);
  assert.match(CODE, /throw new UnsourcedIndexBaseError\(spec\.index, fy, ""\);/);
  assert.match(CODE, /index: spec\.index,/);
});

test('MUTATION — O41: a CPI factor is read out of one series, so a mixed-base pair is not expressible', () => {
  // The ABS re-referenced the CPI series. The two bases differ in the third decimal of the factor
  // in four published years, and a thousandth is $1,600 of Transfer Balance Cap. The defence is
  // that `generalTransferBalanceCap` takes a whole `CpiSeries` — which carries its own reference
  // base — and never a pair of loose index numbers, so the numerator and the denominator cannot
  // come from different bases. There is no assertion that could catch a mixed pair after the fact;
  // the point is that there is no route by which two loose numbers meet.
  assert.match(
    RAW,
    /export const generalTransferBalanceCap = \(\n  fy: FinancialYear,\n  series: CpiSeries = CPI_INDEX_NUMBERS\.value,\n\): CapResult<GeneralTransferBalanceCap> => \{/,
    'the CPI-indexed cap must take a CpiSeries, defaulted to the register\'s own — not an index number',
  );
  const body = bodyOf('generalTransferBalanceCap');
  // Both halves of the factor, read out of the one series object.
  assert.match(body, /cpiIndexNumberAt\(series, spec\.baseQuarter\)/, 'the base half');
  assert.match(body, /const observed = cpiIndexNumberAt\(series, quarter\);/, 'the observed half');
  assert.match(body, /const amount = indexCapFromCpiSeries\(spec, series, quarter\);/, 'and the factor formed inside the series');
  // `indexCap` is the loose-numbers form. It survives for AWOTE, where the base IS a record
  // (`awoteBaseQuarterIndexNumber`) and there is no series — one call site, and not this one.
  assert.equal([...CODE.matchAll(/\bindexCap\(/g)].length, 1, 'the loose-numbers indexCap may be called once, from the AWOTE path');
  assert.match(CODE, /const base = SPECS\.awoteBaseQuarterIndexNumber;\n  const amount = indexCap\(spec, base\.value, observed\.indexNumber\);/);
  assert.doesNotMatch(body, /\bindexCap\(/, 'the CPI cap forming its factor from two loose numbers is the O41 mutation');
  assert.doesNotMatch(body, /indexNumbers|indexNumberFor/, 'a list of loose DecemberQuarterIndex values must not reach the CPI cap');
  // And the reference base is a record with its own confidence, consumed by every computed year,
  // so a computed cap cannot pass for a published one.
  assert.match(body, /\["", CPI_REFERENCE_BASE\]/);
  assert.match(RAW, /\['superannuation\.capIndexation\.cpiReferenceBase', CPI_REFERENCE_BASE\]/);
  assert.equal(SUPERANNUATION.capIndexation.cpiReferenceBase.confidence, 'unverified');
});

test('MUTATION — PublishedCapMismatchError is a live cross-check at all three caps', () => {
  // Every cap the register publishes a figure for is recomputed from the spec and compared to the
  // published figure, at every call. It is what makes the 4 × multiple and the indexation formula
  // safe to hold outside the register: a wrong multiple or a wrong step throws in the one year the
  // answer is known, rather than being believed in the years it is not.
  const throws = [...RAW.matchAll(/throw new PublishedCapMismatchError\('([^']+)'/g)].map(([, cap]) => cap);
  assert.deepEqual(
    throws,
    ['concessional contributions cap', 'non-concessional contributions cap', 'general Transfer Balance Cap'],
    'all three published caps must keep their computed-against-published check — deleting one ' +
      'removes the only thing that would notice a wrong step, base or multiple',
  );
  // The comparison itself: computed against published, guarded only by "is this the published year".
  assert.match(CODE, /if \(published\.fy === fy && amount !== published\.value\) \{\n    throw new PublishedCapMismatchError/);
  assert.equal([...CODE.matchAll(/amount !== published\.value/g)].length, 3, 'three caps, three comparisons');
  assert.doesNotMatch(CODE, /amount === published\.value/, 'the check must not be inverted');
});

test('MUTATION — the availability claim cannot come back, in these words or reworded (O11, O44)', () => {
  // CORRECTED 2026-09-11 (P3-34). `UnsourcedIndexBaseError`'s message ended "Nothing but a
  // published figure is available." That was a claim about this register's coverage, and it has
  // been false since O11 closed on 2026-09-09: §3.2 carries ten December-quarter CPI numbers, nine
  // published general Transfer Balance Caps are reproduced from them, and Division 296's base
  // quarter (Dec 2025) is one of them.
  //
  // The part worth defending is HOW it survived. d7019b7 — the commit that narrowed this very
  // class — deleted the predecessor sentence "Only the published year is available" and wrote the
  // same claim into the next line in new words, while adding a JSDoc three lines above saying of
  // it that "that sentence is gone with the ground under it". A comment asserting the removal, sat
  // directly above the surviving copy. A canary that pinned the old string would have passed the
  // reword through, so this one is layered and only the first layer is about wording.
  let message = '';
  assert.throws(
    () => generalTransferBalanceCap('2026-27', syntheticSeries({ '2025-12-31': 100.32 })),
    (error) => {
      message = error.message;
      return true;
    },
  );

  // Layer 0 — the refusal is unchanged and still refuses on its own sound ground: THIS series has
  // no denominator, and the register's may not be substituted into it.
  assert.match(message, /s 960-285\(5\) has no denominator without it/);
  assert.match(message, /series handed to this call has no number for that quarter/);
  assert.match(message, /O41/);
  assert.match(message, /Refusing to compute FY2026-27\./);

  // Layer 1 — the two wordings the claim has actually worn, and the near shapes of it.
  for (const shape of [
    /Nothing but a published figure is available/i,
    /Only the published year is available/i,
    /\b(?:only|nothing but|nothing except|no more than)\b[^.]{0,80}\bpublish/i,
    /\bpublished\b[^.]{0,60}\b(?:is|are)\s+(?:the\s+)?(?:only|all)\b/i,
    /\bno\b[^.]{0,40}\bother\b[^.]{0,40}\byear\b[^.]{0,40}\b(?:available|computable|to be had)\b/i,
  ]) {
    assert.doesNotMatch(message, shape, `${shape} — false against §3.2 since 2026-09-09 (O11 closed)`);
    assert.doesNotMatch(PROSE, shape, `${shape} — and the comments are where the last reword was written`);
  }

  // Layer 2 — the vocabulary the claim cannot be made without. This class's message is a statement
  // about the CALLER'S ARGUMENT: a supplied series with no number for the cap's own base quarter.
  // It has no business saying anything about what this register holds or what years can be had, so
  // the words that claim needs are not words this message may use — a reword that avoids the
  // shapes above still has to say "published", "register", "only" or a second "available".
  assert.equal(
    [...message.matchAll(/\bavailable\b/gi)].length,
    1,
    'the one "available" is "not available here", about the supplied series. A second is a claim ' +
      'about availability in general, which is the sentence that was removed',
  );
  for (const word of [/\bpublished\b/i, /\bregister\b/i, /\bonly\b/i, /\bunavailable\b/i]) {
    assert.doesNotMatch(
      message,
      word,
      `${word} — this refusal describes the series it was handed, not the register's coverage`,
    );
  }

  // Layer 3 — topic, not wording, which is the layer a fresh paraphrase has to get past. Every
  // sentence of the message must be about the base quarter, s 960-285, the series it was given, or
  // the refusal itself. A sentence about anything else is a claim this class is not entitled to
  // make, however it is phrased.
  //
  // The count is asserted as well as the topics, and that is what closes the reword. A paraphrase
  // can borrow the word "series" to look on-topic — "This series aside, no year but the one
  // already printed can be worked out" passes every layer above — but it cannot do so without
  // being a fourth statement or displacing one of the three asserted below. Three sentences, each
  // one anchored: the claim has nowhere to sit.
  const sentences = message.split(/(?<=\.)\s+/).filter((sentence) => sentence.trim() !== '');
  assert.equal(
    sentences.length,
    3,
    `this refusal makes three statements and the message split into ${sentences.length}: the ` +
      'base quarter is missing, the supplied series may not borrow a denominator, and the year is ' +
      'refused. A fourth is a claim being added to a message that has said its piece',
  );
  for (const sentence of sentences) {
    assert.match(
      sentence,
      /base quarter|960-285|series|Refusing to compute/,
      `"${sentence}" is a sentence about none of this refusal's four subjects — the removed claim ` +
        'was exactly such a sentence',
    );
  }

  // And the JSDoc that asserted the removal is now true, and says what the class means after the
  // narrowing: a caller-supplied series, never a gap in the register.
  assert.match(PROSE, /The `CpiSeries` supplied to this call carries no index number for the cap's own base quarter/);
  assert.match(PROSE, /both call sites default to the register's own series, which carries every base quarter/);
  assert.match(PROSE, /no record of the register can reach this/);
  assert.match(PROSE, /It is gone now, in both wordings/);
  // The default really is the register's series, and it really does carry the base quarter — the
  // sentence above is only true because of this, and this is executable rather than prose.
  assert.match(CODE, /series: CpiSeries = CPI_INDEX_NUMBERS\.value/);
  assert.equal(generalTransferBalanceCap('2026-27').basis, 'published for this financial year');
  assert.equal(generalTransferBalanceCap('2025-26').basis, 'indexed from the base amount and base quarter (s 960-285)');
});

// --- P6-12 — THE FORWARD AWOTE SERIES, OUT OF THE PLAN'S OWN WAGE ASSUMPTION ---------------------
//
// User ruling, 2026-09-21: *"do it, and label it."* Until that day the register held ONE AWOTE
// level — the December 2016 base quarter — so every year after FY2026-27 had no index number, the
// cap fell back on the $25,000 base amount, and a perfectly legal contribution was refused. The
// ruling accepted in terms that indexing runs in the FLATTERING direction (larger caps, fewer
// refusals, more into super at 15%) on the ground that the old behaviour was not cautious but
// WRONG: a cap frozen at the base amount for forty years is a known-false forecast.
//
// Two records make it possible and neither is invented here: December 2025's published level
// (2051.10, ATO Table 40, retrieved 2026-09-21) and the growth rate, which is the caller's Setting.
// Every expected figure below is hand-worked from those two and the s 960-285 machinery.
//
//   THE FACTOR, s 960-285(6): the ratio, rounded to THREE decimal places, and never below 1.
//   THE CAP,    s 291-20(2): $25,000 × factor, floored to a multiple of $2,500.
//   THE FLOOR,  s 960-285(4): a factor of 1 or less leaves the base amount standing.

const ANCHOR = SUPERANNUATION.capIndexation.awoteLatestPublishedQuarterIndexNumber;
const BASE_QUARTER = SUPERANNUATION.capIndexation.awoteBaseQuarterIndexNumber;

/** The hand-worked cap for a wage level, written out rather than imported from the module. */
const capFromLevel = (level) => {
  const factor = Math.round((level / BASE_QUARTER.value) * 1_000) / 1_000;
  return factor <= 1 ? 25_000_00 : Math.floor((25_000 * factor) / 2_500) * 2_500 * 100;
};

test('the December 2025 AWOTE level is a RECORD now, sourced, and the prose that held it agrees', () => {
  // It lived in a comment until 2026-09-21 — inside `caps.concessional.note`, as the worked string
  // "2051.10 / 1533.40 → 1.338 → $32,500". A number in a comment is prose: no source of its own, no
  // retrieval date, no confidence, and nothing may compute from it. This is the promotion.
  assert.equal(ANCHOR.value, 2_051.1);
  assert.equal(ANCHOR.effective, '2025-12-31');
  assert.equal(ANCHOR.confidence, 'primary-verified');
  assert.match(ANCHOR.source, /ATO other super rates and thresholds, Table 40/);
  assert.match(ANCHOR.retrieved, /^\d{4}-\d{2}-\d{2}$/);
  assert.equal(ANCHOR.registerSection, BASE_QUARTER.registerSection, 'the two halves of one ratio must be filed in one section');
  // The prose is KEPT beside the record rather than replaced by it, so the two are pinned to each
  // other: the reader's worked example and the figure the code consumes cannot drift apart.
  assert.ok(
    caps.concessional.note.includes(`${ANCHOR.value.toFixed(2)} / ${BASE_QUARTER.value.toFixed(2)}`),
    `the note's worked ratio no longer states the records it is derived from: ${caps.concessional.note}`,
  );
});

test('THE CONTROL — FY2026-27 is still exactly $32,500, and the derivation is what proves it', () => {
  // 2051.10 / 1533.40 = 1.337657…, which s 960-285(6) rounds to 1.338; $25,000 × 1.338 = $33,450;
  // floored to a multiple of $2,500 that is $32,500 — the figure the ATO publishes. The module
  // cross-checks the two and raises `PublishedCapMismatchError` on any disagreement, so this test
  // is not a second opinion about the cap: it is the proof that the machinery reaches the published
  // figure from the records alone.
  assert.equal(Math.round((2_051.1 / 1_533.4) * 1_000) / 1_000, 1.338);
  assert.equal(Math.floor((25_000 * 1.338) / 2_500) * 2_500, 32_500);
  assert.equal(capFromLevel(ANCHOR.value), 32_500_00);
  assert.equal(caps.concessional.value, toCents(32_500));

  // And through the function the walk uses, at every rate a user could type — the published year
  // must not depend on the Setting at all, because December 2025 has been published.
  for (const rate of [0, 0.025, 0.035, 0.12, -0.04]) {
    const [number, ...rest] = forecastAwoteIndexNumbers('2026-27', rate);
    assert.deepEqual(rest, [], 'more than one index number for one year');
    assert.equal(number.indexNumber, ANCHOR.value, `the rate ${rate} moved the PUBLISHED quarter`);
    assert.equal(number.quarter, '2025-12-31');
    assert.equal(number.confidence, 'primary-verified');
    const cap = concessionalContributionsCap('2026-27', [number]);
    assert.equal(cap.amount, toCents(32_500));
    assert.equal(cap.basis, 'indexed from the base amount and base quarter (s 960-285)');
    assert.deepEqual(cap.provenance.caveats, [], 'the published year picked up a forecast caveat');
  }
});

test('a year beyond publication is DERIVED, is unverified, and says so in its own source line', () => {
  // FY2028-29 indexes from the December 2027 quarter, which is two years after the anchor:
  // 2051.10 × 1.035² = 2197.1900…, over 1533.40 is 1.43287…, rounded 1.433; $25,000 × 1.433 =
  // $35,825, floored to the $2,500 step is $35,000 — one step above the published year.
  const [number] = forecastAwoteIndexNumbers('2028-29', 0.035);
  assert.equal(number.quarter, '2027-12-31');
  assert.ok(Math.abs(number.indexNumber - 2_051.1 * 1.035 ** 2) < 1e-9);
  assert.equal(Math.round((number.indexNumber / 1_533.4) * 1_000) / 1_000, 1.433);
  assert.equal(capFromLevel(number.indexNumber), 35_000_00);
  assert.equal(concessionalContributionsCap('2028-29', [number]).amount, toCents(35_000));
  // THE LABEL. The confidence is what carries it into every figure computed downstream, and the
  // source line is what a reader sees when they ask where the number came from.
  assert.equal(number.confidence, 'unverified');
  assert.match(number.source, /FORECAST, not a published level/);
  assert.match(number.source, /wage growth rate stated in this plan/);
});

test('the derived cap reaches the provenance CAVEAT a reader sees, and the 4× cap does not launder it', () => {
  const derived = forecastAwoteIndexNumbers('2028-29', 0.035);
  const cap = concessionalContributionsCap('2028-29', derived);
  assert.equal(cap.provenance.confidence, 'unverified');
  assert.deepEqual(cap.provenance.caveats, [
    'the AWOTE index number for the quarter ending 2027-12-31 is unverified',
  ]);
  // The same shape `test/core-provenance.test.mjs` exercises with a hand-built 'awote-index' record,
  // now reached by the real one: one weak input among strong ones decides the result.
  assert.equal(nonConcessionalContributionsCap('2028-29', derived).provenance.confidence, 'unverified');
  assert.ok(
    nonConcessionalContributionsCap('2028-29', derived).provenance.caveats.some((line) => /AWOTE index number/.test(line)),
  );
});

test('T13 — every forward year is grown from the ANCHOR, never from the year before it', () => {
  // The chaining mutation is invisible in one year and compounds in every later one, so the property
  // is asserted as an identity over a decade: the level for year n is the anchor times (1+r)^n, and
  // computing FY2035-36 requires no other year to have been computed first.
  const rate = 0.035;
  for (let years = 1; years <= 10; years += 1) {
    const fy = `${2026 + years}-${String((2027 + years) % 100).padStart(2, '0')}`;
    const [number] = forecastAwoteIndexNumbers(fy, rate);
    assert.ok(
      Math.abs(number.indexNumber - ANCHOR.value * (1 + rate) ** years) < 1e-9,
      `${fy} is not the anchor compounded ${years} times — something is chaining`,
    );
    // And the cap is worked from the $25,000 base amount every time, never from last year's cap.
    assert.equal(concessionalContributionsCap(fy, [number]).amount, capFromLevel(number.indexNumber));
  }
  // The decade's figures, hand-worked, so the compounding itself is pinned to money rather than to
  // a formula repeated on both sides: at 3.5% the cap is $32,500 in FY2027-28, $35,000 in FY2028-29
  // and $45,000 in FY2035-36 — the last being $20,000 of headroom a build frozen at the base amount
  // refused outright.
  const capAt = (fy) => concessionalContributionsCap(fy, forecastAwoteIndexNumbers(fy, rate)).amount;
  assert.equal(capAt('2027-28'), toCents(32_500));
  assert.equal(capAt('2028-29'), toCents(35_000));
  assert.equal(capAt('2035-36'), toCents(45_000));
  assert.equal(capAt('2035-36') - toCents(25_000), toCents(20_000));
});

test('a NIL wage assumption holds the cap at the last published level, and never divides by zero', () => {
  // Nobody is obliged to forecast a rise. A nil rate is a statement — "wages stay where they are" —
  // and what it must NOT do is collapse the cap to the base amount, which is the behaviour this
  // whole slice replaced.
  for (const fy of ['2027-28', '2030-31', '2035-36']) {
    const [number] = forecastAwoteIndexNumbers(fy, 0);
    assert.equal(number.indexNumber, ANCHOR.value);
    assert.equal(number.confidence, 'unverified', 'a year nobody has published is a forecast even when nothing moves');
    assert.equal(concessionalContributionsCap(fy, [number]).amount, toCents(32_500));
  }
});

test('a NEGATIVE wage assumption is statable, and s 960-285(4) floors the cap at the base amount', () => {
  // Falling wages are a thing a user may state. The cap falls in $2,500 steps with them until the
  // factor reaches 1, and then it stops: the base amount is a floor, not a starting point.
  const at = (rate, fy) => concessionalContributionsCap(fy, forecastAwoteIndexNumbers(fy, rate)).amount;
  assert.equal(at(-0.02, '2035-36'), toCents(27_500)); // 2051.10 × 0.98⁹ = 1710.10 → 1.115 → $27,500
  assert.equal(capFromLevel(2_051.1 * 0.98 ** 9), 27_500_00);
  // Deep enough and the factor drops below 1, where the base amount stands whatever the ratio is.
  assert.equal(at(-0.5, '2035-36'), toCents(25_000));
  assert.equal(at(-0.9, '2035-36'), toCents(25_000));
  assert.equal(capFromLevel(1), 25_000_00);
  // A rate of −1 or worse is not a falling wage, it is no wage at all, and it is refused rather
  // than producing an index number of nil or a negative one.
  for (const rate of [-1, -1.5, Number.NaN, Number.POSITIVE_INFINITY]) {
    assert.throws(() => forecastAwoteIndexNumbers('2030-31', rate), /not a wage growth rate/);
  }
});

test('the series does NOT run backwards — a year before the anchor gets nothing, not a smaller number', () => {
  // Compounding into the past would invent figures the ABS has already published, and would invent
  // them low. Every such year gets an empty series and the refusal it had before.
  for (const fy of ['2025-26', '2020-21', '2017-18']) {
    assert.deepEqual(forecastAwoteIndexNumbers(fy, 0.035), []);
    assert.throws(() => concessionalContributionsCap(fy, forecastAwoteIndexNumbers(fy, 0.035)), MissingIndexNumberError);
  }
  // The published Dec 2024 level is $1,975.80 and FY2025-26's cap is $30,000 — which the register
  // knows and this box may not reconstruct: growing the anchor by any rate at all lands elsewhere.
  assert.equal(capFromLevel(AWOTE_DEC_2024), 30_000_00);
});

test('the SG maximum contributions base moves with the derived cap, because it IS the derived cap', () => {
  // SGAA s 10A(5) is `floor_to_10(cap × 100 ÷ charge percentage)`, so the ceiling is a function of
  // the cap and of nothing else. The pairs below are hand-worked from the caps above at 12%.
  const ceiling = (fy, rate) => maximumContributionsBaseFor(fy, forecastAwoteIndexNumbers(fy, rate)).amount;
  assert.equal(Math.floor((32_500 * 100) / 12 / 10) * 10, 270_830);
  assert.equal(Math.floor((35_000 * 100) / 12 / 10) * 10, 291_660);
  assert.equal(Math.floor((45_000 * 100) / 12 / 10) * 10, 375_000);
  assert.equal(ceiling('2026-27', 0.035), toCents(270_830));
  assert.equal(ceiling('2028-29', 0.035), toCents(291_660));
  assert.equal(ceiling('2035-36', 0.035), toCents(375_000));
  // And it carries the same label: a ceiling derived from a forecast is a forecast.
  assert.equal(maximumContributionsBaseFor('2035-36', forecastAwoteIndexNumbers('2035-36', 0.035)).provenance.confidence, 'unverified');
  assert.equal(maximumContributionsBaseFor('2026-27', forecastAwoteIndexNumbers('2026-27', 0.035)).provenance.confidence, 'primary-verified');
});

test('MUTATION CANARY — the derived index number is written `unverified` in the source, as a literal', () => {
  // The confidence is the whole of the label: change this one word to `primary-verified` and every
  // cap computed from a forecast wage level starts claiming the ATO published it, while every
  // figure stays to the cent where it was. The behaviour tests above catch it; this catches it in
  // the text as well, and it must read the RAW file because `executableCode` blanks string literals.
  assert.equal([...RAW.matchAll(/confidence: 'unverified'/g)].length, 1, 'the derived-index confidence line has moved or multiplied');
  assert.match(RAW, /indexNumber: anchor\.value \* \(1 \+ wageGrowthRate\) \*\* years/);
  assert.match(RAW, /confidence: anchor\.confidence,/, 'the anchor year no longer carries the RECORD\'s own confidence');
  // The rate is not defaulted anywhere: a defaulted nil would be this module forecasting flat wages
  // on the user's behalf, which is the one thing a Setting may never have done for it.
  assert.doesNotMatch(RAW, /wageGrowthRate\s*(:|\?:)?\s*number\s*=/, 'the wage growth rate has acquired a default');
});
