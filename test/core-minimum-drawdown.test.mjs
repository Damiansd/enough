// P3-10 — the account-based pension minimum drawdown. SIS Regulations Sch 7, cll 1 to 5.
//
// **Every expected figure below is hand-worked from Schedule 7 with the arithmetic written out
// beside it.** None of it came from running the implementation. Four of the fixtures are
// published or derived independently of this project — the rounding case, the days case, the
// ordering case, and the ATO's own "Thavi" worked example, which is the only one that exercises
// the cl 4A relief and is the only end-to-end figure ATO publishes — so they check the arithmetic
// as well as the code.
//
// The calculation is `round10( balance × factor × days ÷ daysInYear × relief )`, rounded **once**,
// **last**, to the nearest $10 with an exact $5 going up (cl 5). Amounts are integer cents, so
// $49,380.00 is `4_938_000`.
//
// The year-varying fixtures run in **FY2026-27, FY2027-28 and FY2022-23**. Schedule 7's factors,
// its $10 step and its 1 June date are not indexed and do not vary by year — they are amended, not
// escalated — so what varies across those years is the **day count** (365 against 366), the
// **cl 4A relief** (1 against 1/2) and the **provenance stamp**, and all three are asserted
// directly rather than pretended to be a moving number.
//
// NOT covered here, and not built: the TTR maximum (P3-8) — which the research pass establishes is
// neither pro-rated nor rounded nor age-varying nor switched off by cl 4, because it is
// reg 6.01(2)(b)(ii) and not this Schedule — the transfer balance cap (P3-9), the accumulation and
// retirement phase distinction (P3-7), and franking inside super.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { SUPERANNUATION } from '../dist/data/assumptions/index.js';
import { daysInFinancialYear, daysInclusive } from '../dist/core/financialYear.js';
import {
  MidYearProportioningError,
  PensionBalanceDateError,
  PensionNotCommencedError,
  minimumDrawdown,
  pensionAccountBalance,
} from '../dist/core/minimumDrawdown.js';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = join(ROOT, 'src');

const ACCESS = SUPERANNUATION.access;
const BANDS = ACCESS.minimumDrawdownFactors.value;

/** A Person whose age on 1 July 2026 is exactly `age` — their birthday is that day. */
const bornForAgeAtStartOf2026 = (age) => `${2026 - age}-07-01`;

const balanceOn = (measuredAt, accountBalance, withdrawalBenefit = accountBalance) =>
  pensionAccountBalance({ measuredAt, accountBalance, withdrawalBenefit });

const minimum = ({ fy, dateOfBirth, commencementDay, balance, commuted = false }) =>
  minimumDrawdown({
    fy,
    dateOfBirth,
    commencementDay,
    balance,
    commutedOrRolledOverDuringYear: commuted,
  });

/** A pension that has been running for years: the balance is the 1 July one, and no cl 3 applies. */
const runningPension = ({ fy, dateOfBirth, on, accountBalance, withdrawalBenefit }) =>
  minimum({
    fy,
    dateOfBirth,
    commencementDay: '2020-07-01',
    balance: balanceOn(on, accountBalance, withdrawalBenefit),
  });

// --- The calendar, which every part-year figure below rests on ----------------------------------

test('the day counts are the calendar, counted inclusively of both ends', () => {
  // 1 Jul 2026 – 30 Jun 2027 contains no 29 February; 1 Jul 2027 – 30 Jun 2028 contains 29 Feb 2028.
  assert.equal(daysInFinancialYear('2026-27'), 365);
  assert.equal(daysInFinancialYear('2027-28'), 366);
  assert.equal(daysInFinancialYear('2022-23'), 365);

  // Oct 31 + Nov 30 + Dec 31 + Jan 31 + Feb 28 + Mar 31 + Apr 30 + May 31 + Jun 30 = 273.
  assert.equal(daysInclusive('2026-10-01', '2027-06-30'), 273);
  // The same span one year on, with 29 February inside it: 274.
  assert.equal(daysInclusive('2027-10-01', '2028-06-30'), 274);
  // Aug 31 + Sep 30 + 273 = 334.
  assert.equal(daysInclusive('2026-08-01', '2027-06-30'), 334);
  // Jan 31 + Feb 28 + Mar 31 + Apr 30 + May 31 + Jun 30 = 181 — ATO's own count for 1 Jan 2023.
  assert.equal(daysInclusive('2023-01-01', '2023-06-30'), 181);
  // 31 May and the whole of June: 1 + 30. "Include and follow" is why it is 31 and not 30.
  assert.equal(daysInclusive('2027-05-31', '2027-06-30'), 31);
  // A single day counts as a day.
  assert.equal(daysInclusive('2027-06-30', '2027-06-30'), 1);
});

// --- (a) The rounding direction — cl 5 -----------------------------------------------------------

