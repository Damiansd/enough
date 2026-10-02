// P7 (pure half) — `monthsToSeries.ts`, over the committed demo Scenario in
// `src/app/demoHousehold.ts`. No renderer exists yet and none is tested here: this file is the
// whole of the guarantee that the numbers handed to whichever renderer wins cannot lie.
//
// It is written against four specific ways a wealth chart can mislead:
//
//   1. **`accessibleAssets` STACKED AS A THIRD BAND.** `protectedAssets + assessableAssets` is
//      total wealth; `accessibleAssets` cross-cuts both (the younger partner's exempt super is
//      protected AND unreachable, an Account-Based Pension is assessable AND reachable). Stacking
//      all three draws every reachable dollar twice and prints a total larger than the Household
//      owns — while looking exactly as authoritative as a correct chart. §3 sweeps the whole
//      returned shape, by key name AND by value, for any field that adds them.
//   2. **THE CONTINGENCY FLOOR HARD-CODED.** concept.md names $100k as a default and `outcomes.ts`
//      deliberately made it a required positional argument with no Settings field. §4 asserts the
//      argument is required (by arity, which a default value changes) and that two different floors
//      really do produce two different charts.
//   3. **A MARKER OFF BY ONE, OR INVENTED.** §5 re-derives the Shortfall Age month from the
//      `Unfunded shortfall` line itself — not from `shortfallAge`, which the module calls — and
//      checks the month BEFORE it is funded. It also asserts no marker was produced from
//      `pensionOnlyAge`, which raises `RangeError` on this walk and must not be swallowed.
//   4. **A DEGENERATE SERIES PROVING NOTHING.** §1 is the vacuity control and states the fixture's
//      real figures: a flat, all-zero or marker-less walk would make most of the rest pass forever.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { AGE_PENSION_LINE, project, SHORTFALL_LINE } from '../dist/core/projection.js';
import { contingencyFloorAt, contingencyFloorBreach, pensionOnlyAge, shortfallAge, statedContingencyFloor } from '../dist/core/outcomes.js';
import { financialAssets, splitAssets } from '../dist/core/household.js';
import { DEMO_ENTRIES, DEMO_HOUSEHOLD, DEMO_SETTINGS } from '../dist/app/demoHousehold.js';
import {
  BAND_LABELS,
  MARKER_LABELS,
  OVERLAY_LABELS,
  PENSION_ONLY_NEVER_NOTE,
  PENSION_ONLY_UNCOMPUTABLE_NOTE,
  monthsToSeries,
} from '../dist/app/monthsToSeries.js';
import { toCents } from '../dist/core/money.js';

// The Age Pension age rules, and the notes for a Person who gets none, are on every walk (one per
// Person). They have their own file, test/app-age-pension-age-lines.test.mjs; the tests here are
// about the OTHER markers and notes, so they read past them.
const others = (markers) => markers.filter((m) => m.key !== 'agePensionAge');
const otherNotes = (notes) => notes.filter((n) => !n.includes('Age Pension age'));

/**
 * ⚠️ **FROM 2026-09-23 EVERY WALK IN THIS FILE THAT STARTS FROM THE DEMO PLAN KEEPS DANA'S ACCOUNT OUT
 * OF THE SWITCH AT RETIREMENT — and every figure pinned below is UNCHANGED, which is the proof that
 * an opted-out plan walks exactly as it did before the switch existed.** As committed, her RETIRE
 * (2031-05-14, at 63) turns her accumulation account into an account-based pension, which is assessed
 * at any age: the protected band would end in 2031-05 and the "released but still exempt" run this
 * file's §2 is built on would not exist. This file is about the SHAPES a series can take, and the
 * kept-out walk is the one that has all of them. The committed plan's own shape is asserted in §1's
 * last test, and its marker move is re-derived in `app-chart-config.test.mjs`.
 */
const KEPT_OUT = {
  ...DEMO_HOUSEHOLD,
  persons: [
    { ...DEMO_HOUSEHOLD.persons[0], superInterests: DEMO_HOUSEHOLD.persons[0].superInterests.map((i) => ({ ...i, keepInAccumulationAtRetirement: true })) },
    DEMO_HOUSEHOLD.persons[1],
  ],
};
const MONTHS = project(DEMO_SETTINGS, KEPT_OUT, DEMO_ENTRIES);
const COMMITTED_MONTHS = project(DEMO_SETTINGS, DEMO_HOUSEHOLD, DEMO_ENTRIES);

/**
 * **THE DEMO PLAN WITH ONE FIGURE RAISED, AND IT IS HERE BECAUSE OF WATERFALL LIMB 5 (2026-09-19).**
 * The committed demo used to fall short in 301 of its 501 months beside Dana's released super;
 * limb 5 spends that balance, so the demo walk now funds every month of itself and has no
 * Shortfall Age to mark. §5's marker assertions are measured on the same Household, the same dates
 * and the same horizon with the spending level raised from $84,000 to $120,000 a year — one
 * figure, stated here in the test, where a personal financial figure belongs.
 *
 * ⚠️ **THE COMMITTED DEMO FALLS SHORT AGAIN FROM 2026-09-21 (register O85) — in 150 months, from
 * 2055-12 — so this fixture is no longer the only one here with a marker.** It is kept, and kept at
 * $120,000, because it is still the SEPARATE fixture: the two walks now mark at 2044-07 and 2055-12,
 * eleven years apart, so an assertion about one cannot be satisfied by the other. A fixture that
 * differed from the committed plan in nothing but its name would be the vacuity this file's header
 * is written against.
 *
 * ⚠️ **AND FROM 2026-09-23 THE COMMITTED DEMO DOES NOT FALL SHORT AGAIN**: the Age Pension indexes on
 * the plan's own growth rates, and the demo couple never runs out. This fixture marks at 2047-10 and
 * is once more the only one here that does.
 */
const SHORT_MONTHS = project(
  DEMO_SETTINGS,
  KEPT_OUT,
  DEMO_ENTRIES.map((entry) => (entry.type === 'SPEND_CHANGE' ? { ...entry, params: { annualSpend: 120_000_00 } } : entry)),
);

/** $100k — concept.md's DEFAULT, written here in the test because the module must not know it. */
const FLOOR_100K_CENTS = 100_000_00;
/** A floor this walk really does breach. The minimum reachable figure is $674,727.25 (§1). */
const FLOOR_700K_CENTS = 700_000_00;

/**
 * **The floor as a PLAN states it (P4-14).** It is `Settings.contingencyFloor`, in today's money,
 * and it travels with the date it is stated at and the CPI that raises it to a later month's price
 * level — built through `statedContingencyFloor` so these fixtures use the door the page uses.
 */
const floorOf = (cents, settings = DEMO_SETTINGS) =>
  statedContingencyFloor({ ...settings, contingencyFloor: cents });

const FLOOR_100K = floorOf(FLOOR_100K_CENTS);
const FLOOR_700K = floorOf(FLOOR_700K_CENTS);

/** The demo plan's own Age Pension series, which is ABSENT — passed explicitly, never omitted. */
const DEMO_AGE_PENSION_SERIES = DEMO_SETTINGS.economicSeries.agePension;

const SERIES = monthsToSeries(MONTHS, DEMO_HOUSEHOLD, FLOOR_100K, DEMO_AGE_PENSION_SERIES);
const SERIES_700K = monthsToSeries(MONTHS, DEMO_HOUSEHOLD, FLOOR_700K, DEMO_AGE_PENSION_SERIES);

// --- The §5b fixture: a plan that CAN be asked for a Pension-Only Age ----------------------------
//
// The demo plan cannot (no forward series), so a second Household is stated here — the one
// `test/core-outcomes-pension-only-age.test.mjs` §1 works by hand, restated rather than imported so
// that this file's assertions do not move when that file's do. The series is SYNTHETIC and says so:
// four stated growth paths, no published figure in it, and it exercises machinery rather than
// asserting anything about the world (the register publishes nothing past 19 March 2027).
const pensionSeries = (lastYear) => {
  const rateIndexations = [];
  const meansTestIndexations = [];
  let mtawe = 107_000;
  for (let year = 2027; year <= lastYear; year += 1) {
    for (const month of ['03-20', '09-20']) {
      mtawe *= 1.0175;
      rateIndexations.push({
        effective: `${year}-${month}`,
        cpi: 1.0125,
        pblci: 1.011,
        annualisedMtawe: toCents(Math.round(mtawe)),
      });
    }
    meansTestIndexations.push({ effective: `${year}-07-01`, cpiMarchQuarter: 1.025, cpiDecemberQuarter: 1.0245 });
  }
  return { rateIndexations, meansTestIndexations };
};
const PENSION_SERIES = pensionSeries(2075);

const pensionPerson = (name, dateOfBirth, over = {}) => ({
  name,
  dateOfBirth,
  // P6-8 brief 3 chunk 2b: the employer Superannuation Guarantee has to land in a NAMED account,
  // so a salaried Person holds one and the walk refuses a salary with nowhere to pay it. A NIL
  // balance is the smallest change that makes the fixture honest: it moves no figure of its own.
  superInterests: [{ phase: 'accumulation', balance: toCents(0) }],
  parcels: [],
  employmentIncomePerFortnight: toCents(0),
  workBonusBalance: toCents(0),
  ...over,
});

/** Sam holds a $240,000 Account-Based Pension and a $140,000 parcel; Ali holds nothing at all. */
const PENSION_COUPLE = {
  persons: [
    pensionPerson('Sam', '1956-06-15', {
      superInterests: [
        {
          phase: 'accountBasedPension',
          balance: toCents(240_000),
          statedStreamSettings: { commencementDay: '2024-07-01' },
        },
      ],
      parcels: [{ acquired: '2014-03-10', costBase: toCents(70_000), marketValue: toCents(140_000) }],
    }),
    pensionPerson('Ali', '1952-11-20'),
  ],
  homeStatus: 'occupied',
};

const PENSION_SETTINGS = {
  asAtDate: '2026-07-01',
  planningHorizonAge: 80,
  // ⚠️ **`cpi: 0` FROM 2026-09-21 (register O85), AND IT IS THE ALGEBRAIC CONTROL.** The stated
  // spending level is REAL now and `project()` raises it to each month's price level, so at 2.5%
  // this fixture ran out four months sooner and the hand-worked "$317.69 of parcel proceeds left in
  // 2030-06" that §5b's two marker tests turn on stopped being true. At nil the factor is exactly 1
  // in every month and those figures are what they were. The demo walk in this same file carries
  // the live rate, so nothing here is hidden by the choice.
  economicSeries: { cpi: 0, pblci: 0.025, awote: 0.035, mtawe: 0.035, agePension: PENSION_SERIES },
  deemingRates: { lower: 0.0175, upper: 0.0375 },
  nominalReturn: 0.065,
};

const pensionEntry = (id, type, params) => ({
  id,
  date: '2026-07-01',
  owner: 'household',
  type,
  params,
  enabled: true,
  createdAt: '2026-06-01',
});

/** $160,000 a year against $380,000 of assets: this Household runs out, and then lives on the pension. */
const PENSION_MONTHS = project(PENSION_SETTINGS, PENSION_COUPLE, [
  pensionEntry('spend-160k', 'SPEND_CHANGE', { annualSpend: toCents(160_000) }),
]);

/** The SAME couple and the SAME series, spending $24,000 a year: covered, and never pension-only. */
const RICH_MONTHS = project(PENSION_SETTINGS, PENSION_COUPLE, [
  pensionEntry('spend-24k', 'SPEND_CHANGE', { annualSpend: toCents(24_000) }),
]);

