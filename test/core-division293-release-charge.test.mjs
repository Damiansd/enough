// P6-10 M3 — THE SUBDIV 293-B ELECTION IS PERFORMED. The last flattering gap in this feature, and
// the only chunk of P6-10 that moves money (register O84).
//
// M1 gave a `SuperInterest` a field to be named in. M2 gave the walk a resolver that reads it and
// NEVER derives an election from silence. Neither moved a cent. **This is where the money moves**:
// at the year-end settlement, an electing Person has every cent of the year's Division 293 cash
// accrual REFUNDED, and the year's assessed liability debited to the one interest they nominated.
//
// **What is defended here.**
//
//   1. **THE PAIR OF MOVEMENTS, AND THE CONSERVATION BETWEEN THEM.** The refund is `cash` and the
//      release is `wealth`, and their sum over the Household is nil at the instant: cash up by
//      exactly what superannuation is down by. A release that also took the money out of cash — or
//      that never refunded the accrual — would make the Person pay twice, and the total is what
//      catches it.
//   2. **`effect: 'wealth'`, so THE WATERFALL CANNOT REACH IT.** A `cash` release line would put a
//      year's liability into the Offset Account and let the Household spend it on groceries while
//      the fund was also debited. Every month of the electing walk reconciles — opening plus every
//      cash movement equals closing — with the wealth line in it.
//   3. **THE NOMINATED SLOT AND NO OTHER**, proved by a Household in which any other slot is too
//      small to meet the liability, so a debit to the wrong one cannot pass silently.
//   4. **ALL-OR-NOTHING: `Division293ReleaseInsufficientBalanceError`, by name.** Partial payment
//      and a second authority on a second fund are both things the law provides for and neither
//      rule is retrieved in this build, so a fund that cannot pay is a STOP.
//   5. **THE AGE PENSION MOVES, AND IT IS THE POINT.** For a payer below Age Pension age the
//      accumulation interest is means-test EXEMPT and the Offset cash is assessed from the first
//      dollar, so taking the charge out of the fund raises the Household's assessable assets by
//      exactly the liability — and the older partner's pension falls. That is O84's direction,
//      measured rather than asserted.
//   6. **BOTH RESIDUALS ARE NAMED IN THE SOURCE**: the partial financial year that never reaches a
//      settlement, and the July timing of a release a real ATO notice would deliver months later.
//
// Every figure is hand-derived from the mechanism and stated as arithmetic before it is asserted.
// The one thing taken from a walk rather than derived is a CONTROL BALANCE — the same Household
// without the election — against which a DELTA is predicted. That is the point of the pairing: the
// control is HEAD's own behaviour, and P6-10 M3 was proved to leave every existing fixture
// byte-identical before this file was written.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { toCents } from '../dist/core/money.js';
import {
  DIVISION_293_LINE,
  DIVISION_293_RELEASE_LINE,
  DIVISION_293_RELEASE_REFUND_LINE,
  DIVISION_293_TRUE_UP_LINE,
  project,
} from '../dist/core/projection.js';
import { Division293ReleaseInsufficientBalanceError } from '../dist/core/division293Release.js';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

/**
 * **One month of `Settings.nominalReturn`, RE-DERIVED here and not imported.** `projection.ts`
 * documents the convention as `(1 + r)^(1/12)` with the cents FLOORED, and this file restates it so
 * that a balance predicted below is predicted from the stated mechanism rather than from the
 * function that applies it.
 */
const grown = (balance, nominalReturn) => Math.floor(balance * (1 + nominalReturn) ** (1 / 12));

const SETTINGS = (over = {}) => ({
  asAtDate: '2026-07-01',
  planningHorizonAge: 52,
  // Pay rising with wages (2026-09-23) is not this fixture's subject: `awote: 0` holds every salary at the figure stated. A proved control: every figure this file asserts is the same at nil on the build before pay rose.
  economicSeries: { cpi: 0.025, pblci: 0.025, awote: 0, mtawe: 0.035 },
  deemingRates: { lower: 0.0175, upper: 0.0375 },
  nominalReturn: 0.065,
  // Interest on cash (2026-09-23) is not this fixture's subject: stated nil, the control proved byte-identical to the walk before it existed.
  cashInterestRate: 0,
  ...over,
});

const ELECTS = { statedReleaseAuthorityDestination: 'division293' };

/**
 * **Val: $10,000 a fortnight, one accumulation interest, and she stops work on 1 July 2027.**
 *
 * SYNTHETIC AND LABELLED AS SUCH — round test numbers, not anyone's Household. She is born in 1976
 * so that she is FIFTY-ONE in the month the release lands: below Age Pension age, which is the only
 * state in which the two pockets are assessed differently and therefore the only state in which
 * this election changes a means test (`DIVISION_293_LINE`'s own doc says so).
 */
