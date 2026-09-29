// plan_ai.md §6 and §8 (D3), stage 3 — **the guard: a figure the model wrote itself is struck out.**
// It reads the model's prose OUTSIDE the chips (`chips.ts` has already swapped every marker for the
// engine's value) and finds two kinds of number:
//
// 1. **Money, which is never allowed.** A `$` (or `A$`, `AUD`) figure; an amount with a k, m or bn
//    on it (`62k`, `1.2m`); a number, in digits or in words, beside "thousand", "million", "billion",
//    "dollars", "bucks", "grand" or "cents"; and a number too big to be anything but money here, one
//    with a thousands comma or of five digits or more. W6's "about $62k less a year" is the sentence
//    this exists for (ADR-0011, 2026-09-24 note), and an echo of the user's own figure is struck too:
//    in this interface a dollar amount comes from the engine or not at all.
// 2. **Any other number in digits, which is allowed only WORD FOR WORD (D3).** A calendar year, a
//    month, an age or a percentage may stand without a chip if the same token appears in the user's
//    question or in a tool result the model was given. `2034` is allowed if `2034` is there; `6.5%`
//    only if `6.5%` is. The figures the model was shown are left out of that source text, so a
//    dollar value cannot come back in as a bare number. An ordered list's own numbering is not a
//    figure.
//
// A number spelt in words and beside no money word ("both", "three days") is not read at all.
//
// Each hit is returned as a span; `chips.ts` strikes it through and marks it "not worked out by enough",
// and the count is what the golden suite requires to be zero.

export interface StruckSpan {
  readonly start: number;
  readonly end: number;
  readonly reason: 'money' | 'not in the question or a tool result';
}

const NUMBER_WORD =
  '(?:zero|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|' +
  'twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety|hundred|thousand|million|billion|half|quarter|few|couple|several|dozen)';
/** A number in words: "sixty-two", "two hundred and fifty", "couple of". */
const WORDS = `${NUMBER_WORD}(?:(?:[-\\s]+|\\s+and\\s+|\\s+of\\s+)${NUMBER_WORD})*`;
const DIGITS = '\\d[\\d,]*(?:\\.\\d+)?';
const AMOUNT = `(?:${DIGITS}|${WORDS})`;
const MAGNITUDE = '(?:thousand|million|billion|mn|bn|[kKmMbB])';
const MONEY_WORD = '(?:dollars?|bucks|grand|cents?|AUD)';

const MONEY: readonly RegExp[] = [
  // `$62k`, `-$18,375`, `A$ 1.2m`, `AUD 60,000`, `$ 62 thousand`.
  new RegExp(`-?(?:A?\\$|\\bAUD|\\bUSD)\\s?-?${DIGITS}(?:\\s?${MAGNITUDE}\\b)?`, 'g'),
  // `62k`, `1.2m`, `3bn` — a digit amount with a magnitude on it, digits first.
  new RegExp(`(?<![\\p{L}\\p{N}_.,])${DIGITS}\\s?(?:mn|bn|[kKmMbB])(?![\\p{L}\\p{N}])`, 'gu'),
  // `62 thousand`, `sixty-two thousand dollars`, `18 grand`, `a few thousand`.
  new RegExp(`(?<![\\p{L}\\p{N}])${AMOUNT}(?:\\s+${MAGNITUDE})?\\s+(?:${MONEY_WORD}|thousand|million|billion)(?![\\p{L}])`, 'giu'),
  // `18,375` or `62000`: a thousands comma, or five digits and more.
  /(?<![\p{L}\p{N}_.,])(?:\d{1,3}(?:,\d{3})+|\d{5,})(?:\.\d+)?(?![\p{L}\p{N}])/gu,
];

/** One number in digits, with its percent sign or "per cent" if it has one: the unit D3 compares word for word. */
const NUMBER_TOKEN = /(?<![\p{L}\p{N}_.])\d+(?:[.,]\d+)*(?:%|\s?per ?cent\b)?/giu;

/** An ordered list's own number, `1.` or `2)` at the start of a line. */
const LIST_NUMBER = /^[ \t]*\d+[.)][ \t]/gm;

/** Every number token in `text`, as written. */
export const numberTokens = (text: string): ReadonlySet<string> => new Set([...text.matchAll(NUMBER_TOKEN)].map(([token]) => token));

/** Spans in `text` to strike, earliest first and never overlapping. `allowed` is the D3 source text's tokens. */
export const struckSpans = (text: string, allowed: ReadonlySet<string>): readonly StruckSpan[] => {
  const money: StruckSpan[] = MONEY.flatMap((pattern) => [...text.matchAll(pattern)].map((match) => ({ start: match.index, end: match.index + match[0].length, reason: 'money' as const })));
  const listed = new Set([...text.matchAll(LIST_NUMBER)].map((match) => match.index + match[0].search(/\d/)));
  const within = (index: number): boolean => money.some(({ start, end }) => index >= start && index < end);
  const loose: StruckSpan[] = [...text.matchAll(NUMBER_TOKEN)]
    .filter((match) => !within(match.index) && !listed.has(match.index) && !allowed.has(match[0]))
    .map((match) => ({ start: match.index, end: match.index + match[0].length, reason: 'not in the question or a tool result' as const }));
  const merged: StruckSpan[] = [];
  for (const span of [...money, ...loose].sort((a, b) => a.start - b.start || b.end - a.end)) {
    const last = merged.at(-1);
    if (last !== undefined && span.start < last.end) {
      if (span.end > last.end) merged[merged.length - 1] = { ...last, end: span.end };
    } else merged.push(span);
  }
  return merged;
};
