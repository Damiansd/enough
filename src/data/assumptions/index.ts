// The assumptions barrel, and `explainAssumption` (P2-5c, ADR-0006).
//
// `explainAssumption` is not a feature bolted on top of the data — it falls out of the record
// shape. Every leaf already carries its value, its kind, its stamp, its source, its retrieval
// date, its confidence and its register section; all this does is walk the tree once, key each
// leaf by its dotted path, and hand the record back. The chat computes nothing (ADR-0006), so
// this is the only way a rule figure may be uttered.
import { deepFreeze, isAssumption } from './types.js'; // `.js` is correct in a `.ts` file — see tsconfig.json
import type { Assumption, Confidence, IsoDate, Kind } from './types.js';
import { SETTINGS_NOT_ASSUMPTIONS } from './settings.js';
import type { SettingBoundary } from './settings.js';
import { TAX } from './tax.js';
import { AGE_PENSION } from './agePension.js';
import { HEAS } from './heas.js';
import { SUPERANNUATION } from './super.js';
import { FRANKING } from './franking.js';
import { AGED_CARE } from './agedCare.js';

export * from './types.js';
export * from './settings.js';
export * from './tax.js';
export * from './super.js';
export * from './agePension.js';
export * from './heas.js';
export * from './franking.js';
export * from './periods.js';
export * from './agedCare.js';

export const ASSUMPTIONS = deepFreeze({
  tax: TAX,
  superannuation: SUPERANNUATION,
  agePension: AGE_PENSION,
  heas: HEAS,
  franking: FRANKING,
  agedCare: AGED_CARE,
});

const flatten = (node: unknown, prefix: string, into: Map<string, Assumption<unknown, string>>): void => {
  if (isAssumption(node)) {
    into.set(prefix, node);
    return;
  }
  if (typeof node !== 'object' || node === null) return;
  for (const [key, child] of Object.entries(node)) {
    flatten(child, prefix === '' ? key : `${prefix}.${key}`, into);
  }
};

const INDEX: ReadonlyMap<string, Assumption<unknown, string>> = (() => {
  const map = new Map<string, Assumption<unknown, string>>();
  flatten(ASSUMPTIONS, '', map);
  return map;
})();

/** Every assumption key, dotted — `tax.sapto.transferReductionRate`. Sorted, so diffs are readable. */
export const assumptionKeys = (): readonly string[] => [...INDEX.keys()].sort();

/** The record behind a key, or `undefined`. Prefer `explainAssumption`, which refuses to be vague. */
export const assumptionAt = (key: string): Assumption<unknown, string> | undefined => INDEX.get(key);

export interface AssumptionExplanation {
  readonly key: string;
  readonly kind: Kind;
  readonly value: unknown;
  /** Human-readable stamp — the year or effective date, and any prior-year mismatch. */
  readonly stamp: string;
  readonly source: string;
  readonly retrieved: IsoDate;
  readonly confidence: Confidence;
  readonly registerSection: string;
  readonly note?: string;
  /** Present where the figure is derived: what the formula is, in the register's words. */
  readonly derivation?: string;
  /** True where `value` is the formula itself rather than a number. */
  readonly isFormula: boolean;
}

export interface SettingExplanation extends SettingBoundary {
  readonly key: string;
}

export type Explanation = AssumptionExplanation | SettingExplanation;

const stampOf = (record: Assumption<unknown, string>): string => {
  if (record.fy !== undefined) {
    return record.priorYearFallbackFor === undefined
      ? `FY${record.fy}`
      : `FY${record.fy} — prior-year fallback, no FY${record.priorYearFallbackFor} figure exists`;
  }
  if (record.effective !== undefined) return `effective ${record.effective}`;
  return 'every year of the Planning Horizon (constant)';
};

/**
 * The value with its stamp, source, retrieval date and confidence — or, for a key that is
 * deliberately a Setting rather than an assumption, why no assumption backs it.
 *
 * Throws on an unknown key. A rule claim that no key backs must not be answered.
 */
export const explainAssumption = (key: string): Explanation => {
  const record = INDEX.get(key);
  if (record === undefined) {
    const setting = SETTINGS_NOT_ASSUMPTIONS[key];
    if (setting !== undefined) return { key, ...setting };
    throw new RangeError(`no assumption keyed ${key}`);
  }
  return {
    key,
    kind: record.kind,
    value: record.value,
    stamp: stampOf(record),
    source: record.source,
    retrieved: record.retrieved,
    confidence: record.confidence,
    registerSection: record.registerSection,
    ...(record.note === undefined ? {} : { note: record.note }),
    ...(record.derivation === undefined ? {} : { derivation: record.derivation }),
    isFormula: typeof record.value === 'function',
  };
};