const val = (interestOver = {}, personOver = {}) => ({
  name: 'Val',
  dateOfBirth: '1976-05-10',
  superInterests: [{ phase: 'accumulation', balance: toCents(300_000), ...interestOver }],
  parcels: [],
  employmentIncomePerFortnight: toCents(10_000),
  workBonusBalance: toCents(0),
  ...personOver,
});

const STOPS_WORKING = {
  id: 'stop',
  date: '2027-07-01',
  owner: 'personA',
  type: 'WORK_PATTERN_CHANGE',
  params: { daysPerWeek: 0, annualSalary: toCents(0) },
  enabled: true,
  createdAt: '2026-01-01',
};
const SPEND = {
  id: 'spend',
  date: '2026-07-01',
  owner: 'household',
  type: 'SPEND_CHANGE',
  params: { annualSpend: toCents(60_000) },
  enabled: true,
  createdAt: '2026-01-01',
};
const ENTRIES = [SPEND, STOPS_WORKING];

const monthAt = (months, month) => months.find((m) => m.month === month);
const div293LinesIn = (month) => month.lines.filter((line) => line.description.startsWith(DIVISION_293_LINE));
const bare = ({ provenance, attribution, ...line }) => line;

// ⚠️ **THE PREFIX TRAP, NOW FOUR DEEP.** `DIVISION_293_TRUE_UP_LINE` already starts with
// `DIVISION_293_LINE`, and both of M3's new names do too. A consumer filtering by prefix now counts
// a refund and a release as accruals of the year they settle, on top of the settlement itself.
// Stated as an executable fact so that the trap is documented where the names are, and so that
// making the names independent tells this file.
test('both new line names start with the accrual line, which is the prefix trap one level deeper', () => {
  assert.ok(DIVISION_293_RELEASE_LINE.startsWith(DIVISION_293_LINE));
  assert.ok(DIVISION_293_RELEASE_REFUND_LINE.startsWith(DIVISION_293_LINE));
  assert.notEqual(DIVISION_293_RELEASE_LINE, DIVISION_293_RELEASE_REFUND_LINE);
  // And neither collides with the cash settlement, which they REPLACE rather than accompany.
  assert.ok(!DIVISION_293_RELEASE_LINE.startsWith(DIVISION_293_TRUE_UP_LINE));
  assert.ok(!DIVISION_293_RELEASE_REFUND_LINE.startsWith(DIVISION_293_TRUE_UP_LINE));
});

// --- §1 THE MONEY MOVES, AND IT MOVES OUT OF THE FUND --------------------------------------------
//
// HAND-DERIVED, every figure from a mechanism named beside it. The accrual half is P6-9 chunk 3's
// arithmetic re-derived, not re-pasted:
//
//   salary                     $10,000 a fortnight x 26          = $260,000.00
//   s 293-20(1)(a) base        $260,000 - $1,000 work deduction  = $259,000.00
//   Superannuation Guarantee   12% of $260,000, below SGAA
//                              s 10A(5)'s maximum contributions
//                              base                              =  $31,200.00
//   s 293-20(1) sum                                              = $290,200.00
//   excess over $250,000                                         =  $40,200.00
//   taxable contributions      min($31,200, $40,200)             =  $31,200.00  <- contributions
//   Division 293 tax           15% of $31,200                    =   $4,680.00 a year
//   monthly accrual            $4,680 / 12                       =     $390.00
//   accrued over FY2026-27     12 x $390.00                      =   $4,680.00
//
//   the year's OWN assessment, which is what a release authority can name:
//   year's assessable salary   12 x $21,666.67 (monthlyFromAnnual
//                              rounds each twelfth to the cent)  = $260,000.04
//   base                       less $1,000                       = $259,000.04
//   year's Guarantee           12 x $2,600.00                    =  $31,200.00
//   sum                                                          = $290,200.04
//   excess                                                       =  $40,200.04
//   taxable contributions      min of the two                    =  $31,200.00  <- contributions
//   settled liability          15% of $31,200                    =   $4,680.00
//
// So the CONTROL Household — the same Val, electing nothing — has a settlement gap of exactly nil
// and no `DIVISION_293_TRUE_UP_LINE` at all (the one-dollar de-minimis is not even reached). The
// ELECTING Household has TWO lines in the same July, for the same $4,680.00, in opposite pockets.
const SOLO = (interestOver) => ({ persons: [val(interestOver)], homeStatus: 'occupied' });

