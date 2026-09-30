// plan_ai.md §13 microtask 3 — **every figure a tool returns is a string that names its basis.**
// `$31,240.00 (today’s money)`, never `3124000` and never `$31,240.00`: a figure handed to an outside
// AI has lost the caption the page would have put beside it, and ADR-0001 says a basis must be
// stated wherever a figure is shown.
//
// **Today's money is the default** (`DEFAULT_MONEY_VIEW`, P2-7) and the view is a parameter. The
// conversion, the "now", the `cpi` and the formatter are all the page's own: `moneyBasis`,
// `moneyLens` and `formatCents`, so a tool's figure is the figure the table would show.
//
// **A YEAR'S TOTAL IS CONVERTED ONCE, AFTER IT IS ADDED UP (§13(b)).** Converting twelve months and
// adding them can be out by twelve cents, because rounding is not additive (`todaysDollars.ts`).
//
// **WHICH MONTH A YEAR IS CONVERTED AT: the row's own, which is `lastMonth`.** The page has no sum
// over a year. Its annual figures — the Guarantee owed "for the year", the pension minimum, the
// headlines' annualised pension — sit on one month's row and go through that row's single lens,
// `moneyLens(basis, month)`, bound once so a row cannot mix bases (P2-7). A summary row is read at
// `lastMonth` (its balances are that month's), so every figure in it goes through that month's lens:
// balances at their own month, and the year's flows beside them on the same basis.
//
// **PROSE CARRIES FIGURES TOO, and they go out labelled or not at all (`labelledProse`).** The engine
// writes some figures into its sentences as raw nominal "N cents", and some register caveats quote a
// statute's own `$` figure with no basis. A sentence an exported helper wrote is REBUILT from the
// helper's template, the way `identity.ts` rebuilds a note, with each money figure labelled at the
// sentence's own month. Any figure still unlabelled after that is replaced by `FIGURE_OMITTED`, alone,
// and the rest of the sentence goes out as it was. It is never passed through raw: `moneyGuard.ts`
// refuses the output if it is.
import { formatCents, parseAmount } from '../../../core/money.js'; // `.js` is correct in a `.ts` file — see tsconfig.json
import { PENSION_AT_RETIREMENT_NOTE_TEXT, concessionalCapExceededNoteText, investmentDistributionNoteText } from '../../../core/projection.js';
import { DEFAULT_MONEY_VIEW, MONEY_VIEW_TAG, moneyBasis, moneyLens } from '../../todaysDollars.js';
import { financialYearSummaries } from './financialYearSummary.js';
import { escaped, templateOf, toolOutput } from './identity.js';
import { DOLLAR_FIGURE, RAW_CENTS } from './moneyGuard.js';
import { nominalMark } from './figureCapture.js';
import type { Cents } from '../../../core/money.js';
import type { Household } from '../../../core/household.js';
import type { IsoMonth, Month } from '../../../core/plan.js';
import type { MoneyBasis, MoneyLens, MoneyView } from '../../todaysDollars.js';
import type { FinancialYearRow, Flows, Stocks } from './financialYearSummary.js';
import type { NoteText } from './identity.js';

/** A shape of `Cents` with every figure replaced by its labelled string. */
export type Labelled<T> = { readonly [K in keyof T]: T[K] extends number ? string : Labelled<T[K]> };

/** One nominal figure of `month`, converted by `lens` and tagged with the view it is in (and, under a capture, its raw value: `figureCapture.ts`). */
const label = (cents: Cents, lens: MoneyLens, view: MoneyView, month: IsoMonth): string => `${formatCents(lens(cents))} (${MONEY_VIEW_TAG[view]})${nominalMark(cents, month)}`;

/** One nominal figure of `month`, as a tool returns it. */
export const labelledFigure = (cents: Cents, basis: MoneyBasis, month: IsoMonth): string =>
  label(cents, moneyLens(basis, month), basis.view, month);

export const FIGURE_OMITTED = 'figure omitted: not labelled';

/**
 * How a helper writes a money figure: raw nominal cents followed by the literal " cents", or already
 * through `formatCents` (`$1,234.56`, nominal and with no basis). Either way the label replaces it.
 */
type RawFigure = 'cents' | 'formatted';
const CENTS_UNIT = ' cents';
const RAW_FIGURE_PATTERN: Readonly<Record<RawFigure, string>> = { cents: '-?\\d+', formatted: '-?\\$[\\d,]+\\.\\d\\d' };
/** The figure as the helper wrote it, back to nominal cents: the pattern admits only a whole number or a `formatCents` string. */
const centsOf = (value: string, written: RawFigure): Cents => (written === 'formatted' ? parseAmount(value) : (Number(value) as Cents));

interface MoneyTemplate {
  readonly parts: readonly string[];
  /** The template's figure positions that are money, and how each is written. */
  readonly money: ReadonlyMap<string, RawFigure>;
  readonly pattern: RegExp;
}

/**
 * An exported helper whose sentence carries a raw money figure, and which of its figures (by position
 * after the name) are money. A `'cents'` figure must be written "<figure> cents", or this throws on
 * load rather than leave a stray unit beside the label.
 */
const moneyTemplate = (text: NoteText, money: Readonly<Record<number, RawFigure>>): MoneyTemplate => {
  const parts = templateOf(text);
  const positions = new Map(Object.entries(money));
  const seen = new Set<string>();
  const pattern = parts
    .map((part, index) => {
      if (index % 2 === 0) {
        if (index > 0 && positions.get(parts[index - 1]!) === 'cents' && !part.startsWith(CENTS_UNIT)) throw new RangeError(`a money figure in a note helper is not written "<figure>${CENTS_UNIT}"`);
        return escaped(part);
      }
      const group = part === 'name' ? 'name' : `f${part}`;
      if (seen.has(group)) return `\\k<${group}>`;
      seen.add(group);
      const written = positions.get(part);
      return `(?<${group}>${written === undefined ? '[\\s\\S]*?' : RAW_FIGURE_PATTERN[written]})`;
    })
    .join('');
  return { parts, money: positions, pattern: new RegExp(`^${pattern}$`) };
};

