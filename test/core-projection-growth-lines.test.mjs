// P4-4 — INVESTMENT GROWTH IS A LINE, and `MonthLine.effect` is what makes it one.
//
// This file owns the residual P4-1 chunk 5a DECLARED and named P4-4 by: every balance in the walk
// grew in silence, so a `Month` reported more `assessableAssets` than the sum of its own lines could
// explain. Chunk 5a asserted that absence in `core-projection-growth.test.mjs` so it would go red
// the day somebody closed it; it went red on 2026-09-18 and that assertion is now its opposite.
//
// Four things are defended here and nothing else:
//
//   1. the FIGURES — one line per Person per pool, at the month's movement and never the balance,
//      hand-worked from `(1 + r)^(1/12)` floored to the cent;
//   2. the CASH IDENTITY IS UNTOUCHED — `closingBalance` is the sum of the `cash` lines alone, to
//      the cent, and a walk's cash is byte-identical whether or not a wealth line sits beside it;
//   3. the WEALTH IDENTITY — what a month's wealth lines reconcile against, EXACTLY, with every
//      term named. ⚠️ The two-term form `Σwealth === Δ(protected + assessable)` is FALSE in 90 of
//      90 month transitions of the walk below, and section 3 is where the terms that break it are
//      written down and measured;
//   4. the SHAPE — frozen lines, a frozen array, a positive amount, and a direction that follows
//      the sign of the movement rather than being assumed upward.
import test from 'node:test';
import assert from 'node:assert/strict';

import { toCents } from '../dist/core/money.js';
import {
  GROWTH_LINE,
  INTERNAL_TRANSFER_LINES,
  PENSION_MINIMUM_LINE,
  PORTFOLIO_POOL,
  PORTFOLIO_SALE_LINE,
  NO_STATING_ENTRY,
  UNLEGISLATED,
  statedBy,
  project,
  superPoolName,
} from '../dist/core/projection.js';
import { splitAssets } from '../dist/core/household.js';

const person = (name, dateOfBirth, over = {}) => ({
  name,
  dateOfBirth,
  superInterests: [],
  parcels: [],
  employmentIncomePerFortnight: toCents(0),
  workBonusBalance: toCents(0),
  ...over,
});

const settings = (over = {}) => ({
  asAtDate: '2026-09-16',
  planningHorizonAge: 70,
  economicSeries: { cpi: 0.025, pblci: 0.025, awote: 0.035, mtawe: 0.035 },
  deemingRates: { lower: 0.0175, upper: 0.0375 },
  nominalReturn: 0.065,
  ...over,
});

const monthAt = (months, month) => months.find((m) => m.month === month);
const wealthLines = (month) => month.lines.filter((l) => l.effect === 'wealth');
const cashTotal = (month) =>
  month.lines.reduce((total, l) => total + (l.effect !== 'cash' ? 0 : l.direction === 'inflow' ? l.amount : -l.amount), 0);

// --- 1. THE FIGURES ------------------------------------------------------------------------------

/**
 * Pat is 66 and holds ONE pool: a $400,000 Account-Based Pension commenced 2020-07-01. The walk
 * begins 2026-09-16, so it never opens a 1 July and the year's Sch 7 minimum is never determined —
 * limb 2 draws nothing, and the balance moves for exactly one reason.
 */
const PAT = {
  persons: [person('Pat', '1960-05-10', { superInterests: [{ phase: 'accountBasedPension', balance: toCents(400_000), statedStreamSettings: { commencementDay: '2020-07-01' } }] })],
  homeStatus: 'occupied',
};

