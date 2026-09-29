// P10-1 / P10-2 — **the sustainable-spend search, and the refusals it no longer needs.**
//
// **The gate this file is downstream of.** Phase 10 was BLOCKED (`fc06773`) because both shortfall
// markers invert in the spending level on a plan that funds itself by selling investments: the tax
// on a sale was charged outside the money the month set aside, so a month reported an unfunded
// shortfall equal to its own tax and a household holding $18m was reported short. The solver was
// built inside a refusal by name for any plan holding a parcel.
//
// ⚠️ **THAT REFUSAL IS GONE (P10-4, 2026-09-21) AND §1 IS WHAT REPLACED IT.** The engine grosses
// limb 3's draw up so that each sale funds its own capital gains tax, the defect the refusal named
// does not exist, and `INVESTMENTS_REFUSAL`, the `holdsInvestments` kind and the `holdsInvestments`
// predicate are deleted with it. §1 now asserts the thing the refusal stood in for: **a
// parcel-holding plan is answered, the answer walks clean, and every sale in that walk funds the tax
// it causes.**
//
// **The predicate was swept before it was searched over.** ~2,500 parcel-free samples across eleven
// plan shapes, 0 violations of downward-closure; the same harness took 864 on a parcel-holding plan,
// and takes **0** since P10-4 (147 on the re-stated sweep of 1,476 samples before the fix, 0 after).
// Those measurements are in TODO.md Phase 10 and in `sustainableSpend.ts`'s header; what this file
// pins is that the search lands on the right SIDE of the boundary it converged on (§2), which is the
// one thing a monotone predicate does not give you for free.
//
// **§2's round trip is the test that matters.** It takes the answer, writes it back into the plan as
// a stated spending level, walks it, and asserts no month is short — then adds one resolution step
// and asserts a month IS. A search that returned the failing end of its own bracket, or that was off
// by one step, passes every "is it about right" assertion and fails that pair.
import test from 'node:test';
import assert from 'node:assert/strict';

import { toCents } from '../dist/core/money.js';
import { priceLevelFactor } from '../dist/core/priceLevel.js';
import { project, RadPaymentUnfundedError } from '../dist/core/projection.js';
import { shortfallAge } from '../dist/core/outcomes.js';
import {
  HIGHEST_FACTOR,
  LOWEST_FACTOR,
  RESOLUTION_CENTS,
  scaledBy,
  sustainableSpend,
} from '../dist/core/sustainableSpend.js';

const C = (n) => toCents(n);

const SETTINGS = (over = {}) => ({
  asAtDate: '2026-09-01',
  planningHorizonAge: 100,
  economicSeries: { cpi: 0.025, pblci: 0.025, awote: 0.035, mtawe: 0.035 },
  deemingRates: { lower: 0.0175, upper: 0.0375 },
  nominalReturn: 0.065,
  ...over,
});

const person = (over) => ({
  name: 'X',
  dateOfBirth: '1968-05-14',
  superInterests: [{ phase: 'accumulation', balance: C(400_000) }],
  parcels: [],
  employmentIncomePerFortnight: C(0),
  workBonusBalance: C(0),
  ...over,
});

const spend = (annual, over = {}) => ({
  id: 'spend',
  date: '2026-09-01',
  owner: 'household',
  type: 'SPEND_CHANGE',
  params: { annualSpend: C(annual) },
  enabled: true,
  createdAt: '2026-08-20',
  ...over,
});

/**
 * **THE USER'S OWN PLAN SHAPE, and the one this build is scoped to** — two people, one
 * superannuation interest each, no investments outside super, both still working. §1 asserts that
 * the refusal does NOT fire here, because a refusal that caught the case it was written around would
 * be a refusal of everything.
 */