/** Every exported helper that writes a raw money figure into a sentence a tool returns. */
const MONEY_TEMPLATES: readonly MoneyTemplate[] = [
  moneyTemplate(concessionalCapExceededNoteText, { 1: 'cents', 3: 'cents', 4: 'cents', 5: 'cents', 6: 'cents' }),
  moneyTemplate((name, distribution, payoutRate) => investmentDistributionNoteText(name, distribution, payoutRate, undefined), { 0: 'cents' }),
  moneyTemplate((name, distribution, payoutRate, frankedShare) => investmentDistributionNoteText(name, distribution, payoutRate, frankedShare), { 0: 'cents' }),
  // The credit is the walk's; the transfer balance cap beside it is the helper's own literal, a
  // published figure in no basis, and is left for `FIGURE_OMITTED`.
  moneyTemplate((name, credit, retireDay, accounts) => PENSION_AT_RETIREMENT_NOTE_TEXT['over the cap'](name, credit, retireDay, accounts, 'none'), { 0: 'formatted' }),
  moneyTemplate((name, credit, retireDay, accounts) => PENSION_AT_RETIREMENT_NOTE_TEXT['over the cap'](name, credit, retireDay, accounts, 'all'), { 0: 'formatted' }),
  moneyTemplate((name, credit, retireDay, accounts) => PENSION_AT_RETIREMENT_NOTE_TEXT['over the cap'](name, credit, retireDay, accounts, 'some'), { 0: 'formatted' }),
];

const rebuilt = (text: string, figure: (cents: Cents) => string): string => {
  for (const { parts, money, pattern } of MONEY_TEMPLATES) {
    const groups = pattern.exec(text)?.groups;
    if (groups === undefined) continue;
    return parts
      .map((part, index) => {
        if (index % 2 === 0) return index > 0 && money.get(parts[index - 1]!) === 'cents' ? part.slice(CENTS_UNIT.length) : part;
        const value = groups[part === 'name' ? 'name' : `f${part}`]!;
        const written = money.get(part);
        return written === undefined ? value : figure(centsOf(value, written));
      })
      .join('');
  }
  return text;
};

/**
 * The one bare money figure the engine writes with no unit, so the raw-cents test cannot see it:
 * Division 293's "the N cents by which SUM exceeds the N cent threshold" (`projection.ts`).
 */
const BARE_DIVISION_293_SUM = /(?<=by which )-?\d+(?= exceeds the )/g;

const tags = Object.values(MONEY_VIEW_TAG).map((tag) => ` (${tag})`);

/**
 * One sentence of engine or register prose, as a tool may return it: rebuilt with labelled figures if
 * an exported helper wrote it, and with every figure still unlabelled replaced by `FIGURE_OMITTED`.
 * `figure` labels one nominal figure at the sentence's own month.
 */
export const labelledProse = (text: string, figure: (cents: Cents) => string): string => figuresOmitted(rebuilt(text, figure));

/** `text` with every figure that carries no basis label replaced by `FIGURE_OMITTED`: for prose with no month to label at. */
export const figuresOmitted = (text: string): string =>
  text
    .replace(RAW_CENTS, `[${FIGURE_OMITTED}]`)
    .replace(BARE_DIVISION_293_SUM, `[${FIGURE_OMITTED}]`)
    .replace(DOLLAR_FIGURE, (match, offset: number, whole: string) => (tags.some((tag) => whole.startsWith(tag, offset + match.length)) ? match : `[${FIGURE_OMITTED}]`));

const labelAll = <T extends object>(figures: T, lens: MoneyLens, view: MoneyView, month: IsoMonth): Labelled<T> =>
  Object.fromEntries(
    Object.entries(figures).map(([key, value]) => [key, typeof value === 'number' ? label(value as Cents, lens, view, month) : labelAll(value as object, lens, view, month)]),
  ) as Labelled<T>;

export interface LabelledFinancialYearRow extends Omit<FinancialYearRow, 'flows' | 'stocks'> {
  readonly flows: Labelled<Flows>;
  readonly stocks: Labelled<Stocks>;
}

/** `financialYearSummaries`, with every figure converted once at the row's `lastMonth` and labelled. */
export const labelledFinancialYears = (
  household: Household,
  months: readonly Month[],
  settings: { readonly asAtDate: string; readonly economicSeries: { readonly cpi: number } },
  view: MoneyView = DEFAULT_MONEY_VIEW,
): readonly LabelledFinancialYearRow[] => {
  const basis = moneyBasis(view, settings);
  return financialYearSummaries(household, months).map((row) => {
    const lens = moneyLens(basis, row.lastMonth);
    return { ...row, flows: labelAll(row.flows, lens, view, row.lastMonth), stocks: labelAll(row.stocks, lens, view, row.lastMonth) };
  });
};

/** `labelledFinancialYears` as a tool returns it: serialised, through the identity guard (`identity.ts`). */
export const financialYearsOutput = (
  household: Household,
  months: readonly Month[],
  settings: { readonly asAtDate: string; readonly economicSeries: { readonly cpi: number } },
  view: MoneyView = DEFAULT_MONEY_VIEW,
): string => toolOutput(household, labelledFinancialYears(household, months, settings, view), view);
