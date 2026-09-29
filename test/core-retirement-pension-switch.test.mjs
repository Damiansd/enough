// The switch at retirement (user ruling, 2026-09-23).
//
// A RETIRE at or past Preservation Age (60) turns each of that Person's accumulation accounts into a
// retirement-phase account-based pension ON THE RETIRE DAY, and brings a TTR's conversion forward to
// that day. The account commences its pension that day for Sch 7 — cl 4's June nil and cl 3's
// pro-rata included — and what the household does not spend of the minimum goes to cash. It does
// not happen before 60, over the published transfer balance cap, for a Person who has had a
// retirement-phase pension before, or for an account kept out with `keepInAccumulationAtRetirement`.
//
// `nominalReturn: 0` and `cpi: 0` wherever a figure is hand-worked, so a balance moves only by what
// the test says moves it. Every minimum below is worked by hand from Sch 7: the percentage for the
// age on the relevant day, times the balance, times cl 3's days (the commencement day counted) over
// the year's days, to the nearest $10 (cl 5).
import test from 'node:test';
import assert from 'node:assert/strict';

import { mulCents, toCents } from '../dist/core/money.js';
import { priceLevelFactor } from '../dist/core/priceLevel.js';
import { SHORTFALL_LINE, TTR_PAYMENT_LINE, project } from '../dist/core/projection.js';
import { parsePlan, PlanFileHouseholdError } from '../dist/core/parsePlan.js';
import { PUBLISHED_TRANSFER_BALANCE_CAP, retirementSwitches } from '../dist/core/retirementPension.js';
import { pensionAtRetirementLines, pensionAtRetirementNotices } from '../dist/app/retirementWarning.js';
import { DEMO_PLAN } from '../dist/app/demoHousehold.js';

const settings = (over = {}) => ({
  asAtDate: '2026-07-01',
  planningHorizonAge: 66,
  economicSeries: { cpi: 0, pblci: 0.025, awote: 0.035, mtawe: 0.035 },
  deemingRates: { lower: 0.0175, upper: 0.0375 },
  nominalReturn: 0,
  ...over,
});
const person = (name, dateOfBirth, superInterests, over = {}) => ({
  name,
  dateOfBirth,
  superInterests,
  parcels: [],
  employmentIncomePerFortnight: toCents(0),
  workBonusBalance: toCents(0),
  ...over,
});
const household = (...persons) => ({ persons, homeStatus: 'occupied' });
const accumulation = (dollars, over = {}) => ({ phase: 'accumulation', balance: toCents(dollars), ...over });
const entry = (id, type, date, params = {}, owner = 'household') => ({ id, type, date, owner, params, enabled: true, createdAt: '2026-06-01' });
const spend = (dollars) => entry('sc', 'SPEND_CHANGE', '2026-07-01', { annualSpend: toCents(dollars) });
const retire = (date, owner = 'household') => entry(`r-${date}`, 'RETIRE', date, {}, owner);

const at = (months, month) => months.find((m) => m.month === month);
const amountOf = (month, description) => month.lines.filter((l) => l.description === description).reduce((t, l) => t + l.amount, 0);
const switchNotes = (months) => months.flatMap((m) => m.notes.filter((n) => n.subject === 'pension at retirement').map((n) => ({ month: m.month, ...n })));
const keptOut = (h) => ({ ...h, persons: h.persons.map((p) => ({ ...p, superInterests: p.superInterests.map((i) => ({ ...i, keepInAccumulationAtRetirement: true })) })) });

/** Pat turns 60 on 2025-03-15 and 65 on 2029-03-15, so a RETIRE in 2027 is at 63. */
const PAT = household(person('Pat', '1964-03-15', [accumulation(500_000)]));

// --- §1 The switch, on the RETIRE day, and the minimum it commences -------------------------------

