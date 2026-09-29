// P3-2 — financial-year arithmetic. Australian financial years run 1 July to 30 June and are
// labelled by the calendar year they start in: FY2026-27 is 1 July 2026 to 30 June 2027.
//
// Every expected value below is hand-worked and the working is written beside it. Nothing here was
// produced by running the implementation and pasting the output: an expectation made that way
// proves only that the code agrees with itself.
//
// The characteristic bug of this domain is the right number from the wrong year, and it arrives as
// an off-by-one at a boundary — so the fixtures are deliberately spread across four different
// financial years (2026-27, 2030-31, and the two century rollovers 1999-00 and 2000-01) rather
// than restating one year in several shapes.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  compareFinancialYears,
  endOfFinancialYear,
  financialYearStartYear,
  daysInclusive,
  financialYearsBefore,
  justBeforeFinancialYear,
  nthBirthday,
  startOfFinancialYear,
  toFinancialYear,
} from '../dist/core/financialYear.js';

const SOURCE = readFileSync(
  join(resolve(dirname(fileURLToPath(import.meta.url)), '..'), 'src', 'core', 'financialYear.ts'),
  'utf8',
);

/** The calendar day before an ISO date, computed without the module under test. */
const dayBefore = (iso) => {
  const [year, month, day] = iso.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(date.getUTCDate() - 1);
  return date.toISOString().slice(0, 10);
};

// --- Reading a financial year -------------------------------------------------------------------

test('financialYearStartYear reads the calendar year the year starts in', () => {
  // FY2026-27 starts 1 July 2026; FY2030-31 starts 1 July 2030.
  assert.equal(financialYearStartYear('2026-27'), 2026);
  assert.equal(financialYearStartYear('2030-31'), 2030);
  // The century rollover, where the tail is not "start + 1" in text: 1999 + 1 = 2000, tail "00".
  assert.equal(financialYearStartYear('1999-00'), 1999);
  assert.equal(financialYearStartYear('2000-01'), 2000);
  assert.equal(financialYearStartYear('2099-00'), 2099);
});

test('financialYearStartYear rejects what the template type admits but the calendar does not', () => {
  // `${number}-${number}` admits all of these; none of them is a financial year.
  for (const junk of [
    '2026-2027', // four-digit tail
    '2026-28', // skips a year
    '2026-26', // repeats the year
    '2026-27x',
    '26-27', // two-digit start
    '2026-7', // one-digit tail
    '2026',
    '2026-07-01',
    '',
    '1999-01', // 1999 + 1 = 2000, so the tail is "00"
    '2000-00', // 2000 + 1 = 2001, so the tail is "01"
  ]) {
    assert.throws(() => financialYearStartYear(junk), RangeError, `accepted ${junk}`);
  }
});

test('toFinancialYear writes the label, keeping two digits across the century', () => {
  assert.equal(toFinancialYear(2026), '2026-27');
  assert.equal(toFinancialYear(2030), '2030-31');
  assert.equal(toFinancialYear(1999), '1999-00'); // 2000 % 100 = 0, padded to "00"
  assert.equal(toFinancialYear(2000), '2000-01'); // 2001 % 100 = 1, padded to "01"
  assert.equal(toFinancialYear(2008), '2008-09');
  assert.equal(toFinancialYear(2009), '2009-10');
});

test('toFinancialYear rejects what is not a four-digit starting year', () => {
  for (const junk of [2026.5, Number.NaN, 999, 9999, -2026, Number.POSITIVE_INFINITY]) {
    assert.throws(() => toFinancialYear(junk), RangeError, `accepted ${junk}`);
  }
});

test('reading and writing round-trip in both directions', () => {
  for (const year of [1000, 1999, 2000, 2008, 2026, 2030, 2099, 2100, 9998]) {
    assert.equal(financialYearStartYear(toFinancialYear(year)), year);
  }
  for (const fy of ['1999-00', '2000-01', '2026-27', '2030-31', '2099-00']) {
    assert.equal(toFinancialYear(financialYearStartYear(fy)), fy);
  }
});

// --- Ordering -----------------------------------------------------------------------------------

