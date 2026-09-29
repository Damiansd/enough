// P3-1c — the Medicare levy family shade-in: Medicare Levy Act 1986 ss 8(1)–(4), (7).
//
// Every expected figure here is hand-worked from the statute, with the arithmetic written out
// beside it, and nothing was produced by running the implementation. The anchor fixture is the
// ATO's own worked example (QC27032, "Ashton"), which is independent of both this code and my
// arithmetic and which discriminates between every competing reading of s 8 — see
// `docs/research/p3-medicare-family-shadein.md` §3.6.
//
// The statute, in the order it applies (research §3.1):
//
//   s 6(1)   2% of the Person's own taxable income
//   s 7(1)   nil where that income is at or below their own `threshold amount`
//   s 7(2)   otherwise capped at 10% of the excess, up to their own `phase-in limit`
//   s 8(1)   nil where family income does not exceed the family income threshold
//   s 8(2)   reduce by `0.02 × FIT − 0.08 × (FI − FIT)`, "the amount (if any)" — nil if negative
//   s 8(3)   apportion that reduction pro-rata by taxable income, BUT ONLY IF the spouse would
//            themselves be liable to levy but for ss 8 and 9 — s 7 is not excluded from that test
//   s 8(4)   any part of the reduction exceeding the Person's own levy reduces the SPOUSE's levy
//
// §2.7 figures, FY2025-26 carried as a labelled prior-year fallback (T10):
//   threshold amount   $28,011 ordinary · $44,268 seniors
//   phase-in limit     $35,013 ordinary · $55,335 seniors
//   family income threshold  $47,238 ordinary · $61,623 seniors · + $4,338 per dependent child
import test from 'node:test';
import assert from 'node:assert/strict';

import { addCents, toCents } from '../dist/core/money.js';
import { familyIncome, taxableIncome } from '../dist/core/incomeBases.js';
import * as incomeTax from '../dist/core/incomeTax.js';
import {
  FamilySpouseNotSuppliedError,
  householdMedicareLevy,
  medicareLevy,
} from '../dist/core/incomeTax.js';
import { TAX } from '../dist/data/assumptions/tax.js';

const ti = (dollars) => taxableIncome(toCents(dollars));
const FY = '2026-27';

/** A Person on the family path. `sapto` > 0 is the T8 seniors switch, for them and for the spouse. */
const levy = ({ own, spouse, sapto = 0, spouseSapto = 0, children = 0, fy = FY }) =>
  medicareLevy({
    fy,
    taxableIncome: ti(own),
    saptoReceived: toCents(sapto),
    familyIncome: spouse === null ? familyIncome(ti(own)) : familyIncome(ti(own), ti(spouse)),
    spouse: spouse === null ? null : { taxableIncome: ti(spouse), saptoReceived: toCents(spouseSapto) },
    dependentChildren: children,
  });

// --- The ATO's own worked example ----------------------------------------------------------------

test("ATO QC27032 'Ashton' reproduces to the cent — $92.90 — and rules out every other reading", () => {
  // "Ashton is 68 years old and his taxable income is $49,700 in 2025-26 … his spouse's taxable
  // income was $21,700 … The calculator confirms they are entitled to SAPTO … his Medicare levy
  // will be reduced to $92.90."
  //
  //   s 6(1)  2% × 49,700                                              =   $994.00
  //   s 7(2)  seniors: 44,268 < 49,700 ≤ 55,335, so 10% × 5,432        =   $543.20  ⇒ base
  //   s 8(5)  family income 49,700 + 21,700                            = $71,400
  //   s 8(7)  family income threshold, seniors, no children            = $61,623
  //   s 8(2)  0.02 × 61,623 = 1,232.46; 0.08 × 9,777 = 782.16
  //           raw reduction 1,232.46 − 782.16                          =   $450.30
  //   s 8(3)  spouse's $21,700 ≤ her own $44,268 ⇒ NOT liable ⇒ the gate does not open
  //           ⇒ Ashton keeps the WHOLE reduction, unapportioned        =   $450.30
  //           543.20 − 450.30                                          =    $92.90
  //
  // Run in two financial years. §2.7's thresholds are one shared prior-year-fallback record, so
  // the amount is year-invariant by construction; the second year is here to say so honestly.
  for (const fy of ['2026-27', '2027-28']) {
    const ashton = levy({ own: 49_700, spouse: 21_700, sapto: 1, spouseSapto: 1, fy });
    assert.equal(ashton.levy, toCents(92.9), `Ashton in FY${fy}`);
    assert.equal(ashton.band, 'shade-in');
    assert.equal(ashton.seniorsThresholds, true);
    assert.equal(ashton.sevenTwoCeiling, toCents(543.2));
    assert.equal(ashton.familyShadeIn.raw, toCents(450.3));
    assert.equal(ashton.familyShadeIn.apportioned, false);
    assert.equal(ashton.familyShadeIn.reduction, toCents(450.3));
    assert.equal(ashton.familyShadeIn.excessToSpouse, toCents(0));

    // Each competing reading, and the figure it would have produced (research §3.6):
    //   apportion unconditionally, ignoring the s 8(3)(c) gate:
    //     spouse's share = round(450.30 × 21,700/71,400) = round(136.8559) = 136.86
    //     543.20 − (450.30 − 136.86)                                     = $229.76
    //   ignore s 7(2) because he is married: 994.00 − 450.30             = $543.70
    //   levy family income at 2% and split: (0.02 × 71,400 − 450.30) × 49,700/71,400
    //                                                                     = $680.56
    //   test his own income against the FAMILY threshold: 49,700 ≤ 61,623 = $0.00
    //   the pre-2014 taper 0.085: 1,232.46 − 831.05 = 401.41; 543.20 − 401.41 = $141.79
    //   a 0.10 taper: 1,232.46 − 977.70 = 254.76; 543.20 − 254.76        = $288.44
    //   apply s 8 BEFORE s 7(2), then cap: min(994.00 − 450.30, 543.20)   = $543.20
    for (const wrong of [229.76, 543.7, 543.2, 680.56, 0, 141.79, 288.44]) {
      assert.notEqual(ashton.levy, toCents(wrong), `FY${fy} must not produce $${wrong}`);
    }
  }

  // And his spouse pays nothing at all: $21,700 is below her own $44,268, so s 7(1) answers
  // before s 8 is reached. This is what "not liable but for ss 8 and 9" means in s 8(3)(c).
  const spouse = levy({ own: 21_700, spouse: 49_700, sapto: 1, spouseSapto: 1 });
  assert.equal(spouse.levy, toCents(0));
  assert.equal(spouse.basis, 's 7 — the Person alone');
  assert.equal(spouse.familyShadeIn, undefined);
});