test('A MAY RETIREMENT: the account switches that day, and cl 3 pro-rates the first minimum — swept to CASH in June', () => {
  const months = project(settings(), PAT, [spend(0), retire('2027-05-10')]);
  // The note, in the RETIRE month.
  assert.deepEqual(switchNotes(months).map((n) => [n.month, n.person, n.outcome, n.retireDay]), [['2027-05', 'Pat', 'switched', '2027-05-10']]);
  // Hand-worked: 4% (under 65) × $500,000 × 52/365 (10 May to 30 June, both counted: 22 + 30) =
  // $2,849.32 → $2,850. Nobody needs it — the spending level is nil — so the June sweep pays all of it.
  assert.equal(22 + 30, 52);
  assert.equal(Math.round((500_000 * 0.04 * 52) / 365 / 10) * 10, 2_850);
  assert.equal(amountOf(at(months, '2027-06'), 'Account-Based Pension payment, Pat'), toCents(2_850));
  // It lands in the Offset, and the account falls by exactly it: the money is not credited back.
  assert.equal(at(months, '2027-06').closingBalance, toCents(2_850));
  assert.equal(at(months, '2027-07').openingBalance, toCents(2_850));
  assert.equal(at(months, '2027-06').superBalance, toCents(497_150));
  // No other month of that year pays: May is still accumulation (the RETIRE is mid-month), and the
  // minimum is a floor swept once, in June.
  assert.equal(months.filter((m) => m.month < '2027-07' && amountOf(m, 'Account-Based Pension payment, Pat') > 0).length, 1);
  // The next year is a full one, on the 1 July balance: 4% × $497,150 = $19,886 → $19,890, swept in 2028-06.
  assert.equal(Math.round((497_150 * 0.04) / 10) * 10, 19_890);
  assert.equal(amountOf(at(months, '2028-06'), 'Account-Based Pension payment, Pat'), toCents(19_890));
});

test('A JUNE RETIREMENT: cl 4 makes the first year nil — and the pension is STILL drawn to need that month', () => {
  // RETIRE on the 1st, so the account is a pension for the whole of June. A $12,000 year is $1,000 a
  // month; with no cash and no salary the pension is the only thing that can pay it.
  const months = project(settings(), PAT, [spend(12_000), retire('2027-06-01')]);
  const june = at(months, '2027-06');
  assert.equal(amountOf(june, 'Account-Based Pension payment, Pat'), toCents(1_000), 'drawn to need, and not a cent of minimum on top: cl 4');
  assert.equal(amountOf(june, SHORTFALL_LINE), 0, 'a switched account with no commencement day would leave this month short');
  // Every month after it draws too, and none is short.
  assert.equal(months.filter((m) => m.month >= '2027-06' && amountOf(m, SHORTFALL_LINE) > 0).length, 0);
  assert.ok(months.filter((m) => m.month >= '2027-06').every((m) => amountOf(m, 'Account-Based Pension payment, Pat') >= toCents(1_000)));
});

test('THE DAY IS THE RETIRE, NOT THE 65TH BIRTHDAY — and a RETIRE before 60 switches nothing, ever', () => {
  const at63 = project(settings(), PAT, [spend(12_000), retire('2027-05-10')]);
  assert.ok(amountOf(at(at63, '2027-06'), 'Account-Based Pension payment, Pat') > 0, 'the pension did not start at the RETIRE');
  assert.equal(at(at63, '2027-06').protectedAssets, 0, 'a pension is assessed at any age; Pat is 63');
  assert.ok(at(at63, '2027-05').protectedAssets > 0, 'the control: until the switch her accumulation account is exempt');

  // Lee is 58 at his RETIRE. Retiring before 60 releases nothing, so nothing switches, the note says
  // why in plain words, and the account is still accumulation (and exempt) after his 60th.
  const LEE = household(person('Lee', '1969-01-20', [accumulation(300_000)]));
  const months = project(settings({ planningHorizonAge: 62 }), LEE, [spend(0), retire('2027-02-01')]);
  assert.deepEqual(switchNotes(months).map((n) => [n.month, n.outcome]), [['2027-02', 'under 60']]);
  assert.match(switchNotes(months)[0].note, /before turning 60/);
  assert.doesNotMatch(switchNotes(months)[0].note, /Sch|SIS|preservation/i, 'plain words');
  assert.equal(months.filter((m) => m.lines.some((l) => l.description === 'Account-Based Pension payment, Lee')).length, 0);
  assert.ok(at(months, '2030-06').protectedAssets > 0, 'after his 60th the account is still exempt accumulation');
});