test('cl 5 rounds to the NEAREST $10 — $987,654.32 at 5% is $49,380, not a ceiling $49,390', () => {
  // 98,765,432 × 5 ÷ 100 = 4,938,271.6 cents = $49,382.716.
  // Nearest $10: 49,382.716 ÷ 10 = 4,938.27… → 4,938 → $49,380.00 = 4,938,000 cents.
  // A ceiling would give 4,939 → $49,390.00, and a floor happens to agree with nearest here.
  const result = runningPension({
    fy: '2026-27',
    dateOfBirth: bornForAgeAtStartOf2026(70),
    on: '2026-07-01',
    accountBalance: 98_765_432,
  });
  assert.equal(result.nil, false);
  assert.equal(result.age, 70);
  assert.equal(result.factor, 0.05);
  assert.equal(result.amount, 4_938_000);
});

test('cl 5 sends an EXACT $5 up, and $4.99 down — the clause\'s own tie case', () => {
  const age = 70; // 5%.
  const dateOfBirth = bornForAgeAtStartOf2026(age);

  // $200,100.00 × 5% = $10,005.00 exactly — the tie the second sentence of cl 5 exists for.
  // "Rounded up to the next 10 whole dollars" → $10,010.00 = 1,001,000 cents.
  // Nearest-with-ties-down, half-to-even, floor and truncation all give $10,000.00 here.
  const tie = runningPension({ fy: '2026-27', dateOfBirth, on: '2026-07-01', accountBalance: 20_010_000 });
  assert.equal(tie.amount, 1_001_000);

  // $200,099.80 × 5% = $10,004.99 — one cent below the tie, and nearer $10,000.00.
  const below = runningPension({ fy: '2026-27', dateOfBirth, on: '2026-07-01', accountBalance: 20_009_980 });
  assert.equal(below.amount, 1_000_000);

  // $200,100.20 × 5% = $10,005.01 — one cent above it, and nearer $10,010.00.
  const above = runningPension({ fy: '2026-27', dateOfBirth, on: '2026-07-01', accountBalance: 20_010_020 });
  assert.equal(above.amount, 1_001_000);
});

// --- (b) The order — cl 3 first, cl 5 once and last ----------------------------------------------

test('cl 3 pro-rates before cl 5 rounds: $1,009,078 from 1 Aug 2026 is $36,940, not $36,930', () => {
  // Statutory order: 100,907,800 × 4 ÷ 100 = 4,036,312 cents;
  //   × 334 ÷ 365 = 1,348,128,208 ÷ 365 = 3,693,501.94… cents = $36,935.0194;
  //   nearest $10 → 3,694,000 cents = $36,940.00.
  // Round-first order: round10($40,363.12) = $40,360.00; × 334 ÷ 365 = $36,932.16;
  //   nearest $10 → $36,930.00. The two orders differ by a whole step.
  const result = minimum({
    fy: '2026-27',
    dateOfBirth: bornForAgeAtStartOf2026(60),
    commencementDay: '2026-08-01',
    balance: balanceOn('2026-08-01', 100_907_800),
  });
  assert.equal(result.nil, false);
  assert.equal(result.factor, 0.04);
  assert.equal(result.days, 334);
  assert.equal(result.daysInYear, 365);
  assert.equal(result.amount, 3_694_000);
});

// --- (c) The basis — days, including the commencement day — cl 3 ---------------------------------

test('cl 3 pro-rates in DAYS: $500,000 from 1 Oct 2026 is $14,960, not the $15,000 nine months give', () => {
  // 50,000,000 × 4 ÷ 100 = 2,000,000 cents; × 273 ÷ 365 = 546,000,000 ÷ 365 = 1,495,890.41 cents
  //   = $14,958.9041; nearest $10 → 1,496,000 cents = $14,960.00.
  // Whole months (9/12) would give $20,000 × 0.75 = $15,000.00 = 1,500,000 cents.
  // Excluding the commencement day (272 days) would give 2,000,000 × 272 ÷ 365 = $14,904.11
  //   → $14,900.00 = 1,490,000 cents.
  const result = minimum({
    fy: '2026-27',
    dateOfBirth: bornForAgeAtStartOf2026(60),
    commencementDay: '2026-10-01',
    balance: balanceOn('2026-10-01', 50_000_000),
  });
  assert.equal(result.nil, false);
  assert.equal(result.proRated, true);
  assert.equal(result.days, 273);
  assert.equal(result.amount, 1_496_000);
  assert.notEqual(result.amount, 1_500_000);
  assert.notEqual(result.amount, 1_490_000);
});

test('a 31 May commencement is 31 days, not 30 — cl 3 includes the commencement day', () => {
  // 50,000,000 × 4 ÷ 100 = 2,000,000; × 31 ÷ 365 = 62,000,000 ÷ 365 = 169,863.01 cents
  //   = $1,698.63; nearest $10 → 170,000 cents = $1,700.00.
  // Excluding the day: × 30 ÷ 365 = $1,643.84 → $1,640.00 = 164,000 cents.
  const result = minimum({
    fy: '2026-27',
    dateOfBirth: bornForAgeAtStartOf2026(60),
    commencementDay: '2027-05-31',
    balance: balanceOn('2027-05-31', 50_000_000),
  });
  assert.equal(result.nil, false);
  assert.equal(result.days, 31);
  assert.equal(result.amount, 170_000);
  assert.notEqual(result.amount, 164_000);
});

