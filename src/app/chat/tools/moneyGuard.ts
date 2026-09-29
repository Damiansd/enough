// plan_ai.md §12.2 kind 2 and §13 — **no unlabelled money leaves a tool.** The boundary guard beside
// the identity guard (`identity.ts`): `toolOutput` serialises every tool's result through both.
//
// It THROWS, and never cleans, on two things in the serialised text:
// - **a raw cents figure**, "<digits> cents" (or "cent"), which is the engine's own prose figure in
//   nominal cents and carries no basis at all;
// - **a `$` figure not immediately followed by the REQUESTED basis tag**, ` (today’s money)` or
//   ` (future dollars)` from `MONEY_VIEW_TAG`. A figure tagged with the other basis is refused too:
//   a what-if asked in today's money that quotes a future-dollar figure is §12.2's kind 2 breach.
//
// Making prose pass is `basisLabelled.ts`'s job (`labelledProse`), before the text reaches here.
//
// **A LEGISLATED FIGURE IS THE ONE OTHER TAG ACCEPTED, AND ONLY IN ITS OWN EXACT FORM.** A figure
// read out of `data/assumptions/` is neither today's money nor future dollars: it is the figure the
// law states for the time its record is stamped with. It goes out tagged with that stamp and nothing
// else — ` (as legislated for 2026-27)` for a financial year (the two years consecutive),
// ` (as legislated from 2026-09-20)` for an effective date, ` (as legislated for every year)` for a
// constant — which is `legislatedTag`'s output, and any other parenthesis is still refused.
//
// **A SALARY IN TODAY'S WAGES IS THE OTHER ONE, AND ALSO ONLY IN ITS OWN EXACT FORM.** A salary is
// stated in today's wages (`plan.ts`: the walk raises it with the wage index, not prices), which is
// neither basis, so it goes out as `$60,000.00 (in today’s wages)` in either view: `TODAYS_WAGES_TAG`,
// whole, and nothing looser — not "wages", not "today's wages" without "in", not a straight apostrophe.
import { MONEY_VIEW_TAG } from '../../todaysDollars.js'; // `.js` is correct in a `.ts` file — see tsconfig.json
import type { MoneyView } from '../../todaysDollars.js';
import type { FinancialYear } from '../../../data/assumptions/types.js';

/** An assumption record's stamp, as `data/assumptions/types.ts` spells it: exactly one of the three is set. */
export interface LegislatedStamp {
  readonly fy?: FinancialYear | undefined;
  readonly effective?: string | undefined;
  readonly everyYear?: true | undefined;
}

/** The tag a legislated figure carries in place of a basis: its record's own stamp. */
export const legislatedTag = ({ fy, effective }: LegislatedStamp): string =>
  fy !== undefined ? `as legislated for ${fy}` : effective !== undefined ? `as legislated from ${effective}` : 'as legislated for every year';

/** The tag a salary carries in place of a basis: it is stated in today's wages, which is neither. */
export const TODAYS_WAGES_TAG = 'in today’s wages';

const LEGISLATED_TAG = / \(as legislated (?:for (?<start>\d{4})-(?<end>\d{2})|from \d{4}-(?:0[1-9]|1[0-2])-(?:0[1-9]|[12]\d|3[01])|for every year)\)/y;

/** Whether `text` carries a legislated tag, in exactly `legislatedTag`'s form, starting at `index`. */
const legislatedTagAt = (text: string, index: number): boolean => {
  LEGISLATED_TAG.lastIndex = index;
  const groups = LEGISLATED_TAG.exec(text)?.groups;
  if (groups === undefined) return false;
  return groups['start'] === undefined || (Number(groups['start']) + 1) % 100 === Number(groups['end']);
};

export class UnlabelledMoneyError extends Error {
  override readonly name = 'UnlabelledMoneyError';
}

/** "<digits> cents" or "<digits> cent", not inside a longer number or word. */
export const RAW_CENTS = /(?<![\p{L}\p{N}.,])-?\d[\d,]*(?:\.\d+)? cents?(?![\p{L}\p{N}])/gu;

/** A `$` figure, whole: it cannot end inside a longer number, so a tag test cannot backtrack into one. */
export const DOLLAR_FIGURE = /\$\d[\d,]*(?:\.\d+)?(?!\d|[.,]\d)/g;

/** The first unlabelled figure in `text` (serialised), described; `undefined` if every figure is labelled for `view`, legislated or in today's wages. */
export const unlabelledMoneyIn = (text: string, view: MoneyView): string | undefined => {
  const raw = text.match(RAW_CENTS);
  if (raw !== null) return `a raw cents figure ("${raw[0]}")`;
  const tag = Object.hasOwn(MONEY_VIEW_TAG, view) ? ` (${MONEY_VIEW_TAG[view]})` : undefined;
  for (const match of text.matchAll(DOLLAR_FIGURE)) {
    const end = match.index + match[0].length;
    if (legislatedTagAt(text, end) || text.startsWith(` (${TODAYS_WAGES_TAG})`, end)) continue;
    if (tag === undefined || !text.startsWith(tag, end)) return `a $ figure not labelled ${tag ?? 'with a known basis'} ("${match[0]}")`;
  }
  return undefined;
};

/** `text`, a serialised tool result — or an `UnlabelledMoneyError` if a figure in it has no label, or the wrong one. */
export const moneyChecked = (text: string, view: MoneyView): string => {
  const found = unlabelledMoneyIn(text, view);
  if (found !== undefined) throw new UnlabelledMoneyError(`${found} is in a tool's output`);
  return text;
};
