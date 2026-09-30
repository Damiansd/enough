// P4-5b — the Pension-Only Age, read off the walk. CONTEXT.md: *"the age at which all assets are
// exhausted and the Household lives on Age Pension alone."*
//
// **The three false positives this file is written against**, each with the fixture that closes it
// and the DOLLAR FIGURE that separates it from a passing answer:
//
//   1. **A Household that holds nothing but its OFFSET is not exhausted.** `Month.openingBalance` /
//      `closingBalance` IS the Offset Account (P4-3b). **Rewritten 2026-09-18, when the user ruled
//      that the Offset is assessed at its CURRENT balance**: until that day `splitAssets` never saw
//      it, so this was a hole in `assessableAssets` and §3's Household reported nil assets while
//      holding a quarter of a million dollars. It is assessed now — so the hole is closed on the
//      figure, and `livesOnPensionAlone` excludes the Offset from conditions 1 to 4 *on purpose*,
//      which reopens exactly the same false positive one level up. What closes it is condition 5,
//      the marker's alone: the month must OPEN with nil cash. §3 is a Household with no wage, an
//      `Age Pension` line and **$246,768.34 in the bank**, whose conditions 1 to 4 hold for sixty
//      unbroken months and whose answer is `'never'`. §4 is the same Household spending hard: the
//      month before the marker opens with nil cash but **$976.81** of super still to draw, and is not
//      the marker; the marker month opens with neither.
//   2. **`assessableAssets === 0` while the YOUNGER PARTNER's super is exempt.** §5 holds
//      **$338,486.36** of Accumulation Phase super belonging to a Person under Age Pension age —
//      exempt from both tests (§4.8), so it lands in `protectedAssets` and not in `assessableAssets`
//      — and its answer is `'never'` for all 345 months of the walk.
//   3. **The refused proxy: *"first month with an `Age Pension` line and no `Salary, …` line"*.**
//      That is a RETIREMENT age. In §3 it would answer 2031-07; the truth is that the money never
//      runs out at all, and in §4, where it does, the two answers are **thirty-four months apart** (2031-07 and 2034-05).
//
// And the false NEGATIVE, which is the other half: a Household that banks part of its pension has
// not stopped living on the pension alone. §2 banks $1,231.35 in its first pension-only month and
// climbs to $124,255.08 by the horizon, and its Pension-Only Age is the same month as §1's.
//
// **Every fixture is a COUPLE born three and a half years apart** — Sam 1956-06-15 and Ali
// 1952-11-20 — so every age assertion is a pair of DIFFERENT numbers in a stated order, and a
// marker that reported one person, or the wrong one, would be a different assertion.
import test from 'node:test';
import assert from 'node:assert/strict';

import { toCents } from '../dist/core/money.js';
import { AGE_PENSION_LINE, SHORTFALL_LINE, project } from '../dist/core/projection.js';
import { pensionOnlyAge, shortfallAge } from '../dist/core/outcomes.js';

/**
 * A series reaching the Planning Horizon, from four STATED and mutually different growth paths —
 * the shape `test/age-pension-forward-indexation.test.mjs` uses, and the reason every fixture here
 * can be asked this question at all: see §6.
 */
const longSeries = (lastYear) => {
  const rateIndexations = [];
  const meansTestIndexations = [];
  let mtawe = 107_000;
  for (let year = 2027; year <= lastYear; year += 1) {
    for (const month of ['03-20', '09-20']) {
      mtawe *= 1.0175;
      rateIndexations.push({
        effective: `${year}-${month}`,
        cpi: 1.0125,
        pblci: 1.011,
        annualisedMtawe: toCents(Math.round(mtawe)),
      });
    }
    meansTestIndexations.push({ effective: `${year}-07-01`, cpiMarchQuarter: 1.025, cpiDecemberQuarter: 1.0245 });
  }
  return { rateIndexations, meansTestIndexations };
};
const SERIES = longSeries(2075);

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

/** Sam holds a $240,000 Account-Based Pension and a $140,000 parcel; Ali holds nothing at all. */
const COUPLE = {
  persons: [
    person('Sam', '1956-06-15', {
      superInterests: [
        {
          phase: 'accountBasedPension',
          balance: toCents(240_000),
          statedStreamSettings: { commencementDay: '2024-07-01' },
        },
      ],
      parcels: [{ acquired: '2014-03-10', costBase: toCents(70_000), marketValue: toCents(140_000) }],
    }),
    person('Ali', '1952-11-20'),
  ],
  homeStatus: 'occupied',
};

/** Both are past Age Pension age at `asAtDate`, and the horizon is Sam's 80th: 2026-07 → 2036-06. */
const SETTINGS = {
  asAtDate: '2026-07-01',
  planningHorizonAge: 80,
  // ⚠️ **`cpi: 0`, AND IT IS THE ALGEBRAIC CONTROL RATHER THAN A SPECIAL CASE** (register O85,
  // user ruling 2026-09-21). The stated spending level is a REAL figure now and `project()` raises it
  // to each month's own price level, so at any positive CPI every hand-worked figure below would
  // carry a `(1 + cpi) ^ (n / 12)` in it and this fixture would be arithmetic about indexation rather
  // than about what it was written for. At nil the factor is exactly 1 in every month
  // (`core/priceLevel.ts`), so every figure here is the figure it was hand-worked as. The indexation
  // itself is asserted in `test/core-projection-waterfall.test.mjs` §8, on its own fixture.
  // Pay rising with wages (2026-09-23) is not this fixture's subject: `awote: 0` holds every salary at the figure stated. A proved control: every figure this file asserts is the same at nil on the build before pay rose.
  economicSeries: { cpi: 0, pblci: 0.025, awote: 0, mtawe: 0.035, agePension: SERIES },
  deemingRates: { lower: 0.0175, upper: 0.0375 },
  nominalReturn: 0.065,
};

const entry = (id, type, date, params, owner = 'household') => ({
  id,
  date,
  owner,
  type,
  params,
  enabled: true,
  createdAt: '2026-06-01',
});

const SPEND_160K = entry('sc', 'SPEND_CHANGE', '2026-07-01', { annualSpend: toCents(160_000) });
const monthAt = (months, isoMonth) => months.find((m) => m.month === isoMonth);
/**
 * **What the Household holds BESIDES the Offset Account, since P4-3b.** The Offset is assessed at
 * the balance the month opens with, so for every Household in this file — none of which holds
 * anything protected except in §5 — `assessableAssets` is the super and the parcels PLUS the running
 * cash. This is the figure `livesOnPensionAlone`'s condition 1 is really about, and it is nil
 * exactly when the Household holds nothing but its own banked pension.
 */
const heldBesidesTheOffset = (month) => month.assessableAssets - month.openingBalance;
const shortMonths = (months) => months.filter((m) => m.lines.some((l) => l.description === SHORTFALL_LINE));
/**
 * Conditions 1 to 4 — the STATE, re-derived here from the month's own figures and lines so that the
 * floor on `pointOfNoRecovery` is measured against something other than the implementation.
 */
const inStateMonths = (months) =>
  months.filter((m) => {
    // **The Offset is excluded from condition 1, ruled 2026-09-18 with P4-3b** — since the Offset
    // Account is IN the means test, a Household that banks part of its pension payment has non-nil
    // assessable assets from the following month, and reading condition 1 literally would break the
    // run after ONE month for the §2 Household below. Exhaustion is an EVENT (condition 5, the
    // marker's alone) and living on the pension is a STATE. Re-derived here rather than imported,
    // exactly as before.
    if (!(m.assessableAssets === 0 || m.assessableAssets === m.openingBalance) || m.protectedAssets !== 0) return false;
    const inflows = m.lines.filter((l) => l.direction === 'inflow');
    return (
      inflows.some((l) => l.description === AGE_PENSION_LINE) &&
      inflows.every((l) => l.description === AGE_PENSION_LINE || l.description === SHORTFALL_LINE)
    );
  });
/** The RETIREMENT-age proxy this marker refuses, computed here so its wrong answer can be named. */
const refusedProxyMonth = (months) =>
  months.find(
    (m) =>
      m.lines.some((l) => l.description === AGE_PENSION_LINE) &&
      !m.lines.some((l) => l.description.startsWith('Salary')),
  )?.month;

// --- 1. THE MARKER, HAND-WORKED — and it is not a second spelling of the Shortfall Age -----------

