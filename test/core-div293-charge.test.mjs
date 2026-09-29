// P6-9 chunk 3 — DIVISION 293 IS CHARGED. The last flattering gap in the superannuation feature.
//
// Chunks 1 and 2 built the two limbs of ITAA 1997 s 293-20(1) and multiplied them by nothing: the
// income base was computed on every Person of every month and read by no one, the low tax
// contributions were built for every sacrificing Person and read by no one, and every note the walk
// emitted said in terms that the second 15% was not charged. A Person over $250,000 was taxed at
// 15% on their concessional contributions where the law charges 30%, which OVERSTATED their wealth.
//
// **What is defended here.**
//
//   1. **THE TAPER, ON BOTH SIDES OF THE `min`.** s 293-20(1) charges 15% of the LESSER of the low
//      tax contributions and the amount by which the two limbs together exceed $250,000. Both limbs
//      really bind in this walk and the difference between them is money — a Person on $260,000 has
//      the CONTRIBUTIONS limb binding and a Person on $231,400 has the EXCESS limb binding, where a
//      cliff would charge 3.4 times the truth.
//   2. **THE THRESHOLD, PINNED ON BOTH SIDES.** A Person whose sum is $249,985.28 pays NOTHING; a
//      Person $28.12 richer, whose sum is $250,014.40, pays $2.16 — 15% of the $14.40 excess, and
//      not 15% of their $26,894.40 of contributions.
//   3. **WHO PAYS IT: the individual, out of cash.** The superannuation interest is untouched to
//      the cent. ~~The Subdiv 293-B election to have the charge released from the fund instead is
//      NOT modelled~~ — **SUPERSEDED 2026-09-20 BY P6-10 M3**, which performs it at the year-end
//      settlement. Every Person in THIS file elects nothing, so every figure below is unchanged and
//      the claim it defends is now the narrower one: the MONTHLY ACCRUAL is cash for everybody, and
//      a Person who elected nothing keeps that treatment at the settlement too. The release itself
//      is `test/core-division293-release-charge.test.mjs`.
//   4. **THE YEAR-END TRUE-UP, IN BOTH DIRECTIONS.** The monthly accrual is a twelfth of a full
//      year assessed on the state in force this month, so a year whose income moved is settled once
//      when the walk leaves it — a refund where the year never crossed the threshold, and an amount
//      OWED where twelve annualised months under-charged the year's own assessment.
//   5. **NOBODY UNDER THE THRESHOLD IS CHARGED**, in any month of any walk here.
//
// Every figure below is hand-derived from the mechanism and stated as arithmetic before it is
// asserted. The rate scale is not read off `dist/`.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { toCents } from '../dist/core/money.js';
import { DIVISION_293_LINE, DIVISION_293_TRUE_UP_LINE, project } from '../dist/core/projection.js';
import { SUPERANNUATION } from '../dist/data/assumptions/super.js';

const person = (name, dateOfBirth, over = {}) => ({
  name,
  dateOfBirth,
  superInterests: [{ phase: 'accumulation', balance: toCents(0) }],
  parcels: [],
  employmentIncomePerFortnight: toCents(0),
  workBonusBalance: toCents(0),
  ...over,
});

const SETTINGS = (asAtDate, planningHorizonAge = 51) => ({
  asAtDate,
  planningHorizonAge,
  // Pay rising with wages (2026-09-23) is not this fixture's subject: `awote: 0` holds every salary at the figure stated. A proved control: every figure this file asserts is the same at nil on the build before pay rose.
  economicSeries: { cpi: 0.025, pblci: 0.025, awote: 0, mtawe: 0.035 },
  deemingRates: { lower: 0.0175, upper: 0.0375 },
  nominalReturn: 0.065,
  // Interest on cash (2026-09-23) is not this fixture's subject: stated nil, the control proved byte-identical to the walk before it existed.
  cashInterestRate: 0,
});

/** Single-Person, deliberately: a mixed-SAPTO couple runs into register O30 instead. */
const alone = (fortnightly) => ({
  persons: [person('Val', '1976-05-10', { employmentIncomePerFortnight: toCents(fortnightly) })],
  homeStatus: 'occupied',
});
const SPEND = [{ id: 'spend', date: '2026-09-16', owner: 'household', type: 'SPEND_CHANGE', params: { annualSpend: toCents(60_000) }, enabled: true, createdAt: '2026-01-01' }];