const SOURCE = readFileSync(
  join(resolve(dirname(fileURLToPath(import.meta.url)), '..'), 'src', 'app', 'monthsToSeries.ts'),
  'utf8',
);
/** The source with every comment stripped — prose about a renderer is not a renderer. */
const CODE = SOURCE.replaceAll(/\/\*[\s\S]*?\*\//g, '').replaceAll(/\/\/.*$/gm, '');

const protectedOf = MONTHS.map((m) => m.protectedAssets);
const assessableOf = MONTHS.map((m) => m.assessableAssets);
const accessibleOf = MONTHS.map((m) => m.accessibleAssets);
const totalWealthOf = MONTHS.map((m) => m.protectedAssets + m.assessableAssets);
/** P9-1, slice 2 — read straight off `Month.heasDebt`. All zero here: this fixture holds no `HEAS_DRAW`. */
const heasDebtOf = MONTHS.map((m) => m.heasDebt ?? 0);

/** Every value in the returned shape, with the path that reached it. No key and no depth is exempt. */
const walkValues = function* (value, path = '$') {
  yield [path, value];
  if (Array.isArray(value)) {
    for (const [i, item] of value.entries()) yield* walkValues(item, `${path}[${i}]`);
  } else if (value !== null && typeof value === 'object') {
    for (const [key, item] of Object.entries(value)) yield* walkValues(item, `${path}.${key}`);
  }
};

const numericSeriesIn = (value) =>
  [...walkValues(value)].filter(
    ([, v]) => Array.isArray(v) && v.length === MONTHS.length && v.every((n) => typeof n === 'number'),
  );

// --- §1 The vacuity control: what this fixture ACTUALLY produces ---------------------------------

test('THE COMMITTED DEMO, WITH THE SWITCH: the protected band ends at the RETIRE, and nothing is released-but-exempt', () => {
  // The kept-out walk above and the committed one are the same walk up to Dana's RETIRE month.
  const switchedFrom = COMMITTED_MONTHS.findIndex((m) => m.month === '2031-06');
  assert.deepEqual(COMMITTED_MONTHS.slice(0, switchedFrom - 1).map((m) => m.protectedAssets), MONTHS.slice(0, switchedFrom - 1).map((m) => m.protectedAssets));
  // Her account is an account-based pension from 2031-06 (the RETIRE is mid-May), and a pension is
  // assessed at any age, so the protected band ends 48 months before her 67th: 57 months, not 105.
  const protectedMonths = COMMITTED_MONTHS.filter((m) => m.protectedAssets > 0).map((m) => m.month);
  assert.equal(protectedMonths.length, 57);
  assert.equal(protectedMonths.at(-1), '2031-05');
  assert.equal(105 - 57, 7 + 36 + 5, '2031-06 to 2035-05 inclusive');
  // And the 48-month run in which reachable money exceeded assessable money — released by the
  // RETIRE, still exempt until 67 — does not exist: released and assessed arrive the same month.
  assert.equal(COMMITTED_MONTHS.filter((m) => m.accessibleAssets > m.assessableAssets).length, 0);
});

test('the demo walk is long, and neither band is flat or nil across it', () => {
  assert.equal(MONTHS.length, 501, 'the demo walk changed length — every figure below was measured on 501 months');
  assert.equal(MONTHS[0].month, '2026-09');
  assert.equal(MONTHS.at(-1).month, '2068-05');
  // Protected: Dana's Accumulation Phase super, exempt until she reaches Age Pension age. It is
  // NIL for most of the walk, and that is the fixture's real shape rather than a broken series.
  assert.equal(protectedOf.filter((c) => c > 0).length, 105, 'the protected band no longer runs for 105 months');
  assert.equal(MONTHS.filter((m) => m.protectedAssets > 0).at(-1).month, '2035-05');
  // **$768,317.49 where it was $711,093.57, and the $57,223.92 between them is the Superannuation
  // Guarantee (P6-8 brief 3, chunk 2b), re-derived rather than re-pasted.** Dana is paid $3,100 a
  // fortnight and her employer pays 12% of it, less the fund's 15%: $685.10 a month, in each of the
  // 56 months from 2026-09 to 2031-04 that she works. Compounded at the walk's 6.5% to the peak
  // month 2035-05 — ⌊Σ 68,510 × (1.065)^((103 − k)/12)⌋ — that is $57,223.95, three cents above the
  // observed figure, which is the monthly floor-to-the-cent the walk applies and this sum does not.
  // ⚠️ **AND $768,713.46 SINCE THE RETIREMENT MONTH PAYS ITS DAYS WORKED (2026-09-23), $395.97 MORE.**
  // Dana's RETIRE is 2031-05-14, so May 2031 pays 14/31 of her month and its Guarantee: 12% of
  // $3,033.33 less the fund's 15% = $309.40, grown 47 months at 6.5% to the peak's opening:
  // $309.40 × 1.065 ^ (47/12) = $395.95, two cents under the walk's month-by-month rounding.
  // ⚠️ **AND $773,299.79 SINCE PAY RISES WITH WAGES (2026-09-23), $4,586.33 MORE.** Dana's $3,100 a
  // fortnight is in September 2026's wages and rises 3.5% a year every month she works, so month k's
  // Guarantee is 12% of $80,600 × 1.035 ^ (k/12), less the fund's 15% — and each month's EXTRA over
  // the flat $685.10, compounded at 6.5% to the peak, sums to $4,586.46 (May 2031's 14/31 included),
  // thirteen cents off the observed figure for the same month-by-month rounding.
  const extraGuarantee = Array.from({ length: 57 }, (_, k) => {
    const share = k === 56 ? 14 / 31 : 1;
    const credit = (annual) => Math.round(Math.round(Math.round(annual * share) * 0.12 / 12) * 0.85);
    return (credit(Math.round(8_060_000 * 1.035 ** (k / 12))) - credit(8_060_000)) * 1.065 ** ((103 - k) / 12);
  }).reduce((a, b) => a + b, 0);
  assert.ok(Math.abs(extraGuarantee - (773_299_79 - 768_713_46)) <= 25, `the move is not the size the rising Guarantee predicts: ${extraGuarantee}`);
  assert.equal(Math.max(...protectedOf), 773_299_79);
  assert.equal(768_317_49 - 711_093_57, 57_223_92);
  assert.ok(Math.abs(Math.round(30_940 * 1.065 ** (47 / 12)) - (768_713_46 - 768_317_49)) <= 5);
  // ⚠️ **ASSESSABLE REACHES NIL FROM 2056-01, AND THAT IS REGISTER O85 (2026-09-21).** This line
  // used to read *"never nil, and it moves by a factor of two across the walk"*. The stated spending
  // level is a REAL figure now — $84,000 of 2026 buying power, not $84,000 of banknotes — so the
  // demo household's target reaches $14,413.56 a month by 2055 and its money runs out in 2055-12.
  // The band is positive in 352 months and nil in the 149 that follow, and both halves are asserted,
  // because a band that were nil throughout would satisfy any "hits nil somewhere" claim.
  // ⚠️ **AND IT NO LONGER DOES, SINCE 2026-09-23.** A plan with no series now INDEXES the Age
  // Pension on its own growth rates instead of carrying the 2026 sets for forty years. From the late
  // 2030s the basic rate follows the MTAWE floor at 3.5% a year while the target rises at 2.5%, and
  // the assets-test cut-off rises with the rate, so the demo couple is paid in 495 months rather than
  // 435 and far more in the late ones: the band is positive in all 501 months and its minimum is
  // $581,403.16, at 2035-05 — the last month Dana's super is exempt, before it joins this band. The
  // paragraphs below are the record of the nil tail and are kept for what each move says.
  // ⚠️ **AND $594,710.00 SINCE INTEREST ON CASH (2026-09-23), $13,306.84 MORE, SAME MONTH.** The
  // running cash earns the plan's 2.5% CPI now: $13,730.12 of interest by 2035-05, less $1,144.95 of
  // extra income tax (almost all of it Dana's, at 32%, while she works). What is left displaces
  // pension draws and compounds at 6.5%, less a few dollars a month of assets-tested Age Pension —
  // the same order as the net $12,585.17, and higher, as compounding makes it.
  assert.equal(581_403_16, 581_403_16, 'the pre-interest minimum, kept beside the new one');
  // ⚠️ **AND $607,271.38 SINCE "SPEND CASH FIRST" (2026-09-23), $12,561.38 MORE, SAME MONTH.** The
  // demo owes no home loan, so its cash is spent straight after Ash's pension minimum — gone by
  // 2032-04 — and the parcels and the pension above its minimum, which earn 6.5% where the cash
  // earned 2.5%, are drawn later. Eight and a half years of that difference in return on the cash
  // that used to sit idle is the size of the move.
  assert.equal(594_710_00, 594_710_00, 'the pre-order minimum, kept beside the new one');
  // ⚠️ **AND $609,052.80 SINCE DANA'S RETIREMENT MONTH PAYS HER DAYS WORKED (2026-09-23), $1,781.42
  // MORE, SAME MONTH.** May 2031's pay, less its tax and the $445.21 of Age Pension the income test
  // takes for it, is $2,461.52 Ash's pension did not draw; July's true-up refunds $845.01 less; the
  // $1,616.51 left sits in this band from then on and grows at 6.5%, less the pension the assets test
  // takes for it in the months that test binds: between ~$1,541 (7.8% a year taken in all 47 months)
  // and ~$2,068 (none). May's Guarantee is in the protected band, not this one.
  assert.equal(607_271_38, 607_271_38, 'the pre-retirement-month-pay minimum, kept beside the new one');
  // ⚠️ **AND $624,707.58 SINCE PAY RISES WITH WAGES (2026-09-23), $15,654.78 MORE, SAME MONTH.** To
  // 2035-05 the flows that moved are, to the cent: $31,818.42 more salary, $10,254.29 more tax and
  // $9,732.90 less Age Pension for it; $3,245.51 more Guarantee and $1,340.82 more growth on it in
  // Dana's super; $3,006.67 more growth and $816.88 more interest on what the rest left. That is
  // $20,241.11 more wealth, of which the Guarantee and its growth ($4,586.33) are in the protected
  // band — the peak above — and the other $15,654.78 is here.
  assert.equal(3_181_842 - 1_025_429 - 973_290 + 324_551 + 134_082 + 300_667 + 81_688, 2_024_111);
  assert.equal(2_024_111 - (773_299_79 - 768_713_46), 1_565_478);
  assert.equal(609_052_80, 607_271_38 + 178_142, 'the pre-wage-growth minimum, kept beside the new one');
  // ⚠️ **AND $624,738.98 SINCE THE ASSETS-TEST FLOOR (T135, 2026-09-24), $31.40 MORE, SAME MONTH.**
  // SS Act 1064-G7 floors the combined assets excess to the nearest $500 before the $3/$1,000 taper
  // runs, and flooring it DOWN can only leave the reduction the same or smaller — never larger — so
  // every month up to 2035-05 in which the assets test bound paid the same or more. This is the sum
  // of 104 such months compounding at 6.5%: not hand-derivable to the cent from a single month's
  // bound (≤ $1.50/fortnight/couple direct effect), only the sign is, and the sign is up.
  // ⚠️ **AND $6,908.70 LOWER SINCE DIV 119 (LR-1 slice 3, 2026-09-29), SAME MONTH.** Dana's sales
  // from 2033-01 pay the minimum tax — $6,570.64 by 2035-04 on this walk — and each sale grows by
  // exactly its tax. Each tax, grown at 6.5% from its own month to 2035-05, is $7,062.29; the extra
  // Age Pension the lower assets earn meanwhile, grown, is $152.79. That predicts $6,909.50.
  assert.equal(Math.min(...assessableOf), 609_052_80 + 1_565_478 + 3_140 - 690_870);
  assert.equal(-706_229 + 15_279, -690_950);
  assert.equal(MONTHS[assessableOf.indexOf(609_052_80 + 1_565_478 + 3_140 - 690_870)].month, '2035-05');
  // ⚠️ **EVERY MONTH BELOW MOVED ONE MONTH EARLIER ON 2026-09-21 (P10-5), BY ONE MECHANISM.** The demo
// plan is stated as at 1 September, and until that day the engine paid no Account-Based Pension
// minimum before the following 1 July — a nil with no clause behind it in SIS Reg Sch 7. Ash's
// pension now pays its opening part-year, that money is drawn and spent ten months sooner, and every
// exhaustion downstream of it arrives a month sooner: the shortfall marker, the Pension-Only marker,
// the Offset's emptying and the nil tail all shift by exactly one, and by the same one.
  assert.equal(351, 351, 'the pre-2026-09-23 count of positive months, kept beside the new one');
  assert.equal(assessableOf.filter((c) => c > 0).length, 501);
  // ⚠️ **EVERY ASSESSABLE FIGURE IN THIS TEST ROSE ON 2026-09-21 (P4-1e), AND ONE MECHANISM MOVES
  // ALL OF THEM: the demo couple is paid an Age Pension in 99 of these 501 months instead of 1.**
  // The pension pays part of the $7,000 monthly target, so less capital is drawn, so more of it is
  // left compounding at 6.5% — and the effect grows with the walk, which is why the minimum moves
  // by $77,664.80 and the maximum by $325,128.03. The superseded figures are kept beside each.
  assert.equal(558_585_20, 558_585_20, 'the pre-P4-1e minimum, kept beside the new one');
  assert.equal(636_250_00, 636_250_00, 'the pre-O85 minimum, kept beside the new one — the band reaches nil now');
  // **$1,269,008.15 where it was $5,681,503.87, and limb 5 is the whole of the difference**
  // (2026-09-19): from 2043-05 the household draws its spending out of Dana's released super
  // instead of reporting an `Unfunded shortfall` beside it, so the balance that used to compound
  // untouched for twenty-five years is spent. The money is not lost — it was never really there.
  assert.equal(5_681_503_87, 5_681_503_87, 'the pre-limb-5 maximum, kept beside the new one');
  // **$1,326,533.17 since chunk 2b**, $57,525.02 above the figure beside it — the Guarantee Dana's
  // employer paid, arriving in the assessable band once she reaches Age Pension age and her
  // Accumulation Phase interest stops being exempt. It is the same $57,223.92 the protected peak
  // above carries, plus the months of compounding between the two peaks.
  assert.equal(1_269_008_15, 1_269_008_15, 'the pre-Guarantee maximum, kept beside the new one');
  assert.equal(1_326_533_17, 1_326_533_17, 'the pre-P4-1e maximum, kept beside the new one');
  // **AND $1,317,434.62 SINCE REGISTER O85, AT 2035-06 RATHER THAN AT THE LAST MONTH.** The peak has
  // moved from the end of the walk to the month Dana's super stops being exempt, which is the shape
  // of a drawdown: wealth rises to the month the household stops saving and falls from there. The
  // peak itself is $334,227.58 lower than it was because every month before it spent a target rising
  // at 2.5% a year — by 2035 the bill is $9,972.57 against $7,000.00 flat, and the money not spent
  // is the money that used to compound into this figure.
  assert.equal(1_651_662_20, 1_651_662_20, 'the pre-O85 maximum, kept beside the new one');
  // ⚠️ **AND IT MOVED AGAIN ON THE SAME DAY (P10-5).** The demo plan is stated as at 1 September,
  // and until then the engine paid no Account-Based Pension minimum before the following 1 July — a
  // nil with no clause behind it in SIS Reg Sch 7. Ash's pension pays its opening part-year now, so
  // that money is drawn and spent ten months sooner and every exhaustion downstream arrives one
  // month sooner. The superseded figure is kept beside the new one, as every other move here is.
  // Here it costs $3,408.27 of the peak: the money Ash's pension pays out ten months early stops
  // compounding inside super for nine years. A quarter of a percent, and in the direction the
  // mechanism predicts.
  assert.equal(1_317_434_62, 1_317_434_62, 'the pre-P10-5 maximum, kept beside the new one');
  // ⚠️ **AND $36,104.42 HIGHER SINCE 2026-09-23, at the same month.** The indexed pension pays Ash
  // more in every month from 2027-04 — the rate rises by √1.025 a half-year and the 1 July free
  // areas rise with CPI, where both stood still — so limbs 2 to 4 draw less for eight years and
  // what they leave compounds into the peak. The direction the mechanism predicts, and the same peak
  // month: Dana's super still joins the band in 2035-06.
  assert.equal(1_314_026_35, 1_314_026_35, 'the pre-2026-09-23 maximum, kept beside the new one');
  // ⚠️ **AND $13,491.74 HIGHER WITH INTEREST ON CASH (2026-09-23), at the same month** — the
  // $13,306.84 the §1 minimum moved by at 2035-05, one month on: the month's interest and the
  // growth on what it spared.
  assert.equal(1_350_130_77, 1_350_130_77, 'the pre-interest maximum, kept beside the new one');
  // ⚠️ **AND $12,831.82 HIGHER WITH "SPEND CASH FIRST" (2026-09-23), at the same month** — the
  // $12,561.38 the §1 minimum moved by at 2035-05, one month on: the cash spent first leaves the
  // 6.5% pools to grow longer.
  assert.equal(1_363_622_51, 1_363_622_51, 'the pre-order maximum, kept beside the new one');
  // ⚠️ **AND $2,187.45 HIGHER SINCE DANA'S RETIREMENT MONTH PAYS HER DAYS WORKED (2026-09-23)** — the
  // $1,781.42 the §1 minimum moved by at 2035-05, plus May 2031's Guarantee ($395.97 there) joining
  // the band with the rest of her super, plus the month's growth on both.
  // ⚠️ **AND $20,335.30 HIGHER AGAIN SINCE PAY RISES WITH WAGES (2026-09-23)** — the $20,241.11 of
  // extra wealth the §1 minimum decomposed at 2035-05, all of it in this band once Dana's super joins
  // it, plus the month's growth on it.
  // ⚠️ **AND $31.55 HIGHER WITH THE ASSETS-TEST FLOOR (T135, 2026-09-24), AT THE SAME MONTH** — the
  // same mechanism as the §1 minimum above, one month on and compounded one month further.
  // ⚠️ **AND $7,481.37 LOWER SINCE DIV 119 (LR-1 slice 3, 2026-09-29), AT THE SAME MONTH** — the
  // §1 minimum's mechanism one month on, with May 2035's $538.90 of minimum tax: predicted $7,482.20.
  assert.equal(Math.max(...assessableOf), 1_376_454_33 + 218_745 + 2_033_530 + 3_155 - 748_137);
  assert.equal(1_376_454_33 - 1_363_622_51, 12_831_82);
  assert.equal(1_363_622_51 - 1_350_130_77, 13_491_74);
  assert.equal(1_350_130_77 - 1_314_026_35, 36_104_42);
  assert.equal(1_317_434_62 - 1_314_026_35, 3_408_27);
  assert.equal(MONTHS[assessableOf.indexOf(Math.max(...assessableOf))].month, '2035-06');
  assert.ok(Math.max(...assessableOf) < 5_681_503_87, 'the released super was not spent');
  // Neither series is monotone: a chart of a line that only rises would demonstrate nothing.
  const falls = (xs) => xs.filter((x, i) => i > 0 && x < xs[i - 1]).length;
  // **145 months of falling wealth became 444**, for the same reason: a walk that spends its
  // capital falls in nearly every month, where one that reported a debt instead only fell when the
  // cash it could reach fell.
  //
  // ⚠️ **AND 444 BECAME 12 ON 2026-09-21 (P4-1e), WHICH IS THE LARGEST SINGLE MOVE THE STANDING
  // TABLE MADE ANYWHERE IN THIS SUITE.** With an Age Pension payable in 99 months the demo
  // Household's income covers most of its spending, so its wealth compounds instead of draining:
  // total wealth now falls in twelve months of five hundred. The series is still not monotone —
  // twelve falls is what this assertion exists to require — but the shape of the fixture has
  // changed from a drawdown to a slow accumulation, and a reader of the figures below should know
  // that before wondering why they are all larger.
  //
  // ⚠️ **AND 12 BECAME 284 ON 2026-09-21 (register O85), WHICH REVERSES THE PARAGRAPH ABOVE.** A
  // spending target that rises with prices outruns the Age Pension that had turned this fixture into
  // an accumulation, and the shape is a drawdown again: total wealth falls in 284 months of 501,
  // rises in the years Dana is still paid, and reaches nil in 2056-01. Three readings of one fixture
  // — 145, 444, 12, 284 — and each one names its own cause, which is why none of them is deleted.
  assert.equal(444, 444, 'the pre-P4-1e count, kept beside the new one');
  assert.equal(12, 12, 'the pre-O85 count, kept beside the new one');
  assert.equal(284, 284, 'the pre-P10-5 count, kept beside the new one');
  // **292 since P10-5**: Ash's pension draws every month of the opening part-year now, where it drew
  // nothing at all, so eight more months of the walk close below where they opened.
  // **210 since 2026-09-23**: the indexed pension pays more of every month's bill from the late 2030s
  // on, so wealth falls in 82 fewer months — and it never reaches nil, so there is no tail of nil
  // months either.
  assert.equal(292, 292, 'the pre-2026-09-23 count, kept beside the new one');
  // **213 with interest on cash (2026-09-23)**: three months — 2052-08, 2053-02 and 2053-07 — rose by
  // $22.33, $2.48 and $11.35 without it. The household holds about $17,000 more by then, so the
  // assets test pays about $113 a month less, while the extra capital earns about $90 a month at
  // 6.5%; a net $20-odd a month turns those three hair's-breadth rises into small falls.
  assert.equal(210, 210, 'the pre-interest count, kept beside the new one');
  // **215 with "spend cash first" (2026-09-23)**, by the same kind of month: 2053-01 and 2053-06 rose
  // by $7.10 and $16.40 and now fall by $23.74 and $14.25. The household holds about $23,000 more
  // there, so the assets test pays about $150 a month less, which the extra capital's return does
  // not quite cover in those two months.
  assert.equal(213, 213, 'the pre-order count, kept beside the new one');
  // **218 since pay rises with wages (2026-09-23)**, by the same kind of month again: 2052-12,
  // 2053-05 and 2054-04 rose by $1.80, $11.54 and $6.01 and now fall by $18.32, $8.40 and $13.66. The
  // household holds about $15,500 more there — the pay Dana banked, grown — so the assets test pays
  // about $100 a month less, which the extra capital's ~$85 a month of return does not cover.
  assert.equal(215, 215, 'the pre-wage-growth count, kept beside the new one');
  assert.equal(falls(totalWealthOf), 218, 'total wealth no longer falls in 218 months of the walk');
  assert.ok(falls(totalWealthOf) > 0, 'a series that only ever rises would demonstrate nothing');
  assert.ok(falls(totalWealthOf) < MONTHS.length, 'and a series that only ever falls would demonstrate as little');
  // **445 became 444 at P4-11 (2026-09-19), and the one month that stopped falling is 2031-06.**
  // Dana's `RETIRE` is dated 2031-05-14, so `gainfulEmploymentAsAt` reports her still employed on
  // 2031-05-01 and ceased on 2031-06-01; her $555,658.04 accumulation balance joins the reachable
  // figure in that one step, which turns that month's ordinary fall into a rise. Total wealth is
  // untouched above, which is the point: `accessibleAssets` is a REPORTED cross-cut, not a driver.
  assert.equal(445, 445, 'the pre-P4-11 count, kept beside the new one');
  assert.equal(444, 444, 'the pre-P4-1e count, kept beside the new one');
  assert.equal(13, 13, 'the pre-O85 count, kept beside the new one');
  // 285 rather than 284: the reachable series carries the one extra fall total wealth does not, for
  // the same reason it did when the counts were 13 and 12 — the two series are read on different
  // clocks (ADR-0005) and the cessation step is in one of them only.
  assert.equal(285, 285, 'the pre-P10-5 count, kept beside the new one');
  assert.equal(293, 293, 'the pre-2026-09-23 count, kept beside the new one');
  // **214 with interest on cash (2026-09-23)**: the same three hair's-breadth months as total wealth
  // above, each one month earlier — 2052-07, 2053-01, 2053-06 — because this series is read at the
  // CLOSE and that one at the opening. So the difference of one survives it.
  assert.equal(211, 211, 'the pre-interest count, kept beside the new one');
  // **216 with "spend cash first" (2026-09-23)**: the two months total wealth gained above, each one
  // month earlier on this clock, so the difference of one survives that too.
  assert.equal(214, 214, 'the pre-order count, kept beside the new one');
  // **215 since Dana's retirement month pays her days worked (2026-09-23), and the difference of one
  // is gone.** 2031-05 fell by $2,459.53 on this clock — the month's bill, drawn out of Ash's pension
  // with no pay coming in — and now 14/31 of her month's pay meets it and the month closes $1.99 up.
  assert.equal(216, 216, 'the pre-retirement-month-pay count, kept beside the new one');
  // **218 since pay rises with wages**: the three months total wealth gained above, each one month
  // earlier on this clock (2052-11, 2053-04, 2054-03), so the difference stays nil.
  assert.equal(falls(accessibleOf), 218);
  assert.equal(falls(accessibleOf) - falls(totalWealthOf), 0);
  // And $336.82 up since pay rises with wages (2026-09-23): May's 14/31 is of the RAISED salary,
  // $3,561.57 rather than $3,033.33, and after $95.25 more tax, $143.06 less Age Pension for it, and
  // $19.08 more interest and $27.59 more growth on the larger balances, that is $336.60 more — the
  // $334.83 the step moved by, to within $1.77.
  assert.equal(52_824 - 9_525 - 14_306 + 1_908 + 2_759, 33_660);
  assert.equal(accessibleOf[MONTHS.findIndex((m) => m.month === '2031-05')] - accessibleOf[MONTHS.findIndex((m) => m.month === '2031-04')], 199 + 33_483);
  assert.ok(accessibleOf[MONTHS.findIndex((m) => m.month === '2031-06')] > accessibleOf[MONTHS.findIndex((m) => m.month === '2031-05')], 'the reachable series does not step up at Dana’s cessation');
});

test('the reachable overlay is a DIFFERENT series from either band, in both directions', () => {
  // The cross-cut, measured. If `accessibleAssets` tracked one of the bands, the overlay would be
  // decoration and requirement 1 would be arguing about nothing.
  // **Reachable is now BELOW total in every one of the 501 months, where it used to equal it in
  // 300 — and the gap in those months is exactly one month's spending.** `accessibleAssets` is the
  // household at the month's CLOSE and the bands are the month's OPENING position (ADR-0005), so a
  // month that spends $7,000 closes $7,000 below what it opened with. The 300 months that used to
  // agree were the months the walk reported a shortfall and moved no money at all.
  // ⚠️ **AND 352 OF 501 SINCE REGISTER O85 (2026-09-21), WITH THE OTHER 149 AGREEING AT NIL.** The
  // 300 months that used to agree were months the walk reported a shortfall and moved no money; the
  // 149 that agree now are months in which this household has nothing left to move, which is the
  // same arithmetic arriving by the other road. The gap in a DRAWING month is still exactly the
  // money the household itself had to find — read at 2055-11, the last month that draws: the bill is
  // $14,383.93 (the stated $84,000 raised by 1.025 ^ (350/12)) and $4,043.00 of it arrives as Age
  // Pension, so $10,340.93 comes out of the household's own wealth and the two figures differ by
  // that. The line used to read $7,000.00 flat, in a month where no pension was paid at all.
  assert.equal(201, 201, 'the pre-limb-5 count, kept beside the new one');
  assert.equal(501, 501, 'the pre-O85 count, kept beside the new one');
  // ⚠️ **AND 501 OF 501 AGAIN SINCE 2026-09-23, FOR A THIRD REASON.** The 150 months that agreed at
  // nil were months this household had nothing left; with the Age Pension indexed on the plan's own
  // growth rates it never runs out, so every month spends something it holds and closes below where
  // it opened.
  assert.equal(351, 351, 'the pre-2026-09-23 count, kept beside the new one');
  assert.equal(accessibleOf.filter((c, i) => c < totalWealthOf[i]).length, 501, 'reachable < total in 501 months');
  assert.equal(accessibleOf.filter((c, i) => c === totalWealthOf[i]).length, 0);
  // ⚠️ **AND IT MOVED AGAIN ON THE SAME DAY (P10-5).** The demo plan is stated as at 1 September,
  // and until then the engine paid no Account-Based Pension minimum before the following 1 July — a
  // nil with no clause behind it in SIS Reg Sch 7. Ash's pension pays its opening part-year now, so
  // that money is drawn and spent ten months sooner and every exhaustion downstream arrives one
  // month sooner. The superseded figure is kept beside the new one, as every other move here is.
  // So the LAST month that draws is 2055-10, index 349, and the bill is re-derived at that index
  // rather than the figure being re-read: $84,000 raised by 1.025 ^ (349/12).
  const drawing = MONTHS.findIndex((m) => m.month === '2055-10');
  assert.equal(drawing, 349);
  const lineIn = (month, description) => month.lines.filter((l) => l.description === description).reduce((t, l) => t + l.amount, 0);
  assert.equal(lineIn(MONTHS[drawing], 'Household spending'), 14_354_36);
  assert.equal(Math.ceil(Math.round(8_400_000 * 1.025 ** (349 / 12)) / 12), 14_354_36);
  // The pension beside it was $4,043.00 on the carried 2026 rates — the couple's full combined
  // maximum, frozen — and is $8,759.49 on the indexed ones (2026-09-23): 58 half-years of the MTAWE
  // floor and CPI on the Supplement put the maximum near $9,630, and the assets test takes the rest.
  // ⚠️ **AND $8,646.34 SINCE INTEREST ON CASH (2026-09-23), $113.15 LESS.** The household holds
  // $17,405.77 more assessable assets in this month — interest it banked earlier and the pension
  // balance that interest spared — and the assets test takes $3 a fortnight per $1,000 of it:
  // 17.40577 × 3 × 26 / 12 = $113.14, the cent being the taper's own rounding.
  assert.equal(8_759_49, 8_759_49, 'the pre-interest pension, kept beside the new one');
  // ⚠️ **AND $8,495.41 SINCE "SPEND CASH FIRST" (2026-09-23), $150.93 LESS.** Spending the cash
  // before the 6.5% pools leaves the household holding $23,222.44 more assessable assets here
  // ($1,195,685.21 against $1,172,462.77): 23.22244 × 3 × 26 / 12 = $150.95, the two cents being the
  // taper's own rounding.
  assert.equal(8_646_34, 8_646_34, 'the pre-order pension, kept beside the new one');
  // ⚠️ **AND $8,484.93 SINCE DANA'S RETIREMENT MONTH PAYS HER DAYS WORKED (2026-09-23), $10.48 LESS.**
  // May 2031's pay is money Ash's pension did not draw, so the household holds $1,613.39 more
  // assessable assets here: 1.61339 × 3 × 26 / 12 = $10.49, the cent being the taper's rounding.
  assert.equal(8_495_41, 8_495_41, 'the pre-retirement-month-pay pension, kept beside the new one');
  // ⚠️ **AND $8,386.69 SINCE PAY RISES WITH WAGES (2026-09-23), $98.24 LESS.** What Dana's rising pay
  // left the household is $15,108.95 more assessable assets here: 15.10895 × 3 × 26 / 12 = $98.21,
  // the three cents being the taper's rounding.
  assert.equal(8_484_93, 8_484_93, 'the pre-wage-growth pension, kept beside the new one');
  // ⚠️ **AND $8,385.09 WITH THE ASSETS-TEST FLOOR (T135, 2026-09-24), $1.60 LESS — the direction the
  // paragraphs above do NOT predict, and that is the point of it.** A direct assets-test effect can
  // only raise or hold a given month's rate (flooring the excess DOWN can only shrink the reduction),
  // but this month is not a direct effect: every one of the 349 months before it that the assets test
  // bound paid the same or more under the floor, so the household holds $354.37 MORE assessable
  // assets here (below) than it would have without T135 — enough further into the taper that THIS
  // month's rate is lower. A stepped taper compounding through a stateful walk is not bound by the
  // sign of its own single-month rule.
  // ⚠️ **AND $8,427.34 SINCE DIV 119 (LR-1 slice 3, 2026-09-29), $42.25 MORE.** The minimum tax on
  // Dana's 2033–35 sales leaves the household $6,139.46 less assessable here, and under T135's floor
  // the excess moves in $500 steps: this one crosses 13 of them, 13 × $1.50 a fortnight × 26 / 12.
  assert.equal(8_385_09, 8_385_09, 'the pre-Div 119 pension, kept beside the new one');
  assert.equal(Math.round(13 * 150 * 26 / 12), 4_225);
  assert.equal(lineIn(MONTHS[drawing], 'Age Pension'), 8_385_09 + 4_225);
  assert.equal(assessableOf[drawing] - 117_246_277, 2_322_244 + 161_339 + 1_510_895 + 35_437 - 613_946);
  assert.equal(totalWealthOf[drawing] - accessibleOf[drawing], 14_354_36 - 8_385_09 - 4_225, 'the gap is what the household itself found');
  // **24 became 48 at P4-11 (2026-09-19), and the 24 added months are a single contiguous run
  // whose two ends are both dates in the fixture.** Reachable exceeds assessable exactly while
  // Dana's super is BOTH released AND still exempt from the means test. The run used to open on
  // her 65th (released by age alone: 2033-05-14, so 2033-06) and now opens the month after her
  // `RETIRE` (2031-05-14, so 2031-06); both runs close at 2035-05, when she reaches Age Pension
  // age and the balance moves from the protected band into the assessable one.
  assert.equal(24, 24, 'the pre-P4-11 count, kept beside the new one');
  assert.equal(accessibleOf.filter((c, i) => c > assessableOf[i]).length, 48, 'reachable exceeds assessable in 48 months');
  const exceeds = MONTHS.filter((m, i) => accessibleOf[i] > assessableOf[i]).map((m) => m.month);
  assert.equal(exceeds[0], '2031-06', 'the run no longer opens the month after Dana ceases work');
  assert.equal(exceeds[23], '2033-05', 'the 24 months P4-11 added are not the ones between the cessation and the 65th');
  assert.equal(exceeds[24], '2033-06', 'the month Dana would have been released by age alone is no longer the run’s first');
  assert.equal(exceeds.at(-1), '2035-05', 'the run no longer closes at Dana’s Age Pension age');
  assert.equal(453, 453, 'the pre-O85 count, kept beside the new one');
  assert.equal(303, 303, 'the pre-2026-09-23 count, kept beside the new one');
  assert.equal(accessibleOf.filter((c, i) => c < assessableOf[i]).length, 453, 'no nil tail since 2026-09-23, so no month is equal');
  assert.equal(453 + 48, 501, 'below and above — with no nil tail, the two of them are the walk');
  assert.equal(accessibleOf.filter((c, i) => c > totalWealthOf[i]).length, 0, 'reachable money exceeds the wealth it is part of');
});

test('the floor comparison: $100k is not breached on this fixture, and $700k is, early and late', () => {
  // Stated plainly because it is a finding about the fixture: at concept.md's default floor this
  // chart has nothing to shade. The minimum reachable figure across the whole walk is $650,819.
  // **The minimum is $589,062.73 at the LAST month now, where it was $650,819.18 at 2033-05** — a
  // walk that spends its capital has its least reachable month at the end of itself, which is the
  // shape a drawdown has and the shape a frozen balance does not.
  assert.equal(650_819_18, 650_819_18, 'the pre-limb-5 minimum, kept beside the new one');
  // ⚠️ **AND THE MINIMUM MOVED TO THE OTHER END OF THE WALK ON 2026-09-20 (P6-8 brief 3, chunk
  // 2b).** It was $589,062.73 at the LAST month — the shape a walk that spends its capital has.
  // With 56 months of employer Superannuation Guarantee credited and compounding, this Household
  // now ends richer than it began, so its least reachable month is its FIRST: **$674,727.25 at
  // 2026-09**, before a cent of the Guarantee has been paid. That figure is the fixture's own
  // opening position and chunk 2b could not have moved it, which is what makes it the control.
  // ⚠️ **AND IT HAS MOVED BACK TO THE END OF THE WALK — AND TO NIL — WITH REGISTER O85
  // (2026-09-21).** The stated spending level is a REAL figure now, so the demo household's target
  // rises at 2.5% a year, outruns both the Guarantee and the Age Pension, and empties in 2055-12:
  // the least reachable month is $0.00 and the walk ends poorer than it began. **The $100,000 floor
  // of concept.md's own default is therefore BREACHED on this fixture for the first time** — 171
  // months of it, from 2054-03 — where the § comment above says the chart has nothing to shade. The
  // comment is superseded rather than deleted, because it was true of every walk this repo produced
  // until today and the reason it stopped being true is this ruling.
  // ⚠️ **AND BACK TO THE FIRST MONTH AGAIN SINCE 2026-09-23.** A plan with no series now INDEXES the
  // Age Pension on its own growth rates: from the late 2030s the rate follows the MTAWE floor at 3.5%,
  // faster than the 2.5% the target rises by, so the money no longer runs out and the walk ends
  // RICHER than it began — $1,258,543.91 reachable in 2068-05. The least reachable month is the
  // opening one, $674,884.00, which no pension payment reaches, and **the $100,000 floor is not
  // breached at all**, as it was not before O85.
  assert.equal(674_727_25, 674_727_25, 'the pre-O85 minimum, kept beside the new one');
  assert.equal(0, 0, 'the pre-2026-09-23 minimum, kept beside the new one');
  // ⚠️ **AND $674,957.50 SINCE INTEREST ON CASH (2026-09-23), $73.50 MORE.** The opening $42,000 of
  // cash earns 2.5% / 12 = $87.50 in month one, $43.75 to each owner; Dana's is taxed at her 30%
  // bracket plus the 2% levy, annualised $525 × 32% / 12 = $14.00, and Ash's $525 a year is under
  // the tax-free threshold. $87.50 − $14.00 = $73.50.
  assert.equal(674_884_00, 674_884_00, 'the pre-interest minimum, kept beside the new one');
  assert.equal(Math.min(...accessibleOf) - 674_884_00, 73_50);
  assert.equal(Math.min(...accessibleOf), 674_957_50);
  assert.equal(MONTHS[accessibleOf.indexOf(Math.min(...accessibleOf))].month, '2026-09');
  assert.ok(accessibleOf.at(-1) > accessibleOf[0], 'the walk no longer ends richer than it starts — re-read this block');
  // ⚠️ **AND THE OPENING MONTH ITSELF MOVED ON 2026-09-21 (P10-5), BY EXACTLY ONE TAX BILL.** With
  // limb 2 shut for the opening part-year the Waterfall fell through to limb 3 and **SOLD A PARCEL**
  // to pay for month one — $1,616.00 of units, and **$156.75 of capital gains tax** charged against
  // the same month's cash. Ash's pension pays that $1,616.00 now, nothing is sold, and no tax is
  // due. The whole difference is that one line, to the cent, which is why it is asserted as a
  // difference rather than as a new number.
  assert.equal(accessibleOf[0] - 674_727_25, 156_75 + 73_50, 'the opening month gained exactly the CGT it no longer pays, and its first month of net interest');
  assert.equal(accessibleOf[0], 674_957_50, 'the opening month: the price-level factor is 1 in it');
  assert.equal(589_062_73, 589_062_73, 'the pre-Guarantee minimum, kept beside the new one');
  assert.equal(0, 0, 'the pre-O85 count of $100k breaches, kept beside the new one');
  assert.equal(171, 171, 'the pre-2026-09-23 count of $100k breaches, kept beside the new one');
  assert.equal(SERIES.belowFloor.filter(Boolean).length, 0, '$100k is not breached since 2026-09-23 — see the paragraph above');
  assert.equal(29, 29, 'the pre-limb-5 count, kept beside the new one');
  // **60 became 46 at P4-11 (2026-09-19), and the breach that went is LATER, which is the
  // direction the defect predicts.** The fourteen months removed are one unbroken run, 2032-04
  // through 2033-05: reachable money dipped from $699,574.91 to $650,819.18 there on the old
  // reading and never dipped at all on the new one, because Dana's $555,658.04 of released super
  // was counted out of it while Waterfall limb 5 stood ready to spend that very balance. Both
  // ends of the walk are unmoved — those breaches are cash, not preserved super.
  assert.equal(60, 60, 'the pre-P4-11 count, kept beside the new one');
  // **46 became 15 at chunk 2b, and the thirty-one that went are the ones at the END of the walk.**
  // The Guarantee lifts every later month above $700,000, so what is left below the floor is the
  // opening run — 2026-09 to 2027-11 — before the credits and their compounding have accumulated.
  assert.equal(46, 46, 'the pre-Guarantee count, kept beside the new one');
  assert.equal(15, 15, 'the pre-P4-14 count, kept beside the new one');
  // ⚠️ **AND 15 BECAME 279 AT P4-14 (2026-09-21), and the thirty-one comments above are all about
  // the WALK while this one is about the FLOOR.** Nothing in the walk moved. The floor is now read
  // as what it says it is — $700,000 of TODAY's buying power — so a month in 2068 is measured
  // against $1,958,509.87 of 2068 money rather than against a flat $700,000, which by then is a
  // third of the buffer this household asked for. Two runs, and they are two different facts:
  // 2026-09 … 2031-05 is the household before its super is reachable, and 2049-12 … 2068-05 is the
  // drawdown falling behind prices. The opening month is unmoved because the factor there is 1.
  // ⚠️ **AND 279 BECAME 192 ON 2026-09-21 (P4-1e), WHICH IS THE WALK AGAIN AND NOT THE FLOOR.**
  // The Age Pension is paid in 99 months, so less capital is spent and the reachable series sits
  // higher against the same rising curve. The SHAPE is unchanged — the same two runs, the same
  // first and last months — and what moved is where the second run OPENS: **2049-12 became
  // 2057-03**, seven years and three months of runway bought by the pension. The opening run is
  // untouched, as it must be: it is the household before its super is reachable, and no pension
  // payment reaches it.
  // ⚠️ **AND 192 BECAME 371 ON 2026-09-21 (register O85), which is the WALK and not the floor
  // again.** A target rising with prices spends the capital the Age Pension had preserved, so the
  // reachable series falls back under the same rising curve — and the second run opens at
  // **2042-04**, fifteen years earlier than P4-1e's 2057-03 and seven earlier than P4-14's 2049-12.
  // The opening run is untouched for the third time running, for the third time for the same
  // reason: it is the household before its super is reachable, and nothing in this ruling reaches
  // it either.
  assert.equal(279, 279, 'the pre-P4-1e count, kept beside the new one');
  assert.equal(192, 192, 'the pre-O85 count, kept beside the new one');
  // **372 since P10-5 (2026-09-21)**: the pension is drawn a month sooner, so reachable money
  // crosses $700,000 a month sooner and one more month falls under the floor.
  assert.equal(371, 371, 'the pre-P10-5 count, kept beside the new one');
  // ⚠️ **AND 372 BECAME 311 ON 2026-09-23, WHICH IS THE WALK AGAIN.** The indexed pension keeps more
  // capital in the household, so the second run opens at **2047-04**, five years later than 2042-03.
  // The opening run is untouched for the fourth time, for the same reason as the other three.
  assert.equal(372, 372, 'the pre-2026-09-23 count, kept beside the new one');
  // ⚠️ **AND 311 → 304 WITH INTEREST ON CASH (2026-09-23).** The cash earns the plan's 2.5% CPI, and
  // by 2047 reachable money is $19,716.10 higher; the floor rises about $2,430 a month there and
  // reachable money falls about $600 a month, so the crossing comes 19,716 / 3,020 ≈ 6.5 months
  // later — seven months, 2047-04 to 2047-11. The opening run, 2026-09 to 2031-05, is unmoved.
  assert.equal(311, 311, 'the pre-interest count, kept beside the new one');
  // ⚠️ **AND 304 → 296 WITH "SPEND CASH FIRST" (2026-09-23).** The cash is spent before the 6.5%
  // pools, so by 2047-04 reachable money is $26,270.94 higher; against the same ~$3,020 a month
  // closing speed the crossing comes 26,271 / 3,020 ≈ 8.7 months later — eight months, 2047-11 to
  // 2048-07. The opening run, 2026-09 to 2031-05, is unmoved: the cash it holds is spent sooner, but
  // Dana's super is not yet reachable and nothing here reaches that.
  assert.equal(304, 304, 'the pre-order count, kept beside the new one');
  // (+$1,825.64 more at 2047-04 since May 2031 pays Dana's days worked (2026-09-23): the $2,176.00 it
  // left the household by 2035-05 — the pay Ash's pension did not draw, net of the smaller July
  // true-up, and $395.97 of Guarantee — then sits wholly on the assets-test taper, earning 6.5% and
  // costing 7.8% a year of pension: × (1.065 ÷ 1.078) ^ (143/12) is ~$1,882. Same size, same
  // direction; the crossing does not move.)
  // (And +$17,092.52 more again since pay rises with wages (2026-09-23): the $20,228.87 more that was
  // reachable at 2035-05, on the same assets-test taper for the 143 months since: ~$17,500 predicted.)
  // ⚠️ **AND $237.39 MORE AGAIN WITH THE ASSETS-TEST FLOOR (T135, 2026-09-24).** The same compounding
  // as the drawing-month pension above, 143 months earlier in the walk: not hand-derivable to the
  // cent from a single month's bound, only the sign — and here it is the direct one, up, because this
  // month is still early enough in the run that the knock-on has not yet turned it around.
  // ⚠️ **AND $6,977.31 LESS SINCE DIV 119 (LR-1 slice 3, 2026-09-29).** Dana's sales pay $7,858.21 of
  // minimum tax from 2033-01 to 2035-06 on this walk, each sale growing by its tax: reachable money
  // is $8,273.35 lower by 2035-07, and on the same assets-test taper for the 141 months to here that
  // predicts ~$7,174.
  assert.equal(accessibleOf[MONTHS.findIndex((m) => m.month === '2047-04')] - 118_234_295, 2_627_094 + 182_564 + 1_709_252 + 23_739 - 697_731);
  assert.ok(Math.abs(2_022_887 * (1.065 / 1.078) ** (143 / 12) - 1_709_252) < 100_000);
  assert.ok(Math.abs(-827_335 * (1.065 / 1.078) ** (141 / 12) + 697_731) < 100_000);
  assert.equal(accessibleOf[MONTHS.findIndex((m) => m.month === '2035-05')] - accessibleOf[MONTHS.findIndex((m) => m.month === '2047-04')] > 0, true);
  assert.equal(SERIES_700K.belowFloor.filter(Boolean).length, 291);
  assert.equal(289, 289, 'the pre-Div 119 count, kept beside the new one');
  assert.equal(MONTHS[SERIES_700K.belowFloor.indexOf(true)].month, '2026-09');
  assert.equal(MONTHS[SERIES_700K.belowFloor.lastIndexOf(true)].month, '2068-05');
  const runs = MONTHS.reduce((acc, month, i) => {
    if (!SERIES_700K.belowFloor[i]) return acc;
    const last = acc.at(-1);
    if (last !== undefined && SERIES_700K.belowFloor[i - 1]) last[1] = month.month;
    else acc.push([month.month, month.month]);
    return acc;
  }, []);
  // 2048-08 since May 2031 pays Dana's days worked (2026-09-23): reachable money is $1,825.64 higher
  // at 2047-04, and at the ~$3,020 a month the gap closes by, that is part of a month — one month
  // later, and one fewer below the floor (296 → 295).
  // 2049-02 since pay rises with wages (2026-09-23): the $17,092.52 more reachable at 2047-04 is
  // 17,093 ÷ 3,020 ≈ 5.7 months of the gap's closing speed — six months later, six fewer below the
  // floor (295 → 289).
  // 2048-12 since Div 119 (LR-1 slice 3, 2026-09-29): the $6,977.31 less reachable at 2047-04 is
  // 2.3 months of the gap's ~$3,020 a month — two months sooner, two more below the floor (289 → 291).
  assert.deepEqual(runs, [['2026-09', '2031-05'], ['2048-12', '2068-05']]);
  // Re-derived from the curve rather than read off the series: the last month's floor is the stated
  // figure raised by 2.5% a year over the 501 months of this walk, and the walk's own reachable
  // money is under it. `contingencyFloorAt` is the engine's expression, so this is the two sides
  // being equal and not the series agreeing with itself.
  // 2026-09 → 2068-05 is **500 months**, not 501: the as-at month is month zero of the curve, which
  // is the off-by-one this figure exists to pin. 700,000 × 1.025 ^ (500/12) = $1,958,509.87.
  assert.equal(contingencyFloorAt(FLOOR_700K, MONTHS.at(-1).month), 1_958_509_87);
  assert.equal(MONTHS.length, 501, 'the walk is 501 months and the curve spans 500 of them');
  assert.ok(MONTHS.at(-1).accessibleAssets < 1_958_509_87);
  assert.equal(contingencyFloorAt(FLOOR_700K, MONTHS[0].month), FLOOR_700K_CENTS, 'the as-at month is the stated figure');
  const breached = MONTHS.filter((m, i) => SERIES_700K.belowFloor[i]).map((m) => m.month);
  assert.equal(breached.filter((m) => m >= '2031-06' && m <= '2033-05').length, 0, 'the run P4-11 lifted is back below the floor');
  // And the fourteen really were a run, re-derived by subtracting the balance the fix let in:
  // Dana's accumulation super is the whole of `protectedAssets` until she reaches Age Pension age.
  const onTheOldReading = MONTHS.filter(
    // Against the FLAT $700,000 deliberately: this is a re-derivation of a fact from 2026-09-19,
    // when the floor was read as flat nominal cents, and re-measuring it against P4-14's rising
    // curve would be a different claim about a different comparison (it finds 24 months, not 14).
    (m) => m.month >= '2031-06' && m.month <= '2033-05' && m.accessibleAssets - m.protectedAssets < FLOOR_700K_CENTS,
  ).map((m) => m.month);
  // (**14 months until 2026-09-21, opening at 2032-04.** The re-derivation is of a 2026-09-19 fact
  // and the fact is unchanged; what moved is the walk it is measured on, because the Age Pension
  // lifts reachable money in those months too. Six months still breach on the old reading and none
  // on the new one, which is the claim.)
  // (**And 6 became 19 on 2026-09-21, opening at 2031-11**, for the reason every count in this test
  // moved: the household spends more, so it holds less, so more months of it sit under $700,000 on
  // the old flat reading. The claim itself is unmoved — none of those months breaches on the new
  // reading, which is the last assertion of this test.)
  // (**And 19 became 16 on 2026-09-23, opening at 2032-02**: the indexed pension lifts reachable
  // money in those months, so fewer of them sit under $700,000 on the old flat reading.)
  // (**And 16 became 13 with interest on cash (2026-09-23), opening at 2032-05**: the cash earns the
  // plan's 2.5% CPI, so this figure sits about $7,600 higher here, and at the ~$2,850 a month it falls
  // by it crosses $700,000 three months later.)
  // (**And 13 became 12 with "spend cash first" (2026-09-23), opening at 2032-06**: the cash is
  // spent before the 6.5% pools, so reachable money sits a little higher here and crosses $700,000
  // on the old flat reading one month later.)
  // (**And 12 became 11 when the retirement month began paying its days worked (2026-09-23), opening
  // at 2032-07**: May 2031's pay is money Ash's pension did not draw, so reachable money sits about
  // $2,000 higher here and crosses $700,000 on the old flat reading one month later.)
  // (**And 11 became 6 when pay began rising with wages (2026-09-23), opening at 2032-12**: this
  // figure sits $14,168.21 higher at 2032-07 — the pay Dana banked — and at the ~$2,850 a month it
  // falls by it crosses $700,000 five months later.)
  assert.equal(71_183_125 - 69_766_304, 1_416_821);
  assert.equal(onTheOldReading.length, 6);
  assert.equal(onTheOldReading[0], '2032-12');
  assert.equal(onTheOldReading.at(-1), '2033-05');
  // The count identity `60 − 46 = 14` held while the end of the walk was below the floor; chunk 2b
  // lifted that end, so what is asserted now is the RUN itself — fourteen months that breach on the
  // old reading of reachable money and on no month of the new one.
  assert.equal(onTheOldReading.filter((month) => breached.includes(month)).length, 0);
});

test('the shortfall marker lands INSIDE the walk, not at either end', () => {
  // On `SHORT_MONTHS`: the committed demo has no marker at all since limb 5 (see the fixture note).
  const marker = monthsToSeries(SHORT_MONTHS, DEMO_HOUSEHOLD, FLOOR_700K, DEMO_AGE_PENSION_SERIES).markers[0];
  assert.ok(marker.index > 0 && marker.index < MONTHS.length - 1, `the marker is at the edge: ${marker.index}`);
  // **227 and 2045-08 since P6-8 brief 3 chunk 2b, ten months later than the 217 / 2044-10 this
  // asserted before.** Dana's employer Guarantee is spent by this walk rather than banked, and at
  // $120,000 a year — $10,000 a month — the $57,223.92 credited by 2035 is worth about a hundred
  // thousand dollars by the 2040s. Ten months of runway is what that buys.
  //
  // ⚠️ **AND 227 BECAME 355 ON 2026-09-21 (P4-1e): 2045-08 to 2056-04, TEN YEARS AND EIGHT MONTHS
  // LATER.** This is the largest headline move the standing table makes, and it is the ruling's
  // whole point stated as a date: a household that was shown running out at 87 was being shown
  // with no Age Pension for most of its retirement.
  //
  // ⚠️ **AND 355 BECAME 214 ON 2026-09-21 (register O85): 2056-04 back to 2044-07, ELEVEN YEARS AND
  // NINE MONTHS EARLIER.** This is now the largest headline move in this suite, and it runs the
  // other way: the standing pension table bought this household eleven years of runway and reading
  // its spending figure as a standard of living takes them back. Both movements are real and
  // neither cancels the other — what they say together is that this date is sensitive to the two
  // biggest assumptions on the page, which is exactly why it is on the page.
  assert.equal(227, 227, 'the pre-P4-1e index, kept beside the new one');
  assert.equal(355, 355, 'the pre-O85 index, kept beside the new one');
  // ⚠️ **215 SINCE P10-5 (2026-09-21), and this is the move that runs the FLATTERING way.** This
  // fixture is genuinely short, so paying its pension minimum from month one is income it did not
  // have and the shortfall arrives one month LATER — the opposite direction from every other move
  // this change made on the demo plan, out of the very same mechanism.
  assert.equal(214, 214, 'the pre-P10-5 index, kept beside the new one');
  // ⚠️ **AND 215 BECAME 253 ON 2026-09-23: 2044-08 to 2047-10, THREE YEARS AND TWO MONTHS LATER.** A
  // plan with no series now INDEXES the Age Pension on its own growth rates instead of carrying the
  // 2026 sets, so from 2027-04 this household is paid more in every month it is paid at all, and its
  // capital lasts longer against the same $120,000 target. The later direction is the legislated
  // one — the rates rise in law — and the size is thirty-eight months of runway on a household
  // spending $10,000 a month.
  assert.equal(215, 215, 'the pre-2026-09-23 index, kept beside the new one');
  // ⚠️ **AND 253 BECAME 254 WITH INTEREST ON CASH (2026-09-23): ONE MONTH LATER.** Before 2047-10 the
  // cash earns $10,556.59 and costs $1,097.46 of extra tax, so $9,459 more reaches the month that
  // used to be short by $8,993.61 — enough to fund it, and to leave 2047-11 short by only $235.78.
  assert.equal(253, 253, 'the pre-interest index, kept beside the new one');
  // ⚠️ **AND 254 BECAME 255 WITH "SPEND CASH FIRST" (2026-09-23): ONE MONTH LATER AGAIN.** 2047-11
  // was short by only $235.78. Cash with no loan to offset is now spent before the 6.5% pools, so
  // they grow longer — this household reaches 2047-10 holding $1,740.12 more reachable money
  // ($10,960.71 against $9,220.59) — and 2047-11 is funded; 2047-12 is short by $8,018.16.
  assert.equal(254, 254, 'the pre-order index, kept beside the new one');
  // ⚠️ **AND 255 BECAME 259 SINCE PAY RISES WITH WAGES (2026-09-23): FOUR MONTHS LATER.** Dana's pay
  // rises 3.5% a year until she retires. To 2047-10 this walk was paid $31,818.42 more salary, took
  // $10,314.65 more tax and $16,555.17 less Age Pension for it, credited $3,245.51 more Guarantee and
  // grew $27,661.59 more on what it kept (and $22.25 more interest): $35,877.95 more, to the cent of
  // what it holds. At the ~$9,400 a month it is then short by without it, that is 3.8 months, and it
  // falls short four months later: 2048-04, short by $6,560.83.
  assert.equal(3_181_842 - 1_031_465 - 1_655_517 + 324_551 + 2_766_159 + 2_225, 3_587_795);
  assert.equal(255, 255, 'the pre-wage-growth index, kept beside the new one');
  assert.equal(marker.index, 259);
  assert.equal(marker.month, '2048-04');
  // And the committed demo plan has NO marker again since 2026-09-23: on the indexed pension it never
  // falls short, so this separate fixture is once more the only one here with a marker.
  assert.deepEqual(others(SERIES.markers).map((each) => [each.key, each.month]), []);
});

// --- §2 The partition claim, verified against `splitAssets` and against the raw fixture ----------

test('PARTITION — every AssetLine falls on exactly one side, so the two bands are total wealth', () => {
  // Read off `splitAssets` itself rather than taken from a brief: the split emits ONE line per pool
  // with a two-member `treatment`, and the two reported scalars are the two filtered sums. So the
  // bands cannot double-count and cannot drop a pool, and this is why stacking them is legitimate.
  const split = splitAssets(DEMO_HOUSEHOLD, '2026-09-01');
  assert.deepEqual([...new Set(split.lines.map((l) => l.treatment))].sort(), ['assessable', 'protected']);
  assert.equal(
    split.protectedAssets + split.assessableAssets,
    split.lines.reduce((sum, l) => sum + l.amount, 0),
    'a line is counted twice, or not at all',
  );
  assert.equal(split.lines.length, 4, 'the demo Household no longer reports four asset lines');
});

test('PARTITION — month 0’s two bands re-derive from the fixture’s own stated figures', () => {
  // Hand-derived from `demoHousehold.ts`, not from the walk: Dana's $412,000 Accumulation Phase
  // balance is the whole of Protected (she is under Age Pension age), and Ash's $538,000
  // Account-Based Pension + Dana's $96,500 parcel + the $42,000 Offset Account is the whole of
  // Assessable. The home is exempt and valueless (ADR-0005) and appears in neither.
  // Assessable is `bands[0]` since 2026-09-25 — the bottom of the stack.
  assert.equal(SERIES.bands[1].values[0], 412_000_00);
  assert.equal(SERIES.bands[0].values[0], 538_000_00 + 96_500_00 + 42_000_00);
  assert.equal(SERIES.bands[0].values[0] + SERIES.bands[1].values[0], 1_088_500_00);
  // And the raw fixture really does hold those figures, so the derivation above is not circular.
  const [dana, ash] = DEMO_HOUSEHOLD.persons;
  assert.equal(dana.superInterests[0].balance, 412_000_00);
  assert.equal(financialAssets(dana), 96_500_00);
  assert.equal(ash.superInterests[0].balance, 538_000_00);
  assert.equal(DEMO_HOUSEHOLD.openingOffsetBalance, 42_000_00);
});

test('PARTITION — the stack height IS total wealth, in every month of the walk', () => {
  for (const [i, month] of MONTHS.entries()) {
    assert.equal(
      SERIES.bands[0].values[i] + SERIES.bands[1].values[i],
      month.protectedAssets + month.assessableAssets,
      `${month.month}: the stack is not total wealth`,
    );
  }
});

test('the reachable overlay is a SUBSET figure: it never exceeds the stack it is drawn over', () => {
  for (const [i, month] of MONTHS.entries()) {
    assert.ok(
      SERIES.overlays[0].values[i] <= SERIES.bands[0].values[i] + SERIES.bands[1].values[i],
      `${month.month}: reachable money exceeds total wealth — the overlay is not a subset of the stack`,
    );
  }
});

// --- §3 The rule this module exists for: accessible is NOT a third band --------------------------

test('`bands` holds exactly two members, and `accessible` is not one of them', () => {
  assert.equal(SERIES.bands.length, 2, 'a third band was stacked — every reachable dollar is now drawn twice');
  // ASSESSABLE FIRST (2026-09-25): the first band is the bottom of the stack, and the assets-test
  // lines are read against the assessable band's top edge, so it has to start at zero.
  assert.deepEqual(SERIES.bands.map((b) => b.key), ['assessable', 'protected']);
  assert.equal(SERIES.bands.some((b) => b.key === 'accessible'), false);
  assert.deepEqual(SERIES.overlays.map((o) => o.key), ['accessible', 'floor']);
  // The bands carry the raw figures, unaltered — a band that had absorbed the overlay would not.
  assert.deepEqual([...SERIES.bands[0].values], assessableOf);
  assert.deepEqual([...SERIES.bands[1].values], protectedOf);
  assert.deepEqual([...SERIES.overlays[0].values], accessibleOf);
});

test('STRUCTURAL SWEEP — no field anywhere in the returned shape adds all three figures', () => {
  const tripleSum = MONTHS.map((m) => m.protectedAssets + m.assessableAssets + m.accessibleAssets);
  const series = numericSeriesIn(SERIES);
  // Vacuity control: the sweep found the series it is supposed to be sweeping.
  assert.equal(series.length, 6, `the sweep found ${series.length} month-length numeric series, not 6`);
  assert.deepEqual(series.map(([path]) => path).sort(), [
    '$.bands[0].values',
    '$.bands[1].values',
    '$.overlays[0].values',
    '$.overlays[1].values',
    '$.thresholds[0].values',
    '$.thresholds[1].values',
  ]);
  const fullPensionUpToOf = MONTHS.map((m) => m.assetsTestThresholds.fullPensionUpTo);
  const noPensionAboveOf = MONTHS.map((m) => m.assetsTestThresholds.noPensionAbove);
  const floorLine = MONTHS.map(() => FLOOR_100K_CENTS);
  for (const [path, values] of series) {
    assert.notDeepEqual([...values], tripleSum, `${path} is protected + assessable + accessible`);
    // Stronger than "not the triple sum": every month-length series in the return is one of the
    // four raw figures or the flat floor, so no summed, netted or re-derived series can appear
    // here without someone adding it to this list.
    const raw = [protectedOf, assessableOf, accessibleOf, floorLine, heasDebtOf, fullPensionUpToOf, noPensionAboveOf].some(
      (candidate) => candidate.every((c, i) => c === values[i]),
    );
    assert.ok(raw, `${path} is a DERIVED series — nothing in the return may add or net the three figures`);
  }
});

test('STRUCTURAL SWEEP — no key name anywhere in the shape promises a combined figure', () => {
  const keys = [...walkValues(SERIES)]
    .map(([path]) => path.split('.').at(-1))
    .filter((k) => k !== undefined && !k.includes('['));
  assert.ok(keys.length > 10, 'the key sweep saw almost nothing');
  assert.deepEqual(
    [...new Set(keys)].filter((k) => /total|combined|overall|sum|net|all|gross/i.test(k)),
    [],
    'a key name promises a figure this module must never produce',
  );
});

test('the overlay label SAYS it is not part of the stack — a reader cannot be misled by the legend', () => {
  assert.match(OVERLAY_LABELS.accessible, /never added|not added|cuts across/i);
  assert.equal(new Set([BAND_LABELS.protected, BAND_LABELS.assessable, OVERLAY_LABELS.accessible]).size, 3);
  assert.equal(SERIES.overlays[0].label, OVERLAY_LABELS.accessible);
});

// --- §4 The floor is an input, never a constant --------------------------------------------------

test('the floor argument is REQUIRED — it carries no default value', () => {
  // Arity is the structural test: a default on the third parameter makes `.length` 2. FOUR since
  // P7-5, not three: the walk's own Age Pension series joined the signature as a fourth REQUIRED
  // positional argument, on the same rule `pensionOnlyAge` states for its own third — a caller who
  // may omit it is a caller who will, and the Pension-Only marker would then go missing for a plan
  // that could have answered. A default on either one makes this 3.
  assert.equal(monthsToSeries.length, 4, 'a parameter of `monthsToSeries` acquired a default value');
});

test('two households with different floors get two different charts, with no source edit', () => {
  assert.equal(SERIES.floor, FLOOR_100K_CENTS);
  assert.equal(SERIES_700K.floor, FLOOR_700K_CENTS);
  assert.notDeepEqual([...SERIES.overlays[1].values], [...SERIES_700K.overlays[1].values]);
  // Flat at the STATED figure: the overlay is in today's money and `chartConfig.ts`'s
  // `statedInTodaysMoneyLens` is what puts it on each month's price level for the future-dollars
  // view. A curve here would be the conversion happening twice.
  assert.deepEqual([...new Set(SERIES_700K.overlays[1].values)], [FLOOR_700K_CENTS], 'the floor overlay is not flat at the stated figure');
  assert.equal(SERIES.overlays[1].values.length, MONTHS.length);
  assert.notDeepEqual(SERIES.belowFloor, SERIES_700K.belowFloor);
  // A third, arbitrary floor — nothing about the module may prefer any particular figure.
  const odd = monthsToSeries(MONTHS, DEMO_HOUSEHOLD, floorOf(251_337_00));
  assert.deepEqual([...new Set(odd.overlays[1].values)], [251_337_00]);
});

test('`belowFloor` agrees with `contingencyFloorBreach`, which is a SEPARATE implementation', () => {
  for (const floor of [FLOOR_100K, FLOOR_700K, floorOf(5_000_000_00), floorOf(FLOOR_700K_CENTS, { ...DEMO_SETTINGS, economicSeries: { ...DEMO_SETTINGS.economicSeries, cpi: 0 } })]) {
    const label = `${floor.todaysMoney} at cpi ${floor.cpi}`;
    const series = monthsToSeries(MONTHS, DEMO_HOUSEHOLD, floor);
    const breach = contingencyFloorBreach(MONTHS, DEMO_HOUSEHOLD, floor);
    assert.equal(series.belowFloor.filter(Boolean).length, breach.monthsBelowFloor, label);
    if (breach.outcome === 'breached') {
      assert.equal(MONTHS[series.belowFloor.indexOf(true)].month, breach.firstBreach.month, label);
    } else {
      assert.equal(series.belowFloor.includes(true), false, label);
    }
  }
});

test('RAW SOURCE — the module names no floor of its own', () => {
  // The defence is in the signature, so it is read off the signature: `floor: Cents` with no `=`.
  // `entries` (P3-16a) is deliberately last and deliberately defaulted — see the header's note on
  // the fourth marker — so it trails the two undefaulted parameters rather than sitting between them.
  assert.match(
    SOURCE,
    /floor: StatedContingencyFloor \| undefined,\n  agePensionSeries: AgePensionIndexationSeries \| undefined,\n  entries: readonly Entry\[\] = \[\],\n\): ChartSeries/,
    'the floor and series parameters are no longer the last two undefaulted arguments, or entries no longer trails them',
  );
  assert.doesNotMatch(SOURCE, /floor\s*(\?)?\s*:\s*StatedContingencyFloor[^,)]*=/, 'the floor parameter acquired a default');
  assert.doesNotMatch(SOURCE, /agePensionSeries\s*(\?)?\s*:\s*AgePensionIndexationSeries[^,)]*=/, 'the agePensionSeries parameter acquired a default');
  assert.doesNotMatch(SOURCE, /DEFAULT_FLOOR|FLOOR_DEFAULT/i);
  // No money literal at all: $100k in any of the spellings this repo uses, and any bare cents run.
  assert.doesNotMatch(CODE, /\b100[_,]?000\b|\b10[_,]?000[_,]?000\b|\btoCents\b|\d{4,}/);
});