test('EXHAUSTED — the month, the two ages in it, and the 72 months that follow', () => {
  const months = project(SETTINGS, COUPLE, [SPEND_160K]);
  assert.equal(months.length, 120);

  // THE WALK: $160,000 a year against $240,000 of pension and $140,000 of parcels. Each year's
  // pension minimum pays first, then limb 3 sells parcels, then the pension ABOVE its minimum pays out
  // (the order since 2026-09-23), and 2030-06 is the month the LAST of the pension goes — $317.73 of
  // it, which is why that month still reports assessable assets and is not the marker. (Until
  // 2026-09-23 the whole pension paid first and the last thing to go was $317.69 of PARCEL: both
  // pools earn the same 6.5%, so swapping their order moves the month's residue by flooring alone.)
  const june = monthAt(months, '2030-06');
  assert.equal(june.assessableAssets, toCents(317.73));
  assert.equal(
    june.lines.find((l) => l.description === 'Account-Based Pension payment, Sam').amount,
    toCents(317.73),
  );
  assert.equal(june.lines.filter((l) => l.description.startsWith('Non-Super Portfolio sale')).length, 0);

  // 2030-07 is the first month with NOTHING: nil assessable assets, nil protected assets, and it
  // OPENS with nil cash. Its only inflows are the Age Pension and the shortfall, and the shortfall
  // is money the plan requires and does not have, never money received.
  const july = monthAt(months, '2030-07');
  assert.equal(july.assessableAssets, toCents(0));
  assert.equal(july.protectedAssets, toCents(0));
  assert.equal(july.openingBalance, toCents(0));
  assert.deepEqual(
    july.lines.filter((l) => l.direction === 'inflow').map((l) => [l.description, l.amount]),
    [
      [AGE_PENSION_LINE, toCents(4_564.69)],
      [SHORTFALL_LINE, toCents(8_768.65)], // $13,333.34 of spending less the $4,564.69 pension
    ],
  );

  const answer = pensionOnlyAge(months, COUPLE, SERIES);
  assert.equal(answer.outcome, 'pensionOnly');
  assert.equal(answer.firstPensionOnly.month, '2030-07');
  // THE AGES, from the dates of birth and the FIRST day of that month and nothing else:
  //   Sam, born 1956-06-15, on 2030-07-01: 2030 − 1956 = 74, and 07-01 is NOT before 06-15, so 74.
  //   Ali, born 1952-11-20, on 2030-07-01: 2030 − 1952 = 78, and 07-01 IS before 11-20, so 77.
  assert.deepEqual(answer.firstPensionOnly.ages, [
    { name: 'Sam', age: 74 },
    { name: 'Ali', age: 77 },
  ]);
  // 2030-07 to 2036-06 inclusive is 72 months, and nothing ever comes back.
  assert.equal(answer.monthsPensionOnly, 72);
  assert.equal(answer.recoveredAt, undefined);
  // ONE RUN, REACHING THE HORIZON, so the two readings coincide — and this fixture is therefore the
  // one that CANNOT prove the second field on its own; §9 moves them apart by 38 months.
  assert.equal(answer.pointOfNoRecovery.month, '2030-07');
  assert.deepEqual(answer.pointOfNoRecovery.ages, answer.firstPensionOnly.ages);
  assert.equal(inStateMonths(months)[0].month, '2030-07');
  assert.equal(inStateMonths(months).length, 72);

  // AND IT IS NOT THE SHORTFALL AGE. This Household falls short from 2030-06 — a month EARLIER,
  // while it still held $317.73 of pension — and stays short for all 73 remaining months. The two
  // markers are a month apart here and the next test moves one of them by 72 months without moving
  // the other.
  const short = shortfallAge(months, COUPLE);
  assert.equal(short.firstShortfall.month, '2030-06');
  assert.equal(short.monthsShort, 73);
  assert.notEqual(short.firstShortfall.month, answer.firstPensionOnly.month);
});

// --- 2. INDEPENDENT OF THE SHORTFALL AGE — the same marker, one month of shortfall ---------------

test('BANKING THE PENSION is still living on the Age Pension alone — $1,231.35 a month of it', () => {
  // The same Household, with its spending dropped to $40,000 from the month its money runs out. It
  // empties on the SAME DATE — 2030-07, to the month — and from there the $4,564.69 pension exceeds
  // the $3,333.34 bill, so it banks $1,231.35 in its very first pension-only month.
  const months = project(SETTINGS, COUPLE, [
    SPEND_160K,
    entry('sc2', 'SPEND_CHANGE', '2030-07-01', { annualSpend: toCents(40_000) }),
  ]);
  const july = monthAt(months, '2030-07');
  assert.equal(july.openingBalance, toCents(0));
  assert.equal(july.closingBalance, toCents(1_231.35)); // $4,564.69 − $3,333.34
  assert.equal(months.at(-1).closingBalance, toCents(124_255.08)); // and it climbs for six years

  const answer = pensionOnlyAge(months, COUPLE, SERIES);
  // **The requirement is on the month the assets ran out, not on every month.** A test demanding nil
  // cash in EVERY month would answer `'never'` here — for a Household that has nothing but its
  // pension and lives on it for six years — because it saves $1,231.35 of the first payment.
  assert.equal(answer.outcome, 'pensionOnly');
  assert.equal(answer.firstPensionOnly.month, '2030-07');
  assert.equal(answer.monthsPensionOnly, 72);
  assert.equal(answer.recoveredAt, undefined);

  // AND THE SHORTFALL AGE MOVED AND THIS ONE DID NOT. One short month in the whole walk — the
  // transition month 2030-06 — against §1's seventy-three, with an identical Pension-Only Age.
  // Pension-Only Age is a fact about ASSETS; Shortfall Age is a fact about the TARGET.
  const short = shortfallAge(months, COUPLE);
  assert.deepEqual(shortMonths(months).map((m) => m.month), ['2030-06']);
  assert.equal(short.monthsShort, 1);
  assert.equal(short.recovered, true);
  assert.equal(pensionOnlyAge(project(SETTINGS, COUPLE, [SPEND_160K]), COUPLE, SERIES).firstPensionOnly.month, '2030-07');
});

// --- 3. THE OFFSET REQUIREMENT — nil assessable assets and $254,483.76 in the bank ---------------

/** No super, no parcels, a modest wage until 2031-07, and $30,000 a year of spending. */
const WORKER = {
  persons: [person('Sam', '1956-06-15', { employmentIncomePerFortnight: toCents(1_500) }), person('Ali', '1952-11-20')],
  homeStatus: 'occupied',
};
const WORKER_ENTRIES = [
  entry('sc', 'SPEND_CHANGE', '2026-07-01', { annualSpend: toCents(30_000) }),
  entry('r', 'RETIRE', '2031-06-30', {}),
];