test('a 1 July commencement is not pro-rated at all — cl 3 says "a day other than 1 July"', () => {
  // 50,000,000 × 4 ÷ 100 = 2,000,000 cents = $20,000.00, already a whole $10.
  const result = minimum({
    fy: '2026-27',
    dateOfBirth: bornForAgeAtStartOf2026(60),
    commencementDay: '2026-07-01',
    balance: balanceOn('2026-07-01', 50_000_000),
  });
  assert.equal(result.nil, false);
  assert.equal(result.isCommencementYear, true);
  assert.equal(result.proRated, false);
  assert.equal(result.days, 365);
  assert.equal(result.amount, 2_000_000);
});

// --- (d) Which balance, and which age, in a commencement year — cl 1(2) --------------------------

test('a commencement year reads the COMMENCEMENT-DAY balance — a 1 July balance is refused', () => {
  const balance = balanceOn('2026-07-01', 50_000_000);
  assert.throws(
    () => minimum({ fy: '2026-27', dateOfBirth: bornForAgeAtStartOf2026(60), commencementDay: '2026-10-01', balance }),
    (error) => {
      assert.ok(error instanceof PensionBalanceDateError);
      assert.match(error.message, /must be the balance on 2026-10-01/);
      assert.match(error.message, /cl 1\(2\)\(a\)\(ii\)/);
      return true;
    },
  );

  // And the mirror image: a later year reads the 1 July balance and nothing else.
  assert.throws(
    () =>
      minimum({
        fy: '2027-28',
        dateOfBirth: bornForAgeAtStartOf2026(60),
        commencementDay: '2026-10-01',
        balance: balanceOn('2026-10-01', 50_000_000),
      }),
    PensionBalanceDateError,
  );
});

test('the full annual factor applies to the commencement-day balance — the balance is never scaled', () => {
  // The same $500,000 on the same day as the days fixture above: the factor stays 4%, the balance
  // stays $500,000, and the only part-year adjustment is cl 3's 273/365. A model that instead
  // annualised the balance (500,000 × 365/273) and then pro-rated would land back on $20,000.
  const result = minimum({
    fy: '2026-27',
    dateOfBirth: bornForAgeAtStartOf2026(60),
    commencementDay: '2026-10-01',
    balance: balanceOn('2026-10-01', 50_000_000),
  });
  assert.equal(result.balance.value, 50_000_000);
  assert.equal(result.factor, 0.04);
  assert.equal(result.relevantDay, '2026-10-01');
  assert.equal(result.amount, 1_496_000);
});

test('the age is the age on the COMMENCEMENT DAY, not on 1 July — a September 65th birthday', () => {
  // Born 15 Sep 1961: 64 on 1 July 2026, 65 on 1 October 2026. cl 1(2) takes the commencement day
  // in a commencement year, so the factor is 5%, not 4%.
  // 50,000,000 × 5 ÷ 100 = 2,500,000; × 273 ÷ 365 = 682,500,000 ÷ 365 = 1,869,863.01 cents
  //   = $18,698.63; nearest $10 → 1,870,000 cents = $18,700.00.
  // Age at 1 July (64 → 4%) would give the $14,960.00 of the fixture above — a $3,740 difference.
  const result = minimum({
    fy: '2026-27',
    dateOfBirth: '1961-09-15',
    commencementDay: '2026-10-01',
    balance: balanceOn('2026-10-01', 50_000_000),
  });
  assert.equal(result.nil, false);
  assert.equal(result.age, 65);
  assert.equal(result.factor, 0.05);
  assert.equal(result.amount, 1_870_000);
  assert.notEqual(result.amount, 1_496_000);
});

test('in a later year the age is the age on 1 July — the same Person, one year on', () => {
  // Born 15 Sep 1961: 65 on 1 July 2027 (they turned 65 in September 2026), so 5% on the 1 July
  // balance. 50,000,000 × 5 ÷ 100 = 2,500,000 cents = $25,000.00, already a whole $10.
  const result = minimum({
    fy: '2027-28',
    dateOfBirth: '1961-09-15',
    commencementDay: '2026-10-01',
    balance: balanceOn('2027-07-01', 50_000_000),
  });
  assert.equal(result.nil, false);
  assert.equal(result.isCommencementYear, false);
  assert.equal(result.relevantDay, '2027-07-01');
  assert.equal(result.age, 65);
  assert.equal(result.amount, 2_500_000);
});

// --- cl 1(2)(b) — the withdrawal-benefit floor ---------------------------------------------------

