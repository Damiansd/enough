// P7-1 §B — the pure comparison layer: N walks → N TOTAL-WEALTH lines, and **no means-test split
// anywhere in the returned object**.
//
// The failure this suite is pointed at is the one `chartConfig.ts` already names: a second
// Scenario's two bands pushed into the one wealth stack "would draw every reachable dollar twice
// and print a total larger than it is". The first line of defence is that there is nothing to
// stack — the comparison series has no `bands` field, no band key and no `accessible` figure at
// all — and §2 sweeps the whole returned object for one.
//
// ⚠️ **EVERY DIRECTIONAL ASSERTION IS MADE ACROSS THE WALK.** The demo fixture's terminal wealth is
// bit-identical under the edit this suite uses (and has been under every edit type tried on it), so
// a test that compared final months would pass whatever the code did. §1 counts the months that
// moved and checks they all moved the same way.
import test from 'node:test';
import assert from 'node:assert/strict';

import { DEMO_PLAN } from '../dist/app/demoHousehold.js';
import { parsePlan } from '../dist/core/parsePlan.js';
import { scenarioWalks } from '../dist/app/scenarioWalks.js';
import {
  COMPARISON_NOTE,
  SHORTFALL_IN_LIST_NOTE,
  agePensionSummary,
  comparisonSeries,
  shortfallSummary,
} from '../dist/app/comparisonSeries.js';
import { shortfallAge } from '../dist/core/outcomes.js';

const BIG_SPEND = Object.freeze({
  id: 'extra-1',
  date: '2030-03-01',
  type: 'ONE_OFF_EXPENSE',
  owner: 'household',
  params: { amount: 250_000_00 },
  enabled: true,
  createdAt: '2026-09-19',
});

const planWith = (scenarios, entries = [BIG_SPEND]) =>
  parsePlan(
    JSON.parse(
      JSON.stringify({
        ...DEMO_PLAN,
        entries: [...DEMO_PLAN.entries, ...entries],
        scenarios,
        activeScenarioId: scenarios[0].id,
      }),
    ),
  );

const TWO = [
  { id: 'baseline', name: 'Baseline', parentId: null, entryIds: DEMO_PLAN.entries.map((entry) => entry.id) },
  { id: 'child', name: 'Big spend', parentId: 'baseline', entryIds: [BIG_SPEND.id] },
];

const thrown = (fn) => {
  try { fn(); } catch (error) { return error; }
  return assert.fail('nothing was thrown');
};

// --- §1 One entry apart, and the difference runs the way the entry does ---------------------------

