// P14-10 — the deposit headline that replaced the RAD solver (TODO.md P14-10, gate 2026-09-25: end
// wealth and months short both rise with every extra dollar of deposit, so the answer is always an
// end of the range). Two ends: nothing as a deposit, and the most the Waterfall can fund.
//
// `radPaidAsLumpSum` is stated in today's money (O92), so the deposit figure needs no conversion;
// the end wealth is the walk's nominal figure and is converted at its own month.
import { activeScenario, scenarioEntries } from './scenarioWalks.js'; // `.js` is correct in a `.ts` file — see tsconfig.json
import type { Projector } from './scenarioWalks.js';
import { moneyBasis, moneyLens } from './todaysDollars.js';
import { formatDollars } from './displayMoney.js';
import { project, RadPaymentUnfundedError } from '../core/projection.js';
import { shortfallAge } from '../core/outcomes.js';
import { toCents } from '../core/money.js';
import type { Cents } from '../core/money.js';
import type { PlanFile } from '../core/parsePlan.js';
import type { Entry, Month } from '../core/plan.js';

export interface RadDepositEnd {
  /** Stated, today's money. */
  readonly radPaidAsLumpSum: Cents;
  /** Total wealth at the last month's close, nominal — the table's own "Total wealth" sum. */
  readonly endWealth: Cents;
  readonly endMonth: string;
  readonly monthsShort: number;
}

export interface RadDepositEnds {
  readonly least: RadDepositEnd;
  readonly most: RadDepositEnd;
}

const STEP = toCents(1_000);

const endOf = (radPaidAsLumpSum: Cents, months: readonly Month[], household: PlanFile['household']): RadDepositEnd => {
  const last = months[months.length - 1]!;
  return Object.freeze({
    radPaidAsLumpSum,
    endWealth: (last.closingBalance + last.superBalance + last.closingNonSuperPortfolio + (last.radHeld ?? 0) - (last.heasDebt ?? 0)) as Cents,
    endMonth: last.month,
    monthsShort: shortfallAge(months, household).monthsShort,
  });
};

export const radDepositEnds = (plan: PlanFile, careEntryId: string, walk: Projector = project): RadDepositEnds => {
  const entries = scenarioEntries(plan, activeScenario(plan));
  const care = entries.find((entry) => entry.id === careEntryId);
  if (care === undefined || care.type !== 'ENTER_CARE') {
    throw new RangeError(`"${careEntryId}" is not an ENTER_CARE entry of the scenario in view`);
  }
  if (!care.enabled) throw new RangeError('this move into care is switched off in this scenario — switch it on to compare deposits');

  // null: the Waterfall cannot fund this deposit. Any other refusal is not ours and propagates.
  const tryPaying = (radPaidAsLumpSum: Cents): RadDepositEnd | null => {
    const withDeposit = entries.map((entry): Entry =>
      entry.id === care.id ? { ...care, params: { ...care.params, radPaidAsLumpSum } } : entry);
    try {
      return endOf(radPaidAsLumpSum, walk(plan.settings, plan.household, withDeposit), plan.household);
    } catch (error) {
      if (error instanceof RadPaymentUnfundedError) return null;
      throw error;
    }
  };

  const least = tryPaying(toCents(0))!;
  let most = tryPaying(care.params.radPrice);
  if (most === null) {
    // The error's "could fund only" figure is message text and nominal, so bisect in $1,000 steps
    // of the stated deposit: lo is known fundable, hi (capped at radPrice) is known not.
    let lo = 0;
    let hi = Math.ceil(care.params.radPrice / STEP);
    most = least;
    while (hi - lo > 1) {
      const mid = Math.floor((lo + hi) / 2);
      const tried = tryPaying((mid * STEP) as Cents);
      if (tried === null) hi = mid;
      else {
        lo = mid;
        most = tried;
      }
    }
  }
  return Object.freeze({ least, most });
};

const monthsWord = (count: number): string => `${count} month${count === 1 ? '' : 's'}`;

/** The two sentences, in today's money whatever view the page is in. */
export const radDepositSentences = (ends: RadDepositEnds, settings: PlanFile['settings']): readonly [string, string] => {
  const today = moneyBasis('todaysDollars', settings);
  const atEnd = (end: RadDepositEnd): string => formatDollars(moneyLens(today, end.endMonth)(end.endWealth));
  return [
    `Paying the most you can as a deposit (${formatDollars(ends.most.radPaidAsLumpSum)}) leaves ${atEnd(ends.most)} at the end, with ${monthsWord(ends.most.monthsShort)} short of cash.`,
    `Paying it all daily leaves ${atEnd(ends.least)}, with ${monthsWord(ends.least.monthsShort)} short.`,
  ];
};
