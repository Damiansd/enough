// The provenance a computed number carries: the weakest confidence of everything it consumed,
// and one caveat line per input that is not primary-verified *for the year being computed*.
//
// This is the same machinery `core/incomeTax.ts` grew privately in P3-1. It is extracted here
// rather than imported from there because P3-3/P3-4 must not modify that module, and two copies
// that drift would be worse than one shared one: `incomeTax.ts` should collapse onto this file
// the next time it is open for edit. Nothing about the behaviour changed in the move.
//
// The consumed record is typed as the *subset* of the assumption record shape that provenance
// actually reads, so a caller-supplied figure that is not an assumption at all — a forward AWOTE
// index number, which register O5 makes a Setting — can be carried through the same path and
// arrive labelled with its own confidence instead of being laundered into the result.
import type { Confidence, FinancialYear } from '../data/assumptions/types.js'; // `.js` is correct in a `.ts` file — see tsconfig.json

export const CONFIDENCE_ORDER: readonly Confidence[] = [
  'primary-verified',
  'primary-via-archive',
  'secondary-only',
  'unverified',
];

/** Everything provenance reads. `Assumption<unknown, string>` satisfies it; so does a Setting-supplied figure. */
export interface ProvenanceBearing {
  readonly confidence: Confidence;
  readonly fy?: FinancialYear | undefined;
  readonly priorYearFallbackFor?: FinancialYear | undefined;
}

export type Consumed = readonly [key: string, record: ProvenanceBearing];

export interface ComputedProvenance {
  readonly fy: FinancialYear;
  /** The weakest confidence of any figure this result consumed. */
  readonly confidence: Confidence;
  /** One line per consumed figure that is not primary-verified for this year. */
  readonly caveats: readonly string[];
}

// `indexOf` answers -1 for a value that is not a `Confidence`, which would rank it *stronger* than
// `primary-verified` and quietly delete the weakness from the result — the one thing this file
// exists to prevent. A figure that is not an assumption (register O5's Setting-supplied AWOTE
// index) reaches here at runtime, so the closed union is not a guarantee at this boundary.
const rank = (confidence: Confidence): number => {
  const index = CONFIDENCE_ORDER.indexOf(confidence);
  if (index < 0) throw new RangeError(`not a confidence: ${confidence}`);
  return index;
};

const weaker = (a: Confidence, b: Confidence): Confidence => (rank(b) > rank(a) ? b : a);

export const provenanceOf = (fy: FinancialYear, consumed: readonly Consumed[]): ComputedProvenance => {
  const caveats: string[] = [];
  let confidence: Confidence = 'primary-verified';
  for (const [key, record] of consumed) {
    confidence = weaker(confidence, record.confidence);
    if (record.confidence !== 'primary-verified') caveats.push(`${key} is ${record.confidence}`);
    if (record.fy !== undefined) {
      if (record.priorYearFallbackFor !== undefined) {
        caveats.push(
          `${key} is stamped FY${record.fy} and carried as a prior-year fallback for ` +
            `FY${record.priorYearFallbackFor} — no FY${record.priorYearFallbackFor} figure exists`,
        );
      } else if (record.fy !== fy) {
        caveats.push(`${key} is stamped FY${record.fy} and was applied to FY${fy}`);
      }
    }
  }
  return Object.freeze({ fy, confidence, caveats: Object.freeze([...new Set(caveats)]) });
};

/** The weakest confidence and the union of the caveats. A result is as weak as its weakest input. */
export const mergeProvenance = (
  first: ComputedProvenance,
  ...rest: readonly ComputedProvenance[]
): ComputedProvenance => {
  let confidence = first.confidence;
  const caveats = new Set(first.caveats);
  for (const other of rest) {
    confidence = weaker(confidence, other.confidence);
    for (const caveat of other.caveats) caveats.add(caveat);
  }
  return Object.freeze({ fy: first.fy, confidence, caveats: Object.freeze([...caveats]) });
};

/**
 * A caveat that has no record behind it — a limit of the *reading*, not of a figure. Register O19
 * is the case this exists for: the qualifying earnings definition is primary-verified for the
 * salary-sacrifice limb and unread for the rest, so a result that depends on the unread part must
 * say so even though every record it consumed is primary-verified.
 */
export const withCaveats = (
  provenance: ComputedProvenance,
  ...lines: readonly string[]
): ComputedProvenance =>
  Object.freeze({
    ...provenance,
    caveats: Object.freeze([...new Set([...provenance.caveats, ...lines])]),
  });
