// plan_ai.md §6 and §14, stage 3 — **the model's prose, with every marker replaced by the engine's
// value and every figure the model wrote itself struck out.** Pure: a string and a store in, segments
// and the markup for them out. No DOM; the panel (stage 5) puts `html` on the page.
//
// **A CHIP SHOWS THE ENGINE'S VALUE AND NOTHING THE MODEL WROTE.** The marker's id and path are the
// only part of it that is read, and only to look the figure up (`figureStore.ts`). The value is the
// stored RAW figure converted NOW, in the basis the page's toggle is set to (ADR-0001, plan_ai.md
// §2 rule 7), so flipping the toggle re-renders the same reply in the other money without asking
// the model again. In whole dollars: "no cents anywhere in this interface" (user ruling 2026-09-24).
//
// **A MARKER THAT RESOLVES TO NOTHING IS A RED "no such figure" CHIP, NEVER TEXT.** Not the path,
// not a guess, not the nearest figure. Anything written between `⟦` and `⟧` is a marker attempt, so
// a malformed one gets the same red chip.
//
// **THE GUARD RUNS ON WHAT IS LEFT** (`guard.ts`), with D3's source text taken from the user's
// question and the text of every tool result the model was given, the figures it was shown left out.
import { MONEY_VIEW_TAG } from '../todaysDollars.js'; // `.js` is correct in a `.ts` file — see tsconfig.json
import { numberTokens, struckSpans } from './guard.js';
import { markerOf, shownFigure } from './figureStore.js';
import type { MoneyBasis } from '../todaysDollars.js';
import type { FigureLink, FigureStore } from './figureStore.js';
import type { StruckSpan } from './guard.js';

export type ReplySegment =
  | { readonly kind: 'text'; readonly text: string }
  | { readonly kind: 'chip'; readonly marker: string; readonly dollars: string; readonly tag: string; readonly href?: string }
  | { readonly kind: 'noSuchFigure' }
  | { readonly kind: 'struck'; readonly text: string; readonly reason: StruckSpan['reason'] };

export interface RenderedReply {
  readonly segments: readonly ReplySegment[];
  /** Figures the model wrote itself: the golden suite's count, which must be zero. */
  readonly struck: number;
  /** Markers that named no figure. */
  readonly unresolved: number;
  readonly html: string;
}

export const NO_SUCH_FIGURE = 'no such figure';
export const NOT_WORKED_OUT_BY_ENOUGH = 'not worked out by enough';

/** Anything between the brackets is a marker attempt; only `t<n>:<path>` can resolve. */
const MARKER = /⟦([^⟦⟧]*)⟧/g;
const MARKER_BODY = /^(t\d+):(.+)$/s;

/** A figure the model was shown, marker and label together: left out of D3's source text. */
const SHOWN_FIGURE = /⟦[^⟦⟧]*⟧ -?\$[\d,]+ \([^()]*\)/g;

/**
 * Where a chip opens the month table. `monthAnchors.ts` gives each month row `id="month-YYYY-MM"`
 * and each line `id="month-YYYY-MM-line-N"`, N counted from 0 as the engine counts `Month.lines`.
 */
export const monthTableHref = (link: FigureLink): string => (link.line === undefined ? `#month-${link.month}` : `#month-${link.month}-line-${link.line}`);

/** Every number the model may repeat without a chip (D3): the question's, and the tool results' less the figures shown in them. */
const allowedNumbers = (question: string, store: FigureStore): ReadonlySet<string> =>
  numberTokens([question, ...store.results().map(({ modelText }) => modelText.replace(SHOWN_FIGURE, ' '))].join('\n'));

