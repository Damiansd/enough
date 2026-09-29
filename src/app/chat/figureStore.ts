// plan_ai.md §6 and §14, stage 3 — **every tool result in a conversation, stored under an id, with
// each money figure in it addressable by a path.** The in-app chat exists so that the model never
// writes a dollar figure itself (ADR-0011's 2026-09-24 note): it writes a MARKER, and the page puts
// the engine's own value in its place (`chips.ts`).
//
// **THE MARKER GRAMMAR.** `⟦<id>:<path>⟧`, where `<id>` is `t1`, `t2`, … in the order the results
// were recorded in this conversation, and `<path>` names one figure in that result:
//   - object keys joined by `.` (a key that is not an identifier is written `["key"]`);
//   - an array element as `[index]`, except an element that carries a `financialYear`, which is
//     named by it: `fy2034-35`;
//   - a figure inside a sentence (a note, an entry's wording) as the sentence's path, `#`, and the
//     figure's place in it counted from 1.
// So `⟦t2:difference.differenceByYear.fy2034-35.agePension⟧` or `⟦t3:lines[4].amount⟧`. The model
// never builds a path: it copies the one it was shown.
//
// **WHAT THE MODEL SEES** is the tool's own JSON with each figure replaced by its marker and its
// value, in whole dollars and labelled, in the basis the tool was asked for:
// `⟦t2:…agePension⟧ $31,240 (today’s money)`. It reasons with the value and writes the marker.
//
// **WHAT IS STORED** is the RAW value, never the label: the engine's nominal cents and their month
// (`figureCapture.ts`), a spending level stated in today's money and the month it applies from, a
// salary in today's wages, or a legislated figure with its stamp. `chips.ts` converts at display
// time in the page's basis.
//
// **Every figure the model is shown has a marker, or the result is refused.** A basis-labelled
// figure with no raw value, or a `$` left over after the markers are written, is a fault in this
// build and throws: a figure the model could read but not cite is one it would write out itself.
import { parseAmount } from '../../core/money.js'; // `.js` is correct in a `.ts` file — see tsconfig.json
import { formatDollars } from '../displayMoney.js';
import { MONEY_VIEW_TAG, moneyBasis, moneyLens, statedInTodaysMoneyLens } from '../todaysDollars.js';
import { capturingFigures, RAW_MARK } from './tools/figureCapture.js';
import { TODAYS_WAGES_TAG } from './tools/moneyGuard.js';
import type { Cents } from '../../core/money.js';
import type { IsoMonth } from '../../core/plan.js';
import type { MoneyBasis, MoneyView } from '../todaysDollars.js';

/** One figure's raw value, as the engine or the register holds it. */
export type RawFigure =
  | { readonly kind: 'nominal'; readonly cents: Cents; readonly month: IsoMonth }
  | { readonly kind: 'statedTodaysMoney'; readonly cents: Cents; readonly month: IsoMonth }
  | { readonly kind: 'todaysWages'; readonly cents: Cents }
  | { readonly kind: 'legislated'; readonly cents: Cents; readonly tag: string };

/** Where a chip points in the month table: a month, and the line when the figure is one. */
export interface FigureLink {
  readonly month: IsoMonth;
  readonly line?: number;
}

export interface StoredFigure {
  readonly raw: RawFigure;
  readonly link?: FigureLink;
}

export interface StoredResult {
  readonly id: string;
  readonly tool: string;
  /** Exactly the text the model was given for this result. */
  readonly modelText: string;
  readonly figures: ReadonlyMap<string, StoredFigure>;
}

/** A figure as it is shown: whole dollars, and the label that says which money it is. */
export interface ShownFigure {
  readonly dollars: string;
  readonly tag: string;
}

export class UnaddressableFigureError extends Error {
  override readonly name = 'UnaddressableFigureError';
}

/**
 * **Whole dollars, no cents anywhere in this interface (user ruling, 2026-09-24),** rounded by the
 * page's own `roundToDollar` (`displayMoney.ts`), so a chip and the month table cannot round one
 * figure two ways.
 */
export const wholeDollars = (cents: number): string => formatDollars(cents);

/** `raw` as it is shown in `basis`: a nominal figure through the page's own lens, a stated one the other way, the rest as they are. */
export const shownFigure = (raw: RawFigure, basis: MoneyBasis): ShownFigure => {
  switch (raw.kind) {
    case 'nominal':
      return { dollars: wholeDollars(moneyLens(basis, raw.month)(raw.cents)), tag: MONEY_VIEW_TAG[basis.view] };
    case 'statedTodaysMoney':
      return { dollars: wholeDollars(statedInTodaysMoneyLens(basis, raw.month)(raw.cents)), tag: MONEY_VIEW_TAG[basis.view] };
    case 'todaysWages':
      return { dollars: wholeDollars(raw.cents), tag: TODAYS_WAGES_TAG };
    case 'legislated':
      return { dollars: wholeDollars(raw.cents), tag: raw.tag };
  }
};

/** Every labelled figure a tool writes, with its raw mark when it carries one. */
const LABELLED = new RegExp(`(-?\\$[\\d,]+\\.\\d\\d) \\(([^()]*)\\)(?:${RAW_MARK}([ms])(-?\\d+)@(\\d{4}-\\d{2})${RAW_MARK})?`, 'g');

const VIEW_OF_TAG = new Map(Object.entries(MONEY_VIEW_TAG).map(([view, tag]) => [tag, view as MoneyView]));