test('the election refunds the whole accrual in cash and takes the whole liability out of the fund', () => {
  const control = project(SETTINGS(), SOLO({}), ENTRIES);
  const elected = project(SETTINGS(), SOLO(ELECTS), ENTRIES);

  // **Nothing before the settlement moves at all**, which is the claim that the monthly accrual is
  // untouched for everybody. Byte-for-byte, twelve months of it.
  for (const month of control.filter((m) => m.month < '2027-07')) {
    assert.deepEqual(
      JSON.parse(JSON.stringify(monthAt(elected, month.month))),
      JSON.parse(JSON.stringify(month)),
      `${month.month} moved, and the monthly accrual is supposed to be cash for every Person`,
    );
  }
  // And it really did accrue: twelve $390.00 lines, $4,680.00, in both walks alike.
  const accruals = elected
    .flatMap((m) => m.lines)
    .filter((line) => line.description === `${DIVISION_293_LINE}, Val`);
  assert.equal(accruals.length, 12);
  assert.deepEqual([...new Set(accruals.map((line) => line.amount))], [toCents(390)]);
  assert.equal(accruals.reduce((total, line) => total + line.amount, 0), toCents(4_680));

  // THE CONTROL: a flat year settles to nil, so there is no settlement line of any kind.
  assert.deepEqual(
    control.flatMap((m) => div293LinesIn(m)).filter((line) => line.description !== `${DIVISION_293_LINE}, Val`),
    [],
  );

  // THE ELECTION: two lines, in one month, once.
  const july = monthAt(elected, '2027-07');
  assert.deepEqual(div293LinesIn(july).map(bare), [
    {
      direction: 'inflow',
      effect: 'cash',
      description: 'Division 293 tax accrual refunded on release, Val, 2026-27',
      amount: toCents(4_680),
    },
    {
      direction: 'outflow',
      effect: 'wealth',
      description: 'Division 293 tax released from superannuation, Val, 2026-27',
      amount: toCents(4_680),
    },
  ]);
  // **And NO cash true-up beside them.** The gap that line reports is the residual of a cash
  // settlement, and for this Person the cash settlement has just been reversed in full.
  assert.deepEqual(
    elected.flatMap((m) => m.lines).filter((line) => line.description.startsWith(DIVISION_293_TRUE_UP_LINE)),
    [],
  );
  // The stamp is the year that ENDED, not the July it lands in.
  assert.deepEqual(
    div293LinesIn(july).map((line) => line.provenance.fy),
    ['2026-27', '2026-27'],
  );
});

test('the cash is up by exactly what the superannuation is down by — the conservation check', () => {
  const control = project(SETTINGS(), SOLO({}), ENTRIES);
  const elected = project(SETTINGS(), SOLO(ELECTS), ENTRIES);

  // PREDICTED. The refund lands in July 2027 and nothing else in that month changes, so July closes
  // $4,680.00 richer in cash. The debit is written back at the END of that tick — after the growth,
  // on the contribution-credit convention — so it is AUGUST's opening position that is short.
  const julyControl = monthAt(control, '2027-07');
  const julyElected = monthAt(elected, '2027-07');
  assert.equal(julyElected.closingBalance - julyControl.closingBalance, toCents(4_680));
  // July's own means-test figures are the OPENING position (ADR-0005), so they cannot have moved:
  // the release happened inside the month they are read at the start of.
  assert.equal(julyElected.protectedAssets, julyControl.protectedAssets);
  assert.equal(julyElected.assessableAssets, julyControl.assessableAssets);

  const augControl = monthAt(control, '2027-08');
  const augElected = monthAt(elected, '2027-08');
  // Val is 51: her accumulation interest is means-test EXEMPT and the Offset is assessed from the
  // first dollar, so the release moves $4,680.00 across the split — out of `protectedAssets` and
  // into `assessableAssets`.
  assert.equal(augElected.protectedAssets - augControl.protectedAssets, -toCents(4_680));
  assert.equal(augElected.assessableAssets - augControl.assessableAssets, toCents(4_680));
  // **AND THE TOTAL IS UNCHANGED TO THE CENT.** This is the line that goes red if the release is
  // ever taken from cash AS WELL as from the fund, or if the accrual is not refunded: money would
  // have been destroyed, and no single-pocket assertion would say so.
  assert.equal(
    augElected.protectedAssets + augElected.assessableAssets,
    augControl.protectedAssets + augControl.assessableAssets,
  );
});

