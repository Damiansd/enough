// P3-22h STEP 2 — THE NON-SUPER PORTFOLIO'S DISTRIBUTION, REINVESTED AND TAXED.
//
// Step 1 shipped two optional Settings and read neither. This file defends the ONE thing step 2
// adds: `Settings.investmentPayoutRate`, once a year, in the financial year's final month —
//
//   1. **THE DISTRIBUTION IS REINVESTED, NOT CASH.** No line of `effect: 'cash'` or `effect:
//      'wealth'` reports it, because neither is a true name for what moved: `costBase` rises and
//      `marketValue` does not move by a cent (§1, §4 below).
//   2. **IT IS TAXED AS ORDINARY, UNFRANKED INCOME, THROUGH THE YEAR-END TRUE-UP** — the SAME
//      mechanism P4-2 built, never a second one — hand-worked to the cent in §2, including the
//      four-cent rounding residue P4-2's own comments predict.
//   3. **THE RIGHT PERSON, THE RIGHT YEAR.** §3 is a couple with two different portfolios and two
//      different marginal rates; a swapped attribution would swap which name gets which figure.
//   4. **THE RIGHT BASE.** §4 raises `costBase`, never `marketValue`, and proves it by a LATER
//      disposal realising a smaller, hand-worked capital gain.
//   5. **ABSENT, OR STATED AT NIL: NO EFFECT AT ALL** — §5, asserted as a structural identity, not a
//      digest that happens not to have moved.
import test from 'node:test';
import assert from 'node:assert/strict';

import { toCents } from '../dist/core/money.js';
import {
  CAPITAL_GAINS_TAX_LINE,
  GROWTH_LINE,
  PORTFOLIO_POOL,
  SUPER_EARNINGS_TAX_LINE,
  SUPER_FRANKING_CREDIT_REFUND_LINE,
  TAX_TRUE_UP_LINE,
  distributionFromPortfolio,
  parcelsAfterDistribution,
  project,
} from '../dist/core/projection.js';

const person = (name, dateOfBirth, fortnightlyPay, over = {}) => ({
  name,
  dateOfBirth,
  // P6-8 brief 3 chunk 2b: a salaried Person needs a named account for the Superannuation
  // Guarantee. A nil balance moves no figure of its own.
  superInterests: [{ phase: 'accumulation', balance: toCents(0) }],
  parcels: [],
  employmentIncomePerFortnight: toCents(fortnightlyPay),
  workBonusBalance: toCents(0),
  ...over,
});
const parcel = (acquired, costBase, marketValue) => ({ acquired, costBase: toCents(costBase), marketValue: toCents(marketValue) });
const sell = (id, date, amount) => ({
  id, date, owner: 'personA', type: 'NON_SUPER_INVESTMENT',
  params: { direction: 'sell', amount: toCents(amount) },
  enabled: true, createdAt: '2027-01-01',
});

/**
 * **A walk that begins on 1 July, `nominalReturn: 0`** — P4-2's own precedent
 * (`test/core-projection-true-up.test.mjs`'s `FROM_JULY`): FY2027-28 is a complete financial year
 * inside the walk, so the true-up is reachable, and nothing grows, so a parcel's market value is
 * the fixture's own number in every month rather than a compounded one.
 */
const FROM_JULY = {
  asAtDate: '2027-07-01',
  planningHorizonAge: 50,
  // Pay rising with wages (2026-09-23) is not this fixture's subject: `awote: 0` holds every salary at the figure stated. A proved control: every figure this file asserts is the same at nil on the build before pay rose.
  economicSeries: { cpi: 0.025, pblci: 0.025, awote: 0, mtawe: 0.035 },
  deemingRates: { lower: 0.0175, upper: 0.0375 },
  nominalReturn: 0,
  // Interest on cash (2026-09-23) is not this fixture's subject: stated nil, the control proved byte-identical to the walk before it existed.
  cashInterestRate: 0,
};

const monthAt = (months, m) => months.find((mo) => mo.month === m);
const linesOf = (month, description) => month.lines.filter((l) => l.description.startsWith(description));
const trueUpFor = (month, who) => linesOf(month, `${TAX_TRUE_UP_LINE}, ${who}`);
const distributionNotes = (month) => month.notes.filter((n) => n.subject === 'investment distribution');
const reconciles = (months) => {
  for (const m of months) {
    const cash = m.lines.reduce((t, l) => t + (l.effect === 'cash' ? (l.direction === 'inflow' ? l.amount : -l.amount) : 0), 0);
    assert.equal(m.closingBalance, m.openingBalance + cash, `${m.month} does not reconcile`);
  }
};

// --- §1. THE DISTRIBUTION MONTH: A NOTE, NEVER A LINE, AND MARKET VALUE UNTOUCHED -----------------

