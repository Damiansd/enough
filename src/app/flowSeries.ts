// the income/spend chart design gate (2026-09-21, GO WITH CONDITIONS) — the second chart: "Money coming in and going
// out, by financial year". `incomeHeadline.ts`'s own header says why the wealth-chart-shaped income
// stack is "very nearly uninformative" in THIS engine (the Waterfall hugs the spending target by
// construction) and calls a proper income/spend chart "a separate, later piece of work". This is
// that work, and aged-care costs — today a near-invisible dashed overlay on the wealth chart
// (`monthsToSeries.ts`'s `careCost`) — get a proper home here instead.
//
// No DOM, no Chart.js, no canvas: plain numbers and plain frozen objects, exactly as
// `monthsToSeries.ts` and `financialYearRows.ts` are, so this is testable with `node:test` and no
// browser. Every claim below is an assertion in `test/app-flow-series.test.mjs`.
//
// **THE FOUR BINDING CONDITIONS OF THE GATE, AND HOW THIS FILE KEEPS EACH ONE:**
//
//   1. **GROUP BY LINE DESCRIPTION, NEVER BY WATERFALL LIMB.** The offset limb emits no
//      `MonthLine` at all — a limb-grouped chart would have to invent a line for it or silently
//      drop the money it moved — and a limb-grouped chart hides the Age Pension entirely (the
//      Waterfall never draws on it; it simply arrives). `classifyCashLine` below reads
//      `MonthLine.description` alone and never touches a `WaterfallLimbNote`.
//
//   2. **THE CLASSIFIER IS TOTAL AND THROWS ON AN UNKNOWN CASH-LINE DESCRIPTION, AND IT IS NEVER A
//      PREFIX OR A REGEX.** `test/core-div293-charge.test.mjs` already sweeps every file under
//      `src/` for `.description.startsWith`/`.includes`/`.slice`/… and fails the build the day one
//      appears — the trap it exists to catch (`DIVISION_293_TRUE_UP_LINE` literally starts with
//      `DIVISION_293_LINE`) is exactly the trap a flow chart grouped by prefix would fall into a
//      second time, on a different pair of lines. So classification here is EXACT-MATCH ONLY, via
//      a `Map<string, FlowGroupKey>` built once from every exported `*_LINE` constant
//      `projection.ts` emits with `effect: 'cash'` — bare where a line's description never carries a
//      Person's name, and reconstructed with `projection.ts`'s OWN description-building functions
//      (`salaryDescription`, `cashInterestDescription`, …) applied to every name and financial year
//      the walk in hand actually holds, where it does. A description this walk produced that is not
//      one of those exact strings is not a line this table has seen before, and `classifyCashLine`
//      throws rather than guessing — see `buildClassificationIndex` and the table beneath it for
//      every one of the 40 cash-effect line families and the 10 wealth-only ones left out on purpose.
//
//   3. **THE SHORTFALL IS NEVER A BAND AND NEVER SUMMED INTO INCOME.** `SHORTFALL_LINE` classifies
//      to nothing in `FlowGroupKey` — it is not a member of the union at all, so a group total can
//      never silently absorb it — and `flowSeries` reports it as its own `shortfall` array, drawn
//      separately by the chart layer and labelled "money this plan does not have" (`chartConfig.ts`'s
//      `careCost` overlay is the precedent for a figure that is real money and is still not a share
//      of anything it sits beside).
//
//   4. **AN FY'S SHORTFALL IS THE SUM OF ITS TWELVE MONTHLY SHORTFALLS, NEVER
//      `max(0, spend − income)`.** The Waterfall writes `SHORTFALL_LINE` for the actual months it
//      could not fund (`projection.ts`, twice — the ordinary sweep and the CGT-outran-the-sale
//      sweep), so a year with one very short month and eleven fully-funded ones reports that one
//      month's shortfall in full, even though the year's income may exceed its spending overall. A
//      recomputed `max(0, annual spend − annual income)` would wash a bad March out with a good
//      June; summing the engine's own per-month figures cannot.
//
// **PARTIAL FINANCIAL YEARS ARE LABELLED, NEVER DRAWN SHORT.** `FlowYear.partial` and `FlowYear.label`
// are `financialYearRows.ts`'s own `yearLabel`, exported from there for this file to reuse rather
// than reworded a second time — the first and last FY of a walk beginning mid-year or ending mid-year
// say so in words (`2026-27 (from Sep)`), and the chart layer is expected to caption the bar rather
// than let a 3-month bar sit beside a 12-month one and read as a collapse in income.
//
// **WHY THIS TAKES `basis` AND CONVERTS INSIDE, UNLIKE `monthsToSeries.ts`.** A wealth-chart point is
// ONE month, so `chartConfig.ts` converts it later, per point, against that one month's own price
// level. A flow-chart bar is TWELVE months added together, and `financialYearRows.ts` already
// settled how a financial year is allowed to add: "each month's flow goes through ITS OWN month's
// lens, in cents, and the year is the sum of those cents, rounded once" — converting AFTER summing
// would price every month of the year at the LAST month's level instead. So `flowSeries`, like
// `financialYearRows`, takes `basis` and does the summing itself; there is no correct way to defer
// it to a later, per-bar-only layer the way the wealth chart defers its per-point conversion.
//
// **ASSET MOVES ARE NEVER INCOME AND NEVER SPENDING.** A RAD lump sum is a deposit into a refundable
// asset, not a cost (`chartConfig.ts`'s own `AGED_CARE_COST_LINES` doc says so already); a home sale's
// proceeds are the household converting one form of wealth into another, not a wage or a pension. Both
// get their OWN groups (`radDeposit`, `saleProceeds`) rather than folding into `spending` or any
// inflow group, on the header's condition 3's own words: "asset moves … must not be read as income
// or spending".
import { financialYearOfMonth, groupByFinancialYear } from '../core/financialYear.js'; // `.js` is correct in a `.ts` file — see tsconfig.json
import { mulCents } from '../core/money.js';
import {
  AGE_PENSION_BEREAVEMENT_LINE,
  AGE_PENSION_LINE,
  AGED_CARE_BASIC_FEE_LINE,
  AGED_CARE_DAP_LINE,
  AGED_CARE_HOTELLING_LINE,
  AGED_CARE_NCCC_LINE,
  AGED_CARE_RAD_PAYMENT_LINE,
  AGED_CARE_RAD_REFUND_LINE,
  HEAS_ADVANCE_LINE,
  HEAS_DRAW_LINE,
  HOME_PURCHASE_COSTS_LINE,
  HOME_PURCHASE_PRICE_LINE,
  HOME_SALE_HEAS_REPAID_LINE,
  HOME_SALE_MORTGAGE_REPAID_LINE,
  HOME_SALE_PROCEEDS_LINE,
  HOME_SALE_SELLING_COSTS_LINE,
  HOUSEHOLD_SPENDING_LINE,
  MORTGAGE_INTEREST_LINE,
  MORTGAGE_PRINCIPAL_LINE,
  ONE_OFF_EXPENSE_LINE,
  PENSION_MINIMUM_LINE,
  RENT_OUT_HOME_AGENT_FEES_LINE,
  RENT_OUT_HOME_INSURANCE_LINE,
  RENT_OUT_HOME_RATES_LINE,
  RENT_OUT_HOME_RENT_LINE,
  RENT_OUT_HOME_REPAIRS_LINE,
  SHORTFALL_LINE,
  SUPER_DEATH_BENEFIT_LINE,
  SUPER_LUMP_SUM_LINE,
  TTR_PAYMENT_LINE,
  capitalGainsTaxDescription,
  cashInterestDescription,
  division293Description,
  division293ReleaseRefundDescription,
  division293TrueUpDescription,
  incomeTaxDescription,
  portfolioBrokerageDescription,
  portfolioPurchaseDescription,
  portfolioSaleDescription,
  salaryDescription,
  spouseContributionDescription,
  downsizerContributionDescription,
  superPaymentDescription,
  taxTrueUpDescription,
} from '../core/projection.js';
import { yearLabel } from './financialYearRows.js';
import { moneyLens } from './todaysDollars.js';
import type { MoneyBasis } from './todaysDollars.js';
import type { Cents } from '../core/money.js';
import type { Household } from '../core/household.js';
import type { Month, MonthLine } from '../core/plan.js';
import type { FinancialYear } from '../data/assumptions/types.js';

