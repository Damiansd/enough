// P12-1 — the lump sum bereavement payment to the survivor of a couple. Register §4.11.
//
// SS Guide 3.1.5.70, prompt notification (NEPED = 0):
//
//     LBP = 6 × (CCR − NR) + NDEP × (CCR − NR) / 14
//
// CCR is the combined couple rate that would have been payable but for the death, NR the survivor's
// new single rate, both per fortnight. Both come from `agePensionEntitlement`; this module takes
// the two figures and decides nothing about either.
//
// **NDEP is the one term this model cannot know, and it takes its least value.** It is the number
// of days from the death to the end of the entitlement period the death falls in — a fact about
// which fortnight Services Australia pays on, and a monthly walk has no payday calendar. The
// definition allows 1 (a death on the period's last day) to 14 (on its first). 1 is taken, so the
// payment is never overstated and is understated by at most 13/14 of a fortnight's difference.
import { toCents } from './money.js'; // `.js` is correct in a `.ts` file — see tsconfig.json
import type { Cents } from './money.js';
import { AGE_PENSION } from '../data/assumptions/agePension.js';

/** NDEP's least value — see the header. A declared bound, not a sourced figure. */
export const BEREAVEMENT_DAYS_TO_PERIOD_END = 1;

/**
 * The lump sum, in cents, rounded down: money arriving is never rounded up. Nil where the single
 * rate is not LESS than the couple's (SS Guide 3.1.5.30: arrears are paid instead, and the walk
 * already pays the single rate from the month of the death). Whether the couple were both
 * pensioners is the caller's question — `AGE_PENSION.bereavement.whoIsPaid`.
 */
export const bereavementLumpSum = (input: {
  readonly coupleRatePerFortnight: Cents;
  readonly singleRatePerFortnight: Cents;
}): Cents => {
  const { fortnights, daysInEntitlementPeriod } = AGE_PENSION.bereavement.lumpSumFormula.value;
  const gap = input.coupleRatePerFortnight - input.singleRatePerFortnight;
  if (gap <= 0) return toCents(0);
  return Math.floor((gap * (fortnights * daysInEntitlementPeriod + BEREAVEMENT_DAYS_TO_PERIOD_END)) / daysInEntitlementPeriod) as Cents;
};
