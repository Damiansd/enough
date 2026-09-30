// P18 — the "Try changes" panel: three sliders over the Compare chart, and the four figures beside
// them. It DECIDES nothing: which entry a slider moves, the candidate plan, the refusals, the labels
// and the figures are all `sandbox.ts`'s, and a save goes through the page's own door.
//
// What this file owns is timing, and each rule is a TODO.md P18 ruling:
//   * one redraw per animation frame, reading the positions when the frame runs, so the position a
//     slider stops at is always the one drawn (P18-5);
//   * the parent's walk is `main.ts`'s cached one, so only the sandbox re-projects (P18-5);
//   * sustainable spend runs about 0.5 s after dragging stops, never per step, and says "updating…"
//     until it lands; a search from an older position is thrown away (P18-4);
//   * a refusal blanks the sandbox line and figures and names the reason (P18-6).
//
// Untested for the reason `scenarioPanel.ts` is: there is no DOM under `node:test`. What can be
// decided without one is in `sandbox.ts`, and `test/app-sandbox.test.mjs` pins it.
import {
  LEAVE_QUESTION,
  SPEND_FACTOR_RANGE,
  UNMOVED,
  positionsMoved,
  reconcilePositions,
  retireAgeLabel,
  sandboxCandidate,
  sandboxFigures,
  sandboxSaved,
  sandboxSliders,
  sandboxWalk,
  shiftedDate,
  spendLabel,
  sustainableRow,
} from './sandbox.js'; // `.js` is correct in a `.ts` file — see tsconfig.json
import type { SandboxCandidate, SandboxPositions, SandboxSliders, SandboxWalk, SustainableCell } from './sandbox.js';
import { scenarioById, scenarioEntries } from './scenarioWalks.js';
import { tickedComparison } from './scenarioSelection.js';
import type { ComparisonSeries } from './comparisonSeries.js';
import { sustainableSpend } from '../core/sustainableSpend.js';
import { ownerLabel } from './ownerNames.js';
import { formatDollars } from './displayMoney.js';
import { monthName } from './financialYearRows.js';
import { infoButton } from './infoButton.js';
import type { Cents } from '../core/money.js';
import type { Month } from '../core/plan.js';
import type { PlanFile } from '../core/parsePlan.js';

export interface SandboxPanelHost {
  readonly currentPlan: () => PlanFile;
  /** The walk `main.ts` already holds for a Scenario. The parent is never re-projected here. */
  readonly walkOf: (scenarioId: string) => readonly Month[] | undefined;
  /** Draw this pair on the Compare chart, or `undefined` to hand the chart back as it was. */
  readonly showPair: (series: ComparisonSeries | undefined) => void;
  /** The page's save door. Resolves `true` when the write landed. */
  readonly commit: (candidate: unknown) => Promise<boolean>;
}

export interface SandboxPanel {
  /** After every landed save: follow the parent, drop a slider whose target went (P18-9). */
  readonly redraw: () => void;
  /** Whether any slider has moved — what decides whether leaving asks first. */
  readonly moved: () => boolean;
  /** Put every slider back. The panel stays open. */
  readonly discard: () => void;
  /** Ask for a name and save the sandbox as a child Scenario. `true` when it landed. */
  readonly saveAs: () => Promise<boolean>;
}

const SEARCH_DELAY_MS = 500;

const localToday = (): string => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
};

const monthYear = (date: string): string => `${monthName(date.slice(0, 7))} ${date.slice(0, 4)}`;

