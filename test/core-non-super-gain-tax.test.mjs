// P3-21f chunk 5 — THE REALISED GAIN REACHES THE TAX BASES, AND IT IS NOT TAXED ON ITS OWN SCHEDULE.
//
// Chunk 4 could realise a gain and the gain reached nothing: `discountedGain` accumulated in a local
// that no line and no balance read, pinned by a test asserting that every `Income tax` line was
// identical whether the household sold or not. That test is INVERTED in
// `test/core-non-super-disposal.test.mjs` rather than deleted, and this file is what replaced it.
//
// **What is defended here, and nothing else.**
//
//   1. **s 102-5 IS A METHOD STATEMENT AND NOT A SUM, and the difference is $1,500 on one fixture.**
//      A disposal realising a $15,000 discountable gain, a $2,000 undiscountable one and a $3,000
//      loss: the sum of per-parcel discounted gains is $6,500, the Act's own order gives $8,000 on
//      the stated default, and $7,000 on the order a taxpayer optimising would choose. Three
//      different numbers from one set of parcels, and only one of them is the law.
//   2. **WHICH GAIN THE LOSS GOES AGAINST IS THE TAXPAYER'S CHOICE, so it is a STATED default and a
//      lever** — `discountable-gains-first`, which is the order that leaves the household paying
//      more, on the same ground P3-21a chose FIFO over minimise-gain.
//   3. **THE TIMING, PINNED WITH A DOLLAR FIGURE AND A LIST OF MONTHS.** The whole of the year's
//      increment is charged in the month of the disposal; no month before it and no month after it
//      carries a cent. Two disposals in one financial year telescope to exactly the tax on one
//      combined gain ($132.50 + $5,300.00 = $5,432.50), and a disposal either side of 30 June is
//      assessed under its own year's rates from a clean slate.
//   4. **FOUR BASES, AND THE FIFTH IS UNTOUCHED.** The gain reaches the brackets, LITO, SAPTO's
//      rebate income and the Medicare levy, each with its own dollar component. It must NEVER reach
//      WATO's net labour income (ITAA 1997 s 61-155(2)) and a $250 figure says so.
//   5. **WRONG PERSON IS NOW MONEY — the last of the two weaknesses chunks 1 and 3 disclosed.** The
//      same parcel, the same sale, routed to the other Person: $32,900 of tax against $12,920.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { toCents } from '../dist/core/money.js';
import {
  CAPITAL_GAINS_TAX_LINE,
  CAPITAL_LOSS_APPLICATIONS,
  DEFAULT_CAPITAL_LOSS_APPLICATION,
  disposalFromSell,
  netCapitalGain,
  project,
  TAX_TRUE_UP_LINE,
  taxableIncomeWithNetCapitalGain,
  unfundedMiddleLimbs,
} from '../dist/core/projection.js';
import { taxableIncome } from '../dist/core/incomeBases.js';

