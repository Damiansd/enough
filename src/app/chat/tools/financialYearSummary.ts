// plan_ai.md §13 microtask 2 — **one row per Australian financial year, over a walk's `Month[]`.**
//
// No DOM, no store, no conversion. Figures stay in the engine's nominal `Cents`: §13(b) is the rule
// that a total is added up in nominal cents FIRST and converted once, so the today's-money step
// (microtask 3) is applied to these totals and never to the months inside them.
//
// **Flows are SUMMED over the year's months; stocks are READ from its last month and never summed.**
// A balance summed over twelve months is twelve balances, which is a figure that exists nowhere.
//
// **A year the walk does not cover in full is flagged `partial`**, never presented as a full year:
// a walk that opens in September has a first "year" of ten months, and the same for its last.
//
// Lines are picked out by WHOLE description — `projection.ts`'s own constants and the helpers its
// push sites write with — because a prefix would count a year-end true-up as a thirteenth accrual
// (`test/core-div293-charge.test.mjs`).
import { addCents, subCents, toCents } from '../../../core/money.js'; // `.js` is correct in a `.ts` file — see tsconfig.json
import { financialYearOfMonth, financialYearStartYear, groupByFinancialYear, toFinancialYear } from '../../../core/financialYear.js';
import {
  AGE_PENSION_LINE,
  HOUSEHOLD_SPENDING_LINE,
  MORTGAGE_INTEREST_LINE,
  MORTGAGE_PRINCIPAL_LINE,
  ONE_OFF_EXPENSE_LINE,
  SHORTFALL_LINE,
  capitalGainsTaxDescription,
  cashInterestDescription,
  division293Description,
  division293ReleaseDescription,
  division293ReleaseRefundDescription,
  division293TrueUpDescription,
  incomeTaxDescription,
  salaryDescription,
  taxTrueUpDescription,
} from '../../../core/projection.js';
import type { Cents } from '../../../core/money.js';
import type { Household } from '../../../core/household.js';
import type { IsoMonth, Month } from '../../../core/plan.js';
import type { FinancialYear } from '../../../data/assumptions/types.js';

/** What moved in a year (or a month), in nominal cents. Every member is a sum of lines or of a `Month` flow field. */
export interface Flows {
  /** Income by kind. The Age Pension is income too, and is reported on its own below. */
  readonly income: {
    readonly salary: Cents;
    readonly interestOnCash: Cents;
    /** `Month.incomeFromSuper`: Account-Based Pension, TTR and lump-sum payments out of super. */
    readonly incomeFromSuper: Cents;
  };
  readonly agePension: Cents;
  /**
   * Income tax the Household parted with: the monthly accruals, the tax on any capital gain, and
   * the year-end true-up — which can be a REFUND, so this is net and can be negative. It is on the
   * cash basis of the month the line landed in: a July true-up settles the year before but is
   * counted in the year it was paid.
   */
  readonly incomeTax: Cents;
  /**
   * Division 293 tax, net, on the same cash-month basis as `incomeTax` and never inside it — it is
   * a separate tax (`projection.ts`'s `DIVISION_293_LINE`). Counted once whoever pays: the monthly
   * cash accrual, plus the year-end settlement. For a Person who elected no release the settlement
   * is the true-up, either sign. For a Person who elected a release from super it is the pair the
   * walk writes in July: the accrual refunded (subtracted) and the settled liability paid by the
   * fund (added). Counting the release without the refund would be the tax twice.
   */
  readonly division293Tax: Cents;
  readonly spending: {
    readonly household: Cents;
    readonly oneOffExpenses: Cents;
    /** Interest and principal. Additional to `household`, which the user states excluding the loan. */
    readonly mortgageRepayments: Cents;
  };
  /**
   * `SHORTFALL_LINE`: spending the plan required and could not fund. NOT income and in no income or
   * spending total — the walk writes it as an inflow only so its cash reconciles; it is money the
   * Household does not have.
   */
  readonly unfundedShortfall: Cents;
}

/**
 * Balances at the close of the year's LAST month. `protectedAssets + assessableAssets` is total
 * wealth; `accessibleAssets` cuts across both and must never be added to either.
 */
export interface Stocks {
  readonly protectedAssets: Cents;
  readonly assessableAssets: Cents;
  readonly accessibleAssets: Cents;
}

export interface FinancialYearRow {
  readonly financialYear: FinancialYear;
  readonly firstMonth: IsoMonth;
  /** The month `stocks` are read from. */
  readonly lastMonth: IsoMonth;
  readonly monthsCovered: number;
  /** Fewer than twelve months of this year are in the walk. */
  readonly partial: boolean;
  readonly flows: Flows;
  readonly stocks: Stocks;
}

const nil = (): Cents => toCents(0);

type LineKind =
  | 'salary'
  | 'interestOnCash'
  | 'agePension'
  | 'incomeTax'
  | 'division293Tax'
  | 'household'
  | 'oneOffExpenses'
  | 'mortgageRepayments'
  | 'unfundedShortfall';

