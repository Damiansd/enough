// Financial-year arithmetic, as string arithmetic. No `Date`, no timezone, no clock (P4-1a).
//
// `FinancialYear` is a template literal type — `${number}-${number}` — so the type admits
// `2026-2027` and `2026-28`, neither of which is a financial year. Everything below goes through
// `financialYearStartYear`, which checks the tail is the last two digits of the following calendar
// year, so a malformed year fails at the first arithmetic rather than five steps later inside an
// indexation ratio.
import type { FinancialYear, IsoDate } from '../data/assumptions/types.js'; // `.js` is correct in a `.ts` file — see tsconfig.json

const FINANCIAL_YEAR = /^(\d{4})-(\d{2})$/;

/** `2026-27` → 2026. Throws on anything that is not a well-formed, self-consistent financial year. */
export const financialYearStartYear = (fy: FinancialYear): number => {
  const [, startText, tail] = FINANCIAL_YEAR.exec(fy) ?? [];
  if (startText === undefined || tail === undefined) {
    throw new RangeError(`not a financial year: ${fy} — the form is 2026-27`);
  }
  const start = Number(startText);
  const expected = String((start + 1) % 100).padStart(2, '0');
  if (tail !== expected) throw new RangeError(`not a financial year: ${fy} — ${startText}-${expected} is`);
  return start;
};

/** 2026 → `2026-27`. */
export const toFinancialYear = (startYear: number): FinancialYear => {
  if (!Number.isInteger(startYear) || startYear < 1000 || startYear > 9998) {
    throw new RangeError(`not a financial year starting year: ${startYear}`);
  }
  // The template type cannot express "the tail is the next year", so the cast is the boundary.
  return `${startYear}-${String((startYear + 1) % 100).padStart(2, '0')}` as FinancialYear;
};

/** Negative when `a` is the earlier year. Sorts financial years without parsing them twice at the call site. */
export const compareFinancialYears = (a: FinancialYear, b: FinancialYear): number =>
  financialYearStartYear(a) - financialYearStartYear(b);

/** The `count` financial years immediately before `fy`, **earliest first** — the carry-forward window. */
export const financialYearsBefore = (fy: FinancialYear, count: number): readonly FinancialYear[] => {
  if (!Number.isInteger(count) || count < 0) throw new RangeError(`not a look-back length: ${count}`);
  const start = financialYearStartYear(fy);
  return Object.freeze(
    Array.from({ length: count }, (_unused, offset) => toFinancialYear(start - count + offset)),
  );
};

/** `2026-27` → `2026-07-01`. */
export const startOfFinancialYear = (fy: FinancialYear): IsoDate =>
  `${financialYearStartYear(fy)}-07-01` as IsoDate;

/** `2026-27` → `2027-06-30`. */
export const endOfFinancialYear = (fy: FinancialYear): IsoDate =>
  `${financialYearStartYear(fy) + 1}-06-30` as IsoDate;

/**
 * `2026-27` → `2026-06-30`: the 30 June **immediately before** the year begins.
 *
 * Both Total Super Balance tests in register §3 are taken "just before the start of the financial
 * year" — the carry-forward $500,000 test (s 291-20(3)) and the bring-forward cap space
 * (s 292-85(3)(e)). Having one function for that date is what lets the balance carry the date it
 * was measured at and be checked against the year it is being used for.
 */
export const justBeforeFinancialYear = (fy: FinancialYear): IsoDate =>
  `${financialYearStartYear(fy)}-06-30` as IsoDate;

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * `2026-10-01` → `2026-27`; `2026-06-30` → `2025-26`. The financial year a date falls inside.
 *
 * The month-day comparison is a string comparison, which is only sound on a zero-padded date —
 * `2026-7-1` would sort below `06-30` and land the date a whole year early. `IsoDate` is a
 * template literal type and admits exactly that, so the shape is checked here rather than trusted.
 */
export const financialYearContaining = (date: IsoDate): FinancialYear => {
  if (!ISO_DATE.test(date)) throw new RangeError(`not a zero-padded ISO date: ${date}`);
  const calendarYear = Number(date.slice(0, 4));
  return toFinancialYear(date.slice(5) >= '07-01' ? calendarYear : calendarYear - 1);
};

/** `2026-09` → `2026-27`: the financial year a `YYYY-MM` month falls inside. */
export const financialYearOfMonth = (month: string): FinancialYear => financialYearContaining(`${month}-01` as IsoDate);

/**
 * Consecutive items grouped by the financial year of their `month`, in their own order — one group
 * per year a walk touches. The one grouping both the month table's year rows and the connector's
 * financial-year summary use, so the two cannot put a month in different years.
 */
export const groupByFinancialYear = <T extends { readonly month: string }>(items: readonly T[]): readonly (readonly T[])[] => {
  const groups: T[][] = [];
  for (const item of items) {
    const current = groups.at(-1);
    const head = current?.[0];
    if (current !== undefined && head !== undefined && financialYearOfMonth(head.month) === financialYearOfMonth(item.month)) current.push(item);
    else groups.push([item]);
  }
  return groups;
};

// --- Counting days (P3-10) ----------------------------------------------------------------------
//
// SIS Regulations Sch 7 cl 3 pro-rates the minimum drawdown by *days*, and the word "month"
// appears nowhere in the Schedule — so a day count has to exist, and it has to be exact. It is
// done here rather than with `Date`: `new Date('2027-02-29')` silently becomes 1 March, and a
// `Date` built from a local-time string moves across a timezone. Neither failure would be visible
// in a forecast; both would move money.