const person = (name, dateOfBirth, over = {}) => ({
  name,
  dateOfBirth,
  // P6-8 brief 3 chunk 2b: the employer Superannuation Guarantee has to land in a NAMED account,
  // so a salaried Person holds one and the walk refuses a salary with nowhere to pay it. A NIL
  // balance is the smallest change that makes the fixture honest: it moves no figure of its own.
  superInterests: [{ phase: 'accumulation', balance: toCents(0) }],
  parcels: [],
  employmentIncomePerFortnight: toCents(0),
  workBonusBalance: toCents(0),
  ...over,
});
const parcel = (acquired, costBase, marketValue) => ({
  acquired,
  costBase: toCents(costBase),
  marketValue: toCents(marketValue),
});
const SETTINGS = {
  asAtDate: '2026-09-16',
  planningHorizonAge: 51,
  // Pay rising with wages (2026-09-23) is not this fixture's subject: `awote: 0` holds every salary at the figure stated. A proved control: every figure this file asserts is the same at nil on the build before pay rose.
  economicSeries: { cpi: 0.025, pblci: 0.025, awote: 0, mtawe: 0.035 },
  deemingRates: { lower: 0.0175, upper: 0.0375 },
  nominalReturn: 0.065,
  // Interest on cash (2026-09-23) is not this fixture's subject: stated nil, the control proved byte-identical to the walk before it existed.
  cashInterestRate: 0,
};
// **A flat-return Settings, and it is a fixture device rather than a claim about markets.** The
// gain a sale realises depends on the market value the parcel carries that month, so two sales in
// two different months realise two different gains under compounding — which would make a fixture
// comparing two MONTHS a fixture comparing two gains. At `nominalReturn: 0` the parcel is worth the
// same in June and in July and the only thing that differs is the financial year's own rules.
const FLAT = { ...SETTINGS, asAtDate: '2027-06-01', planningHorizonAge: 53, nominalReturn: 0 };
const sell = (id, date, amount, over = {}) => ({
  id,
  date,
  owner: 'personA',
  type: 'NON_SUPER_INVESTMENT',
  params: { direction: 'sell', amount: toCents(amount), ...over },
  enabled: true,
  createdAt: '2026-06-01',
});
const monthAt = (months, month) => months.find((m) => m.month === month);
const taxLines = (months, description = 'Income tax') =>
  months.flatMap((m) =>
    m.lines.filter((l) => l.description.startsWith(description)).map((l) => `${m.month} ${l.description} ${l.amount}`),
  );
const gainTax = (months) =>
  months.flatMap((m) => m.lines.filter((l) => l.description.startsWith(CAPITAL_GAINS_TAX_LINE)).map((l) => l.amount));
const reconciles = (months) => {
  for (const m of months) {
    const closing = m.lines.reduce(
      (balance, line) => balance + (line.effect !== 'cash' ? 0 : line.direction === 'inflow' ? line.amount : -line.amount),
      m.openingBalance,
    );
    assert.equal(closing, m.closingBalance, `${m.month} does not reconcile`);
  }
};

// --- 1. s 102-5 IS A METHOD STATEMENT, AND THE ORDER IS THE TAXPAYER'S CHOICE --------------------

// One Person, three parcels, one sale that takes all of them on 30 June 2027:
//
//   D  2015-03-03   cost $25,000   value $40,000   → $15,000 gross gain, held > 12 months
//   U  2026-09-01   cost $28,000   value $30,000   →  $2,000 gross gain, held 10 months, NO discount
//   L  2026-12-05   cost $13,000   value $10,000   →  $3,000 capital LOSS
//
// The loss is bigger than the undiscountable gain, so no ordering can absorb it in one place — which
// is the point of the fixture. If it fitted entirely inside one gain, two of the three figures below
// would coincide and the choice would be untested.
const MIXED = [parcel('2015-03-03', 25_000, 40_000), parcel('2026-09-01', 28_000, 30_000), parcel('2026-12-05', 13_000, 10_000)];
const MIXED_HOLDER = { persons: [person('Val', '1976-05-10', { parcels: MIXED })], homeStatus: 'occupied' };

test('the NET CAPITAL GAIN is the s 102-5 method statement, and it is $1,500 more than the summed figure', () => {
  const disposal = disposalFromSell(sell('sell', '2027-06-30', 80_000), MIXED_HOLDER, [MIXED]);
  assert.deepEqual(disposal.realisations.map((r) => r.nominalGain), [toCents(15_000), toCents(2_000), toCents(-3_000)]);
  assert.deepEqual(disposal.realisations.map((r) => r.discountApplies), [true, false, false]);

  // Σ per-parcel discounted gains: $7,500 + $2,000 − $3,000. Chunk 4 carries this figure and chunk 4
  // said in writing that it is NOT the net capital gain — because netting a loss AFTER the discount
  // gives the loss twice the effect the Act gives it.
  assert.equal(disposal.discountedGain, toCents(6_500));

  // The Act: step 1 applies the loss to GROSS gains, step 3 halves what survives.
  //   default, losses against the DISCOUNTABLE gain first: ($15,000 − $3,000) ÷ 2 + $2,000 = $8,000
  assert.equal(netCapitalGain(disposal.realisations), toCents(8_000));
  assert.equal(netCapitalGain(disposal.realisations) - disposal.discountedGain, toCents(1_500));
  //   the taxpayer optimising: $2,000 − $3,000 → nil, and the $1,000 left over against the
  //   discountable gain: ($15,000 − $1,000) ÷ 2 = $7,000
  assert.equal(netCapitalGain(disposal.realisations, 'undiscountable-gains-first'), toCents(7_000));

  // THREE DIFFERENT NUMBERS from one set of parcels, which is what makes the default a choice.
  assert.equal(new Set([disposal.discountedGain, netCapitalGain(disposal.realisations), netCapitalGain(disposal.realisations, 'undiscountable-gains-first')]).size, 3);
});

