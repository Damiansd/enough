// `LUMP_SUM_FROM_SUPER` — the entry that takes money OUT of superannuation, 2026-09-19.
//
// **What this closes, in the words of the thing it closes.** `accessibleWealth`'s own doc in
// `projection.ts` declares it: *"released super is reachable in LAW and unspendable in THIS
// ENGINE … the flattering direction, and it is taken deliberately"*. No Waterfall limb draws an
// Accumulation Phase balance, so a Household reports `Unfunded shortfall` month after month while
// holding super it is entitled to withdraw — and **Shortfall Age, the tool's headline number,
// reports the date CASH runs out rather than the date MONEY runs out**.
//
// ⚠️ **AND ON 2026-09-19 THE USER RE-OPENED THE RULING AND BUILT WATERFALL LIMB 5, SO HALF OF THE
// PARAGRAPH ABOVE IS NOW HISTORY — which is why this file has two fixtures rather than one.** A
// released ACCUMULATION balance is drawn automatically now, last, after the Offset; so on the
// original fixture the entry is no longer what closes the gap, and a test that still claimed it was
// would be testing the limb and crediting the entry.
//
// **What the ENTRY still does, and it is the whole of §2 … §7 below:**
//
//   * it names a **TTR interest**, which limb 5 will not sweep — a TRIS has a MAXIMUM as well as a
//     minimum and an automatic draw cannot honour a ceiling nobody stated — so on `KIT_AND_ROBIN`
//     the entry is still the ONLY way that money moves, and every hand-worked figure in this file
//     is the figure it always was, to the cent;
//   * it withdraws a STATED amount in a STATED month whether or not the household needs it, where
//     the limb draws only to need.
//
// **The fixture is built so the gap is the whole of the walk.** Kit and Robin have no salary and no
// portfolio; they hold $5,000 in the Offset, spend $80,000 a year ($6,666.67 a month, the walk's
// own `monthlySpendFromAnnual`), and Robin holds **$900,000 of super** that nothing in the engine
// draws by itself. Every one of the 60 months falls short, beside nine hundred thousand dollars.
// That is not a contrivance: it is the state of every plan whose owner has retired before Age
// Pension age with their money in super.
//
// **Every figure below is hand-worked from the fixture and not read off the output.** The one that
// matters most:
//
//   $300,000 ÷ $6,666.67 a month = **45.0 months**, so a withdrawal in 2027-01 funds 2027-01
//   through 2030-09 and the shortfall resumes in **2030-10** — which is 51 months later than the
//   2026-07 the walk reports without it.
//
// **The direction assertions are over the WHOLE walk, never on terminal wealth** — the standing
// rule on this project, and here it is not even arguable: the household is broke at both ends.
import test from 'node:test';
import assert from 'node:assert/strict';

import { toCents } from '../dist/core/money.js';
import { SHORTFALL_LINE, SUPER_LUMP_SUM_LINE, project, statedBy } from '../dist/core/projection.js';
import { shortfallAge } from '../dist/core/outcomes.js';
import { LumpSumBelowTaxFreeAgeError } from '../dist/core/superLumpSum.js';
import { CessationBeforePreservationAgeError, PreservedBenefitError } from '../dist/core/conditionOfRelease.js';

const person = (name, dateOfBirth, superInterests) => ({
  name,
  dateOfBirth,
  superInterests,
  parcels: [],
  employmentIncomePerFortnight: toCents(0),
  workBonusBalance: toCents(0),
});

const accumulation = (dollars) => ({ phase: 'accumulation', balance: toCents(dollars) });
/**
 * **A transition-to-retirement interest, and the reason this file needs one from 2026-09-19.**
 * Waterfall limb 5 sweeps a released ACCUMULATION balance and refuses to sweep a TRIS
 * (`releasedSuperannuationOffer`), so an interest of this phase is money only a stated entry can
 * move — which is exactly the state every figure in §2 … §7 was hand-worked in.
 */
const ttr = (dollars) => ({ phase: 'ttr', balance: toCents(dollars) });

const settings = (asAtDate, planningHorizonAge) => ({
  asAtDate,
  planningHorizonAge,
  // ⚠️ **`cpi: 0`, AND IT IS THE ALGEBRAIC CONTROL RATHER THAN A SPECIAL CASE** (register O85,
  // user ruling 2026-09-21). The stated spending level is a REAL figure now and `project()` raises it
  // to each month's own price level, so at any positive CPI every hand-worked figure below would
  // carry a `(1 + cpi) ^ (n / 12)` in it and this fixture would be arithmetic about indexation rather
  // than about what it was written for. At nil the factor is exactly 1 in every month
  // (`core/priceLevel.ts`), so every figure here is the figure it was hand-worked as. The indexation
  // itself is asserted in `test/core-projection-waterfall.test.mjs` §8, on its own fixture.
  economicSeries: { cpi: 0, pblci: 0.025, awote: 0.035, mtawe: 0.035 },
  deemingRates: { lower: 0.0175, upper: 0.0375 },
  nominalReturn: 0.065,
});

const entry = (id, owner, type, date, params) => ({ id, date, owner, type, params, enabled: true, createdAt: '2026-06-01' });

const lumpSum = (id, date, dollars, interestIndex = 0, owner = 'personB') =>
  entry(id, owner, 'LUMP_SUM_FROM_SUPER', date, { amount: toCents(dollars), interestIndex });

// --- The fixture ---------------------------------------------------------------------------------
//
// Kit turns 67 — Age Pension age — on 2027-01-15, so two months of this walk carry a pension and
// the rest do not (the plan states no forward indexation series, which is the ordinary state of a
// plan whose owner has not forecast the indexation calendar). Robin is 61 at the start, retired on
// 2025-08-01 at 60 — AFTER Preservation Age, which is what makes the cessation a ground rather
// than `CessationBeforePreservationAgeError` — and holds the $900,000 nothing could reach.

const KIT_AND_ROBIN = {
  persons: [
    person('Kit', '1960-01-15', []),
    person('Robin', '1965-06-10', [ttr(900_000)]),
  ],
  homeStatus: 'occupied',
  openingOffsetBalance: toCents(5_000),
};

/**
 * **The same couple with Robin's $900,000 in ACCUMULATION Phase — the fixture limb 5 reaches.**
 * Every figure in §1 is measured on this one, and the two differ in the phase of one interest and
 * in nothing else, which is what makes §1's comparison a statement about the limb.
 */
const KIT_AND_ROBIN_ACCUMULATION = {
  ...KIT_AND_ROBIN,
  persons: [person('Kit', '1960-01-15', []), person('Robin', '1965-06-10', [accumulation(900_000)])],
};