/**
 * Every group a cash line can land in — 17 of them, none named `'shortfall'`: the shortfall is
 * reported on `FlowSeries` directly and can never be a member of this union, which is what keeps
 * condition 3 a fact the type system holds rather than a convention a caller could get wrong.
 */
export type FlowGroupKey =
  | 'pay'
  | 'agePension'
  | 'superIncome'
  | 'investmentIncome'
  | 'heas'
  | 'radRefund'
  | 'saleProceeds'
  | 'rentalIncome'
  | 'portfolioMove'
  | 'spending'
  | 'mortgage'
  | 'tax'
  | 'agedCareCosts'
  | 'radDeposit'
  | 'homePurchase'
  | 'spouseContribution'
  | 'downsizerContribution';

/** Which side of the bar a group is drawn on, BY CONVENTION — not read off any one month's `direction`. */
export type FlowSide = 'inflow' | 'outflow';

/**
 * **THE TABLE — every group's home side, decided once.** A group whose family carries both
 * directions (a tax refund, a home sale's selling costs) is still ONE side: its per-FY figure is the
 * NET of every line in the family for that year (`netFor` below), so a refund year shows as a small
 * dip toward zero on the `'outflow'` side rather than a bar that jumps to the other axis.
 *
 * **`rentalIncome` (P14-13/RENT_OUT_HOME) follows `saleProceeds`'s own precedent rather than getting
 * a second, `'outflow'`-side group for its four annual costs.** A reader of a real-estate-flavoured
 * bar chart expects "rental income" to already mean net of its own running costs — the way a tax
 * return's own "net rental income" line does — so `RENT_OUT_HOME_RATES_LINE`/`..._INSURANCE_LINE`/
 * `..._AGENT_FEES_LINE`/`..._REPAIRS_LINE` are classified into the SAME group as
 * `RENT_OUT_HOME_RENT_LINE` below and net against it for the year, exactly as the home sale's selling
 * costs/mortgage-repaid/HEAS-repaid lines already net against `HOME_SALE_PROCEEDS_LINE`. A year with
 * a very costly repair still shows as a small dip toward zero on the `'inflow'` side, never a jump to
 * `'outflow'`.
 */