// --- §5 The marker: derived, not invented, and not off by one ------------------------------------

const isShort = (month) =>
  month.lines.some((line) => line.direction === 'inflow' && line.description === SHORTFALL_LINE);

test('the marker is the FIRST month carrying `Unfunded shortfall`, and the month before it is funded', () => {
  // Re-derived here from the line itself, so an off-by-one inside the module cannot agree with it.
  // **The committed demo falls short again from register O85 (2026-09-21), at index 351** — it had
  // none at all between limb 5 and that ruling — and the off-by-one claim is still made on
  // `SHORT_MONTHS`, whose own first short month is 137 months earlier and cannot be confused for it.
  // ⚠️ **AND IT DOES NOT FALL SHORT AT ALL SINCE 2026-09-23** — the Age Pension indexes on the plan's
  // own growth rates now, and the indexed pension carries it to the horizon (see §1). It fell short
  // at index 350, 2055-11, until then. `SHORT_MONTHS` is again the only fixture here that marks.
  assert.equal(MONTHS.findIndex(isShort), -1, 'the demo walk falls short again — re-read §1');
  const series = monthsToSeries(SHORT_MONTHS, DEMO_HOUSEHOLD, FLOOR_700K, DEMO_AGE_PENSION_SERIES);
  const firstShort = SHORT_MONTHS.findIndex(isShort);
  assert.equal(firstShort, 259, 'the marker fixture first falls short at a different index'); // 227 before P4-1e, 355 before O85, 214 before P10-5, 215 before 2026-09-23, 253 before interest on cash, 254 before "spend cash first", 255 before pay rose with wages
  assert.notEqual(firstShort, MONTHS.findIndex(isShort), 'the two fixtures must not mark the same month');
  const marker = series.markers[0];
  assert.equal(marker.index, firstShort);
  assert.equal(marker.month, SHORT_MONTHS[firstShort].month);
  assert.equal(series.months[marker.index], marker.month, 'the marker points at a different month than it names');
  assert.equal(isShort(SHORT_MONTHS[marker.index]), true, 'the marked month does not carry the shortfall line');
  assert.equal(isShort(SHORT_MONTHS[marker.index - 1]), false, 'the month BEFORE the marker is already short');
});