// --- s 8(3): the gate, both ways -----------------------------------------------------------------

test('s 8(3) GATE CLOSED — a spouse below their own threshold amount leaves the whole reduction', () => {
  // A seniors couple squarely inside the seniors family band: $46,000 and $20,000.
  //   s 7(2)  10% × (46,000 − 44,268)                                  =   $173.20  ⇒ base
  //   s 8(2)  family income 66,000; 0.02 × 61,623 = 1,232.46
  //           0.08 × (66,000 − 61,623) = 0.08 × 4,377 = 350.16
  //           raw 1,232.46 − 350.16                                    =   $882.30
  //   s 8(3)  spouse's $20,000 ≤ $44,268 ⇒ gate closed ⇒ whole reduction
  //           173.20 − 882.30 is negative ⇒ levy nil
  const person = levy({ own: 46_000, spouse: 20_000, sapto: 1, spouseSapto: 1 });
  assert.equal(person.familyShadeIn.raw, toCents(882.3));
  assert.equal(person.familyShadeIn.apportioned, false);
  assert.equal(person.familyShadeIn.reduction, toCents(882.3));
  assert.equal(person.levy, toCents(0));
  // Apportioned, this would have been 882.30 × 46,000/66,000 = $614.83, and the levy would still
  // be nil — but the excess that s 8(4) can move differs, so the gate is not cosmetic even here.
  // s 8(4)(a) requires s 8(3) to have applied, so a closed gate moves nothing to the spouse:
  assert.equal(person.familyShadeIn.excessToSpouse, toCents(0));
});

test('s 8(3) GATE OPEN — an ordinary couple in the only window where apportionment is reachable', () => {
  // Both spouses liable needs each above $28,011, i.e. family income above $56,022, against a
  // band that ends at 1.25 × 47,238 = $59,047.50. $30,000 + $28,500 = $58,500 is inside it.
  //
  //   s 8(2)  0.02 × 47,238 = 944.76; 0.08 × (58,500 − 47,238) = 0.08 × 11,262 = 900.96
  //           raw                                                      =    $43.80
  //   s 8(3)  both above $28,011 ⇒ the gate opens. The statute subtracts the SPOUSE's share:
  //     the $30,000 Person: round(43.80 × 28,500/58,500) = round(21.3385) = 21.34
  //                         reduction 43.80 − 21.34                     =    $22.46
  //                         base 10% × (30,000 − 28,011) = 198.90; levy  =   $176.44
  //     the $28,500 Person: round(43.80 × 30,000/58,500) = round(22.4615) = 22.46
  //                         reduction 43.80 − 22.46                     =    $21.34
  //                         base 10% × (28,500 − 28,011) =  48.90; levy  =    $27.56
  const higher = levy({ own: 30_000, spouse: 28_500 });
  const lower = levy({ own: 28_500, spouse: 30_000 });

  assert.equal(higher.familyShadeIn.raw, toCents(43.8));
  assert.equal(higher.familyShadeIn.apportioned, true);
  assert.equal(higher.familyShadeIn.reduction, toCents(22.46));
  assert.equal(higher.levy, toCents(176.44));
  assert.equal(lower.familyShadeIn.reduction, toCents(21.34));
  assert.equal(lower.levy, toCents(27.56));

  // The household gets the reduction exactly once: the two shares sum back to `raw`, which is
  // what following the statutory order — subtract the spouse's share — buys over computing
  // `raw × TI(self)/FI` directly and rounding twice (research U5).
  assert.equal(addCents(higher.familyShadeIn.reduction, lower.familyShadeIn.reduction), toCents(43.8));

  // Not apportioning at all would give 198.90 − 43.80 = $155.10 …
  assert.notEqual(higher.levy, toCents(155.1));
  // … and apportioning the wrong way round — keeping the SPOUSE's share instead of subtracting
  // it — would give 198.90 − 21.34 = $177.56.
  assert.notEqual(higher.levy, toCents(177.56));
});