test('two scenarios differing by ONE $250,000 expense differ across the walk, and always downwards', () => {
  const plan = planWith(TWO);
  const series = comparisonSeries(plan, scenarioWalks(plan));
  assert.deepEqual(series.lines.map((line) => line.scenarioId), ['baseline', 'child']);
  const [baseline, child] = series.lines;
  assert.equal(baseline.values.length, 501);
  assert.equal(child.values.length, 501);

  const moved = baseline.values
    .map((value, index) => ({ index, baseline: value, child: child.values[index] }))
    .filter((row) => row.baseline !== row.child);
  // **458 months where it was 158, and Waterfall limb 5 is why** (2026-09-19). The two walks used
  // to converge from index 200: both households were broke from there on, and two broke households
  // hold the same nothing. Now both spend their released super instead of reporting a debt, so the
  // $250,000 the child spent in 2030 is still missing from its wealth in 2068.
  // ⚠️ **AND 309 WHERE IT WAS 458, SINCE REGISTER O85 (2026-09-21).** The stated spending level is a
  // REAL figure now, so both households spend more every year than they used to and BOTH run their
  // super out before the horizon: from the month after the shortfall the two walks hold the same
  // nothing again and the $250,000 stops being visible.
  // ⚠️ **AND 308 SINCE P10-5, on the same day and one month earlier.** The demo plan is stated as at
  // 1 September, and until P10-5 the engine paid no Account-Based Pension minimum before the
  // following 1 July — a nil with no clause behind it in SIS Reg Sch 7. That money is now drawn and
  // spent ten months sooner in BOTH walks, so both converge on nothing a month earlier. The run that
  // moves is 2030-04 … 2055-11 — 308 months — and the 150 that follow are the tail in which neither
  // household has anything left to differ by.
  assert.equal(158, 158, 'the pre-limb-5 count, kept beside the new one');
  assert.equal(458, 458, 'the pre-O85 count, kept beside the new one');
  assert.equal(309, 309, 'the pre-P10-5 count, kept beside the new one');
  // ⚠️ **AND 458 AGAIN SINCE 2026-09-23, for the pre-O85 reason arriving by another road.** A plan
  // with no series now INDEXES the Age Pension on its own growth rates instead of carrying the 2026
  // sets forward; from the late 2030s the rate follows the MTAWE floor faster than the target rises,
  // so NEITHER household runs out, and the $250,000 is still missing from the child's wealth in the
  // walk's last month. Every month from 2030-04 to 2068-05 moves.
  assert.equal(308, 308, 'the pre-2026-09-23 count, kept beside the new one');
  assert.equal(moved.length, 458, 'the spend moves 458 months — a different count means the fixture changed');
  // ⚠️ **EVERY MONTH BELOW MOVED ONE MONTH EARLIER ON 2026-09-21 (P10-5), BY ONE MECHANISM.** The demo
// plan is stated as at 1 September, and until that day the engine paid no Account-Based Pension
// minimum before the following 1 July — a nil with no clause behind it in SIS Reg Sch 7. Ash's
// pension now pays its opening part-year, that money is drawn and spent ten months sooner, and every
// exhaustion downstream of it arrives a month sooner: the shortfall marker, the Pension-Only marker,
// the Offset's emptying and the nil tail all shift by exactly one, and by the same one.
  assert.equal(series.months[moved.at(-1).index], '2068-05');
  assert.equal(501 - (moved.at(-1).index + 1), 0, 'and there is no tail of shared nothing since 2026-09-23');
  assert.deepEqual(moved.filter((row) => row.child > row.baseline), [], 'spending $250,000 made the household richer in some month');
  // The first month that moves is the one AFTER the entry's own month: the bands are read on a
  // month's first day (ADR-0005), so a 2030-03 outflow first shows in 2030-04.
  assert.equal(series.months[moved[0].index], '2030-04');
  assert.ok(moved[0].baseline - moved[0].child > 0);

  // ⚠️ **THE INSENSITIVITY THIS SUITE IS WRITTEN AROUND IS BACK, AND THAT IS THE POINT OF THIS
  // PARAGRAPH.** It has now been true, false and true again on one fixture: until Waterfall limb 5
  // both walks ended at nil (broke is broke); from P4-1e the child ended at $741,667.34, because the
  // Age Pension is paid past the published window and a household that has spent its capital still
  // has an income; and since register O85 both walks end at NIL once more, because a spending level
  // that rises with prices outruns that income too. **So no assertion here may ever be simplified
  // into a comparison of terminal wealth** — it is the same fixture and the third answer.
  //
  // ⚠️ **AND ON 2026-09-23 IT FLIPPED A FOURTH TIME.** The Age Pension indexes on the plan's own
  // growth rates now, neither walk reaches nil, and terminal wealth DOES tell these two apart — the
  // baseline ends at $1,263,994.46 and the child at $756,429.42. That is this fixture's answer today
  // and not a licence: the paragraph above is why the direction is asserted over every month, above.
  // ⚠️ **AND BOTH MOVED UP WITH INTEREST ON CASH (2026-09-23): the baseline by $27,297.72 to
  // $1,291,292.18 and the child by $42,617.58 to $799,047.00.** The cash earns the plan's 2.5% CPI.
  // Over the baseline walk that is $25,696.99 of interest and $1,144.95 more income tax (Dana's, while
  // she works), and $37,642.18 LESS Age Pension, because the money it leaves behind is assessed. The
  // sum of those flows is negative; terminal wealth rises anyway because the interest arrives early
  // and is spent first, sparing pension-account draws that then compound at 6.5% for decades, while
  // the pension it costs is lost late. The child's spend empties its cash in 2030, so it earns less
  // interest ($19,471.51) and loses less pension ($22,672.24) against the same tax. The direction is
  // the one a household with interest income must have; the size is that decomposition.
  // ⚠️ **AND BOTH FELL WITH THE SWITCH AT RETIREMENT (2026-09-23): the baseline by $784,023.40 to
  // $507,268.78, and the child ALL THE WAY TO NIL.** Dana's RETIRE (2031-05-14, at 63) turns her
  // account into an account-based pension. Over the baseline walk, the flows it moved are: $255,287.66
  // MORE Age Pension (her pension is assessed from 2031-06 and cuts Ash off until 2033-03, but it is
  // drawn down first, so the couple holds less and is paid more for thirty years after); $1,959,402.06
  // LESS growth inside super, because limb 2 spends the pension before the parcels and the Offset;
  // $670,560.62 MORE growth on the parcels that are sold later instead; and $244,984.70 MORE interest
  // on cash, because each June's unspent minimum is swept into the Offset, which is drawn after the
  // parcels and so is never drawn at all — it earns 2.5% where the super it came from earned 6.5%.
  // Those four net to −$788,569.08, the $784,023.40 on the page to within the last month's own flows
  // (the terminal figure is read at the month's opening). The child, $250,000 poorer from 2030, runs
  // out: short from 2067-02 and holding nothing from 2067-03.
  assert.equal(129_129_218, 129_129_218, 'the pre-switch baseline terminal figure, kept beside the new one');
  assert.equal(79_904_700, 79_904_700, 'the pre-switch child terminal figure, kept beside the new one');
  assert.equal(25_528_766 - 195_940_206 + 67_056_062 + 24_498_470, -78_856_908);
  assert.equal(50_726_878, 50_726_878, 'the pre-order baseline terminal figure, kept beside the new one');
  // ⚠️ **AND BOTH ROSE WITH "SPEND CASH FIRST" (later on 2026-09-23): the baseline by $414,304.97 to
  // $921,573.75, and the child from NIL to $472,110.72.** The Waterfall spends cash that is not
  // offsetting a home loan straight after each year's pension minimum, and the pension above its
  // minimum after the parcels — so the swept minimums no longer pile up in cash. Over the baseline
  // walk the flows it moved are: $1,478,129.61 MORE growth inside super, because the pensions are
  // drawn LAST of the invested pools instead of first; $747,309.77 LESS growth on the parcels, which
  // are now sold before them; $127,061.84 LESS interest on cash, because there is far less cash; and
  // $188,132.73 LESS Age Pension, because the household holds more for longer. Those four net to
  // +$415,625.27, and $189.73 less income tax makes +$415,815.00 — the $414,304.97 on the page to
  // within the last month's own flows. The child's are the same four terms — +$1,228,581.41, −$494,672.94, −$122,413.56,
  // −$51,707.44 — and it is never short, where it used to be short from 2067-02: the $77,921.96 of
  // shortfall that was inflow in the old walk is gone from the new one.
  assert.equal(147_812_961 - 74_730_977 - 12_706_184 - 18_813_273, 41_562_527);
  // ⚠️ **AND $2,629.50 / $3,122.19 MORE SINCE DANA'S RETIREMENT MONTH PAYS HER DAYS WORKED
  // (2026-09-23).** Her RETIRE is 2031-05-14, the last day worked, so May 2031 pays 14/31 of her
  // month. Summed over the baseline walk the flows that moved are: $3,033.33 of salary, $126.60 of
  // tax on it and $309.40 of Guarantee; $845.01 less refunded in July 2031, because the year now
  // assesses May's pay; $4,064.60 LESS Age Pension (the income test takes $445.21 of May's, and the
  // assets test the rest, on the larger balances after); and $4,032.50 more growth and $294.96 more
  // interest on what was not drawn. They net to +$2,633.98 — the $2,629.50 on the page to within the
  // last month's own flows. The child's are the same terms — $3,033.33, −$121.50, +$309.40, −$856.67,
  // −$2,819.58, +$2,830.80, +$753.99 — netting +$3,129.77 against $3,122.19 on the page.
  assert.equal(303_333 - 12_660 + 30_940 - 84_501 - 406_460 + 403_250 + 29_496, 263_398);
  assert.equal(303_333 - 12_150 + 30_940 - 85_667 - 281_958 + 283_080 + 75_399, 312_977);
  // ⚠️ **AND $23,614.20 / $36,833.04 MORE SINCE PAY RISES WITH WAGES (2026-09-23).** Dana's $3,100 a
  // fortnight rises 3.5% a year until she retires. Over the baseline walk: $31,818.42 more salary,
  // $10,174.44 more tax and $3,245.51 more Guarantee; $79.85 less refunded at year ends; $41,991.73
  // LESS Age Pension (the income test takes a growing wage, and the assets test what it leaves); and
  // $37,880.70 more growth and $2,956.39 more interest on what it leaves. Net +$23,655.00 — the
  // $23,614.20 on the page within the last month's own flows. The child keeps more of its cash, so
  // more interest and less pension forgone: $31,818.42, −$10,131.91, +$3,245.51, −$77.39,
  // −$32,027.48, +$36,557.82, +$7,543.39, netting +$36,928.36 against $36,833.04 on the page.
  assert.equal(3_181_842 - 1_017_444 + 324_551 - 7_985 - 4_199_173 + 3_788_070 + 295_639, 2_365_500);
  assert.equal(3_181_842 - 1_013_191 + 324_551 - 7_739 - 3_202_748 + 3_655_782 + 754_339, 3_692_836);
  // ⚠️ **AND BOTH ROSE AGAIN WITH THE ASSETS-TEST FLOOR (T135, 2026-09-24): the baseline by $416.84
  // to $948,234.29, and the child by $490.08 to $512,556.03.** SS Act 1064-G7 floors the assets
  // excess to the nearest $500 (couple) before the $3/$1,000 taper runs (`flooredExcess` in
  // `agePension.ts`), and flooring the excess DOWN can only leave the reduction the same or SMALLER
  // — never larger — so every month either walk is between the free area and the cut-off now pays
  // an Age Pension rate that is the same or higher than the old continuous taper gave it, never
  // lower. Both walks hold more Age Pension income across 458 differing months, compounding through
  // decades of growth on whatever is not spent; the exact cents are not hand-derivable from a single
  // month's bound (≤ $1.50/fortnight/couple direct effect), only the SIGN is — and the sign is up,
  // on both lines, matching what is observed.
  // ⚠️ **AND THE BASELINE FELL BY $4,492.19 WITH DIV 119 (LR-1 slice 3, 2026-09-29).** Dana's sales
  // from 2033-03 pay the minimum tax: $5,564.00 charged to 2035-05, $1,793.00 of it refunded in July
  // 2035 once she is on the Age Pension. Each sale grows by its tax, so over the walk there is
  // $6,851.66 less growth (−$964.35 on the parcels, −$5,980.35 on Dana's pension account, +$93.04 on
  // Ash's) and $362.44 less interest, against $6,485.01 more Age Pension on the lower assets. Net
  // −$4,500.09 — the $4,492.19 on the page within the last month's own flows.
  assert.equal(-556_400 + 179_300 - 96_435 - 598_035 + 9_304 - 18_134 - 18_110 + 648_501, -450_009);
  assert.equal(baseline.values.at(-1), 94_823_429 - 449_219);
  assert.equal(92_157_375 - 50_726_878, 41_430_497);
  // ⚠️ **AND THE CHILD FELL BY $1,764.87 WITH THE CGT REFORM FROM 1 JULY 2027 (LR-1 slice 2,
  // 2026-09-29); the baseline did not move.** The child's $250,000 spend empties its cash and sells
  // all of Dana's parcel in 2030-03, for the same $120,295.72. From 1 July 2027 the part of that gain
  // after the stamp is indexed and never halved: $101,699.43 just before 1 July 2027, indexed by
  // 1.064 (ten quarters at 2.5%) to $108,208.19, so the net capital gain is $31,849.72 + $12,087.53 =
  // $43,937.25 where it was $41,147.86, and at Dana's 32c (30% and the levy) the tax is $892.61 more.
  // The control: the old build with the child's expense raised by exactly $892.61 ends on this very
  // figure, so the rest of the $1,764.87 is that $892.61 not compounding for 38 years.
  assert.equal(4_393_725 - 4_114_786, 278_939);
  assert.equal(Math.round(278_939 * 0.32), 89_260);
  assert.equal(child.values.at(-1), 51_255_603 - 176_487);
  assert.equal(51_255_603, 51_255_603, 'the pre-LR-1 child terminal figure, kept beside the new one');
  assert.equal(126_399_446, 126_399_446, 'the pre-interest baseline terminal figure, kept beside the new one');
  assert.equal(75_642_942, 75_642_942, 'the pre-interest child terminal figure, kept beside the new one');
  assert.equal(74_166_734, 74_166_734, 'the P4-1e terminal figure for the child, kept beside the new one');
  assert.equal(0, 0, 'the O85 terminal figure for both, kept beside the new ones');
  const firstNil = (values) => values.findIndex((value) => value === 0);
  assert.equal(firstNil(baseline.values), -1, 'the baseline runs dry again — re-read this paragraph');
  assert.equal(firstNil(child.values), -1, 'the child runs dry again — re-read this paragraph');
  assert.equal('2067-03', '2067-03', 'the pre-order month the child held nothing from, kept beside the new one');
});