test('⚠️ AND IT IS MONEY IN THE WALK — the summed figure would charge $705 less tax', () => {
  // The unit figures above become a tax bill here, because a figure that never reaches a `Month`
  // is a figure no mutation has to survive. Val earns $260,000, so every dollar of net capital gain
  // is taxed at 45c plus the 2% levy and the difference between the two readings is legible:
  //   s 102-5, as the Act orders it:  $8,000 × 47% = $3,760.00
  //   Σ per-parcel discounted gains:  $6,500 × 47% = $3,055.00
  // A build that read `discountedGain` into taxable income would charge the lower one, which is a
  // plausible number and $705 short.
  const earner = {
    persons: [person('Val', '1976-05-10', { employmentIncomePerFortnight: toCents(10_000), parcels: MIXED })],
    homeStatus: 'occupied',
  };
  const months = project({ ...FLAT, asAtDate: '2027-06-01' }, earner, [sell('sell', '2027-06-30', 80_000)]);
  assert.deepEqual(gainTax(months), [toCents(3_760)]);
  assert.equal(toCents(3_760) - toCents(3_055), toCents(705));
  assert.notEqual(gainTax(months)[0], toCents(3_055));
  reconciles(months);
});

test('the loss-application order is a STATED default and a lever, never a hidden one (ADR-0004)', () => {
  assert.equal(DEFAULT_CAPITAL_LOSS_APPLICATION, 'discountable-gains-first');
  assert.deepEqual([...CAPITAL_LOSS_APPLICATIONS], ['discountable-gains-first', 'undiscountable-gains-first']);
  // The stated default is the one that leaves the household paying MORE, and the other is named and
  // reachable rather than unavailable: the choice is the taxpayer's in law and the register's job is
  // to say which one ran, not to pretend there was only one.
  const disposal = disposalFromSell(sell('sell', '2027-06-30', 80_000), MIXED_HOLDER, [MIXED]);
  assert.ok(netCapitalGain(disposal.realisations, DEFAULT_CAPITAL_LOSS_APPLICATION) > netCapitalGain(disposal.realisations, 'undiscountable-gains-first'));
  assert.equal(netCapitalGain(disposal.realisations, DEFAULT_CAPITAL_LOSS_APPLICATION), netCapitalGain(disposal.realisations));
  assert.throws(() => netCapitalGain(disposal.realisations, 'smallest-first'), /unknown capital loss application "smallest-first"/);
});

test('losses that exceed the gains give NIL, never a negative, and nothing is carried forward', () => {
  const allLoss = [parcel('2015-03-03', 40_000, 10_000)];
  const household = { persons: [person('Val', '1976-05-10', { parcels: allLoss })], homeStatus: 'occupied' };
  const disposal = disposalFromSell(sell('sell', '2027-06-30', 10_000), household, [allLoss]);
  assert.equal(disposal.nominalGain, toCents(-30_000));
  assert.equal(netCapitalGain(disposal.realisations), toCents(0));
  // And nil is what taxable income takes. A negative would be a deduction against salary, which
  // s 102-5 does not give: a net capital LOSS is quarantined to later capital gains.
  assert.equal(taxableIncomeWithNetCapitalGain(taxableIncome(toCents(80_000)), netCapitalGain(disposal.realisations)), toCents(80_000));
  assert.throws(() => taxableIncomeWithNetCapitalGain(taxableIncome(toCents(80_000)), toCents(-1)), /s 102-5 has no negative result/);
});

