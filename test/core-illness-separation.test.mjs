// P12-4 — `ILLNESS_SEPARATION`: a couple living apart because of illness or care.
//
// The rules are pinned by hand in `core-age-pension.test.mjs` (the three-way fixture). This file
// defends the ENTRY: that the door reads it, that the walk starts the separation in the entry's own
// month — not a month early, not a month late — and that it holds for every month after.
//
// Every Household here is synthetic: round numbers and placeholder names.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';

import { toCents } from '../dist/core/money.js';
import { agePensionEntitlement } from '../dist/core/agePension.js';
import { AGE_PENSION_LINE, TAX_TRUE_UP_LINE, monthlyFromFortnightly, project } from '../dist/core/projection.js';
import { parsePlan } from '../dist/core/parsePlan.js';
import { householdIncomeTax } from '../dist/core/incomeTax.js';
import { netLabourIncomeFromSalary, rebateIncomeFrom, taxableIncome } from '../dist/core/incomeBases.js';
import { DEMO_ENTRIES, DEMO_HOUSEHOLD, DEMO_PLAN, DEMO_SETTINGS } from '../dist/app/demoHousehold.js';

const person = (name, dateOfBirth, superInterests = []) => ({
  name,
  dateOfBirth,
  superInterests,
  parcels: [],
  employmentIncomePerFortnight: toCents(0),
  workBonusBalance: toCents(0),
});

const DEEMING = { lower: 0.0175, upper: 0.0375 };

/** A 41-month walk from 2026-09, to Alex's planning horizon of 73. */
const SETTINGS = {
  asAtDate: '2026-09-16',
  planningHorizonAge: 73,
  economicSeries: { cpi: 0.025, pblci: 0.025, awote: 0.035, mtawe: 0.035 },
  deemingRates: DEEMING,
  nominalReturn: 0.065,
};

/** Both past 67, homeowners, $700,000 in one Account-Based Pension: the assets test binds. */
const COUPLE = {
  persons: [
    person('Alex', '1955-09-01', [{ phase: 'accountBasedPension', balance: toCents(700_000) }]),
    person('Blair', '1957-01-01'),
  ],
  homeStatus: 'occupied',
};

const entry = (id, type, date, params = {}, owner = 'household') => ({
  id, date, owner, type, params, enabled: true, createdAt: '2026-06-01',
});
const SPEND = entry('sc', 'SPEND_CHANGE', '2026-09-01', { annualSpend: toCents(60_000) });
const separation = (date, owner = 'household') => entry('sep', 'ILLNESS_SEPARATION', date, {}, owner);

const agePensionIn = (month) =>
  month.lines.filter((line) => line.description === AGE_PENSION_LINE).reduce((sum, line) => sum + line.amount, 0);

const walk = (...entries) => project(SETTINGS, COUPLE, [SPEND, ...entries]);
const BASE = walk();

test('the door reads it: `{}` params, and a stated field is refused rather than dropped', () => {
  const built = { ...separation('2040-07-01'), createdAt: '2026-09-24' };
  const parsed = parsePlan({ ...DEMO_PLAN, entries: [...DEMO_PLAN.entries, built] });
  assert.equal(parsed.entries.at(-1).type, 'ILLNESS_SEPARATION');
  assert.deepEqual(parsed.entries.at(-1).params, {});
  assert.throws(() => parsePlan({ ...DEMO_PLAN, entries: [...DEMO_PLAN.entries, { ...built, params: { reason: 'care' } }] }), /"reason"/);
});

test('the door refuses one for a Household of one Person: there is nobody to be separated from', () => {
  const single = { ...DEMO_PLAN.household, persons: [DEMO_PLAN.household.persons[0]] };
  // The control: the same single Household parses without the entry.
  const withoutEntries = { ...DEMO_PLAN, household: single, entries: [], scenarios: DEMO_PLAN.scenarios.map((s) => ({ ...s, entryIds: [] })) };
  assert.doesNotThrow(() => parsePlan(withoutEntries));
  assert.throws(
    () => parsePlan({ ...withoutEntries, entries: [{ ...separation('2040-07-01'), createdAt: '2026-09-24' }] }),
    /ILLNESS_SEPARATION, and this Household has one Person/,
  );
});