/** Robin reaches 66 in 2031-06, so the walk is 2026-07 → 2031-06: sixty months. */
const SETTINGS = settings('2026-07-01', 66);

const SPEND = entry('sc', 'household', 'SPEND_CHANGE', '2026-07-01', { annualSpend: toCents(80_000) });
const ROBIN_RETIRED = entry('rr', 'personB', 'RETIRE', '2025-08-01', {});

const walk = (...entries) => project(SETTINGS, KIT_AND_ROBIN, [SPEND, ROBIN_RETIRED, ...entries]);
/** The accumulation fixture, retired — limb 5 reaches this one. */
const released = (...entries) => project(SETTINGS, KIT_AND_ROBIN_ACCUMULATION, [SPEND, ROBIN_RETIRED, ...entries]);
/** The accumulation fixture with NO `RETIRE`: Robin's benefit is preserved until 65, in 2030-06. */
const preserved = (...entries) => project(SETTINGS, KIT_AND_ROBIN_ACCUMULATION, [SPEND, ...entries]);

const BASE = walk();
const shortMonths = (months) => months.filter((month) => month.lines.some((line) => line.description === SHORTFALL_LINE)).map((month) => month.month);
const lineOf = (months, month, description) => months.find((each) => each.month === month).lines.filter((line) => line.description === description);
const at = (months, month) => months.find((each) => each.month === month);
const withdrawalNotes = (months) => months.flatMap((month) => month.notes.filter((note) => note.subject === 'super withdrawal'));
/** Limb 5's own note for ONE month — what the Waterfall was willing to spend out of super. */
const limb5Of = (month) => month.notes.find((note) => note.subject === 'waterfall limb' && note.limb === 'releasedSuperannuation');

// --- §1 The gap, as it stands without the entry ---------------------------------------------------

test('THE GAP: sixty months of Unfunded shortfall, beside nine hundred thousand dollars of super', () => {
  assert.equal(BASE.length, 60);
  // Every month. $6,666.67 a month against $5,000 of cash, two months of Age Pension and nothing
  // else — the household has no income at all, and the one asset it has is a TRIS that no limb
  // sweeps, so only an entry can reach it.
  assert.equal(shortMonths(BASE).length, 60);
  assert.equal(shortMonths(BASE)[0], '2026-07');
  assert.equal(BASE.filter((m) => m.lines.some((l) => l.description.startsWith(SUPER_LUMP_SUM_LINE))).length, 0);
  // The limb says so in terms, in every month, rather than being silently absent.
  const limb5 = (months, month) => at(months, month).notes.find((n) => n.subject === 'waterfall limb' && n.limb === 'releasedSuperannuation');
  assert.equal(limb5(BASE, '2026-07').available, toCents(0));
  assert.match(limb5(BASE, '2026-07').note, /transition-to-retirement income stream, and this limb does not sweep one/);

  // The money that is right there. Robin is under Age Pension age; the TRIS is assessable and the
  // ACCUMULATION balance of the other fixture is protected, and that difference is a means-test
  // rule and not a spending one.
  assert.ok(at(BASE, '2026-07').assessableAssets >= toCents(900_000), 'the premise: the super is in the walk');
  assert.ok(at(released(), '2026-07').protectedAssets >= toCents(900_000));
  // **AND IT IS REACHABLE, WHERE IT WAS NOT BEFORE P4-11 (2026-09-19).** The superseded assertion
  // was `at(BASE, '2026-08').accessibleAssets < toCents(10_000)` and the superseded reason was
  // that *"this walk states no cessation to `accessibleWealth`, which is that function's declared
  // residual 1"*. The walk states one now — Robin ceased on 2025-08-01, at 60, after Preservation
  // Age — and `accessibleWealth` is handed the same `gainfulEmploymentAsAt` the entry path and
  // limb 5 read, so the $900,000 is counted.
  //
  // HAND-WORKED. 2026-07 is the walk's first month: the $5,000 Offset is spent by limb 4 and the
  // month closes with the TRIS and nothing else. 2026-08 is that balance after ONE month of 6.5%
  // — `floor(90_000_000 × 1.065^(1/12))` — because nothing draws a TRIS and growth is the only
  // thing that happens to it.
  assert.equal(at(BASE, '2026-07').accessibleAssets, toCents(900_000));
  assert.equal(at(BASE, '2026-08').accessibleAssets, Math.floor(toCents(900_000) * 1.065 ** (1 / 12)));
  assert.equal(at(BASE, '2026-08').accessibleAssets, 90_473_552);
  // ⚠️ **AND HERE THE TWO READERS STILL DIVERGE, WHICH IS THE ONE DIFFERENCE P4-11 LEFT STANDING
  // AND THE ONLY ONE `accessibleWealth`'s doc still claims.** The interest is a TRIS: reachable in
  // law and above, and NOT swept by limb 5, which cannot honour a ceiling nobody stated. So this
  // figure is larger than what the Waterfall will spend, where before P4-11 it was smaller. It is
  // the remaining divergence *by phase*, and no longer a divergence *about the cessation*.
  assert.equal(limb5(BASE, '2026-08').available, toCents(0));
  assert.ok(at(BASE, '2026-08').accessibleAssets > limb5(BASE, '2026-08').available);

  const answer = shortfallAge(BASE, KIT_AND_ROBIN);
  assert.equal(answer.outcome, 'shortfall');
  assert.equal(answer.pointOfNoRecovery.month, '2026-07');
  assert.equal(answer.recovered, false);
  assert.equal(answer.monthsShort, 60);
});