test('NIL ASSESSABLE ASSETS IS NOT EXHAUSTION — a quarter of a million in the bank, and the marker holds', () => {
  const months = project(SETTINGS, WORKER, WORKER_ENTRIES);

  // ⚠️ **THE PREMISE THIS FIXTURE WAS BUILT ON DIED ON 2026-09-18, AND THE FIXTURE DID NOT.** It
  // read: this Household's `assessableAssets` is nil in EVERY ONE of its 120 months, so a marker
  // built on the assets figure alone would announce a Household with $254,483.76 in the bank as
  // living on the pension alone. P4-3b put the Offset INTO the means test, so the premise is now
  // false in 119 of the 120 months — and the false positive it guards against is closed from the
  // other side instead. **That is what this test now defends, and it is the harder half**: the
  // Offset exclusion in `livesOnPensionAlone` (conditions 1 to 4, ruled on the same day) means the
  // STATE still holds for sixty unbroken months here, exactly as it did before — so if condition 5
  // did not exist, or read anything but `openingBalance === 0`, this Household would be reported as
  // exhausted while holding a quarter of a million dollars.
  //
  // ⚠️ **AND IT DIED A SECOND TIME ON 2026-09-20 (P6-8 brief 3, chunk 2b).** Sam is paid a wage,
  // so his employer now pays a Superannuation Guarantee into an accumulation interest — and Sam is
  // 70, so §4.8 does NOT exempt it: it is assessed. `assessableAssets` is therefore the Offset PLUS
  // that interest, and the two coincide in exactly ONE month, the first, which opens before any
  // Guarantee has been paid. Everything this test defends is unchanged, because what it defends is
  // condition 5 and the Offset EXCLUSION, neither of which reads the assets figure.
  assert.equal(months.filter((m) => m.assessableAssets === m.openingBalance).length, 1);
  assert.equal(months.filter((m) => m.assessableAssets === 0).length, 1, 'only 2026-07, which opens with nil cash');
  assert.equal(months[0].month, '2026-07');
  assert.equal(months[0].assessableAssets, months[0].openingBalance, 'the one month where the two coincide is month zero');
  // Nil PROTECTED assets in all 120, and that is the fact the marker's condition 1 reads: both
  // Persons are over Age Pension age, so nothing of theirs is exempt — not even the new interest.
  assert.equal(months.filter((m) => m.protectedAssets === 0).length, 120);

  // And it is not remotely exhausted. The wage banks money for five years; the month after the wage
  // stops, it opens with a quarter of a million dollars of drawable cash and takes in nothing but
  // the Age Pension — which is EXACTLY the shape a marker built on the assets figure alone would
  // announce as living on the pension alone.
  //
  // **$247,730.19, not the $254,483.76 this test asserted until P4-3b** — $6,753.57 less, and every
  // cent of the difference is Age Pension the deeming on that same growing balance took away over
  // sixty months. Hand-worked on the first month it can be seen in, 2026-08, where the balance is
  // small enough that the whole of it deems at the lower rate:
  //   Offset $3,801.53 (July's own pension and net pay, banked), far below the $110,600 couple
  //   deeming threshold → × 1.75% = $66.53 a year ÷ 26 = **$2.56 a fortnight** of deemed income
  //   → 50c in the dollar over the free area = $1.28 a fortnight of extra reduction, on the
  //   COMBINED rate, so $0.64 each and $1.28 to a Household with two eligible Persons
  //   → $1.28 × 26 ÷ 12 = **$2.77 a month**, and $3,051.53 − $2.77 = $3,048.76.
  //
  // **AND $2.99 SINCE CHUNK 2B, which is the same arithmetic on a bigger base.** August's deemed
  // assets are the $3,801.53 Offset PLUS $331.50 of superannuation — July's Guarantee, being 12% of
  // Sam's $39,000 ÷ 12 less the fund's 15% — so $4,133.03 deems to $72.33 a year, $2.78 a
  // fortnight, 22 cents more than the Offset alone. Halved by the taper and halved again per Person
  // before rounding, that is **22 cents a month** more reduction: $3,048.54.
  assert.equal(monthAt(months, '2026-08').openingBalance, toCents(3_801.53), 'the Guarantee is not cash and does not touch this');
  assert.deepEqual(monthAt(months, '2026-08').lines.find((l) => l.description === AGE_PENSION_LINE).amount, toCents(3_048.54));
  // July is the control: it opens before any Guarantee has been paid, and it did not move a cent.
  assert.equal(monthAt(months, '2026-07').lines.find((l) => l.description === AGE_PENSION_LINE).amount, toCents(3_051.53));
  assert.equal(toCents(3_051.53) - toCents(3_048.54), toCents(2.99));
  assert.equal(toCents(3_048.76) - toCents(3_048.54), toCents(0.22));

  const retired = monthAt(months, '2031-07');
  // **$246,847.07, not the $247,730.19 this test asserted until chunk 2b** — $883.12 less, and every
  // cent of it is the 22-cents-and-rising of extra taper worked above, compounded over sixty months
  // of deeming on a growing superannuation balance. The Household is not poorer for it: the same
  // sixty months put $23,316.06 into Sam's interest, so it is $22,432.94 better off in total and
  // holds less of it in cash. That is the direction a credited Guarantee must move a Household in.
  // **$246,768.34 since LR-3 (2026-09-30), $78.73 less again, and the same mechanism.** Sam's $39,000
  // earns a low income super tax offset of 15% x 12% x $39,000 = $702.00 for each of FY2027-28 to
  // FY2029-30, credited each July (FY2026-27 is a part year; FY2030-31's is not paid because his
  // account is a pension by then). His super at retirement is $2,391.83 higher (three credits and
  // their earnings), and that assessed super deems, so the pension, and the cash banked, is a little less.
  assert.equal(retired.openingBalance, toCents(246_768.34));
  assert.deepEqual(months.flatMap((m) => m.lines.filter((l) => /income super tax offset/i.test(l.description)).map((l) => [m.month, l.amount])),
    [['2028-07', toCents(702)], ['2029-07', toCents(702)], ['2030-07', toCents(702)]]);
  assert.equal(retired.assessableAssets - retired.openingBalance, toCents(25_707.89));
  assert.equal(toCents(25_707.89) - toCents(23_316.06), toCents(2_391.83));
  assert.equal(toCents(247_730.19) - toCents(246_847.07), toCents(883.12));
  assert.ok(retired.openingBalance > toCents(200_000), 'still a quarter of a million, which is the whole point');
  // The only CASH inflow is the pension. The second line is the month's return on the Guarantee's
  // interest — `wealth`, not cash, and it is the reason this filter names an effect now.
  assert.deepEqual(
    retired.lines.filter((l) => l.direction === 'inflow' && l.effect === 'cash').map((l) => l.description),
    [AGE_PENSION_LINE],
  );
  // **The label is the account's phase ON THE DAY, and on 2031-06-30 it changed (2026-09-23).** The
  // household's RETIRE is dated that day — the last day worked, so June is paid whole and July is the
  // first month with no wage — and Sam is 75, so his accumulation account became an account-based
  // pension that day, and from July its growth is reported as the pension's.
  // Nothing else in this month moved: Sam is past Age Pension age, so the account was assessed and
  // deemed before the switch exactly as it is after it, and the pension covers the month's bill, so
  // limb 2 draws nothing from it (the cash-inflow assertion above is unchanged).
  assert.deepEqual(
    retired.lines.filter((l) => l.direction === 'inflow' && l.effect === 'wealth').map((l) => l.description),
    ['Investment growth, Sam — Account-Based Pension'],
  );
  // **$406,275.54, not the $338,415.89 this test asserted until P4-8** — $67,859.65 more, and every
  // cent of it is Age Pension that the walk used to withhold from a Person who had stopped working.
  // Until 2026-09-19 the Household handed to the means test carried Sam's STATED $1,500 a
  // fortnight for all 120 months, `RETIRE` or no `RETIRE`, so the income test went on reducing the
  // pension against a wage that ended in 2031-06. Hand-worked on the retirement month itself,
  // 2031-07, where the Household opens with $247,730.19 and both are past pension age:
  //   maximum combined rate $2,178.94/fn; deemed income on the Offset $261.28/fn; income free
  //   area $448.02/fn combined.
  //   BEFORE: Sam's $1,500 wage less the $300 Work Bonus accrual = $1,200.00 assessed employment
  //   income, + $261.28 deemed = $1,461.28; less the free area = $1,013.26 excess; at 50c in the
  //   dollar = $506.63 off the combined rate → $1,672.31, and $1,672.32 to the Household once the
  //   couple's halving is rounded per Person.
  //   AFTER: $261.28 of deemed income alone, which is BELOW the free area, so no test binds at all
  //   and the Household is paid the maximum $2,178.94.
  //   The difference is $506.62/fn → × 26 ÷ 12 = **$1,097.68 in 2031-07**, which is the month's own
  //   figure; it climbs to $1,175.46 by 2036-06 because the old reduction grew with the deemed
  //   income on a balance that grew, while the new one does not exist. Sixty such months —
  //   2031-07 to the horizon, and NOT one month earlier — sum to $67,859.65.
  // The Offset does not grow, so this Household's wealth is its banked cash and nothing else:
  // Δclosing balance is Δpension summed, exactly, with no return compounding on top of it.
  // **$405,300.50 since chunk 2b, $975.04 below the P4-8 figure** — the same deeming cost as above,
  // carried to the horizon. The Household's TOTAL wealth is higher, not lower: Sam's interest holds
  // $31,777.43 at the last month's opening, so $30,802.39 of net wealth was added and $975.04 of
  // Age Pension was given up for it — thirty dollars gained for every dollar the means test took.
  //
  // ⚠️ **$412,378.82 SINCE THE SWITCH AT RETIREMENT (2026-09-23), $7,078.32 MORE, on two terms.**
  // Sam's account is an account-based pension from 2031-06-30, so each June it pays its Schedule 7
  // minimum — 6% at 75 to 79, on the 1 July balance, to the nearest $10 — and nobody needs it (the
  // pension covers the bill), so the June sweep lands in the Offset:
  //   FY2031-32: 6% × $23,316.06 = $1,398.96 → $1,400;  FY2032-33: 6% × $23,424.18 → $1,410;
  //   FY2033-34: 6% × $23,529.28 → $1,410;  FY2034-35: 6% × $23,641.22 → $1,420;
  //   FY2035-36: 6% × $23,750.36 → $1,430 (each balance is the one the July month opens with).
  //   Σ = **$7,070.00**. The other **$8.32** is Age Pension, in the six months from 2036-01 where the
  //   income test bites: the swept dollars stop earning 6.5% (the Offset earns nothing at `cpi: 0`),
  //   so the deemed total is a little lower and the pension a little higher.
  assert.equal(toCents(412_378.82) - toCents(405_300.50), toCents(1_400 + 1_410 + 1_410 + 1_420 + 1_430) + toCents(8.32));
  //
  // ⚠️ **$412,980.11 SINCE LR-3 (2026-09-30), $601.29 MORE, on three terms.** Each 1 July balance
  // is higher by the $2,391.83 of offset credits and their growth, so each sweep is higher:
  //   FY2031-32: 6% × $25,707.89 = $1,542.47 → $1,540;  FY2032-33: 6% × $25,830.73 = $1,549.84 → $1,550;
  //   FY2033-34: 6% × $25,951.51 = $1,557.09 → $1,560;  FY2034-35: 6% × $26,070.07 = $1,564.20 → $1,560;
  //   FY2035-36: 6% × $26,196.36 = $1,571.78 → $1,570.  Σ = **$7,780.00**, $710 more than $7,070.
  // Less the **$78.73** less cash at retirement (above; the Offset earns nothing, so it carries to the
  // horizon cent for cent), less **$29.98** of Age Pension: the extra super puts ~$3,000 more in the
  // assets, which deem at the upper 3.75%, so the income test now bites from 2035-12, a month
  // earlier ($1.52 there, the part of the extra deemed income that clears the free area), and in
  // 2036-01 to 2036-06, where both walks are in the taper, costs ΔA × 3.75% × 50% ÷ 12 a month:
  // $3,014.01 × 0.0015625 = $4.71 in January (paid $4.72 after per-Person rounding); $4.72, $4.73,
  // $4.72, $4.76, $4.77, $4.76 over the six, and $1.52 + $28.46 = $29.98.
  assert.equal(months.at(-1).closingBalance, toCents(412_980.11)); // the pension exceeds the bill; it grows
  assert.equal(toCents(412_980.11) - toCents(412_378.82), toCents(710) - toCents(78.73) - toCents(29.98));
  assert.equal(toCents(412_980.11) - toCents(405_300.50), toCents(1_540 + 1_550 + 1_560 + 1_560 + 1_570) - toCents(78.73) - (toCents(29.98) - toCents(8.32)));
  // The swept amounts, one per June, and their sum.
  const sweeps = months.flatMap((m) => m.lines.filter((l) => l.description === 'Account-Based Pension payment, Sam').map((l) => [m.month, l.amount]));
  assert.deepEqual(sweeps, [['2032-06', toCents(1_540)], ['2033-06', toCents(1_550)], ['2034-06', toCents(1_560)], ['2035-06', toCents(1_560)], ['2036-06', toCents(1_570)]],
    'the minimum is swept in June and in no other month');
  assert.equal(sweeps.reduce((s, [, a]) => s + a, 0), toCents(7_780));
  assert.equal(toCents(7_780) - toCents(1_400 + 1_410 + 1_410 + 1_420 + 1_430), toCents(710));
  // Pre-LR-3 the switch was worth the $7,070 of sweeps plus $8.32 of pension over six months (the
  // identity above, kept as history). Since LR-3 the kept-out account ALSO takes FY2030-31's $702
  // offset in 2031-07 (it is still accumulation then, so the fund can take it), and the switch is
  // worth $7,780 of sweeps plus **$20.77** of pension over SEVEN months, 2035-12 to 2036-06: both
  // walks are in the taper from 2035-12, and the kept-out walk's assessable assets are higher by
  // the swept dollars' lost growth and the $702 with its growth — $1,775.61 in 2035-12, so
  // $1,775.61 × 0.0015625 = $2.77 that month, rising to $3.17 by 2036-06.
  const keptOut = { ...WORKER, persons: WORKER.persons.map((p) => ({ ...p, superInterests: p.superInterests.map((i) => ({ ...i, keepInAccumulationAtRetirement: true })) })) };
  const unswitched = project(SETTINGS, keptOut, WORKER_ENTRIES);
  assert.equal(unswitched.at(-1).closingBalance, toCents(405_179.34));
  assert.equal(toCents(412_980.11) - toCents(405_179.34), toCents(7_780) + toCents(20.77));
  const unswitchedPensionGap = months.reduce((s, m, i) => s + (m.lines.find((l) => l.description === AGE_PENSION_LINE).amount
    - unswitched[i].lines.find((l) => l.description === AGE_PENSION_LINE).amount), 0);
  assert.equal(unswitchedPensionGap, toCents(20.77));
  assert.equal(monthAt(unswitched, '2035-12').assessableAssets - monthAt(months, '2035-12').assessableAssets, toCents(1_775.61));
  // And the unswitched walk itself: $405,300.50 → $405,179.34 is the same $78.73 of cash at
  // retirement plus $42.43 of pension, its income test also biting a month earlier (2035-12, $4.29)
  // and ~$6.30 a month harder after it on ~$4,000 more assets.
  assert.equal(toCents(405_300.50) - toCents(405_179.34), toCents(78.73) + toCents(42.43));
  assert.equal(toCents(406_275.54) - toCents(405_300.50), toCents(975.04));
  // Measured at the month's OPENING, which is where `Month.assessableAssets` is assessed.
  // **$25,161.69, not $31,777.43, since the switch**: the four sweeps before this June ($5,640) are
  // out of the account and so is the growth they would have earned there.
  // **$27,753.05 since LR-3 (2026-09-30), $2,591.36 more**: the $2,391.83 extra at 2031-07 compounds
  // at 6.5% for 59 months, less the $570 more swept out in the four Junes before this one (140, 140,
  // 150, 140) with the growth they would have earned: $2,591.41 on a month-by-month hand walk, the
  // 5 cents being each walk's own monthly rounding of growth to the cent. The four sweeps are $6,210.
  assert.equal(months.at(-1).assessableAssets - months.at(-1).openingBalance, toCents(27_753.05));
  assert.equal(toCents(27_753.05) - toCents(25_161.69), toCents(2_591.36));
  assert.equal(unswitched.at(-1).assessableAssets - unswitched.at(-1).openingBalance, toCents(35_994.10));
  assert.ok(toCents(35_994.10) - toCents(27_753.05) > toCents(1_540 + 1_550 + 1_560 + 1_560), 'more than the sweeps left: their growth went with them');
  assert.ok(toCents(27_753.05) > toCents(975.04) * 20, 'the Guarantee bought far more than the pension it cost');
  // **The pension is the MAXIMUM rate from the retirement to 2035-11, so it steps only when the rate
  // is indexed — ten distinct levels in those 53 months and never a step between them.** From
  // 2035-12 the deemed income on the Offset AND the Guarantee's interest finally passes the free
  // area and the income test starts biting, so the last seven months each carry their own figure:
  // seventeen levels over the sixty. Before chunk 2b the balance was smaller and the crossing never
  // happened inside the walk, which is why this was eleven; until LR-3 (2026-09-30) the crossing was
  // 2036-01, 54 + 6 months and sixteen levels — LR-3's extra ~$3,000 of assessed super moved it a month.
  const afterRetirement = months.filter((m) => m.month >= '2031-07');
  const rate = (m) => m.lines.find((l) => l.description === AGE_PENSION_LINE).amount;
  assert.equal(new Set(afterRetirement.map(rate)).size, 17);
  assert.equal(new Set(afterRetirement.filter((m) => m.month <= '2035-11').map(rate)).size, 10);
  assert.equal(afterRetirement.filter((m) => m.month <= '2035-11').length, 53);
  assert.equal(new Set(afterRetirement.filter((m) => m.month >= '2035-12').map(rate)).size, 7);
  assert.equal(rate(monthAt(months, '2035-11')) - rate(monthAt(months, '2035-12')), toCents(1.52));
  // And the working years did NOT move: the fix reaches the month `RETIRE` takes effect and no
  // earlier one. The two hand-worked 2026 figures above are the same to the cent as they were.
  assert.equal(months.filter((m) => m.month < '2031-07').length, 60);

  // THE ANSWER IS 'never', AND THE REFUSED PROXY'S ANSWER IS 2031-07.
  const answer = pensionOnlyAge(months, WORKER, SERIES);
  assert.equal(answer.outcome, 'never');
  assert.equal(answer.firstPensionOnly, undefined);
  assert.equal(answer.monthsPensionOnly, 0);
  assert.equal(answer.recoveredAt, undefined);
  assert.equal(refusedProxyMonth(months), '2031-07');

  // **AND `pointOfNoRecovery` IS `undefined`.** Two different reasons stand behind that one
  // `undefined` now, and they are worth separating.
  //
  // ⚠️ **In THIS walk conditions 1 to 4 never hold at all, and chunk 2b is why.** Condition 4 asks
  // for *nothing assessable besides the Offset*, and Sam — over Age Pension age — holds a
  // Guarantee-funded accumulation interest that is assessed from his second month to the horizon.
  // A Household with money in superannuation is not living on the pension alone, so the state is
  // out of reach here, and the marker's answer is `'never'` twice over.
  assert.equal(inStateMonths(months).length, 0, 'the assessable Guarantee keeps this Household out of the state');
  assert.equal(answer.pointOfNoRecovery, undefined);

  // **THE FLOOR, ON A WALK THAT DOES REACH THE STATE — and this is the harder half, kept alive
  // rather than allowed to lapse.** The same Household, with one entry added: on the day he
  // retires Sam takes his whole Guarantee-funded balance out of superannuation and banks it. From
  // the month after, the only thing this Household holds IS the Offset, so conditions 1 to 4 hold
  // unbroken for fifty-nine months — and the marker still answers `'never'`, because condition 5 asks
  // whether the month opened with nil drawable cash and it never does. Without condition 5 a
  // backward walk would name 2031-07 for a Household with a quarter of a million dollars in it.
  const emptied = project(SETTINGS, WORKER, [
    ...WORKER_ENTRIES,
    entry('lump', 'LUMP_SUM_FROM_SUPER', '2031-07-01', { amount: toCents(30_000), interestIndex: 0 }, 'personA'),
  ]);
  const emptiedAnswer = pensionOnlyAge(emptied, WORKER, SERIES);
  // Asserted in AUGUST, not July: `Month.assessableAssets` is the month's OPENING position, and
  // July opens with the balance the lump sum is about to take out of it.
  assert.equal(monthAt(emptied, '2031-08').assessableAssets, monthAt(emptied, '2031-08').openingBalance);
  // FIFTY-NINE, from 2031-08: July itself opens holding the superannuation the lump sum is about to
  // withdraw, so it is the one month of the retirement in which condition 4 does not hold.
  assert.equal(inStateMonths(emptied).length, 59);
  assert.equal(inStateMonths(emptied)[0].month, '2031-08');
  assert.equal(inStateMonths(emptied).at(-1).month, emptied.at(-1).month);
  assert.equal(emptiedAnswer.outcome, 'never');
  assert.equal(emptiedAnswer.pointOfNoRecovery, undefined);
  assert.ok(monthAt(emptied, '2031-08').openingBalance > toCents(200_000), 'the state holds and the Household is rich — which is the whole point');

  // The wage also closes the other half: 2026-07 opens with nil cash and nil assets of both kinds,
  // so a marker that read only the FIGURES and not the lines would fire in month zero of a walk in
  // which Sam is drawing a salary.
  assert.equal(months[0].openingBalance, toCents(0));
  assert.deepEqual(
    months[0].lines.filter((l) => l.direction === 'inflow' && l.effect === 'cash').map((l) => l.description),
    [AGE_PENSION_LINE, 'Salary, Sam'],
  );
});