// --- §2 The accounts it does not reach --------------------------------------------------------------

test('AN ACCOUNT KEPT IN ACCUMULATION does not switch, and its plan walks exactly as one with no RETIRE-day rule', () => {
  const kept = project(settings(), keptOut(PAT), [spend(12_000), retire('2027-05-10')]);
  assert.deepEqual(switchNotes(kept), [], 'no note: there was nothing to switch');
  assert.equal(kept.filter((m) => m.lines.some((l) => l.description === 'Account-Based Pension payment, Pat')).length, 0);
  assert.ok(kept.some((m) => amountOf(m, 'Superannuation lump sum, Pat') > 0), 'the control: kept out, it is limb 5 that draws it');
  assert.ok(at(kept, '2028-06').protectedAssets > 0, 'still exempt accumulation at 64');
  // Kept out is the walk with the RETIRE's switch removed — the same as a RETIRE the rule cannot reach.
  // The strongest form of this is in `core-projection-pension-drawdown.test.mjs`: the committed demo,
  // kept out, lands on the digest captured before the switch existed.
});

test('OVER THE PUBLISHED CAP the account stays in accumulation, named; AT the cap it switches', () => {
  assert.equal(PUBLISHED_TRANSFER_BALANCE_CAP, toCents(2_100_000));
  const walk = (dollars) => project(settings(), household(person('Pat', '1964-03-15', [accumulation(dollars)])), [spend(0), retire('2027-05-10')]);
  const over = walk(2_100_000.01);
  assert.deepEqual(switchNotes(over).map((n) => n.outcome), ['over the cap']);
  assert.match(switchNotes(over)[0].note, /\$2,100,000\.01/);
  assert.match(switchNotes(over)[0].note, /over the \$2,100,000\.00 transfer balance cap/);
  assert.match(switchNotes(over)[0].note, /splitting an account between a pension and accumulation is not modelled/);
  assert.equal(over.filter((m) => m.lines.some((l) => l.description === 'Account-Based Pension payment, Pat')).length, 0);
  const atCap = walk(2_100_000);
  assert.deepEqual(switchNotes(atCap).map((n) => n.outcome), ['switched']);
  assert.ok(amountOf(at(atCap, '2027-06'), 'Account-Based Pension payment, Pat') > 0);
});

test('A RETIREMENT-PHASE PENSION BEFORE THIS ONE — stated, or held — stops the switch: the cap left is unknowable', () => {
  const stated = household(person('Pat', '1964-03-15', [accumulation(500_000)], { statedPriorRetirementPhase: 'startedRetirementPhaseBeforeTheForecast' }));
  const months = project(settings(), stated, [spend(0), retire('2027-05-10')]);
  assert.deepEqual(switchNotes(months).map((n) => n.outcome), ['prior pension']);
  assert.match(switchNotes(months)[0].note, /already had a super pension before this plan/);
  assert.equal(months.filter((m) => m.lines.some((l) => l.description === 'Account-Based Pension payment, Pat')).length, 0);
  // The stated No is the switch, exactly as absence is.
  const no = household(person('Pat', '1964-03-15', [accumulation(500_000)], { statedPriorRetirementPhase: 'neverARetirementPhaseRecipientBeforeTheForecast' }));
  assert.deepEqual(switchNotes(project(settings(), no, [spend(0), retire('2027-05-10')])).map((n) => n.outcome), ['switched']);
  // Holding an account-based pension already is the same fact, whatever the box says.
  const holds = household(person('Pat', '1964-03-15', [accumulation(500_000), { phase: 'accountBasedPension', balance: toCents(100_000), statedStreamSettings: { commencementDay: '2024-07-01' } }]));
  assert.deepEqual(switchNotes(project(settings(), holds, [spend(0), retire('2027-05-10')])).map((n) => n.outcome), ['prior pension']);
});

// --- §3 A TTR converts at the RETIRE when that is its earliest day --------------------------------

