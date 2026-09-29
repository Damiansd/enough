// plan_ai.md §5 and ADR-0002 — **`proposeScenario`: a new scenario, checked, as a child of one the
// plan holds.** P15-7. Nothing is written and nothing is kept here: in the page the conversation
// hands a passed call to the review queue (`reviewQueue.ts`), whose Accept creates it with the
// scenario list's own Clone (`scenarioCloned`) and the page's own save.
//
// **IT INHERITS, IT NEVER COPIES.** The child is `scenarioCloned`'s: parented to `parentId` and
// holding no entry ids of its own, so every entry of the parent reaches it live. The only entries it
// holds are the ones a `whatIf` adds, which are checked exactly as `proposeEntries` checks them,
// against the PARENT — a child with no entries of its own walks exactly as its parent does, so that
// is the walk the new entries land on.
//
// **THE NAME RULES ARE THE LIST'S, PLUS ONE.** Blank is refused as `scenarioList.ts` refuses it. A
// name another scenario already has is refused too: the model cannot see the names (they are the
// user's own text), so a suggestion is the one writer that could pick one blind.
import { DEFAULT_MONEY_VIEW, MONEY_VIEW_TAG } from '../../todaysDollars.js'; // `.js` is correct in a `.ts` file — see tsconfig.json
import { toolOutput } from './identity.js';
import { proposalOrRefusal } from './proposeEntries.js';
import { isRefusal } from './scenarioWalk.js';
import type { PlanFile } from '../../../core/parsePlan.js';
import type { MoneyView } from '../../todaysDollars.js';
import type { ToolRefusal } from './scenarioWalk.js';

export const INHERITS =
  'Nothing has been saved. The new scenario inherits every entry of its parent, live: an entry the parent gains, loses or switches off later changes it too. ' +
  'No entry is copied into it; it holds as its own only the entries under toType and toSwitchOff, if any. ' +
  'To add it yourself: Clone the parent in the scenarios list, rename the copy to this name, and with it in view type in each entry below.';

/** Why `name` under `parentId` cannot be added to `plan` now, or `undefined`. The scenario names are never repeated back: they are the user's own text. */
export const newScenarioRefusal = (plan: PlanFile, name: string, parentId: string): ToolRefusal | undefined => {
  if (!plan.scenarios.some(({ id }) => id === parentId)) {
    return { refused: 'UNKNOWN_SCENARIO', reason: `no scenario has that id; the plan's scenario ids are ${plan.scenarios.map(({ id }) => id).join(', ')}` };
  }
  if (name.trim() === '') return { refused: 'BLANK_NAME', reason: 'a scenario needs a name — it is how the list is read' };
  if (plan.scenarios.some((scenario) => scenario.name.trim() === name.trim())) {
    return { refused: 'DUPLICATE_NAME', reason: 'a scenario in the plan already has that name; give the new one a name of its own' };
  }
  return undefined;
};

/** The new scenario checked, with the entries a `whatIf` would give it checked against the parent, or a named refusal. */
export const scenarioProposalOrRefusal = (plan: PlanFile, name: string, parentId: string, whatIf: unknown, basis?: MoneyView) => {
  if (basis !== undefined && !Object.hasOwn(MONEY_VIEW_TAG, basis)) {
    return { refused: 'UNKNOWN_BASIS', reason: `a basis is one of ${Object.keys(MONEY_VIEW_TAG).join(', ')}` };
  }
  const refused = newScenarioRefusal(plan, name, parentId);
  if (refused !== undefined) return refused;
  const proposedScenario = { name: name.trim(), parentId };
  if (whatIf === undefined) return { proposedScenario, inherits: INHERITS };
  const entries = proposalOrRefusal(plan, whatIf, { scenarioId: parentId, ...(basis === undefined ? {} : { basis }) });
  if (isRefusal(entries)) return entries;
  const { scenarioId: _parent, ...rest } = entries;
  return { proposedScenario, inherits: INHERITS, ...rest };
};

/** `proposeScenario` as the connector returns it: serialised, through the identity and money guards. */
export const proposeScenario = (plan: PlanFile, name: string, parentId: string, whatIf?: unknown, basis?: MoneyView): string =>
  toolOutput(plan.household, scenarioProposalOrRefusal(plan, name, parentId, whatIf, basis), basis ?? DEFAULT_MONEY_VIEW);