export const FLOW_GROUP_SIDE: Readonly<Record<FlowGroupKey, FlowSide>> = Object.freeze({
  pay: 'inflow',
  agePension: 'inflow',
  superIncome: 'inflow',
  investmentIncome: 'inflow',
  heas: 'inflow',
  radRefund: 'inflow',
  saleProceeds: 'inflow',
  rentalIncome: 'inflow',
  portfolioMove: 'outflow',
  spending: 'outflow',
  mortgage: 'outflow',
  tax: 'outflow',
  agedCareCosts: 'outflow',
  radDeposit: 'outflow',
  homePurchase: 'outflow',
  spouseContribution: 'outflow',
  downsizerContribution: 'outflow',
});

export const FLOW_GROUP_LABELS: Readonly<Record<FlowGroupKey, string>> = Object.freeze({
  pay: 'Pay, after tax',
  agePension: 'Age Pension',
  superIncome: 'Super pension and drawdowns',
  investmentIncome: 'Investment income',
  heas: 'Home Equity Access Scheme — draws and advances',
  radRefund: 'Aged care — accommodation deposit refunded',
  saleProceeds: 'Home sale — net proceeds',
  rentalIncome: 'Rental income (net of costs)',
  portfolioMove: 'Non-Super Portfolio bought or sold (net)',
  spending: 'Household spending',
  mortgage: 'Mortgage repayments',
  tax: 'Income tax, capital gains tax and Division 293 (net)',
  agedCareCosts: 'Aged care costs',
  radDeposit: 'Aged care — deposit paid (refundable)',
  homePurchase: 'Home purchase — price and costs',
  spouseContribution: 'Spouse contribution into superannuation',
  downsizerContribution: 'Downsizer contribution to super',
});

/** Every `FlowGroupKey`, in the order a legend should read — inflows, then outflows. */
export const FLOW_GROUP_ORDER: readonly FlowGroupKey[] = Object.freeze([
  'pay',
  'agePension',
  'superIncome',
  'investmentIncome',
  'heas',
  'radRefund',
  'saleProceeds',
  'rentalIncome',
  'spending',
  'mortgage',
  'tax',
  'agedCareCosts',
  'radDeposit',
  'homePurchase',
  'portfolioMove',
  'spouseContribution',
  'downsizerContribution',
]);