test('a line is the walk’s OWN total wealth: protected + assessable, month by month', () => {
  const plan = planWith(TWO);
  const walks = scenarioWalks(plan);
  const series = comparisonSeries(plan, walks);
  for (const line of series.lines) {
    const walk = walks.byScenarioId.get(line.scenarioId);
    assert.deepEqual([...line.values], walk.map((month) => month.protectedAssets + month.assessableAssets));
  }
});

// --- §2 There is no stack here to push anything into ----------------------------------------------

test('the comparison series carries NO band, no overlay and no accessible figure — swept, not assumed', () => {
  const plan = planWith(TWO);
  const series = comparisonSeries(plan, scenarioWalks(plan));
  const keys = new Set();
  const walk = (value) => {
    if (Array.isArray(value)) { for (const member of value) walk(member); return; }
    if (value === null || typeof value !== 'object') return;
    for (const [key, member] of Object.entries(value)) { keys.add(key); walk(member); }
  };
  walk(series);
  for (const banned of ['bands', 'band', 'overlays', 'stack', 'accessible', 'protected', 'assessable', 'floor', 'belowFloor']) {
    assert.ok(!keys.has(banned), `the comparison series carries "${banned}" — the split is not drawn in this view`);
  }
  // Positive control on the same walker: it finds the keys that ARE there.
  for (const present of ['months', 'lines', 'values', 'shortfall', 'notes', 'ageAxis']) assert.ok(keys.has(present));
});

