// LR-1 slice 3 — DIV 119, THE 30% MINIMUM TAX ON CAPITAL GAINS FROM 1 JULY 2027.
//
// ITAA 1997 ss 119-5, 119-10 and 119-15 (Act No. 49 of 2026 Sch 1 item 58) and s 4-25 (items 54–56),
// read on the ATO legal database on 2026-09-29. Every figure is worked by hand on the FY2027-28
// ladder — 0% to $18,200, 14% to $45,000, 30% to $135,000, 37% to $190,000 — never read off the
// engine. Each test names the gate mutation (M18–M24) it catches.
import test from 'node:test';
import assert from 'node:assert/strict';

import { toCents } from '../dist/core/money.js';
import { netLabourIncomeFromSalary, rebateIncomeFrom, taxableIncome } from '../dist/core/incomeBases.js';
import { householdIncomeTax, minimumTaxGapAmount } from '../dist/core/incomeTax.js';
import { assumptionAt } from '../dist/data/assumptions/index.js';
import { CAPITAL_GAINS_TAX_LINE, CGT_MINIMUM_TAX_DETERMINATION, project } from '../dist/core/projection.js';

const FY = '2027-28';
const ti = (cents) => taxableIncome(cents);

/** A Person with no labour income, so neither WATO nor the work deduction is in play. */
const seller = (incomeCents, minimumTax) => ({
  name: 'Jack',
  taxableIncome: ti(incomeCents),
  rebateIncome: rebateIncomeFrom(ti(incomeCents)),
  qualifiedForAgePension: false,
  netLabourIncome: netLabourIncomeFromSalary(FY, toCents(0), toCents(0)),
  ...(minimumTax === undefined ? {} : { minimumTax }),
});
const assess = (incomeCents, minimumTax) => householdIncomeTax({ fy: FY, relationship: 'single', persons: [seller(incomeCents, minimumTax)] }).persons[0];
const owed = (capitalGain) => ({ capitalGain, receivedExemptPayment: false });

// --- The record --------------------------------------------------------------------------------

test('the 30% is a record, with its section and an ATO legal database URL', () => {
  const rate = assumptionAt('tax.cgt.minimumTaxRate');
  assert.equal(rate.kind, 'config');
  assert.equal(rate.effective, '2027-07-01');
  assert.equal(rate.value, 0.3);
  assert.equal(rate.confidence, 'primary-verified');
  assert.match(rate.source, /s 119-10\(2\) step 1/);
  assert.match(rate.source, /PAC%2F19970038%2F119-10/);
});

// --- The gap itself, s 119-10(2) -----------------------------------------------------------------

// Treasury's "Jack": a $10,000 gain sitting wholly in the 14% band of a $40,000 taxable income. The
// scale already charges 14% of it, $1,400; 30% is $3,000; the gap is the $1,600 between.
test('Jack: a $10,000 gain in the 14% band is topped up by $1,600 — and LITO does not change it', () => {
  assert.equal(minimumTaxGapAmount(FY, ti(toCents(40_000)), toCents(10_000)), toCents(1_600));
  const without = assess(toCents(40_000));
  const withGap = assess(toCents(40_000), owed(toCents(10_000)));
  assert.equal(withGap.minimumTaxGap, toCents(1_600));
  assert.equal(withGap.taxOnTaxableIncome, without.taxOnTaxableIncome, 'the ladder figure is step 2, disregarding Div 119');
  assert.equal(withGap.netTax - without.netTax, toCents(1_600));
  assert.equal(without.minimumTaxGap, toCents(0));
  // A gain in the 30% band is already taxed at 30%: nothing to top up.
  assert.equal(minimumTaxGapAmount(FY, ti(toCents(100_000)), toCents(10_000)), toCents(0));
});

// The pension cliff: the same sale, by a Person paid the age pension at any time in the year.
test('M19 (unit): a Person who received the age pension in the year pays no minimum tax', () => {
  const exempt = assess(toCents(40_000), { capitalGain: toCents(10_000), receivedExemptPayment: true });
  assert.equal(exempt.minimumTaxGap, toCents(0));
  assert.equal(exempt.netTax, assess(toCents(40_000)).netTax);
});