test('cl 1(2)(b) substitutes the withdrawal benefit where it exceeds the account balance', () => {
  // 52,000,000 × 4 ÷ 100 = 2,080,000 cents = $20,800.00, already a whole $10.
  // Ignoring the substitution would give 50,000,000 × 4% = $20,000.00 — $800 less every year.
  const substituted = runningPension({
    fy: '2026-27',
    dateOfBirth: bornForAgeAtStartOf2026(60),
    on: '2026-07-01',
    accountBalance: 50_000_000,
    withdrawalBenefit: 52_000_000,
  });
  assert.equal(substituted.balance.withdrawalBenefitSubstituted, true);
  assert.equal(substituted.balance.value, 52_000_000);
  assert.equal(substituted.amount, 2_080_000);
  assert.notEqual(substituted.amount, 2_000_000);

  // It is a floor, not a switch: a smaller withdrawal benefit changes nothing.
  const notSubstituted = runningPension({
    fy: '2026-27',
    dateOfBirth: bornForAgeAtStartOf2026(60),
    on: '2026-07-01',
    accountBalance: 50_000_000,
    withdrawalBenefit: 48_000_000,
  });
  assert.equal(notSubstituted.balance.withdrawalBenefitSubstituted, false);
  assert.equal(notSubstituted.amount, 2_000_000);
});

test('a balance cannot be built without stating the withdrawal benefit', () => {
  // The runtime half of the defence; the compile-time half is that `minimumDrawdown` takes a
  // branded `PensionAccountBalance` and there is no other constructor for one.
  assert.throws(() => pensionAccountBalance({ measuredAt: '2026-07-01', accountBalance: -1, withdrawalBenefit: 0 }), RangeError);
  assert.throws(() => pensionAccountBalance({ measuredAt: '2026-7-1', accountBalance: 1, withdrawalBenefit: 1 }), RangeError);
});

// --- cl 4 — nil from 1 June, and it is a cliff ---------------------------------------------------

test('cl 4 makes the minimum NIL for a commencement on or after 1 June, and the day itself counts', () => {
  const fixture = (commencementDay) =>
    minimum({
      fy: '2026-27',
      dateOfBirth: bornForAgeAtStartOf2026(60),
      commencementDay,
      balance: balanceOn(commencementDay, 50_000_000),
    });

  for (const day of ['2027-06-01', '2027-06-15', '2027-06-30']) {
    const result = fixture(day);
    assert.equal(result.nil, true, `${day} should be nil`);
    assert.equal(result.amount, 0);
    assert.equal(result.nilFrom, '2027-06-01');
    // The determination is switched off, so there is no factor and no day count to read off it.
    assert.equal(result.factor, undefined);
    assert.equal(result.days, undefined);
  }

  // The day before the cliff is not nil, and it is not nearly nil either: 31 days of pro-rating.
  const dayBefore = fixture('2027-05-31');
  assert.equal(dayBefore.nil, false);
  assert.equal(dayBefore.amount, 170_000);
});

test('cl 4 is confined to the commencement year — the year after a June commencement is a full year', () => {
  // 50,000,000 × 4 ÷ 100 = 2,000,000 cents = $20,000.00 on the 1 July 2027 balance.
  const result = minimum({
    fy: '2027-28',
    dateOfBirth: bornForAgeAtStartOf2026(60),
    commencementDay: '2027-06-15',
    balance: balanceOn('2027-07-01', 50_000_000),
  });
  assert.equal(result.nil, false);
  assert.equal(result.proRated, false);
  assert.equal(result.amount, 2_000_000);
});

// --- The table — every band, and every boundary age ----------------------------------------------

test('every Schedule 7 band and every boundary age, on $1,000,000 at 1 July', () => {
  // 100,000,000 cents × the factor, all of them already whole $10:
  //   4% → 4,000,000 · 5% → 5,000,000 · 6% → 6,000,000 · 7% → 7,000,000
  //   9% → 9,000,000 · 11% → 11,000,000 · 14% → 14,000,000
  // Both endpoints of every band are tested, not merely a value inside it: the table's bands are
  // "65—74", "75—79", "80—84", "85—89", "90—94" and "95 or more", inclusive at both ends.
  const expected = [
    [60, 0.04, 4_000_000],
    [64, 0.04, 4_000_000],
    [65, 0.05, 5_000_000],
    [74, 0.05, 5_000_000],
    [75, 0.06, 6_000_000],
    [79, 0.06, 6_000_000],
    [80, 0.07, 7_000_000],
    [84, 0.07, 7_000_000],
    [85, 0.09, 9_000_000],
    [89, 0.09, 9_000_000],
    [90, 0.11, 11_000_000],
    [94, 0.11, 11_000_000],
    [95, 0.14, 14_000_000],
    [101, 0.14, 14_000_000],
  ];

  for (const [age, factor, amount] of expected) {
    const result = runningPension({
      fy: '2026-27',
      dateOfBirth: bornForAgeAtStartOf2026(age),
      on: '2026-07-01',
      accountBalance: 100_000_000,
    });
    assert.equal(result.age, age, `age ${age}`);
    assert.equal(result.factor, factor, `factor at ${age}`);
    assert.equal(result.amount, amount, `minimum at ${age}`);
  }

  // The boundaries above are the record's own, so a changed record fails here rather than drifting.
  assert.deepEqual(
    BANDS.map((band) => band.fromAge),
    [0, 65, 75, 80, 85, 90, 95],
  );
  assert.deepEqual(
    BANDS.map((band) => band.factor),
    [0.04, 0.05, 0.06, 0.07, 0.09, 0.11, 0.14],
  );
});

