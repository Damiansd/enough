// P7-1 (the writer) — the Scenario list: choose the active one, create, clone, rename, and read
// each Scenario's Shortfall Age beside it. It DECIDES nothing. Every list operation comes from
// `scenarioList.ts`'s three pure functions, every plan edit goes back through `planEdits.ts` and
// out through the single `savePlan` door, and every figure it prints was computed by the pure
// layer (`comparisonSeries.ts`'s `shortfallSummary`) and is only formatted here.
//
// **Why it is untested, stated plainly rather than papered over** — the same split as
// `entryForm.ts`, `renderChart.ts` and `renderTable.ts`: there is no DOM under `node:test` and
// `typescript` is the one dev dependency (TODO.md P2-9a). So everything decidable lives in the
// pure modules above, and `test/app-scenario-panel.test.mjs` reads THIS file as text and pins the
// handful of properties a silent regression would turn on: that it writes through `save` and
// never touches a transport, that it does not rewrite `scenarioList.ts`'s rules, and that the
// Shortfall Age it prints is the sentence the pure layer produced.
//
// ⚠️ **THE SHORTFALL AGE IS THE COMPARISON NUMBER, AND IT IS TEXT** (user ruling, 2026-09-19).
// It is here rather than captioned on the chart because N captions collide. `shortfallAge` is
// safe on any non-empty walk; `pensionOnlyAge` is NOT — it throws on a walk the published Age
// Pension parameters do not cover, which the committed fixture is — so it stays behind
// `monthsToSeries.ts`'s own gate and is not asked here at all.
//
// ⚠️ **DELETE IS A SCENARIO CONTROL AND NOT AN ENTRY CONTROL (user ruling, 2026-09-19).** A
// Scenario is a container, so removing one destroys no record of a decision and leaves every
// entry it listed in the shared pool — which the announcement below says in those terms, because
// a user who fears losing entries will not use the button. The journal keeps its append-only
// delete, `enabled: false`, and there is no control on this page or in `entryForm.ts` that removes
// an entry. Every rule the delete obeys — the two refusals and the move of the active Scenario —
// is `scenarioList.ts`'s and is not restated here; this file prints what that function decided.
import { scenarioCloned, scenarioCreated, scenarioDeleted, scenarioRenamed } from './scenarioList.js'; // `.js` is correct in a `.ts` file
import { planWithActiveScenario, planWithScenarioDeleted, planWithScenarios } from './planEdits.js';
import type { PlanFile } from '../core/parsePlan.js';
import { infoButton } from './infoButton.js';
import type { ScenarioAgePension, ScenarioHeas, ScenarioShortfall } from './comparisonSeries.js';

/**
 * What the page gives the panel: the plan on screen, each Scenario's Shortfall Age as the pure
 * layer computed it, and the one thing to do with a candidate. `save` never rejects — `main.ts`
 * catches and banners — so this file has no error handling of its own.
 */
export interface ScenarioPanelHost {
  readonly currentPlan: () => PlanFile;
  /** The Shortfall Age of the walk `main.ts` already has for that Scenario. Never re-projected here. */
  readonly shortfallOf: (scenarioId: string) => ScenarioShortfall | undefined;
  /** P6-8b — the same walk's Age Pension summary, beside the Shortfall Age. Never re-projected here. */
  readonly agePensionOf: (scenarioId: string) => ScenarioAgePension | undefined;
  /** P9-1d — the home value this Scenario's HEAS loan is priced off; `undefined` where it has none. */
  readonly heasOf: (scenarioId: string) => ScenarioHeas | undefined;
  readonly save: (candidate: unknown) => Promise<void>;
  /**
   * The same banner `save` uses for an edit the door refused. A delete is DECIDED before a
   * candidate plan exists — `scenarioDeleted` throws on a Scenario with children and on the last
   * one left — so that refusal has no other way to reach the screen, and a second notification
   * channel would mean two places to look when something goes wrong.
   */
  readonly refuse: (error: unknown) => void;
}