test('compareFinancialYears orders by the year, including across a decade and a century', () => {
  assert.ok(compareFinancialYears('2026-27', '2030-31') < 0);
  assert.ok(compareFinancialYears('2030-31', '2026-27') > 0);
  assert.equal(compareFinancialYears('2026-27', '2026-27'), 0);
  // The decade boundary: FY2029-30 precedes FY2030-31 even though "29-30" sorts after "30-31"
  // on the tail alone.
  assert.ok(compareFinancialYears('2029-30', '2030-31') < 0);
  // The century boundary: FY1999-00 precedes FY2000-01 even though the tail decreases.
  assert.ok(compareFinancialYears('1999-00', '2000-01') < 0);
  assert.ok(compareFinancialYears('2099-00', '2100-01') < 0);
});

test('compareFinancialYears sorts a shuffled decade into calendar order', () => {
  const shuffled = ['2030-31', '1999-00', '2026-27', '2000-01', '2029-30', '2008-09'];
  assert.deepEqual(
    [...shuffled].sort(compareFinancialYears),
    ['1999-00', '2000-01', '2008-09', '2026-27', '2029-30', '2030-31'],
  );
});

test('compareFinancialYears rejects a malformed year rather than ordering it', () => {
  assert.throws(() => compareFinancialYears('2026-28', '2026-27'), RangeError);
  assert.throws(() => compareFinancialYears('2026-27', '2026-2027'), RangeError);
});

// --- The look-back window -----------------------------------------------------------------------

test('financialYearsBefore returns the preceding years, earliest first', () => {
  // The five-year concessional carry-forward window for FY2026-27 is FY2021-22 to FY2025-26.
  assert.deepEqual(financialYearsBefore('2026-27', 5), [
    '2021-22',
    '2022-23',
    '2023-24',
    '2024-25',
    '2025-26',
  ]);
  // A different year, so the shape is not tied to FY2026-27: the three before FY2030-31.
  assert.deepEqual(financialYearsBefore('2030-31', 3), ['2027-28', '2028-29', '2029-30']);
  assert.deepEqual(financialYearsBefore('2026-27', 1), ['2025-26']);
});

test('financialYearsBefore carries the two-digit tail across the century', () => {
  // The three before FY2001-02 are 1998, 1999, 2000 — tails "99", "00", "01".
  assert.deepEqual(financialYearsBefore('2001-02', 3), ['1998-99', '1999-00', '2000-01']);
});

test('financialYearsBefore with a count of zero is empty, not the year itself', () => {
  assert.deepEqual(financialYearsBefore('2026-27', 0), []);
  assert.deepEqual(financialYearsBefore('2030-31', 0), []);
});

test('financialYearsBefore never includes the year asked about', () => {
  for (const fy of ['2026-27', '2030-31', '2000-01']) {
    for (const count of [0, 1, 5, 20]) {
      const window = financialYearsBefore(fy, count);
      assert.equal(window.length, count);
      assert.ok(!window.includes(fy), `${fy} appeared in its own ${count}-year look-back`);
      assert.ok(window.every((earlier) => compareFinancialYears(earlier, fy) < 0));
    }
  }
});

test('financialYearsBefore is frozen and rejects a count that is not a look-back length', () => {
  assert.ok(Object.isFrozen(financialYearsBefore('2026-27', 3)));
  for (const junk of [-1, 1.5, Number.NaN]) {
    assert.throws(() => financialYearsBefore('2026-27', junk), RangeError, `accepted ${junk}`);
  }
  assert.throws(() => financialYearsBefore('2026-28', 3), RangeError);
});

// --- The 1 July / 30 June boundary --------------------------------------------------------------

test('a financial year runs from 1 July to the following 30 June', () => {
  assert.equal(startOfFinancialYear('2026-27'), '2026-07-01');
  assert.equal(endOfFinancialYear('2026-27'), '2027-06-30');
  assert.equal(startOfFinancialYear('2030-31'), '2030-07-01');
  assert.equal(endOfFinancialYear('2030-31'), '2031-06-30');
  // The century rollover: FY1999-00 is 1 July 1999 to 30 June 2000.
  assert.equal(startOfFinancialYear('1999-00'), '1999-07-01');
  assert.equal(endOfFinancialYear('1999-00'), '2000-06-30');
});

test('justBeforeFinancialYear is the 30 June before the year opens, not the one it closes on', () => {
  // The Total Super Balance tests are taken just before the year starts. For FY2026-27 that is
  // 30 June 2026 — the year *before* the 30 June 2027 the year ends on. Reading the closing date
  // instead would apply a balance measured a full year too late.
  assert.equal(justBeforeFinancialYear('2026-27'), '2026-06-30');
  assert.equal(justBeforeFinancialYear('2030-31'), '2030-06-30');
  assert.equal(justBeforeFinancialYear('1999-00'), '1999-06-30');
  for (const fy of ['2026-27', '2030-31', '1999-00', '2000-01']) {
    assert.notEqual(justBeforeFinancialYear(fy), endOfFinancialYear(fy));
  }
});

