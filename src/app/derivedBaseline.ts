// P11-7..P11-11 (slice 5) — the Derived Baseline: a household spending level worked out from the
// Ledger, OFFERED and never bound (ADR-0004, P11-10). The page half is in `transactionsPanel.ts`;
// the gate and its binding rulings are docs/research/p11-slice5-baseline-gate-2026-09-28.md.
//
//   * **The window is the Ledger's own last year, by DATE.** It ends on the latest date of any
//     Transaction that is not a cancelled pair, and starts on the earliest such date or 364 days
//     before the end, whichever is later: at most 365 days, both ends counted. Every Transaction in
//     it counts, including any dated after `asAtDate`. (A calendar window before `asAtDate`'s month
//     ignored the month just imported — the 2026-09-28 defect, TODO P11-7.)
//   * **Fewer than 365 days is scaled to a year by 365 / days** (LIZ ruling 2026-09-28, the
//     conservative failure mode: an unscaled figure is too LOW and flatters every later year), and
//     the offer says so. **Fewer than 28 days is no offer**: a few days scaled to a year is noise.
//     Days, not months holding transactions: a month with two days of data is not a month.
//   * **A reversal pair counts for nothing, wherever it is dated.** A `reverses` says the original did
//     not happen, so both are dropped before the window is applied — a pair straddling the window's
//     edge cannot leave half of itself behind.
//   * **The Category is the last Categorisation's** (`categoryOf`). Committed, Discretionary and
//     One-off are NETTED — a refund (money in) in one of them comes off that category's spend, as a
//     reversal would (LIZ, by precedent).
//   * **Uncategorised money OUT is COUNTED and named** (LIZ): leaving it out understates spending,
//     the direction that runs out of money unseen. **Uncategorised money IN is left out and named**:
//     an unlabelled inflow is far more often income or a transfer in than a refund, and netting it
//     would understate spending the same dangerous way. A refund counts once it is categorised.
//   * **One-off and Other are shown and NOT counted** (user rulings). Nothing is amortised. The Other
//     total is money OUT marked Other (money in marked Other is income, and says nothing about a
//     misfiled purchase, which is what the Other total is shown to catch).
//   * **Each month's net is raised to `asAtDate` money on its own** with `inflateStated`, the plan's
//     own CPI assumption, pointed BACKWARDS: the historical month is the base and `asAtDate` the
//     target, so a month k months back is multiplied by (1 + cpi)^(k/12). Rounded once per month and
//     line, by `mulCents`. A month at or after `asAtDate`'s own is taken as recorded: never deflated.
//
// Pure: no DOM, no I/O, no clock. Nothing in the projection reads this module or the Ledger.
import { categoryOf } from '../core/ledger.js'; // `.js` is correct in a `.ts` file — see tsconfig.json
import type { Ledger, Transaction } from '../core/ledger.js';
import type { Cents } from '../core/money.js';
import { daysInclusive } from '../core/financialYear.js';
import { inflateStated, monthOrdinal } from '../core/priceLevel.js';
import type { IsoDate } from '../data/assumptions/types.js';
import { roundToDollar } from './displayMoney.js';
import { monthName } from './financialYearRows.js';

/** A count of Transactions and their total in `asAtDate` money: positive is money out (net of refunds). */
export interface BaselineLine {
  readonly count: number;
  readonly total: Cents;
}

/** The first and last day of the window, both counted, and how many days that is (at most 365). */
export interface BaselineWindow {
  readonly from: IsoDate;
  readonly to: IsoDate;
  readonly days: number;
}

export interface BaselineOffer {
  readonly kind: 'offer';
  readonly window: BaselineWindow;
  /** The level offered: Committed + Discretionary + uncategorised money out, in whole dollars, scaled by 365 / `window.days` when the window is shorter than a year. */
  readonly annualSpend: Cents;
  readonly committed: BaselineLine;
  readonly discretionary: BaselineLine;
  /** Uncategorised money OUT — counted in `annualSpend`. */
  readonly uncategorised: BaselineLine;
  /** Shown, NOT counted. */
  readonly oneOff: BaselineLine;
  /** Money out marked Other. Shown, NOT counted. */
  readonly other: BaselineLine;
  /** Money IN marked Other (e.g. a transfer in from another own account). Shown, NOT counted; `total` is positive. */
  readonly otherIn: BaselineLine;
  /** Uncategorised money IN — left out; `total` is positive money in. */
  readonly uncategorisedIn: BaselineLine;
  /** The Transactions behind `annualSpend`, in the order they were recorded (P11-11). */
  readonly transactionIds: readonly string[];
}

export interface NoBaseline {
  readonly kind: 'none';
  readonly reason: string;
}

export type DerivedBaseline = BaselineOffer | NoBaseline;

const monthText = (ordinal: number): string => {
  const year = Math.floor((ordinal - 1) / 12);
  return `${year}-${String(ordinal - year * 12).padStart(2, '0')}`;
};