// --- 2. WHEN THE GAIN ENTERS THE YEAR ------------------------------------------------------------

// Val earns $260,000 and holds one parcel; Ken earns nothing and holds the SAME parcel. Every
// fixture below sells one of them.
const P = parcel('2015-03-03', 60_000, 200_000);
const COUPLE = {
  persons: [
    person('Val', '1976-05-10', { employmentIncomePerFortnight: toCents(10_000), parcels: [P] }),
    person('Ken', '1978-02-02', { parcels: [P] }),
  ],
  homeStatus: 'occupied',
};

test('the DISPOSAL MONTH carries the whole of the year’s increment, and no other month carries any', () => {
  // ⚠️ **The timing decision, and it is pinned here rather than described.** `householdIncomeTax` is
  // an ANNUAL assessment divided by twelve, so a gain put into the monthly accrual would be charged a
  // twelfth at a time and a gain realised in September would have only ten twelfths of its tax
  // charged before the year ended. Instead the increment is charged WHOLE, once, in the month of the
  // disposal. Raising the months BEFORE the disposal was the alternative and it is not available: it
  // charges tax on a gain that has not happened, which is the register's refusal to let the Waterfall
  // spend a refund before it exists read in the other direction, and it cannot be computed in a
  // forward walk without running the walk twice.
  const sold = project(SETTINGS, COUPLE, [sell('sell', '2026-11-20', 200_000)]);
  const without = project(SETTINGS, COUPLE, []);
  reconciles(sold);

  // Every salary tax line, in all 30 months of the walk, is IDENTICAL to the walk with no sale in
  // it — including November's own. The gain does not touch the salary assessment in any month.
  assert.deepEqual(taxLines(sold, 'Income tax, '), taxLines(without, 'Income tax, '));
  assert.equal(taxLines(without, 'Income tax, ').length, 30, 'one salary tax line in every month of the walk');

  // And exactly ONE month carries a capital gains tax line.
  const months = sold.filter((m) => m.lines.some((l) => l.description.startsWith(CAPITAL_GAINS_TAX_LINE)));
  assert.deepEqual(months.map((m) => m.month), ['2026-11']);
  // The figure: $200,000 of proceeds against a cost base apportioned out of a parcel that has grown
  // for two months of the walk, which is a $70,313.21 net capital gain, taxed at Val's 45c plus the
  // 2% levy — $33,047.21, and 47% of the gain to the cent.
  assert.equal(monthAt(sold, '2026-11').lines.find((l) => l.description.startsWith(CAPITAL_GAINS_TAX_LINE)).amount, toCents(33_047.21));
  assert.equal(Math.round(toCents(70_313.21) * 0.47), toCents(33_047.21));
});

test('two disposals in ONE financial year TELESCOPE to the tax on one combined gain', () => {
  // The second is assessed ON TOP of the first rather than from a standing start, so the brackets
  // are climbed once. $50,000 and $50,000 in June 2027: $132.50 then $5,300.00.
  const solo = { persons: [person('Ken', '1978-02-02', { parcels: [parcel('2015-03-03', 10_000, 200_000)] })], homeStatus: 'occupied' };
  const twice = project(FLAT, solo, [sell('a', '2027-06-10', 50_000), sell('b', '2027-06-20', 50_000)]);
  assert.deepEqual(gainTax(twice), [toCents(132.5), toCents(5_300)]);

  // And the pair sums to EXACTLY the tax on the single $100,000 sale that realises the same gain.
  // That is what makes the charge annually correct rather than merely early: the increments are
  // differences between two assessments of the same year, so they cannot double-count and cannot
  // leave a slice uncharged.
  const once = project(FLAT, solo, [sell('a', '2027-06-10', 100_000)]);
  assert.deepEqual(gainTax(once), [toCents(5_432.5)]);
  assert.equal(gainTax(twice)[0] + gainTax(twice)[1], gainTax(once)[0]);
  reconciles(twice);
});

