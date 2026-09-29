// P6-8 brief 4 — a standing salary sacrifice can be STOPPED from a date, and stopping it does not
// reach backwards.
//
// The user's ruling: *"make it stoppable to accommodate user financial choices and situation"*. The
// case that was blocked is narrow and this file is scoped to it — **stopping voluntarily while
// still working**. Retirement was never the gap: `sacrificedThisMonth` is `Math.min(gross salary,
// stated amount)`, so a sacrifice already falls to nil when the salary does, and the last test in
// §4 is the control that says so rather than a thing being built.
//
// **What is defended here.**
//
//   1. THE BOUNDARY. Every month before the stop is bit-for-bit what it was without the stop, and
//      the stop's own month is the first that sacrifices nothing. A month early or a month late
//      both fail.
//   2. WHAT COMES BACK. From that month the whole salary is taxed again and the pay packet is the
//      pay packet — the same figures as a walk that never had an arrangement at all.
//   3. WHAT DOES NOT COME BACK. The money already contributed stays in the fund and keeps growing:
//      the stop releases the future, not the past.
//   4. THE CAP AND DIVISION 293 LIMB. What the cap and the Division 293 base are measured on falls
//      to nil from the stop and is unchanged before it — and the employer's Superannuation
//      Guarantee moves by nothing at all in either direction, because it never depended on the
//      sacrifice (SGAA ss 10A(1)(h), T17).
//   5. WHICH KIND OF NOTHING. Six different reasons a month can show no sacrifice, and no two of
//      them look alike to a reader. This is the §6 the design was chosen for.
import test from 'node:test';
import assert from 'node:assert/strict';

import { toCents } from '../dist/core/money.js';
import { project } from '../dist/core/projection.js';

const entry = (id, type, date, owner, params = {}) => ({ id, date, owner, type, params, enabled: true, createdAt: '2026-01-01' });

const at = (months, month) => months.find((each) => each.month === month);
const lineIn = (month, prefix) => month.lines.filter((line) => line.description.startsWith(prefix));
const amountIn = (month, prefix) => lineIn(month, prefix).reduce((total, line) => total + line.amount, 0);
const totalOf = (months, prefix) => months.reduce((total, month) => total + amountIn(month, prefix), 0);
const stopNotes = (month) => month.notes.filter((note) => note.subject === 'salary sacrifice stopped');

/**
 * **One Person, still working throughout, and 46 years old — because the case is stopping WHILE
 * WORKING and nothing else.** Nobody here reaches preservation age, Age Pension age or a Condition
 * of Release inside the walk, so no other mechanism can move a figure this file reads.
 *
 * The interest nominates itself as the employer's destination because two accumulation interests
 * with no nomination is refused by the walk; there is only one here, and naming it keeps the
 * Guarantee's own figures out of the question this file is asking.
 */
const HOUSEHOLD = {
  persons: [
    {
      name: 'Dana',
      dateOfBirth: '1980-06-10',
      superInterests: [
        { phase: 'accumulation', balance: toCents(120_000), statedEmployerContributionDestination: 'superannuationGuarantee' },
      ],
      parcels: [],
      employmentIncomePerFortnight: toCents(0),
      workBonusBalance: toCents(0),
    },
  ],
  homeStatus: 'occupied',
  openingOffsetBalance: toCents(30_000),
};

const SETTINGS = {
  asAtDate: '2026-07-01',
  planningHorizonAge: 50,
  economicSeries: { cpi: 0.025, pblci: 0.025, awote: 0.035, mtawe: 0.035 },
  deemingRates: { lower: 0.0175, upper: 0.0375 },
  nominalReturn: 0.065,
  // Interest on cash (2026-09-23) is not this fixture's subject: stated nil, the control proved byte-identical to the walk before it existed.
  cashInterestRate: 0,
};

const BASE = [
  entry('spend', 'SPEND_CHANGE', '2026-07-01', 'household', { annualSpend: toCents(40_000) }),
  entry('work', 'WORK_PATTERN_CHANGE', '2026-07-01', 'personA', { daysPerWeek: 5, annualSalary: toCents(80_600) }),
];