// ⚠️ **`DIVISION_293_TRUE_UP_LINE` STARTS WITH `DIVISION_293_LINE`**, exactly as
// `TAX_TRUE_UP_LINE` starts with `Income tax` — so a `startsWith` filter picks up the settlement as
// though it were a thirteenth accrual. That cost this file a wrong count on its first run; it is
// recorded here rather than worked around silently, because any consumer summing these lines by
// description prefix has the same trap in front of it.
const div293Lines = (months) =>
  months
    .flatMap((month) => month.lines)
    .filter((line) => line.description.startsWith(DIVISION_293_LINE) && !line.description.startsWith(DIVISION_293_TRUE_UP_LINE));
const monthAt = (months, month) => months.find((m) => m.month === month);

// --- 1. THE CONTRIBUTIONS LIMB BINDS — Val, $260,000 ---------------------------------------------

test('Val at $260,000 pays $390.00 a month, and it is the CONTRIBUTIONS limb that binds', () => {
  // HAND-DERIVED, and every figure comes from a mechanism named beside it:
  //
  //   salary                    $10,000 a fortnight × 26          = $260,000.00
  //   s 293-20(1)(a) base       $260,000 − $1,000 work deduction  = $259,000.00
  //   Superannuation Guarantee  12% of $260,000, which is below
  //                             SGAA s 10A(5)'s $270,830 ceiling  =  $31,200.00
  //   s 293-20(1) sum           $259,000 + $31,200                = $290,200.00
  //   excess over $250,000                                        =  $40,200.00
  //   taxable contributions     min($31,200, $40,200)             =  $31,200.00  ← contributions
  //   Division 293 tax          15% of $31,200                    =   $4,680.00 a year
  //   monthly accrual           $4,680 ÷ 12                       =     $390.00
  //
  // **This is the case in which the taper and the cliff agree**, and it is asserted first so that
  // the fixture in §2 — where they differ by $2,940 a year — is read as the other half of a pair.
  const months = project(SETTINGS('2026-09-16'), alone(10_000), SPEND);
  const lines = div293Lines(months);
  assert.equal(lines.length, months.length, 'the charge is monthly and every month of this walk is over the threshold');
  const september = lines[0];
  assert.equal(september.amount, toCents(390));
  assert.equal(september.description, 'Division 293 tax, Val');
  assert.equal(september.provenance.register, 'Division 293 tax');
  assert.equal(september.provenance.fy, '2026-27');

  // The determination reports WHICH limb bound — the one fact a reader cannot recover from $390.00.
  const determination = september.provenance.determination.join(' ');
  assert.match(determination, /the low tax contributions limb bound/);
  assert.match(determination, /15% of 3120000 cents/);
  assert.match(determination, /the 4020000 cents by which 29020000 exceeds the 25000000 cent threshold/);
  // And the threshold in that sentence is the register's frozen record, not a literal in the walk.
  assert.equal(SUPERANNUATION.division293.threshold.value, toCents(250_000));
  assert.equal(SUPERANNUATION.division293.rate.value, 0.15);
});

// --- 2. THE EXCESS LIMB BINDS — the taper, where a cliff would be 3.4× the truth -----------------