test('it starts in the entry’s OWN month — mid-month dated — and holds for every month after', () => {
  const separated = walk(separation('2026-11-15'));
  assert.equal(separated.length, BASE.length);
  const entryMonth = separated.findIndex((month) => month.month === '2026-11');
  assert.equal(entryMonth, 2, 'the control: 2026-11 is the third month of the walk');

  // Not a month early: every month before the entry's is byte-identical to the walk without it.
  assert.deepEqual(separated.slice(0, entryMonth), BASE.slice(0, entryMonth));

  // Not a month late, and never dropped: the Age Pension is higher in the entry's own month and in
  // EVERY month after it. Counted, so a month that fell back to the couple rate is a failure.
  const after = separated.slice(entryMonth);
  const raised = after.filter((month, index) => agePensionIn(month) > agePensionIn(BASE[entryMonth + index]));
  assert.equal(raised.length, after.length);
  assert.equal(after.length, 39);
  // The control for the comparison: the baseline does pay a pension in all of those months.
  assert.ok(BASE.slice(entryMonth).every((month) => agePensionIn(month) > 0));
});

test('a mid-month date and the first of the month give the same walk: the month is the unit', () => {
  const firstOf = walk(separation('2026-11-01'));
  const midMonth = walk(separation('2026-11-15'));
  const strip = (months) => months.map(({ appliedEntryIds, ...rest }) => rest);
  assert.deepEqual(strip(midMonth), strip(firstOf));
});

test('its first month is the means test’s third path on that month’s Household, exactly', () => {
  // Dated before `asAtDate`: a `level`, so it is in force from month 0, whose balances are the
  // stated ones — so the month's figure can be recomputed from the Household as written.
  const [first] = walk(separation('2026-01-01'));
  const expected = agePensionEntitlement({ household: COUPLE, date: '2026-09-01', deemingRates: DEEMING, illnessSeparated: true });
  assert.equal(expected.status, 'single');
  assert.equal(agePensionIn(first), monthlyFromFortnightly(expected.householdRatePerFortnight));
  const couple = agePensionEntitlement({ household: COUPLE, date: '2026-09-01', deemingRates: DEEMING });
  assert.equal(agePensionIn(BASE[0]), monthlyFromFortnightly(couple.householdRatePerFortnight));
  assert.ok(expected.householdRatePerFortnight > couple.householdRatePerFortnight);
});

test('`owner` is ignored: a personB-owned separation is the same fact about the couple', () => {
  const strip = (months) => months.map(({ appliedEntryIds, ...rest }) => rest);
  assert.deepEqual(strip(walk(separation('2026-11-15', 'personB'))), strip(walk(separation('2026-11-15'))));
});

test('switched off, it moves nothing', () => {
  assert.deepEqual(walk({ ...separation('2026-11-15'), enabled: false }), BASE);
});

// --- O90: SAPTO for an illness-separated couple ---------------------------------------------------

test('O90 — the separated amounts never make either Person pay MORE tax than the couple amounts would', () => {
  // Until O90 was built the walk taxed an illness-separated couple as a couple, and this grid is what
  // made that a cautious limit. It stays as the direction of the change: moving to the separated
  // amounts can only lower what anyone pays. It is measured on what each Person PAYS — tax after
  // offsets plus the Medicare levy — and not on the SAPTO figure itself: a couple's transfer can make
  // one Person's offset larger than the separated amount (A $0, B $32,500: $3,204 against $2,040)
  // while the tax paid is nil either way, because the offset is non-refundable.
  // Counted, and non-vacuous: some Persons must pay strictly MORE as a couple.
  let compared = 0;
  let paysMore = 0;
  for (const fy of ['2026-27', '2027-28']) {
    const pensioner = (name, dollars) => {
      const ti = taxableIncome(toCents(dollars));
      return {
        name,
        taxableIncome: ti,
        rebateIncome: rebateIncomeFrom(ti),
        qualifiedForAgePension: true,
        netLabourIncome: netLabourIncomeFromSalary(fy, toCents(0), toCents(0)),
      };
    };
    const paid = (relationship, persons) =>
      householdIncomeTax({ fy, relationship, persons }).persons.map((each) => each.taxAfterOffsets + each.medicareLevy.levy);
    for (let a = 0; a <= 100_000; a += 2_500) {
      for (let b = 0; b <= 100_000; b += 2_500) {
        const persons = [pensioner('A', a), pensioner('B', b)];
        const asCouple = paid('couple', persons);
        const asSeparated = paid('illnessSeparated', persons);
        for (const index of [0, 1]) {
          compared += 1;
          assert.ok(asCouple[index] >= asSeparated[index], `${fy}, A $${a}, B $${b}: Person ${index} pays ${asCouple[index]} as a couple and ${asSeparated[index]} separated`);
          if (asCouple[index] > asSeparated[index]) paysMore += 1;
        }
      }
    }
  }
  assert.equal(compared, 2 * 41 * 41 * 2);
  assert.ok(paysMore > 400, `only ${paysMore} comparisons differ`);
});