/**
 * **$15,000, and the figure is decided by the cap rather than chosen.** The arrangement starts in
 * FY2027-28, which no AWOTE index number reaches, so what governs is s 960-285(4)'s floor: a
 * concessional TOTAL within $25,000 is within every year's cap. Dana's Guarantee is 12% of $80,600
 * = $9,672, which leaves $15,328 of room, and $15,000 is inside it.
 */
const SACRIFICE = entry('sac', 'SUPER_CONTRIBUTION', '2027-07-01', 'personA', {
  kind: 'salarySacrificed',
  annualAmount: toCents(15_000),
  interestIndex: 0,
});
const STOP = entry('stop', 'SUPER_CONTRIBUTION', '2029-01-01', 'personA', { kind: 'stopped' });

const PLAIN = project(SETTINGS, HOUSEHOLD, BASE);
const RUNNING = project(SETTINGS, HOUSEHOLD, [...BASE, SACRIFICE]);
const STOPPED = project(SETTINGS, HOUSEHOLD, [...BASE, SACRIFICE, STOP]);

const CREDIT = 'Salary sacrifice into superannuation';
/** A twelfth of $15,000 is $1,250.00, and the fund pays s 26(1)(a)'s 15% of it. */
const MONTHLY_CREDIT = 125_000 - 18_750;
/** 2027-07 to 2028-12 inclusive — the months the arrangement ran before the stop. */
const MONTHS_RUN = 18;

test('the fixture is one that can prove things: three walks, same length, and the arrangement bites', () => {
  assert.equal(PLAIN.length, 48);
  assert.equal(RUNNING.length, 48);
  assert.equal(STOPPED.length, 48);
  assert.equal(PLAIN.at(0).month, '2026-07');
  assert.equal(PLAIN.at(-1).month, '2030-06');
  // The control on every comparison below: without a stop the arrangement is a LEVEL and runs to
  // the end of the walk — 36 months of credits, from 2027-07 to 2030-06.
  assert.equal(totalOf(PLAIN, CREDIT), 0);
  assert.equal(totalOf(RUNNING, CREDIT), 36 * MONTHLY_CREDIT);
  assert.equal(MONTHLY_CREDIT, 106_250);
});

// --- §1 The boundary ----------------------------------------------------------------------------

test('every month before the stop is bit-for-bit the month it was without one', () => {
  // **The strongest form of "a stop does not reach backwards", and the one a digest cannot state
  // inside the suite**: not "the figures agree" but "the `Month` objects are the same object", for
  // every month up to and including the one before the stop. Lines, notes, provenance,
  // `appliedEntryIds` and all.
  const december = STOPPED.findIndex((month) => month.month === '2028-12');
  assert.ok(december > 0, 'the walk does not reach the month before the stop');
  for (let index = 0; index <= december; index += 1) {
    assert.deepEqual(STOPPED[index], RUNNING[index], `${RUNNING[index].month} moved, and it is before the stop`);
  }
  // The control: the very next month is NOT identical, so the loop is a boundary and not a walk
  // that ran out of months.
  assert.equal(STOPPED[december + 1].month, '2029-01');
  assert.notDeepEqual(STOPPED[december + 1], RUNNING[december + 1]);
});

test('the stop takes effect in its OWN month — not the one before, not the one after', () => {
  assert.equal(lineIn(at(STOPPED, '2028-12'), CREDIT).length, 1, 'the month before the stop lost its contribution');
  assert.equal(amountIn(at(STOPPED, '2028-12'), CREDIT), MONTHLY_CREDIT);
  assert.equal(lineIn(at(STOPPED, '2029-01'), CREDIT).length, 0, 'the stop month still contributed');
  assert.equal(lineIn(at(STOPPED, '2029-02'), CREDIT).length, 0);
  // And it HOLDS, because a stop is a level and not a one-month event: nothing is contributed in
  // any month to the horizon.
  assert.equal(totalOf(STOPPED, CREDIT), MONTHS_RUN * MONTHLY_CREDIT);
  assert.equal(MONTHS_RUN * MONTHLY_CREDIT, 1_912_500);
});