/** Said on the face of the chart — condition 3's own wording, verbatim. */
export const SHORTFALL_LABEL = 'Money this plan does not have';

/**
 * The description → group table for every line whose description never carries a Person's name (or
 * a financial year). `SHORTFALL_LINE` is in it too, mapped to the literal `'shortfall'` rather than a
 * `FlowGroupKey`, so `classifyCashLine`'s return type states condition 3 rather than merely obeying it.
 */
const FIXED_LINES: Readonly<Record<string, FlowGroupKey | 'shortfall'>> = Object.freeze({
  [AGE_PENSION_LINE]: 'agePension',
  [AGE_PENSION_BEREAVEMENT_LINE]: 'agePension',
  [AGED_CARE_BASIC_FEE_LINE]: 'agedCareCosts',
  [AGED_CARE_HOTELLING_LINE]: 'agedCareCosts',
  [AGED_CARE_NCCC_LINE]: 'agedCareCosts',
  [AGED_CARE_DAP_LINE]: 'agedCareCosts',
  [AGED_CARE_RAD_PAYMENT_LINE]: 'radDeposit',
  [AGED_CARE_RAD_REFUND_LINE]: 'radRefund',
  [HEAS_DRAW_LINE]: 'heas',
  [HEAS_ADVANCE_LINE]: 'heas',
  [HOME_SALE_PROCEEDS_LINE]: 'saleProceeds',
  [HOME_SALE_SELLING_COSTS_LINE]: 'saleProceeds',
  [HOME_SALE_MORTGAGE_REPAID_LINE]: 'saleProceeds',
  [HOME_SALE_HEAS_REPAID_LINE]: 'saleProceeds',
  [HOME_PURCHASE_PRICE_LINE]: 'homePurchase',
  [HOME_PURCHASE_COSTS_LINE]: 'homePurchase',
  [RENT_OUT_HOME_RENT_LINE]: 'rentalIncome',
  [RENT_OUT_HOME_RATES_LINE]: 'rentalIncome',
  [RENT_OUT_HOME_INSURANCE_LINE]: 'rentalIncome',
  [RENT_OUT_HOME_AGENT_FEES_LINE]: 'rentalIncome',
  [RENT_OUT_HOME_REPAIRS_LINE]: 'rentalIncome',
  [HOUSEHOLD_SPENDING_LINE]: 'spending',
  [ONE_OFF_EXPENSE_LINE]: 'spending',
  [MORTGAGE_INTEREST_LINE]: 'mortgage',
  [MORTGAGE_PRINCIPAL_LINE]: 'mortgage',
  [SHORTFALL_LINE]: 'shortfall',
});

export type ClassificationIndex = ReadonlyMap<string, FlowGroupKey | 'shortfall'>;

/**
 * Add `description → group` to `map`, refusing to let two different groups claim one description —
 * unreachable on the table below as written, and kept as a refusal rather than a silent
 * last-write-wins so that a future family added here without checking for a clash fails loudly.
 */
const claim = (map: Map<string, FlowGroupKey | 'shortfall'>, description: string, group: FlowGroupKey): void => {
  const existing = map.get(description);
  if (existing !== undefined && existing !== group) {
    throw new RangeError(
      `"${description}" is claimed by both "${existing}" and "${group}" — two line families produce the same description`,
    );
  }
  map.set(description, group);
};

/**
 * **Built once per walk, from the walk's OWN Household and the financial years it actually
 * touches** — never from a guessed name or an open-ended year range, which is what keeps this an
 * EXACT-MATCH table rather than a pattern. Every description a family can produce is reconstructed
 * with `projection.ts`'s own description-building functions (`salaryDescription`, …), applied to
 * every name `household.persons` holds and, for the three line families whose description embeds a
 * financial year (`taxTrueUpDescription`, `division293TrueUpDescription`,
 * `division293ReleaseRefundDescription`), every `FinancialYear` the walk covers — a year-end
 * true-up's `fy` is always the year that just completed, and that year always has at least one month
 * inside the walk (`projection.ts`'s own settlement-timing doc), so this is exhaustive rather than a
 * guess at the range.
 */
