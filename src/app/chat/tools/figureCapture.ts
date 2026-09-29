// plan_ai.md §6 and §14, stage 3 — **the raw value behind a labelled figure, for the in-app chat's
// chips.** A tool labels a figure once, `$31,240.00 (today’s money)`, and a label has lost what a chip
// needs: the engine's NOMINAL cents and the month they belong to, so the page can convert them at
// display time in whichever basis its toggle is set to (ADR-0001).
//
// **THE TOOLS ARE NOT FORKED.** While `capturingFigures` runs, the two places a tool writes a
// basis-labelled figure (`basisLabelled.ts`'s `label` and `listEntries.ts`'s stated spending level)
// append the raw value straight after the label, between two invisible separators:
// `$31,240.00 (today’s money)‹U+2063›m3124000@2034-06‹U+2063›`. The tool's own logic, its guards and its output
// shape are untouched; outside a capture the mark is the empty string and every tool's output is
// byte-identical. A legislated figure and a salary in today's wages need no mark: neither converts,
// and their label already holds the whole raw value.
//
// The flag is module state, set and restored around one synchronous call. Nothing in a tool awaits.
import type { Cents } from '../../../core/money.js'; // `.js` is correct in a `.ts` file — see tsconfig.json
import type { IsoMonth } from '../../../core/plan.js';

/** U+2063 INVISIBLE SEPARATOR: no tool writes it, and no guard's pattern reads through it. */
export const RAW_MARK = '\u2063';

let capturing = false;

/** `run()`, with every basis-labelled figure it writes carrying its raw value. */
export const capturingFigures = <T>(run: () => T): T => {
  const was = capturing;
  capturing = true;
  try {
    return run();
  } finally {
    capturing = was;
  }
};

/** A figure in the engine's nominal cents of `month`. */
export const nominalMark = (cents: Cents, month: IsoMonth): string => (capturing ? `${RAW_MARK}m${cents}@${month}${RAW_MARK}` : '');

/** A figure the plan STATES in today's money, applying from `month` (the spending level, register O85). */
export const statedMark = (cents: Cents, month: IsoMonth): string => (capturing ? `${RAW_MARK}s${cents}@${month}${RAW_MARK}` : '');