test('the month says which entry governs it, and after the stop that is the stop', () => {
  // `appliedEntryIds` is the second half of the boundary, and it is what an entry list on screen
  // is read against: the arrangement governs until the stop, and then the stop does.
  assert.ok(at(STOPPED, '2028-12').appliedEntryIds.includes('sac'));
  assert.ok(!at(STOPPED, '2028-12').appliedEntryIds.includes('stop'));
  for (const month of ['2029-01', '2029-06', '2030-06']) {
    assert.ok(at(STOPPED, month).appliedEntryIds.includes('stop'), `${month} does not cite the stop`);
    assert.ok(!at(STOPPED, month).appliedEntryIds.includes('sac'), `${month} still cites the arrangement it stopped`);
  }
});

// --- §2 What comes back -------------------------------------------------------------------------

test('from the stop the whole salary is paid and taxed again — the figures of a walk that never arranged anything', () => {
  // $80,600 a year is $6,716.67 a month of pay and $1,289.50 of income tax; with $15,000
  // sacrificed it is $5,466.67 and $886.92. The stopped walk goes back to the first pair, and it is
  // asserted against the PLAIN walk rather than against literals, so the claim is "the arrangement
  // is gone" and not "these numbers happen to match".
  for (const month of ['2029-01', '2029-06', '2030-06']) {
    assert.equal(amountIn(at(STOPPED, month), 'Salary, Dana'), amountIn(at(PLAIN, month), 'Salary, Dana'), month);
    assert.equal(amountIn(at(STOPPED, month), 'Income tax, Dana'), amountIn(at(PLAIN, month), 'Income tax, Dana'), month);
  }
  // The control: while it was running, both differed — so the equalities above are a change and not
  // a pair of figures that never moved.
  assert.notEqual(amountIn(at(RUNNING, '2028-12'), 'Salary, Dana'), amountIn(at(PLAIN, '2028-12'), 'Salary, Dana'));
  assert.notEqual(amountIn(at(RUNNING, '2028-12'), 'Income tax, Dana'), amountIn(at(PLAIN, '2028-12'), 'Income tax, Dana'));
  // ⚠️ **RE-DERIVED 2026-09-23: PAY RISES WITH WAGES, AND THE SACRIFICE DOES NOT.** June 2029 is 35
  // months after `asAtDate`, so the $80,600 stated in July 2026's wages pays $80,600 × 1.035 ^
  // (35/12) = $89,106.84 a year, $7,425.57 a month ($6,716.67 on flat pay). The $15,000 arrangement
  // is the same dollars every year (register O88), so the running walk is paid exactly $1,250.00 a
  // month less: $6,175.57 ($5,466.67 on flat pay).
  const grown = Math.round(8_060_000 * 1.035 ** (35 / 12));
  assert.equal(grown, 8_910_684);
  assert.equal(amountIn(at(PLAIN, '2029-06'), 'Salary, Dana'), Math.round(grown / 12));
  assert.equal(amountIn(at(PLAIN, '2029-06'), 'Salary, Dana'), 742_557);
  assert.equal(amountIn(at(RUNNING, '2029-06'), 'Salary, Dana'), Math.round((grown - 1_500_000) / 12));
  assert.equal(amountIn(at(RUNNING, '2029-06'), 'Salary, Dana'), 617_557);
  assert.equal(742_557 - 617_557, 125_000, 'the sacrifice rose with the pay — it is stated in dollars and must not');
});

// --- §3 What does not come back -------------------------------------------------------------------

test('the money already contributed stays in the fund and keeps growing — a stop releases the future, not the past', () => {
  // **The mutation this is written against is "the stop erases the arrangement's history".** Any
  // build that unwound the 18 months of contributions would make the last month's superannuation
  // equal to the plain walk's; any build that kept contributing would make it equal to the running
  // walk's. It is strictly between them, and the size of the gap is priced rather than read off.
  const last = '2030-06';
  const plain = at(PLAIN, last).protectedAssets;
  const stopped = at(STOPPED, last).protectedAssets;
  const running = at(RUNNING, last).protectedAssets;
  assert.ok(plain < stopped, 'the stop took the contributed money back out of the fund');
  assert.ok(stopped < running, 'the stop did not stop anything');
  // What the 18 credits are worth at the horizon: $19,125 paid in between 2027-07 and 2028-12, then
  // compounding at 6.5% for between 18 and 36 months, so the gap is the sum grown by something
  // between 9% and 21%. It measures at about 14%.
  const contributed = MONTHS_RUN * MONTHLY_CREDIT;
  const gap = stopped - plain;
  assert.ok(gap > contributed * 1.09 && gap < contributed * 1.21, `the gap is ${gap} cents against ${contributed} contributed — not the growth of what was paid in`);
});

