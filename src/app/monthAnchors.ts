// plan_ai.md §6 and §9 stage 5 — **the month table's anchors, so a chat chip opens the month and
// the line its figure came from.** Additive: `renderTable.ts` builds the table exactly as before and
// this only gives ids to what it built, from the same walk the rows were made from.
//
// A month's summary row is `month-YYYY-MM`. A line is `month-YYYY-MM-line-N`, N counted from 0 as the
// engine counts `Month.lines`, the count `getMonth` and the chips use (`chips.ts`'s `monthTableHref`).
// The table shows a month's lines in two sections, cash then wealth, each in the engine's order
// (`monthToRows.ts`), so the k-th line block of a section is the k-th engine line of that effect. A
// section whose block count does not match its lines gets no line ids: a chip that opens no line is
// better than one that opens the wrong line.

import type { Month } from '../core/plan.js';
import { revealMonth } from './renderTable.js'; // `.js` is correct in a `.ts` file — see tsconfig.json // `.js` is correct in a `.ts` file — see tsconfig.json

export const monthRowId = (month: string): string => `month-${month}`;
export const monthLineId = (month: string, line: number): string => `month-${month}-line-${line}`;

/** The class the chip's target carries until another chip is followed. */
export const CHIP_TARGET = 'chip-target';

const childrenOf = (parent: Element, tag: string, className?: string): readonly Element[] =>
  Array.from(parent.children).filter((child) => child.tagName === tag && (className === undefined || child.classList.contains(className)));

/** Give every month row and line in `container`'s table its id. `months` is the walk the table was rendered from. */
export const anchorMonthTable = (container: HTMLElement, months: readonly Month[]): void => {
  const table = childrenOf(container, 'TABLE')[0];
  if (table === undefined) return;
  // Month bodies only: since the financial-year rows (P7-UX-1), each year has a `tbody.year` of its own
  // ahead of its months, and counting it would shift every anchor onto the wrong month.
  childrenOf(table, 'TBODY').filter((body) => !body.classList.contains('year')).forEach((body, index) => {
    const month = months[index];
    const [summary, expanded] = childrenOf(body, 'TR');
    if (month === undefined || summary === undefined || expanded === undefined) return;
    summary.id = monthRowId(month.month);
    const detail = childrenOf(expanded, 'TD', 'detail')[0];
    if (detail === undefined) return;
    for (const effect of ['cash', 'wealth'] as const) {
      const section = childrenOf(detail, 'SECTION', effect)[0];
      if (section === undefined) continue;
      const blocks = childrenOf(section, 'DIV', 'line');
      const lines = month.lines.flatMap((line, position) => (line.effect === effect ? [position] : []));
      if (blocks.length !== lines.length) continue;
      blocks.forEach((block, k) => (block.id = monthLineId(month.month, lines[k]!)));
    }
  });
};

/** Open the month a chip names, scroll to its row or line and mark it; `false` if the table has no such anchor. */
export const revealAnchor = (doc: Document, id: string): boolean => {
  // A month inside a collapsed financial year is hidden: open its year first.
  const month = /^month-(\d{4}-\d{2})(?:-|$)/.exec(id)?.[1];
  if (month !== undefined) revealMonth(month);
  const target = doc.getElementById(id);
  if (target === null) return false;
  const body = target.closest('tbody');
  const expanded = body?.querySelector<HTMLElement>('tr.expanded');
  if (expanded?.hidden === true) body?.querySelector<HTMLButtonElement>('button.toggle')?.click();
  // The table sits in a collapsed panel (2026-09-28): open every closed <details> around the target.
  for (let panel = target.closest('details'); panel !== null; panel = panel.parentElement?.closest('details') ?? null) panel.open = true;
  doc.querySelectorAll(`.${CHIP_TARGET}`).forEach((each) => each.classList.remove(CHIP_TARGET));
  target.classList.add(CHIP_TARGET);
  target.scrollIntoView({ block: 'center' });
  return true;
};