test('the marker carries the month, the index and BOTH ages — `outcomes.ts` refuses to pick one', () => {
  const marker = monthsToSeries(SHORT_MONTHS, DEMO_HOUSEHOLD, FLOOR_700K, DEMO_AGE_PENSION_SERIES).markers[0];
  const read = shortfallAge(SHORT_MONTHS, DEMO_HOUSEHOLD);
  assert.equal(marker.key, 'shortfall');
  assert.equal(marker.label, MARKER_LABELS.shortfall);
  assert.equal(marker.month, read.firstShortfall.month);
  assert.deepEqual([...marker.ages], [...read.firstShortfall.ages]);
  assert.equal(marker.ages.length, 2);
  assert.deepEqual(marker.ages.map((a) => a.name), ['Dana', 'Ash']);
});

test('on a plan with no series BOTH markers are drawn, one month apart — the Pension-Only Age has arrived', () => {
  // ⚠️ **THE TITLE USED TO READ "exactly ONE marker is drawn, and the Pension-Only Age is the one
  // that is not", AND THE REASON IT GAVE WAS THIS (P4-1e, 2026-09-21):** *"The demo plan states no
  // forward Age Pension series, so its walk cannot be asked this question at all."* It can now: the
  // standing table carries the published parameters past the window, so a plan that states nothing
  // is answerable, and **this is the first walk in the suite on which the Pension-Only Age marker
  // is actually DRAWN from a plan with no series.** On `SHORT_MONTHS` the Household runs out at
  // 2056-04 and opens the very next month holding nothing but its pension.
  // ⚠️ **AND SINCE REGISTER O85 (2026-09-21) BOTH ARE DRAWN ON THE COMMITTED DEMO TOO.** That
  // paragraph read *"on the committed demo, NEITHER is drawn: the walk funds every month"*, which
  // was true of a walk whose spending was held flat in nominal dollars. The demo household's own
  // money now stops covering its spending at 2055-12 and it opens 2056-01 on the pension alone. The
  // two fixtures still mark eleven years apart, so neither test's dates can be satisfied by the
  // other walk.
  // ⚠️ **AND SINCE 2026-09-23 NEITHER IS DRAWN ON THE COMMITTED DEMO AGAIN.** The Age Pension indexes
  // on the plan's own growth rates now, and the demo couple never runs out; the Pension-Only answer
  // is 'never' and the chart carries its note. `SHORT_MONTHS` still draws BOTH, one month apart, and
  // is now the only walk in this file that does — on a plan with no series, which is the claim.
  assert.deepEqual(others(SERIES.markers).map((m) => [m.key, m.month]), []);
  assert.deepEqual(otherNotes([...SERIES.notes]), [PENSION_ONLY_NEVER_NOTE]);
  const short = monthsToSeries(SHORT_MONTHS, DEMO_HOUSEHOLD, FLOOR_700K, DEMO_AGE_PENSION_SERIES);
  assert.equal(others(short.markers).length, 2);
  assert.deepEqual(others(short.markers).map((m) => m.key), ['shortfall', 'pensionOnly']);
  // 2044-08 and 2044-09 until 2026-09-23; thirty-eight months later on the indexed pension; and one
  // month later again with interest on cash (2026-09-23), and one more with "spend cash first" the
  // same day, both for the reasons in §1; and four months later again since pay rises with wages.
  assert.equal(short.markers[0].month, '2048-04');
  assert.equal(short.markers[1].month, '2048-05');
  assert.equal(short.markers[1].index - short.markers[0].index, 1);
  assert.deepEqual(short.markers[1].ages, [{ name: 'Dana', age: 79 }, { name: 'Ash', age: 88 }]);
  // Four keys since P3-16a. The home loan and mortgage target markers are absent on THIS walk for
  // the plainest reason there is: `DEMO_HOUSEHOLD` states no mortgage at all, so no month carries
  // the key and `mortgagePayoff` answers `'noLoan'`, and this call passes no `entries` at all, so
  // `mortgageTargets` has nothing to compare. `app-mortgage-headline.test.mjs` is where the payoff
  // marker is exercised. P7-5 (2026-09-25) added the two home keys; the demo states no home entry,
  // so neither is drawn here — `app-months-to-series-home.test.mjs` exercises them. `agePensionAge`
  // (one rule per Person) is exercised in `app-age-pension-age-lines.test.mjs`.
  assert.deepEqual(Object.keys(MARKER_LABELS), ['shortfall', 'pensionOnly', 'mortgagePayoff', 'mortgageTarget', 'homeStatus', 'homeExemptionEnds', 'agePensionAge']);
});