// --- §4 The cap, Division 293, and the employer's half ---------------------------------------------

test('what the cap and Division 293 are measured on falls to nil at the stop, and the Guarantee does not move', () => {
  // The concessional total and the Division 293 base are both built from the month's sacrifice, and
  // the Guarantee note is where that figure is visible: `salarySacrificedAmounts` is the s 10A(1)(h)
  // add-back, which is the same month's sacrifice read by the SG module.
  const note = (months, month) => at(months, month).notes.find((each) => each.subject === 'superannuation guarantee');
  assert.equal(note(RUNNING, '2028-12').salarySacrificedAmounts, 1_500_000, 'the control: it is $15,000 while the arrangement runs');
  assert.equal(note(STOPPED, '2028-12').salarySacrificedAmounts, 1_500_000);
  assert.equal(note(STOPPED, '2029-01').salarySacrificedAmounts, 0, 'the cap is still being charged for an arrangement that has stopped');
  assert.equal(note(STOPPED, '2030-06').salarySacrificedAmounts, 0);
  // **AND THE EMPLOYER'S HALF IS UNTOUCHED, IN BOTH DIRECTIONS (T17).** The Guarantee is 12% of the
  // PRE-sacrifice salary, so it did not rise when the arrangement started and it does not fall when
  // it stops: every figure on the note except the add-back is identical in the two walks.
  for (const month of ['2029-01', '2030-06']) {
    assert.equal(note(STOPPED, month).qualifyingEarnings, note(RUNNING, month).qualifyingEarnings, month);
    assert.equal(note(STOPPED, month).annualAmountCredited, note(RUNNING, month).annualAmountCredited, month);
    assert.equal(note(STOPPED, month).creditedToSuperannuation, note(RUNNING, month).creditedToSuperannuation, month);
  }
});

test('a sacrifice ALREADY falls to nil when the salary does — retirement is not what the stop is for', () => {
  // The control on the scope of this whole file. `sacrificedThisMonth` is `Math.min(gross, stated)`,
  // so a Person who stops being paid sacrifices nothing without any entry saying so — and that
  // month is NOT a stopped month: no stop note, and the arrangement still governs it.
  const retired = project(SETTINGS, HOUSEHOLD, [
    ...BASE,
    SACRIFICE,
    entry('zero', 'WORK_PATTERN_CHANGE', '2029-01-01', 'personA', { daysPerWeek: 0, annualSalary: toCents(0) }),
  ]);
  assert.equal(lineIn(at(retired, '2029-06'), CREDIT).length, 0, 'money is being sacrificed out of a salary that is not paid');
  assert.equal(stopNotes(at(retired, '2029-06')).length, 0, 'an unpaid month is being reported as a stopped arrangement');
  assert.ok(at(retired, '2029-06').appliedEntryIds.includes('sac'), 'the arrangement stopped governing, and nothing said so');
});

