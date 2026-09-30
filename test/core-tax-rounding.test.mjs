// P3-1d — tax payable and the Medicare levy are whole cents, never rounded to a dollar.
// Register §2.1, row "Rounding of tax payable, LITO, WATO and the Medicare levy".
//
// The law states no rounding rule for any of the four (ITAA 1997 s 4-10(3); ss 61-110/115,
// 61-155/160; Medicare Levy Act 1986 ss 7, 8). SAPTO alone rounds up (reg ss 9(8), 10(2)), and is
// pinned in core-income-tax. Every expected figure below is hand-worked: the bracket ladder in
// whole percentages times whole-dollar slices is an integer number of cents, so the "exact"
// reference is integer arithmetic and cannot itself round.
import test from 'node:test';
import assert from 'node:assert/strict';

import { toCents } from '../dist/core/money.js';
import { taxableIncome } from '../dist/core/incomeBases.js';
import { medicareLevy, taxOnTaxableIncome } from '../dist/core/incomeTax.js';

const ti = (dollars) => taxableIncome(toCents(dollars));

// Register §2.1: nil to $18,200 · 15% (14% from FY2027-28) to $45,000 · 30% to $135,000 ·
// 37% to $190,000 · 45% above. Percent × whole dollars = cents, exactly.
const exactTaxCents = (dollars, lowestPercent) => {
  const bands = [
    [18_200, 0],
    [45_000, lowestPercent],
    [135_000, 30],
    [190_000, 37],
    [Infinity, 45],
  ];
  let cents = 0;
  let lower = 0;
  for (const [upper, percent] of bands) {
    if (dollars <= lower) break;
    cents += (Math.min(dollars, upper) - lower) * percent;
    lower = upper;
  }
  return cents;
};

test('P3-1d: a whole-dollar taxable income gives the exact tax in cents, never rounded to a dollar', () => {
  for (const [fy, lowest] of [['2026-27', 15], ['2027-28', 14]]) {
    for (let dollars = 0; dollars <= 260_000; dollars += 1_237) {
      assert.equal(taxOnTaxableIncome(fy, ti(dollars)), exactTaxCents(dollars, lowest), `FY${fy} $${dollars}`);
    }
  }
  // Two by hand, both off a whole dollar of tax — a floor or a round to $1 moves each.
  // FY2026-27 $50,001: 15% × 26,800 = 4,020 + 30% × 5,001 = 1,500.30 → $5,520.30.
  assert.equal(taxOnTaxableIncome('2026-27', ti(50_001)), 552_030);
  // FY2027-28 $20,001: 14% × 1,801 = $252.14.
  assert.equal(taxOnTaxableIncome('2027-28', ti(20_001)), 25_214);
});

test('P3-1d: cents inside taxable income are taxed, not truncated to a whole dollar first', () => {
  // FY2026-27 $50,000.50: 4,020 + 30% × 5,000.50 = 1,500.15 → $5,520.15. Truncating income first gives $5,520.00.
  assert.equal(taxOnTaxableIncome('2026-27', taxableIncome(5_000_050)), 552_015);
  // $18,200.99 is above the threshold by 99c: 15% × 99c = 14.85c → 15c.
  assert.equal(taxOnTaxableIncome('2026-27', taxableIncome(1_820_099)), 15);
});

test('P3-1d: the Medicare levy is exact cents on a whole-dollar income and keeps the cents of one that has them', () => {
  const levy = (cents) =>
    medicareLevy({ fy: '2026-27', taxableIncome: taxableIncome(cents), saptoReceived: toCents(0) });
  // Full levy: 2% × $50,001 = $1,000.02; 2% × $50,000.50 = $1,000.01 (truncating income first gives $1,000.00).
  assert.equal(levy(5_000_100).levy, 100_002);
  assert.equal(levy(5_000_050).levy, 100_001);
  // s 7(2) shade-in: 10% of the excess over the lower threshold. $1,001 over → $100.10 exactly.
  const lower = levy(5_000_000).lowerThreshold;
  const shaded = levy(lower + 100_100);
  assert.equal(shaded.band, 'shade-in');
  assert.equal(shaded.levy, 10_010);
});