// Walked from 1 July 2027 so FY2027-28 is a whole year the July true-up settles. `awote: 0` holds
// each salary at its stated figure, and nil returns and cash interest keep every figure a tax one.
// Both past 67, so both qualify for the Age Pension and so for SAPTO.
const FROM_JULY = {
  asAtDate: '2027-07-01',
  planningHorizonAge: 75,
  economicSeries: { cpi: 0.025, pblci: 0.025, awote: 0, mtawe: 0.035 },
  deemingRates: DEEMING,
  nominalReturn: 0,
  cashInterestRate: 0,
};
/**
 * Fortnightly pay whose twelve monthly twelfths sum to the annual figure exactly (26 × pay divides
 * by 12), so the year's assessed salary is the figure written here, to the cent.
 */
const PAY = {
  higher: { fortnight: 2_192.34, year: toCents(57_000.84) },
  example9: { fortnight: 1_884.6, year: toCents(48_999.6) },
  lower: { fortnight: 423.06, year: toCents(10_999.56) },
};
const earner = (name, dateOfBirth, fortnight, over = {}) => ({
  ...person(name, dateOfBirth, [{ phase: 'accumulation', balance: toCents(0) }]),
  employmentIncomePerFortnight: toCents(fortnight),
  ...over,
});
const pair = (alexPay, over = {}) => ({
  persons: [earner('Alex', '1955-03-01', alexPay.fortnight), earner('Blair', '1955-05-01', PAY.lower.fortnight, over)],
  homeStatus: 'occupied',
});
const SPEND_JULY = entry('sc', 'SPEND_CHANGE', '2027-07-01', { annualSpend: toCents(40_000) });
const walkFromJuly = (household, settings = {}, ...entries) => project({ ...FROM_JULY, ...settings }, household, [SPEND_JULY, ...entries]);

const inFy = (month, fy) => month.month >= `${fy.slice(0, 4)}-07` && month.month <= `${Number(fy.slice(0, 4)) + 1}-06`;
const accrued = (months, who, fy) =>
  months.filter((month) => inFy(month, fy)).flatMap((month) => month.lines)
    .filter((line) => line.description === `Income tax, ${who}`).reduce((sum, line) => sum + line.amount, 0);
const trueUp = (months, who, fy) =>
  months.flatMap((month) => month.lines).filter((line) => line.description === `${TAX_TRUE_UP_LINE}, ${who}, ${fy}`)
    .reduce((sum, line) => sum + (line.direction === 'inflow' ? line.amount : -line.amount), 0);
/** What the walk charged for the year once July has settled it: twelve accruals less the true-up. */
const yearTax = (months, who, fy) => accrued(months, who, fy) - trueUp(months, who, fy);
const monthlyTax = (months, who, month) =>
  months.find((each) => each.month === month).lines.find((line) => line.description === `Income tax, ${who}`)?.amount ?? 0;

/** The same year assessed directly: taxable income is the salary less the s 25-130 $1,000. */
const assessed = (relationship, alexSalary, blairOther = 0, fy = '2027-28') => {
  const earnerOf = (name, salary, other) => {
    const ti = taxableIncome(salary - toCents(1_000) + other);
    return { name, taxableIncome: ti, rebateIncome: rebateIncomeFrom(ti), qualifiedForAgePension: true, netLabourIncome: netLabourIncomeFromSalary(fy, salary, toCents(0)) };
  };
  return householdIncomeTax({ fy, relationship, persons: [earnerOf('Alex', alexSalary, 0), earnerOf('Blair', PAY.lower.year, blairOther)] });
};