test('at $231,400 the EXCESS limb binds: $102.10 a month, and a cliff would charge $347.10', () => {
  // HAND-DERIVED:
  //
  //   salary                    $8,900 a fortnight × 26           = $231,400.00
  //   s 293-20(1)(a) base       $231,400 − $1,000                 = $230,400.00
  //   Superannuation Guarantee  12% of $231,400                   =  $27,768.00
  //   s 293-20(1) sum                                             = $258,168.00
  //   excess over $250,000                                        =   $8,168.00
  //   taxable contributions     min($27,768, $8,168)              =   $8,168.00  ← THE EXCESS
  //   Division 293 tax          15% of $8,168                     =   $1,225.20 a year
  //   monthly accrual                                             =     $102.10
  //
  // **A cliff — 15% of the whole $27,768 of contributions — would be $4,165.20 a year, $347.10 a
  // month: 3.4 times the truth.** That is the mutation this fixture exists to kill, and Val's
  // $260,000 fixture in §1 cannot kill it, because there the two readings agree to the cent.
  //
  // **Why this salary and not a rounder one.** The excess binds exactly while the annual salary is
  // under $251,000: the sum is `1.12 S − 1,000`, so the excess is `1.12 S − 251,000` and it is less
  // than the contributions `0.12 S` when `S < 251,000`. It is over the threshold at all only above
  // `S = 224,107.15`. $231,400 = $8,900 a fortnight sits inside that band with room either side.
  const months = project(SETTINGS('2026-09-16'), alone(8_900), SPEND);
  const lines = div293Lines(months);
  assert.equal(lines.length, months.length);
  assert.equal(lines[0].amount, toCents(102.10));
  assert.notEqual(lines[0].amount, toCents(347.10), 'the cliff figure — 15% of the whole of the low tax contributions');
  assert.match(lines[0].provenance.determination.join(' '), /the excess limb bound: 15% of 816800 cents/);

  // The pair, as arithmetic rather than as prose: the same Person's contributions are $27,768 and
  // the charge is NOT 15% of them.
  assert.equal(toCents(27_768) * 0.15, toCents(4_165.20));
  assert.equal(toCents(8_168) * 0.15, toCents(1_225.20));
  assert.equal(toCents(1_225.20) / 12, toCents(102.10));
});

// --- 3. THE THRESHOLD, BOTH SIDES -----------------------------------------------------------------

test('a Person one fortnightly dollar under the threshold pays NOTHING, and one dollar over pays the TAPER', () => {
  // HAND-DERIVED, and the two walks differ by ONE DOLLAR A FORTNIGHT:
  //
  //   $8,619 a fortnight = $224,094 a year → base $223,094 + SG $26,891.28 = $249,985.28  → UNDER
  //   $8,620 a fortnight = $224,120 a year → base $223,120 + SG $26,894.40 = $250,014.40  → OVER
  //
  // s 293-20(1) says "exceeds", strictly, so the first pays nothing at all — not a nil line, no
  // line. The second is $14.40 over, and the taper charges 15% of THAT: $2.16 a year, 18 cents a
  // month. A cliff would charge 15% of $26,894.40 — $4,034.16 a year — for being $14.40 over the
  // line, which is the shape of error the `min` exists to prevent.
  const under = project(SETTINGS('2026-09-16'), alone(8_619), SPEND);
  const over = project(SETTINGS('2026-09-16'), alone(8_620), SPEND);

  assert.deepEqual(div293Lines(under), [], 'a Person under the threshold is charged nothing, and no line is written');
  assert.equal(div293Lines(over).length, over.length);
  assert.equal(div293Lines(over)[0].amount, toCents(0.18));
  assert.match(div293Lines(over)[0].provenance.determination.join(' '), /the excess limb bound: 15% of 1440 cents/);

  // The sums, stated as arithmetic so the boundary is not merely "somewhere around here".
  assert.equal(toCents(223_094) + toCents(26_891.28), toCents(249_985.28));
  assert.equal(toCents(223_120) + toCents(26_894.40), toCents(250_014.40));
  assert.ok(toCents(249_985.28) < SUPERANNUATION.division293.threshold.value);
  assert.ok(toCents(250_014.40) > SUPERANNUATION.division293.threshold.value);

  // And the ONLY line the two walks do not share is this one: the Person under the threshold has
  // every other line the Person over it has, so the charge is what crossing the line does and not
  // some other consequence of the extra dollar.
  const names = (months) => [...new Set(months.flatMap((m) => m.lines).map((line) => line.description))].sort();
  assert.deepEqual(
    names(over).filter((name) => !names(under).includes(name)),
    ['Division 293 tax, Val'],
  );
  assert.deepEqual(names(under).filter((name) => !names(over).includes(name)), []);
});