test('for a seniors couple the s 8(3) gate cannot open inside the band — arithmetic, not a fixture', () => {
  // Both spouses liable needs each above the seniors threshold amount of $44,268, so a family
  // income above $88,536. The seniors band ends at 1.25 × $61,623 = $77,028.75. The two do not
  // overlap, so for a retiree couple the reduction is never split: one spouse takes all of it
  // and the other pays nothing under s 7(1). The gate-closed case is the LIVE case here.
  const { seniorsSingleLower, seniorsFamilyLower } = TAX.medicareLevy.lowIncomeThresholds;
  assert.ok(2 * seniorsSingleLower.value > seniorsFamilyLower.value * 1.25, 'both liable is above the band');

  // Sampled across the band, apportionment never happens and the answer never depends on it.
  for (const familyDollars of [61_624, 65_000, 70_000, 77_028]) {
    const own = 45_000; // above $44,268, so this Person is liable and in their own s 7(2) range
    const result = levy({ own, spouse: familyDollars - own, sapto: 1, spouseSapto: 1 });
    assert.equal(result.familyShadeIn.apportioned, false, `family income $${familyDollars}`);
  }
});

// --- s 8(4): the excess crosses to the spouse ----------------------------------------------------

test('s 8(4) — a reduction larger than the Person\'s own levy reduces the SPOUSE\'s levy', () => {
  // $28,050 and $30,000, family income $58,050 — inside the ordinary window, so s 8(3) applies
  // and both are simultaneously capped by their own s 7(2), which is the only way s 8(4) can
  // bite (research §4: otherwise raw < 0.02 × FIT < 0.02 × FI, so no share can exceed its levy).
  //
  //   s 8(2)  0.02 × 47,238 = 944.76; 0.08 × (58,050 − 47,238) = 0.08 × 10,812 = 864.96
  //           raw                                                      =    $79.80
  //   the $28,050 Person: base 10% × 39                                 =     $3.90
  //           round(79.80 × 30,000/58,050) = round(41.2403) = 41.24; reduction 79.80 − 41.24
  //                                                                     =    $38.56
  //           3.90 − 38.56 < 0 ⇒ levy nil, excess                       =    $34.66
  //   the $30,000 Person: base 10% × 1,989                              =   $198.90
  //           round(79.80 × 28,050/58,050) = round(38.5597) = 38.56; reduction 79.80 − 38.56
  //                                                                     =    $41.24
  //           198.90 − 41.24                                            =   $157.66
  //   s 8(4)  157.66 − the other's excess of 34.66                      =   $123.00
  const [small, large] = householdMedicareLevy([
    {
      fy: FY,
      taxableIncome: ti(28_050),
      saptoReceived: toCents(0),
      familyIncome: familyIncome(ti(28_050), ti(30_000)),
      spouse: { taxableIncome: ti(30_000), saptoReceived: toCents(0) },
    },
    {
      fy: FY,
      taxableIncome: ti(30_000),
      saptoReceived: toCents(0),
      familyIncome: familyIncome(ti(28_050), ti(30_000)),
      spouse: { taxableIncome: ti(28_050), saptoReceived: toCents(0) },
    },
  ]);

  assert.equal(small.familyShadeIn.raw, toCents(79.8));
  assert.equal(small.familyShadeIn.reduction, toCents(38.56));
  assert.equal(small.levy, toCents(0));
  assert.equal(small.familyShadeIn.excessToSpouse, toCents(34.66));

  assert.equal(large.familyShadeIn.reduction, toCents(41.24));
  assert.equal(large.familyShadeIn.excessFromSpouse, toCents(34.66));
  assert.equal(large.levy, toCents(123));
  // Without s 8(4) the $30,000 Person would pay $157.66 — the excess would simply evaporate.
  assert.notEqual(large.levy, toCents(157.66));
});

