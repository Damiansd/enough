// P5-1 / P5-2 — the month table. This replaces the scaffold wholesale, as the scaffold's own
// header asked: the Working File round trip and the single-assumption explainer are gone, because
// the thing worth proving is no longer that the pipeline runs but that a month says what it must.
//
// **The Scenario is a FILE (P8), and a first run no longer gets one for free (2026-09-20).**
// `loadPlanOrNone` reads `plan.json` through `store/files.ts`. When there is no file it says so and
// writes NOTHING, and this file mounts `firstRunPanel.ts` — two questions — instead of the page
// below. `DEMO_PLAN` is named nowhere here any more: the demo couple's figures used to be written
// to a new user's disk before they had agreed to anything, and the only plan a first run can now
// produce is the one its two answers build.
//
// **No longer read-only (P6-6).** The page can now ADD a `SPEND_CHANGE` and SWITCH any entry off
// or back on — two operations and no others; there is no in-place edit of an existing entry, and
// `planEdits.ts` says why that is a chosen limitation rather than an unfinished one. Every write
// goes through the single `save` below, which validates through `parsePlan` — the same door the
// read uses — before the transport is called at all. What a failure looks like is `planStatus.ts`,
// and the rule the loader is built around is in `loadPlan.ts`: a file that does not parse is shown
// as an error and never rewritten.
//
// Five modules and a strict order between them: the engine decides the figures, `monthToRows` and
// `monthsToSeries` decide what they READ as, and `renderTable` / `renderChart` put them on the
// page. No wording that a reader could be misled by is chosen in this file or in either writer.
import { loadPlanOrNone, PlanWriteFailure } from './loadPlan.js'; // `.js` is correct in a `.ts` file — see tsconfig.json
import { clearPlanStatus, showEntryRefusal, showPlanFailure } from './planStatus.js';
import { savePlan } from './planEdits.js';
import { infoButton } from './infoButton.js';
import { entrySummary, mountEntryEditor } from './entryForm.js';
import { mountFirstRunPanel } from './firstRunPanel.js';
import { mountScenarioPanel } from './scenarioPanel.js';
import { mountComparisonTemplateForm } from './comparisonTemplateForm.js';
import { mountSettingsPanel } from './settingsPanel.js';
import { mountTransactionsPanel } from './transactionsPanel.js';
import type { TransactionsPanel } from './transactionsPanel.js';
import { scenarioById, scenarioEntries, scenarioWalks } from './scenarioWalks.js';
import type { ScenarioWalks } from './scenarioWalks.js';
import { comparisonSeries } from './comparisonSeries.js';
import type { ComparisonSeries } from './comparisonSeries.js';
import type { ComparisonView } from './comparisonConfig.js';
import { NO_SCENARIOS_TICKED, reconcileTicked, tickedComparison, tickedSummary } from './scenarioSelection.js';
import { readLedger, readPlan, writeLedger, writePlan } from '../store/files.js';
import { HOUSEHOLD_ASSETS, personLabels } from './monthToRows.js';
import { financialYearRows } from './financialYearRows.js';
import type { EntryNamer } from './monthToRows.js';
import { monthsToSeries } from './monthsToSeries.js';
import { mortgageHeadline, mortgageTargetHeadlines } from './mortgageHeadline.js';
import { incomeHeadline } from './incomeHeadline.js';
import { sustainableSpendHeadline } from './sustainableSpendHeadline.js';
import { sustainableSpend } from '../core/sustainableSpend.js';
import type { SustainableSpend } from '../core/sustainableSpend.js';
import { statedContingencyFloor } from '../core/outcomes.js';
import { lifeStagesTimeline } from './lifeStages.js';
import { renderLifeStages } from './renderLifeStages.js';
import { financialSituationPhases } from './financialSituationPhases.js';
import type { ChartSeries } from './monthsToSeries.js';
import { renderChart, renderComparisonChart, renderFlowChart } from './renderChart.js';
import type { AxisMode } from './chartConfig.js';
import { flowSeries } from './flowSeries.js';
import type { FlowSeries } from './flowSeries.js';
import { renderTable, revealMonthInHash } from './renderTable.js';
import { anchorMonthTable } from './monthAnchors.js';
import { mountChat } from './chat/chatPanel.js';
import { MONEY_VIEW_BASIS, TODAYS_MONEY_NOTICE, TODAYS_MONEY_SUMMARY, moneyBasis } from './todaysDollars.js';
import type { MoneyView } from './todaysDollars.js';
import type { PlanFile } from '../core/parsePlan.js';
import type { Entry, Month } from '../core/plan.js';
import type { IsoDate } from '../data/assumptions/types.js';

/**
 * The month table names an entry by its words, not its id (2026-09-23). Looked up in the whole
 * pool, not just the active scenario's list, because a comparison can show a month governed by an
 * entry the active scenario does not hold. An id the plan has no entry for is still printed — as
 * itself, flagged — rather than dropped, since dropping it would claim fewer entries stood behind
 * the figure than did.
 */
const entryNamer = (plan: PlanFile): EntryNamer => {
  const byId = new Map(plan.entries.map((entry) => [entry.id, entrySummary(entry)] as const));
  return (id) => byId.get(id) ?? `An entry this plan no longer holds (${id})`;
};

/**
 * **THE CONTINGENCY FLOOR IS NO LONGER THIS PAGE'S TO CHOOSE — P4-14, 2026-09-21.**
 *
 * A `const DEMO_FLOOR = toCents(700_000)` used to sit here and be drawn against on every plan. It
 * was the only personal financial figure in this build invented by the code: fees, returns,
 * spending and the home loan all refuse to guess a typical value and say so on the form. So the
 * floor is `Settings.contingencyFloor` now, it is typed into the settings panel, and it is
 * OPTIONAL — a plan that states none gets no band, no breach and no figure, because the buffer a
 * household wants is not something a page can know.
 *
 * `statedContingencyFloor` is the one expression that turns the plan into the floor object, so the
 * band that is DRAWN and the breaches that are COUNTED cannot come from two different figures.
 */

const banner = document.getElementById('plan-status');
if (!(banner instanceof HTMLElement)) throw new Error('missing element: plan-status');