test('LIMB 5 CLOSES THE SAME GAP WITHOUT AN ENTRY — where a Condition of Release is met, and NOWHERE ELSE', () => {
  // The same couple, the same spending, the same $900,000 — in ACCUMULATION Phase rather than as a
  // TRIS. That one field is the whole difference, and it is the difference between a walk that
  // reports a debt in all sixty months and a walk that pays for itself.
  const months = released();
  assert.equal(shortMonths(months).length, 0, 'limb 5 left a month short beside a released balance');
  assert.equal(months.filter((m) => m.lines.some((l) => l.description === `${SUPER_LUMP_SUM_LINE}, Robin`)).length, 60);
  assert.equal(shortfallAge(months, KIT_AND_ROBIN_ACCUMULATION).outcome, 'never');
  // And the money is really gone: $900,000 at the start and less at the horizon, after sixty
  // months of drawing and five years of 6.5% on what was left.
  assert.equal(months[0].protectedAssets, toCents(900_000));
  // ⚠️ **$776,495.37 UNTIL 2026-09-21 (P4-1e).** Kit turns 67 on 2027-01-15 and the standing table
  // now pays this couple an Age Pension in 53 of the 60 months — $2,021.50 a month, the full
  // couple-combined rate halved, because Robin's balance is PROTECTED by the younger-partner
  // exemption and the Offset is empty, so neither means test bites. That pension pays part of each
  // month's $6,666.67, so less is drawn out of super and more of it is left growing at 6.5%: the
  // terminal balance is $115,879.42 higher, against about $107,000 of pension paid.
  // ⚠️ **AND $6,122.15 HIGHER AGAIN SINCE 2026-09-23.** A plan with no series now INDEXES the rates
  // on its own growth rates instead of carrying them, so from 2027-04 Kit's half of the couple rate
  // rises by √1.025 of the basic rate each half-year (PBLCI; CPI is nil, so the Supplement stands):
  // $2,044.55 a month from April 2027, where it stood at $2,021.50. Hand-worked over the 51 months
  // from 2027-04 that is $5,777.36 more pension; the walk pays $5,777.67. Every dollar of it is a
  // dollar limb 5 does not draw, and the other $344.48 is the growth that money earns in the fund.
  assert.equal(months.at(-1).protectedAssets, 89_849_694);
  assert.equal(89_849_694 - 89_237_479, 612_215);
  assert.equal(89_237_479 - 77_649_537, 11_587_942);
  assert.ok(months.at(-1).protectedAssets < months[0].protectedAssets, 'the balance did not fall');

  // **AND BELOW THE GATE IT OFFERS NOTHING — requirement 4, on the same fixture.** Drop the
  // `RETIRE` and Robin is 61 with no Condition of Release: 48 months stay short, the limb says
  // which gate closed, and the first month it draws is 2030-07 — the month after Robin turns 65 on
  // 2030-06-10, which is the automatic ground and the only one left.
  const nobodyRetired = preserved();
  assert.equal(shortMonths(nobodyRetired).length, 48);
  assert.equal(shortMonths(nobodyRetired)[0], '2026-07');
  assert.equal(shortMonths(nobodyRetired).at(-1), '2030-06');
  const drew = nobodyRetired.filter((m) => m.lines.some((l) => l.description.startsWith(SUPER_LUMP_SUM_LINE)));
  assert.equal(drew.length, 12);
  assert.equal(drew[0].month, '2030-07');
  const closed = nobodyRetired[0].notes.find((n) => n.subject === 'waterfall limb' && n.limb === 'releasedSuperannuation');
  assert.equal(closed.available, toCents(0));
  assert.match(closed.note, /no Condition of Release is met/);

  // ⚠️ **`accessibleAssets` AND THE WATERFALL AGREE ABOUT THESE DOLLARS SINCE P4-11 (2026-09-19),
  // AND THEIR DISAGREEMENT WAS THE WHOLE DEFECT.** The superseded assertion was
  // `at(months, '2026-08').accessibleAssets === toCents(0)` and the superseded reason was that
  // *"that figure can only say `{ ceased: false }` … so for a Person who retired at 60 and is 61
  // it reports the released balance as unreachable while limb 5 spends it"*. Robin retired at 60
  // on 2025-08-01, and a figure that called that money unreachable in the same month the engine
  // spent it was two answers to one question.
  //
  // **The agreement is asserted as an IDENTITY over every month of the walk, not on one figure**:
  // what limb 5 offers is the balance BEFORE this month's draw, and `accessibleAssets` is the
  // household at the month's CLOSE, so the two differ by exactly the draw and by nothing else.
  // Kit and Robin hold no portfolio and their Offset is empty from the first month, so the super
  // is the whole of the reachable figure and the identity is exact to the cent. Mutate either
  // reader's view of the cessation and this fails in all sixty months.
  const drawnIn = (m) => m.lines.filter((l) => l.description.startsWith(SUPER_LUMP_SUM_LINE)).reduce((total, l) => total + l.amount, 0);
  const disagreeing = months.filter((m) => m.accessibleAssets !== limb5Of(m).available - drawnIn(m));
  assert.deepEqual(disagreeing.map((m) => m.month), [], 'accessibleAssets and limb 5 disagree about the same dollars');
  assert.equal(months.length, 60, 'the identity above was checked over fewer months than the walk has');
  // And the figures behind the identity in one month, hand-worked. 2026-07 spends the $5,000
  // Offset first (limb 4) and draws only the remaining $1,666.67 out of super, so 2026-08 opens
  // on `floor(($900,000 − $1,666.67) × 1.065^(1/12))` = $903,060.08 — NOT $900,000 grown, which
  // is what the TRIS walk above shows, because nothing draws a TRIS. The limb offers the whole of
  // it, $6,666.67 is spent, and $896,393.41 is what the household can still reach at the close.
  assert.equal(limb5Of(at(months, '2026-08')).available, Math.floor((toCents(900_000) - toCents(1_666.67)) * 1.065 ** (1 / 12)));
  assert.equal(limb5Of(at(months, '2026-08')).available, 90_306_008);
  assert.equal(drawnIn(at(months, '2026-08')), 6_666_67);
  assert.equal(at(months, '2026-08').accessibleAssets, 89_639_341);
  assert.ok(at(months, '2026-08').protectedAssets > toCents(800_000));

  // **AND THE FIX DID NOT SIMPLY WIDEN ACCESS — the Person who has NOT ceased and is under 65
  // still has every cent of it counted out.** Same Household, same accumulation balance, no
  // `RETIRE`: `accessibleAssets` is NIL in all 48 preserved months and becomes the balance in
  // 2030-07, the month after Robin turns 65 on 2030-06-10 — the same month limb 5 first draws,
  // and the same month on both readings, because the automatic ground never depended on a
  // cessation. Three readers, one answer.
  assert.equal(nobodyRetired.filter((m) => m.accessibleAssets === toCents(0)).length, 48);
  assert.equal(nobodyRetired.filter((m) => m.accessibleAssets > toCents(0))[0].month, '2030-07');
  assert.equal(at(nobodyRetired, '2030-06').accessibleAssets, toCents(0));
  assert.ok(at(nobodyRetired, '2030-06').protectedAssets > toCents(1_100_000), 'the premise: the money is there and is not reachable');
  assert.deepEqual(
    nobodyRetired.filter((m) => m.accessibleAssets !== limb5Of(m).available - drawnIn(m)).map((m) => m.month),
    [],
    'the two readers disagree on the preserved fixture too',
  );
});

