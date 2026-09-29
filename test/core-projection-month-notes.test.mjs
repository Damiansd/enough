// P4-4's POLISH — `Month.notes`: WHAT DID NOT MOVE, AND WHY.
//
// Two facts lived for the length of one tick and died inside `project()`'s loop, and this file is
// where both of them become output:
//
//   1. **The Waterfall's per-limb record.** `drawWaterfall` has computed `available`, `drawn` and
//      `note` for all four limbs since P4-1 chunk 4. `project()` read `drawn` off two of the draws
//      to allocate a payment and threw everything else away — so *"which kind of nothing limb 2
//      supplied this month"*, a question `unfundedMiddleLimbs` has THREE different answers to, was
//      unanswerable from the `Month`. The sharpest case is a limb with `available > 0` and
//      `drawn === 0`: nothing is emitted for it at all, because nothing moved, and a reader could
//      not tell that limb from one that had nothing to offer.
//   2. **A month no register reaches.** Outside the Age Pension parameter window, or in a financial
//      year below the tax scale's lower bound, the walk emits no line — correctly, since
//      `MonthLine.amount` is specified as always positive and a computed zero is a different fact
//      from an uncomputed one. What that left was two indistinguishable empty arrays: *"nil"* and
//      *"nobody has legislated it"*, with the DIRECTION of the second recoverable from nothing.
//
// **A note is not a line and no zero-amount line is manufactured to carry one** — see `MonthNote`
// in `plan.ts`. Every assertion below that touches money touches `lines`; `notes` never reaches a
// balance, and the last section pins that from both sides.
import test from 'node:test';
import assert from 'node:assert/strict';

import { toCents } from '../dist/core/money.js';
import {
  PARAMETER_WINDOW_NOTES,
  WATERFALL_LIMBS,
  drawWaterfall,
  project,
  unfundedMiddleLimbs,
  waterfallLimbNotes,
} from '../dist/core/projection.js';

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

// **The couple is fifteen years apart on purpose.** Val reaches Age Pension age inside the walk and
// Ken does not, which is what makes his balance the protected half of the means test — two ages
// doing two different things, rather than one age doing both.
const VAL = '1955-04-17';
const KEN = '1970-01-01';

const SETTINGS = {
  asAtDate: '2026-09-01',
  planningHorizonAge: 73,
  // ⚠️ **`cpi: 0`, AND IT IS THE ALGEBRAIC CONTROL RATHER THAN A SPECIAL CASE** (register O85,
  // user ruling 2026-09-21). The stated spending level is a REAL figure now and `project()` raises it
  // to each month's own price level, so at any positive CPI every hand-worked figure below would
  // carry a `(1 + cpi) ^ (n / 12)` in it and this fixture would be arithmetic about indexation rather
  // than about what it was written for. At nil the factor is exactly 1 in every month
  // (`core/priceLevel.ts`), so every figure here is the figure it was hand-worked as. The indexation
  // itself is asserted in `test/core-projection-waterfall.test.mjs` §8, on its own fixture.
  // Pay rising with wages (2026-09-23) is not this fixture's subject: `awote: 0` holds every salary at the figure stated. A proved control: every figure this file asserts is the same at nil on the build before pay rose.
  economicSeries: { cpi: 0, pblci: 0.025, awote: 0, mtawe: 0.035 },
  deemingRates: { lower: 0.0175, upper: 0.0375 },
  nominalReturn: 0.065,
};

const SPEND = [
  {
    id: 'sc',
    date: '2026-09-01',
    owner: 'household',
    type: 'SPEND_CHANGE',
    params: { annualSpend: toCents(72_000) },
    enabled: true,
    createdAt: '2026-06-01',
  },
];

/** A stream with a commencement day, which is the input Sch 7 refuses to guess. */
const COMMENCED = { phase: 'accountBasedPension', balance: toCents(400_000), statedStreamSettings: { commencementDay: '2020-07-01' } };

const household = (over = {}) => ({
  persons: [person('Val', VAL, over.val ?? {}), person('Ken', KEN, over.ken ?? {})],
  homeStatus: 'occupied',
  openingOffsetBalance: over.offset ?? toCents(10_000),
});

const monthAt = (months, month) => months.find((m) => m.month === month);
const limbs = (month) => month.notes.filter((n) => n.subject === 'waterfall limb');
const limb = (month, name) => limbs(month).find((n) => n.limb === name);
const windows = (month) => month.notes.filter((n) => n.subject === 'parameter window');