// $10,000 of gain and nothing else: the scale charges nothing on it, so the whole 30% is the gap,
// $3,000. It is basic income tax liability (s 4-25), so LITO's $700 comes off it: $2,300.
test('M18: offsets are applied AGAINST the minimum tax, not after it', () => {
  const result = assess(toCents(10_000), owed(toCents(10_000)));
  assert.equal(result.minimumTaxGap, toCents(3_000));
  assert.equal(result.lito, toCents(700));
  assert.equal(result.taxAfterOffsets, toCents(2_300));
  assert.equal(result.medicareLevy.levy, toCents(0));
  assert.equal(result.netTax, toCents(2_300));
});

// $1,003.33 of gain and nothing else: 30% is $300.999, and step 6 rounds DOWN to $300.
test('M21: the gap is rounded DOWN to the whole dollar (step 6)', () => {
  assert.equal(minimumTaxGapAmount(FY, ti(toCents(1_003.33)), toCents(1_003.33)), toCents(300));
  // …and a result of nil or less is no gap (step 7), not a credit.
  assert.equal(minimumTaxGapAmount(FY, ti(toCents(0.03)), toCents(0.03)), toCents(0));
});

// Taxable income can sit below the gain (a rental loss against it, say). Step 3 reduces it "but not
// below nil": $5,000 less $8,000 is nil, so steps 2 and 3 are both nil and the gap is 30% of $8,000.
test('M22: step 3 reduces taxable income by the gain but not below nil', () => {
  assert.equal(minimumTaxGapAmount(FY, ti(toCents(5_000)), toCents(8_000)), toCents(2_400));
});

// $100,000 of taxable income, $80,000 of it later gain. The scale charges it $20,000 (the tax on
// $100,000, $20,252, less the tax on $20,000, $252); 30% is $24,000; the gap is $4,000. The levy is
// on taxable income and Div 119 does not change it: 2% of $100,000 either way.
test('M23: the Medicare levy does not see the minimum tax', () => {
  const without = assess(toCents(100_000));
  const withGap = assess(toCents(100_000), owed(toCents(80_000)));
  assert.equal(withGap.minimumTaxGap, toCents(4_000));
  assert.equal(withGap.medicareLevy.levy, toCents(2_000));
  assert.equal(withGap.medicareLevy.levy, without.medicareLevy.levy);
  assert.equal(withGap.netTax - without.netTax, toCents(4_000));
});

// --- The whole-dollar floor breaks the gross-up's old cent invariant ----------------------------

// Basic income tax liability — the ladder plus the gap — as one more cent of gain arrives.
const liability = (incomeCents, gainCents) => {
  const result = assess(incomeCents, owed(gainCents));
  return result.taxOnTaxableIncome + result.minimumTaxGap;
};

// A sale that is all later gain, by a Person with no other income: taxable income IS the gain. At
// $29,999.99 the scale charges $1,652.00 (the 14% slice rounds to it) and 30% is $8,999.997, so the
// gap is ⌊$7,347.997⌋ = $7,347; at $30,000.00 it is $7,348.00 exactly. One cent more, a dollar more.
test('one more cent of gain can add a WHOLE DOLLAR of tax — `net` falls by 99 cents', () => {
  assert.equal(liability(toCents(29_999.99), toCents(29_999.99)), toCents(1_652) + toCents(7_347));
  assert.equal(liability(toCents(30_000), toCents(30_000)), toCents(1_652) + toCents(7_348));
  assert.equal(liability(toCents(30_000), toCents(30_000)) - liability(toCents(29_999.99), toCents(29_999.99)), 100);
});

// Taxable income in the 37% band with the gain reaching below $45,000: $150,000.01, of which
// $140,000.01 is later gain. The gap SHRINKS as the sale grows — 30c of each dollar against the 37c
// the scale now charges — so a cent more can take a whole dollar off it. At $150,000.01 the 37%
// slice is $5,550.0037, rounding to $5,550.00, and the gap is ⌊$42,000.003 − $36,302⌋ = $5,698; at
// $150,000.02 the slice rounds to $5,550.01 and the gap is ⌊$5,697.996⌋ = $5,697.
test('…and one more cent can take a dollar OFF — `tax` falls by 99 cents', () => {
  assert.equal(liability(toCents(150_000.01), toCents(140_000.01)), toCents(36_302) + toCents(5_698));
  assert.equal(liability(toCents(150_000.02), toCents(140_000.02)), toCents(36_302.01) + toCents(5_697));
  assert.equal(liability(toCents(150_000.02), toCents(140_000.02)) - liability(toCents(150_000.01), toCents(140_000.01)), -99);
});

// --- On the walk --------------------------------------------------------------------------------