/** The label on the control that makes a Scenario the active one, said as what it does. */
export const ACTIVE_LABEL = 'Showing this scenario — the chart, the table, and where a new change is added';

/** The heading over the two lines below. Small, because this is a hint and not documentation. */
export const HINT_HEADING = 'Picking a scenario';

/**
 * **What the radio actually does, in the user's words rather than the file's.** Three facts, none
 * of them visible from the control itself: it selects the walk `main.ts` draws the focused chart
 * and the month table from (`scenarioWalks.ts`'s `active`), it is the Scenario `planWithEntry`
 * appends a newly added entry's id to, and it is a plan edit that goes through `savePlan` — so a
 * reload opens on it. Users were reading the radio as "which plan I am editing", which it is not.
 */
export const HINT_TEXT = 'The picked scenario is drawn, listed, and gets your next change.';

/**
 * ⚠️ **WHAT SHARING STILL MEANS, now that the on/off switch no longer crosses scenarios
 * (2026-09-22).**
 *
 * This constant used to warn of the opposite fact: switching a change off set `enabled: false` on
 * the ENTRY, in the shared pool, so it went off in every Scenario that listed it. That was a
 * defect, and it was fixed — a Scenario now states its own on/off (`plan.ts`'s `EntryOverrides`,
 * `planEdits.ts`'s `planWithEntryOverride`) and the sentence that warned of it became false. The
 * text was rewritten rather than deleted, because what is left is still not what a reader assumes:
 * scenarios share their changes BY REFERENCE and inheritance is LIVE, so a change added to a parent
 * appears in every scenario built from it, today, without anyone touching those. That is the
 * surprise now, and it is the one nothing else on the page says. Plain words, no register borrowed
 * from the source comments, because a warning nobody parses is not one.
 */
/** What stays on the page: the side effect in short, with `SWITCH_SCOPE_NOTE` behind the ⓘ (P17-6). */
/** P3-20f — the ⓘ's short label beside the Age Pension sentence, where the pure layer attached a note. */
export const AGE_PENSION_NOTE_SUMMARY = 'Super under Age Pension age is not counted';

export const SWITCH_SCOPE_SUMMARY = 'Switching off affects this scenario only; copies still inherit new changes';

export const SWITCH_SCOPE_NOTE =
  'Switching a change off applies to the scenario you are looking at and to no other. What scenarios do' +
  ' share is the changes themselves: a scenario built from another one keeps showing every change you' +
  ' add to that other one, so a new change there turns up here too.';

/** Said where a Scenario has not been walked — never printed as "no shortfall", which is a figure. */
export const NO_WALK_TEXT = 'Not projected in this redraw.';

// `settingsPanel.ts`'s helper, same shape and same `caveat` class, so the two panels' notices are
// one style rather than two: a hint that looked different here would read as a different kind of
// thing. The warning takes a second class on top of it, and only for weight.
const paragraph = (className: string, text: string): HTMLParagraphElement => {
  const element = document.createElement('p');
  element.className = className;
  element.textContent = text;
  return element;
};

const button = (text: string, title: string, onClick: () => void): HTMLButtonElement => {
  const element = document.createElement('button');
  element.type = 'button';
  element.textContent = text;
  element.title = title;
  element.addEventListener('click', onClick);
  return element;
};

/**
 * One row per Scenario, in the plan's own order — position carries no meaning (`activeScenarioId`
 * exists precisely so it does not), and re-ordering the list is not an operation this build has.
 *
 * Each row carries: the radio that makes it active, its name in an editable box with a Rename
 * button beside it, what it inherits from, and its Shortfall Age as text.
 */