/** A year of days: the longest window, and what a shorter one is scaled to. */
const YEAR_DAYS = 365;
/** The shortest window offered at all. */
const MINIMUM_DAYS = 28;

/** `30 Aug 2026`. */
export const dateInWords = (date: string): string => `${Number(date.slice(8, 10))} ${monthName(date)} ${date.slice(0, 4)}`;

/** `date` less `days` days. `Date.UTC` is calendar arithmetic here, not a clock. */
const daysBefore = (date: IsoDate, days: number): IsoDate =>
  new Date(Date.UTC(Number(date.slice(0, 4)), Number(date.slice(5, 7)) - 1, Number(date.slice(8, 10)) - days)).toISOString().slice(0, 10) as IsoDate;

type Bucket = 'committed' | 'discretionary' | 'uncategorised' | 'oneOff' | 'other' | 'otherIn' | 'uncategorisedIn';

const bucketOf = (ledger: Ledger, transaction: Transaction): Bucket | undefined => {
  const category = categoryOf(ledger, transaction.id)?.category;
  const out = transaction.amount < 0;
  switch (category) {
    case 'Committed': return 'committed';
    case 'Discretionary': return 'discretionary';
    case 'One-off': return 'oneOff';
    case 'Other': return out ? 'other' : 'otherIn';
    case undefined: return out ? 'uncategorised' : 'uncategorisedIn';
  }
};

export const deriveBaseline = (ledger: Ledger, asAtDate: string, cpi: number): DerivedBaseline => {
  const current = monthOrdinal(asAtDate);
  const cancelled = new Set(ledger.transactions.flatMap((each) => (each.reverses === undefined ? [] : [each.reverses, each.id])));
  const standing = ledger.transactions.filter((each) => !cancelled.has(each.id));
  if (standing.length === 0) {
    return { kind: 'none', reason: 'No transactions are recorded, so there is nothing to work a spending figure out from.' };
  }
  const dates = standing.map((each) => each.date).sort();
  const to = dates.at(-1)!;
  const yearBack = daysBefore(to, YEAR_DAYS - 1);
  const from = dates[0]! > yearBack ? dates[0]! : yearBack;
  const window: BaselineWindow = { from, to, days: daysInclusive(from, to) };
  const period = `from ${dateInWords(from)} to ${dateInWords(to)}`;
  if (window.days < MINIMUM_DAYS) {
    return {
      kind: 'none',
      reason: `Your transactions cover only ${window.days} ${window.days === 1 ? 'day' : 'days'}, ${period}. That is not enough history to work out a yearly figure; import at least a month.`,
    };
  }
  const inWindow = standing.filter((each) => each.date >= from);
  const buckets: Bucket[] = ['committed', 'discretionary', 'uncategorised', 'oneOff', 'other', 'otherIn', 'uncategorisedIn'];
  const net = new Map<Bucket, Map<number, number>>(buckets.map((bucket) => [bucket, new Map()]));
  const counts = new Map<Bucket, number>(buckets.map((bucket) => [bucket, 0]));
  const contributing: string[] = [];
  for (const transaction of inWindow) {
    const bucket = bucketOf(ledger, transaction);
    if (bucket === undefined) continue;
    const month = monthOrdinal(transaction.date);
    const byMonth = net.get(bucket)!;
    byMonth.set(month, (byMonth.get(month) ?? 0) + transaction.amount);
    counts.set(bucket, counts.get(bucket)! + 1);
    if (bucket === 'committed' || bucket === 'discretionary' || bucket === 'uncategorised') contributing.push(transaction.id);
  }
  const raised = (cents: Cents, month: number): Cents => (month >= current ? cents : inflateStated(cents, cpi, monthText(month), asAtDate));
  const line = (bucket: Bucket, sign: -1 | 1): BaselineLine => ({
    count: counts.get(bucket)!,
    total: [...net.get(bucket)!].reduce((sum, [month, cents]) => sum + raised((sign * cents) as Cents, month), 0) as Cents,
  });
  const committed = line('committed', -1);
  const discretionary = line('discretionary', -1);
  const uncategorised = line('uncategorised', -1);
  const exact = committed.total + discretionary.total + uncategorised.total;
  if (roundToDollar(exact) <= 0) {
    return {
      kind: 'none',
      reason: `Nothing recorded ${period} counts as spending: after refunds, Committed, Discretionary and uncategorised money out come to nothing. One-off and Other are never counted.`,
    };
  }
  return {
    kind: 'offer',
    window,
    annualSpend: roundToDollar((window.days < YEAR_DAYS ? Math.round((exact * YEAR_DAYS) / window.days) : exact) as Cents),
    committed,
    discretionary,
    uncategorised,
    oneOff: line('oneOff', -1),
    other: line('other', -1),
    otherIn: line('otherIn', 1),
    uncategorisedIn: line('uncategorisedIn', 1),
    transactionIds: contributing,
  };
};