const SETTINGS = {
  asAtDate: '2028-07-01',
  planningHorizonAge: 60,
  economicSeries: { cpi: 0.025, pblci: 0.025, awote: 0, mtawe: 0.035 },
  deemingRates: { lower: 0.0175, upper: 0.0375 },
  nominalReturn: 0,
  cashInterestRate: 0,
};
const person = (name, dateOfBirth, parcels = []) => ({
  name,
  dateOfBirth,
  superInterests: [{ phase: 'accumulation', balance: toCents(0) }],
  parcels,
  employmentIncomePerFortnight: toCents(0),
  workBonusBalance: toCents(0),
});
const entry = (id, type, date, owner, params) => ({ id, date, owner, type, params, enabled: true, createdAt: '2028-06-01' });
const sellAll = (date, owner) => entry('sell', 'NON_SUPER_INVESTMENT', date, owner, { direction: 'sell', amount: toCents(10_000_000) });
const gainTax = (months) =>
  months.flatMap((m) => m.lines.filter((l) => l.description.startsWith(CAPITAL_GAINS_TAX_LINE)).map((l) => [m.month, l.description, l.amount]));
const trueUps = (months) =>
  months.flatMap((m) => m.lines.filter((l) => l.description.startsWith('Income tax year-end true-up')).map((l) => [m.month, l.direction, l.amount]));

// Cost $10,000, $12,000 just before 1 July 2027, $20,000 now, and flat (`nominalReturn: 0`). Sold
// whole on 15 August 2028: deferred $2,000, halved to $1,000; later part $20,000 less $12,000
// indexed by 1.025 (the September 2027 quarter to the September 2028 quarter), $7,700. Net capital
// gain $8,700 — under $18,200, so the scale charges nothing and without Div 119 there is no tax at
// all. The gap is 30% of $7,700, $2,310; LITO's $700 comes off it: $1,610.00.
const PARCEL = { acquired: '2020-01-10', costBase: toCents(10_000), marketValue: toCents(20_000), valueJustBefore1July2027: toCents(12_000) };

// Ada (born 1950) is paid the Age Pension; Ben (born 1972) is not. The exemption is "you receive",
// per Person: Ben pays when he sells, and Ada, selling the same parcel, does not.
test('M19: the exemption is PER PERSON — the younger partner pays while the older one is exempt', () => {
  const household = (adaParcels, benParcels) => ({ persons: [person('Ada', '1950-03-01', adaParcels), person('Ben', '1972-03-01', benParcels)], homeStatus: 'occupied' });
  const benSells = project(SETTINGS, household([], [PARCEL]), [sellAll('2028-08-15', 'personB')]);
  assert.ok(benSells.find((m) => m.month === '2028-08').lines.some((l) => l.description === 'Age Pension' && l.amount > 0), 'the vacuity guard: Ada is paid');
  assert.deepEqual(gainTax(benSells), [['2028-08', `${CAPITAL_GAINS_TAX_LINE}, Ben`, toCents(1_610)]]);
  const adaSells = project(SETTINGS, household([PARCEL], []), [sellAll('2028-08-15', 'personA')]);
  assert.deepEqual(gainTax(adaSells), []);
});

// Cal (born 1961-10-20) reaches Age Pension age on 20 October 2028, so is first paid in November.
// The August sale is charged the $1,610.00, because nothing has been received by then; the July 2029
// true-up assesses FY2028-29 as a year in which Cal received the pension, so none of it is owed.
// Cal's other income that year is the pension, and SAPTO takes the tax on it to nil, so the refund
// is the whole of it.
test('M20: tax charged before the pension starts is refunded when the year is settled', () => {
  const months = project({ ...SETTINGS, planningHorizonAge: 69 }, { persons: [person('Cal', '1961-10-20', [PARCEL])], homeStatus: 'occupied' }, [sellAll('2028-08-15', 'personA')]);
  assert.equal(months.find((m) => m.month === '2028-10').lines.some((l) => l.description === 'Age Pension'), false);
  assert.ok(months.find((m) => m.month === '2028-11').lines.some((l) => l.description === 'Age Pension' && l.amount > 0));
  assert.deepEqual(gainTax(months), [['2028-08', `${CAPITAL_GAINS_TAX_LINE}, Cal`, toCents(1_610)]]);
  assert.deepEqual(trueUps(months), [['2029-07', 'inflow', toCents(1_610)]]);
});