const WORKING_COUPLE = {
  persons: [
    person({ name: 'Kit', dateOfBirth: '1975-03-02', employmentIncomePerFortnight: C(4_200), superInterests: [{ phase: 'accumulation', balance: C(310_000) }] }),
    person({ name: 'Lee', dateOfBirth: '1978-11-20', employmentIncomePerFortnight: C(2_600), superInterests: [{ phase: 'accumulation', balance: C(180_000) }] }),
  ],
  homeStatus: 'occupied',
};

/** A retired couple, both on Account-Based Pensions — the shape P10-5's opening part-year bites on. */
const RETIRED_COUPLE = {
  persons: [
    person({ name: 'Sam', dateOfBirth: '1958-12-05', superInterests: [{ phase: 'accountBasedPension', balance: C(620_000), statedStreamSettings: { commencementDay: '2021-09-01' } }] }),
    person({ name: 'Ali', dateOfBirth: '1961-03-18', superInterests: [{ phase: 'accountBasedPension', balance: C(430_000), statedStreamSettings: { commencementDay: '2023-02-01' } }] }),
  ],
  homeStatus: 'occupied',
  openingOffsetBalance: C(30_000),
};

// --- §1 The refusal is GONE: a plan holding investments outside super is ANSWERED ----------------

/** A Person holding one parcel, on the demo couple's own figures. */
const withParcel = (household) => ({
  ...household,
  persons: [
    { ...household.persons[0], parcels: [{ acquired: '2014-03-11', costBase: C(38_000), marketValue: C(96_500) }] },
    ...household.persons.slice(1),
  ],
});

test('§1 a Person holding a parcel is ANSWERED, and the answer walks clean', () => {
  // ⚠️ **THIS TEST ASSERTED THE REFUSAL UNTIL 2026-09-21** — `kind === 'holdsInvestments'`, no
  // figure, and `walks === 0` because the plan was refused before any search began. The mechanism it
  // named is fixed (P10-4), so what is asserted is the thing the refusal was standing in for.
  const household = withParcel(WORKING_COUPLE);
  const answer = sustainableSpend(SETTINGS(), household, [spend(70_000)]);
  assert.notEqual(answer.kind, 'holdsInvestments');
  assert.ok(answer.factor > 0);
  assert.ok(answer.sustainableAnnualSpend > 0);
  assert.ok(answer.walks > 1, 'the plan is searched over rather than decided off its balance sheet');
  assert.equal(answer.reason, undefined);

  // The round trip §2 makes on a parcel-free plan, made here on a parcel-holding one.
  const at = project(SETTINGS(), household, [spend(0, { params: { annualSpend: answer.sustainableAnnualSpend } })]);
  assert.equal(shortfallAge(at, household).outcome, 'never', 'the figure this tool prints must itself walk clean');
});

test('§1 every sale in the answer’s own walk funds the tax it causes — the identity, not a figure', () => {
  const household = withParcel(WORKING_COUPLE);
  const answer = sustainableSpend(SETTINGS(), household, [spend(70_000)]);
  const at = project(SETTINGS(), household, [spend(0, { params: { annualSpend: answer.sustainableAnnualSpend } })]);
  const limb3 = (month) => month.notes.find((n) => n.subject === 'waterfall limb' && n.limb === 'nonSuperPortfolio');
  const sold = at.filter((m) => m.lines.some((l) => l.description.startsWith('Non-Super Portfolio sale')));
  assert.ok(sold.length > 0, 'the identity would be vacuous with no sale in the walk');
  const spareCent = [];
  for (const month of sold) {
    const proceeds = month.lines.filter((l) => l.description.startsWith('Non-Super Portfolio sale')).reduce((t, l) => t + l.amount, 0);
    const tax = month.lines.filter((l) => l.description.startsWith('Income tax on capital gain')).reduce((t, l) => t + l.amount, 0);
    // From 1 July 2027 the floored indexed cost base can make one more cent of proceeds LOWER the
    // gain by a cent (LR-1 slice 2), so the least sale can cover the draw with a cent to spare.
    const spare = proceeds - tax - limb3(month).drawn;
    assert.ok(spare === 0 || spare === 1, `${month.month}: the sale did not fund its own tax (${spare})`);
    if (spare === 1) spareCent.push(month.month);
  }
  // **The months with a cent to spare, pinned (LR-1 slice 2, 2026-09-29).** In each of them, replayed by
  // hand on the parcel, the year's net capital gain at the sale actually made is ONE CENT LOWER than
  // at a sale one cent smaller: the extra cent carried a cent more of the apportioned stamp, and the
  // floored indexed cost base rose by two. The tax fell a cent, so the least covering sale covers one over.
  assert.deepEqual(spareCent, ['2029-11', '2033-11', '2034-07']);
  // **And the phantom is gone as a CLASS and not only on this fixture**: no month anywhere in the
  // walk carries a shortfall equal to its own capital gains tax, which is the shape the defect took
  // every single time it appeared.
  for (const month of at) {
    const short = month.lines.filter((l) => l.description === 'Unfunded shortfall').reduce((t, l) => t + l.amount, 0);
    const tax = month.lines.filter((l) => l.description.startsWith('Income tax on capital gain')).reduce((t, l) => t + l.amount, 0);
    assert.ok(!(tax > 0 && short === tax), `${month.month}: short by exactly its own capital gains tax`);
  }
});