test('HAND-WORKED — one pool, one growth line, at the MOVEMENT and never the balance', () => {
  const months = project(settings(), PAT, []);

  //   MONTH 0, hand-worked:
  //     the monthly factor      (1.065)^(1/12)                  = 1.005261694277…
  //     the balance             $400,000.00                     = 40,000,000 cents
  //     grown, floored          ⌊40,000,000 × 1.005261694277⌋   = 40,210,467 cents
  //     THE MOVEMENT            40,210,467 − 40,000,000         =    210,467 cents = $2,104.67
  const growth = wealthLines(months[0]);
  assert.deepEqual(growth, [
    { direction: 'inflow', effect: 'wealth', description: 'Investment growth, Pat — Account-Based Pension', amount: 210_467, provenance: UNLEGISLATED.growth, attribution: NO_STATING_ENTRY.growth },
  ]);
  // **P5-3 limb 2: a growth line is the EMPTY-BUT-PRESENT case.** Nothing legislated stands behind
  // it — a Setting-supplied return applied to a stated balance — and the line says so rather than
  // omitting the field, which is what keeps "nobody said" and "the register said nothing" apart.
  assert.equal(growth[0].provenance.basis, 'none');
  assert.equal('provenance' in growth[0], true);
  assert.match(growth[0].provenance.note, /no register figure stands behind it/);
  // **The line is the MOVEMENT, not the pool.** $400,000 and $402,104.67 are the two figures a
  // mutation would reach for, and both are more than a hundred times the truth.
  assert.notEqual(growth[0].amount, toCents(400_000));
  assert.notEqual(growth[0].amount, 40_210_467);

  // **And it is the other half of one change**: the same 210,467 cents is the rise in the month's
  // own assets, read a month later, because a month is assessed on what it OPENS with.
  assert.equal(months[0].assessableAssets, toCents(400_000));
  assert.equal(monthAt(months, '2026-10').assessableAssets, 40_210_467);
  assert.equal(
    monthAt(months, '2026-10').assessableAssets - months[0].assessableAssets,
    growth[0].amount,
    'the line and the balance are two halves of one change',
  );

  // The names are the module's constants, and the pool name is `splitAssets`' own description for
  // the same money — so a growth line and the means-test line it moved can be read against each
  // other rather than eyeballed.
  assert.equal(GROWTH_LINE, 'Investment growth');
  assert.equal(growth[0].description, `${GROWTH_LINE}, Pat — ${superPoolName('accountBasedPension')}`);
  assert.deepEqual(
    splitAssets(PAT, '2026-09-16').lines.map((l) => l.description),
    [superPoolName('accountBasedPension')],
  );
});

/**
 * Two people and four pools between them: Pat's pension and her parcels, Sam's two super interests
 * in two different phases. Sam is 62, so his Accumulation super is PROTECTED by the younger-partner
 * exemption while his TTR is assessable — the two sides of the means-test split, both growing.
 */
const COUPLE = {
  persons: [
    person('Pat', '1960-05-10', {
      superInterests: [{ phase: 'accountBasedPension', balance: toCents(400_000), statedStreamSettings: { commencementDay: '2020-07-01' } }],
      parcels: [{ acquired: '2015-03-02', costBase: toCents(120_000), marketValue: toCents(300_000) }],
    }),
    person('Sam', '1964-03-02', {
      superInterests: [
        { phase: 'accumulation', balance: toCents(500_000) },
        { phase: 'ttr', balance: toCents(100_000) },
      ],
    }),
  ],
  homeStatus: 'occupied',
};