// --- 1. EVERY LIMB, EVERY MONTH, IN THE WATERFALL'S OWN ORDER ------------------------------------

test('P4-4 — a limb note per limb in every month, in WATERFALL_LIMBS order, including the limbs that drew nothing', () => {
  // `drawWaterfall`'s own doctrine, now visible in the output: *"a projection that reported three
  // limbs because the fourth was empty would make an unfunded limb and an absent limb look
  // identical."*
  //
  // **FIVE since 2026-09-19**, when released superannuation arrived as the last limb, and **SEVEN
  // since 2026-09-23**, when the pension was split at its minimum and the cash at the home loan
  // ("spend cash first"). The count is
  // stated as `WATERFALL_LIMBS.length × months` rather than as a literal, and the literal beside it
  // is what stops that from being circular: a limb added to the array and to nothing else moves
  // both of them, and `7` is where a reader sees it.
  const months = project(SETTINGS, household({ val: { superInterests: [COMMENCED] } }), SPEND);
  assert.equal(months.length, 197);
  assert.equal(WATERFALL_LIMBS.length, 7);
  for (const month of months) {
    assert.deepEqual(
      limbs(month).map((n) => n.limb),
      [...WATERFALL_LIMBS],
      `${month.month} did not report all seven limbs in order`,
    );
  }
  // The count is pinned as well as the order: a note pushed twice, or an eighth limb that appeared in
  // one month only, would pass the `deepEqual` above in every OTHER month and hide there.
  assert.equal(months.flatMap((m) => limbs(m)).length, 7 * 197);
});

test('P4-4 — the notes are the DRAWS, one for one, and `waterfallLimbNotes` is the only mapping', () => {
  // The array is `result.draws` mapped, so it cannot fall out of step with a loop somebody has to
  // maintain. Asserted against a `drawWaterfall` call made here, with figures nothing else supplies.
  const result = drawWaterfall(toCents(5_000), {
    salary: { available: toCents(1_200), note: 'the salary limb, as this test states it' },
    accountBasedPensionMinimum: { available: toCents(900), note: 'the pension limb, as this test states it' },
    cashAboveLoan: { available: toCents(300), note: 'the cash-above-the-loan limb, as this test states it' },
    nonSuperPortfolio: { available: toCents(10_000), note: 'the portfolio limb, as this test states it' },
    accountBasedPensionAboveMinimum: { available: toCents(700), note: 'the pension-above-its-minimum limb, as this test states it' },
    offsetAccount: { available: toCents(400), note: 'the offset limb, as this test states it' },
    releasedSuperannuation: { available: toCents(600), note: 'the released super limb, as this test states it' },
  });
  // $1,200 + $900 + $300 = $2,400 met from the first three; the portfolio meets the remaining $2,600
  // of the $5,000 target out of the $10,000 it holds; the limbs after it are reached with nothing
  // left to fund.
  assert.deepEqual(waterfallLimbNotes(result), [
    { subject: 'waterfall limb', limb: 'salary', available: toCents(1_200), drawn: toCents(1_200), note: 'the salary limb, as this test states it' },
    { subject: 'waterfall limb', limb: 'accountBasedPensionMinimum', available: toCents(900), drawn: toCents(900), note: 'the pension limb, as this test states it' },
    { subject: 'waterfall limb', limb: 'cashAboveLoan', available: toCents(300), drawn: toCents(300), note: 'the cash-above-the-loan limb, as this test states it' },
    { subject: 'waterfall limb', limb: 'nonSuperPortfolio', available: toCents(10_000), drawn: toCents(2_600), note: 'the portfolio limb, as this test states it' },
    { subject: 'waterfall limb', limb: 'accountBasedPensionAboveMinimum', available: toCents(700), drawn: toCents(0), note: 'the pension-above-its-minimum limb, as this test states it' },
    { subject: 'waterfall limb', limb: 'offsetAccount', available: toCents(400), drawn: toCents(0), note: 'the offset limb, as this test states it' },
    { subject: 'waterfall limb', limb: 'releasedSuperannuation', available: toCents(600), drawn: toCents(0), note: 'the released super limb, as this test states it' },
  ]);
  assert.equal(toCents(1_200) + toCents(900) + toCents(300) + toCents(2_600), toCents(5_000));
  // ⚠️ **EACH NOTE MUST CARRY ITS OWN LIMB'S TEXT.** A mapping that paired a limb name with the
  // note beside it would report four plausible sentences about the wrong four limbs, and every
  // assertion above about ORDER and COUNT would still pass.
  for (const note of waterfallLimbNotes(result)) {
    assert.equal(note.note, result.draws.find((d) => d.limb === note.limb).note);
    assert.equal(note.available, result.draws.find((d) => d.limb === note.limb).available);
    assert.equal(note.drawn, result.draws.find((d) => d.limb === note.limb).drawn);
  }
});