test('A TTR CONVERTS AT THE RETIRE, before its 65th — and kept out, it waits for the 65th', () => {
  const ttr = (over = {}) => household(person('Pat', '1964-03-15', [
    accumulation(0),
    { phase: 'ttr', balance: toCents(300_000), statedStreamSettings: { commencementDay: '2026-07-01' }, ...over },
  ]));
  const months = project(settings(), ttr(), [spend(0), retire('2027-05-10')]);
  assert.ok(amountOf(at(months, '2027-04'), `${TTR_PAYMENT_LINE}, Pat`) > 0, 'the control: a TTR pays before the RETIRE');
  assert.equal(months.filter((m) => m.month >= '2027-06' && amountOf(m, `${TTR_PAYMENT_LINE}, Pat`) > 0).length, 0, 'it is still a TTR after the RETIRE');
  assert.ok(amountOf(at(months, '2028-06'), 'Account-Based Pension payment, Pat') > 0);
  // Kept out, the RETIRE does not reach it and it converts on the 65th birthday, 2029-03-15.
  const kept = project(settings(), ttr({ keepInAccumulationAtRetirement: true }), [spend(0), retire('2027-05-10')]);
  assert.ok(amountOf(at(kept, '2028-06'), `${TTR_PAYMENT_LINE}, Pat`) > 0, 'kept out, the TTR converted at the RETIRE anyway');
});

// --- §4 What follows the phase: labels, the means test, and contributions -----------------------

test('THE LABELS FOLLOW THE PHASE ON THE DAY — growth and fees say "Account-Based Pension" from the switch', () => {
  const FEES = household(person('Pat', '1964-03-15', [accumulation(500_000, { statedAdministrationFeePerYear: toCents(120) })]));
  const months = project(settings({ nominalReturn: 0.06 }), FEES, [spend(0), retire('2027-05-10')]);
  const labels = (month) => at(months, month).lines.map((l) => l.description).filter((d) => d.startsWith('Investment growth') || d.startsWith('Superannuation administration fee'));
  assert.deepEqual(labels('2027-05'), ['Superannuation administration fee, Pat — Superannuation, Accumulation Phase', 'Investment growth, Pat — Superannuation, Accumulation Phase']);
  assert.deepEqual(labels('2027-06'), ['Superannuation administration fee, Pat — Account-Based Pension', 'Investment growth, Pat — Account-Based Pension']);
});

test('THE FEE SET SWITCHES WITH THE ACCOUNT — accumulation before, PENSION after, each on its OWN series (P3-17 slice 4)', () => {
  // Distinct fees either side, exactly as Aware's own schedule states them (p.15 of the SoA
  // extract): $100/yr in accumulation and $200/yr once the money is a pension. `cpi` and `awote` are
  // stated apart so the switch is visible in the LENS as well as in the figure.
  const SPLIT = household(person('Pat', '1964-03-15', [{
    phase: 'accumulation',
    balance: toCents(500_000),
    statedAdministrationFeePerYear: toCents(100),
    statedPensionAdministrationFeePerYear: toCents(200),
  }]));
  const s = settings({ economicSeries: { cpi: 0.025, pblci: 0.025, awote: 0.035, mtawe: 0.035 } });
  const months = project(s, SPLIT, [spend(0), retire('2027-05-10')]);
  const accLine = 'Superannuation administration fee, Pat — Superannuation, Accumulation Phase';
  const penLine = 'Superannuation administration fee, Pat — Account-Based Pension';

  for (const month of months) {
    const wageRaised = Math.ceil(mulCents(toCents(100), priceLevelFactor(0.035, s.asAtDate, month.month)) / 12);
    const cpiRaised = Math.ceil(mulCents(toCents(200), priceLevelFactor(0.025, s.asAtDate, month.month)) / 12);
    if (month.month < '2027-06') {
      assert.equal(amountOf(month, accLine), wageRaised, `${month.month}: still accumulation, raised by WAGES`);
      assert.equal(amountOf(month, penLine), 0, `${month.month}: no pension fee before the switch`);
    } else {
      assert.equal(amountOf(month, accLine), 0, `${month.month}: no accumulation fee after the switch`);
      assert.equal(amountOf(month, penLine), cpiRaised, `${month.month}: now a pension, raised by CPI`);
    }
  }
  assert.ok(months.some((m) => m.month < '2027-06'), 'the walk must actually cover a month before the switch');
  assert.ok(months.some((m) => m.month >= '2027-06'), 'the walk must actually cover a month after the switch');
});