test('§1 a plan that holds no parcel today but BUYS one inside the walk is answered too', () => {
  const buy = {
    id: 'buy',
    date: '2031-04-01',
    owner: 'personA',
    type: 'NON_SUPER_INVESTMENT',
    params: { direction: 'buy', amount: C(50_000), incidentalCostsOfAcquisition: C(30) },
    enabled: true,
    createdAt: '2026-08-20',
  };
  // The refusal fired on the ENTRY as well as on the opening balance sheet, because a plan that buys
  // in 2031 holds a parcel from 2031. Both are answered now, and the entry-driven case is kept as a
  // test because it is the one a reader would expect to have been forgotten.
  const bought = sustainableSpend(SETTINGS(), WORKING_COUPLE, [spend(70_000), buy]);
  assert.notEqual(bought.kind, 'holdsInvestments');
  assert.ok(bought.sustainableAnnualSpend > 0);
  const sell = { ...buy, id: 'sell', date: '2035-04-01', params: { direction: 'sell', amount: C(20_000) } };
  const sold = sustainableSpend(SETTINGS(), withParcel(WORKING_COUPLE), [spend(70_000), sell]);
  assert.ok(sold.sustainableAnnualSpend > 0);
});

test('§1 the shape this build was scoped to still gets the same kind of answer', () => {
  const answer = sustainableSpend(SETTINGS(), WORKING_COUPLE, [spend(70_000)]);
  assert.equal(answer.kind, 'headroom');
  assert.ok(answer.factor > 1);
  assert.ok(answer.sustainableAnnualSpend > C(70_000));
});

test('§1 a parcel COSTS the household something, and the answer says so rather than ignoring it', () => {
  // **The vacuity control on the whole of §1.** If the parcel reached nothing, every assertion above
  // would pass on a plan the engine was quietly treating as parcel-free. The same household with the
  // same $96,500 held as PARCELS rather than not held at all answers differently, because the money
  // is real and because selling it is taxed.
  const withOut = sustainableSpend(SETTINGS(), WORKING_COUPLE, [spend(70_000)]);
  const withIn = sustainableSpend(SETTINGS(), withParcel(WORKING_COUPLE), [spend(70_000)]);
  assert.ok(withIn.sustainableAnnualSpend > withOut.sustainableAnnualSpend, 'holding $96,500 more bought no more spending');
});

// --- §2 The answer lands on the passing side of its own boundary ---------------------------------