// --- §2 The entry funds those months, and Shortfall Age moves LATER ------------------------------

test('THE HEADLINE: a $300,000 withdrawal funds 52 months and moves the Shortfall Age 58 months later', () => {
  const months = walk(lumpSum('ls', '2027-01-01', 300_000));
  assert.equal(months.length, BASE.length);

  // ⚠️ **RE-DERIVED 2026-09-21 (P4-1e), AND THE TWO EFFECTS PULL AGAINST EACH OTHER, WHICH IS WHY
  // THIS FIXTURE IS WORTH THE RE-DERIVATION.** It was titled *"funds 45 months and moves the
  // Shortfall Age 51 months later"*, on the arithmetic *"$300,000 ÷ $6,666.67 = 45.0 months, so
  // 2027-01 through 2030-09 are funded and the shortfall resumes in 2030-10"* — right for a walk
  // with no Age Pension past 2027-03. Kit turns 67 on 2027-01-15, so with the standing table wired
  // this Household is paid a pension in 53 of the 60 months, and:
  //
  //   * the pension pays part of every month's target, so the SAME $300,000 stretches further —
  //     $43,739.84 of pension across the walk, and 51 months funded rather than 45;
  //   * and the withdrawal sits in the Offset, which is an assessable financial investment, so the
  //     DEEMED income on it cuts the pension while the cash lasts: $635.61 in 2027-02 against the
  //     $2,021.50 this couple is paid with an empty Offset, climbing back to $969.74 by 2031-04 as
  //     the money drains. The withdrawal pays for part of its own pension.
  //
  // The second is why the money does not simply last to the horizon: $6,666.67 a month against a
  // pension the withdrawal itself suppresses is not $6,666.67 minus $2,021.50.
  //
  // ⚠️ **AND ONE MONTH MORE SINCE 2026-09-23: 52 funded, and 58 months later.** A plan with no series
  // now INDEXES the rates on its own growth rates instead of carrying the 2026 sets. The income
  // test's taper is on the deemed income, not on the maximum, so every cent the maximum rises by
  // is paid: $49,238.58 of pension across the walk against $43,739.84, $5,498.74 more — about one
  // month of the $6,666.67 target net of the ~$1,100 pension paid beside it. So the money runs out
  // one month later, and 2031-04 — $969.74 of pension beside an empty Offset on the carried rates,
  // $1,171.91 beside $5,728.47 of cash now — is funded.
  const short = shortMonths(months);
  assert.deepEqual(short.slice(0, 6), ['2026-07', '2026-08', '2026-09', '2026-10', '2026-11', '2026-12']);
  assert.equal(short.includes('2027-01'), false, 'the withdrawal’s own month is still short — the cash did not reach the Waterfall');
  assert.equal(short.includes('2031-04'), false);
  assert.equal(short.includes('2031-05'), true);
  assert.equal(short.length, 8, 'six months before the withdrawal and two after the money ran out');

  // THE DIRECTION, over all sixty months and never on the last one: no month is worse off, and
  // fifty-one months that could not be funded now are.
  const worse = BASE.filter((month, index) => shortfallIn(months[index]) > shortfallIn(month));
  assert.deepEqual(worse.map((month) => month.month), [], 'a withdrawal made some month SHORTER of money');
  const fixed = BASE.filter((month, index) => shortfallIn(month) > 0 && shortfallIn(months[index]) === 0);
  assert.equal(fixed.length, 52);

  // AND THE HEADLINE NUMBER MOVES. 2026-07 → 2031-05 is fifty-eight months later, and the walk now
  // recovers, which it never did.
  const answer = shortfallAge(months, KIT_AND_ROBIN);
  assert.equal(answer.pointOfNoRecovery.month, '2031-05');
  assert.equal(answer.recovered, true);
  assert.equal(answer.monthsShort, 8);
  // The ages are the other half of the answer, and they are read off the dates of birth:
  // Kit, born 1960-01-15, on 2031-05-01 is 71; Robin, born 1965-06-10, is 65.
  assert.deepEqual(answer.pointOfNoRecovery.ages, [{ name: 'Kit', age: 71 }, { name: 'Robin', age: 65 }]);
});

const shortfallIn = (month) => month.lines.filter((line) => line.description === SHORTFALL_LINE).reduce((total, line) => total + line.amount, 0);

test('a withdrawal to NEVER: enough of it, early enough, and the walk never falls short again', () => {
  // $6,666.67 × 54 months from 2027-01 to the horizon is $360,000.18, and $5,000 of Offset is
  // already in hand, so $400,000 covers the rest of the walk with room to spare.
  const months = walk(lumpSum('ls', '2027-01-01', 400_000));
  assert.deepEqual(shortMonths(months).slice(6), [], 'the walk still falls short after the withdrawal');
  const answer = shortfallAge(months, KIT_AND_ROBIN);
  // Still a shortfall — the six months BEFORE the withdrawal are real and are not rewritten — but
  // the household recovers and never returns, which is the fact `pointOfNoRecovery` reports.
  assert.equal(answer.outcome, 'shortfall');
  assert.equal(answer.recovered, true);
  assert.equal(answer.pointOfNoRecovery, undefined, 'a walk that recovers and never falls short again has no point of no recovery');
  assert.equal(answer.monthsShort, 6);
});

// --- §3 The balance actually falls, and there is only one copy of it ------------------------------

test('THE BALANCE MOVES: the super falls by the withdrawal AND stops earning on it', () => {
  const months = walk(lumpSum('ls', '2027-01-01', 300_000));

  // The line: one per entry, named for the Person whose interest paid it, attributed to the entry.
  const paid = lineOf(months, '2027-01', `${SUPER_LUMP_SUM_LINE}, Robin`);
  assert.equal(paid.length, 1);
  assert.equal(paid[0].amount, toCents(300_000));
  assert.equal(paid[0].direction, 'inflow');
  assert.equal(paid[0].effect, 'cash');
  assert.deepEqual(paid[0].attribution, statedBy('ls'));

  // The other half of the one change, and the month AFTER the withdrawal is where the fall is
  // assessed (the means test reads the month's opening position, ADR-0005).
  //
  // **The super is `assessableAssets` LESS the Offset, and the subtraction is the point.** A TRIS
  // is assessed at every age, so `assessableAssets` holds Robin's interest AND the running cash —
  // and the cash is where the withdrawal went. Reading the total would report a fall of $8,245.18,
  // which is the money that was SPENT, not the money that MOVED: the $300,000 is still in there,
  // one pocket to the left. `openingBalance` is the Offset (P4-3b), so the difference is the
  // interest and nothing else.
  const superOf = (walkOf, month) => at(walkOf, month).assessableAssets - at(walkOf, month).openingBalance;
  const before = superOf(BASE, '2027-02');
  const after = superOf(months, '2027-02');
  const fall = before - after;
  // STRICTLY MORE than the withdrawal, and by a month's growth on it: the money left the fund AND
  // stopped earning there. One month at 6.5% is about 0.53%, so $300,000 × 1.0053 = $301,578.
  assert.ok(fall > toCents(300_000), `the balance fell by ${fall}, which is not more than the $300,000 that left it`);
  assert.ok(fall < toCents(301_600), `the balance fell by ${fall}, which is more than the withdrawal plus one month's growth on it`);

  // And nothing reached back: every month before the entry's own is identical, `Month` for `Month`.
  const index = BASE.findIndex((month) => month.month === '2027-01');
  assert.deepEqual(months.slice(0, index), BASE.slice(0, index));
});

