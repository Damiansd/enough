// Which Scenarios the Compare chart draws — the pure half of the "Scenarios shown" picker above the
// chart. VIEW STATE ONLY: the ticked set lives in `main.ts` beside `chartView` and `axisMode` and is
// never written to the plan file. Every claim here is an assertion in
// `test/app-scenario-selection.test.mjs`.
//
// **The subset is built, not hidden.** The series is rebuilt from the ticked Scenarios' walks — the
// walks `draw()` already has, so nothing is re-projected — rather than drawing every line and hiding
// some. That matters for the crossover: `comparisonSeries` only looks for one when the comparison
// holds a single pair, so the pair has to be the pair ON SCREEN, not the pair in the file.
//
// **Styles are assigned over EVERY Scenario in the plan, not over the ticked ones.** `scenarioStyles`
// resolves a slot collision by id order over the set it is handed, so styling the ticked subset alone
// could hand a line a different colour when a box is unticked elsewhere. `styleIds` carries the whole
// plan's ids so a Scenario keeps its line whatever else is shown.
import { comparisonSeries } from './comparisonSeries.js';
import type { ComparisonSeries } from './comparisonSeries.js';
import type { PlanFile } from '../core/parsePlan.js';
import type { ScenarioWalks } from './scenarioWalks.js';

/** Shown in place of the chart when every box is unticked. */
export const NO_SCENARIOS_TICKED = 'No scenarios ticked — tick one above to draw it.';

/**
 * The ticked set after the plan changed. Ids no longer in the plan are dropped; ids that were not in
 * the plan before (`previousIds`) arrive ticked. An id the reader unticked stays unticked.
 */
export const reconcileTicked = (
  ticked: ReadonlySet<string>,
  previousIds: readonly string[],
  plan: PlanFile,
): ReadonlySet<string> => {
  const before = new Set(previousIds);
  return new Set(
    plan.scenarios.map((scenario) => scenario.id).filter((id) => ticked.has(id) || !before.has(id)),
  );
};

/**
 * The Compare chart's series for the ticked Scenarios, in the plan's own order, or `undefined` when
 * none of the plan's Scenarios is ticked. A ticked id the plan no longer holds is ignored.
 */
export const tickedComparison = (
  plan: PlanFile,
  walks: ScenarioWalks,
  ticked: ReadonlySet<string>,
): ComparisonSeries | undefined => {
  const scenarios = plan.scenarios.filter((scenario) => ticked.has(scenario.id));
  if (scenarios.length === 0) return undefined;
  const series = comparisonSeries({ ...plan, scenarios }, walks);
  return Object.freeze({ ...series, styleIds: Object.freeze(plan.scenarios.map((scenario) => scenario.id)) });
};

/** The picker's own summary line, e.g. "Scenarios shown (2 of 3)". */
export const tickedSummary = (plan: PlanFile, ticked: ReadonlySet<string>): string =>
  `Scenarios shown (${plan.scenarios.filter((scenario) => ticked.has(scenario.id)).length} of ${plan.scenarios.length})`;