test('the Division 293 charge follows the stop to the cent, and the year-end settlement finds nothing to correct', () => {
  // **The one place a stop moves a TAX that is not income tax, and the whole year is walked.**
  //
  // ⚠️ **The fixture had to be built inside FY2026-27, and the reason is a finding worth stating**:
  // from FY2027-28 no published cap reaches the year, so what governs is the $25,000 floor, and a
  // Person on the salary Division 293 needs ($223,000 and up, since the base is income AND
  // contributions) already owes more than $25,000 of Superannuation Guarantee on their own. Every
  // such arrangement is refused by the cap. So a sacrificing Person can only reach Division 293 in
  // the one year whose cap is published, $32,500.
  //
  // Dana earns $260,000. Worked by hand, in annual figures:
  //   * Guarantee 12% = $31,200; sacrifice $1,000; total $32,200, inside the $32,500 cap.
  //   * Division 293 income while sacrificing: $259,000 of salary + $32,200 of low tax
  //     contributions = $291,200. The excess over $250,000 is $41,200, which is MORE than the
  //     contributions, so the charge is 15% of $32,200 = **$4,830 a year, $402.50 a month**.
  //   * Stopped: $260,000 + $31,200 = $291,200 — the same total, because sacrificing only moves a
  //     dollar from one side of the base to the other. The charge is 15% of $31,200 = **$4,680 a
  //     year, $390.00 a month**. The fall is exactly 15% of the arrangement.
  const household = {
    persons: [{
      name: 'Dana', dateOfBirth: '1980-06-10',
      superInterests: [{ phase: 'accumulation', balance: toCents(120_000), statedEmployerContributionDestination: 'superannuationGuarantee' }],
      parcels: [], employmentIncomePerFortnight: toCents(0), workBonusBalance: toCents(0),
    }],
    homeStatus: 'occupied', openingOffsetBalance: toCents(300_000),
  };
  // Pay rising with wages (2026-09-23) is not this test's subject: `awote: 0` holds the $260,000 flat
  // so the charge is the same every month of the year. A proved control: every figure asserted here
  // is the same at nil on the build before pay rose (FY2026-27's cap is published, so the nil reaches
  // nothing else).
  const settings = { ...SETTINGS, planningHorizonAge: 48, economicSeries: { ...SETTINGS.economicSeries, awote: 0 } };
  const base = [
    entry('spend', 'SPEND_CHANGE', '2026-07-01', 'household', { annualSpend: toCents(60_000) }),
    entry('work', 'WORK_PATTERN_CHANGE', '2026-07-01', 'personA', { daysPerWeek: 5, annualSalary: toCents(260_000) }),
  ];
  const sacrifice = entry('sac', 'SUPER_CONTRIBUTION', '2026-08-01', 'personA', { kind: 'salarySacrificed', annualAmount: toCents(1_000), interestIndex: 0 });
  const stop = entry('stop', 'SUPER_CONTRIBUTION', '2027-01-01', 'personA', { kind: 'stopped' });
  const running = project(settings, household, [...base, sacrifice]);
  const stopped = project(settings, household, [...base, sacrifice, stop]);
  const charge = (months, month) => amountIn(at(months, month), 'Division 293 tax, Dana');
  assert.equal(Math.round(15 * (31_200_00 + 1_000_00) / 100 / 12), 40_250);
  assert.equal(Math.round(15 * 31_200_00 / 100 / 12), 39_000);
  assert.equal(charge(running, '2026-12'), 40_250, 'the control: the charge while the arrangement runs');
  assert.equal(charge(stopped, '2026-12'), 40_250);
  assert.equal(charge(stopped, '2027-01'), 39_000, 'the Division 293 charge is still being taken on a sacrifice that has stopped');
  assert.equal(charge(stopped, '2027-06'), 39_000);
  assert.equal(charge(running, '2027-06'), 40_250);
  // **THE YEAR-END SETTLEMENT IS THE PART THAT PROVES THE MONTHS BEFORE THE STOP STILL COUNT.** The
  // year's real charge is 15% of the Guarantee plus the FIVE months of sacrifice actually made —
  // 5/12 of $1,000 — which is $4,742.50, and the twelve monthly accruals (five at $402.50, seven at
  // $390.00) come to exactly that. So July's true-up is NIL, and a build that erased the months
  // already sacrificed would have to refund something here.
  assert.equal(5 * 40_250 + 7 * 39_000, 474_250);
  assert.equal(Math.round(15 * (31_200_00 + Math.round(5 * 1_000_00 / 12)) / 100), 474_250);
  const july = at(stopped, '2027-07').lines.filter((line) => /293/.test(line.description));
  assert.equal(july.length, 1, `FY2026-27 settled with a correction: ${JSON.stringify(july.map((line) => [line.description, line.amount]))}`);
  assert.equal(july[0].amount, 39_000, 'the only Division 293 line in July is the new year\'s monthly accrual');
});