const escaped = (text: string): string => text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const segmentHtml = (segment: ReplySegment): string => {
  switch (segment.kind) {
    case 'text':
      return escaped(segment.text);
    case 'chip': {
      const body = `${escaped(segment.dollars)} <span class="figure-basis">(${escaped(segment.tag)})</span>`;
      const attributes = `class="figure-chip" data-marker="${escaped(segment.marker)}"`;
      return segment.href === undefined ? `<span ${attributes}>${body}</span>` : `<a ${attributes} href="${escaped(segment.href)}">${body}</a>`;
    }
    case 'noSuchFigure':
      return `<span class="figure-chip no-such-figure">${NO_SUCH_FIGURE}</span>`;
    case 'struck':
      return `<del class="not-from-engine" title="${NOT_WORKED_OUT_BY_ENOUGH}">${escaped(segment.text)}</del> <span class="not-from-engine-label">(${NOT_WORKED_OUT_BY_ENOUGH})</span>`;
  }
};

const segmentText = (segment: ReplySegment): string => {
  switch (segment.kind) {
    case 'text':
      return segment.text;
    case 'chip':
      return `${segment.dollars} (${segment.tag})`;
    case 'noSuchFigure':
      return `[${NO_SUCH_FIGURE}]`;
    case 'struck':
      return `[${NOT_WORKED_OUT_BY_ENOUGH}: ${segment.text}]`;
  }
};

/** A rendered reply as plain text, each chip its shown value and basis: what an accepted suggestion's `origin` records (P15-13). */
export const replyText = (reply: RenderedReply): string => reply.segments.map(segmentText).join('');

/** U+FFFC stands in for a chip while the guard reads: not a letter, a digit or a space. */
const CHIP_MASK = '\uFFFC';

/** One marker's chip: the engine's value in `basis`, or the red "no such figure". */
const chipOf = (body: string, store: FigureStore, basis: MoneyBasis): ReplySegment => {
  const parts = MARKER_BODY.exec(body);
  const found = parts === null ? undefined : store.resolve(parts[1]!, parts[2]!);
  if (found === undefined) return { kind: 'noSuchFigure' };
  const shown = shownFigure(found.raw, basis);
  const marker = markerOf(parts![1]!, parts![2]!);
  return found.link === undefined ? { kind: 'chip', marker, ...shown } : { kind: 'chip', marker, ...shown, href: monthTableHref(found.link) };
};

/** One figure `store` holds, as its chip's markup in `basis`: the review queue's trial-walk effect uses it, with no prose around it. */
export const chipHtml = (id: string, path: string, store: FigureStore, basis: MoneyBasis): string => segmentHtml(chipOf(`${id}:${path}`, store, basis));

/** The model's reply to `question`, rendered in `basis` against the figures `store` holds. */
export const renderReply = (prose: string, question: string, store: FigureStore, basis: MoneyBasis): RenderedReply => {
  if (!Object.hasOwn(MONEY_VIEW_TAG, basis.view)) throw new RangeError('a reply is rendered in a known basis');
  const markers = [...prose.matchAll(MARKER)];
  // The guard reads the prose with every marker blanked out, so no pattern reads into or across a chip.
  const masked = markers.reduce((text, match) => text.slice(0, match.index) + CHIP_MASK.repeat(match[0].length) + text.slice(match.index + match[0].length), prose);
  const struck = struckSpans(masked, allowedNumbers(question, store));
  const pieces: { readonly start: number; readonly end: number; readonly segment: ReplySegment }[] = [
    ...markers.map((match) => ({ start: match.index, end: match.index + match[0].length, segment: chipOf(match[1]!, store, basis) })),
    ...struck.map(({ start, end, reason }) => ({ start, end, segment: { kind: 'struck' as const, text: prose.slice(start, end), reason } })),
  ].sort((a, b) => a.start - b.start);
  const segments: ReplySegment[] = [];
  let at = 0;
  for (const { start, end, segment } of pieces) {
    if (start > at) segments.push({ kind: 'text', text: prose.slice(at, start) });
    segments.push(segment);
    at = end;
  }
  if (at < prose.length) segments.push({ kind: 'text', text: prose.slice(at) });
  return {
    segments,
    struck: segments.filter(({ kind }) => kind === 'struck').length,
    unresolved: segments.filter(({ kind }) => kind === 'noSuchFigure').length,
    html: segments.map(segmentHtml).join(''),
  };
};