test('ONE LINE PER PERSON PER POOL — four pools, four lines, never a merged household figure', () => {
  const months = project(settings(), COUPLE, []);

  //   ⌊30,000,000 × 1.005261694277⌋ − 30,000,000 =  157,850 = $1,578.50   Pat's parcels
  //   ⌊40,000,000 × 1.005261694277⌋ − 40,000,000 =  210,467 = $2,104.67   Pat's pension
  //   ⌊50,000,000 × 1.005261694277⌋ − 50,000,000 =  263,084 = $2,630.84   Sam's accumulation
  //   ⌊10,000,000 × 1.005261694277⌋ − 10,000,000 =   52,616 =   $526.16   Sam's TTR
  assert.deepEqual(wealthLines(months[0]), [
    { direction: 'inflow', effect: 'wealth', description: 'Investment growth, Pat — Financial investments outside superannuation', amount: 157_850, provenance: UNLEGISLATED.growth, attribution: NO_STATING_ENTRY.growth },
    { direction: 'inflow', effect: 'wealth', description: 'Investment growth, Pat — Account-Based Pension', amount: 210_467, provenance: UNLEGISLATED.growth, attribution: NO_STATING_ENTRY.growth },
    { direction: 'inflow', effect: 'wealth', description: 'Investment growth, Sam — Superannuation, Accumulation Phase', amount: 263_084, provenance: UNLEGISLATED.growth, attribution: NO_STATING_ENTRY.growth },
    { direction: 'inflow', effect: 'wealth', description: 'Investment growth, Sam — Superannuation, TTR', amount: 52_616, provenance: UNLEGISLATED.growth, attribution: NO_STATING_ENTRY.growth },
  ]);
  assert.equal(PORTFOLIO_POOL, 'Financial investments outside superannuation');

  // ⚠️ **NOT the merged figure, and the difference is not cosmetic.** $6,840.17 of growth in one
  // line could not be audited against any balance the `Month` reports, and it would cross the
  // means-test split: $2,630.84 of it is Sam's exempt Accumulation super, which `protectedAssets`
  // carries, and the other $4,209.33 is assessable. A single line cannot say which.
  assert.equal(157_850 + 210_467 + 263_084 + 52_616, 684_017);
  assert.equal(wealthLines(months[0]).length, 4);
  assert.deepEqual(wealthLines(months[0]).filter((l) => l.amount === 684_017), []);
  assert.equal(monthAt(months, '2026-10').protectedAssets - months[0].protectedAssets, 263_084);
  assert.equal(monthAt(months, '2026-10').assessableAssets - months[0].assessableAssets, 157_850 + 210_467 + 52_616);

  // A pool that does not move emits NO line: `MonthLine.amount` is always positive, and a nil month
  // is a fact about the balance rather than a movement of nothing. $1.90 at this rate gains under a
  // cent and is floored to a standstill — the degenerate case `grownForOneMonth`'s doc names.
  const tiny = {
    persons: [person('Tiny', '1960-05-10', { superInterests: [{ phase: 'accumulation', balance: toCents(1.9) }] })],
    homeStatus: 'occupied',
  };
  const tinyMonths = project(settings(), tiny, []);
  assert.deepEqual(wealthLines(tinyMonths[0]), []);
  // The money is there and it simply did not move: Tiny is 66, so the younger-partner exemption puts
  // the balance in `protectedAssets`, and it is the same $1.90 in month 0 and in month 1.
  assert.equal(tinyMonths[0].protectedAssets, toCents(1.9));
  assert.equal(tinyMonths[1].protectedAssets, toCents(1.9));
});

test('the DIRECTION follows the sign: a negative return is an OUTFLOW of wealth', () => {
  // `monthlyGrowthFactor` admits any rate above −1, so a fall is reachable from a Setting a user can
  // state today and the direction is not assumed upward.
  //   (0.90)^(1/12) = 0.991258389045…
  //   ⌊30,000,000 × 0.991258389045⌋ − 30,000,000 = 29,737,751 − 30,000,000 = −262,249
  const falling = project(settings({ nominalReturn: -0.1 }), {
    persons: [person('Pat', '1960-05-10', { parcels: [{ acquired: '2015-03-02', costBase: toCents(120_000), marketValue: toCents(300_000) }] })],
    homeStatus: 'occupied',
  }, []);
  assert.deepEqual(wealthLines(falling[0]), [
    { direction: 'outflow', effect: 'wealth', description: `${GROWTH_LINE}, Pat — ${PORTFOLIO_POOL}`, amount: 262_249, provenance: UNLEGISLATED.growth, attribution: NO_STATING_ENTRY.growth },
  ]);
  // The amount is POSITIVE and the direction carries the sign — the rule `MonthLine` states.
  assert.ok(wealthLines(falling[0])[0].amount > 0);
  assert.equal(monthAt(falling, '2026-10').assessableAssets, 29_737_751);
});

test('the SHAPE: every line is frozen, the array is frozen, and `effect` is on every line', () => {
  const months = project(settings(), COUPLE, []);
  for (const month of months) {
    assert.ok(Object.isFrozen(month.lines), `${month.month} lines array is not frozen`);
    for (const line of month.lines) {
      assert.ok(Object.isFrozen(line), `${month.month} ${line.description} is not frozen`);
      assert.ok(line.effect === 'cash' || line.effect === 'wealth', `${line.description} has no effect`);
      assert.ok(line.amount > 0, `${line.description} is not positive`);
      assert.ok(line.direction === 'inflow' || line.direction === 'outflow');
    }
  }
  // Frozen means frozen: the caller cannot restate a line after the walk has reconciled it.
  assert.throws(() => {
    months[0].lines[0].effect = 'cash';
  }, TypeError);
});