test('P3-22h step 2 — June 2028 carries a note and NO cash or wealth line, and the closing balance does not move for it', () => {
  const sol = { persons: [person('Sol', '1980-03-15', 3_000, { parcels: [parcel('2020-01-01', 300_000, 500_000)] })], homeStatus: 'occupied' };
  // **Horizon age 49, not `FROM_JULY`'s 50** — Sol turns 49 in March 2029, so the walk holds
  // exactly ONE June (2028) and not the second one a longer horizon would reach: at
  // `nominalReturn: 0` nothing ever changes the parcel's value, so every later June would pay the
  // identical distribution again and the "once, not twice" claim below needs there to be only one.
  const settings = { ...FROM_JULY, planningHorizonAge: 49, investmentPayoutRate: 0.04 };
  const months = project(settings, sol, []);
  reconciles(months);
  const june = monthAt(months, '2028-06');
  // $500,000.00 × 4% = $20,000.00 exactly — `distributionFromPortfolio`'s own arithmetic, floored
  // on a figure that already divides evenly, so the floor moves nothing here.
  const notes = distributionNotes(june);
  assert.equal(notes.length, 1);
  assert.equal(notes[0].person, 'Sol');
  assert.equal(notes[0].distributed, toCents(20_000));
  assert.match(notes[0].note, /UNFRANKED/);
  assert.match(notes[0].note, /reinvested/);
  // No cash line and no wealth line names the PORTFOLIO: `PORTFOLIO_POOL`'s growth line is the
  // only wealth line this month could carry for it, and at `nominalReturn: 0` it is nil and
  // absent. (The Superannuation Guarantee wealth line is unrelated to this feature and unaffected
  // by it — Sol is salaried, so it is present in every month of this walk regardless.)
  assert.deepEqual(june.lines.filter((l) => l.description === `${GROWTH_LINE}, Sol — ${PORTFOLIO_POOL}`), []);
  assert.deepEqual(june.lines.filter((l) => l.description.startsWith('Non-Super Portfolio')), []);
  assert.equal(linesOf(june, TAX_TRUE_UP_LINE).length, 0, 'the tax is next July, not this June');
  // No OTHER month of the walk carries the note — once a year, and this is the only June inside it
  // that completes a full financial year before the walk's own July settlement below.
  assert.equal(months.flatMap(distributionNotes).length, 1);
});

// --- §2. THE TAX, HAND-WORKED TO THE CENT, INCLUDING THE FOUR-CENT ROUNDING RESIDUE ----------------

test('HAND-WORKED — the distribution costs Sol $6,399.96 in the July 2028 true-up', () => {
  // Sol earns $78,000 a year ($3,000/fortnight × 26) and holds a $500,000 portfolio, distributing
  // 4% of it — $20,000.00 — in June 2028.
  //
  // WITHOUT THE DISTRIBUTION (`test/core-projection-true-up.test.mjs`'s own $78,000 fixture,
  // reused rather than re-derived a second time):
  //   taxable income          $77,000   ($78,000 less the $1,000 s 25-130 standard deduction)
  //   brackets (FY2027-28)    $13,352   $26,800 @ 14% + $32,000 @ 30%
  //   WATO                      −$250   the maximum, on net labour income far above its threshold
  //   Medicare levy            $1,540   2% of $77,000
  //   ⇒ T0 = $14,642.00 a year — the annual tax the monthly accrual is reconciled against.
  //   Monthly accrual: round($14,642.00 ÷ 12) = round($1,220.1666…) = $1,220.17 — the OTHER file's
  //   own figure. Twelve of them: $1,220.17 × 12 = $14,642.04 — FOUR CENTS above T0, exactly the
  //   residue P4-2's own comments predict for a salary that never moves within the year.
  //
  // WITH THE DISTRIBUTION, the SAME year is assessed on $77,000 + $20,000 = $97,000:
  //   brackets                $19,352   $26,800 @ 14% + $52,000 @ 30% (still inside the one bracket)
  //   WATO                      −$250   unchanged: net labour income is salary alone
  //   Medicare levy            $1,940   2% of $97,000
  //   ⇒ T1 = $21,042.00 — exactly $6,400.00 above T0 (32% of $20,000, the combined bracket + levy
  //   rate over a span that never leaves the 30% bracket).
  //
  // THE SETTLEMENT: accrued ($14,642.04) less assessed ($21,042.00) is −$6,399.96 — an OUTFLOW,
  // because the year was under-accrued. The four-cent residue does not cancel: the undistributed
  // run's own gap ($0.04) is UNDER the $1.00 de-minimis and is suppressed to no line at all, so the
  // distributed run's reported figure is $6,400.00 LESS that four cents, not a round number.
  assert.equal(13_352_00 + 1_540_00 - 250_00, 14_642_00);
  assert.equal(Math.round(14_642_00 / 12), 122_017);
  assert.equal(122_017 * 12, 14_642_04);
  assert.equal(19_352_00 + 1_940_00 - 250_00, 21_042_00);
  assert.equal(21_042_00 - 14_642_00, 6_400_00);
  assert.equal(21_042_00 - 14_642_04, 6_399_96);

  const withoutRate = project(FROM_JULY, {
    persons: [person('Sol', '1980-03-15', 3_000, { parcels: [parcel('2020-01-01', 300_000, 500_000)] })], homeStatus: 'occupied',
  }, []);
  const withRate = project({ ...FROM_JULY, investmentPayoutRate: 0.04 }, {
    persons: [person('Sol', '1980-03-15', 3_000, { parcels: [parcel('2020-01-01', 300_000, 500_000)] })], homeStatus: 'occupied',
  }, []);
  reconciles(withoutRate);
  reconciles(withRate);

  const julyWithout = trueUpFor(monthAt(withoutRate, '2028-07'), 'Sol');
  assert.deepEqual(julyWithout, [], 'the four-cent residue is under the de-minimis and must not appear');

  const julyWith = trueUpFor(monthAt(withRate, '2028-07'), 'Sol');
  assert.equal(julyWith.length, 1);
  assert.equal(julyWith[0].direction, 'outflow');
  assert.equal(julyWith[0].amount, toCents(6_399.96));
});

