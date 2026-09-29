// **THE EXPECTED SUPERANNUATION GUARANTEE, HAND-DERIVED ONCE (P6-8 brief 3, chunk 2b).**
//
// Thirty-odd fixtures across twenty files carry a salary, and from chunk 2b every one of them gains
// an employer contribution. Re-pasting the engine's own answer into each of them is how a wrong
// engine goes green, so the expectation is written ONCE, here, as an arithmetic with no input but
// the fixture's own stated salary — no register lookup, no assumptions object, no import from
// `dist/`. Every figure below is a literal on purpose: `test/core-projection-super-guarantee.test.mjs`
// pins each of them against the dated record it is supposed to be a copy of, so a register change
// that moved the engine and this file together would still fail there.
//
//   * SGAA s 17A(2): the charge is **12%** of the year's qualifying earnings.
//   * SGAA s 10A(5): earnings are capped at the year's maximum contributions base, which is
//     $270,830 in FY2026-27 and is **at least $208,330 in every year** — ITAA 1997 s 960-285(4)
//     makes the concessional cap's $25,000 base amount a floor and the ceiling is monotone in the
//     cap. Pass the ceiling only for a fixture whose salary reaches one.
//   * The walk pays a twelfth of the annual charge each month (`monthlyFromAnnual`).
//   * Income Tax Rates Act 1986 s 26(1)(a): the fund pays **15%** of what arrives, so the balance
//     moves by 85% of the month's contribution.
//
// Every step rounds to the cent, in the order the walk takes them — annual charge, then twelfth,
// then tax — because two of those roundings are visible at these amounts.

/** The whole-year charge on a stated salary, capped at `ceiling` where the fixture reaches one. */
export const annualGuarantee = (annualSalary, ceiling = Number.POSITIVE_INFINITY) =>
  Math.round(Math.min(annualSalary, ceiling) * 0.12);

/** What ARRIVES in the interest in one month: a twelfth of the year's charge, less the fund's 15%. */
export const monthlyGuaranteeCredit = (annualSalary, ceiling = Number.POSITIVE_INFINITY) => {
  const monthly = Math.round(annualGuarantee(annualSalary, ceiling) / 12);
  return monthly - Math.round(monthly * 0.15);
};

/** FY2026-27's published maximum contributions base, in cents — the one year this register derives. */
export const MAXIMUM_CONTRIBUTIONS_BASE_2026_27 = 270_830_00;

/** The floor under every other year's ceiling, in cents. See the header for why it is a floor. */
export const MINIMUM_MAXIMUM_CONTRIBUTIONS_BASE = 208_330_00;