// --- 2. THE CASH IDENTITY IS UNTOUCHED -----------------------------------------------------------

test('a WEALTH line reaches no cash figure — the identity `opening + Σcash = closing` is exact', () => {
  const spend = {
    id: 'sc',
    date: '2026-09-01',
    owner: 'household',
    type: 'SPEND_CHANGE',
    params: { annualSpend: toCents(48_000.01) },
    enabled: true,
    createdAt: '2026-06-01',
  };
  const months = project(settings(), COUPLE, [spend]);
  for (const month of months) {
    assert.equal(month.openingBalance + cashTotal(month), month.closingBalance, month.month);
  }

  // ⚠️ **AND THE PAIR THAT MAKES THAT MEAN SOMETHING.** Summing EVERY line — the mutation
  // `cashMovement` exists to prevent — gives a different, larger figure in every month of this
  // walk. If the two agreed, the filter would be untested and a growth line counted as cash would
  // pass unnoticed while the household spent a gain it has not realised.
  const everyLine = (month) =>
    month.lines.reduce((t, l) => t + (l.direction === 'inflow' ? l.amount : -l.amount), month.openingBalance);
  assert.equal(months.filter((m) => everyLine(m) === m.closingBalance).length, 0);
  assert.ok(everyLine(months[0]) - months[0].closingBalance > toCents(6_000));

  // **The cash of the walk is byte-identical to the same walk with nothing to grow.** A nil return
  // removes every wealth line; every cash figure of the two walks agrees to the cent, which is the
  // strongest statement of "growth reached no cashflow" available without re-running the old build.
  const still = project(settings({ nominalReturn: 0 }), COUPLE, [spend]);
  assert.deepEqual(still.flatMap((m) => wealthLines(m)), []);
  assert.equal(
    JSON.stringify(months.map((m) => [m.openingBalance, m.closingBalance])),
    JSON.stringify(still.map((m) => [m.openingBalance, m.closingBalance])),
  );
  // Not vacuous — the two walks' ASSETS diverge from the second month, so the fixture really does
  // grow and the equality above is about cash rather than about an inert Household.
  assert.notEqual(
    JSON.stringify(months.map((m) => m.assessableAssets)),
    JSON.stringify(still.map((m) => m.assessableAssets)),
  );
});

// --- 3. THE WEALTH IDENTITY, AND THE TERMS THAT BREAK THE TWO-TERM FORM ---------------------------
//
// ⚠️ **`Σ(wealth lines in m) === Δ(protectedAssets + assessableAssets)` IS FALSE, and it is false
// for a reason that has nothing to do with growth.** `protected + assessable` is the Household's
// TOTAL WEALTH — parcels at market value, every super balance, and the Offset Account — so it moves
// whenever money enters or leaves the Household, not only when a balance grows. A month that
// receives an Age Pension and pays for groceries has moved its wealth with no wealth line in sight.
//
// The exact identity, with every term named and each one already reported by the `Month`:
//
//     Δ(protected + assessable)  =  Σ wealth lines
//                                +  Δ offset                       (closingBalance − openingBalance)
//                                −  Σ internal transfers           (see below)
//
// An INTERNAL TRANSFER is a cash line that moves money between two of the Household's own pools —
// `INTERNAL_TRANSFER_LINES`, exported by `projection.ts` as the single source of truth (P4-13):
// `PENSION_MINIMUM_LINE` (super → cash), `PORTFOLIO_SALE_LINE` (parcels → cash),
// `PORTFOLIO_PURCHASE_LINE` (cash → parcels) and `SUPER_LUMP_SUM_LINE` (super → cash). Each of them
// changes `Δ offset` and changes a pool by the same amount in the other direction, so total wealth
// does not move — which is why they must be subtracted back out of `Δ offset` rather than left in it.
//
// ⚠️ **THE IDENTITY HAD A FOURTH TERM UNTIL P4-4's POLISH (2026-09-18), AND IT IS RETIRED RATHER
// THAN FORGOTTEN.** It read, word for word:
//
//     …                          −  incidental costs of acquisition
//
// with the note *"the last term is the only one that is NOT reconstructable from a `Month`: a
// purchase line carries the GROSS cash (`funded`), while the parcel it creates is worth
// `funded − incidentalCosts`, so brokerage is wealth that left the Household with no line of its
// own. Itemising it is out of P4-4's scope."* It is no longer out of scope: the fee has
// `PORTFOLIO_BROKERAGE_LINE`, the purchase line is NET of it, and the arithmetic closes without the
// term being STATED anywhere.
//
// **Why the fourth term VANISHES rather than moving to the other side.** Brokerage is an EXTERNAL
// cash outflow — money that leaves the Household and buys nothing — so it is inside `Δ offset` and
// outside `Σ internal transfers`, where it belongs. The purchase line, which used to carry the fee
// as well as the units, now carries the units alone; so `Σ internal transfers` is larger by exactly
// the fee, which is exactly the term that used to sit beside it. One line moved the fee from a
// number this file had to be TOLD by the fixture into a number the `Month` REPORTS.
//
// **Every term is now reconstructable from a `Month` alone**, which is what makes the identity a
// property of the output rather than of this test's knowledge of the fixture: nothing below reads
// `RECONCILE_ENTRIES` for a figure.
//
// Measured on the walk below (90 transitions): the two-term form fails **90** times; the three-term
// identity above fails **0**.