// --- §3. THE RIGHT PERSON: TWO PORTFOLIOS, TWO MARGINAL RATES, ONE MONTH -------------------------

test('P3-22h step 2 — a swapped attribution would swap Ren and Sam’s own figures, and both are hand-worked', () => {
  // Both earn the SAME $78,000 salary — so T0 is $14,642.00 for both, exactly as in §2 — and hold
  // DIFFERENT portfolios: Ren's $500,000 pays $20,000.00, Sam's $250,000 pays $10,000.00 at the
  // same 4%. Both are single incomes, both well above the $59,047 family Medicare threshold, so
  // neither's levy is shaded by the couple's combined income and each is assessed on their own
  // figure exactly as a solo Person would be.
  //
  // REN: T1 = tax on $97,000 = $21,042.00 (§2). Settlement: $14,642.04 − $21,042.00 = −$6,399.96.
  // SAM: taxable $77,000 + $10,000 = $87,000, still inside the 30% bracket.
  //   brackets  $16,352 = $26,800 @ 14% + $42,000 @ 30%
  //   WATO        −$250
  //   levy      $1,740   2% of $87,000
  //   ⇒ T1 = $17,842.00. Settlement: $14,642.04 − $17,842.00 = −$3,199.96.
  assert.equal(16_352_00 + 1_740_00 - 250_00, 17_842_00);
  assert.equal(17_842_00 - 14_642_04, 3_199_96);

  const household = {
    persons: [
      person('Ren', '1980-03-15', 3_000, { parcels: [parcel('2020-01-01', 300_000, 500_000)] }),
      person('Sam', '1981-06-01', 3_000, { parcels: [parcel('2020-01-01', 150_000, 250_000)] }),
    ],
    homeStatus: 'occupied',
  };
  const months = project({ ...FROM_JULY, investmentPayoutRate: 0.04 }, household, []);
  reconciles(months);
  const june = monthAt(months, '2028-06');
  const notes = distributionNotes(june);
  assert.equal(notes.length, 2);
  const ren = notes.find((n) => n.person === 'Ren');
  const sam = notes.find((n) => n.person === 'Sam');
  assert.equal(ren.distributed, toCents(20_000));
  assert.equal(sam.distributed, toCents(10_000));

  const july = monthAt(months, '2028-07');
  const renTrueUp = trueUpFor(july, 'Ren');
  const samTrueUp = trueUpFor(july, 'Sam');
  assert.equal(renTrueUp.length, 1);
  assert.equal(samTrueUp.length, 1);
  assert.equal(renTrueUp[0].amount, toCents(6_399.96));
  assert.equal(samTrueUp[0].amount, toCents(3_199.96));
  // Not the same figure — a vacuity control against a fixture that pays both the same distribution.
  assert.notEqual(renTrueUp[0].amount, samTrueUp[0].amount);
});

// --- §4. THE RIGHT BASE: A LATER DISPOSAL PROVES `costBase` MOVED, NOT `marketValue` ---------------