test('the money is in ONE place: it leaves super and arrives in the cash the Waterfall spends', () => {
  const months = walk(lumpSum('ls', '2027-01-01', 300_000));
  const month = at(months, '2027-01');

  // The reconciliation the whole model rests on: closing = opening + every inflow − every outflow.
  const moved = month.lines.reduce((total, line) => total + (line.effect === 'cash' ? (line.direction === 'inflow' ? line.amount : -line.amount) : 0), 0);
  assert.equal(month.closingBalance, month.openingBalance + moved);
  // $5,000 was long gone, so the close is $300,000 less the month's $6,666.67 of spending.
  assert.equal(month.closingBalance, toCents(300_000) - toCents(6_666.67));

  // **AND THE WITHDRAWAL DOES NOT RAISE REACHABLE MONEY BY ONE CENT, WHICH IS THIS TEST'S OWN
  // TITLE TAKEN SERIOUSLY (P4-11, 2026-09-19).** The superseded assertion was
  // `accessibleAssets > at(BASE, '2027-01').accessibleAssets + toCents(290_000)` — *"the
  // withdrawal raised what the household can REACH by what it withdrew"* — and it was true only
  // because `accessibleWealth` was counting Robin's released TRIS out of the BASE walk. It is
  // counted in now, so the $300,000 is reachable on BOTH sides and moving it between pockets
  // cannot create it. If this figure ever rises by the withdrawal again, the money is in TWO
  // places.
  //
  // HAND-WORKED, and the whole of the difference is the SPENDING: BASE is short in 2027-01 and
  // moves no money at all, while this walk pays its $6,666.67. Reachable money is therefore
  // exactly one month's spending LOWER here, and lower is the honest direction — this household
  // really did spend.
  assert.equal(at(months, '2027-01').accessibleAssets, at(BASE, '2027-01').accessibleAssets - toCents(6_666.67));
  assert.ok(at(BASE, '2027-01').lines.some((line) => line.description === SHORTFALL_LINE), 'BASE funded 2027-01, so the difference above is not the spending');
  assert.equal(at(months, '2027-01').lines.some((line) => line.description === SHORTFALL_LINE), false);
});

test('WHICH interest: the entry names one, and the other is not touched', () => {
  // Kit holds two TTR interests, $100,000 and $400,000. The entry names the SECOND.
  //
  // **Both are TRISs, and that is what keeps this test about the ENTRY** (2026-09-19). Limb 5
  // sweeps neither, so the only money that moves in either walk is the money the entry moved —
  // with accumulation interests here, the limb would draw Kit's $1,000 a month out of slot 0 in
  // BOTH walks and slot 0's growth would differ between them for a reason that has nothing to do
  // with which interest the entry named.
  //
  // **Kit's date of birth is load-bearing since P3-8's conversion limb was wired (2026-09-22).**
  // Both interests must still genuinely be TRISs at the entry's own month for this test to be
  // about the entry and not about R13's automatic-65 backstop: born 1960, Kit would already be 66
  // at `asAtDate` and SISR Schedule 1 item 106 would have converted both interests to Account-Based
  // Pensions automatically, years before this walk starts — and a withdrawal out of a retirement-phase
  // stream skips the release gate and carries a transfer balance sentence this test is not about.
  // Born 1962-03-01, Kit is 64 at `asAtDate` and turns 65 on 2027-03-01, after every month this
  // test reads (the entry is 2026-08-01, the assertion is 2026-09).
  //
  // **And Kit now needs a stated `RETIRE`, for the same reason.** At age 66 the automatic release
  // age itself satisfied the Condition of Release; under 65 it does not, and §3.9 makes the
  // Condition of Release a boolean per Person that reaching Preservation Age alone never satisfies
  // (`PreservedBenefitError`). Retiring in 2024, well past Preservation Age (60), releases the
  // benefit on the EMPLOYMENT ground instead — a fact wholly separate from the automatic-65 ground
  // this test is not about, and dated well before every month this test reads.
  const household = {
    persons: [person('Kit', '1962-03-01', [ttr(100_000), ttr(400_000)])],
    homeStatus: 'occupied',
    openingOffsetBalance: toCents(1_000),
  };
  const spend = entry('sc', 'household', 'SPEND_CHANGE', '2026-07-01', { annualSpend: toCents(12_000) });
  const retired = entry('rt', 'personA', 'RETIRE', '2024-01-01', {});
  const run = (...entries) => project(settings('2026-07-01', 67), household, [spend, retired, ...entries]);
  const base = run();
  const months = run(lumpSum('ls', '2026-08-01', 50_000, 1, 'personA'));

  // The growth lines are one per interest, in the Household's own stated order, so they are where
  // a per-interest balance is observable. Slot 0 is untouched to the cent; slot 1 earns less,
  // because it is $50,000 smaller — about $263 a month at 6.5%.
  const growth = (walkOf, month) => walkOf.find((each) => each.month === month).lines
    .filter((line) => line.description === 'Investment growth, Kit — Superannuation, TTR')
    .map((line) => line.amount);
  assert.equal(growth(base, '2026-09').length, 2, 'the premise: two interests, two growth lines');
  assert.equal(growth(months, '2026-09')[0], growth(base, '2026-09')[0], 'the interest the entry did NOT name moved');
  const lost = growth(base, '2026-09')[1] - growth(months, '2026-09')[1];
  assert.ok(lost > toCents(250) && lost < toCents(280), `slot 1 lost ${lost} of growth, which is not one month at 6.5% on $50,000`);
});

// --- §4 More than the interest holds -------------------------------------------------------------