// --- cl 4A/4B — the relief, and the ATO's own worked example -------------------------------------

test("ATO's worked example reproduces to the dollar: $250,000 from 1 Jan 2023 at 66 is $3,100", () => {
  // The one end-to-end figure ATO publishes, and it checks four things this file gets from four
  // different clauses at once: the commencement-day balance, the days basis inclusive of the start
  // day, the single rounding after pro-rating, and cl 4A's halving for FY2022-23.
  // 25,000,000 × 5 ÷ 100 = 1,250,000 cents = $12,500.00 annual, halved by cl 4A to $6,250.00;
  //   × 181 ÷ 365 = 1,131,250,000 ÷ 365 = 309,931.5 cents = $3,099.315;
  //   nearest $10 → 310,000 cents = $3,100.00 — ATO's figure.
  const result = minimum({
    fy: '2022-23',
    dateOfBirth: '1956-01-15', // 66 on 1 January 2023.
    commencementDay: '2023-01-01',
    balance: balanceOn('2023-01-01', 25_000_000),
  });
  assert.equal(result.nil, false);
  assert.equal(result.age, 66);
  assert.equal(result.factor, 0.05);
  assert.equal(result.days, 181);
  assert.deepEqual(result.relief, { numerator: 1, denominator: 2 });
  assert.equal(result.amount, 310_000);
});

test('the relief is 1 for FY2026-27 — cl 4A and cl 4B name years, and neither names this one', () => {
  const result = runningPension({
    fy: '2026-27',
    dateOfBirth: bornForAgeAtStartOf2026(70),
    on: '2026-07-01',
    accountBalance: 100_000_000,
  });
  assert.deepEqual(result.relief, { numerator: 1, denominator: 1 });
  assert.equal(result.amount, 5_000_000); // 100,000,000 × 5% = $50,000.00, unhalved.

  // The lists themselves, from the record: the last relief year is FY2022-23 and there is nothing
  // after it — the clauses were extended by naming a year, and never were after F2022L00498.
  const relieved = Object.keys(ACCESS.minimumDrawdownRelief.value).sort();
  assert.deepEqual(relieved, [
    '2008-09',
    '2009-10',
    '2010-11',
    '2011-12',
    '2012-13',
    '2019-20',
    '2020-21',
    '2021-22',
    '2022-23',
  ]);
  assert.equal(ACCESS.minimumDrawdownRelief.value['2026-27'], undefined);
  assert.deepEqual(ACCESS.minimumDrawdownRelief.value['2011-12'], { numerator: 3, denominator: 4 });
});

// --- Two financial years, and what actually varies between them ----------------------------------

test('the leap year changes the denominator: the same pension one year on is $14,970, not $14,960', () => {
  // FY2027-28 contains 29 February 2028, so 1 Oct 2027 → 30 Jun 2028 is 274 days out of 366.
  // 50,000,000 × 4 ÷ 100 = 2,000,000; × 274 ÷ 366 = 548,000,000 ÷ 366 = 1,497,267.76 cents
  //   = $14,972.68; nearest $10 → 1,497,000 cents = $14,970.00.
  const leap = minimum({
    fy: '2027-28',
    dateOfBirth: bornForAgeAtStartOf2026(60),
    commencementDay: '2027-10-01',
    balance: balanceOn('2027-10-01', 50_000_000),
  });
  assert.equal(leap.days, 274);
  assert.equal(leap.daysInYear, 366);
  assert.equal(leap.amount, 1_497_000);

  // The identical facts in the 365-day year: 273/365 → $14,960.00.
  const ordinary = minimum({
    fy: '2026-27',
    dateOfBirth: bornForAgeAtStartOf2026(60),
    commencementDay: '2026-10-01',
    balance: balanceOn('2026-10-01', 50_000_000),
  });
  assert.equal(ordinary.daysInYear, 365);
  assert.equal(ordinary.amount, 1_496_000);
});

test('a full-year minimum is year-invariant by construction, and says so through its stamp', () => {
  // Schedule 7's factors are not indexed — they are hard numbers in the instrument's table, amended
  // only by amending regulation — so a full year at the same age on the same balance is the same
  // number in every year, and pretending otherwise would be a fixture that tests nothing. What
  // does change between the years is the provenance: the records were read from the compilation in
  // force for FY2026-27, and using them for FY2027-28 says so rather than passing silently.
  const facts = { dateOfBirth: bornForAgeAtStartOf2026(70), accountBalance: 100_000_000 };
  const thisYear = runningPension({ fy: '2026-27', on: '2026-07-01', ...facts });
  const nextYear = runningPension({ fy: '2027-28', on: '2027-07-01', ...facts });

  assert.equal(thisYear.amount, 5_000_000);
  assert.equal(nextYear.amount, 5_000_000);
  assert.deepEqual(thisYear.provenance.caveats, []);
  assert.equal(thisYear.provenance.confidence, 'primary-verified');
  assert.equal(nextYear.provenance.fy, '2027-28');
  assert.ok(
    nextYear.provenance.caveats.some((line) => /minimumDrawdownFactors is stamped FY2026-27/.test(line)),
    nextYear.provenance.caveats.join(' · '),
  );
});