test('HAND-WORKED — a disposal after the distribution pays $3,200.00 LESS capital gains tax', () => {
  // A single parcel, acquired 2020-01-01 (comfortably discount-eligible), cost $450,000, worth
  // $500,000, sold WHOLE on 2028-08-01 — one financial year after the June 2028 distribution, so
  // the disposal's own year (FY2028-29) starts its capital-gains accumulator from zero and the
  // comparison is clean of any residue.
  //
  // WITHOUT THE DISTRIBUTION: nominal gain $500,000 − $450,000 = $50,000; the 50% discount applies
  // (held over 12 months) → $25,000 taxable. Stacked on Sol's $77,000: $77,000 → $102,000, the
  // WHOLE increment inside the 30% bracket, so the charge is exactly 32% of $25,000 = $8,000.00.
  //
  // WITH THE DISTRIBUTION: one prior event raised cost base by the WHOLE $20,000 (a single parcel
  // takes the whole distribution — no split to divide). Nominal gain $500,000 − $470,000 =
  // $30,000; discounted to $15,000; $77,000 → $92,000, still the one bracket, charge = 32% of
  // $15,000 = $4,800.00.
  //
  // Both charges are ANNUAL, one-shot assessments (`assessCapitalGainCharge`), with no monthly
  // rounding in them at all — unlike §2's true-up, these two figures are exact to the cent by
  // construction, and a bug that raised `marketValue` instead of `costBase` would either change the
  // SALE PROCEEDS (a different, far larger effect) or leave both runs identical (no cost-base
  // effect at all) — neither of which is $8,000.00 vs $4,800.00.
  assert.equal(toCents(500_000) - toCents(450_000), toCents(50_000));
  assert.equal(toCents(50_000) - Math.floor(toCents(50_000) / 2), toCents(25_000));
  assert.equal(toCents(500_000) - toCents(470_000), toCents(30_000));
  assert.equal(toCents(30_000) - Math.floor(toCents(30_000) / 2), toCents(15_000));
  assert.equal(0.32 * 25_000, 8_000);
  assert.equal(0.32 * 15_000, 4_800);

  const household = (over) => ({
    persons: [person('Sol', '1980-03-15', 3_000, { parcels: [parcel('2020-01-01', 450_000, 500_000)] })],
    homeStatus: 'occupied',
    ...over,
  });
  const entries = [sell('sell', '2028-08-01', 500_000)];
  const settingsWithout = { ...FROM_JULY, planningHorizonAge: 50 };
  const settingsWith = { ...settingsWithout, investmentPayoutRate: 0.04 };

  const withoutRate = project(settingsWithout, household(), entries);
  const withRate = project(settingsWith, household(), entries);
  reconciles(withoutRate);
  reconciles(withRate);

  const augustWithout = linesOf(monthAt(withoutRate, '2028-08'), CAPITAL_GAINS_TAX_LINE);
  const augustWith = linesOf(monthAt(withRate, '2028-08'), CAPITAL_GAINS_TAX_LINE);
  assert.equal(augustWithout.length, 1);
  assert.equal(augustWith.length, 1);
  assert.equal(augustWithout[0].amount, toCents(8_000));
  assert.equal(augustWith[0].amount, toCents(4_800));
  assert.equal(augustWithout[0].amount - augustWith[0].amount, toCents(3_200));
});

// --- §5. ABSENT, OR STATED AT NIL: NO EFFECT AT ALL ------------------------------------------------

test('P3-22h step 2 — a stated rate of nil is BYTE-IDENTICAL to the key being absent entirely', () => {
  const sol = { persons: [person('Sol', '1980-03-15', 3_000, { parcels: [parcel('2020-01-01', 300_000, 500_000)] })], homeStatus: 'occupied' };
  const { investmentPayoutRate: _drop, ...absent } = { ...FROM_JULY, investmentPayoutRate: 0 };
  const nil = project({ ...FROM_JULY, investmentPayoutRate: 0 }, sol, []);
  const missing = project(absent, sol, []);
  assert.deepEqual(nil, missing);
  // Vacuity control: a REAL rate against the same household is NOT identical.
  const stated = project({ ...FROM_JULY, investmentPayoutRate: 0.04 }, sol, []);
  assert.notDeepEqual(stated, missing);
});

// --- §6. THE PURE FUNCTIONS, DIRECTLY -------------------------------------------------------------

test('`distributionFromPortfolio` — the rate times the pool, floored, nil where there is nothing to distribute from', () => {
  assert.equal(distributionFromPortfolio([], 0.04), toCents(0));
  assert.equal(distributionFromPortfolio([parcel('2020-01-01', 100_000, 500_000)], 0.04), toCents(20_000));
  // Two parcels: the SUM of market values is what the rate applies to, not either parcel alone.
  assert.equal(
    distributionFromPortfolio([parcel('2020-01-01', 0, 200_000), parcel('2021-01-01', 0, 300_000)], 0.1),
    toCents(50_000),
  );
});

test('`parcelsAfterDistribution` — raises `costBase` in proportion to market value, moves `marketValue` and `acquired` NOT AT ALL', () => {
  // $200,000 and $300,000 — a 40/60 split of $50,000 divides EXACTLY: $20,000 and $30,000.
  const before = [parcel('2020-01-01', 50_000, 200_000), parcel('2021-06-01', 80_000, 300_000)];
  const after = parcelsAfterDistribution(before, toCents(50_000));
  assert.equal(after[0].costBase, toCents(70_000));
  assert.equal(after[1].costBase, toCents(110_000));
  assert.equal(after[0].marketValue, toCents(200_000));
  assert.equal(after[1].marketValue, toCents(300_000));
  assert.equal(after[0].acquired, '2020-01-01');
  assert.equal(after[1].acquired, '2021-06-01');
  // A nil distribution changes nothing — not even a new array with the same numbers in it.
  assert.equal(parcelsAfterDistribution(before, toCents(0)), before);
});

test('`parcelsAfterDistribution` — the remainder a three-way split cannot divide evenly lands on the LAST parcel', () => {
  // $10.00 (1,000 cents) across three EQUAL $100,000 parcels: 1000/3 = 333.33…, so the first two
  // floor to 333 cents each and the third carries the 334-cent remainder — 333 + 333 + 334 = 1000.
  const equal = [parcel('2020-01-01', 0, 100_000), parcel('2020-01-01', 0, 100_000), parcel('2020-01-01', 0, 100_000)];
  const after = parcelsAfterDistribution(equal, 1_000);
  assert.deepEqual(after.map((p) => p.costBase), [333, 333, 334]);
  assert.equal(after.reduce((t, p) => t + p.costBase, 0), 1_000);
});