test('O90 — a separation in JANUARY gives SAPTO’s separated amount for the WHOLE year, settled at the July true-up', () => {
  // Reg s 9(2)(a) item 3 applies to a member of an illness separated couple, and reg s 9(2)(b) takes
  // the greatest amount where more than one item applied during the year: a couple who lived apart
  // from 15 January 2028 get $2,040 each for all of FY2027-28, not half a year of it.
  const household = pair(PAY.higher);
  const together = walkFromJuly(household);
  const january = walkFromJuly(household, {}, separation('2028-01-15'));
  const allYear = walkFromJuly(household, {}, separation('2027-01-01'));
  // The control: the salary the year assessed is the figure stated.
  const salary = january.filter((month) => inFy(month, '2027-28')).flatMap((month) => month.lines)
    .filter((line) => line.description === 'Salary, Alex').reduce((sum, line) => sum + line.amount, 0);
  assert.equal(salary, PAY.higher.year);

  // Alex, $56,000.84 taxable. As a couple: $7,052.25 on the scale, less LITO $159.99, WATO $250 and
  // SAPTO $395, plus a $237.75 levy = $6,485.01. Separated, SAPTO is $1,619 — $1,224 more — and so
  // the year is $5,261.01. The levy does not move: both years have SAPTO, so both read the seniors
  // family threshold.
  assert.equal(assessed('couple', PAY.higher.year).persons[0].netTax, toCents(6_485.01));
  assert.equal(assessed('illnessSeparated', PAY.higher.year).persons[0].netTax, toCents(5_261.01));
  // Living together the year is twelve $540.42 accruals, $6,485.04: three cents of rounding over the
  // assessment, under the $1 floor, so July settles nothing.
  assert.equal(yearTax(together, 'Alex', '2027-28'), toCents(6_485.04));
  assert.equal(yearTax(january, 'Alex', '2027-28'), toCents(5_261.01));
  // Whole year, not apportioned: the same as a couple separated before the year began, whose
  // twelve $438.42 accruals sit three cents over it and so are not settled.
  assert.equal(yearTax(allYear, 'Alex', '2027-28'), toCents(5_261.04));
  assert.equal(trueUp(allYear, 'Alex', '2027-28'), 0);

  // The accrual follows the month: a couple's $540.42 to December, the separated $438.42 from January.
  for (const month of ['2027-07', '2027-12']) {
    assert.equal(monthlyTax(january, 'Alex', month), toCents(540.42));
    assert.equal(monthlyTax(together, 'Alex', month), toCents(540.42));
  }
  for (const month of ['2028-01', '2028-06']) {
    assert.equal(monthlyTax(january, 'Alex', month), toCents(438.42));
    assert.equal(monthlyTax(allYear, 'Alex', month), toCents(438.42));
  }
  // So the July true-up hands back the six couple months’ excess: 6 × $102.00 less 3 cents of rounding.
  assert.equal(trueUp(january, 'Alex', '2027-28'), toCents(612.03));
  assert.equal(trueUp(together, 'Alex', '2027-28'), 0);
});

test('O90 — a separation on 1 JULY leaves the year before it a couple’s', () => {
  const household = pair(PAY.higher);
  const july = walkFromJuly(household, {}, separation('2028-07-01'));
  // FY2027-28 ended before they lived apart: taxed as a couple, and nothing to settle (the couple's
  // twelve accruals, as in the test above). The true-up runs in July 2028, after that month's
  // separation is in force — it must read the finished year, not the new one.
  assert.equal(yearTax(july, 'Alex', '2027-28'), toCents(6_485.04));
  assert.equal(trueUp(july, 'Alex', '2027-28'), 0);
  // FY2028-29 is the separated year from its first month.
  assert.equal(monthlyTax(july, 'Alex', '2028-06'), toCents(540.42));
  assert.equal(monthlyTax(july, 'Alex', '2028-07'), toCents(438.42));
  assert.equal(accrued(july, 'Alex', '2028-29'), 12 * toCents(438.42));
  assert.equal(assessed('illnessSeparated', PAY.higher.year, 0, '2028-29').persons[0].netTax, toCents(5_261.01));
});

test('O90 — unequal incomes: the eligibility test reads HALF their combined income, as for any couple', () => {
  // Alex's own Rebate Income, $56,000.84, is above the separated cut-out of $52,270 ($35,950 +
  // $2,040 / 12.5%). Half the couple's combined, ($56,000.84 + $9,999.56) / 2 = $33,000.20, is not —
  // and that is the figure reg s 10 tests, because they are still spouses. So Alex gets SAPTO.
  const result = assessed('illnessSeparated', PAY.higher.year);
  const [alex, blair] = result.sapto.persons;
  assert.equal(alex.eligibility.incomeTested, toCents(33_000.2));
  assert.equal(alex.eligibility.basis, 'half combined Rebate Income');
  assert.equal(alex.thresholdBeforeTransfer.cutOut, toCents(52_270));
  assert.equal(alex.eligibility.passed, true);
  assert.equal(blair.offset, toCents(2_040));
  assert.equal(alex.offset, toCents(1_619));
  // And the walk charges exactly that year.
  const january = walkFromJuly(pair(PAY.higher), {}, separation('2028-01-15'));
  assert.equal(yearTax(january, 'Alex', '2027-28'), result.persons[0].netTax);
  assert.equal(yearTax(january, 'Blair', '2027-28'), 0);
});