const renderList = (list: HTMLElement, host: ScenarioPanelHost, announce: HTMLElement): void => {
  // Cleared on every redraw, so what it says is always about the click that was just made. A
  // delete sets it AFTER its save resolved — by which time `main.ts` has already redrawn this
  // list — so the clear here cannot wipe the sentence it is about to be given.
  announce.textContent = '';
  const plan = host.currentPlan();
  const names = new Map(plan.scenarios.map((scenario) => [scenario.id, scenario.name]));
  list.replaceChildren();
  for (const scenario of plan.scenarios) {
    const row = document.createElement('div');
    row.className = 'scenario';
    row.dataset['active'] = String(scenario.id === plan.activeScenarioId);

    const choose = document.createElement('input');
    choose.type = 'radio';
    choose.name = 'active-scenario';
    choose.value = scenario.id;
    choose.checked = scenario.id === plan.activeScenarioId;
    choose.title = ACTIVE_LABEL;
    choose.addEventListener('change', () => {
      if (!choose.checked) return;
      void host.save(planWithActiveScenario(host.currentPlan(), scenario.id));
    });

    const name = document.createElement('input');
    name.type = 'text';
    name.value = scenario.name;
    name.size = 22;

    const rename = button('Rename', 'The name only. A scenario’s id is what its children and the file point at, and never changes.', () => {
      void host.save(planWithScenarios(host.currentPlan(), scenarioRenamed(host.currentPlan().scenarios, scenario.id, name.value)));
    });

    const clone = button('Clone', 'A new scenario that inherits everything this one has, live, and starts with no changes of its own.', () => {
      const plans = host.currentPlan();
      void host.save(planWithScenarios(plans, scenarioCloned(plans.scenarios, scenario.id, crypto.randomUUID(), `${scenario.name} (copy)`)));
    });

    /**
     * **Delete, with nothing hidden.** Three things happen in order and only in this order: the
     * pure function DECIDES (and may refuse, which goes to the banner and stops here), the single
     * `save` door writes, and then the page reads back what is on disk and says what changed.
     *
     * The read-back is the point of the `await`. `host.save` resolves whether the write landed or
     * was refused at the door — it never rejects — so this asks the plan itself whether the
     * Scenario is gone before claiming it is. A page that announced the delete optimistically
     * would be the one case the announcement exists to prevent: a user told which Scenario they
     * are now looking at, when in fact they are looking at the old one.
     */
    const remove = button('Delete', 'Removes this scenario only. Every entry it listed stays in the plan — a scenario is a container, and deleting it deletes no entry.', () => {
      void (async () => {
        const before = host.currentPlan();
        let decided;
        try {
          decided = scenarioDeleted(before.scenarios, scenario.id, before.activeScenarioId);
        } catch (error) {
          host.refuse(error);
          return;
        }
        await host.save(planWithScenarioDeleted(before, decided));
        if (host.currentPlan().scenarios.some((one) => one.id === scenario.id)) return; // the write did not land; the banner says so
        const kept =
          scenario.entryIds.length === 0
            ? 'It listed no entries of its own, and none were removed.'
            : `The ${scenario.entryIds.length} entries it listed are still in the plan — they were not deleted, and any other scenario that lists them still projects them.`;
        announce.textContent =
          `Deleted the scenario “${scenario.name}”. ${kept}` +
          (decided.switchedTo === null ? '' : ` You were looking at it, so the page has switched to “${decided.switchedTo.name}”.`);
      })();
    });

    const inherits = document.createElement('span');
    inherits.className = 'inherits';
    inherits.textContent =
      scenario.parentId === null
        ? 'Root — inherits nothing'
        : `Inherits from ${names.get(scenario.parentId) ?? scenario.parentId}, live`;

    const shortfall = document.createElement('span');
    shortfall.className = 'shortfall';
    // The sentence the pure layer produced, printed unchanged. Nothing here decides what a
    // shortfall is, formats an age, or turns "never" into a blank — `comparisonSeries.ts` owns
    // all three, and a second wording here would be the same fact spelled two ways on one page.
    shortfall.textContent = host.shortfallOf(scenario.id)?.text ?? NO_WALK_TEXT;

    // P6-8b — the Age Pension entitlement dimension, side by side with the Shortfall Age: the
    // sentence the pure layer built, printed unchanged, on `shortfall`'s own reason above.
    const agePension = document.createElement('span');
    agePension.className = 'age-pension';
    const agePensionSummary = host.agePensionOf(scenario.id);
    agePension.textContent = agePensionSummary?.text ?? NO_WALK_TEXT;

    row.append(choose, name, rename, clone, remove, inherits, shortfall, agePension);

    // P3-20f — the means-test asymmetry beside the count it explains, in the engine's own reason.
    if (agePensionSummary?.note !== undefined) row.append(infoButton(AGE_PENSION_NOTE_SUMMARY, agePensionSummary.note));

    // P9-1d — two Scenarios may price HEAS off two valuations; said beside the other two facts.
    const heas = host.heasOf(scenario.id);
    if (heas !== undefined) {
      const security = document.createElement('span');
      security.className = 'heas-security-value';
      security.textContent = heas.text;
      row.append(security);
    }
    list.append(row);
  }
};