// --- P3-22h STEP 3 — THE CREDIT ON A STATED SHARE OF THE DISTRIBUTION, LIVE-WIRED ------------------
//
// Step 2 above taxes the whole distribution as ordinary, UNFRANKED income. `Settings.investmentPayoutFrankedShare`
// now applies a credit to a share of it, through `src/core/individualFranking.ts`'s `frankingForIndividual`
// — called from `project()` for the first time (`test/core-individual-franking.test.mjs`'s own
// module-level trip-wire is turned red by this same change, on purpose).
//
//   §7  ONE Person, hand-worked to the cent, reusing §2's own $78,000/$500,000/$20,000 fixture.
//   §8  TWO Persons, TWO simultaneous credits, additive and independent (no spillover — both clear
//       the family Medicare threshold on their own).
//   §9  THE SPILLOVER — one Person's credit raises the OTHER Person's tax, hand-worked via the
//       family Medicare levy's own s 8 formula, and NOT through the offset (T46).
//   §10 ZERO REGRESSION — `investmentPayoutFrankedShare` absent reproduces §2's own $6,399.96
//       figure exactly, byte for byte, alongside the SAME household stated with a share.
const trueUpAmount = (month, who) => {
  const line = trueUpFor(month, who)[0];
  return line === undefined ? 0 : (line.direction === 'inflow' ? line.amount : -line.amount);
};

// --- §7. ONE PERSON, HAND-WORKED TO THE CENT ------------------------------------------------------

test('HAND-WORKED — a 50% franked share turns Sol’s $6,399.96 bill into a $400.04 REFUND', () => {
  // Reusing §2's own fixture exactly: Sol, $78,000 salary, a $500,000 portfolio paying 4% —
  // $20,000.00 — in June 2028. At `investmentPayoutFrankedShare: 0.5` the credit is
  // $20,000.00 × 0.5 = $10,000.00, and `frankedDistributionFromShare` grosses the WHOLE
  // distribution up by that credit: $20,000.00 + $10,000.00 = $30,000.00 — the figure that must
  // now reach the year's assessment, not $20,000.00 alone.
  //
  // WITHOUT ANY DISTRIBUTION AT ALL (§2's own baseline, restated once more): taxable $77,000 ⇒
  // $14,642.00 a year, monthly-accrued to $14,642.04 (the four-cent residue §2 already explains).
  //
  // WITH THE GROSSED-UP $30,000.00: taxable $77,000 + $30,000 = $107,000, still inside the
  // $45,000–$135,000 30% bracket (FY2027-28's own edges, unchanged from FY2026-27 — §2.1's
  // never-indexed constants) and WATO still capped at its $250 maximum (net labour income is
  // salary alone, P3-22f, untouched by either the raw distribution or its credit):
  //   brackets   $26,800 @ 14% + $62,000 @ 30% = $3,752 + $18,600 = $22,352
  //   WATO       −$250
  //   levy       2% × $107,000 = $2,140
  //   ⇒ T2 = $22,352 − $250 + $2,140 = $24,242.00
  assert.equal(3_752_00 + 18_600_00 - 250_00 + 2_140_00, 24_242_00);
  // The credit's OWN incremental cost is T2 less §2's own T1 ($21,042.00, tax on $97,000 — the
  // WHOLE raw distribution, no credit): $24,242.00 − $21,042.00 = $3,200.00 — exactly 32% of the
  // $10,000.00 credit, the SAME combined bracket-and-levy rate §2's own $6,400.00 figure used.
  assert.equal(24_242_00 - 21_042_00, 3_200_00);
  // s 207-20(2)'s offset is the credit, UNCONDITIONALLY: $10,000.00. It exceeds the $3,200.00 the
  // credit itself cost, so the excess — $6,800.00 — is refunded in cash (s 63-10(1) item 40, T46:
  // no floor, no cap), on top of whatever the raw distribution alone already owed.
  assert.equal(10_000_00 - 3_200_00, 6_800_00);
  // Folding that $6,800.00 benefit into §2's own $6,399.96 OUTFLOW turns it into a $400.04 INFLOW —
  // the one figure this test pins against the walk.
  assert.equal(6_800_00 - 6_399_96, 400_04);

  const sol = () => ({ persons: [person('Sol', '1980-03-15', 3_000, { parcels: [parcel('2020-01-01', 300_000, 500_000)] })], homeStatus: 'occupied' });
  const withoutShare = project({ ...FROM_JULY, investmentPayoutRate: 0.04 }, sol(), []);
  const withShare = project({ ...FROM_JULY, investmentPayoutRate: 0.04, investmentPayoutFrankedShare: 0.5 }, sol(), []);
  reconciles(withoutShare);
  reconciles(withShare);

  const julyWithout = trueUpFor(monthAt(withoutShare, '2028-07'), 'Sol');
  assert.equal(julyWithout.length, 1);
  assert.equal(julyWithout[0].direction, 'outflow');
  assert.equal(julyWithout[0].amount, toCents(6_399.96));

  const julyWith = trueUpFor(monthAt(withShare, '2028-07'), 'Sol');
  assert.equal(julyWith.length, 1);
  assert.equal(julyWith[0].direction, 'inflow');
  assert.equal(julyWith[0].amount, toCents(400.04));
});