test('the debited balance goes on compounding as a smaller balance — the fund really lost it', () => {
  const control = project(SETTINGS(), SOLO({}), ENTRIES);
  const elected = project(SETTINGS(), SOLO(ELECTS), ENTRIES);

  // Val stopped work on 1 July 2027, so from August her interest receives nothing and does nothing
  // but grow. September's opening balance is therefore August's, grown one month — and the
  // PREDICTION is made from the CONTROL's own August figure through the documented mechanism,
  // `floor(balance x (1 + r)^(1/12))`, applied to each of the two balances separately.
  const augustControl = monthAt(control, '2027-08').protectedAssets;
  const augustElected = augustControl - toCents(4_680);
  const predictedSeptemberControl = grown(augustControl, 0.065);
  const predictedSeptemberElected = grown(augustElected, 0.065);

  assert.equal(monthAt(control, '2027-09').protectedAssets, predictedSeptemberControl);
  assert.equal(monthAt(elected, '2027-09').protectedAssets, predictedSeptemberElected);
  // The gap WIDENS, because the money that left is money that is no longer earning. That is the
  // whole economic content of the election on this side of it.
  assert.ok(
    predictedSeptemberControl - predictedSeptemberElected > toCents(4_680),
    'the released amount is not compounding away, so the debit is not really in the balance',
  );
});

test('the release line is WEALTH: every month of the electing walk still reconciles', () => {
  const elected = project(SETTINGS(), SOLO(ELECTS), ENTRIES);
  // `cashMovement`'s own rule, restated: only `effect === 'cash'` moves the Offset. A release line
  // written as `'cash'` would make July close $4,680.00 higher again — the fund debited AND the
  // money spendable, which is the same money twice.
  for (const month of elected) {
    const closing = month.lines.reduce(
      (balance, line) => balance + (line.effect !== 'cash' ? 0 : line.direction === 'inflow' ? line.amount : -line.amount),
      month.openingBalance,
    );
    assert.equal(closing, month.closingBalance, `${month.month} does not reconcile`);
  }
  const july = monthAt(elected, '2027-07');
  assert.equal(july.lines.filter((line) => line.description.startsWith(DIVISION_293_RELEASE_LINE))[0].effect, 'wealth');
});