test('a Person well under the threshold is never charged, in any month of any of these walks', () => {
  // $100,000 a year: base $99,000, Guarantee $12,000, sum $111,000 — $139,000 under the threshold.
  const modest = project(SETTINGS('2026-09-16'), alone(100_000 / 26), SPEND);
  assert.deepEqual(div293Lines(modest), []);
  // And a Person with no employment at all has no low tax contributions to be charged on.
  const retired = project(SETTINGS('2026-09-16'), alone(0), SPEND);
  assert.deepEqual(div293Lines(retired), []);
  // Vacuity control: these walks ran and have months in them.
  assert.ok(modest.length > 0 && retired.length > 0);
});

// --- 4. WHO PAYS IT: the individual, out of cash --------------------------------------------------

test('the charge comes out of CASH and the superannuation interest is untouched to the cent', () => {
  // ITAA 1997 Subdiv 293-B lets the Person elect to have the amount released from the fund. This
  // build does not model that election, so the statutory default stands: the individual pays, out of
  // the same cash the salary arrives in. Both halves are asserted, because a `cash` outflow that
  // also reduced the fund would be the double charge, and a `wealth` outflow against the interest
  // would be the unmodelled election.
  const months = project(SETTINGS('2026-09-16'), alone(10_000), SPEND);
  const september = monthAt(months, '2026-09');
  const charge = september.lines.find((line) => line.description.startsWith(DIVISION_293_LINE));
  assert.equal(charge.effect, 'cash');
  assert.equal(charge.direction, 'outflow');

  // The fund receives the Guarantee NET OF THE FUND'S 15% and of nothing else: $31,200 ÷ 12 =
  // $2,600.00 a month, less 15% = $2,210.00. A charge taken from the fund would show here.
  const credit = september.lines.find((line) => line.description.startsWith('Superannuation Guarantee into superannuation'));
  assert.equal(credit.amount, toCents(2_210));
  assert.equal(credit.effect, 'wealth');
  assert.deepEqual(
    september.lines.filter((line) => line.effect === 'wealth' && line.direction === 'outflow'),
    [],
    'nothing is taken OUT of a pool this month — the charge is not being released from the fund',
  );

  // And the month reconciles with the charge in it, so the cash really moved.
  for (const m of months) {
    const closing = m.lines.reduce(
      (balance, line) => balance + (line.effect !== 'cash' ? 0 : line.direction === 'inflow' ? line.amount : -line.amount),
      m.openingBalance,
    );
    assert.equal(closing, m.closingBalance, `${m.month} does not reconcile`);
  }

  // The treatment is NAMED on the line, rather than left to be inferred from a dollar figure.
  //
  // ⚠️ **THE SENTENCE CHANGED AT P6-10 M3, AND THE OLD ONE WAS ASSERTING SOMETHING THAT STOPPED
  // BEING TRUE.** It read *"the Subdiv 293-B election … is NOT modelled (register O84)"*, and the
  // election IS modelled now — performed once a year at the settlement. What is still true of THIS
  // line is narrower and is the design rule of M3: the monthly accrual is taken in cash from EVERY
  // Person, electing or not, because the amount a release authority can name is the YEAR's assessed
  // liability and no monthly figure is that. Val elects nothing, so hers is also final.
  const determination0 = charge.provenance.determination.join(' ');
  assert.match(determination0, /PAID BY THE INDIVIDUAL OUT OF CASH, AND THIS ACCRUAL IS PROVISIONAL FOR EVERY PERSON/);
  assert.match(determination0, /performed at the YEAR-END SETTLEMENT \(P6-10 M3, register O84\)/);
  assert.doesNotMatch(determination0, /is NOT modelled \(register O84\)/);
});

// --- 5. THE YEAR-END TRUE-UP, BOTH DIRECTIONS -----------------------------------------------------

const workPattern = (id, date, annualSalary) => ({
  id,
  date,
  owner: 'personA',
  type: 'WORK_PATTERN_CHANGE',
  params: annualSalary === 0 ? { daysPerWeek: 0, annualSalary: toCents(0) } : { daysPerWeek: 5, annualSalary: toCents(annualSalary) },
  enabled: true,
  createdAt: '2026-01-01',
});
const JULY_SPEND = [{ id: 'spend', date: '2026-07-01', owner: 'household', type: 'SPEND_CHANGE', params: { annualSpend: toCents(60_000) }, enabled: true, createdAt: '2026-01-01' }];