/**
 * The kinds counted positive when a line comes IN; every other kind is counted positive when it goes
 * out. `unfundedShortfall` is here for its sign only — an inflow line that is not income.
 */
const POSITIVE_WHEN_IN: ReadonlySet<LineKind> = new Set(['salary', 'interestOnCash', 'agePension', 'unfundedShortfall']);

/** The year a line landing in `month` settles: a true-up lands in July and names the year that ended in June. */
export const settledFinancialYear = (month: IsoMonth): FinancialYear => toFinancialYear(financialYearStartYear(financialYearOfMonth(month)) - 1);

/** One month's flows — the figure a year's row is the sum of. */
export const monthFlows = (household: Household, month: Month): Flows => {
  const settled = settledFinancialYear(month.month);
  const kindOf = new Map<string, LineKind>([
    [AGE_PENSION_LINE, 'agePension'],
    [HOUSEHOLD_SPENDING_LINE, 'household'],
    [ONE_OFF_EXPENSE_LINE, 'oneOffExpenses'],
    [MORTGAGE_INTEREST_LINE, 'mortgageRepayments'],
    [MORTGAGE_PRINCIPAL_LINE, 'mortgageRepayments'],
    [SHORTFALL_LINE, 'unfundedShortfall'],
    ...household.persons.flatMap((person): [string, LineKind][] => [
      [salaryDescription(person.name), 'salary'],
      [cashInterestDescription(person), 'interestOnCash'],
      [incomeTaxDescription(person.name), 'incomeTax'],
      [capitalGainsTaxDescription(person.name), 'incomeTax'],
      [taxTrueUpDescription(person.name, settled), 'incomeTax'],
      [division293Description(person.name), 'division293Tax'],
      [division293TrueUpDescription(person.name, settled), 'division293Tax'],
      [division293ReleaseRefundDescription(person.name, settled), 'division293Tax'],
      [division293ReleaseDescription(person.name, settled), 'division293Tax'],
    ]),
  ]);
  const totals: Record<LineKind, Cents> = {
    salary: nil(),
    interestOnCash: nil(),
    agePension: nil(),
    incomeTax: nil(),
    division293Tax: nil(),
    household: nil(),
    oneOffExpenses: nil(),
    mortgageRepayments: nil(),
    unfundedShortfall: nil(),
  };
  for (const line of month.lines) {
    const kind = kindOf.get(line.description);
    if (kind === undefined) continue;
    // `direction` carries the sign: a true-up or a release refund is a tax line that comes IN.
    const counted = (line.direction === 'inflow') === POSITIVE_WHEN_IN.has(kind);
    totals[kind] = counted ? addCents(totals[kind], line.amount) : subCents(totals[kind], line.amount);
  }
  return {
    income: { salary: totals.salary, interestOnCash: totals.interestOnCash, incomeFromSuper: month.incomeFromSuper },
    agePension: totals.agePension,
    incomeTax: totals.incomeTax,
    division293Tax: totals.division293Tax,
    spending: { household: totals.household, oneOffExpenses: totals.oneOffExpenses, mortgageRepayments: totals.mortgageRepayments },
    unfundedShortfall: totals.unfundedShortfall,
  };
};

const addFlows = (a: Flows, b: Flows): Flows => ({
  income: {
    salary: addCents(a.income.salary, b.income.salary),
    interestOnCash: addCents(a.income.interestOnCash, b.income.interestOnCash),
    incomeFromSuper: addCents(a.income.incomeFromSuper, b.income.incomeFromSuper),
  },
  agePension: addCents(a.agePension, b.agePension),
  incomeTax: addCents(a.incomeTax, b.incomeTax),
  division293Tax: addCents(a.division293Tax, b.division293Tax),
  spending: {
    household: addCents(a.spending.household, b.spending.household),
    oneOffExpenses: addCents(a.spending.oneOffExpenses, b.spending.oneOffExpenses),
    mortgageRepayments: addCents(a.spending.mortgageRepayments, b.spending.mortgageRepayments),
  },
  unfundedShortfall: addCents(a.unfundedShortfall, b.unfundedShortfall),
});

const stocksOf = (month: Month): Stocks => ({
  protectedAssets: month.protectedAssets,
  assessableAssets: month.assessableAssets,
  accessibleAssets: month.accessibleAssets,
});

/** One row per financial year the walk touches, earliest first. `months` is `project()`'s output, in its order. */
export const financialYearSummaries = (household: Household, months: readonly Month[]): readonly FinancialYearRow[] => {
  return groupByFinancialYear(months).map((group) => {
    const first = group[0] as Month;
    const last = group.at(-1) as Month;
    return {
      financialYear: financialYearOfMonth(first.month),
      firstMonth: first.month,
      lastMonth: last.month,
      monthsCovered: group.length,
      partial: group.length < 12,
      flows: group.map((month) => monthFlows(household, month)).reduce(addFlows),
      stocks: stocksOf(last),
    };
  });
};