// --- 4. THE SAME HOUSEHOLD, SPENDING HARD — the Offset and then the super drain, and the marker fires -

test('the marker fires when the OFFSET and the SUPER both reach nil, 34 months after the salary stopped', () => {
  // ⚠️ **FROM 2026-09-23 THIS WALK KEEPS SAM'S ACCOUNT OUT OF THE SWITCH AT RETIREMENT, and every
  // figure below is unchanged — the proof an opted-out plan walks as before.** With the switch his
  // account is an account-based pension from 2031-06-30, which limb 2 draws BEFORE the Offset, so
  // the order the two pools empty in is reversed and the hand-worked sequence below (the Offset
  // first, then limb 5) is not that walk's. The marker's rule — the first month opening with
  // neither cash nor super — is asserted on the switched walk at the end.
  const keptOut = { ...WORKER, persons: WORKER.persons.map((p) => ({ ...p, superInterests: p.superInterests.map((i) => ({ ...i, keepInAccumulationAtRetirement: true })) })) };
  const months = project(SETTINGS, keptOut, [
    ...WORKER_ENTRIES,
    entry('sc2', 'SPEND_CHANGE', '2031-07-01', { annualSpend: toCents(160_000) }),
  ]);
  const answer = pensionOnlyAge(months, WORKER, SERIES);
  assert.equal(answer.outcome, 'pensionOnly');

  // ⚠️ **THE ANSWER HAS MOVED TWICE, AND BOTH TIMES BECAUSE THE MODEL GOT MORE CORRECT — the
  // marker's own rule has never changed.** It is still *the first month that opens with nil
  // drawable cash while conditions 1 to 4 hold*.
  //   2033-11 → 2033-10 on 2026-09-18: P4-3b made the Offset a deemed financial asset, so every
  //   month of the five years in which this Household banked its wage paid a slightly smaller Age
  //   Pension (§3 hand-works the first of them, at $2.77), and it retired on $247,730.19 rather
  //   than $254,483.76 and ran that balance down a month EARLIER.
  //   2033-10 → 2034-01 on 2026-09-19 (P4-8), and this one goes the other way: the income test
  //   stopped assessing Sam on a wage that ended with `RETIRE` in 2031-06, so from 2031-07 this
  //   Household is paid the MAXIMUM rate — about $1,100 a month more (§3 hand-works it). By
  //   2033-09 it has banked $24,140.66 more than it used to, and at a net drain of roughly $8,200
  //   a month — $13,333.34 of spending against a pension that no means test reduces — that is
  //   very nearly three months of extra runway. It is exactly three.
  //   **2034-01 → 2034-04 on 2026-09-20 (P6-8 brief 3, chunk 2b), and this one is a THIRD
  //   mechanism: not a bigger Offset, but a second pool.** Sam's employer paid a Guarantee for the
  //   sixty months he worked, so he retires holding $23,316.06 of accumulation superannuation as
  //   well as the cash. The Offset still reaches nil in 2034-01 — that has not moved — but the
  //   marker does not fire there, because conditions 1 to 4 ask for nothing assessable besides the
  //   Offset and Sam still holds super. Waterfall limb 5 draws it: $5,380.66 in 2033-12 (the part
  //   the month needed), then the whole of what is left in January and February, and the last
  //   $5,589.29 in March. **2034-04 is the first month that opens with neither cash nor super**,
  //   and that is the month the marker names. Three months of runway, bought by a Guarantee.
  // The marker did not move any of the three times; the EXHAUSTION did, and the marker followed it.
  //   **2034-04 → 2034-05 on 2026-09-30 (LR-3):** the low income super tax offset puts $2,391.83
  //   more in Sam's super by 2031-07 and, because this account is kept in accumulation, a fourth
  //   $702 (FY2030-31's) is credited in 2031-07 too; limb 5 draws that for one month more.
  assert.equal(answer.firstPensionOnly.month, '2034-05');
  //   Sam, born 1956-06-15, on 2034-05-01: 2034 − 1956 = 78, and 05-01 IS before 06-15, so 77.
  //   Ali, born 1952-11-20, on 2034-05-01: 2034 − 1952 = 82, and 05-01 IS before 11-20, so 81.
  // (Neither age moved with the month: both birthdays are still ahead in May.)
  assert.deepEqual(answer.firstPensionOnly.ages, [
    { name: 'Sam', age: 77 },
    { name: 'Ali', age: 81 },
  ]);
  // 27 until LR-3 (2034-04 → 2036-06: 9 + 12 + 6).
  assert.equal(answer.monthsPensionOnly, 26); // 2034-05 → 2036-06 inclusive: 8 + 12 + 6

  // **THE LAST MONTH WITH ANY DRAWABLE MONEY IN IT IS 2034-04, AND WHAT IS LEFT IN IT IS SUPER.**
  // The Offset itself runs out four months earlier, and the arithmetic of that is unchanged by
  // chunk 2b because the Guarantee is not cash:
  //   2033-11 opens $10,935.03, takes the maximum-rate pension $5,136.13 and pays $13,333.34 of
  //   spending → closes $2,737.82, which is December's opening;
  //   2033-12 then has $2,737.82 + $5,136.13 = $7,873.95 against the same $13,333.34, and the
  //   $5,459.39 it is short is drawn from Sam's superannuation by limb 5 rather than recorded as a
  //   shortfall. It closes at nil — and so does every month after it until the super is gone.
  // **Since LR-3 (2026-09-30) the cash is $78.73 lower all the way down** — the $78.73 less banked
  // before retirement (§3); from 2031-07 this walk is paid the maximum rate in both builds, so nothing
  // after retirement adds to it. November opened $11,013.76 and closed $2,816.55, December drew
  // $5,380.66, each $78.73 away.
  // **And December's super is $30,751.02, $3,602.43 more than $27,148.59**: the $2,391.83 extra at
  // 2031-07 plus the $702 credited that month, $3,093.83, compounded at 6.5% for the 29 months to
  // 2033-12 is $3,093.83 × 1.065^(29/12) = $3,602.40, the 3 cents being monthly rounding to the cent.
  // Then each month's super is last month's, less the draw, plus a month's 6.5% growth:
  //   2034-01 $30,751.02 − $5,459.39 + $133.07 = $25,424.70 (was $21,882.46);
  //   2034-02 − $8,197.21 (the whole gap between the $5,136.13 pension and the bill) + $90.64 = $17,318.13;
  //   2034-03 − $8,197.21 + $47.99 = $9,168.91;  2034-04 − $8,197.21 + $5.11 = $976.81.
  // So March, which until LR-3 found only $5,589.29 and was short $2,607.92, now draws the full
  // $8,197.21 and is not short; April draws the last $976.81 against a pension indexed on 2034-03-20
  // to $5,223.49, and is short $13,333.34 − $5,223.49 − $976.81 = **$7,133.04** for the first time.
  // **2034-05 opens with nothing of either kind**, and that is the marker.
  const december = monthAt(months, '2033-12');
  assert.equal(monthAt(months, '2033-11').openingBalance, toCents(10_935.03));
  assert.equal(toCents(11_013.76) - toCents(10_935.03), toCents(78.73));
  assert.equal(monthAt(months, '2033-11').closingBalance, toCents(2_737.82));
  assert.equal(toCents(10_935.03) + toCents(5_136.13) - toCents(13_333.34), toCents(2_737.82));
  assert.equal(december.openingBalance, toCents(2_737.82));
  assert.equal(december.assessableAssets - december.openingBalance, toCents(30_751.02), 'the rest of what it holds is the Guarantee’s interest');
  assert.equal(toCents(30_751.02) - toCents(27_148.59), toCents(3_602.43));
  assert.equal(monthAt(months, '2031-07').lines.find((l) => /income super tax offset/i.test(l.description)).amount, toCents(702), 'kept in accumulation, FY2030-31 is paid');
  assert.equal(december.protectedAssets, toCents(0));
  assert.equal(december.closingBalance, toCents(0));
  assert.deepEqual(
    december.lines.filter((l) => l.direction === 'inflow' && l.effect === 'cash').map((l) => l.description),
    [AGE_PENSION_LINE, 'Superannuation lump sum, Sam'],
  );
  assert.equal(december.lines.find((l) => l.description === 'Superannuation lump sum, Sam').amount, toCents(5_459.39));
  assert.equal(toCents(13_333.34) - toCents(2_737.82) - toCents(5_136.13), toCents(5_459.39));
  // The four months of nil cash and falling super, and then the month with neither.
  const drain = ['2034-01', '2034-02', '2034-03', '2034-04', '2034-05'];
  assert.deepEqual(drain.map((m) => monthAt(months, m).openingBalance), [0, 0, 0, 0, 0]);
  assert.deepEqual(
    drain.map((m) => monthAt(months, m).assessableAssets),
    [toCents(25_424.70), toCents(17_318.13), toCents(9_168.91), toCents(976.81), 0],
  );
  assert.deepEqual(
    drain.slice(0, 4).map((m) => monthAt(months, m).lines.find((l) => l.description === 'Superannuation lump sum, Sam').amount),
    [toCents(8_197.21), toCents(8_197.21), toCents(8_197.21), toCents(976.81)],
  );
  assert.equal(toCents(13_333.34) - toCents(5_136.13), toCents(8_197.21));
  assert.equal(monthAt(months, '2034-03').lines.find((l) => l.description === SHORTFALL_LINE), undefined, 'March is no longer short');
  assert.equal(monthAt(months, '2034-04').lines.find((l) => l.description === SHORTFALL_LINE).amount, toCents(7_133.04));
  assert.equal(toCents(13_333.34) - toCents(5_223.49) - toCents(976.81), toCents(7_133.04));
  // 2033-09 is no longer the month before the marker, and the reason is the extra pension: it now
  // opens with $27,494.07 rather than $4,236.53. $24,140.66 of that is Age Pension the walk
  // withheld from a retired Person before P4-8, banked over 26 months, less the $883.12 of deeming
  // on the Guarantee's own interest that §3 works out.
  // **$27,415.34 since LR-3 (2026-09-30)**: the same $78.73 less cash at retirement, carried.
  assert.equal(monthAt(months, '2033-09').openingBalance, toCents(27_415.34));
  assert.equal(toCents(27_494.07) - toCents(27_415.34), toCents(78.73));
  assert.equal(toCents(28_377.19) - toCents(27_494.07), toCents(883.12));

  // AND THE REFUSED PROXY IS THIRTY-FOUR MONTHS OUT: it answers the month the wage stopped.
  // (Thirty-three until LR-3 moved the marker a month.)
  assert.equal(refusedProxyMonth(months), '2031-07');
  assert.equal(
    months.findIndex((m) => m.month === '2034-05') - months.findIndex((m) => m.month === '2031-07'),
    34,
  );

  // **AND THE POINT OF NO RECOVERY IS THE MARKER MONTH, NOT THE START OF THE STATE.** Conditions 1
  // to 4 hold unbroken from 2034-05 to the horizon — the month Sam's superannuation is finally
  // exhausted, since until then he holds something assessable besides the Offset — so a backward
  // walk from the horizon that did not stop at the marker would report that month anyway. What the
  // floor still prevents is the answer the state's own first month would give in §3's walk, where
  // it is 2031-07 and the marker is 'never'.
  assert.equal(inStateMonths(months)[0].month, '2034-05');
  assert.equal(inStateMonths(months).length, 26);
  assert.equal(answer.pointOfNoRecovery.month, '2034-05');
  assert.equal(answer.recoveredAt, undefined);

  // **The switched walk, on the rule rather than on a month.** Sam's account is limb 2's from
  // 2031-07, so it is drawn first and the Offset last — but the marker is still the first month that
  // opens with neither: nil cash and nothing assessable, where nothing is protected.
  const switched = project(SETTINGS, WORKER, [...WORKER_ENTRIES, entry('sc2', 'SPEND_CHANGE', '2031-07-01', { annualSpend: toCents(160_000) })]);
  const switchedAnswer = pensionOnlyAge(switched, WORKER, SERIES);
  assert.equal(switchedAnswer.outcome, 'pensionOnly');
  const firstEmpty = switched.find((m) => m.month >= '2031-07' && m.openingBalance === 0 && m.assessableAssets === 0 && m.protectedAssets === 0);
  assert.equal(switchedAnswer.firstPensionOnly.month, firstEmpty.month);
  assert.ok(switched.some((m) => m.lines.some((l) => l.description === 'Account-Based Pension payment, Sam')), 'the switched account was never drawn');
});