/**
 * **The boot, and the reason it is a function at all.** Every other module on this page is a
 * top-level module that runs on import; this one has to be able to STOP after the load, because
 * what it does next depends on whether there is a plan file — and `return` needs a function. The
 * body below is otherwise exactly the module it used to be.
 */
const boot = async (): Promise<void> => {
  /**
   * The whole of this page's state, off disk, or `null` when there is no file at all. The `catch`
   * shows the failure and rethrows: it does **not** fall back to a fixture, it does not write
   * anything, and — the point of the whole boot path — it does **not** treat a refusal as absence. A
   * page that quietly drew a demo couple's forecast when the user's own plan failed to load would be
   * the confidently wrong output this project exists to avoid; a page that put the first-run form up
   * instead would then WRITE over a plan it merely failed to read. The two states arrive by two
   * different routes — a `null` return and a throw — and this is the only place both are handled.
   */
  let loaded;
  try {
    loaded = await loadPlanOrNone({ readPlan, writePlan });
  } catch (error) {
    showPlanFailure(banner, error);
    throw error;
  }

  /**
   * **THE FIRST RUN, AND IT RETURNS BEFORE ANYTHING ELSE IS MOUNTED.** `null` means there is no plan
   * file — and only that (`loadPlan.ts`). Everything below this block reads a plan that exists:
   * `draw`, the three `mount*` calls and every `currentPlan()` a panel is handed are typed
   * `PlanFile`, non-nullable, and each of the three panels calls its own redraw synchronously as it
   * mounts. So the branch is taken HERE, before the first of them runs, rather than by making six
   * readers nullable.
   *
   * On a write that landed the page is RELOADED rather than transitioned in place. That is a
   * deliberate trade: the ordinary path above re-runs from the file that now exists, and there is no
   * second route into the mounted page that could drift from this one.
   */
  if (loaded === null) {
    const firstRunBox = document.getElementById('first-run');
    if (!(firstRunBox instanceof HTMLElement)) throw new Error('missing element: first-run');
    firstRunBox.hidden = false;
    // The rest of the page is still in the document and is hidden by CSS, not removed: the markup is
    // unconditional (`public/index.html`) and a page that deleted its own sections would have to put
    // them back. Nothing below has run, so every box it hides is empty anyway.
    document.body.classList.add('first-run');
    mountFirstRunPanel(firstRunBox, {
      save: async (candidate) => {
        try {
          await savePlan({ writePlan }, candidate);
        } catch (error) {
          if (error instanceof PlanWriteFailure) showPlanFailure(banner, error);
          else showEntryRefusal(banner, error);
          return;
        }
        location.reload();
      },
    });
    return;
  }

  /**
   * The plan as it is ON DISK, and the only copy of it this page has. Reassigned by `save` and by
   * nothing else: an edit that was refused, or a write that did not land, leaves this pointing at
   * the plan the file still holds, which is what keeps the screen and the disk in step.
   */
  let plan = loaded.plan;
  let chat: { readonly redraw: () => void } | undefined;
  // The Transactions panel, once its Ledger load has settled. Until then Start again asks nothing
  // about the Ledger, which leaves it untouched — the safe answer to a question not yet askable.
  let transactions: TransactionsPanel | undefined;

  const container = document.getElementById('months');
  if (!container) throw new Error('missing element: months');

  const canvas = document.getElementById('chart');
  if (!(canvas instanceof HTMLCanvasElement)) throw new Error('missing element: chart');

  // the income/spend chart design gate — the second chart's own canvas, below the wealth chart.
  const flowCanvas = document.getElementById('flow-chart');
  if (!(flowCanvas instanceof HTMLCanvasElement)) throw new Error('missing element: flow-chart');

  /**
   * **The whole of the page's redraw, from one plan (P6-6).** Before this there was exactly one
   * `project()` call, at load, and the page could not change anything. Now every successful save
   * comes back through here with the plan that is on disk, so the table, the chart, the note and the
   * caption are all rebuilt from the SAME walk — a screen that re-projected the chart and not the
   * table would show two different forecasts at once.
   *
   * The chart is destroyed and rebuilt rather than mutated, exactly as the Date/Age toggle does it
   * (`fe78181`), and for the same reason: re-running `renderChart` from scratch is the route that
   * cannot leave a live Chart.js instance half-updated. `renderChart` itself is what keeps the
   * frozen-config trap shut — it hands `new Chart` the `mutableChartInput()` clone and never
   * `chartConfig()`'s frozen original (`67f0ba3`).
   */
  let chart: ChartInstance | undefined;
  let series: ChartSeries;
  let comparison: ComparisonSeries;
  // design gate — the second chart's own instance and data, torn down and rebuilt the same way `chart` is.
  let flowChart: ChartInstance | undefined;
  let flow: FlowSeries;
  // The Compare chart's "Scenarios shown" picker — view state only, never written to the plan file
  // (`scenarioSelection.ts`). `tickedIds` starts empty and `scenarioIds` empty, so the first draw
  // ticks every Scenario as new; `shown` is the series built from the ticked ones, or `undefined`.
  let tickedIds: ReadonlySet<string> = new Set();
  let scenarioIds: readonly string[] = [];
  let shown: ComparisonSeries | undefined;
  let walks: ScenarioWalks;
  let months: readonly Month[];
  // The ACTIVE Scenario's own entries, resolved once per redraw beside its walk — `mortgageHeadline`
  // needs them to say when each Person retires, and it must be the same list the walk was run from
  // or the sentence would be about a different plan from the chart above it.
  let activeEntries: readonly Entry[];
  // P16-2 — the last "Work out what I could spend" search THIS redraw has run, or `undefined` before
  // it has been pressed. Cleared on every `draw()`, `resetSustainable`'s own rule: a figure worked
  // out from a plan that has since changed is a figure about a plan nobody is looking at.
  let sustainableResult: SustainableSpend | undefined;

  /**
   * ⚠️ **`walked` IS THE ACTIVE SCENARIO'S WALK, NEVER THE POOL'S (P7-1).** Until this slice this
   * function was handed `project(settings, household, plan.entries)` — the pool, which is the UNION
   * of every Scenario's entries. With one Baseline holding everything that was the same walk by
   * coincidence; with two Scenarios it is the wrong one, and the page would have drawn both plans'
   * decisions at once and called it the active Scenario's forecast. `scenarioWalks` resolves it
   * (`scenarioWalks.ts`), and `walked.active` is what the table, the note and the focused chart all
   * read. Every Scenario is walked ONCE here and the walks are reused by the comparison chart and by
   * the Scenario list's Shortfall Ages — no part of this page projects anything a second time.
   */
  const draw = (plan: PlanFile, walked: ScenarioWalks): void => {
    walks = walked;
    months = walked.active;
    // The plan's OWN Age Pension series is handed over, not omitted: it is what decides whether the
    // Pension-Only Age can be asked of this walk at all. A plan that states none — which is every plan
    // seeded from the demo fixture, including one already on disk before this marker existed — gets the
    // chart's note instead of the rule, and never an error page.
    activeEntries = scenarioEntries(plan, scenarioById(plan, plan.activeScenarioId));
    series = monthsToSeries(
      months,
      plan.household,
      statedContingencyFloor(plan.settings),
      plan.settings.economicSeries.agePension,
    );
    comparison = comparisonSeries(plan, walked);
    tickedIds = reconcileTicked(tickedIds, scenarioIds, plan);
    scenarioIds = plan.scenarios.map((scenario) => scenario.id);
    shown = tickedComparison(plan, walked, tickedIds);
    // design gate — the ACTIVE Scenario's own flow series, on `money-view`'s own basis (`paintFlowChart`
    // below never re-derives it, exactly as `paintChart` never re-derives `series`).
    flow = flowSeries(months, plan.household, moneyBasis(moneyView, plan.settings));
    paintPicker(plan);
    paintChart();
    paintFlowChart();
    paintTable(plan);
    drawNote();
    drawLifeStages(plan);
    drawIncome(plan);
    sustainablePlan = plan;
    sustainableResult = undefined;
    resetSustainable();
    drawHeadline(plan);
    drawPhaseSentences(plan);
    drawCaption(plan);
    drawPanelSummaries(plan);
  };

  /**
   * **What the two collapsed panels say about themselves.** Both editors are `<details>` and both
   * start closed (`public/index.html` says why), so each summary has to carry the size of what it
   * is hiding — a disclosure that says only "Scenarios" gives a user no reason to open it and no
   * idea what is in there. Rewritten on every redraw off the plan that is on disk, so the counts
   * cannot lag the file; the caption below the chart states the same two figures and both are read
   * off the same `shown`, which is why they cannot disagree.
   */
  const entrySummary = document.getElementById('entry-summary');
  const scenarioSummary = document.getElementById('scenario-summary');
  const situationSummary = document.getElementById('financial-situation-summary');
  const settingsSummary = document.getElementById('settings-summary');
  const drawPanelSummaries = (shown: PlanFile): void => {
    // The active scenario's name, for the two headings whose panels show that scenario alone
    // (user rulings, 2026-09-25): Change the plan and Financial Situation.
    const activeName = shown.scenarios.find((scenario) => scenario.id === shown.activeScenarioId)?.name ?? shown.activeScenarioId;
    if (entrySummary) {
      // ⚠️ **The active Scenario's own entries, not the pool's (2026-09-22)** — the panel this
      // summarises lists exactly those, and a heading counting the pool would put a bigger number
      // over a shorter table. `activeEntries` is the same resolved list the table and the chart
      // were built from, so `switched on` here is this Scenario's answer, not the entry's flag.
      entrySummary.textContent =
        `Change the plan - ${activeName} — ${activeEntries.length} entries, ${activeEntries.filter((entry) => entry.enabled).length} switched on`;
    }
    if (scenarioSummary) scenarioSummary.textContent = `Scenarios (${shown.scenarios.length}) - CURRENT = ${activeName}`;
    // Every answer in Financial Situation is the ACTIVE scenario's, so its title says which one
    // (user ruling, 2026-09-25) — on the Life stages title's own pattern.
    if (situationSummary) situationSummary.textContent = `Financial Situation - ${activeName}`;
    // The third summary carries the one fact that decides whether this panel needs opening: the
    // date every balance in the file is stated as at. A household whose figures were typed in
    // January and whose date still reads January is fine; the mismatch is what the panel is for.
    if (settingsSummary) {
      settingsSummary.textContent =
        `Household and settings — ${shown.household.persons.length} ${shown.household.persons.length === 1 ? 'person' : 'people'},` +
        ` stated as at ${shown.settings.asAtDate}`;
    }
  };

  /**
   * **The one place a Chart.js instance is made, and the teardown is immediately before the rebuild
   * in both branches.** Comparison mode is only entered when there is more than one Scenario to
   * compare: a "comparison" of one plan against itself is a chart that has dropped the means-test
   * split and put nothing in its place.
   *
   * Nothing here projects or recomputes a series — both are already built, so the view toggle and
   * the axis toggle are relabelling and redrawing only (a projection is ~14ms per Scenario, which is
   * not a cost to pay for a switch that moves no data point).
   */
  const chartBox = document.getElementById('chart-box');
  const chartEmpty = document.getElementById('chart-empty');
  const picker = document.getElementById('chart-scenario-picker');
  const pickerSummary = document.getElementById('chart-scenario-summary');
  const pickerBoxes = document.getElementById('chart-scenario-boxes');
  const measureToggle = document.getElementById('compare-measure-toggle');

  const paintChart = (): void => {
    const comparing = chartView === 'compare' && comparison.lines.length > 1;
    if (picker) picker.hidden = !comparing;
    if (measureToggle) measureToggle.hidden = !comparing;
    const empty = comparing && shown === undefined;
    if (chartBox) chartBox.hidden = empty;
    if (chartEmpty) {
      chartEmpty.hidden = !empty;
      chartEmpty.textContent = empty ? NO_SCENARIOS_TICKED : '';
    }
    if (empty) {
      chart?.destroy();
      chart = undefined;
      return;
    }
    if (comparing && shown !== undefined) {
      chart?.destroy();
      chart = renderComparisonChart(canvas, shown, moneyBasis(moneyView, plan.settings), axisMode, compareMeasure);
      return;
    }
    chart?.destroy();
    chart = renderChart(canvas, series, moneyBasis(moneyView, plan.settings), axisMode);
  };

  /**
   * **design gate — the second chart, always the ACTIVE Scenario's own walk.** Unlike `paintChart` above,
   * this has no Compare view: grouping several Scenarios' cash lines onto one set of financial-year
   * bars is a chart of its own and not this gate's brief (see `public/index.html`'s comment on the
   * canvas). `flow` is built once in `draw`/the money toggle, already in the page's money basis
   * (`flowSeries.ts`'s own header says why the conversion happens there); this only destroys and
   * rebuilds the Chart.js instance, on `paintChart`'s own precedent.
   */
  const paintFlowChart = (): void => {
    flowChart?.destroy();
    flowChart = renderFlowChart(flowCanvas, flow);
  };

  /** One checkbox per Scenario, rebuilt on every redraw so a rename or a delete is reflected at once. */
  const paintPicker = (shownPlan: PlanFile): void => {
    if (pickerSummary) pickerSummary.textContent = tickedSummary(shownPlan, tickedIds);
    if (!pickerBoxes) return;
    pickerBoxes.replaceChildren(
      ...shownPlan.scenarios.map((scenario) => {
        const input = document.createElement('input');
        input.type = 'checkbox';
        input.value = scenario.id;
        input.checked = tickedIds.has(scenario.id);
        const label = document.createElement('label');
        label.append(input, ` ${scenario.name}`);
        return label;
      }),
    );
  };

  // Ticking a box re-slices the walks `draw` already has — nothing is projected.
  pickerBoxes?.addEventListener('change', (event) => {
    const input = event.target;
    if (!(input instanceof HTMLInputElement)) return;
    const next = new Set(tickedIds);
    if (input.checked) next.add(input.value);
    else next.delete(input.value);
    tickedIds = next;
    shown = tickedComparison(plan, walks, tickedIds);
    if (pickerSummary) pickerSummary.textContent = tickedSummary(plan, tickedIds);
    paintChart();
    drawNote();
  });

  /**
   * **The month table's one switch — the Household's position, or the Persons' (P7-6 UI).** Nothing
   * is re-projected and no figure is recomputed: `months` is the same walk in both modes, and the
   * Household scalars every row carries are the same three either way. What changes is whether the
   * Position section of an expanded row shows those three, or the per-Person breakdown beside the
   * Offset Account that belongs to neither Person.
   *
   * The labels are taken from `plan.household.persons` BY POSITION and handed to the pure layer,
   * because a `PersonAssetFigures` carries no name on purpose (`plan.ts`) — this is the only place
   * a name is attached to a figure, and it attaches it by index.
   *
   * Rebuilding the whole table closes any row the reader had expanded. That is the same trade the
   * chart toggles make (destroy and rebuild beats mutating half a live view), and the alternative —
   * patching every open Position section in place — would be a second way to write the same section.
   */
  const paintTable = (shown: PlanFile): void => {
    renderTable(
      container,
      financialYearRows(
        months,
        moneyBasis(moneyView, shown.settings),
        shown.household,
        assetsView === 'person'
          ? { mode: 'person', labels: personLabels(shown.household.persons) }
          : HOUSEHOLD_ASSETS,
        entryNamer(shown),
      ),
    );
    // The chat's chips link to `#month-YYYY-MM` and `#month-YYYY-MM-line-N` (plan_ai.md §6).
    anchorMonthTable(container, months);
  };

  // The INITIAL mode is read off the markup's own `checked`, for the reason the axis toggle's is.
  const checkedAssetsInput = document.querySelector<HTMLInputElement>('input[name="assets-view"]:checked');
  let assetsView: 'household' | 'person' = checkedAssetsInput?.value === 'person' ? 'person' : 'household';
  document.querySelectorAll('input[name="assets-view"]').forEach((input) => {
    if (!(input instanceof HTMLInputElement)) return;
    input.addEventListener('change', () => {
      if (!input.checked) return;
      assetsView = input.value === 'person' ? 'person' : 'household';
      paintTable(plan);
    });
  });

  /**
   * The one label-set switch — Date (default) or Age. `series` is built exactly once above: neither
   * branch of this toggle calls `monthsToSeries` again, because the 501 data points do not move when
   * the axis view changes (see `monthsToSeries.ts`'s `ageAxis` and `chartConfig.ts`'s `AxisMode`).
   * Switching destroys the live Chart.js instance and calls `renderChart` again on the same canvas —
   * simpler and safer than mutating a live chart's labels in place, and cheap: nothing here recomputes
   * anything, it only rebuilds the same plain config with a different label array.
   *
   * The INITIAL mode is read off the radio group's own `checked` input rather than written as the
   * literal `'date'` a second time — `public/index.html` already carries that default on the markup,
   * and a page that named it twice could have the two drift apart silently. Falls back to `'date'`
   * only when no radio is checked at all, which HTML does not forbid.
   */
  const checkedAxisInput = document.querySelector<HTMLInputElement>('input[name="chart-axis"]:checked');
  let axisMode: AxisMode = checkedAxisInput?.value === 'age' ? 'age' : 'date';
  document.querySelectorAll('input[name="chart-axis"]').forEach((input) => {
    if (!(input instanceof HTMLInputElement)) return;
    input.addEventListener('change', () => {
      if (!input.checked) return;
      axisMode = input.value === 'age' ? 'age' : 'date';
      paintChart();
    });
  });

  /**
   * **The VIEW switch — the means-test split, or the scenario comparison.** Two visuals for two
   * questions (user ruling, 2026-09-19): focused answers *"what can Centrelink see?"* and comparison
   * answers *"which plan is better?"*. Nothing is re-projected when it flips: `draw` built both
   * series from the same walks, so this is the same numbers drawn two ways.
   */
  /**
   * **THE MONEY TOGGLE — ONE SWITCH FOR THE WHOLE PAGE (P2-7).** Not one for the table and another
   * for the chart: a table in today's money beside a chart in future dollars is the confusion
   * ADR-0001 names in terms, so this flips a single closure variable and repaints BOTH from data
   * that is already computed. Nothing here projects: `months`, `series` and `comparison` are the
   * same objects either way, and the conversion is arithmetic on the way to the screen.
   *
   * The INITIAL view is read off the markup's own `checked` for the reason the axis toggle's is —
   * `public/index.html` carries `checked` on the today's-money radio and `todaysDollars.ts` holds
   * `DEFAULT_MONEY_VIEW`; naming the default a third time here is how two of them drift apart.
   * The fallback when no radio is checked is today's money, which is that default.
   */
  const checkedMoneyInput = document.querySelector<HTMLInputElement>('input[name="money-view"]:checked');
  let moneyView: MoneyView = checkedMoneyInput?.value === 'futureDollars' ? 'futureDollars' : 'todaysDollars';
  document.querySelectorAll('input[name="money-view"]').forEach((input) => {
    if (!(input instanceof HTMLInputElement)) return;
    input.addEventListener('change', () => {
      if (!input.checked) return;
      moneyView = input.value === 'futureDollars' ? 'futureDollars' : 'todaysDollars';
      paintChart();
      // design gate — `flow` carries the money basis baked in (`flowSeries.ts`'s header), so it is rebuilt
      // here rather than merely repainted, unlike `series`/`comparison` which are basis-independent.
      flow = flowSeries(months, plan.household, moneyBasis(moneyView, plan.settings));
      paintFlowChart();
      paintTable(plan);
      drawNote();
      drawCaption(plan);
      // The headline carries a dollar figure — what is still owed when somebody retires — so it is
      // repainted with the rest of the page and not left stating an amount in the money the reader
      // just switched away from.
      drawIncome(plan);
      drawHeadline(plan);
      // P16-2 — every phase sentence carries a dollar figure, on `drawIncome`'s own reason above.
      drawPhaseSentences(plan);
      // The chat's chips convert at display time, like the table (plan_ai.md §2 rule 7).
      chat?.redraw();
    });
  });

  /**
   * **Which figure the Compare chart draws per Scenario** — total wealth (the default, checked in
   * the markup) or what Centrelink counts, with the assets-test thresholds. View state only; nothing
   * is re-projected, `comparison` already carries both arrays per line.
   */
  const checkedMeasureInput = document.querySelector<HTMLInputElement>('input[name="compare-measure"]:checked');
  let compareMeasure: ComparisonView = checkedMeasureInput?.value === 'centrelink' ? 'centrelink' : 'totalWealth';
  document.querySelectorAll('input[name="compare-measure"]').forEach((input) => {
    if (!(input instanceof HTMLInputElement)) return;
    input.addEventListener('change', () => {
      if (!input.checked) return;
      compareMeasure = input.value === 'centrelink' ? 'centrelink' : 'totalWealth';
      paintChart();
    });
  });

  const checkedViewInput = document.querySelector<HTMLInputElement>('input[name="chart-view"]:checked');
  let chartView: 'focused' | 'compare' = checkedViewInput?.value === 'compare' ? 'compare' : 'focused';
  document.querySelectorAll('input[name="chart-view"]').forEach((input) => {
    if (!(input instanceof HTMLInputElement)) return;
    input.addEventListener('change', () => {
      if (!input.checked) return;
      chartView = input.value === 'compare' ? 'compare' : 'focused';
      paintChart();
      drawNote();
    });
  });

  /**
   * **P6-8 microtask 3 — the guided template LANDS the reader on this same toggle, rather than a
   * chart of its own.** Sets the radio to match, so a reader who then touches the toggle sees its
   * own state agree with what is drawn — the same reason every other view change here keeps the
   * control and the chart in step. Nothing is re-projected: `paintChart` reads the walks `draw`
   * already produced.
   */
  const switchToComparison = (): void => {
    chartView = 'compare';
    document.querySelectorAll('input[name="chart-view"]').forEach((el) => {
      if (el instanceof HTMLInputElement) el.checked = el.value === 'compare';
    });
    paintChart();
    drawNote();
  };

  const chartNote = document.getElementById('chart-note');

  /**
   * **One sentence on the page; the rest folded away (P8-9).** This paragraph was 70-plus words
   * standing open under the chart in every state, most of them explaining a few weeks of phase skew
   * that a reader has to be told about ONCE, not on every visit. The sentence that stays is the one
   * that changes how the picture is read — the dashed line is not a slice of the stack — and the
   * mechanics open behind the button.
   *
   * `series.notes` stays VISIBLE and is not folded in with them: each note says which marker this
   * chart cannot draw and why, and a reason hidden behind a disclosure is a blank space to everyone
   * who does not click it — which is the reading those notes exist to prevent.
   */
  const CHART_NOTE_DETAIL =
    'The dashed line crosses both shaded areas and is never a slice of either, so it is never added' +
    ' to them. The areas are read on the month’s first day and the reachable line at its close, so' +
    ' the two are a few weeks apart — they are drawn that way rather than lined up, because moving' +
    ' either would print a figure for a day it was never read on. The dashed upright lines mark the' +
    ' ages this forecast is able to work out.';

  const drawNote = (): void => {
    if (!chartNote) return;
    const compare =
      comparison.lines.length < 2
        ? ' This plan holds one scenario, so there is nothing to compare yet — copy it to start.'
        : ` The comparison view draws ${shown?.lines.length ?? 0} of ${comparison.lines.length} scenarios as one line each — total wealth, or what Centrelink counts against the assets-test thresholds — with no means-test stack and no captions; each scenario’s Shortfall Age is in the list above.`;
    // In Compare the headline and `series.notes` describe the ACTIVE scenario's stack and markers,
    // neither of which that chart draws — its own notes are in its subtitle. Only the basis stays.
    const comparing = chartView === 'compare' && comparison.lines.length > 1;
    // Only the two ⓘ boxes live under the chart (user, 2026-09-29: the paragraph repeated the
    // chart). The basis (ADR-0001), the cross-cut note and `series.notes` are all on the face of
    // the chart in its subtitle, and the basis is in the caption at the top of the page too.
    chartNote.replaceChildren();
    chartNote.append(infoButton(TODAYS_MONEY_SUMMARY, TODAYS_MONEY_NOTICE, 'guide:todays-money-switch'));
    const compareOnly = compare.slice(1);
    chartNote.append(infoButton('More about this chart', comparing ? compareOnly : CHART_NOTE_DETAIL + compare, comparing ? 'guide:comparing-scenarios' : 'guide:wealth-charts'));
  };

  /**
   * **THE HOME LOAN ANSWER, at the top of the page (P3-16 slice 3, extended P3-16a).** The user
   * entered a loan, watched the balance fall month by month and asked where the screen says whether
   * it is clear before they retire. `mortgageHeadline.ts` decides every word of it; this puts the
   * words in the page, and takes no decision of its own.
   *
   * **A plan with no home loan AND no `MORTGAGE_TARGET` entry gets an EMPTY, HIDDEN element** —
   * `mortgageHeadline` answers `undefined`, `mortgageTargetHeadlines` answers an empty list, and the
   * block is cleared and hidden, so the page is what it was before P3-16 existed. `hidden` as well
   * as empty, because an empty element still occupies the margins the stylesheet gives it. A plan
   * that states a target but no loan still gets the box: the target compares a date the user chose
   * against retirement and needs no loan to exist (`mortgageHeadline.ts`'s own doc on the module).
   */
  /**
   * **THE QUESTION THE TOOL IS FOR, at the top of the page (P4-5d).** *"When does super and pension
   * stop covering the desired income?"* — the user's own words. `incomeHeadline.ts` decides every
   * word of it; this puts the words in the page and takes no decision of its own.
   *
   * **It is never hidden and never empty**, unlike the home loan block beneath it: a Household with
   * no mortgage has no mortgage answer, but every Household has an answer to this one — including
   * *"your own money lasts the whole way"* and *"this forecast cannot work it out"*, which are
   * different answers and are said differently.
   *
   * The plan's OWN Age Pension series is handed over rather than omitted, exactly as
   * `monthsToSeries` is handed it: it is what decides whether the question is answerable at all, and
   * a plan it cannot be asked of gets a sentence rather than an error page.
   */
  /**
   * **P16-1 — the "Life stages" strip, below the Scenarios panel.** `lifeStages.ts` derives every
   * segment and boundary from the walk plus the active Scenario's own entries; nothing new is stored
   * in the plan file. It follows the active Scenario and is repainted every `draw()`, on every other
   * headline's own precedent — a strip drawn from a plan that has since changed is exactly the
   * failure this repo is organised against.
   */
  const lifeStagesBox = document.getElementById('phase-timeline-body');
  const lifeStagesTitle = document.getElementById('phase-timeline-title');
  const drawLifeStages = (shown: PlanFile): void => {
    // The title names the scenario the strip is drawn from (user ruling, 2026-09-25): the strip
    // follows the active scenario, and switching scenarios must visibly re-label it.
    if (lifeStagesTitle) {
      const active = shown.scenarios.find((scenario) => scenario.id === shown.activeScenarioId);
      lifeStagesTitle.textContent = `Life stages - ${active?.name ?? shown.activeScenarioId}`;
    }
    if (!lifeStagesBox) return;
    renderLifeStages(lifeStagesBox, lifeStagesTimeline(months, shown.household, activeEntries));
  };

  const incomeBox = document.getElementById('income-headline');
  const drawIncome = (shown: PlanFile): void => {
    if (!incomeBox) return;
    const answer = incomeHeadline(
      months,
      shown.household,
      shown.settings.economicSeries.agePension,
      moneyBasis(moneyView, shown.settings),
    );
    // Where the answer folds a sentence away (P17-6), the lead itself is the ⓘ's visible line.
    const lead = answer.headlineDetail === undefined ? document.createElement('p') : infoButton(answer.headline, answer.headlineDetail, 'guide:shortfall');
    lead.classList.add('income-lead');
    if (answer.headlineDetail === undefined) lead.textContent = answer.headline;
    incomeBox.replaceChildren(lead);
    // Each Person's age is one short sentence; they share a line rather than one line each.
    for (const sentence of [...(answer.perPerson.length ? [answer.perPerson.join(' ')] : []), ...answer.detail]) {
      const line = document.createElement('p');
      line.textContent = sentence;
      incomeBox.append(line);
    }
  };

  /**
   * **"HOW MUCH CAN WE ACTUALLY SPEND?" — BEHIND A BUTTON, AND ONLY BEHIND A BUTTON (P10-3).**
   * `core/sustainableSpend.ts` walks the whole forecast about eighteen times to answer this (~0.7s
   * measured), which is far too much to spend on a redraw nobody asked for. So this block renders a
   * button, and the answer replaces it when the user presses it.
   *
   * ⚠️ **The answer is CLEARED on every redraw** — `resetSustainable` is called from `draw`. A
   * spending figure worked out from a plan that has since been edited is a confident answer about a
   * plan that is no longer on screen, which is the failure this whole repo is organised against.
   *
   * **The search is synchronous and the button is repainted first.** Pressing it sets the text to
   * "Working it out…", disables the button, and defers the search to a `setTimeout` — without the
   * yield the browser paints nothing until the search has finished and the page simply freezes for
   * a second with no explanation.
   *
   * Every word of the answer, including both refusals, is `sustainableSpendHeadline`'s. This takes
   * no decision of its own.
   */
  const sustainableBox = document.getElementById('sustainable-spend');
  let sustainablePlan: PlanFile | undefined;
  const resetSustainable = (): void => {
    if (!sustainableBox) return;
    const button = document.createElement('button');
    button.type = 'button';
    button.id = 'sustainable-run';
    button.textContent = 'Work out what I could spend';
    const prompt = document.createElement('p');
    prompt.className = 'sustainable-prompt';
    // How it is worked out is the guide's (`{#sustainable-spend}`); the wait is what the reader needs here.
    prompt.textContent = 'Takes a second or two.';
    sustainableBox.replaceChildren(button, prompt);
    button.addEventListener('click', () => {
      button.disabled = true;
      prompt.textContent = 'Working it out…';
      setTimeout(() => {
        const shown = sustainablePlan;
        if (!shown) return;
        const result = sustainableSpend(shown.settings, shown.household, activeEntries);
        const answer = sustainableSpendHeadline(
          result,
          months,
          shown.household,
          activeEntries,
          moneyBasis(moneyView, shown.settings),
        );
        const lead = document.createElement('p');
        lead.className = 'sustainable-lead';
        lead.textContent = answer.headline;
        sustainableBox.replaceChildren(lead);
        for (const sentence of [...(answer.perPerson.length ? [answer.perPerson.join(' ')] : []), ...answer.detail]) {
          const line = document.createElement('p');
          line.textContent = sentence;
          sustainableBox.append(line);
        }
        const again = document.createElement('button');
        again.type = 'button';
        again.textContent = 'Work it out again';
        again.addEventListener('click', () => {
          sustainableResult = undefined;
          drawPhaseSentences(shown);
          resetSustainable();
        });
        sustainableBox.append(again);
        // P16-2 — the Retirement phase sentence reads THIS result, the moment it exists, rather than
        // waiting for the next full `draw()` — a search the reader just ran should not need a second
        // trigger to appear where the phase sentences say so.
        sustainableResult = result;
        drawPhaseSentences(shown);
      }, 0);
    });
  };

  const mortgageBox = document.getElementById('mortgage-headline');
  const drawHeadline = (shown: PlanFile): void => {
    if (!mortgageBox) return;
    const answer = mortgageHeadline(months, shown.household, activeEntries, moneyBasis(moneyView, shown.settings));
    const targets = mortgageTargetHeadlines(months, shown.household, activeEntries, moneyBasis(moneyView, shown.settings));
    if (answer === undefined && targets.length === 0) {
      mortgageBox.replaceChildren();
      mortgageBox.hidden = true;
      return;
    }
    mortgageBox.hidden = false;
    const children: HTMLElement[] = [];
    if (answer !== undefined) {
      const lead = document.createElement('p');
      lead.className = 'mortgage-lead';
      lead.textContent = answer.headline;
      children.push(lead);
      for (const sentence of [...answer.perPerson, ...(answer.tail === undefined ? [] : [answer.tail])]) {
        const line = document.createElement('p');
        line.textContent = sentence;
        children.push(line);
      }
    }
    // P3-16a — one block per MORTGAGE_TARGET entry, beneath the payoff answer above. Never a
    // verdict on the loan (mortgageHeadline.ts's own doc on the difference), so it carries no
    // "lead" styling of its own.
    for (const target of targets) {
      const lead = document.createElement('p');
      lead.className = 'mortgage-target-lead';
      lead.textContent = target.headline;
      children.push(lead);
      for (const line of target.perPerson) {
        const p = document.createElement('p');
        p.textContent = line.sentence;
        children.push(p);
      }
      if (target.stillOwing !== null) {
        const warning = document.createElement('p');
        warning.className = 'mortgage-target-owing';
        warning.textContent = target.stillOwing;
        children.push(warning);
      }
    }
    mortgageBox.replaceChildren(...children);
  };

  /**
   * **P16-2 — one headline sentence per phase, above the existing Financial Situation answers.**
   * `financialSituationPhases.ts` decides every word, including which of the three sentences appear
   * at all; this only paints them, on `drawIncome`'s own idiom (a `<p class="…-lead">` first, then
   * one paragraph per further sentence).
   *
   * **PLACEMENT — the mock-up's own three colours reused, but not its three boxes.** The mock-up
   * (TODO.md P16, `phase-mock.html`) painted these three sentences INTO `income-headline` /
   * `mortgage-headline` / `sustainable-spend`, because those three already carried the right border
   * colours and it needed no new markup to show the idea. That was a shortcut for a static mock and
   * not an instruction to delete the answers those three boxes actually hold — TODO.md says so in as
   * many words ("Keep the existing Financial Situation headline"). So this is its OWN box,
   * `#phase-sentences`, placed first inside Financial Situation — the phase framing is now the
   * reader's first read of their own plan, and the existing income/home-loan/sustainable-spend
   * answers follow beneath it exactly as they did before P16.
   */
  const phaseSentencesBox = document.getElementById('phase-sentences');
  const drawPhaseSentences = (shown: PlanFile): void => {
    if (!phaseSentencesBox) return;
    const sentences = financialSituationPhases(months, shown.household, activeEntries, moneyBasis(moneyView, shown.settings), sustainableResult);
    phaseSentencesBox.replaceChildren(
      ...sentences.flatMap((sentence) => {
        const label = document.createElement('p');
        label.className = `phase-label ${sentence.phase === 'working' ? 'working' : sentence.phase === 'retired' ? 'retired' : 'aged-care'}`;
        label.textContent = sentence.label;
        const lead = document.createElement('p');
        lead.className = 'phase-sentence-lead';
        lead.textContent = sentence.headline;
        const nodes = [label, lead];
        if (sentence.detail !== undefined) {
          const detail = document.createElement('p');
          detail.className = 'phase-sentence-detail';
          detail.textContent = sentence.detail;
          nodes.push(detail);
        }
        return nodes;
      }),
    );
  };

  const caption = document.getElementById('caption');
  const drawCaption = (shown: PlanFile): void => {
    if (!caption) return;
    const active = shown.scenarios.find((scenario) => scenario.id === shown.activeScenarioId);
    // P17-6 (2026-09-28): this scenario's own counts only; the pool total, and why the two differ, is
    // the guide's (`{#screen-scenarios}`).
    caption.textContent =
      `“${active?.name ?? shown.activeScenarioId}” · ${months[0]?.month} to ${months[months.length - 1]?.month}` +
      ` · as at ${shown.settings.asAtDate}` +
      ` · ${activeEntries.length} changes, ${activeEntries.filter((entry) => entry.enabled).length} on` +
      // The table has no subtitle of its own, so the caption is where the basis is stated for its rows.
      ` · ${MONEY_VIEW_BASIS[moneyView]}`;
  };

  const formBox = document.getElementById('entry-form');
  const listBox = document.getElementById('entry-list');

  /**
   * **The one write this page can make (P6-6), and the three states it can end in.**
   *
   *   * refused before anything was sent — `savePlan` throws `parsePlan`'s (or the engine's) named
   *     refusal, the transport was never called, and the banner says so: the file and the screen
   *     still agree, so **nothing below is redrawn**;
   *   * the write did not land — `PlanWriteFailure`, and the banner says the dangerous thing out
   *     loud, that what is on screen is no longer what is on disk. Again nothing is redrawn, because
   *     the figures on screen are still the stored plan's own;
   *   * it landed — the banner is cleared, `plan` becomes what was stored, and the table, chart,
   *     note, caption and entry list are all rebuilt from the walk `savePlan` handed back.
   *
   * A save is never partially applied: `plan` is reassigned only after the write resolved.
   */
  const save = async (candidate: unknown): Promise<void> => {
    let stored;
    try {
      stored = await savePlan({ writePlan }, candidate);
    } catch (error) {
      if (error instanceof PlanWriteFailure) showPlanFailure(banner, error);
      else showEntryRefusal(banner, error);
      return;
    }
    clearPlanStatus(banner);
    plan = stored.plan;
    draw(plan, stored.walks);
    redrawEntries();
    redrawScenarios();
    redrawSettings();
    redrawComparisonTemplate();
  };

  const redrawEntries: () => void =
    formBox && listBox
      ? mountEntryEditor(formBox, listBox, { currentPlan: () => plan, save })
      : (): void => {};

  const settingsBox = document.getElementById('settings-form');

  /**
   * **The Household and the Settings (P8-5).** The third writer on this page, and the only one that
   * edits the BASE POSITION every Scenario shares (ADR-0002) — which is why the panel says so after
   * every write rather than leaving a user to notice that all of their forecasts moved. It goes
   * through the same `save` door as the other two: `parsePlan` then `project()` before any byte is
   * written, and the same banner when either refuses.
   *
   * **The panel is handed no seed, and neither is a first run.** Its "start again" control asks the
   * user for a name and a date of birth and builds its own candidate from those two answers
   * (`planEdits.walkthroughPlan`), so nothing on this page hands it an example plan to write — and
   * since 2026-09-20 the same is true of a first run, which asks those same two questions through
   * `firstRunPanel.ts` instead of being seeded from a fixture.
   */
  const redrawSettings: () => void = settingsBox
    ? mountSettingsPanel(settingsBox, { currentPlan: () => plan, save, startAgainAlso: () => transactions?.startAgainQuestion() })
    : (): void => {};

  const scenarioCreateBox = document.getElementById('scenario-create');
  const scenarioListBox = document.getElementById('scenario-list');

  // **The first draw, and the only projection this page makes at load.** It is BEFORE the Scenario
  // panel is mounted, on purpose: the panel reads each Scenario's Shortfall Age off the walks this
  // call produced, so mounting it first would ask for a figure that does not exist yet.
  draw(plan, scenarioWalks(plan));

  // Every financial year starts collapsed (P7-UX-1), so an address naming a month — a chat chip's,
  // or a link — opens that month's year before the browser is asked to scroll to it.
  const revealAddressedMonth = (): void => {
    if (!revealMonthInHash(location.hash)) return;
    const target = document.getElementById(decodeURIComponent(location.hash.slice(1)));
    // The table sits in a collapsed panel (2026-09-28): open it before scrolling to the month.
    const panel = target?.closest('details');
    if (panel) panel.open = true;
    target?.scrollIntoView();
  };
  revealAddressedMonth();
  window.addEventListener('hashchange', revealAddressedMonth);

  /**
   * The Scenario list. Its Shortfall Ages are read off the walks `draw` already has — the panel
   * projects nothing, and a Scenario that somehow has no walk gets a sentence saying so rather than
   * a figure.
   */
  const redrawScenarios: () => void =
    scenarioCreateBox && scenarioListBox
      ? mountScenarioPanel(scenarioCreateBox, scenarioListBox, {
          currentPlan: () => plan,
          shortfallOf: (scenarioId) => comparison.lines.find((line) => line.scenarioId === scenarioId)?.shortfall,
          agePensionOf: (scenarioId) => comparison.lines.find((line) => line.scenarioId === scenarioId)?.agePension,
          heasOf: (scenarioId) => comparison.lines.find((line) => line.scenarioId === scenarioId)?.heas,
          save,
          // A delete the pure layer refuses — a Scenario with children, or the last one left — never
          // reaches `save`, so it gets the same banner a refused edit does rather than a second one.
          refuse: (error) => showEntryRefusal(banner, error),
        })
      : (): void => {};

  const comparisonTemplateBox = document.getElementById('comparison-template-form');

  /**
   * **P6-8 microtask 3.** Same host shape as the other two writers — `currentPlan` and `save` — plus
   * `showComparison`, so the generator can land the reader on the chart it just populated without
   * this file handing the panel a live Chart.js instance to poke.
   */
  const redrawComparisonTemplate: () => void =
    comparisonTemplateBox
      ? mountComparisonTemplateForm(comparisonTemplateBox, { currentPlan: () => plan, save, showComparison: switchToComparison })
      : (): void => {};

  /**
   * **The chat (plan_ai.md §9 stage 5).** Its settings box sits in the settings area; its panel is
   * not in the page at all while the chat is off, which it is by default. Its review queue's Accept
   * is handed THIS page's `save`, so a suggestion is written through `savePlan` with the same checks
   * as the form, or not at all (ADR-0004); the write landed exactly when `save` moved `plan` on. No
   * provider is passed: the chat calls the one its settings name, straight from this browser.
   */
  const chatSettingsBox = document.getElementById('chat-settings');
  const chatHost = document.getElementById('chat-host');
  chat =
    chatSettingsBox && chatHost
      ? mountChat(chatSettingsBox, chatHost, {
          storage: localStorage,
          currentPlan: () => plan,
          moneyView: () => moneyView,
          save: async (candidate) => {
            const before = plan;
            await save(candidate);
            return plan !== before;
          },
          pageOrigin: location.origin,
          now: () => new Date(),
          newId: () => crypto.randomUUID(),
        })
      : undefined;

  /**
   * **The Ledger (P11-1 slice 2), mounted LAST and loaded on its own.** `ledger.json` is a separate
   * file from the plan with its own door (`ledgerStore.ts`); nothing above reads it, and nothing in
   * the projection ever does. A load refusal is shown inside the panel and the panel is switched
   * off — it is caught there, not here, so an unreadable Ledger never stops the page, and it is
   * never written: not by an add, and not by Start again (whose question is then not asked).
   */
  const transactionsBox = document.getElementById('transactions');
  if (transactionsBox) {
    transactions = await mountTransactionsPanel(transactionsBox, document.getElementById('transactions-summary'), {
      transport: { readLedger, writeLedger },
      // The browser's LOCAL date, `entryForm.ts`'s construction: `toISOString` is UTC, a day behind here before 10am.
      today: () => {
        const now = new Date();
        return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}` as IsoDate;
      },
      newId: () => crypto.randomUUID(),
      // P11 slice 5: the Derived Baseline's Accept goes through THIS page's one save, like every other writer.
      currentPlan: () => plan,
      save,
    });
  }
};

await boot();
