// Money is integer cents, everywhere, always (P2-4). No float ever holds a dollar amount:
// 0.1 + 0.2 is a rounding error in a forecast that runs 500 months and compounds every one
// of them. Floats appear here only as *rates*, and only inside `mulCents`, which rounds
// straight back to a whole cent.

declare const CENTS: unique symbol;

/** A whole number of cents. Branded so a raw dollar figure cannot be passed where cents are expected. */
export type Cents = number & { readonly [CENTS]: true };

const assertWhole = (n: number): Cents => {
  if (!Number.isSafeInteger(n)) throw new RangeError(`not a whole number of cents: ${n}`);
  return n as Cents;
};

/** Round half away from zero — the convention money uses; `Math.round` rounds half *up*, which is asymmetric across zero. */
const roundCents = (n: number): Cents => assertWhole(Math.sign(n) * Math.round(Math.abs(n)));

/**
 * Dollars as a JS number → cents. A boundary conversion, and the only place a dollar float
 * is tolerated. Prefer `parseAmount` for anything typed by a person: it never sees a float.
 */
export const toCents = (dollars: number): Cents => {
  if (!Number.isFinite(dollars)) throw new RangeError(`not a finite amount: ${dollars}`);
  return roundCents(dollars * 100);
};

/** Cents → dollars as a float. Display boundary only. Never feed the result back into arithmetic. */
export const fromCents = (cents: Cents): number => cents / 100;

/** Parse "1,234.5", "-$20", "0.07" → cents by integer arithmetic on the digits. No float is constructed. */
export const parseAmount = (text: string): Cents => {
  const match = /^\s*(-)?\$?\s*(\d[\d,]*)?(?:\.(\d{1,2}))?\s*$/.exec(text);
  if (!match || (match[2] === undefined && match[3] === undefined)) throw new RangeError(`not an amount: ${text}`);
  const whole = Number((match[2] ?? '0').replaceAll(',', ''));
  const frac = Number((match[3] ?? '').padEnd(2, '0'));
  return assertWhole((match[1] ? -1 : 1) * (whole * 100 + frac));
};

/** Format cents as "$1,234.56" by integer arithmetic — no division, no `Intl` float round-trip. */
export const formatCents = (cents: Cents): string => {
  const abs = Math.abs(cents);
  const whole = String(Math.trunc(abs / 100)).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return `${cents < 0 ? '-' : ''}$${whole}.${String(abs % 100).padStart(2, '0')}`;
};

export const addCents = (a: Cents, b: Cents): Cents => assertWhole(a + b);

export const subCents = (a: Cents, b: Cents): Cents => assertWhole(a - b);

/** Apply a rate (a growth rate, a taper, a tax rate) and round back to a whole cent. */
export const mulCents = (cents: Cents, rate: number): Cents => {
  if (!Number.isFinite(rate)) throw new RangeError(`not a finite rate: ${rate}`);
  return roundCents(cents * rate);
};
