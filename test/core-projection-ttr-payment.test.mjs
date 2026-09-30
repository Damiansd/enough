// TTR build step 1 (2026-09-23) — **a transition to retirement income stream PAYS.** Until this
// build a TTR interest sat in the walk paying nothing until it converted; `ttrPaymentRange.ts`
// computed its range and nothing called it.
//
// What is under test, each as a hand-worked figure:
//   §1 the year's figure — the Schedule 7 minimum where no rate is stated, the stated rate where it
//      is more, and never more than the reg 6.01(2)(b)(ii) 10% ceiling;
//   §2 the commencement year — the chosen rate pro-rated by DAYS exactly as Sch 7 cl 3 pro-rates the
//      minimum (ruling), and the ceiling not pro-rated; and the conversion year — the year's figure
//      carries across into the Account-Based Pension the stream becomes (ruling);
//   §3 the schedule — a twelfth a month, the rest in June, so the year sums to the figure exactly,
//      and the money is a cash line with the balance written back (cash reconciles, and with a nil
//      return the household's total wealth does not move by a cent);
//   §4 the refusal below 60 (ruling), and the tax nil the line asserts above it.
//
// **`nominalReturn: 0` in §1–§3, and it is the control rather than a simplification.** With growth
// at nil the relevant-day balance is the stated balance in every month before the determination, so
// every figure is `rate × $500,000` and nothing else; growth after a payment is the drawdown file's
// business (`core-projection-pension-drawdown.test.mjs`, whose Kim fixture carries this build
// through a real 6.5% walk and across a conversion).
import test from 'node:test';
import assert from 'node:assert/strict';

import { toCents } from '../dist/core/money.js';
import {
  INCOME_FROM_SUPER_LINES,
  INTERNAL_TRANSFER_LINES,
  NO_STATING_ENTRY,
  PENSION_MINIMUM_LINE,
  TTR_PAYMENT_LINE,
  annualPensionMinimumDetermination,
  project,
  ttrAnnualPayment,
} from '../dist/core/projection.js';
import { TTR_PAYMENT_TAX_NOTE, TtrPaymentBelowTaxFreeAgeError } from '../dist/core/superLumpSum.js';

const person = (name, dateOfBirth, superInterests) => ({
  name,
  dateOfBirth,
  superInterests,
  parcels: [],
  employmentIncomePerFortnight: toCents(0),
  workBonusBalance: toCents(0),
});

const settings = (over = {}) => ({
  asAtDate: '2026-07-01',
  planningHorizonAge: 64,
  economicSeries: { cpi: 0, pblci: 0.025, awote: 0.035, mtawe: 0.035 },
  deemingRates: { lower: 0.0175, upper: 0.0375 },
  nominalReturn: 0,
  ...over,
});

/** Lee: 62 on 1 July 2026 (born 1 January 1964), so past 60 and nowhere near the automatic 65. */
const LEE_DOB = '1964-01-01';
const ttr = (streamSettings) => ({ phase: 'ttr', balance: toCents(500_000), statedStreamSettings: streamSettings });
const lee = (streamSettings) => ({ persons: [person('Lee', LEE_DOB, [ttr(streamSettings)])], homeStatus: 'occupied' });

const monthAt = (months, isoMonth) => months.find((m) => m.month === isoMonth);
const paidIn = (month) => month.lines.filter((l) => l.description === `${TTR_PAYMENT_LINE}, Lee`).map((l) => l.amount);
const fy2627 = (months) => months.filter((m) => m.month >= '2026-07' && m.month <= '2027-06');
const sum = (values) => values.reduce((a, b) => a + b, 0);

// --- §1 The year's figure --------------------------------------------------------------------------

test('no rate stated: the Schedule 7 minimum — 4% of $500,000 is $20,000.00, paid in twelfths and a June remainder', () => {
  // Commenced 1 July 2025, so FY2026-27 is a whole year: cl 1(2)(a)(i) reads the 1 July balance,
  // Lee is 62 on it (the under-65 band, 4%), and 4% × $500,000 = $20,000.00, already a multiple of
  // $10. A twelfth is $1,666.666… → `monthlyFromAnnual` rounds to $1,666.67; eleven of those are
  // $18,333.37, so June pays the remaining $1,666.63 and the year is $20,000.00 exactly.
  const months = project(settings(), lee({ commencementDay: '2025-07-01' }), []);
  const year = fy2627(months);
  assert.equal(year.length, 12);
  assert.deepEqual(year.slice(0, 11).map(paidIn), Array(11).fill([toCents(1_666.67)]));
  assert.deepEqual(paidIn(monthAt(months, '2027-06')), [toCents(1_666.63)]);
  assert.equal(sum(year.flatMap(paidIn)), toCents(20_000));
});