test('s 8(4) is mutual, and where both spouses generate an excess both levies are nil', () => {
  // The research's own worked instance (§4): $28,050 each, family income $56,100.
  //   base 10% × 39 = $3.90 each
  //   raw 944.76 − 0.08 × 8,862 = 944.76 − 708.96 = $235.80; each keeps half = $117.90
  //   each reduction exceeds each base by $114.00, and each excess crosses to the other.
  // The statute is circular here and does not say whose excess is applied to what; it is applied
  // in one non-recursive pass, which is unobservable because both levies are already exhausted.
  const input = (own, other) => ({
    fy: FY,
    taxableIncome: ti(own),
    saptoReceived: toCents(0),
    familyIncome: familyIncome(ti(own), ti(other)),
    spouse: { taxableIncome: ti(other), saptoReceived: toCents(0) },
  });
  const [first, second] = householdMedicareLevy([input(28_050, 28_050), input(28_050, 28_050)]);
  for (const result of [first, second]) {
    assert.equal(result.familyShadeIn.raw, toCents(235.8));
    assert.equal(result.familyShadeIn.reduction, toCents(117.9));
    assert.equal(result.familyShadeIn.excessToSpouse, toCents(114));
    assert.equal(result.familyShadeIn.excessFromSpouse, toCents(114));
    assert.equal(result.levy, toCents(0));
  }
});

// --- The band test is `raw > 0`, not `family income ≤ the published upper` ------------------------

test('the band ends where the reduction runs out, not at the published upper threshold', () => {
  // The published uppers are not in the Act: they are 1.25 × the lower, and they do not round
  // consistently ($59,047.50 truncates, $5,422.50 rounds up). The Act's own test is "the amount
  // (if any)", so the band ends at exactly 1.25 × FIT and the model tests `raw > 0`.
  //
  // Family income $59,047.25 — ABOVE the published $59,047 upper, and still inside the band:
  //   0.02 × 47,238 = 944.76; 0.08 × (59,047.25 − 47,238) = 0.08 × 11,809.25 = 944.74
  //   raw                                                                   = $0.02
  //   both above $28,011 ⇒ apportioned: round(0.02 × 29,047.25/59,047.25) = round(0.0098) = 0.01
  //   reduction 0.02 − 0.01 = 0.01; base 10% × 1,989 = 198.90; levy         = $198.89
  const inside = levy({ own: 30_000, spouse: 29_047.25 });
  assert.equal(inside.band, 'shade-in');
  assert.equal(inside.familyShadeIn.raw, toCents(0.02));
  assert.equal(inside.levy, toCents(198.89));
  assert.equal(inside.upperThreshold, toCents(59_047)); // reported, never tested against
  assert.ok(inside.incomeTested > inside.upperThreshold, 'past the published upper, still in the band');

  // Two dollars of family income later the reduction is negative, and "the amount (if any)" is
  // nil — not a negative reduction that would ADD to the levy:
  //   0.08 × (59,047.75 − 47,238) = 0.08 × 11,809.75 = 944.78; 944.76 − 944.78 = −$0.02 ⇒ nil
  const outside = levy({ own: 30_000, spouse: 29_047.75 });
  assert.equal(outside.band, 'full levy');
  assert.equal(outside.familyShadeIn, undefined);
  assert.equal(outside.levy, toCents(198.9));
  assert.notEqual(outside.levy, toCents(198.92)); // what dropping the floor would produce
});

// --- s 8(1), the child uplift, and a family path with no spouse -----------------------------------

test('s 8(3)(b) — no spouse means no apportionment, and the child uplift feeds s 8(2) as well', () => {
  // A Person on the family path through dependants alone: s 8(5)(b) makes family income their own
  // taxable income, and s 8(3)(b) fails outright, so the whole reduction stays with them.
  //   FIT 47,238 + 4,338 (one child)                                    = $51,576
  //   0.02 × 51,576 = 1,031.52; 0.08 × (55,000 − 51,576) = 0.08 × 3,424 = 273.92
  //   raw                                                               =  $757.60
  //   base: $55,000 is above the $35,013 phase-in limit ⇒ the full 2%    = $1,100.00
  //   1,100.00 − 757.60                                                 =  $342.40
  const single = levy({ own: 55_000, spouse: null, children: 1 });
  assert.equal(single.lowerThreshold, toCents(51_576));
  assert.equal(single.familyShadeIn.raw, toCents(757.6));
  assert.equal(single.familyShadeIn.apportioned, false);
  assert.equal(single.sevenTwoCeiling, undefined);
  assert.equal(single.levy, toCents(342.4));
});

// --- The mixed-SAPTO couple: two thresholds, one family income, both answers right ---------------