test('O90 — ATO Example 9 through the walk: Blair’s unused offset moves to Alex, from $2,040', () => {
  // ATO, "Seniors and pensioners tax offset", Example 9 (FY2025-26): a spouse on $10,000 taxable
  // transfers $2,040 − ($10,000 − $6,000) × 0.15 = $1,440; the other's threshold is rebuilt on
  // $3,480 and comes to $39,912; on $48,000 of Rebate Income the offset is $2,469. Replayed here on
  // that year's rates (16% lowest, 30% next) to show the arithmetic below is the ATO's own:
  // Reg s 9(6): (($0.30 + 0.015 − lowest) × $37,000 + lowest × $18,200 + $445 + BRA*) / 0.315, rounded up.
  const threshold = (lowest, bra) => Math.ceil(((0.315 - lowest) * 37_000 + lowest * 18_200 + 445 + bra) / 0.315);
  assert.equal(threshold(0.16, 3_480), 39_912);
  assert.equal(3_480 - (48_000 - 39_912) * 0.125, 2_469);

  // The walk cannot assess FY2025-26 (its tax years start in FY2026-27), so Example 9's household is
  // walked in FY2027-28: Blair on $9,999.56 taxable, Alex on $47,999.60, apart from January 2028.
  //   transfer   $2,040 − ($9,999.56 − $6,000) × 0.15 = $1,440.07      (Example 9's step 1)
  //   threshold  (0.175 × $37,000 + 0.14 × $18,200 + $445 + $3,480.07) / 0.315 = $41,105, up
  //   SAPTO      $3,480.07 − ($47,999.60 − $41,105) × 0.125 = $2,618.25 → $2,619, up
  //   tax        $4,651.88 on the scale, less LITO $280.01, WATO $250 and SAPTO $2,619 = $1,502.87,
  //              no levy (below the seniors family threshold)
  assert.equal(threshold(0.14, 3_480.07), 41_105);
  const result = assessed('illnessSeparated', PAY.example9.year);
  const [alex] = result.sapto.persons;
  assert.deepEqual(alex.transferReceived, { from: 'Blair', amount: toCents(1_440.07) });
  assert.equal(alex.threshold.shadeOut, toCents(41_105));
  assert.equal(alex.offset, toCents(2_619));
  assert.equal(result.persons[0].netTax, toCents(1_502.87));
  // As a couple it would be $1,395 of SAPTO and $2,726.87 of tax.
  assert.equal(assessed('couple', PAY.example9.year).persons[0].netTax, toCents(2_726.87));

  const january = walkFromJuly(pair(PAY.example9), {}, separation('2028-01-15'));
  assert.equal(yearTax(january, 'Alex', '2027-28'), toCents(1_502.87));
  // Living together: twelve accruals a cent over the couple's $2,726.87, so nothing to settle.
  const together = walkFromJuly(pair(PAY.example9));
  assert.equal(yearTax(together, 'Alex', '2027-28'), toCents(2_726.88));
  assert.equal(trueUp(together, 'Alex', '2027-28'), 0);
});

test('O90 — a franked payout in a separation year is assessed on the separated amounts too', () => {
  // Blair holds $50,000 paying 4%, fully franked: $2,000 paid in June 2028 and, at this model's
  // share, a $2,000 credit. Both join Blair's taxable income ($13,999.56), which cuts the offset she
  // can hand on: $2,040 − $7,999.56 × 0.15 = $840.07. Alex's SAPTO is then $781 separated, nil as
  // a couple — so Alex's year is $6,419.01, not $7,762.28. Blair pays nothing either way, and her
  // credit comes back in full at the true-up.
  const household = pair(PAY.higher, { parcels: [{ acquired: '2020-01-01', costBase: toCents(40_000), marketValue: toCents(50_000) }] });
  const payout = { investmentPayoutRate: 0.04, investmentPayoutFrankedShare: 1 };
  const january = walkFromJuly(household, payout, separation('2028-01-15'));
  const together = walkFromJuly(household, payout);
  const separated = assessed('illnessSeparated', PAY.higher.year, toCents(4_000));
  assert.deepEqual(separated.sapto.persons[0].transferReceived, { from: 'Blair', amount: toCents(840.07) });
  assert.equal(separated.sapto.persons[0].offset, toCents(781));
  assert.equal(assessed('couple', PAY.higher.year, toCents(4_000)).sapto.persons[0].offset, 0);
  assert.equal(yearTax(january, 'Alex', '2027-28'), toCents(6_419.01));
  assert.equal(separated.persons[0].netTax, toCents(6_419.01));
  assert.equal(yearTax(together, 'Alex', '2027-28'), toCents(7_762.28));
  assert.equal(trueUp(january, 'Blair', '2027-28'), toCents(2_000));
});