const INTERNAL = new RegExp(`^(${INTERNAL_TRANSFER_LINES.join('|')})`);

/**
 * The same couple with cash in the bank, so that section 3's stated buy can actually be funded.
 *
 * ⚠️ **AND A HOME LOAN THAT CASH IS OFFSETTING, since "spend cash first" (2026-09-23).** Cash that
 * is NOT offsetting a loan is now spent straight after the pension's minimum, so the $60,000 was
 * gone by 2028-03 ($286.66 left) and the stated $20,000 buy could not be funded — the walk lost its
 * purchase and its brokerage line, which are what this section is about. A $100,000 loan at nil
 * interest, repaid $100 a month, keeps every dollar of the $60,000 offsetting it, and offsetting cash
 * is still spent after the portfolio and the rest of the pension: the cash is exactly $60,000 on the
 * day of the buy, as it was before. The loan adds one external cash outflow a month (the $100
 * principal) and no term to the identity — it is inside `Δ offset`, where money leaving belongs.
 */
const FUNDED_COUPLE = {
  ...COUPLE,
  openingOffsetBalance: toCents(60_000),
  mortgage: { openingBalance: toCents(100_000), annualInterestRate: 0, monthlyRepayment: toCents(100) },
};

const BROKERAGE = toCents(30);
const RECONCILE_ENTRIES = [
  { id: 'sc', date: '2026-09-01', owner: 'household', type: 'SPEND_CHANGE', params: { annualSpend: toCents(72_000) }, enabled: true, createdAt: '2026-06-01' },
  { id: 'roof', date: '2029-05-01', owner: 'household', type: 'ONE_OFF_EXPENSE', params: { amount: toCents(30_000) }, enabled: true, createdAt: '2026-06-01' },
  {
    id: 'buy',
    date: '2028-03-01',
    owner: 'personA',
    type: 'NON_SUPER_INVESTMENT',
    params: { direction: 'buy', amount: toCents(20_000), incidentalCostsOfAcquisition: BROKERAGE },
    enabled: true,
    createdAt: '2026-06-01',
  },
];