test('a withdrawal LARGER than the balance pays out what is there, says so, and leaves no negative balance', () => {
  // $2,000,000 asked of an interest holding about $935,000 by 2027-01.
  const months = walk(lumpSum('ls', '2027-01-01', 2_000_000));
  const [note] = withdrawalNotes(months);

  assert.equal(note.requested, toCents(2_000_000));
  assert.ok(note.paid < note.requested, 'the cap did not bite');
  assert.ok(note.paid > toCents(900_000), 'the whole balance was not paid out');
  // The line carries what was PAID and never what was asked for.
  assert.equal(lineOf(months, '2027-01', `${SUPER_LUMP_SUM_LINE}, Robin`)[0].amount, note.paid);

  // The interest is empty afterwards and never negative — and it is the only protected asset here,
  // so a protected figure of exactly nil is the whole of that claim.
  assert.equal(at(months, '2027-02').protectedAssets, toCents(0));
  for (const month of months) {
    assert.ok(month.protectedAssets >= 0, `${month.month} holds a negative protected balance`);
    assert.ok(month.closingBalance >= 0, `${month.month} closes negative`);
  }
});

// --- §5 The means test: taking money out of super can REDUCE the Age Pension ----------------------

test('THE COUNTER-INTUITIVE ONE: the withdrawal moves money from an EXEMPT pool into an assessable one, and the pension falls', () => {
  // Robin is 61 and under Age Pension age, so Robin's super is **exempt** — the means test does not
  // see it at all. The Offset Account is assessable in full. So a withdrawal does not merely fail
  // to help the pension: it converts exempt wealth into assessed wealth and **cuts** it.
  //
  // Kit reaches Age Pension age on 2027-01-15, and this plan states no forward indexation series,
  // so 2027-02 and 2027-03 are the two months of this walk that carry a pension at all. The
  // withdrawal is dated 2027-02-01 and the assessment that sees it is 2027-03's, because the means
  // test reads the month's OPENING position (ADR-0005).
  //
  // **Measured on the ACCUMULATION fixture, because the exempt pool is the whole mechanism** — a
  // TRIS is assessed at every age and would have nothing to convert. Limb 5 is live on this
  // fixture and draws the month's spending out of the same account, which is why the fall below is
  // a few thousand short of the $600,000 withdrawn rather than exactly it.
  const base = released();
  const months = released(lumpSum('ls', '2027-02-01', 600_000));

  const pension = (walkOf, month) => lineOf(walkOf, month, 'Age Pension').map((line) => line.amount);
  assert.deepEqual(pension(base, '2027-02'), pension(months, '2027-02'), 'the withdrawal’s own month is assessed on the position it OPENED with');
  assert.equal(pension(base, '2027-03').length, 1, 'the premise: there is a pension to reduce');
  assert.ok(
    pension(months, '2027-03')[0] < pension(base, '2027-03')[0],
    `the pension did not fall: ${pension(months, '2027-03')[0]} against ${pension(base, '2027-03')[0]}`,
  );

  // The mechanism, and it is the reason the direction runs this way: the exempt pool shrinks by
  // the withdrawal and the assessed pool grows by it. The base walk holds NIL assessable — limb 5
  // draws only what the month needs and the month spends it — so every assessed dollar here is the
  // entry's, sitting in the Offset waiting to be spent.
  assert.equal(at(base, '2027-03').assessableAssets, toCents(0));
  assert.ok(at(months, '2027-03').assessableAssets > toCents(590_000));
  const exemptFall = at(base, '2027-03').protectedAssets - at(months, '2027-03').protectedAssets;
  assert.ok(exemptFall > toCents(590_000) && exemptFall < toCents(600_000), `the exempt pool fell by ${exemptFall}`);
});

// --- §6 The tax: nil, and it is a nil the engine SAID -------------------------------------------

test('NIL TAX IS ASSERTED, NOT ABSENT: the note states the figure, the age, the rule and the assumption', () => {
  const months = walk(lumpSum('ls', '2027-01-01', 300_000));
  const notes = withdrawalNotes(months);
  assert.equal(notes.length, 1, 'one note, in the withdrawal’s own month and nowhere else');

  const [note] = notes;
  assert.equal(note.person, 'Robin');
  assert.equal(note.interestIndex, 0);
  assert.equal(note.entryId, 'ls');
  assert.equal(note.requested, toCents(300_000));
  assert.equal(note.paid, toCents(300_000));
  // The figure, stated. A month with no tax line and no note would say the same thing as a month
  // in which nobody asked the question, and only one of those is a claim.
  assert.equal(note.taxWithheld, toCents(0));
  assert.match(note.note, /nil tax/i);
  assert.match(note.note, /\b61\b/, 'the age the conclusion turns on is in the note');
  assert.match(note.note, /tax-free, no PAYG/, 'the register’s own words for the rule');
  // AND THE ASSUMPTION UNDERNEATH IT, with its direction — the part-time-week treatment.
  assert.match(note.note, /TAXED SOURCE IS ASSUMED/);
  assert.match(note.note, /untaxed-source/);
  assert.match(note.note, /too low/, 'the note must say WHICH WAY the error runs for a household it does not fit');

  // No tax line was emitted for the withdrawal, which is what "nil" has to mean in the lines too.
  assert.deepEqual(at(months, '2027-01').lines.filter((line) => /tax/i.test(line.description)), []);
});

// How the note READS on screen — the row's wording, both figures and the tax — is app-layer and is
// pinned in `test/app-month-to-rows.test.mjs` ("a super withdrawal row …"), not here (P6-14).

// --- §7 The empty state: a plan with no withdrawal is the plan it always was ---------------------

test('EMPTY STATE: no withdrawal, no note, no line, and the seven limb notes are the only limb notes', () => {
  for (const month of BASE) {
    assert.deepEqual(month.notes.filter((note) => note.subject === 'super withdrawal'), []);
    assert.deepEqual(month.lines.filter((line) => line.description.startsWith(SUPER_LUMP_SUM_LINE)), []);
    // The subjects a month can carry are limb notes, plus whichever of the two parameter-age
    // subjects applies to it — `parameter window` below the first determination and, since
    // 2026-09-21, `standing parameters` above the last published one (P4-1e). A FIFTH WATERFALL
    // LIMB would show up here, in every month of every walk, and this is the assertion that says
    // there is not one: the mechanism is an entry.
    const expected = ['waterfall limb'];
    for (const subject of ['parameter window', 'standing parameters']) {
      if (month.notes.some((note) => note.subject === subject)) expected.push(subject);
    }
    // **And from 2026-09-23, ONE `pension at retirement` note in the walk's first month**: Robin's
    // RETIRE (2025-08-01) is before the walk opens, so her account stays in the phase the plan
    // states and the note says why no switch happened. It is not a withdrawal and moves no money.
    if (month === BASE[0]) {
      expected.push('pension at retirement');
      assert.deepEqual(month.notes.filter((note) => note.subject === 'pension at retirement').map((note) => [note.person, note.outcome]),
        [['Robin', 'retired before the plan']]);
    }
    assert.deepEqual([...new Set(month.notes.map((note) => note.subject))].sort(), expected.sort(), month.month);
    // **FIVE limb notes since 2026-09-19, SEVEN since 2026-09-23** (the pension split at its minimum,
    // the cash at the home loan), and released super reports nil in every month of this walk
    // because it does not sweep a TRIS. A `super withdrawal` note appearing anywhere here would
    // mean the limb had drawn one — which is the assertion above it.
    assert.equal(month.notes.filter((note) => note.subject === 'waterfall limb').length, 7);
  }
});