test('⚠️ THE FINANCIAL YEAR IS THE UNIT — a sale either side of 30 June is a different tax bill', () => {
  // The same parcel, the same $50,000 sale, no growth between the two months — so the $23,750 net
  // capital gain is identical and the ONLY thing that differs is the year it falls in. FY2026-27
  // taxes the slice above the tax-free threshold at 15c; FY2027-28 at 14c.
  //   FY2026-27: ($23,750 − $18,200) × 15% − $700 LITO = $132.50
  //   FY2027-28: ($23,750 − $18,200) × 14% − $700 LITO =  $77.00
  const solo = { persons: [person('Ken', '1978-02-02', { parcels: [parcel('2015-03-03', 10_000, 200_000)] })], homeStatus: 'occupied' };
  assert.deepEqual(gainTax(project(FLAT, solo, [sell('s', '2027-06-20', 50_000)])), [toCents(132.5)]);
  assert.deepEqual(gainTax(project(FLAT, solo, [sell('s', '2027-07-20', 50_000)])), [toCents(77)]);

  // Straddling the boundary: each year starts from a CLEAN SLATE, because s 102-5 is an annual
  // computation. A June gain and a July gain are two years' assessments, not one — and a build that
  // carried the accumulator across 30 June would stack the second on the first and charge $5,300-odd
  // for the July sale instead of $77.
  const straddle = project(FLAT, solo, [sell('a', '2027-06-10', 50_000), sell('b', '2027-07-20', 50_000)]);
  assert.deepEqual(gainTax(straddle), [toCents(132.5), toCents(77)]);
  assert.deepEqual(
    taxLines(straddle, CAPITAL_GAINS_TAX_LINE),
    ['2027-06 Income tax on capital gain, Ken 13250', '2027-07 Income tax on capital gain, Ken 7700'],
  );
  reconciles(straddle);
});

test('a loss LATER in the same year nets the gain, and a loss later than the CHARGE does not refund it', () => {
  // Both walks realise the same two events in the same financial year and differ only in their order.
  const held = [parcel('2015-03-03', 10_000, 200_000), parcel('2026-12-05', 60_000, 20_000)];
  const solo = { persons: [person('Ken', '1978-02-02', { parcels: held })], homeStatus: 'occupied' };
  const loss = (date) => sell('l', date, 20_000, { parcelSelection: 'highest-cost-base-first' });

  // LOSS FIRST: the $40,000 loss is in the year's accumulator when the $47,500 gross gain arrives, so
  // s 102-5 nets them and the net capital gain is $3,750 — below the tax-free threshold, so NO tax
  // line at all. This is the whole reason the netting is done over the FINANCIAL YEAR and not over
  // one disposal: a per-disposal netting would have stranded the loss and charged $132.50.
  assert.deepEqual(gainTax(project(FLAT, solo, [loss('2027-06-05'), sell('g', '2027-06-10', 50_000)])), []);

  // GAIN FIRST: $132.50 is charged when the gain is realised, and the later loss brings the year's
  // net capital gain BELOW what has already been charged. Nothing is refunded AT THE EVENT — the
  // register forbids the walk spending a refund before it exists, and the direction is the
  // conservative one.
  //
  // ⚠️ **AMENDED 2026-09-18 BY P4-2, and the amendment is to the REASON rather than to the figures.**
  // Until that day this comment read that the household "is $132.50 poorer than an annual assessment
  // would leave it, which P4-2's year-end true-up owns and this chunk does not", and the assertion
  // below was written expecting to INVERT the day the true-up landed. It did not invert, and the
  // measurement is the point: **`FLAT` opens on 2027-06-01, so FY2026-27 is a walk of ONE MONTH**,
  // and P4-2 refuses to assess a financial year it entered part-way through — nothing in the model
  // holds July 2026 to June 2027. So in THIS fixture the over-charge still stands, for a reason that
  // has nothing to do with capital gains.
  //
  // The hole itself IS closed, in a COMPLETE financial year: see
  // `test/core-projection-true-up.test.mjs`, where the same shape of gain-then-loss is refunded
  // $77.00 in the following July. What survives here is the partial-first-year refusal, and this
  // assertion now pins THAT — it must go red the day a part-year becomes assessable.
  const gainFirst = project(FLAT, solo, [sell('g', '2027-06-10', 50_000), loss('2027-06-25')]);
  assert.deepEqual(gainTax(gainFirst), [toCents(132.5)]);
  assert.equal(gainFirst.flatMap((m) => m.lines).filter((l) => l.description.startsWith(CAPITAL_GAINS_TAX_LINE) && l.direction === 'inflow').length, 0);
  // And no year-end true-up ANYWHERE in the walk either, which is the other half of the same fact:
  // FY2026-27 is one month of this walk and is refused, and FY2027-28 — which the walk does see in
  // full — has neither a salary nor a realisation in it to settle.
  assert.deepEqual(gainFirst.flatMap((m) => m.lines).filter((l) => l.description.startsWith(TAX_TRUE_UP_LINE)), []);
  reconciles(gainFirst);
});