test('THE WEALTH IDENTITY — exact, in every month, with every term named', () => {
  const months = project(settings(), FUNDED_COUPLE, RECONCILE_ENTRIES);
  const signed = (month, predicate) =>
    month.lines.filter(predicate).reduce((t, l) => t + (l.direction === 'inflow' ? l.amount : -l.amount), 0);

  let twoTermFailures = 0;
  for (let index = 0; index + 1 < months.length; index += 1) {
    const month = months[index];
    const next = months[index + 1];
    const wealth = signed(month, (l) => l.effect === 'wealth');
    const delta = next.protectedAssets + next.assessableAssets - (month.protectedAssets + month.assessableAssets);
    const internal = signed(month, (l) => l.effect === 'cash' && INTERNAL.test(l.description));
    // ⚠️ **NO FOURTH TERM, AND NOTHING FROM THE FIXTURE.** Until P4-4's polish this line stood here:
    //
    //     const brokerage = month.lines.some((l) => l.description.startsWith(
    //       'Non-Super Portfolio purchase')) ? BROKERAGE : 0;
    //
    // — the fee read off `RECONCILE_ENTRIES`, because no `Month` could supply it. It can now, and it
    // does not need to be supplied at all: the fee is an external cash outflow inside `Δ offset`,
    // and the purchase line it used to hide inside is net of it. `BROKERAGE` is not read here.
    assert.equal(
      wealth,
      delta - (month.closingBalance - month.openingBalance) + internal,
      `${month.month} does not reconcile`,
    );
    if (wealth !== delta) twoTermFailures += 1;
  }

  // **The measurement, pinned rather than described.** Every transition of this walk breaks the
  // two-term form; none breaks the identity above. A build in which the two-term form started
  // passing would mean total wealth had stopped tracking the Household's cash.
  assert.equal(months.length, 91);
  assert.equal(twoTermFailures, 90);

  // And the fixture really does exercise all three terms, so the reconciliation above is not passing
  // because two of them are always nil.
  assert.ok(months.some((m) => m.lines.some((l) => l.description.startsWith(PENSION_MINIMUM_LINE))));
  assert.ok(months.some((m) => m.lines.some((l) => l.description.startsWith(PORTFOLIO_SALE_LINE))));
  assert.ok(months.some((m) => m.lines.some((l) => l.description.startsWith('Non-Super Portfolio purchase'))));
  assert.ok(months.some((m) => m.closingBalance !== m.openingBalance));
  // **And the RETIRED term is exercised too, which is the part that would otherwise pass vacuously.**
  // A walk with no fee in it would reconcile on three terms whether or not the fee had been itemised.
  // This one pays $30.00, in one month, on a line of its own — so the three-term form is being
  // asserted against the case that used to need a fourth.
  const fees = months.flatMap((m) => m.lines.filter((l) => l.description.startsWith('Non-Super Portfolio brokerage')));
  assert.equal(fees.length, 1);
  assert.equal(fees[0].amount, BROKERAGE);
  assert.equal(INTERNAL.test(fees[0].description), false, 'the fee is EXTERNAL: it leaves the Household and buys nothing');

  // ⚠️ **AND THE IDENTITY SURVIVED P10-4 WITHOUT GAINING A FOURTH TERM (2026-09-21), which is the
  // question that change had to answer here.** Limb 3 now sells MORE than the month is short — it
  // grosses its draw up for the capital gains tax that sale causes — so both an internal transfer
  // (the sale) and an external outflow (the tax) are larger in every month a parcel goes. Neither is
  // a new term: the sale is already in `INTERNAL` and the tax is already inside `Δ offset`, where an
  // amount that leaves the Household belongs. The three-term form above is asserted over every one
  // of this walk's 90 transitions, and this is the assertion that says the grossed-up case is among
  // them rather than absent.
  const grossedUp = months.filter(
    (m) =>
      m.lines.some((l) => l.description.startsWith(PORTFOLIO_SALE_LINE)) &&
      m.lines.some((l) => l.description.startsWith('Income tax on capital gain')),
  );
  assert.ok(grossedUp.length > 0, 'no month of this walk both sells and is charged: the P10-4 case is not covered here');
  for (const month of grossedUp) {
    const proceeds = month.lines.filter((l) => l.description.startsWith(PORTFOLIO_SALE_LINE)).reduce((t, l) => t + l.amount, 0);
    const tax = month.lines.filter((l) => l.description.startsWith('Income tax on capital gain')).reduce((t, l) => t + l.amount, 0);
    const drawn = month.notes.find((n) => n.subject === 'waterfall limb' && n.limb === 'nonSuperPortfolio').drawn;
    assert.ok(tax > 0);
    assert.equal(proceeds - tax, drawn, `${month.month}: the sale did not fund its own tax`);
  }
});