// --- 5. THE YOUNGER PARTNER'S EXEMPT SUPER — the second pool outside `assessableAssets` ----------

test('$338,486.36 of a younger partner’s exempt super is not exhaustion either', () => {
  // Sam is 70 and drawing an ABP; Kit is 51 and holds $300,000 in Accumulation Phase, which §4.8's
  // younger-partner exemption keeps out of BOTH means tests — so it is reported in
  // `protectedAssets`, never in `assessableAssets`, while Sam's pension claim is assessed.
  const YOUNGER = {
    persons: [
      person('Sam', '1956-06-15', {
        superInterests: [
          {
            phase: 'accountBasedPension',
            balance: toCents(240_000),
            statedStreamSettings: { commencementDay: '2024-07-01' },
          },
        ],
      }),
      person('Kit', '1975-03-02', { superInterests: [{ phase: 'accumulation', balance: toCents(300_000) }] }),
    ],
    homeStatus: 'occupied',
  };
  const months = project(SETTINGS, YOUNGER, [SPEND_160K]);
  assert.equal(months.length, 345); // the horizon is Kit's 80th, 2055-03

  // 2028-06 is the first month whose ASSESSABLE assets and opening cash are both nil, whose only
  // inflows are the Age Pension and the shortfall, and which would therefore be the marker if
  // `protectedAssets` went unread. A third of a million dollars says otherwise.
  const june = monthAt(months, '2028-06');
  assert.equal(june.assessableAssets, toCents(0));
  assert.equal(june.openingBalance, toCents(0));
  assert.equal(june.protectedAssets, toCents(338_486.36));
  // **The CASH inflows are the pension and the shortfall — and P4-4 puts a third inflow in this
  // month that is not cash at all.** Kit's exempt super is the very pool `protectedAssets` is
  // reporting, and it grows every month, so it now carries an `effect: 'wealth'` line. That is
  // exactly why `livesOnPensionAlone` reads cash inflows: a household living on its pension can
  // still own something that compounds, and this is the fixture in which it does.
  assert.deepEqual(
    june.lines.filter((l) => l.direction === 'inflow' && l.effect === 'cash').map((l) => l.description),
    [AGE_PENSION_LINE, SHORTFALL_LINE],
  );
  assert.deepEqual(
    june.lines.filter((l) => l.effect === 'wealth').map((l) => l.description),
    ['Investment growth, Kit — Superannuation, Accumulation Phase'],
  );
  assert.equal(
    months.filter((m) => m.assessableAssets === 0 && m.openingBalance === 0).length,
    166,
    'and there are 166 such months, so this is not a one-month accident',
  );

  const answer = pensionOnlyAge(months, YOUNGER, SERIES);
  assert.equal(answer.outcome, 'never');
  assert.equal(answer.monthsPensionOnly, 0);
  // Not vacuous: this Household really does run out of the money the means test can see, and really
  // does fall short — from 2028-05, which is unchanged.
  assert.equal(shortfallAge(months, YOUNGER).firstShortfall.month, '2028-05');
  // **AND THE SHORTFALL NOW ENDS, which is Waterfall limb 5** (2026-09-19). It ran for 323 months —
  // every month to the horizon — while Kit's exempt super sat unspendable beside it. Kit turns 65
  // on 2040-03-02, the walk opens at 65 in 2040-04, and from that month the household draws the
  // account rather than reporting a debt: **143 short months, the last of them 2040-03**, and 180
  // months carrying a `Superannuation lump sum, Kit` line. The exemption is untouched — it is a
  // means-test rule and this is a spending rule — so every figure above this line is what it was.
  assert.equal(323, 323, 'the pre-limb-5 count, kept beside the new one');
  assert.equal(shortfallAge(months, YOUNGER).monthsShort, 143);
  const stillShort = months.filter((m) => m.lines.some((l) => l.description === SHORTFALL_LINE));
  assert.equal(stillShort.at(-1).month, '2040-03', 'the last short month is not the month before Kit’s release');
  const drawn = months.filter((m) => m.lines.some((l) => l.description === 'Superannuation lump sum, Kit'));
  assert.equal(drawn.length, 180);
  assert.equal(drawn[0].month, '2040-04');
  assert.equal(drawn.at(-1).month, '2055-03', 'the account outlasts the horizon');
});