test('O30 — a mixed-SAPTO couple is assessed PER TAXPAYER, on two different family thresholds', () => {
  // Until 2026-09-21 this couple was REFUSED (`MixedSaptoFamilyThresholdError`, register O30) on
  // the view that s 8 does not say which of the two family income thresholds governs. It does not
  // have to: s 8's operative limbs are each framed on "a person"/"the relevant person", "family
  // income threshold" is defined "in relation to a person" while "family income" is expressly the
  // SHARED sum, and s 8(7) substitutes $61,623 "in relation to a person who is entitled" to SAPTO
  // — the same formula as s 3(1)'s `threshold amount`, which this engine has always read per
  // Person. s 8(5)(b) shows the drafter pulling a spouse's circumstances into a per-person term
  // in terms ("the relevant person OR THE SPOUSE of the relevant person", for the child uplift);
  // s 8(7) does not. So each spouse applies THEIR OWN threshold to the ONE family income, and the
  // two answers are simultaneously correct.
  //
  // The fixture has to be in a narrow window to make both spouses pay at once, and the window is
  // itself a derivation worth stating: the senior must clear their own $44,268 threshold amount
  // and the other their own $28,011, so family income must exceed $72,279 — while the senior's
  // s 8(2) reduction runs out at 1.25 × 61,623 = $77,028.75. $75,000 sits inside that window and
  // nothing below $72,280 could.
  //
  // Ada, 68, SAPTO received, taxable income $46,000:
  //   s 6(1)  2% × 46,000                                                      =   $920.00
  //   s 7(2)  seniors: 44,268 < 46,000 ≤ 55,335, so 10% × 1,732                =   $173.20  ⇒ base
  //   s 8(7)  HER family income threshold                                      = $61,623
  //   s 8(2)  0.02 × 61,623 = 1,232.46; 0.08 × (75,000 − 61,623) = 1,070.16    =   $162.30  raw
  //   s 8(3)  her spouse's $29,000 clears HIS OWN $28,011, so it apportions:
  //           162.30 − 162.30 × 29,000/75,000 = 162.30 − 62.76                 =    $99.54
  //   levy    173.20 − 99.54                                                   =    $73.66
  //
  // Ben, 61, no SAPTO, taxable income $29,000:
  //   s 6(1)  2% × 29,000                                                      =   $580.00
  //   s 7(2)  ordinary: 28,011 < 29,000 ≤ 35,013, so 10% × 989                 =    $98.90  ⇒ base
  //   s 8(5)  HIS family income threshold                                      = $47,238
  //   s 8(2)  0.02 × 47,238 = 944.76; 0.08 × (75,000 − 47,238) = 2,220.96, so the reduction is
  //           negative — "the amount (if any)" is nil, and his own band ran out at $59,047.50
  //   levy    the s 7(2) figure, unreduced                                     =    $98.90
  const ada = levy({ own: 46_000, spouse: 29_000, sapto: 1, spouseSapto: 0 });
  const ben = levy({ own: 29_000, spouse: 46_000, sapto: 0, spouseSapto: 1 });

  // The two thresholds differ, and each is the Person's own. This is the assertion the refusal
  // used to stand in the way of, and it is the one a household-wide reading cannot satisfy.
  assert.equal(ada.lowerThreshold, toCents(61_623));
  assert.equal(ben.lowerThreshold, toCents(47_238));
  assert.notEqual(ada.lowerThreshold, ben.lowerThreshold);

  assert.equal(ada.band, 'shade-in');
  assert.equal(ada.familyShadeIn.raw, toCents(162.3));
  assert.equal(ada.familyShadeIn.apportioned, true);
  assert.equal(ada.familyShadeIn.reduction, toCents(99.54));
  assert.equal(ada.levy, toCents(73.66));

  assert.equal(ben.band, 'full levy');
  assert.equal(ben.familyShadeIn, undefined);
  assert.equal(ben.levy, toCents(98.9));

  // AND THE PAIR STRADDLES THE TWO HOUSEHOLD-WIDE READINGS O30 WAS TORN BETWEEN, which is the
  // structural fact that makes the per-taxpayer answer recognisable rather than merely different.
  // Hand-worked on the same two s 3(1) switches, varying ONLY the family income threshold:
  //   both on $61,623  Ada $73.66 (as above) + Ben: raw 162.30, apportioned against Ada's $46,000
  //                    clearing her own $44,268 ⇒ 162.30 − 99.54 = 62.76, levy 98.90 − 62.76
  //                    = $36.14                                        ⇒ household $109.80
  //   both on $47,238  both reductions negative ⇒ Ada $173.20 + Ben $98.90 ⇒ household $272.10
  // The per-taxpayer household is $172.56: strictly between. Ada takes the LOWER of her two
  // figures and Ben the HIGHER of his, each because of their own entitlement — so moving off a
  // household-wide reading moves one spouse up and the other down, and never both the same way.
  assert.equal(addCents(ada.levy, ben.levy), toCents(172.56));
  assert.ok(addCents(ada.levy, ben.levy) > toCents(109.8));
  assert.ok(addCents(ada.levy, ben.levy) < toCents(272.1));

  // s 8(4) has nothing to carry here — neither reduction exceeds the levy it reduces — and the
  // household call agrees with the two single calls, which is where a reconciliation step would
  // show up if one had been added.
  const [first, second] = householdMedicareLevy([
    {
      fy: FY,
      taxableIncome: ti(46_000),
      saptoReceived: toCents(1),
      familyIncome: familyIncome(ti(46_000), ti(29_000)),
      spouse: { taxableIncome: ti(29_000), saptoReceived: toCents(0) },
    },
    {
      fy: FY,
      taxableIncome: ti(29_000),
      saptoReceived: toCents(0),
      familyIncome: familyIncome(ti(29_000), ti(46_000)),
      spouse: { taxableIncome: ti(46_000), saptoReceived: toCents(1) },
    },
  ]);
  assert.equal(first.levy, toCents(73.66));
  assert.equal(second.levy, toCents(98.9));
});

