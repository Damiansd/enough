// P7 (the renderer's decidable half) — `chartConfig.ts`, over the committed demo Scenario in
// `src/app/demoHousehold.ts`. `renderChart.ts` is NOT tested and cannot be: it draws to a canvas,
// which is opaque pixels. This file is therefore the whole of the guarantee that the object handed
// to Chart.js cannot lie, and it is written against five specific ways a wealth chart misleads:
//
//   1. **THE LIBRARY SILENTLY DROPS POINTS.** Chart.js can decimate a long dataset. This series is
//      501 points and the Shortfall marker sits at index 200; a sampled dataset leaves the marker
//      on the wrong month — confidently wrong, which is worse than a missing marker. §2 asserts
//      decimation is explicitly off AND that every dataset is still 501 long.
//   2. **`accessible` STACKED AS A THIRD BAND.** `protected + assessable` is total wealth;
//      `accessible` cross-cuts both. A third stacked band draws every reachable dollar twice.
//      §3 asserts the stack group membership on the returned object, by value — the disjoint types
//      in `chartConfig.ts` are erased at runtime and a cast defeats them, so the types are the
//      speed bump and this section is the guard. It also asserts the two overlays do not stack on
//      EACH OTHER, which a single shared overlay group would cause.
//   3. **A NUMBER THAT IS NOT IN THE SERIES.** §4 sweeps every numeric array in the config: each
//      must be one of the four series it was handed, and none may be a sum of any two of them.
//   4. **THE MARKER DROPPED, MOVED OR INVENTED.** §5 re-derives the Shortfall month from the
//      `Unfunded shortfall` line itself, not from the marker, and checks the caption names BOTH
//      people — `outcomes.ts` refuses to pick one and neither may the chart.
//   5. **THE HONEST UGLINESS CLEANED UP.** §6: the protected band is nil in 396 of 501 months and
//      must survive with its zeros; the phase skew between the bands (month's first day) and the
//      reachable line (its close) must still be stated on the face of the chart.
//
// §1 is the vacuity control: a flat, short or marker-less fixture would make most of this pass
// forever.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { project, SHORTFALL_LINE } from '../dist/core/projection.js';
import { DEMO_ENTRIES, DEMO_HOUSEHOLD, DEMO_SETTINGS } from '../dist/app/demoHousehold.js';
import { statedContingencyFloor } from '../dist/core/outcomes.js';
import { MARKER_LABELS, PENSION_ONLY_NEVER_NOTE, PENSION_ONLY_UNCOMPUTABLE_NOTE, monthsToSeries } from '../dist/app/monthsToSeries.js';
import {
  ASSETS_TEST_ONLY_NOTE,
  CROSS_CUT_NOTE,
  PHASE_NOTE,
  WEALTH_STACK,
  chartConfig,
  formatAxisTick,
  markerCaption,
} from '../dist/app/chartConfig.js';
import { MONEY_VIEW_BASIS } from '../dist/app/todaysDollars.js';

// The Age Pension age rules, and the notes for a Person who gets none, are on every walk (one per
// Person). They have their own file, test/app-age-pension-age-lines.test.mjs; the tests here are
// about the OTHER markers and notes, so they read past them.
const others = (markers) => markers.filter((m) => m.key !== 'agePensionAge');

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const MONTHS = project(DEMO_SETTINGS, DEMO_HOUSEHOLD, DEMO_ENTRIES);

/** The demo page's floor. Written here, in the test, because no source module may hold one. */
const FLOOR_700K = 700_000_00;
/**
 * **The floor as a plan states it (P4-14).** `monthsToSeries` no longer takes a bare figure: a
 * floor is `Settings.contingencyFloor`, stated in TODAY'S money, and it travels with the date it is
 * stated at and the CPI that raises it to a later month's price level. Built through
 * `statedContingencyFloor` rather than as a literal, so these fixtures go through the door a page
 * goes through.
 */
const STATED_700K = statedContingencyFloor({ ...DEMO_SETTINGS, contingencyFloor: FLOOR_700K });

/** concept.md's default, used only to prove two floors give two charts. */
const FLOOR_100K = 100_000_00;

const SERIES = monthsToSeries(MONTHS, DEMO_HOUSEHOLD, STATED_700K, DEMO_SETTINGS.economicSeries.agePension);
/**
 * **THE BASIS THIS FILE DRAWS IN, AND WHY IT IS THE RAW FUTURE AMOUNTS (P2-7).** `chartConfig` now
 * converts every point to today's money by default (`todaysDollars.ts`). The assertions in this
 * file are about the config's SHAPE — which datasets exist, what stacks on what, which label set
 * `mode` picks, where a rule lands — and they compare dataset arrays against `ChartSeries`'s own
 * value arrays. In the future-dollars view the lens is the identity, so those comparisons keep
 * saying exactly what they were written to say and no expectation is re-based. The today's-money
 * view is `test/app-todays-dollars.test.mjs`, which asserts that the SHAPE is identical in both and
 * that only the numbers move.
 */
const FUTURE = { view: 'futureDollars', asAtDate: DEMO_SETTINGS.asAtDate, cpi: DEMO_SETTINGS.economicSeries.cpi };
const CONFIG = chartConfig(SERIES, FUTURE);

/**
 * **THE DEMO PLAN WITH ONE FIGURE RAISED, AND IT IS HERE BECAUSE OF WATERFALL LIMB 5 (2026-09-19).**
 *
 * The committed demo used to fall short in 301 of its 501 months, beside Dana's released
 * Accumulation Phase balance, and that shortfall is what every marker assertion in this file was
 * measured on. Limb 5 spends that balance, so **the demo walk now funds every month of itself and
 * has no Shortfall Age at all** — which is the defect being fixed and not a fixture that broke.
 *
 * A chart test still has to draw a marker, so the marker fixture is the same Household, the same
 * dates and the same horizon with the spending level raised from $84,000 to $120,000 a year. One
 * figure, stated here in the test where a personal financial figure belongs, and the walk falls
 * short from index 217 (2044-10) — where it used to fall short from index 200.
 */
const SHORT_ENTRIES = DEMO_ENTRIES.map((entry) =>
  entry.type === 'SPEND_CHANGE' ? { ...entry, params: { annualSpend: 120_000_00 } } : entry,
);
const SHORT_MONTHS = project(DEMO_SETTINGS, DEMO_HOUSEHOLD, SHORT_ENTRIES);
const SHORT_SERIES = monthsToSeries(SHORT_MONTHS, DEMO_HOUSEHOLD, STATED_700K, DEMO_SETTINGS.economicSeries.agePension);
const SHORT_CONFIG = chartConfig(SHORT_SERIES, FUTURE);
const DATASETS = CONFIG.data.datasets;
const byKey = (key) => DATASETS.find((dataset) => dataset.key === key);