// --- 3. FOUR BASES, EACH WITH ITS OWN DOLLAR COMPONENT -------------------------------------------

test('the gain reaches the BRACKETS, LITO and the MEDICARE LEVY — $12,920 on a $70,000 net gain', () => {
  // Ken has no salary, so his whole taxable income is the gain and every component is legible:
  //   net capital gain          $70,000   ($200,000 − $60,000 = $140,000 gross, held since 2015)
  //   brackets (FY2026-27)      $11,520   $26,800 @ 15% + $25,000 @ 30%
  //   LITO                          nil   tapered out above $66,667 — it would be $700 on a nil income,
  //                                       so a gain that missed LITO's base would be $700 cheaper
  //   Medicare levy              $1,400   2% of the taxable income the gain created
  //   ⇒ $12,920
  const months = project(SETTINGS, COUPLE, [sell('sell', '2026-09-20', 200_000, {})]);
  const kens = { ...sell('sell', '2026-09-20', 200_000), owner: 'personB' };
  const sold = project(SETTINGS, COUPLE, [kens]);
  assert.deepEqual(gainTax(sold), [toCents(12_920)]);
  assert.equal(toCents(11_520) - toCents(0) + toCents(1_400), toCents(12_920));
  // The levy is 2% of the gain and nothing else: remove the gain from the levy's base and $1,400 of
  // this figure disappears. There is no field to remove it through — `medicareLevy` reads the very
  // same `TaxableIncome` the brackets read — which is the structural half of the same point.
  assert.equal(toCents(70_000) * 0.02, toCents(1_400));
  assert.ok(gainTax(months)[0] > gainTax(sold)[0], 'Val pays more on the same gain — see the wrong-Person test');
  reconciles(sold);
});