test('THE PENSION FEE SET FALLS BACK TO THE ACCUMULATION ONE WHEN ABSENT, and is BYTE-IDENTICAL either way', () => {
  // No `statedPensionAdministrationFeePerYear` at all — `household.ts`'s own ruling that absence
  // falls back to `statedAdministrationFeePerYear` rather than to nil, so a converted account is not
  // charged nothing the month it becomes a pension. Restating the SAME figure explicitly under the
  // pension key must produce the byte-identical walk, proving the fallback IS that figure and not a
  // second, coincidentally equal code path.
  const account = (extra = {}) => household(person('Pat', '1964-03-15', [{ phase: 'accumulation', balance: toCents(500_000), statedAdministrationFeePerYear: toCents(100), ...extra }]));
  const s = settings({ economicSeries: { cpi: 0.025, pblci: 0.025, awote: 0.035, mtawe: 0.035 } });
  const entries = [spend(0), retire('2027-05-10')];
  const fallback = project(s, account(), entries);
  const restated = project(s, account({ statedPensionAdministrationFeePerYear: toCents(100) }), entries);
  assert.equal(JSON.stringify(restated), JSON.stringify(fallback));
  // Not vacuous: a DIFFERENT pension figure does move the walk once the switch happens.
  const different = project(s, account({ statedPensionAdministrationFeePerYear: toCents(500) }), entries);
  assert.notEqual(JSON.stringify(different), JSON.stringify(fallback));
  assert.equal(
    JSON.stringify(different.filter((m) => m.month < '2027-06')),
    JSON.stringify(fallback.filter((m) => m.month < '2027-06')),
    'the two must agree before the switch — only the PENSION set differs, and it is not read yet',
  );
});

test('A TTR USES THE ACCUMULATION FEE SET, NEVER THE PENSION ONE, until it itself converts (P3-17 slice 4)', () => {
  // A TTR is not a retirement-phase account for any purpose this build prices (T27, the transfer
  // balance account, Div 293's release authority — `household.ts`'s doc on
  // `statedPensionAdministrationFeePerYear` has the citation), so its fee follows the same rule: the
  // PENSION set is read only once `effectivePhaseFor` itself resolves to `accountBasedPension`, which
  // for a TTR is the day IT converts (R10, the 65th birthday absent a stated day), not the day it
  // commenced and not a RETIRE entry, which only brings that conversion FORWARD.
  const TTR = household(person('Pat', '1964-03-15', [{
    phase: 'ttr',
    balance: toCents(500_000),
    statedStreamSettings: { commencementDay: '2024-07-01' },
    statedAdministrationFeePerYear: toCents(100),
    statedPensionAdministrationFeePerYear: toCents(200),
  }]));
  const s = settings({ economicSeries: { cpi: 0.025, pblci: 0.025, awote: 0.035, mtawe: 0.035 } });
  const months = project(s, TTR, [spend(0)]);
  const accLine = 'Superannuation administration fee, Pat — Superannuation, TTR';
  const penLine = 'Superannuation administration fee, Pat — Account-Based Pension';
  // Pat is 63 on `asAtDate` (born 1964-03-15) and turns 65 on 2029-03-15: every month before that is
  // still a TTR, charged the ACCUMULATION set, raised by WAGES.
  const beforeConversion = months.filter((m) => m.month < '2029-03');
  assert.ok(beforeConversion.length > 12, 'the walk must cover more than a year of TTR before the 65th birthday');
  for (const month of beforeConversion) {
    const wageRaised = Math.ceil(mulCents(toCents(100), priceLevelFactor(0.035, s.asAtDate, month.month)) / 12);
    assert.equal(amountOf(month, accLine), wageRaised, `${month.month}: a TTR is charged the ACCUMULATION set`);
    assert.equal(amountOf(month, penLine), 0, `${month.month}: a TTR is never charged the pension set`);
  }
});

