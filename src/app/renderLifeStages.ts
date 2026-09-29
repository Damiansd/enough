// P16-1 — the DOM half of the "Life stages" strip. `lifeStages.ts` decides every segment, boundary
// and tick; this only paints them, on `renderChart.ts`'s own division of labour (compute in one file,
// draw in the other, so a fixture can prove the computation with no DOM at all).
//
// **PLAIN ELEMENTS AND `style.left`/`style.width` PERCENTAGES, NOT A CANVAS.** The strip is a small
// number of coloured rectangles and a handful of labels — exactly the shape `<div>`s with absolute
// positioning already draw for the entry table's own bars — so there is no reason to bring Chart.js
// to a picture this simple, and every part of it stays inspectable in the page's own DOM.
//
// `container` is rebuilt with `replaceChildren` on every redraw, `renderTable.ts`'s own idiom: closes
// nothing that was open (there is nothing here to open) and cannot leave a stale row from a plan that
// has since changed.
import type { LifeStagePhase, LifeStagesTimeline } from './lifeStages.js'; // `.js` is correct in a `.ts` file — see tsconfig.json
import { PHASE_LABELS, PHASE_ORDER } from './lifeStages.js';

const PHASE_CLASS: Readonly<Record<LifeStagePhase, string>> = Object.freeze({
  working: 'working',
  retired: 'retired',
  care: 'care',
});

/** A month index as a percentage of the walk's own length — the one place index becomes `%`. */
const pct = (index: number, totalMonths: number): number => (totalMonths === 0 ? 0 : (index / totalMonths) * 100);

const boundaryLabel = (atIndex: number, totalMonths: number, text: string): HTMLElement => {
  const label = document.createElement('span');
  label.className = 'phase-boundary';
  label.style.left = `${pct(atIndex, totalMonths)}%`;
  label.textContent = text;
  const tick = document.createElement('span');
  tick.className = 'boundary-tick';
  label.append(tick);
  return label;
};

/** One `.phase-row` — a Person's name, their track of segments, and their boundary labels. */
const personRow = (person: LifeStagesTimeline['persons'][number], totalMonths: number): HTMLElement => {
  const name = document.createElement('span');
  name.className = 'phase-name';
  name.textContent = person.name;

  const track = document.createElement('div');
  track.className = 'phase-track';
  for (const segment of person.segments) {
    const div = document.createElement('div');
    div.className = `phase-segment ${PHASE_CLASS[segment.phase]}`;
    div.style.left = `${pct(segment.fromIndex, totalMonths)}%`;
    div.style.width = `${pct(segment.toIndex, totalMonths) - pct(segment.fromIndex, totalMonths)}%`;
    div.textContent = PHASE_LABELS[segment.phase];
    track.append(div);
  }
  for (const boundary of person.boundaries) track.append(boundaryLabel(boundary.atIndex, totalMonths, boundary.label));
  if (person.diedAtIndex !== undefined && person.endLabel !== undefined) {
    track.append(boundaryLabel(person.diedAtIndex, totalMonths, person.endLabel));
  }

  const row = document.createElement('div');
  row.className = 'phase-row';
  row.append(name, track);
  return row;
};

const yearAxis = (timeline: LifeStagesTimeline): HTMLElement => {
  const axis = document.createElement('div');
  axis.id = 'phase-axis';
  for (const tick of timeline.yearTicks) {
    const span = document.createElement('span');
    span.style.left = `${pct(tick.atIndex, timeline.totalMonths)}%`;
    span.textContent = String(tick.year);
    axis.append(span);
  }
  return axis;
};

const legend = (): HTMLElement => {
  const box = document.createElement('div');
  box.id = 'phase-legend';
  for (const phase of PHASE_ORDER) {
    const item = document.createElement('span');
    const swatch = document.createElement('span');
    swatch.className = `swatch ${PHASE_CLASS[phase]}`;
    item.append(swatch, ` ${PHASE_LABELS[phase]}`);
    box.append(item);
  }
  return box;
};

/** Paint the whole strip — every row, the axis and the legend — into `container`. */
export const renderLifeStages = (container: HTMLElement, timeline: LifeStagesTimeline): void => {
  container.replaceChildren(
    ...timeline.persons.map((person) => personRow(person, timeline.totalMonths)),
    yearAxis(timeline),
    legend(),
  );
};