test('the determinations say which pocket paid, on BOTH sides of the election', () => {
  const elected = project(SETTINGS(), SOLO(ELECTS), ENTRIES);
  const control = project(SETTINGS(), SOLO({}), ENTRIES);
  const july = monthAt(elected, '2027-07');
  const [refund, release] = div293LinesIn(july);

  assert.match(refund.provenance.determination.join(' '), /refunded in full/);
  assert.match(refund.provenance.determination.join(' '), /released from superannuation interest 0/);
  assert.match(release.provenance.determination.join(' '), /PAID BY THE FUND/);
  assert.match(release.provenance.determination.join(' '), /superannuation interest 0/);
  // **THE TIMING RESIDUAL, ON THE LINE ITSELF** — a real release follows the Commissioner's notice
  // months later, so this build anticipates it and the fund loses that compounding.
  assert.match(release.provenance.determination.join(' '), /anticipates it and denies the fund those months' compounding/);

  // And the monthly accrual now describes itself as PROVISIONAL, because it is: it is taken in cash
  // from every Person and reversed for an electing one. The sentence that stood here until P6-10 M3
  // said the Subdiv 293-B election was NOT MODELLED, and that is no longer true.
  const accrual = control.flatMap((m) => m.lines).find((line) => line.description === `${DIVISION_293_LINE}, Val`);
  const determination = accrual.provenance.determination.join(' ');
  assert.match(determination, /PROVISIONAL FOR EVERY PERSON/);
  assert.doesNotMatch(determination, /is NOT modelled \(register O84\)/);
  // **THE PARTIAL-YEAR RESIDUAL, NAMED ON THE LINE.** A first or last part-year never reaches a
  // settlement, so an electing Person's accrual there is never corrected and stands as cash.
  assert.match(determination, /FIRST or LAST PARTIAL financial year there is no settlement/);
});

test('a Person who elected NOTHING is told so in the words the resolver chose, not by silence', () => {
  // The cash settlement's determination used to assert that the election was unmodelled. It now
  // carries `division293ReleaseDestination`'s own `reason`, which is a fact about this Person.
  // A year whose income MOVED is needed to produce a cash settlement line at all: Val works six
  // months at $260,000 and stops, so the year's own assessment is nil and the $2,340.00 accrued
  // over those six months comes back.
  const months = project(SETTINGS(), SOLO({}), [
    SPEND,
    { ...STOPS_WORKING, date: '2027-01-01' },
  ]);
  const trueUp = monthAt(months, '2027-07').lines.filter((line) => line.description.startsWith(DIVISION_293_TRUE_UP_LINE));
  assert.deepEqual(trueUp.map(bare), [
    {
      direction: 'inflow',
      effect: 'cash',
      description: 'Division 293 tax year-end true-up, Val, 2026-27',
      amount: toCents(2_340),
    },
  ]);
  const determination = trueUp[0].provenance.determination.join(' ');
  assert.match(determination, /PAID BY THE INDIVIDUAL OUT OF CASH: Val has not elected/);
  assert.match(determination, /no interest of theirs is nominated by being their only one/);
});

// --- §2 THE AGE PENSION FALLS, AND THAT IS O84'S DIRECTION ---------------------------------------
//
// **This is the point of the whole exercise, and it needs a couple to be visible at all.** A payer
// with $250,000 of Division 293 income is not receiving an Age Pension, and by the time they reach
// Age Pension age their accumulation interest is assessed exactly as their cash is — so the
// election is means-test NEUTRAL for a single Household of the payer alone. Where it BITES is
// §4.8's younger-partner exemption: Nan is 69 and on the pension, Val is 51 and her accumulation
// interest is exempt from the couple's assessable assets, so moving $4,680.00 out of it and into
// the Offset raises the couple's assessable assets by the whole of it.
//
// **The Age Pension parameters are SUPPLIED, deliberately NEUTRAL, and labelled synthetic.** The
// published rate set ends at the 20 March 2027 indexation and this settlement lands in July 2027,
// so a forward series is required (register O5 — a Setting, and supplying it is the caller's act).
// Every factor here is 1.000 and the MTAWE benchmark is set far too low to bind, so NOTHING is
// indexed: the only thing that differs between the two walks below is the election.
const FLAT = { cpi: 1, pblci: 1, annualisedMtawe: toCents(80_000) };
const NEUTRAL_AGE_PENSION_SERIES = {
  rateIndexations: [
    { effective: '2027-03-20', ...FLAT },
    { effective: '2027-09-20', ...FLAT },
    { effective: '2028-03-20', ...FLAT },
  ],
  meansTestIndexations: [{ effective: '2027-07-01', cpiMarchQuarter: 1, cpiDecemberQuarter: 1 }],
};
const PENSION_SETTINGS = SETTINGS({
  // Pay rising with wages (2026-09-23) is not this fixture's subject: `awote: 0` holds every salary at the figure stated. A proved control: every figure this file asserts is the same at nil on the build before pay rose.
  economicSeries: { cpi: 0.025, pblci: 0.025, awote: 0, mtawe: 0.035, agePension: NEUTRAL_AGE_PENSION_SERIES },
});
/** Nan: 69, no income, and $600,000 of superannuation — enough that the couple is in the ASSETS taper. */
const nan = () => ({
  name: 'Nan',
  dateOfBirth: '1958-07-01',
  superInterests: [{ phase: 'accumulation', balance: toCents(600_000) }],
  parcels: [],
  employmentIncomePerFortnight: toCents(0),
  workBonusBalance: toCents(0),
});
const COUPLE = (interestOver) => ({ persons: [val(interestOver), nan()], homeStatus: 'occupied' });

test('the Age Pension falls by $16.25 a month — the stepped taper crosses TEN $500 steps, not the raw $4,680.00 (T135)', () => {
  // ⚠️ **REWRITTEN FOR SS Act 1064-G7 (T135, 2026-09-24).** This test used to hand-derive the move on
  // a CONTINUOUS taper — $4,680 / 1,000 x $3.00, halved, monthlyFromFortnightly — and got $15.21. The
  // taper is not continuous: point 1064-G7 disregards any part of the COMBINED assets excess that is
  // not a multiple of $500 before the $3/$1,000 rate is applied (`flooredExcess` in `agePension.ts`).
  // A stepped taper does not move by the size of the asset change — it moves by the number of $500
  // boundaries the change happens to cross, which depends on where the excess started, so the old
  // premise (a fixed dollar move implies a fixed cent move) is false and the figure is re-derived
  // from the actual excess on each side rather than from the raw $4,680.00:
  //
  //   assessable assets move by (unchanged: this is Val's balance
  //     crossing the pocket boundary, not a taper fact)                     +$4,680.00
  //   couple assets free area, homeowner, at 2027-07-01               =   $499,000.00
  //   CONTROL assessable assets, August's opening position            =   $745,491.46
  //   CONTROL excess over the free area                                =   $246,491.46
  //   CONTROL excess floored to the nearest $500 (1064-G7)             =   $246,000.00
  //   ELECTED assessable assets, August's opening position             =   $750,171.46
  //   ELECTED excess over the free area                                 =   $251,171.46
  //   ELECTED excess floored to the nearest $500 (1064-G7)              =   $251,000.00
  //   floored excess rises by TEN $500 steps, not by $4,680.00          =     $5,000.00
  //   assets taper, $3.00 a fortnight per $1,000 of that                =        $15.00 a fortnight
  //   halved, because a couple's combined rate is halved once at
  //     the end                                                         =         $7.50 a fortnight
  //   x 1 eligible Person (Nan; Val is 51)                              =         $7.50 a fortnight
  //   monthlyFromFortnightly, x 26 / 12                                 =        $16.25 a month
  //
  // **The ten steps are not $4,680 / $500 (9.36, i.e. nine or ten depending on alignment) asserted as
  // a coincidence — they are read off the two floors above.** The control's remainder against the
  // $500 grid is $491.46, close enough to the boundary that adding $4,680.00 crosses it and the next
  // nine besides: 491.46 + 4,680.00 = 5,171.46, which is ten $500-steps (5,000.00) plus a new
  // remainder of $171.46 — matching the elected excess's own remainder exactly.
  //
  // **AND THE FIGURE ITSELF STILL IDENTIFIES WHICH TEST BOUND.** Had the INCOME test been the lesser,
  // the same $4,680.00 would be deemed at the upper 3.75% — $175.50 a year, $6.75 a fortnight —
  // tapered at 50c (the income test has no floor: only the assets test does) and halved, which is
  // $1.69 a fortnight and $3.66 a month. $16.25 is still the assets test, stepped.
  const control = project(PENSION_SETTINGS, COUPLE({}), ENTRIES);
  const elected = project(PENSION_SETTINGS, COUPLE(ELECTS), ENTRIES);
  const pension = (months, month) => monthAt(months, month).lines.find((line) => line.description === 'Age Pension').amount;

  // JULY 2027 is assessed on its OPENING position, which the release has not touched yet.
  assert.equal(pension(elected, '2027-07'), pension(control, '2027-07'));
  const augControl = monthAt(control, '2027-08');
  const augElected = monthAt(elected, '2027-08');
  assert.equal(augControl.assessableAssets, toCents(745_491.46));
  assert.equal(augElected.assessableAssets, toCents(750_171.46));
  // AUGUST is the first month assessed on a Household that has made the election.
  assert.equal(pension(elected, '2027-08') - pension(control, '2027-08'), -toCents(16.25));
  // It is a real pension in both walks and not a nil one, so a taper is genuinely operating.
  assert.ok(pension(control, '2027-08') > 0);
});

test('the means-test FEEDBACK is exactly the pension it fed back — a smaller pension, less cash', () => {
  // The delta in assessable assets is NOT a constant $4,680.00 after the first month, and the
  // difference is the loop: the electing Household received $15.21 LESS pension in August, so it
  // closed August with $15.21 less cash, so SEPTEMBER's assessable assets differ by
  //
  //   $4,680.00 - $15.21 = $4,664.79
  //
  // and October's by that figure less September's own pension delta. Nothing here is approximate:
  // each month's asset delta is the previous one less the previous month's pension delta.
  const control = project(PENSION_SETTINGS, COUPLE({}), ENTRIES);
  const elected = project(PENSION_SETTINGS, COUPLE(ELECTS), ENTRIES);
  const delta = (month, field) => monthAt(elected, month)[field] - monthAt(control, month)[field];
  const pensionDelta = (month) =>
    monthAt(elected, month).lines.find((line) => line.description === 'Age Pension').amount -
    monthAt(control, month).lines.find((line) => line.description === 'Age Pension').amount;

  assert.equal(delta('2027-08', 'assessableAssets'), toCents(4_680));
  assert.equal(delta('2027-09', 'assessableAssets'), toCents(4_680) + pensionDelta('2027-08'));
  assert.equal(delta('2027-10', 'assessableAssets'), delta('2027-09', 'assessableAssets') + pensionDelta('2027-09'));

  // And the direction is stated rather than left to a spot figure: the pension is lower in EVERY
  // month from the settlement on, which is O84's direction — this build over-stated the Age Pension
  // of a Household whose Division 293 payer is below Age Pension age.
  const after = elected.filter((m) => m.month >= '2027-08').map((m) => m.month);
  assert.ok(after.length >= 9, `only ${after.length} months follow the settlement`);
  for (const month of after) assert.ok(pensionDelta(month) < 0, `${month} did not lose pension`);
});

// --- §3 AND §4: THE NOMINATED SLOT, AND THE FUND THAT CANNOT PAY ---------------------------------
//
// **A second interest, and the two destinations pull apart.** The employer pays into slot 0 and the
// Commissioner debits slot 1: `statedEmployerContributionDestination` and
// `statedReleaseAuthorityDestination` are siblings and a Person may name different interests for
// each, which is exactly what makes "the debit went to the wrong slot" a thing that can happen — and
// what makes it INVISIBLE in any total, because both interests are accumulation interests of the
// same Person and `splitAssets` puts them in the same pool.
//
// **So the slot is pinned on the GROWTH LINES, which are per INTEREST.** Each interest's balance is
// a chain this file re-derives from the mechanism and not from the walk:
//
//   slot 0 opens at nil and receives the Guarantee: 12% of $260,000 is $31,200 a year, $2,600.00 a
//          month, less the fund's 15% = $2,210.00, credited AFTER that month's growth, in each of
//          the twelve months Val works (she stops on 1 July 2027, so July 2027 has no salary);
//   slot 1 opens at $50,000.00, receives nothing at all, and grows — until the July 2027 tick,
//          where the release takes $4,680.00 out of it after that month's growth.
//
// A debit to the wrong slot moves $4,680.00 from one chain to the other, and BOTH growth lines then
// carry the wrong number. The pair is asserted in order, which is `person.superInterests` order.
const guaranteeAndElected = (electedBalance, settings = SETTINGS()) => ({
  settings,
  household: {
    persons: [
      val({}, {
        superInterests: [
          { phase: 'accumulation', balance: toCents(0), statedEmployerContributionDestination: 'superannuationGuarantee' },
          { phase: 'accumulation', balance: electedBalance, ...ELECTS },
        ],
      }),
    ],
    homeStatus: 'occupied',
  },
});

test('the release is debited to the NOMINATED slot, and the two growth lines say which', () => {
  const { settings, household } = guaranteeAndElected(toCents(50_000));
  const months = project(settings, household, ENTRIES);

  // THE HAND-DERIVED CHAINS. Both balances are carried forward through the documented end-of-tick
  // order — grow, then credit the month's contributions, then serve the release authority — and the
  // growth LINE of a month is `floor(opening x (1 + r)^(1/12)) - opening` on that month's own
  // opening balance. Nothing here reads a balance out of the walk.
  const GUARANTEE_NET_OF_FUND_TAX = toCents(2_210);
  const oneMonth = (balance) => grown(balance, settings.nominalReturn);
  let slot0 = toCents(0);
  let slot1 = toCents(50_000);
  const expected = new Map();
  for (const { month } of months) {
    expected.set(month, [oneMonth(slot0) - slot0, oneMonth(slot1) - slot1]);
    slot0 = oneMonth(slot0);
    slot1 = oneMonth(slot1);
    if (month <= '2027-06') slot0 += GUARANTEE_NET_OF_FUND_TAX;
    if (month === '2027-07') slot1 -= toCents(4_680);
  }

  const growthIn = (month) =>
    monthAt(months, month)
      .lines.filter((line) => line.description === 'Investment growth, Val — Superannuation, Accumulation Phase')
      .map((line) => line.amount);

  // The month BEFORE the settlement: the two chains agree, so the derivation itself is sound before
  // it is used to detect a $4,680.00 movement.
  assert.deepEqual(growthIn('2027-06'), expected.get('2027-06'));
  // And the month AFTER it: slot 1 is smaller by the release and slot 0 is untouched. A debit to
  // slot 0 would put the shortfall in the FIRST of these two numbers instead of the second.
  assert.deepEqual(growthIn('2027-08'), expected.get('2027-08'));
  // Held for the whole remainder of the walk, so the balance the release left behind is the balance
  // that goes on compounding.
  for (const { month } of months.filter((m) => m.month >= '2027-08')) {
    assert.deepEqual(growthIn(month), expected.get(month), `${month}'s two interests are not the two chains`);
  }
  // ⚠️ **THE VACUITY CONTROL.** Two lines, always — a walk that emitted one would make every
  // `deepEqual` above compare a one-element array against a two-element one and fail, but a walk
  // that emitted none in some month would make `expected` and the actual both empty only if the
  // derivation also ran dry. The two chains are positive throughout, so both lines exist.
  assert.equal(growthIn('2027-08').length, 2);
  assert.ok(expected.get('2027-08').every((amount) => amount > 0));
});

// **`nominalReturn` is NIL below, and that is what makes the boundary exact.** Slot 1 holds
// $4,680.00 and nothing grows, so the liability and the balance are the same number to the cent —
// the all-or-nothing rule tested where it actually bites rather than somewhere comfortable. Slot 0
// still collects the Guarantee and can always pay, which is why the walks below say something about
// the NOMINATED interest and not merely about the Person's superannuation.
const NO_GROWTH = SETTINGS({ nominalReturn: 0 });

test('ONE CENT SHORT AND IT IS REFUSED BY NAME — the release is all-or-nothing', () => {
  // $4,679.99 against a $4,680.00 liability, in an interest that receives nothing. There is no
  // partial release here and no second fund — both are things Subdiv 293-B and the Div 131
  // machinery provide for and neither rule is retrieved in this build — so the walk STOPS. Slot 0
  // holds $26,520.00 of Guarantee by then and could have paid it twice over; it is not asked.
  const { household } = guaranteeAndElected(toCents(4_679.99));
  const error = (() => {
    try {
      project(NO_GROWTH, household, ENTRIES);
    } catch (thrown) {
      return thrown;
    }
    return assert.fail('a fund one cent short of the liability paid it anyway');
  })();
  assert.ok(error instanceof Division293ReleaseInsufficientBalanceError);
  assert.equal(error.name, 'Division293ReleaseInsufficientBalanceError');
  assert.ok(error instanceof RangeError, 'ADR-0004: every refusal in this build is a RangeError');
  // The message names the Person, the position, the year and BOTH figures — a refusal that says
  // only "not enough" leaves the reader to find out which of their accounts and by how much.
  assert.match(error.message, /Val elected/);
  assert.match(error.message, /superannuation interest 1/);
  assert.match(error.message, /FY2026-27/);
  assert.match(error.message, /468000 cents/);
  assert.match(error.message, /467999 cents/);
  assert.match(error.message, /ALL-OR-NOTHING/);
});

test('exactly enough is enough — the boundary is `<=` and it is tested from both sides', () => {
  // The paired half of the refusal above: the same Household with ONE MORE CENT walks to the end,
  // and the nominated interest is left at exactly nil. A guard written `<` instead of `<=` would
  // refuse a fund that can pay to the cent.
  const exactly = project(NO_GROWTH, guaranteeAndElected(toCents(4_680)).household, ENTRIES);
  assert.ok(exactly.length > 0);
  // Nothing grows, so from August the Person's protected total is slot 0's Guarantee alone:
  // twelve months at $2,210.00 = $26,520.00, and slot 1 is empty.
  assert.equal(monthAt(exactly, '2027-08').protectedAssets, toCents(26_520));
  assert.throws(
    () => project(NO_GROWTH, guaranteeAndElected(toCents(4_679.99)).household, ENTRIES),
    Division293ReleaseInsufficientBalanceError,
  );
});

// --- §5 ⚠️ SOURCE PINS ---------------------------------------------------------------------------

/** Comments out, string literals blanked — so prose and a quoted name cannot satisfy a pin. */
const executableCode = (text) =>
  text
    .replaceAll(/\/\*[\s\S]*?\*\//g, '')
    .replaceAll(/`(?:[^`\\]|\\.)*`|'(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*"|\/\/.*$/gm, (match) =>
      match.startsWith('//') ? '' : '""',
    );

test('⚠️ SOURCE PIN: the two residuals are NAMED in the source, because neither is fixed', () => {
  // M3 was asked to name these rather than close them, and a residual named only in a commit
  // message is a residual nobody meets again. They are pinned on the DOC COMMENTS — which is why
  // this pin reads the raw file and not `executableCode`.
  const source = readFileSync(join(ROOT, 'src', 'core', 'projection.ts'), 'utf8');
  // (a) THE PARTIAL FINANCIAL YEAR. A walk's first and last years never reach a settlement, so an
  //     electing Person's accrual there silently stands as the cash default they did not choose.
  assert.match(source, /A FIRST or\s+\* LAST PARTIAL financial year never reaches the true-up at all/);
  // (b) THE TIMING. The release is modelled at the July settlement; a real one follows the
  //     Commissioner's notice months later, so this build anticipates it. Bounded, and conservative.
  assert.match(source, /THE TIMING RESIDUAL, named rather than fixed/);
  assert.match(source, /runs in the\s+\* CONSERVATIVE direction/);
});

test('⚠️ SOURCE PIN: the monthly accrual is still CASH, and no branch in it reads the election', () => {
  // The design rule M3 must not drift from: the accrual is a running estimate, taken in cash from
  // EVERY Person, and the election is resolved ONCE A YEAR at the settlement. A
  // `division293ReleaseDestination` call inside the monthly accrual block would mean twelve release
  // authorities for twelve amounts, none of which is the liability the Commissioner assesses.
  const source = executableCode(readFileSync(join(ROOT, 'src', 'core', 'projection.ts'), 'utf8'));
  assert.equal(
    [...source.matchAll(/\bdivision293ReleaseDestination\s*\(/g)].length,
    1,
    'the resolver is called more than once in the walk — the election is a whole-year decision and belongs at the settlement',
  );
  // The positive control: the walker does find the one call, so the count above is a count and not
  // a broken regex.
  assert.match(source, /\bdivision293ReleaseDestination\s*\(/);
});