export const buildClassificationIndex = (household: Household, financialYears: readonly FinancialYear[]): ClassificationIndex => {
  const map = new Map<string, FlowGroupKey | 'shortfall'>(Object.entries(FIXED_LINES) as readonly (readonly [string, FlowGroupKey | 'shortfall'])[]);
  for (const person of household.persons) {
    claim(map, salaryDescription(person.name), 'pay');
    claim(map, cashInterestDescription(person), 'investmentIncome');
    claim(map, incomeTaxDescription(person.name), 'tax');
    claim(map, capitalGainsTaxDescription(person.name), 'tax');
    claim(map, division293Description(person.name), 'tax');
    claim(map, portfolioSaleDescription(person.name), 'portfolioMove');
    claim(map, portfolioPurchaseDescription(person.name), 'portfolioMove');
    claim(map, portfolioBrokerageDescription(person.name), 'portfolioMove');
    claim(map, superPaymentDescription(PENSION_MINIMUM_LINE, person), 'superIncome');
    claim(map, superPaymentDescription(TTR_PAYMENT_LINE, person), 'superIncome');
    claim(map, superPaymentDescription(SUPER_LUMP_SUM_LINE, person), 'superIncome');
    claim(map, superPaymentDescription(SUPER_DEATH_BENEFIT_LINE, person), 'superIncome');
    claim(map, downsizerContributionDescription(person.name), 'downsizerContribution');
    for (const fy of financialYears) {
      claim(map, taxTrueUpDescription(person.name, fy), 'tax');
      claim(map, division293TrueUpDescription(person.name, fy), 'tax');
      claim(map, division293ReleaseRefundDescription(person.name, fy), 'tax');
    }
  }
  // A spouse contribution runs from one Person of a couple into the OTHER's superannuation — both
  // orders, since either may be the contributor (`projection.ts` refuses a household-owned entry).
  if (household.persons.length === 2) {
    const [first, second] = household.persons as readonly [Household['persons'][number], Household['persons'][number]];
    claim(map, spouseContributionDescription(first.name, second.name), 'spouseContribution');
    claim(map, spouseContributionDescription(second.name, first.name), 'spouseContribution');
  }
  return Object.freeze(map);
};

/**
 * The whole of the classifier — an EXACT lookup and nothing else (condition 2). Throws on any
 * description not built into `index`, which is either a genuinely new line family this table has
 * never been told about, or a Household/financial-year the index was not built wide enough for.
 * Never falls back to a prefix, a substring or a regex: see the header.
 */
export const classifyCashLine = (description: string, index: ClassificationIndex): FlowGroupKey | 'shortfall' => {
  const found = index.get(description);
  if (found === undefined) {
    throw new RangeError(
      `no flow group is defined for the cash line "${description}" — flowSeries.ts's classifier is total by construction ` +
        '(built from projection.ts\'s own exported line constants and description-building functions), so this is either a ' +
        "line family buildClassificationIndex has not been extended for, or a Person/financial year it was not built wide " +
        'enough to cover. It must be added to the table rather than matched by prefix or regex.',
    );
  }
  return found;
};

export interface FlowGroup {
  readonly key: FlowGroupKey;
  readonly label: string;
  readonly side: FlowSide;
  /**
   * One net figure per financial year (parallel to `FlowSeries.years`), in cents, in the money basis
   * `flowSeries` was called with. Positive in the group's OWN `side`'s direction; a family that runs
   * the other way in a given year (a tax refund year, say) nets to a NEGATIVE figure rather than
   * flipping which array it lives in.
   */
  readonly values: readonly number[];
}

export interface FlowYear {
  readonly financialYear: FinancialYear;
  /** `2027-28`, or `2026-27 (from Sep)` / `2066-67 (to Mar)` — `financialYearRows.ts`'s own `yearLabel`. */
  readonly label: string;
  /** Fewer than twelve months of the walk fall in this year — the chart layer captions it rather than drawing it short. */
  readonly partial: boolean;
}

export interface FlowSeries {
  readonly years: readonly FlowYear[];
  /** Every group with at least one cash line anywhere in the walk — see `flowSeries`'s own filter. */
  readonly groups: readonly FlowGroup[];
  /**
   * **Never a band, never summed into any group above (condition 3).** One entry per `years`, each
   * the SUM of that year's own months' `SHORTFALL_LINE` amounts (condition 4) — never a recomputed
   * `max(0, spend − income)`, which would let a good June wash out a bad March.
   */
  readonly shortfall: readonly number[];
}