const SOURCE = readFileSync(join(ROOT, 'src', 'app', 'chartConfig.ts'), 'utf8');
/** The source with every comment stripped — prose about a rule is not the rule. */
const CODE = SOURCE.replaceAll(/\/\*[\s\S]*?\*\//g, '').replaceAll(/\/\/.*$/gm, '');

/** Every value in the config, with the path that reached it. No key and no depth is exempt. */
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

const protectedOf = MONTHS.map((m) => m.protectedAssets);
const assessableOf = MONTHS.map((m) => m.assessableAssets);
const accessibleOf = MONTHS.map((m) => m.accessibleAssets);
const fullPensionUpToOf = MONTHS.map((m) => m.assetsTestThresholds.fullPensionUpTo);
const noPensionAboveOf = MONTHS.map((m) => m.assetsTestThresholds.noPensionAbove);
/**
 * ⚠️ **THE FLOOR IS THE ONE SERIES THAT IS NOT FLAT IN THIS VIEW (P2-7, user ruling 2026-09-21).**
 * The Contingency Floor is stated in TODAY'S money — a household that wants $700k of buffer means
 * $700k of what it buys now — and it has no month of its own to be converted against, so it runs
 * the other way from everything else here: unchanged in the today's-money view, and INFLATED month
 * by month in this one, where keeping the same buying power in 2068 takes more dollars than it does
 * in 2026.
 *
 * Re-derived here rather than read off the config: `$700,000 × 1.025 ^ (months since 2026-09 / 12)`,
 * rounded half away from zero to a whole cent, which is `money.ts`'s own rule. Month 0 is $700,000
 * exactly — the factor is 1 — and the last month is the same buying power at 2068 prices. The
 * sweeps below still forbid an invented series: this one is computed from the floor the pure layer
 * was handed and from nothing else.
 */
const priceLevel = (month) => {
  const at = (m) => Number(m.slice(0, 4)) * 12 + Number(m.slice(5, 7));
  return 1.025 ** ((at(month) - at('2026-09')) / 12);
};
const inflated = (floor) =>
  MONTHS.map((m) => Math.sign(floor * priceLevel(m.month)) * Math.round(Math.abs(floor * priceLevel(m.month))));
const floorOf = inflated(FLOOR_700K);
const same = (a, b) => a.length === b.length && a.every((v, i) => v === b[i]);

// --- §1 The vacuity control: what this fixture ACTUALLY produces --------------------------------

test('the fixture is long, has a marker inside it, and neither band is a copy of the other', () => {
  assert.equal(SERIES.months.length, 501, 'the demo walk changed length — every figure below was measured on 501 months');
  // **THE DEMO WALK HAS NO MARKER SINCE 2026-09-19, and that is limb 5.** It used to carry one at
  // index 200 (2043-05); the household now spends Dana's released super instead of reporting a
  // debt, so there is no first short month to point at. The marker fixture is `SHORT_SERIES`.
  //
  // ⚠️ **SUPERSEDED 2026-09-21 BY REGISTER O85: the demo walk carries BOTH markers again**, at
  // 2055-12 and 2056-01, because a spending level that rises with prices outlasts the balance that
  // was funding it. `SHORT_SERIES` is kept as the marker fixture — it marks at 2044-07, eleven
  // years earlier, so no assertion about one walk can be satisfied by the other.
    // ⚠️ **BOTH MARKERS MOVED ONE MONTH EARLIER ON 2026-09-21 (P10-5), BY ONE MECHANISM.** The demo
  // plan is stated as at 1 September, and until that day the engine paid no Account-Based Pension
  // minimum before the following 1 July — a nil with no clause behind it in SIS Reg Sch 7. Ash's
  // pension pays its opening part-year now, that money is drawn and spent ten months sooner, and
  // every exhaustion downstream of it arrives a month sooner. So there is one MORE short month at
  // the end of the walk, not one fewer: 150 became 151.
  // ⚠️ **AND NO MARKER AGAIN SINCE 2026-09-23.** A plan with no series now INDEXES the Age Pension on
  // its own growth rates instead of carrying the 2026 sets forward; from the late 2030s the rate
  // follows the MTAWE floor at 3.5%, faster than the 2.5% the target rises by, so the demo couple
  // never runs out: no short month, and a 'never' Pension-Only Age. `SHORT_SERIES` is once more the
  // only marker fixture.
  assert.deepEqual(others(SERIES.markers).map((m) => [m.key, m.month]), []);
  assert.equal(MONTHS.filter((m) => m.lines.some((l) => l.description === SHORTFALL_LINE)).length, 0);
  assert.equal(SHORT_SERIES.months.length, 501);
  // ⚠️ **TWO MARKERS SINCE 2026-09-21 (P4-1e), where there was one.** The standing table makes the
  // Pension-Only Age computable on a plan that states no forward series — which the demo plan is —
  // so this fixture now carries the Shortfall Age AND the Pension-Only Age, one month apart.
  assert.equal(others(SHORT_SERIES.markers).length, 2);
  assert.deepEqual(others(SHORT_SERIES.markers).map((m) => m.key), ['shortfall', 'pensionOnly']);
  // 217 → 227 on 2026-09-20 (P6-8 brief 3, chunk 2b): the employer Superannuation Guarantee is
  // credited from this chunk, so the marker fixture funds ten more months before it falls short.
  // **227 → 355 on 2026-09-21 (P4-1e)**: the Age Pension is paid past the published window, so it
  // funds another 128 months — 2045-08 to 2056-04.
  // `test/app-months-to-series.test.mjs` §1 re-derives the size of both from the walk itself.
  // **355 → 214 on 2026-09-21 (register O85)**: the stated spending level is a REAL figure, so this
  // fixture spends more every year and falls short at 2044-07 instead of 2056-04 — eleven years and
  // nine months earlier, the largest single move any headline in this suite has made.
  // ⚠️ **214 → 215 on 2026-09-21 (P10-5), AND IT IS THE ONE MOVE IN THIS FILE THAT RUNS THE OTHER
  // WAY.** Everywhere else on this plan the fix brings a date one month FORWARD, because money is
  // drawn and spent sooner. Here the household is genuinely short, so paying its pension minimum
  // from month one is income it did not have, and the shortfall arrives one month LATER: 2044-07
  // becomes 2044-08. Both directions come out of the same change, which is why both are pinned.
  assert.equal(214, 214, 'the pre-P10-5 index, kept beside the new one');
  // **215 → 253 on 2026-09-23**: the Age Pension indexes on the plan's own growth rates instead of
  // standing at its 2026 values, so the same $120,000 target is met for thirty-eight months more —
  // 2044-08 to 2047-10.
  assert.equal(215, 215, 'the pre-2026-09-23 index, kept beside the new one');
  // **253 → 254 with interest on cash (2026-09-23)**: the cash earns the plan's 2.5% CPI, and the
  // $9,459 it nets before 2047-10 funds that month — see `app-months-to-series.test.mjs` §1.
  assert.equal(253, 253, 'the pre-interest index, kept beside the new one');
  assert.equal(254, 254, 'the pre-switch index, kept beside the new one');
  // ⚠️ **254 → 233 with the switch at retirement (2026-09-23), twenty-one months EARLIER.** Dana's
  // RETIRE (2031-05-14, at 63) makes her account an account-based pension, and two things follow on
  // this $120,000 walk. The pension counts in the assets test while she is under 67, so the couple
  // is paid $63,428.93 less Age Pension by 2035-05 ($38,153.51 less net by 2046-01, once the drawn-
  // down pension lets some back). And the pension is limb 2's, drawn BEFORE the parcels and the
  // Offset, so the 6.5% pool is spent first and the 2.5% cash kept: $148,717.84 less growth by
  // 2046-01. Together the switched walk opens 2046-01 $188,586.36 poorer; the kept-out walk drains
  // about $9,269 a month there ($16,151.83 of spending against $6,882.76 of pension), so the money
  // runs out 188,586 ÷ 9,269 = 20.3 → twenty-one months sooner. The kept-out walk still marks 2047-11.
  assert.equal(Math.ceil(18_858_636 / (1_615_183 - 688_276)), 21);
  // ⚠️ **233 → 243 with "spend cash first" (later on 2026-09-23), ten months LATER** — most of the
  // switch's cost above was the order, not the switch. Cash with no loan to offset is now spent
  // straight after the pension minimums, and the pensions above them after the parcels, so the
  // minimums no longer pile up in cash at 2.5% while the 6.5% pools are drawn. By 2046-01 the walk
  // has earned $144,694.10 more growth and $47,609.81 less interest, and been paid $3,110.33 less Age
  // Pension; it opens 2046-01 holding $99,987.38 where it held $14,913.55 — $85,073.83 more. At the
  // ~$9,269 a month it then drains that is 9.2 months, and it runs 10 months longer, the tenth
  // bought by the Age Pension rising as the assets fall. The kept-out walk marks 2047-12.
  assert.equal(233, 233, 'the pre-order index, kept beside the new one');
  assert.equal(9_998_738 - 1_491_355, 8_507_383);
  // ⚠️ **243 → 246 since pay rises with wages (2026-09-23), three months LATER.** Dana's pay rises
  // 3.5% a year until she retires. By 2046-01 the walk has been paid $31,818.42 more salary, taken
  // $10,314.65 more tax and $16,794.21 less Age Pension for it, credited $3,245.51 more Guarantee and
  // grown $22,062.99 more on what it kept (and $22.25 more interest): $30,040.31 more, to the cent of
  // what it holds. At the ~$9,236 a month it drains there ($16,118.63 of spending against $6,882.76
  // of pension) that is 3.25 months, and it runs out three months later.
  assert.equal(3_181_842 - 1_031_465 - 1_679_421 + 324_551 + 2_206_299 + 2_225, 3_004_031);
  assert.equal(Math.floor(3_004_031 / (1_611_863 - 688_276)), 3);
  assert.equal(243, 243, 'the pre-wage-growth index, kept beside the new one');
  assert.equal(SHORT_SERIES.markers[0].index, 246, 'the marker moved — §2’s point about decimation was measured inside the walk');
  assert.equal(SHORT_SERIES.markers[0].month, '2047-03');
  assert.equal(SHORT_SERIES.markers[1].month, '2047-04');
  assert.ok(!same(protectedOf, assessableOf));
  assert.ok(!same(accessibleOf, assessableOf), 'the reachable overlay is not a copy of a band');
  // **60 months below $700,000 where there used to be 29, and limb 5 is why**: the reachable
  // figure now falls every month the household spends its released super, where before the money
  // sat in the account and the walk reported a debt instead. The floor is more exercised, not less.
  //
  // ⚠️ **AND 46 SINCE P4-11 (2026-09-19) — the sentence above is kept because it is still the
  // reason the count is not 29, but 60 is no longer the count.** `accessibleWealth` now reads the
  // walk's real cessation, so Dana's released accumulation balance is reachable from 2031-06 (she
  // retires 2031-05-14) instead of from 2033-06 (her 65th). The fourteen breaches that went are
  // one unbroken run inside that window — 2032-04 through 2033-05, the trough that used to bottom
  // out at $650,819.18 — and `app-months-to-series.test.mjs` §4 names them month by month.
  //
  // ⚠️ **AND 15 SINCE P6-8 BRIEF 3 CHUNK 2B (2026-09-20).** The employer Superannuation Guarantee
  // is credited from that chunk, which lifts every LATER month of this walk above $700,000; what is
  // left below the floor is the opening run, 2026-09 to 2027-11, before the credits and their
  // compounding have accumulated. The floor is still exercised and the run is still inside the
  // walk — `app-months-to-series.test.mjs` §3 names both ends of it.
  assert.equal(29, 29, 'the pre-limb-5 count, kept beside the new one');
  assert.equal(60, 60, 'the pre-P4-11 count, kept beside the new one');
  assert.equal(46, 46, 'the pre-Guarantee count, kept beside the new one');
  // ⚠️ **AND 279 SINCE P4-14 (2026-09-21), and this is not a regression — it is the floor being
  // read as what it says.** A $700,000 buffer stated in TODAY'S money is $1,981,725 of 2068 money,
  // and the walk's later months were never compared with that figure before: they were compared
  // with a flat $700,000, which by then is a third of the buffer the household asked for. Two runs
  // now, and they say different things — the opening one (2026-09 … 2031-05) is the household
  // before its super is reachable, and the closing one (2049-12 … 2068-05) is the drawdown falling
  // behind prices. `app-months-to-series.test.mjs` §4 names both ends of both.
  assert.equal(15, 15, 'the pre-P4-14 count, kept beside the new one');
  // **279 → 192 on 2026-09-21 (P4-1e)**: the Age Pension is paid in 99 months of this walk, so less
  // capital is spent and the closing run starts seven years later — 2049-12 became 2057-03. The
  // two-run shape and both outer ends are unmoved.
  // **AND 192 → 371 on 2026-09-21 (register O85)**: the spending level is a REAL figure, so the
  // capital the pension was preserving is spent after all and the closing run opens at 2042-04
  // rather than 2057-03. Six readings of one count — 29, 60, 46, 15, 279, 192, 371 — and each names
  // its own cause, which is why none of them is deleted.
  assert.equal(279, 279, 'the pre-P4-1e count, kept beside the new one');
  assert.equal(192, 192, 'the pre-O85 count, kept beside the new one');
  // ⚠️ **AND 371 → 372 on the same day (P10-5).** One more month falls under the floor, because the
  // pension is drawn a month sooner and the household's reachable money crosses $700,000 a month
  // sooner. It is the same single month every other figure in this file moved by.
  assert.equal(371, 371, 'the pre-P10-5 count, kept beside the new one');
  // **AND 372 → 311 on 2026-09-23**: the Age Pension indexes on the plan's own growth rates instead of
  // standing at its 2026 values, so more capital is kept and the closing run opens at 2047-04 rather
  // than 2042-03. The opening run and both outer ends are unmoved.
  assert.equal(372, 372, 'the pre-2026-09-23 count, kept beside the new one');
  // ⚠️ **AND 311 → 304 WITH INTEREST ON CASH (2026-09-23).** The cash earns the plan's 2.5% CPI, and
  // by 2047 reachable money is $19,716.10 higher; the floor rises about $2,430 a month there and
  // reachable money falls about $600 a month, so the crossing comes 19,716 / 3,020 ≈ 6.5 months
  // later — seven months, 2047-04 to 2047-11. The opening run, 2026-09 to 2031-05, is unmoved.
  assert.equal(311, 311, 'the pre-interest count, kept beside the new one');
  // ⚠️ **AND 304 → 357 WITH THE SWITCH AT RETIREMENT (2026-09-23): the closing run opens at 2043-06
  // rather than 2047-11, 53 months sooner.** Dana's account-based pension is drawn before the Offset
  // and the parcels and counts in Ash's assets test while she is under 67, so by 2043 reachable money
  // is about $160,800 lower ($1,057,010.39 against $1,217,841.02 at 2043-06). The floor rises about
  // $2,200 a month there ($1,058,800 × 2.5% ÷ 12) and the kept-out walk's reachable money falls about
  // $760 a month, so the gap closes in 160,800 ÷ 2,960 ≈ 54 months. The opening run is unmoved.
  assert.equal(304, 304, 'the pre-switch count, kept beside the new one');
  assert.equal(357 - 304, 53);
  // ⚠️ **AND 357 → 325 WITH "SPEND CASH FIRST" (later on 2026-09-23): the closing run opens at 2046-02
  // rather than 2043-06, 32 months later.** Cash with no loan to offset is now spent straight after
  // the pension minimums, and the pensions above them after the parcels, so the minimums no longer
  // pile up in cash at 2.5%. By 2043-06 reachable money is $94,654.07 higher ($1,151,664.46 against
  // $1,057,010.39); the floor rises about $2,250 a month there and this walk's reachable money now
  // falls about $740 a month, so the gap closes in 94,654 ÷ 2,990 ≈ 31.7 months. The opening run is
  // unmoved.
  assert.equal(357, 357, 'the pre-order count, kept beside the new one');
  assert.equal(115_166_446 - 105_701_039, 9_465_407);
  // ⚠️ **AND 325 → 319 SINCE PAY RISES WITH WAGES (2026-09-23): the closing run opens at 2046-08
  // rather than 2046-02, six months later.** Dana's pay rises 3.5% a year until she retires, and what
  // it leaves after its tax and the Age Pension it costs makes reachable money $17,419.08 higher at
  // 2046-02 ($1,147,300.14 against $1,129,881.06). The floor rises about $2,350 a month there and
  // reachable money falls about $650 a month, so the gap closes in 17,419 ÷ 3,000 ≈ 5.8 months. The
  // opening run is unmoved: it ends 2031-05, before anything the higher pay leaves is reachable.
  assert.equal(325, 325, 'the pre-wage-growth count, kept beside the new one');
  assert.equal(114_730_014 - 112_988_106, 1_741_908);
  // ⚠️ **AND 319 → 320 SINCE DIV 119 (LR-1 slice 3, 2026-09-29): the closing run opens at 2046-07,
  // one month sooner.** Dana's sales from 2033 pay the minimum tax, and reachable money at 2046-07 is
  // $3,307.65 lower ($1,140,937.90 against $1,144,245.55) — under that month's floor of
  // $1,142,320.67 ($700,000 × 1.025 ^ (238/12)), which it was above. The opening run is unmoved.
  assert.equal(319, 319, 'the pre-Div 119 count, kept beside the new one');
  assert.equal(114_424_555 - 114_093_790, 330_765);
  assert.ok(114_093_790 < Math.round(70_000_000 * 1.025 ** (238 / 12)) && Math.round(70_000_000 * 1.025 ** (238 / 12)) < 114_424_555);
  assert.equal(SERIES.belowFloor.filter(Boolean).length, 320, '$700k of TODAY’S money is breached in 320 months');
  assert.ok(SERIES.belowFloor.some((below) => !below), 'a walk below the floor in every month would prove nothing about the comparison');
  assert.equal(SERIES.belowFloor.at(-1), true, 'the walk ends below a floor that has risen for 42 years');
});

test('the config is plain inspectable data — no function is hidden in it', () => {
  const functions = [...walkValues(CONFIG)].filter(([, v]) => typeof v === 'function');
  assert.deepEqual(functions.map(([path]) => path), [], 'a callback in the config is a decision nothing can assert');
});

// --- §2 Decimation is off, and the proof is the LENGTHS ------------------------------------------

test('decimation is EXPLICITLY disabled — not merely left to the library default', () => {
  assert.equal(CONFIG.options.plugins.decimation.enabled, false);
});

test('no sampling switch anywhere in the config is on, under any name', () => {
  const suspects = [...walkValues(CONFIG)].filter(([path]) =>
    /decimat|sampl|thin|lttb|min-?max/i.test(path.split('.').at(-1) ?? ''),
  );
  assert.equal(suspects.length, 1, 'the only sampling knob in the config should be `decimation`');
  for (const [path, value] of suspects) {
    assert.equal(value.enabled, false, `${path} is a sampling switch and it is not off`);
  }
});

test('EVERY dataset is one point per month — nothing was dropped, sampled or padded', () => {
  assert.equal(CONFIG.data.labels.length, 501);
  // P7-3 (2026-09-25): and the shading over the cut-off — the demo walk is above it in 28 months.
  assert.equal(DATASETS.length, 7, 'two bands, two overlays, the two assets-test lines and the cut-off shading (no HEAS debt here, so no HEAS line)');
  for (const dataset of DATASETS) {
    assert.equal(dataset.data.length, SERIES.months.length, `${dataset.key} is not one point per month`);
  }
});

test('the labels are the walk’s own months, in the walk’s own order', () => {
  assert.deepEqual([...CONFIG.data.labels], [...SERIES.months]);
  assert.equal(CONFIG.data.labels[200], '2043-05', 'the marker’s index must address the marker’s month');
});

// --- §3 The stack: two bands in it, and NEITHER overlay ------------------------------------------

test('EXACTLY the two bands are in the wealth stack', () => {
  const inStack = DATASETS.filter((dataset) => dataset.stack === WEALTH_STACK);
  assert.equal(inStack.length, 2, 'the partition has two members and the stack must have the same two');
  assert.deepEqual(new Set(inStack.map((dataset) => dataset.key)), new Set(['protected', 'assessable']));
});

test('NO overlay is in the wealth stack — a third band double-counts every reachable dollar', () => {
  for (const key of ['accessible', 'floor']) {
    const dataset = byKey(key);
    assert.ok(dataset, `the ${key} overlay is missing from the config`);
    assert.notEqual(dataset.stack, WEALTH_STACK, `the ${key} overlay is stacked with the partition`);
  }
});

test('no two overlays stack on EACH OTHER either', () => {
  assert.notEqual(byKey('accessible').stack, byKey('floor').stack, 'a shared overlay group draws the floor at floor+reachable');
});

test('the stacked axis is on — without it the two bands are two separate lines', () => {
  assert.equal(CONFIG.options.scales.y.stacked, true);
});

test('no overlay is FILLED — a filled overlay reads as a band even when it is not stacked as one', () => {
  for (const key of ['accessible', 'floor']) assert.equal(byKey(key).fill, false);
  // The bottom band fills to the axis and the top band only down to it, so neither shades the other.
  assert.equal(byKey('assessable').fill, 'origin');
  assert.equal(byKey('protected').fill, '-1');
});

test('the legend SAYS the reachable line is not part of the stack', () => {
  assert.match(byKey('accessible').label, /never added to them|not added to the shaded areas/);
  assert.ok(CONFIG.options.plugins.subtitle.text.includes(CROSS_CUT_NOTE));
  assert.match(CROSS_CUT_NOTE, /never part of the stack/);
});

test('RAW SOURCE — the module adds no two figures together anywhere', () => {
  const adds = [...CODE.matchAll(/^.*\+(?!\+).*$/gm)]
    .map(([line]) => line.trim())
    .filter((line) => !line.startsWith('*') && !/`/.test(line));
  assert.deepEqual(adds, [], 'a `+` outside a template string is arithmetic this module must not do');
});

// --- §4 Every number drawn is a number handed in -------------------------------------------------

test('each dataset carries EXACTLY the series it is named for', () => {
  assert.deepEqual([...byKey('protected').data], protectedOf);
  assert.deepEqual([...byKey('assessable').data], assessableOf);
  assert.deepEqual([...byKey('accessible').data], accessibleOf);
  assert.deepEqual([...byKey('floor').data], floorOf);
});

test('STRUCTURAL SWEEP — no numeric series in the config is anything but one of the six handed in', () => {
  const known = [protectedOf, assessableOf, accessibleOf, floorOf, fullPensionUpToOf, noPensionAboveOf];
  const strays = numericSeriesIn(CONFIG).filter(([, values]) => !known.some((series) => same(values, series)));
  assert.deepEqual(strays.map(([path]) => path), [], 'a series in the config is not one the pure layer produced');
});

test('STRUCTURAL SWEEP — no series in the config is a SUM of any two of them', () => {
  const named = Object.entries({ protected: protectedOf, assessable: assessableOf, accessible: accessibleOf, floor: floorOf });
  const sums = [];
  for (const [aName, a] of named) {
    for (const [bName, b] of named) {
      if (aName >= bName) continue;
      sums.push([`${aName}+${bName}`, a.map((v, i) => v + b[i])]);
    }
  }
  assert.equal(sums.length, 6, 'four series make six pairs — a changed shape must not quietly shrink this sweep');
  const found = [];
  for (const [path, values] of numericSeriesIn(CONFIG)) {
    for (const [name, sum] of sums) if (same(values, sum)) found.push(`${path} === ${name}`);
  }
  assert.deepEqual(found, [], 'the config draws a total the Household does not have');
});

test('the config holds no floor of its own: two floors give two charts', () => {
  const other = chartConfig(monthsToSeries(MONTHS, DEMO_HOUSEHOLD, statedContingencyFloor({ ...DEMO_SETTINGS, contingencyFloor: FLOOR_100K }), DEMO_SETTINGS.economicSeries.agePension), FUTURE);
  assert.deepEqual([...other.data.datasets.find((d) => d.key === 'floor').data], inflated(FLOOR_100K));
  assert.notDeepEqual([...other.data.datasets.find((d) => d.key === 'floor').data], floorOf);
});

test('RAW SOURCE — the module names no floor of its own', () => {
  const withoutColours = CODE.replaceAll(/rgba?\([^)]*\)|#[0-9a-f]{3,8}/gi, '');
  const big = [...withoutColours.matchAll(/\d[\d_]*/g)]
    .map(([literal]) => literal)
    .filter((literal) => literal.replaceAll('_', '').length >= 4);
  assert.deepEqual(big, [], 'a four-digit numeric literal in this module is a personal financial figure it must not hold');
});

// --- §5 The marker ------------------------------------------------------------------------------

test('the marker is the FIRST month carrying `Unfunded shortfall`, re-derived from the walk itself', () => {
  const first = SHORT_MONTHS.findIndex((month) => month.lines.some((line) => line.description === SHORTFALL_LINE));
  assert.ok(first > 0);
  // Two markers since P4-1e (2026-09-21) — the Pension-Only Age is the second, one month later.
  // This test is about the FIRST, and it is still the first short month, re-derived from the line.
  assert.equal(others(SHORT_CONFIG.markers).length, 2);
  assert.equal(SHORT_CONFIG.markers[0].key, 'shortfall');
  assert.equal(SHORT_CONFIG.markers[0].index, first);
  assert.equal(SHORT_CONFIG.markers[0].month, SHORT_MONTHS[first].month);
  assert.equal(SHORT_CONFIG.markers[0].month, SHORT_CONFIG.data.labels[SHORT_CONFIG.markers[0].index], 'the marker’s index and month disagree');
  // And a walk with no marker gets NO marker rather than one at index 0. That used to be made on
  // the demo walk, which funded every month of itself; since register O85 it does not, so the claim
  // is made on the same series with its markers taken away — which is what the §5 test below does
  // too, and it is the only route left until a self-funding fixture is written.
  assert.deepEqual([...chartConfig({ ...SERIES, markers: [] }, FUTURE).markers], []);
  assert.equal(others(CONFIG.markers).length, 0, 'the demo walk marks nothing but its Age Pension ages since 2026-09-23 — see §1');
});

test('the marker names BOTH people — `outcomes.ts` refuses to pick one, and neither may the chart', () => {
  const caption = SHORT_CONFIG.markers[0].caption;
  for (const person of DEMO_HOUSEHOLD.persons) {
    assert.ok(caption.includes(person.name), `${person.name} is missing from the marker caption`);
  }
  assert.equal(caption, markerCaption(SHORT_SERIES.markers[0]));
  assert.match(SHORT_CONFIG.markers[0].label, /Shortfall Age/);
});

test('a walk with no marker gets NO marker, not one drawn at index 0', () => {
  const noMarker = chartConfig({ ...SERIES, markers: [] }, FUTURE);
  assert.deepEqual([...noMarker.markers], []);
});

// --- §5b The second marker, and the note that stands in for an absent one (P7-5) -----------------

test('an absent marker is EXPLAINED on the face of the chart, not merely absent', () => {
  // ⚠️ **THE DEMO PLAN'S NOTE IS THE OTHER ONE SINCE 2026-09-21 (P4-1e).** It used to be that
  // *"the demo plan states no forward Age Pension series, so `monthsToSeries` cannot be asked for a
  // Pension-Only Age and says so"*; the standing table answers it, and the answer is 'never'. The
  // claim this test makes is unchanged and is about ROUTING: whichever sentence stands in for an
  // absent marker must reach the subtitle, where a reader who never scrolls past the canvas still
  // sees it — a blank space where a rule would be is the black box.
  // ⚠️ **AND SINCE REGISTER O85 (2026-09-21) THE DEMO WALK HAS NO NOTE AT ALL**: its spending level
  // rises with prices, its money runs out in 2055-12, and the Pension-Only Age is a DATE rather than
  // a 'never' — so nothing is missing from this chart and nothing is explained away. The routing
  // claim is unchanged and is now made entirely on notes handed in by this test, which is what it
  // was already doing for the half that matters; `NOTED` below is the demo series with the real note
  // put back, so the note's own position and length are still asserted.
  // ⚠️ **AND SINCE 2026-09-23 IT CARRIES THE 'never' NOTE AGAIN**: the Age Pension indexes on the
  // plan's own growth rates and the demo couple never runs out, so the answer is 'never' and the
  // note stands in for the marker. `NOTED` is kept, and is now the demo series as it is.
  assert.deepEqual([...SERIES.notes], [PENSION_ONLY_NEVER_NOTE]);
  const NOTED = { ...SERIES, markers: [], notes: [PENSION_ONLY_NEVER_NOTE] };
  // **ROUTING, asserted against a sentence this FILE owns.** Until P4-15 the four lines below were
  // `subtitle.text.includes(THE_CONSTANT)`, which compares a constant with itself: empty the
  // constant in `monthsToSeries.ts` and `[''].includes('')` is still true, so the whole test stayed
  // green with the on-screen sentence deleted (CONTEXT.md, "vacuous constant-vs-constant
  // assertion"). Nothing in `chartConfig.ts` can produce the synthetic note, so this fails the day
  // a series note stops reaching the subtitle — and it says nothing about the note's WORDING.
  const SYNTHETIC_NOTE = 'SYNTHETIC — a sentence no module owns, routed to prove the path is open';
  const routed = [...chartConfig({ ...SERIES, notes: [SYNTHETIC_NOTE] }, FUTURE).options.plugins.subtitle.text];
  assert.ok(routed.includes(SYNTHETIC_NOTE), 'a series note no longer reaches the subtitle at all');
  // Appended, never substituted: the two standing notes describe what IS drawn and still apply, so
  // the real note lands in the same position the synthetic one does, after both of them.
  const subtitle = [...chartConfig(NOTED, FUTURE).options.plugins.subtitle.text];
  assert.equal(subtitle.length, 5, 'the subtitle is no longer basis + two standing notes + the assets-test note + this walk’s one note');
  assert.equal(subtitle.indexOf(PENSION_ONLY_NEVER_NOTE), routed.indexOf(SYNTHETIC_NOTE));
  // And the five lines are five real, DIFFERENT sentences — the half `includes` cannot see. A line
  // emptied or cut to a stub fails the floor; a line copy-pasted over another fails the count.
  assert.equal(new Set(subtitle).size, 5, 'two of the subtitle’s lines are the same sentence twice');
  for (const line of subtitle) {
    // P17-6: the lines are short by ruling; not empty is the floor, and `Set` above catches a copy.
    assert.ok(line.trim().length > 0, `"${line}" is empty`);
  }
  // And a series with nothing missing adds no line at all.
  assert.deepEqual(
    [...chartConfig({ ...SERIES, notes: [] }, FUTURE).options.plugins.subtitle.text],
    // The basis line is FIRST and is there in every state — ADR-0001 requires a chart to declare
    // which money it is drawing, and "nothing is missing" is not a reason to stop saying it.
    [MONEY_VIEW_BASIS.futureDollars, CROSS_CUT_NOTE, PHASE_NOTE, ASSETS_TEST_ONLY_NOTE],
  );
});

test('two markers on one chart are drawn in TWO colours, and each caption names its own marker', () => {
  // Built from this fixture's own marker rather than a second walk: what is decidable here is that
  // `chartConfig` colours by KEY, so two markers cannot come out indistinguishable. The engine can
  // land them one month apart (see `test/app-months-to-series.test.mjs` §5b), and two rules in the
  // same stroke and colour a month apart read as one fact drawn twice.
  const shortfall = SHORT_SERIES.markers[0];
  const pensionOnly = { ...shortfall, key: 'pensionOnly', label: MARKER_LABELS.pensionOnly };
  const both = chartConfig({ ...SHORT_SERIES, markers: [shortfall, pensionOnly] }, FUTURE);
  assert.equal(both.markers.length, 2);
  assert.notEqual(both.markers[0].colour, both.markers[1].colour, 'both markers are drawn in one colour');
  assert.match(both.markers[0].label, /Shortfall Age/);
  assert.match(both.markers[1].label, /Pension-Only Age/);
  assert.equal(both.markers[1].caption, markerCaption(pensionOnly));
});

// --- §6 The honest ugliness, kept ----------------------------------------------------------------

test('the all-zero stretch of the protected band SURVIVES — it is the household’s real shape', () => {
  const values = [...byKey('protected').data];
  // ⚠️ **444 and 57 since the switch at retirement (2026-09-23), where they were 396 and 105.** The
  // protected band is Dana's accumulation account, exempt until she is 67 (2035-05-14). It now
  // becomes an account-based pension from 2031-06 — her RETIRE is 2031-05-14 — and a pension is
  // assessed at any age, so the band ends 48 months sooner: 2031-06 to 2035-05 is 7 + 36 + 5 = 48.
  assert.equal(values.filter((cents) => cents === 0).length, 444, 'the protected band is nil in 444 months of this fixture');
  assert.equal(values.length, 501, 'the nil months were filtered out rather than drawn');
  assert.equal(values.filter((cents) => cents > 0).length, 57);
  assert.equal(105 - 57, 7 + 36 + 5);
  assert.equal(MONTHS.filter((m) => m.protectedAssets > 0).at(-1).month, '2031-05');
});

test('the PHASE SKEW between the bands and the reachable line is stated on the face of the chart', () => {
  assert.match(PHASE_NOTE, /FIRST DAY/);
  assert.match(PHASE_NOTE, /CLOSE/);
  assert.ok(CONFIG.options.plugins.subtitle.text.includes(PHASE_NOTE));
  assert.equal(CONFIG.options.plugins.subtitle.display, true);
});

// P7-7 — the subtitle overflowed the canvas width. Chart.js draws each element of a subtitle's
// text ARRAY as one unbroken line with no wrapping, so the fix is length, not wording: both notes
// were cut to a single short line each, on the same order of length as each other, and the full
// prose moved to `#chart-note` below the chart (`main.ts`), which has the page's full width and
// wraps. Neither note's SUBSTANCE may be dropped — only its length — so both are still asserted by
// name above, and this section pins the length itself, since that is the part that changed.

test('CROSS-CUT NOTE — still says, on its own, that the reachable line is never part of the stack', () => {
  assert.match(CROSS_CUT_NOTE, /never part of the stack/);
  assert.ok(CONFIG.options.plugins.subtitle.text.includes(CROSS_CUT_NOTE));
});

test('both subtitle lines are ONE short line each — a proxy for "fits the canvas", since no canvas is available to measure against (TODO.md P2-9a)', () => {
  // 110 characters at the subtitle's ~12–14px font is comfortably inside a chart the demo page
  // draws at anything wider than about 480px — this is a heuristic budget, not a pixel measurement,
  // and the report says so plainly: it cannot substitute for a human looking at the rendered page.
  const BUDGET = 110;
  // A CEILING ALONE IS VACUOUS, twice over: an emptied line is 0 characters and passes it, and an
  // emptied text ARRAY makes the loop below run zero times and pass it. Both are how the subtitle
  // could disappear with this test green (P4-15), so the count and the floor are part of the
  // assertion — the budget is only half a statement about a line that has to fit.
  // ⚠️ **THREE LINES SINCE REGISTER O85 (2026-09-21), WHERE THERE WERE FOUR.** The fourth was the
  // series NOTE standing in for the absent Pension-Only marker; the demo walk answers that question
  // with a date now — its money runs out in 2055-12 — so there is no note to route and nothing is
  // missing. A note-carrying config is measured beside it, so the budget is still applied to the
  // line that only exists when something IS explained away.
  // **AND FOUR AGAIN SINCE 2026-09-23**: the demo walk answers 'never' once more, so its note is back.
  const lines = [...CONFIG.options.plugins.subtitle.text];
  // **AND FIVE SINCE 2026-09-25**: the assets-test lines carry their own one-line caveat.
  assert.equal(lines.length, 5, 'the subtitle lost a line — a loop over an empty array passes every budget');
  const withNote = [...chartConfig({ ...SERIES, markers: [], notes: [PENSION_ONLY_NEVER_NOTE] }, FUTURE).options.plugins.subtitle.text];
  assert.equal(withNote.length, 5, 'a series note no longer reaches the subtitle at all');
  lines.push(withNote.at(-1));
  for (const line of lines) {
    assert.ok(line.length <= BUDGET, `"${line}" is ${line.length} chars — over the ${BUDGET}-char budget that replaced the overflowing sentence`);
    assert.ok(line.trim().length > 0, `"${line}" is empty — inside the budget because there is nothing left of it`);
  }
});

test('the full cross-cut and phase-skew explanations survive SOMEWHERE the reader cannot miss — the paragraph below the chart', () => {
  const mainSource = readFileSync(join(ROOT, 'src', 'app', 'main.ts'), 'utf8');
  assert.match(mainSource, /chart-note/, 'main.ts no longer writes the below-chart explainer paragraph at all');
  // REACHABLE: the long explanation is carried by the info button under the chart. Take the info
  // button away, or hand it something other than the detail text, and this fails before any word
  // of the text is looked at.
  assert.match(mainSource, /chartNote\.append\(infoButton\([^)]*CHART_NOTE_DETAIL/,
    'the below-chart explanation is no longer carried by an info button under the chart');
  // AND STILL AN EXPLANATION: the two subjects it exists for, each said any way the page likes.
  // Deleting the text, or emptying it, fails the length floor and both subjects at once.
  const detail = /const CHART_NOTE_DETAIL =([\s\S]*?);\n/.exec(mainSource)?.[1] ?? '';
  assert.ok(detail.trim().length >= 120,
    `the below-chart explanation is ${detail.trim().length} characters — too short to explain either subject`);
  assert.match(detail, /cuts across|crosses|overlaps|not a slice|never part/i,
    'the below-chart paragraph no longer says the reachable line is not a slice of the stack');
  assert.match(detail, /never (a slice|added|part)|not (a slice|added|part)|is never added/i,
    'the below-chart paragraph no longer says the reachable line is never ADDED to the areas');
  assert.match(detail, /first day|start of the month|beginning of the month/i,
    'the below-chart paragraph no longer says when the shaded areas are read');
  assert.match(detail, /\bclose\b|end of the month|last day/i,
    'the below-chart paragraph no longer says when the reachable line is read');
  assert.match(detail, /weeks apart|out of phase|not (lined up|aligned)|few weeks/i,
    'the below-chart paragraph no longer says the two readings are out of step');
});

test('nothing smooths, interpolates or spans a gap', () => {
  const suspects = [...walkValues(CONFIG)].filter(([path]) =>
    /tension|cubic|spanGaps|smooth|stepped/i.test(path.split('.').at(-1) ?? ''),
  );
  // **The one exception, 2026-09-25: the two assets-test lines.** They are STEPPED — each month's
  // figure held flat to the next point, never a slope between two — and they say `spanGaps: false`
  // outright, so a month with no entitlement is a gap and never bridged. Exactly those two keys on
  // exactly those two datasets, with exactly those values; anything else is still a suspect.
  // P7-3 (2026-09-25): the cut-off shading is stepped and unbridged on the same terms, so its edge
  // meets the line it fills down to.
  const thresholdIndices = DATASETS.flatMap((d, i) => (d.key === 'fullPensionUpTo' || d.key === 'noPensionAbove' || d.key === 'aboveCutOff' ? [i] : []));
  assert.equal(thresholdIndices.length, 3);
  const allowed = new Map(thresholdIndices.flatMap((i) => [[`$.data.datasets[${i}].stepped`, 'before'], [`$.data.datasets[${i}].spanGaps`, false]]));
  const unexplained = suspects.filter(([path, value]) => !(allowed.has(path) && allowed.get(path) === value));
  assert.deepEqual(unexplained.map(([path]) => path), [], 'a smoothing option would draw the phase skew away');
  assert.equal(suspects.length, 6, 'the threshold lines lost their explicit step or their explicit no-span');
});

// --- §7 Display formatting is formatting, and nothing else ----------------------------------------
//
// P7-6 — abbreviated axis ticks. `formatAxisTick` still converts nothing (the value drawn is the
// value handed in): below $1,000 it is the page's whole-dollar figure (`formatDollars`), from $1,000
// it abbreviates to `k`, from $1,000,000 to `M` — but ONLY when the abbreviation is exact.
// `$1,234,567` is not `$1.2M`, so a value that cannot be written exactly in the short form falls back
// to the full whole-dollar figure rather than to a coarser short form. **No tick shows cents** (user
// ruling, 2026-09-24: no cents anywhere on the page); the one rounding is to the dollar, halves away
// from zero, by the same `roundToDollar` every other figure on the page goes through.

test('below $1,000: the whole-dollar figure — nothing is abbreviated this small', () => {
  // `formatAxisTick(0)` used to be `'$0.00'`, and until 2026-09-24 every other value below $1,000
  // kept its cents (`$750.00`). The page now shows whole dollars everywhere, the axis included.
  assert.equal(formatAxisTick(0), '$0', 'zero must render as $0, not $0.00');
  assert.equal(formatAxisTick(1), '$0', 'one cent rounds to the nearest dollar, and there is no -$0 or $0.01');
  assert.equal(formatAxisTick(750_00), '$750');
  assert.equal(formatAxisTick(-750_00), '-$750');
});

test('$1,000 up to $1,000,000: abbreviates to `k` when that is exact, including the $1,000 boundary itself', () => {
  assert.equal(formatAxisTick(1_000_00), '$1k', 'the boundary is INCLUDED in the k tier, per the brief');
  assert.equal(formatAxisTick(4_000_00), '$4k');
  assert.equal(formatAxisTick(750_000_00), '$750k');
  assert.equal(formatAxisTick(-4_000_00), '-$4k');
});

test('$1,000,000 and up: abbreviates to `M` when that is exact, including a one-decimal figure', () => {
  assert.equal(formatAxisTick(1_000_000_00), '$1M', 'the boundary is INCLUDED in the M tier');
  assert.equal(formatAxisTick(1_500_000_00), '$1.5M', 'a one-decimal short form, and it is exact: 1.5M is really 1,500,000');
  assert.equal(formatAxisTick(6_000_000_00), '$6M');
});

test('LOSSLESS OR NOT ABBREVIATED AT ALL — a figure the short form cannot write exactly falls back to the full figure', () => {
  // $1,234,567 is not $1.2M: the short form is never coarser than the dollar. Neither the 0-decimal
  // nor the 1-decimal short form is exact, so this must come back as the full whole-dollar figure.
  assert.equal(formatAxisTick(1_234_567_00), '$1,234,567');
  // A figure inside the k tier can fail to abbreviate for the same reason — rounded to the dollar.
  assert.equal(formatAxisTick(1_234_56), '$1,235', '$1,234.56 has no exact `k` short form either');
  assert.equal(formatAxisTick(-1_234_56), '-$1,235', 'the fallback keeps the sign too');
});

test('an abbreviated value NEVER carries cents — no two-digit fraction ever appears before `k` or `M`', () => {
  const abbreviated = [1_000_00, 4_000_00, 750_000_00, 1_000_000_00, 1_500_000_00, 6_000_000_00].map(formatAxisTick);
  assert.ok(abbreviated.every((s) => /[kM]$/.test(s)), 'the fixture above changed and no longer abbreviates — pick values back inside the tiers');
  for (const s of abbreviated) {
    assert.doesNotMatch(s, /\.\d\d[kM]$/, `${s} shows a two-digit (cents-shaped) fraction on an abbreviated value`);
  }
});

test('RAW SOURCE — table formatting is untouched: abbreviation is for axis ticks only', () => {
  const tableSource = readFileSync(join(ROOT, 'src', 'app', 'renderTable.ts'), 'utf8');
  assert.ok(!/formatAxisTick/.test(tableSource), 'renderTable.ts must not call the axis abbreviator — the table is the audit surface and shows every dollar');
  const rowsSource = readFileSync(join(ROOT, 'src', 'app', 'monthToRows.ts'), 'utf8');
  assert.ok(!/formatAxisTick/.test(rowsSource), 'monthToRows.ts must not call the axis abbreviator either');
});

// --- §8 The age view: a label SWITCH, never a recomputation ---------------------------------------
//
// The couple in `DEMO_HOUSEHOLD` is nine years apart, and the Shortfall Age marker already prints
// both ages ("Dana 74, Ash 83"). An age axis that named only one of them would make the younger
// partner's Age Pension cliff — the point her Accumulation Phase super stops being exempt from both
// means tests — look like it lands on an arbitrary date. So `chartConfig`'s age mode must report
// EVERY Person, never one, and it must not be a second computation: it is the SAME 501 points as the
// date view, under a different label. See `monthsToSeries.ts`'s header for the reasoning in full.

const AGE_CONFIG = chartConfig(SERIES, FUTURE, 'age');

test('age mode swaps ONLY the labels — every dataset and marker is identical to the date-mode config', () => {
  assert.notDeepEqual(AGE_CONFIG.data.labels, CONFIG.data.labels, 'age mode produced the same labels as date mode — nothing switched');
  assert.deepEqual(AGE_CONFIG.data.datasets, CONFIG.data.datasets, 'the age view recomputed a series instead of swapping the label set');
  assert.deepEqual(AGE_CONFIG.markers, CONFIG.markers, 'the marker moved when only the axis label changed');
});

test('the age labels are one line per Person, in household.persons order, at the fixture’s own DOBs', () => {
  assert.equal(AGE_CONFIG.data.labels.length, 501);
  assert.deepEqual(SERIES.ageAxis.personNames, ['Dana', 'Ash']);
  // Hand-derived from `demoHousehold.ts`'s stated birth dates, not read out of `ageAxis`'s own
  // output: Dana born 1968-05-14, so on 2026-09-01 she is 58 (year difference 58, and "09-01" is
  // not lexically before "05-14"); Ash born 1960-02-09, so on 2026-09-01 he is 66 by the same rule.
  assert.deepEqual([...AGE_CONFIG.data.labels[0]], ['58', '66']);
  // And at the Shortfall Age marker (index 200, month 2043-05): Dana turns 75 on 05-14, but the
  // axis reads the month's FIRST DAY — 2043-05-01 is before the 14th, so "05-01" < "05-14" and she
  // is still 74; Ash (1960-02-09) is 83 by the earlier rule ("05-01" is not before "02-09"). This is
  // the exact "Dana 74, Ash 83" the marker caption already prints, independently re-derived here.
  assert.deepEqual([...AGE_CONFIG.data.labels[200]], ['74', '83']);
  // The caption is read off the fixture that HAS a marker (see `SHORT_SERIES`). **Index 227 was
  // 2045-08 until 2026-09-21; the marker is at 355 now (P4-1e), which is 2056-04** — where Dana
  // (1968-05-14) is 87, "04-01" being before "05-14", and Ash (1960-02-09) is 96. The index-227
  // label is asserted too, unchanged: the AXIS did not move, only the marker on it.
  assert.deepEqual([...AGE_CONFIG.data.labels[227]], ['77', '85']);
  assert.deepEqual([...AGE_CONFIG.data.labels[355]], ['87', '96']);
  // **And the marker is at 215 since P10-5 — 2044-08, where Dana (1968-05-14) is 76 because "08-01"
  // is past the 14th of May, and Ash (1960-02-09) is 84.** The 227 and 355 labels above are asserted
  // unchanged, which is the point being made: the AXIS did not move, only the marker on it — and the
  // ages are the same pair at 2044-08 as at 2044-07, so the CAPTION below is a genuine control on
  // the marker rather than a second reading of the same month.
  assert.deepEqual([...AGE_CONFIG.data.labels[215]], ['76', '84']);
  // **And at 253 since 2026-09-23 — 2047-10, where Dana is 79 ("10-01" is past "05-14") and Ash is
  // 87.** The 215 label above is asserted unchanged: the axis did not move, only the marker.
  assert.deepEqual([...AGE_CONFIG.data.labels[253]], ['79', '87']);
  // **And at 254 with interest on cash — 2047-11, the same pair**: Dana is 79 until 2048-05 and Ash
  // 87 until 2048-02, so the caption is unchanged and the index above is the move.
  assert.deepEqual([...AGE_CONFIG.data.labels[254]], ['79', '87']);
  // **And at 233 since the switch at retirement — 2046-02, where Dana is 77 ("02-01" is before
  // "05-14") and Ash is 85 ("02-01" is before "02-09").** The labels above are asserted unchanged.
  assert.deepEqual([...AGE_CONFIG.data.labels[233]], ['77', '85']);
  // **And at 243 since "spend cash first" — 2046-12, where Dana is 78 ("12-01" is past "05-14") and
  // Ash is 86 ("12-01" is past "02-09").** The labels above are asserted unchanged.
  assert.deepEqual([...AGE_CONFIG.data.labels[243]], ['78', '86']);
  // **And at 246 since pay rises with wages — 2047-03, where Dana is 78 ("03-01" is before "05-14")
  // and Ash is 87 ("03-01" is past "02-09").** The labels above are asserted unchanged.
  assert.deepEqual([...AGE_CONFIG.data.labels[246]], ['78', '87']);
  assert.ok(SHORT_CONFIG.markers[0].caption.includes('Dana 78'));
  assert.ok(SHORT_CONFIG.markers[0].caption.includes('Ash 87'));
});

test('the age axis title names both people, in the SAME order the tick labels list them', () => {
  assert.equal(AGE_CONFIG.options.scales.x.title.display, true);
  assert.equal(AGE_CONFIG.options.scales.x.title.text, 'Age — Dana / Ash');
  assert.equal(CONFIG.options.scales.x.title, undefined, 'date mode must not carry an age-axis title');
});

test('calling chartConfig with no MODE argument is still the date view', () => {
  assert.deepEqual([...chartConfig(SERIES, FUTURE).data.labels], [...CONFIG.data.labels]);
});

test('RAW SOURCE — the toggle wiring exists in main.ts; this is a canary, not a proof', () => {
  // `main.ts` reaches `document.querySelectorAll` and a live `Chart` instance — neither exists
  // under `node:test` (TODO.md P2-9a), so the toggle cannot be exercised here. This asserts the
  // SOURCE calls `renderChart` a second time with a mode DERIVED from the radio input's own value
  // (never a literal), and that the previous chart is destroyed first. What remains genuinely
  // unproven until a human opens the page: that clicking the radio buttons visibly swaps the axis,
  // that the old chart does not linger doubled up on the canvas, and that the age-mode multi-line
  // tick labels and axis title render legibly rather than merely existing in the config object.
  //
  // **Restated for P6-6, and deliberately not weakened.** The mode is now held in `axisMode` so
  // that a redraw after an EDIT keeps the axis the user chose, and the chart is optional (`draw`
  // creates it, so the handler can run before one exists) — so the two facts are now pinned as
  // three: the mode is derived from the input's own value, the derived value is what `renderChart`
  // is handed, and the previous instance is destroyed IMMEDIATELY BEFORE the rebuild rather than
  // merely somewhere in the file.
  const mainSource = readFileSync(join(ROOT, 'src', 'app', 'main.ts'), 'utf8');
  assert.match(
    mainSource,
    /chart\?\.destroy\(\);\s*chart = renderChart\(canvas, series, moneyBasis\(moneyView, plan\.settings\), axisMode\);/,
    'the toggle no longer destroys the previous chart instance before rebuilding it',
  );
  assert.match(
    mainSource,
    /axisMode = input\.value === 'age' \? 'age' : 'date';/,
    'the toggle no longer derives the mode from the radio input’s own value',
  );
  assert.match(mainSource, /name="chart-axis"/, 'main.ts no longer reads the chart-axis radio group');
});

// --- §12 NO FLOOR STATED — P4-14 -------------------------------------------------------------------

test('NO FLOOR STATED — the chart has no floor dataset, and no colour or dash is chosen for one', () => {
  // Through the page's own reader, so a default for an absent floor puts a dataset back here.
  assert.equal(statedContingencyFloor(DEMO_SETTINGS), undefined, 'the demo settings state a floor — this test proves nothing');
  const none = chartConfig(monthsToSeries(MONTHS, DEMO_HOUSEHOLD, statedContingencyFloor(DEMO_SETTINGS), DEMO_SETTINGS.economicSeries.agePension), FUTURE);
  const stated = chartConfig(monthsToSeries(MONTHS, DEMO_HOUSEHOLD, STATED_700K, DEMO_SETTINGS.economicSeries.agePension), FUTURE);
  assert.deepEqual(none.data.datasets.map((d) => d.key), ['assessable', 'protected', 'accessible', 'fullPensionUpTo', 'noPensionAbove', 'aboveCutOff']);
  assert.deepEqual(stated.data.datasets.map((d) => d.key), ['assessable', 'protected', 'accessible', 'floor', 'fullPensionUpTo', 'noPensionAbove', 'aboveCutOff']);
  // A renderer that drew a flat line at nil would pass the key test above and put a line on screen.
  assert.equal(JSON.stringify(none.data.datasets).includes('floor'), false);
});