test('a stated rate ABOVE the minimum is paid — 7% of $500,000 is $35,000.00', () => {
  // 7% × $500,000 = $35,000.00 against a $20,000.00 minimum, so the rate governs. A twelfth is
  // $2,916.666… → $2,916.67; eleven are $32,083.37; June pays $2,916.63.
  const months = project(settings(), lee({ commencementDay: '2025-07-01', statedTtrDrawdownRate: 0.07 }), []);
  const year = fy2627(months);
  assert.deepEqual(year.slice(0, 11).map(paidIn), Array(11).fill([toCents(2_916.67)]));
  assert.deepEqual(paidIn(monthAt(months, '2027-06')), [toCents(2_916.63)]);
  assert.equal(sum(year.flatMap(paidIn)), toCents(35_000));
});

test('THE CEILING: a rate above 10% from a caller that bypassed the door is paid 10%, never more', () => {
  // The door refuses 0.15 (core-parse-plan §16); a direct `project()` caller can still hand it in,
  // and the walk caps it rather than paying past the point at which reg 6.01(2)(b)(ii) is breached
  // and the stream ceases for tax purposes from the start of the year. 10% × $500,000 = $50,000.00,
  // against the $75,000.00 the stated 15% would have paid. A twelfth is $4,166.67; June $4,166.63.
  const months = project(settings(), lee({ commencementDay: '2025-07-01', statedTtrDrawdownRate: 0.15 }), []);
  const year = fy2627(months);
  assert.deepEqual(year.slice(0, 11).map(paidIn), Array(11).fill([toCents(4_166.67)]));
  assert.deepEqual(paidIn(monthAt(months, '2027-06')), [toCents(4_166.63)]);
  assert.equal(sum(year.flatMap(paidIn)), toCents(50_000));
  assert.notEqual(sum(year.flatMap(paidIn)), toCents(75_000));
});

// --- §2 The commencement year ----------------------------------------------------------------------

test('COMMENCEMENT YEAR: the chosen rate is pro-rated by days, as cl 3 pro-rates the minimum', () => {
  // Commences 1 October 2026: 1 October 2026 → 30 June 2027 inclusive is 31+30+31+31+28+31+30+31+30
  // = 273 days of FY2026-27's 365. The balance on the commencement day is $500,000 (nil return).
  //   chosen  = $500,000 × 8% × 273/365 = $10,920,000/365 = $29,917.808… → $29,917.81
  //   minimum = $500,000 × 4% × 273/365 = $14,958.90 → cl 5's nearest $10 = $14,960.00
  //   ceiling = 10% × $500,000 = $50,000.00, NOT pro-rated (ttrPaymentRange.ts)
  // So the year is $29,917.81. Unpro-rated it would be $40,000.00, and that is what the mutation
  // that skips the pro-rate pays.
  //
  // The schedule: nothing before October (the stream does not exist), then a twelfth of the year's
  // figure — $2,493.150… → $2,493.15 — October to May (eight payments, $19,945.20), and June pays
  // the remaining $9,972.61. A twelfth of a part-year figure, not an eighth: the ruling's schedule
  // is twelfths with the June top-up, and June is where a part year's remainder lands.
  const months = project(settings(), lee({ commencementDay: '2026-10-01', statedTtrDrawdownRate: 0.08 }), []);
  const year = fy2627(months);
  assert.deepEqual(year.slice(0, 3).map(paidIn), [[], [], []]);
  assert.deepEqual(year.slice(3, 11).map(paidIn), Array(8).fill([toCents(2_493.15)]));
  assert.deepEqual(paidIn(monthAt(months, '2027-06')), [toCents(9_972.61)]);
  assert.equal(sum(year.flatMap(paidIn)), toCents(29_917.81));
  assert.notEqual(sum(year.flatMap(paidIn)), toCents(40_000));

  // The next year is whole again: FY2027-28 reads the 1 July 2027 balance — $500,000 less the
  // $29,917.81 paid — at 8%: $470,082.19 × 8% = $37,606.5752 → $37,606.58, twelfths of $3,133.88.
  assert.deepEqual(paidIn(monthAt(months, '2027-07')), [toCents(3_133.88)]);
});

