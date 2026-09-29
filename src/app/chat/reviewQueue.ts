// plan_ai.md §2 rule 2, §9 stage 5, ADR-0004 — **the review queue: each suggestion the chat's
// `proposeEntries` or `proposeScenario` passed, waiting for the user to accept or reject it.** P15-7 and P15-7a.
//
// **IN MEMORY, AND NOWHERE ELSE.** The queue is a list held by the panel's closure. Nothing here
// touches localStorage, the plan file or the server, so a reload empties it: a suggestion is worth
// keeping only while the conversation that produced it is on screen.
//
// **EACH ITEM IS RE-CHECKED ON THE WAY IN** with `proposalOrRefusal` against the plan the page holds
// now. One the plan no longer passes (it was saved over mid-turn) is dropped rather than queued. The
// item shows the entries in the entry table's own wording (`entrySummary`, the person's name from
// `ownerLabel`), and the trial walk's effect as chips: `runProjection` with the same what-if, recorded
// in a figure store of the item's own, so every figure is the engine's and converts with the page's
// toggle like any chip.
//
// **ACCEPT WRITES THROUGH THE PAGE'S ONE SAVE, WITH THE FORM'S CHECKS.** Each entry is built by the
// entry form's own builder (`formBuiltEntry`) under a fresh id, appended to the suggestion's scenario
// with `planWithEntry`, and each entry it switches off gets `planWithEntryOverride`: the same builders
// the form and the entries table use. The candidate goes to `save`, which the page wires to its own
// `save` and so to the ordinary save path (parse door, then every scenario walked). A refusal
// writes nothing and the item stays. **REJECT WRITES NOTHING:** it drops the item and calls nothing.
//
// **EACH ENTRY ACCEPT ADDS CARRIES THE TURN BEHIND IT** as its `origin` (P15-13, plan_ai.md §7.3),
// when the panel hands one in: the question, the reply as shown, the model and the date. Provenance
// only — the walk never reads it, and `listEntries` never gives it back to the model.
//
// **A `proposeScenario` SUGGESTION CREATES ITS SCENARIO ON ACCEPT, WITH THE LIST'S OWN CLONE.**
// `scenarioCloned` under a fresh id, parented to the suggestion's parent and holding no entry ids —
// inheritance, never a copy — then the suggestion's entries, if any, go into THAT scenario as above,
// all in one candidate and one save. Its name and parent are re-checked on the way in and again on
// Accept (`newScenarioRefusal`): a name taken or a parent gone since is not saved.
//
// Nothing in `app/chat/` may name the writers (`test/import-graph.test.mjs`); `save` is handed in.
import { entrySummary } from '../entryForm.js'; // `.js` is correct in a `.ts` file — see tsconfig.json
import { ownerLabel } from '../ownerNames.js';
import { planWithEntry, planWithEntryOverride, planWithScenarios } from '../planEdits.js';
import { scenarioCloned } from '../scenarioList.js';
import { chipHtml } from './chips.js';
import { createFigureStore } from './figureStore.js';
import { formBuiltEntry, proposalOrRefusal } from './tools/proposeEntries.js';
import { newScenarioRefusal } from './tools/proposeScenario.js';
import { accountsStored, changesOf, runProjection } from './tools/runProjection.js';
import type { PlanFile } from '../../core/parsePlan.js';
import type { Entry, EntryOrigin } from '../../core/plan.js';
import type { MoneyBasis } from '../todaysDollars.js';
import type { PassedProposal } from './conversation.js';
import type { FigureStore } from './figureStore.js';

export interface ReviewItem {
  readonly id: string;
  /** The scenario the entries go into — for a new scenario, its parent, which the entries were checked against. */
  readonly scenarioId: string;
  readonly scenarioName: string;
  /** A `proposeScenario` suggestion: the scenario Accept creates, as a child of `parentId`. */
  readonly newScenario?: { readonly name: string; readonly parentId: string };
  /** The checked drafts, accounts stored from 0, with no id yet: Accept gives each one. */
  readonly toAdd: readonly Entry[];
  readonly toSwitchOff: readonly string[];
  /** One line per entry, in the entry table's wording. */
  readonly wording: readonly string[];
  /** The trial walk, recorded; `effectHtml` renders it in the page's basis. `undefined` for a new scenario with no entries: there is nothing to walk. */
  readonly trial: { readonly store: FigureStore; readonly modelText: string } | undefined;
}

export type AcceptOutcome = { readonly kind: 'saved' } | { readonly kind: 'notSaved'; readonly message: string };

export interface AcceptDeps {
  /** The plan the page holds now. */
  readonly plan: PlanFile;
  /** The page's own save: `true` once the write landed, `false` if it was refused or failed (the page says why). */
  readonly save: (candidate: unknown) => Promise<boolean>;
  readonly newId: () => string;
  /** `YYYY-MM-DD`, the day the entry is written down, as the form stamps `createdAt`. */
  readonly today: string;
  /** The turn the suggestion came from, recorded on each entry it adds. */
  readonly origin?: EntryOrigin;
}