// --- Provenance — the unstated denominator rides only where it is used ---------------------------

test('a part-year minimum is secondary-only: cl 3 never states the denominator', () => {
  const proRated = minimum({
    fy: '2026-27',
    dateOfBirth: bornForAgeAtStartOf2026(60),
    commencementDay: '2026-10-01',
    balance: balanceOn('2026-10-01', 50_000_000),
  });
  assert.equal(proRated.provenance.confidence, 'secondary-only');
  assert.ok(
    proRated.provenance.caveats.some((line) =>
      /minimumDrawdownProRataDenominator is secondary-only/.test(line),
    ),
    proRated.provenance.caveats.join(' · '),
  );

  // And it does not leak onto a year that does not depend on it. A full year's proportion is 1
  // whatever the denominator is, so 365-against-366 cannot move it.
  const fullYear = runningPension({
    fy: '2026-27',
    dateOfBirth: bornForAgeAtStartOf2026(60),
    on: '2026-07-01',
    accountBalance: 50_000_000,
  });
  assert.equal(fullYear.provenance.confidence, 'primary-verified');
  assert.deepEqual(fullYear.provenance.caveats, []);

  // A 1 July commencement is a commencement year that cl 3 does not reach, so it is not caveated.
  const firstDay = minimum({
    fy: '2026-27',
    dateOfBirth: bornForAgeAtStartOf2026(60),
    commencementDay: '2026-07-01',
    balance: balanceOn('2026-07-01', 50_000_000),
  });
  assert.equal(firstDay.provenance.confidence, 'primary-verified');
});

test('a nil year carries the cl 4 record it was decided by', () => {
  const result = minimum({
    fy: '2026-27',
    dateOfBirth: bornForAgeAtStartOf2026(60),
    commencementDay: '2027-06-01',
    balance: balanceOn('2027-06-01', 50_000_000),
  });
  assert.equal(result.provenance.fy, '2026-27');
  assert.equal(result.provenance.confidence, 'primary-verified');
  assert.equal(ACCESS.minimumDrawdownNilFrom.value, '06-01');
});

// --- Refusals ------------------------------------------------------------------------------------

test('a pension that has not commenced has no minimum — it is refused, not returned as nil', () => {
  assert.throws(
    () =>
      minimum({
        fy: '2026-27',
        dateOfBirth: bornForAgeAtStartOf2026(60),
        commencementDay: '2027-10-01',
        balance: balanceOn('2027-10-01', 50_000_000),
      }),
    PensionNotCommencedError,
  );
});

test('a year with a commutation or a rollover in it is refused — cl 3 knows one proportioning event', () => {
  assert.throws(
    () =>
      minimum({
        fy: '2026-27',
        dateOfBirth: bornForAgeAtStartOf2026(60),
        commencementDay: '2020-07-01',
        balance: balanceOn('2026-07-01', 50_000_000),
        commuted: true,
      }),
    (error) => {
      assert.ok(error instanceof MidYearProportioningError);
      assert.match(error.message, /U7/);
      return true;
    },
  );
});

test('the figure is frozen, and its result is integer cents', () => {
  const result = runningPension({
    fy: '2026-27',
    dateOfBirth: bornForAgeAtStartOf2026(70),
    on: '2026-07-01',
    accountBalance: 98_765_432,
  });
  assert.ok(Object.isFrozen(result));
  assert.ok(Number.isSafeInteger(result.amount));
  assert.throws(() => {
    result.amount = 0;
  }, TypeError);
});

// --- The record-not-consumed canary --------------------------------------------------------------

/** Comments and strings quote the Schedule on purpose; the greps below are about the *code*. */
const executableCode = (text) =>
  text
    .replaceAll(/\/\*[\s\S]*?\*\//g, '')
    .replaceAll(/`(?:[^`\\]|\\.)*`|'(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*"|\/\/.*$/gm, (match) =>
      match.startsWith('//') ? '' : '""',
    );

/** Every word in the file — comment markers removed, whitespace flattened so a claim that wraps across lines still reads as one sentence. */
const flatten = (text) => text.replaceAll(/^[ \t]*(?:\/\/|\*\/|\/\*\*?|\*)[ \t]?/gm, '').replaceAll(/\s+/g, ' ');

const RAW = readFileSync(join(SRC, 'core', 'minimumDrawdown.ts'), 'utf8');
const CODE = executableCode(RAW);
const PROSE = flatten(RAW);

test('the source grep is not vacuous — stripping leaves the executable code behind', () => {
  assert.match(CODE, /\bexport const minimumDrawdown\b/);
  assert.match(CODE, /\bexport const pensionAccountBalance\b/);
  // The prose derivation is the other half: it keeps the comments the executable one throws away,
  // and joins a sentence that wraps across `//` lines back into one line to be grepped.
  assert.ok(PROSE.length > CODE.length, 'the prose derivation must keep the comments, not strip them');
  assert.match(flatten('//     wrapped across\n//     two lines'), /wrapped across two lines/);
  assert.match(PROSE, /Register §3\.9 states that exception in terms/);
  assert.ok(CODE.length > 500);
  assert.match(executableCode("const x = 0.04; // 4%\nconst factor = 0.05;"), /0\.05/);
});