// --- §8. TWO PERSONS, TWO CREDITS: ADDITIVE AND INDEPENDENT ----------------------------------------

test('HAND-WORKED — Ren and Sam each carry their OWN credit, additively, with no spillover between them', () => {
  // §3's own fixture: Ren’s $500,000 portfolio pays $20,000.00 (§7’s own figure — same $78,000
  // salary, so Ren’s result IS §7’s result, $400.04); Sam’s $250,000 pays $10,000.00, credited at
  // the SAME 0.5 share to $5,000.00, grossing up to $15,000.00 on Sam’s own $87,000 baseline
  // (§3's own T1): taxable $77,000 + $15,000 = $92,000, still inside the 30% bracket:
  //   the credit's OWN cost: $5,000.00 × 32% (bracket + levy, WATO unchanged) = $1,600.00
  //   offset $5,000.00 exceeds it by $3,400.00, refunded in full
  //   folded into §3's own $3,199.96 OUTFLOW: $3,400.00 − $3,199.96 = $200.04 INFLOW
  assert.equal(5_000_00 * 0.32, 1_600_00);
  assert.equal(5_000_00 - 1_600_00, 3_400_00);
  assert.equal(3_400_00 - 3_199_96, 200_04);
  // Both are comfortably clear of the $59,047.50 family Medicare threshold even AFTER their own
  // credit ($107,000 and $92,000 respectively, summing to $199,000), so each is assessed as if
  // solo — the vacuity control that this is genuine INDEPENDENCE and not a coincidence.

  const household = () => ({
    persons: [
      person('Ren', '1980-03-15', 3_000, { parcels: [parcel('2020-01-01', 300_000, 500_000)] }),
      person('Sam', '1981-06-01', 3_000, { parcels: [parcel('2020-01-01', 150_000, 250_000)] }),
    ],
    homeStatus: 'occupied',
  });
  const months = project({ ...FROM_JULY, investmentPayoutRate: 0.04, investmentPayoutFrankedShare: 0.5 }, household(), []);
  reconciles(months);
  const july = monthAt(months, '2028-07');
  const ren = trueUpFor(july, 'Ren');
  const sam = trueUpFor(july, 'Sam');
  assert.equal(ren.length, 1);
  assert.equal(ren[0].direction, 'inflow');
  assert.equal(ren[0].amount, toCents(400.04));
  assert.equal(sam.length, 1);
  assert.equal(sam[0].direction, 'inflow');
  assert.equal(sam[0].amount, toCents(200.04));
  assert.notEqual(ren[0].amount, sam[0].amount);
});

// --- §9. THE SPILLOVER: ONE PERSON'S CREDIT, THE OTHER PERSON'S BILL -------------------------------