export const mountSandboxPanel = (details: HTMLDetailsElement, body: HTMLElement, host: SandboxPanelHost): SandboxPanel => {
  let parentId: string | undefined;
  let session = '';
  let positions: SandboxPositions = UNMOVED;
  let sliders: SandboxSliders | undefined;
  let candidate: SandboxCandidate | undefined;
  let walk: SandboxWalk | undefined;
  let parentSustainable: SustainableCell = 'updating';
  let sandboxSustainable: SustainableCell = 'updating';
  let notices: readonly string[] = [];
  let generation = 0;
  let frame = 0;
  let searchTimer: ReturnType<typeof setTimeout> | undefined;
  let saving = false;

  const intro = infoButton(
    'How this works',
    'Move a slider to see the change against the selected scenario, drawn beside it on the chart. Nothing is' +
      ' kept until you press Save as a scenario.',
    'guide:try-changes',
  );
  const noticeLine = document.createElement('p');
  noticeLine.className = 'sandbox-notice';
  const controls = document.createElement('div');
  controls.className = 'sandbox-controls';
  const refusalLine = document.createElement('p');
  refusalLine.className = 'sandbox-refusal';
  const table = document.createElement('table');
  table.className = 'sandbox-figures';
  const saveButton = document.createElement('button');
  saveButton.type = 'button';
  saveButton.textContent = 'Save as a scenario';
  const discardButton = document.createElement('button');
  discardButton.type = 'button';
  discardButton.textContent = 'Discard';
  const actions = document.createElement('p');
  actions.append(saveButton, ' ', discardButton);
  body.replaceChildren(intro, noticeLine, controls, refusalLine, table, actions);

  const moved = (): boolean => parentId !== undefined && positionsMoved(positions);

  const ids = (): { scenarioId: string; entryId: (replacing: string) => string; createdAt: string } => ({
    scenarioId: session,
    entryId: (replacing) => `${session}-${replacing}`,
    createdAt: localToday(),
  });

  const ok = (): { candidate: Extract<SandboxCandidate, { kind: 'candidate' }>; months: readonly Month[] } | undefined =>
    candidate?.kind === 'candidate' && walk?.kind === 'walked' ? { candidate, months: walk.months } : undefined;

  const slider = (label: string, min: number, max: number, value: number, onInput: (value: number) => string): HTMLElement => {
    const row = document.createElement('div');
    row.className = 'sandbox-slider';
    const name = document.createElement('label');
    const input = document.createElement('input');
    input.type = 'range';
    input.min = String(min);
    input.max = String(max);
    input.step = '1';
    input.value = String(value);
    const output = document.createElement('output');
    output.textContent = onInput(value);
    input.addEventListener('input', () => {
      output.textContent = onInput(Number(input.value));
      changed();
    });
    name.append(`${label} `, input);
    row.append(name, ' ', output);
    return row;
  };

  const greyed = (label: string, reason: string): HTMLElement => {
    const row = document.createElement('div');
    row.className = 'sandbox-slider greyed';
    const input = document.createElement('input');
    input.type = 'range';
    input.disabled = true;
    const name = document.createElement('label');
    name.append(`${label} `, input);
    row.append(name, ` ${reason}`);
    return row;
  };

  const buildControls = (plan: PlanFile): void => {
    if (sliders === undefined) return;
    const rows: HTMLElement[] = [];
    if (sliders.retireReason !== undefined) rows.push(greyed('Retirement', sliders.retireReason));
    for (const each of sliders.retire) {
      rows.push(slider(
        `Retirement — ${ownerLabel(plan.household, each.owner)}`,
        each.minMonths,
        each.maxMonths,
        positions.retireMonths[each.owner] ?? 0,
        (months) => {
          positions = { ...positions, retireMonths: { ...positions.retireMonths, [each.owner]: months } };
          const date = shiftedDate(each.entry.date, months);
          return `${monthYear(date)} · ${retireAgeLabel(plan.household, each.owner, date)}`;
        },
      ));
    }
    const spend = sliders.spend;
    if (spend.kind === 'none') rows.push(greyed('Spending', spend.reason));
    else {
      rows.push(slider('Spending', SPEND_FACTOR_RANGE[0] * 100, SPEND_FACTOR_RANGE[1] * 100, Math.round(positions.spendFactor * 100), (percent) => {
        positions = { ...positions, spendFactor: percent / 100 };
        return spendLabel(spend, percent / 100);
      }));
    }
    const refinance = sliders.refinance;
    if (refinance.kind === 'none') rows.push(greyed('Refinance loan amount', refinance.reason));
    else if (refinance.entry.type === 'MORTGAGE_REFINANCE') {
      const stated = refinance.entry.params.openingBalance;
      rows.push(slider('Refinance loan amount', 0, refinance.max / 100, Math.round((positions.refinanceBalance ?? stated) / 100), (dollars) => {
        const cents = (dollars * 100) as Cents;
        positions = { ...positions, refinanceBalance: Math.round(stated / 100) === dollars ? undefined : cents };
        return `${formatDollars(cents)} from ${monthYear(refinance.entry.date)}`;
      }));
    }
    controls.replaceChildren(...rows);
    noticeLine.textContent = notices.join(' ');
    noticeLine.hidden = notices.length === 0;
  };

  const paintFigures = (plan: PlanFile, parentWalk: readonly Month[]): void => {
    const good = ok();
    const rows = [
      ...sandboxFigures(plan.household, plan.settings.economicSeries.agePension, parentWalk, good?.months),
      sustainableRow(parentSustainable, good === undefined ? undefined : sandboxSustainable),
    ];
    const head = document.createElement('tr');
    for (const text of ['', 'Selected', 'Sandbox', 'Difference']) {
      const th = document.createElement('th');
      th.textContent = text;
      head.append(th);
    }
    table.replaceChildren(head, ...rows.map((row) => {
      const tr = document.createElement('tr');
      for (const text of [row.label, row.selected, row.sandbox, row.difference]) {
        const td = document.createElement('td');
        td.textContent = text;
        tr.append(td);
      }
      return tr;
    }));
    saveButton.disabled = good === undefined || !moved();
    discardButton.disabled = !moved();
  };

  /** Recompute the candidate and its walk from the positions as they are NOW, then paint. */
  const recompute = (): void => {
    frame = 0;
    if (parentId === undefined) return;
    const plan = host.currentPlan();
    const parentWalk = host.walkOf(parentId);
    if (parentWalk === undefined) return;
    candidate = sandboxCandidate(plan, parentId, positions, ids());
    walk = candidate.kind === 'candidate' ? sandboxWalk(candidate) : undefined;
    const good = ok();
    const reason = candidate.kind === 'refused' ? candidate.reason : walk?.kind === 'refused' ? walk.reason : undefined;
    refusalLine.textContent = reason === undefined ? '' : `This combination can’t be forecast: ${reason}`;
    refusalLine.hidden = reason === undefined;
    const series = good === undefined
      ? tickedComparison(plan, { active: parentWalk, byScenarioId: new Map([[parentId, parentWalk]]) }, new Set([parentId]))
      : tickedComparison(
          good.candidate.plan,
          { active: parentWalk, byScenarioId: new Map([[parentId, parentWalk], [good.candidate.sandboxId, good.months]]) },
          new Set([parentId, good.candidate.sandboxId]),
        );
    host.showPair(series);
    paintFigures(plan, parentWalk);
  };

  const flush = (): void => {
    if (frame !== 0) {
      cancelAnimationFrame(frame);
      recompute();
    }
  };

  /** The slow figure, for the parent (once per plan) and for the sandbox (once dragging stops). */
  const search = (): void => {
    searchTimer = undefined;
    if (parentId === undefined) return;
    flush();
    const plan = host.currentPlan();
    const asked = generation;
    if (parentSustainable === 'updating') {
      parentSustainable = sustainableSpend(plan.settings, plan.household, scenarioEntries(plan, scenarioById(plan, parentId)));
    }
    const good = ok();
    if (good !== undefined && asked === generation) {
      sandboxSustainable = moved()
        ? sustainableSpend(plan.settings, plan.household, scenarioEntries(good.candidate.plan, scenarioById(good.candidate.plan, good.candidate.sandboxId)))
        : parentSustainable;
    }
    const parentWalk = host.walkOf(parentId);
    if (parentWalk !== undefined) paintFigures(plan, parentWalk);
  };

  /** Every change of position: "updating…" at once, a frame for the live figures, the search later. */
  const changed = (): void => {
    generation += 1;
    sandboxSustainable = 'updating';
    if (frame === 0) frame = requestAnimationFrame(recompute);
    if (searchTimer !== undefined) clearTimeout(searchTimer);
    searchTimer = setTimeout(search, SEARCH_DELAY_MS);
  };

  const start = (): void => {
    const plan = host.currentPlan();
    parentId = plan.activeScenarioId;
    session = crypto.randomUUID();
    positions = UNMOVED;
    notices = [];
    sliders = sandboxSliders(plan, parentId);
    parentSustainable = 'updating';
    buildControls(plan);
    changed();
  };

  const close = (): void => {
    if (frame !== 0) cancelAnimationFrame(frame);
    if (searchTimer !== undefined) clearTimeout(searchTimer);
    frame = 0;
    searchTimer = undefined;
    parentId = undefined;
    positions = UNMOVED;
    candidate = undefined;
    walk = undefined;
    host.showPair(undefined);
  };

  const discard = (): void => {
    if (parentId === undefined) return;
    positions = UNMOVED;
    notices = [];
    buildControls(host.currentPlan());
    changed();
  };

  const saveAs = async (): Promise<boolean> => {
    flush();
    const good = ok();
    if (good === undefined) {
      const reason = candidate?.kind === 'refused' ? candidate.reason : walk?.kind === 'refused' ? walk.reason : 'nothing to save';
      window.alert(`These changes can’t be saved: ${reason}`);
      return false;
    }
    const name = window.prompt('Name for the new scenario');
    if (name === null || name.trim() === '') return false;
    saving = true;
    let landed: boolean;
    try {
      landed = await host.commit(sandboxSaved(good.candidate, name));
    } finally {
      saving = false;
    }
    if (landed) {
      close();
      details.open = false;
    }
    return landed;
  };

  details.addEventListener('toggle', () => {
    if (details.open && parentId === undefined) {
      start();
      return;
    }
    if (details.open || parentId === undefined) return;
    if (moved() && window.confirm(LEAVE_QUESTION)) {
      void saveAs().then((landed) => {
        if (!landed) details.open = true;
      });
      return;
    }
    close();
  });

  saveButton.addEventListener('click', () => void saveAs());
  discardButton.addEventListener('click', discard);

  window.addEventListener('beforeunload', (event) => {
    if (!moved()) return;
    event.preventDefault();
    event.returnValue = '';
  });

  return {
    redraw: () => {
      if (parentId === undefined || saving) return;
      const plan = host.currentPlan();
      // Switched Scenario: positions never carry over (P18-8).
      if (plan.activeScenarioId !== parentId) {
        start();
        return;
      }
      const next = sandboxSliders(plan, parentId);
      const reconciled = reconcilePositions(sliders ?? next, next, positions);
      positions = reconciled.positions;
      notices = reconciled.notices;
      sliders = next;
      parentSustainable = 'updating';
      buildControls(plan);
      changed();
    },
    moved,
    discard,
    saveAs,
  };
};