test('MUTATION — hard-coding a factor, the $10 step, the 1 June date or 365 instead of the records', () => {
  // Every one of these substitutions is *correct* today, so no fixture above can see it: the
  // arithmetic is identical. The defence is that none of the Schedule's numbers appears in
  // executable code at all — the only numeric literals in the file are 0, 1, 2 and the rational
  // scale, none of which is a figure from the instrument.
  const literals = [...CODE.matchAll(/(?<![\w.])\d[\d_]*(?:\.\d+)?/g)].map(([match]) => match);
  assert.deepEqual([...new Set(literals)].sort(), ['0', '1', '1_000_000', '2']);

  for (const forbidden of [/\b0\.0[4-9]\b/, /\b0\.1[14]\b/, /\b365\b/, /\b366\b/, /\b1000\b/, /\b10\b/]) {
    assert.doesNotMatch(CODE, forbidden, `${forbidden} must be read from a record, never written`);
  }

  assert.match(CODE, /ACCESS\.minimumDrawdownFactors/);
  assert.match(CODE, /ACCESS\.minimumDrawdownRoundingStep\.value/);
  assert.match(CODE, /ACCESS\.minimumDrawdownNilFrom\.value/);
  assert.match(CODE, /ACCESS\.minimumDrawdownRelief\.value/);
});