// --- 2. WHICH KIND OF NOTHING LIMB 2 SUPPLIED ----------------------------------------------------

test('P4-4 — limb 2 has THREE kinds of nothing and a `Month` now says which one, in three walks', () => {
  // The three branches of `unfundedMiddleLimbs`, each reached by a Household that differs from the
  // next in exactly one input — so it is the input that selects the note and not the fixture.
  const none = project(SETTINGS, household(), SPEND);
  const unstated = project(SETTINGS, household({ val: { superInterests: [{ phase: 'accountBasedPension', balance: toCents(400_000) }] } }), SPEND);
  const commenced = project(SETTINGS, household({ val: { superInterests: [COMMENCED] } }), SPEND);

  // (1) no Account-Based Pension in the Household at all — a fact about the HOUSEHOLD.
  assert.equal(limb(monthAt(none, '2026-09'), 'accountBasedPensionMinimum').note, 'no Account-Based Pension in this Household');
  // (2) one is held and no commencement day is stated — a fact about a MISSING INPUT, and the note
  // names the input and states the direction (the income is under-stated by the whole minimum).
  const missing = limb(monthAt(unstated, '2026-09'), 'accountBasedPensionMinimum').note;
  assert.match(missing, /no commencement day is stated for it/);
  assert.match(missing, /will not guess one/);
  assert.match(missing, /statedStreamSettings\.commencementDay/);
  // (3) one is held WITH a day and nothing is available this month — a fact about the PENSION: it
  // has not commenced yet.
  //
  // ⚠️ **THIS BRANCH USED TO BE REACHED BY `COMMENCED` ITSELF, AND THAT WAS THE DEFECT (P10-5).**
  // The walk opens 1 September, so it never opens its first year's 1 July, and until 2026-09-21 that
  // meant Val's pension — running since 2020 — offered NOTHING for ten months. Schedule 7 has no such
  // nil: cl 4's turns on the commencement day and cl 3 pro-rates only a commencement year. So the
  // fixture that reaches this third kind of nothing is now a pension that genuinely has not started,
  // and `COMMENCED` reports a FUNDED limb 2 in month one.
  const notYet = project(
    SETTINGS,
    household({ val: { superInterests: [{ ...COMMENCED, statedStreamSettings: { commencementDay: '2030-07-01' } }] } }),
    SPEND,
  );
  const nothingYet = limb(monthAt(notYet, '2026-09'), 'accountBasedPensionMinimum').note;
  assert.match(nothingYet, /nothing is available from it this month/);
  assert.match(nothingYet, /it has not commenced yet/);
  assert.match(nothingYet, /"the walk never opened the day Sch 7 reads the balance on" is not one either since P10-5/);
  // And the control on the other side of that change: the running pension is funded from month one.
  assert.ok(limb(monthAt(commenced, '2026-09'), 'accountBasedPensionMinimum').drawn > 0);

  // **All three are NIL, which is the whole point.** Three different facts behind one figure, and
  // before this pass the figure was all a `Month` carried — and it carried it only by omission,
  // since a limb that draws nothing emits no line either.
  for (const [months, month] of [[none, '2026-09'], [unstated, '2026-09'], [notYet, '2026-09']]) {
    assert.equal(limb(monthAt(months, month), 'accountBasedPensionMinimum').available, toCents(0));
    assert.equal(limb(monthAt(months, month), 'accountBasedPensionMinimum').drawn, toCents(0));
  }
  // Three DIFFERENT sentences, not three copies of one.
  assert.equal(new Set([limb(monthAt(none, '2026-09'), 'accountBasedPensionMinimum').note, missing, nothingYet]).size, 3);
  // And they are the three `unfundedMiddleLimbs` states, read from the function itself rather than
  // from a second spelling here.
  assert.equal(
    limb(monthAt(none, '2026-09'), 'accountBasedPensionMinimum').note,
    unfundedMiddleLimbs(household()).accountBasedPensionMinimum.note,
  );
});