/**
 * The "new scenario" control: a name box and a button. A create is a ROOT — `parentId: null`, no
 * entries — which is `scenarioList.ts`'s ruling and not restated here: it projects the Household
 * and the Settings on their own, which is the honest starting point for "what if none of this
 * happened". To fork the plan you are looking at, use Clone on its row.
 *
 * It also carries the hint, because this box is the FIRST thing in the panel and the only part of
 * it that is not rebuilt on every save — the list is replaced wholesale (see `mountScenarioPanel`),
 * so a standing explanation cannot live there. Presentational only: nothing added here reads the
 * plan, writes to it, or changes what any control does.
 */
const scopeWarning = (): HTMLDetailsElement => {
  const box = infoButton(SWITCH_SCOPE_SUMMARY, SWITCH_SCOPE_NOTE, 'guide:copying-a-scenario');
  box.classList.add('scenario-warning');
  return box;
};

/** Ends a flex row: the heading, hint and warning share one line, the name box starts the next. */
const rowBreak = (): HTMLElement => {
  const span = document.createElement('span');
  span.className = 'row-break';
  return span;
};

const buildCreate = (host: ScenarioPanelHost): HTMLElement => {
  const box = document.createElement('div');
  box.className = 'scenario-create';
  const heading = document.createElement('h3');
  heading.textContent = HINT_HEADING;
  const name = document.createElement('input');
  name.type = 'text';
  name.size = 22;
  name.placeholder = 'New scenario name';
  const label = document.createElement('label');
  label.append('Name ', name);
  box.append(
    heading,
    paragraph('caveat', HINT_TEXT),
    scopeWarning(),
    rowBreak(),
    label,
    button('New scenario', 'A fresh root scenario: no entries and no parent. Clone a row to fork one instead.', () => {
      const plan = host.currentPlan();
      void host.save(planWithScenarios(plan, scenarioCreated(plan.scenarios, crypto.randomUUID(), name.value)));
    }),
  );
  return box;
};

/**
 * Put both controls on the page and return the redraw for the list. `main.ts` calls the returned
 * function after every successful save, so the list is rebuilt from the plan that is now on disk
 * rather than patched to match what the click asked for — a list that updated itself
 * optimistically would keep showing a Scenario a failed write never created.
 */
export const mountScenarioPanel = (
  create: HTMLElement,
  list: HTMLElement,
  host: ScenarioPanelHost,
): (() => void) => {
  // The announcement line lives in the CREATE box rather than the list, because the list is
  // rebuilt wholesale after every save and a sentence about what just happened cannot live in the
  // thing the save replaces.
  const announce = document.createElement('p');
  announce.className = 'scenario-announce';
  create.replaceChildren(buildCreate(host), announce);
  const redraw = (): void => renderList(list, host, announce);
  redraw();
  return redraw;
};