// --- §8 The refusals, each on its own ground ------------------------------------------------------

const NIA = {
  persons: [person('Nia', '1967-01-20', [accumulation(500_000)])],
  homeStatus: 'occupied',
  openingOffsetBalance: toCents(1_000),
};
const SMALL_SPEND = entry('sc', 'household', 'SPEND_CHANGE', '2026-07-01', { annualSpend: toCents(12_000) });
const runNia = (...entries) => project(settings('2026-07-01', 62), NIA, [SMALL_SPEND, ...entries]);

test('BELOW THE TAX-FREE AGE: refused BY NAME, and the same entry seven months later is honoured', () => {
  // Nia turns 60 on 2027-01-20. The two runs differ in the withdrawal's DATE and in nothing else,
  // which is what makes this a test of the gate rather than of the fixture.
  const early = () => runNia(lumpSum('ls', '2026-08-01', 50_000, 0, 'personA'));
  assert.throws(early, LumpSumBelowTaxFreeAgeError);
  assert.throws(early, /Nia is 59 on 2026-08-01/);
  // The ground is in the message, because the ground is what a later author has to close: the
  // taxable/tax-free component split, and the direction a guess would run in.
  assert.throws(early, /taxable component/i);
  assert.throws(early, /307-345/);
  assert.throws(early, /flattering/);

  // The positive control, and it needs BOTH gates: at 60 with a cessation after Preservation Age.
  const later = runNia(
    entry('rr', 'personA', 'RETIRE', '2027-02-01', {}),
    lumpSum('ls', '2027-03-01', 50_000, 0, 'personA'),
  );
  assert.equal(later.find((month) => month.month === '2027-03').lines.filter((line) => line.description === `${SUPER_LUMP_SUM_LINE}, Nia`).length, 1);
});

test('PAST THE TAX AGE AND STILL PRESERVED: the age gate does not stand in for the release gate', () => {
  // Nia at 60, having ceased nothing: past the tax-free age, and the benefit is still preserved.
  // This is the case that makes the two gates two gates.
  assert.throws(() => runNia(lumpSum('ls', '2027-03-01', 50_000, 0, 'personA')), PreservedBenefitError);
  assert.throws(() => runNia(lumpSum('ls', '2027-03-01', 50_000, 0, 'personA')), /no Condition of Release is met/);

  // And the other control: at 65 a benefit is released by age alone, with no `RETIRE` anywhere.
  const kit = {
    persons: [person('Kit', '1960-01-15', [accumulation(500_000)])],
    homeStatus: 'occupied',
    openingOffsetBalance: toCents(1_000),
  };
  const months = project(settings('2026-07-01', 67), kit, [SMALL_SPEND, lumpSum('ls', '2026-08-01', 50_000, 0, 'personA')]);
  assert.equal(months.find((month) => month.month === '2026-08').lines.filter((line) => line.description === `${SUPER_LUMP_SUM_LINE}, Kit`).length, 1);
});

test('the walk states the REAL cessation, so the register’s own window refusal is reachable — and only from here', () => {
  // Lee retired at 58 and is 61: `CessationBeforePreservationAgeError`'s window. The superseded
  // clause said this was a window *"`accessibleWealth` can never reach because it is handed no
  // entries and can only say `{ ceased: false }`"*; since P4-11 (2026-09-19) it is handed the
  // cessation and DOES reach it, so the last three assertions below are what stop that refusal
  // escaping from a reported figure. The THROW is still this entry path's alone.
  const lee = {
    persons: [person('Lee', '1965-06-10', [accumulation(500_000)])],
    homeStatus: 'occupied',
    openingOffsetBalance: toCents(1_000),
  };
  const retiredAt58 = entry('rr', 'personA', 'RETIRE', '2023-08-01', {});
  const run = (...entries) => project(settings('2026-07-01', 63), lee, [SMALL_SPEND, retiredAt58, ...entries]);

  assert.throws(() => run(lumpSum('ls', '2026-08-01', 50_000, 0, 'personA')), CessationBeforePreservationAgeError);
  // And the same Household, same entries, WITHOUT the withdrawal, walks to the end: the improvement
  // is scoped to this entry, and no existing plan can be refused by it.
  assert.equal(run().length, 24);

  // **P4-11: `accessibleWealth` now asks the same question and must NOT throw, must NOT resolve
  // what `conditionOfRelease` declined to resolve, and must leave the money OUT.** The register
  // and the SIS definition disagree for exactly these years; the conservative reading of an
  // undetermined release is that the household cannot reach it. Limb 5 offers nil on the same
  // facts and for the same reason, so the two readers agree here too — on a nil.
  const walked = run();
  assert.equal(walked.filter((month) => month.accessibleAssets > toCents(0)).length, 0, 'an undetermined release became reachable money');
  assert.ok(walked[0].protectedAssets >= toCents(500_000), 'the premise: the $500,000 is in the walk');
  assert.deepEqual(walked.filter((month) => limb5Of(month).available !== toCents(0)).map((m) => m.month), []);
  assert.match(limb5Of(walked[0]).note, /CessationBeforePreservationAgeError/);
});

// **AN ACCOUNT-BASED PENSION PAYS A LUMP SUM (2026-09-23).** It was refused by name until then
// (`LumpSumFromPensionInterestNotModelledError`), on the ground that the walk keeps no transfer
// balance account to record a commutation's debit against. In law a retirement-phase stream may pay
// any amount above its minimum and may be partially commuted, so the withdrawal is honoured and the
// missing debit is SAID on the month's note instead of refused. Ash's stream has a stated
// commencement day, so limb 2 is live in both walks and the entry is tested beside it, not alone.
const abp = (dollars) => ({ phase: 'accountBasedPension', balance: toCents(dollars), statedStreamSettings: { commencementDay: '2020-07-01' } });
const ashAged = (dateOfBirth, interest) => ({
  persons: [person('Ash', dateOfBirth, [interest])],
  homeStatus: 'occupied',
  openingOffsetBalance: toCents(1_000),
});