export const NOT_SAVED = 'Not saved. The message at the top of the page says why; nothing was written.';
export const PLAN_MOVED_ON = 'Not saved: this suggestion names an entry or a scenario the plan no longer holds. Nothing was written.';
export const NAME_TAKEN = 'Not saved: a scenario with this name was added since the suggestion was made. Nothing was written.';
export const NO_EFFECT = 'This what-if changes no headline figure and no marker.';
export const SAME_AS_PARENT = 'The new scenario has no changes of its own, so it forecasts exactly as its parent does until you add some.';

const HEADLINE_NAMES: Readonly<Record<string, string>> = {
  spending: 'spending',
  agePension: 'Age Pension',
  incomeFromSuper: 'income from super',
  tax: 'tax',
  unfundedShortfall: 'shortfall not covered',
  totalBalances: 'balances at the year’s end',
};

const MARKER_NAMES: Readonly<Record<string, string>> = {
  shortfallAge: 'Shortfall Age',
  pensionOnlyAge: 'Pension-Only Age',
  contingencyFloor: 'Contingency Floor',
  mortgagePayoff: 'Home loan payoff',
  retirements: 'Retirement',
  mortgageTargets: 'Mortgage target',
};

/** How many changed years a card lists before it says how many more there are. */
export const YEARS_SHOWN = 3;

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value);

const escaped = (text: string): string => text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** A figure as the model would have been shown it: marker, value, label. */
const SHOWN = /⟦(t\d+):([^⟦⟧]+)⟧ -?\$[\d,]+ \([^()]*\)/g;

/** `text` escaped, each shown figure in it a chip in `basis`. */
const withChips = (text: string, store: FigureStore, basis: MoneyBasis): string => {
  let html = '';
  let at = 0;
  for (const match of text.matchAll(SHOWN)) {
    html += escaped(text.slice(at, match.index)) + chipHtml(match[1]!, match[2]!, store, basis);
    at = match.index + match[0].length;
  }
  return html + escaped(text.slice(at));
};

/** One marker's value in words: its month and ages, a person's retirement, or its own sentence. */
const described = (value: unknown): string => {
  if (Array.isArray(value)) return value.map(described).join('; ');
  if (!isRecord(value)) return String(value);
  const who = typeof value['person'] === 'string' ? `${value['person']}: ` : '';
  if (typeof value['month'] === 'string' && Array.isArray(value['ages'])) {
    const ages = value['ages'].filter(isRecord).map((each) => `${each['person']} ${each['age']}`);
    return `${who}${value['month']} (${ages.join(', ')})`;
  }
  if (typeof value['month'] === 'string') return `${who}${value['month']}${typeof value['age'] === 'number' ? `, age ${value['age']}` : ''}`;
  if (typeof value['why'] === 'string') return `${who}${value['why']}`;
  return `${who}${String(value['status'])}`;
};

/** The trial walk's effect, one line of markup each: the markers that moved, then the first changed years' headline figures as chips. */
export const effectHtml = (item: ReviewItem, basis: MoneyBasis): readonly string[] => {
  if (item.trial === undefined) return [escaped(SAME_AS_PARENT)];
  const { store, modelText } = item.trial;
  const parsed = JSON.parse(modelText) as { difference: { markers: Record<string, Record<string, Record<string, unknown>>>; differenceByYear: Record<string, string>[] } };
  const lines: string[] = [];
  for (const group of Object.values(parsed.difference.markers)) {
    for (const [name, pair] of Object.entries(group)) {
      if (pair['changed'] !== true) continue;
      lines.push(withChips(`${MARKER_NAMES[name] ?? name}: ${described(pair['before'])} → ${described(pair['after'])}`, store, basis));
    }
  }
  const years = parsed.difference.differenceByYear;
  for (const { financialYear, ...figures } of years.slice(0, YEARS_SHOWN)) {
    const changed = Object.entries(figures).map(([key, figure]) => `${HEADLINE_NAMES[key] ?? key} ${figure}`);
    lines.push(withChips(`${financialYear}: ${changed.join(', ')}`, store, basis));
  }
  if (years.length > YEARS_SHOWN) lines.push(escaped(`…and ${years.length - YEARS_SHOWN} more years change.`));
  return lines.length === 0 ? [escaped(NO_EFFECT)] : lines;
};

/** `built` with `origin` recorded on it; a form refusal (`undefined`) is passed on for `planWithEntry` to refuse. */
const withOrigin = (built: unknown, origin: EntryOrigin | undefined): unknown =>
  origin === undefined || !isRecord(built) ? built : { ...built, origin };

const wordingOf = (plan: PlanFile, entry: Entry): string => `${entrySummary(entry)} (${ownerLabel(plan.household, entry.owner)})`;