test('§2 the converged level is funded in every month, and one step above it is not', () => {
  const answer = sustainableSpend(SETTINGS(), WORKING_COUPLE, [spend(70_000)]);
  assert.equal(answer.kind, 'headroom');

  const at = project(SETTINGS(), WORKING_COUPLE, [spend(0, { params: { annualSpend: answer.sustainableAnnualSpend } })]);
  assert.equal(shortfallAge(at, WORKING_COUPLE).outcome, 'never', 'the figure this tool prints must itself walk clean');

  // One resolution step above. The search is allowed to be this far out and no further.
  const above = answer.sustainableAnnualSpend + RESOLUTION_CENTS * 4;
  const beyond = project(SETTINGS(), WORKING_COUPLE, [spend(0, { params: { annualSpend: above } })]);
  assert.equal(shortfallAge(beyond, WORKING_COUPLE).outcome, 'shortfall', 'the answer must be AT the boundary, not below it');
});

test('§2 the month the answer is limited by is a month of a walk that was actually run', () => {
  const answer = sustainableSpend(SETTINGS(), WORKING_COUPLE, [spend(70_000)]);
  const above = answer.sustainableAnnualSpend + RESOLUTION_CENTS * 4;
  const beyond = project(SETTINGS(), WORKING_COUPLE, [spend(0, { params: { annualSpend: above } })]);
  assert.equal(shortfallAge(beyond, WORKING_COUPLE).firstShortfall.month, answer.bindsAt);
});

// --- §2b k scales the STATED figure and never the indexed one -----------------------------------

test('§2b `scaledBy` multiplies the stated cents and touches nothing else', () => {
  const entries = [
    spend(84_000),
    { id: 'roof', date: '2029-11-01', owner: 'household', type: 'ONE_OFF_EXPENSE', params: { amount: C(38_000) }, enabled: true, createdAt: '2026-08-20' },
  ];
  const scaled = scaledBy(entries, 0.5);
  assert.equal(scaled[0].params.annualSpend, C(42_000));
  assert.equal(scaled[1].params.amount, C(38_000), 'a one-off expense is a dated price, not a standard of living');
  // The caller's list is untouched — a search must not leave the plan it was asked about scaled.
  assert.equal(entries[0].params.annualSpend, C(84_000));
  assert.notEqual(scaled[0], entries[0]);
});

test('§2b a disabled SPEND_CHANGE is scaled too, so a re-enabled level is not the one gap', () => {
  const off = spend(50_000, { id: 'later', enabled: false });
  assert.equal(scaledBy([off], 0.5)[0].params.annualSpend, C(25_000));
});

test('§2b the factor is applied to the figure the user typed, NOT to the inflated one', () => {
  // The control is `cpi: 0`, where stated and inflated are the same number and the distinction is
  // invisible. With CPI running they differ by the price-level factor of whichever month is looked
  // at, so the round trip below can only hold if the stated figure is what was scaled.
  const settings = SETTINGS({ economicSeries: { cpi: 0.025, pblci: 0.025, awote: 0.035, mtawe: 0.035 } });
  const answer = sustainableSpend(settings, WORKING_COUPLE, [spend(70_000)]);
  assert.equal(answer.sustainableAnnualSpend, Math.round(C(70_000) * answer.factor));
  assert.equal(answer.atMonth, '2026-09', 'both figures are stated at asAtDate, where the price level is 1');
  const walked = project(settings, WORKING_COUPLE, [spend(0, { params: { annualSpend: answer.sustainableAnnualSpend } })]);
  assert.equal(shortfallAge(walked, WORKING_COUPLE).outcome, 'never');
});

test('§2b a plan with three levels keeps its shape — one factor on all three', () => {
  const entries = [
    spend(80_000, { id: 's1' }),
    spend(60_000, { id: 's2', date: '2040-09-01' }),
    spend(45_000, { id: 's3', date: '2050-09-01' }),
  ];
  const scaled = scaledBy(entries, 0.8);
  assert.deepEqual(
    scaled.map((entry) => entry.params.annualSpend),
    [C(64_000), C(48_000), C(36_000)],
  );
});

// --- §3 The Contingency Floor limb ---------------------------------------------------------------