test('RAW SOURCE — `pensionOnlyAge` is called only BEHIND the coverage predicate, and no `catch` swallows its refusal', () => {
  // It raises `RangeError` on this very walk (no `economicSeries.agePension`, and the walk runs
  // decades past the published window). A suppressed throw is worse than an absent marker: it
  // would draw a chart that silently lost a marker the engine declined to compute — and it cannot
  // tell "this plan cannot answer that question" from "the code broke".
  //
  // This assertion REPLACES the absolute ban this test used to carry (`pensionOnlyAge` appearing
  // nowhere in the source at all), which P7-5 discharged by building the marker. What survives it
  // is the part that was actually load-bearing: the call is gated, and the gate is the engine's own
  // predicate rather than an exception handler.
  assert.match(CODE, /agePensionParametersCover\(/, 'the coverage predicate is no longer consulted');
  assert.doesNotMatch(CODE, /\bcatch\b|\btry\b/);
  // The predicate is read BEFORE the call, in source order — a gate downstream of the call is not
  // a gate. `pensionOnlyAge(` may appear only after `agePensionParametersCover(` has.
  assert.ok(
    CODE.indexOf('agePensionParametersCover(') < CODE.indexOf('pensionOnlyAge('),
    'the call to `pensionOnlyAge` comes before the predicate that guards it',
  );
  // ⚠️ **AND THE REFUSAL IS NO LONGER REAL ON THIS FIXTURE (P4-1e, 2026-09-21).** This line was
  // `assert.throws(() => pensionOnlyAge(MONTHS, …), RangeError)` — *"it raises `RangeError` on this
  // very walk (no `economicSeries.agePension`, and the walk runs decades past the published
  // window)"*. The standing table answers those months, so the demo walk computes. The gate is
  // still load-bearing and the refusal is still real, on the bound that remains: a walk that BEGINS
  // before the first determined parameters. Hand-built months, because `project()` will not build a
  // walk from an `asAtDate` this far back, and what is being refused is the DATE.
  assert.doesNotThrow(() => pensionOnlyAge(MONTHS, DEMO_HOUSEHOLD, DEMO_SETTINGS.economicSeries.agePension));
  const early = ['2026-02', '2026-03'].map((month) => ({
    month,
    openingBalance: 0,
    closingBalance: 0,
    lines: [{ direction: 'inflow', effect: 'cash', description: AGE_PENSION_LINE, amount: 100_000 }],
    appliedEntryIds: [],
    protectedAssets: 0,
    assessableAssets: 0,
    accessibleAssets: 0,
  }));
  assert.throws(() => pensionOnlyAge(early, DEMO_HOUSEHOLD, undefined), RangeError);
});

// --- §5b The Pension-Only Age: gated, never caught, and its absence is explained -----------------
//
// The failure this section exists against is a LIVE one: `~/.enough/plan.json` was seeded before
// this marker existed and states no `agePension` series, so a chart that called `pensionOnlyAge`
// unconditionally would take that user's page blank. Both states are asserted — the plan that can
// answer produces the rule, the plan that cannot produces no rule, no throw, and a sentence.

test('a plan with NO Age Pension series is ANSWERED now, and the uncomputable note is narrowed', () => {
  // ⚠️ **THE DEMO PLAN CHANGED SIDES ON 2026-09-21 (P4-1e).** It states no forward series and used
  // to be the example of a plan that could not be asked — *"`~/.enough/plan.json` was seeded before
  // this marker existed and states no `agePension` series, so a chart that called `pensionOnlyAge`
  // unconditionally would take that user's page blank"*. With the standing table it IS asked, and
  // the answer is 'never': this Household funds every month and never lives on its pension alone.
  // So it gets the OTHER note, and the two notes still say different things.
  //
  // ⚠️ **AND ON 2026-09-21 IT CHANGED SIDES AGAIN (register O85): the demo walk is not only
  // ANSWERABLE now, it is ANSWERED WITH A DATE.** Its spending level rises with prices, its money
  // runs out in 2055-12, and it opens 2056-01 on the pension alone — so the marker is DRAWN and
  // there is no note at all. The 'never' note has its own fixture (`RICH_MONTHS`, below), which is
  // where that branch is now exercised; what this test still pins on the demo plan is that a plan
  // stating NO forward series is answered rather than left blank.
  //
  // ⚠️ **AND ON 2026-09-23 BACK TO 'never'.** The Age Pension indexes on the plan's own growth rates
  // now and the demo couple never runs out, so the answer is 'never' and the chart carries that
  // note — which is still an ANSWER, and still not the uncomputable one. The dated answer on a plan
  // with no series is `SHORT_MONTHS`', one test up.
  assert.equal(DEMO_SETTINGS.economicSeries.agePension, undefined);
  assert.equal(SERIES.markers.some((m) => m.key === 'pensionOnly'), false);
  assert.deepEqual([...SERIES.notes], [PENSION_ONLY_NEVER_NOTE], 'a walk that answers never says so');
  assert.notDeepEqual([...SERIES.notes], [PENSION_ONLY_UNCOMPUTABLE_NOTE]);

  // **AND THE UNCOMPUTABLE NOTE IS STILL REACHABLE, on the bound that remains.** A walk that BEGINS
  // before the first determined parameters (20 March 2026) cannot be asked, because §4.7 indexes
  // forward from a published set and not backwards. Hand-built months, for the reason the sibling
  // test in `core-outcomes-pension-only-age.test.mjs` states: what is refused is the DATE.
  const early = ['2026-02', '2026-03'].map((month) => ({
    month,
    openingBalance: 0,
    closingBalance: 0,
    lines: [{ direction: 'inflow', effect: 'cash', description: AGE_PENSION_LINE, amount: 100_000 }],
    appliedEntryIds: [],
    protectedAssets: 0,
    assessableAssets: 0,
    accessibleAssets: 0,
  }));
  const tooEarly = monthsToSeries(early, DEMO_HOUSEHOLD, FLOOR_700K, undefined);
  assert.equal(tooEarly.markers.some((m) => m.key === 'pensionOnly'), false);
  assert.deepEqual(otherNotes([...tooEarly.notes]), [PENSION_ONLY_UNCOMPUTABLE_NOTE]);
  // The note names the missing marker and the reason, so "absent" and "never happens" cannot be
  // read as the same thing by someone looking at the chart. The REASON is what is pinned, not the
  // words it is given in: the note must say that the missing thing is Age Pension rate information
  // the plan does not hold, which is the half that tells the reader the fix is a plan edit.
  assert.equal(typeof PENSION_ONLY_UNCOMPUTABLE_NOTE, 'string');
  assert.ok(PENSION_ONLY_UNCOMPUTABLE_NOTE.trim().length >= 60,
    `the note is ${PENSION_ONLY_UNCOMPUTABLE_NOTE.trim().length} characters — a marker and a reason do not fit in that`);
  assert.match(PENSION_ONLY_UNCOMPUTABLE_NOTE, /Pension-Only/, 'the note no longer names the marker that is missing');
  assert.match(PENSION_ONLY_UNCOMPUTABLE_NOTE, /Age Pension/, 'the note no longer names Age Pension rates as the missing input');
  assert.match(PENSION_ONLY_UNCOMPUTABLE_NOTE, /\brates?\b|indexation|figures/i, 'the note no longer says WHAT about the Age Pension is missing');
  // **The half that says the missing thing is about THIS PLAN's dates rather than about the
  // Household's luck** — narrowed with the note on 2026-09-21: it used to say the rates ran out
  // mid-forecast, and now says the plan starts before the earliest published ones. Either way a
  // reader must be able to tell it from "this never happens", which is the next assertion.
  assert.match(PENSION_ONLY_UNCOMPUTABLE_NOTE, /starts before|earliest|cannot work them out|run out|says nothing|not (stated|published|set)/i,
    'the note no longer says why the plan cannot be asked — so it reads as "this never happens"');
  assert.notEqual(PENSION_ONLY_UNCOMPUTABLE_NOTE, PENSION_ONLY_NEVER_NOTE);
});

test('a plan WITH the series: the Pension-Only rule is drawn, at the month the walk itself names', () => {
  const series = monthsToSeries(PENSION_MONTHS, PENSION_COUPLE, FLOOR_100K, PENSION_SERIES);
  const marker = series.markers.find((m) => m.key === 'pensionOnly');
  assert.ok(marker !== undefined, 'the Pension-Only marker is missing from a walk that can answer');
  assert.equal(marker.label, MARKER_LABELS.pensionOnly);
  // RE-DERIVED from the months, not from `pensionOnlyAge`: the marker month is the first month that
  // OPENS with nil cash, holds nothing, and takes in nothing but the Age Pension (and the shortfall,
  // which is money the plan requires and does not have, never money received).
  const derived = PENSION_MONTHS.findIndex((m) => {
    if (m.openingBalance !== 0 || m.protectedAssets !== 0) return false;
    if (!(m.assessableAssets === 0 || m.assessableAssets === m.openingBalance)) return false;
    const inflows = m.lines.filter((l) => l.direction === 'inflow' && l.effect !== 'wealth');
    return (
      inflows.some((l) => l.description === AGE_PENSION_LINE) &&
      inflows.every((l) => l.description === AGE_PENSION_LINE || l.description === SHORTFALL_LINE)
    );
  });
  assert.equal(derived, 48, 'the fixture no longer runs out where this test says it does');
  assert.equal(PENSION_MONTHS[derived].month, '2030-07');
  assert.equal(marker.index, derived, 'the Pension-Only marker is off by ' + (marker.index - derived));
  assert.equal(marker.month, '2030-07');
  assert.equal(series.months[marker.index], marker.month, 'the marker points at a different month than it names');
  // The month BEFORE it is not one: 2030-06 still holds $317.69 of parcel proceeds.
  assert.equal(PENSION_MONTHS[derived - 1].assessableAssets > 0, true);
  // Both Persons are named, in `household.persons` order — `outcomes.ts` refuses to pick one.
  assert.deepEqual(marker.ages.map((a) => a.name), ['Sam', 'Ali']);
  assert.deepEqual(marker.ages.map((a) => a.age), [74, 77]);
  // Nothing is missing, so nothing is explained away.
  assert.deepEqual(otherNotes([...series.notes]), []);
});

test('the two markers are INDEPENDENT, and on THIS fixture they land one month apart', () => {
  const series = monthsToSeries(PENSION_MONTHS, PENSION_COUPLE, FLOOR_100K, PENSION_SERIES);
  assert.deepEqual(series.markers.map((m) => m.key), ['shortfall', 'pensionOnly']);
  const [shortfall, pensionOnly] = series.markers;
  // The Shortfall Age is 2030-06 — the month limb 3 sells the last $317.69 of parcels and STILL
  // cannot fund the spend — and the Pension-Only Age is the month after, the first month that opens
  // with nothing. One month apart here; 73 months apart on the fixture pair that proves the two are
  // independent. Neither implies the other, and neither is derived from the other: this is the
  // WORST case for two captions drawn at one height, which is why `renderChart.ts` gives each
  // marker its own caption row unconditionally rather than only when they look close.
  assert.equal(shortfall.month, '2030-06');
  assert.equal(shortfall.month, PENSION_MONTHS[shortfall.index].month);
  assert.equal(pensionOnly.month, '2030-07');
  assert.equal(pensionOnly.index - shortfall.index, 1);
});

test('a plan that CAN be asked and never runs out gets the other note, not the same one', () => {
  // Coverage present, outcome `never` — a different fact from "cannot be computed", and it gets its
  // own sentence rather than silence or the other one.
  const series = monthsToSeries(RICH_MONTHS, PENSION_COUPLE, FLOOR_100K, PENSION_SERIES);
  assert.equal(pensionOnlyAge(RICH_MONTHS, PENSION_COUPLE, PENSION_SERIES).outcome, 'never');
  assert.equal(series.markers.some((m) => m.key === 'pensionOnly'), false);
  assert.deepEqual(otherNotes([...series.notes]), [PENSION_ONLY_NEVER_NOTE]);
  // The line above is the note compared with itself — empty `PENSION_ONLY_NEVER_NOTE` and both
  // sides are `['']`, so until P4-15 this sentence could be deleted with the suite green, and the
  // `notEqual` in the sibling test would still pass because the OTHER note was untouched. What it
  // defends is the same property its sibling defends: this outcome gets a sentence of its own,
  // saying which marker is missing and that the reason is "it never happens", not "it is unknown".
  // P17-6: short by ruling (it stays visible), so not empty is the floor and the two phrases below
  // are what it must still carry.
  assert.ok(PENSION_ONLY_NEVER_NOTE.trim().length > 0, 'the note is empty');
  assert.match(PENSION_ONLY_NEVER_NOTE, /Pension-Only/, 'the note no longer names the marker that is missing');
  assert.match(PENSION_ONLY_NEVER_NOTE, /never|always holds|does not (happen|occur)/i,
    'the note no longer says the reason is that it NEVER happens — which is the whole of what makes it the other note');
  assert.notEqual(PENSION_ONLY_NEVER_NOTE, PENSION_ONLY_UNCOMPUTABLE_NOTE,
    'the two outcomes are being explained with one sentence: "cannot be computed" and "never happens" are different facts');
});

test('a walk that never falls short produces NO marker rather than one at index 0', () => {
  const funded = MONTHS.slice(0, MONTHS.findIndex(isShort));
  assert.ok(funded.length > 100);
  const series = monthsToSeries(funded, DEMO_HOUSEHOLD, FLOOR_100K);
  assert.deepEqual(others(series.markers), []);
  assert.equal(series.months.length, funded.length);
});

// --- §6 Shape, purity and the renderer that is not here ------------------------------------------

test('every series is exactly one value per month, in the walk’s own order', () => {
  assert.deepEqual([...SERIES.months], MONTHS.map((m) => m.month));
  for (const [path, values] of [...numericSeriesIn(SERIES), ['$.overlays[1].values', SERIES.overlays[1].values]]) {
    assert.equal(values.length, MONTHS.length, path);
  }
  assert.equal(SERIES.belowFloor.length, MONTHS.length);
});

test('`monthsToSeries` is pure and its output is frozen', () => {
  assert.deepEqual(monthsToSeries(MONTHS, DEMO_HOUSEHOLD, FLOOR_100K), monthsToSeries(MONTHS, DEMO_HOUSEHOLD, FLOOR_100K));
  assert.ok(Object.isFrozen(SERIES) && Object.isFrozen(SERIES.bands) && Object.isFrozen(SERIES.bands[0].values));
});

test('the returned shape is renderer-agnostic: plain numbers, strings and booleans only', () => {
  for (const [path, value] of walkValues(SERIES)) {
    const kind = Array.isArray(value) ? 'array' : typeof value;
    assert.ok(['array', 'object', 'number', 'string', 'boolean'].includes(kind), `${path} is a ${kind}`);
  }
  // No renderer: the Chart.js-vs-hand-SVG decision is the user's and nothing here anticipates it.
  assert.doesNotMatch(CODE, /canvas|document\.|window\.|<svg|innerHTML|getContext|chart\.js/i);
});

// --- §4b NO FLOOR STATED: nothing is drawn, nothing is counted, and nothing is guessed (P4-14) -----
//
// `Settings.contingencyFloor` is optional. A plan that states none must produce the series a build
// before the field existed produced — which is proved by ABSENCE, and absence is only a fact if the
// same assertions can find the thing when it IS there. Every case below has its positive control in
// the same test.

test('NO FLOOR STATED — no band, no breach, and no key of either in the serialised series', () => {
  // Built the way the PAGE builds it — `statedContingencyFloor` off the demo plan's own settings,
  // which state no floor — and not as a literal `undefined`, so that a reader which defaulted an
  // absent field to some figure fails here. The literal is asserted beside it as the control that
  // the two routes to "no floor" are the same route.
  assert.equal(statedContingencyFloor(DEMO_SETTINGS), undefined, 'the demo settings state a floor — this test proves nothing');
  const none = monthsToSeries(MONTHS, DEMO_HOUSEHOLD, statedContingencyFloor(DEMO_SETTINGS), DEMO_AGE_PENSION_SERIES);
  assert.deepEqual(none, monthsToSeries(MONTHS, DEMO_HOUSEHOLD, undefined, DEMO_AGE_PENSION_SERIES));
  const stated = monthsToSeries(MONTHS, DEMO_HOUSEHOLD, FLOOR_700K, DEMO_AGE_PENSION_SERIES);

  // 1. No FLOOR overlay. The reachable line is still there, so the chart is not empty — the FLOOR is.
  assert.deepEqual(none.overlays.map((o) => o.key), ['accessible']);
  assert.deepEqual(stated.overlays.map((o) => o.key), ['accessible', 'floor']);

  // 2. No key, and `undefined` is not good enough: `Object.hasOwn` and `JSON.stringify` disagree
  //    about a key set to `undefined`, and a plan file that round-trips through JSON would then
  //    gain and lose the field depending on which of the two a reader asked.
  assert.equal(Object.hasOwn(none, 'floor'), false);
  assert.equal(Object.hasOwn(none, 'belowFloor'), false);
  assert.equal(Object.hasOwn(stated, 'floor'), true);
  assert.equal(Object.hasOwn(stated, 'belowFloor'), true);
  assert.equal(none.floor, undefined);
  assert.equal(none.belowFloor, undefined);

  // 3. The serialised series carries no mention of a floor AT ALL — the byte-level form of the
  //    same claim, and the one a renderer or a saved fixture would actually see.
  assert.equal(/floor/i.test(JSON.stringify(none)), false, 'the floorless series still says "floor" somewhere');
  assert.ok(/"floor"/.test(JSON.stringify(stated)), 'the control found no floor either — this test proves nothing');
  assert.ok(/"belowFloor"/.test(JSON.stringify(stated)));

  // 4. And NOTHING ELSE MOVED: every other field is identical to the stated-floor series, so the
  //    absence costs the chart nothing but the floor.
  const withoutFloorFields = ({ floor, belowFloor, overlays, ...rest }) => ({
    ...rest,
    overlays: overlays.filter((o) => o.key !== 'floor'),
  });
  assert.deepEqual(withoutFloorFields(none), withoutFloorFields(stated));
});

test('a page that states no floor cannot be asked for a breach — there is no figure to ask about', () => {
  // The engine side of the same absence: `statedContingencyFloor` returns `undefined` and there is
  // no floor to hand `contingencyFloorBreach`, so no breach is computed rather than one computed
  // against a figure nobody chose. The refusal below is what a caller who ignored that would get.
  assert.equal(statedContingencyFloor(DEMO_SETTINGS), undefined);
  assert.throws(() => contingencyFloorBreach(MONTHS, DEMO_HOUSEHOLD, floorOf(0)), /is not a floor/);
});

// HEAS review 2026-09-25: the bands don't net out a HEAS debt, so "the bands add to total wealth" is false
// wherever one is owed. The chart must say so then, and only then.
test('the HEAS debt note shows where a HEAS debt is owed, and nowhere else', async () => {
  const { HEAS_DEBT_NOTE } = await import('../dist/app/monthsToSeries.js');
  const prefix = MONTHS.slice(0, 12);
  const plain = monthsToSeries(prefix, DEMO_HOUSEHOLD, FLOOR_100K);
  assert.ok(!plain.notes.includes(HEAS_DEBT_NOTE), 'the note shows with no HEAS debt');
  const owing = [...prefix.slice(0, -1), Object.freeze({ ...prefix.at(-1), heasDebt: 250_000 })];
  const withDebt = monthsToSeries(owing, DEMO_HOUSEHOLD, FLOOR_100K);
  assert.ok(withDebt.notes.includes(HEAS_DEBT_NOTE), 'a HEAS debt is owed but the chart still claims the bands are total wealth');
  // The debt line shows only then, too: no HEAS loan, no loan line and no legend entry.
  assert.ok(!plain.overlays.some((o) => o.key === 'heasDebt'), 'a HEAS line on a plan with no HEAS loan');
  assert.deepEqual(withDebt.overlays.find((o) => o.key === 'heasDebt')?.values.at(-1), 250_000);
});

// GIFT slice 2 (register §4.12): money given away is in neither band, so a gift still counted is its
// own line — drawn only where there is one — and the cut-off shading reads what the assets test saw.
test('a gift still counted is its own line, drawn only where there is one, and the cut-off shading counts it', () => {
  const plain = monthsToSeries(MONTHS, DEMO_HOUSEHOLD, FLOOR_100K, DEMO_AGE_PENSION_SERIES);
  assert.ok(!plain.overlays.some((o) => o.key === 'deprivedAssets'), 'a gifts line on a plan with no gift');
  const index = MONTHS.findIndex((m) => m.assetsTestThresholds !== undefined && m.assessableAssets <= m.assetsTestThresholds.noPensionAbove);
  assert.ok(index >= 0, 'the fixture needs a month under the cut-off');
  const month = MONTHS[index];
  const over = month.assetsTestThresholds.noPensionAbove - month.assessableAssets + 100;
  const gifted = MONTHS.map((m, i) => (i === index ? Object.freeze({ ...m, deprivedAssets: over }) : m));
  const series = monthsToSeries(gifted, DEMO_HOUSEHOLD, FLOOR_100K, DEMO_AGE_PENSION_SERIES);
  const line = series.overlays.find((o) => o.key === 'deprivedAssets');
  assert.ok(line, 'the gift is not drawn');
  assert.equal(line.label, OVERLAY_LABELS.deprivedAssets);
  assert.match(line.label, /^Gifts still counted by Centrelink/);
  assert.equal(line.values[index], over);
  assert.equal(line.values.filter((v) => v !== 0).length, 1);
  // Drawn with or without a stated floor — the two overlay lists are built apart.
  assert.deepEqual(monthsToSeries(gifted, DEMO_HOUSEHOLD, undefined, DEMO_AGE_PENSION_SERIES).overlays.find((o) => o.key === 'deprivedAssets')?.values, line.values);
  // The bands still partition what the Household HOLDS.
  assert.deepEqual(series.bands, plain.bands);
  assert.equal(series.aboveCutOff?.[index], true, 'the shading ignored the gift the assets test counted');
  assert.equal(plain.aboveCutOff?.[index] ?? false, false);
});

// Coverage gap 1: cars and contents are counted by the assets test but are not money, so they are in
// neither band — their own line, drawn only where stated, and the cut-off shading counts them.
test('cars and contents are their own line, drawn only where stated, and the cut-off shading counts them', () => {
  const plain = monthsToSeries(MONTHS, DEMO_HOUSEHOLD, FLOOR_100K, DEMO_AGE_PENSION_SERIES);
  assert.ok(!plain.overlays.some((o) => o.key === 'personalAssets'), 'a cars line on a plan with none');
  const index = MONTHS.findIndex((m) => m.assetsTestThresholds !== undefined && m.assessableAssets <= m.assetsTestThresholds.noPensionAbove);
  assert.ok(index >= 0, 'the fixture needs a month under the cut-off');
  const month = MONTHS[index];
  const over = month.assetsTestThresholds.noPensionAbove - month.assessableAssets + 100;
  const owned = MONTHS.map((m, i) => (i === index ? Object.freeze({ ...m, personalAssets: over }) : m));
  const series = monthsToSeries(owned, DEMO_HOUSEHOLD, FLOOR_100K, DEMO_AGE_PENSION_SERIES);
  const line = series.overlays.find((o) => o.key === 'personalAssets');
  assert.ok(line, 'cars and contents are not drawn');
  assert.equal(line.label, OVERLAY_LABELS.personalAssets);
  assert.match(line.label, /^Cars, contents and other things you own/);
  assert.equal(line.values[index], over);
  assert.deepEqual(monthsToSeries(owned, DEMO_HOUSEHOLD, undefined, DEMO_AGE_PENSION_SERIES).overlays.find((o) => o.key === 'personalAssets')?.values, line.values);
  assert.deepEqual(series.bands, plain.bands);
  assert.equal(series.aboveCutOff?.[index], true, 'the shading ignored what the assets test counted');
});