// --- §5 Which kind of nothing ----------------------------------------------------------------------

test('the stop note is in EVERY month the stop governs, and in none before it', () => {
  // A reader asking "why is there no sacrifice in this month?" is asking about THAT month, so the
  // note is carried forward like the level it reports. Counted, not found once.
  const stopped = STOPPED.filter((month) => stopNotes(month).length === 1);
  assert.equal(stopped.length, 18, 'the stop is not reported in every month it governs');
  assert.equal(stopped[0].month, '2029-01');
  assert.equal(stopped.at(-1).month, '2030-06');
  // 48 months, 18 of them stopped: the walk is 2026-07..2030-06 and the stop is 2029-01, so the
  // counts on the two sides of the boundary have to sum to the walk.
  assert.equal(STOPPED.filter((month) => stopNotes(month).length === 0).length, 48 - 18);
  assert.equal(RUNNING.filter((month) => stopNotes(month).length > 0).length, 0, 'a walk with no stop is reporting stops');
  const note = stopNotes(at(STOPPED, '2029-06'))[0];
  assert.equal(note.person, 'Dana');
  assert.equal(note.entryId, 'stop');
  assert.equal(note.stoppedFrom, '2029-01-01');
  // It says what it does NOT do, because that is the half a user cannot see: the months before it.
  assert.match(note.note, /stays contributed/);
  assert.match(note.note, /Superannuation Guarantee is unaffected/);
  // No money field on any note (`Month.notes`' own rule), and no `amount` under any name.
  assert.deepEqual(Object.keys(note).sort(), ['entryId', 'note', 'person', 'stoppedFrom', 'subject']);
});

test('SIX reasons a month can show no sacrifice, and no two of them look alike', () => {
  // **The hazard this design was chosen against** (`SuperContributionParams`). Each case below is a
  // real walk, and each is identified by a DIFFERENT observable — if any two produced the same
  // triple, a reader could not tell them apart and the design would have collapsed two facts into
  // one value.
  const laterSacrifice = { ...SACRIFICE, date: '2030-01-01' };
  const switchedOff = { ...SACRIFICE, enabled: false };
  const cases = {
    neverStated: project(SETTINGS, HOUSEHOLD, BASE),
    notYetStarted: project(SETTINGS, HOUSEHOLD, [...BASE, laterSacrifice]),
    running: RUNNING,
    stopped: STOPPED,
    unpaid: project(SETTINGS, HOUSEHOLD, [
      ...BASE,
      SACRIFICE,
      entry('zero', 'WORK_PATTERN_CHANGE', '2029-01-01', 'personA', { daysPerWeek: 0, annualSalary: toCents(0) }),
    ]),
    switchedOff: project(SETTINGS, HOUSEHOLD, [...BASE, switchedOff]),
  };
  // Read in one month — 2029-06 — in which every one of the six is in whatever state it is in.
  const month = '2029-06';
  const signature = (months, plan) => ({
    contributing: lineIn(at(months, month), CREDIT).length > 0,
    stopNote: stopNotes(at(months, month)).length > 0,
    governedBySacrifice: at(months, month).appliedEntryIds.some((id) => id === 'sac'),
    // The two facts that are about the PLAN and not about the month: an entry can be dated later,
    // or switched off, and both are on the entry list rather than in the walk.
    statedLater: plan.some((each) => each.type === 'SUPER_CONTRIBUTION' && each.enabled && each.date > `${month}-30`),
    switchedOff: plan.some((each) => each.type === 'SUPER_CONTRIBUTION' && !each.enabled),
  });
  const signatures = {
    neverStated: signature(cases.neverStated, BASE),
    notYetStarted: signature(cases.notYetStarted, [...BASE, laterSacrifice]),
    running: signature(cases.running, [...BASE, SACRIFICE]),
    stopped: signature(cases.stopped, [...BASE, SACRIFICE, STOP]),
    unpaid: signature(cases.unpaid, [...BASE, SACRIFICE]),
    switchedOff: signature(cases.switchedOff, [...BASE, switchedOff]),
  };
  // Every signature is different from every other one. Stringified and counted, so a future change
  // that made two of them agree fails here whichever two they are.
  assert.equal(new Set(Object.values(signatures).map((each) => JSON.stringify(each))).size, 6, JSON.stringify(signatures, null, 1));
  // And the one that is easiest to lose, stated in full: a stopped month and an unpaid month both
  // contribute nothing and both still have an arrangement in the file. What tells them apart is the
  // note, and nothing else in the month does.
  assert.equal(signatures.stopped.contributing, false);
  assert.equal(signatures.unpaid.contributing, false);
  assert.equal(signatures.stopped.stopNote, true);
  assert.equal(signatures.unpaid.stopNote, false);
  // The control: one of the six IS contributing, so the table is not six kinds of silence.
  assert.equal(signatures.running.contributing, true);
});