/**
 * **The floor is measured against REACHABLE money** (`outcomes.ts`), and `WORKING_COUPLE` holds
 * everything in preserved super — so any floor at all is broken in its first month whatever it
 * spends, which tests nothing about the limb. This household holds $200,000 outside super in its
 * Offset Account, so a floor here is a constraint the spending level can actually satisfy or break.
 */
const BUFFERED_COUPLE = { ...WORKING_COUPLE, openingOffsetBalance: C(200_000) };

test('§3 a plan stating no floor is judged on the shortfall alone, and SAYS so', () => {
  const answer = sustainableSpend(SETTINGS(), BUFFERED_COUPLE, [spend(70_000)]);
  assert.equal(answer.floorApplied, false);
  assert.equal(answer.kind, 'headroom');
  assert.equal(answer.limitedBy, 'shortfall');
});

test('§3 a stated floor takes part in the test, and it can only lower the answer', () => {
  const without = sustainableSpend(SETTINGS(), BUFFERED_COUPLE, [spend(70_000)]);
  const with100k = sustainableSpend(SETTINGS({ contingencyFloor: C(100_000) }), BUFFERED_COUPLE, [spend(70_000)]);
  assert.equal(without.floorApplied, false);
  assert.equal(with100k.floorApplied, true);
  assert.ok(with100k.factor < without.factor, 'a buffer the household must hold back costs it spending');
});

test('§3 the floor limb can FAIL a plan outright — it is not a limb that always passes', () => {
  // A floor this household can never hold back. If the limb were inert this would answer a figure.
  const answer = sustainableSpend(SETTINGS({ contingencyFloor: C(5_000_000) }), BUFFERED_COUPLE, [spend(70_000)]);
  assert.equal(answer.kind, 'nothingWorks');
  assert.equal(answer.floorApplied, true);
  assert.equal(answer.factor, undefined);
  assert.equal(answer.limitedBy, 'floor', 'nothing is short here — it is the buffer that cannot be held');
});

test('§3 a floor broken in the opening months is answered, never refused', () => {
  // Refusal 2's first cut merged the two limbs' failing months and refused this plan, which is a
  // household that has simply set a buffer bigger than the money it can reach. Nothing is short.
  // The refusal is gone with P10-5, and the answer this asserts is the one it always deserved.
  const answer = sustainableSpend(SETTINGS({ contingencyFloor: C(5_000_000) }), BUFFERED_COUPLE, [spend(70_000)]);
  assert.equal(answer.kind, 'nothingWorks');
  assert.equal(answer.limitedBy, 'floor');
  assert.ok(answer.bindsAt < '2027-07', 'and it binds inside the opening part-year, which is no longer a reason to refuse');
});

test('§3 a bigger floor costs more spending than a smaller one', () => {
  const small = sustainableSpend(SETTINGS({ contingencyFloor: C(50_000) }), BUFFERED_COUPLE, [spend(70_000)]);
  const large = sustainableSpend(SETTINGS({ contingencyFloor: C(100_000) }), BUFFERED_COUPLE, [spend(70_000)]);
  assert.ok(large.factor < small.factor);
});

// --- §4 P10-5: the opening part financial year, and the identity that closed it ------------------