test('a year that never crossed the threshold is REFUNDED in the following July', () => {
  // Val is paid $260,000 and stops working on 1 January 2027. The monthly accrual charged her
  // $390.00 for each of the six months she worked, because each of those months was assessed as a
  // full year at $260,000 — which is what a monthly accrual IS. Her year was not that year:
  //
  //   year's assessable salary   6 × $21,666.67                    = $130,000.02
  //   s 293-20(1)(a) base        $130,000.02 − $1,000              = $129,000.02
  //   year's Guarantee           6 × $2,600.00                     =  $15,600.00
  //   s 293-20(1) sum                                              = $144,600.02  → UNDER $250,000
  //   Division 293 tax for the year                                =       $0.00
  //   accrued                    6 × $390.00                       =   $2,340.00
  //   settled in July 2027       an INFLOW of                      =   $2,340.00
  const months = project(SETTINGS('2026-07-01', 52), alone(10_000), [...JULY_SPEND, workPattern('stop', '2027-01-01', 0)]);
  const accrued = div293Lines(months);
  assert.equal(accrued.length, 6, 'six months of employment, six monthly accruals');
  assert.deepEqual([...new Set(accrued.map((line) => line.amount))], [toCents(390)]);

  const july = monthAt(months, '2027-07');
  const trueUp = july.lines.filter((line) => line.description.startsWith(DIVISION_293_TRUE_UP_LINE));
  assert.deepEqual(
    trueUp.map(({ provenance, attribution, ...line }) => line),
    [{ direction: 'inflow', effect: 'cash', description: 'Division 293 tax year-end true-up, Val, 2026-27', amount: toCents(2_340) }],
  );
  // **The stamp is the year that ENDED, not the month's own year** — a settlement assessed under
  // FY2027-28's figures would be the wrong year's threshold applied to the right year's income.
  assert.equal(trueUp[0].provenance.fy, '2026-27');
  assert.equal(trueUp[0].provenance.register, 'Division 293 tax year-end true-up');
  // It lands in exactly one month, once.
  assert.equal(months.flatMap((m) => m.lines).filter((line) => line.description.startsWith(DIVISION_293_TRUE_UP_LINE)).length, 1);
});

test('a year the monthly accrual UNDER-charged is settled the other way: an amount OWED', () => {
  // s 293-20(1)'s charge is a `min` of two straight lines, so it is CONCAVE in the Person's income —
  // and twelve annualised months of a moving income therefore accrue LESS than the year's own
  // assessment, not more. This is that case, and it is the one that would leave the Household better
  // off than the law does if the settlement ran in one direction only.
  //
  //   Jul–Dec at $200,000:  base $199,000 + SG $24,000 = $223,000       → nil, no line
  //   Jan–Jun at $300,000:  base $299,000 + SG $32,499.60 (12% of SGAA
  //                         s 10A(5)'s $270,830 ceiling) = $331,499.60  → excess $81,499.60,
  //                         so the CONTRIBUTIONS bind: 15% × $32,499.60 = $4,874.94 a year,
  //                         $406.25 a month (`mulCents` rounds $406.245 up)
  //   accrued               6 × $406.25                                 =   $2,437.50
  //
  //   the year's own assessment:
  //   year's salary         6 × $16,666.67 + 6 × $25,000                = $250,000.02
  //   base                  less $1,000                                 = $249,000.02
  //   year's Guarantee      6 × $2,000.00 + 6 × $2,708.30               =  $28,249.80
  //   sum                                                               = $277,249.82
  //   excess                                                            =  $27,249.82  ← binds now
  //   tax                   15% of $27,249.82                           =   $4,087.47
  //   settled in July 2027  an OUTFLOW of $4,087.47 − $2,437.50         =   $1,649.97
  const months = project(SETTINGS('2026-07-01', 52), alone(0), [
    ...JULY_SPEND,
    workPattern('start', '2026-07-01', 200_000),
    workPattern('raise', '2027-01-01', 300_000),
  ]);
  const accrued = div293Lines(months).filter((line) => line.provenance.fy === '2026-27');
  assert.equal(accrued.length, 6, 'the six months at $200,000 are under the threshold and charge nothing');
  assert.deepEqual([...new Set(accrued.map((line) => line.amount))], [toCents(406.25)]);

  const july = monthAt(months, '2027-07');
  const trueUp = july.lines.filter((line) => line.description.startsWith(DIVISION_293_TRUE_UP_LINE));
  assert.deepEqual(
    trueUp.map(({ provenance, attribution, ...line }) => line),
    [{ direction: 'outflow', effect: 'cash', description: 'Division 293 tax year-end true-up, Val, 2026-27', amount: toCents(1_649.97) }],
  );
  assert.equal(trueUp[0].provenance.fy, '2026-27');
  // The settlement's own limb, reported: the EXCESS binds over the year even though the
  // CONTRIBUTIONS bound in each of the six months that were accrued.
  assert.match(trueUp[0].provenance.determination.join(' '), /the excess limb bound: 15% of 2724982 cents/);
  assert.match(trueUp[0].provenance.determination.join(' '), /assessed once on the twelve months of FY2026-27/);
});