test("O30 — below the senior's own threshold s 8(1) gives her nil, on a family income over the other's band", () => {
  // The case the old refusal reached furthest for, and called undecidable: a Person on $50,000
  // receiving SAPTO with a spouse on $10,000 who does not. Family income $60,000 is BELOW her
  // $61,623, so s 8(1) answers nil for her — while $60,000 is past 1.25 × 47,238 = $59,047.50, so
  // on HIS threshold s 8(2) grants nothing at all. Two limbs, two thresholds, no contradiction:
  // he pays nothing only because his own $10,000 never clears s 7(1)'s $28,011.
  const senior = levy({ own: 50_000, spouse: 10_000, sapto: 1, spouseSapto: 0 });
  assert.equal(senior.levy, toCents(0));
  assert.equal(senior.basis, 's 8 — family income');
  assert.equal(senior.band, 'below the lower threshold');
  assert.equal(senior.lowerThreshold, toCents(61_623));
  // On the OTHER spouse's threshold she would have paid her own s 7(2) figure, 10% × (50,000 −
  // 44,268) = $573.20. That figure is what a household-wide reading on the smaller threshold
  // produces, and it is not this one.
  assert.notEqual(senior.levy, toCents(573.2));

  const junior = levy({ own: 10_000, spouse: 50_000, sapto: 0, spouseSapto: 1 });
  assert.equal(junior.levy, toCents(0));
  assert.equal(junior.basis, 's 7 — the Person alone');

  // And outside every band the two readings always agreed, so this fixture is unmoved by O30's
  // closure: Ying ($54,020, no SAPTO) and Li Jun ($25,677, SAPTO received), family income $79,697,
  // above 1.25 × 61,623 = $77,028.75 — s 7 alone, 2% × 54,020 = $1,080.40.
  const ying = levy({ own: 54_020, spouse: 25_677, sapto: 0, spouseSapto: 1_602 });
  assert.equal(ying.levy, toCents(1_080.4));
  assert.equal(ying.band, 'full levy');
});

test('a family levy inside the band without the spouse is REFUSED, not guessed', () => {
  // JavaScript callers can omit what the type system requires. Inside the band the spouse decides
  // whether s 8(3) apportions, which is the whole difference between $92.90 and $229.76, so the
  // omission is refused rather than resolved in the caller's favour.
  const withoutSpouse = (own, other) =>
    medicareLevy({
      fy: FY,
      taxableIncome: ti(own),
      saptoReceived: toCents(0),
      familyIncome: familyIncome(ti(own), ti(other)),
    });
  assert.throws(() => withoutSpouse(29_000, 29_000), FamilySpouseNotSuppliedError);

  // Outside the band the spouse cannot change the number, so it is not demanded: family income
  // $80,000 leaves no reduction and the answer is s 7(2)'s $198.90 on $30,000.
  assert.equal(withoutSpouse(30_000, 50_000).levy, toCents(198.9));
});

test('a family income that is not the sum of the two taxable incomes is refused', () => {
  // s 8(5)(a) defines it as exactly that sum. A mismatch would put s 8(3)'s denominator and
  // s 8(2)'s taper on two different households.
  assert.throws(
    () =>
      medicareLevy({
        fy: FY,
        taxableIncome: ti(29_000),
        saptoReceived: toCents(0),
        familyIncome: familyIncome(ti(29_000), ti(20_000)),
        spouse: { taxableIncome: ti(29_000), saptoReceived: toCents(0) },
      }),
    /s 8\(5\) defines it as exactly that sum/,
  );
});

// --- The two coefficients are records, and they are not the same figure as the levy rate ----------

test('s 8(2) 2% and 0.08 are separate records, and the 2% is a tripwire on the levy rate', () => {
  const { familyShadeInBaseRate, familyShadeInTaper, rate } = TAX.medicareLevy;
  assert.equal(familyShadeInTaper.value, 0.08);
  assert.equal(familyShadeInTaper.kind, 'constant');
  assert.equal(familyShadeInBaseRate.value, 0.02);
  // They have moved together historically (1.5%/0.085 → 2%/0.08) but not proportionally, and they
  // are separate literals in separate provisions. This is a tripwire, not a definition: if the
  // levy rate ever moves alone, this fails and someone reads s 8(2) again rather than the band
  // silently changing width.
  assert.equal(familyShadeInBaseRate.value, rate.value);
  // 1.25 is a consequence of the pair, not a stored figure: 0.02 × FIT = 0.08 × (FI − FIT).
  assert.equal(familyShadeInBaseRate.value / familyShadeInTaper.value, 0.25);
});