// --- 6. THE REFUSAL: an Age Pension the walk declined to compute ---------------------------------

test('NO SERIES, and the question is ANSWERED now — on a series generated from the plan’s own rates', () => {
  // ⚠️ **THIS TEST ASSERTED A REFUSAL UNTIL 2026-09-21 AND NOW ASSERTS AN ANSWER (P4-1e).** It
  // read: *"`Settings.economicSeries.agePension` is optional. Omit it and `project()` still returns
  // 120 months, but only NINE of them carry an Age Pension line: the published parameters run out
  // on 2027-03-19 and this engine does not extrapolate a determined figure"*, and the marker
  // refused because *"the Household is not living on the Age Pension in the months the marker would
  // name — it is living on a line the walk declined to compute"*. Both sentences were right about
  // that build. The standing table carries the last published sets past the window on the user's
  // ruling, so all 120 months carry a line and there is no uncomputed month to refuse over.
  //
  // **This is the first plan in the suite that can be asked the question without stating a forward
  // indexation series — which is every realistic plan, since the series cannot be edited from the
  // page.** The refusal below it, on the LOWER bound, is untouched and is the next test.
  const noSeries = { ...SETTINGS, economicSeries: { ...SETTINGS.economicSeries, agePension: undefined } };
  const months = project(noSeries, COUPLE, [SPEND_160K]);
  assert.equal(months.length, 120);
  assert.equal(months.filter((m) => m.lines.some((l) => l.description === AGE_PENSION_LINE)).length, 120);
  assert.equal(9, 9, 'the pre-P4-1e count of answerable months, kept beside the new one');

  // The Shortfall Age was answered before and is answered now — it never depended on this.
  assert.equal(shortfallAge(months, COUPLE).outcome, 'shortfall');

  // AND THE MARKER ITSELF. Sam, born 1956-06-15, and Ali, born 1952-11-20, first open a month with
  // nothing but their pension in 2030-06, at 73 and 77, and never recover.
  //
  // ⚠️ **ONE MONTH LATER SINCE 2026-09-23 — it was 2030-05, over 74 months.** With no series stated
  // the rates past 19 March 2027 now INDEX on the plan's own growth rates instead of standing, so
  // from 2027-04 the couple is paid more — $4,377.84 a month by 2030, where the carried $1,866.00 a
  // fortnight paid $4,043.00 — and thirty-seven months of that extra, a few thousand dollars, leave
  // Sam's parcel $5,083.15 to sell in 2030-05. One month of a $13,333.34 spend, not two. The ages do
  // not move: Sam is still 73 in June.
  const answer = pensionOnlyAge(months, COUPLE, undefined);
  assert.equal(answer.outcome, 'pensionOnly');
  assert.equal(answer.firstPensionOnly.month, '2030-06');
  assert.deepEqual(answer.firstPensionOnly.ages, [{ name: 'Sam', age: 73 }, { name: 'Ali', age: 77 }]);
  assert.equal(answer.monthsPensionOnly, 73);
  assert.equal(answer.pointOfNoRecovery.month, '2030-06');

  // **NOT VACUOUS, and this is the assertion that says the answer is about the Household rather
  // than about the marker having stopped refusing**: the month before it is NOT pension-only, and
  // the month it names opens with an empty Offset, which is the condition the marker turns on.
  // (Both months open with an empty Offset — that alone was never the condition. What changes in
  // 2030-06 is that the Age Pension is the ONLY money coming in: May still sells a parcel.)
  const inflowsOtherThanPension = (month) =>
    month.lines.filter((l) => l.effect === 'cash' && l.direction === 'inflow' && l.description !== AGE_PENSION_LINE && l.description !== SHORTFALL_LINE);
  assert.equal(inflowsOtherThanPension(monthAt(months, '2030-05')).length, 1);
  assert.equal(inflowsOtherThanPension(monthAt(months, '2030-06')).length, 0);
  assert.equal(monthAt(months, '2030-06').openingBalance, toCents(0));

  // **AND THE ANSWER IS THE SAME ONE A STATED SERIES GIVES, EARLIER RATHER THAN LATER.** This
  // fixture's stated series puts the MTAWE floor above the rate from its first observation and
  // lifts the free areas every July, so it pays more than the series generated from `cpi: 0` and
  // the Household reaches the pension-only month no sooner — 2030-07 against 2030-06. Until
  // 2026-09-23 the comparison was against carried rates; it is against generated ones now.
  const indexed = pensionOnlyAge(project(SETTINGS, COUPLE, [SPEND_160K]), COUPLE, SERIES);
  assert.equal(indexed.outcome, 'pensionOnly');
  assert.ok(indexed.firstPensionOnly.month >= answer.firstPensionOnly.month);
});

