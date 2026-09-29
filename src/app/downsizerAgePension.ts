// P9-6 — a downsizer contribution as a trade-off, not a windfall: the home's exempt value becomes
// assessable super. Two walks of the scenario in view, with the entry and with it switched off.
//
// `amount` is stated in today's money (O92), so it needs no conversion. The Age Pension total is
// each month's nominal payment converted at its own month; the super difference at the last month.
import { activeScenario, scenarioEntries } from './scenarioWalks.js'; // `.js` is correct in a `.ts` file — see tsconfig.json
import type { Projector } from './scenarioWalks.js';
import { moneyBasis, moneyLens } from './todaysDollars.js';
import type { MoneyBasis } from './todaysDollars.js';
import { formatDollars } from './displayMoney.js';
import { AGE_PENSION_BEREAVEMENT_LINE, AGE_PENSION_LINE, project } from '../core/projection.js';
import type { Cents } from '../core/money.js';
import type { PlanFile } from '../core/parsePlan.js';
import type { Entry, Month } from '../core/plan.js';

export interface DownsizerAgePension {
  /** Stated, today's money. */
  readonly amount: Cents;
  /** Age Pension without the contribution less with it, summed over the plan, today's money. */
  readonly agePensionLost: Cents;
  /** Super at the last month with the contribution less without it, today's money. */
  readonly superGained: Cents;
}

const agePensionTotal = (months: readonly Month[], today: MoneyBasis): number =>
  months.reduce((sum, month) => {
    const paid = month.lines
      .filter((line) => line.description === AGE_PENSION_LINE || line.description === AGE_PENSION_BEREAVEMENT_LINE)
      .reduce((one, line) => one + line.amount, 0);
    return sum + moneyLens(today, month.month)(paid as Cents);
  }, 0);

const superAtEnd = (months: readonly Month[], today: MoneyBasis): number => {
  const last = months[months.length - 1]!;
  return moneyLens(today, last.month)(last.superBalance);
};

export const downsizerAgePension = (plan: PlanFile, entryId: string, walk: Projector = project): DownsizerAgePension => {
  const entries = scenarioEntries(plan, activeScenario(plan));
  const downsizer = entries.find((entry) => entry.id === entryId);
  if (downsizer === undefined || downsizer.type !== 'DOWNSIZER_CONTRIBUTION') {
    throw new RangeError(`"${entryId}" is not a DOWNSIZER_CONTRIBUTION entry of the scenario in view`);
  }
  if (!downsizer.enabled) throw new RangeError('this downsizer contribution is switched off in this scenario — switch it on to see what it costs');

  const today = moneyBasis('todaysDollars', plan.settings);
  const withIt = walk(plan.settings, plan.household, entries);
  const withoutIt = walk(
    plan.settings,
    plan.household,
    entries.map((entry): Entry => (entry.id === downsizer.id ? { ...downsizer, enabled: false } : entry)),
  );
  return Object.freeze({
    amount: downsizer.params.amount,
    agePensionLost: (agePensionTotal(withoutIt, today) - agePensionTotal(withIt, today)) as Cents,
    superGained: (superAtEnd(withIt, today) - superAtEnd(withoutIt, today)) as Cents,
  });
};

const signed = (cents: number, positive: string, negative: string): string =>
  `${formatDollars(Math.abs(cents))} ${cents < 0 ? negative : positive}`;

export const downsizerAgePensionSentence = (cost: DownsizerAgePension): string =>
  `Moving ${formatDollars(cost.amount)} into super: ${signed(cost.agePensionLost, 'less', 'more')} Age Pension in total over the plan,` +
  ` and ${signed(cost.superGained, 'more', 'less')} in super at the end.`;