/** `line.amount`, signed by `line.direction` and converted through `month`'s own lens — one cent figure. */
const signedLensed = (line: MonthLine, lens: (cents: Cents) => Cents): number => {
  const converted = lens(line.amount);
  return line.direction === 'inflow' ? converted : -converted;
};

/**
 * `months` grouped into financial years, each year's cash lines classified and netted per group, with
 * every month put through ITS OWN month's lens before the year sums it (`financialYearRows.ts`'s own
 * rule — see the header on why this file cannot defer conversion the way `monthsToSeries.ts` does).
 *
 * `household` must be the SAME Household `months` was walked from: `buildClassificationIndex` reads
 * `household.persons` to reconstruct every per-Person description the walk could have produced, and a
 * different Household's names would make a real line unclassifiable.
 */
export const flowSeries = (months: readonly Month[], household: Household, basis: MoneyBasis): FlowSeries => {
  const yearGroups = groupByFinancialYear(months);
  const financialYears = yearGroups.map((group) => financialYearOfMonth((group[0] as Month).month));
  const index = buildClassificationIndex(household, financialYears);

  const netByGroup = new Map<FlowGroupKey, number[]>();
  const shortfall: number[] = [];
  const years: FlowYear[] = [];

  yearGroups.forEach((group, yearIndex) => {
    const first = group[0] as Month;
    const last = group.at(-1) as Month;
    years.push(
      Object.freeze({
        financialYear: financialYears[yearIndex] as FinancialYear,
        label: yearLabel(financialYears[yearIndex] as FinancialYear, first.month, last.month),
        partial: group.length < 12,
      }),
    );
    let yearShortfall = 0;
    const yearNet = new Map<FlowGroupKey, number>();
    for (const month of group) {
      const lens = moneyLens(basis, month.month);
      for (const line of month.lines) {
        if (line.effect !== 'cash') continue;
        const classified = classifyCashLine(line.description, index);
        if (classified === 'shortfall') {
          yearShortfall += lens(line.amount);
          continue;
        }
        yearNet.set(classified, (yearNet.get(classified) ?? 0) + signedLensed(line, lens));
      }
    }
    shortfall.push(yearShortfall);
    for (const key of FLOW_GROUP_ORDER) {
      const values = netByGroup.get(key) ?? [];
      netByGroup.set(key, values);
      const net = yearNet.get(key) ?? 0;
      // Stored in the group's OWN side's sign: an inflow-side group's net is inflow-positive already
      // (`signedLensed` counted an outflow line negative), so it is used as-is; an outflow-side
      // group's net was counted outflow-negative by the same arithmetic and is negated once here so
      // that `values` reads "how much of this left the household, net", positive in the ordinary case.
      values.push(FLOW_GROUP_SIDE[key] === 'inflow' ? net : -net);
    }
  });

  const groups: FlowGroup[] = FLOW_GROUP_ORDER.filter((key) => (netByGroup.get(key) ?? []).some((value) => value !== 0)).map(
    (key) =>
      Object.freeze({
        key,
        label: FLOW_GROUP_LABELS[key],
        side: FLOW_GROUP_SIDE[key],
        values: Object.freeze(netByGroup.get(key) as number[]),
      }),
  );

  return Object.freeze({
    years: Object.freeze(years),
    groups: Object.freeze(groups),
    shortfall: Object.freeze(shortfall),
  });
};