test('justBeforeFinancialYear is exactly one day before the year starts', () => {
  // An off-by-one here shifts a whole year of figures silently, so the day before is computed
  // from the calendar rather than from the module.
  for (const fy of ['1999-00', '2000-01', '2008-09', '2026-27', '2030-31', '2099-00']) {
    assert.equal(justBeforeFinancialYear(fy), dayBefore(startOfFinancialYear(fy)));
  }
});

test('the years abut: 30 June closes one year and 1 July opens the next', () => {
  for (const startYear of [1999, 2000, 2008, 2026, 2030, 2099]) {
    const fy = toFinancialYear(startYear);
    const next = toFinancialYear(startYear + 1);
    // 30 June 2027 ends FY2026-27 and is the "just before" date of FY2027-28.
    assert.equal(endOfFinancialYear(fy), justBeforeFinancialYear(next));
    // and 1 July follows it immediately, leaving no day in neither year and none in both.
    assert.equal(startOfFinancialYear(next), '' + (startYear + 1) + '-07-01');
    assert.equal(endOfFinancialYear(fy), dayBefore(startOfFinancialYear(next)));
  }
});

test('the boundary functions reject a malformed year rather than dating it', () => {
  for (const boundary of [startOfFinancialYear, endOfFinancialYear, justBeforeFinancialYear]) {
    assert.throws(() => boundary('2026-28'), RangeError);
    assert.throws(() => boundary('2026-2027'), RangeError);
  }
});

// --- nthBirthday (P3-9 chunk 5b-1) ----------------------------------------------------------------
//
// R13 makes the 65th birthday the backstop TRIS conversion day where the user has stated no
// changeover day: SISR Sch 1 item 106 converts a TRIS automatically at 65, with no notification.
// Nothing in `src/` computed a birthday as a *day* before this, so every expectation below is read
// off a wall calendar, not off the implementation.
//
// The characteristic bug is the right day in the wrong year — the 64th or the 66th birthday — and
// the second is the 29 February date of birth, which has no anniversary in three years out of four.

test('a birthday is the anniversary day, in the year the person attains that age', () => {
  // Born 1 July 1961; the 65th anniversary of that day is 1 July 2026. 1961 + 65 = 2026.
  assert.equal(nthBirthday('1961-07-01', 65), '2026-07-01');
  // Born 31 December 1960 → 31 December 2025. The month and day never move.
  assert.equal(nthBirthday('1960-12-31', 65), '2025-12-31');
  // Born 1 January 1961 → 1 January 2026: one day later than the line above, one year later.
  assert.equal(nthBirthday('1961-01-01', 65), '2026-01-01');
  // Age 0 is the day itself, which is the identity that makes the year arithmetic legible.
  assert.equal(nthBirthday('1961-07-01', 0), '1961-07-01');
});

test('MUTATION — the 64th and the 66th birthday are different days, a whole year apart', () => {
  // `year + age + 1` or `year + age - 1` is the mutation this domain actually suffers, and it moves
  // the conversion day across a financial year boundary: 1961-07-01 + 65 is FY2026-27's first day,
  // + 64 is FY2025-26's and + 66 is FY2027-28's.
  assert.equal(nthBirthday('1961-07-01', 64), '2025-07-01');
  assert.equal(nthBirthday('1961-07-01', 66), '2027-07-01');
  assert.notEqual(nthBirthday('1961-07-01', 65), nthBirthday('1961-07-01', 64));
  assert.notEqual(nthBirthday('1961-07-01', 65), nthBirthday('1961-07-01', 66));
  // And the gap is exactly a year of days, counted by the neighbouring day arithmetic rather than
  // asserted: 2026-07-01 to 2027-07-01 inclusive is 366 days, so 365 days apart.
  assert.equal(daysInclusive(nthBirthday('1961-07-01', 65), nthBirthday('1961-07-01', 66)), 366);
});