// --- P3-35: the two refusals' messages, and the reach one of them must not lose ------------------

/** The message a call actually throws, so the canaries below read prose that was produced, not quoted. */
const messageFrom = (call) => {
  let message = '';
  assert.throws(call, (error) => {
    message = error.message;
    return true;
  });
  return message;
};

test('MUTATION O30 — the mixed-SAPTO couple is per-taxpayer, and no household-wide reading survives', () => {
  // This replaces the P3-35 battery that asserted `MixedSaptoFamilyThresholdError` fired across
  // the whole of its reach. The refusal was DELETED on 2026-09-21 on a reversed premise — the
  // constraint it protected (that two spouses' reductions sum to one household `raw`) is an
  // artefact of the SYMMETRIC case and was never a rule — so what has to be canaried now is the
  // construction that replaced it, not the width of a guard. Three mutations are in view, and
  // each is killed by a named assertion below:
  //
  //   M1  compute BOTH spouses on the LARGER of the two thresholds ($61,623)
  //   M2  compute BOTH spouses on the SMALLER ($47,238)
  //   M3  read the SPOUSE's SAPTO switch for a Person's own family threshold (the two swapped)
  //
  // and a fourth that is not a wrong number but a regression of posture:
  //
  //   M4  reinstate any refusal anywhere in the reach the deleted guard used to have.
  const ada = levy({ own: 46_000, spouse: 29_000, sapto: 1, spouseSapto: 0 });
  const ben = levy({ own: 29_000, spouse: 46_000, sapto: 0, spouseSapto: 1 });

  // M1 — under it Ben's reduction would be 162.30 − 162.30 × 46,000/75,000 = $62.76 and his levy
  // $36.14. He gets no reduction at all, because $75,000 is past HIS $59,047.50.
  assert.equal(ben.levy, toCents(98.9));
  assert.notEqual(ben.levy, toCents(36.14));
  // M2 — under it Ada's reduction is negative and she pays her whole s 7(2) figure, $173.20.
  assert.equal(ada.levy, toCents(73.66));
  assert.notEqual(ada.levy, toCents(173.2));
  // M3 — the switch each reads is their OWN, so swapping the two swaps the answers and does not
  // leave them alone. Stated as the two thresholds rather than as the levies, because that is the
  // line of code the mutation touches.
  assert.equal(ada.lowerThreshold, toCents(61_623));
  assert.equal(ben.lowerThreshold, toCents(47_238));
  // Both directions are read off the $46,000 Person, because the $29,000 one cannot show it: make
  // HIM the senior and his own $29,000 falls under s 7(1)'s $44,268, which answers nil before any
  // family threshold is chosen at all.
  assert.equal(levy({ own: 46_000, spouse: 29_000, sapto: 0, spouseSapto: 1 }).lowerThreshold, toCents(47_238));
  assert.equal(levy({ own: 46_000, spouse: 29_000, sapto: 1, spouseSapto: 1 }).lowerThreshold, toCents(61_623));
  assert.equal(levy({ own: 29_000, spouse: 46_000, sapto: 1, spouseSapto: 0 }).lowerThreshold, toCents(44_268));

  // M4 — THE WHOLE OF THE DELETED GUARD'S REACH ANSWERS. It fired at every family income below
  // 1.25 × the larger threshold, i.e. everywhere under $77,028.75, on every mixed couple. Swept
  // here at $500 steps from $30,000 to $77,000 of family income, at four splits and both ways
  // round, and every point must produce a number. A sweep and not a fixture, because what is
  // being defended is the ABSENCE of a branch on the couple being mixed.
  //
  // Two limbs can answer, and which one does is decided BEFORE any family test: s 7(1) returns nil
  // where the Person's own taxable income is at or below their own threshold amount, reporting
  // that threshold and never reaching s 8 — so at these family incomes a senior taking less than
  // $44,268 of the split is answered by s 7 and never sees $61,623. Splitting $77,000 or less so
  // that a senior clears $44,268 is possible; splitting it so BOTH clear their own is not, which
  // is the same arithmetic the $72,279 floor in the fixture above rests on.
  for (let family = 30_000; family <= 77_000; family += 500) {
    for (const share of [0.35, 0.5, 0.65, 0.8]) {
      const own = Math.round(family * share);
      for (const callerIsSenior of [true, false]) {
        const result = levy({
          own,
          spouse: family - own,
          sapto: callerIsSenior ? 1 : 0,
          spouseSapto: callerIsSenior ? 0 : 1,
        });
        const where = `family $${family}, own $${own}, caller ${callerIsSenior ? 'senior' : 'not'}`;
        if (own <= (callerIsSenior ? 44_268 : 28_011)) {
          assert.equal(result.basis, 's 7 — the Person alone', where);
          assert.equal(result.levy, toCents(0), where);
        } else {
          assert.equal(result.lowerThreshold, toCents(callerIsSenior ? 61_623 : 47_238), where);
          assert.ok(result.levy >= 0, where);
        }
      }
    }
  }
  // And the class itself is gone from the module's surface, not merely unthrown: a re-export would
  // let the guard come back without this file noticing.
  assert.equal(incomeTax.MixedSaptoFamilyThresholdError, undefined);

  // The senior's own band edge is now an observable number rather than the edge of a refusal:
  //   FI $77,000  0.02 × 61,623 = 1,232.46; 0.08 × 15,377 = 1,230.16, raw $2.30 > 0. Her spouse's
  //               $27,000 does not clear his own $28,011, so s 8(3) does not apportion and she
  //               keeps all of it: base 10% × (50,000 − 44,268) = 573.20, levy $570.90.
  //   FI $77,029  0.08 × 15,406 = 1,232.48 > 1,232.46 ⇒ the reduction is nil and she pays $573.20.
  const insideHerBand = levy({ own: 50_000, spouse: 27_000, sapto: 1, spouseSapto: 0 });
  assert.equal(insideHerBand.familyShadeIn.raw, toCents(2.3));
  assert.equal(insideHerBand.levy, toCents(570.9));
  const pastHerBand = levy({ own: 50_000, spouse: 27_029, sapto: 1, spouseSapto: 0 });
  assert.equal(pastHerBand.levy, toCents(573.2));
  assert.equal(pastHerBand.band, 'full levy');
});