test('the Schedule is not something a caller can supply an answer to', () => {
  // No age, no factor, no proportion, no day count and no rounded figure in the signature — the
  // wrong reading of any of the four undetermined points is not expressible at a call site.
  const signature = /export const minimumDrawdown = \(input: \{([\s\S]*?)\}\): MinimumDrawdown/.exec(CODE)?.[1] ?? '';
  assert.ok(signature.length > 0);
  for (const absent of [/\bage\b/, /\bfactor\b/, /\bdays\b/, /\bmonths\b/, /\bproportion\b/, /\bamount\b/]) {
    assert.doesNotMatch(signature, absent, `${absent} must not be a parameter`);
  }
  assert.match(signature, /dateOfBirth: IsoDate/);
  assert.match(signature, /commencementDay: IsoDate/);
  assert.match(signature, /balance: PensionAccountBalance/);
  assert.match(signature, /commutedOrRolledOverDuringYear: boolean/);

  // And there is exactly one rounding in the file: one definition, called from one place.
  assert.equal([...CODE.matchAll(/const roundHalfUpToStep =/g)].length, 1);
  assert.equal([...CODE.matchAll(/roundHalfUpToStep\(/g)].length, 1);
  assert.deepEqual([...CODE.matchAll(/Math\.\w+/g)].map(([match]) => match), ['Math.round', 'Math.floor']);
});

test('MUTATION — the retracted claim about what §3.9 says cannot come back, in the message or the header', () => {
  // CORRECTED 2026-09-11 (P3-33). Until today `PensionBalanceDateError`'s message told a caller
  // that the commencement-day rule is "not on 1 July, which register §3.9 says and which is the
  // one thing in the row that is wrong", and the file header said the same of the row. Both were
  // true when written — this module was last edited 2026-09-08 (4e26760) — and false the next
  // morning: §3.9's "Which balance" row was corrected on 2026-09-09 and now carries the
  // commencement-day exception in capitals, the 1 July wording surviving there only as quoted
  // superseded text. The refusal itself was never in doubt and is unchanged; only its account of
  // the register was.
  //
  // Absence rather than a count, which is the departure from the div296.ts canary: §3.9 already
  // keeps the one quoted copy of the superseded reading inside the note recording it as
  // superseded, so `src/` needs none and any copy here is a live claim rather than an evidence
  // record. And the header is asserted as well as the message — the header carried the identical
  // sentence, and it is the half that nothing was watching.
  let message = '';
  assert.throws(
    () =>
      minimum({
        fy: '2026-27',
        dateOfBirth: bornForAgeAtStartOf2026(60),
        commencementDay: '2026-10-01',
        balance: balanceOn('2026-07-01', 50_000_000),
      }),
    (error) => {
      message = error.message;
      return true;
    },
  );

  // The refusal still refuses, on the same clause, for the same day.
  assert.match(message, /must be the balance on 2026-10-01/);
  assert.match(message, /cl 1\(2\)\(a\)\(ii\)/);
  assert.match(message, /not on 1 July/);
  // And where it names the register it now names it in agreement — once, in one frame. The count
  // is what closes the reword: the retracted claim can be paraphrased around any word list, but
  // not without naming the register or the row a second time, or displacing this frame.
  assert.match(message, /§3\.9's "Which balance" row (?:states|carries)/);
  assert.equal([...message.matchAll(/§3\.9/g)].length, 1, 'one mention of the section, in the frame above');
  assert.equal([...message.matchAll(/\bregister\b/gi)].length, 1, 'one mention of the register, in the frame above');
  assert.equal([...message.matchAll(/\brow\b/gi)].length, 1, 'one mention of the row, in the frame above');

  const forbidden = [
    /register §3\.9 says/i,
    /(?:§3\.9|the register|the row)[^.]{0,60}\bsays\b[^.]{0,60}1 July/i,
    /(?:§3\.9|the register|the row)[^.]{0,80}\b(?:is|was|are|were)\s+wrong\b/i,
    /\bwrong\b[^.]{0,40}(?:§3\.9|the register|the row)\b/i,
    /one thing in the row that is wrong/i,
    /"on the 1 July balance" is wrong/i,
  ];
  for (const shape of forbidden) {
    assert.doesNotMatch(
      message,
      shape,
      `${shape} — the refusal may not tell a caller the register says something §3.9 has not said since 2026-09-09`,
    );
    assert.doesNotMatch(
      PROSE,
      shape,
      `${shape} — the header carried the same stale sentence, and a comment is where it went unwatched`,
    );
  }

  // A reword is the failure mode this correction exists to stop, so the message is also held to
  // what it is *about*: a date stamp on a supplied balance. It grades no document. Every one of
  // these words is one the retracted claim needed and this refusal does not.
  for (const grading of [/\bwrong\b/i, /\bincorrect\b/i, /\bmistaken\b/i, /\bin error\b/i, /\bcontradict/i, /\botherwise\b/i]) {
    assert.doesNotMatch(
      message,
      grading,
      `${grading} — this refusal states which day cl 1(2)(a) names; it does not rule on the register`,
    );
  }

  // The retraction is recorded in the file, so the next reader finds the history rather than
  // rediscovering the row.
  assert.match(PROSE, /Until 2026-09-11 this paragraph and the refusal below both misdescribed §3\.9/);
  for (const required of [/2026-09-09/, /4e26760/, /"Which balance"/]) {
    assert.match(PROSE, required, `${required} is the evidence the correction rests on and must stay in the file`);
  }
});

// --- T120: a TRIS converting at 65 is not a stream commencing --------------------------------------

test('T120 — the conversion year is not a commencement year: the whole-year minimum, on the 1 July facts', () => {
  // §1's T120 row, in terms: "TRIS commenced 2020, member turns 65 on 1 December 2026. The FY2026-27
  // Schedule 7 minimum must be computed on the 1 July 2026 balance, the age at 1 July 2026, with no
  // pro-rating and no cl 4 nil rule. An implementation that re-reads the balance on 1 December and
  // pro-rates 211/365 produces a smaller, entirely plausible minimum."
  //
  // **Measured 2026-09-16 by O66 batch 3, and this fixture exists because of the measurement.**
  // Pro-rating the conversion year — `isCommencementYear || the 65th birthday falls in fy`, with the
  // age read from `superannuation.access.automaticReleaseAge` so no unsourced literal appears —
  // failed ZERO tests. Nothing in the suite held a Person who turned 65 in a year their pension did
  // not commence in, so the one edit that moves this figure moved it silently.
  //
  // Born 1 December 1961 → 65 on 1 December 2026, inside FY2026-27. The stream commenced 1 July
  // 2020, so FY2026-27 is an ordinary year: cl 1(2)(a)(i)'s 1 July balance and cl 1(2)'s age on
  // that same day, which is 64 — the 0-to-64 band, 4%. $500,000 × 4% = $20,000, whole year.
  const converting = minimum({
    fy: '2026-27',
    dateOfBirth: '1961-12-01',
    commencementDay: '2020-07-01',
    balance: balanceOn('2026-07-01', 50_000_000),
  });
  assert.equal(converting.amount, 2_000_000);
  assert.equal(converting.isCommencementYear, false);
  assert.equal(converting.proRated, false, 'cl 3 reaches only the year the pension COMMENCES');
  assert.equal(converting.days, daysInFinancialYear('2026-27'));
  assert.equal(converting.relevantDay, '2026-07-01', 'the balance day is 1 July, never the birthday');
  assert.equal(converting.age, 64, 'cl 1(2) takes the age on the relevant day, and that day is 1 July');
  assert.equal(converting.nil, false, 'cl 4 reaches only a commencement on or after 1 June');

  // The wrong answer, spelled out so the gap between them is a figure and not an adjective:
  // 1 December 2026 to 30 June 2027 inclusive is 212 days, and $20,000 × 212/365 rounded to the
  // nearest $10 is $11,620 — $8,380 of forced drawdown that the Schedule does not require.
  assert.equal(daysInclusive('2026-12-01', '2027-06-30'), 212);
  assert.notEqual(converting.amount, 1_162_000);

  // The same Person one year on, when the birthday is behind them: nothing about the conversion
  // survives into FY2027-28 either — the minimum simply steps to the 65-to-74 band's 5%.
  const after = minimum({
    fy: '2027-28',
    dateOfBirth: '1961-12-01',
    commencementDay: '2020-07-01',
    balance: balanceOn('2027-07-01', 50_000_000),
  });
  assert.equal(after.age, 65);
  assert.equal(after.proRated, false);
  assert.equal(after.days, daysInFinancialYear('2027-28'));
  assert.equal(after.amount, 2_500_000);
});