test('THE BROKERAGE TERM IS RETIRED — the $30 now has a line of its own, and the cash did not move', () => {
  // ⚠️ **REWRITTEN, NOT DELETED (P4-4's polish, 2026-09-18).** This test used to be called
  // *"THE BROKERAGE TERM IS REAL — $30 of wealth leaves with no line of its own"*, and its closing
  // assertion was a canary written to go red on this very day:
  //
  //     assert.deepEqual(monthAt(charged, '2028-03').lines.filter((l) => l.amount === BROKERAGE), [],
  //       'if brokerage ever gets a line of its own, the wealth identity above loses its fourth term');
  //
  // It went red. The canary is not deleted and it is not inverted into a bare `notEqual`: it asserts
  // the NEW state — exactly one line, at the fee, named for the Person who paid it — so a build that
  // dropped the line again would fail here rather than silently restore the old hole.
  //
  // **What the $30 does now.** The purchase line carries the UNITS ($20,000) and the fee is its own
  // outflow ($30); the two sum to the `funded` figure the single line used to carry ($20,030), so
  // the CASH is identical to the cent and only the breakdown changed.
  const free = RECONCILE_ENTRIES.map((e) =>
    e.id === 'buy' ? { ...e, params: { ...e.params, incidentalCostsOfAcquisition: toCents(0) } } : e,
  );
  const charged = project(settings(), FUNDED_COUPLE, RECONCILE_ENTRIES);
  const uncharged = project(settings(), FUNDED_COUPLE, free);
  const amountOf = (months, month) =>
    monthAt(months, month).lines.filter((l) => l.description.startsWith('Non-Super Portfolio purchase')).map((l) => l.amount);
  // ⚠️ **AND THIS PAIR MOVED, by the fee and by nothing else.** It read `[2_003_000]` and
  // `[2_000_000]` — the gross against the net — and both walks now report the units alone, so the
  // two are EQUAL and the difference between them has moved onto the brokerage line below.
  assert.deepEqual(amountOf(charged, '2028-03'), [2_000_000]);
  assert.deepEqual(amountOf(uncharged, '2028-03'), [2_000_000]);
  // The premise the loan is there for: every dollar of the $60,000 was still offsetting it on the day.
  assert.equal(monthAt(charged, '2028-03').openingBalance, toCents(60_000));

  // THE CANARY, ASSERTING THE NEW STATE. One line, at $30.00, named for Pat — and none at all in the
  // walk that stated no fee, because `MonthLine.amount` is always positive and a nil fee is a fact
  // about the trade rather than a payment of nothing.
  const feeLines = (months, month) =>
    monthAt(months, month).lines.filter((l) => l.description.startsWith('Non-Super Portfolio brokerage'));
  assert.deepEqual(feeLines(charged, '2028-03'), [
    { direction: 'outflow', effect: 'cash', description: 'Non-Super Portfolio brokerage, Pat', amount: 3_000, provenance: UNLEGISLATED.brokerage, attribution: statedBy('buy') },
  ]);
  assert.equal(3_000, BROKERAGE, 'and $30.00 is the fee the entry stated');
  assert.deepEqual(feeLines(uncharged, '2028-03'), []);
  // The two outflows sum to the one the single line used to carry, which is the whole claim that no
  // cash moved: $20,000.00 of units + $30.00 of fee = $20,030.00.
  assert.equal(2_000_000 + 3_000, 2_003_000);

  // The cash is $30 lower for the rest of the walk, exactly as before — this pass changed the
  // BREAKDOWN and not a cent of the money.
  assert.equal(monthAt(uncharged, '2028-03').closingBalance - monthAt(charged, '2028-03').closingBalance, BROKERAGE);
  // …the parcels are identical, to the cent, in the month after the buy…
  const parcelsAt = (months, month) =>
    monthAt(months, month).assessableAssets - monthAt(months, month).openingBalance;
  assert.equal(parcelsAt(uncharged, '2028-04'), parcelsAt(charged, '2028-04'));
  // …so TOTAL WEALTH still differs by exactly the fee — and a line of the charged walk now accounts
  // for it, which is the sentence this test was written to be unable to say.
  const wealthAt = (months, month) => monthAt(months, month).protectedAssets + monthAt(months, month).assessableAssets;
  assert.equal(wealthAt(uncharged, '2028-04') - wealthAt(charged, '2028-04'), BROKERAGE);
  assert.equal(
    monthAt(charged, '2028-03').lines.filter((l) => l.amount === BROKERAGE).length,
    1,
    'the fee must have exactly one line: none is the old hole, two is a double charge',
  );
});