test('P4-4 — the FY2027-28 note names its own year, and since 2026-09-23 what it offers is that year’s minimum', () => {
  // ⚠️ **RE-DERIVED ON 2026-09-21, NOT RE-READ.** This test used to open on the sentence *"the walk
  // opens 2026-09-01, so FY2026-27 has no 1 July balance in it and limb 2 is nil for ten months"*,
  // and every figure below rested on it. That behaviour is gone (P10-5): Val's pension now pays its
  // FY2026-27 minimum from month one, so by 2027-07 the account has funded ten months of this
  // household and is **$41,561.70** lighter — ten monthly draws of roughly $4,000 plus the growth
  // that money would have earned, which is the size the mechanism predicts and the size measured.
  const months = project(SETTINGS, household({ val: { superInterests: [COMMENCED] } }), SPEND);
  const july = monthAt(months, '2027-07');
  const funded = limb(july, 'accountBasedPensionMinimum');
  assert.match(funded.note, /what is still owed of the Account-Based Pension's minimum/);
  assert.match(funded.note, /FY2027-28/);
  // ⚠️ **AND $69.80 HEAVIER SINCE 2026-09-23.** With no series stated the 20 March 2027 rates now
  // INDEX on the plan's own rates rather than standing: the combined basic rate rises by √1.025
  // (PBLCI; CPI is nil here) from $1,711.80 to $1,733.07, so Val's halved pension is $10.635 a
  // fortnight — $23.04 a month — higher in April, May and June, and limb 2 draws that much less from
  // her account. Three months of $23.04 is $69.12, and the ~$0.70 above it is the growth that money
  // earns while it stays in the account.
  assert.equal(38_006_022 - 37_999_042, 6_980, 'the pre-2026-09-23 balance, kept beside the new one');
  assert.equal(42_155_212 - 37_999_042, 4_156_170, 'the pre-P10-5 balance, kept beside the new one');
  //
  // ⚠️ **AND SPLIT IN TWO ON 2026-09-23 ("spend cash first"), WHICH ALSO SPENDS THE $10,000 OFFSET.**
  // The limb above offered the whole account, $380,060.22 of it here. It now offers only what is
  // still owed of the year's minimum; the rest is a second limb, drawn after cash and investments.
  // And the household's $10,000 of cash — no home loan, so none of it is offsetting one — is spent
  // as soon as the FY2026-27 minimum is paid: that $20,000.00 (5% of $400,000) is met by need through
  // January 2027 ($4,098.47 + $4,036.65 + $4,035.11 + $4,033.58 + $3,796.19), and the cash pays
  // January to April ($235.85 + $4,030.48 + $4,028.94 + $1,704.73). So July's account is
  // $390,287.15 — the $10,000 it no longer paid, plus $226.93 of growth on it — and the cash is nil.
  //   FY2027-28 minimum  5% × $390,287.15 = $19,514.36, cl 5 nearest $10       = $19,510.00
  //   above it           $390,287.15 − $19,510.00                             = $370,777.15
  assert.equal(funded.available, toCents(19_510));
  const above = limb(july, 'accountBasedPensionAboveMinimum');
  assert.equal(above.available, toCents(370_777.15));
  assert.equal(funded.available + above.available, 39_028_715, 'the two limbs together offer the whole account');
  assert.equal(39_028_715 - 38_006_022, toCents(10_226.93));
  assert.equal(limb(july, 'cashAboveLoan').available, toCents(0));
  assert.equal(
    [4_098.47, 4_036.65, 4_035.11, 4_033.58, 3_796.19].reduce((t, x) => t + toCents(x), 0),
    toCents(20_000),
  );
  assert.equal([235.85, 4_030.48, 4_028.94, 1_704.73].reduce((t, x) => t + toCents(x), 0), toCents(10_000));
  // THE TARGET, long-hand: $72,000.00 a year is $6,000.00 a month.
  assert.equal(toCents(72_000) / 12, toCents(6_000));

  // ⚠️ **AND LIMB 1 IS NO LONGER NIL (P4-1e, 2026-09-21), SO LIMB 2 NO LONGER MEETS THE WHOLE
  // TARGET.** This asserted `funded.drawn === $6,000.00` and `limb(july, 'salary').available === 0`,
  // on the sentence *"limb 1 is nil here — Val's Age Pension is not computable past the register's
  // window — so limb 2 meets the whole of it"*. It is computable now, on the 20 September 2026 sets
  // carried forward, and it arrives in limb 1 as received cash.
  //
  // ⚠️ **AND THE MEANS-TESTED FIGURE MOVED AGAIN ON THE SAME DAY (P10-5), IN TWO PLACES AT ONCE —
  // AND ONCE MORE ON 2026-09-23.** P10-5 made the account lighter and left the $10,000 Offset
  // unspent, so the deeming base was $380,060.22 of stream plus $10,000 = $390,060.22, the pension
  // $923.26 a fortnight and limb 2 $3,999.60. Since "spend cash first" the Offset is spent and the
  // stream is correspondingly heavier: the base is the stream alone, $390,287.15, $226.93 larger.
  // Re-derived from the 20 March 2027 set GENERATED from this plan's rates (2026-09-23), rather than
  // read off the walk:
  //   maximum payment rate, couple combined  $1,733.07 + $133.00 + $21.20     = $1,887.27 a fortnight
  //                  (basic $1,711.80 × √1.025; the Supplement follows CPI, which is nil)
  //   assets test    assessable $390,287.15, all of it stream, against a homeowner couple's $499,000
  //                  free area: NO reduction, it does not bite
  //   income test    deeming: $110,600 at 1.75% = $1,935.50 plus $279,687.15 at 3.75% =
  //                  $10,488.268125, so $12,423.768125 a year and $477.8372… a fortnight; over the
  //                  $396.00 free area by $81.8372…, tapered at 50c = $40.9186…
  //   combined rate  $1,887.27 − $40.9186… = $1,846.3514…; halved = $923.1757… → $923.18
  //                  (Val alone is eligible)
  //   monthly        $923.18 × 26 ÷ 12 = $2,000.2233… → $2,000.22
  // So the minimum limb draws the remainder: $6,000.00 − $2,000.22 = $3,999.78, eighteen cents more
  // than before, because a $226.93 larger deeming base costs $0.08 a fortnight of pension.
  assert.equal(july.assessableAssets, 39_028_715, 'the deeming base: the stream alone, the Offset having been spent');
  assert.equal(funded.available + above.available, july.assessableAssets);
  assert.equal(limb(july, 'salary').available, 200_022);
  assert.equal(limb(july, 'salary').drawn, 200_022);
  assert.equal(funded.drawn, 399_978);
  assert.equal(200_022 + 399_978, toCents(6_000));
  assert.equal(above.drawn, toCents(0));
  // And the $4,047.25 drawn is the money that actually moved: the limb's `drawn` and the month's
  // minimum-drawdown line are the same figure, computed once.
  assert.equal(
    july.lines.filter((l) => l.description.startsWith('Account-Based Pension payment')).reduce((t, l) => t + l.amount, 0),
    funded.drawn,
  );
  // ⚠️ **AND THE SUM OF EVERY `drawn` IS THE TARGET.** This is the arithmetic no `Month` could
  // state before: five of the seven limbs contribute nothing to it and emit no line to say so.
  assert.equal(limbs(july).reduce((total, n) => total + n.drawn, 0), toCents(6_000));
});

test('P4-4 — the case no line can report: limb 3 OFFERS $250,000.00 and draws NOTHING', () => {
  // A limb with `available > 0` and `drawn === 0` moves no money, so it emits no line, so before
  // this pass a `Month` could not distinguish it from a limb with nothing to offer at all. Here it
  // holds a quarter of a million dollars of parcels and is simply never reached, because limb 1 met
  // the whole target — and the two facts are now side by side in the same array.
  //
  // Month 0 is the month to assert it in: a walk reports the balances it OPENS with, so the parcel
  // is at the market value the fixture states and the figure is the fixture's own.
  const salaried = household({
    val: {
      employmentIncomePerFortnight: toCents(4_000),
      parcels: [{ acquired: '2019-02-14', costBase: toCents(120_000), marketValue: toCents(250_000) }],
    },
    ken: { superInterests: [{ phase: 'accumulation', balance: toCents(300_000) }] },
  });
  const september = project(SETTINGS, salaried, SPEND)[0];
  assert.equal(september.month, '2026-09');

  // LIMB 1, long-hand. $8,666.67 of salary plus $14.56 of Age Pension less $1,956.67 of income tax
  // is $6,724.56 available — and the target is $6,000.00, so $6,724.56 is offered and $6,000.00 is
  // taken. The three figures are the month's own lines.
  assert.equal(866_667 + 1_456 - 195_667, 672_456);
  assert.equal(limb(september, 'salary').available, 672_456);
  assert.equal(limb(september, 'salary').drawn, toCents(6_000));

  // ⚠️ **LIMB 3 SINCE P10-4 (2026-09-21): the quarter of a million LESS WHAT SELLING IT WOULD BE
  // TAXED, and still not a cent of it reached.** This assertion read `toCents(250_000)` — the whole
  // market value — and the title still says $250,000.00 because that is what the parcel is worth.
  // What the limb can hand a month is less: the parcel cost $120,000 and is worth $250,000, so
  // selling all of it realises a $130,000 nominal gain, s 115-25 halves it to $65,000, and that
  // stacks on Val's $104,000 salary — most of it through the 30c bracket and the rest through the
  // 37c one, plus the 2% levy. **$23,110.00 of tax, so $226,890.00 is what limb 3 offers.**
  const portfolio = limb(september, 'nonSuperPortfolio');
  assert.equal(portfolio.available, toCents(226_890));
  assert.equal(toCents(250_000) - portfolio.available, toCents(23_110));
  assert.equal(portfolio.drawn, toCents(0));
  assert.match(portfolio.note, /a draw is a CGT DISPOSAL/);
  assert.match(portfolio.note, /LESS the capital gains tax selling the whole of it would cause/);
  // **And the offer is a figure about the PARCEL and not a fraction of it**: the same market value
  // on a cost base of its own worth realises no gain, so nothing is held back and the whole
  // $250,000.00 is offered. A limb that simply scaled its holding down could not produce both.
  const atCost = project(SETTINGS, household({
    val: {
      employmentIncomePerFortnight: toCents(4_000),
      parcels: [{ acquired: '2019-02-14', costBase: toCents(250_000), marketValue: toCents(250_000) }],
    },
    ken: { superInterests: [{ phase: 'accumulation', balance: toCents(300_000) }] },
  }), SPEND)[0];
  assert.equal(limb(atCost, 'nonSuperPortfolio').available, toCents(250_000));
  // Nothing in `lines` says any of that — which is exactly what the note is for.
  assert.deepEqual(september.lines.filter((l) => l.description.startsWith('Non-Super Portfolio')), []);

  // Not the SAME nil as an empty portfolio's: same `drawn`, different `available`, different note.
  const bare = project(SETTINGS, household({ val: { employmentIncomePerFortnight: toCents(4_000) } }), SPEND)[0];
  assert.equal(limb(bare, 'nonSuperPortfolio').drawn, portfolio.drawn);
  assert.equal(limb(bare, 'nonSuperPortfolio').available, toCents(0));
  assert.match(limb(bare, 'nonSuperPortfolio').note, /no Non-Super Portfolio in this Household/);
  assert.notEqual(limb(bare, 'nonSuperPortfolio').note, portfolio.note);
  // And the cash is a third state again: it offers the stated $10,000 and is never reached either.
  // With no home loan none of it is offsetting one, so since 2026-09-23 it is all offered BEFORE the
  // portfolio, as cash not offsetting the loan, and the Offset limb proper offers nothing.
  assert.equal(limb(september, 'cashAboveLoan').available, toCents(10_000));
  assert.equal(limb(september, 'cashAboveLoan').drawn, toCents(0));
  assert.equal(limb(september, 'offsetAccount').available, toCents(0));
  assert.match(limb(september, 'offsetAccount').note, /no home loan is owing/);
});

// --- 3. A MONTH NOBODY HAS LEGISLATED ------------------------------------------------------------

test('P4-4 — a financial year below the tax scale says so, and says WHICH WAY the absence runs', () => {
  // The tax window is closed BELOW at FY2026-27, so a walk anchored on 1 May 2026 opens in a year
  // the scale does not reach. Two months of the same walk, chosen so the boundary is crossed: June
  // 2026 is FY2025-26 and is uncomputable; July 2026 is FY2026-27 and is not.
  const settings = { ...SETTINGS, asAtDate: '2026-05-01', planningHorizonAge: 62 };
  const salaried = household({ val: { employmentIncomePerFortnight: toCents(4_000) } });
  const months = project(settings, salaried, SPEND);

  const june = monthAt(months, '2026-06');
  assert.deepEqual(windows(june).map((n) => n.register), ['income tax']);
  assert.match(windows(june)[0].note, /NOTHING WAS COMPUTED AT NIL/);
  assert.match(windows(june)[0].note, /UNDETERMINED rather than nil/);
  // ⚠️ **THE DIRECTION, WHICH IS THE HALF A LABEL WOULD NOT CARRY.** An unassessed year is tax the
  // Household keeps, so the absence FLATTERS it — the opposite direction from the Age Pension's.
  assert.match(windows(june)[0].note, /the direction is the FLATTERING one/);
  assert.equal(june.lines.filter((l) => l.description.startsWith('Income tax')).length, 0);

  // July is the same Household, one month later, inside the window: no note, and a tax line.
  const july = monthAt(months, '2026-07');
  assert.deepEqual(windows(july).filter((n) => n.register === 'income tax'), []);
  assert.equal(july.lines.filter((l) => l.description.startsWith('Income tax')).length, 1);
  // Not vacuous: the salary is there in both months, so June's silence is about the YEAR and not
  // about a Household with nothing to tax.
  assert.equal(june.lines.filter((l) => l.description.startsWith('Salary')).length, 1);
  assert.equal(
    june.lines.find((l) => l.description.startsWith('Salary')).amount,
    july.lines.find((l) => l.description.startsWith('Salary')).amount,
  );
});

test('P4-1e — a month past the PUBLISHED window is computed, and from 2026-09-23 on INDEXED rates, not carried ones', () => {
  // ⚠️ **REVERSED TWICE.** Before 2026-09-21 2027-04 carried an Age Pension parameter-window note —
  // the Household's income UNDER-stated where no pension could be computed. From 2026-09-21 (P4-1e)
  // it carried a `standing parameters` note instead, because the last published sets were carried
  // forward. From 2026-09-23 a plan that states no series is indexed on its own growth rates (user
  // ruling), so nothing is carried and neither note is true of the month: it is computed, on a
  // forecast, and it is the LINE's provenance that says which forecast.
  const months = project(SETTINGS, household({ val: { superInterests: [COMMENCED] } }), SPEND);
  const march = monthAt(months, '2027-03');
  const april = monthAt(months, '2027-04');
  assert.deepEqual(windows(march).map((n) => n.register), []);
  assert.deepEqual(windows(april).map((n) => n.register), [], 'the window note is for an ABSENCE, and there is none');
  assert.equal(months.flatMap((m) => m.notes.filter((n) => n.subject === 'standing parameters')).length, 0);
  const pension = (month) => month.lines.filter((l) => l.description === 'Age Pension');
  assert.equal(pension(april).length, 1);
  assert.ok(pension(april)[0].provenance.caveats.some((c) => c.includes('not stated — generated from')));
  // March, the last PUBLISHED month, names no forecast: the published records answer it.
  assert.equal(pension(march).length, 1);
  assert.equal(pension(march)[0].provenance.caveats.some((c) => c.includes('generated from')), false);
  // The two registers still disagree about which way their own absence runs, and the notes still
  // say so — the Age Pension's window note is narrowed to the months BELOW the first determination.
  assert.match(PARAMETER_WINDOW_NOTES['Age Pension'].note, /UNDER-stated/);
  assert.match(PARAMETER_WINDOW_NOTES['Age Pension'].note, /BELOW the first determination/);
  assert.match(PARAMETER_WINDOW_NOTES['income tax'].note, /FLATTERING/);
  assert.notEqual(PARAMETER_WINDOW_NOTES['Age Pension'].note, PARAMETER_WINDOW_NOTES['income tax'].note);
});

test('P4-4 — BOTH windows can be shut in one month, and one walk shows every state there is', () => {
  // A walk anchored on 1 February 2026 crosses both lower edges on its way up, in different months,
  // so its 72 months partition into three window states and every one of them is populated:
  //
  //   2026-02, 2026-03   BOTH shut. The Age Pension parameters open on 20 March 2026 and a month
  //                      reads its own FIRST day, so March 2026 is still outside.
  //   2026-04 … 2026-06  the tax window alone, which is closed below FY2026-27.
  //   2026-07 onward     neither: 67 months in which both registers answer.
  //
  // ⚠️ **THE FOURTH STATE IS GONE AND A DIFFERENT FOURTH HAS TAKEN ITS PLACE (P4-1e, 2026-09-21).**
  // It read *"2027-04 onward — the Age Pension alone, past the published window's upper edge"*,
  // and the upper edge no longer produces an absence: those months are computed — on carried rates
  // until 2026-09-23, on rates indexed from this plan's own growth rates since. So the window partition has three states and
  // the standing note cuts across the last of them, which is asserted separately below — a
  // cross-cutting fact stacked into a partition is exactly what this test's shape refuses.
  const settings = { ...SETTINGS, asAtDate: '2026-02-01', planningHorizonAge: 62 };
  const entries = SPEND.map((e) => ({ ...e, date: '2026-02-01', createdAt: '2026-01-01' }));
  const months = project(settings, household(), entries);
  assert.equal(months.length, 72);

  const state = (month) => windows(month).map((n) => n.register).sort().join(' + ');
  const monthsIn = (name) => months.filter((m) => state(m) === name).map((m) => m.month);
  assert.deepEqual(monthsIn('Age Pension + income tax'), ['2026-02', '2026-03']);
  assert.deepEqual(monthsIn('income tax'), ['2026-04', '2026-05', '2026-06']);
  assert.equal(monthsIn('').length, 72 - 2 - 3);
  assert.equal(monthsIn('')[0], '2026-07');
  assert.equal(monthsIn('').at(-1), months.at(-1).month);
  assert.deepEqual(monthsIn('Age Pension'), [], 'the upper edge produces no absence any more');
  // The partition is exhaustive — 2 + 3 + 67 = 72 — so no month is in two states or in none.
  assert.equal(2 + 3 + 67, 72);
  assert.equal(
    monthsIn('Age Pension + income tax').length + monthsIn('income tax').length + monthsIn('').length,
    months.length,
  );
  // THE CROSS-CUTTING FACT, stated as one and not stacked into the partition above: from 2027-04
  // every Age Pension line is computed on the series GENERATED from this plan's rates (2026-09-23)
  // and its provenance says so, and no line before it does. It was a `standing parameters` note on
  // the month until the rates stopped being carried; no month carries that note now.
  const generated = (m) => m.lines.some((l) => l.description === 'Age Pension' && l.provenance.caveats.some((c) => c.includes('not stated — generated from')));
  const forecast = months.filter(generated);
  assert.equal(forecast[0].month, '2027-04');
  assert.equal(forecast.length, 72 - 2 - 3 - 9, 'every month past the published window, and no other');
  assert.equal(forecast.at(-1).month, months.at(-1).month);
  for (const month of months.slice(0, 2 + 3 + 9)) assert.equal(generated(month), false, month.month);
  assert.equal(months.filter((m) => m.notes.some((n) => n.subject === 'standing parameters')).length, 0);
  // A register never doubles up within a month, and a month that is inside a window has no note for
  // it — so a note is evidence of an ABSENCE and never a standing decoration.
  for (const month of months) {
    assert.equal(new Set(windows(month).map((n) => n.register)).size, windows(month).length);
    assert.ok(windows(month).length <= 2);
  }
  // Both months that are outside BOTH windows carry BOTH notes, in the order the tick decides them:
  // the Age Pension is answered at the top of the month and the tax year at the accrual.
  assert.deepEqual(monthAt(months, '2026-02').notes.filter((n) => n.subject === 'parameter window').map((n) => n.register), [
    'Age Pension',
    'income tax',
  ]);
});

// --- 4. A NOTE IS NOT A LINE ---------------------------------------------------------------------

test('P4-4 — `notes` reaches no balance: it carries no amount, no direction, and is frozen', () => {
  const months = project(SETTINGS, household({ val: { superInterests: [COMMENCED] } }), SPEND);
  for (const month of months) {
    assert.equal(Object.isFrozen(month.notes), true, `${month.month}: the notes array is not frozen`);
    for (const note of month.notes) {
      assert.equal(Object.isFrozen(note), true);
      assert.equal('amount' in note, false, 'a note with an amount is a line wearing a note name');
      assert.equal('direction' in note, false);
      assert.equal('effect' in note, false);
      assert.equal(typeof note.note, 'string');
      assert.ok(note.note.length > 0, 'a nil with an empty note is the silence this array exists to end');
    }
    // The reconciliation is `lines` and nothing else — `openingBalance + Σcash === closingBalance`,
    // over a walk where every month carries four notes and most carry a fifth.
    const cash = month.lines.reduce(
      (total, l) => total + (l.effect !== 'cash' ? 0 : l.direction === 'inflow' ? l.amount : -l.amount),
      0,
    );
    assert.equal(month.openingBalance + cash, month.closingBalance, `${month.month} does not reconcile`);
  }
  // And the two arrays are disjoint by shape as well as by name: no line has a subject.
  assert.deepEqual(months.flatMap((m) => m.lines).filter((l) => 'subject' in l), []);
});