test('HAND-WORKED — Uma’s credit pushes the family OUT of the Medicare shade-in zone, and Val pays $49.90 MORE for it', () => {
  // Constructed so that BEFORE the credit (`investmentPayoutRate` alone — step 2's own baseline,
  // the raw distribution taxed plain) Uma and Val land on EXACTLY THE SAME taxable income, so the
  // s 8(3) apportionment is a clean 50/50 with no ratio to round: Uma earns $28,600/yr salary
  // ($1,100/fortnight) and holds a $32,500 portfolio paying 4% — $1,300.00 — reaching Val’s
  // $28,900/yr salary ($1,150/fortnight, no portfolio) exactly: $27,600 + $1,300 = $28,900.
  //
  // STEP 2 BASELINE (both at $28,900.00 taxable, family income $57,800.00 — inside the
  // $47,238–$59,047.50 shade-in band):
  //   s 8(2) raw reduction   0.02 × 47,238 − 0.08 × (57,800 − 47,238) = 944.76 − 844.96 = $99.80
  //   s 8(3) apportionment   50/50 (equal incomes)                    = $49.90 each
  //   s 7(2) ceiling each    10% × (28,900 − 28,011) = $88.90 (binds, below 2% × 28,900 = $578.00)
  //   levy each              88.90 − 49.90 = $39.00
  //   brackets each          (28,900 − 18,200) × 14% = $1,498.00, less full LITO $700 = $798.00
  //   ⇒ EACH owes $837.00 in FY2027-28 on these figures alone
  // (worked in whole cents throughout, to keep the arithmetic exact rather than floating-point)
  assert.equal(2 * 47_238_00 - 8 * (57_800_00 - 47_238_00), 100 * 99_80);
  assert.equal(99_80 / 2, 49_90);
  assert.equal(10 * (28_900_00 - 28_011_00), 100 * 88_90);
  assert.equal(88_90 - 49_90, 39_00);
  assert.equal((28_900_00 - 18_200_00) * 14 - 100 * 700_00, 100 * 798_00);
  assert.equal(798_00 + 39_00, 837_00);

  // STEP 3, at a FULLY franked share (1.0): Uma’s credit is $1,300.00 too, raising ONLY Uma’s
  // taxable to $30,200.00. Family income becomes $59,100.00 — ABOVE $59,047.50 — so s 8 grants
  // NOTHING to EITHER Person, and BOTH fall back to the ordinary, unapportioned s 7(2) levy:
  //   Uma    brackets (30,200−18,200)×14% − LITO(700) = 1,680.00 − 700.00 = $980.00
  //          levy 10% × (30,200 − 28,011) = $218.90 (still below 2% × 30,200 = $604.00)
  //          ⇒ $1,198.90 — up $361.90 on the $837.00 baseline
  //   Val    brackets UNCHANGED at $798.00
  //          levy 10% × (28,900 − 28,011) = $88.90 — the FULL s 7(2) figure, family reduction GONE
  //          ⇒ $886.90 — up $49.90 on the $837.00 baseline, and Val holds no portfolio at all
  assert.equal((30_200_00 - 18_200_00) * 14 - 100 * 700_00, 100 * 980_00);
  assert.equal(10 * (30_200_00 - 28_011_00), 100 * 218_90);
  assert.equal(980_00 + 218_90, 1_198_90);
  assert.equal(1_198_90 - 837_00, 361_90);
  assert.equal(10 * (28_900_00 - 28_011_00), 100 * 88_90);
  assert.equal(798_00 + 88_90, 886_90);
  assert.equal(886_90 - 837_00, 49_90);
  // The offset runs against UMA’S OWN increase only (s 207-20(2)) — $1,300.00 credit less
  // $361.90 of Uma’s own incremental tax leaves $938.10 refunded. Val’s $49.90 is real money, and
  // NONE of the $1,300.00 offset reaches it — that is T46 and the module header’s own finding,
  // reproduced here as a number rather than asserted in prose.
  assert.equal(1_300_00 - 361_90, 938_10);

  const household = () => ({
    persons: [
      person('Uma', '1980-03-15', 1_100, { parcels: [parcel('2020-01-01', 20_000, 32_500)] }),
      person('Val', '1981-06-01', 1_150, {}),
    ],
    homeStatus: 'occupied',
  });
  const step2 = project({ ...FROM_JULY, investmentPayoutRate: 0.04 }, household(), []);
  const step3 = project({ ...FROM_JULY, investmentPayoutRate: 0.04, investmentPayoutFrankedShare: 1 }, household(), []);
  reconciles(step2);
  reconciles(step3);

  const julyStep2 = monthAt(step2, '2028-07');
  const julyStep3 = monthAt(step3, '2028-07');

  // The DELTA between the two runs is asserted, rather than either run's own absolute figure,
  // because the MONTHLY accrual each run reconciles against is itself apportioned on UNEQUAL
  // incomes (Uma's salary alone is $27,600, Val's is $28,900) and carries its own fractional-cent
  // s 8(3) split — real, but no part of what this step changed, and not this test's claim.
  assert.equal(trueUpAmount(julyStep3, 'Uma') - trueUpAmount(julyStep2, 'Uma'), toCents(938.10));
  assert.equal(trueUpAmount(julyStep3, 'Val') - trueUpAmount(julyStep2, 'Val'), toCents(-49.90));
  // Vacuity control: Val holds no portfolio and states no share — nothing about Val's OWN
  // distribution or credit exists to explain this, which is the whole of what "spillover" means.
  assert.equal(distributionNotes(monthAt(step3, '2028-06')).filter((n) => n.person === 'Val').length, 0);
});

// --- §10. ZERO REGRESSION: THE SHARE ABSENT IS §2's OWN FIGURE, TO THE CENT ------------------------

test('P3-22h step 3 — a plan with the rate stated and the share ABSENT reproduces §2’s own $6,399.96 figure exactly', () => {
  // §2 hand-derived Sol's July 2028 true-up at $6,399.96 OUTFLOW with NO `investmentPayoutFrankedShare`
  // in the plan at all. That figure must survive step 3's wiring untouched — this is the
  // zero-regression anchor the brief asks for, run once more here, beside §7's own franked-share
  // figure on the IDENTICAL household, so the two can be read as a pair.
  const sol = () => ({ persons: [person('Sol', '1980-03-15', 3_000, { parcels: [parcel('2020-01-01', 300_000, 500_000)] })], homeStatus: 'occupied' });
  const { investmentPayoutFrankedShare: _drop, ...absentShare } = { ...FROM_JULY, investmentPayoutRate: 0.04, investmentPayoutFrankedShare: 0.8 };
  const missing = project(absentShare, sol(), []);
  const julyMissing = trueUpFor(monthAt(missing, '2028-07'), 'Sol');
  assert.equal(julyMissing.length, 1);
  assert.equal(julyMissing[0].direction, 'outflow');
  assert.equal(julyMissing[0].amount, toCents(6_399.96), 'step 3 must not move step 2’s own figure when no share is stated');

  // And an EXPLICIT run with the key present but the household otherwise unchanged is the SAME
  // household §7 already priced at $400.04 — the pair this section's own title promises.
  const withShare = project({ ...FROM_JULY, investmentPayoutRate: 0.04, investmentPayoutFrankedShare: 0.5 }, sol(), []);
  const julyWithShare = trueUpFor(monthAt(withShare, '2028-07'), 'Sol');
  assert.equal(julyWithShare[0].amount, toCents(400.04));
  assert.notEqual(julyMissing[0].amount, julyWithShare[0].amount);
});