test('a 29 February date of birth gets 1 March, and never an impossible date', () => {
  // 1961 is not a leap year, so `1961-02-29` is not a date at all and cannot be a date of birth.
  assert.throws(() => nthBirthday('1961-02-29', 65), RangeError);
  // Born 29 February 1960 (a leap year). 1960 + 65 = 2025, which is not a leap year: 1 March 2025.
  assert.equal(nthBirthday('1960-02-29', 65), '2025-03-01');
  // 1960 + 64 = 2024, which IS a leap year (divisible by 4, not by 100): the anniversary exists.
  assert.equal(nthBirthday('1960-02-29', 64), '2024-02-29');
  // The century rule both ways. 1900 is not a leap year and 2000 is, so a 29 February 1976 birth
  // attains 24 in 2000 on 29 February, and 2100 — divisible by 100, not by 400 — has no 29th.
  assert.equal(nthBirthday('1976-02-29', 24), '2000-02-29');
  assert.equal(nthBirthday('2076-02-29', 24), '2100-03-01');
  // 28 February is the rejected alternative, written down so a silent switch to it fails here.
  assert.notEqual(nthBirthday('1960-02-29', 65), '2025-02-28');
});

test('MUTATION — an impossible day cannot leave the function, however it is reached', () => {
  // The failure mode being excluded is `1960-02-29` + 65 returning the string `2025-02-29`, which
  // matches the `IsoDate` template type, sorts correctly against its neighbours, and is not a day.
  // Validity is checked here against a calendar written out in this file, not against the module.
  const leap = (year) => (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
  const lengths = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  for (const age of [1, 2, 3, 4, 40, 64, 65, 66, 100]) {
    for (const dateOfBirth of ['1960-02-29', '1996-02-29', '2000-02-29']) {
      const [year, month, day] = nthBirthday(dateOfBirth, age).split('-').map(Number);
      const length = lengths[month - 1] + (month === 2 && leap(year) ? 1 : 0);
      assert.ok(day >= 1 && day <= length, `${nthBirthday(dateOfBirth, age)} is not a day of its month`);
    }
  }
  // And the 29ths that DO survive are only the ones in leap years.
  assert.equal(nthBirthday('1996-02-29', 4), '2000-02-29');
  assert.equal(nthBirthday('1996-02-29', 5), '2001-03-01');
});

test('a birthday is a DAY — not a year, not an age', () => {
  // The mutation this defends against is a function that returns 2026, or 65, or `2026-27`. All
  // three would flow on into code expecting an `IsoDate`, and two of the three are numbers that
  // read plausibly in a message. The check is on the source so that a change to the return shape
  // has to be made visibly.
  const declaration = /export const nthBirthday = \(dateOfBirth: IsoDate, age: number\): IsoDate =>/;
  assert.match(SOURCE, declaration);
  for (const dateOfBirth of ['1961-07-01', '1960-02-29', '1999-12-31']) {
    const birthday = nthBirthday(dateOfBirth, 65);
    assert.equal(typeof birthday, 'string');
    assert.match(birthday, /^\d{4}-\d{2}-\d{2}$/);
    // Not a financial year, which is the other four-digit-leading string this module deals in.
    assert.notEqual(birthday.length, '2026-27'.length);
  }
});

test('an age that is not a whole number of years is refused rather than rounded', () => {
  // A birthday is an anniversary. `65.5` is an interval, and rounding it would silently invent a
  // conversion day six months from the one the caller asked for.
  for (const age of [-1, 0.5, 64.9, Number.NaN, Number.POSITIVE_INFINITY]) {
    assert.throws(() => nthBirthday('1961-07-01', age), RangeError);
  }
  // A malformed date of birth is refused by the same calendar check every other date goes through.
  assert.throws(() => nthBirthday('1961-7-1', 65), RangeError);
  assert.throws(() => nthBirthday('1961-13-01', 65), RangeError);
});

test('the 65 is NOT written into core: the age arrives as a parameter', () => {
  // `superannuation.access.automaticReleaseAge` is where the 65 lives, and `conditionOfRelease.ts`
  // is the one module that reads it. A `65` in this file would be a second, unsourced copy of a
  // statutory age — the exact thing the assumptions module exists to prevent. So this function
  // takes the age and supplies only the calendar.
  const body = /export const nthBirthday = [\s\S]*?\n\};/.exec(SOURCE)?.[0] ?? '';
  assert.ok(body.includes('anniversaryYear'), 'the body was not found — the grep below would be vacuous');
  assert.doesNotMatch(body, /\b65\b/);
  assert.doesNotMatch(body, /automaticReleaseAge|ACCESS|SUPERANNUATION/);
});