// --- Byte-identity: no entry, no change ------------------------------------------------------------

test('without an ILLNESS_SEPARATION the demo walk is byte-identical — and with one switched off too', () => {
  // The same digest `app-chat-identity.test.mjs` pins, from before P12-4 existed.
  // 2026-09-24: hashed without `closingNonSuperPortfolio`, a balance the walk already held at the
  // close — so this is still the digest of every figure it pinned before. 2026-09-25: and without
  // `assetsTestThresholds`, read off the entitlement the walk already computed, for the same reason.
  // The full walk's own digest is pinned in `app-month-to-rows.test.mjs`.
  const sha256 = (value) =>
    createHash('sha256')
      .update(JSON.stringify(value, (key, field) => (key === 'closingNonSuperPortfolio' || key === 'assetsTestThresholds' || key === 'concessionalCapByPerson' ? undefined : field)))
      .digest('hex');
  // RE-PINNED 2026-09-24 (T135): the demo couple's assets excess now floors to the nearest $500
  // (SSA 1991 s1064 point 1064-G7), a few cents to a few dollars of Age Pension higher in a
  // handful of months — see `test/core-age-pension.test.mjs`'s T135 tests.
  // RE-PINNED 2026-09-29 (LR-1 slice 2, the CGT reform from 1 July 2027): only the limb-3
  // `available` figure moved, in 94 months from 2027-08, every one DOWN. It is the whole-portfolio
  // probe, and from 1 July 2027 the part of the gain after the stamp is indexed and never halved,
  // so selling everything would cost more tax (32c a dollar at the demo's rate). Slice 2 moved no line: without Div 119 the demo's own sales in 2033 stay under the tax-free threshold.
  // RE-PINNED 2026-09-29 (LR-1 slice 3, Div 119's minimum tax): Dana sells from 2033 with no salary
  // and no Age Pension, so 30% of the later part of each gain, less LITO, is now charged: 11
  // `Income tax on capital gain, Dana` lines, 2033-03 to 2035-05 — $1,615 in FY2032-33, $2,156 in
  // FY2033-34 and $1,793 in FY2034-35, each equal to 30% of that year's later gain less $700 to the
  // dollar, replayed by hand. The last comes back in the July 2035 true-up: she is paid the pension from
  // June 2035. Each sale grows by exactly its tax, so the portfolio runs out a month sooner (2037-05),
  // and lower assets raise the Age Pension in 417 months from 2033-09. The limb-3 probe moved again,
  // DOWN in 55 months from 2031-06, once her salary stops.
  // RE-PINNED 2026-09-29 (LR-1 slice 4): no figure moved. Dana's 11 `Income tax on capital gain` lines (2033-03 to 2035-05) each gained one `determination` entry, `CGT_MINIMUM_TAX_DETERMINATION`; a whole-walk diff finds those 11 and nothing else.
  // RE-PINNED 2026-09-30 (the Account-Based Pension minimum's provenance, carried): provenance only, no figure moved — the demo walk with every `provenance` stripped is byte-identical on both builds, asserted in `app-month-to-rows.test.mjs`.
  const DEMO_DIGEST = '48089359ed63916c7c48a86b16276e81d4d44c760149b2887749e0d8c0da706b';
  assert.equal(sha256(project(DEMO_SETTINGS, DEMO_HOUSEHOLD, DEMO_ENTRIES)), DEMO_DIGEST);
  const off = { ...separation('2040-07-01'), enabled: false };
  assert.equal(sha256(project(DEMO_SETTINGS, DEMO_HOUSEHOLD, [...DEMO_ENTRIES, off])), DEMO_DIGEST);
  // The control: switched on, the demo couple's walk does move, so the two equalities are not
  // the digest of a walk the entry could never reach.
  assert.notEqual(sha256(project(DEMO_SETTINGS, DEMO_HOUSEHOLD, [...DEMO_ENTRIES, { ...off, enabled: true }])), DEMO_DIGEST);
});