test('AN ACCOUNT-BASED PENSION PAYS A LUMP SUM: the balance falls by exactly what was paid, and the cash rises by it', () => {
  // $60,000 a year is $5,000.00 a month, more than Ash's Age Pension, so limb 2 draws in every month.
  const ash = ashAged('1958-03-10', abp(500_000));
  const spend = entry('sc', 'household', 'SPEND_CHANGE', '2026-07-01', { annualSpend: toCents(60_000) });
  const control = project(settings('2026-07-01', 69), ash, [spend]);
  const months = project(settings('2026-07-01', 69), ash, [spend, lumpSum('ls', '2026-08-01', 50_000, 0, 'personA')]);

  const paid = lineOf(months, '2026-08', `${SUPER_LUMP_SUM_LINE}, Ash`);
  assert.equal(paid.length, 1);
  assert.equal(paid[0].amount, toCents(50_000));
  assert.deepEqual(paid[0].attribution, statedBy('ls'));
  assert.equal(lineOf(control, '2026-08', `${SUPER_LUMP_SUM_LINE}, Ash`).length, 0);

  // HAND-WORKED from the mechanism, and exact. The two walks are identical to 2026-08's opening,
  // so the Age Pension (assessed at the opening) and the $5,000.00 of spending are identical in
  // that month, and limb 2 pays what the pension does not out of the pension account in BOTH walks
  // — what is still owed of the year's minimum is drawn before any cash, including the cash the
  // withdrawal landed in (2026-09-23). So the month's only difference is the $50,000
  // moved from the fund to the cash: `superBalance` is after the month's draws and before its
  // growth, and the Offset is the running cash.
  assert.deepEqual(months.slice(0, 1), control.slice(0, 1), 'a month before the withdrawal moved');
  assert.equal(at(control, '2026-08').superBalance - at(months, '2026-08').superBalance, toCents(50_000));
  assert.equal(at(months, '2026-08').closingBalance - at(control, '2026-08').closingBalance, toCents(50_000));
  // NO DOUBLE-DRAW: the pension was offered the balance AFTER the withdrawal, by exactly the
  // $50,000. Since 2026-09-23 the offer is two limbs: what is still owed of the year's minimum,
  // which the withdrawal does NOT reduce (it is not counted toward the minimum — the note says so
  // below), and the rest of the account, which falls by the whole $50,000.
  const limbOf = (walkOf, name) => at(walkOf, '2026-08').notes.find((n) => n.subject === 'waterfall limb' && n.limb === name);
  const limb2 = (walkOf) => limbOf(walkOf, 'accountBasedPensionMinimum');
  const above = (walkOf) => limbOf(walkOf, 'accountBasedPensionAboveMinimum');
  assert.equal(limb2(control).available, limb2(months).available);
  assert.equal(above(control).available - above(months).available, toCents(50_000));
  assert.equal(limb2(months).drawn, limb2(control).drawn);
  assert.ok(limb2(months).drawn > 0, 'the premise: limb 2 is live in the withdrawal month');

  // THE SCREEN SAYS WHAT IS NOT MODELLED: the transfer balance debit, and the minimum.
  const [note] = withdrawalNotes(months);
  assert.equal(note.paid, toCents(50_000));
  assert.equal(note.taxWithheld, toCents(0));
  assert.match(note.note, /transfer balance DEBIT/);
  assert.match(note.note, /294-80\(1\) item 1/);
  assert.match(note.note, /NOT modelled/);
  assert.match(note.note, /O57/);
  assert.match(note.note, /not counted toward the year's minimum/);
  // And the sentence is the Account-Based Pension's alone: a withdrawal out of a TTR does not carry it.
  assert.equal(withdrawalNotes(walk(lumpSum('ls', '2027-01-01', 300_000))).some((n) => /transfer balance/.test(n.note)), false);
});

test('THE RELEASE GATE is not asked of an Account-Based Pension — and still is of a TTR and of accumulation', () => {
  // Ash is 62 on 2026-08-01 and has ceased nothing. Retirement phase is itself the release, and
  // limb 2 pays the same balance out in full without asking, so the lump sum is paid.
  const run = (interest) => project(settings('2026-07-01', 64), ashAged('1964-03-10', interest), [SMALL_SPEND, lumpSum('ls', '2026-08-01', 50_000, 0, 'personA')]);
  assert.deepEqual(lineOf(run(abp(500_000)), '2026-08', `${SUPER_LUMP_SUM_LINE}, Ash`).map((line) => line.amount), [toCents(50_000)]);
  // The SAME Person, the same day, the same amount, out of a TTR: preserved, and refused.
  assert.throws(() => run(ttr(500_000)), PreservedBenefitError);
  assert.throws(() => run(ttr(500_000)), /no Condition of Release is met/);
  assert.throws(() => run(accumulation(500_000)), PreservedBenefitError);
});

test('THE TAX AGE is still asked of an Account-Based Pension', () => {
  // Ash is 58: the lump sum is taxed on its taxable component, a split this model holds nowhere.
  const ash = ashAged('1968-03-10', abp(500_000));
  const run = () => project(settings('2026-07-01', 60), ash, [SMALL_SPEND, lumpSum('ls', '2026-08-01', 50_000, 0, 'personA')]);
  assert.throws(run, LumpSumBelowTaxFreeAgeError);
  assert.throws(run, /Ash is 58 on 2026-08-01/);
});

test('an interest the Person does not hold, and a household-owned withdrawal, are both refused', () => {
  const kit = {
    persons: [person('Kit', '1960-01-15', [accumulation(500_000)])],
    homeStatus: 'occupied',
    openingOffsetBalance: toCents(1_000),
  };
  const run = (entryValue) => project(settings('2026-07-01', 67), kit, [SMALL_SPEND, entryValue]);

  assert.throws(() => run(lumpSum('ls', '2026-08-01', 50_000, 3, 'personA')), /names superannuation interest 3, and Kit holds 1/);
  assert.throws(() => run(lumpSum('ls', '2026-08-01', 50_000, 3, 'personA')), /refused rather than guessed/);
  assert.throws(() => run(lumpSum('ls', '2026-08-01', 50_000, 0, 'household')), /comes out of ONE Person's superannuation interest/);
});
