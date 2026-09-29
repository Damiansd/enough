// Money as the page SHOWS it: whole dollars, and nothing finer (user ruling, 2026-09-24 — "I don't
// need the specificity of seeing cents anywhere in this interface").
//
// **ONE ROUNDING SITE.** `roundToDollar` is the only place a displayed figure loses its cents; every
// table cell, headline, note, entry row, chart tooltip and axis tick on the page goes through it,
// directly or through `formatDollars`, so no two surfaces can round the same figure two ways.
// `test/app-display-money.test.mjs` pins the halves and sweeps `src/app/` for a second route.
//
// **Display only.** Nothing here is ever stored, summed into a stored figure or typed back: the engine
// and the plan file stay in whole cents (`core/money.ts`), and an edit box is filled by
// `centsToDollars` in `planEdits.ts`, which keeps the cents so that saving an untouched box changes
// nothing. The connector (`chat/tools/`) has its own wording and is not routed through here.
import { formatCents, parseAmount } from '../core/money.js'; // `.js` is correct in a `.ts` file — see tsconfig.json
import type { Cents } from '../core/money.js';

/**
 * Cents → the nearest whole dollar, still in cents. **A half goes AWAY FROM ZERO** — $2.50 → $3 and
 * -$2.50 → -$3 — `core/money.ts`'s own convention for money, so a loss and a gain of the same size
 * round to the same size. Never returns `-0`: a figure that rounds to nothing is `$0`, not `-$0`.
 */
export const roundToDollar = (cents: number): Cents => {
  const whole = Math.round(Math.abs(cents) / 100) * 100;
  return (cents < 0 && whole > 0 ? -whole : whole) as Cents;
};

/** `$1,291,193` — `formatCents`'s own digits and sign, rounded by `roundToDollar` and printed without the `.00`. */
export const formatDollars = (cents: number): string => formatCents(roundToDollar(cents)).slice(0, -'.00'.length);

/**
 * Every `$1,234.56` inside a sentence the ENGINE wrote (a month note) printed as `$1,235`, through
 * `formatDollars`. The engine's own text is not changed at its source — it is the engine's record —
 * only the copy this page shows.
 */
export const wholeDollarsIn = (text: string): string =>
  text.replace(/-?\$[\d,]+\.\d\d\b/g, (figure) => formatDollars(parseAmount(figure)));