test('the pure figure: the pro-rate reaches the rate and the minimum, and never the ceiling', () => {
  const base = { fy: '2026-27', commencementDay: '2026-10-01', balanceOnRelevantDay: toCents(500_000), balanceObservedOn: '2026-10-01', minimum: toCents(14_960) };
  assert.equal(ttrAnnualPayment({ ...base, statedDrawdownRate: 0.08 }), toCents(29_917.81));
  // A pro-rated rate BELOW the pro-rated minimum pays the minimum.
  assert.equal(ttrAnnualPayment({ ...base, statedDrawdownRate: 0.04 }), toCents(14_960));
  // 10% pro-rated is $37,397.26 — under the unpro-rated $50,000 ceiling, so the ceiling does not
  // bind in a commencement year at any rate the door accepts.
  assert.equal(ttrAnnualPayment({ ...base, statedDrawdownRate: 0.1 }), toCents(37_397.26));
  // Absent: the minimum, whatever it is.
  assert.equal(ttrAnnualPayment({ ...base, statedDrawdownRate: undefined }), toCents(14_960));
  // A 1 July commencement is not pro-rated at all.
  assert.equal(ttrAnnualPayment({ ...base, commencementDay: '2026-07-01', balanceObservedOn: '2026-07-01', minimum: toCents(20_000), statedDrawdownRate: 0.08 }), toCents(40_000));
});

test('THE CARRY-ACROSS: a TTR converting mid-year keeps that year’s figure, and June sweeps what is left of it', () => {
  // Jo turns 65 on 1 January 2027 (born 1 January 1962) — a month's first day, so the automatic
  // item 106 conversion (R13) is visible from 2027-01 exactly. FY2026-27 is determined as a TTR on
  // 1 July 2026: 8% × $500,000 = $40,000.00 (above the $20,000.00 minimum), twelfths of $3,333.33.
  // July to December pay six of them, $19,999.98, leaving $20,000.02 of the year.
  //
  // From 2027-01 the interest is an Account-Based Pension. Jo spends nothing, so limb 2 draws
  // nothing and the ONLY route for the rest of the year's figure is the June floor sweep — which
  // pays it because the year is still in the shared slot (ruling: the same stream in law). Without
  // the carry-across FY2026-27 would never be determined as an Account-Based Pension at all (Sch 7's
  // day, 1 July 2026, is behind the conversion) and $20,000.02 of the chosen year would go unpaid.
  const household = { persons: [person('Jo', '1962-01-01', [ttr({ commencementDay: '2025-07-01', statedTtrDrawdownRate: 0.08 })])], homeStatus: 'occupied' };
  const months = project(settings({ planningHorizonAge: 66 }), household, []);
  const line = (month, description) => month.lines.filter((l) => l.description === `${description}, Jo`).map((l) => l.amount);
  const year = fy2627(months);
  assert.deepEqual(year.slice(0, 6).map((m) => line(m, TTR_PAYMENT_LINE)), Array(6).fill([toCents(3_333.33)]));
  assert.deepEqual(year.slice(6).flatMap((m) => line(m, TTR_PAYMENT_LINE)), [], 'no TTR line once converted');
  assert.deepEqual(year.slice(6, 11).flatMap((m) => line(m, PENSION_MINIMUM_LINE)), [], 'nothing is needed, so limb 2 draws nothing before June');
  assert.deepEqual(line(monthAt(months, '2027-06'), PENSION_MINIMUM_LINE), [toCents(20_000.02)]);
  // The year's two lines together are the chosen $40,000.00, to the cent.
  assert.equal(sum(year.flatMap((m) => [...line(m, TTR_PAYMENT_LINE), ...line(m, PENSION_MINIMUM_LINE)])), toCents(40_000));
  // And the next 1 July starts a FRESH year as an Account-Based Pension: 65 is the 5% band, on
  // $500,000 − $40,000 = $460,000 → $23,000.00, owed by June 2028 — the walk ends before it, so
  // nothing more is paid here and nothing is paid at 8%.
  assert.deepEqual(months.filter((m) => m.month >= '2027-07').flatMap((m) => [...line(m, TTR_PAYMENT_LINE), ...line(m, PENSION_MINIMUM_LINE)]), []);
});

// --- §3 The money: a cash line, the balance written back, nothing created ---------------------------