/** The in-memory queue. A new one is empty; nothing outlives the page. */
export const createReviewQueue = () => {
  let items: readonly ReviewItem[] = [];
  let next = 1;

  /** Queue `proposal` as `plan` checks it now, or `undefined` if the plan no longer passes it. */
  const add = (plan: PlanFile, proposal: PassedProposal): ReviewItem | undefined => {
    const { newScenario } = proposal;
    if (newScenario !== undefined) {
      if (newScenarioRefusal(plan, newScenario.name, newScenario.parentId) !== undefined) return undefined;
      const parentName = plan.scenarios.find(({ id }) => id === newScenario.parentId)!.name;
      const heading = `New scenario “${newScenario.name}”, inheriting every entry of “${parentName}”, live; none is copied into it`;
      if (proposal.whatIf === undefined) {
        const item: ReviewItem = {
          id: `suggestion-${next++}`,
          scenarioId: newScenario.parentId,
          scenarioName: newScenario.name,
          newScenario,
          toAdd: [],
          toSwitchOff: [],
          wording: [heading],
          trial: undefined,
        };
        items = [...items, item];
        return item;
      }
      const item = entriesItem(plan, { whatIf: proposal.whatIf, scenarioId: newScenario.parentId });
      if (item === undefined) return undefined;
      const withScenario: ReviewItem = { ...item, scenarioName: newScenario.name, newScenario, wording: [heading, ...item.wording] };
      items = [...items, withScenario];
      return withScenario;
    }
    const item = entriesItem(plan, proposal);
    if (item !== undefined) items = [...items, item];
    return item;
  };

  const entriesItem = (plan: PlanFile, proposal: PassedProposal): ReviewItem | undefined => {
    const options = proposal.scenarioId === undefined ? {} : { scenarioId: proposal.scenarioId };
    const checked = proposalOrRefusal(plan, proposal.whatIf, options);
    if ('refused' in checked) return undefined;
    const changes = changesOf(structuredClone(proposal.whatIf))!;
    const drafts = [...changes.add, ...changes.replace.map((swap) => swap.with)];
    const toAdd = drafts.map((draft, index) => (accountsStored(plan, draft, `draft ${index}`) as { readonly draft: unknown }).draft as Entry);
    const toSwitchOff = [...changes.disable, ...changes.replace.map(({ entryId }) => entryId)];
    const store = createFigureStore(plan.settings);
    const modelText = store.record('runProjection', () => runProjection(plan, proposal.whatIf, options));
    const item: ReviewItem = {
      id: `suggestion-${next++}`,
      scenarioId: checked.scenarioId,
      scenarioName: plan.scenarios.find(({ id }) => id === checked.scenarioId)?.name ?? checked.scenarioId,
      toAdd,
      toSwitchOff,
      wording: [
        ...toAdd.map((entry) => `Add: ${wordingOf(plan, entry)}`),
        ...toSwitchOff.map((id) => `Switch off: ${wordingOf(plan, plan.entries.find((entry) => entry.id === id)!)}`),
      ],
      trial: { store, modelText },
    };
    return item;
  };

  const reject = (id: string): void => {
    items = items.filter((item) => item.id !== id);
  };

  const accept = async (id: string, deps: AcceptDeps): Promise<AcceptOutcome> => {
    const item = items.find((each) => each.id === id);
    if (item === undefined || !deps.plan.scenarios.some((scenario) => scenario.id === item.scenarioId)) return { kind: 'notSaved', message: PLAN_MOVED_ON };
    const { newScenario } = item;
    if (newScenario !== undefined) {
      const refused = newScenarioRefusal(deps.plan, newScenario.name, newScenario.parentId);
      if (refused !== undefined) return { kind: 'notSaved', message: refused.refused === 'DUPLICATE_NAME' ? NAME_TAKEN : PLAN_MOVED_ON };
    }
    let candidate: PlanFile;
    try {
      let base = deps.plan;
      let into = item.scenarioId;
      if (newScenario !== undefined) {
        into = deps.newId();
        base = planWithScenarios(deps.plan, scenarioCloned(deps.plan.scenarios, newScenario.parentId, into, newScenario.name)) as PlanFile;
      }
      const withEntries = item.toAdd.reduce<PlanFile>(
        (plan, entry) => planWithEntry(plan, withOrigin(formBuiltEntry(entry, deps.newId(), deps.today), deps.origin)) as PlanFile,
        { ...base, activeScenarioId: into },
      );
      candidate = item.toSwitchOff.reduce<PlanFile>(
        (plan, entryId) => planWithEntryOverride(plan, into, entryId, false) as PlanFile,
        { ...withEntries, activeScenarioId: deps.plan.activeScenarioId },
      );
    } catch (error) {
      if (error instanceof RangeError) return { kind: 'notSaved', message: PLAN_MOVED_ON };
      throw error;
    }
    if (!(await deps.save(candidate))) return { kind: 'notSaved', message: NOT_SAVED };
    items = items.filter((each) => each.id !== id);
    return { kind: 'saved' };
  };

  return { add, accept, reject, items: (): readonly ReviewItem[] => items };
};

export type ReviewQueue = ReturnType<typeof createReviewQueue>;
