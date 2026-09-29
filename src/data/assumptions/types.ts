// P2-5 — the record shape every assumption leaf carries, and nothing else.
//
// `docs/assumptions-register.md` is the specification for this directory. Every leaf below
// points back at it through `registerSection`, so any figure on the chart can be walked back
// to the evidence that put it there (P5-4, and `explainAssumption` in ADR-0006).
//
// Three kinds, exactly as the register's "How to read this" defines them:
//
//   config          legislated to change — stamped with a financial year or an effective date
//   config-derived  never stored as a literal; a formula, with the published figure as a fixture
//   constant        structural, one value for every year of the Planning Horizon (register §7)
//
// The union below is what enforces the register-hygiene rule that a config row must carry a
// stamp: only `kind: 'constant'` may use `everyYear`. Reclassifying a config row as a constant
// to dodge the stamp is a visible change of `kind`, and §9 has a test for it.
import type { Cents } from '../../core/money.js'; // `.js` is correct in a `.ts` file — see tsconfig.json

export type Kind = 'config' | 'config-derived' | 'constant';

/** Carried forward from the research passes verbatim. Never laundered upward by consolidation. */
export type Confidence = 'primary-verified' | 'primary-via-archive' | 'secondary-only' | 'unverified';

/** `2026-27`. Financial years, never calendar years. */
export type FinancialYear = `${number}-${number}`;

export type IsoDate = `${number}-${number}-${number}`;

/** Age Pension rates reindex on these two dates only (register §4.1). */
export type RateIndexationDate = `${number}-03-20` | `${number}-09-20`;

/** Free areas, assets free areas and deeming thresholds reindex on this date only (register §4.1). */
export type MeansTestIndexationDate = `${number}-07-01`;

export interface Provenance {
  readonly source: string;
  readonly retrieved: IsoDate;
  readonly confidence: Confidence;
  /** Where in `docs/assumptions-register.md` the evidence for this figure sits. */
  readonly registerSection: string;
  /** Anything a reader needs in order not to misuse the figure — usually a trap reference. */
  readonly note?: string;
  /** For `config-derived`: the formula, in the register's own words. */
  readonly derivation?: string;
}

interface FyStamp {
  readonly fy: FinancialYear;
  readonly effective?: undefined;
  readonly everyYear?: undefined;
  /**
   * Set where `fy` is *not* the year being forecast because that year's figure does not exist
   * yet (register §2.7, T10). The mismatch must reach the display, not be quietly relabelled.
   */
  readonly priorYearFallbackFor?: FinancialYear;
}

interface EffectiveStamp<D extends string> {
  readonly effective: D;
  readonly fy?: undefined;
  readonly everyYear?: undefined;
}

interface EveryYearStamp {
  readonly everyYear: true;
  readonly fy?: undefined;
  readonly effective?: undefined;
}

export type Config<T, D extends string = IsoDate> = Provenance &
  (FyStamp | EffectiveStamp<D>) & {
    readonly kind: 'config' | 'config-derived';
    readonly value: T;
  };

export type Constant<T, D extends string = IsoDate> = Provenance &
  (FyStamp | EffectiveStamp<D> | EveryYearStamp) & {
    readonly kind: 'constant';
    readonly value: T;
  };

export type Assumption<T, D extends string = IsoDate> = Config<T, D> | Constant<T, D>;

/** Money is integer cents, always (P2-4). */
export type Money<D extends string = IsoDate> = Assumption<Cents, D>;

/** A rate, a taper or a multiple — never a dollar amount. */
export type Rate<D extends string = IsoDate> = Assumption<number, D>;

/** A stored formula. `value` is the formula itself; `derivation` is what it says in words. */
export type Formula<F, D extends string = IsoDate> = Config<F, D> & { readonly derivation: string };

/** The keys the record shape guarantees, used by the drift-control test and by `explainAssumption`. */
export const PROVENANCE_KEYS = Object.freeze(['source', 'retrieved', 'confidence', 'registerSection'] as const);

/**
 * `Object.freeze` all the way down. Functions are frozen but not walked — their `prototype`
 * is not part of the assumption. Already-frozen objects are left alone, which also makes the
 * walk safe against a shared sub-object appearing twice.
 */
export const deepFreeze = <T>(value: T): T => {
  if (value === null || typeof value !== 'object') {
    if (typeof value === 'function') Object.freeze(value);
    return value;
  }
  if (Object.isFrozen(value)) return value;
  Object.freeze(value);
  for (const key of Object.getOwnPropertyNames(value)) {
    deepFreeze((value as Record<string, unknown>)[key]);
  }
  return value;
};

/** True for anything carrying the full assumption record shape — the leaf test, used by the walk. */
export const isAssumption = (value: unknown): value is Assumption<unknown, string> =>
  typeof value === 'object' &&
  value !== null &&
  'value' in value &&
  'kind' in value &&
  PROVENANCE_KEYS.every((key) => key in value);