// --- The classification table, spelled out as a reference for a reader auditing this file ---------
//
// | Line constant                        | Built via                              | Group              | Side    |
// |---------------------------------------|-----------------------------------------|--------------------|---------|
// | SALARY_LINE                           | salaryDescription(name)                 | pay                | inflow  |
// | AGE_PENSION_LINE                      | bare                                     | agePension         | inflow  |
// | AGE_PENSION_BEREAVEMENT_LINE          | bare                                     | agePension         | inflow  |
// | PENSION_MINIMUM_LINE                  | superPaymentDescription(_, person)      | superIncome        | inflow  |
// | TTR_PAYMENT_LINE                      | superPaymentDescription(_, person)      | superIncome        | inflow  |
// | SUPER_LUMP_SUM_LINE                   | superPaymentDescription(_, person)      | superIncome        | inflow  |
// | SUPER_DEATH_BENEFIT_LINE              | superPaymentDescription(_, person)      | superIncome        | inflow  |
// | CASH_INTEREST_LINE                    | cashInterestDescription(person)         | investmentIncome   | inflow  |
// | HEAS_DRAW_LINE                        | bare                                     | heas               | inflow  |
// | HEAS_ADVANCE_LINE                     | bare                                     | heas               | inflow  |
// | AGED_CARE_RAD_REFUND_LINE             | bare                                     | radRefund          | inflow  |
// | HOME_SALE_PROCEEDS_LINE               | bare                                     | saleProceeds       | inflow  |
// | HOME_SALE_SELLING_COSTS_LINE          | bare                                     | saleProceeds       | inflow* |
// | HOME_SALE_MORTGAGE_REPAID_LINE        | bare                                     | saleProceeds       | inflow* |
// | HOME_SALE_HEAS_REPAID_LINE            | bare                                     | saleProceeds       | inflow* |
// | PORTFOLIO_SALE_LINE                   | portfolioSaleDescription(name)          | portfolioMove      | outflow*|
// | DIVISION_293_RELEASE_REFUND_LINE      | division293ReleaseRefundDescription     | tax                | outflow*|
// | HOUSEHOLD_SPENDING_LINE               | bare                                     | spending           | outflow |
// | ONE_OFF_EXPENSE_LINE                  | bare                                     | spending           | outflow |
// | MORTGAGE_INTEREST_LINE                | bare                                     | mortgage           | outflow |
// | MORTGAGE_PRINCIPAL_LINE               | bare                                     | mortgage           | outflow |
// | INCOME_TAX_LINE                       | incomeTaxDescription(name)              | tax                | outflow |
// | CAPITAL_GAINS_TAX_LINE                | capitalGainsTaxDescription(name)        | tax                | outflow |
// | TAX_TRUE_UP_LINE                      | taxTrueUpDescription(name, fy)          | tax                | outflow |
// | DIVISION_293_LINE                     | division293Description(name)            | tax                | outflow |
// | DIVISION_293_TRUE_UP_LINE             | division293TrueUpDescription(name, fy)  | tax                | outflow |
// | AGED_CARE_BASIC_FEE_LINE              | bare                                     | agedCareCosts      | outflow |
// | AGED_CARE_HOTELLING_LINE              | bare                                     | agedCareCosts      | outflow |
// | AGED_CARE_NCCC_LINE                   | bare                                     | agedCareCosts      | outflow |
// | AGED_CARE_DAP_LINE                    | bare                                     | agedCareCosts      | outflow |
// | AGED_CARE_RAD_PAYMENT_LINE            | bare                                     | radDeposit         | outflow |
// | HOME_PURCHASE_PRICE_LINE              | bare                                     | homePurchase       | outflow |
// | HOME_PURCHASE_COSTS_LINE              | bare                                     | homePurchase       | outflow |
// | PORTFOLIO_PURCHASE_LINE               | portfolioPurchaseDescription(name)      | portfolioMove      | outflow |
// | PORTFOLIO_BROKERAGE_LINE              | portfolioBrokerageDescription(name)     | portfolioMove      | outflow |
// | SPOUSE_CONTRIBUTION_LINE              | spouseContributionDescription(a, b)     | spouseContribution | outflow |
// | DOWNSIZER_CONTRIBUTION_LINE           | downsizerContributionDescription(name)  | downsizerContribution | outflow |
// | SHORTFALL_LINE                        | bare                                     | (none — `shortfall`, drawn separately, condition 3) |
// | *four asset-move lines marked "inflow*"/"outflow*" are the NET of their family; the family's own dominant direction decides the side, and a line pushing the other way just makes the net smaller rather than switching sides.
//
// **The 11 wealth-only `*_LINE` constants left OUT of this table on purpose** (`effect: 'wealth'` at
// every emit site, so the classifier never sees them — flowSeries pre-filters on `effect === 'cash'`):
// GROWTH_LINE, SALARY_SACRIFICE_LINE, SUPER_GUARANTEE_LINE, SUPER_ADMINISTRATION_FEE_LINE,
// SUPER_INVESTMENT_FEE_LINE, SUPER_INSURANCE_LINE, SUPER_EARNINGS_TAX_LINE, SUPER_FRANKING_CREDIT_REFUND_LINE,
// HEAS_INTEREST_LINE, AGED_CARE_RAD_RETENTION_LINE, DIVISION_293_RELEASE_LINE.