test('a month BEFORE the first determined parameters is refused too — BOTH ends of the walk are checked', () => {
  // **This test exists because checking only the walk's LAST month failed zero tests**, and the
  // lower bound is a separate rule from the upper one: §4.7 indexes FORWARD from a published set, and
  // running the mechanism backwards to reach 2026-02 would be an extrapolation in the other
  // direction. A series does not buy a caller that, so this refuses WITH one. The first determined
  // parameters run from 2026-03-20, so a walk whose first month is 2026-02 has a month outside the
  // window at the start and none at the end — exactly the case a one-ended check would answer.
  //
  // `project()` will not build this walk from these assumptions (its `asAtDate` is later), and the
  // months are hand-built for that reason; every one of them meets all five conditions, so what is
  // being refused is the DATE and not the content.
  const bare = (month) => ({
    month,
    openingBalance: toCents(0),
    closingBalance: toCents(0),
    lines: [{ direction: 'inflow', effect: 'cash', description: AGE_PENSION_LINE, amount: toCents(1_000) }],
    appliedEntryIds: [],
    protectedAssets: toCents(0),
    assessableAssets: toCents(0),
    // P4-6 widened `Month`. Nil, like every other figure on these bare months: what is refused here
    // is the DATE, and the Pension-Only Age reads no reachable-money figure at all.
    accessibleAssets: toCents(0),
  });
  const walk = ['2026-02', '2026-03', '2026-04', '2026-05', '2026-06', '2026-07'].map(bare);
  assert.throws(() => pensionOnlyAge(walk, COUPLE, SERIES), /not computable across 2026-02 \.\. 2026-07/);
  // 2026-03 is refused for the same reason and is the tighter boundary: the parameters begin on
  // 2026-03-20 and the age — like the asset split — is taken on the FIRST day of the month.
  assert.throws(() => pensionOnlyAge(walk.slice(1), COUPLE, SERIES), /not computable across 2026-03 \.\. 2026-07/);
  // THE CONTROL, one month apart: from 2026-04 the whole walk is inside the window and is answered,
  // at the first of its months.
  assert.equal(pensionOnlyAge(walk.slice(2), COUPLE, SERIES).firstPensionOnly.month, '2026-04');
  assert.equal(pensionOnlyAge(walk.slice(2), COUPLE, SERIES).monthsPensionOnly, 4);
});

test('a projection with no months is REFUSED, not answered "never"', () => {
  // The same rule `shortfallAge` runs on: a walk with no months has not told us anything about the
  // Household's assets, and `'never'` would be a statement about months that were never walked.
  assert.throws(() => pensionOnlyAge([], COUPLE, SERIES), /no months has no Pension-Only Age/);
});

// --- 7. RECOVERY — reported beside the marker, never absorbed into it ----------------------------

test('a Household that holds an asset AGAIN has its recovery reported, not folded into the marker', () => {
  // §2's Household, which banks its pension surplus, buying $20,000 of ETFs out of the proceeds in
  // 2033-01. *"All assets are exhausted"* stops being true the moment that parcel exists, and a
  // marker that reported only one date would quietly mean less than it looked like.
  const months = project(SETTINGS, COUPLE, [
    SPEND_160K,
    entry('sc2', 'SPEND_CHANGE', '2030-07-01', { annualSpend: toCents(40_000) }),
    entry(
      'buy',
      'NON_SUPER_INVESTMENT',
      '2033-01-10',
      { direction: 'buy', amount: toCents(20_000), incidentalCostsOfAcquisition: toCents(0) },
      'personA',
    ),
  ]);
  const answer = pensionOnlyAge(months, COUPLE, SERIES);
  // THE MARKER IS UNMOVED — it is still the month the money ran out.
  assert.equal(answer.firstPensionOnly.month, '2030-07');
  // The run ends 31 months later, and the recovery month is REPORTED with its own pair of ages.
  assert.equal(answer.monthsPensionOnly, 31);
  assert.equal(answer.recoveredAt.month, '2033-02');
  //   Sam on 2033-02-01: 2033 − 1956 = 77, and 02-01 is before 06-15, so 76.
  //   Ali on 2033-02-01: 2033 − 1952 = 81, and 02-01 is before 11-20, so 80.
  assert.deepEqual(answer.recoveredAt.ages, [
    { name: 'Sam', age: 76 },
    { name: 'Ali', age: 80 },
  ]);

  // **AND THE ONE-MONTH LAG IS ADR-0005 AND NOT AN OFF-BY-ONE.** The buy is an OUTFLOW in 2033-01 —
  // $20,000.00 of banked pension money leaving the cash — but the assets are split on the FIRST day
  // of each month, so the parcel first shows up in 2033-02's figures.
  assert.equal(
    monthAt(months, '2033-01').lines.find((l) => l.description === 'Non-Super Portfolio purchase, Sam').amount,
    toCents(20_000),
  );
  assert.equal(heldBesidesTheOffset(monthAt(months, '2033-01')), toCents(0));
  assert.equal(heldBesidesTheOffset(monthAt(months, '2033-02')), toCents(20_000));
  // The reported totals in those two months are that parcel plus the banked pension the buy came
  // out of — $42,875.16 opening in January, $24,507.65 in February once $20,000.00 of it has left.
  assert.equal(monthAt(months, '2033-01').assessableAssets, toCents(42_875.16));
  assert.equal(monthAt(months, '2033-02').assessableAssets, toCents(20_000) + toCents(24_507.65));
  assert.equal(toCents(42_875.16) - toCents(20_000), toCents(22_875.16), 'and the buy is the only thing between them');

  // **AND THIS WALK DOES NOT END PENSION-ONLY, so there is no point of no recovery at all.** The
  // $20,000 parcel is never sold — the $40,000-a-year bill stays under the pension — and it is worth
  // $24,671.29 at the horizon. The Household has a Pension-Only Age and does not end the walk in it,
  // which is the answer `undefined` is for.
  assert.equal(answer.pointOfNoRecovery, undefined);
  assert.equal(heldBesidesTheOffset(months.at(-1)), toCents(24_671.29));
  assert.equal(months.at(-1).assessableAssets, toCents(24_671.29) + toCents(102_000.15));
  assert.equal(inStateMonths(months).length, 31); // one run, and it stops 41 months before the horizon
});