/** The raw value and the model's basis of one labelled figure, or `undefined` if it carries neither. */
const rawOf = (figure: string, tag: string, kind: string | undefined, cents: string | undefined, month: string | undefined): { raw: RawFigure; view?: MoneyView } | undefined => {
  const view = VIEW_OF_TAG.get(tag);
  if (view !== undefined) {
    if (kind === undefined) return undefined;
    return { raw: { kind: kind === 'm' ? 'nominal' : 'statedTodaysMoney', cents: Number(cents) as Cents, month: month as IsoMonth }, view };
  }
  if (kind !== undefined) return undefined;
  if (tag === TODAYS_WAGES_TAG) return { raw: { kind: 'todaysWages', cents: parseAmount(figure) } };
  if (tag.startsWith('as legislated ')) return { raw: { kind: 'legislated', cents: parseAmount(figure), tag } };
  return undefined;
};

const IDENTIFIER = /^[A-Za-z_][A-Za-z0-9_]*$/;
const keySegment = (key: string): string => (IDENTIFIER.test(key) ? `.${key}` : `[${JSON.stringify(key)}]`);
const joined = (path: string, segment: string): string => (path === '' ? segment.replace(/^\./, '') : `${path}${segment}`);

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value);

/** The segment for each element of `array`: its `financialYear` where every element has a distinct one, else its index. */
const elementSegments = (array: readonly unknown[]): readonly string[] => {
  const years = array.map((each) => (isRecord(each) && typeof each['financialYear'] === 'string' ? each['financialYear'] : undefined));
  const named = years.every((year) => year !== undefined) && new Set(years).size === years.length;
  return array.map((_, index) => (named ? `.fy${years[index]}` : `[${index}]`));
};

/** A marker as it is written. */
export const markerOf = (id: string, path: string): string => `⟦${id}:${path}⟧`;

/** getMonth's own lines: a figure under `lines[i]` is that line of that month. */
const LINE_PATH = /^lines\[(\d+)\]/;

export interface FigureStore {
  /**
   * Run one tool (`run` returns its serialised result) with its figures captured, store it under the
   * next id, and return the text the model is given for it.
   */
  readonly record: (tool: string, run: () => string) => string;
  /** The figure a marker names, or `undefined` if there is none. */
  readonly resolve: (id: string, path: string) => StoredFigure | undefined;
  readonly results: () => readonly StoredResult[];
}

/** A store for one conversation. Ids run `t1`, `t2`, … and are never reused within it. */
export const createFigureStore = (settings: { readonly asAtDate: string; readonly economicSeries: { readonly cpi: number } }): FigureStore => {
  const results: StoredResult[] = [];

  const record = (tool: string, run: () => string): string => {
    const id = `t${results.length + 1}`;
    const parsed: unknown = JSON.parse(capturingFigures(run));
    const figures = new Map<string, StoredFigure>();
    const monthOfResult = tool === 'getMonth' && isRecord(parsed) && typeof parsed['month'] === 'string' ? (parsed['month'] as IsoMonth) : undefined;

    const linkOf = (raw: RawFigure, path: string): FigureLink | undefined => {
      if (raw.kind !== 'nominal' && raw.kind !== 'statedTodaysMoney') return undefined;
      const line = monthOfResult === undefined ? undefined : LINE_PATH.exec(path)?.[1];
      return line === undefined ? { month: raw.month } : { month: raw.month, line: Number(line) };
    };

    const figuresIn = (text: string, path: string): string => {
      const count = [...text.matchAll(LABELLED)].length;
      let place = 0;
      return text.replace(LABELLED, (whole, figure: string, tag: string, kind?: string, cents?: string, month?: string) => {
        place += 1;
        const found = rawOf(figure, tag, kind, cents, month);
        if (found === undefined) throw new UnaddressableFigureError(`a figure in ${tool}'s result at ${path} carries no raw value (${whole.length} characters)`);
        // A leaf that is nothing but one figure is named by its own path; a figure in a sentence, by its place.
        const figurePath = count === 1 && whole === text ? path : `${path}#${place}`;
        const link = linkOf(found.raw, figurePath);
        figures.set(figurePath, link === undefined ? { raw: found.raw } : { raw: found.raw, link });
        const shown = shownFigure(found.raw, found.view === undefined ? moneyBasis('futureDollars', settings) : moneyBasis(found.view, settings));
        return `${markerOf(id, figurePath)} ${shown.dollars} (${shown.tag})`;
      });
    };

    const walk = (value: unknown, path: string): unknown => {
      if (typeof value === 'string') return figuresIn(value, path);
      if (Array.isArray(value)) {
        const segments = elementSegments(value);
        return value.map((each, index) => walk(each, joined(path, segments[index]!)));
      }
      if (isRecord(value)) return Object.fromEntries(Object.entries(value).map(([key, child]) => [key, walk(child, joined(path, keySegment(key)))]));
      return value;
    };

    const modelText = JSON.stringify(walk(parsed, ''));
    // Every `$` the model is shown sits straight after its marker; anything else is a figure it could not cite.
    const loose = modelText.replace(/⟦[^⟦⟧]*⟧ -?\$/g, '').match(/\$\d|\u2063/);
    if (loose !== null) throw new UnaddressableFigureError(`${tool}'s result would show the model a figure with no marker`);
    results.push({ id, tool, modelText, figures });
    return modelText;
  };

  const resolve = (id: string, path: string): StoredFigure | undefined => results.find((result) => result.id === id)?.figures.get(path);

  return { record, resolve, results: () => results };
};