// --- §6 Restarting -------------------------------------------------------------------------------

test('an arrangement stated after a stop RESTARTS it, from its own date', () => {
  // The only way to restart, and it falls out of the level idiom rather than needing anything: a
  // later `SUPER_CONTRIBUTION` supersedes whatever the Person's standing state was, stop included.
  const restart = entry('again', 'SUPER_CONTRIBUTION', '2029-07-01', 'personA', {
    kind: 'salarySacrificed',
    annualAmount: toCents(9_000),
    interestIndex: 0,
  });
  const months = project(SETTINGS, HOUSEHOLD, [...BASE, SACRIFICE, STOP, restart]);
  assert.equal(lineIn(at(months, '2029-06'), CREDIT).length, 0, 'the stop stopped applying before the restart');
  assert.equal(stopNotes(at(months, '2029-06')).length, 1);
  // $9,000 a year is $750.00 a month, less the fund's 15%.
  assert.equal(amountIn(at(months, '2029-07'), CREDIT), 75_000 - 11_250);
  // And the stop stops being reported the moment it stops being true — the note and the credit line
  // are the same fact read two ways and cannot both be present.
  assert.equal(stopNotes(at(months, '2029-07')).length, 0, 'a month that is contributing is also reporting itself as stopped');
  assert.equal(stopNotes(at(months, '2030-06')).length, 0);
  assert.ok(at(months, '2030-06').appliedEntryIds.includes('again'));
});

test('a restart is measured against the cap on ITS OWN amount — the stopped arrangement is not added to it', () => {
  // **WHAT "THE CAP IS RELEASED" CAN AND CANNOT BE PROVED BY, said plainly.** The concessional cap
  // is checked only in a month an arrangement is STATED, so there is no month after a stop in which
  // any check runs — the release cannot be observed as a refusal that stops happening, and what it
  // is observed by instead is the figure the cap measures (the previous test's Division 293 base,
  // and the Guarantee note's add-back). What CAN be pinned as a refusal is this: a build that
  // carried the stopped arrangement into the total would refuse a restart that is legal.
  //
  // She sacrificed $15,000, stopped, and restarts at $23,000 in FY2029-30. With the Guarantee that
  // is $32,672 of concessional contributions, which the walk accepts; the stopped $15,000 as well
  // would be $47,672, which nothing would accept. **The cap for that year is INDEXED off the stated
  // wage rate (P6-12) rather than the $25,000 floor**, so it is not written out here as a figure —
  // what is pinned is the pair either side of it: $32,672 walks and $35,672 is refused, so the cap
  // is somewhere between, and both assertions are about THIS restart's own amount.
  const restart = (annualAmount) => [
    ...BASE,
    SACRIFICE,
    STOP,
    entry('again', 'SUPER_CONTRIBUTION', '2029-07-01', 'personA', { kind: 'salarySacrificed', annualAmount, interestIndex: 0 }),
  ];
  const months = project(SETTINGS, HOUSEHOLD, restart(toCents(23_000)));
  assert.equal(amountIn(at(months, '2029-07'), CREDIT), Math.round(Math.round(23_000_00 / 12) * 0.85));
  // **And the control, which is what stops this being a test that the cap is switched off:** $3,000
  // more is refused by name in the month it is stated.
  assert.throws(() => project(SETTINGS, HOUSEHOLD, restart(toCents(26_000))), /concessional contributions/i, 'the restart is not measured against the cap at all');
});