const MONTH_LENGTHS: readonly number[] = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

/** Proleptic Gregorian: every fourth year, except centuries, except every fourth century. */
const isLeapYear = (year: number): boolean => (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;

const assertCalendarDate = (date: IsoDate): { year: number; month: number; day: number } => {
  if (!ISO_DATE.test(date)) throw new RangeError(`not a zero-padded ISO date: ${date}`);
  const year = Number(date.slice(0, 4));
  const month = Number(date.slice(5, 7));
  const day = Number(date.slice(8, 10));
  if (month < 1 || month > 12) throw new RangeError(`not a month: ${date}`);
  const length = (MONTH_LENGTHS[month - 1] ?? 0) + (month === 2 && isLeapYear(year) ? 1 : 0);
  if (day < 1 || day > length) throw new RangeError(`not a day of that month: ${date}`);
  return { year, month, day };
};

/**
 * Days since 1970-01-01, by Howard Hinnant's `days_from_civil` — exact integer arithmetic on a
 * proleptic Gregorian calendar, with no `Date` and no clock. Module-private: the only thing this
 * file offers is a *difference* between two dates, because a bare day number is not a quantity
 * anything in this model should be holding.
 */
const daysFromCivil = (date: IsoDate): number => {
  const { year, month, day } = assertCalendarDate(date);
  const shifted = year - (month <= 2 ? 1 : 0);
  const era = Math.floor(shifted / 400);
  const yearOfEra = shifted - era * 400; // [0, 399]
  const dayOfYear = Math.floor((153 * (month + (month > 2 ? -3 : 9)) + 2) / 5) + day - 1; // [0, 365]
  const dayOfEra = yearOfEra * 365 + Math.floor(yearOfEra / 4) - Math.floor(yearOfEra / 100) + dayOfYear;
  return era * 146097 + dayOfEra - 719468;
};

/**
 * The number of days from `from` to `to` **counting both ends** — Sch 7 cl 3's "the number of days
 * in the financial year that include and follow the commencement day", which is inclusive of the
 * commencement day and of 30 June. Throws where `to` precedes `from`: a negative day count is
 * never a proportion.
 */
export const daysInclusive = (from: IsoDate, to: IsoDate): number => {
  const span = daysFromCivil(to) - daysFromCivil(from);
  if (span < 0) throw new RangeError(`${to} is before ${from}: there is no inclusive day count between them`);
  return span + 1;
};

/**
 * 365, or 366 in a financial year containing 29 February — counted off the calendar rather than
 * stated as a rule, so the leap case is the same code path as every other year.
 */
export const daysInFinancialYear = (fy: FinancialYear): number =>
  daysInclusive(startOfFinancialYear(fy), endOfFinancialYear(fy));

// --- Birthdays as days (P3-9 chunk 5b) -----------------------------------------------------------

/**
 * The day a person born on `dateOfBirth` attains `age` — a **day**, not a year and not an age.
 *
 * It is here because this is where the calendar lives: `assertCalendarDate` already knows the
 * month lengths and the proleptic Gregorian leap rule, and building a birthday out of `Date` would
 * reintroduce exactly the two failures the block above exists to avoid.
 *
 * **Why the age is a parameter and not a 65 written in this file.** R13 makes the 65th birthday the
 * backstop conversion day for a TRIS (SISR Sch 1 item 106 converts automatically at 65, with no
 * notification). That 65 is a Setting — `superannuation.access.automaticReleaseAge` — and
 * `conditionOfRelease.ts` is the one module that reads it. A `65` written into this file would be a
 * second, unsourced copy of a statutory age in `core/`, which is the thing the assumptions module
 * exists to prevent. So the caller brings the age and this function brings the calendar.
 *
 * **The 29 February edge, decided here because no ruling covers it.** A person born 1961-02-29 has
 * no anniversary in a non-leap year, and the two candidate days are 28 February and 1 March. This
 * returns **1 March**, for two reasons. (i) It is the day on which the person has *completed* the
 * full year: on 28 February in a non-leap year they have not yet lived the whole of the year that
 * began on 29 February. (ii) The direction of the residual error matches R13's: a later conversion
 * day leaves the stream in accumulation for one more day, charging 15% on fund earnings rather
 * than exempting them, which **understates** the household — the direction every unsourced figure
 * in this project is engineered to fail in. The alternative, 28 February, flatters by a day.
 *
 * The result is put back through `assertCalendarDate` so that a day this function could not
 * actually have produced — 29 February in a non-leap year, most of all — throws here rather than
 * flowing on as a string that only looks like a date.
 */
export const nthBirthday = (dateOfBirth: IsoDate, age: number): IsoDate => {
  if (!Number.isInteger(age) || age < 0) {
    throw new RangeError(`not an age in whole years: ${age} — a birthday is an anniversary, not an interval`);
  }
  const { year, month, day } = assertCalendarDate(dateOfBirth);
  const anniversaryYear = year + age;
  const [birthdayMonth, birthdayDay] =
    month === 2 && day === 29 && !isLeapYear(anniversaryYear) ? [3, 1] : [month, day];
  const birthday = `${String(anniversaryYear).padStart(4, '0')}-${String(birthdayMonth).padStart(2, '0')}-${String(birthdayDay).padStart(2, '0')}`;
  assertCalendarDate(birthday as IsoDate);
  return birthday as IsoDate;
};