// --- P6-8d. FRANKING ON BOTH SIDES, IN ONE WALK -----------------------------------------------------

test('P6-8d — the SAME 50% franked share inside super AND outside it: both credits land, each once, each in its own place', () => {
  // Sol, 47, no salary (so no Guarantee moves the super balance and no monthly tax is accrued),
  // holds a $500,000 portfolio paying 4% and a $300,000 Accumulation Phase interest with a 3%
  // income share. Both sides carry the SAME 50% franked share.
  //
  // OUTSIDE SUPER — Sol's own year-end true-up (`frankingForIndividual`):
  //   distribution $20,000.00, credit 50% = $10,000.00, grossed up to taxable income $30,000
  //   brackets ($30,000 − $18,200) × 14% = $1,652.00; LITO −$700 (full, under $37,500); no WATO
  //   Medicare shade-in 10% × ($30,000 − $28,011) = $198.90 (below 2% × $30,000 = $600)
  //   ⇒ tax $1,150.90, accrued nil, offset $10,000.00 ⇒ $8,849.10 INFLOW, cash
  //   Unfranked, the same $20,000 is taxable at $252 − $700 LITO ⇒ nil, and levy-free: NO line.
  //
  // INSIDE SUPER — the fund's earnings tax (`frankingInSuper`):
  //   income share $300,000 × 3% = $9,000.00, credit 50% = $4,500.00, grossed up to $13,500.00
  //   15% = $2,025.00 against a $4,500.00 offset ⇒ no tax line, $2,475.00 REFUNDED, wealth
  //   Unfranked, the same $9,000 is taxed 15% = $1,350.00: a tax line and no refund.
  assert.equal(((30_000_00 - 18_200_00) * 14) / 100, 1_652_00);
  assert.equal((30_000_00 - 28_011_00) / 10, 198_90);
  assert.equal(1_652_00 - 700_00 + 198_90, 1_150_90);
  assert.equal(10_000_00 - 1_150_90, 8_849_10);
  assert.equal((13_500_00 * 15) / 100, 2_025_00);
  assert.equal(4_500_00 - 2_025_00, 2_475_00);
  assert.equal((9_000_00 * 15) / 100, 1_350_00);

  const sol = () => ({
    persons: [
      person('Sol', '1980-03-15', 0, {
        superInterests: [{ phase: 'accumulation', balance: toCents(300_000) }],
        parcels: [parcel('2020-01-01', 300_000, 500_000)],
      }),
    ],
    homeStatus: 'occupied',
  });
  const RATES = { ...FROM_JULY, planningHorizonAge: 49, investmentPayoutRate: 0.04, superIncomeYieldRate: 0.03 };
  const walk = (shares) => project({ ...RATES, ...shares }, sol(), []);
  const sides = (months) => {
    const july = monthAt(months, '2028-07');
    const fy = (d) => months.flatMap((m) => linesOf(m, d)).filter((l) => l.description.endsWith('2027-28'));
    return {
      individual: trueUpFor(july, 'Sol').map((l) => `${l.direction} ${l.effect} ${l.amount}`),
      superTax: fy(SUPER_EARNINGS_TAX_LINE).map((l) => l.amount),
      superRefund: fy(SUPER_FRANKING_CREDIT_REFUND_LINE).map((l) => `${l.direction} ${l.effect} ${l.amount}`),
      superBalance: july.superBalance,
    };
  };

  const both = walk({ investmentPayoutFrankedShare: 0.5, superIncomeYieldFrankedShare: 0.5 });
  reconciles(both);
  assert.deepEqual(sides(both), {
    individual: [`inflow cash ${toCents(8_849.1)}`],
    superTax: [],
    superRefund: [`inflow wealth ${toCents(2_475)}`],
    superBalance: toCents(302_475),
  });

  // NEITHER CREDIT IS ZERO: against the same walk unfranked, each side moves by its own credit's worth.
  const neither = walk({});
  assert.deepEqual(sides(neither), { individual: [], superTax: [toCents(1_350)], superRefund: [], superBalance: toCents(298_650) });

  // NEITHER IS COUNTED TWICE OR IN THE OTHER'S PLACE: each side franked ALONE gives exactly its own
  // half of the combined walk, and leaves the other side at its unfranked figure. The super credit
  // ($4,500) reaching Sol's assessment would have moved $8,849.10; the individual credit ($10,000)
  // reaching the fund would have moved $2,475.00.
  const individualOnly = sides(walk({ investmentPayoutFrankedShare: 0.5 }));
  const superOnly = sides(walk({ superIncomeYieldFrankedShare: 0.5 }));
  assert.deepEqual(individualOnly, { ...sides(neither), individual: sides(both).individual });
  assert.deepEqual(superOnly, { ...sides(both), individual: [] });
  // And the cash side carries ONLY the individual credit: July 2028's cash movement is the $8,849.10
  // true-up, the fund's $2,475.00 refund staying inside super as wealth.
  const july = monthAt(both, '2028-07');
  assert.equal(july.closingBalance - july.openingBalance, toCents(8_849.1));
});