test('the two standing notes say what this view is and where the ages went', () => {
  const plan = planWith(TWO);
  const series = comparisonSeries(plan, scenarioWalks(plan));
  assert.deepEqual([...series.notes], [COMPARISON_NOTE, SHORTFALL_IN_LIST_NOTE]);
  assert.match(COMPARISON_NOTE, /TOTAL wealth/);
  assert.match(COMPARISON_NOTE, /means-test split is not drawn/);
  assert.match(SHORTFALL_IN_LIST_NOTE, /beside the chart, not captioned on it/);
});

// --- §3 The Shortfall Age, which is the comparison number and is TEXT -----------------------------

test('shortfallSummary agrees with outcomes.ts, names every person, and points at a real month', () => {
  const plan = planWith(TWO);
  const walks = scenarioWalks(plan);
  for (const id of ['baseline', 'child']) {
    const walk = walks.byScenarioId.get(id);
    const summary = shortfallSummary(walk, plan.household);
    const engine = shortfallAge(walk, plan.household);
    assert.equal(summary.outcome, engine.outcome);
    if (engine.outcome === 'never') {
      assert.equal(summary.index, undefined);
      assert.equal(summary.month, undefined);
      assert.equal(summary.text, 'No shortfall in any month.');
    } else {
      assert.equal(summary.month, engine.firstShortfall.month);
      assert.equal(walk[summary.index].month, summary.month);
      assert.match(summary.text, /^Shortfall Age \d{4}-\d{2} \(/);
      // Every Person, in household order — `outcomes.ts` refuses to pick one, so neither does this.
      for (const person of plan.household.persons) assert.match(summary.text, new RegExp(`${person.name} \\d+`));
    }
  }
});

test('“never” is a sentence, not a blank — and it is not spelled like a figure', () => {
  const household = { persons: [{ name: 'Dana', dateOfBirth: '1968-05-14' }] };
  const months = [{ month: '2026-09', lines: [] }, { month: '2026-10', lines: [] }];
  const summary = shortfallSummary(months, household);
  assert.equal(summary.outcome, 'never');
  assert.equal(summary.index, undefined);
  assert.ok(summary.text.length > 0);
  assert.doesNotMatch(summary.text, /\d{4}-\d{2}/);
});

test('an empty walk is refused rather than answered “never”', () => {
  assert.ok(thrown(() => shortfallSummary([], DEMO_PLAN.household)) instanceof RangeError);
});

// --- §4 The lines share one axis, and that is CHECKED ---------------------------------------------

test('a scenario with no walk is refused — a comparison missing one of the plans is the worst answer', () => {
  const plan = planWith(TWO);
  const walks = scenarioWalks(plan);
  const short = { active: walks.active, byScenarioId: new Map([['baseline', walks.byScenarioId.get('baseline')]]) };
  assert.match(thrown(() => comparisonSeries(plan, short)).message, /scenario "child" has no walk/);
});

test('a walk over different months is refused rather than drawn against the wrong dates', () => {
  const plan = planWith(TWO);
  const walks = scenarioWalks(plan);
  const truncated = new Map(walks.byScenarioId);
  truncated.set('child', walks.byScenarioId.get('child').slice(0, 400));
  const error = thrown(() => comparisonSeries(plan, { active: walks.active, byScenarioId: truncated }));
  assert.match(error.message, /scenario "child" covers different months/);
});

test('the age axis is the shared household’s, one label set per person', () => {
  const plan = planWith(TWO);
  const series = comparisonSeries(plan, scenarioWalks(plan));
  assert.deepEqual([...series.ageAxis.personNames], plan.household.persons.map((person) => person.name));
  assert.equal(series.ageAxis.labels.length, series.months.length);
  assert.equal(series.ageAxis.labels[0].length, plan.household.persons.length);
});

// --- §5 P6-8b — the Age Pension entitlement dimension, beside the tax one --------------------------

test('a walk that never pays the Age Pension is said as a sentence, not a blank', () => {
  const months = [{ month: '2026-09', lines: [] }, { month: '2026-10', lines: [{ description: 'Salary', effect: 'cash', amount: 100 }] }];
  const summary = agePensionSummary(months);
  assert.equal(summary.monthsPaid, 0);
  assert.equal(summary.totalMonths, 2);
  assert.equal(summary.firstMonth, undefined);
  assert.match(summary.text, /not paid/);
});

test('a walk that pays the Age Pension in some months counts them and names the first', () => {
  const months = [
    { month: '2026-09', lines: [] },
    { month: '2026-10', lines: [{ description: 'Age Pension', effect: 'cash', amount: 900 }] },
    { month: '2026-11', lines: [{ description: 'Age Pension', effect: 'cash', amount: 900 }] },
  ];
  const summary = agePensionSummary(months);
  assert.equal(summary.monthsPaid, 2);
  assert.equal(summary.totalMonths, 3);
  assert.equal(summary.firstMonth, '2026-10');
  assert.match(summary.text, /paid in 2 of 3 months, from 2026-10/);
});

test('comparisonSeries carries an agePension summary on every line, off the same walk shortfall reads', () => {
  const plan = planWith(TWO);
  const series = comparisonSeries(plan, scenarioWalks(plan));
  for (const line of series.lines) {
    assert.ok(line.agePension);
    assert.ok(line.agePension.monthsPaid <= line.agePension.totalMonths);
    assert.equal(line.agePension.totalMonths, series.months.length);
    assert.match(line.agePension.text, /^Age Pension:/);
  }
});