// --- 9. TWO RUNS — the second one is named, and the first is still the marker --------------------

test('PENSION-ONLY, RECOVERED, AND PENSION-ONLY AGAIN FOR GOOD — the final run starts 2033-09', () => {
  // §7's Household, with its spending put back to $160,000 from 2033-06. The $20,000 parcel it bought
  // out of banked pension money is now sold to need — limb 3 realises $8,283.10 in 2033-06 and again
  // in 2033-07, then the last $3,942.56 in 2033-08 — and from 2033-09 it holds nothing again and
  // never holds anything again. Two runs, 38 months apart, so "the first pension-only month" and
  // "the first month of the final run" are different answers and no implementation can satisfy both:
  //
  //   2030-07 … 2033-01   run 1, 31 months — the money ran out and the pension was banked
  //   2033-02 … 2033-08   recovered: the parcel exists, so *all assets are exhausted* is untrue
  //   2033-09 … 2036-06   run 2, 34 months — and the walk ends here
  //
  // ⚠️ **THE HOUSEHOLD OWES A HOME LOAN IN THIS TEST SINCE "SPEND CASH FIRST" (2026-09-23), and it
  // is there to keep the banked cash where this test needs it.** Cash NOT offsetting a loan is now
  // spent before any parcel is sold, so without a loan the $31,206.43 of banked pension pays June to
  // September and the parcel is sold after it: the final run starts 2034-01 and OPENS WITH NIL CASH
  // (asserted at the foot of this test) — and condition (5), below, would have nothing to be
  // re-checked against. A $100,000 loan at nil interest, repaid ONE CENT a month, keeps every banked
  // dollar offsetting it, so the parcel is sold first as the ruled order says it must be. The cent
  // is the only change it makes to the walk: every figure below is a few cents from what it was
  // without the loan, and the dates are the same.
  const LOANED = { ...COUPLE, mortgage: { openingBalance: toCents(100_000), annualInterestRate: 0, monthlyRepayment: 1 } };
  const entries = [
    SPEND_160K,
    entry('sc2', 'SPEND_CHANGE', '2030-07-01', { annualSpend: toCents(40_000) }),
    entry(
      'buy',
      'NON_SUPER_INVESTMENT',
      '2033-01-10',
      { direction: 'buy', amount: toCents(20_000), incidentalCostsOfAcquisition: toCents(0) },
      'personA',
    ),
    entry('sc3', 'SPEND_CHANGE', '2033-06-01', { annualSpend: toCents(160_000) }),
  ];
  const months = project(SETTINGS, LOANED, entries);
  assert.equal(heldBesidesTheOffset(monthAt(months, '2033-08')), toCents(3_942.54)); // the last of the parcel
  assert.equal(heldBesidesTheOffset(monthAt(months, '2033-09')), toCents(0));
  // Reported: $35,148.62 in August — the last $3,942.54 of parcel on top of $31,206.08 of banked
  // pension — and $26,865.51 in September, which is the Offset alone and is why condition 1 had to
  // stop being read literally. The two runs and their dates are untouched by any of that. (Without
  // the loan's cent a month these were $3,942.56, $31,206.43 and $26,865.89.)
  assert.equal(monthAt(months, '2033-08').assessableAssets, toCents(3_942.54) + toCents(31_206.08));
  assert.equal(monthAt(months, '2033-09').assessableAssets, toCents(26_865.51));
  assert.equal(monthAt(months, '2033-09').assessableAssets, monthAt(months, '2033-09').openingBalance);

  const answer = pensionOnlyAge(months, LOANED, SERIES);
  // THE MARKER IS UNMOVED and the recovery is still reported: the first run, and the month it ended.
  assert.equal(answer.firstPensionOnly.month, '2030-07');
  assert.equal(answer.monthsPensionOnly, 31);
  assert.equal(answer.recoveredAt.month, '2033-02');

  // THE FIELD THAT USED TO BE MISSING: the walk ends pension-only, and the run it ends in began in
  // 2033-09 — 38 months after the marker and 7 after the recovery.
  //   Sam, born 1956-06-15, on 2033-09-01: 2033 − 1956 = 77, and 09-01 is not before 06-15, so 77.
  //   Ali, born 1952-11-20, on 2033-09-01: 2033 − 1952 = 81, and 09-01 IS before 11-20, so 80.
  assert.equal(answer.pointOfNoRecovery.month, '2033-09');
  assert.deepEqual(answer.pointOfNoRecovery.ages, [
    { name: 'Sam', age: 77 },
    { name: 'Ali', age: 80 },
  ]);
  assert.notEqual(answer.pointOfNoRecovery.month, answer.firstPensionOnly.month);
  assert.notEqual(answer.pointOfNoRecovery.month, answer.recoveredAt.month);
  assert.equal(
    months.findIndex((m) => m.month === '2033-09') - months.findIndex((m) => m.month === '2030-07'),
    38,
  );

  // **AND CONDITION (5) IS NOT RE-CHECKED ON THE SECOND RUN — $26,865.51 of it.** 2033-09 opens with
  // the proceeds of the parcel sales, so a backward walk that demanded nil opening cash would skip
  // it, and the next three months, and answer 2034-01: four months late, and on a rule the file
  // deliberately does not apply to the STATE. The event happened once, in 2030-07.
  assert.equal(monthAt(months, '2033-09').openingBalance, toCents(26_865.51));
  assert.equal(inStateMonths(months).filter((m) => m.openingBalance === 0)[1].month, '2034-01');
  assert.notEqual(answer.pointOfNoRecovery.month, '2034-01');

  // Two runs and 65 state months in all, against a final run of 34: the arithmetic that says the
  // Household left the state and came back, which is the case `recoveredAt` alone could not report.
  assert.equal(inStateMonths(months).length, 65);
  assert.equal(months.length - months.findIndex((m) => m.month === '2033-09'), 34);
  assert.equal(inStateMonths(months).length, answer.monthsPensionOnly + 34);

  // **WITHOUT THE LOAN, the ruled order spends the banked cash first**: nothing is sold until
  // 2033-09, the parcel lasts four months longer, and the final run starts 2034-01 on NIL opening
  // cash — the same Household, the same entries, and the difference is only whether the cash was
  // cancelling loan interest.
  const unloaned = project(SETTINGS, COUPLE, entries);
  assert.deepEqual(['2033-06', '2033-07', '2033-08'].map((m) => monthAt(unloaned, m).lines.filter((l) => l.description.startsWith('Non-Super Portfolio sale')).length), [0, 0, 0]);
  assert.equal(pensionOnlyAge(unloaned, COUPLE, SERIES).pointOfNoRecovery.month, '2034-01');
  assert.equal(monthAt(unloaned, '2034-01').openingBalance, toCents(0));
});

// --- 8. TOO YOUNG IS NOT PENSION-ONLY -----------------------------------------------------------

test('a Household with nothing and NO pension line is not living on the Age Pension — it is destitute', () => {
  // Kit is 47 and Rae 53: neither has reached Age Pension age, so no month of this walk carries an
  // `Age Pension` line at all. Every month opens with nil cash, reports nil assets of both kinds,
  // and carries exactly one inflow — the shortfall. A marker that checked only the figures, or that
  // treated the shortfall line as income, would answer 2026-07 for a Household twenty years short of
  // the pension it would be said to be living on.
  const YOUNG = { persons: [person('Kit', '1979-06-15'), person('Rae', '1972-11-20')], homeStatus: 'occupied' };
  const months = project({ ...SETTINGS, planningHorizonAge: 52 }, YOUNG, [
    entry('sc', 'SPEND_CHANGE', '2026-07-01', { annualSpend: toCents(60_000) }),
  ]);
  assert.equal(months.length, 60);
  assert.equal(months.filter((m) => m.lines.some((l) => l.description === AGE_PENSION_LINE)).length, 0);
  assert.equal(months[0].openingBalance, toCents(0));
  assert.equal(months[0].assessableAssets, toCents(0));
  assert.deepEqual(
    months[0].lines.filter((l) => l.direction === 'inflow').map((l) => [l.description, l.amount]),
    [[SHORTFALL_LINE, toCents(5_000)]],
  );

  assert.equal(pensionOnlyAge(months, YOUNG, SERIES).outcome, 'never');
  // And the Shortfall Age answers, loudly, in the very first month — which is the marker that is
  // meant to speak for this Household.
  assert.equal(shortfallAge(months, YOUNG).firstShortfall.month, '2026-07');
});