test('a year whose income never moved is NOT settled — the de-minimis, and no line at all', () => {
  // Val at a flat $260,000 accrues $390.00 twelve times, which is $4,680.00, which is the year's own
  // assessment to the cent. The gap is nil, and a nil gap writes no line — the same de-minimis rule
  // the income-tax settlement uses, and the reason a flat walk does not carry a four-cent line every
  // July forever.
  const months = project(SETTINGS('2026-07-01', 52), alone(10_000), JULY_SPEND);
  const accrued = div293Lines(months).filter((line) => line.provenance.fy === '2026-27');
  assert.equal(accrued.length, 12);
  assert.equal(accrued.reduce((total, line) => total + line.amount, 0), toCents(4_680));
  assert.deepEqual(months.flatMap((m) => m.lines).filter((line) => line.description.startsWith(DIVISION_293_TRUE_UP_LINE)), []);
});

// --- P6-9 CHUNK 4 --- NO CONSUMER GROUPS LINES BY DESCRIPTION PREFIX, AND THAT IS WHY THE PAIR IS
// SAFE ------------------------------------------------------------------------------------------
//
// `DIVISION_293_TRUE_UP_LINE` starts with `DIVISION_293_LINE`, exactly as `Income tax year-end
// true-up` starts with `Income tax`. Every consumer that filters lines by PREFIX therefore counts
// the July settlement as a thirteenth accrual of the year it settles, and adds a figure of one
// sign to eleven or twelve of the other. This file works around it by hand (`div293Lines`), which
// is a defence of this file and of nothing else.
//
// **What is asserted here is that no module under `src/` has the trap in front of it at all**: the
// only thing `src/` ever does to a line description is compare it whole (`===`, in `outcomes.ts`),
// and every prefix, substring, regex and split lives in `test/` and `scripts/`. That is a real
// ratchet and not a restatement: adding `line.description.startsWith(DIVISION_293_LINE)` to a
// renderer or a total is exactly how the settlement gets counted as an accrual on a user's screen,
// and it would fail here the day it is written rather than the day someone reads the figure.
const SRC = resolve(dirname(fileURLToPath(import.meta.url)), '..', 'src');
const tsFiles = (dir) =>
  readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? tsFiles(path) : name.endsWith('.ts') ? [path] : [];
  });