test('§4 THE SAME HOUSEHOLD, STATED ON TWO DIFFERENT DAYS, GETS THE SAME ANSWER', () => {
  // ⚠️ **THIS SECTION ASSERTED A REFUSAL UNTIL 2026-09-21.** A retired household stated as at
  // 1 September was given NO figure, because `project()` paid no Account-Based Pension minimum until
  // the following 1 July — it could not reach its own pension for ten months and was reported short
  // whatever it spent. The law never said that: SIS Reg Sch 7 cl 1(2)(a)(i) works the minimum out on
  // the 1 July balance whatever day a plan is written on, and cl 3 pro-rates only a year the pension
  // COMMENCED in. What was missing was the balance on that 1 July, and the walk now stands the
  // plan's own opening balance in for it and says so in the month's notes.
  //
  // **So the refusal is replaced by the identity it was standing in for, which is much stronger.**
  // The day a household happens to write its plan down is not a fact about its finances, so the two
  // answers must agree. Measured before the fix they were 2.2×–2.6× apart; the residue asserted here
  // is the one thing that legitimately differs — the pension account moved between 1 July and
  // 1 September, so the minimum rests on a slightly different balance.
  const september = sustainableSpend(SETTINGS(), RETIRED_COUPLE, [spend(62_000)]);
  const july = sustainableSpend(SETTINGS({ asAtDate: '2026-07-01' }), RETIRED_COUPLE, [spend(62_000, { date: '2026-07-01' })]);
  for (const answer of [september, july]) {
    assert.ok(answer.factor > 0, 'both are answered');
    assert.ok(answer.sustainableAnnualSpend > C(45_000), 'and neither is the far-too-low figure P10-5 produced');
    assert.ok(answer.bindsAt > '2027-07', 'and neither is decided by the opening part-year any more');
  }
  const gap = Math.abs(september.sustainableAnnualSpend - july.sustainableAnnualSpend) / july.sustainableAnnualSpend;
  assert.ok(gap < 0.02, `two statements of one household differ by ${(gap * 100).toFixed(2)}%`);
  assert.ok(gap > 0, 'and they are NOT identical: a two-month-older balance is a different balance');
});

test('§4 a single retired person is answered too — the shape P10-5 understated worst', () => {
  const single = {
    persons: [person({ name: 'Ros', dateOfBirth: '1957-04-09', superInterests: [{ phase: 'accountBasedPension', balance: C(620_000), statedStreamSettings: { commencementDay: '2021-09-01' } }] })],
    homeStatus: 'occupied',
    openingOffsetBalance: C(20_000),
  };
  const september = sustainableSpend(SETTINGS(), single, [spend(40_000)]);
  const july = sustainableSpend(SETTINGS({ asAtDate: '2026-07-01' }), single, [spend(40_000, { date: '2026-07-01' })]);
  assert.ok(september.sustainableAnnualSpend > C(40_000));
  const gap = Math.abs(september.sustainableAnnualSpend - july.sustainableAnnualSpend) / july.sustainableAnnualSpend;
  assert.ok(gap < 0.02, `two statements of one household differ by ${(gap * 100).toFixed(2)}%`);
});

test('§4 no answer kind is named `firstYearDecides` any more, anywhere', () => {
  // The refusal is DELETED, not narrowed — a refusal left standing for a defect that no longer
  // exists is worse than no refusal at all, because a reader believes it. This is the assertion that
  // fails if any of it is reinstated by accident.
  const answers = [
    sustainableSpend(SETTINGS(), RETIRED_COUPLE, [spend(62_000)]),
    sustainableSpend(SETTINGS(), RETIRED_COUPLE, [spend(400_000)]),
    sustainableSpend(SETTINGS({ contingencyFloor: C(5_000_000) }), RETIRED_COUPLE, [spend(62_000)]),
  ];
  for (const answer of answers) {
    assert.notEqual(answer.kind, 'firstYearDecides');
    if (answer.reason !== undefined) assert.doesNotMatch(answer.reason, /P10-5/);
  }
});

// --- §5 The other answers ------------------------------------------------------------------------

test('§5 a plan stating no spending has nothing to scale, and says that rather than printing $0', () => {
  const answer = sustainableSpend(SETTINGS(), WORKING_COUPLE, []);
  assert.equal(answer.kind, 'nothingToScale');
  assert.equal(answer.sustainableAnnualSpend, undefined);
  assert.equal(answer.walks, 1, 'the plan as written is walked once before the question is even asked');
});

test('§5 a household that cannot fund itself at a hundredth of its spending is told so', () => {
  const broke = {
    persons: [person({ name: 'Gus', dateOfBirth: '1990-01-01', superInterests: [{ phase: 'accumulation', balance: C(20_000) }] })],
    homeStatus: 'noHome',
  };
  const answer = sustainableSpend(SETTINGS(), broke, [spend(40_000)]);
  assert.equal(answer.kind, 'nothingWorks');
  assert.equal(answer.factor, undefined);
  assert.ok(answer.bindsAt >= '2026-09');
});