test('the gain reaches SAPTO’s REBATE INCOME, and the taper is worth $1,120', () => {
  // A single pensioner of 71 with no salary and no super, holding one parcel bought in 2015 for
  // $10,000 and now worth $100,000. She sells the lot in February 2027: a $90,000 gross gain, held
  // far more than 12 months, so a $45,000 net capital gain.
  //   brackets                  $4,020
  //   LITO                       $325   tapered: $700 − 5c per $1 over $37,500
  //   SAPTO                    $1,110   tapered on REBATE INCOME, which the gain raised
  //   Medicare levy            $73.20   the seniors shade-in band — the gain put her in it
  //   ⇒ $2,658.20
  const pensioner = { persons: [person('Val', '1955-04-17', { parcels: [parcel('2015-03-03', 10_000, 100_000)] })], homeStatus: 'occupied' };
  const settings = { ...SETTINGS, asAtDate: '2027-02-01', planningHorizonAge: 73, nominalReturn: 0 };
  const months = project(settings, pensioner, [sell('sell', '2027-02-10', 100_000)]);
  assert.deepEqual(gainTax(months), [toCents(2_658.2)]);
  assert.equal(toCents(4_020) - toCents(325) - toCents(1_110) + toCents(73.2), toCents(2_658.2));

  // **The SAPTO limb is $1,120 of that figure.** Rebate Income built WITHOUT the gain leaves her
  // full $2,230 SAPTO standing instead of the tapered $1,110, so a gain that reached the brackets
  // and not `rebateIncome` would charge $1,538.20 — a plausible figure, $1,120 light.
  assert.equal(toCents(2_658.2) - toCents(1_120), toCents(1_538.2));
  assert.equal(toCents(2_230) - toCents(1_110), toCents(1_120));

  // She is a pensioner throughout, so SAPTO is actually in play rather than denied for want of
  // qualification — without this the taper above would be vacuous.
  assert.ok(monthAt(months, '2027-02').lines.some((l) => l.description === 'Age Pension' && l.amount > 0));
  reconciles(months);
});

// --- 4. THE FIFTH BASE, WHICH THE GAIN MUST NEVER REACH ------------------------------------------

test('⚠️ A CAPITAL GAIN IS NOT A LABOUR AMOUNT — it must never enter WATO’s net labour income', () => {
  // ITAA 1997 s 61-155(2): net labour income is labour amounts less labour deductions, and
  // `NetLabourIncome`'s own doc names net capital gains among the things it excludes. WATO is the
  // fifth base and the only one of the five the gain must not reach.
  //
  // Ken has NO salary, so his net labour income is nil and he is not entitled to WATO at all
  // (s 61-155(1)(b): net labour income must EXCEED the tax-free threshold). A build that fed the
  // gain into that base would make him entitled and hand him the $250 maximum.
  //   FY2027-28, $71,250 net capital gain: $11,627 brackets + $1,425 levy = $13,052
  //   with the gain wrongly in net labour income:                            $12,802
  const solo = { persons: [person('Ken', '1978-02-02', { parcels: [parcel('2015-03-03', 10_000, 200_000)] })], homeStatus: 'occupied' };
  const months = project(FLAT, solo, [sell('sell', '2027-07-20', 150_000)]);
  assert.deepEqual(gainTax(months), [toCents(13_052)]);
  assert.equal(toCents(13_052) - toCents(250), toCents(12_802));
  assert.notEqual(gainTax(months)[0], toCents(12_802));

  // And the structural half, which is what actually stops it: net labour income is built from the
  // SALARY and the gain is not on its path. **TWO call sites since P3-22h step 3 (2026-09-22)**, not
  // one — the year-end settlement rebuilds the same figure for whichever Person(s)
  // `frankingForIndividual` is assessed against, on the SAME `netLabourIncomeFromSalary` expression
  // — and neither has an argument a gain could arrive through.
  const source = readFileSync(fileURLToPath(new URL('../src/core/projection.ts', import.meta.url)), 'utf8');
  const calls = source.split('\n').filter((line) => line.includes('netLabourIncomeFromSalary(') && !line.trimStart().startsWith('//') && !line.trimStart().startsWith('*'));
  // The first argument was spelled `fy` until 2026-09-18, when P4-2 hoisted `asSaptoPerson` out of
  // the month loop and made the financial year a PARAMETER — so that a year that has ENDED can be
  // assessed from inside the month that follows it. Only the name moved; each call is still built
  // from the salary alone.
  assert.deepEqual(calls.map((line) => line.trim()), [
    'netLabourIncome: netLabourIncomeFromSalary(assessmentFy, salary, REDUCER_DEDUCTIONS),',
    'netLabourIncome: netLabourIncomeFromSalary(completed.fy, completed.salary[index] ?? toCents(0), REDUCER_DEDUCTIONS),',
  ]);
  for (const call of calls) {
    assert.ok(!call.includes('gain'), 'the gain has no way into WATO’s base');
    assert.ok(!call.includes('distributed'), 'a distribution has no way into WATO’s base either');
  }
});