test('A CONTRIBUTION INTO A SWITCHED ACCOUNT is refused in plain words, not paid into a pension', () => {
  const COUPLE = household(
    person('Pat', '1964-03-15', [accumulation(200_000)]),
    person('Sam', '1966-01-01', [accumulation(100_000)], { employmentIncomePerFortnight: toCents(2_000) }),
  );
  const gift = entry('gift', 'SPOUSE_CONTRIBUTION', '2027-09-01', { amount: toCents(1_000), receivingInterestIndex: 0 }, 'personB');
  const offset = { ...COUPLE, openingOffsetBalance: toCents(20_000) };
  assert.throws(() => project(settings(), offset, [spend(0), retire('2027-05-10', 'personA'), gift]), /became an account-based pension at retirement on 2027-05-10/);
  // Kept out, the same gift is paid.
  assert.doesNotThrow(() => project(settings(), keptOut(offset), [spend(0), retire('2027-05-10', 'personA'), gift]));
});

// --- §5 The door, the decision and the notice -----------------------------------------------------

test('THE DOOR: the opt-out is a boolean, on an accumulation or TTR account only, and absent is the switch', () => {
  const file = (interest) => ({
    ...JSON.parse(JSON.stringify(DEMO_PLAN)),
    household: { ...DEMO_PLAN.household, persons: [{ ...DEMO_PLAN.household.persons[0], superInterests: [interest] }, DEMO_PLAN.household.persons[1]] },
  });
  const parsed = parsePlan(file({ phase: 'accumulation', balance: 100, keepInAccumulationAtRetirement: true }));
  assert.equal(parsed.household.persons[0].superInterests[0].keepInAccumulationAtRetirement, true);
  assert.equal('keepInAccumulationAtRetirement' in parsePlan(file({ phase: 'accumulation', balance: 100 })).household.persons[0].superInterests[0], false);
  assert.throws(() => parsePlan(file({ phase: 'accumulation', balance: 100, keepInAccumulationAtRetirement: 'yes' })), PlanFileHouseholdError);
  assert.throws(
    () => parsePlan(file({ phase: 'accountBasedPension', balance: 100, statedStreamSettings: { commencementDay: '2022-08-01' }, keepInAccumulationAtRetirement: true })),
    /already a pension and has nothing to switch/,
  );
});

test('THE NOTICE: the ruled sentence, for exactly the Persons the walk switches', () => {
  const plan = DEMO_PLAN;
  assert.deepEqual(pensionAtRetirementNotices(plan.household, plan.entries, plan.settings.asAtDate), [
    "At retirement on 2031-05-14, Dana's super becomes an account-based pension, so its earnings are no longer taxed. Each year's minimum is paid; what you don't spend goes to cash. It doesn't apply before 60, over the transfer balance cap, or to an account you keep in accumulation. The pension counts in the Age Pension assets test, so a partner under 67 can lose Age Pension.",
  ]);
  // P17-6: on the page it is one short line that keeps the downside, and the sentence above is its ⓘ detail.
  assert.deepEqual(pensionAtRetirementLines(plan.household, plan.entries, plan.settings.asAtDate), [{
    summary: 'On 2031-05-14 Dana’s super becomes a pension — tax-free earnings, but counted in the Age Pension assets test',
    detail: pensionAtRetirementNotices(plan.household, plan.entries, plan.settings.asAtDate)[0],
  }]);
  assert.deepEqual(pensionAtRetirementLines(keptOut(plan.household), plan.entries, plan.settings.asAtDate), []);
  // One expression with the walk: the notice reads `retirementSwitches`, and so does `project()`.
  assert.deepEqual(retirementSwitches(plan.household, plan.entries, plan.settings.asAtDate).map((s) => s.kind), ['switches', 'notRetiring']);
  // Kept out, before 60, or with a RETIRE switched off, nothing is said.
  assert.deepEqual(pensionAtRetirementNotices(keptOut(plan.household), plan.entries, plan.settings.asAtDate), []);
  assert.deepEqual(pensionAtRetirementNotices(plan.household, plan.entries.map((e) => (e.type === 'RETIRE' ? { ...e, date: '2027-01-01' } : e)), plan.settings.asAtDate), []);
  assert.deepEqual(pensionAtRetirementNotices(plan.household, plan.entries.map((e) => (e.type === 'RETIRE' ? { ...e, enabled: false } : e)), plan.settings.asAtDate), []);
});