test('§5 a plan still funded at the top of the range reports a FLOOR, never an answer', () => {
  const rich = {
    persons: [person({ name: 'Eve', dateOfBirth: '1957-05-05', superInterests: [{ phase: 'accountBasedPension', balance: C(1_900_000), statedStreamSettings: { commencementDay: '2019-07-01' } }] })],
    homeStatus: 'occupied',
    openingOffsetBalance: C(400_000),
  };
  const answer = sustainableSpend(SETTINGS({ asAtDate: '2026-07-01' }), rich, [spend(12_000, { date: '2026-07-01' })]);
  assert.equal(answer.kind, 'higherThanSearched');
  assert.equal(answer.factor, HIGHEST_FACTOR);
  assert.equal(answer.sustainableAnnualSpend, C(48_000));
});

test('§5 a candidate that REFUSES is carried out as a refusal, never as a figure', () => {
  // Constructed with an injected projector, because no parcel-free plan in ~2,500 sampled candidates
  // reached a refusal. It is handled defensively all the same: an engine refusal escaping to the
  // page is a stack trace where a sentence belongs.
  let calls = 0;
  const flaky = (settings, household, entries) => {
    calls += 1;
    if (calls > 2) throw new RangeError('a fixture refusal, quoted verbatim');
    return project(settings, household, entries);
  };
  const answer = sustainableSpend(SETTINGS(), WORKING_COUPLE, [spend(70_000)], flaky);
  assert.equal(answer.kind, 'candidateRefused');
  assert.equal(answer.reason, 'a fixture refusal, quoted verbatim');
  assert.equal(answer.factor, undefined);
});

test('§5 the canary fires when the level read is not the level the walk spent', () => {
  // Also an injected projector: the disagreement it watches for is not reachable from any plan on
  // disk today, which is exactly why it is a canary and not a branch.
  const doctored = (settings, household, entries) => {
    const months = project(settings, household, entries);
    return [
      { ...months[0], lines: months[0].lines.map((line) => (line.description === 'Household spending' ? { ...line, amount: line.amount + 1 } : line)) },
      ...months.slice(1),
    ];
  };
  const answer = sustainableSpend(SETTINGS(), WORKING_COUPLE, [spend(70_000)], doctored);
  assert.equal(answer.kind, 'levelUnreadable');
  assert.equal(answer.factor, undefined);
});

// --- §6 Cost, purity, and the bounds ---------------------------------------------------------------

test('§6 the search is bounded: one walk for the plan, two probes, and the bisections', () => {
  let walks = 0;
  const counted = (settings, household, entries) => {
    walks += 1;
    return project(settings, household, entries);
  };
  const answer = sustainableSpend(SETTINGS(), WORKING_COUPLE, [spend(70_000)], counted);
  assert.equal(answer.walks, walks);
  assert.ok(walks <= 20, `a redraw-free button press must stay near a second: ${walks} walks`);
  assert.ok(walks >= 10, 'far fewer than this would mean the search stopped short of the resolution');
});

test('§6 the same question twice gives the same answer, to the cent', () => {
  const once = sustainableSpend(SETTINGS(), WORKING_COUPLE, [spend(70_000)]);
  const twice = sustainableSpend(SETTINGS(), WORKING_COUPLE, [spend(70_000)]);
  assert.deepEqual(once, twice);
});

test('§6 the search bounds are the ones the answers quote', () => {
  assert.equal(LOWEST_FACTOR, 0.01);
  assert.equal(HIGHEST_FACTOR, 4);
  assert.equal(RESOLUTION_CENTS, 1_200);
});

