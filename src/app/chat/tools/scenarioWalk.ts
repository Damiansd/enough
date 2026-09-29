// plan_ai.md §5 — what every read tool takes before it reads a walk: WHICH Scenario (the file's
// active one unless named) and WHICH money (today's unless asked, §12.8). An id or a view the plan
// does not have comes back as a named refusal and never as a thrown error or a silent default.
import { scenarioEntries, scenarioById, scenarioWalks } from '../../scenarioWalks.js'; // `.js` is correct in a `.ts` file — see tsconfig.json
import { DEFAULT_MONEY_VIEW, MONEY_VIEW_TAG, moneyBasis } from '../../todaysDollars.js';
import type { Entry, Month } from '../../../core/plan.js';
import type { PlanFile } from '../../../core/parsePlan.js';
import type { MoneyBasis, MoneyView } from '../../todaysDollars.js';

export interface ToolOptions {
  /** A Scenario's `id`. Absent: the plan's `activeScenarioId`. */
  readonly scenarioId?: string;
  /** Absent: today's money. */
  readonly basis?: MoneyView;
}

/** A question the tool will not answer, and why — the AI is handed this, never a stack trace. */
export interface ToolRefusal {
  readonly refused: string;
  readonly reason: string;
}

export interface ScenarioWalk {
  readonly scenarioId: string;
  readonly months: readonly Month[];
  /** The entries this walk was projected from — the Scenario's, resolved, never the pool. */
  readonly entries: readonly Entry[];
  readonly basis: MoneyBasis;
}

export const isRefusal = <T extends object>(value: T | ToolRefusal): value is ToolRefusal => 'refused' in value;

/** The named Scenario's walk on the asked basis, resolved through `scenarioWalks`, or a refusal. */
export const scenarioWalk = (plan: PlanFile, options: ToolOptions = {}): ScenarioWalk | ToolRefusal => {
  const view = options.basis ?? DEFAULT_MONEY_VIEW;
  if (!Object.hasOwn(MONEY_VIEW_TAG, view)) {
    return { refused: 'UNKNOWN_BASIS', reason: `a basis is one of ${Object.keys(MONEY_VIEW_TAG).join(', ')}` };
  }
  const scenarioId = options.scenarioId ?? plan.activeScenarioId;
  const months = scenarioWalks(plan).byScenarioId.get(scenarioId);
  if (months === undefined) {
    // The ids only: a Scenario's NAME is the user's own text and may name a Person.
    return { refused: 'UNKNOWN_SCENARIO', reason: `no scenario has that id; the plan's scenario ids are ${plan.scenarios.map(({ id }) => id).join(', ')}` };
  }
  return { scenarioId, months, entries: scenarioEntries(plan, scenarioById(plan, scenarioId)), basis: moneyBasis(view, plan.settings) };
};