test('each payment is a cash inflow out of the account — cash reconciles and total wealth does not move', () => {
  const months = project(settings(), lee({ commencementDay: '2025-07-01', statedTtrDrawdownRate: 0.07 }), []);
  const first = monthAt(months, '2026-07');
  const line = first.lines.find((l) => l.description === `${TTR_PAYMENT_LINE}, Lee`);
  // 2026-09-30: a STATED rate is the member's figure inside legislated bounds — `'stated'`, never
  // `'legislated'`. 7% × $500,000 = $35,000.00, above the 4% minimum ($20,000.00), under 10% ($50,000.00).
  const leeYear = annualPensionMinimumDetermination({
    fy: '2026-27', dateOfBirth: LEE_DOB, commencementDay: '2025-07-01', relevantDay: '2026-07-01', balanceObservedOn: '2026-07-01', balanceOnRelevantDay: toCents(500_000),
  });
  assert.deepEqual(
    { direction: line.direction, effect: line.effect, provenance: line.provenance, attribution: line.attribution },
    {
      direction: 'inflow',
      effect: 'cash',
      provenance: {
        basis: 'stated',
        register: 'transition to retirement income stream',
        fy: '2026-27',
        confidence: leeYear.provenance.confidence,
        caveats: leeYear.provenance.caveats,
        determination: [
          'drawdown rate 7% stated by the member, within the Schedule 7 minimum of 2000000 cents and the SISR reg 6.01(2)(b)(ii) 10% maximum of 5000000 cents',
          "age 62 on the relevant day 2026-07-01: the Schedule 7 band's percentage factor is 4%",
          'account balance 50000000 cents on the relevant day 2026-07-01 (Sch 7 cl 1(2))',
          'Sch 7 cl 4A/4B relief 1/1',
          'minimum 2000000 cents for FY2026-27, rounded once to the nearest ten dollars (Sch 7 cl 5)',
          TTR_PAYMENT_TAX_NOTE,
        ],
      },
      attribution: NO_STATING_ENTRY.ttrPayment,
    },
  );
  for (const month of months) {
    // Chunk 4's identity: the Offset closes at its opening plus the month's cash lines.
    const cash = month.lines.reduce((b, l) => b + (l.effect !== 'cash' ? 0 : l.direction === 'inflow' ? l.amount : -l.amount), month.openingBalance);
    assert.equal(cash, month.closingBalance, month.month);
    // With a nil return, no spending and no tax, a payment moves money from super to the Offset and
    // creates none: super + cash is the stated $500,000 at every close.
    assert.equal(month.superBalance + month.closingBalance, toCents(500_000), month.month);
  }
  // And the balance really fell by what was paid: $500,000 − $2,916.67 at the first close.
  assert.equal(first.superBalance, toCents(497_083.33));
  // It is income from super, and an internal transfer between the household's own pools.
  assert.equal(first.incomeFromSuper, toCents(2_916.67));
  assert.ok(INCOME_FROM_SUPER_LINES.includes(TTR_PAYMENT_LINE));
  assert.ok(INTERNAL_TRANSFER_LINES.includes(TTR_PAYMENT_LINE));
});

test('a TTR with no stream settings still pays nothing in the walk — the refusal is the door’s', () => {
  // `parsePlan` refuses it by name (core-parse-plan §16). A direct `project()` caller is on their
  // own here, as for an account-based pension with no day: nothing is guessed.
  const months = project(settings(), { persons: [person('Lee', LEE_DOB, [{ phase: 'ttr', balance: toCents(500_000) }])], homeStatus: 'occupied' }, []);
  assert.deepEqual(months.flatMap(paidIn), []);
});

// --- §4 The refusal below 60, and the nil above it -------------------------------------------------