// Comments stripped and every literal blanked, so a description quoted in prose is not a consumer —
// and so `'Income tax'` written inside a string cannot satisfy the vacuity control below either.
const executableCode = (text) =>
  text
    .replaceAll(/\/\*[\s\S]*?\*\//g, '')
    .replaceAll(/`(?:[^`\\]|\\.)*`|'(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*"|\/\/.*$/gm, (match) =>
      match.startsWith('//') ? '' : '""',
    );

test('the true-up line starts with the accrual line, which is the trap every prefix consumer walks into', () => {
  // Stated as an executable fact rather than as a comment: if the two names are ever made
  // independent, the workaround above becomes unnecessary and this file should be told.
  assert.ok(DIVISION_293_TRUE_UP_LINE.startsWith(DIVISION_293_LINE));
  assert.notEqual(DIVISION_293_TRUE_UP_LINE, DIVISION_293_LINE);
  // And the same shape one layer up, which is why `DIVISION_293_LINE` deliberately does NOT begin
  // with `Income tax`: a consumer summing `/^Income tax/` must not pick up a different tax.
  assert.ok(!DIVISION_293_LINE.startsWith('Income tax'));
});

test('no module under src/ filters or groups a line by DESCRIPTION PREFIX — it compares whole, or not at all', () => {
  const offenders = [];
  let wholeComparisons = 0;
  for (const path of tsFiles(SRC)) {
    const code = executableCode(readFileSync(path, 'utf8'));
    for (const [match] of code.matchAll(
      /\.description\s*\??\.\s*(?:startsWith|endsWith|includes|indexOf|lastIndexOf|match|matchAll|search|slice|split|substring|substr|replace|replaceAll)\s*\(/g,
    )) {
      offenders.push(`${path.slice(SRC.length + 1)}: ${match.trim()}`);
    }
    wholeComparisons += [...code.matchAll(/\.description\s*===/g)].length;
  }
  assert.deepEqual(
    offenders,
    [],
    'a module under src/ takes a line description apart instead of comparing it whole, which counts a year-end true-up as a thirteenth accrual',
  );
  // ⚠️ **The vacuity control.** A sweep of pure absence passes trivially if the walk or the strip
  // finds nothing at all, so the whole-description comparisons that DO exist are counted: TEN —
  // four in `outcomes.ts` against `AGE_PENSION_LINE` and `SHORTFALL_LINE`, one in
  // `app/incomeHeadline.ts` (P4-5d), which counts the months an Age Pension was actually paid in,
  // four added by P10-1/P10-3 on 2026-09-21: two in `core/sustainableSpend.ts` (the shortfall
  // line a candidate is judged on, and the spending line its canary reads) and two on one line of
  // `app/sustainableSpendHeadline.ts` (the loan's interest and principal), and one added by P6-8
  // microtask 4 on 2026-09-22: `app/comparisonSeries.ts`'s `agePensionSummary`, the SAME
  // `AGE_PENSION_LINE` count as `incomeHeadline.ts`'s, read for the comparison view's Scenario list
  // rather than the focused headline. **Was NINE until that day.** If this number moves, the sweep
  // above is reading a different `src/` than it was built against.
  //
  // **One whole comparison is NOT in this count and is deliberately left out of it.**
  // `incomeHeadline.ts`'s `lineTotal` tests membership — `descriptions.includes(line.description)` —
  // which is `===` against each element of a literal array and is exactly as safe as the ten, but
  // it is not the shape this counter matches. Raising the count by widening the regex would
  // change what the OFFENDER sweep above reads as well, and the offender sweep is the assertion that
  // matters. Recorded here so the count is a decision and not a miscount.
  // **ELEVEN since 2026-09-23**: `app/monthToRows.ts`'s `agePensionPaid`, the month table's Age
  // Pension column — `AGE_PENSION_LINE` again, compared whole. (`Month.incomeFromSuper` is summed in
  // the walk by `Set.has` over whole descriptions, which this counter does not match either.)
  // **THIRTEEN since 2026-09-24**: `app/chat/tools/solveSustainableSpend.ts` compares the loan's
  // interest and principal lines whole, on one line — the same pair, and the same check, as
  // `app/sustainableSpendHeadline.ts`, for the connector's sustainable-spend tool (plan_ai.md §13
  // microtask 8).
  // **FOURTEEN since 2026-09-24 (P13-1b)**: `app/sustainableSpendHeadline.ts`'s `paidInThisWalk`, which says
  // the pension-indexation caveat only where a month pays the Age Pension: `AGE_PENSION_LINE`, compared whole.
  // **FIFTEEN since 2026-09-25 (P16-2)**: `app/financialSituationPhases.ts` finds the Age Pension's first
  // month for the retirement sentence: `AGE_PENSION_LINE`, compared whole.
  // **SEVENTEEN since 2026-09-25 (P9-6)**: `app/downsizerAgePension.ts` totals the Age Pension paid:
  // `AGE_PENSION_LINE` and `AGE_PENSION_BEREAVEMENT_LINE`, each compared whole.
  assert.equal(wholeComparisons, 17, 'the whole-description comparisons in src/ have moved, so the absence above proves nothing');
});