// LR-1 slice 4: the line says so when the minimum tax is in it. Ben's $1,610 is all Div 119 (the scale
// alone charges nothing), so his line carries the sentence; it names nobody and states no dollar figure,
// so it can leave through the chat's guards as written.
test('S4: a capital gains tax line with the minimum tax in it says so, in the rule\'s words', () => {
  const months = project(SETTINGS, { persons: [person('Ada', '1950-03-01'), person('Ben', '1972-03-01', [PARCEL])], homeStatus: 'occupied' }, [sellAll('2028-08-15', 'personB')]);
  const line = months.find((m) => m.month === '2028-08').lines.find((l) => l.description.startsWith(CAPITAL_GAINS_TAX_LINE));
  assert.ok(line.provenance.determination.includes(CGT_MINIMUM_TAX_DETERMINATION));
  assert.match(CGT_MINIMUM_TAX_DETERMINATION, /s 119-10/);
  assert.match(CGT_MINIMUM_TAX_DETERMINATION, /s 119-15/);
  assert.doesNotMatch(CGT_MINIMUM_TAX_DETERMINATION, /\$|Ada|Ben/);
});

// Two parcels, each with its cost base equal to its value just before 1 July 2027 so neither has a
// deferred part, sold together on 15 October 2027 at `cpi: 0` (factor 1): one at a $20,000 later
// LOSS, one at a $30,000 later gain. Step 1 takes the loss off the gain first, so the minimum tax
// capital gain is $10,000, not $30,000: 30% is $3,000, less LITO's $700, $2,300.
test('M24: the minimum tax capital gain is what is left AFTER step 1 applies the losses', () => {
  const months = project(
    { ...SETTINGS, asAtDate: '2027-09-01', economicSeries: { ...SETTINGS.economicSeries, cpi: 0 } },
    {
      persons: [
        person('Dee', '1972-03-01', [
          { acquired: '2015-01-01', costBase: toCents(100_000), marketValue: toCents(80_000), valueJustBefore1July2027: toCents(100_000) },
          { acquired: '2016-01-01', costBase: toCents(50_000), marketValue: toCents(80_000), valueJustBefore1July2027: toCents(50_000) },
        ]),
      ],
      homeStatus: 'occupied',
    },
    [sellAll('2027-10-15', 'personA')],
  );
  assert.deepEqual(gainTax(months), [['2027-10', `${CAPITAL_GAINS_TAX_LINE}, Dee`, toCents(2_300)]]);
});

// A household that must sell every month to live, with no income and a parcel two-thirds of whose
// value is later gain. Limb 3 grosses each sale up for its own tax. Before Div 119 every month
// funded its draw to the cent; with the whole-dollar gap `net` is not monotone, and the sale the
// search returns can fund the draw with spare cents. Never less than the draw, never a dollar more.
test('the gross-up still funds every draw, and the dollar floor leaves at most 99 cents over', () => {
  const months = project(
    { ...SETTINGS, asAtDate: '2027-09-01', planningHorizonAge: 62, economicSeries: { ...SETTINGS.economicSeries, cpi: 0 } },
    {
      persons: [
        person('Pat', '1968-03-01', [{ acquired: '2015-01-01', costBase: toCents(1_000_000), marketValue: toCents(3_000_000), valueJustBefore1July2027: toCents(1_000_000) }]),
      ],
      homeStatus: 'occupied',
    },
    [entry('sc', 'SPEND_CHANGE', '2027-09-01', 'household', { annualSpend: toCents(200_000) })],
  );
  const spare = months.flatMap((m) => {
    const draw = m.notes.find((n) => n.limb === 'nonSuperPortfolio');
    if (draw === undefined || draw.drawn === 0) return [];
    const sum = (prefix) => m.lines.filter((l) => l.description.startsWith(prefix)).reduce((t, l) => t + l.amount, 0);
    return [sum('Non-Super Portfolio sale') - sum(CAPITAL_GAINS_TAX_LINE) - draw.drawn];
  });
  assert.equal(spare.length, 31);
  assert.ok(spare.every((cents) => cents >= 0 && cents < 100), `a sale funded less than its draw, or a dollar more: ${spare}`);
  assert.ok(spare.some((cents) => cents > 1), 'the vacuity guard: no month had more than the one cent slice 2 allowed');
  assert.equal(months.filter((m) => m.lines.some((l) => l.description === 'Unfunded shortfall')).length, 0);
});