test('a TTR payment to a Person under 60 is REFUSED by name — the tax below 60 is not modelled', () => {
  // Sam is 58 on 1 July 2026 (born 14 May 1968). No lawful TTR is held at 58 in 2026 — preservation
  // age is 60 for anyone born after 30 June 1964 — so this is a statement to check, and the walk
  // refuses it rather than paying it untaxed.
  const household = { persons: [person('Sam', '1968-05-14', [ttr({ commencementDay: '2025-07-01' })])], homeStatus: 'occupied' };
  assert.throws(
    () => project(settings({ planningHorizonAge: 61 }), household, []),
    (error) =>
      error instanceof TtrPaymentBelowTaxFreeAgeError &&
      /^Sam is 58 on 2026-07-01, and a transition to retirement income stream payment below 60 is not modelled/.test(error.message) &&
      /TAXABLE COMPONENT/.test(error.message),
  );
  // Not refused where no payment is due: the same Sam, whose stream commences on his 60th birthday,
  // walks — nothing is paid before it and he is 60 when it starts. The birthday is 14 May, inside a
  // month the walk reads at its first day, when Sam is still 59: the age is asked on the day the
  // payment can first be made, the commencement day, or this legal plan would be refused.
  // May 2028 pays: 14 May → 30 June is 48 days of FY2027-28's 366 (it holds 29 February 2028), so
  // 4% × $500,000 × 48/366 = $2,622.95 → cl 5's nearest $10 = $2,620.00; a twelfth is $218.33 and
  // June pays the remaining $2,401.67.
  const later = { persons: [person('Sam', '1968-05-14', [ttr({ commencementDay: '2028-05-14' })])], homeStatus: 'occupied' };
  const months = project(settings({ planningHorizonAge: 61 }), later, []);
  assert.deepEqual(months.filter((m) => m.month < '2028-05').flatMap((m) => m.lines.filter((l) => l.description === `${TTR_PAYMENT_LINE}, Sam`)), []);
  const samPaid = (isoMonth) => monthAt(months, isoMonth).lines.filter((l) => l.description === `${TTR_PAYMENT_LINE}, Sam`).map((l) => l.amount);
  assert.deepEqual(samPaid('2028-05'), [toCents(218.33)], 'the control never paid, so the refusal above proves nothing');
  assert.deepEqual(samPaid('2028-06'), [toCents(2_401.67)]);
});

test('above 60 the tax is an ASSERTED nil on the line, with the taxed-source assumption disclosed', () => {
  // No rate stated: the Schedule 7 minimum is paid, and the line is `'legislated'`.
  const months = project(settings(), lee({ commencementDay: '2025-07-01' }), []);
  const record = monthAt(months, '2026-07').lines.find((l) => l.description === `${TTR_PAYMENT_LINE}, Lee`).provenance;
  assert.equal(record.basis, 'legislated');
  assert.equal(record.register, 'transition to retirement income stream');
  assert.equal(record.determination[0], 'no drawdown rate stated: the Schedule 7 minimum is paid, within the SISR reg 6.01(2)(b)(ii) 10% maximum of 5000000 cents');
  const tax = record.determination.at(-1);
  assert.equal(tax, TTR_PAYMENT_TAX_NOTE);
  assert.match(tax, /Nil tax, and it is a computed nil/);
  assert.match(tax, /aged 60 or over/);
  assert.match(tax, /"tax-free, no PAYG"/);
  assert.match(tax, /A TAXED SOURCE IS ASSUMED/);
  // A stated rate that buys less than the minimum pays the minimum, and is labelled as the minimum.
  const low = project(settings(), lee({ commencementDay: '2025-07-01', statedTtrDrawdownRate: 0.03 }), []);
  const lowRecord = monthAt(low, '2026-07').lines.find((l) => l.description === `${TTR_PAYMENT_LINE}, Lee`).provenance;
  assert.equal(lowRecord.basis, 'legislated');
  assert.match(lowRecord.determination[0], /^the stated drawdown rate 3% buys no more than the Schedule 7 minimum, so the minimum is paid/);
  // And no tax line of any kind rides beside the payment.
  assert.deepEqual(months.flatMap((m) => m.lines.filter((l) => l.direction === 'outflow')).map((l) => l.description), []);
});

test('a walk opening after 1 July pays the WHOLE year from a stand-in balance, and says so once', () => {
  // P10-5's route, reached by a TTR: the 1 July 2026 balance is behind a walk opening 1 September,
  // so the plan's opening $500,000 stands in for it. The whole $20,000.00 minimum is owed — cl 3
  // pro-rates only a commencement year — so September to May pay nine twelfths ($15,000.03) and June
  // pays the remaining $4,999.97. The note's `minimumForTheYear` is the Schedule 7 figure.
  const months = project(settings({ asAtDate: '2026-09-01' }), lee({ commencementDay: '2025-07-01' }), []);
  const year = months.filter((m) => m.month <= '2027-06');
  assert.equal(year.length, 10);
  assert.deepEqual(year.slice(0, 9).map(paidIn), Array(9).fill([toCents(1_666.67)]));
  assert.deepEqual(paidIn(monthAt(months, '2027-06')), [toCents(4_999.97)]);
  const notes = months.flatMap((m) => m.notes.filter((n) => n.subject === 'pension minimum basis'));
  assert.equal(notes.length, 1);
  assert.equal(notes[0].minimumForTheYear, toCents(20_000));
  assert.equal(notes[0].balanceObservedOn, '2026-09-01');
});