// --- §7 P16-3: a RAD does not break the search ------------------------------------------------
//
// Found by the mock-up (2026-09-25): an `ENTER_CARE` paying a $750,000 RAD as a lump sum made the
// search refuse a plan outright at `HIGHEST_FACTOR` (4×, genuinely emptying the household before
// the RAD falls due) even though `LOWEST_FACTOR` had already passed, and a real answer sits well
// inside the range. See `sustainableSpend.ts`'s own header for the mechanism.

// **`radPrice`/`radPaidAsLumpSum` are stated in TODAY's money and raised to the entry's own day
// (user ruling, 2026-09-25).** `radAmount` here is the NOMINAL figure this fixture is actually
// about — "an ENTER_CARE paying an $800,000 RAD in 2040" — so it is converted back to the STATED,
// today's-money figure `inflateStated` would raise TO `radAmount`, `priceLevelFactor`'s own inverse,
// against `SETTINGS()`'s own fixed `asAtDate`/`cpi` (no test below overrides either).
const radEntry = (radAmount, date) => {
  const stated = Math.round(radAmount / priceLevelFactor(SETTINGS().economicSeries.cpi, SETTINGS().asAtDate, date));
  return {
    id: 'ec',
    date,
    owner: 'personA',
    type: 'ENTER_CARE',
    enabled: true,
    createdAt: '2026-08-20',
    params: { homeValue: C(0), radPrice: C(stated), radPaidAsLumpSum: C(stated) },
  };
};

test('§7 a plan whose top-of-range candidate cannot fund a RAD is still answered, not refused', () => {
  const entries = [spend(50_000), radEntry(800_000, '2040-01-01')];
  // Sanity check on the fixture: the top of the range really does throw `RadPaymentUnfundedError`
  // and the bottom really does pass — otherwise this test would prove nothing about the fix.
  assert.throws(() => project(SETTINGS(), RETIRED_COUPLE, scaledBy(entries, HIGHEST_FACTOR)), RadPaymentUnfundedError);
  assert.doesNotThrow(() => project(SETTINGS(), RETIRED_COUPLE, scaledBy(entries, LOWEST_FACTOR)));

  const answer = sustainableSpend(SETTINGS(), RETIRED_COUPLE, entries);
  assert.notEqual(answer.kind, 'candidateRefused');
  assert.equal(answer.reason, undefined);
  assert.ok(Number.isFinite(answer.factor) && answer.factor > 0, 'a factor must actually be reported');
  assert.ok(answer.sustainableAnnualSpend > 0);
  // The bisection ran, rather than the search quitting after the two bracket probes (`walks === 3`
  // is exactly what the defect produced: the plan's own walk, `LOWEST_FACTOR`, then the throw).
  assert.ok(answer.walks > 3, `the search must have bisected rather than aborted at the top probe: ${answer.walks} walks`);
});

test('§7 a lower spending factor is never worse at funding a RAD — swept, not merely spot-checked', () => {
  const entries = [spend(50_000), radEntry(800_000, '2040-01-01')];
  const fundsTheRad = (factor) => {
    try {
      project(SETTINGS(), RETIRED_COUPLE, scaledBy(entries, factor));
      return true;
    } catch (error) {
      if (error instanceof RadPaymentUnfundedError) return false;
      throw error; // any OTHER refusal means this fixture is not testing what it claims to.
    }
  };
  const factors = [];
  for (let f = LOWEST_FACTOR; f <= HIGHEST_FACTOR; f += 0.1) factors.push(Math.round(f * 100) / 100);
  const results = factors.map(fundsTheRad);
  assert.ok(results.includes(true) && results.includes(false), 'the sweep must cross the boundary, or it proves nothing');
  // Once a higher factor has failed to fund the RAD, no higher factor after it may fund it —
  // "a lower candidate is never worse at funding the RAD" read the other way around.
  let sawFailure = false;
  for (let i = 0; i < factors.length; i += 1) {
    if (!results[i]) sawFailure = true;
    else assert.ok(!sawFailure, `factor ${factors[i]} funds the RAD after a lower factor already failed to`);
  }
});