// --- 5. WRONG PERSON IS NOW MONEY ----------------------------------------------------------------

test('⚠️ A GAIN ON THE WRONG PERSON’S PARCELS IS A DIFFERENT TAX BILL — $32,900 against $12,920', () => {
  // **This retires the second of the two weaknesses chunks 1, 3 and 4 disclosed.** Until now a parcel
  // written against the wrong Person had no figure-level consequence, because the means test pools at
  // household level and every parcel is assessed the same wherever it sits. A gain does not pool: it
  // lands in ONE Person's taxable income and is taxed in THEIR brackets, against THEIR LITO and
  // THEIR SAPTO.
  //
  // Val and Ken hold IDENTICAL parcels and the sale is identical in every field but `owner`:
  //   Val, on $260,000 of salary: $70,000 × (45% + 2%)                       = $32,900
  //   Ken, on nothing:            $11,520 of brackets, no LITO, $1,400 levy  = $12,920
  const vals = project(SETTINGS, COUPLE, [sell('sell', '2026-09-20', 200_000)]);
  const kens = project(SETTINGS, COUPLE, [{ ...sell('sell', '2026-09-20', 200_000), owner: 'personB' }]);
  assert.deepEqual(gainTax(vals), [toCents(32_900)]);
  assert.deepEqual(gainTax(kens), [toCents(12_920)]);
  assert.equal(gainTax(vals)[0] - gainTax(kens)[0], toCents(19_980));

  // The line is named for the Person assessed, so the month's own lines say which portfolio it came
  // out of and whose brackets it went through.
  assert.deepEqual(taxLines(vals, CAPITAL_GAINS_TAX_LINE), ['2026-09 Income tax on capital gain, Val 3290000']);
  assert.deepEqual(taxLines(kens, CAPITAL_GAINS_TAX_LINE), ['2026-09 Income tax on capital gain, Ken 1292000']);

  // The SALE is identical in both walks — the same proceeds out of the same parcel on the same day —
  // so nothing but the tax distinguishes them. That is the assertion chunk 4 could not make.
  const proceeds = (months) => months.flatMap((m) => m.lines.filter((l) => l.description.startsWith('Non-Super Portfolio sale')).map((l) => l.amount));
  assert.deepEqual(proceeds(vals), proceeds(kens));
  assert.notDeepEqual(gainTax(vals), gainTax(kens));
});

// --- 6. SCOPE: THE TAX IS NOT GROSSED INTO THE SALE ----------------------------------------------

test('a stated sale is the amount stated, not the amount plus the tax it will attract', () => {
  const limbs = unfundedMiddleLimbs(COUPLE);
  assert.equal(limbs.nonSuperPortfolio.available, toCents(0));
  // ⚠️ **The refusal quoted here until P3-21f chunk 6 is discharged**, so the nil branch of a FUNDED
  // Household is now a stated bug rather than a fact — `nonSuperPortfolioLimb` builds one claim per
  // Person who holds anything and can only reach this text where they summed to nil.
  assert.match(limbs.nonSuperPortfolio.note, /this note is a BUG and not a fact/);
  // And the tax a disposal causes is NOT grossed into the disposal: the sale is the amount stated,
  // not the amount plus the tax it will attract. Drawing to NEED and letting the liability fall where
  // it falls is P3-21f's own rule for this, and it is not re-litigated here.
  const months = project(SETTINGS, COUPLE, [sell('sell', '2026-09-20', 200_000)]);
  assert.equal(monthAt(months, '2026-09').lines.find((l) => l.description.startsWith('Non-Super Portfolio sale')).amount, toCents(200_000));
});