test('MUTATION P3-35 — FamilySpouseNotSuppliedError states the condition it is thrown on', () => {
  // It fires on `raw > 0`: family income over the threshold by less than a QUARTER of it. The
  // message used to say the excess was smaller than s 8(2)'s reduction — a window 13.5 times
  // narrower (`FI − FIT < 0.0185 × FIT` against `< 0.25 × FIT`), and false across nearly the whole
  // of the range it actually fires in.
  const withoutSpouse = (own, other) =>
    medicareLevy({
      fy: FY,
      taxableIncome: ti(own),
      saptoReceived: toCents(0),
      familyIncome: familyIncome(ti(own), ti(other)),
    });
  const message = messageFrom(() => withoutSpouse(29_000, 29_000));

  // Layer 0 — the demand and its ground are unchanged.
  assert.match(message, /s 8\(3\) apportions the reduction only where the spouse would themselves be liable/);
  assert.match(message, /Pass `spouse`, or `spouse: null`/);

  // Layer 1 — the wording, and the shapes the same arithmetic claim could return in.
  for (const shape of [
    /by less than s 8\(2\)'s reduction/i,
    /exceeds[^.]{0,80}by less than[^.]{0,30}reduction/i,
    /\bexcess\b[^.]{0,60}\b(?:is|are)\b[^.]{0,20}\b(?:less|smaller)\b[^.]{0,30}\breduction\b/i,
    /\breduction\b[^.]{0,40}\bexceeds\b[^.]{0,30}\bexcess\b/i,
  ]) {
    assert.doesNotMatch(message, shape, `${shape} — true in 1/13.5 of the range this fires in`);
  }

  // Layer 2 — the condition, stated. `raw > 0` is `FI − FIT < 0.25 × FIT`.
  assert.match(message, /by less than a quarter of that threshold/);
  assert.match(message, /still leaves a reduction to grant/);
  assert.match(message, /the reduction still to be granted is cents while the excess over the threshold is thousands/);

  // Layer 3 — topic and count.
  const sentences = message.split(/(?<=\.)\s+/).filter((sentence) => sentence.trim() !== '');
  assert.equal(sentences.length, 3, `three statements: the condition, why the spouse decides it, and what to pass`);
  for (const sentence of sentences) {
    assert.match(sentence, /threshold|s 8\(|spouse/, `"${sentence}" is about none of this refusal's subjects`);
  }

  // The arithmetic the old sentence got wrong, priced. Same household with the spouse supplied, so
  // the figures are the ones the refusing call was describing:
  //   FIT $47,238, FI $58,000 ⇒ excess $10,762; raw = 944.76 − 0.08 × 10,762 = 944.76 − 860.96
  const inside = levy({ own: 29_000, spouse: 29_000 });
  assert.equal(inside.lowerThreshold, toCents(47_238));
  assert.equal(inside.familyShadeIn.raw, toCents(83.8));
  assert.ok(toCents(58_000) - inside.lowerThreshold > inside.familyShadeIn.raw * 100);

  // And it goes on firing to the last cent of the band, where the reduction left is four cents:
  //   FI $59,047 ⇒ excess $11,809; raw = 944.76 − 944.72 = $0.04
  //   FI $59,048 ⇒ 0.08 × 11,810 = 944.80 > 944.76, so nothing is left and it answers
  assert.throws(() => withoutSpouse(29_047, 30_000), FamilySpouseNotSuppliedError);
  assert.equal(levy({ own: 29_047, spouse: 30_000 }).familyShadeIn.raw, toCents(0.04));
  assert.equal(withoutSpouse(29_048, 30_000).band, 'full levy');
});
